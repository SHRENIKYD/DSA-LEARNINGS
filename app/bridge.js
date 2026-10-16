(function () {
  if (typeof Play === 'undefined' || typeof TRACKS === 'undefined') return;
  var SI = window.SEARCH_INDEX || { modules: {} };
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  var tid = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
  var play = lsGet('imastery.play', null) || Play.emptyState();
  play.settings = play.settings || { haptics: true, bit: true, motion: true };
  var o = Play.observe(play, lsGet('imastery.done', {}) || {}, new Date());
  play = o.state; Play.claim(play, new Date());
  var S = Play.summary(lsGet('imastery.done', {}) || {}, play, SI, TRACKS, new Date());
  lsSet('imastery.play', play);

  var bar = document.createElement('nav');
  bar.className = 'im-bar'; bar.setAttribute('aria-label', 'Play mode');
  bar.innerHTML = '<a class="im-back" href="index.html#map/' + tid + '">‹ Play</a><span class="im-pill fl">🔥 <b id="imSt"></b></span><span class="im-pill xp">⚡ <b id="imXp"></b></span><span class="im-pill lv">Lv <b id="imLv"></b></span>';
  document.body.appendChild(bar);
  var toast = document.createElement('div'); toast.className = 'im-toast'; toast.setAttribute('role', 'status'); toast.hidden = true; document.body.appendChild(toast);
  function paint() { document.getElementById('imSt').textContent = S.streak.days; document.getElementById('imXp').textContent = S.xp.toLocaleString('en-US'); document.getElementById('imLv').textContent = S.level.level; }
  var tt;
  function say(msg, big) {
    toast.textContent = msg; toast.className = 'im-toast' + (big ? ' big' : ''); toast.hidden = false; void toast.offsetWidth; toast.classList.add('go');
    if (play.settings.haptics && navigator.vibrate) { try { navigator.vibrate(big ? [20, 40, 20] : 12); } catch (e) { } }
    clearTimeout(tt); tt = setTimeout(function () { toast.hidden = true; }, big ? 2600 : 1600);
  }
  paint();
  document.addEventListener('change', function (e) {
    if (!e.target || !e.target.matches || !e.target.matches('input[data-done]')) return;
    setTimeout(function () {
      var done = lsGet('imastery.done', {}) || {}, before = S;
      var r = Play.observe(play, done, new Date()); play = r.state;
      var q = Play.claim(play, new Date());
      S = Play.summary(done, play, SI, TRACKS, new Date());
      lsSet('imastery.play', play); paint();
      var gained = S.xp - before.xp, mid = Play.moduleOf(e.target.getAttribute('data-done')), m = S.totals.modules[mid], mb = before.totals.modules[mid];
      if (S.level.level > before.level.level) say('+' + gained + ' XP · LEVEL UP! Level ' + S.level.level + ' · ' + S.level.name, true);
      else if (m && m.complete && mb && !mb.complete) say('Module complete! +' + gained + ' XP', true);
      else if (gained > 0) say('+' + gained + ' XP' + (q ? ' · quest done!' : ''));
    }, 0);
  });
})();
