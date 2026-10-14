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
registerModule({ id: 'java09', title: 'Lambdas, Streams & Optional', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
