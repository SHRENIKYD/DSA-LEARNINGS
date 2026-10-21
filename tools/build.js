// Builds the static site into ./site  —  usage: node tools/build.js [outDir]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'site'));
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

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
fs.cpSync(path.join(root, 'vendor'), path.join(out, 'vendor'), { recursive: true });

const hash = crypto.createHash('sha1');
const SI = { modules: {}, entries: [], problems: 0, viz: 0 };
let warnings = 0;
const ALLT = [];
const MODS = {};
const PMETA = {}, CHECKS = {};
const LBIT = { java: 1, python: 2, py: 2, js: 4, ts: 4, javascript: 4, typescript: 4, cpp: 8, 'c++': 8 };

for (const t of TRACKS) {
  const dir = path.join(root, 'content', t.id);
  const scripts = [];
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
    fs.mkdirSync(path.join(out, 'content', t.id), { recursive: true });
    fs.writeFileSync(path.join(out, 'content', t.id, pm.id + '.js'), src);
    scripts.push('<script src="content/' + t.id + '/' + pm.id + '.js?v=@@V@@"></script>');
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
  t._scripts = scripts;
}

const ASSETS = ['helpers.js', 'tracks.js', 'paths.js', 'learn.js', 'engine.js', 'auth.js', 'login.js', 'journey.js', 'style.css'];
const sbUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, ''), sbKey = (process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
const authOn = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(sbUrl) && /^[A-Za-z0-9._-]+$/.test(sbKey);
if ((sbUrl || sbKey) && !authOn) { console.warn('WARN: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY look invalid — accounts disabled in this build'); warnings++; }
const configJs = 'window.IM_CONFIG=' + JSON.stringify(authOn ? { supabaseUrl: sbUrl, supabaseKey: sbKey } : {}) + ';';
for (const f of ASSETS) hash.update(rd('src/' + f));
hash.update(configJs);
try { hash.update(rd('data/videos.json')); } catch (e) { }
hash.update(rd('src/video.js'));
const V = hash.digest('hex').slice(0, 10);
for (const f of ASSETS) fs.copyFileSync(path.join(root, 'src', f), path.join(out, 'assets', f));
fs.writeFileSync(path.join(out, 'assets', 'config.js'), configJs);
fs.writeFileSync(path.join(out, 'assets', 'progress-map.js'), 'window.IM_MODS=' + JSON.stringify(MODS) + ';');
fs.writeFileSync(path.join(out, 'assets', 'paths-data.js'), 'window.IM_PATHMETA=' + JSON.stringify(PMETA).replace(/</g, '\\u003c') + ';');
fs.writeFileSync(path.join(out, 'assets', 'checks.js'), 'window.IM_CHECKS=' + JSON.stringify(CHECKS).replace(/<\/script/gi, '<\\/script') + ';');
fs.writeFileSync(path.join(out, 'assets', 'search-index.js'), 'window.SEARCH_INDEX=' + JSON.stringify(SI) + ';');
let VIDS = {};
try { VIDS = JSON.parse(rd('data/videos.json')).videos || {}; } catch (e) { }
const vidJs = {};
const video = require('../src/video.js');
ALLT.forEach((topic) => { const v = video.publicEntry(VIDS[topic.tid], topic.tt); if (v) vidJs[topic.tid] = v; });
fs.writeFileSync(path.join(out, 'assets', 'videos.js'), rd('src/video.js') + '\nwindow.IM_VIDEOS=' + JSON.stringify(vidJs).replace(/</g, '\\u003c') + ';');
const lib = { total: ALLT.length, tracks: [] };
for (const t of TRACKS) {
  const items = ALLT.filter((x) => x.tr === t.id && vidJs[x.tid]).map((x) => Object.assign({ mn: x.mn, mt: x.mt, tt: x.tt, tid: x.tid }, vidJs[x.tid]));
  if (items.length) lib.tracks.push({ id: t.id, short: t.short, title: t.title, items: items });
}
fs.writeFileSync(path.join(out, 'assets', 'video-library.js'), rd('src/video.js') + '\nwindow.IM_VIDEO_LIB=' + JSON.stringify(lib).replace(/</g, '\\u003c') + ';');

const IC = (d) => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
function jbar(o) {
  return '<header class="jbar"><div class="jbar-in">' +
    (o.menu ? '<button id="menuBtn" class="jbtn jmenu" type="button" aria-label="Open the list of places" aria-controls="sidebar" aria-expanded="false">' + IC('<path d="M4 7h16M4 12h16M4 17h10"/>') + '</button>' : '') +
    '<a class="jbrand" href="index.html"><svg class="jlogo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg><span>Interview Mastery</span></a>' +
    '<nav class="jnav" aria-label="Main"><a href="index.html" data-page="home">' + IC('<path d="M3 6.5l6-3 6 3 6-3v14l-6 3-6-3-6 3z"/><path d="M9 3.5v14M15 6.5v14"/>') + '<span>World map</span></a>' +
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
    .replace('@@MODULES@@', () => t._scripts.join('\n')).replace(/@@V@@/g, V);
  fs.writeFileSync(path.join(out, t.id + '.html'), html);
}
fs.writeFileSync(path.join(out, 'index.html'), page('src/index.html', { search: true }));
fs.writeFileSync(path.join(out, 'login.html'), rd('src/login.html').replace(/@@V@@/g, V));
fs.writeFileSync(path.join(out, 'videos.html'), page('src/videos.html'));
fs.writeFileSync(path.join(out, 'passport.html'), page('src/passport.html'));
fs.writeFileSync(path.join(out, 'route.html'), page('src/route.html'));
const contactEmail = (process.env.CONTACT_EMAIL || '').trim();
const contact = /^[^\s@<>"]+@[^\s@<>"]+\.[A-Za-z]{2,}$/.test(contactEmail)
  ? 'Questions or requests: <b>' + H(contactEmail) + '</b>. To delete your account, use the steps above.'
  : 'Questions: open an issue at <a href="https://github.com/SHRENIKYD/DSA-LEARNINGS/issues">github.com/SHRENIKYD/DSA-LEARNINGS/issues</a>. Issues are public, so do not include personal details there; to delete your account, use the steps above.';
fs.writeFileSync(path.join(out, 'privacy.html'), rd('src/privacy.html').replace(/@@V@@/g, V).replace('@@CONTACT@@', () => contact));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
function H(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

const live = Object.keys(SI.modules).length, planned = TRACKS.reduce((a, t) => a + t.modules.length, 0);
console.log('built v' + VERSION + ' ' + out + ' — ' + live + '/' + planned + ' modules live, ' + SI.problems + ' problems, ' + SI.viz + ' visualizers, ' + Object.keys(vidJs).length + ' videos, accounts ' + (authOn ? 'ON' : 'OFF (set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY)') + (warnings ? ', ' + warnings + ' warning(s)' : ''));
