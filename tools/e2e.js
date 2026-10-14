// Browser smoke test of the built site: node tools/e2e.js [siteDir] [--shots dir] [--track id]
const http = require('http');
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const args = process.argv.slice(2);
const site = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : path.join(__dirname, '..', 'site'));
const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
const onlyTrack = args.includes('--track') ? args[args.indexOf('--track') + 1] : null;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const p = path.join(site, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  if (shots) fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/pyodide|jsdelivr|ERR_TUNNEL|net::/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(base + 'index.html');
  if (shots) await page.screenshot({ path: path.join(shots, 'home.png'), fullPage: false });
  const tracks = await page.evaluate(() => TRACKS.map((t) => t.id));
  let bad = 0;
  for (const t of tracks) {
    if (onlyTrack && t !== onlyTrack) continue;
    await page.goto(base + t + '.html');
    const ids = await page.evaluate(() => MODULES.map((m) => m.id));
    if (shots && ids.length) await page.screenshot({ path: path.join(shots, t + '-dash.png') });
    for (const id of ids) {
      await page.evaluate((h) => { location.hash = h; }, id);
      await page.waitForTimeout(120);
      const r = await page.evaluate(() => {
        const out = { viz: 0, frames: 0, bad: [] };
        document.querySelectorAll('.viz').forEach((el) => {
          out.viz++;
          const next = el.querySelector('[data-act=next]');
          let g = 0;
          while (!next.disabled && g++ < 1000) { next.click(); out.frames++; if (el.querySelector('.viz-stage').innerHTML.includes('unknown part')) out.bad.push('unknown part'); }
          const nt = el.querySelector('.narr-text').textContent;
          if (nt.startsWith('⚠️') || nt.startsWith('Visualizer error')) out.bad.push(el.querySelector('b').textContent + ': ' + nt);
          el.querySelector('[data-act=reset]').click();
        });
        out.problems = document.querySelectorAll('article.problem').length;
        out.runs = [...document.querySelectorAll('.btn.run')].length;
        return out;
      });
      // run SQL + JS snippets
      const runs = await page.$$('.btn.run');
      const runErr = [];
      for (const b of runs) {
        const lang = await b.evaluate((el) => el.closest('.cpane').querySelector('.code-head span').textContent);
        const isPy = await b.evaluate((el) => /python/i.test(el.closest('.cpane').querySelector('.code-head span').textContent));
        if (isPy) continue;
        await b.click();
        await page.waitForTimeout(lang && /sql/i.test(lang) ? 400 : 50);
      }
      if (runs.length) await page.waitForTimeout(3200);
      const outs = await page.evaluate(() => [...document.querySelectorAll('.run-out')].filter((o) => !o.hidden).map((o) => o.textContent));
      outs.forEach((o) => { if (/SQL error|Uncaught|Unhandled|Could not load/.test(o)) runErr.push(o.slice(0, 160)); });
      if (r.bad.length || runErr.length) bad++;
      console.log(t + '/' + id, JSON.stringify(r), runErr.length ? 'RUN ERRORS: ' + JSON.stringify(runErr) : '');
      if (shots) {
        const vizs = await page.$$('.viz');
        for (let i = 0; i < Math.min(vizs.length, 3); i++) {
          await vizs[i].evaluate((el) => { el.querySelector('[data-act=next]').click(); el.querySelector('[data-act=next]').click(); });
          await vizs[i].screenshot({ path: path.join(shots, id + '-viz' + i + '.png') });
        }
      }
    }
  }
  await page.goto(base + 'index.html');
  await page.fill('#gsearch', 'hash');
  await page.waitForTimeout(300);
  console.log('global search results for "hash":', await page.evaluate(() => document.querySelectorAll('#gresults .res').length));
  await page.setViewportSize({ width: 390, height: 800 });
  await page.reload();
  console.log('mobile horizontal scroll on home:', await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1));
  if (shots) await page.screenshot({ path: path.join(shots, 'mobile.png') });
  console.log(errs.length ? 'JS ERRORS:\n' + errs.join('\n') : 'no JS errors');
  console.log(bad ? bad + ' module(s) with visualizer/run problems' : 'all modules OK');
  await browser.close();
  server.close();
  process.exit(errs.length || bad ? 1 : 0);
})();
