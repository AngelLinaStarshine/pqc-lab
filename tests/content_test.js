// Content validation: every key, model answer, reference solution and gate, graded by the lab's own engine.
const fs = require('fs'), vm = require('vm');
let src = fs.readFileSync(process.argv[2], 'utf8');
src = src.replace(/\nroute\(\);\s*$/, '\n');
const noop = () => {};
const el = () => ({classList:{contains:() => false, toggle:noop, add:noop, remove:noop}, addEventListener:noop, setAttribute:noop, appendChild:noop});
const sandbox = {console, Math, Date, JSON, RegExp, Set, Map, WeakMap, Promise, setTimeout, clearTimeout,
  document:{addEventListener:noop, documentElement:{lang:''}, body:el(), querySelector:() => null, getElementById:() => null, createElement:el, hasFocus:() => true, visibilityState:'visible'},
  window:{addEventListener:noop}, location:{hash:''}};
vm.createContext(sandbox);
vm.runInContext(src + `
;globalThis.__api = {LESSONS, CONCEPTS, LEVELS, TYPE_LEVEL, STEPS, TEMPLATES, ROUNDTRIP_SRC, KEMCHECK_STARTER, PARAMAUDIT_STARTER, PINNED_STARTER, GUARD_STARTER,
  gradeExplain, gradeTable, gradeFill, gradeMC, gradeFind, gradeMulti, gradeCode, detect, selfCheck, optOrder, lessonOpen, gateStatus, applyCells, observe, freshState, lp,
  setS: v => { S = v; }, getS: () => S, SETTINGS: () => SETTINGS, rxOK: s => { try { new RegExp(s, 'i'); return true; } catch(e){ return false; } }};`, sandbox);
const A = sandbox.__api;
const fails = [], notes = [];
const fail = (m) => fails.push(m), note = m => notes.push(m);
let counts = {checks:0, ex:0, exit:0};

