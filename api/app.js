import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {method,session,config} from '../lib/auth.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export default async function handler(req,res){
  if(!method(req,res,'GET'))return;
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const p=await session(req);
  if(!p){
    let ready=true;try{config()}catch{ready=false}
    const error=new URL(req.url,'https://placeholder.invalid').searchParams.has('auth_error');
    return res.status(ready?200:503).send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in · Core Values</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#101715;color:#e9eee8;font:16px/1.6 system-ui}main{max-width:430px;padding:35px}h1{font:38px Georgia}a{display:block;text-align:center;background:#c4e6a4;color:#1c301f;padding:13px;border-radius:9px;text-decoration:none;font-weight:600}p{color:#a2aea5}.error{color:#f3aaa0}</style><main><p>◎ CORE VALUES / DAILY COMPASS</p><h1>A clearer direction.<br>Your own account.</h1><p>Reflect on events, your behavior, and what matters to you.</p>${error?'<p class="error">Sign-in was cancelled or could not be verified. Try again with an allowed Google account.</p>':''}${ready?'<a href="/api/auth/login">Continue with Google</a>':'<p class="error">Google sign-in needs configuration before this deployment can be used.</p>'}<p><small>Google shares your name, email, and account identifier. Journal content stays in this browser, separated by account. No cross-device sync.</small></p></main></html>`);
  }
  const html=await readFile(join(process.cwd(),'dist/index.html'),'utf8');
  const identity=JSON.stringify({id:p.sub,email:p.email,name:p.name,csrf:p.csrf}).replace(/</g,'\\u003c');
  res.status(200).send(html.replace('<!-- ACCOUNT_BOOTSTRAP -->',`<script>window.CORE_ACCOUNT=${identity};</script>`));
}
