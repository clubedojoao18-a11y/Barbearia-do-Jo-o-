import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../worker/index.js';
let db,env,mails,phones,realFetch,denyPhone;
function adapter(sqlite){return {prepare(q){let args=[];return {bind(...v){args=v;return this},async first(){return sqlite.prepare(q).get(...args)||null},async all(){return {results:sqlite.prepare(q).all(...args)}},async run(){return sqlite.prepare(q).run(...args)},_run(){return sqlite.prepare(q).run(...args)}}},async batch(s){sqlite.exec('BEGIN');try{const r=s.map(x=>x._run());sqlite.exec('COMMIT');return r}catch(e){sqlite.exec('ROLLBACK');throw e}}}}
beforeEach(()=>{db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');for(const file of ['0000_clube','0001_permissions','0002_whatsapp','0003_operations'])db.exec(readFileSync(new URL('../drizzle/'+file+'.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));env={DB:adapter(db),CONNECTION_MASTER_KEY:btoa('a'.repeat(32)),RESEND_API_KEY:'local-email-test-key',AUTH_EMAIL_FROM:'atendimento@example.com',WHATSAPP_ACCESS_TOKEN:'local-phone-test-key',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_APP_SECRET:'local-secret',WHATSAPP_VERIFY_TOKEN:'local-verify',WHATSAPP_BUSINESS_ACCOUNT_ID:'456'};mails=[];phones=[];denyPhone=false;db.prepare('INSERT INTO config(key,value) VALUES(?,?)').run('auth:templates',JSON.stringify({joao_acesso_verificacao:{approved:true},joao_senha_provisoria:{approved:true}}));realFetch=globalThis.fetch;globalThis.fetch=async(url,options)=>{if(String(url)==='https://api.resend.com/emails'){mails.push(JSON.parse(options.body));return Response.json({id:'mail-'+mails.length})}if(String(url).includes('/123/messages')){if(denyPhone)return Response.json({error:{code:123}}, {status:400});phones.push(JSON.parse(options.body));return Response.json({messages:[{id:'phone-'+phones.length}]})}throw Error('Unexpected external request: '+url)}});
afterEach(()=>{globalThis.fetch=realFetch;db.close()});
async function req(path,data,options={}){const headers={Origin:'https://test.example'};if(data!==undefined)headers['Content-Type']='application/json';if(options.owner){headers['oai-authenticated-user-id']='owner';headers['oai-authenticated-user-email']='clubedojoao18@gmail.com'}if(options.cookie)headers.Cookie=options.cookie;const r=await worker.fetch(new Request('https://test.example'+path,{method:data===undefined?'GET':'POST',headers,body:data===undefined?undefined:JSON.stringify(data)}),env);return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
const accountData={name:'Cliente Validado',email:'cliente@example.com',phone:'24988887777',consent:true};
async function register(){const r=await req('/api/auth/register',accountData);assert.equal(r.status,201,JSON.stringify(r.data));return r.data}
const phoneCode=()=>phones.at(-1).template.components[0].parameters[0].text;
async function verify(r){const link=mails.at(-1).text.match(/https:\/\/[^\s]+/)[0],parts=new URL(link).hash.slice('#verify-email='.length).split('.');assert.equal((await req('/api/auth/verify-email',{id:parts[0],token:parts[1]})).status,200);assert.equal((await req('/api/auth/verify-phone',{id:r.id,secret:r.secret,code:phoneCode()})).status,200)}
async function activate(){const r=await register();await verify(r);const completed=await req('/api/auth/complete',{id:r.id,secret:r.secret});assert.equal(completed.status,200,JSON.stringify(completed.data));return {r,password:phoneCode()}}
test('dual contact verification is mandatory; generated password never appears in API, settings or plaintext storage',async()=>{
 const r=await register(),code=phoneCode();assert.equal((await req('/api/auth/complete',{id:r.id,secret:r.secret})).status,409);
 assert.equal((await req('/api/auth/verify-phone',{id:r.id,secret:'x',code})).status,400);
 await verify(r);const done=await req('/api/auth/complete',{id:r.id,secret:r.secret});assert.equal(done.status,200);assert.equal(done.data.temporaryPasswordExpires,false);assert.equal(done.data.password,undefined);
 const password=phoneCode();assert.ok(password.length>=12&&password.length<=15);const all=JSON.stringify(db.prepare('SELECT * FROM config').all());assert.ok(!all.includes(password));assert.ok(!all.includes(r.secret));
 const login=await req('/api/auth/login',{email:accountData.email,password});assert.equal(login.status,200);assert.ok(login.cookie.startsWith('__Secure-joao-client-root='));assert.equal(login.data.temporary,true);
 const me=await req('/api/me',undefined,{cookie:login.cookie});assert.equal(me.data.user._customerPassword,true);assert.equal(me.data.user.role,'client');
 const manage=await req('/api/manage',undefined,{owner:true});assert.ok(!Object.keys(manage.data.config).some(x=>x.startsWith('auth:')));
});
test('temporary password remains valid until changed; password change revokes other sessions and logout revokes its own',async()=>{
 const {password}=await activate(),a=await req('/api/auth/login',{email:accountData.email,password}),b=await req('/api/auth/login',{email:accountData.email,password});
 const changed=await req('/api/auth/change-password',{currentPassword:password,password:'Minha nova senha longa 2026'},{cookie:a.cookie});assert.equal(changed.status,200);assert.equal(changed.data.temporary,false);
 assert.equal((await req('/api/me',undefined,{cookie:b.cookie})).status,401);assert.equal((await req('/api/auth/login',{email:accountData.email,password})).status,401);
 assert.equal((await req('/api/me',undefined,{cookie:changed.cookie})).status,200);assert.equal((await req('/api/auth/logout',{}, {cookie:changed.cookie})).status,200);assert.equal((await req('/api/me',undefined,{cookie:changed.cookie})).status,401);
});
test('email reset is single-use, time-bound and revokes existing sessions',async()=>{
 const {password}=await activate(),login=await req('/api/auth/login',{email:accountData.email,password});
 const unknown=await req('/api/auth/forgot',{email:'unknown@example.com'}),known=await req('/api/auth/forgot',{email:accountData.email});assert.deepEqual(unknown.data,known.data);
 const token=new URL(mails.at(-1).text.match(/https:\/\/[^\s]+/)[0]).hash.slice('#reset='.length),body={token,password:'Senha recuperada com sucesso'};
 assert.equal((await req('/api/auth/reset',body)).status,200);assert.equal((await req('/api/auth/reset',body)).status,400);assert.equal((await req('/api/me',undefined,{cookie:login.cookie})).status,401);
 assert.equal((await req('/api/auth/login',{email:accountData.email,password:body.password})).status,200);
});
test('wrong phone codes lock the challenge after five attempts and expired email links do not activate accounts',async()=>{
 const r=await register();for(let i=0;i<5;i++)assert.equal((await req('/api/auth/verify-phone',{id:r.id,secret:r.secret,code:'xxxxxx'})).status,400);
 assert.equal((await req('/api/auth/verify-phone',{id:r.id,secret:r.secret,code:phoneCode()})).status,400);
 const row=db.prepare('SELECT value FROM config WHERE key=?').get('auth:pending:'+r.id),value=JSON.parse(row.value);value.expires=1;db.prepare('UPDATE config SET value=? WHERE key=?').run(JSON.stringify(value),'auth:pending:'+r.id);
 assert.equal((await req('/api/auth/verify-email',{id:r.id,token:'a'.repeat(64)})).status,400);assert.equal(db.prepare("SELECT COUNT(*) n FROM config WHERE key GLOB 'auth:account:*'").get().n,0);
});
test('client registration cannot acquire a staff record and invalid cookies cannot inherit a ChatGPT management session',async()=>{
 await req('/api/me',undefined,{owner:true});assert.equal((await req('/api/auth/register',{...accountData,email:'clubedojoao18@gmail.com'})).status,400);
 assert.equal((await req('/api/me',undefined,{owner:true,cookie:'__Secure-joao-client-root='+'f'.repeat(64)})).status,401);
 const {password}=await activate(),login=await req('/api/auth/login',{email:accountData.email,password});assert.equal((await req('/api/auth/admin',undefined,{cookie:login.cookie})).status,403);
 assert.equal((await req('/api/auth/change-password',{currentPassword:'wrong',password:'Senha nova bem longa'},{cookie:login.cookie})).status,401);
});
test('incomplete email setup blocks registration truthfully and does not create a user or claim delivery',async()=>{
 delete env.RESEND_API_KEY;const r=await req('/api/auth/register',accountData);assert.equal(r.status,503);assert.equal(mails.length,0);assert.equal(phones.length,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n,0);
});
test('temporary password sending failure can resume with the same protected password without duplicate accounts',async()=>{
 const r=await register();await verify(r);denyPhone=true;const first=await req('/api/auth/complete',{id:r.id,secret:r.secret});assert.equal(first.status,502);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n,1);denyPhone=false;assert.equal((await req('/api/auth/complete',{id:r.id,secret:r.secret})).status,200);const password=phoneCode();assert.equal((await req('/api/auth/complete',{id:r.id,secret:r.secret})).status,200);assert.equal(phones.length,2);assert.equal((await req('/api/auth/login',{email:accountData.email,password})).status,200);
});
test('existing manually registered customer reuses reservations only after proving both matching contacts',async()=>{
 await req('/api/me',undefined,{owner:true});const manual=await req('/api/clients',accountData,{owner:true});assert.equal(manual.status,201);
 const {password}=await activate(),login=await req('/api/auth/login',{email:accountData.email,password}),me=await req('/api/me',undefined,{cookie:login.cookie});assert.equal(me.data.user.id,manual.data.client.id);assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n,2);
});
test('temporary password has no calendar expiry and email recovery stays generic on provider failure',async()=>{
 const {password}=await activate(),realNow=Date.now;try{Date.now=()=>realNow()+365*86400000;assert.equal((await req('/api/auth/login',{email:accountData.email,password})).status,200)}finally{Date.now=realNow}
 const successfulFetch=globalThis.fetch;globalThis.fetch=async(url,options)=>String(url).includes('api.resend.com')?Response.json({message:'rejected'},{status:403}):successfulFetch(url,options);
 const known=await req('/api/auth/forgot',{email:accountData.email}),unknown=await req('/api/auth/forgot',{email:'nobody@example.com'});assert.equal(known.status,200);assert.deepEqual(known.data,unknown.data);
});
test('invalid contact input returns a validation error without creating a registration',async()=>{
 assert.equal((await req('/api/auth/register',{...accountData,phone:'invalid'})).status,400);
 assert.equal((await req('/api/auth/register',{...accountData,email:'invalid'})).status,400);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM config WHERE key GLOB 'auth:pending:*'").get().n,0);
});
test('password hashing has a secure memory-bounded fallback when the runtime caps WebCrypto iterations',async()=>{
 const {passwordHash,passwordMatches}=await import('../worker/customer-auth.js'),derive=crypto.subtle.deriveBits;
 crypto.subtle.deriveBits=async()=>{throw Object.assign(new Error('PBKDF2 iterations are capped'),{name:'NotSupportedError'})};
 try{const value=await passwordHash('Uma senha suficientemente longa');assert.equal(value.algorithm,'scrypt');assert.equal(value.p,5);assert.equal(await passwordMatches('Uma senha suficientemente longa',value),true);assert.equal(await passwordMatches('Outra senha suficientemente longa',value),false)}finally{crypto.subtle.deriveBits=derive}
});

