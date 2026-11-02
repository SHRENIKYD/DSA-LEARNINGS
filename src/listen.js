/* Website read aloud: a speaker icon button on lesson pages that reads the topic in view (and, if chosen, the next ones)
   with the browser's own speech engine, through the app's Reader player. Settings stay in this browser. */
(function () {
  if (typeof Reader === 'undefined' || typeof Speech === 'undefined' || !Reader.available()) return;
  var KEY = 'imastery.tts';
  function get() { try { var v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  var t = get();
  Reader.configure({ rate: t.rate || 1, voice: t.voice === undefined ? null : t.voice, cont: t.cont !== false, motion: !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
    onSave: function (x) { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch (e) { } } });

  function topicInView() {
    var ts = document.querySelectorAll('section.topic');
    for (var i = 0; i < ts.length; i++) { var r = ts[i].getBoundingClientRect(); if (r.bottom > 140 && ts[i].getClientRects().length) return ts[i]; }
    return null;
  }
  function titleOf(el) {
    var h = el && el.querySelector('h2');
    if (!h) return document.title.replace(/ [—|·-] .*/, '');
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

  document.body.classList.add('im-web');
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'web-listen';
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  b.setAttribute('aria-label', 'Read this topic aloud'); b.title = 'Read aloud';
  b.addEventListener('click', function () {
    if (Reader.isOpen()) { Reader.close(); return; }
    var tp = topicInView(), root = tp || document.getElementById('main') || document.body;
    Reader.open(root, titleOf(tp), tp ? after(tp) : null);
  });
  document.body.appendChild(b);
  // Hidden while the player is open (it has its own close button).
  if (typeof MutationObserver !== 'undefined') new MutationObserver(function () { b.hidden = document.body.classList.contains('im-tts-open'); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
