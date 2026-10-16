// Builds the mobile app web bundle into ./app-www  —  usage: node tools/build-app.js [outDir]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'app-www'));
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const VERSION = JSON.parse(rd('package.json')).version;

fs.rmSync(out, { recursive: true, force: true });
const r = spawnSync(process.execPath, [path.join(__dirname, 'build.js'), out], { stdio: 'inherit', env: process.env });
if (r.status !== 0) process.exit(r.status || 1);

const FILES = ['play.js', 'games.js', 'app.js', 'bridge.js', 'app.css', 'bridge.css'];
const hash = crypto.createHash('sha1');
for (const f of FILES) hash.update(rd('app/' + f));
hash.update(VERSION);
const V = hash.digest('hex').slice(0, 10);

fs.mkdirSync(path.join(out, 'app'), { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(root, 'app', f), path.join(out, 'app', f));
fs.writeFileSync(path.join(out, 'index.html'), rd('app/index.html').replace(/@@V@@/g, V).replace(/@@VERSION@@/g, VERSION));
fs.rmSync(path.join(out, '.nojekyll'), { force: true });

const TRACKS = (() => { const ctx = { window: {} }; require('vm').runInNewContext(rd('src/tracks.js') + ';this.T=TRACKS;', ctx); return ctx.T; })();
let pages = 0;
for (const t of TRACKS) {
  const f = path.join(out, t.id + '.html');
  if (!fs.existsSync(f)) continue;
  let html = fs.readFileSync(f, 'utf8');
  html = html.replace('</head>', '<link rel="stylesheet" href="app/bridge.css?v=' + V + '">\n</head>')
    .replace('</body>', '<script src="assets/search-index.js?v=' + V + '"></script>\n<script src="app/play.js?v=' + V + '"></script>\n<script src="app/bridge.js?v=' + V + '"></script>\n</body>');
  fs.writeFileSync(f, html);
  pages++;
}
console.log('app bundle v' + VERSION + ' → ' + out + ' (' + pages + ' lesson pages with play mode)');
