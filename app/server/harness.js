'use strict';
/* Turns a student's code for a "Build" exercise into one or more sandbox runs,
   then checks the real output against what the exercise asks for.
   Expectations were taken from the reference solutions run on JDK 21 + BC 1.79. */

const RUNNER = process.env.RUNNER_URL || 'http://runner:8090';

function mainClass(code){ const m = /public\s+(?:final\s+)?class\s+([A-Za-z_]\w*)/.exec(code); return m ? m[1] : null; }
function lines(out){ return (out || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean); }
const has = (r, re) => re.test(r.stdout || '');
const err = (r, re) => re.test(r.stderr || '');
const withoutBC = code => code.replace(/Security\s*\.\s*(addProvider|insertProviderAt)\s*\(\s*new\s+BouncyCastleProvider\s*\(\s*\)\s*(,\s*\d+\s*)?\)\s*;/g, '/* removed by the harness */;');

const GUARD_TEST = `
    static void tryKey(String label, java.security.Key k) {
        try { requireBcMlKem768(k); System.out.println(label + " -> accepted"); }
        catch (IllegalArgumentException e) { System.out.println(label + " -> IllegalArgumentException: " + e.getMessage()); }
        catch (RuntimeException e) { System.out.println(label + " -> " + e.getClass().getSimpleName() + ": " + e.getMessage()); }
    }
    public static void main(String[] a) throws Exception {
        java.security.Security.addProvider(new org.bouncycastle.jce.provider.BouncyCastleProvider());
        java.security.Security.addProvider(new org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider());
        for (org.bouncycastle.jcajce.spec.MLKEMParameterSpec s : new org.bouncycastle.jcajce.spec.MLKEMParameterSpec[]{
                org.bouncycastle.jcajce.spec.MLKEMParameterSpec.ml_kem_768, org.bouncycastle.jcajce.spec.MLKEMParameterSpec.ml_kem_512}) {
            java.security.KeyPairGenerator g = java.security.KeyPairGenerator.getInstance("ML-KEM", "BC");
            g.initialize(s, new java.security.SecureRandom());
            tryKey("BC " + s.getName() + " key", g.generateKeyPair().getPublic());
        }
        tryKey("non-BC key", java.security.KeyPairGenerator.getInstance("ML-KEM-768", "BCPQC").generateKeyPair().getPublic());
    }
}`;

