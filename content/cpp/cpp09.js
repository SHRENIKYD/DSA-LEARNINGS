(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;   // C++ code is written with String.raw so "\n" stays a C++ escape

  /* ======================================================================
     Shared helpers for the visualizers of this module
     ====================================================================== */
  function E(s) { return H.esc(s); }
  function note(html, label) { return { type: 'text', label: label || 'What is going on', html: html }; }
  function splitList(input, def, max, what) {
    var s = String(input === undefined || input === null ? def : input).trim();
    if (!s) throw new Error('Type some ' + what + ' separated by ";" — e.g. ' + def);
    var items = s.split(/\s*;\s*|\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (items.length > max) throw new Error('Use at most ' + max + ' ' + what);
    return items;
  }

  /* ---------- A tiny "type database" used by the overload / SFINAE / concept visualizers ---------- */
  var TYPES = {
    'int':              { integral: 1, signedInt: 1, arith: 1, less: 1, plus: 1 },
    'unsigned':         { integral: 1, arith: 1, less: 1, plus: 1 },
    'long':             { integral: 1, signedInt: 1, arith: 1, less: 1, plus: 1 },
    'short':            { integral: 1, signedInt: 1, arith: 1, less: 1, plus: 1 },
    'char':             { integral: 1, signedInt: 1, arith: 1, less: 1, plus: 1 },
    'bool':             { integral: 1, arith: 1, less: 1, plus: 1 },
    'float':            { floating: 1, arith: 1, less: 1, plus: 1 },
    'double':           { floating: 1, arith: 1, less: 1, plus: 1 },
    'int*':             { pointer: 1, pointee: 'int', less: 1 },
    'const char*':      { pointer: 1, pointee: 'const char', less: 1 },
    'std::string':      { cls: 1, range: 1, size: 1, valueType: 1, less: 1, plus: 1 },
    'std::vector<int>': { cls: 1, range: 1, size: 1, valueType: 1, less: 1 },
    'Widget':           { cls: 1 }
  };
  var TYPE_LIST = Object.keys(TYPES);
  function normType(s) {
    var t = String(s || '').trim().replace(/\s+/g, ' ').replace(/\s*\*\s*$/, '*').replace(/\s*<\s*/g, '<').replace(/\s*>\s*/g, '>');
    var alias = { 'string': 'std::string', 'vector<int>': 'std::vector<int>', 'unsigned int': 'unsigned', 'long long': 'long', 'int *': 'int*',
      'char const*': 'const char*', 'const char *': 'const char*', 'widget': 'Widget' };
    if (alias[t]) t = alias[t];
    if (!TYPES[t]) throw new Error('Pick one of: ' + TYPE_LIST.join(', '));
    return t;
  }
  /* implicit-conversion rank of one argument type to one (non-template) parameter type */
  function convRank(from, to) {
    if (from === to) return { r: 0, name: 'Exact match' };
    var F = TYPES[from], T = TYPES[to];
    if (to === 'int' && (from === 'char' || from === 'short' || from === 'bool')) return { r: 1, name: 'Promotion' };
    if (to === 'double' && from === 'float') return { r: 1, name: 'Promotion' };
    if (F && T && F.arith && T.arith) return { r: 2, name: 'Standard conversion' };
    if (F && F.pointer && to === 'bool') return { r: 2, name: 'Standard conversion (pointer → bool)' };
    if (from === 'const char*' && to === 'std::string') return { r: 3, name: 'User-defined conversion' };
    return null;
  }
  var RANKNAME = ['Exact match', 'Promotion', 'Conversion', 'User-defined', 'Ellipsis (...)'];

  /* ---------- Overload-resolution engine (topics 1, 5, 6) ----------
     candidate = { sig, kind:'plain'|'template'|'ellipsis', param (plain),
                   deduce(arg) -> {ok, T, why}, check(T, arg) -> {ok, why} (SFINAE/constraint),
                   spec: number (higher = more specialized / more constrained), family: string } */
  function resolve(cands, arg, title, codeText) {
    var frames = [], st = cands.map(function () { return { stage: 'listed', T: '', rank: null, why: '' }; });
    function rows() {
      return cands.map(function (c, i) {
        var s = st[i];
        return [String(i + 1), c.sig, s.T || '—', s.stage, s.rank === null ? '—' : RANKNAME[s.rank], s.why || ''];
      });
    }
    function hl(extra) {
      var h = {};
      st.forEach(function (s, i) { if (s.stage.indexOf('✗') === 0) h[i] = 'bad'; else if (s.stage.indexOf('✓') === 0) h[i] = 'ok'; });
      Object.keys(extra || {}).forEach(function (k) { h[k] = extra[k]; });
      return h;
    }
    function tbl(extra) { return { type: 'table', label: 'Candidate set for the call with an argument of type ' + E(arg), columns: ['#', 'candidate', 'T deduced', 'status', 'conversion rank', 'why'], rows: rows(), hl: hl(extra) }; }
    var parts0 = [tbl()];
    if (codeText) parts0.unshift({ type: 'code', label: 'The overload set', lang: 'cpp', code: codeText });
    frames.push({ narr: 'Step 0 — <b>name lookup</b>. The compiler collects every function called <code>' + E(title) + '</code> that it can see. Right now they are all just "listed": nobody is ruled in or out yet. Argument type: <b>' + E(arg) + '</b>.', parts: parts0 });
    // Step 1: template argument deduction
    cands.forEach(function (c, i) {
      if (c.kind !== 'template') return;
      var d = c.deduce(arg);
      if (!d.ok) { st[i].stage = '✗ deduction failed'; st[i].why = d.why; }
      else { st[i].stage = 'deduced'; st[i].T = d.T; st[i].why = d.why || ''; }
      var h = {}; h[i] = d.ok ? 'cur' : 'bad';
      frames.push({ narr: 'Step 1 — <b>template argument deduction</b> for #' + (i + 1) + ' <code>' + E(c.sig) + '</code>: ' + (d.ok ? 'compare the parameter pattern with <b>' + E(arg) + '</b> → <b>T = ' + E(d.T) + '</b>.' : '<span class="c-r">cannot find a T</span> (' + E(d.why) + '). The candidate is <b>quietly dropped</b> — a deduction failure is never an error by itself.'), parts: [tbl(h)] });
    });
    // Step 2: substitution / constraints
    cands.forEach(function (c, i) {
      if (c.kind !== 'template' || st[i].stage !== 'deduced' || !c.check) return;
      var r = c.check(st[i].T, arg);
      var h = {}; h[i] = r.ok ? 'cur' : 'bad';
      if (!r.ok) { st[i].stage = '✗ ' + (c.family === 'concept' ? 'constraint not satisfied' : 'substitution failure (SFINAE)'); st[i].why = r.why; }
      else st[i].why = r.why;
      frames.push({ narr: 'Step 2 — <b>' + (c.family === 'concept' ? 'check the constraints' : 'substitute T into the signature') + '</b> of #' + (i + 1) + ': ' + (r.ok ? '<span class="c-g">fine</span> — ' + E(r.why) + '.' : '<span class="c-r">' + E(r.why) + '</span> → removed from the set. ' + (c.family === 'concept' ? 'An unsatisfied <code>requires</code> just removes the candidate.' : 'Substitution Failure Is Not An Error: the bad signature is thrown away silently.')), parts: [tbl(h)] });
    });
    // Step 3: viability (conversions)
    cands.forEach(function (c, i) {
      if (st[i].stage.indexOf('✗') === 0) return;
      var rk;
      if (c.kind === 'ellipsis') rk = { r: 4, name: 'Ellipsis' };
      else if (c.kind === 'template') rk = { r: 0, name: 'Exact match' };
      else rk = convRank(arg, c.param);
      if (!rk) { st[i].stage = '✗ not viable'; st[i].why = 'no implicit conversion ' + arg + ' → ' + c.param; }
      else { st[i].stage = '✓ viable'; st[i].rank = rk.r; if (c.kind === 'plain') st[i].why = arg + ' → ' + c.param; }
    });
    frames.push({ narr: 'Step 3 — <b>viability</b>. Each survivor must accept the argument, maybe through an implicit conversion. A deduced template parameter matches the argument <b>exactly</b> (that is the point of deducing). <code>...</code> accepts anything but ranks dead last.', parts: [tbl()] });
    // Step 4: pick best
    var viable = [];
    st.forEach(function (s, i) { if (s.stage === '✓ viable') viable.push(i); });
    if (!viable.length) {
      frames.push({ narr: '<span class="c-r">No viable function</span> → compile error "no matching function for call". With concepts the error message even lists which requirement failed.', parts: [tbl(), note('<span class="c-r">error: no matching function for call to <code>' + E(title) + '(' + E(arg) + ')</code></span>', 'Compiler says')] });
      return frames;
    }
    var best = Math.min.apply(null, viable.map(function (i) { return st[i].rank; }));
    var tier = viable.filter(function (i) { return st[i].rank === best; });
    viable.forEach(function (i) { if (st[i].rank !== best) { st[i].stage = '✗ worse conversion'; } });
    var hb = {}; tier.forEach(function (i) { hb[i] = 'cur'; });
    frames.push({ narr: 'Step 4a — <b>rank conversions</b>: Exact match &gt; Promotion &gt; Conversion &gt; User-defined &gt; Ellipsis. Best rank here: <b>' + RANKNAME[best] + '</b>. ' + (tier.length === 1 ? 'Only one candidate has it.' : tier.length + ' candidates tie, so we need tie-breakers.'), parts: [tbl(hb)] });
    if (tier.length > 1) {
      var plain = tier.filter(function (i) { return cands[i].kind === 'plain'; });
      if (plain.length && plain.length < tier.length) {
        tier.forEach(function (i) { if (cands[i].kind !== 'plain') st[i].stage = '✗ lost tie: template'; });
        tier = plain;
        var h2 = {}; tier.forEach(function (i) { h2[i] = 'cur'; });
        frames.push({ narr: 'Step 4b — tie-breaker: <b>a non-template beats a template</b> when the conversions are equally good. "If you wrote a hand-made version for this exact case, you meant it."', parts: [tbl(h2)] });
      }
    }
    if (tier.length > 1) {
      var mx = Math.max.apply(null, tier.map(function (i) { return cands[i].spec || 0; }));
      var top = tier.filter(function (i) { return (cands[i].spec || 0) === mx; });
      if (top.length < tier.length) {
        tier.forEach(function (i) { if ((cands[i].spec || 0) !== mx) st[i].stage = '✗ lost tie: less ' + (cands[i].family === 'concept' ? 'constrained' : 'specialized'); });
        tier = top;
        var h3 = {}; tier.forEach(function (i) { h3[i] = 'cur'; });
        frames.push({ narr: 'Step 4c — tie-breaker: <b>' + (cands[tier[0]].family === 'concept' ? 'the more constrained template wins (constraint subsumption)' : 'the more specialized template wins (partial ordering)') + '</b>. A pattern that accepts fewer types is "more specific", so it is preferred.', parts: [tbl(h3)] });
      }
    }
    if (tier.length > 1) {
      tier.forEach(function (i) { st[i].stage = '✗ ambiguous'; });
      frames.push({ narr: '<span class="c-r">Still a tie → ambiguous call → compile error.</span>', parts: [tbl(), note('<span class="c-r">error: call of overloaded <code>' + E(title) + '(' + E(arg) + ')</code> is ambiguous</span>', 'Compiler says')] });
      return frames;
    }
    var w = tier[0]; st[w].stage = '✓ CHOSEN';
    var hw = {}; hw[w] = 'sel';
    frames.push({ narr: '<b>Winner: #' + (w + 1) + ' <code>' + E(cands[w].sig) + '</code></b>' + (st[w].T ? ' with T = <b>' + E(st[w].T) + '</b>' : '') + '. Only now is that one function template <i>instantiated</i> (its body compiled for this T).', parts: [tbl(hw), note('Call <code>' + E(title) + '(x)</code> with <code>x</code> of type <b>' + E(arg) + '</b> → runs <b>#' + (w + 1) + '</b>.', 'Result')] });
    return frames;
  }

  /* ---------- A tiny C++ type-expression parser (topics 2 and 4) ----------
     node kinds: name{n}, const{of}, volatile{of}, ptr{of}, lref{of}, rref{of}, arr{n,of}, vec{of}, pair{a,b} */
  function splitTop(s) {
    var depth = 0, out = [], cur = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === '<') depth++;
      if (ch === '>') depth--;
      if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
    return out;
  }
  var BASES = ['int', 'unsigned', 'long', 'short', 'char', 'bool', 'float', 'double', 'void', 'std::string', 'Widget'];
  function parseType(s, depth) {
    depth = depth || 0;
    if (depth > 12) throw new Error('Type is nested too deeply — keep it short');
    s = String(s).trim().replace(/\s+/g, ' ');
    if (!s) throw new Error('Empty type — try something like: const int*');
    var m;
    if (/&&$/.test(s)) return { k: 'rref', of: parseType(s.slice(0, -2), depth + 1) };
    if (/&$/.test(s)) return { k: 'lref', of: parseType(s.slice(0, -1), depth + 1) };
    if ((m = s.match(/^(.*)\[(\d{1,3})\]$/))) return { k: 'arr', n: +m[2], of: parseType(m[1], depth + 1) };
    if (/\*$/.test(s)) return { k: 'ptr', of: parseType(s.slice(0, -1), depth + 1) };
    if (/ const$/.test(s)) return { k: 'const', of: parseType(s.slice(0, -6), depth + 1) };
    if (/ volatile$/.test(s)) return { k: 'volatile', of: parseType(s.slice(0, -9), depth + 1) };
    if (/^const /.test(s)) return { k: 'const', of: parseType(s.slice(6), depth + 1) };
    if (/^volatile /.test(s)) return { k: 'volatile', of: parseType(s.slice(9), depth + 1) };
    if ((m = s.match(/^(?:std::)?vector ?<(.*)>$/))) return { k: 'vec', of: parseType(m[1], depth + 1) };
    if ((m = s.match(/^(?:std::)?pair ?<(.*)>$/))) {
      var p = splitTop(m[1]);
      if (p.length !== 2) throw new Error('pair needs exactly two types: pair<int, double>');
      return { k: 'pair', a: parseType(p[0], depth + 1), b: parseType(p[1], depth + 1) };
    }
    var nm = s === 'string' ? 'std::string' : s === 'unsigned int' ? 'unsigned' : s;
    if (BASES.indexOf(nm) < 0) throw new Error('Unknown type "' + s + '". Use ' + BASES.join(', ') + ' with const, *, &, &&, [N], vector<…>, pair<…,…>');
    return { k: 'name', n: nm };
  }
  function tstr(t) {
    switch (t.k) {
      case 'name': return t.n;
      case 'const': return (t.of.k === 'ptr' || t.of.k === 'lref') ? tstr(t.of) + ' const' : 'const ' + tstr(t.of);
      case 'volatile': return (t.of.k === 'ptr') ? tstr(t.of) + ' volatile' : 'volatile ' + tstr(t.of);
      case 'ptr': return t.of.k === 'arr' ? tstr(t.of.of) + ' (*)[' + t.of.n + ']' : tstr(t.of) + '*';
      case 'lref': return t.of.k === 'arr' ? tstr(t.of.of) + ' (&)[' + t.of.n + ']' : tstr(t.of) + '&';
      case 'rref': return t.of.k === 'arr' ? tstr(t.of.of) + ' (&&)[' + t.of.n + ']' : tstr(t.of) + '&&';
      case 'arr': return tstr(t.of) + '[' + t.n + ']';
      case 'vec': return 'std::vector<' + tstr(t.of) + '>';
      case 'pair': return 'std::pair<' + tstr(t.a) + ', ' + tstr(t.b) + '>';
    }
    return '?';
  }
  function same(a, b) { return tstr(a) === tstr(b); }

  /* ======================================================================
     TOPIC 1 — Function templates, deduction, instantiation, overloads
     ====================================================================== */
  function litType(lit) {
    var s = String(lit).trim();
    if (/^-?\d+$/.test(s)) return 'int';
    if (/^-?\d+[lL]$/.test(s)) return 'long';
    if (/^-?\d+[uU]$/.test(s)) return 'unsigned';
    if (/^-?\d*\.\d+[fF]$/.test(s)) return 'float';
    if (/^-?\d*\.\d+$/.test(s)) return 'double';
    if (/^'.'$/.test(s)) return 'char';
    if (s === 'true' || s === 'false') return 'bool';
    if (/^"[^"]*"s$/.test(s)) return 'std::string';
    if (/^"[^"]*"$/.test(s)) return 'const char*';
    throw new Error('Unknown literal "' + s + '". Use 3, 3L, 3u, 2.5, 2.5f, \'c\', true, "hi" (C string) or "hi"s (std::string)');
  }
  function instantiationViz(input) {
    var DEF = 'maxOf(3, 7); maxOf(2.5, 1.5); maxOf("hi"s, "yo"s); maxOf(10, 20); maxOf(3, 2.5); maxOf<double>(3, 2.5); maxOf(\'a\', \'z\'); maxOf("b", "a")';
    var calls = splitList(input, DEF, 12, 'calls');
    var frames = [], rows = [], inst = [], instCalls = {};
    var tplCode = 'template <typename T>\nT maxOf(T a, T b) {\n    return a < b ? b : a;\n}';
    function graph(hlT, bad) {
      var nodes = [{ id: 'tpl', label: 'template maxOf<T>', x: 18, y: 8 + Math.max(inst.length, 1) * 6, shape: 'box', w: 30 }];
      var edges = [], hl = {}, tags = {};
      inst.forEach(function (t, i) {
        var id = 'I' + i;
        nodes.push({ id: id, label: 'maxOf<' + t + '>', x: 74, y: 8 + i * 12, shape: 'box', w: 40 });
        edges.push(['tpl', id, 'T=' + t]);
        tags[id] = instCalls[t] + ' call' + (instCalls[t] > 1 ? 's' : '');
        if (t === hlT) hl[id] = 'cur';
      });
      if (bad) hl.tpl = 'bad';
      return { type: 'graph', label: 'One template (a recipe) → one compiled function per distinct T', directed: true, height: Math.max(30, inst.length * 12 + 8), nodes: nodes, edges: edges, hl: hl, tags: tags };
    }
    function tbl(h) { return { type: 'table', label: 'Deduction log', columns: ['call', 'arg 1 → T', 'arg 2 → T', 'T', 'outcome'], rows: rows.slice(), hl: h || {} }; }
    frames.push({ narr: 'A function template is a <b>recipe</b>, not a function. Nothing is compiled until a call needs it. Each call makes the compiler <b>deduce T</b> from the arguments; each <i>new</i> T stamps out a fresh function (an <b>instantiation</b>). Calls: ' + calls.length + '.', parts: [{ type: 'code', label: 'The template', lang: 'cpp', code: tplCode }, graph()] });
    calls.forEach(function (c) {
      var m = c.match(/^(?:maxOf)?\s*(?:<\s*([\w:]+)\s*>)?\s*\((.*)\)$/) || c.match(/^()(.*)$/);
      var expl = m[1] ? normType(m[1]) : null;
      var args = splitTop(m[2]).map(function (x) { return x.trim(); }).filter(Boolean);
      if (args.length !== 2) throw new Error('Each call needs exactly two arguments, like maxOf(3, 7)');
      var t1 = litType(args[0]), t2 = litType(args[1]), T, outcome, cls, bad = false;
      if (expl) {
        T = expl;
        var c1 = t1 === T || convRank(t1, T), c2 = t2 === T || convRank(t2, T);
        if (!c1 || !c2) { outcome = 'error: cannot convert argument to ' + T; cls = 'bad'; bad = true; }
        else outcome = 'explicit T — no deduction, args converted to ' + T;
      } else if (t1 !== t2) {
        T = '?'; outcome = 'error: deduced conflicting types (' + t1 + ' vs ' + t2 + ')'; cls = 'bad'; bad = true;
      } else { T = t1; }
      var isNew = false;
      if (!bad) {
        if (inst.indexOf(T) < 0) { inst.push(T); instCalls[T] = 0; isNew = true; }
        instCalls[T]++;
        if (!outcome) outcome = isNew ? 'NEW instantiation maxOf<' + T + '>' : 'reuse existing maxOf<' + T + '>';
        if (expl && isNew) outcome += ' (new)';
        cls = isNew ? 'ok' : 'win';
        if (T === 'const char*') { outcome += ' — compares ADDRESSES, not text!'; cls = 'bad'; }
      }
      rows.push([c, expl ? '(explicit)' : t1 + ' → T=' + t1, expl ? '(explicit)' : t2 + ' → T=' + t2, T, outcome]);
      var h = {}; h[rows.length - 1] = cls;
      var why;
      if (bad && !expl) why = 'Deduction looks at each argument <b>separately</b>: arg 1 says T = <b>' + E(t1) + '</b>, arg 2 says T = <b>' + E(t2) + '</b>. Deduction never converts, so the two answers clash → <span class="c-r">compile error</span>. Fixes: <code>maxOf&lt;double&gt;(3, 2.5)</code>, cast one argument, or use two type parameters.';
      else if (bad) why = '<span class="c-r">Explicit T given, but an argument cannot convert to it.</span>';
      else if (T === 'const char*') why = 'Both are string literals. By-value parameters <b>decay</b> arrays to pointers, so T = <code>const char*</code>. It compiles, but <code>a &lt; b</code> compares two <b>memory addresses</b>, not alphabetical order. A classic trap — use <code>std::string</code> or a specialization/overload for C strings.';
      else if (expl) why = 'You wrote the type yourself (<code>&lt;' + E(T) + '&gt;</code>), so deduction is skipped and normal implicit conversions apply to the arguments. ' + (isNew ? 'A new function is generated.' : 'That function already exists — reused.');
      else why = 'Both arguments agree: T = <b>' + E(T) + '</b>. ' + (isNew ? '<span class="c-g">First time we see this T → the compiler generates <code>maxOf&lt;' + E(T) + '&gt;</code></span> (a real function with its own machine code).' : 'We already generated <code>maxOf&lt;' + E(T) + '&gt;</code> — the same function is reused (no new code).');
      frames.push({ narr: '<code>' + E(c) + '</code>: ' + why, parts: [tbl(h), graph(bad ? null : T, bad), { type: 'vars', label: 'Scoreboard', vals: { calls: rows.length, 'distinct instantiations': inst.length, errors: rows.filter(function (r) { return /^error/.test(r[4]); }).length } }] });
    });
    frames.push({ narr: 'Summary: <b>' + rows.length + '</b> calls produced <b>' + inst.length + '</b> real functions (' + E(inst.join(', ')) + '). This is why templates are "zero-cost" at run time (each instance is as fast as a hand-written one) but cost <b>compile time and binary size</b> — every distinct T is another copy of the code.', parts: [tbl(), graph()] });
    return frames;
  }

  var OVL1 = R`
void f(int)                         // #1  plain function
void f(double)                      // #2  plain function
template <class T> void f(T)        // #3  any T
template <class T> void f(T*)       // #4  any pointer`;
  function overloadViz1(input) {
    var arg = normType(input === undefined ? 'char' : input);
    var cands = [
      { sig: 'void f(int)', kind: 'plain', param: 'int' },
      { sig: 'void f(double)', kind: 'plain', param: 'double' },
      { sig: 'template<class T> void f(T)', kind: 'template', spec: 0, deduce: function (a) { return { ok: true, T: a, why: 'T matches anything' }; } },
      { sig: 'template<class T> void f(T*)', kind: 'template', spec: 1, deduce: function (a) { return TYPES[a].pointer ? { ok: true, T: TYPES[a].pointee, why: 'peeled one *' } : { ok: false, why: a + ' is not a pointer, so it cannot match T*' }; } }
    ];
    return resolve(cands, arg, 'f', OVL1);
  }

  topics.push({
    title: 'Function Templates: Deduction, Instantiation & Overloads',
    analogy: `<p>Think of a <b>cookie cutter</b>. The cutter itself is not a cookie — it is a <i>shape</i>. Press it into chocolate dough and you get a chocolate cookie; press it into ginger dough and you get a ginger cookie. A <b>function template</b> is the cutter, the type <code>T</code> is the dough, and every real function the compiler stamps out (<code>maxOf&lt;int&gt;</code>, <code>maxOf&lt;double&gt;</code>) is a cookie. You write the shape once; the compiler bakes as many cookies as your program needs.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Without templates you would write <code>maxInt</code>, <code>maxDouble</code>, <code>maxString</code>… all identical except for the type. A template lets you write it once with a <b>placeholder type</b>:</p>
      <pre>template &lt;typename T&gt;
T maxOf(T a, T b) { return a &lt; b ? b : a; }</pre>
      <p>When you call <code>maxOf(3, 7)</code> the compiler looks at the arguments, figures out <b>T = int</b> (this is called <b>template argument deduction</b>), and generates a real function <code>int maxOf&lt;int&gt;(int, int)</code>. That generation step is called <b>instantiation</b>. Call it again with ints → it reuses the same function. Call it with doubles → a second function is generated.</p>
      ${H.table(['you write', 'compiler deduces', 'compiler generates'], [['<code>maxOf(3, 7)</code>', 'T = int', '<span class="c-g">maxOf&lt;int&gt;</span> (new)'], ['<code>maxOf(2.5, 1.5)</code>', 'T = double', '<span class="c-g">maxOf&lt;double&gt;</span> (new)'], ['<code>maxOf(10, 20)</code>', 'T = int', '<span class="c-b">reuses maxOf&lt;int&gt;</span>'], ['<code>maxOf(3, 2.5)</code>', 'int vs double', '<span class="c-r">error: conflicting T</span>']])}
      <p><b>Four rules that explain 90% of surprises:</b></p>
      <ul>
        <li><b>Deduction never converts.</b> Each argument votes for T on its own. <code>maxOf(3, 2.5)</code>: one vote says int, one says double → error. Fix with <code>maxOf&lt;double&gt;(3, 2.5)</code> (explicit T, then normal conversions apply).</li>
        <li><b>By-value parameters decay.</b> For <code>T a</code>, arrays become pointers and top-level <code>const</code> is dropped. So <code>maxOf("b", "a")</code> gives <code>T = const char*</code> and compares <i>addresses</i>!</li>
        <li><b>Templates live in headers.</b> The compiler needs the full body at the call site to stamp out a new version. Put the body in a <code>.cpp</code> file and you get a linker error ("undefined reference to maxOf&lt;int&gt;").</li>
        <li><b>Overloads and templates coexist.</b> A plain function and a template with the same name both join the candidate set. On an equally good match, the <b>plain function wins</b>; between two templates, the <b>more specialized</b> pattern (like <code>T*</code> vs <code>T</code>) wins.</li>
      </ul>
      <p>Templates can also take <b>values</b>, not just types: <code>template &lt;int N&gt;</code> or <code>template &lt;std::size_t N&gt;</code> (non-type template parameters). <code>std::array&lt;int, 5&gt;</code> is exactly that. Since C++20 you can even write <code>auto add(auto a, auto b)</code> — an <b>abbreviated function template</b>, short-hand for a template with two invented type parameters.</p>`,
    clues: [
      '"Write a <b>generic</b> function that works for int, double and string" → function template',
      '"Why does <code>max(3, 2.5)</code> not compile?" → deduction conflict; deduction never converts',
      '"Undefined reference to <code>foo&lt;int&gt;</code>" at link time → template body hidden in a .cpp file',
      '"Which overload is called: <code>f(int)</code> or <code>template f(T)</code>?" → exact match tie → non-template wins; better match → template can still win',
      '"Size known at compile time", "fixed-length buffer" → non-type template parameter <code>template &lt;size_t N&gt;</code>',
      '"Avoid code duplication but no virtual call overhead" → templates (static polymorphism)'
    ],
    code: [R`
      #include <iostream>
      #include <string>
      #include <cstddef>

      // 1) A classic function template: one recipe, many functions.
      template <typename T>
      T maxOf(T a, T b) {               // T is deduced from the arguments
          return a < b ? b : a;         // requires T to support operator<
      }

      // 2) Two type parameters + auto return: mixed types are allowed.
      template <typename A, typename B>
      auto maxMixed(A a, B b) {         // return type = common type of the ?: expression
          return a < b ? b : a;
      }

      // 3) Non-type template parameter: N is a compile-time value.
      template <typename T, std::size_t N>
      constexpr std::size_t countOf(const T (&)[N]) {   // reference to array keeps N
          return N;
      }

      // 4) C++20 abbreviated template: each 'auto' parameter is an invented T.
      auto add(auto a, auto b) { return a + b; }

      int main() {
          std::cout << maxOf(3, 7) << "\n";                       // maxOf<int>
          std::cout << maxOf(2.5, 1.5) << "\n";                   // maxOf<double>
          std::cout << maxOf(std::string("pear"), std::string("apple")) << "\n";
          std::cout << maxOf<double>(3, 2.5) << "\n";             // explicit T: no deduction
          std::cout << maxMixed(3, 2.5) << "\n";                  // A=int, B=double -> 3 (as double)
          int arr[] = {4, 8, 15, 16, 23, 42};
          static_assert(countOf(arr) == 6);                       // computed at compile time
          std::cout << add(1, 2.5) << "\n";                       // 3.5
      }
    `, R`
      #include <iostream>

      void f(int)    { std::cout << "#1 f(int)\n"; }
      void f(double) { std::cout << "#2 f(double)\n"; }
      template <class T> void f(T)  { std::cout << "#3 f(T)\n"; }
      template <class T> void f(T*) { std::cout << "#4 f(T*)\n"; }

      int main() {
          int x = 1;
          f(42);      // #1: exact match, non-template beats template #3
          f(4.2);     // #2: exact match, non-template wins again
          f('c');     // #3! T=char is an EXACT match; #1 needs a promotion
          f(2.5f);    // #3: T=float exact beats float->double promotion
          f(&x);      // #4: both #3 (T=int*) and #4 (T=int) exact; T* is more specialized
          f<>(42);    // #3: the empty <> forces "templates only"
      }
    `],
    codeTitle: ['Function templates, explicit T, non-type parameter, abbreviated template', 'Which overload is chosen? (run it in your head first)'],
    viz: [{
      title: 'Template instantiation per type (deduction log)',
      input: 'maxOf(3, 7); maxOf(2.5, 1.5); maxOf("hi"s, "yo"s); maxOf(10, 20); maxOf(3, 2.5); maxOf<double>(3, 2.5); maxOf(\'a\', \'z\'); maxOf("b", "a")',
      inputLabel: 'Calls separated by ";" — literals: 3, 3L, 3u, 2.5, 2.5f, \'c\', true, "hi", "hi"s; optional explicit maxOf<double>(…)',
      gen: instantiationViz
    }, {
      title: 'Which overload is chosen? f(int), f(double), f(T), f(T*)',
      input: 'char',
      inputLabel: 'Argument type: int, unsigned, long, short, char, bool, float, double, int*, const char*, string, vector<int>, Widget',
      gen: overloadViz1
    }],
    examples: [
      { title: 'Fixing a deduction conflict three ways', html: `<p><code>maxOf(3, 2.5)</code> fails: arg 1 says T=int, arg 2 says T=double. Options:</p>
        ${H.table(['fix', 'how', 'trade-off'], [['explicit T', '<code>maxOf&lt;double&gt;(3, 2.5)</code>', 'caller must think about types'], ['cast', '<code>maxOf(3.0, 2.5)</code>', 'simple, local'], ['two parameters', '<code>template&lt;class A, class B&gt; auto maxMixed(A, B)</code>', 'return type becomes <code>common_type</code>; mixing signed/unsigned can surprise']])}
        <p>Result in every case: <b>3</b> (as a double).</p>`, code: R`
        #include <iostream>
        template <typename T> T maxOf(T a, T b) { return a < b ? b : a; }
        int main() { std::cout << maxOf<double>(3, 2.5) << " " << maxOf(3.0, 2.5) << "\n"; }   // 3 3
      ` },
      { title: 'The string-literal trap', html: `<p><code>maxOf("b", "a")</code> compiles with T = <code>const char*</code>. The comparison <code>a &lt; b</code> compares where the two literals sit in memory. The answer depends on the linker — it could print "a"! Fix: pass <code>std::string</code> (<code>"b"s</code>), or add a plain overload <code>const char* maxOf(const char*, const char*)</code> that uses <code>std::strcmp</code>. The plain overload wins the tie because non-templates beat templates on an exact match.</p>`, code: R`
        #include <cstring>
        template <typename T> T maxOf(T a, T b) { return a < b ? b : a; }
        // Plain overload for C strings: preferred over the template on exact match.
        const char* maxOf(const char* a, const char* b) { return std::strcmp(a, b) < 0 ? b : a; }
        int main() { const char* r = maxOf("b", "a"); return r[0] == 'b' ? 0 : 1; }   // "b", by text
      ` },
      { title: 'Predict: f(\'c\') picks the template, not f(int)', html: `<p>Ranks: <code>f(int)</code> needs char → int, a <b>promotion</b>. <code>template f(T)</code> deduces T = char, an <b>exact match</b>. Better rank beats "non-template preference" — the tie-breaker only applies when the ranks are equal. So output is <code>#3 f(T)</code>. This surprises many interviewers' candidates; walk through the ranking table out loud.</p>
        ${H.table(['candidate', 'rank for char'], [['f(int)', 'Promotion'], ['f(double)', 'Conversion'], ['f&lt;char&gt;(T)', '<span class="c-g">Exact ✓ wins</span>'], ['f(T*)', 'deduction fails']])}` },
      { title: 'Templates in headers (and the escape hatch)', html: `<p>If <code>mylib.h</code> only declares <code>template&lt;class T&gt; T twice(T)</code> and the body lives in <code>mylib.cpp</code>, then <code>main.cpp</code> calling <code>twice(3)</code> compiles but the link fails: nobody generated <code>twice&lt;int&gt;</code>. Normal fix: body in the header. Escape hatch for a <b>known, closed</b> set of types: keep the body in the .cpp and add <b>explicit instantiation definitions</b> there, plus <code>extern template</code> declarations in the header to stop other files from re-instantiating.</p>`, code: R`
        template <class T> T twice(T x) { return x + x; }   // (normally in the header)
        template int twice<int>(int);                        // explicit instantiation definition
        template double twice<double>(double);
        // In the header you could add:  extern template int twice<int>(int);
      ` }
    ],
    deepDive: `<p>🟣 <b>Deduction rules precisely.</b> For a parameter <code>T</code> (by value): references are ignored, top-level cv is dropped, arrays and functions decay to pointers. For <code>T&amp;</code>: nothing decays, <code>const</code> is kept (so <code>const int x; f(x)</code> gives T = <code>const int</code>), and an array binds as <code>T = int[6]</code> — that is how <code>countOf</code> recovers N. For <code>T&amp;&amp;</code> with a deduced T (a <b>forwarding reference</b>), an lvalue argument deduces T = <code>int&amp;</code> and reference collapsing turns the parameter into <code>int&amp;</code>. Deduction never applies user conversions; to stop a parameter from taking part, wrap it in a <b>non-deduced context</b>: <code>std::type_identity_t&lt;T&gt;</code> (C++20).</p>
      <p><b>Two-phase lookup.</b> When the template is <i>defined</i>, names that do not depend on T are looked up and checked (phase 1). Names that depend on T are looked up when the template is <i>instantiated</i> (phase 2), including via ADL at the point of instantiation. That is why inside a template you need <code>typename T::value_type</code> (tell the parser "this dependent name is a type") and <code>obj.template get&lt;0&gt;()</code> (tell it "&lt; starts template args, not less-than"). Older MSVC skipped phase 1; <code>/permissive-</code> fixes that.</p>
      <p><b>Overload resolution with templates.</b> Every template that deduces successfully adds one specialization to the candidate set; then ranking is identical to plain functions: Exact &gt; Promotion &gt; Conversion &gt; User-defined &gt; Ellipsis, per argument. Tie-breakers in order: non-template over template; the more specialized template (<b>partial ordering</b>: invent a unique type for one template's parameters and see whether the other can deduce from it); since C++20, the more <b>constrained</b> template. Remember: you cannot partially specialize function templates — overload them instead, and prefer overloading to full specialization of function templates (specializations do not take part in overload resolution, which leads to the famous "Dimov/Abrahams" surprise).</p>
      <p><b>Production reality.</b> Each instantiation is separate machine code: great inlining, but bigger binaries and slower builds. Mitigations: hoist type-independent code into non-template helpers ("thin template" idiom), explicit instantiation + <code>extern template</code> for hot types, precompiled headers, and C++20 modules (templates are parsed once into a binary module interface). Linkers fold identical instantiations (COMDAT / ICF), so <code>maxOf&lt;int&gt;</code> used in 50 files still ends up once in the binary — each template instance is implicitly <code>inline</code> for the ODR.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants generate template boilerplate (generic containers, helper functions) in seconds and are good at turning three copy-pasted functions into one template. <b>Use AI as a partner:</b> ask "list every overload candidate for this call and rank them" or "show me what T deduces to for each of these 6 calls" — then verify with a <code>static_assert(std::is_same_v&lt;…&gt;)</code> or by compiling on Compiler Explorer, which also lets you view the generated instantiations with <code>-fdump-tree</code> or C++ Insights.</p>
      <p><b>Where AI goes wrong:</b> it confidently claims "the non-template always wins" (false when the template is a better match, like <code>f('c')</code>), writes <code>maxOf("b","a")</code> without noticing the pointer comparison, forgets <code>typename</code> before dependent types, and moves template bodies into .cpp files "for cleanliness", producing link errors. <b>What you must still own:</b> the deduction rules, the ranking order, knowing that templates belong in headers, and judging when a template is worth its compile-time cost versus a simple overload or a virtual interface.</p>`,
    problems: [{
      title: 'Generic indexOf that accepts "close enough" types',
      level: 'Easy', tags: ['function template', 'deduction', 'type_identity'], companies: ['Bloomberg', 'Microsoft'],
      statement: `<p>Write <code>indexOf(v, x)</code> that returns the first index of <code>x</code> in vector <code>v</code>, or -1. It must work for any element type with <code>==</code>. Important: <code>indexOf(std::vector&lt;double&gt;{1.5, 3.0}, 3)</code> must compile (3 is an <code>int</code>).</p>`,
      constraints: `0 ≤ v.size() ≤ 10<sup>6</sup>. T supports <code>operator==</code>.`,
      example: `<p><code>indexOf(vector&lt;double&gt;{1.5, 3.0, 4.0}, 3)</code> → ${H.c('g', '1')}. A naive <code>template&lt;class T&gt; int indexOf(const vector&lt;T&gt;&amp;, const T&amp;)</code> fails: from the vector T = double, from <code>3</code> T = int → ${H.c('r', 'conflicting deduction')}.</p>`,
      brute: { why: `<p>Copy-paste one function per type. Works, but every new element type needs another copy, and bug fixes must be repeated in each.</p>`, code: R`
        #include <vector>
        int indexOfInt(const std::vector<int>& v, int x) {
            for (int i = 0; i < (int)v.size(); ++i) if (v[i] == x) return i;
            return -1;
        }
        int indexOfDouble(const std::vector<double>& v, double x) {
            for (int i = 0; i < (int)v.size(); ++i) if (v[i] == x) return i;
            return -1;
        }
      ` },
      mcq: { q: 'Why does <code>indexOf(vector&lt;double&gt;{…}, 3)</code> fail with the naive template?', options: ['Both parameters try to deduce T and disagree (double vs int)', 'int cannot be compared with double', 'vector&lt;double&gt; is not a template', 'Templates cannot take references'], answer: 0, explain: 'Each deducible parameter votes independently and deduction never converts. Make the second parameter a non-deduced context so only the vector decides T.' },
      hints: [`<p>Hint 1: Only the vector should decide what T is. The value should just be <i>converted</i> to T.</p>`, `<p>Hint 2: <code>std::type_identity_t&lt;T&gt;</code> (C++20) is a "non-deduced context": the compiler does not try to deduce T from it, it simply uses the T found elsewhere.</p>`, `<p>Hint 3: Recipe: <code>template&lt;class T&gt; int indexOf(const std::vector&lt;T&gt;&amp; v, const std::type_identity_t&lt;T&gt;&amp; x)</code>; loop with <code>size_t</code>; return -1 when not found. Empty vector → -1.</p>`],
      solution: {
        approach: `<p>Block deduction on the second parameter with <code>std::type_identity_t</code>. T is deduced from the vector alone (T = double), then <code>3</code> converts to <code>3.0</code> normally. One template, every type.</p>`,
        code: R`
          #include <iostream>
          #include <type_traits>
          #include <vector>
          #include <string>

          template <class T>
          int indexOf(const std::vector<T>& v, const std::type_identity_t<T>& x) {
              for (std::size_t i = 0; i < v.size(); ++i)
                  if (v[i] == x) return static_cast<int>(i);   // first match wins
              return -1;                                         // not found (or empty)
          }

          int main() {
              std::vector<double> d{1.5, 3.0, 4.0};
              std::vector<std::string> s{"ab", "cd"};
              std::cout << indexOf(d, 3) << "\n";      // 1  (3 converted to 3.0)
              std::cout << indexOf(s, "cd") << "\n";   // 1  (const char* -> std::string)
              std::cout << indexOf(d, 9) << "\n";      // -1
          }
        `,
        dry: { head: ['call', 'T from vector', 'T from x?', 'x converted to', 'result'], rows: [
          ['indexOf(d, 3)', 'double', 'not deduced', '3.0', '1'],
          ['indexOf(s, "cd")', 'std::string', 'not deduced', 'std::string("cd")', '1'],
          ['indexOf(d, 9)', 'double', 'not deduced', '9.0', '-1']
        ] },
        complexity: `<p>O(n) time, O(1) extra space. One instantiation per element type.</p>`,
        followUps: ['How would you write this before C++20 (hint: your own <code>template&lt;class T&gt; struct identity { using type = T; };</code>)?', 'Generalize to any range with <code>std::ranges::find</code> and a concept.', 'What changes if T is a type with an expensive <code>==</code>?']
      }
    }]
  });
registerModule({ id: 'cpp09', title: 'Templates, SFINAE & Concepts', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
