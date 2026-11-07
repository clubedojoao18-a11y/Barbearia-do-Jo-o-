import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

test('EU SOU has a direct, standalone and accessible landing page',async()=>{
 const response=await worker.fetch(new Request('https://test.example/eusou'),{});
 const html=await response.text();
 assert.equal(response.status,200);
 assert.match(response.headers.get('content-type'),/text\/html/);
 assert.match(html,/EU SOU — Identidade &amp; Propósito/);
 assert.match(html,/href="\/eusou\/membros#eusou"/);
 assert.match(html,/Nenhuma cobrança é criada nesta página/);
 assert.doesNotMatch(html,/BARBEARIA DO JOÃO|Clube do João|navalha|tesoura/i);
 assert.match(response.headers.get('content-security-policy'),/default-src 'none'/);
});

test('EU SOU landing accepts HEAD and rejects mutations',async()=>{
 const head=await worker.fetch(new Request('https://test.example/eusou',{method:'HEAD'}),{});
 assert.equal(head.status,200);
 assert.equal(await head.text(),'');
 const post=await worker.fetch(new Request('https://test.example/eusou',{method:'POST'}),{});
 assert.equal(post.status,405);
 assert.equal(post.headers.get('allow'),'GET, HEAD');
});
