# Visão de produto: plataforma multirramos e operação orgânica com custo adicional zero
**04/11/2026 · Documento de implementação para ChatGPT Work · não implantado**

## Decisão do proprietário
O sistema não será restrito a barbearias, mercados ou restaurantes: **qualquer tipo de negócio** poderá declarar seu ramo, mesmo que não esteja numa lista. A tecnologia deve ser modular e adaptável, sem criar centenas de sistemas separados. Funcionalidades pagas ficam isoladas/ocultas por padrão; só voltam mediante aprovação futura. Objetivo operacional: máxima autonomia **sem gasto adicional** e sem alegar que serviços de terceiros são gratuitos quando cobram por uso.

### Verdade sobre a versão atual
- `/sistema` hoje exibe “Sistema para Barbearias”; cria até 20 empresas, uma por conta, cada uma com tabelas isoladas no mesmo D1.
- `worker/platform.js` armazena `platform_state` como JSON; `worker/platform-ui.js` e `worker/tenancy.js` ainda exibem vários textos fixos de barbearia.
- `worker/index.js` traz agenda de barbeiros, clubes, duração de serviços e UX de barbearia. **Trocar apenas as palavras NÃO cria um PDV de mercado nem gestão de restaurante.**
- Não houve migração nem publicação desta proposta em produção. Não interromper a Barbearia do João.

## Arquitetura pretendida
**Organização → empresas/unidades → ramo principal e ramos secundários → módulos habilitados → usuários/papéis → registros isolados.** 
- Uma pessoa poderá administrar vários negócios ou unidades de ramos diferentes; considerar os limites existentes do piloto sem afrouxar isolamento.
- A identidade comercial (nome, cor, logo, serviços, catálogo, preços e canais) pertence a cada empresa. Dados, permissões, finanças e contatos não transitam entre empresas.
- O ramo define um **perfil inicial de módulos**, não a lógica de cobrança nem permissões. Administrador poderá ajustar módulos seguros sem migrações destrutivas.
- O **núcleo universal** será operacional com defaults baratos: cadastro de clientes e fornecedores, produtos/serviços, caixa e financeiro com lançamento manual auditável, estoque básico, equipe/permissões, indicadores, campanhas orgânicas e painel de tarefas. Módulos especializados só entram depois de implementados/testados.
- Criar uma camada `businessCapabilities` por empresa (`scheduling`, `memberships`, `sales`, `inventory`, `tables`, `kitchen`, `delivery`, `orders`, `education`, `rentals`, `projects`, `appointments`, etc). Os nomes devem ser estáveis e descritos em código; regras de permissão sempre aplicadas no servidor.
- Nenhum ramo pode usar telas/fluxos incompatíveis ou perder acesso aos dados porque uma função opcional foi desligada.

## Cadastro comercial e seleção universal de ramo
Campo obrigatório: **Qual é o ramo da sua empresa?**

Exemplos de opções:
- Barbearia e salão; estética e bem-estar; serviços profissionais; clínica (sem prontuários inicialmente); academia; educação/cursos.
- Mercado, mercearia, loja física, comércio eletrônico, distribuidora.
- Restaurante, lanchonete, café, padaria, alimentação/delivery.
- Oficina automotiva, manutenção, construção, prestação de serviços.
- Hotelaria, hospedagem, eventos, transporte e logística.
- Agronegócio, indústria, fabricação, imobiliária, locação e outros.

**Sempre incluir “Outro ramo” + campo livre.** Não fingir uma lista finita de “todos os ramos existentes”. O registro deve ter identificador estável de ramo, nome livre sanitizado, possibilidade de múltiplas atividades e versão de perfil de capacidades. Evitar inferir requisitos regulatórios por nome.

Experiência:
1. Seleciona ramo(s), informa nome e endereço da área e vê **exatamente quais módulos já funcionam** e quais estão “em desenvolvimento”.
2. Se tiver apenas núcleo universal validado, permitir no máximo contratar o núcleo universal, **nunca** afirmar que PDV/cozinha/fiscal especializado está pronto. Disponibilizar pré-cadastro de interesse para o módulo setorial sem cobrar, com consentimento.
3. Cadastro e faturamento da empresa são atos distintos: trial não exige cartão; nenhuma cobrança surpresa.
4. Para empresas existentes sem novo campo, aplicar tipo padrão `barbearia` de forma **retrocompatível**, sem regravar contratos ou dados.
5. O usuário poderá corrigir ramo, nome e módulo opcional; mudança nunca apagará tabelas nem mudará dados fiscais automaticamente.

