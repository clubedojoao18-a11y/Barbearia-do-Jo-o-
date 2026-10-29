import {FOX_PRODUCTS,productDetails,seedFoxCatalog} from './fox-catalog.js';
const get=async(db,k,fallback=null)=>{const r=await db.prepare('SELECT value FROM config WHERE key=?').bind(k).first();return r?JSON.parse(r.value):fallback};
const all=async(db,q,...v)=>(await db.prepare(q).bind(...v).all()).results;
const time=()=>Math.floor(Date.now()/1000),day=t=>new Date(t*1000-10800000).toISOString().slice(0,10);
const plus=(date,n)=>new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export const RETURN_RULES={corte:{name:'Corte',days:14},barba:{name:'Barba',days:7},combo:{name:'Corte e barba',days:14},sobrancelha:{name:'Sobrancelha',days:15},pezinho:{name:'Pezinho',days:7},hidratacao:{name:'Hidratação de cabelo e/ou barba',days:7},depilacao:{name:'Depilação de nariz e/ou orelha',days:30},camuflagem:{name:'Camuflagem',days:7},pele:{name:'Limpeza de pele',days:15}};
const alias=id=>id.startsWith('hidratacao-')?'hidratacao':id.startsWith('depilacao-')?'depilacao':id.startsWith('camuflagem-')?'camuflagem':id;
const keys=id=>id==='combo'?['corte','barba']:alias(id)==='hidratacao'?['hidratacao']:alias(id)==='depilacao'?['depilacao']:[alias(id)];
export async function returnSettings(db){return {enabled:false,leadDays:2,cooldownDays:7,perRun:10,rules:RETURN_RULES,...await get(db,'retention_settings',{})}}
async function catalogRows(db){const products=await all(db,'SELECT * FROM products ORDER BY name');for(const p of products){p.details=await productDetails(db,p.id);p.costKnown=p.details?.costKnown!==false;p.margin=p.costKnown&&p.price?Math.round((p.price-p.cost)/p.price*10000)/100:null;}return products;}
const publicProduct=p=>({id:p.id,name:p.name,price:p.price,stock:p.stock,active:!!p.active,available:!!p.active&&p.stock>0&&p.costKnown,category:p.details?.category||'outros',benefit:p.details?.benefit||'Confira a indicação com o profissional.',image:FOX_PRODUCTS.some(x=>x.id===p.id)?'/api/retail/image/'+p.id:null,imageNote:p.details?.imageNote||'',days:p.details?.days||null,estimated:true});
export async function customerReturns(db,user,settings,at=time()){
 const preferences=await get(db,'retention_user_'+user,{snoozes:{}}),events=new Map(),covered=new Set(),today=day(at);
 const visits=await all(db,"SELECT a.id,a.service,a.date,x.value extras FROM appointments a LEFT JOIN config x ON x.key='retail_booking_'||a.id WHERE a.user_id=? AND a.status='done' AND a.kind<>'block' ORDER BY a.date DESC,a.created_at DESC LIMIT 500",user);
 for(const a of visits){const extras=a.extras?JSON.parse(a.extras).extras||[]:[];for(const service of [{id:a.service},...extras]){const id=alias(service.id),rule=settings.rules[id];if(!rule||!Number.isInteger(rule.days)||rule.days<1)continue;
  const components=keys(id),wholeCombo=id==='combo'&&components.every(k=>!covered.has(k));
  if(wholeCombo)events.set('service:corte',{key:'service:corte',type:'service',service:'combo',name:rule.name,source:a.id,lastDate:a.date,days:rule.days,estimated:false});
  else for(const component of components){const key='service:'+component;if(!covered.has(component))events.set(key,{key,type:'service',service:component,name:settings.rules[component]?.name||rule.name,source:a.id,lastDate:a.date,days:settings.rules[component]?.days||rule.days,estimated:false});}
  for(const component of components)covered.add(component);
 }}
 const sales=await all(db,"SELECT s.id,s.product_id,s.quantity,s.created_at,p.name,p.active,o.value retailOrder FROM sales s JOIN products p ON p.id=s.product_id LEFT JOIN config c ON c.key='sale_customer_'||s.id LEFT JOIN config o ON o.key='retail_order_'||substr(s.id,8,36) WHERE (s.actor_id=? OR json_extract(c.value,'$.user')=?) AND (o.key IS NULL OR json_extract(o.value,'$.status')='delivered') ORDER BY s.created_at DESC LIMIT 500",user,user);
 for(const s of sales){const key='product:'+s.product_id;if(events.has(key)||!s.active)continue;const p=await productDetails(db,s.product_id);if(!p?.days)continue;events.set(key,{key,type:'product',product:s.product_id,name:s.name,source:s.id,lastDate:day(s.retailOrder?JSON.parse(s.retailOrder).deliveredAt||s.created_at:s.created_at),days:Math.min(365,p.days*s.quantity),estimated:true});}
 const future=await all(db,"SELECT a.service,x.value extras FROM appointments a LEFT JOIN config x ON x.key='retail_booking_'||a.id WHERE a.user_id=? AND a.status='scheduled' AND a.kind<>'block' AND a.date>=?",user,today),reserved=new Set();
 for(const a of future)for(const s of [{id:a.service},...(a.extras?JSON.parse(a.extras).extras||[]:[])])for(const k of keys(s.id))reserved.add('service:'+k);
 return [...events.values()].map(x=>{const due=plus(x.lastDate,x.days),snoozed=preferences.snoozes?.[x.key]||'';return {...x,due:snoozed>due?snoozed:due,originalDue:due,reserved:reserved.has(x.key),bookingService:x.type==='service'?x.service:null}}).sort((a,b)=>a.due.localeCompare(b.due));
}
export async function returnEligible(db,user,at=time()){
 const settings=await returnSettings(db),profile=await get(db,'care_profile_'+user,{});if(!settings.enabled||!profile.marketing)return [];
 const items=await customerReturns(db,user,settings,at);return items.filter(x=>!x.reserved&&x.due<=plus(day(at),settings.leadDays));
}
export async function returnTick(env,c,h){
 const db=env.DB,s=await returnSettings(db);if(!s.enabled||c.automation?.paused||!c.whatsapp?.enabled)return {paused:true,queued:0};
 const contacts=await all(db,"SELECT w.wa_id,u.id FROM users u JOIN wa_contacts w ON w.user_id=u.id WHERE u.disabled=0 AND u.role='client' AND w.consent=1 AND w.mode<>'human' ORDER BY w.last_inbound DESC LIMIT 200");let queued=0;
 for(const user of contacts){if(queued>=s.perRun)break;const items=await returnEligible(db,user.id,h.now());if(!items.length)continue;
  const cut=h.now()-s.cooldownDays*86400;if(await db.prepare("SELECT id FROM wa_outbox WHERE wa_id=? AND kind IN ('care_return','client_recovery') AND status<>'canceled' AND created_at>=? LIMIT 1").bind(user.wa_id,cut).first())continue;
  const selected=items.slice(0,4),signature=selected.map(x=>x.key+':'+x.source+':'+x.due).join('|'),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(signature))),x=>x.toString(16).padStart(2,'0')).join(''),id='care-return:'+user.id+':'+hash;
  if(await db.prepare('SELECT id FROM wa_outbox WHERE id=?').bind(id).first())continue;
  const firstService=selected.find(x=>x.type==='service');const text='Olá! Seu próximo cuidado: '+selected.map(x=>x.name+' — '+x.due.split('-').reverse().join('/')+(x.estimated?' (reposição estimada)':'')).join('; ')+'. '+(selected.some(x=>x.type==='service')?'Para '+firstService.name+', responda AGENDAR '+(firstService.due<day(h.now())?day(h.now()):firstService.due)+' '+firstService.service+' ou ATENDENTE. ':'')+(selected.some(x=>x.type==='product')?'Como está seu produto? A reposição depende do uso; fale com ATENDENTE para conferir disponibilidade. ':'')+'Nada é reservado ou comprado sem sua confirmação. PARAR OFERTAS cancela estes convites.';
  // Claim and queue are atomic; overlapping hourly runs cannot send two invitations.
  const claim='retention_claim_'+user.id;try{await db.batch([db.prepare("INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(json_extract(config.value,'$.at') AS INTEGER)<?").bind(claim,JSON.stringify({at:h.now(),id}),cut),db.prepare("INSERT INTO wa_outbox(id,wa_id,kind,text,created_at) SELECT ?,?,'care_return',?,? WHERE json_extract((SELECT value FROM config WHERE key=?),'$.id')=?").bind(id,user.wa_id,text,h.now(),claim,id),db.prepare('INSERT INTO config(key,value) SELECT ?,? WHERE EXISTS(SELECT 1 FROM wa_outbox WHERE id=?)').bind('retention_message_'+id,JSON.stringify({user:user.id,items:selected.map(x=>({key:x.key,source:x.source,due:x.due}))}),id)]);if(await db.prepare('SELECT id FROM wa_outbox WHERE id=?').bind(id).first())queued++;}catch(e){if(!String(e).includes('UNIQUE'))throw e}
 }return {queued};
}
export async function returnMessageEligible(db,id,user,at=time()){
 const saved=await get(db,'retention_message_'+id);if(!saved||saved.user!==user)return false;
 const live=await returnEligible(db,user,at);return saved.items.every(x=>live.some(y=>y.key===x.key&&y.source===x.source&&y.due===x.due));
}
export async function retentionRoutes(req,env,url,u,c,h){
 const p=url.pathname;if(!p.startsWith('/api/retention'))return null;const db=env.DB,settings=await returnSettings(db),manager=u.role==='manager';
 const manage=()=>{h.manager(u);h.allowed(u,c,'settings');h.allowed(u,c,'finance')};
 if(p==='/api/retention/catalog/import'&&req.method==='POST'){h.requireOwner(u);const b=await h.body(req);if(b.confirm!==true)throw fail('Confirme a importação do catálogo pesquisado.');return h.json(await seedFoxCatalog(env));}
 if(p==='/api/retention/catalog'&&req.method==='GET'){const rows=await catalogRows(db);if(manager){manage();return h.json({manager:true,products:rows.map(x=>({...x,...publicProduct(x),cost:x.cost,costKnown:x.costKnown,margin:x.margin,details:x.details}))})}return h.json({manager:false,products:rows.filter(x=>x.active).map(publicProduct)})}
 if(p==='/api/retention/catalog'&&req.method==='POST'){
  manage();const b=await h.body(req),product=await db.prepare('SELECT * FROM products WHERE id=?').bind(b.id).first();if(!product)throw fail('Produto não encontrado.',404);
  if(!Number.isSafeInteger(b.price)||b.price<1||b.price>10000000||!Number.isSafeInteger(b.cost)||b.cost<0||b.cost>10000000||!Number.isInteger(b.days)||b.days<7||b.days>365)throw fail('Confira preço, custo real e intervalo de reposição.');
  const details={...await productDetails(db,b.id),days:b.days,costKnown:true,costConfirmedAt:h.now()};await db.batch([db.prepare('UPDATE products SET price=?,cost=? WHERE id=?').bind(b.price,b.cost,b.id),db.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('product_details_'+b.id,JSON.stringify(details))]);await h.audit(db,u.id,b.id,'product.cost.confirmed',{costConfirmed:true});return h.json({ok:true});
 }
 if(p==='/api/retention/settings'){
  manage();if(req.method==='GET')return h.json({settings,whatsappConfigured:!!c.whatsapp?.enabled,templateConfigured:!!c.whatsapp?.templates?.care_return,note:'Sugestões comerciais editáveis, não prescrições. Reposição de produto é estimativa. Atendimentos só são reservados após confirmação.'});
  const b=await h.body(req);if(typeof b.enabled!=='boolean'||!Number.isInteger(b.leadDays)||b.leadDays<0||b.leadDays>7||!Number.isInteger(b.cooldownDays)||b.cooldownDays<7||b.cooldownDays>90)throw fail('Confira os limites de retorno.');
  const rules={};for(const [id,rule]of Object.entries({...RETURN_RULES,...settings.rules})){const days=b.rules?.[id]?.days??rule.days;if(!Number.isInteger(days)||days<1||days>365)throw fail('Intervalos devem estar entre 1 e 365 dias.');rules[id]={...rule,days};}
  await db.prepare("INSERT INTO config(key,value) VALUES('retention_settings',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({...settings,enabled:b.enabled,leadDays:b.leadDays,cooldownDays:b.cooldownDays,rules})).run();await h.audit(db,u.id,null,'retention.settings.updated',{});return h.json({ok:true});
 }
 if(p==='/api/retention'&&req.method==='GET')return h.json({items:await customerReturns(db,u.id,settings,h.now()),marketing:!!(await get(db,'care_profile_'+u.id,{})).marketing,notice:'Datas sugeridas conforme seu histórico; produtos têm previsão ajustável conforme o uso.'});
 if(p==='/api/retention/snooze'&&req.method==='POST'){const b=await h.body(req),items=await customerReturns(db,u.id,settings,h.now());if(!items.some(x=>x.key===b.key)||!h.validDate(b.date)||b.date<day(h.now())||b.date>plus(day(h.now()),365))throw fail('Escolha um item seu e uma data nos próximos 365 dias.');const key='retention_user_'+u.id,old=await get(db,key,{snoozes:{}});await db.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify({...old,snoozes:{...old.snoozes,[b.key]:b.date}})).run();return h.json({ok:true});}
 throw fail('Operação inválida.',405);
}
