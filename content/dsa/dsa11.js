(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- visualizer code panes: Java is the main version (hl uses its line numbers); alt gives the other languages ---------- */
  function J(lines) { return lines.join('\n'); }
  var CU_ALT = {
    python: { code: J(['def count_up(n):', '    if n == 0:', '        return', '    count_up(n - 1)', '    print(n)']), map: { 3: 4, 4: 5 } },
    js: { code: J(['function countUp(n) {', '  if (n === 0) return;', '  countUp(n - 1);', '  console.log(n);', '}']), map: {} },
    cpp: { code: J(['void countUp(int n) {', '  if (n == 0) return;', '  countUp(n - 1);', '  cout << n << endl;', '}']), map: {} }
  };
  var CD_ALT = {
    python: { code: J(['def count_down(n):', '    if n == 0:', '        return', '    print(n)', '    count_down(n - 1)']), map: { 3: 4, 4: 5 } },
    js: { code: J(['function countDown(n) {', '  if (n === 0) return;', '  console.log(n);', '  countDown(n - 1);', '}']), map: {} },
    cpp: { code: J(['void countDown(int n) {', '  if (n == 0) return;', '  cout << n << endl;', '  countDown(n - 1);', '}']), map: {} }
  };
  var PAREN_ALT = {
    python: { code: J(['def bt(sb, open_, close):', '    if len(sb) == 2 * n:', '        res.append("".join(sb)); return', '    if open_ < n:', '        sb.append("("); bt(sb, open_ + 1, close); sb.pop()', '    if close < open_:', '        sb.append(")"); bt(sb, open_, close + 1); sb.pop()']), map: { 2: 3, 3: 4, 4: 5 } },
    js: { code: J(['function bt(sb, open, close) {', '  if (sb.length === 2 * n) { res.push(sb.join("")); return; }', '  if (open < n) {', '    sb.push("("); bt(sb, open + 1, close); sb.pop();', '  }', '  if (close < open) {', '    sb.push(")"); bt(sb, open, close + 1); sb.pop();', '  }', '}']), map: {} },
    cpp: { code: J(['void bt(string& sb, int open, int close) {', '  if ((int)sb.size() == 2 * n) { res.push_back(sb); return; }', '  if (open < n) {', "    sb.push_back('('); bt(sb, open + 1, close); sb.pop_back();", '  }', '  if (close < open) {', "    sb.push_back(')'); bt(sb, open, close + 1); sb.pop_back();", '  }', '}']), map: {} }
  };

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
        { type: 'code', label: 'Line running now', lang: 'java', code: code, hl: hl, alt: kind === 'up' ? CU_ALT : CD_ALT },
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
      { type: 'code', label: 'Code', lang: 'java', code: code, alt: kind === 'up' ? CU_ALT : CD_ALT },
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
        { type: 'code', label: 'choose → explore → un-choose', lang: 'java', code: code, hl: hl, alt: PAREN_ALT },
        { type: 'array', label: 'sb (the ONE shared builder)', values: sb.length ? sb.slice() : ['∅'], hl: sb.length ? one(sb.length - 1, cls === 'bad' ? 'bad' : 'ok') : {} },
        { type: 'vars', vals: { n: n, open: open, close: close } },
        { type: 'set', label: 'answers (' + res.length + ')', items: res.slice(), hl: resHl ? one(resHl, 'ok') : {} }
      ] });
      if (frames.length > 260) stopped = true;
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
    frames.push({ narr: stopped ? 'Long search — the movie stops here (' + res.length + ' answers so far).' : 'Done: <b>' + res.length + '</b> valid string(s) — Catalan number C<sub>' + n + '</sub>. Pruning meant we never built a single invalid string, instead of generating all 2<sup>' + (2 * n) + '</sup> = ' + Math.pow(2, 2 * n) + ' strings and filtering.', parts: [
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
      <p>The call stack has a fixed size. Java and JavaScript usually manage around <b>10<sup>4</sup></b> simple frames by default, C++ gets an 8 MB stack on Linux (often only 1 MB on Windows), and Python stops at a recursion limit of <b>1000</b> frames. If the recursion is too deep, or the base case is missing / never reached, frames pile up until the program fails: <span class="c-r"><code>StackOverflowError</code></span> in Java, <code>RecursionError</code> in Python, <code>RangeError</code> in JavaScript, and a plain crash (segmentation fault) in C++.</p>
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
      'Depth ≈ N with <code>N ≤ 10<sup>4</sup></code> is usually safe; <code>N ≈ 10<sup>6</sup></code> with one call per step → risk of a <b>stack overflow</b> (Python already stops at 1000 frames), prefer a loop.',
      'Exponent up to 10<sup>9</sup> or 2<sup>31</sup> ("compute x<sup>n</sup>") → halve the problem each call: O(log n) depth.'
    ],
    code: [{ lang: 'java', code: `
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
      }`,
      alt: [
        { lang: 'python', run: true, code: `def fact(n):
    if n <= 1:                      # BASE CASE: the smallest doll
        return 1
    return n * fact(n - 1)          # RECURSIVE CASE: shrink n, trust the answer


def fib(n):
    if n <= 1:                      # fib(0) = 0, fib(1) = 1
        return n
    return fib(n - 1) + fib(n - 2)  # left call finishes completely before the right one starts


def count_down(n):                  # prints n, n-1, ..., 1
    if n == 0:
        return
    print(n, end=" ")               # work BEFORE the call -> runs on the way DOWN
    count_down(n - 1)


def count_up(n):                    # prints 1, 2, ..., n
    if n == 0:
        return
    count_up(n - 1)
    print(n, end=" ")               # work AFTER the call -> runs on the way back UP


print(fact(5))                      # 120
print(fib(6))                       # 8
count_down(3)                       # 3 2 1
count_up(3)                         # 1 2 3
print()` },
        { lang: 'js', run: true, code: `// Factorial: n! = n * (n-1)!, base case 0! = 1! = 1
function fact(n) {
  if (n <= 1) return 1;                  // BASE CASE: the smallest doll
  return n * fact(n - 1);                // RECURSIVE CASE (exact up to 18!; use BigInt beyond)
}

// Fibonacci: two calls per frame
function fib(n) {
  if (n <= 1) return n;                  // fib(0) = 0, fib(1) = 1
  return fib(n - 1) + fib(n - 2);        // left call finishes completely before the right one starts
}

// Head vs tail work: same calls, different print order
function countDown(n, out = []) {        // collects n, n-1, ..., 1
  if (n === 0) return out;
  out.push(n);                           // work BEFORE the call -> runs on the way DOWN
  return countDown(n - 1, out);
}
function countUp(n, out = []) {          // collects 1, 2, ..., n
  if (n === 0) return out;
  countUp(n - 1, out);
  out.push(n);                           // work AFTER the call -> runs on the way back UP
  return out;
}

console.log(fact(5));                    // 120
console.log(fib(6));                     // 8
console.log(countDown(3).join(' '));     // 3 2 1
console.log(countUp(3).join(' '));       // 1 2 3` },
        { lang: 'cpp', code: `// Factorial: n! = n * (n-1)!, base case 0! = 1! = 1
long long fact(int n) {
    if (n <= 1) return 1;                // BASE CASE: the smallest doll
    return n * fact(n - 1);              // RECURSIVE CASE: shrink n, trust the answer
}

// Fibonacci: fib(n) = fib(n-1) + fib(n-2); two calls per frame
int fib(int n) {
    if (n <= 1) return n;                // fib(0) = 0, fib(1) = 1
    return fib(n - 1) + fib(n - 2);      // left call finishes completely before the right one starts
}

// Head vs tail work: same calls, different print order
void countDown(int n) {                  // prints n, n-1, ..., 1
    if (n == 0) return;
    cout << n << ' ';                    // work BEFORE the call -> runs on the way DOWN
    countDown(n - 1);
}
void countUp(int n) {                    // prints 1, 2, ..., n
    if (n == 0) return;
    countUp(n - 1);
    cout << n << ' ';                    // work AFTER the call -> runs on the way back UP
}

int main() {
    cout << fact(5) << '\\n';             // 120
    cout << fib(6) << '\\n';              // 8
    countDown(3);                        // 3 2 1
    countUp(3);                          // 1 2 3
    cout << '\\n';
}` }
      ] }, { lang: 'java', code: `
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
      }`,
        alt: [
          { lang: 'python', run: true, code: `import sys

depth = 0


def no_base(n):
    # BUG on purpose: no base case, so every call makes another call forever.
    global depth
    depth += 1
    no_base(n - 1)                  # never stops


try:
    no_base(5)
except RecursionError:
    # CPython stops at sys.getrecursionlimit() frames (1000 by default).
    print("Stack overflowed after about", depth, "frames; the limit is", sys.getrecursionlimit())` },
          { lang: 'js', run: true, code: `// BUG on purpose: no base case, so every call makes another call forever.
let depth = 0;
function noBase(n) {
  depth++;
  noBase(n - 1);                         // never stops
}

try {
  noBase(5);
} catch (e) {
  // V8 throws RangeError ("Maximum call stack size exceeded"), usually after ~10k frames.
  console.log(e instanceof RangeError, 'stack overflowed after about ' + depth + ' frames');
}` },
          { lang: 'cpp', code: `// BUG on purpose: no base case, so every call makes another call forever.
// In C++ a stack overflow is NOT an exception you can catch: the program
// crashes (usually "Segmentation fault"), so main below never calls it.
long long depthReached = 0;
void noBase(int n) {
    depthReached++;
    noBase(n - 1);                       // never stops
}

// The fix: a base case that every call moves toward.
int withBase(int n) {
    if (n <= 0) return 0;                // base case
    return 1 + withBase(n - 1);
}

int main() {
    cout << withBase(100000) << '\\n';    // 100000 small frames fit in a typical 8 MB stack
}` }
        ] }],
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
        code: { lang: 'java', code: `
          class DigitSum {
              static int digitSum(int n) {
                  if (n < 10) return n;                 // base case: single digit
                  return n % 10 + digitSum(n / 10);     // last digit + sum of the rest
              }
              public static void main(String[] args) {
                  System.out.println(digitSum(4721));   // 14
              }
          }`,
          alt: [
            { lang: 'python', run: true, code: `def digit_sum(n):
    if n < 10:
        return n                    # base case: single digit
    return n % 10 + digit_sum(n // 10)   # last digit + sum of the rest


print(digit_sum(4721))              # 14` },
            { lang: 'js', run: true, code: `function digitSum(n) {
  if (n < 10) return n;                          // base case: single digit
  return (n % 10) + digitSum(Math.floor(n / 10)); // last digit + sum of the rest
}
console.log(digitSum(4721));                     // 14` },
            { lang: 'cpp', code: `int digitSum(int n) {
    if (n < 10) return n;                // base case: single digit
    return n % 10 + digitSum(n / 10);    // last digit + sum of the rest
}
int main() {
    cout << digitSum(4721) << '\\n';      // 14
}` }
          ] }
      },
      {
        title: 'Is it a palindrome? — two ends move inwards',
        html: `<p>"racecar": compare the first and last characters; if they match, the answer is whatever the <b>inside</b> ("aceca") says. Base case: 0 or 1 characters left → palindrome. Pass indices <code>(l, r)</code> instead of creating substrings — <code>substring</code> copies characters and would turn O(N) into O(N<sup>2</sup>).</p>
          ${H.arr(['r', 'a', 'c', 'e', 'c', 'a', 'r'], { hl: { 0: 'g', 6: 'g', 3: 'p' }, ptr: { 0: 'l', 6: 'r' } })}`,
        code: { lang: 'java', code: `
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
          }`,
          alt: [
            { lang: 'python', run: true, code: `def is_pal(s, l, r):
    if l >= r:
        return True                 # base: empty or one char
    if s[l] != s[r]:
        return False                # early exit: mismatch
    return is_pal(s, l + 1, r - 1)  # the inside decides


print(is_pal("racecar", 0, 6))      # True
print(is_pal("abca", 0, 3))         # False` },
            { lang: 'js', run: true, code: `function isPal(s, l, r) {
  if (l >= r) return true;                       // base: empty or one char
  if (s[l] !== s[r]) return false;               // early exit: mismatch
  return isPal(s, l + 1, r - 1);                 // the inside decides
}
console.log(isPal('racecar', 0, 6));             // true
console.log(isPal('abca', 0, 3));                // false` },
            { lang: 'cpp', code: `bool isPal(const string& s, int l, int r) {   // const& : no copy per call
    if (l >= r) return true;                   // base: empty or one char
    if (s[l] != s[r]) return false;            // early exit: mismatch
    return isPal(s, l + 1, r - 1);             // the inside decides
}
int main() {
    cout << boolalpha << isPal("racecar", 0, 6) << '\\n';   // true
    cout << boolalpha << isPal("abca", 0, 3) << '\\n';      // false
}` }
          ] }
      },
      {
        title: 'Reverse an array in place with recursion',
        html: `<p>Swap the two ends, then reverse the middle. [1, 2, 3, 4, 5] → swap 1 and 5 → [5, 2, 3, 4, 1] → reverse(1, 3) → swap 2 and 4 → [5, 4, 3, 2, 1] → reverse(2, 2) is the base case. This is the same "shrink from both ends" shape as the palindrome check — recursion is often just a loop in disguise, which is why interviewers ask you to convert one into the other.</p>`,
        code: { lang: 'java', code: `
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
          }`,
          alt: [
            { lang: 'python', run: true, code: `def reverse(a, l, r):
    if l >= r:
        return                      # base: 0 or 1 elements left
    a[l], a[r] = a[r], a[l]         # fix the two ends
    reverse(a, l + 1, r - 1)        # trust recursion for the middle


a = [1, 2, 3, 4, 5]
reverse(a, 0, len(a) - 1)
print(a)                            # [5, 4, 3, 2, 1]` },
            { lang: 'js', run: true, code: `function reverse(a, l, r) {
  if (l >= r) return;                            // base: 0 or 1 elements left
  [a[l], a[r]] = [a[r], a[l]];                   // fix the two ends
  reverse(a, l + 1, r - 1);                      // trust recursion for the middle
}
const a = [1, 2, 3, 4, 5];
reverse(a, 0, a.length - 1);
console.log(a);                                  // [ 5, 4, 3, 2, 1 ]` },
            { lang: 'cpp', code: `void reverseRange(vector<int>& a, int l, int r) {
    if (l >= r) return;                  // base: 0 or 1 elements left
    swap(a[l], a[r]);                    // fix the two ends
    reverseRange(a, l + 1, r - 1);       // trust recursion for the middle
}
int main() {
    vector<int> a = {1, 2, 3, 4, 5};
    reverseRange(a, 0, (int)a.size() - 1);
    for (int x : a) cout << x << ' ';    // 5 4 3 2 1
    cout << '\\n';
}` }
          ] }
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
      <h4>How deep can each language go?</h4>
      <p>The default thread stack is set by <code>-Xss</code> (commonly 512 KB–1 MB on 64-bit JVMs). A tiny frame (one <code>int</code>) allows roughly 10–20 thousand calls before the JIT kicks in, often more after JIT compiles the method (compiled frames are smaller). Never rely on an exact number. Workarounds for deep recursion: (1) rewrite as a loop, (2) use an explicit <code>ArrayDeque</code> stack, (3) run the recursion in a <code>new Thread(null, task, "big", 1L &lt;&lt; 26)</code> with a 64 MB stack (a common competitive-programming trick).</p>
      <p><b>Other languages:</b> Python counts frames instead of bytes: <code>sys.setrecursionlimit(10**6)</code> raises the limit, and for really deep DFS also run the work in a <code>threading.Thread</code> after <code>threading.stack_size(512 * 1024 * 1024)</code>, or the interpreter itself can crash. JavaScript (V8) allows roughly 10 thousand frames; <code>node --stack-size=...</code> changes it, but an explicit array stack is the portable fix. C++ has no limit check at all: past the OS stack (<code>ulimit -s</code>, usually 8 MB) the program simply crashes, so estimate depth × frame size before recursing deeply.</p>
      <h4>Tail recursion — do not count on it being optimised</h4>
      <p>A call is a <b>tail call</b> when it is the very last thing the function does (<code>return helper(n - 1, acc * n)</code>). Scheme, Scala (<code>@tailrec</code>) and Kotlin (<code>tailrec</code>) turn that into a jump, so the stack never grows. The JVM (including Java 21+) does not do this, nor does CPython. JavaScript's specification allows proper tail calls, but V8 (Chrome, Node) does not implement them. C++ compilers often turn tail calls into jumps at <code>-O2</code>, but the language does not guarantee it. So tail-recursive code still costs O(depth) stack in practice — convert it to a loop if depth can be large.</p>
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
        constraints: `0 ≤ N ≤ 20 (20! = 2,432,902,008,176,640,000 still fits in a signed 64-bit integer — <code>long</code> / <code>long long</code>; 21! does not. Python ints never overflow; JavaScript needs <code>BigInt</code> because 19! is past 2<sup>53</sup>)`,
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
          code: {
          lang: 'java',
          code: `
            long factLoop(int n) {
                long ans = 1;
                for (int i = 2; i <= n; i++) {
                    ans *= i;          // multiply 2, 3, ..., n
                }
                return ans;
            }`,
          alt: [
            { lang: 'python', code: `def factorial(n):
    ans = 1
    for i in range(2, n + 1):
        ans *= i               # multiply 2, 3, ..., n
    return ans` },
            { lang: 'js', code: `function factorial(n) {
  let ans = 1;
  for (let i = 2; i <= n; i++) {
    ans *= i;          // multiply 2, 3, ..., n
  }
  return ans;
}` },
            { lang: 'cpp', code: `long long factorial(int n) {
    long long ans = 1;
    for (int i = 2; i <= n; i++) {
        ans *= i;          // multiply 2, 3, ..., n
    }
    return ans;
}` }
          ]
        }
        },
        mcq: {
          q: `You wrote <code>long fact(int n) { return n * fact(n - 1); }</code> with <b>no</b> if-statement. What happens for <code>fact(3)</code>?`,
          options: ['Returns 6', 'Returns 0 because it eventually multiplies by 0', 'Calls go 3, 2, 1, 0, -1, -2 … until StackOverflowError', 'Compile error'],
          answer: 2,
          explain: `Nothing ever stops the calls: there is no base case, so it keeps calling with smaller and smaller (negative) n. It never returns at all, so it never gets to multiply by 0 — the stack fills up and the program dies with a stack overflow (StackOverflowError in Java, RecursionError in Python, RangeError in JavaScript, a crash in C++).`
        },
        hints: [
          `<p><b>Aha:</b> N! = N × (N − 1)!. The big problem is "N times the answer to a smaller problem". The smallest problem you just know: 0! = 1! = 1.</p>`,
          `<p>No data structure needed — the <b>call stack</b> itself remembers each pending "N × ?" for you. Each frame stores its own <code>n</code>.</p>`,
          `<p>Traps: use a 64-bit integer (<code>long</code> / <code>long long</code>; <code>BigInt</code> in JavaScript, plain ints in Python) because 13! already overflows a 32-bit <code>int</code>; handle <code>n = 0</code> (use <code>n &lt;= 1</code> as the base case). Recipe: if n ≤ 1 return 1; else return n × fact(n − 1).</p>`
        ],
        tests: { sig: 'int -> long', fn: 'factorial', cases: [
          [[0],1],
          [[1],1],
          [[2],2],
          [[5],120],
          [[12],479001600],
          [[13],6227020800],
          [[19],"121645100408832000"],
          [[20],"2432902008176640000"]
        ] },
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
          alt: [
            { lang: 'python', code: `def factorial(n: int) -> int:
    if n <= 1:
        return 1                    # base case: 0! = 1! = 1
    return n * factorial(n - 1)     # Python ints never overflow, so 20! is exact` },
            { lang: 'js', code: `function factorial(n) {
  if (n <= 1) return 1n;                 // base case; BigInt because 19! is past 2^53
  return BigInt(n) * factorial(n - 1);   // leap of faith on (n-1)!
}` },
            { lang: 'cpp', code: `class Solution {
public:
    long long factorial(int n) {
        if (n <= 1) return 1;                 // base case: 0! = 1! = 1
        return n * factorial(n - 1);          // long long: 20! < 2^63, 21! is not
    }
};` }
          ],
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
          code: {
          lang: 'java',
          code: `
            double powBrute(double x, int n) {
                long m = Math.abs((long) n);   // long so that -2^31 does not overflow
                double ans = 1.0;
                for (long i = 0; i < m; i++) {
                    ans *= x;                  // one multiplication per unit of n
                }
                return n < 0 ? 1.0 / ans : ans;
            }`,
          alt: [
            { lang: 'python', code: `def my_pow(x, n):
    m = abs(n)
    ans = 1.0
    for _ in range(m):
        ans *= x                   # one multiplication per unit of n
    return 1.0 / ans if n < 0 else ans` },
            { lang: 'js', code: `function myPow(x, n) {
  const m = Math.abs(n);
  let ans = 1.0;
  for (let i = 0; i < m; i++) {
    ans *= x;                  // one multiplication per unit of n
  }
  return n < 0 ? 1.0 / ans : ans;
}` },
            { lang: 'cpp', code: `double myPow(double x, int n) {
    long long m = llabs((long long)n);   // long long so that -2^31 does not overflow
    double ans = 1.0;
    for (long long i = 0; i < m; i++) {
        ans *= x;                        // one multiplication per unit of n
    }
    return n < 0 ? 1.0 / ans : ans;
}` }
          ]
        }
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
          `<p>Traps: n = −2<sup>31</sup> → <code>-n</code> overflows int, so copy n into a 64-bit integer first (<code>long</code> / <code>long long</code>; Python and JavaScript numbers have no such trap). Negative n → compute with x = 1/x and positive n. Recipe: N = (long) n; if N &lt; 0 { x = 1/x; N = −N; } return fast(x, N); fast: if N == 0 return 1; half = fast(x, N/2); return N even ? half·half : half·half·x.</p>`
        ],
        tests: { sig: 'double int -> double', fn: 'myPow', cmp: "float", cases: [
          [[2.0,10],1024.0],
          [[2.1,3],9.261000000000001],
          [[2.0,-2],0.25],
          [[1.0,-2147483648],1.0],
          [[-1.0,-2147483648],1.0],
          [[2.0,-2147483648],0.0],
          [[-2.0,3],-8.0],
          [[0.5,-3],8.0],
          [[34.00515,-3],2.543114507074558e-05],
          [[1.00001,123456],3.4368447520907104],
          [[0.0,5],0.0],
          [[-99.999999999,0],1.0],
          [[1.00000001,2147483647],2120327154.9839377]
        ] },
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
          alt: [
            { lang: 'python', code: `def my_pow(x: float, n: int) -> float:
    if n < 0:                       # x^-n = (1/x)^n; Python ints have no -2^31 trap
        x, n = 1 / x, -n

    def fast(e: int) -> float:
        if e == 0:
            return 1.0              # base case: anything^0 = 1
        half = fast(e // 2)         # ONE recursive call on half the exponent
        return half * half if e % 2 == 0 else half * half * x

    return fast(n)` },
            { lang: 'js', code: `function myPow(x, n) {
  if (n < 0) { x = 1 / x; n = -n; }      // -(-2^31) is still exact in a JS number
  const fast = (e) => {
    if (e === 0) return 1;               // base case
    const half = fast(Math.floor(e / 2)); // ONE call on half the exponent
    return e % 2 === 0 ? half * half : half * half * x;
  };
  return fast(n);
}` },
            { lang: 'cpp', code: `class Solution {
public:
    double myPow(double x, int n) {
        long long N = n;                      // -(-2^31) does not fit in int
        if (N < 0) { x = 1 / x; N = -N; }
        return fastPow(x, N);
    }
private:
    double fastPow(double x, long long N) {
        if (N == 0) return 1.0;               // base case
        double half = fastPow(x, N / 2);      // ONE call on half the exponent
        return N % 2 == 0 ? half * half : half * half * x;
    }
};` }
          ],
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
    code: { lang: 'java', code: `
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
      alt: [
        { lang: 'python', run: true, code: `def sum_to(n):                      # T(n) = T(n-1) + 1  -> O(n)
    return 0 if n == 0 else n + sum_to(n - 1)


def count_halvings(n):              # T(n) = T(n/2) + 1  -> O(log n)
    return 0 if n <= 1 else 1 + count_halvings(n // 2)


calls = 0


def double_tree(n):                 # T(n) = 2T(n-1) + 1 -> O(2^n): count the calls
    global calls
    calls += 1
    if n == 0:
        return
    double_tree(n - 1)
    double_tree(n - 1)


def merge_work(n):                  # T(n) = 2T(n/2) + n -> O(n log n): total "work"
    if n <= 1:
        return 1
    return merge_work(n // 2) + merge_work(n - n // 2) + n   # two halves + linear merge


print(sum_to(10))                   # 55
print(count_halvings(1024))         # 10
double_tree(4)
print(calls)                        # 31 = 2^5 - 1 (levels n..0)
print(merge_work(8))                # 32 = 8 * 3 (merges) + 8 (leaves)` },
        { lang: 'js', run: true, code: `// T(n) = T(n-1) + 1  -> O(n)
const sumTo = (n) => (n === 0 ? 0 : n + sumTo(n - 1));

// T(n) = T(n/2) + 1  -> O(log n)
const countHalvings = (n) => (n <= 1 ? 0 : 1 + countHalvings(Math.floor(n / 2)));

// T(n) = 2T(n-1) + 1 -> O(2^n): count the calls to see the doubling
let calls = 0;
function doubleTree(n) {
  calls++;
  if (n === 0) return;
  doubleTree(n - 1);
  doubleTree(n - 1);
}

// T(n) = 2T(n/2) + n -> O(n log n): returns total "work" done
function mergeWork(n) {
  if (n <= 1) return 1;
  const half = Math.floor(n / 2);
  return mergeWork(half) + mergeWork(n - half) + n;   // two halves + linear merge
}

console.log(sumTo(10));            // 55
console.log(countHalvings(1024));  // 10
doubleTree(4);
console.log(calls);                // 31 = 2^5 - 1 (levels n..0)
console.log(mergeWork(8));         // 32 = 8 * 3 (merges) + 8 (leaves)` },
        { lang: 'cpp', code: `// T(n) = T(n-1) + 1  -> O(n)
int sumTo(int n) { return n == 0 ? 0 : n + sumTo(n - 1); }

// T(n) = T(n/2) + 1  -> O(log n)
int countHalvings(int n) { return n <= 1 ? 0 : 1 + countHalvings(n / 2); }

// T(n) = 2T(n-1) + 1 -> O(2^n): count the calls to see the doubling
long long calls = 0;
void doubleTree(int n) {
    calls++;
    if (n == 0) return;
    doubleTree(n - 1);
    doubleTree(n - 1);
}

// T(n) = 2T(n/2) + n -> O(n log n): returns total "work" done
long long mergeWork(int n) {
    if (n <= 1) return 1;
    return mergeWork(n / 2) + mergeWork(n - n / 2) + n;   // two halves + linear merge
}

int main() {
    cout << sumTo(10) << '\\n';           // 55
    cout << countHalvings(1024) << '\\n'; // 10
    doubleTree(4);
    cout << calls << '\\n';               // 31 = 2^5 - 1 (levels n..0)
    cout << mergeWork(8) << '\\n';        // 32 = 8 * 3 (merges) + 8 (leaves)
}` }
      ] },
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
        code: { lang: 'java', code: `
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
          }`,
          alt: [
            { lang: 'python', run: true, code: `def search(a, lo, hi, x):
    if lo > hi:
        return -1                   # base: empty range
    mid = (lo + hi) // 2            # Python ints cannot overflow
    if a[mid] == x:
        return mid
    if a[mid] < x:
        return search(a, mid + 1, hi, x)   # ONE call on half
    return search(a, lo, mid - 1, x)


print(search([1, 3, 5, 7, 9, 11], 0, 5, 9))   # 4` },
            { lang: 'js', run: true, code: `function search(a, lo, hi, x) {
  if (lo > hi) return -1;                        // base: empty range
  const mid = lo + Math.floor((hi - lo) / 2);    // integer middle
  if (a[mid] === x) return mid;
  if (a[mid] < x) return search(a, mid + 1, hi, x); // ONE call on half
  return search(a, lo, mid - 1, x);
}
console.log(search([1, 3, 5, 7, 9, 11], 0, 5, 9)); // 4` },
            { lang: 'cpp', code: `int search(const vector<int>& a, int lo, int hi, int x) {
    if (lo > hi) return -1;                          // base: empty range
    int mid = lo + (hi - lo) / 2;                    // overflow-safe middle
    if (a[mid] == x) return mid;
    if (a[mid] < x) return search(a, mid + 1, hi, x); // ONE call on half
    return search(a, lo, mid - 1, x);
}
int main() {
    cout << search({1, 3, 5, 7, 9, 11}, 0, 5, 9) << '\\n';   // 4
}` }
          ] }
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
        constraints: `0 ≤ n ≤ 90 (F(90) ≈ 2.9 × 10<sup>18</sup> fits in a signed 64-bit integer; in JavaScript use <code>BigInt</code>, since F(79) is already past 2<sup>53</sup>)`,
        example: `<p>Input <b>n = 6</b> → Output ${H.c('p', '<b>8</b>')}</p>
          ${H.arr([0, 1, 1, 2, 3, 5, 8], { label: 'F', hl: { 6: 'p', 4: 'g', 5: 'g' } })}
          <p>Why: F(6) = F(5) + F(4) = 5 + 3 = 8. The naive tree for n = 6 makes 25 calls; F(2) alone is recomputed 5 times.</p>`,
        brute: {
          why: `<p>Direct translation of the definition: two calls per frame, each shrinking by only 1 or 2 → about 1.618<sup>n</sup> calls. n = 50 is already ~4·10<sup>10</sup> calls (tens of seconds to minutes); n = 90 would take longer than a human lifetime. The wasted work: identical subtrees like F(n − 2) are rebuilt from scratch on both sides of the tree.</p>`,
          code: {
          lang: 'java',
          code: `
            long fibNaive(int n) {
                if (n <= 1) return n;                       // F(0) = 0, F(1) = 1
                return fibNaive(n - 1) + fibNaive(n - 2);   // two calls -> exponential
            }`,
          alt: [
            { lang: 'python', code: `def fib(n):
    if n <= 1:
        return n                              # F(0) = 0, F(1) = 1
    return fib(n - 1) + fib(n - 2)            # two calls -> exponential` },
            { lang: 'js', code: `function fib(n) {
  if (n <= 1) return n;                        // F(0) = 0, F(1) = 1
  return fib(n - 1) + fib(n - 2);              // two calls -> exponential
}` },
            { lang: 'cpp', code: `long long fib(int n) {
    if (n <= 1) return n;                       // F(0) = 0, F(1) = 1
    return fib(n - 1) + fib(n - 2);             // two calls -> exponential
}` }
          ]
        }
        },
        mcq: {
          q: `In the recursion tree of naive fib(n), how many <b>distinct</b> arguments ever appear?`,
          options: ['About 2<sup>n</sup>', 'n + 1 (the values 0..n)', 'n<sup>2</sup>', 'log n'],
          answer: 1,
          explain: `Every call has an argument between 0 and n, so only n + 1 distinct sub-problems exist; the exponential count comes purely from repeating them. Cache each one once → O(n).`
        },
        hints: [
          `<p><b>Aha:</b> the tree has exponentially many nodes but only n + 1 different labels (fib(0)..fib(n)). Repeated labels = repeated work.</p>`,
          `<p>Keep a memo array of size n + 1 filled with −1 (or a hash map: <code>dict</code> / <code>Map</code>; in Python <code>@lru_cache</code> does it for you). Before computing fib(k), check memo[k]; after computing, store it. Or drop recursion and loop with two variables.</p>`,
          `<p>Traps: use a 64-bit integer (F(47) overflows a 32-bit <code>int</code>; JavaScript needs <code>BigInt</code>); handle n = 0 and n = 1; do not use 0 as "not computed" since F(0) = 0. Recipe: if k ≤ 1 return k; if memo[k] != −1 return it; memo[k] = f(k−1) + f(k−2); return memo[k].</p>`
        ],
        tests: { sig: 'int -> long', fn: 'fib', cases: [
          [[0],0],
          [[1],1],
          [[2],1],
          [[6],8],
          [[10],55],
          [[47],2971215073],
          [[50],12586269025],
          [[90],"2880067194370816120"]
        ] },
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
          alt: [
            { lang: 'python', code: `from functools import lru_cache


def fib(n: int) -> int:
    @lru_cache(maxsize=None)        # memo: each k is computed once
    def go(k: int) -> int:
        return k if k <= 1 else go(k - 1) + go(k - 2)

    return go(n)` },
            { lang: 'js', code: `function fib(n) {
  const memo = new Map();                // k -> F(k) as BigInt (F(90) > 2^53)
  const go = (k) => {
    if (k <= 1) return BigInt(k);
    if (memo.has(k)) return memo.get(k);
    const v = go(k - 1) + go(k - 2);
    memo.set(k, v);
    return v;
  };
  return go(n);
}` },
            { lang: 'cpp', code: `class Solution {
public:
    long long fib(int n) {
        vector<long long> memo(n + 1, -1);    // -1 = not computed yet
        return go(n, memo);
    }
private:
    long long go(int k, vector<long long>& memo) {
        if (k <= 1) return k;
        if (memo[k] != -1) return memo[k];
        return memo[k] = go(k - 1, memo) + go(k - 2, memo);
    }
};` }
          ],
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
      '"Find the <b>minimum number of moves</b>" → answer is 2<sup>n</sup> − 1 (use 64-bit math: <code>(1L &lt;&lt; n) - 1</code> in Java, <code>(1LL &lt;&lt; n) - 1</code> in C++, <code>2 ** n - 1</code> in Python, <code>2n ** BigInt(n) - 1n</code> in JavaScript once n in JavaScript once n &gt; 53)gt; 53).',
      '"<b>Print all the moves</b>" with N ≤ 16–20 → recursive 3-step plan; output size itself is 2<sup>n</sup> − 1.',
      'Any problem where "to do the big thing I first move everything above it out of the way" → same 3-step recursion.'
    ],
    viz: {
      title: 'Tower of Hanoi moves on three pegs',
      input: '3',
      inputLabel: 'number of disks (1-6)',
      gen: genHanoi
    },
    code: { lang: 'java', code: `
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
      alt: [
        { lang: 'python', run: true, code: `moves = 0


def hanoi(n, frm, to, via):
    # Move n disks from 'frm' to 'to' using 'via' as the helper peg.
    global moves
    if n == 0:
        return                      # base case: nothing to move
    hanoi(n - 1, frm, via, to)      # 1) park n-1 disks on the helper
    moves += 1
    print(f"disk {n}: {frm} -> {to}")   # 2) biggest disk
    hanoi(n - 1, via, to, frm)      # 3) bring n-1 disks on top of it


hanoi(3, "A", "C", "B")
print(f"moves = {moves} (2^3 - 1 = {(1 << 3) - 1})")` },
        { lang: 'js', run: true, code: `let moves = 0;

// Move n disks from 'from' to 'to' using 'via' as the helper peg.
function hanoi(n, from, to, via) {
  if (n === 0) return;                   // base case: nothing to move
  hanoi(n - 1, from, via, to);           // 1) park n-1 disks on the helper
  moves++;
  console.log(\`disk \${n}: \${from} -> \${to}\`);   // 2) biggest disk
  hanoi(n - 1, via, to, from);           // 3) bring n-1 disks on top of it
}

hanoi(3, 'A', 'C', 'B');
console.log(\`moves = \${moves} (2^3 - 1 = \${2 ** 3 - 1})\`);` },
        { lang: 'cpp', code: `long long moves = 0;

// Move n disks from 'from' to 'to' using 'via' as the helper peg.
void hanoi(int n, char from, char to, char via) {
    if (n == 0) return;                  // base case: nothing to move
    hanoi(n - 1, from, via, to);         // 1) park n-1 disks on the helper
    moves++;
    cout << "disk " << n << ": " << from << " -> " << to << '\\n';   // 2) biggest disk
    hanoi(n - 1, via, to, from);         // 3) bring n-1 disks on top of it
}

int main() {
    hanoi(3, 'A', 'C', 'B');
    cout << "moves = " << moves << " (2^3 - 1 = " << ((1LL << 3) - 1) << ")\\n";
}` }
      ] },
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
        code: { lang: 'java', code: `
          class WhichDisk {
              public static void main(String[] args) {
                  for (int k = 1; k <= 7; k++) {
                      int disk = Integer.numberOfTrailingZeros(k) + 1;   // ruler sequence
                      System.out.print(disk + " ");                     // 1 2 1 3 1 2 1
                  }
              }
          }`,
          alt: [
            { lang: 'python', run: true, code: `for k in range(1, 8):
    disk = (k & -k).bit_length()    # 1 + trailing zero bits of k: the ruler sequence
    print(disk, end=" ")            # 1 2 1 3 1 2 1
print()` },
            { lang: 'js', run: true, code: `const disks = [];
for (let k = 1; k <= 7; k++) {
  const disk = 32 - Math.clz32(k & -k);  // 1 + trailing zero bits of k: the ruler sequence
  disks.push(disk);
}
console.log(disks.join(' '));            // 1 2 1 3 1 2 1` },
            { lang: 'cpp', code: `int main() {
    for (unsigned k = 1; k <= 7; k++) {
        int disk = countr_zero(k) + 1;   // C++20 <bit>: trailing zeros -> ruler sequence
        cout << disk << ' ';             // 1 2 1 3 1 2 1
    }
    cout << '\\n';
}` }
          ] }
      },
      {
        title: 'Iterative Hanoi (for when recursion is banned)',
        html: `<p>For an <b>odd</b> n, the smallest disk cycles A → C → B → A …; for <b>even</b> n it cycles A → B → C → A …. Between its moves, make the only legal move that does not involve the smallest disk. This produces the same optimal 2<sup>n</sup> − 1 moves with an explicit loop — a nice answer to "can you do it without recursion?".</p>`
      },
      {
        title: 'Counting moves for big n without printing',
        html: `<p>"How many moves for n = 40?" Do not simulate — use the closed form <code>(1L &lt;&lt; n) - 1</code> = 1,099,511,627,775. For n ≥ 63 even a <code>long</code> overflows (2<sup>63</sup> − 1 is the max), so use <code>BigInteger.ONE.shiftLeft(n).subtract(BigInteger.ONE)</code> in Java (Python ints and JavaScript <code>BigInt</code> handle it directly; C++ needs <code>unsigned __int128</code> or a big-number library). Recognising "the output is exponential" tells you the interviewer wants the formula, not the list.</p>`
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
        statement: `<p>There are <code>N</code> disks of different sizes stacked on rod <b>A</b> (largest at the bottom). Move the entire stack to rod <b>C</b> using rod <b>B</b> as a helper. Only one disk can move at a time, and a disk can never be placed on a smaller disk. Return the list of moves in order, formatted like <code>"move disk 1 from A to C"</code>. The total number of moves is the length of that list.</p>`,
        constraints: `1 ≤ N ≤ 16 (the output itself has 2<sup>N</sup> − 1 lines)`,
        example: `<p>Input: <b>N = 2</b> → Output (3 moves):</p>
          ${H.table(['#', 'move'], [['1', 'move disk 1 from A to ' + H.c('y', 'B')], ['2', H.c('p', 'move disk 2 from A to C')], ['3', 'move disk 1 from B to C']])}
          <p>Why: disk 1 must get out of the way (to B) so disk 2 can go to C, then disk 1 sits on top of it. 2<sup>2</sup> − 1 = 3.</p>`,
        brute: {
          why: `<p>Without the recursive insight you might search the <b>state space</b>: every disk can be on 3 rods → 3<sup>N</sup> possible arrangements, and a BFS finds the shortest path between them. That works but explores 3<sup>N</sup> states (43 million for N = 16) and needs that much memory, while the recursion goes <b>straight</b> to the optimal 2<sup>N</sup> − 1 moves with only N frames of memory.</p>`,
          code: {
          lang: 'java',
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
            }`,
          alt: [
            { lang: 'python', code: `from collections import deque

def bfs_min_moves(n):
    total = 3 ** n                                  # 3^n states
    pw = [3 ** i for i in range(n)]
    dist = [-1] * total
    # state digit d (base 3) = rod of disk d; disk 0 is the smallest. Start: all on rod 0.
    goal = total - 1                                # all digits = 2 -> all on rod C
    q = deque([0])
    dist[0] = 0
    while q:
        s = q.popleft()
        if s == goal:
            return dist[s]
        top = [-1, -1, -1]                          # smallest disk on each rod
        for d in range(n):
            rod = (s // pw[d]) % 3
            if top[rod] == -1:
                top[rod] = d
        for p in range(3):
            if top[p] == -1:
                continue
            for r in range(3):
                if r == p:
                    continue
                if top[r] != -1 and top[r] < top[p]:
                    continue                        # cannot put bigger on smaller
                ns = s + (r - p) * pw[top[p]]
                if dist[ns] == -1:
                    dist[ns] = dist[s] + 1
                    q.append(ns)
    return -1` },
            { lang: 'js', code: `function bfsMinMoves(n) {
  let total = 1;
  for (let i = 0; i < n; i++) total *= 3;           // 3^n states
  const pw = new Array(n);
  pw[0] = 1;
  for (let i = 1; i < n; i++) pw[i] = pw[i - 1] * 3;
  const dist = new Array(total).fill(-1);
  // state digit d (base 3) = rod of disk d; disk 0 is the smallest. Start: all on rod 0.
  const goal = total - 1;                           // all digits = 2 -> all on rod C
  const q = [0];
  dist[0] = 0;
  for (let head = 0; head < q.length; head++) {
    const s = q[head];
    if (s === goal) return dist[s];
    const top = [-1, -1, -1];                       // smallest disk on each rod
    for (let d = 0; d < n; d++) {
      const rod = Math.floor(s / pw[d]) % 3;
      if (top[rod] === -1) top[rod] = d;
    }
    for (let p = 0; p < 3; p++) {
      if (top[p] === -1) continue;
      for (let r = 0; r < 3; r++) {
        if (r === p) continue;
        if (top[r] !== -1 && top[r] < top[p]) continue; // cannot put bigger on smaller
        const ns = s + (r - p) * pw[top[p]];
        if (dist[ns] === -1) {
          dist[ns] = dist[s] + 1;
          q.push(ns);
        }
      }
    }
  }
  return -1;
}` },
            { lang: 'cpp', code: `int bfsMinMoves(int n) {
    int total = 1;
    for (int i = 0; i < n; i++) total *= 3;         // 3^n states
    vector<int> pw(n);
    pw[0] = 1;
    for (int i = 1; i < n; i++) pw[i] = pw[i - 1] * 3;
    vector<int> dist(total, -1);
    // state digit d (base 3) = rod of disk d; disk 0 is the smallest. Start: all on rod 0.
    int goal = total - 1;                           // all digits = 2 -> all on rod C
    queue<int> q;
    dist[0] = 0;
    q.push(0);
    while (!q.empty()) {
        int s = q.front(); q.pop();
        if (s == goal) return dist[s];
        int top[3] = {-1, -1, -1};                  // smallest disk on each rod
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
                    q.push(ns);
                }
            }
        }
    }
    return -1;
}` }
          ]
        }
        },
        mcq: {
          q: `You must move 5 disks A → C. Just before the <b>biggest</b> disk (disk 5) moves, where are disks 1–4?`,
          options: ['On rod A under disk 5', 'All on rod B, correctly stacked', 'Spread across B and C', 'All on rod C'],
          answer: 1,
          explain: `Disk 5 can only move if nothing is on top of it AND the target rod C is empty (anything on C would be smaller). So all 4 smaller disks must be stacked on the helper rod B — that is exactly step 1, "move n − 1 disks A → B".`
        },
        hints: [
          `<p><b>Aha:</b> the biggest disk is "invisible" to the smaller ones (anything can sit on it). So: move n − 1 out of the way, move the biggest, move n − 1 back on top. Moves(n) = 2·Moves(n − 1) + 1.</p>`,
          `<p>Write <code>solve(n, from, to, via, list)</code>. The two recursive calls just <b>rotate the roles</b> of the rods: first <code>(n−1, from, via, to)</code>, then <code>(n−1, via, to, from)</code>. Collect the moves in one shared list of strings.</p>`,
          `<p>Traps: do not mix up the rod order in the second call; count with a 64-bit integer if N can be large (2<sup>63</sup>); base case n == 0 → return (or n == 1 → one move). Recipe: if n == 0 return; solve(n−1, from, via, to); add "move disk n from → to"; solve(n−1, via, to, from).</p>`
        ],
        tests: { sig: 'int -> list<string>', fn: 'hanoi', check: "(a, out, exp) => { if (!Array.isArray(out) || out.length !== exp) return false; const pegs = { A: [], B: [], C: [] }; for (let d = a[0]; d >= 1; d--) pegs.A.push(d); for (const m of out) { const w = String(m).split(' '); if (w.length !== 7 || w[0] !== 'move' || w[1] !== 'disk' || w[3] !== 'from' || w[5] !== 'to') return false; const d = +w[2], f = pegs[w[4]], g = pegs[w[6]]; if (!f || !g || f === g || f[f.length - 1] !== d || (g.length && g[g.length - 1] < d)) return false; g.push(f.pop()); } return pegs.C.length === a[0]; }", cases: [
          [[1],1],
          [[2],3],
          [[3],7],
          [[4],15],
          [[7],127],
          [[10],1023],
          [[16],65535]
        ] },
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
          alt: [
            { lang: 'python', code: `def hanoi(n: int) -> list[str]:
    moves = []

    def solve(k: int, frm: str, to: str, via: str) -> None:
        if k == 0:
            return                              # nothing to move
        solve(k - 1, frm, via, to)              # 1) park k-1 disks on the helper
        moves.append(f"move disk {k} from {frm} to {to}")   # 2) biggest disk
        solve(k - 1, via, to, frm)              # 3) bring them back on top

    solve(n, "A", "C", "B")
    return moves                                # len(moves) == 2**n - 1` },
            { lang: 'js', code: `function hanoi(n) {
  const moves = [];
  const solve = (k, from, to, via) => {
    if (k === 0) return;                 // nothing to move
    solve(k - 1, from, via, to);         // 1) park k-1 disks on the helper
    moves.push(\`move disk \${k} from \${from} to \${to}\`);   // 2) biggest disk
    solve(k - 1, via, to, from);         // 3) bring them back on top
  };
  solve(n, 'A', 'C', 'B');
  return moves;                          // moves.length === 2^n - 1
}` },
            { lang: 'cpp', code: `class Solution {
public:
    vector<string> hanoi(int n) {
        vector<string> moves;
        solve(n, 'A', 'C', 'B', moves);
        return moves;                         // moves.size() == 2^n - 1
    }
private:
    void solve(int n, char from, char to, char via, vector<string>& moves) {
        if (n == 0) return;                   // nothing to move
        solve(n - 1, from, via, to, moves);   // 1) park n-1 disks on the helper
        moves.push_back("move disk " + to_string(n) + " from " + from + " to " + to);
        solve(n - 1, via, to, from, moves);   // 3) bring them back on top
    }
};` }
          ],
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
      <p>Tiny example — all binary strings of length 2. The <b>same</b> builder (a Java <code>StringBuilder</code>, a Python list of characters, a JavaScript array, a C++ <code>string</code>) is reused, so un-choosing is essential:</p>
      ${H.table(['step', 'action', 'sb'], [
        ['1', 'choose 0', '"0"'], ['2', 'choose 0', H.c('g', '"00" → save')], ['3', 'un-choose', '"0"'], ['4', 'choose 1', H.c('g', '"01" → save')], ['5', 'un-choose, un-choose', '""'],
        ['6', 'choose 1', '"1"'], ['7', 'choose 0', H.c('g', '"10" → save')], ['8', 'un-choose', '"1"'], ['9', 'choose 1', H.c('g', '"11" → save')]
      ])}
      <h4>Two golden rules</h4>
      <ul>
        <li><b>Save a copy</b>: <code>res.add(new ArrayList&lt;&gt;(cur))</code> in Java, <code>res.append(cur[:])</code> in Python, <code>res.push([...cur])</code> in JavaScript (C++ <code>res.push_back(cur)</code> already copies the vector). Adding <code>cur</code> itself stores a <i>reference</i> to a list you keep changing — at the end every saved entry would be the same (empty) list.</li>
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
    code: { lang: 'java', code: `
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
      alt: [
        { lang: 'python', run: true, code: `res = []


def backtrack(n, sb):
    if len(sb) == n:                # GOAL: complete answer
        res.append("".join(sb))     # save a COPY (join makes a new string)
        return
    for ch in "01":                 # CHOICES at this level
        sb.append(ch)               # CHOOSE
        backtrack(n, sb)            # EXPLORE
        sb.pop()                    # UN-CHOOSE (undo exactly the append)


backtrack(3, [])
print(res)                          # ['000', '001', '010', '011', '100', '101', '110', '111']` },
        { lang: 'js', run: true, code: `const res = [];

function backtrack(n, sb) {
  if (sb.length === n) {                 // GOAL: complete answer
    res.push(sb.join(''));               // save a COPY (join makes a new string)
    return;
  }
  for (const ch of ['0', '1']) {         // CHOICES at this level
    sb.push(ch);                         // CHOOSE
    backtrack(n, sb);                    // EXPLORE
    sb.pop();                            // UN-CHOOSE (undo exactly the push)
  }
}

backtrack(3, []);
console.log(res.join(', '));             // 000, 001, 010, 011, 100, 101, 110, 111` },
        { lang: 'cpp', code: `vector<string> res;

void backtrack(int n, string& sb) {
    if ((int)sb.size() == n) {           // GOAL: complete answer
        res.push_back(sb);               // push_back copies the string
        return;
    }
    for (char ch = '0'; ch <= '1'; ch++) {   // CHOICES at this level
        sb.push_back(ch);                // CHOOSE
        backtrack(n, sb);                // EXPLORE
        sb.pop_back();                   // UN-CHOOSE (undo exactly the push)
    }
}

int main() {
    string sb;
    backtrack(3, sb);
    for (const string& s : res) cout << s << ' ';   // 000 001 010 011 100 101 110 111
    cout << '\\n';
}` }
      ] },
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
          <p>With a <code>StringBuilder</code>, <code>sb.toString()</code> already makes a new String, so it is safe (so do <code>"".join(sb)</code> in Python and <code>sb.join('')</code> in JavaScript). With an <code>int[]</code> path, use <code>path.clone()</code> or <code>Arrays.copyOf</code>.</p>`
      },
      {
        title: 'Undo must mirror do — four flavours',
        html: `${H.table(['CHOOSE', 'UN-CHOOSE'], [['cur.add(x)', 'cur.remove(cur.size() - 1)'], ['sb.append(c)', 'sb.deleteCharAt(sb.length() - 1) or sb.setLength(len)'], ['used[i] = true', 'used[i] = false'], ['board[r][c] = \'Q\'; cols[c] = true', 'board[r][c] = \'.\'; cols[c] = false'], ['swap(a, i, j)', 'swap(a, i, j) again']])}
          <p>Trick: you can skip un-choose entirely if you pass <b>new immutable state</b> to each call (e.g. <code>s + "("</code> makes a new String). It is simpler but allocates a new object per call — fine for short strings, wasteful for long lists.</p>`
      },
      {
        title: 'Letter Combinations of a Phone Number — template with a map of choices',
        html: `<p>Digits "23" → 2 = abc, 3 = def. Level i = digit i; choices = the letters of that digit. 3 × 3 = 9 strings: ad, ae, af, bd, be, bf, cd, ce, cf. State = (index, StringBuilder). Goal = index == digits.length().</p>`,
        code: { lang: 'java', code: `
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
          }`,
          alt: [
            { lang: 'python', run: true, code: `KEYS = ["", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"]


def bt(digits, i, sb, res):
    if i == len(digits):            # goal
        res.append("".join(sb))
        return
    for ch in KEYS[int(digits[i])]: # choices
        sb.append(ch)               # choose
        bt(digits, i + 1, sb, res)  # explore
        sb.pop()                    # un-choose


res = []
bt("23", 0, [], res)
print(res)                          # ['ad', 'ae', 'af', 'bd', 'be', 'bf', 'cd', 'ce', 'cf']` },
            { lang: 'js', run: true, code: `const KEYS = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];

function bt(digits, i, sb, res) {
  if (i === digits.length) { res.push(sb.join('')); return; }   // goal
  for (const ch of KEYS[Number(digits[i])]) {                   // choices
    sb.push(ch);                         // choose
    bt(digits, i + 1, sb, res);          // explore
    sb.pop();                            // un-choose
  }
}

const res = [];
bt('23', 0, [], res);
console.log(res.join(', '));             // ad, ae, af, bd, be, bf, cd, ce, cf` },
            { lang: 'cpp', code: `const vector<string> KEYS = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};

void bt(const string& digits, int i, string& sb, vector<string>& res) {
    if (i == (int)digits.size()) { res.push_back(sb); return; }   // goal
    for (char ch : KEYS[digits[i] - '0']) {                      // choices
        sb.push_back(ch);                // choose
        bt(digits, i + 1, sb, res);      // explore
        sb.pop_back();                   // un-choose
    }
}

int main() {
    vector<string> res;
    string sb;
    bt("23", 0, sb, res);
    for (const string& s : res) cout << s << ' ';   // ad ae af bd be bf cd ce cf
    cout << '\\n';
}` }
          ] }
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
          code: {
          lang: 'java',
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
            }`,
          alt: [
            { lang: 'python', code: `def generate_parenthesis(n):
    res = []
    for mask in range(1 << (2 * n)):
        sb = []
        bal = 0
        ok = True
        for i in range(2 * n):
            is_open = ((mask >> i) & 1) == 1
            sb.append('(' if is_open else ')')
            bal += 1 if is_open else -1
            if bal < 0:
                ok = False             # a ')' with no partner
        if ok and bal == 0:
            res.append("".join(sb))
    return res` },
            { lang: 'js', code: `function generateParenthesis(n) {
  const res = [];
  for (let mask = 0; mask < (1 << (2 * n)); mask++) {
    let sb = "";
    let bal = 0;
    let ok = true;
    for (let i = 0; i < 2 * n; i++) {
      const open = ((mask >> i) & 1) === 1;
      sb += open ? '(' : ')';
      bal += open ? 1 : -1;
      if (bal < 0) ok = false;      // a ')' with no partner
    }
    if (ok && bal === 0) res.push(sb);
  }
  return res;
}` },
            { lang: 'cpp', code: `vector<string> generateParenthesis(int n) {
    vector<string> res;
    for (int mask = 0; mask < (1 << (2 * n)); mask++) {
        string sb;
        int bal = 0;
        bool ok = true;
        for (int i = 0; i < 2 * n; i++) {
            bool open = ((mask >> i) & 1) == 1;
            sb += open ? '(' : ')';
            bal += open ? 1 : -1;
            if (bal < 0) ok = false;      // a ')' with no partner
        }
        if (ok && bal == 0) res.push_back(sb);
    }
    return res;
}` }
          ]
        }
        },
        mcq: {
          q: `Partial string "(()" with n = 3. Which next characters keep it fixable?`,
          options: ['Only "("', 'Only ")"', 'Both "(" and ")"', 'Neither — it is already invalid'],
          answer: 2,
          explain: `open = 2 &lt; 3 so "(" is allowed; close = 1 &lt; open = 2 so ")" is allowed too. Both branches can still lead to valid strings.`
        },
        hints: [
          `<p><b>Aha:</b> a prefix stays fixable exactly when <code>open ≤ n</code> and <code>close ≤ open</code>. So never generate a prefix that breaks either rule.</p>`,
          `<p>Backtrack with (a shared builder sb, open, close). Two choices per level: add "(" if open &lt; n; add ")" if close &lt; open.</p>`,
          `<p>Edge cases: the goal is length 2n (then close == open == n automatically). Remember to delete the last char after each recursive call. Recipe: if len == 2n save; if open &lt; n {append '('; bt(open+1); delete} if close &lt; open {append ')'; bt(close+1); delete}.</p>`
        ],
        tests: { sig: 'int -> list<string>', fn: 'generateParenthesis', check: "(a, out, exp) => { if (!Array.isArray(out)) return false; const ok = (s) => { if (typeof s !== 'string' || s.length !== 2 * a[0]) return false; let b = 0; for (const ch of s) { if (ch === '(') b++; else if (ch === ')') b--; else return false; if (b < 0) return false; } return b === 0; }; if (new Set(out).size !== out.length || !out.every(ok)) return false; return Array.isArray(exp) ? out.length === exp.length && exp.every((s) => out.includes(s)) : out.length === exp; }", cases: [
          [[1],["()"]],
          [[2],["(())","()()"]],
          [[3],["((()))","(()())","(())()","()(())","()()()"]],
          [[4],["(((())))","((()()))","((())())","((()))()","(()(()))","(()()())","(()())()","(())(())","(())()()","()((()))","()(()())","()(())()","()()(())","()()()()"]],
          [[6],132],
          [[8],1430]
        ] },
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
          alt: [
            { lang: 'python', code: `def generate_parenthesis(n: int) -> list[str]:
    res, sb = [], []                    # sb: one shared list of characters

    def bt(open_: int, close: int) -> None:
        if len(sb) == 2 * n:
            res.append("".join(sb))     # join makes a fresh string
            return
        if open_ < n:                   # a '(' is still available
            sb.append("(")
            bt(open_ + 1, close)
            sb.pop()                    # un-choose
        if close < open_:               # a ')' has a partner to close
            sb.append(")")
            bt(open_, close + 1)
            sb.pop()

    bt(0, 0)
    return res` },
            { lang: 'js', code: `function generateParenthesis(n) {
  const res = [], sb = [];               // sb: one shared array of characters
  const bt = (open, close) => {
    if (sb.length === 2 * n) { res.push(sb.join('')); return; }
    if (open < n) { sb.push('('); bt(open + 1, close); sb.pop(); }
    if (close < open) { sb.push(')'); bt(open, close + 1); sb.pop(); }
  };
  bt(0, 0);
  return res;
}` },
            { lang: 'cpp', code: `class Solution {
public:
    vector<string> generateParenthesis(int n) {
        vector<string> res;
        string sb;
        bt(n, 0, 0, sb, res);
        return res;
    }
private:
    void bt(int n, int open, int close, string& sb, vector<string>& res) {
        if ((int)sb.size() == 2 * n) { res.push_back(sb); return; }   // push_back copies
        if (open < n) { sb.push_back('('); bt(n, open + 1, close, sb, res); sb.pop_back(); }
        if (close < open) { sb.push_back(')'); bt(n, open, close + 1, sb, res); sb.pop_back(); }
    }
};` }
          ],
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
    code: [{ lang: 'java', code: `
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
      }`,
      alt: [
        { lang: 'python', run: true, code: `def pick_not_pick(nums, i, cur, res):        # style 1: answers at the leaves
    if i == len(nums):
        res.append(cur[:])                   # copy!
        return
    cur.append(nums[i])                      # pick
    pick_not_pick(nums, i + 1, cur, res)
    cur.pop()                                # un-pick
    pick_not_pick(nums, i + 1, cur, res)     # not pick


