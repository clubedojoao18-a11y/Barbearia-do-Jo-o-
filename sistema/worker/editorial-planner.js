/**
 * Editorial production planner for Barbearia do João and EU SOU.
 * Generates reviewable drafts only; never posts or contacts external services.
 */
const topics={
  barbearia:[
    ['Clube de cortes','Explique como funcionam os planos e quando vale a pena ser assinante.'],
    ['Antes e depois','Mostre um resultado autorizado, sem prometer resultados iguais para todos.'],
    ['Agenda da semana','Convide clientes a consultar os horários disponíveis no aplicativo.'],
    ['Cuidados em casa','Compartilhe uma orientação simples de cuidado com cabelo ou barba.'],
    ['Bastidores','Apresente a rotina e o cuidado com higiene e atendimento.'],
  ],
  eusou:[
    ['Identidade profissional','Compartilhe uma reflexão sobre identidade e propósito na barbearia.'],
    ['História do educador','Convide um educador a contar uma experiência profissional.'],
    ['Dica técnica','Mostre uma técnica com autorização do profissional e do modelo.'],
    ['Gestão consciente','Compartilhe uma prática de organização e atendimento.'],
    ['Comunidade','Explique o valor de aprender e trocar experiências entre profissionais.'],
  ],
};
function validDate(value){
  return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
    !Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
}
export function editorialDrafts({project='barbearia',startDate,count=7}={}){
  if(!Object.hasOwn(topics,project))throw new RangeError('Projeto inválido');
  if(!validDate(startDate))throw new RangeError('Data inválida');
  if(!Number.isInteger(count)||count<1||count>90)throw new RangeError('Quantidade inválida');
  const start=Date.parse(startDate+'T12:00:00Z');
  return Array.from({length:count},(_,i)=>{
    const [title,brief]=topics[project][i%topics[project].length];
    return {project,title,brief,date:new Date(start+i*86400000).toISOString().slice(0,10),
      status:'draft',authorized:false,assetUrl:'',platform:'instagram',
      requiresReview:true,requiresMediaRights:true};
  });
}
