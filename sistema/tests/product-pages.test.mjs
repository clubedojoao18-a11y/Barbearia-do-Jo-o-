import test from 'node:test';
import assert from 'node:assert/strict';
import {productPage,joanaDocument,platformDocument} from '../worker/product-pages.js';
import worker from '../worker/index.js';
test('public product entries separate brands and describe the actual access limits',async()=>{
 for(const path of ['/links','/joana','/sistema','/joana/app']){const r=await worker.fetch(new Request('https://test.example'+path),{DB:{prepare(){return {bind(){return this},async first(){return null}}}}});assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes(path.startsWith('/joana')?'JOANA AI':'EU SOU'));assert.ok(!html.includes('SISTEMA JOÃO'))}
 const r=productPage(new Request('https://test.example/cursos'),new URL('https://test.example/cursos'));assert.equal(r.status,302);assert.equal(r.headers.get('location'),'https://test.example/eusou/membros#academy');
 const html=await productPage(new Request('https://test.example/joana'),new URL('https://test.example/joana')).text();assert.match(html,/Cadastro público independente ainda não está liberado/);
});
test('entry documents preserve the shared script and existing authorization',()=>{
 const source='<title>Clube do João · Sua barbearia, organizada</title><script src="/app.js" defer></script><b>BARBEARIA<br>DO JOÃO</b>';
 assert.match(joanaDocument(source),/JOANA AI/);assert.match(joanaDocument(source),/src="\/app.js"/);assert.match(platformDocument(source),/EU SOU Gestão/);
});
