# Plano de execução e aceite — sistema unificado (27/10/2026)

## Fonte e proteção
- Fonte: projeto existente em `sistema/`; não substituir banco D1, identidades, contratos ou assinaturas.
- Repositório público: NUNCA commitar tokens, chaves, dados de clientes, logs financeiros ou backups.
- Antes de migrações: backup criptografado, restauração testada, inventário de tabelas, plano de rollback. Migrações somente aditivas e revisadas.
- Separar staging de produção; executar testes locais, integração e aceite antes de publicar. GitHub não publica automaticamente no Sites.

## Fase 1 — Operação segura
- [ ] Conferir branch publicada, diferenças entre GitHub e Sites e versão do D1.
- [ ] Validar autenticação, autorização, permissões por papel e trilha de auditoria.
- [ ] Implantar backup periódico com restauração testada e política de retenção.
- [ ] Configurar agendador autenticado para /api/automation/tick; comprovar execuções e alertas de falha.
- [ ] Testar agendamento concorrente, bloqueios e remarcação com dados de teste.

## Fase 2 — Integrações reais
- [ ] WhatsApp Meta: configurar credenciais exclusivamente em painel seguro, validar assinatura do webhook, vincular número, aprovar templates, obter consentimento e testar ida e volta com número autorizado.
- [ ] Stripe: verificar conta, métodos somente cartão, webhooks assinados, renovação, falha, regularização, cancelamento e portal do cliente em teste. Não realizar cobrança real sem aceite explícito.
- [ ] Registrar evidência de testes ponta a ponta e reconciliação de eventos duplicados/fora de ordem.
- [ ] Exibir status verdadeiro (não apenas botão ou credencial cadastrada) na Central de exceções.

## Fase 3 — Gestão e experiência
- [ ] Comandas com múltiplos itens, estornos e fechamento de caixa auditável.
- [ ] Agenda: férias multi-dia, expediente individual, presença, espera automática com consentimento.
- [ ] Inventário: importação, ajuste auditado, relatórios e alertas de estoque.
- [ ] Indicadores: ocupação, retorno, conversão, receita recorrente e comissões com reconciliação.

## Fase 4 — EU SOU e Academia
- [ ] Auditar a Academia existente e mapear identidade e cursos antes de importar dados.
- [ ] Definir preços de fundadores, educadores e membros a partir de custos comprovados; aprovar antes de ativar.
- [ ] Criar produtos recorrentes separados na mesma conta Stripe, mantendo isolamento contábil por projeto.
- [ ] Conectar matrícula, acesso, cancelamento, progressão, certificados e conteúdo didático.

## Fase 5 — IA, Instagram e mídia
- [ ] Definir orçamento, consentimento e fornecedores para IA, transcrição, vídeo e armazenamento.
- [ ] Assistente com limites de acesso, confirmação de ações sensíveis, opção de humano e logs mínimos.
- [ ] Pipeline assíncrono de aulas: upload autorizado → transcrição → cortes propostos → revisão de direitos → aprovação → publicação pela API oficial.
- [ ] Métricas e controles de pausa, custo, falha e duplicidade.

## Critérios de conclusão
Uma funcionalidade só é considerada entregue quando código, testes automatizados, teste real autorizado, monitoramento, instruções operacionais e evidência de implantação estiverem registrados. Itens não verificados permanecem pendentes.
