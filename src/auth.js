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
  var user = null, timer = null, status = 'idle', listeners = [], ready = null, noPrefs = false;

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
    return client.from('progress').select(noPrefs ? 'done,last' : 'done,last,prefs').eq('user_id', user.id).maybeSingle().then(function (res) {
      if (res.error && !noPrefs && prefsMissing(res.error)) { noPrefs = true; return pull(); }
      if (res.error) { setStatus('error'); return; }
      var row = res.data, remote = (row && row.done) || {}, local = lsGet('imastery.done', {}) || {};
      var st = lsGet('imastery.sync', {}) || {}, trusted = st.user === user.id && !st.dirty, foreign = !!st.user && st.user !== user.id;
      var merged = trusted || foreign ? remote : Object.assign({}, remote, local);
      lsSet('imastery.done', merged);
      var localLast = lsGet('imastery.last', null);
      if (row && row.last && (trusted || foreign || !localLast)) lsSet('imastery.last', row.last);
      else if (foreign) lsSet('imastery.last', null);
      lsSet('imastery.sync', { user: user.id, dirty: false });
      var prefsNewer = mergePrefs(row && row.prefs, foreign);
      emit('progress');
      if (!row || !same(merged, remote) || prefsNewer) return push();
      setStatus('synced');
    }, function () { setStatus('error'); });
  }

  /* Route preference (imastery.route): last write wins by updatedAt; offline the local copy is used as is.
     Returns true when the local copy is newer than the server one, so it should be pushed. */
  function mergePrefs(remote, foreign) {
    var local = lsGet('imastery.route', null);
    var lt = local && typeof local === 'object' ? (+local.updatedAt || 0) : -1;
    var rt = remote && typeof remote === 'object' ? (+remote.updatedAt || 0) : -1;
    if (rt >= 0 && (rt > lt || foreign)) {
      lsSet('imastery.route', remote);
      if (remote.lang) lsSet('imastery.lang', remote.lang);
      if (window.Learn && window.Learn.prefChanged) window.Learn.prefChanged();
      return false;
    }
    return !noPrefs && lt > rt;
  }
  function prefsMissing(err) { return /prefs/i.test(String((err && (err.message || err.details)) || '')); }

  function push() {
    if (!user) return Promise.resolve();
    clearTimeout(timer); timer = null;
    setStatus('saving');
    var body = { user_id: user.id, done: lsGet('imastery.done', {}) || {}, last: lsGet('imastery.last', null) };
    var pr = lsGet('imastery.route', null);
    if (!noPrefs && pr && typeof pr === 'object') body.prefs = pr;
    return client.from('progress').upsert(body, { onConflict: 'user_id' }).then(function (res) {
      if (res.error && body.prefs && prefsMissing(res.error)) { noPrefs = true; return push(); }
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

  // "Download my data": everything we hold about this person. Signed in: the server copy is fetched fresh; the local copy is always included.
  // If the server cannot be reached the local data is still returned, with a note in server.error.
  function exportData() {
    var out = {
      app: 'Interview Mastery', version: String(window.IM_VERSION || cfg.version || ''), exportedAt: new Date().toISOString(),
      account: user ? { id: user.id, email: user.email || null } : null,
      local: { done: lsGet('imastery.done', {}) || {}, last: lsGet('imastery.last', null), play: lsGet('imastery.play', null), prefs: lsGet('imastery.route', null) },
      server: null
    };
    if (!user || !client) return Promise.resolve(out);
    var uid = user.id;
    return client.from('progress').select(noPrefs ? 'done,last' : 'done,last,prefs').eq('user_id', uid).maybeSingle().then(function (res) {
      if (res.error) out.server = { error: 'Could not read your saved progress from the server: ' + (res.error.message || 'unknown error') + '. Only the data on this device is included.' };
      else out.server = { found: !!res.data, user_id: uid, done: (res.data && res.data.done) || {}, last: res.data ? res.data.last : null, prefs: (res.data && res.data.prefs) || null };
      return out;
    }, function () {
      out.server = { error: 'Could not reach the server. Only the data on this device is included.' };
      return out;
    });
  }
  function exportName() { return 'interview-mastery-data-' + new Date().toISOString().slice(0, 10) + '.json'; }
  // Browsers get a file download. The Android WebView ignores blob downloads (no DownloadListener), so the app gets the text to show and copy instead.
  function downloadData(onText) {
    return exportData().then(function (data) {
      var text = JSON.stringify(data, null, 2), name = exportName(), C = window.Capacitor;
      if (C && C.isNativePlatform && C.isNativePlatform()) { onText(text, name); return data; }
      var url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return data;
    });
  }

  // Sign-out removes progress from this device, so first send anything not yet saved; if that fails, keep everything and stay signed in.
  function signOut() {
    if (!client) return Promise.resolve();
    var st = lsGet('imastery.sync', {}) || {};
    var flush = (timer || (user && st.user === user.id && st.dirty)) ? push() : Promise.resolve();
    return flush.then(function () {
      var after = lsGet('imastery.sync', {}) || {};
      if (user && after.user === user.id && after.dirty) throw new Error('Your latest progress is not saved yet. Connect to the internet and try again, so it is not lost.');
      return client.auth.signOut();
    }).then(function () {
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

  /* ---------- profile photo ---------- */
  // A small JPEG data URL (at most 40 KB) kept on this device and, when signed in, in the account's user metadata so every device shows it.
  var AV_KEY = 'imastery.avatar', AV_MAX = 40 * 1024;
  function okData(u) { return typeof u === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u) && u.length <= AV_MAX * 1.4; }
  function avatarSrc() {
    var meta = user ? (user.user_metadata || {}) : {};
    if (okData(meta.avatar_data)) return meta.avatar_data;
    var local = null; try { local = localStorage.getItem(AV_KEY); } catch (e) { }
    if (okData(local)) return local;
    var pic = meta.avatar_url || meta.picture || '';
    return /^https:\/\/[^\s"'<>]+$/.test(pic) ? pic : '';
  }
  function avatarHtml(fallback) {
    var src = avatarSrc();
    if (src) return '<img src="' + esc(src) + '" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode(this.getAttribute(\'data-i\')))" data-i="' + esc(user ? (user.email || '?').charAt(0).toUpperCase() : '') + '">';
    if (user) return esc((user.email || '?').charAt(0).toUpperCase());
    return fallback || '';
  }
  function shrink(file) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type)) return rej(new Error('Choose an image file (JPG, PNG or WebP).'));
      if (file.size > 12 * 1024 * 1024) return rej(new Error('That image is over 12 MB. Pick a smaller one.'));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var side = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas'); c.width = c.height = 160;
        c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 160, 160);
        var q = 0.85, out = c.toDataURL('image/jpeg', q);
        while (out.length > AV_MAX && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
        if (out.length > AV_MAX) return rej(new Error('Could not shrink that image enough. Try a simpler one.'));
        res(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('That file could not be read as an image.')); };
      img.src = url;
    });
  }
  function saveAvatar(data) {
    try { if (data) localStorage.setItem(AV_KEY, data); else localStorage.removeItem(AV_KEY); } catch (e) { }
    if (user) {
      user.user_metadata = Object.assign({}, user.user_metadata || {}, { avatar_data: data || null });
      emit('user');
      if (client) return client.auth.updateUser({ data: { avatar_data: data || null } }).then(function (r) { if (r && r.error) throw r.error; });
    }
    emit('user');
    return Promise.resolve();
  }
  function setAvatar(file) { return shrink(file).then(saveAvatar); }
  function clearAvatar() { return saveAvatar(null); }

  function mountAccount(el) {
    if (!el) return;
    if (!enabled) { el.hidden = true; return; }
    var draw = function () {
      el.hidden = false;
      if (!user) {
        el.innerHTML = '<a class="btn acct-in" href="' + esc(loginHref()) + '"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>Sign in to sync progress</a>';
        return;
      }
      el.innerHTML = '<div class="acct"><span class="acct-av" aria-hidden="true">' + avatarHtml() + '</span>' +
        '<div class="acct-tx"><div class="acct-em">' + esc(user.email || 'Signed in') + '</div><div class="acct-st ' + esc(status) + '" aria-live="polite">' + esc(LABEL[status] || '') + '</div></div>' +
        '<button class="btn ghost acct-out" type="button">Sign out</button></div>';
      el.querySelector('.acct-out').addEventListener('click', function () { signOut().then(function () { location.reload(); }, function (e) { alert(e.message); }); });
    };
    listeners.push(function (k) { if (k === 'user' || k === 'status') draw(); });
    draw();
  }

  return {
    enabled: enabled, client: client, init: init, pull: pull, push: push, changed: changed, reset: reset, signOut: signOut, deleteAccount: deleteAccount, exportData: exportData, downloadData: downloadData, mountAccount: mountAccount, avatarSrc: avatarSrc, avatarHtml: avatarHtml, setAvatar: setAvatar, clearAvatar: clearAvatar,
    user: function () { return user; }, status: function () { return status; },
    on: function (fn) { listeners.push(fn); }
  };
})();
