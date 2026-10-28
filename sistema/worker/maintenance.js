import {testAttendant} from './attendant.js';
import {createBackup,openBackup} from './backups.js';
import {verifyIntegrations} from './integration-checks.js';

export async function maintenanceRoutes(req,env,url,h){
 if(url.pathname!=='/api/maintenance')return null;
 if(req.method!=='POST'||env.WORKSPACE)return h.json({error:'Operação indisponível.'},404);
 const expected=env.MAINTENANCE_JOB_TOKEN||'',provided=req.headers.get('authorization')||'';
 let diff=provided.length^('Bearer '+expected).length;for(let i=0;i<provided.length;i++)diff|=provided.charCodeAt(i)^('Bearer '+expected).charCodeAt(i);
 if(expected.length<32||diff)return h.json({error:'Sem permissão.'},401);
 const b=await h.body(req);
 if(b.action==='verify')return h.json(await verifyIntegrations(await h.paymentEnv(env),await h.conf(env.DB),h));
 if(b.action==='ai_smoke')return h.json(await testAttendant(env,h));
 if(b.action==='backup')return h.json(await createBackup(env));
 if(b.action==='restore_snapshot'){
  if(!/^\d{10}-[a-f0-9-]{36}$/.test(b.id||''))throw h.err('Backup inválido.');
  const object=await env.BUCKET?.get('backups/root/'+b.id+'.json');if(!object)throw h.err('Backup não encontrado.',404);
  const snapshot=await openBackup(await object.json(),env);
  // Explicit service export for an isolated restore rehearsal. Never a public download.
  return h.json(snapshot);
 }
 if(b.action==='inventory'){
  const tables=['users','appointments','memberships','invoices','products','eu_members','eu_lessons','wa_contacts','wa_outbox'];
  const counts={};for(const table of tables)counts[table]=(await env.DB.prepare('SELECT COUNT(*) count FROM '+table).first()).count;
  return h.json({counts,checkedAt:h.now()});
 }
 throw h.err('Ação de manutenção inválida.',400);
}
