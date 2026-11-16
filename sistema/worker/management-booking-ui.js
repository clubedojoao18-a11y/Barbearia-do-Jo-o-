export const MANAGEMENT_BOOKING_UI=String.raw`
let managementBookingClients=[],managementSlotsVersion=0,managementSearchVersion=0;
function managementClientDialog(fromBooking=false){
 const d=document.getElementById('dialog');d.innerHTML='<h2>Cadastrar cliente</h2><form id="management-client-form" data-from-booking="'+(fromBooking?'yes':'no')+'"><div class="field"><label>Nome completo<input name="name" required minlength="2" maxlength="100" autocomplete="name"></label></div><div class="field"><label>WhatsApp com DDD<input name="phone" type="tel" required maxlength="22" autocomplete="tel" placeholder="(24) 99999-9999"></label></div><div class="field"><label>E-mail (opcional)<input name="email" type="email" maxlength="200" autocomplete="email"></label></div><label class="toggle"><input type="checkbox" name="inviteConsent"> O cliente autorizou receber o convite de acesso pelo WhatsApp. Enviar automaticamente ao salvar.</label><p class="sub">O cadastro permite agendar pela equipe. Para ativar o acesso por e-mail e senha, o cliente confirma o e-mail e o telefone na área de cadastro.</p><div class="toolbar"><button class="btn primary" type="submit">Salvar cliente</button><button class="btn" type="button" id="'+(fromBooking?'management-booking':'close-dialog')+'">Voltar</button></div></form>';if(!d.open)d.showModal();
}
function managementClientOptions(selected=''){
 const field=document.querySelector('#management-booking-form [name="customer"]');if(!field)return;
 field.innerHTML='<option value="">Selecione o cliente</option>'+managementBookingClients.map(x=>'<option value="'+E(x.id)+'" '+(x.id===selected?'selected':'')+'>'+E(x.name)+' · '+E(x.phone||x.email)+'</option>').join('');
}
async function managementFindClients(){
 const version=++managementSearchVersion,form=document.getElementById('management-booking-form');if(!form)return;
 const q=form.elements.search.value,selected=form.elements.customer.value,r=await api('clients?q='+encodeURIComponent(q));
 if(version!==managementSearchVersion||!document.contains(form))return;
 managementBookingClients=r.clients;managementClientOptions(selected);
 document.getElementById('management-search-note').textContent=r.clients.length?'Até 100 resultados. Refine a busca se precisar.':'Nenhum cliente encontrado. Cadastre o cliente para continuar.';
}
async function managementBookingDialog(selectedClient){
 const d=document.getElementById('dialog');d.innerHTML='<h2>Agendar cliente ou adicionar encaixe</h2><p class="sub">Selecione ou cadastre o cliente. Escolha agendamento normal ou encaixe com sobreposição.</p><form id="management-booking-form"><div class="toolbar"><input name="search" type="search" placeholder="Buscar cliente por nome, e-mail ou telefone" aria-label="Buscar cliente"><button class="btn" type="button" id="management-find-client">Buscar</button><button class="btn" type="button" id="management-new-client">Cadastrar cliente</button></div><p class="sub" id="management-search-note" role="status"></p><div class="form-grid"><div class="field"><label>Cliente<select name="customer" required><option value="">Carregando clientes…</option></select></label></div><div class="field"><label>Serviço<select name="service">'+S.services.map(s=>'<option value="'+E(s.id)+'">'+E(s.name)+' · '+s.minutes+' min</option>').join('')+'</select></label></div><div class="field"><label>Profissional<select name="barber">'+S.barbers.filter(b=>S.user.role!=='barber'||b.id===S.user.id).map(b=>'<option value="'+E(b.id)+'" '+(b.id===S.agendaBarber?'selected':'')+'>'+E(b.name)+'</option>').join('')+'</select></label></div><div class="field"><label>Data<input name="date" type="date" min="'+S.today+'" value="'+E(S.agendaDate||S.today)+'" required></label></div><div class="field"><label>Modalidade<select name="kind"><option value="single">Avulso</option><option value="club">Clube</option></select></label></div><div class="field"><label>Tipo de reserva<select name="mode"><option value="normal">Agendamento normal · somente horário livre</option><option value="overlap">Encaixe · permite choque de horário</option></select></label></div><div class="field" id="management-time-field"><label>Horário livre<select name="time" required><option value="">Carregando horários…</option></select></label></div></div><p class="sub">O agendamento não cobra o cliente. O agendamento normal ocupa a duração completa. O encaixe pode sobrepor outros atendimentos, respeitando expediente e bloqueios.</p><div class="toolbar"><button class="btn primary" type="submit">Confirmar horário</button><button class="btn" type="button" id="close-dialog">Voltar</button></div></form>';if(!d.open)d.showModal();
 const form=document.getElementById('management-booking-form');if(selectedClient)form.elements.search.value=selectedClient.phone;
 await managementFindClients();if(selectedClient)managementClientOptions(selectedClient.id);await managementLoadSlots();
}
async function managementLoadSlots(){
 const version=++managementSlotsVersion,f=document.getElementById('management-booking-form');if(!f)return;
 const previous=f.elements.time?.value||'';if(f.elements.mode.value==='overlap'){document.getElementById('management-time-field').innerHTML='<label>Horário do encaixe<input name="time" type="time" step="900" required value="'+E(previous)+'"></label><p class="sub">Permite sobreposição com outros atendimentos.</p>';return}document.getElementById('management-time-field').innerHTML='<label>Horário livre<select name="time" required></select></label>';const field=f.elements.time,service=S.services.find(x=>x.id===f.elements.service.value);field.innerHTML='<option value="">Carregando horários…</option>';
 const r=await api('slots?availability=1&date='+encodeURIComponent(f.elements.date.value)+'&barber='+encodeURIComponent(f.elements.barber.value));
 if(version!==managementSlotsVersion||!document.contains(f))return;
 const busy=new Set(r.busy.map(x=>x.time)),slots=[],toTime=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 for(const period of r.periods)for(let minute=calMinute(period.open);minute+service.minutes<=calMinute(period.close);minute+=45){
  const time=toTime(minute),start=Date.parse(f.elements.date.value+'T'+time+':00-03:00');
  if(start<Date.now()+Number(S.bookingRules?.leadMinutes||0)*60000)continue;
  let available=true;for(let n=minute;n<minute+service.minutes;n+=15)if(busy.has(toTime(n))){available=false;break}
  if(available)slots.push(time);
 }
 field.innerHTML='<option value="">'+(slots.length?'Selecione o horário':'Sem horário livre neste dia')+'</option>'+slots.map(t=>'<option '+(t===previous?'selected ':'')+'value="'+t+'">'+t+'</option>').join('');
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='create-client')managementClientDialog();if(b.id==='management-new-client')managementClientDialog(true);if(b.id==='management-booking')action(()=>managementBookingDialog());if(b.id==='management-find-client')action(managementFindClients)});
document.addEventListener('change',e=>{if(e.target.closest('#management-booking-form')&&['date','barber','service','mode'].includes(e.target.name))action(managementLoadSlots)});
document.addEventListener('submit',e=>{
 const form=e.target;if(!['management-client-form','management-booking-form'].includes(form.id))return;e.preventDefault();
 const button=form.querySelector('[type="submit"]');if(button.disabled)return;button.disabled=true;
 action(async()=>{try{
  const data=Object.fromEntries(new FormData(form));
  if(form.id==='management-client-form'){
   const result=await api('clients',{...data,inviteConsent:data.inviteConsent==='on'});await refresh();
   if(form.dataset.fromBooking==='yes')await managementBookingDialog(result.client);else{document.getElementById('dialog').close();await go('clients')}
   toast(result.invitation?inviteStatusText(result.invitation):'Cliente cadastrado. O convite pode ser enviado em Clientes.');
  }else{
   await api('management-booking',{customer:data.customer,service:data.service,date:data.date,time:data.time,barber:data.barber,kind:data.kind,mode:data.mode});
   document.getElementById('dialog').close();S.agendaDate=data.date;await refresh();await go('agenda');toast('Horário reservado para o cliente.');
  }
 }finally{button.disabled=false}});
});
`;

