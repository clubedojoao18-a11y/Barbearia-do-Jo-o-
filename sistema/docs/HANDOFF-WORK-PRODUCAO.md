# Transferência operacional para ChatGPT Work — Barbearia do João + EU SOU

Este repositório é a fonte do código, **não** a comprovação de que a versão hospedada está atualizada. O ambiente de produção do ChatGPT Sites e o banco D1 precisam ser inspecionados com acesso autorizado. Não substituir dados existentes, não recriar o projeto e não executar migrações sem backup testado.

## Execução em ordem (obrigatória)

1. Identificar o projeto Sites existente e a versão implantada; comparar com a branch `main` deste repositório. Registrar diferenças antes de qualquer alteração.
2. Fazer inventário de usuários, assinaturas, agendas, produtos, movimentações e aulas. Exportar backup seguro fora do repositório público; verificar integridade e ensaiar restauração em ambiente isolado.
3. Rodar localmente `npm test`, `npm run build`, `node scripts/validate-artifact.mjs` e `npm run readiness`. Corrigir falhas sem contornar testes.
4. Aplicar migrações pendentes uma a uma em staging com cópia anonimizada. Avaliar `sistema/drizzle/`, efeitos sobre dados existentes, índices e rollback. **Nunca** aplicar automaticamente uma migração destrutiva.
5. Testar isolamento de dados e papéis cliente/profissional/gestor; agendamento concorrente, bloqueios, remarcação, cancelamento e regras dos clubes.
6. Configurar Stripe **somente cartão**, com segredos no cofre do ambiente e conta de recebimento já autorizada; conferir titularidade e preços aprovados. Validar checkout de teste, assinatura, falha de cartão, atualização de cartão, webhook assinado, reentrega e idempotência. Não ativar cobranças reais antes da aprovação operacional.
7. Configurar WhatsApp Business Cloud API com webhook HTTPS verificado e assinatura validada; confirmar número, templates aprovados, opt-in e janela de mensagens. Testar agendar/consultar/remarcar/cancelar com a mesma agenda e transferência para humano.
8. Para EU SOU, testar permissões educador/membro, acesso condicionado à mensalidade paga, cursos, progresso e biblioteca. Não presumir que cobrança recorrente ou publicação de mídia estejam operacionais.
9. Para Instagram e cortes de vídeo, usar APIs oficiais, permissões, consentimento de imagem e revisão humana inicial. Agendar conteúdo somente após autorização explícita da conta; não prometer publicação automática sem provedor configurado.
10. Configurar alertas, logs sem dados sensíveis, monitoramento de falhas, backup recorrente, retenção e procedimento de restauração. Publicar em janela controlada com plano de rollback. Testar fluxos de ponta a ponta no domínio final.

## Critérios de aceite

- Nenhum cliente, agendamento, assinatura ou histórico perdido.
- Testes automatizados e de aceitação passam; versão implantada identificada.
- Nenhuma chave secreta em commits, logs ou interface do cliente.
- Cada integração externa tem evidência de requisição/resposta real em ambiente de teste e status de produção documentado.
- Cobranças reais continuam desativadas até validação e autorização.
- O proprietário recebe relatório final com itens concluídos, pendências externas, riscos e instruções de reversão.

## Comandos

```bash
cd sistema
npm test
npm run build
node scripts/validate-artifact.mjs
npm run readiness
npm run readiness -- --json
```

## Status honesto

Os módulos existentes no repositório **não equivalem** a integrações ativas. Sem acesso à hospedagem, Meta, Stripe e banco de produção, não é possível concluir nem certificar a implantação.

