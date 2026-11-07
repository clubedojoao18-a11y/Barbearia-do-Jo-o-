# Retomada operacional — 28/10/2026

Fonte aberta diretamente do projeto Sites existente, versão 30, commit f081625d637c60672146858b9dc39dc582368caa. Preservados identidade, público, banco, preços e reservas. GitHub segue separado: PRs #2 e #3 em rascunho; não foram mesclados nem declarados sincronizados com produção.

## Correções

- Diagnóstico de processamento respeita a rotina horária, com tolerância de 15 minutos (75 minutos no total). Execução falhada ou data futura não conta como sucesso recente. Configuração declarada, isoladamente, continua insuficiente.
- Consulta de modelos OpenAI não mascara teste de geração bloqueado. A Central apresenta o último teste de atendimento e ação para `billing_not_active`, falha ou ausência de teste. A consulta aos provedores continua sem geração de conteúdo, envio ou cobrança.
- Resumo MCP de operação inclui o registro separado de geração. Um teste aprovado é evidência histórica, sem promessa sobre faturamento ou disponibilidade futura.

## Verificações nesta retomada

Consulta autenticada pelo MCP: Stripe live acessível, charges e payouts habilitados e configuração de cartão; sem evidência de pagamento real. WhatsApp não configurado. Instagram dos dois projetos pausado, sem conteúdo em fila. Acesso ao modelo IA respondeu 200, o que não comprova geração. Última rotina em nuvem registrada como concluída.

174 testes locais passaram, incluindo janela horária, falhas, autorização e acesso ao modelo com geração bloqueada sem POST ao provedor. Prévia da Central conferida no navegador da nuvem. Build, migrações e artefato verificados antes da publicação.

## Próximos passos externos

Retomar app Meta existente no navegador da nuvem. Preservar WhatsApp Business atual; verificar elegibilidade para coexistência com a API oficial antes de qualquer migração. Validar número, webhook, modelos e ida/volta com autorização. Não desinstalar o aplicativo nem criar número substituto sem decisão do titular. Configurar atendimento a novos contatos e manter vínculo seguro antes de expor dados de clientes já cadastrados.

A geração de IA requer novo teste após regularização do faturamento. Pagamento, renovação, recuperação e repasse reais continuam sem comprovação. Instagram e executor de vídeo dependem das conexões e conteúdo autorizado. Nenhuma dessas frentes foi declarada concluída por existência de código.
