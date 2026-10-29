# Custos, comissões e organização financeira — 28/10/2026

## Entrega

O menu Financeiro reúne Custos e precificação, Comissão dos clubes, Saúde e metas, Minhas finanças, Caixa e estoque e Comissões de avulsos. Tipografia do aplicativo ampliada, formulários com botões de pelo menos 44 px e navegação por grupos. Jornada profissional aceita um ou dois períodos não sobrepostos; reservas novas devem caber inteiras em um deles. Reservas existentes são preservadas.

## Precificação

Catálogo importado dos serviços ativos, extras, clubes, produtos ativos, comunidade e planos do sistema. Itens adicionais permitem simular Academia e outros negócios. Custos mensais, anuais (1/12), variáveis por unidade; taxas, tributos, ocupação, capacidade, trabalho e margem por negócio. Custos comuns devem ser divididos uma única vez.

Valores monetários internos são centavos inteiros; interface exibe reais. Rateio de custos fixos da barbearia usa horas disponíveis × ocupação; negócios digitais usam unidades/pagantes previstos. Materiais são por atendimento/unidade. Trabalho é o maior entre piso fixo e minutos × valor/hora. Percentual de comissão é alternativa ao piso de trabalho, não adição. Salários já contabilizados por trabalho/comissão não devem ser repetidos nos custos fixos.

Se B é custo sem trabalho, L é piso de trabalho, r soma taxas e tributos, c comissão, m margem (frações), preço mínimo = máximo((B+L)/(1-r), B/(1-r-c)). Preço sugerido = máximo((B+L)/(1-r-m), B/(1-r-m-c)), arredondado para cima ao centavo. Denominadores inválidos bloqueiam sugestões.

Clubes somam os serviços de cada ciclo familiar, tempo/materiais extras dos benefícios e frequência esperada. Simulações 2/4/6/8 ciclos mensais; One respeita um ciclo. Percentual mínimo de comissão do clube considera as regras mensais, inicialmente 40%. No modo individual, usa maior percentual contratado para estimativa conservadora. O fundo real é coletivo; custo atribuível de um clube não prevê exatamente seu resultado isolado.

Dados não conferidos ou capacidade/remuneração ausentes não geram sugestão. Acessibilidade e demanda não podem ser deduzidas apenas dos custos. Não afirmar sustentabilidade dos preços atuais sem cadastro real.

Aplicar exige confirmação de um preço individual e revisão dos cálculos; altera somente catálogo para novas vendas/assinaturas. Não migra contratos, não cobra, não ativa recebimentos. Serviços aplicados recebem preço promocional igual ao sugerido para impedir desconto abaixo do piso; interface informa isso antes. Estado protegido por revisão, verificação de preço atual e transação. Valores fora do limite comercial bloqueados.

## Comissão de clubes

Padrão autorizado: 40% do bruto para o fundo dos profissionais e 60% para a barbearia; corte 45 fichas e corte e barba 90. Barba isolada e outros serviços exigem uma regra definida pelo proprietário. Serviços extras não recebem fichas sem configuração própria.

Bruto = faturas dos clubes confirmadas pagas dentro do mês civil de São Paulo + ajuste documentado do mês para recebimentos externos/estornos. Não inclui produtos, avulsos, comunidade ou licenças. Faturas Stripe não devem ser repetidas em ajustes. Ajuste que produza receita negativa é recusado.

Somente agendamentos `kind=club`, `status=done`, com data no mês, geram fichas. Serviços sem mapa de fichas bloqueiam fechamento; não são inventadas fichas. Padrão: comissão = fundo × fichas do profissional / fichas totais. Rateio pelo método de maiores restos, desempate pelo ID, preserva exatamente os centavos.

Dois ajustes possíveis:
- Fundo fixo: peso individual 100 equivale ao padrão; 150 pesa 1,5. O total continua 40% (ou percentual geral escolhido).
- Percentuais individuais: cada profissional recebe seu percentual da parcela do bruto atribuída às suas fichas. A soma da equipe pode diferir de 40%; a interface explica o efeito sobre a parte da empresa.

Regras são por mês e herdadas nos próximos meses; ajustes de receita não são herdados. Rotina existente passa a inicializar o mês corrente com regras padrão e, depois da virada do mês, tenta fechar os meses abertos desde a ativação. O mês corrente não pode ser fechado. Mês sem fichas e fundo positivo permanece pendente. Erros são informados pela rotina e uma nova execução tenta novamente.

Fechamento cria snapshot imutável, com hash de regras/faturas/atendimentos, histórico e centavos. Novos registros após fechar geram aviso de diferença, sem reescrever o demonstrativo. Não efetua pagamento, transferência ou criação de despesa automática. Acertos de um fechamento devem ser conferidos pelo responsável e documentados separadamente.

Comissões fixas antigas de clubes são exibidas como alerta para conferir pagamentos já feitos, sem serem somadas ao novo fundo. Novos atendimentos de clube não geram simultaneamente comissão fixa por atendimento; avulsos mantêm seu fluxo existente.

## Saúde e finanças pessoais

Saúde mostra entradas registradas + faturas pagas dos clubes, saídas realizadas, contas previstas, provisão dos clubes e reserva. Indicador fica incompleto até conferência explícita do caixa e custos; saldo de caixa não equivale a lucro contábil. Alerta de liquidez considera provisão integral dos clubes e pode exigir ajuste de comissões já pagas. Metas diárias aproximam dias úteis restantes e não prometem vendas.

Minhas finanças usa chave por identidade autenticada. Profissionais e gestores acessam exclusivamente seus registros pessoais; acesso a outros IDs não existe na API. Configuração de orçamento, reserva e metas; entradas/saídas por mês, categorias e saldo. Prévia ou comissão fechada é exibida separadamente, sem converter previsão em entrada realizada. Configurações e registros privados ficam fora de `/api/manage`.

Open Finance NÃO está conectado. Não há provedor bancário instalado que ofereça a capacidade necessária. Conexão real exige provedor/instituição habilitada e consentimento individual com revogação. A tela não pede senha e não finge integração.

## Validação e dependências

Testes de fórmulas, fichas, centavos, isolamento pessoal, autorização, alterações concorrentes, fechamento imutável, diferenças após fechamento e jornada com pausa; regressão da aplicação; build e validação de artefato.

Backup de produção conferido antes da publicação: 1793180575-ea90a6bf-ea06-45dd-96df-9e3fa9feb5c1. Nenhuma migração de banco necessária; dados existentes não substituídos. Origem inicial: versão hospedada 23, commit cc2e30ecef88cc6e9483854ceb6546b8dfc45e36.

Verificação de acesso realizada: IA respondeu 200; Stripe live com charges/payouts habilitados, cartão; WhatsApp sem credenciais completas. Isso não prova cobrança/renovação/repasse real nem envio. Agenda horária existente do sistema permanece e inclui o novo fechamento. Custos reais e conferência de regras continuam necessários; Open Finance, WhatsApp e Instagram dependem de contas, credenciais e autorizações disponíveis.
