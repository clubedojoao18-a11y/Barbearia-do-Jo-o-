import test from 'node:test';
import assert from 'node:assert/strict';
import {professionalWindow,withinProfessionalWindow,normalizeProfessionalHours,JOAO_WEEKLY_PERIODS} from '../worker/agenda-rules.js';

test('individual periods are clamped to shop hours and never include the break',()=>{
 const c={hours:{open:'10:00',close:'18:00'},professionalHours:{barber:{days:[3],periods:[{open:'09:00',close:'12:00'},{open:'14:00',close:'20:00'}]}}};
 const w=professionalWindow(c,'barber','2026-10-28');
 assert.deepEqual(w.periods,[{open:'10:00',close:'12:00'},{open:'14:00',close:'18:00'}]);
 assert.equal(withinProfessionalWindow(w,11*60,60),true);
 assert.equal(withinProfessionalWindow(w,11*60+30,60),false);
 assert.equal(withinProfessionalWindow(w,12*60,30),false);
 assert.equal(withinProfessionalWindow(w,14*60,90),true);
 assert.equal(withinProfessionalWindow(w,17*60+30,60),false);
 assert.equal(professionalWindow(c,'barber','2026-10-29'),null);
 assert.equal(withinProfessionalWindow(null,600,30),false);
});

test('legacy single period configurations and global fallback remain supported',()=>{
 const c={hours:{open:'09:00',close:'20:00'},professionalHours:{barber:{days:[3],open:'10:00',close:'16:00'}}};
 assert.equal(withinProfessionalWindow(professionalWindow(c,'barber','2026-10-28'),600,90),true);
 assert.equal(withinProfessionalWindow(professionalWindow(c,'other','2026-10-28'),540,90),true);
 assert.equal(withinProfessionalWindow({open:'10:00',close:'11:00'},600,60),true);
});

test('weekly schedule honors each weekday and the Thursday to Saturday break',()=>{
 const rule=normalizeProfessionalHours({weeklyPeriods:JOAO_WEEKLY_PERIODS});
 const c={hours:{open:'09:00',close:'20:00'},professionalHours:{joao:rule}};
 for(const date of ['2026-10-26','2026-10-27','2026-10-28']){
  const w=professionalWindow(c,'joao',date);assert.equal(withinProfessionalWindow(w,10*60,45),false);assert.equal(withinProfessionalWindow(w,14*60,90),true);
 }
 for(const date of ['2026-10-29','2026-10-30','2026-10-31']){
  const w=professionalWindow(c,'joao',date);assert.equal(withinProfessionalWindow(w,10*60,90),true);assert.equal(withinProfessionalWindow(w,13*60+30,45),false);assert.equal(withinProfessionalWindow(w,14*60,45),false);assert.equal(withinProfessionalWindow(w,16*60,90),true);
 }
 const sunday=professionalWindow(c,'joao','2026-11-01');assert.equal(withinProfessionalWindow(sunday,13*60+15,45),true);assert.equal(withinProfessionalWindow(sunday,14*60,45),false);
 assert.equal(withinProfessionalWindow(professionalWindow(c,'other','2026-10-26'),10*60,45),true);
});

test('weekly schedule validates all days, quarter hours and overlaps; closed days stay closed',()=>{
 const weekly=structuredClone(JOAO_WEEKLY_PERIODS);weekly[4]=[];
 const c={hours:{open:'11:00',close:'18:00'},professionalHours:{joao:normalizeProfessionalHours({weeklyPeriods:weekly})}};
 assert.equal(professionalWindow(c,'joao','2026-10-29'),null);
 assert.deepEqual(professionalWindow(c,'joao','2026-10-30').periods,[{open:'11:00',close:'14:00'},{open:'16:00',close:'18:00'}]);
 for(const invalid of [null,[],{}, {...weekly,7:[]},{...weekly,0:[{open:'10:05',close:'14:00'}]},{...weekly,0:[{open:'10:00',close:'14:00'},{open:'13:00',close:'15:00'}]},{...weekly,0:[{open:'10:00',close:''}]}])assert.throws(()=>normalizeProfessionalHours({weeklyPeriods:invalid}));
 const closed=Object.fromEntries(Array.from({length:7},(_,i)=>[i,[]]));assert.equal(professionalWindow({professionalHours:{joao:normalizeProfessionalHours({weeklyPeriods:closed})}},'joao','2026-10-30'),null);
});
