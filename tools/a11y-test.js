// Automated accessibility check of a built site using axe-core + Playwright.
// Usage: node tools/a11y-test.js [siteDir]   (default: ./site)
// Fails (exit 1) on serious/critical axe violations; minor/moderate ones are printed as warnings.
const http = require('http');
const fs = require('fs');
const path = require('path');
let chromium;
for (const m of ['playwright', '/opt/node-tools/node_modules/playwright']) {
  try { ({ chromium } = require(m)); break; } catch (e) { /* try next */ }
}
if (!chromium) { console.error('A11Y FAIL: playwright is not installed'); process.exit(2); }
let axeSource;
for (const m of ['axe-core', '/opt/node-tools/node_modules/axe-core']) {
  try { axeSource = fs.readFileSync(require.resolve(m + '/axe.min.js'), 'utf8'); break; } catch (e) { /* try next */ }
}
if (!axeSource) { console.error('A11Y FAIL: axe-core is not installed (npm install)'); process.exit(2); }

const site = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(__dirname, '..', 'site'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(site, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(site)) { res.writeHead(403); res.end(); return; }
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

// Each target: page file, optional module index (opens that module of the track), optional theme.
const TARGETS = [
  { name: 'home', file: 'index.html' },
  { name: 'track page (dsa)', file: 'dsa.html' },
  { name: 'module with visualizer (dsa #1)', file: 'dsa.html', module: 0 },
  { name: 'module with practice/quiz (dsa #3)', file: 'dsa.html', module: 2 },
  { name: 'login / account', file: 'login.html' },
  { name: 'privacy', file: 'privacy.html' },
];
const THEMES = ['light', 'dark'];

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  let blocking = 0, warnings = 0;
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript((th) => { try { localStorage.setItem('imastery.theme', JSON.stringify(th)); } catch (e) { /* storage unavailable */ } }, theme);
    const page = await ctx.newPage();
    for (const t of TARGETS) {
      if (!fs.existsSync(path.join(site, t.file))) { console.warn('SKIP [' + theme + ' | ' + t.name + '] ' + t.file + ' is not in this build (accounts are off without SUPABASE_URL)'); continue; }
      await page.goto(base + t.file, { waitUntil: 'load' });
      if (t.module !== undefined) {
        const id = await page.evaluate((i) => (MODULES[i] || MODULES[0]).id, t.module);
        await page.evaluate((h) => { location.hash = h; }, id);
        await page.waitForSelector('#' + id + '-t0', { timeout: 5000 });
      }
      await page.waitForTimeout(400);
      await page.evaluate(axeSource);
      const res = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
      for (const v of res.violations) {
        const bad = v.impact === 'serious' || v.impact === 'critical';
        bad ? blocking++ : warnings++;
        console[bad ? 'error' : 'warn']((bad ? 'FAIL' : 'WARN') + ' [' + theme + ' | ' + t.name + '] ' + v.id + ' (' + v.impact + '): ' + v.help + ' - ' + v.nodes.length + ' node(s)');
        for (const n of v.nodes.slice(0, 3)) console[bad ? 'error' : 'warn']('    ' + n.target.join(' ') + '  ' + (n.any[0] || n.all[0] || n.none[0] || {}).message);
      }
    }
    await ctx.close();
  }
  await browser.close();
  server.close();
  if (blocking) { console.error('\nA11Y TEST FAILED: ' + blocking + ' serious/critical violation group(s), ' + warnings + ' warning(s)'); process.exit(1); }
  console.log('a11y test passed (' + site + '), ' + warnings + ' warning(s)');
})().catch((e) => { console.error('A11Y FAIL: ' + e.stack); process.exit(1); });
