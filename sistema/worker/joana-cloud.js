import {studioCredentials} from './studio.js';
// Availability probe only. Never forwards API keys or lists sessions to the client.
export async function verifyJoanaCloud(env,h){
 const now=Math.floor(Date.now()/1000),k=await studioCredentials(env,h),key=k.openai||env.OPENAI_API_KEY;
 if(env.AI_API_DISABLED==='true'||!key)return {available:false,checkedAt:now,status:null,reason:'Conexão de IA indisponível ou pausada.'};
 let response;try{response=await fetch('https://api.openai.com/v1/agents/sessions?limit=1',{headers:{Authorization:'Bearer '+key,'OpenAI-Beta':'agents=v1'},signal:AbortSignal.timeout(12000)})}catch{return {available:false,checkedAt:now,status:null,reason:'Não foi possível consultar o acesso à execução na nuvem.'}}
 if(response.ok){let value;try{value=await response.json()}catch{}if(!Array.isArray(value?.data))return {available:false,checkedAt:now,status:response.status,reason:'O serviço não confirmou o formato de acesso.'};return {available:true,checkedAt:now,status:response.status,reason:'Consulta autorizada. Criar e executar uma sessão hospedada ainda exige teste próprio.'}}
 return {available:false,checkedAt:now,status:response.status,reason:[401,403].includes(response.status)?'Esta chave ou projeto não tem acesso confirmado à API de agentes. Requer permissões api.agents.read e api.agents.write, além de api.responses.write.':response.status===404?'A API de agentes não está disponível neste projeto.':response.status===429?'A API de agentes informou limite ou saldo insuficiente.':'O serviço de execução na nuvem recusou a consulta.'};
}
