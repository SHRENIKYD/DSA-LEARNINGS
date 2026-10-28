// Builds the static site into ./site  —  usage: node tools/build.js [outDir] [--strict]  (--strict or STRICT=1: exit 1 on any skipped module or warning)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const STRICT = argv.includes('--strict') || process.env.STRICT === '1';
const out = path.resolve(argv.find((a) => !a.startsWith('--')) || path.join(root, 'site'));
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const VERSION = JSON.parse(rd('package.json')).version;

function context() {
  const ctx = { console, MODULES: [], window: {} };
  ctx.registerModule = (m) => ctx.MODULES.push(m);
  vm.createContext(ctx);
  for (const f of ['src/helpers.js', 'src/tracks.js', 'src/engine.js']) vm.runInContext(rd(f), ctx, { filename: f });
  return ctx;
}
const base = context();
const TRACKS = base.TRACKS;
const strip = (s) => String(s || '').replace(/<[^>]*>/g, '');
const asList = (x) => (x === undefined || x === null ? [] : Array.isArray(x) ? x : [x]);

// ---------- dependency-free minifiers ----------
// JS: drops comments and indentation and the spaces between tokens that do not need them. Strings, template
// literals and regex literals are copied byte for byte, and line breaks between tokens are kept (so automatic
// semicolon insertion behaves exactly as before). Anything that does not parse afterwards falls back to the source.
const ID = /[\w$\\\u0080-\uffff]/;
const RE_KW = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);
function minifyJs(src) {
  let out = '', p = '', i = 0, sp = false, nl = false, last = null, lastWord = '';
  const n = src.length;
  const strEnd = (j) => { const q = src[j++]; while (j < n && src[j] !== q) { if (src[j] === '\\') j++; else if (src[j] === '\n') throw new Error('unterminated string'); j++; } return j + 1; };
  const tplEnd = (j) => { j++; while (j < n) { const c = src[j]; if (c === '\\') j += 2; else if (c === '`') return j + 1; else if (c === '$' && src[j + 1] === '{') j = exprEnd(j + 2); else j++; } throw new Error('unterminated template'); };
  const exprEnd = (j) => {
    let d = 0;
    while (j < n) {
      const c = src[j];
      if (c === '"' || c === "'") j = strEnd(j);
      else if (c === '`') j = tplEnd(j);
      else if (c === '/' && src[j + 1] === '/') { while (j < n && src[j] !== '\n') j++; }
      else if (c === '/' && src[j + 1] === '*') { const e = src.indexOf('*/', j + 2); if (e < 0) throw new Error('unterminated comment'); j = e + 2; }
      else if (c === '{') { d++; j++; } else if (c === '}') { if (!d) return j + 1; d--; j++; } else j++;
    }
    throw new Error('unterminated ${');
  };
  const reEnd = (j) => { j++; let cls = false; while (j < n) { const c = src[j]; if (c === '\\') j++; else if (c === '\n') throw new Error('unterminated regex'); else if (cls) { if (c === ']') cls = false; } else if (c === '[') cls = true; else if (c === '/') break; j++; } j++; while (j < n && /[a-z]/i.test(src[j])) j++; return j; };
  while (i < n) {
    const c = src[i];
    if (c === '\n' || c === '\r' || c === '\u2028' || c === '\u2029') { nl = true; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\f' || c === '\v' || c === '\u00a0' || c === '\ufeff') { sp = true; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); if (e < 0) throw new Error('unterminated comment'); if (src.slice(i, e).includes('\n')) nl = true; else sp = true; i = e + 2; continue; }
    if (out && nl) out += '\n';
    else if (out && sp && ((ID.test(p) && ID.test(c)) || ('+-'.includes(p) && '+-'.includes(c)) || (p === '/' && c === '/') || (/[0-9]/.test(p) && c === '.'))) out += ' ';
    sp = nl = false;
    let j;
    if (c === '"' || c === "'") { j = strEnd(i); last = 'v'; }
    else if (c === '`') { j = tplEnd(i); last = 'v'; }
    else if (c === '/' && (last === null || (last === 'p' && !')]}'.includes(p)) || (last === 'w' && RE_KW.has(lastWord)))) { j = reEnd(i); last = 'v'; }
    else if (ID.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      j = i + 1;
      if (/[0-9.]/.test(c)) { while (j < n && (/[\w$.]/.test(src[j]) || ('+-'.includes(src[j]) && /[eE]/.test(src[j - 1]) && !/^0[xX]/.test(src.slice(i, j))))) j++; last = 'v'; }
      else { while (j < n && ID.test(src[j])) j++; last = 'w'; lastWord = src.slice(i, j); }
    } else { j = i + 1; last = 'p'; }
    out += src.slice(i, j);
    p = src[j - 1];
    i = j;
  }
  return out + '\n';
}
// CSS: drops comments and collapses whitespace; strings are copied as they are.
function minifyCss(src) {
  let out = '', p = '', i = 0, sp = false;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; sp = true; continue; }
    if (/\s/.test(c)) { sp = true; i++; continue; }
    if (sp && out && !'{};,>'.includes(p) && !'{};,>!'.includes(c)) out += ' ';
    sp = false;
    if (c === '"' || c === "'") { let j = i + 1; while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++; } out += src.slice(i, j + 1); p = c; i = j + 1; continue; }
    if (c === '}' && p === ';') out = out.slice(0, -1);
    out += c; p = c; i++;
  }
  return out + '\n';
}
const minStats = { js: [0, 0], css: [0, 0], fallback: [] };
function minJs(src, name, check) {
  let min;
  try { min = minifyJs(src); new vm.Script(min, { filename: name }); if (check && !check(min)) throw new Error('output differs'); }
  catch (e) { minStats.fallback.push(name + ' (' + e.message + ')'); min = src; }
  minStats.js[0] += Buffer.byteLength(src); minStats.js[1] += Buffer.byteLength(min);
  return min;
}
function minCss(src) { const min = minifyCss(src); minStats.css[0] += Buffer.byteLength(src); minStats.css[1] += Buffer.byteLength(min); return min; }
const shortHash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'assets', 'm'), { recursive: true });
fs.cpSync(path.join(root, 'vendor'), path.join(out, 'vendor'), { recursive: true });

