// Captures 1080×1920 Play Store phone screenshots of the app bundle (example progress, not a real user).
// usage: node tools/build-app.js && node tools/store-screens.js   (needs Playwright with Chromium installed)
const http = require('http');
const fs = require('fs');
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const root = path.join(__dirname, '..'), dir = path.join(root, 'app-www'), out = path.join(root, 'store', 'screenshots');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm' };
const srv = http.createServer((q, r) => { const p = path.join(dir, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });

function seed() {
  const done = {};
  const mods = { dsa01: [8, 8], dsa02: [6, 6], dsa03: [8, 5], dsa06: [8, 3] };
  Object.keys(mods).forEach((m) => { for (let i = 0; i < mods[m][1]; i++) { done[m + '-t' + i] = 1; done[m + '-t' + i + '-q0'] = 1; } });
  for (let k = 0; k < 6; k++) done['dsa01-p' + k] = 1;
  const days = {}, now = new Date();
  for (let d = 0; d < 12; d++) { const x = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d); days[x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0')] = { t: 2, q: 1 }; }
  const play = { v: 1, seen: Object.assign({}, done), days, claimed: {}, bonus: 180, games: { guess: { wins: 3 }, race: { wins: 2 }, pointers: { wins: 1 } }, settings: { haptics: true, bit: true, motion: false, sound: true, tts: { rate: 1, voice: null, cont: true } }, track: 'dsa', lastGame: 'race' };
  const last = { track: 'dsa', id: 'dsa06', num: 6, hash: 'dsa06-t3', title: 'Two Pointers & Sliding Window', topicTitle: 'Same-Direction Pointers (Slow & Fast): Remove Duplicates, Move Zeroes', trackTitle: 'DSA + Math for CS', topic: 3, topics: 8 };
  return { done, play, last };
}

(async () => {
  await new Promise((r) => srv.listen(0, r));
  const A = 'http://127.0.0.1:' + srv.address().port + '/';
  fs.mkdirSync(out, { recursive: true });
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const s = seed();
  await ctx.addInitScript((s) => {
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak() { }, cancel() { }, getVoices() { return [{ name: 'English (US)', lang: 'en-US' }]; } } });
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('imastery.done', JSON.stringify(s.done));
    localStorage.setItem('imastery.play', JSON.stringify(s.play));
    localStorage.setItem('imastery.last', JSON.stringify(s.last));
  }, s);
  const pg = await ctx.newPage();
  await pg.goto(A + 'index.html#home'); await pg.waitForTimeout(400);
  await pg.evaluate(() => {
    const done = JSON.parse(localStorage.getItem('imastery.done') || '{}'), SI = window.SEARCH_INDEX.modules;
    ['dsa01', 'dsa02', 'dsa03', 'dsa04', 'dsa05'].forEach((m) => SI[m].items.forEach((id) => { done[id] = 1; }));
    localStorage.setItem('imastery.done', JSON.stringify(done));
    const p = JSON.parse(localStorage.getItem('imastery.play')); p.seen = Object.assign({}, done); localStorage.setItem('imastery.play', JSON.stringify(p));
  });
  const snap = async (name, hash, after) => {
    const calm = async () => { for (let i = 0; i < 6 && await pg.locator('#cel').isVisible().catch(() => false); i++) { await pg.click('#celOk'); await pg.waitForTimeout(60); } };
    await pg.goto('about:blank'); await pg.goto(A + hash); await pg.waitForTimeout(500); await calm();
    if (after) await after();
    await pg.waitForTimeout(250); await calm();
    await pg.screenshot({ path: path.join(out, name + '.png') });
  };
  await snap('01-home', 'index.html#home');
  await snap('02-map', 'index.html#map/dsa', async () => { await pg.evaluate(() => { const c = document.querySelector('.node.cur'); if (c) c.scrollIntoView({ block: 'center' }); }); });
  await snap('03-game-pointers', 'index.html#game/pointers');
  await snap('04-game-brackets', 'index.html#game/brackets', async () => { const bal = await pg.evaluate(() => Games.balanced(document.querySelector('.g-brk').dataset.s)); await pg.locator('#game .g-choices button').nth(bal ? 0 : 1).click(); });
  await snap('05-lesson-read-aloud', 'dsa.html#dsa06-t0', async () => { await pg.waitForTimeout(500); await pg.click('#imListen'); await pg.waitForTimeout(300); });
  await snap('06-badges', 'index.html#badges');
  await br.close(); srv.close();
  console.log('screenshots written to store/screenshots');
})();
