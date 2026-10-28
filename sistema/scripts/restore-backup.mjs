// Recovery drill into a NEW local SQLite database. Never overwrites an existing database.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync,writeFileSync,unlinkSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {TENANT_SCHEMA} from '../worker/tenant-schema.js';
import {scopeSQL} from '../worker/tenancy.js';
import {openBackup,validateSnapshot} from '../worker/backups.js';
export function restoreNewDatabase(snapshot,path){validateSnapshot(snapshot);
 if(existsSync(path))throw new Error('Destination exists. Use a new isolated database.');
 const db=new DatabaseSync(path);let done=false;
 try{db.exec('PRAGMA foreign_keys=OFF');db.exec('BEGIN');const triggers=[];
  for(const section of snapshot.sections){const prefix=section.id==='root'?'':'w_'+section.id+'_';
   for(const part of TENANT_SCHEMA.split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean)){const sql=prefix?scopeSQL(part,prefix):part;if(/^CREATE TRIGGER /i.test(part)){triggers.push(sql);continue}db.exec(sql)}
   for(const table of section.tables){const name=prefix+table.name,allowed=new Set(db.prepare('PRAGMA table_info("'+name+'")').all().map(x=>x.name));for(const row of table.rows){const columns=Object.keys(row);if(!columns.length||columns.some(x=>!allowed.has(x)))throw new Error('Unknown backup column');const insert=db.prepare('INSERT INTO "'+name+'" ('+columns.map(x=>'"'+x+'"').join(',')+') VALUES('+columns.map(()=>'?').join(',')+')');insert.run(...columns.map(x=>row[x]))}}
  }
  for(const trigger of triggers)db.exec(trigger);if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Foreign key validation failed');if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Integrity check failed');db.exec('COMMIT');done=true;return {restored:true,sections:snapshot.sections.length,tables:snapshot.sections.reduce((n,x)=>n+x.tables.length,0)}
 }finally{db.close();if(!done&&existsSync(path))unlinkSync(path)}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);if(!input||!output||!process.env.BACKUP_PROTECTION_KEY)throw new Error('Usage: BACKUP_PROTECTION_KEY set privately; node scripts/restore-backup.mjs encrypted.json new.sqlite');const envelope=JSON.parse(readFileSync(input,'utf8'));const snapshot=await openBackup(envelope,{CONNECTION_MASTER_KEY:process.env.BACKUP_PROTECTION_KEY,...(envelope.workspace==='root'?{}:{WORKSPACE:{id:envelope.workspace}})});console.log(JSON.stringify(restoreNewDatabase(snapshot,output)));
}
