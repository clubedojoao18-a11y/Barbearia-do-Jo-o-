import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarGaps,calendarRange,calendarSlots,CALENDAR_UI} from '../worker/calendar-ui.js';

test('calendar ranges use Monday weeks and complete month grids across year and leap boundaries',()=>{
 assert.deepEqual(calendarRange('2026-11-14','day'),{start:'2026-11-14',end:'2026-11-14'});
 assert.deepEqual(calendarRange('2026-11-15','week'),{start:'2026-11-09',end:'2026-11-15'});
 assert.deepEqual(calendarRange('2027-01-01','month'),{start:'2026-12-28',end:'2027-02-07'});
 const leap=calendarRange('2028-02-29','month');assert.ok(leap.start<'2028-02-01'&&leap.end>'2028-02-29');
});
test('vacancies exclude breaks, blocks, encaixes and the full service duration',()=>{
 const periods=[{open:'10:00',close:'14:00'},{open:'16:00',close:'20:00'}];
 const a=(time,duration,status='scheduled')=>({time,duration,status});
 assert.deepEqual(calendarGaps(periods,[a('10:30',90),a('11:00',90),a('13:00',90),a('16:00',45,'canceled'),a('18:00',120)]),[{start:600,end:630},{start:750,end:780},{start:960,end:1080}]);
 assert.deepEqual(calendarGaps(periods,[a('00:00',1440)]),[]);
 assert.deepEqual(calendarGaps([],[]),[]);
 new Function(CALENDAR_UI);
});

test('vacancies split into 45-minute cells at work-period boundaries and retain partial gaps honestly',()=>{
 const periods=[{open:'10:00',close:'14:00'},{open:'16:00',close:'18:00'}];
 const free=calendarSlots(periods,[]);
 assert.deepEqual(free.filter(x=>x.bookable).map(x=>x.start),[600,645,690,735,780,960,1005]);
 assert.ok(free.every(x=>x.end-x.start<=45));
 assert.deepEqual(free.filter(x=>!x.bookable),[{start:825,end:840,bookable:false},{start:1050,end:1080,bookable:false}]);
 const records=[{time:'10:15',duration:90,status:'scheduled'},{time:'16:45',duration:45,status:'scheduled'}];
 const slots=calendarSlots(periods,records,630);
 assert.ok(slots.every(x=>x.start>=630));
 assert.ok(slots.filter(x=>x.bookable).every(x=>!records.some(a=>{const n=Number(a.time.slice(0,2))*60+Number(a.time.slice(3));return x.start<n+a.duration&&x.end>n})));
 assert.equal(slots.find(x=>x.start===705).bookable,false);
 assert.deepEqual(calendarSlots([],[]),[]);
});
