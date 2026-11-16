# Acesso do cliente, profissionais e encaixes — 08/11/2026

Esta atualização substitui as limitações de implementação descritas em `CADASTRO-E-ENCAIXES-2026-11-08.md`. Parte da fonte v58, commit `726f4f4c68d7f1e2ff3d970a64fecfc2dce5bb69`, no repositório do Sites. O GitHub separado não foi sincronizado nesta sessão.

## Agenda da equipe

Profissionais e gestores podem consultar/cadastrar clientes e reservar para um cliente selecionado ou cadastrado no próprio formulário. As permissões `clients`, `contacts` e `book` continuam aplicadas. Por padrão, o profissional recebe cadastro/contatos; restrições explícitas do proprietário são preservadas. Profissionais reservam somente na própria agenda. Gestores escolhem o profissional.

O formulário diferencia:

- **Agendamento normal**: apenas horários disponíveis, ocupando a duração completa.
- **Encaixe**: aceita sobreposição com outros atendimentos e aparece identificado na agenda. Exige opção explícita da equipe. Preserva expediente, intervalos, bloqueios explícitos, duração, antecedência e regras de pagamento/cobertura/cota do clube.

Encaixes ficam registrados como agendamentos normais de serviço, com metadados de auditoria em `agenda_overlap:<id>`, sem disputar a chave única dos slots. A consulta de ocupação usa todos os atendimentos não cancelados, incluindo encaixes, para manter os próximos agendamentos normais consistentes mesmo após cancelar o atendimento sobreposto. Cancelar um encaixe não apaga a ocupação de outro atendimento. Na remarcação, somente a equipe pode preservar a autorização de sobreposição de um encaixe existente.

## Acesso do cliente

A área `/acesso` oferece Entrar, Criar acesso e Esqueci a senha. O cadastro pede nome, e-mail, WhatsApp com DDD e consentimento para as mensagens de verificação. A ativação exige link de e-mail e código do telefone. O código do WhatsApp vale 10 minutos, o cadastro/link de e-mail 30 minutos e o link de recuperação 15 minutos. As provas pertencem à solicitação original e não são retornadas pelas APIs.

Só após ambas as confirmações é criada a credencial e enviada a senha provisória ao telefone validado. A senha tem validade indeterminada até o cliente trocá-la. O banco guarda derivação criptográfica com sal (PBKDF2-SHA256, 600 mil iterações), com alternativa scrypt N=2^14/r=8/p=5 quando o runtime limita WebCrypto. A senha em trânsito para envio fica somente em envelope criptografado e é removida após aceitação pelo provedor. Falha no envio pode ser retomada sem duplicar o acesso; também existe recuperação por e-mail.

Sessões usam tokens aleatórios de 256 bits em cookies Secure/HttpOnly/SameSite=Lax, com hash no banco, escopo por empresa e validade de sete dias. Troca/redefinição revoga sessões antigas. Links de recuperação são de uso único. Há limites por IP, conta, telefone e site. Recuperação retorna a mesma mensagem para conta existente ou inexistente. Credenciais locais atendem apenas clientes: nunca concedem acesso de gestor/barbeiro. Nenhuma senha é exposta à equipe ou ao endpoint de configurações.

Cadastros manuais existentes são reaproveitados apenas quando os contatos coincidem e ambos foram comprovados. Cookies de um espaço não autenticam em outro. Configurações e tokens `auth:*` não entram no objeto público de configurações. Não houve migração destrutiva de tabelas.

## Ativação operacional e limites

Em Configurações, somente o proprietário pode conectar Brevo ou Resend, informar remetente validado, testar um envio ao próprio e-mail e preparar/consultar os modelos WhatsApp `joao_acesso_verificacao` e `joao_senha_provisoria` (AUTHENTICATION, pt_BR, copiar código). O primeiro inclui prazo de 10 minutos; o segundo não anuncia vencimento. Aceitação pela API não comprova entrega na caixa de entrada ou no WhatsApp.

Antes de anunciar cadastro público funcional, é necessário:

1. Conectar um serviço real de e-mail e validar seu remetente. A consulta inicial do runtime não encontrou credencial de envio de e-mail. Stripe CLI/Projects não está disponível neste ambiente; não foi provisionado serviço nem assumida assinatura paga.
2. Criar e obter aprovação dos dois modelos de autenticação da Meta. Os seis modelos operacionais anteriores não substituem estes modelos. Registrar no histórico desta sessão o resultado real da tentativa de criação/consulta.
3. Executar uma inscrição real autorizada, confirmar e-mail/telefone, receber a senha, entrar, trocar e recuperar a senha. Testes locais usam provedores simulados e não comprovam entrega real.

O cadastro pela equipe e os agendamentos funcionam independentemente da ativação dos envios de acesso. Não declarar o escopo amplo do produto inteiro concluído: teste bidirecional do WhatsApp e ciclo real de pagamentos continuam exigindo evidências próprias.

## Validação

Testes automatizados cobrem dupla verificação, expiração e tentativas, senha provisória sem expiração, troca, revogação e logout, recuperação de uso único, falha/retomada do envio, senhas protegidas, reaproveitamento de clientes, bloqueio de acesso da equipe por senha local, isolamento entre empresas, cadastro pelo profissional, reserva em sua própria agenda, encaixes, cancelamento e remarcação. Prévia do navegador confirmou cadastro dentro do formulário e duas reservas de corte de 45 minutos às 16h, uma marcada como Encaixe. Apenas dados sintéticos na prévia; nenhuma reserva fictícia foi criada em produção.

Referências de implementação: OWASP Password Storage/Forgot Password; Cloudflare Workers Web Crypto e node:crypto; APIs oficiais de envio transacional da Brevo e Resend. As restrições da Meta são confirmadas pela resposta do provedor, sem considerar modelo pendente como aprovado.
