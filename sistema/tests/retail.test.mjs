import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {TENANT_SCHEMA} from '../worker/tenant-schema.js';
import worker from '../worker/index.js';
import {retailWebhook} from '../worker/retail.js';
let sql,env;const realFetch=globalThis.fetch;
function adapter(db){return {prepare(q){let args=[];return {bind(...v){args=v;return this},async first(){return db.prepare(q).get(...args)||null},async all(){return {results:db.prepare(q).all(...args)}},async run(){return db.prepare(q).run(...args)},_run(){return db.prepare(q).run(...args)}}},async batch(s){db.exec('BEGIN');try{const r=s.map(x=>x._run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}}}
beforeEach(()=>{sql=new DatabaseSync(':memory:');sql.exec(TENANT_SCHEMA.replaceAll('--> statement-breakpoint',''));env={DB:adapter(sql)}});afterEach(()=>{globalThis.fetch=realFetch;sql.close()});
async function request(path,b,who='owner'){const headers={'oai-authenticated-user-id':who,'oai-authenticated-user-email':who==='owner'?'clubedojoao18@gmail.com':who+'@example.com'};if(b!==undefined){headers['Content-Type']='application/json';headers.Origin='https://test.example'}const r=await worker.fetch(new Request('https://test.example'+path,{method:b===undefined?'GET':'POST',headers,body:b===undefined?undefined:JSON.stringify(b)}),env);return {status:r.status,data:await r.json()}}
async function init(){await request('/api/me');await request('/api/profile',{name:'Cliente',phone:'21999999999'},'client')}
const date=()=>new Date(Date.now()+3*86400000).toISOString().slice(0,10);
const booking=()=>({service:'corte',kind:'single',barber:'owner',date:date(),time:'10:00'});
function put(key,x){sql.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(x))}
function enable(){env.STRIPE_SECRET_KEY='sk_live_test';env.STRIPE_CARD_CONFIGURATION='pmc_test';env.STRIPE_WEBHOOK_SECRET='test';env.STRIPE_WEBHOOK_VALIDATED='true';env.PAYMENTS_ENABLED='true';put('pricesApproved',true);put('connection',{enabled:true,webhookValidated:true})}
async function product(stock=2){await request('/api/products',{name:'Pomada de teste',price:3500,cost:1000,minimum:1});const p=sql.prepare('SELECT * FROM products').get();sql.prepare('UPDATE products SET stock=? WHERE id=?').run(stock,p.id);return p}
test('extras preserve main service duration, calculate server prices, respect conflicts and appear in customer agenda',async()=>{
 await init();const r=await request('/api/appointments',{...booking(),extras:['hidratacao'],price:1},'client');assert.equal(r.status,201,JSON.stringify(r.data));const a=sql.prepare('SELECT * FROM appointments WHERE id=?').get(r.data.id);assert.equal(a.duration,30);const day=new Date(date()+'T12:00:00Z').getUTCDay();assert.equal(a.price,([2,3].includes(day)?3500:4000)+2500);assert.equal(sql.prepare('SELECT COUNT(*) n FROM slots WHERE appointment_id=?').get(a.id).n,1);
 assert.equal((await request('/api/appointments',{...booking(),time:'10:30'},'client')).status,201);
 const listed=(await request('/api/appointments',undefined,'client')).data.find(x=>x.id===a.id);assert.equal(listed.extras[0].name,'Hidratação');assert.equal((await request('/api/appointments',{...booking(),time:'10:00'},'client')).status,409);
 assert.equal((await request('/api/appointments',{...booking(),time:'12:00',extras:['corte']},'client')).status,400);
});
test('club benefits are not sold twice and overdue users cannot bypass booking restriction with extras',async()=>{
 await init();sql.prepare("INSERT INTO memberships(user_id,plan_id,billing_day,status,paid_until) VALUES('client','ouro',10,'active',?)").run(Math.floor(Date.now()/1000)+86400*30);
 assert.equal((await request('/api/appointments',{...booking(),kind:'club',extras:['sobrancelha']},'client')).status,400);
 const r=await request('/api/appointments',{...booking(),kind:'club',extras:['hidratacao']},'client');assert.equal(r.status,201);assert.equal(sql.prepare('SELECT price FROM appointments WHERE id=?').get(r.data.id).price,2500);
 sql.prepare("UPDATE memberships SET status='past_due'").run();assert.equal((await request('/api/appointments',{...booking(),time:'12:00',extras:['hidratacao']},'client')).status,402);
});
test('offers never invent popularity, sell zero stock or expose product cost',async()=>{
 await init();const p=await product(0);let r=await request('/api/retail/offers?service=corte&kind=single&date='+date(),undefined,'client');assert.equal(r.data.products.length,0);assert.ok(r.data.services.every(x=>x.socialProof===null));sql.prepare('UPDATE products SET stock=2 WHERE id=?').run(p.id);r=await request('/api/retail/offers?service=corte&date='+date(),undefined,'client');assert.equal(r.data.products[0].cost,undefined);assert.match(r.data.products[0].stockMessage,/2/);
 assert.equal((await request('/api/retail/checkout',{confirm:true,operation:crypto.randomUUID(),products:[{id:p.id,quantity:1}]},'client')).status,503);
});
test('product checkout reserves stock once; signed fulfillment records sale and receipt only once',async()=>{
 await init();const p=await product();enable();let body,calls=0;globalThis.fetch=async(url,opts)=>{calls++;body=new URLSearchParams(opts.body);return Response.json({id:'cs_product',url:'https://checkout.stripe.com/c/pay'})};
 const operation=crypto.randomUUID(),payload={confirm:true,operation,products:[{id:p.id,quantity:1}],total:1};let r=await request('/api/retail/checkout',payload,'client');assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(body.get('line_items[0][price_data][unit_amount]'),'3500');assert.equal(body.get('payment_method_configuration'),'pmc_test');assert.equal(body.get('payment_method_types'),null);assert.equal(sql.prepare('SELECT stock FROM products WHERE id=?').get(p.id).stock,1);
 await request('/api/retail/checkout',payload,'client');assert.equal(sql.prepare('SELECT stock FROM products WHERE id=?').get(p.id).stock,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM sales').get().n,0);
 const event={id:'evt_retail',type:'checkout.session.completed',data:{object:{id:'cs_product',metadata:{kind:'retail',order_id:operation},mode:'payment',client_reference_id:'client',currency:'brl',amount_total:3500,payment_status:'paid',payment_intent:'pi_sale'}}};
 await retailWebhook(event,env,{today:()=>date()});await retailWebhook(event,env,{today:()=>date()});assert.equal(sql.prepare('SELECT COUNT(*) n FROM sales').get().n,1);assert.equal(sql.prepare('SELECT SUM(amount) n FROM ledger').get().n,3500);assert.equal(sql.prepare('SELECT stock FROM products WHERE id=?').get(p.id).stock,1);
 assert.equal((await request('/api/retail/orders',undefined,'other')).data.items.length,0);assert.equal((await request('/api/retail/deliver',{id:operation},'client')).status,403);assert.equal((await request('/api/retail/deliver',{id:operation})).status,200);
});
test('expired checkout restores reserved stock, and mismatched amount cannot fulfill',async()=>{
 await init();const p=await product();enable();globalThis.fetch=async()=>Response.json({id:'cs_expired',url:'https://checkout.stripe.com/c/pay'});const operation=crypto.randomUUID();await request('/api/retail/checkout',{confirm:true,operation,products:[{id:p.id,quantity:2}]},'client');assert.equal(sql.prepare('SELECT stock FROM products').get().stock,0);
 const object={id:'cs_expired',metadata:{kind:'retail',order_id:operation},mode:'payment',client_reference_id:'client',currency:'brl',amount_total:1,payment_status:'paid'};await assert.rejects(()=>retailWebhook({id:'bad',type:'checkout.session.completed',data:{object}},env,{today:date}),/Valor/);assert.equal(sql.prepare('SELECT COUNT(*) n FROM sales').get().n,0);
 object.amount_total=7000;object.status='expired';object.payment_status='unpaid';const e={id:'evt_expire',type:'checkout.session.expired',data:{object}};await retailWebhook(e,env,{today:date});await retailWebhook(e,env,{today:date});assert.equal(sql.prepare('SELECT stock FROM products').get().stock,2);assert.equal(sql.prepare('SELECT COUNT(*) n FROM ledger').get().n,0);
});
