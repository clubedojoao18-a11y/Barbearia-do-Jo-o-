import {mkdtemp,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {command} from './video-runner.mjs';
export function validateTask(task,origin){
 const host=new URL(origin);if(host.protocol!=='https:'||host.username||host.password||host.search||host.hash)throw new Error('Origem HTTPS inválida.');
 if(!task||!['reel','story_video'].includes(task.format)||!Array.isArray(task.images)||task.images.length<1||task.images.length>5||!Number.isFinite(task.expiresAt)||task.expiresAt<Date.now()/1000)throw new Error('Renderização inválida ou expirada.');
 for(const path of [...task.images,task.uploadURL]){const u=new URL(path);if(u.origin!==host.origin||u.username||u.password)throw new Error('Mídia fora do site autorizado.');}
 if(!new URL(task.uploadURL).pathname.startsWith(host.pathname.replace(/\/$/,'')+'/api/studio/social/render/'))throw new Error('Destino de vídeo inválido.');
 for(const path of task.images)if(!new URL(path).pathname.startsWith(host.pathname.replace(/\/$/,'')+'/api/studio/media/'))throw new Error('Origem de imagem inválida.');return task;
}
export async function renderSocialTask(task,origin){
 validateTask(task,origin);const dir=await mkdtemp(join(tmpdir(),'joao-social-'));try{
  const parts=[];for(let i=0;i<task.images.length;i++){const r=await fetch(task.images[i],{redirect:'error',signal:AbortSignal.timeout(30000)});if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))throw new Error('Imagem indisponível.');const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>2*1024*1024)throw new Error('Imagem acima do limite.');const input=join(dir,'frame-'+i+'.jpg'),output=join(dir,'part-'+i+'.mp4');await writeFile(input,bytes,{mode:0o600});const seconds=task.format==='story_video'?6:4,frames=seconds*25;
   await command('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-vf',"scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=0x1b1512,zoompan=z='min(zoom+0.00035,1.04)':d="+frames+":s=720x1280:fps=25,format=yuv420p",'-t',String(seconds),'-c:v','libx264','-threads','2','-preset','veryfast','-crf','25','-an',output],120000);parts.push(output);
  }
  const list=join(dir,'parts.txt'),output=join(dir,'final.mp4');await writeFile(list,parts.map(x=>"file '"+x+"'").join('\n'));await command('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',output]);if((await stat(output)).size>20*1024*1024)throw new Error('Vídeo acima do limite.');
  const result=await fetch(task.uploadURL,{method:'POST',redirect:'error',headers:{'Content-Type':'video/mp4'},body:await readFile(output),signal:AbortSignal.timeout(60000)});if(!result.ok)throw new Error('Servidor não aceitou o vídeo ('+result.status+').');const data=await result.json();if(!data.ok)throw new Error('Vídeo sem confirmação.');return {id:task.id,project:task.project,ok:true};
 }finally{await rm(dir,{recursive:true,force:true})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>100000)throw new Error('Manifesto acima do limite.');}const data=JSON.parse(input),results=[];for(const task of (data.renderJobs||[]).slice(0,3)){try{results.push(await renderSocialTask(task,data.origin))}catch(e){results.push({id:task.id,ok:false,error:e.message})}}console.log(JSON.stringify({results}));
}
