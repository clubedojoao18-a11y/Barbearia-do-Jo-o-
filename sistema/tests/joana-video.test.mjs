import test,{beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {TENANT_SCHEMA} from '../worker/tenant-schema.js';
import worker,{sealCredentials,openCredentials} from '../worker/index.js';
let db,env,calls;const real=globalThis.fetch;
function adapter(db){return {prepare(s){let p=[];return {bind(...v){p=v;return this},async first(){return db.prepare(s).get(...p)||null},async all(){return {results:db.prepare(s).all(...p)}},async run(){return db.prepare(s).run(...p)}}}}}
beforeEach(()=>{db=new DatabaseSync(':memory:');db.exec(TENANT_SCHEMA.replaceAll('--> statement-breakpoint',''));const files=new Map();env={DB:adapter(db),CONNECTION_MASTER_KEY:btoa('x'.repeat(32)),BUCKET:{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{body:files.get(k)}:null}},RUNWAYML_API_SECRET:'provider-local-secret'};calls=[];globalThis.fetch=async(url,opts)=>{calls.push({url:String(url),body:opts?.body?JSON.parse(opts.body):null});return Response.json({id:'12345678-1234-4123-8123-123456789012'})}});
afterEach(()=>{db.close();globalThis.fetch=real});
async function req(path,body,who='owner',extra={}){const headers={'oai-authenticated-user-id':who,'oai-authenticated-user-email':who==='owner'?'clubedojoao18@gmail.com':who+'@example.com',...extra};if(body!==undefined){headers.Origin='https://test.example';if(!extra['Content-Type'])headers['Content-Type']='application/json'}return worker.fetch(new Request('https://test.example/api/joana/video'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:body instanceof Uint8Array?body:JSON.stringify(body)}),env)}
const input={kind:'scene',text:'Uma paisagem em movimento.',duration:5,consent:true,costAccepted:true,requestId:'request-video-000000001'};
test('video generation requires owner, connection and consent; retries cannot start another billable task',async()=>{
 assert.equal((await req('',undefined,'alice')).status,403);assert.equal((await req('/generate',input,'alice')).status,403);assert.equal((await req('/generate',{...input,consent:false})).status,400);assert.equal(calls.length,0);
 assert.equal((await req('/generate',input)).status,200);assert.equal((await req('/generate',input)).status,200);assert.equal(calls.length,1);assert.equal(calls[0].body.model,'gen4.5');assert.equal(calls[0].body.ratio,'720:1280');assert.equal((await req('/generate',{...input,text:'Outro pedido'})).status,409);
 const stored=db.prepare("SELECT value FROM config WHERE key='joana:video:owner'").get().value;assert.ok(!stored.includes(input.text));const data=await(await req('')).json();assert.equal(data.jobs.length,1);assert.ok(!JSON.stringify(data).includes('provider-local-secret'));assert.equal(data.jobs[0].providerId,undefined);
});
test('uncertain provider failures are not automatically retried or reported as successful',async()=>{
 globalThis.fetch=async()=>{calls.push(1);throw Error('timeout')};assert.equal((await req('/generate',input)).status,502);const r=await(await req('/generate',input)).json();assert.equal(r.replayed,true);assert.equal(r.ok,false);assert.equal(r.status,'uncertain');assert.equal(calls.length,1);
});
test('clone generation cannot use an unconfigured avatar and image-only uploads reject false MIME or cross-user reads',async()=>{
 assert.equal((await req('/generate',{...input,kind:'clone'})).status,409);assert.equal(calls.length,0);
 const bytes=new Uint8Array(32);bytes.set([255,216,255]);const headers={'Content-Type':'image/jpeg','Content-Length':'32','x-own-reference':'yes'};
 assert.equal((await req('/upload',bytes,'alice',headers)).status,403);assert.equal((await req('/upload',bytes,'owner',{...headers,'x-own-reference':'no'})).status,400);
 const r=await req('/upload',bytes,'owner',headers);assert.equal(r.status,201);const id=(await r.json()).id;assert.equal((await req('/file?id='+id,undefined,'alice')).status,403);assert.equal((await req('/file?id='+id)).status,200);assert.equal((await req('/upload',new Uint8Array(32),'owner',headers)).status,400);
 const data=await(await req('')).json();assert.equal(data.references[0].object,undefined);assert.equal(calls.length,0);
});
test('voice and avatar creation use only stored owner references and preserve the generated source IDs',async()=>{
 const audio=new Uint8Array(32);audio.set(new TextEncoder().encode('ID3'));const a=await(await req('/upload',audio,'owner',{'Content-Type':'audio/mpeg','Content-Length':'32','x-own-reference':'yes'})).json();
 const image=new Uint8Array(32);image.set([255,216,255]);const i=await(await req('/upload',image,'owner',{'Content-Type':'image/jpeg','Content-Length':'32','x-own-reference':'yes'})).json();
 assert.equal((await req('/voice',{reference:a.id,consent:true,costAccepted:true,requestId:'request-voice-000000001'})).status,200);
 assert.equal(calls[0].body.from.type,'audio');assert.match(calls[0].body.from.audio,/^data:audio\/mpeg;base64,/);
 globalThis.fetch=async(url,opts)=>{calls.push({url,body:JSON.parse(opts.body)});return Response.json({id:'87654321-4321-4321-8321-210987654321',status:'READY'})};
 assert.equal((await req('/avatar',{reference:i.id,consent:true,costAccepted:true,requestId:'request-avatar-00000001'})).status,200);assert.equal(calls[1].body.voice.type,'custom');assert.match(calls[1].body.referenceImage,/^data:image\/jpeg;base64,/);
 const out=await(await req('')).json();assert.equal(out.avatar,'87654321-4321-4321-8321-210987654321');
 assert.equal((await req('/generate',{...input,kind:'clone',requestId:'request-clone-000000001'})).status,200);assert.equal(calls[2].body.model,'gwm1_avatars');assert.equal(calls[2].body.speech.voice.id,out.voice);
});
