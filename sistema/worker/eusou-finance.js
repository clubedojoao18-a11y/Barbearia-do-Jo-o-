/**
 * EU SOU — conservative membership scenario calculator.
 * Pure, side-effect-free functions; never creates charges or changes prices.
 * Monetary values are integer BRL cents.
 */
export function calculateCommunityScenario(input) {
  const {founders=0,educators=0,members=0,founderPrice=19000,educatorPrice=38000,memberPrice=29000,
    paymentPercent=4,platformFixed=0,monthlyFixedCosts=0,variableCostPerMember=0}=input||{};
  const counts=[founders,educators,members];
  const prices=[founderPrice,educatorPrice,memberPrice];
  if(!counts.every(x=>Number.isSafeInteger(x)&&x>=0&&x<=100000))throw new RangeError('Contagens inválidas');
  if(!prices.every(x=>Number.isSafeInteger(x)&&x>=0&&x<=100000000))throw new RangeError('Preços inválidos');
  if(![platformFixed,monthlyFixedCosts,variableCostPerMember].every(x=>Number.isSafeInteger(x)&&x>=0&&x<=100000000))throw new RangeError('Custos inválidos');
  if(typeof paymentPercent!=='number'||!Number.isFinite(paymentPercent)||paymentPercent<0||paymentPercent>100)throw new RangeError('Taxa inválida');
  const totalMembers=counts.reduce((a,b)=>a+b,0);
  const gross=counts.reduce((sum,n,i)=>sum+n*prices[i],0);
  const estimatedFees=Math.round(gross*paymentPercent/100)+totalMembers*platformFixed;
  const costs=monthlyFixedCosts+totalMembers*variableCostPerMember;
  const net=gross-estimatedFees-costs;
  if(![gross,estimatedFees,costs,net].every(Number.isSafeInteger))throw new RangeError('Valores excedem o limite seguro');
  return {totalMembers,gross,estimatedFees,costs,net,marginPercent:gross?Math.round(net/gross*10000)/100:0,
    currency:'BRL',estimated:true,notes:'Simulação. Taxas reais, tributos, estornos e repasses dependem dos contratos e da operação.'};
}

