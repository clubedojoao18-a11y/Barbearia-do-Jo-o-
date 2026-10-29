import {appendStudioJob,studioState,PROJECTS,TOPICS} from './studio.js';
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const text=(x,max)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
const slideSchema={type:'object',properties:{title:{type:'string',maxLength:80},body:{type:'string',maxLength:350}},required:['title','body'],additionalProperties:false};
export const WORK_DRAFT_TOOL={name:'save_work_content_drafts',description:'Salvar no Studio rascunhos de texto já escritos pelo ChatGPT Work, sem chamar a API OpenAI, gerar imagens, enviar mensagens ou publicar. Somente proprietário. Use batchKey único por data/rotina; repetir a mesma chave e projeto não duplica.',inputSchema:{type:'object',properties:{batchKey:{type:'string',minLength:3,maxLength:100},drafts:{type:'array',minItems:1,maxItems:2,items:{type:'object',properties:{project:{type:'string',enum:['barbearia','eusou']},topic:{type:'string'},format:{type:'string',enum:['post','carousel']},title:{type:'string',maxLength:100},caption:{type:'string',maxLength:2200},slides:{type:'array',minItems:1,maxItems:5,items:slideSchema}},required:['project','topic','format','title','caption','slides'],additionalProperties:false}}},required:['batchKey','drafts'],additionalProperties:false}};
export async function saveWorkDrafts(env,args){
 if(!args||Object.keys(args).some(k=>!['batchKey','drafts'].includes(k))||!text(args.batchKey,100)||!/^[a-zA-Z0-9_-]{3,100}$/.test(args.batchKey)||!Array.isArray(args.drafts)||args.drafts.length<1||args.drafts.length>2)throw fail('Informe chave da rotina e até dois rascunhos.');
 if(new Set(args.drafts.map(d=>d?.project)).size!==args.drafts.length)throw fail('Use no máximo um rascunho por projeto em cada lote.');
 for(const d of args.drafts){if(!d||Object.keys(d).some(k=>!['project','topic','format','title','caption','slides'].includes(k))||!PROJECTS.includes(d.project)||!TOPICS[d.project].includes(d.topic)||!['post','carousel'].includes(d.format)||!text(d.title,100)||!text(d.caption,2200)||!Array.isArray(d.slides)||d.slides.length!==(d.format==='post'?1:5)||d.slides.some(s=>!s||Object.keys(s).some(k=>!['title','body'].includes(k))||!text(s.title,80)||!text(s.body,350)))throw fail('Revise projeto, formato e textos dos slides.');}
 const results=[];
 for(const d of args.drafts){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('work:'+args.batchKey+':'+d.project)),id='work-'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 const saved=await appendStudioJob(env.DB,{...d,id,source:'chatgpt_work',batchKey:args.batchKey,assets:[],status:'draft',authorized:false,createdAt:Math.floor(Date.now()/1000),dueAt:0,lockUntil:0});results.push({id,project:d.project,replayed:!!saved.replayed,status:'draft'});
 }
 return {ok:true,drafts:results,apiCalls:0,published:false};
}
