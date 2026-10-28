// Unit test for src/visits.js: coarse device/OS/browser classes, safe page names, opt-outs and the request it sends.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'visits.js'), 'utf8');

function load(o) {
  o = o || {};
  const store = Object.assign({}, o.store || {}), calls = [], listeners = {};
  const ctx = {
    window: {}, console, Date, JSON, Math, Uint8Array, setTimeout: (f) => f(),
    IM_CONFIG: o.cfg === undefined ? { supabaseUrl: 'https://x.supabase.co', supabaseKey: 'pub' } : o.cfg,
    location: { pathname: o.path || '/DSA-LEARNINGS/dsa.html', hash: o.hash || '' },
    screen: { width: o.w || 400, height: 800 }, innerWidth: o.w || 400,
    navigator: Object.assign({ userAgent: o.ua || 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36', onLine: true, maxTouchPoints: 0 }, o.nav || {}),
    crypto: { randomUUID: () => '12345678-1234-4123-8123-123456789abc' },
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, key: (i) => Object.keys(store)[i], get length() { return Object.keys(store).length; } },
    document: { readyState: 'complete' },
    fetch: (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return Promise.resolve({}); },
    addEventListener: (t, f) => { listeners[t] = f; },
    Capacitor: o.native ? { isNativePlatform: () => true } : undefined
  };
  ctx.window = ctx; ctx.self = ctx;
  vm.runInNewContext(src, ctx);
  return { calls, store, listeners, api: ctx.IMVisits, ctx };
}

// One visit on load, with coarse classes and no raw user-agent.
let r = load();
assert.equal(r.calls.length, 1);
assert.equal(r.calls[0].url, 'https://x.supabase.co/rest/v1/rpc/log_visit');
assert.deepEqual(r.calls[0].body, { p_visitor: '12345678-1234-4123-8123-123456789abc', p_page: 'dsa.html', p_surface: 'web', p_device: 'mobile', p_os: 'Android', p_browser: 'Chrome' });
assert(!JSON.stringify(r.calls[0].body).includes('Mozilla'), 'raw user-agent is never sent');
assert.equal(r.calls[0].init.headers.Authorization, 'Bearer pub');
assert.equal(r.store['imastery.vid'], '12345678-1234-4123-8123-123456789abc');

// Classes.
const A = r.api;
assert.equal(A.os('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0 Edg/141.0'), 'Windows');
assert.equal(A.browser('Mozilla/5.0 (Windows NT 10.0) Chrome/141.0 Edg/141.0'), 'Edge');
assert.equal(A.browser('Mozilla/5.0 (Linux; Android 14) SamsungBrowser/27.0 Chrome/125.0 Mobile'), 'Samsung');
assert.equal(A.browser('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Version/18.0 Safari/605.1.15'), 'Safari');
assert.equal(A.os('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148'), 'iOS');
assert.equal(A.device('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148'), 'mobile');
assert.equal(A.device('Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/141.0 Safari/537.36'), 'tablet');
assert.equal(load({ ua: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/141.0', w: 1440 }).calls[0].body.p_device, 'desktop');

// Once per page per day; a new page is a new visit.
r = load({ store: { 'imastery.vlog': new Date().toISOString().slice(0, 10) + '|dsa.html' } });
assert.equal(r.calls.length, 0, 'the same page is not sent twice in a day');

// Opt-outs and no configuration.
assert.equal(load({ store: { 'imastery.noStats': '1' } }).calls.length, 0);
assert.equal(load({ nav: { doNotTrack: '1' } }).calls.length, 0);
assert.equal(load({ nav: { globalPrivacyControl: true } }).calls.length, 0);
assert.equal(load({ nav: { onLine: false } }).calls.length, 0);
assert.equal(load({ cfg: {} }).calls.length, 0);

// Signed in: the session token is sent so the row records signed_in.
r = load({ store: { 'sb-abc-auth-token': JSON.stringify({ access_token: 'tok', expires_at: Date.now() / 1000 + 3600 }) } });
assert.equal(r.calls[0].init.headers.Authorization, 'Bearer tok');

// App: surface app, browser App, the screen from the hash, one visit per screen change.
r = load({ native: true, path: '/index.html', hash: '#module/dsa05' });
assert.deepEqual([r.calls[0].body.p_surface, r.calls[0].body.p_browser, r.calls[0].body.p_page], ['app', 'App', 'index.html#module']);
r.ctx.location.hash = '#play'; r.listeners.hashchange();
assert.equal(r.calls[1].body.p_page, 'index.html#play');

// Page names stay within the database's allowed characters.
assert.equal(load({ path: '/a/Weird Name<>.HTML' }).calls[0].body.p_page, 'weirdname.html');
console.log('visits-test: all passed');
