import {config,method,random,challenge,sign,cookie,FLOW_COOKIE,authFailure} from '../../lib/auth.js';
export default async function handler(req,res) {
  if(!method(req,res,'GET'))return;
  try {
    const cfg=config(), state=random(),nonce=random(),verifier=random();
    const token=await sign({state,nonce,verifier},'core-values-flow',600,cfg);
    res.setHeader('Set-Cookie',cookie(FLOW_COOKIE,token,600));
    const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search=new URLSearchParams({client_id:cfg.clientId,redirect_uri:cfg.callback,response_type:'code',scope:'openid email profile',state,nonce,code_challenge:challenge(verifier),code_challenge_method:'S256',prompt:'select_account'}).toString();
    res.redirect(302,url.toString());
  }catch {authFailure(res);}
}