/* Each plan: the runs to make and the checks on their results. */
const PLANS = {
  'L2.D1': code => {
    const main = mainClass(code);
    return {main, runs:[
      {label:'Run as written', files:{[main + '.java']:code}, main, args:[]},
      {label:'Forced failure: provider registration removed', files:{[main + '.java']:withoutBC(code)}, main, args:[]},
    ], checks:([a, b]) => [
      {label:'Runs and prints providerIsBC=true, ctLenIs1088=true, secretsMatch=true, cleanedUp=true', ok:a.exit === 0 && ['providerIsBC=true','ctLenIs1088=true','secretsMatch=true','cleanedUp=true'].every(s => (a.stdout || '').includes(s))},
      {label:'Forced failure: prints the exception class to stderr and exits with status 1', ok:b.exit === 1 && err(b, /NoSuchProviderException/)},
      {label:'Forced failure: no secret material printed', ok:!/[0-9a-f]{32,}/i.test((b.stdout || '') + (b.stderr || ''))},
    ]};
  },
  'L3.D1': code => {
    const main = mainClass(code);
    return {main, runs:[
      {label:'Run with no argument (policy: category 3)', files:{[main + '.java']:code}, main, args:[]},
      {label:'Run with argument 5 (policy: category 5)', files:{[main + '.java']:code}, main, args:['5']},
    ], checks:([a, b]) => {
      const rows = lines(a.stdout).filter(l => /^ML-KEM-(512|768|1024),/.test(l));
      const byLen = {'ML-KEM-512':'768', 'ML-KEM-768':'1088', 'ML-KEM-1024':'1568'};
      return [
        {label:'Prints one CSV row per set with the real ciphertext lengths', ok:rows.length === 3 && rows.every(r => { const c = r.split(','); return c[2] === byLen[c[0]] && c[3] === byLen[c[0]] && c[4] === 'true' && c[5] === 'true'; })},
        {label:'freshRandomness=true, tamperDetectedByCompare=true, tamperThrew=false', ok:has(a, /freshRandomness=true/) && has(a, /tamperDetectedByCompare=true/) && has(a, /tamperThrew=false/) && a.exit === 0},
        {label:'Policy 5 rejects ML-KEM-768 with exit status 2', ok:b.exit === 2},
      ];
    }};
  },
  'L4.B2': code => {
    const imports = code.split('\n').filter(l => /^\s*import\s/.test(l)).join('\n');
    const body = code.split('\n').filter(l => !/^\s*import\s/.test(l)).join('\n');
    const src = imports + '\npublic class GuardHarness {\n' + body + '\n' + GUARD_TEST;
    return {main:'GuardHarness', runs:[{label:'Harness passes three keys', files:{'GuardHarness.java':src}, main:'GuardHarness', args:[]}],
      checks:([a]) => [
        {label:'Accepts a BC ML-KEM-768 key', ok:has(a, /BC ML-KEM-768 key -> accepted/)},
        {label:'Rejects a BC ML-KEM-512 key, naming the set', ok:has(a, /BC ML-KEM-512 key -> IllegalArgumentException: .*ML-KEM-512/)},
        {label:'Rejects a non-BC key, naming its class', ok:has(a, /non-BC key -> IllegalArgumentException: .*BCKyberPublicKey/)},
      ]};
  },
  'L4.D1': code => {
    const main = mainClass(code);
    return {main, runs:[{label:'Run as written', files:{[main + '.java']:code}, main, args:[]}],
      checks:([a]) => [
        {label:'provider=BC and roundTripOk=true', ok:has(a, /provider=BC\b/) && has(a, /roundTripOk=true/)},
        {label:'The BCPQC key is rejected by your guard (foreignKeyRejected=true)', ok:has(a, /foreignKeyRejected=true/) && has(a, /BCKyberPublicKey/)},
        {label:'Exits normally (status 0)', ok:a.exit === 0},
      ]};
  },
};

async function callRunner(spec){
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 150000)   // covers a full class queuing at once;
  try {
    const r = await fetch(RUNNER + '/run', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(spec), signal:ctl.signal});
    if(r.status === 429) return {unavailable:'The sandbox is busy. Try again in a moment.'};
    if(!r.ok) return {unavailable:'The sandbox rejected the program (' + r.status + ').'};
    return await r.json();
  } catch(e){ return {unavailable:'The sandbox is not reachable right now.'}; }
  finally { clearTimeout(t); }
}

/* Returns a run object for opAttempt, or null when the exercise is not run (static checks only). */
async function runExercise(L, exId, code){
  const plan = PLANS[L + '.' + exId];
  if(!plan) return null;
  code = String(code || '');
  const p = plan(code);
  if(!p.main) return {ran:false, note:'No public class found, so the program was not compiled.', checks:[{label:'Compiles and runs', ok:false}], runs:[]};
  const results = [];
  for(const r of p.runs){
    const res = await callRunner({files:r.files, main:r.main, args:r.args, timeoutMs:15000});
    if(res.unavailable) return {ran:false, unavailable:true, note:res.unavailable, checks:[], runs:[]};
    results.push(Object.assign({label:r.label}, res));
    if(!res.compiled) break;
  }
  const runs = results.map(r => ({label:r.label, compiled:r.compiled, compile:r.compile, exit:r.exit, ms:r.ms, timedOut:r.timedOut, stdout:(r.stdout || '').slice(0, 4000), stderr:(r.stderr || '').slice(0, 4000)}));
  if(!results.every(r => r.compiled)) return {ran:true, runs, checks:[{label:'Compiles on JDK 21 with Bouncy Castle 1.79', ok:false}]};
  const checks = [{label:'Compiles on JDK 21 with Bouncy Castle 1.79', ok:true}].concat(p.checks(results));
  return {ran:true, runs, checks};
}

module.exports = {runExercise, PLANS, callRunner};
