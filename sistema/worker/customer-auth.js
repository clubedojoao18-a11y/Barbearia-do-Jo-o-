import {normalizeCustomerPhone} from './manual-clients.js';
const enc=new TextEncoder(),now=()=>Math.floor(Date.now()/1000);
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const one=(db,q,...p)=>db.prepare(q).bind(...p).first();
const get=async(db,key)=>{const r=await one(db,'SELECT value FROM config WHERE key=?',key);return r?{raw:r.value,data:JSON.parse(r.value)}:null};
const stmt=(db,key,value)=>db.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(value));
const insert=(db,key,value)=>db.prepare('INSERT INTO config(key,value) VALUES(?,?)').bind(key,JSON.stringify(value));
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const unhex=s=>Uint8Array.from(s.match(/../g)||[],x=>parseInt(x,16));
const random=(n=32)=>hex(crypto.getRandomValues(new Uint8Array(n)));
export const authHash=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const equal=(a,b)=>{let d=a.length^b.length;for(let n=0;n<a.length;n++)d|=a.charCodeAt(n)^(b.charCodeAt(n)||0);return d===0};
const phoneOf=value=>{try{return normalizeCustomerPhone(value)}catch(e){throw fail(e.message)}};
const emailOf=value=>{const v=typeof value==='string'?value.trim().toLowerCase():'';if(v.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw fail('Informe um e-mail válido.');return v};
export async function passwordHash(password,salt=random(16),algorithm='PBKDF2-SHA256'){
 if(typeof password!=='string'||password.length<12||password.length>128)throw fail('Use uma senha de 12 a 128 caracteres.');
 if(algorithm==='scrypt'){
  // OWASP's N=2^14,r=8,p=5 profile stays within the Worker's memory limit.
  const {scrypt}=await import('node:crypto');const result=await new Promise((resolve,reject)=>scrypt(password,unhex(salt),32,{N:16384,r:8,p:5,maxmem:32*1024*1024},(error,key)=>error?reject(error):resolve(key)));
  return {algorithm:'scrypt',N:16384,r:8,p:5,salt,hash:hex(result)};
 }
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 try{return {algorithm:'PBKDF2-SHA256',iterations:600000,salt,hash:hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(salt),iterations:600000,hash:'SHA-256'},key,256))}}
 catch(e){if(e.name==='NotSupportedError'||/iterations|PBKDF2.*not supported/i.test(e.message))return passwordHash(password,salt,'scrypt');throw e}
}
export async function passwordMatches(password,record){if(!record||!['PBKDF2-SHA256','scrypt'].includes(record.algorithm)||typeof password!=='string'||password.length<12||password.length>128)return false;return equal((await passwordHash(password,record.salt,record.algorithm)).hash,record.hash)}
async function otpHash(env,id,code){if(!env.CONNECTION_MASTER_KEY)throw fail('Proteção do acesso indisponível.',503);const key=await crypto.subtle.importKey('raw',enc.encode(env.CONNECTION_MASTER_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,enc.encode(id+':'+code)))}
const cookieName=db=>'__Secure-joao-client-'+(db.companyId||'root');
const cookie=(db,url,value,maxAge)=>cookieName(db)+'='+value+'; Path='+(url.basePath||'')+'/; HttpOnly; Secure; SameSite=Lax; Max-Age='+maxAge;
async function sessionResponse(db,url,user,account,h){
 const token=random(),expires=now()+7*86400;await stmt(db,'auth:session:'+await authHash(token),{userId:user.id,version:account.version,expires}).run();
 const r=h.json({ok:true,temporary:!!account.temporary});r.headers.set('Set-Cookie',cookie(db,url,token,7*86400));return r;
}
export async function customerSession(req,db){
 const match=String(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName(db)+'='));if(!match)return null;
 const token=match.slice(cookieName(db).length+1);if(!/^[a-f0-9]{64}$/.test(token))return null;
 const r=await get(db,'auth:session:'+await authHash(token));if(!r||r.data.expires<=now())return null;
 const account=await get(db,'auth:account:'+r.data.userId);if(!account||account.data.version!==r.data.version)return null;
 const user=await one(db,"SELECT * FROM users WHERE id=? AND role='client' AND disabled=0",r.data.userId);return user?{...user,_customerPassword:true,_temporaryPassword:!!account.data.temporary}:null;
}
async function rate(db,key,ceiling,seconds){
 const bucket=Math.floor(now()/seconds),id='auth:'+key+':'+bucket;
 await db.prepare('INSERT INTO security_limits(id,hits,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1').bind(id,(bucket+1)*seconds).run();
 if((await one(db,'SELECT hits FROM security_limits WHERE id=?',id)).hits>ceiling)throw fail('Muitas tentativas. Aguarde antes de tentar novamente.',429);
}
async function providerConfig(env,h){const record=await get(env.DB,'auth:provider');const x=record?await h.openCredentials(record.data,env):{};return {...x,...(env.RESEND_API_KEY?{provider:'resend',apiKey:env.RESEND_API_KEY,from:env.AUTH_EMAIL_FROM}:{}),...(env.BREVO_API_KEY?{provider:'brevo',apiKey:env.BREVO_API_KEY,from:env.AUTH_EMAIL_FROM}:{})}}
async function mail(env,h,email,subject,text,key){
 const c=await providerConfig(env,h);if(!c.apiKey||!c.from)throw fail('O envio de e-mail ainda precisa ser configurado pela barbearia.',503);
 const brevo=c.provider==='brevo';let r;try{r=await fetch(brevo?'https://api.brevo.com/v3/smtp/email':'https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json',...(brevo?{'api-key':c.apiKey}:{Authorization:'Bearer '+c.apiKey,'Idempotency-Key':key})},body:JSON.stringify(brevo?{sender:{email:c.from,name:'Barbearia do João'},to:[{email}],subject,textContent:text,htmlContent:'<pre>'+text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')+'</pre>'}:{from:c.from,to:[email],subject,text}),signal:AbortSignal.timeout(12000)})}catch{throw fail('Não foi possível confirmar o envio do e-mail. Tente novamente mais tarde.',502)}
 if(!r.ok)throw fail('O serviço não aceitou o envio do e-mail. A barbearia precisa revisar a conexão.',502);const d=await r.json();if(!d.id&&!d.messageId)throw fail('O serviço de e-mail não confirmou o envio.',502);
}
let dummyPassword;async function dummy(){dummyPassword??=passwordHash('Dummy inaccessible password material');return dummyPassword}
const OTP_TEMPLATE='joao_acesso_verificacao',PASSWORD_TEMPLATE='joao_senha_provisoria';
async function phoneSend(env,h,phone,code,temporary=false){const w=await h.whatsappEnv(env);if(!h.waReady(w))throw fail('O envio da verificação no WhatsApp ainda não está disponível.',503);const result=await h.waGraph(w,w.WHATSAPP_PHONE_NUMBER_ID+'/messages',{messaging_product:'whatsapp',to:phone,type:'template',template:{name:temporary?PASSWORD_TEMPLATE:OTP_TEMPLATE,language:{code:'pt_BR'},components:[{type:'body',parameters:[{type:'text',text:code}]},{type:'button',sub_type:'url',index:'0',parameters:[{type:'text',text:code}]}]}});if(!result.messages?.[0]?.id)throw fail('O WhatsApp não confirmou o envio.',502);return result.messages[0].id}
async function pending(db,b,needSecret=true){if(typeof b.id!=='string'||!/^[a-f0-9]{32}$/.test(b.id))throw fail('Verificação inválida ou vencida.');const r=await get(db,'auth:pending:'+b.id);if(!r||r.data.expires<=now())throw fail('Verificação inválida ou vencida.');if(needSecret&&(!/^[a-f0-9]{64}$/.test(b.secret||'')||!equal(await authHash(b.secret),r.data.secretHash)))throw fail('Verificação inválida ou vencida.');return r}
async function updatePending(db,id,raw,data){const changed=await db.prepare('UPDATE config SET value=? WHERE key=? AND value=?').bind(JSON.stringify(data),'auth:pending:'+id,raw).run();if(!(changed.meta?.changes||changed.changes))throw fail('A verificação mudou. Atualize e tente novamente.',409)}
async function inspectTemplates(env,h,create=false){
 const w=await h.whatsappEnv(env);if(!h.waReady(w)||!w.WHATSAPP_BUSINESS_ACCOUNT_ID)throw fail('Conecte a conta empresarial do WhatsApp.',503);
 const result={};for(const name of [OTP_TEMPLATE,PASSWORD_TEMPLATE]){
  const found=await h.waGraph(w,w.WHATSAPP_BUSINESS_ACCOUNT_ID+'/message_templates?name='+name+'&fields=name,status,category,language,components&limit=20');let t=found.data?.find(x=>x.name===name&&x.language==='pt_BR');
  if(!t&&create){await h.waGraph(w,w.WHATSAPP_BUSINESS_ACCOUNT_ID+'/message_templates',{name,language:'pt_BR',category:'AUTHENTICATION',components:[{type:'BODY',add_security_recommendation:true},...(name===OTP_TEMPLATE?[{type:'FOOTER',code_expiration_minutes:10}]:[]),{type:'BUTTONS',buttons:[{type:'OTP',otp_type:'COPY_CODE',text:'Copiar código'}]}]});t={status:'PENDING'}}
  result[name]={status:t?.status||'MISSING',approved:t?.status==='APPROVED'&&t?.category==='AUTHENTICATION'};
 }
 await stmt(env.DB,'auth:templates',{...result,checkedAt:now()}).run();return result;
}
async function templates(env,h,create=false){try{const result=await inspectTemplates(env,h,create);await env.DB.prepare('DELETE FROM config WHERE key=?').bind('auth:template-error').run();return result}catch(e){const message=[e.message,e.providerCode?'Código Meta '+e.providerCode:'',e.providerSubcode?'Detalhe '+e.providerSubcode:'',e.providerUserMessage||''].filter(Boolean).join(' · ');await stmt(env.DB,'auth:template-error',{message,at:now()}).run();throw fail(message,e.status||502)}}
export async function customerAuthAdmin(req,env,url,u,h){
 if(!url.pathname.startsWith('/api/auth/admin'))return null;h.requireOwner(u);const p=url.pathname;
 if(p==='/api/auth/admin'&&req.method==='GET'){const c=await providerConfig(env,h),t=await get(env.DB,'auth:templates');return h.json({email:{configured:!!(c.apiKey&&c.from),provider:c.provider||null,from:c.from||null},templates:t?.data||{},inviteTemplate:(await get(env.DB,'auth:invite-template'))?.data||null,templateError:(await get(env.DB,'auth:template-error'))?.data||null,protection:(await get(env.DB,'auth:protection'))?.data||null,temporaryPasswordExpires:false,emailHealth:(await get(env.DB,'auth:email-health'))?.data||null})}
 if(req.method!=='POST')throw fail('Método indisponível.',405);
 const b=await h.body(req);
 if(p==='/api/auth/admin/configure'){
  if(!['resend','brevo'].includes(b.provider)||typeof b.apiKey!=='string'||b.apiKey.length<16||b.apiKey.length>500||/[\r\n]/.test(b.apiKey))throw fail('Confira o provedor e a credencial de envio.');const from=emailOf(b.from);
  // The first connection is verified by sending only to the authenticated owner.
  const sealed=await h.sealCredentials({provider:b.provider,apiKey:b.apiKey,from},env);await stmt(env.DB,'auth:provider',sealed).run();return h.json({ok:true});
 }
 if(p==='/api/auth/admin/invite-template'){
  const w=await h.whatsappEnv(env);if(!h.waReady(w)||!w.WHATSAPP_BUSINESS_ACCOUNT_ID)throw fail('Conecte a conta empresarial do WhatsApp.',503);
  const name='joao_convite_acesso',found=await h.waGraph(w,w.WHATSAPP_BUSINESS_ACCOUNT_ID+'/message_templates?name='+name+'&fields=name,status,category,language,components&limit=20');let template=found.data?.find(t=>t.name===name&&t.language==='pt_BR');
  if(!template&&b.create===true){await h.waGraph(w,w.WHATSAPP_BUSINESS_ACCOUNT_ID+'/message_templates',{name,language:'pt_BR',category:'UTILITY',components:[{type:'BODY',text:'Seu cadastro foi realizado. Confira as instruções para ativar seu acesso ao aplicativo: {{1}}',example:{body_text:[['Acesse https://example.com/acesso para confirmar seus contatos.']]}}]});template={status:'PENDING'}}
  const body=template?.components?.find(x=>x.type==='BODY'),approved=template?.status==='APPROVED'&&['UTILITY','MARKETING'].includes(template?.category)&&body?.text?.includes('{{1}}')&&!body?.text?.includes('{{2}}');
  if(approved){const record=await get(env.DB,'whatsapp'),config=record?.data||{};await stmt(env.DB,'whatsapp',{...config,templates:{...config.templates,client_invite:name}}).run();await env.DB.prepare("UPDATE wa_outbox SET status='pending',error_code=NULL WHERE kind='client_invite' AND status='blocked' AND error_code='TEMPLATE_REQUIRED'").run()}
  const result={status:template?.status||'MISSING',approved};await stmt(env.DB,'auth:invite-template',result).run();return h.json(result);
 }
 if(p==='/api/auth/admin/templates')return h.json({templates:await templates(env,h,b.create===true)});
 if(p==='/api/auth/admin/test'){
  if(b.channel==='email'){await mail(env,h,u.email,'Teste de acesso de clientes','A conexão de e-mail para cadastro e recuperação de acesso foi testada pela barbearia. Nenhum cliente foi cadastrado.', 'auth-owner-test-'+crypto.randomUUID());await stmt(env.DB,'auth:email-health',{verified:true,at:now()}).run();return h.json({ok:true,accepted:true})}
  if(b.channel==='crypto'){const r=await passwordHash('Teste local sem dados de cliente'),ok=await passwordMatches('Teste local sem dados de cliente',r);await stmt(env.DB,'auth:protection',{verified:ok,algorithm:r.algorithm,at:now()}).run();return h.json({ok,iterations:r.iterations})}
 }
 throw fail('Operação indisponível.',404);
}
export async function customerAuthRoute(req,env,url,h){
 const p=url.pathname;if(!p.startsWith('/api/auth/')||p.startsWith('/api/auth/admin'))return null;
 const db=env.DB;
 if(p==='/api/auth/status'&&req.method==='GET'){const c=await providerConfig(env,h),t=(await get(db,'auth:templates'))?.data||{};return h.json({emailReady:!!(c.apiKey&&c.from),phoneReady:t[OTP_TEMPLATE]?.approved===true&&t[PASSWORD_TEMPLATE]?.approved===true,temporaryPasswordExpires:false})}
 if(req.method!=='POST')throw fail('Método indisponível.',405);
 await h.limitRequests(db,'auth-ip:'+(req.headers.get('cf-connecting-ip')||'unknown'),true,p);
 const b=await h.body(req);
 await db.prepare("DELETE FROM config WHERE (key GLOB 'auth:session:*' OR key GLOB 'auth:pending:*' OR key GLOB 'auth:reset:*' OR key GLOB 'auth:delivery:*') AND json_extract(value,'$.expires')<?").bind(now()).run();
 if(p==='/api/auth/logout'){const token=String(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName(db)+'='))?.slice(cookieName(db).length+1);if(token)await db.prepare('DELETE FROM config WHERE key=?').bind('auth:session:'+await authHash(token)).run();const r=h.json({ok:true});r.headers.set('Set-Cookie',cookie(db,url,'',0));return r}
 if(p==='/api/auth/register'){
  const email=emailOf(b.email),phone=phoneOf(b.phone),name=typeof b.name==='string'?b.name.trim():'';if(name.length<2||name.length>100||b.consent!==true)throw fail('Informe seu nome e autorize o envio das verificações.');
  await rate(db,'register-site',20,3600);await rate(db,'register-email:'+await authHash(email),3,3600);await rate(db,'register-phone:'+await authHash(phone),3,3600);
  const c=await providerConfig(env,h),t=(await get(db,'auth:templates'))?.data;if(!c.apiKey||!c.from)throw fail('A barbearia precisa ativar o envio de e-mail para liberar novos acessos.',503);if(!t?.[OTP_TEMPLATE]?.approved||!t?.[PASSWORD_TEMPLATE]?.approved)throw fail('A barbearia precisa ativar os modelos de verificação do WhatsApp.',503);
  if(email===(db.workspaceOwnerEmail||'clubedojoao18@gmail.com'))throw fail('Use o acesso da equipe para esta conta.');
  let existing=await one(db,"SELECT * FROM users WHERE lower(email)=?",email);if(!existing)existing=await one(db,"SELECT * FROM users WHERE email='' AND role='client' AND id LIKE 'manual-%' AND replace(replace(replace(replace(replace(replace(phone,' ',''),'+',''),'-',''),'(',''),')',''),'.','') IN (?,?)",phone,phone.slice(2));
  if(existing&&(existing.role!=='client'||existing.disabled||existing.phone&&phoneOf(existing.phone)!==phone)||existing&&await get(db,'auth:account:'+existing.id))throw fail('Não foi possível solicitar este cadastro. Se você já tem acesso, use Esqueci a senha.');
  const samePhone=await one(db,"SELECT id,email FROM users WHERE replace(replace(replace(replace(replace(replace(phone,' ',''),'+',''),'-',''),'(',''),')',''),'.','') IN (?,?)",phone,phone.slice(2));if(samePhone&&samePhone.id!==existing?.id)throw fail('Este telefone já possui um cadastro. Fale com a barbearia para conferir os dados.');
  const id=random(16),secret=random(),emailToken=random(),code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');
  const data={email,phone,name,userId:existing?.id||'manual-'+crypto.randomUUID(),existing:!!existing,secretHash:await authHash(secret),emailHash:await authHash(emailToken),phoneHash:await otpHash(env,id,code),emailVerified:false,phoneVerified:false,expires:now()+1800,phoneExpires:now()+600,attempts:0};
  await insert(db,'auth:pending:'+id,data).run();const link=url.origin+(url.basePath||'')+'/acesso#verify-email='+id+'.'+emailToken;
  await mail(env,h,email,'Confirme seu e-mail', 'Confirme seu cadastro na Barbearia do João: '+link+'\nO link vale por 30 minutos. Se não foi você, ignore esta mensagem.','auth-register-'+id);
  await phoneSend(env,h,phone,code);return h.json({ok:true,id,secret,emailSent:true,phoneSent:true},201);
 }
 if(p==='/api/auth/verify-email'){const r=await pending(db,b,false);if(!/^[a-f0-9]{64}$/.test(b.token||'')||!equal(await authHash(b.token),r.data.emailHash))throw fail('Link inválido ou vencido.');if(!r.data.emailVerified)await updatePending(db,b.id,r.raw,{...r.data,emailVerified:true});return h.json({ok:true,emailVerified:true})}
 if(p==='/api/auth/registration-status'){const r=await pending(db,b);return h.json({emailVerified:r.data.emailVerified,phoneVerified:r.data.phoneVerified,completed:!!r.data.completed})}
 if(p==='/api/auth/verify-phone'){
  const r=await pending(db,b);if(r.data.phoneVerified)return h.json({ok:true});if(r.data.attempts>=5||r.data.phoneExpires<=now())throw fail('Código vencido ou limite de tentativas atingido. Solicite novo cadastro.');
  const valid=/^\d{6}$/.test(b.code||'')&&equal(await otpHash(env,b.id,b.code),r.data.phoneHash);await updatePending(db,b.id,r.raw,{...r.data,attempts:r.data.attempts+1,phoneVerified:valid});if(!valid)throw fail('Código inválido.');return h.json({ok:true});
 }
 if(p==='/api/auth/complete'){
  const r=await pending(db,b),d=r.data;if(!d.emailVerified||!d.phoneVerified)throw fail('Confirme o e-mail e o telefone antes de receber a senha.',409);
  const key='auth:delivery:'+b.id;let delivery=await get(db,key);
  if(!d.completed){
   const old=await one(db,'SELECT * FROM users WHERE id=?',d.userId);if(d.existing&&(!old||old.role!=='client'||old.disabled||old.email&&old.email.toLowerCase()!==d.email||old.phone&&phoneOf(old.phone)!==d.phone))throw fail('O cadastro mudou. Solicite uma nova verificação.',409);
   if(await one(db,'SELECT id FROM users WHERE lower(email)=? AND id<>?',d.email,d.userId))throw fail('Cadastro já existente. Use a recuperação de senha.',409);
   const pass=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(10)))).replaceAll('+','A').replaceAll('/','B').replaceAll('=',''),account={email:d.email,phone:d.phone,password:await passwordHash(pass),version:random(16),temporary:true,emailVerifiedAt:now(),phoneVerifiedAt:now()};
   const payload={secret:await h.sealCredentials({password:pass},env),expires:d.expires,accepted:false};
   const ops=[];if(!d.existing)ops.push(db.prepare("INSERT INTO users(id,email,name,phone,role) VALUES(?,?,?,?,'client')").bind(d.userId,d.email,d.name,d.phone),insert(db,'client_identity:email:'+d.email,{id:d.userId}),insert(db,'client_identity:phone:'+d.phone,{id:d.userId}));
   if(d.existing&&!old.email)ops.push(db.prepare('UPDATE users SET email=? WHERE id=?').bind(d.email,d.userId),insert(db,'client_identity:email:'+d.email,{id:d.userId}));
   if(d.existing&&!old.phone)ops.push(db.prepare('UPDATE users SET phone=? WHERE id=?').bind(d.phone,d.userId));ops.push(insert(db,'auth:account:'+d.userId,account),insert(db,'auth:email:'+await authHash(d.email),{userId:d.userId}),insert(db,key,payload),db.prepare('UPDATE config SET value=? WHERE key=? AND value=?').bind(JSON.stringify({...d,completed:true}),'auth:pending:'+b.id,r.raw));
   try{await db.batch(ops)}catch(e){if(String(e).includes('UNIQUE'))throw fail('Este acesso já foi ativado. Use Entrar ou Esqueci a senha.',409);throw e}delivery={data:payload};
  }
  if(!delivery)throw fail('Acesso criado. Use Esqueci a senha para receber um link pelo e-mail verificado.',409);
  if(!delivery.data.accepted){const secret=await h.openCredentials(delivery.data.secret,env);await phoneSend(env,h,d.phone,secret.password,true);await stmt(db,key,{accepted:true,expires:d.expires}).run()}
  return h.json({ok:true,passwordSent:true,temporaryPasswordExpires:false});
 }
 if(p==='/api/auth/login'){
  const email=emailOf(b.email);await rate(db,'login:'+await authHash(email),8,900);
  const idx=await get(db,'auth:email:'+await authHash(email)),account=idx&&await get(db,'auth:account:'+idx.data.userId),user=idx&&await one(db,"SELECT * FROM users WHERE id=? AND role='client' AND disabled=0",idx.data.userId);
  const matches=await passwordMatches(b.password,account?.data.password||await dummy());if(!account||!user||!matches)throw fail('E-mail ou senha inválidos.',401);
  return sessionResponse(db,url,user,account.data,h);
 }
 if(p==='/api/auth/forgot'){
  const email=emailOf(b.email);await rate(db,'forgot-site',30,3600);await rate(db,'forgot:'+await authHash(email),3,3600);const idx=await get(db,'auth:email:'+await authHash(email));
  if(idx){const a=await get(db,'auth:account:'+idx.data.userId),u=await one(db,"SELECT id FROM users WHERE id=? AND role='client' AND disabled=0",idx.data.userId);if(a&&u){const token=random(),hash=await authHash(token);await insert(db,'auth:reset:'+hash,{userId:u.id,version:a.data.version,expires:now()+900}).run();const link=url.origin+(url.basePath||'')+'/acesso#reset='+token;try{await mail(env,h,email,'Redefina sua senha','Redefina sua senha: '+link+'\nEste link vale por 15 minutos e só pode ser usado uma vez. Se não foi você, ignore.','auth-reset-'+hash)}catch{await stmt(db,'auth:email-health',{verified:false,at:now(),reason:'reset_send_failed'}).run()}}}
  return h.json({ok:true,message:'Se houver um acesso ativo com esse e-mail, você receberá um link para redefinir a senha.'});
 }
 if(p==='/api/auth/reset'){
  if(!/^[a-f0-9]{64}$/.test(b.token||''))throw fail('Link inválido ou vencido.');const hash=await authHash(b.token),reset=await get(db,'auth:reset:'+hash);if(!reset||reset.data.expires<=now())throw fail('Link inválido ou vencido.');const a=await get(db,'auth:account:'+reset.data.userId);if(!a||a.data.version!==reset.data.version)throw fail('Link inválido ou vencido.');
  const u=await one(db,"SELECT id FROM users WHERE id=? AND role='client' AND disabled=0",reset.data.userId);if(!u)throw fail('Link inválido ou vencido.');
  const next={...a.data,password:await passwordHash(b.password),version:random(16),temporary:false};try{await db.batch([insert(db,'auth:used:'+a.data.version,{at:now()}),stmt(db,'auth:account:'+u.id,next),db.prepare('DELETE FROM config WHERE key=?').bind('auth:reset:'+hash)])}catch(e){if(String(e).includes('UNIQUE'))throw fail('Este link já foi utilizado.',409);throw e}return h.json({ok:true});
 }
 if(p==='/api/auth/change-password'){
  const u=await customerSession(req,db);if(!u)throw fail('Entre com seu e-mail e senha para alterar a senha.',401);await rate(db,'change:'+u.id,5,900);const a=await get(db,'auth:account:'+u.id);if(!await passwordMatches(b.currentPassword,a.data.password))throw fail('Senha atual inválida.',401);const next={...a.data,password:await passwordHash(b.password),version:random(16),temporary:false};
  try{await db.batch([insert(db,'auth:used:'+a.data.version,{at:now()}),stmt(db,'auth:account:'+u.id,next)])}catch(e){if(String(e).includes('UNIQUE'))throw fail('A senha já foi alterada. Entre novamente.',409);throw e}return sessionResponse(db,url,u,next,h);
 }
 throw fail('Operação de acesso indisponível.',404);
}
