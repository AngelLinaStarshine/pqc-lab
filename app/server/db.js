'use strict';
const fs = require('fs');
const path = require('path');
const {Pool} = require('pg');

const pool = new Pool({connectionString: process.env.DATABASE_URL, max: 10});

async function migrate(){
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await pool.query(sql);
}
const q = (text, params) => pool.query(text, params);

/* One learner's actions are applied one at a time, in order. */
const chains = new Map();
function serial(key, fn){
  const prev = chains.get(key) || Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  chains.set(key, next);
  next.finally(() => { if(chains.get(key) === next) chains.delete(key); });
  return next;
}

async function insertEvents(userId, classId, source, events){
  if(!events || !events.length) return;
  const vals = [], params = [];
  events.slice(0, 500).forEach((e, i) => {
    const {t, type, lesson, ...rest} = e;
    const b = i * 7;
    vals.push(`($${b+1}, $${b+2}, to_timestamp($${b+3} / 1000.0), $${b+4}, $${b+5}, $${b+6}, $${b+7})`);
    params.push(userId, classId, Number.isFinite(t) ? t : Date.now(), source, String(type).slice(0, 40), lesson ? String(lesson).slice(0, 8) : null, JSON.stringify(rest).slice(0, 8000));
  });
  await q(`insert into events (user_id, class_id, t, source, type, lesson, payload) values ${vals.join(',')}`, params);
}

module.exports = {pool, q, migrate, serial, insertEvents};
