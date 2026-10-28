import {readdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const dir = fileURLToPath(new URL('../drizzle/', import.meta.url));
const files = readdirSync(dir).filter(name => /^\d+.*\.sql$/.test(name)).sort();
if (!files.length) throw new Error('Nenhuma migração SQL encontrada');
let failed = false;
for (const name of files) {
  const sql = readFileSync(join(dir, name), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n]*/g, '');
  // Triggers can legitimately update aggregate stock on insertion.
  // Reject destructive schema statements unconditionally; review all data changes separately.
  const destructive = /\b(?:DROP\s+(?:TABLE|DATABASE|COLUMN|INDEX)|TRUNCATE\s+TABLE|DELETE\s+FROM)\b/i.test(sql);
  const statements = sql.split(';').map(x => x.trim()).filter(Boolean);
  const directUpdates = statements.some(s => /^UPDATE\s+\w+\s+SET\b/i.test(s));
  if (destructive || directUpdates) {
    console.error('REVISÃO MANUAL OBRIGATÓRIA:', name);
    failed = true;
  } else console.log('Verificada:', name);
}
if (failed) process.exitCode = 1;

