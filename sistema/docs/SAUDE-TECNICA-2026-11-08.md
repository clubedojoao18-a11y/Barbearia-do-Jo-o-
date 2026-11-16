# Saúde técnica — 08/11/2026

## Escopo e preservação

Executor de nuvem disponível. Nenhum AGENTS.md encontrado nos checkouts examinados. Checkout original em work/f023385 preservado, sem alterações locais; main atual obtida em worktree isolado. Não foram examinados clientes, segredos ou dados privados de produção.

Base GitHub: `61ecd1814a3a902a4385a380a4070d1bf6ba5b5e`. Publicação Sites 56 confirmada como succeeded, fonte `2f32483c99a2b901e548421cfc0ce9606cd4eff8`. Comparação limitada à proveniência, histórico e JavaScript público; não é comparação integral do backend publicado. A interface pública apresenta os marcadores de agenda semanal, concluir/reagendar e aviso de modo sem API paga; a presença do aviso não comprova o valor atual da configuração do servidor.

## Mudanças desde a última verificação

- Main avançou de f023385 para 61ecd18. Não repetir como pendentes as funcionalidades incorporadas.
- [PR #12](https://github.com/clubedojoao18-a11y/Barbearia-do-Jo-o-/pull/12): recuperação da versão 53, portal EU SOU, identidades e núcleo multissetorial.
- [PR #13](https://github.com/clubedojoao18-a11y/Barbearia-do-Jo-o-/pull/13): concluir e reservar próximo atendimento sobre a agenda atual 45/90 e grade de 15 minutos, substituindo a proposta antiga #9.
- [PR #14](https://github.com/clubedojoao18-a11y/Barbearia-do-Jo-o-/pull/14): limpeza de stories vencidos sem consumir o lote de itens válidos.
- [PR #15](https://github.com/clubedojoao18-a11y/Barbearia-do-Jo-o-/pull/15): recuperação de stories com tolerância de seis horas.
- PR #10 incorporado. PRs #2/#3/#4/#5/#9 encerrados sem merge. [PR #8](https://github.com/clubedojoao18-a11y/Barbearia-do-Jo-o-/pull/8) permanece planejamento em rascunho; parte do núcleo multissetorial já existe, módulos especializados continuam pendentes.

Essas incorporações e publicações precedem esta checagem; esta execução não fez merge ou deploy.

## Executado agora

```sh
cd sistema
npm test
npm run build
node scripts/validate-artifact.mjs
npm run readiness
git diff --check
```

219 testes aprovados, zero falhas e ignorados; scanner de credenciais, build, artefato ESM e inspeção das quatro migrações aprovados. SQLite isolado, APIs simuladas e FFmpeg real com mídia sintética. Nenhuma migração foi aplicada. Testes antigos das branches encerradas não foram repetidos: a main atual é a referência relevante.

## CI consultado, sem nova execução disparada

As 30 execuções recentes consultadas não tinham falhas nem pendências. [Validação da main](https://github.com/clubedojoao18-a11y/Barbearia-do-Jo-o-/actions/runs/42438395296) aprovada. [Workflow periódico de vídeo](https://github.com/clubedojoao18-a11y/Barbearia-do-Jo-o-/actions/runs/42465826206) aprovado; isso não comprova geração ou publicação de mídia real, pois pode não haver trabalho ou conexão.

## Pendências e próxima ação

1. Comparar integralmente a fonte publicada 56 com a main antes de alterar comportamento operacional; preservar arquivos exclusivos e não substituir a publicação por checkout antigo.
2. Revisão visual em celular e validação de ponta a ponta continuam separadas da suíte local; não foram executadas nesta checagem.
3. WhatsApp, Instagram/Direct, pagamentos e backup têm evidências históricas nos documentos de continuidade, mas não foram revalidados aqui. Não executar geração, envio ou publicação para testar conexões nesta rotina.
4. Rever o planejamento #8 à luz do núcleo multissetorial já incorporado; não anunciar hotéis, mesas, escolas ou múltiplas unidades como módulos concluídos.

Apenas documentação de entrada foi corrigida nesta proposta. Nenhum código operacional, configuração, preço, assinatura, mensagem ou dado de produção foi alterado. Nenhuma API paga foi usada, serviço contratado ou segredo criado/removido.
