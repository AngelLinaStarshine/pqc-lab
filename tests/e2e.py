"""End-to-end test of the PQC Lab pilot stack in a real browser against the real server."""
import json, os, sys, subprocess
from playwright.sync_api import sync_playwright
BASE = 'http://127.0.0.1:8080'
HERE = os.path.dirname(os.path.abspath(__file__))
COMPOSE = os.path.join(os.path.dirname(HERE), 'docker-compose.yml')
KEYS = json.load(open(os.path.join(HERE, 'keys.json')))
AXE = open(os.path.join(HERE, 'node_modules/axe-core/axe.min.js')).read()   # npm i axe-core@4 in tests/
OUT = os.path.join(HERE, 'shots_e2e'); os.makedirs(OUT, exist_ok=True)
results, errors = [], []
def ok(name, cond, extra=''):
    results.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + (' · ' + str(extra)[:300] if extra not in ('', None) else ''))
HIDE = "Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});"
def axe(p, label):
    p.add_script_tag(content=AXE)
    v = p.evaluate("async()=>(await axe.run(document,{runOnly:['wcag2a','wcag2aa']})).violations.map(v=>v.id+':'+v.nodes.length+' '+v.nodes[0].target.join(' '))")
    ok('axe 0 violations · ' + label, not v, v)
def psql(sql):
    return subprocess.run(['docker', 'compose', '-f', COMPOSE, 'exec', '-T', 'db', 'psql', '-U', 'pqclab', '-d', 'pqclab', '-tAc', sql], capture_output=True, text=True)

# answer generators from the full content (the test plays a student who knows the keys)
def ans_for(ex):
    k = ex['kind']
    if k == 'explain': return {'text': ex['model']}
    if k == 'table':
        o = {}
        for ri, row in enumerate(ex['rows']):
            for ci, c in enumerate(row):
                if isinstance(c, dict): o['%d:%d' % (ri, ci)] = c['a']
        return o
    if k == 'fill': return {str(i): b['a'][0] for i, b in enumerate(ex['blanks'])}
    if k == 'mc': return ex['a'] if ex.get('multi') else {'pick': ex['a']}
    if k == 'findline': return {'lines': [g[0] for g in ex['groups']], 'mech': ex['mech']['a']}
    if k == 'multimc': return {str(i): q['a'] for i, q in enumerate(ex['qs'])}
    return {}

if os.environ.get('PQC_TEST_STACK') != '1':
    sys.exit('Refusing to run: this test deletes all student data. Run it only on a test stack, with PQC_TEST_STACK=1.')
# test stack only: start from a class with no students (withdrawal override lets the trigger allow the delete)
r = psql("begin; set local pqc.withdrawal='on'; delete from events; delete from sessions where user_id in (select id from users where role='student'); delete from learner_state; delete from users where role='student'; update classes set settings='{}'; commit;")
assert r.returncode == 0, r.stderr