const hash = crypto.createHash('sha1');
const SI = { modules: {}, entries: [], problems: 0, viz: 0 };
let warnings = 0;
const problems = [];
const _warn = console.warn;
console.warn = (...a) => { problems.push(a.join(' ')); _warn(...a); };
const ALLT = [];
// The small per-track index the track page loads up front: what the dashboard, sidebar, progress, search and
// zone checkpoints need, plus the file that holds the full module.
// Zone checkpoint questions live in their own per-track file, fetched when a checkpoint starts.
const okQ = (q) => q && q.options && q.options.length > 1;
function moduleStub(m, file) {
  const pr = (p) => ({ title: p.title, level: p.level, tags: p.tags });
  return {
    id: m.id, title: m.title, intro: strip(m.intro).slice(0, 300), src: file,
    topics: m.topics.map((tp) => ({ title: tp.title, clues: [strip(asList(tp.clues).join(' ')).slice(0, 300)], analogy: strip(tp.analogy).slice(0, 200), problems: asList(tp.problems).concat(asList(tp.problem)).map(pr) })),
    practice: (m.practice || []).map(pr),
    quiz: (m.quiz || []).map(() => 0), qn: (m.quiz || []).filter(okQ).length,
    interview: (m.interview || []).map((q) => ({ q: q.q }))
  };
}
const MODS = {};
const PMETA = {}, CHECKS = {}, QUIZFILES = {};
const LBIT = { java: 1, python: 2, py: 2, js: 4, ts: 4, javascript: 4, typescript: 4, cpp: 8, 'c++': 8, csharp: 16, 'c#': 16, cs: 16 };

