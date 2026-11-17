/* Generated once from the v5 prototype by tools/split_prototype.py; edit here from now on. */
/* ================================================================
   PQC LAB v3 — ENGINE
   Learner model (PFA per concept × Bloom cell, 72 cells), evidence
   rules, lesson gates, plan engine, tutor mode policy, Misuse
   Detector, tiered templates with self-check gate, telemetry.
   ================================================================ */

/* ---------- 1. PFA parameters (v1 hand-picked; tune on pilot data) ---------- */
const PFA = {};
Object.keys(CONCEPTS).forEach(k => {
  const foundation = CONCEPTS[k].pre.length === 0;
  const silentKind = ['C-01','C-02','C-03'].includes(k);
  PFA[k] = { beta:-1.0, gamma: foundation ? 1.5 : 1.0, rho: silentKind ? 1.2 : 1.0 };
});
let SOLID = 0.60, BUILDING = 0.40;
SETTINGS = defaultSettings();
function applySettings(){ SOLID = SETTINGS.thresholds.solid; BUILDING = SETTINGS.thresholds.building; }

/* ---------- 2. State ---------- */
function freshState(keep){
  const s = {
    arm: SETTINGS.arm, preview: keep ? keep.preview : false, introSeen: keep ? keep.introSeen : false,
    lesson:'L1', tab:'matrix', mode:'explain',
    S:{}, F:{}, seen:{}, les:{},
    telemetry:[], llm:[], turns:[],
    style:{active:0, visual:0},
    focus:null,
    /* session protection: carried over every reset so the record of resets survives them */
    integrity: keep && keep.integrity ? keep.integrity : [],
    restarts: keep && keep.restarts ? keep.restarts : {},
    seed: keep && keep.seed ? keep.seed : (Math.floor(Math.random() * 1e9) + 1),
    armed:false, secureLock:null,
  };
  Object.keys(CONCEPTS).forEach(k => {
    s.S[k] = {L2:0,L3:0,L4:0,L6:0};
    s.F[k] = {L2:0,L3:0,L4:0,L6:0};
    s.seen[k] = {L2:false,L3:false,L4:false,L6:false};
  });
  return s;
}
let S = freshState();

function lp(L){
  if(!S.les[L]) S.les[L] = {step:'hook', done:{}, hook:{}, part:0, checks:{}, ex:{}, cur:{}, exit:null, board:0, routing:{}};
  return S.les[L];
}
function sig(x){ return 1/(1+Math.exp(-x)); }

/* ---------- 3. Mastery ---------- */
function pCell(K, lv){ const a = PFA[K]; return sig(a.beta + a.gamma*S.S[K][lv] - a.rho*S.F[K][lv]); }
function pAll(K){
  let num = 0, den = 0;
  LEVELS.forEach(lv => { num += LEVEL_INFO[lv].w * pCell(K, lv); den += LEVEL_INFO[lv].w; });
  return num/den;
}
function seenAny(K){ return LEVELS.some(lv => S.seen[K][lv]); }
function band(p){ return p < BUILDING ? 'building' : p < SOLID ? 'strength' : 'solid'; }
/* Escalation: a cell is "ready" for targeted remediation when the level to its left is Solid.
   It never blocks the linear lesson (both arms do the full arc); it steers the plan engine. */
function cellReady(K, lv){ const i = LEVELS.indexOf(lv); return i === 0 || pCell(K, LEVELS[i-1]) >= SOLID; }

function observe(K, lv, kind, w, reason){
  if(!CONCEPTS[K] || !LEVEL_INFO[lv]) return;
  const weight = (w || 1) * LEVEL_INFO[lv].w;
  if(kind === 'success') S.S[K][lv] += weight; else S.F[K][lv] += weight;
  S.seen[K][lv] = true;
  telem('observe', {K, lv, kind, w:+weight.toFixed(2), reason, p:+pCell(K,lv).toFixed(3)});
}
function applyCells(cells, kind, factor, reason){
  (cells || []).forEach(([K, lv, w]) => observe(K, lv, kind, (w || 1) * factor, reason));
}

