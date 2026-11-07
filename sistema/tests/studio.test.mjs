import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {Script} from 'node:vm';
import {TENANT_SCHEMA} from '../worker/tenant-schema.js';
import worker,{sealCredentials,openCredentials} from '../worker/index.js';
import {studioTick,processJob,studioState,validBrand} from '../worker/studio.js';
let sql,env;const realFetch=globalThis.fetch;
function adapter(db){return {prepare(q){let args=[];return {bind(...v){args=v;return this},async first(){return db.prepare(q).get(...args)||null},async all(){return {results:db.prepare(q).all(...args)}},async run(){return db.prepare(q).run(...args)},_run(){return db.prepare(q).run(...args)}}},async batch(s){db.exec('BEGIN');try{const r=s.map(x=>x._run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}}}
beforeEach(()=>{sql=new DatabaseSync(':memory:');sql.exec(TENANT_SCHEMA.replaceAll('--> statement-breakpoint',''));env={DB:adapter(sql),CONNECTION_MASTER_KEY:btoa('a'.repeat(32))}});
afterEach(()=>{globalThis.fetch=realFetch;sql.close()});
async function request(path,b,who='owner'){const headers={};if(who){headers['oai-authenticated-user-id']=who;headers['oai-authenticated-user-email']=who==='owner'?'clubedojoao18@gmail.com':who+'@example.com'}if(b!==undefined){headers['Content-Type']='application/json';headers.origin='https://test.example'}const r=await worker.fetch(new Request('https://test.example'+path,{method:b===undefined?'GET':'POST',headers,body:b===undefined?undefined:JSON.stringify(b)}),env);const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,data}}
function put(key,value){sql.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(value))}
const h={openCredentials,sealCredentials,conf:async()=>({}),serviceCatalog:()=>[],SERVICES:[]};
async function keys(){put('studio_credentials',await sealCredentials({openai:'test-secret',dailyLimit:12,barbearia:{verified:true,token:'instagram-secret',account:'123456789',login:'instagram'}},env))}
const brand={name:'Marca Teste',tagline:'Cuidado e estilo',primary:'#112233',accent:'#aabbcc',background:'#fafafa',font:'modern',logo:''};
test('project-specific identity reaches text and image generation without cross-project colors',async()=>{
 await keys();await request('/api/brand',brand);const payloads=[];
 globalThis.fetch=async(url,opts)=>{payloads.push({url:String(url),body:JSON.parse(opts.body)});return String(url).includes('/images/')?Response.json({data:[{b64_json:'YWJj'}]}):Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({title:'Uma pergunta útil',caption:'Escolha um próximo passo.',slides:[{title:'Seu próximo passo',body:'Escolha uma ação possível.'}]})}]}]})};
 for(const project of ['barbearia','eusou','pessoal']){
  const r=await request('/api/studio/generate',{project,topic:'educativo',format:'post',brief:'Conteúdo original.'});assert.equal(r.status,201);
  const input=JSON.parse(payloads.at(-1).body.input);
  assert.equal(input.brand.primary,project==='barbearia'?'#112233':project==='eusou'?'#28344a':'#173f74');
  if(project!=='barbearia')assert.notEqual(input.brand.accent,brand.accent);
  const row=sql.prepare("SELECT value FROM config WHERE key='studio_state'").get(),state=JSON.parse(row.value),job=state.jobs.find(x=>x.id===r.data.job.id);job.status='queued';job.authorized=true;job.dueAt=Date.now()/1000+86400;state.channels[project]={auto:true,generate:false};put('studio_state',state);
  assert.equal((await processJob(env,h,job.id,'https://test.example')).built,1);
  const prompt=payloads.at(-1).body.prompt;assert.ok(prompt.includes(input.brand.primary));assert.ok(prompt.includes(input.brand.direction));
  if(project!=='barbearia')assert.ok(!prompt.includes('principal '+brand.primary));
 }
});

