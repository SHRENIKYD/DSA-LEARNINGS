// Registers the offline service worker on the website only (https or localhost, never in the Capacitor app).
(function () {
  if (!('serviceWorker' in navigator) || window.Capacitor) return;
  var h = location.hostname;
  if (!(location.protocol === 'https:' || h === 'localhost' || h === '127.0.0.1')) return;
  addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then(function (reg) {
      // A new version waits quietly; the next visit uses it. imApplyUpdate() lets a page switch at once.
      window.imApplyUpdate = function () { if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING'); };
    }).catch(function () { });
  });
})();
