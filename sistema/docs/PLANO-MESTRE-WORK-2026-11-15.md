# Plano mestre de execução do Work | 15/11/2026

## Finalidade e fonte de verdade
Consolidar os pedidos do proprietário para Barbearia do João, plataforma multissetorial, comunidade EU SOU, JOANA AI, cursos e conteúdo. Documento de execução, **não comprovante de implementação**. Work deve confrontar o estado real com a versão publicada e este repositório antes de alterar, marcar cada item como **entregue / parcial / bloqueado / não iniciado**, com evidência, URL e responsável.

**Snapshot de origem:** main 61ecd1814a3a902a4385a380a4070d1bf6ba5b5e (08/11); Sites versão 56 citada na PR #16, a revalidar. PR #8 em draft (planejamento multirramos), PR #16 em draft (saúde técnica). Não presumir que mudanças posteriores no Work estão no GitHub ou vice-versa. Ler PRs abertas, histórico, documentação e fonte publicada; não sobrescrever a aplicação hospedada com uma cópia antiga.

**Ordem:** 1. segurança, backup, agenda e onboarding; 2. clubes, cobranças, WhatsApp e recuperação; 3. operação e IA da barbearia; 4. EU SOU, cursos e sistema comercial; 5. JOANA AI independente; 6. conteúdo, Instagram e expansão multissetorial.

## P0: segurança, reconciliação e integridade
- Inspecionar código, branches, PRs, migrações, CI, banco de produção e deployments do provedor de hospedagem, sem supor acesso. Comparar GitHub/main, versão realmente publicada e alterações feitas no Work; incorporar somente alterações válidas, testadas, sem apagar dados, secrets, configuração ou arquivos exclusivos da hospedagem.
- Criar backup íntegro e processo de restauração verificável ANTES de migração em produção. Usar migrações aditivas, feature flags, logs, rollback, testes de regressão e revisão de credenciais em cofres de segredos.
- Diferenciar autenticação de cliente, profissional, gestor e proprietário; princípio do menor privilégio para cada conta. O perfil de gestor/proprietário não deve aparecer como profissional agendável; proteger acesso do proprietário.
- Verificar ambiente e conformidade LGPD, consentimento de comunicação, opt-out, retenção, trilha de auditoria, segurança dos webhooks, rate limiting, proteção contra duplicidade de mensagens/cobranças; nenhuma chave, senha ou token exposto em GitHub.
- Verificar situação do provedor antigo AppBarber e eventual plano suspenso antes de importar dados; não criar dependência operacional de serviço suspenso sem um plano de migração.
- Entrega: inventário de funcionalidades e status real por requisito, links de evidência, erros, solução, responsável e checklist de aceitação.

## P1: agenda e acesso do cliente
- Agenda em calendário claro e responsivo: dia/semana/mês; por profissional e visão conjunta; horário ocupado identificado por nome/serviço e horários vagos claramente separados. Em cada slot vago, mostrar sugestão curta, específica e acionável para preenchimento, sem tratar sugestão como agendamento realizado.
- Agendamento de corte = 45 min; corte + barba = 90 min. Extras e produtos associados ao serviço não acrescentam tempo; serviços avulsos que só têm extra usam duração própria configurada. Expedição dos slots sem sobreposição indevida; encaixes em dois modos: respeitar horários livres ou permitir choque de horários mediante autorização explícita e aviso visual.
- Profissional/gestor pode selecionar ou cadastrar cliente e criar agendamento, concluir atendimento e reservar próximo corte. Regras de disponibilidade, bloqueio de horários, profissional escolhido, expediente, notificações e clubes validadas no backend. Dono/gestor administrativo não aparece como profissional disponível.
- Cadastro de cliente com e-mail e telefone; validar os dados por meios permitidos e comprováveis; acesso por e-mail + senha; senha provisória após validação, exigindo troca com fluxo seguro, sem enviar senhas em texto quando houver alternativa de ativação segura. Recuperação de senha por e-mail. Gestor acompanha clientes com acesso ativado versus apenas cadastrados.
- Ao cadastrar cliente, enviar pelo canal autorizado convite/link próprio para instalar o PWA/app e concluir ativação. Não alegar que foi enviado até haver ID de entrega e evento confirmado. Verificar funcionamento iPhone/Android/desktop.
- Importar clientes/assinantes históricos com deduplicação, consentimento e reconciliação; preservar contratos e saldos.

