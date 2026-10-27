import {execFileSync} from 'node:child_process';
import {readFileSync,statSync} from 'node:fs';
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const secret=/\b(?:[sr]k_live_[A-Za-z0-9]{40,}|whsec_[A-Za-z0-9]{32,}|AKIA[A-Z0-9]{16})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
let failures=0;
for(const file of files){if(!/\.(?:[cm]?js|jsx|ts|tsx|json|md|ya?ml|toml|env|txt|sh|sql)$/.test(file)&&!/(?:^|\/)\.env(?:\.|$)/.test(file))continue;try{if(statSync(file).size>2_000_000)continue;if(secret.test(readFileSync(file,'utf8'))){console.error('Possible credential in tracked source: '+file);failures++}}catch(e){if(e.code!=='ENOENT')throw e}}
if(failures)process.exit(1);
console.log('Secret scan passed.');
