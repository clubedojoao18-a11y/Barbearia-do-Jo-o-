# Work sem API paga e menu móvel — 29/10/2026

- Menu móvel: rolagem passa para main dentro de uma altura dinâmica de viewport; barra inferior permanece fora da área rolável, com reserva de espaço e safe area. Em prévia com iframe 390×740, main rolou 1872 px e a barra manteve top 664 / bottom 740; documento permaneceu em scroll 0. Validação em Chromium, não substitui teste no Safari/iPhone real.
- Login preservado com a identidade autenticada do Sites. Nome completo e telefone continuam dados de perfil; telefone não foi transformado em senha. Autenticação própria demanda solução suportada separada.
- AI_API_DISABLED=true impede geração de texto, artes e transcrição e desliga a interpretação IA do WhatsApp, antes de qualquer chamada ao provedor. Credenciais existentes preservadas. Não altera o uso das conexões próprias de empresas licenciadas isoladas.
- Novo MCP autenticado save_work_content_drafts aceita até dois rascunhos por lote, proprietário somente, com chave estável por rotina/data e projeto. Validação, deduplicação e limite do Studio existentes. Não chama IA, gera imagens, programa nem publica. Nightly ChatGPT pode gerar textos usando o plano e salvar por esta ferramenta quando exposta.
- Painel Conversar no ChatGPT permite escrever e copiar um comando com nome/endereço público do sistema e abrir ChatGPT em outra aba. Não é chat incorporado, não executa comandos sozinho e não acessa memórias ou histórico do ChatGPT.
- Integração direta com a assinatura em app hospedado requer habilitação específica da OpenAI; não foi implementada por simulação nem copiando tokens do navegador.

182 testes aprovados, incluindo bloqueio de chamadas externas no modo sem API e importação por MCP sem publicação, permissão do proprietário e repetição sem duplicar. A conexão Meta permanece externa a estas correções; não foi declarada concluída.
