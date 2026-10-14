(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  function one(k, v) { var o = {}; o[k] = v; return o; }
  function nums(input, def, maxLen, what) {
    var s = String(input === undefined ? def : input).trim();
    if (!s) throw new Error('Please type some ' + what + ' separated by spaces, e.g. "' + def + '".');
    var a = s.split(/[\s,]+/).map(Number);
    if (a.some(function (x) { return !Number.isInteger(x); })) throw new Error('Only whole numbers please, separated by spaces, e.g. "' + def + '".');
    if (a.length > maxLen) throw new Error('Keep it to at most ' + maxLen + ' numbers so the movie stays short (backtracking grows very fast!).');
    return a;
  }
  function listTxt(a) { return '[' + a.join(',') + ']'; }

  // ---------- VIZ 1: call stack for fact / fib ----------
  function genCallStack(input) {
    var s = String(input === undefined ? 'fact 4' : input).trim().toLowerCase().split(/\s+/);
    var kind = s[0], n = Number(s[1]);
    if ((kind !== 'fact' && kind !== 'fib') || !Number.isInteger(n) || n < 0) throw new Error('Type "fact 4" or "fib 4" (function name, a space, then a whole number).');
    if (n < 2) throw new Error('Use n of at least 2 so there is something to watch, e.g. "fact 4".');
    if (kind === 'fact' && n > 8) throw new Error('Keep fact n between 0 and 8 so the stack fits on screen.');
    if (kind === 'fib' && n > 5) throw new Error('Keep fib n between 0 and 5 (fib makes a LOT of calls).');
    var frames = [], stack = [], depthMax = 0, calls = 0;
    function snap(narr, cls, vals) {
      var hl = {};
      if (stack.length) hl[stack.length - 1] = cls;
      vals.depth = stack.length; vals['max depth'] = depthMax; vals['calls so far'] = calls;
      frames.push({ narr: narr, parts: [
        { type: 'stack', label: 'Call stack (top box = the call running right now)', items: stack.map(function (f) { return f.txt; }), hl: hl },
        { type: 'vars', label: 'Variables of the top frame', vals: vals }
      ] });
    }
    frames.push({ narr: 'We will run <b>' + kind + '(' + n + ')</b>. Think of a stack of plates: every new call puts a plate (a <b>frame</b>) on top, every return takes the top plate off. Right now the stack is empty.', parts: [
      { type: 'stack', label: 'Call stack (top box = the call running right now)', items: [] },
      { type: 'vars', label: 'Variables of the top frame', vals: { depth: 0, 'max depth': 0 } }
    ] });
    var result;
    if (kind === 'fact') {
      var fact = function (k) {
        calls++;
        var fr = { txt: 'fact(' + k + ')  n=' + k + '  waiting for fact(' + (k - 1) + ')' };
        stack.push(fr); depthMax = Math.max(depthMax, stack.length);
        if (k <= 1) {
          fr.txt = 'fact(' + k + ')  n=' + k + '  returns 1';
          snap('Call <b>fact(' + k + ')</b> → a new frame with its own n = ' + k + '. Since n ≤ 1 this is the <b>base case</b>: return 1 immediately. No more calls — the dolls stop here.', 'ok', { n: k, returns: 1 });
          stack.pop();
          return 1;
        }
        snap('Call <b>fact(' + k + ')</b> → push a new frame holding n = ' + k + '. n &gt; 1, so this is the <b>recursive case</b>: it must first ask fact(' + (k - 1) + ') and <i>pause</i> until that answer comes back.', 'cur', { n: k, returns: '?' });
        var r = fact(k - 1);
        var v = k * r;
        fr.txt = 'fact(' + k + ')  n=' + k + '  = ' + k + ' × ' + r + ' = ' + v;
        snap('fact(' + (k - 1) + ') returned <b>' + r + '</b> and its frame was popped. fact(' + k + ') wakes up exactly where it paused and computes ' + k + ' × ' + r + ' = <b>' + v + '</b>. Now it returns and gets popped too.', 'ok', { n: k, 'child gave': r, returns: v });
        stack.pop();
        return v;
      };
      result = fact(n);
    } else {
      var fib = function (k) {
        calls++;
        var fr = { txt: 'fib(' + k + ')  a=?  b=?' };
        stack.push(fr); depthMax = Math.max(depthMax, stack.length);
        if (k <= 1) {
          fr.txt = 'fib(' + k + ')  returns ' + k;
          snap('Call <b>fib(' + k + ')</b> → push a frame. k ≤ 1 is the <b>base case</b>: return ' + k + ' at once and pop.', 'ok', { k: k, returns: k });
          stack.pop();
          return k;
        }
        snap('Call <b>fib(' + k + ')</b> → push a frame. It needs a = fib(' + (k - 1) + ') first, so it pauses and calls that.', 'cur', { k: k, a: '?', b: '?' });
        var a = fib(k - 1);
        fr.txt = 'fib(' + k + ')  a=' + a + '  b=?';
        snap('Back in <b>fib(' + k + ')</b>: the left call returned a = ' + a + ' (its frames are all gone now). Next it calls b = fib(' + (k - 2) + ').', 'cur', { k: k, a: a, b: '?' });
        var b = fib(k - 2);
        fr.txt = 'fib(' + k + ')  a=' + a + '  b=' + b + '  = ' + (a + b);
        snap('Both children are done: fib(' + k + ') = a + b = ' + a + ' + ' + b + ' = <b>' + (a + b) + '</b>. Return it and pop this frame.', 'ok', { k: k, a: a, b: b, returns: a + b });
        stack.pop();
        return a + b;
      };
      result = fib(n);
    }
    frames.push({ narr: 'Stack is empty again → the very first call has finished. Answer: <b>' + kind + '(' + n + ') = ' + result + '</b>. The stack was at most <b>' + depthMax + '</b> frames tall — that height is the extra memory recursion uses. With no base case the plates would pile up forever and Java would throw <span class="c-r">StackOverflowError</span>.', parts: [
      { type: 'stack', label: 'Call stack', items: [] },
      { type: 'vars', label: 'Summary', vals: { answer: result, 'max depth': depthMax, 'total calls': calls }, hl: { answer: 'sel' } }
    ] });
    return frames;
  }

  // ---------- VIZ 2: fib recursion tree ----------
  function genFibTree(input) {
    var n = Number(String(input === undefined ? '5' : input).trim());
    if (!Number.isInteger(n) || n < 2 || n > 5) throw new Error('Type one whole number n from 2 to 5 (bigger trees do not fit on the screen).');
    var arr = [], hl = {}, tags = {}, frames = [], calls = 0, seen = {}, repeats = 0;
    for (var z = 0; z < 31; z++) arr.push(null);
    function count() { var e = []; for (var k = n; k >= 0; k--) if (seen[k]) e.push(['fib(' + k + ')', seen[k] + (seen[k] > 1 ? ' times' : ' time')]); return e; }
    function snap(narr, cur) {
      var h = {}; for (var key in hl) h[key] = hl[key];
      if (cur !== undefined) h[cur] = h[cur] === 'bad' ? 'bad' : 'cur';
      frames.push({ narr: narr, parts: [
        { type: 'tree', label: 'Recursion tree of fib(' + n + ')  (fK = fib(K), tag = returned value)', arr: arr.slice(), hl: h, tags: JSON.parse(JSON.stringify(tags)) },
        { type: 'map', label: 'How many times each call happened', entries: count() },
        { type: 'vars', vals: { 'total calls': calls, 'repeated calls': repeats } }
      ] });
    }
    function go(i, k) {
      calls++;
      arr[i] = 'f' + k;
      var rep = !!seen[k];
      seen[k] = (seen[k] || 0) + 1;
      if (rep && k >= 1) { repeats++; hl[i] = 'bad'; }
      if (k <= 1) {
        tags[i] = '=' + k;
        hl[i] = rep ? 'bad' : 'ok';
        snap('fib(' + k + ') is a <b>base case</b> (a leaf of the tree): it returns ' + k + ' with no children.' + (rep ? ' <span class="c-r">We already met fib(' + k + ') before</span> — cheap here, but the same repetition happens higher up too.' : ''), i);
        return k;
      }
      snap('Call <b>fib(' + k + ')</b>. It splits into two smaller calls: fib(' + (k - 1) + ') on the left and fib(' + (k - 2) + ') on the right.' + (rep ? ' <span class="c-r">Wasted work: fib(' + k + ') was already fully computed earlier!</span> Plain recursion forgets answers, so it rebuilds this whole branch again.' : ''), i);
      var a = go(2 * i + 1, k - 1);
      var b = go(2 * i + 2, k - 2);
      tags[i] = '=' + (a + b);
      if (hl[i] !== 'bad') hl[i] = 'done';
      snap('Both children of fib(' + k + ') answered: ' + a + ' + ' + b + ' = <b>' + (a + b) + '</b>. The value travels <b>up</b> the edge to the parent.', i);
      return a + b;
    }
    snap('The recursion tree draws <b>every call as a node</b>. Children of a node are the calls it makes. Let us grow it for fib(' + n + ') in the exact order Java runs it (left first, deepest first).');
    var res = go(0, n);
    hl[0] = 'sel';
    snap('Done: fib(' + n + ') = <b>' + res + '</b> using <b>' + calls + '</b> calls. Red nodes are repeated sub-problems. Each node makes ~2 children, so the tree has about 2<sup>n</sup> nodes → <b>O(2<sup>n</sup>)</b> time. Its height is only n → <b>O(n)</b> stack memory. (Remembering answers = memoization = Dynamic Programming, which cuts this to O(n).)');
    return frames;
  }

  // ---------- VIZ 3: recurrence tree level-by-level ----------
  function genRecurrence(input) {
    var s = String(input === undefined ? 'merge 8' : input).trim().toLowerCase().split(/\s+/);
    var kind = s[0], n = Number(s[1]);
    var ok = Number.isInteger(n) && (
      (kind === 'chain' && n >= 2 && n <= 5) ||
      (kind === 'double' && n >= 2 && n <= 5) ||
      (kind === 'merge' && [4, 8, 16].indexOf(n) >= 0));
    if (!ok) throw new Error('Type "chain N" (N 2-5) for T(n)=T(n-1)+1, "double N" (N 2-5) for T(n)=2T(n-1)+1, or "merge N" (N = 4, 8 or 16) for T(n)=2T(n/2)+n.');
    var formula = kind === 'chain' ? 'T(n) = T(n-1) + 1' : kind === 'double' ? 'T(n) = 2T(n-1) + 1' : 'T(n) = 2T(n/2) + n';
    var levels = [];
    if (kind === 'chain') for (var d = 0; d < n; d++) levels.push({ count: 1, size: n - d, work: 1 });
    if (kind === 'double') for (d = 0; d < n; d++) levels.push({ count: Math.pow(2, d), size: n - d, work: 1 });
    if (kind === 'merge') for (d = 0; Math.pow(2, d) <= n; d++) levels.push({ count: Math.pow(2, d), size: n / Math.pow(2, d), work: n / Math.pow(2, d) });
    var arr = [], tags = {}, frames = [], totals = [], total = 0;
    var size = Math.pow(2, levels.length) - 1;
    for (var z = 0; z < size; z++) arr.push(null);
    frames.push({ narr: 'Recurrence <b>' + formula + '</b>. Read it as: "the work for size n = the work of the smaller calls + the extra work done in this call". We draw one node per call, write its <b>extra work</b> under it, then add up the tree <b>one level at a time</b>.', parts: [
      { type: 'text', label: 'Rule', html: '<b>' + formula + '</b>, start n = ' + n },
      { type: 'vars', vals: { levels: 0, total: 0 } }
    ] });
    levels.forEach(function (L, d) {
      var first = Math.pow(2, d) - 1, hl = {};
      for (var q = 0; q < L.count; q++) { arr[first + q] = L.size; tags[first + q] = '+' + L.work; hl[first + q] = 'cur'; }
      var lt = L.count * L.work; total += lt; totals.push(lt);
      var why = kind === 'chain' ? 'Only ONE smaller call per node, so the tree is a single chain.' : kind === 'double' ? 'Every node makes TWO calls on n-1, so the number of nodes doubles each level.' : 'The node count doubles, but each piece is half as big — the two effects cancel, so every level costs exactly n.';
      frames.push({ narr: 'Level ' + d + ': <b>' + L.count + '</b> node(s), each of size ' + L.size + ', each doing ' + L.work + ' unit(s) of extra work → level total = ' + L.count + ' × ' + L.work + ' = <b>' + lt + '</b>. ' + why, parts: [
        { type: 'tree', label: 'Recurrence tree (number = input size, tag = extra work)', arr: arr.slice(), hl: hl, tags: JSON.parse(JSON.stringify(tags)) },
        { type: 'bars', label: 'Work per level', values: totals.slice(), idxLabels: totals.map(function (_, i) { return 'L' + i; }), hl: one(d, 'cur') },
        { type: 'vars', vals: { level: d, nodes: L.count, 'work each': L.work, 'level total': lt, 'running total': total }, hl: { 'running total': 'ok' } }
      ] });
    });
    var big = kind === 'chain' ? 'n levels × 1 = n → <b>O(n)</b>' : kind === 'double' ? '1 + 2 + 4 + … + 2<sup>n-1</sup> = 2<sup>n</sup> − 1 = ' + total + ' → <b>O(2<sup>n</sup>)</b>' : '(log₂n + 1) levels × n each = ' + n + ' × ' + levels.length + ' = ' + total + ' → <b>O(n log n)</b>';
    var hlAll = {}; for (var i = 0; i < arr.length; i++) if (arr[i] !== null) hlAll[i] = 'done';
    frames.push({ narr: 'Add the level totals: ' + totals.join(' + ') + ' = <b>' + total + '</b>. In general: ' + big + '. Stack memory = the <b>height</b> of the tree (' + levels.length + ' levels here), not the number of nodes.', parts: [
      { type: 'tree', label: 'Full recurrence tree', arr: arr.slice(), hl: hlAll, tags: JSON.parse(JSON.stringify(tags)) },
      { type: 'bars', label: 'Work per level', values: totals.slice(), idxLabels: totals.map(function (_, i) { return 'L' + i; }) },
      { type: 'vars', vals: { formula: formula, 'total work': total, height: levels.length }, hl: { 'total work': 'sel' } }
    ] });
    return frames;
  }

  // ---------- VIZ 4: Tower of Hanoi ----------
  function genHanoi(input) {
    var n = Number(String(input === undefined ? '3' : input).trim());
    if (!Number.isInteger(n) || n < 1 || n > 6) throw new Error('Type the number of disks, a whole number from 1 to 6.');
    var pegs = { A: [], B: [], C: [] }, frames = [], calls = [], moveNo = 0, total = Math.pow(2, n) - 1;
    for (var k = n; k >= 1; k--) pegs.A.push(k);
    function disk(k) { return k + ' ' + new Array(k + 1).join('■'); }
    function parts(hlPeg, hlIdx, cls) {
      var ps = ['A', 'B', 'C'].map(function (p) {
        var h = {}; if (p === hlPeg) h[hlIdx] = cls;
        return { type: 'stack', label: 'Peg ' + p + (p === 'A' ? ' (source)' : p === 'C' ? ' (target)' : ' (helper)'), items: pegs[p].map(disk), hl: h };
      });
      ps.push({ type: 'stack', label: 'Recursion stack', items: calls.slice(), hl: calls.length ? one(calls.length - 1, 'cur') : {} });
      ps.push({ type: 'vars', vals: { move: moveNo + ' / ' + total } });
      return ps;
    }
    frames.push({ narr: 'Start: ' + n + ' disk(s) on peg A, biggest at the bottom. Goal: move them all to peg C, one disk at a time, never putting a bigger disk on a smaller one. Minimum moves = 2<sup>' + n + '</sup> − 1 = <b>' + total + '</b>.', parts: parts() });
    frames.push({ narr: 'The whole plan in 3 lines: (1) move the top n−1 disks A → B (using C as helper), (2) move the biggest disk A → C, (3) move the n−1 disks B → C (using A). Steps 1 and 3 are the <b>same problem, just smaller</b> — that is the recursion.', parts: parts() });
    function solve(m, from, to, via) {
      calls.push('hanoi(' + m + ', ' + from + '→' + to + ' via ' + via + ')');
      if (m === 1) {
        var d1 = pegs[from].pop(); pegs[to].push(d1); moveNo++;
        frames.push({ narr: 'Move ' + moveNo + ': disk <b>' + d1 + '</b> from ' + from + ' → ' + to + '. This is the <b>base case</b> hanoi(1, …): a single disk just moves.', parts: parts(to, pegs[to].length - 1, 'ok') });
        calls.pop();
        return;
      }
      solve(m - 1, from, via, to);
      var d = pegs[from].pop(); pegs[to].push(d); moveNo++;
      frames.push({ narr: 'Move ' + moveNo + ': the ' + (m - 1) + ' smaller disk(s) are parked on ' + via + ', so the biggest disk of this sub-tower, disk <b>' + d + '</b>, goes ' + from + ' → ' + to + '. Next, hanoi(' + (m - 1) + ') brings the parked disks from ' + via + ' on top of it.', parts: parts(to, pegs[to].length - 1, 'sel') });
      solve(m - 1, via, to, from);
      calls.pop();
    }
    solve(n, 'A', 'C', 'B');
    frames.push({ narr: 'Finished in <b>' + moveNo + '</b> moves = 2<sup>' + n + '</sup> − 1. Each extra disk doubles the work (T(n) = 2T(n−1) + 1), so 64 disks would take 2<sup>64</sup> − 1 moves — billions of years.', parts: parts() });
    return frames;
  }

  // ---------- VIZ 5: subsets pick / not-pick ----------
  function genSubsets(input) {
    var a = nums(input, '1 2 3', 4, 'numbers');
    var n = a.length, frames = [], stack = [], cur = [], res = [];
    function snap(narr, i, cls, resHl) {
      var h = {}; if (i !== undefined && i < n) h[i] = 'cur';
      var p = {}; if (i !== undefined && i < n) p[i] = 'i';
      frames.push({ narr: narr, parts: [
        { type: 'array', label: 'nums', values: a, hl: h, ptr: p },
        { type: 'stack', label: 'Call stack f(i, current)', items: stack.slice(), hl: stack.length ? one(stack.length - 1, cls || 'cur') : {} },
        { type: 'array', label: 'current subset', values: cur.length ? cur.slice() : ['∅'], hl: cur.length && cls === 'ok' ? one(cur.length - 1, 'ok') : {} },
        { type: 'set', label: 'result (' + res.length + ' of ' + Math.pow(2, n) + ')', items: res.slice(), hl: resHl ? one(resHl, 'ok') : {} }
      ] });
    }
    snap('For each number we make one yes/no decision: <b>pick it</b> or <b>skip it</b>. ' + n + ' decisions × 2 choices each → 2<sup>' + n + '</sup> = ' + Math.pow(2, n) + ' subsets.');
    function f(i) {
      stack.push('f(' + i + ', ' + listTxt(cur) + ')');
      if (i === n) {
        var t = listTxt(cur); res.push(t);
        snap('i = ' + n + ' → we have decided about every number. <b>Base case</b>: save a copy of current = ' + t + ' into the result.', i, 'sel', t);
        stack.pop();
        return;
      }
      cur.push(a[i]);
      snap('At i = ' + i + ': <b>CHOOSE</b> — pick ' + a[i] + ' (add it to current), then explore the rest.', i, 'ok');
      f(i + 1);
      cur.pop();
      snap('Back at i = ' + i + ': <b>UN-CHOOSE</b> — remove ' + a[i] + ' so current is clean again. Now explore the other branch: <b>skip</b> ' + a[i] + '.', i, 'cur');
      f(i + 1);
      stack.pop();
    }
    f(0);
    snap('All branches explored. We collected <b>' + res.length + '</b> subsets = 2<sup>' + n + '</sup>. Time O(n · 2<sup>n</sup>) (2<sup>n</sup> subsets, copying each costs up to n). Stack depth is only n + 1.');
    return frames;
  }

  // ---------- VIZ 6: permutations by swapping ----------
  function genPermSwap(input) {
    var a = nums(input, '1 2 3', 4, 'numbers');
    var n = a.length, frames = [], res = [];
    function snap(narr, i, j, cls, resHl) {
      var h = {}, p = {};
      for (var q = 0; q < Math.min(i, n); q++) h[q] = 'done';
      if (j !== undefined) { h[i] = cls; h[j] = cls; if (i === j) p[i] = ['i', 'j']; else { p[i] = 'i'; p[j] = 'j'; } }
      if (cls === 'sel') for (q = 0; q < n; q++) h[q] = 'sel';
      frames.push({ narr: narr, parts: [
        { type: 'array', label: 'arr (faded = already fixed slots)', values: a.slice(), hl: h, ptr: p },
        { type: 'vars', vals: { 'slot i being filled': i < n ? i : 'none (done)', j: j === undefined ? '-' : j } },
        { type: 'set', label: 'permutations found (' + res.length + ')', items: res.slice(), hl: resHl ? one(resHl, 'ok') : {} }
      ] });
    }
    function sw(x, y) { var t = a[x]; a[x] = a[y]; a[y] = t; }
    snap('Swap method: fill slot 0, then slot 1, … For slot i we try every element from i to the end by <b>swapping it into slot i</b>, recurse for slot i + 1, then <b>swap back</b> (un-choose). No extra used[] array needed.', 0);
    function go(i) {
      if (i === n) {
        var t = listTxt(a); res.push(t);
        snap('i = n: every slot is fixed → record permutation <b>' + t + '</b>.', n, undefined, 'sel', t);
        return;
      }
      for (var j = i; j < n; j++) {
        sw(i, j);
        snap('Slot ' + i + ': swap a[' + i + '] and a[' + j + ']' + (i === j ? ' (same spot — keep ' + a[i] + ' here)' : '') + ' → <b>' + a[i] + '</b> now sits in slot ' + i + '. Recurse to fill slot ' + (i + 1) + '.', i, j, 'cur');
        go(i + 1);
        sw(i, j);
        snap('Back from slot ' + (i + 1) + ': <b>swap back</b> a[' + i + '] and a[' + j + '] so the array is exactly as before. ' + (j + 1 < n ? 'Next try j = ' + (j + 1) + '.' : 'No more j for slot ' + i + ' → return.'), i, j, 'bad');
      }
    }
    go(0);
    snap('Done: <b>' + res.length + '</b> permutations = ' + n + '!. Time O(n · n!), stack depth n.', 0);
    return frames;
  }

  // ---------- VIZ 7: combination sum ----------
  function genCombSum(input) {
    var raw = String(input === undefined ? '2 3 6 7 | 7' : input).split('|');
    if (raw.length !== 2) throw new Error('Format: candidates | target, e.g. "2 3 6 7 | 7".');
    var c = nums(raw[0], '2 3 6 7', 5, 'candidates');
    var target = Number(raw[1].trim());
    if (!Number.isInteger(target) || target < 1 || target > 12) throw new Error('Target must be a whole number from 1 to 12.');
    if (c.some(function (x) { return x < 1; })) throw new Error('Candidates must be positive whole numbers.');
    c = c.filter(function (x, i) { return c.indexOf(x) === i; }).sort(function (x, y) { return x - y; });
    var frames = [], cur = [], res = [], stopped = false;
    function snap(narr, i, cls, rem, resHl) {
      var h = {}, p = {};
      if (i !== undefined && i < c.length) { h[i] = cls; p[i] = 'i'; }
      frames.push({ narr: narr, parts: [
        { type: 'array', label: 'candidates (sorted)', values: c, hl: h, ptr: p },
        { type: 'array', label: 'current combination', values: cur.length ? cur.slice() : ['∅'], hl: cur.length && cls === 'ok' ? one(cur.length - 1, 'ok') : {} },
        { type: 'vars', vals: { target: target, 'sum so far': target - rem, remaining: rem }, hl: { remaining: rem === 0 ? 'sel' : 'cur' } },
        { type: 'set', label: 'answers', items: res.slice(), hl: resHl ? one(resHl, 'ok') : {} }
      ] });
      if (frames.length > 150) stopped = true;
    }
    snap('Sorted candidates. Rule: at each step choose a candidate at index ≥ start (so [2,3] and [3,2] are not both made). Staying on the same index means "use it again".', undefined, '', target);
    function bt(start, rem) {
      for (var i = start; i < c.length && !stopped; i++) {
        if (c[i] > rem) {
          snap(c[i] + ' &gt; remaining ' + rem + ' → too big. The list is sorted, so every later candidate is too big too → <b>break</b> (pruning).', i, 'bad', rem);
          break;
        }
        cur.push(c[i]);
        if (rem - c[i] === 0) {
          var t = listTxt(cur); res.push(t);
          snap('CHOOSE ' + c[i] + ' → remaining becomes 0. <b>Found</b> ' + t + '! Save a copy.', i, 'ok', 0, t);
        } else {
          snap('CHOOSE ' + c[i] + ' → remaining ' + rem + ' − ' + c[i] + ' = ' + (rem - c[i]) + '. Explore from index ' + i + ' again (reuse allowed).', i, 'ok', rem - c[i]);
          bt(i, rem - c[i]);
        }
        cur.pop();
        if (!stopped) snap('UN-CHOOSE ' + c[i] + ' (pop it). Try the next candidate.', i, 'cur', rem);
      }
    }
    bt(0, target);
    frames.push({ narr: stopped ? 'The search is long, so the movie stops here. Answers found so far: ' + res.length + '.' : 'Search finished. Unique combinations: <b>' + res.length + '</b>. Sorting + "start index" avoided duplicate orders; "break when too big" cut dead branches early.', parts: [
      { type: 'array', label: 'candidates (sorted)', values: c },
      { type: 'set', label: 'answers', items: res.slice() },
      { type: 'vars', vals: { target: target, answers: res.length }, hl: { answers: 'sel' } }
    ] });
    return frames;
  }

  // ---------- VIZ 8: N-Queens ----------
  function genNQueens(input) {
    var n = Number(String(input === undefined ? '4' : input).trim());
    if (!Number.isInteger(n) || n < 4 || n > 6) throw new Error('Type a board size n from 4 to 6.');
    var q = [], frames = [], sols = 0, stopped = false, firstOnly = false;
    for (var z = 0; z < n; z++) q.push(-1);
    function board() { var g = []; for (var r = 0; r < n; r++) { var row = []; for (var c = 0; c < n; c++) row.push(q[r] === c ? 'Q' : ''); g.push(row); } return g; }
    function snap(narr, hl, row) {
      var h = {};
      for (var r = 0; r < n; r++) if (q[r] >= 0) h[r + ',' + q[r]] = 'ok';
      for (var k in hl) h[k] = hl[k];
      var heads = []; for (var c = 0; c < n; c++) heads.push('c' + c);
      var rh = []; for (r = 0; r < n; r++) rh.push('r' + r);
      frames.push({ narr: narr, parts: [
        { type: 'grid', label: n + '×' + n + ' board (Q = queen)', rows: board(), colHead: heads, rowHead: rh, hl: h },
        { type: 'array', label: 'queen column in each row (-1 = empty)', values: q.slice(), idxLabels: rh, hl: row !== undefined && row < n ? one(row, 'cur') : {} },
        { type: 'vars', vals: { row: row === undefined || row >= n ? '-' : row, 'solutions found': sols }, hl: { 'solutions found': 'sel' } }
      ] });
      if (frames.length > 320) stopped = true;
    }
    function attacker(r, c) {
      for (var pr = 0; pr < r; pr++) {
        var pc = q[pr];
        if (pc === c) return [pr, pc, 'same column'];
        if (pr - pc === r - c) return [pr, pc, 'same ↘ diagonal (row − col equal)'];
        if (pr + pc === r + c) return [pr, pc, 'same ↙ diagonal (row + col equal)'];
      }
      return null;
    }
    snap('Rule: one queen per row (so rows never clash). For each row we try columns left to right. A queen is safe only if no earlier queen shares its <b>column</b> or a <b>diagonal</b>.', {}, 0);
    function place(r) {
      if (stopped) return;
      if (r === n) {
        sols++;
        var h = {}; for (var i = 0; i < n; i++) h[i + ',' + q[i]] = 'sel';
        snap('All ' + n + ' rows have a queen → <b>solution #' + sols + '</b>! Record it' + (n === 4 ? ', then keep backtracking to look for more.' : '. (For n ≥ 5 the movie stops at the first solution; the real code would backtrack and keep counting.)'), h, n);
        if (n >= 5) firstOnly = true;
        return;
      }
      for (var c = 0; c < n && !stopped; c++) {
        var at = attacker(r, c);
        if (at) {
          var hb = {}; hb[r + ',' + c] = 'bad'; hb[at[0] + ',' + at[1]] = 'bad';
          snap('Row ' + r + ', col ' + c + ': <span class="c-r">conflict</span> with the queen at (' + at[0] + ',' + at[1] + ') — ' + at[2] + '. Skip this column.', hb, r);
          continue;
        }
        q[r] = c;
        snap('Row ' + r + ', col ' + c + ' is <b>safe</b> → CHOOSE: place a queen. Move on to row ' + (r + 1) + '.', one(r + ',' + c, 'cur'), r);
        place(r + 1);
        if (stopped || firstOnly) return;
        q[r] = -1;
        snap('Back in row ' + r + ': UN-CHOOSE — lift the queen from (' + r + ',' + c + ') and try the next column.', one(r + ',' + c, 'done'), r);
      }
      if (!stopped) snap('Row ' + r + ' has <b>no safe column left</b> → dead end. <b>Backtrack</b>: return to row ' + (r - 1) + ' and move its queen.', {}, r);
    }
    place(0);
    if (firstOnly) return frames;
    frames.push({ narr: stopped ? 'This board needs many steps, so the movie pauses here (' + sols + ' solution(s) found so far). The code keeps going the same way.' : 'Search complete: <b>' + sols + '</b> solution(s) for n = ' + n + '. Every red cell was a branch cut off early — that pruning is why backtracking beats trying all n<sup>n</sup> boards.', parts: [
      { type: 'grid', label: 'board', rows: board() },
      { type: 'vars', vals: { n: n, solutions: sols }, hl: { solutions: 'sel' } }
    ] });
    return frames;
  }

  // ---------- VIZ 9: mini Sudoku 4x4 ----------
  function genSudoku(input) {
    var s = String(input === undefined ? '0040 4001 0324 0400' : input).replace(/[\s|,]/g, '');
    if (!/^[0-4]{16}$/.test(s)) throw new Error('Type 16 digits (0-4) row by row, 0 = empty cell, e.g. "0040 4001 0324 0400".');
    var b = s.split('').map(Number), given = b.map(function (v) { return v !== 0; }), frames = [], stopped = false, tries = 0;
    for (var g0 = 0; g0 < 16; g0++) if (b[g0]) {
      var keep = b[g0]; b[g0] = 0;
      var bad0 = clash((g0 / 4) | 0, g0 % 4, keep);
      b[g0] = keep;
      if (bad0) throw new Error('The given digits already break the rules: ' + keep + ' appears twice in a ' + bad0[2] + '. Please fix the puzzle.');
    }
    function rows() { var g = []; for (var r = 0; r < 4; r++) g.push(b.slice(r * 4, r * 4 + 4).map(function (v) { return v ? v : ''; })); return g; }
    function snap(narr, hl) {
      var h = {};
      for (var p = 0; p < 16; p++) if (b[p] && !given[p]) h[((p / 4) | 0) + ',' + (p % 4)] = 'ok';
      for (var k in hl) h[k] = hl[k];
      frames.push({ narr: narr, parts: [
        { type: 'grid', label: '4×4 Sudoku (2×2 boxes) — plain = given, green = our pencil marks', rows: rows(), hl: h },
        { type: 'vars', vals: { 'digits tried': tries } }
      ] });
      if (frames.length > 200) stopped = true;
    }
    function clash(r, c, v) {
      for (var k = 0; k < 4; k++) {
        if (b[r * 4 + k] === v) return [r, k, 'row'];
        if (b[k * 4 + c] === v) return [k, c, 'column'];
      }
      var br = r - r % 2, bc = c - c % 2;
      for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) if (b[(br + i) * 4 + bc + j] === v) return [br + i, bc + j, 'box'];
      return null;
    }
    snap('Mini Sudoku: every row, column and 2×2 box must contain 1–4 once. The 9×9 solver works <b>exactly</b> the same way, just with 1–9 and 3×3 boxes. Plan: find the first empty cell, try 1, 2, 3, 4; place the first digit that fits and move on; if a cell has no legal digit, erase the last guess.', {});
    function solve() {
      var p = b.indexOf(0);
      if (p < 0) return true;
      var r = (p / 4) | 0, c = p % 4;
      for (var v = 1; v <= 4 && !stopped; v++) {
        tries++;
        var cl = clash(r, c, v);
        if (cl) {
          var h = {}; h[r + ',' + c] = 'cur'; h[cl[0] + ',' + cl[1]] = 'bad';
          snap('Cell (' + r + ',' + c + '): try ' + v + ' → <span class="c-r">' + v + ' already in this ' + cl[2] + '</span> at (' + cl[0] + ',' + cl[1] + '). Not allowed.', h);
          continue;
        }
        b[p] = v;
        snap('Cell (' + r + ',' + c + '): ' + v + ' fits its row, column and box → write it in (CHOOSE) and go to the next empty cell.', one(r + ',' + c, 'cur'));
        if (solve()) return true;
        if (stopped) return false;
        b[p] = 0;
        snap('Later cells got stuck, so the ' + v + ' at (' + r + ',' + c + ') must be wrong → <b>erase it</b> (UN-CHOOSE) and try the next digit.', one(r + ',' + c, 'bad'));
      }
      if (!stopped) snap('Cell (' + r + ',' + c + ') has <b>no legal digit</b> → dead end. Return false so the previous cell changes its guess.', one(r + ',' + c, 'bad'));
      return false;
    }
    var okk = solve();
    var hs = {}; for (var p = 0; p < 16; p++) if (!given[p]) hs[((p / 4) | 0) + ',' + (p % 4)] = 'sel';
    frames.push({ narr: stopped ? 'Long search — the movie stops here; the code would keep going the same way.' : okk ? 'Solved! Every empty cell is filled legally after <b>' + tries + '</b> digit tries. Purple = digits we filled.' : 'No solution exists for this grid: every branch hit a dead end.', parts: [
      { type: 'grid', label: 'final grid', rows: rows(), hl: okk ? hs : {} },
      { type: 'vars', vals: { 'digits tried': tries, solved: okk ? 'yes' : 'no' }, hl: { solved: 'sel' } }
    ] });
    return frames;
  }

  // ---------- VIZ 10: head vs tail work (code stepping) ----------
  function genCountUp(input) {
    var s = String(input === undefined ? 'up 3' : input).trim().toLowerCase().split(/\s+/);
    var kind = s[0], n = Number(s[1]);
    if ((kind !== 'up' && kind !== 'down') || !Number.isInteger(n) || n < 1 || n > 5) throw new Error('Type "up N" or "down N" with N from 1 to 5, e.g. "up 3".');
    var code = kind === 'up'
      ? 'void countUp(int n) {\n  if (n == 0) return;\n  countUp(n - 1);\n  print(n);\n}'
      : 'void countDown(int n) {\n  if (n == 0) return;\n  print(n);\n  countDown(n - 1);\n}';
    var fname = kind === 'up' ? 'countUp' : 'countDown';
    var frames = [], stack = [], out = [];
    function snap(narr, line, cls) {
      var hl = {}; hl[line] = cls || 'cur';
      frames.push({ narr: narr, parts: [
        { type: 'code', label: 'Line running now', lang: 'java', code: code, hl: hl },
        { type: 'stack', label: 'Call stack (top = running)', items: stack.slice(), hl: stack.length ? one(stack.length - 1, 'cur') : {} },
        { type: 'array', label: 'printed so far', values: out.length ? out.slice() : ['(nothing)'], hl: out.length ? one(out.length - 1, 'ok') : {} }
      ] });
    }
    function go(k) {
      stack.push(fname + '(' + k + ')');
      if (k === 0) {
        snap('<b>' + fname + '(0)</b>: n == 0 is the base case → return straight away. Nothing is printed by this frame.', 2, 'ok');
        stack.pop();
        return;
      }
      snap('<b>' + fname + '(' + k + ')</b> starts. n = ' + k + ' is not 0, so we go past the base case.', 2);
      if (kind === 'up') {
        snap('Line 3: call countUp(' + (k - 1) + ') FIRST. This frame pauses here and will print later, on the way back up.', 3);
        go(k - 1);
        out.push(k);
        snap('Back in countUp(' + k + ') after its child returned → line 4 prints <b>' + k + '</b>. Work AFTER the call runs on the way UP, so the numbers come out small → big.', 4, 'ok');
      } else {
        out.push(k);
        snap('Line 3: print <b>' + k + '</b> BEFORE calling. Work BEFORE the call runs on the way DOWN, so the numbers come out big → small.', 3, 'ok');
        snap('Line 4: now call countDown(' + (k - 1) + ').', 4);
        go(k - 1);
      }
      stack.pop();
    }
    snap('Same calls, different order of work. Watch WHEN the print happens relative to the recursive call.', 1);
    go(n);
    frames.push({ narr: 'Finished. Output: <b>' + out.join(' ') + '</b>. Rule of thumb: code before the recursive call = "pre-order" (top-down); code after it = "post-order" (bottom-up).', parts: [
      { type: 'code', label: 'Code', lang: 'java', code: code },
      { type: 'array', label: 'final output', values: out.slice(), hl: { 0: 'sel' } }
    ] });
    return frames;
  }

  // ---------- VIZ 11: generate parentheses (template + pruning) ----------
  function genParens(input) {
    var n = Number(String(input === undefined ? '3' : input).trim());
    if (!Number.isInteger(n) || n < 1 || n > 4) throw new Error('Type the number of pairs n, a whole number from 1 to 4.');
    var frames = [], sb = [], res = [], stack = [], stopped = false;
    var code = 'void bt(StringBuilder sb, int open, int close) {\n  if (sb.length() == 2 * n) { res.add(sb.toString()); return; }\n  if (open < n) {\n    sb.append(\'(\'); bt(sb, open + 1, close); sb.deleteCharAt(sb.length() - 1);\n  }\n  if (close < open) {\n    sb.append(\')\'); bt(sb, open, close + 1); sb.deleteCharAt(sb.length() - 1);\n  }\n}';
    function snap(narr, line, cls, open, close, resHl) {
      var hl = {}; hl[line] = cls || 'cur';
      frames.push({ narr: narr, parts: [
        { type: 'code', label: 'choose → explore → un-choose', lang: 'java', code: code, hl: hl },
        { type: 'array', label: 'sb (the ONE shared builder)', values: sb.length ? sb.slice() : ['∅'], hl: sb.length ? one(sb.length - 1, cls === 'bad' ? 'bad' : 'ok') : {} },
        { type: 'vars', vals: { n: n, open: open, close: close } },
        { type: 'set', label: 'answers (' + res.length + ')', items: res.slice(), hl: resHl ? one(resHl, 'ok') : {} }
      ] });
      if (frames.length > 120) stopped = true;
    }
    snap('Build a string of ' + (2 * n) + ' brackets one character at a time. State = (sb, open used, close used). Choices = add "(" or add ")". Pruning rules keep every partial string <b>fixable</b>.', 1, 'cur', 0, 0);
    function bt(open, close) {
      if (stopped) return;
      if (sb.length === 2 * n) {
        var t = sb.join(''); res.push(t);
        snap('Length is ' + (2 * n) + ' → GOAL. Save a copy "<b>' + t + '</b>" and return.', 2, 'sel', open, close, t);
        return;
      }
      if (open < n) {
        sb.push('(');
        snap('open = ' + open + ' &lt; n, so "(" is allowed → <b>CHOOSE</b> "(" and explore.', 4, 'ok', open + 1, close);
        bt(open + 1, close);
        if (stopped) return;
        sb.pop();
        snap('Back: <b>UN-CHOOSE</b> the "(" (deleteCharAt) so sb is exactly as before.', 4, 'cur', open, close);
      } else {
        snap('open = n = ' + n + ' → no "(" left to place. <span class="c-r">Prune</span> that branch.', 3, 'bad', open, close);
      }
      if (close < open) {
        sb.push(')');
        snap('close = ' + close + ' &lt; open = ' + open + ', so a ")" has a partner → <b>CHOOSE</b> ")" and explore.', 7, 'ok', open, close + 1);
        bt(open, close + 1);
        if (stopped) return;
        sb.pop();
        snap('Back: <b>UN-CHOOSE</b> the ")".', 7, 'cur', open, close);
      } else {
        snap('close = open = ' + open + ' → a ")" now would have no partner. <span class="c-r">Prune</span>: never build "())…".', 6, 'bad', open, close);
      }
    }
    bt(0, 0);
    frames.push({ narr: stopped ? 'Long search — the movie stops here (' + res.length + ' answers so far).' : 'Done: <b>' + res.length + '</b> valid strings (the ' + n + '-th Catalan number). Pruning meant we never built a single invalid string, instead of generating all 2<sup>' + (2 * n) + '</sup> = ' + Math.pow(2, 2 * n) + ' strings and filtering.', parts: [
      { type: 'set', label: 'answers', items: res.slice() },
      { type: 'vars', vals: { n: n, answers: res.length, 'blind strings avoided': Math.pow(2, 2 * n) }, hl: { answers: 'sel' } }
    ] });
    return frames;
  }

  // ---------- VIZ 12: permutations with used[] and duplicates ----------
  function genPermUsed(input) {
    var a = nums(input, '1 1 2', 4, 'numbers').slice().sort(function (x, y) { return x - y; });
    var n = a.length, used = a.map(function () { return 0; }), cur = [], res = [], frames = [], stopped = false;
    function snap(narr, i, cls, resHl) {
      var h = {}, p = {};
      for (var q = 0; q < n; q++) if (used[q]) h[q] = 'done';
      if (i !== undefined) { h[i] = cls; p[i] = 'i'; }
      frames.push({ narr: narr, parts: [
        { type: 'array', label: 'nums (sorted; faded = used)', values: a, hl: h, ptr: p },
        { type: 'array', label: 'used[]', values: used.slice(), hl: i !== undefined ? one(i, cls) : {} },
        { type: 'array', label: 'current permutation', values: cur.length ? cur.slice() : ['∅'], hl: cur.length ? one(cur.length - 1, 'ok') : {} },
        { type: 'set', label: 'unique permutations (' + res.length + ')', items: res.slice(), hl: resHl ? one(resHl, 'ok') : {} }
      ] });
      if (frames.length > 160) stopped = true;
    }
    snap('Sort first so equal numbers sit next to each other. used[i] = 1 means nums[i] is already in the current permutation. Rule for duplicates: use equal values <b>left to right only</b>.');
    function go() {
      if (stopped) return;
      if (cur.length === n) {
        var t = listTxt(cur); res.push(t);
        snap('current has ' + n + ' numbers → save <b>' + t + '</b>.', undefined, '', t);
        return;
      }
      for (var i = 0; i < n && !stopped; i++) {
        if (used[i]) { snap('Slot ' + cur.length + ': nums[' + i + '] = ' + a[i] + ' is already used → skip.', i, 'done'); continue; }
        if (i > 0 && a[i] === a[i - 1] && !used[i - 1]) {
          snap('Slot ' + cur.length + ': nums[' + i + '] = ' + a[i] + ' equals nums[' + (i - 1) + '], which is <b>not</b> used. Placing this copy first would repeat the branch the left copy already explored → <span class="c-r">skip duplicate</span>.', i, 'bad');
          continue;
        }
        used[i] = 1; cur.push(a[i]);
        snap('CHOOSE nums[' + i + '] = ' + a[i] + ' for slot ' + (cur.length - 1) + ' (used[' + i + '] = 1).', i, 'ok');
        go();
        if (stopped) return;
        used[i] = 0; cur.pop();
        snap('UN-CHOOSE nums[' + i + '] (used[' + i + '] = 0, pop). Try the next number for slot ' + cur.length + '.', i, 'cur');
      }
    }
    go();
    frames.push({ narr: stopped ? 'Long search — the movie stops here.' : 'Done: <b>' + res.length + '</b> unique permutations. Without the duplicate rule we would have produced ' + n + '! = ' + [1, 1, 2, 6, 24][n] + ' arrangements, some identical.', parts: [
      { type: 'set', label: 'unique permutations', items: res.slice() },
      { type: 'vars', vals: { n: n, unique: res.length, 'n!': [1, 1, 2, 6, 24][n] }, hl: { unique: 'sel' } }
    ] });
    return frames;
  }

  // ===================== TOPIC 1: Call stack =====================
  topics.push({
    title: 'Recursion & the Call Stack: Base Case, Recursive Case, Stack Overflow',
    analogy: `<p><b>Russian nesting dolls.</b> You open the big doll and find a slightly smaller doll inside. You open that one… and again… until you reach the <b>tiny solid doll</b> that does not open. That tiny doll is the <b>base case</b>. Then you put the dolls back together in the <i>reverse</i> order — smallest first, biggest last. That "closing back up" is the function <b>returning</b>.</p>
      <p><b>A stack of plates</b> in a canteen works the same way: the plate you put on <i>last</i> is the plate you take off <i>first</i>. Every function call is a plate placed on top; every return takes the top plate off. That pile is the <b>call stack</b>.</p>`,
    explain: `<p><b>Recursion</b> = a function that solves a problem by calling <i>itself</i> on a <b>smaller</b> version of the same problem. Every recursive function has two parts:</p>
      <ul>
        <li><b>Base case</b> — the smallest input whose answer you just <i>know</i> (the solid doll). It stops the calls. Example: <code>fact(1) = 1</code>.</li>
        <li><b>Recursive case</b> — shrink the input and <b>trust</b> the smaller call to be right ("leap of faith"), then do a little work with its answer. Example: <code>fact(n) = n × fact(n − 1)</code>.</li>
      </ul>
      <h4>What a "frame" is</h4>
      <p>Each call gets its own <b>stack frame</b> — think of a sticky note holding <i>its own</i> copy of the parameters, local variables and "where to continue when the child returns". Calling <code>fact(4)</code> builds this pile:</p>
      ${H.table(['step', 'what happens', 'stack (bottom → top)'], [
        ['1', 'call fact(4): needs fact(3), pauses', 'fact(4)'],
        ['2', 'call fact(3): needs fact(2), pauses', 'fact(4), fact(3)'],
        ['3', 'call fact(2): needs fact(1), pauses', 'fact(4), fact(3), fact(2)'],
        ['4', H.c('g', 'fact(1) = 1 → base case, return'), 'fact(4), fact(3), fact(2), ' + H.c('g', 'fact(1)')],
        ['5', 'fact(2) wakes: 2 × 1 = 2, return', 'fact(4), fact(3)'],
        ['6', 'fact(3) wakes: 3 × 2 = 6, return', 'fact(4)'],
        ['7', H.c('p', 'fact(4) wakes: 4 × 6 = 24'), 'empty']
      ])}
      <p>Going <b>down</b> (steps 1–4) we only <i>ask</i>. Coming back <b>up</b> (steps 5–7) we actually <i>multiply</i>. Code written <b>before</b> the recursive call runs on the way down; code written <b>after</b> it runs on the way back up (that is why printing after the call prints in reverse!).</p>
      <h4>Stack overflow</h4>
      <p>The call stack has a fixed size (Java's default is roughly 512 KB–1 MB per thread → usually around <b>10<sup>4</sup> to 10<sup>5</sup></b> simple frames). If the recursion is too deep, or the base case is missing / never reached, frames pile up until Java throws <span class="c-r"><code>StackOverflowError</code></span>.</p>
      ${H.table(['bug', 'what goes wrong'], [
        ['No base case', 'fact(1) calls fact(0), fact(-1), fact(-2)… forever'],
        ['Input does not shrink', 'f(n) calls f(n) again → never ends'],
        ['Base case skipped', 'f(n) calls f(n − 2) with base "n == 1" → odd/even mistake, 4 → 2 → 0 → -2 …'],
        ['Simply too deep', 'linear recursion with n = 10<sup>6</sup> → too many frames even though logic is right; use a loop']
      ])}
      <p><b>Memory rule:</b> recursion uses extra space equal to the <b>maximum depth</b> of the stack (the tallest the plate pile ever gets), not the total number of calls.</p>`,
    clues: [
      'The problem is defined in terms of a <b>smaller copy of itself</b>: "f(n) depends on f(n-1)", factorial, power, Fibonacci, "sum of digits".',
      'Nested / self-similar structure: trees, folders inside folders, brackets inside brackets → recursion fits naturally.',
      '"Print in <b>reverse</b>" or "process after the children are done" → put the work <b>after</b> the recursive call.',
      'Depth ≈ N with <code>N ≤ 10<sup>4</sup></code> is usually safe; <code>N ≈ 10<sup>6</sup></code> with one call per step → risk of <b>StackOverflowError</b>, prefer a loop.',
      'Exponent up to 10<sup>9</sup> or 2<sup>31</sup> ("compute x<sup>n</sup>") → halve the problem each call: O(log n) depth.'
    ],
    code: [`
      class RecursionBasics {
          // Factorial: n! = n * (n-1)!, base case 0! = 1! = 1
          static long fact(int n) {
              if (n <= 1) return 1;            // BASE CASE: the smallest doll
              return n * fact(n - 1);          // RECURSIVE CASE: shrink n, trust the answer
          }

          // Fibonacci: fib(n) = fib(n-1) + fib(n-2); two calls per frame
          static int fib(int n) {
              if (n <= 1) return n;            // fib(0) = 0, fib(1) = 1
              return fib(n - 1) + fib(n - 2);  // left call finishes completely before the right one starts
          }

          // Head vs tail work: same calls, different print order
          static void countDown(int n) {       // prints n, n-1, ..., 1
              if (n == 0) return;
              System.out.print(n + " ");       // work BEFORE the call -> runs on the way DOWN
              countDown(n - 1);
          }
          static void countUp(int n) {         // prints 1, 2, ..., n
              if (n == 0) return;
              countUp(n - 1);
              System.out.print(n + " ");       // work AFTER the call -> runs on the way back UP
          }

          public static void main(String[] args) {
              System.out.println(fact(5));     // 120
              System.out.println(fib(6));      // 8
              countDown(3);                    // 3 2 1
              countUp(3);                      // 1 2 3
          }
      }`, `
      class OverflowDemo {
          // BUG on purpose: no base case, so every call makes another call forever.
          static int depth = 0;
          static void noBase(int n) {
              depth++;
              noBase(n - 1);                   // never stops
          }

          public static void main(String[] args) {
              try {
                  noBase(5);
              } catch (StackOverflowError e) {
                  // On a typical JVM this prints a number in the tens of thousands.
                  System.out.println("Stack overflowed after about " + depth + " frames");
              }
          }
      }`],
    codeTitle: ['Base case, recursive case, head vs tail work', 'What a stack overflow looks like'],
    viz: [{
      title: 'Call stack push / pop for factorial and Fibonacci',
      input: 'fact 4',
      inputLabel: 'fact N (N 2-8) or fib N (N 2-5)',
      gen: genCallStack
    }, {
      title: 'Work before vs after the recursive call',
      input: 'up 3',
      inputLabel: 'up N or down N (N 1-5)',
      gen: genCountUp
    }],
    examples: [
      {
        title: 'Sum of digits — shrink the number, not the array',
        html: `<p><code>digitSum(4721)</code>: the last digit is <code>4721 % 10 = 1</code>, the rest is <code>4721 / 10 = 472</code>. So digitSum(4721) = 1 + digitSum(472). Base case: a number below 10 is its own digit sum.</p>
          ${H.table(['call', 'last digit', 'rest', 'returns'], [['digitSum(4721)', '1', '472', H.c('p', '1 + 13 = 14')], ['digitSum(472)', '2', '47', '2 + 11 = 13'], ['digitSum(47)', '7', '4', '7 + 4 = 11'], ['digitSum(4)', '—', '—', H.c('g', '4 (base)')]])}
          <p>Depth = number of digits ≈ log₁₀N, so even N = 2·10<sup>9</sup> needs only 10 frames.</p>`,
        code: `
          class DigitSum {
              static int digitSum(int n) {
                  if (n < 10) return n;                 // base case: single digit
                  return n % 10 + digitSum(n / 10);     // last digit + sum of the rest
              }
              public static void main(String[] args) {
                  System.out.println(digitSum(4721));   // 14
              }
          }`
      },
      {
        title: 'Is it a palindrome? — two ends move inwards',
        html: `<p>"racecar": compare the first and last characters; if they match, the answer is whatever the <b>inside</b> ("aceca") says. Base case: 0 or 1 characters left → palindrome. Pass indices <code>(l, r)</code> instead of creating substrings — <code>substring</code> copies characters and would turn O(N) into O(N<sup>2</sup>).</p>
          ${H.arr(['r', 'a', 'c', 'e', 'c', 'a', 'r'], { hl: { 0: 'g', 6: 'g', 3: 'p' }, ptr: { 0: 'l', 6: 'r' } })}`,
        code: `
          class Pal {
              static boolean isPal(String s, int l, int r) {
                  if (l >= r) return true;                       // base: empty or one char
                  if (s.charAt(l) != s.charAt(r)) return false;  // early exit: mismatch
                  return isPal(s, l + 1, r - 1);                 // the inside decides
              }
              public static void main(String[] args) {
                  System.out.println(isPal("racecar", 0, 6));    // true
                  System.out.println(isPal("abca", 0, 3));       // false
              }
          }`
      },
      {
        title: 'Reverse an array in place with recursion',
        html: `<p>Swap the two ends, then reverse the middle. [1, 2, 3, 4, 5] → swap 1 and 5 → [5, 2, 3, 4, 1] → reverse(1, 3) → swap 2 and 4 → [5, 4, 3, 2, 1] → reverse(2, 2) is the base case. This is the same "shrink from both ends" shape as the palindrome check — recursion is often just a loop in disguise, which is why interviewers ask you to convert one into the other.</p>`,
        code: `
          class Rev {
              static void reverse(int[] a, int l, int r) {
                  if (l >= r) return;                 // base: 0 or 1 elements left
                  int t = a[l]; a[l] = a[r]; a[r] = t; // fix the two ends
                  reverse(a, l + 1, r - 1);           // trust recursion for the middle
              }
              public static void main(String[] args) {
                  int[] a = {1, 2, 3, 4, 5};
                  reverse(a, 0, a.length - 1);
                  System.out.println(Arrays.toString(a)); // [5, 4, 3, 2, 1]
              }
          }`
      },
      {
        title: 'Same function in Python — and Python\'s much lower depth limit',
        html: `<p>Python keeps a recursion limit of about <b>1000</b> frames by default (<code>sys.getrecursionlimit()</code>), far below Java's tens of thousands. Deep recursion in Python raises <code>RecursionError</code>, so iterative code or an explicit stack is the norm there for deep inputs.</p>`,
        code: { lang: 'python', run: true, code: `import sys

def fact(n):
    if n <= 1:          # base case
        return 1
    return n * fact(n - 1)   # recursive case

print(fact(10))                  # 3628800
print(sys.getrecursionlimit())   # usually 1000
try:
    fact(100000)
except RecursionError as e:
    print("RecursionError:", str(e)[:40])` }
      }
    ],
    deepDive: `<h4>What exactly is inside a stack frame?</h4>
      <p>In the JVM each method call pushes a frame holding: the <b>local variable array</b> (parameters + locals; <code>long</code>/<code>double</code> take two slots), the <b>operand stack</b> used while evaluating expressions, and a reference back to the caller's frame and its <b>return address</b>. The frame size is fixed at compile time. Objects you create live on the <b>heap</b>; the frame only holds the reference — so passing a <code>List</code> into recursion shares one list across all frames (which is exactly why backtracking must "un-choose").</p>
      <h4>How deep can Java go?</h4>
      <p>The default thread stack is set by <code>-Xss</code> (commonly 512 KB–1 MB on 64-bit JVMs). A tiny frame (one <code>int</code>) allows roughly 10–20 thousand calls before the JIT kicks in, often more after JIT compiles the method (compiled frames are smaller). Never rely on an exact number. Workarounds for deep recursion: (1) rewrite as a loop, (2) use an explicit <code>ArrayDeque</code> stack, (3) run the recursion in a <code>new Thread(null, task, "big", 1L &lt;&lt; 26)</code> with a 64 MB stack (a common competitive-programming trick).</p>
      <h4>Tail recursion — Java does NOT optimise it</h4>
      <p>A call is a <b>tail call</b> when it is the very last thing the function does (<code>return helper(n - 1, acc * n)</code>). Scheme, Scala (<code>@tailrec</code>) and Kotlin (<code>tailrec</code>) turn that into a jump, so the stack never grows. The JVM (including Java 21+) does not do this, nor does CPython. So in Java, tail-recursive code still costs O(depth) stack — convert it to a loop if depth can be large.</p>
      <h4>Proof of correctness = induction</h4>
      <p>Recursion is mathematical induction run backwards: prove the base case is right, then prove "if the smaller call is right, my combination step is right". This is the formal version of the "leap of faith" — you never need to trace all the calls in your head.</p>
      <h4>Recursion vs iteration cost</h4>
      <p>A call costs a few nanoseconds (push frame, jump, pop). For simple linear work a loop is faster and uses O(1) space; recursion shines when the problem is naturally tree-shaped (trees, divide &amp; conquer, backtracking), where the iterative version needs an explicit stack anyway.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant can write <code>fact</code>, <code>pow</code> or a tree traversal instantly, so interviews now test whether you can <b>reason</b> about the call stack: predict output order, spot a missing/unreachable base case, and estimate stack depth from the constraints.</p>
      <p><b>Use AI as a partner:</b> ask <code>Trace fact(4) as a table of push/pop events, don't skip steps</code> and compare with your own trace; ask <code>Give me 5 inputs that would make this recursive function overflow the stack</code> to stress your base cases.</p>
      <p><b>Where AI goes wrong:</b> it happily writes elegant recursive solutions for inputs with N = 10<sup>6</sup> (guaranteed <code>StackOverflowError</code> in Java and <code>RecursionError</code> in Python), claims Java does tail-call optimisation (it does not), and uses <code>substring</code> in recursion, silently making the code O(N<sup>2</sup>).</p>
      <p><b>What you must still own:</b> choosing the base case, proving the recursion shrinks toward it, and deciding recursion vs loop from the constraints.</p>`,
    problems: [
      {
        title: 'Factorial of N (recursive)',
        level: 'Easy',
        tags: ['recursion', 'base case'],
        statement: `<p>Given a non-negative integer <code>N</code>, return <code>N!</code> = 1 × 2 × … × N using <b>recursion</b>. By definition <code>0! = 1</code>.</p>`,
        constraints: `0 ≤ N ≤ 20 (20! = 2,432,902,008,176,640,000 still fits in a Java <code>long</code>; 21! does not)`,
        example: `<p>Input: <b>N = 5</b> → Output: ${H.c('p', '<b>120</b>')}</p>
          ${H.table(['call', 'asks for', 'gets back', 'returns'], [
            ['fact(5)', 'fact(4)', '24', H.c('p', '5 × 24 = 120')],
            ['fact(4)', 'fact(3)', '6', '4 × 6 = 24'],
            ['fact(3)', 'fact(2)', '2', '3 × 2 = 6'],
            ['fact(2)', 'fact(1)', '1', '2 × 1 = 2'],
            ['fact(1)', '—', '—', H.c('g', '1 (base case)')]
          ])}
          <p>Why: 5! = 5 × 4!, and 4! = 4 × 3!… each doll holds a smaller doll until the solid one, fact(1) = 1.</p>`,
        brute: {
          why: `<p>The "obvious" way is a plain <code>for</code> loop multiplying 1..N. It is actually just as fast (N multiplications) and uses O(1) memory — recursion here is not about speed, it is about <b>learning the shape</b>: base case + smaller call. The recursive version costs O(N) stack frames, which is fine for N ≤ 20 but would overflow for N = 10<sup>6</sup>.</p>`,
          code: `
            long factLoop(int n) {
                long ans = 1;
                for (int i = 2; i <= n; i++) {
                    ans *= i;          // multiply 2, 3, ..., n
                }
                return ans;
            }`
        },
        mcq: {
          q: `You wrote <code>long fact(int n) { return n * fact(n - 1); }</code> with <b>no</b> if-statement. What happens for <code>fact(3)</code>?`,
          options: ['Returns 6', 'Returns 0 because it eventually multiplies by 0', 'Calls go 3, 2, 1, 0, -1, -2 … until StackOverflowError', 'Compile error'],
          answer: 2,
          explain: `Nothing ever stops the calls: there is no base case, so it keeps calling with smaller and smaller (negative) n. It never returns at all, so it never gets to multiply by 0 — the stack fills up and Java throws StackOverflowError.`
        },
        hints: [
          `<p><b>Aha:</b> N! = N × (N − 1)!. The big problem is "N times the answer to a smaller problem". The smallest problem you just know: 0! = 1! = 1.</p>`,
          `<p>No data structure needed — the <b>call stack</b> itself remembers each pending "N × ?" for you. Each frame stores its own <code>n</code>.</p>`,
          `<p>Traps: use <code>long</code> (13! already overflows <code>int</code>); handle <code>n = 0</code> (use <code>n &lt;= 1</code> as the base case). Recipe: if n ≤ 1 return 1; else return n × fact(n − 1).</p>`
        ],
        solution: {
          approach: `<p>Base case n ≤ 1 → 1. Otherwise multiply n by the factorial of n − 1.</p>`,
          code: `
            class Solution {
                public long factorial(int n) {
                    if (n <= 1) {
                        return 1;                 // base case: 0! = 1! = 1
                    }
                    long smaller = factorial(n - 1); // leap of faith: trust (n-1)! is correct
                    return n * smaller;           // do my small piece of work on the way back up
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().factorial(5));  // 120
                }
            }`,
          dry: {
            head: ['frame', 'n', 'base case?', 'smaller (returned by child)', 'returns'],
            rows: [
              ['fact(5)', '5', 'no → call fact(4)', '24', H.c('p', '120')],
              ['fact(4)', '4', 'no → call fact(3)', '6', '24'],
              ['fact(3)', '3', 'no → call fact(2)', '2', '6'],
              ['fact(2)', '2', 'no → call fact(1)', '1', '2'],
              ['fact(1)', '1', H.c('g', 'yes'), '—', H.c('g', '1')]
            ]
          },
          complexity: `<p><b>Time O(N)</b>: one call per number from N down to 1, each doing one multiplication. <b>Space O(N)</b>: at the deepest moment N frames are waiting on the stack.</p>`
        }
      },
      {
        title: 'Pow(x, n) — fast power by recursion',
        level: 'Medium',
        tags: ['recursion', 'divide and conquer', 'binary exponentiation'],
        statement: `<p>Implement <code>myPow(x, n)</code> which returns x raised to the power n (x<sup>n</sup>). <code>x</code> is a double, <code>n</code> is an int and may be <b>negative</b> (x<sup>-n</sup> = 1 / x<sup>n</sup>).</p>`,
        constraints: `-100.0 &lt; x &lt; 100.0, -2<sup>31</sup> ≤ n ≤ 2<sup>31</sup> − 1, x ≠ 0 when n &lt; 0`,
        example: `<p>Input: <b>x = 2, n = 10</b> → Output: ${H.c('p', '<b>1024.0</b>')}</p>
          ${H.table(['call', 'n even?', 'how', 'value'], [
            ['pow(2,10)', 'yes', 'half = pow(2,5); half × half', H.c('p', '32 × 32 = 1024')],
            ['pow(2,5)', H.c('y', 'no'), 'half = pow(2,2); half × half × x', '4 × 4 × 2 = 32'],
            ['pow(2,2)', 'yes', 'half = pow(2,1); half × half', '2 × 2 = 4'],
            ['pow(2,1)', H.c('y', 'no'), 'half = pow(2,0); half × half × x', '1 × 1 × 2 = 2'],
            ['pow(2,0)', '—', H.c('g', 'base case'), '1']
          ])}
          <p>Why: 2<sup>10</sup> = (2<sup>5</sup>)<sup>2</sup>. Halving n each time needs only 5 calls instead of 10 multiplications. Example 2: x = 2, n = -2 → 1 / 2<sup>2</sup> = 0.25.</p>`,
        brute: {
          why: `<p>Multiply x by itself |n| times. For n = 2<sup>31</sup> − 1 that is about 2 billion multiplications → too slow (TLE). A plain recursion <code>pow(x, n) = x × pow(x, n − 1)</code> is even worse: 2 billion <b>stack frames</b> → StackOverflowError. The wasted work: we compute x<sup>5</sup> and then <i>again</i> rebuild x<sup>5</sup> for the second half instead of reusing it.</p>`,
          code: `
            double powBrute(double x, int n) {
                long m = Math.abs((long) n);   // long so that -2^31 does not overflow
                double ans = 1.0;
                for (long i = 0; i < m; i++) {
                    ans *= x;                  // one multiplication per unit of n
                }
                return n < 0 ? 1.0 / ans : ans;
            }`
        },
        mcq: {
          q: `To compute x<sup>13</sup> recursively with as few calls as possible, what should <code>pow(x, 13)</code> do?`,
          options: ['x × pow(x, 12)', 'h = pow(x, 6); return h × h × x', 'pow(x, 6) × pow(x, 7) (two separate calls)', 'pow(x, 13 / 2) + pow(x, 13 / 2)'],
          answer: 1,
          explain: `13 is odd: 13 = 6 + 6 + 1, so x<sup>13</sup> = x<sup>6</sup> × x<sup>6</sup> × x. Calling pow(x, 6) <b>once</b> and squaring halves n per level → O(log n). Option C makes two calls and becomes O(n) again.`
        },
        hints: [
          `<p><b>Aha:</b> x<sup>n</sup> = (x<sup>n/2</sup>)<sup>2</sup> when n is even, and x × (x<sup>n/2</sup>)<sup>2</sup> when n is odd (integer division). So each call halves n.</p>`,
          `<p>Store the half result in a local variable <code>half</code> and multiply it by itself — call the recursion <b>once</b>, not twice. Depth becomes about log₂n ≈ 31.</p>`,
          `<p>Traps: n = −2<sup>31</sup> → <code>-n</code> overflows int, so copy n into a <code>long</code> first. Negative n → compute with x = 1/x and positive n. Recipe: N = (long) n; if N &lt; 0 { x = 1/x; N = −N; } return fast(x, N); fast: if N == 0 return 1; half = fast(x, N/2); return N even ? half·half : half·half·x.</p>`
        ],
        solution: {
          approach: `<p>Divide and conquer: compute x<sup>N/2</sup> once, square it, multiply one extra x if N is odd.</p>`,
          code: `
            class Solution {
                public double myPow(double x, int n) {
                    long N = n;                 // long: -(-2^31) does not fit in int
                    if (N < 0) {
                        x = 1 / x;              // x^-N = (1/x)^N
                        N = -N;
                    }
                    return fastPow(x, N);
                }

                private double fastPow(double x, long N) {
                    if (N == 0) {
                        return 1.0;             // base case: anything^0 = 1
                    }
                    double half = fastPow(x, N / 2); // ONE recursive call on half the exponent
                    if (N % 2 == 0) {
                        return half * half;     // even: x^N = (x^(N/2))^2
                    } else {
                        return half * half * x; // odd: one extra x left over
                    }
                }

                public static void main(String[] args) {
                    Solution s = new Solution();
                    System.out.println(s.myPow(2.0, 10));  // 1024.0
                    System.out.println(s.myPow(2.0, -2));  // 0.25
                }
            }`,
          dry: {
            head: ['call', 'N', 'N / 2', 'half (from child)', 'N % 2', 'returns'],
            rows: [
              ['fastPow(2,10)', '10', '5', '32', '0 (even)', H.c('p', '32 × 32 = 1024')],
              ['fastPow(2,5)', '5', '2', '4', '1 (odd)', '4 × 4 × 2 = 32'],
              ['fastPow(2,2)', '2', '1', '2', '0 (even)', '2 × 2 = 4'],
              ['fastPow(2,1)', '1', '0', '1', '1 (odd)', '1 × 1 × 2 = 2'],
              ['fastPow(2,0)', '0', '—', '—', '—', H.c('g', '1.0 (base)')]
            ]
          },
          complexity: `<p><b>Time O(log n)</b>: n is halved on every call, so there are about log₂|n| + 1 ≈ 32 calls at most. <b>Space O(log n)</b>: that is also the deepest the call stack gets.</p>`
        }
      }
    ]
  });

  // ===================== TOPIC 2: Recurrence trees =====================
  topics.push({
    title: 'Recurrence Trees: Counting the Work of a Recursive Function',
    analogy: `<p><b>A phone tree in a school.</b> The principal calls 2 teachers, each teacher calls 2 parents, each parent calls 2 more parents… To know how many calls were made in total, you do not trace each call one by one — you count <b>level by level</b>: 1 + 2 + 4 + 8 + … Then add the levels. A <b>recurrence tree</b> is exactly that drawing for a recursive function: one node per call, and we add up the work level by level.</p>`,
    explain: `<p>A <b>recurrence</b> is just a formula for the running time written in terms of smaller inputs. <code>T(n) = 2T(n/2) + n</code> means: "to solve size n, I make <b>2</b> calls of size <b>n/2</b> and do <b>n</b> extra work myself (like merging)". To solve it visually:</p>
      <ol>
        <li>Draw the root with its extra work.</li>
        <li>Draw its children (one per recursive call) with <i>their</i> extra work, and so on, down to the base case.</li>
        <li>Add each <b>level</b>. Then add all levels.</li>
      </ol>
      <h4>Case 1: T(n) = T(n − 1) + 1 → a single chain → O(n)</h4>
      <p>One call, input shrinks by 1, constant extra work. Examples: factorial, print 1..N, sum of an array recursively.</p>
      ${H.table(['level', 'calls', 'work per call', 'level total'], [['0', '1 (size n)', '1', '1'], ['1', '1 (size n−1)', '1', '1'], ['…', '…', '…', '…'], ['n−1', '1 (size 1)', '1', '1'], [H.c('p', 'total'), '', '', H.c('p', 'n → O(n)')]])}
      <h4>Case 2: T(n) = 2T(n − 1) + 1 → doubling tree → O(2<sup>n</sup>)</h4>
      <p>Two calls, each only 1 smaller. Examples: Tower of Hanoi, naive Fibonacci (which is a bit less: about 1.618<sup>n</sup>).</p>
      ${H.table(['level', 'calls', 'work per call', 'level total'], [['0', '1', '1', '1'], ['1', '2', '1', '2'], ['2', '4', '1', '4'], ['3', '8', '1', '8'], [H.c('p', 'n = 4 total'), '', '', H.c('p', '1+2+4+8 = 15 = 2<sup>4</sup> − 1')]])}
      <p>Each level doubles, so the last level alone is about half of everything: total = 2<sup>n</sup> − 1 → <b>O(2<sup>n</sup>)</b>. That is why such code only survives for <b>n ≤ 20–25</b>.</p>
      <h4>Case 3: T(n) = 2T(n/2) + n → balanced tree → O(n log n)</h4>
      <p>Two calls on halves, plus linear work (Merge Sort!). The node count doubles every level, but each piece is half as big — they cancel, so <b>every level costs n</b>.</p>
      ${H.table(['level', 'calls', 'size of each', 'level total'], [['0', '1', '8', '8'], ['1', '2', '4', '2 × 4 = 8'], ['2', '4', '2', '4 × 2 = 8'], ['3', '8', '1', '8 × 1 = 8'], [H.c('p', 'n = 8 total'), '', '', H.c('p', '4 levels × 8 = 32')]])}
      <p>How many levels? You can halve 8 → 4 → 2 → 1 three times, so log₂8 + 1 = 4 levels. Total = n × (log₂n + 1) → <b>O(n log n)</b>.</p>
      <h4>Cheat sheet</h4>
      ${H.table(['recurrence', 'shape', 'answer', 'example'], [
        ['T(n) = T(n−1) + 1', 'chain', 'O(n)', 'factorial, print 1..N'],
        ['T(n) = T(n/2) + 1', 'chain that halves', 'O(log n)', 'binary search, fast power'],
        ['T(n) = 2T(n/2) + n', 'balanced, n per level', 'O(n log n)', 'merge sort'],
        ['T(n) = 2T(n−1) + 1', 'doubling', 'O(2<sup>n</sup>)', 'Tower of Hanoi'],
        ['T(n) = T(n−1) + T(n−2) + 1', 'almost doubling', '≈ O(1.618<sup>n</sup>)', 'naive Fibonacci'],
        ['T(n) = n · T(n−1)', 'n, n−1, n−2 … branches', 'O(n!)', 'permutations']
      ])}
      <p><b>Time</b> = total of all nodes. <b>Space</b> (stack) = the <b>height</b> of the tree, because only one root-to-leaf path is on the stack at any moment.</p>`,
    clues: [
      'Code calls itself <b>twice on n − 1</b> → exponential O(2<sup>n</sup>): only OK when <b>N ≤ 20–25</b>.',
      'Code splits the input in <b>halves</b> and does a linear pass (merge) → O(n log n); fine for N ≤ 10<sup>5</sup>–10<sup>6</sup>.',
      'One call on <b>n − 1</b> with O(1) work → O(n); one call on <b>n / 2</b> → O(log n).',
      'Constraint hints: <b>N ≤ 10</b> → n! is OK; <b>N ≤ 20</b> → 2<sup>n</sup> is OK; <b>N ≤ 10<sup>5</sup></b> → you need n log n.',
      'Same sub-call appears many times in the tree (fib(2) again and again) → a sign that <b>memoization / DP</b> will help later.'
    ],
    code: `
      class RecurrenceExamples {
          // T(n) = T(n-1) + 1  -> O(n)
          static int sumTo(int n) {
              if (n == 0) return 0;
              return n + sumTo(n - 1);
          }

          // T(n) = T(n/2) + 1  -> O(log n)
          static int countHalvings(int n) {
              if (n <= 1) return 0;
              return 1 + countHalvings(n / 2);
          }

          // T(n) = 2T(n-1) + 1  -> O(2^n): count the calls to see the doubling
          static long calls = 0;
          static void doubleTree(int n) {
              calls++;
              if (n == 0) return;
              doubleTree(n - 1);
              doubleTree(n - 1);
          }

          // T(n) = 2T(n/2) + n -> O(n log n): returns total "work" done
          static long mergeWork(int n) {
              if (n <= 1) return 1;
              return mergeWork(n / 2) + mergeWork(n - n / 2) + n;  // two halves + linear merge
          }

          public static void main(String[] args) {
              System.out.println(sumTo(10));          // 55
              System.out.println(countHalvings(1024)); // 10
              doubleTree(4);
              System.out.println(calls);               // 31 = 2^5 - 1 (levels n..0)
              System.out.println(mergeWork(8));        // 32 = 8 * 3 (merges) + 8 (leaves)
          }
      }`,
    codeTitle: 'Each recurrence shape as real code',
    viz: [
      {
        title: 'Recursion tree for fib(n) — see the repeated work',
        input: '5',
        inputLabel: 'n (2-5)',
        gen: genFibTree
      },
      {
        title: 'Solve a recurrence level by level',
        input: 'merge 8',
        inputLabel: 'chain N | double N | merge N',
        gen: genRecurrence
      }
    ],
    after: `<p>Try <code>chain 5</code> (T(n) = T(n−1) + 1), <code>double 4</code> (T(n) = 2T(n−1) + 1) and <code>merge 16</code> (T(n) = 2T(n/2) + n) in the second visualizer and compare how fast the bars grow.</p>`,
    examples: [
      {
        title: 'Binary search: T(n) = T(n/2) + 1',
        html: `<p>Each call throws away half the array and does O(1) work (one comparison). Tree = a single chain: n → n/2 → n/4 → … → 1. Number of levels = log₂n + 1.</p>
          ${H.table(['n', '1024', '10<sup>6</sup>', '10<sup>9</sup>'], [['levels ≈ log₂n', '10', '20', '30']])}
          <p>Answer: <b>O(log n)</b> time and O(log n) stack for the recursive version (O(1) for the loop version).</p>`,
        code: `
          class BS {
              static int search(int[] a, int lo, int hi, int x) {
                  if (lo > hi) return -1;                    // base: empty range
                  int mid = lo + (hi - lo) / 2;              // overflow-safe middle
                  if (a[mid] == x) return mid;
                  if (a[mid] < x) return search(a, mid + 1, hi, x); // ONE call on half
                  return search(a, lo, mid - 1, x);
              }
              public static void main(String[] args) {
                  System.out.println(search(new int[]{1, 3, 5, 7, 9, 11}, 0, 5, 9)); // 4
              }
          }`
      },
      {
        title: 'Same code shape, very different cost: one call vs two calls',
        html: `<p>Both functions below compute x<sup>n</sup>. The only difference is whether the half result is <b>stored</b> or <b>recomputed</b>.</p>
          ${H.table(['version', 'recurrence', 'calls for n = 1024', 'Big-O'], [['h = pow(n/2); h*h', 'T(n) = T(n/2) + 1', H.c('g', '≈ 11'), H.c('g', 'O(log n)')], ['pow(n/2) * pow(n/2)', 'T(n) = 2T(n/2) + 1', H.c('r', '≈ 2047'), H.c('r', 'O(n)')]])}
          <p>Two calls on halves with O(1) work: level totals 1, 2, 4, …, n → sum ≈ 2n. Storing the result in a variable collapses the tree into a chain.</p>`
      },
      {
        title: 'Substitution: unroll T(n) = T(n − 1) + n',
        html: `<p>Selection-sort-style recursion: do n work, recurse on n − 1. Unroll it:</p>
          <p>T(n) = n + T(n−1) = n + (n−1) + T(n−2) = … = n + (n−1) + … + 1 = n(n+1)/2.</p>
          ${H.table(['n', '4', '10', '1000'], [['n(n+1)/2', '10', '55', '500,500']])}
          <p>Answer: <b>O(n<sup>2</sup>)</b>. The tree is a chain, but the work per level shrinks only by 1 each time (an arithmetic progression).</p>`
      },
      {
        title: 'Count calls in naive Fibonacci (runnable)',
        html: `<p>Calls(n) = Calls(n−1) + Calls(n−2) + 1 grows like 1.618<sup>n</sup>. Run it and watch the call count explode, then watch memoization (remembering answers) bring it to n + 1 distinct computations.</p>`,
        code: { lang: 'python', run: true, code: `from functools import lru_cache

calls = 0
def fib(n):
    global calls
    calls += 1
    return n if n <= 1 else fib(n - 1) + fib(n - 2)

for n in (10, 20, 25):
    calls = 0
    fib(n)
    print("fib(%d): %d calls" % (n, calls))

@lru_cache(maxsize=None)
def fib_memo(n):
    return n if n <= 1 else fib_memo(n - 1) + fib_memo(n - 2)

print(fib_memo(90), fib_memo.cache_info().misses, "distinct computations")` }
      }
    ],
    deepDive: `<h4>The Master Theorem (shortcut for divide &amp; conquer)</h4>
      <p>For <b>T(n) = a·T(n/b) + O(n<sup>d</sup>)</b> (a calls, each on 1/b of the input, n<sup>d</sup> extra work), compare <b>a</b> with <b>b<sup>d</sup></b>:</p>
      ${H.table(['case', 'meaning', 'result', 'example'], [
        ['a &lt; b<sup>d</sup>', 'root does most of the work', 'O(n<sup>d</sup>)', 'T(n) = T(n/2) + n → O(n)'],
        ['a = b<sup>d</sup>', 'every level costs the same', 'O(n<sup>d</sup> log n)', 'merge sort 2T(n/2) + n → O(n log n); binary search T(n/2) + 1 → O(log n)'],
        ['a &gt; b<sup>d</sup>', 'leaves dominate', 'O(n<sup>log_b a</sup>)', 'Karatsuba 3T(n/2) + n → O(n<sup>1.585</sup>); 2T(n/2) + 1 → O(n)']
      ])}
      <p>It only applies to "divide by b" recurrences. For "subtract" recurrences like T(n) = 2T(n−1) + 1 use the tree or unrolling: that is a geometric series 1 + 2 + … + 2<sup>n−1</sup> = 2<sup>n</sup> − 1.</p>
      <h4>Branching factor and depth: the backtracking formula</h4>
      <p>A recursion tree with branching factor <b>b</b> and depth <b>d</b> has at most b<sup>d</sup> leaves and about b<sup>d</sup>·b/(b−1) nodes in total (the last level dominates). Subsets: b = 2, d = n → 2<sup>n</sup>. Permutations: branching shrinks n, n−1, …, 1 → n! leaves, but the internal nodes add up to about e·n! (since n!/1! + n!/2! + … ≈ (e − 1)·n!). Multiply the node count by the work per node to get time.</p>
      <h4>Why Fibonacci is 1.618<sup>n</sup>, not 2<sup>n</sup></h4>
      <p>The right branch shrinks by 2, so the tree is lopsided. Calls(n) satisfies the Fibonacci recurrence itself, so it grows like φ<sup>n</sup> with φ = (1 + √5)/2 ≈ 1.618. Upper bound 2<sup>n</sup> is still correct Big-O, but Θ(φ<sup>n</sup>) is tight. For n = 40 the exact count is 2·F(41) − 1 ≈ 3.3·10<sup>8</sup> calls — already past a 1-second limit.</p>
      <h4>Space ≠ time</h4>
      <p>Stack space = <b>height</b> of the recursion tree (only one root-to-leaf path is alive at a time), plus any data each frame owns. Fib: O(2<sup>n</sup>) time but O(n) space. Merge sort: O(log n) stack but O(n) for the merge buffer.</p>
      <h4>Overlapping subproblems → DP</h4>
      <p>If the same (arguments) node appears many times in the tree, caching answers (memoization) turns the tree into a DAG with one node per distinct state: time = states × work per state. That is the bridge from this module to Dynamic Programming.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking "what's the complexity of this code?" gets a quick answer, but models often pattern-match ("recursive → O(2<sup>n</sup>)") without drawing the tree. You win interviews by deriving it on the whiteboard: branching factor, depth, work per node.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my recurrence T(n) = 3T(n/3) + n. Check my level-by-level sum; don't just state the answer</code>. Ask it to generate code variants (one call vs two calls) and predict each complexity yourself before reading its answer.</p>
      <p><b>Where AI goes wrong:</b> applying the Master Theorem to subtract-recurrences like T(n) = T(n−1) + n, forgetting the copy cost (n per subset) in backtracking, and quoting O(n) space for recursion while ignoring that Python/Java frames are heavy.</p>
      <p><b>What you must still own:</b> turning code into a recurrence, choosing the right solving method (tree, unrolling, Master), and using the result to accept or reject an approach against the constraints.</p>`,
    problems: [
      {
        title: 'Fibonacci Number (from O(2^n) to O(n))',
        level: 'Easy',
        tags: ['recursion', 'recurrence tree', 'memoization'],
        companies: ['Amazon', 'Adobe'],
        statement: `<p>The Fibonacci numbers are F(0) = 0, F(1) = 1 and F(n) = F(n − 1) + F(n − 2) for n &gt; 1. Given <code>n</code>, return <b>F(n)</b>. Then explain, using the recursion tree, why the naive recursive version is slow and how to fix it.</p>`,
        constraints: `0 ≤ n ≤ 90 (F(90) ≈ 2.9 × 10<sup>18</sup> fits in a <code>long</code>)`,
        example: `<p>Input <b>n = 6</b> → Output ${H.c('p', '<b>8</b>')}</p>
          ${H.arr([0, 1, 1, 2, 3, 5, 8], { label: 'F', hl: { 6: 'p', 4: 'g', 5: 'g' } })}
          <p>Why: F(6) = F(5) + F(4) = 5 + 3 = 8. The naive tree for n = 6 makes 25 calls; F(2) alone is recomputed 5 times.</p>`,
        brute: {
          why: `<p>Direct translation of the definition: two calls per frame, each shrinking by only 1 or 2 → about 1.618<sup>n</sup> calls. n = 50 is already ~4·10<sup>10</sup> calls (tens of seconds to minutes); n = 90 would take longer than a human lifetime. The wasted work: identical subtrees like F(n − 2) are rebuilt from scratch on both sides of the tree.</p>`,
          code: `
            long fibNaive(int n) {
                if (n <= 1) return n;                       // F(0) = 0, F(1) = 1
                return fibNaive(n - 1) + fibNaive(n - 2);   // two calls -> exponential
            }`
        },
        mcq: {
          q: `In the recursion tree of naive fib(n), how many <b>distinct</b> arguments ever appear?`,
          options: ['About 2<sup>n</sup>', 'n + 1 (the values 0..n)', 'n<sup>2</sup>', 'log n'],
          answer: 1,
          explain: `Every call has an argument between 0 and n, so only n + 1 distinct sub-problems exist; the exponential count comes purely from repeating them. Cache each one once → O(n).`
        },
        hints: [
          `<p><b>Aha:</b> the tree has exponentially many nodes but only n + 1 different labels (fib(0)..fib(n)). Repeated labels = repeated work.</p>`,
          `<p>Keep a <code>long[] memo</code> of size n + 1 filled with −1. Before computing fib(k), check memo[k]; after computing, store it. Or drop recursion and loop with two variables.</p>`,
          `<p>Traps: use <code>long</code> (F(47) overflows <code>int</code>); handle n = 0 and n = 1; do not use 0 as "not computed" since F(0) = 0. Recipe: if k ≤ 1 return k; if memo[k] != −1 return it; memo[k] = f(k−1) + f(k−2); return memo[k].</p>`
        ],
        solution: {
          approach: `<p>Memoized recursion: same recursive shape, but every distinct state is computed once. Then the O(1)-space loop is the "bottom-up" version of the same idea.</p>`,
          code: `
            import java.util.*;

            class Solution {
                private long[] memo;

                public long fib(int n) {
                    memo = new long[n + 1];
                    Arrays.fill(memo, -1);           // -1 = "not computed yet"
                    return go(n);
                }

                private long go(int k) {
                    if (k <= 1) return k;            // base cases F(0) = 0, F(1) = 1
                    if (memo[k] != -1) return memo[k]; // already solved: O(1)
                    memo[k] = go(k - 1) + go(k - 2); // solve once, remember
                    return memo[k];
                }

                // Bottom-up, O(1) space: only the last two values matter.
                public long fibLoop(int n) {
                    long a = 0, b = 1;               // a = F(i), b = F(i+1)
                    for (int i = 0; i < n; i++) {
                        long c = a + b;
                        a = b;
                        b = c;
                    }
                    return a;
                }

                public static void main(String[] args) {
                    Solution s = new Solution();
                    System.out.println(s.fib(6));      // 8
                    System.out.println(s.fibLoop(90)); // 2880067194370816120
                }
            }`,
          alt: [{ lang: 'python', code: `from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n: int) -> int:
    return n if n <= 1 else fib(n - 1) + fib(n - 2)

print(fib(6), fib(90))`, run: true }],
          dry: {
            head: ['call', 'memo hit?', 'computes', 'memo after'],
            rows: [
              ['go(6)', 'no', 'go(5) + go(4)', '…'],
              ['go(5) → go(4) → go(3) → go(2)', 'no', 'go(1) + go(0) = 1', 'memo[2] = 1'],
              ['go(3)', 'no', '1 + go(1) = 2', 'memo[3] = 2'],
              ['go(4)', 'no', '2 + ' + H.c('g', 'memo[2]') + ' = 3', 'memo[4] = 3'],
              ['go(5)', 'no', '3 + ' + H.c('g', 'memo[3]') + ' = 5', 'memo[5] = 5'],
              ['go(6)', 'no', '5 + ' + H.c('g', 'memo[4]') + ' = 8', H.c('p', 'memo[6] = 8')]
            ]
          },
          complexity: `<p>Memoized: <b>O(n) time</b> (each k computed once, O(1) work), <b>O(n) space</b> (memo + stack depth n). Loop: O(n) time, <b>O(1)</b> space. (Matrix exponentiation can even do O(log n) — see Advanced Mathematics.)</p>`,
          followUps: ['Climbing Stairs (same recurrence)', 'Tribonacci: three calls per frame — what is the naive cost?', 'Compute F(10<sup>18</sup>) mod 10<sup>9</sup>+7']
        }
      }
    ]
  });
  // ===================== TOPIC 3: Tower of Hanoi =====================
  topics.push({
    title: 'Tower of Hanoi',
    analogy: `<p>You are moving house and must shift a <b>pile of plates</b> from table A to table C. Rules: carry <b>one plate at a time</b>, and never put a <b>bigger plate on a smaller one</b> (it would crack). Table B is free to use as a helper.</p>
      <p>The trick is to be lazy: "If a friend could magically move the top n − 1 plates to table B for me, I would just carry the biggest plate to C, and then ask the friend to move the n − 1 plates from B onto it." The "friend" is just <b>you, solving a smaller version</b> — that is recursion.</p>`,
    explain: `<p>To move <b>n</b> disks from <code>from</code> to <code>to</code> using <code>via</code>:</p>
      <ol>
        <li>Move the top <b>n − 1</b> disks <code>from → via</code> (using <code>to</code> as helper). <i>Recursive call.</i></li>
        <li>Move the <b>biggest</b> disk <code>from → to</code>. <i>One real move.</i></li>
        <li>Move the <b>n − 1</b> disks <code>via → to</code> (using <code>from</code> as helper). <i>Recursive call.</i></li>
      </ol>
      <p><b>Base case:</b> n = 1 → just move that one disk (or n = 0 → do nothing).</p>
      <p>All 7 moves for n = 3 (A → C):</p>
      ${H.table(['move', 'disk', 'from → to', 'which step made it'], [
        ['1', '1', 'A → C', 'inside "move 2 disks A → B"'],
        ['2', '2', 'A → B', 'inside "move 2 disks A → B"'],
        ['3', '1', 'C → B', 'inside "move 2 disks A → B"'],
        [H.c('p', '4'), H.c('p', '3'), H.c('p', 'A → C'), H.c('p', 'the big disk moves (step 2)')],
        ['5', '1', 'B → A', 'inside "move 2 disks B → C"'],
        ['6', '2', 'B → C', 'inside "move 2 disks B → C"'],
        ['7', '1', 'A → C', 'inside "move 2 disks B → C"']
      ])}
      <h4>Why 2<sup>n</sup> − 1 moves?</h4>
      <p>Moves(n) = Moves(n − 1) + 1 + Moves(n − 1) = 2·Moves(n − 1) + 1. That is the doubling recurrence from the previous topic:</p>
      ${H.table(['n', '1', '2', '3', '4', '5', '10', '64'], [['moves', '1', '3', '7', '15', '31', '1023', '≈ 1.8 × 10<sup>19</sup>']])}
      <p>And it is the <b>minimum</b>: the biggest disk must move at least once, and before that happens all other n − 1 disks must be sitting on the helper peg — which by itself takes Moves(n − 1).</p>`,
    clues: [
      '"Move all disks / rings / plates from one rod to another, <b>one at a time</b>, never larger on smaller".',
      '"Find the <b>minimum number of moves</b>" → answer is 2<sup>n</sup> − 1 (use <code>long</code> or <code>(1L &lt;&lt; n) - 1</code>).',
      '"<b>Print all the moves</b>" with N ≤ 16–20 → recursive 3-step plan; output size itself is 2<sup>n</sup> − 1.',
      'Any problem where "to do the big thing I first move everything above it out of the way" → same 3-step recursion.'
    ],
    viz: {
      title: 'Tower of Hanoi moves on three pegs',
      input: '3',
      inputLabel: 'number of disks (1-6)',
      gen: genHanoi
    },
    code: `
      class Hanoi {
          static long moves = 0;

          // Move n disks from 'from' to 'to' using 'via' as the helper peg.
          static void hanoi(int n, char from, char to, char via) {
              if (n == 0) return;                  // base case: nothing to move
              hanoi(n - 1, from, via, to);         // 1) park n-1 disks on the helper
              moves++;
              System.out.println("disk " + n + ": " + from + " -> " + to); // 2) biggest disk
              hanoi(n - 1, via, to, from);         // 3) bring n-1 disks on top of it
          }

          public static void main(String[] args) {
              hanoi(3, 'A', 'C', 'B');
              System.out.println("moves = " + moves + " (2^3 - 1 = " + ((1L << 3) - 1) + ")");
          }
      }`,
    codeTitle: 'Tower of Hanoi in 6 lines',
    examples: [
      {
        title: 'n = 1 and n = 2 by hand',
        html: `<p><b>n = 1:</b> one move, A → C. <b>n = 2:</b> small disk A → B (out of the way), big disk A → C, small disk B → C. 3 moves. Notice that n = 2 used the n = 1 solution twice (once to B, once to C) — the whole recursion in miniature.</p>
          ${H.table(['n', 'Moves(n) = 2·Moves(n−1) + 1'], [['1', '1'], ['2', '2·1 + 1 = 3'], ['3', '2·3 + 1 = 7'], ['4', '2·7 + 1 = 15']])}`
      },
      {
        title: 'Which disk moves at step k? (no recursion needed)',
        html: `<p>A beautiful pattern: at move number k (1-based), the disk that moves is <b>1 + (number of trailing zero bits of k)</b>. Moves 1..7: disk 1, 2, 1, 3, 1, 2, 1 — exactly the "ruler sequence". Disk 1 moves every other step; disk n moves exactly once, in the middle (step 2<sup>n−1</sup>).</p>
          ${H.table(['k', '1', '2', '3', '4', '5', '6', '7'], [['binary', '001', '010', '011', '100', '101', '110', '111'], ['disk', '1', '2', '1', H.c('p', '3'), '1', '2', '1']])}`,
        code: `
          class WhichDisk {
              public static void main(String[] args) {
                  for (int k = 1; k <= 7; k++) {
                      int disk = Integer.numberOfTrailingZeros(k) + 1;   // ruler sequence
                      System.out.print(disk + " ");                     // 1 2 1 3 1 2 1
                  }
              }
          }`
      },
      {
        title: 'Iterative Hanoi (for when recursion is banned)',
        html: `<p>For an <b>odd</b> n, the smallest disk cycles A → C → B → A …; for <b>even</b> n it cycles A → B → C → A …. Between its moves, make the only legal move that does not involve the smallest disk. This produces the same optimal 2<sup>n</sup> − 1 moves with an explicit loop — a nice answer to "can you do it without recursion?".</p>`
      },
      {
        title: 'Counting moves for big n without printing',
        html: `<p>"How many moves for n = 40?" Do not simulate — use the closed form <code>(1L &lt;&lt; n) - 1</code> = 1,099,511,627,775. For n ≥ 63 even a <code>long</code> overflows (2<sup>63</sup> − 1 is the max), so use <code>BigInteger.ONE.shiftLeft(n).subtract(BigInteger.ONE)</code>. Recognising "the output is exponential" tells you the interviewer wants the formula, not the list.</p>`
      }
    ],
    deepDive: `<h4>Proof that 2<sup>n</sup> − 1 is optimal</h4>
      <p>Let M(n) be the true minimum. The largest disk must move at least once. At its <b>first</b> move nothing may sit on top of it and the destination peg must be empty (any disk there would be smaller), so all n − 1 smaller disks must be stacked on the third peg — getting them there costs at least M(n − 1). After its <b>last</b> move, the n − 1 disks still need to be moved onto it: at least M(n − 1) more. So M(n) ≥ 2M(n − 1) + 1, and our algorithm achieves exactly that. Induction gives M(n) = 2<sup>n</sup> − 1.</p>
      <h4>Structure of the state space</h4>
      <p>All 3<sup>n</sup> legal configurations form a graph shaped like the <b>Sierpiński triangle</b>; the optimal solution is the path along one side of it. That is why a BFS (see the brute force below) finds the same 2<sup>n</sup> − 1 answer, just with exponential memory.</p>
      <h4>Variants interviewers use</h4>
      <ul>
        <li><b>Four pegs</b> (Reve's puzzle): the Frame–Stewart algorithm — move k disks using 4 pegs, the rest using 3 — is optimal (proved in 2014 for 4 pegs). Moves grow roughly like 2<sup>√(2n)</sup>.</li>
        <li><b>Adjacent moves only</b> (A ↔ B ↔ C, no A ↔ C): needs 3<sup>n</sup> − 1 moves; recurrence T(n) = 3T(n − 1) + 2.</li>
        <li><b>Given a configuration, how many moves are left?</b> Look at disks from largest to smallest and decide which half of the move sequence you are in — O(n).</li>
      </ul>
      <h4>Why it is the poster child of recursion</h4>
      <p>It shows the "leap of faith" perfectly: you never think about how the n − 1 tower moves, only that it can. It also shows that recursion is not always about speed: the answer itself has exponential size, so no algorithm can be faster than O(2<sup>n</sup>) for printing it.</p>`,
    aiEra: `<p><b>What AI changes:</b> Hanoi code is the most memorised recursive snippet on the internet, so writing it proves nothing. Interviewers instead ask you to <b>derive</b> the recurrence, prove optimality, count moves for a given n, or handle a twist (four pegs, adjacent-only moves, resume from a mid-game state).</p>
      <p><b>Use AI as a partner:</b> <code>Generate the move list for n = 4 and I will check that no larger disk lands on a smaller one</code> — then write a tiny validator yourself. Ask it for the iterative algorithm and verify the parity rule by hand for n = 2 and n = 3.</p>
      <p><b>Where AI goes wrong:</b> swaps the peg arguments in the second recursive call (producing illegal moves), uses <code>int</code> for 2<sup>n</sup> − 1 with n = 40, or tries to print 2<sup>40</sup> lines when only the count was asked.</p>
      <p><b>What you must still own:</b> the 3-step decomposition, the recurrence and its closed form, and the judgement that an exponential output size means exponential time is unavoidable.</p>`,
    problems: [
      {
        title: 'Tower of Hanoi — print every move',
        level: 'Medium',
        tags: ['recursion', 'divide and conquer'],
        statement: `<p>There are <code>N</code> disks of different sizes stacked on rod <b>A</b> (largest at the bottom). Move the entire stack to rod <b>C</b> using rod <b>B</b> as a helper. Only one disk can move at a time, and a disk can never be placed on a smaller disk. Return the list of moves in order, formatted like <code>"move disk 1 from A to C"</code>, and the total number of moves.</p>`,
        constraints: `1 ≤ N ≤ 16 (the output itself has 2<sup>N</sup> − 1 lines)`,
        example: `<p>Input: <b>N = 2</b> → Output (3 moves):</p>
          ${H.table(['#', 'move'], [['1', 'move disk 1 from A to ' + H.c('y', 'B')], ['2', H.c('p', 'move disk 2 from A to C')], ['3', 'move disk 1 from B to C']])}
          <p>Why: disk 1 must get out of the way (to B) so disk 2 can go to C, then disk 1 sits on top of it. 2<sup>2</sup> − 1 = 3.</p>`,
        brute: {
          why: `<p>Without the recursive insight you might search the <b>state space</b>: every disk can be on 3 rods → 3<sup>N</sup> possible arrangements, and a BFS finds the shortest path between them. That works but explores 3<sup>N</sup> states (43 million for N = 16) and needs that much memory, while the recursion goes <b>straight</b> to the optimal 2<sup>N</sup> − 1 moves with only N frames of memory.</p>`,
          code: `
            int bfsMinMoves(int n) {
                int total = 1;
                for (int i = 0; i < n; i++) total *= 3;     // 3^n states
                int[] pw = new int[n];
                pw[0] = 1;
                for (int i = 1; i < n; i++) pw[i] = pw[i - 1] * 3;
                int[] dist = new int[total];
                Arrays.fill(dist, -1);
                // state digit d (base 3) = rod of disk d; disk 0 is the smallest. Start: all on rod 0.
                int goal = total - 1;                       // all digits = 2 -> all on rod C
                ArrayDeque<Integer> q = new ArrayDeque<>();
                dist[0] = 0;
                q.add(0);
                while (!q.isEmpty()) {
                    int s = q.poll();
                    if (s == goal) return dist[s];
                    int[] top = {-1, -1, -1};               // smallest disk on each rod
                    for (int d = 0; d < n; d++) {
                        int rod = (s / pw[d]) % 3;
                        if (top[rod] == -1) top[rod] = d;
                    }
                    for (int p = 0; p < 3; p++) {
                        if (top[p] == -1) continue;
                        for (int r = 0; r < 3; r++) {
                            if (r == p) continue;
                            if (top[r] != -1 && top[r] < top[p]) continue; // cannot put bigger on smaller
                            int ns = s + (r - p) * pw[top[p]];
                            if (dist[ns] == -1) {
                                dist[ns] = dist[s] + 1;
                                q.add(ns);
                            }
                        }
                    }
                }
                return -1;
            }`
        },
        mcq: {
          q: `You must move 5 disks A → C. Just before the <b>biggest</b> disk (disk 5) moves, where are disks 1–4?`,
          options: ['On rod A under disk 5', 'All on rod B, correctly stacked', 'Spread across B and C', 'All on rod C'],
          answer: 1,
          explain: `Disk 5 can only move if nothing is on top of it AND the target rod C is empty (anything on C would be smaller). So all 4 smaller disks must be stacked on the helper rod B — that is exactly step 1, "move n − 1 disks A → B".`
        },
        hints: [
          `<p><b>Aha:</b> the biggest disk is "invisible" to the smaller ones (anything can sit on it). So: move n − 1 out of the way, move the biggest, move n − 1 back on top. Moves(n) = 2·Moves(n − 1) + 1.</p>`,
          `<p>Write <code>solve(n, from, to, via, list)</code>. The two recursive calls just <b>rotate the roles</b> of the rods: first <code>(n−1, from, via, to)</code>, then <code>(n−1, via, to, from)</code>. Collect moves in a <code>List&lt;String&gt;</code>.</p>`,
          `<p>Traps: do not mix up the rod order in the second call; count with <code>long</code> if N can be large (2<sup>63</sup>); base case n == 0 → return (or n == 1 → one move). Recipe: if n == 0 return; solve(n−1, from, via, to); add "move disk n from → to"; solve(n−1, via, to, from).</p>`
        ],
        solution: {
          approach: `<p>Three-step recursion: park n − 1 on the helper, move the biggest, bring n − 1 back on top.</p>`,
          code: `
            import java.util.*;

            class Solution {
                public List<String> hanoi(int n) {
                    List<String> moves = new ArrayList<>();
                    solve(n, 'A', 'C', 'B', moves);
                    return moves;                       // moves.size() == 2^n - 1
                }

                private void solve(int n, char from, char to, char via, List<String> moves) {
                    if (n == 0) {
                        return;                         // base case: nothing to move
                    }
                    solve(n - 1, from, via, to, moves); // 1) park the n-1 smaller disks on the helper
                    moves.add("move disk " + n + " from " + from + " to " + to); // 2) biggest disk
                    solve(n - 1, via, to, from, moves); // 3) bring the n-1 disks on top of it
                }

                public static void main(String[] args) {
                    List<String> m = new Solution().hanoi(3);
                    for (String s : m) System.out.println(s);
                    System.out.println("total = " + m.size());   // 7
                }
            }`,
          dry: {
            head: ['call', 'what it does', 'move added'],
            rows: [
              ['solve(2, A, C, B)', 'first: solve(1, A, B, C)', '—'],
              ['solve(1, A, B, C)', 'solve(0) does nothing; add move; solve(0)', H.c('g', '#1: disk 1 A → B')],
              ['solve(2, A, C, B)', 'back: add its own move', H.c('p', '#2: disk 2 A → C')],
              ['solve(2, A, C, B)', 'then: solve(1, B, C, A)', '—'],
              ['solve(1, B, C, A)', 'solve(0); add move; solve(0)', H.c('g', '#3: disk 1 B → C')],
              ['done', 'stack empty', '3 moves = 2<sup>2</sup> − 1']
            ]
          },
          complexity: `<p><b>Time O(2<sup>n</sup>)</b>: the recurrence T(n) = 2T(n − 1) + 1 gives 2<sup>n</sup> − 1 moves, and we must output each one, so we cannot do better. <b>Space O(n)</b> for the call stack (depth n), plus the output list.</p>`
        }
      }
    ]
  });

  // ===================== TOPIC 4: Backtracking template =====================
  topics.push({
    title: 'The Backtracking Template: Choose → Explore → Un-choose',
    analogy: `<p><b>Trying keys on a keyring.</b> You stand at a locked door with a ring of keys. You <b>choose</b> a key and put it in the lock (choose). You turn it to see what happens (explore). It does not open? You <b>pull the key out</b> (un-choose) so the lock is empty again, and try the next key. You never leave a wrong key stuck in the lock while trying another.</p>
      <p>Or a <b>maze with chalk</b>: walk into a corridor marking the floor with chalk; at a dead end, walk back to the last junction <b>erasing your chalk</b>, and try the next corridor.</p>`,
    explain: `<p><b>Backtracking</b> = recursion that builds an answer <b>one decision at a time</b> and <b>undoes</b> a decision when it is finished exploring it. It explores a <b>decision tree</b>: each level = one decision, each branch = one possible choice.</p>
      <p>Before coding, answer three questions:</p>
      ${H.table(['question', 'subsets', 'permutations', 'N-Queens'], [
        ['<b>State</b>: what have I built so far?', 'current list, index i', 'current list + used[]', 'queens placed in rows 0..r−1'],
        ['<b>Choices</b>: what can I do next?', 'pick nums[i] or skip it', 'any unused number', 'any safe column in row r'],
        ['<b>Goal / stop</b>: when is it complete?', 'i == n', 'list size == n', 'r == n'],
        ['<b>Prune</b>: when to give up early?', '(none needed)', 'skip used numbers', 'column/diagonal attacked']
      ])}
      <h4>The universal template</h4>
      <pre>backtrack(state):
    if state is a complete answer:  save a COPY; return
    for each choice available now:
        if choice is not valid: continue        (prune)
        CHOOSE   (apply it to state)
        EXPLORE  backtrack(state)
        UN-CHOOSE (undo exactly what CHOOSE did)</pre>
      <p>Tiny example — all binary strings of length 2. The <b>same</b> StringBuilder is reused, so un-choosing is essential:</p>
      ${H.table(['step', 'action', 'sb'], [
        ['1', 'choose 0', '"0"'], ['2', 'choose 0', H.c('g', '"00" → save')], ['3', 'un-choose', '"0"'], ['4', 'choose 1', H.c('g', '"01" → save')], ['5', 'un-choose, un-choose', '""'],
        ['6', 'choose 1', '"1"'], ['7', 'choose 0', H.c('g', '"10" → save')], ['8', 'un-choose', '"1"'], ['9', 'choose 1', H.c('g', '"11" → save')]
      ])}
      <h4>Two golden rules</h4>
      <ul>
        <li><b>Save a copy</b>: <code>res.add(new ArrayList&lt;&gt;(cur))</code>. Adding <code>cur</code> itself stores a <i>reference</i> to a list you keep changing — at the end every saved entry would be the same (empty) list.</li>
        <li><b>Undo exactly what you did</b>: if you added to a list, remove the last element; if you marked <code>used[i] = true</code>, set it back to false; if you swapped, swap back; if you wrote on a board, erase it.</li>
      </ul>
      <h4>How expensive is it?</h4>
      <p>Roughly (<b>choices per level</b>)<sup><b>depth</b></sup> × (work per leaf). Subsets: 2<sup>n</sup>·n. Permutations: n!·n. That is why the constraints are tiny. <b>Pruning</b> (cutting branches that can never succeed) is what makes N-Queens and Sudoku fast in practice.</p>`,
    clues: [
      '"Return <b>all possible</b> …", "<b>generate every</b> …", "<b>print all combinations</b> / arrangements / paths".',
      'Small limits: <b>N ≤ 15–20</b> (2<sup>N</sup> fits), <b>N ≤ 8–10</b> (N! fits), board size ≤ 9.',
      '"Find <b>any</b> arrangement that satisfies these rules" (Sudoku, N-Queens, crossword) → try, check, undo.',
      '"Count the number of ways" with tiny N and no obvious formula → backtracking (later upgraded with memo/DP).',
      'Words like <b>valid</b>, <b>place</b>, <b>fill</b>, <b>partition into</b>, <b>no two … attack / repeat</b> → constraint search with pruning.'
    ],
    code: `
      import java.util.*;

      class BinaryStrings {
          static List<String> res = new ArrayList<>();

          static void backtrack(int n, StringBuilder sb) {
              if (sb.length() == n) {            // GOAL: complete answer
                  res.add(sb.toString());        // save a COPY (toString makes a new String)
                  return;
              }
              for (char ch = '0'; ch <= '1'; ch++) {   // CHOICES at this level
                  sb.append(ch);                 // CHOOSE
                  backtrack(n, sb);              // EXPLORE
                  sb.deleteCharAt(sb.length() - 1); // UN-CHOOSE (undo exactly the append)
              }
          }

          public static void main(String[] args) {
              backtrack(3, new StringBuilder());
              System.out.println(res);           // [000, 001, 010, 011, 100, 101, 110, 111]
          }
      }`,
    codeTitle: 'Template in action: all binary strings of length n',
    viz: {
      title: 'Generate parentheses: choose → explore → un-choose with pruning',
      input: '3',
      inputLabel: 'pairs n (1-4)',
      gen: genParens
    },
    examples: [
      {
        title: 'Copy vs reference — the #1 backtracking bug',
        html: `<p>Same algorithm, one-word difference:</p>
          ${H.table(['line at the goal', 'result for subsets of [1,2]'], [['res.add(cur)', H.c('r', '[[], [], [], []] — 4 references to one list that ends empty')], ['res.add(new ArrayList&lt;&gt;(cur))', H.c('g', '[[1, 2], [1], [2], []]')]])}
          <p>With a <code>StringBuilder</code>, <code>sb.toString()</code> already makes a new String, so it is safe. With an <code>int[]</code> path, use <code>path.clone()</code> or <code>Arrays.copyOf</code>.</p>`
      },
      {
        title: 'Undo must mirror do — four flavours',
        html: `${H.table(['CHOOSE', 'UN-CHOOSE'], [['cur.add(x)', 'cur.remove(cur.size() - 1)'], ['sb.append(c)', 'sb.deleteCharAt(sb.length() - 1) or sb.setLength(len)'], ['used[i] = true', 'used[i] = false'], ['board[r][c] = \'Q\'; cols[c] = true', 'board[r][c] = \'.\'; cols[c] = false'], ['swap(a, i, j)', 'swap(a, i, j) again']])}
          <p>Trick: you can skip un-choose entirely if you pass <b>new immutable state</b> to each call (e.g. <code>s + "("</code> makes a new String). It is simpler but allocates a new object per call — fine for short strings, wasteful for long lists.</p>`
      },
      {
        title: 'Letter Combinations of a Phone Number — template with a map of choices',
        html: `<p>Digits "23" → 2 = abc, 3 = def. Level i = digit i; choices = the letters of that digit. 3 × 3 = 9 strings: ad, ae, af, bd, be, bf, cd, ce, cf. State = (index, StringBuilder). Goal = index == digits.length().</p>`,
        code: `
          class Phone {
              static final String[] KEYS = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};

              static void bt(String digits, int i, StringBuilder sb, List<String> res) {
                  if (i == digits.length()) { res.add(sb.toString()); return; }   // goal
                  for (char ch : KEYS[digits.charAt(i) - '0'].toCharArray()) {    // choices
                      sb.append(ch);                    // choose
                      bt(digits, i + 1, sb, res);       // explore
                      sb.deleteCharAt(sb.length() - 1); // un-choose
                  }
              }

              public static void main(String[] args) {
                  List<String> res = new ArrayList<>();
                  bt("23", 0, new StringBuilder(), res);
                  System.out.println(res);   // [ad, ae, af, bd, be, bf, cd, ce, cf]
              }
          }`
      },
      {
        title: 'Return-boolean flavour: stop at the first solution',
        html: `<p>When the question asks for <b>one</b> valid answer (Sudoku, "can we partition…?", word search), make backtrack return <code>boolean</code> and stop as soon as a child returns true:</p>
          <pre>boolean bt(state):
    if complete: return true
    for choice: if valid:
        choose
        if (bt(state)) return true   // keep the board as is!
        un-choose
    return false</pre>
          <p>Note that on success we return <b>without</b> undoing, so the solution stays written in the state.</p>`
      }
    ],
    deepDive: `<h4>Backtracking = DFS over an implicit tree</h4>
      <p>The decision tree is never stored; it exists only as the call stack. That is why backtracking needs only O(depth) memory even when the tree has billions of nodes. Each root-to-node path is a <b>partial solution</b>; leaves are complete candidates or dead ends.</p>
      <h4>Counting cost precisely</h4>
      <p>Time ≈ (number of nodes visited) × (work per node) + (number of answers) × (copy cost). Pruning reduces the first term. For Generate Parentheses the number of answers is the Catalan number C<sub>n</sub> ≈ 4<sup>n</sup>/(n<sup>1.5</sup>√π) — e.g. C<sub>3</sub> = 5, C<sub>8</sub> = 1430 — so the runtime is O(4<sup>n</sup>/√n), far smaller than the 2<sup>2n</sup> = 4<sup>n</sup> blind strings × O(n) validation.</p>
      <h4>Pruning toolbox</h4>
      <ul>
        <li><b>Feasibility</b>: the partial state can never become valid (close &gt; open, remaining sum &lt; 0, queen attacked).</li>
        <li><b>Bounding</b> (branch &amp; bound): the best possible completion is worse than the best answer found so far → stop.</li>
        <li><b>Ordering</b>: sort choices so failures appear early and you can <code>break</code> instead of <code>continue</code> (combination sum on sorted candidates).</li>
        <li><b>Symmetry breaking</b>: skip equal choices at the same level (duplicates), or fix the first element (N-Queens mirror).</li>
        <li><b>Most-constrained first</b> (MRV): in Sudoku/CSPs fill the cell with the fewest legal options first.</li>
      </ul>
      <h4>Shared mutable state vs immutable state</h4>
      <p>Mutating one shared structure (list, builder, board, bitmask) with explicit undo is the fastest: no allocation per node. Passing immutable copies is easier to reason about and is required if you parallelise the search (each thread owns its state). In Java, an <code>int</code> bitmask parameter is the best of both: immutable value semantics, zero allocation, no undo needed.</p>
      <h4>When backtracking becomes DP</h4>
      <p>If the future of the search depends only on a small summary of the past (index + remaining sum, not the whole path), different paths reach the <b>same state</b> — memoize it. Counting questions ("how many ways") usually become DP; listing questions ("return all") stay backtracking because the output itself is exponential.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate the backtracking skeleton instantly, and for "return all X" problems their first draft often passes. The interview signal moved to: can you state the <b>state / choices / goal / prune</b> before coding, justify the complexity, and fix subtle bugs (missing copy, asymmetric undo, duplicate answers)?</p>
      <p><b>Use AI as a partner:</b> <code>Here is my backtracking function; list every place where CHOOSE and UN-CHOOSE are not exact mirrors</code>. Ask it to produce a brute-force generator + filter, then diff its output against your pruned version on random small inputs — a quick property test.</p>
      <p><b>Where AI goes wrong:</b> <code>res.add(cur)</code> without a copy, forgetting to undo on an early <code>continue</code>/<code>return</code> path, generating everything then filtering (correct but exponentially slower), and claiming O(2<sup>n</sup>) while ignoring the O(n) copy per answer.</p>
      <p><b>What you must still own:</b> designing the decision tree (what is one level? what is one choice?), choosing prunes that are provably safe, and explaining why the constraints (N ≤ 10–20) invite exhaustive search.</p>`,
    problems: [
      {
        title: 'Generate Parentheses',
        level: 'Medium',
        tags: ['backtracking', 'pruning', 'catalan'],
        companies: ['Google', 'Amazon', 'Meta', 'Microsoft'],
        statement: `<p>Given <code>n</code> pairs of parentheses, return <b>all</b> combinations of well-formed (balanced) parentheses strings of length 2n.</p>`,
        constraints: `1 ≤ n ≤ 8`,
        example: `<p>Input <b>n = 3</b> → Output (5 strings): ${H.chips(['((()))', '(()())', '(())()', '()(())', '()()()'])}</p>
          <p>Why: every string has three "(" and three ")", and reading left to right the number of ")" never exceeds the number of "(" — e.g. ${H.c('r', '"())(()"')} fails at position 3.</p>`,
        brute: {
          why: `<p>Generate all 2<sup>2n</sup> strings of "(" and ")" and keep the balanced ones. For n = 8 that is 65,536 strings × 16 characters to validate — fine here, but most of the work is wasted on strings that went bad at the 1st or 2nd character (like ")…"). Pruning stops those branches the moment they become hopeless.</p>`,
          code: `
            List<String> brute(int n) {
                List<String> res = new ArrayList<>();
                for (int mask = 0; mask < (1 << (2 * n)); mask++) {
                    StringBuilder sb = new StringBuilder();
                    int bal = 0;
                    boolean ok = true;
                    for (int i = 0; i < 2 * n; i++) {
                        boolean open = ((mask >> i) & 1) == 1;
                        sb.append(open ? '(' : ')');
                        bal += open ? 1 : -1;
                        if (bal < 0) ok = false;      // a ')' with no partner
                    }
                    if (ok && bal == 0) res.add(sb.toString());
                }
                return res;
            }`
        },
        mcq: {
          q: `Partial string "(()" with n = 3. Which next characters keep it fixable?`,
          options: ['Only "("', 'Only ")"', 'Both "(" and ")"', 'Neither — it is already invalid'],
          answer: 2,
          explain: `open = 2 &lt; 3 so "(" is allowed; close = 1 &lt; open = 2 so ")" is allowed too. Both branches can still lead to valid strings.`
        },
        hints: [
          `<p><b>Aha:</b> a prefix stays fixable exactly when <code>open ≤ n</code> and <code>close ≤ open</code>. So never generate a prefix that breaks either rule.</p>`,
          `<p>Backtrack with (StringBuilder sb, int open, int close). Two choices per level: add "(" if open &lt; n; add ")" if close &lt; open.</p>`,
          `<p>Edge cases: the goal is length 2n (then close == open == n automatically). Remember to delete the last char after each recursive call. Recipe: if len == 2n save; if open &lt; n {append '('; bt(open+1); delete} if close &lt; open {append ')'; bt(close+1); delete}.</p>`
        ],
        solution: {
          approach: `<p>Backtracking that only ever builds valid prefixes. Every leaf reached is an answer, so no filtering is needed.</p>`,
          code: `
            import java.util.*;

            class Solution {
                public List<String> generateParenthesis(int n) {
                    List<String> res = new ArrayList<>();
                    bt(n, 0, 0, new StringBuilder(), res);
                    return res;
                }

                private void bt(int n, int open, int close, StringBuilder sb, List<String> res) {
                    if (sb.length() == 2 * n) {            // goal: all brackets placed
                        res.add(sb.toString());            // toString() = a fresh copy
                        return;
                    }
                    if (open < n) {                        // still have '(' to place
                        sb.append('(');                    // choose
                        bt(n, open + 1, close, sb, res);   // explore
                        sb.deleteCharAt(sb.length() - 1);  // un-choose
                    }
                    if (close < open) {                    // a ')' has a partner to close
                        sb.append(')');
                        bt(n, open, close + 1, sb, res);
                        sb.deleteCharAt(sb.length() - 1);
                    }
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().generateParenthesis(3));
                    // [((())), (()()), (())(), ()(()), ()()()]
                }
            }`,
          alt: [{ lang: 'python', run: true, code: `def generate_parenthesis(n):
    res, sb = [], []
    def bt(open_, close):
        if len(sb) == 2 * n:
            res.append("".join(sb))
            return
        if open_ < n:
            sb.append("("); bt(open_ + 1, close); sb.pop()
        if close < open_:
            sb.append(")"); bt(open_, close + 1); sb.pop()
    bt(0, 0)
    return res

print(generate_parenthesis(3))` }],
          dry: {
            head: ['sb', 'open', 'close', 'allowed next', 'event'],
            rows: [
              ['""', '0', '0', '(', 'choose ('],
              ['"((("', '3', '0', ')', 'open = n → only )'],
              ['"((()))"', '3', '3', '—', H.c('g', 'save #1')],
              ['"(()"', '2', '1', '( or )', 'after backtracking to "((" and choosing )'],
              ['"(()())"', '3', '3', '—', H.c('g', 'save #2')],
              ['"()()()"', '3', '3', '—', H.c('g', 'save #5 (last)')]
            ]
          },
          complexity: `<p><b>Time O(4<sup>n</sup>/√n)</b>: proportional to the Catalan number C<sub>n</sub> of answers times the O(n) copy. <b>Space O(n)</b>: depth 2n plus the builder (excluding output).</p>`,
          followUps: ['Count them without listing (Catalan DP)', 'Multiple bracket types ( [ {', 'Remove Invalid Parentheses (Hard)']
        }
      }
    ]
  });

  // ===================== TOPIC 5: Subsets =====================
  topics.push({
    title: 'Generating All Subsets / Subsequences (Pick or Not-Pick)',
    analogy: `<p><b>Packing for a trip.</b> You have a hat, sunglasses and a camera. For each item you ask just one question: "Take it or leave it?" Hat: yes/no → sunglasses: yes/no → camera: yes/no. 3 yes/no questions → 2 × 2 × 2 = <b>8</b> possible bags, from "take nothing" to "take everything".</p>`,
    explain: `<p>A <b>subset</b> is any selection of elements (order does not matter). A <b>subsequence</b> of an array/string keeps the original order but may skip elements — e.g. "ace" is a subsequence of "abcde". (Not to be confused with a <b>subarray</b>, which must be contiguous.) Both are generated with the same idea: for each index i, <b>pick</b> it or <b>not pick</b> it.</p>
      <p>Decision tree for <code>[1, 2, 3]</code> (left = pick, right = skip), in the order the code finds them:</p>
      ${H.table(['pick 1?', 'pick 2?', 'pick 3?', 'subset'], [
        ['✔', '✔', '✔', H.c('g', '[1,2,3]')], ['✔', '✔', '✘', H.c('g', '[1,2]')], ['✔', '✘', '✔', H.c('g', '[1,3]')], ['✔', '✘', '✘', H.c('g', '[1]')],
        ['✘', '✔', '✔', H.c('g', '[2,3]')], ['✘', '✔', '✘', H.c('g', '[2]')], ['✘', '✘', '✔', H.c('g', '[3]')], ['✘', '✘', '✘', H.c('g', '[]')]
      ])}
      <p>Each row is one <b>leaf</b> of the decision tree (a path of n yes/no answers). There are 2<sup>n</sup> leaves → 2<sup>n</sup> subsets.</p>
      <h4>Two common code styles</h4>
      <ul>
        <li><b>Pick / not-pick</b> (binary tree): <code>f(i)</code> → pick nums[i], f(i+1), un-pick, f(i+1). Answers only at leaves (i == n).</li>
        <li><b>For-loop style</b>: <code>f(start)</code> saves current immediately, then for each j ≥ start: add nums[j], f(j+1), remove. Every node is an answer. This style makes "skip duplicates" easy (Subsets II).</li>
      </ul>
      <h4>Same thing with bits</h4>
      <p>Number the subsets 0 .. 2<sup>n</sup> − 1 and read each number in binary: bit j = 1 means "pick nums[j]". For n = 3: ${H.bits(5, 3, { hl: { 0: 'g', 2: 'g' } })} → picks nums[0] and nums[2] → [1, 3].</p>
      <p>Cost: 2<sup>n</sup> subsets, each copied in up to n steps → <b>O(n · 2<sup>n</sup>)</b>. For n = 20 that is about 2 × 10<sup>7</sup> — fine. For n = 30 it is 3 × 10<sup>10</sup> — too slow.</p>`,
    clues: [
      '"Return <b>all subsets</b>" / "<b>power set</b>" / "<b>all subsequences</b>".',
      '<b>N ≤ 20</b> (sometimes ≤ 15) → 2<sup>N</sup> choices is affordable; the problem is hinting "try everything".',
      '"Each element can be <b>chosen or not</b>" — e.g. "count subsequences with sum K", "split into two groups".',
      '"The solution set must not contain <b>duplicate subsets</b>" → sort + skip equal neighbours (Subsets II).'
    ],
    code: [`
      import java.util.*;

      class SubsetStyles {
          // Style 1: pick / not-pick (answers at the leaves)
          static void pickNotPick(int[] nums, int i, List<Integer> cur, List<List<Integer>> res) {
              if (i == nums.length) {
                  res.add(new ArrayList<>(cur));      // copy!
                  return;
              }
              cur.add(nums[i]);                       // pick
              pickNotPick(nums, i + 1, cur, res);
              cur.remove(cur.size() - 1);             // un-pick
              pickNotPick(nums, i + 1, cur, res);     // not pick
          }

          // Style 2: for-loop (every node is an answer)
          static void loopStyle(int[] nums, int start, List<Integer> cur, List<List<Integer>> res) {
              res.add(new ArrayList<>(cur));
              for (int j = start; j < nums.length; j++) {
                  cur.add(nums[j]);
                  loopStyle(nums, j + 1, cur, res);
                  cur.remove(cur.size() - 1);
              }
          }

          // Style 3: bitmask (no recursion)
          static List<List<Integer>> bitmask(int[] nums) {
              List<List<Integer>> res = new ArrayList<>();
              int n = nums.length;
              for (int mask = 0; mask < (1 << n); mask++) {
                  List<Integer> sub = new ArrayList<>();
                  for (int j = 0; j < n; j++) {
                      if ((mask & (1 << j)) != 0) sub.add(nums[j]);  // bit j on -> pick nums[j]
                  }
                  res.add(sub);
              }
              return res;
          }

          public static void main(String[] args) {
              int[] a = {1, 2, 3};
              List<List<Integer>> r1 = new ArrayList<>(), r2 = new ArrayList<>();
              pickNotPick(a, 0, new ArrayList<>(), r1);
              loopStyle(a, 0, new ArrayList<>(), r2);
              System.out.println(r1);   // [[1, 2, 3], [1, 2], [1, 3], [1], [2, 3], [2], [3], []]
              System.out.println(r2);   // [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]
              System.out.println(bitmask(a));
          }
      }`],
    codeTitle: ['Three ways to generate all subsets'],
    viz: {
      title: 'Subsets: pick / not-pick decision tree',
      input: '1 2 3',
      inputLabel: 'numbers (max 4)',
      gen: genSubsets
    },
    examples: [
      {
        title: 'Subsets II — duplicates in the input',
        html: `<p>nums = [1, 2, 2]. Plain pick/not-pick produces [1,2] twice (using the first 2 or the second 2). Fix: <b>sort</b>, then in the for-loop style <b>skip</b> nums[j] when <code>j &gt; start &amp;&amp; nums[j] == nums[j−1]</code> — "at the same level, only the first copy of a value may start a branch".</p>
          ${H.arr([1, 2, 2], { hl: { 2: 'r' }, ptr: { 1: 'j−1', 2: 'j' } })}
          <p>Result: ${H.chips(['[]', '[1]', '[1,2]', '[1,2,2]', '[2]', '[2,2]'])} — 6 instead of 8.</p>`,
        code: `
          class SubsetsII {
              static void bt(int[] a, int start, List<Integer> cur, List<List<Integer>> res) {
                  res.add(new ArrayList<>(cur));                  // every node is an answer
                  for (int j = start; j < a.length; j++) {
                      if (j > start && a[j] == a[j - 1]) continue; // same value at same level -> skip
                      cur.add(a[j]);
                      bt(a, j + 1, cur, res);
                      cur.remove(cur.size() - 1);
                  }
              }
              public static void main(String[] args) {
                  int[] a = {2, 1, 2};
                  Arrays.sort(a);                                 // duplicates must be adjacent
                  List<List<Integer>> res = new ArrayList<>();
                  bt(a, 0, new ArrayList<>(), res);
                  System.out.println(res);  // [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]
              }
          }`
      },
      {
        title: 'All subsequences of a string',
        html: `<p>"abc" → "", "a", "b", "c", "ab", "ac", "bc", "abc". Same pick/not-pick, but on characters — and the order of characters is preserved automatically because we move left to right. Watch the difference: <b>subarrays/substrings</b> of "abc" are only 6 (contiguous: a, b, c, ab, bc, abc) — "ac" is a subsequence but not a substring.</p>`,
        code: { lang: 'python', run: true, code: `def subsequences(s):
    out = []
    def f(i, cur):
        if i == len(s):
            out.append(cur)
            return
        f(i + 1, cur + s[i])   # pick s[i]
        f(i + 1, cur)          # skip s[i]
    f(0, "")
    return out

print(subsequences("abc"))  # ['abc', 'ab', 'ac', 'a', 'bc', 'b', 'c', '']` }
      },
      {
        title: 'Count subsequences with sum K (count, do not list)',
        html: `<p>arr = [1, 2, 1], K = 2 → subsequences [1,1] and [2] → <b>2</b>. When you only need a <b>count</b>, return numbers instead of collecting lists: f(i, sum) = f(i+1, sum + a[i]) + f(i+1, sum). The base case returns 1 if sum == K else 0. (If all numbers are positive, prune when sum &gt; K.) The state (i, sum) can repeat across paths — that is your hint that DP will later make this O(n·K).</p>`,
        code: `
          class CountK {
              static int count(int[] a, int i, int sum, int k) {
                  if (i == a.length) return sum == k ? 1 : 0;   // one finished subsequence
                  return count(a, i + 1, sum + a[i], k)         // pick a[i]
                       + count(a, i + 1, sum, k);               // skip a[i]
              }
              public static void main(String[] args) {
                  System.out.println(count(new int[]{1, 2, 1}, 0, 0, 2)); // 2
              }
          }`
      },
      {
        title: 'Subsets of size exactly k (Combinations)',
        html: `<p>n = 4, k = 2 → [1,2] [1,3] [1,4] [2,3] [2,4] [3,4] = C(4,2) = 6. Add a prune: if the numbers left (n − j + 1) are fewer than the slots left (k − cur.size()), stop. This one line cuts the tree dramatically when k is close to n.</p>`
      }
    ],
    deepDive: `<h4>Three equivalent views of the same 2<sup>n</sup> objects</h4>
      <p>(1) a binary decision tree (pick/not-pick), (2) a for-loop tree where every node is an answer and children only take larger indices, (3) the integers 0..2<sup>n</sup>−1 as bitmasks. View (2) has exactly 2<sup>n</sup> nodes (one per subset) while view (1) has 2<sup>n+1</sup> − 1 nodes (internal decision nodes too), so the loop style does roughly half the calls.</p>
      <h4>Why "skip duplicates at the same level" is correct</h4>
      <p>After sorting, two branches that start with equal values at the same depth generate exactly the same set of continuations, because the remaining multiset is identical except for which copy was used. Allowing only the first copy to branch at each level picks a canonical representative: inside a multiset subset, copies of a value are always taken left to right. Taking a later copy as the <i>next</i> element at a deeper level (j == start) is still allowed — that is how [2,2] appears.</p>
      <h4>Gray code order</h4>
      <p>Enumerating subsets so that consecutive ones differ by exactly one element (mask ^ (mask &gt;&gt; 1)) lets you update a running sum in O(1) per subset instead of O(n) — used in meet-in-the-middle and some bitmask DP.</p>
      <h4>Meet in the middle (expert)</h4>
      <p>When n ≈ 40, 2<sup>40</sup> ≈ 10<sup>12</sup> is too slow, but splitting into two halves of 20 gives 2 × 2<sup>20</sup> ≈ 2 × 10<sup>6</sup> subset sums each; sort one side and binary-search / two-pointer the other. "Subset sum closest to target with n ≤ 40" is the classic clue.</p>
      <h4>Memory reality</h4>
      <p>Listing all subsets of n = 20 stores 2<sup>20</sup> lists with an average of 10 Integers each — roughly 10<sup>7</sup> boxed objects, hundreds of MB in Java. If you only need to <b>process</b> each subset (sum, check, count), do it at the leaf instead of storing it.</p>`,
    aiEra: `<p><b>What AI changes:</b> "Generate all subsets" is solved by any assistant in one shot. Interviews now probe the variants: duplicates (Subsets II), size-k with pruning, counting instead of listing, and the n ≈ 40 meet-in-the-middle jump. Knowing <i>which</i> variant you face from the wording is the skill.</p>
      <p><b>Use AI as a partner:</b> <code>Write a brute-force bitmask generator and compare its output (as sorted sets) to my recursive Subsets II on 200 random arrays with duplicates</code>. That cross-check catches the classic "skip condition uses j &gt; 0 instead of j &gt; start" bug.</p>
      <p><b>Where AI goes wrong:</b> uses <code>j &gt; 0</code> (which wrongly forbids [2,2]), forgets to sort before de-duplicating, uses a <code>HashSet&lt;List&lt;Integer&gt;&gt;</code> to remove duplicates after the fact (works but wastes exponential time), or calls <code>cur.remove(x)</code> with an <code>int</code> that Java treats as an index.</p>
      <p><b>What you must still own:</b> the 2<sup>n</sup> mental model, picking the right style (pick/not-pick vs loop vs bitmask), and the duplicate-skip proof.</p>`,
    problems: [
      {
        title: 'Subsets (Power Set)',
        level: 'Medium',
        tags: ['backtracking', 'pick / not-pick'],
        statement: `<p>Given an integer array <code>nums</code> of <b>unique</b> elements, return <b>all possible subsets</b> (the power set). The answer must not contain duplicate subsets and may be returned in any order.</p>`,
        constraints: `1 ≤ nums.length ≤ 10, -10 ≤ nums[i] ≤ 10, all numbers distinct`,
        example: `${H.arr([1, 2, 3], { label: 'nums' })}
          <p>Output (8 subsets): ${H.chips(['[1,2,3]', '[1,2]', '[1,3]', '[1]', '[2,3]', '[2]', '[3]', '[]'], { hl: { '[]': 'p' } })}</p>
          <p>Why: 3 elements, each either in or out → 2<sup>3</sup> = 8. The empty set ${H.c('p', '[]')} counts too ("take nothing").</p>`,
        brute: {
          why: `<p>A beginner's idea is nested loops: one loop for size-1 subsets, two nested loops for size-2, three for size-3… but the number of loops depends on n, so you cannot write it for any n. The bitmask loop below is the iterative equivalent of pick/not-pick — it is <b>not slower</b>, because any method must output 2<sup>n</sup> subsets. The point of the recursive version is that the same pattern extends to pruning, duplicates and harder search problems.</p>`,
          code: `
            List<List<Integer>> subsetsBits(int[] nums) {
                List<List<Integer>> res = new ArrayList<>();
                int n = nums.length;
                for (int mask = 0; mask < (1 << n); mask++) {   // 2^n masks
                    List<Integer> sub = new ArrayList<>();
                    for (int j = 0; j < n; j++) {
                        if (((mask >> j) & 1) == 1) sub.add(nums[j]);
                    }
                    res.add(sub);
                }
                return res;
            }`
        },
        mcq: {
          q: `In the pick/not-pick recursion, the code does <code>res.add(cur)</code> instead of <code>res.add(new ArrayList&lt;&gt;(cur))</code>. What does the result look like for [1,2]?`,
          options: ['[[1,2],[1],[2],[]] — correct', 'Four references to the same list, which is empty at the end: [[],[],[],[]]', 'Only [[1,2]]', 'A ConcurrentModificationException'],
          answer: 1,
          explain: `res stores 4 pointers to the <b>same</b> list object. Because every add is un-done by a remove, that list ends up empty, so all four entries print as []. Always save a copy.`
        },
        hints: [
          `<p><b>Aha:</b> every element faces one yes/no decision. n independent yes/no decisions = 2<sup>n</sup> outcomes = a binary decision tree whose leaves are the subsets.</p>`,
          `<p>Use one shared <code>List&lt;Integer&gt; cur</code> (the bag so far) and an index <code>i</code> (which element we are deciding about). Result: <code>List&lt;List&lt;Integer&gt;&gt;</code>. Pick → add, recurse, remove; skip → recurse.</p>`,
          `<p>Traps: save <code>new ArrayList&lt;&gt;(cur)</code>, not cur; remove by <b>index</b> <code>cur.remove(cur.size() - 1)</code> (calling remove(Integer) by value would be a different method); remember the empty subset. Recipe: f(i): if i == n → save copy, return; add nums[i]; f(i+1); remove last; f(i+1).</p>`
        ],
        solution: {
          approach: `<p>Pick / not-pick recursion with one shared list and a copy at each leaf.</p>`,
          code: `
            import java.util.*;

            class Solution {
                public List<List<Integer>> subsets(int[] nums) {
                    List<List<Integer>> res = new ArrayList<>();
                    build(nums, 0, new ArrayList<>(), res);
                    return res;
                }

                private void build(int[] nums, int i, List<Integer> cur, List<List<Integer>> res) {
                    if (i == nums.length) {              // decided about every element
                        res.add(new ArrayList<>(cur));   // save a COPY of the bag
                        return;
                    }
                    cur.add(nums[i]);                    // CHOOSE: pick nums[i]
                    build(nums, i + 1, cur, res);        // EXPLORE with it
                    cur.remove(cur.size() - 1);          // UN-CHOOSE: take it back out
                    build(nums, i + 1, cur, res);        // EXPLORE without it (not pick)
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().subsets(new int[]{1, 2, 3}));
                    // [[1, 2, 3], [1, 2], [1, 3], [1], [2, 3], [2], [3], []]
                }
            }`,
          dry: {
            head: ['#', 'path of decisions (1? 2? 3?)', 'cur at leaf i = 3', 'res size after'],
            rows: [
              ['1', 'pick, pick, pick', H.c('g', '[1,2,3]'), '1'],
              ['2', 'pick, pick, skip', H.c('g', '[1,2]'), '2'],
              ['3', 'pick, skip, pick', H.c('g', '[1,3]'), '3'],
              ['4', 'pick, skip, skip', H.c('g', '[1]'), '4'],
              ['5', 'skip, pick, pick', H.c('g', '[2,3]'), '5'],
              ['6', 'skip, pick, skip', H.c('g', '[2]'), '6'],
              ['7', 'skip, skip, pick', H.c('g', '[3]'), '7'],
              ['8', 'skip, skip, skip', H.c('p', '[]'), '8']
            ]
          },
          complexity: `<p><b>Time O(n · 2<sup>n</sup>)</b>: the tree has 2<sup>n</sup> leaves (≈ 2<sup>n+1</sup> calls in total) and copying each subset costs up to n. <b>Space O(n)</b> extra for the recursion depth and <code>cur</code> (not counting the output, which itself is n · 2<sup>n</sup>).</p>`
        }
      }
    ]
  });

  // ===================== TOPIC 6: Permutations =====================
  topics.push({
    title: 'Permutations: Swap Method, used[] Method & Handling Duplicates',
    analogy: `<p><b>Seating guests at a dinner table.</b> You have 3 guests and 3 chairs. For chair 1 you can pick any of the 3 guests. For chair 2, any of the 2 who are still standing. For chair 3, the last person. 3 × 2 × 1 = <b>6</b> seatings. A guest who is already seated cannot be seated again — that "already seated" list is the <code>used[]</code> array. And if two guests are <b>identical twins</b>, swapping them does not create a new seating — that is the duplicates problem.</p>`,
    explain: `<p>A <b>permutation</b> is an <b>ordering</b> of all the elements. Unlike subsets, order matters: [1,2,3] and [3,2,1] are different permutations. n distinct elements have <b>n!</b> permutations (3! = 6, 5! = 120, 8! = 40,320, 10! = 3,628,800).</p>
      <p>Decision tree: level k = "which element goes into position k?". Level 0 has n choices, level 1 has n − 1, … so the leaves number n!.</p>
      <h4>Method 1: used[] (build a new list)</h4>
      <p>Keep <code>cur</code> (the arrangement so far) and a boolean <code>used[]</code>. At each level, loop over every index i; if <code>!used[i]</code>, choose it (<code>used[i] = true</code>, add), explore, then un-choose (<code>used[i] = false</code>, remove last).</p>
      ${H.table(['level', 'cur', 'used', 'choices left'], [['0', '[]', '[F,F,F]', '1, 2, 3'], ['1', '[1]', '[T,F,F]', '2, 3'], ['2', '[1,2]', '[T,T,F]', '3'], ['3', H.c('g', '[1,2,3] → save'), '[T,T,T]', '—']])}
      <h4>Method 2: swap in place</h4>
      <p>Think of the array as "fixed part | free part". To fill position <code>i</code>, swap each element of the free part (index j from i to n−1) into position i, recurse on i + 1, then <b>swap back</b>. No extra list or used[] is needed — the array itself is the state.</p>
      ${H.table(['i', 'swap(i, j)', 'array', 'meaning'], [['0', 'j = 0', '[1 | 2,3]', '1 fixed in slot 0'], ['1', 'j = 2', '[1,3 | 2]', '3 fixed in slot 1'], ['2', 'j = 2', H.c('g', '[1,3,2]'), 'complete → save'], ['back', 'swap back', '[1,2,3]', 'restore for the next j']])}
      <h4>Duplicates (Permutations II)</h4>
      <p>Input [1, 1, 2] has only 3!/2! = <b>3</b> distinct permutations: [1,1,2], [1,2,1], [2,1,1]. Fix with the used[] method: <b>sort</b>, then skip index i when <code>nums[i] == nums[i−1] &amp;&amp; !used[i−1]</code>. In words: identical copies must be placed in left-to-right order, so the second "1" may only be used after the first "1" is already in the arrangement. Each distinct permutation is then built in exactly one way.</p>
      <p>With the swap method, keep a small <code>HashSet</code> per level: do not swap the same <b>value</b> into position i twice.</p>`,
    clues: [
      '"Return <b>all possible permutations</b>", "all <b>arrangements</b> / orderings", "all anagrams of a string".',
      '<b>N ≤ 8–10</b> → n! (40,320 – 3.6 million) is affordable; the constraint is telling you to enumerate.',
      '"Input may contain <b>duplicates</b>, return only <b>unique</b> permutations" → sort + skip rule (Permutations II).',
      '"Next permutation" / "k-th permutation" → do NOT enumerate; use the lexicographic algorithm or factorial number system.',
      '"Arrange so that adjacent elements satisfy …" (beautiful arrangement, squareful arrays) → permutation backtracking with a prune at each placement.'
    ],
    code: [`
      import java.util.*;

      class Permutations {
          // Method 1: used[] -- builds a fresh list, natural lexicographic order on sorted input
          static void byUsed(int[] a, boolean[] used, List<Integer> cur, List<List<Integer>> res) {
              if (cur.size() == a.length) {             // every position filled
                  res.add(new ArrayList<>(cur));        // save a copy
                  return;
              }
              for (int i = 0; i < a.length; i++) {
                  if (used[i]) continue;                // already placed
                  used[i] = true;  cur.add(a[i]);       // choose
                  byUsed(a, used, cur, res);            // explore
                  used[i] = false; cur.remove(cur.size() - 1); // un-choose
              }
          }

          // Method 2: swap -- the array itself is the state
          static void bySwap(int[] a, int i, List<List<Integer>> res) {
              if (i == a.length) {
                  List<Integer> p = new ArrayList<>();
                  for (int x : a) p.add(x);
                  res.add(p);
                  return;
              }
              for (int j = i; j < a.length; j++) {
                  swap(a, i, j);                        // choose: put a[j] into slot i
                  bySwap(a, i + 1, res);                // explore the remaining slots
                  swap(a, i, j);                        // un-choose: restore order
              }
          }

          static void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

          public static void main(String[] args) {
              int[] a = {1, 2, 3};
              List<List<Integer>> r1 = new ArrayList<>(), r2 = new ArrayList<>();
              byUsed(a, new boolean[3], new ArrayList<>(), r1);
              bySwap(a, 0, r2);
              System.out.println(r1); // [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]
              System.out.println(r2); // [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 2, 1], [3, 1, 2]]
          }
      }`],
    codeTitle: ['used[] method vs swap method'],
    viz: [{
      title: 'Permutations by swapping into each slot',
      input: '1 2 3',
      inputLabel: 'numbers (max 4)',
      gen: genPermSwap
    }, {
      title: 'Unique permutations with used[] and the duplicate-skip rule',
      input: '1 1 2',
      inputLabel: 'numbers, duplicates allowed (max 4)',
      gen: genPermUsed
    }],
    examples: [
      {
        title: 'Why the swap method is not in lexicographic order',
        html: `<p>For [1,2,3] the swap method outputs ..., [3,2,1], [3,1,2] — the last two are swapped compared to sorted order. Reason: swapping 3 into slot 0 produces [3,2,1] (2 and 1 are now in reverse order). If the problem says "return in lexicographic order", use the used[] method on a sorted array, or rotate instead of swap.</p>`
      },
      {
        title: 'Permutations of a string with repeated letters',
        html: `<p>"aab" has 3!/2! = 3 distinct permutations: aab, aba, baa. Counting formula for a multiset: n! / (c<sub>1</sub>! · c<sub>2</sub>! · …) where c<sub>i</sub> are the counts of each letter. "mississippi" → 11! / (4!·4!·2!·1!) = 34,650. A neat alternative to the skip rule: backtrack over a <b>count map</b> (letter → remaining copies) — at each level try each distinct letter with count &gt; 0.</p>`,
        code: { lang: 'python', run: true, code: `from collections import Counter

def unique_perms(s):
    cnt, cur, out = Counter(s), [], []
    def bt():
        if len(cur) == len(s):
            out.append("".join(cur))
            return
        for ch in sorted(cnt):          # each DISTINCT letter once per level
            if cnt[ch] == 0:
                continue
            cnt[ch] -= 1; cur.append(ch)    # choose
            bt()                            # explore
            cur.pop(); cnt[ch] += 1         # un-choose
    bt()
    return out

print(unique_perms("aab"))   # ['aab', 'aba', 'baa']` }
      },
      {
        title: 'k-th permutation without generating all of them',
        html: `<p>n = 4, k = 9 (1-based). There are 3! = 6 permutations starting with each first digit. (k−1) / 6 = 8 / 6 = 1 → first digit is the 2nd smallest = <b>2</b>; remaining k' = 8 % 6 = 2. Next block size 2! = 2: 2 / 2 = 1 → 2nd smallest of {1,3,4} = <b>3</b>; k' = 0 → then 1, 4. Answer <b>2314</b>. O(n<sup>2</sup>) instead of O(n · n!). Clue: "return the k-th permutation".</p>`,
        code: `
          class KthPerm {
              static String getPermutation(int n, int k) {
                  List<Integer> nums = new ArrayList<>();
                  int[] fact = new int[n + 1];
                  fact[0] = 1;
                  for (int i = 1; i <= n; i++) { nums.add(i); fact[i] = fact[i - 1] * i; }
                  k--;                                       // to 0-based
                  StringBuilder sb = new StringBuilder();
                  for (int i = n; i >= 1; i--) {
                      int block = fact[i - 1];               // perms per choice of this digit
                      int idx = k / block;
                      sb.append(nums.remove(idx));           // remove by index
                      k %= block;
                  }
                  return sb.toString();
              }
              public static void main(String[] args) {
                  System.out.println(getPermutation(4, 9)); // 2314
              }
          }`
      },
      {
        title: 'Next permutation (in place, O(n))',
        html: `<p>[1, 3, 5, 4, 2] → find the rightmost i with a[i] &lt; a[i+1] (i = 1, value 3), swap it with the rightmost element bigger than it (4), then reverse the suffix: [1, 4, 2, 3, 5]. This is how C++ <code>std::next_permutation</code> works — useful when you must iterate permutations without recursion.</p>
          ${H.arr([1, 3, 5, 4, 2], { hl: { 1: 'y', 3: 'g' }, ptr: { 1: 'i', 3: 'swap' } })}`
      }
    ],
    deepDive: `<h4>Exact cost</h4>
      <p>Nodes in the used[] tree: n!/n! + n!/(n−1)! + … + n!/0! ≈ e · n!. Each node loops over n indices → O(n · n!) total work, plus O(n) to copy each of the n! answers → still <b>O(n · n!)</b>. For n = 10: 3.6·10<sup>7</sup> answers × 10 ≈ 3.6·10<sup>8</sup> operations — the practical ceiling. n = 12 is already 4.8·10<sup>8</sup> answers: listing them is hopeless, so a question with n = 12+ wants counting or a formula.</p>
      <h4>Proof of the duplicate-skip rule</h4>
      <p>Label the equal copies 1<sub>a</sub>, 1<sub>b</sub> (sorted). Each distinct permutation corresponds to exactly 2! labelled permutations. The condition "skip 1<sub>b</sub> if 1<sub>a</sub> is not used" forces 1<sub>a</sub> to appear before 1<sub>b</sub>, which selects exactly one labelled representative of each class. The variant <code>used[i−1]</code> (instead of <code>!used[i−1]</code>) also works — it forces the reverse order — but prunes much later, so <code>!used[i−1]</code> is faster.</p>
      <h4>Swap method and duplicates</h4>
      <p>Skipping "a[j] == a[i]" alone is <b>not</b> enough for the swap method, because swaps disturb sorted order. Use a per-level <code>Set&lt;Integer&gt;</code> of values already tried at position i. Memory is O(n) per level, O(n<sup>2</sup>) total depth-wise.</p>
      <h4>Heap's algorithm</h4>
      <p>Generates each permutation from the previous one with a <b>single swap</b> — minimal changes, great when each permutation is expensive to evaluate incrementally (e.g. a route cost). Its order is neither lexicographic nor obvious, which is why interviews rarely require it.</p>
      <h4>Production reality</h4>
      <p>Real systems almost never enumerate permutations beyond ~10 items; route optimisation (TSP), scheduling and assignment use bitmask DP (n ≤ 20), branch-and-bound, ILP solvers or heuristics. Recognising "this is n! — switch technique" is the senior signal.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants produce Permutations I and II instantly, so interviewers go one step further: unique permutations of a string with many repeats, k-th permutation, next permutation, or "permutations where adjacent sums are perfect squares". Your edge is recognising when NOT to enumerate.</p>
      <p><b>Use AI as a partner:</b> <code>Prove why the condition nums[i]==nums[i-1] &amp;&amp; !used[i-1] removes duplicates; then show a counterexample if I use the same rule with the swap method</code>. Make it generate test inputs with heavy duplicates ([1,1,1,2,2]) and compare counts with the multinomial formula n!/∏c<sub>i</sub>!.</p>
      <p><b>Where AI goes wrong:</b> mixes up <code>used[i−1]</code> and <code>!used[i−1]</code> and then cannot explain why both "work", applies the sorted-skip rule to the swap method (still produces duplicates), and forgets to sort.</p>
      <p><b>What you must still own:</b> the n! sizing judgement, the canonical-order argument for duplicates, and choosing between used[], swap, count-map and lexicographic algorithms.</p>`,
    problems: [
      {
        title: 'Permutations II (unique permutations)',
        level: 'Medium',
        tags: ['backtracking', 'permutations', 'duplicates'],
        companies: ['Microsoft', 'Amazon', 'Bloomberg'],
        statement: `<p>Given a collection of numbers <code>nums</code> that <b>might contain duplicates</b>, return all possible <b>unique</b> permutations in any order.</p>`,
        constraints: `1 ≤ nums.length ≤ 8, −10 ≤ nums[i] ≤ 10`,
        example: `${H.arr([1, 1, 2], { label: 'nums' })}
          <p>Output: ${H.chips(['[1,1,2]', '[1,2,1]', '[2,1,1]'])}</p>
          <p>Why: 3! = 6 orderings, but swapping the two 1s gives the same list, so 6 / 2! = ${H.c('p', '<b>3</b>')} unique ones.</p>`,
        brute: {
          why: `<p>Generate all n! permutations and throw them into a <code>Set&lt;List&lt;Integer&gt;&gt;</code>. Correct, but for [1,1,1,1,1,1,1,2] it builds 8! = 40,320 lists to keep only 8 — and hashing each list costs O(n). The wasted work: whole subtrees that are mirror images of subtrees already explored.</p>`,
          code: `
            List<List<Integer>> brute(int[] nums) {
                Set<List<Integer>> seen = new LinkedHashSet<>();
                gen(nums, 0, seen);
                return new ArrayList<>(seen);
            }
            void gen(int[] a, int i, Set<List<Integer>> seen) {
                if (i == a.length) {
                    List<Integer> p = new ArrayList<>();
                    for (int x : a) p.add(x);
                    seen.add(p);                         // duplicates silently dropped
                    return;
                }
                for (int j = i; j < a.length; j++) {
                    int t = a[i]; a[i] = a[j]; a[j] = t;
                    gen(a, i + 1, seen);
                    t = a[i]; a[i] = a[j]; a[j] = t;
                }
            }`
        },
        mcq: {
          q: `Sorted nums = [1, 1, 2]. At the first level, the loop reaches i = 1 (the second 1) while used = [F, F, F]. What should happen?`,
          options: ['Use it — it is a different index', 'Skip it — nums[1] == nums[0] and the first 1 is not used, so this branch duplicates i = 0', 'Stop the whole loop (break)', 'Mark both 1s as used'],
          answer: 1,
          explain: `Starting with the second 1 would generate exactly the same arrangements as starting with the first 1. The rule "equal copies are used left to right" skips it; continue (not break) because a larger value (2) may still follow.`
        },
        hints: [
          `<p><b>Aha:</b> duplicates come from choosing <i>equal values</i> for the same position in different branches. Make the choice of copy canonical.</p>`,
          `<p>Sort nums, use <code>boolean[] used</code> and a list <code>cur</code>. Skip index i if <code>used[i]</code>, or if <code>i &gt; 0 &amp;&amp; nums[i] == nums[i−1] &amp;&amp; !used[i−1]</code>.</p>`,
          `<p>Edge cases: all elements equal → exactly one permutation; length 1. Recipe: sort; bt(): if cur.size() == n save copy; for i: skip rules; used[i] = true, add; bt(); used[i] = false, remove last.</p>`
        ],
        solution: {
          approach: `<p>used[] backtracking on the sorted array with the "left copy first" rule — every unique permutation is generated exactly once, no Set needed.</p>`,
          code: `
            import java.util.*;

            class Solution {
                public List<List<Integer>> permuteUnique(int[] nums) {
                    Arrays.sort(nums);                         // equal values become neighbours
                    List<List<Integer>> res = new ArrayList<>();
                    bt(nums, new boolean[nums.length], new ArrayList<>(), res);
                    return res;
                }

                private void bt(int[] a, boolean[] used, List<Integer> cur, List<List<Integer>> res) {
                    if (cur.size() == a.length) {
                        res.add(new ArrayList<>(cur));
                        return;
                    }
                    for (int i = 0; i < a.length; i++) {
                        if (used[i]) continue;                 // already in cur
                        if (i > 0 && a[i] == a[i - 1] && !used[i - 1]) continue; // duplicate branch
                        used[i] = true;
                        cur.add(a[i]);                         // choose
                        bt(a, used, cur, res);                 // explore
                        cur.remove(cur.size() - 1);            // un-choose
                        used[i] = false;
                    }
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().permuteUnique(new int[]{1, 1, 2}));
                    // [[1, 1, 2], [1, 2, 1], [2, 1, 1]]
                }
            }`,
          alt: [{ lang: 'python', run: true, code: `def permute_unique(nums):
    nums.sort()
    res, cur, used = [], [], [False] * len(nums)
    def bt():
        if len(cur) == len(nums):
            res.append(cur[:])
            return
        for i in range(len(nums)):
            if used[i] or (i > 0 and nums[i] == nums[i - 1] and not used[i - 1]):
                continue
            used[i] = True; cur.append(nums[i])
            bt()
            cur.pop(); used[i] = False
    bt()
    return res

print(permute_unique([1, 1, 2]))` }],
          dry: {
            head: ['cur', 'used', 'i tried', 'decision'],
            rows: [
              ['[]', 'F F F', '0 (1)', 'choose'],
              ['[1]', 'T F F', '1 (1)', 'used[0] = T → allowed, choose'],
              ['[1,1]', 'T T F', '2 (2)', H.c('g', 'choose → save [1,1,2]')],
              ['[1]', 'T F F', '2 (2)', H.c('g', 'choose → … save [1,2,1]')],
              ['[]', 'F F F', '1 (1)', H.c('r', 'nums[0] equal &amp; unused → skip')],
              ['[]', 'F F F', '2 (2)', H.c('g', 'choose → … save [2,1,1]')]
            ]
          },
          complexity: `<p><b>Time O(n · n!)</b> in the worst case (all distinct); with duplicates it is O(n · U) where U is the number of unique permutations, because pruned branches cost O(1) each. <b>Space O(n)</b> for used[], cur and the recursion depth (excluding output).</p>`,
          followUps: ['Do it with the swap method (per-level HashSet)', 'Count unique permutations without listing them (multinomial)', 'Return them in lexicographic order']
        }
      }
    ]
  });

  // ===================== TOPIC 7: Combination Sum =====================
  topics.push({
    title: 'Combination Sum: Reuse, No-Reuse, Fixed Size & the Start Index',
    analogy: `<p><b>Paying exactly ₹7 at a shop with coins of ₹2, ₹3, ₹6 and ₹7.</b> You can use the same coin as often as you like. You list every distinct handful that adds to 7: {7} and {2, 2, 3}. A handful is a <b>bag</b>, not a sequence — paying 2 + 2 + 3 or 3 + 2 + 2 is the <i>same</i> handful. To avoid listing it twice, you agree to always pick coins in <b>non-decreasing order</b>: once you pick a ₹3 you never go back to ₹2. That promise is the <b>start index</b>.</p>`,
    explain: `<p><b>Combination Sum</b> (LeetCode 39): given distinct positive <code>candidates</code> and a <code>target</code>, list all unique combinations that sum to target; each number may be used <b>unlimited</b> times.</p>
      <h4>State, choices, goal, prune</h4>
      ${H.table(['part', 'Combination Sum'], [
        ['State', 'cur (numbers picked), remaining = target − sum(cur), start index'],
        ['Choices', 'any candidate at index ≥ start (staying on the same index = reuse)'],
        ['Goal', 'remaining == 0 → save a copy'],
        ['Prune', 'remaining &lt; 0 → dead; with sorted candidates, if c[i] &gt; remaining → <b>break</b> (all later are bigger)']
      ])}
      <h4>Why the start index kills duplicates</h4>
      <p>Without it, from remaining 7 you could pick 2 then 3 then 2, or 3 then 2 then 2 — the same bag in different orders. With "next pick index ≥ my index", every bag is built in exactly one order (sorted), so it appears once.</p>
      <h4>Three family members — one-word differences</h4>
      ${H.table(['problem', 'reuse?', 'input duplicates?', 'recursive call', 'extra rule'], [
        ['Combination Sum (39)', H.c('g', 'yes'), 'no', 'bt(i, rem − c[i])', '—'],
        ['Combination Sum II (40)', H.c('r', 'no'), H.c('y', 'yes'), 'bt(i + 1, rem − c[i])', 'sort; skip i &gt; start &amp;&amp; c[i] == c[i−1]'],
        ['Combination Sum III (216)', 'no', 'no (digits 1–9)', 'bt(i + 1, rem − i)', 'also stop when size == k']
      ])}
      <h4>Walkthrough: candidates [2, 3, 6, 7], target 7</h4>
      ${H.table(['path', 'remaining', 'what happens'], [
        ['[2]', '5', 'explore from index 0 again (reuse)'],
        ['[2,2]', '3', 'continue'],
        ['[2,2,2]', '1', '2 &gt; 1 → break; back up'],
        ['[2,2,3]', H.c('g', '0'), H.c('g', 'save [2,2,3]')],
        ['[2,3]', '2', '3 &gt; 2 → break'],
        ['[3]', '4', '[3,3] leaves 1 → break; 6 &gt; 4 → break'],
        ['[6]', '1', '6 &gt; 1 → break'],
        ['[7]', H.c('g', '0'), H.c('g', 'save [7]')]
      ])}`,
    clues: [
      '"Find all <b>unique combinations</b> where the chosen numbers <b>sum to target</b>".',
      '"The same number may be chosen an <b>unlimited number of times</b>" → recurse with the same index i.',
      '"Each number may be used <b>only once</b>" + "candidates may contain duplicates" → i + 1 and skip equal neighbours (Combination Sum II).',
      '"Combinations of <b>k numbers</b> from 1–9" → add a size check (Combination Sum III).',
      '"Return the <b>number</b> of combinations" (not the list) → that is Coin Change II: switch to DP; "order matters" counts → Combination Sum IV (also DP).'
    ],
    code: [`
      import java.util.*;

      class CombinationSum {
          public List<List<Integer>> combinationSum(int[] candidates, int target) {
              Arrays.sort(candidates);                      // enables the 'break' prune
              List<List<Integer>> res = new ArrayList<>();
              bt(candidates, 0, target, new ArrayList<>(), res);
              return res;
          }

          private void bt(int[] c, int start, int rem, List<Integer> cur, List<List<Integer>> res) {
              if (rem == 0) {                               // goal: exact sum
                  res.add(new ArrayList<>(cur));
                  return;
              }
              for (int i = start; i < c.length; i++) {
                  if (c[i] > rem) break;                    // sorted: everything after is too big
                  cur.add(c[i]);                            // choose c[i]
                  bt(c, i, rem - c[i], cur, res);           // i (not i+1): reuse allowed
                  cur.remove(cur.size() - 1);               // un-choose
              }
          }

          public static void main(String[] args) {
              System.out.println(new CombinationSum().combinationSum(new int[]{2, 3, 6, 7}, 7));
              // [[2, 2, 3], [7]]
          }
      }`, `
      import java.util.*;

      class CombinationSum2 {
          // Each number used at most once; input may contain duplicates.
          public List<List<Integer>> combinationSum2(int[] c, int target) {
              Arrays.sort(c);
              List<List<Integer>> res = new ArrayList<>();
              bt(c, 0, target, new ArrayList<>(), res);
              return res;
          }

          private void bt(int[] c, int start, int rem, List<Integer> cur, List<List<Integer>> res) {
              if (rem == 0) { res.add(new ArrayList<>(cur)); return; }
              for (int i = start; i < c.length; i++) {
                  if (i > start && c[i] == c[i - 1]) continue; // same value at same level -> skip
                  if (c[i] > rem) break;
                  cur.add(c[i]);
                  bt(c, i + 1, rem - c[i], cur, res);       // i + 1: no reuse
                  cur.remove(cur.size() - 1);
              }
          }

          public static void main(String[] args) {
              System.out.println(new CombinationSum2().combinationSum2(new int[]{10, 1, 2, 7, 6, 1, 5}, 8));
              // [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]
          }
      }`],
    codeTitle: ['Combination Sum (reuse allowed)', 'Combination Sum II (use once, duplicates in input)'],
    viz: {
      title: 'Combination Sum search with start index and break-pruning',
      input: '2 3 6 7 | 7',
      inputLabel: 'candidates | target (target ≤ 12)',
      gen: genCombSum
    },
    examples: [
      {
        title: 'Combination Sum II on [10,1,2,7,6,1,5], target 8',
        html: `<p>Sorted: ${H.arr([1, 1, 2, 5, 6, 7, 10], { hl: { 1: 'y' } })} At the top level, starting with the second 1 (index 1) would repeat everything the first 1 already found → skip. But inside the branch [1], taking index 1 is allowed (j == start), which produces [1, 1, 6]. Answer: [1,1,6], [1,2,5], [1,7], [2,6].</p>`
      },
      {
        title: 'Combination Sum III: k = 3 numbers from 1–9 summing to 9',
        html: `<p>Answers: [1,2,6], [1,3,5], [2,3,4]. Two prunes: stop when <code>cur.size() == k</code> (whether or not the sum matched), and break when <code>i &gt; rem</code>. The search space is at most C(9, k) ≤ 126 nodes — tiny.</p>`,
        code: `
          class Comb3 {
              static void bt(int k, int start, int rem, List<Integer> cur, List<List<Integer>> res) {
                  if (cur.size() == k) {                 // size reached: check the sum
                      if (rem == 0) res.add(new ArrayList<>(cur));
                      return;
                  }
                  for (int d = start; d <= 9 && d <= rem; d++) {
                      cur.add(d);
                      bt(k, d + 1, rem - d, cur, res);   // digits used once
                      cur.remove(cur.size() - 1);
                  }
              }
              public static void main(String[] args) {
                  List<List<Integer>> res = new ArrayList<>();
                  bt(3, 1, 9, new ArrayList<>(), res);
                  System.out.println(res);   // [[1, 2, 6], [1, 3, 5], [2, 3, 4]]
              }
          }`
      },
      {
        title: 'Listing vs counting: Coin Change II',
        html: `<p>"How many ways to make 5 with coins [1, 2, 5]?" → 4 ways ({5}, {2,2,1}, {2,1,1,1}, {1×5}). Combination Sum would list them; but if amount = 5000 the list is astronomically long. The count only depends on (coin index, remaining) — overlapping states → DP: <code>dp[a] += dp[a − coin]</code>, looping coins outside so order does not matter.</p>`,
        code: { lang: 'python', run: true, code: `def change(amount, coins):
    dp = [1] + [0] * amount          # dp[0] = 1 way: pick nothing
    for c in coins:                  # coins OUTSIDE -> combinations, not orderings
        for a in range(c, amount + 1):
            dp[a] += dp[a - c]
    return dp[amount]

print(change(5, [1, 2, 5]))        # 4
print(change(500, [1, 2, 5, 10]))  # large count, computed instantly` }
      },
      {
        title: 'Factor combinations (same template, multiply instead of add)',
        html: `<p>n = 12 → [2,6], [2,2,3], [3,4]. Choices: divisors d ≥ start with d·d ≤ remaining; recurse with remaining / d and start = d. The start index again keeps factors non-decreasing, so [2,6] and [6,2] are not both listed.</p>`
      }
    ],
    deepDive: `<h4>Complexity is output-sensitive</h4>
      <p>A loose bound: depth ≤ target / min(candidate) = T/M, branching ≤ N, so O(N<sup>T/M</sup>) nodes, each answer copied in O(T/M). Real runs are far smaller because the start index and the break prune cut most branches. LeetCode guarantees fewer than 150 answers precisely so the output stays small.</p>
      <h4>Why <code>break</code> and not <code>continue</code></h4>
      <p>After sorting, c[i] &gt; rem implies c[i+1..] &gt; rem too, so the whole rest of the loop is dead: <code>break</code>. In Combination Sum II the duplicate check must use <code>continue</code> (a bigger, different value may still fit). Mixing these up is a top-3 bug.</p>
      <h4>i vs i + 1 vs 0</h4>
      <p>The argument you pass down encodes the problem: <b>i</b> = reuse allowed, combinations; <b>i + 1</b> = no reuse, combinations; <b>0</b> = order matters (sequences), which is Combination Sum IV and explodes combinatorially — that one is always asked as a <i>count</i> and solved with DP over the amount.</p>
      <h4>Negative numbers break everything</h4>
      <p>With negatives (or zeros with reuse) the remaining sum can go down and up forever, so there may be infinitely many combinations; the problem then needs a length limit. Always confirm "positive integers" — it is what makes the rem &lt; 0 prune valid.</p>
      <h4>From backtracking to DP</h4>
      <p>The subproblem "combinations of c[start..] summing to rem" depends only on (start, rem). Memoizing the <b>lists</b> saves time but can blow memory; memoizing <b>counts</b> gives the classic O(N·T) unbounded-knapsack DP. In interviews say this out loud: it shows you see the bridge to the DP modules.</p>`,
    aiEra: `<p><b>What AI changes:</b> the three Combination Sum variants differ by one token (<code>i</code>, <code>i + 1</code>, the skip line). Assistants often produce the right family but the wrong member — a fluent-looking solution that passes the sample and fails on duplicates. Reading code critically is now the core skill.</p>
      <p><b>Use AI as a partner:</b> <code>Give me inputs where Combination Sum II produces duplicates if the skip condition uses i &gt; 0 instead of i &gt; start</code>. Ask it to convert your listing solution into a counting DP and check both agree on small inputs.</p>
      <p><b>Where AI goes wrong:</b> uses <code>continue</code> where <code>break</code> is valid (slower) or <code>break</code> for duplicate skipping (wrong — loses answers), forgets to sort, passes <code>0</code> as the start (producing permutations of each answer), and claims a tight complexity bound that does not exist.</p>
      <p><b>What you must still own:</b> reading "unlimited / once / k numbers / order matters" and mapping it to i, i + 1, size check or DP — plus knowing when to stop listing and start counting.</p>`,
    problems: [
      {
        title: 'Combination Sum',
        level: 'Medium',
        tags: ['backtracking', 'start index', 'pruning'],
        companies: ['Amazon', 'Airbnb', 'Uber', 'Google'],
        statement: `<p>Given an array of <b>distinct</b> positive integers <code>candidates</code> and a target integer <code>target</code>, return a list of all <b>unique</b> combinations of candidates where the chosen numbers sum to <code>target</code>. The <b>same number may be chosen an unlimited number of times</b>. Two combinations are unique if the frequency of at least one number differs.</p>`,
        constraints: `1 ≤ candidates.length ≤ 30, 2 ≤ candidates[i] ≤ 40, all distinct, 1 ≤ target ≤ 40; fewer than 150 combinations exist`,
        example: `${H.arr([2, 3, 6, 7], { label: 'candidates' })}<p>target = 7 → Output: ${H.chips(['[2,2,3]', '[7]'])}</p>
          <p>Why: 2 + 2 + 3 = 7 (2 used twice — allowed) and 7 = 7. [2,3,2] is the same bag as [2,2,3], so it is not listed again.</p>`,
        brute: {
          why: `<p>Brute force: at every step try <b>every</b> candidate (start from 0), collect sequences that hit the target, then sort each and de-duplicate with a Set. For target 7 it builds [2,2,3], [2,3,2], [3,2,2] separately — the number of orderings grows factorially with the answer length, so most work is spent producing duplicates that are thrown away.</p>`,
          code: `
            List<List<Integer>> brute(int[] c, int target) {
                Set<List<Integer>> set = new HashSet<>();
                go(c, target, new ArrayList<>(), set);
                return new ArrayList<>(set);
            }
            void go(int[] c, int rem, List<Integer> cur, Set<List<Integer>> set) {
                if (rem < 0) return;
                if (rem == 0) {
                    List<Integer> s = new ArrayList<>(cur);
                    Collections.sort(s);            // canonical form for de-duplication
                    set.add(s);
                    return;
                }
                for (int x : c) {                   // every candidate, every time
                    cur.add(x);
                    go(c, rem - x, cur, set);
                    cur.remove(cur.size() - 1);
                }
            }`
        },
        mcq: {
          q: `In the recursive call after choosing c[i], which start index gives "unlimited reuse but no duplicate orderings"?`,
          options: ['0', 'i', 'i + 1', 'start + 1'],
          answer: 1,
          explain: `Passing i lets the next pick be c[i] again (reuse) or anything after it, but never anything before it — so every combination is built in sorted order exactly once. 0 creates reorderings; i + 1 forbids reuse.`
        },
        hints: [
          `<p><b>Aha:</b> a combination is a multiset; build it in non-decreasing index order so each multiset has exactly one construction path.</p>`,
          `<p>Sort candidates. bt(start, rem, cur): loop i from start; recurse with (i, rem − c[i]). Save a copy when rem == 0.</p>`,
          `<p>Prune: if c[i] &gt; rem then <b>break</b> (sorted). Recipe: if rem == 0 save; for i in start..n−1: if c[i] &gt; rem break; add; bt(i, rem − c[i]); remove last.</p>`
        ],
        solution: {
          approach: `<p>Sorted candidates + start index + break-prune. Each node is a partial multiset; the start index forbids going back, the break stops at the first candidate that is too big.</p>`,
          code: `
            import java.util.*;

            class Solution {
                public List<List<Integer>> combinationSum(int[] candidates, int target) {
                    Arrays.sort(candidates);
                    List<List<Integer>> res = new ArrayList<>();
                    bt(candidates, 0, target, new ArrayList<>(), res);
                    return res;
                }

                private void bt(int[] c, int start, int rem, List<Integer> cur, List<List<Integer>> res) {
                    if (rem == 0) {
                        res.add(new ArrayList<>(cur));      // exact hit: save a copy
                        return;
                    }
                    for (int i = start; i < c.length; i++) {
                        if (c[i] > rem) break;              // too big, and so is everything after
                        cur.add(c[i]);                      // choose
                        bt(c, i, rem - c[i], cur, res);     // explore (same i = reuse)
                        cur.remove(cur.size() - 1);         // un-choose
                    }
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().combinationSum(new int[]{2, 3, 6, 7}, 7)); // [[2, 2, 3], [7]]
                    System.out.println(new Solution().combinationSum(new int[]{2, 3, 5}, 8));    // [[2, 2, 2, 2], [2, 3, 3], [3, 5]]
                }
            }`,
          dry: {
            head: ['cur', 'start', 'rem', 'loop', 'result'],
            rows: [
              ['[]', '0', '7', 'i = 0 (2)', 'choose 2'],
              ['[2,2,2]', '0', '1', '2 &gt; 1', H.c('r', 'break')],
              ['[2,2]', '0', '3', 'i = 1 (3)', H.c('g', '[2,2,3] saved')],
              ['[2]', '0', '5', 'i = 1 (3) → rem 2, then 3 &gt; 2', 'break'],
              ['[]', '0', '7', 'i = 2 (6) → rem 1 → 6 &gt; 1', 'break'],
              ['[]', '0', '7', 'i = 3 (7)', H.c('g', '[7] saved')]
            ]
          },
          complexity: `<p><b>Time</b>: exponential, bounded by O(N<sup>T/M + 1</sup>) where T = target, M = smallest candidate; output-sensitive in practice. <b>Space O(T/M)</b> recursion depth + cur (excluding output).</p>`,
          followUps: ['Combination Sum II (each once, duplicates in input)', 'Return only the count (Coin Change II DP)', 'Order matters (Combination Sum IV)']
        }
      }
    ]
  });

  // ===================== TOPIC 8: N-Queens =====================
  topics.push({
    title: 'N-Queens: Constraint Backtracking with O(1) Safety Checks',
    analogy: `<p><b>Seating rival party leaders at a wedding.</b> The hall is a grid of tables. Two rivals must never share a row, a column or a diagonal line of sight. You seat one leader per row, left to right. When you find no peaceful table for the current row, you go back to the <b>previous</b> row and move that leader to their next option. You keep a quick <b>"who can see whom" checklist</b> (busy columns, busy diagonals) so checking a seat is instant instead of looking around the whole hall.</p>`,
    explain: `<p><b>Problem:</b> place N queens on an N×N chessboard so that no two attack each other (no shared row, column or diagonal). Return all boards (or count them).</p>
      <h4>Step 1: shrink the search with one observation</h4>
      <p>Two queens in the same row attack each other, so every row holds <b>exactly one</b> queen. So the decision for row r is just "which column?". The tree has depth N and at most N choices per level: N<sup>N</sup> leaves naively (8<sup>8</sup> = 16.7 million), and because columns cannot repeat it is really ≤ N! (40,320 for N = 8). Pruning brings it down to about 2,000 nodes for N = 8.</p>
      <h4>Step 2: O(1) attack check with diagonal ids</h4>
      <p>Every cell (r, c) lies on one column <code>c</code>, one "↘" diagonal where <b>r − c</b> is constant, and one "↙" anti-diagonal where <b>r + c</b> is constant.</p>
      ${H.table(['cell', 'r − c (shift by n−1 → index)', 'r + c'], [['(0,1)', '−1 → 2', '1'], ['(1,2)', '−1 → 2  ' + H.c('r', 'same ↘ as (0,1)'), '3'], ['(2,0)', '2 → 5', '2'], ['(1,1)', '0 → 3', '2  ' + H.c('r', 'same ↙ as (2,0)')]])}
      <p>Keep three boolean arrays: <code>cols[n]</code>, <code>diag[2n−1]</code> (index r − c + n − 1), <code>anti[2n−1]</code> (index r + c). A cell is safe iff all three are false.</p>
      <h4>Step 3: the template</h4>
      <pre>place(r):
    if r == n: record board; return
    for c in 0..n-1:
        if cols[c] or diag[r-c+n-1] or anti[r+c]: continue   (prune)
        put queen, mark the three arrays                       (choose)
        place(r + 1)                                           (explore)
        remove queen, unmark the three arrays                  (un-choose)</pre>
      <h4>The two 4×4 solutions</h4>
      ${H.table(['solution', 'queen columns by row', 'board'], [['1', '[1, 3, 0, 2]', '.Q.. / ...Q / Q... / ..Q.'], ['2', '[2, 0, 3, 1]', '..Q. / Q... / ...Q / .Q..']])}
      <p>Number of solutions: N = 1 → 1, 2 → 0, 3 → 0, 4 → 2, 5 → 10, 6 → 4, 7 → 40, 8 → <b>92</b>, 9 → 352, 10 → 724.</p>`,
    clues: [
      '"Place N queens so that <b>no two attack</b> each other" / "return all distinct board configurations" / "return the number of solutions".',
      '"No two items share a <b>row, column or diagonal</b>" (rooks, bishops, guards, cameras) → one-per-row search + column/diagonal sets.',
      '<b>N ≤ 9–12</b> with "all configurations" → exponential backtracking is expected.',
      'Diagonal conflicts → index diagonals by <b>r − c</b> and <b>r + c</b>; never scan the board.',
      '"Count only" with N up to ~15 → bitmask N-Queens (three ints instead of arrays).'
    ],
    code: [`
      import java.util.*;

      class NQueens {
          public List<List<String>> solveNQueens(int n) {
              List<List<String>> res = new ArrayList<>();
              char[][] board = new char[n][n];
              for (char[] row : board) Arrays.fill(row, '.');
              place(0, n, board, new boolean[n], new boolean[2 * n - 1], new boolean[2 * n - 1], res);
              return res;
          }

          private void place(int r, int n, char[][] board, boolean[] cols, boolean[] diag, boolean[] anti,
                             List<List<String>> res) {
              if (r == n) {                                  // every row has a queen
                  List<String> snap = new ArrayList<>();
                  for (char[] row : board) snap.add(new String(row)); // copy the board
                  res.add(snap);
                  return;
              }
              for (int c = 0; c < n; c++) {
                  int d = r - c + n - 1, a = r + c;          // diagonal ids
                  if (cols[c] || diag[d] || anti[a]) continue; // attacked -> prune
                  board[r][c] = 'Q';
                  cols[c] = diag[d] = anti[a] = true;        // choose
                  place(r + 1, n, board, cols, diag, anti, res); // explore next row
                  board[r][c] = '.';
                  cols[c] = diag[d] = anti[a] = false;       // un-choose
              }
          }

          public static void main(String[] args) {
              for (List<String> b : new NQueens().solveNQueens(4)) System.out.println(b);
              // [.Q.., ...Q, Q..., ..Q.]
              // [..Q., Q..., ...Q, .Q..]
          }
      }`, `
      class NQueensBits {
          // Count solutions with bitmasks: bit c set = column c (or the diagonal hitting column c in this row) is attacked.
          static int count(int n, int row, int cols, int diag, int anti) {
              if (row == n) return 1;
              int full = (1 << n) - 1;
              int free = full & ~(cols | diag | anti);      // safe columns in this row
              int total = 0;
              while (free != 0) {
                  int bit = free & -free;                   // lowest safe column
                  free -= bit;
                  total += count(n, row + 1, cols | bit,
                                 (diag | bit) << 1,          // diagonals shift left for the next row
                                 (anti | bit) >> 1);         // anti-diagonals shift right
              }
              return total;
          }

          public static void main(String[] args) {
              for (int n = 1; n <= 10; n++) System.out.print(count(n, 0, 0, 0, 0) + " ");
              // 1 0 0 2 10 4 40 92 352 724
          }
      }`],
    codeTitle: ['N-Queens with O(1) checks (all boards)', 'N-Queens II with bitmasks (count only)'],
    viz: {
      title: 'N-Queens: place, detect conflict, backtrack',
      input: '4',
      inputLabel: 'board size n (4-6)',
      gen: genNQueens
    },
    examples: [
      {
        title: 'Why N = 2 and N = 3 have no solution',
        html: `<p>N = 2: any two cells in different rows and columns are diagonal neighbours → attack. N = 3: the queen in row 0 at column 0 or 2 leaves only one cell in row 2 that is not attacked by it, which is attacked by every possible row-1 queen; the middle column 1 attacks all of row 1. The search returns an empty list — make sure your code handles that (no crash, no null).</p>`
      },
      {
        title: 'Trace for N = 4 (first solution)',
        html: `${H.table(['row', 'try col', 'result'], [['0', '0', 'safe → place'], ['1', '0, 1', H.c('r', 'column / diagonal attacked')], ['1', '2', 'safe → place'], ['2', '0..3', H.c('r', 'all attacked → backtrack')], ['1', '3', 'move row-1 queen to col 3'], ['2', '1', 'safe'], ['3', '0..3', H.c('r', 'dead → backtrack twice')], ['0', '1', 'move row-0 queen'], ['1..3', '3, 0, 2', H.c('g', 'solution [1,3,0,2]')]])}
          <p>Every red row is a whole subtree cut off without exploring it.</p>`
      },
      {
        title: 'Using symmetry to halve the work',
        html: `<p>The mirror image (left ↔ right) of a solution is also a solution. So only try columns 0..⌊n/2⌋−1 in row 0, double the count, and for odd n add the solutions with the row-0 queen in the middle column. This 2× speed-up is a classic expert follow-up for N-Queens II.</p>`
      },
      {
        title: 'Validating a given board (the reverse question)',
        html: `<p>"Is this placement valid?" — no backtracking at all: scan each queen and insert its column, r − c and r + c into three HashSets; any repeat means an attack. O(N) for N queens. Interviewers sometimes ask this first as a warm-up.</p>`,
        code: `
          class ValidQueens {
              static boolean valid(int[] colOfRow) {             // colOfRow[r] = column of the queen in row r
                  Set<Integer> cols = new HashSet<>(), d = new HashSet<>(), a = new HashSet<>();
                  for (int r = 0; r < colOfRow.length; r++) {
                      int c = colOfRow[r];
                      if (!cols.add(c) || !d.add(r - c) || !a.add(r + c)) return false;
                  }
                  return true;
              }
              public static void main(String[] args) {
                  System.out.println(valid(new int[]{1, 3, 0, 2})); // true
                  System.out.println(valid(new int[]{0, 2, 1, 3})); // false
              }
          }`
      }
    ],
    deepDive: `<h4>How big is the search really?</h4>
      <p>Without pruning: N! column orders. With column + diagonal pruning, N = 8 visits about 2,057 partial placements (15,720 safety checks) to find all 92 solutions. Growth is still exponential — roughly the number of solutions grows like (0.143·N)<sup>N</sup> — so all-solutions N-Queens tops out around N = 15–17 even with bitmasks (N = 16 has 14,772,512 solutions).</p>
      <h4>Bitmask mechanics</h4>
      <p>Keep three ints: <code>cols</code>, <code>diag</code>, <code>anti</code>, where bit c means "column c is attacked in the current row". When moving to the next row, a ↘ diagonal attack moves one column to the right (<code>&lt;&lt; 1</code> in our bit order) and a ↙ attack one column to the left (<code>&gt;&gt; 1</code>). <code>free &amp; -free</code> isolates the lowest set bit (two's complement trick from the Bit Manipulation module). No arrays to undo — values are passed by copy, so un-choose is automatic.</p>
      <h4>Finding ONE solution is easy</h4>
      <p>For "any one solution" there is an explicit O(N) construction for every N ≥ 4 (based on N mod 6), and min-conflicts local search solves N = 1,000,000 in seconds. Backtracking is the right tool only when you need all solutions or the board has pre-placed queens.</p>
      <h4>N-Queens as a CSP</h4>
      <p>Variables = rows, domains = columns, constraints = no shared column/diagonal. General CSP tricks apply: forward checking (track remaining legal columns per row and fail as soon as one row has none), MRV ordering, and arc consistency. These are what SAT/CP solvers (OR-Tools CP-SAT, MiniZinc) do industrially for scheduling and timetabling.</p>
      <h4>Common bugs</h4>
      <ul>
        <li>Diagonal array of size n instead of 2n − 1 → ArrayIndexOutOfBounds.</li>
        <li>Using r − c as an index without adding n − 1 → negative index.</li>
        <li>Saving <code>board</code> itself instead of copying each row into a String.</li>
        <li>Checking rows below the current one (pointless — they are empty).</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> N-Queens is a famous problem with famous code; any model prints it. Interviewers therefore push on the <b>reasoning</b>: why one queen per row, why r − c and r + c identify diagonals, what the real search size is, the bitmask version, and symmetry for counting.</p>
      <p><b>Use AI as a partner:</b> <code>Generate a checker that verifies each returned board (N queens, no attacks) and compare my solution counts with OEIS A000170 for n = 1..10</code>. Ask for the bitmask version and then explain each shift to it — teaching back is a strong test of understanding.</p>
      <p><b>Where AI goes wrong:</b> off-by-one diagonal array sizes, shifting the diagonal masks in the wrong direction (counts come out wrong but plausible), and claiming the complexity is O(N!) or O(N<sup>N</sup>) without noting pruning makes the practical cost much smaller.</p>
      <p><b>What you must still own:</b> the modelling step (one per row + O(1) conflict sets), proving the prunes are safe, and knowing when a constraint solver or a direct construction is the better production answer.</p>`,
    problems: [
      {
        title: 'N-Queens (return all boards)',
        level: 'Hard',
        tags: ['backtracking', 'constraint satisfaction', 'hashing'],
        companies: ['Amazon', 'Microsoft', 'Apple', 'Google'],
        statement: `<p>Place <code>n</code> queens on an n × n chessboard so that no two queens attack each other. Return <b>all distinct solutions</b>; each solution is a list of n strings where <code>'Q'</code> is a queen and <code>'.'</code> is empty.</p>`,
        constraints: `1 ≤ n ≤ 9`,
        example: `<p>Input <b>n = 4</b> → Output (2 boards):</p>
          ${H.table(['solution 1', 'solution 2'], [['.Q..', '..Q.'], ['...Q', 'Q...'], ['Q...', '...Q'], ['..Q.', '.Q..']])}
          <p>Why: in each board every row, column and diagonal has at most one Q. n = 1 → [["Q"]]; n = 2 or 3 → no solutions (empty list).</p>`,
        brute: {
          why: `<p>Try every way to place n queens on n² cells: C(n², n) placements (4.4 billion for n = 8), checking each in O(n²). Even "one per row" without pruning tries n<sup>n</sup> = 16.7 million boards for n = 8 and validates each fully, although most die after 2 rows. The waste: continuing to fill rows below a queen that is already attacked.</p>`,
          code: `
            List<List<String>> brute(int n) {
                List<List<String>> res = new ArrayList<>();
                int[] pos = new int[n];
                int total = 1;
                for (int i = 0; i < n; i++) total *= n;      // n^n assignments
                for (int code = 0; code < total; code++) {
                    int x = code;
                    for (int r = 0; r < n; r++) { pos[r] = x % n; x /= n; }
                    boolean ok = true;
                    for (int i = 0; i < n && ok; i++)
                        for (int j = i + 1; j < n && ok; j++)
                            if (pos[i] == pos[j] || Math.abs(pos[i] - pos[j]) == j - i) ok = false;
                    if (!ok) continue;
                    List<String> board = new ArrayList<>();
                    for (int r = 0; r < n; r++) {
                        char[] row = new char[n];
                        Arrays.fill(row, '.');
                        row[pos[r]] = 'Q';
                        board.add(new String(row));
                    }
                    res.add(board);
                }
                return res;
            }`
        },
        mcq: {
          q: `Queens at (2, 5) and (4, 3) on an 8×8 board. Do they attack?`,
          options: ['No — different rows and columns', 'Yes — same ↘ diagonal (r − c equal)', 'Yes — same ↙ anti-diagonal (r + c equal)', 'Only if a third queen is between them'],
          answer: 2,
          explain: `r + c = 7 for both, so they share an anti-diagonal (↙). r − c is −3 vs 1, so not the main diagonal. Queens attack along open lines; with no piece between them they attack.`
        },
        hints: [
          `<p><b>Aha:</b> exactly one queen per row. The only decision per row is the column — a depth-n tree.</p>`,
          `<p>Track attacked columns and diagonals in three boolean arrays: <code>cols[c]</code>, <code>diag[r − c + n − 1]</code>, <code>anti[r + c]</code> (sizes n, 2n − 1, 2n − 1) for O(1) checks.</p>`,
          `<p>Edge cases: n = 1 (one board), n = 2, 3 (empty list). Copy the board into Strings when r == n. Recipe: place(r): if r == n record; for c: if any of the 3 marked continue; mark + put Q; place(r+1); unmark + remove Q.</p>`
        ],
        solution: {
          approach: `<p>Row-by-row backtracking with three O(1) conflict arrays; each complete placement is copied into the answer.</p>`,
          code: `
            import java.util.*;

            class Solution {
                private List<List<String>> res;
                private char[][] board;
                private boolean[] cols, diag, anti;
                private int n;

                public List<List<String>> solveNQueens(int n) {
                    this.n = n;
                    res = new ArrayList<>();
                    board = new char[n][n];
                    for (char[] row : board) Arrays.fill(row, '.');
                    cols = new boolean[n];
                    diag = new boolean[2 * n - 1];               // r - c + n - 1 in [0, 2n-2]
                    anti = new boolean[2 * n - 1];               // r + c in [0, 2n-2]
                    place(0);
                    return res;
                }

                private void place(int r) {
                    if (r == n) {
                        List<String> snap = new ArrayList<>();
                        for (char[] row : board) snap.add(new String(row));
                        res.add(snap);
                        return;
                    }
                    for (int c = 0; c < n; c++) {
                        int d = r - c + n - 1, a = r + c;
                        if (cols[c] || diag[d] || anti[a]) continue;   // attacked
                        board[r][c] = 'Q';
                        cols[c] = diag[d] = anti[a] = true;            // choose
                        place(r + 1);                                  // explore
                        board[r][c] = '.';
                        cols[c] = diag[d] = anti[a] = false;           // un-choose
                    }
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().solveNQueens(4));
                    System.out.println(new Solution().solveNQueens(8).size());   // 92
                }
            }`,
          dry: {
            head: ['row r', 'columns tried', 'safe col', 'marks set', 'event'],
            rows: [
              ['0', '0', '0', 'col0, d3, a0', 'place'],
              ['1', '0, 1 (attacked), 2', '2', 'col2, d2, a3', 'place'],
              ['2', '0..3 all attacked', '—', '—', H.c('r', 'backtrack to row 1')],
              ['1', '3', '3', 'col3, d1, a4', 'place; row 2 → col 1; row 3 dead'],
              ['0', '1', '1', 'col1, d2, a1', 'retry row 0'],
              ['1, 2, 3', '3, 0, 2', '—', '—', H.c('g', 'solution [1,3,0,2]')]
            ]
          },
          complexity: `<p><b>Time O(n!)</b> upper bound (columns never repeat), much less in practice thanks to diagonal pruning, plus O(n²) to copy each solution. <b>Space O(n)</b> for the marks and recursion depth, O(n²) for the board.</p>`,
          followUps: ['N-Queens II: count only (bitmask)', 'Some queens are pre-placed — adapt the marks', 'Return just one solution for n = 10<sup>5</sup> (construction / min-conflicts)']
        }
      }
    ]
  });

  // ===================== TOPIC 9: Sudoku Solver =====================
  topics.push({
    title: 'Sudoku Solver: Fill, Check, Erase (and Smarter Cell Ordering)',
    analogy: `<p><b>Doing a Sudoku in pencil.</b> You find an empty square, pencil in the first digit that does not clash with its row, column or 3×3 box, and move on. Later you get stuck — some square has no legal digit. So you go back to your most recent pencil mark, <b>erase it</b>, and try the next digit there. A good solver also keeps a <b>scratch list</b> of which digits are already used in each row, column and box, so checking a digit takes one glance instead of scanning 27 squares.</p>`,
    explain: `<p><b>Problem:</b> fill a 9×9 grid so every row, every column and every 3×3 box contains the digits 1–9 exactly once. Some cells are given; the puzzle has exactly one solution.</p>
      <h4>Model</h4>
      ${H.table(['part', 'Sudoku'], [
        ['State', 'the board (shared, mutated in place) + used-digit tables'],
        ['Choices', 'digits 1–9 for the next empty cell'],
        ['Valid?', 'digit not used in that row, column or box'],
        ['Goal', 'no empty cell left → return true (stop everything)'],
        ['Dead end', 'an empty cell where no digit fits → return false']
      ])}
      <h4>Which box is cell (r, c) in?</h4>
      <p><b>box = (r / 3) * 3 + c / 3</b> (integer division). Rows 0–2 → band 0, rows 3–5 → band 1, rows 6–8 → band 2; same for columns.</p>
      ${H.table(['cell', 'r / 3', 'c / 3', 'box'], [['(0, 0)', '0', '0', '0'], ['(4, 7)', '1', '2', H.c('p', '5')], ['(8, 3)', '2', '1', '7']])}
      <h4>O(1) checks with three tables</h4>
      <p><code>rows[9][10]</code>, <code>cols[9][10]</code>, <code>boxes[9][10]</code> booleans (or 9-bit masks). Placing digit d at (r, c) sets <code>rows[r][d] = cols[c][d] = boxes[b][d] = true</code>; erasing sets them back to false.</p>
      <h4>Return-boolean backtracking</h4>
      <pre>solve(pos):
    find next empty cell from pos; if none: return true
    for d in 1..9:
        if d is free in its row, col and box:
            write d, mark tables            (choose)
            if solve(next): return true      (explore — keep the answer!)
            erase d, unmark tables           (un-choose)
    return false                            (no digit fits: tell caller to change its guess)</pre>
      <p>Unlike "list all" problems, we <b>stop at the first success</b> and leave the digits on the board — that is the answer.</p>
      <h4>Mini example (4×4, boxes 2×2)</h4>
      <p>The visualizer solves a 4×4 Sudoku with exactly the same code shape, so you can watch each try, conflict and erase.</p>`,
    clues: [
      '"Write a program to <b>solve a Sudoku</b> puzzle by filling the empty cells" (in place, guaranteed unique solution).',
      '"Each digit 1–9 must occur <b>exactly once</b> in each row, column and sub-box" → three used-tables + backtracking.',
      '"Determine if a board is <b>valid</b>" (not solve) → just one pass with HashSets — no backtracking.',
      'Any grid-filling / assignment puzzle (KenKen, crossword fill, map colouring, exam timetabling) with <b>constraints between cells</b> → constraint-satisfaction backtracking.',
      '"Return any one solution" → make the recursion return <b>boolean</b> and stop on the first true.'
    ],
    code: [`
      class SudokuSolver {
          private final boolean[][] rows = new boolean[9][10];
          private final boolean[][] cols = new boolean[9][10];
          private final boolean[][] boxes = new boolean[9][10];

          public void solveSudoku(char[][] board) {
              for (int r = 0; r < 9; r++)
                  for (int c = 0; c < 9; c++)
                      if (board[r][c] != '.') mark(r, c, board[r][c] - '0', true); // record givens
              solve(board, 0);
          }

          private boolean solve(char[][] b, int pos) {
              while (pos < 81 && b[pos / 9][pos % 9] != '.') pos++;   // skip filled cells
              if (pos == 81) return true;                            // no empty cell: solved
              int r = pos / 9, c = pos % 9, box = (r / 3) * 3 + c / 3;
              for (int d = 1; d <= 9; d++) {
                  if (rows[r][d] || cols[c][d] || boxes[box][d]) continue; // clash
                  b[r][c] = (char) ('0' + d);
                  mark(r, c, d, true);                               // choose
                  if (solve(b, pos + 1)) return true;                // explore; keep answer on success
                  mark(r, c, d, false);                              // un-choose
                  b[r][c] = '.';
              }
              return false;                                          // dead end: caller retries
          }

          private void mark(int r, int c, int d, boolean v) {
              rows[r][d] = v;
              cols[c][d] = v;
              boxes[(r / 3) * 3 + c / 3][d] = v;
          }

          public static void main(String[] args) {
              String[] p = {
                  "53..7....", "6..195...", ".98....6.",
                  "8...6...3", "4..8.3..1", "7...2...6",
                  ".6....28.", "...419..5", "....8..79"
              };
              char[][] board = new char[9][];
              for (int i = 0; i < 9; i++) board[i] = p[i].toCharArray();
              new SudokuSolver().solveSudoku(board);
              for (char[] row : board) System.out.println(new String(row));
              // 534678912 / 672195348 / 198342567 / 859761423 / 426853791 / 713924856 / 961537284 / 287419635 / 345286179
          }
      }`],
    codeTitle: ['Sudoku solver with O(1) row/column/box checks'],
    viz: {
      title: 'Mini 4×4 Sudoku: try digit, detect clash, erase',
      input: '0040 4001 0324 0400',
      inputLabel: '16 digits 0-4 row by row (0 = empty)',
      gen: genSudoku
    },
    examples: [
      {
        title: 'Valid Sudoku (check only, no solving)',
        html: `<p>LeetCode 36: is a partially filled board consistent? One pass: for each filled cell, insert the strings "5 in row 0", "5 in col 3", "5 in box 1" into a <code>HashSet</code>; if any insert fails, it is invalid. O(81) — no recursion. Note: a valid board might still be <b>unsolvable</b>; the question only asks about the current digits.</p>`,
        code: `
          class ValidSudoku {
              static boolean isValid(char[][] b) {
                  Set<String> seen = new HashSet<>();
                  for (int r = 0; r < 9; r++)
                      for (int c = 0; c < 9; c++) {
                          char d = b[r][c];
                          if (d == '.') continue;
                          if (!seen.add(d + " in row " + r) || !seen.add(d + " in col " + c)
                              || !seen.add(d + " in box " + (r / 3) + "-" + (c / 3))) return false;
                      }
                  return true;
              }
              public static void main(String[] args) {
                  char[][] b = new char[9][9];
                  for (char[] row : b) Arrays.fill(row, '.');
                  b[0][0] = '5'; b[1][1] = '5';                // same box -> invalid
                  System.out.println(isValid(b));              // false
              }
          }`
      },
      {
        title: 'Bitmask candidates: which digits can go here?',
        html: `<p>Store <code>rowMask[r]</code>, <code>colMask[c]</code>, <code>boxMask[b]</code> as 9-bit ints (bit d−1 = digit d used). Free digits = <code>~(rowMask[r] | colMask[c] | boxMask[b]) &amp; 0x1FF</code>. <code>Integer.bitCount</code> gives how many options the cell has — which powers the MRV heuristic below.</p>
          ${H.bits(0b101100110, 9, { label: 'used (green = free digit slots)', hl: { 0: 'g', 3: 'g', 4: 'g', 7: 'g' } })}
          <p>Used digits {2, 3, 6, 7, 9} → free = {1, 4, 5, 8} → 4 candidates.</p>`
      },
      {
        title: 'MRV: fill the most constrained cell first',
        html: `<p>Instead of "next empty cell in reading order", pick the empty cell with the <b>fewest</b> candidates. A cell with 1 candidate is forced (no branching); a cell with 0 means fail immediately. On hard puzzles this cuts the search from millions of nodes to thousands. Cost: an O(81) scan per step — cheap compared with the branches it prunes.</p>`
      },
      {
        title: 'Same pattern elsewhere: Word Search on a grid',
        html: `<p>Find "ABCCED" in a letter grid moving up/down/left/right without reusing a cell. Choose = mark the cell as visited (e.g. overwrite with '#'), explore the 4 neighbours for the next letter, un-choose = restore the letter. Returns boolean, stops on the first success — exactly Sudoku's shape on a different board.</p>`
      }
    ],
    deepDive: `<h4>How hard is Sudoku really?</h4>
      <p>Generalised n²×n² Sudoku is NP-complete, so no known algorithm is polynomial in general. But 9×9 is tiny: plain backtracking with O(1) checks solves typical newspaper puzzles in microseconds to milliseconds; the hardest known 9×9 puzzles take a naive solver up to ~10<sup>5</sup>–10<sup>6</sup> nodes, and MRV brings that down by orders of magnitude.</p>
      <h4>Constraint propagation</h4>
      <p>Human techniques are prunes: <b>naked single</b> (a cell has one candidate), <b>hidden single</b> (a digit fits in only one cell of a row/column/box). Applying them after each guess (Norvig's famous solver) solves most puzzles without any guessing at all.</p>
      <h4>Exact cover and Dancing Links</h4>
      <p>Sudoku maps to <b>exact cover</b>: 729 choices (row, col, digit) that must cover 324 constraints exactly once (cell filled, row-digit, col-digit, box-digit). Knuth's Algorithm X with Dancing Links (DLX) solves it efficiently and generalises to pentomino tiling and N-Queens variants.</p>
      <h4>Why return boolean?</h4>
      <p>With a void function you would need a global "found" flag checked after every call; otherwise the search continues and the un-choose step erases the solution. Returning true up the stack both stops the search and preserves the board.</p>
      <h4>Correctness details</h4>
      <ul>
        <li>Initialise the tables from the givens <b>before</b> solving.</li>
        <li>The scan pointer <code>pos</code> only moves forward: every cell before it is filled, so no rescans — O(81) total skip work along a path.</li>
        <li>For "count solutions" (to check uniqueness when generating puzzles) remove the early return and stop after 2.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> a Sudoku solver is boilerplate for any model, and in production you would call a constraint/SAT solver (e.g. OR-Tools CP-SAT) rather than hand-roll one. Interviews use Sudoku to test <b>modelling</b>: state, O(1) validity checks, the boolean-return contract, and pruning heuristics like MRV.</p>
      <p><b>Use AI as a partner:</b> <code>Give me 3 hard 9×9 puzzles and their solutions; I will time my solver with and without MRV</code>. Ask it to review whether your un-choose restores <b>every</b> table you changed (board, rows, cols, boxes).</p>
      <p><b>Where AI goes wrong:</b> writes <code>isValid</code> that rescans 27 cells per try (slow but works), forgets to initialise the tables from the givens, uses a void recursion so the board ends up erased, or computes the box index as <code>r / 3 + c / 3</code> (collides boxes).</p>
      <p><b>What you must still own:</b> the CSP framing that transfers to scheduling and puzzles, the correctness of the box formula, and the judgement of when propagation or a solver library beats raw backtracking.</p>`,
    problems: [
      {
        title: 'Sudoku Solver',
        level: 'Hard',
        tags: ['backtracking', 'matrix', 'constraint satisfaction'],
        companies: ['Uber', 'Microsoft', 'Amazon', 'Snap'],
        statement: `<p>Write a program to solve a Sudoku puzzle by filling the empty cells (<code>'.'</code>) of a 9×9 <code>char[][] board</code> <b>in place</b>. Each of the digits 1–9 must occur exactly once in each row, each column and each of the nine 3×3 sub-boxes. The input has exactly one solution.</p>`,
        constraints: `board.length == 9, board[i].length == 9, board[i][j] is a digit or '.', exactly one solution`,
        example: `<p>Input row 0: <code>5 3 . . 7 . . . .</code> (plus 8 more rows, see the code above) → Output row 0: <code>5 3 ${H.c('g', '4 6')} 7 ${H.c('g', '8 9 1 2')}</code>.</p>
          <p>Why (0, 2) = 4: row 0 already has {3,5,7}, column 2 has {8}, box 0 has {3,5,6,8,9}; candidates are {1,2,4}. The solver tries 1 and 2 first, and only 4 survives the deeper checks.</p>`,
        brute: {
          why: `<p>Fill every empty cell with every digit (9<sup>k</sup> combinations for k empty cells — 9<sup>51</sup> for the classic example) and check the full board at the end. Hopeless. Even "check after each placement but rescan the row, column and box" works but costs 27 reads per try; the real waste is not stopping the moment a digit clashes.</p>`,
          code: `
            boolean bruteSolve(char[][] b) {
                for (int r = 0; r < 9; r++)
                    for (int c = 0; c < 9; c++)
                        if (b[r][c] == '.') {
                            for (char d = '1'; d <= '9'; d++) {
                                if (ok(b, r, c, d)) {            // rescans 27 cells each time
                                    b[r][c] = d;
                                    if (bruteSolve(b)) return true;
                                    b[r][c] = '.';
                                }
                            }
                            return false;
                        }
                return true;
            }
            boolean ok(char[][] b, int r, int c, char d) {
                for (int i = 0; i < 9; i++) {
                    if (b[r][i] == d || b[i][c] == d) return false;
                    if (b[3 * (r / 3) + i / 3][3 * (c / 3) + i % 3] == d) return false;
                }
                return true;
            }`
        },
        mcq: {
          q: `Your solver's recursion returns <code>void</code> and always un-chooses after the recursive call. What do you see at the end?`,
          options: ['The solved board', 'The original board — every placed digit was erased while unwinding', 'A board with random digits', 'A StackOverflowError'],
          answer: 1,
          explain: `Without a signal to stop, the search continues after finding the solution, and each frame's un-choose erases its digit on the way back. Return boolean and skip the erase once a child reports success.`
        },
        hints: [
          `<p><b>Aha:</b> treat each empty cell as one level of a decision tree with up to 9 choices; prune any digit already used in its row, column or box.</p>`,
          `<p>Precompute <code>rows[9][10]</code>, <code>cols[9][10]</code>, <code>boxes[9][10]</code> from the givens; box = (r/3)*3 + c/3. Recursion returns boolean.</p>`,
          `<p>Edge cases: givens must be marked before solving; on success return true without erasing. Recipe: find next '.' from pos; none → true; for d: if free → write+mark; if solve(next) return true; unmark+erase; return false.</p>`
        ],
        solution: {
          approach: `<p>Cell-by-cell backtracking with O(1) used-tables and a boolean return that freezes the board at the first full solution. Optional upgrade: choose the empty cell with the fewest candidates (MRV) using bitmasks.</p>`,
          code: `
            class Solution {
                private int[] rowMask = new int[9], colMask = new int[9], boxMask = new int[9];

                public void solveSudoku(char[][] board) {
                    for (int r = 0; r < 9; r++)
                        for (int c = 0; c < 9; c++)
                            if (board[r][c] != '.') flip(r, c, board[r][c] - '1');
                    solve(board);
                }

                private void flip(int r, int c, int d) {        // toggle digit d (0..8) at (r, c)
                    int bit = 1 << d;
                    rowMask[r] ^= bit;
                    colMask[c] ^= bit;
                    boxMask[(r / 3) * 3 + c / 3] ^= bit;
                }

                private boolean solve(char[][] b) {
                    // MRV: find the empty cell with the fewest legal digits
                    int bestR = -1, bestC = -1, bestFree = 0, bestCount = 10;
                    for (int r = 0; r < 9; r++)
                        for (int c = 0; c < 9; c++) {
                            if (b[r][c] != '.') continue;
                            int free = ~(rowMask[r] | colMask[c] | boxMask[(r / 3) * 3 + c / 3]) & 0x1FF;
                            int cnt = Integer.bitCount(free);
                            if (cnt < bestCount) { bestCount = cnt; bestR = r; bestC = c; bestFree = free; }
                        }
                    if (bestR == -1) return true;                // no empty cell: solved
                    while (bestFree != 0) {                      // 0 candidates -> loop skipped -> false
                        int bit = bestFree & -bestFree;          // lowest candidate digit
                        bestFree -= bit;
                        int d = Integer.numberOfTrailingZeros(bit);
                        b[bestR][bestC] = (char) ('1' + d);
                        flip(bestR, bestC, d);                   // choose
                        if (solve(b)) return true;               // explore
                        flip(bestR, bestC, d);                   // un-choose
                        b[bestR][bestC] = '.';
                    }
                    return false;
                }

                public static void main(String[] args) {
                    String[] p = {"53..7....", "6..195...", ".98....6.", "8...6...3", "4..8.3..1",
                                  "7...2...6", ".6....28.", "...419..5", "....8..79"};
                    char[][] b = new char[9][];
                    for (int i = 0; i < 9; i++) b[i] = p[i].toCharArray();
                    new Solution().solveSudoku(b);
                    for (char[] row : b) System.out.println(new String(row));
                }
            }`,
          alt: [{ lang: 'python', run: true, code: `def solve_sudoku(board):
    rows = [set() for _ in range(9)]
    cols = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]
    empty = []
    for r in range(9):
        for c in range(9):
            d = board[r][c]
            if d == '.':
                empty.append((r, c))
            else:
                rows[r].add(d); cols[c].add(d); boxes[r // 3 * 3 + c // 3].add(d)

    def bt(k):
        if k == len(empty):
            return True
        r, c = empty[k]
        b = r // 3 * 3 + c // 3
        for d in "123456789":
            if d in rows[r] or d in cols[c] or d in boxes[b]:
                continue
            board[r][c] = d; rows[r].add(d); cols[c].add(d); boxes[b].add(d)
            if bt(k + 1):
                return True
            board[r][c] = '.'; rows[r].remove(d); cols[c].remove(d); boxes[b].remove(d)
        return False

    bt(0)

p = ["53..7....", "6..195...", ".98....6.", "8...6...3", "4..8.3..1",
     "7...2...6", ".6....28.", "...419..5", "....8..79"]
board = [list(row) for row in p]
solve_sudoku(board)
print("\\n".join("".join(row) for row in board))` }],
          dry: {
            head: ['step', 'cell (MRV pick)', 'candidates', 'action'],
            rows: [
              ['1', 'a cell with 1 candidate', '{d}', 'forced: write d (no branching)'],
              ['2', 'next forced cells…', '1 each', 'most of the classic puzzle fills this way'],
              ['3', 'cell with 2 candidates', '{x, y}', 'try x → recurse'],
              ['4', 'deeper cell', H.c('r', '{}'), H.c('r', 'return false → undo')],
              ['5', 'back at step 3', '{y}', 'try y → recurse'],
              ['6', 'no empty cell', '—', H.c('g', 'return true all the way up; board kept')]
            ]
          },
          complexity: `<p><b>Time</b>: worst case O(9<sup>k</sup>) for k empty cells (NP-complete in general), but O(1) checks and MRV make real 9×9 puzzles take milliseconds. MRV scan costs O(81) per node. <b>Space O(k)</b> recursion depth (k ≤ 81) + O(27) masks.</p>`,
          followUps: ['Count solutions (stop after 2) to verify a puzzle is unique', 'Generate a puzzle with a unique solution', 'Solve 16×16 Sudoku — what changes?']
        }
      }
    ]
  });

  registerModule({
    id: 'dsa11',
    title: 'Recursion & Backtracking',
    intro: `<p>Recursion is a function solving a problem by handing a <b>smaller copy of the same problem</b> to itself. Backtracking is recursion that <b>builds an answer one decision at a time</b> and <b>undoes</b> each decision after exploring it — the engine behind "return all subsets / permutations / combinations", N-Queens and Sudoku.</p>
      <p>In this module you will first see what really happens in memory (the <b>call stack</b>), learn to read the cost of any recursive function from its <b>recursion tree</b>, and solve the Tower of Hanoi. Then you will learn one template — <b>choose → explore → un-choose</b> — and apply it to subsets (pick / not-pick), permutations (swap and used[], with duplicates), combination sums, N-Queens and Sudoku. Every topic has a step-by-step visualizer: watch the stack grow and shrink, the tree branch, and queens get placed and lifted.</p>
      <p>Why it matters: backtracking questions are a staple of FAANG-style interviews (Subsets, Permutations, Combination Sum, Generate Parentheses, Word Search, N-Queens), and the recursion tree is the mental model you will reuse for Divide &amp; Conquer, Trees, Graph DFS and Dynamic Programming.</p>`,
    goals: [
      'Trace any recursive function on the <b>call stack</b>: predict output order, stack depth and when <code>StackOverflowError</code> happens.',
      'Turn recursive code into a <b>recurrence</b> and solve it with a recursion tree, unrolling or the Master Theorem (O(log n), O(n log n), O(2<sup>n</sup>), O(n!)).',
      'Solve Tower of Hanoi and prove why it needs exactly 2<sup>n</sup> − 1 moves.',
      'Apply the <b>choose → explore → un-choose</b> template to subsets, permutations (with duplicates) and combination sums without producing duplicate answers.',
      'Solve N-Queens and Sudoku with O(1) conflict checks and explain the pruning that makes them fast.',
      'Recognise from the constraints (N ≤ 10, ≤ 20) and wording ("return all…") when exhaustive search is expected — and when to switch to DP or a formula.'
    ],
    prereqs: `DSA 1 (Programming Foundations: methods, stack vs heap, references), DSA 2 (Time/Space Complexity, AP/GP and logarithms) and DSA 4 (Bit Manipulation, for bitmask subsets and N-Queens bitmasks). Comfort with Java <code>ArrayList</code> and arrays.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
