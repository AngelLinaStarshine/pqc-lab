// Class-size load test: N students sign in from one IP at once, work through Lesson 1 together,
// and M Java runs hit the sandbox in the same second. Usage: node tests/load.js [N] [M]
const fs = require('fs'), path = require('path');
const BASE = process.env.BASE || 'http://127.0.0.1:8080';
const N = +process.argv[2] || 30, M = +process.argv[3] || 15;
const K = JSON.parse(fs.readFileSync(path.join(__dirname, 'keys.json'), 'utf8'));
function client(){
  let cookie = '';
  return async (method, url, body) => {
    const t = Date.now();
    const r = await fetch(BASE + url, {method, headers:{'content-type':'application/json', 'X-PQC':'1', cookie}, body:body ? JSON.stringify(body) : undefined});
    const sc = r.headers.get('set-cookie'); if(sc) cookie = sc.split(';')[0];
    const data = await r.json().catch(() => ({}));
    return {status:r.status, data, ms:Date.now() - t};
  };
}
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
(async () => {
  const T = client();
  const tl = await T('POST', '/api/login', {email:process.env.TEACHER_EMAIL || 'teacher@example.org', password:process.env.TEACHER_PASSWORD || 'pilot-teacher-pass-2026'});
  if(tl.status !== 200) throw new Error('teacher sign-in failed');
  const codes = (await T('POST', '/api/teacher/students', {count:N})).data.created.map(c => c.code);
  const lat = [], errs = [];
  const call = async (c, ...a) => { const r = await c(...a); lat.push(r.ms); if(r.status >= 400 || (r.data && r.data.error)) errs.push(a[1] + ' ' + r.status + ' ' + (r.data && r.data.error)); return r; };
  const L1 = K.L1;
  const t0 = Date.now();
  const final = await Promise.all(codes.map(async code => {
    const S = client();
    await call(S, 'POST', '/api/login', {code});
    await call(S, 'GET', '/api/student/bootstrap');
    await call(S, 'POST', '/api/student/act', {op:'hook', args:['L1', 'My prediction for the load test.', null], ui:null});
    for(let pi = 0; pi < L1.parts.length; pi++){
      const a = {}; L1.parts[pi].checks.forEach((q, qi) => a[qi] = q.a);
      await call(S, 'POST', '/api/student/act', {op:'check', args:['L1', pi, a], ui:{les:{L:'L1', step:'learn', part:pi}}});
      await call(S, 'POST', '/api/student/sync', {ui:{les:{L:'L1', step:'learn', part:pi}}});
    }
    const b = await S('GET', '/api/student/bootstrap');
    return Object.keys(b.data.state.les.L1.checks || {}).length;
  }));
  const wall = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`${N} students, one IP: ${lat.length} requests in ${wall}s · p50 ${pct(lat, .5)} ms · p95 ${pct(lat, .95)} ms · max ${Math.max(...lat)} ms · errors ${errs.length}`);
  if(errs.length) console.log('  first errors:', errs.slice(0, 5));
  const want = L1.parts.reduce((n, p) => n + p.checks.length, 0);
  console.log(`  every student's saved progress complete: ${final.every(n => n === final[0] && n > 0)} (${final[0]} checks each)`);
  const L3 = K.L3.exercises.find(e => e.id === 'D1');
  const t1 = Date.now();
  const runs = await Promise.all(Array.from({length:M}, () => T('POST', '/api/teacher/run', {L:'L3', exId:'D1', code:L3.ref})));
  const ok = runs.filter(r => r.data.run && r.data.run.ran && r.data.run.checks.every(c => c.ok)).length;
  console.log(`${M} Java runs in the same second: ${ok}/${M} ran and passed · slowest ${Math.max(...runs.map(r => r.ms)) / 1000}s · total ${((Date.now() - t1) / 1000).toFixed(1)}s`);
})().catch(e => { console.error(e); process.exit(1); });
