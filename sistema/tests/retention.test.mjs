import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {TENANT_SCHEMA} from '../worker/tenant-schema.js';
import worker from '../worker/index.js';
import {FOX_PRODUCTS,seedFoxCatalog,foxImage} from '../worker/fox-catalog.js';
import {returnSettings,customerReturns,returnTick,returnMessageEligible} from '../worker/retention.js';
import {marketingConsent} from '../worker/recovery.js';
let db,env;const realFetch=globalThis.fetch;
function adapter(sql){return {prepare(q){let args=[];return {bind(...v){args=v;return this},async first(){return sql.prepare(q).get(...args)||null},async all(){return {results:sql.prepare(q).all(...args)}},async run(){return sql.prepare(q).run(...args)},_run(){return sql.prepare(q).run(...args)}}},async batch(s){sql.exec('BEGIN');try{const out=s.map(x=>x._run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}}}
beforeEach(()=>{db=new DatabaseSync(':memory:');db.exec(TENANT_SCHEMA.replaceAll('--> statement-breakpoint',''));env={DB:adapter(db)}});afterEach(()=>{globalThis.fetch=realFetch;db.close()});
const now=()=>Math.floor(Date.now()/1000),today=()=>new Date(Date.now()-10800000).toISOString().slice(0,10),date=n=>new Date(Date.parse(today()+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const put=(k,v)=>db.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k,JSON.stringify(v));
async function req(path,b,user='owner'){const headers={'oai-authenticated-user-id':user,'oai-authenticated-user-email':user==='owner'?'clubedojoao18@gmail.com':user+'@example.com'};if(b!==undefined){headers['Content-Type']='application/json';headers.Origin='https://test.example'}const r=await worker.fetch(new Request('https://test.example'+path,{method:b===undefined?'GET':'POST',headers,body:b===undefined?undefined:JSON.stringify(b)}),env);return {status:r.status,data:await r.json()}}
async function init(){await req('/api/me');for(const id of ['client','other'])await req('/api/profile',{name:'Cliente Teste',phone:'21999999999'},id)}
function visit(id,service='corte',ago=-15,status='done',user='client',extras=[]){db.prepare('INSERT INTO appointments(id,user_id,barber_id,date,time,service,duration,price,kind,status) VALUES(?,?,?, ?,?,?,?,?,?,?)').run(id,user,'owner',date(ago),'10:00',service,45,4000,'single',status);if(extras.length)put('retail_booking_'+id,{extras:extras.map(id=>({id,name:id,price:2500,minutes:30}))})}
async function enable(){await init();put('retention_settings',{enabled:true});await marketingConsent(env.DB,'client',true,'test',now());db.prepare("INSERT INTO wa_contacts(wa_id,user_id,consent,last_inbound,mode) VALUES('5521999999999','client',1,?,'bot')").run(now());}
const config={whatsapp:{enabled:true,templates:{care_return:'return_approved'}}};
test('approved root catalog is atomic and idempotent, records quotes separately and never fabricates stock or costs',async()=>{
 await init();assert.equal((await seedFoxCatalog(env)).added,9);assert.equal((await seedFoxCatalog(env)).replayed,true);assert.equal(db.prepare('SELECT COUNT(*) n FROM products').get().n,9);assert.equal(db.prepare('SELECT SUM(stock) s FROM products').get().s,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM ledger').get().n,0);assert.equal((await returnSettings(env.DB)).enabled,true);
 const manager=await req('/api/retention/catalog');assert.equal(manager.status,200);assert.ok(manager.data.products.every(x=>x.costKnown===false&&x.margin===null&&x.details.quote>0));
 const client=await req('/api/retention/catalog',undefined,'client');assert.equal(client.status,200);assert.equal(client.data.products.length,9);assert.ok(!JSON.stringify(client.data).includes('quote'));assert.ok(client.data.products.every(x=>x.available===false));
 assert.deepEqual(await seedFoxCatalog({...env,WORKSPACE:{slug:'other'}}),{skipped:true});assert.equal((await req('/api/retention/settings',undefined,'client')).status,403);
});
test('actual costs must be confirmed before sale; owner can set price and replenishment without changing stock',async()=>{
 await init();await seedFoxCatalog(env);const id=FOX_PRODUCTS[0].id;db.prepare('UPDATE products SET stock=2 WHERE id=?').run(id);
 assert.equal((await req('/api/sales',{id:'cost-test-sale-01',product:id,quantity:1,customer:'client'})).status,409);
 assert.equal((await req('/api/retention/catalog',{id,price:3990,cost:2200,days:45},'client')).status,403);
 assert.equal((await req('/api/retention/catalog',{id,price:3990,cost:2200,days:45})).status,200);
 assert.equal(db.prepare('SELECT stock FROM products WHERE id=?').get(id).stock,2);
 assert.equal((await req('/api/sales',{id:'cost-test-sale-01',product:id,quantity:1,customer:'client'})).status,200);
 const r=await req('/api/retention',undefined,'client');assert.equal(r.data.items.length,1);assert.equal(r.data.items[0].due,date(45));assert.equal(r.data.items[0].estimated,true);
 assert.equal((await req('/api/retention',undefined,'other')).data.items.length,0);
});
test('completed principal and extras create distinct return dates, combos cover cut and beard, canceled visits do not count',async()=>{
 await init();visit('done-combo','combo',-1,'done','client',['hidratacao','depilacao','pele','camuflagem']);visit('canceled','corte',0,'canceled');visit('other-visit','hidratacao',-1,'done','other');
 const r=await customerReturns(env.DB,'client',await returnSettings(env.DB)),by=Object.fromEntries(r.map(x=>[x.key,x]));assert.equal(r.length,5);assert.equal(by['service:corte'].due,date(13));assert.equal(by['service:corte'].bookingService,'combo');assert.equal(by['service:barba'],undefined);assert.equal(by['service:hidratacao'].due,date(6));assert.equal(by['service:depilacao'].due,date(29));assert.equal(by['service:pele'].due,date(14));assert.equal(by['service:camuflagem'].due,date(6));
 visit('new-cut','corte',0);assert.equal((await customerReturns(env.DB,'client',await returnSettings(env.DB))).find(x=>x.key==='service:corte').source,'new-cut');
});
test('future matching extras suppress the specific invitation, but unrelated appointments do not suppress replenishment',async()=>{
 await init();await seedFoxCatalog(env);visit('done','corte',-15,'done','client',['hidratacao']);visit('scheduled','barba',1,'scheduled','client',['hidratacao']);
 const r=(await req('/api/retention?user=other',undefined,'client')).data.items;assert.equal(r.find(x=>x.key==='service:hidratacao').reserved,true);assert.equal(r.find(x=>x.key==='service:corte').reserved,false);assert.equal((await req('/api/retention',undefined,'other')).data.items.length,0);
});
test('marketing return queue requires consent, enforces cooldown, is concurrent-idempotent and does not reserve anything',async()=>{
 await enable();visit('due');await marketingConsent(env.DB,'client',false,'test',now());assert.equal((await returnTick(env,config,{now})).queued,0);await marketingConsent(env.DB,'client',true,'test',now());
 await Promise.all([returnTick(env,config,{now}),returnTick(env,config,{now})]);assert.equal(db.prepare('SELECT COUNT(*) n FROM wa_outbox').get().n,1);assert.equal(db.prepare("SELECT COUNT(*) n FROM appointments WHERE status='scheduled'").get().n,0);
 const message=db.prepare('SELECT * FROM wa_outbox').get();assert.match(message.text,/Nada é reservado ou comprado/);assert.equal(await returnMessageEligible(env.DB,message.id,'client'),true);assert.equal(await returnMessageEligible(env.DB,message.id,'other'),false);
 visit('later','hidratacao',-10);assert.equal((await returnTick(env,config,{now})).queued,0);
});
test('new bookings, opt-out, snooze and global or human pause prevent obsolete WhatsApp invitations',async()=>{
 await enable();visit('due');await returnTick(env,config,{now});const row=db.prepare('SELECT * FROM wa_outbox').get();visit('next','corte',2,'scheduled');assert.equal(await returnMessageEligible(env.DB,row.id,'client'),false);
 db.prepare("UPDATE appointments SET status='canceled' WHERE id='next'").run();assert.equal((await req('/api/retention/snooze',{key:'service:corte',date:date(30)},'client')).status,200);assert.equal(await returnMessageEligible(env.DB,row.id,'client'),false);
 assert.equal((await req('/api/retention/snooze',{key:'service:corte',date:date(30)},'other')).status,400);
 await marketingConsent(env.DB,'client',false,'app',now());assert.equal(db.prepare('SELECT status FROM wa_outbox').get().status,'canceled');assert.equal((await returnTick(env,{...config,automation:{paused:true}},{now})).queued,0);
});
test('configuration rejects impossible intervals and keeps owner marketing pause independent of WhatsApp activation',async()=>{
 await init();assert.equal((await returnSettings(env.DB)).enabled,false);
 assert.equal((await req('/api/retention/settings',{enabled:true,leadDays:2,cooldownDays:1})).status,400);
 assert.equal((await req('/api/retention/settings',{enabled:true,leadDays:2,cooldownDays:7,rules:{hidratacao:{days:7},pele:{days:15}}})).status,200);
 assert.equal((await req('/api/retention/settings')).data.whatsappConfigured,false);
});
test('verified catalog images are served locally; unknown identifiers never fetch arbitrary URLs',async()=>{
 globalThis.fetch=async()=>{throw new Error('Product image must not depend on a third-party connection')};
 const unknown=await foxImage(new Request('https://test.example'),env,new URL('https://test.example/api/retail/image/http-evil'));assert.equal(unknown.status,404);
 for(const p of FOX_PRODUCTS){const r=await foxImage(new Request('https://test.example'),env,new URL('https://test.example/api/retail/image/'+p.id));assert.equal(r.status,200);assert.match(r.headers.get('Content-Type'),/^image\//);assert.ok((await r.arrayBuffer()).byteLength>1000);}
});

function setupMeta(){env.WHATSAPP_ACCESS_TOKEN='meta-test-token';env.WHATSAPP_PHONE_NUMBER_ID='1234567890';env.WHATSAPP_APP_SECRET='secret-for-tests';env.WHATSAPP_VERIFY_TOKEN='verify-for-tests';put('whatsapp',config.whatsapp)}
test('official send uses approved template outside 24h, resumes only unsent template-blocked messages and never double sends',async()=>{
 await enable();visit('due','hidratacao',-7);setupMeta();db.prepare('UPDATE wa_contacts SET last_inbound=?').run(now()-90000);put('whatsapp',{enabled:true,templates:{}});let sends=0;
 globalThis.fetch=async(url,options)=>{assert.match(url,/graph.facebook.com/);const payload=JSON.parse(options.body);assert.equal(payload.type,'template');assert.equal(payload.template.name,'return_approved');assert.match(payload.template.components[0].parameters[0].text,/AGENDAR \d{4}-\d{2}-\d{2} hidratacao/);sends++;return Response.json({messages:[{id:'wamid_return_'+sends}]})};
 assert.equal((await req('/api/whatsapp/admin/process',{})).status,200);assert.equal(sends,0);assert.equal(db.prepare('SELECT status FROM wa_outbox').get().status,'blocked');
 put('whatsapp',config.whatsapp);assert.equal((await req('/api/whatsapp/admin/process',{})).status,200);assert.equal(sends,1);assert.equal(db.prepare('SELECT status FROM wa_outbox').get().status,'sent');
 await req('/api/whatsapp/admin/process',{});assert.equal(sends,1);
});
test('human handoff revalidates queued returns immediately before delivery',async()=>{
 await enable();visit('due');setupMeta();await returnTick(env,config,{now});db.prepare("UPDATE wa_contacts SET mode='human'").run();globalThis.fetch=async()=>{throw new Error('Should not contact Meta')};assert.equal((await req('/api/whatsapp/admin/process',{})).status,200);assert.equal(db.prepare('SELECT status FROM wa_outbox').get().status,'canceled');
});
test('online replenishment starts at confirmed pickup, never while paid products await delivery',async()=>{
 await init();await seedFoxCatalog(env);const order='a'.repeat(36),pid=FOX_PRODUCTS[0].id;db.prepare('INSERT INTO sales(id,product_id,quantity,unit_price,cost,actor_id,created_at) VALUES(?,?,1,3990,2200,?,?)').run('retail-'+order+'-'+pid,pid,'client',now()-864000);put('retail_order_'+order,{status:'paid',user:'client'});
 assert.equal((await req('/api/retention',undefined,'client')).data.items.length,0);put('retail_order_'+order,{status:'delivered',user:'client',deliveredAt:now()});const items=(await req('/api/retention',undefined,'client')).data.items;assert.equal(items.length,1);assert.equal(items[0].due,date(45));
});

test('the configured combo interval is honored without duplicate cut and beard invitations',async()=>{
 await init();put('retention_settings',{rules:{...((await returnSettings(env.DB)).rules),combo:{name:'Corte e barba',days:21}}});visit('combo-latest','combo',-1);visit('older-beard','barba',-3);
 const r=await customerReturns(env.DB,'client',await returnSettings(env.DB));assert.equal(r.length,1);assert.equal(r[0].bookingService,'combo');assert.equal(r[0].due,date(20));
});
test('catalog onboarding is owner-only, requires explicit confirmation and replays safely through cloud automation',async()=>{
 await init();assert.equal((await req('/api/retention/catalog/import',{confirm:true},'client')).status,403);assert.equal((await req('/api/retention/catalog/import',{confirm:false})).status,400);
 const r=await worker.fetch(new Request('https://test.example/mcp',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'owner','oai-authenticated-user-email':'clubedojoao18@gmail.com'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'process_automations',arguments:{}}})}),env);const data=await r.json();assert.equal(r.status,200);assert.equal(data.result.isError,undefined);assert.equal(db.prepare('SELECT COUNT(*) n FROM products').get().n,9);assert.equal(db.prepare('SELECT COUNT(*) n FROM ledger').get().n,0);
 assert.equal((await req('/api/retention/catalog/import',{confirm:true})).data.replayed,true);
});
