// Service worker for the website. tools/sw-build.js fills in VERSION and PRECACHE.
var VERSION = '@@VERSION@@';
var PRECACHE = /*@@PRECACHE@@*/[];
var CACHE = 'im-' + VERSION;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(PRECACHE.map(function (u) {
      return c.add(new Request(u, { cache: 'reload' })).catch(function () { });
    }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('im-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (e) { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

function put(req, res) {
  if (res && res.ok && res.type === 'basic') { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
  return res;
}
function offline() { return caches.match('offline.html', { ignoreSearch: true }); }

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // Supabase, YouTube, Google Fonts: network only
  var path = url.pathname;
  if (path.slice(-6) === '/sw.js') return;
  if (req.mode === 'navigate' || /\.html$/.test(path)) {
    // Network first, cached copy when offline, friendly page for places never visited.
    e.respondWith(fetch(req).then(function (r) { return put(req, r); }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (m) { return m || offline(); });
    }));
  } else if (/\/data\/|\/videos\.js$|\/video-library\.js$/.test(path)) {
    // Stale while revalidate: answer from cache, refresh in the background.
    e.respondWith(caches.match(req).then(function (m) {
      var net = fetch(req).then(function (r) { return put(req, r); });
      return m || net.catch(function () { return caches.match(req, { ignoreSearch: true }); });
    }));
  } else {
    // Hashed or versioned files never change: cache first.
    e.respondWith(caches.match(req).then(function (m) {
      return m || fetch(req).then(function (r) { return put(req, r); }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (x) { return x || Response.error(); });
      });
    }));
  }
});
