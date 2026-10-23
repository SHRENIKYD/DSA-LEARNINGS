// Runs after the site build: node tools/sw-build.js [siteDir]
// Writes sw.js (version from file hashes), the manifest, icons, an offline page, and adds the manifest and register tags to the pages.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'site'));
if (!fs.existsSync(path.join(out, 'index.html'))) { console.error('sw-build: no built site at ' + out); process.exit(1); }

const copy = (from, to) => { fs.mkdirSync(path.dirname(path.join(out, to)), { recursive: true }); fs.copyFileSync(path.join(root, from), path.join(out, to)); };
copy('src/manifest.webmanifest', 'manifest.webmanifest');
copy('src/sw-register.js', 'assets/sw-register.js');
copy('store/play-icon-512.png', 'icons/icon-512.png');
copy('app/icon.png', 'icons/icon-192.png');
fs.writeFileSync(path.join(out, 'offline.html'), '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline - Interview Mastery</title>' +
  '<style>body{margin:0;background:#12263A;color:#F4EEDC;font:18px/1.6 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center;padding:16px}a{color:#F2C14E}main{max-width:30em}</style></head>' +
  '<body><main><h1>You are offline</h1><p>This page has not been saved on this device yet. Open it once while you are online and it will work offline next time.</p><p><a href="index.html">Back to the home page</a></p></main></body></html>\n');

// Add the manifest link and register script to every page (idempotent).
const tags = '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icons/icon-192.png">\n<script src="assets/sw-register.js" defer></script>\n';
for (const f of fs.readdirSync(out).filter((x) => x.endsWith('.html') && x !== 'offline.html')) {
  const file = path.join(out, f), html = fs.readFileSync(file, 'utf8');
  if (!html.includes('manifest.webmanifest')) fs.writeFileSync(file, html.replace('</head>', () => tags + '</head>'));
}

// Walk the output: version = hash of every file except sw.js.
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else files.push(path.relative(out, p).split(path.sep).join('/'));
  }
})(out);
files.sort();
const h = crypto.createHash('sha1');
for (const f of files) if (f !== 'sw.js') { h.update(f + '\0'); h.update(fs.readFileSync(path.join(out, f))); }
const version = h.digest('hex').slice(0, 12);

// Precache the shell: the non-lesson pages, assets/, vendor/, icons, and the exact URLs (with ?v=) those pages reference.
// Lesson (track) pages and the lazy module files under assets/m/ are saved when visited, so offline never shows a half-loaded lesson.
const SHELL_PAGES = ['index.html', 'route.html', 'videos.html', 'passport.html', 'login.html', 'privacy.html', 'offline.html'];
const pre = new Set(['./', 'manifest.webmanifest']);
for (const f of files) if ((/^(assets|vendor|icons)\//.test(f) && !/^assets\/m\//.test(f)) || SHELL_PAGES.includes(f)) pre.add(f);
for (const p of SHELL_PAGES) {
  const html = fs.readFileSync(path.join(out, p), 'utf8');
  for (const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const u = m[1];
    if (/^[a-z]+:|^\/\//i.test(u)) continue;
    const b = u.split("?")[0]; if (!b.endsWith(".html") && files.includes(b)) pre.add(u);
  }
}
const list = [...pre].sort();
const sw = fs.readFileSync(path.join(root, 'src/sw.js'), 'utf8').replace('@@VERSION@@', version).replace('/*@@PRECACHE@@*/[]', () => JSON.stringify(list));
fs.writeFileSync(path.join(out, 'sw.js'), sw);
console.log('sw-build: version ' + version + ', ' + list.length + ' precached URLs -> ' + path.join(out, 'sw.js'));