export const CLIENT_ACCESS_UI=String.raw`
function inviteStatusText(x){return ({sent:'Convite aceito pelo WhatsApp; entrega ainda não confirmada.',delivered:'Convite entregue.',read:'Convite lido.',pending:'Convite pendente. Confira conexão e pausa dos envios.',blocked:x.error_code==='TEMPLATE_REQUIRED'?'Convite aguardando modelo aprovado pela Meta.':'Convite bloqueado. Revise a conexão do WhatsApp.',failed:'O WhatsApp recusou o convite. Confira a conexão.',uncertain:'Entrega incerta. Confira o WhatsApp antes de tentar novamente.',sending:'Envio em andamento.',canceled:'Convite cancelado.'})[x.status]||'Convite aguardando envio.'}
function clientAccessBadge(u){const active=u.accessStatus==='active',paused=u.accessStatus==='paused';return '<span class="pill '+(active?'green':paused?'yellow':'')+'">'+(active?'Acesso ativo':paused?'Acesso pausado':'Só cadastro da equipe')+'</span>'+(u.invitation?'<small>'+E(inviteStatusText(u.invitation))+'</small>':'')+(u.role==='client'&&S.permissions.contacts&&!active&&!paused?'<button class="btn small" data-client-invite="'+E(u.id)+'">Enviar convite</button>':'')}
document.addEventListener('change',e=>{if(e.target.id==='client-access-filter'){S.clientAccessFilter=e.target.value;document.getElementById('client-table').innerHTML=clientsTable(document.getElementById('client-search').value)}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-client-invite]');if(!b)return;const d=document.getElementById('dialog');d.innerHTML='<h2>Convidar para o aplicativo</h2><p>O cliente receberá um link para ativar o acesso e instruções para instalar o aplicativo. O convite não cria uma senha nem confirma seus contatos.</p><form id="client-invite-form" data-client="'+E(b.dataset.clientInvite)+'"><label class="toggle"><input type="checkbox" name="consent" required> O cliente autorizou este convite pelo WhatsApp.</label><button class="btn primary" type="submit">Enviar convite</button><button class="btn" id="close-dialog" type="button">Voltar</button></form>';d.showModal()});
document.addEventListener('submit',e=>{if(e.target.id!=='client-invite-form')return;e.preventDefault();const f=e.target,b=f.querySelector('[type="submit"]');if(b.disabled)return;b.disabled=true;action(async()=>{try{const r=await api('clients/invite',{id:f.dataset.client,consent:f.elements.consent.checked});document.getElementById('dialog').close();await refresh();await go('clients');toast(inviteStatusText(r.invitation))}finally{b.disabled=false}})});
`;
