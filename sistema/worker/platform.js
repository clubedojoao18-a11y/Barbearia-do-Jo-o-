import {companySchemaStatements,companyLicensed} from './tenancy.js';
const KEY='platform_state',DAY=86400;
const defaults={signupEnabled:true,billingEnabled:false,trialDays:7,plans:[{id:'sistema',name:'Sistema para Barbearias',price:0},{id:'fundador',name:'Educador fundador EU SOU',price:0,founder:true,included:true}]};
export async function platformState(db){const row=await db.prepare('SELECT value FROM config WHERE key=?').bind(KEY).first();return {raw:row?.value??null,state:row?JSON.parse(row.value):{settings:structuredClone(defaults),companies:[],revision:0}}}
function statements(db,raw,state){const value=JSON.stringify({...state,revision:(state.revision||0)+1});if(raw===null)return [db.prepare('INSERT INTO config(key,value) VALUES(?,?)').bind(KEY,value)];return [db.prepare('INSERT INTO config(key,value) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM config WHERE key=? AND value=?)').bind(KEY,'{}',KEY,raw),db.prepare('UPDATE config SET value=? WHERE key=?').bind(value,KEY)]}
async function mutate(db,fn){for(let i=0;i<6;i++){const {raw,state}=await platformState(db);const result=await fn(state);try{await db.batch([...statements(db,raw,state),...(result.statements||[])]);return result.data}catch(e){if(!String(e).includes('UNIQUE constraint failed: config.key'))throw e}}throw Object.assign(new Error('Outra atualização está em andamento. Tente novamente.'),{status:409})}
const details=x=>({id:x.id,name:x.name,slug:x.slug,ownerEmail:x.ownerEmail,plan:x.plan,trialUntil:x.trialUntil,paidUntil:x.paidUntil,status:x.status,paused:x.paused,licensed:companyLicensed(x),path:'/b/'+x.slug+'/',customerLinked:!!x.customerId,subscriptionLinked:!!x.subscriptionId});
const companyBy=(state,id,u,h)=>{const x=state.companies.find(x=>x.id===id);if(!x||x.ownerId!==u.id)throw h.err('Empresa indisponível para esta conta.',403);return x};
const founder=async(db,u,h)=>!!await h.first(db,"SELECT user_id FROM eu_members WHERE user_id=? AND role='founder' AND paid_until>?",u.id,h.now());
export async function effectiveCompany(db,company){if(company.plan!=='fundador')return company;const member=await db.prepare("SELECT paid_until FROM eu_members WHERE user_id=? AND role='founder'").bind(company.ownerId).first();return {...company,trialUntil:0,paidUntil:member?.paid_until||0,status:member?.paid_until>Math.floor(Date.now()/1000)?'included':'community_expired'}}

