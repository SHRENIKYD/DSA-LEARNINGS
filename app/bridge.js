(function () {
  if (typeof Play === 'undefined' || typeof TRACKS === 'undefined') return;
  var SI = window.SEARCH_INDEX || { modules: {} };
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  var tid = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
  var play = lsGet('imastery.play', null) || Play.emptyState();
  play.settings = play.settings || { haptics: true, bit: true, motion: true };
  if (play.settings.sound === undefined) play.settings.sound = true;
  play.settings.tts = play.settings.tts || { rate: 1, voice: null, cont: true };
  if (typeof Sound !== 'undefined') Sound.enable(play.settings.sound);
  function sfx(n) { if (typeof Sound !== 'undefined') Sound.play(n); }
  var o = Play.observe(play, lsGet('imastery.done', {}) || {}, new Date());
  play = o.state; Play.claim(play, new Date());
  var S = Play.summary(lsGet('imastery.done', {}) || {}, play, SI, TRACKS, new Date());
  lsSet('imastery.play', play);

  var bar = document.createElement('nav');
  bar.className = 'im-bar'; bar.setAttribute('aria-label', 'Play mode');
  bar.innerHTML = '<a class="im-back" href="index.html#map/' + tid + '">‹ Play</a><span class="im-pill fl">🔥 <b id="imSt"></b></span><span class="im-pill xp">⚡ <b id="imXp"></b></span><span class="im-pill lv">Lv <b id="imLv"></b></span>' +
    (typeof Reader !== 'undefined' && Reader.available() ? '<button type="button" class="im-listen" id="imListen" aria-label="Read this topic aloud">🔊</button>' : '');
  document.body.appendChild(bar);
  var toast = document.createElement('div'); toast.className = 'im-toast'; toast.setAttribute('role', 'status'); toast.hidden = true; document.body.appendChild(toast);
  function paint() { document.getElementById('imSt').textContent = S.streak.days; document.getElementById('imXp').textContent = S.xp.toLocaleString('en-US'); document.getElementById('imLv').textContent = S.level.level; }
  var tt;
  function say(msg, big) {
    toast.textContent = msg; toast.className = 'im-toast' + (big ? ' big' : ''); toast.hidden = false; void toast.offsetWidth; toast.classList.add('go');
    if (play.settings.haptics && navigator.vibrate) { try { navigator.vibrate(big ? [20, 40, 20] : 12); } catch (e) { } }
    clearTimeout(tt); tt = setTimeout(function () { toast.hidden = true; }, big ? 2600 : 1600);
    sfx(big ? 'level' : 'xp');
  }
  paint();

  // Read aloud: the topic in view, then (optionally) the following topics.
  function topicInView() {
    var ts = document.querySelectorAll('section.topic');
    for (var i = 0; i < ts.length; i++) { var r = ts[i].getBoundingClientRect(); if (r.bottom > 140 && ts[i].getClientRects().length) return ts[i]; }
    return null;
  }
  function titleOf(el) {
    var h = el && el.querySelector('h2');
    if (!h) return document.title.replace(/ — .*/, '');
    var c = h.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('span'), function (sp) { sp.textContent = sp.textContent + ' '; });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function after(el) {
    return function () {
      var n = el && el.nextElementSibling;
      while (n && !(n.matches('section.topic') && n.getClientRects().length)) n = n.nextElementSibling;
      if (!n) return null;
      el = n;
      return { root: n, title: titleOf(n) };
    };
  }
  var listen = document.getElementById('imListen');
  if (listen) {
    Reader.configure({ rate: play.settings.tts.rate, voice: play.settings.tts.voice, cont: play.settings.tts.cont, motion: play.settings.motion, onSave: function (t) { play.settings.tts = t; lsSet('imastery.play', play); } });
    listen.addEventListener('click', function () {
      if (Reader.isOpen()) { Reader.close(); return; }
      sfx('open');
      var t = topicInView(), root = t || document.getElementById('main');
      Reader.open(root, titleOf(t), t ? after(t) : null);
    });
  }

  // Quiz and "what would you do?" answers: the engine marks the option right or wrong.
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('.mcq .opt');
    if (!b) return;
    setTimeout(function () { if (b.classList.contains('right')) sfx('correct'); else if (b.classList.contains('wrong')) sfx('wrong'); }, 0);
  });
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
