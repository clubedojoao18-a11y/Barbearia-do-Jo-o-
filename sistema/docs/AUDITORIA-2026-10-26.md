# Recuperação e auditoria inicial — 26/10/2026

## Evidências

Projeto recuperado do repositório fonte do Sites: appgprj_6ada23b73f588191957e07fead79b735, commit original f5add19ce5c843c0a44b530b3766f213b7fedde3, versão hospedada 7. Acesso público mantido, dados de APIs sujeitos à identidade e autorização.

A consulta de estrutura de produção encontrou 18 tabelas, incluindo users, appointments, memberships, invoices, config, webhook_events e tabelas WhatsApp. Não foram exportados dados pessoais, executadas migrações ou alterados registros de produção.

O ambiente registra nomes de oito segredos relativos à Stripe e à cifragem. Seus valores são ocultos. Isso confirma configuração cadastrada, não validade atual, cobrança real ou repasse. Credenciais WhatsApp também podem estar cifradas em config: ausência de segredo no ambiente não comprova ausência de conexão.

A consulta Sites retornou lista vazia de automações. O código tem entrypoint scheduled e endpoint autenticado de processamento, mas o manifesto não declara um agendador. Não há evidência coletada de execução periódica externa.

A conexão GitHub retornou lista vazia de repositórios acessíveis. O repositório fonte do Sites foi recuperado normalmente. Não foi criado repositório GitHub privado: a ferramenta disponível não oferece criação de repositórios. É necessário um repositório privado acessível pela integração para o espelhamento solicitado.

## Implementado nesta etapa

Central de exceções no menu do proprietário e GET /api/system/diagnostics. A API valida autorização no servidor e apresenta configuração de pagamentos, WhatsApp, última execução, filas agregadas e pendências. Não retorna telefones, corpos de mensagens ou credenciais. Não efetua envios, cobranças ou reprocessamento.

Distingue declaração do agendador de processamento recente: um sucesso manual ou por webhook não comprova execução periódica. Limite de observação: 15 minutos. O diagnóstico de pagamento não executa transação real.

## Testes

40 testes originais passaram. Dois testes acrescentados verificam autorização exclusiva do proprietário, ausência de segredos e dados de mensagens, fila de entrega incerta, agendador declarado sem execução, falha recente e execução obsoleta. Total: 42 testes aprovados. Scanner de segredos, build e validação ESM aprovados. Painel aberto e navegado na prévia local com identidade de teste.

Esses testes usam SQLite em memória e APIs de provedores simuladas. Não constituem teste de invasão, comprovação de entrega Meta ou ciclo de pagamento bancário. Nenhuma vulnerabilidade nova foi confirmada ou anunciada como corrigida nesta etapa.

## Limites da arquitetura recuperada

Aplicativo de uma única empresa, proprietário fixo e catálogo de serviços em código. Não permite oferecer acesso a empresas independentes com isolamento multiempresa. A área de cursos Academia do João é outro Site identificado, ainda não auditado ou integrado nesta etapa.

WhatsApp funciona por comandos no código; IA generativa, transcrição, Instagram e processamento FFmpeg não existem neste aplicativo. Worker tem limite de 128 MB e não comporta a execução de FFmpeg como um processo local. Processamento audiovisual precisa de executor separado, fila e armazenamento com custos limitados.

## Próximos trabalhos e dependências

1. Conferir conexão WhatsApp no painel do proprietário, número oficial e modelos Meta; testar com destinatário consentido. Não pedir segredos no chat.
2. Conectar e verificar executor periódico compatível com a hospedagem. Não marcar como configurado antes de observar execução.
3. Preparar multiempresa em ambiente separado, com teste de isolamento, migração reversível e revisão antes de liberar terceiros.
4. Configurar conta/API de IA, orçamento mensal e franquias; conectar Instagram dos titulares. Sem essas dependências não há automação externa real.
5. Auditar Academia e pacote EU SOU, consolidar cursos, comunidade e tabelas comerciais ainda não aprovadas.
6. Pesquisa CashBarber, comparação comercial, planilha de custos e materiais didáticos permanecem pendentes; nenhum preço de fornecedor foi inventado.

## Custos e publicação

Nenhum fornecedor ou plano pago foi contratado. A central usa a hospedagem e o banco existentes; há consumo incremental de leituras por consulta, sem preço confirmado nesta auditoria. Não se afirma custo operacional zero. Preços de cursos, Pix e assinaturas existentes não foram alterados.
