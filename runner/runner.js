'use strict';
/* PQC Lab sandbox runner.
   Compiles and runs one student Java program at a time with Bouncy Castle 1.79.
   Isolation, outermost first:
     1. this container has no network route out (compose: internal network only),
        a read-only root file system, a small /tmp and process/memory/CPU limits;
     2. each job runs as an unprivileged user (uid 10001) that cannot signal or
        read this server, inside its own 0700 directory that is deleted afterwards;
     3. hard wall-clock limits (SIGKILL) on javac and java, a JVM heap cap, and
        output capped at 16 KB per stream;
     4. jobs run one at a time, and every process left by uid 10001 is killed
        before the next job starts.
   It holds no secrets and no student data. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');

const PORT = +process.env.PORT || 8090;
const BC = process.env.BC_JAR || '/opt/bc/bcprov-jdk18on-1.79.jar';
// Each parallel slot runs as its own unprivileged user, so jobs cannot see, signal or exhaust each other.
const WORKERS = Math.max(1, Math.min(8, +process.env.WORKERS || 2));
const SLOT_UID = slot => 10001 + slot;
const NPROC = +process.env.JOB_NPROC || 100;   // per-slot thread/process cap (RLIMIT_NPROC is counted per user)
const OUT_CAP = 16 * 1024;
const MAX_QUEUE = +process.env.MAX_QUEUE || 30;
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]{0,60}\.java$/;
const MAIN_RE = /^[A-Za-z_][A-Za-z0-9_]{0,60}$/;

function killUid(uid){
  for(const pid of fs.readdirSync('/proc').filter(d => /^\d+$/.test(d))){
    try {
      const st = fs.readFileSync('/proc/' + pid + '/status', 'utf8');
      const m = /^Uid:\s+(\d+)/m.exec(st);
      if(m && +m[1] === uid) process.kill(+pid, 'SIGKILL');
    } catch(e){ /* process already gone */ }
  }
}
function exec(uid, argv, cwd, ms){
  return new Promise(resolve => {
    const t0 = Date.now();
    const p = spawn('setpriv', ['--reuid=' + uid, '--regid=' + uid, '--clear-groups', '--no-new-privs', '--',
      'prlimit', '--nproc=' + NPROC, '--',
      'timeout', '-s', 'KILL', String(Math.ceil(ms / 1000)), ...argv],
      {cwd, env:{PATH:'/opt/java/openjdk/bin:/usr/bin:/bin', HOME:cwd, LANG:'C.UTF-8', TMPDIR:cwd}, stdio:['ignore', 'pipe', 'pipe']});
    let out = '', err = '', oc = false, ec = false;
    p.stdout.on('data', d => { if(out.length < OUT_CAP) out += d; else oc = true; });
    p.stderr.on('data', d => { if(err.length < OUT_CAP) err += d; else ec = true; });
    p.on('close', (code, sig) => {
      const ms2 = Date.now() - t0;
      resolve({exit: code === null ? 137 : code, timedOut: code === 137 || code === 124 || sig === 'SIGKILL', ms: ms2,
        stdout: out.slice(0, OUT_CAP) + (oc ? '\n[output truncated]' : ''), stderr: err.slice(0, OUT_CAP) + (ec ? '\n[output truncated]' : '')});
    });
  });
}
async function job(slot, spec){
  const JOB_UID = SLOT_UID(slot), JOB_GID = JOB_UID;
  const dir = fs.mkdtempSync('/tmp/job-');
  try {
    fs.chownSync(dir, JOB_UID, JOB_GID); fs.chmodSync(dir, 0o700);
    const names = [];
    for(const [name, src] of Object.entries(spec.files)){
      const f = path.join(dir, name);
      fs.writeFileSync(f, src, {mode:0o600}); fs.chownSync(f, JOB_UID, JOB_GID); names.push(name);
    }
    const out = path.join(dir, 'out'); fs.mkdirSync(out); fs.chownSync(out, JOB_UID, JOB_GID);
    const c = await exec(JOB_UID, ['javac', '-J-Xmx256m', '-proc:none', '-nowarn', '-encoding', 'UTF-8', '-cp', BC, '-d', out, ...names], dir, 30000);
    if(c.exit !== 0) return {compiled:false, compile:(c.stderr || c.stdout).slice(0, 6000), timedOut:c.timedOut};
    const r = await exec(JOB_UID, ['java', '-Xmx160m', '-Xss1m', '-XX:+UseSerialGC', '-XX:TieredStopAtLevel=1', '-Xshare:auto',
      '-Djava.io.tmpdir=' + dir, '-cp', BC + ':' + out, spec.main, ...spec.args], dir, spec.timeoutMs || 15000);
    return {compiled:true, exit:r.exit, stdout:r.stdout, stderr:r.stderr, ms:r.ms, timedOut:r.timedOut};
  } finally {
    killUid(JOB_UID);
    fs.rmSync(dir, {recursive:true, force:true});
    for(const f of fs.readdirSync('/tmp')){ try { const p = path.join('/tmp', f); if(fs.statSync(p).uid === JOB_UID) fs.rmSync(p, {recursive:true, force:true}); } catch(e){} }
  }
}
function validate(b){
  if(!b || typeof b !== 'object' || !b.files || typeof b.files !== 'object') return 'files required';
  const entries = Object.entries(b.files);
  if(!entries.length || entries.length > 4) return '1 to 4 files';
  let total = 0;
  for(const [n, s] of entries){ if(!NAME_RE.test(n) || typeof s !== 'string') return 'bad file'; total += s.length; }
  if(total > 120000) return 'source too large';
  if(!MAIN_RE.test(b.main || '')) return 'bad main class';
  if(!Array.isArray(b.args) || b.args.length > 8 || b.args.some(a => typeof a !== 'string' || a.length > 100)) return 'bad args';
  return null;
}

// a small worker pool: up to WORKERS jobs at once, the rest wait in a bounded queue
const free = Array.from({length:WORKERS}, (_, i) => i), queue = [];
let waiting = 0;
function take(){ return free.length ? Promise.resolve(free.shift()) : new Promise(r => queue.push(r)); }
function give(slot){ const next = queue.shift(); if(next) next(slot); else free.push(slot); }
http.createServer((req, res) => {
  const send = (code, obj) => { res.writeHead(code, {'content-type':'application/json'}); res.end(JSON.stringify(obj)); };
  if(req.method === 'GET' && req.url === '/health') return send(200, {ok:true, bc:path.basename(BC), waiting, workers:WORKERS});
  if(req.method !== 'POST' || req.url !== '/run') return send(404, {error:'not found'});
  let body = '';
  req.on('data', d => { body += d; if(body.length > 200000){ req.destroy(); } });
  req.on('end', () => {
    let spec; try { spec = JSON.parse(body); } catch(e){ return send(400, {error:'bad json'}); }
    const bad = validate(spec); if(bad) return send(400, {error:bad});
    if(waiting >= MAX_QUEUE) return send(429, {error:'sandbox busy'});
    waiting++;
    take().then(slot => job(slot, {files:spec.files, main:spec.main, args:spec.args, timeoutMs:Math.min(+spec.timeoutMs || 15000, 20000)})
      .then(r => send(200, r), e => send(500, {error:String(e && e.message || e)}))
      .finally(() => { waiting--; give(slot); }));
  });
}).listen(PORT, () => console.log('runner on', PORT, 'with', BC, 'workers', WORKERS));
