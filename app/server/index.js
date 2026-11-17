'use strict';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('./db');
const core = require('./core');
const auth = require('./auth');
const {runExercise} = require('./harness');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');
app.use(cookieParser());
app.use(express.json({limit:'256kb'}));

/* ---------- security headers: no third-party scripts, fonts, frames or trackers ---------- */
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
  next();
});
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  // CSRF: state-changing calls must come from our own scripts (custom header + SameSite=Strict cookie)
  if(req.method !== 'GET' && req.get('X-PQC') !== '1') return res.status(403).json({error:'Missing request header.'});
  next();
});
app.use(express.static(path.join(__dirname, '..', 'public'), {index:'index.html', maxAge:'5m'}));
app.use('/shared', (req, res, next) => (/^\/(catalog|engine|ops)\.js$/.test(req.path) ? next() : res.status(404).end()),
  express.static(path.join(__dirname, '..', 'shared'), {maxAge:'5m'}));

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const need = role => wrap(async (req, res, next) => {
  const u = await auth.currentUser(req);
  if(!u) return res.status(401).json({error:'Please sign in.'});
  if(role && !(u.role === role || (role === 'teacher' && u.role === 'researcher'))) return res.status(403).json({error:'Not allowed.'});
  req.user = u; next();
});
async function classOf(id){ const r = await db.q('select * from classes where id = $1', [id]); return r.rows[0]; }
async function loadState(userId){ const r = await db.q('select state, version from learner_state where user_id = $1', [userId]); return r.rows[0] ? {json:JSON.stringify(r.rows[0].state), version:r.rows[0].version} : {json:null, version:0}; }
async function saveState(userId, state){
  await db.q(`insert into learner_state (user_id, state, version, updated_at) values ($1, $2, 1, now())
              on conflict (user_id) do update set state = excluded.state, version = learner_state.version + 1, updated_at = now()`, [userId, JSON.stringify(state)]);
}

/* ---------- sign-in ---------- */
app.post('/api/login', wrap(async (req, res) => {
  if(auth.limited(req.ip)) return res.status(429).json({error:'Too many attempts. Wait a minute and try again.'});
  const {code, email, password} = req.body || {};
  let u = null;
  if(code){
    const r = await db.q("select * from users where role = 'student' and active and code_hash = $1", [auth.codeHash(code)]);
    u = r.rows[0];
  } else if(email && password){
    const r = await db.q("select * from users where role in ('teacher', 'researcher') and active and lower(email) = lower($1)", [String(email)]);
    if(r.rows[0] && auth.checkPassword(password, r.rows[0].password_hash)) u = r.rows[0];
  }
  if(!u){ auth.failed(req.ip); return res.status(401).json({error:code ? 'That code was not recognised. Check it with your teacher.' : 'E-mail or password not recognised.'}); }
  await auth.startSession(res, u.id);
  await db.q('update users set last_seen = now() where id = $1', [u.id]);
  await db.insertEvents(u.id, u.class_id, 'server', [{t:Date.now(), type:'sign-in'}]);
  res.json({ok:true, role:u.role});
}));
app.post('/api/logout', wrap(async (req, res) => { await auth.endSession(req, res); res.json({ok:true}); }));
app.get('/api/me', wrap(async (req, res) => {
  const u = await auth.currentUser(req);
  res.json(u ? {role:u.role, pseudonym:u.pseudonym, arm:u.role === 'student' ? u.arm : undefined} : {role:null});
}));

/* ---------- student ---------- */
async function studentContext(u){
  const cls = await classOf(u.class_id);
  const st = await loadState(u.id);
  return {cls, settings:cls.settings, st};
}
function studentSettings(full){
  // the browser needs the help rules, thresholds, release, gates, banned terms and protection settings
  const {vm, ...rest} = full; return rest;
}
app.get('/api/student/bootstrap', need('student'), wrap(async (req, res) => {
  const u = req.user;
  const out = await db.serial(u.id, async () => {
    const {cls, settings, st} = await studentContext(u);
    let state = st.json;
    if(!state){ const f = core.fresh(settings, u.arm); await saveState(u.id, f.state); state = JSON.stringify(f.state); await db.insertEvents(u.id, u.class_id, 'server', [{t:Date.now(), type:'enrolled', arm:u.arm}]); }
    const r = core.op(state, settings, u.arm, null, 'unpause', []);
    await saveState(u.id, r.state);
    return {state:r.state, lessons:core.publicLessons(JSON.stringify(r.state), settings, u.arm), settings:studentSettings(core.settings(settings)), className:cls.name};
  });
  res.json(Object.assign({pseudonym:u.pseudonym, arm:u.arm}, out));
}));

