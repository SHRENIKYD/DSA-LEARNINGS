/* "What's new": after an update, show the newest changelog entry once. New visitors are not shown it. */
(function () {
  var KEY = 'imastery.whatsnew', N = window.IM_WHATSNEW;
  if (!N || !N.v) return;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function returning() {
    var keys = ['imastery.done', 'imastery.route', 'imastery.days', 'imastery.last', 'imastery.welcomed'];
    for (var i = 0; i < keys.length; i++) { var v = get(keys[i]); if (v && v !== '{}' && v !== '[]' && v !== 'null') return true; }
    return false;
  }
  function show() {
    var st = document.createElement('style');
    st.textContent = '.wn-back{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}'
      + '.wn-card{background:var(--panel,#fff);color:var(--text,#111);border:1px solid var(--border,#ccc);border-radius:16px;max-width:560px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.35)}'
      + '.wn-head{padding:18px 20px 8px}.wn-head small{color:var(--muted,#666);font-size:.8rem;letter-spacing:.06em;text-transform:uppercase}.wn-head h2{margin:.25rem 0 0;font-size:1.25rem}'
      + '.wn-body{padding:4px 20px 8px;overflow:auto;line-height:1.5;font-size:.95rem}.wn-body h4{margin:.9rem 0 .3rem;font-size:.95rem}.wn-body ul{margin:.2rem 0;padding-left:1.2rem}.wn-body li{margin:.2rem 0}.wn-body code{font-size:.85em}'
      + '.wn-foot{padding:12px 20px 18px;display:flex;justify-content:flex-end}.wn-foot button{font:inherit;font-weight:700;padding:.6rem 1.4rem;border-radius:10px;border:0;cursor:pointer;background:var(--y,#f5c04a);color:#1a1a1a}';
    document.head.appendChild(st);
    var back = document.createElement('div');
    back.className = 'wn-back';
    back.innerHTML = '<div class="wn-card" role="dialog" aria-modal="true" aria-labelledby="wn-t"><div class="wn-head"><small>What\'s new · v' + N.v + '</small><h2 id="wn-t"></h2></div><div class="wn-body"></div><div class="wn-foot"><button type="button">Got it</button></div></div>';
    back.querySelector('#wn-t').textContent = N.title || 'This update';
    back.querySelector('.wn-body').innerHTML = N.html || '';
    var btn = back.querySelector('button');
    function close() { document.removeEventListener('keydown', onKey); if (back.parentNode) back.parentNode.removeChild(back); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    btn.addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    btn.focus();
  }
  function run() {
    var seen = get(KEY);
    set(KEY, N.v);
    if (seen === N.v) return;
    if ((seen || returning()) && !document.querySelector('dialog[open], .onb[open]')) show();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
