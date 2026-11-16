import {projectIdentity} from './project-identity.js';
import {aiJSON,generateDraft,studioState,studioCredentials,editStudioState,saveCredentials,assetURL,PROJECTS} from './studio.js';
const key='studio_social_plan', now=()=>Math.floor(Date.now()/1000);
// Hourly automations can occasionally resume late. Keep stories recoverable long
// enough for a delayed run without carrying them into the following morning.
const STORY_EXPIRY_SECONDS=6*3600;
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
   const result=await aiJSON(env,h,'Crie exatamente 5 stories originais em português para o projeto indicado. Cada título até 55 caracteres e corpo até 170. Varie: dica prática, serviço/educação, reflexão, pergunta para responder no Direct e chamada discreta. Estes stories são artes estáticas. Não invente filmagens nem experiências pessoais. Identidade: barbearia é comercial, EU SOU é comunidade/formação, pessoal é João barbeiro e empresário com espiritualidade católica respeitosa. Se promotions for verdadeiro, pode destacar serviços e combos aos preços já cadastrados. Não criar descontos, gratuidade, escassez, promessas de renda/saúde ou datas/valores de eventos sem dados confirmados. Nenhum dado de cliente. Não repetir a mesma chamada em todos os stories.',context,storySchema);
   if(!Array.isArray(result.stories)||result.stories.length!==5||result.stories.some(x=>typeof x.title!=='string'||x.title.length>65||typeof x.body!=='string'||x.body.length>230))throw fail('Story fora dos limites.',502);
   await editStudioState(env.DB,s=>{if(s.jobs.length+slots.length>120)throw fail('Fila cheia; conclua os conteúdos pendentes.',409);for(let index=0;index<5;index++){const hour=plan.storyHours[index];if(!slots.includes(hour))continue;const id='social-story-'+project+'-'+date+'-'+index;if(s.jobs.some(j=>j.id===id))continue;const slide=result.stories[index];s.jobs.push({id,project,topic:'educativo',format:'story',title:slide.title,caption:slide.body,slides:[slide],assets:[],authorized:true,status:'queued',createdAt:now(),dueAt:at(date,hour),expiresAt:at(date,hour)+STORY_EXPIRY_SECONDS,lockUntil:0});}s.channels[project].lastError=''});planned=true;
  }catch(e){await editStudioState(env.DB,s=>{s.channels[project].lastError=e.status?e.message:'Falha ao preparar stories.'});}}
 }
 const weekday=new Date(date+'T12:00:00Z').getUTCDay();if(!plan.feedDays.includes(weekday)||project==='eusou'&&date<plan.eusouFeedStart||now()>at(date,plan.feedHour)+3600)continue;
 const feedMarker='studio_social_feed_'+project;if(await read(env.DB,feedMarker)===date)continue;
 const claim=await env.DB.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE value<>excluded.value').bind(feedMarker,JSON.stringify(date)).run();if(!Number(claim.meta?.changes??claim.changes))continue;
 try{const format=plan.feedFormats[weekday];if(format==='reel'){await editStudioState(env.DB,s=>{const id='social-feed-'+project+'-'+date;if(s.jobs.some(j=>j.id===id))return;if(s.jobs.length>=120)throw fail('Fila cheia.',409);s.jobs.push({id,project,topic:'educativo',format:'reel',title:'Reel: vídeo real pendente',caption:'Envie uma gravação autorizada em Vídeos para preparar os cortes.',slides:[],assets:[],status:'needs_video',authorized:false,createdAt:now(),dueAt:at(date,plan.feedHour),lockUntil:0,error:'Aguardando vídeo real. Imagens animadas não serão publicadas como Reels.'});s.channels[project].lastError='Reel aguarda uma gravação autorizada em Vídeos.'});planned=true;continue}const draft=await generateDraft(env,settings,h,{project,topic:project==='barbearia'?'servicos':'educativo',format,brief:state.channels[project].brief||'Conteúdo original e útil.'});draft.id='social-feed-'+project+'-'+date;draft.format=format;draft.status='queued';draft.authorized=true;draft.dueAt=at(date,plan.feedHour);await editStudioState(env.DB,s=>{if(s.jobs.length>=120)throw fail('Fila cheia.',409);if(!s.jobs.some(j=>j.id===draft.id))s.jobs.push(draft)});planned=true}catch(e){await editStudioState(env.DB,s=>{s.channels[project].lastError=e.status?e.message:'Falha ao preparar feed.'})}
 }
 return planned;
}
// Picture animation is deliberately retired. Existing renderer capabilities cannot publish it.
export async function prepareSocialRenders(){return []}
export async function socialRenderRoute(req,env,url){
 if(!/^\/api\/studio\/social\/render\/[a-zA-Z0-9_-]{1,120}$/.test(url.pathname))return null;
 throw fail('Animação de imagens desativada. Envie um vídeo real autorizado na área Vídeos.',409);
}
