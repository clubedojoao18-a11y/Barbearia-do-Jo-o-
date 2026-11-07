# Identidade visual e revisão — 29/10/2026

Base: versão 31 do Site, commit 7da4eb6f681c45c0172dfa9e44b04ba36874f163. O histórico mostra que Minha marca permaneceu em studio-ui.js/studio.js e foi agrupada em Configurações na reorganização do menu. Não foi encontrada retirada dos módulos de marca ou venda do sistema. A revisão dos menus preserva destinos permitidos, inclusive os sem grupo explícito.

## Correções publicadas nesta entrega

- Grupo Marca e sistema aberto no menu completo. Identidade visual tem acesso direto também em Configurações.
- Cada empresa tem atalho Configurar identidade visual na área comercial, para o próprio caminho #brand.
- Mesma regra de cores e fontes no carregamento e na aplicação imediata: barra inferior, destaques e cartões principais. Alternar fonte moderna para clássica restaura a tipografia; remover logo restaura o símbolo imediatamente.
- Logo atual aparece na prévia da marca. Alterações continuam restritas ao proprietário de cada empresa e isoladas por namespace.
- Nenhum módulo operacional removido. Barra inferior conserva quatro atalhos por perfil; demais destinos continuam no menu completo.

## Validação

176 testes passaram, incluindo persistência da marca entre requisições, isolamento entre empresas, permissões, compilação do JavaScript e alcance de todos os destinos do menu. Segredos, migrações, build e artefato devem passar antes da publicação. QA visual indisponível: navegador da nuvem falhou com timeout de emulação/foco ao acessar a prévia; não foi substituído por automação fora do fluxo suportado.

## Pendências externas conferidas nesta sessão

- WhatsApp: configured=false e verified=false. Faltam conexão Meta, webhook/modelos e comprovação de conversa real.
- IA: acesso ao modelo verificado HTTP 200. Último teste de geração permanece bloqueado por billing_not_active; acesso ao modelo não comprova geração.
- Instagram: rotinas dos projetos barbearia/eusou desativadas, filas vazias, nenhuma publicação confirmada. Conta conectada no Metricool não equivale à conexão direta Meta usada pelo Site.
- Stripe live acessível, recebimentos/repasses habilitados, cartão como método exclusivo. Pagamento, renovação, recuperação e repasse reais sem evidência própria.
- Venda do sistema: código e identidade disponíveis; preço/liberação comercial, contratos e consumo IA compartilhado incluso na mensalidade não foram declarados concluídos. O modelo atual ainda usa conexões de IA por empresa.
- Open Finance exige provedor e autorização bancária; não foi simulado.

Não foram alteradas credenciais, preços, matrículas, cobranças, clientes ou campanhas de produção nesta correção. Nenhuma mensagem ou publicação foi enviada.
