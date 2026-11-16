import {professionalWindow} from './agenda-rules.js';
export async function calendarData(env,u,c,url,h){
 h.staff(u);
 const start=url.searchParams.get('start'),end=url.searchParams.get('end'),selected=url.searchParams.get('barber')||'';
 if(!h.validDate(start||'')||!h.validDate(end||'')||start>end||(Date.parse(end)-Date.parse(start))/86400000>41)throw h.err('Selecione um período de até 42 dias.');
 if(u.role==='barber'&&selected&&selected!==u.id)throw h.err('Sem permissão.',403);
 let people=await h.professionals(env.DB,c);
 if(u.role==='barber')people=people.filter(p=>p.id===u.id);
 if(selected)people=people.filter(p=>p.id===selected);
 const args=[start,end],where=['a.date>=?','a.date<=?'];
 if(u.role==='barber'||selected){where.push('a.barber_id=?');args.push(u.role==='barber'?u.id:selected)}
 let records=await h.all(env.DB,'SELECT a.*,u.name,b.name barber_name FROM appointments a JOIN users u ON u.id=a.user_id LEFT JOIN users b ON b.id=a.barber_id WHERE '+where.join(' AND ')+" ORDER BY a.date,a.time LIMIT 2001",...args);
 if(records.length>2000)throw h.err('Há muitos atendimentos. Selecione um profissional ou um período menor.',409);
 records=await h.withAddonDetails(env.DB,records);
 const overlaps=new Set((await h.all(env.DB,"SELECT substr(key,16) id FROM config WHERE key GLOB 'agenda_overlap:*'")).map(x=>x.id));
 records=records.map(a=>({...a,overlap:overlaps.has(a.id)}));
 for(const a of records)if(!people.some(p=>p.id===a.barber_id))people.push({id:a.barber_id,name:a.barber_name||'Profissional anterior',inactive:true});
 const days=[];for(let ms=Date.parse(start+'T12:00:00Z');ms<=Date.parse(end+'T12:00:00Z');ms+=86400000){const date=new Date(ms).toISOString().slice(0,10);days.push({date,professionals:people.map(p=>({...p,periods:p.inactive?[]:professionalWindow(c,p.id,date)?.periods||[]}))})}
 return {start,end,people,days,records};
}
