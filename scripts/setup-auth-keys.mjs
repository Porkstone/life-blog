import { generateKeyPair, exportPKCS8, exportJWK } from 'jose';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const prod = process.argv.includes('--prod');
const target = prod ? ['--prod'] : [];
const cli = 'node_modules/convex/bin/main.js';
const existing = spawnSync(process.execPath, [cli,'env','list','--names-only',...target], {encoding:'utf8'});
if(existing.status !== 0) throw new Error('Could not inspect auth environment.');
if(/JWT_PRIVATE_KEY|JWKS/.test(existing.stdout)) throw new Error('Auth keys already exist; refusing to rotate them.');
const keys = await generateKeyPair('RS256',{extractable:true});
const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g,' ');
const jwks = JSON.stringify({keys:[{use:'sig',...await exportJWK(keys.publicKey)}]});
const file = '.auth-keys.local';
try {
 fs.writeFileSync(file,`JWT_PRIVATE_KEY="${privateKey}"\nJWKS=${jwks}\nSITE_URL=${prod?'https://life-blog-five.vercel.app':'http://localhost:5173'}\n`,{mode:0o600});
 const result=spawnSync(process.execPath,[cli,'env','set','--from-file',file,...target],{encoding:'utf8'});
 if(result.status!==0) throw new Error('Could not set auth keys. Inspect the deployment environment before retrying.');
 console.log(`Configured JWT_PRIVATE_KEY, JWKS, and SITE_URL for ${prod?'production':'development'}.`);
} finally {fs.rmSync(file,{force:true});}
