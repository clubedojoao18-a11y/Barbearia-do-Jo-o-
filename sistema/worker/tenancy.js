import {TENANT_SCHEMA} from './tenant-schema.js';
const objects=new Set([...TENANT_SCHEMA.matchAll(/CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX|TRIGGER)\s+(\w+)/gi)].map(x=>x[1]).concat('security_limits'));
export function scopeSQL(sql,prefix){
 if(!/^w_[a-f0-9]{32}_$/.test(prefix))throw new Error('Invalid company namespace');
 const structural=sql.replace(/'(?:''|[^'])*'|--[^\n]*|\/\*[\s\S]*?\*\//g,' ');
 for(const match of structural.matchAll(/\b(FROM|JOIN|INTO|UPDATE|REFERENCES|TABLE(?:\s+IF\s+NOT\s+EXISTS)?)\s+("?[A-Za-z_][A-Za-z_0-9]*"?)/gi)){
  const name=match[2].replaceAll('"','').toLowerCase();
  if(match[1].toUpperCase()==='UPDATE'&&name==='set')continue;
  if(name==='json_each')continue;
  if(!objects.has(name))throw new Error('Unrecognized table in company query');
 }
 // SQL literals/comments remain untouched, including words that happen to match table names.
 return sql.replace(/'(?:''|[^'])*'|--[^\n]*|\/\*[\s\S]*?\*\/|"(?:""|[^"])*"|\b[A-Za-z_][A-Za-z_0-9]*\b/g,token=>{
  if(objects.has(token.toLowerCase()))return '"'+prefix+token.toLowerCase()+'"';
  if(token.startsWith('"')&&objects.has(token.slice(1,-1).toLowerCase()))return '"'+prefix+token.slice(1,-1).toLowerCase()+'"';
  return token;
 });
}
export function companyDB(db,company){
 if(!/^[a-f0-9]{32}$/.test(company.id))throw new Error('Invalid company id');
 const prefix='w_'+company.id+'_';
 const decorate=row=>row&&Object.hasOwn(row,'email')?{...row,_workspaceOwner:String(row.email).toLowerCase()===company.ownerEmail}:row;
 return {workspaceOwnerEmail:company.ownerEmail,companyId:company.id,
  prepare(sql){const raw=db.prepare(scopeSQL(sql,prefix));return wrap(raw)},
  async batch(list){return db.batch(list.map(x=>x._companyRaw))},
 };
 function wrap(raw){return {_companyRaw:raw,bind(...values){return wrap(raw.bind(...values))},async first(...args){return decorate(await raw.first(...args))},async all(){const out=await raw.all();return {...out,results:out.results.map(decorate)}},run(){return raw.run()}}}
}
export function companySchemaStatements(db,company){const prefix='w_'+company.id+'_';return TENANT_SCHEMA.split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean).map(sql=>db.prepare(scopeSQL(sql,prefix)))}
export function companyEnvironment(env,company){
 // A company may use only credentials configured inside its own namespace.
 const clean={DB:companyDB(env.DB,company),CONNECTION_MASTER_KEY:env.CONNECTION_MASTER_KEY,WORKSPACE:company};
 return clean;
}
export function companyLicensed(company,now=Math.floor(Date.now()/1000)){return !company.paused&&(company.trialUntil>now||company.paidUntil>now)}
export function scopeText(text,base,name){
 const urls=['/api/','/app.js','/manifest.webmanifest','/sw.js','/icon.svg','/icons/','/instalar','/?'];
 for(const path of urls)text=text.replaceAll('"'+path,'"'+base+path).replaceAll("'"+path,"'"+base+path);
 text=text.replaceAll('href="/"','href="'+base+'/"');
 text=text.replace(/(\/sign(?:in|out)-with-chatgpt\?return_to=)([^"'<>\\\s]+)/g,(_,start,path)=>{try{return start+encodeURIComponent(base+decodeURIComponent(path))}catch{return start+encodeURIComponent(base+'/')}});
 // Tenant names are restricted to non-executable plain text by server validation.
 return text.replaceAll('BARBEARIA DO JOÃO',name.toUpperCase()).replaceAll('Barbearia do João',name).replaceAll('Clube do João',name).replaceAll('BARBEARIA<br>DO JOÃO',name.toUpperCase());
}
