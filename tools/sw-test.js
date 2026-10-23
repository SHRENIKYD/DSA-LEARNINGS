// Offline test: builds the site, runs sw-build, serves it on localhost and checks the service worker with Playwright.
// Usage: node tools/sw-test.js   (needs Playwright at /opt/node-tools and Chromium at /opt/pw-browsers/chromium)
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node-tools/node_modules/playwright'); } })();

const root = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-test-'));
const site = path.join(tmp, 'site');
const run = (script, ...a) => { const r = spawnSync(process.execPath, [path.join(root, 'tools', script), ...a], { encoding: 'utf8' }); assert.equal(r.status, 0, script + ' failed: ' + r.stdout + r.stderr); return r.stdout; };
const swVersion = () => /var VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(site, 'sw.js'), 'utf8'))[1];
const TYPES = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webmanifest: 'application/manifest+json', json: 'application/json' };

function serve(port) {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(site, p);
      if (!f.startsWith(site) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nf'); }
      r.writeHead(200, { 'content-type': TYPES[f.split('.').pop()] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(fs.readFileSync(f));
    }).listen(port || 0, 'localhost', () => ok(s));
  });
}

(async () => {
  run('build.js', site); console.log(run('sw-build.js', site).trim());
  const v1 = swVersion();
  const m = JSON.parse(fs.readFileSync(path.join(site, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.name, 'Interview Mastery'); assert.equal(m.start_url, './index.html'); assert.equal(m.display, 'standalone');
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(site, i.src)), 'icon ' + i.src);
  assert.match(fs.readFileSync(path.join(site, 'index.html'), 'utf8'), /rel="manifest"/);

  const srv = await serve(), base = 'http://localhost:' + srv.address().port + '/';
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + 'index.html');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  console.log('ok: service worker installed and controlling');
  const keys1 = await page.evaluate(() => caches.keys());
  assert.deepEqual(keys1, ['im-' + v1]);

  await page.goto(base + 'dsa.html#dsa05'); await page.waitForSelector('#main, main, body');
  await page.waitForLoadState('load'); await page.waitForTimeout(1500);
  const dsaText = (await page.locator('body').innerText()).length;
  assert.ok(dsaText > 500, 'dsa page rendered online');

  // Chromium's setOffline does not cover service worker fetches, so also stop the server.
  await ctx.setOffline(true); const port = srv.address().port; srv.closeAllConnections(); await new Promise((r) => srv.close(r));
  await page.goto(base + 'index.html'); await page.waitForTimeout(800);
  assert.ok((await page.locator('body').innerText()).length > 100, 'home renders offline');
  assert.ok(await page.locator('.jbar').count(), 'home has its header offline');
  await page.goto(base + 'dsa.html#dsa05'); await page.waitForTimeout(1500);
  const off = await page.locator('body').innerText();
  assert.ok(off.length > 500, 'dsa page renders offline');
  assert.ok(!(await page.locator('body').innerText()).includes('You are offline'));
  console.log('ok: home and dsa.html#dsa05 render offline');

  await page.goto(base + 'py.html#py01'); await page.waitForTimeout(500);
  assert.match(await page.locator('body').innerText(), /You are offline/);
  console.log('ok: unvisited page shows the friendly offline message');
  await ctx.setOffline(false);
  const srv2 = await serve(port); 

  // New deploy: change a file, rebuild, re-run sw-build.
  fs.appendFileSync(path.join(site, 'assets', 'style.css'), '\n/* deploy 2 */\n');
  run('sw-build.js', site);
  const v2 = swVersion(); assert.notEqual(v1, v2, 'version changes with content');
  await page.goto(base + 'index.html');
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
  await page.waitForFunction((v) => caches.keys().then((k) => k.length === 1 && k[0] === 'im-' + v), v2, { timeout: 15000 }).catch(() => { });
  // New worker waits; ask it to take over (what imApplyUpdate does), then old caches go.
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.waiting && r.waiting.postMessage('SKIP_WAITING')));
  await page.waitForFunction((v) => caches.keys().then((k) => k.length === 1 && k[0] === 'im-' + v), v2, { timeout: 15000 });
  console.log('ok: new deploy -> cache im-' + v2 + ', old cache im-' + v1 + ' removed');

  assert.deepEqual(errors, [], 'no page errors: ' + errors.join('; '));
  await browser.close(); srv2.close(); fs.rmSync(tmp, { recursive: true, force: true });
  console.log('sw-test: all passed');
})().catch((e) => { console.error(e); process.exit(1); });