## P1: clubes, financeiro, automações e atendimento
- Conferir regras atuais de planos One, Bronze, Prata, Ouro, Clube Azul e Pai e Filho; preços, dias, sobrancelha inclusa, cobrança recorrente e direito a agendar conforme adimplência. Bloquear agendamento do clube inadimplente conforme política definida, evitando bloqueios indevidos.
- Validar Stripe ponta a ponta (conta, KYC, webhooks assinados, checkout real/teste, faturas, eventos duplicados, reentrega, repasses, comissões e conciliação); nunca afirmar que pagamento está ativo porque a API responde. Evitar cobranças duplicadas e checar pré-requisitos de liberação.
- Integração WhatsApp Business oficial com número atual preservado: webhook de recebimento/resposta, templates aprovados, atendimento, confirmação e lembretes de agenda, cobrança de mensalidades vencidas em dias acordados (ex. 10 e 20, quando aplicáveis), cancelamentos, recuperação de inativos há mais de 30 dias e histórico de conversas **somente quando autorizado e tecnicamente disponível**; não desconectar o número existente.
- Disponibilizar painel de caixa, despesas, receitas, estoque, vendas de extras e produtos, comissões por profissional e indicadores. Evitar contabilizar faturamento de teste como recebido. Dados integráveis ao Excel/Google Sheets apenas se sincronização real estiver configurada, com origem de verdade definida.
- Disponibilizar painel simples de saúde: status do envio/recepção WhatsApp, login, webhook, pagamentos, agenda, convites, falhas, fila e reprocessamento seguro. Medir tempo de resposta, conversão, retenção e ocupação; sugestões de venda automáticas não podem gerar contato sem consentimento.

## P2: negócios, comunidade e academia
- Plataforma comercial **multissetorial**: atender empresas pequenas ou grandes, qualquer setor; profissionais ilimitados por unidade; planos baseados em quantidade de clientes ativos e acréscimo mensal por unidade adicional. Não implementar precificação definitiva nem prometer módulos setoriais ainda incompletos sem validação financeira/funcional. Priorizar demonstração de valor, não de preço.
- Retirar o nome pessoal “João” da marca do sistema vendável, com marca autônoma conectada à identidade da comunidade EU SOU sem misturar as marcas; atualizar textos, páginas, metadados e links **somente após escolher e verificar nome/domínio**. Preservar “Barbearia do João” como marca da barbearia.
- Criar caminhos/links independentes e publicáveis: Barbearia, comunidade EU SOU, apresentação/experimentação do sistema, cursos/academia, JOANA AI isolada. Comunidade EU SOU deve ter entrada direta pelo Instagram, sem passar pelo site da barbearia.
- Academia/curso de barbeiro iniciante gratuito para membros da comunidade EU SOU conforme solicitação recente; migrar conteúdos existentes, manter trilha de aulas, acesso e progresso, sem cadastrar cobrança indevida. Outros cursos de empreendedorismo, marketing e beleza podem ser propostos/produzidos progressivamente com revisão de qualidade. Preservar programas comerciais existentes não abrangidos pela gratuidade.
- Separar identidades: Barbearia com paleta marrom-tabaco/cinza metálico, coroa minimalista sem navalha/tesoura; EU SOU com identidade autônoma e sentido de propósito sem linguagem religiosa necessariamente explícita; perfil pessoal voltado à autoridade/vida profissional e autenticidade.