const STUDENT_OPS = new Set(['hook', 'check', 'retryCheck', 'attempt', 'exit', 'routing', 'template', 'left', 'resume', 'integrity', 'pause', 'ui', 'tutor']);
app.post('/api/student/act', need('student'), wrap(async (req, res) => {
  const u = req.user, {op, args, ui} = req.body || {};
  if(!STUDENT_OPS.has(op)) return res.status(400).json({error:'Unknown action.'});
  const a = Array.isArray(args) ? args.slice(0, 6) : [];
  const out = await db.serial(u.id, async () => {
    const {settings, st} = await studentContext(u);
    if(!st.json) return {error:'Reload the page.'};
    if(op === 'attempt'){
      const ex = core.exercise(a[0], a[1]);
      if(ex && ex.kind === 'code'){
        const blocked = core.canRun(st.json, settings, u.arm, a[0], a[1]);
        if(!blocked){
          const run = await runExercise(a[0], a[1], a[3]);
          // a sandbox outage is not the student's failure: no attempt is used and the learner model is untouched
          if(run && run.unavailable){
            await db.insertEvents(u.id, u.class_id, 'server', [{t:Date.now(), type:'sandbox-unavailable', lesson:a[0], ex:a[1]}]);
            return {error:run.note + ' Your code is kept, and this did not count as an attempt.'};
          }
          a[4] = run;
        }
      }
    }
    // the browser's timestamp identifies the restart; accept it only if it is recent
    const recent = t => Number.isFinite(+t) && Math.abs(Date.now() - +t) < 120000 ? +t : Date.now();
    if(op === 'left') a[1] = recent(a[1]);
    if(op === 'resume' && a[0] != null) a[0] = recent(a[0]);
    const r = core.op(st.json, settings, u.arm, ui || null, op, a);
    await saveState(u.id, r.state);
    await db.insertEvents(u.id, u.class_id, 'server', r.events);
    const reveals = op === 'hook' ? core.reveals(JSON.stringify(r.state), settings, u.arm) : undefined;
    return {result:r.result, state:r.state, reveals};
  });
  await db.q('update users set last_seen = now() where id = $1', [u.id]);
  res.json(out);
}));
app.post('/api/student/sync', need('student'), wrap(async (req, res) => {
  const u = req.user, ui = (req.body || {}).ui;
  await db.serial(u.id, async () => {
    const {settings, st} = await studentContext(u);
    if(!st.json) return;
    const r = core.op(st.json, settings, u.arm, ui, null, []);
    await saveState(u.id, r.state);
  });
  await db.q('update users set last_seen = now() where id = $1', [u.id]);
  res.json({ok:true});
}));
const SERVER_TYPES = new Set(['answer-rejected', 'sandbox-unavailable', 'observe', 'check', 'exercise-submit', 'exit-submit', 'hook-commit', 'detector', 'integrity', 'llm', 'routing-predict', 'plan-action', 'secure-resumed', 'secure-paused', 'sign-in', 'enrolled']);
app.post('/api/student/events', need('student'), wrap(async (req, res) => {
  const list = Array.isArray((req.body || {}).events) ? req.body.events.slice(0, 200) : [];
  const clean = list.filter(e => e && typeof e.type === 'string' && /^[a-z][a-z-]{1,39}$/.test(e.type) && !SERVER_TYPES.has(e.type))
    .map(e => { const {arm, ...rest} = e; return rest; });
  await db.insertEvents(req.user.id, req.user.class_id, 'client', clean);
  res.json({ok:true, stored:clean.length});
}));

