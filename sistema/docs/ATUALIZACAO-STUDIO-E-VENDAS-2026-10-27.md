# Conteúdo, marca e vendas no agendamento — 27/10/2026

## Entrega sobre a versão 14

Mesmo Site, projeto, banco e audiência pública. Nenhuma migração de tabelas, mudança de preço de assinatura, exclusão de cadastro ou contratação de fornecedor nesta entrega.

### Conteúdo e Instagram

- Dois projetos por empresa: Barbearia e EU SOU. Geração original de título, legenda e roteiro de post ou carrossel de cinco slides pela Responses API. Cada slide final pode ser produzido pela API de imagens em JPEG, com cores da marca, sem fotos de clientes.
- Contexto limitado ao catálogo e dados da marca. Não envia conversas, contatos, avaliações ou dados financeiros de clientes à IA. Valores só podem ser divulgados quando aprovados no cadastro.
- Chaves de IA e tokens Meta protegidos com AES-GCM, separados em cada namespace. Formulário verifica ID e usuário do Instagram. Conexão exige conta profissional e permissões oficiais de publicação. Verificar a identidade do perfil não comprova a permissão de publicar; a primeira publicação precisa ser acompanhada.
- Rotina configurável por projeto, dias e hora de Brasília, com pausa e opção explícita de criação contínua sem revisão individual. Limite diário atômico de chamadas por empresa. Uma geração de texto e cada arte contam separadamente. Este limite não é teto financeiro; usar também limites e alertas no provedor.
- Fila persistente por etapas: imagem, slides filhos, container, verificação e publicação. Estado incerto de envio não é reenviado automaticamente; há reconciliação pela Meta. Container e publicação podem expirar ou falhar por permissões, prazos ou cotas externas.
- Arquivos em links não enumeráveis usados pela Meta; não colocar conteúdo privado nesses materiais. Limite de 120 conteúdos ativos por empresa. Arquivamento de conteúdo publicado remove o item da fila local, não do Instagram. Os arquivos não são excluídos automaticamente.
- Ferramentas MCP privadas do proprietário para status e processamento autorizado; cron nativo anterior preservado. O executor em nuvem ainda precisa ser conectado e testado depois da publicação. Abrir a página não cria processamento em segundo plano.

### Identidade e venda do sistema

Todas as áreas compartilham os mesmos módulos de código. O dono configura nome, frase, logo, cores e tipografia; a IA pode propor uma combinação, que só é aplicada ao salvar. Cor principal precisa manter contraste com texto branco. Logo é reduzido no navegador. Espaços mantêm dados, pagamentos, contas Meta e consumo de IA separados. Licenciamento e condição do fundador seguem as regras da versão 14: sistema incluído enquanto a matrícula fundadora estiver paga e vigente; sem empresa adicional nem cobrança criada nesta entrega.

### Ofertas no agendamento

- Recomendações opcionais de até três extras e quatro produtos em estoque, com texto educativo e preços do catálogo. Nada vem pré-selecionado. Duração e preço dos extras são somados no servidor; disponibilidade usa todos os blocos de tempo e a gravação é atômica.
- Benefícios do clube não são revendidos: sobrancelha não aparece como extra pago de assinante. Inadimplência segue bloqueando reserva, inclusive com extras e presentes.
- Prova social somente com contagens reais de serviços concluídos ou unidades vendidas nos últimos 30 dias, a partir de cinco registros. Estoque baixo só usa quantidade real. Nenhum depoimento, popularidade ou escassez inventados.
- Compra de produtos separada do horário, com Checkout de pagamento único no cartão, preços no servidor, confirmação explícita e retirada na barbearia. Reserva de estoque atômica; confirmação assinada registra venda e caixa uma vez. Checkout expirado confirmado pela Stripe devolve estoque. Entrega exige pagamento confirmado e perfil autorizado.
- Erro de rede ao abrir checkout pode deixar reserva pendente para conferência; não devolver estoque sem saber o estado do pagamento. É necessário assinar também checkout.session.expired na Stripe e acompanhar pedidos não confirmados. Novas notificações de expiração não foram ativadas na conta Stripe por esta entrega.
- Extras de serviço são reservados e têm valor mostrado; a reserva não cobra esses serviços no cartão. Avulsos podem ter recebimento registrado pelo fluxo anterior. Extras de clube/presente exigem lançamento específico no caixa. Não lançar duas vezes.
- Remarcação preserva extras. Cancelamento e reagendamento não geram estorno automático; compra de produto tem seu próprio pedido. Reembolsos, devoluções, frete, nota fiscal e contestação de produto permanecem fora deste fluxo.

