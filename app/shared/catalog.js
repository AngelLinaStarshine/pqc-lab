/* Generated once from the v5 prototype by tools/split_prototype.py; edit here from now on. */

/* ================================================================
   PQC LAB v3 — CONTENT
   Every lesson follows the same six-step arc. Every activity names
   the concept × Bloom cells it feeds (cells: [concept, level, weight]).
   Learner-facing fields: story, prompt, blocks, checks, prompt text.
   Instructor-facing fields: instr, model, soc, criteria labels.
   ================================================================ */

const CONCEPTS = {
  'A-01':{cat:'A', name:'What PQC is',                     pre:[]},
  'A-02':{cat:'A', name:'What a KEM is',                   pre:['A-01']},
  'A-03':{cat:'A', name:'FIPS 203 standardisation',        pre:['A-02']},
  'A-04':{cat:'A', name:'Parameter sets & strengths',      pre:['A-02']},
  'B-01':{cat:'B', name:'Provider registration',           pre:[]},
  'B-02':{cat:'B', name:'getInstance routing',             pre:['B-01']},
  'B-03':{cat:'B', name:'Parameter spec selection',        pre:['B-02','A-04']},
  'B-04':{cat:'B', name:'Modern vs legacy provider',       pre:['B-02','A-03']},
  'B-05':{cat:'B', name:'KEM interface usage',             pre:['A-02','B-02']},
  'C-01':{cat:'C', name:'Ciphertext length as fingerprint',pre:['A-04','B-03']},
  'C-02':{cat:'C', name:'Name vs implementation',          pre:['B-02','B-04','C-01']},
  'C-03':{cat:'C', name:'Silent-failure recognition',      pre:['C-01','C-02']},
  'C-04':{cat:'C', name:'Loud-failure diagnosis',          pre:['B-02','B-03']},
  'D-01':{cat:'D', name:'Exception discipline',            pre:[]},
  'D-02':{cat:'D', name:'Dependency declaration',          pre:[]},
  'D-03':{cat:'D', name:'Build determinism',               pre:[]},
  'D-04':{cat:'D', name:'Import attention',                pre:[]},
  'D-05':{cat:'D', name:'Verification habit',              pre:['D-01','C-01']},
};
const CAT_NAMES = {A:'PQC concepts', B:'Bouncy Castle API', C:'Correctness reasoning', D:'Java crypto habits'};

/* Four Bloom levels → four exercise types → four matrix columns. */
const LEVELS = ['L2','L3','L4','L6'];
const LEVEL_INFO = {
  L2:{name:'Understand', type:'A', typeName:'Explain',      w:1.0},
  L3:{name:'Apply',      type:'B', typeName:'Fill the gap', w:1.5},
  L4:{name:'Analyze',    type:'C', typeName:'Find the error',w:2.0},
  L6:{name:'Create',     type:'D', typeName:'Write from a spec', w:2.5},
};
const TYPE_LEVEL = {A:'L2', B:'L3', C:'L4', D:'L6'};

/* The six-step arc shared by every lesson. */
const STEPS = [
  {id:'hook',     label:'Hook',        bloom:'commit'},
  {id:'learn',    label:'Learn',       bloom:'L2 checks'},
  {id:'practice', label:'Practice',    bloom:'A · B'},
  {id:'diagnose', label:'Diagnose',    bloom:'C'},
  {id:'create',   label:'Create',      bloom:'D'},
  {id:'exit',     label:'Exit ticket', bloom:'no AI'},
];

const LESSONS = {};
const LESSON_ORDER = ['L1','L2','L3','L4','L5','L6'];
/* Estimated minutes per step, from the content: reading at about 130 words a minute for technical
   text plus 1.5 min per check question; exercises: explain 5, table 4, fill-in 3, choice 3,
   find-the-bug 5, diagnosis ladder 6, Java program 25 (written design 15). Rounded to 5 min.
   Replace with the measured pilot medians once they exist. */
