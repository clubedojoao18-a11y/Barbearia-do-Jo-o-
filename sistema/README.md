# Clube do João

Sistema com áreas cliente, barbeiro e gestor. Página de entrada e cadastro públicos; APIs de dados exigem identidade e autorização. Dados persistidos em D1; a prévia usa SQLite em memória e identidade de teste exclusivamente no servidor local.

## Verificação

`npm test` verifica autorização, isolamento de dados, reserva atômica, cancelamento, regras de clubes, configuração, assinatura de webhook e JavaScript da interface.

## Ativação de recebimentos

Recebimentos só ficam disponíveis quando todos os segredos, confirmação assinada e aprovação de preços estiverem configurados. A presença isolada da chave de API não ativa cobranças.

1. Conectar a conta de recebimento de produção selecionada pelo proprietário. Configurar `STRIPE_SECRET_KEY` (preferir chave restrita com as permissões necessárias), `STRIPE_WEBHOOK_SECRET` e `STRIPE_CARD_CONFIGURATION` como segredos no ambiente hospedado. Não guardar chaves no repositório.
2. Configurar no processador um perfil de métodos de pagamento que habilite somente cartão. O checkout bloqueia cartões de débito e pré-pagos. O código usa a API `2026-08-26.dahlia`.
3. Liberar o acesso do Site a clientes e equipe quando autorizado pelo proprietário. O webhook `/api/webhook` precisa ser acessível pelo processador; a publicação privada inicial impede chamadas externas. As demais APIs exigem identidade e autorização.
4. Registrar o endpoint e os eventos `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `customer.subscription.updated` e `customer.subscription.deleted`. Ativar o portal do cliente para atualização de cartão e cancelamento.
5. Revisar preços e expediente no painel, testar o ciclo completo em conta de teste escolhida pelo proprietário e validar a entrega dos webhooks. Só depois definir `PAYMENTS_ENABLED=true` no ambiente de produção e publicar a configuração.

O primeiro período é proporcional até o dia escolhido; o checkout mostra o valor antes da contratação. Não há ativação por retorno de URL. Benefícios são liberados mediante confirmação assinada do processador e período pago vigente. Datas no Brasil usam America/Sao_Paulo.

## Acessos

A identidade é fornecida pela hospedagem. O gestor inicial é a conta `clubedojoao18@gmail.com`. Novos visitantes têm perfil de cliente. Somente o gestor pode atribuir o perfil de barbeiro. O perfil não é escolhido no navegador.

## Limites desta versão

Sem migração automática da base antiga de clientes ou históricos. Serviços usam blocos de 30 minutos. Limite One por mês civil. Pai e Filho usa o cadastro do titular e horários separados. Não há envio de mensagens automáticas. Produção do cartão, checkout real, reentregas do processador e compartilhamento externo ainda exigem validação após conexão da conta.

## Conexão pelo painel

O gestor pode conectar a conta Stripe em Configurações. As credenciais são verificadas na API e armazenadas como dados da conexão cifrados com AES-GCM; a chave mestra fica exclusivamente no segredo de ambiente CONNECTION_MASTER_KEY da hospedagem. Nenhuma chave é retornada nas respostas do painel. A ativação exige confirmação assinada do processador, aprovação dos valores e comando explícito do gestor. A InfinitePay aparece como indisponível para recorrência nesta versão.

/instalar fornece instalação PWA. O service worker não armazena dados pessoais ou financeiros em cache. O cadastro usa entrada nativa ChatGPT e conclusão do perfil.

## Atualização de gestão, acessos e indicadores

A migração 0001_permissions acrescenta permissões individuais, suspensão de acesso, autorizações por e-mail para gestores/barbeiros e registro de alterações. Somente o proprietário nomeia outros gestores e controla os acessos e a conta de recebimento. Os demais gestores podem ter finanças, clientes e configurações restringidos. O proprietário não pode perder o acesso. Novos gestores não entram automaticamente na lista de profissionais de atendimento.

Indicadores usam registros reais, com filtros de 7/30/90 dias, gráficos por serviço/dia e desempenho dos profissionais. Ticket médio se refere a valores registrados de avulsos concluídos, não a recebimento bancário. Mensalidades recebidas são obtidas apenas de faturas pagas. Barbeiros só acessam indicadores próprios e não recebem valores financeiros. Estratégias são sugestões baseadas em regras, sem envio automático de mensagens.

O assistente interpreta comandos simples por regras e prepara o formulário, sem reservar automaticamente. Voz usa Web Speech API quando disponível, mediante autorização explícita e suporte do navegador. Não há conexão com IA generativa nesta versão. A integração requer instalação do plugin OpenAI Developers, conta/API e configuração de custos antes de ser ativada.


## Revisão de segurança — 24/10/2026

- Scripts servidos em arquivo separado; CSP bloqueia scripts e eventos inline, objetos e bases externas e limita enquadramento ao próprio Site e ao ChatGPT. HTTPS/HSTS, nosniff, política de referência e limites de recursos são enviados também em respostas de erro e APIs.
- Toda alteração exige origem idêntica à do Site. Requisições cross-site e métodos não suportados são rejeitados antes de alterações. Webhooks usam sua assinatura própria, nunca autenticação do navegador.
- JSON deve ser objeto e é lido com limite de 20 KB em bytes, inclusive por streaming. Webhooks têm limite de 256 KB e validam estrutura, assinatura, prazo e ambiente; eventos de teste não validam contas de produção.
- Limites por identidade autenticada e minuto: 180 leituras, 30 alterações, 5 tentativas de conectar credenciais. Os contadores ficam em D1 em tabela criada de forma idempotente no primeiro acesso; expiram e são removidos automaticamente. Isso limita abuso autenticado, mas não substitui proteção de rede contra DDoS.
- Valores de agendamentos não são enviados à equipe sem autorização financeira. Perfis, suspensão e isolamento de registros continuam validados no servidor; identidade com e-mail divergente do cadastro exige revisão de acesso.
- Checkout inclui o plano e vencimento selecionados em metadados assinados pela Stripe. Confirmações antigas de outro plano não vinculam assinaturas; faturas são associadas pelo ID exato da assinatura, sem fallback por cliente. Sessões antigas sem esses metadados exigem revisão e nova contratação; não são liberadas automaticamente.
- Segredos ficam no ambiente hospedado ou na conexão AES-GCM, fora do repositório e das respostas. Erros internos não imprimem detalhes que possam conter segredos. O scanner executado em testes e no hook de commit bloqueia padrões de credenciais reais no código.

Validação: 28 testes locais de autorização, isolamento, integridade de reservas e pagamentos, proteção de origem, limites de requisições e payloads e credenciais. Prévia no navegador validou carregamento sob CSP e gravação de metas. Testes de pagamentos usam mocks; não foram realizadas cobranças ou teste de invasão externo. Monitoramento contínuo, rotação de chaves expostas, MFA e recuperação de conta dependem também das configurações da hospedagem e da Stripe. Nenhuma revisão garante ausência de outras vulnerabilidades.

## Conexão Stripe em produção — 24/10/2026

Integração habilitada por segredos de ambiente: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CARD_CONFIGURATION`, `STRIPE_ACCOUNT_ID`, `STRIPE_PORTAL_CONFIGURATION`, `STRIPE_WEBHOOK_VALIDATED=true` e `PAYMENTS_ENABLED=true`. O painel reconhece conexões administradas pelo servidor sem expor as credenciais. O portal usa sua configuração explícita: histórico, troca de cartão e cancelamento ao fim do período pago; alteração de plano pelo portal permanece desativada.

