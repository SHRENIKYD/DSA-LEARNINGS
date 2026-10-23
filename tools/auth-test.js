// Unit tests for the progress-sync logic in src/auth.js. No network: a fake Supabase client is used.
// Usage: node tools/auth-test.js   (AUTH_JS=/path/to/auth.js to test another copy)
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const SRC = process.env.AUTH_JS || path.join(__dirname, '..', 'src', 'auth.js');
const code = fs.readFileSync(SRC, 'utf8');

function setup(opts) {
  opts = opts || {};
  const store = Object.assign({}, opts.local || {});
  const calls = [];
  const state = { row: opts.row === undefined ? null : opts.row, fail: false, throwNet: false, session: opts.session || null, authCb: null };
  const localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
  const supabase = { createClient() { return {
    from(table) { return {
      select() { return { eq() { return { maybeSingle() {
        calls.push({ op: 'select', table });
        if (state.throwNet) return Promise.reject(new Error('offline'));
        if (state.fail) return Promise.resolve({ data: null, error: { message: 'x' } });
        return Promise.resolve({ data: state.row, error: null });
      } }; } }; },
      upsert(body) {
        calls.push({ op: 'upsert', table, body: JSON.parse(JSON.stringify(body)) });
        if (state.throwNet) return Promise.reject(new Error('offline'));
        if (state.fail) return Promise.resolve({ error: { message: 'x' } });
        state.row = { done: body.done, last: body.last, user_id: body.user_id };
        return Promise.resolve({ error: null });
      }
    }; },
    rpc(n) { calls.push({ op: 'rpc', n }); return Promise.resolve({ error: null }); },
    auth: {
      getSession() { return Promise.resolve({ data: { session: state.session } }); },
      onAuthStateChange(cb) { state.authCb = cb; },
      signOut() { calls.push({ op: 'signOut' }); state.session = null; return Promise.resolve({}); }
    }
  }; } };
  const winListeners = {};
  const window = { IM_CONFIG: { supabaseUrl: 'http://x', supabaseKey: 'k' }, supabase,
    addEventListener: (n, f) => { winListeners[n] = f; } };
  const ctx = { window, localStorage, location: { pathname: '/a.html', search: '', hash: '' }, document: {},
    setTimeout, clearTimeout, Promise, JSON, Object, console };
  vm.createContext(ctx);
  vm.runInContext(code + '\n;this.Auth = Auth;', ctx, { filename: SRC });
  return { Auth: ctx.Auth, store, calls, state, win: winListeners,
    ls: k => (k in store ? JSON.parse(store[k]) : undefined),
    upserts: () => calls.filter(c => c.op === 'upsert') };
}
const sess = id => ({ user: { id, email: id + '@x.com' } });
const tick = () => new Promise(r => setTimeout(r, 20));
const J = o => JSON.stringify(o);

const tests = [];
const test = (n, f) => tests.push([n, f]);

test('first sign-in of a new user uploads local progress', async () => {
  const t = setup({ session: sess('u1'), row: null, local: { 'imastery.done': J({ a: 1, b: 1 }), 'imastery.last': J('b') } });
  await t.Auth.init();
  assert.strictEqual(t.upserts().length, 1);
  assert.deepStrictEqual(t.upserts()[0].body, { user_id: 'u1', done: { a: 1, b: 1 }, last: 'b' });
  assert.deepStrictEqual(t.ls('imastery.sync'), { user: 'u1', dirty: false });
  assert.strictEqual(t.Auth.status(), 'synced');
});

test('second device: server and local progress are unioned, neither side lost', async () => {
  const t = setup({ session: sess('u1'), row: { done: { s1: 1, both: 1 }, last: 'srv' },
    local: { 'imastery.done': J({ l1: 1, both: 1 }), 'imastery.last': J('loc') } });
  await t.Auth.init();
  assert.deepStrictEqual(t.ls('imastery.done'), { s1: 1, both: 1, l1: 1 });
  assert.strictEqual(t.ls('imastery.last'), 'loc'); // untrusted local keeps its own last
  assert.deepStrictEqual(t.upserts()[0].body.done, { s1: 1, both: 1, l1: 1 }); // merged result goes back up
});

test('second device with no local last takes the server last', async () => {
  const t = setup({ session: sess('u1'), row: { done: { s1: 1 }, last: 'srv' }, local: { 'imastery.done': J({ l1: 1 }) } });
  await t.Auth.init();
  assert.strictEqual(t.ls('imastery.last'), 'srv');
});