test('EU SOU member portal keeps its own identity, compiles and does not bypass membership access',async()=>{
 await request('/api/brand',brand);
 const portal=await request('/eusou/membros',undefined,null);assert.equal(portal.status,200);
 assert.match(portal.data,/<title>EU SOU · Área de membros/);assert.doesNotMatch(portal.data,/Marca Teste|BARBEARIA<br>DO JOÃO/);
 const script=(await request('/app.js')).data;assert.doesNotThrow(()=>new Script(script));
 assert.match(script,/if\(COMMUNITY_MODE\)return communityNavigation/);
 assert.equal((await request('/api/academy?lesson=0',undefined,'member')).status,403);
 assert.equal((await request('/api/academy?lesson=0',undefined,null)).status,401);
 assert.equal((await request('/api/academy?lesson=0')).status,200);
});
test('owners configure identity; anonymous, staff and cross-site requests cannot change brand or content',async()=>{
 assert.equal((await request('/api/brand',brand,null)).status,401);assert.equal((await request('/api/brand',brand,'client')).status,403);assert.equal((await request('/api/brand',brand)).status,200);assert.equal((await request('/api/me',undefined,'client')).data.brand.name,brand.name);
 assert.equal((await request('/api/studio',undefined,'client')).status,403);assert.equal((await request('/api/brand',{...brand,primary:'#fff;}</style>'})).status,400);assert.equal((await request('/api/brand',{...brand,primary:'#ffffff'})).status,400);
 assert.throws(()=>validBrand({...brand,logo:'data:image/svg+xml;base64,abc'}));
});
test('studio secrets, assets and draft state never enter management configuration; only bearer asset links are public',async()=>{
 await keys();put('studio_asset_11111111-1111-1111-1111-111111111111',{token:'private-key',b64:'YWJj'});put('studio_state',{revision:1,channels:{},jobs:[]});const result=await request('/api/manage');assert.equal(result.data.config.studio_credentials,undefined);assert.equal(result.data.config.studio_state,undefined);assert.equal(result.data.config.studio_asset_11111111,undefined);assert.ok(!JSON.stringify(result.data).includes('instagram-secret'));
 assert.equal((await request('/api/studio/media/11111111-1111-1111-1111-111111111111',undefined,null)).status,404);assert.equal((await request('/api/studio/media/11111111-1111-1111-1111-111111111111?key=private-key',undefined,null)).status,200);
});
test('two companies isolate brand, content, API credentials and all existing modules',async()=>{
 for(const who of ['alice','bruno'])assert.equal((await request('/api/saas/create',{name:'Barbearia '+who,slug:who,plan:'sistema',confirm:true},who)).status,201);
 assert.equal((await request('/b/alice/api/brand',brand,'alice')).status,200);assert.notEqual((await request('/b/bruno/api/me',undefined,'bruno')).data.brand.name,brand.name);assert.equal((await request('/b/alice/api/studio',undefined,'bruno')).status,403);
 assert.equal((await request('/b/alice/api/studio/connect',{kind:'openai',key:'sk-'+'x'.repeat(25),dailyLimit:5},'alice')).status,200);assert.equal((await request('/b/alice/api/studio',undefined,'alice')).data.ai.connected,true);assert.equal((await request('/b/bruno/api/studio',undefined,'bruno')).data.ai.connected,false);
 assert.equal((await request('/api/studio')).data.ai.connected,false);
});
test('generation without credentials does not fabricate AI results; catalog context excludes client data',async()=>{
 let r=await request('/api/studio/generate',{project:'barbearia',topic:'servicos',format:'post',brief:'Explique hidratação.'});assert.equal(r.status,503);assert.equal((await studioState(env.DB)).jobs.length,0);await keys();let payload;
 globalThis.fetch=async(url,opts)=>{payload=JSON.parse(opts.body);return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({title:'Cuidados simples',caption:'Conheça nossos cuidados.',slides:[{title:'Hidratação',body:'Converse com seu barbeiro sobre a rotina.'}]})}]}]})};
 r=await request('/api/studio/generate',{project:'barbearia',topic:'servicos',format:'post',brief:'Explique hidratação.'});assert.equal(r.status,201);assert.equal(r.data.job.authorized,false);assert.equal(r.data.job.status,'draft');assert.equal(payload.store,false);assert.ok(!payload.input.includes('clubedojoao18@gmail.com'));assert.equal((await request('/api/studio')).data.ai.used,1);
 assert.equal((await request('/api/studio/generate',{project:'eusou',topic:'produtos',format:'post',brief:''})).status,400);
});
function pending(){return {id:'job-1',project:'barbearia',format:'post',title:'Test',caption:'Dica',slides:[{title:'Dica',body:'Cuidados'}],assets:[{id:'asset-1',token:'asset-key'}],container:'container-1',status:'ready',authorized:true,dueAt:0,lockUntil:0}}
test('concurrent runners publish one time; separate project queues and paused channels do not leak',async()=>{
 await keys();put('studio_state',{revision:0,channels:{barbearia:{auto:true},eusou:{auto:false}},jobs:[pending()]});let published=0;
 globalThis.fetch=async(url)=>{if(String(url).includes('media_publish')){published++;return Response.json({id:'media-123'})}return Response.json({status_code:'FINISHED'})};
 const out=await Promise.all([processJob(env,h,'job-1','https://test.example'),processJob(env,h,'job-1','https://test.example')]);assert.equal(published,1);assert.equal((await studioState(env.DB)).jobs[0].status,'published');await processJob(env,h,'job-1','https://test.example');assert.equal(published,1);
});
test('ambiguous publication is never retried automatically, and reconciliation only accepts Meta confirmation',async()=>{
 await keys();put('studio_state',{revision:0,channels:{barbearia:{auto:true}},jobs:[pending()]});let sends=0;
 globalThis.fetch=async(url)=>{if(String(url).includes('media_publish')){sends++;throw new Error('network')}return Response.json({status_code:'FINISHED'})};
 const r=await processJob(env,h,'job-1','https://test.example');assert.equal(r.uncertain,true);await processJob(env,h,'job-1','https://test.example');assert.equal(sends,1);assert.equal((await studioState(env.DB)).jobs[0].status,'uncertain');
 assert.equal((await request('/api/studio/job',{id:'job-1',action:'schedule',authorized:true,dueAt:Math.floor(Date.now()/1000),caption:'retry'})).status,409);
 globalThis.fetch=async()=>Response.json({status_code:'PUBLISHED'});assert.equal((await request('/api/studio/job',{id:'job-1',action:'reconcile'})).status,200);assert.equal((await studioState(env.DB)).jobs[0].status,'published');
});
test('image work respects atomic daily quota; a failure cannot mark content published',async()=>{
 await keys();const d=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());put('studio_usage_'+d,12);put('studio_state',{revision:0,channels:{barbearia:{auto:true}},jobs:[{...pending(),assets:[],container:null}]});let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Must not call')};
 await processJob(env,h,'job-1','https://test.example');assert.equal(calls,0);assert.equal((await studioState(env.DB)).jobs[0].status,'error');
});
test('MCP tools require verified owner identity and browser script compiles',async()=>{
 assert.equal((await request('/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'automation_status'}},'client')).data.result.isError,true);
 assert.equal((await request('/mcp',{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'automation_status'}})).data.result.isError,undefined);
 assert.ok((await request('/mcp',{jsonrpc:'2.0',id:3,method:'tools/list'})).data.result.tools.some(x=>x.name==='process_automations'));
 const js=await request('/app.js');assert.doesNotThrow(()=>new Script(js.data));
});
test('feedback is limited to a customer completed visit, isolated from other clients and excluded from AI context',async()=>{
 await request('/api/me');await request('/api/me',undefined,'client');await request('/api/me',undefined,'other');
 sql.prepare("INSERT INTO appointments(id,user_id,barber_id,date,time,service,duration,price,kind,status) VALUES('visit-001','client','owner','2026-10-20','10:00','corte',30,4000,'single','done')").run();
 assert.equal((await request('/api/care/feedback',{appointment:'visit-001',rating:2,comment:'Precisamos conversar.'},'other')).status,403);
 assert.equal((await request('/api/care/feedback',{appointment:'visit-001',rating:2,comment:'Precisamos conversar.'},'client')).status,201);
 assert.equal((await request('/api/care/feedback',{appointment:'visit-001',rating:5,comment:'Outra nota'},'client')).status,409);
 assert.equal((await request('/api/care',undefined,'other')).data.appointments.length,0);
 assert.equal((await request('/api/care')).data.attention,1);
 assert.equal((await request('/api/care/resolve',{appointment:'visit-001',note:'Entramos em contato para ouvir o cliente.'},'other')).status,403);
 assert.equal((await request('/api/care/resolve',{appointment:'visit-001',note:'Entramos em contato para ouvir o cliente.'})).status,200);
 assert.equal((await request('/api/care')).data.attention,0);
 assert.ok(!JSON.stringify((await request('/api/manage')).data.config).includes('Precisamos conversar.'));
});
test('future publication cannot starve another due job and global pause prevents background work',async()=>{
 await keys();put('studio_state',{revision:0,channels:{barbearia:{auto:true}},jobs:[{...pending(),id:'future',dueAt:Math.floor(Date.now()/1000)+90000},pending()]});let calls=0;globalThis.fetch=async(url)=>{calls++;return String(url).includes('media_publish')?Response.json({id:'ok'}):Response.json({status_code:'FINISHED'})};
 await studioTick(env,h,'https://test.example');assert.equal(calls,2);assert.equal((await studioState(env.DB)).jobs.find(x=>x.id==='job-1').status,'published');
 const result=await studioTick(env,{...h,conf:async()=>({automation:{paused:true}})},'https://test.example');assert.equal(result.paused,true);assert.equal(calls,2);
});

test('brand survives reload per company and commercial account links to its own visual settings',async()=>{
 await request('/api/saas/create',{name:'Barbearia Alice',slug:'alice',plan:'sistema',confirm:true},'alice');
 await request('/b/alice/api/brand',brand,'alice');
 const html=await request('/b/alice/',undefined,null);
 assert.equal(html.status,200);assert.ok(html.data.includes('Marca Teste'));assert.ok(html.data.includes('.side,.bottom-nav{background:#112233}'));
 assert.equal((await request('/api/me')).data.brand.name,'Barbearia do João');
 const js=(await request('/b/alice/app.js',undefined,'alice')).data;assert.doesNotThrow(()=>new Script(js));
 assert.ok(js.includes('Configurar identidade visual'));assert.ok(js.includes("'#brand"));
});

test('all permitted menu destinations remain reachable while bottom navigation stays compact',async()=>{
 const {MAINTENANCE_UI}=await import('../worker/maintenance-ui.js');
 const vm=await import('node:vm');const bottom={innerHTML:''};
 const context=vm.createContext({S:{user:{role:'manager'},page:'home'},I:()=>'',E:x=>x,document:{addEventListener(){},getElementById:()=>bottom}});
 vm.runInContext(MAINTENANCE_UI,context);
 const pages=['home','agenda','clients','billing','brand','software','studio','backups','catalog','clubpay','custom-future-page'];
 context.items=pages.map(x=>[x,'',x]);
 const html=vm.runInContext('renderNavigation(items)',context);
 for(const p of pages)assert.equal(html.split('data-go="'+p+'"').length-1,1,p);
 assert.match(html,/<details class="nav-group" open><summary>Marca e sistema/);
 assert.equal((bottom.innerHTML.match(/data-go=/g)||[]).length,4);assert.ok(!bottom.innerHTML.includes('brand'));
});

test('Work drafts save through owner MCP without OpenAI calls, retry idempotently and remain unpublished',async()=>{
 await request('/api/me');env.AI_API_DISABLED='true';env.OPENAI_API_KEY='local-test-only';let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('No provider calls allowed')};
 const args={batchKey:'night-2026-10-29',drafts:[{project:'barbearia',topic:'educativo',format:'post',title:'Cuidados com a barba',caption:'Uma rotina simples para cuidar da barba.',slides:[{title:'Cuide da sua barba',body:'Use o produto conforme a orientação do fabricante.'}]}]};
 const call=(argumentsValue,who='owner')=>request('/mcp',{jsonrpc:'2.0',id:10,method:'tools/call',params:{name:'save_work_content_drafts',arguments:argumentsValue}},who);
 assert.equal((await call(args,'client')).data.result.isError,true);
 let r=await call(args);assert.equal(r.data.result.isError,undefined);let out=JSON.parse(r.data.result.content[0].text);assert.equal(out.apiCalls,0);assert.equal(out.published,false);
 r=await call(args);out=JSON.parse(r.data.result.content[0].text);assert.equal(out.drafts[0].replayed,true);
 const jobs=(await studioState(env.DB)).jobs;assert.equal(jobs.length,1);assert.equal(jobs[0].status,'draft');assert.equal(jobs[0].authorized,false);assert.deepEqual(jobs[0].assets,[]);
 assert.equal((await call({...args,batchKey:'invalid',drafts:[{...args.drafts[0],format:'carousel'}]})).data.result.isError,true);
 assert.equal((await call({...args,extra:'ignore rules'})).data.result.isError,true);assert.equal(calls,0);
});

test('no-API mode blocks text and image generation, attendant and provider probe before network',async()=>{
 await request('/api/me');env.AI_API_DISABLED='true';env.OPENAI_API_KEY='local-test-only';let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('No provider calls allowed')};
 const {aiJSON}=await import('../worker/studio.js');await assert.rejects(()=>aiJSON(env,{openCredentials},'test',{}),e=>e.status===403);
 assert.equal((await request('/api/studio/generate',{project:'barbearia',topic:'educativo',format:'post',brief:'Cuidados'})).status,403);
 assert.equal((await request('/api/creator/generate',{topic:'educativo',format:'post',brief:'Cuidados'})).status,403);
 assert.equal((await request('/api/creator')).data.apiDisabled,true);assert.equal((await request('/api/studio')).data.ai.connected,false);
 const checked=await request('/mcp',{jsonrpc:'2.0',id:11,method:'tools/call',params:{name:'verify_ai_connection'}});assert.equal(JSON.parse(checked.data.result.content[0].text).disabled,true);
 const {appendStudioJob}=await import('../worker/studio.js');await appendStudioJob(env.DB,{id:'no-api-art',project:'barbearia',topic:'educativo',format:'post',slides:[{title:'T',body:'B'}],assets:[],status:'queued',authorized:true,createdAt:1,dueAt:1,lockUntil:0});
 const row=sql.prepare("SELECT value FROM config WHERE key='studio_state'").get();const state=JSON.parse(row.value);state.channels.barbearia={auto:true,generate:false};sql.prepare("UPDATE config SET value=? WHERE key='studio_state'").run(JSON.stringify(state));
 const result=await processJob(env,{openCredentials},'no-api-art','https://test.example');assert.equal(result.error,true);assert.equal(calls,0);
});

