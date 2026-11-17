/* Generated once from the v5 prototype by tools/split_prototype.py; edit here from now on. */
/* ================================================================
   PQC LAB v4 — SAMPLE COHORT + LEARNER RECORDS (teacher console)
   Synthetic data for interface testing only. Both arms are drawn
   from the same distribution, so no difference between arms is
   implied. Seeded, so it is identical on every load.
   ================================================================ */
function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pFrom(rec, K, lv){ const a = PFA[K]; return sig(a.beta + a.gamma*rec.S[K][lv] - a.rho*rec.F[K][lv]); }
const DIFF = {A:0.70, B:0.76, C:0.56, D:0.46};
const SIM_FLAGS = ['BM-2','KDF','SWALLOW','LEAK','M1','SF-01'];
const AUTHORED = ['L1','L2','L3','L4'];

function simulateCohort(n){
  const rnd = mulberry32(20261030), saved = S, out = [];
  for(let i = 0; i < n; i++){
    S = freshState(); S.arm = i % 2 ? 'C' : 'T';
    const ability = 0.68 + rnd() * 0.48;
    const reach = 1 + Math.min(3, Math.floor(rnd() * 4.3));
    const rec = {id:'S-' + String(i+1).padStart(2, '0'), arm:S.arm, synthetic:true, ex:{}, checks:{}, flags:{}, lessons:{}, minutesAgo:Math.floor(rnd() * 4 * 24 * 60)};
    for(let li = 0; li < reach; li++){
      const L = AUTHORED[li], les = LESSONS[L], last = li === reach - 1;
      const stopAt = last ? 1 + Math.floor(rnd() * 5) : 6;  // index of the step reached
      rec.lessons[L] = {step:STEPS[Math.min(stopAt, 5)].id, done:!last};
      les.parts.forEach(p => {
        const ok = rnd() < Math.min(0.95, ability * 0.9);
        rec.checks[L + p.id] = ok ? 'pass' : 'miss';
        p.concepts.forEach(K => observe(K, 'L2', ok ? 'success' : 'failure', 0.5, 'sim'));
      });
      les.exercises.forEach(ex => {
        if(stepIndex(ex.step) >= stopAt) return;
        let best = 'miss', attempts = 0;
        for(let a = 0; a < 3 && best !== 'pass'; a++){
          attempts++;
          const p = Math.min(0.97, DIFF[ex.type] * ability * 1.15 + a * 0.12), r = rnd();
          const st = r < p ? 'pass' : r < p + 0.18 ? 'partial' : 'miss';
          applyCells(ex.cells, st === 'miss' ? 'failure' : 'success', st === 'pass' ? 1 : st === 'partial' ? 0.3 : 1, 'sim');
          if(st === 'pass' || (st === 'partial' && best === 'miss')) best = st;
          if(st !== 'pass' && (ex.type === 'D' || ex.flag) && rnd() < 0.5){
            const f = ex.flag || SIM_FLAGS[Math.floor(rnd() * SIM_FLAGS.length)];
            rec.flags[f + '|' + L] = (rec.flags[f + '|' + L] || 0) + 1;
          }
        }
        rec.ex[L + '.' + ex.id] = {status:best, attempts};
      });
      if(!last) LESSONS[L].exit.qs.forEach(q => q.cells && applyCells(q.cells, rnd() < ability ? 'success' : 'failure', 1, 'sim'));
    }
    const cur = AUTHORED[reach - 1];
    rec.current = {L:cur, step:rec.lessons[cur].step};
    rec.S = S.S; rec.F = S.F; rec.seen = S.seen;
    out.push(rec);
  }
  S = saved;
  return out;
}
let COHORT = null;
function cohort(){ if(!COHORT) COHORT = simulateCohort(24); return COHORT; }

/* The learner using this browser, in the same shape as a cohort record. */
function liveRecord(){
  const rec = {id:'You (this browser)', arm:S.arm, live:true, ex:{}, checks:{}, flags:{}, lessons:{}, minutesAgo:0, S:S.S, F:S.F, seen:S.seen};
  AUTHORED.forEach(L => {
    const st = S.les[L]; if(!st) return;
    refreshDone(L);
    rec.lessons[L] = {step:st.step, done:!!st.exit};
    LESSONS[L].parts.forEach(p => { const c = st.checks[p.id]; if(c && c.submitted) rec.checks[L + p.id] = c.wrong ? 'miss' : 'pass'; });
    Object.keys(st.ex).forEach(id => { const r = st.ex[id]; if(r.attempts) rec.ex[L + '.' + id] = {status:r.status, attempts:r.attempts}; });
  });
  S.telemetry.filter(e => e.type === 'detector').forEach(e => { const k = e.cls + '|' + e.lesson; rec.flags[k] = (rec.flags[k] || 0) + 1; });
  const started = AUTHORED.filter(L => S.les[L]);
  const cur = S.les[S.lesson] && !LESSONS[S.lesson].placeholder ? S.lesson : (started[started.length - 1] || 'L1');
  rec.current = {L:cur, step:S.les[cur] ? S.les[cur].step : 'hook'};
  return rec;
}
function scopeRecords(arm){
  let recs = (MODE === 'teacher' ? RECORDS.slice() : []).concat(MODE !== 'teacher' || SETTINGS.showSample ? cohort() : []);
  if(SETTINGS.includeLive) recs.unshift(liveRecord());
  if(arm && arm !== 'all') recs = recs.filter(r => r.arm === arm);
  return recs;
}
function weakestCell(rec){
  let best = null;
  Object.keys(CONCEPTS).forEach(K => LEVELS.forEach(lv => {
    if(!rec.seen[K][lv]) return;
    const p = pFrom(rec, K, lv);
    if(!best || p < best.p) best = {K, lv, p};
  }));
  return best;
}
/* Cells the learner has failed at least twice and is still below "building". */
function stuckCells(rec){
  const out = [];
  Object.keys(CONCEPTS).forEach(K => LEVELS.forEach(lv => {
    if(!rec.seen[K][lv] || rec.F[K][lv] < 2) return;
    const p = pFrom(rec, K, lv);
    if(p < BUILDING) out.push({K, lv, p});
  }));
  return out.sort((a, b) => a.p - b.p);
}
function needsAttention(rec){
  const stuck = stuckCells(rec);
  const flagCount = Object.values(rec.flags).reduce((a, b) => a + b, 0);
  const reasons = [];
  if(stuck.length >= 3) reasons.push('stuck on ' + stuck.length + ' skills (' + stuck.slice(0, 2).map(c => c.K + '·' + c.lv).join(', ') + ')');
  if(flagCount >= 3) reasons.push(flagCount + ' detector flags');
  if(rec.minutesAgo > 3 * 24 * 60) reasons.push('inactive 3+ days');
  const ig = integ(rec); if(ig.resets >= 3) reasons.push(ig.resets + ' session resets');
  return reasons;
}
function agoText(m){ if(m < 1) return 'now'; if(m < 60) return m + ' min ago'; if(m < 1440) return Math.round(m/60) + ' h ago'; return Math.round(m/1440) + ' d ago'; }
/* ================================================================
   PQC LAB v4 — SHARED UI (used by the student view and the teacher's lesson preview)
   ================================================================ */
const $ = sel => document.querySelector(sel);
const UI = { refresh: () => {} };      // set by the active shell
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function codeHTML(text){ return esc(text).replace(/\/\/ \[(\d)\]/g, '<span class="mk">// [$1]</span>'); }
function outHTML(lines){
  return (lines || []).map(l => { const m = /^(ok|exc|warn|q):(.*)$/.exec(l); return m ? '<span class="' + m[1] + '">' + esc(m[2]) + '</span>' : esc(l); }).join('\n');
}
/* Stable per-learner option order. The content lists the right answer first;
   rendering permutes it so position carries no information. Grading keeps the
   original indices (data-o / data-mech / data-mo hold them). */
