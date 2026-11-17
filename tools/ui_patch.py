"""One-time patch of app/public/ui.js: graded actions go through act(), which is the
server for students and the shared ops for the teacher preview."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[1]
p = root / 'app/public/ui.js'
s = p.read_text(encoding='utf-8')
def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count: raise SystemExit('anchor count %d (want %d): %r' % (n, count, old[:110]))
    s = s.replace(old, new)
def cut_block(start, end_marker):
    """Remove from the line starting with `start` up to (not including) `end_marker`."""
    global s
    i = s.index(start); j = s.index(end_marker, i)
    s = s[:i] + s[j:]

# moved to shared/ops.js
cut_block('const ROUTING = {', 'function renderRouting(){')
cut_block('const STEP_PLAIN = {', 'const MODE_PLAIN')
cut_block('function newRecord(ex){', 'function renderExerciseBody(ex, rec, ro){')
cut_block('function answered(ex, rec){', 'const STATUS_HEAD')
cut_block('function gradeAndRecord(ex, rec){', '/* ================================================================\n   PQC LAB v4 — STUDENT INTERFACE')

# routing predictor
rep("""  const s = b.querySelector('[data-rshow]'); if(s) s.addEventListener('click', () => {
    const k = (r.cfg || 'A') + (r.jdk || '21'); r.shown[k] = true;
    const ok = r.pred[k] === ROUTING[r.cfg || 'A'].ans[r.jdk || '21'];
    observe('B-02', 'L2', ok ? 'success' : 'failure', 0.3, 'routing prediction ' + k);
    telem('routing-predict', {cfg:k, ok}); UI.refresh(true);
  });""",
"""  const s = b.querySelector('[data-rshow]'); if(s) s.addEventListener('click', () => {
    const k = (r.cfg || 'A') + (r.jdk || '21'); s.disabled = true;
    act('routing', [S.lesson, r.cfg || 'A', r.jdk || '21', r.pred[k]]).then(() => UI.refresh(true));
  });""")

# table, fill and find-the-line marks come from the server's result
rep("""const v = a[ri + ':' + ci] || '', mk = rec.marks ? (rec.marks[ri + ':' + ci] ? ' mark-ok' : ' mark-no') : '';""",
"""const v = a[ri + ':' + ci] || '', M = rec.result && rec.result.marks, mk = M ? (M[ri + ':' + ci] ? ' mark-ok' : ' mark-no') : '';""")
rep("""const i = +m[1], b = ex.blanks[i], v = a[i] || '', mk = rec.marks ? (rec.marks[i] ? ' mark-ok' : ' mark-no') : '';""",
"""const i = +m[1], b = ex.blanks[i], v = a[i] || '', M = rec.result && rec.result.marks, mk = M ? (M[i] ? ' mark-ok' : ' mark-no') : '';""")
rep("""    const picks = new Set(a.lines || []), shownAns = rec.attempts && rec.status === 'pass', all = ex.groups.flat();""",
"""    const picks = new Set(a.lines || []), shownAns = rec.attempts && rec.status === 'pass', RES = rec.result || {}, truth = RES.lineTruth || {}, all = RES.answerLines || [];""")
rep("""      if(picks.has(n)) cls += rec.attempts ? (inG ? ' right' : ' wrongpick') : ' picked';""",
"""      if(picks.has(n)) cls += rec.attempts && (n in truth) ? (truth[n] ? ' right' : ' wrongpick') : ' picked';""")

# Learn checks: answers and explanations come back after submitting
rep("""        if(ck.submitted){ if(oi === q.a){""", """        const R = (ck.result || [])[qi]; if(ck.submitted && R){ if(oi === R.a){""")
rep("""(ck.submitted ? '<p class="cfb ' + (a === q.a ? 'ok' : 'no') + '">' + (a === q.a ? '✓ Right. ' : '✗ Not quite. ') + esc(q.why) + '</p>' : '')""",
"""(ck.submitted && ck.result ? '<p class="cfb ' + (ck.result[qi].ok ? 'ok' : 'no') + '">' + (ck.result[qi].ok ? '✓ Right. ' : '✗ Not quite. ') + esc(ck.result[qi].why) + '</p>' : '')""")
rep("""    ck.submitted = true; ck.tries = (ck.tries || 0) + 1;
    const wrong = part.checks.filter((q, qi) => ck.ans[qi] !== q.a).length; ck.wrong = wrong > 0;
    part.concepts.forEach(K => observe(K, 'L2', wrong ? 'failure' : 'success', 0.5, 'check ' + L + part.id + (wrong ? ' (' + wrong + ' wrong)' : '')));
    telem('check', {part:part.id, wrong});
    if(wrong) autoSocratic('wrong check');
    studentRefresh(true);
  });
  const rc = $('#retryCheck'); if(rc) rc.addEventListener('click', () => { ck.submitted = false; ck.ans = {}; studentRefresh(true); });""",
"""    cb.disabled = true;
    act('check', [L, pi, ck.ans]).then(r => {
      if(r && r.error){ studentRefresh(true); const e = $('#checkErr'); if(e) e.textContent = r.error; return; }
      if(r && r.wrong) autoSocratic('wrong check');
      studentRefresh(true);
    });
  });
  const rc = $('#retryCheck'); if(rc) rc.addEventListener('click', () => { act('retryCheck', [L, pi]).then(() => studentRefresh(true)); });""")
rep("""act:() => { curC.submitted = false; curC.ans = {}; studentRefresh(true); const c = $('#check');""",
"""act:() => { act('retryCheck', [L, st.part]).then(() => { studentRefresh(true); const c = $('#check'); if(c){ c.scrollIntoView({block:'start'}); c.focus(); } }); return; const c = $('#check');""")

# Predict step
rep("""    st.hook.text = t; st.hook.revealed = true; telem('hook-commit', {len:t.length, vote:st.hook.vote}); studentRefresh();""",
"""    c.disabled = true;
    act('hook', [S.lesson, t, st.hook.vote]).then(r => { if(r && r.error){ studentRefresh(true); const e = $('#hookErr'); if(e) e.textContent = r.error; return; } studentRefresh(); });""")

# Exercises
rep("""    gradeAndRecord(ex, rec); studentRefresh(true);
    const fb = document.querySelector('.fb'); if(fb) fb.scrollIntoView({block:'nearest'});""",
"""    const btn = $('#submitEx'); btn.disabled = true; btn.textContent = ex.kind === 'code' ? 'Compiling and running…' : 'Checking…';
    submitExercise(ex, rec).then(r => {
      if(r && r.error){ studentRefresh(true); const e = $('#exErr'); if(e) e.textContent = r.error; return; }
      if(r && r.autoSoc) autoSocratic(r.autoSoc);
      studentRefresh(true);
      const fb = document.querySelector('.fb'); if(fb) fb.scrollIntoView({block:'nearest'});
    });""")
rep("""(rec.attempts ? '<span class="muted small">Tries: ' + rec.attempts + '</span>' : '') + '</div>' + (rec.fb || '') +""",
"""(rec.attempts ? '<span class="muted small">Tries: ' + rec.attempts + '</span>' : '') + '</div>' + feedbackHTML(ex, rec) +""")
rep("""'<details class="model"><summary>See an example answer</summary><p>' + esc(ex.model || '') + '</p></details>'""",
"""'<details class="model"><summary>See an example answer</summary><p>' + esc(rec.model || ex.model || '') + '</p></details>'""")

# Wrap-up
rep("""<p>Example answer: ' + esc(q.model) + '</p></div>'""", """<p>Example answer: ' + esc(res.model || q.model || '') + '</p></div>'""")
rep("""    st.exit = e.qs.map((q, qi) => {
      if(q.ungraded) return {status:'pass'};
      const g = gradeExplain({criteria:q.criteria}, ans[qi] || '', 2);
      applyCells(q.cells, g.status === 'miss' ? 'failure' : 'success', g.status === 'pass' ? 1 : g.status === 'partial' ? 0.3 : 1, 'exit ' + L + ' q' + (qi+1));
      return {status:g.status};
    });
    telem('exit-submit', {L, results:st.exit.map(r => r.status)}); studentRefresh();""",
"""    b.disabled = true;
    act('exit', [L, ans]).then(r => { if(r && r.error){ studentRefresh(true); const x = $('#exitErr'); if(x) x.textContent = r.error; return; } studentRefresh(); });""")

# Suggestions panel
rep("""      observe(a.K, 'L2', 'success', 0.3, 'plan template ' + a.key); return;""", """      act('template', [a.key]); return;""")
rep("""const ck = st.checks[a.part]; if(ck){ ck.submitted = false; ck.ans = {}; } }""",
"""const ck = st.checks[a.part]; if(ck && ck.submitted){ act('retryCheck', [a.L, st.part]).then(() => studentRefresh()); } }""")

# Student header: sign out, honest footer
rep("""<button class="btn ghost" id="openTerms">Key terms</button></nav></header>'""",
"""<button class="btn ghost" id="openTerms">Key terms</button>' + (MODE === 'student' ? '<button class="btn ghost" id="signOut">Sign out</button>' : '') + '</nav></header>'""")
rep("""'<footer class="s-foot muted"><span>Code runs and help replies are simulated in this prototype.</span><a href="#teacher">For teachers</a></footer>'""",
"""'<footer class="s-foot muted"><span>' + (MODE === 'student' ? 'Signed in as ' + esc(ME.pseudonym || '') + ' · Build exercises run on the course server · help replies are simulated in this version.' : 'Teacher preview · Build exercises run on the course server.') + '</span>' + (MODE === 'student' ? '' : '<a href="#teacher">Back to the teacher console</a>') + '</footer>'""")
rep("""  $('#openTerms').addEventListener('click', () => openTerms());
  UI.refresh = keep => studentRefresh(keep);""",
"""  $('#openTerms').addEventListener('click', () => openTerms());
  const so = $('#signOut'); if(so) so.addEventListener('click', () => signOut());
  UI.refresh = keep => studentRefresh(keep);""")