/* ---------- 4. Lesson gates & step unlocking ---------- */
function gateStatus(L){
  const cells = SETTINGS.gates[L];
  if(!cells || !cells.length) return {open:true, rows:[]};
  const rows = cells.map(([K, lv, th]) => ({K, lv, th, p:pCell(K, lv), ok:pCell(K, lv) >= th}));
  return {open: rows.every(r => r.ok), rows};
}
function gateLabel(L){
  const cells = SETTINGS.gates[L];
  if(!cells || !cells.length) return 'no gate';
  return cells.map(([K, lv, th]) => K + '·' + lv + ' ≥ ' + th.toFixed(2)).join(', ');
}
function lessonOpen(L){
  const les = LESSONS[L];
  if(les.placeholder) return false;
  if(S.preview) return true;
  const rel = SETTINGS.release[L];
  if(rel === 'closed') return false;
  if(rel === 'open') return true;
  return gateStatus(L).open;
}
function stepIndex(id){ return STEPS.findIndex(s => s.id === id); }
function stepOpen(L, id){
  if(S.preview) return true;
  const i = stepIndex(id);
  if(i === 0) return true;
  return !!lp(L).done[STEPS[i-1].id];
}
function exercisesFor(L, step){ return LESSONS[L].exercises.filter(e => e.step === step); }
function refreshDone(L){
  const st = lp(L), les = LESSONS[L];
  st.done.hook = !!st.hook.revealed;
  st.done.learn = les.parts.every(p => st.checks[p.id] && st.checks[p.id].submitted);
  ['practice','diagnose','create'].forEach(step => {
    st.done[step] = exercisesFor(L, step).every(e => st.ex[e.id] && st.ex[e.id].attempts > 0);
  });
  st.done.exit = !!st.exit;
}
function lessonDone(L){ return !!(S.les[L] && S.les[L].exit); }

