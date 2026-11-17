'use strict';
/* Runs the shared lesson engine (the same code the browser runs) inside one
   isolated V8 context. Each call loads one learner's state, applies one
   operation, and hands the new state and the events it produced back.
   Calls are synchronous, so two learners can never interleave inside it. */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const SHARED = path.join(__dirname, '..', 'shared');
const ctx = vm.createContext({console, Math, Date, JSON, Number, String, Array, Object, Set, Map, RegExp, Error, Promise});
for (const f of ['catalog.js', 'lessons.js', 'engine.js', 'ops.js']) {
  vm.runInContext(fs.readFileSync(path.join(SHARED, f), 'utf8'), ctx, {filename: f});
}
vm.runInContext(`
var HOST = (function(){
  function merge(base, over){
    if(!over || typeof over !== 'object' || Array.isArray(over)) return base;
    Object.keys(base).forEach(k => {
      if(!(k in over)) return;
      const b = base[k], o = over[k];
      if(b && typeof b === 'object' && !Array.isArray(b) && o && typeof o === 'object' && !Array.isArray(o)) base[k] = merge(b, o);
      else if(Array.isArray(b) ? Array.isArray(o) : typeof b === typeof o || b == null) base[k] = o;
    });
    return base;
  }
  function settingsFrom(saved){
    const d = defaultSettings();
    d.includeLive = false; d.showSample = false;
    return merge(d, saved || {});
  }
  function load(stateJson, settings, arm){
    SETTINGS = settingsFrom(settings); applySettings();
    S = stateJson ? JSON.parse(stateJson) : freshState();
    S.arm = arm; S.preview = false; S.telemetry = [];
    S.flags = S.flags || {}; S.integrity = S.integrity || []; S.restarts = S.restarts || {};
  }
  function dump(result){
    const events = S.telemetry.splice(0);
    return JSON.stringify({result: result === undefined ? null : result, state: S, events});
  }
  function reveals(){
    const r = {};
    Object.keys(S.les || {}).forEach(L => { if(S.les[L].hook && S.les[L].hook.revealed && LESSONS[L] && LESSONS[L].hook) r[L] = LESSONS[L].hook.reveal; });
    return r;
  }
  return {
    settings: saved => JSON.stringify(settingsFrom(saved)),
    op(stateJson, settings, arm, ui, name, args){
      load(stateJson, settings, arm);
      if(ui) opUi(ui);
      let result = null;
      if(name){
        if(!OPS[name]) result = {error:'Unknown action.'};
        else result = OPS[name].apply(null, args || []);
      }
      return dump(result);
    },
    fresh(settings, arm){ load(null, settings, arm); return dump(null); },
    reveals(stateJson, settings, arm){ load(stateJson, settings, arm); return JSON.stringify(reveals()); },
    publicLessons(stateJson, settings, arm){ load(stateJson, settings, arm); return JSON.stringify(publicLessons(reveals())); },
    fullLessons(){ return JSON.stringify(LESSONS); },
    record(stateJson, settings, arm, id, minutesAgo){ load(stateJson, settings, arm); return JSON.stringify(learnerRecord(id, arm, minutesAgo)); },
    exercise(L, id){ const les = LESSONS[L]; const ex = les && !les.placeholder && les.exercises.find(e => e.id === id); return ex ? JSON.stringify({id:ex.id, kind:ex.kind, step:ex.step}) : 'null'; },
    canRun(stateJson, settings, arm, L, id){
      load(stateJson, settings, arm);
      const les = LESSONS[L]; const ex = les && !les.placeholder && les.exercises.find(e => e.id === id);
      if(!ex || ex.kind !== 'code') return 'No such code exercise.';
      return canAct(L, ex.step) || '';
    },
  };
})();`, ctx, {filename: 'host.js'});

const HOST = vm.runInContext('HOST', ctx);
const parse = s => JSON.parse(s);

module.exports = {
  settings: saved => parse(HOST.settings(saved || {})),
  /* state is the stored JSON string (or null); returns {result, state, events} */
  op: (stateJson, settings, arm, ui, name, args) => parse(HOST.op(stateJson, settings, arm, ui || null, name || null, JSON.parse(JSON.stringify(args || [])))),
  fresh: (settings, arm) => parse(HOST.fresh(settings, arm)),
  reveals: (stateJson, settings, arm) => parse(HOST.reveals(stateJson, settings, arm)),
  publicLessons: (stateJson, settings, arm) => parse(HOST.publicLessons(stateJson, settings, arm)),
  fullLessons: () => parse(HOST.fullLessons()),
  record: (stateJson, settings, arm, id, minutesAgo) => parse(HOST.record(stateJson, settings, arm, id, minutesAgo)),
  exercise: (L, id) => parse(HOST.exercise(L, id)),
  canRun: (stateJson, settings, arm, L, id) => HOST.canRun(stateJson, settings, arm, L, id) || null,
};
