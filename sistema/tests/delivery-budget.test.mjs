import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {reserveDeliveryAttempt} from '../worker/delivery-budget.js';
import {companyDB} from '../worker/tenancy.js';
function setup(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec('CREATE TABLE config(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE wa_outbox(id TEXT PRIMARY KEY,status TEXT,created_at INTEGER,sent_at INTEGER);');
 const db={prepare(sql){let args=[];return {bind(...x){args=x;return this},async first(){return sqlite.prepare(sql).get(...args)||null},async run(){return sqlite.prepare(sql).run(...args)}}}};
 return {sqlite,db};
}
test('parallel reservations enforce one daily ceiling even when none have finished sending',async()=>{
 const {sqlite,db}=setup();try{
 const results=await Promise.all(Array.from({length:30},()=>reserveDeliveryAttempt(db,'2026-10-27',4)));
 assert.equal(results.filter(Boolean).length,4);
 assert.equal(sqlite.prepare('SELECT value FROM config').get().value,'4');
 assert.equal(await reserveDeliveryAttempt(db,'2026-10-28',4),true);
 }finally{sqlite.close()}
});
test('existing sends and ambiguous attempts consume capacity when installing the counter',async()=>{
 const {sqlite,db}=setup();try{
 const start=Date.parse('2026-10-27T00:00:00-03:00')/1000;
 sqlite.prepare('INSERT INTO wa_outbox VALUES(?,?,?,?)').run('sent','sent',start-100,start+1);
 sqlite.prepare('INSERT INTO wa_outbox VALUES(?,?,?,?)').run('ambiguous','uncertain',start+1,null);
 assert.equal(await reserveDeliveryAttempt(db,'2026-10-27',3),true);
 assert.equal(await reserveDeliveryAttempt(db,'2026-10-27',3),false);
 assert.equal(await reserveDeliveryAttempt(db,'2026-10-27',2),false);
 }finally{sqlite.close()}
});
test('failed delivery reservations remain spent and a raised limit permits only the difference',async()=>{
 const {sqlite,db}=setup();try{
 assert.equal(await reserveDeliveryAttempt(db,'2026-10-27',1),true);
 assert.equal(await reserveDeliveryAttempt(db,'2026-10-27',1),false);
 assert.equal(await reserveDeliveryAttempt(db,'2026-10-27',2),true);
 assert.equal(await reserveDeliveryAttempt(db,'2026-10-27',2),false);
 }finally{sqlite.close()}
});
test('company counters remain isolated from each other and the vendor',async()=>{
 const {sqlite,db}=setup();try{
 const a={id:'a'.repeat(32),ownerEmail:'a@example.com'},b={id:'b'.repeat(32),ownerEmail:'b@example.com'};
 for(const x of [a,b])sqlite.exec('CREATE TABLE w_'+x.id+'_config(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE w_'+x.id+'_wa_outbox(id TEXT PRIMARY KEY,status TEXT,created_at INTEGER,sent_at INTEGER);');
 assert.equal(await reserveDeliveryAttempt(companyDB(db,a),'2026-10-27',1),true);
 assert.equal(await reserveDeliveryAttempt(companyDB(db,a),'2026-10-27',1),false);
 assert.equal(await reserveDeliveryAttempt(companyDB(db,b),'2026-10-27',1),true);
 assert.equal(await reserveDeliveryAttempt(db,'2026-10-27',1),true);
 }finally{sqlite.close()}
});
