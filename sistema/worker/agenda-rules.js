const toMinutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
export function professionalWindow(c,id,date){
 const global=c.hours||{open:'09:00',close:'20:00'},rule=c.professionalHours?.[id];
 if(rule&&!rule.days.includes(new Date(date+'T12:00:00Z').getUTCDay()))return null;
 const periods=(rule?.periods||[rule||global]).map(p=>({open:p.open>global.open?p.open:global.open,close:p.close<global.close?p.close:global.close})).filter(p=>p.open<p.close);
 return periods.length?{open:periods[0].open,close:periods.at(-1).close,periods}:null;
}
export function withinProfessionalWindow(window,minute,duration=1){
 return !!window&&(window.periods||[window]).some(p=>minute>=toMinutes(p.open)&&minute+duration<=toMinutes(p.close));
}
export async function agendaRulesRoutes(req,env,url,u,c,h){
 const p=url.pathname,db=env.DB;
 if(p==='/api/professional-hours'){
  h.manager(u);h.allowed(u,c,'settings');
  if(req.method==='GET')return h.json(c.professionalHours||{});
  const b=await h.body(req),periods=b.periods===undefined?[{open:b.open,close:b.close}]:b.periods;
  const validTime=t=>typeof t==='string'&&/^([01]\d|2[0-3]):(00|30)$/.test(t);
  if(!(await h.professionals(db,c)).some(x=>x.id===b.barber)||!Array.isArray(b.days)||b.days.length>7||b.days.some(x=>!Number.isInteger(x)||x<0||x>6)||!Array.isArray(periods)||periods.length<1||periods.length>2||periods.some(p=>!p||!validTime(p.open)||!validTime(p.close)||p.open>=p.close))throw h.err('Revise profissional, dias e um ou dois períodos de expediente.');
  const sorted=periods.map(p=>({open:p.open,close:p.close})).sort((a,b)=>a.open.localeCompare(b.open));
  if(sorted.length===2&&sorted[0].close>sorted[1].open)throw h.err('Os períodos de expediente não podem se sobrepor.');
  const value={...c.professionalHours,[b.barber]:{days:[...new Set(b.days)],open:sorted[0].open,close:sorted.at(-1).close,periods:sorted}};
  await h.run(db,'INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','professionalHours',JSON.stringify(value));await h.audit(db,u.id,b.barber,'professional.hours.updated',{});return h.json({ok:true});
 }
 if(p!=='/api/agenda-vacation')return null;
 h.staff(u);h.allowed(u,c,'book');const b=await h.body(req),barber=u.role==='barber'?u.id:b.barber||u.id;
 if(!(await h.professionals(db,c)).some(x=>x.id===barber)||!h.validDate(b.start)||!h.validDate(b.end)||b.start<h.today()||b.start>b.end)throw h.err('Escolha profissional e datas válidas.');
 const from=Date.parse(b.start+'T12:00:00Z'),until=Date.parse(b.end+'T12:00:00Z'),days=(until-from)/86400000+1;
 if(days>31||until>Date.now()+180*86400000)throw h.err('Bloqueie até 31 dias por vez, nos próximos 180 dias.');
 const group=crypto.randomUUID(),ops=[];
 for(let i=0;i<days;i++){
  const date=new Date(from+i*86400000).toISOString().slice(0,10),id=group+'_'+date;
  const times=Array.from({length:48},(_,n)=>String(Math.floor(n/2)).padStart(2,'0')+':'+(n%2?'30':'00'));
  ops.push(db.prepare("INSERT INTO appointments(id,user_id,barber_id,date,time,service,duration,price,kind) VALUES(?,?,?,?,'00:00','block',1440,0,'block')").bind(id,u.id,barber,date));
  ops.push(db.prepare('INSERT INTO slots(barber_id,date,time,appointment_id) SELECT ?,?,value,? FROM json_each(?)').bind(barber,date,id,JSON.stringify(times)));
 }
 try{await db.batch(ops)}catch(e){if(String(e).includes('UNIQUE'))throw h.err('Há atendimento ou bloqueio nesse período. Nenhum novo dia foi bloqueado.',409);throw e}
 await h.audit(db,u.id,barber,'professional.vacation.created',{start:b.start,end:b.end,days});return h.json({ok:true,days,group},201);
}