## P2: JOANA AI, produto separado e integrado
- Criar JOANA AI como área própria, com produto/landing independente do pacote Barbearia e opção de usar a inteligência artificial isoladamente; integrar opcionalmente ao sistema principal. Base: React/TypeScript, backend Node/TypeScript, API OpenAI Responses com orçamento configurável, armazenamento seguro, filas e auditoria.
- Módulos: chat e memória com correção/apagamento acessíveis; gestão empresarial e agenda; conversa por voz; automações e rotinas agendadas; navegação em nuvem; controle de navegador em computador Windows e celular por agente consentido; criar, editar, corrigir, testar, versionar e publicar sites e apps a partir de pedidos; monitorar workflows.
- Conceder amplas permissões **operacionais revogáveis** e auditáveis por recurso e dispositivo, usando login legítimo, aprovação por serviço, MFA e permissões do sistema operacional. Nunca criar acesso escondido, bypass de autenticação, armazenamento de senha em texto, execução arbitrária sem rastreabilidade ou alegar controle de iOS/Windows quando não existe conector/agente ativo.
- Manter custos próximos de zero na infraestrutura quando viável, usando ferramentas gratuitas e créditos API existentes, mas registrar preço real de serviços, limites, consumo e consentimento antes de contratar algo novo.

## P2: conteúdo e canais
- Objetivos separados: Instagram pessoal = autoridade e posicionamento; Instagram Barbearia = vendas de clube, serviços extras, produtos, horários disponíveis e fidelização; Instagram EU SOU = comunidade, formação, cursos e valor da plataforma.
- Frequência planejada: 2–3 posts por semana por perfil, Reels semanais e referência de ao menos 5 Stories/dia por perfil **sujeitos a capacidade real, custo, autorização da conta e qualidade**. Publicações, envio de mensagens e marketing devem respeitar consentimento e regras dos provedores; agendar sem publicar peça incorreta.
- **Reels devem ser vídeos reais:** gravações originais autorizadas ou vídeos de fato gerados e renderizados, com movimento de cenas, continuidade, áudio e formato vertical, não um JPEG com pan/zoom/filtro vendido como vídeo. Marcar geração real como indisponível até implementação/teste; exigir prévia antes de autopublicar.
- IA de criação de roteiro, legenda, gravação, edição, conteúdo e campanhas; automação do Direct apenas quando Meta habilitar a API/permissões correspondentes. Verificar conexões Metricool/Meta e estado publicado; não inferir sucesso a partir de um job sem entrega confirmada.
- Publicar somente conteúdos consistentes com marca, canais conectados e políticas da plataforma; rastrear post IDs e links.

## Critérios de conclusão
1. Matriz única: requisito | estado anterior | alteração feita | teste | link publicado | pendência ou bloqueio.
2. Lint/testes/build/segurança, QA responsivo e fluxos ponta a ponta comprovados: cliente, barbeiro, gestor, proprietário, clubista, cobrança, falha e recuperação; ambiente real separado de testes. Testar envio/recebimento em canal de teste consentido.
3. Fazer commits pequenos e PRs revisáveis; incorporar o trabalho válido, sincronizar a main depois de testes e comparação com versão hospedada, e publicar a versão efetiva. Não confundir commit ou merge com deploy; conferir resposta da URL pública e logs.
4. Informar explicitamente **o que ficou bloqueado por Meta, Stripe, verificação, credenciais, pagamentos ou limitação do Work**, com link/tela da ação humana obrigatória e menor passo possível. Não alegar “100%” sem validação ponta a ponta.
5. Entregar URLs separadas de Barbearia, comunidade, sistema, cursos e JOANA AI, status de cada canal e resumo de custos mensais verificáveis.
6. Preservar dados e operação atual. Proibido apagar contas, remover contatos, transferir dinheiro, cadastrar cartão, comprar assinaturas ou realizar alterações financeiras irreversíveis sem confirmação específica do proprietário, embora mudanças técnicas reversíveis e publicação após testes estejam autorizadas.

## Comando de retomada
No ChatGPT Work, abrir este arquivo do GitHub e executar P0 -> P1 -> P2; confrontar também pedidos anteriores do usuário, tarefas e arquivos do projeto, além dos dois PRs drafts #8 e #16. Priorizar concluir pendências concretas, sem repetir módulos concluídos e sem interromper por detalhes de implementação que possam ser resolvidos autonomamente. Trabalhar por lotes rastreáveis de commits, testes, merges e publicação, registrando bloqueios reais. Ao final entregar resumo objetivo, URLs testadas, commit/deploy e o que não foi possível.