const LESSON_TIME = {
  L1:{hook:5, learn:25, practice:25, diagnose:10, create:15, exit:10},
  L2:{hook:5, learn:25, practice:40, diagnose:20, create:25, exit:10},
  L3:{hook:5, learn:25, practice:30, diagnose:15, create:25, exit:10},
  L4:{hook:5, learn:20, practice:45, diagnose:15, create:25, exit:10},
};
function fmtMin(m){ const h = Math.floor(m / 60), r = m % 60; return h ? h + ' h' + (r ? ' ' + r + ' min' : '') : m + ' min'; }
function lessonMinutes(L){ return LESSON_TIME[L] ? Object.values(LESSON_TIME[L]).reduce((a, b) => a + b, 0) : 0; }
function courseMinutes(){ return LESSON_ORDER.reduce((a, L) => a + lessonMinutes(L), 0); }
/* ================================================================
   PQC LAB v4 — SHARED EXTRAS
   Plain-language skill names (student view), glossary, and the
   teacher-editable SETTINGS that the engine reads.
   ================================================================ */

/* Student-facing names for the 18 lattice concepts. */
const SKILL = {
  'A-01':'Why we need post-quantum crypto',
  'A-02':'How a KEM works',
  'A-03':'What FIPS 203 standardises',
  'A-04':'Choosing a parameter set',
  'B-01':'Registering Bouncy Castle',
  'B-02':'How Java picks a provider',
  'B-03':'Picking the parameter spec',
  'B-04':'BC vs BCPQC',
  'B-05':'Using the KEM classes',
  'C-01':'Proving the set by ciphertext length',
  'C-02':'Checking where a key came from',
  'C-03':'Spotting silent failures',
  'C-04':'Reading stack traces',
  'D-01':'Handling exceptions well',
  'D-02':'Declaring dependencies',
  'D-03':'Pinning versions',
  'D-04':'Choosing the right import',
  'D-05':'Verifying your results',
};

/* Student-facing labels for Bloom levels and mastery bands. */
const LEVEL_PLAIN = {L2:'Explain it', L3:'Use it', L4:'Debug it', L6:'Build it'};
const BAND_PLAIN = {building:'Getting started', strength:'Getting there', solid:'Got it', unseen:'Not tried yet'};

/* Plain instructions shown above every exercise, by kind. */
const KIND_HOWTO = {
  explain:'Write your answer in your own words, in two to four sentences. You will see which points you covered.',
  design:'Write numbered steps. Cover every item the task lists.',
  table:'Choose an answer in every cell, then press Check.',
  fill:'Fill each highlighted blank in the code, then press Check.',
  mc:'Choose one answer, then press Check.',
  mcMulti:'Choose every answer that applies, then press Check.',
  findline:'Click the line or lines that cause the problem, then choose the reason below.',
  multimc:'Answer each question in order, then press Check.',
  code:'Edit the code, then press Run checks. Each check you pass turns green.',
};

