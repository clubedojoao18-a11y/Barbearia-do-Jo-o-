import test from 'node:test';
import assert from 'node:assert/strict';
import {repairWhatsApp} from '../worker/whatsapp-repair.js';

const env={WHATSAPP_PHONE_NUMBER_ID:'12345678',WHATSAPP_BUSINESS_ACCOUNT_ID:'23456789',
  WHATSAPP_VERIFY_TOKEN:'unchanged-verification-token',WHATSAPP_APP_SECRET:'test-app-secret-1234567890'};
const input={appId:'34567890',token:'test-access-token-1234567890',consent:true};
function mock(overrides={}) {
  const calls=[];let linked=false;
  const graph=async(e,path,data)=>{
    calls.push({e,path,data});
    if(path.startsWith('debug_token?'))return {data:{is_valid:true,app_id:input.appId,
      scopes:['whatsapp_business_management','whatsapp_business_messaging'],...overrides.debug}};
    if(path.includes('/phone_numbers'))return {data:[{id:overrides.phoneId||env.WHATSAPP_PHONE_NUMBER_ID}]};
    if(path.includes('?fields=id,display_phone_number'))return {id:env.WHATSAPP_PHONE_NUMBER_ID,display_phone_number:'+55 test'};
    if(data){linked=true;return {success:true}}
    return {data:[{whatsapp_business_api_data:{id:'45678901',name:'Existing app'}},
      ...(linked&&!overrides.missingSubscription?[{whatsapp_business_api_data:{id:input.appId}}]:[])]};
  };
  return {calls,graph};
}
test('repair verifies identity and account before subscribing, preserves signing and verification credentials',async()=>{
  const {calls,graph}=mock();const result=await repairWhatsApp(env,input,graph);
  assert.equal(result.credentials.WHATSAPP_VERIFY_TOKEN,env.WHATSAPP_VERIFY_TOKEN);
  assert.equal(result.credentials.WHATSAPP_APP_SECRET,env.WHATSAPP_APP_SECRET);
  assert.equal(result.credentials.WHATSAPP_PHONE_NUMBER_ID,env.WHATSAPP_PHONE_NUMBER_ID);
  assert.equal(result.status.subscriptionVerified,true);
  assert.equal(calls.filter(c=>c.data).length,1);
  assert.equal(calls.find(c=>c.data).path,env.WHATSAPP_BUSINESS_ACCOUNT_ID+'/subscribed_apps');
  assert.ok(calls.findIndex(c=>c.path.includes('/phone_numbers')) < calls.findIndex(c=>c.data));
  assert.equal(JSON.stringify(result.status).includes(input.token),false);
});
test('wrong app, missing permission, expired token, missing consent and different account fail before any write',async()=>{
  for(const config of [{debug:{app_id:'99999999'}},{debug:{scopes:[]}},
    {debug:{expires_at:1}},{phoneId:'99999999'}]){
    const {calls,graph}=mock(config);await assert.rejects(repairWhatsApp(env,input,graph));
    assert.equal(calls.some(c=>c.data),false);
  }
  const {calls,graph}=mock();await assert.rejects(repairWhatsApp(env,{...input,consent:false},graph));
  assert.equal(calls.length,0);
});
test('repair does not report success when Meta does not list the application after subscription',async()=>{
  const {graph}=mock({missingSubscription:true});await assert.rejects(repairWhatsApp(env,input,graph),/ainda não consta/);
});
test('an existing subscription is verified without another POST',async()=>{
  const {calls,graph}=mock();const wrapped=async(e,path,data)=>path.endsWith('/subscribed_apps')&&!data?
    {data:[{whatsapp_business_api_data:{id:input.appId}}]}:graph(e,path,data);
  await repairWhatsApp(env,input,wrapped);assert.equal(calls.some(c=>c.data),false);
});
