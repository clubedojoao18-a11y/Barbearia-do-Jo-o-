import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

test('Meta privacy and deletion pages work without a session, database or provider call',async()=>{
 const env={DB:new Proxy({},{get(){throw new Error('Public notice must not read customer data')}})};
 for(const path of ['/privacidade','/exclusao-de-dados']){
  const response=await worker.fetch(new Request('https://example.test'+path),env);
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/text\/html/);
  const html=await response.text();
  assert.match(html,/clubedojoao18@gmail.com/);
  assert.doesNotMatch(html,/<script|<form|api\/me/);
  assert.match(response.headers.get('content-security-policy'),/default-src 'none'/);
  assert.equal((await worker.fetch(new Request('https://example.test'+path,{method:'POST'}),env)).status,405);
 }
 const head=await worker.fetch(new Request('https://example.test/privacidade',{method:'HEAD'}),env);
 assert.equal(head.status,200);assert.equal(await head.text(),'');
});

test('root operator notice is not presented as another barbershop policy',async()=>{
 const response=await worker.fetch(new Request('https://example.test/privacidade'),{WORKSPACE:{name:'Outra empresa'}});
 assert.equal(response.status,404);
 assert.doesNotMatch(await response.text(),/clubedojoao18@gmail.com/);
});