test('a team client without email activates the same record after verifying both contacts',async()=>{
 const manual=await req('/api/clients',{name:accountData.name,phone:accountData.phone},{owner:true});assert.equal(manual.status,201);
 const r=await register();await verify(r);assert.equal((await req('/api/auth/complete',r)).status,200);
 const user=db.prepare('SELECT id,email FROM users WHERE id=?').get(manual.data.client.id);assert.equal(user.email,accountData.email);assert.equal(db.prepare("SELECT COUNT(*) n FROM users WHERE role='client'").get().n,1);
 assert.equal(JSON.parse(db.prepare('SELECT value FROM config WHERE key=?').get('auth:email:'+await (await import('../worker/customer-auth.js')).authHash(accountData.email)).value).userId,user.id);
});

test('consented invitation sends only its own outbox record and never repeats an accepted send',async()=>{
 db.prepare('INSERT INTO config(key,value) VALUES(?,?)').run('whatsapp',JSON.stringify({enabled:true,templates:{client_invite:'joao_convite_acesso'}}));
 const created=await req('/api/clients',{name:accountData.name,email:accountData.email,phone:accountData.phone,inviteConsent:true},{owner:true});assert.equal(created.status,201,JSON.stringify(created.data));assert.equal(created.data.invitation.status,'sent');assert.equal(phones.length,1);assert.equal(phones[0].template.name,'joao_convite_acesso');assert.ok(phones[0].template.components[0].parameters[0].text.includes('https://test.example/acesso#register'));
 const again=await req('/api/clients/invite',{id:created.data.client.id,consent:true},{owner:true});assert.equal(again.data.invitation.status,'sent');assert.equal(phones.length,1);
});
