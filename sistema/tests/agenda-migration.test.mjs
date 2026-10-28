import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {scopeSQL} from '../worker/tenancy.js';
const sql=readFileSync(new URL('../drizzle/0004_agenda_15_minutes.sql',import.meta.url),'utf8');
for(const prefix of ['', 'w_'+'a'.repeat(32)+'_'])test('legacy half-hour locks expand without changing reservations: '+(prefix||'main'),()=>{
 const db=new DatabaseSync(':memory:');try{
 const scope=q=>prefix?scopeSQL(q,prefix):q;
 db.exec(scope(readFileSync(new URL('../drizzle/0000_clube.sql',import.meta.url),'utf8')));
 db.exec(scope("INSERT INTO users(id,email,name) VALUES('u','u@example.com','Teste'); INSERT INTO appointments(id,user_id,barber_id,date,time,service,duration,price,kind) VALUES('cut','u','b','2026-12-01','10:00','corte',30,4000,'single'),('combo','u','b','2026-12-01','10:30','combo',60,6000,'single'),('block','u','b','2026-12-01','12:00','block',60,0,'block'); INSERT INTO slots VALUES('b','2026-12-01','10:00','cut'),('b','2026-12-01','10:30','combo'),('b','2026-12-01','11:00','combo'),('b','2026-12-01','12:00','block'),('b','2026-12-01','12:30','block');"));
 const before=db.prepare(scope('SELECT * FROM appointments ORDER BY id')).all();db.exec(scope(sql));
 assert.deepEqual(db.prepare(scope('SELECT * FROM appointments ORDER BY id')).all(),before);
 assert.deepEqual(db.prepare(scope('SELECT time FROM slots ORDER BY time')).all().map(x=>x.time),['10:00','10:15','10:30','10:45','11:00','11:15','12:00','12:15','12:30','12:45']);
 assert.throws(()=>db.exec(scope("INSERT INTO slots VALUES('b','2026-12-01','10:15','cut')")),/UNIQUE/);
 assert.equal(db.prepare(scope("SELECT COUNT(*) n FROM slots WHERE time='11:30'")).get().n,0);
 }finally{db.close()}
});
