import {platformState,effectiveCompany} from './platform.js';
import {companyEnvironment,companyLicensed,scopeText} from './tenancy.js';
export async function routeWorkspace(req,env,app){
 const url=new URL(req.url),headers=new Headers(req.headers);headers.delete('x-joao-workspace-base');
 const match=url.pathname.match(/^\/b\/([a-z0-9][a-z0-9-]{2,39})(\/.*)?$/);
 if(!match)return app(new Request(req,{headers}),env);
 const {state}=await platformState(env.DB),registered=state.companies.find(x=>x.slug===match[1]);const company=registered?await effectiveCompany(env.DB,registered):null;
 if(!company)return Response.json({error:'Barbearia não encontrada.'},{status:404});
 const base='/b/'+company.slug,rest=match[2]||'/';
 if(rest.startsWith('/api/saas/'))return Response.json({error:'Operação indisponível nesta empresa.'},{status:404});
 if(!match[2])return Response.redirect(url.origin+base+'/'+url.search,302);
 if(rest.startsWith('/api/')&&req.method==='POST'&&!companyLicensed(company)&&!['/api/webhook','/api/whatsapp/webhook','/api/portal'].includes(rest))return Response.json({error:'Licença da empresa vencida ou pausada. O responsável pode regularizar em '+url.origin+'/sistema.'},{status:402});
 const internal=new URL(req.url);internal.pathname=rest;headers.set('x-joao-workspace-base',base);
 const response=await app(new Request(internal,new Request(req,{headers})),companyEnvironment(env,company));
 const outHeaders=new Headers(response.headers);outHeaders.delete('content-length');
 if(rest==='/sw.js')outHeaders.set('Service-Worker-Allowed',base+'/');
 const type=outHeaders.get('content-type')||'';
 if(rest==='/manifest.webmanifest'&&response.ok){const manifest=await response.json();manifest.id=base+'/';manifest.scope=base+'/';manifest.start_url=base+'/';manifest.name=company.name;manifest.short_name=company.name.slice(0,20);manifest.icons=manifest.icons.map(x=>({...x,src:base+x.src}));return new Response(JSON.stringify(manifest),{status:response.status,headers:outHeaders})}
 if(type.includes('text/html')||type.includes('javascript'))return new Response(scopeText(await response.text(),base,company.name),{status:response.status,headers:outHeaders});
 return new Response(response.body,{status:response.status,headers:outHeaders});
}
