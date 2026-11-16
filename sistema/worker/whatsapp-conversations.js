const retention=90*86400;
const validPhone=phone=>typeof phone==='string'&&/^\d{8,16}$/.test(phone);
export async function waMessageStatement(env,message,h){
 const text=message.type==='text'?message.text?.body:message[message.type]?.caption;
 const content={type:String(message.type||'unknown').slice(0,40),text:typeof text==='string'?text.slice(0,16000):'',timestamp:Math.min(Number(message.timestamp)||h.now(),h.now())};
 // Reuse the tenant-scoped config store and its encrypted backup support.
 const value={...await h.sealCredentials(content,env),createdAt:h.now()};
 return env.DB.prepare('INSERT OR IGNORE INTO config(key,value) VALUES(?,?)').bind('wa_message:'+message.from+':'+message.id,JSON.stringify(value));
}
export async function waConversationHistory(env,phone,h){
 if(!validPhone(phone))throw Object.assign(new Error('Telefone inválido.'),{status:400});
 const cutoff=h.now()-retention;
 const incoming=await env.DB.prepare("SELECT key,value FROM config WHERE key GLOB ? AND json_extract(value,'$.createdAt')>=? ORDER BY json_extract(value,'$.createdAt') DESC,key DESC LIMIT 100").bind('wa_message:'+phone+':*',cutoff).all();
 const messages=[];
 for(const row of incoming.results){const record=JSON.parse(row.value);const value=await h.openCredentials(record,env);messages.push({id:row.key,direction:'in',...value,createdAt:record.createdAt});}
 const outgoing=await env.DB.prepare('SELECT id,text,status,created_at FROM wa_outbox WHERE wa_id=? AND created_at>=? ORDER BY created_at DESC,id DESC LIMIT 100').bind(phone,cutoff).all();
 for(const row of outgoing.results)messages.push({id:row.id,direction:'out',type:'text',text:row.text,status:row.status,timestamp:row.created_at,createdAt:row.created_at});
 messages.sort((a,b)=>a.timestamp-b.timestamp||a.createdAt-b.createdAt||a.id.localeCompare(b.id));
 return {phone,messages:messages.slice(-100),retentionDays:90,historicalImport:false};
}
export const WA_CONVERSATIONS_UI=String.raw`
document.addEventListener('click',event=>{const el=event.target.closest('button[data-wa-history]');if(!el)return;action(async()=>{
 const r=await api('whatsapp/admin/conversation?'+new URLSearchParams({wa:el.dataset.waHistory}));
 const d=document.getElementById('dialog');d.innerHTML='<h2>Conversa · '+E(r.phone)+'</h2><p class="sub">Últimas 100 mensagens · até 90 dias. O histórico anterior à integração não foi importado.</p><div style="max-height:55vh;overflow:auto">'+r.messages.map(m=>'<div class="card-body" style="border-bottom:1px solid var(--border);overflow-wrap:anywhere"><strong>'+E(m.direction==='in'?'Cliente':'Barbearia')+'</strong> <small>'+E(new Date(m.timestamp*1000).toLocaleString('pt-BR'))+(m.status?' · '+E(m.status):'')+'</small><p style="white-space:pre-wrap">'+E(m.text||'['+m.type+' · consulte o WhatsApp no celular]')+'</p></div>').join('')+(!r.messages.length?'<p>Nenhuma mensagem disponível ainda.</p>':'')+'</div><button class="btn" id="close-dialog">Fechar</button>';d.showModal();
})});
`;
