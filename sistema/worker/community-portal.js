export const COMMUNITY_PAGES=['eusou','community','academy','profile'];
export function communityDocument(html){
 return html.replace('<title>Clube do João · Sua barbearia, organizada</title>','<title>EU SOU · Área de membros</title>')
 .replace(/<meta name="description"[^>]*>/,'<meta name="description" content="Sua formação, aulas e participação na comunidade EU SOU.">')
 .replaceAll('BARBEARIA<br>DO JOÃO','EU SOU').replaceAll('CLUBE & EXPERIÊNCIA','IDENTIDADE & PROPÓSITO')
 .replaceAll('Clube do João','EU SOU').replaceAll('Barbearia do João','EU SOU')
 .replaceAll('Todo dia, sua melhor versão.','Sua história merece direção.').replaceAll('Um cuidado que faz parte de você.','Formação, identidade e comunidade.')
 .replaceAll('/signout-with-chatgpt?return_to=%2F','/signout-with-chatgpt?return_to=%2Feusou')
 .replace(/<svg class="crown"[\s\S]*?<\/svg>/g,'<span class="community-mark" aria-hidden="true">eu</span>')
 .replace('</head>','<style>:root{--brown:#28344a;--tan:#b54f38;--bg:#fff8ef;--ink:#28344a}.side,.bottom-nav,.btn.primary{background:#28344a}.side .brand strong{font:32px Georgia,serif;letter-spacing:.04em}.community-mark{display:inline-grid;place-items:center;width:38px;height:38px;border:1px solid currentColor;border-radius:50%;font:italic 23px Georgia,serif}.content h1{font-family:Georgia,serif}.side .brand small{letter-spacing:.13em}.community-entry{max-width:680px;margin:70px auto;padding:36px;background:#fff;border:1px solid #edddcb;border-radius:24px}.community-entry a{margin-top:20px}</style></head>');
}
export const COMMUNITY_PORTAL_UI=String.raw`
function communityNavigation(){
 const nav=[['eusou','people','Comunidade'],['academy','crown','Aulas'],['community','card','Minha participação'],['profile','user','Meu perfil']];
 const button=([p,i,t])=>'<button data-go="'+p+'" class="'+(S.page===p?'active':'')+'"'+(S.page===p?' aria-current="page"':'')+'>'+I(i)+E(t)+'</button>';
 document.getElementById('nav').innerHTML=nav.map(button).join('')+(S.isOwner?'<a class="btn" href="/">Abrir gestão ↗</a>':'');
 document.getElementById('bottom-nav').innerHTML=nav.map(button).join('');
 document.getElementById('username').textContent=S.user.name;
 document.getElementById('avatar').textContent=S.user.name.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();
 document.getElementById('rolelabel').textContent='Comunidade EU SOU';
 document.getElementById('navlabel').textContent='SEU ESPAÇO EU SOU';
 document.getElementById('crumb').textContent=nav.find(x=>x[0]===S.page)?.[2]||'Comunidade';
}
function communitySignIn(){
 publicShell();document.getElementById('app').innerHTML='<section class="community-entry"><span class="eyebrow muted">EU SOU — Identidade &amp; Propósito</span><h1>Seu próximo passo começa aqui.</h1><p>Entre para ver sua matrícula, estudar e acompanhar seu progresso. O acesso aos conteúdos respeita sua participação registrada.</p><a class="btn primary" href="/signin-with-chatgpt?return_to=%2Feusou%2Fmembros%23eusou" target="_top">Entrar na comunidade ↗</a> <a class="btn" href="/eusou">Conhecer o EU SOU</a></section>';
}
`;
