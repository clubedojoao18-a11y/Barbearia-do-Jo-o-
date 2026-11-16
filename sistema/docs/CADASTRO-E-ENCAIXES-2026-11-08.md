# Cadastro de clientes e encaixes — 08/11/2026

A fonte vigente é o repositório do Sites associado a `appgprj_6ada23b73f588191957e07fead79b735`. Esta atualização parte da fonte publicada v57. Os documentos antigos registram condições da data de cada entrega; não são auditorias atuais.

## Entregue nesta atualização

- Gestão → Clientes → Cadastrar cliente: nome, telefone brasileiro com DDD e e-mail opcional. Telefone normalizado; e-mail e telefone duplicados rejeitados. Identidades reservadas atomicamente, sem alteração parcial em concorrência. Registro de auditoria.
- Gestão → Agenda → Encaixe / agendar cliente: busca de clientes, cadastro sem sair do fluxo, profissional, serviço, data, modalidade e horários livres compatíveis com a duração. Atendimento avulso ou clube; não gera cobrança.
- O servidor revalida licença, permissões, cliente ativo, inadimplência, cobertura/cota do clube, prazo, expediente, intervalo e ocupação completa. Um encaixe nunca sobrepõe uma reserva ou intervalo. Não há exceção silenciosa para agendar no passado.
- Cadastro e agenda permanecem no banco da respectiva empresa. Permissões de clientes, contatos e agendamento são exigidas da gestão. Rotas de agendamento respeitam os módulos do ramo.
- Primeiro acesso com identidade ChatGPT do mesmo e-mail reaproveita o cadastro manual e suas reservas. Não vincula conta apenas pelo telefone. Sem e-mail, atendimento fica disponível pela gestão.
- Prévia local: cadastro sintético e reserva de corte de 45 minutos conferidos na interface. Dados sintéticos não enviados à produção.

## Verificado nos provedores nesta sessão

- Stripe: conta de produção acessível, cobranças/repasses habilitados e somente cartão de crédito. `livePaymentVerified=false`: acesso ao provedor não comprova compra, renovação, inadimplência ou repasse real.
- WhatsApp: número +55 24 99836-1631 conectado, seis modelos aprovados e compatíveis, callback do aplicativo e assinatura confirmados. Meta informa nome de exibição ainda não aprovado e verificação empresarial `pending_submission`, com limites. Consulta de automações: zero mensagens processadas e nenhum recebimento real comprovado.
- Instagram: três contas configuradas/verificadas, publicações registradas e itens em fila. Isso não substitui uma auditoria editorial de cada postagem.

## Ainda falta para encerrar o escopo amplo

1. Login independente por e-mail e senha, cadastro público, confirmação por e-mail, recuperação de senha e senha provisória via WhatsApp ainda não implementados. A entrega atual mantém o acesso ChatGPT. Não anunciar envio de e-mail ou senha que não existe.
2. Comprovar recebimento e resposta reais do WhatsApp no número conectado. Histórico anterior do telefone não é importado pelo webhook. Concluir requisitos que a Meta indicar para a empresa/nome comercial.
3. Validar o ciclo de pagamento e repasse de assinaturas com evidências apropriadas. Nenhuma cobrança foi realizada nesta sessão.
4. Revisar os demais requisitos comerciais e operacionais do plano amplo com os documentos e banco atuais; esta atualização não certifica que todo o produto está concluído.

Verificação: 230 testes automatizados, incluindo cadastro concorrente, identidade, preservação de reservas, permissões, conflitos, inadimplência, intervalos e isolamento entre empresas. Build, migrações e artefato devem passar antes da publicação. Fonte versionada no Sites; esta sessão não sincronizou as mudanças no GitHub separado.
