/* Released Android app updates. Never install or reload without a user action. */
var AppUpdates = (function () {
  var API = 'https://api.github.com/repos/SHRENIKYD/DSA-LEARNINGS/releases?per_page=100';
  // Updates install through Google Play; GitHub is only used to learn that a new version exists.
  var PKG = 'io.github.shrenikyd.interviewmastery', PLAY_APP = 'market://details?id=' + PKG, PLAY_WEB = 'https://play.google.com/store/apps/details?id=' + PKG;
  var DAY = 86400000, lastCheck = 0, busy = false, pending = null, initialized = false, snoozed = {}, installed = '';
  function version(s) { var m = /^(?:app-v|v)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(String(s || '')); return m ? m.slice(1).map(Number) : null; }
  function newer(a, b) { a = version(a); b = version(b); if (!a || !b) return false; for (var i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] > b[i]; } return false; }
  function latest(rows, current) {
    if (!Array.isArray(rows) || !version(current)) return null;
    return rows.filter(function (r) {
      return r && !r.draft && !r.prerelease && /^app-v/.test(r.tag_name || '') && newer(r.tag_name, current) &&
        r.html_url === 'https://github.com/SHRENIKYD/DSA-LEARNINGS/releases/tag/' + r.tag_name &&
        Array.isArray(r.assets) && r.assets.some(function (a) { return a && /\.(apk|aab)$/i.test(a.name || ''); });
    }).sort(function (a, b) { return newer(a.tag_name, b.tag_name) ? -1 : newer(b.tag_name, a.tag_name) ? 1 : 0; })[0] || null;
  }
  function nativeAndroid() { var c = window.Capacitor; return !!(c && c.isNativePlatform && c.isNativePlatform() && c.getPlatform && c.getPlatform() === 'android'); }
  function plugin(name) { var c = window.Capacitor; return c && c.Plugins && c.Plugins[name]; }
  function message(text) { var n = document.getElementById('updateStatus'); if (n) n.textContent = text; }
  function snooze(tag) { var until = Date.now() + DAY; snoozed[tag] = until; try { localStorage.setItem('imastery.update.' + tag, String(until)); } catch (e) { } }
  function snoozeUntil(tag) { try { return Math.max(snoozed[tag] || 0, Number(localStorage.getItem('imastery.update.' + tag)) || 0); } catch (e) { return snoozed[tag] || 0; } }
  function safeToShow() { var tab = (location.hash || '#home').slice(1).split('/')[0], cel = document.getElementById('cel'); return !document.hidden && /^(home|map|world|passport|expedition|progress|play|badges|me)$/.test(tab) && (!cel || cel.hidden); }
  function show() {
    if (!pending || !safeToShow() || document.getElementById('appUpdateDialog')) return;
    var release = pending; pending = null;
    var previous = document.activeElement, modal = document.createElement('dialog'); modal.id = 'appUpdateDialog'; modal.className = 'update-dialog';
    modal.setAttribute('aria-labelledby', 'updateTitle'); modal.setAttribute('aria-describedby', 'updateDescription');
    modal.innerHTML = '<span class="kick">A fresh chapter</span><span class="update-icon" aria-hidden="true">↥</span><h2 id="updateTitle">New version available</h2><p id="updateDescription">Interview Mastery ' + release.tag_name.slice(5) + ' is ready. You’re using ' + installed + '.</p><p class="muted sm">Update from Google Play. If Play does not show it yet, the release is still rolling out, so try again a little later. Your current session stays open.</p><p id="updateOpenStatus" class="sm" role="status"></p><button class="b3" type="button" id="updateNow">UPDATE ON GOOGLE PLAY</button><button class="b3 ghost" type="button" id="updateLater">LATER</button>';
    document.body.appendChild(modal);
    function later() { snooze(release.tag_name); modal.close(); }
    modal.addEventListener('cancel', function (e) { e.preventDefault(); later(); });
    modal.addEventListener('close', function () { modal.remove(); if (previous && previous.isConnected && previous.focus) previous.focus(); });
    modal.querySelector('#updateLater').addEventListener('click', later);
    modal.querySelector('#updateNow').addEventListener('click', function () {
      var status = modal.querySelector('#updateOpenStatus'), button = modal.querySelector('#updateNow'); button.disabled = true;
      var done = function () { snooze(release.tag_name); modal.close(); };
      // market:// is handed to the Play Store app by the native shell. If the app is still in front shortly after,
      // there is no Play Store app, so open the Play listing in the browser instead.
      try { location.href = PLAY_APP; } catch (e) { }
      setTimeout(function () {
        if (document.hidden) { done(); return; }
        var b = plugin('Browser');
        if (!b || !b.open) { button.disabled = false; status.textContent = 'Google Play could not open. Please open the Play Store and search for Interview Mastery.'; return; }
        Promise.resolve().then(function () { return b.open({ url: PLAY_WEB }); }).then(done, function () { button.disabled = false; status.textContent = 'Could not open Google Play. Please try again.'; });
      }, 1200);
    });
    modal.showModal(); modal.querySelector('#updateNow').focus();
  }
  async function check(manual) {
    if (!nativeAndroid()) { if (manual) message('Automatic release checks are available in the Android app.'); return; }
    if (busy || (!manual && lastCheck && Date.now() - lastCheck < 21600000)) return;
    busy = true; message('Checking for updates…');
    var controller = new AbortController(), timeout = setTimeout(function () { controller.abort(); }, 8000);
    try {
      installed = window.IM_VERSION || ''; var app = plugin('App');
      if (app && app.getInfo) { try { var info = await app.getInfo(); if (version(info.version)) installed = info.version; } catch (e) { } }
      if (!version(installed)) throw new Error('Unknown installed version');
      var response = await fetch(API, { signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) throw new Error('Release check failed');
      var rows = await response.json(); if (!Array.isArray(rows)) throw new Error('Invalid release response');
      var release = latest(rows, installed); lastCheck = Date.now();
      message(release ? 'Version ' + release.tag_name.slice(5) + ' is available.' : 'You’re up to date.');
      if (release && (manual || Date.now() >= snoozeUntil(release.tag_name))) { pending = release; show(); }
    } catch (e) { if (manual) message('Could not check for updates. Check your connection and try again.'); }
    finally { clearTimeout(timeout); busy = false; }
  }
  function init() {
    if (initialized) return; initialized = true;
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#checkUpdates')) check(true); else show(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { check(false); show(); } });
    window.addEventListener('hashchange', function () { setTimeout(show, 0); });
    var app = plugin('App'); if (app && app.addListener) Promise.resolve(app.addListener('appStateChange', function (state) { if (state.isActive) { check(false); show(); } })).catch(function () { });
    check(false);
  }
  return { version: version, newer: newer, latest: latest, check: check, init: init, PLAY_APP: PLAY_APP, PLAY_WEB: PLAY_WEB };
})();
if (typeof module !== 'undefined') module.exports = AppUpdates;