function hashStr(t){ let h = 2166136261; for(let i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function optOrder(key, n){
  const r = mulberry32(hashStr(key) ^ S.seed), idx = [...Array(n).keys()];
  for(let i = n - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx;
}
function cellTag(c){ return c[0] + '·' + c[1] + (c[2] && c[2] !== 1 ? ' ×' + c[2] : ''); }
function plainGate(L){
  const cells = SETTINGS.gates[L];
  if(SETTINGS.release[L] === 'closed') return 'Not open yet';
  if(SETTINGS.release[L] === 'open' || !cells || !cells.length) return 'Open';
  return 'Opens when you reach "Getting there" in: ' + [...new Set(cells.map(([K, lv]) => SKILL[K] + ' (' + LEVEL_PLAIN[lv].toLowerCase() + ')'))].join('; ');
}

/* ---------------- content blocks ---------------- */
function renderBlocks(blocks, ctx){
  return blocks.map((b, bi) => {
    if(b.h) return '<h4>' + b.h + '</h4>';
    if(b.p) return '<p>' + b.p + '</p>';
    if(b.src && !b.table) return '<p class="src">' + b.src + '</p>';
    if(b.ul) return '<ul>' + b.ul.map(x => '<li>' + x + '</li>').join('') + '</ul>';
    if(b.ol) return '<ol>' + b.ol.map(x => '<li>' + x + '</li>').join('') + '</ol>';
    if(b.table) return '<div class="tbl-wrap" tabindex="0" role="region" aria-label="Table"><table class="t"><thead><tr>' + b.table.head.map(x => '<th scope="col">' + x + '</th>').join('') + '</tr></thead><tbody>' +
      b.table.rows.map(r => '<tr>' + r.map(x => '<td>' + x + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' + (b.src ? '<p class="src">' + b.src + '</p>' : '');
    if(b.callout) return '<aside class="callout"><span class="ct">' + esc(b.callout.title) + '</span>' + b.callout.html + '</aside>';
    if(b.annot) return '<div class="annot" data-annot="1"><button class="a-q" aria-expanded="false">' + esc(b.annot.q) + '</button><div class="a-a">' + b.annot.a + '</div></div>';
    if(b.code){
      const id = ctx + '-c' + bi;
      return '<figure class="codeblock" id="' + id + '"><figcaption class="cb-bar"><span class="fn">' + esc(b.code.fn || '') + '</span>' +
        (b.code.runs ? '<span class="vars">' + b.code.runs.map((r, ri) => '<button data-run="' + id + '" data-ri="' + ri + '">▶ ' + esc(r.label) + '</button>').join('') + '</span>' : '') +
        '</figcaption><pre tabindex="0">' + codeHTML(b.code.text) + '</pre>' + (b.code.runs ? '<div class="out" hidden aria-live="polite"></div>' : '') + '</figure>';
    }
    if(b.board) return renderBoard();
    if(b.routing) return renderRouting();
    return '';
  }).join('');
}
function wireBlocks(root, blocks, ctx){
  root.querySelectorAll('[data-run]').forEach(btn => btn.addEventListener('click', () => {
    const box = document.getElementById(btn.dataset.run), bi = +btn.dataset.run.split('-c').pop();
    const r = blocks[bi].code.runs[+btn.dataset.ri], out = box.querySelector('.out');
    out.hidden = false; out.innerHTML = '<span class="q">$ java (simulated) · ' + esc(r.label) + '</span>\n' + outHTML(r.out);
    nudge('active', 0.04); telem('demo-run', {block:ctx + '-' + bi, variant:r.label});
  }));
  root.querySelectorAll('[data-annot]').forEach(a => { const q = a.querySelector('.a-q'); q.addEventListener('click', () => {
    const was = a.classList.contains('open'); a.classList.toggle('open'); q.setAttribute('aria-expanded', String(!was));
    if(!was){ nudge('active', -0.04); nudge('visual', -0.04); telem('annotation-open', {ctx}); }
  }); });
  wireBoard(root); wireRouting(root);
}

/* ---------------- L1 six-step board ---------------- */
const BOARD = [
  {col:0, html:'<b>KeyGen</b> → <i>ek</i> (1184 B), <i>dk</i> (2400 B)', q:'Which of these may Bob publish?', a:'ek only. dk never leaves Bob.'},
  {col:1, html:'<i>ek</i> → Alice · 1184 B', q:'What can an eavesdropper do with ek?', a:'Encapsulate to Bob, nothing more.'},
  {col:2, html:'<b>Encaps</b>(<i>ek</i>) → <i>K</i> (32 B), <i>c</i> (1088 B)', q:'Did Alice choose K?', a:'No. The algorithm generated it.'},
  {col:1, html:'← <i>c</i> to Bob · 1088 B', q:'Can an eavesdropper get K from c?', a:'Not without dk.'},
  {col:0, html:'<b>Decaps</b>(<i>dk</i>, <i>c</i>) → <i>K</i>', q:'How does Bob know he got the right K?', a:'He does not yet. See implicit rejection below.'},
  {col:'both', html:'KDF(<i>K</i>, context) → AES-256 key', q:'Must both sides use the same KDF?', a:'Yes, exactly the same recipe.'},
];
function renderBoard(){
  const n = lp(S.lesson).board || 0, cols = [[], [], []];
  BOARD.slice(0, n).forEach((s, i) => {
    const cls = 'cell on' + (i === n-1 ? ' new' : '');
    if(s.col === 'both'){ cols[0].push('<div class="' + cls + '">' + (i+1) + '. ' + s.html + '</div>'); cols[1].push('<div class="cell"></div>'); cols[2].push('<div class="' + cls + '">' + (i+1) + '. ' + s.html + '</div>'); }
    else cols[s.col].push('<div class="' + cls + (s.col === 1 ? ' wire' : '') + '">' + (i+1) + '. ' + s.html + '</div>');
  });
  const cur = BOARD[n-1];
  return '<div class="board" id="kemBoard"><div class="board-h">Step through the exchange · ' + n + ' of 6</div><div class="cols"><div><div class="colh">Bob · receiver</div>' + cols[0].join('') + '</div>' +
    '<div><div class="colh">network</div>' + cols[1].join('') + '</div><div><div class="colh">Alice · sender</div>' + cols[2].join('') + '</div></div>' +
    (cur ? '<div class="bq"><b>Think first</b> ' + esc(cur.q) + ' <button class="btn sm" data-board-ans="1">Show answer</button> <span id="boardAns" hidden>' + esc(cur.a) + '</span></div>' : '') +
    '<div class="actions">' + (n < BOARD.length ? '<button class="btn primary" data-board-next="1">' + (n ? 'Next step' : 'Start the exchange') + '</button>' : '<span class="muted">Two messages cross the network (ek, then c). The secret K never does.</span>') +
    (n ? ' <button class="btn" data-board-reset="1">Start again</button>' : '') + '</div></div>';
}
function wireBoard(root){
  const b = root.querySelector('#kemBoard'); if(!b) return;
  const nx = b.querySelector('[data-board-next]'); if(nx) nx.addEventListener('click', () => { lp(S.lesson).board++; nudge('visual', 0.05); telem('board-step', {n:lp(S.lesson).board}); UI.refresh(true); });
  const rs = b.querySelector('[data-board-reset]'); if(rs) rs.addEventListener('click', () => { lp(S.lesson).board = 0; UI.refresh(true); });
  const an = b.querySelector('[data-board-ans]'); if(an) an.addEventListener('click', () => { b.querySelector('#boardAns').hidden = false; an.hidden = true; });
}

/* ---------------- L4 routing predictor ---------------- */
function renderRouting(){
  const r = lp(S.lesson).routing, cfg = r.cfg || 'A', jdk = r.jdk || '21', key = cfg + jdk;
  const pred = r.pred && r.pred[key], shown = r.shown && r.shown[key], truth = ROUTING[cfg].ans[jdk];
  return '<div class="board" id="routing"><div class="board-h">Predict, then run · each setup starts a fresh JVM</div>' +
    '<div class="seg-row" role="group" aria-label="Setup">' + Object.keys(ROUTING).map(k => '<button class="pill' + (k === cfg ? ' on' : '') + '" aria-pressed="' + (k === cfg) + '" data-rcfg="' + k + '">' + esc(ROUTING[k].label) + '</button>').join('') + '</div>' +
    '<div class="seg-row" role="group" aria-label="JDK version">' + ['21','25'].map(j => '<button class="pill' + (j === jdk ? ' on' : '') + '" aria-pressed="' + (j === jdk) + '" data-rjdk="' + j + '">' + ({'21':'JDK 21.0.12', '25':'JDK 21.0.13 (lab)'})[j] + '</button>').join('') + '</div>' +
    '<p class="bq">Who answers <code>getInstance("ML-KEM")</code>?</p><div class="opts">' +
    ['BC','BCPQC','JDK built-in'].map(o => '<button class="opt' + (pred === o ? ' sel' : '') + (shown ? (o === truth ? ' right' : pred === o ? ' wrong' : '') : '') + '" data-rpred="' + o + '">' + o + '</button>').join('') + '</div>' +
    '<div class="actions"><button class="btn primary" data-rshow="1"' + (pred && !shown ? '' : ' disabled') + '>Run</button></div>' +
    (shown ? '<p class="cfb ' + (pred === truth ? 'ok' : 'no') + '" aria-live="polite">Answered by: <b>' + esc(truth) + '</b>. ' + esc(ROUTING[cfg].note[jdk]) + ' With <code>getInstance("ML-KEM", "BC")</code> the answer is BC every time.</p>' : '') + '</div>';
}
function wireRouting(root){
  const b = root.querySelector('#routing'); if(!b) return;
  const r = lp(S.lesson).routing; r.pred = r.pred || {}; r.shown = r.shown || {};
  b.querySelectorAll('[data-rcfg]').forEach(x => x.addEventListener('click', () => { r.cfg = x.dataset.rcfg; UI.refresh(true); }));
  b.querySelectorAll('[data-rjdk]').forEach(x => x.addEventListener('click', () => { r.jdk = x.dataset.rjdk; UI.refresh(true); }));
  b.querySelectorAll('[data-rpred]').forEach(x => x.addEventListener('click', () => { const k = (r.cfg || 'A') + (r.jdk || '21'); if(r.shown[k]) return; r.pred[k] = x.dataset.rpred; UI.refresh(true); }));
  const s = b.querySelector('[data-rshow]'); if(s) s.addEventListener('click', () => {
    const k = (r.cfg || 'A') + (r.jdk || '21'); s.disabled = true;
    act('routing', [S.lesson, r.cfg || 'A', r.jdk || '21', r.pred[k]]).then(() => UI.refresh(true));
  });
}

/* ---------------- exercise widgets ---------------- */
function howTo(ex){ return ex.kind === 'explain' && ex.design ? KIND_HOWTO.design : ex.kind === 'mc' && ex.multi ? KIND_HOWTO.mcMulti : KIND_HOWTO[ex.kind]; }
function renderExerciseBody(ex, rec, ro){
  const a = rec.answer, dis = ro ? ' disabled' : '';
  if(ex.kind === 'explain') return '<label class="sr" for="exText">Your answer</label><textarea class="free" id="exText"' + dis + ' placeholder="' + (ex.design ? '1. …' : 'Type your answer…') + '" style="min-height:' + (ex.design ? 220 : 120) + 'px">' + esc(a.text || '') + '</textarea>';
  if(ex.kind === 'table'){
    let h = (ex.timed ? '<p class="timer muted" id="timer"></p>' : '') + '<div class="tbl-wrap"><table class="t sel-table"><thead><tr>' + ex.head.map(x => '<th scope="col">' + x + '</th>').join('') + '</tr></thead><tbody>';
    ex.rows.forEach((row, ri) => {
      h += '<tr>' + row.map((cell, ci) => {
        if(typeof cell !== 'object') return '<td>' + cell + '</td>';
        const v = a[ri + ':' + ci] || '', M = rec.result && rec.result.marks, mk = M ? (M[ri + ':' + ci] ? ' mark-ok' : ' mark-no') : '';
        const lab = esc(String(row[0]).replace(/<[^>]+>/g, '')) + ', ' + esc(String(ex.head[ci]).replace(/<[^>]+>/g, ''));
        if(cell.input) return '<td><input class="cellin' + mk + '" aria-label="' + lab + '" data-cell="' + ri + ':' + ci + '" value="' + esc(v) + '" inputmode="numeric"' + dis + '></td>';
        return '<td><select class="cellin' + mk + '" aria-label="' + lab + '" data-cell="' + ri + ':' + ci + '"' + dis + '><option value="">Choose…</option>' + cell.opts.map(o => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></td>';
      }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  if(ex.kind === 'fill'){
    return '<div class="ex-code">' + ex.code.split('\n').map((ln, li) => '<div class="ln"><span class="gut" aria-hidden="true">' + (li+1) + '</span><code>' + ln.split(/(\{\{\d+\}\})/).map(p => {
      const m = /^\{\{(\d+)\}\}$/.exec(p); if(!m) return esc(p);
      const i = +m[1], b = ex.blanks[i], v = a[i] || '', M = rec.result && rec.result.marks, mk = M ? (M[i] ? ' mark-ok' : ' mark-no') : '';
      if(b.opts) return '<select class="blank' + mk + '" aria-label="Blank ' + (i+1) + '" data-blank="' + i + '"' + dis + '><option value="">blank ' + (i+1) + '</option>' + b.opts.map(o => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
      return '<input class="blank' + mk + '" aria-label="Blank ' + (i+1) + '" data-blank="' + i + '" value="' + esc(v) + '" placeholder="' + esc(b.ph || 'blank ' + (i+1)) + '"' + dis + '>';
    }).join('') + '</code></div>').join('') + '</div>';
  }
  if(ex.kind === 'mc'){
    const sel = ex.multi ? new Set(a) : null;
    return (ex.show ? '<figure class="codeblock"><figcaption class="cb-bar"><span class="fn">excerpt</span></figcaption><pre tabindex="0">' + codeHTML(ex.show) + '</pre></figure>' : '') +
      '<div class="choices" role="group" aria-label="Options">' + ex.opts.map((o, i) => {
        const on = ex.multi ? sel.has(i) : a.pick === i;
        return '<button class="choice' + (on ? ' sel' : '') + '" aria-pressed="' + on + '" data-pick="' + i + '"' + dis + '><span class="ck" aria-hidden="true">' + (ex.multi ? (on ? '☑' : '☐') : (on ? '●' : '○')) + '</span>' + (ex.codeOpts ? '<pre>' + esc(o) + '</pre>' : '<span>' + esc(o) + '</span>') + '</button>';
      }).join('') + '</div>';
  }
  if(ex.kind === 'findline'){
    const picks = new Set(a.lines || []), shownAns = rec.attempts && rec.status === 'pass', RES = rec.result || {}, truth = RES.lineTruth || {}, all = RES.answerLines || [];
    let h = '<p class="step-label">Step 1 · Click the faulty line' + (ex.groups.length > 1 ? 's' : '') + '</p><div class="ex-code" role="group" aria-label="Code lines">' + ex.lines.map((ln, i) => {
      const n = i + 1, inG = all.includes(n);
      let cls = 'ln clickable';
      if(picks.has(n)) cls += rec.attempts && (n in truth) ? (truth[n] ? ' right' : ' wrongpick') : ' picked';
      else if(shownAns && inG) cls += ' right';
      return '<button class="' + cls + '" aria-pressed="' + picks.has(n) + '" data-line="' + n + '"' + dis + '><span class="gut" aria-hidden="true">' + n + '</span><code>' + esc(ln) + '</code></button>';
    }).join('') + '</div>';
    const m = ex.mech, ms = m.multi ? new Set(a.mech || []) : null;
    h += '<p class="step-label">Step 2 · ' + esc(m.q) + (m.multi ? ' (choose all that apply)' : '') + '</p><div class="choices" role="group" aria-label="Reasons">' +
      optOrder(S.lesson + ex.id + 'mech', m.opts.length).map(i => { const o = m.opts[i]; const on = m.multi ? ms.has(i) : a.mech === i; return '<button class="choice' + (on ? ' sel' : '') + '" aria-pressed="' + on + '" data-mech="' + i + '"' + dis + '><span class="ck" aria-hidden="true">' + (m.multi ? (on ? '☑' : '☐') : (on ? '●' : '○')) + '</span><span>' + esc(o) + '</span></button>'; }).join('') + '</div>';
    return h;
  }
  if(ex.kind === 'multimc'){
    return ex.qs.map((q, qi) => '<p class="step-label">' + esc(q.q) + '</p><div class="choices" role="group" aria-label="' + esc(q.q) + '">' +
      optOrder(S.lesson + ex.id + 'q' + qi, q.opts.length).map(oi => { const o = q.opts[oi]; return '<button class="choice' + (a[qi] === oi ? ' sel' : '') + '" aria-pressed="' + (a[qi] === oi) + '" data-mq="' + qi + '" data-mo="' + oi + '"' + dis + '><span class="ck" aria-hidden="true">' + (a[qi] === oi ? '●' : '○') + '</span><span>' + esc(o) + '</span></button>'; }).join('') + '</div>').join('');
  }
  if(ex.kind === 'code'){
    return '<label class="sr" for="codeIn">Code editor</label><div class="editor"><textarea id="codeIn" spellcheck="false"' + dis + ' style="min-height:' + (ex.small ? 220 : 420) + 'px">' + esc(rec.draft || ex.starter) + '</textarea></div>' +
      '<p class="muted small">The checks read your code; the course server runs it for real. Tab inserts four spaces.</p>';
  }
  return '';
}
function wireExerciseBody(ph, ex, rec){
  const a = rec.answer;
  const t = ph.querySelector('#exText'); if(t) t.addEventListener('input', () => { a.text = t.value; });
  ph.querySelectorAll('[data-cell]').forEach(s => s.addEventListener(s.tagName === 'INPUT' ? 'input' : 'change', () => { a[s.dataset.cell] = s.value; }));
  ph.querySelectorAll('[data-blank]').forEach(s => s.addEventListener(s.tagName === 'INPUT' ? 'input' : 'change', () => { a[+s.dataset.blank] = s.value; }));
  ph.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.pick;
    if(ex.multi){ const k = a.indexOf(i); if(k >= 0) a.splice(k, 1); else a.push(i); } else a.pick = i;
    UI.refresh(true);
  }));
  ph.querySelectorAll('[data-line]').forEach(b => b.addEventListener('click', () => { const n = +b.dataset.line; a.lines = a.lines || []; const k = a.lines.indexOf(n); if(k >= 0) a.lines.splice(k, 1); else a.lines.push(n); UI.refresh(true); }));
  ph.querySelectorAll('[data-mech]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.mech;
    if(ex.mech.multi){ a.mech = a.mech || []; const k = a.mech.indexOf(i); if(k >= 0) a.mech.splice(k, 1); else a.mech.push(i); } else a.mech = i;
    UI.refresh(true);
  }));
  ph.querySelectorAll('[data-mq]').forEach(b => b.addEventListener('click', () => { a[+b.dataset.mq] = +b.dataset.mo; UI.refresh(true); }));
  const c = ph.querySelector('#codeIn'); if(c){
    c.addEventListener('input', () => { rec.draft = c.value; });
    c.addEventListener('keydown', e => { if(e.key === 'Tab' && !e.shiftKey){ e.preventDefault(); const s = c.selectionStart; c.value = c.value.slice(0, s) + '    ' + c.value.slice(c.selectionEnd); c.selectionStart = c.selectionEnd = s + 4; rec.draft = c.value; } if(e.key === 'Escape') c.blur(); });
  }
  if(ex.timed){
    rec.started = rec.started || Date.now();
    const tm = ph.querySelector('#timer');
    const tick = () => { if(!tm || !document.body.contains(tm)) return; const left = Math.max(0, ex.timed - Math.floor((Date.now() - rec.started)/1000)); tm.textContent = 'Suggested time: ' + Math.floor(left/60) + ':' + String(left % 60).padStart(2, '0') + ' left (not enforced)'; if(left > 0) setTimeout(tick, 1000); };
    tick();
  }
}
const STATUS_HEAD = {pass:'Well done', partial:'Nearly there', miss:'Not yet'};
/* ================================================================
   PQC LAB v4 — STUDENT INTERFACE
   One lesson at a time, six plainly named steps, one "Next up"
   action always visible, help that explains why it is on or off.
   ================================================================ */
const MODE_PLAIN = {explain:'Explain it differently', hint:'Give me a hint', review:'Review my code', socratic:'Ask me a guiding question'};
const SV = { tab:'next', drawer:null };

function studentShell(){
  document.body.className = 'student';
  $('#app').innerHTML =
    (S.preview ? '<div class="preview-bar" role="status">Teacher preview: every lesson and step is open, and session protection is off. <a href="#teacher">Back to the teacher console</a></div>' : '') +
    '<header class="s-head"><a class="brand" href="#student"><span class="glyph">ML-KEM</span><span>PQC Lab</span></a><span class="course muted">ML-KEM in Java</span>' +
    '<span class="secure-chip" id="secureChip" role="status"></span><nav class="s-tools" aria-label="Tools"><button class="btn ghost" id="openIntro">How lessons work</button><button class="btn ghost" id="openTerms">Key terms</button>' + (MODE === 'student' ? '<button class="btn ghost" id="signOut">Sign out</button>' : '') + '</nav></header>' +
    '<div class="s-main"><aside class="drawer left" aria-label="Course and materials"><button class="drawer-tab" id="leftTab" aria-expanded="false" aria-controls="leftPanel"><span class="dt-ico" aria-hidden="true">☰</span><span>Course &amp; materials</span></button>' +
      '<div class="drawer-panel" id="leftPanel"><div class="drawer-head"><h2>Course &amp; materials</h2><button class="btn ghost" data-close="left">Hide ›</button></div><div id="materials"></div><nav class="s-rail" id="rail" aria-label="Lessons"></nav><div id="reference"></div></div></aside>' +
    '<main class="s-stage" id="stage"><div class="lesson-head" id="lessonHead"></div><div class="stepper" id="stepper" role="tablist" aria-label="Lesson steps"></div><div class="phase" id="phase" tabindex="-1"></div><div class="nextup" id="nextup" aria-live="polite"></div></main>' +
    '<aside class="drawer right" aria-label="Help and progress"><button class="drawer-tab" id="rightTab" aria-expanded="false" aria-controls="rightPanel"><span class="dt-ico" aria-hidden="true">?</span><span>Help &amp; progress</span><span class="dt-badge" id="helpBadge" hidden></span></button>' +
      '<div class="drawer-panel" id="rightPanel"><div class="drawer-head"><h2>Help &amp; progress</h2><button class="btn ghost" data-close="right">‹ Hide</button></div><div class="s-side"><div class="tabs" role="tablist" id="sideTabs"></div><div class="side-body" id="sideBody"></div></div></div></aside></div>' +
    '<footer class="s-foot muted"><span>' + (MODE === 'student' ? 'Signed in as ' + esc(ME.pseudonym || '') + ' · Build exercises run on the course server · help replies are simulated in this version.' : 'Teacher preview · Build exercises run on the course server.') + '</span>' + (MODE === 'student' ? '' : '<a href="#teacher">Back to the teacher console</a>') + '</footer>' +
    '<div class="overlay" id="overlay" hidden></div>';
  $('#openIntro').addEventListener('click', () => openIntro());
  $('#openTerms').addEventListener('click', () => openTerms());
  $('#leftTab').addEventListener('click', () => setDrawer('left', true));
  $('#rightTab').addEventListener('click', () => setDrawer('right', true));
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => setDrawer(b.dataset.close, false)));
  const so = $('#signOut'); if(so) so.addEventListener('click', () => signOut());
  UI.refresh = keep => studentRefresh(keep);
  studentRefresh();
  if(S.secureLock && !S.preview) showResetNotice();
  else if(!S.introSeen && !S.preview) openIntro();
  else if(!S.preview) armSecure('return');
}
/* Side drawers. Only one is open at a time on screens narrower than 1280px, so the lesson keeps its room. */
function setDrawer(side, open){
  SV[side] = open;
  if(open && window.innerWidth < 1280) SV[side === 'left' ? 'right' : 'left'] = false;
  if(side === 'right' && open) SV.helpNew = false;
  telem('panel', {side, open});
  applyDrawers();
  const target = open ? document.querySelector('#' + side + 'Panel .drawer-head .btn') : document.getElementById(side + 'Tab');
  if(target) target.focus({preventScroll:true});
}
/* a guiding question arrived after a wrong answer: open Help on wide screens, otherwise show a badge */
function guideArrived(){ SV.tab = 'next'; if(!SV.right){ if(window.innerWidth >= 1280) SV.right = true; else SV.helpNew = true; } applyDrawers(); renderSide(); }
function applyDrawers(){
  document.body.classList.toggle('left-open', !!SV.left);
  document.body.classList.toggle('right-open', !!SV.right);
  const lt = $('#leftTab'), rt = $('#rightTab'), hb = $('#helpBadge');
  if(lt) lt.setAttribute('aria-expanded', !!SV.left);
  if(rt){ rt.setAttribute('aria-expanded', !!SV.right); rt.setAttribute('aria-label', 'Help & progress' + (SV.helpNew ? ' (new guiding question)' : '')); }
  if(hb) hb.hidden = !SV.helpNew;
}
function studentRefresh(keep){
  const ph = $('#phase'), top = ph ? ph.scrollTop : 0;
  renderRailS(); renderMaterials(); renderLessonHeadS(); renderStepperS(); renderPhaseS(); renderNextUp(); renderSide(); renderSecureChip(); applyDrawers();
  if(keep && ph) ph.scrollTop = top;
}

/* ---------------- intro + key terms overlays ---------------- */
/* One modal helper: background made inert, Tab kept inside, Escape closes, focus returns to the opener. */
function showModal(html, opener, onClose){
  const o = $('#overlay');
  o.innerHTML = html; o.hidden = false;
  [...$('#app').children].forEach(c => { if(c !== o) c.inert = true; });
  const close = () => {
    o.hidden = true; o.innerHTML = ''; document.removeEventListener('keydown', key, true);
    [...$('#app').children].forEach(c => { c.inert = false; });
    if(onClose) onClose();
    const op = $(opener); if(op) op.focus();
  };
  const key = e => {
    if(e.key === 'Escape'){ e.preventDefault(); close(); return; }
    if(e.key !== 'Tab') return;
    const f = [...o.querySelectorAll('button, summary, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null);
    if(!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if(!o.contains(document.activeElement)){ e.preventDefault(); first.focus(); }
    else if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', key, true);
  $('#closeOverlay').addEventListener('click', close);
  o.onclick = e => { if(e.target === o) close(); };
  $('#closeOverlay').focus();
}
function openIntro(){
  const html = '<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="introTitle"><h2 id="introTitle">How each lesson works</h2>' +
    '<p>Every lesson has the same six steps. You always see what to do next at the bottom of the page.</p><ol class="intro-steps">' +
    STEPS.map(s => '<li><b>' + STEP_PLAIN[s.id].label + '</b><span>' + ({hook:'Read a real incident and write what you think happened.', learn:'Read short parts. Each ends with a quick check.', practice:'Explain ideas in your own words and fill gaps in code.', diagnose:'Find the mistake in code that looks fine.', create:'Write a small program from a description.', exit:'Answer two or three questions on your own.'})[s.id] + '</span></li>').join('') +
    '</ol>' + introTimeHTML() + secureRulesHTML() + '<ul class="tips"><li>The lesson fills the screen. Open <b>Course &amp; materials</b> on the left for the lesson outline, the parts you have finished (to review them) and a quick reference. Open <b>Help &amp; progress</b> on the right for help and your skills. Some steps are done on your own, so help switches off there; the panel says why.</li><li>"My progress" shows each skill as <i>Getting started</i>, <i>Getting there</i> or <i>Got it</i>.</li><li>Wrong answers are expected. You can try again, and you will see an example answer after your first try.</li></ul>' +
    '<div class="actions"><button class="btn primary" id="closeOverlay">' + (secureWanted() ? 'I understand. Start' : 'Start') + '</button></div></div>';
  showModal(html, '#openIntro', () => { S.introSeen = true; telem('intro-closed', {}); armSecure('intro'); });
}
function introTimeHTML(){
  const rows = LESSON_ORDER.filter(L => LESSON_TIME[L]).map(L => '<tr><td>Lesson ' + LESSONS[L].n + ' · ' + esc(LESSONS[L].short) + '</td><td class="num">' + fmtMin(LESSONS[L].minutes) + '</td></tr>').join('');
  return '<h3 class="intro-h">How long it takes</h3><div class="tbl-wrap"><table class="t compact time-t"><thead><tr><th scope="col">Lesson</th><th scope="col" class="num">About</th></tr></thead><tbody>' + rows +
    '<tr class="total"><td>Total, Lessons 1–4</td><td class="num">' + fmtMin(courseMinutes()) + '</td></tr></tbody></table></div>' +
    '<p class="muted small">Estimated from the reading and exercises in each lesson; your own time may differ. Each step shows its time too. You do not have to finish a lesson in one sitting: parts you finish are kept.</p>';
}
function openTerms(){
  const L = S.lesson;
  const terms = GLOSSARY.filter(g => g.L.includes(L)), others = GLOSSARY.filter(g => !g.L.includes(L));
  const html = '<div class="dialog drawer" role="dialog" aria-modal="true" aria-labelledby="termsTitle"><h2 id="termsTitle">Key terms</h2>' +
    (terms.length ? '<p class="muted">Used in Lesson ' + LESSONS[L].n + '</p><dl class="terms">' + terms.map(g => '<dt>' + esc(g.t) + '</dt><dd>' + esc(g.d) + '</dd>').join('') + '</dl>' : '') +
    '<details><summary>All other terms</summary><dl class="terms">' + others.map(g => '<dt>' + esc(g.t) + '</dt><dd>' + esc(g.d) + '</dd>').join('') + '</dl></details>' +
    '<div class="actions"><button class="btn primary" id="closeOverlay">Close</button></div></div>';
  showModal(html, '#openTerms');
  telem('terms-open', {L});
}

/* ---------------- lessons rail ---------------- */
function lessonProgress(L){
  if(!S.les[L]) return 0;
  refreshDone(L);
  return STEPS.filter(s => S.les[L].done[s.id]).length;
}
function renderRailS(){
  let h = '<h2 class="rail-h">Lessons <span class="rail-time">· Lessons 1–4 take about ' + fmtMin(courseMinutes()) + '</span></h2><ol class="lesson-list">';
  LESSON_ORDER.forEach(L => {
    const les = LESSONS[L], open = lessonOpen(L), done = lessonDone(L), active = S.lesson === L, n = lessonProgress(L);
    const status = (les.placeholder ? 'Coming later' : done ? 'Complete' : !open ? 'Locked' : n ? n + ' of 6 steps' : 'Ready to start') + (les.minutes && !done ? ' · about ' + fmtMin(les.minutes) : '');
    h += '<li><button class="lesson' + (active ? ' active' : '') + (done ? ' done' : '') + (!open ? ' locked' : '') + '" data-lesson="' + L + '"' + (active ? ' aria-current="true"' : '') + '>' +
      '<span class="ln-n">' + les.n + '</span><span class="ln-t"><span class="ln-title">' + esc(les.short) + '</span><span class="ln-s">' + (done ? '✓ ' : !open && !les.placeholder ? '🔒 ' : '') + status + '</span>' +
      (open && !les.placeholder && !done ? '<span class="bar" aria-hidden="true"><span style="width:' + (n/6*100) + '%"></span></span>' : '') + '</span></button>' +
      '</li>';
  });
  h += '</ol>';
  $('#rail').innerHTML = h;
  $('#rail').querySelectorAll('.lesson').forEach(b => b.addEventListener('click', () => {
    const L = b.dataset.lesson;
    if(!LESSONS[L].placeholder && !lessonOpen(L)){ S.lesson = L; studentRefresh(); return; }
    S.lesson = L; telem('lesson-open', {L}); studentRefresh(); $('#phase').scrollTop = 0;
  }));
}

/* ---------------- materials: time plan, lesson outline with review links, quick reference ---------------- */
function renderMaterials(){
  const box = $('#materials'); if(!box) return;
  const L = S.lesson, les = LESSONS[L], T = LESSON_TIME[L];
  let h = '';
  if(!les.placeholder && lessonOpen(L) && T){
    const st = lp(L); refreshDone(L);
    h += '<section class="mat"><h3>Lesson ' + les.n + ' outline</h3><ol class="outline">' + STEPS.map(s => {
      const open = stepOpen(L, s.id), cur = st.step === s.id, done = st.done[s.id];
      let row = '<li><div class="ol-row' + (cur ? ' cur' : '') + '"><span class="ol-mark" aria-hidden="true">' + (done ? '✓' : cur ? '›' : '') + '</span><span class="ol-t">' + STEP_PLAIN[s.id].label + (done ? '<span class="sr"> (done)</span>' : '') + '</span><span class="ol-m">' + T[s.id] + ' min</span>' +
        (open && !cur ? '<button class="linkbtn" data-goto-step="' + s.id + '">' + (done ? 'Review' : 'Open') + '</button>' : '') + '</div>';
      if(s.id === 'learn' && open) row += '<ul class="ol-sub">' + les.parts.map((pt, pi) => {
        const pd = !!(st.checks[pt.id] && st.checks[pt.id].submitted), reach = pi === 0 || !!(st.checks[les.parts[pi - 1].id] && st.checks[les.parts[pi - 1].id].submitted), pc = cur && st.part === pi;
        return '<li class="' + (pd ? 'done' : '') + (pc ? ' cur' : '') + '"><span class="ol-mark" aria-hidden="true">' + (pd ? '✓' : '') + '</span><span class="ol-t">Part ' + (pi + 1) + ' · ' + esc(pt.title) + '</span>' + (reach && !pc ? '<button class="linkbtn" data-goto-part="' + pi + '">' + (pd ? 'Review' : 'Open') + '</button>' : '') + '</li>';
      }).join('') + '</ul>';
      return row + '</li>';
    }).join('') + '</ol></section>';
  }
  box.innerHTML = h;
  const ref = $('#reference');
  if(ref) ref.innerHTML = '<section class="mat"><h3>Quick reference: ML-KEM sizes</h3><div class="tbl-wrap"><table class="t compact ref-t"><thead><tr><th scope="col">Set</th><th scope="col" class="num">ek</th><th scope="col" class="num">dk</th><th scope="col" class="num">c</th><th scope="col" class="num">K</th></tr></thead><tbody>' +
    [['ML-KEM-512', 800, 1632, 768], ['ML-KEM-768', 1184, 2400, 1088], ['ML-KEM-1024', 1568, 3168, 1568]].map(r => '<tr><th scope="row">' + r[0] + '</th><td class="num">' + r[1] + '</td><td class="num">' + r[2] + '</td><td class="num">' + r[3] + '</td><td class="num">32</td></tr>').join('') +
    '</tbody></table></div><p class="muted small">Bytes, from FIPS 203. ek = encapsulation key, dk = decapsulation key, c = ciphertext, K = shared secret.</p><button class="btn sm" id="matTerms">All key terms</button></section>';
  box.querySelectorAll('[data-goto-step]').forEach(b => b.addEventListener('click', () => goS(b.dataset.gotoStep)));
  box.querySelectorAll('[data-goto-part]').forEach(b => b.addEventListener('click', () => { const st = lp(L); st.step = 'learn'; st.part = +b.dataset.gotoPart; telem('review-part', {part:st.part}); studentRefresh(); $('#phase').scrollTop = 0; }));
  const mt = $('#matTerms'); if(mt) mt.addEventListener('click', () => openTerms());
}

/* ---------------- lesson head + stepper ---------------- */
function renderLessonHeadS(){
  const les = LESSONS[S.lesson];
  $('#lessonHead').innerHTML = '<p class="eyebrow">Lesson ' + les.n + (les.minutes ? ' · about ' + les.minutes + ' minutes' : '') + '</p><h1>' + esc(les.title) + '</h1>' +
    (les.placeholder ? '' : '<p class="muted small">You will practise: ' + les.concepts.map(k => esc(SKILL[k])).join(' · ') + '</p>');
}
function renderStepperS(){
  const L = S.lesson, les = LESSONS[L];
  if(les.placeholder || !lessonOpen(L)){ $('#stepper').innerHTML = ''; return; }
  const st = lp(L); refreshDone(L);
  $('#stepper').innerHTML = STEPS.map((s, i) => {
    const open = stepOpen(L, s.id), cur = st.step === s.id, done = st.done[s.id];
    return '<button class="step' + (cur ? ' active' : '') + (done ? ' done' : '') + '" role="tab" aria-selected="' + cur + '" data-step="' + s.id + '"' + (open ? '' : ' disabled aria-disabled="true"') + '>' +
      '<span class="dot" aria-hidden="true">' + (done ? '✓' : i + 1) + '</span><span class="st-t"><span>' + STEP_PLAIN[s.id].label + '</span><small>' + (done ? 'done' : open ? STEP_PLAIN[s.id].sub : 'locked') + (LESSON_TIME[L] && !done ? ' · ' + LESSON_TIME[L][s.id] + ' min' : '') + '</small></span></button>';
  }).join('');
  $('#stepper').querySelectorAll('.step').forEach(b => b.addEventListener('click', () => { if(!b.disabled) goS(b.dataset.step); }));
}
function goS(step){ lp(S.lesson).step = step; telem('step', {step}); studentRefresh(); $('#phase').scrollTop = 0; $('#phase').focus({preventScroll:true}); }

/* ---------------- "Next up" bar ---------------- */
function nextUp(){
  const L = S.lesson, les = LESSONS[L];
  if(les.placeholder) return {text:'This lesson is not available yet.'};
  if(!lessonOpen(L)) return {text:plainGate(L) + '.', btn:'See suggestions', act:() => { SV.tab = 'plan'; renderSide(); }};
  const st = lp(L); refreshDone(L);
  if(st.step === 'hook'){
    if(!st.hook.revealed) return {text:'Write your prediction, then press "Lock in my prediction".', btn:'Go to the box', act:() => { const t = $('#hookText'); if(t){ t.scrollIntoView({block:'center'}); t.focus(); } }};
    return {text:'Prediction saved. Next: read the first part.', btn:'Start reading', act:() => goS('learn')};
  }
  if(st.step === 'learn'){
    const curP = les.parts[st.part], curC = curP && st.checks[curP.id];
    if(curC && curC.submitted && curC.wrong) return {text:'Some answers in Part ' + (st.part+1) + ' were off. Read "Explained another way", then try the check again. You can also move on; Suggestions will bring this back later.', btn:'Try the check again', act:() => { act('retryCheck', [L, st.part]).then(() => { studentRefresh(true); const c = $('#check'); if(c){ c.scrollIntoView({block:'start'}); c.focus(); } }); return; const c = $('#check'); if(c){ c.scrollIntoView({block:'start'}); c.focus(); } }};
    const idx = les.parts.findIndex(p => !(st.checks[p.id] && st.checks[p.id].submitted));
    if(idx < 0) return {text:'You have finished every part. Next: practise.', btn:'Go to Practise', act:() => goS('practice')};
    if(idx === st.part) return {text:'Read Part ' + (idx+1) + ', then answer the check at the end.', btn:'Jump to the check', act:() => { const c = $('#check'); if(c){ c.scrollIntoView({block:'start'}); c.focus(); } }};
    return {text:'Part ' + (idx+1) + ' is next.', btn:'Open Part ' + (idx+1), act:() => { st.part = idx; studentRefresh(); $('#phase').scrollTop = 0; }};
  }
  if(['practice','diagnose','create'].includes(st.step)){
    const list = exercisesFor(L, st.step), cur = st.cur[st.step] || list[0].id;
    const todo = list.find(e => !(st.ex[e.id] && st.ex[e.id].attempts));
    if(!todo){ const nx = STEPS[stepIndex(st.step) + 1]; return {text:'You have tried every exercise in this step.', btn:'Go to ' + STEP_PLAIN[nx.id].label, act:() => goS(nx.id)}; }
    const pos = list.indexOf(todo) + 1;
    if(todo.id === cur) return {text:'Exercise ' + pos + ' of ' + list.length + ': answer it, then press ' + (todo.kind === 'code' ? '"Run checks"' : '"Check"') + '.', btn:'Jump to the answer area', act:() => { const s = $('#exBody'); if(s){ s.scrollIntoView({block:'start'}); } }};
    return {text:'Exercise ' + pos + ' of ' + list.length + ' is waiting.', btn:'Open exercise ' + pos, act:() => { st.cur[st.step] = todo.id; studentRefresh(); $('#phase').scrollTop = 0; }};
  }
  if(st.step === 'exit'){
    if(!st.exit) return {text:'Answer the wrap-up questions on your own, then submit.', btn:'Jump to the questions', act:() => { const q = document.querySelector('[data-exitq]'); if(q){ q.scrollIntoView({block:'center'}); q.focus(); } }};
    const nx = LESSON_ORDER[LESSON_ORDER.indexOf(L) + 1];
    if(nx && !LESSONS[nx].placeholder && lessonOpen(nx)) return {text:'Lesson ' + LESSONS[L].n + ' complete.', btn:'Start Lesson ' + LESSONS[nx].n, act:() => { S.lesson = nx; studentRefresh(); $('#phase').scrollTop = 0; }};
    if(nx && !LESSONS[nx].placeholder) return {text:'Lesson ' + LESSONS[L].n + ' complete. ' + plainGate(nx) + '.', btn:'See suggestions', act:() => { SV.tab = 'plan'; renderSide(); }};
    return {text:'Lesson complete. More lessons are coming.'};
  }
  return {text:''};
}
function renderNextUp(){
  const n = nextUp(), box = $('#nextup');
  box.innerHTML = '<span class="nu-l">Next up</span><span class="nu-t">' + esc(n.text) + '</span>' + (n.btn ? '<button class="btn primary" id="nuBtn">' + esc(n.btn) + '</button>' : '');
  const b = $('#nuBtn'); if(b) b.addEventListener('click', n.act);
}

/* ---------------- phases ---------------- */
function renderPhaseS(){
  const ph = $('#phase'), L = S.lesson, les = LESSONS[L];
  if(les.placeholder){ ph.innerHTML = '<div class="pad"><div class="card-s"><h2>Coming later</h2><p>' + esc(les.outline) + '</p></div></div>'; return; }
  if(!lessonOpen(L)){
    const gs = gateStatus(L);
    ph.innerHTML = '<div class="pad"><div class="card-s"><h2>This lesson is locked</h2><p>' + esc(plainGate(L)) + '.</p>' +
      (gs.rows.length ? '<ul class="gate-list">' + gs.rows.map(r => '<li><span>' + esc(SKILL[r.K]) + ' · ' + LEVEL_PLAIN[r.lv] + '</span><span class="badge ' + (r.ok ? 'solid' : band(r.p)) + '">' + (r.ok ? 'Ready' : BAND_PLAIN[S.seen[r.K][r.lv] ? band(r.p) : 'unseen']) + '</span></li>').join('') + '</ul>' : '') +
      '<p class="muted">The Suggestions tab on the right lists what to practise.</p></div></div>';
    return;
  }
  const step = lp(L).step;
  if(step === 'hook') renderHookS(ph); else if(step === 'learn') renderLearnS(ph); else if(step === 'exit') renderExitS(ph); else renderExS(ph, step);
}
function renderHookS(ph){
  const les = LESSONS[S.lesson], h = les.hook, st = lp(S.lesson);
  let html = '<div class="pad"><p class="eyebrow">Step 1 · Predict</p><h2>' + esc(h.title) + '</h2><div class="story">' +
    (h.story || []).map(p => p.includes('class="quote"') ? '<pre class="quote">' + p.replace(/<\/?span[^>]*>/g, '') + '</pre>' : '<p>' + p + '</p>').join('') + '</div>' + (h.blocks ? renderBlocks(h.blocks, 'hook') : '');
  if(!st.hook.revealed){
    html += '<section class="commit" aria-labelledby="commitH"><h3 id="commitH">What do you think?</h3><p class="muted small">There is no wrong guess. You will look back at it in the wrap-up.</p>' +
      (h.vote ? '<p class="q">' + esc(h.vote.q) + '</p><div class="choices" role="group" aria-label="Your vote">' + h.vote.opts.map((o, i) => '<button class="choice' + (st.hook.vote === i ? ' sel' : '') + '" aria-pressed="' + (st.hook.vote === i) + '" data-vote="' + i + '"><span class="ck" aria-hidden="true">' + (st.hook.vote === i ? '●' : '○') + '</span><span>' + esc(o) + '</span></button>').join('') + '</div>' : '') +
      '<label class="q" for="hookText">' + esc(h.prompt) + '</label><textarea class="free" id="hookText" placeholder="I think…">' + esc(st.hook.text || '') + '</textarea>' +
      '<p class="err" id="hookErr" role="alert"></p><div class="actions"><button class="btn primary" id="hookCommit">Lock in my prediction</button></div></section>';
  } else {
    html += '<section class="commit done"><h3>Your prediction</h3>' + (h.vote && st.hook.vote != null ? '<p><b>' + esc(h.vote.opts[st.hook.vote]) + '</b></p>' : '') + '<p>' + esc(st.hook.text) + '</p></section>' +
      '<section class="reveal"><h3>What actually happened</h3><p>' + esc(h.reveal.intro) + '</p><ol>' + h.reveal.items.map(x => '<li>' + x + '</li>').join('') + '</ol><p>' + esc(h.reveal.close) + '</p><p class="src">Source: ' + h.reveal.src + '</p></section>';
  }
  ph.innerHTML = html + '</div>';
  if(h.blocks) wireBlocks(ph, h.blocks, 'hook');
  ph.querySelectorAll('[data-vote]').forEach(b => b.addEventListener('click', () => { st.hook.text = ($('#hookText') || {}).value || st.hook.text; st.hook.vote = +b.dataset.vote; studentRefresh(true); }));
  const ta = $('#hookText'); if(ta) ta.addEventListener('input', () => { st.hook.text = ta.value; });
  const c = $('#hookCommit'); if(c) c.addEventListener('click', () => {
    const t = (ta.value || '').trim();
    if(h.vote && st.hook.vote == null){ $('#hookErr').textContent = 'Choose one of the options above first.'; return; }
    if(t.length < 8){ $('#hookErr').textContent = 'Write at least a short sentence before locking it in.'; ta.focus(); return; }
    c.disabled = true;
    act('hook', [S.lesson, t, st.hook.vote]).then(r => { if(r && r.error){ studentRefresh(true); const e = $('#hookErr'); if(e) e.textContent = r.error; return; } studentRefresh(); });
  });
}
function renderLearnS(ph){
  const L = S.lesson, les = LESSONS[L], st = lp(L);
  const pi = Math.min(st.part, les.parts.length - 1), part = les.parts[pi];
  const ck = st.checks[part.id] || (st.checks[part.id] = {ans:{}});
  let html = '<div class="paper"><div class="pad"><nav class="parts" aria-label="Parts">' + les.parts.map((p, i) => {
    const c = st.checks[p.id], ok = c && c.submitted;
    const avail = i === 0 || S.preview || (st.checks[les.parts[i-1].id] && st.checks[les.parts[i-1].id].submitted);
    return '<button class="partbtn' + (i === pi ? ' on' : '') + (ok ? ' ok' : '') + '"' + (i === pi ? ' aria-current="step"' : '') + ' data-part="' + i + '"' + (avail ? '' : ' disabled') + '>' + (ok ? '✓ ' : '') + 'Part ' + (i+1) + '<span class="sr">' + (ok ? ', checked' : avail ? '' : ', locked') + '</span></button>';
  }).join('') + '</nav>' +
    '<p class="eyebrow">Step 2 · Read & check · Part ' + (pi+1) + ' of ' + les.parts.length + '</p><h2>' + esc(part.title) + '</h2>' +
    '<div class="bigidea"><b>The big idea</b>' + part.bigIdea + '</div>' + renderBlocks(part.blocks, L + part.id) +
    '<section class="check" id="check" tabindex="-1" aria-labelledby="checkH"><h3 id="checkH">Quick check · ' + part.checks.length + ' questions</h3>' + part.checks.map((q, qi) => {
      const a = ck.ans[qi];
      return '<fieldset class="cq"><legend>' + (qi+1) + '. ' + esc(q.q) + '</legend><div class="opts">' + optOrder(L + part.id + 'q' + qi, q.opts.length).map(oi => { const o = q.opts[oi];
        let cls = 'opt', mark = '';
        const R = (ck.result || [])[qi]; if(ck.submitted && R){ if(oi === R.a){ cls += ' right'; mark = '<span class="sr"> (correct answer)</span>'; } else if(a === oi){ cls += ' wrong'; mark = '<span class="sr"> (your answer, incorrect)</span>'; } }
        else if(a === oi) cls += ' sel';
        return '<button class="' + cls + '" aria-pressed="' + (a === oi) + '" data-q="' + qi + '" data-o="' + oi + '"' + (ck.submitted ? ' disabled' : '') + '>' + esc(o) + mark + '</button>';
      }).join('') + '</div>' + (ck.submitted && ck.result ? '<p class="cfb ' + (ck.result[qi].ok ? 'ok' : 'no') + '">' + (ck.result[qi].ok ? '✓ Right. ' : '✗ Not quite. ') + esc(ck.result[qi].why) + '</p>' : '') + '</fieldset>';
    }).join('');
  if(!ck.submitted) html += '<p class="err" id="checkErr" role="alert"></p><div class="actions"><button class="btn primary" id="checkBtn">Check my answers</button></div>';
  else {
    if(ck.wrong) html += '<div class="reteach"><b>' + (S.arm === 'T' ? 'Explained another way' : 'Before you try again') + '</b>' + (S.arm === 'T' ? esc(part.reteach) : 'Re-read the big idea at the top of this part.') + '</div>';
    html += '<div class="actions">' + (pi < les.parts.length - 1 ? '<button class="btn primary" data-part="' + (pi+1) + '">Next: Part ' + (pi+2) + '</button>' : '<button class="btn primary" data-gostep="practice">Go to Practise</button>') + '<button class="btn" id="retryCheck">Try the check again</button></div>';
  }
  ph.innerHTML = html + '</section></div></div>';
  wireBlocks(ph, part.blocks, L + part.id);
  ph.querySelectorAll('[data-part]').forEach(b => b.addEventListener('click', () => { if(b.disabled) return; st.part = +b.dataset.part; telem('part-open', {part:les.parts[st.part].id}); studentRefresh(); $('#phase').scrollTop = 0; }));
  ph.querySelectorAll('[data-gostep]').forEach(b => b.addEventListener('click', () => goS(b.dataset.gostep)));
  ph.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { if(ck.submitted) return; ck.ans[+b.dataset.q] = +b.dataset.o; studentRefresh(true); }));
  const cb = $('#checkBtn'); if(cb) cb.addEventListener('click', () => {
    const left = part.checks.length - Object.keys(ck.ans).length;
    if(left){ $('#checkErr').textContent = 'Answer ' + (left === 1 ? 'the last question' : 'all ' + part.checks.length + ' questions') + ' first.'; return; }
    cb.disabled = true;
    act('check', [L, pi, ck.ans]).then(r => {
      if(r && r.error){ studentRefresh(true); const e = $('#checkErr'); if(e) e.textContent = r.error; return; }
      if(r && r.wrong){ const n0 = (S.llm || []).length; autoSocratic('wrong check'); if((S.llm || []).length > n0) guideArrived(); }
      studentRefresh(true);
    });
  });
  const rc = $('#retryCheck'); if(rc) rc.addEventListener('click', () => { act('retryCheck', [L, pi]).then(() => studentRefresh(true)); });
}
function renderExS(ph, step){
  const L = S.lesson, st = lp(L), list = exercisesFor(L, step);
  if(!st.cur[step]) st.cur[step] = list[0].id;
  const ex = list.find(e => e.id === st.cur[step]) || list[0], i = list.indexOf(ex);
  const rec = st.ex[ex.id] || (st.ex[ex.id] = newRecord(ex));
  const lv = TYPE_LEVEL[ex.type];
  let html = '<div class="pad"><p class="eyebrow">Step ' + (stepIndex(step)+1) + ' · ' + STEP_PLAIN[step].label + '</p>';
  if(step === 'create') html += '<p class="notice">This step is done on your own. Help is switched off so the result shows what you can do.</p>';
  html += '<nav class="ex-nav" aria-label="Exercises in this step">' + list.map((e, k) => {
    const r = st.ex[e.id], s = r && r.status;
    return '<button class="exdot' + (e.id === ex.id ? ' on' : '') + (s ? ' ' + s : '') + '" data-ex="' + e.id + '" aria-label="Exercise ' + (k+1) + (s ? ', ' + STATUS_HEAD[s] : ', not tried') + '"' + (e.id === ex.id ? ' aria-current="true"' : '') + '>' + (k+1) + '</button>';
  }).join('') + '<span class="muted small">Exercise ' + (i+1) + ' of ' + list.length + '</span></nav>' +
    '<article class="exercise" aria-labelledby="exTitle"><div class="ex-tags"><span class="tag">' + LEVEL_PLAIN[lv] + '</span>' + [...new Set(ex.cells.map(c => c[0]))].map(K => '<span class="tag soft">' + esc(SKILL[K]) + '</span>').join('') + '</div>' +
    '<h2 id="exTitle">' + esc(ex.title) + '</h2><div class="prompt">' + ex.prompt + '</div><p class="howto"><b>What to do:</b> ' + howTo(ex) + '</p><div id="exBody">' + renderExerciseBody(ex, rec, false) + '</div>' +
    '<p class="err" id="exErr" role="alert"></p><div class="actions"><button class="btn primary" id="submitEx">' + (ex.kind === 'code' ? '▶ Run checks' : rec.attempts ? 'Check again' : 'Check') + '</button>' +
    (ex.kind === 'code' ? '<button class="btn" id="resetCode">Start over</button>' : '') + (S.preview && ex.ref ? '<button class="btn" id="loadRef">Load reference (preview)</button>' : '') +
    (rec.attempts ? '<span class="muted small">Tries: ' + rec.attempts + '</span>' : '') + '</div>' + feedbackHTML(ex, rec) +
    (rec.attempts ? '<details class="model"><summary>See an example answer</summary><p>' + esc(rec.model || ex.model || '') + '</p></details>' : '') + '</article>' +
    '<div class="actions spread">' + (i > 0 ? '<button class="btn" data-ex="' + list[i-1].id + '">← Previous</button>' : '<span></span>') +
    (i < list.length - 1 ? '<button class="btn' + (rec.attempts ? ' primary' : '') + '" data-ex="' + list[i+1].id + '">Next exercise →</button>' : '') + '</div></div>';
  ph.innerHTML = html;
  wireExerciseBody(ph, ex, rec);
  ph.querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => { st.cur[step] = b.dataset.ex; telem('exercise-open', {ex:b.dataset.ex}); studentRefresh(); $('#phase').scrollTop = 0; }));
  $('#submitEx').addEventListener('click', () => {
    if(!answered(ex, rec)){ $('#exErr').textContent = 'Answer every part of the exercise first.'; return; }
    const btn = $('#submitEx'); btn.disabled = true; btn.textContent = ex.kind === 'code' ? 'Compiling and running…' : 'Checking…';
    submitExercise(ex, rec).then(r => {
      if(r && r.error){ studentRefresh(true); const e = $('#exErr'); if(e) e.textContent = r.error; return; }
      if(r && r.autoSoc){ const n0 = (S.llm || []).length; autoSocratic(r.autoSoc); if((S.llm || []).length > n0) guideArrived(); }
      studentRefresh(true);
      const fb = document.querySelector('.fb'); if(fb) fb.scrollIntoView({block:'nearest'});
    });
  });
  const rs = $('#resetCode'); if(rs) rs.addEventListener('click', () => { rec.draft = ex.starter; studentRefresh(true); });
  const lr = $('#loadRef'); if(lr) lr.addEventListener('click', () => { rec.draft = ex.ref; studentRefresh(true); });
}
function renderExitS(ph){
  const L = S.lesson, les = LESSONS[L], st = lp(L), e = les.exit;
  const ans = st.exitDraft || (st.exitDraft = {});
  let html = '<div class="pad"><p class="eyebrow">Step 6 · Wrap up</p><h2>Wrap-up questions</h2><p class="notice">Answer on your own. Help is off for this step.</p>' +
    (st.hook.text ? '<div class="prompt"><span class="muted small">Your prediction at the start:</span><br>' + esc(st.hook.text) + '</div>' : '') + (e.intro ? '<p>' + esc(e.intro) + '</p>' : '');
  e.qs.forEach((q, qi) => {
    const res = st.exit && st.exit[qi];
    html += '<div class="exitq"><label for="exq' + qi + '">' + (qi+1) + '. ' + esc(q.q) + (q.ungraded ? ' <span class="muted small">(reflection, not marked)</span>' : '') + '</label>' +
      '<textarea class="free" id="exq' + qi + '" data-exitq="' + qi + '"' + (st.exit ? ' disabled' : '') + '>' + esc(ans[qi] || '') + '</textarea>' +
      (res && !q.ungraded ? '<div class="fb ' + res.status + '"><p class="fh">' + STATUS_HEAD[res.status] + '</p><p>Example answer: ' + esc(res.model || q.model || '') + '</p></div>' : '') + '</div>';
  });
  if(!st.exit) html += '<p class="err" id="exitErr" role="alert"></p><div class="actions"><button class="btn primary" id="exitSubmit">Submit wrap-up</button></div>';
  else {
    const cells = les.concepts.flatMap(K => LEVELS.map(lv => ({K, lv, p:pCell(K, lv)})));
    const got = cells.filter(c => c.p >= SOLID).length;
    html += '<div class="card-s done"><h3>Lesson ' + les.n + ' complete</h3><p>You reached "Got it" on ' + got + ' of ' + cells.length + ' skill levels in this lesson. My progress, on the right, shows the details.</p></div>';
  }
  ph.innerHTML = html + '</div>';
  ph.querySelectorAll('[data-exitq]').forEach(t => t.addEventListener('input', () => { ans[+t.dataset.exitq] = t.value; }));
  const b = $('#exitSubmit'); if(b) b.addEventListener('click', () => {
    if(e.qs.some((q, qi) => !q.ungraded && !(ans[qi] || '').trim())){ $('#exitErr').textContent = 'Answer the marked questions first.'; return; }
    b.disabled = true;
    act('exit', [L, ans]).then(r => { if(r && r.error){ studentRefresh(true); const x = $('#exitErr'); if(x) x.textContent = r.error; return; } studentRefresh(); });
  });
}

/* ---------------- side panel ---------------- */
function renderSide(){
  const tabs = [{k:'next', l:'Help'}, {k:'progress', l:'My progress'}, {k:'plan', l:'Suggestions'}];
  $('#sideTabs').innerHTML = tabs.map(t => '<button role="tab" aria-selected="' + (SV.tab === t.k) + '" class="tab' + (SV.tab === t.k ? ' on' : '') + '" data-tab="' + t.k + '">' + t.l + '</button>').join('');
  $('#sideTabs').querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { SV.tab = b.dataset.tab; renderSide(); }));
  const body = $('#sideBody');
  body.innerHTML = SV.tab === 'next' ? sideHelp() : SV.tab === 'progress' ? sideProgress() : sidePlan();
  wireSide(body);
}
function sideHelp(){
  if(S.arm === 'C') return '<div class="side-card"><h3>Help</h3><p>Help replies are not part of your version of the course. Use <b>Key terms</b> at the top, and the "Before you try again" notes after a check.</p></div>';
  const pol = policy(), avail = Object.keys(MODES).filter(m => pol[m]);
  if(!pol[S.mode] && avail.length) S.mode = avail[0];
  let h = '<div class="side-card"><h3>Help</h3><p class="why">' + esc(pol.why) + '</p>';
  if(avail.length){
    h += '<div class="mode-list" role="radiogroup" aria-label="Kind of help">' + Object.keys(MODES).map(m => '<button role="radio" aria-checked="' + (S.mode === m && pol[m]) + '" class="mode' + (S.mode === m && pol[m] ? ' on' : '') + '" data-mode="' + m + '"' + (pol[m] ? '' : ' disabled') + '>' + MODE_PLAIN[m] + (pol[m] ? '' : '<small> · not available now</small>') + '</button>').join('') + '</div>' +
      '<label class="sr" for="tutorQ">Your question</label><div class="ask"><input id="tutorQ" placeholder="' + (S.mode === 'socratic' ? 'Press Ask for a guiding question' : 'Type your question…') + '"><button class="btn primary" id="tutorAsk">Ask</button></div>';
  }
  const turns = S.llm.filter(r => r.lesson === S.lesson).slice(-6).reverse();
  h += turns.length ? '<div class="turns" aria-live="polite">' + turns.map(r => '<div class="turn' + (r.auto ? ' auto' : '') + '"><p class="tm">' + (r.auto ? 'A question for you' : MODE_PLAIN[r.mode]) + '</p>' + (r.q ? '<p class="tq">You asked: ' + esc(r.q) + '</p>' : '') + '<p>' + esc(r.delivered) + '</p></div>').join('') + '</div>' :
    '<p class="muted small">Guiding questions appear here by themselves after a wrong answer.</p>';
  return h + '</div>';
}
function sideProgress(){
  const L = S.lesson, les = LESSONS[L];
  let h = '<div class="side-card"><h3>My progress</h3>';
  if(!les.placeholder){
    const n = lessonProgress(L);
    h += '<p class="small">Lesson ' + les.n + ': ' + n + ' of 6 steps done</p><div class="bar big" aria-hidden="true"><span style="width:' + (n/6*100) + '%"></span></div>' +
      '<table class="skills"><caption class="sr">Skills in this lesson by level</caption><thead><tr><th scope="col">Skill</th>' + LEVELS.map(lv => '<th scope="col" title="' + LEVEL_PLAIN[lv] + '">' + LEVEL_PLAIN[lv].replace(' it', '') + '</th>').join('') + '</tr></thead><tbody>' +
      les.concepts.map(K => '<tr><th scope="row">' + esc(SKILL[K]) + '</th>' + LEVELS.map(lv => { const b = S.seen[K][lv] ? band(pCell(K, lv)) : 'unseen'; return '<td><span class="dotb ' + b + '" role="img" aria-label="' + LEVEL_PLAIN[lv] + ': ' + BAND_PLAIN[b] + '"></span></td>'; }).join('') + '</tr>').join('') +
      '</tbody></table><ul class="legend-s"><li><span class="dotb unseen"></span>Not tried yet</li><li><span class="dotb building"></span>Getting started</li><li><span class="dotb strength"></span>Getting there</li><li><span class="dotb solid"></span>Got it</li></ul>';
  }
  h += '<h4>Whole course</h4><ul class="course-list">' + LESSON_ORDER.filter(x => !LESSONS[x].placeholder).map(x => '<li><span>Lesson ' + LESSONS[x].n + '</span><span>' + (lessonDone(x) ? '✓ Complete' : lessonProgress(x) + ' of 6') + '</span></li>').join('') + '</ul></div>';
  return h;
}
function sidePlan(){
  const L = S.lesson, les = LESSONS[L];
  if(S.arm === 'C'){
    if(les.placeholder) return '<div class="side-card"><h3>Review list</h3><p>Nothing to review.</p></div>';
    const st = lp(L), missed = les.parts.filter(p => st.checks[p.id] && st.checks[p.id].wrong), exm = les.exercises.filter(e => st.ex[e.id] && st.ex[e.id].status && st.ex[e.id].status !== 'pass');
    return '<div class="side-card"><h3>Review list</h3>' + (missed.length || exm.length ? '<ul class="plan-list">' + missed.map(p => '<li><span>Re-read: ' + esc(p.title) + '</span><button class="btn sm" data-goto-part="' + p.id + '">Open</button></li>').join('') + exm.map(e => '<li><span>Try again: ' + esc(e.title) + '</span><button class="btn sm" data-goto-ex="' + e.id + '" data-goto-step="' + e.step + '">Open</button></li>').join('') + '</ul>' : '<p>Nothing to review yet. Items you miss appear here.</p>') + '</div>';
  }
  const plan = generatePlan();
  let h = '<div class="side-card"><h3>Suggestions for you</h3>';
  if(plan.empty) return h + '<p>' + esc(plan.advance ? 'You are doing well on everything you have tried in this lesson. Keep following "Next up".' : 'Suggestions appear after your first check or exercise.') + '</p></div>';
  h += plan.gate ? '<p>To open Lesson ' + LESSONS[L].n + ', build up <b>' + esc(SKILL[plan.focus.K]) + '</b> (' + LEVEL_PLAIN[plan.focus.lv].toLowerCase() + '). These would help most:</p><ol class="plan-list">'
    : '<p>Still building: <b>' + esc(SKILL[plan.focus.K]) + '</b> (' + LEVEL_PLAIN[plan.focus.lv].toLowerCase() + '). These would help most:</p><ol class="plan-list">';
  plan.actions.forEach((a, i) => {
    const label = a.kind === 'template' ? (a.tier === 'Tier 1' ? 'Study a worked example' : a.tier === 'Tier 2' ? 'Fill in a short code skeleton' : 'Compare a mistake with its fix') : a.kind === 'part' ? (a.tier === 'Prereq' ? 'Review an earlier idea: ' + SKILL[a.K] : 'Re-read with another explanation') : a.kind === 'lesson' ? a.title + ' (skills for this lesson are taught there)' : (a.L !== L ? 'Practise: ' + a.title : 'Try this exercise again: ' + a.title.replace(/^Retry \S+ · /, ''));
    h += '<li><span>' + esc(label) + ' <small class="muted">· ~' + a.min + ' min</small></span><button class="btn sm" data-plan="' + i + '">' + (a.kind === 'template' ? 'Show' : 'Go') + '</button><div id="gen' + i + '"></div></li>';
  });
  return h + '</ol></div>';
}
function wireSide(body){
  body.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { if(b.disabled) return; S.mode = b.dataset.mode; renderSide(); }));
  const ask = body.querySelector('#tutorAsk'), q = body.querySelector('#tutorQ');
  if(ask) ask.addEventListener('click', () => { const v = (q.value || '').trim(); if(!v && S.mode !== 'socratic'){ q.focus(); q.placeholder = 'Type a question first'; return; } askTutor(S.mode, v, 'student'); renderSide(); });
  if(q) q.addEventListener('keydown', e => { if(e.key === 'Enter') ask.click(); });
  body.querySelectorAll('[data-plan]').forEach(b => b.addEventListener('click', () => {
    const plan = generatePlan(), a = plan.actions[+b.dataset.plan]; if(!a) return;
    telem('plan-action', {kind:a.kind, K:a.K, tier:a.tier});
    if(a.kind === 'template'){
      const t = TEMPLATES[a.key], chk = selfCheck(t), box = body.querySelector('#gen' + b.dataset.plan);
      if(!chk.pass){ box.innerHTML = '<p class="muted small">This example is being reviewed. Try another suggestion.</p>'; telem('self-check-fail', {key:a.key, why:chk.why}); return; }
      box.innerHTML = '<div class="gen">' + (t.tier === 3 ? '<p class="small"><b>Before</b></p><pre>' + esc(t.before) + '</pre><p class="small"><b>After</b></p><pre>' + esc(t.after) + '</pre>' : '<pre>' + esc(t.code) + '</pre>') + '<p class="small"><b>Think about it:</b> ' + esc(t.socratic) + '</p></div>';
      act('template', [a.key]); return;
    }
    if(a.kind === 'part'){ S.lesson = a.L; const st = lp(a.L); st.step = 'learn'; st.part = LESSONS[a.L].parts.findIndex(p => p.id === a.part); const ck = st.checks[a.part]; if(ck && ck.submitted){ act('retryCheck', [a.L, st.part]).then(() => studentRefresh()); } }
    if(a.kind === 'lesson'){ S.lesson = a.L; }
    if(a.kind === 'exercise'){ S.lesson = a.L; const st = lp(a.L); st.step = a.step; st.cur[a.step] = a.ex; }
    studentRefresh(); $('#phase').scrollTop = 0;
  }));
  body.querySelectorAll('[data-goto-part]').forEach(b => b.addEventListener('click', () => { const st = lp(S.lesson); st.step = 'learn'; st.part = LESSONS[S.lesson].parts.findIndex(p => p.id === b.dataset.gotoPart); studentRefresh(); }));
  body.querySelectorAll('[data-goto-ex]').forEach(b => b.addEventListener('click', () => { const st = lp(S.lesson); st.step = b.dataset.gotoStep; st.cur[b.dataset.gotoStep] = b.dataset.gotoEx; studentRefresh(); }));
}
/* ================================================================
   PQC LAB v4 — TEACHER CONSOLE (separate interface, #teacher)
   ================================================================ */
