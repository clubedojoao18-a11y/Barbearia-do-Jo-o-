// Aggregate evidence only. A signed test webhook is not proof of a customer message.
export async function whatsappReadiness(db) {
 const inbound=await db.prepare('SELECT COUNT(*) total,MAX(created_at) latest FROM wa_inbox').first();
 const replies=(await db.prepare("SELECT status,COUNT(*) total FROM wa_outbox WHERE kind='reply' GROUP BY status").all()).results||[];
 const stored=async key=>JSON.parse((await db.prepare('SELECT value FROM config WHERE key=?').bind(key).first())?.value||'null');
 const webhooks=await stored('studio_webhook_health')||{};
 const verification=await stored('studio_integration_health');
 const counts=Object.fromEntries(replies.map(row=>[row.status,Number(row.total)||0]));
 const receivedAt=Math.max(Number(inbound?.latest)||0,Number(webhooks.whatsappInbound)||0)||null;
 const errors=verification?.whatsapp?.phoneHealth?.health?.entities?.flatMap(entity=>entity.errors||[])||[];
 const paymentBlocked=errors.some(error=>Number(error.error_code)===141006);
 const businessLimited=errors.some(error=>Number(error.error_code)===141010);
 return {
  receiptVerified:!!receivedAt,lastReceivedAt:receivedAt,processedMessages:Number(inbound?.total)||0,
  replyAccepted:!!(counts.sent||counts.delivered||counts.read),replyDelivered:!!(counts.delivered||counts.read),replyCounts:counts,
  lastSignedEventAt:webhooks.whatsappSignature||null,lastMatchingNumberEventAt:webhooks.whatsappNumberEvent||null,
  lastOtherNumberEventAt:webhooks.whatsappOtherNumber||null,lastPausedEventAt:webhooks.whatsappPaused||null,
  providerCheckedAt:verification?.checkedAt||null,paymentBlocked,businessLimited,
  receiptLabel:receivedAt?'Recebimento real confirmado':'Aguardando recebimento real',
  replyLabel:counts.delivered||counts.read?'Resposta entregue':counts.sent?'Resposta aceita pela Meta':'Resposta ainda não comprovada',
  paymentLabel:paymentBlocked?'Falta cadastrar o cartão na conta WhatsApp. A Meta bloqueia conversas iniciadas pela empresa.':null,
  businessLabel:businessLimited?'Verificação empresarial pendente. A Meta informa limites na conta; isso não comprova falha de recebimento.':null
 };
}
