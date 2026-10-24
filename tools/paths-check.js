// Release checks for learning paths: node tools/paths-check.js [--strict]
// 1 ids exist · 2 no cycles (per language) · 3 prerequisites come first in every route · 4 required solutions exist in the
// route's language and no module switches language without explaining why · 5 schedules equal the sum of module hours.
// Without --strict, missing language implementations are reported as warnings (work in progress); with --strict they fail.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const STRICT = process.argv.includes('--strict');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const base = { console, MODULES: [], window: {} };
base.registerModule = (m) => base.MODULES.push(m);
vm.createContext(base);
for (const f of ['src/helpers.js', 'src/tracks.js', 'src/paths.js']) vm.runInContext(rd(f), base, { filename: f });
const { TRACKS, PATHS } = base;
const asList = (x) => (x === undefined || x === null ? [] : Array.isArray(x) ? x : [x]);
const errors = [], warns = [];
const E = (m) => errors.push(m), W = (m) => warns.push(m);

const META = {};
TRACKS.forEach((t) => t.modules.forEach((pm) => { META[pm.id] = { track: t, pm }; }));
const LANG_OF = { java: 'java', python: 'python', py: 'python', js: 'js', javascript: 'js', ts: 'js', typescript: 'js', cpp: 'cpp', 'c++': 'cpp', c: 'cpp' };
const GENERAL = ['java', 'python', 'js', 'cpp'];

/* ---------- load modules ---------- */
const MOD = {};
for (const id of Object.keys(META)) {
  const f = path.join(root, 'content', META[id].track.id, id + '.js');
  if (!fs.existsSync(f)) continue;
  const c = { console, MODULES: [], window: {} };
  c.registerModule = (m) => c.MODULES.push(m);
  vm.createContext(c);
  for (const g of ['src/helpers.js', 'src/tracks.js']) vm.runInContext(rd(g), c);
  try { vm.runInContext(fs.readFileSync(f, 'utf8'), c, { filename: f }); } catch (e) { E(id + ': module failed to load: ' + e.message); continue; }
  const m = c.MODULES[0], def = m.lang || META[id].track.lang;
  const problems = [];
  m.topics.forEach((t) => asList(t.problems).concat(asList(t.problem)).forEach((p) => problems.push({ p, lang: p.lang || t.lang || def })));
  (m.practice || []).forEach((p) => problems.push({ p, lang: p.lang || def }));
  const codeLangs = new Set();
  const addCode = (x, l) => { if (!x) return; const s = typeof x === 'string' ? { lang: l } : x; const k = LANG_OF[String(s.lang || l).toLowerCase()]; if (k) codeLangs.add(k); asList(s.alt).forEach((a) => addCode(a, l)); };
  m.topics.forEach((t) => { asList(t.code).forEach((c2) => addCode(c2, t.lang || def)); asList(t.examples).forEach((ex) => addCode(ex.code, t.lang || def)); });
  const solLangs = problems.map((pr) => {
    const s = pr.p.solution || {}, set = new Set();
    const add = (x) => { if (!x) return; const l = typeof x === 'object' && x.lang ? x.lang : pr.lang; const k = LANG_OF[String(l).toLowerCase()]; if (k) set.add(k); };
    add(s.code); asList(s.alt).forEach(add);
    set.forEach((k) => codeLangs.add(k));
    return { title: pr.p.title, langs: set, tested: !!pr.p.tests };
  });
  MOD[id] = { m, hours: m.hours || 0, codeLangs, solLangs, explains: m.langExplain || null };
}

/* ---------- 1 ids exist ---------- */
const exists = (id) => !!META[id];
const known = (id) => id.indexOf('prep:') === 0 ? ['prep:dsa', 'prep:lld', 'prep:conc'].includes(id) : exists(id);
for (const [k, list] of Object.entries(PATHS.NEEDS)) { if (!exists(k)) E('NEEDS key ' + k + ' is not a module'); list.forEach((x) => { if (!known(x)) E(k + ' needs unknown ' + x); if (x === k) E(k + ' needs itself'); }); }
for (const [k, list] of Object.entries(PATHS.RECS)) { if (!exists(k)) E('RECS key ' + k + ' is not a module'); list.forEach((x) => { if (!known(x)) E(k + ' recommends unknown ' + x); }); }
for (const [lang, p] of Object.entries(PATHS.PREP)) ['dsa', 'lld', 'conc'].forEach((k) => (p[k] || []).forEach((x) => { if (!exists(x)) E('PREP.' + lang + '.' + k + ' has unknown ' + x); }));
PATHS.ROUTES.forEach((r) => { r.stages.forEach((st) => { st.mods.forEach((x) => { if (!known(x)) E('route ' + r.id + ' has unknown ' + x); }); if (st.project && !PATHS.PROJECTS[st.project]) E('route ' + r.id + ' project ' + st.project + ' is not defined'); asList(st.behavioral).forEach((x) => { if (!exists(x)) E('route ' + r.id + ' behavioral ' + x + ' unknown'); }); }); asList(r.extensions).forEach((x) => { if (!known(x)) E('route ' + r.id + ' extension ' + x + ' unknown'); }); });
Object.keys(META).forEach((id) => { if (!MOD[id]) W(id + ': module file not written yet'); });