const TV = {sec:'overview', arm:'all', student:null, lesson:'L1', itemL:'L1', sort:{k:'id', dir:1}, filterL:'all', q:'', matrixMode:'mean', toast:''};
const SECTIONS = [
  {k:'overview', l:'Overview', d:'Where the class is and who needs attention'},
  {k:'students', l:'Students', d:'Roster, filters and each learner in detail'},
  {k:'matrix', l:'Class matrix', d:'The 72 skill cells across the class'},
  {k:'items', l:'Item analysis', d:'How each check and exercise performs'},
  {k:'flags', l:'Misuse flags', d:'What the detector catches, by lesson'},
  {k:'integrity', l:'Session integrity', d:'Resets, blocked pastes and shortcuts'},
  {k:'lessons', l:'Lessons & release', d:'Open, gate or close lessons; view answer keys'},
  {k:'config', l:'Settings', d:'Tutor rules, thresholds, banned terms'},
  {k:'data', l:'Data & export', d:'Exports, data dictionary, lab checklist'},
];
const RULE_ADVICE = {
  'BM-1':'Revisit Lesson 2, Part 1: register the provider before naming it.',
  'BM-2':'Revisit Lesson 4, Part 2: pin "BC" in every getInstance.',
  'M1':'Revisit Lesson 2, Part 3: never seed SecureRandom with a constant; compare two runs.',
  'SF-01':'Revisit Lesson 3, Parts 1–2: state the set and check the 1088-byte ciphertext.',
  'SF-05':'Revisit Lesson 4, Part 1: register only BC; guard keys with instanceof MLKEMKey.',
  'KDF':'Revisit Lesson 2, Part 2: KDF arguments must match on both sides.',
  'LEAK':'Remind: error paths print exception classes, never key bytes.',
  'SWALLOW':'Revisit Lesson 2, Part 3: catch GeneralSecurityException, report, stop.',
  'ASSERT':'Revisit Lesson 3, Part 2: assert is off without -ea; throw instead.',
};

