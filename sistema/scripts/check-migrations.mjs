import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const directory = new URL('../drizzle/', import.meta.url);
const files = readdirSync(directory).filter(name => /^\d+.*\.sql$/.test(name)).sort();
if (!files.length) throw new Error('Nenhuma migração SQL encontrada');
let failed = false;
for (const name of files) {
  const sql = readFileSync(join(directory.pathname, name), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n]*/g, '');
  const dangerous = /\b(?:DROP\s+(?:TABLE|DATABASE|COLUMN)|TRUNCATE\s+TABLE|DELETE\s+FROM|UPDATE\s+\w+\s+SET)\b/i.test(sql);
  if (dangerous) {
    console.error('REVISÃO MANUAL OBRIGATÓRIA: operação destrutiva ou mutação de dados em', name);
    failed = true;
  } else {
    console.log('Migração sem operação destrutiva identificada:', name);
  }
}
if (failed) process.exitCode = 1;
