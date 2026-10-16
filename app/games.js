var Games = (function () {
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function btn(label, cls) { var b = h('button', 'b3' + (cls ? ' ' + cls : ''), label); b.type = 'button'; return b; }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sup(e) { return String(e).split('').map(function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]; }).join(''); }
  function fmt(x) { if (!isFinite(x)) return '∞'; if (x < 1000) return String(Math.round(x)); var e = Math.floor(Math.log10(x)), m = Math.round(x / Math.pow(10, e) * 10) / 10; if (m >= 10) { m = 1; e++; } return m + '×10' + sup(e); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function range(n) { var a = []; for (var i = 1; i <= n; i++) a.push(i); return a; }

  /* 1. Binary search: the range and the number of tries change every round. */
  var guess = {
    id: 'guess', mid: 'dsa10', track: 'dsa', kicker: 'DSA 10 · Binary Search', title: 'Guess the number',
    goal: 'Bit picked a secret number. Find it before you run out of tries.',
    learned: 'You just did binary search. Each guess at the middle throws away half of what is left, so a range of N numbers needs at most ⌈log₂(N+1)⌉ guesses. That is O(log N).',
    mount: function (el, api) {
      var size = rnd(30, 1000), min = rnd(1, 400), max = min + size - 1, lo = min, hi = max, used = 0, over = false;
      var tries = Math.ceil(Math.log2(size + 1)), secret = rnd(min, max);
      var head = h('p', 'g-goal', 'Range <b>' + min + '–' + max + '</b> (' + size + ' numbers) · <b>' + tries + '</b> tries, because 2' + sup(tries) + ' = ' + Math.pow(2, tries) + ' ≥ ' + size);
      var bar = h('div', 'g-span', '<i class="win"></i><i class="mk"></i>'), info = h('div', 'g-row'), dots = h('div', 'g-tries'), rg = h('span', 'g-range');
      var row = h('div', 'g-slide'), inp = h('input'), val = h('span', 'g-num'), msg = h('div', 'g-msg'), go = btn('GUESS');
      inp.type = 'range'; inp.min = min; inp.max = max; inp.value = Math.floor((min + max) / 2); inp.id = 'gGuess'; inp.setAttribute('aria-label', 'Your guess');
      for (var t = 0; t < tries; t++) dots.appendChild(h('i'));
      info.appendChild(dots); info.appendChild(rg); row.appendChild(inp); row.appendChild(val);
      [head, bar, info, row, msg, go].forEach(function (x) { el.appendChild(x); });
      function paint() {
        var w = bar.querySelector('.win'), mk = bar.querySelector('.mk'), g = +inp.value;
        w.style.left = ((lo - min) / size * 100) + '%'; w.style.width = (Math.max(0, hi - lo + 1) / size * 100) + '%';
        mk.style.left = ((g - min + 0.5) / size * 100) + '%';
        each(dots.children, function (e, ix) { e.className = ix < used ? 'u' : ''; });
        rg.textContent = over ? 'answer: ' + secret : 'still possible: ' + lo + '–' + hi;
        val.textContent = g;
      }
      msg.textContent = 'Slide to a number and tap Guess. Tip: aim for the middle of what is left.';
      inp.addEventListener('input', paint);
      go.addEventListener('click', function () {
        if (over) return;
        var g = +inp.value; used++; api.tick();
        if (g === secret) { over = true; paint(); msg.className = 'g-msg win'; msg.innerHTML = '<b>Found ' + secret + ' in ' + used + (used === 1 ? ' try' : ' tries') + '!</b>'; go.disabled = true; api.win(); return; }
        if (g < secret) lo = Math.max(lo, g + 1); else hi = Math.min(hi, g - 1);
        var mid = Math.floor((lo + hi) / 2);
        if (used >= tries) { over = true; paint(); api.miss(); msg.className = 'g-msg'; msg.innerHTML = 'Out of tries, it was <b>' + secret + '</b>. Guess the middle every time and ' + tries + ' is always enough.'; go.disabled = true; return; }
        msg.innerHTML = '<b>' + (g < secret ? 'Higher' : 'Lower') + '</b> than ' + g + '. ' + (hi - lo + 1) + ' left, the middle is ' + mid + '.';
        inp.value = mid; paint();
      });
      paint();
    }
  };

  /* 2. Big-O race: random N and a random pair where exactly one runner fits in 1 second. */
  var RUNNERS = [
    { o: 'O(N)', name: '🐆 One pass', f: function (n) { return n; } },
    { o: 'O(N log N)', name: '🐇 Sort, then scan', f: function (n) { return n * Math.log2(Math.max(n, 2)); } },
    { o: 'O(N²)', name: '🐢 Nested loops', f: function (n) { return n * n; } },
    { o: 'O(N³)', name: '🐌 Triple loop', f: function (n) { return n * n * n; } },
    { o: 'O(2ᴺ)', name: '🦥 Try every subset', f: function (n) { return Math.pow(2, n); } }
  ];
  var race = {
    id: 'race', mid: 'dsa02', track: 'dsa', kicker: 'DSA 2 · Complexity', title: 'Big-O race',
    goal: 'The time limit is 1 second. Which runner finishes in time?',
    learned: 'A computer does about 10⁸ simple steps per second. Plug N into each complexity, compare with 10⁸, and you know before writing code whether an idea will pass. Read the constraints first, then pick the algorithm.',
    mount: function (el, api) {
      var options = [];
      [20, 25, 30, 40, 200, 500, 1000, 3000, 10000, 100000, 1000000, 10000000].forEach(function (n) {
        RUNNERS.forEach(function (a) { RUNNERS.forEach(function (b) { if (a !== b && a.f(n) <= 1e8 && b.f(n) > 1e8 && (n <= 60 || (a.o !== 'O(2ᴺ)' && b.o !== 'O(2ᴺ)'))) options.push({ n: n, fast: a, slow: b }); }); });
      });
      var s = pick(options), runners = shuffle([s.fast, s.slow]), revealed = false;
      var q = h('p', 'g-goal', 'N = <b>' + s.n.toLocaleString('en-US') + '</b>');
      var lanes = h('div', 'g-race'), sl = h('div', 'g-slide'), inp = h('input'), nv = h('span', 'g-num sm'), msg = h('div', 'g-msg'), ch = h('div', 'g-choices');
      var lg = Math.log10(s.n);
      inp.type = 'range'; inp.min = Math.max(1, Math.floor(lg) - 2); inp.max = Math.min(8, Math.ceil(lg) + 2); inp.step = 0.1; inp.value = lg; inp.id = 'gRaceN'; inp.setAttribute('aria-label', 'Input size N'); inp.disabled = true;
      sl.appendChild(h('span', 'g-lab', 'N')); sl.appendChild(inp); sl.appendChild(nv);
      var bars = runners.map(function (r) {
        var lane = h('div', 'g-lane'), top = h('div', 'g-lrow'), tr = h('div', 'g-track'), b = h('i');
        top.innerHTML = '<span>' + r.name + ' · ' + r.o + '</span><span class="ops">?</span>'; tr.appendChild(b); lane.appendChild(top); lane.appendChild(tr); lanes.appendChild(lane);
        return { r: r, bar: b, ops: top.querySelector('.ops') };
      });
      function secs(ops) { var x = ops / 1e8; return x < 0.01 ? '<0.01 s' : x < 100 ? (Math.round(x * 100) / 100) + ' s' : x < 1e6 ? fmt(x) + ' s' : 'forever'; }
      function paint() {
        var n = Math.round(Math.pow(10, +inp.value)); nv.textContent = n.toLocaleString('en-US');
        bars.forEach(function (b) {
          if (!revealed) { b.bar.style.width = '0%'; b.ops.textContent = '?'; return; }
          var ops = b.r.f(n), x = ops / 1e8;
          b.bar.style.width = Math.max(2, 100 * Math.min(1, 1 / Math.max(x, 1e-9))) + '%';
          b.bar.className = x <= 1 ? 'g' : 'r'; b.ops.textContent = fmt(ops) + ' ops · ' + secs(ops); b.ops.className = 'ops ' + (x <= 1 ? 'ok' : 'bad');
        });
      }
      runners.forEach(function (r) {
        var b = btn(r.name, 'ghost');
        b.addEventListener('click', function () {
          if (revealed) return;
          api.tick();
          if (r === s.fast) { revealed = true; b.classList.add('pick'); msg.className = 'g-msg win'; msg.innerHTML = '<b>Right!</b> ' + r.o + ' at N = ' + s.n.toLocaleString('en-US') + ' is about ' + fmt(r.f(s.n)) + ' steps. Drag N to see where each runner breaks.'; inp.disabled = false; paint(); api.win(); }
          else { b.classList.add('nope'); api.miss(); msg.className = 'g-msg'; msg.innerHTML = r.o + ' at this N is about <b>' + fmt(r.f(s.n)) + '</b> steps, more than 10⁸. Try the other runner.'; }
        });
        ch.appendChild(b);
      });
      inp.addEventListener('input', paint);
      msg.textContent = 'Place your bet. Rule of thumb: about 10⁸ simple steps per second.';
      [q, lanes, ch, msg, sl].forEach(function (x) { el.appendChild(x); });
      paint();
    }
  };

  /* 3. Rotten oranges: random grid; sometimes an orange can never rot. */
  var oranges = {
    id: 'oranges', mid: 'dsa19', track: 'dsa', kicker: 'DSA 19 · Graphs I · BFS', title: 'Rotten oranges',
    goal: 'Every minute, rot spreads to oranges touching a rotten one (up, down, left, right). How many minutes until none are fresh?',
    learned: 'All rotten oranges spread at the same time, one ring per minute: that is multi-source BFS. Put every source in the queue first, and each BFS level is one minute. If BFS finishes and a fresh orange is left, the answer is "never" (−1 in code).',
    mount: function (el, api) {
      var R = 5, C = pick([5, 6]), G, dist, answer;
      function bfs() {
        var d = [], q = [];
        for (var r = 0; r < R; r++) { d.push([]); for (var c = 0; c < C; c++) { d[r].push(-1); if (G[r][c] === 'R') { d[r][c] = 0; q.push([r, c]); } } }
        for (var i = 0; i < q.length; i++) {
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (s) {
            var r2 = q[i][0] + s[0], c2 = q[i][1] + s[1];
            if (r2 < 0 || c2 < 0 || r2 >= R || c2 >= C || G[r2][c2] !== 'F' || d[r2][c2] >= 0) return;
            d[r2][c2] = d[q[i][0]][q[i][1]] + 1; q.push([r2, c2]);
          });
        }
        return d;
      }
      function make(allowStuck) {
        for (var tries = 0; tries < 400; tries++) {
          G = []; for (var r = 0; r < R; r++) { G.push([]); for (var c = 0; c < C; c++) G[r].push('F'); }
          var holes = rnd(3, 6), src = rnd(1, 3), k;
          for (k = 0; k < holes; k++) G[rnd(0, R - 1)][rnd(0, C - 1)] = '#';
          for (k = 0; k < src; k++) G[rnd(0, R - 1)][rnd(0, C - 1)] = 'R';
          dist = bfs();
          var fresh = 0, far = 0, stuck = 0;
          for (r = 0; r < R; r++) for (c = 0; c < C; c++) if (G[r][c] === 'F') { fresh++; if (dist[r][c] < 0) stuck++; else far = Math.max(far, dist[r][c]); }
          if (!fresh) continue;
          if (allowStuck ? stuck === 1 && far >= 2 : (stuck === 0 && far >= 3)) { answer = stuck ? -1 : far; return; }
        }
        C = 5; G = ['RFFFF', 'FFF#F', 'FFFFF', '#F#FF', 'FFFFR'].map(function (r) { return r.split(''); }); dist = bfs(); answer = 4;
      }
      make(Math.random() < 0.25);
      var grid = h('div', 'g-orch'), cells = [], minute = 0, picked = null, done = false;
      grid.style.gridTemplateColumns = 'repeat(' + C + ',1fr)';
      var head = h('div', 'g-row'), mv = h('span', 'g-range'), ask = h('div', 'g-choices four'), msg = h('div', 'g-msg'), step = btn('PLAY 1 MINUTE');
      for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) { var s = h('span'); grid.appendChild(s); cells.push(s); }
      function rotten(r, c) { return G[r][c] === 'R' || (dist[r][c] >= 0 && dist[r][c] <= minute); }
      function fresh() { var n = 0; for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) if (G[r][c] === 'F' && !rotten(r, c)) n++; return n; }
      function paint() {
        for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
          var e = cells[r * C + c];
          if (G[r][c] === '#') { e.className = 'em'; e.textContent = ''; continue; }
          var rt = rotten(r, c);
          e.className = rt ? (minute > 0 && dist[r][c] === minute ? 'wave' : 'rot') : '';
          e.textContent = rt ? '🤢' : '🍊';
        }
        mv.innerHTML = 'minute <b>' + minute + '</b> · fresh left: ' + fresh();
      }
      var opts = answer < 0 ? [-1, 2, 3, 4] : [answer - 1, answer, answer + 1, -1];
      shuffle(opts).forEach(function (n) {
        var b = btn(n < 0 ? 'Never' : n + ' min', 'ghost'); b.dataset.v = n;
        b.addEventListener('click', function () { if (minute || done) return; picked = n; each(ask.children, function (x) { x.classList.remove('pick'); }); b.classList.add('pick'); msg.className = 'g-msg'; msg.textContent = 'Your guess: ' + b.textContent + '. Now play it out.'; });
        ask.appendChild(b);
      });
      step.addEventListener('click', function () {
        if (done) return;
        if (picked === null) { msg.textContent = 'Make your prediction first.'; return; }
        var before = fresh(); minute++; api.tick();
        var after = fresh(), result = !after ? minute : (after === before ? -1 : null);
        if (result === -1) minute--;
        paint();
        if (result === null) return;
        done = true; step.disabled = true;
        var said = result < 0 ? 'never: an orange is walled off and the rot cannot reach it' : 'exactly ' + result + ' minutes';
        if (picked === result) { msg.className = 'g-msg win'; msg.innerHTML = '<b>Correct, ' + said + '.</b>'; api.win(); }
        else { api.miss(); msg.className = 'g-msg'; msg.innerHTML = 'It was <b>' + said + '</b>. Tap New puzzle for another grid.'; }
      });
      head.appendChild(mv);
      msg.textContent = 'Predict the answer, then play it minute by minute.';
      [head, grid, ask, msg, step].forEach(function (x) { el.appendChild(x); });
      paint();
    }
  };

  /* 4. Hash lockers: random names and table size, always at least one collision. */
  var POOL = ['Kabir', 'Lin', 'Meera', 'Aanya', 'Jordan', 'Ravi', 'Sara', 'Omar', 'Mia', 'Arjun', 'Zoe', 'Ishan', 'Nora', 'Leo', 'Priya', 'Ken', 'Ana', 'Dev', 'Ola', 'Tara'];
  function codeSum(n) { return n.split('').reduce(function (a, ch) { return a + ch.charCodeAt(0); }, 0); }
  var lockers = {
    id: 'lockers', mid: 'dsa08', track: 'dsa', kicker: 'DSA 8 · Hashing', title: 'Hash lockers',
    goal: 'Put each name in its locker: locker = (sum of letter codes) % size.',
    learned: 'That formula is a hash function and the lockers are buckets. Two names in one locker is a collision; a HashMap chains them in a list. When lockers get crowded, lookups slow down, so the map grows and rehashes.',
    mount: function (el, api) {
      var M, NAMES;
      for (var t = 0; t < 300; t++) {
        M = pick([5, 7, 11]); NAMES = shuffle(POOL).slice(0, M === 5 ? 4 : 5);
        var seen = {}, col = false; NAMES.forEach(function (n) { var k = codeSum(n) % M; if (seen[k]) col = true; seen[k] = 1; });
        if (col) break;
      }
      var ix = 0, placed = {};
      var f = h('div', 'g-formula'), wrap = h('div', 'g-lockers'), msg = h('div', 'g-msg'), L = [];
      wrap.style.gridTemplateColumns = 'repeat(' + M + ',1fr)';
      wrap.classList.toggle('many', M > 7);
      for (var i = 0; i < M; i++) {
        var b = h('button', 'g-lk'); b.type = 'button'; b.innerHTML = '<b>' + i + '</b><span class="in"></span>'; b.dataset.i = i; wrap.appendChild(b); L.push(b);
        b.addEventListener('click', onPick);
      }
      function show() {
        var n = NAMES[ix], s = codeSum(n);
        f.innerHTML = 'size <b>' + M + '</b> · <span class="nm">' + n + '</span> → ' + n.split('').map(function (ch) { return ch.charCodeAt(0); }).join(' + ') + ' = <b>' + s + '</b><br>' + s + ' % ' + M + ' = <b>?</b>';
      }
      function onPick() {
        if (ix >= NAMES.length) return;
        var n = NAMES[ix], s = codeSum(n), want = s % M, got = +this.dataset.i;
        if (got !== want) { api.miss(); msg.className = 'g-msg'; msg.innerHTML = s + ' ÷ ' + M + ' = ' + Math.floor(s / M) + ' remainder <b>' + want + '</b>. Try locker ' + want + '.'; var me = this; me.classList.add('nope'); setTimeout(function () { me.classList.remove('nope'); }, 400); return; }
        api.tick();
        var collide = (placed[want] || []).length > 0;
        placed[want] = (placed[want] || []).concat(n);
        L[want].querySelector('.in').appendChild(h('i', '', n));
        L[want].classList.toggle('hot', collide);
        msg.className = 'g-msg' + (collide ? ' warn' : '');
        msg.innerHTML = collide ? '<b>Collision!</b> ' + n + ' and ' + placed[want][0] + ' share locker ' + want + '. They are chained in a list.' : n + ' goes in locker ' + want + '.';
        ix++;
        if (ix >= NAMES.length) { f.innerHTML = 'All ' + NAMES.length + ' names placed. Lockers with two names are collisions.'; msg.className = 'g-msg win'; msg.innerHTML += ' <b>All placed!</b>'; api.win(); }
        else show();
      }
      msg.textContent = 'Work out the remainder, then tap that locker.';
      [f, wrap, msg].forEach(function (x) { el.appendChild(x); });
      show();
    }
  };

  /* 5. Bracket stack: 5 random strings, decide balanced or not, then see the stack. */
  var PAIRS = { ')': '(', ']': '[', '}': '{' }, OPEN = '([{', CLOSE = ')]}';
  function balanced(s) { var st = []; for (var i = 0; i < s.length; i++) { var ch = s[i]; if (OPEN.indexOf(ch) >= 0) st.push(ch); else if (!st.length || st.pop() !== PAIRS[ch]) return false; } return !st.length; }
  function makeBalanced(n) {
    var out = '', st = [];
    while (out.length < n) {
      var left = n - out.length;
      if (st.length && (st.length >= left || Math.random() < 0.45)) out += CLOSE[OPEN.indexOf(st.pop())];
      else { var o = pick(OPEN.split('')); st.push(o); out += o; }
    }
    return out;
  }
  function breakIt(s) {
    for (var t = 0; t < 20; t++) {
      var a = s.split(''), how = rnd(0, 2), i = rnd(0, a.length - 1);
      if (how === 0) { var cl = []; a.forEach(function (ch, k) { if (CLOSE.indexOf(ch) >= 0) cl.push(k); }); var k = pick(cl); a[k] = pick(CLOSE.split('').filter(function (x) { return x !== a[k]; })); }
      else if (how === 1) a.splice(i, 1);
      else { var p = rnd(0, a.length - 2), x = a[p]; a[p] = a[p + 1]; a[p + 1] = x; }
      var r = a.join('');
      if (!balanced(r)) return r;
    }
    return s + '(';
  }
  var brackets = {
    id: 'brackets', mid: 'dsa13', track: 'dsa', kicker: 'DSA 13 · Stacks & Queues', title: 'Bracket stack',
    goal: 'Is each bracket string balanced? Get 4 of 5 right.',
    learned: 'A stack solves it: push every opening bracket, and on a closing bracket pop and check that it matches. Fail on a mismatch or an empty stack; at the end the stack must be empty. One pass, O(N) time.',
    mount: function (el, api) {
      var rounds = [], score = 0, at = 0;
      for (var i = 0; i < 5; i++) { var b0 = makeBalanced(2 * rnd(3, 5)); rounds.push(Math.random() < 0.5 ? b0 : breakIt(b0)); }
      var head = h('div', 'g-row'), pos = h('span', 'g-range'), str = h('div', 'g-brk'), stack = h('div', 'g-stack'), msg = h('div', 'g-msg'), ch = h('div', 'g-choices');
      var yes = btn('✓ Balanced', 'ghost'), no = btn('✕ Not balanced', 'ghost'), nxt = btn('NEXT STRING');
      ch.appendChild(yes); ch.appendChild(no); head.appendChild(pos);
      function show() {
        var s = rounds[at];
        pos.innerHTML = 'string <b>' + (at + 1) + '</b> of 5 · score ' + score;
        str.innerHTML = s.split('').map(function (c) { return '<span>' + c + '</span>'; }).join('');
        str.dataset.s = s;
        stack.innerHTML = '<span class="muted">stack: empty</span>'; yes.disabled = no.disabled = false; nxt.hidden = true;
        msg.className = 'g-msg'; msg.textContent = 'Balanced means every opener is closed by the matching closer, in the right order.';
      }
      function trace(s) {
        var st = [];
        for (var k = 0; k < s.length; k++) {
          var c = s[k];
          if (OPEN.indexOf(c) >= 0) st.push(c);
          else if (!st.length || st[st.length - 1] !== PAIRS[c]) return { k: k, st: st.join(''), ok: false };
          else st.pop();
        }
        return { k: -1, st: st.join(''), ok: !st.length };
      }
      function answer(v) {
        var s = rounds[at], truth = balanced(s), end = trace(s);
        yes.disabled = no.disabled = true;
        each(str.children, function (sp, k) { sp.className = end.k === k ? 'bad' : (end.k < 0 || k < end.k ? 'seen' : ''); });
        stack.innerHTML = 'stack: <b>' + (end.st || 'empty') + '</b>';
        var why = truth ? 'Every closer matched and the stack ended empty.' : end.k >= 0 ? 'At “' + s[end.k] + '” the top of the stack is ' + (end.st ? '“' + end.st.slice(-1) + '”' : 'empty') + ', so it cannot match.' : 'The string ended with “' + end.st + '” still on the stack.';
        if (v === truth) { score++; api.tick(); msg.className = 'g-msg win'; msg.innerHTML = '<b>Right.</b> ' + why; }
        else { api.miss(); msg.className = 'g-msg'; msg.innerHTML = '<b>Not quite.</b> ' + why; }
        pos.innerHTML = 'string <b>' + (at + 1) + '</b> of 5 · score ' + score;
        if (at === 4) {
          if (score >= 4) { msg.innerHTML += ' <b>' + score + '/5, you win!</b>'; api.win(); }
          else msg.innerHTML += ' <b>' + score + '/5.</b> Tap New puzzle for 5 fresh strings.';
        } else nxt.hidden = false;
      }
      yes.addEventListener('click', function () { answer(true); });
      no.addEventListener('click', function () { answer(false); });
      nxt.addEventListener('click', function () { at++; show(); });
      [head, str, stack, ch, msg, nxt].forEach(function (x) { el.appendChild(x); });
      show();
    }
  };

  /* 6. Swap sort: sort random cards with neighbour swaps; the minimum is the inversion count. */
  function inversions(x) { var c = 0; for (var i = 0; i < x.length; i++) for (var j = i + 1; j < x.length; j++) if (x[i] > x[j]) c++; return c; }
  var swaps = {
    id: 'swaps', mid: 'dsa07', track: 'dsa', kicker: 'DSA 7 · Sorting', title: 'Swap sort',
    goal: 'Sort the cards from small to large. You may only swap two neighbours.',
    learned: 'Every neighbour swap fixes at most one inversion (a pair that is out of order), so the fewest swaps equals the number of inversions. That is exactly what bubble sort does, and why it is O(N²): an array can have N(N−1)/2 inversions. Merge sort counts them in O(N log N).',
    mount: function (el, api) {
      var n = pick([5, 6, 7]), a, inv;
      do { a = shuffle(range(20)).slice(0, n); inv = inversions(a); } while (inv < 3);
      var used = 0, over = false;
      var info = h('div', 'g-row'), stat = h('span', 'g-range'), row = h('div', 'g-cards'), msg = h('div', 'g-msg');
      info.appendChild(stat);
      function paint() {
        row.innerHTML = '';
        a.forEach(function (v, i) {
          row.appendChild(h('span', 'g-card', String(v)));
          if (i < a.length - 1) { var s = h('button', 'g-swap', '⇄'); s.type = 'button'; s.dataset.i = i; s.setAttribute('aria-label', 'Swap ' + a[i] + ' and ' + a[i + 1]); s.disabled = over; s.addEventListener('click', onSwap); row.appendChild(s); }
        });
        stat.innerHTML = 'swaps <b>' + used + '</b> · out-of-order pairs left: ' + inversions(a);
      }
      function onSwap() {
        if (over) return;
        var i = +this.dataset.i, t = a[i];
        if (a[i] < a[i + 1]) { api.miss(); msg.className = 'g-msg warn'; msg.innerHTML = a[i] + ' is already smaller than ' + a[i + 1] + '. Swapping them adds an out-of-order pair.'; }
        else { api.tick(); msg.className = 'g-msg'; msg.textContent = 'One out-of-order pair fixed.'; }
        a[i] = a[i + 1]; a[i + 1] = t; used++;
        if (!inversions(a)) { over = true; paint(); msg.className = 'g-msg win'; msg.innerHTML = used === inv ? '<b>Perfect: ' + used + ' swaps, the minimum.</b>' : '<b>Sorted in ' + used + ' swaps.</b> The minimum was ' + inv + ', the number of out-of-order pairs.'; api.win(); return; }
        paint();
      }
      msg.textContent = 'Tap ⇄ to swap two neighbours. This row has ' + inv + ' out-of-order pairs.';
      [info, row, msg].forEach(function (x) { el.appendChild(x); });
      paint();
    }
  };

  /* 7. Bit flipper: build 3 random numbers from 8 bits. */
  var bits = {
    id: 'bits', mid: 'dsa04', track: 'dsa', kicker: 'DSA 4 · Bit Manipulation', title: 'Bit flipper',
    goal: 'Flip bits to build each target number. Three targets.',
    learned: 'Each bit is a power of two: bit i is worth 2ⁱ. Test bit i with (x >> i) & 1, set it with x | (1 << i), clear it with x & ~(1 << i), flip it with x ^ (1 << i). Taking the biggest bit that fits always works, because 2ⁱ is bigger than all lower bits added together.',
    mount: function (el, api) {
      var targets = [rnd(5, 31), rnd(32, 127), rnd(128, 255)], at = 0, v = 0, flips = 0;
      var head = h('div', 'g-row'), tg = h('span', 'g-range'), row = h('div', 'g-bits'), out = h('div', 'g-formula'), msg = h('div', 'g-msg');
      head.appendChild(tg);
      for (var i = 7; i >= 0; i--) {
        var b = h('button', 'g-bit'); b.type = 'button'; b.dataset.b = i; b.innerHTML = '<b>0</b><small>' + Math.pow(2, i) + '</small>';
        b.setAttribute('aria-label', 'Bit worth ' + Math.pow(2, i)); b.addEventListener('click', flip); row.appendChild(b);
      }
      function paint() {
        each(row.children, function (b) { var on = (v >> +b.dataset.b) & 1; b.classList.toggle('on', !!on); b.querySelector('b').textContent = on; });
        tg.innerHTML = 'target <b>' + targets[Math.min(at, 2)] + '</b> · ' + Math.min(at + 1, 3) + ' of 3';
        var parts = []; for (var i = 7; i >= 0; i--) if ((v >> i) & 1) parts.push(Math.pow(2, i));
        out.innerHTML = 'value <b>' + v + '</b> = ' + (parts.join(' + ') || '0') + '<br>binary ' + ('00000000' + v.toString(2)).slice(-8);
      }
      function flip() {
        if (at >= 3) return;
        v ^= 1 << +this.dataset.b; flips++; api.tick(); paint();
        if (v === targets[at]) {
          at++;
          if (at === 3) { msg.className = 'g-msg win'; msg.innerHTML = '<b>All three built in ' + flips + ' flips!</b>'; api.win(); return; }
          msg.className = 'g-msg win'; msg.innerHTML = '<b>' + targets[at - 1] + ' built.</b> Next target.'; v = 0; paint();
        } else if (v > targets[at]) { msg.className = 'g-msg warn'; msg.textContent = 'Too big. Turn off a high bit.'; }
        else { msg.className = 'g-msg'; msg.textContent = 'Need ' + (targets[at] - v) + ' more. Tip: take the biggest bit that still fits.'; }
      }
      msg.textContent = 'Tap a bit to flip it between 0 and 1.';
      [head, row, out, msg].forEach(function (x) { el.appendChild(x); });
      paint();
    }
  };

  /* 8. Two-pointer hunt: random sorted array and target; move L and R. */
  var pointers = {
    id: 'pointers', mid: 'dsa06', track: 'dsa', kicker: 'DSA 6 · Two Pointers', title: 'Two-pointer hunt',
    goal: 'Find two numbers that add up to the target by moving the left or right pointer.',
    learned: 'Because the array is sorted, a sum that is too small can only grow by moving L right, and a sum that is too big can only shrink by moving R left. Each move rules out a whole row of pairs, so one O(N) walk replaces checking all O(N²) pairs.',
    mount: function (el, api) {
      var n, a, T;
      do {
        n = pick([8, 9, 10]); a = shuffle(range(40)).slice(0, n).sort(function (x, y) { return x - y; });
        T = a[rnd(0, Math.floor(n / 2) - 1)] + a[rnd(Math.floor(n / 2), n - 1)];
      } while (a[0] + a[n - 1] === T);
      var L = 0, R = n - 1, moves = 0, over = false;
      var head = h('div', 'g-row'), tg = h('span', 'g-range'), row = h('div', 'g-cells'), ptr = h('div', 'g-ptr'), msg = h('div', 'g-msg'), ch = h('div', 'g-choices');
      var mvL = btn('L →', 'ghost'), mvR = btn('← R', 'ghost');
      row.style.gridTemplateColumns = ptr.style.gridTemplateColumns = 'repeat(' + n + ',1fr)';
      head.appendChild(tg); ch.appendChild(mvL); ch.appendChild(mvR);
      function paint() {
        row.innerHTML = a.map(function (v, k) { return '<span class="' + (k === L ? 'l' : k === R ? 'r' : (k < L || k > R ? 'x' : '')) + '">' + v + '</span>'; }).join('');
        ptr.innerHTML = a.map(function (_, k) { return '<span class="' + (k === L ? 'l' : k === R ? 'r' : '') + '">' + (k === L ? 'L' : k === R ? 'R' : '') + '</span>'; }).join('');
        tg.innerHTML = 'target <b>' + T + '</b> · ' + a[L] + ' + ' + a[R] + ' = <b>' + (a[L] + a[R]) + '</b> · moves ' + moves;
        tg.dataset.t = T; tg.dataset.s = a[L] + a[R];
      }
      function finish(win, html) { over = true; mvL.disabled = mvR.disabled = true; msg.className = 'g-msg' + (win ? ' win' : ''); msg.innerHTML = html; if (win) api.win(); }
      function move(side) {
        if (over) return;
        var s = a[L] + a[R], good = side === 'L' ? s < T : s > T;
        if (side === 'L') L++; else R--;
        moves++;
        if (good) { api.tick(); msg.className = 'g-msg'; msg.textContent = side === 'L' ? 'The sum was too small, so moving L right was the only way to grow it.' : 'The sum was too big, so moving R left was the only way to shrink it.'; }
        else { api.miss(); msg.className = 'g-msg warn'; msg.textContent = side === 'L' ? 'The sum was already too big. Moving L right made it bigger. Move R instead.' : 'The sum was already too small. Moving R left made it smaller. Move L instead.'; }
        paint();
        if (L >= R) return finish(false, 'The pointers met without finding ' + T + '. A wrong move skipped the pair. Tap New puzzle and follow the rule: too small → L, too big → R.');
        if (a[L] + a[R] === T) finish(true, '<b>' + a[L] + ' + ' + a[R] + ' = ' + T + '</b> in ' + moves + ' moves.');
      }
      mvL.addEventListener('click', function () { move('L'); });
      mvR.addEventListener('click', function () { move('R'); });
      msg.textContent = 'Start: L on the smallest number, R on the largest.';
      [head, row, ptr, ch, msg].forEach(function (x) { el.appendChild(x); });
      paint();
      if (a[L] + a[R] === T) finish(true, '<b>Lucky: the two ends already add up to ' + T + '.</b>');
    }
  };

  /* ---------- shared helpers for the round-based games ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function code(s) { return '<pre class="g-code">' + esc(s) + '</pre>'; }
  function choose(right, wrongs) {
    var out = [String(right)], seen = {}; seen[String(right)] = 1;
    wrongs.forEach(function (w) { w = String(w); if (out.length < 4 && !seen[w]) { seen[w] = 1; out.push(w); } });
    var s = shuffle(out);
    return { opts: s, ans: s.indexOf(String(right)) };
  }
  function item(q, right, wrongs, why) { var c = choose(right, wrongs); return { q: q, opts: c.opts, ans: c.ans, why: why }; }
  function rounds(el, api, items, need) {
    var at = 0, score = 0, n = items.length, answered = false;
    var head = h('div', 'g-row'), pos = h('span', 'g-range'), body = h('div', 'g-q'), ch = h('div', 'g-choices'), msg = h('div', 'g-msg'), nxt = btn('NEXT');
    head.appendChild(pos);
    function stat() { pos.innerHTML = 'round <b>' + (at + 1) + '</b> of ' + n + ' · score ' + score; }
    function show() {
      var it = items[at]; answered = false; stat(); body.innerHTML = it.q; ch.innerHTML = ''; nxt.hidden = true;
      ch.className = 'g-choices' + (it.opts.length > 2 ? ' col' : '');
      msg.className = 'g-msg'; msg.textContent = 'You need ' + need + ' of ' + n + ' right to win.';
      it.opts.forEach(function (o, i) { var b = btn(esc(o), 'ghost mono'); b.addEventListener('click', function () { answer(i, b); }); ch.appendChild(b); });
    }
    function answer(i, b) {
      if (answered) return;
      answered = true;
      var it = items[at], ok = i === it.ans;
      each(ch.children, function (x, k) { x.disabled = true; if (k === it.ans) x.classList.add('pick'); });
      if (ok) { score++; api.tick(); msg.className = 'g-msg win'; msg.innerHTML = '<b>Right.</b> ' + it.why; }
      else { b.classList.add('nope'); api.miss(); msg.className = 'g-msg'; msg.innerHTML = '<b>Not quite.</b> ' + it.why; }
      stat();
      if (at === n - 1) {
        if (score >= need) { msg.innerHTML += ' <b>' + score + '/' + n + ', you win!</b>'; api.win(); }
        else msg.innerHTML += ' <b>' + score + '/' + n + '.</b> Tap New puzzle for a fresh set.';
      } else nxt.hidden = false;
    }
    nxt.addEventListener('click', function () { at++; show(); });
    [head, body, ch, msg, nxt].forEach(function (x) { el.appendChild(x); });
    show();
  }
  function tbl(head, rows) {
    return '<table class="g-tbl"><tr>' + head.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + (c === null ? '<i>NULL</i>' : esc(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
  }

  /* 9. Kadane: tap the start and end of the best contiguous stretch. */
  var kadane = {
    id: 'kadane', cat: 'algo', mid: 'dsa05', track: 'dsa', kicker: 'DSA 5 · Arrays · Kadane', title: 'Best stretch',
    goal: 'Tap the first and the last number of the stretch (no gaps) with the biggest sum. Three tries.',
    learned: 'That is the maximum subarray problem. Kadane\'s algorithm solves it in one pass: cur = max(x, cur + x), best = max(best, cur). A negative running sum only drags the next numbers down, so you drop it and start fresh. O(N) time, O(1) space.',
    mount: function (el, api) {
      var n = pick([8, 9, 10]), a, best, bs, be;
      do {
        a = []; for (var i = 0; i < n; i++) a.push(rnd(-9, 9) || 2);
        best = -Infinity;
        for (var s = 0; s < n; s++) { var sum = 0; for (var e = s; e < n; e++) { sum += a[e]; if (sum > best) { best = sum; bs = s; be = e; } } }
      } while (a.filter(function (x) { return x < 0; }).length < 3 || (bs === 0 && be === n - 1) || be === bs);
      var start = null, tries = 3, over = false;
      var head = h('div', 'g-row'), st = h('span', 'g-range'), row = h('div', 'g-cells'), msg = h('div', 'g-msg');
      row.style.gridTemplateColumns = 'repeat(' + n + ',1fr)'; head.appendChild(st);
      function sumOf(lo, hi) { var t = 0; for (var k = lo; k <= hi; k++) t += a[k]; return t; }
      function paint(lo, hi, cls) {
        each(row.children, function (c, k) { c.className = (start === k ? 'l' : '') + (lo !== undefined && k >= lo && k <= hi ? ' ' + cls : ''); });
        st.innerHTML = 'tries left <b>' + tries + '</b>';
      }
      a.forEach(function (v, k) {
        var c = h('button', '', String(v)); c.type = 'button'; c.setAttribute('aria-label', 'Number ' + v + ' at position ' + (k + 1));
        c.addEventListener('click', function () {
          if (over) return;
          api.tick();
          if (start === null) { start = k; paint(); msg.className = 'g-msg'; msg.textContent = 'Now tap the last number of the stretch.'; return; }
          var lo = Math.min(start, k), hi = Math.max(start, k), got = sumOf(lo, hi);
          start = null; tries--;
          if (got === best) { over = true; paint(lo, hi, 'win'); msg.className = 'g-msg win'; msg.innerHTML = '<b>Best possible: ' + got + '.</b>'; api.win(); return; }
          api.miss();
          if (!tries) { over = true; paint(bs, be, 'win'); msg.className = 'g-msg'; msg.innerHTML = 'The best stretch was <b>' + a.slice(bs, be + 1).join(', ') + '</b> = ' + best + '. Tap New puzzle.'; return; }
          paint(lo, hi, 'bad'); msg.className = 'g-msg warn'; msg.innerHTML = 'That stretch sums to <b>' + got + '</b>. A bigger sum exists. Tip: drop a prefix once it goes negative.';
        });
        row.appendChild(c);
      });
      msg.textContent = 'Tap where the stretch starts.';
      [head, row, msg].forEach(function (x) { el.appendChild(x); });
      paint();
    }
  };

  /* 10. Prefix sums: answer range sums with one subtraction. */
  var prefix = {
    id: 'prefix', cat: 'algo', mid: 'dsa21', track: 'dsa', kicker: 'DSA 21 · Range Queries', title: 'Prefix sum sprint',
    goal: 'Answer each range sum with one subtraction on the prefix array P.',
    learned: 'P[k] is the sum of the first k numbers, so the sum of a[i..j] is P[j+1] − P[i]. Build P once in O(N); then every range sum is O(1) instead of O(N). Fenwick and segment trees keep the same idea working when the array changes.',
    mount: function (el, api) {
      var n = 8, a = [], P = [0], i;
      for (i = 0; i < n; i++) { a.push(rnd(1, 9)); P.push(P[i] + a[i]); }
      var idx = [], k;
      for (k = 0; k < n; k++) idx.push(k);
      var top = tbl(['i'].concat(idx), [['a[i]'].concat(a)]) + tbl(['k'].concat(idx.concat([n])), [['P[k]'].concat(P)]);
      var items = [];
      for (var r = 0; r < 4; r++) {
        var lo = rnd(0, n - 2), hi = rnd(lo + 1, n - 1), want = P[hi + 1] - P[lo];
        var lab = function (x, y) { return 'P[' + x + '] − P[' + y + '] = ' + (P[x] - P[y]); };
        var wr = [[hi, lo], [hi + 1, lo + 1], [hi, lo + 1]];
        if (lo > 0) wr.push([hi + 1, lo - 1]);
        items.push(item(top + '<p>Sum of <b>a[' + lo + '..' + hi + ']</b>, both ends included?</p>', lab(hi + 1, lo),
          wr.filter(function (w) { return w[0] <= n && w[1] >= 0 && w[0] > w[1]; }).map(function (w) { return lab(w[0], w[1]); }),
          'P[' + (hi + 1) + '] holds a[0..' + hi + '] and P[' + lo + '] holds ' + (lo ? 'a[0..' + (lo - 1) + ']' : 'nothing (0)') + ', so the difference is a[' + lo + '..' + hi + '] = ' + want + '.'));
      }
      rounds(el, api, items, 3);
    }
  };

  /* 11. Coin change: where greedy fails, DP finds the fewest coins. */
  var COINSETS = [[1, 3, 4], [1, 5, 6], [1, 4, 5], [1, 6, 9], [1, 7, 10], [1, 5, 8]];
  function minCoins(cs, x) {
    var d = [0], from = [0], v;
    for (v = 1; v <= x; v++) { d[v] = Infinity; cs.forEach(function (c) { if (c <= v && d[v - c] + 1 < d[v]) { d[v] = d[v - c] + 1; from[v] = c; } }); }
    var used = []; for (v = x; v > 0; v -= from[v]) used.push(from[v]);
    return used.sort(function (p, q) { return q - p; });
  }
  function greedyCoins(cs, x) { var used = []; cs.slice().sort(function (p, q) { return q - p; }).forEach(function (c) { while (x >= c) { x -= c; used.push(c); } }); return used; }
  var coins = {
    id: 'coins', cat: 'algo', mid: 'dsa17', track: 'dsa', kicker: 'DSA 17 · Dynamic Programming', title: 'Coin change trap',
    goal: 'What is the fewest number of coins that makes the amount? Watch out: the biggest coin first is not always best.',
    learned: 'Greedy (biggest coin first) only works for some coin systems. DP always works: best[v] = 1 + min(best[v − c]) over every coin c, filled from 0 up to the amount. That is O(amount × coins) time and the classic first DP problem.',
    mount: function (el, api) {
      var items = [], traps = 0;
      for (var t = 0; items.length < 4 && t < 500; t++) {
        var cs = pick(COINSETS), x = rnd(6, 24), d = minCoins(cs, x), g = greedyCoins(cs, x), trap = g.length > d.length;
        if (trap ? traps >= 3 : items.length - traps >= 1) continue;
        if (trap) traps++;
        items.push(item('<p>Coins <b>' + cs.join(', ') + '</b> (as many of each as you like). Amount <b>' + x + '</b>.</p>', d.length, [g.length, d.length + 1, d.length + 2, d.length - 1].filter(function (v) { return v > 0; }),
          'Best: ' + d.join(' + ') + ' = ' + x + ' (' + d.length + ' coins). Biggest-first takes ' + g.join(' + ') + ' (' + g.length + ' coins)' + (trap ? ', which is worse.' : ', which happens to be optimal here.')));
      }
      rounds(el, api, shuffle(items), 3);
    }
  };

  /* 12. Merge two sorted lists by always taking the smaller head. */
  var merge = {
    id: 'merge', cat: 'algo', mid: 'dsa12', track: 'dsa', kicker: 'DSA 12 · Linked Lists', title: 'Merge two lists',
    goal: 'Build one sorted list. Each step, take the head of list A or list B.',
    learned: 'Both lists are sorted, so the smaller of the two heads is the smallest of everything left. Merging takes N + M steps and O(1) extra space with a dummy node. Merge sort and k-way merges repeat exactly this step.',
    mount: function (el, api) {
      function list() { return shuffle(range(40)).slice(0, rnd(4, 5)).sort(function (p, q) { return p - q; }); }
      var A = list(), B = list(), out = [], miss = 0, over = false;
      var la = h('div', 'g-list'), lb = h('div', 'g-list'), lo = h('div', 'g-list out'), ch = h('div', 'g-choices'), msg = h('div', 'g-msg');
      var ta = btn('', 'ghost'), tb = btn('', 'ghost');
      ch.appendChild(ta); ch.appendChild(tb);
      function chips(lbl, xs, cls) { return '<span class="g-lab">' + lbl + '</span>' + (xs.length ? xs.map(function (v, i) { return '<span class="' + (i === 0 && cls ? cls : '') + '">' + v + '</span>'; }).join('<i>→</i>') : '<em>empty</em>'); }
      function paint() {
        la.innerHTML = chips('A', A, 'hd'); lb.innerHTML = chips('B', B, 'hd'); lo.innerHTML = chips('out', out, '');
        ta.innerHTML = A.length ? 'Take A · ' + A[0] : 'A is empty'; tb.innerHTML = B.length ? 'Take B · ' + B[0] : 'B is empty';
        ta.disabled = over || !A.length; tb.disabled = over || !B.length;
      }
      function take(side) {
        if (over) return;
        var me = side === 'A' ? A : B, other = side === 'A' ? B : A;
        if (!me.length) return;
        if (other.length && me[0] > other[0]) { miss++; api.miss(); msg.className = 'g-msg warn'; msg.innerHTML = me[0] + ' is bigger than ' + other[0] + '. Take the smaller head, or the output stops being sorted.'; return; }
        api.tick(); out.push(me.shift()); msg.className = 'g-msg'; msg.textContent = 'Took ' + out[out.length - 1] + '.';
        if (!A.length && !B.length) {
          over = true; paint();
          if (miss <= 1) { msg.className = 'g-msg win'; msg.innerHTML = '<b>Merged ' + out.length + ' numbers' + (miss ? ' with one slip' : ' perfectly') + '.</b>'; api.win(); }
          else { msg.className = 'g-msg'; msg.innerHTML = 'Merged, but with ' + miss + ' wrong picks. Win with at most one. Tap New puzzle.'; }
          return;
        }
        paint();
      }
      ta.addEventListener('click', function () { take('A'); });
      tb.addEventListener('click', function () { take('B'); });
      msg.textContent = 'Compare the two heads and take the smaller one.';
      [la, lb, ch, lo, msg].forEach(function (x) { el.appendChild(x); });
      paint();
    }
  };

  /* 13. Tree walks: tap the nodes in pre-, in-, post- or level order. */
  var WALKS = [
    { id: 'pre', name: 'preorder (node, left, right)' }, { id: 'in', name: 'inorder (left, node, right)' },
    { id: 'post', name: 'postorder (left, right, node)' }, { id: 'level', name: 'level order (BFS, row by row)' }
  ];
  var treewalk = {
    id: 'treewalk', cat: 'algo', mid: 'dsa14', track: 'dsa', kicker: 'DSA 14 · Trees', title: 'Tree walk',
    goal: 'Tap the nodes in the order the traversal visits them.',
    learned: 'Preorder visits a node before its children, inorder between them, postorder after them; all three are one recursive DFS with the visit line moved. Level order is BFS with a queue. Every walk touches each node once: O(N).',
    mount: function (el, api) {
      var has = { 1: 1, 2: 1, 3: 1 }, val = {}, k;
      do { for (k = 4; k <= 7; k++) { if (Math.random() < 0.7) has[k] = 1; else delete has[k]; } } while (Object.keys(has).length < 5);
      var vals = shuffle(range(60)), vi = 0; Object.keys(has).forEach(function (x) { val[x] = vals[vi++]; });
      var w = pick(WALKS), order = [];
      function dfs(x) { if (!has[x]) return; if (w.id === 'pre') order.push(x); dfs(2 * x); if (w.id === 'in') order.push(x); dfs(2 * x + 1); if (w.id === 'post') order.push(x); }
      if (w.id === 'level') order = Object.keys(has).map(Number).sort(function (p, q) { return p - q; }); else dfs(1);
      var at = 0, miss = 0, over = false;
      var head = h('div', 'g-row'), st = h('span', 'g-range'), box = h('div', 'g-tree'), out = h('div', 'g-formula'), msg = h('div', 'g-msg');
      head.appendChild(st);
      function lvl(x) { return Math.floor(Math.log2(x)); }
      function px(x) { var L = lvl(x); return (x - Math.pow(2, L) + 0.5) / Math.pow(2, L) * 100; }
      function py(x) { return 28 + lvl(x) * 66; }
      var svg = '<svg viewBox="0 0 100 200" preserveAspectRatio="none" aria-hidden="true">';
      Object.keys(has).forEach(function (x) { x = +x; if (x > 1) svg += '<line x1="' + px(x >> 1) + '" y1="' + py(x >> 1) + '" x2="' + px(x) + '" y2="' + py(x) + '" vector-effect="non-scaling-stroke"/>'; });
      box.innerHTML = svg + '</svg>';
      Object.keys(has).forEach(function (x) {
        x = +x;
        var b = h('button', 'g-node', String(val[x])); b.type = 'button'; b.style.left = px(x) + '%'; b.style.top = py(x) + 'px'; b.setAttribute('aria-label', 'Node ' + val[x]);
        b.addEventListener('click', function () {
          if (over || b.classList.contains('done')) return;
          if (x !== order[at]) { miss++; api.miss(); b.classList.add('nope'); setTimeout(function () { b.classList.remove('nope'); }, 400); msg.className = 'g-msg warn'; msg.textContent = 'Not next in ' + w.name + '. Mistakes: ' + miss + ' (win with at most 2).'; return; }
          api.tick(); b.classList.add('done'); b.dataset.n = at + 1; at++;
          out.innerHTML = 'visited: <b>' + order.slice(0, at).map(function (y) { return val[y]; }).join(' → ') + '</b>';
          if (at === order.length) {
            over = true;
            if (miss <= 2) { msg.className = 'g-msg win'; msg.innerHTML = '<b>Perfect ' + w.id + ' walk' + (miss ? ' (' + miss + ' slip' + (miss > 1 ? 's' : '') + ')' : '') + '.</b>'; api.win(); }
            else { msg.className = 'g-msg'; msg.innerHTML = 'Done with ' + miss + ' mistakes. Win with at most 2. Tap New puzzle.'; }
          } else { msg.className = 'g-msg'; msg.textContent = 'Good. Next?'; }
        });
        box.appendChild(b);
      });
      st.innerHTML = 'walk: <b>' + w.id + '</b>';
      out.innerHTML = 'visited: <b>none yet</b>';
      msg.textContent = 'Order: ' + w.name + '. Tap the first node.';
      [head, box, out, msg].forEach(function (x) { el.appendChild(x); });
    }
  };

  /* 14. Heap insert: decide swap-or-stop as a new value bubbles up. */
  var heap = {
    id: 'heap', cat: 'algo', mid: 'dsa15', track: 'dsa', kicker: 'DSA 15 · Heaps', title: 'Heap climb',
    goal: 'Insert 3 numbers into the min-heap. At each step: swap with the parent, or stop?',
    learned: 'A new value starts at the end of the array and bubbles up while it is smaller than its parent at (i − 1) / 2. Each swap climbs one level, so an insert costs at most the tree height: O(log N). No pointers needed: the children of i live at 2i + 1 and 2i + 2.',
    mount: function (el, api) {
      var pool = shuffle(range(70)), a = pool.slice(0, 6).sort(function (p, q) { return p - q; }), adds = pool.slice(6, 9), ai = 0, cur, miss = 0, over = false;
      var head = h('div', 'g-row'), st = h('span', 'g-range'), row = h('div', 'g-cells'), f = h('div', 'g-formula'), ch = h('div', 'g-choices'), msg = h('div', 'g-msg');
      var sw = btn('SWAP ↑', 'ghost'), stop = btn('STOP', 'ghost');
      ch.appendChild(sw); ch.appendChild(stop); head.appendChild(st);
      function par(i) { return Math.floor((i - 1) / 2); }
      function start() { a.push(adds[ai]); cur = a.length - 1; settle(); }
      function settle() {
        if (cur === 0) { msg.className = 'g-msg'; msg.innerHTML = adds[ai] + ' reached the root: it is the new minimum.'; return next(); }
        paint();
      }
      function next() {
        ai++;
        if (ai === adds.length) {
          over = true; paint();
          if (miss <= 1) { msg.className = 'g-msg win'; msg.innerHTML += ' <b>All 3 inserted' + (miss ? ' with one slip' : ' perfectly') + '.</b>'; api.win(); }
          else msg.innerHTML += ' ' + miss + ' wrong calls. Win with at most one. Tap New puzzle.';
          return;
        }
        a.push(adds[ai]); cur = a.length - 1; settle();
      }
      function paint() {
        row.style.gridTemplateColumns = 'repeat(' + a.length + ',1fr)';
        row.innerHTML = a.map(function (v, k) { return '<span class="' + (over ? '' : k === cur ? 'l' : k === par(cur) ? 'r' : '') + '">' + v + '</span>'; }).join('');
        st.innerHTML = 'inserting <b>' + (adds[Math.min(ai, 2)]) + '</b> · ' + Math.min(ai + 1, 3) + ' of 3';
        f.innerHTML = over ? 'heap: ' + a.join(', ') : 'i = ' + cur + ', parent = (' + cur + ' − 1) / 2 = ' + par(cur) + ' → a[' + par(cur) + '] = <b>' + a[par(cur)] + '</b>';
        sw.disabled = stop.disabled = over;
      }
      function decide(doSwap) {
        if (over) return;
        var p = par(cur), should = a[cur] < a[p];
        if (doSwap === should) { api.tick(); msg.className = 'g-msg'; msg.textContent = should ? a[cur] + ' < ' + a[p] + ', so it climbs.' : a[cur] + ' > ' + a[p] + ', so it stays. Heap order holds.'; }
        else { miss++; api.miss(); msg.className = 'g-msg warn'; msg.textContent = should ? a[cur] + ' is smaller than its parent ' + a[p] + ', so it must climb. Swapped for you.' : a[cur] + ' is bigger than its parent ' + a[p] + ', so it must stop. Stopped for you.'; }
        if (should) { var t = a[cur]; a[cur] = a[p]; a[p] = t; cur = p; settle(); }
        else next();
      }
      sw.addEventListener('click', function () { decide(true); });
      stop.addEventListener('click', function () { decide(false); });
      msg.textContent = 'The heap is stored as an array. The new value is highlighted, its parent in purple.';
      [head, row, f, ch, msg].forEach(function (x) { el.appendChild(x); });
      start();
    }
  };

  /* 15. Dijkstra: always lock the closest unvisited node. */
  var dijkstra = {
    id: 'dijkstra', cat: 'algo', mid: 'dsa20', track: 'dsa', kicker: 'DSA 20 · Shortest Paths', title: 'Dijkstra\'s pick',
    goal: 'Distances from A. Each step, lock the unlocked node with the smallest distance so far.',
    learned: 'With non-negative weights, the closest unlocked node can never get closer later, so locking it is safe. Then relax its edges: dist[v] = min(dist[v], dist[u] + w). A min-heap finds the next node fast: O((V + E) log V).',
    mount: function (el, api) {
      var N = 5, names = 'ABCDE', E = [], seen = {}, i;
      function add(u, v) { var k = Math.min(u, v) + '-' + Math.max(u, v); if (u === v || seen[k]) return; seen[k] = 1; E.push([Math.min(u, v), Math.max(u, v), rnd(1, 9)]); }
      for (i = 1; i < N; i++) add(i, rnd(0, i - 1));
      for (var t = 0; t < 12 && E.length < 7; t++) add(rnd(0, N - 1), rnd(0, N - 1));
      var dist = [0, Infinity, Infinity, Infinity, Infinity], lock = {}, miss = 0, over = false;
      var eg = h('div', 'g-formula'), row = h('div', 'g-choices many'), msg = h('div', 'g-msg');
      eg.innerHTML = 'edges: ' + E.map(function (e) { return names[e[0]] + '–' + names[e[1]] + ' <b>' + e[2] + '</b>'; }).join(' · ');
      var B = [];
      for (i = 0; i < N; i++) (function (u) { var b = btn('', 'ghost'); b.addEventListener('click', function () { pickNode(u); }); row.appendChild(b); B.push(b); })(i);
      function paint() { B.forEach(function (b, u) { b.innerHTML = names[u] + '<small>' + (isFinite(dist[u]) ? dist[u] : '∞') + (lock[u] ? ' ✓' : '') + '</small>'; b.classList.toggle('pick', !!lock[u]); b.disabled = over || !!lock[u]; }); }
      function pickNode(u) {
        if (over || lock[u]) return;
        var best = Infinity; for (var v = 0; v < N; v++) if (!lock[v] && dist[v] < best) best = dist[v];
        if (dist[u] !== best) { miss++; api.miss(); msg.className = 'g-msg warn'; msg.innerHTML = names[u] + ' is at ' + (isFinite(dist[u]) ? dist[u] : '∞') + ', but an unlocked node is at <b>' + best + '</b>. Lock the smallest.'; return; }
        api.tick(); lock[u] = 1;
        var upd = [];
        E.forEach(function (e) { var v = e[0] === u ? e[1] : e[1] === u ? e[0] : -1; if (v < 0 || lock[v]) return; if (dist[u] + e[2] < dist[v]) { dist[v] = dist[u] + e[2]; upd.push(names[v] + ' → ' + dist[v]); } });
        msg.className = 'g-msg'; msg.innerHTML = 'Locked <b>' + names[u] + ' = ' + dist[u] + '</b>.' + (upd.length ? ' Relaxed: ' + upd.join(', ') + '.' : ' No distance improved.');
        if (Object.keys(lock).length === N) {
          over = true;
          if (miss <= 1) { msg.className = 'g-msg win'; msg.innerHTML += ' <b>All shortest distances found' + (miss ? ' with one slip' : '') + '.</b>'; api.win(); }
          else msg.innerHTML += ' Done with ' + miss + ' wrong picks. Win with at most one. Tap New puzzle.';
        }
        paint();
      }
      msg.textContent = 'A starts at 0, everything else at ∞. Lock A first.';
      [eg, row, msg].forEach(function (x) { el.appendChild(x); });
      paint();
    }
  };

  /* SQL helpers: a small random employee table with one NULL department. */
  var PEOPLE = ['Asha', 'Ben', 'Chen', 'Dina', 'Eli', 'Farah', 'Gus', 'Hana', 'Ivan', 'Jai', 'Kim', 'Lola'], DEPTS = ['Eng', 'Sales', 'Ops'];
  function empTable() {
    for (;;) {
      var sal = shuffle(range(20)).slice(0, 6).map(function (x) { return 40 + x * 5; });
      var rows = shuffle(PEOPLE).slice(0, 6).map(function (nm, i) { return { name: nm, dept: i === 5 ? null : pick(DEPTS), salary: sal[i] }; });
      rows = shuffle(rows);
      var cnt = {}; rows.forEach(function (r) { if (r.dept) cnt[r.dept] = (cnt[r.dept] || 0) + 1; });
      if (Object.keys(cnt).length >= 2 && Object.keys(cnt).some(function (d) { return cnt[d] >= 2; })) return rows;
    }
  }
  function empHtml(rows) { return tbl(['name', 'dept', 'salary'], rows.map(function (r) { return [r.name, r.dept, r.salary]; })); }
  function deptsOf(rows) { var d = []; rows.forEach(function (r) { if (r.dept && d.indexOf(r.dept) < 0) d.push(r.dept); }); return d; }

  /* 16. WHERE: tap the rows the query returns. */
  var sqlwhere = {
    id: 'sqlwhere', cat: 'sql', mid: 'sql02', track: 'sql', kicker: 'SQL 2 · SELECT & WHERE', title: 'Which rows come back?',
    goal: 'Read the query, tap every row it returns, then run it. Three queries.',
    learned: 'WHERE keeps a row only when the condition is TRUE. Any comparison with NULL is UNKNOWN, not TRUE, so dept <> \'Eng\' drops the NULL row too; use IS NULL to find it. AND needs both sides, OR needs one, and ORDER BY … LIMIT picks rows after sorting.',
    mount: function (el, api) {
      var T = empTable(), D = deptsOf(T), sals = T.map(function (r) { return r.salary; }).sort(function (p, q) { return p - q; });
      var Q = shuffle([
        function () { var x = sals[rnd(1, 4)]; return { sql: "SELECT name FROM emp\nWHERE salary > " + x + ";", f: function (r) { return r.salary > x; }, why: 'Strictly greater: the row with exactly ' + x + ' is not included.' }; },
        function () { var d = pick(D), x = sals[rnd(1, 3)]; return { sql: "SELECT name FROM emp\nWHERE dept = '" + d + "' AND salary >= " + x + ";", f: function (r) { return r.dept === d && r.salary >= x; }, why: 'AND needs both conditions to be true.' }; },
        function () { var d = pick(D), x = sals[rnd(1, 3)]; return { sql: "SELECT name FROM emp\nWHERE dept = '" + d + "' OR salary < " + x + ";", f: function (r) { return r.dept === d || r.salary < x; }, why: 'OR keeps a row when either side is true.' }; },
        function () { var d = pick(D); return { sql: "SELECT name FROM emp\nWHERE dept <> '" + d + "';", f: function (r) { return r.dept !== null && r.dept !== d; }, why: 'NULL <> \'' + d + '\' is UNKNOWN, so the NULL row is dropped.' }; },
        function () { return { sql: "SELECT name FROM emp\nORDER BY salary DESC\nLIMIT 2;", f: function (r) { return r.salary >= sals[sals.length - 2]; }, why: 'Sort by salary, highest first, then keep the first 2.' }; },
        function () { var lo = sals[1], hi = sals[3]; return { sql: "SELECT name FROM emp\nWHERE dept IS NULL\n   OR salary BETWEEN " + lo + " AND " + hi + ";", f: function (r) { return r.dept === null || (r.salary >= lo && r.salary <= hi); }, why: 'BETWEEN includes both ends, and IS NULL is the way to match NULL.' }; }
      ]).slice(0, 3).map(function (mk) { return mk(); });
      var at = 0, score = 0, sel = {}, done = false;
      var head = h('div', 'g-row'), st = h('span', 'g-range'), q = h('div', 'g-q'), rows = h('div', 'g-rows'), msg = h('div', 'g-msg'), run = btn('RUN QUERY'), nxt = btn('NEXT QUERY');
      head.appendChild(st);
      var hdr = h('div', 'g-rh', '<span>name</span><span>dept</span><span>salary</span>'); rows.appendChild(hdr);
      var RB = T.map(function (r, k) {
        var b = h('button', 'g-r', '<span>' + esc(r.name) + '</span><span>' + (r.dept === null ? '<i>NULL</i>' : esc(r.dept)) + '</span><span>' + r.salary + '</span>'); b.type = 'button';
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () { if (done) return; sel[k] = !sel[k]; b.classList.toggle('on', !!sel[k]); b.setAttribute('aria-pressed', sel[k] ? 'true' : 'false'); api.tick(); });
        rows.appendChild(b); return b;
      });
      function show() {
        sel = {}; done = false; q.innerHTML = code(Q[at].sql); nxt.hidden = true; run.hidden = false;
        RB.forEach(function (b) { b.className = 'g-r'; b.setAttribute('aria-pressed', 'false'); });
        st.innerHTML = 'query <b>' + (at + 1) + '</b> of 3 · score ' + score; msg.className = 'g-msg'; msg.textContent = 'Tap the rows this query returns (none is a valid answer), then Run.';
      }
      run.addEventListener('click', function () {
        if (done) return;
        done = true; run.hidden = true;
        var ok = true, names = [];
        T.forEach(function (r, k) { var want = Q[at].f(r); if (want) names.push(r.name); if (!!sel[k] !== want) ok = false; RB[k].classList.add(want ? 'yes' : 'no'); });
        if (ok) { score++; msg.className = 'g-msg win'; msg.innerHTML = '<b>Exactly right.</b> '; } else { api.miss(); msg.className = 'g-msg'; msg.innerHTML = '<b>Not quite.</b> '; }
        msg.innerHTML += 'Result: ' + (names.length ? names.map(esc).join(', ') : 'no rows') + '. ' + Q[at].why;
        st.innerHTML = 'query <b>' + (at + 1) + '</b> of 3 · score ' + score;
        if (at === 2) { if (score >= 2) { msg.innerHTML += ' <b>' + score + '/3, you win!</b>'; api.win(); } else msg.innerHTML += ' <b>' + score + '/3.</b> You need 2. Tap New puzzle.'; }
        else nxt.hidden = false;
      });
      nxt.addEventListener('click', function () { at++; show(); });
      [head, q, rows, run, msg, nxt].forEach(function (x) { el.appendChild(x); });
      show();
    }
  };

  /* 17. GROUP BY and aggregates. */
  var groupby = {
    id: 'groupby', cat: 'sql', mid: 'sql03', track: 'sql', kicker: 'SQL 3 · GROUP BY & Aggregates', title: 'Group it up',
    goal: 'Predict what each aggregate query returns. Four queries.',
    learned: 'GROUP BY makes one output row per distinct value, and NULL forms its own group. COUNT(*) counts rows, COUNT(col) skips NULLs. WHERE filters rows before grouping; HAVING filters groups after.',
    mount: function (el, api) {
      var T = empTable(), D = deptsOf(T), tab = empHtml(T);
      function rowsOf(d) { return T.filter(function (r) { return r.dept === d; }); }
      var groups = D.length + 1, nn = T.filter(function (r) { return r.dept !== null; }).length;
      var big = D.filter(function (d) { return rowsOf(d).length >= 2; }).length;
      var d1 = pick(D), s1 = rowsOf(d1).reduce(function (a, r) { return a + r.salary; }, 0), d2 = pick(D), m2 = Math.max.apply(null, rowsOf(d2).map(function (r) { return r.salary; }));
      var items = shuffle([
        item(tab + code('SELECT dept, COUNT(*)\nFROM emp\nGROUP BY dept;') + '<p>How many rows come back?</p>', groups, [groups - 1, T.length, groups + 1], 'One row per group: ' + D.join(', ') + ' and the NULL group = ' + groups + '.'),
        item(tab + code("SELECT SUM(salary)\nFROM emp\nWHERE dept = '" + d1 + "';"), s1, [s1 + rowsOf(d1)[0].salary, s1 - rowsOf(d1)[0].salary, rowsOf(d1).length], 'The ' + d1 + ' salaries are ' + rowsOf(d1).map(function (r) { return r.salary; }).join(' + ') + ' = ' + s1 + '.'),
        item(tab + code('SELECT dept\nFROM emp\nGROUP BY dept\nHAVING COUNT(*) >= 2;') + '<p>How many rows come back?</p>', big, [big + 1, groups, big - 1].filter(function (v) { return v >= 0; }), 'Only groups with at least 2 rows survive HAVING: ' + (D.filter(function (d) { return rowsOf(d).length >= 2; }).join(', ') || 'none') + '.'),
        item(tab + code('SELECT COUNT(dept)\nFROM emp;'), nn, [T.length, nn - 1, groups], 'COUNT(dept) skips the NULL, so it is ' + nn + ', while COUNT(*) would be ' + T.length + '.'),
        item(tab + code("SELECT MAX(salary)\nFROM emp\nWHERE dept = '" + d2 + "';"), m2, shuffle(T.map(function (r) { return r.salary; })).filter(function (v) { return v !== m2; }), 'The highest ' + d2 + ' salary is ' + m2 + '.')
      ]).slice(0, 4);
      rounds(el, api, items, 3);
    }
  };

  /* 18. JOIN row counts. */
  var joins = {
    id: 'joins', cat: 'sql', mid: 'sql04', track: 'sql', kicker: 'SQL 4 · JOINs', title: 'Join counter',
    goal: 'How many rows does each JOIN return? Four queries.',
    learned: 'INNER JOIN keeps only matching pairs, and one user with 3 orders gives 3 rows. LEFT JOIN also keeps unmatched left rows, filled with NULLs. LEFT JOIN … WHERE right.id IS NULL finds rows with no match (an anti-join). CROSS JOIN pairs everything: rows × rows.',
    mount: function (el, api) {
      var U, O, nm;
      for (;;) {
        nm = shuffle(PEOPLE).slice(0, 4); U = [1, 2, 3, 4];
        O = []; var k = rnd(5, 6); for (var i = 0; i < k; i++) O.push({ id: 100 + i, uid: rnd(1, 5) });
        var none = U.filter(function (u) { return !O.some(function (o) { return o.uid === u; }); }).length, orphan = O.filter(function (o) { return o.uid === 5; }).length;
        if (none >= 1 && orphan >= 1) break;
      }
      var cnt = function (u) { return O.filter(function (o) { return o.uid === u; }).length; };
      var inner = O.filter(function (o) { return o.uid <= 4; }).length, left = U.reduce(function (a, u) { return a + Math.max(1, cnt(u)); }, 0);
      var anti = U.filter(function (u) { return !cnt(u); }).length, oleft = O.length, cross = U.length * O.length;
      var tabs = '<div class="g-two">' + tbl(['users.id', 'name'], U.map(function (u) { return [u, nm[u - 1]]; })) + tbl(['orders.id', 'user_id'], O.map(function (o) { return [o.id, o.uid]; })) + '</div>';
      var items = shuffle([
        item(tabs + code('SELECT *\nFROM users u\nJOIN orders o ON o.user_id = u.id;'), inner, [left, oleft, inner - 1, U.length], 'Only orders whose user_id exists in users match: ' + inner + ' rows. The order for user 5 has no user.'),
        item(tabs + code('SELECT *\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id;'), left, [inner, U.length, left + 1, oleft], 'Every user appears; matched users once per order, users with no order once with NULLs: ' + left + ' rows.'),
        item(tabs + code('SELECT u.name\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nWHERE o.id IS NULL;'), anti, [anti + 1, 0, U.length - anti], 'Users with no orders keep NULLs on the order side: ' + anti + ' row' + (anti === 1 ? '' : 's') + '.'),
        item(tabs + code('SELECT *\nFROM orders o\nLEFT JOIN users u ON u.id = o.user_id;'), oleft, [inner, left, oleft - 1], 'Every order appears once (each has at most one user): ' + oleft + ' rows.'),
        item(tabs + code('SELECT *\nFROM users\nCROSS JOIN orders;'), cross, [U.length + O.length, inner, left], 'Every user with every order: ' + U.length + ' × ' + O.length + ' = ' + cross + '.')
      ]).slice(0, 4);
      rounds(el, api, items, 3);
    }
  };

  /* 19. Java output: integer maths, overflow, string concatenation, ++. */
  var javaout = {
    id: 'javaout', cat: 'java', mid: 'java02', track: 'java', kicker: 'Java 2 · Basics', title: 'Java output',
    goal: 'What does each snippet print? Five snippets.',
    learned: 'int / int truncates toward zero and % keeps the sign of the left side. int overflows silently (wraps around), even when stored into a long afterwards. + is evaluated left to right: numbers add until a String appears, then everything concatenates. char + int is an int.',
    mount: function (el, api) {
      var T = shuffle([
        function () { var b = rnd(2, 6), a = b * rnd(2, 6) + rnd(1, b - 1); return item(code('int a = ' + a + ', b = ' + b + ';\nSystem.out.println(a / b);'), Math.floor(a / b), [(a / b).toFixed(1), Math.floor(a / b) + 1, a % b], 'Both are int, so the decimals are dropped: ' + a + ' / ' + b + ' = ' + Math.floor(a / b) + '.'); },
        function () { var b = rnd(3, 7), a = b * rnd(1, 4) + rnd(1, b - 1); return item(code('System.out.println(-' + a + ' % ' + b + ');'), -(a % b), [b - a % b, a % b, 0], 'The result takes the sign of the left side: -' + a + ' % ' + b + ' = ' + (-(a % b)) + '.'); },
        function () { var x = rnd(1, 9), y = rnd(1, 9), z = rnd(1, 9); return item(code('System.out.println(' + x + ' + ' + y + ' + "' + z + '");'), String(x + y) + z, ['' + x + y + z, x + y + z, String(x) + (y + z)], 'Left to right: ' + x + ' + ' + y + ' = ' + (x + y) + ' first, then the String "' + z + '" is glued on.'); },
        function () { var x = rnd(1, 9), y = rnd(1, 9), z = rnd(1, 9); return item(code('System.out.println("' + z + '" + ' + x + ' + ' + y + ');'), '' + z + x + y, [String(z) + (x + y), z + x + y, '' + x + y + z], 'The String comes first, so each number is concatenated: "' + z + '" + ' + x + ' → "' + z + x + '", then + ' + y + '.'); },
        function () { return item(code('int x = Integer.MAX_VALUE;\nx++;\nSystem.out.println(x);'), -2147483648, [2147483648, 2147483647, 'ArithmeticException'], 'int overflow wraps silently from 2147483647 to -2147483648. No exception is thrown.'); },
        function () { var k = rnd(1, 9), L = String.fromCharCode(65 + k); return item(code("char c = 'A';\nc += " + k + ';\nSystem.out.println(c);'), L, [65 + k, String.fromCharCode(66 + k), 'A' + k], 'c += ' + k + ' moves the char ' + k + ' letters on, and printing a char shows the letter: ' + L + '.'); },
        function () { var k = rnd(1, 9); return item(code("System.out.println('A' + " + k + ');'), 65 + k, [String.fromCharCode(65 + k), 'A' + k, 65], "'A' + " + k + ' promotes the char to int: 65 + ' + k + ' = ' + (65 + k) + '.'); },
        function () { var x = rnd(2, 9); return item(code('int i = ' + x + ';\nint j = i++ + ++i;\nSystem.out.println(j);'), 2 * x + 2, [2 * x + 1, 2 * x, 2 * x + 3], 'i++ gives ' + x + ' (i becomes ' + (x + 1) + '), then ++i makes i ' + (x + 2) + ' and gives it: ' + x + ' + ' + (x + 2) + ' = ' + (2 * x + 2) + '.'); },
        function () { return item(code('int a = 100000;\nlong b = a * a;\nSystem.out.println(b);'), 1410065408, ['10000000000', -1410065408, 'compile error'], 'a * a is computed in int and overflows before it is widened to long. Write (long) a * a.'); }
      ]).slice(0, 5).map(function (f) { return f(); });
      rounds(el, api, T, 4);
    }
  };

  /* 20. Java equality: == compares references, equals compares values. */
  var javaeq = {
    id: 'javaeq', cat: 'java', mid: 'java05', track: 'java', kicker: 'Java 5 · Strings & Wrappers', title: '== or equals?',
    goal: 'true or false? Five snippets about == and equals.',
    learned: '== on objects compares references. String literals are interned, so two identical literals (and compile-time constants like "a" + "b") are the same object; new String(…) and runtime concatenation are not. Integer caches -128 to 127. Always compare values with equals.',
    mount: function (el, api) {
      var s = pick(['hi', 'java', 'code', 'map']);
      var T = shuffle([
        function () { return ['String a = "' + s + '";\nString b = "' + s + '";\nSystem.out.println(a == b);', true, 'Both literals point to the same interned String in the pool.']; },
        function () { return ['String a = new String("' + s + '");\nString b = "' + s + '";\nSystem.out.println(a == b);', false, 'new String always creates a new object, so the references differ.']; },
        function () { return ['String a = new String("' + s + '");\nString b = "' + s + '";\nSystem.out.println(a.equals(b));', true, 'equals compares the characters, which match.']; },
        function () { var n = pick([10, 100, 127, -128, 128, 200, 1000, -129]), r = n >= -128 && n <= 127; return ['Integer a = ' + n + ', b = ' + n + ';\nSystem.out.println(a == b);', r, r ? 'Autoboxing reuses cached Integer objects from -128 to 127.' : n + ' is outside the Integer cache (-128..127), so two separate objects are created.']; },
        function () { return ['String a = "ab";\nString b = "a" + "b";\nSystem.out.println(a == b);', true, '"a" + "b" is a compile-time constant, folded into the literal "ab".']; },
        function () { return ['String s = "a";\nString a = "ab";\nString b = s + "b";\nSystem.out.println(a == b);', false, 's + "b" runs at runtime and builds a new String.']; },
        function () { return ['String s = "a";\nString a = "ab";\nString b = (s + "b").intern();\nSystem.out.println(a == b);', true, 'intern() returns the pooled copy, the same object as the literal.']; },
        function () { return ['Integer a = 5;\nLong b = 5L;\nSystem.out.println(a.equals(b));', false, 'Integer.equals returns false for any object that is not an Integer, even with the same value.']; }
      ]).slice(0, 5).map(function (f) { var x = f(); var c = x[1] ? 0 : 1; return { q: code(x[0]), opts: ['true', 'false'], ans: c, why: x[2] }; });
      rounds(el, api, T, 4);
    }
  };

  /* 21. Event loop: tap the logs in the order they print. */
  var EL = [
    { k: 'log', code: function (L) { return "console.log('" + L[0] + "');"; }, n: 1, run: function (L, q, t, out) { out.push(L[0]); } },
    { k: 'timeout', code: function (L) { return "setTimeout(() => console.log('" + L[0] + "'), 0);"; }, n: 1, run: function (L, q, t) { t.push(L[0]); } },
    { k: 'then', code: function (L) { return "Promise.resolve().then(() => console.log('" + L[0] + "'));"; }, n: 1, run: function (L, q) { q.push([L[0]]); } },
    { k: 'micro', code: function (L) { return "queueMicrotask(() => console.log('" + L[0] + "'));"; }, n: 1, run: function (L, q) { q.push([L[0]]); } },
    { k: 'chain', code: function (L) { return "Promise.resolve()\n  .then(() => console.log('" + L[0] + "'))\n  .then(() => console.log('" + L[1] + "'));"; }, n: 2, run: function (L, q) { q.push([L[0], L[1]]); } },
    { k: 'async', code: function (L) { return "(async () => {\n  console.log('" + L[0] + "');\n  await null;\n  console.log('" + L[1] + "');\n})();"; }, n: 2, run: function (L, q, t, out) { out.push(L[0]); q.push([L[1]]); } }
  ];
  var eventloop = {
    id: 'eventloop', cat: 'js', mid: 'js08', track: 'js', kicker: 'JS 8 · Event Loop', title: 'Event loop order',
    goal: 'Tap the letters in the order the program prints them.',
    learned: 'Synchronous code runs first, top to bottom. Then the microtask queue drains completely (promise callbacks, queueMicrotask, code after await), including microtasks added while draining. Only then does the next macrotask, such as a setTimeout callback, run.',
    mount: function (el, api) {
      var stm, kinds;
      do { stm = []; for (var i = 0; i < 5; i++) stm.push(pick(EL)); kinds = stm.map(function (s) { return s.k; }); }
      while (kinds.indexOf('timeout') < 0 || (kinds.indexOf('then') < 0 && kinds.indexOf('micro') < 0 && kinds.indexOf('chain') < 0) || (kinds.indexOf('log') < 0 && kinds.indexOf('async') < 0) || stm.reduce(function (a, s) { return a + s.n; }, 0) > 7);
      var c = 0, src = [], out = [], q = [], t = [];
      stm.forEach(function (s) { var L = []; for (var j = 0; j < s.n; j++) L.push('ABCDEFGHIJ'[c++]); src.push(s.code(L)); s.run(L, q, t, out); });
      while (q.length) { var ch0 = q.shift(); out.push(ch0[0]); if (ch0.length > 1) q.push(ch0.slice(1)); }
      out = out.concat(t);
      var at = 0, miss = 0, over = false;
      var cd = h('div', 'g-q', code(src.join('\n'))), res = h('div', 'g-formula'), ch = h('div', 'g-choices many'), msg = h('div', 'g-msg');
      out.slice().sort().forEach(function (L) {
        var b = btn(L, 'ghost');
        b.addEventListener('click', function () {
          if (over || b.disabled) return;
          if (L !== out[at]) { miss++; api.miss(); b.classList.add('nope'); setTimeout(function () { b.classList.remove('nope'); }, 400); msg.className = 'g-msg warn'; msg.textContent = L + ' is not next. Mistakes: ' + miss + ' (win with at most 1).'; return; }
          api.tick(); b.disabled = true; b.classList.add('pick'); at++;
          res.innerHTML = 'printed: <b>' + out.slice(0, at).join(' ') + '</b>';
          if (at === out.length) {
            over = true;
            if (miss <= 1) { msg.className = 'g-msg win'; msg.innerHTML = '<b>Correct order: ' + out.join(' ') + '.</b>'; api.win(); }
            else { msg.className = 'g-msg'; msg.innerHTML = 'Order was ' + out.join(' ') + ', with ' + miss + ' mistakes. Tap New puzzle.'; }
          } else { msg.className = 'g-msg'; msg.textContent = 'Good. What prints next?'; }
        });
        ch.appendChild(b);
      });
      res.innerHTML = 'printed: <b>nothing yet</b>';
      msg.textContent = 'Sync code first, then all microtasks, then timers.';
      [cd, res, ch, msg].forEach(function (x) { el.appendChild(x); });
    }
  };

  /* 22. JavaScript coercion and truthiness. */
  var truthy = {
    id: 'truthy', cat: 'js', mid: 'js01', track: 'js', kicker: 'JS 1 · Types & Operators', title: 'Coercion quiz',
    goal: 'What does each expression evaluate to? Five expressions.',
    learned: '+ with a string concatenates; - always converts to numbers. == coerces types, === never does. The only falsy values are false, 0, -0, 0n, "", null, undefined and NaN; everything else, even "0", [] and "false", is truthy. ?? falls back only on null or undefined.',
    mount: function (el, api) {
      var a = rnd(2, 9), b = rnd(1, a - 1), x = rnd(1, 9), y = rnd(1, 9), z = rnd(1, 9);
      var T = shuffle([
        ['typeof null', '"object"', ['"null"', '"undefined"', '"number"'], 'A historic bug kept for compatibility: typeof null is "object".'],
        ['NaN === NaN', 'false', ['true'], 'NaN is the only value not equal to itself. Use Number.isNaN.'],
        ['null == undefined', 'true', ['false'], '== treats null and undefined as equal to each other and to nothing else.'],
        ['null === undefined', 'false', ['true'], '=== also checks the type, and the types differ.'],
        ["'" + a + "' + " + b, '"' + a + b + '"', [a + b, '"' + (a + b) + '"', 'NaN'], '+ with a string concatenates.'],
        ["'" + a + "' - " + b, String(a - b), ['"' + a + '-' + b + '"', 'NaN', '"' + (a - b) + '"'], '- only works on numbers, so the string is converted.'],
        ['[] + []', '""', ['[]', '0', 'undefined'], 'Both arrays become empty strings, and "" + "" is "".'],
        ['[' + x + ', ' + y + '] + [' + z + ']', '"' + x + ',' + y + z + '"', ['[' + x + ', ' + y + ', ' + z + ']', '"' + x + y + z + '"', '"' + x + ',' + y + ',' + z + '"'], 'Arrays turn into strings ("' + x + ',' + y + '" and "' + z + '"), then concatenate.'],
        ["0 || 'x'", '"x"', ['0', 'false', 'true'], '|| returns the first truthy operand, and 0 is falsy.'],
        ["0 ?? 'x'", '0', ['"x"', 'null', 'false'], '?? only falls back on null or undefined; 0 is kept.'],
        ["Boolean('0')", 'true', ['false'], 'Any non-empty string is truthy, even "0".'],
        ['[] == false', 'true', ['false'], '[] becomes "" and then 0, and false becomes 0, so they are loosely equal.'],
        ["!!'false'", 'true', ['false'], '"false" is a non-empty string, so it is truthy.']
      ]).slice(0, 5).map(function (r) { return item(code(r[0]), r[1], r[2], r[3]); });
      rounds(el, api, T, 4);
    }
  };

  /* 23. Python slicing. */
  function pySlice(a, start, stop, step) {
    var n = a.length, out = [], i;
    if (step > 0) {
      var s = start === null ? 0 : Math.max(0, Math.min(n, start < 0 ? start + n : start)), e = stop === null ? n : Math.max(0, Math.min(n, stop < 0 ? stop + n : stop));
      for (i = s; i < e; i += step) out.push(a[i]);
    } else {
      var s2 = start === null ? n - 1 : (start < 0 ? Math.max(-1, start + n) : Math.min(n - 1, start)), e2 = stop === null ? -1 : (stop < 0 ? Math.max(-1, stop + n) : Math.min(n - 1, stop));
      for (i = s2; i > e2; i += step) out.push(a[i]);
    }
    return out;
  }
  function pyRepr(xs) { return '[' + xs.map(function (v) { return "'" + v + "'"; }).join(', ') + ']'; }
  var pyslice = {
    id: 'pyslice', cat: 'py', mid: 'py02', track: 'py', kicker: 'Python 2 · Collections', title: 'Slice it',
    goal: 'What does each slice return? Five slices.',
    learned: 'a[start:stop:step] includes start and excludes stop. Negative indexes count from the end (a[-1] is the last item). A missing start or stop means "from the edge", and a negative step walks backwards, so a[::-1] reverses. Out-of-range slices never raise; they just return fewer items.',
    mount: function (el, api) {
      var a = shuffle('abcdefghjkmnpqrstuvwxyz'.split('')).slice(0, 7).sort(), n = 7;
      function fmtS(s, e, st) { return 'a[' + (s === null ? '' : s) + ':' + (e === null ? '' : e) + (st === 1 ? '' : ':' + st) + ']'; }
      var gens = [
        function () { var s = rnd(1, 3), e = rnd(s + 2, 6); return [s, e, 1]; },
        function () { return [null, rnd(2, 5), 1]; },
        function () { return [rnd(2, 5), null, 1]; },
        function () { return [-rnd(2, 4), null, 1]; },
        function () { return [null, -rnd(1, 3), 1]; },
        function () { return [null, null, -1]; },
        function () { return [rnd(0, 1), null, 2]; },
        function () { return [null, null, -2]; },
        function () { var s = rnd(4, 6); return [s, rnd(1, 2), -1]; },
        function () { var s = rnd(4, 6); return [s, rnd(1, 3), 1]; }
      ];
      var T = shuffle(gens).slice(0, 5).map(function (g) {
        var p = g(), right = pySlice(a, p[0], p[1], p[2]), wr = [];
        [[1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0]].forEach(function (d) {
          var s = p[0] === null ? null : p[0] + d[0], e = p[1] === null ? (d[1] ? (p[2] > 0 ? n - 1 : 0) : null) : p[1] + d[1];
          wr.push(pyRepr(pySlice(a, s, e, p[2])));
        });
        wr.push(pyRepr(right.slice().reverse()));
        return item('<p>a = ' + esc(pyRepr(a)) + '</p>' + code(fmtS(p[0], p[1], p[2])), pyRepr(right), wr.filter(function (w) { return w !== pyRepr(right); }).concat(['[]', pyRepr(a)]),
          'Start ' + (p[0] === null ? (p[2] > 0 ? 'at the beginning' : 'at the end') : 'at index ' + p[0]) + ', stop before ' + (p[1] === null ? 'the edge' : 'index ' + p[1]) + ', step ' + p[2] + '.');
      });
      rounds(el, api, T, 4);
    }
  };

  /* 24. Subnetting. */
  function ipStr(o) { return o.join('.'); }
  var subnet = {
    id: 'subnet', cat: 'cs', mid: 'cs11', track: 'cs', kicker: 'CS 11 · IP Addressing', title: 'Subnet sprint',
    goal: 'Work out hosts, network and broadcast addresses. Four questions.',
    learned: 'A /n network has 2^(32 − n) addresses in one block. The network address is the IP with the host bits cleared (round down to a multiple of the block size), the broadcast is network + block − 1, and the usable hosts are block − 2.',
    mount: function (el, api) {
      function q1() { var n = rnd(24, 30), b = Math.pow(2, 32 - n); return item('<p>How many usable host addresses in a <b>/' + n + '</b> network?</p>', b - 2, [b, b - 1, b / 2 - 2, b * 2 - 2], '/' + n + ' leaves ' + (32 - n) + ' host bits: 2^' + (32 - n) + ' = ' + b + ' addresses, minus network and broadcast = ' + (b - 2) + '.'); }
      function blk() { var n = rnd(25, 29), b = Math.pow(2, 32 - n), x = rnd(1, 254), y = rnd(1, 254), net = Math.floor(y / b) * b; return { n: n, b: b, x: x, y: y, net: net }; }
      function q2() { var k = blk(), ip = [10, 0, k.x, k.y]; return item('<p>Network address of <b>' + ipStr(ip) + '/' + k.n + '</b>?</p>', ipStr([10, 0, k.x, k.net]), [ipStr([10, 0, k.x, k.y]), ipStr([10, 0, k.x, (k.net + k.b) % 256]), ipStr([10, 0, k.x, 0]), ipStr([10, 0, k.x, Math.max(0, k.net - k.b)])], 'Block size ' + k.b + ': ' + k.y + ' rounds down to ' + k.net + '.'); }
      function q3() { var k = blk(), ip = [192, 168, k.x, k.y], bc = k.net + k.b - 1; return item('<p>Broadcast address of <b>' + ipStr(ip) + '/' + k.n + '</b>?</p>', ipStr([192, 168, k.x, bc]), [ipStr([192, 168, k.x, 255]), ipStr([192, 168, k.x, bc + 1]), ipStr([192, 168, k.x, k.net]), ipStr([192, 168, k.x, bc - 1])], 'Network ' + k.net + ' + block ' + k.b + ' − 1 = ' + bc + '.'); }
      function q4() {
        var k = blk(), inside = Math.random() < 0.5, z = inside ? k.net + rnd(0, k.b - 1) : (k.net + k.b + rnd(0, 20)) % 256;
        if (z >= k.net && z < k.net + k.b) inside = true;
        return { q: '<p>Is <b>172.16.' + k.x + '.' + z + '</b> inside <b>172.16.' + k.x + '.' + k.net + '/' + k.n + '</b>?</p>', opts: ['Yes', 'No'], ans: inside ? 0 : 1, why: 'The block runs from ' + k.net + ' to ' + (k.net + k.b - 1) + ', and ' + z + (inside ? ' is in it.' : ' is not.') };
      }
      rounds(el, api, shuffle([q1(), q2(), q3(), q4()]), 3);
    }
  };

  /* 25. LRU cache: hit or miss, and who gets evicted. */
  var lru = {
    id: 'lru', cat: 'cs', mid: 'hld06', track: 'hld', kicker: 'HLD 6 · Caching', title: 'LRU cache',
    goal: 'A cache holds 3 keys. For each request: hit, or miss and which key is evicted?',
    learned: 'Least Recently Used evicts the key that was touched longest ago. A hit moves the key to the front. A HashMap plus a doubly linked list gives O(1) get and put: the map finds the node, the list keeps the usage order.',
    mount: function (el, api) {
      var seq, keys = 'ABCDE';
      for (;;) {
        seq = []; for (var i = 0; i < 9; i++) seq.push(keys[rnd(0, 4)]);
        var c = [], hits = 0, ev = 0;
        seq.forEach(function (k) { var p = c.indexOf(k); if (p >= 0) { hits++; c.splice(p, 1); } else if (c.length === 3) { ev++; c.pop(); } c.unshift(k); });
        if (hits >= 2 && ev >= 2 && seq[0] !== seq[1]) break;
      }
      var cache = [], at = 0, miss = 0, over = false;
      var head = h('div', 'g-row'), st = h('span', 'g-range'), cv = h('div', 'g-list'), ch = h('div', 'g-choices col'), msg = h('div', 'g-msg');
      head.appendChild(st);
      function paint() {
        cv.innerHTML = '<span class="g-lab">cache</span>' + (cache.length ? cache.map(function (k, i) { return '<span class="' + (i === 0 ? 'hd' : '') + '">' + k + '</span>'; }).join('<i>→</i>') + '<em>(most → least recent)</em>' : '<em>empty</em>');
        st.innerHTML = over ? 'done' : 'request <b>' + seq[at] + '</b> · ' + (at + 1) + ' of ' + seq.length;
        ch.innerHTML = '';
        if (over) return;
        var opts = [['hit', 'Hit']];
        if (cache.length < 3) opts.push(['free', 'Miss · free slot']); else cache.forEach(function (k) { opts.push(['ev' + k, 'Miss · evict ' + k]); });
        opts.forEach(function (o) { var b = btn(o[1], 'ghost'); b.addEventListener('click', function () { answer(o[0]); }); ch.appendChild(b); });
      }
      function answer(v) {
        var k = seq[at], p = cache.indexOf(k), right = p >= 0 ? 'hit' : cache.length < 3 ? 'free' : 'ev' + cache[cache.length - 1];
        var said = right === 'hit' ? k + ' was in the cache: hit, and it moves to the front.' : right === 'free' ? k + ' was missing and there was room.' : k + ' was missing; ' + cache[cache.length - 1] + ' was used longest ago, so it is evicted.';
        if (v === right) { api.tick(); msg.className = 'g-msg'; msg.textContent = said; }
        else { miss++; api.miss(); msg.className = 'g-msg warn'; msg.textContent = 'Not quite. ' + said; }
        if (p >= 0) cache.splice(p, 1); else if (cache.length === 3) cache.pop();
        cache.unshift(k); at++;
        if (at === seq.length) {
          over = true;
          if (miss <= 1) { msg.className = 'g-msg win'; msg.innerHTML = '<b>All ' + seq.length + ' requests handled' + (miss ? ' with one slip' : ' perfectly') + '.</b>'; api.win(); }
          else msg.textContent += ' Finished with ' + miss + ' mistakes; win with at most one. Tap New puzzle.';
        }
        paint();
      }
      msg.textContent = 'The front of the list is the most recently used key.';
      [head, cv, ch, msg].forEach(function (x) { el.appendChild(x); });
      paint();
    }
  };

  /* 26. Python gotchas: predict the printed output. */
  var pygotcha = {
    id: 'pygotcha', cat: 'py', mid: 'py13', track: 'py', kicker: 'Python 13 · Gotchas', title: 'Python output',
    goal: 'What does each snippet print? Five snippets.',
    learned: 'Names are references: b = a shares one list, and [[0] * 2] * 2 repeats the same inner list. Default arguments are evaluated once, so a default [] is shared between calls. // floors toward minus infinity, ** groups right to left, and round() rounds halves to the even number.',
    mount: function (el, api) {
      var x = rnd(3, 9), y = rnd(2, 4) * 2 + 1;
      var T = shuffle([
        ['a = [1, 2]\nb = a\nb.append(' + x + ')\nprint(a)', '[1, 2, ' + x + ']', ['[1, 2]', '[' + x + ']', 'None'], 'b = a copies the reference, so both names see the same list.'],
        ['def add(v, acc=[]):\n    acc.append(v)\n    return acc\n\nadd(1)\nprint(add(' + x + '))', '[1, ' + x + ']', ['[' + x + ']', '[1]', '[]'], 'The default list is created once, when the function is defined, and reused by every call.'],
        ['print(' + y + ' // 2, -' + y + ' // 2)', ((y - 1) / 2) + ' ' + (-(y + 1) / 2), [((y - 1) / 2) + ' ' + (-(y - 1) / 2), (y / 2) + ' ' + (-y / 2), ((y + 1) / 2) + ' ' + (-(y + 1) / 2)], '// floors toward minus infinity, so -' + y + ' // 2 is ' + (-(y + 1) / 2) + ', not ' + (-(y - 1) / 2) + '.'],
        ['print(2 ** 3 ** 2)', '512', ['64', '36', '12'], '** groups right to left: 3 ** 2 = 9 first, then 2 ** 9 = 512.'],
        ['print(0.1 + 0.2 == 0.3)', 'False', ['True', 'Error'], '0.1 + 0.2 is 0.30000000000000004 in binary floating point. Use math.isclose.'],
        ['grid = [[0] * 2] * 2\ngrid[0][0] = ' + x + '\nprint(grid)', '[[' + x + ', 0], [' + x + ', 0]]', ['[[' + x + ', 0], [0, 0]]', '[[' + x + ', ' + x + '], [0, 0]]', '[[0, 0], [0, 0]]'], '* 2 on the outer list repeats a reference to the same inner list. Use [[0] * 2 for _ in range(2)].'],
        ['print(bool([]), bool([0]))', 'False True', ['False False', 'True True', 'True False'], 'An empty list is falsy; a list holding anything, even 0, is truthy.'],
        ['print(round(2.5), round(3.5))', '2 4', ['3 4', '2 3', '3 3'], 'round() uses banker\'s rounding: halves go to the even neighbour.'],
        ["s = 'ab'\nprint(s * " + (x % 3 + 2) + ')', "ab".repeat(x % 3 + 2), ['ab' + (x % 3 + 2), 'Error', 'ab'], 'A string times an int repeats it.']
      ]).slice(0, 5).map(function (r) { return item(code(r[0]), r[1], r[2], r[3]); });
      rounds(el, api, T, 4);
    }
  };

  var CATS = [['all', 'All'], ['algo', 'Algorithms'], ['sql', 'SQL'], ['java', 'Java'], ['js', 'JavaScript'], ['py', 'Python'], ['cs', 'CS & systems']];

  var LIST = [guess, race, pointers, oranges, lockers, brackets, swaps, bits, kadane, prefix, coins, merge, treewalk, heap, dijkstra, sqlwhere, groupby, joins, javaout, javaeq, eventloop, truthy, pyslice, pygotcha, subnet, lru];
  LIST.forEach(function (g) { g.cat = g.cat || 'algo'; });
  var BY = {}; LIST.forEach(function (g) { BY[g.id] = g; });
  var BYMOD = {}; LIST.forEach(function (g) { if (!BYMOD[g.mid]) BYMOD[g.mid] = g; });
  function inCat(cat) { return LIST.filter(function (g) { return !cat || cat === 'all' || g.cat === cat; }); }
  return {
    list: LIST,
    cats: CATS,
    inCat: inCat,
    get: function (id) { return BY[id]; },
    forModule: function (mid) { return BYMOD[mid]; },
    random: function (avoid, cat) { var c = inCat(cat).filter(function (g) { return g.id !== avoid; }); return pick(c.length ? c : LIST); },
    balanced: balanced, inversions: inversions, pySlice: pySlice, minCoins: minCoins, greedyCoins: greedyCoins
  };
})();
if (typeof module !== 'undefined') module.exports = Games;