/* ---------- 5. Plan engine (Arm T) ---------- */
function latticeDepth(K){ const pre = CONCEPTS[K].pre; return pre.length ? 1 + Math.max(...pre.map(latticeDepth)) : 0; }
function partFor(K){
  for(const L of LESSON_ORDER){
    const les = LESSONS[L]; if(les.placeholder) continue;
    const part = les.parts.find(p => p.concepts.includes(K));
    if(part) return {L, part};
  }
  return null;
}
function exerciseFor(L, K, lv){
  const les = LESSONS[L]; if(!les || les.placeholder) return null;
  const st = lp(L);
  const cands = les.exercises.filter(e => e.cells.some(c => c[0] === K && c[1] === lv));
  return cands.find(e => !st.ex[e.id] || st.ex[e.id].status !== 'pass') || cands[0] || null;
}
function generatePlan(){
  const L = S.lesson, les = LESSONS[L];
  if(les.placeholder) return {empty:true, rationale:'This lesson is not authored yet.'};
  if(!lessonOpen(L)) return gatePlan(L);
  const cells = [];
  les.concepts.forEach(K => LEVELS.forEach(lv => { if(S.seen[K][lv]) cells.push({K, lv, p:pCell(K, lv)}); }));
  const weak = cells.filter(c => c.p < SOLID);
  if(cells.length === 0) return {empty:true, rationale:'No evidence yet for this lesson. The plan appears after your first check or exercise.'};
  if(weak.length === 0) return {empty:true, advance:true, rationale:'Every cell you have worked on in this lesson is Solid. Keep going with the lesson arc.'};
  weak.sort((a, b) => (Math.abs(a.p - b.p) > 0.01 ? a.p - b.p : latticeDepth(a.K) - latticeDepth(b.K)));
  const f = weak.find(c => cellReady(c.K, c.lv)) || weak[0];
  S.focus = f.K + '|' + f.lv;
  const gaps = CONCEPTS[f.K].pre.filter(pk => seenAny(pk) && pAll(pk) < BUILDING).map(pk => ({K:pk, p:pAll(pk)}));
  const actions = [];
  if(gaps.length){
    const g = gaps[0], loc = partFor(g.K);
    if(loc) actions.push({kind:'part', tier:'Prereq', L:loc.L, part:loc.part.id, K:g.K, title:'Revisit the prerequisite ' + g.K + ' · ' + CONCEPTS[g.K].name, desc:'Lesson ' + LESSONS[loc.L].n + ', ' + loc.part.title + '.', min:6});
  }
  const tier = f.p < 0.20 ? 1 : f.p < 0.50 ? 2 : 3;
  const tplKey = f.K + '|' + tier;
  if(TEMPLATES[tplKey]) actions.push({kind:'template', tier:'Tier ' + tier, key:tplKey, K:f.K, title:TEMPLATES[tplKey].title, desc:TIER_DESC[tier], min:5 + tier*3});
  const loc = les.parts.find(p => p.concepts.includes(f.K));
  if(loc && actions.length < 3) actions.push({kind:'part', tier:'Re-teach', L, part:loc.id, K:f.K, title:'Re-read "' + loc.title + '" explained another way', desc:'Shows the alternative explanation for this part.', min:4});
  const ex = exerciseFor(L, f.K, f.lv);
  if(ex && actions.length < 3) actions.push({kind:'exercise', tier:'Retry', L, ex:ex.id, step:ex.step, K:f.K, title:'Retry ' + ex.id + ' · ' + ex.title, desc:LEVEL_INFO[f.lv].name + '-level evidence for ' + f.K + '.', min:5});
  return {focus:f, gaps, actions:actions.slice(0,3),
    rationale:'Lowest cell in this lesson: ' + f.K + ' at ' + f.lv + ' (' + LEVEL_INFO[f.lv].name + '), P = ' + f.p.toFixed(2) + '.' + (gaps.length ? ' A prerequisite is still Building, so it comes first.' : '')};
}
/* Locked lesson: aim the plan at the gate cells, using exercises from lessons already open. */
function gatePlan(L){
  const rows = gateStatus(L).rows.filter(r => !r.ok).sort((a, b) => a.p - b.p);
  if(!rows.length) return {empty:true, advance:true, rationale:'Gate met.'};
  const f = rows[0], actions = [];
  S.focus = f.K + '|' + f.lv;
  const tier = f.p < 0.20 ? 1 : f.p < 0.50 ? 2 : 3, tplKey = f.K + '|' + tier;
  if(TEMPLATES[tplKey]) actions.push({kind:'template', tier:'Tier ' + tier, key:tplKey, K:f.K, title:TEMPLATES[tplKey].title, desc:TIER_DESC[tier], min:5 + tier*3});
  rows.forEach(r => LESSON_ORDER.forEach(PL => {
    const pl = LESSONS[PL];
    if(actions.length >= 3 || PL === L || pl.placeholder || !lessonOpen(PL)) return;
    const st = S.les[PL], ex = pl.exercises.find(e => e.cells.some(c => c[0] === r.K && c[1] === r.lv) && !(st && st.ex[e.id] && st.ex[e.id].status === 'pass'));
    if(ex && !actions.some(a => a.ex === ex.id && a.L === PL)) actions.push({kind:'exercise', tier:'Retry', L:PL, ex:ex.id, step:ex.step, K:r.K, title:'Lesson ' + pl.n + ' ' + ex.id + ' · ' + ex.title, desc:'Counts towards opening Lesson ' + les_n(L) + '.', min:5});
  }));
  const unfinished = LESSON_ORDER.find(PL => PL !== L && !LESSONS[PL].placeholder && lessonOpen(PL) && !lessonDone(PL) && LESSON_ORDER.indexOf(PL) < LESSON_ORDER.indexOf(L));
  if(unfinished && !actions.some(a => a.kind === 'exercise')) actions.unshift({kind:'lesson', L:unfinished, K:f.K, title:'Continue Lesson ' + LESSONS[unfinished].n, desc:'The skills that open this lesson are taught there.', min:20});
  return {focus:f, gaps:[], gate:true, actions:actions.slice(0, 3), rationale:'Lesson ' + les_n(L) + ' is locked. Lowest gate cell: ' + f.K + ' at ' + f.lv + ', P = ' + f.p.toFixed(2) + ' (needs ' + f.th.toFixed(2) + ').'};
}
function les_n(L){ return LESSONS[L].n; }
const TIER_DESC = {1:'Worked example with one Socratic question.', 2:'Scaffolded skeleton: fill the blanks that need this concept.', 3:'Your kind of mistake beside a corrected version.'};