export async function platformRoutes(req,env,url,u,c,h){
 const p=url.pathname,db=env.DB;if(!p.startsWith('/api/saas/'))return null;
 if(p==='/api/saas/public'&&req.method==='GET'){const {state}=await platformState(db);return h.json({settings:state.settings,limit:20,note:'Cada empresa recebe área própria. Recebimentos de seus clientes exigem sua própria conexão de pagamentos. Todas as empresas usam as mesmas funcionalidades. IA, publicação e mensagens exigem conexões próprias e consumo no provedor.'})}
 if(!u)throw h.err('Entre com sua conta para continuar.',401);
 if(p==='/api/saas/me'&&req.method==='GET'){const {state}=await platformState(db);state.companies=await Promise.all(state.companies.map(x=>effectiveCompany(db,x)));return h.json({owner:h.owner(u),name:u.name,email:u.email,companies:state.companies.filter(x=>x.ownerId===u.id).map(details),settings:state.settings,founderEligible:await founder(db,u,h),...(h.owner(u)?{portfolio:state.companies.map(details)}:{})})}
 if(p==='/api/saas/settings'&&req.method==='POST'){
  h.requireOwner(u);const b=await h.body(req);if(typeof b.signupEnabled!=='boolean'||typeof b.billingEnabled!=='boolean'||!Number.isInteger(b.trialDays)||b.trialDays<0||b.trialDays>30)throw h.err('Revise os parâmetros de contratação.');
  const plans=defaults.plans.map(plan=>{const price=plan.included?0:b.prices?.[plan.id];if(!Number.isSafeInteger(price)||price<0||price>1000000)throw h.err('Informe valores mensais válidos.');return {...plan,price}});
  if(b.billingEnabled&&(!h.ready(env,c)||plans[0].price<=0))throw h.err('Ative e valide o cartão na conta da plataforma e defina o preço do sistema antes de liberar contratação.',409);
  await mutate(db,state=>{state.settings={signupEnabled:b.signupEnabled,billingEnabled:b.billingEnabled,trialDays:b.trialDays,plans};return {data:{ok:true}}});await h.audit(db,u.id,null,'platform.settings.updated',{});return h.json({ok:true});
 }
 if(p==='/api/saas/create'&&req.method==='POST'){
  const b=await h.body(req);if(typeof b.name!=='string'||!(/^[\p{L}\p{N} .&()-]{3,70}$/u).test(b.name)||typeof b.slug!=='string'||!(/^[a-z0-9][a-z0-9-]{2,39}$/).test(b.slug)||!b.confirm)throw h.err('Informe nome, endereço simples e confirme a criação.');
  const founderRecord=b.plan==='fundador'?await h.first(db,"SELECT paid_until FROM eu_members WHERE user_id=? AND role='founder' AND paid_until>?",u.id,h.now()):null;if(b.plan==='fundador'&&!founderRecord)throw h.err('A condição de fundador exige matrícula fundadora paga e vigente no EU SOU.',403);
  const data=await mutate(db,state=>{
   if(!state.settings.signupEnabled)throw h.err('Novos cadastros estão temporariamente pausados.',409);
   const existing=state.companies.find(x=>x.ownerId===u.id);if(existing){if(existing.slug===b.slug)return {data:{ok:true,company:details(existing),replayed:true}};throw h.err('Esta conta já possui uma empresa no piloto.',409)}
   if(state.companies.length>=20)throw h.err('Limite de empresas do piloto alcançado.',409);if(state.companies.some(x=>x.slug===b.slug))throw h.err('Este endereço já está em uso.',409);
   const plan=state.settings.plans.find(x=>x.id===b.plan);if(!plan)throw h.err('Escolha um plano válido.');
   const x={id:crypto.randomUUID().replaceAll('-',''),name:b.name.trim(),slug:b.slug,ownerId:u.id,ownerEmail:u.email.toLowerCase(),plan:plan.id,status:founderRecord?'included':'trial',trialUntil:founderRecord?0:h.now()+state.settings.trialDays*DAY,paidUntil:founderRecord?.paid_until||0,createdAt:h.now(),paused:false};state.companies.push(x);
   return {data:{ok:true,company:details(x)},statements:companySchemaStatements(db,x)};
  });await h.audit(db,u.id,data.company.id,'platform.company.created',{});return h.json(data,201);
 }
 if(p==='/api/saas/company'&&req.method==='POST'){h.requireOwner(u);const b=await h.body(req);if(typeof b.paused!=='boolean')throw h.err('Informe o estado da empresa.');await mutate(db,state=>{const x=state.companies.find(x=>x.id===b.id);if(!x)throw h.err('Empresa inexistente.',404);x.paused=b.paused;return {data:{ok:true}}});await h.audit(db,u.id,b.id,'platform.company.access.updated',{paused:b.paused});return h.json({ok:true})}
 if(p==='/api/saas/checkout'&&req.method==='POST'){
  const b=await h.body(req);if(b.confirm!==true)throw h.err('Confira o valor e confirme a contratação.');
  const snapshot=await mutate(db,state=>{
   const x=companyBy(state,b.id,u,h),plan=state.settings.plans.find(p=>p.id===x.plan);if(plan?.included)throw h.err('O sistema está incluído na matrícula fundadora. Regularize o EU SOU, sem contratar outra licença.',409);
   if(x.paused)throw h.err('Empresa pausada. Fale com o administrador.',403);
   if(!state.settings.billingEnabled||!h.ready(env,c)||!plan?.price)throw h.err('Contratação paga ainda não liberada. Nenhuma cobrança foi criada.',503);
   if(x.subscriptionId&&!['canceled','incomplete_expired'].includes(x.status))throw h.err('Já existe uma assinatura vinculada. Use o portal.',409);
   if(x.pending?.until>h.now()&&x.pending.price!==plan.price)throw h.err('Existe uma proposta anterior ainda aberta. Aguarde a expiração antes de alterar o valor.',409);
   if(!x.pending||x.pending.until<=h.now()||['canceled','incomplete_expired'].includes(x.status)){if(['canceled','incomplete_expired'].includes(x.status))x.subscriptionId=null;x.pending={token:crypto.randomUUID().replaceAll('-',''),price:plan.price,plan:plan.id,until:h.now()+DAY};x.status='pending'}
   return {data:{company:{...x},plan}};
  });
  const x=snapshot.company;if(x.plan==='fundador'&&!await founder(db,u,h))throw h.err('A condição de fundador precisa estar vigente.',403);
  const params={mode:'subscription','adaptive_pricing[enabled]':'false',integration_identifier:'joaosaas_lhpnqzrk',locale:'pt-BR',client_reference_id:x.id,customer_email:u.email,payment_method_configuration:env.STRIPE_CARD_CONFIGURATION,'line_items[0][quantity]':'1','line_items[0][price_data][currency]':'brl','line_items[0][price_data][unit_amount]':String(x.pending.price),'line_items[0][price_data][recurring][interval]':'month','line_items[0][price_data][product_data][name]':'Licença mensal · '+snapshot.plan.name,'metadata[kind]':'saas','metadata[company_id]':x.id,'metadata[license_token]':x.pending.token,'subscription_data[metadata][kind]':'saas','subscription_data[metadata][company_id]':x.id,'subscription_data[metadata][license_token]':x.pending.token,'payment_method_options[card][restrictions][funding_types_blocked][0]':'debit','payment_method_options[card][restrictions][funding_types_blocked][1]':'prepaid',success_url:url.origin+'/sistema?checkout=return',cancel_url:url.origin+'/sistema?checkout=cancel'};
  if(x.customerId){delete params.customer_email;params.customer=x.customerId}
  const session=await h.stripe(env,'checkout/sessions',params,'POST','license-'+x.id+'-'+x.pending.token);
  if(!/^https:\/\/checkout\.stripe\.com\//.test(session.url||''))throw h.err('O processador não retornou um checkout válido.',502);return h.json({url:session.url});
 }
 if(p==='/api/saas/portal'&&req.method==='POST'){const b=await h.body(req),{state}=await platformState(db),x=companyBy(state,b.id,u,h);if(!x.customerId||!h.ready(env,c))throw h.err('Não há conta de cobrança vinculada.',409);const session=await h.stripe(env,'billing_portal/sessions',{customer:x.customerId,return_url:url.origin+'/sistema',...(env.STRIPE_PORTAL_CONFIGURATION?{configuration:env.STRIPE_PORTAL_CONFIGURATION}:{})});if(!/^https:\/\/billing\.stripe\.com\//.test(session.url||''))throw h.err('Portal indisponível.',502);return h.json({url:session.url})}
 throw h.err('Operação comercial indisponível.',404);
}
// Runs only after the existing webhook has verified the raw signature and environment.
export async function platformWebhook(e,env,h){
 const o=e.data.object,{state}=await platformState(env.DB);if(!state.companies.length)return false;
 const sid=o.parent?.subscription_details?.subscription||o.subscription||(['customer.subscription.updated','customer.subscription.deleted'].includes(e.type)?o.id:null);
 const known=state.companies.find(x=>x.subscriptionId===sid);
 let sub=null;
 if(e.type.startsWith('invoice.')&&!known&&sid){if(await h.first(env.DB,'SELECT user_id FROM memberships WHERE subscription_id=? OR customer_id=?',sid,o.customer||''))return false;sub=await h.stripe(env,'subscriptions/'+encodeURIComponent(sid),null,'GET');if(sub.metadata?.kind!=='saas')return false}
 const meta=sub?.metadata||o.metadata||{};
 if(meta.kind!=='saas'&&!known)return false;
 if(!['checkout.session.completed','invoice.paid','invoice.payment_failed','invoice.payment_action_required','customer.subscription.updated','customer.subscription.deleted'].includes(e.type))return true;
 if(e.type.startsWith('invoice.')&&!sub)sub=await h.stripe(env,'subscriptions/'+encodeURIComponent(sid),null,'GET');
 const metadata=sub?.metadata||meta;
 await mutate(env.DB,current=>{
  const x=current.companies.find(x=>x.id===metadata.company_id||x.subscriptionId===sid);if(!x)throw h.err('Licença ainda não identificada. Reentregue o evento.',503);
  if(x.events?.includes(e.id))return {data:{ok:true}};
  if(metadata.kind!=='saas'||!x.pending||metadata.license_token!==x.pending.token)throw h.err('Evento não corresponde à licença contratada.',409);
  if(e.type==='checkout.session.completed'){
   if(o.mode!=='subscription'||o.client_reference_id!==x.id||!o.subscription||!o.customer||x.subscriptionId&&x.subscriptionId!==o.subscription)throw h.err('Checkout de licença incompatível.',409);
   x.subscriptionId=o.subscription;x.customerId=o.customer;
  }else if(e.type.startsWith('invoice.')){
   if(sub.id!==sid||x.subscriptionId&&x.subscriptionId!==sid||x.customerId&&x.customerId!==o.customer||sub.customer!==o.customer)throw h.err('Assinatura de licença incompatível.',409);
   x.subscriptionId=sid;x.customerId=o.customer;
   if(e.type==='invoice.paid'){
    const price=sub.items?.data?.[0]?.price,end=Math.max(0,...(o.lines?.data||[]).map(l=>l.period?.end||0));
    if(o.status!=='paid'||o.currency!=='brl'||o.amount_paid!==x.pending.price||!Number.isInteger(end)||end<=h.now()||price?.currency!=='brl'||price?.unit_amount!==x.pending.price||price?.recurring?.interval!=='month')throw h.err('Pagamento da licença exige conferência de valor e período.',409);
    x.paidUntil=Math.max(x.paidUntil||0,end);x.status='active';x.trialUntil=0;
   }else if(!(x.paidInvoices||[]).includes(o.id))x.status='past_due';
   if(e.type==='invoice.paid')x.paidInvoices=[...(x.paidInvoices||[]),o.id].slice(-100);
  }else if(e.type==='customer.subscription.deleted'){x.status='canceled';x.trialUntil=0;x.paidUntil=Math.min(x.paidUntil||0,h.now())}
  else {x.cancelAtPeriodEnd=!!o.cancel_at_period_end;if(o.status==='unpaid')x.status='unpaid'}
  x.events=[...(x.events||[]),e.id].slice(-200);return {data:{ok:true},statements:[env.DB.prepare('INSERT OR IGNORE INTO webhook_events(id,created_at) VALUES(?,?)').bind(e.id,h.now())]};
 });return true;
}
