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
  function publicEntry(v, topicTitle) {
    if (!v || !/^[A-Za-z0-9_-]{11}$/.test(v.id || '') || v.available === false || v.stale || cleanTitle(v.t) !== cleanTitle(topicTitle)) return null;
    var start = time(v.start), end = time(v.end);
    return { id: v.id, title: String(v.title || '').slice(0, 180), channel: String(v.channel || '').slice(0, 80), secs: time(v.secs),
      curated: v.curated === true, note: String(v.note || '').slice(0, 600), start: start, end: end > start ? end : 0 };
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
  return { publicEntry: publicEntry, cleanTitle: cleanTitle, attrs: attrs, fromButton: fromButton, embedUrl: embedUrl, watchUrl: watchUrl, label: label };
});
