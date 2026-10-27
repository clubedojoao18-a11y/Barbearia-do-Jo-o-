// Growth pilot: one isolated, bounded config record; no schema or customer migration.
// Monetary ceiling reserves the retail value of both benefits, not an invented cost.
const KEY='growth_state';
const DAY=86400;
const defaults={enabled:false,monthlyBudget:0,monthlyLimit:2,validDays:14,weekdays:[2,3],start:'09:00',end:'12:00',occupancyCeiling:60};
const dayOf=x=>new Date(x+'T12:00:00Z').getUTCDay();
const minutes=x=>Number(x.slice(0,2))*60+Number(x.slice(3));
const dateOffset=(x,n)=>new Date(Date.parse(x+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const normalizedPhone=x=>String(x||'').replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'');
const sha=async x=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x))),v=>v.toString(16).padStart(2,'0')).join('');
async function load(db){const row=await db.prepare('SELECT value FROM config WHERE key=?').bind(KEY).first();return {raw:row?.value??null,state:row?JSON.parse(row.value):{settings:{...defaults},invites:[],revision:0}}}
function conflict(e){return String(e).includes('UNIQUE constraint failed: config.key')}
export function growthStateStatements(db,raw,state){
 const value=JSON.stringify({...state,revision:(state.revision||0)+1});
 if(raw===null)return [db.prepare('INSERT INTO config(key,value) VALUES(?,?)').bind(KEY,value)];
 // A stale snapshot deliberately violates the existing key and rolls back the whole batch.
 return [db.prepare('INSERT INTO config(key,value) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM config WHERE key=? AND value=?)').bind(KEY,'{}',KEY,raw),db.prepare('UPDATE config SET value=? WHERE key=?').bind(value,KEY)];
}
async function mutate(db,fn){for(let i=0;i<6;i++){const {raw,state}=await load(db);const result=await fn(state);try{await db.batch(growthStateStatements(db,raw,state));return result}catch(e){if(!conflict(e))throw e}}throw Object.assign(new Error('Há outra atualização em andamento. Tente novamente.'),{status:409})}
function numeric(x,min,max,err){if(!Number.isSafeInteger(x)||x<min||x>max)throw err('Informe limites numéricos válidos.');return x}
function validateSettings(b,err){
 if(typeof b.enabled!=='boolean'||!Array.isArray(b.weekdays)||!b.weekdays.length||b.weekdays.length>7)throw err('Escolha dias e estado da campanha.');
 const weekdays=[...new Set(b.weekdays.map(x=>numeric(x,0,6,err)))];
 if(!/^([01]\d|2[0-3]):(00|30)$/.test(b.start||'')||!/^([01]\d|2[0-3]):(00|30)$/.test(b.end||'')||b.start>=b.end)throw err('Escolha uma janela válida, em blocos de 30 minutos.');
 const settings={enabled:b.enabled,monthlyBudget:numeric(b.monthlyBudget,0,200000,err),monthlyLimit:numeric(b.monthlyLimit,1,20,err),validDays:numeric(b.validDays,7,30,err),weekdays,start:b.start,end:b.end,occupancyCeiling:numeric(b.occupancyCeiling,10,90,err)};
 if(settings.enabled&&settings.monthlyBudget<=0)throw err('Defina um teto mensal antes de ativar presentes.');
 return settings;
}
async function capacity(db,settings,h,c){
 const people=await h.professionals(db,c),open=minutes(c.hours?.open||'09:00'),close=minutes(c.hours?.close||'20:00');
 const start=Math.max(minutes(settings.start),open),end=Math.min(minutes(settings.end),close),days=[];
 const allSlots=await h.all(db,'SELECT date,time,barber_id FROM slots WHERE date>=? AND date<=?',h.today(),dateOffset(h.today(),14));
 const busy=new Set(allSlots.map(x=>x.date+'|'+x.time+'|'+x.barber_id));
 for(let i=0;i<=14;i++){const date=dateOffset(h.today(),i);if(!settings.weekdays.includes(dayOf(date)))continue;let total=0,occupied=0;for(const person of people)for(let m=start;m<end;m+=30){const time=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');if(Date.parse(date+'T'+time+':00-03:00')<=Date.now()+(c.bookingRules?.leadMinutes||0)*60000)continue;total++;if(busy.has(date+'|'+time+'|'+person.id))occupied++}days.push({date,weekday:dayOf(date),total,occupied,free:total-occupied,occupancy:total?Math.round(100*occupied/total):100})}
 return {days,total:days.reduce((n,x)=>n+x.total,0),free:days.reduce((n,x)=>n+x.free,0),definition:'Blocos de 30 minutos na janela promocional, considerando profissionais, reservas e bloqueios atuais. Não mede demanda não registrada.'};
}
async function analyze(db,c,state,h){
 const today=h.today(),start=dateOffset(today,-29),previous=dateOffset(today,-59);
 const current=await h.all(db,"SELECT user_id,date,kind,price FROM appointments WHERE status='done' AND kind<>'block' AND date BETWEEN ? AND ?",start,today);
 const old=(await h.first(db,"SELECT COUNT(*) n FROM appointments WHERE status='done' AND kind<>'block' AND date>=? AND date<?",previous,start)).n;
 const lost=(await h.first(db,"SELECT COUNT(*) n FROM (SELECT a.user_id,MAX(a.date) last_visit FROM appointments a JOIN users u ON u.id=a.user_id WHERE a.status='done' AND a.kind<>'block' AND u.disabled=0 AND u.role='client' GROUP BY a.user_id HAVING MAX(a.date)<? AND NOT EXISTS(SELECT 1 FROM appointments f WHERE f.user_id=a.user_id AND f.status='scheduled' AND f.kind<>'block' AND f.date>=?))",dateOffset(today,-45),today)).n;
 const paid=(await h.first(db,"SELECT COUNT(*) n FROM memberships WHERE status='active' AND paid_until>?",h.now())).n;
 const referrals=state.invites,ids=referrals.map(x=>x.guestAppointment).filter(Boolean);
 const appointments=[];for(let i=0;i<ids.length;i+=50){const batch=ids.slice(i,i+50);appointments.push(...await h.all(db,'SELECT id,status FROM appointments WHERE id IN ('+batch.map(()=>'?').join(',')+')',...batch))}
 const attended=new Set(appointments.filter(x=>x.status==='done').map(x=>x.id));
 const attendedIds=referrals.filter(x=>attended.has(x.guestAppointment)).map(x=>x.guest).filter(Boolean);
 let converted=0,returned=0;
 for(let i=0;i<attendedIds.length;i+=50){const group=attendedIds.slice(i,i+50),placeholders=group.map(()=>'?').join(',');converted+=(await h.first(db,"SELECT COUNT(DISTINCT user_id) n FROM invoices WHERE status='paid' AND user_id IN ("+placeholders+')',...group)).n;returned+=(await h.first(db,"SELECT COUNT(DISTINCT user_id) n FROM appointments WHERE status='done' AND kind='single' AND price>0 AND user_id IN ("+placeholders+')',...group)).n}
 const cap=await capacity(db,state.settings,h,c),low=cap.days.filter(x=>x.free>0&&x.occupancy<state.settings.occupancyCeiling);
 const month=today.slice(0,7),issued=referrals.filter(x=>x.month===month),reserved=issued.reduce((n,x)=>n+x.reservedValue,0);
 const ideas=[];
 if(current.length<10)ideas.push({title:'Construir uma base confiável',reason:'Menos de 10 atendimentos concluídos nos últimos 30 dias.',action:'Registrar atendimentos e origem dos novos clientes. A janela abaixo usa disponibilidade real, sem inferir demanda histórica.'});
 if(low.length)ideas.push({title:'Amigos nos horários livres',reason:low.length+' janela(s) abaixo do teto de ocupação nos próximos 14 dias.',action:'Disponibilizar convites limitados aos clientes elegíveis, preservando o teto mensal.'});
 else ideas.push({title:'Preservar a capacidade da agenda',reason:'Não há janela promocional abaixo do teto de ocupação.',action:'Suspender novos convites até abrir capacidade; convites já emitidos mantêm suas condições.'});
 if(lost)ideas.push({title:'Recuperar a relação antes de oferecer desconto',reason:lost+' cliente(s) com última visita há mais de 45 dias e sem reserva futura.',action:'Pedir feedback e entender o motivo da ausência. O relatório do WhatsApp ainda precisa ser importado; não há disparos de marketing configurados.'});
 if(old&&current.length<old)ideas.push({title:'Rever o ritmo de retorno',reason:'Atendimentos concluídos caíram de '+old+' para '+current.length+' em períodos consecutivos de 30 dias.',action:'Acompanhar retorno dos indicados e oferecer o próximo agendamento após o atendimento.'});
 if(attended.size)ideas.push({title:'Acompanhar qualidade das indicações',reason:attended.size+' indicado(s) compareceram; '+returned+' tiveram retorno avulso com valor registrado e '+converted+' têm fatura de assinatura paga.',action:'Manter o programa se o retorno justificar as cortesias. Sem custos reais cadastrados, estes números não comprovam lucro ou causalidade.'});
 return {checkedAt:h.now(),period:{start,end:today},metrics:{completed:current.length,previousCompleted:old,dormant:lost,activePaidClubs:paid,issued:referrals.length,claimed:referrals.filter(x=>x.guest).length,attended:attended.size,returned,converted},budget:{month,limit:state.settings.monthlyBudget,reserved,remaining:Math.max(0,state.settings.monthlyBudget-reserved),issued:issued.length,maxInvites:state.settings.monthlyLimit,definition:'Valor de tabela dos dois serviços reservado na emissão. Não é custo real nem pagamento. Não há liberação automática do teto por expiração ou falta.'},capacity:cap,eligibleDays:low,ideas,mode:'rules',backgroundConfigured:false,externalMarketing:false};
}
const tokenValid=x=>typeof x==='string'&&/^[A-F0-9]{32}$/.test(x);
async function canRefer(db,u,h){return u.role==='client'&&!u.disabled&&!!u.phone&&!!await h.first(db,"SELECT u.id FROM users u WHERE u.id=? AND (EXISTS(SELECT 1 FROM memberships m WHERE m.user_id=u.id AND m.status='active' AND m.paid_until>?) OR (SELECT COUNT(*) FROM appointments a WHERE a.user_id=u.id AND a.status='done' AND a.kind<>'block')>=2)",u.id,h.now())}
function customerView(x,u,done){return {token:x.token,service:x.service,rewardService:x.rewardService,expiresAt:x.expiresAt,rewardExpiresAt:x.rewardExpiresAt,days:x.days,start:x.start,end:x.end,isInviter:x.inviter===u.id,isGuest:x.guest===u.id,claimed:!!x.guest,guestBooked:!!x.guestAppointment,rewardBooked:!!x.rewardAppointment,rewardUnlocked:!!done,guestAppointment:x.guest===u.id?x.guestAppointment:null,rewardAppointment:x.inviter===u.id?x.rewardAppointment:null}}
async function issueGift(db,u,c,h){
  h.allowed(u,c,'book');if(!await canRefer(db,u,h))throw h.err('Convites disponíveis para clientes com clube pago vigente ou dois atendimentos concluídos.',403);
  const catalog=h.serviceCatalog(c,h.SERVICES),cut=catalog.find(x=>x.id==='corte'),reward=catalog.find(x=>x.id==='hidratacao');
  if(!cut||!reward)throw h.err('Serviços do presente indisponíveis.',409);
  const value=cut.price+reward.price;if(!Number.isSafeInteger(value)||value<=0)throw h.err('Revise os valores do catálogo.',409);
  const result=await mutate(db,async state=>{
   state.settings={...defaults,...state.settings};const s=state.settings,month=h.today().slice(0,7);
   if(!s.enabled)throw h.err('Novos convites estão pausados.',409);
   const prior=state.invites.find(x=>x.inviter===u.id&&x.month===month);if(prior)return {ok:true,token:prior.token,replayed:true};
   const inMonth=state.invites.filter(x=>x.month===month);if(state.invites.length>=400)throw h.err('Limite do piloto alcançado. Revise o histórico antes de ampliar.',409);
   if(inMonth.length>=s.monthlyLimit||inMonth.reduce((n,x)=>n+x.reservedValue,0)+value>s.monthlyBudget)throw h.err('Teto de presentes do mês alcançado.',409);
   const availability=await capacity(db,s,h,c),choices=availability.days.filter(x=>x.free>=Math.ceil(cut.minutes/30)&&x.occupancy<s.occupancyCeiling);if(!choices.length)throw h.err('Sem capacidade promocional abaixo do teto. Tente em outra data.',409);
   const byDay=new Map();for(const d of choices){const v=byDay.get(d.weekday)||{free:0,total:0};v.free+=d.free;v.total+=d.total;byDay.set(d.weekday,v)}
   const selected=[...byDay.entries()].sort((a,b)=>b[1].free/b[1].total-a[1].free/a[1].total||a[0]-b[0])[0][0];
   const token=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
   state.invites.push({token,inviter:u.id,inviterPhone:await sha(normalizedPhone(u.phone)),createdAt:h.now(),month,expiresAt:h.now()+s.validDays*DAY,rewardExpiresAt:h.now()+(s.validDays+30)*DAY,reservedValue:value,service:'corte',rewardService:'hidratacao',days:[selected],start:s.start,end:s.end,guest:null,guestAppointment:null,rewardAppointment:null});
   return {ok:true,token,replayed:false};
  });return result;
}
export async function growthRoutes(req,env,url,u,c,h){
 if(!url.pathname.startsWith('/api/growth'))return null;
 const db=env.DB,p=url.pathname;
 const management=()=>{h.manager(u);h.allowed(u,c,'metrics');h.allowed(u,c,'finance')};
 if(p==='/api/growth'&&req.method==='GET'){
  const {state}=await load(db);state.settings={...defaults,...state.settings};
  if(u.role==='manager'){management();return h.json({manager:true,owner:h.owner(u),settings:state.settings,analysis:await analyze(db,c,state,h),pilotLimit:400})}
  const own=state.invites.filter(x=>x.inviter===u.id||x.guest===u.id),invites=[];
  for(const x of own){const done=x.guestAppointment&&!!await h.first(db,"SELECT id FROM appointments WHERE id=? AND status='done'",x.guestAppointment);invites.push(customerView(x,u,done))}
  return h.json({manager:false,enabled:state.settings.enabled,eligible:await canRefer(db,u,h),invites,terms:{service:'corte',rewardService:'hidratacao',validDays:state.settings.validDays,days:state.settings.weekdays,start:state.settings.start,end:state.settings.end},note:'Primeira visita do amigo, sujeita à disponibilidade. A hidratação de quem indicou é liberada após o comparecimento do amigo. Sem pagamento em dinheiro ou desconto em assinatura.'});
 }
 if(p==='/api/growth/settings'&&req.method==='POST'){h.requireOwner(u);const b=await h.body(req),settings=validateSettings(b,h.err);await mutate(db,state=>{state.settings=settings;return {ok:true}});if(settings.enabled)await growthTick(env,c,h);await h.audit(db,u.id,null,'growth.settings.updated',{enabled:settings.enabled,monthlyBudget:settings.monthlyBudget});return h.json({ok:true})}
 if(p==='/api/growth/analyze'&&req.method==='POST'){management();await growthTick(env,c,h);return h.json({ok:true})}
 if(p==='/api/growth/invite'&&req.method==='POST'){
  return h.json(await issueGift(db,u,c,h));
 }
 if(p==='/api/growth/claim'&&req.method==='POST'){
  h.allowed(u,c,'book');const b=await h.body(req);if(!tokenValid(b.token)||u.role!=='client'||!normalizedPhone(u.phone))throw h.err('Entre como cliente e complete seu telefone para resgatar.',400);
  const phone=normalizedPhone(u.phone),hash=await sha(phone);
  // Phone is self-reported; these are duplicate-account checks, not verified identity.
  const users=await h.all(db,'SELECT id,phone FROM users WHERE phone<>?', '');
  if(users.some(x=>x.id!==u.id&&normalizedPhone(x.phone)===phone))throw h.err('Este telefone já está em outro cadastro. Fale com a barbearia.',409);
  await mutate(db,async state=>{
   const x=state.invites.find(x=>x.token===b.token);if(!x||x.inviter===u.id||x.inviterPhone===hash||x.expiresAt<=h.now())throw h.err('Convite indisponível para este cadastro.',409);
   if(x.guest===u.id)return {ok:true};
   if(x.guest||state.invites.some(y=>y.guest===u.id||y.guestPhone===hash)||await h.first(db,'SELECT id FROM appointments WHERE user_id=? AND kind<>? LIMIT 1',u.id,'block')||await h.first(db,'SELECT user_id FROM memberships WHERE user_id=?',u.id))throw h.err('O presente é exclusivo para uma primeira visita e pode ser usado uma única vez.',409);
   x.guest=u.id;x.guestPhone=hash;x.claimedAt=h.now();return {ok:true};
  });return h.json({ok:true});
 }
 throw h.err('Operação de crescimento indisponível.',404);
}
export async function growthTick(env,c,h){
 const {state}=await load(env.DB);let prepared=0;
 if(state.settings.enabled){
  const candidates=await h.all(env.DB,"SELECT u.* FROM users u WHERE u.role='client' AND u.disabled=0 AND u.phone<>'' AND (EXISTS(SELECT 1 FROM memberships m WHERE m.user_id=u.id AND m.status='active' AND m.paid_until>?) OR (SELECT COUNT(*) FROM appointments a WHERE a.user_id=u.id AND a.status='done' AND a.kind<>'block')>=2) ORDER BY u.created_at,u.id LIMIT 500",h.now());
  const month=h.today().slice(0,7),seen=new Set(state.invites.filter(x=>x.month===month).map(x=>x.inviter));
  for(const u of candidates.filter(x=>!seen.has(x.id)).slice(0,20)){try{const result=await issueGift(env.DB,u,c,h);if(!result.replayed)prepared++}catch(e){if(![400,403,409].includes(e.status))throw e}}
 }
 const current=(await load(env.DB)).state,report=await analyze(env.DB,c,{...current,settings:{...defaults,...current.settings}},h);
 await mutate(env.DB,value=>{value.lastAnalysis=report;return {ok:true}});return {ok:true,checkedAt:report.checkedAt,prepared};
}
// Called before appointment construction. Returned guard/update must be in its same transaction.
export async function prepareGrowthBooking(db,u,c,b,id,previous,h){
 if(b.kind!=='gift')return {statements:[]};
 if(u.role!=='client'||b.dependent)throw h.err('O presente é pessoal e deve ser reservado pelo beneficiário.',403);
 const {raw,state}=await load(db),x=state.invites.find(x=>previous?(x.guestAppointment===previous||x.rewardAppointment===previous):x.token===b.growthGift);
 if(!x)throw h.err('Presente inválido.',409);
 const guest=x.guest===u.id,inviter=x.inviter===u.id;if(!guest&&!inviter)throw h.err('Presente de outro cadastro.',403);
 if(guest&&await sha(normalizedPhone(u.phone))!==x.guestPhone)throw h.err('O telefone do resgate foi alterado. Fale com a barbearia.',409);
 const key=guest?'guestAppointment':'rewardAppointment',expiry=guest?x.expiresAt:x.rewardExpiresAt;
 if((x[key]&&x[key]!==previous)||expiry<=h.now()||Date.parse(b.date+'T'+b.time+':00-03:00')/1000>expiry)throw h.err('Presente utilizado ou fora da validade.',409);
 const service=guest?x.service:x.rewardService;
 const item=h.serviceCatalog(c,h.SERVICES).find(s=>s.id===service);
 if(!item||b.service!==service||!x.days.includes(dayOf(b.date))||b.time<x.start||minutes(b.time)+(item.minutes||30)>minutes(x.end))throw h.err('Escolha o serviço e a janela de dias e horários informados no convite.');
 if(inviter&&!await h.first(db,"SELECT id FROM appointments WHERE id=? AND status='done' AND user_id=?",x.guestAppointment,x.guest))throw h.err('A recompensa será liberada depois do comparecimento do amigo.',409);
 if(guest&&!previous&&await h.first(db,"SELECT id FROM appointments WHERE user_id=? AND kind<>'block' AND status<>'canceled' LIMIT 1",u.id))throw h.err('O presente é exclusivo da primeira visita.',409);
 x[key]=id;
 const statements=growthStateStatements(db,raw,state);if(guest&&!previous)statements.unshift(db.prepare("INSERT INTO config(key,value) SELECT ?,? WHERE EXISTS(SELECT 1 FROM appointments WHERE user_id=? AND kind<>'block' AND status<>'canceled')").bind(KEY,'{}',u.id));return {statements};
}
export async function growthCancellationStatements(db,appointment,h){
 if(appointment.kind!=='gift')return [];
 const {raw,state}=await load(db);let found=false;
 for(const x of state.invites)for(const key of ['guestAppointment','rewardAppointment'])if(x[key]===appointment.id){x[key]=null;found=true}
 return found?growthStateStatements(db,raw,state):[];
}
