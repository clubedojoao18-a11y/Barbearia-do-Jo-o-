import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker,{today} from '../worker/index.js';

let db,env;
function adapter(sqlite){return {
 prepare(q){let args=[];return {bind(...v){args=v;return this},async first(){return sqlite.prepare(q).get(...args)||null},async all(){return {results:sqlite.prepare(q).all(...args)}},async run(){return sqlite.prepare(q).run(...args)},_run(){return sqlite.prepare(q).run(...args)}}},
 async batch(statements){sqlite.exec('BEGIN');try{const r=statements.map(s=>s._run());sqlite.exec('COMMIT');return r}catch(e){sqlite.exec('ROLLBACK');throw e}}
}}
beforeEach(()=>{db=new DatabaseSync(':memory:');for(const file of ['0000_clube','0001_permissions','0002_whatsapp','0003_operations'])db.exec(readFileSync(new URL('../drizzle/'+file+'.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));env={DB:adapter(db)}});
async function req(path,data,who='owner'){const headers={'oai-authenticated-user-id':who,'oai-authenticated-user-email':who==='owner'?'clubedojoao18@gmail.com':who+'@example.com'};if(data!==undefined){headers['Content-Type']='application/json';headers.Origin='https://test.example'}const r=await worker.fetch(new Request('https://test.example'+path,{method:data===undefined?'GET':'POST',headers,body:data===undefined?undefined:JSON.stringify(data)}),env);return {status:r.status,data:await r.json()}}
async function client(id='client'){await req('/api/me',undefined,id);await req('/api/profile',{name:'Cliente '+id,phone:'24999999999'},id)}
function future(days){return new Date(Date.parse(today()+'T12:00:00Z')+days*86400000).toISOString().slice(0,10)}
async function original(){await req('/api/me');await client();const r=await req('/api/appointments',{service:'corte',date:future(2),time:'10:00',barber:'owner',kind:'single'},'client');assert.equal(r.status,201,JSON.stringify(r.data));return r.data.id}
function next(overrides={}){return {date:future(21),time:'11:00',service:'corte',...overrides}}
test('finishing with yes books the next cut for same client and barber atomically, at no provider cost',async()=>{
 const id=await original(),r=await req('/api/appointment-finish-next',{id,next:next()});assert.equal(r.status,200,JSON.stringify(r.data));
 assert.equal(db.prepare('SELECT status FROM appointments WHERE id=?').get(id).status,'done');
 const saved=db.prepare('SELECT * FROM appointments WHERE id=?').get(r.data.nextId);assert.equal(saved.user_id,'client');assert.equal(saved.barber_id,'owner');assert.equal(saved.date,next().date);assert.equal(saved.time,'11:00');assert.equal(saved.service,'corte');assert.equal(saved.kind,'single');assert.equal(saved.status,'scheduled');
 assert.equal(db.prepare('SELECT COUNT(*) n FROM appointments').get().n,2);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM appointment_transitions WHERE appointment_id=? AND action=?').get(id,'done').n,1);
 assert.equal((await req('/api/appointment-finish-next',{id,next:next({time:'13:00'})})).status,409);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM appointments').get().n,2);
});
test('no means normal completion with no follow-up and no justification',async()=>{
 const id=await original();const r=await req('/api/appointment-status',{id,status:'done'});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(db.prepare('SELECT status FROM appointments WHERE id=?').get(id).status,'done');assert.equal(db.prepare('SELECT COUNT(*) n FROM appointments').get().n,1);
});
test('unavailable slot does not close original service or create another booking',async()=>{
 const id=await original();await client('other');const collision=await req('/api/appointments',{service:'corte',date:next().date,time:'11:00',barber:'owner',kind:'single'},'other');assert.equal(collision.status,201,JSON.stringify(collision.data));
 const r=await req('/api/appointment-finish-next',{id,next:next()});assert.equal(r.status,409,JSON.stringify(r.data));assert.equal(db.prepare('SELECT status FROM appointments WHERE id=?').get(id).status,'scheduled');assert.equal(db.prepare('SELECT COUNT(*) n FROM appointments').get().n,2);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM config WHERE key=?").get('appointment_followup_'+id).n,0);
});
test('only authorized team can conclude and rebook, and invalid data changes nothing',async()=>{
 const id=await original();assert.equal((await req('/api/appointment-finish-next',{id,next:next()},'client')).status,403);
 await client('otherbarber');await req('/api/role',{id:'otherbarber',role:'barber'});assert.equal((await req('/api/appointment-finish-next',{id,next:next()},'otherbarber')).status,403);
 assert.equal((await req('/api/appointment-finish-next',{id,next:next({service:'barba'})})).status,400);
 assert.equal((await req('/api/appointment-finish-next',{id,next:next({date:future(-1)})})).status,400);
 assert.equal(db.prepare('SELECT status FROM appointments WHERE id=?').get(id).status,'scheduled');
 assert.equal(db.prepare('SELECT COUNT(*) n FROM appointments').get().n,1);
});
