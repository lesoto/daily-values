import {method,config,session,equal,cookie,SESSION_COOKIE,FLOW_COOKIE} from '../../lib/auth.js';
export default async function handler(req,res){
  if(!method(req,res,'POST'))return;
  const p=await session(req);
  let origin;try{origin=config().origin}catch{return res.status(503).json({error:'Authentication unavailable'})}
  if(!p||req.headers.origin!==origin||!equal(req.headers['x-csrf-token'],p.csrf))return res.status(403).json({error:'Invalid sign-out request'});
  res.setHeader('Set-Cookie',[cookie(SESSION_COOKIE,'',0),cookie(FLOW_COOKIE,'',0)]);
  res.status(200).json({ok:true});
}
