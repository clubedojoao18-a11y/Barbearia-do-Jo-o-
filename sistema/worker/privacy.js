const contact='clubedojoao18@gmail.com';
const pages={
 '/privacidade':{title:'Política de privacidade',body:`
 <p>A Barbearia do João utiliza este sistema para cadastro, agenda, clubes, pagamentos e atendimento. Contato sobre seus dados: <a href="mailto:${contact}">${contact}</a>.</p>
 <h2>Dados e finalidades</h2>
 <p>O sistema trata nome, telefone, e-mail e identificador de acesso, agendamentos, serviços, vínculos com clubes, consentimentos e registros de pagamento para organizar os atendimentos e administrar os serviços contratados. Profissionais e gestores acessam informações conforme suas funções.</p>
 <h2>WhatsApp e Instagram</h2>
 <p>Quando conectados, os canais da Meta processam mensagens e informações necessárias ao atendimento e à publicação de conteúdo autorizado. O WhatsApp utiliza telefone, vínculo com o cadastro, consentimentos, identificadores e estados de envio. O texto recebido é processado para atendimento, sem manter um histórico completo dos corpos das mensagens no sistema. Áudios e imagens dependem de atendimento humano nesta versão.</p>
 <p>Avisos pelo WhatsApp dependem de vínculo e consentimento. Ofertas exigem autorização específica de marketing. Envie <strong>SAIR</strong> para desativar avisos ou <strong>PARAR OFERTAS</strong> para revogar ofertas. A opção de desvincular o WhatsApp fica no perfil.</p>
 <h2>Provedores e armazenamento</h2>
 <p>A infraestrutura do ChatGPT Sites e Cloudflare hospeda a aplicação e seus registros. A Meta opera WhatsApp e Instagram; a Stripe processa pagamentos com cartão. Não envie dados de cartão por mensagem. Esses provedores também tratam dados conforme suas próprias políticas.</p>
 <p>A geração e interpretação pela API paga da OpenAI estão desativadas na operação atual. Conteúdos preparados pelo proprietário no ChatGPT Work podem ser salvos como rascunhos. Qualquer uso que você fizer diretamente do ChatGPT está sujeito às configurações e políticas desse serviço.</p>
 <h2>Retenção e proteção</h2>
 <p>Códigos de vínculo do WhatsApp expiram em 15 minutos. Solicitações de atendimento pendentes são limpas após 24 horas sem interação. A rotina de limpeza remove identificadores de mensagens recebidas e registros de envios encerrados com mais de 90 dias. O funcionamento dessas limpezas depende da execução das rotinas do sistema.</p>
 <p>Cadastro, agenda, consentimentos e registros financeiros permanecem enquanto necessários à operação e à apuração de solicitações, obrigações ou pendências. Há controle de acesso, credenciais de integração protegidas e backups criptografados. Uma solicitação de exclusão também deve considerar os backups e registros que precisem ser conservados.</p>
 <h2>Consulta, correção e exclusão</h2>
 <p>Solicite informações, correção, revogação de consentimento ou exclusão pelo e-mail de contato. Podemos pedir apenas informações necessárias para confirmar sua identidade. Veja as <a href="/exclusao-de-dados">instruções de exclusão de dados</a>.</p>`},
 '/exclusao-de-dados':{title:'Exclusão de dados',body:`
 <p>Para solicitar a exclusão de dados tratados pela Barbearia do João, escreva para <a href="mailto:${contact}?subject=Solicita%C3%A7%C3%A3o%20de%20exclus%C3%A3o%20de%20dados">${contact}</a> com o assunto <strong>Solicitação de exclusão de dados</strong>.</p>
 <ol><li>Informe seu nome e o telefone ou e-mail associado ao cadastro.</li><li>Diga se deseja excluir o cadastro, desvincular WhatsApp ou remover dados associados ao uso de Facebook ou Instagram.</li><li>A barbearia verificará a titularidade e informará o resultado e eventuais registros que precisem ser conservados.</li></ol>
 <p>Não envie senha, código de acesso, dados de cartão ou documentos completos no primeiro contato. Se for necessário confirmar a identidade, a equipe orientará o procedimento.</p>
 <h2>Parar mensagens</h2><p>Você pode enviar <strong>SAIR</strong> no WhatsApp para desativar avisos, <strong>PARAR OFERTAS</strong> para revogar ofertas ou desvincular o canal no seu perfil. Isso não exclui automaticamente todo o cadastro, nem cancela uma assinatura ou pendência de pagamento.</p>
 <p>A exclusão é analisada pela equipe; esta página não executa exclusões automáticas. Registros necessários a pagamentos, obrigações ou apuração de pendências podem exigir conservação. Consulte a <a href="/privacidade">política de privacidade</a>.</p>`}
};
export function privacyPage(req,env,url){
 const page=pages[url.pathname];if(!page)return null;
 if(env.WORKSPACE)return new Response('Página indisponível nesta empresa.',{status:404});
 if(!['GET','HEAD'].includes(req.method))return new Response('Método não permitido.',{status:405,headers:{Allow:'GET, HEAD'}});
 const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.title} · Barbearia do João</title><style>body{margin:0;background:#f5f3ef;color:#302721;font:17px/1.65 system-ui,sans-serif}main{max-width:760px;margin:40px auto;padding:32px;background:#fff;border-radius:16px}h1{font-size:2rem;line-height:1.2}h2{font-size:1.25rem;margin-top:30px}a{color:#62402d;text-underline-offset:3px}.eyebrow{font-size:13px;letter-spacing:.08em;text-transform:uppercase}footer{border-top:1px solid #ddd;padding-top:22px;margin-top:32px;font-size:14px}@media(max-width:600px){main{margin:0;padding:24px;border-radius:0}h1{font-size:1.8rem}}</style></head><body><main><p class="eyebrow">Barbearia do João</p><h1>${page.title}</h1><p>Atualizado em 30 de outubro de 2026.</p>${page.body}<footer><a href="/">Voltar ao sistema</a> · <a href="/privacidade">Privacidade</a> · <a href="/exclusao-de-dados">Excluir meus dados</a></footer></main></body></html>`;
 return new Response(req.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com"}});
}
