# Agenda: dois períodos e extras

- Configuração individual aceita um ou dois períodos ordenados, sem sobreposição. Campos antigos `open`/`close` continuam aceitos; reservas existentes não são modificadas.
- Reserva deve caber integralmente em um período, limitado também pelo horário geral. Disponibilidade no aplicativo, WhatsApp e capacidade das campanhas respeitam o intervalo.
- Extras mantêm o tempo do serviço principal, com preço calculado pelo servidor e cobrança separada preservados. Interface não anuncia tempo adicional.
- Sem dependências novas, migrações ou acesso a dados financeiros reais.
- Pendências críticas: corte ainda usa 30 minutos e combo 60. Alteração para 45/90 exige revisar a grade atual de 30 minutos e a compatibilidade com reservas/bloqueios existentes. Demais requisitos do comando precisam de auditoria específica; não são declarados concluídos por esta revisão.
- Sem publicação. Antes de publicar, comparar GitHub com a versão Sites 24, verificar backup e realizar QA autenticado no celular. Integrações externas não foram verificadas nesta revisão.