for (const t of TRACKS) {
  const dir = path.join(root, 'content', t.id);
  const scripts = [], quizzes = {};
  for (const pm of t.modules) {
    const f = path.join(dir, pm.id + '.js');
    if (!fs.existsSync(f)) continue;
    const chk = require('child_process').spawnSync(process.execPath, [path.join(__dirname, 'validate.js'), f], { encoding: 'utf8' });
    if (chk.status !== 0) { console.warn('SKIP ' + pm.id + ': not finished (fails validation) — ' + (chk.stdout || '').trim().split('\n').pop()); warnings++; continue; }
    const src = fs.readFileSync(f, 'utf8');
    if (/<\/script/i.test(src)) { console.warn('SKIP ' + pm.id + ': contains </script'); warnings++; continue; }
    const ctx = context();
    try { vm.runInContext(src, ctx, { filename: f }); } catch (e) { console.warn('SKIP ' + pm.id + ': ' + e.message); warnings++; continue; }
    const m = ctx.MODULES[0];
    if (!m || m.id !== pm.id) { console.warn('SKIP ' + pm.id + ': registerModule id mismatch'); warnings++; continue; }
    hash.update(src);
    // Each module is its own content-hashed file, fetched when the learner opens it (src/engine.js).
    const want = JSON.stringify(m);
    const min = minJs(src, f, (code) => { const c2 = context(); vm.runInContext(code, c2, { filename: f }); return JSON.stringify(c2.MODULES[0]) === want; });
    // Riddle and interview hints (data/hints/<id>.json) ride in front of the module so they exist before it registers.
    const hf = path.join(root, 'data', 'hints', pm.id + '.json');
    const hints = fs.existsSync(hf) ? 'window.IM_HINTS=window.IM_HINTS||{};IM_HINTS[' + JSON.stringify(pm.id) + ']=' + JSON.stringify(JSON.parse(fs.readFileSync(hf, 'utf8'))).replace(/</g, '\\u003c') + ';\n' : '';
    const body = hints + min;
    hash.update(hints);
    const file = 'assets/m/' + pm.id + '.' + shortHash(body) + '.js';
    fs.writeFileSync(path.join(out, file), body);
    scripts.push(moduleStub(m, file));
    quizzes[pm.id] = (m.quiz || []).filter(okQ).map((q) => ({ q: q.q, options: q.options, answer: q.answer, explain: q.explain }));
    const href = t.id + '.html#';
    {
      const def = m.lang || t.lang, probs = [];
      m.topics.forEach((tp) => asList(tp.problems).concat(asList(tp.problem)).forEach((p) => probs.push({ p, l: p.lang || tp.lang || def })));
      (m.practice || []).forEach((p) => probs.push({ p, l: p.lang || def }));
      let cover = 15;
      probs.forEach((x) => {
        const sol = x.p.solution || {}; let b = 0;
        const add = (c) => { if (!c) return; const l = (typeof c === 'object' && c.lang) || x.l; b |= LBIT[String(l).toLowerCase()] || 0; };
        add(sol.code); asList(sol.alt).forEach(add);
        cover &= b;
      });
      const tested = probs.filter((x) => x.p.tests).length;
      PMETA[pm.id] = [strip(m.title || pm.title), t.id, pm.level, m.hours || 0, (t.id === 'dsa' || t.id === 'lld') ? cover : 15, probs.length, tested, (m.practice || []).length];
      CHECKS[pm.id] = (m.quiz || []).filter((q) => q && Array.isArray(q.options) && q.options.length >= 2).slice(0, 4).map((q) => [q.q, q.options, q.answer, q.explain || '']);
    }
    MODS[pm.id] = [m.topics.length, m.topics.map((tp) => asList(tp.problems).concat(asList(tp.problem)).length), (m.practice || []).length, m.quiz && m.quiz.length ? 1 : 0, m.interview && m.interview.length ? 1 : 0];
    SI.modules[pm.id] = { items: ctx.App.items(m), pl: (m.practice || []).map((p) => String(p.level || 'Medium').charAt(0).toUpperCase()).join('') };
    SI.entries.push({ t: pm.num + '. ' + strip(m.title || pm.title), c: t.short + ' · Module', h: href + pm.id, s: strip(pm.scope).toLowerCase() });
    m.topics.forEach((tp, i) => {
      ALLT.push({ tr: t.id, tid: pm.id + '-t' + i, mn: pm.num, mt: strip(m.title || pm.title), tt: strip(tp.title) });
      SI.viz += asList(tp.viz).length;
      SI.entries.push({ t: strip(tp.title), c: t.short + ' · ' + strip(m.title || pm.title), h: href + pm.id + '-t' + i, s: strip(asList(tp.clues).join(' ')).toLowerCase().slice(0, 300) });
      asList(tp.problems).concat(asList(tp.problem)).forEach((p, j) => {
        SI.problems++;
        SI.entries.push({ t: strip(p.title), c: t.short + ' · Guided ' + p.level, h: href + pm.id + '-t' + i + '-q' + j, s: asList(p.tags).join(' ').toLowerCase() });
      });
    });
    (m.practice || []).forEach((p, k) => {
      SI.problems++;
      SI.entries.push({ t: strip(p.title), c: t.short + ' · Practice ' + p.level, h: href + pm.id + '-p' + k, s: asList(p.tags).join(' ').toLowerCase() });
    });
    (m.interview || []).forEach((q) => SI.entries.push({ t: strip(q.q), c: t.short + ' · Interview Q', h: href + pm.id + '-iv', s: '' }));
  }
  const qz = 'window.IM_QUIZ=' + JSON.stringify(quizzes).replace(/</g, '\\u003c') + ';\n';
  const qFile = 'assets/m/' + t.id + '-quiz.' + shortHash(qz) + '.js';
  fs.writeFileSync(path.join(out, qFile), qz);
  QUIZFILES[t.id] = qFile;
  const idx = 'window.IM_QUIZSRC=' + JSON.stringify(qFile) + ';window.IM_MINDEX=' + JSON.stringify(scripts).replace(/</g, '\\u003c') + ';\n';
  t._index = 'assets/m/' + t.id + '-index.' + shortHash(idx) + '.js';
  fs.writeFileSync(path.join(out, t._index), idx);
}