/* ---------- 6. Tiered templates + self-check gate ---------- */
const TEMPLATES = {
  'A-04|1':{title:'Worked example: parameter sets and lengths', tier:1, code:
`Security.addProvider(new BouncyCastleProvider());
KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");
kpg.initialize(MLKEMParameterSpec.ml_kem_768, new SecureRandom());
KeyPair kp = kpg.generateKeyPair();
KeyGenerator enc = KeyGenerator.getInstance("ML-KEM", "BC");
enc.init(new KEMGenerateSpec(kp.getPublic(), "AES", 256), new SecureRandom());
byte[] ct = ((SecretKeyWithEncapsulation) enc.generateKey()).getEncapsulation();
if (ct.length != 1088) throw new IllegalStateException("ciphertext is " + ct.length + " bytes");`,
    socratic:'ml_kem_768 produces a 1088-byte ciphertext. What would you expect from ml_kem_512, and why?'},
  'C-01|1':{title:'Worked example: the length check in action', tier:1, code:
`static final int ML_KEM_768_CT = 1088;   // FIPS 203
byte[] ct = sent.getEncapsulation();
System.out.println("ciphertext = " + ct.length + " bytes");
if (ct.length != ML_KEM_768_CT) throw new IllegalStateException("wrong parameter set");`,
    socratic:'The if-check on the last line is the concept in action. What would happen if you replaced it with an assert?'},
  'B-03|2':{title:'Scaffold: choose the spec', tier:2, code:
`Security.addProvider(new BouncyCastleProvider());
KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");
kpg.initialize(MLKEMParameterSpec.____________, new SecureRandom());   // category 3
KeyPair kp = kpg.generateKeyPair();`,
    socratic:'Which constant gives category 3, and which output line proves it?'},
  'B-01|2':{title:'Scaffold: register before you ask', tier:2, code:
`Security.____________(new BouncyCastleProvider());
KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");
System.out.println("provider = " + kpg.getProvider().getName());`,
    socratic:'What does the JVM do with "BC" if this first line is missing?'},
  'B-05|1':{title:'Worked example: both sides of the KEM', tier:1, code:
`KeyGenerator enc = KeyGenerator.getInstance("ML-KEM", "BC");
enc.init(new KEMGenerateSpec(kp.getPublic(), "AES", 256), new SecureRandom());   // Alice: ek only
SecretKeyWithEncapsulation sent = (SecretKeyWithEncapsulation) enc.generateKey();
KeyGenerator dec = KeyGenerator.getInstance("ML-KEM", "BC");
dec.init(new KEMExtractSpec(kp.getPrivate(), sent.getEncapsulation(), "AES", 256)); // Bob: dk + c`,
    socratic:'Which key does each side use, and which arguments must be identical on both lines?'},
  'C-02|3':{title:'Side by side: label vs substance', tier:3, flagged:'SF-05',
    before:
`// your kind of code (flagged SF-05)
Security.addProvider(new BouncyCastlePQCProvider());
KeyPairGenerator kpg = KeyPairGenerator.getInstance("Kyber", "BCPQC");
kpg.initialize(KyberParameterSpec.kyber768);
KeyPair kp = kpg.generateKeyPair();
System.out.println(kp.getPublic().getAlgorithm());   // a reassuring label`,
    after:
`// corrected
Security.addProvider(new BouncyCastleProvider());
KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");
kpg.initialize(MLKEMParameterSpec.ml_kem_768, new SecureRandom());
KeyPair kp = kpg.generateKeyPair();
System.out.println(kpg.getProvider().getName());              // "BC" — verified
System.out.println(kp.getPublic() instanceof MLKEMKey);        // true — BC will accept it`,
    socratic:'The first version prints a reassuring label. Which two lines in the corrected version would have caught the problem earlier?'},
  'D-01|3':{title:'Side by side: a catch that reports and stops', tier:3, flagged:'SWALLOW',
    before:
`try {
    recv = dec.generateKey();
} catch (Exception e) { }`,
    after:
`try {
    recv = dec.generateKey();
} catch (GeneralSecurityException e) {
    System.err.println("KEM failure: " + e.getClass().getSimpleName());
    status = 1;
}`,
    socratic:'In the first version, what does recv hold after a failure, and who finds out?'},
};
function selfCheck(t){
  if(t.tier === 3){
    const before = detect(t.before, {lesson:'*'}).map(f => f.cls);
    const after = detect(t.after, {lesson:'*'});
    if(after.length) return {pass:false, why:'corrected version still flagged: ' + after.map(f => f.cls).join(', ')};
    if(t.flagged && !before.includes(t.flagged)) return {pass:false, why:'the "before" example does not show ' + t.flagged};
    return {pass:true};
  }
  const flags = detect(t.code, {lesson:'*', fragment:true});
  return flags.length ? {pass:false, why:'flagged: ' + flags.map(f => f.cls).join(', ')} : {pass:true};
}

