'use strict';
/* Participant withdrawal: deletes every row about one student, including the
   append-only research events. Usage: node scripts/withdraw.js <pseudonym> --confirm
   Record the withdrawal (pseudonym and date only) in the study log kept for the REB. */
const db = require('../server/db');
(async () => {
  const [pseudonym, confirm] = process.argv.slice(2);
  if(!pseudonym || confirm !== '--confirm'){ console.error('Usage: node scripts/withdraw.js <pseudonym> --confirm'); process.exit(2); }
  const client = await db.pool.connect();
  try {
    await client.query('begin');
    const u = await client.query("select id from users where pseudonym = $1 and role = 'student'", [pseudonym]);
    if(!u.rows[0]) throw new Error('No student with pseudonym ' + pseudonym);
    await client.query("set local pqc.withdrawal = 'on'");
    const e = await client.query('delete from events where user_id = $1', [u.rows[0].id]);
    await client.query('delete from users where id = $1', [u.rows[0].id]);
    await client.query('commit');
    console.log('Withdrew ' + pseudonym + ': removed the account, saved progress and ' + e.rowCount + ' research events.');
  } catch(err){ await client.query('rollback'); console.error(err.message); process.exitCode = 1; }
  finally { client.release(); await db.pool.end(); }
})();
