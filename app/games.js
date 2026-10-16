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

  var LIST = [guess, race, pointers, oranges, lockers, brackets, swaps, bits];
  var BY = {}; LIST.forEach(function (g) { BY[g.id] = g; });
  var BYMOD = {}; LIST.forEach(function (g) { BYMOD[g.mid] = g; });
  return {
    list: LIST,
    get: function (id) { return BY[id]; },
    forModule: function (mid) { return BYMOD[mid]; },
    random: function (avoid) { var c = LIST.filter(function (g) { return g.id !== avoid; }); return pick(c); },
    balanced: balanced, inversions: inversions
  };
})();
if (typeof module !== 'undefined') module.exports = Games;
