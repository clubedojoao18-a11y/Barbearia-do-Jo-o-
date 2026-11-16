import {clientAccessRows,inviteClient} from './client-invites.js';
const one=(db,q,...p)=>db.prepare(q).bind(...p).first();
export function normalizeCustomerPhone(value){
 let phone=String(value||'').replace(/[ ()+.-]/g,'');
 if(/^\d{10,11}$/.test(phone))phone='55'+phone;
 if(!/^55[1-9]\d{9,10}$/.test(phone))throw new Error('Informe um telefone brasileiro com DDD.');
 return phone;
}
export async function manualClientRoutes(req,env,url,u,c,h){
 const p=url.pathname;if(!['/api/clients','/api/clients/invite','/api/management-booking'].includes(p))return null;
 h.staff(u);h.allowed(u,c,'clients');h.allowed(u,c,'contacts');
 if(p==='/api/clients'&&req.method==='GET'){
  const q=(url.searchParams.get('q')||'').trim();if(q.length>100)throw h.err('Busca muito longa.');
  const term='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
  const {results}=await env.DB.prepare("SELECT id,name,email,phone,disabled FROM users WHERE role='client' AND disabled=0 AND (name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\') ORDER BY name LIMIT 100").bind(term,term,term).all();
  return h.json({clients:await clientAccessRows(env.DB,results)});
 }
 if(p==='/api/clients'&&req.method==='POST'){
  const b=await h.body(req),name=typeof b.name==='string'?b.name.trim():'',email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
  if(name.length<2||name.length>100||email.length>200||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw h.err('Confira o nome e o e-mail do cliente.');
  if(email===(env.DB.workspaceOwnerEmail||'clubedojoao18@gmail.com'))throw h.err('Este e-mail pertence ao proprietário.',409);
  let phone;try{phone=normalizeCustomerPhone(b.phone)}catch(e){throw h.err(e.message)}
  const existing=await one(env.DB,"SELECT id FROM users WHERE (?<>'' AND lower(email)=?) OR replace(replace(replace(replace(replace(replace(phone,' ',''),'+',''),'-',''),'(',''),')',''),'.','') IN (?,?) LIMIT 1",email,email,phone,phone.slice(2));
  if(existing)throw h.err('Já existe um cadastro com esse e-mail ou telefone. Busque o cliente antes de continuar.',409);
  const id='manual-'+crypto.randomUUID();
  const ops=[env.DB.prepare("INSERT INTO users(id,email,name,phone,role) VALUES(?,?,?,?,'client')").bind(id,email,name,phone),env.DB.prepare('INSERT INTO config(key,value) VALUES(?,?)').bind('client_identity:phone:'+phone,JSON.stringify({id}))];
  if(email)ops.push(env.DB.prepare('INSERT INTO config(key,value) VALUES(?,?)').bind('client_identity:email:'+email,JSON.stringify({id})));
  ops.push(env.DB.prepare('INSERT INTO audit_log(id,actor_id,target_id,action,detail) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),u.id,id,'client.created',JSON.stringify({source:'management'})));
  try{await env.DB.batch(ops)}catch(e){if(String(e).includes('UNIQUE'))throw h.err('Este cliente foi cadastrado em outra solicitação. Atualize a busca.',409);throw e}
  const client={id,name,email,phone};let invitation=null;if(b.inviteConsent===true){try{invitation=await inviteClient(env,url,client,h)}catch(e){invitation={status:'blocked',error_code:e.status===409?'CONTACT_MISMATCH':'INVITE_UNAVAILABLE'}}}
  return h.json({ok:true,client,invitation},201);
 }
 if(p==='/api/clients/invite'&&req.method==='POST'){const b=await h.body(req);if(b.consent!==true)throw h.err('Confirme que o cliente autorizou o convite de acesso pelo WhatsApp.');const client=await one(env.DB,"SELECT id,name,phone FROM users WHERE id=? AND role='client' AND disabled=0",b.id);if(!client)throw h.err('Cliente não encontrado.',404);return h.json({invitation:await inviteClient(env,url,client,h)});}
 if(p==='/api/management-booking'&&req.method==='POST'){
  h.allowed(u,c,'book');const b=await h.body(req);
  if(typeof b.customer!=='string'||!await one(env.DB,"SELECT id FROM users WHERE id=? AND role='client' AND disabled=0",b.customer))throw h.err('Selecione um cliente ativo.');
  if(u.role==='barber'&&b.barber!==u.id)throw h.err('O profissional só pode reservar na própria agenda.',403);if(b.mode!==undefined&&!['normal','overlap'].includes(b.mode))throw h.err('Escolha agendamento normal ou encaixe.');const result=await h.createAppointment(env,u,c,{customer:b.customer,service:b.service,date:b.date,time:b.time,barber:b.barber,kind:b.kind},{channel:b.mode==='overlap'?'staff_overlap':'management',staffBooking:true,allowOverlap:b.mode==='overlap'});
  return h.json(result,201);
 }
 throw h.err('Método indisponível.',405);
}
