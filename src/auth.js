var Auth = (function () {
  var cfg = window.IM_CONFIG || {};
  var enabled = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase && window.supabase.createClient);
  var client = null;
  if (enabled) {
    try {
      client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: !window.IM_APP_HANDOFF, flowType: 'pkce' }
      });
    } catch (e) { enabled = false; }
  }
  var user = null, timer = null, status = 'idle', listeners = [], ready = null;

  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function emit(kind) { listeners.forEach(function (fn) { try { fn(kind); } catch (e) { } }); }
  function setStatus(s) { status = s; emit('status'); }
  function same(a, b) {
    var ka = Object.keys(a || {}), kb = Object.keys(b || {});
    if (ka.length !== kb.length) return false;
    for (var i = 0; i < ka.length; i++) if (!b[ka[i]]) return false;
    return true;
  }

  function pull() {
    if (!user) return Promise.resolve();
    setStatus('syncing');
    return client.from('progress').select('done,last').eq('user_id', user.id).maybeSingle().then(function (res) {
      if (res.error) { setStatus('error'); return; }
      var row = res.data, remote = (row && row.done) || {}, local = lsGet('imastery.done', {}) || {};
      var st = lsGet('imastery.sync', {}) || {}, trusted = st.user === user.id && !st.dirty, foreign = !!st.user && st.user !== user.id;
      var merged = trusted || foreign ? remote : Object.assign({}, remote, local);
      lsSet('imastery.done', merged);
      var localLast = lsGet('imastery.last', null);
      if (row && row.last && (trusted || foreign || !localLast)) lsSet('imastery.last', row.last);
      else if (foreign) lsSet('imastery.last', null);
      lsSet('imastery.sync', { user: user.id, dirty: false });
      emit('progress');
      if (!row || !same(merged, remote)) return push();
      setStatus('synced');
    }, function () { setStatus('error'); });
  }

  function push() {
    if (!user) return Promise.resolve();
    clearTimeout(timer); timer = null;
    setStatus('saving');
    var body = { user_id: user.id, done: lsGet('imastery.done', {}) || {}, last: lsGet('imastery.last', null) };
    return client.from('progress').upsert(body, { onConflict: 'user_id' }).then(function (res) {
      if (res.error) { lsSet('imastery.sync', { user: user.id, dirty: true }); setStatus('error'); return; }
      lsSet('imastery.sync', { user: user.id, dirty: false });
      setStatus('synced');
    }, function () { lsSet('imastery.sync', { user: user.id, dirty: true }); setStatus('error'); });
  }

  function changed(kind) {
    if (!user) {
      var st = lsGet('imastery.sync', {}) || {};
      if (st.user && kind !== 'last') lsSet('imastery.sync', { user: st.user, dirty: true });
      return;
    }
    lsSet('imastery.sync', { user: user.id, dirty: true });
    clearTimeout(timer);
    timer = setTimeout(push, 800);
    setStatus('pending');
  }

  function reset() {
    lsSet('imastery.done', {});
    return user ? push() : Promise.resolve();
  }

  // Permanently deletes the signed-in account and its progress (supabase/delete-account.sql), then clears this device.
  function deleteAccount() {
    if (!client || !user) return Promise.reject(new Error('Sign in first.'));
    clearTimeout(timer); timer = null;
    return client.rpc('delete_my_account').then(function (r) {
      if (r.error) throw new Error(r.error.message || 'Could not delete the account.');
      return client.auth.signOut({ scope: 'local' }).catch(function () { });
    }).then(function () {
      try { ['imastery.sync', 'imastery.done', 'imastery.last', 'imastery.play'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { }
      user = null; emit('user');
    });
  }

  function signOut() {
    if (!client) return Promise.resolve();
    var flush = timer ? push() : Promise.resolve();
    return flush.then(function () { return client.auth.signOut(); }).then(function () {
      try { ['imastery.sync', 'imastery.done', 'imastery.last'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { }
    });
  }

  function init() {
    if (ready) return ready;
    if (!enabled) { ready = Promise.resolve(null); return ready; }
    ready = client.auth.getSession().then(function (r) {
      user = r.data && r.data.session ? r.data.session.user : null;
      emit('user');
      return user ? pull().then(function () { return user; }) : user;
    }, function () { return null; });
    client.auth.onAuthStateChange(function (event, session) {
      var u = session ? session.user : null;
      if (event === 'PASSWORD_RECOVERY') emit('recovery');
      if ((u && u.id) === (user && user.id)) return;
      user = u;
      emit('user');
      if (user) pull();
    });
    window.addEventListener('online', function () { var st = lsGet('imastery.sync', {}) || {}; if (user && st.dirty) push(); });
    return ready;
  }

  var esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var LABEL = { idle: '', syncing: 'Syncing…', pending: 'Saving…', saving: 'Saving…', synced: 'Progress synced', error: 'Not synced — will retry' };
  function loginHref() {
    var here = location.pathname.split('/').pop() + location.search + location.hash;
    return 'login.html?next=' + encodeURIComponent(here || 'index.html');
  }
  function mountAccount(el) {
    if (!el) return;
    if (!enabled) { el.hidden = true; return; }
    var draw = function () {
      el.hidden = false;
      if (!user) {
        el.innerHTML = '<a class="btn acct-in" href="' + esc(loginHref()) + '"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>Sign in to sync progress</a>';
        return;
      }
      var meta = user.user_metadata || {}, pic = meta.avatar_url || meta.picture || '';
      var initial = esc((user.email || '?').charAt(0).toUpperCase());
      var av = /^https:\/\/[^\s"'<>]+$/.test(pic) ? '<img src="' + esc(pic) + '" alt="" referrerpolicy="no-referrer">' : initial;
      el.innerHTML = '<div class="acct"><span class="acct-av" aria-hidden="true">' + av + '</span>' +
        '<div class="acct-tx"><div class="acct-em">' + esc(user.email || 'Signed in') + '</div><div class="acct-st ' + esc(status) + '" aria-live="polite">' + esc(LABEL[status] || '') + '</div></div>' +
        '<button class="btn ghost acct-out" type="button">Sign out</button></div>';
      var img = el.querySelector('.acct-av img');
      if (img) img.addEventListener('error', function () { if (img.parentNode) img.parentNode.textContent = (user.email || '?').charAt(0).toUpperCase(); });
      el.querySelector('.acct-out').addEventListener('click', function () { signOut().then(function () { location.reload(); }); });
    };
    listeners.push(function (k) { if (k === 'user' || k === 'status') draw(); });
    draw();
  }

  return {
    enabled: enabled, client: client, init: init, pull: pull, push: push, changed: changed, reset: reset, signOut: signOut, deleteAccount: deleteAccount, mountAccount: mountAccount,
    user: function () { return user; }, status: function () { return status; },
    on: function (fn) { listeners.push(fn); }
  };
})();
