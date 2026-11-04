# Plano de retomada no Work: custo adicional zero e crescimento orgânico
**Data:** 04/11/2026  
**Projeto existente:** Barbearia do João, pasta `sistema/`; `index.html` da raiz é protótipo.  
**Regra do proprietário:** nenhuma compra, assinatura, anúncio, uso de API paga, mensagem tarifada ou mudança destrutiva sem autorização específica. Não criar outro projeto nem recriar a base. Este arquivo é um plano, **não comprova implantação**.

## 1. Meta e guardrails
- Meta: **R$ 0 de despesa operacional adicional** com funcionalidades opcionais. Custos já existentes de hospedagem/plano, tarifas de cartão e materiais de consumo não desaparecem por mudar o código. Não declarar “grátis” sem verificar cota, tarifas e condições.
- Preservar agenda, cadastro, contratos, clubes, histórico, valores, descontos vigentes, faturas e permissões; isolar também os dados da EU SOU e eventuais outras barbearias.
- Em produção, desativar por padrão qualquer caminho que possa incorrer em **custo variável** e exigir liberação explícita, identificando o provedor, limite e responsável.
- **NÃO remover chaves, cancelar cobranças recorrentes ou apagar tabelas no escuro**. Verificar primeiro a existência de assinaturas e obrigações ativas.
- Sem envio promocional indiscriminado, scraping de contatos, mensagens sem consentimento ou ofertas enganosas.

## 2. Evidência disponível em 04/11/2026 (não confundir com operação validada)
- `automation_status`: `apiDisabled=true`; ambos canais internos de Studio `auto=false`; Instagram interno não conectado; rotinas de geração não ativas.
- `verify_integrations`: IA configurada, porém desabilitada e teste real anterior com `billing_not_active`. Stripe em produção com conexão verificada, mas **não** prova de checkout, renovação ou repasse real. WhatsApp com conexão verificada, porém nem todos os templates conferidos; delivery/webhook requerem teste real e podem gerar cobrança.
- Código: `worker/studio.js` contém geração e imagem por OpenAI, `worker/growth.js` tem piloto de indicação com corte/brinde e orçamento >0 para ativar; `worker/delivery-budget.js` limita tentativas, **não garante tarifa zero**. Recursos de agenda, clubes, vendas, estoque, comissões e PWA existem, mas o banco/versão hospedada precisam de validação visual e de ponta a ponta.
- Comparação de mercado: CashBarber posiciona retenção, recorrência, margem e dados; AppBarber posiciona agenda, financeiro, estoque, lista de espera e gestão. Similaridade de escopo **não equivale** a paridade de produto/UX/reliability.

## 3. Cortar ou ocultar do produto operacional sem destruir os módulos
| Área | Ação para modo custo zero | Condição de retorno |
|---|---|---|
| OpenAI API (texto, atendimento, imagem, transcrição) | Deixar bloqueada por padrão; usar respostas determinísticas, formulários e conteúdo preparado no Work | Orçamento explícito e aprovação posterior |
| WhatsApp Cloud API de saída, modelos de marketing, cobranças por template, SMS | Suspender envios automáticos tarifáveis; oferecer link `wa.me` iniciado pelo cliente e respostas manuais / dentro das regras gratuitas verificadas | Confirmar tarifas e opt-in; nunca assumir cobrança zero |
| Publicação e arte via API no Studio / render de vídeo no servidor | Ocultar botões que acionam serviço pago; manter planejamento editorial e exportação; agendar por canais nativos gratuitos | Conexão gratuita comprovada e cota verificada |
| Stripe Checkout / Billing | Não criar transações ou cancelar recorrências inadvertidamente. Permitir registrar recebimentos manualmente e conciliar; manter integração como **opcional com taxa por transação** | Após auditoria de assinantes, oferecer opt-in com preços transparentes |
| Piloto de indicação com corte e hidratação de brinde | **Manter desligado**; trocar por indicação sem cortesias ou custos, antes de reativar | Orçamento e margem aprovados |
| Anúncios, impulsionamento, domínio premium, apps nativos de loja | Não ativar; priorizar PWA, link público, conteúdo orgânico e páginas atuais | Retorno comprovado e orçamento aprovado |
| Venda do SaaS multiempresa, cursos, IA avançada | Não apagar; reduzir destaque na navegação operacional e tratar como fase posterior | Operação principal estável e suporte dimensionado |

## 4. Mínimo produto confiável, em ordem
1. **Agenda e clientes:** verificar exibição no iPhone, bloqueios, jornadas, concorrência, remarcação, lista de espera e agendamento público. Confirmar duração de 45 min corte e 90 min corte+barba, sem arredondamentos incorretos, antes de mexer na produção.
2. **Clubes:** regras One/Bronze/Prata/Ouro, Pai e Filho, inadimplência, frequência e lançamento manual de recebimentos com recibo e trilha de auditoria. Nunca marcar pago sem comprovante.
3. **Gestão:** comissões, vales, produtos/estoque, caixa, custo, entradas e relatórios inteligíveis; sem telas duplicadas. Troca rápida de perfil gestor/barbeiro/cliente e menu inferior apenas com essenciais.
4. **PWA e segurança:** login adequado, permissões, backup restaurável, testes e alerta de falhas sem dados pessoais em logs; não cachear informação sensível offline.
5. **EU SOU:** identidade, conteúdo e permissões separados; não misturar receita, dados nem mensagens com a barbearia.
6. **Somente depois:** produto para outras barbearias, pipeline de conteúdo avançado, assistente conversacional pago, treinamento IA.

