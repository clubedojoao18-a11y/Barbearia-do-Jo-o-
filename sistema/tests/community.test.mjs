import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {TENANT_SCHEMA} from '../worker/tenant-schema.js';
import worker from '../worker/index.js';
import {lessons} from '../worker/academy-content.js';
import {communityWebhook} from '../worker/community-billing.js';
let db,env;const realFetch=globalThis.fetch;
function adapter(sql){function s(q,v=[]){return {bind(...args){return s(q,args)},async first(){return sql.prepare(q).get(...v)||null},async all(){return {results:sql.prepare(q).all(...v)}},async run(){return sql.prepare(q).run(...v)},_run(){return sql.prepare(q).run(...v)}}}return {prepare:s,async batch(xs){sql.exec('BEGIN');try{const r=xs.map(x=>x._run());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}}}
beforeEach(()=>{db=new DatabaseSync(':memory:');db.exec(TENANT_SCHEMA.replaceAll('--> statement-breakpoint',''));env={DB:adapter(db)}});afterEach(()=>{globalThis.fetch=realFetch;db.close()});
async function req(path,b,who='owner'){const headers={'oai-authenticated-user-id':who,'oai-authenticated-user-email':who==='owner'?'clubedojoao18@gmail.com':who+'@example.com'};if(b!==undefined){headers['Content-Type']='application/json';headers.Origin='https://test.example'}const r=await worker.fetch(new Request('https://test.example'+path,{method:b===undefined?'GET':'POST',headers,body:b===undefined?undefined:JSON.stringify(b)}),env);return {status:r.status,data:await r.json()}}
function put(k,v){db.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k,JSON.stringify(v))}
function enable(){env.STRIPE_SECRET_KEY='sk_live_test';env.STRIPE_WEBHOOK_SECRET='webhook';env.STRIPE_CARD_CONFIGURATION='pmc_test';env.PAYMENTS_ENABLED='true';env.STRIPE_WEBHOOK_VALIDATED='true';put('pricesApproved',true)}
const now=()=>Math.floor(Date.now()/1000),h={now,today:()=>new Date().toISOString().slice(0,10),err:(s,status=400)=>Object.assign(new Error(s),{status})};
test('community prices require owner approval, checkout uses server amount and founder requires explicit invitation',async()=>{
 await req('/api/me');await req('/api/me',undefined,'alice');assert.equal((await req('/api/community-billing/checkout',{role:'member',confirm:true},'alice')).status,503);enable();
 assert.equal((await req('/api/community-billing/settings',{enabled:true,prices:{member:29000,educator:38000,founder:19000}},'alice')).status,403);
 assert.equal((await req('/api/community-billing/settings',{enabled:true,prices:{member:29000,educator:38000,founder:19000}})).status,200);
 assert.equal((await req('/api/community-billing/checkout',{role:'founder',confirm:true},'alice')).status,403);await req('/api/community-billing/invite',{email:'alice@example.com',role:'founder'});
 let params;globalThis.fetch=async(url,opts)=>{params=new URLSearchParams(opts.body);return Response.json({url:'https://checkout.stripe.com/c/test'})};
 assert.equal((await req('/api/community-billing/checkout',{role:'founder',price:1,confirm:true},'alice')).status,200);assert.equal(params.get('line_items[0][price_data][unit_amount]'),'19000');assert.equal(params.get('payment_method_configuration'),'pmc_test');assert.equal((await req('/api/community-billing',undefined,'alice')).data.member,null);assert.equal((await req('/api/manage')).data.config.community_invites,undefined);
});
test('verified community invoice grants paid access and records revenue once; mismatch cannot grant access',async()=>{
 await req('/api/me',undefined,'alice');const x={user:'alice',role:'founder',price:19000,token:'token',status:'pending'};put('community_subscription_alice',x);
 const meta={kind:'community',user_id:'alice',role:'founder',token:'token'},checkout={id:'session',mode:'subscription',metadata:meta,client_reference_id:'alice',subscription:'sub_eu',customer:'cus_eu'};
 await communityWebhook({id:'evt_checkout',type:'checkout.session.completed',data:{object:checkout}},env,h);assert.equal(db.prepare('SELECT COUNT(*) n FROM eu_members').get().n,0);
 const sub={id:'sub_eu',customer:'cus_eu',metadata:meta,items:{data:[{price:{unit_amount:19000,currency:'brl',recurring:{interval:'month'}}}]}},invoice={id:'invoice_eu',status:'paid',parent:{subscription_details:{subscription:'sub_eu',metadata:meta}},customer:'cus_eu',currency:'brl',amount_paid:1,lines:{data:[{period:{end:now()+86400*30}}]}};
 const helper={...h,stripe:async()=>sub};await assert.rejects(()=>communityWebhook({id:'evt_bad',type:'invoice.paid',data:{object:invoice}},env,helper),/Valor/);assert.equal(db.prepare('SELECT COUNT(*) n FROM eu_members').get().n,0);
 invoice.amount_paid=19000;const e={id:'evt_paid',type:'invoice.paid',data:{object:invoice}};await communityWebhook(e,env,helper);await communityWebhook(e,env,helper);assert.equal(db.prepare('SELECT role FROM eu_members').get().role,'founder');assert.equal(db.prepare('SELECT COUNT(*) n FROM ledger').get().n,1);assert.equal((await req('/api/academy',undefined,'alice')).data.access,true);
 await communityWebhook({id:'evt_failed',type:'invoice.payment_failed',data:{object:invoice}},env,helper);assert.equal(JSON.parse(db.prepare("SELECT value FROM config WHERE key='community_subscription_alice'").get().value).status,'active');
});
test('integrated Academy protects lesson text and answers; progress belongs only to the signed-in paid student',async()=>{
 await req('/api/me');await req('/api/me',undefined,'alice');assert.equal((await req('/api/academy?lesson=0',undefined,'alice')).status,403);assert.ok(!(await req('/api/academy',undefined,'alice')).data.syllabus[0].blocks);
 const lesson=await req('/api/academy?lesson=0');assert.equal(lesson.status,200);assert.equal(lesson.data.answer,undefined);assert.equal((await req('/api/academy',{lesson:0,answer:lessons[0].answer})).data.correct,true);assert.equal((await req('/api/academy',{lesson:0,answer:lessons[0].answer})).data.correct,true);assert.deepEqual((await req('/api/academy')).data.done,[0]);assert.deepEqual((await req('/api/academy',undefined,'alice')).data.done,[]);
});
