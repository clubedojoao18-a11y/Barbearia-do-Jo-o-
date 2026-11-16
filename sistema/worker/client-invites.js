export async function clientAccessRows(db,rows){
 if(!rows.length)return rows;
 const active=new Set(),byId=new Map();
 for(let offset=0;offset<rows.length;offset+=40){const ids=rows.slice(offset,offset+40).map(r=>r.id),marks=ids.map(()=>'?').join(',');
 const {results}=await db.prepare("SELECT key FROM config WHERE key IN ("+marks+") OR key IN ("+marks+")").bind(...ids.map(id=>'auth:account:'+id),...ids.map(id=>'auth:external:'+id)).all();for(const x of results)active.add(x.key);
 const {results:invites}=await db.prepare("SELECT id,status,error_code FROM wa_outbox WHERE id IN ("+marks+")").bind(...ids.map(id=>'client-invite:'+id)).all();for(const x of invites)byId.set(x.id,x);
 }
 return rows.map(r=>({...r,accessStatus:r.disabled?'paused':active.has('auth:account:'+r.id)||active.has('auth:external:'+r.id)||!r.id.startsWith('manual-')?'active':'staff_only',invitation:byId.get('client-invite:'+r.id)||null}));
}
export async function inviteClient(env,url,user,h){
 const id='client-invite:'+user.id,old=await h.first(env.DB,'SELECT status FROM wa_outbox WHERE id=?',id);
 if(old&&['sent','delivered','read','sending','uncertain'].includes(old.status))return {status:old.status};
 const contact=await h.first(env.DB,'SELECT user_id FROM wa_contacts WHERE wa_id=?',user.phone);
 if(contact?.user_id&&contact.user_id!==user.id)throw h.err('Este WhatsApp está vinculado a outro cadastro. Revise antes de convidar.',409);
 const link=url.origin+(url.basePath||'')+'/acesso#register',text='Olá, '+user.name+'! Seu cadastro na Barbearia do João está pronto. Ative seu acesso e confirme seus contatos: '+link+' . Depois, use a opção Instalar aplicativo para adicionar o app à tela inicial. Se não solicitou este cadastro, ignore. Envie SAIR para não receber novos avisos.';
 await env.DB.batch([
 env.DB.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('client_invite:'+user.id,JSON.stringify({consent:true,at:h.now()})),
 env.DB.prepare('INSERT INTO wa_contacts(wa_id,user_id) VALUES(?,?) ON CONFLICT(wa_id) DO UPDATE SET user_id=excluded.user_id').bind(user.phone,user.id),
 env.DB.prepare("INSERT INTO wa_outbox(id,wa_id,kind,text,created_at) VALUES(?,?,'client_invite',?,?) ON CONFLICT(id) DO UPDATE SET status='pending',error_code=NULL WHERE status IN ('blocked','failed','canceled','pending')").bind(id,user.phone,text,h.now())
 ]);
 try{await h.sendInvite(env,id)}catch{await env.DB.prepare("UPDATE wa_outbox SET status='blocked',error_code='CONNECTION_UNAVAILABLE' WHERE id=? AND status='pending'").bind(id).run()}
 const result=await h.first(env.DB,'SELECT status,error_code FROM wa_outbox WHERE id=?',id);return result;
}