## 5. Motor orgânico de captação, repetível e sem disparos cobrados
**Funil:** Instagram/indicação/busca local → página leve “Conheça os clubes” → tabela clara de preço/benefícios → agendamento → comparecimento → pedido opcional de avaliação → retorno/assinatura → nova indicação.

**Implementar dentro do site:**
- Landing de clube com CTA “Agendar corte” e “Entender assinatura”, funcionamento claro, preço real e link para WhatsApp com conversa iniciada pelo interessado.
- Link de indicação por cliente **sem brinde**, com código não sensível, limite antiabuso e atribuição (origem, indicação, agendamento, comparecimento, assinatura); opção de compartilhar voluntariamente.
- Após atendimento concluído, mostrar convite opt-in para avaliação pública e sugestão proporcional de próximo serviço/produto, sem alegar resultados não comprovados.
- Lista interna de clientes sem retorno 30/45/60 dias e horários vagos, com **tarefas de contato manual**, respeitando consentimento e sem disparo de template.
- Painel semanal automático **local/regra**: novas visitas, ocupação por período, no-show, retorno em 30 dias, conversão avulso→clube, origem, receita recebida e estoque; exibir “sem dados” quando não mensurável.
- Conteúdo para três marcas separado: Barbearia = educação + serviços e produtos; Educador = técnica e atendimento; EU SOU = identidade e pertencimento. A programação automática exige contas conectadas em canais permitidos e planos compatíveis; não inventar publicação.
- Canais gratuitos sugeridos: publicações orgânicas programadas no Meta Business Suite, link na bio, página do negócio e atendimento iniciado pelo cliente; Instagram não concede alcance garantido.

**Ciclo semanal simples:** Segunda analisar demanda/agenda e escolher temas com regras pré-definidas; Terça a sábado distribuir conteúdo previamente aprovado; após cada atendimento oferecer avaliação e indicação; domingo gerar relatório e recomendar ajustes. Onde não houver automação gratuita oficial, produzir fila pronta para aprovação/publicação manual.

## 6. Indicadores e limite de custo
- Custos de APIs pagas opcionais por padrão: **limite zero e falha fechada**.
- Indicadores semanais: alcance que puder ser obtido sem API paga, cliques rastreáveis no site, agendamentos, comparecimentos, frequência, cancelamentos, assinantes pagos, margem aproximada, origem e indicações.
- Não confundir mensagens “preparadas” com “enviadas”; post “agendado” com “publicado”; pagamentos autorizados com “liquidados”.
- O serviço de hospedagem pode ter cotas ou tarifas próprias. Verificar antes de afirmar custo mensal zero.
- Proteção LGPD: consentimento e finalidade claros; opt-out e retenção limitada; não colocar telefone, nome ou dados pessoais em URL de campanha.

## 7. Sequência obrigatória para próxima sessão ChatGPT Work
1. Ler este arquivo, `sistema/docs/HANDOFF-WORK-PRODUCAO.md`, o README atual, as regras AGENTS.md existentes e comparar **main** com versão publicada no Sites.
2. Inventário de assinaturas ativas, fornecedores ativos, configuração real de custos, filas e rotinas, incluindo automações do ChatGPT. Sem revelar segredos.
3. Criar/validar backup íntegro e ensaiar restauração em ambiente isolado. Não alterar banco de produção sem isso.
4. Criar chave geral `CUSTO_EXTRA_ZERO` ou equivalente, efetiva no servidor e testes, bloqueando por padrão API pagas, disparos e geração; identificar exceções como Stripe com tarifa por transação. Antes de mexer em pagamentos, garantir não interromper cliente pagante.
5. Corrigir menu e UX, e finalizar a funcionalidade de agenda/clubes/caixa já implementada. Rodar testes `npm test`, build, migrations check, QA em celular, segurança e testes end-to-end.
6. Implementar o funil e as métricas do item 5 como módulos pequenos, sem redesenhar todo o projeto; rodar testes antiabuso, de privacidade e de concorrência.
7. Validar em staging; criar PR com evidência e plano de reversão; publicar **somente** após verificações e autorização para mudanças que afetem serviços ativos.
8. Produzir relatório: custos evitados, custos residuais que não podem ser zerados, métricas e checklist do que foi efetivamente testado em produção.

## 8. Aceite
- Sem novos pagamentos, assinaturas, tarifas por API, mensagens automatizadas tarifadas ou chamadas à IA paga provocadas pelo sistema sem autorização.
- Agendamentos, clubes, dados, direitos, equipe e recebimentos existentes preservados.
- Canal gratuito de aquisição funcionando com eventos registráveis e **sem garantia artificial de vendas**.
- Produto simples, rápido e legível no celular.
- Comparação de comportamento entre código e produção documentada. O Work não deve declarar “concluído” apenas por testes simulados.
