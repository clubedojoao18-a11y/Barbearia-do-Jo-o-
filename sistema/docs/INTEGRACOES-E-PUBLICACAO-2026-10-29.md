# Integrações e publicação — 29/10/2026

Base preservada: Sites v35, 85b76674bd6ea5d34aaac5031f15d208b31dbf6f. Aplicação Sites é a fonte atual; main GitHub ainda anterior, com recuperação no PR #4. PRs #2/#3 não devem substituir a fonte atual.

## Alterações desta sessão

- Configuração semanal de até dois períodos por profissional, revisada a partir da parte de agenda do PR #5. Preset seg–qua 14–20h, qui–sáb 10–14h/16–20h, dom 10–14h. Publicar o código não salva o preset em produção. Nenhuma migração ou alteração de reservas.
- Mantidos corte 45 minutos, combo 90 minutos e extras dentro do principal. Testes cobrem conflitos, intervalos, dias fechados, permissões e preservação de reservas.
- Status MCP informa configuração/última verificação de cada Instagram sem expor tokens ou IDs. Credencial Instagram não é mais confundida com chave IA.
- Studio mostra ChatGPT Work no modo sem API, oculta aviso antigo de ativação de faturamento e desabilita o botão de teste pago nesse modo. Bloqueio servidor continua ativo.
- Readiness local distingue ausência de verificação de ausência de conexão.

## Meta — observações reais

Aplicativo 964656139590856, portfólio 1698732585155787. Sessão autenticada acessível. Aplicativo ainda não publicado. Conta WhatsApp disponível: Test Messaging Account, 2523723071483691, número de teste americano. Número brasileiro do proprietário ainda não conectado. Campos de callback e token vazios.

Cadastro oficial do número brasileiro preparado, sem avançar: continuar implica aceitar WhatsApp Business Terms of Service e Meta Hosting Terms for Cloud API. Exige confirmação específica. Nenhuma coexistência com aplicativo Business foi comprovada; não migrar nem remover o número do aplicativo sem validar esse requisito.

Sem envio real, contratação, cobrança ou geração paga. WhatsApp servidor: configured=false/verified=false. Instagram precisa configuração, autorização dos perfis e verificação oficial; nenhuma publicação real comprovada.

## Automações preservadas

America/Sao_Paulo: saúde técnica diariamente 07h; planejamento segunda 08h; conteúdo diariamente por volta de 19h; execução operacional horária no ChatGPT com conector nativo. Lembrete antigo de WhatsApp desativado. Nenhuma cópia criada. Rotinas técnicas não garantem executor anexado; postagem e avisos dependem das conexões e autorizações. Rotina horária registrou execução em 29/10 às 19h04; isto não comprova envio.

## Validação e reversão

186 testes passaram, zero falhas/ignorados; SQLite em memória e provedores simulados, FFmpeg real com vídeo sintético. Prévia autenticada local abriu Serviços e regras, mostrou durações 45/90 e preencheu preset semanal corretamente. Salvamento testado somente no SQLite de prévia; produção preservada. Scanner de segredos integra npm test. Build/artefato/migrações devem passar antes da publicação.

Rollback de código: republicar v35; banco e segredos preservados. Não usar migrações inversas.

## Ainda pendente

Aceite Meta, número real/coexistência, token/segredo protegidos, webhook verificado, modelos aprovados e teste bidirecional autorizado. Instagram: conexão dos dois perfis, mídia pronta sem API paga e campanha autorizada. Vales/adiantamentos com recibos e desconto, estornos/fechamento de caixa e validação financeira operacional continuam pendentes. Este registro não declara conclusão de todo o escopo comercial.
