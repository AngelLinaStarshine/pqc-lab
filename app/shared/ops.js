/* ================================================================
   PQC LAB — OPERATIONS
   Every change a learner action makes to the learner state, in one
   place. The server runs these for students, so grading, evidence and
   answer keys never depend on the browser. The teacher's "preview as a
   student" runs the same functions in the browser.
   Works on the globals S (learner state), SETTINGS and LESSONS.
   ================================================================ */

const STEP_PLAIN = {
  hook:{label:'Predict', sub:'guess first'},
  learn:{label:'Read & check', sub:'learn the idea'},
  practice:{label:'Practise', sub:'explain and fill in'},
  diagnose:{label:'Find the bug', sub:'spot the error'},
  create:{label:'Build', sub:'write it yourself'},
  exit:{label:'Wrap up', sub:'on your own'},
};

/* L4 routing predictor: who answers an unpinned getInstance("ML-KEM"). Measured on JDK 21.0.12, 21.0.13 and 25 with BC 1.79. */
const ROUTING = {
  A:{label:'A · addProvider(BC)', ans:{'21':'BC', '25':'JDK built-in'}, note:{'21':'Before October 2026 JDK 21 had no ML-KEM, so BC was the only provider offering it.', '25':'Since 21.0.13 (and in JDK 24+) the JDK\'s own SunJCE ML-KEM sits earlier in the list than an appended BC. Measured on the lab VM.'}},
  B:{label:'B · BCPQC first, then BC', ans:{'21':'BCPQC', '25':'BCPQC'}, note:{'21':'BCPQC is first and answers to "ML-KEM" in 1.79, with a 1024 key by default (measured).', '25':'BCPQC is still first; the update changes nothing here.'}},
  C:{label:'C · BC inserted first', ans:{'21':'BC', '25':'BC'}, note:{'21':'BC is first.', '25':'BC is still first, ahead of the JDK\'s own ML-KEM (measured).'}},
};

function newRecord(ex){ return {attempts:0, answer: ex.kind === 'findline' ? {lines:[]} : ex.kind === 'mc' && ex.multi ? [] : {}, draft:ex.starter || ''}; }
function answered(ex, rec){
  const a = rec.answer;
  if(ex.kind === 'explain') return (a.text || '').trim().length > 0;
  if(ex.kind === 'table') return ex.rows.every((row, ri) => row.every((c, ci) => typeof c !== 'object' || (a[ri + ':' + ci] || '') !== ''));
  if(ex.kind === 'fill') return ex.blanks.every((b, i) => (a[i] || '') !== '');
  if(ex.kind === 'mc') return ex.multi ? a.length > 0 : a.pick != null;
  if(ex.kind === 'findline') return (a.lines || []).length > 0 && (ex.mech.multi ? (a.mech || []).length > 0 : a.mech != null);
  if(ex.kind === 'multimc') return ex.qs.every((q, i) => a[i] != null);
  return true;
}

/* ---------- input hygiene: answers arrive from the network ---------- */
const MAX_TEXT = 8000, MAX_CODE = 40000;
const isInt = (v, n) => Number.isInteger(v) && v >= 0 && v < n;
function str(v, max){ return typeof v === 'string' ? v.slice(0, max || MAX_TEXT) : ''; }
function cleanAnswer(ex, a){
  a = a || {};
  if(ex.kind === 'explain') return {text:str(a.text)};
  if(ex.kind === 'table'){ const o = {}; ex.rows.forEach((row, ri) => row.forEach((c, ci) => { if(typeof c === 'object'){ const k = ri + ':' + ci; o[k] = str(a[k], 200); } })); return o; }
  if(ex.kind === 'fill'){ const o = {}; ex.blanks.forEach((b, i) => { o[i] = str(a[i], 200); }); return o; }
  if(ex.kind === 'mc'){
    if(ex.multi) return (Array.isArray(a) ? a : []).filter((v, k, arr) => isInt(v, ex.opts.length) && arr.indexOf(v) === k);
    return isInt(a.pick, ex.opts.length) ? {pick:a.pick} : {};
  }
  if(ex.kind === 'findline'){
    const lines = (Array.isArray(a.lines) ? a.lines : []).filter((n, k, arr) => Number.isInteger(n) && n >= 1 && n <= ex.lines.length && arr.indexOf(n) === k);
    const mech = ex.mech.multi ? (Array.isArray(a.mech) ? a.mech : []).filter((v, k, arr) => isInt(v, ex.mech.opts.length) && arr.indexOf(v) === k) : (isInt(a.mech, ex.mech.opts.length) ? a.mech : null);
    return {lines, mech};
  }
  if(ex.kind === 'multimc'){ const o = {}; ex.qs.forEach((q, i) => { if(isInt(a[i], q.opts.length)) o[i] = a[i]; }); return o; }
  return {};
}

