// Browser smoke test of a built site.
// Usage: node tools/smoke-test.js [siteDir]     (default: ./site)
// Needs Playwright (CI: npm install --no-save playwright@1.56.1 && npx playwright install --with-deps chromium).
const http = require('http');
const fs = require('fs');
const path = require('path');
let chromium;
for (const m of ['playwright', '/opt/node-tools/node_modules/playwright']) {
  try { ({ chromium } = require(m)); break; } catch (e) { /* try next */ }
}
if (!chromium) { console.error('SMOKE FAIL: playwright is not installed'); process.exit(2); }

const site = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(__dirname, '..', 'site'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.svg': 'image/svg+xml' };
// Known issue: wide .tbl tables push module pages ~4px past 360px (src/style.css). Set to 0 once fixed.
const OVERFLOW_TOLERANCE_PX = Number(process.env.SMOKE_OVERFLOW_PX || 0);
const fails = [];
let allowFailed = null;
const fail = (msg) => { fails.push(msg); console.error('FAIL: ' + msg); };

const server = http.createServer((req, res) => {
  const p = path.join(site, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(site)) { res.writeHead(403); res.end(); return; }
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const base = origin + '/';
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const pages = fs.readdirSync(site).filter((f) => f.endsWith('.html')).sort();
  if (!pages.includes('index.html')) fail('index.html is missing from ' + site);

  for (const width of [1280, 360]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();
    let cur = '';
    const err = (m) => fail('[' + width + 'px ' + cur + '] ' + m);
    page.on('pageerror', (e) => err('page error: ' + e.message));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      if (allowFailed && /Failed to load resource/.test(m.text()) && (!m.location().url || allowFailed.test(m.location().url))) return; // forced failure in check 4
      const u = m.location().url || '';
      if (u && (!u.startsWith(origin) || /\/favicon\.ico$/.test(u))) return; // external hosts (fonts, YouTube, Supabase) are offline in CI
      if (!u && /ERR_(TUNNEL|NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|CONNECTION|PROXY)/.test(m.text())) return;
      err('console error: ' + m.text() + (u ? ' (' + u + ')' : ''));
    });
    page.on('response', (r) => { if (r.url().startsWith(origin) && r.status() >= 400 && !/favicon\.ico$/.test(r.url())) err('HTTP ' + r.status() + ' for ' + r.url().replace(origin, '')); });
    const open = async (f) => { cur = f; await page.goto(base + f, { waitUntil: 'load' }); await page.waitForTimeout(300); };
    const wide = async (what) => {
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      if (width === 360 && w[0] > w[1] + OVERFLOW_TOLERANCE_PX) err(what + ' is wider than the viewport (' + w[0] + ' > ' + w[1] + ')');
    };

    // 1. every top-level page loads cleanly
    for (const f of pages) await open(f);

    // 2. home page: links, search, width
    await open('index.html');
    await wide('home page');
    if (width === 1280) {
      await page.fill('#gsearch', 'hash');
      await page.waitForTimeout(500);
      const n = await page.evaluate(() => document.querySelectorAll('#gresults .res').length);
      if (!n) err('search for "hash" returned no results');
    }
    const checkLinks = async (f) => {
      const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
      const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map((e) => e.id).concat(typeof MODULES !== 'undefined' ? MODULES.map((m) => m.id) : []));
      for (const href of new Set(links)) {
        if (/^(https?:|mailto:|tel:|javascript:|data:)/i.test(href)) continue;
        const [file, hash] = href.split('#');
        if (!file) { if (hash && !ids.includes(hash) && !ids.some((i) => i.startsWith(hash))) err(f + ': dead anchor #' + hash); continue; }
        const target = path.join(site, decodeURIComponent(file.split('?')[0]));
        if (!target.startsWith(site) || !fs.existsSync(target)) err(f + ': link to missing file ' + href);
      }
    };
    await checkLinks('index.html');

    // 3. one module per track opens and shows its first topic
    const tracks = await page.evaluate(() => TRACKS.map((t) => t.id));
    for (const t of tracks) {
      await open(t + '.html');
      const mod = await page.evaluate(() => (MODULES[0] || {}).id || null);
      if (!mod) { err('no module registered on ' + t + '.html'); continue; }
      if (t === tracks[0]) await wide('track page ' + t);
      await page.evaluate((h) => { location.hash = h; }, mod);
      const ok = await page.waitForSelector('#' + mod + '-t0', { timeout: 5000 }).then(() => true, () => false);
      if (!ok) err('module ' + mod + ' did not render its first topic (#' + mod + '-t0)');
      else if (t === tracks[0]) { await wide('module page ' + mod); await checkLinks(t + '.html'); }
    }
    // 4. lazy module files: skeleton while the fetch is slow, gone after render; a failed fetch offers Retry that works
    if (width === 1280) {
      // own context without the service worker, so page.route sees the module requests
      const lctx = await browser.newContext({ viewport: { width, height: 800 }, serviceWorkers: 'block' });
      const lp = await lctx.newPage();
      lp.on('pageerror', (e) => err('page error: ' + e.message));
      cur = 'lazy dsa.html';
      await lp.goto(base + 'dsa.html', { waitUntil: 'load' });
      let mode = 'slow';
      const lazy = /\/assets\/m\/dsa03\.[0-9a-f]+\.js$/;
      await lp.route(lazy, async (r) => { if (mode === 'fail') return r.abort(); await new Promise((ok) => setTimeout(ok, 800)); return r.continue(); });
      await lp.evaluate(() => { location.hash = 'dsa03'; });
      const sk = await lp.waitForSelector('#main .skel', { timeout: 3000 }).then(() => true, () => false);
      if (!sk) err('no skeleton while module dsa03 was loading');
      else {
        const st = await lp.evaluate(() => [document.getElementById('main').getAttribute('aria-busy'), (document.querySelector('#main .sr-only') || {}).textContent]);
        if (st[0] !== 'true' || st[1] !== 'Loading lesson…') err('skeleton is missing aria-busy or its hidden loading text: ' + st);
      }
      if (!(await lp.waitForSelector('#dsa03-t0', { timeout: 8000 }).then(() => true, () => false))) err('dsa03 did not render after a slow fetch');
      if (await lp.evaluate(() => !!document.querySelector('#main .skel') || document.getElementById('main').hasAttribute('aria-busy'))) err('skeleton or aria-busy left after render');
      mode = 'fail'; allowFailed = /\/assets\/m\/dsa04\./;
      await lp.route(/\/assets\/m\/dsa04\.[0-9a-f]+\.js$/, (r) => (mode === 'fail' ? r.abort() : r.continue()));
      await lp.evaluate(() => { location.hash = 'dsa04'; });
      if (!(await lp.waitForSelector('#modRetry', { timeout: 5000 }).then(() => true, () => false))) err('no Retry button after a failed module fetch');
      else {
        if (await lp.evaluate(() => !!document.querySelector('#main .skel'))) err('skeleton left after a failed fetch');
        mode = 'ok';
        allowFailed = null;
        await lp.click('#modRetry');
        if (!(await lp.waitForSelector('#dsa04-t0', { timeout: 8000 }).then(() => true, () => false))) err('Retry did not load dsa04');
      }
      await lctx.close();
    }
    await ctx.close();
  }
  await browser.close();
  server.close();
  if (fails.length) { console.error('\nSMOKE TEST FAILED: ' + fails.length + ' problem(s)'); process.exit(1); }
  console.log('smoke test passed (' + site + ')');
})().catch((e) => { console.error('SMOKE FAIL: ' + e.stack); process.exit(1); });
