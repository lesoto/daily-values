import {config,method,cookies,FLOW_COOKIE,SESSION_COOKIE,cookie,verify,equal,verifyGoogle,checkIdentity,sign,random,SESSION_SECONDS} from '../../lib/auth.js';
export default async function handler(req,res) {
  if(!method(req,res,'GET'))return;
  res.setHeader('Set-Cookie',cookie(FLOW_COOKIE,'',0));
  try {
    const cfg=config(), q=new URL(req.url,cfg.origin).searchParams;
    if(q.has('error'))return res.redirect(303,'/?auth_error=cancelled');
    const flow=await verify(cookies(req)[FLOW_COOKIE],'core-values-flow',cfg);
    if(!equal(q.get('state'),flow.state)||!q.get('code')||typeof flow.verifier!=='string')throw Error('Invalid flow');
    const response=await fetch('https://oauth2.googleapis.com/token',{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({code:q.get('code'),client_id:cfg.clientId,client_secret:cfg.clientSecret,redirect_uri:cfg.callback,grant_type:'authorization_code',code_verifier:flow.verifier}),signal:AbortSignal.timeout(10000)
    });
    if(!response.ok)throw Error('Token exchange failed');
    const data=await response.json();
    if(typeof data.id_token!=='string')throw Error('Missing ID token');
    const p=await verifyGoogle(data.id_token,cfg);checkIdentity(p,flow,cfg);
    const signed=await sign({sub:p.sub,email:p.email,name:typeof p.name==='string'?p.name.slice(0,100):p.email,csrf:random()},'core-values-session',SESSION_SECONDS,cfg);
    res.setHeader('Set-Cookie',[cookie(FLOW_COOKIE,'',0),cookie(SESSION_COOKIE,signed,SESSION_SECONDS)]);
    res.redirect(303,'/');
  }catch {res.redirect(303,'/?auth_error=failed');}
}