### Qualidade e fidelização

Avaliação de uma a cinco estrelas e comentário privado por atendimento concluído e pertencente ao cliente. Uma avaliação por visita, sem geração automática de depoimento público. Gestão com permissão de contatos e indicadores vê os casos; pode registrar resolução. Cliente pode salvar preferências de corte e conversa. Essas informações são excluídas da configuração geral e da geração social.

## Pesquisa aplicada

- AppBarber, página oficial de funcionalidades: agenda por profissional, estoque, acompanhamento de serviços e pesquisa de satisfação. Aqui, a aplicação foi manter agenda/estoque existentes e acrescentar pesquisa privada e ofertas pertinentes. Fonte: https://www.appbarber.com.br/funcionalidades/
- Seu Elias, página institucional e apresentação oficial de gestão: experiência, padronização de atendimento e cuidado com a operação. A aplicação foi permitir preferências de atendimento, tratar avaliações e evitar oferecer extras incompatíveis. Não houve acesso nem cópia de curso pago. Fontes: https://seuelias.com/sobre/ e https://gestao.barberday.online/insta/
- A busca por “Rhapa” encontrou referências públicas a “O Rapha Ensina”, inclusive conteúdos sobre assinatura e delegação de vendas. A correspondência com a pessoa mencionada pelo usuário é provável, não confirmada. Não foram atribuídos métodos exclusivos nem copiadas aulas. Referência localizada: https://www.facebook.com/oraphaensinaa/videos/pare-de-parar-o-corte-pra-vender-plano/2361310434640386/

## Verificação e limites

117 testes locais aprovados no momento da entrega inicial, incluindo isolamento entre empresas, contraste/injeção de marca, autorização, dados privados fora da IA, limite diário de chamadas, concorrência e reconciliação da publicação, reserva de tempo, inadimplência, preço calculado no servidor, estoque, venda e caixa idempotentes e expiração do checkout. APIs externas simuladas. Prévia validada no navegador. Build e validação ESM obrigatórios antes da publicação.

Não declarar integração ativa apenas por existir tela ou código. Nesta execução não foi criada chave OpenAI, não houve chamada real à OpenAI, pagamento real nem publicação real em Instagram. A conexão Metricool consultada contém somente o perfil _eusoucomunidade; ela não fornece token Meta ou chave OpenAI ao servidor do Site e não foi usada para publicar.

Ainda dependem de trabalho ou conexão externa: credenciais oficiais de Instagram e IA; execução em nuvem comprovada; teste real autorizado de Stripe/WhatsApp; recortes e transcrição de aulas; assinatura recorrente EU SOU; importação da Academia e conversas WhatsApp; backup/restauração; comandas completas e estornos. Esses itens não estão declarados concluídos.

## Continuidade em nuvem

As ferramentas `automation_status` e `process_automations` exigem a identidade autenticada do proprietário. O processamento respeita pausas, licença de empresa, canais ativos e cota de chamadas. Não passar tokens por prompts de tarefas. A tarefa deve usar o plugin nativo deste Site e conferir resultado; se o plugin não estiver disponível, registrar o bloqueio e não fingir processamento. Para ativar publicação: conectar a IA, conectar cada Instagram, autorizar a rotina e executar uma etapa com leitura de retorno; então comprovar o executor periódico.