/* ---------- 2 no cycles (per language) ---------- */
for (const lang of GENERAL) {
  const state = {};
  const stack = [];
  const visit = (id) => {
    if (state[id] === 2) return;
    if (state[id] === 1) { E('cycle (' + lang + '): ' + stack.slice(stack.indexOf(id)).concat(id).join(' → ')); return; }
    state[id] = 1; stack.push(id);
    PATHS.needs(id, lang).forEach(visit);
    stack.pop(); state[id] = 2;
  };
  Object.keys(META).forEach(visit);
}
// Same-track prerequisites that point forwards in the track list are listed as warnings: usually a stale reference, but
// modules added later (such as the AI maths modules) legitimately sit at the end of their track.
const pos = {};
TRACKS.forEach((t) => t.modules.forEach((pm, i) => { pos[pm.id] = { t: t.id, i }; }));
for (const [k, list] of Object.entries(PATHS.NEEDS)) list.forEach((x) => { if (pos[x] && pos[k] && pos[x].t === pos[k].t && pos[x].i > pos[k].i && !['cs', 'devops'].includes(pos[k].t)) W(k + ' needs ' + x + ', which comes later in the same track'); });

/* ---------- 3, 4, 5 per route and language ---------- */
const HOURS = {};
Object.entries(MOD).forEach(([id, x]) => { HOURS[id] = x.hours; });
const summary = [];
PATHS.ROUTES.forEach((r) => r.langs.forEach((lang) => {
  const pl = PATHS.plan(r.id, lang);
  const where = {};
  pl.items.forEach((it, i) => { where[it.id] = i; });
  pl.items.forEach((it, i) => PATHS.needs(it.id, lang).forEach((n) => { if (where[n] === undefined) E(r.id + '/' + lang + ': ' + it.id + ' needs ' + n + ' but it is not in the route'); else if (where[n] > i) E(r.id + '/' + lang + ': ' + n + ' comes after ' + it.id + ', which needs it'); }));
  let missing = 0, untested = 0, switches = 0;
  pl.items.forEach((it) => {
    const x = MOD[it.id];
    if (!x) return;
    const tr = META[it.id].track.id;
    if (tr === 'dsa' || tr === 'lld') {
      x.solLangs.forEach((s) => {
        if (!s.langs.has(lang)) { missing++; (STRICT && it.kind === 'core' ? E : W)(r.id + '/' + lang + ': ' + it.id + ' "' + s.title + '" has no ' + lang + ' solution'); }
        if (!s.tested) { untested++; (STRICT && it.kind === 'core' ? E : W)(r.id + '/' + lang + ': ' + it.id + ' "' + s.title + '" has no tests'); }
      });
    }
    const general = [...x.codeLangs].filter((l) => GENERAL.includes(l));
    if (general.length && !general.includes(lang) && !x.explains) { switches++; (STRICT && it.kind === 'core' ? E : W)(r.id + '/' + lang + ': ' + it.id + ' uses only ' + general.join('/') + ' code with no explanation for ' + lang + ' learners'); }
  });
  const sch = PATHS.schedule(r.id, lang, HOURS);
  let core = 0, rec = 0;
  pl.items.forEach((it) => { if (it.kind === 'core') core += HOURS[it.id] || 0; else if (it.kind === 'rec') rec += HOURS[it.id] || 0; });
  if (sch.core !== core || sch.rec !== rec) E(r.id + '/' + lang + ': schedule hours ' + sch.core + '+' + sch.rec + ' do not equal module hours ' + core + '+' + rec);
  summary.push(r.id + '/' + lang + ': ' + pl.items.length + ' modules, ' + sch.total + ' h (core ' + sch.core + ', rec ' + sch.rec + ', revision ' + sch.revision + ', projects ' + sch.projects + ') → ' + [5, 10, 20, 40].map((w) => sch.weeks[w] + ' wk @' + w).join(', ') + (missing ? '; ' + missing + ' missing solutions' : '') + (untested ? '; ' + untested + ' untested' : '') + (switches ? '; ' + switches + ' language switches' : ''));
}));

