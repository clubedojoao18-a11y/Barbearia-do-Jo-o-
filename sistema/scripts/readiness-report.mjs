#!/usr/bin/env node
/**
 * Production readiness report. Does not connect to production, inspect secret values,
 * or imply that provider integrations are working.
 */
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  ['Banco e migrações', 'drizzle/0003_operations.sql'],
  ['Aplicação', 'worker/index.js'],
  ['Testes', 'tests/app.test.mjs'],
  ['Documentação operacional', 'docs/ENTREGA-2026-10-27.md'],
];
const results = required.map(([name, path]) => ({
  name, present: existsSync(resolve(root,path)), path,
}));
const external = [
  ['Publicação Sites', 'NOT_VERIFIED', 'Comparar versão hospedada e GitHub, publicar com rollback'],
  ['Backup D1', 'NOT_VERIFIED', 'Criar backup criptografado e testar restauração'],
  ['Stripe', 'NOT_VERIFIED', 'Validar webhooks e assinatura em conta de teste'],
  ['WhatsApp Meta', 'NOT_VERIFIED', 'Validar webhook assinado, consentimento e envio autorizado'],
  ['Agendador', 'NOT_VERIFIED', 'Comprovar execução periódica autenticada'],
  ['Instagram e mídia', 'NOT_CONFIGURED', 'Configurar contas, autorização e processamento externo'],
  ['EU SOU recorrente', 'NOT_CONFIGURED', 'Aprovar preços e configurar assinaturas'],
];
const report = {
  generatedAt: new Date().toISOString(),
  scope: 'Source-code inspection only; not a production audit',
  files: results,
  integrations: external.map(([name,status,nextAction])=>({name,status,nextAction})),
  warning: 'Never upload secret keys, client exports, or database dumps to this public repository.',
};
if (process.argv.includes('--json')) console.log(JSON.stringify(report,null,2));
else {
  console.log('BARBEARIA DO JOÃO — PRONTIDÃO PARA PUBLICAÇÃO');
  for (const x of results) console.log((x.present?'OK':'FALTA')+' '+x.name+' — '+x.path);
  for (const x of report.integrations) console.log(x.status+' '+x.name+': '+x.nextAction);
  console.log(report.warning);
}
if (results.some(x=>!x.present)) process.exitCode=1;
