// A view selected by the authenticated owner, never a replacement login.
export async function profileContext(req,db,actor,h){
 const selected=req.headers.get('x-joao-profile')||'management';
 if(selected==='management')return {user:actor,selected,other:false};
 h.requireOwner(actor);
 let user;
 if(selected==='self')user={...actor,role:'barber',permissions:'{}',_workspaceOwner:false};
 else if(selected.startsWith('professional:')){
  const id=selected.slice(13);
  if(!(await h.professionals(db,h.config)).some(x=>x.id===id))throw h.err('Profissional indisponível. Volte à gestão.',409);
  user=await db.prepare('SELECT * FROM users WHERE id=? AND disabled=0').bind(id).first();
  if(!user)throw h.err('Profissional indisponível. Volte à gestão.',409);
  user={...user,permissions:user.role==='manager'?'{}':user.permissions,role:'barber',_workspaceOwner:false};
 }else throw h.err('Perfil inválido.',400);
 // Operational views cannot inherit management permissions from a manager.
 if(user.id===actor.id)user.permissions='{}';
 return {user,selected,other:user.id!==actor.id};
}

export const PROFILE_UI=String.raw`
function profileStorageKey(){return 'joao-profile:'+location.pathname.replace(/\/$/,'')}
function selectedProfile(){try{return sessionStorage.getItem(profileStorageKey())||'management'}catch{return 'management'}}
function profileHeaders(){const profile=selectedProfile();return profile==='management'?{}:{'X-Joao-Profile':profile}}
function profileControl(){
 let box=document.getElementById('profile-switch-control');
 if(!S.profileSwitch){if(box)box.remove();return}
 if(!box){box=document.createElement('div');box.id='profile-switch-control';document.getElementById('nav').before(box)}
 box.innerHTML='<button class="btn" id="profile-switch" style="width:100%;margin-bottom:12px">Trocar perfil</button>'+(S.profileSwitch.selected!=='management'?'<p class="profile-note" style="margin:0 0 12px">Perfil ativo: <b>'+E(S.user.name)+'</b> · Barbeiro<br><button class="btn small" data-switch-profile="management">Voltar à gestão</button></p>':'');
}
function profileSwitchDialog(){
 const x=S.profileSwitch;if(!x)return;const d=document.getElementById('dialog');
 const choices=[['management','Gestão','Administrar a barbearia'],['self','Meu perfil de barbeiro','Minha agenda e meu desempenho'],...x.professionals.map(p=>['professional:'+p.id,p.name,'Área profissional'])];
 d.innerHTML='<h2>Trocar perfil</h2><p class="sub">Continue conectado e escolha o espaço que quer usar.</p><div class="stack">'+choices.map(([id,name,note])=>'<button class="btn" data-switch-profile="'+E(id)+'" '+(x.selected===id?'disabled aria-current="true"':'')+' style="text-align:left;white-space:normal"><span><b>'+E(name)+'</b><br><small>'+E(note)+(x.selected===id?' · Perfil atual':'')+'</small></span></button>').join('')+'</div><p class="profile-note">Disponível somente para o proprietário. As finanças pessoais de outros profissionais permanecem privadas.</p><button class="btn" id="close-dialog">Voltar</button>';d.showModal();
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='profile-switch')profileSwitchDialog();if(b.dataset.switchProfile)action(async()=>{
 const selected=b.dataset.switchProfile;
 // Validate before committing the per-tab choice. Reload clears all prior profile data.
 const r=await fetch('/api/me',{headers:selected==='management'?{}:{'X-Joao-Profile':selected}}),j=await r.json();
 if(!r.ok)throw Error(j.error||'Perfil indisponível.');
 sessionStorage.setItem(profileStorageKey(),selected);location.hash='home';location.reload();
})});
`;
