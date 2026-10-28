# Continuidade — 28/10/2026

## Fonte e preservação

Projeto original `appgprj_6ada23b73f588191957e07fead79b735`, público, aberto na versão 16, fonte `91f10615091a54ea61f64e1c0461310cab2287ee`. O GitHub estava anterior à fonte Sites: faltavam Studio, backups, academia, recorrência EU SOU e módulos de varejo. A fonte Sites foi usada como base. Nenhuma migração, alteração de preço, importação de clientes ou mudança de assinatura foi executada. Banco, armazenamento e público permanecem vinculados ao projeto existente.

## Credenciais

Sites confirmou `OPENAI_API_KEY`, `CONNECTION_MASTER_KEY` e as configurações Stripe cadastradas como segredos. Valores não foram lidos nem substituídos. Cadastro não comprova validade. A chave OpenAI existente foi preservada, conforme autorização para reutilizar antes de criar outra.

## Implementação desta revisão

- WhatsApp interpreta linguagem natural pela Responses API, com saída estruturada restrita. O modelo apenas traduz intenção para os comandos existentes. Não confirma reservas nem altera dados diretamente.
- Agendamento, consulta, remarcação e cancelamento usam a mesma agenda. Remarcação/cancelamento/reserva exigem `CONFIRMAR`; plano, pagamento, bloqueios, dependente, prazos e conflitos são revalidados pelo servidor. Falha ou limite da IA mantém comandos disponíveis. Solicitação de humano pausa o robô.
- IA compartilha a cota diária atômica do Studio. Texto recebido não é gravado em histórico de conversa e a chamada usa `store:false`; a mensagem é processada pela OpenAI. Não se enviam cadastro completo, telefone ou e-mail do cliente como contexto. O proprietário pode desligar a interpretação no painel WhatsApp.
- Central de exceções: botão para verificar acesso da IA, conta Stripe, configuração de cartão, número Meta e aprovação/formato dos quatro modelos pt_BR. Verificação não cria cobrança nem envia mensagem. ID da conta WhatsApp Business pode ser informado na conexão para consulta dos modelos.
- Observações de desafio WhatsApp e assinaturas válidas Meta/Stripe ficam registradas apenas como horários, sem payload de clientes. Não equivalem a confirmação de entrega ou liquidação.
- Studio pode verificar perfil e cota de publicação de cada Instagram, separadamente para Barbearia e EU SOU. Não declara publicação concluída sem `media_publish` confirmado.
- Executor MCP passa a processar também avisos WhatsApp das empresas licenciadas, usando exclusivamente as conexões próprias de cada empresa. Falha de conteúdo em uma área não impede o processamento das demais.

## Evidência Stripe de produção

Consulta somente leitura pela conexão Stripe autorizada da conta “Barbearia do João”, `acct_1UCpshICt82zehbS`, em modo live:

- Webhook habilitado na URL `https://barbearia-joao-clubes.clubedojoao18.chatgpt.site/api/webhook`, API `2026-08-26.dahlia`, com eventos de checkout, fatura paga/falha/autenticação e assinatura atualizada/cancelada.
- Configuração ativa de pagamentos com cartão e Apple Pay; Pix/boleto desligados. A recorrência do sistema usa configuração de cartão, sem recorrência por Pix/boleto.
- Listagem completa retornou zero assinaturas e zero PaymentIntents, `has_more:false`. Não existe evidência de primeira compra, renovação, recuperação ou repasse real nessa conta nesta consulta.
- Não foi criada cobrança real nem alterada configuração de pagamentos.

## Limites de verificação

O plugin MCP do site consta instalado, mas suas ferramentas autenticadas não estão expostas nesta sessão. Acesso HTTP com o token Sites chegou ao aplicativo sem identidade de visitante e recebeu 401, corretamente. Não foram forjados cabeçalhos de identidade para contornar esse controle. Verificações internas de produção e criação de backup precisam ser executadas pelo painel autenticado do proprietário ou pela conexão MCP disponível em outra sessão. Rejeição HTTP anterior ao aplicativo sem token não comprova falha de webhook.

Há uma rotina horária já vinculada e habilitada, “Processar rotinas da Barbearia do João”, fuso America/Sao_Paulo. Foi preservada sem duplicação. Cadastro da rotina não comprova execução bem-sucedida. Cada execução deve registrar resultados reais e respeitar pausas/cotas/conexões existentes.

## Situação das seis frentes

| Frente | Código disponível | Ainda necessário para confirmar operação |
|---|---|---|
| WhatsApp | Agenda compartilhada, confirmação, consulta, remarcação, cancelamento, lembretes, cobrança, assinatura de webhook, opt-in e humano | Acesso à conta Meta/número, token e segredo válidos, desafio real, modelos aprovados, ida/volta e execução periódica comprovada. Não foi possível inspecionar segredos guardados no banco nesta sessão. |
| Atendente IA | Interpretação natural com confirmação e regras do servidor; fallback e cota | Testar a chave existente no servidor e uma conversa real após conexão Meta. Áudios/imagens continuam humanos. |
| Stripe | Checkout e mensalidades no cartão, webhooks, portal de atualização, recuperação, bloqueio de inadimplentes | Primeiro checkout do titular, renovação/falha/recuperação em teste e evidência de pagamento/repasse real. Conta live ainda sem transações. |
| Instagram | Textos, artes, carrosséis, fila, dois projetos e publicação oficial | Tokens/permissões dos dois perfis, conteúdo autorizado, confirmação real e executor funcionando. Cortes automáticos de aulas não estão implementados; fonte conferida contém aulas textuais, sem vídeos para processar. Exige vídeos autorizados e pipeline de vídeo. |
| Venda do sistema | Piloto até 20 áreas, mensalidades de licença, fundador vinculado a EU SOU pago, identidade própria e isolamento de tabelas/conexões | Valores comerciais aprovados/configurados, pagamento de teste e validação operacional por empresa antes de escala. Não foram inventados preços ou cadastros. |
| Vendas e gestão | Ofertas de produtos/extras no agendamento, estoque, comanda, recuperação, indicações e sugestões por indicadores | Catálogo e históricos reais, configurações aprovadas de campanhas e canais funcionando. Sugestões por indicadores são regras; não executam mudanças comerciais automaticamente. |

## Validação e retorno

Testes automatizados usam SQLite em memória e provedores simulados. Cobrem concorrência, isolamento, plano inadimplente, confirmação explícita, remarcação/cancelamento natural, falha/cota da IA, humano e verificações sem cobrança/envio. Build e validação ESM são separados da comprovação de produção. Não houve QA visual: a ferramenta de navegador prevista pelo ambiente Sites não está disponível.

Rollback de código: republicar a versão 16 pelo Sites, preservando o banco e os segredos. Não executar migrações inversas nem apagar tabelas. Backup/restauração de produção ainda não foi comprovado nesta sessão.