const posHist = {};
for(const L of Object.keys(A.LESSONS)){
  const les = A.LESSONS[L]; if(les.placeholder) continue;
  const exIds = new Set(les.exercises.map(e => e.id));
  // bans
  (les.bans || []).forEach(b => b.until.forEach(id => { if(!exIds.has(id)) fail(L + ' ban lifts on unknown exercise ' + id); }));
  // concepts
  les.concepts.forEach(K => { if(!A.CONCEPTS[K]) fail(L + ' unknown concept ' + K); });
  // learn checks
  les.parts.forEach(p => {
    p.concepts.forEach(K => { if(!A.CONCEPTS[K]) fail(L + p.id + ' unknown concept ' + K); });
    p.checks.forEach((q, qi) => {
      counts.checks++;
      if(!(q.a >= 0 && q.a < q.opts.length)) fail(L + p.id + ' q' + qi + ' answer index out of range');
      if(new Set(q.opts).size !== q.opts.length) fail(L + p.id + ' q' + qi + ' duplicate options');
      const ord = A.optOrder(L + p.id + 'q' + qi, q.opts.length);
      if([...ord].sort().join() !== [...Array(q.opts.length).keys()].join()) fail('optOrder not a permutation');
      const pos = ord.indexOf(q.a); posHist[pos] = (posHist[pos] || 0) + 1;
    });
  });
  // exercises
  les.exercises.forEach(ex => {
    counts.ex++;
    const tag = L + ' ' + ex.id;
    ex.cells.forEach(([K, lv]) => {
      if(!A.CONCEPTS[K]) fail(tag + ' unknown concept ' + K);
      if(!A.LEVELS.includes(lv)) fail(tag + ' bad level ' + lv);
      if(lv !== A.TYPE_LEVEL[ex.type]) note(tag + ' (type ' + ex.type + ') feeds ' + K + '·' + lv + ', not ' + A.TYPE_LEVEL[ex.type]);
    });
    (ex.criteria || []).forEach(c => [...(c.any || []), ...(c.all || [])].forEach(r => { if(!A.rxOK(r)) fail(tag + ' bad regex ' + r); }));
    let g;
    if(ex.kind === 'explain'){
      g = A.gradeExplain(ex, ex.model);
      if(g.status !== 'pass') fail(tag + ' model answer grades ' + g.status + ' (' + g.items.filter(i => !i.ok).map(i => i.label).join('; ') + ')');
      const junk = A.gradeExplain(ex, 'I am not sure what happens here, sorry.');
      if(junk.status !== 'miss') fail(tag + ' a non-answer grades ' + junk.status);
    } else if(ex.kind === 'table'){
      const ans = {}; ex.rows.forEach((row, ri) => row.forEach((c, ci) => { if(typeof c === 'object') ans[ri + ':' + ci] = c.a; }));
      g = A.gradeTable(ex, ans); if(g.status !== 'pass') fail(tag + ' key grades ' + g.status);
      ex.rows.forEach((row, ri) => row.forEach(c => { if(typeof c === 'object' && c.opts && !c.opts.includes(c.a)) fail(tag + ' row ' + ri + ' key not among options'); }));
    } else if(ex.kind === 'fill'){
      g = A.gradeFill(ex, ex.blanks.map(b => b.a[0])); if(g.status !== 'pass') fail(tag + ' key grades ' + g.status);
      ex.blanks.forEach((b, i) => { if(b.opts && !b.a.every(a => b.opts.includes(a))) fail(tag + ' blank ' + i + ' key not among options'); });
    } else if(ex.kind === 'mc'){
      g = A.gradeMC(ex, ex.a); if(g.status !== 'pass') fail(tag + ' key grades ' + g.status);
    } else if(ex.kind === 'findline'){
      g = A.gradeFind(ex, {lines:ex.groups.map(gr => gr[0]), mech:ex.mech.a}); if(g.status !== 'pass') fail(tag + ' key grades ' + g.status);
      if(ex.groups.flat().some(n => n < 1 || n > ex.lines.length)) fail(tag + ' group line out of range');
      const wrong = A.gradeFind(ex, {lines:[ex.lines.length + 0].filter(n => !ex.groups.flat().includes(n)), mech:Array.isArray(ex.mech.a) ? [ex.mech.opts.length - 1] : (ex.mech.a + 1) % ex.mech.opts.length});
      if(wrong.status === 'pass') fail(tag + ' a wrong answer passes');
    } else if(ex.kind === 'multimc'){
      g = A.gradeMulti(ex, ex.qs.map(q => q.a)); if(g.status !== 'pass') fail(tag + ' key grades ' + g.status);
    } else if(ex.kind === 'code'){
      g = A.gradeCode(ex, ex.ref, L);
      if(g.status !== 'pass') fail(tag + ' reference solution grades ' + g.status + ' failed=' + g.res.filter(r => !r.ok).map(r => r.label).join('; ') + ' flags=' + g.flags.map(f => f.cls).join(','));
      const st = A.gradeCode(ex, ex.starter, L);
      if(st.status === 'pass') fail(tag + ' starter already passes');
    }
  });
  // exit ticket
  les.exit.qs.forEach((q, qi) => {
    if(q.ungraded) return; counts.exit++;
    const g = A.gradeExplain({criteria:q.criteria}, q.model, 2);
    if(g.status !== 'pass') fail(L + ' exit q' + (qi+1) + ' model grades ' + g.status);
  });
}
// templates
Object.entries(A.TEMPLATES).forEach(([k, t]) => { const c = A.selfCheck(t); if(!c.pass) fail('template ' + k + ': ' + c.why); });
// detector on known code
const cls = c => A.detect(c, {lesson:'*'}).map(f => f.cls).sort().join(',');
if(cls(A.ROUNDTRIP_SRC) !== '') fail('RoundTrip flagged: ' + cls(A.ROUNDTRIP_SRC));
const seeded = A.ROUNDTRIP_SRC.replace('new SecureRandom());     // [3]', 'rng);').replace('try {', 'try {\n SecureRandom rng = SecureRandom.getInstance("SHA1PRNG"); rng.setSeed(42L);');
if(!cls(seeded).includes('M1')) fail('seeded RNG not flagged M1');
const book = A.LESSONS.L2.exercises.find(e => e.id === 'C4').show;
if(!cls(book).includes('SF-05')) fail('book excerpt not flagged SF-05');
if(!cls('kpg.initialize(MLKEMParameterSpec.ml_kem_512, r);').includes('SF-01')) fail('512 not flagged SF-01');
// gates: a learner who passes everything opens every gate, in order
A.setS(A.freshState());
for(const L of ['L1','L2','L3','L4']){
  if(!A.lessonOpen(L)) fail('gate for ' + L + ' closed for a strong learner: ' + JSON.stringify(A.gateStatus(L).rows.map(r => r.K + r.lv + '=' + r.p.toFixed(2))));
  const les = A.LESSONS[L];
  les.parts.forEach(p => p.concepts.forEach(K => A.observe(K, 'L2', 'success', 0.5, 't')));
  les.exercises.forEach(ex => A.applyCells(ex.cells, 'success', 1, 't'));
  les.exit.qs.forEach(q => q.cells && A.applyCells(q.cells, 'success', 1, 't'));
}
// a learner who does nothing cannot open L2
A.setS(A.freshState()); if(A.lessonOpen('L2')) fail('L2 open with no evidence');

console.log('checked', JSON.stringify(counts));
console.log('correct-answer position after shuffle (Learn checks):', JSON.stringify(posHist));
console.log('FAILURES', fails.length); fails.forEach(f => console.log('  ✗', f));
console.log('NOTES', notes.length); notes.forEach(n => console.log('  ·', n));
process.exit(fails.length ? 1 : 0);
