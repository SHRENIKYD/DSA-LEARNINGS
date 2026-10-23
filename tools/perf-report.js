// Bytes needed to open one track page of a built site.
// Usage: node tools/perf-report.js [siteDir] [--track dsa] [--module dsa05]
// Serves siteDir locally, opens <track>.html in Chromium (Playwright), and sums every same-origin response
// (raw bytes and gzip-estimated bytes). With --module it then opens that module and reports the extra bytes.
// External hosts (Google Fonts, Supabase, YouTube) are blocked so the numbers only cover this site.
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
let chromium;
for (const m of ['playwright', '/opt/node-tools/node_modules/playwright']) {
  try { ({ chromium } = require(m)); break; } catch (e) { /* try next */ }
}
if (!chromium) { console.error('perf-report: playwright is not installed'); process.exit(2); }

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const site = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : path.join(__dirname, '..', 'site'));
const trackId = opt('--track', 'dsa');
const moduleId = opt('--module', null);
if (!fs.existsSync(path.join(site, trackId + '.html'))) { console.error('perf-report: ' + trackId + '.html not found in ' + site); process.exit(1); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(site, p);
  if (!f.startsWith(site) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
const kb = (n) => (n / 1024).toFixed(1) + ' KB';

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.route((u) => !u.href.startsWith(origin), (r) => r.abort());
  const page = await ctx.newPage();
  let log = [];
  page.on('response', async (r) => {
    if (!r.url().startsWith(origin)) return;
    try { const b = await r.body(); log.push({ url: r.url().replace(origin, ''), raw: b.length, gz: zlib.gzipSync(b).length }); } catch (e) { /* redirects have no body */ }
  });
  const sum = (l) => l.reduce((a, x) => ({ raw: a.raw + x.raw, gz: a.gz + x.gz }), { raw: 0, gz: 0 });
  const report = (title, l) => {
    const s = sum(l);
    console.log(title + ': ' + l.length + ' requests, ' + kb(s.raw) + ' raw, ' + kb(s.gz) + ' gzip');
    l.slice().sort((a, b) => b.raw - a.raw).slice(0, 8).forEach((x) => console.log('  ' + kb(x.raw).padStart(10) + '  ' + x.url));
    return s;
  };
  await page.goto(origin + '/' + trackId + '.html', { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);
  const first = report('open ' + trackId + '.html', log), firstCount = log.length;
  if (moduleId) {
    log = [];
    await page.evaluate((h) => { location.hash = h; }, moduleId);
    await page.waitForSelector('#' + moduleId + '-t0', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    report('then open #' + moduleId, log);
  }
  console.log(JSON.stringify({ track: trackId, requests: firstCount, raw: first.raw, gzip: first.gz }));
  await browser.close();
  server.close();
})().catch((e) => { console.error('perf-report: ' + e.stack); process.exit(1); });
