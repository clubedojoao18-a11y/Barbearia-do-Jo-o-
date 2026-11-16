import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {waMessageStatement,waConversationHistory} from '../worker/whatsapp-conversations.js';
import {sealCredentials,openCredentials} from '../worker/index.js';

test('conversation text is encrypted, deduplicated, isolated by phone and expires after 90 days',async()=>{
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec('CREATE TABLE config(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE wa_outbox(id TEXT,text TEXT,status TEXT,created_at INTEGER,wa_id TEXT)');
 const env={CONNECTION_MASTER_KEY:btoa('k'.repeat(32)),DB:{prepare(sql){let args=[];return {bind(...v){args=v;return this},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)}}}}};
 let clock=1800000000;const h={sealCredentials,openCredentials,now:()=>clock};
 const message={id:'message-1',from:'5524999999999',type:'text',timestamp:String(clock),text:{body:'Quero agendar um corte <script>'}};
 await (await waMessageStatement(env,message,h)).run();
 await (await waMessageStatement(env,{...message,text:{body:'duplicate'}},h)).run();
 const stored=sqlite.prepare('SELECT value FROM config').get().value;
 assert.ok(!stored.includes(message.text.body));assert.ok(!stored.includes('duplicate'));
 sqlite.prepare('INSERT INTO wa_outbox VALUES(?,?,?,?,?)').run('reply-1','Qual horário?','delivered',clock+1,message.from);
 const result=await waConversationHistory(env,message.from,h);
 assert.deepEqual(result.messages.map(m=>m.text),[message.text.body,'Qual horário?']);
 assert.equal(result.messages[1].status,'delivered');assert.equal(result.historicalImport,false);
 assert.equal((await waConversationHistory(env,'5524888888888',h)).messages.length,0);
 await assert.rejects(waConversationHistory(env,'*',h),/Telefone inválido/);
 clock+=91*86400;
 assert.equal((await waConversationHistory(env,message.from,h)).messages.length,0);
 sqlite.close();
});

test('media captions are bounded; unsupported media remains an honest placeholder',async()=>{
 let saved;
 const env={DB:{prepare(){return {bind(key,value){saved=JSON.parse(value);return this}}}}};
 const h={now:()=>100,sealCredentials:async value=>value};
 await waMessageStatement(env,{id:'1',from:'5524999999999',type:'image',image:{caption:'a'.repeat(20000)},timestamp:'999'},h);
 assert.equal(saved.text.length,16000);assert.equal(saved.timestamp,100);
 await waMessageStatement(env,{id:'2',from:'5524999999999',type:'audio'},h);
 assert.equal(saved.text,'');assert.equal(saved.type,'audio');
});
