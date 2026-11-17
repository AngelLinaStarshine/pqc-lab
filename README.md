# PQC Lab — pilot server

An adaptive learning environment for post-quantum cryptography in Java: four lessons covering ML-KEM (FIPS 203) with Bouncy Castle 1.79 on JDK 21. It includes a teacher console and a research log, and is built for a two-arm classroom study (Arm T: adaptive tutor; Arm C: control).

This is the version to deploy for the REB-approved pilot. Everything below was run and checked on this exact code. See [Validation](#what-has-been-validated).

---

## 0. Working in VS Code

Open this folder in VS Code (**File ▸ Open Folder…**) and accept the recommended extensions: Extension Pack for Java, Docker and Python.

| What | How |
| --- | --- |
| Run a lesson's Java program | **Run and Debug** (Ctrl+Shift+D): pick e.g. *Lesson 2 · KemCheck* and press ▷. The programs are in `java-lab/src/main/java`, on Java 21 + Bouncy Castle 1.79, exactly as in the grading sandbox. |
| Try the lab without a server | **Terminal ▸ Run Task… ▸ Prototype: open in the browser** (`prototype/pqc-lab.html`, everything runs in the page). |
| Start the real lab on your computer | Install Docker Desktop, copy `.env.example` to `.env`, fill in the two secrets and set `COOKIE_SECURE=false`. Then run **Lab server: start (Docker)** and **Lab server: create teacher account**, and open http://localhost:8080. |
| Check the lessons after editing them | **Tests: lesson content + relevance + checkpoints** (takes seconds, needs only Node.js). |

You need **JDK 21** (e.g. Eclipse Temurin 21) for the Java programs and **Node.js 22** for the tests. Maven is optional: the Java extension builds `java-lab/pom.xml` itself.

Where to edit: lesson text and answer keys are in `app/shared/lessons.js` (server only, never sent to students); screens in `app/public/ui.js` and `app/public/style.css`; grading and the restart, relevance and checkpoint rules in `app/shared/ops.js`; the Java grading harness in `app/server/harness.js`. After any change, rebuild with **Lab server: start (Docker)**.

## 1. What runs where

```
 student / teacher browser ──HTTPS──▶ reverse proxy (Caddy / nginx, TLS)
                                            │  127.0.0.1:8080
                                      ┌─────▼─────┐   internal network   ┌──────────────┐
                                      │    app    │ ───────────────────▶ │  PostgreSQL  │
                                      │ (Node 22) │                      │      16      │
                                      └─────┬─────┘                      └──────────────┘
                                            │ internal network, no internet
                                      ┌─────▼─────┐
                                      │  runner   │  JDK 21.0.13 + Bouncy Castle 1.79
                                      │ (sandbox) │  compiles and runs student Java
                                      └───────────┘
```

- **The server decides everything that counts.** Grading, reveals, step unlocking, lesson restarts and the learner model all run on the server. Students' pages never receive the answer keys, model answers, reference code or hook reveals. The browser runs the same engine code, but only to draw the screens.
- **Students' Java really runs.** It runs on JDK 21.0.13 with Bouncy Castle 1.79 (jar pinned by SHA-256). The sandbox has no network, a read-only file system and its own unprivileged user per parallel slot. It enforces CPU-time, heap, process and output limits.
- **Free-text answers must be real attempts.** The Hook guess, written explanations and exit answers are checked on the server before they are accepted. Gibberish, "I don't know", repeated words, a copy of the question, or text unrelated to the topic is refused with a short message. A refusal uses no attempt and reveals nothing, and it is logged as `answer-rejected`. The check is lenient: a wrong but genuine guess is accepted.
- **Session protection works as in the Python Lab.** Copy, cut, paste, drag-and-drop and bulk insert are blocked in lessons. Leaving the window (switching tab, minimising, reloading or closing) restarts the **current part** by default. Every finished part is a checkpoint and is kept: the Hook, each Learn part, Practice, Diagnose, Build and the Exit ticket. A student who has finished Part 1 and leaves in the middle of Part 2 starts again at the beginning of Part 2. In Settings the scope can also be set to the current exercise, the whole lesson, or the whole course. The server enforces the restart, so reloading the page does not undo it.

## 2. Hosting in Canada

Use one Linux VM (Ubuntu 22.04/24.04 or Debian 12) hosted in Canada. Options include:

- your university's research computing or IT-hosted VM service (often the easiest route for REB data-residency wording);
- the Digital Research Alliance of Canada cloud;
- a commercial provider's Canadian region, e.g. AWS `ca-central-1` (Montréal), Azure *Canada Central* (Toronto), Google Cloud `northamerica-northeast1` (Montréal) or `northamerica-northeast2` (Toronto), or OVHcloud Beauharnois (QC).

Confirm the choice with your institution's privacy office and state it in the REB application. The database and all backups must stay in Canada.

**Size.** The Java sandbox needs the most capacity.

| Class size | VM | `.env` sandbox settings |
|---|---|---|
| up to ~20 | 2 vCPU, 4 GB RAM, 20 GB disk | defaults (`RUNNER_WORKERS=2`) |
| ~30–40 | 4 vCPU, 8 GB RAM, 20 GB disk | `RUNNER_WORKERS=4  RUNNER_CPUS=4.0  RUNNER_MEM=2g  RUNNER_PIDS=512` |

Measured on 2 vCPU: one Build check takes about 3.6 s. When 15 students submit in the same second, all 15 run and pass, and the last result arrives after about 44 s. With 4 workers on 4 vCPU this is roughly halved. Waiting students see "Compiling and running…". If the sandbox is ever unreachable, the student is told, their code is kept, and **no attempt is used**.

## 3. Install

```bash
# on the VM, as a sudo user
# install Docker Engine with the compose plugin (docs.docker.com/engine/install) and Caddy (caddyserver.com/docs/install)
git clone <this repository> pqc-lab && cd pqc-lab      # or unzip the delivered archive

cp .env.example .env
# fill in two long random secrets:
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$(openssl rand -hex 24)|; s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -hex 32)|" .env
chmod 600 .env

sudo docker compose up -d --build
sudo docker compose ps          # app, db, runner: running
curl -s http://127.0.0.1:8080/healthz
```

**TLS.** Point a DNS name at the VM, then put this in `/etc/caddy/Caddyfile`. Caddy obtains and renews the certificate itself.

```
pqclab.example.ca {
    reverse_proxy 127.0.0.1:8080
}
```

`sudo systemctl reload caddy`. Keep `COOKIE_SECURE=true` (the default). Allow only ports 22, 80 and 443 in the firewall (`sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable`).

**Images are pinned by digest** (`@sha256:` in both Dockerfiles and the compose file), so a rebuild gets the exact Node, JDK and PostgreSQL that were tested. When you deliberately update one, rerun the tests in §7.

## 4. Before the first class

```bash
# 1. create the class and its teacher account (password is prompted for)
sudo docker compose exec app node scripts/create-teacher.js "COMP 3xxx – Fall 2026 – Section A" teacher@university.ca

# 2. sign in at https://pqclab.example.ca → "Staff sign-in"
#    Settings → choose the protection scope and the lesson release plan
#    Settings → "Create sign-in codes" → e.g. 32. Arms are assigned in balanced random blocks.
#    Print the code sheet and hand one code to each consenting student.
```

- **Students never give a name or e-mail.** They sign in with a 12-character code (`XXXX-XXXX-XXXX`; case and separators are ignored) and appear everywhere as a pseudonym such as `P-9751264F`. The only place a code can be linked to a person is the printed sheet. Keep that sheet with the consent forms, not on the server.
- If a student loses a code, the teacher opens the student and clicks **Issue a new sign-in code**. The old code stops working.
- Teachers can move a student between arms or reset progress. Each change is written to the research log.

## 5. Research data (for the REB application)

**What is stored** (PostgreSQL, on the Canadian VM only):

| Table | Contents | Identifying? |
|---|---|---|
| `users` | pseudonym, arm, SHA-256 hash of the sign-in code (peppered with `SESSION_SECRET`), created / last-seen time. Staff: e-mail and scrypt password hash | Students: no. Staff: e-mail |
| `sessions` | SHA-256 of the session cookie, expiry (12 h) | no |
| `learner_state` | each student's progress, answers, code drafts, learner-model estimates, session-integrity log | only if a student types identifying text into a free-text answer |
| `events` | the research log: timestamped, pseudonymous events (sign-in, predictions, checks, submissions with result and real-run status, restarts, blocked pastes, tutor turns, teacher actions). **Append-only**: a database trigger rejects every UPDATE and every DELETE except a withdrawal | same as above |

Not stored: names, student e-mails, IP addresses (the sign-in limiter keeps failed-attempt counts in memory only), browser fingerprints. No third-party scripts, fonts or analytics are loaded, and the Content-Security-Policy forbids them. **No data leaves the server.** The tutor in this version is rule-based and needs no outside service (see §8).

Ask students in the consent script not to write their name in free-text answers.

**Exports** (teacher console → *Data & export*): class event log, integrity log and tutor transcripts as JSON, all pseudonymous. For analysis straight from the database:

```bash
sudo docker compose exec db psql -U pqclab -d pqclab -c "\copy (select u.pseudonym, u.arm, e.t, e.type, e.lesson, e.payload from events e join users u on u.id=e.user_id where u.role='student' order by e.t) to stdout csv header" > events.csv
```

**Withdrawal.** This deletes the account, its saved progress and every research event about that student, and nothing else:

```bash
sudo docker compose exec app node scripts/withdraw.js P-9751264F --confirm
# → Withdrew P-9751264F: removed the account, saved progress and 87 research events.
```

Record the pseudonym and date in your study log. Old backups still hold the data until they expire, so set the backup retention to match what the REB protocol promises.

**Backups** (encrypted, kept in Canada):

```bash
# nightly, e.g. /etc/cron.d/pqclab:  15 2 * * * root /opt/pqc-lab/backup.sh
cd /opt/pqc-lab && docker compose exec -T db pg_dump -U pqclab -Fc pqclab \
  | gpg --batch --symmetric --cipher-algo AES256 --passphrase-file /root/.pqclab-backup-pass \
  > /var/backups/pqclab-$(date +%F).dump.gpg
find /var/backups -name 'pqclab-*.dump.gpg' -mtime +30 -delete      # retention: match your protocol
```

Restore: `gpg -d file.dump.gpg | docker compose exec -T db pg_restore -U pqclab -d pqclab --clean`.

**End of study.** Export, then `docker compose down -v`. This destroys the database volume. Then delete the backups according to the protocol.

## 6. Operating during a class

- `sudo docker compose logs -f app runner` shows errors only. Requests are not logged.
- `curl -s http://127.0.0.1:8080/healthz` checks the app and its database connection.
- The teacher console refreshes itself every 30 s, and whenever a section is opened.
- Restarting a container (`docker compose restart app`) does not lose work. State is saved on every action, and drafts are saved every 5 s and when the page is hidden.
- A whole class signing in at once from one school IP is fine. The limiter counts only *failed* sign-ins (30 per minute per IP).

## 7. Tests (rerun after any change, on a test copy, never on the live pilot)

```bash
# content: every key, distractor, table, blank and exit item in the server's lesson files
node tests/content-bundle.js                                    # → FAILURES 0

# end to end in a real browser against the real stack (DELETES ALL STUDENT DATA, test stack only)
pip install playwright && playwright install chromium
(cd tests && npm i axe-core@4)
PQC_TEST_STACK=1 python3 tests/e2e.py                           # → 40/40 passed

# class-size load: N students from one IP + M simultaneous Java runs
node tests/load.js 30 15

# restart checkpoints and the free-text relevance check (no server needed)
node tests/checkpoints.js
node tests/relevance.js
```

`tests/java/` holds the probes that settled every factual claim in the lessons on real JDK 21.0.13 + BC 1.79.

## 8. Known limits (state these in the REB application)

1. **The Arm T tutor is rule-based, not an LLM.** It runs in the student's page, follows the designed Socratic policy (hint ladder, no answers), and every turn is logged on the server. Connecting a real model means changing the data-flow description, because prompts would leave the server. If you do it, use a provider with Canadian data residency, and only after REB amendment.
2. **Lessons 5 and 6 are not authored.** The course has four complete lessons, about 7 h 25 min of work in total (Lesson 1 1 h 30, Lesson 2 2 h 5, Lesson 3 1 h 50, Lesson 4 2 h). These are estimates from the content (`LESSON_TIME` in `app/shared/catalog.js`); replace them with the measured medians after the pilot.
3. **Session protection is a deterrent, not proctoring.** It cannot see a phone or a second computer. Report it in the paper as "friction against copy-paste and tab-switching, logged", not as exam security.
4. **Reloading or closing the page counts as leaving the window,** as in the Python Lab. Tell students at the start: *"If you leave this window, the part you are working on starts again. Parts you have finished are kept."* Signing out properly with the **Sign out** button pauses protection and keeps the work.
5. Four code exercises are graded by really compiling and running them: the Build exercises of Lessons 2–4 and Lesson 4's practice item B2. Lesson 1's Build is a written explanation, graded against its rubric.
6. Accessibility: axe-core reports 0 WCAG 2 A/AA violations on the sign-in page, the restart dialog and the teacher console in this server build, and on the lesson screens in the prototype walkthrough. A screen-reader walkthrough by a person is still recommended before the pilot.

## What has been validated

| Check | Result |
|---|---|
| Lesson content (keys, distractors, shuffles, tables, blanks, exits) on the server's lesson files | 0 failures |
| Every factual Java claim (sizes, defaults, exceptions, provider routing) on real JDK 21.0.13 / 25 + BC 1.79 | all corrected and confirmed |
| Reference solutions pass and starters fail in the real sandbox | 4 / 4 |
| Sandbox attacks: network, DNS, kill, environment, file writes, heap, disk, fork bomb, endless loop, output flood; fork bomb and `kill -1` beside an honest job in the other slot | all contained, honest job unaffected |
| End to end in Chromium: sign-in, key leakage, CSRF, server-side locks, paste block, restart on leave/reload, real Java feedback, sandbox outage, teacher console, exports, append-only log, hashing, withdrawal, accessibility | 40 / 40 |
| Load: 30 students from one IP (330 requests) | 0 errors, p95 306 ms, all progress saved |
| Load: 15 simultaneous Java submissions (2 vCPU) | 15 / 15 ran and passed, slowest 44 s |
