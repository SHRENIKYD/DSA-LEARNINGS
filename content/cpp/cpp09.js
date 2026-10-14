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

  /* ======================================================================
     TOPIC 2 — Class templates, full & partial specialization
     ====================================================================== */
  var SPECS = [
    { id: 0, sig: 'TypeName<T>  (primary)', kind: 'primary', match: function (t) { return { T: tstr(t) }; }, make: function () { return 'unknown'; } },
    { id: 1, sig: 'TypeName<int>  (full)', kind: 'full', match: function (t) { return t.k === 'name' && t.n === 'int' ? {} : null; }, make: function () { return 'int'; } },
    { id: 2, sig: 'TypeName<double>  (full)', kind: 'full', match: function (t) { return t.k === 'name' && t.n === 'double' ? {} : null; }, make: function () { return 'double'; } },
    { id: 3, sig: 'TypeName<bool>  (full)', kind: 'full', match: function (t) { return t.k === 'name' && t.n === 'bool' ? {} : null; }, make: function () { return 'bool'; } },
    { id: 4, sig: 'TypeName<std::string>  (full)', kind: 'full', match: function (t) { return t.k === 'name' && t.n === 'std::string' ? {} : null; }, make: function () { return 'string'; } },
    { id: 5, sig: 'TypeName<T*>  (partial)', kind: 'partial', match: function (t) { return t.k === 'ptr' ? { T: t.of } : null; }, make: function (r) { return 'pointer to ' + r[0]; } },
    { id: 6, sig: 'TypeName<const T>  (partial)', kind: 'partial', match: function (t) { return t.k === 'const' ? { T: t.of } : null; }, make: function (r) { return 'const ' + r[0]; } },
    { id: 7, sig: 'TypeName<const T*>  (partial)', kind: 'partial', beats: [5], match: function (t) { return t.k === 'ptr' && t.of.k === 'const' ? { T: t.of.of } : null; }, make: function (r) { return 'pointer to const ' + r[0]; } },
    { id: 8, sig: 'TypeName<std::vector<T>>  (partial)', kind: 'partial', match: function (t) { return t.k === 'vec' ? { T: t.of } : null; }, make: function (r) { return 'vector of ' + r[0]; } },
    { id: 9, sig: 'TypeName<std::pair<A, B>>  (partial)', kind: 'partial', match: function (t) { return t.k === 'pair' ? { A: t.a, B: t.b } : null; }, make: function (r) { return 'pair of ' + r[0] + ' and ' + r[1]; } },
    { id: 10, sig: 'TypeName<std::pair<T, T>>  (partial)', kind: 'partial', beats: [9], match: function (t) { return t.k === 'pair' && same(t.a, t.b) ? { T: t.a } : null; }, make: function (r) { return 'pair of two ' + r[0]; } }
  ];
  function specViz(input) {
    var root = parseType(input === undefined ? 'vector<const int*>' : input);
    var frames = [], chain = [], results = [];
    function dshow(d) { return Object.keys(d).map(function (k) { return k + ' = ' + (typeof d[k] === 'string' ? d[k] : tstr(d[k])); }).join(', '); }
    function chainPart(curIdx) {
      var h = {}; if (curIdx !== undefined) h[curIdx] = 'cur';
      return { type: 'stack', label: 'Instantiation chain (each one needs the next)', items: chain.map(function (c) { return 'TypeName<' + c + '>'; }), hl: h };
    }
    function visit(t, depth) {
      if (depth > 6) throw new Error('Type too deep for this demo (max 6 levels)');
      var ts = tstr(t);
      chain.push(ts);
      var rows = SPECS.map(function (s) { return [String(s.id), s.sig, 'not checked yet', '']; });
      frames.push({ narr: 'Need <code>TypeName&lt;' + E(ts) + '&gt;</code>. The compiler looks at the <b>primary template</b> plus every <b>specialization</b> it has seen, and tries to match the type against each pattern.', parts: [chainPart(chain.length - 1), { type: 'table', label: 'Specializations for TypeName&lt;' + E(ts) + '&gt;', columns: ['#', 'pattern', 'matches?', 'deduced'], rows: rows }] });
      var matches = [], hl = {};
      SPECS.forEach(function (s, i) {
        if (s.kind === 'primary') { rows[i][2] = 'fallback'; return; }
        var d = s.match(t);
        if (d) { rows[i][2] = 'YES'; rows[i][3] = dshow(d) || '(exact type)'; matches.push({ s: s, d: d, i: i }); hl[i] = 'ok'; }
        else { rows[i][2] = 'no'; hl[i] = 'done'; }
      });
      frames.push({ narr: 'Pattern matching done: ' + (matches.length ? '<b>' + matches.length + '</b> specialization(s) match <code>' + E(ts) + '</code>.' : 'no specialization matches, so the <b>primary template</b> is used.') + ' A full specialization matches only one exact type; a partial specialization is a pattern with holes (T, A, B) that get deduced.', parts: [chainPart(chain.length - 1), { type: 'table', label: 'Specializations for TypeName&lt;' + E(ts) + '&gt;', columns: ['#', 'pattern', 'matches?', 'deduced'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
      var pick, why;
      var full = matches.filter(function (m) { return m.s.kind === 'full'; });
      if (full.length) { pick = full[0]; why = 'An <b>explicit (full) specialization</b> for exactly this type exists — it is used as-is.'; }
      else if (matches.length === 1) { pick = matches[0]; why = 'Exactly one partial specialization matches → it is chosen.'; }
      else if (matches.length > 1) {
        var best = matches.filter(function (m) { return !matches.some(function (o) { return o !== m && (o.s.beats || []).indexOf(m.s.id) >= 0; }); });
        pick = best[0];
        why = 'Several partial specializations match. <b>Partial ordering</b>: <code>' + E(pick.s.sig.split('  ')[0]) + '</code> accepts a <i>subset</i> of what the other accepts, so it is <b>more specialized</b> and wins. (If neither were more specialized → "ambiguous partial specialization" error.)';
      } else { pick = { s: SPECS[0], d: {}, i: 0 }; why = 'Nothing matched → the <b>primary template</b> is instantiated.'; }
      var hl2 = {}; matches.forEach(function (m) { hl2[m.i] = 'done'; }); hl2[pick.i] = 'sel';
      rows[pick.i][2] = 'CHOSEN';
      frames.push({ narr: why, parts: [chainPart(chain.length - 1), { type: 'table', label: 'Specializations for TypeName&lt;' + E(ts) + '&gt;', columns: ['#', 'pattern', 'matches?', 'deduced'], rows: rows, hl: hl2 }] });
      var inner = [];
      if (pick.s.kind === 'partial') {
        Object.keys(pick.d).forEach(function (k) { inner.push(visit(pick.d[k], depth + 1)); });
      }
      var res = pick.s.make(inner);
      results.push([ts, pick.s.sig.split('  ')[0], res]);
      chain.pop();
      frames.push({ narr: '<code>TypeName&lt;' + E(ts) + '&gt;::get()</code> returns <b>"' + E(res) + '"</b>' + (inner.length ? ' — built from the answer(s) of the inner instantiation(s).' : '.') + ' The chain unwinds one level.', parts: [chainPart(), { type: 'table', label: 'Finished instantiations', columns: ['type', 'specialization used', 'get() returns'], rows: results.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[results.length - 1] = 'ok'; return h; })() }] });
      return res;
    }
    var final = visit(root, 0);
    frames.push({ narr: 'Done. <code>TypeName&lt;' + E(tstr(root)) + '&gt;::get()</code> = <b>"' + E(final) + '"</b>. All of this happened at <b>compile time</b>; ' + results.length + ' class(es) were instantiated, and at run time only string concatenation is left.', parts: [{ type: 'table', label: 'All instantiations', columns: ['type', 'specialization used', 'get() returns'], rows: results }, note('<b>Try:</b> <code>pair&lt;int, int&gt;</code>, <code>pair&lt;int, double&gt;</code>, <code>const int* const</code>, <code>vector&lt;vector&lt;bool&gt;&gt;</code>, <code>double**</code>, <code>char</code> (falls back to the primary).', 'Experiment')] });
    return frames;
  }

  topics.push({
    title: 'Class Templates, Full & Partial Specialization',
    analogy: `<p>A <b>rental car company</b> has one standard contract (the <b>primary template</b>) that works for any car. For one particular model, the Tesla, they wrote a completely separate contract (a <b>full specialization</b> — one exact type). And for "any car with a trailer" they have a contract <i>pattern</i> that still leaves the car model blank (a <b>partial specialization</b> — a family of types like <code>T*</code> or <code>vector&lt;T&gt;</code>). When you rent, the clerk picks the <b>most specific</b> contract that fits you.</p>`,
    explain: `<p>🟢 <b>Class templates</b> are blueprints for types: <code>std::vector&lt;T&gt;</code>, <code>std::map&lt;K, V&gt;</code>, <code>std::array&lt;T, N&gt;</code>. You write the class once with placeholders; <code>Stack&lt;int&gt;</code> and <code>Stack&lt;std::string&gt;</code> become two completely separate classes (each with its own static members).</p>
      <pre>template &lt;typename T, std::size_t Cap = 16&gt;   // type param + value param with default
class Stack { T data_[Cap]; std::size_t n_ = 0; public: void push(const T&amp; x); /* … */ };</pre>
      <p><b>Lazy members:</b> a member function of a class template is only instantiated if it is <i>used</i>. So <code>Stack&lt;Widget&gt;</code> compiles even if <code>print()</code> needs <code>operator&lt;&lt;</code> that Widget lacks — as long as nobody calls <code>print()</code>.</p>
      <p><b>CTAD (C++17)</b>: class template argument deduction lets you skip the angle brackets when the constructor makes the types obvious: <code>std::pair p{1, 2.5};</code> → <code>pair&lt;int, double&gt;</code>, <code>std::vector v{1, 2, 3};</code> → <code>vector&lt;int&gt;</code>. You can add <b>deduction guides</b> to teach it new tricks.</p>
      <p><b>Specialization</b> = "for these types, use a different implementation":</p>
      ${H.table(['kind', 'syntax', 'matches', 'real-world example'], [['primary', '<code>template&lt;class T&gt; struct Hash</code>', 'anything (fallback)', '—'], ['full (explicit)', '<code>template&lt;&gt; struct Hash&lt;bool&gt;</code>', 'exactly <code>bool</code>', '<code>std::hash&lt;int&gt;</code>, <code>std::vector&lt;bool&gt;</code>'], ['partial', '<code>template&lt;class T&gt; struct Hash&lt;T*&gt;</code>', 'every pointer type', '<code>std::unique_ptr&lt;T[]&gt;</code>, <code>std::iterator_traits&lt;T*&gt;</code>']])}
      <p><b>How the compiler chooses</b>: (1) is there a full specialization for exactly this type? use it. (2) Otherwise find all partial specializations whose pattern matches; if one is <b>more specialized</b> than all others (accepts a strict subset), use it; if two match and neither is more specialized → ambiguity error. (3) Nothing matched → the primary template.</p>
      <p>⚠️ <b>Function templates can be fully specialized but never partially specialized.</b> For "a different version for all pointers" with functions, write an <b>overload</b> <code>template&lt;class T&gt; void f(T*)</code> instead.</p>`,
    clues: [
      '"Generic container / wrapper that works for any element type" → class template',
      '"Special handling for one type" (bool packing, C strings) → full specialization',
      '"Special handling for every pointer / every vector / every pair" → partial specialization',
      '"Compute something about a type at compile time" → class template + specializations = a type trait',
      '"Why is <code>std::vector&lt;bool&gt;</code> weird?" → it is a space-optimized full specialization returning proxy references',
      '"<code>std::pair p{1, 2.5}</code> without angle brackets — how?" → CTAD / deduction guides'
    ],
    code: [R`
      #include <iostream>
      #include <string>
      #include <vector>
      #include <utility>

      // Primary template: the fallback for any type nobody specialized.
      template <class T> struct TypeName { static std::string get() { return "unknown"; } };

      // Full specializations: exactly one type each.
      template <> struct TypeName<int>         { static std::string get() { return "int"; } };
      template <> struct TypeName<double>      { static std::string get() { return "double"; } };
      template <> struct TypeName<bool>        { static std::string get() { return "bool"; } };
      template <> struct TypeName<std::string> { static std::string get() { return "string"; } };

      // Partial specializations: patterns with holes. They recurse on the hole.
      template <class T> struct TypeName<T*>       { static std::string get() { return "pointer to " + TypeName<T>::get(); } };
      template <class T> struct TypeName<const T>  { static std::string get() { return "const " + TypeName<T>::get(); } };
      template <class T> struct TypeName<const T*> { static std::string get() { return "pointer to const " + TypeName<T>::get(); } };
      template <class T> struct TypeName<std::vector<T>> { static std::string get() { return "vector of " + TypeName<T>::get(); } };
      template <class A, class B> struct TypeName<std::pair<A, B>> {
          static std::string get() { return "pair of " + TypeName<A>::get() + " and " + TypeName<B>::get(); }
      };
      template <class T> struct TypeName<std::pair<T, T>> {    // more specialized than pair<A,B>
          static std::string get() { return "pair of two " + TypeName<T>::get(); }
      };

      int main() {
          std::cout << TypeName<std::vector<const int*>>::get() << "\n"; // vector of pointer to const int
          std::cout << TypeName<std::pair<int, int>>::get() << "\n";     // pair of two int
          std::cout << TypeName<const int* const>::get() << "\n";        // const pointer to const int
          std::cout << TypeName<char>::get() << "\n";                    // unknown
      }
    `, R`
      #include <cstddef>
      #include <iostream>
      #include <stdexcept>
      #include <string>

      // A fixed-capacity stack: type parameter + non-type parameter with a default.
      template <typename T, std::size_t Cap = 8>
      class Stack {
          T data_[Cap]{};
          std::size_t n_ = 0;
      public:
          inline static int instances = 0;            // one counter PER instantiation
          Stack() { ++instances; }
          void push(const T& x);                      // defined out of class below
          T pop() { if (n_ == 0) throw std::underflow_error("empty"); return data_[--n_]; }
          bool empty() const { return n_ == 0; }
          void print() const {                        // only compiled if somebody calls it
              for (std::size_t i = 0; i < n_; ++i) std::cout << data_[i] << ' ';
              std::cout << "\n";
          }
      };

      // Out-of-class member definition: repeat the template header and use Stack<T, Cap>::
      template <typename T, std::size_t Cap>
      void Stack<T, Cap>::push(const T& x) {
          if (n_ == Cap) throw std::overflow_error("full");
          data_[n_++] = x;
      }

      struct Widget {};                                // no operator<< — still OK if print() unused

      int main() {
          Stack<int> a, b;                             // Stack<int, 8>
          Stack<std::string, 2> s;
          Stack<Widget> w;  w.push(Widget{});          // fine: print() never instantiated
          a.push(1); a.push(2); a.print();             // 1 2
          s.push("hi");
          std::cout << Stack<int>::instances << " " << Stack<std::string, 2>::instances << "\n"; // 2 1
      }
    `],
    codeTitle: ['Primary + full + partial specializations (the visualizer runs this logic)', 'A class template with a non-type parameter, out-of-class members and per-type statics'],
    viz: {
      title: 'Which specialization is chosen? (TypeName<T>, step by step)',
      input: 'vector<const int*>',
      inputLabel: 'A type: int, double, bool, char, string, Widget with const, *, vector<…>, pair<…, …> — e.g. pair<int, int>, const int* const',
      gen: specViz
    },
    examples: [
      { title: 'Per-instantiation static members', html: `<p><code>Stack&lt;int&gt;::instances</code> and <code>Stack&lt;double&gt;::instances</code> are <b>different variables</b> — different instantiations are unrelated classes. Interview trap: "a static counter in a class template counts objects of all types" — false, it counts per T (and per Cap!).</p>
        ${H.table(['object', 'class', 'counter it bumps'], [['<code>Stack&lt;int&gt; a, b</code>', 'Stack&lt;int, 8&gt;', 'Stack&lt;int,8&gt;::instances → 2'], ['<code>Stack&lt;std::string, 2&gt; s</code>', 'Stack&lt;string, 2&gt;', 'its own → 1']])}` },
      { title: 'CTAD and a deduction guide', html: `<p>CTAD deduces template arguments from constructor arguments. A <b>deduction guide</b> adds a rule: here, constructing <code>Named</code> from a string literal should give <code>Named&lt;std::string&gt;</code>, not <code>Named&lt;const char*&gt;</code>.</p>`, code: R`
        #include <string>
        #include <type_traits>
        template <class T> struct Named { T value; Named(T v) : value(v) {} };
        Named(const char*) -> Named<std::string>;            // deduction guide
        int main() {
            Named a{42};                                     // Named<int>
            Named b{"hello"};                                // Named<std::string> thanks to the guide
            static_assert(std::is_same_v<decltype(a), Named<int>>);
            static_assert(std::is_same_v<decltype(b), Named<std::string>>);
        }
      ` },
      { title: 'Ambiguous partial specializations', html: `<p>Two patterns, <code>Pair&lt;T, int&gt;</code> and <code>Pair&lt;int, T&gt;</code>. For <code>Pair&lt;int, int&gt;</code> both match and <b>neither is more specialized</b> (each accepts types the other rejects) → error "ambiguous partial specializations". Fix: add a third, more specialized one for <code>Pair&lt;int, int&gt;</code> (a full specialization).</p>`, code: R`
        template <class A, class B> struct Pair            { static constexpr int id = 0; };
        template <class T>          struct Pair<T, int>    { static constexpr int id = 1; };
        template <class T>          struct Pair<int, T>    { static constexpr int id = 2; };
        template <>                 struct Pair<int, int>  { static constexpr int id = 3; };  // breaks the tie
        static_assert(Pair<double, int>::id == 1 && Pair<int, char>::id == 2 && Pair<int, int>::id == 3);
      ` },
      { title: 'Functions: overload instead of partial specialization', html: `<p>You cannot write <code>template&lt;class T&gt; void show&lt;T*&gt;(T*)</code>. Write an overload. And a full specialization of a function template is chosen only <i>after</i> its primary template wins overload resolution — so it can be surprisingly ignored. Rule of thumb: <b>overload functions, specialize classes</b>.</p>`, code: R`
        #include <iostream>
        template <class T> void show(T)  { std::cout << "any\n"; }
        template <class T> void show(T*) { std::cout << "pointer\n"; }   // overload, not a specialization
        int main() { int x = 0; show(x); show(&x); }                      // any, pointer
      ` }
    ],
    deepDive: `<p>🟣 <b>Partial ordering of class specializations</b> is defined by rewriting each partial specialization as an imaginary function template (<code>template&lt;class T&gt; void f(X&lt;T*&gt;)</code>) and asking which one can deduce from the other with invented unique types. <code>const T*</code> vs <code>T*</code>: from <code>const U*</code> you can deduce <code>T*</code> (T = const U), but from <code>U*</code> you cannot deduce <code>const T*</code> → <code>const T*</code> is more specialized. Same machinery as function template partial ordering.</p>
      <p><b>Where specializations must appear:</b> a specialization must be declared before the first use that would cause an implicit instantiation, otherwise the program is ill-formed (often no diagnostic required). Specializations of <code>std</code> templates are only allowed for program-defined types and only for templates that permit it (<code>std::hash</code>, <code>std::formatter</code>, <code>std::tuple_size</code>…); specializing type traits like <code>std::is_integral</code> is undefined behavior.</p>
      <p><b>Instantiation details:</b> implicit instantiation of a class instantiates member <i>declarations</i> but not member <i>definitions</i>; definitions appear on use. Explicit instantiation (<code>template class Stack&lt;int&gt;;</code>) instantiates every member, which is a cheap way to find members that do not compile for a type. Inside a class template the bare name <code>Stack</code> is the <b>injected-class-name</b> and means <code>Stack&lt;T, Cap&gt;</code>. Dependent base classes are not searched by unqualified lookup — use <code>this-&gt;member</code> or <code>Base&lt;T&gt;::member</code>.</p>
      <p><b>Real-world:</b> <code>std::vector&lt;bool&gt;</code> is the cautionary tale: a full specialization that packs bits and returns a proxy instead of <code>bool&amp;</code>, so it is not a real container (<code>auto&amp; r = v[0]</code> fails, threads writing neighbouring elements race). Specialize for <b>performance or correctness</b>, but keep the same interface semantics.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants quickly scaffold class templates, specializations, deduction guides and <code>std::formatter</code> / <code>std::hash</code> specializations for your types. <b>Use AI as a partner:</b> ask it "which specialization of X is chosen for these 6 types and why?", then lock the answers into <code>static_assert</code>s so a refactor cannot silently change them.</p>
      <p><b>Where AI goes wrong:</b> it tries to <i>partially specialize a function template</i> (does not compile), specializes <code>std::is_integral</code> (UB), creates ambiguous partial specializations, or forgets that a static member of a class template is per instantiation. It also tends to reach for specialization when a simple <code>if constexpr</code> branch inside one template would be clearer. <b>What you must still own:</b> the selection rules (full → most specialized partial → primary), the "overload functions, specialize classes" rule, and the judgment of whether a specialization keeps the same semantics as the primary.</p>`,
    problems: [{
      title: 'Serializer<T> with full and partial specializations',
      level: 'Medium', tags: ['class template', 'full specialization', 'partial specialization'], companies: ['Google', 'Jane Street'],
      statement: `<p>Write <code>Serializer&lt;T&gt;::str(const T&amp;)</code> returning a string: numbers via <code>std::to_string</code>; <code>bool</code> as <code>true</code>/<code>false</code>; <code>std::string</code> wrapped in quotes; <code>std::vector&lt;T&gt;</code> as <code>[a, b, c]</code> using the element's serializer (so nesting works).</p>`,
      constraints: `Element types: arithmetic, bool, std::string, or vectors of those (any depth).`,
      example: `<p><code>Serializer&lt;vector&lt;vector&lt;bool&gt;&gt;&gt;::str({{true},{false,true}})</code> → ${H.c('g', '[[true], [false, true]]')}. The outer vector uses the vector partial specialization, which calls <code>Serializer&lt;vector&lt;bool&gt;&gt;</code>, which calls the <code>bool</code> full specialization.</p>`,
      brute: { why: `<p>One free function per concrete type: <code>strInt</code>, <code>strBool</code>, <code>strVecInt</code>, <code>strVecVecBool</code>… The number of functions explodes with nesting depth, and nested vectors are impossible to cover in general.</p>`, code: R`
        #include <string>
        #include <vector>
        std::string strInt(int x) { return std::to_string(x); }
        std::string strVecInt(const std::vector<int>& v) {
            std::string s = "[";
            for (std::size_t i = 0; i < v.size(); ++i) s += (i ? ", " : "") + strInt(v[i]);
            return s + "]";
        }
      ` },
      mcq: { q: 'For <code>Serializer&lt;std::vector&lt;bool&gt;&gt;</code>, which is chosen?', options: ['The partial specialization for <code>std::vector&lt;T&gt;</code> with T = bool', 'The full specialization for <code>bool</code>', 'The primary template', 'Ambiguous'], answer: 0, explain: 'The pattern <code>vector&lt;T&gt;</code> matches with T = bool; the <code>bool</code> specialization only matches exactly <code>bool</code>. Inside, elements are serialized with <code>Serializer&lt;bool&gt;</code>.' },
      hints: [`<p>Hint 1: Primary template = the number case (<code>std::to_string</code>). Everything else is a specialization.</p>`, `<p>Hint 2: <code>template&lt;&gt; struct Serializer&lt;bool&gt;</code> and <code>template&lt;&gt; struct Serializer&lt;std::string&gt;</code> are full specializations; <code>template&lt;class T&gt; struct Serializer&lt;std::vector&lt;T&gt;&gt;</code> is partial.</p>`, `<p>Hint 3: Inside the vector version call <code>Serializer&lt;T&gt;::str(v[i])</code> — recursion through instantiation. Iterate with an index; note <code>vector&lt;bool&gt;::operator[]</code> returns a proxy that converts to bool, which is fine for a <code>const bool&amp;</code> parameter. Empty vector → "[]".</p>`],
      solution: {
        approach: `<p>Primary template handles arithmetic types. Two full specializations override bool and string. One partial specialization covers every vector and delegates each element to <code>Serializer&lt;T&gt;</code>, so any nesting depth works automatically.</p>`,
        code: R`
          #include <iostream>
          #include <string>
          #include <vector>

          template <class T>
          struct Serializer {                                   // primary: numbers
              static std::string str(const T& x) { return std::to_string(x); }
          };
          template <>
          struct Serializer<bool> {                             // full specialization
              static std::string str(const bool& b) { return b ? "true" : "false"; }
          };
          template <>
          struct Serializer<std::string> {                      // full specialization
              static std::string str(const std::string& s) { return "\"" + s + "\""; }
          };
          template <class T>
          struct Serializer<std::vector<T>> {                   // partial specialization
              static std::string str(const std::vector<T>& v) {
                  std::string out = "[";
                  for (std::size_t i = 0; i < v.size(); ++i) {
                      if (i) out += ", ";
                      out += Serializer<T>::str(v[i]);          // recurse on the element type
                  }
                  return out + "]";
              }
          };
          template <class T> std::string serialize(const T& x) { return Serializer<T>::str(x); }

          int main() {
              std::cout << serialize(42) << "\n";                                        // 42
              std::cout << serialize(std::vector<std::string>{"a", "b"}) << "\n";        // ["a", "b"]
              std::cout << serialize(std::vector<std::vector<bool>>{{true}, {false, true}}) << "\n";
          }
        `,
        dry: { head: ['instantiation needed', 'chosen', 'why', 'returns'], rows: [
          ['Serializer&lt;vector&lt;vector&lt;bool&gt;&gt;&gt;', 'vector&lt;T&gt; partial', 'pattern matches, T = vector&lt;bool&gt;', '[[true], [false, true]]'],
          ['Serializer&lt;vector&lt;bool&gt;&gt;', 'vector&lt;T&gt; partial', 'T = bool', '[true] and [false, true]'],
          ['Serializer&lt;bool&gt;', 'full specialization', 'exact type bool', 'true / false'],
          ['Serializer&lt;int&gt;', 'primary', 'no specialization matches', 'std::to_string']
        ] },
        complexity: `<p>Run time O(total characters). Compile time: one class per distinct type in the nesting.</p>`,
        followUps: ['Add <code>std::map&lt;K, V&gt;</code> support as <code>{k: v}</code>.', 'Rewrite with a single function template and <code>if constexpr</code> — which is clearer?', 'Add a <code>std::optional&lt;T&gt;</code> partial specialization printing <code>null</code>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Variadic templates & fold expressions
     ====================================================================== */
  function variadicViz(input) {
    var s = String(input === undefined ? '1, 2.5, "hi", \'c\', true' : input).trim();
    if (!s) throw new Error('Type some arguments, e.g. 1, 2.5, "hi", \'c\', true');
    var args = splitTop(s).map(function (x) { return x.trim(); }).filter(Boolean);
    if (args.length > 8) throw new Error('Use at most 8 arguments');
    var types = args.map(litType);
    var frames = [], out = [], stackItems = [];
    var recCode = 'void print() {}                          // base case: empty pack\n\ntemplate <class T, class... Rest>\nvoid print(const T& first, const Rest&... rest) {\n    std::cout << first << \' \';           // use the head\n    print(rest...);                       // recurse on the tail\n}';
    function show(v) { return v; }
    function outPart() { return { type: 'text', label: 'Console output', html: out.length ? '<code>' + E(out.join(' ')) + '</code>' : '<span class="c-m">(nothing yet)</span>' }; }
    frames.push({ narr: 'A <b>parameter pack</b> is a bag of zero or more arguments of possibly different types. <code>print(' + E(args.join(', ')) + ')</code> captures <b>' + args.length + '</b> arguments: <code>Rest... = {' + E(types.join(', ')) + '}</code>. <code>sizeof...(args)</code> = ' + args.length + ' (computed at compile time).', parts: [
      { type: 'array', label: 'the pack (value; type below)', values: args.map(show), idxLabels: types, showIdx: true },
      { type: 'vars', label: 'compile-time facts', vals: { 'sizeof...(args)': args.length, 'distinct types': types.filter(function (t, i) { return types.indexOf(t) === i; }).length } }
    ] });
    // recursive peeling
    for (var k = 0; k <= args.length; k++) {
      var rest = args.slice(k), restT = types.slice(k);
      var hl = {}, ptr = {};
      for (var j = 0; j < args.length; j++) hl[j] = j < k ? 'done' : (j === k ? 'cur' : 'win');
      if (k < args.length) ptr[k] = 'first';
      if (k < args.length) {
        stackItems.push('print<' + restT.join(', ') + '>');
        out.push(args[k].replace(/^"(.*)"s?$/, '$1').replace(/^'(.)'$/, '$1').replace(/^true$/, '1').replace(/^false$/, '0'));
        frames.push({ narr: 'Call #' + (k + 1) + ': <code>print&lt;' + E(restT.join(', ')) + '&gt;</code> — a <b>new instantiation</b> for this exact list of types. <code>first</code> = <b>' + E(args[k]) + '</b> (' + E(types[k]) + '), and <code>rest...</code> holds the other ' + (rest.length - 1) + '. Print the head, then call <code>print(rest...)</code> — the pack shrinks by one.', parts: [
          { type: 'array', label: 'pack at this level', values: args.slice(), hl: hl, ptr: ptr, idxLabels: types },
          { type: 'stack', label: 'call stack = instantiation chain', items: stackItems.slice(), hl: (function () { var h = {}; h[stackItems.length - 1] = 'cur'; return h; })() },
          { type: 'code', label: 'running', lang: 'cpp', code: recCode, hl: { 5: 'cur', 6: 'ok' } },
          outPart()
        ] });
      } else {
        stackItems.push('print()');
        frames.push({ narr: 'The pack is <b>empty</b>, so <code>print(rest...)</code> expands to <code>print()</code> — the non-template <b>base case</b>. Without it you get "no matching function for call to print()". (Alternative: guard the recursion with <code>if constexpr (sizeof...(rest) &gt; 0)</code>.)', parts: [
          { type: 'array', label: 'pack at this level', values: args.slice(), hl: hl },
          { type: 'stack', label: 'call stack = instantiation chain', items: stackItems.slice(), hl: (function () { var h = {}; h[stackItems.length - 1] = 'ok'; return h; })() },
          { type: 'code', label: 'running', lang: 'cpp', code: recCode, hl: { 1: 'ok' } },
          outPart()
        ] });
      }
    }
    frames.push({ narr: 'The recursion unwinds. Cost check: the recursive style generated <b>' + (args.length + 1) + '</b> functions (one per pack size). Each is tiny and gets inlined, but compile time grows with the number of distinct argument lists — that is why C++17 added <b>fold expressions</b>.', parts: [
      { type: 'table', label: 'Instantiations created by the recursive version', columns: ['#', 'function'], rows: stackItems.map(function (x, i) { return [String(i + 1), x]; }) }, outPart()
    ] });
    // fold expansion
    var pattern = args.map(function (a, i) { return '(std::cout << a' + (i + 1) + " << ' ')"; });
    frames.push({ narr: '<b>Fold expression</b> version: <code>((std::cout &lt;&lt; args &lt;&lt; \' \'), ...);</code>. The compiler <b>copies the pattern once per pack element</b> and joins the copies with the comma operator — one single function, no recursion, left-to-right order guaranteed by the comma.', parts: [
      { type: 'array', label: 'pack', values: args.slice(), idxLabels: types, hl: (function () { var h = {}; args.forEach(function (_, i) { h[i] = 'ok'; }); return h; })() },
      { type: 'array', label: 'pattern expanded per element', values: pattern, hl: (function () { var h = {}; pattern.forEach(function (_, i) { h[i] = 'win'; }); return h; })() },
      { type: 'code', label: 'what the compiler effectively writes', lang: 'cpp', code: pattern.join(',\n') + ';' }
    ] });
    // sum fold
    var nums = args.map(function (a, i) {
      var t = types[i];
      if (t === 'bool') return a === 'true' ? 1 : 0;
      if (t === 'char') return a.charCodeAt(1);
      if (t === 'std::string' || t === 'const char*') return null;
      return parseFloat(a);
    });
    if (nums.some(function (v) { return v === null; })) {
      var bi = nums.indexOf(null);
      frames.push({ narr: 'Now try <code>(args + ...)</code> (a <b>unary right fold</b> over +). It expands to <code>a1 + (a2 + (… + aN))</code>. But element ' + (bi + 1) + ' is <b>' + E(args[bi]) + '</b> (' + E(types[bi]) + '): ' + (types[bi] === 'const char*' ? 'adding a number to a <code>const char*</code> is <i>pointer arithmetic</i> and adding two pointers is an error' : 'mixing <code>std::string</code> with numbers has no <code>operator+</code>') + ' → <span class="c-r">compile error inside the expansion</span>. Concepts (topic 6) let you reject such calls up front with a clear message.', parts: [
        { type: 'array', label: 'pack', values: args.slice(), idxLabels: types, hl: (function () { var h = {}; h[bi] = 'bad'; return h; })() },
        { type: 'code', label: 'expansion', lang: 'cpp', code: 'return (args + ...);   // => ' + args.join(' + (') + new Array(args.length).join(')') },
        note('<span class="c-r">error: invalid operands to binary expression</span>', 'Compiler says')
      ] });
    } else {
      var acc = nums[nums.length - 1], steps = [];
      frames.push({ narr: '<code>return (args + ...);</code> is a <b>unary right fold</b>: <code>' + E(args.join(' + (')) + new Array(args.length).join(')') + '</code>. It is evaluated from the <b>innermost</b> (rightmost) parenthesis outward.', parts: [
        { type: 'array', label: 'pack (numeric values after promotion)', values: nums.map(String), idxLabels: types, hl: (function () { var h = {}; h[nums.length - 1] = 'cur'; return h; })() },
        { type: 'vars', label: 'accumulator', vals: { acc: acc } }
      ] });
      for (var r = nums.length - 2; r >= 0; r--) {
        acc = +(nums[r] + acc).toFixed(6);
        steps.push(acc);
        var h3 = {}; for (var q = r; q < nums.length; q++) h3[q] = q === r ? 'cur' : 'win';
        frames.push({ narr: 'Fold step: <b>' + nums[r] + ' + (' + (+(acc - nums[r]).toFixed(6)) + ')</b> = <b>' + acc + '</b>. The window of already-combined elements grows to the left.', parts: [
          { type: 'array', label: 'pack', values: nums.map(String), idxLabels: types, hl: h3 },
          { type: 'bars', label: 'partial sums produced so far', values: steps.slice() },
          { type: 'vars', label: 'accumulator', vals: { acc: acc }, hl: { acc: 'ok' } }
        ] });
      }
      frames.push({ narr: 'Result <b>' + acc + '</b> with type <code>' + E(types.indexOf('double') >= 0 ? 'double' : types.indexOf('float') >= 0 ? 'float' : types.indexOf('long') >= 0 ? 'long' : types.indexOf('unsigned') >= 0 ? 'unsigned' : 'int') + '</code> (usual arithmetic conversions). Left fold <code>(... + args)</code> would group as <code>((a1 + a2) + a3)…</code> — same sum here, but it matters for non-associative operators like <code>-</code> or <code>/</code>, and for an <b>empty pack</b> a unary + fold is an error (only <code>&amp;&amp;</code>, <code>||</code> and <code>,</code> have empty defaults). Use a binary fold <code>(args + ... + 0)</code> to allow zero arguments.', parts: [
        { type: 'table', label: 'The four fold forms', columns: ['form', 'syntax', 'expands to (3 args)'], rows: [['unary right', '(E op ...)', 'a1 op (a2 op a3)'], ['unary left', '(... op E)', '(a1 op a2) op a3'], ['binary right', '(E op ... op I)', 'a1 op (a2 op (a3 op I))'], ['binary left', '(I op ... op E)', '((I op a1) op a2) op a3']] },
        { type: 'vars', label: 'answer', vals: { 'sum': acc }, hl: { sum: 'sel' } }
      ] });
    }
    return frames;
  }

  topics.push({
    title: 'Variadic Templates, Pack Expansion & Fold Expressions',
    analogy: `<p>Picture a <b>conveyor belt at airport security</b> carrying a mix of items: a laptop, a bag, shoes, a phone. The scanner does not need to know in advance how many items or what kinds. A <b>parameter pack</b> is that belt: zero or more arguments, each with its own type. <b>Pack expansion</b> is the scanner applying the same check to every item; a <b>fold expression</b> is the officer adding up a running total ("2 bags + 1 laptop + …") in one sweep.</p>`,
    explain: `<p>🟢 A <b>variadic template</b> takes any number of template arguments:</p>
      <pre>template &lt;typename... Ts&gt;          // template parameter pack: zero or more TYPES
void log(const Ts&amp;... args);          // function parameter pack: zero or more VALUES</pre>
      <p>You cannot index a pack like an array (C++26 adds <code>args...[0]</code>, but do not rely on it yet). You use it in three ways:</p>
      <ul>
        <li><b>Count it:</b> <code>sizeof...(args)</code> — a compile-time number.</li>
        <li><b>Expand it with a pattern:</b> write a pattern followed by <code>...</code>; the compiler repeats the pattern once per element, separated by commas. <code>f(args...)</code> → <code>f(a1, a2, a3)</code>; <code>f(g(args)...)</code> → <code>f(g(a1), g(a2), g(a3))</code>; <code>std::forward&lt;Ts&gt;(args)...</code> forwards each one perfectly.</li>
        <li><b>Fold it (C++17):</b> combine all elements with one operator: <code>(args + ...)</code>, <code>(... &amp;&amp; args)</code>, <code>((std::cout &lt;&lt; args), ...)</code>.</li>
      </ul>
      ${H.arr(['1', '2.5', '"hi"', "'c'"], { label: 'pack', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })}
      ${H.table(['pattern', 'expands to'], [['<code>print(args...)</code>', 'print(1, 2.5, "hi", \'c\')'], ['<code>print(args * 2 ...)</code> (numbers only)', 'print(1*2, 2.5*2, …)'], ['<code>(args + ...)</code>', '1 + (2.5 + (…))'], ['<code>sizeof...(args)</code>', '4']])}
      <p><b>Before C++17</b> you processed a pack by <b>recursion</b>: handle the first element, call yourself with the rest, and provide a base case for the empty pack. <b>Since C++17</b>, prefer fold expressions or <code>if constexpr (sizeof...(rest) &gt; 0)</code>: fewer instantiations, faster builds, clearer code.</p>
      <p>Where you meet packs every day: <code>std::make_unique&lt;T&gt;(args...)</code>, <code>vector::emplace_back(args...)</code>, <code>std::tuple&lt;Ts...&gt;</code>, <code>std::variant&lt;Ts...&gt;</code>, <code>std::format(fmt, args...)</code>, <code>std::thread(f, args...)</code> — all variadic and all use <b>perfect forwarding</b>: <code>template&lt;class... Args&gt; void emplace(Args&amp;&amp;... args) { new (p) T(std::forward&lt;Args&gt;(args)...); }</code>.</p>`,
    clues: [
      '"Any number of arguments of any type", "printf-like", "log(a, b, c, …)" → variadic template',
      '"Forward constructor arguments" (make_unique, emplace, factory) → <code>Args&amp;&amp;... + std::forward&lt;Args&gt;(args)...</code>',
      '"Sum / all-of / any-of over the arguments" → fold expression',
      '"Do something for each element of a tuple" → <code>std::apply</code> or <code>index_sequence</code> + fold',
      '"Compile-time list of types", "does this pack contain int?" → variadic class template / <code>(std::is_same_v&lt;T, Ts&gt; || ...)</code>',
      '"Avoid the recursion / too many instantiations" → C++17 folds'
    ],
    code: [R`
      #include <iostream>
      #include <string>
      #include <type_traits>

      // C++11 style: recursion + base case
      void printRec() { std::cout << "\n"; }                 // base case: empty pack
      template <class T, class... Rest>
      void printRec(const T& first, const Rest&... rest) {
          std::cout << first << ' ';
          printRec(rest...);                                 // pack shrinks by one
      }

      // C++17 style: one function, a fold over the comma operator
      template <class... Ts>
      void print(const Ts&... args) {
          ((std::cout << args << ' '), ...);                 // left-to-right, guaranteed
          std::cout << "\n";
      }

      template <class... Ts> auto sum(Ts... xs) { return (xs + ... + 0); }   // binary fold: works for 0 args
      template <class... Ts> bool allPositive(Ts... xs) { return ((xs > 0) && ...); }  // empty pack -> true
      template <class T, class... Ts> constexpr bool contains = (std::is_same_v<T, Ts> || ...);

      int main() {
          printRec(1, 2.5, "hi", 'c');                       // 1 2.5 hi c
          print(1, 2.5, std::string("hi"), 'c');             // 1 2.5 hi c
          std::cout << sum(1, 2, 3) << " " << sum() << "\n"; // 6 0
          std::cout << std::boolalpha << allPositive(3, 1, -2) << " " << allPositive() << "\n"; // false true
          static_assert(contains<int, char, int, double>);
          static_assert(!contains<float, char, int>);
      }
    `, R`
      #include <cstddef>
      #include <iostream>
      #include <memory>
      #include <string>
      #include <tuple>
      #include <utility>

      // Perfect forwarding of a pack: the core of make_unique / emplace_back.
      template <class T, class... Args>
      std::unique_ptr<T> make(Args&&... args) {
          return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
      }

      // Visit every tuple element: expand an index_sequence 0..N-1 inside a fold.
      template <class Tuple, class F, std::size_t... I>
      void forEachImpl(const Tuple& t, F f, std::index_sequence<I...>) {
          (f(std::get<I>(t)), ...);
      }
      template <class... Ts, class F>
      void forEach(const std::tuple<Ts...>& t, F f) {
          forEachImpl(t, f, std::index_sequence_for<Ts...>{});
      }

      struct Point { int x, y; Point(int a, int b) : x(a), y(b) {} };

      int main() {
          auto p = make<Point>(3, 4);                         // Point(3, 4) built in place
          auto s = make<std::string>(5, '*');                 // "*****"
          std::cout << p->x + p->y << " " << *s << "\n";      // 7 *****
          forEach(std::tuple{1, 2.5, std::string("z")}, [](const auto& v) { std::cout << v << ";"; });
          std::cout << "\n";                                  // 1;2.5;z;
          std::apply([](auto... v) { std::cout << sizeof...(v) << "\n"; }, std::tuple{1, 2, 3}); // 3
      }
    `],
    codeTitle: ['Recursion vs folds, sum/all-of, compile-time contains', 'Perfect forwarding a pack, tuple iteration with index_sequence, std::apply'],
    viz: {
      title: 'Variadic pack expansion: recursion peel vs fold expression',
      input: '1, 2.5, "hi", \'c\', true',
      inputLabel: 'Arguments separated by commas: 3, 3L, 2.5, 2.5f, \'c\', true, "hi", "hi"s (up to 8). Try 1, 2, 3, 4 for the sum fold',
      gen: variadicViz
    },
    examples: [
      { title: 'Left vs right fold with a non-associative operator', html: `<p><code>(xs - ...)</code> with 10, 3, 2 → <code>10 - (3 - 2)</code> = <b>9</b>. <code>(... - xs)</code> → <code>(10 - 3) - 2</code> = <b>5</b>. For + and * the grouping does not change the answer (for integers), but for -, /, and string concatenation order matters.</p>
        ${H.table(['fold', 'grouping', 'value'], [['(xs - ...)', '10 - (3 - 2)', '9'], ['(... - xs)', '(10 - 3) - 2', '<span class="c-g">5</span>']])}`, code: R`
        template <class... T> constexpr int rightSub(T... xs) { return (xs - ...); }
        template <class... T> constexpr int leftSub(T... xs)  { return (... - xs); }
        static_assert(rightSub(10, 3, 2) == 9 && leftSub(10, 3, 2) == 5);
      ` },
      { title: 'Empty packs: which folds are allowed?', html: `<p>A <b>unary</b> fold on an empty pack is only legal for <code>&amp;&amp;</code> (gives true), <code>||</code> (gives false) and <code>,</code> (gives void()). <code>(xs + ...)</code> with zero args is a compile error — use the binary form <code>(xs + ... + 0)</code>. Interviewers love this.</p>
        ${H.table(['expression with empty pack', 'result'], [['(xs &amp;&amp; ...)', 'true'], ['(xs || ...)', 'false'], ['(f(xs), ...)', 'void()'], ['(xs + ...)', '<span class="c-r">error</span>'], ['(xs + ... + 0)', '0']])}` },
      { title: 'Expanding a pattern, not just the names', html: `<p>The <code>...</code> applies to the whole pattern to its left. <code>g(f(args)...)</code> calls <code>f</code> on each element and passes the results to <code>g</code>; <code>g(f(args...))</code> calls <code>f</code> <b>once</b> with all arguments. Two packs in one pattern expand in lock-step and must have equal length.</p>`, code: R`
        #include <iostream>
        int sq(int x) { return x * x; }
        int add3(int a, int b, int c) { return a + b + c; }
        template <class... T> int sumOfSquares(T... xs) { return add3(sq(xs)...); }   // add3(sq(a), sq(b), sq(c))
        int main() { std::cout << sumOfSquares(1, 2, 3) << "\n"; }                      // 14
      ` },
      { title: 'A variadic class: a tiny compile-time TypeList', html: `<p>Packs also work for classes. <code>TypeList&lt;int, char, double&gt;</code> stores types, and folds compute facts about them at compile time — the foundation of libraries like Boost.Mp11.</p>`, code: R`
        #include <cstddef>
        #include <type_traits>
        template <class... Ts> struct TypeList {
            static constexpr std::size_t size = sizeof...(Ts);
            template <class T> static constexpr bool has = (std::is_same_v<T, Ts> || ...);
            static constexpr std::size_t bytes = (sizeof(Ts) + ... + 0);
        };
        using L = TypeList<int, char, double>;
        static_assert(L::size == 3 && L::has<char> && !L::has<float>);
        static_assert(L::bytes == sizeof(int) + sizeof(char) + sizeof(double));
      ` }
    ],
    deepDive: `<p>🟣 <b>Expansion contexts.</b> A pack may be expanded only where a comma-separated list is allowed: function call arguments, braced initializers (<code>int dummy[] = {(f(args), 0)...};</code> was the pre-C++17 trick to force left-to-right evaluation), template argument lists, base-class lists (<code>struct Overloaded : Ts... { using Ts::operator()...; };</code> — the famous <code>std::visit</code> helper), lambda captures (<code>[...xs = std::move(xs)]</code> in C++20), and fold expressions. Note: the order of evaluation of <i>function arguments</i> is unspecified, so <code>g(f(args)...)</code> may call the <code>f</code>s in any order; folds over the comma operator and braced-init-lists are strictly left to right.</p>
      <p><b>Deduction with packs.</b> A function parameter pack must be the last parameter to be deduced from a call (<code>template&lt;class... A, class B&gt; f(A..., B)</code> cannot deduce A). Class template packs must be last in the parameter list for primary templates. <code>sizeof...</code> is a constant expression. Packs of non-types work too: <code>template&lt;int... Ns&gt;</code>, which is exactly what <code>std::integer_sequence</code> is.</p>
      <p><b>Compile-time cost.</b> Recursive variadic templates create O(N) instantiations, and recursive type-list algorithms can create O(N<sup>2</sup>) — this shows up in build times of heavily templated code (tuples with 50+ elements, large variants). Folds and compiler intrinsics like <code>__type_pack_element</code> (used by libc++/libstdc++ for <code>tuple_element</code>) keep it near O(N). Measure with <code>-ftime-trace</code> (Clang) and look at the "InstantiateFunction" entries.</p>
      <p><b>Perfect forwarding pitfalls:</b> forwarding the same pack twice may move from objects twice; <code>emplace_back({1,2})</code> fails because a braced list has no type to deduce; and a variadic constructor <code>template&lt;class... A&gt; Wrapper(A&amp;&amp;...)</code> can hijack the copy constructor for non-const lvalues — constrain it (topic 6).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI tools are very good at writing variadic utilities (loggers, <code>overloaded</code> visitors, tuple printers) and at converting old recursive-pack code to C++17 folds. <b>Use AI as a partner:</b> ask it to "show the exact expansion of this fold for 3 arguments" and compare with C++ Insights (cppinsights.io), which prints the expanded code the compiler sees.</p>
      <p><b>Where AI goes wrong:</b> it writes <code>(args + ...)</code> where zero arguments are possible, assumes function-argument expansions run left to right, double-forwards a pack inside a loop, and produces recursive templates without the base case (or with the base case declared <i>after</i> the template so it is not found). It also over-uses <code>std::tuple</code> gymnastics where a simple <code>std::initializer_list</code> or a span would do. <b>What you must still own:</b> knowing where packs can expand, fold grouping and empty-pack rules, forwarding semantics, and when the compile-time cost is worth it.</p>`,
    problems: [{
      title: 'Variadic minOf with a common return type',
      level: 'Medium', tags: ['variadic', 'fold expression', 'common_type'], companies: ['Amazon', 'Citadel'],
      statement: `<p>Write <code>minOf(args...)</code> that returns the smallest argument. It must accept <b>at least one</b> argument (zero should not compile), allow mixed arithmetic types (<code>minOf(3, 2.5, 7L)</code> → <code>2.5</code>), and return <code>std::common_type_t</code> of all arguments.</p>`,
      constraints: `1 ≤ number of arguments ≤ 100, all arithmetic.`,
      example: `<p><code>minOf(4, 2.5, 7)</code> → ${H.c('g', '2.5')} (common type double). <code>minOf(9)</code> → ${H.c('g', '9')}. <code>minOf()</code> → ${H.c('r', 'compile error')} because the first parameter is mandatory.</p>`,
      brute: { why: `<p>Copy everything into an <code>std::initializer_list&lt;double&gt;</code> and call <code>std::min</code>. It works, but forces every argument to double (losing precision for big <code>long long</code>s) and does not adapt the return type.</p>`, code: R`
        #include <algorithm>
        #include <initializer_list>
        double minOfBrute(std::initializer_list<double> xs) { return std::min(xs); }
        // usage: minOfBrute({4, 2.5, 7});
      ` },
      mcq: { q: 'How do you make <code>minOf()</code> with zero arguments fail to compile?', options: ['Make the first parameter a separate, non-pack parameter: <code>minOf(T first, Rest... rest)</code>', 'Use <code>static_assert(true)</code>', 'Use a unary fold over &amp;&amp;', 'It already fails because packs cannot be empty'], answer: 0, explain: 'Packs can be empty. Splitting off a mandatory first parameter means at least one argument is required, and also gives you a natural starting value for the fold.' },
      hints: [`<p>Hint 1: Separate the head: <code>template&lt;class T, class... Rest&gt; auto minOf(T first, Rest... rest)</code>.</p>`, `<p>Hint 2: <code>using R = std::common_type_t&lt;T, Rest...&gt;;</code> then start with <code>R best = first;</code>.</p>`, `<p>Hint 3: Fold over the comma operator, updating <code>best</code> per element: <code>((best = std::min&lt;R&gt;(best, rest)), ...);</code>. Empty <code>rest</code> → the comma fold expands to nothing, which is allowed. Return <code>best</code>.</p>`],
      solution: {
        approach: `<p>Mandatory head + pack tail; compute the common type; a comma fold walks the tail left to right keeping the running minimum. One instantiation per distinct argument-type list, no recursion.</p>`,
        code: R`
          #include <algorithm>
          #include <iostream>
          #include <type_traits>

          template <class T, class... Rest>
          auto minOf(T first, Rest... rest) {
              using R = std::common_type_t<T, Rest...>;     // e.g. int, double, long -> double
              R best = first;
              ((best = std::min<R>(best, rest)), ...);      // comma fold: one step per element
              return best;
          }

          int main() {
              std::cout << minOf(4, 2.5, 7) << "\n";        // 2.5
              std::cout << minOf(9) << "\n";                // 9  (empty tail is fine)
              auto r = minOf(3, 1L);
              static_assert(std::is_same_v<decltype(r), long>);
              std::cout << r << "\n";                       // 1
          }
        `,
        dry: { head: ['step', 'element', 'best (type R = double)'], rows: [
          ['init', 'first = 4', '4.0'],
          ['fold 1', '2.5', 'min(4.0, 2.5) = 2.5'],
          ['fold 2', '7', 'min(2.5, 7.0) = 2.5'],
          ['return', '—', '<span class="c-g">2.5</span>']
        ] },
        complexity: `<p>O(N) comparisons at run time; one function instantiation per type list (no recursive chain).</p>`,
        followUps: ['Return the <b>index</b> of the minimum instead.', 'Constrain it with a concept so <code>minOf(1, "a")</code> gives a clean error.', 'What goes wrong with <code>minOf(-1, 1u)</code> and the usual arithmetic conversions?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Type traits & compile-time decisions
     ====================================================================== */
  var INTEGRALS = ['int', 'unsigned', 'long', 'short', 'char', 'bool'], FLOATS = ['float', 'double'];
  var SZ = { 'int': [4, 4], 'unsigned': [4, 4], 'long': [8, 8], 'short': [2, 2], 'char': [1, 1], 'bool': [1, 1], 'float': [4, 4], 'double': [8, 8], 'std::string': [32, 8], 'Widget': [1, 1] };
  function topCV(t) { return (t.k === 'const' || t.k === 'volatile') ? topCV(t.of) : t; }
  function hasQ(t, q) { if (t.k === q) return true; if (t.k === 'const' || t.k === 'volatile') return hasQ(t.of, q); if (t.k === 'arr') return hasQ(t.of, q); return false; }
  function removeCV(t) { if (t.k === 'const' || t.k === 'volatile') return removeCV(t.of); if (t.k === 'arr') return { k: 'arr', n: t.n, of: removeCV(t.of) }; return t; }
  function removeRef(t) { return (t.k === 'lref' || t.k === 'rref') ? t.of : t; }
  function decayT(t) { var u = removeRef(t); if (u.k === 'arr') return { k: 'ptr', of: u.of }; return removeCV(u); }
  function layout(t) {
    var b = topCV(t);
    if (b.k === 'name') { if (b.n === 'void') return null; return SZ[b.n]; }
    if (b.k === 'ptr') return [8, 8];
    if (b.k === 'lref' || b.k === 'rref') return layout(b.of);
    if (b.k === 'arr') { var e = layout(b.of); return e ? [e[0] * b.n, e[1]] : null; }
    if (b.k === 'vec') return [24, 8];
    if (b.k === 'pair') {
      var a = layout(b.a), c = layout(b.b);
      if (!a || !c) return null;
      var off = Math.ceil(a[0] / c[1]) * c[1], al = Math.max(a[1], c[1]);
      return [Math.ceil((off + c[0]) / al) * al, al];
    }
    return null;
  }
  function traitsViz(input) {
    var t = parseType(input === undefined ? 'const int[3]&' : input);
    var T = tstr(t), b = topCV(removeRef(t)), nb = b.k === 'name' ? b.n : '';
    var rows = [], frames = [];
    var checks = [
      ['std::is_reference_v<T>', t.k === 'lref' || t.k === 'rref', 'Is the outermost layer a & or &&? ' + (t.k === 'lref' ? 'Yes, an lvalue reference.' : t.k === 'rref' ? 'Yes, an rvalue reference.' : 'No.')],
      ['std::is_const_v<T>', hasQ(t, 'const'), 'Only TOP-LEVEL const counts. A reference is never const itself, and for const int* the const belongs to the pointee, not the pointer.'],
      ['std::is_pointer_v<T>', topCV(t).k === 'ptr', 'True for any (cv-qualified) object pointer. A reference to a pointer is a reference, not a pointer.'],
      ['std::is_array_v<T>', t.k === 'arr', 'Built-in arrays only (not std::array, not std::vector).'],
      ['std::is_integral_v<T>', topCV(t).k === 'name' && INTEGRALS.indexOf(topCV(t).n) >= 0, 'bool, char, short, int, long, … (cv-qualified too). References are NOT integral.'],
      ['std::is_floating_point_v<T>', topCV(t).k === 'name' && FLOATS.indexOf(topCV(t).n) >= 0, 'float, double, long double.'],
      ['std::is_class_v<T>', (topCV(t).k === 'name' && (topCV(t).n === 'std::string' || topCV(t).n === 'Widget')) || topCV(t).k === 'vec' || topCV(t).k === 'pair', 'Is it a struct/class type?'],
      ['std::is_void_v<T>', topCV(t).k === 'name' && topCV(t).n === 'void', 'Only (cv) void.']
    ];
    frames.push({ narr: 'Type traits are <b>questions you ask the compiler about a type</b>. Each is a tiny class template whose answer is a compile-time constant (<code>::value</code>, or <code>_v</code> for short) or a new type (<code>::type</code>, or <code>_t</code>). Input <b>T = <code>' + E(T) + '</code></b>. We will ask the questions one by one.', parts: [
      { type: 'vars', label: 'T', vals: { T: T, 'outer layer': t.k === 'name' ? 'plain type' : t.k } },
      { type: 'table', label: 'Answers (filled in step by step)', columns: ['trait', 'value', 'why'], rows: [] }
    ] });
    checks.forEach(function (c, i) {
      rows.push([c[0], String(c[1]), c[2]]);
      var h = {}; h[i] = c[1] ? 'ok' : 'done';
      frames.push({ narr: '<code>' + E(c[0]) + '</code> → <b>' + (c[1] ? '<span class="c-g">true</span>' : 'false') + '</b>. ' + E(c[2]), parts: [{ type: 'table', label: 'Answers for T = ' + E(T), columns: ['trait', 'value', 'why'], rows: rows.map(function (r) { return r.slice(); }), hl: h }] });
    });
    var lay = layout(t);
    var steps = [];
    var r1 = removeRef(t), r2 = removeCV(r1), d = decayT(t);
    steps.push(['T', T, 'what you started with']);
    steps.push(['std::remove_reference_t<T>', tstr(r1), t.k === 'lref' || t.k === 'rref' ? 'peeled the reference' : 'no reference to remove — unchanged']);
    frames.push({ narr: 'Now <b>transformations</b>: traits that compute a new type. <code>remove_reference_t</code> peels one &amp; / &amp;&amp;: <b>' + E(T) + '</b> → <b>' + E(tstr(r1)) + '</b>.', parts: [{ type: 'table', label: 'Transformation pipeline', columns: ['step', 'result type', 'note'], rows: steps.map(function (r) { return r.slice(); }), hl: { 1: 'cur' } }, { type: 'vars', label: 'sizeof(T) on x86-64', vals: { 'sizeof': lay ? lay[0] + ' bytes' : 'n/a (void)', 'alignof': lay ? lay[1] : 'n/a' } }] });
    steps.push(['std::remove_cv_t<…>', tstr(r2), same(r1, r2) ? 'no top-level const/volatile' : 'dropped top-level const/volatile']);
    frames.push({ narr: '<code>remove_cv_t</code> drops <b>top-level</b> const/volatile only: → <b>' + E(tstr(r2)) + '</b>. Note <code>remove_cv_t&lt;const int*&gt;</code> is still <code>const int*</code> — that const is on the pointee. (C++20 bundles both steps as <code>std::remove_cvref_t</code>.)', parts: [{ type: 'table', label: 'Transformation pipeline', columns: ['step', 'result type', 'note'], rows: steps.map(function (r) { return r.slice(); }), hl: { 2: 'cur' } }] });
    steps.push(['std::decay_t<T>', tstr(d), removeRef(t).k === 'arr' ? 'array → pointer to first element (keeps element const)' : 'same as remove_cvref here']);
    frames.push({ narr: '<code>decay_t</code> = "what you get when you pass T <b>by value</b>": remove reference, arrays become pointers, functions become function pointers, then drop cv. Result <b>' + E(tstr(d)) + '</b>. This is what <code>auto x = expr;</code> and <code>std::make_pair</code> / <code>std::thread</code> store.', parts: [{ type: 'table', label: 'Transformation pipeline', columns: ['step', 'result type', 'note'], rows: steps.map(function (r) { return r.slice(); }), hl: { 3: 'sel' } }] });
    var dd = d.k === 'name' ? d.n : '';
    var prom = INTEGRALS.indexOf(dd) >= 0 ? 'long long' : FLOATS.indexOf(dd) >= 0 ? 'double' : tstr(d);
    steps.push(['Promote<T> (our own trait)', prom, 'conditional_t<is_integral_v<D>, long long, conditional_t<is_floating_point_v<D>, double, D>>']);
    frames.push({ narr: 'Traits compose. Our own <code>Promote&lt;T&gt;</code> picks a "wide" type to accumulate sums safely: integral → <code>long long</code>, floating → <code>double</code>, anything else unchanged. With <code>std::conditional_t</code> the choice happens at <b>compile time</b>, zero run-time cost. Here: <b>' + E(prom) + '</b>.', parts: [{ type: 'table', label: 'Transformation pipeline', columns: ['step', 'result type', 'note'], rows: steps.map(function (r) { return r.slice(); }), hl: { 4: 'ok' } }, { type: 'code', label: 'Promote', lang: 'cpp', code: 'template <class T>\nusing Promote = std::conditional_t<std::is_integral_v<std::decay_t<T>>, long long,\n                std::conditional_t<std::is_floating_point_v<std::decay_t<T>>, double,\n                                   std::decay_t<T>>>;' }] });
    var isSame = same(t, d);
    frames.push({ narr: '<code>std::is_same_v&lt;T, std::decay_t&lt;T&gt;&gt;</code> = <b>' + isSame + '</b>. ' + (isSame ? 'T is already a "plain value type".' : 'T carries reference / cv / array-ness that a by-value copy would lose.') + ' Generic code often <code>static_assert</code>s on such facts or branches on them with <code>if constexpr</code>.', parts: [{ type: 'table', label: 'All answers for T = ' + E(T), columns: ['trait', 'value', 'why'], rows: rows }, { type: 'table', label: 'Transformation pipeline', columns: ['step', 'result type', 'note'], rows: steps }] });
    return frames;
  }

  topics.push({
    title: 'Type Traits & Compile-Time Decisions (if constexpr)',
    analogy: `<p>Before shipping a parcel, a warehouse worker reads its <b>label</b>: "fragile? liquid? over 20 kg?" and routes it accordingly — without opening the box. <b>Type traits</b> are those labels for types. Generic code reads them at compile time ("is T an integer? a pointer? copyable?") and picks the right path, or refuses to ship (<code>static_assert</code>). <b>Transformation traits</b> are the re-packing station: "take off the gift wrap (reference), remove the FRAGILE sticker (const)".</p>`,
    explain: `<p>🟢 <code>&lt;type_traits&gt;</code> is a library of tiny class templates that answer questions about types <b>at compile time</b>:</p>
      ${H.table(['family', 'examples', 'answer is'], [['primary categories', 'is_integral, is_floating_point, is_pointer, is_array, is_class, is_enum', '<code>bool</code> (<code>_v</code>)'], ['properties', 'is_const, is_signed, is_trivially_copyable, is_nothrow_move_constructible', '<code>bool</code>'], ['relations', 'is_same, is_base_of, is_convertible, is_invocable', '<code>bool</code>'], ['transformations', 'remove_reference, remove_cv, decay, add_pointer, make_unsigned, conditional, common_type', 'a type (<code>_t</code>)']])}
      <p>Two spellings: old <code>std::is_integral&lt;T&gt;::value</code> / <code>typename std::decay&lt;T&gt;::type</code>, and the short helpers <code>std::is_integral_v&lt;T&gt;</code> / <code>std::decay_t&lt;T&gt;</code>. Use the short ones.</p>
      <p><b>How a trait is built</b> — it is just a class template plus specializations (topic 2!):</p>
      <pre>template &lt;class T&gt; struct is_ptr        : std::false_type {};   // default: no
template &lt;class T&gt; struct is_ptr&lt;T*&gt;    : std::true_type  {};   // pattern T*: yes</pre>
      <p><code>std::true_type</code> / <code>std::false_type</code> are <code>std::integral_constant&lt;bool, …&gt;</code>: types that carry a value.</p>
      <p><b>Using traits:</b></p>
      <ul>
        <li><code>static_assert(std::is_trivially_copyable_v&lt;T&gt;, "memcpy needs trivial T");</code> — guard rails with a readable message.</li>
        <li><code>if constexpr (std::is_integral_v&lt;T&gt;) { … } else { … }</code> (C++17) — the false branch is <b>discarded</b> for that T, so it may contain code that would not even compile for T. This replaced most old tag-dispatch and SFINAE tricks.</li>
        <li><code>std::conditional_t&lt;cond, A, B&gt;</code> — choose a type.</li>
        <li><code>std::enable_if_t&lt;cond&gt;</code> / concepts — switch overloads on or off (next topics).</li>
      </ul>`,
    clues: [
      '"Behave differently for integers vs floating point vs strings" in ONE generic function → <code>if constexpr</code> + traits',
      '"Only allow trivially copyable / arithmetic types" → <code>static_assert</code> with a trait',
      '"Strip const and reference to get the plain type" → <code>std::remove_cvref_t</code> / <code>std::decay_t</code>',
      '"Choose the accumulator type at compile time" → <code>std::conditional_t</code> / <code>std::common_type_t</code>',
      '"Is this type a vector / a pointer / a pair?" → write your own trait with partial specialization',
      '"Pick a faster algorithm when the iterator is random access" → <code>iterator_traits</code> + tag dispatch or concepts'
    ],
    code: [R`
      #include <iostream>
      #include <string>
      #include <type_traits>
      #include <vector>

      // A homemade trait: primary = false, partial specialization = true.
      template <class T> struct is_vector : std::false_type {};
      template <class T, class A> struct is_vector<std::vector<T, A>> : std::true_type {};
      template <class T> inline constexpr bool is_vector_v = is_vector<std::remove_cvref_t<T>>::value;

      // One generic function, branches chosen at compile time.
      template <class T>
      std::string describe(const T& x) {
          if constexpr (std::is_same_v<T, bool>) {
              return x ? "bool:true" : "bool:false";        // bool is integral, so test it first
          } else if constexpr (std::is_integral_v<T>) {
              return "int:" + std::to_string(x);
          } else if constexpr (std::is_floating_point_v<T>) {
              return "float:" + std::to_string(x);
          } else if constexpr (is_vector_v<T>) {
              return "vector of " + std::to_string(x.size()); // only compiled for vectors
          } else if constexpr (std::is_convertible_v<const T&, std::string>) {
              return "text:" + std::string(x);
          } else {
              static_assert(!sizeof(T*), "describe(): unsupported type");  // dependent false
          }
      }

      template <class T>
      using Promote = std::conditional_t<std::is_integral_v<T>, long long,
                      std::conditional_t<std::is_floating_point_v<T>, double, T>>;

      int main() {
          std::cout << describe(true) << " " << describe(42) << " " << describe(2.5) << "\n";
          std::cout << describe(std::vector<int>{1, 2, 3}) << " " << describe(std::string("hi")) << "\n";
          static_assert(std::is_same_v<Promote<short>, long long>);
          static_assert(std::is_same_v<std::decay_t<const int (&)[3]>, const int*>);
          static_assert(std::is_same_v<std::remove_cvref_t<const std::string&>, std::string>);
          static_assert(!std::is_const_v<const int*> && std::is_const_v<int* const>);
      }
    `],
    codeTitle: ['Homemade trait, if constexpr dispatch, conditional_t, and must-know static_asserts'],
    viz: {
      title: 'Ask the compiler about a type: trait answers + remove_reference → remove_cv → decay',
      input: 'const int[3]&',
      inputLabel: 'A type using int, unsigned, long, short, char, bool, float, double, void, string, Widget with const, volatile, *, &, &&, [N], vector<…>, pair<…, …>',
      gen: traitsViz
    },
    examples: [
      { title: 'Top-level const: the classic trap', html: `${H.table(['T', 'is_const_v&lt;T&gt;', 'why'], [['const int', '<span class="c-g">true</span>', 'the int itself is const'], ['const int*', 'false', 'pointer is mutable; the pointee is const'], ['int* const', '<span class="c-g">true</span>', 'the pointer itself is const'], ['const int&amp;', 'false', 'references are never cv-qualified; use <code>is_const_v&lt;remove_reference_t&lt;T&gt;&gt;</code>']])}
        <p>Read declarations right-to-left: <code>int* const</code> = "const pointer to int".</p>` },
      { title: 'decay_t in the wild: what auto and make_pair store', html: `<p><code>auto x = arr;</code> where <code>arr</code> is <code>int[3]</code> gives <code>int*</code>. <code>std::make_pair("hi", 1)</code> stores <code>const char*</code>, not <code>const char[3]</code>. <code>std::thread(f, s)</code> copies <code>decay_t</code> of every argument — that is why you need <code>std::ref</code> to pass a reference into a thread.</p>`, code: R`
        #include <type_traits>
        #include <utility>
        int arr[3] = {1, 2, 3};
        auto a = arr;                                    // int*
        auto p = std::make_pair("hi", 1);                // pair<const char*, int>
        static_assert(std::is_same_v<decltype(a), int*>);
        static_assert(std::is_same_v<decltype(p), std::pair<const char*, int>>);
      ` },
      { title: 'Tag dispatch: the pre-C++17 way to branch on a trait', html: `<p>Before <code>if constexpr</code>, you overloaded on <code>std::true_type</code>/<code>std::false_type</code> (or iterator tags). The STL still does this internally, e.g. <code>std::advance</code> picks O(1) for random-access iterators and O(n) otherwise. You will meet it in older codebases.</p>`, code: R`
        #include <iostream>
        #include <type_traits>
        template <class T> void printImpl(T x, std::true_type)  { std::cout << "integral " << x << "\n"; }
        template <class T> void printImpl(T x, std::false_type) { std::cout << "other " << x << "\n"; }
        template <class T> void print(T x) { printImpl(x, std::is_integral<T>{}); }   // tag picks the overload
        int main() { print(3); print(2.5); }                                            // integral 3, other 2.5
      ` },
      { title: 'Writing remove_const yourself', html: `<p>Transformation traits are partial specializations that expose <code>type</code>. Inheriting from the recursive case gives recursion for free.</p>`, code: R`
        #include <type_traits>
        template <class T> struct my_remove_const          { using type = T; };
        template <class T> struct my_remove_const<const T> { using type = T; };
        template <class T> using my_remove_const_t = typename my_remove_const<T>::type;
        static_assert(std::is_same_v<my_remove_const_t<const int>, int>);
        static_assert(std::is_same_v<my_remove_const_t<const int*>, const int*>);   // top-level only
      ` }
    ],
    deepDive: `<p>🟣 <b>Intrinsics.</b> Many traits cannot be written in plain C++ (<code>is_class</code> for unions, <code>is_trivially_copyable</code>, <code>is_enum</code>, <code>underlying_type</code>, <code>is_aggregate</code>, <code>has_unique_object_representations</code>); library implementations call compiler built-ins like <code>__is_trivially_copyable(T)</code>. Clang and GCC now implement even <code>is_same</code>, <code>remove_cvref</code> and <code>decay</code> as built-ins because instantiating thousands of tiny class templates is a noticeable share of build time.</p>
      <p><b>Unevaluated operands.</b> Traits like <code>is_invocable</code> or your own detectors use <code>decltype(expr)</code>, <code>sizeof(expr)</code>, <code>noexcept(expr)</code> and <code>std::declval&lt;T&gt;()</code>. <code>declval</code> pretends to produce a <code>T&amp;&amp;</code> without constructing anything (it is declared but never defined — using it in evaluated code fails to link/compile). <code>decltype</code> has its own rules: <code>decltype(x)</code> is the declared type, <code>decltype((x))</code> is an lvalue reference.</p>
      <p><b>The "dependent false" idiom.</b> <code>static_assert(false)</code> in the last <code>else</code> of an <code>if constexpr</code> chain used to make the program ill-formed even if never instantiated, so people wrote <code>static_assert(!sizeof(T*))</code> or a <code>always_false&lt;T&gt;</code> helper. C++23 (P2593, accepted as a defect report and implemented in GCC 13 / Clang 17) now allows plain <code>static_assert(false, "…")</code> in a discarded template branch.</p>
      <p><b>Rules you must not break:</b> do not specialize standard type traits (UB); traits on incomplete types can give wrong answers or be ill-formed and must be avoided; <code>is_trivially_copyable</code> is the property that makes <code>memcpy</code> legal; <code>is_nothrow_move_constructible</code> decides whether <code>std::vector</code> moves or copies during reallocation (<code>std::move_if_noexcept</code>) — a trait with a real performance impact.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI can produce the right trait name instantly ("is there a trait for X?") and convert SFINAE-heavy legacy code to <code>if constexpr</code> or concepts. <b>Use AI as a partner:</b> ask for a table of "type → trait value" for tricky inputs (references, arrays, const pointers), then paste the claims into a file of <code>static_assert</code>s and compile — the compiler is the ground truth, and the asserts become regression tests.</p>
      <p><b>Where AI goes wrong:</b> it says <code>is_const_v&lt;const int&amp;&gt;</code> is true (it is false), forgets that <code>bool</code> and <code>char</code> are integral (so an "integer" branch swallows them), uses <code>decay_t</code> where <code>remove_cvref_t</code> was meant (decay turns arrays into pointers), suggests specializing <code>std::is_integral</code> for a custom type (UB), and writes a plain <code>static_assert(false)</code> for older compilers. <b>What you must still own:</b> knowing top-level vs pointee cv, the decay rules, and choosing the clearest tool (<code>if constexpr</code>, overloads, concepts) for each branch point.</p>`,
    problems: [{
      title: 'pointer_depth_v and remove_all_pointers_t',
      level: 'Medium', tags: ['type traits', 'partial specialization', 'recursion'], companies: ['Bloomberg', 'Optiver'],
      statement: `<p>Write two traits: <code>remove_all_pointers_t&lt;T&gt;</code> strips every pointer layer (including <code>const</code>/<code>volatile</code> pointers like <code>int* const*</code>), and <code>pointer_depth_v&lt;T&gt;</code> counts them. Everything must be computed at compile time and checked with <code>static_assert</code>.</p>`,
      constraints: `Any object type. Depth ≤ 32 (compiler recursion limits are much higher).`,
      example: `<p><code>pointer_depth_v&lt;int***&gt;</code> = ${H.c('g', '3')}, <code>remove_all_pointers_t&lt;const char* const*&gt;</code> = ${H.c('g', 'const char')}, <code>pointer_depth_v&lt;int&gt;</code> = ${H.c('g', '0')}. The <code>const</code> on a pointer layer must not stop the peeling.</p>`,
      brute: { why: `<p>Hand-write <code>std::remove_pointer_t</code> nested a fixed number of times. It only works when you already know the depth, and silently stops peeling at the wrong level otherwise.</p>`, code: R`
        #include <type_traits>
        template <class T>
        using strip3 = std::remove_pointer_t<std::remove_pointer_t<std::remove_pointer_t<T>>>;
        static_assert(std::is_same_v<strip3<int***>, int>);   // correct only for depth exactly 3
      ` },
      mcq: { q: 'Why is a partial specialization for <code>T*</code> alone not enough for <code>int* const*</code>?', options: ['After peeling one <code>*</code> we get <code>int* const</code>, which does not match the pattern <code>T*</code> (top-level const)', 'Because const pointers cannot be stripped', 'Because the primary template is chosen first', 'It is enough'], answer: 0, explain: 'Pattern matching is exact about cv-qualifiers: <code>int* const</code> is not of the form <code>T*</code>. Remove top-level cv before matching (e.g. specialize on <code>T* const</code> too, or apply <code>std::remove_cv_t</code> at each step).' },
      hints: [`<p>Hint 1: Primary template: no pointer → <code>type = T</code>, <code>depth = 0</code>.</p>`, `<p>Hint 2: Partial specialization for <code>T*</code> recurses on T: inherit from the impl for T and add one to the depth.</p>`, `<p>Hint 3: Route every step through <code>std::remove_cv_t</code> so <code>T* const</code> and <code>T* volatile</code> also match <code>T*</code>. Expose <code>_t</code>/<code>_v</code> aliases. Test with <code>static_assert</code> on int, int***, const char* const*.</p>`],
      solution: {
        approach: `<p>Dispatch on a defaulted <code>bool</code> template parameter: <code>rap&lt;T, std::is_pointer_v&lt;T&gt;&gt;</code>. <code>is_pointer_v</code> is true for cv-qualified pointers too, and <code>std::remove_pointer_t</code> peels exactly one layer (dropping that layer's cv). The <code>false</code> case is the base and keeps the pointee's own <code>const</code> intact, so <code>const char* const*</code> ends at <code>const char</code>.</p>`,
        code: R`
          #include <cstddef>
          #include <type_traits>

          // Base case (not a pointer): keep T exactly as is.
          template <class T, bool = std::is_pointer_v<T>>
          struct rap {
              using type = T;
              static constexpr std::size_t depth = 0;
          };
          // Pointer case (also matches T* const / T* volatile): peel one layer, recurse.
          template <class T>
          struct rap<T, true> {
              using inner = std::remove_pointer_t<T>;            // int* const* -> int* const
              using type = typename rap<inner>::type;
              static constexpr std::size_t depth = 1 + rap<inner>::depth;
          };

          template <class T> using remove_all_pointers_t = typename rap<T>::type;
          template <class T> inline constexpr std::size_t pointer_depth_v = rap<T>::depth;

          static_assert(pointer_depth_v<int> == 0);
          static_assert(pointer_depth_v<int***> == 3);
          static_assert(std::is_same_v<remove_all_pointers_t<int***>, int>);
          static_assert(std::is_same_v<remove_all_pointers_t<const char* const*>, const char>);
          static_assert(pointer_depth_v<int* const* volatile> == 2);
          int main() {}
        `,
        dry: { head: ['instantiation', 'is_pointer_v', 'specialization', 'inner / result'], rows: [
          ['rap&lt;const char* const*&gt;', 'true', 'rap&lt;T, true&gt;', 'inner = const char* const, depth = 1 + …'],
          ['rap&lt;const char* const&gt;', 'true (cv pointer)', 'rap&lt;T, true&gt;', 'inner = const char, depth = 1 + …'],
          ['rap&lt;const char&gt;', 'false', 'primary (base)', 'type = const char, depth = 0'],
          ['unwind', '—', '—', '<span class="c-g">type = const char, depth = 2</span>']
        ] },
        complexity: `<p>Zero run-time cost; compile-time O(depth) instantiations.</p>`,
        followUps: ['Also strip references and arrays (<code>int*(&amp;)[3]</code>).', 'Rewrite <code>pointer_depth_v</code> as a C++20 <code>consteval</code> function — is that possible for types?', 'How does <code>std::remove_pointer</code> treat <code>int* const</code>?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — SFINAE, enable_if & the detection idiom
     ====================================================================== */
  var OVL_SFINAE = R`
template <class T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
void show(T)                                        // #1 integers only
template <class T, std::enable_if_t<std::is_floating_point_v<T>, int> = 0>
void show(T)                                        // #2 floating point only
template <class T>
auto show(const T& c) -> decltype(c.begin(), void()) // #3 anything with .begin()
void show(...)                                      // #4 fallback`;
  function sfinaeViz(input) {
    var arg = normType(input === undefined ? 'std::string' : input);
    var any = function (a) { return { ok: true, T: a, why: 'T = argument type' }; };
    var cands = [
      { sig: 'show<T, enable_if_t<is_integral_v<T>, int> = 0>(T)', kind: 'template', family: 'sfinae', deduce: any,
        check: function (T) { return TYPES[T].integral ? { ok: true, why: 'is_integral_v<' + T + '> is true → enable_if_t<true, int> = int, the default "= 0" is valid' } : { ok: false, why: 'is_integral_v<' + T + '> is false → enable_if<false, int> has no ::type member' }; } },
      { sig: 'show<T, enable_if_t<is_floating_point_v<T>, int> = 0>(T)', kind: 'template', family: 'sfinae', deduce: any,
        check: function (T) { return TYPES[T].floating ? { ok: true, why: 'is_floating_point_v<' + T + '> is true → enable_if_t gives int' } : { ok: false, why: 'is_floating_point_v<' + T + '> is false → enable_if<false, int>::type does not exist' }; } },
      { sig: 'show(const T&) -> decltype(c.begin(), void())', kind: 'template', family: 'sfinae', deduce: any,
        check: function (T) { return TYPES[T].range ? { ok: true, why: T + ' has .begin(), the decltype expression is valid → return type void' } : { ok: false, why: 'c.begin() is not a valid expression for ' + T + ' → the return type cannot be formed' }; } },
      { sig: 'show(...)', kind: 'ellipsis' }
    ];
    return resolve(cands, arg, 'show', OVL_SFINAE);
  }

  var DETECTORS = [
    { name: 'has_size', expr: 'std::declval<T&>().size()', test: function (p) { return p.size; } },
    { name: 'has_begin', expr: 'std::declval<T&>().begin()', test: function (p) { return p.range; } },
    { name: 'has_less', expr: 'std::declval<T>() < std::declval<T>()', test: function (p) { return p.less; } },
    { name: 'has_plus', expr: 'std::declval<T>() + std::declval<T>()', test: function (p) { return p.plus; } },
    { name: 'has_value_type', expr: 'typename T::value_type', test: function (p) { return p.valueType; } }
  ];
  function detectViz(input) {
    var T = normType(input === undefined ? 'std::vector<int>' : input), P = TYPES[T];
    var frames = [], rows = [];
    var code = 'template <class T, class = void>\nstruct has_size : std::false_type {};          // primary: "no"\n\ntemplate <class T>\nstruct has_size<T, std::void_t<decltype(std::declval<T&>().size())>>\n    : std::true_type {};                          // partial: "yes"';
    frames.push({ narr: 'The <b>detection idiom</b> turns "does this expression compile for T?" into a <code>true</code>/<code>false</code> constant. Primary template = <b>false</b>. A partial specialization whose second argument is <code>std::void_t&lt;EXPR&gt;</code> = <b>true</b>. Type under test: <b>' + E(T) + '</b>.', parts: [{ type: 'code', label: 'The pattern (repeated for each detector)', lang: 'cpp', code: code }, { type: 'table', label: 'Detectors', columns: ['trait', 'expression inside void_t', 'substitution', 'specialization used', 'value'], rows: [] }] });
    DETECTORS.forEach(function (d, i) {
      var ok = !!d.test(P);
      rows.push([d.name + '<' + T + '>', d.expr, ok ? 'valid → void_t<…> = void' : 'INVALID → substitution failure', ok ? 'partial <T, void>' : 'primary', ok ? 'true' : 'false']);
      var h = {}; h[i] = ok ? 'ok' : 'bad';
      frames.push({ narr: '<code>' + E(d.name) + '&lt;' + E(T) + '&gt;</code>: the compiler asks for <code>' + E(d.name) + '&lt;' + E(T) + ', void&gt;</code> (the default) and tries the partial specialization. It substitutes T into <code>' + E(d.expr) + '</code>: ' + (ok ? '<span class="c-g">valid</span>, so <code>void_t&lt;…&gt;</code> becomes <code>void</code>, the pattern <code>&lt;T, void&gt;</code> matches → <b>true</b>.' : '<span class="c-r">not valid for ' + E(T) + '</span>. Inside a partial-specialization match that is a <b>substitution failure, not an error</b>: the specialization is simply ignored → primary → <b>false</b>.'), parts: [{ type: 'table', label: 'Detectors for T = ' + E(T), columns: ['trait', 'expression inside void_t', 'substitution', 'specialization used', 'value'], rows: rows.map(function (r) { return r.slice(); }), hl: h }] });
    });
    frames.push({ narr: 'Why <code>void_t</code>? It maps <i>any</i> valid type to <code>void</code>, so a successful detection produces exactly <code>&lt;T, void&gt;</code> — the same as the default argument — and the partial specialization is preferred. In C++20 you would write <code>concept HasSize = requires(T&amp; t) { t.size(); };</code> instead (next topic).', parts: [{ type: 'table', label: 'Summary for T = ' + E(T), columns: ['trait', 'expression inside void_t', 'substitution', 'specialization used', 'value'], rows: rows, hl: (function () { var h = {}; rows.forEach(function (r, i) { h[i] = r[4] === 'true' ? 'ok' : 'done'; }); return h; })() }] });
    return frames;
  }

  topics.push({
    title: 'SFINAE, enable_if & the Detection Idiom',
    analogy: `<p>A <b>job fair</b>: you hand your CV to every booth. A booth whose form asks for "driving licence number" when you have none does not call security — they just <b>quietly drop your application</b>. You end up only with the booths whose forms you could fill in, and you pick the best of those. <b>SFINAE</b> ("Substitution Failure Is Not An Error") is exactly that: when plugging your type into a template's signature produces nonsense, that template is silently removed from the candidate list.</p>`,
    explain: `<p>🟢 During overload resolution, for every function template the compiler (1) deduces T, then (2) <b>substitutes</b> T into the whole signature: return type, parameter types, template parameter defaults. If step 2 produces an invalid type or expression (like <code>int::value_type</code> or <code>x.begin()</code> on an <code>int</code>), that template is <b>discarded</b> instead of causing an error. The remaining candidates compete normally.</p>
      <p><b><code>std::enable_if</code></b> is a tool to cause such a failure on purpose:</p>
      <pre>template &lt;bool B, class T = void&gt; struct enable_if {};          // no ::type
template &lt;class T&gt; struct enable_if&lt;true, T&gt; { using type = T; };   // ::type only when true</pre>
      <p><code>std::enable_if_t&lt;cond, int&gt;</code> is <code>int</code> when <code>cond</code> is true and an <b>invalid type</b> when false → the template vanishes from overload resolution. Preferred placement (it never clashes):</p>
      <pre>template &lt;class T, std::enable_if_t&lt;std::is_integral_v&lt;T&gt;, int&gt; = 0&gt;
void show(T x);   // only exists for integral T</pre>
      ${H.table(['call', '#1 integral', '#2 floating', '#3 has .begin()', '#4 (...)', 'chosen'], [['show(42)', '<span class="c-g">ok</span>', '<span class="c-r">SFINAE</span>', '<span class="c-r">SFINAE</span>', 'ellipsis', '#1'], ['show(2.5)', '<span class="c-r">SFINAE</span>', '<span class="c-g">ok</span>', '<span class="c-r">SFINAE</span>', 'ellipsis', '#2'], ['show(std::string)', '<span class="c-r">SFINAE</span>', '<span class="c-r">SFINAE</span>', '<span class="c-g">ok</span>', 'ellipsis', '#3'], ['show(Widget{})', '<span class="c-r">SFINAE</span>', '<span class="c-r">SFINAE</span>', '<span class="c-r">SFINAE</span>', '<span class="c-g">ok</span>', '#4']])}
      <p><b>Expression SFINAE</b> (C++11): put the expression you need into the signature with <code>decltype</code>: <code>auto f(const T&amp; c) -&gt; decltype(c.size(), void())</code> exists only if <code>c.size()</code> compiles.</p>
      <p><b>Detection idiom</b> (C++17 <code>std::void_t</code>): build a <code>true</code>/<code>false</code> trait for "does this expression compile?" — see the visualizer.</p>
      <p>⚠️ Only the <b>immediate context</b> counts: a failure in the signature is soft (candidate dropped); a failure inside the <b>body</b> of a chosen template is a <b>hard error</b>. And in C++20, <b>concepts replace almost all of this</b> with readable code — but SFINAE is everywhere in existing libraries and interviews still ask about it.</p>`,
    clues: [
      '"Enable this overload only for integral / arithmetic / iterator types" (pre-C++20) → <code>enable_if_t</code>',
      '"Call <code>x.serialize()</code> if it exists, otherwise use <code>operator&lt;&lt;</code>" → expression SFINAE / detection idiom',
      '"Does type T have member X?" at compile time → <code>void_t</code> detector',
      '"Two templates with <code>class = enable_if_t&lt;…&gt;</code> give a redefinition error" → defaults are not part of the signature; use <code>enable_if_t&lt;…, int&gt; = 0</code>',
      '"Why did I get a wall of errors instead of a clean \'no match\'?" → error was in the body, not the immediate context',
      '"Make a forwarding constructor stop hijacking the copy constructor" → constrain it with enable_if / concepts'
    ],
    code: [R`
      #include <iostream>
      #include <string>
      #include <type_traits>
      #include <vector>

      // #1 integers only (SFINAE via a defaulted non-type template parameter)
      template <class T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
      void show(T x) { std::cout << "integer " << x << "\n"; }

      // #2 floating point only
      template <class T, std::enable_if_t<std::is_floating_point_v<T>, int> = 0>
      void show(T x) { std::cout << "floating " << x << "\n"; }

      // #3 anything with .begin()/.end(): expression SFINAE in the trailing return type
      template <class T>
      auto show(const T& c) -> decltype(c.begin(), c.end(), void()) {
          std::cout << "range of " << c.size() << " elements\n";
      }

      // #4 the catch-all: an ellipsis has the worst possible conversion rank
      void show(...) { std::cout << "something else\n"; }

      struct Widget {};

      int main() {
          show(42);                              // integer 42
          show(2.5);                             // floating 2.5
          show(std::string("hey"));              // range of 3 elements
          show(std::vector<int>{1, 2});          // range of 2 elements
          show(Widget{});                        // something else
      }
    `, R`
      #include <iostream>
      #include <string>
      #include <type_traits>
      #include <utility>
      #include <vector>

      // Detection idiom: primary = false, partial specialization with void_t = true.
      template <class T, class = void>
      struct has_size : std::false_type {};
      template <class T>
      struct has_size<T, std::void_t<decltype(std::declval<const T&>().size())>> : std::true_type {};
      template <class T> inline constexpr bool has_size_v = has_size<T>::value;

      template <class T, class = void>
      struct is_streamable : std::false_type {};
      template <class T>
      struct is_streamable<T, std::void_t<decltype(std::declval<std::ostream&>() << std::declval<const T&>())>>
          : std::true_type {};

      static_assert(has_size_v<std::string> && has_size_v<std::vector<int>> && !has_size_v<int>);
      static_assert(is_streamable<int>::value && !is_streamable<std::vector<int>>::value);

      int main() { std::cout << std::boolalpha << has_size_v<std::string> << "\n"; }   // true
    `],
    codeTitle: ['An overload set filtered by SFINAE (the visualizer resolves this)', 'The void_t detection idiom'],
    viz: [{
      title: 'SFINAE candidate elimination, step by step',
      input: 'std::string',
      inputLabel: 'Argument type: int, unsigned, long, short, char, bool, float, double, int*, const char*, string, vector<int>, Widget',
      gen: sfinaeViz
    }, {
      title: 'Detection idiom: void_t picks the true or false specialization',
      input: 'std::vector<int>',
      inputLabel: 'Type to inspect: int, double, bool, int*, const char*, string, vector<int>, Widget',
      gen: detectViz
    }],
    examples: [
      { title: 'The redefinition trap with class = enable_if_t', html: `<p>These two templates are the <b>same</b> template to the compiler, because default template arguments are not part of the signature: both are <code>template&lt;class T, class&gt; void f(T)</code> → "redefinition" error.</p>
        <pre>template &lt;class T, class = std::enable_if_t&lt;std::is_integral_v&lt;T&gt;&gt;&gt; void f(T);
template &lt;class T, class = std::enable_if_t&lt;!std::is_integral_v&lt;T&gt;&gt;&gt; void f(T);   // error</pre>
        <p>Fix: make the condition part of the parameter's <i>type</i>: <code>std::enable_if_t&lt;cond, int&gt; = 0</code>. Now the two non-type parameters have different types (one is invalid), so they are different templates.</p>`, code: R`
        #include <type_traits>
        template <class T, std::enable_if_t<std::is_integral_v<T>, int> = 0>  int f(T) { return 1; }
        template <class T, std::enable_if_t<!std::is_integral_v<T>, int> = 0> int f(T) { return 2; }
        int main() { return f(3) + f(2.5) == 3 ? 0 : 1; }
      ` },
      { title: 'Soft error vs hard error', html: `<p><b>Soft</b> (SFINAE): <code>template&lt;class T&gt; typename T::value_type first(const T&amp;)</code> called with <code>int</code> → <code>int::value_type</code> is invalid <i>in the signature</i> → candidate dropped; another overload may win.</p>
        <p><b>Hard</b>: <code>template&lt;class T&gt; auto twice(T x) { return x.size() * 2; }</code> called with <code>int</code> → return type is deduced from the body, so the compiler must instantiate the body → <code>x.size()</code> fails <b>outside</b> the immediate context → compile error, even if another overload would have worked. Lesson: if you want SFINAE, spell the requirement in the declaration (<code>-&gt; decltype(x.size() * 2)</code>), not only in the body.</p>
        ${H.table(['where the failure happens', 'effect'], [['return type / parameter types / template defaults', '<span class="c-g">candidate silently removed</span>'], ['function body, or a class instantiated by the signature', '<span class="c-r">hard compile error</span>']])}` },
      { title: 'Priority tags: ordering overlapping SFINAE overloads', html: `<p>When several SFINAE overloads can match (a type has both <code>.serialize()</code> and <code>operator&lt;&lt;</code>), add a "priority" argument: derived-to-base conversions rank higher the closer they are, so <code>priority&lt;2&gt;</code> beats <code>priority&lt;1&gt;</code> beats <code>priority&lt;0&gt;</code>.</p>`, code: R`
        #include <iostream>
        #include <sstream>
        #include <string>
        template <int N> struct priority : priority<N - 1> {};
        template <> struct priority<0> {};

        template <class T> auto toStr(const T& x, priority<2>) -> decltype(x.serialize()) { return x.serialize(); }
        template <class T> auto toStr(const T& x, priority<1>) -> decltype(std::declval<std::ostream&>() << x, std::string()) {
            std::ostringstream os; os << x; return os.str();
        }
        template <class T> std::string toStr(const T&, priority<0>) { return "<?>"; }
        template <class T> std::string toStr(const T& x) { return toStr(x, priority<2>{}); }

        struct Both { std::string serialize() const { return "S"; } };
        std::ostream& operator<<(std::ostream& o, const Both&) { return o << "O"; }
        struct Nothing {};
        int main() { std::cout << toStr(Both{}) << toStr(42) << toStr(Nothing{}) << "\n"; }   // S42<?>
      ` }
    ],
    deepDive: `<p>🟣 <b>What exactly is "substitution"?</b> [temp.deduct] says: after deduction, the template arguments are substituted into the function type and the template parameter declarations. Any <i>invalid type or expression</i> formed in the <b>immediate context</b> of that substitution makes deduction fail. Things outside the immediate context — instantiating a class template's definition (e.g. a trait whose body has an error), instantiating a function body for return type deduction, lambdas' bodies in unevaluated operands — are hard errors. Access checking is part of substitution since C++11, so calling a private member in a <code>decltype</code> also SFINAEs out.</p>
      <p><b>SFINAE on class templates.</b> Partial specializations use the same rule when matching (that is how <code>void_t</code> works). The <code>void_t</code> trick needed CWG 1558 to be reliable: unused alias template arguments were not guaranteed to be substituted, which is why early implementations wrote <code>template&lt;class...&gt; struct make_void { using type = void; };</code>.</p>
      <p><b>Costs.</b> SFINAE-heavy overload sets make error messages enormous ("candidate template ignored: requirement … was not satisfied" × 30) and slow down compilation: every candidate is substituted for every call. Each <code>enable_if</code> condition is also invisible in documentation. That is why C++20 concepts were designed: constraints are checked <i>before</i> substitution into the signature, are named, compose with <code>&amp;&amp;</code>/<code>||</code>, take part in ordering (subsumption), and produce readable diagnostics.</p>
      <p><b>In the standard library</b> SFINAE was specified as "this overload shall not participate in overload resolution unless…" — e.g. <code>std::function</code>'s converting constructor, <code>std::pair</code>'s conditionally-explicit constructors, <code>std::vector(InputIt, InputIt)</code> versus <code>std::vector(size_type, const T&amp;)</code>, which is how <code>vector&lt;int&gt;(5, 3)</code> does not try to treat 5 and 3 as iterators.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> nobody needs to memorize SFINAE incantations anymore — an assistant will write a correct <code>void_t</code> detector or translate an <code>enable_if</code> soup into a concept in seconds. Its biggest value is <b>reading</b> legacy template code: paste a 40-line SFINAE overload set and ask "for which types is each overload enabled? draw me a table".</p>
      <p><b>Where AI goes wrong:</b> it produces the <code>class = enable_if_t&lt;…&gt;</code> redefinition bug, puts the requirement only in the body (hard error instead of SFINAE), forgets <code>std::declval</code> and default-constructs types that are not default-constructible, and leaves overlapping overloads ambiguous. It may also SFINAE when an <code>if constexpr</code> inside one function would be clearer. <b>What you must still own:</b> the immediate-context rule, the enable_if mechanics, reading compiler "candidate ignored" notes, and the judgment to migrate to concepts when the toolchain allows.</p>`,
    problems: [{
      title: 'lengthOf: container, C array, or scalar (SFINAE)',
      level: 'Medium', tags: ['SFINAE', 'enable_if', 'expression SFINAE'], companies: ['Bloomberg', 'Two Sigma'],
      statement: `<p>Using C++17 tools only (no concepts), write <code>lengthOf(x)</code>: returns <code>x.size()</code> if that expression is valid, <code>N</code> for a built-in array <code>T[N]</code>, and <code>1</code> for arithmetic scalars. Any other type must fail to compile with "no matching function".</p>`,
      constraints: `Types: standard containers/strings, built-in arrays, arithmetic types.`,
      example: `<p><code>lengthOf(std::string("abc"))</code> → ${H.c('g', '3')}; <code>int a[5]; lengthOf(a)</code> → ${H.c('g', '5')}; <code>lengthOf(2.5)</code> → ${H.c('g', '1')}; <code>lengthOf(Widget{})</code> → ${H.c('r', 'no matching function')}. Note <code>lengthOf("abc")</code> is an array of 4 chars (with the terminating NUL) → 4.</p>`,
      brute: { why: `<p>Write overloads per concrete type (<code>lengthOf(const std::string&amp;)</code>, <code>lengthOf(const std::vector&lt;int&gt;&amp;)</code>, …). It never covers new containers and needs a separate overload for every array size.</p>`, code: R`
        #include <cstddef>
        #include <string>
        #include <vector>
        std::size_t lengthOf(const std::string& s) { return s.size(); }
        std::size_t lengthOf(const std::vector<int>& v) { return v.size(); }
        std::size_t lengthOf(int) { return 1; }
      ` },
      mcq: { q: 'For <code>int a[5]</code>, why is the <code>-&gt; decltype(c.size(), std::size_t{})</code> overload not a problem?', options: ['<code>a.size()</code> is invalid in the trailing return type, so that overload is removed by SFINAE', 'Arrays have a size() member', 'It causes a hard error that we must silence', 'The array decays to a pointer first'], answer: 0, explain: 'The failure happens while forming the declaration (immediate context), so the candidate is quietly dropped and the <code>const T (&amp;)[N]</code> overload wins.' },
      hints: [`<p>Hint 1: Three overloads, each enabled for exactly one category so they never overlap.</p>`, `<p>Hint 2: Container: <code>template&lt;class T&gt; auto lengthOf(const T&amp; c) -&gt; decltype(c.size(), std::size_t{})</code>. Array: <code>template&lt;class T, std::size_t N&gt; std::size_t lengthOf(const T (&amp;)[N])</code>.</p>`, `<p>Hint 3: Scalar: <code>template&lt;class T, std::enable_if_t&lt;std::is_arithmetic_v&lt;T&gt;, int&gt; = 0&gt;</code>. Check the overlap table: string → only #1; int[5] → only #2 (#1 SFINAE, #3 T=int[5] is not arithmetic); double → only #3. Widget → none → clean error.</p>`],
      solution: {
        approach: `<p>Three mutually exclusive overloads. Expression SFINAE in the trailing return type enables the container case; reference-to-array deduction captures N; <code>enable_if_t</code> restricts the scalar case to arithmetic types.</p>`,
        code: R`
          #include <cstddef>
          #include <iostream>
          #include <string>
          #include <type_traits>
          #include <vector>

          template <class T>                                       // #1 anything with .size()
          auto lengthOf(const T& c) -> decltype(c.size(), std::size_t{}) { return c.size(); }

          template <class T, std::size_t N>                        // #2 built-in arrays
          std::size_t lengthOf(const T (&)[N]) { return N; }

          template <class T, std::enable_if_t<std::is_arithmetic_v<T>, int> = 0>
          std::size_t lengthOf(const T&) { return 1; }             // #3 scalars

          int main() {
              int a[5]{};
              std::cout << lengthOf(std::string("abc")) << " "     // 3
                        << lengthOf(std::vector<int>{1, 2}) << " "  // 2
                        << lengthOf(a) << " "                       // 5
                        << lengthOf("abc") << " "                   // 4 (includes the NUL)
                        << lengthOf(2.5) << "\n";                   // 1
          }
        `,
        dry: { head: ['argument', '#1 .size()', '#2 T(&amp;)[N]', '#3 arithmetic', 'chosen'], rows: [
          ['std::string', '<span class="c-g">ok</span>', 'deduction fails', 'SFINAE', '#1 → 3'],
          ['int[5]', 'SFINAE (no .size())', '<span class="c-g">T=int, N=5</span>', 'SFINAE (T=int[5])', '#2 → 5'],
          ['double', 'SFINAE', 'deduction fails', '<span class="c-g">ok</span>', '#3 → 1'],
          ['Widget', 'SFINAE', 'deduction fails', 'SFINAE', '<span class="c-r">no match</span>']
        ] },
        complexity: `<p>O(1) at run time; each call resolves at compile time.</p>`,
        followUps: ['Rewrite it with C++20 concepts — how many lines disappear?', 'Return <code>std::size(x)</code> instead — what does the standard already provide?', 'Add support for types with only <code>begin()/end()</code> (like <code>std::forward_list</code>).']
      }
    }]
  });
registerModule({ id: 'cpp09', title: 'Templates, SFINAE & Concepts', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
