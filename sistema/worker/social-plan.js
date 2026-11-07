import {projectIdentity} from './project-identity.js';
import {aiJSON,generateDraft,studioState,studioCredentials,editStudioState,saveCredentials,assetURL,PROJECTS} from './studio.js';
const key='studio_social_plan', now=()=>Math.floor(Date.now()/1000);
const read=async(db,k)=>{const r=await db.prepare('SELECT value FROM config WHERE key=?').bind(k).first();return r?JSON.parse(r.value):null};
const write=(db,k,v)=>db.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,JSON.stringify(v)).run();
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const dateAt=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t*1000));
const at=(date,hour)=>Math.floor(Date.parse(date+'T'+String(hour).padStart(2,'0')+':00:00-03:00')/1000);
export async function socialPlan(db){return await read(db,key)}
export async function configureSocialPlan(env,h,input){
 if(input.consent!==true||!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate||'')||!/^\d{4}-\d{2}-\d{2}$/.test(input.eusouFeedStart||'')||!Number.isInteger(input.dailyLimit)||input.dailyLimit<30||input.dailyLimit>100)throw fail('Confirme a rotina e uma cota diária de 30 a 100 chamadas.');
 const k=await studioCredentials(env,h);if(!k.openai&&!env.OPENAI_API_KEY)throw fail('Conecte a IA antes de ativar.',409);for(const p of PROJECTS)if(!k[p]?.verified)throw fail('Conecte os três perfis antes de ativar.',409);
 const previous=await socialPlan(env.DB), plan={enabled:true,startDate:input.startDate,storyHours:[8,11,14,17,20],feedDays:[1,3,5],feedHour:18,feedFormats:{1:'post',3:'carousel',5:'reel'},eusouFeedStart:input.eusouFeedStart,promotions:input.promotions===true,createdAt:previous?.createdAt||now(),updatedAt:now()};
 await write(env.DB,key,plan);k.dailyLimit=input.dailyLimit;await saveCredentials(env,h,k);
 await editStudioState(env.DB,s=>{for(const p of PROJECTS)s.channels[p]={...s.channels[p],auto:true,generate:false};});return plan;
}
const storySchema={type:'object',additionalProperties:false,properties:{stories:{type:'array',items:{type:'object',additionalProperties:false,properties:{title:{type:'string'},body:{type:'string'}},required:['title','body']}}},required:['stories']};
export async function socialPlanTick(env,h){
 const plan=await socialPlan(env.DB),date=dateAt(now());if(!plan?.enabled||date<plan.startDate||now()<at(date,5)||env.AI_API_DISABLED==='true')return false;
 const settings=await h.conf(env.DB);if(settings.automation?.paused)return false;let planned=false;
 // Archive complete records before moving them out of the operational queue.
 const previous=await studioState(env.DB),old=previous.jobs.filter(j=>['published','expired'].includes(j.status)&&(j.publishedAt||j.expiresAt||now())<=now()-2*86400);for(const j of old)await env.DB.prepare('INSERT OR IGNORE INTO config(key,value) VALUES(?,?)').bind('studio_social_history_'+j.id,JSON.stringify(j)).run();if(old.length){const ids=new Set(old.map(j=>j.id));await editStudioState(env.DB,s=>{s.jobs=s.jobs.filter(j=>!ids.has(j.id))})}
 for(const project of PROJECTS){const state=await studioState(env.DB);if(!state.channels[project]?.auto)continue;const slots=plan.storyHours.filter(hour=>at(date,hour)>=now()-3600);const marker='studio_social_day_'+project;
 if(slots.length&&await read(env.DB,marker)!==date){
  const claim=await env.DB.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE value<>excluded.value').bind(marker,JSON.stringify(date)).run();
  if(Number(claim.meta?.changes??claim.changes)){try{
   const context={project,date,identity:projectIdentity(project),brand:(await studioState(env.DB)).channels[project].brief||'',promotions:plan.promotions&&project==='barbearia'&&!!settings.pricesApproved,pricesApproved:!!settings.pricesApproved,catalog:(await h.serviceCatalog(settings,h.SERVICES)).map(x=>({name:x.name,...(settings.pricesApproved?{price:x.price}:{})}))};
   const result=await aiJSON(env,h,'Crie exatamente 5 stories originais em português para o projeto indicado. Cada título até 55 caracteres e corpo até 170. Varie: dica prática, serviço/educação, reflexão, pergunta para responder no Direct e chamada discreta. Um deles virará um vídeo curto animado; não invente filmagens nem experiências pessoais. Identidade: barbearia é comercial, EU SOU é comunidade/formação, pessoal é João barbeiro e empresário com espiritualidade católica respeitosa. Se promotions for verdadeiro, pode destacar serviços e combos aos preços já cadastrados. Não criar descontos, gratuidade, escassez, promessas de renda/saúde ou datas/valores de eventos sem dados confirmados. Nenhum dado de cliente. Não repetir a mesma chamada em todos os stories.',context,storySchema);
   if(!Array.isArray(result.stories)||result.stories.length!==5||result.stories.some(x=>typeof x.title!=='string'||x.title.length>65||typeof x.body!=='string'||x.body.length>230))throw fail('Story fora dos limites.',502);
   await editStudioState(env.DB,s=>{if(s.jobs.length+slots.length>120)throw fail('Fila cheia; conclua os conteúdos pendentes.',409);for(let index=0;index<5;index++){const hour=plan.storyHours[index];if(!slots.includes(hour))continue;const id='social-story-'+project+'-'+date+'-'+index;if(s.jobs.some(j=>j.id===id))continue;const slide=result.stories[index];s.jobs.push({id,project,topic:'educativo',format:index===2?'story_video':'story',title:slide.title,caption:slide.body,slides:[slide],assets:[],authorized:true,status:'queued',createdAt:now(),dueAt:at(date,hour),expiresAt:at(date,hour)+3*3600,lockUntil:0});}s.channels[project].lastError=''});planned=true;
  }catch(e){await editStudioState(env.DB,s=>{s.channels[project].lastError=e.status?e.message:'Falha ao preparar stories.'});}}
 }
 const weekday=new Date(date+'T12:00:00Z').getUTCDay();if(!plan.feedDays.includes(weekday)||project==='eusou'&&date<plan.eusouFeedStart||now()>at(date,plan.feedHour)+3600)continue;
 const feedMarker='studio_social_feed_'+project;if(await read(env.DB,feedMarker)===date)continue;
 const claim=await env.DB.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE value<>excluded.value').bind(feedMarker,JSON.stringify(date)).run();if(!Number(claim.meta?.changes??claim.changes))continue;
 try{const format=plan.feedFormats[weekday],draft=await generateDraft(env,settings,h,{project,topic:project==='barbearia'?'servicos':'educativo',format:format==='reel'?'carousel':format,brief:(state.channels[project].brief||'Conteúdo original e útil.')+(format==='reel'?' Roteiro visual de cinco telas curtas para um Reel animado de até 20 segundos.':'')});draft.id='social-feed-'+project+'-'+date;draft.format=format;draft.status='queued';draft.authorized=true;draft.dueAt=at(date,plan.feedHour);await editStudioState(env.DB,s=>{if(s.jobs.length>=120)throw fail('Fila cheia.',409);if(!s.jobs.some(j=>j.id===draft.id))s.jobs.push(draft)});planned=true}catch(e){await editStudioState(env.DB,s=>{s.channels[project].lastError=e.status?e.message:'Falha ao preparar feed.'})}
 }
 return planned;
}
export async function prepareSocialRenders(env,origin,base=''){
 if(!env.BUCKET||(await socialPlan(env.DB))?.enabled===false)return [];
 const state=await studioState(env.DB),tasks=[];for(const j of state.jobs){if(tasks.length>=3)break;if(!['reel','story_video'].includes(j.format)||j.assets.some(a=>a.video)||j.assets.length<j.slides.length||!j.authorized||!state.channels[j.project]?.auto||!['building','queued','ready'].includes(j.status))continue;
  const leaseKey='studio_social_render_'+j.id,old=await read(env.DB,leaseKey);if(old?.expiresAt>now())continue;const lease={token:crypto.randomUUID().replaceAll('-',''),expiresAt:now()+3600,jobId:j.id};
  const result=old?await env.DB.prepare('UPDATE config SET value=? WHERE key=? AND value=?').bind(JSON.stringify(lease),leaseKey,JSON.stringify(old)).run():await env.DB.prepare('INSERT OR IGNORE INTO config(key,value) VALUES(?,?)').bind(leaseKey,JSON.stringify(lease)).run();if(!Number(result.meta?.changes??result.changes))continue;
  tasks.push({id:j.id,project:j.project,format:j.format,images:j.assets.map(a=>assetURL(origin,base,a.id,a.token)),uploadURL:origin+base+'/api/studio/social/render/'+encodeURIComponent(j.id)+'?token='+lease.token,expiresAt:lease.expiresAt});
 }
 return tasks;
}
export async function socialRenderRoute(req,env,url){
 const m=url.pathname.match(/^\/api\/studio\/social\/render\/([a-zA-Z0-9_-]{1,120})$/);if(!m)return null;if(req.method!=='POST')throw fail('Método não permitido.',405);
 const leaseKey='studio_social_render_'+m[1],lease=await read(env.DB,leaseKey);if(!lease||lease.token!==url.searchParams.get('token')||lease.expiresAt<now())throw fail('Envio expirado ou inválido.',401);
 const state=await studioState(env.DB),j=state.jobs.find(x=>x.id===m[1]);if(!j?.authorized||!state.channels[j.project]?.auto||(await read(env.DB,'automation'))?.paused)throw fail('Conteúdo pausado.',409);if(j.assets.some(x=>x.video))return Response.json({ok:true,replayed:true});
 const length=Number(req.headers.get('content-length'));if(req.headers.get('content-type')!=='video/mp4'||!Number.isSafeInteger(length)||length<32||length>20*1024*1024)throw fail('Use MP4 de até 20 MB.',413);
 const bytes=new Uint8Array(length),reader=req.body.getReader();let offset=0;for(;;){const {done,value}=await reader.read();if(done)break;if(offset+value.length>length){await reader.cancel();throw fail('Vídeo acima do limite.',413)}bytes.set(value,offset);offset+=value.length}if(offset!==length||new TextDecoder().decode(bytes.slice(4,8))!=='ftyp')throw fail('Vídeo MP4 inválido.');
 const id=crypto.randomUUID(),token=crypto.randomUUID().replaceAll('-',''),object='social/'+(env.WORKSPACE?.id||'root')+'/'+j.id+'.mp4';await env.BUCKET.put(object,bytes,{httpMetadata:{contentType:'video/mp4'}});await write(env.DB,'studio_asset_'+id,{object,token,video:true,createdAt:now()});
 await editStudioState(env.DB,s=>{const x=s.jobs.find(x=>x.id===j.id);if(!x||!x.authorized||!s.channels[x.project]?.auto)throw fail('Conteúdo pausado.',409);if(!x.assets.some(a=>a.video)){x.assets=[{id,token,video:true}];x.slides=[{title:x.title,body:x.caption.slice(0,230)}];x.status='ready';x.lockUntil=0}});return Response.json({ok:true});
}
