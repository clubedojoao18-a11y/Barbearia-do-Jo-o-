# Agenda: corte 45 minutos, corte e barba 90 minutos

Alteração incremental sobre o PR #2 (`codex/agenda-dois-periodos`). Este PR deve ser integrado depois dele. Sem publicação de produção nesta tarefa.

## Comportamento

- Corte usa 45 minutos e corte e barba (`combo`), 90 minutos. O catálogo efetivo substitui durações antigas desses dois identificadores, preservando preços, nomes e estado ativo. A administração valida essas durações ao salvar. Outros serviços continuam configuráveis em múltiplos de 15 minutos, entre 30 e 480 minutos.
- Extras continuam dentro do tempo principal, sem somar minutos. Preços e cobrança dos adicionais permanecem calculados pelo servidor.
- Grade, reserva, remarcação, bloqueio, férias, expediente geral/individual, disponibilidade WhatsApp e contagem de capacidade promocional usam unidades de 15 minutos. A capacidade promocional mede blocos disponíveis, sem prometer encaixe contínuo de um serviço.
- Novas reservas e remarcações usam as durações atuais. Reservas existentes mantêm horário, duração, preço e estado. Duas reservas podem ser adjacentes, mas nenhuma pode cruzar intervalo ou fim do expediente.
- A chave única de `slots` e os lotes transacionais continuam protegendo reservas concorrentes e o rollback de remarcações e bloqueios.

## Migração obrigatória antes de ativar a nova grade

A migração aditiva `0004_agenda_15_minutes.sql` cria a segunda trava de 15 minutos de cada bloco antigo de meia hora. Não altera registros de atendimento. Sem essa migração, reservas antigas podem deixar lacunas na nova grade.

1. Na janela de atualização, suspender novas reservas e remarcações no aplicativo, WhatsApp e ferramentas integradas; criar/verificar backup.
2. Aplicar a migração uma vez na base principal e em cada namespace de empresa existente. Para empresas, usar a reescrita de tabelas `scopeSQL(sql, 'w_'+company.id+'_')` de `worker/tenancy.js`, com o ID real da empresa. O esquema de provisionamento já inclui a migração para novas empresas.
3. Ativar o código e verificar uma reserva antiga de 30/60 minutos, um bloqueio, um encaixe adjacente de 45 minutos, um combo de 90 minutos e uma remarcação com conflito. Só então retomar reservas.
4. Não voltar ao código com grade de 30 minutos mantendo reservas novas na base: ele não reconhece corretamente os inícios em :15/:45. Restaurar dados e código compatíveis juntos se houver necessidade de rollback. Backups anteriores à migração exigem reaplicá-la antes de usar a nova grade.

Não foi executada migração em produção. Antes da publicação, comparar a fonte com a versão Sites em uso e realizar QA autenticado no celular, como já indicado no PR #2. WhatsApp foi validado com simulação da API Meta; não houve envio real de mensagens.
