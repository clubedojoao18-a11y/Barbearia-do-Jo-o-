import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../worker/index.js';
import {JOANA_UI} from '../worker/joana-ui.js';
let db,env,calls;const realFetch=globalThis.fetch;
function adapter(db){return {prepare(q){let args=[];return {bind(...v){args=v;return this},async first(){return db.prepare(q).get(...args)||null},async all(){return {results:db.prepare(q).all(...args)}},async run(){return db.prepare(q).run(...args)},_run(){return db.prepare(q).run(...args)}}},async batch(s){db.exec('BEGIN');try{const out=s.map(x=>x._run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}}}
beforeEach(()=>{db=new DatabaseSync(':memory:');for(const name of ['0000_clube','0001_permissions','0002_whatsapp','0003_operations'])db.exec(readFileSync(new URL('../drizzle/'+name+'.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));env={DB:adapter(db),CONNECTION_MASTER_KEY:btoa('j'.repeat(32)),OPENAI_API_KEY:'local-test-only'};calls=[];globalThis.fetch=async(url,opts)=>{calls.push({url,body:JSON.parse(opts.body)});return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({reply:'Chefe, vamos organizar o dia pela agenda.',page:'agenda'})}]}]})}});
afterEach(()=>{globalThis.fetch=realFetch;db.close()});
async function req(path,body,who='owner',profile){const headers={};if(who){headers['oai-authenticated-user-id']=who;headers['oai-authenticated-user-email']=who==='owner'?'clubedojoao18@gmail.com':who+'@example.com'}if(profile)headers['X-Joao-Profile']=profile;if(body!==undefined){headers.Origin='https://test.example';headers['Content-Type']='application/json'}const r=await worker.fetch(new Request('https://test.example/api/'+path,{headers,method:body===undefined?'GET':'POST',body:body===undefined?undefined:JSON.stringify(body)}),env);return {status:r.status,data:await r.json()}}
const chat=(requestId='local-request-00001',text='Organize meu dia')=>req('joana/chat',{text,requestId});
test('JOANA denies anonymous users, clients, other managers and switched professional views',async()=>{
 assert.equal((await req('joana',undefined,null)).status,401);
 assert.equal((await req('joana',undefined,'client')).status,403);
 await req('me',undefined,'manager');db.prepare("UPDATE users SET role='manager' WHERE id='manager'").run();
 assert.equal((await req('joana',undefined,'manager')).status,403);
 assert.equal((await req('joana',undefined,'owner','self')).status,403);
 assert.equal(calls.length,0);
});
test('private memories and tasks persist encrypted and are never exposed to the general configuration',async()=>{
 assert.equal((await req('joana/memory',{action:'add',text:'Prefiro respostas curtas e café às oito.'})).status,200);
 assert.equal((await req('joana/task',{action:'add',text:'Revisar estoque',date:'2026-12-01'})).status,200);
 const raw=db.prepare("SELECT value FROM config WHERE key='joana:owner'").get().value;
 assert.ok(!raw.includes('café'));assert.ok(!raw.includes('Revisar estoque'));
 let state=(await req('joana')).data;assert.equal(state.memories.length,1);assert.equal(state.tasks.length,1);assert.equal(calls.length,0);
 await req('joana/task',{action:'toggle',id:state.tasks[0].id});assert.equal((await req('joana')).data.tasks[0].done,true);
 await req('joana/clear',{confirm:true});assert.equal((await req('joana')).data.memories.length,1);
 await req('joana/memory',{action:'remove',id:state.memories[0].id});assert.equal((await req('joana')).data.memories.length,0);
 assert.equal((await req('joana/task',{action:'add',text:'Teste',date:'2026-02-30'})).status,400);
 const config=await req('manage');assert.equal(config.status,200);assert.ok(!JSON.stringify(config.data).includes('joana:owner'));assert.ok(!JSON.stringify(config.data).includes('sealed')); 
});
test('chat uses existing Responses connection, bounded history, real aggregates, no client identifiers, and idempotent replay',async()=>{
 await req('me',undefined,'client');db.prepare("UPDATE users SET name='PRIVATE CLIENT NAME',phone='21988887777' WHERE id='client'").run();
 await req('joana/memory',{action:'add',text:'Minha prioridade é organizar a agenda.'});
 const r=await chat();assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.message.page,'agenda');
 assert.equal(calls.length,1);const {body}=calls[0];assert.equal(calls[0].url,'https://api.openai.com/v1/responses');assert.equal(body.store,false);assert.ok(!body.tools);assert.equal(body.max_output_tokens,1000);
 const input=JSON.parse(body.input);assert.equal(input.summary.clients,1);assert.equal(input.memories[0].text,'Minha prioridade é organizar a agenda.');assert.ok(!body.input.includes('PRIVATE CLIENT'));assert.ok(!body.input.includes('21988887777'));
 assert.equal((await chat()).data.replayed,true);assert.equal(calls.length,1);
 assert.equal((await chat('local-request-00001','Outro texto')).status,409);assert.equal(calls.length,1);
 const state=(await req('joana')).data;assert.equal(state.messages.length,2);assert.equal(state.attempts,undefined);
 assert.ok(!db.prepare("SELECT value FROM config WHERE key='joana:owner'").get().value.includes('Organize meu dia'));
});
test('concurrent requests cannot double-spend or overwrite memories while generation is in flight',async()=>{
 let release,entered;const wait=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 globalThis.fetch=async(url,opts)=>{calls.push({url});entered();await wait;return Response.json({output:[{content:[{type:'output_text',text:'{"reply":"Vamos começar.","page":null}'}]}]})};
 const first=chat();await started;
 assert.equal((await chat('local-request-00002')).status,409);
 assert.equal((await req('joana/memory',{action:'add',text:'Não perder esta memória'})).status,409);
 assert.equal((await req('joana/clear',{confirm:true})).status,409);
 release();assert.equal((await first).status,200);assert.equal(calls.length,1);
});
test('provider failure leaves no invented reply, releases lock and prevents automatic replay',async()=>{
 globalThis.fetch=async()=>{calls.push({});return Response.json({error:{code:'insufficient_quota'}},{status:429})};
 assert.equal((await chat()).status,502);let state=(await req('joana')).data;assert.equal(state.messages.length,0);assert.equal(state.busy,false);
 assert.equal((await chat()).status,409);assert.equal(calls.length,1);
 assert.equal((await req('joana/memory',{action:'add',text:'Continuar amanhã'})).status,200);
});
test('invalid model navigation and oversized input are rejected; API pause does not erase private organization',async()=>{
 assert.equal((await chat('local-request-00001','x'.repeat(1201))).status,400);
 globalThis.fetch=async()=>Response.json({output:[{content:[{type:'output_text',text:'{"reply":"Feito","page":"https://evil.example"}'}]}]});assert.equal((await chat()).status,502);
 env.AI_API_DISABLED='true';assert.equal((await req('joana')).data.ai.configured,false);assert.equal((await chat('local-request-00002')).status,403);
 assert.equal((await req('joana/task',{action:'add',text:'Organização sem IA'})).status,200);
 new Function(JOANA_UI);
});

test('company owners keep independent private state and cannot inherit the original business API key',async()=>{
 await req('joana/memory',{action:'add',text:'Segredo do proprietário original'});
 const created=await req('saas/create',{name:'Barbearia Alice',slug:'alice-barber',plan:'sistema',confirm:true},'alice');assert.equal(created.status,201,JSON.stringify(created.data));
 const isolated=await req('../b/alice-barber/api/joana',undefined,'alice');assert.equal(isolated.status,200,JSON.stringify(isolated.data));assert.equal(isolated.data.memories.length,0);assert.equal(isolated.data.ai.configured,false);
 assert.equal((await req('../b/alice-barber/api/joana/memory',{action:'add',text:'Memória exclusiva Alice'},'alice')).status,200);
 assert.equal((await req('joana')).data.memories[0].text,'Segredo do proprietário original');
 assert.equal((await req('../b/alice-barber/api/joana',undefined,'owner')).status,403);
});
test('daily quota prevents extra provider calls while keeping the conversation available',async()=>{
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 db.prepare('INSERT INTO config(key,value) VALUES(?,?)').run('studio_usage_'+day,'12');
 assert.equal((await chat()).status,429);assert.equal(calls.length,0);assert.equal((await req('joana')).data.busy,false);
});
test('explicit personal commands save and complete tasks without calling the model, including while API is paused',async()=>{
 env.AI_API_DISABLED='true';
 assert.equal((await chat('local-command-00001','Lembre que prefiro começar pela agenda.')).status,200);
 assert.equal((await chat('local-command-00002','Adicione tarefa: Revisar estoque em 2026-12-01')).status,200);
 assert.equal((await chat('local-command-00002','Adicione tarefa: Revisar estoque em 2026-12-01')).data.replayed,true);
 const list=await chat('local-command-00003','Minhas tarefas');assert.equal(list.status,200);assert.match(list.data.message.text,/1\. Revisar estoque/);
 assert.equal((await chat('local-command-00004','Conclua tarefa 1')).status,200);
 const state=(await req('joana')).data;assert.equal(state.memories.length,1);assert.equal(state.tasks.length,1);assert.equal(state.tasks[0].done,true);assert.equal(state.tasks[0].date,'2026-12-01');assert.equal(calls.length,0);
 assert.equal((await chat('local-command-00005','Conclua tarefa 9')).status,400);assert.equal((await req('joana')).data.busy,false);
 assert.equal((await chat('local-command-00006','Adicione tarefa: Errada em 2026-02-30')).status,400);
});
test('cloud access probe is owner-only, read-only, does not expose session data or credentials',async()=>{
 assert.equal((await req('joana/cloud/verify',{},'client')).status,403);
 globalThis.fetch=async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/agents/sessions?limit=1');assert.equal(opts.method,undefined);assert.equal(opts.headers['OpenAI-Beta'],'agents=v1');return Response.json({data:[{id:'session-private',input:'DO NOT EXPOSE'}]})};
 const result=await req('joana/cloud/verify',{});assert.equal(result.status,200);assert.equal(result.data.available,true);assert.ok(!JSON.stringify(result.data).includes('session-private'));assert.ok(!JSON.stringify(result.data).includes('local-test-only'));
 assert.equal((await req('joana')).data.cloud.available,true);
 const config=await req('manage');assert.ok(!JSON.stringify(config.data.config).includes('joana:cloud'));
});
test('cloud access failure is explicit and does not create resources or break the chat',async()=>{
 globalThis.fetch=async()=>Response.json({error:{message:'private provider details'}},{status:403});
 const denied=await req('joana/cloud/verify',{});assert.equal(denied.status,200);assert.equal(denied.data.available,false);assert.equal(denied.data.status,403);assert.ok(!JSON.stringify(denied.data).includes('private provider'));
 assert.equal((await chat('local-command-00007','Minhas memórias')).status,200);
 env.AI_API_DISABLED='true';let requested=false;globalThis.fetch=async()=>{requested=true;return Response.json({data:[]})};assert.equal((await req('joana/cloud/verify',{})).data.available,false);assert.equal(requested,false);
});
