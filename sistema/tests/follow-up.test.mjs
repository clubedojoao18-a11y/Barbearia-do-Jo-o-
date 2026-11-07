import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker,{today} from '../worker/index.js';

let db,env;
function adapter(sqlite){return {
 prepare(q){let args=[];return {bind(...v){args=v;return this},async first(){return sqlite.prepare(q).get(...args)||null},async all(){return {results:sqlite.prepare(q).all(...args)}},async run(){return sqlite.prepare(q).run(...args)},_run(){return sqlite.prepare(q).run(...args)}}},
 async batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>s._run());sqlite.exec('COMMIT');return result}catch(error){sqlite.exec('ROLLBACK');throw error}}
}}
beforeEach(()=>{db=new DatabaseSync(':memory:');for(const file of ['0000_clube','0001_permissions','0002_whatsapp','0003_operations'])db.exec(readFileSync(new URL('../drizzle/'+file+'.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));env={DB:adapter(db)}});
async function req(path,data,who='owner'){
 const headers={'oai-authenticated-user-id':who,'oai-authenticated-user-email':who==='owner'?'clubedojoao18@gmail.com':who+'@example.com'};
 if(data!==undefined){headers['Content-Type']='application/json';headers.Origin='https://test.example'}
 const response=await worker.fetch(new Request('https://test.example'+path,{method:data===undefined?'GET':'POST',headers,body:data===undefined?undefined:JSON.stringify(data)}),env);
 return {status:response.status,data:await response.json()};
}
async function client(id='client'){await req('/api/me',undefined,id);await req('/api/profile',{name:'Cliente '+id,phone:'24999999999'},id)}
function future(days){return new Date(Date.parse(today()+'T12:00:00Z')+days*86400000).toISOString().slice(0,10)}
async function original(service='corte',time='09:00'){
 await req('/api/me');await client();
 const result=await req('/api/appointments',{service,date:future(2),time,barber:'owner',kind:'single'},'client');
 assert.equal(result.status,201,JSON.stringify(result.data));
 return result.data.id;
}
function next(overrides={}){return {date:future(21),time:'11:15',service:'corte',...overrides}}

test('concluir e reagendar usa a grade de 15 minutos e preserva 45/90 minutos',async()=>{
 const cut=await original();
 const cutResult=await req('/api/appointment-finish-next',{id:cut,next:next()});
 assert.equal(cutResult.status,200,JSON.stringify(cutResult.data));
 assert.equal(db.prepare('SELECT status FROM appointments WHERE id=?').get(cut).status,'done');
 const savedCut=db.prepare('SELECT * FROM appointments WHERE id=?').get(cutResult.data.nextId);
 assert.equal(savedCut.user_id,'client');assert.equal(savedCut.barber_id,'owner');assert.equal(savedCut.duration,45);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM slots WHERE appointment_id=?').get(savedCut.id).n,3);

 db=new DatabaseSync(':memory:');for(const file of ['0000_clube','0001_permissions','0002_whatsapp','0003_operations'])db.exec(readFileSync(new URL('../drizzle/'+file+'.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));env={DB:adapter(db)};
 const combo=await original('combo');
 const comboResult=await req('/api/appointment-finish-next',{id:combo,next:next({service:'combo',time:'13:45'})});
 assert.equal(comboResult.status,200,JSON.stringify(comboResult.data));
 const savedCombo=db.prepare('SELECT * FROM appointments WHERE id=?').get(comboResult.data.nextId);
 assert.equal(savedCombo.duration,90);assert.equal(db.prepare('SELECT COUNT(*) n FROM slots WHERE appointment_id=?').get(savedCombo.id).n,6);
});

test('conflito ou horário fora da grade não conclui nem altera o atendimento original',async()=>{
 const id=await original();await client('other');
 const collision=await req('/api/appointments',{service:'corte',date:next().date,time:next().time,barber:'owner',kind:'single'},'other');
 assert.equal(collision.status,201,JSON.stringify(collision.data));
 assert.equal((await req('/api/appointment-finish-next',{id,next:next()})).status,409);
 assert.equal((await req('/api/appointment-finish-next',{id,next:next({time:'12:10'})})).status,400);
 assert.equal(db.prepare('SELECT status FROM appointments WHERE id=?').get(id).status,'scheduled');
 assert.equal(db.prepare('SELECT COUNT(*) n FROM appointment_transitions WHERE appointment_id=?').get(id).n,0);
});

test('duas conclusões concorrentes criam somente um próximo atendimento',async()=>{
 const id=await original();
 const results=await Promise.all([
  req('/api/appointment-finish-next',{id,next:next({time:'11:15'})}),
  req('/api/appointment-finish-next',{id,next:next({time:'14:30'})})
 ]);
 assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
 assert.equal(db.prepare('SELECT status FROM appointments WHERE id=?').get(id).status,'done');
 assert.equal(db.prepare('SELECT COUNT(*) n FROM appointment_transitions WHERE appointment_id=?').get(id).n,1);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM appointments WHERE id<>?').get(id).n,1);
});

test('somente a equipe autorizada pode concluir e agendar o próximo corte',async()=>{
 const id=await original();
 assert.equal((await req('/api/appointment-finish-next',{id,next:next()},'client')).status,403);
 await client('otherbarber');await req('/api/role',{id:'otherbarber',role:'barber'});
 assert.equal((await req('/api/appointment-finish-next',{id,next:next()},'otherbarber')).status,403);
 assert.equal(db.prepare('SELECT status FROM appointments WHERE id=?').get(id).status,'scheduled');
 assert.equal(db.prepare('SELECT COUNT(*) n FROM appointments').get().n,1);
});