/* Key terms, shown in a "Key terms" drawer for each lesson. */
const GLOSSARY = [
  {t:'Post-quantum cryptography (PQC)', d:'Ordinary algorithms, running on ordinary computers, designed to stay secure against an attacker with a large quantum computer.', L:['L1']},
  {t:'Shor\'s algorithm', d:'A quantum algorithm that makes factoring and discrete logarithms easy. It breaks RSA and ECDH.', L:['L1']},
  {t:'Grover\'s algorithm', d:'A quantum search speed-up of about a square root. AES-256 keeps about 128 bits of security against it.', L:['L1']},
  {t:'KEM (key encapsulation mechanism)', d:'A way for two parties to end up with the same random secret. Only the receiver has a key pair.', L:['L1','L2']},
  {t:'ek / dk', d:'Encapsulation key (public) and decapsulation key (private), the FIPS 203 names for the key pair.', L:['L1','L2']},
  {t:'Ciphertext (c)', d:'What Encaps sends to the receiver. Its length is fixed by the parameter set: 768, 1088 or 1568 bytes.', L:['L1','L3']},
  {t:'KDF', d:'Key derivation function. Turns the 32-byte shared secret into the actual keys. Both sides must use the same one.', L:['L1','L2']},
  {t:'Implicit rejection', d:'A damaged ciphertext gives the receiver a different key with no error, so attackers learn nothing.', L:['L1','L3']},
  {t:'FIPS 203', d:'The NIST standard (August 2024) that defines ML-KEM and its three parameter sets.', L:['L1','L3']},
  {t:'Provider', d:'A library that supplies crypto implementations to Java under algorithm names. "BC" is Bouncy Castle\'s.', L:['L2','L4']},
  {t:'getInstance', d:'Asks Java for an implementation by name. Naming the provider ("BC") skips the provider list.', L:['L2','L4']},
  {t:'Parameter set', d:'ML-KEM-512, -768 or -1024. Same algorithm at three strengths; this course uses 768.', L:['L3']},
  {t:'Silent failure', d:'Code that runs, exits normally and prints plausible output while a security property is broken.', L:['L3','L4']},
  {t:'Two-run rule', d:'Test a check by breaking the property on purpose; a real check must fail on that run.', L:['L3']},
  {t:'BCPQC', d:'Bouncy Castle\'s provider for experimental and pre-standard algorithms. Not used in this course.', L:['L4']},
  {t:'Provenance', d:'Where a key came from: which provider and which class made it. Checked with instanceof MLKEMKey.', L:['L4']},
];

/* Teacher-editable settings. The engine reads these; the teacher console edits them.
   Prototype: they live in this browser session; the pilot stores them server-side. */
const POLICY_DEFAULT = {
  hook:{explain:'off', hint:'off', review:'off', socratic:'off'},
  learn:{explain:'on', hint:'on', review:'off', socratic:'afterWrongCheck'},
  A:{explain:'on', hint:'off', review:'off', socratic:'afterMiss'},
  B:{explain:'off', hint:'on', review:'afterSubmit', socratic:'off'},
  C:{explain:'off', hint:'off', review:'off', socratic:'afterAttempt'},
  D:{explain:'off', hint:'off', review:'off', socratic:'off'},
  exit:{explain:'off', hint:'off', review:'off', socratic:'off'},
};
const POLICY_ROWS = [
  {k:'hook', label:'Hook'}, {k:'learn', label:'Learn'}, {k:'A', label:'Practice · Type A'}, {k:'B', label:'Practice · Type B'},
  {k:'C', label:'Diagnose · Type C'}, {k:'D', label:'Create · Type D'}, {k:'exit', label:'Exit ticket'},
];
const POLICY_VALUES = {off:'Off', on:'On', afterWrongCheck:'After a wrong check', afterMiss:'After a miss', afterAttempt:'After first attempt', afterSubmit:'After submitting'};

function defaultSettings(){
  const gates = {}, bans = {}, release = {};
  Object.keys(LESSONS).forEach(L => {
    const les = LESSONS[L];
    release[L] = les.placeholder ? 'closed' : 'gated';
    if(les.gate) gates[L] = les.gate.cells.map(c => c.slice());
    bans[L] = (les.bans || []).map(b => ({terms:b.terms.slice(), until:b.until.slice(), modes:b.modes ? b.modes.slice() : null}));
  });
  return {
    thresholds:{building:0.40, solid:0.60},
    gates, release, bans,
    policy: JSON.parse(JSON.stringify(POLICY_DEFAULT)),
    arm:'T',
    includeLive:true,
    vm:{},
    secure:{noCopy:true, resetOnLeave:true, scope:'part', graceMs:1500,
      steps:{hook:true, learn:true, practice:true, diagnose:true, create:true, exit:true}, exempt:false},
  };
}
let SETTINGS = null;   // set after LESSONS load (see engine)
