# Agenda: dois períodos e extras

- Configuração individual aceita um ou dois períodos ordenados, sem sobreposição. Campos antigos `open`/`close` continuam aceitos; reservas existentes não são modificadas.
- Reserva deve caber integralmente em um período, limitado também pelo horário geral. Disponibilidade no aplicativo, WhatsApp e capacidade das campanhas respeitam o intervalo.
- Extras mantêm o tempo do serviço principal, com preço calculado pelo servidor e cobrança separada preservados. Interface não anuncia tempo adicional.
- O PR #2 não adiciona dependências nem migrações e não acessa dados financeiros reais. A continuação 45/90 adiciona uma migração de compatibilidade.
- A continuação em `AGENDA-45-90.md` implementa corte de 45 minutos, combo de 90 e grade de 15 minutos, com migração obrigatória das travas antigas antes da ativação. Demais requisitos precisam de auditoria específica; não são declarados concluídos por esta revisão.
- Sem publicação. Antes de publicar, comparar GitHub com a versão Sites 24, verificar backup e realizar QA autenticado no celular. Integrações externas não foram verificadas nesta revisão.