/* ---------- gating: an action is only accepted where the learner may be ---------- */
function canAct(L, step){
  const les = LESSONS[L];
  if(!les || les.placeholder) return 'This lesson is not available.';
  if(!lessonOpen(L)) return 'This lesson is locked.';
  refreshDone(L);
  if(step && !stepOpen(L, step)) return 'Finish the earlier steps first.';
  return null;
}

/* ---------- grading: the same rules as v5, returning data instead of HTML ---------- */
function gradeOnly(ex, rec, L, run){
  const a = rec.answer;
  if(ex.kind === 'explain') return gradeExplain(ex, a.text);
  if(ex.kind === 'table') return gradeTable(ex, a);
  if(ex.kind === 'fill'){
    const g = gradeFill(ex, a);
    g.flags = detect(composeFill(ex, a), {lesson:L, fragment:true}).map(f => ({cls:f.cls, desc:f.desc, sev:f.sev}));
    if(g.status === 'pass') g.passOut = ex.passOut || [];
    return g;
  }
  if(ex.kind === 'mc'){
    const g = gradeMC(ex, ex.multi ? a : a.pick);
    if(ex.tworun && a.pick != null) g.tworun = {mine:ex.runs[a.pick], good:a.pick !== ex.a ? ex.runs[ex.a] : null};
    return g;
  }
  if(ex.kind === 'findline'){
    const g = gradeFind(ex, a), all = new Set(ex.groups.flat());
    g.lineTruth = {}; (a.lines || []).forEach(n => { g.lineTruth[n] = all.has(n); });
    g.groupsTotal = ex.groups.length;
    if(g.status === 'pass') g.answerLines = [...all];
    return g;
  }
  if(ex.kind === 'multimc') return gradeMulti(ex, a);
  if(ex.kind === 'code'){
    const g = gradeCode(ex, rec.draft, L);
    g.flags = g.flags.map(f => ({cls:f.cls, desc:f.desc, sev:f.sev}));
    if(run){
      g.run = run;
      (run.checks || []).forEach(c => g.res.push({label:c.label, ok:!!c.ok, runtime:true}));
      const right = g.res.filter(r => r.ok).length;
      g.status = (right === g.res.length && g.flags.length === 0) ? 'pass' : right >= Math.ceil(g.res.length * 0.6) ? 'partial' : 'miss';
    }
    if(g.status === 'pass' && !(run && run.ran)) g.passOut = ex.passOut;
    return g;
  }
  return {status:'miss'};
}

/* ---------- operations ---------- */

/* ---------- Relevance check for free-text answers ----------
   A guess may be wrong, but it must be a real attempt at THIS question. Rejected text is not
   accepted, does not use an attempt, and is logged ('answer-rejected') for the research record.
   The check is deliberately lenient: one on-topic word in a real sentence is enough. */
const REL_STOP = new Set('the and for that this with from have what which when where your you they them their there then than been were will would could should about into does dont didnt cant wont also just like only some more most very much many such these those other each because while after before being doing make made said says write down sentence sentences reason most likely cause finish predict give name think today tomorrow yesterday hello thanks please really thing things every first second third another people someone something nothing always never still again without within between explain describe happens happen exactly concrete using shows answer question questions minute minutes would could should which while whose'.split(' '));
const REL_COURSE = ('quantum shor grover rsa ecdh ecdsa diffie hellman aes kem ml-kem mlkem kyber lattice lwe noise key keys secret shared encaps decaps encapsul decapsul ciphertext cipher encrypt decrypt bouncy castle bc bcpqc provider java jdk jca jce sun library librar implement algorithm version standard fips nist draft kdf hkdf deriv hash byte bytes length size parameter set 512 768 1024 1088 1184 1568 2400 exception error fail crash throw catch handle bug mismatch match different differ compare same wrong right correct code program test check secur safe weak strong category level class type name label register pin spec random rng seed output print destroy wipe clean update patch default raw format encod interop round handshake session message tamper flip corrupt attack ship merge review downgrade faster slower speed smaller bigger larger lying lie nobody both neither'
  ).split(' ');
