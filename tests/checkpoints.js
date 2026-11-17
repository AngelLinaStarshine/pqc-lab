// Restart checkpoints: node tests/checkpoints.js  (no server or database needed)
const core = require('../app/server/core');
const K = require('./keys.json');
let st = JSON.stringify(core.fresh({}, 'T').state), set = {};
let t0 = Date.now();
const op = (name, args, ui) => { const r = core.op(st, set, 'T', ui || null, name, args); st = JSON.stringify(r.state); return r; };
const S = () => JSON.parse(st), les = L => S().les[L];
const ans = p => Object.fromEntries(K.L1.parts[p].checks.map((q, i) => [i, q.a]));
const ok = (name, c, x) => { console.log((c ? 'PASS ' : 'FAIL ') + name + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if(!c) process.exitCode = 1; };
ok('default scope is the current part', core.settings({}).secure.scope === 'part');

op('ui', [], {lesson:'L1', les:{L:'L1', step:'hook'}});
op('hook', ['L1', 'Maybe the two libraries use different versions of ML-KEM.', null]);
op('check', ['L1', 0, ans(0)], {les:{L:'L1', step:'learn', part:0}});            // part 1 finished
op('ui', [], {les:{L:'L1', step:'learn', part:1, checks:{[K.L1.parts[1].id]:{0:1}}}});  // mid part 2, one answer picked
op('left', ['switched tab', t0 + 1]);
let l = les('L1');
ok('hook kept', l.hook.revealed);
ok('part 1 kept', !!(l.checks[K.L1.parts[0].id] || {}).submitted);
ok('part 2 restarted from its beginning', !l.checks[K.L1.parts[1].id] && l.step === 'learn' && l.part === 1, {step:l.step, part:l.part});
ok('restart logged with the part named', /Learn part 2/.test(S().integrity.slice(-1)[0].dropped), S().integrity.slice(-1)[0].dropped);
op('resume', [null]);

// finish all of Learn, answer some Practice items, then leave mid-Practice
for(let p = 1; p < K.L1.parts.length; p++) op('check', ['L1', p, ans(p)], {les:{L:'L1', step:'learn', part:p}});
const pr = K.L1.exercises.filter(e => e.step === 'practice');
op('ui', [], {les:{L:'L1', step:'practice'}});
op('attempt', ['L1', pr[0].id, {text:pr[0].model}, '']);
op('attempt', ['L1', pr[1].id, {text:pr[1].model}, '']);
op('left', ['minimised', t0 + 2]);
l = les('L1');
ok('all Learn parts kept', K.L1.parts.every(p => (l.checks[p.id] || {}).submitted));
ok('Practice restarted from its first exercise', l.step === 'practice' && pr.every(e => !l.ex[e.id] || !l.ex[e.id].attempts) && l.cur.practice === pr[0].id, {step:l.step, cur:l.cur.practice});
op('resume', [null]);

// leaving while looking back at a finished part still restarts only the unfinished one
op('ui', [], {les:{L:'L1', step:'learn', part:0}});
op('left', ['switched tab', t0 + 3]);
l = les('L1');
ok('reviewing a finished part: it stays finished; student returns to the unfinished part', (l.checks[K.L1.parts[0].id] || {}).submitted && l.step === 'practice', {step:l.step});

// the old scopes still behave as before
set = {secure:{scope:'lesson'}}; op('resume', [null]); op('left', ['switched tab', t0 + 4]);
ok('scope "lesson" still restarts the whole lesson', !S().les.L1 || !S().les.L1.hook.revealed);
set = {secure:{scope:'bogus'}}; op('resume', [null]);
op('hook', ['L1', 'Perhaps one side applies a KDF to the secret.', null]); op('check', ['L1', 0, ans(0)], {les:{L:'L1', step:'learn', part:0}});
op('left', ['switched tab', t0 + 5]);
ok('an unknown scope falls back to the part, never the whole course', (les('L1').checks[K.L1.parts[0].id] || {}).submitted);
