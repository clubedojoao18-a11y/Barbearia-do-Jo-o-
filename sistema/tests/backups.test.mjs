import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {TENANT_SCHEMA} from '../worker/tenant-schema.js';
import {scopeSQL} from '../worker/tenancy.js';
import {collectSnapshot,sealBackup,openBackup,createBackup,backupRoutes} from '../worker/backups.js';
import {restoreNewDatabase} from '../scripts/restore-backup.mjs';
function adapter(db){
 function statement(q,args=[]){
  return {
   bind(...v){return statement(q,v)},
   async first(){return db.prepare(q).get(...args)||null},
   async all(){return {results:db.prepare(q).all(...args)}},
   async run(){return db.prepare(q).run(...args)},
   _exec(){return /^SELECT/i.test(q)?{results:db.prepare(q).all(...args)}:{results:[],meta:db.prepare(q).run(...args)}}
  };
 }
 return {prepare:statement,async batch(statements){db.exec('BEGIN');try{const r=statements.map(s=>s._exec());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}};
}
function setup(){
 const db=new DatabaseSync(':memory:');db.exec(TENANT_SCHEMA.replaceAll('--> statement-breakpoint',''));const objects=new Map();
 const BUCKET={async put(k,v){objects.set(k,v)},async get(k){const value=objects.get(k);return value?{async json(){return JSON.parse(value)}}:null}};
 const env={DB:adapter(db),CONNECTION_MASTER_KEY:btoa('a'.repeat(32)),BUCKET};
 return {db,env,objects};
}
test('encrypted complete snapshot restores into a separate database without doubling inventory movements',async()=>{
 const {db,env}=setup(),dir=mkdtempSync(join(tmpdir(),'joao-recovery-'));
 try{db.prepare("INSERT INTO users(id,email,name,role) VALUES('owner','owner@example.com','Owner','manager')").run();db.prepare("INSERT INTO products(id,name,price,cost,stock) VALUES('pomada','Pomada',3500,1000,0)").run();db.prepare("INSERT INTO stock_movements(id,product_id,quantity,reason,actor_id,created_at) VALUES('initial','pomada',10,'Entrada','owner',1),('sale','pomada',-2,'Venda','owner',2)").run();
 const snapshot=await collectSnapshot(env),envelope=await sealBackup(snapshot,env);assert.ok(!JSON.stringify(envelope).includes('owner@example.com'));const decoded=await openBackup(envelope,env);const path=join(dir,'restored.sqlite');assert.equal(restoreNewDatabase(decoded,path).restored,true);const restored=new DatabaseSync(path);assert.equal(restored.prepare('SELECT stock FROM products').get().stock,8);assert.equal(restored.prepare('SELECT COUNT(*) n FROM stock_movements').get().n,2);restored.prepare("INSERT INTO stock_movements(id,product_id,quantity,reason,actor_id,created_at) VALUES('next','pomada',-1,'Venda','owner',3)").run();assert.equal(restored.prepare('SELECT stock FROM products').get().stock,7);restored.close();assert.throws(()=>restoreNewDatabase(decoded,path),/Destination exists/);assert.equal(db.prepare('SELECT stock FROM products').get().stock,8);
 }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});
test('wrong key, altered ciphertext and foreign workspace are rejected',async()=>{
 const {db,env}=setup();try{const encrypted=await sealBackup(await collectSnapshot(env),env);await assert.rejects(()=>openBackup(encrypted,{...env,CONNECTION_MASTER_KEY:btoa('b'.repeat(32))}),/proteção/);await assert.rejects(()=>openBackup({...encrypted,cipher:encrypted.cipher.slice(0,-5)+'AAAA='},env));await assert.rejects(()=>openBackup(encrypted,{...env,WORKSPACE:{id:'f'.repeat(32)}}),/outro espaço/)}finally{db.close()}
});
test('root backup captures all registered companies in one snapshot and readback verifies saved data',async()=>{
 const {db,env,objects}=setup();try{const id='a'.repeat(32);db.exec(scopeSQL(TENANT_SCHEMA.replaceAll('--> statement-breakpoint',''),'w_'+id+'_'));db.prepare("INSERT INTO config(key,value) VALUES('platform_state',?)").run(JSON.stringify({companies:[{id}],revision:1}));db.prepare('INSERT INTO "w_'+id+'_users"(id,email,name) VALUES(?,?,?)').run('alice','alice@example.com','Alice');const result=await createBackup(env);assert.equal(result.verified,true);assert.equal(result.sections,2);assert.equal(objects.size,1);const snapshot=await openBackup(JSON.parse([...objects.values()][0]),env);assert.equal(snapshot.sections[1].tables.find(x=>x.name==='users').rows[0].name,'Alice') }finally{db.close()}
});
test('no partial backup when a table exceeds bounds and unauthorized callers cannot list or download',async()=>{
 const {db,env,objects}=setup();try{const insert=db.prepare('INSERT INTO users(id,email,name) VALUES(?,?,?)');for(let i=0;i<1001;i++)insert.run(String(i),'x'+i+'@example.com','X');await assert.rejects(()=>createBackup(env),/1.000/);assert.equal(objects.size,0);const req=new Request('https://test.example/api/backups');await assert.rejects(()=>backupRoutes(req,env,new URL(req.url),{}, {requireOwner(){throw Object.assign(new Error('Forbidden'),{status:403})}}),/Forbidden/)}finally{db.close()}
});