test('automation status distinguishes Instagram credentials from AI and never reveals tokens',async()=>{
 await request('/api/me');
 put('studio_credentials',await sealCredentials({barbearia:{verified:true,token:'private-instagram-token',account:'123456789',username:'clubedojoao_'}},env));
 const r=await request('/mcp',{jsonrpc:'2.0',id:13,method:'tools/call',params:{name:'automation_status'}});
 const status=JSON.parse(r.data.result.content[0].text);
 assert.equal(status.connections.aiConfigured,false);
 assert.equal(status.connections.projects.barbearia.instagramConfigured,true);
 assert.equal(status.connections.projects.barbearia.instagramVerified,true);
 assert.equal(status.connections.projects.eusou.instagramConfigured,false);
 assert.ok(!JSON.stringify(status).includes('private-instagram-token'));
 assert.ok(!JSON.stringify(status).includes('123456789'));
});

test('owner reuses only its existing Meta credential after profile and publishing access verification',async()=>{
 const token='existing-meta-token-for-this-workspace';
 put('whatsapp_credentials',await sealCredentials({WHATSAPP_ACCESS_TOKEN:token},env));
 let calls=0;globalThis.fetch=async(url,opts)=>{calls++;assert.equal(opts.headers.Authorization,'Bearer '+token);return Response.json(String(url).includes('content_publishing_limit')?{data:[{quota_usage:0}]}:{id:'17841441109996289',username:'clubedojoao_'})};
 const body={kind:'meta_existing',project:'barbearia',username:'clubedojoao_',account:'17841441109996289'};
 assert.equal((await request('/api/studio/connect',body,'client')).status,403);assert.equal(calls,0);
 assert.equal((await request('/api/studio/connect',body)).status,200);assert.equal(calls,2);
 const result=await request('/api/studio');assert.equal(result.data.connections.barbearia.connected,true);assert.equal(result.data.channels.barbearia.auto,false);assert.ok(!JSON.stringify(result.data).includes(token));
 const stored=await openCredentials(JSON.parse(sql.prepare("SELECT value FROM config WHERE key='studio_credentials'").get().value),env);assert.equal(stored.barbearia.token,token);assert.equal(stored.barbearia.login,'facebook');
});
test('reuse rejects unavailable publishing access or a different profile without saving credentials',async()=>{
 const body={kind:'meta_existing',project:'barbearia',username:'clubedojoao_',account:'17841441109996289'};
 assert.equal((await request('/api/studio/connect',body)).status,409);
 put('whatsapp_credentials',await sealCredentials({WHATSAPP_ACCESS_TOKEN:'existing-meta-token-for-this-workspace'},env));
 globalThis.fetch=async()=>Response.json({error:{code:10}},{status:403});assert.equal((await request('/api/studio/connect',body)).status,502);
 assert.equal(sql.prepare("SELECT value FROM config WHERE key='studio_credentials'").get(),undefined);
 globalThis.fetch=async url=>Response.json(String(url).includes('content_publishing_limit')?{data:[]}:{id:body.account,username:'different_profile'});
 assert.equal((await request('/api/studio/connect',body)).status,409);assert.equal(sql.prepare("SELECT value FROM config WHERE key='studio_credentials'").get(),undefined);
});

