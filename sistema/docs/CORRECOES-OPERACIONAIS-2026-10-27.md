# Correções operacionais — continuação de 27/10/2026

## Fonte conferida

Projeto Sites original appgprj_6ada23b73f588191957e07fead79b735, versão 13 na abertura, commit 24360f7706fc1da81213ce34a5e901e30d45b1ff. A fonte já inclui identidade visual tabaco/cinza, piloto multiempresa em /sistema, presentes por indicação e recuperação de clientes por regras. O documento ENTREGA-2026-10-27.md descreve uma etapa anterior; o código e os testes atuais prevalecem sobre os itens ali marcados como ausentes.

## Corrigido nesta revisão

- Remarcação de Pai e Filho pelo WhatsApp preserva dependent_id na substituição da reserva. Revalida titular, benefício, pagamento, serviço e disponibilidade no mesmo fluxo usado no aplicativo.
- Tentativas de envio à Meta recebem uma reserva de cota persistente e atômica por data de Brasília. Processamentos concorrentes não podem ultrapassar o dailyLimit configurado. Cada mensagem é reivindicada antes da reserva; mensagens disputadas não gastam cota duas vezes. Falhas e entregas incertas mantêm a reserva. Envios já realizados antes desta versão entram na contagem inicial. O limite mede tentativas, não garante um teto monetário de tarifas Meta. A configuração interna não aparece no painel de gestão nem é compartilhada entre empresas.
- Pausa geral da automação interrompe também a análise automática e emissão de novos presentes. Convites já emitidos e ações manuais do programa mantêm seu comportamento.

## Verificação

102 testes automatizados aprovados, sete adicionais: concorrência da cota, dia seguinte, histórico e entrega incerta, aumento/redução de limite, isolamento entre empresas, remarcação do dependente, processamento simultâneo pelo endpoint e pausa geral. Testes usam SQLite local e Meta/Stripe simuladas; nenhuma mensagem ou cobrança real enviada. Prévia local: navegação autenticada e Central de exceções renderizadas.

## Publicação e dados

Somente alterações de código. Nenhuma migração, exclusão, alteração de preço, habilitação comercial ou mudança de assinatura foi feita. O backup/restauração de dados de produção continua uma pendência separada. O contador usa a tabela config existente.

## Limites de entrega

Integração externa não é considerada operacional apenas pela presença de credenciais. Conexão Meta, webhook assinado e teste real de ida/volta; execução periódica; ciclo Stripe em teste; assinatura recorrente EU SOU; IA de atendimento; Instagram e edição/publicação de vídeos continuam dependentes de configuração/implementação e validação. O piloto de venda do sistema está em /sistema; preços e contratação paga permanecem sujeitos à configuração já existente. Não foi criado um agendador fictício nem marcada integração como validada.