def loop_style(nums, start, cur, res):       # style 2: every node is an answer
    res.append(cur[:])
    for j in range(start, len(nums)):
        cur.append(nums[j])
        loop_style(nums, j + 1, cur, res)
        cur.pop()


def bitmask(nums):                           # style 3: no recursion
    n = len(nums)
    return [[nums[j] for j in range(n) if mask >> j & 1] for mask in range(1 << n)]


a = [1, 2, 3]
r1, r2 = [], []
pick_not_pick(a, 0, [], r1)
loop_style(a, 0, [], r2)
print(r1)          # [[1, 2, 3], [1, 2], [1, 3], [1], [2, 3], [2], [3], []]
print(r2)          # [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]
print(bitmask(a))` },
        { lang: 'js', run: true, code: `// Style 1: pick / not-pick (answers at the leaves)
function pickNotPick(nums, i, cur, res) {
  if (i === nums.length) { res.push([...cur]); return; }   // copy!
  cur.push(nums[i]);                     // pick
  pickNotPick(nums, i + 1, cur, res);
  cur.pop();                             // un-pick
  pickNotPick(nums, i + 1, cur, res);    // not pick
}

// Style 2: for-loop (every node is an answer)
function loopStyle(nums, start, cur, res) {
  res.push([...cur]);
  for (let j = start; j < nums.length; j++) {
    cur.push(nums[j]);
    loopStyle(nums, j + 1, cur, res);
    cur.pop();
  }
}

// Style 3: bitmask (no recursion)
function bitmask(nums) {
  const res = [];
  for (let mask = 0; mask < 1 << nums.length; mask++) {
    res.push(nums.filter((_, j) => (mask >> j) & 1));   // bit j on -> pick nums[j]
  }
  return res;
}

const a = [1, 2, 3], r1 = [], r2 = [];
pickNotPick(a, 0, [], r1);
loopStyle(a, 0, [], r2);
console.log(JSON.stringify(r1));   // [[1,2,3],[1,2],[1,3],[1],[2,3],[2],[3],[]]
console.log(JSON.stringify(r2));   // [[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]]
console.log(JSON.stringify(bitmask(a)));` },
        { lang: 'cpp', code: `using VVI = vector<vector<int>>;

// Style 1: pick / not-pick (answers at the leaves)
void pickNotPick(const vector<int>& nums, int i, vector<int>& cur, VVI& res) {
    if (i == (int)nums.size()) { res.push_back(cur); return; }   // copy!
    cur.push_back(nums[i]);              // pick
    pickNotPick(nums, i + 1, cur, res);
    cur.pop_back();                      // un-pick
    pickNotPick(nums, i + 1, cur, res);  // not pick
}

// Style 2: for-loop (every node is an answer)
void loopStyle(const vector<int>& nums, int start, vector<int>& cur, VVI& res) {
    res.push_back(cur);
    for (int j = start; j < (int)nums.size(); j++) {
        cur.push_back(nums[j]);
        loopStyle(nums, j + 1, cur, res);
        cur.pop_back();
    }
}

// Style 3: bitmask (no recursion)
VVI bitmask(const vector<int>& nums) {
    int n = nums.size();
    VVI res;
    for (int mask = 0; mask < (1 << n); mask++) {
        vector<int> sub;
        for (int j = 0; j < n; j++)
            if (mask & (1 << j)) sub.push_back(nums[j]);   // bit j on -> pick nums[j]
        res.push_back(sub);
    }
    return res;
}

void print(const VVI& v) {
    for (const auto& s : v) {
        cout << '[';
        for (size_t i = 0; i < s.size(); i++) cout << (i ? "," : "") << s[i];
        cout << "] ";
    }
    cout << '\\n';
}

int main() {
    vector<int> a = {1, 2, 3}, cur;
    VVI r1, r2;
    pickNotPick(a, 0, cur, r1);
    loopStyle(a, 0, cur, r2);
    print(r1);   // [1,2,3] [1,2] [1,3] [1] [2,3] [2] [3] []
    print(r2);   // [] [1] [1,2] [1,2,3] [1,3] [2] [2,3] [3]
    print(bitmask(a));
}` }
      ] }],
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
        code: { lang: 'java', code: `
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
          }`,
          alt: [
            { lang: 'python', run: true, code: `def bt(a, start, cur, res):
    res.append(cur[:])                       # every node is an answer
    for j in range(start, len(a)):
        if j > start and a[j] == a[j - 1]:
            continue                         # same value at same level -> skip
        cur.append(a[j])
        bt(a, j + 1, cur, res)
        cur.pop()


a = sorted([2, 1, 2])                        # duplicates must be adjacent
res = []
bt(a, 0, [], res)
print(res)                                   # [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]` },
            { lang: 'js', run: true, code: `function bt(a, start, cur, res) {
  res.push([...cur]);                              // every node is an answer
  for (let j = start; j < a.length; j++) {
    if (j > start && a[j] === a[j - 1]) continue;  // same value at same level -> skip
    cur.push(a[j]);
    bt(a, j + 1, cur, res);
    cur.pop();
  }
}

const a = [2, 1, 2].sort((x, y) => x - y);         // duplicates must be adjacent
const res = [];
bt(a, 0, [], res);
console.log(JSON.stringify(res));                  // [[],[1],[1,2],[1,2,2],[2],[2,2]]` },
            { lang: 'cpp', code: `void bt(const vector<int>& a, int start, vector<int>& cur, vector<vector<int>>& res) {
    res.push_back(cur);                              // every node is an answer
    for (int j = start; j < (int)a.size(); j++) {
        if (j > start && a[j] == a[j - 1]) continue; // same value at same level -> skip
        cur.push_back(a[j]);
        bt(a, j + 1, cur, res);
        cur.pop_back();
    }
}

int main() {
    vector<int> a = {2, 1, 2}, cur;
    sort(a.begin(), a.end());                        // duplicates must be adjacent
    vector<vector<int>> res;
    bt(a, 0, cur, res);
    for (const auto& s : res) {
        cout << '[';
        for (size_t i = 0; i < s.size(); i++) cout << (i ? "," : "") << s[i];
        cout << "] ";                                // [] [1] [1,2] [1,2,2] [2] [2,2]
    }
    cout << '\\n';
}` }
          ] }
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
        code: { lang: 'java', code: `
          class CountK {
              static int count(int[] a, int i, int sum, int k) {
                  if (i == a.length) return sum == k ? 1 : 0;   // one finished subsequence
                  return count(a, i + 1, sum + a[i], k)         // pick a[i]
                       + count(a, i + 1, sum, k);               // skip a[i]
              }
              public static void main(String[] args) {
                  System.out.println(count(new int[]{1, 2, 1}, 0, 0, 2)); // 2
              }
          }`,
          alt: [
            { lang: 'python', run: true, code: `def count(a, i, total, k):
    if i == len(a):
        return 1 if total == k else 0        # one finished subsequence
    return count(a, i + 1, total + a[i], k) + count(a, i + 1, total, k)   # pick + skip


print(count([1, 2, 1], 0, 0, 2))             # 2` },
            { lang: 'js', run: true, code: `function count(a, i, sum, k) {
  if (i === a.length) return sum === k ? 1 : 0;    // one finished subsequence
  return count(a, i + 1, sum + a[i], k)            // pick a[i]
       + count(a, i + 1, sum, k);                  // skip a[i]
}
console.log(count([1, 2, 1], 0, 0, 2));            // 2` },
            { lang: 'cpp', code: `int countK(const vector<int>& a, int i, int sum, int k) {
    if (i == (int)a.size()) return sum == k ? 1 : 0; // one finished subsequence
    return countK(a, i + 1, sum + a[i], k)          // pick a[i]
         + countK(a, i + 1, sum, k);                // skip a[i]
}
int main() {
    cout << countK({1, 2, 1}, 0, 0, 2) << '\\n';     // 2
}` }
          ] }
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
          code: {
          lang: 'java',
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
            }`,
          alt: [
            { lang: 'python', code: `def subsets(nums):
    res = []
    n = len(nums)
    for mask in range(1 << n):               # 2^n masks
        sub = []
        for j in range(n):
            if (mask >> j) & 1 == 1:
                sub.append(nums[j])
        res.append(sub)
    return res` },
            { lang: 'js', code: `function subsets(nums) {
  const res = [];
  const n = nums.length;
  for (let mask = 0; mask < (1 << n); mask++) {   // 2^n masks
    const sub = [];
    for (let j = 0; j < n; j++) {
      if (((mask >> j) & 1) === 1) sub.push(nums[j]);
    }
    res.push(sub);
  }
  return res;
}` },
            { lang: 'cpp', code: `vector<vector<int>> subsets(vector<int>& nums) {
    vector<vector<int>> res;
    int n = nums.size();
    for (int mask = 0; mask < (1 << n); mask++) {   // 2^n masks
        vector<int> sub;
        for (int j = 0; j < n; j++) {
            if (((mask >> j) & 1) == 1) sub.push_back(nums[j]);
        }
        res.push_back(sub);
    }
    return res;
}` }
          ]
        }
        },
        mcq: {
          q: `In the pick/not-pick recursion, the code does <code>res.add(cur)</code> instead of <code>res.add(new ArrayList&lt;&gt;(cur))</code>. What does the result look like for [1,2]?`,
          options: ['[[1,2],[1],[2],[]] — correct', 'Four references to the same list, which is empty at the end: [[],[],[],[]]', 'Only [[1,2]]', 'A ConcurrentModificationException'],
          answer: 1,
          explain: `res stores 4 pointers to the <b>same</b> list object. Because every add is un-done by a remove, that list ends up empty, so all four entries print as []. Always save a copy.`
        },
        hints: [
          `<p><b>Aha:</b> every element faces one yes/no decision. n independent yes/no decisions = 2<sup>n</sup> outcomes = a binary decision tree whose leaves are the subsets.</p>`,
          `<p>Use one shared list <code>cur</code> (the bag so far) and an index <code>i</code> (which element we are deciding about). The result is a list of lists. Pick → add, recurse, remove; skip → recurse.</p>`,
          `<p>Traps: save a copy of cur (<code>new ArrayList&lt;&gt;(cur)</code>, <code>cur[:]</code>, <code>[...cur]</code>), not cur itself; remove the <b>last</b> element (<code>pop()</code> / <code>pop_back()</code>; in Java <code>cur.remove(cur.size() - 1)</code>, because <code>remove(Integer)</code> would remove by value); remember the empty subset. Recipe: f(i): if i == n → save copy, return; add nums[i]; f(i+1); remove last; f(i+1).</p>`
        ],
        tests: { sig: 'int[] -> list<list<int>>', fn: 'subsets', check: "(a, out, exp) => { if (!Array.isArray(out)) return false; const key = (s) => JSON.stringify([...s].sort((x, y) => x - y)); const keys = out.map(key); if (new Set(keys).size !== keys.length) return false; if (!out.every((s) => Array.isArray(s) && new Set(s).size === s.length && s.every((x) => a[0].includes(x)))) return false; if (!Array.isArray(exp)) return out.length === exp; const want = new Set(exp.map(key)); return keys.length === want.size && keys.every((x) => want.has(x)); }", cases: [
          [[[1,2,3]],[[],[1],[2],[3],[1,2],[1,3],[2,3],[1,2,3]]],
          [[[0]],[[],[0]]],
          [[[5,-3]],[[],[5],[-3],[5,-3]]],
          [[[-10,10,0,1]],[[],[-10],[10],[0],[1],[-10,10],[-10,0],[-10,1],[10,0],[10,1],[0,1],[-10,10,0],[-10,10,1],[-10,0,1],[10,0,1],[-10,10,0,1]]],
          [[[7,3,9]],[[],[7],[3],[9],[7,3],[7,9],[3,9],[7,3,9]]],
          [[[1,2,3,4,5,6,7,8,9,10]],1024]
        ] },
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
          alt: [
            { lang: 'python', code: `def subsets(nums: list[int]) -> list[list[int]]:
    res, cur = [], []

    def build(i: int) -> None:
        if i == len(nums):
            res.append(cur[:])          # save a COPY of the bag
            return
        cur.append(nums[i])             # pick nums[i]
        build(i + 1)
        cur.pop()                       # un-pick
        build(i + 1)                    # skip nums[i]

    build(0)
    return res` },
            { lang: 'js', code: `function subsets(nums) {
  const res = [], cur = [];
  const build = (i) => {
    if (i === nums.length) { res.push([...cur]); return; }   // save a COPY
    cur.push(nums[i]);                   // pick nums[i]
    build(i + 1);
    cur.pop();                           // un-pick
    build(i + 1);                        // skip nums[i]
  };
  build(0);
  return res;
}` },
            { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        vector<vector<int>> res;
        vector<int> cur;
        build(nums, 0, cur, res);
        return res;
    }
private:
    void build(const vector<int>& nums, int i, vector<int>& cur, vector<vector<int>>& res) {
        if (i == (int)nums.size()) { res.push_back(cur); return; }   // copy of the bag
        cur.push_back(nums[i]);               // pick
        build(nums, i + 1, cur, res);
        cur.pop_back();                       // un-pick
        build(nums, i + 1, cur, res);         // skip
    }
};` }
          ],
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
      <p>With the swap method, keep a small hash set per level: do not swap the same <b>value</b> into position i twice.</p>`,
    clues: [
      '"Return <b>all possible permutations</b>", "all <b>arrangements</b> / orderings", "all anagrams of a string".',
      '<b>N ≤ 8–10</b> → n! (40,320 – 3.6 million) is affordable; the constraint is telling you to enumerate.',
      '"Input may contain <b>duplicates</b>, return only <b>unique</b> permutations" → sort + skip rule (Permutations II).',
      '"Next permutation" / "k-th permutation" → do NOT enumerate; use the lexicographic algorithm or factorial number system.',
      '"Arrange so that adjacent elements satisfy …" (beautiful arrangement, squareful arrays) → permutation backtracking with a prune at each placement.'
    ],
    code: [{ lang: 'java', code: `
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
      }`,
      alt: [
        { lang: 'python', run: true, code: `def by_used(a, used, cur, res):              # method 1: used[] builds a fresh list
    if len(cur) == len(a):
        res.append(cur[:])
        return
    for i in range(len(a)):
        if used[i]:
            continue                         # already placed
        used[i] = True; cur.append(a[i])     # choose
        by_used(a, used, cur, res)           # explore
        used[i] = False; cur.pop()           # un-choose