A confirmação de entrega foi feita com evento real e assinado de criação da configuração do portal, recebido e persistido em `webhook_events`. Nenhum pagamento real foi executado. A criação de sessão Checkout passou no ambiente de teste com a mesma estrutura de parâmetros da aplicação, incluindo recorrência em BRL, período inicial proporcional e restrições de financiamento do cartão. O teste de criação de sessão em produção foi bloqueado pela revisão automática e não foi contornado. A primeira contratação real ainda precisa ser acompanhada para validar cobrança e repasse completos.

30 testes locais passam, incluindo habilitação da conexão de servidor e ciclo de fatura paga, evento duplicado, renovação falhada e cancelamento. Stripe Tax não foi ativado nem configurado para adicionar impostos; obrigações fiscais continuam separadas da integração.

A conversão automática de moeda do Checkout foi desativada explicitamente: os clubes são contratados e cobrados em BRL, mesmo quando o navegador está fora do Brasil. Isso mantém o valor da fatura consistente com os indicadores em reais.

## WhatsApp oficial — 25/10/2026

A atualização usa WhatsApp Cloud API v26.0 com webhook assinado HMAC-SHA256 em `/api/whatsapp/webhook`. O painel WhatsApp permite ao proprietário conectar ID do número, token de acesso e segredo do aplicativo. A conexão é verificada na Meta e cifrada com a chave mestra já existente; o token de verificação do webhook é exibido uma vez. Assinar o campo `messages` na Meta. A presença de credenciais não ativa envios: o proprietário precisa autorizar no painel depois de validar sua conta/número e modelos aprovados.

Clientes geram um código privado de 128 bits no próprio perfil (15 minutos, uso único, apenas hash persistido) e enviam `VINCULAR código` ao número oficial. Um telefone no cadastro não é prova de identidade. Vincular autoriza confirmações, lembretes e avisos de pagamento; `SAIR` revoga e o aplicativo permite desvincular. Não há importação implícita de consentimento de clientes antigos.

