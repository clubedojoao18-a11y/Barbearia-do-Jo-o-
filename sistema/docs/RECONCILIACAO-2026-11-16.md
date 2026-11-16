# Reconciliação e JOANA unificada — 16/11/2026

## Referência e preservação

Comparação integral dos diretórios de aplicação: GitHub/main `09c7a38` e fonte Sites v68 `6f45ceb76057e7fffd2775be3bcd4dde4fb13a64`. A fonte Sites continha evoluções posteriores de agenda, autenticação, convites, backup e JOANA. Esta entrega parte dela e conserva os acréscimos exclusivos do GitHub: gerador orgânico, plano mestre de 15/11, ativos e workflows existentes. O repositório público não contém dados, referências pessoais, chaves ou backups de produção.

Ramos e PRs foram inventariados. As propostas antigas de agenda e próximo corte já têm implementações posteriores na fonte publicada; não reaplicar suas migrações ou substituir o Worker por snapshots antigos. PR #8 é planejamento; seus dois documentos e o relatório histórico da PR #16 foram preservados em docs. Não equivalem a novas funcionalidades prontas. Arquivos e ramos antigos permanecem preservados no GitHub.

Backup criptografado completo criado e verificado antes da entrega. Nenhuma migração adicional, troca de preços ou alteração de cadastros é necessária. A publicação mantém banco, armazenamento, identidade do projeto e audiência atuais. As rotinas horárias previamente pausadas continuam pausadas.

## Entregue

| Área | Resultado | Evidência |
| --- | --- | --- |
| Agenda e acesso | Mantida fonte v68: calendário dia/semana/mês, vagas 45 min, corte 45/combo 90, extras sem extensão, dois modos de encaixe, convites e distinção de acesso | Suíte local de agenda, autenticação, convites, permissões e multiempresa |
| Marcas e entradas | Marca comercial EU SOU Gestão; Academia EU SOU incluída para membros ativos, sem mensalidade adicional; `/links`, `/joana`, `/joana/app`, `/cursos` | Testes de rotas e prévia do navegador |
| JOANA unificada | Uma área com Tradicional, Work, Programação, Navegação, Vídeos/Clone. Execuções recebem memórias explícitas, tarefas abertas e últimas quatro mensagens, sem credenciais | Testes de execução hospedada e compartilhamento de contexto |
| Vídeo real | Retirada geração de Reels a partir de JPEGs animados. Conteúdos antigos desse tipo são bloqueados antes de gastar IA ou publicar. Cortes de gravações continuam funcionando | Teste de bloqueio de trabalhos legados; FFmpeg real com mídia sintética |
| Meu clone | Upload privado de JPG/PNG, MP3/WAV/M4A e MP4; consentimentos separados; análise de foto e transcrição/estilo; API Runway para voz, avatar e vídeo falado; geração de cenas Gen-4.5 | Testes simulados de provedor, autorização, isolamento, segredo, idempotência e falhas incertas |
| Diagnóstico WhatsApp | Mostra rejeição empresarial real quando Meta informa `rejected`, em vez de sempre dizer pendente | Fonte do diagnóstico; verificação conectada |

Referências ficam em R2 privado; metadados, análises, estilo e credenciais são cifrados. No máximo 12 referências, 20 trabalhos e seis operações de geração/análise em 24h. Arquivos de foto/áudio até 3 MB; MP4 até 16 MB. Upload não compartilha com provedores. Analisar ou criar voz/avatar exige autorização específica no painel. MP4 é referência privada, sem análise automática de gestos; análise de fala usa áudio separado. Resultados sintéticos precisam de revisão. Não há clone treinado sem material, acesso e resultado de provedor.

## Dependências e limites atuais

| Requisito | Estado | Próximo passo real |
| --- | --- | --- |
| WhatsApp ida e volta | Não comprovado; Meta informa empresa rejeitada e nome de exibição pendente | Corrigir a verificação na Meta e testar mensagem de um número consentido; preservar o número existente |
| Cadastro e-mail/senha | Código e envio Brevo configurados; modelos de autenticação WhatsApp continuam MISSING na consulta atual | Aprovar `joao_acesso_verificacao` e `joao_senha_provisoria`; conferir envio de e-mail e fluxo real |
| Stripe | Conta/cartão habilitados; ciclo de compra, renovação, falha e repasse reais não comprovado | Acompanhar uma contratação legítima; nenhuma cobrança criada para testar |
| Clone e cenas | Integração implementada, sem conexão Runway nem referências do proprietário nesta entrega | Conectar credencial no campo protegido, conferir créditos, enviar foto/áudio e autorizar cada etapa |
| JOANA execução | API hospedada implementada; testes simulados não comprovam execução real da conta | Testar uma tarefa curta autorizada com a conexão existente |
| JOANA para terceiros | Entrada própria pronta, aplicação restrita ao proprietário | Cadastro e contratação pública independente ainda pendentes |
| Controle de Windows/iPhone | Sem agente do dispositivo conectado | Integração própria com autorização do sistema operacional |
| Multiunidades e cobrança por clientes | Não implementados neste lote | Definir faixas e implementar sem alterar contratos existentes |
| Novos cursos e Direct | Não concluídos neste lote | Produção/revisão de aulas e permissões Meta específicas |

## Custos verificados em documentação oficial

A conexão OpenAI existente não paga consumo Runway. Gen-4.5: 12 créditos/segundo; 1 crédito = US$ 0,01. Exemplo: 5 s = US$ 0,60; 10 s = US$ 1,20, antes de impostos. Avatar falado: 1 crédito por 3 segundos mais 1 por 50 caracteres para fala, mínimo 2 créditos. Criação de voz/avatar e condições da conta devem ser conferidas no provedor. Tarifas podem mudar. Nenhum serviço comprado, assinatura criada, chave nova emitida ou teste pago executado nesta entrega.

Fontes: https://docs.dev.runwayml.com/api.md ; https://docs.dev.runwayml.com/guides/pricing.md ; https://developers.openai.com/api/docs/guides/agents-api/quickstart . Sora/Videos API não foi usada: a documentação oficial informa encerramento em 24/09/2026 (https://developers.openai.com/api/docs/guides/video-generation).

## Verificação e publicação

282 testes locais aprovados, zero falhas/ignorados; build, importação ESM, quatro migrações locais, scanner de segredos e `git diff --check` aprovados. APIs externas simuladas nos testes; FFmpeg real sobre vídeo sintético. Prévia confere JOANA com seus modos, configuração de vídeo sem credencial, área comercial e entradas. Não executar `dev.mjs` em produção: usa banco isolado em memória.

Publicação e sincronização GitHub precisam de confirmação própria nos registros de deployment e PR. O commit deste documento não é sozinho evidência de publicação. Para reverter o código, republicar a versão Sites 68; não restaurar o banco para reverter uma alteração de interface.