def by_swap(a, i, res):                      # method 2: the list itself is the state
    if i == len(a):
        res.append(a[:])
        return
    for j in range(i, len(a)):
        a[i], a[j] = a[j], a[i]              # choose: put a[j] into slot i
        by_swap(a, i + 1, res)
        a[i], a[j] = a[j], a[i]              # un-choose: restore order


a = [1, 2, 3]
r1, r2 = [], []
by_used(a, [False] * 3, [], r1)
by_swap(a, 0, r2)
print(r1)   # [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]]
print(r2)   # [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 2, 1], [3, 1, 2]]` },
        { lang: 'js', run: true, code: `// Method 1: used[] -- builds a fresh array, lexicographic order on sorted input
function byUsed(a, used, cur, res) {
  if (cur.length === a.length) { res.push([...cur]); return; }
  for (let i = 0; i < a.length; i++) {
    if (used[i]) continue;                 // already placed
    used[i] = true; cur.push(a[i]);        // choose
    byUsed(a, used, cur, res);             // explore
    used[i] = false; cur.pop();            // un-choose
  }
}

// Method 2: swap -- the array itself is the state
function bySwap(a, i, res) {
  if (i === a.length) { res.push([...a]); return; }
  for (let j = i; j < a.length; j++) {
    [a[i], a[j]] = [a[j], a[i]];           // choose: put a[j] into slot i
    bySwap(a, i + 1, res);                 // explore the remaining slots
    [a[i], a[j]] = [a[j], a[i]];           // un-choose: restore order
  }
}

const a = [1, 2, 3], r1 = [], r2 = [];
byUsed(a, [false, false, false], [], r1);
bySwap(a, 0, r2);
console.log(JSON.stringify(r1)); // [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
console.log(JSON.stringify(r2)); // [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,2,1],[3,1,2]]` },
        { lang: 'cpp', code: `using VVI = vector<vector<int>>;

// Method 1: used[] -- builds a fresh vector, lexicographic order on sorted input
void byUsed(const vector<int>& a, vector<bool>& used, vector<int>& cur, VVI& res) {
    if (cur.size() == a.size()) { res.push_back(cur); return; }
    for (int i = 0; i < (int)a.size(); i++) {
        if (used[i]) continue;               // already placed
        used[i] = true; cur.push_back(a[i]); // choose
        byUsed(a, used, cur, res);           // explore
        used[i] = false; cur.pop_back();     // un-choose
    }
}

// Method 2: swap -- the vector itself is the state
void bySwap(vector<int>& a, int i, VVI& res) {
    if (i == (int)a.size()) { res.push_back(a); return; }
    for (int j = i; j < (int)a.size(); j++) {
        swap(a[i], a[j]);                    // choose: put a[j] into slot i
        bySwap(a, i + 1, res);               // explore the remaining slots
        swap(a[i], a[j]);                    // un-choose: restore order
    }
}

int main() {
    vector<int> a = {1, 2, 3}, cur;
    vector<bool> used(3, false);
    VVI r1, r2;
    byUsed(a, used, cur, r1);
    bySwap(a, 0, r2);
    for (const VVI* r : {&r1, &r2}) {
        for (const auto& p : *r) { for (int x : p) cout << x; cout << ' '; }
        cout << '\\n';    // 123 132 213 231 312 321  /  123 132 213 231 321 312
    }
}` }
      ] }],
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
        code: { lang: 'java', code: `
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
          }`,
          alt: [
            { lang: 'python', run: true, code: `from math import factorial


def get_permutation(n, k):
    nums = list(range(1, n + 1))
    k -= 1                                   # to 0-based
    out = []
    for i in range(n, 0, -1):
        block = factorial(i - 1)             # perms per choice of this digit
        idx, k = divmod(k, block)
        out.append(str(nums.pop(idx)))       # remove by index
    return "".join(out)


print(get_permutation(4, 9))                 # 2314` },
            { lang: 'js', run: true, code: `function getPermutation(n, k) {
  const nums = [], fact = [1];
  for (let i = 1; i <= n; i++) { nums.push(i); fact[i] = fact[i - 1] * i; }
  k--;                                     // to 0-based
  let out = '';
  for (let i = n; i >= 1; i--) {
    const block = fact[i - 1];             // perms per choice of this digit
    const idx = Math.floor(k / block);
    out += nums.splice(idx, 1)[0];         // remove by index
    k %= block;
  }
  return out;
}
console.log(getPermutation(4, 9));         // 2314` },
            { lang: 'cpp', code: `string getPermutation(int n, int k) {
    vector<int> nums, fact(n + 1, 1);
    for (int i = 1; i <= n; i++) { nums.push_back(i); fact[i] = fact[i - 1] * i; }
    k--;                                     // to 0-based
    string out;
    for (int i = n; i >= 1; i--) {
        int block = fact[i - 1];             // perms per choice of this digit
        int idx = k / block;
        out += char('0' + nums[idx]);
        nums.erase(nums.begin() + idx);      // remove by index
        k %= block;
    }
    return out;
}
int main() {
    cout << getPermutation(4, 9) << '\\n';    // 2314
}` }
          ] }
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
          code: {
          lang: 'java',
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
            }`,
          alt: [
            { lang: 'python', code: `def permute_unique(nums):
    seen = {}                    # a dict keeps insertion order, like LinkedHashSet
    gen(nums, 0, seen)
    return [list(p) for p in seen]


def gen(a, i, seen):
    if i == len(a):
        seen[tuple(a)] = True    # duplicates silently dropped
        return
    for j in range(i, len(a)):
        a[i], a[j] = a[j], a[i]
        gen(a, i + 1, seen)
        a[i], a[j] = a[j], a[i]` },
            { lang: 'js', code: `function permuteUnique(nums) {
  const seen = new Map();                  // keyed by the permutation's text; keeps insertion order
  gen(nums, 0, seen);
  return [...seen.values()];
}

function gen(a, i, seen) {
  if (i === a.length) {
    seen.set(a.join(","), a.slice());      // duplicates silently dropped
    return;
  }
  for (let j = i; j < a.length; j++) {
    [a[i], a[j]] = [a[j], a[i]];
    gen(a, i + 1, seen);
    [a[i], a[j]] = [a[j], a[i]];
  }
}` },
            { lang: 'cpp', code: `void gen(vector<int>& a, int i, set<vector<int>>& seen) {
    if (i == (int)a.size()) {
        seen.insert(a);                      // duplicates silently dropped
        return;
    }
    for (int j = i; j < (int)a.size(); j++) {
        swap(a[i], a[j]);
        gen(a, i + 1, seen);
        swap(a[i], a[j]);
    }
}

vector<vector<int>> permuteUnique(vector<int>& nums) {
    set<vector<int>> seen;
    gen(nums, 0, seen);
    return vector<vector<int>>(seen.begin(), seen.end());
}` }
          ]
        }
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
        tests: { sig: 'int[] -> list<list<int>>', fn: 'permuteUnique', check: "(a, out, exp) => { if (!Array.isArray(out)) return false; const k = (p) => JSON.stringify(p); const srt = (p) => JSON.stringify([...p].sort((x, y) => x - y)); const base = srt(a[0]); const keys = out.map(k); if (new Set(keys).size !== keys.length || !out.every((p) => Array.isArray(p) && srt(p) === base)) return false; if (!Array.isArray(exp)) return out.length === exp; const want = new Set(exp.map(k)); return keys.length === want.size && keys.every((x) => want.has(x)); }", cases: [
          [[[1,1,2]],[[1,1,2],[1,2,1],[2,1,1]]],
          [[[1,2,3]],[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]],
          [[[5]],[[5]]],
          [[[2,2,2,2]],[[2,2,2,2]]],
          [[[-1,0,-1,0]],[[-1,-1,0,0],[-1,0,-1,0],[-1,0,0,-1],[0,-1,-1,0],[0,-1,0,-1],[0,0,-1,-1]]],
          [[[1,1,1,1,1,1,1,2]],[[1,1,1,1,1,1,1,2],[1,1,1,1,1,1,2,1],[1,1,1,1,1,2,1,1],[1,1,1,1,2,1,1,1],[1,1,1,2,1,1,1,1],[1,1,2,1,1,1,1,1],[1,2,1,1,1,1,1,1],[2,1,1,1,1,1,1,1]]],
          [[[3,1,2,1]],[[1,1,2,3],[1,1,3,2],[1,2,1,3],[1,2,3,1],[1,3,1,2],[1,3,2,1],[2,1,1,3],[2,1,3,1],[2,3,1,1],[3,1,1,2],[3,1,2,1],[3,2,1,1]]],
          [[[10,-10,0,1,2,3,4,5]],40320]
        ] },
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
          alt: [
            { lang: 'python', code: `def permute_unique(nums: list[int]) -> list[list[int]]:
    a = sorted(nums)                    # equal values become neighbours
    res, cur, used = [], [], [False] * len(a)

    def bt() -> None:
        if len(cur) == len(a):
            res.append(cur[:])
            return
        for i, x in enumerate(a):
            if used[i] or (i > 0 and x == a[i - 1] and not used[i - 1]):
                continue                # used already, or a duplicate branch
            used[i] = True
            cur.append(x)               # choose
            bt()                        # explore
            cur.pop()                   # un-choose
            used[i] = False

    bt()
    return res` },
            { lang: 'js', code: `function permuteUnique(nums) {
  const a = [...nums].sort((x, y) => x - y);   // numeric comparator, not string order
  const used = new Array(a.length).fill(false), cur = [], res = [];
  const bt = () => {
    if (cur.length === a.length) { res.push([...cur]); return; }
    for (let i = 0; i < a.length; i++) {
      if (used[i]) continue;                                   // already in cur
      if (i > 0 && a[i] === a[i - 1] && !used[i - 1]) continue; // duplicate branch
      used[i] = true; cur.push(a[i]);    // choose
      bt();                              // explore
      cur.pop(); used[i] = false;        // un-choose
    }
  };
  bt();
  return res;
}` },
            { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> permuteUnique(vector<int>& nums) {
        sort(nums.begin(), nums.end());       // equal values become neighbours
        vector<vector<int>> res;
        vector<int> cur;
        vector<bool> used(nums.size(), false);
        bt(nums, used, cur, res);
        return res;
    }
private:
    void bt(const vector<int>& a, vector<bool>& used, vector<int>& cur, vector<vector<int>>& res) {
        if (cur.size() == a.size()) { res.push_back(cur); return; }
        for (int i = 0; i < (int)a.size(); i++) {
            if (used[i]) continue;
            if (i > 0 && a[i] == a[i - 1] && !used[i - 1]) continue;   // duplicate branch
            used[i] = true; cur.push_back(a[i]);        // choose
            bt(a, used, cur, res);                      // explore
            cur.pop_back(); used[i] = false;            // un-choose
        }
    }
};` }
          ],
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
    code: [{ lang: 'java', code: `
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
      }`,
      alt: [
        { lang: 'python', run: true, code: `def combination_sum(candidates, target):
    c = sorted(candidates)                   # enables the 'break' prune
    res, cur = [], []

    def bt(start, rem):
        if rem == 0:                         # goal: exact sum
            res.append(cur[:])
            return
        for i in range(start, len(c)):
            if c[i] > rem:
                break                        # sorted: everything after is too big
            cur.append(c[i])                 # choose c[i]
            bt(i, rem - c[i])                # i (not i + 1): reuse allowed
            cur.pop()                        # un-choose

    bt(0, target)
    return res


print(combination_sum([2, 3, 6, 7], 7))      # [[2, 2, 3], [7]]` },
        { lang: 'js', run: true, code: `function combinationSum(candidates, target) {
  const c = [...candidates].sort((x, y) => x - y);   // enables the 'break' prune
  const res = [], cur = [];
  const bt = (start, rem) => {
    if (rem === 0) { res.push([...cur]); return; }   // goal: exact sum
    for (let i = start; i < c.length; i++) {
      if (c[i] > rem) break;               // sorted: everything after is too big
      cur.push(c[i]);                      // choose c[i]
      bt(i, rem - c[i]);                   // i (not i + 1): reuse allowed
      cur.pop();                           // un-choose
    }
  };
  bt(0, target);
  return res;
}
console.log(JSON.stringify(combinationSum([2, 3, 6, 7], 7)));   // [[2,2,3],[7]]` },
        { lang: 'cpp', code: `class CombinationSum {
public:
    vector<vector<int>> combinationSum(vector<int> candidates, int target) {
        sort(candidates.begin(), candidates.end());   // enables the 'break' prune
        vector<vector<int>> res;
        vector<int> cur;
        bt(candidates, 0, target, cur, res);
        return res;
    }
private:
    void bt(const vector<int>& c, int start, int rem, vector<int>& cur, vector<vector<int>>& res) {
        if (rem == 0) { res.push_back(cur); return; }   // goal: exact sum
        for (int i = start; i < (int)c.size(); i++) {
            if (c[i] > rem) break;           // sorted: everything after is too big
            cur.push_back(c[i]);             // choose c[i]
            bt(c, i, rem - c[i], cur, res);  // i (not i+1): reuse allowed
            cur.pop_back();                  // un-choose
        }
    }
};

int main() {
    for (const auto& s : CombinationSum().combinationSum({2, 3, 6, 7}, 7)) {
        for (int x : s) cout << x << ' ';
        cout << '\\n';                        // 2 2 3 / 7
    }
}` }
      ] }, { lang: 'java', code: `
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
      }`,
        alt: [
          { lang: 'python', run: true, code: `def combination_sum2(c, target):
    # Each number used at most once; input may contain duplicates.
    c = sorted(c)
    res, cur = [], []

    def bt(start, rem):
        if rem == 0:
            res.append(cur[:])
            return
        for i in range(start, len(c)):
            if i > start and c[i] == c[i - 1]:
                continue                     # same value at same level -> skip
            if c[i] > rem:
                break
            cur.append(c[i])
            bt(i + 1, rem - c[i])            # i + 1: no reuse
            cur.pop()

    bt(0, target)
    return res


print(combination_sum2([10, 1, 2, 7, 6, 1, 5], 8))   # [[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]` },
          { lang: 'js', run: true, code: `// Each number used at most once; input may contain duplicates.
function combinationSum2(candidates, target) {
  const c = [...candidates].sort((x, y) => x - y);
  const res = [], cur = [];
  const bt = (start, rem) => {
    if (rem === 0) { res.push([...cur]); return; }
    for (let i = start; i < c.length; i++) {
      if (i > start && c[i] === c[i - 1]) continue;  // same value at same level -> skip
      if (c[i] > rem) break;
      cur.push(c[i]);
      bt(i + 1, rem - c[i]);               // i + 1: no reuse
      cur.pop();
    }
  };
  bt(0, target);
  return res;
}
console.log(JSON.stringify(combinationSum2([10, 1, 2, 7, 6, 1, 5], 8)));   // [[1,1,6],[1,2,5],[1,7],[2,6]]` },
          { lang: 'cpp', code: `class CombinationSum2 {
public:
    // Each number used at most once; input may contain duplicates.
    vector<vector<int>> combinationSum2(vector<int> c, int target) {
        sort(c.begin(), c.end());
        vector<vector<int>> res;
        vector<int> cur;
        bt(c, 0, target, cur, res);
        return res;
    }
private:
    void bt(const vector<int>& c, int start, int rem, vector<int>& cur, vector<vector<int>>& res) {
        if (rem == 0) { res.push_back(cur); return; }
        for (int i = start; i < (int)c.size(); i++) {
            if (i > start && c[i] == c[i - 1]) continue;   // same value at same level -> skip
            if (c[i] > rem) break;
            cur.push_back(c[i]);
            bt(c, i + 1, rem - c[i], cur, res);  // i + 1: no reuse
            cur.pop_back();
        }
    }
};

int main() {
    for (const auto& s : CombinationSum2().combinationSum2({10, 1, 2, 7, 6, 1, 5}, 8)) {
        for (int x : s) cout << x << ' ';
        cout << '\\n';                        // 1 1 6 / 1 2 5 / 1 7 / 2 6
    }
}` }
        ] }],
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
        code: { lang: 'java', code: `
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
          }`,
          alt: [
            { lang: 'python', run: true, code: `def bt(k, start, rem, cur, res):
    if len(cur) == k:                        # size reached: check the sum
        if rem == 0:
            res.append(cur[:])
        return
    for d in range(start, min(9, rem) + 1):
        cur.append(d)
        bt(k, d + 1, rem - d, cur, res)      # digits used once
        cur.pop()


res = []
bt(3, 1, 9, [], res)
print(res)                                   # [[1, 2, 6], [1, 3, 5], [2, 3, 4]]` },
            { lang: 'js', run: true, code: `function bt(k, start, rem, cur, res) {
  if (cur.length === k) {                  // size reached: check the sum
    if (rem === 0) res.push([...cur]);
    return;
  }
  for (let d = start; d <= 9 && d <= rem; d++) {
    cur.push(d);
    bt(k, d + 1, rem - d, cur, res);       // digits used once
    cur.pop();
  }
}
const res = [];
bt(3, 1, 9, [], res);
console.log(JSON.stringify(res));          // [[1,2,6],[1,3,5],[2,3,4]]` },
            { lang: 'cpp', code: `void bt(int k, int start, int rem, vector<int>& cur, vector<vector<int>>& res) {
    if ((int)cur.size() == k) {              // size reached: check the sum
        if (rem == 0) res.push_back(cur);
        return;
    }
    for (int d = start; d <= 9 && d <= rem; d++) {
        cur.push_back(d);
        bt(k, d + 1, rem - d, cur, res);     // digits used once
        cur.pop_back();
    }
}
int main() {
    vector<vector<int>> res;
    vector<int> cur;
    bt(3, 1, 9, cur, res);
    for (const auto& s : res) { for (int x : s) cout << x; cout << ' '; }   // 126 135 234
    cout << '\\n';
}` }
          ] }
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
          code: {
          lang: 'java',
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
            }`,
          alt: [
            { lang: 'python', code: `def combination_sum(c, target):
    found = set()
    go(c, target, [], found)
    return [list(t) for t in found]


def go(c, rem, cur, found):
    if rem < 0:
        return
    if rem == 0:
        found.add(tuple(sorted(cur)))     # canonical form for de-duplication
        return
    for x in c:                           # every candidate, every time
        cur.append(x)
        go(c, rem - x, cur, found)
        cur.pop()` },
            { lang: 'js', code: `function combinationSum(c, target) {
  const found = new Map();
  go(c, target, [], found);
  return [...found.values()];
}

function go(c, rem, cur, found) {
  if (rem < 0) return;
  if (rem === 0) {
    const s = [...cur].sort((a, b) => a - b);   // canonical form for de-duplication
    found.set(s.join(","), s);
    return;
  }
  for (const x of c) {                          // every candidate, every time
    cur.push(x);
    go(c, rem - x, cur, found);
    cur.pop();
  }
}` },
            { lang: 'cpp', code: `void go(const vector<int>& c, int rem, vector<int>& cur, set<vector<int>>& found) {
    if (rem < 0) return;
    if (rem == 0) {
        vector<int> s = cur;
        sort(s.begin(), s.end());          // canonical form for de-duplication
        found.insert(s);
        return;
    }
    for (int x : c) {                      // every candidate, every time
        cur.push_back(x);
        go(c, rem - x, cur, found);
        cur.pop_back();
    }
}

