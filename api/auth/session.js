import {method,session} from '../../lib/auth.js';
export default async function handler(req,res){
  if(!method(req,res,'GET'))return;
  const p=await session(req);
  if(!p)return res.status(401).json({error:'Sign-in required'});
  res.status(200).json({user:{id:p.sub,email:p.email,name:p.name},csrf:p.csrf});
}
