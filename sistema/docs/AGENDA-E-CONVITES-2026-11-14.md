# Agenda e acesso de clientes — 14/11/2026

A versão 62 publicou calendário diário, semanal e mensal. Endpoint de consulta limitado a 42 dias, sem truncar silenciosamente acima de 2.000 registros. Profissionais só consultam a própria agenda; empresas mantêm isolamento. Vagas respeitam expediente individual, intervalos, duração, bloqueios e encaixes. Dicas locais não enviam mensagens. O servidor continua validando cada reserva.

Entrega seguinte: filtro de acesso em Clientes, distinção entre acesso ativo/pausado/cadastro da equipe, convite WhatsApp ao salvar com autorização registrada ou via ação posterior. Envio passa pela fila existente, respeita pausa, conexão, limite diário, janela de atendimento e modelo aprovado. Aceitação não equivale a entrega. Convites aceitos ou incertos não são reenviados automaticamente. Consentimento do convite não ativa avisos gerais ou campanhas. Somente o convite solicitado é processado na tentativa imediata.

Modelo de convite joao_convite_acesso pode ser preparado/consultado em Configurações, separado dos modelos de autenticação. A Meta precisa aprová-lo. Ativação segue verificação de e-mail e telefone; clientes criados sem e-mail podem validar os dois contatos e ativar o mesmo registro, sem duplicação. O link Instalar aplicativo fica disponível no acesso público.

Backup completo criado e verificado em produção nesta sessão após autorização explícita. Não há comprovação nova de entrega WhatsApp, cadastro real completo ou ciclo financeiro real. Brevo ainda depende de login válido e remetente configurado; autenticação WhatsApp depende de modelos aprovados. Rotinas anteriores permanecem pausadas.
