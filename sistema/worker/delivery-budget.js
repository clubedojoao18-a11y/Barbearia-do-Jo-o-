// Reserve attempts atomically before calling Meta, across every concurrent runner.
// Reservations are intentionally retained after failures or ambiguous responses.
export async function reserveDeliveryAttempt(db,day,limit){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isSafeInteger(limit)||limit<1||limit>500)throw new Error('Invalid delivery budget');
 const start=Math.floor(Date.parse(day+'T00:00:00-03:00')/1000),end=start+86400;
 // Include sends from the version before counters existed, and interrupted attempts already classified as uncertain.
 const prior=await db.prepare("SELECT COUNT(*) n FROM wa_outbox WHERE (sent_at>=? AND sent_at<?) OR (status='uncertain' AND created_at>=? AND created_at<?)").bind(start,end,start,end).first();
 const baseline=Number(prior?.n||0);
 if(baseline>=limit)return false;
 const result=await db.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=CAST(MAX(CAST(config.value AS INTEGER),?)+1 AS TEXT) WHERE MAX(CAST(config.value AS INTEGER),?)<?').bind('delivery_quota_'+day,String(baseline+1),baseline,baseline,limit).run();
 return Number(result.meta?.changes??result.changes??0)>0;
}
