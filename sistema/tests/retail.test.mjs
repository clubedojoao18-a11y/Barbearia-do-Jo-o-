import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {TENANT_SCHEMA} from '../worker/tenant-schema.js';
import worker from '../worker/index.js';
import {retailWebhook} from '../worker/retail.js';
import {RETAIL_UI} from '../worker/retail-ui.js';
import {runInNewContext} from 'node:vm';
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
 await init();const r=await request('/api/appointments',{...booking(),extras:['hidratacao'],price:1},'client');assert.equal(r.status,201,JSON.stringify(r.data));const a=sql.prepare('SELECT * FROM appointments WHERE id=?').get(r.data.id);assert.equal(a.duration,45);const day=new Date(date()+'T12:00:00Z').getUTCDay();assert.equal(a.price,([2,3].includes(day)?3500:4000)+2500);assert.equal(sql.prepare('SELECT COUNT(*) n FROM slots WHERE appointment_id=?').get(a.id).n,3);
 assert.equal((await request('/api/appointments',{...booking(),time:'10:45'},'client')).status,201);
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

test('fixed 45/90 times override legacy settings; extras fit cut, beard and combo without changing prices',async()=>{
 await init();put('services',{corte:{minutes:30},combo:{minutes:60}});
 for(const [service,time,minutes] of [['corte','09:00',45],['barba','10:00',30],['combo','11:00',90]]){
  const r=await request('/api/appointments',{...booking(),service,time,extras:['hidratacao','pele']},'client');assert.equal(r.status,201,JSON.stringify(r.data));
  assert.equal(sql.prepare('SELECT duration FROM appointments WHERE id=?').get(r.data.id).duration,minutes);
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM slots WHERE appointment_id=?').get(r.data.id).n,minutes/15);
 }
 assert.equal((await request('/api/catalog',{id:'corte',name:'Corte',minutes:30,price:4000})).status,400);
 assert.equal((await request('/api/catalog',{id:'combo',name:'Corte e barba',minutes:60,price:6000})).status,400);
});
test('extra-only bookings reserve all selected extras and release exactly at the end',async()=>{
 await init();const r=await request('/api/appointments',{...booking(),service:'hidratacao',extras:['pele']},'client');assert.equal(r.status,201);
 const a=sql.prepare('SELECT * FROM appointments WHERE id=?').get(r.data.id);assert.equal(a.duration,60);assert.equal(a.price,6000);
 const busy=(await request('/api/slots?date='+date()+'&barber=owner',undefined,'client')).data.map(x=>x.time);assert.ok(busy.includes('10:45'));assert.ok(!busy.includes('11:00'));
 assert.equal((await request('/api/appointments',{...booking(),time:'10:45'},'client')).status,409);
 assert.equal((await request('/api/appointments',{...booking(),time:'11:00'},'client')).status,201);
});
test('quarter-hour starts reject overlaps, allow adjacent cuts and revalidate rescheduling atomically',async()=>{
 await init();const r=await request('/api/appointments',booking(),'client');assert.equal(r.status,201);
 assert.equal((await request('/api/appointments',{...booking(),time:'10:30'},'client')).status,409);
 assert.equal((await request('/api/appointments',{...booking(),time:'10:45'},'client')).status,201);
 assert.equal((await request('/api/appointment-reschedule',{id:r.data.id,date:date(),time:'10:15'},'client')).status,409);
 assert.equal(sql.prepare('SELECT status FROM appointments WHERE id=?').get(r.data.id).status,'scheduled');
 assert.equal((await request('/api/appointments',{...booking(),time:'12:10'},'client')).status,400);
});
test('legacy half-hour slots still block their entire stored interval without rewriting reservations',async()=>{
 await init();const r=await request('/api/appointments',booking(),'client');
 sql.prepare('UPDATE appointments SET duration=60 WHERE id=?').run(r.data.id);sql.prepare('DELETE FROM slots WHERE appointment_id=?').run(r.data.id);
 for(const time of ['10:00','10:30'])sql.prepare('INSERT INTO slots(barber_id,date,time,appointment_id) VALUES(?,?,?,?)').run('owner',date(),time,r.data.id);
 const before=sql.prepare('SELECT * FROM appointments WHERE id=?').get(r.data.id);
 assert.equal((await request('/api/appointments',{...booking(),time:'10:45'},'client')).status,409);
 assert.equal((await request('/api/agenda-block',{barber:'owner',date:date(),start:'10:45',end:'11:00'})).status,409);
 assert.equal((await request('/api/appointments',{...booking(),time:'11:00'},'client')).status,201);
 assert.deepEqual(sql.prepare('SELECT * FROM appointments WHERE id=?').get(r.data.id),before);
});
test('concurrent quarter-hour requests cannot overlap and closing boundaries include the full service',async()=>{
 await init();const results=await Promise.all(['10:00','10:15'].map(time=>request('/api/appointments',{...booking(),time},'client')));
 assert.deepEqual(results.map(x=>x.status).sort(),[201,409]);
 assert.equal((await request('/api/appointments',{...booking(),time:'19:15'},'client')).status,201);
 assert.equal((await request('/api/appointments',{...booking(),time:'19:30'},'client')).status,400);
 assert.equal((await request('/api/appointments',{...booking(),service:'combo',time:'18:45'},'client')).status,400);
});

test('changing service refreshes extra offers even while a different action is pending',async()=>{
 const events={},calls=[];const context={S:{selectedExtras:['pele']},document:{addEventListener(type,fn){events[type]=fn}},action(){throw new Error('Read-only updates must not be discarded by the mutation lock')},toast(message){throw new Error(message)}};
 runInNewContext(RETAIL_UI,context);context.loadRetailOffers=async()=>{calls.push('offers')};context.slots=async()=>{calls.push('slots')};
 events.change({target:{dataset:{},closest:()=>true}});await Promise.resolve();assert.equal(context.S.selectedExtras.length,0);assert.deepEqual(calls,['offers']);
 events.change({target:{dataset:{retailExtra:'pele'},checked:true}});await Promise.resolve();assert.equal(context.S.selectedExtras[0],'pele');assert.deepEqual(calls,['offers','slots']);
});
