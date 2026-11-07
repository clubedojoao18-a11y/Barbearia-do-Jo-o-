// Project identities are deliberately independent. The business keeps its custom brand.
export const PROJECT_IDENTITIES={
 barbearia:{name:'Barbearia do João',primary:'#493326',accent:'#b4babd',background:'#f6f3ee',ink:'#ffffff',font:'classic',tagline:'Cuidado com identidade.',direction:'Serviço premium e concreto. Tabaco suave, cinza metálico discreto e branco; títulos fortes em sans serif, grade assimétrica com espaço livre. Uma coroa mínima pode aparecer; nunca tesouras ou navalhas. Evite ornamentos dourados e brasões.',cta:'Consulte os horários disponíveis no aplicativo.'},
 eusou:{name:'EU SOU — Identidade & Propósito',primary:'#28344a',accent:'#b54f38',background:'#fff8ef',ink:'#28344a',font:'classic',tagline:'Identidade antes da performance.',direction:'Editorial humano e arejado: papel marfim, azul tinta e terracota. Títulos serifados expressivos, números de capítulo, linhas de jornada e composições com bastante respiro. Alterne páginas tipográficas, perguntas e pequenos exercícios. Sem coroas, metal, emblemas de luxo ou símbolos de barbearia.',cta:'Conheça a comunidade EU SOU pelo perfil.'},
 pessoal:{name:'João Vitor Reis',primary:'#173f74',accent:'#f0c851',background:'#edf3fb',ink:'#173f74',font:'modern',tagline:'Da prática para a próxima ideia.',direction:'Caderno de campo autoral: azul cobalto, amarelo pontual e papel azul muito claro. Sans serif forte e notas curtas em estilo monoespaçado, marcações e diagramas simples. Ensino, negócios e reflexões responsáveis; sem simular depoimentos, caligrafia do autor ou fotografias. Sem coroas, tabaco, metal ou o editorial serifado do EU SOU.',cta:'Converse pelo Direct sobre o tema.'}
};
export function projectIdentity(project,business={},personalName=''){
 const identity=PROJECT_IDENTITIES[project];
 if(!identity)throw new RangeError('Projeto inválido');
 const result=project==='barbearia'?{...identity,...business}:{...identity};
 if(project==='pessoal'&&personalName)result.name=personalName;
 return result;
}

export function projectArtPrompt(job,brand){
 const vertical=['story','story_video','reel'].includes(job.format),slide=job.slides[job.assets?.length||0];
 return 'Crie uma arte '+(vertical?'vertical':'quadrada')+' para Instagram. Texto exato pt-BR, hierarquia clara, contraste alto e margens amplas. '+
 'Marca: '+brand.name+'. Direção própria: '+brand.direction+' Paleta: principal '+brand.primary+', destaque '+brand.accent+', fundo '+brand.background+', texto '+brand.ink+'. '+
 'Varie a composição conforme o assunto, sem repetir um template único. Sem pessoas, logos inventados, resultados ou fotografias fictícias. '+
 'Slide '+((job.assets?.length||0)+1)+'/'+job.slides.length+'. Título: '+slide.title+'. Corpo: '+slide.body+'. Rodapé discreto com nome da marca. Nenhum texto adicional.';
}
