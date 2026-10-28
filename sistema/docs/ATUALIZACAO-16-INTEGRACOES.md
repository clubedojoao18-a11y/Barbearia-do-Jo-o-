# Integrações e recuperação — versão 16

## Alterações concluídas nesta etapa

- Chave OpenAI já criada e autorizada pelo proprietário em 27/10 reutilizada a partir do arquivo privado `.env.local`. Transferida para o segredo `OPENAI_API_KEY` do Site sem exibir o valor. A configuração de ambiente foi aplicada por nova implantação. Nenhuma outra chave foi criada e nenhum segredo foi incluído no Git.
- Endpoint Stripe de produção existente preservado. Acrescentados `checkout.session.expired` e `checkout.session.async_payment_succeeded`, mantendo os eventos anteriores. A Stripe confirmou a atualização. Não houve cobrança de cliente nem mudança de preço.
- Backups criptografados AES-GCM com chave do ambiente e namespace autenticado, em armazenamento R2 privado. O snapshot principal contém a base principal e todas as empresas registradas em uma leitura transacional; detecta alteração simultânea no cadastro de empresas. Não salva snapshot parcial se exceder os limites de capacidade.
- Backup confirma o arquivo salvo por leitura, descriptografia e conferência SHA-256. Download exclusivo do proprietário retorna somente o arquivo protegido. Rotina diária pode ser pausada; depende do executor em nuvem. Não confundir autorização da rotina com execução real comprovada.
- Recuperação ensaiada em um novo SQLite isolado. A ferramenta recusa destino existente, confere chaves estrangeiras e integridade e restaura os movimentos de estoque sem aplicá-los duas vezes. Não foi realizada restauração na base de produção.
- Academia integrada à navegação do sistema com as oito aulas existentes, exercícios e progresso individual. Texto integral e gabarito não são enviados a alunos sem direito de acesso. A base antiga foi inspecionada: zero pedidos, vendedores, progresso e candidaturas, uma linha de configuração. Não havia usuários ou direitos pagos para migrar. Site antigo e banco permanecem preservados.
- Mensalidade recorrente EU SOU no cartão: condições membro, educador e fundador; convite obrigatório para condição especial fundadora; sessão idempotente; portal; concessão de acesso apenas por fatura confirmada, com valor, assinatura, titular e período validados. Receita entra no projeto EU SOU uma vez. Não muda assinatura dos clubes da barbearia. Assinaturas novas só são abertas depois de o proprietário aprovar valores e liberar no painel. Valores iniciais são propostas, não garantias de margem. Não foi criada assinatura real.

## Recuperação e limites

A chave de proteção do ambiente deve permanecer disponível para recuperar os arquivos. Não está incluída no backup. Perder essa chave impede descriptografia. Não rotacioná-la sem plano de migração dos arquivos e das conexões protegidas. Limites do piloto: 1.000 linhas por tabela e 8 MB de JSON por snapshot; exceder qualquer limite bloqueia a criação e exige exportação maior. Não há exclusão automática de cópias antigas.

O script `scripts/restore-backup.mjs` exige a chave de proteção fornecida por ambiente privado e um caminho de SQLite novo. É ferramenta de ensaio, não restauração automática do Cloudflare D1 em produção.

## Pendências que não devem ser declaradas concluídas

Conexão oficial dos dois Instagrams e teste de publicação; conexão WhatsApp Meta e troca real de mensagens; execução em nuvem e backup real confirmados; teste da IA a partir do servidor; transcrição e cortes de vídeo com processamento externo; comanda completa e reembolsos; importação de conversas WhatsApp quando o arquivo for entregue. A aprovação dos preços da comunidade é uma ação administrativa separada da implementação.

## Continuidade pelo Site

Ferramentas autenticadas do proprietário: `verify_ai_connection`, `create_verified_backup`, `automation_status`, `process_automations`. Usar a conexão nativa do Site; jamais transmitir tokens no texto das tarefas. `process_automations` respeita pausa e programação do canal, limites de uso e vigência da empresa; tenta backup diário se autorizado. Falha de conexão não é sucesso nem motivo para recriar assinaturas, publicar conteúdo duplicado ou expor credenciais.
