// Relevance check: real answers (every model answer + realistic student guesses) must pass; junk must not.
// Run: node tests/relevance.js  (no server or database needed)
const core = require('../app/server/core');
const K = require('./keys.json');
let fails = 0;
const OPEN = {release:{L1:'open', L2:'open', L3:'open', L4:'open'}};   // test only: open every lesson
const ok = (n, c, x) => { if(!c){ fails++; console.log('FAIL ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); } };
function student(){ let st = JSON.stringify(core.fresh(OPEN, 'T').state); return (name, args, ui) => { const r = core.op(st, OPEN, 'T', ui || null, name, args); st = JSON.stringify(r.state); return r; }; }
const GOOD_HOOK = {
  L1:['Probably the two libraries implement different versions of the standard.', 'I think one side applies a hash to the secret before comparing.', 'Maybe Bouncy Castle still uses the old Kyber draft.', 'they encode the key in a different format', 'I guess a bug in one library'],
  L2:['Maybe 10 got it working and 2 handled errors. Done when it runs.', 'All sixteen worked, none handled failures. My program will be done when it fails cleanly.', 'about half, and nobody handled the exceptions', '16 and 0, done when the secrets match'],
  L3:['It is weaker now, 512 instead of 768.', 'Not without a review, the security level dropped.', "Can't tell without running the tests", 'Yes because it is faster and still works'],
  L4:['The key was made by a different provider.', 'Nobody, the class of the key is different.', 'The error message is misleading', 'both are true but the implementation differs'],
};
const BAD = ['asdfghjkl', 'idk', "I don't know", 'no idea', 'test', 'aaaa bbbb cccc', 'qwerty uiop asdf', 'I like pizza and football a lot', 'hello how are you today', 'x', '.....', 'lol lol lol lol lol lol', 'banana banana banana'];
for(const L of ['L1', 'L2', 'L3', 'L4']){
  const vote = K[L].hook.vote ? 0 : null;
  for(const g of GOOD_HOOK[L]){ const op = student(); op('ui', [], {lesson:L}); const r = op('hook', [L, g, vote]); ok(L + ' hook accepts: ' + g, r.result && r.result.ok, r.result); }
  for(const b of BAD){ const op = student(); const r = op('hook', [L, b, vote]); ok(L + ' hook rejects: ' + b, r.result && r.result.error, r.result); }
  // every explain model answer passes the relevance check (we call the check directly through a fresh op chain is heavy; use the shared function)
}
// direct checks of explain + exit model answers through the shared function inside the core host
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {console}; vm.createContext(ctx);
for(const f of ['catalog.js', 'lessons.js', 'engine.js', 'ops.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../app/shared', f), 'utf8'), ctx);
const R = vm.runInContext('({relevanceProblem, relVocab, relWords, REL_REFLECT, LESSONS})', ctx);
let n = 0;
for(const L of ['L1', 'L2', 'L3', 'L4']){
  for(const ex of K[L].exercises.filter(e => e.kind === 'explain')){
    const extra = [].concat(...(ex.criteria || []).map(c => (c.any || []).map(x => String(x).toLowerCase().replace(/[^a-z0-9\- ]/g, ''))), R.relWords(ex.prompt + ' ' + ex.title));
    const v = R.relVocab(L, extra);
    const m = R.relevanceProblem(ex.model, {minWords:3, prompt:ex.prompt, vocab:v}); n++;
    ok(L + ' ' + ex.id + ' model answer accepted', !m, m);
    // a short but real partial answer is accepted too (it may still be graded wrong)
    const short = R.relevanceProblem('the keys are different', {minWords:3, prompt:ex.prompt, vocab:v});
    ok(L + ' ' + ex.id + ' short real answer accepted', !short, short);
    for(const b of BAD){ const m2 = R.relevanceProblem(b, {minWords:3, prompt:ex.prompt, vocab:v}); ok(L + ' ' + ex.id + ' rejects: ' + b, !!m2); }
  }
  K[L].exit.qs.forEach((q, qi) => {
    const extra = [].concat(...(q.criteria || []).map(c => (c.any || []).map(x => String(x).toLowerCase().replace(/[^a-z0-9\- ]/g, ''))), R.relWords(q.q), q.ungraded ? R.REL_REFLECT : []);
    const v = R.relVocab(L, extra), o = {minWords:q.ungraded ? 3 : 2, prompt:q.q, vocab:v};
    const sample = q.ungraded ? 'My guess was partly right because I missed the KDF.' : q.model;
    const m = R.relevanceProblem(sample, o); n++;
    ok(L + ' exit q' + (qi + 1) + ' model/sample accepted', !m, [sample, m]);
    for(const b of BAD){ ok(L + ' exit q' + (qi + 1) + ' rejects: ' + b, !!R.relevanceProblem(b, o)); }
  });
}
// a rejection does not use an attempt and is logged
{ const op = student(); op('ui', [], {lesson:'L1'}); const r = op('hook', ['L1', 'asdfghjkl', null]);
  const S = JSON.parse(JSON.stringify(r.state)); ok('rejected hook is not locked in', !(S.les.L1 && S.les.L1.hook && S.les.L1.hook.revealed));
  ok('rejection logged as answer-rejected', (r.events || []).some(e => e.type === 'answer-rejected'), (r.events || []).map(e => e.type)); }
console.log(fails ? fails + ' FAILURES' : 'all relevance checks passed (' + n + ' model answers, ' + Object.values(GOOD_HOOK).flat().length + ' realistic guesses, ' + BAD.length + ' junk inputs per question)');
process.exitCode = fails ? 1 : 0;