test('trusted clean device: server state wins (a cleared item stays cleared)', async () => {
  const t = setup({ session: sess('u1'), row: { done: { s1: 1 }, last: 'srv' },
    local: { 'imastery.done': J({ s1: 1, old: 1 }), 'imastery.sync': J({ user: 'u1', dirty: false }) } });
  await t.Auth.init();
  assert.deepStrictEqual(t.ls('imastery.done'), { s1: 1 });
  assert.strictEqual(t.ls('imastery.last'), 'srv');
  assert.strictEqual(t.upserts().length, 0); // nothing to push
});

test('dirty local on the same user merges instead of being overwritten', async () => {
  const t = setup({ session: sess('u1'), row: { done: { s1: 1 }, last: 'srv' },
    local: { 'imastery.done': J({ s1: 1, offline: 1 }), 'imastery.sync': J({ user: 'u1', dirty: true }) } });
  await t.Auth.init();
  assert.deepStrictEqual(t.ls('imastery.done'), { s1: 1, offline: 1 });
  assert.deepStrictEqual(t.upserts()[0].body.done, { s1: 1, offline: 1 });
});

test('foreign user: local data of another account is never uploaded or kept', async () => {
  const t = setup({ session: sess('u2'), row: { done: { mine: 1 }, last: 'm' },
    local: { 'imastery.done': J({ theirs: 1 }), 'imastery.last': J('t'), 'imastery.sync': J({ user: 'u1', dirty: true }) } });
  await t.Auth.init();
  assert.deepStrictEqual(t.ls('imastery.done'), { mine: 1 });
  assert.strictEqual(t.ls('imastery.last'), 'm');
  assert.ok(t.upserts().every(u => u.body.user_id === 'u2' && !('theirs' in u.body.done)));
});

test('foreign user with no server row starts empty, does not inherit the other account', async () => {
  const t = setup({ session: sess('u2'), row: null,
    local: { 'imastery.done': J({ theirs: 1 }), 'imastery.last': J('t'), 'imastery.sync': J({ user: 'u1', dirty: false }) } });
  await t.Auth.init();
  assert.deepStrictEqual(t.ls('imastery.done'), {});
  assert.strictEqual(t.ls('imastery.last'), null);
  assert.ok(t.upserts().every(u => u.body.user_id === 'u2' && Object.keys(u.body.done).length === 0));
});

test('upsert always carries the signed-in user id, never a row id from the server', async () => {
  const t = setup({ session: sess('u1'), row: { user_id: 'someone-else', done: { x: 1 }, last: null }, local: { 'imastery.done': J({ y: 1 }) } });
  await t.Auth.init();
  assert.ok(t.upserts().length >= 1 && t.upserts().every(u => u.body.user_id === 'u1'));
});

test('changes while signed in are pushed once (debounced), dirty flag cleared', async () => {
  const t = setup({ session: sess('u1'), row: { done: {}, last: null } });
  await t.Auth.init();
  const before = t.upserts().length;
  t.store['imastery.done'] = J({ a: 1 });
  t.Auth.changed('done'); t.Auth.changed('done'); t.Auth.changed('done');
  assert.deepStrictEqual(t.ls('imastery.sync'), { user: 'u1', dirty: true });
  assert.strictEqual(t.Auth.status(), 'pending');
  assert.strictEqual(t.upserts().length, before); // not yet
  await new Promise(r => setTimeout(r, 1000));
  assert.strictEqual(t.upserts().length, before + 1); // one push for three changes
  assert.deepStrictEqual(t.ls('imastery.sync'), { user: 'u1', dirty: false });
  t.win.online && t.win.online(); await tick();
  assert.strictEqual(t.upserts().length, before + 1); // online event does not re-push a clean state
});

test('changes while signed out only mark an existing account dirty (not for kind "last")', async () => {
  const t = setup({ local: { 'imastery.sync': J({ user: 'u1', dirty: false }) } });
  t.Auth.changed('last');
  assert.strictEqual(t.ls('imastery.sync').dirty, false);
  t.Auth.changed('done');
  assert.deepStrictEqual(t.ls('imastery.sync'), { user: 'u1', dirty: true });
  const t2 = setup({});
  t2.Auth.changed('done');
  assert.strictEqual(t2.ls('imastery.sync'), undefined); // anonymous users get no sync flag
});

test('offline push (rejected request): local data kept, marked dirty, no throw, retried on "online"', async () => {
  const t = setup({ session: sess('u1'), row: { done: {}, last: null } });
  await t.Auth.init();
  t.state.throwNet = true;
  t.store['imastery.done'] = J({ a: 1 });
  await t.Auth.push();
  assert.deepStrictEqual(t.ls('imastery.done'), { a: 1 });
  assert.deepStrictEqual(t.ls('imastery.sync'), { user: 'u1', dirty: true });
  assert.strictEqual(t.Auth.status(), 'error');
  t.state.throwNet = false;
  const n = t.upserts().length;
  t.win.online(); await tick();
  assert.strictEqual(t.upserts().length, n + 1);
  assert.deepStrictEqual(t.state.row.done, { a: 1 });
  assert.deepStrictEqual(t.ls('imastery.sync'), { user: 'u1', dirty: false });
});

