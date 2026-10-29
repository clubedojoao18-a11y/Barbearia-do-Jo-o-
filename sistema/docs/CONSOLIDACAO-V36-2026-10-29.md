# Consolidação com Sites v36 — 29/10/2026

## Base e dependências

Produção confirmada: Sites v36, commit c07bca853922fe2b160ed7475f174fb42be64b8c, projeto appgprj_6ada23b73f588191957e07fead79b735. Projeto, DB e BUCKET preservados. O PR #4 foi atualizado a partir dessa fonte, incluindo agenda semanal, status Instagram separado e modo sem API paga. Workflows continuam na raiz do GitHub.

PR #5 incorpora essa base por merge normal, sem reescrever histórico. Agenda semanal e readiness deixam de aparecer como mudanças exclusivas do #5 porque já estão na base v36. Restam retorno padrão de hidratação de 15 dias, testes e documentação. Configurações de retorno já salvas prevalecem. Não publicar esta mudança de lembretes sem confirmação específica, pois afeta sugestões aos clientes.

PR #2 depende da main antiga; PR #3 depende do #2 e propõe migração 0004_agenda_15_minutes.sql. A versão publicada já resolve 45/90, extras no tempo principal, dois períodos, grade de 15 minutos e conflitos com proteção das reservas antigas. Não integrar a migração 0004: ela pertence a uma estratégia alternativa e não faz parte desta consolidação. PRs #2/#3 preservados para histórico e comparação, sem merge.

## Preservação e segurança

Conferência byte a byte dos arquivos operacionais do #4 com os arquivos rastreados do Sites v36. Nenhum arquivo funcional removido; documentos específicos da continuidade GitHub mantidos. Sem mudanças de preços, pagamentos, autenticação, permissões, cadastros, assinaturas, estoque ou reservas de produção. Sem migração nova; quatro SQLs existentes passam no verificador não destrutivo. Scanner de credenciais faz parte de npm test.

## Backup e reversão

Conector nativo criou backup criptografado de produção em 29/10, com leitura de volta verificada e sections=1. Identificador 1793316856-e8c8d3d3-8426-4bbc-ad6c-2e9f9ef90901. Nenhuma restauração em produção foi feita.

Rollback de código: republicar a versão 36 já salva e confirmada. Não restaurar banco para reverter apenas código. Uma restauração de dados requer seleção de snapshot e aprovação próprias. Guardar o artefato consolidado e o SHA exato antes de qualquer publicação. Não substituir o Site pela main antiga.

## Verificação

187 testes aprovados, zero falhas/ignorados; build, ESM e quatro migrações aprovados sobre sistema/ após o merge. Prévia autenticada em SQLite isolado confirmou corte 45, combo 90, formulário semanal, preset 10/14/16/20 e salvamento com Registro salvo. QA desktop; não certifica aparelho móvel real. APIs externas simuladas, SQLite em memória e FFmpeg real com vídeo sintético. QA da prévia é separado de validação operacional Meta. Sem chamada paga OpenAI nem ativação de rotinas reais.

A publicação de produção continua v36; esta consolidação é preparação de fonte e revisão, não comprovação de WhatsApp/Instagram ativos.
