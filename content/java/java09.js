(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function esc(s) { return H.esc(String(s)); }
  function clean(input) { return String(input === undefined || input === null ? '' : input).trim(); }
  function out(text, label) {
    return { type: 'text', label: label || 'Console output', html: text ? '<code>' + esc(text).replace(/\n/g, '<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  function note(html, label) { return { type: 'text', label: label || 'Why', html: html }; }
  function intsOf(s, minN, maxN, lo, hi, hint) {
    var t = clean(s);
    if (!t) throw new Error(hint);
    var a = t.split(/[\s,]+/).map(Number);
    if (a.length < minN || a.length > maxN || a.some(function (x) { return isNaN(x) || x !== Math.floor(x) || x < lo || x > hi; })) throw new Error(hint);
    return a;
  }
  /* code frames: step = { l: line|[lines], cls, v: {vars}, hv, vl, out, extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Code (highlighted line = running now)', lang: 'java', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables', vals: s.v, hl: s.hv || {} });
      (s.extra || []).forEach(function (p) { parts.push(p); });
      if (s.out !== undefined) parts.push(out(s.out));
      return { narr: s.narr, parts: parts };
    });
  }

  /* =====================================================================
     STREAM PIPELINE SIMULATOR — models how a sequential java.util.stream
     pipeline really runs: elements are pushed ONE AT A TIME through every
     stage ("vertical" processing), sorted() is a barrier that buffers,
     limit()/findFirst()/anyMatch() request cancellation, and with no
     terminal operation nothing runs at all.
     Input grammar:  SOURCE | op | op | ... | terminal
       SOURCE: "5 3 8 1"   or   "iterate 1 +2"   or   "range 1 10"
       ops: filter even|odd|>N|<N|>=N|<=N|==N|!=N · map *N|+N|-N|/N|%N|^2 · peek [label]
            limit N · skip N · distinct · sorted [desc]
       terminal: toList · count · sum · findFirst · forEach · max · min
                 anyMatch COND · allMatch COND · noneMatch COND
     ===================================================================== */
  function parseCond(s) {
    s = clean(s).replace(/\s+/g, '');
    if (s === 'even') return { f: function (x) { return x % 2 === 0; }, j: 'x -> x % 2 == 0', t: 'even' };
    if (s === 'odd') return { f: function (x) { return Math.abs(x % 2) === 1; }, j: 'x -> x % 2 != 0', t: 'odd' };
    var m = s.match(/^(>=|<=|==|!=|>|<)(-?\d+)$/);
    if (!m) throw new Error('Conditions look like: even, odd, >3, <10, >=2, ==4, !=0');
    var n = Number(m[2]), op = m[1];
    var F = { '>': function (x) { return x > n; }, '<': function (x) { return x < n; }, '>=': function (x) { return x >= n; }, '<=': function (x) { return x <= n; }, '==': function (x) { return x === n; }, '!=': function (x) { return x !== n; } };
    return { f: F[op], j: 'x -> x ' + op + ' ' + n, t: op + n };
  }
  function parseMap(s) {
    s = clean(s).replace(/\s+/g, '');
    if (s === '^2' || s === 'square') return { f: function (x) { return x * x; }, j: 'x -> x * x', t: 'x*x' };
    var m = s.match(/^([*+\-\/%])(-?\d+)$/);
    if (!m) throw new Error('Maps look like: *10, +1, -3, /2, %3, ^2');
    var n = Number(m[2]), op = m[1];
    if ((op === '/' || op === '%') && n === 0) throw new Error('No dividing by zero, please');
    var F = { '*': function (x) { return x * n; }, '+': function (x) { return x + n; }, '-': function (x) { return x - n; }, '/': function (x) { return Math.trunc(x / n); }, '%': function (x) { return x % n; } };
    return { f: F[op], j: 'x -> x ' + op + ' ' + n, t: 'x' + op + n };
  }
  function parsePipeline(input) {
    var segs = clean(input).split('|').map(function (x) { return clean(x); });
    if (segs.length < 2 || !segs[0]) throw new Error('Format: SOURCE | op | op | terminal — e.g. 5 3 8 1 | filter >2 | map *10 | toList');
    var src = segs[0], source;
    var it = src.match(/^iterate\s+(-?\d+)\s+([*+\-])\s*(\d+)$/), rg = src.match(/^range\s+(-?\d+)\s+(-?\d+)$/);
    if (it) {
      var seed = Number(it[1]), op = it[2], k = Number(it[3]);
      source = { infinite: true, gen: function (i) { var v = seed; for (var q = 0; q < i; q++) v = op === '+' ? v + k : op === '-' ? v - k : v * k; return v; }, java: 'Stream.iterate(' + seed + ', x -> x ' + op + ' ' + k + ')' };
    } else if (rg) {
      var a = Number(rg[1]), b = Number(rg[2]);
      if (b <= a || b - a > 16) throw new Error('range a b needs a < b and at most 16 numbers');
      var vals = []; for (var r = a; r < b; r++) vals.push(r);
      source = { values: vals, java: 'IntStream.range(' + a + ', ' + b + ').boxed()' };
    } else {
      var nums = intsOf(src, 1, 12, -999, 999, 'Source: up to 12 integers (e.g. 5 3 8 1), or "iterate 1 +2", or "range 1 8"');
      source = { values: nums, java: 'Stream.of(' + nums.join(', ') + ')' };
    }
    var ops = [], terminal = null;
    for (var i = 1; i < segs.length; i++) {
      var s = segs[i], w = s.split(/\s+/), name = w[0], rest = s.slice(name.length).trim();
      if (terminal) throw new Error('Nothing may come after the terminal operation (' + terminal.name + ')');
      if (name === 'filter') { var c = parseCond(rest); ops.push({ k: 'filter', f: c.f, java: '.filter(' + c.j + ')', t: 'filter ' + c.t }); }
      else if (name === 'map') { var mp = parseMap(rest); ops.push({ k: 'map', f: mp.f, java: '.map(' + mp.j + ')', t: 'map ' + mp.t }); }
      else if (name === 'peek') { var lb = rest || 'peek'; ops.push({ k: 'peek', lab: lb, java: '.peek(x -> System.out.println("' + lb + ' " + x))', t: 'peek' }); }
      else if (name === 'limit' || name === 'skip') {
        var n = Number(rest); if (!/^\d+$/.test(rest) || n > 50) throw new Error(name + ' needs a number 0..50');
        ops.push({ k: name, n: n, java: '.' + name + '(' + n + ')', t: name + ' ' + n });
      }
      else if (name === 'distinct') ops.push({ k: 'distinct', java: '.distinct()', t: 'distinct' });
      else if (name === 'sorted') { var d = rest === 'desc'; ops.push({ k: 'sorted', desc: d, java: d ? '.sorted(Comparator.reverseOrder())' : '.sorted()', t: d ? 'sorted desc' : 'sorted' }); }
      else if (['toList', 'count', 'sum', 'findFirst', 'forEach', 'max', 'min'].indexOf(name) >= 0) {
        var J = { toList: '.toList();', count: '.count();', sum: '.mapToInt(Integer::intValue).sum();', findFirst: '.findFirst();', forEach: '.forEach(System.out::println);', max: '.max(Integer::compare);', min: '.min(Integer::compare);' };
        terminal = { name: name, java: J[name] };
      }
      else if (name === 'anyMatch' || name === 'allMatch' || name === 'noneMatch') { var cc = parseCond(rest); terminal = { name: name, f: cc.f, java: '.' + name + '(' + cc.j + ');' }; }
      else throw new Error('Unknown step "' + name + '". Ops: filter map peek limit skip distinct sorted · terminals: toList count sum findFirst forEach max min anyMatch allMatch noneMatch');
    }
    if (ops.length > 7) throw new Error('At most 7 intermediate operations, please');
    return { source: source, ops: ops, terminal: terminal };
  }
  function simulateStream(input) {
    var P = parsePipeline(input), S = P.source, ops = P.ops, T = P.terminal;
    var codeLines = [(T ? 'var result = ' : 'var pipeline = ') + S.java];
    ops.forEach(function (o) { codeLines.push('    ' + o.java); });
    if (T) codeLines.push('    ' + T.java); else codeLines[codeLines.length - 1] += ';';
    var code = codeLines.join('\n'), termLine = ops.length + 2;
    var frames = [], log = [], printed = [], result = [], pulled = [], srcIdx = -1;
    var tstate = { count: 0, sum: 0, done: false, val: null, has: false };
    var MAXF = 90, truncated = false;
    ops.forEach(function (o) { o.cnt = 0; o.buf = []; o.seen = []; });
    function srcPart() {
      var vals = S.infinite ? pulled.slice() : S.values, hl = {}, ptr = {};
      for (var i = 0; i < vals.length; i++) if (i < srcIdx) hl[i] = 'done';
      if (srcIdx >= 0 && srcIdx < vals.length) { hl[srcIdx] = 'cur'; ptr[srcIdx] = 'now'; }
      return { type: 'array', label: S.infinite ? 'Source (infinite — only what was pulled so far)' : 'Source elements', values: vals.length ? vals : ['(none yet)'], hl: hl, ptr: ptr };
    }
    function termPart() {
      if (!T) return note('No terminal operation → no result. The pipeline is just a recipe.', 'Result');
      if (T.name === 'toList') return { type: 'array', label: 'Result list so far', values: result.length ? result.slice() : ['[ ]'], hl: result.length ? one(result.length - 1, 'ok') : {} };
      var v = {};
      if (T.name === 'count') v.count = tstate.count;
      else if (T.name === 'sum') v.sum = tstate.sum;
      else if (T.name === 'max' || T.name === 'min') v[T.name] = tstate.has ? 'Optional[' + tstate.val + ']' : 'Optional.empty';
      else if (T.name === 'findFirst') v.findFirst = tstate.has ? 'Optional[' + tstate.val + ']' : 'Optional.empty';
      else if (T.name === 'forEach') v.forEach = 'printed ' + printed.length + ' line(s)';
      else v[T.name] = tstate.has ? String(tstate.val) : (T.name === 'anyMatch' ? 'false (so far)' : 'true (so far)');
      return { type: 'vars', label: 'Terminal state', vals: v, hl: one(Object.keys(v)[0], 'sel') };
    }
    function snap(narr, stage, cls) {
      if (frames.length >= MAXF) { truncated = true; return; }
      var rows = log.slice(-9), hl = {};
      if (rows.length) hl[rows.length - 1] = cls || 'cur';
      var chl = {};
      if (stage === 'src') chl[1] = 'cur'; else if (stage === 'T') chl[termLine] = cls || 'cur'; else if (typeof stage === 'number') chl[stage + 2] = cls || 'cur';
      var parts = [{ type: 'code', label: 'The pipeline (highlighted = stage handling the element now)', lang: 'java', code: code, hl: chl }, srcPart(),
        { type: 'table', label: 'Event log — the real order things happen (latest 9)', columns: ['#', 'element', 'stage', 'what happened'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }, termPart()];
      if (printed.length) parts.push(out(printed.join('\n')));
      frames.push({ narr: narr, parts: parts });
    }
    function cancelFrom(i) {
      for (var j = i; j < ops.length; j++) {
        if (ops[j].k === 'sorted') return false;
        if (ops[j].k === 'limit' && ops[j].cnt >= ops[j].n) return true;
      }
      return tstate.done;
    }
    function push(v, i) {
      if (truncated) return;
      if (i === ops.length) { terminalAccept(v); return; }
      var o = ops[i];
      if (o.k === 'filter') {
        if (o.f(v)) { log.push([String(log.length + 1), String(v), o.t, 'passes ✔']); snap('<b>' + v + '</b> reaches <code>' + esc(o.java) + '</code> and <span class="c-g">passes</span>, so it moves straight on to the next stage — it does <b>not</b> wait for the other elements.', i, 'ok'); push(v, i + 1); }
        else { log.push([String(log.length + 1), String(v), o.t, 'dropped ✘']); snap('<b>' + v + '</b> fails the test in <code>' + esc(o.java) + '</code> and is <span class="c-r">dropped</span>. Later stages never see it — that is why filtering early saves work.', i, 'bad'); }
      } else if (o.k === 'map') {
        var nv = o.f(v);
        log.push([String(log.length + 1), String(v), o.t, v + ' → ' + nv]); snap('<code>' + esc(o.java) + '</code> turns <b>' + v + '</b> into <b>' + nv + '</b> and hands it on right away.', i, 'cur'); push(nv, i + 1);
      } else if (o.k === 'peek') {
        printed.push(o.lab + ' ' + v);
        log.push([String(log.length + 1), String(v), 'peek', 'prints "' + o.lab + ' ' + v + '"']); snap('<code>peek</code> lets us spy: it prints <b>' + esc(o.lab + ' ' + v) + '</b> and passes the element on unchanged. The print order reveals the true (vertical) processing order.', i, 'cur'); push(v, i + 1);
      } else if (o.k === 'skip') {
        if (o.cnt < o.n) { o.cnt++; log.push([String(log.length + 1), String(v), o.t, 'skipped (' + o.cnt + '/' + o.n + ')']); snap('<code>skip(' + o.n + ')</code> throws away <b>' + v + '</b> — it is still within the first ' + o.n + ' elements to skip.', i, 'bad'); }
        else { log.push([String(log.length + 1), String(v), o.t, 'passes ✔']); snap('<code>skip</code> already skipped its quota, so <b>' + v + '</b> passes.', i, 'ok'); push(v, i + 1); }
      } else if (o.k === 'limit') {
        if (o.cnt < o.n) {
          o.cnt++; log.push([String(log.length + 1), String(v), o.t, 'passes (' + o.cnt + '/' + o.n + ')']);
          snap('<code>limit(' + o.n + ')</code> lets <b>' + v + '</b> through (' + o.cnt + ' of ' + o.n + ').' + (o.cnt === o.n ? ' <span class="c-y">Quota full → after this element finishes its trip, the stream will stop pulling from the source.</span>' : ''), i, 'ok');
          push(v, i + 1);
        }
      } else if (o.k === 'distinct') {
        if (o.seen.indexOf(v) >= 0) { log.push([String(log.length + 1), String(v), 'distinct', 'duplicate, dropped']); snap('<code>distinct()</code> remembers what it has seen (a HashSet inside). <b>' + v + '</b> is a <span class="c-r">repeat</span>, so it is dropped.', i, 'bad'); }
        else { o.seen.push(v); log.push([String(log.length + 1), String(v), 'distinct', 'first time, passes']); snap('<code>distinct()</code> has never seen <b>' + v + '</b>: it remembers it and passes it on immediately (distinct is stateful but still lazy).', i, 'ok'); push(v, i + 1); }
      } else if (o.k === 'sorted') {
        o.buf.push(v); log.push([String(log.length + 1), String(v), o.t, 'buffered (waits)']);
        snap('<code>' + esc(o.java) + '</code> is a <b>barrier</b>: it cannot emit anything until it has seen <i>every</i> element (the smallest might come last!). <b>' + v + '</b> waits in its buffer [' + o.buf.join(', ') + '].', i, 'win');
      }
    }
    function terminalAccept(v) {
      var n = T.name;
      if (n === 'toList') { result.push(v); log.push([String(log.length + 1), String(v), 'toList', 'added to result']); snap('<b>' + v + '</b> survived every stage and lands in the result list.', 'T', 'ok'); }
      else if (n === 'count') { tstate.count++; log.push([String(log.length + 1), String(v), 'count', 'count = ' + tstate.count]); snap('<code>count()</code> just counts arrivals: now <b>' + tstate.count + '</b>.', 'T', 'ok'); }
      else if (n === 'sum') { tstate.sum += v; log.push([String(log.length + 1), String(v), 'sum', 'sum = ' + tstate.sum]); snap('<code>sum()</code> adds <b>' + v + '</b>: running total <b>' + tstate.sum + '</b>.', 'T', 'ok'); }
      else if (n === 'forEach') { printed.push(String(v)); log.push([String(log.length + 1), String(v), 'forEach', 'prints ' + v]); snap('<code>forEach</code> prints <b>' + v + '</b>.', 'T', 'ok'); }
      else if (n === 'max' || n === 'min') {
        var better = !tstate.has || (n === 'max' ? v > tstate.val : v < tstate.val);
        if (better) { tstate.val = v; tstate.has = true; }
        log.push([String(log.length + 1), String(v), n, better ? 'new ' + n + ' = ' + v : 'not better']); snap('<code>' + n + '()</code> compares <b>' + v + '</b> with the best so far → ' + (better ? '<span class="c-g">new ' + n + '</span>' : 'keeps ' + tstate.val) + '.', 'T', better ? 'ok' : 'cur');
      } else if (n === 'findFirst') { tstate.val = v; tstate.has = true; tstate.done = true; log.push([String(log.length + 1), String(v), 'findFirst', 'FOUND → stop!']); snap('<code>findFirst()</code> got <b>' + v + '</b>. It is <span class="c-y">short-circuiting</span>: it tells the whole pipeline "I am done, stop pulling".', 'T', 'sel'); }
      else {
        var hit = T.f(v);
        if (n === 'anyMatch' && hit) { tstate.val = true; tstate.has = true; tstate.done = true; }
        if (n === 'allMatch' && !hit) { tstate.val = false; tstate.has = true; tstate.done = true; }
        if (n === 'noneMatch' && hit) { tstate.val = false; tstate.has = true; tstate.done = true; }
        log.push([String(log.length + 1), String(v), n, (hit ? 'matches' : 'no match') + (tstate.done ? ' → answer known, stop!' : '')]);
        snap('<code>' + n + '</code> tests <b>' + v + '</b>: ' + (hit ? 'matches' : 'does not match') + '. ' + (tstate.done ? '<span class="c-y">The answer is now certain, so it short-circuits.</span>' : 'Answer not certain yet — keep going.'), 'T', tstate.done ? 'sel' : 'cur');
      }
    }
    /* Frame 1 & 2: building the pipeline is free */
    snap('Java first <b>builds</b> the pipeline: each method call just links a new stage object to the previous one. <span class="c-y">No element has been touched yet.</span>', 'src', 'cur');
    log.push(['–', '–', 'build', ops.length + ' intermediate stage(s) linked']);
    snap('All intermediate operations (<code>' + esc(ops.map(function (o) { return o.t; }).join(', ') || 'none') + '</code>) are <b>lazy</b>: they only describe work. Work starts only when a <b>terminal</b> operation asks for a result.', ops.length ? 0 : 'src', 'cur');
    if (!T) {
      log.push(['–', '–', '(no terminal)', 'nothing runs']);
      snap('There is <span class="c-r">no terminal operation</span>, so this statement does nothing at all — no filter test, no map, no peek print. Add <code>| toList</code> (or count, findFirst …) to run it.', 'src', 'bad');
      snap('Lesson: <b>a stream without a terminal operation is just a recipe card</b>. This is the #1 "predict the output" trap: the answer is "prints nothing".', 'src', 'sel');
      return frames;
    }
    var sizedOnly = !S.infinite && T.name === 'count' && ops.every(function (o) { return o.k === 'map' || o.k === 'peek' || o.k === 'sorted'; });
    if (sizedOnly) {
      tstate.count = S.values.length;
      log.push(['–', '–', 'count', 'size known = ' + S.values.length]);
      snap('Surprise: since Java 9, <code>count()</code> checks whether the stream already <b>knows its size</b>. map/peek/sorted cannot change how many elements there are, so the answer is just the source size.', 'T', 'sel');
      snap('So the stages are <span class="c-r">never executed</span>: peek prints nothing and map is never called. Count = <b>' + S.values.length + '</b>. (Add a filter and the pipeline really runs.)', 'T', 'sel');
      return frames;
    }
    var limitPull = S.infinite ? 25 : S.values.length;
    snap('The terminal operation <code>' + esc(T.java) + '</code> starts the engine. Now the source is asked for elements <b>one at a time</b>.', 'T', 'cur');
    var i;
    for (i = 0; i < limitPull && !truncated; i++) {
      if (cancelFrom(0)) {
        log.push(['–', '–', 'source', 'cancel requested → stop pulling']);
        snap('Before pulling the next element, the source asks "does anyone downstream want more?" — a short-circuit stage said <span class="c-y">no</span>. ' + (S.infinite ? 'That is the ONLY reason an infinite stream can finish.' : 'The remaining source elements are never even looked at.'), 'src', 'sel');
        break;
      }
      var v = S.infinite ? S.gen(i) : S.values[i];
      if (S.infinite) pulled.push(v);
      srcIdx = i;
      log.push([String(log.length + 1), String(v), 'source', 'pulled']);
      snap('The source hands over element <b>' + v + '</b>. It will travel through the whole pipeline <b>before</b> the next element is pulled.', 'src', 'cur');
      push(v, 0);
    }
    if (S.infinite && i >= limitPull && !cancelFrom(0) && !truncated) {
      log.push(['–', '–', 'source', 'still pulling…']);
      var firstSorted = -1, firstShort = -1;
      ops.forEach(function (o, ix) { if (o.k === 'sorted' && firstSorted < 0) firstSorted = ix; if (o.k === 'limit' && firstShort < 0) firstShort = ix; });
      if (firstShort < 0 && ['findFirst', 'anyMatch', 'allMatch', 'noneMatch'].indexOf(T.name) >= 0) firstShort = ops.length;
      if (firstShort >= 0 && (firstSorted < 0 || firstSorted > firstShort)) {
        snap('The animation pauses after ' + limitPull + ' pulls to stay short. This pipeline <b>can</b> short-circuit, so real Java keeps pulling one element at a time until the stop condition is met — on an infinite stream that finishes only if a qualifying element eventually arrives (otherwise it loops forever).', 'src', 'win');
        return frames;
      }
      snap('<span class="c-r">Danger:</span> nothing short-circuits this infinite stream before a barrier/terminal that needs all elements. Real Java would run <b>forever</b> (or until OutOfMemoryError). We stopped after ' + limitPull + ' pulls. Put <code>limit</code> / <code>findFirst</code> / <code>anyMatch</code> in the right place.', 'src', 'bad');
      return frames;
    }
    srcIdx = S.infinite ? pulled.length : S.values.length;
    /* end of input: barriers flush in order */
    for (var k = 0; k < ops.length && !truncated; k++) {
      var o = ops[k];
      if (o.k !== 'sorted') continue;
      o.buf.sort(function (x, y) { return o.desc ? y - x : x - y; });
      log.push(['–', '[' + o.buf.join(', ') + ']', o.t, 'end of input → sort & release']);
      snap('Upstream is finished, so <code>' + esc(o.java) + '</code> finally sorts its buffer → [' + o.buf.join(', ') + '] and releases elements downstream one by one (checking for a stop request before each).', k, 'win');
      for (var q = 0; q < o.buf.length && !truncated; q++) {
        if (cancelFrom(k + 1)) { log.push(['–', '–', o.t, 'downstream full → stop releasing']); snap('Downstream asked to stop, so the rest of the sorted buffer is never released.', k, 'sel'); break; }
        push(o.buf[q], k + 1);
      }
    }
    var fin;
    if (T.name === 'toList') fin = 'Result: <b>[' + result.join(', ') + ']</b>';
    else if (T.name === 'count') fin = 'count() = <b>' + tstate.count + '</b>';
    else if (T.name === 'sum') fin = 'sum() = <b>' + tstate.sum + '</b>';
    else if (T.name === 'forEach') fin = 'forEach printed ' + printed.length + ' line(s)';
    else if (T.name === 'findFirst' || T.name === 'max' || T.name === 'min') fin = T.name + '() = <b>' + (tstate.has ? 'Optional[' + tstate.val + ']' : 'Optional.empty') + '</b>';
    else fin = T.name + ' = <b>' + (tstate.has ? tstate.val : (T.name === 'anyMatch' ? false : true)) + '</b>';
    var wasCut = truncated;
    if (frames.length >= MAXF) frames.length = MAXF - 1;
    truncated = false;
    if (wasCut) fin += ' (the animation skipped some middle steps to stay short)';
    log.push(['–', '–', 'done', 'pipeline closed']);
    snap('Done. ' + fin + '. Total events: ' + log.length + '. Notice how each element went <b>down the whole pipe</b> before the next one started, unless a barrier (sorted) made it wait.', 'T', 'sel');
    return frames;
  }

  /* ======================================================================
     TOPIC 1 — Functional interfaces & lambdas
     ====================================================================== */
  topics.push({
    title: 'Functional Interfaces & Lambdas: Passing Behaviour Around',
    analogy: `<p>Think of a <b>job posting</b> that says: "Wanted: someone who can do <i>exactly one thing</i> — take a number and give back a number." That posting is a <b>functional interface</b>. A <b>lambda</b> is the sticky note you hand over that says how to do it: <i>"double it"</i>. The posting decides the <b>shape</b> of the job (what goes in, what comes out); the sticky note is the <b>actual behaviour</b>. You can swap sticky notes any time without rewriting the posting — that is why lambdas make code so flexible.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Before Java 8 you could pass <i>data</i> (numbers, strings, objects) to a method, but passing <i>behaviour</i> ("how to compare", "what to do with each item") meant writing a whole anonymous class. A <b>lambda</b> is a short way to write a tiny function and pass it around like a value.</p>
<p><b>Functional interface</b> = an interface with <b>exactly one abstract method</b> (called the SAM — Single Abstract Method). Default methods, static methods and methods copied from <code>Object</code> (like <code>equals</code>) do not count. Any lambda can be used wherever such an interface is expected; the compiler matches the lambda's inputs/outputs to that one method. The optional <code>@FunctionalInterface</code> annotation makes the compiler shout if someone adds a second abstract method.</p>
${H.table(['Interface (java.util.function)', 'Method', 'Shape', 'Everyday use'], [
  ['<code>Function&lt;T, R&gt;</code>', '<code>R apply(T t)</code>', 'T → R', 'convert: String → its length'],
  ['<code>Predicate&lt;T&gt;</code>', '<code>boolean test(T t)</code>', 'T → yes/no', 'filter: is this number even?'],
  ['<code>Consumer&lt;T&gt;</code>', '<code>void accept(T t)</code>', 'T → (nothing)', 'do something: print, save'],
  ['<code>Supplier&lt;T&gt;</code>', '<code>T get()</code>', '() → T', 'make on demand: new list, default value'],
  ['<code>BiFunction&lt;T, U, R&gt;</code>', '<code>R apply(T t, U u)</code>', '(T, U) → R', 'combine two things'],
  ['<code>UnaryOperator&lt;T&gt;</code>', '<code>T apply(T t)</code>', 'T → T', 'same type in and out: trim a String'],
  ['<code>BinaryOperator&lt;T&gt;</code>', '<code>T apply(T a, T b)</code>', '(T, T) → T', 'reduce: add two numbers'],
  ['<code>Runnable</code> / <code>Callable&lt;V&gt;</code>', '<code>run()</code> / <code>V call()</code>', '() → nothing / V', 'tasks for threads'],
  ['<code>Comparator&lt;T&gt;</code>', '<code>int compare(T a, T b)</code>', '(T, T) → int', 'sorting order']
])}
<p><b>Lambda syntax, from long to short:</b></p>
${H.table(['Form', 'Example'], [
  ['full block', '<code>(Integer a, Integer b) -&gt; { return a + b; }</code>'],
  ['types inferred', '<code>(a, b) -&gt; a + b</code>'],
  ['one parameter, no parentheses', '<code>s -&gt; s.length()</code>'],
  ['no parameters', '<code>() -&gt; new ArrayList&lt;&gt;()</code>'],
  ['Java 11: var (lets you add annotations)', '<code>(var a, var b) -&gt; a + b</code>']
])}
<p><b>🔵 Capturing variables.</b> A lambda can read local variables from the surrounding method, but only if they are <b>effectively final</b> — assigned once and never changed. The lambda gets a <i>copy</i> of the value, so Java forbids changes that would make the copy and the original disagree. Fields (<code>this.count</code>) are fine because the lambda captures <code>this</code>, not a copy of the field.</p>
<p><b>Composition</b> — building big behaviour from small pieces, like LEGO:</p>
<ul>
<li><code>f.andThen(g)</code> → first f, then g: <code>g(f(x))</code>. <code>f.compose(g)</code> → first g, then f: <code>f(g(x))</code>.</li>
<li><code>p.and(q)</code>, <code>p.or(q)</code>, <code>p.negate()</code>, <code>Predicate.not(p)</code> (Java 11).</li>
<li><code>Comparator.comparing(...).thenComparing(...).reversed()</code>.</li>
</ul>
<p><b>Primitive specialisations</b> avoid boxing <code>int</code> into <code>Integer</code>: <code>IntPredicate</code>, <code>IntUnaryOperator</code>, <code>IntBinaryOperator</code>, <code>ToIntFunction&lt;T&gt;</code>, <code>IntFunction&lt;R&gt;</code>, <code>IntSupplier</code>, plus Long/Double versions. Rule of thumb: in hot loops over numbers, use them.</p>`,
    clues: [
      '"pass a strategy / rule / callback into a method" → a functional interface parameter + lambda',
      '"make the filtering condition configurable" → <code>Predicate&lt;T&gt;</code> (combine with and/or/negate)',
      '"create the object only when needed / lazily" → <code>Supplier&lt;T&gt;</code>',
      '"variable used in lambda expression should be final or effectively final" → capture rule question',
      '"what is a SAM / can an interface with default methods be functional?" → count only abstract methods',
      '"replace this anonymous inner class" → lambda (watch the meaning of <code>this</code>)',
      '"sort by X then by Y, descending" → <code>Comparator.comparing(...).thenComparing(...).reversed()</code>'
    ],
    code: [`import java.util.function.*;

class FunctionalBasics {
    // Our own functional interface: exactly ONE abstract method.
    @FunctionalInterface
    interface PriceRule {
        double apply(double price);              // the single abstract method (SAM)

        default PriceRule then(PriceRule next) { // default methods do NOT count
            return p -> next.apply(apply(p));    // build a new rule from two rules
        }
    }

    public static void main(String[] args) {
        Function<String, Integer> length = s -> s.length();         // T -> R
        Predicate<Integer> isEven = n -> n % 2 == 0;                // T -> boolean
        Consumer<String> shout = s -> System.out.println(s.toUpperCase() + "!");
        Supplier<List<String>> fresh = () -> new ArrayList<>();     // () -> T
        BiFunction<Integer, Integer, Integer> add = (a, b) -> a + b;
        UnaryOperator<String> clean = s -> s.strip().toLowerCase();
        BinaryOperator<Integer> bigger = (a, b) -> a >= b ? a : b;

        System.out.println(length.apply("lambda"));   // 6
        System.out.println(isEven.test(7));           // false
        shout.accept("hello");                         // HELLO!
        List<String> list = fresh.get();               // a brand-new empty list each call
        list.add("x");
        System.out.println(add.apply(2, 3));          // 5
        System.out.println(clean.apply("  JaVa "));   // java
        System.out.println(bigger.apply(4, 9));       // 9

        // Composition: small pieces -> bigger behaviour
        Function<Integer, Integer> plus1 = x -> x + 1;
        Function<Integer, Integer> times2 = x -> x * 2;
        System.out.println(plus1.andThen(times2).apply(5)); // (5+1)*2 = 12
        System.out.println(plus1.compose(times2).apply(5)); // (5*2)+1 = 11

        Predicate<String> longWord = s -> s.length() > 4;
        Predicate<String> startsWithA = s -> s.startsWith("a");
        System.out.println(longWord.and(startsWithA).test("apple"));   // true
        System.out.println(longWord.negate().test("apple"));           // false

        PriceRule tenOff = p -> p * 0.9;
        PriceRule minusFive = p -> p - 5;
        System.out.println(tenOff.then(minusFive).apply(100)); // 85.0
    }
}`, `import java.util.function.*;

class CaptureRules {
    private int clicks = 0;                 // a FIELD: lambdas may change it (they capture 'this')

    void demo() {
        int base = 10;                      // effectively final: assigned once, never changed
        IntUnaryOperator addBase = x -> x + base;   // captures a COPY of base
        System.out.println(addBase.applyAsInt(5));  // 15

        // base = 20;   // would make the lambda above a compile error:
        //              // "local variables referenced from a lambda expression must be final or effectively final"

        Runnable click = () -> clicks++;    // OK: really this.clicks++
        click.run();
        click.run();
        System.out.println(clicks);         // 2

        // Need a counter in a local? Use a mutable holder (but prefer streams' count()/sum()).
        int[] box = {0};
        Runnable inc = () -> box[0]++;      // the array reference is final; its content is not
        inc.run();
        System.out.println(box[0]);         // 1
    }

    public static void main(String[] args) { new CaptureRules().demo(); }
}`],
    codeTitle: ['The core functional interfaces + composition', 'What a lambda may capture'],
    viz: [{
      title: 'andThen vs compose: watch the value flow',
      input: '3 | +1 | *2 | ^2',
      inputLabel: 'start value | function | function … (each: +N, -N, *N, /N, ^2)',
      gen: function (input) {
        var segs = clean(input).split('|').map(function (x) { return clean(x); });
        if (segs.length < 3 || segs.length > 6) throw new Error('Format: value | f1 | f2 [| f3 …] — 2 to 5 functions, e.g. 3 | +1 | *2 | ^2');
        var x0 = Number(segs[0]);
        if (!/^-?\d+$/.test(segs[0]) || Math.abs(x0) > 1000) throw new Error('Start value must be an integer between -1000 and 1000');
        var fs = segs.slice(1).map(parseMap);
        var lines = fs.map(function (f, i) { return 'Function<Integer, Integer> f' + (i + 1) + ' = ' + f.j + ';'; });
        var names = fs.map(function (_, i) { return 'f' + (i + 1); });
        lines.push('int a = f1' + names.slice(1).map(function (n) { return '.andThen(' + n + ')'; }).join('') + '.apply(' + x0 + ');');
        lines.push('int b = f1' + names.slice(1).map(function (n) { return '.compose(' + n + ')'; }).join('') + '.apply(' + x0 + ');');
        var code = lines.join('\n'), aLine = fs.length + 1, bLine = fs.length + 2, frames = [];
        function fr(narr, chl, arrHl, ptr, vals, label, extra) {
          var parts = [{ type: 'code', label: 'Code', lang: 'java', code: code, hl: chl },
            { type: 'array', label: label || 'Functions in the chain', values: names.map(function (n, i) { return n + ': ' + fs[i].t; }), hl: arrHl || {}, ptr: ptr || {} },
            { type: 'vars', label: 'Values', vals: vals }];
          (extra || []).forEach(function (p) { parts.push(p); });
          frames.push({ narr: narr, parts: parts });
        }
        var defHl = {}; for (var d = 1; d <= fs.length; d++) defHl[d] = 'ok';
        fr('Creating a lambda does <b>not</b> run it. Lines 1–' + fs.length + ' just make ' + fs.length + ' little function objects and store them in variables.', defHl, {}, {}, { x: x0 });
        var v = x0, trail = [String(x0)];
        for (var i = 0; i < fs.length; i++) {
          var nv = fs[i].f(v), hl = {};
          for (var q = 0; q < i; q++) hl[q] = 'done';
          hl[i] = 'cur';
          trail.push(String(nv));
          fr('<code>andThen</code> runs left → right. Step ' + (i + 1) + ': <b>' + names[i] + '</b>(' + v + ') = <b>' + nv + '</b>.', one(aLine, 'cur'), hl, one(i, 'now'), { input: v, output: nv, trail: trail.join(' → ') });
          v = nv;
        }
        var a = v;
        fr('So <code>a = ' + a + '</code>. Read <code>f1.andThen(f2)</code> as "do f1, <b>and then</b> f2" — the reading order equals the running order.', one(aLine, 'ok'), {}, {}, { a: a }, null, [note('andThen(g) = <code>g(f(x))</code>', 'Rule')]);
        v = x0; trail = [String(x0)];
        for (var j = fs.length - 1; j >= 0; j--) {
          var nv2 = fs[j].f(v), hl2 = {};
          for (var r = fs.length - 1; r > j; r--) hl2[r] = 'done';
          hl2[j] = 'cur';
          trail.push(String(nv2));
          fr('<code>compose</code> runs right → left: the function you pass in runs <b>first</b>. Step: <b>' + names[j] + '</b>(' + v + ') = <b>' + nv2 + '</b>.', one(bLine, 'cur'), hl2, one(j, 'now'), { input: v, output: nv2, trail: trail.join(' → ') });
          v = nv2;
        }
        fr('So <code>b = ' + v + '</code> versus <code>a = ' + a + '</code>. ' + (a === v ? 'Same here (these functions happen to commute), but in general the order matters.' : '<span class="c-y">Different!</span> Same functions, opposite order.') + ' Memory trick: <code>f.compose(g)</code> reads like maths <code>f(g(x))</code>.', one(bLine, 'ok'), {}, {}, { a: a, b: v }, null, [note('compose(g) = <code>f(g(x))</code> — g first', 'Rule')]);
        return frames;
      }
    }, {
      title: 'What a lambda captures (stack vs heap)',
      gen: function () {
        var code = 'int base = 10;\nIntUnaryOperator addBase = x -> x + base;\nint r = addBase.applyAsInt(5);\n// base = 20;   <- compile error if uncommented\nint[] box = {0};\nRunnable inc = () -> box[0]++;\ninc.run(); inc.run();\nSystem.out.println(r + " " + box[0]);';
        return codeFrames(code, [
          { l: 1, v: { base: 10 }, vl: 'Stack (local variables)', narr: '<code>base</code> is a normal local variable living on the method\'s stack frame.' },
          { l: 2, v: { base: 10, addBase: '→ lambda object #1' }, vl: 'Stack', extra: [{ type: 'map', label: 'Heap: lambda object #1', entries: [['captured base', 10], ['code', 'x -> x + base']] }], narr: 'The lambda is turned into a small object. Because it uses <code>base</code>, the object stores a <b>copy</b> of the value 10 inside itself.' },
          { l: 3, v: { base: 10, addBase: '→ #1', r: 15 }, vl: 'Stack', hv: { r: 'ok' }, extra: [{ type: 'map', label: 'Heap: lambda object #1', entries: [['captured base', 10], ['code', 'x -> x + base']] }], narr: '<code>applyAsInt(5)</code> finally runs the body: 5 + captured 10 = <b>15</b>.' },
          { l: 4, cls: 'bad', v: { base: 10, r: 15 }, vl: 'Stack', narr: 'If we changed <code>base</code>, the copy inside the lambda would silently disagree with the variable. Java prevents that confusion: captured locals must be <b>effectively final</b>.' },
          { l: 5, v: { r: 15, box: '→ int[]{0}' }, vl: 'Stack', extra: [{ type: 'array', label: 'Heap: the array', values: [0] }], narr: 'Workaround seen in old code: put the value inside an array. The <i>reference</i> <code>box</code> never changes, so capture is allowed.' },
          { l: 6, v: { r: 15, box: '→ int[]{0}', inc: '→ lambda #2' }, vl: 'Stack', extra: [{ type: 'array', label: 'Heap: the array', values: [0] }, { type: 'map', label: 'Heap: lambda #2', entries: [['captured box', '→ same array']] }], narr: 'Lambda #2 captures a copy of the <b>reference</b> — both point at the same array.' },
          { l: 7, v: { r: 15, box: '→ int[]{2}' }, vl: 'Stack', hv: { box: 'ok' }, extra: [{ type: 'array', label: 'Heap: the array', values: [2], hl: { 0: 'ok' } }], narr: 'Two runs change the array content to 2. Works — but it is <b>not thread-safe</b> and is a smell; prefer <code>count()</code>, <code>sum()</code> or an <code>AtomicInteger</code>.' },
          { l: 8, v: { r: 15, 'box[0]': 2 }, vl: 'Stack', out: '15 2', narr: 'Output: <b>15 2</b>.' }
        ]);
      }
    }],
    examples: [
      { title: 'Anonymous class → lambda (same behaviour, 80% less code)', html: `<p>Old style sorting by length needed 6 lines of ceremony. The lambda keeps only the part that matters: "compare by length".</p>`, code: `List<String> words = new ArrayList<>(List.of("kiwi", "fig", "banana"));
// Before Java 8:
Collections.sort(words, new Comparator<String>() {
    @Override
    public int compare(String a, String b) {
        return Integer.compare(a.length(), b.length());
    }
});
// Java 8+:
words.sort((a, b) -> Integer.compare(a.length(), b.length()));
// Even better (reads like English):
words.sort(Comparator.comparingInt(String::length));
System.out.println(words); // [fig, kiwi, banana]` },
      { title: 'Supplier = "make it only if needed"', html: `<p>A logging call should not build an expensive message when logging is off. Passing a <code>Supplier&lt;String&gt;</code> delays the work until someone calls <code>get()</code>. This is the same trick <code>java.util.logging.Logger.fine(Supplier)</code> and <code>Objects.requireNonNull(obj, Supplier)</code> use.</p>`, code: `class Log {
    static boolean debugOn = false;
    static void debug(Supplier<String> msg) {
        if (debugOn) System.out.println(msg.get()); // built only when needed
    }
    static String expensiveReport() {
        System.out.println("building report...");
        return "report";
    }
    public static void main(String[] args) {
        debug(() -> expensiveReport()); // prints NOTHING: the lambda is never called
        debugOn = true;
        debug(() -> expensiveReport()); // building report... / report
    }
}` },
      { title: 'Your own functional interface for checked exceptions', html: `<p><code>Function.apply</code> cannot throw checked exceptions, so <code>path -&gt; Files.readString(path)</code> does not compile inside <code>map</code>. A tiny custom interface plus an adapter fixes it cleanly.</p>`, code: `import java.nio.file.*;

class Unchecked {
    @FunctionalInterface
    interface ThrowingFunction<T, R> {
        R apply(T t) throws Exception;          // allowed to throw
    }

    static <T, R> Function<T, R> wrap(ThrowingFunction<T, R> f) {
        return t -> {
            try {
                return f.apply(t);
            } catch (Exception e) {
                throw new RuntimeException(e);  // re-throw unchecked, keep the cause
            }
        };
    }

    public static void main(String[] args) {
        List<Path> paths = List.of(Path.of("a.txt"));
        Function<Path, String> reader = wrap(Files::readString);
        System.out.println(paths.size() + " reader ready: " + (reader != null));
    }
}` },
      { title: 'Predicate composition = readable business rules', html: `<p>Instead of one giant <code>if</code>, give each rule a name and combine them. ${H.table(['rule', 'meaning'], [['<code>adult</code>', 'age ≥ 18'], ['<code>verified</code>', 'email verified'], ['<code>adult.and(verified).or(admin)</code>', '(adult AND verified) OR admin']])} The combinators evaluate left to right and <b>short-circuit</b> just like <code>&amp;&amp;</code> and <code>||</code>.</p>`, code: `record User(String name, int age, boolean verified, boolean admin) {}

class Rules {
    public static void main(String[] args) {
        Predicate<User> adult = u -> u.age() >= 18;
        Predicate<User> verified = User::verified;
        Predicate<User> admin = User::admin;
        Predicate<User> canPost = adult.and(verified).or(admin);

        System.out.println(canPost.test(new User("ana", 20, true, false)));  // true
        System.out.println(canPost.test(new User("bo", 15, true, false)));   // false
        System.out.println(canPost.test(new User("cy", 15, false, true)));   // true (admin)
        System.out.println(Predicate.not(admin).test(new User("dee", 30, true, false))); // true
    }
}` }
    ],
    deepDive: `<p><b>🟣 How lambdas really work (it is not an anonymous class).</b> <code>javac</code> moves the lambda body into a private synthetic method (e.g. <code>lambda$main$0</code>) and emits an <code>invokedynamic</code> instruction. The first time that line runs, the JVM calls a bootstrap method, <code>LambdaMetafactory.metafactory</code>, which spins a tiny hidden class implementing the interface and links the call site. After that the call site is fixed and fast. Consequences:</p>
<ul>
<li>No <code>Outer$1.class</code> files per lambda; less class-loading cost than anonymous classes.</li>
<li><b>Non-capturing</b> lambdas (no outside variables) are usually a single cached instance; <b>capturing</b> lambdas allocate a small object each time the expression is evaluated — although escape analysis in the JIT often removes that allocation.</li>
<li><code>this</code> inside a lambda means the <b>enclosing</b> object; inside an anonymous class it means the anonymous object itself. Lambdas also cannot shadow local variable names.</li>
<li>Lambda identity is unspecified: never rely on <code>==</code> between lambdas or on their <code>toString()</code>.</li>
</ul>
<p><b>Why effectively final?</b> Locals live on a thread's stack and die when the method returns, but the lambda may live on (stored in a field, run on another thread). So Java copies the value. Allowing writes would create two diverging copies or require shared, synchronised storage — Java chose simplicity and thread-safety.</p>
<p><b>SAM counting subtleties.</b> <code>Comparator</code> declares <code>equals(Object)</code> abstractly but it still counts as functional because public <code>Object</code> methods are excluded. Generic methods can't be lambda targets (<code>&lt;T&gt; void m(T t)</code> as the SAM) — use a method reference or a class. Overloads that both accept functional interfaces (e.g. <code>submit(Runnable)</code> vs <code>submit(Callable)</code>) are resolved by whether the body returns a value; ambiguous cases need a cast like <code>(Callable&lt;Integer&gt;) () -&gt; 42</code>.</p>
<p><b>Performance.</b> Boxing is the silent cost: <code>Function&lt;Integer,Integer&gt;</code> boxes every call; <code>IntUnaryOperator</code> does not. Megamorphic call sites (one <code>apply</code> call site seeing dozens of lambda classes) can stop inlining — the usual reason "functional" code is slower in a hot path. Serializable lambdas exist (<code>(Runnable &amp; Serializable) () -&gt; …</code>) but are fragile across compiler versions; avoid persisting them.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants convert anonymous classes to lambdas and write <code>Comparator</code> chains instantly, so the typing is free. Interviews now probe the <i>why</i>: SAM rules, capture, <code>this</code> semantics, boxing costs.</p>
<p><b>Use AI as a partner:</b> ask <code>"List every functional interface in java.util.function whose shape is (T, U) -&gt; R or T -&gt; primitive, with one example each"</code> to build a cheat-sheet, or <code>"Refactor this class to accept a Predicate strategy and write 5 JUnit tests"</code>.</p>
<p><b>Where AI goes wrong:</b> it happily mutates a captured local via an <code>int[]</code> hack or an <code>AtomicInteger</code> inside <code>forEach</code> instead of using <code>count()</code>/<code>sum()</code>; it mixes up <code>andThen</code> and <code>compose</code>; it writes <code>Function&lt;Integer,Integer&gt;</code> in hot numeric code where <code>IntUnaryOperator</code> avoids boxing; it wraps checked exceptions by swallowing them (<code>catch (Exception e) { return null; }</code>).</p>
<p><b>What you must still own:</b> choosing the right interface shape, naming behaviours so business rules stay readable, and spotting the capture/thread-safety bug in generated code during review.</p>`,
    problems: [{
      title: 'Composable Password Rules', level: 'Easy', tags: ['Predicate', 'composition', 'lambdas'], companies: ['Amazon', 'Atlassian'],
      statement: `<p>Write <code>List&lt;String&gt; valid(List&lt;String&gt; pws)</code> that keeps only passwords that are <b>at least 8 characters</b>, contain <b>a digit</b>, contain <b>an uppercase letter</b>, and do <b>not</b> contain a space. Build each rule as its own <code>Predicate&lt;String&gt;</code> and combine them — the rules must be easy to add or remove later.</p>`,
      constraints: `0 ≤ number of passwords ≤ 10<sup>4</sup>, each length ≤ 100. Keep the original order.`,
      example: `<p>Input: ${H.arr(['Secret12', 'short1A', 'NoDigitsHere', 'Has Space9A', 'OK2Gooooo'])}</p><p>Output: ${H.c('g', '[Secret12, OK2Gooooo]')} — "short1A" is 7 chars, "NoDigitsHere" has no digit, "Has Space9A" has a space.</p>`,
      brute: { why: `<p>One big method with nested <code>if</code>s works but every new rule means editing the same method, and rules can't be reused or tested separately. The "wasted work" here is <b>maintenance</b>, not CPU.</p>`, code: `List<String> valid(List<String> pws) {
    List<String> out = new ArrayList<>();
    for (String p : pws) {
        if (p.length() >= 8) {
            boolean digit = false, upper = false, space = false;
            for (char c : p.toCharArray()) {
                if (Character.isDigit(c)) digit = true;
                if (Character.isUpperCase(c)) upper = true;
                if (c == ' ') space = true;
            }
            if (digit && upper && !space) out.add(p);
        }
    }
    return out;
}` },
      mcq: { q: 'Which combination expresses "long AND hasDigit AND hasUpper AND NOT hasSpace"?', options: ['<code>longEnough.and(hasDigit).and(hasUpper).and(hasSpace.negate())</code>', '<code>longEnough.or(hasDigit).or(hasUpper).negate()</code>', '<code>hasSpace.and(longEnough).negate()</code>', '<code>longEnough.compose(hasDigit)</code>'], answer: 0, explain: '<code>and</code> chains AND-conditions; <code>negate()</code> flips one rule. Predicates have no <code>compose</code>.' },
      hints: [`<p>Hint 1: each rule is a question about one String with a yes/no answer → that is exactly <code>Predicate&lt;String&gt;</code>.</p>`, `<p>Hint 2: <code>s.chars().anyMatch(Character::isDigit)</code> checks "contains a digit" in one line. Combine rules with <code>and</code> and <code>negate</code> (or <code>Predicate.not</code>).</p>`, `<p>Hint 3: Recipe — define 4 predicates, combine into <code>strong</code>, then <code>pws.stream().filter(strong).toList()</code>. Empty input gives an empty list; order is kept because streams from a List are ordered.</p>`],
      solution: {
        approach: `<p>Name each rule as a <code>Predicate</code>, compose once, filter once. Adding a rule = one new line. Each predicate short-circuits, so the cheap length test runs first.</p>`,
        code: `class PasswordRules {
    static final Predicate<String> LONG_ENOUGH = s -> s.length() >= 8;
    static final Predicate<String> HAS_DIGIT   = s -> s.chars().anyMatch(Character::isDigit);
    static final Predicate<String> HAS_UPPER   = s -> s.chars().anyMatch(Character::isUpperCase);
    static final Predicate<String> HAS_SPACE   = s -> s.indexOf(' ') >= 0;

    // cheap check first: and() short-circuits like &&
    static final Predicate<String> STRONG =
        LONG_ENOUGH.and(HAS_DIGIT).and(HAS_UPPER).and(Predicate.not(HAS_SPACE));

    static List<String> valid(List<String> pws) {
        return pws.stream().filter(STRONG).toList();
    }

    public static void main(String[] args) {
        System.out.println(valid(List.of("Secret12", "short1A", "NoDigitsHere", "Has Space9A", "OK2Gooooo")));
        // [Secret12, OK2Gooooo]
    }
}`,
        dry: { head: ['password', 'LONG_ENOUGH', 'HAS_DIGIT', 'HAS_UPPER', 'not HAS_SPACE', 'kept?'], rows: [
          ['Secret12', 'true', 'true', 'true', 'true', '<span class="c-g">yes</span>'],
          ['short1A', 'false', '(skipped)', '(skipped)', '(skipped)', '<span class="c-r">no</span>'],
          ['NoDigitsHere', 'true', 'false', '(skipped)', '(skipped)', '<span class="c-r">no</span>'],
          ['Has Space9A', 'true', 'true', 'true', 'false', '<span class="c-r">no</span>'],
          ['OK2Gooooo', 'true', 'true', 'true', 'true', '<span class="c-g">yes</span>']
        ] },
        complexity: `<p>Time O(total characters) — each password is scanned at most a few times. Extra space O(k) for the k kept passwords. The predicates are stateless constants, so they are thread-safe and reusable.</p>`,
        followUps: ['Return, for each rejected password, the list of rules it failed (hint: a <code>Map&lt;String, Predicate&lt;String&gt;&gt;</code> of named rules)', 'Load the rule set from configuration at runtime']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Method references
     ====================================================================== */
  topics.push({
    title: 'Method References: Four Kinds of ::',
    analogy: `<p>When a friend asks for your mum's biryani recipe, you could copy it out by hand (a lambda that just calls the recipe), or you could simply say <b>"page 42 of Mum's cookbook"</b>. A method reference is that page number: <code>String::toUpperCase</code> says "use the existing method over there" instead of re-writing <code>s -&gt; s.toUpperCase()</code>. Same dish, less writing, and the name tells the reader exactly what happens.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A method reference is a shortcut for a lambda whose <b>only job is to call one existing method</b>. Java fills in the arguments for you. There are exactly <b>four kinds</b>, and interviewers love asking you to name them:</p>
${H.table(['Kind', 'Syntax', 'Example', 'Equivalent lambda'], [
  ['1. Static method', '<code>Class::staticMethod</code>', '<code>Integer::parseInt</code>', '<code>s -&gt; Integer.parseInt(s)</code>'],
  ['2. Bound instance (a specific object)', '<code>object::method</code>', '<code>System.out::println</code>', '<code>x -&gt; System.out.println(x)</code>'],
  ['3. Unbound instance (any object of a type)', '<code>Class::instanceMethod</code>', '<code>String::toUpperCase</code>', '<code>s -&gt; s.toUpperCase()</code>'],
  ['4. Constructor', '<code>Class::new</code> / <code>Type[]::new</code>', '<code>ArrayList::new</code>, <code>String[]::new</code>', '<code>() -&gt; new ArrayList&lt;&gt;()</code>, <code>n -&gt; new String[n]</code>']
])}
<p><b>🔵 The trick with kind 3 (unbound).</b> The <b>first parameter of the lambda becomes the object</b> the method is called on, and any remaining parameters become the method's arguments:</p>
${H.table(['Method reference', 'Target type', 'Means'], [
  ['<code>String::length</code>', '<code>Function&lt;String, Integer&gt;</code>', '<code>s -&gt; s.length()</code>'],
  ['<code>String::compareToIgnoreCase</code>', '<code>Comparator&lt;String&gt;</code>', '<code>(a, b) -&gt; a.compareToIgnoreCase(b)</code>'],
  ['<code>String::concat</code>', '<code>BinaryOperator&lt;String&gt;</code>', '<code>(a, b) -&gt; a.concat(b)</code>'],
  ['<code>Person::name</code> (record accessor)', '<code>Function&lt;Person, String&gt;</code>', '<code>p -&gt; p.name()</code>']
])}
<p><b>Same text, different meaning depending on the target type.</b> <code>ArrayList::new</code> can be a <code>Supplier&lt;List&lt;String&gt;&gt;</code> (calls <code>new ArrayList&lt;&gt;()</code>), a <code>Function&lt;Integer, List&lt;String&gt;&gt;</code> (calls <code>new ArrayList&lt;&gt;(capacity)</code>) or a <code>Function&lt;Collection&lt;String&gt;, List&lt;String&gt;&gt;</code> (copy constructor). The compiler picks the overload that fits the functional interface.</p>
<p><b>When to prefer which?</b></p>
<ul>
<li>Use a method reference when it reads like English: <code>map(String::trim)</code>, <code>forEach(System.out::println)</code>, <code>comparing(Person::age)</code>.</li>
<li>Use a lambda when you need extra logic, argument re-ordering or constants: <code>s -&gt; s.substring(1)</code>, <code>x -&gt; x * 2</code>.</li>
<li>Comparator building blocks love method references: <code>Comparator.comparing(Person::city).thenComparing(Person::age, Comparator.reverseOrder())</code>.</li>
</ul>`,
    clues: [
      '"name the four kinds of method references" → static, bound, unbound, constructor',
      '"<code>Integer::toString</code> does not compile as a Function" → ambiguous overload (static vs instance)',
      '"convert a stream to an array" → <code>toArray(String[]::new)</code>',
      '"collect into a TreeSet / LinkedHashMap" → <code>Collectors.toCollection(TreeSet::new)</code>, map factory <code>LinkedHashMap::new</code>',
      '"<code>obj::method</code> throws NullPointerException immediately" → bound receiver is evaluated when the reference is created',
      '"sort by field X then Y" → <code>Comparator.comparing(T::x).thenComparing(T::y)</code>'
    ],
    code: [`record Person(String name, String city, int age) {}

class MethodRefs {
    static boolean isAdult(Person p) { return p.age() >= 18; }   // a static helper

    public static void main(String[] args) {
        List<Person> people = List.of(
            new Person("Asha", "Pune", 31), new Person("Ben", "Delhi", 17),
            new Person("Chen", "Pune", 25), new Person("Dia", "Delhi", 40));

        // 1. STATIC: MethodRefs::isAdult  ==  p -> MethodRefs.isAdult(p)
        long adults = people.stream().filter(MethodRefs::isAdult).count();
        System.out.println(adults);                                   // 3

        // 2. BOUND: System.out is a specific object
        people.stream().map(Person::name).forEach(System.out::println); // Asha Ben Chen Dia (one per line)

        // 3. UNBOUND: Person::city == p -> p.city() ; String::compareTo == (a, b) -> a.compareTo(b)
        List<String> cities = people.stream().map(Person::city).distinct()
                                    .sorted(String::compareTo).toList();
        System.out.println(cities);                                   // [Delhi, Pune]

        // 4. CONSTRUCTOR: TreeSet::new == () -> new TreeSet<>() ; String[]::new == n -> new String[n]
        TreeSet<String> names = people.stream().map(Person::name)
                                      .collect(Collectors.toCollection(TreeSet::new));
        String[] arr = people.stream().map(Person::name).toArray(String[]::new);
        System.out.println(names.first() + " " + arr.length);         // Asha 4

        // Comparator chain built from method references
        List<Person> sorted = people.stream()
            .sorted(Comparator.comparing(Person::city)
                              .thenComparing(Person::age, Comparator.reverseOrder()))
            .toList();
        sorted.forEach(p -> System.out.println(p.city() + " " + p.age()));
        // Delhi 40, Delhi 17, Pune 31, Pune 25
    }
}`],
    codeTitle: ['All four kinds in one program'],
    viz: {
      title: 'Four kinds of :: applied to your words',
      input: 'kiwi Apple fig banana',
      inputLabel: 'Words (2–8, letters only)',
      gen: function (input) {
        var w = clean(input).split(/[\s,]+/).filter(function (x) { return x; });
        if (w.length < 2 || w.length > 8 || w.some(function (x) { return !/^[A-Za-z]{1,10}$/.test(x); })) throw new Error('Enter 2–8 words made of letters (max 10 letters each)');
        var code = 'String prefix = ">> ";\n' +
          'words.stream().map(String::toUpperCase).toList();          // unbound\n' +
          'words.stream().sorted(String::compareToIgnoreCase).toList(); // unbound, 2 params\n' +
          'words.stream().map(String::length).reduce(0, Integer::sum);  // static\n' +
          'words.stream().map(prefix::concat).toList();                 // bound\n' +
          'words.stream().collect(Collectors.toCollection(TreeSet::new)); // constructor\n' +
          'words.stream().toArray(String[]::new);                       // array constructor';
        var frames = [];
        function F(line, narr, tbl, kind, res) {
          var parts = [{ type: 'code', label: 'Code', lang: 'java', code: code, hl: one(line, 'cur') }, { type: 'array', label: 'words', values: w }];
          if (tbl) parts.push({ type: 'table', label: 'What Java actually calls', columns: tbl.c, rows: tbl.r, hl: tbl.h || {} });
          if (kind) parts.push(note(kind, 'Kind'));
          if (res) parts.push({ type: 'array', label: 'Result', values: res.v, hl: res.h || {} });
          frames.push({ narr: narr, parts: parts });
        }
        F(1, 'We have a list of words and one String <code>prefix</code>. Each next line uses a different kind of method reference on the same words.', null, null, null);
        var up = w.map(function (x) { return x.toUpperCase(); });
        F(2, '<code>String::toUpperCase</code> names an <b>instance</b> method but no object. So each stream element <b>becomes the object</b>: Java calls <code>word.toUpperCase()</code>.', { c: ['element (= receiver)', 'call', 'result'], r: w.map(function (x, i) { return [x, '"' + x + '".toUpperCase()', up[i]]; }) }, '<b>Unbound instance</b> — <code>s -&gt; s.toUpperCase()</code>', { v: up });
        var srt = w.slice().sort(function (a, b) { var A = a.toLowerCase(), B = b.toLowerCase(); return A < B ? -1 : A > B ? 1 : 0; });
        F(3, '<code>String::compareToIgnoreCase</code> used as a <code>Comparator</code> takes <b>two</b> parameters: the first becomes the receiver, the second the argument → <code>a.compareToIgnoreCase(b)</code>.', { c: ['a', 'b', 'a.compareToIgnoreCase(b) sign'], r: [[w[0], w[1], (function () { var A = w[0].toLowerCase(), B = w[1].toLowerCase(); return A < B ? 'negative → a first' : A > B ? 'positive → b first' : '0 → equal'; })()]] }, '<b>Unbound instance, 2 parameters</b> — <code>(a, b) -&gt; a.compareToIgnoreCase(b)</code>', { v: srt });
        var lens = w.map(function (x) { return x.length; }), acc = 0, rows = [];
        lens.forEach(function (l) { rows.push([String(acc), String(l), 'Integer.sum(' + acc + ', ' + l + ')', String(acc + l)]); acc += l; });
        F(4, '<code>String::length</code> is unbound again (word → its length). Then <code>Integer::sum</code> is a <b>static</b> method: <code>(a, b) -&gt; Integer.sum(a, b)</code>, used by reduce to add lengths.', { c: ['acc', 'next', 'call', 'new acc'], r: rows, h: one(rows.length - 1, 'ok') }, '<b>Static</b> — <code>Class::staticMethod</code>', { v: [acc], h: { 0: 'sel' } });
        var pre = w.map(function (x) { return '>> ' + x; });
        F(5, '<code>prefix::concat</code> is <b>bound</b>: the receiver is the one specific object <code>prefix</code>, captured when the reference is created. Each element becomes the <b>argument</b>: <code>prefix.concat(word)</code>.', { c: ['receiver (fixed)', 'argument', 'result'], r: w.map(function (x, i) { return ['">> "', x, pre[i]]; }) }, '<b>Bound instance</b> — <code>x -&gt; prefix.concat(x)</code>', { v: pre });
        var ts = w.slice().filter(function (x, i, a) { return a.indexOf(x) === i; }).sort();
        F(6, '<code>TreeSet::new</code> is a <b>constructor</b> reference used as a <code>Supplier</code>: the collector calls it once to make the empty container. TreeSet sorts by natural order (uppercase letters come before lowercase in Unicode!).', { c: ['step', 'what happens'], r: [['1', 'new TreeSet<>() via TreeSet::new'], ['2', 'add each word (sorted, no duplicates)']] }, '<b>Constructor</b> — <code>() -&gt; new TreeSet&lt;&gt;()</code>', { v: ts });
        F(7, '<code>String[]::new</code> is an <b>array constructor</b> reference, an <code>IntFunction&lt;String[]&gt;</code>: toArray passes the size → <code>new String[' + w.length + ']</code>, so you get a real <code>String[]</code> instead of <code>Object[]</code>.', { c: ['size passed in', 'call', 'array type'], r: [[String(w.length), 'new String[' + w.length + ']', 'String[]']] }, '<b>Array constructor</b> — <code>n -&gt; new String[n]</code>', { v: w.slice() });
        F(1, 'Summary: <b>static</b> (Integer::sum), <b>bound</b> (prefix::concat), <b>unbound</b> (String::toUpperCase), <b>constructor</b> (TreeSet::new, String[]::new). The target functional interface decides how the parameters are wired.', { c: ['kind', 'example', 'lambda'], r: [['static', 'Integer::sum', '(a,b) -> Integer.sum(a,b)'], ['bound', 'prefix::concat', 'x -> prefix.concat(x)'], ['unbound', 'String::toUpperCase', 's -> s.toUpperCase()'], ['constructor', 'TreeSet::new', '() -> new TreeSet<>()']] }, null, null);
        return frames;
      }
    },
    examples: [
      { title: 'Bound receiver is evaluated EARLY (predict the output)', html: `<p>A bound method reference evaluates its receiver <b>when the reference is created</b>; a lambda evaluates it <b>when it runs</b>. With <code>null</code> this shows up as an exception at different moments.</p>${H.table(['line', 'lambda version', 'method-ref version'], [['create', 'fine (nothing evaluated)', '<span class="c-r">NullPointerException right here</span>'], ['call', 'NPE when run', 'never reached']])}`, code: `class EarlyBinding {
    public static void main(String[] args) {
        String s = null;
        Supplier<Integer> lazy = () -> s.length();     // OK to create
        System.out.println("lambda created");
        try {
            Supplier<Integer> eager = s::length;        // NPE NOW: receiver s is checked immediately
            System.out.println("never printed");
        } catch (NullPointerException e) {
            System.out.println("method ref failed at creation");
        }
        // Output:
        // lambda created
        // method ref failed at creation
    }
}` },
      { title: 'The Integer::toString ambiguity', html: `<p><code>Function&lt;Integer, String&gt; f = Integer::toString;</code> does <b>not compile</b>: it could mean the static <code>Integer.toString(int)</code> <i>or</i> the instance <code>i.toString()</code> — both fit. Fix it with a lambda or an unambiguous reference.</p>`, code: `// Function<Integer, String> f = Integer::toString;  // error: reference to toString is ambiguous
Function<Integer, String> f1 = String::valueOf;          // OK: static String.valueOf(Object) — unambiguous here
Function<Integer, String> f2 = i -> Integer.toString(i); // OK: lambda says exactly what we mean
Function<Integer, String> f3 = Object::toString;         // OK: unbound instance method
System.out.println(f1.apply(7) + f2.apply(8) + f3.apply(9)); // 789` },
      { title: 'Constructor references choose an overload by shape', html: `<p>Same text <code>StringBuilder::new</code>, three different constructors chosen by the target type:</p>${H.table(['Target', 'Constructor chosen'], [['<code>Supplier&lt;StringBuilder&gt;</code>', '<code>new StringBuilder()</code>'], ['<code>Function&lt;String, StringBuilder&gt;</code>', '<code>new StringBuilder(String)</code>'], ['<code>IntFunction&lt;StringBuilder&gt;</code>', '<code>new StringBuilder(int capacity)</code>']])}`, code: `Supplier<StringBuilder> empty = StringBuilder::new;
Function<String, StringBuilder> fromText = StringBuilder::new;
IntFunction<StringBuilder> withCapacity = StringBuilder::new;
System.out.println("[" + empty.get() + "]");               // []
System.out.println(fromText.apply("abc").reverse());       // cba
System.out.println(withCapacity.apply(64).capacity());     // 64` },
      { title: 'this:: and super:: references', html: `<p>Inside an instance method you can point at your own methods with <code>this::helper</code> (bound to the current object) or the parent's version with <code>super::method</code>. Handy for event handlers and template methods.</p>`, code: `class Greeter {
    String greet(String n) { return "Hello " + n; }
}

class LoudGreeter extends Greeter {
    @Override String greet(String n) { return super.greet(n).toUpperCase(); }

    List<String> both(List<String> names) {
        List<String> out = new ArrayList<>();
        names.stream().map(this::greet).forEach(out::add);   // overridden version
        names.stream().map(super::greet).forEach(out::add);  // parent version
        return out;
    }

    public static void main(String[] args) {
        System.out.println(new LoudGreeter().both(List.of("ana"))); // [HELLO ANA, Hello ana]
    }
}` }
    ],
    deepDive: `<p><b>🟣 Under the hood.</b> Method references compile to the same <code>invokedynamic</code> + <code>LambdaMetafactory</code> machinery as lambdas, but usually <b>without</b> a synthetic <code>lambda$</code> method: the factory links straight to the target method handle (<code>REF_invokeStatic</code>, <code>REF_invokeVirtual</code>, <code>REF_newInvokeSpecial</code>…). Bound references compile to code that evaluates the receiver, calls <code>Objects.requireNonNull</code> on it (hence the early NPE) and passes it as a captured argument.</p>
<p><b>Overload resolution.</b> The compiler searches for methods matching the functional descriptor in two ways at once for <code>Type::name</code>: as a static method taking all parameters, and as an instance method whose receiver is the first parameter. If both searches find a match → "ambiguous" error (<code>Integer::toString</code>, <code>Integer::compare</code> is fine as static only). For inexact method references (overloaded names), inference may also fail inside generic calls such as <code>Collectors.toMap(Person::name, Person::age, Integer::sum)</code> — usually fixed by explicit type witnesses or a lambda.</p>
<p><b>Varargs and boxing</b> are allowed in method-reference adaptation: <code>Function&lt;Integer, String&gt; f = String::valueOf</code> picks <code>valueOf(Object)</code>; <code>BiFunction&lt;String, Object[], String&gt; fmt = String::format</code> adapts to varargs.</p>
<p><b>Readability rule used by many teams:</b> method reference if it is a single existing method with matching argument order; otherwise a lambda. Avoid <code>this::</code> chains three levels deep and "clever" references like <code>String::concat</code> as a reducer, which hide quadratic string copying. Record accessors (<code>Person::name</code>) made method references the default style for projections in modern Java.</p>
<p><b>Serialization &amp; identity:</b> as with lambdas, two evaluations of <code>System.out::println</code> may or may not be the same object — never compare them with <code>==</code> or use them as map keys for "listener removal"; keep the reference in a variable instead (classic listener-leak bug).</p>`,
    aiEra: `<p><b>What AI changes:</b> IDEs and assistants auto-suggest "replace lambda with method reference" everywhere, so the skill that matters is knowing when the suggestion <i>changes behaviour</i> — e.g. a bound reference on a nullable or reassigned variable now fails or binds early.</p>
<p><b>Use AI as a partner:</b> ask <code>"For each lambda in this file, say whether converting it to a method reference changes evaluation time or overload choice"</code>. Or paste a compile error like "reference to toString is ambiguous" and ask for the two candidate methods.</p>
<p><b>Where AI goes wrong:</b> suggests <code>Integer::toString</code> for <code>Function&lt;Integer,String&gt;</code> (ambiguous), uses <code>listeners.remove(this::onEvent)</code> (removes nothing — new object each time), or replaces <code>() -&gt; config.get()</code> with <code>config::get</code> where <code>config</code> is reassigned later.</p>
<p><b>What you must still own:</b> the four kinds, the "first parameter becomes the receiver" rule, early receiver evaluation, and picking the clearer style in code review.</p>`,
    problems: [{
      title: 'Leaderboard Sort with Comparator Chains', level: 'Medium', tags: ['Comparator', 'method references', 'records'], companies: ['Google', 'Flipkart'],
      statement: `<p>Given a list of <code>Player(String name, String team, int score, int minutes)</code>, return the names in leaderboard order: <b>score descending</b>, then <b>fewer minutes</b> first (faster is better), then <b>name ascending, ignoring case</b>. Use <code>Comparator</code> building blocks with method references — no hand-written compare method.</p>`,
      constraints: `1 ≤ players ≤ 10<sup>5</sup>; scores and minutes fit in int; names non-null.`,
      example: `<p>Players: (zoe, 90, 30), (Amir, 90, 25), (bob, 95, 50), (ann, 90, 25)</p><p>Output: ${H.c('g', '[bob, Amir, ann, zoe]')} — bob has the top score; among the 90s, Amir and ann tie on 25 minutes, so case-insensitive name order decides: "amir" vs "ann" → second letters m &lt; n → <b>Amir</b> first. zoe took 30 minutes so she is last of the 90s.</p>`,
      brute: { why: `<p>A hand-written comparator with nested ifs works but is easy to get wrong (subtracting ints overflows, wrong sign for descending, forgetting a tie-breaker). It is the same O(N log N) — the waste is bug risk.</p>`, code: `record Player(String name, String team, int score, int minutes) {}

class BruteBoard {
    static List<String> order(List<Player> ps) {
        List<Player> copy = new ArrayList<>(ps);
        copy.sort(new Comparator<Player>() {
            public int compare(Player a, Player b) {
                if (a.score() != b.score()) return b.score() - a.score();       // risky: can overflow
                if (a.minutes() != b.minutes()) return a.minutes() - b.minutes();
                return a.name().compareToIgnoreCase(b.name());
            }
        });
        List<String> out = new ArrayList<>();
        for (Player p : copy) out.add(p.name());
        return out;
    }
}` },
      mcq: { q: 'Which piece sorts score in DESCENDING order without affecting the other keys?', options: ['<code>comparingInt(Player::score).reversed()</code> placed first, then <code>.thenComparingInt(...)</code>', '<code>comparingInt(Player::score).thenComparingInt(Player::minutes).reversed()</code>', '<code>comparing(Player::score, Comparator.naturalOrder())</code>', '<code>Collections.reverse</code> after sorting by score'], answer: 0, explain: '<code>reversed()</code> reverses <b>everything built so far</b>. Calling it at the very end would also reverse minutes and names. Reverse right after the first key (or use <code>comparing(Player::score, Comparator.reverseOrder())</code>).' },
      hints: [`<p>Hint 1: a multi-key sort is a <b>chain</b>: first key, then tie-breakers. <code>Comparator.comparing...().thenComparing...()</code> builds exactly that.</p>`, `<p>Hint 2: use <code>comparingInt</code> for int keys (no boxing), and <code>thenComparing(Player::name, String.CASE_INSENSITIVE_ORDER)</code> for the name.</p>`, `<p>Hint 3: careful where <code>reversed()</code> goes — it flips the whole comparator built so far. Recipe: <code>comparingInt(Player::score).reversed().thenComparingInt(Player::minutes).thenComparing(Player::name, String.CASE_INSENSITIVE_ORDER)</code>, then <code>sorted(...).map(Player::name).toList()</code>.</p>`],
      solution: {
        approach: `<p>Build the comparator once as a constant from method references; every key is visible on its own line. <code>sorted</code> is stable, and the full tie-breaker chain makes the order deterministic.</p>`,
        code: `record Player(String name, String team, int score, int minutes) {}

class Leaderboard {
    static final Comparator<Player> ORDER =
        Comparator.comparingInt(Player::score).reversed()        // 1) score high -> low
                  .thenComparingInt(Player::minutes)            // 2) fewer minutes first
                  .thenComparing(Player::name, String.CASE_INSENSITIVE_ORDER); // 3) name a -> z

    static List<String> order(List<Player> ps) {
        return ps.stream().sorted(ORDER).map(Player::name).toList();
    }

    public static void main(String[] args) {
        System.out.println(order(List.of(
            new Player("zoe", "red", 90, 30), new Player("Amir", "blue", 90, 25),
            new Player("bob", "red", 95, 50), new Player("ann", "blue", 90, 25))));
        // [bob, Amir, ann, zoe]
    }
}`,
        dry: { head: ['compare', 'score key', 'minutes key', 'name key', 'winner'], rows: [
          ['bob vs zoe', '95 &gt; 90 → bob first', '–', '–', 'bob'],
          ['Amir vs zoe', 'tie 90', '25 &lt; 30 → Amir first', '–', 'Amir'],
          ['ann vs Amir', 'tie 90', 'tie 25', 'ignore case: "amir" vs "ann" → m &lt; n', 'Amir'],
          ['ann vs zoe', 'tie 90', '25 &lt; 30 → ann first', '–', 'ann'],
          ['final', '–', '–', '–', '<span class="c-g">[bob, Amir, ann, zoe]</span>']
        ] },
        complexity: `<p>O(N log N) comparisons, each O(1) for ints plus O(L) for names. No extra objects per comparison because <code>comparingInt</code> avoids boxing.</p>`,
        followUps: ['Add "nulls last" for a nullable team field (<code>Comparator.nullsLast</code>)', 'Return the top 10 only for 10<sup>7</sup> players (use a bounded heap instead of a full sort)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Stream pipeline basics + reduce
     ====================================================================== */
  topics.push({
    title: 'Stream Pipelines: Source → Intermediate Ops → Terminal Op (map, filter, reduce)',
    analogy: `<p>A stream is a <b>factory conveyor belt</b>. Raw items come from a <b>source</b> (a warehouse = your List). Along the belt stand <b>stations</b>: one throws away broken items (<code>filter</code>), one paints each item (<code>map</code>), one puts them in order (<code>sorted</code>). At the end, a <b>packing station</b> (the terminal operation) boxes the result. Two key facts: the belt does <b>not move</b> until the packing station presses START, and a belt run is <b>one-time</b> — once the box is packed, you set up a new belt for the next run.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A <code>Stream&lt;T&gt;</code> is <b>not a collection</b>. It stores nothing; it is a <b>recipe</b> for processing elements from a source. You describe <i>what</i> you want ("keep the even ones, square them, add them up") and Java handles <i>how</i> (the loop).</p>
${H.table(['Part', 'Examples', 'Returns'], [
  ['<b>Source</b> — where elements come from', '<code>list.stream()</code>, <code>Arrays.stream(arr)</code>, <code>Stream.of(a, b)</code>, <code>IntStream.range(0, n)</code>, <code>Stream.iterate(1, x -&gt; x * 2)</code>, <code>Stream.generate(Math::random)</code>, <code>"abc".chars()</code>, <code>Files.lines(path)</code>', 'a Stream'],
  ['<b>Intermediate</b> ops (0 or more) — lazy', '<code>filter</code>, <code>map</code>, <code>mapToInt</code>, <code>flatMap</code>, <code>distinct</code>, <code>sorted</code>, <code>peek</code>, <code>limit</code>, <code>skip</code>, <code>takeWhile</code>, <code>dropWhile</code>', 'a new Stream'],
  ['<b>Terminal</b> op (exactly 1) — triggers the work', '<code>toList()</code>, <code>collect(...)</code>, <code>forEach</code>, <code>reduce</code>, <code>count</code>, <code>min</code>/<code>max</code>, <code>anyMatch</code>/<code>allMatch</code>/<code>noneMatch</code>, <code>findFirst</code>/<code>findAny</code>, <code>toArray</code>', 'a result (or void)']
])}
<p><b>Loop vs stream — same job:</b></p>
${H.table(['Old school (imperative)', 'New school (declarative)'], [['<code>int sum = 0;<br>for (int x : nums)<br>&nbsp;&nbsp;if (x % 2 == 0) sum += x * x;</code>', '<code>int sum = nums.stream()<br>&nbsp;&nbsp;.filter(x -&gt; x % 2 == 0)<br>&nbsp;&nbsp;.mapToInt(x -&gt; x * x)<br>&nbsp;&nbsp;.sum();</code>']])}
<p><b>Three golden rules:</b></p>
<ol>
<li><b>Nothing happens without a terminal operation.</b> <code>list.stream().map(...)</code> on its own does no work.</li>
<li><b>A stream can be used only once.</b> Calling a second terminal operation throws <code>IllegalStateException: stream has already been operated upon or closed</code>. Keep a <code>Supplier&lt;Stream&lt;T&gt;&gt;</code> or call <code>list.stream()</code> again.</li>
<li><b>Streams don't change the source.</b> <code>map</code> makes new values; your List stays the same. And you must not modify the source <i>while</i> streaming it (non-interference).</li>
</ol>
<p><b>🔵 map vs filter in one line each:</b> <code>filter</code> keeps or drops (same type, maybe fewer elements). <code>map</code> transforms each element 1-to-1 (same count, maybe different type). <code>mapToInt/mapToLong/mapToDouble</code> switch to primitive streams with <code>sum()</code>, <code>average()</code>, <code>max()</code>.</p>
<p><b>reduce = fold everything into one value.</b> Three forms:</p>
${H.table(['Form', 'Meaning', 'Empty stream gives'], [
  ['<code>reduce(identity, accumulator)</code>', '<code>reduce(0, Integer::sum)</code>: start at 0, add each element', 'the identity (0)'],
  ['<code>reduce(accumulator)</code>', '<code>reduce(Integer::max)</code>: no start value', '<code>Optional.empty()</code>'],
  ['<code>reduce(identity, accumulator, combiner)</code>', 'when the result type differs (e.g. total length of strings); combiner joins partial results in parallel', 'the identity']
])}
<p>The identity must be a true "do nothing" value (0 for +, 1 for ×, "" for concat) and the operation must be <b>associative</b> — <code>(a⊕b)⊕c == a⊕(b⊕c)</code> — or parallel streams give wrong answers (see the parallel topic).</p>
<p><b>Java 16+ <code>Stream.toList()</code></b> returns an <b>unmodifiable</b> list; <code>collect(Collectors.toList())</code> currently returns a mutable <code>ArrayList</code> but makes no promise. Use <code>toList()</code> by default, <code>Collectors.toCollection(ArrayList::new)</code> when you must mutate.</p>`,
    clues: [
      '"transform every element" → <code>map</code>; "keep only those that…" → <code>filter</code>',
      '"combine all elements into one value (sum / product / max / concatenation)" → <code>reduce</code> or a specialised terminal (<code>sum</code>, <code>max</code>, <code>joining</code>)',
      '"stream has already been operated upon or closed" → a stream was reused',
      '"UnsupportedOperationException after collecting" → <code>Stream.toList()</code> is unmodifiable',
      '"declarative, no explicit loop, readable data processing" → stream pipeline',
      '"N ≤ 10<sup>6</sup> numbers, sum of squares of evens" → <code>IntStream</code> to avoid boxing'
    ],
    code: [`class PipelineBasics {
    public static void main(String[] args) {
        List<Integer> nums = List.of(5, 3, 8, 1, 9, 2, 8);

        // SOURCE -> INTERMEDIATE (lazy) -> TERMINAL (runs everything)
        List<Integer> result = nums.stream()          // source
            .filter(n -> n > 2)                       // keep 5 3 8 9 8
            .distinct()                               // drop the second 8
            .map(n -> n * 10)                         // 50 30 80 90
            .sorted()                                 // 30 50 80 90
            .toList();                                // terminal: unmodifiable List
        System.out.println(result);                   // [30, 50, 80, 90]
        System.out.println(nums);                     // source unchanged: [5, 3, 8, 1, 9, 2, 8]

        // Primitive stream: no boxing, handy terminals
        int sumSqEven = nums.stream().filter(n -> n % 2 == 0).mapToInt(n -> n * n).sum();
        System.out.println(sumSqEven);                // 64 + 4 + 64 = 132
        System.out.println(IntStream.rangeClosed(1, 5).average().getAsDouble()); // 3.0

        // Three forms of reduce
        int total = nums.stream().reduce(0, Integer::sum);                  // 36
        Optional<Integer> max = nums.stream().reduce(Integer::max);         // Optional[9]
        int letters = Stream.of("ab", "cde").reduce(0,
                (acc, s) -> acc + s.length(),                                // accumulator: (Integer, String) -> Integer
                Integer::sum);                                               // combiner: joins partial sums
        System.out.println(total + " " + max.orElse(-1) + " " + letters);    // 36 9 5

        // A stream is single-use
        Stream<Integer> once = nums.stream();
        System.out.println(once.count());             // 7
        try {
            once.count();                             // second terminal op on the same stream
        } catch (IllegalStateException e) {
            System.out.println("IllegalStateException: " + e.getMessage());
        }
    }
}`, `class MoreSources {
    public static void main(String[] args) {
        int[] arr = {4, 1, 7};
        System.out.println(Arrays.stream(arr).max().getAsInt());              // 7
        System.out.println(Stream.of("x", "y", "z").count());                 // 3
        System.out.println(Stream.iterate(1, x -> x <= 100, x -> x * 3).toList()); // [1, 3, 9, 27, 81]  (Java 9 bounded iterate)
        System.out.println(Stream.generate(() -> "hi").limit(2).toList());   // [hi, hi]
        System.out.println("banana".chars().filter(c -> c == 'a').count());   // 3
        System.out.println(Stream.of(1, 2, 3, 4, 1).takeWhile(x -> x < 3).toList()); // [1, 2]
        System.out.println(Stream.of(1, 2, 3, 4, 1).dropWhile(x -> x < 3).toList()); // [3, 4, 1]
        Map<String, Integer> stock = Map.of("apple", 3);
        System.out.println(stock.entrySet().stream().map(e -> e.getKey() + "=" + e.getValue()).toList()); // [apple=3]
    }
}`],
    codeTitle: ['Source → ops → terminal, plus reduce', 'Many ways to create a stream'],
    viz: [{
      title: 'Pipeline simulator: follow each element through the stages',
      input: '5 3 8 1 9 2 8 | filter >2 | distinct | map *10 | toList',
      inputLabel: 'SOURCE | ops | terminal  (ops: filter even/odd/>N/<N, map *N/+N/^2, peek, limit N, skip N, distinct, sorted [desc]; terminals: toList count sum findFirst forEach max min anyMatch/allMatch/noneMatch COND)',
      gen: simulateStream
    }, {
      title: 'reduce step by step: the accumulator folds the stream',
      input: '4 7 1 9 3 | sum',
      inputLabel: 'numbers | sum / product / max / min / concat',
      gen: function (input) {
        var segs = clean(input).split('|');
        if (segs.length !== 2) throw new Error('Format: numbers | sum (or product, max, min, concat)');
        var a = clean(segs[0]) ? intsOf(segs[0], 1, 10, -99, 99, 'Up to 10 integers between -99 and 99 (leave empty for an empty stream)') : [];
        var op = clean(segs[1]);
        var OPS = {
          sum: { id: 0, f: function (x, y) { return x + y; }, java: 'nums.stream().reduce(0, Integer::sum)', call: function (x, y) { return 'Integer.sum(' + x + ', ' + y + ')'; } },
          product: { id: 1, f: function (x, y) { return x * y; }, java: 'nums.stream().reduce(1, (a, b) -> a * b)', call: function (x, y) { return x + ' * ' + y; } },
          max: { id: null, f: function (x, y) { return Math.max(x, y); }, java: 'nums.stream().reduce(Integer::max)', call: function (x, y) { return 'Integer.max(' + x + ', ' + y + ')'; } },
          min: { id: null, f: function (x, y) { return Math.min(x, y); }, java: 'nums.stream().reduce(Integer::min)', call: function (x, y) { return 'Integer.min(' + x + ', ' + y + ')'; } },
          concat: { id: '""', f: function (x, y) { return (x === '""' ? '' : x) + String(y); }, java: 'nums.stream().map(String::valueOf).reduce("", String::concat)', call: function (x, y) { return '"' + (x === '""' ? '' : x) + '".concat("' + y + '")'; } }
        };
        var O = OPS[op];
        if (!O) throw new Error('Operation must be one of: sum, product, max, min, concat');
        var code = 'List<Integer> nums = List.of(' + a.join(', ') + ');\nvar result = ' + O.java + ';\nSystem.out.println(result);';
        var frames = [], rows = [];
        function F(narr, cur, acc, cls) {
          var hl = {};
          for (var i = 0; i < a.length; i++) hl[i] = i < cur ? 'done' : (i === cur ? 'cur' : '');
          frames.push({ narr: narr, parts: [
            { type: 'code', label: 'Code', lang: 'java', code: code, hl: one(2, cls || 'cur') },
            a.length ? { type: 'bars', label: 'Stream elements', values: a, hl: hl } : note('(empty stream)', 'Stream elements'),
            { type: 'vars', label: 'Accumulator', vals: { acc: acc === null ? '(none yet)' : acc }, hl: { acc: cls === 'ok' ? 'ok' : 'cur' } },
            { type: 'table', label: 'Fold history', columns: ['step', 'acc', 'element', 'call', 'new acc'], rows: rows.map(function (r) { return r.slice(); }), hl: rows.length ? one(rows.length - 1, 'ok') : {} }
          ] });
        }
        var acc = O.id;
        F(O.id !== null ? 'This is the <b>identity</b> form: the accumulator starts at <b>' + O.id + '</b>, a value that changes nothing (x ' + (op === 'product' ? '× 1' : op === 'concat' ? 'joined with ""' : '+ 0') + ' = x).' : 'This is the <b>no-identity</b> form: the first element itself becomes the starting accumulator, and the result is an <code>Optional</code> (empty if there are no elements).', -1, acc);
        var start = 0;
        if (O.id === null && a.length) { acc = a[0]; start = 1; rows.push(['0', '–', String(a[0]), 'first element', String(acc)]); F('No identity: take the first element <b>' + a[0] + '</b> as the starting accumulator.', 0, acc); }
        for (var i = start; i < a.length; i++) {
          var nv = O.f(acc, a[i]);
          rows.push([String(rows.length), String(acc), String(a[i]), O.call(acc, a[i]), String(nv)]);
          F('Fold element <b>' + a[i] + '</b> into the accumulator: <code>' + esc(O.call(acc, a[i])) + '</code> = <b>' + nv + '</b>.', i, nv);
          acc = nv;
        }
        var res;
        if (O.id === null) res = a.length ? 'Optional[' + acc + ']' : 'Optional.empty';
        else res = op === 'concat' ? '"' + (acc === '""' ? '' : acc) + '"' : String(acc);
        F('Finished. Result printed: <b>' + esc(res) + '</b>. ' + (a.length ? '' : 'Empty stream: the identity form returns the identity; the Optional form returns <code>Optional.empty</code>. ') + (op === 'concat' ? '<span class="c-y">Note:</span> reducing strings with concat copies the growing string every step (O(n²)) — use <code>Collectors.joining()</code> instead.' : 'Because ' + op + ' is <b>associative</b>, Java may also split the work across threads and combine partial results — same answer.'), a.length, acc, 'ok');
        while (frames.length < 4) F('Nothing else to fold — the result stays <b>' + esc(res) + '</b>.', a.length, acc, 'ok');
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: no terminal operation', html: `<p>What does this print?</p>${H.table(['line', 'effect'], [['<code>stream().filter(...)</code> with a print inside', 'only builds the recipe'], ['no terminal op', '<span class="c-r">prints nothing at all</span>']])}<p>Answer: only <code>done</code>. The filter lambda never runs. Many candidates expect "checking 1, checking 2, checking 3".</p>`, code: `List<Integer> nums = List.of(1, 2, 3);
nums.stream().filter(n -> {
    System.out.println("checking " + n);   // never runs!
    return n > 1;
});
System.out.println("done");                  // the only output` },
      { title: 'Stream.toList() is unmodifiable', html: `<p>${H.table(['Collector', 'Can you add later?', 'nulls allowed?'], [['<code>stream.toList()</code> (16+)', '<span class="c-r">No — UnsupportedOperationException</span>', 'yes'], ['<code>Collectors.toList()</code>', 'yes in practice (ArrayList), not guaranteed', 'yes'], ['<code>Collectors.toUnmodifiableList()</code> (10+)', 'no', '<span class="c-r">no — NPE</span>']])}</p>`, code: `List<String> a = Stream.of("x", "y").toList();
try {
    a.add("z");
} catch (UnsupportedOperationException e) {
    System.out.println("toList() is read-only");
}
List<String> b = Stream.of("x", "y").collect(Collectors.toCollection(ArrayList::new));
b.add("z");                     // fine: we asked for an ArrayList explicitly
System.out.println(b);          // [x, y, z]` },
      { title: 'reduce with a different result type needs a combiner', html: `<p>Summing string lengths: the accumulator takes <code>(Integer, String)</code>, so Java needs a separate <code>(Integer, Integer)</code> combiner to merge partial results. Usually <code>mapToInt(String::length).sum()</code> is clearer — prefer map + specialised terminal over 3-argument reduce.</p>`, code: `List<String> words = List.of("stream", "map", "reduce");
int viaReduce = words.stream().reduce(0, (acc, w) -> acc + w.length(), Integer::sum);
int viaMap    = words.stream().mapToInt(String::length).sum();   // clearer
System.out.println(viaReduce + " " + viaMap);                       // 15 15` },
      { title: 'Don\'t modify the source while streaming', html: `<p>Adding to the list inside <code>forEach</code> on its own stream breaks the <b>non-interference</b> rule. For an <code>ArrayList</code> you get <code>ConcurrentModificationException</code>. Collect first, then modify.</p>`, code: `List<Integer> list = new ArrayList<>(List.of(1, 2, 3));
try {
    list.stream().forEach(x -> { if (x == 2) list.add(99); });
} catch (ConcurrentModificationException e) {
    System.out.println("CME: never mutate the source inside its own pipeline");
}
List<Integer> extra = list.stream().filter(x -> x == 2).map(x -> 99).toList();
list.addAll(extra);                    // safe: modify after the stream is done
System.out.println(list);              // [1, 2, 3, 99]` }
    ],
    deepDive: `<p><b>🟣 What a pipeline really is.</b> Each intermediate call creates a stage object (<code>ReferencePipeline.StatelessOp</code> / <code>StatefulOp</code>) linked to its upstream, forming a linked list. Nothing iterates yet. The terminal op walks back to the head, then wraps the stages into a chain of <b>Sinks</b> (<code>begin / accept / end / cancellationRequested</code>) and pushes elements from the source's <b>Spliterator</b> into the first Sink. That is why each element travels the whole pipe before the next one (see the lazy-evaluation topic).</p>
<p><b>Stream flags</b> describe what is known: <code>SIZED</code>, <code>ORDERED</code>, <code>DISTINCT</code>, <code>SORTED</code>, <code>SHORT_CIRCUIT</code>. Operations use and update them: <code>sorted()</code> on an already-sorted stream (e.g. from a <code>TreeSet</code>) is a no-op; <code>distinct()</code> on a <code>Set</code> source does nothing; <code>count()</code> on a SIZED stream with only size-preserving ops (map, peek, sorted) returns the size <b>without running the pipeline</b> (Java 9+) — so <code>peek</code> may never print.</p>
<p><b>Spliterator characteristics of the source matter:</b> <code>ArrayList</code> and arrays split perfectly in half; <code>LinkedList</code> and <code>Stream.iterate</code> split badly (matters for parallel). <code>HashSet</code> has no encounter order, so <code>findFirst</code> on it is effectively arbitrary.</p>
<p><b>Performance reality.</b> A stream pipeline costs a few object allocations plus virtual calls; the JIT inlines most of it for monomorphic call sites. For large data the cost is close to a loop; for tiny collections in an ultra-hot path a <code>for</code> loop is still measurably cheaper. Boxing is the real enemy: <code>Stream&lt;Integer&gt;.reduce(0, Integer::sum)</code> boxes on every step, <code>IntStream.sum()</code> does not. Always measure with JMH, not <code>System.nanoTime</code> in <code>main</code>.</p>
<p><b>Resource streams</b> (<code>Files.lines</code>, <code>Files.list</code>, <code>Files.walk</code>) hold OS file handles: use try-with-resources — <code>Stream</code> implements <code>AutoCloseable</code>, and <code>onClose</code> handlers run at close. Collection-based streams need no closing.</p>`,
    aiEra: `<p><b>What AI changes:</b> "convert this loop to streams" is a one-click refactor now. The real skills are judging whether the stream version is <i>clearer</i>, keeping it free of side effects, and reading a 10-step pipeline someone (or something) generated.</p>
<p><b>Use AI as a partner:</b> <code>"Rewrite this pipeline so every lambda is pure, and explain which steps are stateful"</code>; <code>"Give me 5 tricky predict-the-output stream snippets about laziness and single use"</code> for drills.</p>
<p><b>Where AI goes wrong:</b> it produces <code>reduce("", String::concat)</code> (quadratic), <code>collect(Collectors.toList())</code> and then mutates or relies on the type, <code>forEach(list::add)</code> into an outside list (side effect, breaks in parallel), <code>.stream().forEach</code> where <code>Iterable.forEach</code> is enough, and Stream&lt;Integer&gt; math instead of <code>IntStream</code>.</p>
<p><b>What you must still own:</b> knowing the source/intermediate/terminal model by heart, the three reduce forms and their identity/associativity rules, and the single-use + non-interference rules — the usual root causes of production bugs in AI-written stream code.</p>`,
    problems: [{
      title: 'Top 3 Distinct Scores', level: 'Easy', tags: ['filter', 'distinct', 'sorted', 'limit'], companies: ['Amazon', 'Infosys'],
      statement: `<p>Given a list of exam scores (may contain duplicates and invalid negative values), return the <b>three highest distinct valid scores</b> in descending order. If fewer than three distinct valid scores exist, return as many as there are.</p>`,
      constraints: `0 ≤ N ≤ 10<sup>6</sup>; valid scores are 0..100; negative values must be ignored.`,
      example: `<p>Input ${H.arr([88, 92, -1, 92, 75, 100, 88])}</p><p>Output ${H.c('g', '[100, 92, 88]')} — drop −1, collapse the duplicate 92 and 88, sort high → low, take 3.</p>`,
      brute: { why: `<p>Copy, remove negatives manually, sort, then walk skipping duplicates. It works but needs index juggling and is easy to get wrong with duplicates at the boundary. Same O(N log N) — just more code and more bugs.</p>`, code: `List<Integer> top3(List<Integer> scores) {
    List<Integer> copy = new ArrayList<>();
    for (int s : scores) if (s >= 0) copy.add(s);
    copy.sort(Collections.reverseOrder());
    List<Integer> out = new ArrayList<>();
    for (int s : copy) {
        if (out.isEmpty() || out.get(out.size() - 1) != s) out.add(s);
        if (out.size() == 3) break;
    }
    return out;
}` },
      mcq: { q: 'Where should <code>distinct()</code> go relative to <code>limit(3)</code>?', options: ['Before <code>limit(3)</code>, otherwise duplicates can use up the 3 slots', 'After <code>limit(3)</code> — it is cheaper', 'It does not matter', 'distinct is not needed because sorted removes duplicates'], answer: 0, explain: 'limit counts whatever reaches it. [100, 92, 92] would fill the quota with a duplicate if distinct came after.' },
      hints: [`<p>Hint 1: say the steps in English — remove invalid, remove duplicates, sort high to low, take three. Each phrase is one stream operation.</p>`, `<p>Hint 2: <code>filter(s -&gt; s &gt;= 0)</code>, <code>distinct()</code>, <code>sorted(Comparator.reverseOrder())</code>, <code>limit(3)</code>, <code>toList()</code>.</p>`, `<p>Hint 3: order matters for correctness (distinct before limit) and efficiency (filter first). Empty input → empty list automatically. For a huge N an <code>IntStream</code> with a 101-slot counting array is O(N) — mention it as a follow-up.</p>`],
      solution: {
        approach: `<p>A direct translation of the English recipe into a pipeline. <code>sorted</code> is the only barrier; <code>limit</code> then short-circuits after three elements leave the sort.</p>`,
        code: `class TopScores {
    static List<Integer> top3(List<Integer> scores) {
        return scores.stream()
                     .filter(s -> s >= 0)                    // drop invalid
                     .distinct()                             // 92, 92 -> 92
                     .sorted(Comparator.reverseOrder())      // high -> low
                     .limit(3)                               // first three
                     .toList();
    }

    public static void main(String[] args) {
        System.out.println(top3(List.of(88, 92, -1, 92, 75, 100, 88)));   // [100, 92, 88]
        System.out.println(top3(List.of(50, 50)));                         // [50]
    }
}`,
        dry: { head: ['stage', 'elements after the stage'], rows: [
          ['source', '88 92 -1 92 75 100 88'],
          ['filter s ≥ 0', '88 92 92 75 100 88'],
          ['distinct', '88 92 75 100'],
          ['sorted desc', '100 92 88 75'],
          ['limit 3', '<span class="c-g">100 92 88</span>']
        ] },
        complexity: `<p>O(N log N) for the sort (distinct uses a HashSet: O(N) expected time and O(D) space for D distinct values). Counting-array alternative: O(N + 101).</p>`,
        followUps: ['Return the k-th highest distinct score with Optional for "not enough scores"', 'Do it in O(N) using the fact that scores are in 0..100']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Lazy evaluation & short-circuiting
     ====================================================================== */
  topics.push({
    title: 'Lazy Evaluation: Vertical Processing, Short-Circuiting & Infinite Streams',
    analogy: `<p>Imagine a <b>sandwich shop with one cook</b> and a customer who says: "I want the <b>first two</b> sandwiches that have cheese." An <i>eager</i> cook would make sandwiches from <b>every</b> loaf in the shop, then check all of them for cheese, then hand over two. A <i>lazy</i> cook takes one loaf, makes it, checks it, and hands it over if it has cheese — and the moment the customer has two, <b>stops</b>. Java streams are the lazy cook. That is why they can even work with an <b>endless</b> supply of bread.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Intermediate operations are <b>lazy</b>: they wait until a terminal operation pulls results. Then elements flow <b>one at a time, top to bottom</b> through every stage ("vertical" processing), instead of each stage processing the whole list before the next starts ("horizontal").</p>
<p>Pipeline: <code>Stream.of(1, 2, 3, 4).peek(print "A") .filter(even).peek(print "B").findFirst()</code></p>
${H.table(['Expect (horizontal, wrong)', 'Real Java (vertical)'], [['A1 A2 A3 A4 B2 B4', '<b>A1 A2 B2</b> — then stop!']])}
<p>Element 1 goes through peek A, fails the filter. Element 2 passes peek A, passes the filter, passes peek B, reaches <code>findFirst</code> → done. Elements 3 and 4 are <b>never touched</b>.</p>
<p><b>Short-circuiting operations</b> can finish without seeing every element:</p>
${H.table(['Operation', 'Stops when…'], [
  ['<code>limit(n)</code>', 'n elements have passed it (intermediate)'],
  ['<code>takeWhile(p)</code> (Java 9)', 'first element fails p (intermediate, on ordered streams)'],
  ['<code>findFirst()</code> / <code>findAny()</code>', 'one element arrives'],
  ['<code>anyMatch(p)</code>', 'first match → true'],
  ['<code>allMatch(p)</code>', 'first non-match → false'],
  ['<code>noneMatch(p)</code>', 'first match → false']
])}
<p><b>Stateless vs stateful operations:</b></p>
${H.table(['Kind', 'Ops', 'Behaviour'], [
  ['Stateless', '<code>filter</code>, <code>map</code>, <code>flatMap</code>, <code>peek</code>', 'decide per element, pass it on immediately'],
  ['Stateful but streaming', '<code>distinct</code>, <code>limit</code>, <code>skip</code>, <code>takeWhile</code>, <code>dropWhile</code>', 'remember something (a set, a counter) but still pass elements on one by one'],
  ['Stateful <b>barrier</b>', '<code>sorted</code>', 'must see <b>everything</b> before emitting anything — breaks the one-at-a-time flow']
])}
<p><b>🔵 Why it matters:</b></p>
<ul>
<li><b>Infinite streams work</b> — <code>Stream.iterate(1, x -&gt; x + 1).filter(isPrime).limit(10)</code> stops after 10 primes.</li>
<li><b>Order of operations changes the work done</b>: put cheap <code>filter</code>s before expensive <code>map</code>s; <code>limit</code> before <code>sorted</code> means "sort the first n" — a different answer from "first n of the sorted list".</li>
<li><b>Side effects in lambdas are unpredictable</b>: they run only for elements that are actually pulled — sometimes not at all.</li>
<li>A <code>sorted()</code> on an infinite stream never finishes, even with <code>limit</code> after it.</li>
</ul>`,
    clues: [
      '"predict the output" + <code>peek</code> / print inside <code>filter</code> or <code>map</code> → trace element-by-element (vertical)',
      '"first N items that satisfy…" from a huge or infinite source → <code>filter</code> + <code>limit</code> / <code>findFirst</code> (short-circuit)',
      '"generate an infinite sequence (primes, Fibonacci, IDs)" → <code>Stream.iterate</code> / <code>generate</code> + a short-circuit op',
      '"why didn\'t my peek/println run?" → no terminal op, or count() skipped the pipeline, or short-circuit stopped early',
      '"why does my stream hang?" → infinite source with no reachable short-circuit, or <code>sorted()</code> on an infinite stream',
      '"process a 50 GB log file without loading it" → <code>Files.lines</code> is lazy + streaming'
    ],
    code: [`class LazyDemo {
    public static void main(String[] args) {
        // 1) Vertical processing revealed by peek
        Optional<Integer> first = Stream.of(1, 2, 3, 4)
            .peek(x -> System.out.println("A" + x))
            .filter(x -> x % 2 == 0)
            .peek(x -> System.out.println("B" + x))
            .findFirst();
        System.out.println(first.get());
        // A1
        // A2
        // B2
        // 2

        // 2) Infinite stream made finite by a short-circuit operation
        List<Integer> squaresOfEvens = Stream.iterate(1, x -> x + 1)   // 1, 2, 3, ... forever
            .filter(x -> x % 2 == 0)
            .map(x -> x * x)
            .limit(3)                                                  // stops the source after 3 results
            .toList();
        System.out.println(squaresOfEvens);   // [4, 16, 36]

        // 3) sorted() is a barrier: every element passes peek BEFORE anything leaves sorted
        Stream.of(3, 1, 2)
            .peek(x -> System.out.print("in" + x + " "))
            .sorted()
            .peek(x -> System.out.print("out" + x + " "))
            .findFirst();
        System.out.println();                 // in3 in1 in2 out1

        // 4) limit placement changes the MEANING
        System.out.println(Stream.of(5, 1, 4, 2).limit(2).sorted().toList());  // [1, 5]  sort the first two
        System.out.println(Stream.of(5, 1, 4, 2).sorted().limit(2).toList());  // [1, 2]  two smallest
    }
}`],
    codeTitle: ['Laziness you can see'],
    viz: [{
      title: 'Infinite stream + short-circuit (edit me!)',
      input: 'iterate 1 +1 | peek A | filter even | map ^2 | limit 2 | toList',
      inputLabel: 'SOURCE | ops | terminal  (try removing "limit 2" or putting "sorted" before it)',
      gen: simulateStream
    }, {
      title: 'sorted() is a barrier: all A\'s before any B',
      input: '4 2 9 1 | peek A | sorted | peek B | findFirst',
      inputLabel: 'SOURCE | ops | terminal',
      gen: simulateStream
    }, {
      title: 'Eager (horizontal) vs lazy (vertical): count the work',
      input: '3 5 6 7 8 10',
      inputLabel: 'Numbers (2–10). Pipeline: filter even → map ×10 → findFirst',
      gen: function (input) {
        var a = intsOf(input, 2, 10, -999, 999, 'Enter 2–10 integers');
        var cols = ['filter even', 'map ×10', 'findFirst'], frames = [];
        function grid(cells) { return cells.map(function (r) { return r.slice(); }); }
        var eg = a.map(function () { return ['·', '·', '·']; }), ehl = {}, step = 0, work = 0;
        function FE(narr) {
          frames.push({ narr: narr, parts: [
            { type: 'grid', label: 'EAGER: step number when each cell is processed (stage by stage)', rowHead: a.map(String), colHead: cols, rows: grid(eg), hl: JSON.parse(JSON.stringify(ehl)) },
            { type: 'vars', label: 'Work done', vals: { 'lambda calls': work }, hl: { 'lambda calls': 'cur' } }
          ] });
        }
        FE('First imagine an <b>eager</b> engine (like building a full list after each step). It runs <code>filter</code> on <b>every</b> element first…');
        var kept = [];
        a.forEach(function (v, i) { step++; work++; var ok = v % 2 === 0; eg[i][0] = step + (ok ? ' ✔' : ' ✘'); ehl[i + ',0'] = ok ? 'ok' : 'bad'; if (ok) kept.push(i); });
        FE('Eager filter done: ' + a.length + ' calls. Kept ' + kept.length + ' element(s).');
        kept.forEach(function (i) { step++; work++; eg[i][1] = step + ': ' + a[i] * 10; ehl[i + ',1'] = 'ok'; });
        FE('Then eager <code>map</code> runs on every kept element: ' + kept.length + ' more calls.');
        if (kept.length) { step++; eg[kept[0]][2] = step + ': FIRST'; ehl[kept[0] + ',2'] = 'sel'; }
        FE('Finally take the first one. Eager total = <b>' + work + '</b> lambda calls' + (kept.length ? ', answer ' + a[kept[0]] * 10 : ', answer empty') + '. Most of that work was thrown away!');
        var eagerWork = work;
        var lg = a.map(function () { return ['·', '·', '·']; }), lhl = {}; step = 0; work = 0;
        function FL(narr, done) {
          var parts = [
            { type: 'grid', label: 'LAZY (real Java): step number when each cell is processed', rowHead: a.map(String), colHead: cols, rows: grid(lg), hl: JSON.parse(JSON.stringify(lhl)) },
            { type: 'vars', label: 'Work done', vals: { 'lambda calls': work, 'eager needed': eagerWork }, hl: { 'lambda calls': done ? 'ok' : 'cur' } }
          ];
          frames.push({ narr: narr, parts: parts });
        }
        FL('Now the real <b>lazy</b> Java pipeline. Elements go down one row at a time.');
        for (var i = 0; i < a.length; i++) {
          step++; work++;
          var ok = a[i] % 2 === 0;
          lg[i][0] = step + (ok ? ' ✔' : ' ✘'); lhl[i + ',0'] = ok ? 'ok' : 'bad';
          if (!ok) { FL('Element <b>' + a[i] + '</b> fails the filter → dropped. Move to the next element.'); continue; }
          step++; work++; lg[i][1] = step + ': ' + a[i] * 10; lhl[i + ',1'] = 'ok';
          FL('Element <b>' + a[i] + '</b> passes the filter and goes <b>straight</b> to map → ' + a[i] * 10 + '.');
          step++; lg[i][2] = step + ': FIRST'; lhl[i + ',2'] = 'sel';
          FL('<code>findFirst</code> receives ' + a[i] * 10 + ' and short-circuits. Rows below are <b>never touched</b>. Lazy total = <b>' + work + '</b> lambda calls vs eager ' + eagerWork + '.', true);
          return frames;
        }
        FL('No even number at all, so lazy and eager both scan everything: ' + work + ' calls; result <code>Optional.empty</code>.', true);
        return frames;
      }
    }],
    examples: [
      { title: 'Predict: where does limit go?', html: `<p>Same operations, different order → different work and sometimes a different answer.</p>${H.table(['Pipeline on 1..∞', 'Result'], [['<code>filter(even).limit(3)</code>', '[2, 4, 6] — finishes'], ['<code>limit(3).filter(even)</code>', '[2] — only 1, 2, 3 were ever pulled'], ['<code>sorted().limit(3)</code>', '<span class="c-r">never finishes</span> (sorted waits for an end that never comes)']])}`, code: `System.out.println(Stream.iterate(1, x -> x + 1).filter(x -> x % 2 == 0).limit(3).toList()); // [2, 4, 6]
System.out.println(Stream.iterate(1, x -> x + 1).limit(3).filter(x -> x % 2 == 0).toList()); // [2]
// Stream.iterate(1, x -> x + 1).sorted().limit(3).toList();  // hangs forever / OutOfMemoryError` },
      { title: 'Predict: count() may skip your peek (Java 9+)', html: `<p>If the stream knows its size and nothing in between can change it, <code>count()</code> simply returns the size. <code>peek</code> and <code>map</code> never run. Add a <code>filter</code> and the pipeline really executes.</p>${H.table(['Code', 'Prints'], [['<code>List.of(1,2,3).stream().peek(print).count()</code>', 'nothing, then 3'], ['<code>…stream().filter(x -&gt; true).peek(print).count()</code>', '1 2 3, then 3']])}`, code: `long c1 = List.of(1, 2, 3).stream().peek(x -> System.out.println("peek " + x)).count();
System.out.println(c1);   // 3   (no "peek" lines on Java 9+)
long c2 = List.of(1, 2, 3).stream().filter(x -> true).peek(x -> System.out.println("peek " + x)).count();
System.out.println(c2);   // peek 1, peek 2, peek 3, then 3` },
      { title: 'takeWhile vs filter on ordered data', html: `<p><code>takeWhile</code> stops at the <b>first</b> failure (short-circuit) — perfect for sorted data like log lines by timestamp. <code>filter</code> keeps checking every element.</p>${H.arr([1, 3, 5, 6, 7, 9], { hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'r' } })}<p>takeWhile(odd) → [1, 3, 5] and stops at 6. filter(odd) → [1, 3, 5, 7, 9].</p>`, code: `List<Integer> sortedNums = List.of(1, 3, 5, 6, 7, 9);
System.out.println(sortedNums.stream().takeWhile(x -> x % 2 == 1).toList()); // [1, 3, 5]
System.out.println(sortedNums.stream().filter(x -> x % 2 == 1).toList());    // [1, 3, 5, 7, 9]
System.out.println(sortedNums.stream().dropWhile(x -> x % 2 == 1).toList()); // [6, 7, 9]` },
      { title: 'First 5 primes from an infinite stream', html: `<p>A classic: infinite source + a <code>filter</code> + <code>limit</code>. Laziness means we only test numbers until the fifth prime appears (11).</p>`, code: `class Primes {
    static boolean isPrime(int n) {
        if (n < 2) return false;
        return IntStream.rangeClosed(2, (int) Math.sqrt(n)).noneMatch(d -> n % d == 0);
    }
    public static void main(String[] args) {
        System.out.println(IntStream.iterate(2, n -> n + 1).filter(Primes::isPrime).limit(5)
                                    .boxed().toList());   // [2, 3, 5, 7, 11]
    }
}` }
    ],
    deepDive: `<p><b>🟣 The Sink protocol.</b> At the terminal operation, the stages are wrapped into a chain of <code>Sink</code> objects. The source spliterator calls <code>sink.begin(size)</code>, then <code>sink.accept(x)</code> for each element, then <code>sink.end()</code>. Each stage's <code>accept</code> does its work and calls the next sink's <code>accept</code> — that nesting <b>is</b> vertical processing. If the pipeline contains a short-circuiting op, the source uses <code>forEachWithCancel</code>: before every element it asks <code>sink.cancellationRequested()</code>, which <code>limit</code> answers with "my quota is 0" and <code>findFirst</code> with "I already have a value".</p>
<p><b>Barriers.</b> <code>sorted</code>'s sink buffers in <code>accept</code> and does the real work in <code>end()</code>: it sorts and then pushes downstream, checking the downstream's cancellation flag between elements. Its own <code>cancellationRequested()</code> returns false, so upstream is always fully drained. In parallel, <code>distinct</code>, <code>limit</code> and <code>skip</code> on ordered streams also become expensive barriers (they must respect encounter order across threads).</p>
<p><b>Historical gotcha — flatMap laziness:</b> until JDK 10 (JDK-8075939), <code>flatMap</code> pushed the <i>entire</i> inner stream downstream without checking cancellation, so <code>Stream.of(1).flatMap(x -&gt; Stream.iterate(0, i -&gt; i + 1)).findFirst()</code> hung forever. Modern JDKs check cancellation inside flatMap. Interviewers sometimes use this to test depth.</p>
<p><b>peek is for debugging only.</b> The spec says peek's action runs "as elements are consumed" — which may be never (count elision, short-circuit), out of order (parallel), or on a different thread. Never put business logic (saving to DB, incrementing counters) in peek or in map lambdas.</p>
<p><b>Lazy vs eager in other languages:</b> JavaScript's <code>array.filter().map()</code> is eager (builds a full array per step) — the new Iterator helpers (<code>iterator.filter().map().take()</code>) are lazy like Java streams. Python generators and Kotlin <code>Sequence</code> are lazy; Kotlin <code>List.map</code> is eager. Knowing which model you're in avoids performance surprises.</p>
<p><b>I/O streams:</b> <code>Files.lines(path)</code> reads lazily via a <code>BufferedReader</code>, so <code>lines.filter(l -&gt; l.contains("ERROR")).findFirst()</code> may read only the first few KB of a 50 GB file.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated pipelines often look right but put operations in a costly or wrong order (sorted before filter, limit in the wrong place, expensive map before a cheap filter). Spotting that is now a core review skill.</p>
<p><b>Use AI as a partner:</b> paste a pipeline and ask <code>"Show the exact order of lambda calls for input [3, 1, 2] as a table, element by element"</code> — then check it against your own trace. Ask it to generate infinite-stream puzzles for drilling.</p>
<p><b>Where AI goes wrong:</b> it often explains streams as "first filter runs on everything, then map runs on everything" (the horizontal mental model) and predicts the wrong peek output; it forgets that <code>count()</code> can skip the pipeline; it suggests <code>peek</code> for logging into production metrics.</p>
<p><b>What you must still own:</b> tracing a pipeline element by element in your head, knowing which ops short-circuit and which are barriers, and choosing operation order for both correctness and cost.</p>`,
    problems: [{
      title: 'Predict the Output: peek, filter, map, limit', level: 'Medium', tags: ['lazy evaluation', 'predict output', 'short-circuit'], companies: ['Goldman Sachs', 'Morgan Stanley', 'Oracle'],
      statement: `<p>What does this program print, line by line? Then explain how many times each lambda ran.</p><pre>List&lt;String&gt; r = Stream.of("a", "bb", "ccc", "dd", "e")
    .peek(s -&gt; System.out.println("saw " + s))
    .filter(s -&gt; s.length() &gt; 1)
    .map(s -&gt; { System.out.println("map " + s); return s.toUpperCase(); })
    .limit(2)
    .toList();
System.out.println(r);</pre>`,
      constraints: `Sequential stream, Java 17+.`,
      example: `<p>Hint at the shape: there are fewer "saw" lines than elements. ${H.arr(['a', 'bb', 'ccc', 'dd', 'e'], { hl: { 0: 'r', 1: 'g', 2: 'g', 3: 'm', 4: 'm' } })} Grey elements are never pulled.</p>`,
      brute: { why: `<p>The wrong "horizontal" mental model: run peek on all 5, then filter all 5, then map all survivors, then limit. It predicts 5 "saw" lines and 3 "map" lines — wrong, because Java pushes one element at a time and <code>limit(2)</code> cancels the source.</p>`, code: `class HorizontalModel {          // simulates the WRONG eager model with plain lists
    public static void main(String[] args) {
        List<String> src = List.of("a", "bb", "ccc", "dd", "e");
        for (String s : src) System.out.println("saw " + s);
        List<String> filtered = new ArrayList<>();
        for (String s : src) if (s.length() > 1) filtered.add(s);
        List<String> mapped = new ArrayList<>();
        for (String s : filtered) { System.out.println("map " + s); mapped.add(s.toUpperCase()); }
        System.out.println(mapped.subList(0, 2));   // same final list, very different print order
    }
}` },
      mcq: { q: 'After "BB" and "CCC" pass <code>limit(2)</code>, what happens to "dd"?', options: ['It is never pulled from the source', 'It goes through peek but not filter', 'It is mapped but discarded by limit', 'It is printed by peek only'], answer: 0, explain: 'limit(2) reaches its quota with CCC; before pulling the next element the source asks "cancellation requested?" → yes, so "dd" and "e" are never touched.' },
      hints: [`<p>Hint 1: process element by element. Follow "a" all the way down before thinking about "bb".</p>`, `<p>Hint 2: "a" is printed by peek, then dropped by the filter (length 1). "bb" goes peek → filter → map → limit (1 of 2).</p>`, `<p>Hint 3: after the 2nd element passes <code>limit(2)</code>, the source stops. Count: peek ran 3 times, filter 3 times, map 2 times.</p>`],
      solution: {
        approach: `<p>Trace vertically. Output:</p><pre>saw a
saw bb
map bb
saw ccc
map ccc
[BB, CCC]</pre><p>The final list is the same as the eager model's, but the side effects differ — exactly why lambdas in streams should be side-effect free.</p>`,
        code: `class PredictPeek {
    public static void main(String[] args) {
        List<String> r = Stream.of("a", "bb", "ccc", "dd", "e")
            .peek(s -> System.out.println("saw " + s))
            .filter(s -> s.length() > 1)
            .map(s -> { System.out.println("map " + s); return s.toUpperCase(); })
            .limit(2)
            .toList();
        System.out.println(r);
        // saw a
        // saw bb
        // map bb
        // saw ccc
        // map ccc
        // [BB, CCC]
    }
}`,
        dry: { head: ['element', 'peek', 'filter (len &gt; 1)', 'map', 'limit(2)', 'printed'], rows: [
          ['a', 'saw a', '<span class="c-r">drop</span>', '–', '–', 'saw a'],
          ['bb', 'saw bb', 'pass', 'BB', '1/2', 'saw bb, map bb'],
          ['ccc', 'saw ccc', 'pass', 'CCC', '2/2 → cancel', 'saw ccc, map ccc'],
          ['dd', '<span class="c-m">never pulled</span>', '–', '–', '–', '–'],
          ['e', '<span class="c-m">never pulled</span>', '–', '–', '–', '–']
        ] },
        complexity: `<p>Work is proportional to the elements actually pulled (3 here), not the source size — that is the whole point of laziness + short-circuiting.</p>`,
        followUps: ['What changes if you add <code>.sorted()</code> right after <code>peek</code>?', 'What changes with <code>.parallel()</code>?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Collectors: collect, toMap, joining, groupingBy, partitioningBy
     ====================================================================== */
  topics.push({
    title: 'Collectors: toList, toMap, joining, groupingBy, partitioningBy & Downstream Collectors',
    analogy: `<p>Think of the <b>post office sorting room</b>. Letters arrive on a belt (the stream). A sorter reads each letter's <b>PIN code</b> (the <i>classifier</i>) and drops it into the matching <b>bin</b> (<code>groupingBy</code>). What happens inside each bin is a second job: just <b>count</b> the letters, <b>weigh</b> them, or <b>bundle</b> them — that is the <i>downstream collector</i>. A <code>partitioningBy</code> room has exactly two bins: "domestic" and "international" (true / false).</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <code>collect(collector)</code> is the terminal operation that <b>builds a container</b> from the stream — a List, Set, Map, String, or a summary. A <code>Collector</code> is a recipe with four parts: <i>make an empty container</i>, <i>add one element</i>, <i>merge two containers</i> (for parallel), <i>finish</i>. The <code>Collectors</code> class gives you ready-made recipes:</p>
${H.table(['Goal', 'Collector', 'Result'], [
  ['list / set', '<code>toList()</code>, <code>toSet()</code>, <code>toCollection(TreeSet::new)</code>', 'List, Set, any collection'],
  ['map from keys/values', '<code>toMap(keyFn, valueFn)</code>, <code>toMap(k, v, mergeFn)</code>, <code>toMap(k, v, merge, TreeMap::new)</code>', 'Map (duplicate key → <span class="c-r">IllegalStateException</span> unless you merge)'],
  ['one string', '<code>joining(", ", "[", "]")</code>', '"[a, b, c]"'],
  ['numbers', '<code>counting()</code>, <code>summingInt</code>, <code>averagingDouble</code>, <code>summarizingInt</code>, <code>minBy</code>/<code>maxBy</code>', 'Long, Integer, Double, IntSummaryStatistics, Optional'],
  ['buckets', '<code>groupingBy(classifier)</code>, <code>groupingBy(classifier, downstream)</code>, <code>groupingBy(classifier, mapFactory, downstream)</code>', 'Map&lt;K, List&lt;T&gt;&gt; or Map&lt;K, D&gt;'],
  ['two buckets', '<code>partitioningBy(predicate[, downstream])</code>', 'Map&lt;Boolean, …&gt; — always has both keys'],
  ['adapt a downstream', '<code>mapping</code>, <code>filtering</code> (9), <code>flatMapping</code> (9), <code>collectingAndThen</code>, <code>reducing</code>', '—'],
  ['two results at once', '<code>teeing(c1, c2, merger)</code> (12)', 'anything you merge them into']
])}
<p><b>🔵 groupingBy step by step:</b> for each element, compute <code>key = classifier(element)</code>; find (or create) that key's bucket; feed the element to the bucket's downstream collector. Default downstream = <code>toList()</code>; default map = <code>HashMap</code> (no order guarantee — pass <code>TreeMap::new</code> for sorted keys).</p>
${H.table(['Question in plain words', 'Collector'], [
  ['"words grouped by first letter"', '<code>groupingBy(w -&gt; w.charAt(0))</code>'],
  ['"how many words per length?"', '<code>groupingBy(String::length, counting())</code>'],
  ['"average salary per department"', '<code>groupingBy(Emp::dept, averagingDouble(Emp::salary))</code>'],
  ['"names (not objects) per city"', '<code>groupingBy(P::city, mapping(P::name, toList()))</code>'],
  ['"highest-paid per department"', '<code>groupingBy(Emp::dept, maxBy(comparingDouble(Emp::salary)))</code> → Optional values'],
  ['"passed vs failed"', '<code>partitioningBy(s -&gt; s.score() &gt;= 40)</code>'],
  ['"min and max in one pass"', '<code>teeing(minBy(...), maxBy(...), (mn, mx) -&gt; …)</code>']
])}
<p><b>toMap traps:</b> (1) duplicate keys throw <code>IllegalStateException: Duplicate key …</code> — supply a merge function such as <code>Integer::sum</code> or <code>(a, b) -&gt; a</code>; (2) a <code>null</code> value throws <code>NullPointerException</code> (it uses <code>HashMap.merge</code>, which rejects null values).</p>`,
    clues: [
      '"group / bucket / categorize by…" → <code>groupingBy</code>',
      '"count per…", "sum per…", "average per…" → <code>groupingBy</code> + <code>counting()</code> / <code>summingInt</code> / <code>averagingX</code>',
      '"split into two lists: pass and fail / even and odd" → <code>partitioningBy</code>',
      '"word frequency", "character frequency", "top K frequent" → <code>groupingBy(identity(), counting())</code> then sort entries',
      '"Duplicate key" exception in toMap → add a merge function',
      '"comma-separated string" → <code>joining(", ")</code>',
      '"keys must be sorted / keep insertion order" → map factory <code>TreeMap::new</code> / <code>LinkedHashMap::new</code>'
    ],
    code: [`record Emp(String name, String dept, double salary, int age) {}

class CollectorsTour {
    public static void main(String[] args) {
        List<Emp> emps = List.of(
            new Emp("Asha", "Eng", 120, 31), new Emp("Ben", "Eng", 95, 25),
            new Emp("Chen", "Ops", 70, 41), new Emp("Dia", "Sales", 80, 29),
            new Emp("Eli", "Ops", 75, 35));

        // groupingBy + downstream collectors (TreeMap keeps keys sorted for printing)
        Map<String, Long> countByDept = emps.stream()
            .collect(Collectors.groupingBy(Emp::dept, TreeMap::new, Collectors.counting()));
        System.out.println(countByDept);            // {Eng=2, Ops=2, Sales=1}

        Map<String, Double> avgByDept = emps.stream()
            .collect(Collectors.groupingBy(Emp::dept, TreeMap::new, Collectors.averagingDouble(Emp::salary)));
        System.out.println(avgByDept);              // {Eng=107.5, Ops=72.5, Sales=80.0}

        Map<String, List<String>> namesByDept = emps.stream()
            .collect(Collectors.groupingBy(Emp::dept, TreeMap::new,
                     Collectors.mapping(Emp::name, Collectors.toList())));
        System.out.println(namesByDept);            // {Eng=[Asha, Ben], Ops=[Chen, Eli], Sales=[Dia]}

        // top earner per dept: maxBy gives Optional -> unwrap with collectingAndThen
        Map<String, String> topByDept = emps.stream()
            .collect(Collectors.groupingBy(Emp::dept, TreeMap::new,
                     Collectors.collectingAndThen(
                         Collectors.maxBy(Comparator.comparingDouble(Emp::salary)),
                         o -> o.map(Emp::name).orElse("-"))));
        System.out.println(topByDept);              // {Eng=Asha, Ops=Eli, Sales=Dia}

        // partitioningBy: always has both keys false and true
        Map<Boolean, List<String>> over30 = emps.stream()
            .collect(Collectors.partitioningBy(e -> e.age() > 30,
                     Collectors.mapping(Emp::name, Collectors.toList())));
        System.out.println(over30);                 // {false=[Ben, Dia], true=[Asha, Chen, Eli]}

        // toMap with a merge function for duplicate keys
        Map<String, Double> payroll = emps.stream()
            .collect(Collectors.toMap(Emp::dept, Emp::salary, Double::sum, TreeMap::new));
        System.out.println(payroll);                // {Eng=215.0, Ops=145.0, Sales=80.0}

        // joining and summarizing
        System.out.println(emps.stream().map(Emp::name).collect(Collectors.joining(", ", "[", "]"))); // [Asha, Ben, Chen, Dia, Eli]
        DoubleSummaryStatistics st = emps.stream().collect(Collectors.summarizingDouble(Emp::salary));
        System.out.println(st.getMin() + " " + st.getMax() + " " + st.getAverage()); // 70.0 120.0 88.0

        // teeing (Java 12): two collectors in one pass
        String range = emps.stream().collect(Collectors.teeing(
            Collectors.minBy(Comparator.comparingInt(Emp::age)),
            Collectors.maxBy(Comparator.comparingInt(Emp::age)),
            (young, old) -> young.get().name() + ".." + old.get().name()));
        System.out.println(range);                  // Ben..Chen
    }
}`],
    codeTitle: ['A tour of the most-used collectors'],
    viz: [{
      title: 'groupingBy: elements drop into buckets',
      input: 'apple avocado banana blueberry cherry cranberry date | by first | counting',
      inputLabel: 'words | by first / last / length / len>N | toList / counting / joining / toSet',
      gen: function (input) {
        var segs = clean(input).split('|').map(function (x) { return clean(x); });
        if (segs.length !== 3) throw new Error('Format: words | by first|last|length|len>N | toList|counting|joining|toSet');
        var w = segs[0].split(/[\s,]+/).filter(function (x) { return x; });
        if (w.length < 2 || w.length > 10 || w.some(function (x) { return !/^[A-Za-z]{1,10}$/.test(x); })) throw new Error('Enter 2–10 words (letters only, max 10 letters each)');
        var by = segs[1].replace(/^by\s+/, ''), part = by.match(/^len>(\d+)$/), keyFn, cls, ktype;
        if (by === 'first') { keyFn = function (s) { return s.charAt(0); }; cls = 'w -> w.charAt(0)'; ktype = 'Character'; }
        else if (by === 'last') { keyFn = function (s) { return s.charAt(s.length - 1); }; cls = 'w -> w.charAt(w.length() - 1)'; ktype = 'Character'; }
        else if (by === 'length') { keyFn = function (s) { return s.length; }; cls = 'String::length'; ktype = 'Integer'; }
        else if (part) { var N = Number(part[1]); keyFn = function (s) { return s.length > N; }; cls = 'w -> w.length() > ' + N; ktype = 'Boolean'; }
        else throw new Error('Key must be: by first, by last, by length, or by len>N');
        var ds = segs[2], DS = { toList: ['Collectors.toList()', 'List<String>'], counting: ['Collectors.counting()', 'Long'], joining: ['Collectors.joining("+")', 'String'], toSet: ['Collectors.toSet()', 'Set<String>'] };
        if (!DS[ds]) throw new Error('Downstream must be toList, counting, joining or toSet');
        var fn = part ? 'partitioningBy' : 'groupingBy';
        var code = 'Map<' + ktype + ', ' + DS[ds][1] + '> m = words.stream()\n    .collect(Collectors.' + fn + '(\n        ' + cls + ',            // classifier\n        ' + DS[ds][0] + '));   // downstream';
        var buckets = [], frames = [];
        if (part) buckets = [[false, []], [true, []]];
        function show(v) {
          if (ds === 'counting') return v.length;
          if (ds === 'joining') return v.join('+');
          if (ds === 'toSet') return '{' + v.filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', ') + '}';
          return '[' + v.join(', ') + ']';
        }
        function F(narr, idx, line, hk, kv) {
          var hl = {}; for (var i = 0; i < w.length; i++) hl[i] = idx === null ? 'done' : i < idx ? 'done' : i === idx ? 'cur' : '';
          var mh = {}; if (hk !== undefined) mh[String(hk)] = 'ok';
          var parts = [{ type: 'code', label: 'Code', lang: 'java', code: code, hl: line ? one(line, 'cur') : {} },
            { type: 'array', label: 'words (stream)', values: w, hl: hl },
            { type: 'map', label: (part ? 'partitioningBy' : 'groupingBy') + ' result (bucket → downstream value)', entries: buckets.map(function (b) { return [String(b[0]), show(b[1])]; }), hl: mh }];
          if (kv) parts.push({ type: 'vars', label: 'This element', vals: kv, hl: { key: 'cur' } });
          frames.push({ narr: narr, parts: parts });
        }
        F(part ? '<code>partitioningBy</code> starts with <b>both</b> buckets (false and true) already present — even if one stays empty.' : '<code>groupingBy</code> starts with an empty <code>HashMap</code>. Buckets are created on demand the first time a key appears.', -1, 2);
        w.forEach(function (s, i) {
          var k = keyFn(s), b = null;
          buckets.forEach(function (x) { if (x[0] === k) b = x; });
          F('Element <b>' + s + '</b>: the classifier <code>' + esc(cls) + '</code> gives key <b>' + k + '</b>.', i, 3, undefined, { element: s, key: String(k) });
          var fresh = !b;
          if (fresh) { b = [k, []]; buckets.push(b); }
          b[1].push(s);
          F((fresh ? 'Key <b>' + k + '</b> is new → create its bucket (<code>computeIfAbsent</code> inside). ' : 'Bucket <b>' + k + '</b> already exists. ') + 'The downstream <code>' + esc(DS[ds][0]) + '</code> receives "' + s + '" → bucket now <b>' + esc(String(show(b[1]))) + '</b>.', i, 4, k, { element: s, key: String(k) });
        });
        F('Done: ' + buckets.length + ' bucket(s). ' + (part ? 'A partition map always prints <code>{false=…, true=…}</code>.' : '<span class="c-y">HashMap order is not guaranteed</span> — pass <code>TreeMap::new</code> as the map factory if you need sorted keys.') + ' Downstream collectors decide what each bucket holds: list, count, joined string, set…', null, 0);
        return frames;
      }
    }, {
      title: 'toMap and the "Duplicate key" trap',
      input: 'ann:90 bob:70 ann:85 cy:60 bob:75 | none',
      inputLabel: 'name:score pairs | merge: none / max / sum / first / last',
      gen: function (input) {
        var segs = clean(input).split('|').map(function (x) { return clean(x); });
        if (segs.length !== 2) throw new Error('Format: name:score name:score … | none|max|sum|first|last');
        var pairs = segs[0].split(/\s+/).filter(function (x) { return x; }).map(function (p) {
          var m = p.match(/^([A-Za-z]{1,8}):(-?\d{1,4})$/); if (!m) throw new Error('Each pair looks like ann:90'); return [m[1], Number(m[2])];
        });
        if (pairs.length < 2 || pairs.length > 10) throw new Error('Use 2–10 pairs');
        var M = { none: null, max: ['Integer::max', function (a, b) { return Math.max(a, b); }], sum: ['Integer::sum', function (a, b) { return a + b; }], first: ['(a, b) -> a', function (a) { return a; }], last: ['(a, b) -> b', function (a, b) { return b; }] };
        if (!(segs[1] in M)) throw new Error('merge must be none, max, sum, first or last');
        var mg = M[segs[1]];
        var code = 'Map<String, Integer> best = scores.stream()\n    .collect(Collectors.toMap(\n        Score::name,\n        Score::points' + (mg ? ',\n        ' + mg[0] + '));     // merge function' : '));          // no merge function!');
        var map = [], frames = [];
        function F(narr, i, hk, cls, extra) {
          var hl = {}; for (var j = 0; j < pairs.length; j++) hl[j] = j < i ? 'done' : j === i ? (cls === 'bad' ? 'bad' : 'cur') : '';
          var mh = {}; if (hk) mh[hk] = cls || 'ok';
          var parts = [{ type: 'code', label: 'Code', lang: 'java', code: code, hl: one(mg ? 5 : 4, cls === 'bad' ? 'bad' : 'cur') },
            { type: 'array', label: 'stream of Score(name, points)', values: pairs.map(function (p) { return p[0] + ':' + p[1]; }), hl: hl },
            { type: 'map', label: 'HashMap being built', entries: map.map(function (e) { return e.slice(); }), hl: mh }];
          (extra || []).forEach(function (p) { parts.push(p); });
          frames.push({ narr: narr, parts: parts });
        }
        F('<code>toMap</code> puts each element as key → value. It assumes keys are <b>unique</b> unless you give a merge function. ' + (mg ? 'Here the merge function is <code>' + esc(mg[0]) + '</code>.' : '<span class="c-y">Here there is none.</span>'), -1);
        for (var i = 0; i < pairs.length; i++) {
          var k = pairs[i][0], v = pairs[i][1], e = null;
          map.forEach(function (x) { if (x[0] === k) e = x; });
          if (!e) { map.push([k, v]); F('Key <b>' + k + '</b> is new → put ' + k + '=' + v + '.', i, k, 'ok'); continue; }
          if (!mg) {
            F('Key <b>' + k + '</b> already maps to ' + e[1] + ' and no merge function was given → <span class="c-r">IllegalStateException: Duplicate key ' + k + ' (attempted merging values ' + e[1] + ' and ' + v + ')</span>. The whole collect fails.', i, k, 'bad', [note('Fix: pass a merge function, e.g. <code>Integer::max</code> (keep best), <code>Integer::sum</code> (total), <code>(a, b) -&gt; a</code> (keep first).', 'How to fix')]);
            F('Lesson: <code>toMap(k, v)</code> is only safe when keys are guaranteed unique (like IDs). For anything else, decide the merge rule explicitly — or use <code>groupingBy</code> to keep all values.', i, k, 'bad');
            return frames;
          }
          var old = e[1]; e[1] = mg[1](old, v);
          F('Key <b>' + k + '</b> exists (' + old + '). Merge: <code>' + esc(mg[0]) + '</code>(' + old + ', ' + v + ') = <b>' + e[1] + '</b>.', i, k, 'ok');
        }
        F('Done without errors: ' + map.map(function (x) { return x[0] + '=' + x[1]; }).join(', ') + '. (Printed order of a HashMap may differ.)', pairs.length, null);
        return frames;
      }
    }],
    examples: [
      { title: 'Word frequency in one line', html: `<p><code>Function.identity()</code> means "the element itself is the key". With <code>counting()</code> you get a frequency map — the building block of half of all string interview questions.</p>${H.kv([['to', 2], ['be', 2], ['or', 1], ['not', 1]], { label: 'result' })}`, code: `String text = "to be or not to be";
Map<String, Long> freq = Arrays.stream(text.split(" "))
    .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()));
System.out.println(freq);   // {to=2, be=2, or=1, not=1}  (LinkedHashMap keeps first-seen order)` },
      { title: 'toMap with null values throws NPE', html: `<p><code>Collectors.toMap</code> uses <code>HashMap.merge</code>, which refuses <code>null</code> values — even though a HashMap can normally store them. Use <code>Optional</code>-free defaults, filter out nulls, or collect manually.</p>`, code: `record Item(String id, String note) {}
class NullValues {
    public static void main(String[] args) {
        List<Item> items = List.of(new Item("a", "fragile"), new Item("b", null));
        try {
            items.stream().collect(Collectors.toMap(Item::id, Item::note));
        } catch (NullPointerException e) {
            System.out.println("NPE: toMap rejects null values");
        }
        Map<String, String> safe = items.stream()
            .collect(Collectors.toMap(Item::id, i -> Objects.requireNonNullElse(i.note(), "")));
        System.out.println(safe.get("b").isEmpty());   // true
    }
}` },
      { title: 'filtering vs filter: keep empty groups', html: `<p><code>filter</code> before grouping removes elements — and a group with no survivors disappears. <code>Collectors.filtering</code> (Java 9) filters <i>inside</i> each bucket, so every key stays.</p>${H.table(['Approach', 'Result for "high earners per dept"'], [['<code>filter(sal &gt; 100).collect(groupingBy(dept))</code>', '{Eng=[Asha]} — Ops and Sales vanished'], ['<code>groupingBy(dept, filtering(sal &gt; 100, toList()))</code>', '{Eng=[Asha], Ops=[], Sales=[]}']])}`, code: `record E(String name, String dept, int sal) {}
class Filtering {
    public static void main(String[] args) {
        List<E> es = List.of(new E("Asha", "Eng", 120), new E("Chen", "Ops", 70), new E("Dia", "Sales", 80));
        Map<String, List<String>> lost = es.stream().filter(e -> e.sal() > 100)
            .collect(Collectors.groupingBy(E::dept, TreeMap::new, Collectors.mapping(E::name, Collectors.toList())));
        System.out.println(lost);   // {Eng=[Asha]}
        Map<String, List<String>> kept = es.stream().collect(Collectors.groupingBy(E::dept, TreeMap::new,
            Collectors.filtering(e -> e.sal() > 100, Collectors.mapping(E::name, Collectors.toList()))));
        System.out.println(kept);   // {Eng=[Asha], Ops=[], Sales=[]}
    }
}` },
      { title: 'A custom Collector with Collector.of', html: `<p>When no built-in fits, write the four parts yourself. Here: collect strings into a single <code>StringBuilder</code> separated by "|" — a mutable container, so it is efficient (unlike <code>reduce</code> with string concat).</p>${H.table(['Part', 'Code'], [['supplier', '<code>StringBuilder::new</code>'], ['accumulator', 'append separator + element'], ['combiner', 'merge two builders (parallel)'], ['finisher', '<code>StringBuilder::toString</code>']])}`, code: `Collector<String, StringBuilder, String> pipeJoin = Collector.of(
    StringBuilder::new,                                                   // supplier
    (sb, s) -> { if (sb.length() > 0) sb.append('|'); sb.append(s); },    // accumulator
    (a, b) -> { if (a.length() > 0 && b.length() > 0) a.append('|'); return a.append(b); }, // combiner
    StringBuilder::toString);                                             // finisher
System.out.println(Stream.of("a", "b", "c").collect(pipeJoin));          // a|b|c` }
    ],
    deepDive: `<p><b>🟣 The Collector contract.</b> <code>Collector&lt;T, A, R&gt;</code>: <code>supplier()</code> makes a fresh mutable container <code>A</code>; <code>accumulator()</code> folds a <code>T</code> into it; <code>combiner()</code> merges two containers (used in parallel — each thread fills its own); <code>finisher()</code> turns <code>A</code> into <code>R</code>; <code>characteristics()</code> lists hints: <code>IDENTITY_FINISH</code> (skip the finisher cast), <code>UNORDERED</code> (order doesn't matter), <code>CONCURRENT</code> (one shared container can be updated from many threads). This "mutable reduction" is why <code>collect</code> beats <code>reduce</code> for building collections: <code>reduce</code> must treat values as immutable and would copy a list per element.</p>
<p><b>How groupingBy is built:</b> its accumulator does <code>map.computeIfAbsent(key, k -&gt; downstream.supplier().get())</code> then calls the downstream accumulator; in parallel each thread builds its own map and the combiner merges maps bucket by bucket (expensive). <code>groupingByConcurrent</code> shares one <code>ConcurrentHashMap</code> instead (CONCURRENT + UNORDERED), which scales better but loses encounter order inside buckets.</p>
<p><b>Ordering facts:</b> <code>toList</code> respects encounter order even in parallel; <code>toSet</code>, <code>groupingBy</code>'s HashMap and <code>toMap</code> do not order keys. A <code>null</code> classifier result throws <code>NullPointerException: element cannot be mapped to a null key</code>. <code>partitioningBy</code> returns a special two-entry map that always contains <code>false</code> and <code>true</code>.</p>
<p><b>Type inference pain:</b> deeply nested collectors (<code>groupingBy(…, collectingAndThen(maxBy(…), …))</code>) sometimes defeat inference, especially with method references on overloaded methods. Fixes: extract a typed local <code>Collector&lt;Emp, ?, Optional&lt;Emp&gt;&gt; top = …</code>, add type witnesses <code>Collectors.&lt;Emp, String&gt;groupingBy(...)</code>, or switch a method reference to an explicit lambda.</p>
<p><b>Performance:</b> <code>counting()</code> boxes a <code>Long</code> per update — fine for most code; for hot paths use <code>toMap(k, v -&gt; 1, Integer::sum)</code> or a primitive map library. <code>summarizingInt</code> gives count/sum/min/max/avg in a single pass instead of five pipelines.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write nested collectors faster than most humans, but often in a form that compiles yet reads like a puzzle. Your job shifts to <b>simplifying</b>: extracting named collectors, choosing the right map type, and checking edge cases (duplicates, nulls, empty groups).</p>
<p><b>Use AI as a partner:</b> <code>"Given record Order(String customer, String city, double amount), write collectors for: total per city sorted by city, top customer per city, and cities with no orders over 100 kept as empty lists — explain each downstream"</code>. Then ask it to write tests for duplicate keys and nulls.</p>
<p><b>Where AI goes wrong:</b> <code>toMap</code> without a merge function on non-unique keys; assuming HashMap output order in tests (flaky tests); <code>maxBy</code> leaving <code>Optional</code> values in the map; filtering before grouping when empty groups were required; using <code>groupingByConcurrent</code> and then expecting ordered lists.</p>
<p><b>What you must still own:</b> translating a business question into classifier + downstream, knowing the toMap/HashMap pitfalls, and deciding whether the result type (Map of Optionals? Long vs Integer?) is what callers actually need.</p>`,
    problems: [{
      title: 'Top K Frequent Words', level: 'Medium', tags: ['groupingBy', 'counting', 'Comparator'], companies: ['Amazon', 'Bloomberg', 'Uber'],
      statement: `<p>Given an array of words and an integer <code>k</code>, return the <code>k</code> most frequent words. Sort by frequency <b>high to low</b>; words with the same frequency go in <b>alphabetical</b> order. (LeetCode 692 style.)</p>`,
      constraints: `1 ≤ words.length ≤ 500, 1 ≤ k ≤ number of distinct words; words are lowercase.`,
      example: `<p>words = ["i","love","leetcode","i","love","coding"], k = 2</p><p>Counts: ${H.kv([['i', 2], ['love', 2], ['leetcode', 1], ['coding', 1]])}</p><p>Output ${H.c('g', '["i", "love"]')} — both appear twice; "i" &lt; "love" alphabetically.</p>`,
      brute: { why: `<p>For each distinct word, count it by scanning the whole array again: O(D·N) counting, then sort. Fine for 500 words, but quadratic for big inputs — the waste is re-scanning the array once per word.</p>`, code: `List<String> topKFrequent(String[] words, int k) {
    List<String> distinct = new ArrayList<>();
    for (String w : words) if (!distinct.contains(w)) distinct.add(w);   // O(N*D)
    Map<String, Integer> cnt = new HashMap<>();
    for (String d : distinct) {
        int c = 0;
        for (String w : words) if (w.equals(d)) c++;                       // rescans every time
        cnt.put(d, c);
    }
    distinct.sort((a, b) -> cnt.get(a).equals(cnt.get(b)) ? a.compareTo(b) : cnt.get(b) - cnt.get(a));
    return distinct.subList(0, k);
}` },
      mcq: { q: 'Which comparator orders map entries by count DESC, then word ASC?', options: ['<code>Map.Entry.&lt;String, Long&gt;comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey())</code>', '<code>Map.Entry.comparingByKey().reversed()</code>', '<code>Map.Entry.comparingByValue().thenComparing(Map.Entry.comparingByKey()).reversed()</code>', '<code>Comparator.naturalOrder()</code>'], answer: 0, explain: 'Reverse only the value comparison, then add the key tie-breaker. Reversing at the end would also reverse alphabetical order. The type witness <code>&lt;String, Long&gt;</code> helps inference.' },
      hints: [`<p>Hint 1: "how many times does each word appear" = a frequency map: <code>groupingBy(Function.identity(), counting())</code>.</p>`, `<p>Hint 2: stream the map's <code>entrySet()</code>, sort with a two-key comparator, <code>limit(k)</code>, <code>map(Map.Entry::getKey)</code>.</p>`, `<p>Hint 3: careful with <code>reversed()</code> placement (it reverses everything before it). Recipe: count → sort entries (count desc, word asc) → take k → keys. Follow-up for huge D: a size-k heap gives O(N + D log k).</p>`],
      solution: {
        approach: `<p>Count in one pass with <code>groupingBy</code>, then sort the (word, count) entries with an explicit comparator and take the first k.</p>`,
        code: `class TopKWords {
    static List<String> topKFrequent(String[] words, int k) {
        Map<String, Long> freq = Arrays.stream(words)
            .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
        Comparator<Map.Entry<String, Long>> byCountDescThenWord =
            Map.Entry.<String, Long>comparingByValue().reversed()
                     .thenComparing(Map.Entry.comparingByKey());
        return freq.entrySet().stream()
                   .sorted(byCountDescThenWord)
                   .limit(k)
                   .map(Map.Entry::getKey)
                   .toList();
    }

    public static void main(String[] args) {
        System.out.println(topKFrequent(new String[]{"i", "love", "leetcode", "i", "love", "coding"}, 2)); // [i, love]
        System.out.println(topKFrequent(new String[]{"the", "day", "is", "sunny", "the", "the", "the",
                                                     "sunny", "is", "is"}, 4)); // [the, is, sunny, day]
    }
}`,
        dry: { head: ['step', 'data'], rows: [
          ['count', '{i=2, love=2, leetcode=1, coding=1}'],
          ['sort by count desc', 'i=2, love=2 | leetcode=1, coding=1'],
          ['tie-break by word', 'i=2, love=2, coding=1, leetcode=1'],
          ['limit 2 → keys', '<span class="c-g">[i, love]</span>']
        ] },
        complexity: `<p>O(N) to count + O(D log D) to sort the D distinct words; O(D) space. Heap variant: O(N + D log k).</p>`,
        followUps: ['Return words with their counts as "word:count" strings', 'Stream the words from a 10 GB file (Files.lines + flatMap) without holding the file in memory']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — flatMap, mapMulti & primitive streams
     ====================================================================== */
  topics.push({
    title: 'flatMap, mapMulti & Primitive Streams (IntStream, boxed, chars)',
    analogy: `<p>A delivery van arrives with <b>boxes</b>, and each box holds a few <b>items</b>. With <code>map</code>, you put each <i>box</i> on the conveyor belt — you still have boxes. With <code>flatMap</code>, a worker <b>opens every box and puts the items themselves</b> on the belt — one flat line of items. Empty boxes simply add nothing. And primitive streams are like a belt built specially for <b>loose coins</b> instead of coins in envelopes: no wrapping and unwrapping (boxing) at every station, so it runs faster.</p>`,
    explain: `<p><b>🟢 map vs flatMap.</b> <code>map</code> is one-in, one-out. <code>flatMap</code> is one-in, <b>zero-or-more</b> out: your function returns a <b>stream</b> for each element, and Java concatenates all those streams into one.</p>
${H.table(['Input', 'map(x -&gt; list)', 'flatMap(x -&gt; list.stream())'], [
  ['[[1, 2], [3], [], [4, 5, 6]]', 'Stream of 4 lists: [1, 2], [3], [], [4, 5, 6]', 'Stream of 6 ints: 1, 2, 3, 4, 5, 6'],
  ['["hi there", "bye"]  (split words)', 'Stream&lt;String[]&gt; with 2 arrays', 'Stream&lt;String&gt;: hi, there, bye']
])}
<p><b>Typical flatMap jobs:</b></p>
<ul>
<li>Flatten nested collections: <code>orders.stream().flatMap(o -&gt; o.items().stream())</code>.</li>
<li>Lines → words: <code>lines.flatMap(l -&gt; Arrays.stream(l.split(" ")))</code>.</li>
<li>Nested loops → pairs: <code>IntStream.range(0, n).boxed().flatMap(i -&gt; IntStream.range(i + 1, n).mapToObj(j -&gt; new int[]{i, j}))</code>.</li>
<li>Drop "missing" values: <code>ids.stream().flatMap(id -&gt; findUser(id).stream())</code> (Optional.stream(), Java 9) or <code>Stream.ofNullable(x)</code>.</li>
</ul>
<p><b>mapMulti (Java 16)</b> does the same "0..n outputs" job by pushing into a consumer instead of building a small stream per element — handy when most elements produce 0 or 1 output: <code>.&lt;String&gt;mapMulti((o, sink) -&gt; { if (o.paid()) sink.accept(o.id()); })</code>.</p>
<p><b>🔵 Primitive streams.</b> <code>Stream&lt;Integer&gt;</code> holds boxed <code>Integer</code> objects; <code>IntStream</code>, <code>LongStream</code>, <code>DoubleStream</code> hold raw numbers and add math terminals.</p>
${H.table(['Want', 'Use'], [
  ['objects → ints', '<code>mapToInt(String::length)</code> (also mapToLong / mapToDouble)'],
  ['ints → objects', '<code>mapToObj(i -&gt; "#" + i)</code> or <code>boxed()</code> (→ Stream&lt;Integer&gt;)'],
  ['index loop', '<code>IntStream.range(0, n)</code> (n excluded), <code>rangeClosed(1, n)</code> (n included)'],
  ['math', '<code>sum()</code>, <code>average()</code> (OptionalDouble), <code>min()</code>/<code>max()</code> (OptionalInt), <code>summaryStatistics()</code>'],
  ['characters of a String', '<code>s.chars()</code> → IntStream of char codes; <code>mapToObj(c -&gt; (char) c)</code> to get Characters back'],
  ['array', '<code>Arrays.stream(int[])</code> → IntStream; <code>intStream.toArray()</code> → int[]'],
  ['widen', '<code>asLongStream()</code>, <code>asDoubleStream()</code>']
])}
<p><b>Classic traps:</b> <code>"abc".chars().forEach(System.out::println)</code> prints <b>97 98 99</b> (numbers, not letters). <code>Stream.of(new int[]{1, 2, 3}).count()</code> is <b>1</b> — it is a stream of one <code>int[]</code>; use <code>Arrays.stream</code> or <code>IntStream.of</code>. <code>IntStream.sum()</code> returns an <code>int</code> and can <b>overflow silently</b> — use <code>mapToLong</code> / <code>asLongStream()</code> for big totals.</p>`,
    clues: [
      '"list of lists", "flatten", "all items across all orders" → <code>flatMap</code>',
      '"split each line into words and count words" → <code>flatMap</code> + <code>groupingBy</code>',
      '"every pair (i, j)" / "nested loops in stream style" → <code>IntStream.range</code> + <code>flatMap</code>/<code>mapToObj</code>',
      '"sum / average / max of numbers, performance matters" → <code>mapToInt</code> / <code>IntStream</code> (no boxing)',
      '"count characters in a String" → <code>s.chars()</code> (remember it gives ints)',
      '"skip the ones that are not found / Optional inside a stream" → <code>flatMap(Optional::stream)</code>'
    ],
    code: [`record Order(String customer, List<String> items) {}

class FlatAndPrimitive {
    public static void main(String[] args) {
        List<List<Integer>> nested = List.of(List.of(1, 2), List.of(3), List.of(), List.of(4, 5, 6));
        System.out.println(nested.stream().map(List::size).toList());              // [2, 1, 0, 3]
        System.out.println(nested.stream().flatMap(List::stream).toList());        // [1, 2, 3, 4, 5, 6]

        List<String> lines = List.of("to be or", "not to be");
        List<String> words = lines.stream()
            .flatMap(line -> Arrays.stream(line.split(" ")))
            .toList();
        System.out.println(words);                                                 // [to, be, or, not, to, be]

        List<Order> orders = List.of(new Order("ana", List.of("pen", "ink")),
                                     new Order("bo", List.of("pen")));
        Set<String> products = orders.stream().flatMap(o -> o.items().stream())
                                     .collect(Collectors.toCollection(TreeSet::new));
        System.out.println(products);                                              // [ink, pen]

        // mapMulti (Java 16): emit 0..n results without creating a Stream per element
        List<String> evensTwice = Stream.of(1, 2, 3, 4)
            .<String>mapMulti((n, sink) -> {
                if (n % 2 == 0) { sink.accept(n + "a"); sink.accept(n + "b"); }
            })
            .toList();
        System.out.println(evensTwice);                                            // [2a, 2b, 4a, 4b]

        // Primitive streams
        IntSummaryStatistics st = IntStream.rangeClosed(1, 5).summaryStatistics();
        System.out.println(st);  // IntSummaryStatistics{count=5, sum=15, min=1, average=3.000000, max=5}
        System.out.println(words.stream().mapToInt(String::length).max().getAsInt()); // 3
        List<String> labels = IntStream.range(0, 3).mapToObj(i -> "#" + i).toList();
        System.out.println(labels);                                                // [#0, #1, #2]
        List<Integer> boxed = IntStream.of(3, 1, 2).boxed().sorted(Comparator.reverseOrder()).toList();
        System.out.println(boxed);                                                 // [3, 2, 1]

        // chars() gives ints!
        "abc".chars().forEach(c -> System.out.print(c + " "));                     // 97 98 99
        System.out.println();
        "abc".chars().mapToObj(c -> (char) c).forEach(System.out::print);          // abc
        System.out.println();

        // Overflow: int sum vs long sum
        int[] big = {2_000_000_000, 2_000_000_000};
        System.out.println(Arrays.stream(big).sum());                 // -294967296 (overflowed!)
        System.out.println(Arrays.stream(big).asLongStream().sum());  // 4000000000
    }
}`],
    codeTitle: ['flatMap, mapMulti and primitive streams in action'],
    viz: [{
      title: 'map vs flatMap: boxes on the belt vs items on the belt',
      input: '1,2 ; 3 ; ; 4,5,6',
      inputLabel: 'Inner lists separated by ";" (items by ","; an empty slot = empty list)',
      gen: function (input) {
        var raw = clean(input);
        if (!raw) throw new Error('Example: 1,2 ; 3 ; ; 4,5,6');
        var lists = raw.split(';').map(function (s) { s = clean(s); return s ? s.split(',').map(function (x) { x = clean(x); if (!/^-?\d{1,4}$/.test(x)) throw new Error('Items must be integers, e.g. 1,2 ; 3 ; ; 4,5,6'); return Number(x); }) : []; });
        if (lists.length < 2 || lists.length > 6 || lists.some(function (l) { return l.length > 5; })) throw new Error('Use 2–6 inner lists with at most 5 items each');
        var labels = lists.map(function (l) { return '[' + l.join(',') + ']'; });
        var code = 'List<List<Integer>> nested = ' + labels.join(' ') + ';\nnested.stream().map(l -> l.size()).toList();      // map: one output per list\nnested.stream().flatMap(List::stream).toList();     // flatMap: all items, flat';
        var frames = [], res = [];
        function F(narr, line, outerHl, inner, innerHl, resLabel, resHl) {
          var parts = [{ type: 'code', label: 'Code', lang: 'java', code: code, hl: one(line, 'cur') },
            { type: 'array', label: 'Outer stream (each element is a whole list = a box)', values: labels, hl: outerHl || {} }];
          if (inner) parts.push({ type: 'array', label: 'Opened box (inner stream)', values: inner.length ? inner : ['(empty)'], hl: innerHl || {} });
          parts.push({ type: 'array', label: resLabel, values: res.length ? res.slice() : ['[ ]'], hl: resHl || {} });
          frames.push({ narr: narr, parts: parts });
        }
        F('We start with a stream whose elements are <b>lists</b> (' + lists.length + ' boxes).', 1, {}, null, null, 'result');
        lists.forEach(function (l, i) {
          var hl = {}; for (var q = 0; q < i; q++) hl[q] = 'done'; hl[i] = 'cur';
          res.push(l.length);
          F('<code>map(l -&gt; l.size())</code>: box ' + labels[i] + ' produces exactly <b>one</b> output (' + l.length + '). map never changes how many elements there are.', 2, hl, null, null, 'map result (one value per box)', one(res.length - 1, 'ok'));
        });
        F('<code>map</code> gave ' + res.length + ' outputs for ' + lists.length + ' inputs. If the function returned the list itself, we would still have a stream of lists — <b>nested</b>, not flat.', 2, {}, null, null, 'map result (one value per box)');
        res = [];
        lists.forEach(function (l, i) {
          var hl = {}; for (var q = 0; q < i; q++) hl[q] = 'done'; hl[i] = 'cur';
          if (!l.length) { F('<code>flatMap</code> opens box ' + labels[i] + ' — it is <b>empty</b>, so it contributes <b>nothing</b>. (That is how flatMap can also <i>remove</i> elements.)', 3, hl, [], {}, 'flatMap result (flat)'); return; }
          l.forEach(function (v, j) {
            res.push(v);
            var ih = {}; for (var r = 0; r < j; r++) ih[r] = 'done'; ih[j] = 'ok';
            F('<code>flatMap</code> opened box ' + labels[i] + ' and pushes item <b>' + v + '</b> straight onto the main belt.', 3, hl, l, ih, 'flatMap result (flat)', one(res.length - 1, 'ok'));
          });
        });
        F('flatMap result: <b>[' + res.join(', ') + ']</b> — ' + res.length + ' items from ' + lists.length + ' boxes. Rule: <b>map = 1 → 1</b>, <b>flatMap = 1 → 0..n</b>.', 3, {}, null, null, 'flatMap result (flat)', {});
        return frames;
      }
    }, {
      title: 'String.chars(): ints, not chars',
      input: 'hello',
      inputLabel: 'A word (2–10 letters)',
      gen: function (input) {
        var s = clean(input);
        if (!/^[A-Za-z]{2,10}$/.test(s)) throw new Error('Enter one word with 2–10 letters');
        var codes = s.split('').map(function (c) { return c.charCodeAt(0); });
        var code = 'String s = "' + s + '";\ns.chars().forEach(c -> System.out.print(c + " "));\ns.chars().mapToObj(c -> (char) c).forEach(System.out::print);\nMap<Character, Long> f = s.chars().mapToObj(c -> (char) c)\n    .collect(Collectors.groupingBy(c -> c, LinkedHashMap::new, Collectors.counting()));';
        var frames = [];
        function F(narr, line, parts) { frames.push({ narr: narr, parts: [{ type: 'code', label: 'Code', lang: 'java', code: code, hl: one(line, 'cur') }].concat(parts) }); }
        F('A String is a sequence of characters, so <code>chars()</code> sounds like it gives characters…', 1, [{ type: 'array', label: 's', values: s.split('') }]);
        F('…but it returns an <b>IntStream</b> of UTF-16 code units. Each letter becomes its number.', 2, [{ type: 'array', label: 's', values: s.split('') }, { type: 'array', label: 's.chars() (IntStream)', values: codes, hl: { 0: 'cur' } }]);
        F('So <code>forEach(c -&gt; print(c + " "))</code> prints <b>numbers</b>: ' + codes.join(' ') + '. Classic predict-the-output trap!', 2, [{ type: 'array', label: 's.chars()', values: codes, hl: { 0: 'bad' } }, out(codes.join(' ') + ' ')]);
        F('Fix: <code>mapToObj(c -&gt; (char) c)</code> casts each int back to <code>char</code> and boxes it into a <code>Character</code>. Now printing gives letters: <b>' + s + '</b>.', 3, [{ type: 'array', label: 'after mapToObj(c -> (char) c)', values: s.split(''), hl: { 0: 'ok' } }, out(codes.join(' ') + ' \n' + s)]);
        var counts = [];
        s.split('').forEach(function (c) { var e = null; counts.forEach(function (x) { if (x[0] === c) e = x; }); if (e) e[1]++; else counts.push([c, 1]); });
        F('Counting characters: group the Characters with <code>counting()</code>; LinkedHashMap keeps first-seen order. Result: {' + counts.map(function (x) { return x[0] + '=' + x[1]; }).join(', ') + '}.', 4, [{ type: 'map', label: 'frequency map', entries: counts.map(function (x) { return [x[0], x[1]]; }), hl: (function () { var h = {}; counts.forEach(function (x) { if (x[1] > 1) h[x[0]] = 'sel'; }); return h; })() }]);
        F('Remember: <code>chars()</code> → ints; for letters use <code>mapToObj(c -&gt; (char) c)</code>, or <code>Character.toString(c)</code>; for full Unicode (emoji) use <code>codePoints()</code>.', 1, [note('chars() = UTF-16 units · codePoints() = real Unicode characters', 'Rule')]);
        return frames;
      }
    }],
    examples: [
      { title: 'Stream.of(int[]) is a stream of ONE array', html: `<p>Generics cannot hold primitives, so <code>Stream.of(T... values)</code> treats a whole <code>int[]</code> as a single <code>T</code>.</p>${H.table(['Expression', 'Type', 'count()'], [['<code>Stream.of(arr)</code>', 'Stream&lt;int[]&gt;', '<span class="c-r">1</span>'], ['<code>Arrays.stream(arr)</code>', 'IntStream', '3'], ['<code>IntStream.of(arr)</code>', 'IntStream', '3'], ['<code>Stream.of(1, 2, 3)</code>', 'Stream&lt;Integer&gt;', '3']])}`, code: `int[] arr = {1, 2, 3};
System.out.println(Stream.of(arr).count());       // 1  (one int[] element)
System.out.println(Arrays.stream(arr).count());   // 3
System.out.println(IntStream.of(arr).sum());      // 6
Integer[] boxed = {1, 2, 3};
System.out.println(Stream.of(boxed).count());     // 3  (object array spreads into varargs)` },
      { title: 'All pairs with a given sum (nested loops as flatMap)', html: `<p>Two nested index loops become <code>range</code> + <code>flatMap</code>. Here every pair (i &lt; j) with a[i] + a[j] == 7.</p>${H.arr([1, 6, 3, 4, 5, 2], { hl: { 0: 'g', 1: 'g' } })}<p>Pairs: (1,6), (3,4), (5,2).</p>`, code: `int[] a = {1, 6, 3, 4, 5, 2};
int target = 7;
List<String> pairs = IntStream.range(0, a.length).boxed()
    .flatMap(i -> IntStream.range(i + 1, a.length)
                           .filter(j -> a[i] + a[j] == target)
                           .mapToObj(j -> "(" + a[i] + "," + a[j] + ")"))
    .toList();
System.out.println(pairs);   // [(1,6), (3,4), (5,2)]` },
      { title: 'flatMap(Optional::stream) drops the misses', html: `<p>Looking up IDs where some don't exist: each lookup returns an <code>Optional</code>. <code>Optional.stream()</code> (Java 9) turns present → 1 element, empty → 0 elements, so flatMap keeps only hits.</p>${H.table(['id', 'lookup', 'contributes'], [['1', 'Optional[ana]', 'ana'], ['7', 'Optional.empty', '(nothing)'], ['2', 'Optional[bo]', 'bo']])}`, code: `class Lookup {
    static final Map<Integer, String> USERS = Map.of(1, "ana", 2, "bo");
    static Optional<String> find(int id) { return Optional.ofNullable(USERS.get(id)); }
    public static void main(String[] args) {
        List<String> found = Stream.of(1, 7, 2).flatMap(id -> find(id).stream()).toList();
        System.out.println(found);   // [ana, bo]
    }
}` },
      { title: 'Average that might not exist: OptionalDouble', html: `<p><code>IntStream.average()</code> returns <code>OptionalDouble</code> because the average of nothing is undefined. Choose explicitly what an empty input means.</p>`, code: `int[] none = {};
OptionalDouble avg = Arrays.stream(none).average();
System.out.println(avg.isPresent());           // false
System.out.println(avg.orElse(0.0));           // 0.0
System.out.println(IntStream.of(2, 3).average().getAsDouble()); // 2.5 (double division)` }
    ],
    deepDive: `<p><b>🟣 What flatMap costs.</b> For every upstream element, flatMap calls your function, gets a brand-new <code>Stream</code> (several objects), pushes its elements downstream, then closes it (flatMap closes each inner stream — so <code>flatMap(p -&gt; Files.lines(p))</code> releases file handles correctly). When most elements produce zero or one result, that per-element stream is pure overhead; <code>mapMulti</code> pushes directly into the downstream sink, and <code>Optional::stream</code> or a <code>filter</code> + <code>map</code> pair may be cheaper still. Since JDK 10 flatMap respects short-circuiting inside an inner stream (before that, an infinite inner stream with <code>findFirst</code> hung).</p>
<p><b>Boxing math.</b> Summing 10 million <code>Integer</code>s via <code>Stream&lt;Integer&gt;.reduce(0, Integer::sum)</code> may allocate a new Integer per step for values outside the −128..127 cache, plus pointer-chasing into the heap. <code>IntStream.sum()</code> works on raw ints in registers and is often several times faster. Escape analysis removes some boxing but not reliably — that's why primitive specialisations exist (Valhalla's value classes may eventually narrow the gap).</p>
<p><b>Precision and overflow.</b> <code>IntStream.sum()</code> wraps around on overflow without warning; <code>Math.addExact</code> inside a <code>reduce</code> makes it throw instead. <code>DoubleStream.sum()</code> uses Kahan-style compensated summation to reduce floating-point error, so its result can differ slightly from a naive loop. <code>average()</code> on IntStream sums as <code>long</code> internally, so it does not overflow for int inputs.</p>
<p><b>chars() vs codePoints():</b> characters outside the Basic Multilingual Plane (emoji like 😀) take two <code>char</code>s (a surrogate pair). <code>chars()</code> yields both halves separately; <code>codePoints()</code> yields one int per real character — use it for any user-facing text processing.</p>
<p><b>range vs iterate:</b> <code>IntStream.range</code> is SIZED and splits perfectly for parallel; <code>IntStream.iterate(0, i -&gt; i + 1).limit(n)</code> is neither — prefer <code>range</code> whenever the bounds are known.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes flatMap chains effortlessly, including over-engineered ones (flatMap of a stream of one element, nested flatMaps where a simple loop is clearer). Your skill is choosing the simplest correct shape and the right number type.</p>
<p><b>Use AI as a partner:</b> <code>"Rewrite this triple-nested loop as streams AND as plain loops; which is more readable and why?"</code>; <code>"Find every place this code boxes ints in a hot path"</code>.</p>
<p><b>Where AI goes wrong:</b> <code>Stream.of(intArray)</code> instead of <code>Arrays.stream</code>; printing <code>chars()</code> expecting letters; summing large ints with <code>IntStream.sum()</code> (silent overflow); using <code>flatMap(x -&gt; Stream.of(f(x)))</code> instead of <code>map</code>; forgetting <code>codePoints()</code> for emoji-heavy text.</p>
<p><b>What you must still own:</b> the 1 → 1 vs 1 → 0..n mental model, the primitive/boxed conversion table, and the numeric edge cases (overflow, empty average, Unicode) that tests and reviewers catch.</p>`,
    problems: [{
      title: 'Product Popularity Across Orders', level: 'Medium', tags: ['flatMap', 'groupingBy', 'sorting'], companies: ['Flipkart', 'Walmart', 'Shopify'],
      statement: `<p>Each <code>Order(String customer, List&lt;String&gt; items)</code> contains product names (a product may appear more than once in the same order). Return a list of strings <code>"product=count"</code> for every product, sorted by <b>count descending</b>, then <b>product name ascending</b>.</p>`,
      constraints: `0 ≤ orders ≤ 10<sup>5</sup>, total items ≤ 10<sup>6</sup>. Items lists may be empty.`,
      example: `<p>Orders: ana [pen, ink, pen], bo [pen], cy [], dee [ink, cap]</p><p>Flattened: ${H.arr(['pen', 'ink', 'pen', 'pen', 'ink', 'cap'])}</p><p>Output ${H.c('g', '[pen=3, ink=2, cap=1]')}</p>`,
      brute: { why: `<p>Two nested loops into a map works fine and is O(total items). The "brute" problem here is not speed but clarity: manual map bookkeeping (<code>getOrDefault</code> + put) and a separate sort step are noisy. The stream version states the intent: flatten → count → sort.</p>`, code: `record Order(String customer, List<String> items) {}

class BrutePopularity {
    static List<String> popularity(List<Order> orders) {
        Map<String, Integer> cnt = new HashMap<>();
        for (Order o : orders)
            for (String it : o.items())
                cnt.put(it, cnt.getOrDefault(it, 0) + 1);
        List<String> keys = new ArrayList<>(cnt.keySet());
        keys.sort((a, b) -> !cnt.get(a).equals(cnt.get(b)) ? cnt.get(b) - cnt.get(a) : a.compareTo(b));
        List<String> out = new ArrayList<>();
        for (String k : keys) out.add(k + "=" + cnt.get(k));
        return out;
    }
}` },
      mcq: { q: 'Which call turns <code>Stream&lt;Order&gt;</code> into a <code>Stream&lt;String&gt;</code> of all items?', options: ['<code>flatMap(o -&gt; o.items().stream())</code>', '<code>map(Order::items)</code>', '<code>map(o -&gt; o.items().stream())</code>', '<code>mapToObj(Order::items)</code>'], answer: 0, explain: '<code>map(Order::items)</code> gives Stream&lt;List&lt;String&gt;&gt;; <code>map(… .stream())</code> gives Stream&lt;Stream&lt;String&gt;&gt;. Only flatMap flattens. mapToObj exists only on primitive streams.' },
      hints: [`<p>Hint 1: "across all orders" = flatten first. Each order is a box of items.</p>`, `<p>Hint 2: <code>flatMap(o -&gt; o.items().stream())</code>, then <code>groupingBy(Function.identity(), counting())</code>.</p>`, `<p>Hint 3: sort the entry set with <code>comparingByValue().reversed().thenComparing(comparingByKey())</code> and map to <code>key + "=" + value</code>. Empty orders contribute nothing automatically.</p>`],
      solution: {
        approach: `<p>Flatten with flatMap, count with groupingBy, sort the entries with a two-key comparator, format.</p>`,
        code: `record Order(String customer, List<String> items) {}

class Popularity {
    static List<String> popularity(List<Order> orders) {
        Map<String, Long> cnt = orders.stream()
            .flatMap(o -> o.items().stream())                       // all items, flat
            .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
        return cnt.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed()
                             .thenComparing(Map.Entry.comparingByKey()))
            .map(e -> e.getKey() + "=" + e.getValue())
            .toList();
    }

    public static void main(String[] args) {
        System.out.println(popularity(List.of(
            new Order("ana", List.of("pen", "ink", "pen")), new Order("bo", List.of("pen")),
            new Order("cy", List.of()), new Order("dee", List.of("ink", "cap")))));
        // [pen=3, ink=2, cap=1]
    }
}`,
        dry: { head: ['order', 'items pushed by flatMap', 'counts after'], rows: [
          ['ana', 'pen, ink, pen', '{pen=2, ink=1}'],
          ['bo', 'pen', '{pen=3, ink=1}'],
          ['cy', '(none)', '{pen=3, ink=1}'],
          ['dee', 'ink, cap', '{pen=3, ink=2, cap=1}'],
          ['sort + format', '–', '<span class="c-g">[pen=3, ink=2, cap=1]</span>']
        ] },
        complexity: `<p>O(T) to flatten and count T items, O(P log P) to sort P distinct products; O(P) extra space.</p>`,
        followUps: ['Count each product at most once per order (distinct inside each order: <code>o.items().stream().distinct()</code>)', 'Return the top product per customer']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Parallel streams and their caveats
     ====================================================================== */
  topics.push({
    title: 'Parallel Streams: When They Help and How They Bite',
    analogy: `<p>A head teacher has <b>800 exam papers</b> to grade. She splits the pile in half, hands half to a colleague, each splits again… until four teachers each grade 200 papers, and the totals are <b>added up</b> at the end. Brilliant — <i>if</i> each paper can be graded independently and totals can be combined in any grouping. It goes wrong if all four must write into <b>one shared notebook</b> at the same time (they overwrite each other), if the "combine" step depends on order, or if there are only <b>5 papers</b> (handing them out takes longer than grading). That is the whole story of <code>parallelStream()</code>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <code>list.parallelStream()</code> or <code>stream.parallel()</code> runs the same pipeline on several CPU cores. Java <b>splits</b> the source into chunks (using its <code>Spliterator</code>), processes chunks on the shared <b>ForkJoinPool.commonPool()</b> (by default <i>cores − 1</i> worker threads plus the calling thread), and <b>combines</b> partial results. Your code barely changes — which makes it dangerously easy to switch on.</p>
${H.table(['Parallel tends to HELP when…', 'Parallel tends to HURT when…'], [
  ['N is large (≥ 10<sup>5</sup>) or each element is CPU-heavy (rule of thumb: N × cost-per-element &gt; 10 000 simple operations)', 'N is small: splitting and thread hand-off cost more than the work'],
  ['source splits evenly: <code>ArrayList</code>, arrays, <code>IntStream.range</code>, <code>HashMap</code> keys', 'source splits badly: <code>LinkedList</code>, <code>Stream.iterate</code>, <code>Files.lines</code>/<code>BufferedReader</code>'],
  ['lambdas are pure; reduction is associative with a true identity', 'lambdas touch shared mutable state (<code>list.add</code>, counters, HashMap)'],
  ['order doesn\'t matter (<code>findAny</code>, <code>unordered()</code>, <code>toSet</code>)', 'order-sensitive stateful ops: <code>limit</code>, <code>skip</code>, <code>distinct</code>, <code>sorted</code>, <code>findFirst</code> on ordered streams'],
  ['work is CPU-bound', 'work is blocking I/O (HTTP, JDBC, sleeps) — it starves the common pool for the whole JVM']
])}
<p><b>🔵 The caveats, one line each:</b></p>
<ol>
<li><b>Shared mutable state = race condition.</b> <code>parallelStream().forEach(result::add)</code> into an <code>ArrayList</code> loses elements, inserts nulls, or throws <code>ArrayIndexOutOfBoundsException</code>. Use <code>collect(...)</code> / <code>toList()</code> — each thread fills its own container and Java merges them.</li>
<li><b>reduce needs a real identity and an associative operation.</b> <code>reduce(10, Integer::sum)</code> adds 10 <i>per chunk</i> in parallel; <code>reduce(0, (a, b) -&gt; a - b)</code> gives different answers depending on how the data was split.</li>
<li><b>Order:</b> <code>forEach</code> runs in whatever order threads finish; <code>forEachOrdered</code> respects encounter order (and loses much of the parallel benefit). <code>findAny</code> may return any match; <code>findFirst</code> must coordinate across threads.</li>
<li><b>One shared pool:</b> all parallel streams in the JVM share the common pool. One slow, blocking pipeline slows every other parallel stream (and <code>CompletableFuture.supplyAsync</code> without an executor).</li>
<li><b>Measure, don't guess.</b> Use JMH; a "parallel is 4× faster" claim from a single <code>main</code> run is usually JIT warm-up noise.</li>
</ol>`,
    clues: [
      '"make this stream faster on a multi-core machine" → consider <code>parallel()</code>, but ask about N, cost per element and the source type first',
      '"results are different each run / missing elements / ArrayIndexOutOfBounds in parallel" → shared mutable state in a lambda',
      '"reduce gives the wrong answer only in parallel" → non-associative operation or a fake identity',
      '"order of output changes with parallelStream" → <code>forEach</code> vs <code>forEachOrdered</code>, <code>findAny</code> vs <code>findFirst</code>',
      '"parallel stream calling a REST API / database" → blocking I/O in the common pool (use an executor or virtual threads instead)',
      '"which collections split well for parallel?" → array-backed and range sources; not LinkedList or iterate'
    ],
    code: [`class ParallelCaveats {
    public static void main(String[] args) {
        List<Integer> nums = IntStream.rangeClosed(1, 10_000).boxed().toList();

        // ✘ WRONG: shared ArrayList mutated from many threads (lost updates / exceptions)
        List<Integer> unsafe = new ArrayList<>();
        try {
            nums.parallelStream().forEach(unsafe::add);
            System.out.println("unsafe size (often < 10000): " + unsafe.size());
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("unsafe add crashed: " + e);
        }

        // ✔ RIGHT: let the stream build the container (per-thread buffers, merged safely, ordered)
        List<Integer> safe = nums.parallelStream().map(x -> x * 2).toList();
        System.out.println("safe size: " + safe.size() + ", first: " + safe.get(0)); // 10000, 2

        // ✘ WRONG identity: 10 is added once PER CHUNK in parallel
        int seq = nums.stream().reduce(10, Integer::sum);           // 50005010
        int par = nums.parallelStream().reduce(10, Integer::sum);   // 50005000 + 10 * chunks
        System.out.println(seq + " vs " + par);
        // ✔ RIGHT: true identity, add the extra 10 outside
        System.out.println(10 + nums.parallelStream().reduce(0, Integer::sum)); // 50005010

        // ✘ Non-associative operation: subtraction depends on grouping
        System.out.println(nums.stream().reduce(0, (a, b) -> a - b));          // -50005000
        System.out.println(nums.parallelStream().reduce(0, (a, b) -> a - b));  // something else!

        // Order: forEach is unordered in parallel, forEachOrdered keeps encounter order
        List.of(1, 2, 3, 4, 5).parallelStream().forEach(x -> System.out.print(x + " "));        // e.g. 3 5 4 1 2
        System.out.println();
        List.of(1, 2, 3, 4, 5).parallelStream().forEachOrdered(x -> System.out.print(x + " ")); // 1 2 3 4 5
        System.out.println();

        // findAny may return any match in parallel; findFirst returns the first in encounter order
        System.out.println(nums.parallelStream().filter(x -> x % 1000 == 0).findFirst().get()); // always 1000
        System.out.println(ForkJoinPool.commonPool().getParallelism() + " common-pool workers");
    }
}`, `class OwnPool {
    // Keep slow or special parallel work off the shared common pool.
    // (Running a parallel stream inside a ForkJoinPool task makes it use that pool —
    //  widely used, but an implementation detail: for blocking I/O prefer an ExecutorService
    //  or virtual threads instead of parallel streams.)
    public static void main(String[] args) throws Exception {
        ForkJoinPool pool = new ForkJoinPool(4);
        try {
            long primes = pool.submit(() ->
                IntStream.rangeClosed(2, 200_000).parallel()
                         .filter(OwnPool::isPrime).count()
            ).get();
            System.out.println(primes);   // 17984
        } finally {
            pool.shutdown();
        }
    }

    static boolean isPrime(int n) {
        for (int d = 2; (long) d * d <= n; d++) if (n % d == 0) return false;
        return n >= 2;
    }
}`],
    codeTitle: ['The classic parallel bugs and their fixes', 'Running a parallel pipeline in your own pool'],
    viz: [{
      title: 'Fork/join reduce: split, compute leaves, combine',
      input: '1 2 3 4 5 6 7 8 | identity 0 | sum',
      inputLabel: 'numbers (4–16) | identity N | sum / minus / product / max  (try identity 10, or minus)',
      gen: function (input) {
        var segs = clean(input).split('|').map(function (x) { return clean(x); });
        if (segs.length !== 3) throw new Error('Format: numbers | identity N | sum|minus|product|max');
        var a = intsOf(segs[0], 4, 16, -99, 99, 'Enter 4–16 integers between -99 and 99');
        var im = segs[1].match(/^identity\s+(-?\d{1,4})$/);
        if (!im) throw new Error('Second part must look like: identity 0');
        var id = Number(im[1]);
        var OPS = { sum: [function (x, y) { return x + y; }, '+', 'Integer::sum'], minus: [function (x, y) { return x - y; }, '−', '(a, b) -> a - b'], product: [function (x, y) { return x * y; }, '×', '(a, b) -> a * b'], max: [function (x, y) { return Math.max(x, y); }, 'max', 'Integer::max'] };
        var O = OPS[segs[2]];
        if (!O) throw new Error('Operation must be sum, minus, product or max');
        var f = O[0];
        function fold(arr) { var r = id; arr.forEach(function (x) { r = f(r, x); }); return r; }
        var seq = fold(a);
        var mid = a.length >>> 1, L = a.slice(0, mid), R = a.slice(mid);
        var LL = L.slice(0, L.length >>> 1), LR = L.slice(L.length >>> 1), RL = R.slice(0, R.length >>> 1), RR = R.slice(R.length >>> 1);
        var chunks = [LL, LR, RL, RR];
        var lab = ['?', '', '', '', '', '', ''], tags = { 0: a.length + ' items' };
        var code = 'int r = nums.parallelStream()\n          .reduce(' + id + ', ' + O[2] + ');';
        var frames = [];
        function F(narr, hl, extraVals, bad) {
          var vals = { 'sequential answer': seq };
          Object.keys(extraVals || {}).forEach(function (k) { vals[k] = extraVals[k]; });
          frames.push({ narr: narr, parts: [
            { type: 'code', label: 'Code', lang: 'java', code: code, hl: { 2: bad ? 'bad' : 'cur' } },
            { type: 'tree', label: 'ForkJoin task tree (node text = partial result, tag = chunk)', arr: lab.map(function (x) { return x === '' ? null : x; }), hl: hl || {}, tags: JSON.parse(JSON.stringify(tags)) },
            { type: 'vars', label: 'Results', vals: vals, hl: bad ? { parallel: 'bad' } : { parallel: 'ok' } }
          ] });
        }
        F('Sequentially, reduce starts from the identity <b>once</b>: ' + id + ' ' + O[1] + ' ' + a.join(' ' + O[1] + ' ') + ' = <b>' + seq + '</b>. Now the parallel version: the root task owns all ' + a.length + ' elements.', { 0: 'cur' });
        lab[1] = '?'; lab[2] = '?'; tags[1] = '[' + L.join(',') + ']'; tags[2] = '[' + R.join(',') + ']'; tags[0] = 'split';
        F('The Spliterator <b>splits</b> the work in half (ArrayList/array sources split perfectly by index). Each half becomes a subtask another thread can steal.', { 0: 'done', 1: 'cur', 2: 'cur' });
        lab[3] = lab[4] = lab[5] = lab[6] = '?'; tags[1] = 'split'; tags[2] = 'split';
        chunks.forEach(function (c, i) { tags[3 + i] = '[' + c.join(',') + ']'; });
        F('Split again → 4 leaf chunks, processed by different worker threads at the same time.', { 1: 'done', 2: 'done', 3: 'cur', 4: 'cur', 5: 'cur', 6: 'cur' });
        var leafRes = chunks.map(fold);
        chunks.forEach(function (c, i) {
          lab[3 + i] = String(leafRes[i]);
          var hl = {}; hl[3 + i] = 'ok';
          F('Leaf ' + (i + 1) + ' folds its chunk <b>starting from the identity again</b>: ' + id + ' ' + O[1] + ' ' + c.join(' ' + O[1] + ' ') + ' = <b>' + leafRes[i] + '</b>.' + (id !== 0 && segs[2] === 'sum' ? ' <span class="c-r">The ' + id + ' is added in every leaf!</span>' : ''), hl);
        });
        var lres = f(leafRes[0], leafRes[1]), rres = f(leafRes[2], leafRes[3]);
        lab[1] = String(lres); lab[2] = String(rres);
        F('Combine pairs with the same operation: left = ' + leafRes[0] + ' ' + O[1] + ' ' + leafRes[1] + ' = <b>' + lres + '</b>, right = ' + leafRes[2] + ' ' + O[1] + ' ' + leafRes[3] + ' = <b>' + rres + '</b>.', { 1: 'ok', 2: 'ok' });
        var par = f(lres, rres);
        lab[0] = String(par); tags[0] = 'result';
        var same = par === seq;
        F('Root: ' + lres + ' ' + O[1] + ' ' + rres + ' = <b>' + par + '</b>. ' + (same ? '<span class="c-g">Matches the sequential answer</span> — the operation is associative and ' + id + ' is a true identity.' : '<span class="c-r">Different from sequential (' + seq + ')!</span> ' + (segs[2] === 'minus' ? 'Subtraction is <b>not associative</b>: (a − b) − c ≠ a − (b − c).' : id + ' is <b>not a true identity</b> for ' + segs[2] + ' (it must satisfy identity ' + O[1] + ' x = x), so it was applied once per leaf.')), { 0: same ? 'sel' : 'bad' }, { parallel: par }, !same);
        F(same ? 'Rule satisfied: <b>identity ⊕ x = x</b> and <b>(a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)</b>. That is exactly what the <code>reduce</code> Javadoc requires.' : 'Fix: use a real identity (0 for sum, 1 for product) and an associative operation; apply any "extra" value <b>outside</b> the reduce. Try changing the input and watch the answers agree.', { 0: same ? 'sel' : 'bad' }, { parallel: par }, !same);
        return frames;
      }
    }, {
      title: 'Why forEach(list::add) loses data in parallel',
      gen: function () {
        var code = '// inside ArrayList.add(e), simplified\nint s = size;            // 1. read size\nelementData[s] = e;      // 2. write slot\nsize = s + 1;            // 3. write size';
        var steps = [
          ['–', 'start', '[ _, _, _ ]', 0, 'Two worker threads both call <code>unsafe.add(...)</code> on the same ArrayList at the same moment. The list is empty: size = 0.', {}, null],
          ['A', 'reads size → s = 0', '[ _, _, _ ]', 0, 'Thread A reads size = 0.', { 2: 'cur' }, 0],
          ['B', 'reads size → s = 0', '[ _, _, _ ]', 0, 'Thread B also reads size = 0 — A has not written yet. Both now plan to use slot 0. <span class="c-y">This is the race.</span>', { 2: 'cur' }, 0],
          ['A', 'elementData[0] = "x"', '[ x, _, _ ]', 0, 'A writes "x" into slot 0.', { 3: 'cur' }, 0],
          ['B', 'elementData[0] = "y"', '[ y, _, _ ]', 0, 'B writes "y" into the <b>same</b> slot 0 — <span class="c-r">"x" is overwritten and lost</span>.', { 3: 'bad' }, 0],
          ['A', 'size = 0 + 1', '[ y, _, _ ]', 1, 'A sets size = 1.', { 4: 'cur' }, null],
          ['B', 'size = 0 + 1', '[ y, _, _ ]', 1, 'B also sets size = 1. Two adds, but the list has <b>one</b> element. Other interleavings leave <code>null</code> holes or throw <code>ArrayIndexOutOfBoundsException</code> while the array is being resized.', { 4: 'bad' }, null],
          ['fix', 'collect / toList()', '[ x ] + [ y ] → [ x, y ]', 2, '<b>Fix:</b> don\'t share. <code>parallelStream().toList()</code> (or <code>collect</code>) gives each thread its <b>own</b> buffer and merges them at the end — no locks needed, and encounter order is kept.', {}, null]
        ];
        var log = [];
        return steps.map(function (s, i) {
          if (i > 0) log.push([s[0], s[1]]);
          var arr = s[2].replace(/[\[\]\s]/g, '').split(',');
          return { narr: s[4], parts: [
            { type: 'code', label: 'What add() really does', lang: 'java', code: code, hl: s[5] },
            { type: 'table', label: 'Interleaving of thread steps', columns: ['thread', 'action'], rows: log.map(function (r) { return r.slice(); }), hl: log.length ? one(log.length - 1, s[5][3] === 'bad' || s[5][4] === 'bad' ? 'bad' : 'cur') : {} },
            { type: 'array', label: 'elementData', values: s[0] === 'fix' ? ['x', 'y'] : arr, hl: s[6] !== null ? one(s[6], i === 4 ? 'bad' : 'cur') : {} },
            { type: 'vars', label: 'Shared fields', vals: { size: s[3], 'adds attempted': i === 0 ? 0 : i >= 3 ? 2 : i }, hl: { size: i === 6 ? 'bad' : (i === 7 ? 'ok' : 'cur') } }
          ] };
        });
      }
    }],
    examples: [
      { title: 'Predict: forEach vs forEachOrdered', html: `<p>In parallel, <code>forEach</code> prints in whatever order threads reach the element — it changes from run to run. <code>forEachOrdered</code> always prints 1 2 3 4 5, but threads must wait for each other, so it is slower.</p>${H.table(['Call', 'Possible output'], [['<code>parallelStream().forEach(print)</code>', '3 5 4 1 2 (varies)'], ['<code>parallelStream().forEachOrdered(print)</code>', '1 2 3 4 5 (always)'], ['<code>parallelStream().map(…).toList()</code>', 'list in encounter order (always)']])}`, code: `List<Integer> xs = List.of(1, 2, 3, 4, 5);
xs.parallelStream().forEach(x -> System.out.print(x + " "));          // order varies
System.out.println();
xs.parallelStream().forEachOrdered(x -> System.out.print(x + " "));   // 1 2 3 4 5
System.out.println();
System.out.println(xs.parallelStream().map(x -> x * 10).toList());     // [10, 20, 30, 40, 50] — collect keeps order` },
      { title: 'Thread-safe counting without locks', html: `<p>Need a count? Don't increment a shared <code>int[]</code> or even an <code>AtomicInteger</code> (correct but contended). Let the stream do it: <code>count()</code>, <code>sum()</code>, or <code>groupingByConcurrent</code> for per-key counts.</p>`, code: `List<String> words = Collections.nCopies(1000, "a");
AtomicInteger atomic = new AtomicInteger();
words.parallelStream().forEach(w -> atomic.incrementAndGet());   // correct but all threads fight over one counter
long counted = words.parallelStream().count();                   // idiomatic
ConcurrentMap<String, Long> perWord = words.parallelStream()
    .collect(Collectors.groupingByConcurrent(w -> w, Collectors.counting()));
System.out.println(atomic.get() + " " + counted + " " + perWord);  // 1000 1000 {a=1000}` },
      { title: 'unordered() can speed up distinct/limit in parallel', html: `<p>On an ordered parallel stream, <code>limit(n)</code> must return the <b>first</b> n in encounter order, so threads buffer and coordinate. If you only need <i>any</i> n, say so with <code>unordered()</code>.</p>${H.table(['Pipeline', 'Meaning'], [['<code>range.parallel().filter(p).limit(5)</code>', 'the first 5 matches (expensive coordination)'], ['<code>range.parallel().unordered().filter(p).limit(5)</code>', 'any 5 matches (cheaper)']])}`, code: `List<Integer> first5 = IntStream.range(0, 1_000_000).parallel()
    .filter(x -> x % 7 == 0).limit(5).boxed().toList();
System.out.println(first5);                              // [0, 7, 14, 21, 28] — guaranteed
long anyFive = IntStream.range(0, 1_000_000).parallel().unordered()
    .filter(x -> x % 7 == 0).limit(5).count();
System.out.println(anyFive);                             // 5 (which five is not specified)` },
      { title: 'The NQ rule of thumb with real numbers', html: `<p>N = elements, Q = cost per element. Parallel only pays off when N × Q is big.</p>${H.table(['Workload', 'N', 'Q', 'Parallel worth it?'], [['sum 1 000 ints', '10<sup>3</sup>', 'tiny', '<span class="c-r">No</span> — overhead dominates'], ['sum 10<sup>8</sup> ints from IntStream.range', '10<sup>8</sup>', 'tiny', '<span class="c-g">Usually yes</span>'], ['hash 10<sup>4</sup> images', '10<sup>4</sup>', 'huge', '<span class="c-g">Yes</span>'], ['call a REST API per id', 'any', 'blocking', '<span class="c-r">No</span> — use an executor / virtual threads']])}`, code: `long t0 = System.nanoTime();
long s1 = LongStream.rangeClosed(1, 50_000_000).sum();
long t1 = System.nanoTime();
long s2 = LongStream.rangeClosed(1, 50_000_000).parallel().sum();
long t2 = System.nanoTime();
System.out.println(s1 == s2);   // true
// Rough timing only — use JMH for real measurements:
System.out.println("seq ms=" + (t1 - t0) / 1_000_000 + " par ms=" + (t2 - t1) / 1_000_000);` }
    ],
    deepDive: `<p><b>🟣 How a parallel pipeline executes.</b> The terminal op creates a root <code>ForkJoinTask</code> (e.g. <code>ReduceTask</code>). Each task calls <code>spliterator.trySplit()</code> until the chunk is below a target size (roughly total size / (4 × parallelism)), forking the other half. Idle workers <b>steal</b> tasks from the tail of busy workers' deques, which balances uneven work. Leaves run the ordinary sequential sink chain; parents combine children's results (<code>combiner</code> for collect/3-arg reduce, the accumulator itself for 2-arg reduce).</p>
<p><b>Why the identity/associativity rules exist:</b> each leaf starts a fresh accumulation from the identity, and results are combined in a tree whose shape depends on splitting and core count. Only if <code>identity ⊕ x = x</code> and ⊕ is associative is the answer independent of that shape. Floating-point addition is <i>not</i> exactly associative, so parallel <code>double</code> sums can differ in the last digits between runs.</p>
<p><b>The common pool:</b> parallelism defaults to <code>Runtime.availableProcessors() − 1</code> (configurable with <code>-Djava.util.concurrent.ForkJoinPool.common.parallelism=N</code>); in containers the JVM honours CPU quotas. The calling thread also participates. Blocking inside it is harmful because the pool does not grow (except through <code>ManagedBlocker</code>), so a few blocked workers can stall unrelated code. Virtual threads (Java 21) solve <b>I/O concurrency</b>, not CPU parallelism — they are not a replacement for parallel streams, and parallel streams are not a tool for I/O.</p>
<p><b>Ordered stateful ops</b> (<code>sorted</code>, <code>distinct</code>, <code>limit</code>, <code>skip</code>) in parallel often need full buffering and extra merging; <code>sorted</code> uses a parallel merge sort (<code>Arrays.parallelSort</code>-style). <code>findFirst</code> must wait for left subtasks; <code>findAny</code> can return the first hit any thread finds. <code>Collectors.toList</code> in parallel builds per-leaf lists and concatenates them in order — correct but memory-hungry; CONCURRENT collectors like <code>groupingByConcurrent</code> share one container and skip the merge.</p>
<p><b>Context loss:</b> ThreadLocals (security context, MDC logging IDs, transactions in frameworks) are <b>not</b> propagated to worker threads, so code that "works sequentially" can fail or log without request IDs in parallel. Also: <code>parallel()</code>/<code>sequential()</code> apply to the <b>whole</b> pipeline — the last call wins; you cannot make just one stage parallel.</p>`,
    aiEra: `<p><b>What AI changes:</b> "just add <code>.parallel()</code> for speed" is a common AI suggestion. You must be the one who asks: how big is N? Is the source splittable? Is there shared state? Is it I/O? Has anyone measured?</p>
<p><b>Use AI as a partner:</b> <code>"Audit this pipeline for parallel safety: list shared mutable state, non-associative reductions, order dependencies and blocking calls"</code>; <code>"Write a JMH benchmark comparing sequential and parallel for N = 10^3, 10^5, 10^7"</code>.</p>
<p><b>Where AI goes wrong:</b> generated code that does <code>parallelStream().forEach(map::put)</code> on a HashMap, uses parallel streams to fan out HTTP calls (pool starvation), or claims a speed-up without measuring; it also wraps everything in <code>synchronized</code> blocks, which "fixes" the race and kills the parallelism.</p>
<p><b>What you must still own:</b> the NQ intuition, the identity/associativity rules, the "no shared mutable state" discipline, and knowing when to reach for <code>ExecutorService</code>, <code>CompletableFuture</code> or virtual threads instead.</p>`,
    problems: [{
      title: 'Fix the Parallel Aggregation Bug', level: 'Medium', tags: ['parallel streams', 'thread safety', 'collectors'], companies: ['Microsoft', 'JP Morgan', 'Atlassian'],
      statement: `<p>A teammate wrote this to compute, for each user ID, the total amount of their transactions, plus a grand total. It passes small tests but in production totals are sometimes wrong and occasionally it throws. Find every bug and rewrite it correctly (still parallel).</p><pre>Map&lt;String, Long&gt; perUser = new HashMap&lt;&gt;();
long[] total = {0};
txns.parallelStream().forEach(t -&gt; {
    perUser.put(t.user(), perUser.getOrDefault(t.user(), 0L) + t.amount());
    total[0] += t.amount();
});</pre>`,
      constraints: `Up to 10<sup>7</sup> transactions; amounts are positive longs; the result must be exact.`,
      example: `<p>txns: (u1, 5), (u2, 7), (u1, 3)</p><p>Expected: ${H.c('g', '{u1=8, u2=7}')}, total ${H.c('g', '15')}. Buggy version under load: e.g. {u1=3, u2=7}, total 12 — a read-modify-write was lost.</p>`,
      brute: { why: `<p>The quick "fix" is to make everything sequential or wrap the body in <code>synchronized</code>. It becomes correct but all threads queue on one lock — slower than plain sequential code. The real problem is <b>shared mutable state</b> (a non-thread-safe HashMap and a long[] cell updated with read-modify-write).</p>`, code: `record Txn(String user, long amount) {}

class LockedVersion {
    static Map<String, Long> perUser(List<Txn> txns) {
        Map<String, Long> perUser = new HashMap<>();
        Object lock = new Object();
        txns.parallelStream().forEach(t -> {
            synchronized (lock) {      // correct, but serialises everything
                perUser.merge(t.user(), t.amount(), Long::sum);
            }
        });
        return perUser;
    }
}` },
      mcq: { q: 'What is the idiomatic thread-safe way to build the per-user totals in parallel?', options: ['<code>collect(groupingByConcurrent(Txn::user, summingLong(Txn::amount)))</code> (or groupingBy)', '<code>forEach</code> into a <code>Collections.synchronizedMap</code> with get-then-put', 'Make <code>perUser</code> volatile', 'Use <code>peek</code> instead of <code>forEach</code>'], answer: 0, explain: 'Collectors give each thread its own state (or a concurrent map with atomic merges). A synchronized map still has a race in get-then-put (two separate calls), and volatile only fixes visibility of the reference, not atomicity.' },
      hints: [`<p>Hint 1: list the shared things being written: a <code>HashMap</code> (not thread-safe, can even corrupt its buckets) and <code>total[0] += …</code> (read-modify-write, not atomic).</p>`, `<p>Hint 2: replace side effects with a <b>reduction</b>: <code>groupingBy</code>/<code>groupingByConcurrent</code> with <code>summingLong</code>, and <code>mapToLong(Txn::amount).sum()</code> for the total.</p>`, `<p>Hint 3: sum is associative with identity 0, so it is parallel-safe. Edge cases: empty list → empty map and total 0; 10<sup>7</sup> items × big amounts → use long (or <code>Math.addExact</code> to detect overflow).</p>`],
      solution: {
        approach: `<p>Delete all shared mutable state. Express both results as reductions; the framework handles per-thread accumulation and merging. <code>groupingByConcurrent</code> merges into one <code>ConcurrentHashMap</code> with atomic <code>merge</code> calls; plain <code>groupingBy</code> builds per-thread maps and merges them — both are correct.</p>`,
        code: `record Txn(String user, long amount) {}

class FixedAggregation {
    static Map<String, Long> perUser(List<Txn> txns) {
        return txns.parallelStream()
                   .collect(Collectors.groupingByConcurrent(Txn::user, Collectors.summingLong(Txn::amount)));
    }

    static long total(List<Txn> txns) {
        return txns.parallelStream().mapToLong(Txn::amount).sum();   // associative, identity 0
    }

    public static void main(String[] args) {
        List<Txn> txns = List.of(new Txn("u1", 5), new Txn("u2", 7), new Txn("u1", 3));
        System.out.println(new TreeMap<>(perUser(txns)));   // {u1=8, u2=7}
        System.out.println(total(txns));                    // 15
    }
}`,
        dry: { head: ['thread', 'its chunk', 'local result', 'after merge'], rows: [
          ['T1', '(u1,5)', 'u1 += 5', '{u1=5}'],
          ['T2', '(u2,7), (u1,3)', 'u2 += 7, u1 += 3', '{u1=8, u2=7}'],
          ['total', 'mapToLong + sum', '5 | 7 + 3 = 10', '<span class="c-g">15</span>']
        ] },
        complexity: `<p>O(N) work split across P cores ≈ O(N / P) wall time plus merge cost O(distinct users). No locks held by user code.</p>`,
        followUps: ['Compute per-user totals AND the grand total in one pass with <code>teeing</code>', 'When would you switch from groupingByConcurrent to groupingBy (hint: ordered lists inside buckets)?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — Optional best practices
     ====================================================================== */
  topics.push({
    title: 'Optional Done Right: map, flatMap, orElse vs orElseGet, and the Don\'ts',
    analogy: `<p>Ordering online, you get a <b>parcel box</b> that might be <b>empty</b> (the item was out of stock). With <code>null</code>, the courier hands you <i>nothing at all</i> and you trip over the missing parcel later (NullPointerException). With <code>Optional</code>, you always get a <b>labelled box</b>: "contains a phone" or "empty". You can say "<i>if</i> there's a phone, unwrap it, <i>then</i> charge it, <i>otherwise</i> use my old one" without ever opening an empty box by mistake.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <code>Optional&lt;T&gt;</code> is a container that holds <b>either one value or nothing</b>. It was added (Java 8) mainly as a <b>return type</b> for methods that may legitimately have no answer — <code>findUserById</code>, <code>stream.findFirst()</code>, <code>stream.max()</code> — so the caller is forced to think about the "nothing" case.</p>
${H.table(['Group', 'Method', 'What it does'], [
  ['create', '<code>Optional.of(v)</code>', 'box with v; <span class="c-r">NPE if v is null</span>'],
  ['create', '<code>Optional.ofNullable(v)</code>', 'box with v, or empty if v is null'],
  ['create', '<code>Optional.empty()</code>', 'the empty box'],
  ['transform', '<code>map(f)</code>', 'apply f if present; null result → empty'],
  ['transform', '<code>flatMap(f)</code>', 'like map, but f itself returns an Optional (avoids Optional&lt;Optional&lt;T&gt;&gt;)'],
  ['transform', '<code>filter(p)</code>', 'keep the value only if p is true'],
  ['fallback', '<code>or(() -&gt; otherOptional)</code> (9)', 'try another Optional if empty'],
  ['get out', '<code>orElse(v)</code>', 'value or v — <b>v is always computed</b> (eager)'],
  ['get out', '<code>orElseGet(() -&gt; v)</code>', 'value or v — supplier runs <b>only if empty</b> (lazy)'],
  ['get out', '<code>orElseThrow()</code> (10) / <code>orElseThrow(() -&gt; ex)</code>', 'value or exception'],
  ['act', '<code>ifPresent(c)</code>, <code>ifPresentOrElse(c, r)</code> (9)', 'run code on the value / otherwise'],
  ['check', '<code>isPresent()</code>, <code>isEmpty()</code> (11)', 'booleans (try to need them rarely)'],
  ['bridge', '<code>stream()</code> (9)', '0 or 1 element stream (great with flatMap)']
])}
<p><b>🔵 The chain style</b> replaces a ladder of null checks:</p>
${H.table(['Null-check ladder', 'Optional chain'], [['<code>if (user != null) {<br>&nbsp;&nbsp;Address a = user.getAddress();<br>&nbsp;&nbsp;if (a != null &amp;&amp; a.getCity() != null)<br>&nbsp;&nbsp;&nbsp;&nbsp;return a.getCity().toUpperCase();<br>}<br>return "UNKNOWN";</code>', '<code>return Optional.ofNullable(user)<br>&nbsp;&nbsp;.map(User::getAddress)<br>&nbsp;&nbsp;.map(Address::getCity)<br>&nbsp;&nbsp;.map(String::toUpperCase)<br>&nbsp;&nbsp;.orElse("UNKNOWN");</code>']])}
<p><b>Best practices (the interview checklist):</b></p>
${H.table(['✔ Do', '✘ Don\'t'], [
  ['return <code>Optional&lt;T&gt;</code> from queries that may find nothing', 'return <code>null</code> from a method whose return type is Optional (worst of both worlds)'],
  ['use <code>orElseGet</code>/<code>orElseThrow</code> when the fallback is expensive or exceptional', 'use <code>orElse(expensiveCall())</code> — it runs even when the value is present'],
  ['use <code>map</code>/<code>flatMap</code>/<code>filter</code> chains', 'write <code>if (opt.isPresent()) { … opt.get() … }</code> — it\'s just a null check with extra steps'],
  ['use <code>orElseThrow()</code> when absence is a bug', 'call <code>get()</code> without checking (throws <code>NoSuchElementException</code>)'],
  ['return an <b>empty collection</b> for "no results"', 'return <code>Optional&lt;List&lt;T&gt;&gt;</code>'],
  ['use <code>OptionalInt</code>/<code>OptionalDouble</code> for primitives', 'use Optional as a <b>field</b>, <b>method parameter</b>, map key/value or collection element'],
  ['compare with <code>equals</code>', 'use <code>==</code> or <code>synchronized</code> on an Optional (it\'s a value-based class)']
])}`,
    clues: [
      '"the method may not find a result" / "avoid NullPointerException" → return <code>Optional&lt;T&gt;</code>',
      '"nested null checks user → address → city" → <code>ofNullable(...).map(...).map(...).orElse(...)</code>',
      '"the getter itself returns Optional" → <code>flatMap</code>, not <code>map</code>',
      '"default value is expensive / has side effects" → <code>orElseGet</code> (orElse is eager)',
      '"absence means a bug / 404" → <code>orElseThrow(() -&gt; new NotFoundException(...))</code>',
      '"should I use Optional as a field or parameter?" → no; nullable field + Optional-returning getter, or overloads',
      '"findFirst / max / min / reduce(op) return…" → Optional (empty for an empty stream)'
    ],
    code: [`record Address(String city) {}
record User(String name, Address address) {
    Optional<Address> addressOpt() { return Optional.ofNullable(address); }   // getter returning Optional
}

class OptionalBasics {
    static final Map<Integer, User> DB = Map.of(
        1, new User("Asha", new Address("Pune")),
        2, new User("Ben", null));

    static Optional<User> findUser(int id) {           // ✔ Optional as a RETURN type
        return Optional.ofNullable(DB.get(id));
    }

    static String cityOf(int id) {
        return findUser(id)
            .flatMap(User::addressOpt)                    // flatMap: getter already returns Optional
            .map(Address::city)                           // map: plain value -> wrapped automatically
            .filter(c -> !c.isBlank())
            .map(String::toUpperCase)
            .orElse("UNKNOWN");
    }

    public static void main(String[] args) {
        System.out.println(cityOf(1));   // PUNE
        System.out.println(cityOf(2));   // UNKNOWN (no address)
        System.out.println(cityOf(9));   // UNKNOWN (no user)

        // Getting the value out
        Optional<String> name = findUser(1).map(User::name);
        System.out.println(name.orElseThrow());                         // Asha
        findUser(2).ifPresentOrElse(u -> System.out.println("hi " + u.name()),
                                    () -> System.out.println("nobody"));  // hi Ben
        findUser(9).ifPresentOrElse(u -> System.out.println("hi " + u.name()),
                                    () -> System.out.println("nobody"));  // nobody

        // or(): fallback chain of Optionals (Java 9)
        Optional<User> u = findUser(9).or(() -> findUser(1));
        System.out.println(u.map(User::name).orElse("-"));              // Asha

        // Optional.of(null) is an immediate NullPointerException
        try {
            Optional.of(DB.get(42));
        } catch (NullPointerException e) {
            System.out.println("Optional.of(null) -> NPE; use ofNullable");
        }

        // Primitive optionals from primitive streams
        OptionalInt maxLen = DB.values().stream().mapToInt(x -> x.name().length()).max();
        System.out.println(maxLen.getAsInt());                          // 4
    }
}`],
    codeTitle: ['Optional as a return type, chained safely'],
    viz: [{
      title: 'An Optional chain: the box stays empty once it is empty',
      input: 'Asha Pune',
      inputLabel: 'Name City · "Ben -" = null city · "Cy _" = blank city · "-" = no user at all',
      gen: function (input) {
        var t = clean(input).split(/\s+/);
        var user = null, city = null;
        if (!(t.length === 1 && t[0] === '-')) {
          if (t.length !== 2 || !/^[A-Za-z]{1,10}$/.test(t[0]) || !/^([A-Za-z]{1,12}|-|_)$/.test(t[1])) throw new Error('Enter "Name City", "Name -" (null city), "Name _" (blank city) or "-" (no user)');
          user = t[0]; city = t[1] === '-' ? null : t[1] === '_' ? ' ' : t[1];
        }
        var code = 'String r = Optional.ofNullable(user)   // 1\n    .map(User::city)                    // 2\n    .filter(c -> !c.isBlank())          // 3\n    .map(String::toUpperCase)           // 4\n    .orElse("UNKNOWN");                 // 5';
        var frames = [], box = user === null ? null : { v: 'User[' + user + ']' }, skipped = false;
        function show(b) { return b === null ? 'Optional.empty' : 'Optional[' + b.v + ']'; }
        function F(line, narr, cls, extra) {
          var parts = [{ type: 'code', label: 'Code', lang: 'java', code: code, hl: one(line, cls || 'cur') },
            { type: 'vars', label: 'The box after this line', vals: { box: show(box) }, hl: { box: box === null ? 'bad' : 'ok' } }];
          (extra || []).forEach(function (p) { parts.push(p); });
          frames.push({ narr: narr, parts: parts });
        }
        F(1, user === null ? '<code>ofNullable(null)</code> gives the <b>empty</b> box. No exception — that is the point of ofNullable (with <code>Optional.of(null)</code> you would get an NPE right here).' : '<code>ofNullable(user)</code> wraps the user: the box contains <b>User[' + user + ']</b>.', user === null ? 'bad' : 'ok', [{ type: 'array', label: 'Input', values: [user === null ? 'user = null' : 'user = ' + user, 'city = ' + (city === null ? 'null' : city === ' ' ? '" " (blank)' : city)] }]);
        if (box === null) { skipped = true; F(2, '<code>map</code> on an empty box does <b>nothing</b> — the lambda <code>User::city</code> is not even called. Emptiness just flows down the chain.', 'done'); }
        else {
          box = city === null ? null : { v: city === ' ' ? '" "' : city };
          F(2, city === null ? '<code>map(User::city)</code> calls the getter, which returns <b>null</b>. map turns a null result into an <b>empty</b> box automatically — no NPE.' : '<code>map(User::city)</code> replaces the user with the city: box = <b>' + show(box) + '</b>.', city === null ? 'bad' : 'ok');
        }
        if (box === null) F(3, '<code>filter</code> on an empty box: skipped.', 'done');
        else if (city === ' ') { box = null; F(3, 'The city is blank, so <code>filter(c -&gt; !c.isBlank())</code> returns <b>false</b> → the box becomes <b>empty</b>.', 'bad'); }
        else F(3, '<code>filter</code>: "' + city + '" is not blank → keep it.', 'ok');
        if (box === null) F(4, '<code>map(String::toUpperCase)</code> on an empty box: skipped (toUpperCase never runs).', 'done');
        else { box = { v: city.toUpperCase() }; F(4, '<code>map(String::toUpperCase)</code> → box = <b>' + show(box) + '</b>.', 'ok'); }
        var res = box === null ? 'UNKNOWN' : box.v;
        F(5, box === null ? 'The box is empty, so <code>orElse</code> returns the fallback <b>"UNKNOWN"</b>.' : '<code>orElse</code> opens the box and returns <b>"' + res + '"</b> (the fallback is ignored).', 'sel', [out(res, 'Value of r')]);
        F(5, 'One chain, zero <code>if (x != null)</code> checks, and every way of "missing" (no user, null city, blank city) ends in the same safe fallback.', 'sel', [{ type: 'table', label: 'Try these inputs', columns: ['input', 'r'], rows: [['Asha Pune', 'PUNE'], ['Ben -', 'UNKNOWN'], ['Cy _', 'UNKNOWN'], ['-', 'UNKNOWN']], hl: {} }]);
        return frames;
      }
    }, {
      title: 'orElse is eager, orElseGet is lazy',
      input: 'present',
      inputLabel: 'present or empty',
      gen: function (input) {
        var mode = clean(input);
        if (mode !== 'present' && mode !== 'empty') throw new Error('Type present or empty');
        var p = mode === 'present';
        var code = 'static String fallback() {\n    System.out.println("computing fallback...");\n    return "guest";\n}\nOptional<String> name = ' + (p ? 'Optional.of("asha")' : 'Optional.empty()') + ';\nString a = name.orElse(fallback());\nString b = name.orElseGet(() -> fallback());';
        var printed = [];
        var st = [
          { l: 5, v: { name: p ? 'Optional[asha]' : 'Optional.empty' }, narr: 'The Optional is <b>' + (p ? 'present ("asha")' : 'empty') + '</b>.' },
          { l: 6, v: { name: p ? 'Optional[asha]' : 'Optional.empty' }, narr: 'Before <code>orElse</code> is even called, Java evaluates its <b>argument</b>: <code>fallback()</code> runs <b>always</b> — that is ordinary Java argument evaluation, not something Optional can prevent.', out: 'computing fallback...' },
          { l: 2, v: { name: p ? 'Optional[asha]' : 'Optional.empty' }, narr: 'So "computing fallback..." is printed' + (p ? ' even though the value is present and the fallback will be <span class="c-r">thrown away</span>. Imagine this was a DB query or creating a user!' : ' — here we actually need it.'), out: 'computing fallback...' },
          { l: 6, v: { a: p ? 'asha' : 'guest' }, hv: { a: 'ok' }, narr: '<code>orElse</code> returns <b>' + (p ? '"asha"' : '"guest"') + '</b>.', out: 'computing fallback...' },
          { l: 7, v: { a: p ? 'asha' : 'guest' }, narr: '<code>orElseGet</code> receives a <b>Supplier</b> (a lambda), not a value. Creating the lambda costs nothing; it is called only if the box is empty.', out: 'computing fallback...' },
          { l: 7, v: { a: p ? 'asha' : 'guest', b: p ? 'asha' : 'guest' }, hv: { b: 'ok' }, narr: p ? 'The box is present, so the supplier is <b>never called</b>: no second "computing fallback..." line. b = "asha".' : 'The box is empty, so the supplier runs: "computing fallback..." is printed a second time, b = "guest".', out: p ? 'computing fallback...' : 'computing fallback...\ncomputing fallback...' },
          { l: 6, v: { a: p ? 'asha' : 'guest', b: p ? 'asha' : 'guest' }, narr: 'Rule: <code>orElse(constant)</code> is fine for cheap constants ("", 0, a static default). For anything computed, use <code>orElseGet</code> — or <code>orElseThrow</code> for errors.', out: p ? 'computing fallback...' : 'computing fallback...\ncomputing fallback...' }
        ];
        return codeFrames(code, st);
      }
    }],
    examples: [
      { title: 'map vs flatMap with Optional', html: `<p>If the function you pass already returns an <code>Optional</code>, <code>map</code> would wrap it again.</p>${H.table(['Call', 'Type'], [['<code>user.map(User::addressOpt)</code>', 'Optional&lt;Optional&lt;Address&gt;&gt; <span class="c-r">(awkward)</span>'], ['<code>user.flatMap(User::addressOpt)</code>', 'Optional&lt;Address&gt; <span class="c-g">(flat)</span>']])}`, code: `record Profile(String nick) {
    Optional<String> nickOpt() { return Optional.ofNullable(nick); }
}
class MapVsFlatMap {
    public static void main(String[] args) {
        Optional<Profile> p = Optional.of(new Profile("zed"));
        Optional<Optional<String>> nested = p.map(Profile::nickOpt);   // box in a box
        Optional<String> flat = p.flatMap(Profile::nickOpt);          // one box
        System.out.println(nested + " vs " + flat);   // Optional[Optional[zed]] vs Optional[zed]
    }
}` },
      { title: 'orElseThrow for "must exist" lookups', html: `<p>In a REST service, a missing entity is usually a 404. <code>orElseThrow</code> turns absence into a meaningful exception in one line — much better than <code>get()</code> (generic <code>NoSuchElementException: No value present</code>).</p>`, code: `class NotFound extends RuntimeException {
    NotFound(String msg) { super(msg); }
}
class Service {
    static final Map<Long, String> ORDERS = Map.of(7L, "shipped");
    static Optional<String> find(long id) { return Optional.ofNullable(ORDERS.get(id)); }

    static String status(long id) {
        return find(id).orElseThrow(() -> new NotFound("order " + id + " not found"));
    }
    public static void main(String[] args) {
        System.out.println(status(7));            // shipped
        try {
            status(8);
        } catch (NotFound e) {
            System.out.println(e.getMessage());   // order 8 not found
        }
    }
}` },
      { title: 'Anti-pattern gallery → fixes', html: `${H.table(['Anti-pattern', 'Better'], [['<code>if (o.isPresent()) return o.get(); else return x;</code>', '<code>return o.orElse(x);</code>'], ['<code>o.isPresent() ? o.get().name() : "?"</code>', '<code>o.map(U::name).orElse("?")</code>'], ['<code>if (o.isPresent()) save(o.get());</code>', '<code>o.ifPresent(this::save);</code>'], ['<code>Optional&lt;List&lt;X&gt;&gt; findAll()</code>', '<code>List&lt;X&gt; findAll()</code> (empty list)'], ['<code>void send(Optional&lt;String&gt; cc)</code>', 'overload: <code>send()</code> and <code>send(String cc)</code>'], ['<code>private Optional&lt;String&gt; nick;</code>', '<code>private String nick;</code> + <code>Optional&lt;String&gt; nick()</code> getter']])}`, code: `Optional<String> o = Optional.of("ana");
// anti-pattern
String a = o.isPresent() ? o.get().toUpperCase() : "?";
// idiomatic
String b = o.map(String::toUpperCase).orElse("?");
System.out.println(a.equals(b));   // true` },
      { title: 'Optional in streams: findFirst, max and flatMap(Optional::stream)', html: `<p>Terminal operations that may have no answer return Optional. Combine with <code>Optional::stream</code> to collect only the present values.</p>`, code: `List<String> names = List.of("kim", "alexander", "bo");
Optional<String> longest = names.stream().max(Comparator.comparingInt(String::length));
System.out.println(longest.orElse("none"));                           // alexander
Optional<String> startsZ = names.stream().filter(s -> s.startsWith("z")).findFirst();
System.out.println(startsZ.isEmpty());                                // true
List<Optional<String>> maybe = List.of(Optional.of("a"), Optional.empty(), Optional.of("c"));
System.out.println(maybe.stream().flatMap(Optional::stream).toList()); // [a, c]` }
    ],
    deepDive: `<p><b>🟣 Design intent.</b> The Java architects describe Optional as "a limited mechanism for library method return types where there is a clear need to represent 'no result', and where using null is likely to cause errors". It is <b>not</b> a general replacement for null. That is why it is deliberately <b>not Serializable</b> (so it is awkward as a field in DTOs/entities) and why its <code>get()</code> name is now considered a mistake — Java 10 added <code>orElseThrow()</code> as the recommended, self-describing alternative.</p>
<p><b>Value-based class.</b> Optional instances have no identity guarantees: two <code>Optional.of("a")</code> may or may not be the same object; <code>Optional.empty()</code> is a singleton today but you must not rely on it. Never use <code>==</code>, <code>synchronized</code> or identity hash codes on them. Project Valhalla aims to make such classes true value classes (no header, possibly flattened), which would remove most of their allocation cost.</p>
<p><b>Cost.</b> Each <code>map</code> step may allocate a new Optional. In normal business code it's negligible and the JIT's escape analysis often scalar-replaces short-lived Optionals. In tight inner loops (millions of calls), a null check is still cheaper — measure before "optimising" either way.</p>
<p><b>Semantics details interviewers probe:</b> <code>map</code> treats a null result as empty (that's why it's safe for nullable getters). <code>Optional.of(null)</code> throws NPE immediately. <code>ifPresent</code> returns void, so it ends a chain. <code>orElse(null)</code> is allowed and is the standard bridge back to null-based APIs. <code>equals</code> compares contents; <code>Optional.empty().equals(Optional.empty())</code> is true. <code>OptionalInt</code> and friends have no <code>map</code>/<code>filter</code> — they are much more limited.</p>
<p><b>Parameters and fields:</b> an Optional parameter forces callers to wrap, still allows passing <code>null</code> (now there are three states!), and hides that overloads or a nullable parameter documented with <code>@Nullable</code> would be clearer. For fields, keep them nullable and expose an Optional getter. Frameworks: Jackson and JPA handle Optional getters fine but Optional fields poorly. Static analysis (NullAway, Checker Framework, JSpecify <code>@Nullable</code>) complements Optional at API boundaries.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools love Optional — sometimes too much. Expect generated code with Optional fields, Optional parameters, <code>Optional.ofNullable(x).isPresent()</code> as a fancy null check, and <code>orElse(repository.save(...))</code> that writes to the database even when a value exists.</p>
<p><b>Use AI as a partner:</b> <code>"Refactor these nested null checks into an Optional chain, then list any place where orElse should be orElseGet"</code>; <code>"Find Optional misuse in this PR: fields, parameters, get() without checks, Optional-returning methods that return null"</code>.</p>
<p><b>Where AI goes wrong:</b> eager <code>orElse</code> with side effects, <code>map</code> where <code>flatMap</code> is needed (Optional&lt;Optional&lt;T&gt;&gt;), returning <code>null</code> from an Optional method in error branches, and wrapping collections in Optional.</p>
<p><b>What you must still own:</b> the API-design judgement — where Optional belongs (return types), where it doesn't (fields, params, collections), and how absence should surface to callers (fallback vs exception vs empty collection).</p>`,
    problems: [{
      title: 'Replace the Null-Check Ladder', level: 'Easy', tags: ['Optional', 'map', 'flatMap', 'orElse'], companies: ['Paytm', 'ThoughtWorks'],
      statement: `<p>Given <code>Customer(String name, Account account)</code>, <code>Account(Optional&lt;Card&gt; primaryCard())</code> (a getter that returns Optional) and <code>Card(String last4)</code>, write <code>String maskedCard(Customer c)</code> returning <code>"**** " + last4</code>, or <code>"NO CARD"</code> if the customer is null, has no account, has no primary card, or the last4 is null/blank. Use an Optional chain — no explicit <code>if (x != null)</code>.</p>`,
      constraints: `Any link in the chain may be missing. The method must never throw.`,
      example: `<p>${H.table(['customer', 'output'], [['Asha → account → card 4242', '<span class="c-g">**** 4242</span>'], ['Ben → account → no card', 'NO CARD'], ['Cy → null account', 'NO CARD'], ['null', 'NO CARD']])}</p>`,
      brute: { why: `<p>The ladder of null checks works, but every new link adds another nesting level, and it's easy to forget one check (then an NPE ships). It also mixes the "happy path" with error handling.</p>`, code: `record Card(String last4) {}
record Account(Card card) { Optional<Card> primaryCard() { return Optional.ofNullable(card); } }
record Customer(String name, Account account) {}

class Ladder {
    static String maskedCard(Customer c) {
        if (c != null) {
            Account a = c.account();
            if (a != null) {
                Optional<Card> card = a.primaryCard();
                if (card.isPresent()) {
                    String l4 = card.get().last4();
                    if (l4 != null && !l4.isBlank()) return "**** " + l4;
                }
            }
        }
        return "NO CARD";
    }
}` },
      mcq: { q: 'Which step must use <code>flatMap</code> instead of <code>map</code>?', options: ['<code>Account::primaryCard</code>, because it already returns an Optional', '<code>Customer::account</code>', '<code>Card::last4</code>', 'none — map always works'], answer: 0, explain: 'map with an Optional-returning function gives Optional&lt;Optional&lt;Card&gt;&gt;. flatMap unwraps one level. Plain nullable getters use map (null → empty).' },
      hints: [`<p>Hint 1: start with <code>Optional.ofNullable(c)</code> because the customer itself may be null.</p>`, `<p>Hint 2: <code>map(Customer::account)</code> (nullable getter), <code>flatMap(Account::primaryCard)</code> (Optional getter), <code>map(Card::last4)</code>, <code>filter(s -&gt; !s.isBlank())</code>.</p>`, `<p>Hint 3: finish with <code>.map(s -&gt; "**** " + s).orElse("NO CARD")</code> — a constant fallback, so orElse is fine. Test all four "missing" cases.</p>`],
      solution: {
        approach: `<p>One linear chain. Each link either passes the value on or turns the box empty; the fallback appears once at the end.</p>`,
        code: `record Card(String last4) {}
record Account(Card card) { Optional<Card> primaryCard() { return Optional.ofNullable(card); } }
record Customer(String name, Account account) {}

class Masked {
    static String maskedCard(Customer c) {
        return Optional.ofNullable(c)
                       .map(Customer::account)          // nullable getter -> map
                       .flatMap(Account::primaryCard)   // Optional getter -> flatMap
                       .map(Card::last4)
                       .filter(s -> !s.isBlank())
                       .map(s -> "**** " + s)
                       .orElse("NO CARD");              // cheap constant: orElse is fine
    }

    public static void main(String[] args) {
        System.out.println(maskedCard(new Customer("Asha", new Account(new Card("4242"))))); // **** 4242
        System.out.println(maskedCard(new Customer("Ben", new Account(null))));             // NO CARD
        System.out.println(maskedCard(new Customer("Cy", null)));                           // NO CARD
        System.out.println(maskedCard(null));                                               // NO CARD
    }
}`,
        dry: { head: ['input', 'ofNullable', 'map account', 'flatMap card', 'map last4 + filter', 'result'], rows: [
          ['Asha', 'present', 'Account', 'Card', '"4242"', '<span class="c-g">**** 4242</span>'],
          ['Ben', 'present', 'Account', '<span class="c-r">empty</span>', 'skipped', 'NO CARD'],
          ['Cy', 'present', '<span class="c-r">empty</span> (null)', 'skipped', 'skipped', 'NO CARD'],
          ['null', '<span class="c-r">empty</span>', 'skipped', 'skipped', 'skipped', 'NO CARD']
        ] },
        complexity: `<p>O(1) time; a few short-lived Optional objects (often removed by escape analysis).</p>`,
        followUps: ['Throw a custom <code>PaymentMethodMissing</code> exception instead of returning "NO CARD"', 'Fall back to a secondary card with <code>or(() -&gt; …)</code>']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Sum of Squares of Odd Numbers', level: 'Easy', tags: ['IntStream', 'filter', 'map', 'sum'], companies: ['TCS', 'Infosys', 'Amazon'],
    statement: `<p>Given an <code>int[] nums</code>, return the sum of the squares of all <b>odd</b> numbers as a <code>long</code>. Negative numbers can be odd too.</p>`,
    constraints: `0 ≤ N ≤ 10<sup>6</sup>, |nums[i]| ≤ 10<sup>5</sup> (a square fits in long, the total may not fit in int).`,
    example: `<p>${H.arr([1, 2, 3, -5, 4], { hl: { 0: 'g', 2: 'g', 3: 'g' } })} → 1 + 9 + 25 = ${H.c('g', '35')}. Note −5 is odd: <code>-5 % 2</code> is <b>−1</b> in Java, not 1.</p>`,
    brute: { why: `<p>A plain loop is perfectly fine here (O(N)). The "brute" risk is the bug many people write: <code>x % 2 == 1</code>, which silently skips negative odd numbers, and an <code>int</code> total that overflows.</p>`, code: `long sumSqOdd(int[] nums) {
    int total = 0;                       // bug 1: int can overflow
    for (int x : nums)
        if (x % 2 == 1) total += x * x;  // bug 2: misses negative odds (-5 % 2 == -1)
    return total;
}` },
    mcq: { q: 'Which test correctly detects odd numbers including negatives?', options: ['<code>x % 2 != 0</code>', '<code>x % 2 == 1</code>', '<code>x / 2 == 1</code>', '<code>x &amp; 2</code>'], answer: 0, explain: 'In Java the remainder takes the sign of the dividend: -5 % 2 == -1. Checking "not zero" (or <code>(x &amp; 1) == 1</code>) works for all ints.' },
    hints: [`<p>Hint 1: the three English steps are "keep odd", "square", "add up" → filter, map, sum.</p>`, `<p>Hint 2: <code>Arrays.stream(nums)</code> gives an <code>IntStream</code>; switch to <code>LongStream</code> with <code>asLongStream()</code> <b>before</b> squaring so the multiplication happens in long.</p>`, `<p>Hint 3: odd test = <code>x % 2 != 0</code>. Empty array → 0 automatically.</p>`],
    solution: {
      approach: `<p>Primitive stream pipeline: filter odd, widen to long, square, sum. No boxing, no overflow.</p>`,
      code: `class SumSqOdd {
    static long sumSqOdd(int[] nums) {
        return Arrays.stream(nums)
                     .filter(x -> x % 2 != 0)     // works for negatives
                     .asLongStream()              // widen first
                     .map(x -> x * x)
                     .sum();
    }

    public static void main(String[] args) {
        System.out.println(sumSqOdd(new int[]{1, 2, 3, -5, 4}));   // 35
        System.out.println(sumSqOdd(new int[]{}));                 // 0
    }
}`,
      dry: { head: ['x', 'odd?', 'x²', 'running sum'], rows: [['1', 'yes', '1', '1'], ['2', 'no', '–', '1'], ['3', 'yes', '9', '10'], ['-5', 'yes (−1 ≠ 0)', '25', '35'], ['4', 'no', '–', '<span class="c-g">35</span>']] },
      complexity: `<p>O(N) time, O(1) extra space.</p>`,
      followUps: ['Return the sum modulo 10<sup>9</sup>+7', 'Do it in parallel — is it safe? (yes: sum is associative with identity 0)']
    }
  });

  practice.push({
    title: 'Predict the Output: Reusing a Stream', level: 'Easy', tags: ['predict output', 'single use', 'IllegalStateException'], companies: ['Oracle', 'Capgemini'],
    statement: `<p>What does this print?</p><pre>Stream&lt;String&gt; s = Stream.of("a", "b", "c");
Stream&lt;String&gt; upper = s.map(String::toUpperCase);
System.out.println(upper.toList());
System.out.println(s.count());</pre>`,
    constraints: `Java 17+. Assume no try/catch around the code.`,
    example: `<p>Clue: <code>s</code> was already "used" when <code>map</code> was called on it — linking a new stage consumes the old stream object.</p>`,
    brute: { why: `<p>The naive mental model treats a stream like a list you can read many times, predicting <code>[A, B, C]</code> then <code>3</code>. A stream is a one-shot pipeline: once a stage has been linked or a terminal op has run, that stream object is spent.</p>`, code: `class ListModel {                    // what people imagine: a re-readable collection
    public static void main(String[] args) {
        List<String> s = List.of("a", "b", "c");
        System.out.println(s.stream().map(String::toUpperCase).toList()); // [A, B, C]
        System.out.println(s.size());                                     // 3 — fine for a List
    }
}` },
    mcq: { q: 'When exactly does <code>s</code> become unusable?', options: ['As soon as <code>s.map(...)</code> is called', 'Only after <code>upper.toList()</code> runs', 'Never — count() works on any stream', 'After the JVM garbage-collects it'], answer: 0, explain: 'Calling any intermediate or terminal operation on a stream marks it "linked or consumed". The new stage <code>upper</code> owns the pipeline now; any further call on <code>s</code> throws IllegalStateException.' },
    hints: [`<p>Hint 1: a stream is not a data structure; it is a pipeline you can traverse once.</p>`, `<p>Hint 2: the first println works normally and prints <code>[A, B, C]</code>.</p>`, `<p>Hint 3: the second line throws <code>IllegalStateException: stream has already been operated upon or closed</code>. Fix: keep a <code>Supplier&lt;Stream&lt;String&gt;&gt;</code> and call <code>get()</code> for each use, or keep the List.</p>`],
    solution: {
      approach: `<p>Output:</p><pre>[A, B, C]
Exception in thread "main" java.lang.IllegalStateException: stream has already been operated upon or closed</pre><p>Use a <code>Supplier</code> (or the source collection) to create a fresh stream each time.</p>`,
      code: `class StreamReuse {
    public static void main(String[] args) {
        Stream<String> s = Stream.of("a", "b", "c");
        Stream<String> upper = s.map(String::toUpperCase);
        System.out.println(upper.toList());        // [A, B, C]
        try {
            System.out.println(s.count());         // s was already linked to map()
        } catch (IllegalStateException e) {
            System.out.println("IllegalStateException: " + e.getMessage());
        }

        // Fix: a recipe that builds a NEW stream on every call
        Supplier<Stream<String>> fresh = () -> Stream.of("a", "b", "c");
        System.out.println(fresh.get().map(String::toUpperCase).toList()); // [A, B, C]
        System.out.println(fresh.get().count());                            // 3
    }
}`,
      dry: { head: ['line', 'stream state', 'output'], rows: [['Stream.of', 's: fresh', '–'], ['s.map(...)', 's: <b>linked</b>, upper: fresh', '–'], ['upper.toList()', 'upper: consumed', '[A, B, C]'], ['s.count()', 's already linked', '<span class="c-r">IllegalStateException</span>']] },
      complexity: `<p>O(N) per traversal; creating a new stream is cheap.</p>`,
      followUps: ['Does <code>Iterable.forEach</code> have the same restriction? (no — each call makes a new iterator)', 'What does <code>stream.iterator()</code> do to the stream?']
    }
  });

  practice.push({
    title: 'Clean Name List to a Single String', level: 'Easy', tags: ['filter', 'map', 'joining'], companies: ['Zoho', 'Freshworks'],
    statement: `<p>Given a <code>List&lt;String&gt;</code> of names that may contain <code>null</code>, empty or blank entries and extra spaces, return one string: the cleaned names (trimmed, upper-case) in original order, separated by <code>", "</code> and wrapped in square brackets. If nothing is left, return <code>"[]"</code>.</p>`,
    constraints: `0 ≤ N ≤ 10<sup>5</sup>. The input list itself may contain nulls (use <code>Arrays.asList</code> to build such a list).`,
    example: `<p>Input: ["  ana ", null, "", "bo", "   "] → Output: ${H.c('g', '"[ANA, BO]"')}</p>`,
    brute: { why: `<p>A loop with a <code>StringBuilder</code> and a "first element?" flag to place commas correctly. It works but the comma logic is the classic off-by-one source; <code>Collectors.joining</code> handles separators, prefix and suffix (including the empty case) for you.</p>`, code: `String clean(List<String> names) {
    StringBuilder sb = new StringBuilder("[");
    boolean first = true;
    for (String n : names) {
        if (n == null || n.isBlank()) continue;
        if (!first) sb.append(", ");
        sb.append(n.strip().toUpperCase());
        first = false;
    }
    return sb.append("]").toString();
}` },
    mcq: { q: 'What does <code>Stream.&lt;String&gt;empty().collect(Collectors.joining(", ", "[", "]"))</code> return?', options: ['<code>"[]"</code>', '<code>""</code>', '<code>null</code>', 'It throws NoSuchElementException'], answer: 0, explain: 'joining always adds the prefix and suffix, even for zero elements.' },
    hints: [`<p>Hint 1: drop the bad entries first: <code>filter(Objects::nonNull)</code>, then <code>filter(s -&gt; !s.isBlank())</code>.</p>`, `<p>Hint 2: <code>map(String::strip)</code> then <code>map(String::toUpperCase)</code>.</p>`, `<p>Hint 3: finish with <code>Collectors.joining(", ", "[", "]")</code> — it handles the empty case.</p>`],
    solution: {
      approach: `<p>Filter out nulls and blanks, normalise each name, and let <code>joining</code> handle separators and brackets.</p>`,
      code: `class CleanNames {
    static String clean(List<String> names) {
        return names.stream()
                    .filter(Objects::nonNull)
                    .filter(s -> !s.isBlank())
                    .map(String::strip)
                    .map(String::toUpperCase)
                    .collect(Collectors.joining(", ", "[", "]"));
    }

    public static void main(String[] args) {
        System.out.println(clean(Arrays.asList("  ana ", null, "", "bo", "   ")));   // [ANA, BO]
        System.out.println(clean(Arrays.asList(null, " ")));                       // []
    }
}`,
      dry: { head: ['element', 'nonNull', 'not blank', 'strip + upper', 'joined so far'], rows: [['"  ana "', '✔', '✔', 'ANA', '[ANA'], ['null', '✘', '–', '–', '[ANA'], ['""', '✔', '✘', '–', '[ANA'], ['"bo"', '✔', '✔', 'BO', '[ANA, BO'], ['"   "', '✔', '✘', '–', '<span class="c-g">[ANA, BO]</span>']] },
      complexity: `<p>O(total characters) time; joining uses one StringBuilder internally.</p>`,
      followUps: ['Also remove duplicates while keeping the first occurrence', 'Sort case-insensitively before joining']
    }
  });

  practice.push({
    title: 'Predict the Output: Primitive Stream Traps', level: 'Easy', tags: ['predict output', 'IntStream', 'chars', 'boxing'], companies: ['Accenture', 'Wipro', 'SAP'],
    statement: `<p>What does this print, line by line?</p><pre>int[] arr = {3, 1, 2};
System.out.println(Stream.of(arr).count());
System.out.println(Arrays.stream(arr).boxed().sorted().toList());
"hi".chars().forEach(c -&gt; System.out.print(c + " "));
System.out.println();
System.out.println("hi".chars().mapToObj(c -&gt; String.valueOf((char) c)).collect(Collectors.joining("-")));
System.out.println(IntStream.range(1, 4).sum() + IntStream.rangeClosed(1, 4).sum());</pre>`,
    constraints: `Java 17+.`,
    example: `<p>Clues: generics can't hold <code>int</code>; <code>chars()</code> returns an <code>IntStream</code>; <code>range</code> excludes its end, <code>rangeClosed</code> includes it.</p>`,
    brute: { why: `<p>The "everything is a collection of letters and numbers" model predicts 3, [1, 2, 3], "h i", "h-i", 16 — and gets lines 1 and 3 wrong. <code>Stream.of(int[])</code> makes a stream of ONE array; <code>chars()</code> prints code numbers.</p>`, code: `class NaiveGuess {
    public static void main(String[] args) {
        System.out.println(3);          // guess for Stream.of(arr).count()   (wrong)
        System.out.println("[1, 2, 3]");
        System.out.println("h i ");     // guess for chars() printing          (wrong)
        System.out.println("h-i");
        System.out.println(16);
    }
}` },
    mcq: { q: 'What is the type of <code>Stream.of(arr)</code> when <code>arr</code> is an <code>int[]</code>?', options: ['<code>Stream&lt;int[]&gt;</code>', '<code>IntStream</code>', '<code>Stream&lt;Integer&gt;</code>', 'compile error'], answer: 0, explain: '<code>Stream.of(T... values)</code> needs an object array to spread. <code>int[]</code> is a single object, so T = int[] and the stream has one element.' },
    hints: [`<p>Hint 1: line 1 — how many <i>objects</i> did you pass to <code>Stream.of</code>?</p>`, `<p>Hint 2: line 3 — <code>'h'</code> is 104 and <code>'i'</code> is 105.</p>`, `<p>Hint 3: last line — range(1, 4) = 1+2+3 = 6; rangeClosed(1, 4) = 10; int + int = 16 (numbers, not string concatenation).</p>`],
    solution: {
      approach: `<p>Output:</p><pre>1
[1, 2, 3]
104 105
h-i
16</pre>`,
      code: `class PrimitiveTraps {
    public static void main(String[] args) {
        int[] arr = {3, 1, 2};
        System.out.println(Stream.of(arr).count());                         // 1
        System.out.println(Arrays.stream(arr).boxed().sorted().toList());   // [1, 2, 3]
        "hi".chars().forEach(c -> System.out.print(c + " "));              // 104 105
        System.out.println();
        System.out.println("hi".chars().mapToObj(c -> String.valueOf((char) c))
                                       .collect(Collectors.joining("-"))); // h-i
        System.out.println(IntStream.range(1, 4).sum() + IntStream.rangeClosed(1, 4).sum()); // 16
    }
}`,
      dry: { head: ['line', 'key fact', 'prints'], rows: [['1', 'Stream&lt;int[]&gt; with one element', '1'], ['2', 'Arrays.stream → IntStream → boxed', '[1, 2, 3]'], ['3', 'chars() gives ints', '104 105'], ['4', 'cast back to char', 'h-i'], ['5', '6 + 10', '16']] },
      complexity: `<p>Trivial; the point is the types.</p>`,
      followUps: ['What does <code>Stream.of(new Integer[]{3, 1, 2}).count()</code> print? (3)', 'How do you stream the emoji in "hi😀" correctly? (<code>codePoints()</code>)']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Departments Ranked by Average Salary', level: 'Medium', tags: ['groupingBy', 'averagingDouble', 'sorting entries'], companies: ['Amazon', 'Deloitte', 'Cognizant'],
    statement: `<p>Given <code>List&lt;Emp&gt;</code> where <code>Emp(String name, String dept, double salary)</code>, return a list of strings <code>"dept=avg"</code> for every department, ordered by <b>average salary descending</b>, ties broken by <b>department name ascending</b>. Format the average with one decimal place.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>6</sup>; salaries are non-negative.`,
    example: `<p>Asha Eng 120, Ben Eng 95, Chen Ops 70, Dia Sales 80, Eli Ops 75</p><p>Averages: Eng 107.5, Sales 80.0, Ops 72.5 → ${H.c('g', '[Eng=107.5, Sales=80.0, Ops=72.5]')}</p>`,
    brute: { why: `<p>Collect department names, then for each department loop over all employees again to compute its average: O(D × N). With 10<sup>6</sup> employees and 10<sup>3</sup> departments that is 10<sup>9</sup> steps. One grouping pass does it in O(N).</p>`, code: `record Emp(String name, String dept, double salary) {}

class BruteAvg {
    static List<String> ranked(List<Emp> emps) {
        Set<String> depts = new TreeSet<>();
        for (Emp e : emps) depts.add(e.dept());
        List<String> out = new ArrayList<>();
        List<double[]> avgs = new ArrayList<>();
        for (String d : depts) {                        // D passes over all N employees
            double sum = 0; int cnt = 0;
            for (Emp e : emps) if (e.dept().equals(d)) { sum += e.salary(); cnt++; }
            out.add(d);
            avgs.add(new double[]{sum / cnt});
        }
        List<Integer> idx = new ArrayList<>();
        for (int i = 0; i < out.size(); i++) idx.add(i);
        idx.sort((a, b) -> Double.compare(avgs.get(b)[0], avgs.get(a)[0]));  // stable: names stay sorted on ties
        List<String> res = new ArrayList<>();
        for (int i : idx) res.add(out.get(i) + "=" + String.format("%.1f", avgs.get(i)[0]));
        return res;
    }
}` },
    mcq: { q: 'Which downstream collector computes the per-department average directly?', options: ['<code>Collectors.averagingDouble(Emp::salary)</code>', '<code>Collectors.counting()</code>', '<code>Collectors.reducing(0.0, Double::sum)</code>', '<code>Collectors.summingDouble(Emp::salary)</code>'], answer: 0, explain: 'averagingDouble keeps a running sum and count per bucket and divides at the end (finisher). summing gives totals; counting gives counts.' },
    hints: [`<p>Hint 1: "average per department" = <code>groupingBy(Emp::dept, averagingDouble(Emp::salary))</code>.</p>`, `<p>Hint 2: stream the resulting map's <code>entrySet()</code> and sort with <code>comparingByValue</code> reversed, then <code>comparingByKey</code>.</p>`, `<p>Hint 3: format with <code>String.format("%.1f", value)</code> — note <code>%.1f</code> uses the default locale; pass <code>Locale.ROOT</code> to guarantee a dot.</p>`],
    solution: {
      approach: `<p>One pass to group and average, then sort the small entry set.</p>`,
      code: `record Emp(String name, String dept, double salary) {}

class RankedDepts {
    static List<String> ranked(List<Emp> emps) {
        Map<String, Double> avg = emps.stream()
            .collect(Collectors.groupingBy(Emp::dept, Collectors.averagingDouble(Emp::salary)));
        return avg.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed()
                             .thenComparing(Map.Entry.comparingByKey()))
            .map(e -> e.getKey() + "=" + String.format(Locale.ROOT, "%.1f", e.getValue()))
            .toList();
    }

    public static void main(String[] args) {
        System.out.println(ranked(List.of(new Emp("Asha", "Eng", 120), new Emp("Ben", "Eng", 95),
            new Emp("Chen", "Ops", 70), new Emp("Dia", "Sales", 80), new Emp("Eli", "Ops", 75))));
        // [Eng=107.5, Sales=80.0, Ops=72.5]
    }
}`,
      dry: { head: ['bucket', 'sum', 'count', 'average'], rows: [['Eng', '215', '2', '107.5'], ['Ops', '145', '2', '72.5'], ['Sales', '80', '1', '80.0'], ['sorted', '–', '–', '<span class="c-g">Eng, Sales, Ops</span>']] },
      complexity: `<p>O(N + D log D) time, O(D) space.</p>`,
      followUps: ['Only include departments with at least 3 employees (<code>collectingAndThen</code> or filter the entries using a count map)', 'Return the median instead of the average']
    }
  });

  practice.push({
    title: 'Predict the Output: orElse vs orElseGet vs or', level: 'Medium', tags: ['predict output', 'Optional', 'eager vs lazy'], companies: ['Goldman Sachs', 'Barclays'],
    statement: `<p>What does <code>main</code> print?</p><pre>static int calls = 0;
static String make(String tag) { calls++; System.out.println("make " + tag); return tag; }

Optional&lt;String&gt; a = Optional.of("A");
Optional&lt;String&gt; e = Optional.empty();
System.out.println(a.orElse(make("x")));
System.out.println(a.orElseGet(() -&gt; make("y")));
System.out.println(e.orElse(make("z")));
System.out.println(e.orElseGet(() -&gt; make("w")));
System.out.println(a.map(s -&gt; s + "!").or(() -&gt; Optional.of(make("v"))).get());
System.out.println("calls=" + calls);</pre>`,
    constraints: `Java 11+.`,
    example: `<p>Clue: a method <b>argument</b> is always evaluated before the method runs; a <b>lambda</b> argument is just an object until someone calls it.</p>`,
    brute: { why: `<p>The tempting model "the fallback only runs if needed" is true only for the Supplier-based methods. Treating <code>orElse(make("x"))</code> as lazy predicts no "make x" line and calls=2 — wrong.</p>`, code: `class WrongModel {
    public static void main(String[] args) {
        // Belief: fallbacks only run when the Optional is empty
        System.out.println("A");
        System.out.println("A");
        System.out.println("make z");
        System.out.println("z");
        System.out.println("make w");
        System.out.println("w");
        System.out.println("A!");
        System.out.println("calls=2");   // wrong: orElse(make("x")) also ran
    }
}` },
    mcq: { q: 'How many times is <code>make</code> called in total?', options: ['3 (x, z, w)', '2 (z, w)', '4 (x, y, z, w)', '5 (all of them)'], answer: 0, explain: '<code>orElse(make("x"))</code> evaluates its argument eagerly (x). The Supplier versions run only for the empty Optional (w). <code>or</code> takes a Supplier too and <code>a</code> is present, so v never runs. And z runs because e is empty — and it is eager anyway.' },
    hints: [`<p>Hint 1: Java evaluates <code>make("x")</code> before calling <code>orElse</code>, even though <code>a</code> has a value.</p>`, `<p>Hint 2: <code>orElseGet</code> and <code>or</code> take Suppliers — only invoked when the Optional is empty.</p>`, `<p>Hint 3: so "make" lines appear for x, z and w only. The order of printing: "make x" comes before the first "A".</p>`],
    solution: {
      approach: `<p>Output:</p><pre>make x
A
A
make z
z
make w
w
A!
calls=3</pre>`,
      code: `class OrElsePredict {
    static int calls = 0;

    static String make(String tag) {
        calls++;
        System.out.println("make " + tag);
        return tag;
    }

    public static void main(String[] args) {
        Optional<String> a = Optional.of("A");
        Optional<String> e = Optional.empty();
        System.out.println(a.orElse(make("x")));                // make x, A   (eager!)
        System.out.println(a.orElseGet(() -> make("y")));       // A           (lazy, not called)
        System.out.println(e.orElse(make("z")));                // make z, z
        System.out.println(e.orElseGet(() -> make("w")));       // make w, w
        System.out.println(a.map(s -> s + "!").or(() -> Optional.of(make("v"))).get()); // A!
        System.out.println("calls=" + calls);                   // calls=3
    }
}`,
      dry: { head: ['line', 'Optional', 'fallback evaluated?', 'prints'], rows: [['orElse(make x)', 'present', '<span class="c-r">yes (eager)</span>', 'make x, A'], ['orElseGet(make y)', 'present', 'no', 'A'], ['orElse(make z)', 'empty', 'yes', 'make z, z'], ['orElseGet(make w)', 'empty', 'yes', 'make w, w'], ['or(make v)', 'present', 'no', 'A!']] },
      complexity: `<p>O(1). The lesson: side effects in <code>orElse</code> arguments always happen.</p>`,
      followUps: ['Rewrite a repository call <code>findById(id).orElse(repo.save(new User()))</code> correctly', 'Is <code>orElse(null)</code> legal? When is it useful?']
    }
  });

  practice.push({
    title: 'Second Highest Distinct Salary', level: 'Medium', tags: ['distinct', 'sorted', 'skip', 'Optional'], companies: ['Amazon', 'Adobe', 'LinkedIn'],
    statement: `<p>Return the second highest <b>distinct</b> salary from a list as an <code>Optional&lt;Integer&gt;</code>. Return <code>Optional.empty()</code> if it doesn't exist. (The Java twin of the famous SQL question.)</p>`,
    constraints: `0 ≤ N ≤ 10<sup>6</sup>; salaries fit in int.`,
    example: `<p>${H.arr([100, 300, 300, 200], { hl: { 3: 'g' } })} → ${H.c('g', 'Optional[200]')} (300 is highest; the duplicate 300 must not count as "second").</p><p>[5, 5] → Optional.empty</p>`,
    brute: { why: `<p>Sorting the whole list and then picking index 1 ignores duplicates ([300, 300] → 300, wrong) and needs bounds checks. Correct manual versions track top-two variables with tricky equality cases.</p>`, code: `Optional<Integer> secondHighest(List<Integer> s) {
    List<Integer> copy = new ArrayList<>(s);
    copy.sort(Collections.reverseOrder());
    for (int i = 1; i < copy.size(); i++)
        if (!copy.get(i).equals(copy.get(0))) return Optional.of(copy.get(i));
    return Optional.empty();
}` },
    mcq: { q: 'Which pipeline returns the second highest distinct value?', options: ['<code>distinct().sorted(reverseOrder()).skip(1).findFirst()</code>', '<code>sorted(reverseOrder()).skip(1).findFirst()</code>', '<code>max(naturalOrder()).skip(1)</code>', '<code>distinct().sorted().skip(1).findFirst()</code>'], answer: 0, explain: 'Without distinct, duplicates of the max occupy the second position. Ascending sort would return the second LOWEST. max returns an Optional, which has no skip.' },
    hints: [`<p>Hint 1: remove duplicates first, then order high → low.</p>`, `<p>Hint 2: <code>skip(1)</code> drops the highest; <code>findFirst()</code> returns an Optional — empty if nothing is left.</p>`, `<p>Hint 3: for O(N) with no sorting: <code>TreeSet</code> of size ≤ 2, or two variables. The stream version is O(N log N) but clear.</p>`],
    solution: {
      approach: `<p>distinct → sort descending → skip one → findFirst. The Optional naturally represents "no second value".</p>`,
      code: `class SecondHighest {
    static Optional<Integer> secondHighest(List<Integer> salaries) {
        return salaries.stream()
                       .distinct()
                       .sorted(Comparator.reverseOrder())
                       .skip(1)
                       .findFirst();
    }

    public static void main(String[] args) {
        System.out.println(secondHighest(List.of(100, 300, 300, 200)));  // Optional[200]
        System.out.println(secondHighest(List.of(5, 5)));                // Optional.empty
        System.out.println(secondHighest(List.of()).orElse(-1));         // -1
    }
}`,
      dry: { head: ['stage', 'elements'], rows: [['source', '100 300 300 200'], ['distinct', '100 300 200'], ['sorted desc', '300 200 100'], ['skip 1', '200 100'], ['findFirst', '<span class="c-g">Optional[200]</span>']] },
      complexity: `<p>O(N log N) time, O(N) space. O(N) alternative: keep the top two distinct values in a single pass.</p>`,
      followUps: ['Generalise to the N-th highest distinct salary', 'Return the employees who earn the second highest salary']
    }
  });

  practice.push({
    title: 'First Non-Repeating Character', level: 'Medium', tags: ['chars', 'groupingBy', 'LinkedHashMap', 'Optional'], companies: ['Amazon', 'Microsoft', 'Goldman Sachs'],
    statement: `<p>Return the first character in a string that appears exactly once, as <code>Optional&lt;Character&gt;</code>. Use streams: frequencies must be collected in <b>first-seen order</b>.</p>`,
    constraints: `0 ≤ length ≤ 10<sup>5</sup>; case-sensitive ('a' ≠ 'A').`,
    example: `<p>"swiss" → counts ${H.kv([['s', 3], ['w', 1], ['i', 1]])} → first with count 1: ${H.c('g', "'w'")}</p><p>"aabb" → Optional.empty</p>`,
    brute: { why: `<p>For each position, scan the whole string to count that character: O(N²). For 10<sup>5</sup> characters that is 10<sup>10</sup> steps. Counting once (O(N)) and then scanning in order fixes it.</p>`, code: `Optional<Character> firstUnique(String s) {
    for (int i = 0; i < s.length(); i++) {
        int count = 0;
        for (int j = 0; j < s.length(); j++)        // rescans everything
            if (s.charAt(j) == s.charAt(i)) count++;
        if (count == 1) return Optional.of(s.charAt(i));
    }
    return Optional.empty();
}` },
    mcq: { q: 'Why pass <code>LinkedHashMap::new</code> to groupingBy here?', options: ['To keep keys in first-seen order so "first" is meaningful', 'To make counting faster', 'Because HashMap cannot hold Character keys', 'To sort characters alphabetically'], answer: 0, explain: 'HashMap iteration order depends on hash codes. LinkedHashMap preserves insertion order — the order characters first appeared.' },
    hints: [`<p>Hint 1: count all characters first (one pass), then find the first one with count 1.</p>`, `<p>Hint 2: <code>s.chars().mapToObj(c -&gt; (char) c)</code> then <code>groupingBy(Function.identity(), LinkedHashMap::new, counting())</code>.</p>`, `<p>Hint 3: stream the entry set, <code>filter(e -&gt; e.getValue() == 1)</code>, <code>map(Map.Entry::getKey)</code>, <code>findFirst()</code>. Empty string → empty Optional.</p>`],
    solution: {
      approach: `<p>Two passes: an ordered frequency map, then the first entry with count 1.</p>`,
      code: `class FirstUnique {
    static Optional<Character> firstUnique(String s) {
        Map<Character, Long> freq = s.chars()
            .mapToObj(c -> (char) c)
            .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()));
        return freq.entrySet().stream()
                   .filter(e -> e.getValue() == 1L)
                   .map(Map.Entry::getKey)
                   .findFirst();
    }

    public static void main(String[] args) {
        System.out.println(firstUnique("swiss"));   // Optional[w]
        System.out.println(firstUnique("aabb"));    // Optional.empty
        System.out.println(firstUnique(""));        // Optional.empty
    }
}`,
      dry: { head: ['char', 'count after pass 1'], rows: [['s', '1 → 2 → 3'], ['w', '1'], ['i', '1'], ['scan in order', 's(3) skip, <span class="c-g">w(1) → answer</span>']] },
      complexity: `<p>O(N) time, O(Σ) space where Σ = number of distinct characters.</p>`,
      followUps: ['Make it case-insensitive', 'Process an endless stream of characters and answer "first unique so far" after each one']
    }
  });

  practice.push({
    title: 'Count Primes vs Non-Primes with partitioningBy', level: 'Medium', tags: ['partitioningBy', 'IntStream', 'noneMatch'], companies: ['Infosys', 'Samsung'],
    statement: `<p>For the numbers 1..n, return a <code>Map&lt;Boolean, Long&gt;</code> where <code>true</code> maps to how many are prime and <code>false</code> to how many are not. Both keys must always be present.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>. 1 is not prime.`,
    example: `<p>n = 20 → primes 2, 3, 5, 7, 11, 13, 17, 19 → ${H.c('g', '{false=12, true=8}')}</p>`,
    brute: { why: `<p>Testing every divisor from 2 to x − 1 makes each prime test O(x), so the total is O(n²) ≈ 10<sup>10</sup> for n = 10<sup>5</sup>. Checking divisors only up to √x brings it to O(n√n) ≈ 3·10<sup>7</sup>; a sieve gives O(n log log n).</p>`, code: `Map<Boolean, Long> countPrimes(int n) {
    long p = 0, np = 0;
    for (int x = 1; x <= n; x++) {
        boolean prime = x >= 2;
        for (int d = 2; d < x && prime; d++)       // O(x) per number
            if (x % d == 0) prime = false;
        if (prime) p++; else np++;
    }
    Map<Boolean, Long> m = new HashMap<>();
    m.put(true, p);
    m.put(false, np);
    return m;
}` },
    mcq: { q: 'What does <code>partitioningBy</code> return for an empty stream?', options: ['<code>{false=[], true=[]}</code> (both keys present)', 'An empty map <code>{}</code>', '<code>null</code>', 'It throws'], answer: 0, explain: 'partitioningBy always creates both partitions. groupingBy, by contrast, only creates keys it actually sees.' },
    hints: [`<p>Hint 1: two buckets keyed by a yes/no question → <code>partitioningBy(predicate, downstream)</code>.</p>`, `<p>Hint 2: prime test with streams: <code>x &gt;= 2 &amp;&amp; IntStream.rangeClosed(2, (int) Math.sqrt(x)).noneMatch(d -&gt; x % d == 0)</code>; noneMatch short-circuits on the first divisor.</p>`, `<p>Hint 3: <code>IntStream.rangeClosed(1, n).boxed().collect(partitioningBy(Primes::isPrime, counting()))</code>.</p>`],
    solution: {
      approach: `<p>√x trial division expressed with <code>noneMatch</code> (short-circuits), then <code>partitioningBy</code> with <code>counting()</code>.</p>`,
      code: `class PrimeSplit {
    static boolean isPrime(int x) {
        return x >= 2 && IntStream.rangeClosed(2, (int) Math.sqrt(x)).noneMatch(d -> x % d == 0);
    }

    static Map<Boolean, Long> countPrimes(int n) {
        return IntStream.rangeClosed(1, n).boxed()
                        .collect(Collectors.partitioningBy(PrimeSplit::isPrime, Collectors.counting()));
    }

    public static void main(String[] args) {
        System.out.println(countPrimes(20));    // {false=12, true=8}
        System.out.println(countPrimes(1));     // {false=1, true=0}
    }
}`,
      dry: { head: ['x', 'divisors checked', 'prime?'], rows: [['1', '–', 'no (x &lt; 2)'], ['2', 'range(2..1) empty', 'yes'], ['9', '2, 3 → 3 divides', 'no'], ['19', '2, 3, 4', 'yes'], ['total', '–', '<span class="c-g">true=8, false=12</span>']] },
      complexity: `<p>O(n√n) time, O(1) extra besides boxing. Sieve of Eratosthenes: O(n log log n) time, O(n) space.</p>`,
      followUps: ['Return the primes themselves for the true bucket (<code>partitioningBy(isPrime)</code> with default toList)', 'Use a sieve with <code>BitSet</code> and stream its set bits (<code>bitSet.stream()</code>)']
    }
  });

  practice.push({
    title: 'Group Anagrams', level: 'Medium', tags: ['groupingBy', 'String keys', 'LinkedHashMap'], companies: ['Amazon', 'Facebook', 'Uber'],
    statement: `<p>Group words that are anagrams of each other (same letters, different order). Return the groups in the order their first word appears; inside each group keep the input order. (LeetCode 49.)</p>`,
    constraints: `1 ≤ N ≤ 10<sup>4</sup>, word length ≤ 100, lowercase letters.`,
    example: `<p>["eat","tea","tan","ate","nat","bat"] → ${H.c('g', '[[eat, tea, ate], [tan, nat], [bat]]')}</p><p>The key for each word is its letters sorted: eat → "aet", tan → "ant", bat → "abt".</p>`,
    brute: { why: `<p>Compare every pair of words by sorting both and checking equality: O(N² · L log L). With 10<sup>4</sup> words that's 10<sup>8</sup> comparisons, each sorting strings. A canonical key per word turns it into one grouping pass.</p>`, code: `List<List<String>> groupAnagrams(String[] words) {
    List<List<String>> groups = new ArrayList<>();
    boolean[] used = new boolean[words.length];
    for (int i = 0; i < words.length; i++) {
        if (used[i]) continue;
        List<String> g = new ArrayList<>(List.of(words[i]));
        char[] a = words[i].toCharArray(); Arrays.sort(a);
        for (int j = i + 1; j < words.length; j++) {
            char[] b = words[j].toCharArray(); Arrays.sort(b);   // re-sorted again and again
            if (!used[j] && Arrays.equals(a, b)) { g.add(words[j]); used[j] = true; }
        }
        groups.add(g);
    }
    return groups;
}` },
    mcq: { q: 'What makes a good grouping key for anagrams?', options: ['The word\'s letters sorted, e.g. "eat" → "aet"', 'The word\'s length', 'The word\'s first letter', 'The word\'s hashCode'], answer: 0, explain: 'Anagrams contain exactly the same letters, so their sorted letters are identical. Length and first letter collide with non-anagrams; hashCode of the original word differs between anagrams.' },
    hints: [`<p>Hint 1: give each word a canonical "signature" that is equal for all its anagrams.</p>`, `<p>Hint 2: signature = sorted characters: <code>char[] c = w.toCharArray(); Arrays.sort(c); new String(c)</code>.</p>`, `<p>Hint 3: <code>groupingBy(Anagrams::key, LinkedHashMap::new, toList())</code> then <code>new ArrayList&lt;&gt;(map.values())</code>. For long words a 26-count key is O(L) instead of O(L log L).</p>`],
    solution: {
      approach: `<p>One pass: compute a signature per word and bucket by it, keeping first-seen order with LinkedHashMap.</p>`,
      code: `class Anagrams {
    static String key(String w) {
        char[] c = w.toCharArray();
        Arrays.sort(c);
        return new String(c);
    }

    static List<List<String>> groupAnagrams(String[] words) {
        Map<String, List<String>> groups = Arrays.stream(words)
            .collect(Collectors.groupingBy(Anagrams::key, LinkedHashMap::new, Collectors.toList()));
        return new ArrayList<>(groups.values());
    }

    public static void main(String[] args) {
        System.out.println(groupAnagrams(new String[]{"eat", "tea", "tan", "ate", "nat", "bat"}));
        // [[eat, tea, ate], [tan, nat], [bat]]
    }
}`,
      dry: { head: ['word', 'key', 'buckets after'], rows: [['eat', 'aet', '{aet=[eat]}'], ['tea', 'aet', '{aet=[eat, tea]}'], ['tan', 'ant', '{aet=[eat, tea], ant=[tan]}'], ['ate', 'aet', '{aet=[eat, tea, ate], ant=[tan]}'], ['nat', 'ant', '… ant=[tan, nat]'], ['bat', 'abt', '<span class="c-g">… abt=[bat]</span>']] },
      complexity: `<p>O(N · L log L) time, O(N · L) space.</p>`,
      followUps: ['Return only groups with at least 2 words', 'Use a frequency-count key to get O(N · L)']
    }
  });

  practice.push({
    title: 'Moving Averages Over a Price Series', level: 'Medium', tags: ['IntStream.range', 'prefix sums', 'mapToObj'], companies: ['Zerodha', 'Citadel', 'Bloomberg'],
    statement: `<p>Given daily <code>int[] prices</code> and a window size <code>k</code>, return the list of averages of every contiguous window of size k (as <code>List&lt;Double&gt;</code>), in order. Use an index stream — no explicit loop for the output.</p>`,
    constraints: `1 ≤ k ≤ N ≤ 10<sup>6</sup>; prices ≤ 10<sup>6</sup> (window sums need long).`,
    example: `<p>prices ${H.arr([1, 3, 5, 7, 9])}, k = 3 → windows [1,3,5], [3,5,7], [5,7,9] → ${H.c('g', '[3.0, 5.0, 7.0]')}</p>`,
    brute: { why: `<p>For each of the N − k + 1 windows, sum k elements: O(N·k). With N = 10<sup>6</sup> and k = 10<sup>5</sup> that is ~10<sup>11</sup> additions. A prefix-sum array answers each window in O(1).</p>`, code: `List<Double> movingAvg(int[] p, int k) {
    return IntStream.rangeClosed(0, p.length - k)
                    .mapToObj(i -> Arrays.stream(p, i, i + k).asLongStream().sum() / (double) k) // O(k) per window
                    .toList();
}` },
    mcq: { q: 'With prefix sums <code>pre[i] = p[0] + … + p[i-1]</code>, the sum of window starting at i is…', options: ['<code>pre[i + k] - pre[i]</code>', '<code>pre[i + k - 1] - pre[i]</code>', '<code>pre[k] - pre[i]</code>', '<code>pre[i] - pre[i - k]</code> for every i ≥ 0'], answer: 0, explain: 'pre has N + 1 entries with pre[0] = 0, so elements i..i+k−1 sum to pre[i+k] − pre[i].' },
    hints: [`<p>Hint 1: recomputing every window repeats almost all the work of the previous window.</p>`, `<p>Hint 2: build <code>long[] pre</code> of size N + 1 (a simple loop, or <code>Arrays.parallelPrefix</code> on a copy). Each window sum is a subtraction.</p>`, `<p>Hint 3: <code>IntStream.rangeClosed(0, n - k).mapToObj(i -&gt; (pre[i + k] - pre[i]) / (double) k).toList()</code>. Divide as double, not int.</p>`],
    solution: {
      approach: `<p>Prefix sums turn every window sum into O(1); an index stream produces the outputs in order.</p>`,
      code: `class MovingAverage {
    static List<Double> movingAvg(int[] p, int k) {
        int n = p.length;
        long[] pre = new long[n + 1];
        for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + p[i];      // prefix sums in long
        return IntStream.rangeClosed(0, n - k)
                        .mapToObj(i -> (pre[i + k] - pre[i]) / (double) k)
                        .toList();
    }

    public static void main(String[] args) {
        System.out.println(movingAvg(new int[]{1, 3, 5, 7, 9}, 3));   // [3.0, 5.0, 7.0]
        System.out.println(movingAvg(new int[]{4}, 1));               // [4.0]
    }
}`,
      dry: { head: ['i', 'pre[i]', 'window', 'pre[i+3] − pre[i]', 'avg'], rows: [['0', '0', '[1,3,5]', '9 − 0 = 9', '3.0'], ['1', '1', '[3,5,7]', '16 − 1 = 15', '5.0'], ['2', '4', '[5,7,9]', '25 − 4 = 21', '<span class="c-g">7.0</span>']] },
      complexity: `<p>O(N) time, O(N) extra space for the prefix array.</p>`,
      followUps: ['Return an exponential moving average instead (needs sequential state — is a stream still a good fit?)', 'Handle a live feed of prices with a fixed-size ArrayDeque']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Predict the Output: flatMap + distinct + sorted + limit with peeks', level: 'Hard', tags: ['predict output', 'lazy evaluation', 'barrier', 'short-circuit'], companies: ['Morgan Stanley', 'Oracle', 'Google'],
    statement: `<p>What does this print, in exact order?</p><pre>List&lt;List&lt;String&gt;&gt; data = List.of(List.of("b", "a"), List.of("c", "a"), List.of("d"));
String r = data.stream()
    .peek(l -&gt; System.out.println("list " + l))
    .flatMap(List::stream)
    .peek(x -&gt; System.out.println("item " + x))
    .distinct()
    .sorted()
    .peek(x -&gt; System.out.println("sorted " + x))
    .limit(2)
    .collect(Collectors.joining(","));
System.out.println(r);</pre>`,
    constraints: `Sequential stream, Java 17+.`,
    example: `<p>Clues: <code>sorted</code> is a barrier — nothing passes it until upstream is exhausted; <code>limit(2)</code> stops the sorted buffer from releasing more; the duplicate "a" is still <i>seen</i> by the peek before <code>distinct</code>.</p>`,
    brute: { why: `<p>Two wrong models are common: (1) fully horizontal — all "list" lines, then all "item" lines, then all "sorted" lines for every element (4 of them); (2) fully vertical ignoring the barrier — "list [b, a]", "item b", "sorted b"… Both miss that the barrier collects everything first and that limit cancels the release after 2.</p>`, code: `class HorizontalGuess {
    public static void main(String[] args) {
        for (String l : List.of("[b, a]", "[c, a]", "[d]")) System.out.println("list " + l);
        for (String x : List.of("b", "a", "c", "a", "d")) System.out.println("item " + x);
        for (String x : List.of("a", "b", "c", "d")) System.out.println("sorted " + x);  // wrong: c and d never pass
        System.out.println("a,b");
    }
}` },
    mcq: { q: 'How many "sorted …" lines are printed?', options: ['2', '4', '5', '0'], answer: 0, explain: 'sorted releases elements one at a time and checks downstream cancellation before each. After "b" passes limit(2), the quota is full, so "c" and "d" are never released — and never peeked.' },
    hints: [`<p>Hint 1: upstream of <code>sorted</code> runs vertically for every element: each list is peeked, flattened, each item peeked, then distinct either drops it or lets it into sorted's buffer.</p>`, `<p>Hint 2: after the source is exhausted, sorted's buffer is [a, b, c, d] (one "a" was dropped by distinct, but "item a" was printed twice).</p>`, `<p>Hint 3: sorted releases "a" (peek, limit 1/2), "b" (peek, limit 2/2 → cancel) and stops. Result "a,b".</p>`],
    solution: {
      approach: `<p>Output:</p><pre>list [b, a]
item b
item a
list [c, a]
item c
item a
list [d]
item d
sorted a
sorted b
a,b</pre>`,
      code: `class BarrierPredict {
    public static void main(String[] args) {
        List<List<String>> data = List.of(List.of("b", "a"), List.of("c", "a"), List.of("d"));
        String r = data.stream()
            .peek(l -> System.out.println("list " + l))
            .flatMap(List::stream)
            .peek(x -> System.out.println("item " + x))
            .distinct()
            .sorted()
            .peek(x -> System.out.println("sorted " + x))
            .limit(2)
            .collect(Collectors.joining(","));
        System.out.println(r);
    }
}`,
      dry: { head: ['phase', 'event', 'distinct set', 'sorted buffer'], rows: [
        ['upstream', 'list [b, a] → item b', '{b}', '[b]'],
        ['upstream', 'item a', '{b, a}', '[b, a]'],
        ['upstream', 'list [c, a] → item c', '{b, a, c}', '[b, a, c]'],
        ['upstream', 'item a (duplicate, dropped)', '{b, a, c}', '[b, a, c]'],
        ['upstream', 'list [d] → item d', '{b, a, c, d}', '[b, a, c, d]'],
        ['end()', 'sort → [a, b, c, d]', '–', 'release a → sorted a (1/2)'],
        ['end()', 'release b → sorted b (2/2)', '–', '<span class="c-y">cancel: c, d never released</span>']
      ] },
      complexity: `<p>All 5 items flow to the barrier (O(N log N) sort), only 2 leave it.</p>`,
      followUps: ['What prints if <code>sorted()</code> is removed?', 'What if <code>limit(2)</code> moves before <code>distinct()</code>?']
    }
  });

  practice.push({
    title: 'Write a Custom Top-K Collector', level: 'Hard', tags: ['Collector.of', 'PriorityQueue', 'generics', 'parallel-safe'], companies: ['Google', 'Netflix', 'Uber'],
    statement: `<p>Implement <code>static &lt;T&gt; Collector&lt;T, ?, List&lt;T&gt;&gt; topK(int k, Comparator&lt;? super T&gt; cmp)</code> that collects the <b>k largest</b> elements (by <code>cmp</code>) in descending order, using <b>O(k)</b> memory — not by sorting the whole stream. It must work correctly with parallel streams.</p>`,
    constraints: `1 ≤ k ≤ 10<sup>4</sup>, stream size up to 10<sup>8</sup>.`,
    example: `<p><code>Stream.of(5, 1, 9, 3, 7, 9).collect(topK(3, Comparator.naturalOrder()))</code> → ${H.c('g', '[9, 9, 7]')}</p><p><code>Stream.of("pear", "fig", "banana").collect(topK(2, comparingInt(String::length)))</code> → [banana, pear]</p>`,
    brute: { why: `<p><code>sorted(cmp.reversed()).limit(k)</code> is correct and short, but <code>sorted</code> buffers <b>all</b> N elements: O(N) memory and O(N log N) time. For 10<sup>8</sup> elements and k = 10 that's gigabytes for 10 results.</p>`, code: `class SortAll {
    static <T> List<T> topK(Stream<T> s, int k, Comparator<? super T> cmp) {
        Comparator<T> desc = (a, b) -> cmp.compare(b, a);
        return s.sorted(desc).limit(k).toList();      // buffers every element
    }
}` },
    mcq: { q: 'Which heap keeps the k LARGEST elements in O(k) memory?', options: ['A min-heap of size k: when it exceeds k, remove the smallest', 'A max-heap of all elements', 'A min-heap of all elements', 'A max-heap of size k: remove the largest when full'], answer: 0, explain: 'The min-heap root is the weakest of the current top k; any new element bigger than it replaces it. Removing the largest would throw away the best candidates.' },
    hints: [`<p>Hint 1: the container (A) is a <code>PriorityQueue&lt;T&gt;</code> ordered by <code>cmp</code> (a min-heap w.r.t. cmp).</p>`, `<p>Hint 2: accumulator: <code>offer</code>, then <code>poll</code> if size &gt; k. Combiner (parallel): pour the smaller heap into the other with the same trimming. Finisher: drain into a list and sort descending.</p>`, `<p>Hint 3: <code>Collector.of(supplier, accumulator, combiner, finisher)</code>. Validate k ≥ 1. The finisher sorts only k items: O(k log k).</p>`],
    solution: {
      approach: `<p>Bounded min-heap per thread. Each element costs O(log k); merging two heaps costs O(k log k); the final sort O(k log k). Memory O(k) per thread.</p>`,
      code: `class TopK {
    static <T> Collector<T, ?, List<T>> topK(int k, Comparator<? super T> cmp) {
        if (k < 1) throw new IllegalArgumentException("k must be >= 1");
        return Collector.<T, PriorityQueue<T>, List<T>>of(
            () -> new PriorityQueue<T>(cmp),                  // min-heap by cmp
            (heap, x) -> {                                    // accumulator
                heap.offer(x);
                if (heap.size() > k) heap.poll();             // drop the weakest
            },
            (h1, h2) -> {                                     // combiner (parallel)
                for (T x : h2) {
                    h1.offer(x);
                    if (h1.size() > k) h1.poll();
                }
                return h1;
            },
            heap -> {                                         // finisher
                List<T> out = new ArrayList<>(heap);
                out.sort(cmp.reversed());
                return out;
            });
    }

    public static void main(String[] args) {
        System.out.println(Stream.of(5, 1, 9, 3, 7, 9).collect(topK(3, Comparator.<Integer>naturalOrder())));  // [9, 9, 7]
        System.out.println(Stream.of("pear", "fig", "banana").collect(topK(2, Comparator.comparingInt(String::length)))); // [banana, pear]
        System.out.println(IntStream.rangeClosed(1, 1_000_000).boxed().parallel()
                                    .collect(topK(3, Comparator.<Integer>naturalOrder())));                 // [1000000, 999999, 999998]
    }
}`,
      dry: { head: ['element', 'heap after offer', 'size &gt; 3?', 'heap after poll'], rows: [['5', '[5]', 'no', '[5]'], ['1', '[1, 5]', 'no', '[1, 5]'], ['9', '[1, 5, 9]', 'no', '[1, 5, 9]'], ['3', '[1, 3, 5, 9]', 'yes', '[3, 5, 9]'], ['7', '[3, 5, 7, 9]', 'yes', '[5, 7, 9]'], ['9', '[5, 7, 9, 9]', 'yes', '[7, 9, 9]'], ['finish', 'sort desc', '–', '<span class="c-g">[9, 9, 7]</span>']] },
      complexity: `<p>O(N log k) time, O(k) space per thread (+ O(P·k log k) to combine P partial heaps).</p>`,
      followUps: ['Make ties deterministic (e.g. by insertion order) — what extra state do you need?', 'Return a <code>Collector</code> that yields both top-k and bottom-k using <code>teeing</code>']
    }
  });

  practice.push({
    title: 'Build Your Own Lazy Stream', level: 'Hard', tags: ['laziness', 'iterators', 'generics', 'design'], companies: ['Google', 'Atlassian', 'JetBrains'],
    statement: `<p>Implement a tiny lazy pipeline class <code>Lazy&lt;T&gt;</code> with <code>of(Iterable)</code>, <code>iterate(seed, next)</code>, <code>map</code>, <code>filter</code>, <code>limit</code> and a terminal <code>toList()</code>. Requirements: (1) nothing runs until <code>toList()</code>; (2) elements are processed one at a time; (3) an infinite source followed by <code>limit</code> must terminate; (4) a pipeline can be run more than once (each run starts fresh). Prove laziness by counting how many times the mapper runs.</p>`,
    constraints: `No java.util.stream inside the implementation. Generic and type-safe.`,
    example: `<p><code>Lazy.iterate(1, x -&gt; x + 1).map(square).filter(even).limit(3).toList()</code> → ${H.c('g', '[4, 16, 36]')} with the mapper called exactly <b>6</b> times (for 1..6).</p>`,
    brute: { why: `<p>An eager design where each operation immediately builds a new <code>ArrayList</code> is simple, but <code>map</code> on an infinite source never returns, and every stage materialises a full intermediate list (O(N) memory per stage). Laziness requires each stage to wrap the previous stage's <b>iterator</b> instead.</p>`, code: `class EagerList<T> {
    final List<T> items;
    EagerList(List<T> items) { this.items = items; }

    <R> EagerList<R> map(Function<? super T, ? extends R> f) {
        List<R> out = new ArrayList<>();
        for (T t : items) out.add(f.apply(t));          // runs NOW over everything
        return new EagerList<>(out);
    }

    EagerList<T> filter(Predicate<? super T> p) {
        List<T> out = new ArrayList<>();
        for (T t : items) if (p.test(t)) out.add(t);
        return new EagerList<>(out);
    }

    EagerList<T> limit(int n) { return new EagerList<>(new ArrayList<>(items.subList(0, Math.min(n, items.size())))); }
}` },
    mcq: { q: 'Why does <code>Lazy</code> store a <code>Supplier&lt;Iterator&lt;T&gt;&gt;</code> instead of an <code>Iterator&lt;T&gt;</code>?', options: ['So each terminal run gets a fresh iterator chain (re-runnable, no shared state)', 'Because iterators cannot be generic', 'To make it thread-safe automatically', 'Suppliers are faster than iterators'], answer: 0, explain: 'An Iterator is single-use. Storing a recipe that builds a new iterator chain on demand keeps the pipeline lazy AND re-runnable — Java streams chose single-use instead.' },
    hints: [`<p>Hint 1: each stage = "given the upstream iterator, return a new iterator that does my job on demand". Nothing happens until someone calls <code>hasNext()/next()</code>.</p>`, `<p>Hint 2: <code>filter</code>'s <code>hasNext()</code> must look ahead: pull from upstream until a match is found and buffer it. <code>limit</code>'s <code>hasNext()</code> must check its counter <b>before</b> asking upstream (otherwise it pulls one extra element from an infinite source).</p>`, `<p>Hint 3: keep a <code>Supplier&lt;Iterator&lt;T&gt;&gt;</code> per stage; <code>toList()</code> calls <code>get()</code> once and drains the iterator.</p>`],
    solution: {
      approach: `<p>Pull-based laziness with iterator decorators. Each operator returns a new <code>Lazy</code> holding a recipe that wraps the upstream iterator. The terminal operation builds the chain and drains it, so elements are pulled one at a time through every stage — the same observable behaviour as Java's push-based Sink chain.</p>`,
      code: `final class Lazy<T> {
    private final Supplier<Iterator<T>> src;
    private Lazy(Supplier<Iterator<T>> src) { this.src = src; }

    static <T> Lazy<T> of(Iterable<T> items) { return new Lazy<>(items::iterator); }

    static <T> Lazy<T> iterate(T seed, UnaryOperator<T> next) {
        return new Lazy<>(() -> new Iterator<T>() {
            T cur = seed;
            public boolean hasNext() { return true; }           // infinite
            public T next() { T r = cur; cur = next.apply(cur); return r; }
        });
    }

    <R> Lazy<R> map(Function<? super T, ? extends R> f) {
        return new Lazy<>(() -> {
            Iterator<T> up = src.get();
            return new Iterator<R>() {
                public boolean hasNext() { return up.hasNext(); }
                public R next() { return f.apply(up.next()); }  // runs only when pulled
            };
        });
    }

    Lazy<T> filter(Predicate<? super T> p) {
        return new Lazy<>(() -> {
            Iterator<T> up = src.get();
            return new Iterator<T>() {
                T buffered;
                boolean ready;
                public boolean hasNext() {
                    while (!ready && up.hasNext()) {             // look ahead for the next match
                        T x = up.next();
                        if (p.test(x)) { buffered = x; ready = true; }
                    }
                    return ready;
                }
                public T next() {
                    if (!hasNext()) throw new NoSuchElementException();
                    ready = false;
                    return buffered;
                }
            };
        });
    }

    Lazy<T> limit(long n) {
        return new Lazy<>(() -> {
            Iterator<T> up = src.get();
            return new Iterator<T>() {
                long left = n;
                public boolean hasNext() { return left > 0 && up.hasNext(); } // check quota FIRST
                public T next() {
                    if (!hasNext()) throw new NoSuchElementException();
                    left--;
                    return up.next();
                }
            };
        });
    }

    List<T> toList() {                                           // terminal: builds and drains the chain
        List<T> out = new ArrayList<>();
        Iterator<T> it = src.get();
        while (it.hasNext()) out.add(it.next());
        return out;
    }
}

class LazyDemo2 {
    static int mapperCalls = 0;

    public static void main(String[] args) {
        Lazy<Integer> pipeline = Lazy.iterate(1, x -> x + 1)
            .map(x -> { mapperCalls++; return x * x; })
            .filter(x -> x % 2 == 0)
            .limit(3);
        System.out.println("built, mapper calls = " + mapperCalls);   // 0  (nothing ran)
        System.out.println(pipeline.toList());                        // [4, 16, 36]
        System.out.println("mapper calls = " + mapperCalls);          // 6
        System.out.println(pipeline.toList());                        // [4, 16, 36] again (re-runnable)
        System.out.println(Lazy.of(List.of("a", "bb", "ccc")).map(String::length).toList()); // [1, 2, 3]
    }
}`,
      dry: { head: ['pull #', 'iterate gives', 'map (x²)', 'filter even', 'limit left'], rows: [['1', '1', '1', '✘', '3'], ['2', '2', '4', '✔ emit', '2'], ['3', '3', '9', '✘', '2'], ['4', '4', '16', '✔ emit', '1'], ['5', '5', '25', '✘', '1'], ['6', '6', '36', '✔ emit', '0 → stop']] },
      complexity: `<p>Each element costs O(1) per stage; memory O(1) per stage (no intermediate lists). Total work is proportional to elements actually pulled.</p>`,
      followUps: ['Add <code>flatMap</code> (hint: keep a "current inner iterator")', 'Add <code>sorted()</code> — why must it buffer everything, and how does that break infinite sources?']
    }
  });

  practice.push({
    title: 'Two-Level Sales Report with Nested groupingBy', level: 'Hard', tags: ['nested groupingBy', 'summingDouble', 'TreeMap', 'formatting'], companies: ['Walmart', 'Swiggy', 'Salesforce'],
    statement: `<p>Given <code>List&lt;Sale&gt;</code> with <code>Sale(String city, String category, double amount)</code>, produce one line per city (cities sorted A→Z): <code>"City: cat1=total1, cat2=total2 | top=catX"</code>, where categories inside a city are sorted A→Z, totals use one decimal, and <code>top</code> is the category with the highest total (ties → alphabetically first). Do it with streams/collectors.</p>`,
    constraints: `Up to 10<sup>6</sup> sales, ≤ 10<sup>3</sup> cities, ≤ 50 categories per city.`,
    example: `<p>Sales: (Pune, food, 20), (Pune, toys, 12.5), (Delhi, food, 5), (Pune, food, 10), (Delhi, books, 8)</p><p>Output:</p><pre>Delhi: books=8.0, food=5.0 | top=books
Pune: food=30.0, toys=12.5 | top=food</pre>`,
    brute: { why: `<p>Manual nested maps with <code>computeIfAbsent</code> and <code>merge</code> work in O(N), but the code mixes aggregation, sorting and formatting, and it's easy to forget sorted maps or tie-breaking. Re-scanning all sales per (city, category) pair would be O(N · C · K).</p>`, code: `record Sale(String city, String category, double amount) {}

class ManualReport {
    static List<String> report(List<Sale> sales) {
        Map<String, Map<String, Double>> m = new TreeMap<>();
        for (Sale s : sales)
            m.computeIfAbsent(s.city(), c -> new TreeMap<>()).merge(s.category(), s.amount(), Double::sum);
        List<String> out = new ArrayList<>();
        for (Map.Entry<String, Map<String, Double>> e : m.entrySet()) {
            StringBuilder sb = new StringBuilder(e.getKey() + ": ");
            String top = null; double best = -1;
            boolean first = true;
            for (Map.Entry<String, Double> c : e.getValue().entrySet()) {
                if (!first) sb.append(", ");
                sb.append(c.getKey()).append('=').append(String.format(Locale.ROOT, "%.1f", c.getValue()));
                if (c.getValue() > best) { best = c.getValue(); top = c.getKey(); }   // ties keep alphabetical first
                first = false;
            }
            out.add(sb.append(" | top=").append(top).toString());
        }
        return out;
    }
}` },
    mcq: { q: 'Which collector builds <code>Map&lt;String, Map&lt;String, Double&gt;&gt;</code> with BOTH levels sorted by key?', options: ['<code>groupingBy(Sale::city, TreeMap::new, groupingBy(Sale::category, TreeMap::new, summingDouble(Sale::amount)))</code>', '<code>groupingBy(Sale::city, groupingBy(Sale::category, summingDouble(Sale::amount)))</code>', '<code>toMap(Sale::city, Sale::amount, Double::sum)</code>', '<code>partitioningBy(Sale::city, summingDouble(Sale::amount))</code>'], answer: 0, explain: 'Nested groupingBy gives the two levels; passing TreeMap::new at each level sorts keys. The plain version uses HashMaps (unordered). toMap loses the category level; partitioningBy needs a boolean predicate.' },
    hints: [`<p>Hint 1: two-level aggregation = a <code>groupingBy</code> whose downstream is another <code>groupingBy</code>, finishing with <code>summingDouble</code>.</p>`, `<p>Hint 2: pass <code>TreeMap::new</code> at both levels so iteration is already sorted.</p>`, `<p>Hint 3: per city, join <code>key=value</code> pairs with <code>joining(", ")</code>; pick the top with <code>entrySet().stream().max(...)</code>. Make the tie-break explicit: <code>comparingByValue().thenComparing(comparingByKey(reverseOrder()))</code> so the alphabetically-first category wins a tie (max picks the greatest, and a reversed key order makes "a" greater than "b").</p>`],
    solution: {
      approach: `<p>Aggregate with nested sorted groupingBy, then format each city with two small streams: one joining the category totals, one choosing the top category with an explicit tie-break.</p>`,
      code: `record Sale(String city, String category, double amount) {}

class SalesReport {
    static List<String> report(List<Sale> sales) {
        Map<String, Map<String, Double>> byCity = sales.stream()
            .collect(Collectors.groupingBy(Sale::city, TreeMap::new,
                     Collectors.groupingBy(Sale::category, TreeMap::new,
                                           Collectors.summingDouble(Sale::amount))));

        Comparator<Map.Entry<String, Double>> bestFirst =
            Map.Entry.<String, Double>comparingByValue()
                     .thenComparing(Map.Entry.comparingByKey(Comparator.reverseOrder())); // tie -> A..Z wins

        return byCity.entrySet().stream()
            .map(city -> {
                String cats = city.getValue().entrySet().stream()
                    .map(c -> c.getKey() + "=" + String.format(Locale.ROOT, "%.1f", c.getValue()))
                    .collect(Collectors.joining(", "));
                String top = city.getValue().entrySet().stream()
                    .max(bestFirst).map(Map.Entry::getKey).orElse("-");
                return city.getKey() + ": " + cats + " | top=" + top;
            })
            .toList();
    }

    public static void main(String[] args) {
        report(List.of(new Sale("Pune", "food", 20), new Sale("Pune", "toys", 12.5),
                       new Sale("Delhi", "food", 5), new Sale("Pune", "food", 10),
                       new Sale("Delhi", "books", 8)))
            .forEach(System.out::println);
        // Delhi: books=8.0, food=5.0 | top=books
        // Pune: food=30.0, toys=12.5 | top=food
    }
}`,
      dry: { head: ['sale', 'byCity after'], rows: [['Pune food 20', '{Pune={food=20}}'], ['Pune toys 12.5', '{Pune={food=20, toys=12.5}}'], ['Delhi food 5', '{Delhi={food=5}, Pune={…}}'], ['Pune food 10', '… Pune={food=30, toys=12.5}'], ['Delhi books 8', '<span class="c-g">{Delhi={books=8, food=5}, Pune={food=30, toys=12.5}}</span>']] },
      complexity: `<p>O(N log C) to aggregate into TreeMaps (C = keys per level) + O(cities × categories) to format. Memory O(cities × categories).</p>`,
      followUps: ['Use <code>BigDecimal</code> for money (<code>reducing(BigDecimal.ZERO, Sale::amount, BigDecimal::add)</code>)', 'Run it in parallel — which map type and collector would you switch to?']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'Which of these is a valid functional interface?', options: ['An interface with one abstract method plus three default methods', 'An interface with two abstract methods', 'An abstract class with one abstract method', 'Any interface annotated with <code>@FunctionalInterface</code>, whatever it contains'], answer: 0, explain: 'Only abstract methods count (default, static and public Object methods are excluded). Abstract classes can never be lambda targets, and the annotation only asks the compiler to check the rule — it cannot make an invalid interface valid.' },
    { q: 'What does <code>Function&lt;Integer,Integer&gt; f = x -&gt; x + 1, g = x -&gt; x * 2;</code> then <code>f.compose(g).apply(3)</code> return?', options: ['7', '8', '6', '9'], answer: 0, explain: 'compose runs the argument first: f(g(3)) = f(6) = 7. andThen would be g(f(3)) = 8.' },
    { q: 'Why does this fail to compile? <code>int n = 0; list.forEach(x -&gt; n++);</code>', options: ['Captured local variables must be effectively final', 'forEach cannot take a lambda', '<code>n++</code> is not an expression', 'Lambdas cannot access any outside variables'], answer: 0, explain: 'A lambda captures a copy of a local; modifying it is forbidden. Fields can be modified (the lambda captures <code>this</code>), but prefer <code>count()</code>/<code>sum()</code> anyway.' },
    { q: '<code>String::compareToIgnoreCase</code> used as a <code>Comparator&lt;String&gt;</code> is which kind of method reference?', options: ['Unbound instance method reference', 'Static method reference', 'Bound instance method reference', 'Constructor reference'], answer: 0, explain: 'No specific receiver is given; the first parameter becomes the receiver: (a, b) -&gt; a.compareToIgnoreCase(b).' },
    { q: 'What does this print? <code>Stream.of(1, 2, 3).map(x -&gt; { System.out.print(x); return x; });</code>', options: ['Nothing', '123', '1', 'It does not compile'], answer: 0, explain: 'There is no terminal operation, so the lazy pipeline never runs.' },
    { q: 'What does this print? <code>Stream.of(1, 2, 3, 4).peek(System.out::print).filter(x -&gt; x &gt; 1).findFirst();</code>', options: ['12', '1234', '2', '1'], answer: 0, explain: 'Vertical processing: 1 is peeked and filtered out, 2 is peeked, passes and is found → stop. 3 and 4 are never pulled.' },
    { q: 'What happens with <code>Stream.iterate(1, x -&gt; x + 1).sorted().limit(3).toList()</code>?', options: ['It never finishes (sorted waits for an end of an infinite stream)', '[1, 2, 3]', 'IllegalStateException', 'An empty list'], answer: 0, explain: 'sorted is a barrier and must consume all elements before emitting any; with an infinite source, limit after it can never help.' },
    { q: 'What is <code>Stream.of(3, 1, 2).reduce(Integer::max)</code>?', options: ['<code>Optional[3]</code>', '<code>3</code>', '<code>Optional.empty</code>', '<code>[3]</code>'], answer: 0, explain: 'The one-argument reduce has no identity, so it returns an Optional (empty for an empty stream).' },
    { q: 'Which call throws <code>IllegalStateException: Duplicate key</code>?', options: ['<code>Stream.of("a", "a").collect(toMap(s -&gt; s, s -&gt; 1))</code>', '<code>Stream.of("a", "a").collect(groupingBy(s -&gt; s))</code>', '<code>Stream.of("a", "a").collect(toMap(s -&gt; s, s -&gt; 1, Integer::sum))</code>', '<code>Stream.of("a", "a").distinct().toList()</code>'], answer: 0, explain: 'toMap without a merge function rejects duplicate keys. groupingBy collects all values per key, and the 3-argument toMap merges them.' },
    { q: 'What does <code>Stream.of("apple", "avocado", "kiwi").collect(partitioningBy(s -&gt; s.startsWith("z")))</code> return?', options: ['<code>{false=[apple, avocado, kiwi], true=[]}</code>', '<code>{false=[apple, avocado, kiwi]}</code>', '<code>{}</code>', '<code>{true=[]}</code>'], answer: 0, explain: 'partitioningBy always contains both keys, even when one partition is empty.' },
    { q: 'What does <code>Stream.of(List.of(1, 2), List.of(3)).flatMap(List::stream).count()</code> return?', options: ['3', '2', '1', '5'], answer: 0, explain: 'flatMap flattens the two lists into one stream of three integers.' },
    { q: 'What does <code>"ab".chars().sum()</code> return?', options: ['195', '"ab"', '2', 'It does not compile'], answer: 0, explain: 'chars() is an IntStream of UTF-16 codes: 97 + 98 = 195.' },
    { q: 'Which parallel reduction is guaranteed to equal the sequential result?', options: ['<code>reduce(0, Integer::sum)</code>', '<code>reduce(10, Integer::sum)</code>', '<code>reduce(0, (a, b) -&gt; a - b)</code>', '<code>forEach(x -&gt; total[0] += x)</code>'], answer: 0, explain: 'It needs a true identity (0 for +) and an associative operation. 10 is added once per chunk, subtraction is not associative, and forEach into a shared array is a data race.' },
    { q: 'Which line runs <code>loadDefault()</code> even when <code>opt</code> holds a value?', options: ['<code>opt.orElse(loadDefault())</code>', '<code>opt.orElseGet(() -&gt; loadDefault())</code>', '<code>opt.orElseGet(this::loadDefault)</code>', '<code>opt.or(() -&gt; Optional.of(loadDefault()))</code>'], answer: 0, explain: 'A method argument is evaluated before the call. The others pass Suppliers, which run only when the Optional is empty.' },
    { q: 'Which is considered an Optional anti-pattern?', options: ['A field declared as <code>private Optional&lt;String&gt; nickname;</code>', 'A repository method returning <code>Optional&lt;User&gt;</code>', 'Using <code>orElseThrow()</code> when absence is a bug', 'Chaining <code>map</code> and <code>filter</code> on an Optional'], answer: 0, explain: 'Optional was designed for return types. As a field it is not Serializable, adds memory overhead and confuses frameworks — keep the field nullable and expose an Optional getter.' },
    { q: 'Since Java 16, <code>stream.toList()</code> returns…', options: ['An unmodifiable List (add throws UnsupportedOperationException)', 'An ArrayList you can freely modify', 'A LinkedList', 'A List that rejects null elements'], answer: 0, explain: 'Stream.toList() is unmodifiable but allows nulls. Collectors.toList() makes no promise about mutability (it is an ArrayList today); toUnmodifiableList() rejects nulls.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'What is a functional interface? Name the core ones in <code>java.util.function</code>.', level: 'B', a: `<p>A functional interface has <b>exactly one abstract method</b> (the SAM), so a lambda or method reference can implement it. Default methods, static methods and public <code>Object</code> methods (like <code>equals</code> in <code>Comparator</code>) don't count. <code>@FunctionalInterface</code> is optional but makes the compiler enforce the rule.</p><p>Core ones: <code>Function&lt;T,R&gt;</code> (apply), <code>Predicate&lt;T&gt;</code> (test), <code>Consumer&lt;T&gt;</code> (accept), <code>Supplier&lt;T&gt;</code> (get), <code>BiFunction</code>, <code>UnaryOperator</code>, <code>BinaryOperator</code>, plus primitive versions like <code>IntPredicate</code>, <code>ToIntFunction</code>, <code>IntUnaryOperator</code> that avoid boxing. Older interfaces such as <code>Runnable</code>, <code>Callable</code> and <code>Comparator</code> are functional too.</p>`, followUps: ['Can a functional interface extend another interface?', 'Why are there IntPredicate and friends at all?'] },
    { q: 'Lambda vs anonymous inner class — what are the differences?', level: 'I', a: `<p><b>Syntax:</b> lambdas are concise and only work for functional interfaces; anonymous classes can implement any interface or extend a class, and can have state (fields) and multiple methods.</p><p><b>Semantics:</b> inside a lambda <code>this</code> refers to the enclosing instance; inside an anonymous class it is the anonymous object. Lambdas cannot shadow local variable names.</p><p><b>Implementation:</b> anonymous classes compile to separate <code>Outer$1.class</code> files and always allocate a new instance. Lambdas compile to a private method plus an <code>invokedynamic</code> call site bootstrapped by <code>LambdaMetafactory</code>; non-capturing lambdas are typically cached singletons. Both can only capture effectively final locals.</p>`, followUps: ['When would you still choose an anonymous class?', 'What does invokedynamic buy the JVM here?'] },
    { q: 'Why must captured local variables be effectively final?', level: 'I', a: `<p>Locals live on the stack of the current thread and disappear when the method returns, but a lambda can outlive the method (stored in a field, executed later or on another thread). So Java <b>copies</b> the value into the lambda object. If the variable could change afterwards, the copy and the original would silently diverge, or Java would need shared, synchronised storage for locals. The rule keeps semantics simple and thread-safe.</p><p>Fields are different: the lambda captures <code>this</code> and reads the field live — which is why mutating fields from lambdas works but can create races. Workarounds like <code>int[] box</code> or <code>AtomicInteger</code> exist, but in streams the correct fix is usually a reduction (<code>count</code>, <code>sum</code>, <code>collect</code>).</p>`, followUps: ['Is an effectively final reference to a mutable object safe?', 'How do anonymous classes handle the same problem?'] },
    { q: 'Explain the four kinds of method references with examples.', level: 'B', a: `<p>1. <b>Static:</b> <code>Integer::parseInt</code> ≡ <code>s -&gt; Integer.parseInt(s)</code>.<br>2. <b>Bound instance</b> (specific object): <code>System.out::println</code> ≡ <code>x -&gt; System.out.println(x)</code>; the receiver is evaluated once, when the reference is created (null → immediate NPE).<br>3. <b>Unbound instance</b> (arbitrary object of a type): <code>String::toUpperCase</code> ≡ <code>s -&gt; s.toUpperCase()</code>; the first lambda parameter becomes the receiver, so <code>String::compareTo</code> works as a <code>Comparator</code>.<br>4. <b>Constructor:</b> <code>ArrayList::new</code>, <code>String[]::new</code>; the overload is chosen by the target functional interface's shape.</p>`, followUps: ['Why is <code>Function&lt;Integer,String&gt; f = Integer::toString</code> ambiguous?', 'Why can removing a listener registered as <code>this::onEvent</code> fail?'] },
    { q: 'What is the difference between intermediate and terminal operations? Why are streams lazy?', level: 'B', a: `<p><b>Intermediate</b> operations (<code>filter</code>, <code>map</code>, <code>sorted</code>, <code>limit</code>…) return a new stream and only <i>describe</i> work. <b>Terminal</b> operations (<code>collect</code>, <code>toList</code>, <code>forEach</code>, <code>reduce</code>, <code>count</code>, <code>findFirst</code>…) trigger execution and produce a result or side effect. Without a terminal op, nothing runs.</p><p>Laziness lets Java fuse all stages into one pass where each element travels the whole pipeline before the next (vertical processing), avoid intermediate collections, short-circuit (<code>findFirst</code>, <code>anyMatch</code>, <code>limit</code>) and work with infinite sources like <code>Stream.iterate</code>. The cost is that side effects inside lambdas run only for elements actually pulled — sometimes never.</p>`, followUps: ['Which intermediate operations are stateful?', 'Why might <code>peek</code> not print anything before <code>count()</code>?'] },
    { q: 'Walk me through the execution order of <code>Stream.of(1,2,3,4).filter(x -&gt; x % 2 == 0).map(x -&gt; x * 10).findFirst()</code>.', level: 'I', a: `<p>Building the pipeline creates stage objects; nothing runs. <code>findFirst</code> wraps stages into a Sink chain and pulls from the source with cancellation checks:</p><ol><li>1 → filter fails → dropped.</li><li>2 → filter passes → map gives 20 → findFirst stores 20 and requests cancellation.</li><li>Before pulling 3, the source asks <code>cancellationRequested()</code> → true → stop.</li></ol><p>So filter ran twice, map once, and elements 3 and 4 were never touched. With a <code>sorted()</code> inserted before <code>findFirst</code>, all elements would pass filter and map first (sorted is a barrier), then sorted would release only the first one.</p>`, followUps: ['How does limit() signal that it is done?', 'What changes with parallel()?'] },
    { q: 'map vs flatMap — when do you use each? Also for Optional.', level: 'B', a: `<p><code>map</code> is a 1 → 1 transformation: each element becomes exactly one new element (<code>map(String::length)</code>). <code>flatMap</code> is 1 → 0..n: your function returns a <b>stream</b> per element and the results are concatenated — used to flatten nested collections (<code>orders.flatMap(o -&gt; o.items().stream())</code>), split lines into words, generate pairs, or drop missing values (<code>flatMap(Optional::stream)</code>).</p><p>For <code>Optional</code>: use <code>map</code> when the function returns a plain (possibly null) value; use <code>flatMap</code> when it already returns an <code>Optional</code>, otherwise you get <code>Optional&lt;Optional&lt;T&gt;&gt;</code>. Java 16's <code>mapMulti</code> is an alternative to flatMap that avoids creating a small stream per element.</p>`, followUps: ['What does flatMap do with an empty inner stream?', 'When is mapMulti better than flatMap?'] },
    { q: 'How does <code>groupingBy</code> work, and what are downstream collectors?', level: 'I', a: `<p><code>groupingBy(classifier)</code> computes a key for each element and puts the element into that key's bucket, creating buckets on demand (<code>computeIfAbsent</code> internally) in a <code>HashMap</code>. The default bucket is a List. A <b>downstream collector</b> decides what each bucket becomes: <code>counting()</code>, <code>summingInt</code>, <code>averagingDouble</code>, <code>mapping(f, toList())</code>, <code>maxBy</code>, <code>filtering</code>, <code>collectingAndThen</code>, or even another <code>groupingBy</code> for multi-level maps. The 3-argument form adds a map factory such as <code>TreeMap::new</code> (sorted keys) or <code>LinkedHashMap::new</code> (first-seen order).</p><p>Gotchas: a null key throws NPE; HashMap order is not guaranteed (flaky tests); <code>maxBy</code> yields <code>Optional</code> values; filtering before grouping removes empty groups, whereas <code>Collectors.filtering</code> keeps them. <code>partitioningBy</code> is the boolean special case that always has both keys.</p>`, followUps: ['How would you get the top-paid employee per department as a plain value, not an Optional?', 'groupingBy vs groupingByConcurrent?'] },
    { q: 'What is the difference between <code>reduce</code> and <code>collect</code>?', level: 'A', a: `<p><code>reduce</code> is an <b>immutable</b> reduction: it combines values with a function that returns a new value each time — great for sums, max, products. Requirements: a true identity and an associative, stateless accumulator (plus a combiner in the 3-arg form when result and element types differ).</p><p><code>collect</code> is a <b>mutable</b> reduction: each thread gets a container from a supplier, the accumulator mutates it, the combiner merges containers, and an optional finisher converts the result. Using <code>reduce</code> to build a List or String would copy on every step (O(n²) for strings) or, if you cheat by mutating, break in parallel. Rule: numbers/immutable values → <code>reduce</code> or specialised terminals; containers → <code>collect</code>.</p>`, followUps: ['Write a Collector with Collector.of', 'What do the Collector characteristics IDENTITY_FINISH, UNORDERED and CONCURRENT mean?'] },
    { q: 'When should you use parallel streams, and what are the pitfalls?', level: 'A', a: `<p>Use them for <b>CPU-bound</b>, <b>large</b> workloads (N × cost-per-element is big) over sources that <b>split well</b> (arrays, ArrayList, IntStream.range), with <b>pure</b> lambdas and associative reductions — and only after measuring with JMH.</p><p>Pitfalls: (1) shared mutable state (<code>forEach(list::add)</code>) causes lost updates or exceptions; (2) wrong identity / non-associative reduce gives different results; (3) <code>forEach</code> order is nondeterministic (<code>forEachOrdered</code> fixes it at a cost); (4) ordered stateful ops (<code>limit</code>, <code>distinct</code>, <code>sorted</code>, <code>findFirst</code>) need coordination — <code>unordered()</code> helps; (5) all parallel streams share the <b>ForkJoinPool common pool</b>, so blocking I/O starves the whole JVM; (6) ThreadLocal context (MDC, security, transactions) is not propagated; (7) small N is slower than sequential.</p>`, followUps: ['How do you run a parallel stream in a custom pool?', 'Are virtual threads a replacement for parallel streams?'] },
    { q: 'orElse vs orElseGet vs orElseThrow — when do you use each?', level: 'I', a: `<p><code>orElse(value)</code>: the argument is evaluated <b>eagerly</b> before the call, even if the Optional is present — fine for cheap constants (<code>""</code>, <code>0</code>, a static default). <code>orElseGet(supplier)</code>: the supplier runs <b>only if empty</b> — use for anything computed, expensive, or with side effects (DB calls, object creation, logging). <code>orElseThrow()</code> (Java 10) / <code>orElseThrow(() -&gt; new NotFound(...))</code>: absence is an error — this replaces <code>get()</code>, whose name hid the possibility of <code>NoSuchElementException</code>.</p><p>A classic production bug: <code>repo.findById(id).orElse(repo.save(new Entity()))</code> inserts a row every time. Use <code>orElseGet</code>.</p>`, followUps: ['What does <code>or()</code> add (Java 9)?', 'Is <code>orElse(null)</code> ever OK?'] },
    { q: 'What are the best practices and anti-patterns for Optional?', level: 'I', a: `<p><b>Do:</b> use Optional as a <b>return type</b> for "may not exist" queries; chain <code>map</code>/<code>flatMap</code>/<code>filter</code>; finish with <code>orElse</code> (constants), <code>orElseGet</code> (computed), <code>orElseThrow</code> (errors) or <code>ifPresentOrElse</code>; use <code>OptionalInt</code>/<code>OptionalDouble</code> for primitives.</p><p><b>Don't:</b> return <code>null</code> from an Optional-returning method; use Optional for fields (not Serializable, extra memory), method parameters (callers can still pass null → three states; prefer overloads), collection elements or map values; wrap collections (return an empty list instead); call <code>get()</code> without a check; write <code>isPresent()</code> + <code>get()</code> ladders; use <code>==</code> or <code>synchronized</code> on Optionals (value-based class); use <code>Optional.of</code> on something that can be null.</p>`, followUps: ['How would you migrate a nullable getter API to Optional without breaking callers?', 'How do JSpecify / @Nullable annotations complement Optional?'] },
    { q: 'Explain stateless vs stateful intermediate operations and why it matters.', level: 'A', a: `<p><b>Stateless</b> ops (<code>filter</code>, <code>map</code>, <code>flatMap</code>, <code>peek</code>) decide each element independently, so they stream perfectly and parallelise trivially. <b>Stateful</b> ops remember things: <code>distinct</code> keeps a set of seen elements, <code>limit</code>/<code>skip</code> keep counters, <code>sorted</code> buffers <i>everything</i>. Consequences: sorted is a full barrier (breaks short-circuiting upstream, never finishes on infinite streams, O(N) memory); distinct needs O(distinct) memory; in parallel, ordered stateful ops require buffering and cross-thread coordination, often wiping out the speedup — hence <code>unordered()</code>.</p><p>Also, the lambdas you pass must be <b>stateless</b> themselves: a <code>filter</code> that consults a mutable set you modify inside it makes results depend on execution order, which differs between sequential and parallel runs.</p>`, followUps: ['How does sorted() handle a downstream limit()?', 'Which source characteristics make distinct() or sorted() no-ops?'] },
    { q: 'How do you handle checked exceptions inside lambdas used in streams?', level: 'A', a: `<p>The standard functional interfaces' methods don't declare checked exceptions, so <code>map(path -&gt; Files.readString(path))</code> doesn't compile. Options: (1) catch inside the lambda and rethrow as an unchecked exception — <code>UncheckedIOException</code> for IOExceptions, preserving the cause; (2) write a small <code>ThrowingFunction</code> interface plus a <code>wrap()</code> adapter; (3) return a result type (<code>Either</code>/<code>Try</code>-style record or <code>Optional</code>) so failures become data you can partition and report; (4) step out of the stream into a loop when error handling dominates.</p><p>Avoid "sneaky throw" hacks and never swallow exceptions by returning null — that just moves the failure downstream. For I/O-heavy pipelines also remember try-with-resources around <code>Files.lines</code>.</p>`, followUps: ['How would you collect both successes and failures from a stream?', 'Why does UncheckedIOException exist?'] },
    { q: 'Are Java streams always slower than loops? How would you decide in a performance-critical path?', level: 'E', a: `<p>Not always. For large data and simple pipelines, the JIT inlines the sink chain and performance is close to a hand-written loop. Streams lose when: collections are tiny and the code is extremely hot (setup objects and virtual calls dominate); boxing sneaks in (<code>Stream&lt;Integer&gt;</code> instead of <code>IntStream</code>); call sites become megamorphic (one <code>apply</code> site sees many lambda classes, blocking inlining); or a stateful op like <code>sorted</code> materialises everything. They can win when laziness/short-circuiting avoids work a naive loop would do, or when <code>parallel()</code> legitimately applies.</p><p>Decide with <b>JMH</b> benchmarks (warm-up, forks, blackholes), profile with async-profiler/JFR for allocation and CPU, and prefer readability unless the profiler shows the pipeline on the hot path. Use primitive streams, avoid boxing, and keep pipelines monomorphic in hot code.</p>`, followUps: ['What is a megamorphic call site?', 'How does escape analysis interact with Optional and lambdas?'] }
  );

  registerModule({
    id: 'java09',
    title: 'Lambdas, Streams & Optional',
    intro: `<p>Modern Java code reads very differently from Java 7 code: instead of loops full of temporary lists and <code>if (x != null)</code> checks, you pass <b>behaviour</b> as lambdas, describe data processing as <b>stream pipelines</b>, and model "maybe no answer" with <b>Optional</b>. This module takes you from your first lambda to the internals interviewers love: the four kinds of method references, how a pipeline really runs (element by element, lazily, with short-circuiting and barriers), the collectors behind every "group by / count / top K" question, <code>flatMap</code> and primitive streams, why <code>parallelStream()</code> is not a free speed-up, and how to use Optional without creating new bugs.</p>
<p>Every topic has an interactive visualizer — including a <b>pipeline simulator</b> you can edit to watch elements flow through <code>filter → map → limit → collect</code> one at a time — plus "predict the output" drills, because output-prediction questions about laziness, <code>peek</code>, <code>orElse</code> and parallel reduce are interview favourites.</p>`,
    goals: [
      'Pick the right functional interface (Function, Predicate, Consumer, Supplier, primitive variants) and compose behaviour with andThen/compose/and/or/negate and Comparator chains',
      'Name and use all four kinds of method references, and spot the ambiguous or early-binding cases',
      'Trace any stream pipeline element by element: predict peek/println output, short-circuiting, the sorted() barrier, count() elision and infinite streams',
      'Solve grouping, counting, top-K, frequency and flattening questions with collect, toMap, groupingBy, partitioningBy, flatMap and IntStream',
      'Explain when parallel streams help or hurt (identity, associativity, shared state, common pool) and fix parallel bugs',
      'Use Optional idiomatically (map/flatMap/filter, orElse vs orElseGet vs orElseThrow) and avoid its anti-patterns'
    ],
    prereqs: `Java 5 (Strings, wrapper classes, equals/hashCode, Comparable vs Comparator), Java 7 (Collections Framework in Practice) and Java 8 (Generics — wildcards and PECS help with Collector and Comparator signatures).`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