const REL_REFLECT = 'right wrong partly partial guess guessed changed change because learned learnt think thought prediction predicted correct yes no now still same different missed realised realized'.split(' ');
const REL_NUMBER = 'zero none one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen all half few most some every nobody'.split(' ');
const NON_ANSWER = /^(i ?(do ?n.?t|do not) know|idk|dunno|no idea|not sure|nothing|none|n\/?a|na|pass|skip|test(ing)?|whatever|ok(ay)?|yes|no|maybe|lol|hm+|\?+|\.+|-+|x+)[\s.!?]*$/;
function relTokens(t){ return (String(t).toLowerCase().match(/[a-z0-9][a-z0-9\-']*/g) || []); }
function relPlain(h){ return String(h || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' '); }
function relWords(text){ return relTokens(relPlain(text)).map(w => w.replace(/'s$/, '')).filter(w => w.length >= 5 && !REL_STOP.has(w)); }
function relVocab(L, extra){
  const les = LESSONS[L], v = new Set(REL_COURSE);
  if(les && les.hook){ relWords((les.hook.story || []).join(' ') + ' ' + les.hook.prompt + ' ' + les.hook.title).forEach(w => v.add(w)); if(les.hook.vote) les.hook.vote.opts.forEach(o => relWords(o).forEach(w => v.add(w))); }
  (extra || []).forEach(w => v.add(w));
  return v;
}
function relHit(tok, vocab){
  if(/\d/.test(tok)) return true;
  for(const v of vocab){ if(tok === v || (v.length >= 4 && tok.startsWith(v)) || (tok.length >= 5 && v.startsWith(tok))) return true; }
  return false;
}
function wordLike(tok){
  if(/\d/.test(tok)) return true;
  if(tok.length > 22 || /(.)\1\1/.test(tok)) return false;
  if(/(asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwer|wert|erty|rtyu|tyui|yuio|zxcv|xcvb|cvbn|vbnm)/.test(tok)) return false;
  return /[aeiouy]/.test(tok) || tok.length <= 3;
}
/* returns null when acceptable, otherwise a message for the student */
function relevanceProblem(text, o){
  const t = String(text || '').trim(), toks = relTokens(t);
  if(NON_ANSWER.test(t.toLowerCase())) return o.guess ? 'A guess is fine, but it has to be your own idea. Write what you think happened, even if you are unsure.' : 'Write your own answer to the question, even if you are unsure.';
  if(toks.length < (o.minWords || 3)) return 'Write a full sentence' + (o.guess ? ' with your guess.' : ' that answers the question.');
  if(toks.filter(w => wordLike(w) || relHit(w, o.vocab)).length / toks.length < 0.7) return 'That does not read as words yet. Write your answer in ordinary sentences.';
  if(toks.length >= 6 && new Set(toks).size / toks.length < 0.4) return 'Repeating words is not an answer. Explain your thinking in a sentence.';
  const pw = new Set(relWords(o.prompt || '')), cw = relWords(t);
  if(cw.length >= 4 && cw.filter(w => pw.has(w)).length / cw.length >= 0.85 && toks.length >= 6) return 'Answer in your own words instead of repeating the question.';
  if(!toks.some(w => relHit(w, o.vocab))) return 'This does not seem to be about the question. ' + (o.guess ? 'What do you think caused it?' : 'Re-read the question and answer what it asks.');
  return null;
}
function rejectText(where, L, reason){ telem('answer-rejected', {where, L, reason}); return {error:reason, rejected:true}; }

function opHookCommit(L, text, vote){
  const err = canAct(L, 'hook'); if(err) return {error:err};
  const les = LESSONS[L], st = lp(L);
  if(st.hook.revealed) return {ok:true};
  const t = str(text, 4000).trim();
  if(les.hook.vote && !isInt(vote, les.hook.vote.opts.length)) return {error:'Choose one of the options above first.'};
  const bad = relevanceProblem(t, {guess:true, minWords:3, prompt:les.hook.prompt, vocab:relVocab(L, L === 'L2' ? REL_NUMBER : [])});
  if(bad) return rejectText('hook', L, bad);
  st.hook.text = t; if(les.hook.vote) st.hook.vote = vote; st.hook.revealed = true;
  telem('hook-commit', {len:t.length, vote:st.hook.vote});
  return {ok:true};
}
function opCheck(L, pi, answers){
  const err = canAct(L, 'learn'); if(err) return {error:err};
  const les = LESSONS[L], st = lp(L), part = les.parts[pi];
  if(!part) return {error:'No such part.'};
  if(pi > 0 && !S.preview && !(st.checks[les.parts[pi-1].id] && st.checks[les.parts[pi-1].id].submitted)) return {error:'Finish the previous part first.'};
  const ck = st.checks[part.id] || (st.checks[part.id] = {ans:{}});
  if(ck.submitted) return {ok:true};
  const ans = {}; part.checks.forEach((q, qi) => { const v = answers && answers[qi]; if(isInt(v, q.opts.length)) ans[qi] = v; });
  if(Object.keys(ans).length < part.checks.length) return {error:'Answer every question first.'};
  ck.ans = ans; ck.submitted = true; ck.tries = (ck.tries || 0) + 1;
  ck.result = part.checks.map((q, qi) => ({a:q.a, why:q.why, ok:ans[qi] === q.a}));
  const wrong = ck.result.filter(r => !r.ok).length; ck.wrong = wrong > 0;
  part.concepts.forEach(K => observe(K, 'L2', wrong ? 'failure' : 'success', 0.5, 'check ' + L + part.id + (wrong ? ' (' + wrong + ' wrong)' : '')));
  telem('check', {part:part.id, wrong, tries:ck.tries});
  return {ok:true, wrong};
}
function opRetryCheck(L, pi){
  const part = LESSONS[L] && LESSONS[L].parts[pi]; if(!part) return {error:'No such part.'};
  const ck = lp(L).checks[part.id]; if(ck){ ck.submitted = false; ck.ans = {}; delete ck.result; }
  return {ok:true};
}
function opAttempt(L, exId, answer, draft, run){
  const les = LESSONS[L], ex = les && !les.placeholder && les.exercises.find(e => e.id === exId);
  if(!ex) return {error:'No such exercise.'};
  const err = canAct(L, ex.step); if(err) return {error:err};
  const st = lp(L), rec = st.ex[ex.id] || (st.ex[ex.id] = newRecord(ex));
  rec.answer = cleanAnswer(ex, answer);
  if(ex.kind === 'code') rec.draft = str(draft, MAX_CODE);
  if(!answered(ex, rec)) return {error:'Answer every part of the exercise first.'};
  if(ex.kind === 'explain'){
    const extra = [].concat(...(ex.criteria || []).map(c => (c.any || []).map(x => String(x).toLowerCase().replace(/[^a-z0-9\- ]/g, ''))), relWords(ex.prompt + ' ' + ex.title));
    const bad = relevanceProblem(rec.answer.text, {minWords:3, prompt:ex.prompt, vocab:relVocab(L, extra)});
    if(bad) return rejectText('exercise ' + ex.id, L, bad);
  }
  const g = gradeOnly(ex, rec, L, run);
  rec.attempts++; rec.status = g.status; rec.result = g; rec.model = ex.model || '';
  applyCells(ex.cells, g.status === 'miss' ? 'failure' : 'success', g.status === 'pass' ? 1 : g.status === 'partial' ? 0.3 : 1, ex.id + ' ' + g.status);
  if(ex.kind === 'code' && g.flags.some(f => f.cls === 'M1')) observe('D-05', 'L6', 'failure', 1, 'M1 flag');
  if(ex.flag === 'SF-01' && g.status !== 'pass') observe('A-04', 'L4', 'failure', 0.75, 'SF-01 missed');
  S.flags = S.flags || {};
  (g.flags || []).forEach(f => { if(ex.kind === 'code'){ const k = f.cls + '|' + L; S.flags[k] = (S.flags[k] || 0) + 1; telem('detector', {ex:ex.id, cls:f.cls}); } });
  if(ex.flag && g.status !== 'pass' && ex.kind !== 'code'){ const k = ex.flag + '|' + L; S.flags[k] = (S.flags[k] || 0) + 1; }
  telem('exercise-submit', {ex:ex.id, exType:ex.type, status:g.status, attempt:rec.attempts, ran:!!(run && run.ran)});
  nudge('active', 0.03);
  return {ok:true, status:g.status, autoSoc:(g.status !== 'pass' && (ex.type === 'A' || ex.type === 'C')) ? (ex.flag ? 'detector ' + ex.flag : 'miss on ' + ex.id) : null};
}
function opExit(L, answers){
  const err = canAct(L, 'exit'); if(err) return {error:err};
  const e = LESSONS[L].exit, st = lp(L);
  if(st.exit) return {ok:true};
  const ans = {}; e.qs.forEach((q, qi) => { ans[qi] = str(answers && answers[qi]); });
  if(e.qs.some((q, qi) => !q.ungraded && !ans[qi].trim())) return {error:'Answer the marked questions first.'};
  for(let qi = 0; qi < e.qs.length; qi++){
    const q = e.qs[qi]; if(!ans[qi].trim()) continue;
    const extra = [].concat(...(q.criteria || []).map(c => (c.any || []).map(x => String(x).toLowerCase().replace(/[^a-z0-9\- ]/g, ''))), relWords(q.q), q.ungraded ? REL_REFLECT : []);
    const bad = relevanceProblem(ans[qi], {minWords:q.ungraded ? 3 : 2, guess:false, prompt:q.q, vocab:relVocab(L, extra)});
    if(bad) return rejectText('exit q' + (qi + 1), L, 'Question ' + (qi + 1) + ': ' + bad);
  }
  st.exitDraft = ans;
  st.exit = e.qs.map((q, qi) => {
    if(q.ungraded) return {status:'pass'};
    const g = gradeExplain({criteria:q.criteria}, ans[qi], 2);
    applyCells(q.cells, g.status === 'miss' ? 'failure' : 'success', g.status === 'pass' ? 1 : g.status === 'partial' ? 0.3 : 1, 'exit ' + L + ' q' + (qi+1));
    return {status:g.status, model:q.model};
  });
  telem('exit-submit', {L, results:st.exit.map(r => r.status)});
  return {ok:true};
}
function opRouting(L, cfg, jdk, pred){
  const err = canAct(L, 'learn'); if(err) return {error:err};
  if(!ROUTING[cfg] || !['21','25'].includes(jdk) || !['BC','BCPQC','JDK built-in'].includes(pred)) return {error:'Bad prediction.'};
  const r = lp(L).routing; r.pred = r.pred || {}; r.shown = r.shown || {};
  const k = cfg + jdk; if(r.shown[k]) return {ok:true};
  r.cfg = cfg; r.jdk = jdk; r.pred[k] = pred; r.shown[k] = true;
  const ok = pred === ROUTING[cfg].ans[jdk];
  observe('B-02', 'L2', ok ? 'success' : 'failure', 0.3, 'routing prediction ' + k);
  telem('routing-predict', {cfg:k, ok});
  return {ok:true};
}
function opTemplate(key){
  const t = TEMPLATES[key]; if(!t) return {error:'No such example.'};
  S.tplSeen = S.tplSeen || {};
  if(S.tplSeen[key]) return {ok:true};
  if(!selfCheck(t).pass) return {error:'This example is being reviewed.'};
  S.tplSeen[key] = Date.now();
  observe(key.split('|')[0], 'L2', 'success', 0.3, 'plan template ' + key);
  telem('plan-action', {kind:'template', key});
  return {ok:true};
}

/* ---------- session protection: what leaving the window drops ---------- */
function describeWork(L, scope){
  if(scope === 'course'){
    const started = LESSON_ORDER.filter(x => S.les[x]);
    return started.length ? 'all progress in ' + started.map(x => 'Lesson ' + LESSONS[x].n).join(', ') + ', and the skill record' : 'nothing yet';
  }
  const st = S.les[L]; if(!st) return 'nothing yet';
  if(scope === 'part') return unitLabel(L, frontierUnit(L)) + ' (finished parts are kept)';
  if(scope === 'exercise'){
    if(['practice', 'diagnose', 'create'].includes(st.step)){ const ex = currentExercise(); return ex ? 'Lesson ' + LESSONS[L].n + ' exercise ' + ex.id + ' (' + ex.title + ')' : 'nothing yet'; }
    return 'Lesson ' + LESSONS[L].n + ', ' + STEP_PLAIN[st.step].label + ': unsubmitted answers';
  }
  const tried = Object.values(st.ex).filter(r => r.attempts).length;
  const code = LESSONS[L].exercises.filter(e => e.kind === 'code' && st.ex[e.id] && st.ex[e.id].draft !== e.starter).length;
  return 'Lesson ' + LESSONS[L].n + ' up to ' + STEP_PLAIN[st.step].label + ': ' + tried + ' exercise' + (tried === 1 ? '' : 's') + ' answered' + (code ? ', ' + code + ' code draft' + (code === 1 ? '' : 's') : '') + (st.hook.text ? ', the prediction' : '');
}
/* Checkpoints for scope 'part'. The units of a lesson, in order, are: the Hook, each Learn part,
   Practice, Diagnose, Build and the Exit ticket. A finished unit is a checkpoint and is never cleared.
   Leaving the window restarts the first unfinished unit from its beginning. */
const SCOPES = ['exercise', 'part', 'lesson', 'course'];
function frontierUnit(L){
  const st = lp(L), les = LESSONS[L]; refreshDone(L);
  if(!st.done.hook) return {step:'hook'};
  for(let pi = 0; pi < les.parts.length; pi++){ const ck = st.checks[les.parts[pi].id]; if(!(ck && ck.submitted)) return {step:'learn', part:pi}; }
  for(const step of ['practice', 'diagnose', 'create']) if(!st.done[step]) return {step};
  if(!st.done.exit) return {step:'exit'};
  return null;
}
function unitLabel(L, u){
  const les = LESSONS[L];
  if(!u) return 'nothing (the lesson is finished)';
  if(u.step === 'learn') return 'Lesson ' + les.n + ', Learn part ' + (u.part + 1) + ' (' + les.parts[u.part].title + ')';
  return 'Lesson ' + les.n + ', ' + STEP_PLAIN[u.step].label;
}
function resetPart(L){
  const st = lp(L), les = LESSONS[L], u = frontierUnit(L);
  if(!u) return;
  if(u.step === 'hook'){ st.hook = {}; }
  else if(u.step === 'learn'){ delete st.checks[les.parts[u.part].id]; st.part = u.part; }
  else if(u.step === 'exit'){ st.exitDraft = {}; }
  else {
    const exs = exercisesFor(L, u.step);
    exs.forEach(ex => { st.ex[ex.id] = newRecord(ex); });
    if(exs[0]) st.cur[u.step] = exs[0].id;
  }
  st.step = u.step;     // the student is taken back to the start of the unfinished part
  refreshDone(L);
}
function clearCurrentWork(L){
  const st = lp(L);
  if(st.step === 'hook' && !st.hook.revealed){ st.hook.text = ''; delete st.hook.vote; }
  else if(st.step === 'learn'){ const p = LESSONS[L].parts[st.part]; const ck = p && st.checks[p.id]; if(ck && !ck.submitted) ck.ans = {}; }
  else if(st.step === 'exit'){ if(!st.exit) st.exitDraft = {}; }
  else {
    const ex = currentExercise();
    if(ex && st.ex[ex.id]){ const old = st.ex[ex.id], fresh = newRecord(ex); fresh.attempts = old.attempts; fresh.status = old.status; fresh.result = old.result; fresh.model = old.model; st.ex[ex.id] = fresh; }
  }
}
function secureApplies(){
  const c = SETTINGS.secure || {};
  if(c.exempt || !c.resetOnLeave) return false;
  const les = LESSONS[S.lesson]; if(!les || les.placeholder || !lessonOpen(S.lesson)) return false;
  const st = S.les[S.lesson];
  return !!(c.steps || {})[st ? st.step : 'hook'];
}
/* t lets the browser and the server apply the same restart exactly once. */
function opLeft(via, t){
  S.integrity = S.integrity || [];
  t = Number.isFinite(t) ? t : Date.now();
  if(S.integrity.some(x => x.kind === 'left-window' && x.t === t)) return {ok:true, duplicate:true};
  if(S.paused || !secureApplies()) return {ok:true, ignored:true};
  const c = SETTINGS.secure, L = S.lesson, scope = SCOPES.includes(c.scope) ? c.scope : 'part', st = S.les[L];
  const e = {t, kind:'left-window', via:str(via, 80), lesson:L, step:st ? st.step : 'hook', scope, dropped:describeWork(L, scope)};
  S.integrity.push(e); telem('integrity', e);
  if(scope === 'part'){ resetPart(L); S.restarts = S.restarts || {}; S.restarts[L] = (S.restarts[L] || 0) + 1; }
  else if(scope === 'exercise') clearCurrentWork(L);
  else if(scope === 'lesson'){ delete S.les[L]; S.restarts = S.restarts || {}; S.restarts[L] = (S.restarts[L] || 0) + 1; }
  else {
    const keep = S;
    S = freshState(keep);
    S.arm = keep.arm; S.telemetry = keep.telemetry; S.llm = keep.llm; S.flags = keep.flags; S.introSeen = keep.introSeen;
    S.restarts.course = (S.restarts.course || 0) + 1;
  }
  S.epoch = (S.epoch || 0) + 1; S.secureLock = e;
  return {ok:true, reset:true};
}
function opResume(pendingT, via){
  if(Number.isFinite(pendingT) && !(S.integrity || []).some(x => x.kind === 'left-window' && x.t === pendingT)) opLeft(via || 'left the window (reported late)', pendingT);
  S.secureLock = null; telem('secure-resumed', {});
  return {ok:true};
}
const BLOCK_KINDS = ['paste-blocked', 'cut-blocked', 'copy-blocked', 'drop-blocked', 'bulk-insert-blocked', 'shortcut-blocked'];
function opIntegrity(kind, via, dropped){
  if(!BLOCK_KINDS.includes(kind)) return {error:'Unknown event.'};
  S.integrity = S.integrity || [];
  const st = S.les[S.lesson];
  const e = {t:Date.now(), kind, lesson:S.lesson, step:st ? st.step : 'hook', via:str(via, 80), dropped:str(dropped, 80)};
  S.integrity.push(e); if(S.integrity.length > 2000) S.integrity.splice(0, S.integrity.length - 2000);
  telem('integrity', e);
  return {ok:true};
}
/* Signing out on purpose is not leaving the window: protection pauses until the next sign-in. */
function opPause(){ S.paused = true; telem('secure-paused', {}); return {ok:true}; }
function opUnpause(){ S.paused = false; return {ok:true}; }

/* ---------- navigation and drafts: the only fields the browser may set directly ---------- */
function opUi(p){
  if(!p || typeof p !== 'object') return {ok:true};
  if(typeof p.mode === 'string' && MODES[p.mode]) S.mode = p.mode;
  if(p.introSeen === true) S.introSeen = true;
  if(typeof p.lesson === 'string' && LESSONS[p.lesson]) S.lesson = p.lesson;
  const L = p.les && typeof p.les.L === 'string' ? p.les.L : null, u = p.les;
  if(!L || !LESSONS[L] || LESSONS[L].placeholder || !lessonOpen(L)) return {ok:true};
  const les = LESSONS[L], st = lp(L); refreshDone(L);
  if(typeof u.step === 'string' && stepIndex(u.step) >= 0 && stepOpen(L, u.step)) st.step = u.step;
  if(isInt(u.part, les.parts.length) && (u.part === 0 || (st.checks[les.parts[u.part-1].id] || {}).submitted)) st.part = u.part;
  if(u.cur && typeof u.cur === 'object') Object.keys(u.cur).forEach(step => { if(exercisesFor(L, step).some(e => e.id === u.cur[step])) st.cur[step] = u.cur[step]; });
  if(Number.isInteger(u.board) && u.board >= 0 && u.board <= 6) st.board = u.board;
  if(u.routing && typeof u.routing === 'object'){ if(ROUTING[u.routing.cfg]) st.routing.cfg = u.routing.cfg; if(['21','25'].includes(u.routing.jdk)) st.routing.jdk = u.routing.jdk;
    if(u.routing.pred && typeof u.routing.pred === 'object'){ st.routing.pred = st.routing.pred || {}; st.routing.shown = st.routing.shown || {}; Object.keys(u.routing.pred).forEach(k => { if(/^[ABC](21|25)$/.test(k) && !st.routing.shown[k] && ['BC','BCPQC','JDK built-in'].includes(u.routing.pred[k])) st.routing.pred[k] = u.routing.pred[k]; }); } }
  if(u.hook && !st.hook.revealed){ if(typeof u.hook.text === 'string') st.hook.text = str(u.hook.text, 4000); if(les.hook.vote && isInt(u.hook.vote, les.hook.vote.opts.length)) st.hook.vote = u.hook.vote; }
  if(u.ex && typeof u.ex === 'object') Object.keys(u.ex).forEach(id => {
    const ex = les.exercises.find(e => e.id === id); if(!ex) return;
    const rec = st.ex[id] || (st.ex[id] = newRecord(ex));
    if(u.ex[id].answer !== undefined) rec.answer = cleanAnswer(ex, u.ex[id].answer);
    if(ex.kind === 'code' && typeof u.ex[id].draft === 'string') rec.draft = str(u.ex[id].draft, MAX_CODE);
  });
  if(u.checks && typeof u.checks === 'object') les.parts.forEach((part, pi) => {
    const a = u.checks[part.id]; if(!a || typeof a !== 'object') return;
    const ck = st.checks[part.id] || (st.checks[part.id] = {ans:{}});
    if(ck.submitted) return;
    const ans = {}; part.checks.forEach((q, qi) => { if(isInt(a[qi], q.opts.length)) ans[qi] = a[qi]; }); ck.ans = ans;
  });
  if(u.exitDraft && typeof u.exitDraft === 'object' && !st.exit){ const d = {}; les.exit.qs.forEach((q, qi) => { if(typeof u.exitDraft[qi] === 'string') d[qi] = str(u.exitDraft[qi]); }); st.exitDraft = d; }
  return {ok:true};
}

/* ---------- tutor turns are generated in the browser and stored with the learner ---------- */
function opTutorTurn(rec){
  if(!rec || typeof rec !== 'object' || !MODES[rec.mode]) return {error:'Bad turn.'};
  const clean = {ts:Date.now(), lesson:LESSONS[rec.lesson] ? rec.lesson : S.lesson, step:str(rec.step, 20), mode:rec.mode, trigger:str(rec.trigger, 60), q:str(rec.q, 1000), raw:str(rec.raw, 4000), delivered:str(rec.delivered, 4000), filter:rec.filter === 'passed' ? 'passed' : 'replaced_with_fallback', violations:(Array.isArray(rec.violations) ? rec.violations : []).slice(0, 10).map(v => str(v, 80)), auto:!!rec.auto, system_prompt_version:str(rec.system_prompt_version, 20), model:str(rec.model, 40)};
  S.llm = S.llm || []; S.llm.push(clean); if(S.llm.length > 200) S.llm.splice(0, S.llm.length - 200);
  telem('llm', {mode:clean.mode, trigger:clean.trigger, filter:clean.filter});
  return {ok:true};
}

const OPS = {hook:opHookCommit, check:opCheck, retryCheck:opRetryCheck, attempt:opAttempt, exit:opExit, routing:opRouting, template:opTemplate,
  left:opLeft, resume:opResume, integrity:opIntegrity, pause:opPause, unpause:opUnpause, ui:opUi, tutor:opTutorTurn};

/* ---------- what a student's browser may see ---------- */
function publicLessons(revealedFor){
  const out = {};
  Object.keys(LESSONS).forEach(L => {
    const les = JSON.parse(JSON.stringify(LESSONS[L]));
    delete les.instr; delete les.bans;
    if(les.hook){ delete les.hook.instr; if(!(revealedFor && revealedFor[L])) delete les.hook.reveal; }
    (les.parts || []).forEach(p => { delete p.instr; p.checks.forEach(q => { delete q.a; delete q.why; }); });
    (les.exercises || []).forEach(ex => {
      ['a', 'criteria', 'model', 'ref', 'checks', 'groups', 'runs', 'passOut', 'instr', 'partialAt', 'passNeed', 'partialRows', 'flag', 'allowBCPQC'].forEach(k => delete ex[k]);
      (ex.blanks || []).forEach(b => { delete b.a; delete b.miss; });
      (ex.rows || []).forEach(row => row.forEach(c => { if(c && typeof c === 'object') delete c.a; }));
      if(ex.mech) delete ex.mech.a;
      (ex.qs || []).forEach(q => delete q.a);
    });
    if(les.exit) les.exit.qs.forEach(q => { delete q.criteria; delete q.model; delete q.cells; });
    out[L] = les;
  });
  return out;
}

/* ---------- the teacher console's view of one learner ---------- */
function learnerRecord(id, arm, minutesAgo){
  const rec = {id, arm, live:false, server:true, ex:{}, checks:{}, flags:Object.assign({}, S.flags || {}), lessons:{}, minutesAgo, S:S.S, F:S.F, seen:S.seen};
  LESSON_ORDER.filter(L => !LESSONS[L].placeholder).forEach(L => {
    const st = S.les[L]; if(!st) return;
    refreshDone(L);
    rec.lessons[L] = {step:st.step, done:!!st.exit};
    LESSONS[L].parts.forEach(p => { const c = st.checks[p.id]; if(c && c.result) rec.checks[L + p.id] = c.wrong ? 'miss' : 'pass'; });
    Object.keys(st.ex).forEach(x => { const r = st.ex[x]; if(r.attempts) rec.ex[L + '.' + x] = {status:r.status, attempts:r.attempts}; });
  });
  const started = LESSON_ORDER.filter(L => S.les[L] && !LESSONS[L].placeholder);
  const cur = S.les[S.lesson] && !LESSONS[S.lesson].placeholder ? S.lesson : (started[started.length - 1] || 'L1');
  rec.current = {L:cur, step:S.les[cur] ? S.les[cur].step : 'hook'};
  const ev = S.integrity || [];
  rec.integ = {resets:ev.filter(x => x.kind === 'left-window').length, pastes:ev.filter(x => /^(paste|cut|copy|drop|bulk-insert)/.test(x.kind)).length, keys:ev.filter(x => x.kind === 'shortcut-blocked').length};
  return rec;
}
