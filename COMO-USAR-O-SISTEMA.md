# Barbearia do João — sistema existente

## Continuidade verificada em 08/11/2026

Use `sistema/`. O `index.html` da raiz é um protótipo antigo; GitHub Pages não executa o backend Worker/D1.

Referência testada nesta data: main `61ecd1814a3a902a4385a380a4070d1bf6ba5b5e`, com **219 testes aprovados**, zero falhas ou ignorados. A plataforma confirma a publicação Sites **56**, fonte `2f32483c99a2b901e548421cfc0ce9606cd4eff8`. Os identificadores pertencem a repositórios diferentes; a publicação e a interface pública foram conferidas, mas o backend hospedado não foi comparado integralmente arquivo a arquivo nesta verificação.

Leia [o relatório de saúde técnica](sistema/docs/SAUDE-TECNICA-2026-11-08.md), o [handoff](sistema/docs/HANDOFF-WORK-PRODUCAO.md) e os documentos recentes de [identidades e portal](sistema/docs/IDENTIDADES-E-PORTAL-2026-11-07.md) e [fundação multissetorial](sistema/docs/FUNDACAO-MULTISSETORIAL-2026-11-07.md). Documentos antigos registram etapas anteriores; não presuma que descrevem a versão atual.

Node 24 com `node:sqlite` e FFmpeg/FFprobe. Dentro de `sistema/`:

```sh
npm test
npm run build
node scripts/validate-artifact.mjs
npm run readiness
```

Esses comandos usam verificação local; testes de provedores usam simulações e não comprovam pagamentos, mensagens ou publicações reais. `readiness` não consulta a hospedagem nem confirma conexões externas. Não aplique migrações ou execute scripts de operação para testar produção.

Para prévia isolada, `npm run dev -- --port 5173`; usa SQLite em memória e identidade simulada, nunca autenticação de produção. Não requer instalar dependências npm externas. Publicar o ambiente de desenvolvimento não publica o site.

Nesta rotina técnica, não usar API paga OpenAI, chaves/créditos, contratar serviços, fazer merge/deploy, enviar mensagens, cobrar ou alterar dados de produção. Outras rotinas têm escopo próprio: não as execute nem altere suas configurações durante uma checagem técnica.

## Registro histórico — versão 8

Os números de versão e testes abaixo são históricos, não o estado atual.

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
