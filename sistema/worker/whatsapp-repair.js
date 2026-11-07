// Rebind only the existing number. Never disconnect another application or send a message.
export async function repairWhatsApp(env, input, graph) {
  const fail = message => { throw Object.assign(new Error(message), {status:400}); };
  if (!input.consent || !/^\d{6,30}$/.test(input.appId || '') ||
      typeof input.token !== 'string' || input.token.length < 20 || input.token.length > 4000)
    fail('Informe o aplicativo, a credencial e confirme o vínculo.');
  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_BUSINESS_ACCOUNT_ID || !env.WHATSAPP_VERIFY_TOKEN)
    fail('Conecte primeiro o número oficial.');
  const secret = input.appSecret || env.WHATSAPP_APP_SECRET;
  if (typeof secret !== 'string' || secret.length < 20 || secret.length > 200)
    fail('Informe o segredo do mesmo aplicativo.');
  const checked = async (stage, credentials, path, data) => {
    try { return await graph(credentials,path,data); } catch (error) {
      const code=/^\d{1,6}$/.test(error.providerCode||'')?' (Meta '+error.providerCode+')':'';
      fail(stage+code);
    }
  };
  const candidate = {...env, WHATSAPP_ACCESS_TOKEN:input.token, WHATSAPP_APP_SECRET:secret};
  const debug = await checked('A Meta não validou o segredo e a credencial do aplicativo', {...candidate, WHATSAPP_ACCESS_TOKEN:input.appId+'|'+secret},
    'debug_token?input_token='+encodeURIComponent(input.token));
  if (!debug.data?.is_valid || String(debug.data.app_id) !== input.appId)
    fail('A credencial não corresponde ao aplicativo informado.');
  const scopes = new Set(debug.data.scopes || []);
  if (!scopes.has('whatsapp_business_management') || !scopes.has('whatsapp_business_messaging'))
    fail('A credencial precisa das permissões de gerenciamento e mensagens do WhatsApp.');
  if (debug.data.expires_at && debug.data.expires_at <= Math.floor(Date.now()/1000))
    fail('A credencial expirou. Gere uma nova na Meta.');
  const phone = await checked('A credencial não tem acesso ao número configurado',candidate, env.WHATSAPP_PHONE_NUMBER_ID+'?fields=id,display_phone_number');
  const numbers = await checked('A credencial não tem acesso à conta WhatsApp configurada',candidate, env.WHATSAPP_BUSINESS_ACCOUNT_ID+'/phone_numbers?fields=id&limit=100');
  if (String(phone.id) !== env.WHATSAPP_PHONE_NUMBER_ID ||
      !numbers.data?.some(x => String(x.id) === env.WHATSAPP_PHONE_NUMBER_ID))
    fail('O número não pertence à conta WhatsApp configurada.');
  const subscriptions = () => checked('A Meta não permitiu consultar os aplicativos vinculados',candidate, env.WHATSAPP_BUSINESS_ACCOUNT_ID+'/subscribed_apps');
  const hasApp = result => result.data?.some(x => String((x.whatsapp_business_api_data || x).id) === input.appId);
  if (!hasApp(await subscriptions())) {
    const result = await checked('A Meta não permitiu vincular o aplicativo',candidate, env.WHATSAPP_BUSINESS_ACCOUNT_ID+'/subscribed_apps', {});
    if (result.success !== true) fail('A Meta não confirmou o vínculo do aplicativo.');
  }
  if (!hasApp(await subscriptions())) fail('O aplicativo ainda não consta no vínculo da Meta.');
  return {
    credentials:{WHATSAPP_PHONE_NUMBER_ID:env.WHATSAPP_PHONE_NUMBER_ID,
      WHATSAPP_BUSINESS_ACCOUNT_ID:env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      WHATSAPP_VERIFY_TOKEN:env.WHATSAPP_VERIFY_TOKEN,
      WHATSAPP_API_VERSION:env.WHATSAPP_API_VERSION || 'v26.0',
      WHATSAPP_APP_SECRET:secret, WHATSAPP_ACCESS_TOKEN:input.token, WHATSAPP_APP_ID:input.appId},
    status:{appId:input.appId, phoneNumber:phone.display_phone_number,
      subscriptionVerified:true, tokenExpiresAt:debug.data.expires_at || null}
  };
}
