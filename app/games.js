var Games = (function () {
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function btn(label, cls) { var b = h('button', 'b3' + (cls ? ' ' + cls : ''), label); b.type = 'button'; return b; }

  var guess = {
    id: 'guess', mid: 'dsa10', track: 'dsa', kicker: 'DSA 10 · Binary Search', title: 'Guess the number',
    goal: 'Bit picked a number from 1 to 100. Find it in 7 tries.',
    learned: 'You just did binary search. Each guess at the middle throws away half of what is left, so 100 numbers need at most 7 guesses (2⁷ = 128). That is O(log N).',
    mount: function (el, api) {
      var grid = h('div', 'g-grid'), cells = [], tries = h('div', 'g-tries'), info = h('div', 'g-row'), range = h('span', 'g-range');
      var row = h('div', 'g-slide'), inp = h('input'), val = h('span', 'g-num', '50'), msg = h('div', 'g-msg'), go = btn('GUESS'), again = btn('New number', 'ghost');
      inp.type = 'range'; inp.min = 1; inp.max = 100; inp.value = 50; inp.id = 'gGuess'; inp.setAttribute('aria-label', 'Your guess');
      for (var i = 1; i <= 100; i++) { var c = h('i'); grid.appendChild(c); cells.push(c); }
      for (var t = 0; t < 7; t++) tries.appendChild(h('i'));
      info.appendChild(tries); info.appendChild(range); row.appendChild(inp); row.appendChild(val);
      var acts = h('div', 'g-acts'); acts.appendChild(again); acts.appendChild(go);
      [grid, info, row, msg, acts].forEach(function (x) { el.appendChild(x); });
      var secret, lo, hi, used, over;
      function paint(mid) {
        cells.forEach(function (c, ix) { var n = ix + 1; c.className = over && n === secret ? 'hit' : n === mid && !over ? 'mid' : (n < lo || n > hi ? 'out' : 'in'); });
        Array.prototype.forEach.call(tries.children, function (e, ix) { e.className = ix < used ? 'u' : ''; });
        range.textContent = over ? 'answer: ' + secret : 'still possible: ' + lo + '–' + hi;
      }
      function start() { secret = 1 + Math.floor(Math.random() * 100); lo = 1; hi = 100; used = 0; over = false; inp.value = 50; val.textContent = '50'; go.textContent = 'GUESS'; msg.className = 'g-msg'; msg.textContent = 'Slide to a number and tap Guess. Tip: try the middle of what is left.'; paint(50); }
      inp.addEventListener('input', function () { val.textContent = inp.value; if (!over) paint(+inp.value); });
      go.addEventListener('click', function () {
        if (over) { start(); return; }
        var g = +inp.value; used++; api.tick();
        if (g === secret) { over = true; paint(g); msg.className = 'g-msg win'; msg.innerHTML = '<b>Found ' + secret + ' in ' + used + (used === 1 ? ' try' : ' tries') + '!</b>'; go.textContent = 'PLAY AGAIN'; api.win(); return; }
        if (g < secret) lo = Math.max(lo, g + 1); else hi = Math.min(hi, g - 1);
        var mid = Math.floor((lo + hi) / 2);
        if (used >= 7) { over = true; paint(g); msg.className = 'g-msg'; msg.innerHTML = 'Out of tries, it was <b>' + secret + '</b>. Guess the middle each time and 7 is always enough.'; go.textContent = 'TRY AGAIN'; return; }
        msg.innerHTML = '<b>' + (g < secret ? 'Higher' : 'Lower') + '</b> than ' + g + '. ' + (hi - lo + 1) + ' numbers left, the middle is ' + mid + '.';
        paint(g);
      });
      again.addEventListener('click', start);
      start();
    }
  };

  var race = {
    id: 'race', mid: 'dsa02', track: 'dsa', kicker: 'DSA 2 · Complexity', title: 'Big-O race',
    goal: 'N = 100,000 and the time limit is 1 second. Which runner finishes in time?',
    learned: 'A computer does about 10⁸ simple steps per second. At N = 100,000, O(N²) is 10¹⁰ steps (about 100 s) while O(N log N) is about 1.7 million (0.02 s). Read the constraints, then pick the complexity.',
    mount: function (el, api) {
      var RUN = [
        { id: 'n2', name: '🐢 Nested loops', o: 'O(N²)', f: function (n) { return n * n; }, c: 'r' },
        { id: 'nl', name: '🐇 Sort, then scan', o: 'O(N log N)', f: function (n) { return n * Math.log2(Math.max(n, 2)); }, c: 'g' }
      ];
      var lanes = h('div', 'g-race'), sl = h('div', 'g-slide'), inp = h('input'), nv = h('span', 'g-num sm'), msg = h('div', 'g-msg'), ch = h('div', 'g-choices');
      inp.type = 'range'; inp.min = 1; inp.max = 6; inp.step = 0.1; inp.value = 5; inp.id = 'gRaceN'; inp.setAttribute('aria-label', 'Input size N'); inp.disabled = true;
      sl.appendChild(h('span', 'g-lab', 'N')); sl.appendChild(inp); sl.appendChild(nv);
      var bars = RUN.map(function (r) {
        var lane = h('div', 'g-lane'), top = h('div', 'g-lrow'), tr = h('div', 'g-track'), bar = h('i', r.c);
        top.innerHTML = '<span>' + r.name + ' · ' + r.o + '</span><span class="ops"></span>'; tr.appendChild(bar); lane.appendChild(top); lane.appendChild(tr); lanes.appendChild(lane);
        return { r: r, bar: bar, ops: top.querySelector('.ops') };
      });
      function fmt(x) { if (x < 1000) return Math.round(x) + ''; var e = Math.floor(Math.log10(x)); var m = Math.round(x / Math.pow(10, e) * 10) / 10; if (m >= 10) { m = 1; e++; } return m + '×10' + sup(e); }
      function sup(e) { return String(e).split('').map(function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]; }).join(''); }
      function secs(ops) { var s = ops / 1e8; return s < 0.01 ? '<0.01 s' : s < 100 ? (Math.round(s * 100) / 100) + ' s' : Math.round(s) + ' s'; }
      function paint() {
        var n = Math.round(Math.pow(10, +inp.value)); nv.textContent = n.toLocaleString('en-US');
        bars.forEach(function (b) { var ops = b.r.f(n), s = ops / 1e8; b.bar.style.width = Math.max(2, 100 * Math.min(1, 1 / Math.max(s, 1e-9))) + '%'; b.ops.textContent = fmt(ops) + ' ops · ' + secs(ops); b.ops.className = 'ops ' + (s <= 1 ? 'ok' : 'bad'); });
      }
      RUN.forEach(function (r) {
        var b = btn(r.name, 'ghost');
        b.addEventListener('click', function () {
          api.tick();
          if (r.id === 'nl') { b.classList.add('pick'); msg.className = 'g-msg win'; msg.innerHTML = '<b>Right!</b> Now drag N and watch how fast the tortoise falls behind.'; inp.disabled = false; api.win(); }
          else { b.classList.add('nope'); msg.className = 'g-msg'; msg.innerHTML = '10¹⁰ steps at 10⁸ per second is about <b>100 seconds</b>. Try the other runner.'; }
        });
        ch.appendChild(b);
      });
      inp.addEventListener('input', paint);
      msg.textContent = 'Place your bet. Rule of thumb: about 10⁸ simple steps per second.';
      [lanes, sl, ch, msg].forEach(function (x) { el.appendChild(x); });
      paint();
    }
  };

  var oranges = {
    id: 'oranges', mid: 'dsa19', track: 'dsa', kicker: 'DSA 19 · Graphs I · BFS', title: 'Rotten oranges',
    goal: 'Every minute, rot spreads to oranges that touch a rotten one (up, down, left, right). How many minutes until none are fresh?',
    learned: 'Both rotten oranges spread at the same time, one ring per minute. That is multi-source BFS: start the queue with every source, and each BFS level is one minute.',
    mount: function (el, api) {
      var G = ['RFFFF', 'FFF#F', 'FFFFF', '#F#FF', 'FFFFR'].map(function (r) { return r.split(''); });
      var grid = h('div', 'g-orch'), cells = [], minute = 0, rot = {}, picked = null, frontier = [];
      var head = h('div', 'g-row'), mv = h('span', 'g-range'), ask = h('div', 'g-choices'), msg = h('div', 'g-msg'), step = btn('PLAY 1 MINUTE'), reset = btn('Reset', 'ghost');
      for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) { var s = h('span'); grid.appendChild(s); cells.push(s); }
      function key(r, c) { return r * 5 + c; }
      function init() { minute = 0; rot = {}; frontier = []; for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) if (G[r][c] === 'R') { rot[key(r, c)] = 0; frontier.push([r, c]); } paint(); }
      function fresh() { var n = 0; for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) if (G[r][c] === 'F' && rot[key(r, c)] === undefined) n++; return n; }
      function paint() {
        for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) {
          var el2 = cells[key(r, c)], k = key(r, c);
          if (G[r][c] === '#') { el2.className = 'em'; el2.textContent = ''; continue; }
          var d = rot[k];
          el2.className = d === undefined ? '' : (d === minute && minute > 0 ? 'wave' : 'rot');
          el2.textContent = d === undefined ? '🍊' : '🤢';
        }
        mv.innerHTML = 'minute <b>' + minute + '</b> · fresh left: ' + fresh();
      }
      step.addEventListener('click', function () {
        if (picked === null) { msg.textContent = 'Make your prediction first.'; return; }
        if (!fresh()) return;
        var next = [];
        minute++;
        frontier.forEach(function (p) { [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var r = p[0] + d[0], c = p[1] + d[1]; if (r < 0 || c < 0 || r > 4 || c > 4 || G[r][c] !== 'F' || rot[key(r, c)] !== undefined) return; rot[key(r, c)] = minute; next.push([r, c]); }); });
        frontier = next; api.tick(); paint();
        if (!fresh()) {
          if (picked === minute) { msg.className = 'g-msg win'; msg.innerHTML = '<b>Exactly ' + minute + ' minutes.</b> You predicted it.'; api.win(); }
          else { msg.className = 'g-msg'; msg.innerHTML = 'It took <b>' + minute + ' minutes</b>, not ' + picked + '. The two rings meet in the middle. Reset and watch again.'; }
          step.disabled = true;
        }
      });
      reset.addEventListener('click', function () { step.disabled = false; msg.className = 'g-msg'; msg.textContent = picked === null ? 'Predict first.' : 'Your guess: ' + picked + ' minutes. Play it out.'; init(); });
      [3, 4, 5, 6].forEach(function (n) {
        var b = btn(n + ' min', 'ghost');
        b.addEventListener('click', function () { if (minute) return; picked = n; Array.prototype.forEach.call(ask.children, function (x) { x.classList.remove('pick'); }); b.classList.add('pick'); msg.className = 'g-msg'; msg.textContent = 'Your guess: ' + n + ' minutes. Now play it out.'; });
        ask.appendChild(b);
      });
      ask.className = 'g-choices four';
      head.appendChild(mv);
      var acts = h('div', 'g-acts'); acts.appendChild(reset); acts.appendChild(step);
      msg.textContent = 'Predict the answer, then play it minute by minute.';
      [head, grid, ask, msg, acts].forEach(function (x) { el.appendChild(x); });
      init();
    }
  };

  var lockers = {
    id: 'lockers', mid: 'dsa08', track: 'dsa', kicker: 'DSA 8 · Hashing', title: 'Hash lockers',
    goal: 'Put each name in its locker: locker = (sum of letter codes) % 7.',
    learned: 'That formula is a hash function, and the lockers are buckets. Two names landing in one locker is a collision; a HashMap chains them in a list. Too many per locker and lookups slow down, so the map resizes.',
    mount: function (el, api) {
      var NAMES = ['Kabir', 'Lin', 'Meera', 'Aanya', 'Jordan'], ix = 0, placed = {};
      var f = h('div', 'g-formula'), wrap = h('div', 'g-lockers'), msg = h('div', 'g-msg'), L = [];
      for (var i = 0; i < 7; i++) {
        var b = h('button', 'g-lk'); b.type = 'button'; b.innerHTML = '<b>' + i + '</b><span class="in"></span>'; b.dataset.i = i; wrap.appendChild(b); L.push(b);
        b.addEventListener('click', onPick);
      }
      function sum(n) { return n.split('').reduce(function (a, ch) { return a + ch.charCodeAt(0); }, 0); }
      function show() {
        if (ix >= NAMES.length) return;
        var n = NAMES[ix], s = sum(n);
        f.innerHTML = '<span class="nm">' + n + '</span> → ' + n.split('').map(function (ch) { return ch.charCodeAt(0); }).join(' + ') + ' = <b>' + s + '</b><br>' + s + ' % 7 = <b>?</b>';
      }
      function onPick() {
        if (ix >= NAMES.length) return;
        var n = NAMES[ix], s = sum(n), want = s % 7, got = +this.dataset.i;
        api.tick();
        if (got !== want) { msg.className = 'g-msg'; msg.innerHTML = s + ' ÷ 7 = ' + Math.floor(s / 7) + ' remainder <b>' + want + '</b>. Try locker ' + want + '.'; this.classList.add('nope'); var me = this; setTimeout(function () { me.classList.remove('nope'); }, 400); return; }
        var box = L[want].querySelector('.in'), chip = h('i', '', n);
        var collide = (placed[want] || []).length > 0;
        placed[want] = (placed[want] || []).concat(n);
        box.appendChild(chip);
        L[want].classList.toggle('hot', collide);
        msg.className = 'g-msg' + (collide ? ' warn' : '');
        msg.innerHTML = collide ? '<b>Collision!</b> ' + n + ' and ' + placed[want][0] + ' share locker ' + want + '. They are chained in a list.' : n + ' goes in locker ' + want + '.';
        ix++;
        if (ix >= NAMES.length) { f.innerHTML = 'All 5 names placed. Lockers with two names are collisions.'; msg.className = 'g-msg win'; msg.innerHTML += ' <b>All placed!</b>'; api.win(); }
        else show();
      }
      msg.textContent = 'Work out the remainder, then tap that locker.';
      [f, wrap, msg].forEach(function (x) { el.appendChild(x); });
      show();
    }
  };

  var LIST = [guess, race, oranges, lockers];
  var BY = {}; LIST.forEach(function (g) { BY[g.id] = g; });
  var BYMOD = {}; LIST.forEach(function (g) { BYMOD[g.mid] = g; });
  return { list: LIST, get: function (id) { return BY[id]; }, forModule: function (mid) { return BYMOD[mid]; } };
})();
