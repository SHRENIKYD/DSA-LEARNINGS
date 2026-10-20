const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const U = require('../app/update.js');
const release = (tag, extra = {}) => ({ tag_name: tag, html_url: 'https://github.com/SHRENIKYD/DSA-LEARNINGS/releases/tag/' + tag, assets: [{ name: 'app.apk' }], ...extra });
assert(U.newer('app-v1.10.0', '1.9.9'));
assert(!U.newer('app-v1.7.0', '1.7.0'));
assert(!U.newer('v1.6.0', '1.7.0'));
assert(!U.newer('app-v1.8.0-beta', '1.7.0'));
assert(!U.newer('app-v1.8.0', 'unknown'));
assert.equal(U.latest([release('app-v1.8.0'), release('app-v1.10.0')], '1.7.0').tag_name, 'app-v1.10.0');
assert.equal(U.latest([release('v9.0.0'), release('app-v2.0.0', { prerelease: true }), release('app-v2.1.0', { assets: [] }), release('app-v2.2.0', { html_url: 'https://example.com' })], '1.7.0'), null);
function runtime(platform = 'android') {
  const elements = {}, storage = {}, handlers = {}, counts = { fetch: 0, opens: 0 };
  const status = { textContent: '' };
  const document = { hidden: false, activeElement: { isConnected: true, focus() {} }, getElementById(id) { return id === 'updateStatus' ? status : id === 'cel' ? { hidden: true } : elements[id] || null; }, addEventListener(k, f) { handlers[k] = f; }, createElement() { const buttons = {}; return { setAttribute() {}, querySelector(id) { return buttons[id] ||= { addEventListener(k, fn) { this[k] = fn; }, focus() {} }; }, addEventListener(k, f) { this[k] = f; }, showModal() { this.open = true; }, close() { this.open = false; this['close-event']?.(); }, remove() { delete elements[this.id]; } }; }, body: { appendChild(el) { elements[el.id] = el; } } };
  // Use distinct close-event wiring to model native dialog's close event.
  const create = document.createElement;
  document.createElement = () => { const n = create(); const old = n.addEventListener; n.addEventListener = function (k, f) { old.call(this, k === 'close' ? 'close-event' : k, f); }; return n; };
  const ctx = { window: { IM_VERSION: '1.7.0', Capacitor: { isNativePlatform: () => platform !== 'web', getPlatform: () => platform, Plugins: { App: { getInfo: async () => ({ version: '1.7.0' }), addListener() {} }, Browser: { async open(o) { counts.opens++; counts.lastUrl = o.url; } } } }, addEventListener(k, f) { handlers[k] = f; } }, document, location: { hash: '#home' }, localStorage: { getItem(k) { return storage[k] || null; }, setItem(k, v) { storage[k] = v; } }, AbortController, setTimeout, clearTimeout, Date, Promise, fetch: async () => { counts.fetch++; return { ok: true, json: async () => [release('app-v1.8.0')] }; } };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(__dirname + '/../app/update.js', 'utf8'), ctx);
  return { ctx, U: ctx.AppUpdates, elements, storage, handlers, counts, status };
}
(async () => {
  const r = runtime(); r.U.init(); await new Promise(setImmediate);
  assert.equal(r.counts.fetch, 1); assert(r.elements.appUpdateDialog.open);
  r.elements.appUpdateDialog.querySelector('#updateLater').click();
  assert(Object.values(r.storage).some(v => +v > Date.now()));
  delete r.elements.appUpdateDialog;
  await r.U.check(false); assert.equal(r.counts.fetch, 1, 'automatic checks are throttled');
  await r.U.check(true); assert(r.elements.appUpdateDialog, 'manual check bypasses snooze');
  r.elements.appUpdateDialog.querySelector('#updateNow').click(); await new Promise(resolve => setTimeout(resolve, 1300));
  assert.equal(r.ctx.location.href, 'market://details?id=io.github.shrenikyd.interviewmastery', 'opens the Play Store app');
  assert.equal(r.counts.opens, 1, 'falls back to the Play listing in the browser when the Play app does not open');
  assert.equal(r.counts.lastUrl, 'https://play.google.com/store/apps/details?id=io.github.shrenikyd.interviewmastery');
  const played = runtime(); await played.U.check(true); played.elements.appUpdateDialog.querySelector('#updateNow').click(); played.ctx.document.hidden = true; await new Promise(resolve => setTimeout(resolve, 1300));
  assert.equal(played.counts.opens, 0, 'no browser fallback once the Play Store app has opened');
  assert.equal(played.elements.appUpdateDialog, undefined, 'dialog closes after opening Google Play');
  const game = runtime(); game.ctx.location.hash = '#game/guess'; game.U.init(); await new Promise(setImmediate);
  assert.equal(game.elements.appUpdateDialog, undefined, 'does not interrupt games');
  game.ctx.location.hash = '#home'; game.handlers.hashchange(); await new Promise(resolve => setTimeout(resolve, 5)); assert(game.elements.appUpdateDialog);
  const nativeVersion = runtime(); nativeVersion.ctx.window.Capacitor.Plugins.App.getInfo = async () => ({ version: '1.8.0' }); await nativeVersion.U.check(true); assert.equal(nativeVersion.elements.appUpdateDialog, undefined, 'native installed version takes precedence');
  const persisted = runtime(); Object.assign(persisted.storage, r.storage); await persisted.U.check(false); assert.equal(persisted.elements.appUpdateDialog, undefined, 'snooze survives app restarts');
  const browserError = runtime(); browserError.ctx.window.Capacitor.Plugins.Browser.open = async () => { throw new Error('unavailable'); }; await browserError.U.check(true); browserError.elements.appUpdateDialog.querySelector('#updateNow').click(); await new Promise(resolve => setTimeout(resolve, 1300)); assert.match(browserError.elements.appUpdateDialog.querySelector('#updateOpenStatus').textContent, /Could not open/);
  const offline = runtime(); offline.ctx.fetch = async () => { throw new Error('offline'); }; await offline.U.check(true); assert.match(offline.status.textContent, /Could not check/); assert.equal(offline.elements.appUpdateDialog, undefined);
  for (const platform of ['web', 'ios']) { const other = runtime(platform); await other.U.check(true); assert.equal(other.counts.fetch, 0); }
  console.log('PASS: numeric versions, stable app releases, APK availability, trusted URLs, startup check, snooze, manual check, rate limiting, Play Store update action and browser fallback, game deferral, offline handling, platform guards');
})().catch(e => { console.error(e); process.exitCode = 1; });
