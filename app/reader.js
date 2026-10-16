// Read-aloud player: splits a container into paragraphs, speaks them in order, highlights and scrolls.
var Reader = (function () {
  var EXCL = 'pre,svg,canvas,button,input,select,textarea,nav,script,style,template,.viz,.code-wrap,.code-tabs,.cpane,.code-head,.donebox,.im-bar,.im-tts,.im-toast,.toast,.tabbar,[aria-hidden="true"]';
  var BLOCK = /^(P|LI|H1|H2|H3|H4|H5|H6|DIV|SECTION|ARTICLE|UL|OL|DETAILS|SUMMARY|TABLE|THEAD|TBODY|TFOOT|TR|BLOCKQUOTE|DL|DT|DD|FIGURE|FIGCAPTION|MAIN|ASIDE|HEADER|FOOTER|LABEL|FORM)$/;
  var RATES = [0.75, 1, 1.25, 1.5, 2];

  function chunks(root) {
    var out = [];
    function flush(el, buf) { var t = Speech.clean(buf); if (/[A-Za-z0-9]/.test(t)) out.push({ el: el, text: t }); }
    function walk(el) {
      var buf = '';
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) { buf += n.nodeValue; continue; }
        if (n.nodeType !== 1 || n.hidden || n.matches(EXCL) || !n.getClientRects().length) continue;
        if (n.tagName === 'DETAILS' && !n.open) { var s = n.querySelector('summary'); flush(el, buf); buf = ''; if (s) flush(s, s.textContent); continue; }
        if (BLOCK.test(n.tagName)) { flush(el, buf); buf = ''; walk(n); }
        else if (n.tagName === 'TD' || n.tagName === 'TH') buf += ' ' + n.textContent + ',';
        else if (n.tagName === 'BR') buf += ' ';
        else if (n.tagName === 'SPAN') buf += ' ' + n.textContent + ' ';
        else buf += n.textContent;
      }
      flush(el, buf);
    }
    walk(root);
    return out;
  }

  var ui = null, list = [], idx = 0, playing = false, gen = 0, cur = null, title = '', nextFn = null, cfg = null, voiceList = [];

  function build() {
    ui = document.createElement('div');
    ui.className = 'im-tts'; ui.hidden = true;
    ui.setAttribute('role', 'region'); ui.setAttribute('aria-label', 'Read aloud');
    ui.innerHTML = '<div class="tt-top"><span class="tt-ic" aria-hidden="true">🔊</span><b class="tt-title"></b><button type="button" class="tt-x" aria-label="Close read aloud">✕</button></div>' +
      '<div class="tt-prog" aria-hidden="true"><i></i></div><div class="tt-pos" aria-live="off"></div>' +
      '<div class="tt-ctl"><button type="button" class="tt-prev" aria-label="Previous paragraph">⏮</button><button type="button" class="tt-play" aria-label="Pause">❚❚</button><button type="button" class="tt-next" aria-label="Next paragraph">⏭</button></div>' +
      '<div class="tt-row"><span>Speed</span><div class="tt-speed" role="group" aria-label="Reading speed">' + RATES.map(function (r) { return '<button type="button" data-rate="' + r + '">' + r + '×</button>'; }).join('') + '</div></div>' +
      '<div class="tt-row tt-vrow" hidden><label for="ttVoice">Voice</label><select id="ttVoice"><option value="">Default</option></select></div>' +
      '<label class="tt-row tt-cont" for="ttCont"><span>Continue to the next topic</span><input type="checkbox" id="ttCont"></label>';
    document.body.appendChild(ui);
    q('.tt-x').addEventListener('click', close);
    q('.tt-play').addEventListener('click', function () { if (playing) pause(); else resume(); });
    q('.tt-prev').addEventListener('click', function () { jump(Math.max(0, idx - 1)); });
    q('.tt-next').addEventListener('click', function () { jump(idx + 1); });
    Array.prototype.forEach.call(ui.querySelectorAll('[data-rate]'), function (b) {
      b.addEventListener('click', function () { cfg.rate = +b.getAttribute('data-rate'); save(); paintRate(); if (playing) jump(idx); });
    });
    q('#ttVoice').addEventListener('change', function () { var v = this.value; cfg.voice = v === '' ? null : +v; save(); if (playing) jump(idx); });
    q('#ttCont').addEventListener('change', function () { cfg.cont = this.checked; save(); });
    document.addEventListener('click', function (e) {
      if (ui.hidden || !list.length || ui.contains(e.target) || e.target.closest('a,button,summary,input,select,label,.opts,.im-bar')) return;
      for (var i = 0; i < list.length; i++) if (list[i].el.contains(e.target)) { jump(i); return; }
    });
    Speech.voices().then(function (vs) {
      voiceList = vs.filter(function (v) { return /^en/i.test(v.lang || ''); });
      if (!voiceList.length) return;
      var sel = q('#ttVoice');
      voiceList.forEach(function (v) { var o = document.createElement('option'); o.value = v.i; o.textContent = v.name + (v.lang ? ' (' + v.lang + ')' : ''); sel.appendChild(o); });
      if (cfg.voice !== null && cfg.voice !== undefined) sel.value = String(cfg.voice);
      q('.tt-vrow').hidden = false;
    });
  }
  function q(s) { return ui.querySelector(s); }
  function save() { if (cfg && cfg.onSave) cfg.onSave({ rate: cfg.rate, voice: cfg.voice, cont: cfg.cont }); }
  function paintRate() { Array.prototype.forEach.call(ui.querySelectorAll('[data-rate]'), function (b) { var on = +b.getAttribute('data-rate') === cfg.rate; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
  function paint() {
    q('.tt-title').textContent = title;
    q('.tt-pos').textContent = list.length ? 'Paragraph ' + Math.min(idx + 1, list.length) + ' of ' + list.length : 'Nothing to read here';
    q('.tt-prog i').style.width = (list.length ? Math.min(1, (idx + (playing ? 0.5 : 0)) / list.length) * 100 : 0) + '%';
    var p = q('.tt-play'); p.textContent = playing ? '❚❚' : '▶'; p.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
  function mark(el) {
    if (cur) cur.classList.remove('im-reading');
    cur = el;
    if (!el) return;
    el.classList.add('im-reading');
    if (el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: cfg.motion === false ? 'auto' : 'smooth' });
  }
  function speakFrom(i) {
    var my = ++gen;
    idx = i;
    if (idx >= list.length) return finished();
    playing = true; mark(list[idx].el); paint();
    Speech.say(list[idx].text, { rate: cfg.rate, voice: cfg.voice }).then(function (ok) {
      if (my !== gen || !playing) return;
      if (!ok) { playing = false; mark(null); paint(); q('.tt-pos').textContent = 'Read aloud stopped: speech is not available on this device.'; return; }
      speakFrom(idx + 1);
    });
  }
  function finished() {
    var n = cfg.cont && nextFn ? nextFn() : null;
    if (n && n.root) { load(n.root, n.title, n.next || nextFn); speakFrom(0); return; }
    playing = false; mark(null); idx = list.length; paint();
    q('.tt-pos').textContent = 'Finished · ' + list.length + ' paragraphs';
  }
  function jump(i) { gen++; Speech.stop().then(function () { speakFrom(Math.min(i, list.length)); }); }
  function pause() { playing = false; gen++; Speech.stop(); paint(); }
  function resume() { if (idx >= list.length) idx = 0; speakFrom(idx); }
  function close() { pause(); mark(null); ui.hidden = true; document.body.classList.remove('im-tts-open'); }
  function load(root, t, next) { list = chunks(root); idx = 0; title = t || ''; nextFn = next || null; }

  return {
    available: function () { return Speech.available; },
    chunks: chunks,
    configure: function (c) { cfg = c; cfg.rate = RATES.indexOf(c.rate) >= 0 ? c.rate : 1; cfg.voice = typeof c.voice === 'number' ? c.voice : null; cfg.cont = c.cont !== false; },
    open: function (root, t, next) {
      if (!ui) build();
      gen++; Speech.stop();
      load(root, t, next);
      q('#ttCont').checked = cfg.cont; q('#ttCont').closest('.tt-cont').hidden = !next;
      paintRate(); ui.hidden = false; document.body.classList.add('im-tts-open');
      speakFrom(0);
    },
    close: function () { if (ui) close(); },
    isOpen: function () { return !!ui && !ui.hidden; },
    state: function () { return { idx: idx, total: list.length, playing: playing, title: title }; }
  };
})();