/* ---------- 7. Misuse Detector (rule-based; same rules for student code and generated artefacts) ---------- */
const RULES = {
  'BM-1':{desc:'Missing provider registration', sev:'loud'},
  'BM-2':{desc:'Unpinned getInstance: the provider list decides', sev:'silent'},
  'M1':  {desc:'Constant-seeded random number generator', sev:'silent'},
  'SF-01':{desc:'Parameter set downgraded below ML-KEM-768', sev:'silent'},
  'SF-05':{desc:'Legacy Kyber/BCPQC path used for ML-KEM', sev:'silent'},
  'KDF': {desc:'KDF arguments differ between sender and receiver', sev:'silent'},
  'LEAK':{desc:'Secret key bytes printed', sev:'hygiene'},
  'SWALLOW':{desc:'Exception caught and ignored', sev:'hygiene'},
  'ASSERT':{desc:'assert used as a security check (off without -ea)', sev:'silent'},
};
function stripComments(code){ return code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' '); }
function detect(code, opts){
  opts = opts || {};
  const c = stripComments(code || ''), flags = [];
  const add = cls => { if(!flags.some(f => f.cls === cls)) flags.push({cls, ...RULES[cls]}); };
  const registersBC = /(addProvider|insertProviderAt)\s*\(\s*new\s+BouncyCastleProvider/.test(c);
  if(!opts.fragment && /getInstance\s*\([^)]*"BC"\s*\)/.test(c) && !registersBC) add('BM-1');
  if(/getInstance\s*\(\s*"ML-KEM[^"]*"\s*\)/.test(c)) add('BM-2');
  if(/setSeed\s*\(\s*-?\d/.test(c) || /new\s+SecureRandom\s*\(\s*(new\s+byte|"|-?\d)/.test(c)) add('M1');
  if(/ml_kem_512/.test(c) && !/ml_kem_768/.test(c)) add('SF-01');
  const usesBCPQC = /BouncyCastlePQCProvider|"BCPQC"/.test(c);
  if(/KyberParameterSpec|getInstance\s*\(\s*"Kyber"/.test(c)) add('SF-05');
  else if(usesBCPQC && !opts.allowBCPQC) add('SF-05');
  else if(usesBCPQC && opts.allowBCPQC && !/removeProvider\s*\(\s*"BCPQC"\s*\)/.test(c)) add('SF-05');
  const g = c.match(/KEMGenerateSpec\s*\([^;]*?"AES"\s*,\s*(\d+)/), x = c.match(/KEMExtractSpec\s*\([^;]*?"AES"\s*,\s*(\d+)/);
  if(g && x && g[1] !== x[1]) add('KDF');
  if(/(toHexString|Arrays\.toString|encodeToString)\s*\([^;]*getEncoded/.test(c) ||
     /print(ln|f)?\s*\([^;]*\+\s*[\w.()]*getEncoded\s*\(\s*\)\s*[)+;]/.test(c) ||
     /print(ln)?\s*\(\s*[\w.()]*getEncoded\s*\(\s*\)\s*\)/.test(c)) add('LEAK');
  const raw = code || '';
  const catchRe = /catch\s*\(\s*([A-Za-z_.|\s]+?)\s+\w+\s*\)\s*\{\s*((?:\/\*[\s\S]*?\*\/|\/\/[^\n]*|\s)*)\}/g;
  let m; while((m = catchRe.exec(raw))){ if(!/DestroyFailedException/.test(m[1])) add('SWALLOW'); }
  if(/\bassert\b/.test(c)) add('ASSERT');
  return flags;
}

/* ---------- 8. Grading ---------- */
function norm(v){ return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' '); }
function rx(s, flags){ try { return new RegExp(s, flags); } catch(e){ return /$^/; } }
function criterionHit(cr, text){
  if(cr.all) return cr.all.every(s => rx(s, 'i').test(text));
  return (cr.any || []).some(s => rx(s, 'i').test(text));
}
function gradeExplain(ex, text, minLen){
  const t = (text || '').trim();
  if(t.length < (minLen || 15)) return {status:'miss', items:[], note:'Write at least a full sentence before submitting.'};
  const items = ex.criteria.map(cr => ({label:cr.label, ok:criterionHit(cr, t)}));
  const hits = items.filter(i => i.ok).length;
  const need = ex.passNeed || ex.criteria.length;
  const part = ex.partialAt || Math.max(1, Math.ceil(ex.criteria.length / 2));
  return {status: hits >= need ? 'pass' : hits >= part ? 'partial' : 'miss', items};
}
function gradeTable(ex, ans){
  let total = 0, right = 0, rowsRight = 0;
  const marks = {};
  ex.rows.forEach((row, ri) => {
    let rowOk = true;
    row.forEach((cell, ci) => {
      if(typeof cell === 'object'){
        total++;
        const ok = norm(ans[ri + ':' + ci]) === norm(cell.a);
        marks[ri + ':' + ci] = ok; if(ok) right++; else rowOk = false;
      }
    });
    if(rowOk) rowsRight++;
  });
  const status = right === total ? 'pass' : (ex.partialRows ? rowsRight >= ex.partialRows : right >= Math.ceil(total/2)) ? 'partial' : 'miss';
  return {status, marks, note: right + ' of ' + total + ' correct.'};
}
function gradeFill(ex, ans){
  const misses = [], marks = {};
  let right = 0;
  ex.blanks.forEach((b, i) => {
    const v = ans[i] || '';
    const ok = b.a.some(a => norm(a) === norm(v));
    marks[i] = ok; if(ok) right++;
    else if(b.miss && b.miss[v]) misses.push(b.miss[v]);
  });
  const status = right === ex.blanks.length ? 'pass' : right >= Math.ceil(ex.blanks.length / 2) ? 'partial' : 'miss';
  return {status, marks, misses};
}
function composeFill(ex, ans){
  let i = 0;
  return ex.code.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const v = ans[+n] || '';
    return v.startsWith('(') ? '\u0000' : v;
  }).replace(/,\s*\u0000/g, '').replace(/\u0000/g, '');
}
function gradeMC(ex, ans){
  if(ex.multi){
    const pick = new Set(ans || []), want = new Set(ex.a);
    const right = [...pick].filter(i => want.has(i)).length, wrong = [...pick].filter(i => !want.has(i)).length;
    const status = (right === want.size && wrong === 0) ? 'pass' : (right >= Math.ceil(want.size/2) && wrong <= 1) ? 'partial' : 'miss';
    return {status, note: right + ' of ' + want.size + ' found' + (wrong ? ', ' + wrong + ' incorrect pick' + (wrong > 1 ? 's' : '') : '') + '.'};
  }
  return {status: ans === ex.a ? 'pass' : 'miss'};
}
function gradeFind(ex, ans){
  const picks = new Set(ans.lines || []);
  const all = new Set(ex.groups.flat());
  const groupsHit = ex.groups.filter(g => g.some(n => picks.has(n))).length;
  const wrong = [...picks].filter(n => !all.has(n)).length;
  const linesOK = groupsHit === ex.groups.length && wrong === 0;
  let mechOK, mechPartial = false;
  if(ex.mech.multi){
    const p = new Set(ans.mech || []), w = new Set(ex.mech.a);
    const r = [...p].filter(i => w.has(i)).length, x = [...p].filter(i => !w.has(i)).length;
    mechOK = r === w.size && x === 0; mechPartial = r > 0 && x <= 1;
  } else mechOK = ans.mech === ex.mech.a;
  const status = linesOK && mechOK ? 'pass' : (linesOK || mechOK || mechPartial || groupsHit > 0) ? 'partial' : 'miss';
  return {status, linesOK, mechOK, groupsHit, wrong};
}
function gradeMulti(ex, ans){
  const right = ex.qs.filter((q, i) => ans[i] === q.a).length;
  return {status: right === ex.qs.length ? 'pass' : right >= Math.ceil(ex.qs.length/2) ? 'partial' : 'miss', right};
}
function gradeCode(ex, code, L){
  const c = stripComments(code || '');
  const res = ex.checks.map(ch => ({label:ch.label, ok:runCheck(ch, c, code)}));
  const flags = detect(code, {lesson:L, allowBCPQC:!!ex.allowBCPQC});
  const right = res.filter(r => r.ok).length;
  const status = (right === res.length && flags.length === 0) ? 'pass' : right >= Math.ceil(res.length * 0.6) ? 'partial' : 'miss';
  return {status, res, flags};
}
function runCheck(ch, c){
  if(ch.special === 'pinned' || ch.special === 'pinnedOrConst'){
    const calls = [...c.matchAll(/getInstance\s*\(\s*"ML-KEM[^"]*"\s*(?:,\s*([^)]*))?\)/g)];
    if(!calls.length) return false;
    return calls.every(m => {
      const arg = (m[1] || '').trim();
      if(arg === '"BC"') return true;
      if(ch.special === 'pinnedOrConst') return arg === 'PROVIDER' || arg === '"BCPQC"';
      return false;
    }) && (ch.special !== 'pinnedOrConst' || calls.some(m => (m[1] || '').trim() !== '"BCPQC"'));
  }
  if(ch.special === 'guardFirst'){
    const i = c.search(/encapsulate\s*\(\s*PublicKey/);
    if(i < 0) return false;
    const body = c.slice(i, i + 900);
    const g = body.search(/requireBcMlKem768\s*\(/), k = body.search(/getInstance\s*\(/);
    return g >= 0 && (k < 0 || g < k);
  }
  if(ch.count){ const n = (c.match(rx(ch.count[0], 'g')) || []).length; return n >= ch.count[1]; }
  let ok = true;
  if(ch.re) ok = ok && rx(ch.re).test(c);
  if(ch.all) ok = ok && ch.all.every(s => rx(s).test(c));
  if(ch.none) ok = ok && !ch.none.some(s => rx(s).test(c));
  return ok;
}

/* ---------- 9. Tutor: mode policy per activity, simulation, output filter ---------- */
const MODES = {
  explain:{label:'Explain', desc:'Rephrases the lesson in other words. No code, no untaught APIs.'},
  hint:{label:'Hint', desc:'Names a category of cause. Never the answer or the specific bug.'},
  review:{label:'Code review', desc:'Structural comments on submitted code. No verdict.'},
  socratic:{label:'Socratic', desc:'One diagnostic question. Triggered by a miss or a detector flag.'},
};
function currentExercise(){
  const L = S.lesson, st = lp(L), step = st.step;
  if(!['practice','diagnose','create'].includes(step)) return null;
  const list = exercisesFor(L, step);
  return list.find(e => e.id === st.cur[step]) || list[0] || null;
}
function policyRow(){
  const L = S.lesson, st = lp(L), step = st.step;
  if(step === 'hook' || step === 'learn' || step === 'exit') return step;
  if(step === 'create') return 'D';
  const ex = currentExercise();
  return ex ? ex.type : null;
}
const POLICY_WHY = {
  hook:'Help opens after you write your prediction.',
  learn:'You can ask for an explanation or a hint while you read.',
  A:'You can ask for an explanation. A guiding question appears if an answer misses.',
  B:'You can ask for a hint about the kind of problem. Code review opens after you check your code.',
  C:'Look first: a guiding question opens after your first attempt.',
  D:'This step is done on your own, so help is off.',
  exit:'The exit ticket is done on your own, so help is off.',
};
function policy(){
  const off = why => ({explain:false, hint:false, review:false, socratic:false, why});
  if(S.arm === 'C') return off('Help is not part of this version of the course.');
  const L = S.lesson, les = LESSONS[L];
  if(les.placeholder) return off('This lesson is not available yet.');
  const row = policyRow();
  if(!row) return off('Choose an activity.');
  const st = lp(L), cfg = SETTINGS.policy[row];
  let wrongCheck = false, tried = false, failed = false;
  if(row === 'learn'){ const part = les.parts[st.part] || les.parts[0]; const ck = st.checks[part.id]; wrongCheck = !!(ck && ck.wrong); }
  const ex = currentExercise(), rec = ex && st.ex[ex.id];
  if(rec){ tried = rec.attempts > 0; failed = !!(rec.status && rec.status !== 'pass'); }
  const val = v => v === 'on' || (v === 'afterWrongCheck' && wrongCheck) || (v === 'afterMiss' && failed) || (v === 'afterAttempt' && tried) ||
    (v === 'afterSubmit' && tried && ex && ['fill','code'].includes(ex.kind));
  return {explain:val(cfg.explain), hint:val(cfg.hint), review:val(cfg.review), socratic:val(cfg.socratic), why:POLICY_WHY[row], row};
}
function activeBans(L){
  const st = lp(L);
  const terms = [];
  (SETTINGS.bans[L] || []).forEach(b => {
    const lifted = b.until.some(id => st.ex[id] && st.ex[id].attempts > 0);
    if(!lifted) b.terms.forEach(t => terms.push({t, modes:b.modes}));
  });
  return terms;
}
const FALLBACK = {
  explain:'Which sentence or idea in this part would you like me to put another way?',
  hint:'What does the output or error name: a provider, an algorithm, a parameter type, or a key?',
  review:'Is there a check anywhere in your code that would fail if the parameter set or provider were wrong?',
  socratic:'What would you print to confirm the property you care about actually holds?',
};
function filterReply(mode, text, L){
  const v = [];
  if(/```/.test(text) && mode !== 'review') v.push('code block');
  if(/\bthe answer is\b|\bis correct\b|\bis wrong\b/i.test(text)) v.push('verdict');
  if(/FIPS[- ]?203 compliant/i.test(text)) v.push('compliance claim');
  if(mode === 'socratic' && !/\?\s*$/.test(text.trim())) v.push('not a single question');
  activeBans(L).forEach(b => { if((!b.modes || b.modes.includes(mode)) && text.toLowerCase().includes(b.t)) v.push('slot-5 ban: ' + b.t); });
  return v.length ? {text:FALLBACK[mode], filtered:true, v} : {text, filtered:false, v};
}
function simulateTutor(mode, question){
  const L = S.lesson, les = LESSONS[L], st = lp(L);
  const ex = currentExercise();
  if(mode === 'explain'){
    let part = st.step === 'learn' ? (les.parts[st.part] || les.parts[0]) : null;
    const q = (question || '').toLowerCase();
    const byWord = les.parts.find(p => p.title.toLowerCase().split(/\W+/).some(w => w.length > 4 && q.includes(w)));
    if(byWord) part = byWord;
    if(!part && ex) part = les.parts.find(p => p.concepts.includes(ex.cells[0][0])) || les.parts[0];
    part = part || les.parts[0];
    return 'Another way to see "' + part.title + '": ' + part.reteach;
  }
  if(mode === 'hint') return (ex && ex.hint) || les.hint;
  if(mode === 'socratic') return (ex && ex.soc) || 'What would you expect the output to show if your answer were right, and does it?';
  if(mode === 'review'){
    if(!ex) return FALLBACK.review;
    const rec = st.ex[ex.id] || {};
    const code = ex.kind === 'code' ? (rec.draft || '') : ex.kind === 'fill' ? composeFill(ex, rec.answer || {}) : '';
    const flags = detect(code, {lesson:L, allowBCPQC:!!ex.allowBCPQC, fragment:ex.kind === 'fill'});
    const notes = [];
    if(flags.some(f => f.cls === 'BM-1')) notes.push('Where is the provider registered before the first getInstance that names it?');
    if(flags.some(f => f.cls === 'BM-2')) notes.push('One getInstance call leaves the choice of provider to the provider list.');
    if(flags.some(f => f.cls === 'KDF')) notes.push('Compare the KDF arguments on the sending and receiving lines character by character.');
    if(flags.some(f => f.cls === 'SWALLOW')) notes.push('A catch block with an empty body hides the cause and keeps going.');
    if(flags.some(f => f.cls === 'LEAK')) notes.push('Something prints key material; error paths should print classes, not bytes.');
    if(flags.some(f => f.cls === 'ASSERT')) notes.push('An assert only runs when the JVM has -ea.');
    if(!/getEncapsulation\s*\(\s*\)\s*\.length|ct\.length|CT_LEN/.test(code) && ex.kind === 'code') notes.push('Nothing checks the ciphertext length against the FIPS 203 value.');
    return notes.length ? 'Structural points to look at: ' + notes.join(' ') : 'No structural issues stood out in this pass. Whether it meets the spec is decided by the checks and the Misuse Detector, not by me.';
  }
  return FALLBACK[mode];
}
function askTutor(mode, question, trigger){
  const pol = policy();
  if(!pol[mode]) return null;
  const raw = simulateTutor(mode, question);
  const f = filterReply(mode, raw, S.lesson);
  const rec = {ts:Date.now(), lesson:S.lesson, step:lp(S.lesson).step, mode, trigger:trigger || 'student', q:question || '', raw, delivered:f.text, filter:f.filtered ? 'replaced_with_fallback' : 'passed', violations:f.v, system_prompt_version:'v3.0', model:'sim-1'};
  S.llm.push(rec);
  telem('llm', {mode, trigger:rec.trigger, filter:rec.filter});
  if(typeof onTutorTurn === 'function') onTutorTurn(rec);   // the browser stores the turn with the learner record
  return rec;
}
function autoSocratic(reason){
  const pol = policy();
  if(!pol.socratic) return;
  const rec = askTutor('socratic', '', reason);
  if(rec) rec.auto = true;
}

/* ---------- 10. Telemetry ---------- */
function telem(type, payload){
  S.telemetry.push({t:Date.now(), arm:S.arm, lesson:S.lesson, ...payload, type});   // the event name always wins over a payload field
  if(S.telemetry.length > 400) S.telemetry.shift();
}
function nudge(dim, d){ S.style[dim] = Math.max(-1, Math.min(1, S.style[dim] + d)); }