/* ---------- 6 Learn.relevance / pathTracks agree with PATHS.plan for every route and language ---------- */
{
  const store = {};
  const L = { console, PATHS, window: {}, JSON, Date, Object, Array, Math, String,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } } };
  L.window = L;
  const PM = {};
  Object.keys(META).forEach((id) => { PM[id] = [META[id].pm.title, META[id].track.id, META[id].pm.level, HOURS[id] || 0, 15, 0, 0, 0]; });
  L.IM_PATHMETA = PM;
  L.CustomEvent = function (n) { this.type = n; };
  let events = 0;
  L.dispatchEvent = () => { events++; };
  vm.createContext(L);
  vm.runInContext(rd('src/learn.js') + '\n;this.Learn = Learn;', L, { filename: 'src/learn.js' });
  const Learn = L.Learn;
  let checked = 0;
  PATHS.ROUTES.forEach((r) => r.langs.forEach((lang) => {
    const tag = r.id + '/' + lang;
    store['imastery.route'] = JSON.stringify({ id: r.id, lang, hours: 10, mode: 'path', onboarded: true, known: [], updatedAt: 1 });
    if (Learn.pref().id !== r.id || Learn.pref().lang !== lang || Learn.mode() !== 'path') E(tag + ': Learn.pref() does not read the stored route');
    const pl = PATHS.plan(r.id, lang);
    if (!pl.items.length) E(tag + ': plan is empty');
    const want = {};
    pl.items.forEach((it) => { want[it.id] = { state: it.kind, stage: it.stage }; });
    pl.extensions.forEach((id) => { if (!want[id]) want[id] = { state: 'ext', stage: -1 }; });
    Object.keys(META).forEach((id) => {
      const got = Learn.relevance(id), w = want[id] || { state: 'off', stage: -1 };
      checked++;
      if (got.state !== w.state || got.stage !== w.stage || got.route !== r.id) E(tag + ': relevance(' + id + ') = ' + JSON.stringify(got) + ', plan says ' + JSON.stringify(w));
      if (Learn.onPath(id) !== (w.state !== 'off')) E(tag + ': onPath(' + id + ') disagrees with the plan');
    });
    const pt = Learn.pathTracks(), seen = [];
    pl.items.forEach((it) => { const t = META[it.id].track.id; if (seen.indexOf(t) < 0) seen.push(t); });
    if (pt.map((x) => x.track).join() !== seen.join()) E(tag + ': pathTracks order ' + pt.map((x) => x.track).join() + ' differs from plan order ' + seen.join());
    pt.forEach((x) => {
      const ids = pl.items.filter((it) => META[it.id].track.id === x.track).map((it) => it.id);
      if (x.required !== ids.length || x.mods.join() !== ids.join()) E(tag + ': pathTracks ' + x.track + ' lists ' + x.mods.join() + ', plan has ' + ids.join());
      if (x.total !== META[ids[0]].track.modules.length) E(tag + ': pathTracks ' + x.track + ' total ' + x.total + ' is not the track size');
    });
    // A language the learner already knows: that language's own track turns optional, nothing else changes.
    store['imastery.route'] = JSON.stringify({ id: r.id, lang, hours: 10, mode: 'path', onboarded: true, known: [lang], updatedAt: 1 });
    const LT = { java: 'java', python: 'py', js: 'js', cpp: 'cpp' }[lang];
    pl.items.forEach((it) => {
      const g = Learn.relevance(it.id).state, exp = it.kind === 'core' && META[it.id].track.id === LT ? 'opt' : it.kind;
      if (g !== exp) E(tag + ' (known ' + lang + '): relevance(' + it.id + ') = ' + g + ', expected ' + exp);
    });
  }));
  // Explore all: no route chosen means mode 'all'; legacy imastery.dest migrates once and is removed.
  Object.keys(store).forEach((k) => delete store[k]);
  if (Learn.mode() !== 'all' || Learn.pref().chosen) E('no stored route must mean Explore all and chosen=false');
  store['imastery.dest'] = JSON.stringify('ml');
  if (Learn.pref().id !== 'aiapp' || 'imastery.dest' in store) E('imastery.dest "ml" did not migrate to aiapp');
  Object.keys(store).forEach((k) => delete store[k]);
  events = 0;
  Learn.setPref({ mode: 'all', onboarded: true });
  if (Learn.pref().chosen || !Learn.pref().onboarded || !events || !Learn.pref().updatedAt) E('setPref (skip) must keep chosen=false, set onboarded and updatedAt, and fire im:pref');
  Object.entries(PATHS.LANG_ONLY || {}).forEach(([id, x]) => { if (!META[id]) E('LANG_ONLY has unknown module ' + id); x.langs.forEach((l) => { if (!GENERAL.includes(l)) E('LANG_ONLY ' + id + ' has unknown language ' + l); }); });
  const nLang = Object.keys(PATHS.LANG_ONLY || {}).length;
  if (nLang < 6 || nLang > 10) E('LANG_ONLY should tag 6 to 10 framework-specific modules, has ' + nLang);
  summary.push('relevance: ' + checked + ' module/route/language checks agree with PATHS.plan');
}

summary.forEach((s) => console.log(s));
if (warns.length) console.log(warns.length + ' warning(s)' + (process.argv.includes('--verbose') ? ':\n  ' + warns.join('\n  ') : ' (run with --verbose to list)'));
errors.forEach((e) => console.log('ERROR ' + e));
console.log(errors.length ? 'FAILED with ' + errors.length + ' error(s)' : 'PASSED');
process.exit(errors.length ? 1 : 0);
