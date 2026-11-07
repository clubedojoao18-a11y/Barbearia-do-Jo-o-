# Conexão Meta existente — 05/11/2026

O proprietário autorizou concluir WhatsApp e Instagram e utilizar a navegação na nuvem. A conta Instagram da barbearia foi localizada na Meta, com acesso de conteúdo já atribuído ao usuário de sistema da integração WhatsApp.

O Studio pode reutilizar a credencial Meta deste mesmo espaço sem expor ou transportar o token pelo navegador. Exige proprietário, projeto, ID e usuário esperado; consulta cota de publicação e confirma a identidade antes de salvar a conexão cifrada. Falha de permissão ou perfil divergente não grava credenciais. Canais permanecem pausados ao conectar.

Não cria tokens, não concede permissões, não muda o número WhatsApp e não ativa campanhas. As empresas licenciadas continuam usando seu ambiente e banco isolados. Aprovação de templates, webhook e entrega reais exigem evidência própria.

## Perfil profissional

O pedido foi ampliado para três perfis. A conexão Instagram pessoal fica em studio_credentials.professionals, indexada pela identidade autenticada, com resumo sem segredos no criador. A reutilização de credencial empresarial exige proprietário; parâmetro userId do cliente nunca define o dono da conexão. Rascunhos pessoais deixam de aparecer nas configurações gerais; creatorLimits continua disponível às validações de cota.

192 testes passaram. Em produção, a tentativa de conectar a barbearia pela credencial Meta atual foi recusada pelo provedor. Isso não comprova token de Instagram válido. Na Meta, webhook WhatsApp já aponta ao endpoint correto e messages está assinado em v26.0. Nenhuma mensagem de cliente foi enviada como teste. EU SOU continua conectado pelo Metricool. Os demais vínculos dependem de autorização Meta válida, não apenas de créditos OpenAI.
