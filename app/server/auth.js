'use strict';
const crypto = require('crypto');
const {q} = require('./db');

const SECRET = process.env.SESSION_SECRET || '';
if(SECRET.length < 32) throw new Error('SESSION_SECRET must be set (32+ random characters).');
const SESSION_HOURS = +process.env.SESSION_HOURS || 12;
const SECURE_COOKIE = process.env.COOKIE_SECURE !== 'false';

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const codeHash = code => sha(SECRET + ':code:' + normCode(code));
const ALPHA = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';           // no 0/O, 1/I/L, U
function randomCode(){
  const b = crypto.randomBytes(12); let s = '';
  for(let i = 0; i < 12; i++) s += ALPHA[b[i] % ALPHA.length];
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8);
}
function normCode(c){ return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function randomPseudonym(){ return 'P-' + crypto.randomBytes(4).toString('hex').toUpperCase(); }

function hashPassword(pw){
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(pw), salt, 64, {N:16384, r:8, p:1});
  return 'scrypt$' + salt.toString('hex') + '$' + key.toString('hex');
}
function checkPassword(pw, stored){
  const [kind, salt, key] = String(stored || '').split('$');
  if(kind !== 'scrypt' || !salt || !key) return false;
  const k = crypto.scryptSync(String(pw), Buffer.from(salt, 'hex'), 64, {N:16384, r:8, p:1});
  return crypto.timingSafeEqual(k, Buffer.from(key, 'hex'));
}

async function startSession(res, userId){
  const raw = crypto.randomBytes(32).toString('base64url');
  await q('insert into sessions (id, user_id, expires_at) values ($1, $2, now() + ($3 || \' hours\')::interval)', [sha(raw), userId, String(SESSION_HOURS)]);
  res.cookie('pqc_sid', raw, {httpOnly:true, sameSite:'strict', secure:SECURE_COOKIE, maxAge:SESSION_HOURS * 3600e3, path:'/'});
}
async function endSession(req, res){
  const raw = req.cookies && req.cookies.pqc_sid;
  if(raw) await q('delete from sessions where id = $1', [sha(raw)]);
  res.clearCookie('pqc_sid', {path:'/'});
}
async function currentUser(req){
  const raw = req.cookies && req.cookies.pqc_sid;
  if(!raw) return null;
  const r = await q(`select u.* from sessions s join users u on u.id = s.user_id
                     where s.id = $1 and s.expires_at > now() and u.active`, [sha(raw)]);
  return r.rows[0] || null;
}

/* Per-IP limiter for sign-in that counts FAILED attempts only, so a whole class
   signing in at once from one school IP (NAT) is never blocked. Codes carry ~60 bits,
   so 30 wrong guesses a minute cannot find one; teacher passwords are scrypt-hashed. */
const fails = new Map();
const FAIL_MAX = +process.env.LOGIN_FAIL_MAX || 30;
function recent(ip, windowMs){ const now = Date.now(), h = (fails.get(ip) || []).filter(t => now - t < windowMs); fails.set(ip, h); return h; }
function limited(ip, windowMs = 60000){ return recent(ip, windowMs).length >= FAIL_MAX; }
function failed(ip){ recent(ip, 60000).push(Date.now()); if(fails.size > 50000) fails.clear(); }

module.exports = {codeHash, randomCode, normCode, randomPseudonym, hashPassword, checkPassword, startSession, endSession, currentUser, limited, failed};
