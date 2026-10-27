import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function command(...args){
  return spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:15000});
}

test('migrações existentes passam pela inspeção preventiva',()=>{
  const r=command('scripts/check-migrations.mjs');
  assert.equal(r.status,0,r.stderr+'\n'+r.stdout);
  assert.match(r.stdout,/Verificada:/);
});

test('relatório de prontidão declara integrações externas não verificadas',()=>{
  const r=command('scripts/readiness-report.mjs','--json');
  assert.equal(r.status,0,r.stderr+'\n'+r.stdout);
  const report=JSON.parse(r.stdout);
  assert.match(report.scope,/not a production audit/i);
  assert.ok(report.files.every(f=>f.present));
  assert.ok(report.integrations.length>=5);
  assert.ok(report.integrations.every(x=>x.status!=='VERIFIED'));
  assert.ok(report.integrations.some(x=>x.name==='Stripe'));
  assert.ok(report.integrations.some(x=>x.name==='WhatsApp Meta'));
});

test('relatório de prontidão não imprime valores de segredos',()=>{
  const secret='sk_test_should_never_appear_in_report_123';
  const r=spawnSync(process.execPath,['scripts/readiness-report.mjs'],{
    cwd:root,encoding:'utf8',timeout:15000,
    env:{...process.env,STRIPE_SECRET_KEY:secret}
  });
  assert.equal(r.status,0,r.stderr);
  assert.ok(!r.stdout.includes(secret));
});
