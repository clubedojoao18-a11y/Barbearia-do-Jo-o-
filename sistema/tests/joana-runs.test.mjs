import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker,{sealCredentials} from '../worker/index.js';
import {sessionFromStream,cloudOutput} from '../worker/joana-runs.js';
import {JOANA_RUNS_UI} from '../worker/joana-runs-ui.js';
let db,env,calls,turn='completed',files=[];const real=globalThis.fetch;
function adapter(db){return {prepare(q){let a=[];return {bind(...p){a=p;return this},async first(){return db.prepare(q).get(...a)||null},async all(){return {results:db.prepare(q).all(...a)}},async run(){return db.prepare(q).run(...a)},_run(){return db.prepare(q).run(...a)}}},async batch(s){return s.map(x=>x._run())}}}
function stream(id='sess_local'){return new Response('event: agent.session.in_progress\ndata: '+JSON.stringify({type:'agent.session.in_progress',session:{id}})+'\n\n',{headers:{'Content-Type':'text/event-stream'}})}
beforeEach(()=>{db=new DatabaseSync(':memory:');for(const n of ['0000_clube','0001_permissions','0002_whatsapp','0003_operations'])db.exec(readFileSync(new URL('../drizzle/'+n+'.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));const bucket=new Map();env={DB:adapter(db),CONNECTION_MASTER_KEY:btoa('r'.repeat(32)),OPENAI_API_KEY:'local-only-key',BUCKET:{async put(k,v){bucket.set(k,v)},async get(k){return bucket.has(k)?{body:bucket.get(k)}:null}}};calls=[];turn='completed';files=[];globalThis.fetch=async(url,opts={})=>{const path=String(url).replace('https://api.openai.com/v1/agents/sessions','');calls.push({path,...opts,body:opts.body?JSON.parse(opts.body):undefined});if(opts.method==='DELETE')return Response.json({id:'sess_local',deleted:true});if(opts.method==='POST'&&!path)return stream();if(path.includes('/turns'))return Response.json({data:[{id:'turn_local',status:turn,created_at:1,subagent_id:null}]});if(path.includes('/items'))return Response.json({data:[{type:'message',role:'assistant',content:[{type:'output_text',text:'Arquivo criado e executado: 2 + 2 = 4.'}]}]});if(path.includes('/artifacts/')&&path.endsWith('/content'))return new Response('print(2+2)');if(path.includes('/artifacts'))return Response.json({data:files,has_more:false});if(path==='/sess_local')return Response.json({id:'sess_local',status:turn==='completed'?'idle':'in_progress',environment:{status:'connected'},required_actions:[],usage:{total_tokens:50}});if(path.endsWith('/events'))return new Response(null,{status:202});throw Error('Unexpected '+path)}});
afterEach(()=>{globalThis.fetch=real;db.close()});
async function req(path,body,who='owner'){const headers={'oai-authenticated-user-id':who,'oai-authenticated-user-email':who==='owner'?'clubedojoao18@gmail.com':who+'@example.com'};if(body!==undefined){headers.Origin='https://test.example';headers['Content-Type']='application/json'}const r=await worker.fetch(new Request('https://test.example/api/joana/runs'+path,{headers,method:body===undefined?'GET':'POST',body:body===undefined?undefined:JSON.stringify(body)}),env);return {status:r.status,data:await r.json()}}
const start=()=>req('/start',{text:'Crie e teste um script de soma.',mode:'code',requestId:'run-local-000000001'});
test('cloud start uses hosted execution, keeps keys outside sandbox, and prevents duplicate or concurrent tasks',async()=>{
 assert.equal((await req('',undefined,'client')).status,403);assert.equal((await req('/start',{text:'x',mode:'code',requestId:'run-local-000000001'},'client')).status,403);
 const r=await start();assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.job.status,'running');assert.equal(r.data.job.sessionId,undefined);
 const request=calls[0];assert.equal(request.body.environment.type,'openai_hosted');assert.equal(request.body.environment.env,undefined);assert.equal(request.body.agent.multi_agent.enabled,false);assert.equal(request.body.stream,true);assert.equal(request.body.review,'auto_review');assert.ok(!JSON.stringify(request.body).includes('local-only-key'));
 assert.equal((await start()).data.replayed,true);assert.equal(calls.length,1);
 assert.equal((await req('/start',{text:'Nova tarefa',mode:'code',requestId:'run-local-000000002'})).status,409);
 assert.ok(!db.prepare("SELECT value FROM config WHERE key='joana:runs:owner'").get().value.includes('Crie e teste'));
});
test('turn completion is distinct from idle; artifacts are preserved before provider session cleanup',async()=>{
 const r=await start(),id=r.data.job.id;turn='in_progress';let sync=await req('/sync',{id});assert.notEqual(sync.data.job.status,'completed');
 assert.equal((await req('/close',{id})).status,409);
 turn='completed';files=[{id:'artifact_one',path:'/workspace/outputs/soma.py',size_bytes:10}];
 sync=await req('/sync',{id});assert.equal(sync.data.job.status,'completed');assert.equal(sync.data.job.artifacts[0].saved,true);assert.match(sync.data.job.output,/2 \+ 2/);
 assert.equal((await req('/close',{id})).data.job.closed,true);assert.equal(calls.filter(c=>c.method==='DELETE').length,1);
 assert.equal((await req('/archive',{id})).status,200);assert.equal((await req('')).data.jobs.length,0);
});
test('uncertain creation is never automatically retried and can reconcile by private job metadata',async()=>{
 globalThis.fetch=async()=>{calls.push({});throw Error('network failed')};assert.equal((await start()).status,502);const job=(await req('')).data.jobs[0];assert.equal(job.status,'creation_uncertain');assert.equal((await start()).data.replayed,true);assert.equal(calls.length,1);
 globalThis.fetch=async(url)=>{if(String(url).endsWith('?limit=100'))return Response.json({data:[{id:'sess_local',metadata:{joana_job:job.id}}]});if(String(url).includes('/turns'))return Response.json({data:[{status:'completed',created_at:1}]});if(String(url).includes('/items'))return Response.json({data:[]});if(String(url).includes('/artifacts'))return Response.json({data:[]});return Response.json({id:'sess_local',status:'idle'})};assert.equal((await req('/sync',{id:job.id})).data.job.status,'completed');
});
test('quota and explicit provider rejection do not leave a phantom running session',async()=>{
 env.AI_API_DISABLED='true';assert.equal((await start()).status,403);assert.equal((await req('')).data.jobs[0].status,'creation_failed');assert.equal(calls.length,0);
 env.AI_API_DISABLED='false';globalThis.fetch=async()=>Response.json({error:{code:'permission_denied'}},{status:403});assert.equal((await req('/start',{text:'Outro pedido',mode:'code',requestId:'run-local-000000003'})).status,502);assert.equal((await req('')).data.jobs[1].status,'creation_failed');
});
test('missing or oversized artifacts prevent cleanup, and arbitrary session IDs are refused',async()=>{
 const r=await start(),id=r.data.job.id;files=[{id:'artifact_big',path:'/workspace/outputs/big.zip',size_bytes:6*1024*1024}];assert.equal((await req('/sync',{id})).data.job.artifacts[0].saved,false);assert.equal((await req('/close',{id})).status,409);assert.equal(calls.filter(c=>c.method==='DELETE').length,0);
 assert.equal((await req('/sync',{id:'sess_someone_else'})).status,404);
});
test('SSE handles fragmented events and output extraction ignores user text and tool instructions',async()=>{
 const bytes=new TextEncoder().encode('data: {"session_id":"sess_test"}\n\n'),body=new ReadableStream({start(c){c.enqueue(bytes.slice(0,10));c.enqueue(bytes.slice(10));c.close()}});assert.equal(await sessionFromStream(new Response(body,{headers:{'Content-Type':'text/event-stream'}})),'sess_test');
 assert.equal(cloudOutput([{type:'message',role:'user',content:[{type:'output_text',text:'not output'}]},{type:'message',role:'assistant',content:[{type:'output_text',text:'yes'}]}]),'yes');new Function(JOANA_RUNS_UI);
});

test('Work shares explicit personal context and enables browser and code within one hosted session',async()=>{const sealed=await sealCredentials({messages:[],memories:[{text:'Prefiro respostas curtas'}],tasks:[],attempts:[]},env);db.prepare('INSERT INTO config(key,value) VALUES(?,?)').run('joana:owner',JSON.stringify({revision:1,lockUntil:0,sealed}));const r=await req('/start',{text:'Crie e teste uma página.',mode:'work',requestId:'work-request-000000001'});assert.equal(r.status,200);assert.equal(calls[0].body.environment.desktop.enabled,true);assert.equal(calls[0].body.agent.tools[0].type,'computer_use');assert.ok(calls[0].body.agent.instructions.includes('Prefiro respostas curtas'));assert.ok(!JSON.stringify(calls[0].body).includes('local-only-key'));});