vector<vector<int>> combinationSum(const vector<int>& c, int target) {
    set<vector<int>> found;
    vector<int> cur;
    go(c, target, cur, found);
    return vector<vector<int>>(found.begin(), found.end());
}` }
          ]
        }
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
        tests: { sig: 'int[] int -> list<list<int>>', fn: 'combinationSum', cmp: "sets", cases: [
          [[[2,3,6,7],7],[[7],[2,2,3]]],
          [[[2,3,5],8],[[3,5],[2,3,3],[2,2,2,2]]],
          [[[2],1],[]],
          [[[7],7],[[7]]],
          [[[3,2],6],[[2,2,2],[3,3]]],
          [[[8,7,4,3],11],[[3,4,4],[4,7],[3,8]]],
          [[[5,10,40],40],[[40],[10,10,10,10],[5,5,10,10,10],[5,5,5,5,10,10],[5,5,5,5,5,5,10],[5,5,5,5,5,5,5,5]]],
          [[[40],40],[[40]]]
        ] },
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
          alt: [
            { lang: 'python', code: `def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
    c = sorted(candidates)              # enables the 'break' prune
    res, cur = [], []

    def bt(start: int, rem: int) -> None:
        if rem == 0:
            res.append(cur[:])          # exact hit: save a copy
            return
        for i in range(start, len(c)):
            if c[i] > rem:
                break                   # too big, and so is everything after
            cur.append(c[i])
            bt(i, rem - c[i])           # same i = reuse allowed
            cur.pop()

    bt(0, target)
    return res` },
            { lang: 'js', code: `function combinationSum(candidates, target) {
  const c = [...candidates].sort((x, y) => x - y);
  const res = [], cur = [];
  const bt = (start, rem) => {
    if (rem === 0) { res.push([...cur]); return; }
    for (let i = start; i < c.length; i++) {
      if (c[i] > rem) break;             // sorted: everything after is too big
      cur.push(c[i]);
      bt(i, rem - c[i]);                 // same i = reuse allowed
      cur.pop();
    }
  };
  bt(0, target);
  return res;
}` },
            { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
        sort(candidates.begin(), candidates.end());     // enables the 'break' prune
        vector<vector<int>> res;
        vector<int> cur;
        bt(candidates, 0, target, cur, res);
        return res;
    }
private:
    void bt(const vector<int>& c, int start, int rem, vector<int>& cur, vector<vector<int>>& res) {
        if (rem == 0) { res.push_back(cur); return; }
        for (int i = start; i < (int)c.size(); i++) {
            if (c[i] > rem) break;            // too big, and so is everything after
            cur.push_back(c[i]);
            bt(c, i, rem - c[i], cur, res);   // same i = reuse allowed
            cur.pop_back();
        }
    }
};` }
          ],
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
    code: [{ lang: 'java', code: `
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
      }`,
      alt: [
        { lang: 'python', run: true, code: `def solve_n_queens(n):
    res = []
    board = [["."] * n for _ in range(n)]
    cols, diag, anti = [False] * n, [False] * (2 * n - 1), [False] * (2 * n - 1)

    def place(r):
        if r == n:                                   # every row has a queen
            res.append(["".join(row) for row in board])   # copy the board
            return
        for c in range(n):
            d, a = r - c + n - 1, r + c              # diagonal ids
            if cols[c] or diag[d] or anti[a]:
                continue                             # attacked -> prune
            board[r][c] = "Q"
            cols[c] = diag[d] = anti[a] = True       # choose
            place(r + 1)                             # explore next row
            board[r][c] = "."
            cols[c] = diag[d] = anti[a] = False      # un-choose

    place(0)
    return res


for b in solve_n_queens(4):
    print(b)          # ['.Q..', '...Q', 'Q...', '..Q.'] then ['..Q.', 'Q...', '...Q', '.Q..']` },
        { lang: 'js', run: true, code: `function solveNQueens(n) {
  const res = [];
  const board = Array.from({ length: n }, () => new Array(n).fill('.'));
  const cols = new Array(n).fill(false), diag = new Array(2 * n - 1).fill(false), anti = new Array(2 * n - 1).fill(false);
  const place = (r) => {
    if (r === n) { res.push(board.map((row) => row.join(''))); return; }   // copy the board
    for (let c = 0; c < n; c++) {
      const d = r - c + n - 1, a = r + c;            // diagonal ids
      if (cols[c] || diag[d] || anti[a]) continue;   // attacked -> prune
      board[r][c] = 'Q';
      cols[c] = diag[d] = anti[a] = true;            // choose
      place(r + 1);                                  // explore next row
      board[r][c] = '.';
      cols[c] = diag[d] = anti[a] = false;           // un-choose
    }
  };
  place(0);
  return res;
}
for (const b of solveNQueens(4)) console.log(b.join(' '));
// .Q.. ...Q Q... ..Q.
// ..Q. Q... ...Q .Q..` },
        { lang: 'cpp', code: `class NQueens {
public:
    vector<vector<string>> solveNQueens(int n) {
        vector<vector<string>> res;
        vector<string> board(n, string(n, '.'));
        vector<bool> cols(n), diag(2 * n - 1), anti(2 * n - 1);
        place(0, n, board, cols, diag, anti, res);
        return res;
    }
private:
    void place(int r, int n, vector<string>& board, vector<bool>& cols, vector<bool>& diag,
               vector<bool>& anti, vector<vector<string>>& res) {
        if (r == n) { res.push_back(board); return; }       // every row has a queen: copy
        for (int c = 0; c < n; c++) {
            int d = r - c + n - 1, a = r + c;               // diagonal ids
            if (cols[c] || diag[d] || anti[a]) continue;    // attacked -> prune
            board[r][c] = 'Q';
            cols[c] = diag[d] = anti[a] = true;             // choose
            place(r + 1, n, board, cols, diag, anti, res);  // explore next row
            board[r][c] = '.';
            cols[c] = diag[d] = anti[a] = false;            // un-choose
        }
    }
};

int main() {
    for (const auto& b : NQueens().solveNQueens(4)) {
        for (const string& row : b) cout << row << ' ';
        cout << '\\n';    // .Q.. ...Q Q... ..Q.  /  ..Q. Q... ...Q .Q..
    }
}` }
      ] }, { lang: 'java', code: `
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
      }`,
        alt: [
          { lang: 'python', run: true, code: `def count(n, row=0, cols=0, diag=0, anti=0):
    # bit c set = column c (or a diagonal hitting column c in this row) is attacked
    if row == n:
        return 1
    full = (1 << n) - 1
    free = full & ~(cols | diag | anti)              # safe columns in this row
    total = 0
    while free:
        bit = free & -free                           # lowest safe column
        free -= bit
        total += count(n, row + 1, cols | bit,
                       ((diag | bit) << 1) & full,   # diagonals shift left (mask: Python ints grow)
                       (anti | bit) >> 1)            # anti-diagonals shift right
    return total


print(*(count(n) for n in range(1, 11)))             # 1 0 0 2 10 4 40 92 352 724` },
          { lang: 'js', run: true, code: `// Count solutions with bitmasks: bit c set = column c (or the diagonal hitting column c in this row) is attacked.
function count(n, row, cols, diag, anti) {
  if (row === n) return 1;
  const full = (1 << n) - 1;
  let free = full & ~(cols | diag | anti);           // safe columns in this row
  let total = 0;
  while (free !== 0) {
    const bit = free & -free;                        // lowest safe column
    free -= bit;
    total += count(n, row + 1, cols | bit,
                   ((diag | bit) << 1) & full,       // diagonals shift left for the next row
                   (anti | bit) >> 1);               // anti-diagonals shift right
  }
  return total;
}
const counts = [];
for (let n = 1; n <= 10; n++) counts.push(count(n, 0, 0, 0, 0));
console.log(counts.join(' '));                       // 1 0 0 2 10 4 40 92 352 724` },
          { lang: 'cpp', code: `// Count solutions with bitmasks: bit c set = column c (or the diagonal hitting column c in this row) is attacked.
int countQueens(int n, int row, int cols, int diag, int anti) {
    if (row == n) return 1;
    int full = (1 << n) - 1;
    int free = full & ~(cols | diag | anti);         // safe columns in this row
    int total = 0;
    while (free != 0) {
        int bit = free & -free;                      // lowest safe column
        free -= bit;
        total += countQueens(n, row + 1, cols | bit,
                             ((diag | bit) << 1) & full,   // diagonals shift left for the next row
                             (anti | bit) >> 1);           // anti-diagonals shift right
    }
    return total;
}
int main() {
    for (int n = 1; n <= 10; n++) cout << countQueens(n, 0, 0, 0, 0) << ' ';
    cout << '\\n';                                    // 1 0 0 2 10 4 40 92 352 724
}` }
        ] }],
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
        code: { lang: 'java', code: `
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
          }`,
          alt: [
            { lang: 'python', run: true, code: `def valid(col_of_row):                       # col_of_row[r] = column of the queen in row r
    cols, d, a = set(), set(), set()
    for r, c in enumerate(col_of_row):
        if c in cols or r - c in d or r + c in a:
            return False
        cols.add(c); d.add(r - c); a.add(r + c)
    return True


print(valid([1, 3, 0, 2]))                   # True
print(valid([0, 2, 1, 3]))                   # False` },
            { lang: 'js', run: true, code: `function valid(colOfRow) {                 // colOfRow[r] = column of the queen in row r
  const cols = new Set(), d = new Set(), a = new Set();
  for (let r = 0; r < colOfRow.length; r++) {
    const c = colOfRow[r];
    if (cols.has(c) || d.has(r - c) || a.has(r + c)) return false;
    cols.add(c); d.add(r - c); a.add(r + c);
  }
  return true;
}
console.log(valid([1, 3, 0, 2]));          // true
console.log(valid([0, 2, 1, 3]));          // false` },
            { lang: 'cpp', code: `bool valid(const vector<int>& colOfRow) {            // colOfRow[r] = column of the queen in row r
    unordered_set<int> cols, d, a;
    for (int r = 0; r < (int)colOfRow.size(); r++) {
        int c = colOfRow[r];
        if (!cols.insert(c).second || !d.insert(r - c).second || !a.insert(r + c).second) return false;
    }
    return true;
}
int main() {
    cout << boolalpha << valid({1, 3, 0, 2}) << '\\n';   // true
    cout << boolalpha << valid({0, 2, 1, 3}) << '\\n';   // false
}` }
          ] }
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
          code: {
          lang: 'java',
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
            }`,
          alt: [
            { lang: 'python', code: `def solve_n_queens(n):
    res = []
    pos = [0] * n
    total = n ** n                               # n^n assignments
    for code in range(total):
        x = code
        for r in range(n):
            pos[r] = x % n
            x //= n
        ok = True
        for i in range(n):
            for j in range(i + 1, n):
                if pos[i] == pos[j] or abs(pos[i] - pos[j]) == j - i:
                    ok = False
        if not ok:
            continue
        board = []
        for r in range(n):
            row = ['.'] * n
            row[pos[r]] = 'Q'
            board.append("".join(row))
        res.append(board)
    return res` },
            { lang: 'js', code: `function solveNQueens(n) {
  const res = [];
  const pos = new Array(n).fill(0);
  let total = 1;
  for (let i = 0; i < n; i++) total *= n;        // n^n assignments
  for (let code = 0; code < total; code++) {
    let x = code;
    for (let r = 0; r < n; r++) { pos[r] = x % n; x = Math.floor(x / n); }
    let ok = true;
    for (let i = 0; i < n && ok; i++)
      for (let j = i + 1; j < n && ok; j++)
        if (pos[i] === pos[j] || Math.abs(pos[i] - pos[j]) === j - i) ok = false;
    if (!ok) continue;
    const board = [];
    for (let r = 0; r < n; r++) {
      const row = new Array(n).fill('.');
      row[pos[r]] = 'Q';
      board.push(row.join(""));
    }
    res.push(board);
  }
  return res;
}` },
            { lang: 'cpp', code: `vector<vector<string>> solveNQueens(int n) {
    vector<vector<string>> res;
    vector<int> pos(n);
    int total = 1;
    for (int i = 0; i < n; i++) total *= n;      // n^n assignments
    for (int code = 0; code < total; code++) {
        int x = code;
        for (int r = 0; r < n; r++) { pos[r] = x % n; x /= n; }
        bool ok = true;
        for (int i = 0; i < n && ok; i++)
            for (int j = i + 1; j < n && ok; j++)
                if (pos[i] == pos[j] || abs(pos[i] - pos[j]) == j - i) ok = false;
        if (!ok) continue;
        vector<string> board;
        for (int r = 0; r < n; r++) {
            string row(n, '.');
            row[pos[r]] = 'Q';
            board.push_back(row);
        }
        res.push_back(board);
    }
    return res;
}` }
          ]
        }
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
        tests: { sig: 'int -> list<list<string>>', fn: 'solveNQueens', check: "(a, out, exp) => { const n = a[0]; if (!Array.isArray(out)) return false; const ok = (b) => { if (!Array.isArray(b) || b.length !== n) return false; const cs = new Set(), d1 = new Set(), d2 = new Set(); for (let r = 0; r < n; r++) { const row = b[r]; if (typeof row !== 'string' || row.length !== n || row.split('').filter((ch) => ch === 'Q').length !== 1 || /[^Q.]/.test(row)) return false; const c = row.indexOf('Q'); cs.add(c); d1.add(r - c); d2.add(r + c); } return cs.size === n && d1.size === n && d2.size === n; }; const keys = out.map((b) => JSON.stringify(b)); if (new Set(keys).size !== keys.length || !out.every(ok)) return false; if (!Array.isArray(exp)) return out.length === exp; const want = new Set(exp.map((b) => JSON.stringify(b))); return keys.length === want.size && keys.every((x) => want.has(x)); }", cases: [
          [[1],[["Q"]]],
          [[2],[]],
          [[3],[]],
          [[4],[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]],
          [[5],[["Q....","..Q..","....Q",".Q...","...Q."],["Q....","...Q.",".Q...","....Q","..Q.."],[".Q...","...Q.","Q....","..Q..","....Q"],[".Q...","....Q","..Q..","Q....","...Q."],["..Q..","Q....","...Q.",".Q...","....Q"],["..Q..","....Q",".Q...","...Q.","Q...."],["...Q.","Q....","..Q..","....Q",".Q..."],["...Q.",".Q...","....Q","..Q..","Q...."],["....Q",".Q...","...Q.","Q....","..Q.."],["....Q","..Q..","Q....","...Q.",".Q..."]]],
          [[6],[[".Q....","...Q..",".....Q","Q.....","..Q...","....Q."],["..Q...",".....Q",".Q....","....Q.","Q.....","...Q.."],["...Q..","Q.....","....Q.",".Q....",".....Q","..Q..."],["....Q.","..Q...","Q.....",".....Q","...Q..",".Q...."]]],
          [[8],92],
          [[9],352]
        ] },
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
          alt: [
            { lang: 'python', code: `def solve_n_queens(n: int) -> list[list[str]]:
    res = []
    board = [["."] * n for _ in range(n)]
    cols, diag, anti = set(), set(), set()     # attacked column, r - c, r + c

    def place(r: int) -> None:
        if r == n:
            res.append(["".join(row) for row in board])   # copy the board
            return
        for c in range(n):
            if c in cols or r - c in diag or r + c in anti:
                continue                                  # attacked
            board[r][c] = "Q"
            cols.add(c); diag.add(r - c); anti.add(r + c)            # choose
            place(r + 1)                                             # explore
            board[r][c] = "."
            cols.remove(c); diag.remove(r - c); anti.remove(r + c)   # un-choose

    place(0)
    return res` },
            { lang: 'js', code: `function solveNQueens(n) {
  const res = [];
  const board = Array.from({ length: n }, () => new Array(n).fill('.'));
  const cols = new Array(n).fill(false);
  const diag = new Array(2 * n - 1).fill(false);   // index r - c + n - 1
  const anti = new Array(2 * n - 1).fill(false);   // index r + c
  const place = (r) => {
    if (r === n) { res.push(board.map((row) => row.join(''))); return; }
    for (let c = 0; c < n; c++) {
      const d = r - c + n - 1, a = r + c;
      if (cols[c] || diag[d] || anti[a]) continue;  // attacked
      board[r][c] = 'Q'; cols[c] = diag[d] = anti[a] = true;    // choose
      place(r + 1);                                             // explore
      board[r][c] = '.'; cols[c] = diag[d] = anti[a] = false;   // un-choose
    }
  };
  place(0);
  return res;
}` },
            { lang: 'cpp', code: `class Solution {
public:
    vector<vector<string>> solveNQueens(int n) {
        this->n = n;
        board.assign(n, string(n, '.'));
        cols.assign(n, false);
        diag.assign(2 * n - 1, false);        // r - c + n - 1
        anti.assign(2 * n - 1, false);        // r + c
        res.clear();
        place(0);
        return res;
    }
private:
    int n = 0;
    vector<string> board;
    vector<bool> cols, diag, anti;
    vector<vector<string>> res;

    void place(int r) {
        if (r == n) { res.push_back(board); return; }   // copies every row
        for (int c = 0; c < n; c++) {
            int d = r - c + n - 1, a = r + c;
            if (cols[c] || diag[d] || anti[a]) continue;  // attacked
            board[r][c] = 'Q'; cols[c] = diag[d] = anti[a] = true;    // choose
            place(r + 1);                                             // explore
            board[r][c] = '.'; cols[c] = diag[d] = anti[a] = false;   // un-choose
        }
    }
};` }
          ],
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
    code: [{ lang: 'java', code: `
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
      }`,
      alt: [
        { lang: 'python', run: true, code: `def solve_sudoku(board):
    rows = [[False] * 10 for _ in range(9)]
    cols = [[False] * 10 for _ in range(9)]
    boxes = [[False] * 10 for _ in range(9)]

    def mark(r, c, d, v):
        rows[r][d] = cols[c][d] = boxes[r // 3 * 3 + c // 3][d] = v

    for r in range(9):
        for c in range(9):
            if board[r][c] != ".":
                mark(r, c, int(board[r][c]), True)   # record givens

    def solve(pos):
        while pos < 81 and board[pos // 9][pos % 9] != ".":
            pos += 1                                 # skip filled cells
        if pos == 81:
            return True                              # no empty cell: solved
        r, c = divmod(pos, 9)
        box = r // 3 * 3 + c // 3
        for d in range(1, 10):
            if rows[r][d] or cols[c][d] or boxes[box][d]:
                continue                             # clash
            board[r][c] = str(d)
            mark(r, c, d, True)                      # choose
            if solve(pos + 1):
                return True                          # explore; keep answer on success
            mark(r, c, d, False)                     # un-choose
            board[r][c] = "."
        return False                                 # dead end: caller retries

    solve(0)


p = ["53..7....", "6..195...", ".98....6.", "8...6...3", "4..8.3..1",
     "7...2...6", ".6....28.", "...419..5", "....8..79"]
board = [list(row) for row in p]
solve_sudoku(board)
for row in board:
    print("".join(row))
# 534678912 / 672195348 / 198342567 / 859761423 / 426853791 / 713924856 / 961537284 / 287419635 / 345286179` },
        { lang: 'js', run: true, code: `function solveSudoku(board) {
  const used = () => Array.from({ length: 9 }, () => new Array(10).fill(false));
  const rows = used(), cols = used(), boxes = used();
  const boxOf = (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3);
  const mark = (r, c, d, v) => { rows[r][d] = cols[c][d] = boxes[boxOf(r, c)][d] = v; };
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c] !== '.') mark(r, c, Number(board[r][c]), true);   // record givens
  const solve = (pos) => {
    while (pos < 81 && board[Math.floor(pos / 9)][pos % 9] !== '.') pos++;   // skip filled cells
    if (pos === 81) return true;                     // no empty cell: solved
    const r = Math.floor(pos / 9), c = pos % 9, box = boxOf(r, c);
    for (let d = 1; d <= 9; d++) {
      if (rows[r][d] || cols[c][d] || boxes[box][d]) continue;   // clash
      board[r][c] = String(d);
      mark(r, c, d, true);                           // choose
      if (solve(pos + 1)) return true;               // explore; keep answer on success
      mark(r, c, d, false);                          // un-choose
      board[r][c] = '.';
    }
    return false;                                    // dead end: caller retries
  };
  solve(0);
}

const p = ['53..7....', '6..195...', '.98....6.', '8...6...3', '4..8.3..1',
           '7...2...6', '.6....28.', '...419..5', '....8..79'];
const board = p.map((row) => row.split(''));
solveSudoku(board);
for (const row of board) console.log(row.join(''));
// 534678912 / 672195348 / 198342567 / 859761423 / 426853791 / 713924856 / 961537284 / 287419635 / 345286179` },
        { lang: 'cpp', code: `class SudokuSolver {
public:
    void solveSudoku(vector<vector<char>>& board) {
        for (int r = 0; r < 9; r++)
            for (int c = 0; c < 9; c++)
                if (board[r][c] != '.') mark(r, c, board[r][c] - '0', true);   // record givens
        solve(board, 0);
    }
private:
    bool rows[9][10] = {}, cols[9][10] = {}, boxes[9][10] = {};

    bool solve(vector<vector<char>>& b, int pos) {
        while (pos < 81 && b[pos / 9][pos % 9] != '.') pos++;   // skip filled cells
        if (pos == 81) return true;                            // no empty cell: solved
        int r = pos / 9, c = pos % 9, box = (r / 3) * 3 + c / 3;
        for (int d = 1; d <= 9; d++) {
            if (rows[r][d] || cols[c][d] || boxes[box][d]) continue;   // clash
            b[r][c] = char('0' + d);
            mark(r, c, d, true);                               // choose
            if (solve(b, pos + 1)) return true;                // explore; keep answer on success
            mark(r, c, d, false);                              // un-choose
            b[r][c] = '.';
        }
        return false;                                          // dead end: caller retries
    }

    void mark(int r, int c, int d, bool v) {
        rows[r][d] = cols[c][d] = boxes[(r / 3) * 3 + c / 3][d] = v;
    }
};

int main() {
    vector<string> p = {"53..7....", "6..195...", ".98....6.", "8...6...3", "4..8.3..1",
                        "7...2...6", ".6....28.", "...419..5", "....8..79"};
    vector<vector<char>> board;
    for (const string& row : p) board.emplace_back(row.begin(), row.end());
    SudokuSolver().solveSudoku(board);
    for (const auto& row : board) cout << string(row.begin(), row.end()) << '\\n';
    // 534678912 / 672195348 / 198342567 / 859761423 / 426853791 / 713924856 / 961537284 / 287419635 / 345286179
}` }
      ] }],
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
        code: { lang: 'java', code: `
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
          }`,
          alt: [
            { lang: 'python', run: true, code: `def is_valid(b):
    seen = set()
    for r in range(9):
        for c in range(9):
            d = b[r][c]
            if d == ".":
                continue
            keys = (d + " in row " + str(r), d + " in col " + str(c), d + " in box " + str(r // 3) + "-" + str(c // 3))
            if any(k in seen for k in keys):
                return False
            seen.update(keys)
    return True


b = [["."] * 9 for _ in range(9)]
b[0][0] = "5"; b[1][1] = "5"                 # same box -> invalid
print(is_valid(b))                           # False` },
            { lang: 'js', run: true, code: `function isValid(b) {
  const seen = new Set();
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const d = b[r][c];
      if (d === '.') continue;
      const keys = [d + ' in row ' + r, d + ' in col ' + c, d + ' in box ' + Math.floor(r / 3) + '-' + Math.floor(c / 3)];
      if (keys.some((k) => seen.has(k))) return false;
      keys.forEach((k) => seen.add(k));
    }
  return true;
}
const b = Array.from({ length: 9 }, () => new Array(9).fill('.'));
b[0][0] = '5'; b[1][1] = '5';              // same box -> invalid
console.log(isValid(b));                   // false` },
            { lang: 'cpp', code: `bool isValid(const vector<vector<char>>& b) {
    unordered_set<string> seen;
    for (int r = 0; r < 9; r++)
        for (int c = 0; c < 9; c++) {
            char d = b[r][c];
            if (d == '.') continue;
            string k1 = string(1, d) + " in row " + to_string(r);
            string k2 = string(1, d) + " in col " + to_string(c);
            string k3 = string(1, d) + " in box " + to_string(r / 3) + "-" + to_string(c / 3);
            if (!seen.insert(k1).second || !seen.insert(k2).second || !seen.insert(k3).second) return false;
        }
    return true;
}
int main() {
    vector<vector<char>> b(9, vector<char>(9, '.'));
    b[0][0] = '5'; b[1][1] = '5';                    // same box -> invalid
    cout << boolalpha << isValid(b) << '\\n';         // false
}` }
          ] }
      },
      {
        title: 'Bitmask candidates: which digits can go here?',
        html: `<p>Store <code>rowMask[r]</code>, <code>colMask[c]</code>, <code>boxMask[b]</code> as 9-bit ints (bit d−1 = digit d used). Free digits = <code>~(rowMask[r] | colMask[c] | boxMask[b]) &amp; 0x1FF</code>. A popcount (<code>Integer.bitCount</code>, Python <code>int.bit_count()</code>, C++ <code>__builtin_popcount</code>) gives how many options the cell has — which powers the MRV heuristic below.</p>
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
        statement: `<p>Write a program to solve a Sudoku puzzle by filling the empty cells (<code>'.'</code>) of a 9×9 grid of characters <code>board</code> <b>in place</b>. Each of the digits 1–9 must occur exactly once in each row, each column and each of the nine 3×3 sub-boxes. The input has exactly one solution.</p>`,
        constraints: `board.length == 9, board[i].length == 9, board[i][j] is a digit or '.', exactly one solution`,
        example: `<p>Input row 0: <code>5 3 . . 7 . . . .</code> (plus 8 more rows, see the code above) → Output row 0: <code>5 3 ${H.c('g', '4 6')} 7 ${H.c('g', '8 9 1 2')}</code>.</p>
          <p>Why (0, 2) = 4: row 0 already has {3,5,7}, column 2 has {8}, box 0 has {3,5,6,8,9}; candidates are {1,2,4}. The solver tries 1 and 2 first, and only 4 survives the deeper checks.</p>`,
        brute: {
          why: `<p>Fill every empty cell with every digit (9<sup>k</sup> combinations for k empty cells — 9<sup>51</sup> for the classic example) and check the full board at the end. Hopeless. Even "check after each placement but rescan the row, column and box" works but costs 27 reads per try; the real waste is not stopping the moment a digit clashes.</p>`,
          code: {
          lang: 'java',
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
            }`,
          alt: [
            { lang: 'python', code: `def brute_solve(b):
    for r in range(9):
        for c in range(9):
            if b[r][c] == '.':
                for d in "123456789":
                    if ok(b, r, c, d):             # rescans 27 cells each time
                        b[r][c] = d
                        if brute_solve(b):
                            return True
                        b[r][c] = '.'
                return False
    return True


def ok(b, r, c, d):
    for i in range(9):
        if b[r][i] == d or b[i][c] == d:
            return False
        if b[3 * (r // 3) + i // 3][3 * (c // 3) + i % 3] == d:
            return False
    return True` },
            { lang: 'js', code: `function bruteSolve(b) {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (b[r][c] === '.') {
        for (let d = 1; d <= 9; d++) {
          const ch = String(d);
          if (ok(b, r, c, ch)) {            // rescans 27 cells each time
            b[r][c] = ch;
            if (bruteSolve(b)) return true;
            b[r][c] = '.';
          }
        }
        return false;
      }
  return true;
}

function ok(b, r, c, d) {
  for (let i = 0; i < 9; i++) {
    if (b[r][i] === d || b[i][c] === d) return false;
    if (b[3 * Math.floor(r / 3) + Math.floor(i / 3)][3 * Math.floor(c / 3) + (i % 3)] === d) return false;
  }
  return true;
}` },
            { lang: 'cpp', code: `bool ok(vector<vector<char>>& b, int r, int c, char d) {
    for (int i = 0; i < 9; i++) {
        if (b[r][i] == d || b[i][c] == d) return false;
        if (b[3 * (r / 3) + i / 3][3 * (c / 3) + i % 3] == d) return false;
    }
    return true;
}

bool bruteSolve(vector<vector<char>>& b) {
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
}` }
          ]
        }
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
        tests: { sig: 'char[][] -> void', fn: 'solveSudoku', mutate: 0, cases: [
          [[[["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]],[["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1","7","9"]]],
          [[[[".",".","9","7","4","8",".",".","."],["7",".",".",".",".",".",".",".","."],[".","2",".","1",".","9",".",".","."],[".",".","7",".",".",".","2","4","."],[".","6","4",".","1",".","5","9","."],[".","9","8",".",".",".","3",".","."],[".",".",".","8",".","3",".","2","."],[".",".",".",".",".",".",".",".","6"],[".",".",".","2","7","5","9",".","."]]],[["5","1","9","7","4","8","6","3","2"],["7","8","3","6","5","2","4","1","9"],["4","2","6","1","3","9","8","7","5"],["3","5","7","9","8","6","2","4","1"],["2","6","4","3","1","7","5","9","8"],["1","9","8","5","2","4","3","6","7"],["9","7","5","8","6","3","1","2","4"],["8","3","2","4","9","1","7","5","6"],["6","4","1","2","7","5","9","8","3"]]],
          [[[["8",".",".",".",".",".",".",".","."],[".",".","3","6",".",".",".",".","."],[".","7",".",".","9",".","2",".","."],[".","5",".",".",".","7",".",".","."],[".",".",".",".","4","5","7",".","."],[".",".",".","1",".",".",".","3","."],[".",".","1",".",".",".",".","6","8"],[".",".","8","5",".",".",".","1","."],[".","9",".",".",".",".","4",".","."]]],[["8","1","2","7","5","3","6","4","9"],["9","4","3","6","8","2","1","7","5"],["6","7","5","4","9","1","2","8","3"],["1","5","4","2","3","7","8","9","6"],["3","6","9","8","4","5","7","2","1"],["2","8","7","1","6","9","5","3","4"],["5","2","1","9","7","4","3","6","8"],["4","3","8","5","2","6","9","1","7"],["7","9","6","3","1","8","4","5","2"]]],
          [[[[".",".",".",".",".",".",".","1","."],["4",".",".",".",".",".",".",".","."],[".","2",".",".",".",".",".",".","."],[".",".",".",".","5",".","4",".","7"],[".",".","8",".",".",".","3",".","."],[".",".","1",".","9",".",".",".","."],["3",".",".","4",".",".","2",".","."],[".","5",".","1",".",".",".",".","."],[".",".",".","8",".","6",".",".","."]]],[["6","9","3","7","8","4","5","1","2"],["4","8","7","5","1","2","9","3","6"],["1","2","5","9","6","3","8","7","4"],["9","3","2","6","5","1","4","8","7"],["5","6","8","2","4","7","3","9","1"],["7","4","1","3","9","8","6","2","5"],["3","1","9","4","7","5","2","6","8"],["8","5","6","1","2","9","7","4","3"],["2","7","4","8","3","6","1","5","9"]]],
          [[[["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1","7","9"]]],[["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1","7","9"]]],
          [[[["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8",".","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1","7","9"]]],[["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1","7","9"]]],
          [[[["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1","7","."]]],[["5","3","4","6","7","8","9","1","2"],["6","7","2","1","9","5","3","4","8"],["1","9","8","3","4","2","5","6","7"],["8","5","9","7","6","1","4","2","3"],["4","2","6","8","5","3","7","9","1"],["7","1","3","9","2","4","8","5","6"],["9","6","1","5","3","7","2","8","4"],["2","8","7","4","1","9","6","3","5"],["3","4","5","2","8","6","1","7","9"]]]
        ] },
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
          alt: [
            { lang: 'python', code: `def solve_sudoku(board: list[list[str]]) -> None:
    rows, cols, boxes = [0] * 9, [0] * 9, [0] * 9   # bit d-1 set = digit d used
    empty = []
    for r in range(9):
        for c in range(9):
            if board[r][c] == ".":
                empty.append((r, c))
            else:
                bit = 1 << (int(board[r][c]) - 1)
                rows[r] |= bit; cols[c] |= bit; boxes[r // 3 * 3 + c // 3] |= bit

    def free(r: int, c: int) -> int:
        return ~(rows[r] | cols[c] | boxes[r // 3 * 3 + c // 3]) & 0x1FF

    def solve() -> bool:
        if not empty:
            return True                         # every cell filled
        # MRV: take the empty cell with the fewest legal digits
        k = min(range(len(empty)), key=lambda i: free(*empty[i]).bit_count())
        empty[k], empty[-1] = empty[-1], empty[k]
        r, c = empty.pop()
        b = r // 3 * 3 + c // 3
        cand = free(r, c)
        while cand:
            bit = cand & -cand                  # lowest candidate digit
            cand ^= bit
            board[r][c] = str(bit.bit_length())
            rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit      # choose
            if solve():
                return True                     # keep the board on success
            rows[r] ^= bit; cols[c] ^= bit; boxes[b] ^= bit      # un-choose
        board[r][c] = "."
        empty.append((r, c))                    # dead end: give the cell back
        return False

    solve()` },
            { lang: 'js', code: `function solveSudoku(board) {
  const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
  const box = (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3);
  const bits = (x) => { let k = 0; for (; x; x &= x - 1) k++; return k; };
  const flip = (r, c, bit) => { rows[r] ^= bit; cols[c] ^= bit; boxes[box(r, c)] ^= bit; };
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c] !== '.') flip(r, c, 1 << (board[r][c].charCodeAt(0) - 49));
  const solve = () => {
    let bestR = -1, bestC = -1, bestFree = 0, bestCount = 10;
    for (let r = 0; r < 9; r++)          // MRV: the empty cell with the fewest options
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== '.') continue;
        const free = ~(rows[r] | cols[c] | boxes[box(r, c)]) & 0x1FF;
        const cnt = bits(free);
        if (cnt < bestCount) { bestCount = cnt; bestR = r; bestC = c; bestFree = free; }
      }
    if (bestR === -1) return true;       // no empty cell: solved
    for (let free = bestFree; free; ) {
      const bit = free & -free;          // lowest candidate digit
      free -= bit;
      board[bestR][bestC] = String(31 - Math.clz32(bit) + 1);
      flip(bestR, bestC, bit);           // choose
      if (solve()) return true;          // keep the board on success
      flip(bestR, bestC, bit);           // un-choose
      board[bestR][bestC] = '.';
    }
    return false;
  };
  solve();
}` },
            { lang: 'cpp', code: `class Solution {
public:
    void solveSudoku(vector<vector<char>>& board) {
        for (int r = 0; r < 9; r++)
            for (int c = 0; c < 9; c++)
                if (board[r][c] != '.') flip(r, c, board[r][c] - '1');
        solve(board);
    }
private:
    array<int, 9> rowMask{}, colMask{}, boxMask{};   // bit d = digit d+1 used

    void flip(int r, int c, int d) {
        int bit = 1 << d;
        rowMask[r] ^= bit; colMask[c] ^= bit; boxMask[(r / 3) * 3 + c / 3] ^= bit;
    }

    bool solve(vector<vector<char>>& b) {
        int bestR = -1, bestC = -1, bestFree = 0, bestCount = 10;
        for (int r = 0; r < 9; r++)           // MRV: the empty cell with the fewest options
            for (int c = 0; c < 9; c++) {
                if (b[r][c] != '.') continue;
                int free = ~(rowMask[r] | colMask[c] | boxMask[(r / 3) * 3 + c / 3]) & 0x1FF;
                int cnt = __builtin_popcount(free);
                if (cnt < bestCount) { bestCount = cnt; bestR = r; bestC = c; bestFree = free; }
            }
        if (bestR == -1) return true;         // no empty cell: solved
        while (bestFree) {
            int d = __builtin_ctz(bestFree);  // lowest candidate digit
            bestFree &= bestFree - 1;
            b[bestR][bestC] = char('1' + d);
            flip(bestR, bestC, d);            // choose
            if (solve(b)) return true;        // keep the board on success
            flip(bestR, bestC, d);            // un-choose
            b[bestR][bestC] = '.';
        }
        return false;
    }
};` }
          ],
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

  // ===================== PRACTICE: EASY =====================
  practice.push({
    title: 'Reverse String (recursively, in place)',
    level: 'Easy',
    tags: ['recursion', 'two pointers'],
    companies: ['Microsoft', 'Apple'],
    statement: `<p>Write a function that reverses a string given as an array of characters <code>s</code>. Do it <b>in place</b> (O(1) extra memory apart from recursion) and solve it <b>recursively</b>.</p>`,
    constraints: `1 ≤ s.length ≤ 10<sup>5</sup>; printable ASCII characters`,
    example: `${H.arr(['h', 'e', 'l', 'l', 'o'], { label: 's', hl: { 0: 'g', 4: 'g' }, ptr: { 0: 'l', 4: 'r' } })}
      <p>Output: ${H.arr(['o', 'l', 'l', 'e', 'h'])}</p>
      <p>Why: swap the ends (h ↔ o), then the problem is the same on the middle "ell" → swap e ↔ l → middle "l" alone is the base case.</p>`,
    brute: {
      why: `<p>Build a brand-new string by recursing on <code>substring(1)</code> and appending the first char at the end. Each <code>substring</code> copies the rest of the string, so the total work is n + (n−1) + … = O(n²) and O(n²) temporary memory — for n = 10<sup>5</sup> that is 5·10<sup>9</sup> character copies. It is also not in place.</p>`,
      code: {
          lang: 'java',
          code: `
        String reverseBrute(String s) {
            if (s.length() <= 1) return s;                 // base case
            return reverseBrute(s.substring(1)) + s.charAt(0); // copies O(n) every call
        }`,
          alt: [
            { lang: 'python', code: `def reverse_brute(s):
    if len(s) <= 1:
        return s                                   # base case
    return reverse_brute(s[1:]) + s[0]             # copies O(n) every call` },
            { lang: 'js', code: `function reverseBrute(s) {
  if (s.length <= 1) return s;                     // base case
  return reverseBrute(s.slice(1)) + s[0];          // copies O(n) every call
}` },
            { lang: 'cpp', code: `string reverseBrute(string s) {
    if (s.size() <= 1) return s;                   // base case
    return reverseBrute(s.substr(1)) + s[0];       // copies O(n) every call
}` }
          ]
        }
    },
    mcq: {
      q: `Recursive reverse with (l, r) indices on n = 10<sup>5</sup> characters: how deep does the call stack get?`,
      options: ['10<sup>5</sup>', '5 × 10<sup>4</sup> (n / 2)', 'log₂n ≈ 17', '1'],
      answer: 1,
      explain: `Each call handles two characters (l and r) and moves both inwards, so there are about n / 2 = 50,000 frames. That is more than a default Java or JavaScript stack holds (roughly 10<sup>4</sup> frames) and far past Python's limit of 1000, so this simple version fails at the maximum size. The solution below keeps the recursion but splits the work in halves, so the depth drops to about log₂(n / 2) ≈ 16.`
    },
    hints: [
      `<p><b>Aha:</b> reversing = swap the outermost pair + reverse the inside. The inside is the same problem, two characters shorter.</p>`,
      `<p>Pass two indices <code>l</code> and <code>r</code> instead of creating substrings — the array itself is the state.</p>`,
      `<p>Base case: <code>l &gt;= r</code> (0 or 1 characters left). Recipe: if l ≥ r return; swap s[l], s[r]; recurse(l + 1, r − 1). Trap: that is n / 2 frames deep, which overflows the default stack for n = 10<sup>5</sup>. Fix: number the pairs 0..n/2 − 1 (pair i = s[i] and s[n − 1 − i]) and recurse on the two halves of that range, so the depth is only O(log n).</p>`
    ],
    tests: { sig: 'char[] -> void', fn: 'reverseString', mutate: 0, cases: [
      [[["h","e","l","l","o"]],["o","l","l","e","h"]],
      [[["H","a","n","n","a","h"]],["h","a","n","n","a","H"]],
      [[["a"]],["a"]],
      [[["a","b"]],["b","a"]],
      [[["A"," ","m","a","n",","," ","a"," ","p","l","a","n","!"]],["!","n","a","l","p"," ","a"," ",",","n","a","m"," ","A"]],
      [[[" "," ","x"," "," ","y"]],["y"," "," ","x"," "," "]],
      [[["r","a","c","e","c","a","r"]],["r","a","c","e","c","a","r"]],
      [[Array.from({ length: 6001 }, (_, i) => String.fromCharCode(97 + i % 26))], Array.from({ length: 6001 }, (_, i) => String.fromCharCode(97 + (6000 - i) % 26))]
    ] },
    solution: {
      approach: `<p>The swaps are independent: pair i is s[i] and s[n − 1 − i], for i from 0 to n/2 − 1. "Swap ends, recurse on the middle" handles one pair per call, so it needs n / 2 frames and overflows the default stack at n = 10<sup>5</sup>. Instead, recurse on the <b>range of pairs</b>: one pair → swap it; otherwise split the range in half and recurse on each half. Same n / 2 swaps, still in place, but the depth is only about log₂(n / 2).</p>`,
      code: `
        class Solution {
            public void reverseString(char[] s) {
                swapPairs(s, 0, s.length / 2);     // pairs 0 .. n/2 - 1
            }

            // Pair i = s[i] and s[n - 1 - i]. Swap every pair in [lo, hi).
            private void swapPairs(char[] s, int lo, int hi) {
                if (hi - lo <= 0) return;          // base: no pairs (n = 0 or 1)
                if (hi - lo == 1) {                // base: one pair -> swap it
                    int j = s.length - 1 - lo;
                    char t = s[lo];
                    s[lo] = s[j];
                    s[j] = t;
                    return;
                }
                int mid = (lo + hi) >>> 1;         // split the pairs in half
                swapPairs(s, lo, mid);             // depth is only log2(n / 2),
                swapPairs(s, mid, hi);             // so n = 10^5 needs about 16 frames
            }

            public static void main(String[] args) {
                char[] s = "hello".toCharArray();
                new Solution().reverseString(s);
                System.out.println(new String(s));   // olleh
            }
        }`,
      alt: [
        { lang: 'python', code: `def reverse_string(s: list[str]) -> None:
    n = len(s)

    def swap_pairs(lo: int, hi: int) -> None:
        # pair i = s[i] and s[n - 1 - i]; swap every pair in [lo, hi)
        if hi - lo <= 0:
            return                      # no pairs (n = 0 or 1)
        if hi - lo == 1:
            s[lo], s[n - 1 - lo] = s[n - 1 - lo], s[lo]
            return
        mid = (lo + hi) // 2            # split the pairs: depth is only log2(n / 2),
        swap_pairs(lo, mid)             # far below Python's 1000-frame limit
        swap_pairs(mid, hi)

    swap_pairs(0, n // 2)` },
        { lang: 'js', code: `function reverseString(s) {
  const n = s.length;
  // pair i = s[i] and s[n - 1 - i]; swap every pair in [lo, hi)
  const swapPairs = (lo, hi) => {
    if (hi - lo <= 0) return;            // no pairs (n = 0 or 1)
    if (hi - lo === 1) {
      const j = n - 1 - lo;
      [s[lo], s[j]] = [s[j], s[lo]];
      return;
    }
    const mid = (lo + hi) >>> 1;         // split the pairs: depth log2(n / 2), not n / 2
    swapPairs(lo, mid);
    swapPairs(mid, hi);
  };
  swapPairs(0, Math.floor(n / 2));
}` },
        { lang: 'cpp', code: `class Solution {
public:
    void reverseString(vector<char>& s) {
        swapPairs(s, 0, (int)s.size() / 2);   // pairs 0 .. n/2 - 1
    }
private:
    // pair i = s[i] and s[n - 1 - i]; swap every pair in [lo, hi)
    void swapPairs(vector<char>& s, int lo, int hi) {
        if (hi - lo <= 0) return;             // no pairs (n = 0 or 1)
        if (hi - lo == 1) { swap(s[lo], s[s.size() - 1 - lo]); return; }
        int mid = lo + (hi - lo) / 2;         // split the pairs: depth log2(n / 2)
        swapPairs(s, lo, mid);
        swapPairs(s, mid, hi);
    }
};` }
      ],
      dry: { head: ['call', 'pairs [lo, hi)', 'action', 's after'], rows: [['swapPairs(0, 2)', '[0, 2)', 'two pairs → split at mid = 1', 'hello'], ['swapPairs(0, 1)', '[0, 1)', 'one pair: s[0] h ↔ s[4] o', 'oellh'], ['swapPairs(1, 2)', '[1, 2)', 'one pair: s[1] e ↔ s[3] l', 'olleh'], ['done', '—', H.c('g', "middle 'l' (index 2) never moves"), H.c('p', 'olleh')]] },
      complexity: `<p><b>Time O(n)</b>: n/2 swaps plus about n/2 internal calls. <b>Space O(log n)</b> stack (about 16 frames for n = 10<sup>5</sup>), versus O(n) for the one-pair-per-call version; the iterative two-pointer loop is O(1).</p>`,
      followUps: ['Reverse only the vowels', 'Reverse words in a sentence', 'Reverse a linked list recursively']
    }
  });

  practice.push({
    title: 'Binary Strings Without Consecutive 1s',
    level: 'Easy',
    tags: ['backtracking', 'pruning', 'strings'],
    companies: ['Amazon', 'Flipkart'],
    statement: `<p>Given <code>n</code>, generate all binary strings of length n that have <b>no two consecutive 1s</b>, in increasing (lexicographic) order.</p>`,
    constraints: `1 ≤ n ≤ 20 (the answer count is the Fibonacci number F(n + 2), e.g. 17,711 for n = 20)`,
    example: `<p>Input <b>n = 3</b> → Output: ${H.chips(['000', '001', '010', '100', '101'])}</p>
      <p>Why: of the 8 binary strings, ${H.c('r', '011, 110, 111')} contain "11", so 5 remain (= F(5)).</p>`,
    brute: {
      why: `<p>Generate all 2<sup>n</sup> strings and filter. For n = 20 that is 1,048,576 strings checked in O(n) each, to keep only 17,711 — 98% of the work thrown away. Pruning "never place a 1 right after a 1" means we only ever build valid prefixes.</p>`,
      code: {
          lang: 'java',
          code: `
        List<String> brute(int n) {
            List<String> res = new ArrayList<>();
            for (int m = 0; m < (1 << n); m++) {
                if ((m & (m >> 1)) != 0) continue;        // two adjacent set bits = "11"
                StringBuilder sb = new StringBuilder(Integer.toBinaryString(m));
                while (sb.length() < n) sb.insert(0, '0'); // left-pad to length n
                res.add(sb.toString());
            }
            return res;
        }`,
          alt: [
            { lang: 'python', code: `def generate(n):
    res = []
    for m in range(1 << n):
        if m & (m >> 1) != 0:
            continue                               # two adjacent set bits = "11"
        res.append(format(m, 'b').zfill(n))        # left-pad to length n
    return res` },
            { lang: 'js', code: `function generate(n) {
  const res = [];
  for (let m = 0; m < (1 << n); m++) {
    if ((m & (m >> 1)) !== 0) continue;            // two adjacent set bits = "11"
    res.push(m.toString(2).padStart(n, '0'));      // left-pad to length n
  }
  return res;
}` },
            { lang: 'cpp', code: `vector<string> generate(int n) {
    vector<string> res;
    for (int m = 0; m < (1 << n); m++) {
        if ((m & (m >> 1)) != 0) continue;         // two adjacent set bits = "11"
        string s(n, '0');                          // left-padded to length n
        for (int i = 0; i < n; i++) if ((m >> i) & 1) s[n - 1 - i] = '1';
        res.push_back(s);
    }
    return res;
}` }
          ]
        }
    },
    mcq: {
      q: `Partial string "10". Which characters may come next?`,
      options: ['Only 0', 'Only 1', 'Both 0 and 1', 'Neither'],
      answer: 2,
      explain: `The last character is 0, so either "100" or "101" keeps the rule. Only after a 1 is the next character forced to be 0.`
    },
    hints: [
      `<p><b>Aha:</b> the only forbidden move is placing a 1 immediately after a 1. Decide character by character and check just the previous one.</p>`,
      `<p>Backtrack with a character array or string builder holding the current prefix. Choices per position: '0' always; '1' only if the previous char is not '1'.</p>`,
      `<p>Try '0' before '1' to get lexicographic order. Recipe: if len == n save; append '0', recurse, delete; if len == 0 or last != '1': append '1', recurse, delete.</p>`
    ],
    tests: { sig: 'int -> list<string>', fn: 'generate', check: "(a, out, exp) => { if (!Array.isArray(out)) return false; if (Array.isArray(exp)) return JSON.stringify(out) === JSON.stringify(exp); if (out.length !== exp) return false; for (let i = 0; i < out.length; i++) { const s = out[i]; if (typeof s !== 'string' || s.length !== a[0] || /[^01]/.test(s) || s.includes('11')) return false; if (i && !(out[i - 1] < s)) return false; } return true; }", cases: [
      [[1],["0","1"]],
      [[2],["00","01","10"]],
      [[3],["000","001","010","100","101"]],
      [[4],["0000","0001","0010","0100","0101","1000","1001","1010"]],
      [[5],["00000","00001","00010","00100","00101","01000","01001","01010","10000","10001","10010","10100","10101"]],
      [[12],377],
      [[20],17711]
    ] },
    solution: {
      approach: `<p>Backtracking with a one-character look-back prune. Every leaf is valid, so the work is proportional to the output.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public List<String> generate(int n) {
                List<String> res = new ArrayList<>();
                bt(n, new StringBuilder(), res);
                return res;
            }

            private void bt(int n, StringBuilder sb, List<String> res) {
                if (sb.length() == n) {
                    res.add(sb.toString());
                    return;
                }
                sb.append('0');                                   // '0' is always safe
                bt(n, sb, res);
                sb.deleteCharAt(sb.length() - 1);
                if (sb.length() == 0 || sb.charAt(sb.length() - 1) != '1') {
                    sb.append('1');                               // '1' only after a '0' (or at start)
                    bt(n, sb, res);
                    sb.deleteCharAt(sb.length() - 1);
                }
            }

            public static void main(String[] args) {
                System.out.println(new Solution().generate(3));   // [000, 001, 010, 100, 101]
            }
        }`,
      alt: [
        { lang: 'python', code: `def generate(n: int) -> list[str]:
    res, sb = [], []

    def bt() -> None:
        if len(sb) == n:
            res.append("".join(sb))
            return
        sb.append("0")                  # '0' is always safe
        bt()
        sb.pop()
        if not sb or sb[-1] != "1":     # '1' only after a '0' (or at the start)
            sb.append("1")
            bt()
            sb.pop()

    bt()
    return res` },
        { lang: 'js', code: `function generate(n) {
  const res = [], sb = [];
  const bt = () => {
    if (sb.length === n) { res.push(sb.join('')); return; }
    sb.push('0'); bt(); sb.pop();        // '0' is always safe
    if (sb.length === 0 || sb[sb.length - 1] !== '1') {
      sb.push('1'); bt(); sb.pop();      // '1' only after a '0' (or at the start)
    }
  };
  bt();
  return res;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<string> generate(int n) {
        vector<string> res;
        string sb;
        bt(n, sb, res);
        return res;
    }
private:
    void bt(int n, string& sb, vector<string>& res) {
        if ((int)sb.size() == n) { res.push_back(sb); return; }
        sb.push_back('0'); bt(n, sb, res); sb.pop_back();          // '0' is always safe
        if (sb.empty() || sb.back() != '1') {                     // '1' only after a '0'
            sb.push_back('1'); bt(n, sb, res); sb.pop_back();
        }
    }
};` }
      ],
      dry: { head: ['prefix', 'last char', 'allowed', 'event'], rows: [['""', '—', '0, 1', 'try 0'], ['"00"', '0', '0, 1', '→ 000, 001 saved'], ['"01"', '1', '0 only', '→ 010 saved'], ['"1"', '1', '0 only', '→ 100, 101 saved']] },
      complexity: `<p><b>Time O(n · F(n+2))</b> ≈ O(n · 1.618<sup>n</sup>): one O(n) copy per answer. <b>Space O(n)</b> recursion + builder.</p>`,
      followUps: ['Only count them (it is Fibonacci — DP in O(n))', 'No three consecutive 1s', 'Count integers ≤ N without consecutive 1s (digit DP)']
    }
  });

  practice.push({
    title: 'Sum of All Subset XOR Totals',
    level: 'Easy',
    tags: ['subsets', 'pick / not-pick', 'bit manipulation'],
    companies: ['Google', 'Amazon'],
    statement: `<p>The XOR total of an array is the XOR of all its elements (0 for the empty array). Given <code>nums</code>, return the <b>sum of XOR totals over every subset</b> of nums.</p>`,
    constraints: `1 ≤ nums.length ≤ 12, 1 ≤ nums[i] ≤ 20`,
    example: `${H.arr([1, 3], { label: 'nums' })}
      ${H.table(['subset', 'XOR'], [['[]', '0'], ['[1]', '1'], ['[3]', '3'], ['[1,3]', '1 ^ 3 = 2']])}
      <p>Output: 0 + 1 + 3 + 2 = ${H.c('p', '<b>6</b>')}.</p>`,
    brute: {
      why: `<p>Build every subset as a list, then XOR its elements: 2<sup>n</sup> lists × O(n) each plus the memory for all lists. Correct (n ≤ 12 → 4,096 subsets) but it stores data you never need — you only need a running XOR value per branch.</p>`,
      code: {
          lang: 'java',
          code: `
        int brute(int[] nums) {
            int n = nums.length, total = 0;
            for (int mask = 0; mask < (1 << n); mask++) {
                int x = 0;
                for (int j = 0; j < n; j++) if ((mask >> j & 1) == 1) x ^= nums[j];
                total += x;
            }
            return total;
        }`,
          alt: [
            { lang: 'python', code: `def subset_xor_sum(nums):
    n, total = len(nums), 0
    for mask in range(1 << n):
        x = 0
        for j in range(n):
            if (mask >> j) & 1 == 1:
                x ^= nums[j]
        total += x
    return total` },
            { lang: 'js', code: `function subsetXORSum(nums) {
  const n = nums.length;
  let total = 0;
  for (let mask = 0; mask < (1 << n); mask++) {
    let x = 0;
    for (let j = 0; j < n; j++) if (((mask >> j) & 1) === 1) x ^= nums[j];
    total += x;
  }
  return total;
}` },
            { lang: 'cpp', code: `int subsetXORSum(vector<int>& nums) {
    int n = nums.size(), total = 0;
    for (int mask = 0; mask < (1 << n); mask++) {
        int x = 0;
        for (int j = 0; j < n; j++) if (((mask >> j) & 1) == 1) x ^= nums[j];
        total += x;
    }
    return total;
}` }
          ]
        }
    },
    mcq: {
      q: `In pick/not-pick, what should the recursion carry so that no list is ever built?`,
      options: ['The current subset as a List', 'Only the index i and the running XOR', 'A HashSet of used numbers', 'The total sum so far of all subsets'],
      answer: 1,
      explain: `The leaf only needs the XOR of the picked elements. Passing xr ^ nums[i] (pick) or xr (skip) as an int value means no un-choose is needed either.`
    },
    hints: [
      `<p><b>Aha:</b> each element is either in or out — pick/not-pick with an int accumulator instead of a list.</p>`,
      `<p>f(i, xr) = f(i + 1, xr ^ nums[i]) + f(i + 1, xr); base case i == n returns xr.</p>`,
      `<p>Expert shortcut: every bit that appears in at least one number is set in exactly half of the 2<sup>n</sup> subsets' XORs, so the answer is (OR of all nums) × 2<sup>n−1</sup>. Recipe for recursion: if i == n return xr; return f(i+1, xr ^ a[i]) + f(i+1, xr).</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'subsetXORSum', cases: [
      [[[1,3]],6],
      [[[5,1,6]],28],
      [[[3,4,5,6,7,8]],480],
      [[[1]],1],
      [[[20,20,20,20,20,20,20,20,20,20,20,20]],40960],
      [[[1,2,3,4,5,6,7,8,9,10,11,12]],30720],
      [[[2,2]],4],
      [[[16,8,4,2,1]],496]
    ] },
    solution: {
      approach: `<p>Pick/not-pick recursion returning the sum of leaf XORs; plus an O(n) formula as a follow-up.</p>`,
      code: `
        class Solution {
            public int subsetXORSum(int[] nums) {
                return f(nums, 0, 0);
            }

            private int f(int[] a, int i, int xr) {
                if (i == a.length) return xr;          // one complete subset: its XOR total
                return f(a, i + 1, xr ^ a[i])          // pick a[i]
                     + f(a, i + 1, xr);                // skip a[i]
            }

            // O(n) formula: each set bit of OR contributes in exactly half of the subsets
            public int formula(int[] nums) {
                int or = 0;
                for (int x : nums) or |= x;
                return or << (nums.length - 1);
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.subsetXORSum(new int[]{1, 3}));     // 6
                System.out.println(s.formula(new int[]{5, 1, 6}));        // 28
            }
        }`,
      alt: [
        { lang: 'python', code: `def subset_xor_sum(nums: list[int]) -> int:
    def f(i: int, xr: int) -> int:
        if i == len(nums):
            return xr                   # one finished subset: its XOR total
        return f(i + 1, xr ^ nums[i]) + f(i + 1, xr)   # pick + skip

    return f(0, 0)` },
        { lang: 'js', code: `function subsetXORSum(nums) {
  const f = (i, xr) => (i === nums.length ? xr : f(i + 1, xr ^ nums[i]) + f(i + 1, xr));
  return f(0, 0);                        // pick + skip at every index
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int subsetXORSum(vector<int>& nums) {
        return f(nums, 0, 0);
    }
private:
    int f(const vector<int>& a, int i, int xr) {
        if (i == (int)a.size()) return xr;    // one finished subset
        return f(a, i + 1, xr ^ a[i]) + f(a, i + 1, xr);   // pick + skip
    }
};` }
      ],
      dry: { head: ['path (1? 3?)', 'xr at leaf', 'running sum'], rows: [['pick, pick', '1^3 = 2', '2'], ['pick, skip', '1', '3'], ['skip, pick', '3', '6'], ['skip, skip', '0', H.c('p', '6')]] },
      complexity: `<p>Recursion: <b>O(2<sup>n</sup>)</b> time, <b>O(n)</b> stack. Formula: O(n) time, O(1) space.</p>`,
      followUps: ['Sum of subset sums (each element appears in 2<sup>n−1</sup> subsets)', 'Count subsets with XOR equal to K', 'Maximum subset XOR (linear basis — expert)']
    }
  });

  practice.push({
    title: 'Binary Watch',
    level: 'Easy',
    tags: ['backtracking', 'bit manipulation', 'combinations'],
    companies: ['Google'],
    statement: `<p>A binary watch has 4 LEDs for the hour (0–11) and 6 LEDs for the minutes (0–59). Given <code>turnedOn</code>, the number of LEDs that are on, return all possible times in any order, formatted "h:mm" (hour without leading zero, minutes with two digits).</p>`,
    constraints: `0 ≤ turnedOn ≤ 10`,
    example: `<p>Input <b>turnedOn = 1</b> → Output: ${H.chips(['0:01', '0:02', '0:04', '0:08', '0:16', '0:32', '1:00', '2:00', '4:00', '8:00'])}</p>
      <p>Why: exactly one LED lit = a single power of two, either in the hour (1, 2, 4, 8) or in the minutes (1, 2, 4, 8, 16, 32). Hour 8 + any extra LEDs could exceed 11 — those combos must be rejected for larger inputs.</p>`,
    brute: {
      why: `<p>Here the "brute force" is actually the smart move: there are only 12 × 60 = 720 times. Count the set bits of h and m and keep those with bitCount(h) + bitCount(m) == turnedOn. The backtracking version (choose which of the 10 LEDs are on) explores C(10, k) ≤ 252 LED sets — similar work, but it shows the combinations template.</p>`,
      code: {
          lang: 'java',
          code: `
        List<String> enumerate(int turnedOn) {
            List<String> res = new ArrayList<>();
            for (int h = 0; h < 12; h++)
                for (int m = 0; m < 60; m++)
                    if (Integer.bitCount(h) + Integer.bitCount(m) == turnedOn)
                        res.add(h + ":" + (m < 10 ? "0" : "") + m);
            return res;
        }`,
          alt: [
            { lang: 'python', code: `def read_binary_watch(turned_on):
    res = []
    for h in range(12):
        for m in range(60):
            if bin(h).count("1") + bin(m).count("1") == turned_on:
                res.append(f"{h}:{m:02d}")
    return res` },
            { lang: 'js', code: `function readBinaryWatch(turnedOn) {
  const bits = (x) => x.toString(2).split("1").length - 1;
  const res = [];
  for (let h = 0; h < 12; h++)
    for (let m = 0; m < 60; m++)
      if (bits(h) + bits(m) === turnedOn)
        res.push(h + ":" + (m < 10 ? "0" : "") + m);
  return res;
}` },
            { lang: 'cpp', code: `vector<string> readBinaryWatch(int turnedOn) {
    vector<string> res;
    for (int h = 0; h < 12; h++)
        for (int m = 0; m < 60; m++)
            if (__builtin_popcount(h) + __builtin_popcount(m) == turnedOn)
                res.push_back(to_string(h) + ":" + (m < 10 ? "0" : "") + to_string(m));
    return res;
}` }
          ]
        }
    },
    mcq: {
      q: `Which LED set must the backtracking solution reject?`,
      options: ['Hour LEDs 1 + 2 (hour 3)', 'Hour LEDs 4 + 8 (hour 12)', 'Minute LEDs 32 + 16 + 8 (minute 56)', 'No LEDs at all (0:00)'],
      answer: 1,
      explain: `4 + 8 = 12 is not a valid hour (0–11). Minute 56 is fine (≤ 59) and 0:00 is the answer for turnedOn = 0.`
    },
    hints: [
      `<p><b>Aha:</b> choosing which k of 10 LEDs are on is a "combinations of size k" problem; each LED adds a fixed value to the hour or the minute.</p>`,
      `<p>Values: LEDs 0–3 add 1, 2, 4, 8 to hours; LEDs 4–9 add 1, 2, 4, 8, 16, 32 to minutes. Backtrack(start, k, h, m) with a start index so each set is built once.</p>`,
      `<p>Prune when h &gt; 11 or m &gt; 59 (values only grow). Recipe: if k == 0 save formatted time; for i from start..9: add its value, if still valid recurse(i+1, k−1), (values passed by copy, so no undo).</p>`
    ],
    tests: { sig: 'int -> list<string>', fn: 'readBinaryWatch', cmp: "set", cases: [
      [[0],["0:00"]],
      [[1],["0:01","0:02","0:04","0:08","0:16","0:32","1:00","2:00","4:00","8:00"]],
      [[2],["0:03","0:05","0:06","0:09","0:10","0:12","0:17","0:18","0:20","0:24","0:33","0:34","0:36","0:40","0:48","1:01","1:02","1:04","1:08","1:16","1:32","2:01","2:02","2:04","2:08","2:16","2:32","3:00","4:01","4:02","4:04","4:08","4:16","4:32","5:00","6:00","8:01","8:02","8:04","8:08","8:16","8:32","9:00","10:00"]],
      [[5],["0:31","0:47","0:55","0:59","1:15","1:23","1:27","1:29","1:30","1:39","1:43","1:45","1:46","1:51","1:53","1:54","1:57","1:58","2:15","2:23","2:27","2:29","2:30","2:39","2:43","2:45","2:46","2:51","2:53","2:54","2:57","2:58","3:07","3:11","3:13","3:14","3:19","3:21","3:22","3:25","3:26","3:28","3:35","3:37","3:38","3:41","3:42","3:44","3:49","3:50","3:52","3:56","4:15","4:23","4:27","4:29","4:30","4:39","4:43","4:45","4:46","4:51","4:53","4:54","4:57","4:58","5:07","5:11","5:13","5:14","5:19","5:21","5:22","5:25","5:26","5:28","5:35","5:37","5:38","5:41","5:42","5:44","5:49","5:50","5:52","5:56","6:07","6:11","6:13","6:14","6:19","6:21","6:22","6:25","6:26","6:28","6:35","6:37","6:38","6:41","6:42","6:44","6:49","6:50","6:52","6:56","7:03","7:05","7:06","7:09","7:10","7:12","7:17","7:18","7:20","7:24","7:33","7:34","7:36","7:40","7:48","8:15","8:23","8:27","8:29","8:30","8:39","8:43","8:45","8:46","8:51","8:53","8:54","8:57","8:58","9:07","9:11","9:13","9:14","9:19","9:21","9:22","9:25","9:26","9:28","9:35","9:37","9:38","9:41","9:42","9:44","9:49","9:50","9:52","9:56","10:07","10:11","10:13","10:14","10:19","10:21","10:22","10:25","10:26","10:28","10:35","10:37","10:38","10:41","10:42","10:44","10:49","10:50","10:52","10:56","11:03","11:05","11:06","11:09","11:10","11:12","11:17","11:18","11:20","11:24","11:33","11:34","11:36","11:40","11:48"]],
      [[8],["7:31","7:47","7:55","7:59","11:31","11:47","11:55","11:59"]],
      [[9],[]],
      [[10],[]]
    ] },
    solution: {
      approach: `<p>Combinations backtracking over the 10 LEDs with a start index, carrying hour and minute as int parameters (immutable state = no un-choose needed) and pruning invalid times.</p>`,
      code: `
        import java.util.*;

        class Solution {
            private static final int[] VAL = {1, 2, 4, 8, 1, 2, 4, 8, 16, 32}; // first 4 = hour LEDs

            public List<String> readBinaryWatch(int turnedOn) {
                List<String> res = new ArrayList<>();
                bt(0, turnedOn, 0, 0, res);
                return res;
            }

            private void bt(int start, int k, int h, int m, List<String> res) {
                if (k == 0) {
                    res.add(h + ":" + (m < 10 ? "0" : "") + m);
                    return;
                }
                for (int i = start; i < 10; i++) {
                    int nh = h, nm = m;
                    if (i < 4) nh += VAL[i]; else nm += VAL[i];
                    if (nh > 11 || nm > 59) continue;    // invalid time -> prune this LED
                    bt(i + 1, k - 1, nh, nm, res);       // LEDs used at most once
                }
            }

            public static void main(String[] args) {
                System.out.println(new Solution().readBinaryWatch(1));
            }
        }`,
      alt: [
        { lang: 'python', code: `VAL = [1, 2, 4, 8, 1, 2, 4, 8, 16, 32]   # first 4 LEDs = hours, last 6 = minutes


def read_binary_watch(turned_on: int) -> list[str]:
    res = []

    def bt(start: int, k: int, h: int, m: int) -> None:
        if k == 0:
            res.append(f"{h}:{m:02d}")
            return
        for i in range(start, 10):
            nh, nm = (h + VAL[i], m) if i < 4 else (h, m + VAL[i])
            if nh <= 11 and nm <= 59:   # prune invalid times
                bt(i + 1, k - 1, nh, nm)

    bt(0, turned_on, 0, 0)
    return res` },
        { lang: 'js', code: `function readBinaryWatch(turnedOn) {
  const VAL = [1, 2, 4, 8, 1, 2, 4, 8, 16, 32];   // first 4 LEDs = hours
  const res = [];
  const bt = (start, k, h, m) => {
    if (k === 0) { res.push(h + ':' + String(m).padStart(2, '0')); return; }
    for (let i = start; i < 10; i++) {
      const nh = i < 4 ? h + VAL[i] : h, nm = i < 4 ? m : m + VAL[i];
      if (nh > 11 || nm > 59) continue;  // invalid time: prune
      bt(i + 1, k - 1, nh, nm);
    }
  };
  bt(0, turnedOn, 0, 0);
  return res;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<string> readBinaryWatch(int turnedOn) {
        vector<string> res;
        bt(0, turnedOn, 0, 0, res);
        return res;
    }
private:
    static constexpr int VAL[10] = {1, 2, 4, 8, 1, 2, 4, 8, 16, 32};   // first 4 = hours

    void bt(int start, int k, int h, int m, vector<string>& res) {
        if (k == 0) {
            res.push_back(to_string(h) + ":" + (m < 10 ? "0" : "") + to_string(m));
            return;
        }
        for (int i = start; i < 10; i++) {
            int nh = h, nm = m;
            (i < 4 ? nh : nm) += VAL[i];
            if (nh > 11 || nm > 59) continue; // invalid time: prune
            bt(i + 1, k - 1, nh, nm, res);
        }
    }
};` }
      ],
      dry: { head: ['LEDs chosen', 'h', 'm', 'event'], rows: [['{hour-1}', '1', '0', H.c('g', '"1:00"')], ['{hour-8}', '8', '0', H.c('g', '"8:00"')], ['{min-32}', '0', '32', H.c('g', '"0:32"')], ['{hour-4, hour-8} (k=2)', '12', '0', H.c('r', 'pruned')]] },
      complexity: `<p><b>Time O(C(10, k))</b> ≤ 252 sets — effectively O(1). <b>Space O(k)</b> recursion depth.</p>`,
      followUps: ['Solve it with a 720-iteration bit-count loop and compare clarity', 'Generalise to a 24-hour watch with 5 hour LEDs']
    }
  });

  // ===================== PRACTICE: MEDIUM =====================
  practice.push({
    title: 'K-th Symbol in Grammar',
    level: 'Medium',
    tags: ['recursion', 'divide and conquer', 'bit manipulation'],
    companies: ['Amazon', 'Meta'],
    statement: `<p>Row 1 is "0". Each next row replaces every 0 with "01" and every 1 with "10". Given <code>n</code> and <code>k</code> (1-indexed), return the k-th symbol of row n.</p>`,
    constraints: `1 ≤ n ≤ 30, 1 ≤ k ≤ 2<sup>n−1</sup>`,
    example: `${H.table(['row', 'string'], [['1', '0'], ['2', '01'], ['3', '0110'], ['4', '0110' + H.c('p', '1') + '001']])}
      <p>n = 4, k = 5 → ${H.c('p', '<b>1</b>')}. Why: each row is the previous row followed by its flipped copy (row 4 = 0110 + 1001). Position 5 is the first symbol of the flipped half, i.e. row 3's first symbol (0) flipped → 1.</p>`,
    brute: {
      why: `<p>Build the rows as strings. Row n has 2<sup>n−1</sup> characters — for n = 30 that is 536 million chars (over 1 GB in Java). The waste: we build an entire row to read one character.</p>`,
      code: {
          lang: 'java',
          code: `
        int brute(int n, int k) {
            StringBuilder row = new StringBuilder("0");
            for (int i = 2; i <= n; i++) {
                StringBuilder next = new StringBuilder();
                for (int j = 0; j < row.length(); j++) next.append(row.charAt(j) == '0' ? "01" : "10");
                row = next;
            }
            return row.charAt(k - 1) - '0';
        }`,
          alt: [
            { lang: 'python', code: `def kth_grammar(n, k):
    row = "0"
    for i in range(2, n + 1):
        row = "".join("01" if ch == '0' else "10" for ch in row)
    return int(row[k - 1])` },
            { lang: 'js', code: `function kthGrammar(n, k) {
  let row = "0";
  for (let i = 2; i <= n; i++) {
    let next = "";
    for (let j = 0; j < row.length; j++) next += row[j] === '0' ? "01" : "10";
    row = next;
  }
  return row.charCodeAt(k - 1) - 48;
}` },
            { lang: 'cpp', code: `int kthGrammar(int n, int k) {
    string row = "0";
    for (int i = 2; i <= n; i++) {
        string next;
        for (size_t j = 0; j < row.size(); j++) next += row[j] == '0' ? "01" : "10";
        row = next;
    }
    return row[k - 1] - '0';
}` }
          ]
        }
    },
    mcq: {
      q: `Symbol k of row n is produced by which symbol of row n − 1?`,
      options: ['Symbol k', 'Symbol ⌈k / 2⌉ (its parent)', 'Symbol 2k', 'Symbol n − k'],
      answer: 1,
      explain: `Each parent produces two children, so positions 2p − 1 and 2p come from position p. Odd k = left child (same as parent), even k = right child (flipped).`
    },
    hints: [
      `<p><b>Aha:</b> the rows form a binary tree: parent symbol p makes children (p, 1 − p). The k-th symbol only depends on its parent ⌈k/2⌉ in row n − 1.</p>`,
      `<p>Recurse on (n − 1, (k + 1) / 2); if k is odd return the parent, else return 1 − parent. Depth n ≤ 30.</p>`,
      `<p>Base case n == 1 → 0. Bonus: the answer equals the parity of the number of 1-bits in k − 1, i.e. <code>Integer.bitCount(k - 1) &amp; 1</code> (Python <code>(k - 1).bit_count() &amp; 1</code>, C++ <code>__builtin_popcount(k - 1) &amp; 1</code>).</p>`
    ],
    tests: { sig: 'int int -> int', fn: 'kthGrammar', cases: [
      [[1,1],0],
      [[2,1],0],
      [[2,2],1],
      [[4,5],1],
      [[5,11],0],
      [[20,524288],1],
      [[30,1],0],
      [[30,536870912],1],
      [[30,357913941],0]
    ] },
    solution: {
      approach: `<p>Recurse up the implicit binary tree: one call per row, flipping on right children.</p>`,
      code: `
        class Solution {
            public int kthGrammar(int n, int k) {
                if (n == 1) return 0;                         // row 1 is "0"
                int parent = kthGrammar(n - 1, (k + 1) / 2);  // the symbol that produced position k
                return (k % 2 == 1) ? parent : 1 - parent;    // left child same, right child flipped
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.kthGrammar(4, 5));       // 1
                System.out.println(Integer.bitCount(5 - 1) & 1); // 1 (closed form)
            }
        }`,
      alt: [
        { lang: 'python', code: `def kth_grammar(n: int, k: int) -> int:
    if n == 1:
        return 0                                # row 1 is "0"
    parent = kth_grammar(n - 1, (k + 1) // 2)   # the symbol that produced position k
    return parent if k % 2 == 1 else 1 - parent # left child same, right child flipped` },
        { lang: 'js', code: `function kthGrammar(n, k) {
  if (n === 1) return 0;                               // row 1 is "0"
  const parent = kthGrammar(n - 1, Math.floor((k + 1) / 2));
  return k % 2 === 1 ? parent : 1 - parent;            // right child is flipped
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int kthGrammar(int n, int k) {
        if (n == 1) return 0;                             // row 1 is "0"
        int parent = kthGrammar(n - 1, (k + 1) / 2);      // the symbol that produced k
        return k % 2 == 1 ? parent : 1 - parent;          // right child is flipped
    }
};` }
      ],
      dry: { head: ['call', 'k odd?', 'parent value', 'returns'], rows: [['(1, 1)', '—', '—', H.c('g', '0 (base)')], ['(2, 2)', 'no (right child)', '0', '1 − 0 = 1'], ['(3, 3)', 'yes (left child)', '1', '1'], ['(4, 5)', 'yes (left child)', '1', H.c('p', '1')]] },
      complexity: `<p><b>Time O(n)</b>, <b>Space O(n)</b> stack (or O(1) with the bit-count formula).</p>`,
      followUps: ['Prove the bitCount formula', 'Return the count of 1s in the first k symbols of row n']
    }
  });

  practice.push({
    title: 'Combinations (choose k of 1..n)',
    level: 'Medium',
    tags: ['backtracking', 'start index', 'pruning'],
    companies: ['Amazon', 'Google', 'Adobe'],
    statement: `<p>Given integers <code>n</code> and <code>k</code>, return all combinations of k numbers chosen from 1..n, in any order.</p>`,
    constraints: `1 ≤ n ≤ 20, 1 ≤ k ≤ n`,
    example: `<p>n = 4, k = 2 → ${H.chips(['[1,2]', '[1,3]', '[1,4]', '[2,3]', '[2,4]', '[3,4]'])}</p><p>Why: C(4, 2) = 4! / (2!·2!) = 6. [2,1] is the same combination as [1,2], so only increasing lists are produced.</p>`,
    brute: {
      why: `<p>Enumerate all 2<sup>n</sup> bitmasks and keep those with exactly k bits. For n = 20, k = 2 that is 1,048,576 masks to find 190 answers. Backtracking with a start index and a "not enough numbers left" prune visits only nodes that can still reach size k.</p>`,
      code: {
          lang: 'java',
          code: `
        List<List<Integer>> brute(int n, int k) {
            List<List<Integer>> res = new ArrayList<>();
            for (int m = 0; m < (1 << n); m++) {
                if (Integer.bitCount(m) != k) continue;
                List<Integer> c = new ArrayList<>();
                for (int j = 0; j < n; j++) if ((m >> j & 1) == 1) c.add(j + 1);
                res.add(c);
            }
            return res;
        }`,
          alt: [
            { lang: 'python', code: `def combine(n, k):
    res = []
    for m in range(1 << n):
        if bin(m).count("1") != k:
            continue
        res.append([j + 1 for j in range(n) if (m >> j) & 1 == 1])
    return res` },
            { lang: 'js', code: `function combine(n, k) {
  const res = [];
  for (let m = 0; m < (1 << n); m++) {
    const c = [];
    for (let j = 0; j < n; j++) if (((m >> j) & 1) === 1) c.push(j + 1);
    if (c.length !== k) continue;
    res.push(c);
  }
  return res;
}` },
            { lang: 'cpp', code: `vector<vector<int>> combine(int n, int k) {
    vector<vector<int>> res;
    for (int m = 0; m < (1 << n); m++) {
        if (__builtin_popcount(m) != k) continue;
        vector<int> c;
        for (int j = 0; j < n; j++) if (((m >> j) & 1) == 1) c.push_back(j + 1);
        res.push_back(c);
    }
    return res;
}` }
          ]
        }
    },
    mcq: {
      q: `n = 5, k = 3, cur = [4]. What should happen?`,
      options: ['Try 5 next', 'Prune: only one number (5) is left but two slots remain', 'Restart from 1', 'Save [4]'],
      answer: 1,
      explain: `Slots left = 3 − 1 = 2, numbers available after 4 = just {5}. 1 &lt; 2 → this branch can never complete. The loop bound i ≤ n − (k − size) + 1 encodes this prune.`
    },
    hints: [
      `<p><b>Aha:</b> it is Subsets with a fixed size — the for-loop style with a start index, saving only when size == k.</p>`,
      `<p>bt(start, cur): for i from start to n: add i, bt(i + 1), remove.</p>`,
      `<p>Prune: the loop only needs to go up to <code>n − (k − cur.size()) + 1</code>. Recipe: if size == k save copy; for i in start..n−(k−size)+1: add; bt(i+1); remove.</p>`
    ],
    tests: { sig: 'int int -> list<list<int>>', fn: 'combine', cmp: "sets", cases: [
      [[4,2],[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]],
      [[1,1],[[1]]],
      [[3,3],[[1,2,3]]],
      [[5,1],[[1],[2],[3],[4],[5]]],
      [[5,4],[[1,2,3,4],[1,2,3,5],[1,2,4,5],[1,3,4,5],[2,3,4,5]]],
      [[20,20],[[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]]],
      [[20,1],[[1],[2],[3],[4],[5],[6],[7],[8],[9],[10],[11],[12],[13],[14],[15],[16],[17],[18],[19],[20]]],
      [[6,3],[[1,2,3],[1,2,4],[1,2,5],[1,2,6],[1,3,4],[1,3,5],[1,3,6],[1,4,5],[1,4,6],[1,5,6],[2,3,4],[2,3,5],[2,3,6],[2,4,5],[2,4,6],[2,5,6],[3,4,5],[3,4,6],[3,5,6],[4,5,6]]]
    ] },
    solution: {
      approach: `<p>Start-index backtracking with an upper-bound prune so every visited node can still complete.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public List<List<Integer>> combine(int n, int k) {
                List<List<Integer>> res = new ArrayList<>();
                bt(n, k, 1, new ArrayList<>(), res);
                return res;
            }

            private void bt(int n, int k, int start, List<Integer> cur, List<List<Integer>> res) {
                if (cur.size() == k) {
                    res.add(new ArrayList<>(cur));
                    return;
                }
                int need = k - cur.size();
                for (int i = start; i <= n - need + 1; i++) {   // leave room for the remaining picks
                    cur.add(i);
                    bt(n, k, i + 1, cur, res);
                    cur.remove(cur.size() - 1);
                }
            }

            public static void main(String[] args) {
                System.out.println(new Solution().combine(4, 2)); // [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]
            }
        }`,
      alt: [
        { lang: 'python', code: `def combine(n: int, k: int) -> list[list[int]]:
    res, cur = [], []

    def bt(start: int) -> None:
        if len(cur) == k:
            res.append(cur[:])
            return
        need = k - len(cur)
        for i in range(start, n - need + 2):    # leave room for the remaining picks
            cur.append(i)
            bt(i + 1)
            cur.pop()

    bt(1)
    return res` },
        { lang: 'js', code: `function combine(n, k) {
  const res = [], cur = [];
  const bt = (start) => {
    if (cur.length === k) { res.push([...cur]); return; }
    const need = k - cur.length;
    for (let i = start; i <= n - need + 1; i++) {      // leave room for the rest
      cur.push(i);
      bt(i + 1);
      cur.pop();
    }
  };
  bt(1);
  return res;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> combine(int n, int k) {
        vector<vector<int>> res;
        vector<int> cur;
        bt(n, k, 1, cur, res);
        return res;
    }
private:
    void bt(int n, int k, int start, vector<int>& cur, vector<vector<int>>& res) {
        if ((int)cur.size() == k) { res.push_back(cur); return; }
        int need = k - (int)cur.size();
        for (int i = start; i <= n - need + 1; i++) {     // leave room for the rest
            cur.push_back(i);
            bt(n, k, i + 1, cur, res);
            cur.pop_back();
        }
    }
};` }
      ],
      dry: { head: ['cur', 'start', 'loop range', 'event'], rows: [['[]', '1', '1..3', 'pick 1'], ['[1]', '2', '2..4', '[1,2] [1,3] [1,4]'], ['[]', '1', 'i = 2', '[2,3] [2,4]'], ['[]', '1', 'i = 3', '[3,4]; i = 4 excluded by prune']] },
      complexity: `<p><b>Time O(k · C(n, k))</b>, <b>Space O(k)</b> recursion + cur.</p>`,
      followUps: ['Iterative lexicographic generation', 'Combination Sum III (k digits summing to n)']
    }
  });

  practice.push({
    title: 'Subsets II (input with duplicates)',
    level: 'Medium',
    tags: ['backtracking', 'subsets', 'duplicates'],
    companies: ['Meta', 'Amazon', 'Bloomberg'],
    statement: `<p>Given an integer array <code>nums</code> that <b>may contain duplicates</b>, return all possible subsets without duplicate subsets, in any order.</p>`,
    constraints: `1 ≤ nums.length ≤ 10, −10 ≤ nums[i] ≤ 10`,
    example: `${H.arr([1, 2, 2], { label: 'nums' })}<p>Output: ${H.chips(['[]', '[1]', '[1,2]', '[1,2,2]', '[2]', '[2,2]'])}</p><p>Why: 2<sup>3</sup> = 8 index-subsets, but {nums[1]} and {nums[2]} are both [2], and {1, nums[1]} and {1, nums[2]} are both [1,2] → 6 distinct.</p>`,
    brute: {
      why: `<p>Generate all 2<sup>n</sup> subsets, sort each, and insert into a <code>Set&lt;List&lt;Integer&gt;&gt;</code>. Works for n ≤ 10, but every duplicate costs O(n log n) to sort plus hashing, and with many equal values (e.g. ten 2s) you build 1,024 lists to keep 11.</p>`,
      code: {
          lang: 'java',
          code: `
        List<List<Integer>> brute(int[] nums) {
            Arrays.sort(nums);                    // sorted input -> each generated subset is sorted
            Set<List<Integer>> set = new HashSet<>();
            int n = nums.length;
            for (int m = 0; m < (1 << n); m++) {
                List<Integer> s = new ArrayList<>();
                for (int j = 0; j < n; j++) if ((m >> j & 1) == 1) s.add(nums[j]);
                set.add(s);
            }
            return new ArrayList<>(set);
        }`,
          alt: [
            { lang: 'python', code: `def subsets_with_dup(nums):
    nums.sort()                           # sorted input -> each generated subset is sorted
    seen = set()
    n = len(nums)
    for m in range(1 << n):
        s = tuple(nums[j] for j in range(n) if (m >> j) & 1 == 1)
        seen.add(s)
    return [list(s) for s in seen]` },
            { lang: 'js', code: `function subsetsWithDup(nums) {
  nums.sort((a, b) => a - b);             // sorted input -> each generated subset is sorted
  const seen = new Map();
  const n = nums.length;
  for (let m = 0; m < (1 << n); m++) {
    const s = [];
    for (let j = 0; j < n; j++) if (((m >> j) & 1) === 1) s.push(nums[j]);
    seen.set(s.join(","), s);
  }
  return [...seen.values()];
}` },
            { lang: 'cpp', code: `vector<vector<int>> subsetsWithDup(vector<int>& nums) {
    sort(nums.begin(), nums.end());       // sorted input -> each generated subset is sorted
    set<vector<int>> seen;
    int n = nums.size();
    for (int m = 0; m < (1 << n); m++) {
        vector<int> s;
        for (int j = 0; j < n; j++) if (((m >> j) & 1) == 1) s.push_back(nums[j]);
        seen.insert(s);
    }
    return vector<vector<int>>(seen.begin(), seen.end());
}` }
          ]
        }
    },
    mcq: {
      q: `In the loop-style recursion the skip condition is <code>j &gt; start &amp;&amp; nums[j] == nums[j − 1]</code>. What breaks if you write <code>j &gt; 0</code> instead?`,
      options: ['Nothing', '[2,2] is never generated', 'Duplicates appear', 'Infinite recursion'],
      answer: 1,
      explain: `Inside the branch [2] (start = 2), j = 2 has nums[2] == nums[1]; with j &gt; 0 it is skipped, so the second 2 can never follow the first. j &gt; start only skips equal values at the same level.`
    },
    hints: [
      `<p><b>Aha:</b> duplicates appear when two branches at the <i>same level</i> start with equal values.</p>`,
      `<p>Sort, then use the for-loop style (every node is an answer) with a start index.</p>`,
      `<p>Skip <code>j &gt; start &amp;&amp; nums[j] == nums[j−1]</code>. Recipe: save copy of cur; for j from start: skip rule; add; bt(j+1); remove last.</p>`
    ],
    tests: { sig: 'int[] -> list<list<int>>', fn: 'subsetsWithDup', cmp: "sets", cases: [
      [[[1,2,2]],[[],[1],[1,2],[1,2,2],[2],[2,2]]],
      [[[0]],[[],[0]]],
      [[[4,4,4,1,4]],[[],[1],[1,4],[1,4,4],[1,4,4,4],[1,4,4,4,4],[4],[4,4],[4,4,4],[4,4,4,4]]],
      [[[-1,1,-1]],[[],[-1],[-1,-1],[-1,-1,1],[-1,1],[1]]],
      [[[2,2,2,2,2,2,2,2,2,2]],[[],[2],[2,2],[2,2,2],[2,2,2,2],[2,2,2,2,2],[2,2,2,2,2,2],[2,2,2,2,2,2,2],[2,2,2,2,2,2,2,2],[2,2,2,2,2,2,2,2,2],[2,2,2,2,2,2,2,2,2,2]]],
      [[[3,1,2]],[[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]]],
      [[[1,1,2,2]],[[],[1],[1,1],[1,1,2],[1,1,2,2],[1,2],[1,2,2],[2],[2,2]]]
    ] },
    solution: {
      approach: `<p>Sorted for-loop backtracking with same-level duplicate skipping; each distinct multiset subset is generated exactly once.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public List<List<Integer>> subsetsWithDup(int[] nums) {
                Arrays.sort(nums);
                List<List<Integer>> res = new ArrayList<>();
                bt(nums, 0, new ArrayList<>(), res);
                return res;
            }

            private void bt(int[] a, int start, List<Integer> cur, List<List<Integer>> res) {
                res.add(new ArrayList<>(cur));                     // every node is a subset
                for (int j = start; j < a.length; j++) {
                    if (j > start && a[j] == a[j - 1]) continue;   // same value at this level: skip
                    cur.add(a[j]);
                    bt(a, j + 1, cur, res);
                    cur.remove(cur.size() - 1);
                }
            }

            public static void main(String[] args) {
                System.out.println(new Solution().subsetsWithDup(new int[]{1, 2, 2}));
                // [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]
            }
        }`,
      alt: [
        { lang: 'python', code: `def subsets_with_dup(nums: list[int]) -> list[list[int]]:
    a = sorted(nums)
    res, cur = [], []

    def bt(start: int) -> None:
        res.append(cur[:])                      # every node is a subset
        for j in range(start, len(a)):
            if j > start and a[j] == a[j - 1]:
                continue                        # same value at this level: skip
            cur.append(a[j])
            bt(j + 1)
            cur.pop()

    bt(0)
    return res` },
        { lang: 'js', code: `function subsetsWithDup(nums) {
  const a = [...nums].sort((x, y) => x - y);
  const res = [], cur = [];
  const bt = (start) => {
    res.push([...cur]);                                // every node is a subset
    for (let j = start; j < a.length; j++) {
      if (j > start && a[j] === a[j - 1]) continue;    // same value at this level
      cur.push(a[j]);
      bt(j + 1);
      cur.pop();
    }
  };
  bt(0);
  return res;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> subsetsWithDup(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        vector<vector<int>> res;
        vector<int> cur;
        bt(nums, 0, cur, res);
        return res;
    }
private:
    void bt(const vector<int>& a, int start, vector<int>& cur, vector<vector<int>>& res) {
        res.push_back(cur);                               // every node is a subset
        for (int j = start; j < (int)a.size(); j++) {
            if (j > start && a[j] == a[j - 1]) continue;  // same value at this level
            cur.push_back(a[j]);
            bt(a, j + 1, cur, res);
            cur.pop_back();
        }
    }
};` }
      ],
      dry: { head: ['cur', 'start', 'j', 'event'], rows: [['[]', '0', '—', 'save []'], ['[1]', '1', '1 then 2', 'save [1], [1,2], [1,2,2]; j = 2 at start 1 skipped'], ['[]', '0', '1', 'save [2], [2,2]'], ['[]', '0', '2', H.c('r', 'skip (equal to j = 1 at the same level)')]] },
      complexity: `<p><b>Time O(n · 2<sup>n</sup>)</b> worst case, <b>Space O(n)</b> recursion (excluding output).</p>`,
      followUps: ['Count distinct subsets using value frequencies (product of (count + 1))', 'Subsets of size k with duplicates']
    }
  });

  practice.push({
    title: 'Letter Case Permutation',
    level: 'Medium',
    tags: ['backtracking', 'strings', 'pick / not-pick'],
    companies: ['Meta', 'Microsoft'],
    statement: `<p>Given a string <code>s</code> of letters and digits, you may change any letter to lowercase or uppercase. Return a list of all possible strings, in any order.</p>`,
    constraints: `1 ≤ s.length ≤ 12; letters and digits only`,
    example: `<p>s = "a1b2" → ${H.chips(['a1b2', 'a1B2', 'A1b2', 'A1B2'])}</p><p>Why: 2 letters → 2 choices each → 2<sup>2</sup> = 4 strings; digits have only one choice.</p>`,
    brute: {
      why: `<p>Try all 2<sup>n</sup> masks over <b>every</b> position (even digits), apply case flips and de-duplicate with a Set. With 12 digits and no letters you would build 4,096 identical strings. Branching only on letters makes the tree exactly as big as the answer.</p>`,
      code: {
          lang: 'java',
          code: `
        List<String> brute(String s) {
            Set<String> set = new LinkedHashSet<>();
            int n = s.length();
            for (int m = 0; m < (1 << n); m++) {
                char[] c = s.toCharArray();
                for (int j = 0; j < n; j++)
                    if ((m >> j & 1) == 1 && Character.isLetter(c[j]))
                        c[j] = Character.isUpperCase(c[j]) ? Character.toLowerCase(c[j]) : Character.toUpperCase(c[j]);
                set.add(new String(c));
            }
            return new ArrayList<>(set);
        }`,
          alt: [
            { lang: 'python', code: `def letter_case_permutation(s):
    seen = {}                             # a dict keeps insertion order, like LinkedHashSet
    n = len(s)
    for m in range(1 << n):
        c = list(s)
        for j in range(n):
            if (m >> j) & 1 == 1 and c[j].isalpha():
                c[j] = c[j].lower() if c[j].isupper() else c[j].upper()
        seen["".join(c)] = True
    return list(seen)` },
            { lang: 'js', code: `function letterCasePermutation(s) {
  const seen = new Set();                 // a Set keeps insertion order
  const n = s.length;
  for (let m = 0; m < (1 << n); m++) {
    const c = s.split("");
    for (let j = 0; j < n; j++) {
      if (((m >> j) & 1) === 1 && /[A-Za-z]/.test(c[j]))
        c[j] = c[j] === c[j].toUpperCase() ? c[j].toLowerCase() : c[j].toUpperCase();
    }
    seen.add(c.join(""));
  }
  return [...seen];
}` },
            { lang: 'cpp', code: `vector<string> letterCasePermutation(string s) {
    vector<string> res;
    unordered_set<string> seen;
    int n = s.size();
    for (int m = 0; m < (1 << n); m++) {
        string c = s;
        for (int j = 0; j < n; j++)
            if (((m >> j) & 1) == 1 && isalpha((unsigned char)c[j]))
                c[j] = isupper((unsigned char)c[j]) ? tolower((unsigned char)c[j]) : toupper((unsigned char)c[j]);
        if (seen.insert(c).second) res.push_back(c);   // keep first-seen order, drop duplicates
    }
    return res;
}` }
          ]
        }
    },
    mcq: {
      q: `s has L letters and D digits. How many strings are returned?`,
      options: ['2<sup>L + D</sup>', '2<sup>L</sup>', 'L!', 'L · D'],
      answer: 1,
      explain: `Each letter doubles the count; digits do not branch. So the answer size is exactly 2<sup>L</sup>.`
    },
    hints: [
      `<p><b>Aha:</b> walk left to right; at a letter branch into lower/upper, at a digit just move on.</p>`,
      `<p>Mutate one character array in place (strings are immutable in Java, Python and JavaScript): set lower, recurse, set upper, recurse. Restoring is implicit because both branches overwrite the same slot.</p>`,
      `<p>Base case i == n → add <code>new String(chars)</code>. Recipe: if digit → f(i+1); else c[i]=lower; f(i+1); c[i]=upper; f(i+1).</p>`
    ],
    tests: { sig: 'string -> list<string>', fn: 'letterCasePermutation', cmp: "set", cases: [
      [["a1b2"],["A1B2","A1b2","a1B2","a1b2"]],
      [["3z4"],["3Z4","3z4"]],
      [["1"],["1"]],
      [["C"],["C","c"]],
      [["12345"],["12345"]],
      [["aB"],["AB","Ab","aB","ab"]],
      [["Zz9y"],["ZZ9Y","ZZ9y","Zz9Y","Zz9y","zZ9Y","zZ9y","zz9Y","zz9y"]]
    ] },
    solution: {
      approach: `<p>Pick-one-of-two recursion on letters only, mutating a char array.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public List<String> letterCasePermutation(String s) {
                List<String> res = new ArrayList<>();
                f(s.toCharArray(), 0, res);
                return res;
            }

            private void f(char[] c, int i, List<String> res) {
                if (i == c.length) {
                    res.add(new String(c));                 // copy of the current string
                    return;
                }
                if (Character.isDigit(c[i])) {
                    f(c, i + 1, res);                       // only one choice for digits
                    return;
                }
                c[i] = Character.toLowerCase(c[i]);
                f(c, i + 1, res);                           // branch 1: lowercase
                c[i] = Character.toUpperCase(c[i]);
                f(c, i + 1, res);                           // branch 2: uppercase
            }

            public static void main(String[] args) {
                System.out.println(new Solution().letterCasePermutation("a1b2")); // [a1b2, a1B2, A1b2, A1B2]
            }
        }`,
      alt: [
        { lang: 'python', code: `def letter_case_permutation(s: str) -> list[str]:
    res, c = [], list(s)                        # strings are immutable: edit a list

    def f(i: int) -> None:
        if i == len(c):
            res.append("".join(c))
            return
        if c[i].isdigit():
            f(i + 1)                            # digits have one choice
            return
        c[i] = c[i].lower()
        f(i + 1)                                # branch 1: lowercase
        c[i] = c[i].upper()
        f(i + 1)                                # branch 2: uppercase

    f(0)
    return res` },
        { lang: 'js', code: `function letterCasePermutation(s) {
  const res = [], c = s.split('');                     // strings are immutable
  const f = (i) => {
    if (i === c.length) { res.push(c.join('')); return; }
    if (c[i] >= '0' && c[i] <= '9') { f(i + 1); return; }   // digit: one choice
    c[i] = c[i].toLowerCase(); f(i + 1);
    c[i] = c[i].toUpperCase(); f(i + 1);
  };
  f(0);
  return res;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<string> letterCasePermutation(string s) {
        vector<string> res;
        f(s, 0, res);                         // s is our own copy: edit it in place
        return res;
    }
private:
    void f(string& c, int i, vector<string>& res) {
        if (i == (int)c.size()) { res.push_back(c); return; }
        if (isdigit((unsigned char)c[i])) { f(c, i + 1, res); return; }   // one choice
        c[i] = (char)tolower((unsigned char)c[i]); f(c, i + 1, res);
        c[i] = (char)toupper((unsigned char)c[i]); f(c, i + 1, res);
    }
};` }
      ],
      dry: { head: ['i', 'char', 'branches', 'strings below'], rows: [['0', 'a', 'a / A', '2 subtrees'], ['1', '1', 'digit: 1 branch', '—'], ['2', 'b', 'b / B', '2 leaves each'], ['4', '—', 'base', H.c('g', '4 strings total')]] },
      complexity: `<p><b>Time O(n · 2<sup>L</sup>)</b>, <b>Space O(n)</b> recursion + char array.</p>`,
      followUps: ['Letter Combinations of a Phone Number', 'Generalised abbreviations of a word']
    }
  });

  practice.push({
    title: 'Palindrome Partitioning',
    level: 'Medium',
    tags: ['backtracking', 'strings', 'partition'],
    companies: ['Amazon', 'Google', 'Bloomberg'],
    statement: `<p>Given a string <code>s</code>, partition it so that <b>every substring of the partition is a palindrome</b>. Return all possible palindrome partitionings.</p>`,
    constraints: `1 ≤ s.length ≤ 16; lowercase letters`,
    example: `<p>s = "aab" → ${H.chips(['[a, a, b]', '[aa, b]'])}</p><p>Why: cuts after positions give pieces; "ab" and "aab" are not palindromes, so [a, ab] and [aab] are invalid.</p>`,
    brute: {
      why: `<p>There are n − 1 gaps, each cut or not → 2<sup>n−1</sup> partitions (32,768 for n = 16). Check every piece of every partition: O(n · 2<sup>n</sup>) — works, but backtracking stops as soon as the <b>first</b> piece of a branch is not a palindrome, skipping all partitions that share that bad prefix.</p>`,
      code: {
          lang: 'java',
          code: `
        List<List<String>> brute(String s) {
            List<List<String>> res = new ArrayList<>();
            int n = s.length();
            for (int m = 0; m < (1 << (n - 1)); m++) {      // bit g = cut after position g
                List<String> parts = new ArrayList<>();
                int from = 0;
                boolean ok = true;
                for (int g = 0; g < n; g++) {
                    if (g == n - 1 || (m >> g & 1) == 1) {
                        String p = s.substring(from, g + 1);
                        if (!new StringBuilder(p).reverse().toString().equals(p)) { ok = false; break; }
                        parts.add(p);
                        from = g + 1;
                    }
                }
                if (ok) res.add(parts);
            }
            return res;
        }`,
          alt: [
            { lang: 'python', code: `def partition(s):
    res = []
    n = len(s)
    for m in range(1 << (n - 1)):                   # bit g = cut after position g
        parts = []
        start = 0
        ok = True
        for g in range(n):
            if g == n - 1 or (m >> g) & 1 == 1:
                p = s[start:g + 1]
                if p[::-1] != p:
                    ok = False
                    break
                parts.append(p)
                start = g + 1
        if ok:
            res.append(parts)
    return res` },
            { lang: 'js', code: `function partition(s) {
  const res = [];
  const n = s.length;
  for (let m = 0; m < (1 << (n - 1)); m++) {        // bit g = cut after position g
    const parts = [];
    let from = 0;
    let ok = true;
    for (let g = 0; g < n; g++) {
      if (g === n - 1 || ((m >> g) & 1) === 1) {
        const p = s.slice(from, g + 1);
        if (p.split("").reverse().join("") !== p) { ok = false; break; }
        parts.push(p);
        from = g + 1;
      }
    }
    if (ok) res.push(parts);
  }
  return res;
}` },
            { lang: 'cpp', code: `vector<vector<string>> partition(string s) {
    vector<vector<string>> res;
    int n = s.size();
    for (int m = 0; m < (1 << (n - 1)); m++) {      // bit g = cut after position g
        vector<string> parts;
        int from = 0;
        bool ok = true;
        for (int g = 0; g < n; g++) {
            if (g == n - 1 || ((m >> g) & 1) == 1) {
                string p = s.substr(from, g + 1 - from);
                string rev(p.rbegin(), p.rend());
                if (rev != p) { ok = false; break; }
                parts.push_back(p);
                from = g + 1;
            }
        }
        if (ok) res.push_back(parts);
    }
    return res;
}` }
          ]
        }
    },
    mcq: {
      q: `What is a single "choice" at each level of the decision tree?`,
      options: ['Pick or skip a character', 'Where the next piece ends (end index e ≥ start)', 'Which character to swap', 'Whether to reverse the string'],
      answer: 1,
      explain: `At start index i you choose the end e of the next piece s[i..e]; only palindromic pieces are explored, then recurse from e + 1.`
    },
    hints: [
      `<p><b>Aha:</b> a partition is a sequence of "next piece" choices. From position i, try every end e where s[i..e] is a palindrome.</p>`,
      `<p>Precompute <code>boolean[][] pal</code> with DP: pal[i][j] = s[i]==s[j] &amp;&amp; (j − i &lt; 2 || pal[i+1][j−1]) to make checks O(1).</p>`,
      `<p>Goal: i == n → save copy. Recipe: for e in i..n−1: if pal[i][e]: add s.substring(i, e+1); bt(e+1); remove last.</p>`
    ],
    tests: { sig: 'string -> list<list<string>>', fn: 'partition', check: "(a, out, exp) => { if (!Array.isArray(out)) return false; const k = (p) => JSON.stringify(p); const got = out.map(k).sort(), want = exp.map(k).sort(); return got.length === want.length && got.every((x, i) => x === want[i]); }", cases: [
      [["aab"],[["aa","b"],["a","a","b"]]],
      [["a"],[["a"]]],
      [["aba"],[["aba"],["a","b","a"]]],
      [["aaaa"],[["aaaa"],["a","aaa"],["aa","aa"],["a","a","aa"],["aaa","a"],["a","aa","a"],["aa","a","a"],["a","a","a","a"]]],
      [["abc"],[["a","b","c"]]],
      [["racecar"],[["racecar"],["r","aceca","r"],["r","a","cec","a","r"],["r","a","c","e","c","a","r"]]],
      [["abbab"],[["a","b","bab"],["abba","b"],["a","bb","a","b"],["a","b","b","a","b"]]]
    ] },
    solution: {
      approach: `<p>Backtracking over the end of the next piece, with an O(n²) palindrome table for O(1) pruning checks.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public List<List<String>> partition(String s) {
                int n = s.length();
                boolean[][] pal = new boolean[n][n];
                for (int i = n - 1; i >= 0; i--)
                    for (int j = i; j < n; j++)
                        pal[i][j] = s.charAt(i) == s.charAt(j) && (j - i < 2 || pal[i + 1][j - 1]);
                List<List<String>> res = new ArrayList<>();
                bt(s, 0, pal, new ArrayList<>(), res);
                return res;
            }

            private void bt(String s, int i, boolean[][] pal, List<String> cur, List<List<String>> res) {
                if (i == s.length()) {
                    res.add(new ArrayList<>(cur));
                    return;
                }
                for (int e = i; e < s.length(); e++) {
                    if (!pal[i][e]) continue;                // piece s[i..e] must be a palindrome
                    cur.add(s.substring(i, e + 1));          // choose this piece
                    bt(s, e + 1, pal, cur, res);             // partition the rest
                    cur.remove(cur.size() - 1);              // un-choose
                }
            }

            public static void main(String[] args) {
                System.out.println(new Solution().partition("aab"));   // [[a, a, b], [aa, b]]
            }
        }`,
      alt: [
        { lang: 'python', code: `def partition(s: str) -> list[list[str]]:
    n = len(s)
    pal = [[False] * n for _ in range(n)]
    for i in range(n - 1, -1, -1):
        for j in range(i, n):
            pal[i][j] = s[i] == s[j] and (j - i < 2 or pal[i + 1][j - 1])
    res, cur = [], []

    def bt(i: int) -> None:
        if i == n:
            res.append(cur[:])
            return
        for e in range(i, n):
            if pal[i][e]:                       # piece s[i..e] must be a palindrome
                cur.append(s[i:e + 1])
                bt(e + 1)
                cur.pop()

    bt(0)
    return res` },
        { lang: 'js', code: `function partition(s) {
  const n = s.length;
  const pal = Array.from({ length: n }, () => new Array(n).fill(false));
  for (let i = n - 1; i >= 0; i--)
    for (let j = i; j < n; j++)
      pal[i][j] = s[i] === s[j] && (j - i < 2 || pal[i + 1][j - 1]);
  const res = [], cur = [];
  const bt = (i) => {
    if (i === n) { res.push([...cur]); return; }
    for (let e = i; e < n; e++) {
      if (!pal[i][e]) continue;          // piece s[i..e] must be a palindrome
      cur.push(s.slice(i, e + 1));
      bt(e + 1);
      cur.pop();
    }
  };
  bt(0);
  return res;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<vector<string>> partition(string s) {
        int n = s.size();
        vector<vector<bool>> pal(n, vector<bool>(n, false));
        for (int i = n - 1; i >= 0; i--)
            for (int j = i; j < n; j++)
                pal[i][j] = s[i] == s[j] && (j - i < 2 || pal[i + 1][j - 1]);
        vector<vector<string>> res;
        vector<string> cur;
        bt(s, 0, pal, cur, res);
        return res;
    }
private:
    void bt(const string& s, int i, const vector<vector<bool>>& pal, vector<string>& cur, vector<vector<string>>& res) {
        if (i == (int)s.size()) { res.push_back(cur); return; }
        for (int e = i; e < (int)s.size(); e++) {
            if (!pal[i][e]) continue;         // piece s[i..e] must be a palindrome
            cur.push_back(s.substr(i, e - i + 1));
            bt(s, e + 1, pal, cur, res);
            cur.pop_back();
        }
    }
};` }
      ],
      dry: { head: ['i', 'cur', 'end e tried', 'event'], rows: [['0', '[]', '0 ("a")', 'palindrome → choose'], ['1', '[a]', '1 ("a")', 'choose → [a,a] → e=2 "b" → ' + H.c('g', 'save [a,a,b]')], ['1', '[a]', '2 ("ab")', H.c('r', 'not palindrome')], ['0', '[]', '1 ("aa")', 'choose → "b" → ' + H.c('g', 'save [aa,b]')], ['0', '[]', '2 ("aab")', H.c('r', 'not palindrome')]] },
      complexity: `<p><b>Time O(n · 2<sup>n</sup>)</b> worst case (e.g. "aaaa…"), table O(n²). <b>Space O(n²)</b> for the table + O(n) recursion.</p>`,
      followUps: ['Palindrome Partitioning II: minimum cuts (DP, Hard)', 'Count partitions instead of listing (DP)']
    }
  });

  practice.push({
    title: 'Word Search',
    level: 'Medium',
    tags: ['backtracking', 'grid DFS', 'matrix'],
    companies: ['Amazon', 'Microsoft', 'Meta', 'Bloomberg'],
    statement: `<p>Given an m × n grid of characters <code>board</code> and a string <code>word</code>, return true if the word can be built from letters of sequentially adjacent cells (up, down, left, right). The same cell may not be used more than once.</p>`,
    constraints: `1 ≤ m, n ≤ 6, 1 ≤ word.length ≤ 15; letters only`,
    example: `${H.table(['', 'c0', 'c1', 'c2', 'c3'], [['r0', H.c('g', 'A'), H.c('g', 'B'), H.c('g', 'C'), 'E'], ['r1', 'S', 'F', H.c('g', 'C'), 'S'], ['r2', 'A', H.c('g', 'D'), H.c('g', 'E'), 'E']])}
      <p>word = "ABCCED" → ${H.c('g', '<b>true</b>')} (path shown in green). "ABCB" → false: the B at (0,1) would be reused.</p>`,
    brute: {
      why: `<p>Enumerate every simple path of length L from every cell and compare with the word at the end: up to m·n·4·3<sup>L−1</sup> paths, almost all of which went wrong at the very first or second letter. Backtracking compares <b>as it walks</b> and abandons a path at the first mismatch.</p>`,
      code: {
          lang: 'java',
          code: `
        boolean brute(char[][] b, String w) {
            for (int r = 0; r < b.length; r++)
                for (int c = 0; c < b[0].length; c++)
                    if (allPaths(b, r, c, new StringBuilder(), new boolean[b.length][b[0].length], w)) return true;
            return false;
        }
        boolean allPaths(char[][] b, int r, int c, StringBuilder sb, boolean[][] seen, String w) {
            if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || seen[r][c]) return false;
            sb.append(b[r][c]);
            seen[r][c] = true;
            boolean found = sb.length() == w.length() ? sb.toString().equals(w)   // compare only at full length
                : allPaths(b, r + 1, c, sb, seen, w) || allPaths(b, r - 1, c, sb, seen, w)
                  || allPaths(b, r, c + 1, sb, seen, w) || allPaths(b, r, c - 1, sb, seen, w);
            seen[r][c] = false;
            sb.deleteCharAt(sb.length() - 1);
            return found;
        }`,
          alt: [
            { lang: 'python', code: `def exist(b, w):
    for r in range(len(b)):
        for c in range(len(b[0])):
            seen = [[False] * len(b[0]) for _ in range(len(b))]
            if all_paths(b, r, c, [], seen, w):
                return True
    return False


def all_paths(b, r, c, sb, seen, w):
    if r < 0 or c < 0 or r >= len(b) or c >= len(b[0]) or seen[r][c]:
        return False
    sb.append(b[r][c])
    seen[r][c] = True
    if len(sb) == len(w):
        found = "".join(sb) == w                   # compare only at full length
    else:
        found = (all_paths(b, r + 1, c, sb, seen, w) or all_paths(b, r - 1, c, sb, seen, w)
                 or all_paths(b, r, c + 1, sb, seen, w) or all_paths(b, r, c - 1, sb, seen, w))
    seen[r][c] = False
    sb.pop()
    return found` },
            { lang: 'js', code: `function exist(b, w) {
  for (let r = 0; r < b.length; r++)
    for (let c = 0; c < b[0].length; c++) {
      const seen = Array.from({ length: b.length }, () => new Array(b[0].length).fill(false));
      if (allPaths(b, r, c, [], seen, w)) return true;
    }
  return false;
}

function allPaths(b, r, c, sb, seen, w) {
  if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || seen[r][c]) return false;
  sb.push(b[r][c]);
  seen[r][c] = true;
  const found = sb.length === w.length ? sb.join("") === w   // compare only at full length
    : allPaths(b, r + 1, c, sb, seen, w) || allPaths(b, r - 1, c, sb, seen, w)
      || allPaths(b, r, c + 1, sb, seen, w) || allPaths(b, r, c - 1, sb, seen, w);
  seen[r][c] = false;
  sb.pop();
  return found;
}` },
            { lang: 'cpp', code: `bool allPaths(vector<vector<char>>& b, int r, int c, string& sb, vector<vector<bool>>& seen, const string& w) {
    if (r < 0 || c < 0 || r >= (int)b.size() || c >= (int)b[0].size() || seen[r][c]) return false;
    sb.push_back(b[r][c]);
    seen[r][c] = true;
    bool found = sb.size() == w.size() ? sb == w          // compare only at full length
        : allPaths(b, r + 1, c, sb, seen, w) || allPaths(b, r - 1, c, sb, seen, w)
          || allPaths(b, r, c + 1, sb, seen, w) || allPaths(b, r, c - 1, sb, seen, w);
    seen[r][c] = false;
    sb.pop_back();
    return found;
}

bool exist(vector<vector<char>>& b, string w) {
    for (int r = 0; r < (int)b.size(); r++)
        for (int c = 0; c < (int)b[0].size(); c++) {
            vector<vector<bool>> seen(b.size(), vector<bool>(b[0].size(), false));
            string sb;
            if (allPaths(b, r, c, sb, seen, w)) return true;
        }
    return false;
}` }
          ]
        }
    },
    mcq: {
      q: `How do you prevent reusing a cell without an extra visited array?`,
      options: ['You cannot', 'Temporarily overwrite board[r][c] with a marker like \'#\' and restore it after exploring', 'Sort the board', 'Use a global counter'],
      answer: 1,
      explain: `'#' never matches a letter, so the cell is effectively blocked while it is on the current path. Restoring it on the way back is the un-choose step.`
    },
    hints: [
      `<p><b>Aha:</b> a DFS from each cell matching word[0], advancing one letter per step — stop the branch on the first mismatch.</p>`,
      `<p>dfs(r, c, i): out of bounds or board[r][c] != word[i] → false; i == L − 1 → true. Mark the cell, try 4 neighbours with i + 1, restore.</p>`,
      `<p>Prunes: if the board has fewer copies of some letter than the word needs → false immediately; search from the rarer end (reverse the word if its last letter is rarer). Recipe: mark '#'; found = any neighbour dfs; restore; return found.</p>`
    ],
    tests: { sig: 'char[][] string -> bool', fn: 'exist', cases: [
      [[[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"ABCCED"],true],
      [[[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"SEE"],true],
      [[[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]],"ABCB"],false],
      [[[["a"]],"a"],true],
      [[[["a"]],"b"],false],
      [[[["a","b"],["c","d"]],"abdc"],true],
      [[[["a","b"],["c","d"]],"abcd"],false],
      [[[["a","a"]],"aaa"],false],
      [[[["C","A","A"],["A","A","A"],["B","C","D"]],"AAB"],true],
      [[[["A","B","C","E"],["S","F","E","S"],["A","D","E","E"]],"ABCESEEEFS"],true]
    ] },
    solution: {
      approach: `<p>Grid backtracking: mark the cell as visited by overwriting it, explore 4 directions for the next letter, restore on return. Returns boolean and stops at the first success.</p>`,
      code: `
        class Solution {
            private static final int[] DR = {1, -1, 0, 0}, DC = {0, 0, 1, -1};

            public boolean exist(char[][] board, String word) {
                for (int r = 0; r < board.length; r++)
                    for (int c = 0; c < board[0].length; c++)
                        if (dfs(board, word, r, c, 0)) return true;
                return false;
            }

            private boolean dfs(char[][] b, String w, int r, int c, int i) {
                if (r < 0 || c < 0 || r >= b.length || c >= b[0].length) return false;
                if (b[r][c] != w.charAt(i)) return false;         // mismatch (or '#' = visited)
                if (i == w.length() - 1) return true;             // matched the last letter
                char saved = b[r][c];
                b[r][c] = '#';                                    // choose: mark visited
                for (int d = 0; d < 4; d++) {
                    if (dfs(b, w, r + DR[d], c + DC[d], i + 1)) {
                        b[r][c] = saved;                          // restore even on success
                        return true;
                    }
                }
                b[r][c] = saved;                                  // un-choose
                return false;
            }

            public static void main(String[] args) {
                char[][] b = {{'A', 'B', 'C', 'E'}, {'S', 'F', 'C', 'S'}, {'A', 'D', 'E', 'E'}};
                Solution s = new Solution();
                System.out.println(s.exist(b, "ABCCED"));   // true
                System.out.println(s.exist(b, "ABCB"));     // false
            }
        }`,
      alt: [
        { lang: 'python', code: `def exist(board: list[list[str]], word: str) -> bool:
    R, C = len(board), len(board[0])

    def dfs(r: int, c: int, i: int) -> bool:
        if not (0 <= r < R and 0 <= c < C) or board[r][c] != word[i]:
            return False                        # off the grid, mismatch or visited ('#')
        if i == len(word) - 1:
            return True
        saved, board[r][c] = board[r][c], "#"   # choose: mark visited
        found = any(dfs(r + dr, c + dc, i + 1) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        board[r][c] = saved                     # un-choose
        return found

    return any(dfs(r, c, 0) for r in range(R) for c in range(C))` },
        { lang: 'js', code: `function exist(board, word) {
  const R = board.length, C = board[0].length;
  const dfs = (r, c, i) => {
    if (r < 0 || c < 0 || r >= R || c >= C || board[r][c] !== word[i]) return false;
    if (i === word.length - 1) return true;
    const saved = board[r][c];
    board[r][c] = '#';                   // choose: mark visited
    const found = dfs(r + 1, c, i + 1) || dfs(r - 1, c, i + 1) || dfs(r, c + 1, i + 1) || dfs(r, c - 1, i + 1);
    board[r][c] = saved;                 // un-choose
    return found;
  };
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++)
      if (dfs(r, c, 0)) return true;
  return false;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    bool exist(vector<vector<char>>& board, string word) {
        for (int r = 0; r < (int)board.size(); r++)
            for (int c = 0; c < (int)board[0].size(); c++)
                if (dfs(board, word, r, c, 0)) return true;
        return false;
    }
private:
    bool dfs(vector<vector<char>>& b, const string& w, int r, int c, int i) {
        if (r < 0 || c < 0 || r >= (int)b.size() || c >= (int)b[0].size() || b[r][c] != w[i]) return false;
        if (i == (int)w.size() - 1) return true;
        char saved = b[r][c];
        b[r][c] = '#';                        // choose: mark visited
        bool found = dfs(b, w, r + 1, c, i + 1) || dfs(b, w, r - 1, c, i + 1)
                  || dfs(b, w, r, c + 1, i + 1) || dfs(b, w, r, c - 1, i + 1);
        b[r][c] = saved;                      // un-choose
        return found;
    }
};` }
      ],
      dry: { head: ['cell', 'letter needed', 'match?', 'event'], rows: [['(0,0)', 'A', 'yes', 'mark, go on'], ['(0,1)', 'B', 'yes', 'mark'], ['(0,2)', 'C', 'yes', 'mark'], ['(1,2)', 'C', 'yes', 'mark'], ['(2,2)', 'E', 'yes', 'mark'], ['(2,1)', 'D', 'yes, last letter', H.c('g', 'true — unwind, restoring cells')]] },
      complexity: `<p><b>Time O(m · n · 3<sup>L</sup>)</b>: from each start, every step has at most 3 new directions. <b>Space O(L)</b> recursion depth.</p>`,
      followUps: ['Word Search II: many words (Trie + backtracking, Hard)', 'Count all paths spelling the word']
    }
  });

  practice.push({
    title: 'Partition to K Equal Sum Subsets',
    level: 'Medium',
    tags: ['backtracking', 'pruning', 'bucket filling'],
    companies: ['LinkedIn', 'Amazon', 'Google'],
    statement: `<p>Given an integer array <code>nums</code> and an integer <code>k</code>, return true if it is possible to divide the array into <code>k</code> non-empty subsets whose sums are all equal.</p>`,
    constraints: `1 ≤ k ≤ nums.length ≤ 16, 1 ≤ nums[i] ≤ 10<sup>4</sup>`,
    example: `${H.arr([4, 3, 2, 3, 5, 2, 1], { label: 'nums' })}<p>k = 4 → ${H.c('g', '<b>true</b>')}: total 20, target 5 per bucket: (5), (1,4), (2,3), (2,3).</p>`,
    brute: {
      why: `<p>Assign each number to one of k buckets in every possible way: k<sup>n</sup> assignments (4<sup>16</sup> ≈ 4.3 billion) and check sums at the end. The waste: continuing after a bucket already overflows, and trying symmetric assignments (putting the first number into bucket 1 vs bucket 2 is the same thing when both are empty).</p>`,
      code: {
          lang: 'java',
          code: `
        boolean brute(int[] nums, int k) {
            int[] bucket = new int[k];
            return assign(nums, 0, bucket);
        }
        boolean assign(int[] nums, int i, int[] bucket) {
            if (i == nums.length) {
                for (int b : bucket) if (b != bucket[0]) return false;
                return true;
            }
            for (int j = 0; j < bucket.length; j++) {          // no pruning at all
                bucket[j] += nums[i];
                if (assign(nums, i + 1, bucket)) return true;
                bucket[j] -= nums[i];
            }
            return false;
        }`,
          alt: [
            { lang: 'python', code: `def can_partition_k_subsets(nums, k):
    bucket = [0] * k
    return assign(nums, 0, bucket)


def assign(nums, i, bucket):
    if i == len(nums):
        return all(b == bucket[0] for b in bucket)
    for j in range(len(bucket)):                       # no pruning at all
        bucket[j] += nums[i]
        if assign(nums, i + 1, bucket):
            return True
        bucket[j] -= nums[i]
    return False` },
            { lang: 'js', code: `function canPartitionKSubsets(nums, k) {
  const bucket = new Array(k).fill(0);
  return assign(nums, 0, bucket);
}

function assign(nums, i, bucket) {
  if (i === nums.length) return bucket.every((b) => b === bucket[0]);
  for (let j = 0; j < bucket.length; j++) {            // no pruning at all
    bucket[j] += nums[i];
    if (assign(nums, i + 1, bucket)) return true;
    bucket[j] -= nums[i];
  }
  return false;
}` },
            { lang: 'cpp', code: `bool assign(const vector<int>& nums, int i, vector<int>& bucket) {
    if (i == (int)nums.size()) {
        for (int b : bucket) if (b != bucket[0]) return false;
        return true;
    }
    for (size_t j = 0; j < bucket.size(); j++) {       // no pruning at all
        bucket[j] += nums[i];
        if (assign(nums, i + 1, bucket)) return true;
        bucket[j] -= nums[i];
    }
    return false;
}

bool canPartitionKSubsets(vector<int>& nums, int k) {
    vector<int> bucket(k, 0);
    return assign(nums, 0, bucket);
}` }
          ]
        }
    },
    mcq: {
      q: `nums sorted descending, number x does not fit into an <b>empty</b> bucket's first attempt (the recursion fails). Should you try x in the next empty bucket?`,
      options: ['Yes, a different bucket might work', 'No — all empty buckets are identical, so the result would be the same; stop trying empty buckets', 'Only if k is even', 'Restart with a new order'],
      answer: 1,
      explain: `Empty buckets are interchangeable (symmetry). If placing x into one empty bucket leads to failure, placing it into another empty bucket fails too — break.`
    },
    hints: [
      `<p><b>Aha:</b> if sum % k != 0 → false. Otherwise each bucket must reach target = sum / k, and any number &gt; target → false.</p>`,
      `<p>Sort descending (big numbers fail fast) and place each number into a bucket whose sum + x ≤ target.</p>`,
      `<p>Symmetry prune: skip a bucket with the same current sum as a bucket already tried for this number; in particular, once an empty bucket fails, break. Recipe: bt(i): if i == n return true; for b: if bucket[b]+x ≤ target and not a repeated sum: add; if bt(i+1) return true; remove; if bucket[b] == 0 break.</p>`
    ],
    tests: { sig: 'int[] int -> bool', fn: 'canPartitionKSubsets', cases: [
      [[[4,3,2,3,5,2,1],4],true],
      [[[1,2,3,4],3],false],
      [[[5],1],true],
      [[[1,1,1,1],4],true],
      [[[2,2,2,2,3,4,5],4],false],
      [[[10,10,10,7,7,7,7,7,7,6,6,6],3],true],
      [[[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],8],true],
      [[[10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000],16],true],
      [[[3,3,10,2,6,5,10,6,8,3,2,1,6,10,7,2],6],false]
    ] },
    solution: {
      approach: `<p>Bucket-filling backtracking with three prunes: divisibility, descending order, and skipping equivalent buckets.</p>`,
      code: `
        import java.util.*;

        class Solution {
            public boolean canPartitionKSubsets(int[] nums, int k) {
                int sum = 0;
                for (int x : nums) sum += x;
                if (sum % k != 0) return false;
                int target = sum / k;
                Arrays.sort(nums);
                for (int i = 0, j = nums.length - 1; i < j; i++, j--) { int t = nums[i]; nums[i] = nums[j]; nums[j] = t; } // descending
                if (nums[0] > target) return false;
                return bt(nums, 0, new int[k], target);
            }

            private boolean bt(int[] nums, int i, int[] bucket, int target) {
                if (i == nums.length) return true;                 // every number placed, sums never exceeded target
                int x = nums[i];
                for (int b = 0; b < bucket.length; b++) {
                    if (bucket[b] + x > target) continue;          // overflow
                    boolean seenSame = false;
                    for (int p = 0; p < b; p++) if (bucket[p] == bucket[b]) { seenSame = true; break; }
                    if (seenSame) continue;                        // equivalent bucket already tried
                    bucket[b] += x;                                // choose
                    if (bt(nums, i + 1, bucket, target)) return true; // explore
                    bucket[b] -= x;                                // un-choose
                    if (bucket[b] == 0) break;                     // empty buckets are all the same
                }
                return false;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().canPartitionKSubsets(new int[]{4, 3, 2, 3, 5, 2, 1}, 4)); // true
                System.out.println(new Solution().canPartitionKSubsets(new int[]{1, 2, 3, 4}, 3));          // false
            }
        }`,
      alt: [
        { lang: 'python', code: `def can_partition_k_subsets(nums: list[int], k: int) -> bool:
    total = sum(nums)
    if total % k:
        return False
    target = total // k
    a = sorted(nums, reverse=True)              # big numbers fail fast
    if a[0] > target:
        return False
    bucket = [0] * k

    def bt(i: int) -> bool:
        if i == len(a):
            return True
        x, tried = a[i], set()
        for b in range(k):
            if bucket[b] + x > target or bucket[b] in tried:
                continue                        # overflow, or an equivalent bucket
            tried.add(bucket[b])
            bucket[b] += x                      # choose
            if bt(i + 1):
                return True
            bucket[b] -= x                      # un-choose
        return False

    return bt(0)` },
        { lang: 'js', code: `function canPartitionKSubsets(nums, k) {
  const total = nums.reduce((x, y) => x + y, 0);
  if (total % k !== 0) return false;
  const target = total / k;
  const a = [...nums].sort((x, y) => y - x);           // descending: big ones fail fast
  if (a[0] > target) return false;
  const bucket = new Array(k).fill(0);
  const bt = (i) => {
    if (i === a.length) return true;
    const tried = new Set();
    for (let b = 0; b < k; b++) {
      if (bucket[b] + a[i] > target || tried.has(bucket[b])) continue;   // overflow or equivalent
      tried.add(bucket[b]);
      bucket[b] += a[i];                 // choose
      if (bt(i + 1)) return true;
      bucket[b] -= a[i];                 // un-choose
    }
    return false;
  };
  return bt(0);
}` },
        { lang: 'cpp', code: `class Solution {
public:
    bool canPartitionKSubsets(vector<int>& nums, int k) {
        int sum = accumulate(nums.begin(), nums.end(), 0);
        if (sum % k != 0) return false;
        target = sum / k;
        sort(nums.rbegin(), nums.rend());     // descending: big numbers fail fast
        if (nums[0] > target) return false;
        vector<int> bucket(k, 0);
        return bt(nums, 0, bucket);
    }
private:
    int target = 0;

    bool bt(const vector<int>& a, int i, vector<int>& bucket) {
        if (i == (int)a.size()) return true;
        unordered_set<int> tried;             // bucket sums already tried for a[i]
        for (int& b : bucket) {
            if (b + a[i] > target || !tried.insert(b).second) continue;
            b += a[i];                        // choose
            if (bt(a, i + 1, bucket)) return true;
            b -= a[i];                        // un-choose
        }
        return false;
    }
};` }
      ],
      dry: { head: ['x (desc)', 'buckets before', 'placed in', 'buckets after'], rows: [['5', '[0,0,0,0]', 'b0', '[5,0,0,0]'], ['4', '[5,0,0,0]', 'b1 (b0 full)', '[5,4,0,0]'], ['3', '[5,4,0,0]', 'b2', '[5,4,3,0]'], ['3', '[5,4,3,0]', 'b3 (b2 would be 6)', '[5,4,3,3]'], ['2, 2, 1', '…', 'b2, b3, b1', H.c('g', '[5,5,5,5] → true')]] },
      complexity: `<p><b>Time O(k<sup>n</sup>)</b> worst case but heavily pruned; the bitmask-DP alternative is O(n · 2<sup>n</sup>). <b>Space O(n)</b> recursion + O(k) buckets.</p>`,
      followUps: ['Matchsticks to Square (k = 4)', 'Bitmask DP version: dp[mask] = fill of the current bucket', 'Fair distribution of cookies (minimise the max)']
    }
  });

  // ===================== PRACTICE: HARD =====================
  practice.push({
    title: 'N-Queens II (count solutions fast)',
    level: 'Hard',
    tags: ['backtracking', 'bitmask', 'symmetry'],
    companies: ['Amazon', 'Zenefits', 'Google'],
    statement: `<p>Return the <b>number</b> of distinct solutions to the n-queens puzzle. Aim for a solution that also handles n up to 14 within a second.</p>`,
    constraints: `1 ≤ n ≤ 9 (stretch: n ≤ 14 — 365,596 solutions)`,
    example: `<p>n = 4 → ${H.c('p', '<b>2</b>')}; n = 8 → 92; n = 1 → 1; n = 3 → 0.</p><p>Why: same search as N-Queens, but we never build boards — only count leaves.</p>`,
    brute: {
      why: `<p>Reuse the board-building N-Queens solution and return <code>res.size()</code>. It allocates n strings per solution (365,596 × 14 strings for n = 14) purely to count them, and the boolean-array checks cost more than three ints. Fine for n ≤ 9, wasteful beyond.</p>`,
      code: {
          lang: 'java',
          code: `
        int brute(int n) {
            return place(0, n, new boolean[n], new boolean[2 * n - 1], new boolean[2 * n - 1]);
        }
        int place(int r, int n, boolean[] cols, boolean[] d, boolean[] a) {
            if (r == n) return 1;
            int total = 0;
            for (int c = 0; c < n; c++) {
                if (cols[c] || d[r - c + n - 1] || a[r + c]) continue;
                cols[c] = d[r - c + n - 1] = a[r + c] = true;
                total += place(r + 1, n, cols, d, a);
                cols[c] = d[r - c + n - 1] = a[r + c] = false;
            }
            return total;
        }`,
          alt: [
            { lang: 'python', code: `def total_n_queens(n):
    return place(0, n, [False] * n, [False] * (2 * n - 1), [False] * (2 * n - 1))


def place(r, n, cols, d, a):
    if r == n:
        return 1
    total = 0
    for c in range(n):
        if cols[c] or d[r - c + n - 1] or a[r + c]:
            continue
        cols[c] = d[r - c + n - 1] = a[r + c] = True
        total += place(r + 1, n, cols, d, a)
        cols[c] = d[r - c + n - 1] = a[r + c] = False
    return total` },
            { lang: 'js', code: `function totalNQueens(n) {
  return place(0, n, new Array(n).fill(false), new Array(2 * n - 1).fill(false), new Array(2 * n - 1).fill(false));
}

function place(r, n, cols, d, a) {
  if (r === n) return 1;
  let total = 0;
  for (let c = 0; c < n; c++) {
    if (cols[c] || d[r - c + n - 1] || a[r + c]) continue;
    cols[c] = d[r - c + n - 1] = a[r + c] = true;
    total += place(r + 1, n, cols, d, a);
    cols[c] = d[r - c + n - 1] = a[r + c] = false;
  }
  return total;
}` },
            { lang: 'cpp', code: `int place(int r, int n, vector<bool>& cols, vector<bool>& d, vector<bool>& a) {
    if (r == n) return 1;
    int total = 0;
    for (int c = 0; c < n; c++) {
        if (cols[c] || d[r - c + n - 1] || a[r + c]) continue;
        cols[c] = d[r - c + n - 1] = a[r + c] = true;
        total += place(r + 1, n, cols, d, a);
        cols[c] = d[r - c + n - 1] = a[r + c] = false;
    }
    return total;
}

int totalNQueens(int n) {
    vector<bool> cols(n, false), d(2 * n - 1, false), a(2 * n - 1, false);
    return place(0, n, cols, d, a);
}` }
          ]
        }
    },
    mcq: {
      q: `Why can you try only the left half of row 0 and double the count?`,
      options: ['Queens on the right half never work', 'Every solution has a mirror image (reflect left ↔ right), and a solution with row-0 queen in column c mirrors one with column n−1−c', 'Because n is even', 'It is an approximation'],
      answer: 1,
      explain: `Reflection is a bijection between solutions with the first queen in column c and column n − 1 − c. For odd n, the middle column maps to itself and must be counted once separately.`
    },
    hints: [
      `<p><b>Aha:</b> counting needs no board — represent attacked columns/diagonals as three bitmasks passed by value.</p>`,
      `<p>free = full &amp; ~(cols | d | a); iterate bits with <code>bit = free &amp; -free</code>; next row uses (d | bit) &lt;&lt; 1 and (a | bit) &gt;&gt; 1.</p>`,
      `<p>Symmetry: in row 0 only try columns 0..n/2−1, double; if n is odd add the count for the middle column. Edge: n = 1 → 1.</p>`
    ],
    tests: { sig: 'int -> int', fn: 'totalNQueens', cases: [
      [[1],1],
      [[2],0],
      [[3],0],
      [[4],2],
      [[5],10],
      [[6],4],
      [[8],92],
      [[9],352],
      [[10],724]
    ] },
    solution: {
      approach: `<p>Bitmask backtracking (no arrays, no undo) plus left-right mirror symmetry for a 2× speed-up.</p>`,
      code: `
        class Solution {
            private int full;

            public int totalNQueens(int n) {
                full = (1 << n) - 1;
                int total = 0;
                for (int c = 0; c < n / 2; c++) {                  // left half of row 0
                    int bit = 1 << c;
                    total += count(1, bit, bit << 1, bit >> 1);
                }
                total *= 2;                                        // mirror images
                if (n % 2 == 1) {                                  // middle column counted once
                    int bit = 1 << (n / 2);
                    total += count(1, bit, bit << 1, bit >> 1);
                }
                return total;
            }

            private int count(int row, int cols, int d, int a) {
                if (cols == full) return 1;                        // all n columns used = n queens placed
                int free = full & ~(cols | d | a);
                int total = 0;
                while (free != 0) {
                    int bit = free & -free;                        // lowest safe column
                    free -= bit;
                    total += count(row + 1, cols | bit, (d | bit) << 1, (a | bit) >> 1);
                }
                return total;
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                for (int n = 1; n <= 10; n++) System.out.print(s.totalNQueens(n) + " ");
                // 1 0 0 2 10 4 40 92 352 724
            }
        }`,
      alt: [
        { lang: 'python', code: `def total_n_queens(n: int) -> int:
    full = (1 << n) - 1

    def count(cols: int, d: int, a: int) -> int:
        if cols == full:
            return 1                            # n queens placed
        free = full & ~(cols | d | a)
        total = 0
        while free:
            bit = free & -free                  # lowest safe column
            free ^= bit
            total += count(cols | bit, ((d | bit) << 1) & full, (a | bit) >> 1)
        return total

    first = lambda bit: count(bit, (bit << 1) & full, bit >> 1)
    total = 2 * sum(first(1 << c) for c in range(n // 2))   # left half, mirrored
    if n % 2:
        total += first(1 << (n // 2))                       # middle column once
    return total` },
        { lang: 'js', code: `function totalNQueens(n) {
  const full = (1 << n) - 1;
  const count = (cols, d, a) => {
    if (cols === full) return 1;         // n queens placed
    let free = full & ~(cols | d | a), total = 0;
    while (free) {
      const bit = free & -free;          // lowest safe column
      free -= bit;
      total += count(cols | bit, ((d | bit) << 1) & full, (a | bit) >> 1);
    }
    return total;
  };
  const first = (bit) => count(bit, (bit << 1) & full, bit >> 1);
  let total = 0;
  for (let c = 0; c < Math.floor(n / 2); c++) total += first(1 << c);
  total *= 2;                            // mirror images
  if (n % 2 === 1) total += first(1 << Math.floor(n / 2));   // middle column once
  return total;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int totalNQueens(int n) {
        full = (1 << n) - 1;
        int total = 0;
        for (int c = 0; c < n / 2; c++) total += first(1 << c);   // left half of row 0
        total *= 2;                                              // mirror images
        if (n % 2 == 1) total += first(1 << (n / 2));            // middle column once
        return total;
    }
private:
    int full = 0;

    int first(int bit) { return count(bit, (bit << 1) & full, bit >> 1); }

    int count(int cols, int d, int a) {
        if (cols == full) return 1;           // n queens placed
        int free = full & ~(cols | d | a), total = 0;
        while (free) {
            int bit = free & -free;           // lowest safe column
            free -= bit;
            total += count(cols | bit, ((d | bit) << 1) & full, (a | bit) >> 1);
        }
        return total;
    }
};` }
      ],
      dry: { head: ['n', 'left-half count', '× 2', 'middle col', 'total'], rows: [['4', '1 (col 1)', '2', '—', H.c('p', '2')], ['5', '4 (cols 0, 1)', '8', '+2', H.c('p', '10')], ['1', '0', '0', '+1', H.c('p', '1')]] },
      complexity: `<p><b>Time O(n!)</b> upper bound, about half the nodes of plain bitmask search; each node O(1) bit ops. <b>Space O(n)</b> recursion.</p>`,
      followUps: ['Use all 8 board symmetries (rotations too) — harder bookkeeping', 'Count solutions with some queens pre-placed']
    }
  });

  practice.push({
    title: 'Expression Add Operators',
    level: 'Hard',
    tags: ['backtracking', 'strings', 'math'],
    companies: ['Meta', 'Google', 'Pinterest'],
    statement: `<p>Given a digit string <code>num</code> and an integer <code>target</code>, return all expressions formed by inserting the binary operators <code>+</code>, <code>-</code>, <code>*</code> between the digits so that the expression evaluates to target. Operands may span several digits but must not have leading zeros (e.g. "05" is invalid; "0" is fine).</p>`,
    constraints: `1 ≤ num.length ≤ 10, −2<sup>31</sup> ≤ target ≤ 2<sup>31</sup> − 1`,
    example: `<p>num = "123", target = 6 → ${H.chips(['1*2*3', '1+2+3'])}</p><p>num = "105", target = 5 → ${H.chips(['1*0+5', '10-5'])} ("1*05" is rejected: leading zero).</p>`,
    brute: {
      why: `<p>Between each pair of digits put one of 4 things (+, −, *, nothing): 4<sup>n−1</sup> strings (262,144 for n = 10), then parse and evaluate each with an expression evaluator respecting precedence. Evaluation is O(n) per string and re-does the same prefix arithmetic over and over.</p>`,
      code: {
          lang: 'java',
          code: `
        List<String> brute(String num, int target) {
            List<String> res = new ArrayList<>();
            int gaps = num.length() - 1;
            int total = 1;
            for (int i = 0; i < gaps; i++) total *= 4;
            String ops = "+-*";
            for (int code = 0; code < total; code++) {
                StringBuilder sb = new StringBuilder().append(num.charAt(0));
                int x = code;
                for (int g = 0; g < gaps; g++) {
                    int o = x % 4; x /= 4;
                    if (o < 3) sb.append(ops.charAt(o));       // o == 3 means "join digits"
                    sb.append(num.charAt(g + 1));
                }
                String e = sb.toString();
                if (!e.matches(".*\\\\b0\\\\d.*") && eval(e) == target) res.add(e);
            }
            return res;
        }
        long eval(String e) {                                  // + - * with precedence
            long sum = 0, term = 0, cur = 0;
            char op = '+';
            for (int i = 0; i <= e.length(); i++) {
                char ch = i < e.length() ? e.charAt(i) : '+';
                if (Character.isDigit(ch)) { cur = cur * 10 + (ch - '0'); continue; }
                if (op == '*') term *= cur;
                else { sum += term; term = op == '+' ? cur : -cur; }
                op = ch;
                cur = 0;
            }
            return sum + term;
        }`,
          alt: [
            { lang: 'python', code: `import re

def add_operators(num, target):
    res = []
    gaps = len(num) - 1
    total = 4 ** gaps
    ops = "+-*"
    for code in range(total):
        sb = [num[0]]
        x = code
        for g in range(gaps):
            o = x % 4
            x //= 4
            if o < 3:
                sb.append(ops[o])                      # o == 3 means "join digits"
            sb.append(num[g + 1])
        e = "".join(sb)
        if not re.search(r"\\b0\\d", e) and evaluate(e) == target:
            res.append(e)
    return res


def evaluate(e):                                       # + - * with precedence
    total = term = cur = 0
    op = '+'
    for i in range(len(e) + 1):
        ch = e[i] if i < len(e) else '+'
        if ch.isdigit():
            cur = cur * 10 + int(ch)
            continue
        if op == '*':
            term *= cur
        else:
            total += term
            term = cur if op == '+' else -cur
        op = ch
        cur = 0
    return total + term` },
            { lang: 'js', code: `function addOperators(num, target) {
  const res = [];
  const gaps = num.length - 1;
  let total = 1;
  for (let i = 0; i < gaps; i++) total *= 4;
  const ops = "+-*";
  for (let code = 0; code < total; code++) {
    let sb = num[0];
    let x = code;
    for (let g = 0; g < gaps; g++) {
      const o = x % 4; x = Math.floor(x / 4);
      if (o < 3) sb += ops[o];                         // o == 3 means "join digits"
      sb += num[g + 1];
    }
    if (!/\\b0\\d/.test(sb) && evaluate(sb) === target) res.push(sb);
  }
  return res;
}

function evaluate(e) {                                 // + - * with precedence
  let sum = 0, term = 0, cur = 0;
  let op = '+';
  for (let i = 0; i <= e.length; i++) {
    const ch = i < e.length ? e[i] : '+';
    if (ch >= '0' && ch <= '9') { cur = cur * 10 + (ch.charCodeAt(0) - 48); continue; }
    if (op === '*') term *= cur;
    else { sum += term; term = op === '+' ? cur : -cur; }
    op = ch;
    cur = 0;
  }
  return sum + term;
}` },
            { lang: 'cpp', code: `long long evaluate(const string& e) {                  // + - * with precedence
    long long sum = 0, term = 0, cur = 0;
    char op = '+';
    for (size_t i = 0; i <= e.size(); i++) {
        char ch = i < e.size() ? e[i] : '+';
        if (isdigit((unsigned char)ch)) { cur = cur * 10 + (ch - '0'); continue; }
        if (op == '*') term *= cur;
        else { sum += term; term = op == '+' ? cur : -cur; }
        op = ch;
        cur = 0;
    }
    return sum + term;
}

vector<string> addOperators(string num, int target) {
    vector<string> res;
    int gaps = num.size() - 1;
    int total = 1;
    for (int i = 0; i < gaps; i++) total *= 4;
    string ops = "+-*";
    for (int code = 0; code < total; code++) {
        string sb(1, num[0]);
        int x = code;
        for (int g = 0; g < gaps; g++) {
            int o = x % 4; x /= 4;
            if (o < 3) sb += ops[o];                   // o == 3 means "join digits"
            sb += num[g + 1];
        }
        if (!regex_search(sb, regex("\\\\b0\\\\d")) && evaluate(sb) == target) res.push_back(sb);
    }
    return res;
}` }
          ]
        }
    },
    mcq: {
      q: `Current expression "2+3" has value 5 and the last operand was +3. You now append "*4". What is the new value?`,
      options: ['(5) × 4 = 20', '5 − 3 + 3 × 4 = 14', '5 + 4 = 9', '3 × 4 = 12'],
      answer: 1,
      explain: `Multiplication binds tighter, so undo the last operand and re-apply it multiplied: value − last + last × 4 = 5 − 3 + 12 = 14. That is why we carry "last" through the recursion.`
    },
    hints: [
      `<p><b>Aha:</b> at each position choose the next operand (num[i..j]) and the operator in front of it; carry the running <b>value</b> and the <b>last operand</b> so * can be fixed up in O(1).</p>`,
      `<p>For "*": new value = value − last + last × cur, new last = last × cur. For "+": value + cur, last = cur. For "−": value − cur, last = −cur. Use a 64-bit integer (<code>long</code> / <code>long long</code>) to avoid overflow; Python ints and JavaScript numbers are exact at this size.</p>`,
      `<p>Leading zeros: if num[i] == '0', only the single-digit operand "0" is allowed (break after j == i). The first operand has no operator in front. Recipe: if i == n: if value == target save; for j in i..n−1: cur = parse(i..j); if i == 0 recurse(first) else recurse with +, −, *.</p>`
    ],
    tests: { sig: 'string int -> list<string>', fn: 'addOperators', cmp: "set", cases: [
      [["123",6],["1*2*3","1+2+3"]],
      [["232",8],["2*3+2","2+3*2"]],
      [["105",5],["1*0+5","10-5"]],
      [["00",0],["0*0","0+0","0-0"]],
      [["3456237490",9191],[]],
      [["2147483648",-2147483648],[]],
      [["2147483647",2147483647],["2147483647"]],
      [["1",1],["1"]],
      [["999999999",81],["9+9+9+9+9+9+9+9+9","999-9*99-9-9-9","999-9-9*99-9-9","999-9-9-9*99-9","999-9-9-9-9*99","999-9-9-9-99*9","999-9-9-99*9-9","999-9-99*9-9-9","999-99*9-9-9-9"]],
      [["10009",9],["1*0*0*0+9","1*0*0+0+9","1*0*0-0+9","1*0+0*0+9","1*0+0+0+9","1*0+0-0+9","1*0-0*0+9","1*0-0+0+9","1*0-0-0+9","10*0*0+9","10*0+0+9","10*0-0+9","100*0+9"]]
    ] },
    solution: {
      approach: `<p>Backtracking over operand boundaries and operators, with (value, last) state for O(1) precedence handling and a string builder that is cut back to its old length for un-choose (<code>setLength</code> in Java, <code>resize</code> in C++; in Python and JavaScript passing a new string per call is simpler).</p>`,
      code: `
        import java.util.*;

        class Solution {
            public List<String> addOperators(String num, int target) {
                List<String> res = new ArrayList<>();
                bt(num, target, 0, 0, 0, new StringBuilder(), res);
                return res;
            }

            private void bt(String num, int target, int i, long value, long last, StringBuilder sb, List<String> res) {
                if (i == num.length()) {
                    if (value == target) res.add(sb.toString());
                    return;
                }
                int len = sb.length();                              // remember for un-choose
                long cur = 0;
                for (int j = i; j < num.length(); j++) {
                    if (j > i && num.charAt(i) == '0') break;       // no operands with leading zero
                    cur = cur * 10 + (num.charAt(j) - '0');
                    String operand = num.substring(i, j + 1);
                    if (i == 0) {                                   // first operand: no operator
                        sb.append(operand);
                        bt(num, target, j + 1, cur, cur, sb, res);
                        sb.setLength(len);
                    } else {
                        sb.append('+').append(operand);
                        bt(num, target, j + 1, value + cur, cur, sb, res);
                        sb.setLength(len);
                        sb.append('-').append(operand);
                        bt(num, target, j + 1, value - cur, -cur, sb, res);
                        sb.setLength(len);
                        sb.append('*').append(operand);
                        bt(num, target, j + 1, value - last + last * cur, last * cur, sb, res);
                        sb.setLength(len);
                    }
                }
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.addOperators("123", 6));   // [1+2+3, 1*2*3]
                System.out.println(s.addOperators("105", 5));   // [1*0+5, 10-5]
            }
        }`,
      alt: [
        { lang: 'python', code: `def add_operators(num: str, target: int) -> list[str]:
    res, n = [], len(num)

    def bt(i: int, expr: str, value: int, last: int) -> None:
        if i == n:
            if value == target:
                res.append(expr)
            return
        for j in range(i, n):
            if j > i and num[i] == "0":
                break                           # no operand with a leading zero
            s = num[i:j + 1]
            cur = int(s)
            if i == 0:
                bt(j + 1, s, cur, cur)          # first operand: no operator
            else:
                bt(j + 1, expr + "+" + s, value + cur, cur)
                bt(j + 1, expr + "-" + s, value - cur, -cur)
                bt(j + 1, expr + "*" + s, value - last + last * cur, last * cur)

    bt(0, "", 0, 0)
    return res` },
        { lang: 'js', code: `function addOperators(num, target) {
  const res = [], n = num.length;
  const bt = (i, expr, value, last) => {
    if (i === n) { if (value === target) res.push(expr); return; }
    for (let j = i; j < n; j++) {
      if (j > i && num[i] === '0') break;   // no operand with a leading zero
      const s = num.slice(i, j + 1), cur = Number(s);   // values stay far below 2^53
      if (i === 0) {
        bt(j + 1, s, cur, cur);          // first operand: no operator
      } else {
        bt(j + 1, expr + '+' + s, value + cur, cur);
        bt(j + 1, expr + '-' + s, value - cur, -cur);
        bt(j + 1, expr + '*' + s, value - last + last * cur, last * cur);
      }
    }
  };
  bt(0, '', 0, 0);
  return res;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<string> addOperators(string num, int target) {
        vector<string> res;
        string expr;
        bt(num, target, 0, 0, 0, expr, res);
        return res;
    }
private:
    void bt(const string& num, long long target, int i, long long value, long long last, string& expr, vector<string>& res) {
        if (i == (int)num.size()) {
            if (value == target) res.push_back(expr);
            return;
        }
        size_t len = expr.size();             // remember for un-choose
        long long cur = 0;
        for (int j = i; j < (int)num.size(); j++) {
            if (j > i && num[i] == '0') break; // no operand with a leading zero
            cur = cur * 10 + (num[j] - '0');  // long long: "9999999999" overflows int
            string operand = num.substr(i, j - i + 1);
            if (i == 0) {
                expr += operand;
                bt(num, target, j + 1, cur, cur, expr, res);
                expr.resize(len);
            } else {
                expr += "+" + operand; bt(num, target, j + 1, value + cur, cur, expr, res); expr.resize(len);
                expr += "-" + operand; bt(num, target, j + 1, value - cur, -cur, expr, res); expr.resize(len);
                expr += "*" + operand; bt(num, target, j + 1, value - last + last * cur, last * cur, expr, res); expr.resize(len);
            }
        }
    }
};` }
      ],
      dry: { head: ['expression so far', 'value', 'last', 'next step'], rows: [['"1"', '1', '1', 'append +2 / −2 / *2'], ['"1*2"', '1 − 1 + 1·2 = 2', '2', 'append *3'], ['"1*2*3"', '2 − 2 + 2·3 = 6', '6', H.c('g', 'i == n, 6 == target → save')], ['"1+2+3"', '6', '3', H.c('g', 'save')], ['"12-3"', '9', '−3', H.c('r', '9 ≠ 6')]] },
      complexity: `<p><b>Time O(n · 4<sup>n</sup>)</b>: each gap has 4 options and building each string costs O(n). <b>Space O(n)</b> recursion + builder.</p>`,
      followUps: ['Add division with integer truncation', 'Allow parentheses (Different Ways to Add Parentheses)', 'Return only the count']
    }
  });

  practice.push({
    title: 'Remove Invalid Parentheses',
    level: 'Hard',
    tags: ['backtracking', 'pruning', 'strings'],
    companies: ['Meta', 'Amazon', 'Uber'],
    statement: `<p>Given a string <code>s</code> containing parentheses and letters, remove the <b>minimum</b> number of invalid parentheses to make it valid. Return all unique valid strings that can be obtained (any order).</p>`,
    constraints: `1 ≤ s.length ≤ 25; at most 20 parentheses; letters are kept as is`,
    example: `<p>s = "()())()" → ${H.chips(['(())()', '()()()'])}</p><p>s = ")(" → ${H.chips(['""'])} (remove both). Why: one extra ")" must go; removing different ")" characters gives two distinct valid strings.</p>`,
    brute: {
      why: `<p>Try every subset of characters to delete (2<sup>n</sup>), keep valid strings with maximum length. For n = 25 that is 33 million subsets × O(n) validation. Most subsets delete letters or too many brackets — work we can rule out up front by computing exactly how many "(" and ")" must go.</p>`,
      code: {
          lang: 'java',
          code: `
        List<String> brute(String s) {
            int n = s.length(), best = -1;
            Set<String> res = new HashSet<>();
            for (int m = 0; m < (1 << n); m++) {              // m = characters to KEEP
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < n; i++) if ((m >> i & 1) == 1) sb.append(s.charAt(i));
                String t = sb.toString();
                if (t.length() < best || !valid(t)) continue;
                if (t.length() > best) { best = t.length(); res.clear(); }
                res.add(t);
            }
            return new ArrayList<>(res);
        }
        boolean valid(String t) {
            int bal = 0;
            for (char ch : t.toCharArray()) {
                if (ch == '(') bal++;
                else if (ch == ')' && --bal < 0) return false;
            }
            return bal == 0;
        }`,
          alt: [
            { lang: 'python', code: `def remove_invalid_parentheses(s):
    n, best = len(s), -1
    res = set()
    for m in range(1 << n):                           # m = characters to KEEP
        t = "".join(s[i] for i in range(n) if (m >> i) & 1 == 1)
        if len(t) < best or not valid(t):
            continue
        if len(t) > best:
            best = len(t)
            res.clear()
        res.add(t)
    return list(res)


def valid(t):
    bal = 0
    for ch in t:
        if ch == '(':
            bal += 1
        elif ch == ')':
            bal -= 1
            if bal < 0:
                return False
    return bal == 0` },
            { lang: 'js', code: `function removeInvalidParentheses(s) {
  const n = s.length;
  let best = -1;
  const res = new Set();
  for (let m = 0; m < (1 << n); m++) {                // m = characters to KEEP
    let t = "";
    for (let i = 0; i < n; i++) if (((m >> i) & 1) === 1) t += s[i];
    if (t.length < best || !valid(t)) continue;
    if (t.length > best) { best = t.length; res.clear(); }
    res.add(t);
  }
  return [...res];
}

function valid(t) {
  let bal = 0;
  for (const ch of t) {
    if (ch === '(') bal++;
    else if (ch === ')' && --bal < 0) return false;
  }
  return bal === 0;
}` },
            { lang: 'cpp', code: `bool valid(const string& t) {
    int bal = 0;
    for (char ch : t) {
        if (ch == '(') bal++;
        else if (ch == ')' && --bal < 0) return false;
    }
    return bal == 0;
}

vector<string> removeInvalidParentheses(string s) {
    int n = s.size(), best = -1;
    unordered_set<string> res;
    for (int m = 0; m < (1 << n); m++) {              // m = characters to KEEP
        string t;
        for (int i = 0; i < n; i++) if (((m >> i) & 1) == 1) t += s[i];
        if ((int)t.size() < best || !valid(t)) continue;
        if ((int)t.size() > best) { best = t.size(); res.clear(); }
        res.insert(t);
    }
    return vector<string>(res.begin(), res.end());
}` }
          ]
        }
    },
    mcq: {
      q: `For s = "()())()", how many "(" and ")" must be removed at minimum?`,
      options: ['0 "(" and 1 ")"', '1 "(" and 1 ")"', '0 "(" and 2 ")"', '2 "(" and 0 ")"'],
      answer: 0,
      explain: `Scan left to right with a balance: the ")" at index 4 drops the balance below zero → one ")" must go. At the end the balance is 0, so no "(" must go. These counts become hard limits in the backtracking.`
    },
    hints: [
      `<p><b>Aha:</b> one pre-scan tells you exactly how many "(" (rmL) and ")" (rmR) to delete. Then backtrack choosing which ones — never delete more.</p>`,
      `<p>dfs(i, open, rmL, rmR, sb): for a bracket either delete it (if its quota &gt; 0) or keep it (")" only if open &gt; 0). Letters are always kept.</p>`,
      `<p>Collect results in a Set (simplest). Optional upgrade — de-duplicate without a Set: when deleting, skip a bracket equal to the previous character if that previous one was kept at the same position (only delete the first of a run). Save at i == n when rmL == rmR == open == 0.</p>`
    ],
    tests: { sig: 'string -> list<string>', fn: 'removeInvalidParentheses', cmp: "set", cases: [
      [["()())()"],["(())()","()()()"]],
      [["(a)())()"],["(a())()","(a)()()"]],
      [[")("],[""]],
      [["x("],["x"]],
      [["(((("],[""]],
      [["()"],["()"]],
      [["(()"],["()"]],
      [["))a((b)"],["a(b)"]],
      [["(((k()(("],["(k)","k()"]]
    ] },
    solution: {
      approach: `<p>Compute minimal removal counts, then DFS with keep/delete choices bounded by the quotas and a balance check; a Set collects unique results (simple and safe given ≤ 20 brackets).</p>`,
      code: `
        import java.util.*;

        class Solution {
            public List<String> removeInvalidParentheses(String s) {
                int rmL = 0, rmR = 0;
                for (char ch : s.toCharArray()) {               // minimal removals
                    if (ch == '(') rmL++;
                    else if (ch == ')') {
                        if (rmL > 0) rmL--;                     // matched
                        else rmR++;                             // unmatched ')'
                    }
                }
                Set<String> res = new LinkedHashSet<>();
                dfs(s, 0, 0, rmL, rmR, new StringBuilder(), res);
                return new ArrayList<>(res);
            }

            private void dfs(String s, int i, int open, int rmL, int rmR, StringBuilder sb, Set<String> res) {
                if (rmL < 0 || rmR < 0 || open < 0) return;      // invalid path
                if (i == s.length()) {
                    if (rmL == 0 && rmR == 0 && open == 0) res.add(sb.toString());
                    return;
                }
                char ch = s.charAt(i);
                int len = sb.length();
                if (ch == '(') {
                    dfs(s, i + 1, open, rmL - 1, rmR, sb, res);           // delete it
                    sb.append(ch);
                    dfs(s, i + 1, open + 1, rmL, rmR, sb, res);           // keep it
                } else if (ch == ')') {
                    dfs(s, i + 1, open, rmL, rmR - 1, sb, res);           // delete it
                    sb.append(ch);
                    dfs(s, i + 1, open - 1, rmL, rmR, sb, res);           // keep it (needs open > 0)
                } else {
                    sb.append(ch);
                    dfs(s, i + 1, open, rmL, rmR, sb, res);               // letters always stay
                }
                sb.setLength(len);                                        // un-choose
            }

            public static void main(String[] args) {
                Solution sol = new Solution();
                System.out.println(sol.removeInvalidParentheses("()())()")); // [(())(), ()()()] in some order
                System.out.println(sol.removeInvalidParentheses("(a)())()")); // [(a())(), (a)()()]
                System.out.println(sol.removeInvalidParentheses(")("));      // []  (one empty string)
            }
        }`,
      alt: [
        { lang: 'python', code: `def remove_invalid_parentheses(s: str) -> list[str]:
    rm_l = rm_r = 0
    for ch in s:                                # minimal removals
        if ch == "(":
            rm_l += 1
        elif ch == ")":
            if rm_l:
                rm_l -= 1
            else:
                rm_r += 1
    res, sb = set(), []

    def dfs(i: int, open_: int, rm_l: int, rm_r: int) -> None:
        if rm_l < 0 or rm_r < 0 or open_ < 0:
            return
        if i == len(s):
            if rm_l == rm_r == open_ == 0:
                res.add("".join(sb))
            return
        ch = s[i]
        if ch == "(":
            dfs(i + 1, open_, rm_l - 1, rm_r)   # delete it
        elif ch == ")":
            dfs(i + 1, open_, rm_l, rm_r - 1)   # delete it
        sb.append(ch)                           # keep it
        dfs(i + 1, open_ + (ch == "(") - (ch == ")"), rm_l, rm_r)
        sb.pop()

    dfs(0, 0, rm_l, rm_r)
    return list(res)` },
        { lang: 'js', code: `function removeInvalidParentheses(s) {
  let rmL = 0, rmR = 0;
  for (const ch of s) {                  // minimal removals
    if (ch === '(') rmL++;
    else if (ch === ')') { if (rmL > 0) rmL--; else rmR++; }
  }
  const res = new Set(), sb = [];
  const dfs = (i, open, rmL, rmR) => {
    if (rmL < 0 || rmR < 0 || open < 0) return;
    if (i === s.length) { if (rmL === 0 && rmR === 0 && open === 0) res.add(sb.join('')); return; }
    const ch = s[i];
    if (ch === '(') dfs(i + 1, open, rmL - 1, rmR);        // delete it
    else if (ch === ')') dfs(i + 1, open, rmL, rmR - 1);   // delete it
    sb.push(ch);                                           // keep it
    dfs(i + 1, open + (ch === '(' ? 1 : ch === ')' ? -1 : 0), rmL, rmR);
    sb.pop();
  };
  dfs(0, 0, rmL, rmR);
  return [...res];
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<string> removeInvalidParentheses(string s) {
        int rmL = 0, rmR = 0;
        for (char ch : s) {                   // minimal removals
            if (ch == '(') rmL++;
            else if (ch == ')') { if (rmL > 0) rmL--; else rmR++; }
        }
        unordered_set<string> res;
        string sb;
        dfs(s, 0, 0, rmL, rmR, sb, res);
        return vector<string>(res.begin(), res.end());
    }
private:
    void dfs(const string& s, int i, int open, int rmL, int rmR, string& sb, unordered_set<string>& res) {
        if (rmL < 0 || rmR < 0 || open < 0) return;
        if (i == (int)s.size()) {
            if (rmL == 0 && rmR == 0 && open == 0) res.insert(sb);
            return;
        }
        char ch = s[i];
        if (ch == '(') dfs(s, i + 1, open, rmL - 1, rmR, sb, res);        // delete it
        else if (ch == ')') dfs(s, i + 1, open, rmL, rmR - 1, sb, res);   // delete it
        sb.push_back(ch);                                                 // keep it
        dfs(s, i + 1, open + (ch == '(') - (ch == ')'), rmL, rmR, sb, res);
        sb.pop_back();
    }
};` }
      ],
      dry: { head: ['scan char', 'rmL', 'rmR', 'note'], rows: [['(', '1', '0', ''], [')', '0', '0', 'matched'], ['(', '1', '0', ''], [')', '0', '0', 'matched'], [')', '0', H.c('r', '1'), 'unmatched → must delete one ")"'], ['()', '0', '1', 'final quotas: rmL = 0, rmR = 1']] },
      complexity: `<p><b>Time O(2<sup>b</sup> · n)</b> worst case for b brackets (≤ 20), heavily cut by quotas and the open ≥ 0 check. <b>Space O(n)</b> recursion + builder (excluding results).</p>`,
      followUps: ['BFS level-by-level alternative (first level with a valid string)', 'Minimum Remove to Make Valid Parentheses (return one, O(n), Medium)']
    }
  });

  practice.push({
    title: 'Word Break II',
    level: 'Hard',
    tags: ['backtracking', 'memoization', 'strings'],
    companies: ['Google', 'Amazon', 'Uber', 'Dropbox'],
    statement: `<p>Given a string <code>s</code> and a dictionary <code>wordDict</code>, add spaces in s to construct sentences where every word is in the dictionary. Return <b>all</b> such sentences in any order. Words may be reused.</p>`,
    constraints: `1 ≤ s.length ≤ 20, 1 ≤ wordDict.length ≤ 1000, 1 ≤ word length ≤ 10, all dictionary words unique; output size ≤ 10<sup>5</sup>`,
    example: `<p>s = "catsanddog", dict = [cat, cats, and, sand, dog] → ${H.chips(['cats and dog', 'cat sand dog'])}</p><p>Why: "cat|sand|dog" and "cats|and|dog" both split s into dictionary words.</p>`,
    brute: {
      why: `<p>Plain backtracking: from position i try every prefix s[i..j] in the dictionary, recurse on the rest. On inputs like "aaaa…ab" with dict [a, aa, aaa, …] every split of the a's is explored and every one fails at the final "b" — exponential work with zero output. The same suffix is solved again and again.</p>`,
      code: {
          lang: 'java',
          code: `
        List<String> brute(String s, List<String> wordDict) {
            Set<String> dict = new HashSet<>(wordDict);
            List<String> res = new ArrayList<>();
            go(s, 0, dict, new ArrayList<>(), res);
            return res;
        }
        void go(String s, int i, Set<String> dict, List<String> cur, List<String> res) {
            if (i == s.length()) { res.add(String.join(" ", cur)); return; }
            for (int j = i + 1; j <= s.length(); j++) {
                String w = s.substring(i, j);
                if (!dict.contains(w)) continue;
                cur.add(w);
                go(s, j, dict, cur, res);
                cur.remove(cur.size() - 1);
            }
        }`,
          alt: [
            { lang: 'python', code: `def word_break(s, word_dict):
    dictionary = set(word_dict)
    res = []
    go(s, 0, dictionary, [], res)
    return res


def go(s, i, dictionary, cur, res):
    if i == len(s):
        res.append(" ".join(cur))
        return
    for j in range(i + 1, len(s) + 1):
        w = s[i:j]
        if w not in dictionary:
            continue
        cur.append(w)
        go(s, j, dictionary, cur, res)
        cur.pop()` },
            { lang: 'js', code: `function wordBreak(s, wordDict) {
  const dict = new Set(wordDict);
  const res = [];
  go(s, 0, dict, [], res);
  return res;
}

function go(s, i, dict, cur, res) {
  if (i === s.length) { res.push(cur.join(" ")); return; }
  for (let j = i + 1; j <= s.length; j++) {
    const w = s.slice(i, j);
    if (!dict.has(w)) continue;
    cur.push(w);
    go(s, j, dict, cur, res);
    cur.pop();
  }
}` },
            { lang: 'cpp', code: `void go(const string& s, int i, const unordered_set<string>& dict, vector<string>& cur, vector<string>& res) {
    if (i == (int)s.size()) {
        string line;
        for (size_t k = 0; k < cur.size(); k++) line += (k ? " " : "") + cur[k];
        res.push_back(line);
        return;
    }
    for (int j = i + 1; j <= (int)s.size(); j++) {
        string w = s.substr(i, j - i);
        if (!dict.count(w)) continue;
        cur.push_back(w);
        go(s, j, dict, cur, res);
        cur.pop_back();
    }
}

vector<string> wordBreak(string s, vector<string>& wordDict) {
    unordered_set<string> dict(wordDict.begin(), wordDict.end());
    vector<string> res;
    vector<string> cur;
    go(s, 0, dict, cur, res);
    return res;
}` }
          ]
        }
    },
    mcq: {
      q: `Why memoize on the start index i?`,
      options: ['To sort the answers', 'All sentences for suffix s[i..] are the same no matter how we reached i, so compute them once', 'It reduces the dictionary size', 'Memoization is never useful in backtracking'],
      answer: 1,
      explain: `The future depends only on i (the suffix), not on the path taken. Caching the list of sentences per i turns repeated subtrees into lookups — and an empty cached list instantly kills dead suffixes.`
    },
    hints: [
      `<p><b>Aha:</b> the state is just the start index of the remaining suffix; different prefixes reach the same suffix.</p>`,
      `<p>Return, for each i, the list of sentences of s[i..]; cache in a hash map from index to sentences (<code>HashMap</code> / <code>dict</code> or <code>@lru_cache</code> / <code>Map</code> / <code>unordered_map</code>). Use a hash set for the dictionary and limit word lengths to the max word length.</p>`,
      `<p>Base case: i == n → list containing "" (one empty sentence). Combine: for each word w = s[i..j) in dict, for each tail in solve(j): w + (tail empty ? "" : " " + tail).</p>`
    ],
    tests: { sig: 'string list<string> -> list<string>', fn: 'wordBreak', cmp: "set", cases: [
      [["catsanddog",["cat","cats","and","sand","dog"]],["cat sand dog","cats and dog"]],
      [["pineapplepenapple",["apple","pen","applepen","pine","pineapple"]],["pine apple pen apple","pine applepen apple","pineapple pen apple"]],
      [["catsandog",["cats","dog","sand","and","cat"]],[]],
      [["a",["a"]],["a"]],
      [["a",["b"]],[]],
      [["aaaa",["a","aa"]],["a a a a","a a aa","a aa a","aa a a","aa aa"]],
      [["aaaaaaaaaaaaaaaaaaab",["a","aa","aaa","aaaa"]],[]],
      [["abcd",["abcd","a","bcd","ab","cd","b","c","d"]],["a b c d","a b cd","a bcd","ab c d","ab cd","abcd"]]
    ] },
    solution: {
      approach: `<p>Top-down backtracking with memoization on the suffix start; dead suffixes are cached as empty lists, so the exponential failure case disappears. The remaining cost is the size of the output itself.</p>`,
      code: `
        import java.util.*;

        class Solution {
            private Set<String> dict;
            private int maxLen;
            private Map<Integer, List<String>> memo = new HashMap<>();

            public List<String> wordBreak(String s, List<String> wordDict) {
                dict = new HashSet<>(wordDict);
                for (String w : wordDict) maxLen = Math.max(maxLen, w.length());
                return solve(s, 0);
            }

            private List<String> solve(String s, int i) {
                if (memo.containsKey(i)) return memo.get(i);       // suffix already solved
                List<String> out = new ArrayList<>();
                if (i == s.length()) {
                    out.add("");                                   // one way to split nothing
                    return out;
                }
                for (int j = i + 1; j <= Math.min(s.length(), i + maxLen); j++) {
                    String w = s.substring(i, j);
                    if (!dict.contains(w)) continue;               // prune: not a word
                    for (String tail : solve(s, j))                // all sentences of the rest
                        out.add(tail.isEmpty() ? w : w + " " + tail);
                }
                memo.put(i, out);
                return out;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().wordBreak("catsanddog", List.of("cat", "cats", "and", "sand", "dog")));
                // [cat sand dog, cats and dog]
                System.out.println(new Solution().wordBreak("aaaaaaaaaaaaaaaaaaab", List.of("a", "aa", "aaa", "aaaa")));
                // [] instantly thanks to memoization
            }
        }`,
      alt: [
        { lang: 'python', code: `from functools import lru_cache


def word_break(s: str, word_dict: list[str]) -> list[str]:
    words = set(word_dict)
    max_len = max(map(len, word_dict))

    @lru_cache(maxsize=None)                    # memo on the suffix start
    def solve(i: int) -> list[str]:
        if i == len(s):
            return [""]                         # one way to split nothing
        out = []
        for j in range(i + 1, min(len(s), i + max_len) + 1):
            w = s[i:j]
            if w in words:
                out.extend(w if not t else w + " " + t for t in solve(j))
        return out

    return solve(0)` },
        { lang: 'js', code: `function wordBreak(s, wordDict) {
  const dict = new Set(wordDict);
  const maxLen = Math.max(...wordDict.map((w) => w.length));
  const memo = new Map();                // suffix start -> its sentences
  const solve = (i) => {
    if (memo.has(i)) return memo.get(i);
    if (i === s.length) return [''];     // one way to split nothing
    const out = [];
    for (let j = i + 1; j <= Math.min(s.length, i + maxLen); j++) {
      const w = s.slice(i, j);
      if (!dict.has(w)) continue;        // prune: not a word
      for (const tail of solve(j)) out.push(tail ? w + ' ' + tail : w);
    }
    memo.set(i, out);
    return out;
  };
  return solve(0);
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<string> wordBreak(string s, vector<string>& wordDict) {
        dict = unordered_set<string>(wordDict.begin(), wordDict.end());
        maxLen = 0;
        for (const string& w : wordDict) maxLen = max(maxLen, (int)w.size());
        memo.clear();
        return solve(s, 0);
    }
private:
    unordered_set<string> dict;
    int maxLen = 0;
    unordered_map<int, vector<string>> memo;  // suffix start -> its sentences

    vector<string> solve(const string& s, int i) {
        if (i == (int)s.size()) return {""};  // one way to split nothing
        auto it = memo.find(i);
        if (it != memo.end()) return it->second;
        vector<string> out;
        for (int j = i + 1; j <= min((int)s.size(), i + maxLen); j++) {
            string w = s.substr(i, j - i);
            if (!dict.count(w)) continue;     // prune: not a word
            for (const string& tail : solve(s, j)) out.push_back(tail.empty() ? w : w + " " + tail);
        }
        return memo[i] = out;
    }
};` }
      ],
      dry: { head: ['i (suffix)', 'words tried', 'tails', 'memo[i]'], rows: [['7 ("dog")', 'dog', '[""]', '["dog"]'], ['4 ("anddog")', 'and', 'memo[7] = ["dog"]', '["and dog"]'], ['3 ("sanddog")', 'sand', 'memo[7]', '["sand dog"]'], ['0', 'cat → memo[3], cats → memo[4]', '—', H.c('g', '["cat sand dog", "cats and dog"]')]] },
      complexity: `<p><b>Time O(n · L + output size)</b> roughly — each suffix computed once (n states × up to L word checks, L = max word length), plus building the sentences, which can be exponential in the worst case but is bounded by the output. <b>Space</b>: memo of all suffix sentences + O(n) recursion.</p>`,
      followUps: ['Word Break I: just true/false (DP, Medium)', 'Count the sentences without listing them', 'Use a Trie for the dictionary when it is large']
    }
  });

  // ===================== QUIZ =====================
  quiz.push(
    {
      q: `What does this print? <code>void f(int n){ if(n==0) return; f(n-1); print(n); }</code> called as <code>f(3)</code>`,
      options: ['321', '123', '3', 'Nothing — infinite recursion'],
      answer: 1,
      explain: `The print is AFTER the recursive call, so it runs on the way back up: f(1) prints first, then f(2), then f(3) → 123.`
    },
    {
      q: `A recursive function makes one call on n − 1 and does O(1) work. With n = 10<sup>6</sup> in Java (default stack), what is the most likely outcome?`,
      options: ['Runs in O(n) and finishes', 'StackOverflowError — about 10<sup>6</sup> frames is far beyond the default stack', 'The JVM turns it into a loop automatically', 'OutOfMemoryError on the heap'],
      answer: 1,
      explain: `The default thread stack typically holds only tens of thousands of small frames, and the JVM does not perform tail-call elimination. Use a loop or a bigger thread stack.`
    },
    {
      q: `Solve T(n) = 2T(n/2) + O(n).`,
      options: ['O(n)', 'O(n log n)', 'O(n<sup>2</sup>)', 'O(2<sup>n</sup>)'],
      answer: 1,
      explain: `log₂n levels, each level costs n in total (2<sup>k</sup> pieces × n/2<sup>k</sup>). Master Theorem case a = b<sup>d</sup> → O(n log n). This is merge sort.`
    },
    {
      q: `Solve T(n) = 2T(n − 1) + O(1).`,
      options: ['O(n)', 'O(n log n)', 'O(n<sup>2</sup>)', 'O(2<sup>n</sup>)'],
      answer: 3,
      explain: `The number of calls doubles each level for n levels: 1 + 2 + … + 2<sup>n−1</sup> = 2<sup>n</sup> − 1. Tower of Hanoi has exactly this recurrence.`
    },
    {
      q: `Minimum moves for Tower of Hanoi with 10 disks?`,
      options: ['100', '512', '1023', '1024'],
      answer: 2,
      explain: `Moves(n) = 2<sup>n</sup> − 1, so 2<sup>10</sup> − 1 = 1024 − 1 = 1023.`
    },
    {
      q: `A backtracking solution saves answers by adding the shared list <code>cur</code> itself to the result (Java <code>res.add(cur)</code>, Python <code>res.append(cur)</code>, JavaScript <code>res.push(cur)</code>). What goes wrong?`,
      options: ['Nothing', 'All saved entries point to the same list, which ends up empty (or in its final state)', 'It throws ConcurrentModificationException', 'It only saves the first answer'],
      answer: 1,
      explain: `Lists are references. You must store a snapshot: Java <code>new ArrayList&lt;&gt;(cur)</code>, Python <code>cur[:]</code> or <code>list(cur)</code>, JavaScript <code>[...cur]</code>. (C++ <code>push_back</code> copies the vector, so it does not have this bug.)`
    },
    {
      q: `How many subsets does a set of 15 distinct elements have?`,
      options: ['15', '225', '32,768', '1,307,674,368,000'],
      answer: 2,
      explain: `2<sup>15</sup> = 32,768 (each element in or out). 15! = 1.3 × 10<sup>12</sup> would be the number of permutations.`
    },
    {
      q: `Sorted nums [1, 2, 2]. In Subsets II (loop style), which condition correctly skips duplicates?`,
      options: ['j &gt; 0 &amp;&amp; nums[j] == nums[j−1]', 'j &gt; start &amp;&amp; nums[j] == nums[j−1]', 'nums[j] == nums[start]', 'used[j] == true'],
      answer: 1,
      explain: `Only skip equal values at the SAME level (j &gt; start). j &gt; 0 would also forbid [2,2], which is a valid subset.`
    },
    {
      q: `For unique permutations with a used[] array on sorted input, the standard skip rule is:`,
      options: ['skip if nums[i] == nums[i−1]', 'skip if i &gt; 0 &amp;&amp; nums[i] == nums[i−1] &amp;&amp; !used[i−1]', 'skip if used[i−1]', 'skip if i == start'],
      answer: 1,
      explain: `Equal copies must be placed left to right; using copy i before copy i−1 would duplicate a branch. The rule forces a canonical order.`
    },
    {
      q: `In Combination Sum (unlimited reuse), after choosing candidates[i], the recursive call should start from:`,
      options: ['0', 'i', 'i + 1', 'the end of the array'],
      answer: 1,
      explain: `i allows reusing the same number and forbids going back to smaller indices, which would create reordered duplicates.`
    },
    {
      q: `In N-Queens, two queens at (r1, c1) and (r2, c2) are on the same ↙ anti-diagonal when:`,
      options: ['r1 − c1 == r2 − c2', 'r1 + c1 == r2 + c2', 'r1 == r2', '|r1 − r2| == 1'],
      answer: 1,
      explain: `Moving down-left increases r and decreases c, so r + c stays constant. r − c constant is the other (↘) diagonal.`
    },
    {
      q: `Which formula gives the 3×3 box index (0–8) for Sudoku cell (r, c)?`,
      options: ['r / 3 + c / 3', '(r / 3) * 3 + c / 3', 'r * 3 + c', '(r + c) % 9'],
      answer: 1,
      explain: `r / 3 is the band (0–2), c / 3 the stack (0–2); band × 3 + stack numbers the boxes 0..8. r/3 + c/3 collides (box (0,1) and (1,0) both give 1).`
    },
    {
      q: `A problem says "return all valid arrangements" and N ≤ 8. What does the constraint suggest?`,
      options: ['An O(N) greedy', 'Exhaustive backtracking — N! = 40,320 is affordable', 'Binary search on the answer', 'A segment tree'],
      answer: 1,
      explain: `Tiny N plus "all arrangements" is the classic backtracking signal; 8! × 8 ≈ 3 × 10<sup>5</sup> operations.`
    },
    {
      q: `Why should Sudoku's recursive solve return boolean?`,
      options: ['The language requires it', 'To stop at the first solution and avoid erasing it while unwinding', 'To count solutions', 'To make it tail-recursive'],
      answer: 1,
      explain: `When a child reports success, the parent returns immediately without un-choosing, so the filled digits remain on the board.`
    }
  );

  // ===================== INTERVIEW Q&A =====================
  interview.push(
    {
      q: `What are the two parts every recursive function needs, and what happens if one is wrong?`,
      level: 'B',
      a: `<p>A <b>base case</b> — the smallest input answered directly, which stops the recursion — and a <b>recursive case</b> that moves strictly toward the base case and combines the smaller answer. If the base case is missing or unreachable (e.g. stepping n − 2 toward a base case of n == 1 with even n), calls never stop and the program crashes with a stack overflow (Java <code>StackOverflowError</code>, Python <code>RecursionError</code>). If the recursive case does not shrink the input, same result. Correctness is proved by induction: base case right + "if the smaller call is right, my combination is right".</p>`,
      followUps: ['How would you debug a StackOverflowError?', 'Can a function have several base cases?']
    },
    {
      q: `What is a stack frame and what determines the space complexity of recursion?`,
      level: 'B',
      a: `<p>A stack frame is the per-call record: parameters, local variables, operand stack and the return address. Each call pushes one; each return pops it. Extra space is the <b>maximum depth</b> of the call stack times the frame size — not the total number of calls. Naive fib(n) makes ~1.6<sup>n</sup> calls but only n frames are alive at once, so it is O(n) space. Objects created inside calls live on the heap and count separately (e.g. copies of lists in backtracking).</p>`,
      followUps: ['Why does merge sort use O(n) space if its stack is O(log n)?', 'Where do local objects live in Java?']
    },
    {
      q: `Does Java optimise tail recursion? What do you do when recursion is too deep?`,
      level: 'I',
      a: `<p>No. The JVM (including Java 21+) does not perform tail-call elimination, and neither does CPython; Scala's <code>@tailrec</code> and Kotlin's <code>tailrec</code> rewrite to loops at compile time. For deep recursion: (1) convert to an iterative loop, (2) simulate the recursion with an explicit <code>ArrayDeque</code> stack, or (3) run the work in a <code>Thread</code> created with a large stack size. In interviews, mention the limit (~10<sup>4</sup>–10<sup>5</sup> frames by default) when N is large.</p>`,
      followUps: ['Convert recursive DFS to iterative', 'What is the default -Xss and why does it vary?']
    },
    {
      q: `How do you find the time complexity of a recursive function?`,
      level: 'I',
      a: `<p>Write its recurrence: T(n) = (number of calls) × T(smaller size) + (work outside the calls). Then solve it: draw the <b>recursion tree</b> and sum work level by level, unroll it algebraically, or apply the <b>Master Theorem</b> for T(n) = aT(n/b) + n<sup>d</sup>. Examples: T(n/2) + 1 → O(log n); 2T(n/2) + n → O(n log n); 2T(n − 1) + 1 → O(2<sup>n</sup>); n·T(n − 1) → O(n!). For backtracking, multiply the number of nodes by work per node and add the copy cost per answer.</p>`,
      followUps: ['Solve T(n) = 3T(n/2) + n', 'Why does the Master Theorem not apply to T(n) = T(n−1) + n?']
    },
    {
      q: `Explain the Tower of Hanoi solution and prove it is optimal.`,
      level: 'I',
      a: `<p>To move n disks from A to C: move n − 1 disks A → B (using C), move the largest disk A → C, move n − 1 disks B → C (using A). Moves satisfy M(n) = 2M(n − 1) + 1 = 2<sup>n</sup> − 1. Optimality: the largest disk must move at least once, and when it first moves, all other disks must be stacked on the spare peg (≥ M(n − 1) moves); after its last move they must all be moved onto it (≥ M(n − 1) more). So any solution needs ≥ 2M(n − 1) + 1 moves.</p>`,
      followUps: ['Which disk moves at step k?', 'Iterative solution', 'Four pegs (Frame–Stewart)']
    },
    {
      q: `What is backtracking and how is it different from plain recursion or brute force?`,
      level: 'I',
      a: `<p>Backtracking is a depth-first search over a decision tree that builds a candidate one choice at a time, <b>undoes</b> each choice after exploring it (choose → explore → un-choose), and <b>prunes</b> branches that cannot lead to a valid answer. Brute force generates every complete candidate and checks it at the end; backtracking checks constraints on partial candidates, so whole subtrees are skipped. It uses only O(depth) memory because the tree exists only on the call stack.</p>`,
      followUps: ['Give an example where pruning changes the complexity dramatically', 'When does backtracking become DP?']
    },
    {
      q: `How do you avoid duplicate answers in Subsets II, Permutations II and Combination Sum II?`,
      level: 'A',
      a: `<p>Sort first so equal values are adjacent. For loop-style generation (Subsets II, Combination Sum II) skip <code>j &gt; start &amp;&amp; a[j] == a[j−1]</code>: at one level, only the first copy of a value may start a branch. For permutations with used[], skip <code>i &gt; 0 &amp;&amp; a[i] == a[i−1] &amp;&amp; !used[i−1]</code>: copies must be placed left to right. Both pick a canonical representative of each multiset/arrangement, so no Set is needed and no duplicate subtree is explored. With the swap method, use a per-level HashSet of values tried.</p>`,
      followUps: ['Why is j &gt; 0 wrong in Subsets II?', 'Does used[i−1] (without !) also work?']
    },
    {
      q: `Compare the swap method and the used[] method for permutations.`,
      level: 'I',
      a: `<p><b>Swap:</b> the array is the state; swap element j into position i, recurse on i + 1, swap back. No extra list or boolean array, but output is not in lexicographic order and duplicate handling needs a per-level Set. <b>used[]:</b> build a separate list, mark used indices; O(n) extra memory, natural lexicographic order on sorted input, and the simple sorted-skip rule handles duplicates. Both are O(n · n!) time. I default to used[] for clarity unless memory is tight.</p>`,
      followUps: ['Generate the k-th permutation directly', 'Next permutation in O(n)']
    },
    {
      q: `Walk me through N-Queens. How do you check safety in O(1)?`,
      level: 'A',
      a: `<p>One queen per row, so each level of recursion chooses a column for row r. Maintain three boolean arrays: <code>cols[c]</code>, <code>diag[r − c + n − 1]</code> and <code>anti[r + c]</code> (sizes n, 2n − 1, 2n − 1). A cell is safe iff all three are false. Choose: set all three and place the queen; explore row r + 1; un-choose: clear them. For counting only, replace arrays with three int bitmasks, take <code>free = full &amp; ~(cols | d | a)</code>, iterate with <code>bit = free &amp; -free</code> and shift diagonals by one when moving to the next row. Mirror symmetry halves the work.</p>`,
      followUps: ['How many nodes for n = 8?', 'Find one solution for n = 10<sup>6</sup>']
    },
    {
      q: `How would you write and speed up a Sudoku solver?`,
      level: 'A',
      a: `<p>Model each empty cell as a decision with digits 1–9. Keep used-tables (or 9-bit masks) per row, column and box (box = (r/3)*3 + c/3) for O(1) validity. Recursive solve returns boolean: on success return true without erasing, otherwise erase and try the next digit; return false if no digit fits. Speed-ups: <b>MRV</b> (pick the empty cell with the fewest candidates; a 0-candidate cell fails immediately), constraint propagation (naked/hidden singles), and for heavy use, exact cover with Dancing Links or a CP-SAT solver.</p>`,
      followUps: ['How do you check a puzzle has a unique solution?', 'Why is generalised Sudoku NP-complete?']
    },
    {
      q: `Given only the constraints, how do you decide whether backtracking is acceptable?`,
      level: 'I',
      a: `<p>Estimate the size of the search tree and compare with ~10<sup>8</sup> simple operations per second. N ≤ 10–12 → n! is OK; N ≤ 20–25 → 2<sup>n</sup> is OK; board puzzles up to 9×9 with strong pruning are OK. If N is 40, consider meet in the middle (2 × 2<sup>20</sup>). If N is 10<sup>3</sup>+ or the question asks only for a <b>count</b> or <b>optimum</b>, look for overlapping states and use DP, greedy or math instead of listing. Also mind the output size: if the answer itself is exponential, exponential time is unavoidable.</p>`,
      followUps: ['Subset sum with n = 40', 'When do you memoize a backtracking solution?']
    },
    {
      q: `What are the most common bugs in backtracking code, and how do you test for them?`,
      level: 'I',
      a: `<p>(1) Saving a reference instead of a copy; (2) un-choose that does not mirror choose (forgetting to reset used[], or an early <code>continue</code>/<code>return</code> that skips the undo); (3) <code>cur.remove(x)</code> on a <code>List&lt;Integer&gt;</code> with an int, which removes by index; (4) wrong start index (i vs i + 1 vs 0) giving reorderings or missing reuse; (5) duplicate-skip using the wrong condition; (6) using <code>break</code> where only <code>continue</code> is safe. Test with tiny inputs whose answers you can list by hand, inputs with duplicates, empty/size-1 inputs, and compare against a brute-force generator on random small cases.</p>`,
      followUps: ['Write a property test for Permutations II', 'Why is cur.remove(cur.size() - 1) safe?']
    },
    {
      q: `When does a backtracking problem turn into dynamic programming?`,
      level: 'A',
      a: `<p>When the remaining work depends only on a small summary of the past (an index, a remaining sum, a bitmask) rather than the full path, different paths reach the same state — <b>overlapping subproblems</b>. If the question asks for a count, a boolean or an optimum, memoize on that state (top-down DP) or tabulate. Examples: Combination Sum → Coin Change II (count), Word Break II → memoize sentences per suffix, Partition to K Subsets → bitmask DP O(n·2<sup>n</sup>), permutations with cost → bitmask DP (TSP). If the question asks to list all solutions, backtracking remains, possibly with memo to kill dead branches.</p>`,
      followUps: ['Turn Subset Sum backtracking into DP', 'Why does memoizing lists blow up memory?']
    },
    {
      q: `How would you use an AI coding assistant on a backtracking problem in a real job, and what would you still verify yourself?`,
      level: 'E',
      a: `<p>I would describe the state, choices, goal and prunes myself, then let the assistant draft code and a brute-force reference generator. I would verify: copies vs references, symmetric undo, the start index, the duplicate rule, and complexity versus real input sizes. I would run a differential test (pruned vs brute force on random small inputs) and a timing test at the max constraint. For production constraint problems (scheduling, assignment, puzzles at scale) I would also evaluate a solver library such as OR-Tools CP-SAT instead of custom backtracking, because they bring propagation, heuristics and parallelism for free.</p>`,
      followUps: ['What prompt would you write to get useful edge cases?', 'When is a hand-written solver still the better choice?']
    }
  );

  registerModule({
    id: 'dsa11',
    title: 'Recursion & Backtracking',
    intro: `<p>Recursion is a function solving a problem by handing a <b>smaller copy of the same problem</b> to itself. Backtracking is recursion that <b>builds an answer one decision at a time</b> and <b>undoes</b> each decision after exploring it — the engine behind "return all subsets / permutations / combinations", N-Queens and Sudoku.</p>
      <p>In this module you will first see what really happens in memory (the <b>call stack</b>), learn to read the cost of any recursive function from its <b>recursion tree</b>, and solve the Tower of Hanoi. Then you will learn one template — <b>choose → explore → un-choose</b> — and apply it to subsets (pick / not-pick), permutations (swap and used[], with duplicates), combination sums, N-Queens and Sudoku. Every topic has a step-by-step visualizer: watch the stack grow and shrink, the tree branch, and queens get placed and lifted.</p>
      <p>Why it matters: backtracking questions are a staple of FAANG-style interviews (Subsets, Permutations, Combination Sum, Generate Parentheses, Word Search, N-Queens), and the recursion tree is the mental model you will reuse for Divide &amp; Conquer, Trees, Graph DFS and Dynamic Programming.</p>`,
    goals: [
      'Trace any recursive function on the <b>call stack</b>: predict output order, stack depth and when a stack overflow happens.',
      'Turn recursive code into a <b>recurrence</b> and solve it with a recursion tree, unrolling or the Master Theorem (O(log n), O(n log n), O(2<sup>n</sup>), O(n!)).',
      'Solve Tower of Hanoi and prove why it needs exactly 2<sup>n</sup> − 1 moves.',
      'Apply the <b>choose → explore → un-choose</b> template to subsets, permutations (with duplicates) and combination sums without producing duplicate answers.',
      'Solve N-Queens and Sudoku with O(1) conflict checks and explain the pruning that makes them fast.',
      'Recognise from the constraints (N ≤ 10, ≤ 20) and wording ("return all…") when exhaustive search is expected — and when to switch to DP or a formula.'
    ],
    prereqs: `DSA 1 (Programming Foundations: methods, stack vs heap, references), DSA 2 (Time/Space Complexity, AP/GP and logarithms) and DSA 4 (Bit Manipulation, for bitmask subsets and N-Queens bitmasks). Comfort with Java <code>ArrayList</code> and arrays.`,
    hours: 14,
    langNotes: {
      java: `<p><b>Java:</b> the default thread stack holds roughly 10<sup>4</sup> simple frames, so recursion 10<sup>5</sup>–10<sup>6</sup> deep throws <code>StackOverflowError</code>; use a loop, an <code>ArrayDeque</code> stack, or a <code>new Thread(null, task, "big", 1L &lt;&lt; 26)</code>. The JVM never removes tail calls. <code>int</code> overflow wraps silently (13!, F(47), 2<sup>31</sup>), so use <code>long</code> and copy n into a <code>long</code> before negating. Backtracking pitfalls: save <code>new ArrayList&lt;&gt;(cur)</code>, not <code>cur</code>; undo with <code>cur.remove(cur.size() - 1)</code> (an <code>int</code> argument removes by index, an <code>Integer</code> by value); <code>StringBuilder.setLength(len)</code> undoes several appends at once. Strings are immutable, so edit a <code>char[]</code> in place.</p>`,
      python: `<p><b>Python:</b> the recursion limit is <b>1000</b> frames, which plain recursion on n = 10<sup>4</sup> already exceeds. Raise it with <code>sys.setrecursionlimit(10**6)</code>, and for very deep DFS run the work in a <code>threading.Thread</code> after <code>threading.stack_size(512 * 1024 * 1024)</code>, or write the loop with an explicit stack. CPython never removes tail calls. Integers never overflow, so 20!, F(90) and 2<sup>64</sup> are exact. Save copies with <code>cur[:]</code> or <code>list(cur)</code>; undo with <code>cur.pop()</code> (O(1) at the end; <code>pop(0)</code> is O(n)). <code>"".join(parts)</code> builds strings in O(n), while <code>s += ch</code> in a loop can be O(n²). <code>functools.lru_cache</code> memoizes a recursive function in one line, and <code>itertools.permutations</code> / <code>combinations</code> / <code>product</code> make great brute-force checkers.</p>`,
      js: `<p><b>JavaScript:</b> V8 allows roughly 10<sup>4</sup> frames before <code>RangeError: Maximum call stack size exceeded</code>, and it does not perform tail-call optimisation, so use an explicit array stack for deep searches. <code>Number</code> is exact only up to 2<sup>53</sup>: 19! and F(79) are past it, so use <code>BigInt</code> (<code>1n</code>, <code>BigInt(n)</code>). Bit tricks (<code>&amp;</code>, <code>|</code>, <code>&lt;&lt;</code>, <code>x &amp; -x</code>) work on 32-bit signed ints, which is fine for masks up to 31 bits; <code>Math.clz32</code> finds the highest set bit. <code>arr.sort()</code> compares as strings, so pass <code>(a, b) =&gt; a - b</code>. Save copies with <code>[...cur]</code>, undo with <code>cur.pop()</code> (<code>shift()</code> is O(n)), and build strings with an array plus <code>join('')</code>.</p>`,
      cpp: `<p><b>C++:</b> the main thread usually has an 8 MB stack (1 MB on Windows) and there is no exception on overflow: the program just crashes, so estimate depth × frame size. Pass vectors and strings by reference (<code>vector&lt;int&gt;&amp; cur</code>, <code>const string&amp; s</code>); passing by value copies them on every call and silently makes backtracking slower. <code>res.push_back(cur)</code> copies the current vector, which is exactly the snapshot you need. Signed overflow is undefined behaviour, so use <code>long long</code> for factorials, Fibonacci and expression values. Handy built-ins: <code>__builtin_popcount</code>, <code>__builtin_ctz</code> / <code>std::countr_zero</code>, and <code>std::next_permutation</code> (iterates permutations in lexicographic order and skips duplicates of a sorted range). Use <code>unordered_set</code> / <code>unordered_map</code> (O(1) average) rather than <code>set</code> / <code>map</code> (O(log n)) for seen-sets and memo tables.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
