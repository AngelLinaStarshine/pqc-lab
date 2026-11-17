/* ================================================================
   PQC LAB — CLIENT ↔ SERVER
   Students: every graded action goes to the server, which grades it with
   the answer keys the browser never receives and returns the new state.
   Teachers: the console reads the class from the server; "preview as a
   student" runs the same shared operations locally with the full content.
   ================================================================ */
let MODE = 'none';          // 'student' | 'teacher' | 'none'
let ME = {};
let RECORDS = [];
const DETAIL = {};

async function api(path, body, keepalive){
  const opt = body === undefined ? {credentials:'same-origin'} :
    {method:'POST', credentials:'same-origin', keepalive:!!keepalive, headers:{'content-type':'application/json', 'X-PQC':'1'}, body:JSON.stringify(body)};
  const r = await fetch(path, opt);
  let data = null; try { data = await r.json(); } catch(e){ data = null; }
  if(r.status === 401 && MODE !== 'none'){ showSignedOut(); throw new Error('signed out'); }
  if(!r.ok) throw Object.assign(new Error((data && data.error) || ('HTTP ' + r.status)), {status:r.status, data});
  return data;
}
async function apiPut(path, body){
  const r = await fetch(path, {method:'PUT', credentials:'same-origin', headers:{'content-type':'application/json', 'X-PQC':'1'}, body:JSON.stringify(body)});
  if(!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/* ---------- student actions ---------- */
let NET_ERR = '';
async function act(op, args, opts){
  if(MODE !== 'student') return OPS[op].apply(null, args || []);
  try {
    const res = await api('/api/student/act', {op, args:args || [], ui:op === 'ui' ? null : uiPatch()});
    if(res && res.error){ return {error:res.error}; }
    if(res.reveals) Object.keys(res.reveals).forEach(L => { if(LESSONS[L] && LESSONS[L].hook) LESSONS[L].hook.reveal = res.reveals[L]; });
    if(res.state) applyServerState(res.state);
    LAST_UI = JSON.stringify(uiPatch());
    NET_ERR = '';
    return res.result || {ok:true};
  } catch(e){
    if(opts && opts.quiet) return {error:e.message};
    NET_ERR = e.message === 'signed out' ? '' : 'Could not reach the course server. Your answer was not saved; try again.';
    return {error:NET_ERR || 'Please sign in again.'};
  }
}
/* Merge the server's authoritative state with what the learner is typing right now. */
function applyServerState(srv){
  const local = S;
  if(local && (srv.epoch || 0) === (local.epoch || 0)){
    Object.keys(local.les || {}).forEach(L => {
      const a = local.les[L], b = srv.les && srv.les[L];
      if(!a || !b) return;
      Object.keys(a.ex || {}).forEach(id => {
        const x = a.ex[id], y = b.ex[id];
        if(y && (y.attempts || 0) === (x.attempts || 0)){ y.answer = x.answer; y.draft = x.draft; }
        else if(!y && !x.attempts) b.ex[id] = x;
      });
      if(b.hook && !b.hook.revealed && a.hook && !a.hook.revealed){ b.hook.text = a.hook.text; if(a.hook.vote != null) b.hook.vote = a.hook.vote; }
      Object.keys(a.checks || {}).forEach(pid => {
        const x = a.checks[pid], y = b.checks[pid];
        if(y && !y.submitted && !x.submitted) y.ans = x.ans;
        else if(!y && !x.submitted) b.checks[pid] = x;
      });
      if(!b.exit && a.exitDraft) b.exitDraft = a.exitDraft;
      if(L === local.lesson){
        ['step', 'part', 'board'].forEach(k => { if(a[k] !== undefined) b[k] = a[k]; });
        b.cur = Object.assign({}, b.cur, a.cur);
        b.routing = Object.assign({}, b.routing, {cfg:a.routing.cfg, jdk:a.routing.jdk, pred:Object.assign({}, a.routing.pred, b.routing.pred)});
      }
    });
    srv.lesson = local.lesson; srv.mode = local.mode;
  }
  srv.armed = local ? !!local.armed : false;
  srv.preview = false;
  srv.telemetry = local ? local.telemetry : [];
  S = srv;
}

/* ---------- drafts and navigation are saved every few seconds ---------- */
let LAST_UI = '';
function uiPatch(){
  const L = S.lesson, st = S.les[L], p = {lesson:L, mode:S.mode, introSeen:!!S.introSeen};
  if(st && LESSONS[L] && !LESSONS[L].placeholder){
    p.les = {L, step:st.step, part:st.part, cur:st.cur, board:st.board, routing:{cfg:st.routing.cfg, jdk:st.routing.jdk, pred:st.routing.pred || {}},
      hook:{text:st.hook.text, vote:st.hook.vote}, ex:{}, checks:{}, exitDraft:st.exitDraft};
    Object.keys(st.ex).forEach(id => { p.les.ex[id] = {answer:st.ex[id].answer, draft:st.ex[id].draft}; });
    Object.keys(st.checks).forEach(pid => { if(!st.checks[pid].submitted) p.les.checks[pid] = st.checks[pid].ans; });
  }
  return p;
}
async function syncUi(keepalive){
  if(MODE !== 'student') return;
  const p = uiPatch(), j = JSON.stringify(p);
  if(j === LAST_UI) return;
  LAST_UI = j;
  try { await api('/api/student/sync', {ui:p}, keepalive); } catch(e){ LAST_UI = ''; }
}
async function flushEvents(keepalive){
  if(MODE !== 'student' || !S.telemetry.length) return;
  const batch = S.telemetry.splice(0, 200);
  try { await api('/api/student/events', {events:batch}, keepalive); } catch(e){ /* telemetry is best effort */ }
}
setInterval(() => { syncUi(); flushEvents(); }, 5000);
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden'){ syncUi(true); flushEvents(true); } });

function sendLeft(via, t){
  fetch('/api/student/act', {method:'POST', keepalive:true, credentials:'same-origin', headers:{'content-type':'application/json', 'X-PQC':'1'}, body:JSON.stringify({op:'left', args:[via, t]})})
    .then(r => r.json()).then(res => { if(res && res.state && document.visibilityState === 'visible'){ applyServerState(res.state); } }).catch(() => {});
}
function onTutorTurn(rec){ if(MODE === 'student') setTimeout(() => act('tutor', [rec], {quiet:true}), 0); }

async function submitExercise(ex, rec){
  if(MODE === 'student') return act('attempt', [S.lesson, ex.id, rec.answer, rec.draft]);
  let run = null;
  if(ex.kind === 'code' && MODE === 'teacher'){ try { run = (await api('/api/teacher/run', {L:S.lesson, exId:ex.id, code:rec.draft})).run; } catch(e){ run = null; } }
  return OPS.attempt(S.lesson, ex.id, rec.answer, rec.draft, run);
}

/* ---------- feedback, built from the server's result ---------- */
function runBlock(run){
  if(!run) return '';
  if(!run.ran) return '<span class="warn">' + esc(run.note || 'The program was not run.') + ' The checks above read your source only.</span>\n';
  return run.runs.map(r => '<span class="q">$ java · ' + esc(r.label) + (r.compiled ? ' · exit ' + r.exit + ' · ' + r.ms + ' ms' + (r.timedOut ? ' · stopped: time limit' : '') : ' · did not compile') + '</span>\n' +
    (r.compiled ? esc(r.stdout || '') + (r.stderr ? '<span class="exc">' + esc(r.stderr) + '</span>' : '') : '<span class="exc">' + esc(r.compile || '') + '</span>')).join('\n');
}
function feedbackHTML(ex, rec){
  const g = rec.result; if(!g || !rec.attempts) return '';
  let body = '';
  if(ex.kind === 'explain'){
    body = g.note ? '<p>' + esc(g.note) + '</p>' : '<p>Points a full answer covers:</p><ul class="cl">' + (g.items || []).map(i => '<li class="' + (i.ok ? 'ok' : 'no') + '"><span aria-hidden="true">' + (i.ok ? '✓' : '○') + '</span> ' + esc(i.label) + (i.ok ? '' : ' <span class="sr">(not yet covered)</span>') + '</li>').join('') + '</ul>';
  } else if(ex.kind === 'table'){
    body = '<p>' + esc(g.note || '') + ' Green cells are right; red cells need another look.</p>';
  } else if(ex.kind === 'fill'){
    body = g.status === 'pass' ? '<div class="console">' + outHTML(['q:$ java (output for this program)'].concat(g.passOut || [])) + '</div>' :
      '<p>' + ((g.misses || []).length ? g.misses.map(esc).join('<br>') : 'Some blanks are not right yet. Red blanks need another look.') + '</p>' + ((g.flags || []).length ? '<div class="console">' + g.flags.map(f => '<span class="warn">Check ' + f.cls + ': ' + esc(f.desc) + '</span>').join('\n') + '</div>' : '');
  } else if(ex.kind === 'mc'){
    if(g.tworun && g.tworun.mine){
      const r = g.tworun.mine, c = g.tworun.good;
      body = '<div class="console"><span class="q">Two-run test of your choice</span>\nwith ml_kem_768 → ' + esc(r.r768) + '\nwith ml_kem_512 → ' + esc(r.r512) + (c ? '\n<span class="q">A check that works</span>\nwith ml_kem_768 → ' + esc(c.r768) + '\nwith ml_kem_512 → <span class="ok">' + esc(c.r512) + '</span>' : '') + '</div>';
    } else body = g.note ? '<p>' + esc(g.note) + '</p>' : '';
  } else if(ex.kind === 'findline'){
    body = '<ul class="cl"><li class="' + (g.linesOK ? 'ok' : 'no') + '"><span aria-hidden="true">' + (g.linesOK ? '✓' : '○') + '</span> Faulty lines: ' + g.groupsHit + ' of ' + (g.groupsTotal || 1) + ' found' + (g.wrong ? ', and ' + g.wrong + ' line(s) picked that are fine' : '') + '</li>' +
      '<li class="' + (g.mechOK ? 'ok' : 'no') + '"><span aria-hidden="true">' + (g.mechOK ? '✓' : '○') + '</span> Reason ' + (g.mechOK ? 'named correctly' : 'not right yet') + '</li></ul>';
  } else if(ex.kind === 'multimc'){
    body = '<p>' + g.right + ' of ' + ex.qs.length + ' answers right.</p>';
  } else if(ex.kind === 'code'){
    body = '<ul class="cl">' + (g.res || []).map(r => '<li class="' + (r.ok ? 'ok' : 'no') + '"><span aria-hidden="true">' + (r.ok ? '✓' : '○') + '</span> ' + (r.runtime ? '<b>Run:</b> ' : '') + esc(r.label) + '</li>').join('') + '</ul>' +
      '<div class="console">' + ((g.flags || []).length ? g.flags.map(f => '<span class="' + (f.sev === 'silent' ? 'warn' : 'exc') + '">Misuse check ' + f.cls + ': ' + esc(f.desc) + '</span>').join('\n') + '\n' : '<span class="ok">Misuse checks: nothing flagged</span>\n') +
      (g.run ? runBlock(g.run) : g.status === 'pass' ? outHTML(['q:$ java (expected output)'].concat(g.passOut || [])) : '<span class="q">Program output appears when every check passes.</span>') + '</div>';
  }
  return '<div class="fb ' + g.status + '" role="status"><p class="fh">' + STATUS_HEAD[g.status] + '</p>' + body + '</div>';
}

/* ---------- sign-in and sign-out ---------- */
function loginHTML(msg){
  return '<main class="login"><div class="login-card"><p class="brand"><span class="glyph">ML-KEM</span><span>PQC Lab</span></p>' +
    '<h1>Sign in</h1><p class="muted">Use the code your teacher gave you. It looks like <code>ABCD-EFGH-JKMN</code>.</p>' +
    '<form id="codeForm"><label for="codeIn2">Your sign-in code</label><input id="codeIn2" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20" required>' +
    '<p class="err" id="loginErr" role="alert">' + esc(msg || '') + '</p><div class="actions"><button class="btn primary" type="submit">Sign in</button></div></form>' +
    '<details class="staff"><summary>Teacher or researcher sign-in</summary><form id="staffForm"><label for="emIn">E-mail</label><input id="emIn" type="email" autocomplete="username" required>' +
    '<label for="pwIn">Password</label><input id="pwIn" type="password" autocomplete="current-password" required><div class="actions"><button class="btn" type="submit">Sign in</button></div></form></details>' +
    '<p class="muted small">No names or e-mail addresses are stored for students. Your work is saved under a random pseudonym on the course server in Canada.</p></div></main>';
}
function showLogin(msg){
  MODE = 'none'; document.body.className = 'login-page';
  $('#app').innerHTML = loginHTML(msg);
  const go = async body => {
    try { await api('/api/login', body); boot(); }
    catch(e){ const el = $('#loginErr'); if(el) el.textContent = e.message; }
  };
  $('#codeForm').addEventListener('submit', e => { e.preventDefault(); go({code:$('#codeIn2').value}); });
  $('#staffForm').addEventListener('submit', e => { e.preventDefault(); go({email:$('#emIn').value, password:$('#pwIn').value}); });
  $('#codeIn2').focus();
}
function showSignedOut(){ showLogin('You were signed out. Sign in again to continue; your work up to your last answer is saved.'); }
async function signOut(){
  if(MODE === 'student'){ await act('pause', []); await syncUi(true); await flushEvents(true); }
  S.armed = false;
  try { await api('/api/logout', {}); } catch(e){}
  showLogin('Signed out. Your progress is saved.');
}

/* ---------- teacher console: class data from the server ---------- */
async function refreshRecords(){ try { RECORDS = (await api('/api/teacher/records')).records; } catch(e){} }
// keep the console current during a class: refresh every 30 s, re-rendering only overview-type sections the teacher is not typing in
setInterval(async () => {
  if(MODE !== 'teacher' || document.hidden) return;
  await refreshRecords();
  const a = document.activeElement;
  if(typeof TV !== 'undefined' && !TV.student && ['overview', 'students', 'integrity'].includes(TV.sec) && !(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) && typeof renderTeacherBody === 'function') renderTeacherBody();
}, 30000);
let SAVE_T = null;
function saveSettingsSoon(){
  clearTimeout(SAVE_T);
  SAVE_T = setTimeout(async () => { try { const r = await apiPut('/api/teacher/settings', {settings:SETTINGS}); SETTINGS = r.settings; applySettings(); toast('Saved for the class.'); } catch(e){ toast('Could not save the settings.'); } }, 600);
}
async function serverExport(kind){ return api('/api/teacher/export/' + kind); }
function tClassPanel(){
  return '<section class="panel"><h2>Class: ' + esc(ME.className || '') + '</h2><p class="muted small">Signed in as ' + esc(ME.email || '') + '. ' + RECORDS.length + ' student account' + (RECORDS.length === 1 ? '' : 's') + '. Students sign in with a code; no names are stored.</p>' +
    '<div class="banrow"><label>New sign-in codes <input type="number" id="nCodes" min="1" max="100" value="5"></label><label class="chk" style="align-self:end"><button class="btn primary" id="mkCodes">Create codes</button></label></div><div id="codesOut"></div>' +
    '<div class="banrow"><label class="chk"><input type="checkbox" id="showSample"' + (SETTINGS.showSample ? ' checked' : '') + '> Show the 24-student sample cohort (synthetic, for demonstrations)</label></div>' +
    '<div class="actions"><button class="btn" id="tSignOut">Sign out</button></div></section>';
}
function serverActionsHTML(r){
  return '<div class="actions"><button class="btn" data-srv-arm="' + esc(r.uid) + '" data-to="' + (r.arm === 'T' ? 'C' : 'T') + '">Move to Arm ' + (r.arm === 'T' ? 'C' : 'T') + '</button>' +
    '<button class="btn" data-srv-code="' + esc(r.uid) + '">Issue a new sign-in code</button><button class="btn" data-srv-reset="' + esc(r.uid) + '">Reset this learner\'s progress</button></div><div id="srvMsg" role="status"></div>';
}
function serverDetailHTML(r){
  const d = DETAIL[r.uid];
  if(!d){ loadDetail(r.uid); return '<p class="muted small">Loading predictions, wrap-up answers and help transcript…</p>'; }
  let h = '<section class="panel"><h3>Predictions and wrap-up answers</h3>' + (d.predictions.length ? d.predictions.map(x => '<p><b>Lesson ' + esc(x.L.slice(1)) + ' prediction:</b> ' + esc(x.text) + '</p>' + (x.exitDraft ? Object.entries(x.exitDraft).map(([i, t]) => '<p class="small"><b>Wrap-up ' + (+i+1) + ':</b> ' + esc(t) + '</p>').join('') : '')).join('') : '<p class="muted">None yet.</p>') + '</section>';
  h += '<section class="panel"><h3>Help transcript</h3>' + (d.llm.length ? '<table class="t compact"><thead><tr><th scope="col">Lesson</th><th scope="col">Mode</th><th scope="col">Trigger</th><th scope="col">Filter</th><th scope="col">Reply</th></tr></thead><tbody>' + d.llm.slice().reverse().map(x => '<tr><td>' + esc(x.lesson) + '</td><td>' + esc(x.mode) + '</td><td>' + esc(x.trigger) + '</td><td>' + (x.filter === 'passed' ? 'passed' : '<span class="badge building">fallback</span>') + '</td><td class="small">' + esc(x.delivered) + '</td></tr>').join('') + '</tbody></table>' : '<p class="muted">No help used yet.</p>') + '</section>';
  h += '<section class="panel"><h3>Session log</h3>' + (d.integrity.length ? '<table class="t compact"><thead><tr><th scope="col">Time</th><th scope="col">Event</th><th scope="col">Where</th><th scope="col">Detail</th></tr></thead><tbody>' + d.integrity.slice().reverse().map(e => '<tr><td class="num">' + esc(new Date(e.t).toLocaleString()) + '</td><td>' + esc(INTEG_LABEL[e.kind] || e.kind) + '</td><td>' + esc(e.lesson) + ' · ' + esc((STEP_PLAIN[e.step] || {}).label || e.step) + '</td><td class="small">' + esc([e.via, e.dropped].filter(Boolean).join(' · ')) + '</td></tr>').join('') + '</tbody></table>' : '<p class="muted">No events.</p>') + '</section>';
  return h;
}
async function loadDetail(uid){ try { DETAIL[uid] = await api('/api/teacher/student/' + uid); if(TV.sec === 'students') renderTeacherBody(); } catch(e){} }
function printCodes(list){
  return '<div class="panel"><h3>New codes · shown once</h3><p class="muted small">Give each student one code. Keep this list only on paper; the server stores codes hashed and cannot show them again.</p><table class="t compact"><thead><tr><th scope="col">Pseudonym</th><th scope="col">Sign-in code</th><th scope="col">Arm</th></tr></thead><tbody>' +
    list.map(c => '<tr><td>' + esc(c.pseudonym) + '</td><td><code>' + esc(c.code) + '</code></td><td>' + esc(c.arm || '') + '</td></tr>').join('') + '</tbody></table><div class="actions"><button class="btn" data-print="1">Print</button></div></div>';
}
function wireServerTeacher(b){
  const mk = b.querySelector('#mkCodes');
  if(mk) mk.addEventListener('click', async () => {
    mk.disabled = true;
    try { const r = await api('/api/teacher/students', {count:+b.querySelector('#nCodes').value}); b.querySelector('#codesOut').innerHTML = printCodes(r.created); await refreshRecords(); }
    catch(e){ toast(e.message); } finally { mk.disabled = false; }
  });
  const ss = b.querySelector('#showSample'); if(ss) ss.addEventListener('change', () => { SETTINGS.showSample = ss.checked; saveSettingsSoon(); });
  const so = b.querySelector('#tSignOut'); if(so) so.addEventListener('click', () => signOut());
  b.querySelectorAll('[data-srv-arm]').forEach(x => x.addEventListener('click', async () => { await api('/api/teacher/student/' + x.dataset.srvArm + '/arm', {arm:x.dataset.to}); await refreshRecords(); renderTeacherBody(); toast('Moved to Arm ' + x.dataset.to + '.'); }));
  b.querySelectorAll('[data-srv-code]').forEach(x => x.addEventListener('click', async () => { const r = await api('/api/teacher/student/' + x.dataset.srvCode + '/code', {}); b.querySelector('#srvMsg').innerHTML = printCodes([r]); }));
  b.querySelectorAll('[data-srv-reset]').forEach(x => x.addEventListener('click', async () => {
    if(x.dataset.confirm !== '1'){ x.dataset.confirm = '1'; x.textContent = 'Click again to reset (cannot be undone)'; return; }
    await api('/api/teacher/student/' + x.dataset.srvReset + '/reset', {}); delete DETAIL[x.dataset.srvReset]; await refreshRecords(); renderTeacherBody(); toast('Progress reset. The research log is kept.');
  }));
  // any change in Settings or Lessons & release is saved for the class
  if(['config', 'lessons'].includes(TV.sec)) b.addEventListener('change', e => { if(!e.target.closest('#codesOut') && e.target.id !== 'nCodes' && e.target.id !== 'showSample' && e.target.id !== 'liveArmSel' && e.target.id !== 'incLive') saveSettingsSoon(); });
  const rs = b.querySelector('#resetSettings'); if(rs) rs.addEventListener('click', () => saveSettingsSoon());
}
setInterval(async () => {
  if(MODE !== 'teacher' || location.hash === '#student' || TV.student) return;
  const ae = document.activeElement; if(ae && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) return;
  await refreshRecords();
  if(['overview', 'students', 'matrix', 'items', 'flags', 'integrity'].includes(TV.sec)) renderTeacherBody();
}, 30000);

document.addEventListener('click', e => { if(e.target.closest && e.target.closest('[data-print]')) window.print(); });

/* ---------- start-up and routing ---------- */
function route(){
  applySettings();
  if(MODE === 'student'){ S.preview = false; studentShell(); return; }
  if(MODE === 'teacher'){ if(location.hash === '#student'){ S.preview = true; studentShell(); } else teacherShell(); return; }
  showLogin();
}
window.addEventListener('hashchange', () => { if(MODE !== 'none') route(); });
async function boot(){
  let me;
  try { me = await api('/api/me'); } catch(e){ return showLogin('The course server is not reachable. Try again in a minute.'); }
  if(me.role === 'student'){
    const d = await api('/api/student/bootstrap');
    MODE = 'student'; ME = d;
    Object.keys(LESSONS).forEach(k => delete LESSONS[k]); Object.assign(LESSONS, d.lessons);
    SETTINGS = d.settings; applySettings();
    S = null; applyServerState(d.state); S.armed = false;
    LAST_UI = JSON.stringify(uiPatch());
    telem('session_start', {});
    if(location.hash) history.replaceState(null, '', location.pathname);
    route();
  } else if(me.role === 'teacher' || me.role === 'researcher'){
    const d = await api('/api/teacher/bootstrap');
    MODE = 'teacher'; ME = d; RECORDS = d.records;
    Object.keys(LESSONS).forEach(k => delete LESSONS[k]); Object.assign(LESSONS, d.lessons);
    SETTINGS = d.settings; applySettings();
    S = freshState(); S.introSeen = true;
    if(!location.hash) location.hash = '#teacher'; else route();
  } else showLogin();
}
boot();
