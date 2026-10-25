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
  var user = null, timer = null, status = 'idle', listeners = [], ready = null, noPrefs = false, noPlay = false;

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
  // Columns to read: prefs (0004) and play (0005) are skipped once the server has said it does not have them.
  function cols() { return 'done,last' + (noPrefs ? '' : ',prefs') + (noPlay ? '' : ',play'); }

  function pull() {
    if (!user) return Promise.resolve();
    setStatus('syncing');
    return client.from('progress').select(cols()).eq('user_id', user.id).maybeSingle().then(function (res) {
      if (res.error && !noPrefs && prefsMissing(res.error)) { noPrefs = true; return pull(); }
      if (res.error && !noPlay && playMissing(res.error)) { noPlay = true; return pull(); }
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
      var playNewer = mergePlay(row && row.play, foreign);
      emit('progress');
      if (!row || !same(merged, remote) || prefsNewer || playNewer) return push();
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
  function playMissing(err) { return /\bplay\b/i.test(String((err && (err.message || err.details)) || '')); }

  /* ---------- play layer (progress.play, migration 0005) ----------
     One blob per account: { play, review, days, updatedAt }
       play   = imastery.play without the device settings (sound, haptics, motion, bit, tts stay on this device)
       review = imastery.review (spaced-review queue), days = imastery.days (activity days, last 60)
     imastery.playmeta = { updatedAt, sig } remembers when the local copy last changed (sig = canonical JSON of the blob).
     Two devices can both play, so pulling merges instead of last-write-wins; see mergeBlob and docs/DATABASE.md. */
  var DEVICE_SETTINGS = { sound: 1, haptics: 1, motion: 1, bit: 1, tts: 1 }, DAYS_KEEP = 60, REVIEW_KEEP = 300;
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (isObj(v)) return '{' + Object.keys(v).sort().map(function (k) { return v[k] === undefined ? '' : JSON.stringify(k) + ':' + canon(v[k]); }).filter(Boolean).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
  }
  function syncedSettings(s) { var out = {}; Object.keys(isObj(s) ? s : {}).forEach(function (k) { if (!DEVICE_SETTINGS[k]) out[k] = s[k]; }); return out; }
  function deviceSettings(s) { var out = {}; Object.keys(isObj(s) ? s : {}).forEach(function (k) { if (DEVICE_SETTINGS[k]) out[k] = s[k]; }); return out; }
  function cleanDays(d) {
    var seen = {}, out = [];
    (Array.isArray(d) ? d : []).forEach(function (x) { if (typeof x === 'string' && /^\d{4}-\d\d-\d\d$/.test(x) && !seen[x]) { seen[x] = 1; out.push(x); } });
    return out.sort().slice(-DAYS_KEEP);
  }
  function cleanReview(r) {
    return (Array.isArray(r) ? r : []).filter(function (x) { return isObj(x) && typeof x.id === 'string'; }).sort(function (a, b) { return (+a.due || 0) - (+b.due || 0); }).slice(0, REVIEW_KEEP);
  }
  // The local copy as a blob without updatedAt, or null when this device has no play data at all.
  function localBlob() {
    var p = lsGet('imastery.play', null), review = cleanReview(lsGet('imastery.review', [])), days = cleanDays(lsGet('imastery.days', []));
    var play = null;
    if (isObj(p)) { play = {}; Object.keys(p).forEach(function (k) { if (k !== 'settings') play[k] = p[k]; }); play.settings = syncedSettings(p.settings); }
    if (!play && !review.length && !days.length) return null;
    return { play: play || {}, review: review, days: days };
  }
  function playSig(b) { b = b || localBlob(); return b ? canon({ play: b.play, review: b.review, days: b.days }) : ''; }
  function playMeta() { var m = lsGet('imastery.playmeta', null); return isObj(m) ? m : {}; }
  // Stamps imastery.playmeta when the local play data differs from what was last stamped. Returns true when it changed.
  function stampPlay() {
    var sig = playSig(), m = playMeta();
    if (sig === (m.sig || '')) return false;
    lsSet('imastery.playmeta', { updatedAt: Date.now(), sig: sig });
    return true;
  }
  function validBlob(b) { return isObj(b) && (isObj(b.play) || Array.isArray(b.review) || Array.isArray(b.days)) ? { play: isObj(b.play) ? b.play : {}, review: cleanReview(b.review), days: cleanDays(b.days), updatedAt: +b.updatedAt || 0 } : null; }
  function maxNum(a, b) { a = +a || 0; b = +b || 0; return a > b ? a : b; }
  // Merge rule (both inputs are blobs; n is the one with the later updatedAt, o the other):
  //   xp bonus = max; game wins = per game max of wins and latest timestamp; day records (quests) = newer blob's record per day, union of days;
  //   claimed quests = union per day; seen items = union; synced settings and other scalars = newer blob (older fills gaps);
  //   activity days = union (sorted, last 60); review queue = union by section id keeping the later due; updatedAt = max.
  function mergeBlob(a, b) {
    var n = (+a.updatedAt || 0) >= (+b.updatedAt || 0) ? a : b, o = n === a ? b : a, np = n.play || {}, op = o.play || {};
    var play = {};
    Object.keys(op).forEach(function (k) { play[k] = op[k]; });
    Object.keys(np).forEach(function (k) { if (np[k] !== undefined && np[k] !== null) play[k] = np[k]; });
    play.bonus = maxNum(np.bonus, op.bonus);
    var games = {};
    [op.games, np.games].forEach(function (g) {
      Object.keys(isObj(g) ? g : {}).forEach(function (id) {
        var x = isObj(g[id]) ? g[id] : {}, cur = games[id] || (games[id] = { wins: 0 });
        cur.wins = maxNum(cur.wins, x.wins);
        var at = maxNum(cur.at, x.at); if (at) cur.at = at;
      });
    });
    play.games = games;
    var days = {};
    Object.keys(isObj(op.days) ? op.days : {}).forEach(function (k) { days[k] = op.days[k]; });
    Object.keys(isObj(np.days) ? np.days : {}).forEach(function (k) { days[k] = np.days[k]; });
    play.days = days;
    var claimed = {};
    [op.claimed, np.claimed].forEach(function (c) {
      Object.keys(isObj(c) ? c : {}).forEach(function (k) { var d = claimed[k] || (claimed[k] = {}); Object.keys(isObj(c[k]) ? c[k] : {}).forEach(function (q) { if (c[k][q]) d[q] = 1; }); });
    });
    play.claimed = claimed;
    if (isObj(np.seen) || isObj(op.seen)) {
      var seen = {};
      [op.seen, np.seen].forEach(function (s) { Object.keys(isObj(s) ? s : {}).forEach(function (id) { if (s[id]) seen[id] = 1; }); });
      play.seen = seen;
    }
    play.settings = syncedSettings(np.settings);
    var byId = {};
    [o.review, n.review].forEach(function (r) { (r || []).forEach(function (x) { var cur = byId[x.id]; if (!cur || (+x.due || 0) > (+cur.due || 0)) byId[x.id] = x; }); });
    var review = cleanReview(Object.keys(byId).map(function (k) { return byId[k]; }));
    return { play: play, review: review, days: cleanDays((a.days || []).concat(b.days || [])), updatedAt: maxNum(a.updatedAt, b.updatedAt) };
  }
  function writeBlob(b) {
    var cur = lsGet('imastery.play', null), dev = deviceSettings(isObj(cur) ? cur.settings : null);
    var play = {};
    Object.keys(b.play || {}).forEach(function (k) { play[k] = b.play[k]; });
    play.settings = Object.assign({}, syncedSettings(b.play && b.play.settings), dev);
    lsSet('imastery.play', play);
    lsSet('imastery.review', b.review || []);
    lsSet('imastery.days', b.days || []);
    lsSet('imastery.playmeta', { updatedAt: +b.updatedAt || 0, sig: playSig({ play: b.play, review: b.review, days: b.days }) });
  }
  // Returns true when the merged result differs from the server copy, so it should be pushed.
  function mergePlay(remote, foreign) {
    var R = validBlob(remote), L = localBlob();
    if (foreign) {
      if (R) writeBlob(R);
      else { ['imastery.play', 'imastery.review', 'imastery.days', 'imastery.playmeta'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) { } }); }
      return false;
    }
    if (!R) { if (L) stampPlay(); return !noPlay && !!L; }
    if (!L) { writeBlob(R); return false; }
    stampPlay();
    L.updatedAt = +playMeta().updatedAt || 0;
    var M = mergeBlob(L, R);
    writeBlob(M);
    return !noPlay && playSig(M) !== playSig(R);
  }
  function playBody() {
    var L = localBlob();
    if (!L) return null;
    stampPlay();
    return { play: L.play, review: L.review, days: L.days, updatedAt: +playMeta().updatedAt || Date.now() };
  }

  function push() {
    if (!user) return Promise.resolve();
    clearTimeout(timer); timer = null;
    setStatus('saving');
    var body = { user_id: user.id, done: lsGet('imastery.done', {}) || {}, last: lsGet('imastery.last', null) };
    var pr = lsGet('imastery.route', null);
    if (!noPrefs && pr && typeof pr === 'object') body.prefs = pr;
    var pb = noPlay ? null : playBody();
    if (pb) body.play = pb;
    return client.from('progress').upsert(body, { onConflict: 'user_id' }).then(function (res) {
      if (res.error && body.prefs && prefsMissing(res.error)) { noPrefs = true; return push(); }
      if (res.error && body.play && playMissing(res.error)) { noPlay = true; return push(); }
      if (res.error) { lsSet('imastery.sync', { user: user.id, dirty: true }); setStatus('error'); return; }
      lsSet('imastery.sync', { user: user.id, dirty: false });
      setStatus('synced');
    }, function () { lsSet('imastery.sync', { user: user.id, dirty: true }); setStatus('error'); });
  }

  function changed(kind) {
    // Play data is saved on every screen; only a real change (new signature) marks the account dirty.
    if (kind === 'play' && !stampPlay()) return;
    if (kind !== 'play') stampPlay();
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
      try { ['imastery.sync', 'imastery.done', 'imastery.last', 'imastery.play', 'imastery.review', 'imastery.days', 'imastery.playmeta'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { }
      user = null; emit('user');
    });
  }

  // "Download my data": everything we hold about this person. Signed in: the server copy is fetched fresh; the local copy is always included.
  // If the server cannot be reached the local data is still returned, with a note in server.error.
  function exportData() {
    var out = {
      app: 'Interview Mastery', version: String(window.IM_VERSION || cfg.version || ''), exportedAt: new Date().toISOString(),
      account: user ? { id: user.id, email: user.email || null } : null,
      local: { done: lsGet('imastery.done', {}) || {}, last: lsGet('imastery.last', null), play: lsGet('imastery.play', null), review: lsGet('imastery.review', []), days: lsGet('imastery.days', []), prefs: lsGet('imastery.route', null) },
      server: null
    };
    if (!user || !client) return Promise.resolve(out);
    var uid = user.id;
    return client.from('progress').select(cols()).eq('user_id', uid).maybeSingle().then(function (res) {
      if (res.error) out.server = { error: 'Could not read your saved progress from the server: ' + (res.error.message || 'unknown error') + '. Only the data on this device is included.' };
      else out.server = { found: !!res.data, user_id: uid, done: (res.data && res.data.done) || {}, last: res.data ? res.data.last : null, prefs: (res.data && res.data.prefs) || null, play: (res.data && res.data.play) || null };
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

  // Sign-out removes progress and play data from this device, so first send anything not yet saved; if that fails, keep everything and stay signed in.
  function signOut() {
    if (!client) return Promise.resolve();
    var st = lsGet('imastery.sync', {}) || {};
    var playDirty = user && !noPlay && stampPlay();
    var flush = (timer || playDirty || (user && st.user === user.id && st.dirty)) ? push() : Promise.resolve();
    return flush.then(function () {
      var after = lsGet('imastery.sync', {}) || {};
      if (user && after.user === user.id && after.dirty) throw new Error('Your latest progress is not saved yet. Connect to the internet and try again, so it is not lost.');
      return client.auth.signOut();
    }).then(function () {
      try { ['imastery.sync', 'imastery.done', 'imastery.last', 'imastery.play', 'imastery.review', 'imastery.days', 'imastery.playmeta'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { }
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
    if (src) return '<img src="' + esc(src) + '" alt="' + esc(user ? (user.email || '?').charAt(0).toUpperCase() : '') + '" referrerpolicy="no-referrer">';
    if (user) return esc((user.email || '?').charAt(0).toUpperCase());
    return fallback || '';
  }
  // Crop before compression so camera and gallery uploads share the same editor.
  function cropAvatar(img) {
    return new Promise(function (resolve, reject) {
      var d = document.createElement('dialog'), previous = document.activeElement;
      d.setAttribute('aria-label', 'Crop profile photo');
      d.style.cssText = 'width:min(360px,calc(100% - 32px));max-height:85vh;overflow:auto;border:1px solid var(--border2);border-radius:20px;padding:20px;background:var(--panel);color:var(--text)';
      d.innerHTML = '<h2 style="margin:0 0 12px">Crop profile photo</h2><canvas width="320" height="320" style="display:block;width:100%;border-radius:50%;background:#fff" aria-label="Circular profile photo preview"></canvas><p>Adjust your photo, then save.</p>' +
        '<label style="display:block">Zoom<input type="range" min="1" max="4" step="0.01" value="1" style="width:100%"></label>' +
        '<label style="display:block">Horizontal position<input type="range" min="0" max="100" value="50" style="width:100%"></label>' +
        '<label style="display:block">Vertical position<input type="range" min="0" max="100" value="50" style="width:100%"></label>' +
        '<div style="display:flex;gap:12px;margin-top:16px"><button type="button" class="btn b3 ghost" data-cancel>Cancel</button><button type="button" class="btn b3 primary" data-save>Save photo</button></div>';
      var canvas = d.querySelector('canvas'), ctx = canvas.getContext('2d'), sliders = d.querySelectorAll('input'), area;
      function draw() {
        var side = Math.min(img.naturalWidth, img.naturalHeight) / Number(sliders[0].value);
        area = { x: (img.naturalWidth - side) * Number(sliders[1].value) / 100, y: (img.naturalHeight - side) * Number(sliders[2].value) / 100, side: side };
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 320, 320);
        ctx.drawImage(img, area.x, area.y, side, side, 0, 0, 320, 320);
      }
      function finish(value) { d.close(); d.remove(); if (previous && previous.isConnected) previous.focus(); resolve(value); }
      Array.prototype.forEach.call(sliders, function (input) { input.addEventListener('input', draw); });
      d.querySelector('[data-cancel]').onclick = function () { finish(null); };
      d.addEventListener('cancel', function (e) { e.preventDefault(); finish(null); });
      d.querySelector('[data-save]').onclick = function () { finish(area); };
      document.body.appendChild(d);
      try { draw(); d.showModal(); } catch (e) { d.remove(); reject(new Error('Could not open the photo editor.')); }
    });
  }
  function shrink(file) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type)) return rej(new Error('Choose an image file (JPG, PNG or WebP).'));
      if (file.size > 12 * 1024 * 1024) return rej(new Error('That image is over 12 MB. Pick a smaller one.'));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        cropAvatar(img).then(function (area) {
          if (!area) { res(null); return; }
          try {
            var c = document.createElement('canvas'); c.width = c.height = 160;
            var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 160, 160);
            ctx.drawImage(img, area.x, area.y, area.side, area.side, 0, 0, 160, 160);
            var q = 0.85, out = c.toDataURL('image/jpeg', q);
            while (out.length > AV_MAX && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
            if (out.length > AV_MAX) throw new Error('Could not shrink that image enough. Try a simpler one.');
            res(out);
          } catch (e) { rej(e); }
        }, rej);
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
  function setAvatar(file) { return shrink(file).then(function (data) { if (data) return saveAvatar(data); }); }
  // WhatsApp-style "Profile picture" sheet: Camera, Gallery, and a trash button when a photo is set. Resolves after the change.
  function avatarSheet(onChange) {
    var old = document.getElementById('avSheet'); if (old) old.remove();
    var has = !!avatarSrc();
    var el = document.createElement('div'); el.id = 'avSheet'; el.className = 'avsheet';
    el.innerHTML = '<div class="avsheet-bg"></div><div class="avsheet-box" role="dialog" aria-modal="true" aria-labelledby="avSheetT">' +
      '<span class="avsheet-grip" aria-hidden="true"></span><div class="avsheet-head"><button type="button" class="avsheet-x" aria-label="Close">&#x2715;</button><h2 id="avSheetT">Profile picture</h2>' +
      (has ? '<button type="button" class="avsheet-rm" aria-label="Remove photo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>' : '<span class="avsheet-sp"></span>') + '</div>' +
      '<label class="avsheet-row"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg><span>Camera</span><input type="file" accept="image/*" capture="user" hidden></label>' +
      '<label class="avsheet-row"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/></svg><span>Gallery</span><input type="file" accept="image/*" hidden></label>' +
      '<p class="avsheet-msg" role="status"></p></div>';
    document.body.appendChild(el);
    var msg = el.querySelector('.avsheet-msg'), prev = document.activeElement;
    function close() { el.remove(); document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus(); }
    function key(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', key);
    el.querySelector('.avsheet-bg').addEventListener('click', close);
    el.querySelector('.avsheet-x').addEventListener('click', close);
    var rm = el.querySelector('.avsheet-rm');
    if (rm) rm.addEventListener('click', function () { msg.textContent = 'Removing…'; clearAvatar().then(function () { close(); if (onChange) onChange(); }, function (e) { msg.textContent = e.message || 'Could not remove the photo.'; }); });
    Array.prototype.forEach.call(el.querySelectorAll('input[type=file]'), function (inp) {
      inp.addEventListener('change', function () { var f = inp.files && inp.files[0]; if (!f) return; msg.textContent = 'Saving photo…';
        setAvatar(f).then(function () { close(); if (onChange) onChange(); }, function (e) { msg.textContent = e.message || 'Could not save the photo.'; }); });
    });
    el.querySelector('.avsheet-x').focus();
  }

  function clearAvatar() { return saveAvatar(null); }


  // Sync status as an icon: cloud with a tick (synced), arrows (syncing or saving), warning (error), empty cloud (idle).
  function syncIcon(st, cls) {
    st = st || status;
    var ok = '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4 4 0 0 1 0 9H7z"/><path d="M9 13.5l2 2 4-4"/>';
    var busy = '<path d="M20 11a8 8 0 0 0-14.5-4.5M4 13a8 8 0 0 0 14.5 4.5"/><path d="M20 4v7h-7M4 20v-7h7"/>';
    var bad = '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.5"/>';
    var idle = '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4 4 0 0 1 0 9H7z"/>';
    var d = st === 'synced' ? ok : st === 'error' ? bad : st === 'idle' ? idle : busy;
    return '<span class="' + (cls || 'syncic') + ' ' + esc(st) + '" role="img" aria-label="' + esc(LABEL[st] || 'Sync') + '" title="' + esc(LABEL[st] || 'Sync') + '"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg></span>';
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
      el.innerHTML = '<div class="acct"><span class="acct-av" aria-hidden="true">' + avatarHtml() + '</span>' +
        '<div class="acct-tx"><div class="acct-em">' + esc(user.email || 'Signed in') + '</div></div>' + syncIcon(status) +
        '<button class="btn ghost acct-out" type="button">Sign out</button></div>';
      el.querySelector('.acct-out').addEventListener('click', function () { signOut().then(function () { location.reload(); }, function (e) { alert(e.message); }); });
    };
    listeners.push(function (k) { if (k === 'user' || k === 'status') draw(); });
    draw();
  }

  return {
    enabled: enabled, client: client, init: init, pull: pull, push: push, changed: changed, reset: reset, signOut: signOut, deleteAccount: deleteAccount, exportData: exportData, downloadData: downloadData, mountAccount: mountAccount, avatarSrc: avatarSrc, avatarHtml: avatarHtml, setAvatar: setAvatar, clearAvatar: clearAvatar, avatarSheet: avatarSheet, syncIcon: syncIcon,
    user: function () { return user; }, status: function () { return status; },
    on: function (fn) { listeners.push(fn); }
  };
})();