/* ---------- teacher ---------- */
async function records(classId){
  const cls = await classOf(classId);
  const r = await db.q(`select u.id, u.pseudonym, u.arm, u.last_seen, u.created_at, s.state from users u left join learner_state s on s.user_id = u.id
                        where u.class_id = $1 and u.role = 'student' and u.active order by u.created_at`, [classId]);
  return r.rows.map(row => {
    const mins = row.last_seen ? Math.max(0, Math.round((Date.now() - new Date(row.last_seen)) / 60000)) : 99999;
    const rec = core.record(row.state ? JSON.stringify(row.state) : null, cls.settings, row.arm, row.pseudonym, mins);
    rec.uid = row.id; rec.neverSignedIn = !row.last_seen;
    return rec;
  });
}
app.get('/api/teacher/bootstrap', need('teacher'), wrap(async (req, res) => {
  const cls = await classOf(req.user.class_id);
  res.json({email:req.user.email, className:cls.name, lessons:core.fullLessons(), settings:core.settings(cls.settings), records:await records(cls.id)});
}));
app.get('/api/teacher/records', need('teacher'), wrap(async (req, res) => res.json({records:await records(req.user.class_id)})));
async function ownStudent(req){
  const r = await db.q("select * from users where id = $1 and class_id = $2 and role = 'student'", [req.params.id, req.user.class_id]);
  return r.rows[0];
}
app.get('/api/teacher/student/:id', need('teacher'), wrap(async (req, res) => {
  const s = await ownStudent(req); if(!s) return res.status(404).json({error:'Not found.'});
  const st = await loadState(s.id), state = st.json ? JSON.parse(st.json) : {les:{}, llm:[], integrity:[]};
  const predictions = Object.keys(state.les || {}).map(L => ({L, text:(state.les[L].hook || {}).text || '', exitDraft:state.les[L].exitDraft || null})).filter(x => x.text || x.exitDraft);
  res.json({predictions, llm:(state.llm || []).slice(-40), integrity:(state.integrity || []).slice(-200)});
}));
app.put('/api/teacher/settings', need('teacher'), wrap(async (req, res) => {
  const merged = core.settings((req.body || {}).settings || {});
  await db.q('update classes set settings = $1 where id = $2', [JSON.stringify(merged), req.user.class_id]);
  await db.insertEvents(req.user.id, req.user.class_id, 'server', [{t:Date.now(), type:'settings-changed', secure:merged.secure, release:merged.release}]);
  res.json({ok:true, settings:merged});
}));
app.post('/api/teacher/students', need('teacher'), wrap(async (req, res) => {
  const n = Math.max(1, Math.min(100, parseInt((req.body || {}).count, 10) || 0));
  const existing = await db.q("select arm from users where class_id = $1 and role = 'student'", [req.user.class_id]);
  // balanced random assignment in blocks of two, continuing the class's sequence
  let t = existing.rows.filter(r => r.arm === 'T').length, c = existing.rows.length - t;
  const created = [];
  for(let i = 0; i < n; i++){
    let arm = t === c ? (crypto.randomInt(2) ? 'T' : 'C') : (t < c ? 'T' : 'C');
    if(arm === 'T') t++; else c++;
    const code = auth.randomCode(), pseudonym = auth.randomPseudonym();
    await db.q("insert into users (role, class_id, pseudonym, code_hash, arm) values ('student', $1, $2, $3, $4)", [req.user.class_id, pseudonym, auth.codeHash(code), arm]);
    created.push({pseudonym, code, arm});
  }
  await db.insertEvents(req.user.id, req.user.class_id, 'server', [{t:Date.now(), type:'students-created', count:n}]);
  res.json({created});
}));
app.post('/api/teacher/student/:id/code', need('teacher'), wrap(async (req, res) => {
  const s = await ownStudent(req); if(!s) return res.status(404).json({error:'Not found.'});
  const code = auth.randomCode();
  await db.q('update users set code_hash = $1 where id = $2', [auth.codeHash(code), s.id]);
  await db.q('delete from sessions where user_id = $1', [s.id]);
  res.json({pseudonym:s.pseudonym, code});
}));
app.post('/api/teacher/student/:id/arm', need('teacher'), wrap(async (req, res) => {
  const s = await ownStudent(req); if(!s) return res.status(404).json({error:'Not found.'});
  const arm = (req.body || {}).arm === 'C' ? 'C' : 'T';
  await db.q('update users set arm = $1 where id = $2', [arm, s.id]);
  await db.insertEvents(s.id, s.class_id, 'server', [{t:Date.now(), type:'arm-changed', arm, by:'teacher'}]);
  res.json({ok:true});
}));
app.post('/api/teacher/student/:id/reset', need('teacher'), wrap(async (req, res) => {
  const s = await ownStudent(req); if(!s) return res.status(404).json({error:'Not found.'});
  await db.serial(s.id, async () => {
    const cls = await classOf(s.class_id), st = await loadState(s.id);
    const keep = st.json ? JSON.parse(st.json) : {};
    const f = core.fresh(cls.settings, s.arm).state;
    f.integrity = keep.integrity || []; f.llm = keep.llm || []; f.epoch = (keep.epoch || 0) + 1;
    await saveState(s.id, f);
  });
  await db.insertEvents(s.id, s.class_id, 'server', [{t:Date.now(), type:'learner-reset', by:'teacher'}]);
  res.json({ok:true});
}));
app.post('/api/teacher/run', need('teacher'), wrap(async (req, res) => {
  const {L, exId, code} = req.body || {};
  res.json({run:await runExercise(String(L), String(exId), String(code || '').slice(0, 40000))});
}));
app.get('/api/teacher/export/:kind', need('teacher'), wrap(async (req, res) => {
  const kind = req.params.kind;
  if(kind === 'events'){
    const r = await db.q(`select u.pseudonym as learner, u.arm, e.t, e.source, e.type, e.lesson, e.payload from events e join users u on u.id = e.user_id
                          where e.class_id = $1 and u.role = 'student' order by e.t, e.id limit 200000`, [req.user.class_id]);
    return res.json(r.rows);
  }
  if(kind === 'integrity' || kind === 'llm'){
    const r = await db.q(`select u.pseudonym, u.arm, s.state from users u join learner_state s on s.user_id = u.id where u.class_id = $1 and u.role = 'student'`, [req.user.class_id]);
    return res.json(r.rows.flatMap(row => (row.state[kind === 'llm' ? 'llm' : 'integrity'] || []).map(e => Object.assign({learner:row.pseudonym, arm:row.arm}, e))));
  }
  res.status(404).json({error:'Unknown export.'});
}));

app.get('/healthz', wrap(async (req, res) => { await db.q('select 1'); res.json({ok:true}); }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({error:'Something went wrong on the server.'}); });

const PORT = +process.env.PORT || 8080;
db.migrate().then(() => app.listen(PORT, () => console.log('PQC Lab on', PORT)), e => { console.error(e); process.exit(1); });
