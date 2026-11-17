'use strict';
/* Creates a class and its teacher account.
   Usage: node scripts/create-teacher.js "<class name>" <email>
   The password is read from the TEACHER_PASSWORD environment variable or prompted for. */
const readline = require('readline');
const db = require('../server/db');
const auth = require('../server/auth');

async function ask(q){
  if(process.env.TEACHER_PASSWORD) return process.env.TEACHER_PASSWORD;
  const rl = readline.createInterface({input:process.stdin, output:process.stdout});
  return new Promise(r => rl.question(q, a => { rl.close(); r(a); }));
}
(async () => {
  const [name, email] = process.argv.slice(2);
  if(!name || !email || !/@/.test(email)){ console.error('Usage: node scripts/create-teacher.js "<class name>" <email>'); process.exit(2); }
  const pw = await ask('Password for ' + email + ' (12+ characters): ');
  if(String(pw).length < 12){ console.error('Password must be at least 12 characters.'); process.exit(2); }
  await db.migrate();
  const c = await db.q('insert into classes (name) values ($1) returning id', [name]);
  await db.q("insert into users (role, class_id, pseudonym, email, password_hash) values ('teacher', $1, $2, $3, $4)",
    [c.rows[0].id, 'T-' + auth.randomPseudonym().slice(2), email.toLowerCase(), auth.hashPassword(pw)]);
  console.log('Created class "' + name + '" with teacher ' + email);
  await db.pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