test('personal Instagram is bound to the authenticated professional and hidden from all config views',async()=>{
 await request('/api/me');const token='existing-meta-token-for-personal-connection';
 put('whatsapp_credentials',await sealCredentials({WHATSAPP_ACCESS_TOKEN:token},env));put('creator_drafts_someone-else',{profile:{instagram:'someone_else'},jobs:[{caption:'private-draft'}]});
 globalThis.fetch=async(url,opts)=>{assert.equal(opts.headers.Authorization,'Bearer '+token);return Response.json(String(url).includes('content_publishing_limit')?{data:[]}:{id:'17841111111111111',username:'my_profile'})};
 const body={username:'my_profile',account:'17841111111111111',userId:'someone-else'};
 assert.equal((await request('/api/creator/instagram',body,'client')).status,403);
 assert.equal((await request('/api/creator/instagram',body)).status,200);
 const own=(await request('/api/creator')).data;assert.equal(own.instagram.connected,true);assert.equal(own.profile.instagram,'my_profile');assert.ok(!JSON.stringify(own).includes(token));
 const stored=await openCredentials(JSON.parse(sql.prepare("SELECT value FROM config WHERE key='studio_credentials'").get().value),env);assert.equal(stored.professionals.owner.username,'my_profile');assert.equal(stored.professionals['someone-else'],undefined);assert.equal(stored.barbearia,undefined);
 const management=JSON.stringify((await request('/api/manage')).data);assert.ok(!management.includes('private-draft'));assert.ok(!management.includes(token));
});

