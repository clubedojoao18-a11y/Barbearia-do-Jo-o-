# Continuidade — 14/11/2026

Base: Sites v60, commit f35525817cad1c3a9740a098d6be9b10e094e0c1. Site existente e público preservado; nenhuma migração ou alteração de preços.

## Correção de backup

Backups acima de 8 MiB agora usam compressão gzip sem perdas antes da criptografia AES-GCM. O formato v2 autentica versão, codec, tamanho original e espaço na AAD. A leitura limita a descompressão ao tamanho autenticado, com teto de 24 MiB original e 8 MiB comprimido. A cópia inteira continua obrigatória; nenhuma tabela é excluída para caber no limite. Cópias v1 continuam legíveis e o restaurador isolado existente usa o mesmo leitor.

Validação: 247 testes aprovados, incluindo cópia com 7 MiB de mídia binária em base64 (>8 MiB de JSON), gravação e releitura do armazenamento, restauração SQLite em banco separado, comparação integral da mídia, metadados adulterados, compatibilidade v1 e recusa sem cópia parcial acima do limite. Build, validação ESM, quatro migrações locais e git diff --check aprovados. Isso não comprova restauração de dados reais nem pagamentos reais.

## Bloqueios confirmados antes da correção

- WhatsApp: número conectado, seis modelos operacionais aprovados, callback no domínio correto e aplicativo inscrito. Nenhuma mensagem correspondente ao número recebida, nenhuma resposta entregue comprovada. Meta limita a conta por nome de exibição/verificação empresarial pendentes.
- Cadastro direto por e-mail/senha: interface e código existentes; envio de e-mail não configurado. Modelos de autenticação `joao_acesso_verificacao` e `joao_senha_provisoria` ausentes; último erro Meta 10/2388185 informa falta de permissão para criar modelo. Cadastro pela equipe é independente dessa etapa.
- Três contas Instagram conectadas; 6/5/6 publicações informadas pelo sistema. Não duplicar conteúdo EU SOU já programado no Metricool.
- Stripe: conexão em produção, cobranças e repasses habilitados; primeira compra/renovação/repasse real ainda sem evidência própria. Não executar uma cobrança para testar.

## Continuação

Depois da publicação, criar/verificar backup pelo conector e registrar o resultado. Testar ida e volta WhatsApp com mensagem nova de outro número autorizado; não confundir eventos assinados de outros números com recebimento. E-mail exige acesso autenticado ao provedor já escolhido e remetente validado. Não assumir que autorização ampla conclui login, aprovação da Meta ou validação financeira externa.