## Módulos especializados planejados (progressivos)
| Perfil | Essencial específico | Não alegar como existente sem teste |
|---|---|---|
| Barbearia/salão/serviços agendados | agenda, duração, profissionais, serviços, retorno, clubes e comissão | todos os casos já presentes no código ainda exigem produção validada |
| Comércio/mercado | PDV, código de barras, inventário, fornecedores, lote/validade | NFC-e/SAT, balança e TEF dependem de legislação, hardware, integração e custos |
| Restaurante/alimentação | mesas/comandas, tela cozinha, pedidos, retirada/entrega, ficha técnica | marketplaces, entregadores, impressoras e emissão fiscal |
| Cursos/escolas | turmas, alunos, aulas, pagamentos registrados e progresso | ambiente EAD e certificado oficial dependem de requisitos |
| Serviços/projetos | orçamentos, ordens de serviço, clientes, visitas, etapas e cobranças manuais | automação contratual/assinatura eletrônica paga |
| Hospedagem/locação | reservas, disponibilidade, check-in/out, regras de duração | integração com OTAs e fechaduras |
| Outros | catálogo genérico, clientes, tarefas, caixa, estoque/serviços conforme escolha | módulo setorial especial só após especificação |

Atividades reguladas (saúde, fiscal, financeiro) exigem controles próprios e revisão jurídica; não prometer prontuário nem emissão fiscal simplificada universal.

## Modo “Custo adicional zero” (exigência inegociável por padrão)
**Critério:** qualquer ação externa com cobrança conhecida ou possibilidade não verificada de cobrança deve falhar fechada no backend sem autorização explícita e limite.
- `OpenAI API`: desabilitar geração de texto/imagem, voz, resumo e transcrição por servidor; manter assistentes por regras e conteúdos produzidos manualmente/no Work.
- `WhatsApp Cloud API`: **não** fazer disparos proativos ou templates tarifáveis; usar link WhatsApp iniciado pelo cliente, filas de contatos voluntários e mensagens preparadas para envio humano. A IA nativa do WhatsApp Business pode ser explorada apenas na cota/preço confirmado e com autorização; ela não deve ser anunciada como integrada à agenda sem testes oficiais.
- `Meta Graph`/publicação: preferir agendamento nativo gratuito (Meta Business Suite); não assumir conta conectada. Monitorar apenas ações feitas de verdade.
- `Stripe`: tarifas por transação não são “custo zero”. Não iniciar novas cobranças no modo gratuito; **não desconectar ou cancelar assinaturas já ativas sem inventário e decisão expressa**. Lançamentos manuais precisam de conciliação e trilha de auditoria.
- `growth.js`: piloto de corte grátis e brinde de hidratação custa capacidade/insumo; manter desativado e propor alternativa de indicação **sem recompensa financeira**.
- `video.js`: renderização externa ou chamadas de geração/voz só após checagem de custo; corte local de vídeos próprios pode ser gratuito se hospedagem/cota o suportar.
- `hosting`: verificar os limites e custos da hospedagem/D1/R2 e do plano ChatGPT. Custo extra R$ 0 não é promessa de infraestrutura infinita.
- Exibir no painel **“Integrações opcionais desativadas: custo extra previsto R$ 0”** somente quando o bloqueio do backend for real. Não simular um teto no front-end.
- A pessoa não pode ativar recursos tarifáveis apenas clicando num botão genérico: mostrar provedor, como cobra, risco de uso, orçamento explícito e confirmação.

