// Tests src/errors.js: unit (node vm) and end to end (built site + Playwright).
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const { spawnSync } = require('child_process');
const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'src/errors.js'), 'utf8');

function make(o) {
  o = o || {};
  const calls = [], L = {}, store = o.store || {};
  const win = {
    IM_CONFIG: 'cfg' in o ? o.cfg : { supabaseUrl: 'https://x.supabase.co', supabaseKey: 'KEY', version: '9.9' },
    addEventListener: (t, f) => { L[t] = f; }
  };
  if (o.native) win.Capacitor = { isNativePlatform: () => true };
  const ctx = {
    window: win, Capacitor: win.Capacitor,
    navigator: { onLine: o.online !== false, userAgent: 'UA' + 'u'.repeat(400) },
    location: { pathname: o.path || '/a.html', hash: o.hash || '#h' },
    localStorage: { getItem: (k) => (k in store ? store[k] : null) },
    fetch: (u, i) => { calls.push({ u, i, b: JSON.parse(i.body) }); if (o.throws) throw new Error('x'); return Promise.reject(new Error('net')); }
  };
  vm.runInNewContext(code, ctx);
  return { calls, L, win };
}
const err = (m, stack) => ({ message: m, error: stack === undefined ? { stack: 'at f (a.js:1)' } : stack && { stack } });

let t = make();
t.L.error(err('boom ' + 'm'.repeat(600), 's'.repeat(5000)));
let c = t.calls[0];
assert.strictEqual(c.u, 'https://x.supabase.co/rest/v1/client_errors');
assert.strictEqual(c.i.method, 'POST'); assert(c.i.keepalive);
assert.strictEqual(c.i.headers.apikey, 'KEY'); assert.strictEqual(c.i.headers.Authorization, 'Bearer KEY');
assert.strictEqual(c.i.headers.Prefer, 'return=minimal');
assert.deepStrictEqual(Object.keys(c.b).sort(), ['app', 'message', 'page', 'stack', 'ua', 'version']);
assert.strictEqual(c.b.app, 'web'); assert.strictEqual(c.b.version, '9.9'); assert.strictEqual(c.b.page, '/a.html#h');
assert.strictEqual(c.b.message.length, 500); assert.strictEqual(c.b.stack.length, 4000); assert.strictEqual(c.b.ua.length, 300);

t = make({ native: true }); t.L.error(err('x')); assert.strictEqual(t.calls[0].b.app, 'android');

t = make({ path: '/p.html', hash: '#a?token=abc' });
t.L.error(err('fail for bob@example.com at https://s.com/x?key=secret&a=1 ok', 'at https://s.com/y?z=1:2\nmail me@a.io'));
c = t.calls[0].b;
assert(!/bob@|example\.com|secret|key=|me@a|z=1/.test(JSON.stringify(c)), JSON.stringify(c));
assert(!c.page.includes('token'));

t = make(); t.L.error(err('same')); t.L.error(err('same')); assert.strictEqual(t.calls.length, 1);
t.L.unhandledrejection({ reason: new Error('rej') }); assert.strictEqual(t.calls.length, 2);
t = make(); for (let i = 0; i < 9; i++) t.L.error(err('e' + i)); assert.strictEqual(t.calls.length, 5);

assert.strictEqual(make({ cfg: {} }).L.error, undefined);
for (const o of [{ online: false }, { store: { 'imastery.noErrors': '1' } }]) { t = make(o); t.L.error(err('q')); assert.strictEqual(t.calls.length, 0); }
t = make(); t.L.error(err('x', 'at chrome-extension://abc/x.js:1')); t.L.error({ message: 'Script error.' }); assert.strictEqual(t.calls.length, 0);
t = make({ throws: true }); t.L.error(err('t')); t.L.unhandledrejection({ reason: null });
console.log('unit ok');

(async () => {
  const out = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'errtest-site-'));
  const r = spawnSync(process.execPath, [path.join(__dirname, 'build.js'), out], { encoding: 'utf8', env: Object.assign({}, process.env, { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'dummykey' }) });
  assert.strictEqual(r.status, 0, r.stderr);
  const { chromium } = require('/opt/node-tools/node_modules/playwright');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pg = await b.newPage(), posts = [];
  await pg.route('**/*', (rt) => {
    const u = rt.request().url();
    if (u.includes('example.supabase.co')) { if (rt.request().method() === 'POST' && u.includes('/rest/v1/client_errors')) posts.push(rt.request().postDataJSON()); return rt.fulfill({ status: 201, headers: { 'access-control-allow-origin': '*' }, body: '' }); }
    if (u.startsWith('file:')) return rt.continue();
    return rt.abort();
  });
  await pg.goto('file://' + out + '/index.html');
  await pg.evaluate(() => setTimeout(() => { throw new Error('boom test@example.com'); }));
  await pg.waitForTimeout(1500);
  await b.close();
  assert.strictEqual(posts.length, 1, JSON.stringify(posts));
  assert(/boom \[email\]/.test(posts[0].message) && !posts[0].stack.includes('test@'), JSON.stringify(posts[0]));
  console.log('e2e ok: 1 POST, message=' + JSON.stringify(posts[0].message));
})().catch((e) => { console.error(e); process.exit(1); });