test('central studio keeps three connections separate and links personal account to its authenticated owner',async()=>{
 await request('/api/creator/profile',{name:'Joao Profissional',instagram:'meu_perfil'});await keys();
 globalThis.fetch=async()=>Response.json({id:'17840000000000001',username:'meu_perfil'});
 assert.equal((await request('/api/studio/connect',{kind:'instagram',project:'pessoal',account:'17840000000000001',username:'meu_perfil',token:'personal-token-only-for-tests',login:'facebook'})).status,200);
 const studio=(await request('/api/studio')).data;assert.deepEqual(Object.keys(studio.connections),['barbearia','eusou','pessoal']);assert.equal(studio.connections.barbearia.connected,true);assert.equal(studio.connections.eusou.connected,false);assert.equal(studio.connections.pessoal.username,'meu_perfil');assert.equal(studio.channels.pessoal.auto,false);
 const creator=(await request('/api/creator')).data;assert.equal(creator.instagram.username,'meu_perfil');assert.ok(!JSON.stringify(studio).includes('personal-token-only-for-tests'));
 const creds=await openCredentials(JSON.parse(sql.prepare("SELECT value FROM config WHERE key='studio_credentials'").get().value),env);assert.equal(creds.pessoal.name,'Joao Profissional');assert.equal(creds.pessoal.ownerId,'owner');assert.equal(creds.professionals.owner.username,'meu_perfil');assert.equal(creds.barbearia.account,'123456789');
});
test('personal content uses personal identity and stays outside official project queues',async()=>{
 await keys();const creds=await openCredentials(JSON.parse(sql.prepare("SELECT value FROM config WHERE key='studio_credentials'").get().value),env);creds.pessoal={name:'Joao Educador',username:'meu_perfil',account:'17840000000000001',token:'personal-token-only-for-tests',verified:true,login:'facebook'};put('studio_credentials',await sealCredentials(creds,env));
 globalThis.fetch=async(url,opts)=>{assert.match(String(url),/openai.com/);const payload=JSON.parse(opts.body),input=JSON.parse(payload.input);assert.equal(input.project,'pessoal');assert.equal(input.brand.name,'Joao Educador');return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({title:'Minha rotina',caption:'Bastidores reais',slides:[{title:'Aprendizado',body:'Minha experiencia profissional.'}]})}]}]})};
 const r=await request('/api/studio/generate',{project:'pessoal',topic:'bastidores',format:'post',brief:'Minha rotina profissional'});assert.equal(r.status,201);
 const state=(await request('/api/studio')).data;assert.equal(state.jobs.filter(j=>j.project==='pessoal').length,1);assert.equal(state.jobs.filter(j=>j.project==='barbearia'||j.project==='eusou').length,0);
 assert.equal((await request('/api/studio',undefined,'client')).status,403);
});

