import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateTask,renderSocialTask} from '../scripts/social-runner.mjs';
import {command} from '../scripts/video-runner.mjs';
const origin='https://test.example',task={id:'render-1',format:'story_video',project:'barbearia',expiresAt:Date.now()/1000+3600,images:[origin+'/api/studio/media/asset?key=temporary'],uploadURL:origin+'/api/studio/social/render/render-1?token=temporary'};
test('social renderer refuses expired capabilities, other destinations and unrelated file routes',()=>{
 assert.throws(()=>validateTask({...task,expiresAt:1},origin));assert.throws(()=>validateTask({...task,images:['https://another.example/private']},origin));assert.throws(()=>validateTask({...task,uploadURL:origin+'/api/manage'},origin));assert.throws(()=>validateTask({...task,images:[origin+'/private']},origin));assert.equal(validateTask(task,origin).id,task.id);
});
test('renderer creates a real vertical H264 MP4 and uploads only to its scoped completion endpoint',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'social-test-')),realFetch=globalThis.fetch;try{
 const path=join(dir,'source.jpg');await command('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=0x493326:s=720x1280','-frames:v','1','-threads','1',path]);const jpeg=await readFile(path);let uploaded=0;
 globalThis.fetch=async(url,opts)=>{if(url===task.images[0])return new Response(jpeg,{headers:{'Content-Type':'image/jpeg'}});assert.equal(url,task.uploadURL);assert.equal(opts.redirect,'error');assert.equal(opts.headers['Content-Type'],'video/mp4');assert.equal(Buffer.from(opts.body).subarray(4,8).toString(),'ftyp');uploaded++;return Response.json({ok:true})};
 assert.equal((await renderSocialTask(task,origin)).ok,true);assert.equal(uploaded,1);
 }finally{globalThis.fetch=realFetch;await rm(dir,{recursive:true,force:true})}
});