test('server error response on push also keeps data and marks dirty', async () => {
  const t = setup({ session: sess('u1'), row: { done: {}, last: null } });
  await t.Auth.init();
  t.state.fail = true;
  t.store['imastery.done'] = J({ a: 1 });
  await t.Auth.push();
  assert.deepStrictEqual(t.ls('imastery.done'), { a: 1 });
  assert.strictEqual(t.ls('imastery.sync').dirty, true);
  assert.strictEqual(t.Auth.status(), 'error');
});

test('offline pull (rejected or error): local data untouched, status error, no throw', async () => {
  for (const mode of ['throwNet', 'fail']) {
    const t = setup({ session: sess('u1'), row: { done: { s: 1 }, last: 's' }, local: { 'imastery.done': J({ l: 1 }), 'imastery.last': J('l') } });
    t.state[mode] = true;
    await t.Auth.init();
    assert.deepStrictEqual(t.ls('imastery.done'), { l: 1 });
    assert.strictEqual(t.ls('imastery.last'), 'l');
    assert.strictEqual(t.Auth.status(), 'error');
    assert.strictEqual(t.upserts().length, 0);
  }
});

test('sign out flushes pending changes, then clears sync, done and last but keeps play data', async () => {
  const t = setup({ session: sess('u1'), row: { done: {}, last: null },
    local: { 'imastery.play': J({ xp: 5 }), 'imastery.route': J('r') } });
  await t.Auth.init();
  t.store['imastery.done'] = J({ a: 1 });
  t.Auth.changed('done'); // timer pending
  await t.Auth.signOut();
  assert.deepStrictEqual(t.state.row.done, { a: 1 }); // flushed before removal
  assert.ok(t.calls.some(c => c.op === 'signOut'));
  ['imastery.sync', 'imastery.done', 'imastery.last'].forEach(k => assert.ok(!(k in t.store), k));
  assert.deepStrictEqual(t.ls('imastery.play'), { xp: 5 }); // privacy.html: only synced progress is removed
  assert.deepStrictEqual(t.ls('imastery.route'), 'r');
});

test('delete account clears sync, done, last and play from this device', async () => {
  const t = setup({ session: sess('u1'), row: { done: {}, last: null }, local: { 'imastery.play': J({ xp: 5 }), 'imastery.done': J({ a: 1 }) } });
  await t.Auth.init();
  await t.Auth.deleteAccount();
  assert.ok(t.calls.some(c => c.op === 'rpc' && c.n === 'delete_my_account'));
  ['imastery.sync', 'imastery.done', 'imastery.last', 'imastery.play'].forEach(k => assert.ok(!(k in t.store), k));
  assert.strictEqual(t.Auth.user(), null);
});

test('accounts off (no config): nothing is called', async () => {
  const t = setup({});
  t.Auth.enabled; // config present but no session: init pulls nothing
  await t.Auth.init();
  assert.strictEqual(t.calls.filter(c => c.op !== 'signOut').length, 0);
});

// Known issue probes: print findings, do not fail the run.
const findings = [];
test('sign out after a failed push retries it before clearing', async () => {
  const t = setup({ session: sess('u1'), row: { done: {}, last: null } });
  await t.Auth.init();
  t.state.throwNet = true;
  t.store['imastery.done'] = J({ a: 1 });
  await t.Auth.push(); // fails, dirty=true, no timer pending
  const n = t.upserts().length;
  t.state.throwNet = false;
  await t.Auth.signOut();
  assert(t.upserts().length === n + 1, 'sign-out must retry an unsaved push');
  assert.deepStrictEqual(t.upserts()[n].body.done, { a: 1 });
});

test('sign out keeps local progress and stays signed in when the final push fails', async () => {
  const t = setup({ session: sess('u1'), row: { done: {}, last: null } });
  await t.Auth.init();
  t.state.throwNet = true;
  t.store['imastery.done'] = J({ a: 1 });
  await t.Auth.push();
  let err = null;
  try { await t.Auth.signOut(); } catch (e) { err = e; }
  assert(err && /not saved/.test(err.message), 'sign-out must refuse while progress is unsaved');
  assert('imastery.done' in t.store, 'local progress must be kept');
});

(async () => {
  let fail = 0;
  for (const [n, f] of tests) {
    try { await f(); console.log('ok   ' + n); } catch (e) { fail++; console.log('FAIL ' + n + '\n     ' + (e && e.message)); }
  }
  findings.forEach(f => console.log('NOTE ' + f));
  console.log(fail ? fail + ' failed' : 'all ' + tests.length + ' passed');
  process.exit(fail ? 1 : 0);
})();
