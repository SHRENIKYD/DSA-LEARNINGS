// Small synthesized sound effects (Web Audio, no audio files).
var Sound = (function () {
  var ctx = null, on = true;
  var AC = window.AudioContext || window.webkitAudioContext;
  function ready() {
    if (!on || !AC) return null;
    if (!ctx) { try { ctx = new AC(); } catch (e) { AC = null; return null; } }
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, type, gain, toFreq) {
    var c = ready(); if (!c) return;
    var t0 = c.currentTime + start, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  var FX = {
    tap: function () { tone(880, 0, 0.05, 'triangle', 0.06); },
    correct: function () { tone(659, 0, 0.12, 'sine', 0.12); tone(988, 0.09, 0.22, 'sine', 0.12); },
    wrong: function () { tone(220, 0, 0.18, 'triangle', 0.10, 150); tone(165, 0.12, 0.22, 'triangle', 0.08, 120); },
    xp: function () { tone(988, 0, 0.07, 'square', 0.05); tone(1319, 0.06, 0.16, 'square', 0.05); },
    level: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.09, 0.22, 'triangle', 0.11); }); tone(1319, 0.38, 0.45, 'sine', 0.09); },
    badge: function () { [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, i * 0.06, 0.3, 'sine', 0.08); }); },
    open: function () { tone(523, 0, 0.06, 'sine', 0.05, 784); }
  };
  // Unlock audio on the first touch so later sounds (after async work) can play.
  ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { ready(); }, { once: true, capture: true }); });
  return {
    play: function (name) { if (on && FX[name]) { try { FX[name](); } catch (e) { } } },
    enable: function (v) { on = !!v; },
    supported: !!AC
  };
})();
