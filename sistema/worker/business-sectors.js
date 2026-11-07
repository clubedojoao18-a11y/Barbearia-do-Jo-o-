// A common operational core; specialist capabilities are explicitly progressive.
const core=['clientes','equipe','caixa','estoque','conteudo'];
export const BUSINESS_SECTORS=[
 {id:'barbearia',label:'Barbearia',modules:[...core,'agenda','clubes','comunidade'],upcoming:[]},
 {id:'beleza',label:'Beleza e cuidados pessoais',modules:[...core,'agenda'],upcoming:[]},
 {id:'servicos',label:'Prestação de serviços',modules:[...core,'agenda'],upcoming:['Projetos e ordens de serviço']},
 {id:'varejo',label:'Comércio e varejo',modules:core,upcoming:[]},
 {id:'alimentacao',label:'Alimentação',modules:core,upcoming:['Mesas, comandas de restaurante e cozinha']},
 {id:'hospedagem',label:'Hotelaria e hospedagem',modules:core,upcoming:['Quartos, reservas e diárias']},
 {id:'educacao',label:'Educação',modules:core,upcoming:['Gestão escolar e matrículas por turma']},
 {id:'projetos',label:'Agências e projetos',modules:core,upcoming:['Projetos, tarefas e horas por entrega']},
 {id:'outro',label:'Outro ramo',modules:core,upcoming:['Módulos específicos do ramo']}
];
const sizes=new Set(['individual','pequena','media','grande']);
export function normalizeBusiness(input={}){
 const sector=input.sector===undefined?'barbearia':input.sector;
 const def=BUSINESS_SECTORS.find(x=>x.id===sector);
 const size=input.size===undefined?'individual':input.size;
 const label=sector==='outro'?String(input.sectorLabel||input.label||'').trim():def?.label;
 if(!def||!sizes.has(size)||!label||label.length>80||/[<>\x00-\x1f]/.test(label))throw Object.assign(new Error('Escolha ramo e porte válidos; descreva o ramo ao selecionar Outro.'),{status:400});
 return {sector,label,size};
}
export function businessCapabilities(company){
 const business=normalizeBusiness(company.business||{}),def=BUSINESS_SECTORS.find(x=>x.id===business.sector);
 return {...business,modules:[...def.modules],upcoming:[...def.upcoming],pilot:true,multiUnit:false};
}
const agenda=['appointments','appointment-status','appointment-confirm','appointment-reschedule','appointment-receipt','agenda-block','slots','professional-hours','agenda-vacation','catalog','booking-rules','waitlist','analytics','goals','assistant-prepare'];
const legacy=['membership','checkout','portal','invoices','club-commissions','commissions','community-billing','academy','eusou','growth','retention','care','dependents','pricing','business-health','whatsapp'];
export function sectorAllowsAPI(company,path){
 const caps=businessCapabilities(company);if(caps.sector==='barbearia')return true;
 const first=path.replace(/^\/api\//,'').split('/')[0];
 if(legacy.includes(first))return false;
 if(agenda.includes(first))return caps.modules.includes('agenda');
 return true;
}
export function sectorSeedStatements(db,company,defaultServices){
 if(businessCapabilities(company).sector==='barbearia')return [];
 // No catalog prices, stock, bookings or financial records are invented for a new sector.
 const prefix='w_'+company.id+'_';
 return [db.prepare('INSERT INTO "'+prefix+'config"(key,value) VALUES(?,?)').bind('services',JSON.stringify(Object.fromEntries(defaultServices.map(s=>[s.id,{active:false}]))))];
}

export function businessDocument(html){return html.replace('Sua barbearia, organizada','Sua empresa, organizada').replaceAll('CLUBE & EXPERIÊNCIA','GESTÃO & ROTINA')}

export const BUSINESS_UI=String.raw`
function genericBusiness(){return S.workspace?.business?.sector&&S.workspace.business.sector!=='barbearia'}
function businessPageAllowed(page){if(!genericBusiness())return true;const core=['home','clients','operations','profile','brand','settings','access','system','backups','studio','creator','work','personal','purchases','shop'];return core.includes(page)||S.workspace.business.modules.includes('agenda')&&['agenda','book','catalog','waitlist'].includes(page)}
async function businessGo(page){
 if(!genericBusiness()||page!=='home')return false;
 const business=S.workspace.business,staff=S.user.role==='manager'&&S.permissions.finance;let stats='';
 if(staff){const d=await api('operations');stats='<div class="stats">'+stat('Entradas registradas',money(d.totals.received),'Registros do período, sem estimar saldo bancário','card')+stat('Saídas registradas',money(d.totals.spent),'Registros do período','card')+stat('Produtos cadastrados',d.products.length,'Itens disponíveis no catálogo da empresa','card')+'</div>'}
 S.page='home';navigation();document.getElementById('app').innerHTML=title(S.workspace.name,business.label+' · Sua operação em um lugar.')+stats+'<section class="card"><div class="card-body"><h2>Seu próximo passo</h2><div class="toolbar">'+(staff?btn('Caixa e estoque','operations'):'')+(S.permissions.clients?btn('Clientes','clients'):'')+(business.modules.includes('agenda')?btn(S.user.role==='client'?'Consultar serviços':'Agenda',S.user.role==='client'?'book':'agenda'):'')+btn('Meu perfil','profile')+'</div><p class="sub">Ferramentas disponíveis: '+E(business.modules.map(x=>({clientes:'clientes',equipe:'equipe',caixa:'caixa',estoque:'estoque',conteudo:'conteúdo',agenda:'agenda'}[x]||x)).join(', '))+'.</p>'+(business.upcoming.length?'<p class="profile-note">Em desenvolvimento: '+E(business.upcoming.join('; '))+'.</p>':'')+'<p class="sub">Piloto com área isolada por empresa. Gestão de múltiplas unidades ainda não disponível.</p></div></section>'+foot();history.replaceState(null,'',location.pathname+'#home');return true;
}
`;