function teacherShell(){
  S.preview = false; S.armed = false;
  document.body.className = 'teacher';
  $('#app').innerHTML =
    '<header class="t-head"><a class="brand" href="#teacher"><span class="glyph">ML-KEM</span><span>PQC Lab</span></a><span class="t-role">Teacher console</span>' +
    '<div class="t-scope" role="group" aria-label="Scope"><span class="muted small">Showing</span><div class="seg" id="armSeg">' + [['all','All students'],['T','Arm T'],['C','Arm C']].map(([k, l]) => '<button data-arm="' + k + '" aria-pressed="' + (TV.arm === k) + '" class="' + (TV.arm === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div></div>' +
    '<div class="t-actions"><button class="btn" id="previewBtn">Preview as a student</button><a class="btn ghost" href="#student">Student view</a></div></header>' +
    '<div class="t-main"><nav class="t-nav" aria-label="Console sections"><ul>' + SECTIONS.map(s => '<li><button data-sec="' + s.k + '" class="' + (TV.sec === s.k ? 'on' : '') + '"' + (TV.sec === s.k ? ' aria-current="page"' : '') + '><span>' + s.l + '</span><small>' + s.d + '</small></button></li>').join('') + '</ul></nav>' +
    '<main class="t-body" id="tbody" tabindex="-1"></main></div><div class="toast" id="toast" role="status" aria-live="polite"></div>';
  $('#armSeg').querySelectorAll('[data-arm]').forEach(b => b.addEventListener('click', () => { TV.arm = b.dataset.arm; teacherShell(); }));
  $('#app').querySelectorAll('[data-sec]').forEach(b => b.addEventListener('click', async () => { TV.sec = b.dataset.sec; TV.student = null; if(MODE === 'teacher' && typeof refreshRecords === 'function') await refreshRecords(); teacherShell(); $('#tbody').focus(); }));
  $('#previewBtn').addEventListener('click', () => { S.preview = true; location.hash = '#student'; });
  UI.refresh = () => teacherShell();
  renderTeacherBody();
}
function toast(msg){ const t = $('#toast'); if(!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 1800); }
function synthNote(){ if(MODE === 'teacher' && !SETTINGS.showSample) return RECORDS.length ? '' : '<p class="synth">No students have signed in yet. Create sign-in codes under Settings, or switch on the sample cohort there to try the console.</p>'; return '<p class="synth">Sample cohort: 24 synthetic students for interface testing, plus the learner using this browser' + (SETTINGS.includeLive ? '' : ' (hidden)') + '. Both arms come from the same distribution, so no difference between arms is implied.</p>'; }
function renderTeacherBody(){
  const b = $('#tbody'), sec = SECTIONS.find(s => s.k === TV.sec);
  let h = '<div class="t-pad"><h1>' + sec.l + '</h1><p class="muted">' + sec.d + '.</p>' + (['overview','students','matrix','items','flags','integrity'].includes(TV.sec) ? synthNote() : '');
  h += ({overview:tOverview, students:tStudents, matrix:tMatrix, items:tItems, flags:tFlags, integrity:tIntegrity, lessons:tLessons, config:tSettings, data:tData})[TV.sec]();
  b.innerHTML = h + '</div>';
  wireTeacher(b);
}

/* ---------------- shared stats ---------------- */
function pct(n, d){ return d ? Math.round(100 * n / d) : 0; }
function itemStats(recs, L){
  return LESSONS[L].exercises.map(ex => {
    const rs = recs.map(r => r.ex[L + '.' + ex.id]).filter(Boolean);
    const c = {pass:0, partial:0, miss:0}; let tries = 0, first = 0;
    rs.forEach(x => { c[x.status] = (c[x.status] || 0) + 1; tries += x.attempts; if(x.status === 'pass' && x.attempts === 1) first++; });
    return {ex, n:rs.length, ...c, first, tries: rs.length ? tries / rs.length : 0};
  });
}
function checkStats(recs, L){
  return LESSONS[L].parts.map(p => { const rs = recs.map(r => r.checks[L + p.id]).filter(Boolean); return {p, n:rs.length, pass:rs.filter(x => x === 'pass').length}; });
}
function flagTable(recs){
  const t = {};
  recs.forEach(r => Object.entries(r.flags).forEach(([k, v]) => {
    const [cls, L] = k.split('|');
    t[cls] = t[cls] || {total:0, students:new Set(), by:{}};
    t[cls].total += v; t[cls].students.add(r.id); t[cls].by[L] = (t[cls].by[L] || 0) + v;
  }));
  return t;
}
function stackBar(c, n){
  if(!n) return '<span class="muted small">no attempts</span>';
  return '<span class="stack" role="img" aria-label="' + pct(c.pass, n) + '% passed, ' + pct(c.partial, n) + '% partly, ' + pct(c.miss, n) + '% not yet"><span class="s-pass" style="width:' + pct(c.pass, n) + '%"></span><span class="s-part" style="width:' + pct(c.partial, n) + '%"></span><span class="s-miss" style="width:' + pct(c.miss, n) + '%"></span></span>';
}

/* ---------------- Overview ---------------- */
function tOverview(){
  const recs = scopeRecords(TV.arm);
  const done = AUTHORED.map(L => recs.filter(r => r.lessons[L] && r.lessons[L].done).length);
  const flags = flagTable(recs), flagTotal = Object.values(flags).reduce((a, f) => a + f.total, 0);
  const attention = recs.map(r => ({r, why:needsAttention(r)})).filter(x => x.why.length);
  let items = [];
  AUTHORED.forEach(L => itemStats(recs, L).forEach(s => { if(s.n >= 4) items.push({L, ...s}); }));
  items.sort((a, b) => a.first / a.n - b.first / b.n);
  let h = '<div class="kpis">' +
    '<div class="kpi"><span class="kv">' + recs.length + '</span><span class="kl">students in view</span></div>' +
    AUTHORED.map((L, i) => '<div class="kpi"><span class="kv">' + done[i] + '</span><span class="kl">finished Lesson ' + LESSONS[L].n + '</span></div>').join('') +
    '<div class="kpi warn"><span class="kv">' + attention.length + '</span><span class="kl">need attention</span></div>' +
    '<div class="kpi"><span class="kv">' + flagTotal + '</span><span class="kl">misuse flags</span></div>' +
    '<div class="kpi"><span class="kv">' + recs.reduce((a, r) => a + integ(r).resets, 0) + '</span><span class="kl">session resets</span></div></div>';
  h += '<div class="grid2"><section class="panel"><h2>Needs attention</h2>' + (attention.length ? '<ul class="att">' + attention.slice(0, 8).map(x => '<li><button class="link" data-open-student="' + esc(x.r.id) + '">' + esc(x.r.id) + '</button><span class="muted small">Arm ' + x.r.arm + ' · L' + LESSONS[x.r.current.L].n + ' ' + STEP_PLAIN[x.r.current.step].label + '</span><span class="why">' + esc(x.why.join(' · ')) + '</span></li>').join('') + '</ul>' + (attention.length > 8 ? '<p class="muted small">' + (attention.length - 8) + ' more in Students.</p>' : '') : '<p>No one is flagged right now.</p>') + '</section>' +
    '<section class="panel"><h2>Hardest items</h2><p class="muted small">Lowest first-try pass rate, at least 4 students. Bar: best result after all tries.</p><table class="t compact"><thead><tr><th scope="col">Item</th><th scope="col">First try</th><th scope="col">Best result</th></tr></thead><tbody>' +
    items.slice(0, 6).map(s => '<tr><td>L' + LESSONS[s.L].n + ' ' + s.ex.id + ' · ' + esc(s.ex.title) + '</td><td class="num">' + pct(s.first, s.n) + '%</td><td>' + stackBar(s, s.n) + '</td></tr>').join('') + '</tbody></table></section></div>';
  h += '<section class="panel"><h2>Where students are</h2><p class="muted small">Current step of each student in view.</p><div class="tbl-wrap"><table class="t heat"><thead><tr><th scope="col">Lesson</th>' + STEPS.map(s => '<th scope="col">' + STEP_PLAIN[s.id].label + '</th>').join('') + '<th scope="col">Finished</th></tr></thead><tbody>' +
    AUTHORED.map(L => { const row = STEPS.map(s => recs.filter(r => r.current.L === L && r.current.step === s.id && !(r.lessons[L] && r.lessons[L].done)).length); const fin = recs.filter(r => r.lessons[L] && r.lessons[L].done).length; const mx = Math.max(1, recs.length);
      return '<tr><th scope="row">Lesson ' + LESSONS[L].n + '</th>' + row.map(v => '<td class="hcell" style="--a:' + (v / mx).toFixed(2) + '">' + (v || '') + '</td>').join('') + '<td class="num">' + fin + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
  const fl = Object.entries(flags).sort((a, b) => b[1].total - a[1].total).slice(0, 4);
  h += '<section class="panel"><h2>Most common misuse flags</h2>' + (fl.length ? '<ul class="flag-sum">' + fl.map(([cls, f]) => '<li><b>' + cls + '</b> ' + esc(RULES[cls].desc) + ' <span class="muted small">· ' + f.total + ' flags, ' + f.students.size + ' students</span><br><span class="small">' + esc(RULE_ADVICE[cls]) + '</span></li>').join('') + '</ul>' : '<p>No flags yet.</p>') + '</section>';
  return h;
}

/* ---------------- Students ---------------- */
function tStudents(){
  if(TV.student) return tStudentDetail(TV.student);
  let recs = scopeRecords(TV.arm);
  if(TV.filterL !== 'all') recs = recs.filter(r => r.current.L === TV.filterL);
  if(TV.q) recs = recs.filter(r => r.id.toLowerCase().includes(TV.q.toLowerCase()));
  const rows = recs.map(r => {
    const w = weakestCell(r), fl = Object.values(r.flags).reduce((a, b) => a + b, 0), att = needsAttention(r);
    return {r, w, fl, att, done:AUTHORED.filter(L => r.lessons[L] && r.lessons[L].done).length, cur:LESSONS[r.current.L].n * 10 + stepIndex(r.current.step)};
  });
  const key = {id:x => x.r.live ? '' : x.r.id, arm:x => x.r.arm, cur:x => x.cur, done:x => x.done, active:x => x.r.minutesAgo, flags:x => x.fl, resets:x => integ(x.r).resets, weak:x => x.w ? x.w.p : 9, att:x => -x.att.length}[TV.sort.k];
  rows.sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0) * TV.sort.dir);
  const th = (k, l) => '<th scope="col" aria-sort="' + (TV.sort.k === k ? (TV.sort.dir > 0 ? 'ascending' : 'descending') : 'none') + '"><button class="sortbtn" data-sort="' + k + '">' + l + (TV.sort.k === k ? (TV.sort.dir > 0 ? ' ▲' : ' ▼') : '') + '</button></th>';
  return '<div class="filters"><label>Lesson <select id="fLesson"><option value="all">All</option>' + AUTHORED.map(L => '<option value="' + L + '"' + (TV.filterL === L ? ' selected' : '') + '>Lesson ' + LESSONS[L].n + '</option>').join('') + '</select></label>' +
    '<label>Search <input id="fSearch" value="' + esc(TV.q) + '" placeholder="Student ID"></label><span class="muted small">' + rows.length + ' students</span></div>' +
    '<div class="tbl-wrap"><table class="t roster"><thead><tr>' + th('id', 'Student') + th('arm', 'Arm') + th('cur', 'Now at') + th('done', 'Lessons done') + th('active', 'Last active') + th('flags', 'Flags') + th('resets', 'Resets') + th('weak', 'Weakest skill') + th('att', 'Attention') + '</tr></thead><tbody>' +
    rows.map(x => '<tr' + (x.r.live ? ' class="live"' : '') + '><td><button class="link" data-open-student="' + esc(x.r.id) + '">' + esc(x.r.id) + '</button></td><td>' + x.r.arm + '</td><td>L' + LESSONS[x.r.current.L].n + ' · ' + STEP_PLAIN[x.r.current.step].label + '</td><td class="num">' + x.done + ' / 4</td><td>' + agoText(x.r.minutesAgo) + '</td><td class="num">' + (x.fl || '') + '</td><td class="num">' + (integ(x.r).resets || '') + '</td>' +
      '<td>' + (x.w ? '<span class="badge ' + band(x.w.p) + '">' + x.w.K + '·' + x.w.lv + ' ' + x.w.p.toFixed(2) + '</span>' : '<span class="muted small">no evidence</span>') + '</td><td class="small">' + esc(x.att.join(' · ')) + '</td></tr>').join('') + '</tbody></table></div>';
}
function findRecord(id){ return id === liveRecord().id ? liveRecord() : (RECORDS.find(r => r.id === id) || cohort().find(r => r.id === id)); }
function heatmap(rec){
  return '<div class="tbl-wrap"><table class="mx"><caption class="sr">Mastery per skill and level</caption><thead><tr><th scope="col">Skill</th>' + LEVELS.map(lv => '<th scope="col">' + lv + '<br><small>' + LEVEL_INFO[lv].name + '</small></th>').join('') + '</tr></thead><tbody>' +
    ['A','B','C','D'].map(cat => '<tr class="cat"><th scope="rowgroup" colspan="5">' + cat + ' · ' + CAT_NAMES[cat] + '</th></tr>' + Object.keys(CONCEPTS).filter(K => CONCEPTS[K].cat === cat).map(K => '<tr><th scope="row">' + K + ' <span class="muted">' + esc(CONCEPTS[K].name) + '</span></th>' + LEVELS.map(lv => {
      const sn = rec.seen[K][lv], p = pFrom(rec, K, lv);
      return '<td class="c ' + (sn ? band(p) : 'unseen') + '" title="' + K + '·' + lv + ' P=' + p.toFixed(2) + '">' + (sn ? p.toFixed(2) : '–') + '</td>';
    }).join('') + '</tr>').join('')).join('') + '</tbody></table></div>';
}
function tStudentDetail(id){
  const r = findRecord(id); if(!r) return '<p>Not found.</p>';
  let h = '<p><button class="btn ghost" id="backRoster">← All students</button></p><h2>' + esc(r.id) + ' <span class="muted small">Arm ' + r.arm + (r.synthetic ? ' · synthetic' : ' · live in this browser') + '</span></h2>';
  h += '<div class="kpis">' + AUTHORED.map(L => { const l = r.lessons[L]; return '<div class="kpi"><span class="kv small">' + (l ? (l.done ? 'Done' : STEP_PLAIN[l.step].label) : '—') + '</span><span class="kl">Lesson ' + LESSONS[L].n + '</span></div>'; }).join('') +
    '<div class="kpi"><span class="kv">' + Object.values(r.flags).reduce((a, b) => a + b, 0) + '</span><span class="kl">misuse flags</span></div>' +
    '<div class="kpi' + (integ(r).resets ? ' warn' : '') + '"><span class="kv">' + integ(r).resets + '</span><span class="kl">session resets</span></div></div>';
  if(r.server) h += serverActionsHTML(r);
  if(r.live) h += '<div class="actions"><button class="btn" id="liveArm">Switch this learner to Arm ' + (r.arm === 'T' ? 'C' : 'T') + '</button><button class="btn" id="liveReset">Reset this learner</button><button class="btn" id="livePreview">Open their view</button></div>';
  h += '<div class="grid2"><section class="panel"><h3>Skill matrix</h3>' + heatmap(r) + '</section><section class="panel"><h3>Exercise results</h3>' +
    (AUTHORED.some(L => r.lessons[L]) ? '' : '<p class="muted">No lessons started yet.</p>') +
    AUTHORED.filter(L => r.lessons[L]).map(L => '<h4>Lesson ' + LESSONS[L].n + '</h4><ul class="chips-row">' + LESSONS[L].exercises.map(ex => { const x = r.ex[L + '.' + ex.id], sym = x ? {pass:'✓', partial:'~', miss:'×'}[x.status] : '·'; return '<li class="chipx ' + (x ? x.status : 'none') + '" title="' + esc(ex.title) + '">' + ex.id + ' ' + sym + (x && x.attempts > 1 ? '<span class="sr"> after ' + x.attempts + ' tries</span><sup aria-hidden="true">' + x.attempts + '</sup>' : '') + '</li>'; }).join('') + '</ul>').join('') +
    '<ul class="legend-s"><li><span class="chipx pass">✓</span>passed</li><li><span class="chipx partial">~</span>partly</li><li><span class="chipx miss">×</span>not yet</li><li><span class="chipx none">·</span>not tried</li><li>small number = tries</li></ul></section></div>';
  if(r.live){
    const pred = AUTHORED.filter(L => S.les[L] && S.les[L].hook.text);
    h += '<section class="panel"><h3>Predictions and wrap-up answers</h3>' + (pred.length ? pred.map(L => '<p><b>Lesson ' + LESSONS[L].n + ' prediction:</b> ' + esc(S.les[L].hook.text) + '</p>' + (S.les[L].exitDraft ? Object.entries(S.les[L].exitDraft).map(([i, t]) => '<p class="small"><b>Wrap-up ' + (+i+1) + ':</b> ' + esc(t) + '</p>').join('') : '')).join('') : '<p class="muted">None yet.</p>') + '</section>';
    h += '<section class="panel"><h3>Help transcript</h3>' + (S.llm.length ? '<table class="t compact"><thead><tr><th scope="col">Lesson</th><th scope="col">Mode</th><th scope="col">Trigger</th><th scope="col">Filter</th><th scope="col">Reply</th></tr></thead><tbody>' + S.llm.slice(-20).reverse().map(x => '<tr><td>' + x.lesson + '</td><td>' + x.mode + '</td><td>' + esc(x.trigger) + '</td><td>' + (x.filter === 'passed' ? 'passed' : '<span class="badge building">fallback</span>') + '</td><td class="small">' + esc(x.delivered) + '</td></tr>').join('') + '</tbody></table>' : '<p class="muted">No help used yet.</p>') + '</section>';
  } else if(r.server) h += serverDetailHTML(r);
  else h += '<p class="muted small">Predictions, wrap-up answers and help transcripts are available for real learners; synthetic records have none.</p>';
  return h;
}

/* ---------------- Class matrix ---------------- */
function tMatrix(){
  const recs = scopeRecords(TV.arm);
  let h = '<div class="filters"><div class="seg" role="group" aria-label="Show">' + [['mean','Average mastery'],['solid','% at "Got it"'],['n','Students with evidence']].map(([k, l]) => '<button data-mmode="' + k + '" aria-pressed="' + (TV.matrixMode === k) + '" class="' + (TV.matrixMode === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div></div>';
  h += '<div class="tbl-wrap"><table class="mx big"><caption class="sr">Class mastery per skill and level</caption><thead><tr><th scope="col">Skill</th>' + LEVELS.map(lv => '<th scope="col">' + lv + ' ' + LEVEL_INFO[lv].name + '<br><small>Type ' + LEVEL_INFO[lv].type + '</small></th>').join('') + '</tr></thead><tbody>' +
    ['A','B','C','D'].map(cat => '<tr class="cat"><th scope="rowgroup" colspan="5">' + cat + ' · ' + CAT_NAMES[cat] + '</th></tr>' + Object.keys(CONCEPTS).filter(K => CONCEPTS[K].cat === cat).map(K => '<tr><th scope="row">' + K + ' <span class="muted">' + esc(CONCEPTS[K].name) + '</span></th>' + LEVELS.map(lv => {
      const ev = recs.filter(r => r.seen[K][lv]), ps = ev.map(r => pFrom(r, K, lv));
      if(!ev.length) return '<td class="c unseen">–</td>';
      const mean = ps.reduce((a, b) => a + b, 0) / ps.length, solid = ps.filter(p => p >= SOLID).length;
      const val = TV.matrixMode === 'mean' ? mean.toFixed(2) : TV.matrixMode === 'solid' ? pct(solid, ps.length) + '%' : ev.length;
      return '<td class="c ' + band(TV.matrixMode === 'solid' ? solid / ps.length : mean) + '" title="' + K + '·' + lv + ': mean ' + mean.toFixed(2) + ', ' + solid + ' of ' + ev.length + ' at Got it">' + val + '</td>';
    }).join('') + '</tr>').join('')).join('') + '</tbody></table></div>' +
    '<ul class="legend-s"><li><span class="dotb building"></span>below ' + BUILDING.toFixed(2) + '</li><li><span class="dotb strength"></span>' + BUILDING.toFixed(2) + '–' + SOLID.toFixed(2) + '</li><li><span class="dotb solid"></span>' + SOLID.toFixed(2) + ' and above</li><li><span class="dotb unseen"></span>no evidence</li></ul>' +
    '<p class="muted small">Each cell averages only students with evidence in that cell. P = σ(β + γ·S − ρ·F); level weights L2 1.0 · L3 1.5 · L4 2.0 · L6 2.5.</p>';
  return h;
}

/* ---------------- Item analysis ---------------- */
function tItems(){
  const recs = scopeRecords(TV.arm), L = TV.itemL;
  const ex = itemStats(recs, L), ck = checkStats(recs, L);
  let h = '<div class="filters"><div class="seg" role="group" aria-label="Lesson">' + AUTHORED.map(x => '<button data-iteml="' + x + '" aria-pressed="' + (L === x) + '" class="' + (L === x ? 'on' : '') + '">Lesson ' + LESSONS[x].n + '</button>').join('') + '</div></div>';
  h += '<section class="panel"><h2>Exercises</h2><div class="tbl-wrap"><table class="t"><thead><tr><th scope="col">Item</th><th scope="col">Type</th><th scope="col">Feeds</th><th scope="col">Tried</th><th scope="col">First try</th><th scope="col">Best: pass / partly / not yet</th><th scope="col">Avg tries</th><th scope="col">Review?</th></tr></thead><tbody>' +
    ex.map(s => { const pr = s.n ? s.first / s.n : 0, rev = s.n >= 5 && (pr < 0.3 ? 'Hard: check wording and rubric' : pr > 0.9 ? 'Easy: consider a harder variant' : '');
      return '<tr><td>' + s.ex.id + ' · ' + esc(s.ex.title) + '</td><td>' + s.ex.type + '</td><td class="small">' + s.ex.cells.map(cellTag).join(', ') + '</td><td class="num">' + s.n + '</td><td class="num">' + pct(s.first, s.n) + '%</td><td>' + stackBar(s, s.n) + '</td><td class="num">' + s.tries.toFixed(1) + '</td><td class="small">' + (rev ? '<span class="badge building">' + rev + '</span>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
  h += '<section class="panel"><h2>Learn checks</h2><table class="t compact"><thead><tr><th scope="col">Part</th><th scope="col">Answered</th><th scope="col">All correct first time</th></tr></thead><tbody>' +
    ck.map(c => '<tr><td>' + esc(c.p.title) + '</td><td class="num">' + c.n + '</td><td class="num">' + pct(c.pass, c.n) + '%</td></tr>').join('') + '</tbody></table>' +
    '<p class="muted small">Review flag: first-try pass rate below 30% or above 90%, with at least 5 students.</p></section>';
  return h;
}

/* ---------------- Misuse flags ---------------- */
function tFlags(){
  const t = flagTable(scopeRecords(TV.arm));
  return '<div class="tbl-wrap"><table class="t"><thead><tr><th scope="col">Rule</th><th scope="col">What it catches</th><th scope="col">Kind</th>' + AUTHORED.map(L => '<th scope="col">L' + LESSONS[L].n + '</th>').join('') + '<th scope="col">Total</th><th scope="col">Students</th><th scope="col">Teaching move</th></tr></thead><tbody>' +
    Object.keys(RULES).map(cls => { const f = t[cls] || {total:0, students:new Set(), by:{}};
      return '<tr><td><b>' + cls + '</b></td><td>' + esc(RULES[cls].desc) + '</td><td><span class="badge ' + (RULES[cls].sev === 'silent' ? 'strength' : RULES[cls].sev === 'loud' ? 'building' : 'unseen') + '">' + RULES[cls].sev + '</span></td>' + AUTHORED.map(L => '<td class="num">' + (f.by[L] || '') + '</td>').join('') + '<td class="num">' + (f.total || '') + '</td><td class="num">' + (f.students.size || '') + '</td><td class="small">' + esc(RULE_ADVICE[cls]) + '</td></tr>'; }).join('') +
    '</tbody></table></div><p class="muted small">Silent flags matter most: the code runs and looks fine. The same nine rules check every generated example before a student sees it.</p>';
}

/* ---------------- Lessons & release ---------------- */
function tLessons(){
  const L = TV.lesson, les = LESSONS[L];
  let h = '<div class="filters"><div class="seg" role="group" aria-label="Lesson">' + LESSON_ORDER.map(x => '<button data-tlesson="' + x + '" aria-pressed="' + (L === x) + '" class="' + (L === x ? 'on' : '') + '">L' + LESSONS[x].n + '</button>').join('') + '</div></div>';
  h += '<section class="panel"><h2>Lesson ' + les.n + ' · ' + esc(les.title) + '</h2>';
  if(les.placeholder) return h + '<p>' + esc(les.outline) + '</p><p class="muted">Planned concepts: ' + les.concepts.join(', ') + '.</p></section>';
  const rel = SETTINGS.release[L];
  h += '<fieldset class="release"><legend>Availability</legend>' + [['gated','Gated: opens when the learner model reaches the gate'],['open','Open to everyone now'],['closed','Closed']].map(([k, l]) => '<label><input type="radio" name="rel" value="' + k + '"' + (rel === k ? ' checked' : '') + '> ' + l + '</label>').join('') + '</fieldset>';
  const cells = SETTINGS.gates[L] || [];
  h += cells.length ? '<h3>Gate</h3><table class="t compact"><thead><tr><th scope="col">Skill cell</th><th scope="col">Minimum</th></tr></thead><tbody>' + cells.map((c, i) => '<tr><td>' + c[0] + '·' + c[1] + ' <span class="muted small">' + esc(SKILL[c[0]]) + ', ' + LEVEL_PLAIN[c[1]].toLowerCase() + '</span></td><td><input type="number" min="0" max="1" step="0.05" value="' + c[2].toFixed(2) + '" data-gate="' + i + '" aria-label="Minimum for ' + c[0] + '·' + c[1] + '"></td></tr>').join('') + '</tbody></table>' : '<p class="muted small">Lesson 1 has no gate.</p>';
  h += '<div class="actions"><button class="btn" data-preview-lesson="' + L + '">Preview this lesson as a student</button></div></section>';
  h += '<section class="panel"><h2>Content and answer keys</h2>' +
    '<details><summary>Hook: ' + esc(les.hook.title) + '</summary><p>' + esc(les.hook.prompt) + '</p><p class="small"><b>Facilitator note.</b> ' + esc(les.hook.instr || '') + '</p></details>' +
    les.parts.map((p, i) => '<details><summary>Part ' + (i+1) + ': ' + esc(p.title) + ' <span class="muted small">· ' + p.concepts.join(', ') + '</span></summary><p class="small"><b>Big idea.</b> ' + p.bigIdea + '</p><ol class="small">' + p.checks.map(q => '<li>' + esc(q.q) + ' <b>→ ' + esc(q.opts[q.a]) + '</b></li>').join('') + '</ol><p class="small"><b>Re-teach.</b> ' + esc(p.reteach) + '</p><p class="small"><b>Facilitator note.</b> ' + esc(p.instr || '') + '</p></details>').join('') +
    '<h3>Exercises</h3>' + les.exercises.map(ex => '<details><summary>' + ex.id + ' · ' + esc(ex.title) + ' <span class="muted small">· Type ' + ex.type + ' · ' + ex.cells.map(cellTag).join(', ') + '</span></summary>' +
      '<p class="small"><b>Model answer.</b> ' + esc(ex.model || '') + '</p>' + (ex.criteria ? '<p class="small"><b>Rubric</b></p><ul class="small">' + ex.criteria.map(c => '<li>' + esc(c.label) + '</li>').join('') + '</ul>' : '') +
      (ex.checks ? '<p class="small"><b>Checks</b></p><ul class="small">' + ex.checks.map(c => '<li>' + esc(c.label) + '</li>').join('') + '</ul>' : '') +
      (ex.soc ? '<p class="small"><b>Guiding question.</b> ' + esc(ex.soc) + '</p>' : '') + (ex.instr ? '<p class="small">' + esc(ex.instr) + '</p>' : '') +
      (ex.ref ? '<details><summary class="small">Reference solution</summary><pre class="code-s">' + esc(ex.ref) + '</pre></details>' : '') + '</details>').join('') +
    '<h3>Misconceptions to watch for</h3><ul class="small">' + (les.instr.misconceptions || []).map(m => '<li>' + esc(m) + '</li>').join('') + '</ul></section>';
  return h;
}

/* ---------------- Settings ---------------- */
function tSettings(){
  let h = '<section class="panel"><h2>Help (tutor) rules</h2><p class="muted small">When each kind of help is available in Arm T. Arm C never has help. Changes apply right away in this browser.</p><div class="tbl-wrap"><table class="t"><thead><tr><th scope="col">Step</th>' + Object.keys(MODES).map(m => '<th scope="col">' + MODES[m].label + '</th>').join('') + '</tr></thead><tbody>' +
    POLICY_ROWS.map(r => '<tr><th scope="row">' + r.label + '</th>' + Object.keys(MODES).map(m => '<td><select data-pol="' + r.k + '|' + m + '" aria-label="' + r.label + ', ' + MODES[m].label + '">' + Object.keys(POLICY_VALUES).map(v => '<option value="' + v + '"' + (SETTINGS.policy[r.k][m] === v ? ' selected' : '') + '>' + POLICY_VALUES[v] + '</option>').join('') + '</select></td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
    '<p class="note-w">Keep Create and Exit ticket off: they are the unaided evidence the study relies on.</p></section>';
  if(MODE === 'teacher') h = tClassPanel() + h;
  h += tSecureSettings();
  h += '<section class="panel"><h2>Banned terms before first attempt</h2><p class="muted small">The help may not use these words until the student has attempted the listed exercises, so it cannot give the answer away.</p>' +
    AUTHORED.map(L => '<h3>Lesson ' + LESSONS[L].n + '</h3>' + (SETTINGS.bans[L] || []).map((b, i) => '<div class="banrow"><label>Terms <input data-ban="' + L + '|' + i + '|terms" value="' + esc(b.terms.join(', ')) + '"></label><label>Lifted after <input data-ban="' + L + '|' + i + '|until" value="' + esc(b.until.join(', ')) + '"></label></div>').join('')).join('') + '</section>';
  h += '<section class="panel"><h2>Mastery thresholds</h2><div class="banrow"><label>"Getting there" from <input type="number" min="0.05" max="0.95" step="0.05" id="thB" value="' + SETTINGS.thresholds.building.toFixed(2) + '"></label><label>"Got it" from <input type="number" min="0.1" max="0.99" step="0.05" id="thS" value="' + SETTINGS.thresholds.solid.toFixed(2) + '"></label></div>' +
    '<p class="muted small">PFA parameters (β, γ, ρ) stay fixed until they are fitted on pilot data.</p></section>';
  h += '<section class="panel"><h2>This browser\'s learner</h2><div class="banrow"><label>Study arm <select id="liveArmSel"><option value="T"' + (S.arm === 'T' ? ' selected' : '') + '>Arm T · adaptive</option><option value="C"' + (S.arm === 'C' ? ' selected' : '') + '>Arm C · fixed</option></select></label>' +
    '<label class="chk"><input type="checkbox" id="incLive"' + (SETTINGS.includeLive ? ' checked' : '') + '> Include in class views</label></div>' +
    '<div class="actions"><button class="btn" id="resetSettings">Restore default settings</button></div></section>';
  return h;
}

/* ---------------- Data & export ---------------- */
const VM_CHECKS = [
  ['getParameterSpec().getName() for each set', '"ML-KEM-512", "ML-KEM-768", "ML-KEM-1024"'],
  ['getAlgorithm() for BC ML-KEM keys', 'Same as the set name, e.g. "ML-KEM-768" (the JDK\'s own keys say just "ML-KEM")'],
  ['BC\'s default set when initialize is skipped', 'ML-KEM-768'],
  ['EC spec passed to ML-KEM (L2 C2)', 'initialize accepts it; generateKeyPair throws NullPointerException'],
  ['Wrong-length ciphertext (L3)', 'One byte short: ArrayIndexOutOfBoundsException. One byte long: no exception, different key'],
  ['Seeded SHA1PRNG across runs (L2 C3)', 'Identical key pairs and ciphertexts'],
  ['BCPQC "ML-KEM-768" in 1.79 (L4)', 'BCKyberPublicKey; BC rejects it with ClassCastException'],
  ['SecretKeyWithEncapsulation.destroy() (L2 D1)', 'Throws DestroyFailedException'],
  ['Tampered ciphertext (L3)', 'No exception, different key; AES-GCM then fails with AEADBadTagException'],
  ['Unpinned getInstance("ML-KEM") with BC appended (L2, L4)', 'JDK 21.0.12: no built-in ML-KEM. JDK 21.0.13 and 25: SunJCE answers'],
  ['Encoded key sizes (L3)', 'Public key DER: 822 / 1206 / 1590 bytes. Private key: 86 bytes (seed form) for every set'],
];
function tData(){
  const dict = [['observe','One piece of evidence: concept, level, success/failure, weight, P after'],['check','A Learn check submitted: part, number wrong'],['exercise-submit','An exercise attempt: id, type, outcome, attempt number'],['detector','A misuse rule fired on submitted code'],['llm','A help exchange: mode, trigger, filter verdict'],['hook-commit','Prediction locked in (length, vote)'],['exit-submit','Wrap-up submitted with outcomes'],['plan-action','A suggestion followed'],['integrity','Session protection: window left (reset, with what was dropped), paste / drop / bulk insert blocked, shortcut blocked'],['step / part-open / exercise-open','Navigation']];
  return '<section class="panel"><h2>Export</h2><div class="actions wrap"><button class="btn" data-export="roster">Roster (CSV)</button><button class="btn" data-export="items">Item analysis (CSV)</button><button class="btn" data-export="telemetry">' + (MODE === 'teacher' ? 'Class event log (JSON)' : 'This browser\'s event log (JSON)') + '</button><button class="btn" data-export="llm">Help transcript (JSON)</button><button class="btn" data-export="integrity">Session integrity log (CSV)</button></div><p class="muted small" id="exportMsg" role="status">Pick an export. You are asked to save it as a file, and it also appears below so you can copy it. Synthetic students are marked in the roster.</p><div id="exportOut"></div></section>' +
    '<section class="panel"><h2>Event log dictionary</h2><table class="t compact"><thead><tr><th scope="col">Event</th><th scope="col">Meaning</th></tr></thead><tbody>' + dict.map(([a, b]) => '<tr><td><code>' + a + '</code></td><td>' + b + '</td></tr>').join('') + '</tbody></table><p class="muted small">This browser has logged ' + S.telemetry.length + ' events and ' + S.llm.length + ' help exchanges.</p></section>' +
    '<section class="panel"><h2>Lab VM results</h2><p class="muted small">Measured on 3 November 2026 with Bouncy Castle 1.79 on JDK 21.0.12 (Ubuntu), Temurin 21.0.13 and Temurin 25. The lesson text and demo outputs use these results.</p><div class="tbl-wrap"><table class="t compact"><thead><tr><th scope="col">Behaviour</th><th scope="col">Result</th></tr></thead><tbody>' + VM_CHECKS.map(([c, r]) => '<tr><td>' + esc(c) + '</td><td>' + esc(r) + '</td></tr>').join('') + '</tbody></table></div></section>';
}
function csv(rows){ return rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n'); }
async function doExport(kind){
  const recs = scopeRecords('all');
  let txt = '';
  if(kind === 'roster') txt = csv([['student','arm','synthetic','current_lesson','current_step','lessons_done','flags','weakest_cell','weakest_p']].concat(recs.map(r => { const w = weakestCell(r); return [r.id, r.arm, r.synthetic ? 'yes' : 'no', r.current.L, r.current.step, AUTHORED.filter(L => r.lessons[L] && r.lessons[L].done).length, Object.values(r.flags).reduce((a, b) => a + b, 0), w ? w.K + '|' + w.lv : '', w ? w.p.toFixed(3) : '']; })));
  if(kind === 'items') txt = csv([['lesson','item','type','tried','pass','partial','miss','avg_tries']].concat(AUTHORED.flatMap(L => itemStats(recs, L).map(s => [L, s.ex.id, s.ex.type, s.n, s.pass, s.partial, s.miss, s.tries.toFixed(2)]))));
  if(kind === 'telemetry') txt = MODE === 'teacher' ? JSON.stringify(await serverExport('events'), null, 1) : JSON.stringify(S.telemetry, null, 2);
  if(kind === 'llm') txt = MODE === 'teacher' ? JSON.stringify(await serverExport('llm'), null, 1) : JSON.stringify(S.llm, null, 2);
  if(kind === 'integrity' && MODE === 'teacher') txt = csv([['student','arm','time','event','via','lesson','step','scope','dropped']].concat((await serverExport('integrity')).map(e => [e.learner, e.arm, new Date(e.t).toISOString(), e.kind, e.via || '', e.lesson, e.step, e.scope || '', e.dropped || ''])));
  else if(kind === 'integrity') txt = csv([['student','arm','synthetic','time','event','via','lesson','step','scope','dropped']].concat(
    scopeRecords('all').flatMap(r => r.live ? S.integrity.map(e => [r.id, r.arm, 'no', new Date(e.t).toISOString(), e.kind, e.via || '', e.lesson, e.step, e.scope || '', e.dropped || ''])
      : [[r.id, r.arm, 'yes', '', 'summary', '', '', '', '', 'resets=' + integ(r).resets + '; pastes=' + integ(r).pastes + '; shortcuts=' + integ(r).keys]])));
  const msg = $('#exportMsg'), outEl = $('#exportOut');
  const name = 'pqc-lab-' + kind + (kind === 'telemetry' || kind === 'llm' ? '.json' : '.csv');
  outEl.innerHTML = '<label class="small" for="exportText">' + esc(name) + '</label><textarea id="exportText" class="free" readonly rows="8" style="font-family:var(--font-mono);font-size:12.5px"></textarea>';
  const ta = $('#exportText'); ta.value = txt;
  msg.textContent = 'Preparing ' + name + '… The text is also in the box below; select it to copy.';
  ta.focus(); ta.select();
  const fallback = why => { msg.textContent = why + ' The text is in the box below; select it to copy.'; };
  (window.claude && window.claude.use ? window.claude.use('downloads') : Promise.resolve(null)).then(dl => {
    if(!dl){ fallback('Saving files is not available in this view.'); return; }
    return dl.save({filename:name, data:txt}).then(() => { msg.textContent = 'Saved ' + name + '. The same text is in the box below.'; },
      e => fallback(e && e.code === 'declined' ? 'Save cancelled.' : 'The file could not be saved here.'));
  }).catch(() => fallback('Saving files is not available in this view.'));
  telem('export', {kind});
}

/* ---------------- wiring ---------------- */
function wireTeacher(b){
  b.querySelectorAll('[data-open-student]').forEach(x => x.addEventListener('click', () => { TV.sec = 'students'; TV.student = x.dataset.openStudent; teacherShell(); }));
  const back = b.querySelector('#backRoster'); if(back) back.addEventListener('click', () => { TV.student = null; renderTeacherBody(); });
  b.querySelectorAll('[data-sort]').forEach(x => x.addEventListener('click', () => { const k = x.dataset.sort; TV.sort = {k, dir:TV.sort.k === k ? -TV.sort.dir : 1}; renderTeacherBody(); }));
  const fl = b.querySelector('#fLesson'); if(fl) fl.addEventListener('change', () => { TV.filterL = fl.value; renderTeacherBody(); });
  const fs = b.querySelector('#fSearch'); if(fs) fs.addEventListener('change', () => { TV.q = fs.value; renderTeacherBody(); });
  b.querySelectorAll('[data-mmode]').forEach(x => x.addEventListener('click', () => { TV.matrixMode = x.dataset.mmode; renderTeacherBody(); }));
  b.querySelectorAll('[data-iteml]').forEach(x => x.addEventListener('click', () => { TV.itemL = x.dataset.iteml; renderTeacherBody(); }));
  b.querySelectorAll('[data-tlesson]').forEach(x => x.addEventListener('click', () => { TV.lesson = x.dataset.tlesson; renderTeacherBody(); }));
  b.querySelectorAll('input[name="rel"]').forEach(x => x.addEventListener('change', () => { SETTINGS.release[TV.lesson] = x.value; telem('setting', {release:TV.lesson + '=' + x.value}); toast('Lesson ' + LESSONS[TV.lesson].n + ' is now ' + x.value + '.'); }));
  b.querySelectorAll('[data-gate]').forEach(x => x.addEventListener('change', () => { const v = Math.max(0, Math.min(1, parseFloat(x.value) || 0)); SETTINGS.gates[TV.lesson][+x.dataset.gate][2] = v; x.value = v.toFixed(2); telem('setting', {gate:TV.lesson}); toast('Gate updated.'); }));
  b.querySelectorAll('[data-preview-lesson]').forEach(x => x.addEventListener('click', () => { S.preview = true; S.lesson = x.dataset.previewLesson; location.hash = '#student'; }));
  b.querySelectorAll('[data-pol]').forEach(x => x.addEventListener('change', () => { const [r, m] = x.dataset.pol.split('|'); SETTINGS.policy[r][m] = x.value; telem('setting', {policy:r + '.' + m + '=' + x.value}); toast('Help rule saved for this session.'); }));
  b.querySelectorAll('[data-ban]').forEach(x => x.addEventListener('change', () => { const [L, i, f] = x.dataset.ban.split('|'); SETTINGS.bans[L][+i][f] = x.value.split(',').map(s => s.trim()).filter(Boolean).map(s => f === 'terms' ? s.toLowerCase() : s.toUpperCase()); toast('Banned terms saved.'); }));
  const thB = b.querySelector('#thB'), thS = b.querySelector('#thS');
  const setTh = () => { let bb = parseFloat(thB.value), ss = parseFloat(thS.value); if(!(bb > 0 && ss > bb && ss < 1)){ toast('"Got it" must be above "Getting there", both between 0 and 1.'); thB.value = SETTINGS.thresholds.building.toFixed(2); thS.value = SETTINGS.thresholds.solid.toFixed(2); return; } SETTINGS.thresholds = {building:bb, solid:ss}; applySettings(); toast('Thresholds saved.'); };
  if(thB){ thB.addEventListener('change', setTh); thS.addEventListener('change', setTh); }
  const la = b.querySelector('#liveArmSel'); if(la) la.addEventListener('change', () => { S.arm = la.value; SETTINGS.arm = la.value; telem('arm', {arm:la.value}); toast('This browser\'s learner is now in Arm ' + la.value + '.'); });
  const il = b.querySelector('#incLive'); if(il) il.addEventListener('change', () => { SETTINGS.includeLive = il.checked; toast(il.checked ? 'Included in class views.' : 'Hidden from class views.'); });
  const rsS = b.querySelector('#resetSettings'); if(rsS) rsS.addEventListener('click', () => { SETTINGS = defaultSettings(); applySettings(); S.arm = SETTINGS.arm; renderTeacherBody(); toast('Default settings restored.'); });
  const lArm = b.querySelector('#liveArm'); if(lArm) lArm.addEventListener('click', () => { S.arm = S.arm === 'T' ? 'C' : 'T'; SETTINGS.arm = S.arm; TV.student = liveRecord().id; renderTeacherBody(); toast('Switched to Arm ' + S.arm + '.'); });
  const lRes = b.querySelector('#liveReset'); if(lRes) lRes.addEventListener('click', () => { S = freshState(S); TV.student = liveRecord().id; renderTeacherBody(); toast('Learner reset.'); });
  const lPrev = b.querySelector('#livePreview'); if(lPrev) lPrev.addEventListener('click', () => { S.preview = false; location.hash = '#student'; });
  b.querySelectorAll('[data-export]').forEach(x => x.addEventListener('click', () => doExport(x.dataset.export)));
  b.querySelectorAll('[data-vm]').forEach(x => x.addEventListener('change', () => { SETTINGS.vm[+x.dataset.vm] = x.checked; }));
  wireSecureSettings(b);
  if(MODE === 'teacher') wireServerTeacher(b);
}

/* ================================================================
   PQC LAB v5 — SESSION PROTECTION
   The Python Lab's secure session, rebuilt for this lab:
   · copy, cut, paste, drag-and-drop and the context menu are blocked
     in the student view, plus a bulk-insert check that catches text
     injected without a paste event;
   · print, save, view-source and developer-tool shortcuts are blocked;
   · leaving the window (tab switch, minimise, another app) drops the
     learner's work and restarts it: the current exercise, the whole
     lesson (default) or the whole course (the Python Lab behaviour);
   · every event goes to an append-only integrity log the teacher sees.
   Off in the teacher console and in teacher preview. Browser-side
   rules deter and record; they cannot stop a second device.
   ================================================================ */
const SCOPE_TEXT = {
  exercise:'the answer or code you were working on is cleared',
  part:'the part you were working on starts again from its beginning; parts you had already finished are kept',
  lesson:'all your code and answers in this lesson are cleared, and the lesson starts again from Step 1',
  course:'the whole course starts again from Lesson 1, and all your progress is cleared',
};
const SCOPE_SHORT = {exercise:'this exercise', part:'the current part', lesson:'this lesson', course:'the course'};
const BULK_CHARS = 40;   // one input event adding more than this many characters counts as pasted text

function secureCfg(){ return SETTINGS.secure; }
function secureWanted(){ const c = secureCfg(); return !c.exempt && (c.noCopy || c.resetOnLeave); }
function inStudentView(){ return document.body.classList.contains('student') && !S.preview; }
function stepProtected(){
  const les = LESSONS[S.lesson];
  if(!les || les.placeholder || !lessonOpen(S.lesson)) return false;
  const st = S.les[S.lesson];
  return !!secureCfg().steps[st ? st.step : 'hook'];
}
function copyBlocked(){ return inStudentView() && !secureCfg().exempt && secureCfg().noCopy; }
function leaveWatched(){ return inStudentView() && S.armed && !S.secureLock && !secureCfg().exempt && secureCfg().resetOnLeave && stepProtected(); }

function armSecure(why){
  if(!inStudentView() || S.secureLock) return;
  if(!S.armed){ S.armed = true; telem('secure-armed', {why}); }
  renderSecureChip();
}
function renderSecureChip(){
  document.body.classList.toggle('secure', copyBlocked());
  const el = $('#secureChip'); if(!el) return;
  const c = secureCfg();
  if(S.preview || c.exempt || !(c.noCopy || c.resetOnLeave)){
    el.className = 'secure-chip';
    el.textContent = S.preview ? 'Protection off (teacher preview)' : c.exempt ? 'Protection off for this learner' : 'Protection off';
    return;
  }
  const bits = [];
  if(c.noCopy) bits.push('copy and paste off');
  if(c.resetOnLeave) bits.push(stepProtected() ? 'leaving this window restarts ' + SCOPE_SHORT[c.scope] : 'you may leave the window in this step');
  el.className = 'secure-chip' + (S.armed ? ' on' : '');
  el.textContent = (S.armed ? 'Secure session · ' : 'Secure session starts when you press Start · ') + bits.join(' · ');
}
function secureRulesHTML(){
  if(!secureWanted()) return '';
  const c = secureCfg(), items = [];
  if(c.noCopy) items.push('Copy, paste and drag-and-drop are switched off. Type every answer and every line of code yourself.');
  if(c.resetOnLeave){
    const steps = STEPS.filter(s => c.steps[s.id]).map(s => STEP_PLAIN[s.id].label);
    items.push('Stay on this tab. If you switch tab, minimise the window or click into another program, ' + SCOPE_TEXT[c.scope] + '.' + (steps.length < STEPS.length ? ' This applies in: ' + steps.join(', ') + '.' : ''));
    items.push('Keep notes, music and messages on paper or a second device.');
  }
  items.push('Printing, saving the page and developer tools are switched off. Your teacher sees a log of resets and blocked actions.');
  return '<section class="rules" aria-labelledby="rulesH"><h3 id="rulesH">Lab rules</h3><ul>' + items.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul></section>';
}

/* ---------- log + toast ---------- */
function integrityLog(kind, extra){
  extra = extra || {};
  if(MODE === 'student'){ act('integrity', [kind, extra.via || '', extra.dropped || ''], {quiet:true}); return; }
  OPS.integrity(kind, extra.via || '', extra.dropped || '');
}
function studentToast(msg){
  let t = document.getElementById('sToast');
  if(!t){ t = document.createElement('div'); t.id = 'sToast'; t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(studentToast.h); studentToast.h = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- copy, paste, drag-and-drop, context menu ---------- */
['copy', 'cut', 'paste'].forEach(type => document.addEventListener(type, e => {
  if(!copyBlocked()) return;
  e.preventDefault(); e.stopPropagation();
  integrityLog(type + '-blocked');
  studentToast(type === 'paste' ? 'Paste is switched off. Type it yourself.' : 'Copying is switched off in this lab.');
}, true));
['dragstart', 'drop'].forEach(type => document.addEventListener(type, e => {
  if(!copyBlocked()) return;
  e.preventDefault(); e.stopPropagation();
  if(type === 'drop'){ integrityLog('drop-blocked'); studentToast('Drag-and-drop is switched off. Type it yourself.'); }
}, true));
document.addEventListener('dragover', e => { if(copyBlocked()) e.preventDefault(); }, true);
document.addEventListener('contextmenu', e => { if(copyBlocked()){ e.preventDefault(); } }, true);
document.addEventListener('beforeinput', e => {
  if(!copyBlocked()) return;
  if(/^insertFrom(Paste|Drop|Yank|PasteAsQuotation)/.test(e.inputType || '')){
    e.preventDefault(); e.stopPropagation();
    integrityLog('paste-blocked', {via:e.inputType});
    studentToast('Paste is switched off. Type it yourself.');
  }
}, true);

/* Bulk insert: text that arrives in one input event without a paste event
   (an extension, an autotyper, a drag from another window). Reverted and logged. */
const LAST_VALUE = new WeakMap();
function editable(t){ return t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && /^(text|search|number|)$/i.test(t.type || ''))); }
document.addEventListener('focusin', e => { if(editable(e.target)) LAST_VALUE.set(e.target, e.target.value); }, true);
document.addEventListener('input', e => {
  const t = e.target; if(!editable(t)) return;
  const prev = LAST_VALUE.has(t) ? LAST_VALUE.get(t) : t.defaultValue;
  const grew = t.value.length - prev.length, type = e.inputType || '';
  if(copyBlocked() && grew > BULK_CHARS && !/^(delete|history)/.test(type)){
    t.value = prev;
    e.stopImmediatePropagation();
    integrityLog('bulk-insert-blocked', {via:type || 'input', dropped:grew + ' characters'});
    studentToast('That text arrived all at once, so it was removed. Type it yourself.');
    return;
  }
  LAST_VALUE.set(t, t.value);
}, true);

/* ---------- shortcuts: copy/paste keys, print, save, source, developer tools ---------- */
document.addEventListener('keydown', e => {
  if(!inStudentView() || secureCfg().exempt) return;
  const k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
  let what = null;
  if(k === 'f12' || (mod && e.shiftKey && ['i', 'j', 'c'].includes(k)) || (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k))) what = 'Developer tools are';
  else if(mod && ['p', 's', 'u'].includes(k)) what = ({p:'Printing is', s:'Saving the page is', u:'Viewing the page source is'})[k];
  else if(copyBlocked() && ((mod && ['c', 'x', 'v'].includes(k)) || (k === 'insert' && (e.shiftKey || mod)))) what = 'Copy and paste are';
  if(!what) return;
  e.preventDefault(); e.stopPropagation();
  integrityLog('shortcut-blocked', {via:(e.ctrlKey ? 'Ctrl+' : '') + (e.metaKey ? 'Cmd+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey ? 'Shift+' : '') + e.key});
  studentToast(what + ' switched off in this lab.');
}, true);

/* ---------- leaving the window ---------- */
let BLUR_TIMER = null;
let PAGE_LEAVING = false;
window.addEventListener('beforeunload', () => { PAGE_LEAVING = true; });
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden' && leaveWatched()) leftWindow(PAGE_LEAVING ? 'reloaded or closed the page' : 'switched tab or minimised');
});
window.addEventListener('blur', () => {
  if(!leaveWatched()) return;
  clearTimeout(BLUR_TIMER);
  BLUR_TIMER = setTimeout(() => { BLUR_TIMER = null; if(!document.hasFocus() && leaveWatched()) leftWindow('clicked into another window or program'); }, Math.max(0, secureCfg().graceMs));
});
window.addEventListener('focus', () => { clearTimeout(BLUR_TIMER); BLUR_TIMER = null; });

function leftWindow(via){
  const t = Date.now();
  const r = OPS.left(via, t);            // applied here at once, and by the server with the same timestamp
  if(!r.reset) return;
  S.armed = false; SV.tab = 'next';
  if(MODE === 'student') sendLeft(via, t);
  UI.refresh();
  showResetNotice();
}
function showResetNotice(){
  const e = S.secureLock; if(!e || !inStudentView()) return;
  const n = S.integrity.filter(x => x.kind === 'left-window').length;
  const html = '<div class="dialog reset-dialog" role="alertdialog" aria-modal="true" aria-labelledby="resetTitle" aria-describedby="resetBody"><h2 id="resetTitle">Your session was restarted</h2>' +
    '<p id="resetBody">You left the lab window (' + esc(e.via) + '). Under this class\'s rules, ' + esc(SCOPE_TEXT[e.scope]) + '.</p>' +
    '<dl><dt>When</dt><dd>' + esc(new Date(e.t).toLocaleTimeString()) + '</dd><dt>Where</dt><dd>Lesson ' + LESSONS[e.lesson].n + ' · ' + esc(STEP_PLAIN[e.step].label) + '</dd><dt>Cleared</dt><dd>' + esc(e.dropped) + '</dd><dt>Restarts so far</dt><dd>' + n + '</dd></dl>' +
    '<p class="muted small">Your teacher can see this in the session log. Keep notes on paper or on a second device so the lab tab stays in front.</p>' +
    '<div class="actions"><button class="btn primary" id="closeOverlay">Start again</button></div></div>';
  showModal(html, '#openIntro', () => {
    const lock = S.secureLock;
    if(MODE === 'student') act('resume', [lock && lock.t, lock && lock.via]).then(() => { armSecure('after reset'); studentRefresh(); });
    else { OPS.resume(); armSecure('after reset'); studentRefresh(); }
  });
}

/* ---------- teacher side ---------- */
let SYN_INTEG = null;
function integ(rec){
  if(rec.integ) return Object.assign({events:[]}, rec.integ);
  if(rec.live){
    const ev = S.integrity;
    return {resets:ev.filter(x => x.kind === 'left-window').length, pastes:ev.filter(x => /^(paste|cut|copy|drop|bulk-insert)/.test(x.kind)).length, keys:ev.filter(x => x.kind === 'shortcut-blocked').length, events:ev};
  }
  if(!SYN_INTEG){
    SYN_INTEG = {};
    const r = mulberry32(8547);   // its own seed, so the rest of the sample cohort is unchanged
    cohort().forEach(c => { const a = r(); SYN_INTEG[c.id] = {resets: a < 0.55 ? 0 : a < 0.8 ? 1 : a < 0.93 ? 2 : 3 + Math.floor(r() * 2), pastes:Math.floor(r() * r() * 7), keys:r() < 0.2 ? 1 : 0, events:[]}; });
  }
  return SYN_INTEG[rec.id] || {resets:0, pastes:0, keys:0, events:[]};
}
const INTEG_LABEL = {'left-window':'Left the window: work restarted', 'paste-blocked':'Paste blocked', 'cut-blocked':'Cut blocked', 'copy-blocked':'Copy blocked', 'drop-blocked':'Drag-and-drop blocked', 'bulk-insert-blocked':'Bulk insert removed', 'shortcut-blocked':'Shortcut blocked'};
function tIntegrity(){
  const recs = scopeRecords(TV.arm), rows = recs.map(r => ({r, i:integ(r)})).sort((a, b) => b.i.resets - a.i.resets || b.i.pastes - a.i.pastes);
  const tot = k => rows.reduce((a, x) => a + x.i[k], 0), c = secureCfg();
  let h = '<p class="muted small">Now: copy and paste ' + (c.noCopy ? '<b>blocked</b>' : 'allowed') + ' · leaving the window ' + (c.resetOnLeave ? 'restarts <b>' + SCOPE_SHORT[c.scope] + '</b>' : 'is only allowed') + '. Change this in Settings.</p>' +
    '<div class="kpis"><div class="kpi warn"><span class="kv">' + tot('resets') + '</span><span class="kl">session restarts</span></div>' +
    '<div class="kpi"><span class="kv">' + rows.filter(x => x.i.resets).length + '</span><span class="kl">students with a restart</span></div>' +
    '<div class="kpi"><span class="kv">' + tot('pastes') + '</span><span class="kl">pastes and drops blocked</span></div>' +
    '<div class="kpi"><span class="kv">' + tot('keys') + '</span><span class="kl">shortcuts blocked</span></div></div>';
  h += '<div class="grid2"><section class="panel"><h2>By student</h2><div class="tbl-wrap"><table class="t compact"><thead><tr><th scope="col">Student</th><th scope="col">Arm</th><th scope="col">Restarts</th><th scope="col">Pastes blocked</th><th scope="col">Shortcuts</th></tr></thead><tbody>' +
    rows.map(x => '<tr' + (x.r.live ? ' class="live"' : '') + '><td><button class="link" data-open-student="' + esc(x.r.id) + '">' + esc(x.r.id) + '</button></td><td>' + x.r.arm + '</td><td class="num">' + (x.i.resets || '') + '</td><td class="num">' + (x.i.pastes || '') + '</td><td class="num">' + (x.i.keys || '') + '</td></tr>').join('') + '</tbody></table></div></section>' +
    '<section class="panel"><h2>This browser\'s learner: event log</h2>' + (S.integrity.length ? '<div class="tbl-wrap"><table class="t compact"><thead><tr><th scope="col">Time</th><th scope="col">Event</th><th scope="col">Where</th><th scope="col">Detail</th></tr></thead><tbody>' +
      S.integrity.slice().reverse().map(e => '<tr><td class="num">' + esc(new Date(e.t).toLocaleTimeString()) + '</td><td>' + esc(INTEG_LABEL[e.kind] || e.kind) + '</td><td>L' + (LESSONS[e.lesson] ? LESSONS[e.lesson].n : '?') + ' · ' + esc((STEP_PLAIN[e.step] || {}).label || e.step) + '</td><td class="small">' + esc([e.via, e.scope ? 'scope: ' + e.scope : '', e.dropped ? 'cleared: ' + e.dropped : ''].filter(Boolean).join(' · ')) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">No events yet.</p>') + '</section></div>';
  h += '<section class="panel"><h2>What this can and cannot see</h2><ul class="small"><li>It sees: tab switches and minimising, clicks into another window, paste, cut, copy, drag-and-drop, text injected in one go, and blocked shortcuts.</li><li>It cannot see: a phone or second device, a second monitor the student only looks at, or someone reading the answer aloud. Restarts discourage switching away; the log tells you who to talk to.</li><li>Evidence earned before a restart stays in the skill record (except with the whole-course scope). Every restart is time-stamped, so the analysis can split attempts before and after it.</li></ul></section>';
  return h;
}
function tSecureSettings(){
  const c = secureCfg();
  return '<section class="panel"><h2>Session protection (student view)</h2><p class="muted small">The Python Lab\'s secure-session rules. They apply in the student view only, never here or in preview.</p>' +
    '<div class="banrow"><label class="chk"><input type="checkbox" id="secNoCopy"' + (c.noCopy ? ' checked' : '') + '> Block copy, cut, paste and drag-and-drop</label>' +
    '<label class="chk"><input type="checkbox" id="secLeave"' + (c.resetOnLeave ? ' checked' : '') + '> Restart when the student leaves the window</label></div>' +
    '<div class="banrow"><label>What restarts <select id="secScope">' + [['exercise','The current exercise only'],['part','The current part; finished parts are kept (default)'],['lesson','The whole current lesson'],['course','The whole course from Lesson 1 (Python Lab)']].map(([k, l]) => '<option value="' + k + '"' + (c.scope === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
    '<label>Grace before a click-away counts (seconds) <input type="number" id="secGrace" min="0" max="5" step="0.5" value="' + (c.graceMs / 1000) + '"></label></div>' +
    '<fieldset class="release"><legend>Restart applies during</legend>' + STEPS.map(s => '<label class="chk"><input type="checkbox" data-secstep="' + s.id + '"' + (c.steps[s.id] ? ' checked' : '') + '> ' + STEP_PLAIN[s.id].label + '</label>').join('') + '</fieldset>' +
    '<div class="banrow"><label class="chk"><input type="checkbox" id="secExempt"' + (c.exempt ? ' checked' : '') + '> Exempt this browser\'s learner (accommodation, such as dictation or a screen reader that needs other windows)</label></div>' +
    '<p class="note-w">Study design: the proposal lets Arm C use external documentation and search. A restart on leaving the window rules that out for both arms. Either change that sentence in the proposal, or restrict the restart to Build and Wrap up.</p>' +
    '<p class="note-w">"Whole course" erases hours of work after one accidental click. Use it only for short timed sessions.</p></section>';
}
function wireSecureSettings(b){
  const c = secureCfg(), saved = what => { telem('setting', {secure:what}); toast('Session protection saved for this session.'); };
  const on = (id, fn) => { const x = b.querySelector(id); if(x) x.addEventListener('change', () => fn(x)); };
  on('#secNoCopy', x => { c.noCopy = x.checked; saved('noCopy=' + x.checked); });
  on('#secLeave', x => { c.resetOnLeave = x.checked; saved('resetOnLeave=' + x.checked); });
  on('#secScope', x => { c.scope = x.value; saved('scope=' + x.value); });
  on('#secGrace', x => { const v = Math.max(0, Math.min(5, parseFloat(x.value) || 0)); c.graceMs = Math.round(v * 1000); x.value = v; saved('graceMs=' + c.graceMs); });
  on('#secExempt', x => { c.exempt = x.checked; saved('exempt=' + x.checked); });
  b.querySelectorAll('[data-secstep]').forEach(x => x.addEventListener('change', () => { c.steps[x.dataset.secstep] = x.checked; saved('step ' + x.dataset.secstep + '=' + x.checked); }));
}

document.documentElement.lang = document.documentElement.lang || 'en';
/* ---------------- router ---------------- */