test('Instagram Login validates professional user_id rather than app-scoped id',async()=>{
 const body={kind:'instagram',project:'eusou',login:'instagram',account:'17841423491665700',username:'_eusoucomunidade',token:'test-instagram-login-credential'};
 globalThis.fetch=async url=>String(url).includes('content_publishing_limit')?Response.json({data:[{quota_usage:0}]}):Response.json({id:'99999999999999999',user_id:body.account,username:body.username});
 assert.equal((await request('/api/studio/connect',body)).status,200);
 assert.equal((await request('/api/studio/verify-instagram',{project:'eusou'})).data.verified,true);
 globalThis.fetch=async()=>Response.json({id:body.account,user_id:'17841400000000000',username:body.username});
 assert.equal((await request('/api/studio/connect',body)).status,409);
 globalThis.fetch=async()=>Response.json({id:'99999999999999999',user_id:body.account,username:'another_profile'});
 assert.equal((await request('/api/studio/connect',body)).status,409);
});

test('social calendar requires the owner and consent, keeps three accounts, and shares an explicit AI quota',async()=>{
 await keys();const k=await (await import('../worker/studio.js')).studioCredentials(env,h);k.eusou={...k.barbearia,account:'222222222'};k.pessoal={...k.barbearia,account:'333333333'};put('studio_credentials',await sealCredentials(k,env));
 const plan={consent:true,startDate:'2026-11-07',eusouFeedStart:'2026-12-01',dailyLimit:60,promotions:true};
 assert.equal((await request('/api/studio/social-plan',plan,'client')).status,403);assert.equal((await request('/api/studio/social-plan',{...plan,consent:false})).status,400);assert.equal((await request('/api/studio/social-plan',plan)).status,200);
 const state=(await request('/api/studio')).data;assert.equal(state.socialPlan.storyHours.length,5);assert.deepEqual(state.socialPlan.feedDays,[1,3,5]);assert.equal(state.socialPlan.feedFormats[5],'reel');assert.equal(state.ai.dailyLimit,60);assert.equal(state.channels.eusou.auto,true);assert.equal(state.channels.eusou.generate,false);assert.ok(!JSON.stringify(state).includes('instagram-secret'));
});
test('daily stories reserve once, spread times and keep EU SOU legacy feed until its end date',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-09T08:00:00Z')});await keys();const k=await(await import('../worker/studio.js')).studioCredentials(env,h);for(const p of ['eusou','pessoal'])k[p]={...k.barbearia};k.dailyLimit=60;put('studio_credentials',await sealCredentials(k,env));
 await request('/api/studio/social-plan',{consent:true,startDate:'2026-11-07',eusouFeedStart:'2026-12-01',dailyLimit:60,promotions:true});let calls=0;
 globalThis.fetch=async(url,opts)=>{calls++;const p=JSON.parse(opts.body),story=p.text.format.schema.properties.stories;return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(story?{stories:Array.from({length:5},(_,i)=>({title:'Dica '+i,body:'Cuidados simples.'}))}:{title:'Cuidados',caption:'Uma dica.',slides:[{title:'Cuidar',body:'Cuidados.'}]})}]}]})};
 const tick=await studioTick(env,h,'https://test.example');assert.equal(tick.planned,true);const jobs=(await studioState(env.DB)).jobs;assert.equal(jobs.filter(j=>j.format.startsWith('story')).length,15);assert.equal(jobs.filter(j=>j.format==='story_video').length,3);assert.equal(jobs.filter(j=>j.project==='eusou'&&j.format==='post').length,0);assert.equal(jobs.filter(j=>j.format==='post').length,2);assert.ok(jobs.every(j=>j.authorized));const dates=jobs.filter(j=>j.project==='barbearia'&&j.format.startsWith('story')).map(j=>j.dueAt);assert.equal(new Set(dates).size,5);
 const {socialPlanTick}=await import('../worker/social-plan.js');await socialPlanTick(env,h);assert.equal((await studioState(env.DB)).jobs.length,jobs.length);assert.equal(calls,5);
});
test('story expiry stops paid generation; actual stories use STORIES without a feed caption',async()=>{
 await keys();put('studio_state',{revision:0,channels:{barbearia:{auto:true}},jobs:[{...pending(),format:'story',container:null,assets:[],expiresAt:1}]});let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No generation for expired stories')};assert.equal((await processJob(env,h,'job-1','https://test.example')).expired,true);assert.equal(calls,0);
 put('studio_state',{revision:0,channels:{barbearia:{auto:true}},jobs:[{...pending(),format:'story',container:null}]});let payload;globalThis.fetch=async(url,opts)=>{payload=new URLSearchParams(opts.body);return Response.json({id:'story-container'})};await processJob(env,h,'job-1','https://test.example');assert.equal(payload.get('media_type'),'STORIES');assert.ok(payload.get('image_url'));assert.equal(payload.has('caption'),false);
});
test('render capabilities expire, cannot upload into other jobs, and accept a single authorized MP4',async()=>{
 await keys();const {prepareSocialRenders,socialRenderRoute}=await import('../worker/social-plan.js');let stored=0;env.BUCKET={put:async()=>{stored++}};put('studio_state',{revision:0,channels:{barbearia:{auto:true}},jobs:[{...pending(),format:'reel',container:null}]});
 const tasks=await prepareSocialRenders(env,'https://test.example');assert.equal(tasks.length,1);assert.equal((await prepareSocialRenders(env,'https://test.example')).length,0);
 const bytes=new Uint8Array(40);bytes.set(new TextEncoder().encode('ftyp'),4);const req=url=>new Request(url,{method:'POST',headers:{'Content-Type':'video/mp4','Content-Length':String(bytes.length)},body:bytes});
 await assert.rejects(()=>socialRenderRoute(req(tasks[0].uploadURL+'&bad=1'),env,new URL(tasks[0].uploadURL.replace(/token=[^&]+/,'token=wrong'))),e=>e.status===401);
 const r=await socialRenderRoute(req(tasks[0].uploadURL),env,new URL(tasks[0].uploadURL));assert.equal((await r.json()).ok,true);assert.equal(stored,1);assert.equal((await studioState(env.DB)).jobs[0].assets[0].video,true);await socialRenderRoute(req(tasks[0].uploadURL),env,new URL(tasks[0].uploadURL));assert.equal(stored,1);
});
