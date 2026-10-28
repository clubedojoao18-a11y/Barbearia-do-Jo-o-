const defaults={enabled:false,afterDays:45,cooldownDays:60,perRun:10};
const read=async(db,k)=>{const r=await db.prepare('SELECT value FROM config WHERE key=?').bind(k).first();return r?JSON.parse(r.value):null};
export async function recoverySettings(db){return {...defaults,...await read(db,'care_recovery_settings')}}
export async function marketingConsent(db,userId,enabled,source,now){
 const key='care_profile_'+userId,old=await read(db,key)||{style:'',conversation:'indiferente'};
 await db.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify({...old,marketing:enabled,marketingAt:now,marketingSource:source})).run();
 if(!enabled)await db.prepare("UPDATE wa_outbox SET status='canceled' WHERE kind='client_recovery' AND wa_id IN (SELECT wa_id FROM wa_contacts WHERE user_id=?) AND status IN ('pending','blocked')").bind(userId).run();
}
export async function recoveryEligible(db,userId,now){
 const profile=await read(db,'care_profile_'+userId);if(!profile?.marketing)return false;
 return !await db.prepare("SELECT id FROM appointments WHERE user_id=? AND status='scheduled' AND date>=? LIMIT 1").bind(userId,new Date(now*1000-10800000).toISOString().slice(0,10)).first();
}
export async function recoveryTick(env,c,h){
 const s=await recoverySettings(env.DB);if(!s.enabled||c.automation?.paused||!c.whatsapp?.enabled||!c.whatsapp?.templates?.client_recovery)return {paused:true,queued:0};
 const threshold=new Date((h.now()-s.afterDays*86400)*1000).toISOString().slice(0,10),cutoff=h.now()-s.cooldownDays*86400;
 const rows=(await env.DB.prepare("SELECT u.id,w.wa_id,MAX(a.date) last_visit FROM users u JOIN wa_contacts w ON w.user_id=u.id JOIN appointments a ON a.user_id=u.id AND a.status='done' WHERE u.disabled=0 AND u.role='client' AND w.consent=1 GROUP BY u.id,w.wa_id HAVING MAX(a.date)<=? ORDER BY last_visit LIMIT 500").bind(threshold).all()).results;
 let queued=0;for(const row of rows){if(queued>=s.perRun)break;if(!await recoveryEligible(env.DB,row.id,h.now()))continue;if(await env.DB.prepare("SELECT id FROM wa_outbox WHERE wa_id=? AND kind='client_recovery' AND created_at>=? LIMIT 1").bind(row.wa_id,cutoff).first())continue;
  // Reserve the cooldown atomically even across concurrent runs at midnight.
  const claim=await env.DB.prepare("INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(json_extract(config.value,'$.at') AS INTEGER)<?").bind('care_recovery_claim_'+row.id,JSON.stringify({at:h.now()}),cutoff).run();if(!Number(claim.meta?.changes??claim.changes))continue;
  const id='recovery:'+h.today()+':'+row.id,text='Olá! Quer reservar seu próximo cuidado? Consulte horários respondendo AGENDAR AAAA-MM-DD ou ATENDENTE para falar com a equipe. Para deixar de receber convites, responda PARAR OFERTAS.';
  const r=await env.DB.prepare("INSERT OR IGNORE INTO wa_outbox(id,wa_id,kind,text,created_at) VALUES(?,?,'client_recovery',?,?)").bind(id,row.wa_id,text,h.now()).run();queued+=Number(r.meta?.changes??r.changes)>0?1:0;
 }return {queued};
}
export async function recoveryRoutes(req,env,url,u,c,h){if(url.pathname!=='/api/growth/recovery')return null;h.requireOwner(u);
 if(req.method==='GET'){const settings=await recoverySettings(env.DB),counts=(await env.DB.prepare("SELECT status,COUNT(*) count FROM wa_outbox WHERE kind='client_recovery' GROUP BY status").all()).results;return h.json({settings,counts,note:'Somente clientes que autorizaram ofertas, vincularam WhatsApp e estão sem reserva futura. Envios respeitam intervalo por cliente, pausa e cota diária.'})}
 const b=await h.body(req);if(typeof b.enabled!=='boolean'||!Number.isInteger(b.afterDays)||b.afterDays<15||b.afterDays>365||!Number.isInteger(b.cooldownDays)||b.cooldownDays<30||b.cooldownDays>365||!Number.isInteger(b.perRun)||b.perRun<1||b.perRun>50)throw h.err('Revise os limites de recuperação.');
 if(b.enabled&&(!c.whatsapp?.enabled||!c.whatsapp?.templates?.client_recovery))throw h.err('Conecte o WhatsApp e cadastre o modelo de recuperação aprovado antes de ativar.',409);
 await env.DB.prepare("INSERT INTO config(key,value) VALUES('care_recovery_settings',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({enabled:b.enabled,afterDays:b.afterDays,cooldownDays:b.cooldownDays,perRun:b.perRun})).run();return h.json({ok:true});
}
export const RECOVERY_UI=String.raw`
const originalGrowthGo=growthGo;growthGo=async function(){const handled=await originalGrowthGo();if(S.isOwner){const d=await api('growth/recovery'),s=d.settings,div=document.createElement('section');div.className='card';div.style.marginTop='24px';div.innerHTML='<div class="card-body"><h2>Recuperação de clientes por WhatsApp</h2><p>'+E(d.note)+'</p><form id="recovery-settings"><label class="toggle"><input name="enabled" type="checkbox" '+(s.enabled?'checked':'')+'>Ativar convites para retorno</label>'+opField('Dias desde o último atendimento','afterDays','number',s.afterDays,'min="15" max="365" required')+opField('Intervalo mínimo entre convites (dias)','cooldownDays','number',s.cooldownDays,'min="30" max="365" required')+opField('Máximo preparado por execução','perRun','number',s.perRun,'min="1" max="50" required')+'<button class="btn primary">Salvar recuperação</button></form><p class="sub">O cliente autoriza ofertas nas preferências de atendimento ou enviando ACEITAR OFERTAS. PARAR OFERTAS revoga a autorização. Um modelo Meta aprovado é necessário fora da janela de atendimento.</p></div>';document.getElementById('app').append(div)}return handled};
document.addEventListener('submit',e=>{if(e.target.id!=='recovery-settings')return;e.preventDefault();const d=Object.fromEntries(new FormData(e.target));action(async()=>{await api('growth/recovery',{enabled:d.enabled==='on',afterDays:Number(d.afterDays),cooldownDays:Number(d.cooldownDays),perRun:Number(d.perRun)});await growthGo();toast('Configuração salva.');})});
`;
