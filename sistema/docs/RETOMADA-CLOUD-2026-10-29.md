# Retomada na nuvem — 29/10/2026

## Base preservada

GitHub main `f023385ef26754ca12f6e4e9b7f4edc25eae884a`; fonte exata do Sites 35 `85b76674bd6ea5d34aaac5031f15d208b31dbf6f`. Comparação e recuperação em worktree isolado; checkout original preservado. Diferença em sistema/: 28 arquivos novos, 23 alterados, nenhum removido. Workflows da fonte são iguais aos da raiz e não foram duplicados em sistema/.

182 testes da fonte recuperada, build, artefato ESM e inspeção das quatro migrações passaram. Testes usam SQLite isolado, APIs simuladas e FFmpeg real com vídeo sintético. Não foi aplicada migração ou feita operação de produção. O manifesto mantém o mesmo projeto, DB e BUCKET.

## Avanços recuperados

Agenda 45/90 em grade de 15 minutos, proteção de reservas antigas, dois períodos por profissional, filtros; jornada do cliente; precificação; comissão mensal dos clubes; finanças pessoais; catálogo Fox e retorno com consentimento; identidade visual e menu móvel; conteúdo individual privado; modo sem API paga e rascunhos Work autenticados.

PRs antigos #2 (dois períodos) e #3 (45/90) continuam em rascunho. Não mesclar automaticamente: #3 propõe migração 0004, enquanto Sites 35 protege intervalos antigos sem essa migração. A recuperação usa o conjunto coerente do Sites, não combina as duas estratégias.

## Automações

Conferidas as tarefas existentes: conteúdo às 19h, operacional horária e lembrete antigo concluído. Nenhuma duplicada. Solicitadas e confirmadas pela plataforma duas tarefas técnicas: diariamente 07h e segunda 08h, America/Sao_Paulo. Cadastro habilitado não comprova execução nem disponibilidade de terminal na execução futura. Verificar resultado de teste e próxima execução na plataforma; não inserir tokens em prompts.

Auditoria financeira após fechamento não foi ativada: depende de fechamento e autorização de leitura dos dados reais. Horário não foi inventado. Rotinas de clientes permanecem no backend e exigem conexões e autorizações próprias. Não executar a rotina operacional como teste desta retomada.

## Prioridades e limites

1. Revisar esta recuperação, repetir testes no formato final do repositório e fazer QA visual; não publicar a main antiga sobre o Sites.
2. Implementar horários diferentes por dia da semana, sem modificar configurações ou reservas de produção; hidratação com padrão de 15 dias conforme confirmação do proprietário.
3. Vales/adiantamentos com recibos e descontos idempotentes no fechamento, comandas, estornos/devoluções e fechamento de caixa ainda exigem implementação e aceite próprios. Não confundir fechamento de comissão com caixa ou transferência bancária.
4. Autenticação real continua Sites. Telefone não é senha; educador não recebe papel administrativo por escolha do navegador. Open Finance não está conectado.
5. WhatsApp: validar conexão oficial, coexistência, assinatura, modelos, consentimento e ida/volta antes de ativar. Instagram: conexão e publicação autorizada separadas. Não usar conta Metricool como prova de token Meta do backend.
6. Stripe: validar ciclo de teste, renovação, recuperação e reconciliação; registros anteriores de acesso à conta não comprovam recebimento/repasse real.
7. Backups: existem implementação e ensaio documentados; periodicidade e recuperação atuais não foram verificadas. IA paga permanece proibida nesta retomada; acesso a modelo não comprova geração.

## Custos e segurança

Nenhum fornecedor contratado, chave criada, API paga chamada, merge, deploy, mensagem, cobrança ou publicação realizados nesta revisão. Rotinas técnicas usam recursos nativos disponíveis; não foram adicionados cron jobs GitHub. Tarifas Meta, Stripe, armazenamento e limites do plano podem existir; nenhum preço foi presumido. Configurar segredos futuramente somente no cofre/formulário seguro adequado.

O scanner de credenciais e o readiness local não constituem auditoria de produção. Últimos workflows de validação dos PRs #2/#3 retornaram sucesso; workflows de vídeo também, mas sucesso de workflow pode significar ausência de trabalho/conexão e não comprova vídeo publicado.
