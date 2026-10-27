import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {TENANT_SCHEMA} from '../worker/tenant-schema.js';
import {companyDB,scopeSQL,companyEnvironment} from '../worker/tenancy.js';
import worker,{today} from '../worker/index.js';
let sql,env;
function adapter(db){return {prepare(q){let args=[];return {bind(...v){args=v;return this},async first(){return db.prepare(q).get(...args)||null},async all(){return {results:db.prepare(q).all(...args)}},async run(){return db.prepare(q).run(...args)},_run(){return db.prepare(q).run(...args)}}},async batch(s){db.exec('BEGIN');try{const out=s.map(x=>x._run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}}}
beforeEach(()=>{sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');sql.exec(TENANT_SCHEMA.replaceAll('--> statement-breakpoint',''));env={DB:adapter(sql)}});
async function request(path,body,who='owner',extra={}){const headers={'oai-authenticated-user-id':who,'oai-authenticated-user-email':who==='owner'?'clubedojoao18@gmail.com':who+'@example.com',...extra};if(body!==undefined){headers['Content-Type']='application/json';headers.Origin='https://test.example'}const response=await worker.fetch(new Request('https://test.example'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),env);const text=await response.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:response.status,data,headers:response.headers}}
async function create(who,slug=who){const r=await request('/api/saas/create',{name:'Barbearia '+who,slug,plan:'sistema',confirm:true},who);assert.equal(r.status,201,JSON.stringify(r.data));return r.data.company}
const state=()=>JSON.parse(sql.prepare("SELECT value FROM config WHERE key='platform_state'").get().value);
function update(fn){const value=state();fn(value);sql.prepare("UPDATE config SET value=? WHERE key='platform_state'").run(JSON.stringify(value))}
async function profile(slug,id){return request('/b/'+slug+'/api/profile',{name:'Cliente '+id,phone:'21980000001'},id)}
const date=()=>new Date(Date.now()+2*86400000).toISOString().slice(0,10);
const book=(barber,extra={})=>({service:'corte',kind:'single',date:date(),time:'10:00',barber,...extra});
test('new company provisioning is additive, idempotent and does not change existing customer records',async()=>{
 await request('/api/profile',{name:'Original owner',phone:'21980000000'});const before=sql.prepare('SELECT * FROM users WHERE id=?').get('owner');const x=await create('alice');
 assert.deepEqual(sql.prepare('SELECT * FROM users WHERE id=?').get('owner'),before);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM appointments').get().n,0);
 const repeat=await request('/api/saas/create',{name:'Barbearia alice',slug:'alice',plan:'sistema',confirm:true},'alice');assert.equal(repeat.status,201);assert.equal(repeat.data.company.id,x.id);assert.equal(state().companies.length,1);
 assert.equal((await request('/b/alice/api/me',undefined,'alice')).data.isOwner,true);
 assert.equal((await request('/api/me',undefined,'alice')).data.isOwner,false);
});
test('companies isolate clients, appointments, stock, configuration and financial records',async()=>{
 const a=await create('alice'),b=await create('bruno');await request('/b/alice/api/me',undefined,'alice');await request('/b/bruno/api/me',undefined,'bruno');await profile('alice','customer');await profile('bruno','customer');
 const appt=await request('/b/alice/api/appointments',book('alice'),'customer');assert.equal(appt.status,201,JSON.stringify(appt.data));
 assert.equal((await request('/b/bruno/api/appointments',undefined,'bruno')).data.length,0);
 assert.equal((await request('/b/bruno/api/appointment-status',{id:appt.data.id,status:'canceled'},'customer')).status,404);
 assert.equal((await request('/api/appointments')).data.length,0);
 const product=await request('/b/alice/api/products',{name:'Pomada Alice',price:3500,cost:1000,minimum:2},'alice');assert.equal(product.status,200);
 assert.equal((await request('/b/bruno/api/operations',undefined,'bruno')).data.products.length,0);
 await request('/b/alice/api/ledger',{id:'alice-ledger-001',project:'barbearia',direction:'income',amount:1000,description:'Recebimento Alice',status:'received',date:today()},'alice');
 assert.equal((await request('/b/bruno/api/operations',undefined,'bruno')).data.ledger.length,0);
 assert.equal((await request('/api/manage')).data.config.platform_state,undefined);
 const imported=await request('/b/alice/api/products/import',{rows:[{name:'Produto CSV Alice',price:2000,cost:1000,stock:3,minimum:1}]},'alice');assert.equal(imported.status,200,JSON.stringify(imported.data));assert.equal((await request('/b/bruno/api/operations',undefined,'bruno')).data.products.length,0);
 const holiday=new Date(Date.now()+5*86400000).toISOString().slice(0,10);assert.equal((await request('/b/alice/api/agenda-vacation',{barber:'alice',start:holiday,end:holiday},'alice')).status,201);
 assert.equal((await request('/b/bruno/api/appointments',undefined,'bruno')).data.length,0);
 assert.notEqual(a.id,b.id);
});
test('vendor identity and spoofed headers do not grant owner privileges inside another company',async()=>{
 await create('alice');const original=await request('/b/alice/api/me');assert.equal(original.data.isOwner,false);assert.equal(original.data.user.role,'client');
 assert.equal((await request('/b/alice/api/role',{id:'owner',role:'manager'})).status,403);
 assert.equal((await request('/b/alice/api/saas/me',undefined,'alice')).status,404);
 assert.equal((await request('/api/manage',undefined,'alice',{'x-joao-workspace-base':'/b/alice'})).status,403);
 assert.equal((await request('/b/alice/api/manage',undefined,'bruno')).status,403);
 assert.equal((await request('/api/saas/company',{id:state().companies[0].id,paused:true},'alice')).status,403);
});
test('company runtime cannot inherit vendor payment or WhatsApp credentials',async()=>{
 await create('alice');env.STRIPE_SECRET_KEY='vendor-secret';env.STRIPE_WEBHOOK_SECRET='vendor-webhook';env.PAYMENTS_ENABLED='true';env.WHATSAPP_ACCESS_TOKEN='vendor-whatsapp';env.AUTOMATION_JOB_TOKEN='vendor-job';
 const company=state().companies[0],child=companyEnvironment(env,company);assert.equal(child.STRIPE_SECRET_KEY,undefined);assert.equal(child.WHATSAPP_ACCESS_TOKEN,undefined);assert.equal(child.AUTOMATION_JOB_TOKEN,undefined);
 const setup=(await request('/b/alice/api/manage',undefined,'alice')).data.setup;assert.equal(setup.key,false);assert.equal(setup.webhook,false);
 const webhook=await worker.fetch(new Request('https://test.example/b/alice/api/webhook',{method:'POST',headers:{'stripe-signature':'invalid'},body:'{}'}),env);assert.equal(webhook.status,400);
});
test('expired company licenses block changes while preserving reads and central billing access',async()=>{
 const x=await create('alice');await request('/b/alice/api/me',undefined,'alice');update(s=>{s.companies[0].trialUntil=1});
 assert.equal((await request('/b/alice/api/me',undefined,'alice')).status,200);
 assert.equal((await request('/b/alice/api/profile',{name:'Changed',phone:'21980000001'},'alice')).status,402);
 assert.equal((await request('/api/saas/me',undefined,'alice')).data.companies[0].licensed,false);
 assert.equal((await request('/api/saas/checkout',{id:x.id,confirm:true},'alice')).status,503);
 assert.equal((await request('/b/alice/api/portal',{},'alice')).status,503);
});
test('namespace rewriting preserves literals and scopes triggers, indexes and security counters',async()=>{
 const x=await create('alice'),company=state().companies[0],db=companyDB(env.DB,company);await request('/b/alice/api/me',undefined,'alice');
 const q=scopeSQL("SELECT * FROM users WHERE name='users config products'",'w_'+x.id+'_');assert.match(q,new RegExp('w_'+x.id+'_users'));assert.match(q,/'users config products'/);
 const product=await request('/b/alice/api/products',{name:'Produto',price:1000,cost:0,minimum:1},'alice');await request('/b/alice/api/stock',{id:'movement-tenant-01',product:product.data.id,quantity:2,reason:'Estoque inicial'},'alice');
 assert.equal((await db.prepare('SELECT stock FROM products').first()).stock,2);assert.equal(sql.prepare('SELECT COUNT(*) n FROM products').get().n,0);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM security_limits').first()).n>0,true);
 assert.throws(()=>db.prepare('SELECT * FROM sqlite_master'),/Unrecognized table/);
 assert.throws(()=>db.prepare('SELECT * FROM w_00000000000000000000000000000000_users'),/Unrecognized table/);
});
test('founder license is included only while the paid EU SOU founder membership remains current',async()=>{
 await request('/api/me',undefined,'alice');const end=Math.floor(Date.now()/1000)+864000;
 sql.prepare("INSERT INTO ledger(id,project,direction,amount,description,status,date,user_id,actor_id,created_at) VALUES('founder-paid','eusou','income',19000,'Matrícula paga','received',?,'alice','owner',0)").run(today());
 sql.prepare("INSERT INTO eu_members(user_id,role,paid_until,ledger_id) VALUES('alice','founder',?,'founder-paid')").run(end);
 const made=await request('/api/saas/create',{name:'Fundador Alice',slug:'fundador-alice',plan:'fundador',confirm:true},'alice');assert.equal(made.status,201,JSON.stringify(made.data));assert.equal(made.data.company.paidUntil,end);
 assert.equal((await request('/b/fundador-alice/api/profile',{name:'Alice',phone:'21980000001'},'alice')).status,200);
 assert.equal((await request('/api/saas/checkout',{id:made.data.company.id,confirm:true},'alice')).status,409);
 sql.prepare("UPDATE eu_members SET paid_until=1 WHERE user_id='alice'").run();
 assert.equal((await request('/b/fundador-alice/api/profile',{name:'Alice',phone:'21980000001'},'alice')).status,402);
 assert.equal((await request('/api/saas/me',undefined,'alice')).data.companies[0].licensed,false);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM memberships').get().n,0);
});
test('tenant assets and sign-in returns remain within the company area and frontend parses',async()=>{
 await create('alice');const html=await request('/b/alice/',undefined,'alice');assert.equal(html.status,200);assert.match(html.data,/src="\/b\/alice\/app.js"/);
 const script=await request('/b/alice/app.js',undefined,'alice');assert.match(script.data,/fetch\('\/b\/alice\/api\//);assert.match(script.data,/return_to=%2Fb%2Falice%2F/);new Function(script.data);
 const manifest=await request('/b/alice/manifest.webmanifest',undefined,'alice');assert.equal(manifest.data.scope,'/b/alice/');assert.equal(manifest.data.start_url,'/b/alice/');assert.equal(manifest.data.name,'Barbearia alice');assert.equal(manifest.data.icons[0].src.startsWith('/b/alice/'),true);
 assert.equal((await request('/b/alice/sw.js',undefined,'alice')).headers.get('service-worker-allowed'),'/b/alice/');
});
test('commercial signup rejects unsafe names, invalid slugs, duplicate ownership and unverified founder status',async()=>{
 for(const changes of [{name:"Bad ' name"},{slug:'../root'},{slug:'ab'}, {plan:'fundador'}]){const r=await request('/api/saas/create',{name:'Empresa boa',slug:'empresa-boa',plan:'sistema',confirm:true,...changes},'alice');assert.ok([400,403].includes(r.status),JSON.stringify(r))}
 await create('alice');assert.equal((await request('/api/saas/create',{name:'Segunda',slug:'segunda',plan:'sistema',confirm:true},'alice')).status,409);
 assert.equal((await request('/api/saas/create',{name:'Outra',slug:'alice',plan:'sistema',confirm:true},'bruno')).status,409);
});
async function billing(){env.STRIPE_SECRET_KEY='sk_test_local';env.STRIPE_WEBHOOK_SECRET='local-webhook-secret';env.STRIPE_CARD_CONFIGURATION='pmc_local';env.PAYMENTS_ENABLED='true';env.STRIPE_WEBHOOK_VALIDATED='true';sql.prepare("INSERT INTO config(key,value) VALUES('pricesApproved','true')").run();const r=await request('/api/saas/settings',{signupEnabled:true,billingEnabled:true,trialDays:7,prices:{sistema:19900,fundador:9900}});assert.equal(r.status,200,JSON.stringify(r.data))}
async function event(payload){const raw=JSON.stringify({livemode:false,...payload}),t=Math.floor(Date.now()/1000);const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(t+'.'+raw))).toString('hex');const r=await worker.fetch(new Request('https://test.example/api/webhook',{method:'POST',headers:{'stripe-signature':'t='+t+',v1='+sig},body:raw}),env);return {status:r.status,data:await r.json()}}
test('license checkout uses server prices and card-only configuration without activating by redirect',async()=>{
 const x=await create('alice');await billing();const original=globalThis.fetch;let params;
 globalThis.fetch=async(url,opts)=>{assert.ok(url.endsWith('/checkout/sessions'));params=new URLSearchParams(opts.body);return Response.json({url:'https://checkout.stripe.com/c/pay/license-test'})};
 try{assert.equal((await request('/api/saas/checkout',{id:x.id,price:1,confirm:true},'alice')).status,200);assert.equal(params.get('line_items[0][price_data][unit_amount]'),'19900');assert.equal(params.get('payment_method_configuration'),'pmc_local');assert.equal(params.get('payment_method_types[0]'),null);assert.equal(params.get('metadata[kind]'),'saas');assert.equal(params.get('success_url'),'https://test.example/sistema?checkout=return');assert.equal(state().companies[0].paidUntil,0);assert.equal((await request('/api/saas/checkout',{id:x.id,confirm:true},'bruno')).status,403)}finally{globalThis.fetch=original}
});
test('signed license payments activate only matching company, amount and invoice period; duplicate and stale events do not extend access',async()=>{
 const x=await create('alice');await billing();const original=globalThis.fetch;let sub;
 globalThis.fetch=async(url)=>url.endsWith('/checkout/sessions')?Response.json({url:'https://checkout.stripe.com/c/pay/license-test'}):Response.json(sub);
 try{
  await request('/api/saas/checkout',{id:x.id,confirm:true},'alice');const pending=state().companies[0].pending,paidEnd=Math.floor(Date.now()/1000)+864000;
  sub={id:'sub_license',customer:'cus_license',metadata:{kind:'saas',company_id:x.id,license_token:pending.token},items:{data:[{current_period_end:paidEnd+864000,price:{currency:'brl',unit_amount:19900,recurring:{interval:'month'}}}]}};
  update(s=>{s.companies[0].trialUntil=1});assert.equal((await request('/b/alice/api/profile',{name:'Alice',phone:'21980000001'},'alice')).status,402);
  const invoice={id:'in_license',status:'paid',subscription:'sub_license',customer:'cus_license',currency:'brl',amount_paid:19900,lines:{data:[{period:{end:paidEnd}}]}};
  assert.equal((await event({id:'evt_bad_value',type:'invoice.paid',data:{object:{...invoice,amount_paid:1}}})).status,409);assert.equal(state().companies[0].paidUntil,0);
  const paid={id:'evt_license_paid',type:'invoice.paid',data:{object:invoice}};assert.equal((await event(paid)).status,200);assert.equal(state().companies[0].paidUntil,paidEnd);assert.equal((await event(paid)).status,200);assert.equal(state().companies[0].paidUntil,paidEnd);
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM webhook_events WHERE id='evt_license_paid'").get().n,1);
  assert.equal((await request('/b/alice/api/profile',{name:'Alice',phone:'21980000001'},'alice')).status,200);
  assert.equal((await event({id:'evt_late_failure',type:'invoice.payment_failed',data:{object:invoice}})).status,200);assert.equal(state().companies[0].status,'active');
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM invoices').get().n,0);assert.equal(sql.prepare('SELECT COUNT(*) n FROM memberships').get().n,0);
 }finally{globalThis.fetch=original}
});