# Session protection: blocked actions and restarts are recorded by the server
rep("""function integrityLog(kind, extra){
  const st = S.les[S.lesson];
  const e = Object.assign({t:Date.now(), kind, lesson:S.lesson, step:st ? st.step : 'hook'}, extra || {});
  S.integrity.push(e);
  telem('integrity', e);
  return e;
}""",
"""function integrityLog(kind, extra){
  extra = extra || {};
  if(MODE === 'student'){ act('integrity', [kind, extra.via || '', extra.dropped || ''], {quiet:true}); return; }
  OPS.integrity(kind, extra.via || '', extra.dropped || '');
}""")
cut_block('function describeWork(L, scope){', 'function showResetNotice(){')
rep("""function showResetNotice(){""", """function leftWindow(via){
  const t = Date.now();
  const r = OPS.left(via, t);            // applied here at once, and by the server with the same timestamp
  if(!r.reset) return;
  S.armed = false; SV.tab = 'next';
  if(MODE === 'student') sendLeft(via, t);
  UI.refresh();
  showResetNotice();
}
function showResetNotice(){""")
rep("""  showModal(html, '#openIntro', () => { S.secureLock = null; telem('secure-resumed', {}); armSecure('after reset'); studentRefresh(); });""",
"""  showModal(html, '#openIntro', () => {
    const lock = S.secureLock;
    if(MODE === 'student') act('resume', [lock && lock.t, lock && lock.via]).then(() => { armSecure('after reset'); studentRefresh(); });
    else { OPS.resume(); armSecure('after reset'); studentRefresh(); }
  });""")
