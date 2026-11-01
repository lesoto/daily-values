import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export const SESSION_COOKIE = '__Host-cv-session';
export const FLOW_COOKIE = '__Host-cv-flow';
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export function config() {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret, SESSION_SECRET: secret, APP_URL } = process.env;
  if (!clientId || !clientSecret || !secret || secret.length < 32 || !APP_URL) throw new Error('Authentication configuration is incomplete');
  const url = new URL(APP_URL);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('APP_URL must be an HTTPS origin');
  return { clientId, clientSecret, secret, origin: url.origin, callback: url.origin + '/api/auth/callback' };
}
export function privateHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Vary', 'Cookie');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}
export function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function cookies(req) {
  const result = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    try { result[part.slice(0,i).trim()] = decodeURIComponent(part.slice(i+1)); } catch {}
  }
  return result;
}
export function random() { return randomBytes(32).toString('base64url'); }
export function challenge(verifier) { return createHash('sha256').update(verifier).digest('base64url'); }
export function equal(a,b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x=Buffer.from(a), y=Buffer.from(b);
  return x.length===y.length && timingSafeEqual(x,y);
}
export async function sign(payload, audience, seconds, cfg=config()) {
  return new SignJWT(payload).setProtectedHeader({alg:'HS256'}).setIssuer(cfg.origin)
    .setAudience(audience).setIssuedAt().setExpirationTime(Math.floor(Date.now()/1000)+seconds)
    .sign(new TextEncoder().encode(cfg.secret));
}
export async function verify(token, audience, cfg=config()) {
  const {payload}=await jwtVerify(token, new TextEncoder().encode(cfg.secret), {
    algorithms:['HS256'],issuer:cfg.origin,audience
  });
  return payload;
}
export function allowed(email) {
  const list=(process.env.ALLOWED_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  return !list.length || list.includes(email.toLowerCase());
}
export async function session(req) {
  try {
    const token=cookies(req)[SESSION_COOKIE];
    if (!token) return null;
    const p=await verify(token,'core-values-session');
    if (typeof p.sub!=='string'||typeof p.email!=='string'||typeof p.csrf!=='string'||!allowed(p.email)) return null;
    return p;
  } catch { return null; }
}
export async function verifyGoogle(token,cfg) {
  const {payload}=await jwtVerify(token,JWKS,{algorithms:['RS256'],issuer:['https://accounts.google.com','accounts.google.com'],audience:cfg.clientId});
  return payload;
}
export function checkIdentity(p,flow,cfg) {
  if (!equal(p.nonce,flow.nonce)||!p.sub||p.email_verified!==true||typeof p.email!=='string') throw new Error('Invalid identity');
  if (p.azp && p.azp!==cfg.clientId) throw new Error('Invalid authorized party');
  if (!allowed(p.email)) throw new Error('Account is not allowed');
}
export function method(req,res,expected) {
  privateHeaders(res);
  if (req.method===expected) return true;
  res.setHeader('Allow',expected);res.status(405).json({error:'Method not allowed'});return false;
}
export function authFailure(res) { res.status(503).send('Google sign-in is not configured. Set the Google OAuth and session environment variables in Vercel.'); }