O atendente disponível é guiado por comandos, sem IA generativa: `AGENDAR AAAA-MM-DD corte`, `MEUS HORÁRIOS`, `PLANO`, `CANCELAR número`, `REMARCAR número AAAA-MM-DD`, `CONFIRMAR`, `ATENDENTE`, `MENU`, `SAIR`. Serviços aceitos: corte, barba, combo, sobrancelha, pezinho, pele, hidratacao, depilacao. Cada escolha mostra serviço, profissional e valor/modalidade antes da confirmação. Reutiliza as validações dos clubes, permissões, agenda e reserva atômica do aplicativo. A remarcação preserva o original quando a nova reserva conflita. Profissionais bloqueiam intervalos na Agenda; os mesmos slots ficam indisponíveis no WhatsApp.

Painel restrito a gestores com acesso financeiro e contatos. Somente o proprietário altera conexão e ativação. Inclui conversas, tomada de atendimento humano, resposta na janela de atendimento, reservas do canal, fila de notificações, status de entrega e falhas. O corpo recebido não é retido; áudios e anexos não são interpretados. A equipe precisa pedir ao cliente que repita o pedido quando necessário. Não implementado: IA de conversa livre, leitura de áudio, histórico completo, visualização de mensagens no aplicativo WhatsApp Business ou garantia de coexistência; dependem das capacidades e configuração da conta Meta.

Pagamentos mantêm a configuração Stripe exclusiva de cartão. Webhooks criam intenções de aviso de falha/regularização na mesma transação dos registros financeiros. A entrega confirma consentimento e o estado atual da fatura; o link é uma sessão do portal Stripe do cliente correspondente. Não executa uma cobrança adicional. Eventos repetidos são deduplicados por fatura; uma fatura já paga não volta ao estado de falha por evento atrasado. Uma sessão do portal pode expirar; em caso de link expirado o cliente deve usar Gerenciar cartão no aplicativo.

Mensagens fora de 24h exigem os quatro modelos aprovados em pt_BR, configurados no painel: appointment_confirmed, appointment_reminder, payment_failed e payment_paid. Os nomes no painel são os nomes efetivamente aprovados na conta, não nomes criados automaticamente. Cada modelo recebe um parâmetro de texto no corpo, por exemplo: `Barbearia do João: {{1}}`. A Meta pode exigir ajustes e aprovação. Sem modelo o envio fica bloqueado no painel. Ao salvar os modelos, mensagens bloqueadas por falta de modelo voltam para a fila. Falhas de rede com entrega incerta não são reenviadas automaticamente, pois a API de envio não oferece uma chave de idempotência; o operador precisa revisar. Não há garantia de entrega exatamente uma vez pelo provedor.

Processamento imediato acompanha webhooks Stripe e mensagens recebidas quando a integração estiver ativa. Botão Processar avisos permite execução administrativa. O endpoint `/api/automation/tick` aceita apenas POST com `Authorization: Bearer AUTOMATION_JOB_TOKEN`, segredo a configurar na hospedagem; existe também o entrypoint Worker `scheduled`. **Nenhum agendamento periódico foi conectado nesta atualização.** Até configurar um executor periódico autorizado, lembretes/filas não têm execução garantida enquanto não houver webhook ou processamento manual. `AUTOMATION_SCHEDULE_CONFIGURED=true` só deve ser definido após verificar uma execução real do agendador. Não guardar o token em tarefas, prompts, URLs ou repositório.

Retenção: sem corpos de mensagens recebidas; códigos expiram em 15 minutos; rascunhos após 24h; IDs recebidos e envios encerrados por 90 dias, limpos no processamento. O vínculo e o registro de consentimento persistem até desvinculação. Dados financeiros seguem a base existente. A implantação cria tabelas vazias, preservando as anteriores. A conformidade operacional, aviso de privacidade, atendimento aos direitos dos titulares e gestão da conta Meta precisam de revisão pelo responsável.

Validação: 40 testes locais passam, incluindo canal WhatsApp com API Meta simulada, assinatura, identidade, conflito, cancelamento, remarcação atômica, acesso financeiro, pausa, consentimento, janela de atendimento, entrega incerta e pagamento falhado/regularizado com Stripe simulada. Build e validação ESM aprovados; painel verificado na prévia do navegador. Nenhuma mensagem ou cobrança real foi enviada; teste completo na Meta e Stripe continua pendente da conexão e de um cliente de teste autorizado.

## Central de exceções — 26/10/2026

O proprietário tem acesso ao menu Central de exceções e à API GET /api/system/diagnostics. Mostra dependências de configuração e contagens agregadas de filas; não envia mensagens nem cobra clientes. Um agendador declarado sem processamento bem-sucedido recente gera alerta. Processamento recente não comprova execução periódica. Auditoria, evidências e limites: docs/AUDITORIA-2026-10-26.md.
