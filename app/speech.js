// Text to speech: native plugin in the app (Android WebView has no speechSynthesis), browser speech elsewhere.
var Speech = (function () {
  var C = window.Capacitor;
  var native = C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.TextToSpeech ? C.Plugins.TextToSpeech : null;
  var web = !native && typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null;
  var token = 0;

  function say(text, opts) {
    opts = opts || {};
    var my = ++token;
    if (native) {
      var o = { text: text, lang: opts.lang || 'en-US', rate: opts.rate || 1, pitch: 1, volume: 1, category: 'playback' };
      if (typeof opts.voice === 'number') o.voice = opts.voice;
      return native.speak(o).then(function () { return my === token; }, function () { return false; });
    }
    if (web) {
      return new Promise(function (resolve) {
        var u = new SpeechSynthesisUtterance(text), vs = web.getVoices();
        u.lang = opts.lang || 'en-US'; u.rate = opts.rate || 1;
        if (typeof opts.voice === 'number' && vs[opts.voice]) u.voice = vs[opts.voice];
        u.onend = function () { resolve(my === token); };
        u.onerror = function () { resolve(false); };
        web.speak(u);
      });
    }
    return Promise.resolve(false);
  }
  function stop() {
    token++;
    if (native) return native.stop().catch(function () { });
    if (web) web.cancel();
    return Promise.resolve();
  }
  function voices() {
    if (native) return native.getSupportedVoices().then(function (r) { return (r.voices || []).map(function (v, i) { return { i: i, name: v.name, lang: v.lang }; }); }, function () { return []; });
    if (web) {
      return new Promise(function (resolve) {
        var list = web.getVoices();
        if (list.length) return resolve(list.map(function (v, i) { return { i: i, name: v.name, lang: v.lang }; }));
        var done = false;
        web.onvoiceschanged = function () { if (done) return; done = true; resolve(web.getVoices().map(function (v, i) { return { i: i, name: v.name, lang: v.lang }; })); };
        setTimeout(function () { if (!done) { done = true; resolve([]); } }, 1500);
      });
    }
    return Promise.resolve([]);
  }
  // Make symbols in lessons speakable.
  function clean(s) {
    return String(s || '').replace(/\s+/g, ' ')
      .replace(/→/g, ' to ').replace(/←/g, ' from ').replace(/≥/g, ' at least ').replace(/≤/g, ' at most ').replace(/≠/g, ' not equal to ')
      .replace(/×/g, ' times ').replace(/−/g, ' minus ').replace(/²/g, ' squared').replace(/³/g, ' cubed').replace(/√/g, ' square root of ')
      .replace(/O\(1\)/g, 'O of 1').replace(/O\(([^)]{1,16})\)/g, 'O of $1').replace(/\s+/g, ' ').trim();
  }
  return { available: !!(native || web), native: !!native, say: say, stop: stop, voices: voices, clean: clean };
})();
