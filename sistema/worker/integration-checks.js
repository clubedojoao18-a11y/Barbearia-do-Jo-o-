// Read-only provider checks. Never send messages, create payments or expose credentials.
export async function verifyIntegrations(env,c,h){
 const report={checkedAt:h.now(),scope:env.WORKSPACE?'company':'root',ai:null,stripe:null,whatsapp:null};
 const check=async fn=>{try{return await fn()}catch(e){return {verified:false,error:e.status?e.message:'Provedor indisponível. Tente novamente mais tarde.'}}};
 report.ai=await check(()=>h.verifyAIConnection(env));
 report.stripe=await check(async()=>{
  if(!env.STRIPE_SECRET_KEY)return {configured:false,verified:false};
  const account=await h.stripe(env,'account',null,'GET');
  if(env.STRIPE_ACCOUNT_ID&&account.id!==env.STRIPE_ACCOUNT_ID) return {configured:true,verified:false,error:'A conta não corresponde à conta configurada.'};
  const methods=env.STRIPE_CARD_CONFIGURATION?await h.stripe(env,'payment_method_configurations/'+encodeURIComponent(env.STRIPE_CARD_CONFIGURATION),null,'GET'):null;
  const extraMethods=methods?Object.entries(methods).filter(([k,v])=>v&&typeof v==='object'&&v.display_preference?.value==='on'&&!['card','apple_pay','google_pay'].includes(k)).map(([k])=>k):[];
  const cardOnly=!!(methods?.active&&methods.card?.available&&methods.card?.display_preference?.value==='on'&&!extraMethods.length);
  return {configured:true,verified:!!account.charges_enabled&&cardOnly,chargesEnabled:!!account.charges_enabled,payoutsEnabled:!!account.payouts_enabled,cardOnly,extraMethods,live:env.STRIPE_SECRET_KEY.includes('_live_'),livePaymentVerified:false,note:'Acesso e configuração verificados. Uma compra, renovação, recuperação e repasse ainda precisam de evidência própria.'};
 });
 report.whatsapp=await check(async()=>{
  const w=await h.whatsappEnv(env);
  if(!h.waReady(w))return {configured:false,verified:false};
  const phone=await h.waGraph(w,encodeURIComponent(w.WHATSAPP_PHONE_NUMBER_ID)+'?fields=id,verified_name');
  const result={configured:true,verified:String(phone.id)===w.WHATSAPP_PHONE_NUMBER_ID,templatesVerified:false,templates:[],note:'Validar o número não comprova webhook nem entrega. Faça um teste de ida e volta com consentimento.'};
  if(w.WHATSAPP_BUSINESS_ACCOUNT_ID){
   const data=await h.waGraph(w,encodeURIComponent(w.WHATSAPP_BUSINESS_ACCOUNT_ID)+'/message_templates?fields=name,status,language,components&limit=100');
   result.templates=Object.entries(c.whatsapp?.templates||{}).map(([kind,name])=>{const template=data.data?.find(t=>t.name===name&&t.language==='pt_BR');const body=template?.components?.find(t=>t.type==='BODY');const parameters=body?.text?.match(/\{\{[^}]+\}\}/g)||[];return {kind,name,approved:template?.status==='APPROVED',compatible:parameters.length===1&&parameters[0]==='{{1}}'&&!template?.components?.some(t=>['HEADER','BUTTONS'].includes(t.type)&&JSON.stringify(t).includes('{{'))}});
   result.templatesVerified=['appointment_confirmed','appointment_reminder','payment_paid','payment_failed'].every(kind=>result.templates.some(t=>t.kind===kind&&t.name&&t.approved&&t.compatible))&&result.templates.filter(t=>t.name).every(t=>t.approved&&t.compatible);
   result.templatesTruncated=!!data.paging?.next;
  }else result.templateAction='Informe o ID da conta WhatsApp Business para conferir os modelos na Meta.';
  return result;
 });
 await env.DB.prepare("INSERT INTO config(key,value) VALUES('studio_integration_health',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(report)).run();
 return report;
}
