import test from 'node:test';
import assert from 'node:assert/strict';
import {safeWebhookRouting} from '../worker/integration-checks.js';

test('diagnóstico identifica o destino prioritário sem expor credenciais em URLs',()=>{
 const r=safeWebhookRouting({phone_number:'https://user:password@phone.example/webhook?token=secret#private',whatsapp_business_account:'https://account.example/hook',application:'https://app.example/hook',verify_token:'secret'});
 assert.equal(r.effective,'https://phone.example/webhook');
 assert.equal(r.hasPhoneOverride,true);
 assert.equal(r.hasAccountOverride,true);
 assert.ok(!/password|secret|private|user/.test(JSON.stringify(r)));
 assert.equal(safeWebhookRouting({application:'https://app.example/hook'}).effective,'https://app.example/hook');
});