with sync_playwright() as pw:
    b = pw.chromium.launch()
    # ---------- teacher creates sign-in codes ----------
    t = b.new_context(viewport={'width':1440, 'height':900}, bypass_csp=True).new_page()
    t.on('pageerror', lambda e: errors.append('teacher: ' + str(e)))
    t.goto(BASE); t.wait_for_selector('#codeForm')
    axe(t, 'sign-in page')
    t.screenshot(path=OUT + '/01_login.png')
    t.click('.staff summary'); t.fill('#emIn', 'teacher@example.org'); t.fill('#pwIn', 'pilot-teacher-pass-2026'); t.click('#staffForm button')
    t.wait_for_selector('.t-head'); ok('teacher signs in to the console', 'teacher console' in t.inner_text('.t-head').lower())
    ok('empty class shows guidance, not synthetic data', 'No students have signed in yet' in t.inner_text('#tbody'))
    t.click('[data-sec="config"]'); t.fill('#nCodes', '4'); t.click('#mkCodes'); t.wait_for_selector('#codesOut code')
    codes = t.eval_on_selector_all('#codesOut tbody tr', "rs => rs.map(r => [...r.children].map(c => c.innerText))")
    ok('4 codes created with balanced arms', len(codes) == 4 and sorted(c[2] for c in codes) == ['C', 'C', 'T', 'T'], codes)
    t.screenshot(path=OUT + '/02_codes.png', full_page=True)
    # open Lesson 2 for everyone, so the run test can reach it quickly
    t.click('[data-sec="lessons"]'); t.click('[data-tlesson="L2"]'); t.check('input[name="rel"][value="open"]'); t.wait_for_timeout(1500)
    tcode = [c for c in codes if c[2] == 'T'][0]

    # ---------- student ----------
    sc = b.new_context(viewport={'width':1440, 'height':900}, bypass_csp=True); s = sc.new_page()
    s.on('pageerror', lambda e: errors.append('student: ' + str(e)))
    s.on('console', lambda m: errors.append('student console: ' + m.text) if m.type == 'error' else None)
    s.goto(BASE); s.wait_for_selector('#codeForm')
    s.fill('#codeIn2', 'WRONG-CODE-1234'); s.click('#codeForm button'); s.wait_for_timeout(400)
    ok('wrong code is refused', 'not recognised' in s.inner_text('#loginErr'))
    s.fill('#codeIn2', tcode[1].lower().replace('-', ' ')); s.click('#codeForm button')
    s.wait_for_selector('.rules'); ok('student signs in (code case and separators ignored)', True)
    ok('pseudonym shown, no name', tcode[0] in s.inner_text('.s-foot'))
    s.click('#closeOverlay')
    # leak checks
    lessons = s.evaluate('JSON.stringify(LESSONS)')
    leaks = [x for x in ['Bob cannot decrypt it', 'destroyQuietly(sent)', 'tamperDetectedByCompare=true', '"criteria"', 'Nobody lied', 'All sixteen got encapsulation'] if x in lessons]
    ok('answer keys, model answers, reference code and reveals are not in the student page', not leaks, leaks)
    ok('teacher API refuses a student', s.evaluate("fetch('/api/teacher/bootstrap').then(r=>r.status)") == 403)
    ok('shared lesson file with keys is not served', s.evaluate("fetch('/shared/lessons.js').then(r=>r.status)") == 404)
    ok('POST without the app header is refused (CSRF)', s.evaluate("fetch('/api/student/act',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(r=>r.status)") == 403)
    # predict
    # an unrelated answer is refused by the server, with no reveal and no attempt used
    s.click('#hookText'); s.keyboard.type('I like pizza and football', delay=5); s.click('#hookCommit')
    s.wait_for_function("document.querySelector('#hookErr') && document.querySelector('#hookErr').textContent.length > 0", timeout=10000)
    ok('unrelated Hook answer is refused, nothing revealed', s.locator('.reveal').count() == 0 and 'about the question' in s.inner_text('#hookErr'), s.inner_text('#hookErr'))
    s.fill('#hookText', '') if False else s.evaluate("document.querySelector('#hookText').value=''; document.querySelector('#hookText').dispatchEvent(new Event('input',{bubbles:true}))")
    s.click('#hookText'); s.keyboard.type('I think the KDF makes the secrets differ.', delay=5); s.click('#hookCommit'); s.wait_for_selector('.reveal')
    ok('prediction locked in; the reveal arrives from the server', 'Three explanations' in s.inner_text('.reveal'))
    # learn part 1, answered correctly
    s.click('#nuBtn'); s.wait_for_selector('#check')
    for qi in range(len(KEYS['L1']['parts'][0]['checks'])):
        a = KEYS['L1']['parts'][0]['checks'][qi]['a']
        s.click('.cq >> nth=%d >> [data-o="%d"]' % (qi, a))
    s.click('#checkBtn'); s.wait_for_selector('.cfb')
    ok('Learn check graded by the server', s.locator('.cfb.ok').count() == 3)
    # tampering: forge a pass for a locked step and an attempt on a locked lesson
    forged = s.evaluate("""async()=>{
      const h={'content-type':'application/json','X-PQC':'1'};
      const a = await (await fetch('/api/student/act',{method:'POST',headers:h,body:JSON.stringify({op:'attempt',args:['L1','D1',{text:'x'},'']})})).json();
      const b = await (await fetch('/api/student/act',{method:'POST',headers:h,body:JSON.stringify({op:'attempt',args:['L3','A1',{text:'x'},'']})})).json();
      const c = await (await fetch('/api/student/act',{method:'POST',headers:h,body:JSON.stringify({op:'ui',args:[{les:{L:'L1',step:'exit'}}]})})).json();
      return [a.result, b.result, c.state.les.L1.step];
    }""")
    ok('server refuses work in locked steps and lessons, and a forged step change', forged[0].get('error') and forged[1].get('error') and forged[2] != 'exit', forged)
    # protections
    pasted = s.evaluate("()=>{const e=new ClipboardEvent('paste',{bubbles:true,cancelable:true});document.querySelector('.paper p').dispatchEvent(e);return e.defaultPrevented}")
    ok('paste blocked', pasted); s.wait_for_timeout(800)
    # sign out and back in keeps the work (signing out pauses protection)
    s.wait_for_timeout(800); s.click('#signOut'); s.wait_for_selector('#codeForm')
    s.fill('#codeIn2', tcode[1]); s.click('#codeForm button'); s.wait_for_selector('.s-head'); s.wait_for_timeout(500)
    st = s.evaluate("({step:lp('L1').step, revealed:lp('L1').hook.revealed, p1:!!(lp('L1').checks.P1||{}).submitted, lock:!!S.secureLock})")
    ok('progress survives signing out and back in, with no restart', st['revealed'] and st['p1'] and not st['lock'], st)
    if s.locator('#overlay:not([hidden]) #closeOverlay').count(): s.click('#closeOverlay')
    # reloading counts as leaving the window
    s.reload(); s.wait_for_selector('.reset-dialog'); s.wait_for_timeout(300)
    ok('reloading the page counts as leaving, and says so', 'reloaded or closed the page' in s.inner_text('.reset-dialog'), s.inner_text('.reset-dialog')[:200])
    s.click('#closeOverlay'); s.wait_for_timeout(400)
    # leaving the window
    s.evaluate(HIDE); s.wait_for_selector('.reset-dialog'); s.wait_for_timeout(1200)
    st2 = s.evaluate("({revealed:!!lp('L1').hook.revealed, p1:!!(lp('L1').checks.P1||{}).submitted, p2:!!(lp('L1').checks.P2 && (lp('L1').checks.P2.submitted || Object.keys(lp('L1').checks.P2.ans||{}).length)), step:lp('L1').step, part:lp('L1').part, cleared:S.integrity.slice(-1)[0].dropped})")
    ok('leaving restarts only the unfinished part: Hook and Part 1 kept, back to the start of Part 2', st2['revealed'] and st2['p1'] and not st2['p2'] and st2['step'] == 'learn' and st2['part'] == 1 and 'Learn part 2' in st2['cleared'], st2)
    s.reload(); s.wait_for_selector('.s-head'); s.wait_for_timeout(500)
    ok('the server keeps the same checkpoints after reload (dialog shown, Part 1 still done)', s.locator('.reset-dialog').count() == 1 and s.evaluate("lp('L1').hook.revealed && !!(lp('L1').checks.P1||{}).submitted && lp('L1').part === 1"))
    axe(s, 'student reset dialog')
    s.click('#closeOverlay'); s.wait_for_timeout(500)

    # ---------- a full Lesson 2 run through the API, ending with real Java in the sandbox ----------
    res = s.evaluate("""async (K) => {
      const h = {'content-type':'application/json','X-PQC':'1'};
      const act = async (op, args, ui) => (await (await fetch('/api/student/act',{method:'POST',headers:h,body:JSON.stringify({op,args,ui})})).json());
      const ansFor = ex => { const k = ex.kind;
        if(k==='explain') return {text:ex.model};
        if(k==='table'){ const o={}; ex.rows.forEach((row,ri)=>row.forEach((c,ci)=>{ if(c&&typeof c==='object') o[ri+':'+ci]=c.a; })); return o; }
        if(k==='fill'){ const o={}; ex.blanks.forEach((b,i)=>o[i]=b.a[0]); return o; }
        if(k==='mc') return ex.multi ? ex.a : {pick:ex.a};
        if(k==='findline') return {lines:ex.groups.map(g=>g[0]), mech:ex.mech.a};
        if(k==='multimc'){ const o={}; ex.qs.forEach((q,i)=>o[i]=q.a); return o; }
        return {}; };
      const L2 = K.L2, log = [];
      log.push((await act('hook',['L2','Probably none of them handled failures.',null])).result);
      for(let pi=0; pi<L2.parts.length; pi++){ const a={}; L2.parts[pi].checks.forEach((q,qi)=>a[qi]=q.a); log.push((await act('check',['L2',pi,a],{les:{L:'L2',step:'learn',part:pi}})).result); }
      for(const step of ['practice','diagnose']) for(const ex of L2.exercises.filter(e=>e.step===step)) log.push([ex.id,(await act('attempt',['L2',ex.id,ansFor(ex),''],{les:{L:'L2',step}})).result.status]);
      const d1 = L2.exercises.find(e=>e.id==='D1');
      const bad = await act('attempt',['L2','D1',{},d1.starter],{les:{L:'L2',step:'create'}});
      const good = await act('attempt',['L2','D1',{},d1.ref],{les:{L:'L2',step:'create'}});
      const rec = good.state.les.L2.ex.D1;
      return {log, bad:bad.result.status, good:good.result.status, ran:rec.result.run && rec.result.run.ran, runs:rec.result.run && rec.result.run.runs.map(r=>[r.label,r.exit,r.stdout.trim().split('\\n').join(' ')]), checks:rec.result.res.filter(r=>r.runtime).map(r=>[r.label,r.ok])};
    }""", KEYS)
    ok('Lesson 2 practice and diagnose items accepted in order', all((x[1] if isinstance(x, list) else 'pass') == 'pass' for x in res['log'][len(KEYS['L2']['parts'])+1:]), res['log'])
    ok('Build: the starter fails', res['bad'] != 'pass', res['bad'])
    ok('Build: the reference solution passes after really running on JDK 21 + BC 1.79', res['good'] == 'pass' and res['ran'], res)
    ok('Build: the forced-failure run exits 1', res['runs'] and res['runs'][1][1] == 1, res['runs'])
    # a sandbox outage must not cost the student an attempt
    subprocess.run(['docker', 'compose', '-f', COMPOSE, 'stop', 'runner'], capture_output=True)
    out = s.evaluate("""async (K) => {
      const h = {'content-type':'application/json','X-PQC':'1'};
      const before = (await (await fetch('/api/student/bootstrap',{headers:h})).json());
      const r = await (await fetch('/api/student/act',{method:'POST',headers:h,body:JSON.stringify({op:'attempt',args:['L2','D1',{},K.L2.exercises.find(e=>e.id==='D1').ref],ui:{les:{L:'L2',step:'create'}}})})).json();
      const after = (await (await fetch('/api/student/bootstrap',{headers:h})).json());
      const n = x => x && x.state ? x.state.les.L2.ex.D1.attempts : null;
      return {error:r.error, before:n(before), after:n(after)};
    }""", KEYS)
    subprocess.run(['docker', 'compose', '-f', COMPOSE, 'start', 'runner'], capture_output=True); s.wait_for_timeout(2500)
    ok('sandbox outage: student is told, and no attempt is used', out['error'] and 'did not count' in out['error'] and out['before'] is not None and out['before'] == out['after'], out)
    # the student sees the real program output
    s.reload(); s.wait_for_selector('.s-head'); s.wait_for_timeout(400)
    if s.locator('#overlay:not([hidden]) #closeOverlay').count(): s.click('#closeOverlay')
    s.evaluate("S.lesson='L2'; lp('L2').step='create'; studentRefresh()"); s.wait_for_selector('.fb')
    fbt = s.inner_text('.fb')
    ok('Build feedback shows the real run (exit codes and output)', 'exit 0' in fbt and 'providerIsBC=true' in fbt and 'exit 1' in fbt, fbt[:300])
    s.screenshot(path=OUT + '/03_build_feedback.png', full_page=False)

    # sign out pauses protection
    s.click('#signOut'); s.wait_for_selector('#codeForm')
    ok('signing out returns to the sign-in page', True)
    ev = psql("select count(*) from events e join users u on u.id=e.user_id where u.pseudonym='%s' and e.type='integrity'" % tcode[0])
    ok('blocked paste and restart are in the research log', int(ev.stdout.strip() or 0) >= 2, ev.stdout.strip())

    # ---------- teacher sees the class ----------
    t.goto(BASE + '/#teacher'); t.wait_for_selector('.t-head'); t.click('[data-sec="students"]'); t.wait_for_timeout(500)
    ok('teacher roster lists the student by pseudonym', tcode[0] in t.inner_text('#tbody'))
    t.click('[data-open-student="%s"]' % tcode[0]); t.wait_for_selector('text=Session log'); t.wait_for_timeout(500)
    detail = t.inner_text('#tbody')
    ok('student detail shows prediction, session log and actions', 'Lesson' in detail and 'Left the window' in detail and 'Issue a new sign-in code' in detail)
    t.screenshot(path=OUT + '/04_teacher_student.png', full_page=True)
    t.click('[data-sec="integrity"]'); t.wait_for_timeout(300)
    ok('Session integrity counts the restarts', int(t.inner_text('.kpi.warn .kv')) >= 2, t.inner_text('.kpi.warn .kv'))
    axe(t, 'teacher integrity')
    t.click('[data-sec="data"]'); t.click('[data-export="telemetry"]'); t.wait_for_function("document.querySelector('#exportText') && document.querySelector('#exportText').value.length > 100", timeout=20000)
    exp = t.input_value('#exportText')
    ok('class event export is pseudonymous and complete', tcode[0] in exp and 'exercise-submit' in exp and 'teacher@example.org' not in exp, [tcode[0] in exp, 'exercise-submit' in exp, len(exp)])
    # teacher preview grades locally with the full content, and runs code through the sandbox
    t.goto(BASE + '/#student'); t.wait_for_selector('.preview-bar')
    t.evaluate("S.lesson='L4'; const st=lp('L4'); st.step='practice'; st.cur.practice='B2'; studentRefresh()"); t.wait_for_selector('#codeIn')
    t.click('#loadRef'); t.click('#submitEx'); t.wait_for_selector('.fb', timeout=60000)
    ok('teacher preview: provenance guard runs for real and passes', 'Well done' in t.inner_text('.fb') and 'accepted' in t.inner_text('.fb'), t.inner_text('.fb')[:300])

    # ---------- database guarantees ----------
    upd = psql("update events set type='x' where id=(select min(id) from events)")
    ok('research events cannot be edited', 'append-only' in upd.stderr, upd.stderr.strip()[:120])
    dele = psql("delete from events where id=(select min(id) from events)")
    ok('research events cannot be deleted outside withdrawal', 'append-only' in dele.stderr)
    names = psql("select count(*) from users where role='student' and (email is not null or password_hash is not null)")
    ok('no e-mail or password stored for students', names.stdout.strip() == '0')
    codes_plain = psql("select count(*) from users where code_hash like '%%-%%'")
    ok('sign-in codes stored only as hashes', codes_plain.stdout.strip() == '0')
    b.close()

wd = subprocess.run(['docker', 'compose', '-f', COMPOSE, 'exec', '-T', 'app', 'node', 'scripts/withdraw.js', tcode[0], '--confirm'], capture_output=True, text=True)
left = psql("select count(*) from events e join users u on u.id=e.user_id where u.pseudonym='%s'" % tcode[0])
ok('withdrawal removes a participant and all their events', 'Withdrew' in wd.stdout and ' 0 research' not in wd.stdout and left.stdout.strip() == '0', wd.stdout + wd.stderr)
errors = [e for e in errors if 'Failed to load resource' not in e]   # 401/403/404 come from the deliberate refusal tests
ok('no page errors', not errors, errors[:5])
print('\n%d/%d passed' % (sum(r[1] for r in results), len(results)))
sys.exit(0 if all(r[1] for r in results) else 1)
