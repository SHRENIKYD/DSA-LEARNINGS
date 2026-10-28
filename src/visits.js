// Private visit statistics (supabase/migrations/0006_visits.sql). Sends one small record per page and day:
// a random visitor id kept in this browser, the page name, web or app, and the device class, OS and browser family.
// No account id, email, IP or full user-agent is sent. Off when Supabase is not configured, when offline, when the
// browser asks not to be tracked (Do Not Track / Global Privacy Control), or when localStorage 'imastery.noStats' is '1'.
(function () {
  var cfg = window.IM_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseKey) return;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function off() {
    if (get('imastery.noStats') === '1') return true;
    try { if (navigator.onLine === false) return true; } catch (e) { }
    try { if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1') return true; } catch (e) { }
    return false;
  }
  function uuid() {
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { }
    var b = new Uint8Array(16); try { crypto.getRandomValues(b); } catch (e) { for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256); }
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function visitor() {
    var v = get('imastery.vid');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v || '')) { v = uuid(); set('imastery.vid', v); }
    return v;
  }
  var native = false;
  try { native = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()); } catch (e) { }
  // Coarse device facts only: classes, never the raw user-agent string.
  function device(ua) {
    var w = Math.min(screen.width || 0, screen.height || 0) || window.innerWidth || 0;
    if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'tablet';
    if (/Mobi|iPhone|iPod|Android/i.test(ua) || (w && w < 600)) return 'mobile';
    return 'desktop';
  }
  function os(ua) {
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'iOS';
    if (/CrOS/i.test(ua)) return 'ChromeOS';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Other';
  }
  function browser(ua) {
    if (native) return 'App';
    if (/SamsungBrowser/i.test(ua)) return 'Samsung';
    if (/Edg\//i.test(ua)) return 'Edge';
    if (/OPR\/|Opera/i.test(ua)) return 'Opera';
    if (/Firefox|FxiOS/i.test(ua)) return 'Firefox';
    if (/Chrome|CriOS/i.test(ua)) return 'Chrome';
    if (/Safari/i.test(ua)) return 'Safari';
    return 'Other';
  }
  // Page name: the file plus the first part of the hash for the app's screens (index.html#home, dsa.html), lowercase,
  // safe characters only, at most 60.
  function page() {
    var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var hash = native ? (location.hash || '').replace(/^#\/?/, '').split(/[\/?&]/)[0] : '';
    var p = (file + (hash ? '#' + hash : '')).replace(/[^a-z0-9._\/#-]/g, '').slice(0, 60);
    return p || 'index.html';
  }
  // Signed-in visitors send their own session token so the row records signed_in; everyone else the publishable key.
  function bearer() {
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^sb-.*-auth-token$/.test(k)) { var t = JSON.parse(localStorage.getItem(k)); if (t && t.access_token && (!t.expires_at || t.expires_at * 1000 > Date.now())) return t.access_token; } } } catch (e) { }
    return cfg.supabaseKey;
  }
  var sent = {};
  function log() {
    try {
      if (off()) return;
      var p = page(), day = new Date().toISOString().slice(0, 10), key = day + '|' + p;
      if (sent[key] || get('imastery.vlog') === key) return; // once per page per day per page load
      sent[key] = 1; set('imastery.vlog', key);
      var ua = String((navigator && navigator.userAgent) || '');
      var r = fetch(cfg.supabaseUrl + '/rest/v1/rpc/log_visit', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseKey, Authorization: 'Bearer ' + bearer() },
        body: JSON.stringify({ p_visitor: visitor(), p_page: p, p_surface: native ? 'app' : 'web', p_device: device(ua), p_os: os(ua), p_browser: browser(ua) })
      });
      if (r && r.catch) r.catch(function () { });
    } catch (e) { }
  }
  if (document.readyState === 'complete') setTimeout(log, 0); else addEventListener('load', function () { setTimeout(log, 0); });
  if (native) addEventListener('hashchange', log); // the app switches screens through the hash
  window.IMVisits = { device: device, os: os, browser: browser, page: page };
})();
