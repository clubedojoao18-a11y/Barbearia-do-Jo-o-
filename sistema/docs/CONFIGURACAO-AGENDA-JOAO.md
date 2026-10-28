# Configuração de agenda proposta — Barbearia do João

Estado: proposta para implementação e validação; **não aplicada à produção**.

Fuso horário: America/Sao_Paulo. Profissional: proprietário (identificar ID real no banco antes de gravar).

| Dia JS | Dia | Intervalos permitidos |
|---|---|---|
| 1 | Segunda | 14:00–20:00 |
| 2 | Terça | 14:00–20:00 |
| 3 | Quarta | 14:00–20:00 |
| 4 | Quinta | 10:00–14:00; 16:00–20:00 |
| 5 | Sexta | 10:00–14:00; 16:00–20:00 |
| 6 | Sábado | 10:00–14:00; 16:00–20:00 |
| 0 | Domingo | 10:00–14:00 |

## Implementação necessária
- Substituir/estender professionalHours (hoje uma faixa open/close para todos os dias) por janelas por dia, preservando compatibilidade com os dados antigos.
- Garantir que o gerador de disponibilidade, a reserva atômica e os fluxos WhatsApp usem a mesma função de validação de intervalos.
- Rejeitar atendimentos que cruzem 14:00 ou 16:00, sem depender de bloqueios apenas na interface.
- Manter bloqueios manuais, férias, agendamentos existentes e regras de assinaturas.
- Não sobrescrever agendamentos existentes; antes de ativar, listar conflitos e exigir revisão.
- Testar limites: 13:15–14:00 permitido; 13:30–14:15 negado; 16:00–16:45 permitido; 19:15–20:00 permitido; domingo após 14:00 negado.
- Confirmar se slots são de 30 minutos no backend: 45 minutos podem exigir granularidade de 15 minutos ou arredondamento para 60 minutos. Não anunciar capacidade de 256 como reserva efetiva até resolver isso.
- Publicar somente após testes e backup; não modificar a branch main diretamente.

## Capacidade de referência
46 horas/semana = 2760 minutos. Considerando janelas independentes e duração de 45 minutos: 3 dias × 8 vagas + 3 dias × (5 + 5 vagas) + domingo 5 vagas = **59 vagas/semana**. Média mensal 59 × 52/12 = 255,7 ≈ **256 vagas**. Demanda informada: 40 assinantes × 3,5 + 20 avulsos × 1,5 = **170 atendimentos/mês**, ocupação estimada 66,4%.

## Automações
- Confirmação imediata; lembrete 24h antes; sugestão de extra contextual na reserva, respeitando duração real.
- Campanhas de captação condicionadas à disponibilidade; não ofertar horários de almoço.
- Relatório de ocupação diário após 20:00 de segunda a sábado, e após 14:00 domingo.
- Reavaliação semanal de capacidade e cotas de marketing. Não iniciar envios sem consentimento e conexão Meta validada.
