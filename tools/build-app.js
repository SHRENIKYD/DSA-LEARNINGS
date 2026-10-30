// Builds the mobile app web bundle into ./app-www  —  usage: node tools/build-app.js [outDir]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'app-www'));
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const VERSION = JSON.parse(rd('package.json')).appVersion;

fs.rmSync(out, { recursive: true, force: true });
const r = spawnSync(process.execPath, [path.join(__dirname, 'build.js'), out], { stdio: 'inherit', env: process.env });
if (r.status !== 0) process.exit(r.status || 1);

const FILES = ['experience.js', 'experience.css', 'icon.png', 'update.js', 'play.js', 'games.js', 'sound.js', 'speech.js', 'reader.js', 'app.js', 'bridge.js', 'app.css', 'bridge.css', 'reader.css'];
const hash = crypto.createHash('sha1');
for (const f of FILES) hash.update(fs.readFileSync(path.join(root, 'app', f)));
const PACKS = fs.existsSync(path.join(root, 'app', 'games')) ? fs.readdirSync(path.join(root, 'app', 'games')).filter((f) => f.endsWith('.js')).sort() : [];
for (const f of PACKS) hash.update(fs.readFileSync(path.join(root, 'app', 'games', f)));
hash.update(VERSION);
const V = hash.digest('hex').slice(0, 10);

fs.mkdirSync(path.join(out, 'app'), { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(root, 'app', f), path.join(out, 'app', f));
fs.mkdirSync(path.join(out, 'app', 'games'), { recursive: true });
for (const f of PACKS) fs.copyFileSync(path.join(root, 'app', 'games', f), path.join(out, 'app', 'games', f));
fs.writeFileSync(path.join(out, 'index.html'), rd('app/index.html').replace(/@@V@@/g, V).replace(/@@VERSION@@/g, VERSION));
fs.rmSync(path.join(out, '.nojekyll'), { force: true });
// The app's "What's new" popup shows the app changelog, not the website's.
fs.writeFileSync(path.join(out, 'assets', 'whatsnew-data.js'), require('./whatsnew-lib.js').dataJs(rd('CHANGELOG-APP.md')));
// Error reports from the app carry the app version (pages that do not set IM_VERSION get it here).
for (const f of fs.readdirSync(out).filter((x) => x.endsWith('.html') && x !== 'index.html')) {
  const file = path.join(out, f), html = fs.readFileSync(file, 'utf8');
  const tag = '<script src="assets/config.js';
  fs.writeFileSync(file, html.replace(tag, () => "<script>window.IM_VERSION=window.IM_VERSION||'" + VERSION + "';</script>\n" + tag));
}

const TRACKS = (() => { const ctx = { window: {} }; require('vm').runInNewContext(rd('src/tracks.js') + ';this.T=TRACKS;', ctx); return ctx.T; })();
let pages = 0;
for (const t of TRACKS) {
  const f = path.join(out, t.id + '.html');
  if (!fs.existsSync(f)) continue;
  let html = fs.readFileSync(f, 'utf8');
  html = html.replace('</head>', '<link rel="stylesheet" href="app/bridge.css?v=' + V + '">\n<link rel="stylesheet" href="app/reader.css?v=' + V + '">\n</head>')
    .replace('</body>', ['assets/search-index.js', 'app/play.js', 'app/sound.js', 'app/speech.js', 'app/reader.js', 'app/bridge.js'].map((f) => '<script src="' + f + '?v=' + V + '"></script>').join('\n') + '\n</body>');
  fs.writeFileSync(f, html);
  pages++;
}
// Bundle the web fonts (SIL Open Font License) so the app needs no Google Fonts request and renders text offline.
const FONTS = [['space-grotesk', 'Space Grotesk', [500, 600, 700]], ['source-sans-3', 'Source Sans 3', [400, 500, 600, 700]], ['ibm-plex-mono', 'IBM Plex Mono', [400, 500, 600]], ['bricolage-grotesque', 'Bricolage Grotesque', [500, 700, 800]], ['atkinson-hyperlegible', 'Atkinson Hyperlegible', [400, 700]]];
const fontDir = path.join(out, 'fonts');
fs.mkdirSync(fontDir, { recursive: true });
let fontCss = '';
for (const [pkg, family, weights] of FONTS) {
  const src = path.join(root, 'node_modules', '@fontsource', pkg);
  for (const w of weights) {
    const f = pkg + '-latin-' + w + '-normal.woff2';
    fs.copyFileSync(path.join(src, 'files', f), path.join(fontDir, f));
    fontCss += '@font-face{font-family:"' + family + '";font-style:normal;font-weight:' + w + ';font-display:swap;src:url(' + f + ') format("woff2")}\n';
  }
  fs.copyFileSync(path.join(src, 'LICENSE'), path.join(fontDir, pkg + '-OFL.txt'));
}
fs.writeFileSync(path.join(fontDir, 'fonts.css'), fontCss);
let fontPages = 0;
for (const f of fs.readdirSync(out).filter((x) => x.endsWith('.html'))) {
  const file = path.join(out, f), html = fs.readFileSync(file, 'utf8');
  const next = html.replace(/<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>\n?/g, '')
    .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/[^"]*">/g, '<link rel="stylesheet" href="fonts/fonts.css?v=' + V + '">');
  if (next !== html) { fs.writeFileSync(file, next); fontPages++; }
}
console.log('app bundle v' + VERSION + ' → ' + out + ' (' + pages + ' lesson pages with play mode, fonts bundled in ' + fontPages + ' pages)');

