import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

export function command(file,args,timeout=180000){return new Promise((resolve,reject)=>{const child=spawn(file,args,{stdio:['ignore','pipe','pipe']}),out=[],errors=[];let bytes=0;const timer=setTimeout(()=>child.kill('SIGKILL'),timeout);child.stdout.on('data',x=>{bytes+=x.length;if(bytes>1024*1024)child.kill('SIGKILL');else out.push(x)});child.stderr.on('data',x=>{if(errors.reduce((n,y)=>n+y.length,0)<20000)errors.push(x)});child.on('error',e=>{clearTimeout(timer);reject(e)});child.on('exit',code=>{clearTimeout(timer);code===0?resolve(Buffer.concat(out).toString()):reject(new Error(file+' falhou ('+code+'). Verifique formato e recursos do executor.'))})})}
const time=s=>{const ms=Math.max(0,Math.round(s*1000));return String(Math.floor(ms/3600000)).padStart(2,'0')+':'+String(Math.floor(ms/60000)%60).padStart(2,'0')+':'+String(Math.floor(ms/1000)%60).padStart(2,'0')+','+String(ms%1000).padStart(3,'0')};
export function subtitles(segments,start,end){let n=0;return segments.filter(s=>s.end>start&&s.start<end&&typeof s.text==='string').map(s=>++n+'\n'+time(Math.max(0,s.start-start))+' --> '+time(Math.min(end-start,s.end-start))+'\n'+s.text.replace(/<[^>]*>|\{[^}]*\}/g,'').replace(/[\r\n]+/g,' ').trim()+'\n').join('\n')}
export async function renderClip(source,output,cut,segments,dir){
 if(!Number.isFinite(cut.start)||!Number.isFinite(cut.end)||cut.start<0||cut.end-cut.start<3||cut.end-cut.start>90)throw new Error('Intervalo de corte inválido.');
 const srt=join(dir,'captions.srt');await writeFile(srt,subtitles(segments,cut.start,cut.end),{mode:0o600});
 const filter="scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1,subtitles="+srt.replace(/\\/g,'/').replace(/[:'\[\],;]/g,'\\$&')+":force_style='FontName=DejaVu Sans,FontSize=18,Outline=2,MarginV=45'";
 await command('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(cut.start),'-i',source,'-t',String(cut.end-cut.start),'-vf',filter,'-c:v','libx264','-preset','veryfast','-crf','27','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','96k','-movflags','+faststart',output],240000);
 if((await stat(output)).size>20*1024*1024)throw new Error('Corte excedeu 20 MB.');
}
export async function runVideoJob(base,token){
 const root=new URL(base);if(root.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(root.hostname))throw new Error('Executor exige HTTPS.');if(!root.pathname.endsWith('/api/studio/video/runner')||root.search||root.hash||root.username||root.password)throw new Error('Endereço do executor inválido.');
 let lease='',job;
 async function api(path='',data,rawType){const opts={method:data===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'X-Video-Lease':lease},redirect:'error',signal:AbortSignal.timeout(120000)};if(data!==undefined){opts.body=rawType?data:JSON.stringify(data);opts.headers['Content-Type']=rawType||'application/json'}const r=await fetch(root.href+path,opts);if(!r.ok)throw new Error('Servidor recusou etapa ('+r.status+'). Veja o painel do vídeo.');return r}
 job=await (await api('',{})).json();if(job.idle||job.paused)return job;lease=job.lease;const dir=await mkdtemp(join(tmpdir(),'joao-video-'));
 try{
  const source=join(dir,'source.mp4'),r=await api('/'+job.id+'/source'),bytes=await r.arrayBuffer();if(bytes.byteLength>64*1024*1024)throw new Error('Original acima do limite.');await writeFile(source,Buffer.from(bytes),{mode:0o600});
  const probe=JSON.parse(await command('ffprobe',['-v','error','-show_format','-show_streams','-of','json',source]));const duration=Number(probe.format.duration);if(!Number.isFinite(duration)||duration<3||duration>1200||!probe.streams.some(s=>s.codec_type==='audio'))throw new Error('Use MP4 com áudio, de 3 segundos a 20 minutos.');
  const audio=join(dir,'audio.mp3');await command('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',source,'-vn','-ar','16000','-ac','1','-b:a','32k',audio]);const transcript=await(await api('/'+job.id+'/transcribe',await readFile(audio),'audio/mpeg')).json();
  // Bound the serialized request including UTF-8 accents and timestamps.
  let lines='';for(const s of transcript.segments){const next=lines+JSON.stringify({start:s.start,end:s.end,text:s.text})+'\n';if(Buffer.byteLength(JSON.stringify({duration,transcript:next}))>19000)break;lines=next}
  const plan=await(await api('/'+job.id+'/plan',{duration,transcript:lines})).json();
  for(let i=0;i<plan.clips.length;i++){const output=join(dir,'clip-'+i+'.mp4');await renderClip(source,output,plan.clips[i],transcript.segments,dir);await api('/'+job.id+'/clip?index='+i,await readFile(output),'video/mp4')}
  const result=await(await api('/'+job.id+'/finish',{})).json();return {ok:true,clips:result.clips};
 }catch(e){try{await api('/'+job.id+'/fail',{})}catch{}throw e}finally{await rm(dir,{recursive:true,force:true})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(!process.env.JOAO_VIDEO_URL||!process.env.JOAO_VIDEO_TOKEN){console.log('Executor aguardando os segredos JOAO_VIDEO_URL e JOAO_VIDEO_TOKEN.');process.exit(0)}try{console.log(JSON.stringify(await runVideoJob(process.env.JOAO_VIDEO_URL,process.env.JOAO_VIDEO_TOKEN)))}catch{console.error('Falha no processamento. Consulte o vídeo no Studio e a configuração do executor.');process.exitCode=1}}
