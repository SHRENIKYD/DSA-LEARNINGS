// Anonymous error reports. Sends crash details to our Supabase table client_errors.
// No account id, no cookies. Off when Supabase is not configured, when offline,
// or when localStorage 'imastery.noErrors' is '1'.
(function () {
  var cfg = window.IM_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseKey) return;
  var sent = 0, seen = {};

  function clean(s, n) {
    s = String(s == null ? '' : s);
    s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]');
    s = s.replace(/\?[^\s#)'"]*/g, '?[q]');
    return s.slice(0, n);
  }
  function off() {
    try { if (navigator.onLine === false) return true; } catch (e) { }
    try { if (localStorage.getItem('imastery.noErrors') === '1') return true; } catch (e) { }
    return false;
  }
  function report(message, stack) {
    try {
      message = String(message == null ? '' : message);
      stack = String(stack || '');
      if (/(chrome|moz|safari)-extension:\/\//.test(stack)) return;
      if (!stack && /^Script error\.?$/.test(message.trim())) return;
      if (off() || sent >= 5) return;
      var page = clean(location.pathname + (location.hash || ''), 200);
      var msg = clean(message, 500);
      var key = page + '|' + msg;
      if (seen[key]) return;
      seen[key] = 1;
      sent++;
      var native = false;
      try { native = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()); } catch (e) { }
      var body = {
        app: native ? 'android' : 'web',
        version: String(window.IM_VERSION || cfg.version || '').slice(0, 40),
        page: page, message: msg, stack: clean(stack, 4000),
        ua: String((navigator && navigator.userAgent) || '').slice(0, 300)
      };
      var p = fetch(cfg.supabaseUrl + '/rest/v1/client_errors', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseKey, Authorization: 'Bearer ' + cfg.supabaseKey, Prefer: 'return=minimal' },
        body: JSON.stringify(body)
      });
      if (p && p.catch) p.catch(function () { });
    } catch (e) { }
  }
  window.addEventListener('error', function (e) {
    report(e && e.message, e && e.error && e.error.stack);
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    report(r && r.message ? r.message : r, r && r.stack);
  });
})();
