# Cortes automáticos de aulas

O Studio aceita MP4 com áudio de até 64 MB e 20 minutos. Para aulas maiores, exporte trechos menores antes do envio. O original fica privado no R2. Somente os cortes autorizados recebem um endereço com chave de acesso para leitura pela Meta.

## Conectar o executor

1. No site autenticado, abra Conteúdo, escolha Barbearia ou EU SOU e abra “Configurar executor de vídeo”.
2. Gere o acesso. A chave aparece uma vez e deve permanecer privada. Não cole a chave em conversas, commits, issues ou logs.
3. Em Settings → Secrets and variables → Actions do repositório GitHub, cadastre `JOAO_VIDEO_URL` e `JOAO_VIDEO_TOKEN` com os valores exibidos no site.
4. Habilite o workflow “Renderizar vídeos” e execute uma vez manualmente. Há uma execução programada a cada 30 minutos. Disponibilidade, tempo de início e minutos dependem do GitHub Actions.
5. Cada outra barbearia usa o endereço da própria área e o próprio token, em um executor separado. As credenciais não são herdadas da Barbearia do João.

O executor usa Node 24, FFmpeg e FFprobe. Também pode rodar em um host próprio com `node scripts/video-runner.mjs`, configurando os dois valores somente no ambiente protegido. Ele processa uma aula por execução. Não exige acesso à chave OpenAI ou ao token Instagram: essas credenciais permanecem no site.

## Fluxo

Após autorização de imagem, voz e conteúdo, o arquivo entra na fila. O executor reivindica uma aula com exclusividade, baixa o original autenticado, extrai áudio e solicita transcrição ao servidor. A IA escolhe até três trechos de 3 a 90 segundos com base na transcrição. O executor gera MP4 vertical 720×1280, preservando o quadro com faixas quando necessário, e inclui legendas. Arquivos temporários são apagados ao concluir ou falhar.

Os cortes entram no Studio como Reels. A publicação depende da conexão Instagram do projeto e de sua programação ativa. A fila usa a API oficial da Meta, espera o processamento do container e só marca publicado após confirmação. Resposta incerta pausa o envio para conferência, sem repetir automaticamente a publicação.

Transcrição e seleção consomem duas chamadas da cota diária compartilhada de IA por tentativa. Imagens e atendimento usam a mesma cota. Configure orçamento no provedor e revise a cota do Studio antes de ativar volume. O limite de chamadas não é um teto financeiro.

## Falhas e privacidade

Sem vídeo, token do executor, crédito de IA ou conexão Meta, a interface mostra a pendência. Uma falha de renderização requer revisão e repetição manual. Não são gerados depoimentos, aprovações ou publicações fictícias. A seleção automática não substitui avaliação editorial; mantenha o canal pausado para revisar os cortes antes de publicar quando necessário.

Remover o original pelo painel não apaga os cortes que já foram gerados nem uma publicação na Meta. Não remova originais em processamento. Retenção e arquivamento são controlados pelo proprietário. Aulas e autorização de imagens/vozes são fornecidas pelo proprietário; o sistema não cria consentimento em nome de terceiros.