const ASSETS = ['helpers.js', 'tracks.js', 'paths.js', 'learn.js', 'planner.js', 'engine.js', 'errors.js', 'visits.js', 'auth.js', 'login.js', 'journey.js', 'style.css'];
const sbUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, ''), sbKey = (process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
const authOn = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(sbUrl) && /^[A-Za-z0-9._-]+$/.test(sbKey);
if ((sbUrl || sbKey) && !authOn) { console.warn('WARN: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY look invalid — accounts disabled in this build'); warnings++; }
const configJs = 'window.IM_CONFIG=' + JSON.stringify(authOn ? { supabaseUrl: sbUrl, supabaseKey: sbKey, version: VERSION } : {}) + ';';
for (const f of ASSETS) hash.update(rd('src/' + f));
hash.update(configJs);
try { hash.update(rd('data/videos.json')); } catch (e) { }
hash.update(rd('src/video.js'));
const V = hash.digest('hex').slice(0, 10);
for (const f of ASSETS) fs.writeFileSync(path.join(out, 'assets', f), f.endsWith('.css') ? minCss(rd('src/' + f)) : minJs(rd('src/' + f), 'src/' + f));
fs.writeFileSync(path.join(out, 'assets', 'config.js'), configJs);
fs.writeFileSync(path.join(out, 'assets', 'progress-map.js'), 'window.IM_MODS=' + JSON.stringify(MODS) + ';');
// The planner's mock rounds load a track's quiz file on demand (Planner.mock), so the file names travel with the path metadata.
fs.writeFileSync(path.join(out, 'assets', 'paths-data.js'), 'window.IM_PATHMETA=' + JSON.stringify(PMETA).replace(/</g, '\\u003c') + ';window.IM_QUIZFILES=' + JSON.stringify(QUIZFILES) + ';');
fs.writeFileSync(path.join(out, 'assets', 'checks.js'), 'window.IM_CHECKS=' + JSON.stringify(CHECKS).replace(/<\/script/gi, '<\\/script') + ';');
fs.writeFileSync(path.join(out, 'assets', 'search-index.js'), 'window.SEARCH_INDEX=' + JSON.stringify(SI) + ';');
let VIDS = {};
try { VIDS = JSON.parse(rd('data/videos.json')).videos || {}; } catch (e) { }
const vidJs = {};
const video = require('../src/video.js');
ALLT.forEach((topic) => { const v = video.publicEntry(VIDS[topic.tid], topic.tt); if (v) vidJs[topic.tid] = v; });
const videoJs = minJs(rd('src/video.js'), 'src/video.js');
fs.writeFileSync(path.join(out, 'assets', 'videos.js'), videoJs + '\nwindow.IM_VIDEOS_RAW=' + JSON.stringify(vidJs).replace(/</g, '\\u003c') + ';window.IM_VIDEOS=window.LessonVideo.resolveAll(window.IM_VIDEOS_RAW);');
const lib = { total: ALLT.length, tracks: [] };
for (const t of TRACKS) {
  const items = ALLT.filter((x) => x.tr === t.id && vidJs[x.tid]).map((x) => Object.assign({ mn: x.mn, mt: x.mt, tt: x.tt, tid: x.tid }, vidJs[x.tid]));
  if (items.length) lib.tracks.push({ id: t.id, short: t.short, title: t.title, items: items });
}
fs.writeFileSync(path.join(out, 'assets', 'video-library.js'), videoJs + '\nwindow.IM_VIDEO_LIB=' + JSON.stringify(lib).replace(/</g, '\\u003c') + ';');

const IC = (d) => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
function jbar(o) {
  return '<header class="jbar"><div class="jbar-in">' +
    (o.menu ? '<button id="menuBtn" class="jbtn jmenu" type="button" aria-label="Open the list of places" aria-controls="sidebar" aria-expanded="false">' + IC('<path d="M4 7h16M4 12h16M4 17h10"/>') + '</button>' : '') +
    '<a class="jbrand" href="index.html"><svg class="jlogo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg><span>Interview Mastery</span></a>' +
    '<nav class="jnav" aria-label="Main"><a href="index.html" data-page="home">' + IC('<path d="M3 6.5l6-3 6 3 6-3v14l-6 3-6-3-6 3z"/><path d="M9 3.5v14M15 6.5v14"/>') + '<span>World map</span></a>' +
    '<a href="today.html" data-page="today">' + IC('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M9 15l2 2 4-4"/>') + '<span>Today</span></a>' +
    '<a href="route.html" data-page="route">' + IC('<path d="M5 21V4h11l-2 4 2 4H5"/>') + '<span>Your route</span></a>' +
    '<a href="videos.html" data-page="videos">' + IC('<path d="M8 21l4-11 4 11"/><path d="M6 10h12"/><path d="M9 6.5a3 3 0 0 1 6 0"/><path d="M5 4a9 9 0 0 1 14 0"/>') + '<span>Watchtower</span></a>' +
    '<a href="passport.html" data-page="passport">' + IC('<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 16h6"/>') + '<span>Passport</span></a></nav>' +
    (o.search ? '<div class="jsearch"><label class="sbox">' + IC('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>') + '<input id="gsearch" aria-label="Search the world" type="search" placeholder="Search every land, landmark and riddle" autocomplete="off"><kbd>/</kbd></label><div id="gresults" hidden></div></div>' : '<span class="jsp"></span>') +
    '<button id="themeBtn" class="jbtn" type="button" aria-label="Switch theme"></button><a id="jav" class="jav" href="passport.html" aria-label="Your passport"></a>' +
    '</div></header>';
}
const page = (f, o) => rd(f).replace('@@JBAR@@', () => jbar(o || {})).replace(/@@V@@/g, V).replace(/@@VERSION@@/g, VERSION);
const tpl = rd('src/track.html');
for (const t of TRACKS) {
  const html = tpl.replace('@@JBAR@@', () => jbar({ menu: true })).replace(/@@TITLE@@/g, H(t.title)).replace(/@@DESC@@/g, H(t.desc)).replace(/@@ICON@@/g, H(t.icon)).replace(/@@ID@@/g, t.id)
    .replace('@@MODULES@@', () => '<script src="' + t._index + '"></script>').replace(/@@V@@/g, V);
  fs.writeFileSync(path.join(out, t.id + '.html'), html);
}
fs.writeFileSync(path.join(out, 'index.html'), page('src/index.html', { search: true }));
fs.writeFileSync(path.join(out, 'login.html'), rd('src/login.html').replace(/@@V@@/g, V));
// Owner-only visitor statistics (not linked; the data needs an account in visit_admins, see supabase/migrations/0006_visits.sql).
fs.writeFileSync(path.join(out, 'admin.html'), rd('src/admin.html').replace(/@@V@@/g, V));
fs.writeFileSync(path.join(out, 'videos.html'), page('src/videos.html'));
fs.writeFileSync(path.join(out, 'passport.html'), page('src/passport.html'));
fs.writeFileSync(path.join(out, 'route.html'), page('src/route.html'));
fs.writeFileSync(path.join(out, 'today.html'), page('src/today.html'));
fs.writeFileSync(path.join(out, 'plan.html'), page('src/plan.html'));
const contactEmail = (process.env.CONTACT_EMAIL || '').trim();
const contact = /^[^\s@<>"]+@[^\s@<>"]+\.[A-Za-z]{2,}$/.test(contactEmail)
  ? 'Questions or requests: <b>' + H(contactEmail) + '</b>. To delete your account, use the steps above.'
  : 'Questions: open an issue at <a href="https://github.com/SHRENIKYD/DSA-LEARNINGS/issues">github.com/SHRENIKYD/DSA-LEARNINGS/issues</a>. Issues are public, so do not include personal details there; to delete your account, use the steps above.';
fs.writeFileSync(path.join(out, 'privacy.html'), rd('src/privacy.html').replace(/@@V@@/g, V).replace('@@CONTACT@@', () => contact));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
function H(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

const live = Object.keys(SI.modules).length, planned = TRACKS.reduce((a, t) => a + t.modules.length, 0);
const pct = (a) => (a[0] ? Math.round(100 - a[1] / a[0] * 100) : 0) + '%';
console.log('minified: JS ' + (minStats.js[0] / 1048576).toFixed(1) + ' MB -> ' + (minStats.js[1] / 1048576).toFixed(1) + ' MB (-' + pct(minStats.js) + '), CSS -' + pct(minStats.css) + (minStats.fallback.length ? ', copied unminified: ' + minStats.fallback.join('; ') : ''));
console.log('built v' + VERSION + ' ' + out + ' — ' + live + '/' + planned + ' modules live, ' + SI.problems + ' problems, ' + SI.viz + ' visualizers, ' + Object.keys(vidJs).length + ' videos, accounts ' + (authOn ? 'ON' : 'OFF (set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY)') + (warnings ? ', ' + warnings + ' warning(s)' : ''));
if (STRICT && warnings) {
  console.error('STRICT build failed: ' + warnings + ' module(s) skipped or warning(s):');
  problems.forEach((p) => console.error('  - ' + p));
  process.exit(1);
}
