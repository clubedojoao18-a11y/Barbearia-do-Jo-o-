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

Na primeira etapa, o plugin MCP do site constava instalado, mas suas ferramentas autenticadas não estavam expostas nesta sessão. A continuação abaixo supera parte dessas limitações. Acesso HTTP com o token Sites chegou ao aplicativo sem identidade de visitante e recebeu 401, corretamente. Não foram forjados cabeçalhos de identidade para contornar esse controle. Verificações internas de produção e criação de backup precisam ser executadas pelo painel autenticado do proprietário ou pela conexão MCP disponível em outra sessão. Rejeição HTTP anterior ao aplicativo sem token não comprova falha de webhook.

Há uma rotina horária já vinculada e habilitada, “Processar rotinas da Barbearia do João”, fuso America/Sao_Paulo. Foi preservada sem duplicação. Cadastro da rotina não comprova execução bem-sucedida. Cada execução deve registrar resultados reais e respeitar pausas/cotas/conexões existentes.

## Situação das seis frentes

| Frente | Código disponível | Ainda necessário para confirmar operação |
|---|---|---|
| WhatsApp | Agenda compartilhada, confirmação, consulta, remarcação, cancelamento, lembretes, cobrança, assinatura de webhook, opt-in e humano | Acesso à conta Meta/número, token e segredo válidos, desafio real, modelos aprovados, ida/volta e execução periódica comprovada. Não foi possível inspecionar segredos guardados no banco nesta sessão. |
| Atendente IA | Interpretação natural com confirmação e regras do servidor; fallback e cota | Testar a chave existente no servidor e uma conversa real após conexão Meta. Áudios/imagens continuam humanos. |
| Stripe | Checkout e mensalidades no cartão, webhooks, portal de atualização, recuperação, bloqueio de inadimplentes | Primeiro checkout do titular, renovação/falha/recuperação em teste e evidência de pagamento/repasse real. Conta live ainda sem transações. |
| Instagram | Textos, artes, carrosséis, fila, dois projetos e publicação oficial | Tokens/permissões dos dois perfis, conteúdo autorizado, confirmação real e executor funcionando. A continuação implementou cortes automáticos com transcrição, seleção de trechos, FFmpeg, legendas e Reels. Faltam vídeos autorizados e a conexão do executor, conforme OPERACAO-VIDEO.md. |
| Venda do sistema | Piloto até 20 áreas, mensalidades de licença, fundador vinculado a EU SOU pago, identidade própria e isolamento de tabelas/conexões | Valores comerciais aprovados/configurados, pagamento de teste e validação operacional por empresa antes de escala. Não foram inventados preços ou cadastros. |
| Vendas e gestão | Ofertas de produtos/extras no agendamento, estoque, comanda, recuperação, indicações e sugestões por indicadores | Catálogo e históricos reais, configurações aprovadas de campanhas e canais funcionando. Sugestões por indicadores são regras; não executam mudanças comerciais automaticamente. |

## Validação e retorno

Testes automatizados usam SQLite em memória e provedores simulados. Cobrem concorrência, isolamento, plano inadimplente, confirmação explícita, remarcação/cancelamento natural, falha/cota da IA, humano e verificações sem cobrança/envio. Build e validação ESM são separados da comprovação de produção. Não houve QA visual: a ferramenta de navegador prevista pelo ambiente Sites não está disponível.

Rollback de código: republicar a versão 16 pelo Sites, preservando o banco e os segredos. Não executar migrações inversas nem apagar tabelas. Backup/restauração de produção ainda não foi comprovado nesta sessão.


## Continuação autorizada: evidências adicionais

- Consulta do banco de produção confirmou ausência de contatos e conexão Meta, sem empresas provisionadas e sem matrículas EU SOU. Nenhum desses cadastros foi inventado.
- Foi criado acesso de manutenção com segredo próprio no cofre Sites. Ele não simula identidade de visitante e permite somente inventário agregado, verificação de provedores, criação de backup e exportação autenticada de um backup para ensaio isolado. Não expõe SQL nem permite apagar/restaurar produção.
- Verificação real no servidor: OpenAI respondeu HTTP 200; Stripe confirmou charges_enabled=true, payouts_enabled=true e configuração exclusivamente baseada em cartão. WhatsApp retornou configured=false.
- Novo backup de produção salvo e lido de volta com verificação criptográfica. A cópia foi restaurada em SQLite separado com integridade ok, zero erros de chave estrangeira e contagens conferidas: 3 usuários, 1 agendamento, 2 memberships, zero faturas e produtos. Dados e banco locais do ensaio foram apagados. O backup criptografado permanece no R2 protegido.
- Foram executadas operações reais na API Stripe em sandbox separado (não na conta live): assinatura mensal de teste de R$ 9,90 ficou active, com primeira fatura paid; cartão de recusa deixou outra assinatura incomplete e fatura open após uma tentativa, sem pagamento. Ambas foram canceladas ao terminar. Isso comprova sucesso/recusa no provedor de teste, não renovação, recuperação ou repasse em produção. O conector não disponibilizou os endpoints necessários para completar a repetição de pagamento nesta sessão; a tentativa de substituir pelo identificador genérico do cartão foi rejeitada sem alterar a assinatura.
- Pipeline de vídeo implementado: upload privado R2, fila com lease, transcrição, seleção de trechos, renderização FFmpeg com legendas, entrada idempotente no Studio e publicação oficial Reels. Teste integrado usa FFmpeg real com vídeo sintético e simula somente OpenAI/Meta; confirma geração de MP4 e espera da confirmação de publicação. Não foi enviado vídeo de cliente nem publicado conteúdo fictício.
- Workflow Renderizar vídeos preparado para GitHub Actions, sem inserir segredos no repositório. O proprietário deve cadastrar o endereço e o token mostrados uma vez na própria interface. Fontes de vídeo autorizadas e conexões Meta ainda são necessárias.

- Recuperação ativa de clientes concluída no código: consentimento específico de marketing separado dos avisos operacionais; limites de inatividade, intervalo e destinatários; deduplicação; pausa; revalidação de reserva futura e revogação antes do envio. Cliente autoriza nas preferências ou por ACEITAR OFERTAS e revoga por PARAR OFERTAS/SAIR. Campanha permanece pausada até conexão Meta e aprovação do modelo de retorno. Não houve disparo real.
- O workflow de validação existente foi mantido, com uma etapa adicional para disponibilizar FFmpeg quando ausente, exigido pelo novo teste de renderização real.


### Geração real de IA: pendência externa confirmada

O teste real de interpretação com uma mensagem sintética retornou HTTP 429, código `billing_not_active`. Portanto, a chave e a leitura de modelos funcionam, mas geração de texto, atendimento natural, transcrição e criação de artes dependem da ativação do faturamento OpenAI do projeto da chave existente. Não foi criada uma chave nova nem usado outro projeto para contornar essa condição. O atendimento por comandos continua disponível após conectar o WhatsApp.

### Entrega técnica final

136 testes locais aprovados, incluindo FFmpeg real, isolamento de empresas, recuperação com consentimento, revalidação de reserva e revogação. Build e validação ESM aprovados. Nenhuma migração destrutiva, preço, assinatura ou cliente de produção alterado. Meta e publicação real continuam sem credenciais verificadas; o executor de vídeo exige os dois segredos no GitHub e aulas autorizadas. A primeira compra e a validação de renovação/recuperação real devem ser feitas pelo titular. Os testes de sandbox não equivalem a esses eventos de produção.
