# Calendário e operação — 06/11/2026

O proprietário autorizou os três perfis, criação e publicação sem revisão por post, promoções e atendimento pelo Direct. Pediu baixo custo, três conteúdos no feed por semana e cinco stories diários por perfil.

## Calendário

- Feed: segunda (post), quarta (carrossel), sexta (Reel de artes animadas), às 18h de Brasília.
- Stories: 8h, 11h, 14h (vídeo animado), 17h e 20h.
- Os stories começam em 07/11/2026. O novo feed EU SOU só começa em 01/12/2026, preservando o Metricool agendado até 30/11.
- Chamadas promocionais usam valores e combos cadastrados. Não criar descontos sem base de custo/margem, eventos, depoimentos, resultados ou filmagens fictícias.
- Imagens econômicas GPT Image 2; textos e atendimento usam a chave existente. Cota compartilhada configurável. Não é teto financeiro.

## Executor

A rotina horária chama process_automations em até seis etapas limitadas. O processador gera textos e até três etapas independentes de mídia por chamada. Não repetir falhas de geração sem diagnosticar nem republicar estado incerto.

Quando process_automations retorna renderJobs, usar scripts/social-runner.mjs com JSON via stdin: {"origin":"https://barbearia-joao-clubes.clubedojoao18.chatgpt.site","renderJobs":[...]}.

O script usa FFmpeg local para criar MP4 H264 vertical. Só lê imagens e envia o resultado para o mesmo Site. As URLs são capacidades temporárias de uma hora, restritas a um trabalho previamente autorizado; não armazenar em logs ou prompts. Não recebe nem precisa de chaves OpenAI/Meta. A conclusão é idempotente. O envio de MP4 não publica por si; uma etapa seguinte verifica e publica na Meta.

Para obter o script em outra execução, abrir a fonte canônica do Site via Sites e seguir o fluxo de acesso à fonte. O repositório GitHub histórico não é a fonte da versão publicada.

Histórico completo sai da fila operacional após dois dias para registros studio_social_history_*, sem apagar artes ou confirmação Meta. A tela oferece Histórico de publicações.

## Validação e limites

Testes locais cobrem consentimento/papel, isolamento, cota, reserva única, horários, preservação do feed EU SOU, expiração, publicação Stories, capacidades do renderizador e um MP4 real gerado pelo FFmpeg. A validação local não comprova permissões de Stories/Reels nem recebimento real de mensagens; exigir confirmação em produção.

A resposta inicial nativa do Direct da barbearia foi salva e o estado ativo persistiu na Meta. O teste técnico do perfil pessoal chegou à caixa da barbearia, que enviou a resposta de teste. Isso comprova a caixa do Direct e a saudação inicial configurada, não atendimento conversacional por IA nos três perfis.

## Continuidade — 07/11/2026

- Imagens: duas gerações reais concluídas depois da mudança de nível da API; não repetir testes pagos sem necessidade.
- Instagram: a Meta confirmou uma publicação da barbearia. O perfil pessoal tem uma publicação pronta para 07/11 às 18h de Brasília.
- WhatsApp: número conectado, conta aprovada, aplicativo inscrito e callback correto. O teste assinado da Meta alcançou o servidor; ainda não há conversa real registrada.
- O diagnóstico distingue evento assinado, evento do número correto, mensagem recebida, resposta aceita e resposta entregue. Um exemplo da Meta com outro phone_number_id não comprova recebimento real.
- O erro Meta 141006 informa bloqueio de conversas iniciadas pela empresa por falta de cartão. Não atribuir a ele, isoladamente, a ausência de mensagens recebidas. A verificação empresarial permanece pending_submission, com limite 141010.
- O número permanece no WhatsApp Business do celular. Não remover, migrar ou desconectar para tentar corrigir recebimento.
- Não há dados de cartão disponíveis. O proprietário precisa preenchê-los na conta de mensagens correta. A confirmação empresarial requer o código enviado ao contato cadastrado; não confundir com a verificação pessoal do Instagram.
- Os dois modelos de marketing continuam dependendo da análise da Meta.
- A rotina horária está habilitada e registrou uma execução concluída em 07/11 às 04:59 UTC. A declaração de executor no ambiente deve acompanhar essa configuração; ela, sozinha, não comprova entrega nem processamento recente.