rep("""function integ(rec){
  if(rec.live){""", """function integ(rec){
  if(rec.integ) return Object.assign({events:[]}, rec.integ);
  if(rec.live){""")

# Teacher console reads the class from the server
rep("""  let recs = cohort().slice();
  if(SETTINGS.includeLive) recs.unshift(liveRecord());""",
"""  let recs = (MODE === 'teacher' ? RECORDS.slice() : []).concat(MODE !== 'teacher' || SETTINGS.showSample ? cohort() : []);
  if(SETTINGS.includeLive) recs.unshift(liveRecord());""")
rep("""function synthNote(){ return '<p class="synth">""", """function synthNote(){ if(MODE === 'teacher' && !SETTINGS.showSample) return RECORDS.length ? '' : '<p class="synth">No students have signed in yet. Create sign-in codes under Settings, or switch on the sample cohort there to try the console.</p>'; return '<p class="synth">""")
rep("""function findRecord(id){ return id === liveRecord().id ? liveRecord() : cohort().find(r => r.id === id); }""",
"""function findRecord(id){ return id === liveRecord().id ? liveRecord() : (RECORDS.find(r => r.id === id) || cohort().find(r => r.id === id)); }""")
rep("""  } else h += '<p class="muted small">Predictions, wrap-up answers and help transcripts are available for real learners; synthetic records have none.</p>';""",
"""  } else if(r.server) h += serverDetailHTML(r);
  else h += '<p class="muted small">Predictions, wrap-up answers and help transcripts are available for real learners; synthetic records have none.</p>';""")
