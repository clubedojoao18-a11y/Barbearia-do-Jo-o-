# Barbearia do João — continuidade

## Estado desta revisão — 29/10/2026

Esta branch recupera a fonte Sites **35**, commit `85b76674bd6ea5d34aaac5031f15d208b31dbf6f`, sobre main GitHub `f023385ef26754ca12f6e4e9b7f4edc25eae884a`. A base recuperada passou em **182 testes**. Não houve merge ou deploy. Os dados abaixo de versão 8/52 testes são histórico e não descrevem a revisão atual.

Leia `sistema/docs/RETOMADA-CLOUD-2026-10-29.md`. Não usar API paga OpenAI, criar chaves ou contratar serviços nesta retomada. O código suporta `AI_API_DISABLED=true`; sua existência não configura a hospedagem. Segredos e dados reais ficam fora do repositório.

Node 24 com node:sqlite e FFmpeg/FFprobe; sem dependências npm externas. Além de npm test, execute npm run build, node scripts/validate-artifact.mjs e npm run readiness dentro de sistema/. Readiness inspeciona somente fontes locais. A prévia permite ?preview=public, ?preview=owner e ?preview=client, com identidade local de teste.

Publicar o ambiente de desenvolvimento não publica o site. GitHub Pages não executa Worker/D1. Toda publicação e ativação comercial exige ação separada.

## Registro histórico

Código em `sistema/`. O `index.html` da raiz é o protótipo antigo e não executa o sistema completo.

Site: https://barbearia-joao-clubes.clubedojoao18.chatgpt.site

Versão Sites 8 publicada em 27/10/2026. Fonte: `6afa8aad589cd9bf4664c626910fb028b34b2b63`.

```sh
cd sistema
npm test
npm run dev
```

Requer Node.js com node:sqlite. Prévia usa banco em memória e identidade local de teste; não executar esse servidor como autenticação de produção. Hospedagem real depende de Worker, D1 e identidade Sites. GitHub Pages não executa o backend.

52 testes locais aprovados, sem cobranças ou mensagens reais. Consulte `sistema/docs/ENTREGA-2026-10-27.md` para funções implementadas, limites, dependências externas e próximos passos. Não há sincronização/publicação automática GitHub–Sites. Não guardar chaves ou dados de clientes neste repositório.
