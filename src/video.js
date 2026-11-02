// Shared by lesson pages, the watchtower and build-time checks.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LessonVideo = api;
})(typeof window !== 'undefined' ? window : this, function () {
  function time(n) { return Number.isSafeInteger(n) && n >= 0 ? n : 0; }
  function cleanTitle(s) {
    // Bare shift/comparison operators (<<, >>) are text, not HTML tags.
    return String(s || '').replace(/<\/?[a-z][a-z0-9]*(?:\s+[^<>]*)?\/?>/gi, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
  }
  var LANGS = ['java', 'python', 'js', 'cpp', 'csharp'], LANG_NAMES = { java: 'Java', python: 'Python', js: 'JavaScript', cpp: 'C++', csharp: 'C#' };
  var ID = /^[A-Za-z0-9_-]{11}$/;
  function clean(v) {
    var start = time(v.start), end = time(v.end);
    return { id: v.id, title: String(v.title || '').slice(0, 180), channel: String(v.channel || '').slice(0, 80), secs: time(v.secs),
      curated: v.curated === true, note: String(v.note || '').slice(0, 600), start: start, end: end > start ? end : 0 };
  }
  // The public form of one catalog entry: the default pick plus any usable per-language picks (byLang).
  // An entry with only per-language picks has id '' (pick() then returns null for learners without one).
  function publicEntry(v, topicTitle) {
    if (!v || v.stale || cleanTitle(v.t) !== cleanTitle(topicTitle)) return null;
    var out = ID.test(v.id || '') && v.available !== false ? clean(v) : null, by = {}, any = false;
    LANGS.forEach(function (l) {
      var b = v.byLang && v.byLang[l];
      if (b && ID.test(b.id || '') && b.available !== false) { by[l] = clean(b); any = true; }
    });
    if (!out && !any) return null;
    if (!out) out = { id: '', title: '', channel: '', secs: 0, curated: false, note: '', start: 0, end: 0 };
    if (any) out.byLang = by;
    return out;
  }
  function normLang(l) { return LANGS.indexOf(l) >= 0 ? l : ''; }
  // The learner's chosen language, or '' when none has been chosen. Learn is absent on some pages (videos.html).
  function learnerLang() {
    var r = null;
    try { r = JSON.parse(localStorage.getItem('imastery.route')); } catch (e) { }
    if (r && r.id) return normLang(r.lang);
    try { if (window.Learn && Learn.pref().chosen) return normLang(Learn.pref().lang); } catch (e) { }
    return '';
  }
  // The video to show for an entry: byLang[lang] when present, else the default pick (null when there is none).
  function pick(entry, lang) {
    if (!entry) return null;
    var l = normLang(lang === undefined ? learnerLang() : lang), b = l && entry.byLang && entry.byLang[l];
    if (b && ID.test(b.id || '')) {
      var o = {}; for (var k in b) o[k] = b[k];
      o.lang = l; o.perLang = true; return o;
    }
    if (!ID.test(entry.id || '')) return null;
    var d = {}; for (var j in entry) if (j !== 'byLang') d[j] = entry[j];
    d.lang = ''; d.perLang = false; return d;
  }
  // window.IM_VIDEOS keeps its shape: IM_VIDEOS[topicId] is the pick for the current learner language, resolved on every read.
  function resolveAll(raw) {
    var out = {};
    Object.keys(raw).forEach(function (id) {
      Object.defineProperty(out, id, { enumerable: true, get: function () { return pick(raw[id]); } });
    });
    return out;
  }
  function attrs(v) {
    if (!v || !/^[A-Za-z0-9_-]{11}$/.test(v.id || '')) return '';
    return 'data-vid="' + v.id + '" data-start="' + time(v.start) + '" data-end="' + time(v.end) + '"';
  }
  function fromButton(b) { return { id: b.getAttribute('data-vid'), start: Number(b.getAttribute('data-start')), end: Number(b.getAttribute('data-end')) }; }
  function embedUrl(v) {
    if (!v || !/^[A-Za-z0-9_-]{11}$/.test(v.id || '')) return '';
    var s = time(v.start), e = time(v.end);
    return 'https://www.youtube-nocookie.com/embed/' + v.id + '?autoplay=1&rel=0&playsinline=1' + (s ? '&start=' + s : '') + (e > s ? '&end=' + e : '');
  }
  function watchUrl(v) {
    return v && /^[A-Za-z0-9_-]{11}$/.test(v.id || '') ? 'https://www.youtube.com/watch?v=' + v.id + (time(v.start) ? '&t=' + v.start + 's' : '') : '';
  }
  function stamp(n) { return (n >= 3600 ? Math.floor(n / 3600) + ':' : '') + (n >= 3600 ? String(Math.floor(n / 60) % 60).padStart(2, '0') : Math.floor(n / 60)) + ':' + String(n % 60).padStart(2, '0'); }
  function label(v) {
    var s = time(v.start), e = time(v.end);
    return s || e ? 'Chapter ' + stamp(s) + (e > s ? '–' + stamp(e) : '') + ' · ' : (time(v.secs) ? Math.max(1, Math.round(v.secs / 60)) + ' min · ' : '');
  }
  // Swaps a video button for the embedded player with a close icon (top centre, shown on hover/focus); closing puts the button back.
  function play(b) {
    if (!b || !/^[A-Za-z0-9_-]{11}$/.test(b.getAttribute('data-vid') || '')) return null;
    var fr = document.createElement('div'); fr.className = 'vid-frame';
    var ifr = document.createElement('iframe');
    ifr.src = embedUrl(fromButton(b));
    ifr.title = (b.querySelector('b') || b).textContent;
    ifr.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    ifr.setAttribute('allowfullscreen', '');
    ifr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'vid-close'; x.title = 'Close video'; x.setAttribute('aria-label', 'Close video');
    x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    x.addEventListener('click', function (e) { e.stopPropagation(); fr.replaceWith(b); b.focus(); });
    fr.appendChild(ifr); fr.appendChild(x);
    b.replaceWith(fr);
    return fr;
  }
  return { play: play, publicEntry: publicEntry, cleanTitle: cleanTitle, attrs: attrs, fromButton: fromButton, embedUrl: embedUrl, watchUrl: watchUrl, label: label, pick: pick, resolveAll: resolveAll, learnerLang: learnerLang, langName: function (l) { return LANG_NAMES[l] || ''; }, LANGS: LANGS };
});
