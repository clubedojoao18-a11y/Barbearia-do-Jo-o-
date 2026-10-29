# Agenda semanal e retorno — revisão local

Base: PR #4, recuperação da fonte Sites 35. Esta revisão depende dessa base e não deve ser aplicada diretamente sobre a main antiga. Nenhuma configuração de produção foi alterada.

## Configuração por dia

Catálogo > Horários por dia da semana permite escolher um profissional, até dois períodos por dia e dias fechados. O botão Preencher horários da Barbearia do João prepara, sem salvar:

| Dias | Períodos |
|---|---|
| Segunda a quarta | 14:00–20:00 |
| Quinta a sábado | 10:00–14:00 e 16:00–20:00 |
| Domingo | 10:00–14:00 |

Revisar e salvar explicitamente é necessário. O expediente geral ainda limita os horários individuais; conferir o limite geral antes de ativar. Feriados ou férias continuam usando bloqueios explícitos, sem calendário externo presumido. Reservas antigas não são canceladas ou alteradas pela configuração nova.

O formato weeklyPeriods contém exatamente os sete dias, de 0 (domingo) a 6; um array vazio fecha o dia. O servidor valida horários em quartos de hora, no máximo dois períodos e ausência de sobreposição. Configurações antigas de um/dois períodos comuns continuam compatíveis. Salvar o formulário comum substitui a configuração semanal desse profissional, e o aviso é mostrado na interface.

Agenda, reservas e disponibilidade dos outros canais usam professionalWindow compartilhado. Corte 45 minutos e combo 90 continuam preservados; extras no serviço principal não aumentam duração e mantêm preço separado. Nenhuma migração nova.

## Hidratação

Padrão de retorno: 15 dias, confirmado pelo proprietário nesta conversa. Remove a sugestão semanal da interface. Configurações já salvas não são sobrescritas; o intervalo continua ajustável por avaliação e preferência. Esta é uma sugestão de retorno, não uma regra médica ou um bloqueio de reserva. Convites permanecem sujeitos a consentimento, canal autorizado e revalidação.

## Readiness

Todos os serviços externos são NOT_VERIFIED na inspeção local. O comando não afirma que uma conexão está ausente, nem sugere publicação automática; distingue implementação disponível de operação comprovada.

## Validação

186 testes aprovados, sem falhas/ignorados. Novos casos verificam dias distintos, intervalos, limite geral, dias fechados, validação sem gravação parcial, permissão, preservação de reservas e padrão de hidratação sem substituir configuração explícita. Testes usam SQLite em memória, APIs simuladas e FFmpeg real com vídeo sintético. Build, artefato ESM, migrações e diff devem ser conferidos antes do envio da branch. QA visual não realizado nesta revisão.

## Tarefas técnicas e teste

Cadastro confirmado e consultado como habilitado: saúde técnica todos os dias às 07h (início pela regra em 30/10/2026), revisão semanal às segundas 08h (início pela regra em 02/11/2026), fuso America/Sao_Paulo. A plataforma não informou next_run_time; as datas são previstas pela regra, não confirmação de despacho.

Execução imediata de teste da revisão semanal solicitada, mas retornou HTTP 404 Action not found antes da execução. Não foi considerada aprovada. A rotina diária continua sem teste de execução comprovado. Conferir histórico e entrega após o horário previsto. Agendamento ChatGPT não garante terminal/Codex anexado; prompts exigem relatar falta de executor em vez de inventar resultados.

Conteúdo das 19h e rotina operacional horária foram preservados sem duplicação. Auditoria financeira não foi agendada sem fechamento e autorização específicos. Não executar tarefas de clientes como teste técnico.
