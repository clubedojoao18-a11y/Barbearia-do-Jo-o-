const toMinutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
const validTime=t=>typeof t==='string'&&/^([01]\d|2[0-3]):(00|15|30|45)$/.test(t);
export const JOAO_WEEKLY_PERIODS={
 0:[{open:'10:00',close:'14:00'}],
 1:[{open:'14:00',close:'20:00'}],
 2:[{open:'14:00',close:'20:00'}],
 3:[{open:'14:00',close:'20:00'}],
 4:[{open:'10:00',close:'14:00'},{open:'16:00',close:'20:00'}],
 5:[{open:'10:00',close:'14:00'},{open:'16:00',close:'20:00'}],
 6:[{open:'10:00',close:'14:00'},{open:'16:00',close:'20:00'}]
};
function sortedPeriods(periods,allowClosed=false){
 if(!Array.isArray(periods)||periods.length>2||(!allowClosed&&!periods.length)||periods.some(p=>!p||!validTime(p.open)||!validTime(p.close)||p.open>=p.close))throw new Error('Revise um ou dois períodos de expediente por dia.');
 const sorted=periods.map(p=>({open:p.open,close:p.close})).sort((a,b)=>a.open.localeCompare(b.open));
 if(sorted.length===2&&sorted[0].close>sorted[1].open)throw new Error('Os períodos de expediente não podem se sobrepor.');
 return sorted;
}
export function normalizeProfessionalHours(b){
 if(b.weeklyPeriods!==undefined){
  const weekly=b.weeklyPeriods;
  if(!weekly||typeof weekly!=='object'||Array.isArray(weekly)||Object.keys(weekly).length!==7||Object.keys(weekly).some(k=>!/^[0-6]$/.test(k)))throw new Error('Informe os sete dias da semana; use períodos vazios nos dias fechados.');
  const weeklyPeriods=Object.fromEntries(Array.from({length:7},(_,day)=>[day,sortedPeriods(weekly[day],true)]));
  const days=Object.keys(weeklyPeriods).filter(k=>weeklyPeriods[k].length).map(Number),all=Object.values(weeklyPeriods).flat();
  return {days,weeklyPeriods,open:all.map(p=>p.open).sort()[0]||'09:00',close:all.map(p=>p.close).sort().at(-1)||'20:00'};
 }
 if(!Array.isArray(b.days)||b.days.length>7||b.days.some(x=>!Number.isInteger(x)||x<0||x>6))throw new Error('Revise os dias de expediente.');
 const periods=sortedPeriods(b.periods===undefined?[{open:b.open,close:b.close}]:b.periods);
 return {days:[...new Set(b.days)],open:periods[0].open,close:periods.at(-1).close,periods};
}
export function professionalWindow(c,id,date){
 const global=c.hours||{open:'09:00',close:'20:00'},rule=c.professionalHours?.[id];
 const day=new Date(date+'T12:00:00Z').getUTCDay();
 if(rule&&!rule.days.includes(day))return null;
 const periods=(rule?.weeklyPeriods?.[day]||rule?.periods||[rule||global]).map(p=>({open:p.open>global.open?p.open:global.open,close:p.close<global.close?p.close:global.close})).filter(p=>p.open<p.close);
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
  const b=await h.body(req);
  if(!(await h.professionals(db,c)).some(x=>x.id===b.barber))throw h.err('Escolha um profissional válido.');
  let rule;try{rule=normalizeProfessionalHours(b)}catch(e){throw h.err(e.message)}
  const value={...c.professionalHours,[b.barber]:rule};
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
  const times=Array.from({length:96},(_,n)=>String(Math.floor(n/4)).padStart(2,'0')+':'+String(n%4*15).padStart(2,'0'));
  ops.push(db.prepare("INSERT INTO appointments(id,user_id,barber_id,date,time,service,duration,price,kind) VALUES(?,?,?,?,'00:00','block',1440,0,'block')").bind(id,u.id,barber,date));
  ops.push(db.prepare('INSERT INTO slots(barber_id,date,time,appointment_id) SELECT ?,?,value,? FROM json_each(?)').bind(barber,date,id,JSON.stringify(times)));
 }
 try{await db.batch(ops)}catch(e){if(String(e).includes('UNIQUE'))throw h.err('Há atendimento ou bloqueio nesse período. Nenhum novo dia foi bloqueado.',409);throw e}
 await h.audit(db,u.id,barber,'professional.vacation.created',{start:b.start,end:b.end,days});return h.json({ok:true,days,group},201);
}

// Expand persisted reservation intervals, including legacy 30-minute slot rows.
export async function occupiedTimes(db,barber,date,exclude=''){
 const {results}=await db.prepare('SELECT DISTINCT a.id,a.time,a.duration FROM appointments a JOIN slots s ON s.appointment_id=a.id WHERE s.barber_id=? AND s.date=? AND a.id<>?').bind(barber,date,exclude).all();
 const times=new Set();for(const a of results){const start=toMinutes(a.time);for(let n=start;n<start+a.duration;n+=15)times.add(String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0'));}return [...times].map(time=>({time}));
}
export function reservationMinutes(service,extras=[]){return service.minutes+(['corte','barba','combo'].includes(service.id)?0:extras.reduce((n,s)=>n+s.minutes,0));}