## Motor orgânico de aquisição que trabalha sozinho sem disparar mensagens
**Pipeline medido por eventos internos, sem contratar mídia ou APIs de IA:**
1. Landing universal adaptada a ramo, com oferta clara, horários, preços aplicáveis, localização e CTA “Agendar / Pedir orçamento / Fazer pedido”.
2. Links de origem com códigos não pessoais: Instagram orgânico, Google Perfil da Empresa, indicações, QR no balcão, cartão digital, parceiros.
3. Formulário consentido de interesse (nome e contato mínimo); proteger contra bots e dupla captação; política de privacidade LGPD.
4. Clientes voluntariamente compartilham código/link de indicação, **sem brinde automático nem spam**. Registrar origem → agendamento/pedido → comparecimento/venda → retorno.
5. Após venda/atendimento, apresentar pedido de avaliação **dentro do site**, e somente com a iniciativa do usuário abrir canal externo; sem pressão para avaliação positiva.
6. Backoffice gera tarefas e conteúdos orgânicos pré-aprovados de acordo com capacidade da equipe, estoque e procura. Não usar dados sensíveis como insumo de IA externa.
7. Relatório semanal por empresa: fontes de novos contatos, taxa de agendamento, comparecimento, retorno e receita confirmada, no-show e dias/horários ociosos. Distinguir “clique no site” de “venda”.
8. Publicação totalmente automática fora do sistema apenas quando a integração gratuita oficial estiver funcional; caso contrário, **fila pronta** para agendamento nativo ou execução humana.

Ciclo editorial inicial:
- Barbearia: prova de serviço, cuidados e clubes; com horários vagos conforme agenda.
- Comércio: itens úteis, disponibilidade e atendimento; nunca inventar estoque.
- Alimentação: cardápio, itens reais e retirada; jamais anunciar prato inexistente.
- Outros: catálogo e benefícios concretos. Sem promessas ou resultados falsos.

## UX
- Navegação inferior móvel com 4-5 itens principais conforme perfil; demais funções no menu superior.
- “Perfil da minha empresa” mostra ramo(s), capacidades ativas e detalhes dos custos opcionais.
- Vendedor não vê configuração de barbeiro; restaurante não vê “cortar cabelo”; barbearia atual mantém fluxos atuais até migração validada.
- Múltiplos estabelecimentos, escolha de unidade e troca rápida de perfil sem cruzar permissões.

## Fases seguras para ChatGPT Work
**Fase A, sem publicação:** inventário de produção, backups com restauração de ensaio, custos/assinaturas, comparação main vs Sites e leitura de AGENTS.md; registrar o que está desativado de fato.
**Fase B:** implementar classificador flexível de ramos com `outro` e testes de validação, persistência e retrocompatibilidade; marcar módulos disponíveis x não disponíveis; não abrir contratação enganosa.
**Fase C:** extrair núcleo universal do monólito gradualmente, manter barbearia atual como perfil legado; criar templates de comércio/mercado e restaurante com testes, sem alterar contratos.
**Fase D:** modo zero-custo efetivo no servidor, cobrindo rotas, tarefas agendadas e fila; testes de nenhum disparo/cobrança/IA via mocks; não desligar obrigações existentes.
**Fase E:** funil orgânico, captação voluntária, links rastreáveis, campanha de indicação sem brinde, painel semanal de KPIs por empresa e templates de conteúdo.
**Fase F:** QA em iPhone, segurança, papéis, isolamento multiempresa e backup/rollback; staging; PRs pequenos; publicar somente com validação e autorização.

## Testes de aceite obrigatórios
- Criação de empresa “outro ramo” preserva rótulo e não habilita recursos incompatíveis.
- Empresa já existente sem campo novo continua “barbearia” e todos os clientes/planos/agendas intactos.
- Empresas distintas não leem/escrevem nem herdam pagamentos, WhatsApp e tokens de outras.
- Falha fechada para qualquer cobrança por uso; processo agendado não ignora a trava.
- Não há publicação, IA, mensagens ou cobrança externa declarada “automática” sem evidência verificável.
- Botões e páginas móveis não anunciam módulos setoriais inexistentes.
- Os relatórios usam dados reais e sinalizam ausência de dados.
- Testar `npm test`, `npm run build`, validação de migração e prévia antes de publicar.

**Princípio final:** primeiro confiabilidade e fluxo de caixa da Barbearia do João; depois núcleo universal; depois módulos setoriais. Uma plataforma multirramo de verdade é arquitetura de produto, não apenas troca de nome.
