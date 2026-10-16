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
    SI.modules[pm.id] = { items: ctx.App.items(m), pl: (m.practice || []).map((p) => String(p.level || 'Medium').charAt(0).toUpperCase()).join('') };
    SI.entries.push({ t: pm.num + '. ' + strip(m.title || pm.title), c: t.short + ' · Module', h: href + pm.id, s: strip(pm.scope).toLowerCase() });
    m.topics.forEach((tp, i) => {
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

const ASSETS = ['helpers.js', 'tracks.js', 'engine.js', 'auth.js', 'login.js', 'style.css'];
const sbUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, ''), sbKey = (process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
const authOn = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(sbUrl) && /^[A-Za-z0-9._-]+$/.test(sbKey);
if ((sbUrl || sbKey) && !authOn) { console.warn('WARN: SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY look invalid — accounts disabled in this build'); warnings++; }
const configJs = 'window.IM_CONFIG=' + JSON.stringify(authOn ? { supabaseUrl: sbUrl, supabaseKey: sbKey } : {}) + ';';
for (const f of ASSETS) hash.update(rd('src/' + f));
hash.update(configJs);
const V = hash.digest('hex').slice(0, 10);
for (const f of ASSETS) fs.copyFileSync(path.join(root, 'src', f), path.join(out, 'assets', f));
fs.writeFileSync(path.join(out, 'assets', 'config.js'), configJs);
fs.writeFileSync(path.join(out, 'assets', 'search-index.js'), 'window.SEARCH_INDEX=' + JSON.stringify(SI) + ';');

const tpl = rd('src/track.html');
for (const t of TRACKS) {
  const html = tpl.replace(/@@TITLE@@/g, H(t.title)).replace(/@@DESC@@/g, H(t.desc)).replace(/@@ICON@@/g, H(t.icon)).replace(/@@ID@@/g, t.id)
    .replace('@@MODULES@@', () => t._scripts.join('\n')).replace(/@@V@@/g, V);
  fs.writeFileSync(path.join(out, t.id + '.html'), html);
}
fs.writeFileSync(path.join(out, 'index.html'), rd('src/index.html').replace(/@@V@@/g, V));
fs.writeFileSync(path.join(out, 'login.html'), rd('src/login.html').replace(/@@V@@/g, V));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
function H(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

const live = Object.keys(SI.modules).length, planned = TRACKS.reduce((a, t) => a + t.modules.length, 0);
console.log('built v' + VERSION + ' ' + out + ' — ' + live + '/' + planned + ' modules live, ' + SI.problems + ' problems, ' + SI.viz + ' visualizers, accounts ' + (authOn ? 'ON' : 'OFF (set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY)') + (warnings ? ', ' + warnings + ' warning(s)' : ''));
