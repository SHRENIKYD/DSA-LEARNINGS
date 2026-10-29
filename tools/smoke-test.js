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
    // These checks cover Explore all; first-visit onboarding has its own checks in section 5.
    await ctx.addInitScript(() => { try { if (!localStorage.getItem('imastery.route')) localStorage.setItem('imastery.route', JSON.stringify({ onboarded: true })); } catch (e) { /* storage unavailable */ } });
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
    // 5. personalized navigation: onboarding, My path views, Explore all unchanged
    {
      const nctx = await browser.newContext({ viewport: { width, height: 800 }, serviceWorkers: 'block' });
      const np = await nctx.newPage();
      np.on('pageerror', (e) => err('page error: ' + e.message));
      const go = async (f) => { cur = 'nav ' + f; await np.goto(base + f, { waitUntil: 'load' }); await np.waitForTimeout(300); };
      const ls = (k) => np.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), k);
      // stamp SVG ids come from a page-wide counter, so they differ between first render and re-render
      const html = (sel) => np.evaluate((q) => ((document.querySelector(q) || {}).innerHTML || '').replace(/stp\d+/g, 'stp'), sel);
      // 5a first visit: onboarding opens; "Just explore" leads to Explore all with a Pick a path banner
      await go('index.html');
      if (!(await np.evaluate(() => { const d = document.getElementById('onb'); return !!(d && d.open && d.querySelector('#onbH')); }))) err('first visit did not open the onboarding dialog');
      const w0 = await np.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      if (width === 360 && w0[0] > w0[1] + OVERFLOW_TOLERANCE_PX) err('onboarding is wider than the viewport');
      if (await np.evaluate(() => document.activeElement && !document.getElementById('onb').contains(document.activeElement))) err('focus is not inside the onboarding dialog');
      await np.click('[data-onb-skip]');
      const sk = await ls('imastery.route');
      if (!sk || !sk.onboarded || sk.mode !== 'all' || sk.id) err('skip did not store Explore all: ' + JSON.stringify(sk));
      if (await np.evaluate(() => document.getElementById('onb').open)) err('onboarding still open after skip');
      if (!(await np.$('#pathbar .pb-ban'))) err('no "Pick a path" banner after skipping');
      if (await np.$('.pathhome, .otherlands, .reltag')) err('Explore all shows My path elements');
      await go('index.html');
      if (await np.evaluate(() => document.getElementById('onb') && document.getElementById('onb').open)) err('onboarding shown again after skip');
      if (width === 1280) {
        // 5b choose Python backend: path tracks on home, toggle pressed, route-first hero
        await np.click('#pathbar [data-onb]');
        await np.check('input[name="onbRoute"][value="pyback"]');
        await np.click('[data-onb-next]');
        if (await np.$('input[name="onbLang"]')) err('single-language route asked for a language');
        await np.check('input[name="onbHours"][value="10"]');
        await np.click('[data-onb-next]');
        await np.waitForTimeout(200);
        const pr = await ls('imastery.route');
        if (!pr || pr.id !== 'pyback' || pr.mode !== 'path' || pr.lang !== 'python' || !pr.updatedAt) err('picking Python backend stored ' + JSON.stringify(pr));
        const tr = await np.evaluate(() => [...document.querySelectorAll('.pathtracks [data-track]')].map((a) => a.getAttribute('data-track')).join());
        const want = await np.evaluate(() => Learn.pathTracks().map((t) => t.track).join());
        if (!tr || tr !== want || tr !== 'py,dsa,sql,cs,be,hld') err('home path tracks are ' + tr + ', expected py,dsa,sql,cs,be,hld');
        if ((await np.getAttribute('[data-mode="path"]', 'aria-pressed')) !== 'true') err('My path toggle is not aria-pressed');
        if (!(await np.$('.otherlands'))) err('off-path lands are not collected under Other lands');
        if (!(await np.$('.nextstop.path'))) err('hero does not show Next on your path');
        // 5c search: on-path first, "My path only" chip with a reveal
        await np.fill('#gsearch', 'spring');
        await np.waitForTimeout(400);
        if ((await np.getAttribute('[data-pathonly]', 'aria-pressed')) !== 'true') err('"My path only" chip is not on by default');
        if (!(await np.$('[data-searchall]'))) err('no "Search everything" reveal for off-path hits');
        else {
          await np.click('[data-searchall]');
          if ((await np.getAttribute('[data-pathonly]', 'aria-pressed')) !== 'false') err('Search everything did not turn the filter off');
          if (!(await np.$('#gresults .res.off'))) err('Search everything shows no Other lands results');
          if (await np.evaluate(() => document.getElementById('gresults').hidden)) err('results closed after the filter click');
        }
        await np.fill('#gsearch', '');
        // 5d Explore all from the toggle renders the home exactly as before
        await np.click('[data-mode="all"]');
        await np.waitForTimeout(200);
        const allHome = await html('#main');
        if ((await np.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-mode'))) !== 'all') err('focus left the mode toggle');
        await np.evaluate(() => localStorage.setItem('imastery.route', JSON.stringify({ id: 'pyback', lang: 'python', hours: 10 })));
        await go('index.html');
        const legacy = await html('#main');
        if (allHome !== legacy) err('Explore all home differs from the pre-path render for the same route');
        await np.evaluate(() => localStorage.setItem('imastery.route', JSON.stringify({ id: 'pyback', lang: 'python', hours: 10, mode: 'path', onboarded: true, known: [], updatedAt: 1 })));
        // 5e track page in My path: path group first, More in this track, path progress
        await go('be.html');
        if (!(await np.$('#nav .nav-more'))) err('be.html sidebar has no "More in this track"');
        if (!(await np.$('#main .pathzone'))) err('be.html dashboard has no path section');
        if (!/^Your path: \d+ of \d+/.test(await np.textContent('#ptext'))) err('track progress does not read "Your path"');
        // 5f framework-specific module: Java/Spring lessons behind a one-line reveal, links still open them
        await np.evaluate(() => { location.hash = 'be06'; });
        await np.waitForSelector('#be06-t0', { state: 'attached', timeout: 8000 }).catch(() => err('be06 did not render'));
        if (!(await np.$('#lg-be06'))) err('be06 has no language reveal for a Python learner');
        if (!(await np.evaluate(() => document.getElementById('be06-t0').hidden && document.getElementById('be06-t0').getAttribute('data-lang') === 'java'))) err('be06 topics are not hidden with data-lang');
        await np.click('[data-langshow="be06"]');
        if (await np.evaluate(() => document.getElementById('be06-t0').hidden)) err('Show it did not reveal be06');
        if (!(await np.$('.pathban'))) err('module page has no path banner');
        // 5g a shared link to an off-path module still opens fully
        await go('java.html#java05');
        if (!(await np.waitForSelector('#java05-t0', { timeout: 8000 }).then(() => true, () => false))) err('java.html#java05 did not open with a Python route');
        await go('be.html#be07-t1');
        if (!(await np.waitForSelector('#be07-t1', { state: 'visible', timeout: 8000 }).then(() => true, () => false))) err('a link to a hidden framework topic did not reveal it');
        // 5h Explore all on a track page shows no path additions
        await np.evaluate(() => localStorage.setItem('imastery.route', JSON.stringify({ id: 'pyback', lang: 'python', hours: 10, mode: 'all', onboarded: true })));
        await go('be.html');
        if (await np.$('#nav .nav-more, #main .pathzone, .reltag')) err('Explore all track page shows My path elements');
        if (!/^Land explored/.test(await np.textContent('#ptext'))) err('Explore all track progress changed');
        // 5i passport: route progress strip and per-route stamps
        await np.evaluate(() => localStorage.setItem('imastery.route', JSON.stringify({ id: 'pyback', lang: 'python', hours: 10, mode: 'path', onboarded: true })));
        await go('passport.html');
        if (await np.evaluate(() => !!(window.Auth && Auth.enabled))) {
          // accounts on, nobody signed in: only the sign-in card shows (no photo upload, stamps or settings for guests)
          if (!(await np.$('#pHead .pp-signin'))) err('signed-out passport has no sign-in button');
          if (await np.$('#pAvBtn')) err('signed-out passport offers the profile photo sheet');
          if (await np.evaluate(() => [...document.querySelectorAll('#pRoute, #pCollection, .pp-side')].some((e) => !e.hidden))) err('signed-out passport still shows stamps or settings');
        } else {
          if (!(await np.$('#pRoute .rstages li'))) err('passport has no route progress strip');
          if ((await np.$$('#pRouteStamps .pst')).length !== await np.evaluate(() => PATHS.ROUTES.length)) err('passport does not show one stamp per route');
        }
      }
      // 5j planner screens (src/planner.js): home in My path mode, today.html, plan.html
      if (width === 1280) {
        const rest = (new Date().getDay() + 3) % 7;
        await np.evaluate((rd) => localStorage.setItem('imastery.route', JSON.stringify({ id: 'pyback', lang: 'python', hours: 10, mode: 'path', onboarded: true, known: [], updatedAt: 1, restDay: rd })), rest);
        await go('index.html');
        if (!(await np.$('.whero.plan .nextstop.path[data-next]'))) err('My path home has no planner Next card');
        if (!(await np.$('.pchips .chip'))) err('My path home has no streak/minutes chips');
        if (!(await np.$('a.seetoday[href="today.html"]'))) err('My path home has no "See today\'s plan" link');
        const cards = await np.$$eval('.pathtracks [data-track]', (a) => a.map((x) => x.getAttribute('data-track') + ':' + x.getAttribute('href')));
        if (!cards.length || !cards.every((c) => /^[a-z]+:[a-z]+\.html#[a-z]+\d+$/.test(c))) err('track cards do not open the next module in the track: ' + cards.join());
        if (!(await np.$('.quick a[href="plan.html"]')) || !(await np.$('.quick [data-jump]'))) err('My path home has no quick actions');
        if (!(await np.$('.jnav a[data-page="today"]'))) err('header has no Today link');
        await np.fill('#gsearch', 'plan');
        await np.waitForTimeout(400);
        if (!(await np.$('#gresults .res.screen[href="plan.html"]'))) err('search does not list the Plan screen');
        await np.fill('#gsearch', '');
        // today.html lists items that link into their sections
        await go('today.html');
        const items = await np.$$eval('.titem', (a) => a.map((x) => x.querySelector('a.t').getAttribute('href')));
        if (!items.length || !items.every((h) => /^[a-z]+\.html#[a-z]+\d+-(t|p)\d+$/.test(h))) err('today.html items do not link to lesson sections: ' + items.join());
        if (!/\d+ minutes planned/.test(await np.textContent('#pgH'))) err('today.html heading does not show the minute budget');
        if (!(await np.$('.nextstop.path[data-next]'))) err('today.html has no Continue card');
        // plan.html: hours and interview date change the forecast; placement asks to confirm
        await go('plan.html');
        const hero0 = await np.textContent('#plHero');
        await np.click('[data-hours="20"]');
        await np.waitForTimeout(250);
        const hero1 = await np.textContent('#plHero');
        if (hero0 === hero1 || !/~\d+ weeks/.test(hero1)) err('changing hours did not update the forecast: ' + hero0 + ' -> ' + hero1);
        if ((await np.getAttribute('[data-hours="20"]', 'aria-pressed')) !== 'true') err('hours button is not aria-pressed after the click');
        if ((await ls('imastery.route')).hours !== 20) err('hours were not stored');
        const d = new Date(); d.setDate(d.getDate() + 21);
        const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        await np.fill('#plDate', iso);
        await np.waitForTimeout(250);
        const hero2 = await np.textContent('#plHero');
        if (!/21 days/.test(hero2)) err('interview date did not update the forecast: ' + hero2);
        if ((await ls('imastery.route')).interviewDate !== iso) err('interview date was not stored');
        if (!(await np.$('.plan.weeks .ico.mock'))) err('interview mode shows no mock rounds in the forecast');
        await np.click('[data-place="lang"]');
        await np.waitForTimeout(200);
        if (!(await np.evaluate(() => { const g = document.getElementById('placeDlg'); return !!(g && g.open && g.querySelector('[data-pl-ok]') && g.querySelector('[data-pl-prove]')); }))) err('placement did not ask to confirm (with a readiness alternative)');
        const before = Object.keys((await ls('imastery.done')) || {}).filter((k) => k.startsWith('@tested:')).length;
        await np.click('[data-pl-cancel]');
        if (Object.keys((await ls('imastery.done')) || {}).filter((k) => k.startsWith('@tested:')).length !== before) err('cancelling placement changed progress');
        await np.click('[data-place="lang"]');
        await np.click('[data-pl-ok]');
        await np.waitForTimeout(300);
        const after = Object.keys((await ls('imastery.done')) || {}).filter((k) => k.startsWith('@tested:')).length;
        if (after <= before) err('confirmed placement marked nothing as tested');
        if ((await ls('imastery.route')).placement !== 'lang') err('placement level was not stored');
        if (!(await np.$('#mock [data-mock]'))) err('plan.html has no mock round button');
        // Explore all: today/plan without a chosen route ask for a path; the home never shows planner elements
        await np.evaluate(() => localStorage.setItem('imastery.route', JSON.stringify({ onboarded: true, mode: 'all' })));
        await go('today.html');
        if (!(await np.$('.needpath [data-onb]'))) err('today.html without a path has no Pick a path button');
        await go('index.html');
        if (await np.$('.whero.plan, .pchips, .quick')) err('Explore all home shows planner elements');
      }
      // 5k language mode (src/engine.js codeTabs/viewLang): a Python learner sees only the Python pane in both modes (other
      // languages are not rendered); the picker switches live; with no chosen language every tab shows as before
      if (width === 1280) {
        const vis = (root, q) => root.$$eval(q, (a) => a.filter((x) => !x.hidden).map((x) => x.textContent.trim()));
        const visPane = (box) => box.$$eval('.cpane', (a) => a.filter((x) => !x.hidden).map((x) => x.getAttribute('data-pane')));
        const tabIdx = (box, name) => box.$$eval('.ctab', (a, n) => (a.filter((x) => x.textContent.trim() === n)[0] || { getAttribute: () => null }).getAttribute('data-tab'), name);
        // the picker is a styled dropdown (src/journey.js): open its button and pick the option by label
        const pickLang = async (label) => {
          await np.click('.lang-pick .jdd-btn');
          await np.click('.lang-pick .jdd-list li:text-is("' + label + '")');
          await np.waitForTimeout(400);
        };
        const pickerValue = () => np.$eval('[data-langpick]', (s) => s.value);
        for (const mode of ['path', 'all']) {
          await np.evaluate((m) => { localStorage.setItem('imastery.route', JSON.stringify({ id: 'pyback', lang: 'python', hours: 10, mode: m, onboarded: true, known: [], updatedAt: 1 })); localStorage.removeItem('imastery.lang'); }, mode);
          await go('dsa.html'); // a fresh load each time: the same URL with a hash would only be a fragment navigation
          await np.evaluate(() => { location.hash = 'dsa01'; });
          cur = 'nav dsa.html#dsa01 (' + mode + ' mode, python)';
          if (!(await np.waitForSelector('#dsa01-t0', { timeout: 8000 }).then(() => true, () => false))) { err('dsa01 did not render'); continue; }
          const boxes = await np.$$('.code[data-langmode="python"]');
          if (boxes.length < 2) { err('a Python learner sees no language-mode code blocks on dsa01 (' + boxes.length + ')'); continue; }
          const box = boxes[0];
          const tabs = await vis(box, '.ctab');
          if (tabs.join() !== 'Python' && tabs.filter((t) => t !== 'Python').length) err('first code block shows tabs ' + JSON.stringify(tabs) + ', expected only Python (plus neutral snippets)');
          if (await box.$('.ctab[hidden], [data-more]')) err('language mode still renders hidden other-language tabs or an "Other languages" control');
          if (await np.evaluate(() => [...document.querySelectorAll('.code[data-langmode] .cpane')].some((p) => /^(java|js|cpp|javascript|c\+\+)$/i.test(p.querySelector('.code-head span') ? p.querySelector('.code-head span').textContent.trim() : '')))) err('other-language panes are still in the DOM');
          const py = await tabIdx(box, 'Python');
          const panes = await visPane(box);
          if (panes.length !== 1 || panes[0] !== py) err('first code block shows pane(s) ' + panes.join() + ', expected only the Python pane (' + py + ')');
          if ((await pickerValue()) !== 'python') err('language picker does not show Python for a Python route');
          // live switch via the picker: Java first, then every language
          await pickLang('Java');
          const jb = await np.$('.code[data-langmode="java"]');
          if (!jb || (await vis(jb, '.ctab')).join() !== 'Java') err('picking Java did not switch the code blocks live');
          if (!(await np.evaluate(() => document.activeElement && !!document.activeElement.closest('.lang-pick')))) err('focus left the language picker after switching');
          await pickLang('Show every language');
          if (await np.$('.code[data-langmode], [data-more]')) err('"Show every language" still hides languages');
          if (await np.$('.ctab[hidden]')) err('"Show every language" leaves hidden tabs');
          if (!(await np.$('.code.tabs .ctab'))) err('"Show every language" shows no code tabs');
          const lk = await ls('imastery.lang');
          if (lk !== 'all') err('"Show every language" with a chosen route stored ' + JSON.stringify(lk) + ', expected "all"');
        }
        // no chosen language: identical to the pre-language-mode render, every tab visible
        await np.evaluate(() => { localStorage.setItem('imastery.route', JSON.stringify({ onboarded: true })); localStorage.removeItem('imastery.lang'); });
        await go('dsa.html');
        await np.evaluate(() => { location.hash = 'dsa01'; });
        cur = 'nav dsa.html#dsa01 (no language)';
        await np.waitForSelector('#dsa01-t0', { timeout: 8000 }).catch(() => err('dsa01 did not render'));
        if (await np.$('.code[data-langmode], [data-more], .ctab.other, .ctab[hidden]')) err('a learner with no language sees language-mode markup');
        const all = await vis(np, '.code.tabs .ctab');
        for (const l of ['Java', 'Python', 'JavaScript', 'C++']) if (!all.includes(l)) err('no-language render is missing the ' + l + ' tab');
        if ((await pickerValue()) !== '') err('language picker is not on "Show every language" without a choice');
      }
      // existing learners with progress get the banner, never the dialog
      const ectx = await browser.newContext({ viewport: { width, height: 800 }, serviceWorkers: 'block' });
      await ectx.addInitScript(() => { if (!localStorage.getItem('imastery.done')) localStorage.setItem('imastery.done', JSON.stringify({ 'dsa01-t0': 1 })); });
      const ep = await ectx.newPage();
      cur = 'nav existing learner';
      await ep.goto(base + 'index.html', { waitUntil: 'load' });
      await ep.waitForTimeout(300);
      if (await ep.evaluate(() => !!(document.getElementById('onb') && document.getElementById('onb').open))) err('onboarding forced on a learner with progress');
      if (!(await ep.$('#pathbar .pb-ban'))) err('learner with progress sees no Pick a path banner');
      await ectx.close();
      await nctx.close();
    }
    await ctx.close();
  }
  await browser.close();
  server.close();
  if (fails.length) { console.error('\nSMOKE TEST FAILED: ' + fails.length + ' problem(s)'); process.exit(1); }
  console.log('smoke test passed (' + site + ')');
})().catch((e) => { console.error('SMOKE FAIL: ' + e.stack); process.exit(1); });
