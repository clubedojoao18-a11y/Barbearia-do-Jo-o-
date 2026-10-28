import test from 'node:test';
import assert from 'node:assert/strict';
import {professionalWindow,withinProfessionalWindow} from '../worker/agenda-rules.js';

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