rep("""  if(r.live) h += '<div class="actions"><button class="btn" id="liveArm">""", """  if(r.server) h += serverActionsHTML(r);
  if(r.live) h += '<div class="actions"><button class="btn" id="liveArm">""")
rep("""  h += tSecureSettings();""", """  if(MODE === 'teacher') h = tClassPanel() + h;
  h += tSecureSettings();""")
rep("""function doExport(kind){""", """async function doExport(kind){""")
rep("""  if(kind === 'telemetry') txt = JSON.stringify(S.telemetry, null, 2);
  if(kind === 'llm') txt = JSON.stringify(S.llm, null, 2);""",
"""  if(kind === 'telemetry') txt = MODE === 'teacher' ? JSON.stringify(await serverExport('events'), null, 1) : JSON.stringify(S.telemetry, null, 2);
  if(kind === 'llm') txt = MODE === 'teacher' ? JSON.stringify(await serverExport('llm'), null, 1) : JSON.stringify(S.llm, null, 2);""")
rep("""  if(kind === 'integrity') txt = csv(""", """  if(kind === 'integrity' && MODE === 'teacher') txt = csv([['student','arm','time','event','via','lesson','step','scope','dropped']].concat((await serverExport('integrity')).map(e => [e.learner, e.arm, new Date(e.t).toISOString(), e.kind, e.via || '', e.lesson, e.step, e.scope || '', e.dropped || ''])));
  else if(kind === 'integrity') txt = csv(""")
rep("""  wireSecureSettings(b);""", """  wireSecureSettings(b);
  if(MODE === 'teacher') wireServerTeacher(b);""")
rep("""<button class="btn" data-export="telemetry">This browser\\'s event log (JSON)</button>""", """<button class="btn" data-export="telemetry">' + (MODE === 'teacher' ? 'Class event log (JSON)' : 'This browser\\'s event log (JSON)') + '</button>""")

# The router moves to client.js (it needs the sign-in state first)
rep("""function route(){ applySettings(); if(location.hash === '#teacher') teacherShell(); else studentShell(); }
window.addEventListener('hashchange', route);
telem('session_start', {});
route();""", "")

p.write_text(s, encoding='utf-8')
print('ui.js patched', len(s))
