# Barbearia do João — sistema existente

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
