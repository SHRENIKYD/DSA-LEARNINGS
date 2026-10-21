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
    frames.push({ narr: '<b>Winner: #' + (w + 1) + ' <code>' + E(cands[w].sig) + '</code></b>' + (st[w].T ? ' with T = <b>' + E(st[w].T) + '</b>' : '') + '. ' + (cands[w].kind === 'template' ? 'Only now is that one function template <i>instantiated</i> (its body compiled for this T); the losers were never instantiated.' : 'It is an ordinary function, so there is nothing to instantiate — the losing templates were never instantiated either.'), parts: [tbl(hw), note('Call <code>' + E(title) + '(x)</code> with <code>x</code> of type <b>' + E(arg) + '</b> → runs <b>#' + (w + 1) + '</b>.', 'Result')] });
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
      tests: {"sig":"list<double> int -> int","fn":"indexOfD","harness":{"cpp":"int indexOfD(vector<double> v, int x) { return indexOf(v, x); }"},"cases":[[[[1.5,3,4],3],1],[[[1.5,3,4],9],-1],[[[],1],-1],[[[5],5],0],[[[7,7,2],7],0],[[[7,7,2],2],2],[[[-1,0,-1],-1],0],[[[-1,0,-1],0],1],[[[0.5,1.5],1],-1],[[[2.5,2],2],1],[[{"$concat":[{"$rep":1,"n":29999},[2]]},2],29999],[[{"$rep":1,"n":30000},2],-1]]},
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
              std::vector<int> none, one{5}, dup{7, 7, 2}, neg{-1, 0, -1};
              std::cout << indexOf(d, 3) << "\n";      // 1  (3 converted to 3.0)
              std::cout << indexOf(s, "cd") << "\n";   // 1  (const char* -> std::string)
              std::cout << indexOf(d, 9) << "\n";      // -1
              std::cout << indexOf(none, 1) << "\n";   // -1 (empty vector)
              std::cout << indexOf(one, 5) << "\n";    // 0
              std::cout << indexOf(dup, 7) << " " << indexOf(dup, 2) << "\n";     // 0 2 (first match wins)
              std::cout << indexOf(neg, -1) << " " << indexOf(neg, 0) << "\n";    // 0 1
              std::vector<int> big(1000000, 1);
              big.back() = 2;
              std::cout << indexOf(big, 2) << "\n";    // 999999
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
      ${H.table(['kind', 'syntax', 'matches', 'real-world example'], [['primary', '<code>template&lt;class T&gt; struct Hash</code>', 'anything (fallback)', '—'], ['full (explicit)', '<code>template&lt;&gt; struct Hash&lt;bool&gt;</code>', 'exactly <code>bool</code>', '<code>std::hash&lt;int&gt;</code>, <code>std::char_traits&lt;char&gt;</code>'], ['partial', '<code>template&lt;class T&gt; struct Hash&lt;T*&gt;</code>', 'every pointer type', '<code>std::unique_ptr&lt;T[]&gt;</code>, <code>std::iterator_traits&lt;T*&gt;</code>']])}
      <p><b>How the compiler chooses</b>: (1) is there a full specialization for exactly this type? use it. (2) Otherwise find all partial specializations whose pattern matches; if one is <b>more specialized</b> than all others (accepts a strict subset), use it; if two match and neither is more specialized → ambiguity error. (3) Nothing matched → the primary template.</p>
      <p>⚠️ <b>Function templates can be fully specialized but never partially specialized.</b> For "a different version for all pointers" with functions, write an <b>overload</b> <code>template&lt;class T&gt; void f(T*)</code> instead.</p>`,
    clues: [
      '"Generic container / wrapper that works for any element type" → class template',
      '"Special handling for one type" (bool packing, C strings) → full specialization',
      '"Special handling for every pointer / every vector / every pair" → partial specialization',
      '"Compute something about a type at compile time" → class template + specializations = a type trait',
      '"Why is <code>std::vector&lt;bool&gt;</code> weird?" → it is a space-optimized specialization returning proxy references',
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
      <p><b>Real-world:</b> <code>std::vector&lt;bool&gt;</code> is the cautionary tale: a specialization that packs bits and returns a proxy instead of <code>bool&amp;</code>, so it is not a real container (<code>auto&amp; r = v[0]</code> fails, threads writing neighbouring elements race). Specialize for <b>performance or correctness</b>, but keep the same interface semantics.</p>`,
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
      tests: {"sig":"string string list<double> list<list<double>> -> string","fn":"serP","harness":{"cpp":"string serP(string kind, string s, vector<double> v, vector<vector<double>> w) {\n  if (kind == \"int\") return serialize((int)v[0]);\n  if (kind == \"dbl\") return serialize(v[0]);\n  if (kind == \"bool\") return serialize(v[0] != 0);\n  if (kind == \"str\") return serialize(s);\n  if (kind == \"vint\") { vector<int> x(v.begin(), v.end()); return serialize(x); }\n  if (kind == \"vbool\") { vector<bool> x; for (double d : v) x.push_back(d != 0); return serialize(x); }\n  if (kind == \"vstr\") { vector<string> x; stringstream ss(s); string t; while (getline(ss, t, ',')) x.push_back(t); return serialize(x); }\n  if (kind == \"vvint\") { vector<vector<int>> x; for (auto& r : w) x.push_back(vector<int>(r.begin(), r.end())); return serialize(x); }\n  if (kind == \"vvbool\") { vector<vector<bool>> x; for (auto& r : w) { vector<bool> b; for (double d : r) b.push_back(d != 0); x.push_back(b); } return serialize(x); }\n  return \"?\";\n}"},"cases":[[["int","",[42],[]],"42"],[["int","",[-5],[]],"-5"],[["int","",[0],[]],"0"],[["dbl","",[2.5],[]],"2.500000"],[["dbl","",[-0.125],[]],"-0.125000"],[["bool","",[1],[]],"true"],[["bool","",[0],[]],"false"],[["str","hi",[],[]],"\"hi\""],[["str","",[],[]],"\"\""],[["vint","",[1,2,3],[]],"[1, 2, 3]"],[["vint","",[],[]],"[]"],[["vint","",[7],[]],"[7]"],[["vbool","",[1,0,1],[]],"[true, false, true]"],[["vstr","a,b",[],[]],"[\"a\", \"b\"]"],[["vvint","",[],[[],[1]]],"[[], [1]]"],[["vvint","",[],[[1,2],[3]]],"[[1, 2], [3]]"],[["vvbool","",[],[[1],[0,1]]],"[[true], [false, true]]"],[["vvint","",[],[]],"[]"]]},
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
              std::cout << serialize(true) << " " << serialize(std::string("x")) << " " << serialize(-5) << "\n";   // true "x" -5
              std::cout << serialize(std::vector<int>{}) << " " << serialize(std::vector<int>{1, 2, 3}) << "\n";   // [] [1, 2, 3]
              std::cout << serialize(std::vector<std::vector<int>>{{}, {1}}) << "\n";    // [[], [1]]
              std::cout << serialize(2.5) << "\n";                                       // 2.500000
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
      tests: {"sig":"string list<double> -> string","fn":"minP","harness":{"cpp":"string minP(string kind, vector<double> v) {\n  ostringstream os;\n  if (kind == \"int\") {\n    vector<int> a(v.begin(), v.end());\n    switch (a.size()) {\n      case 1: os << minOf(a[0]); break;\n      case 2: os << minOf(a[0], a[1]); break;\n      case 3: os << minOf(a[0], a[1], a[2]); break;\n      case 5: os << minOf(a[0], a[1], a[2], a[3], a[4]); break;\n    }\n  } else if (kind == \"mixed\") os << minOf((int)v[0], v[1], (long)v[2]);\n  else if (kind == \"ll\") os << minOf((long long)v[0], (long long)v[1]);\n  else if (kind == \"intll\") os << minOf((int)v[0], (long long)v[1]);\n  else if (kind == \"float\") os << minOf((int)v[0], (float)v[1]);\n  return os.str();\n}"},"cases":[[["int",[9]],"9"],[["int",[0]],"0"],[["int",[5,5]],"5"],[["int",[-3,0,2]],"-3"],[["int",[4,2,7,1,9]],"1"],[["int",[2147483647,-2147483648]],"-2147483648"],[["mixed",[3,2.5,7]],"2.5"],[["mixed",[4,2.5,7]],"2.5"],[["mixed",[1,2.5,-7]],"-7"],[["ll",[5000000000,3000000000]],"3000000000"],[["intll",[3,-5000000000]],"-5000000000"],[["float",[2,1.5]],"1.5"]]},
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
              static_assert(std::is_same_v<decltype(minOf(1, 2.0)), double>);
              std::cout << minOf(5, 5) << " " << minOf(-3, 0, 2) << " " << minOf(0) << "\n";   // 5 -3 0
              std::cout << minOf(3, 2.5, 7L) << " " << minOf(2, 1.5f) << "\n";                 // 2.5 1.5
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
      tests: {"io":true,"cases":[{"stdin":"","stdout":"0 1 3 2 2"}]},
      solution: {
        approach: `<p>Dispatch on a defaulted <code>bool</code> template parameter: <code>rap&lt;T, std::is_pointer_v&lt;T&gt;&gt;</code>. <code>is_pointer_v</code> is true for cv-qualified pointers too, and <code>std::remove_pointer_t</code> peels exactly one layer (dropping that layer's cv). The <code>false</code> case is the base and keeps the pointee's own <code>const</code> intact, so <code>const char* const*</code> ends at <code>const char</code>.</p>`,
        code: R`
          #include <iostream>
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
          static_assert(pointer_depth_v<int*> == 1 && pointer_depth_v<int* const> == 1);
          static_assert(std::is_same_v<remove_all_pointers_t<void*>, void>);
          static_assert(std::is_same_v<remove_all_pointers_t<int* const* const>, int>);
          static_assert(std::is_same_v<remove_all_pointers_t<int&>, int&>);   // not a pointer: unchanged
          static_assert(std::is_same_v<remove_all_pointers_t<int[3]>, int[3]>);
          static_assert(pointer_depth_v<int********************************> == 32);
          int main() {
              std::cout << pointer_depth_v<int> << " " << pointer_depth_v<int*> << " " << pointer_depth_v<int***> << " "
                        << pointer_depth_v<const char* const*> << " " << pointer_depth_v<int* volatile* const> << "\n";   // 0 1 3 2 2
          }
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
      tests: {"sig":"string int -> long","fn":"lenP","harness":{"cpp":"long long lenP(string kind, int n) {\n  if (kind == \"string\") return lengthOf(string(n, 'a'));\n  if (kind == \"vector\") return lengthOf(vector<int>(n));\n  if (kind == \"list\") return lengthOf(list<int>(n));\n  if (kind == \"map\") { map<int, int> m; for (int i = 0; i < n; i++) m[i] = i; return lengthOf(m); }\n  if (kind == \"array4\") return lengthOf(array<int, 4>{});\n  if (kind == \"carray\") { int a[5]{}; return lengthOf(a); }\n  if (kind == \"grid\") { int g[2][3]{}; return lengthOf(g); }\n  if (kind == \"cstr\") return lengthOf(\"abc\");\n  if (kind == \"int\") return lengthOf(7);\n  if (kind == \"double\") return lengthOf(2.5);\n  if (kind == \"char\") return lengthOf('c');\n  if (kind == \"bool\") return lengthOf(true);\n  return -1;\n}"},"cases":[[["string",3],3],[["string",0],0],[["vector",2],2],[["vector",0],0],[["vector",100000],100000],[["list",7],7],[["map",5],5],[["array4",0],4],[["carray",0],5],[["grid",0],2],[["cstr",0],4],[["int",0],1],[["double",0],1],[["char",0],1],[["bool",0],1]]},
      solution: {
        approach: `<p>Three mutually exclusive overloads. Expression SFINAE in the trailing return type enables the container case; reference-to-array deduction captures N; <code>enable_if_t</code> restricts the scalar case to arithmetic types.</p>`,
        code: R`
          #include <array>
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
              int grid[2][3]{};
              std::cout << lengthOf(std::vector<int>{}) << " " << lengthOf(std::string()) << " "
                        << lengthOf(7) << " " << lengthOf('c') << " " << lengthOf(true) << "\n";   // 0 0 1 1 1
              std::cout << lengthOf(std::array<int, 4>{}) << " " << lengthOf(grid) << " "
                        << lengthOf(std::vector<int>(1000000)) << "\n";                            // 4 2 1000000
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

  /* ======================================================================
     TOPIC 6 — C++20 concepts & requires clauses
     ====================================================================== */
  function conceptCheckViz(input) {
    var T = normType(input === undefined ? 'std::vector<int>' : input), P = TYPES[T];
    var frames = [], rows = [];
    var code = 'template <class T>\nconcept Container = requires(T c, const T cc) {\n    typename T::value_type;                              // (1) type requirement\n    { cc.size() } -> std::convertible_to<std::size_t>;   // (2) compound requirement\n    c.begin();  c.end();                                 // (3) simple requirements\n    requires std::equality_comparable<T>;                // (4) nested requirement\n};\n\ntemplate <class T>\nconcept Number = std::integral<T> || std::floating_point<T>;   // (5) disjunction\n\ntemplate <class T>\nconcept SignedNumber = Number<T> && std::is_signed_v<T>;       // (6) conjunction';
    var reqs = [
      { line: 3, label: '(1) typename T::value_type', ok: !!P.valueType, yes: T + ' has a nested type value_type', no: T + ' has no member type value_type' },
      { line: 4, label: '(2) { cc.size() } -> convertible_to<size_t>', ok: !!P.size, yes: 'cc.size() compiles and returns size_t', no: 'cc.size() is not a valid expression' },
      { line: 5, label: '(3) c.begin(); c.end();', ok: !!P.range, yes: 'both expressions compile (only checked, never run)', no: 'c.begin() is not valid' },
      { line: 6, label: '(4) requires equality_comparable<T>', ok: T !== 'Widget', yes: 'a == b and a != b compile', no: 'no operator== for ' + T }
    ];
    frames.push({ narr: 'A <b>concept</b> is a named, compile-time yes/no predicate on types. A <code>requires</code> expression lists things that must <b>compile</b> for T (they are never executed). Checking <code>Container&lt;' + E(T) + '&gt;</code> requirement by requirement.', parts: [{ type: 'code', label: 'Concepts under test', lang: 'cpp', code: code }, { type: 'table', label: 'Requirement checks for T = ' + E(T), columns: ['requirement', 'satisfied?', 'why'], rows: [] }] });
    var all = true;
    reqs.forEach(function (r, i) {
      rows.push([r.label, r.ok ? 'yes' : 'NO', r.ok ? r.yes : r.no]);
      if (!r.ok) all = false;
      var h = {}; h[i] = r.ok ? 'ok' : 'bad';
      var hlc = {}; hlc[r.line] = r.ok ? 'ok' : 'bad';
      frames.push({ narr: 'Requirement ' + r.label.slice(0, 3) + ': ' + (r.ok ? '<span class="c-g">' + E(r.yes) + '</span>.' : '<span class="c-r">' + E(r.no) + '</span> → the requires-expression is <b>false</b>. (A failing requirement is not an error; it just makes the concept false.)'), parts: [{ type: 'code', label: 'Concepts under test', lang: 'cpp', code: code, hl: hlc }, { type: 'table', label: 'Requirement checks for T = ' + E(T), columns: ['requirement', 'satisfied?', 'why'], rows: rows.map(function (x) { return x.slice(); }), hl: h }] });
    });
    rows.push(['Container<' + T + '>', all ? 'TRUE' : 'FALSE', all ? 'every requirement holds' : 'at least one requirement failed']);
    var num = !!(P.integral || P.floating);
    rows.push(['Number<' + T + '> = integral || floating_point', num ? 'TRUE' : 'FALSE', P.integral ? 'integral<' + T + '> is true (|| short-circuits)' : P.floating ? 'integral is false, floating_point is true' : 'neither alternative holds']);
    var hs = {}; hs[rows.length - 2] = all ? 'sel' : 'bad'; hs[rows.length - 1] = num ? 'sel' : 'bad';
    frames.push({ narr: '<code>Container&lt;' + E(T) + '&gt;</code> = <b>' + all + '</b>. <code>Number&lt;' + E(T) + '&gt;</code> is a <b>disjunction</b>: it is true if either side is true, checked left to right with short-circuiting.', parts: [{ type: 'code', label: 'Concepts under test', lang: 'cpp', code: code, hl: { 10: num ? 'ok' : 'bad' } }, { type: 'table', label: 'Requirement checks for T = ' + E(T), columns: ['requirement', 'satisfied?', 'why'], rows: rows.map(function (x) { return x.slice(); }), hl: hs }] });
    var sn = num && !!P.signedInt;
    rows.push(['SignedNumber<' + T + '> = Number && is_signed_v', sn ? 'TRUE' : 'FALSE', !num ? 'Number is false, so && short-circuits (is_signed_v is not even checked)' : sn ? 'Number holds and ' + T + ' is signed' + (T === 'char' ? ' (char signedness is implementation-defined; signed on x86 GCC/Clang)' : '') : T + ' is not signed']);
    var hs2 = {}; hs2[rows.length - 1] = sn ? 'sel' : 'bad';
    frames.push({ narr: '<code>SignedNumber</code> is a <b>conjunction</b> built on top of <code>Number</code>. Because it is defined as <code>Number&lt;T&gt; &amp;&amp; …</code>, the compiler knows <code>SignedNumber</code> <b>subsumes</b> <code>Number</code> (it is strictly more demanding). That fact decides overloads — see the next visualizer.', parts: [{ type: 'code', label: 'Concepts under test', lang: 'cpp', code: code, hl: { 13: sn ? 'ok' : 'bad' } }, { type: 'table', label: 'Requirement checks for T = ' + E(T), columns: ['requirement', 'satisfied?', 'why'], rows: rows, hl: hs2 }] });
    frames.push({ narr: 'If you call <code>template&lt;Container C&gt; void f(C)</code> with <b>' + E(T) + '</b>, the compiler ' + (all ? 'accepts it.' : 'rejects it with a <b>short, readable error</b> that names the failed requirement — instead of a 200-line SFINAE or body-instantiation error.'), parts: [note(all ? '<span class="c-g">Container&lt;' + E(T) + '&gt; satisfied — call compiles.</span>' : '<span class="c-r">error: no matching function for call to f(' + E(T) + ')<br>note: constraints not satisfied<br>note: the required ' + E(reqs.filter(function (r) { return !r.ok; })[0].label) + ' is invalid</span>', 'Compiler output (simplified)')] });
    return frames;
  }

  var OVL_CONCEPT = R`
template <class T>              void describe(T)  // #1 unconstrained
template <std::integral T>      void describe(T)  // #2
template <std::signed_integral T> void describe(T) // #3 subsumes #2
template <Container T>          void describe(T)  // #4`;
  function conceptOverloadViz(input) {
    var arg = normType(input === undefined ? 'int' : input);
    var any = function (a) { return { ok: true, T: a, why: 'T = argument type' }; };
    var cands = [
      { sig: 'template<class T> describe(T)', kind: 'template', family: 'concept', spec: 0, deduce: any, check: function () { return { ok: true, why: 'no constraints at all' }; } },
      { sig: 'template<std::integral T> describe(T)', kind: 'template', family: 'concept', spec: 1, deduce: any, check: function (T) { return TYPES[T].integral ? { ok: true, why: 'std::integral<' + T + '> is satisfied' } : { ok: false, why: 'std::integral<' + T + '> is not satisfied' }; } },
      { sig: 'template<std::signed_integral T> describe(T)', kind: 'template', family: 'concept', spec: 2, deduce: any, check: function (T) { return TYPES[T].signedInt ? { ok: true, why: 'integral<' + T + '> && is_signed_v<' + T + '> both hold' } : { ok: false, why: TYPES[T].integral ? T + ' is integral but not signed' : 'std::integral<' + T + '> already fails' }; } },
      { sig: 'template<Container T> describe(T)', kind: 'template', family: 'concept', spec: 1, deduce: any, check: function (T) { var p = TYPES[T]; return p.range && p.size && p.valueType ? { ok: true, why: 'value_type, size(), begin()/end(), == all valid' } : { ok: false, why: 'Container<' + T + '> fails (e.g. no ' + (p.valueType ? (p.size ? 'begin()' : 'size()') : 'value_type') + ')' }; } }
    ];
    return resolve(cands, arg, 'describe', OVL_CONCEPT);
  }

  topics.push({
    title: 'C++20 Concepts & requires Clauses',
    analogy: `<p>A job posting that says <b>"Requirements: driving licence, can lift 20 kg, speaks English"</b>. Applicants who do not meet them are turned away <i>at the door</i> with a clear reason, instead of being hired and failing on day three. A <b>concept</b> is that requirements list for a type, and the compiler is the receptionist: it checks the list <b>before</b> touching the template body, and if your type is missing something it tells you exactly which line of the list failed.</p>`,
    explain: `<p>🟢 A <b>concept</b> is a named compile-time predicate on types:</p>
      <pre>template &lt;class T&gt;
concept Number = std::integral&lt;T&gt; || std::floating_point&lt;T&gt;;</pre>
      <p>You use it to <b>constrain</b> a template. Four equivalent spellings:</p>
      ${H.table(['style', 'code'], [['type-constraint', '<code>template &lt;Number T&gt; T twice(T x);</code>'], ['requires clause', '<code>template &lt;class T&gt; requires Number&lt;T&gt; T twice(T x);</code>'], ['trailing requires', '<code>template &lt;class T&gt; T twice(T x) requires Number&lt;T&gt;;</code>'], ['abbreviated', '<code>auto twice(Number auto x);</code>']])}
      <p>A <b>requires-expression</b> describes what must compile, without running anything:</p>
      <pre>template &lt;class T&gt;
concept Container = requires(T c, const T cc) {
    typename T::value_type;                              // type requirement
    { cc.size() } -&gt; std::convertible_to&lt;std::size_t&gt;;   // compound: valid + result type
    c.begin(); c.end();                                  // simple: just must compile
    requires std::equality_comparable&lt;T&gt;;                // nested: a bool must be true
};</pre>
      <p><b>Why concepts beat SFINAE:</b></p>
      <ul>
        <li><b>Readable</b>: the requirement is in the declaration with a name, not hidden in <code>enable_if_t&lt;…, int&gt; = 0</code>.</li>
        <li><b>Better errors</b>: "constraints not satisfied: <code>c.begin()</code> is invalid" instead of pages of template backtrace.</li>
        <li><b>Ordering for free</b>: when two constrained overloads both match, the <b>more constrained</b> one wins (<b>subsumption</b>). <code>std::signed_integral</code> is defined as <code>std::integral&lt;T&gt; &amp;&amp; std::is_signed_v&lt;T&gt;</code>, so it beats a plain <code>std::integral</code> overload for <code>int</code> — no priority tags needed.</li>
        <li><b>Works everywhere</b>: function templates, class templates, member functions (<code>void sort() requires std::totally_ordered&lt;T&gt;;</code>), variables (<code>std::integral auto n = f();</code>), lambdas (<code>[]&lt;std::integral T&gt;(T x) {}</code>).</li>
      </ul>
      <p>The standard library ships ready-made concepts in <code>&lt;concepts&gt;</code>, <code>&lt;iterator&gt;</code> and <code>&lt;ranges&gt;</code>: <code>same_as, derived_from, convertible_to, integral, floating_point, totally_ordered, equality_comparable, copyable, movable, regular, invocable, predicate, ranges::range, random_access_iterator, sortable</code>… Prefer them over writing your own.</p>`,
    clues: [
      '"Constrain a template", "give a clean error when T is wrong", "C++20" → concepts',
      '"Faster algorithm for random-access iterators, fallback for others" → overloads on <code>std::random_access_iterator</code> vs <code>std::input_iterator</code> (subsumption)',
      '"T must have <code>.size()</code> returning an integer" → requires-expression with compound requirement',
      '"Member function only available for some T" → trailing <code>requires</code> on the member',
      '"Replace this enable_if mess" → concept + <code>requires</code> clause',
      '"Why is my more-specific overload ambiguous?" → raw <code>requires</code> expressions do not subsume; use named concepts'
    ],
    code: [R`
      #include <concepts>
      #include <cstddef>
      #include <iostream>
      #include <string>
      #include <vector>

      template <class T>
      concept Container = requires(T c, const T cc) {
          typename T::value_type;
          { cc.size() } -> std::convertible_to<std::size_t>;
          c.begin();
          c.end();
          requires std::equality_comparable<T>;
      };

      template <class T>                 void describe(T)   { std::cout << "something\n"; }
      template <std::integral T>         void describe(T)   { std::cout << "integral\n"; }
      template <std::signed_integral T>  void describe(T)   { std::cout << "signed integral\n"; }  // subsumes integral
      template <Container T>             void describe(T c) { std::cout << "container of " << c.size() << "\n"; }

      // Abbreviated syntax + a compound requirement with an ad-hoc requires-requires.
      auto half(std::floating_point auto x) { return x / 2; }
      template <class T>
          requires requires(T a) { { a.area() } -> std::convertible_to<double>; }
      double areaOf(const T& s) { return s.area(); }

      struct Sq { double s; double area() const { return s * s; } };

      int main() {
          describe(5);                          // signed integral   (#3 beats #2 beats #1)
          describe(5u);                         // integral
          describe(2.5);                        // something
          describe(std::string("abc"));         // container of 3
          describe(std::vector<int>{1, 2});     // container of 2
          std::cout << half(3.0) << " " << areaOf(Sq{3}) << "\n";   // 1.5 9
          // half(3);  // error: constraints not satisfied: std::floating_point<int> is false
      }
    `, R`
      #include <concepts>
      #include <iterator>
      #include <list>
      #include <vector>
      #include <iostream>

      // Concept-based dispatch: O(1) for random access, O(n) otherwise.
      template <std::input_iterator It>
      void myAdvance(It& it, std::iter_difference_t<It> n) {
          std::cout << "step by step\n";
          while (n-- > 0) ++it;
      }
      template <std::random_access_iterator It>   // random_access_iterator subsumes input_iterator
      void myAdvance(It& it, std::iter_difference_t<It> n) {
          std::cout << "jump\n";
          it += n;
      }

      // A class template with a constrained member function.
      template <class T>
      struct Box {
          T value;
          T twice() const requires std::integral<T> || std::floating_point<T> { return value * 2; }
      };

      int main() {
          std::vector<int> v{1, 2, 3, 4};
          std::list<int> l{1, 2, 3, 4};
          auto vi = v.begin(); myAdvance(vi, 2);   // jump
          auto li = l.begin(); myAdvance(li, 2);   // step by step
          Box<int> b{21};
          std::cout << b.twice() << "\n";          // 42
          Box<std::vector<int>> bv{{1}};            // fine: twice() simply is not available
          (void)bv;
      }
    `],
    codeTitle: ['Concepts, requires-expressions and subsumption-based overloads', 'Iterator-concept dispatch and a constrained member function'],
    viz: [{
      title: 'Checking a concept requirement by requirement',
      input: 'std::vector<int>',
      inputLabel: 'Type: int, unsigned, long, short, char, bool, float, double, int*, const char*, string, vector<int>, Widget',
      gen: conceptCheckViz
    }, {
      title: 'Which constrained overload is chosen? (subsumption)',
      input: 'int',
      inputLabel: 'Argument type: int, unsigned, long, short, char, bool, float, double, int*, const char*, string, vector<int>, Widget',
      gen: conceptOverloadViz
    }],
    examples: [
      { title: 'Subsumption works only through named concepts', html: `<p>These two overloads are <b>ambiguous</b> for <code>int</code>, even though the second "obviously" says more:</p>
        <pre>template &lt;class T&gt; requires std::is_integral_v&lt;T&gt; void g(T);
template &lt;class T&gt; requires std::is_integral_v&lt;T&gt; &amp;&amp; std::is_signed_v&lt;T&gt; void g(T);</pre>
        <p>Atomic constraints are only considered identical if they come from the <b>same expression in the same concept definition</b>. Two separately written <code>std::is_integral_v&lt;T&gt;</code> are different atoms, so neither subsumes the other. Wrap them in concepts and it works:</p>`, code: R`
        #include <type_traits>
        template <class T> concept Integral = std::is_integral_v<T>;
        template <class T> concept SignedIntegral = Integral<T> && std::is_signed_v<T>;
        template <class T> requires Integral<T>       int g(T) { return 1; }
        template <class T> requires SignedIntegral<T> int g(T) { return 2; }   // subsumes the first
        int main() { return g(5) == 2 && g(5u) == 1 ? 0 : 1; }
      ` },
      { title: 'Constraining a forwarding constructor', html: `<p>A variadic or forwarding constructor can steal calls meant for the copy constructor (a non-const lvalue <code>Wrapper w2(w1)</code> binds better to <code>T&amp;&amp;</code> than to <code>const Wrapper&amp;</code>). Constrain it so it never accepts a <code>Wrapper</code> itself.</p>`, code: R`
        #include <concepts>
        #include <string>
        #include <type_traits>
        #include <utility>
        struct Wrapper {
            std::string s;
            template <class T>
                requires (!std::same_as<std::remove_cvref_t<T>, Wrapper>) && std::constructible_from<std::string, T>
            explicit Wrapper(T&& x) : s(std::forward<T>(x)) {}
            Wrapper(const Wrapper&) = default;
        };
        int main() { Wrapper a("hi"); Wrapper b(a); return b.s == "hi" ? 0 : 1; }   // b(a) uses the copy ctor
      ` },
      { title: 'Readable errors (the real selling point)', html: `<p>Calling <code>std::sort</code> on a <code>std::list</code> gives a long error deep inside the library because it needs random-access iterators. <code>std::ranges::sort(myList)</code> stops at the door:</p>
        ${H.table(['call', 'diagnostic (simplified)'], [['<code>std::sort(l.begin(), l.end())</code>', '<span class="c-r">error: no match for operator- … inside __introsort_loop … (40+ lines)</span>'], ['<code>std::ranges::sort(l)</code>', '<span class="c-g">error: constraints not satisfied: random_access_range&lt;list&lt;int&gt;&gt; is false</span>']])}
        <p>Fix: <code>l.sort()</code> (member function for lists) or copy into a vector.</p>` },
      { title: 'Concepts in class templates and auto variables', html: `<p>Constrain class template parameters so misuse fails at the declaration, and use constrained <code>auto</code> to document intent in local variables.</p>`, code: R`
        #include <concepts>
        #include <vector>
        template <std::totally_ordered T>
        class SortedVec {
            std::vector<T> v_;
        public:
            void insert(const T& x) {
                auto it = v_.begin();
                while (it != v_.end() && *it < x) ++it;
                v_.insert(it, x);
            }
            const T& front() const { return v_.front(); }
        };
        int main() {
            SortedVec<int> s; s.insert(3); s.insert(1);
            std::integral auto first = s.front();      // documents "this must be an integer"
            return first == 1 ? 0 : 1;
            // struct P {}; SortedVec<P> bad;   // error: P does not satisfy totally_ordered
        }
      ` }
    ],
    deepDive: `<p>🟣 <b>Normal form and subsumption.</b> The compiler normalizes a constraint into a logical formula of <b>atomic constraints</b> joined by ∧ and ∨ (expanding named concepts). <code>P</code> subsumes <code>Q</code> if every disjunctive clause of P's disjunctive normal form contains an atom identical to an atom in <i>every</i> conjunctive clause of Q's conjunctive normal form — in practice "P = Q ∧ more". Atoms are compared by <b>identity of the expression and the template-parameter mapping</b>, not by meaning; that is why named concepts matter. Normalization is exponential in the worst case, so keep constraint expressions shallow.</p>
      <p><b>Order of checks.</b> Constraints on a function template are checked after deduction but <i>before</i> substitution into the rest of the signature in many cases (associated constraints are checked during overload resolution; template-head constraints run first). Conjunctions and disjunctions short-circuit, so <code>std::integral&lt;T&gt; &amp;&amp; (sizeof(T) &gt; 4)</code> never evaluates the second part for non-integral T. Satisfaction results are cached per argument list — a concept is assumed to give the same answer every time (changing the answer, e.g. by completing a type later, is ill-formed NDR).</p>
      <p><b>Syntax only, semantics on paper.</b> <code>std::totally_ordered</code> checks that the six comparison operators compile; it cannot check that they actually form a total order. Standard concepts carry <b>semantic requirements</b> in their documentation, and violating them is undefined behavior. Library designers therefore prefer a few coarse-grained, meaningful concepts (<code>regular</code>, <code>sortable</code>) over hundreds of tiny syntactic ones like <code>HasPlus</code> ("concepts should model domain ideas, not syntax").</p>
      <p><b>Conditionally trivial special members (C++20):</b> you can now write two destructors, <code>~Opt() requires std::is_trivially_destructible_v&lt;T&gt; = default;</code> and a non-trivial one, letting <code>std::optional&lt;int&gt;</code> stay trivially copyable — something previously requiring layers of base classes. C++26 continues the direction with pack indexing and reflection, but concepts remain the main tool for constraining generic code.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> concepts make template code <b>self-documenting</b>, which also makes it easier for AI tools (and humans) to understand and generate correctly: the constraint tells the model exactly what operations T must support. Ask an assistant to "convert these enable_if overloads to concepts and keep behavior identical", then verify with a table of <code>static_assert(requires { f(x); })</code> checks for each type.</p>
      <p><b>Where AI goes wrong:</b> it writes raw <code>requires</code> expressions in two overloads and expects subsumption (ambiguity), invents non-existent standard concepts (<code>std::number</code>, <code>std::container</code>), puts <code>-&gt; int</code> instead of <code>-&gt; std::same_as&lt;int&gt;</code> in compound requirements (the arrow takes a <i>concept</i>), over-constrains with syntax-level concepts, and forgets that a requires-expression only checks validity, not values. <b>What you must still own:</b> designing meaningful concepts, the subsumption rules, the four constraint syntaxes, and reading constraint-failure diagnostics.</p>`,
    problems: [{
      title: 'Constrained average over any numeric range',
      level: 'Medium', tags: ['concepts', 'ranges', 'requires'], companies: ['Microsoft', 'Nvidia'],
      statement: `<p>Write <code>average(r)</code> that works for any range (vector, list, array, C array…) whose elements are integers or floating point, returns a <code>double</code>, and returns 0.0 for an empty range. Passing a range of strings or a non-range must fail with a <b>constraint</b> error, not an error inside the body.</p>`,
      constraints: `Range size up to 10<sup>7</sup>; element sum fits in a double.`,
      example: `<p><code>average(std::vector{1, 2, 3, 4})</code> → ${H.c('g', '2.5')}; <code>average(std::list{2.0, 4.0})</code> → ${H.c('g', '3')}; <code>average(std::vector&lt;std::string&gt;{"a"})</code> → ${H.c('r', 'constraints not satisfied: Number&lt;std::string&gt;')}.</p>`,
      brute: { why: `<p>An unconstrained template. It "works" for good inputs, but for strings the error appears deep inside the body (<code>sum += x</code> on a double and a string), and an int-only range silently does integer division if you are not careful.</p>`, code: R`
        #include <cstddef>
        template <class R>
        double averageBrute(const R& r) {
            double sum = 0; std::size_t n = 0;
            for (const auto& x : r) { sum += x; ++n; }   // error lands HERE for bad element types
            return n ? sum / n : 0.0;
        }
      ` },
      mcq: { q: 'Which constraint best expresses "a range of numbers"?', options: ['<code>std::ranges::input_range&lt;R&gt; &amp;&amp; Number&lt;std::ranges::range_value_t&lt;R&gt;&gt;</code>', '<code>requires(R r) { r.size(); }</code>', '<code>std::integral&lt;R&gt;</code>', '<code>std::same_as&lt;R, std::vector&lt;double&gt;&gt;</code>'], answer: 0, explain: 'It accepts every iterable type and checks the element type, so it covers lists, arrays and views while rejecting strings or non-ranges at the call site.' },
      hints: [`<p>Hint 1: Build a <code>Number</code> concept from <code>std::integral || std::floating_point</code>.</p>`, `<p>Hint 2: <code>std::ranges::range_value_t&lt;R&gt;</code> gives the element type of any range; combine with <code>std::ranges::input_range&lt;R&gt;</code> into a <code>NumberRange</code> concept.</p>`, `<p>Hint 3: Accumulate in a <code>double</code>, count elements as you go (works even without <code>size()</code>), and return 0.0 when the count is 0. Signature: <code>double average(const NumberRange auto&amp; r)</code>.</p>`],
      tests: {"sig":"string list<double> -> double","fn":"avgP","cmp":"float","harness":{"cpp":"double avgP(string kind, vector<double> v) {\n  if (kind == \"vint\") { vector<int> a(v.begin(), v.end()); return average(a); }\n  if (kind == \"vdouble\") return average(v);\n  if (kind == \"vfloat\") { vector<float> a(v.begin(), v.end()); return average(a); }\n  if (kind == \"vlong\") { vector<long long> a(v.begin(), v.end()); return average(a); }\n  if (kind == \"list\") { list<double> a(v.begin(), v.end()); return average(a); }\n  if (kind == \"array3\") { array<int, 3> a{(int)v[0], (int)v[1], (int)v[2]}; return average(a); }\n  if (kind == \"carray\") { int a[3] = {(int)v[0], (int)v[1], (int)v[2]}; return average(a); }\n  return -1e18;\n}"},"cases":[[["vint",[1,2,3,4]],2.5],[["list",[2,4]],3],[["carray",[5,7,0]],4],[["array3",[1,2,6]],3],[["vint",[]],0],[["vdouble",[-1.5,1.5]],0],[["vint",[7]],7],[["vint",[-3,-4]],-3.5],[["vfloat",[0.5,1.5]],1],[["vlong",[4000000000,4000000002]],4000000001],[["vdouble",[0.1,0.2,0.3]],0.2],[["vint",{"$rep":2,"n":30000}],2],[["vint",{"$range":[0,1000]}],499.5]]},
      solution: {
        approach: `<p>Two small named concepts: <code>Number</code> and <code>NumberRange</code>. The abbreviated parameter <code>const NumberRange auto&amp;</code> checks the constraint before the body is ever instantiated, so misuse produces a one-line diagnostic.</p>`,
        code: R`
          #include <array>
          #include <concepts>
          #include <cstddef>
          #include <iostream>
          #include <list>
          #include <ranges>
          #include <vector>

          template <class T>
          concept Number = std::integral<T> || std::floating_point<T>;

          template <class R>
          concept NumberRange = std::ranges::input_range<R> && Number<std::ranges::range_value_t<R>>;

          double average(const NumberRange auto& r) {
              double sum = 0.0;
              std::size_t n = 0;
              for (const auto& x : r) { sum += static_cast<double>(x); ++n; }
              return n ? sum / static_cast<double>(n) : 0.0;
          }

          int main() {
              std::cout << average(std::vector{1, 2, 3, 4}) << "\n";   // 2.5
              std::cout << average(std::list{2.0, 4.0}) << "\n";       // 3
              int raw[] = {5, 7};
              std::cout << average(raw) << "\n";                        // 6
              std::cout << average(std::vector<int>{}) << "\n";         // 0
              std::cout << average(std::vector<double>{-1.5, 1.5}) << " " << average(std::vector<int>{7}) << " "
                        << average(std::vector{-3, -4}) << "\n";                                   // 0 7 -3.5
              std::cout << average(std::vector<int>(1000000, 2)) << " " << average(std::array<int, 3>{1, 2, 6}) << " "
                        << average(std::vector<float>{0.5f, 1.5f}) << "\n";                        // 2 3 1
              // average(std::vector<std::string>{"a"});  // error: Number<std::string> not satisfied
          }
        `,
        dry: { head: ['call', 'R', 'input_range?', 'range_value_t', 'Number?', 'result'], rows: [
          ['average(vector{1,2,3,4})', 'vector&lt;int&gt;', 'yes', 'int', 'yes', '10 / 4 = 2.5'],
          ['average(list{2.0,4.0})', 'list&lt;double&gt;', 'yes', 'double', 'yes', '6 / 2 = 3'],
          ['average(raw)', 'int[2]', 'yes', 'int', 'yes', '12 / 2 = 6'],
          ['average(vector&lt;string&gt;)', 'vector&lt;string&gt;', 'yes', 'std::string', '<span class="c-r">no</span>', '<span class="c-r">constraint error</span>']
        ] },
        complexity: `<p>O(n) time, O(1) extra space; one instantiation per range type.</p>`,
        followUps: ['Use Kahan summation for floating point accuracy.', 'Accept a projection like <code>std::ranges</code> algorithms do.', 'Add an overload for <code>std::ranges::sized_range</code> that skips counting — does subsumption pick it?']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Generic clampTo', level: 'Easy', tags: ['function template', 'deduction'], companies: ['Microsoft', 'Adobe'],
    statement: `<p>Write <code>clampTo(x, lo, hi)</code> that returns <code>lo</code> if <code>x &lt; lo</code>, <code>hi</code> if <code>hi &lt; x</code>, else <code>x</code>. It must work for any type with <code>operator&lt;</code> (int, double, std::string) and must <b>not copy</b> large objects.</p>`,
    constraints: `T supports <code>&lt;</code>. Assume <code>!(hi &lt; lo)</code>.`,
    example: `<p><code>clampTo(15, 0, 10)</code> → ${H.c('g', '10')}; <code>clampTo(2.5, 0.0, 1.0)</code> → ${H.c('g', '1')}; <code>clampTo(std::string("m"), std::string("a"), std::string("k"))</code> → ${H.c('g', '"k"')}. <code>clampTo(15, 0.0, 10)</code> → ${H.c('r', 'deduction conflict')} (int vs double) — the same behavior as <code>std::clamp</code>.</p>`,
    brute: { why: `<p>One function per type. Three copies of identical logic; the string version would copy unless written carefully.</p>`, code: R`
      #include <string>
      int clampInt(int x, int lo, int hi) { return x < lo ? lo : (hi < x ? hi : x); }
      double clampDouble(double x, double lo, double hi) { return x < lo ? lo : (hi < x ? hi : x); }
      std::string clampStr(std::string x, std::string lo, std::string hi) { return x < lo ? lo : (hi < x ? hi : x); }
    ` },
    mcq: { q: 'Why take parameters as <code>const T&amp;</code> and return <code>const T&amp;</code>?', options: ['No copies for big types; result refers to one of the arguments', 'It is required for templates', 'It makes deduction convert types', 'References are faster for int'], answer: 0, explain: 'Like <code>std::clamp</code>. Caveat: do not bind the returned reference to a temporary argument and keep it after the full expression — it would dangle.' },
    hints: [`<p>Hint 1: One template parameter T used three times; deduction requires all three arguments to agree on T.</p>`, `<p>Hint 2: Use only <code>operator&lt;</code>: <code>x &lt; lo</code> and <code>hi &lt; x</code>, so types that define just &lt; still work.</p>`, `<p>Hint 3: Signature <code>template&lt;class T&gt; const T&amp; clampTo(const T&amp; x, const T&amp; lo, const T&amp; hi)</code>. Beware of keeping the returned reference to a temporary (dangling).</p>`],
    tests: {"sig":"string string string string -> string","fn":"clampP","harness":{"cpp":"string clampP(string kind, string x, string lo, string hi) {\n  ostringstream os;\n  if (kind == \"int\") os << clampTo(stoi(x), stoi(lo), stoi(hi));\n  else if (kind == \"double\") os << clampTo(stod(x), stod(lo), stod(hi));\n  else if (kind == \"str\") os << clampTo(x, lo, hi);\n  else if (kind == \"explicit\") os << clampTo<double>(stoi(x), stoi(lo), stoi(hi));\n  else if (kind == \"ref\") {\n    int a = stoi(lo), b = stoi(hi), c = stoi(x);\n    const int& r = clampTo(c, a, b);\n    return &r == &a ? \"lo\" : &r == &b ? \"hi\" : &r == &c ? \"x\" : \"copy\";\n  }\n  return os.str();\n}"},"cases":[[["int","15","0","10"],"10"],[["int","-5","0","10"],"0"],[["int","5","0","10"],"5"],[["int","0","0","0"],"0"],[["int","10","0","10"],"10"],[["int","0","0","10"],"0"],[["double","2.5","0","1"],"1"],[["double","-0.5","-1","-0.25"],"-0.5"],[["double","0.75","0.5","0.9"],"0.75"],[["str","m","a","k"],"k"],[["str","a","b","k"],"b"],[["str","d","a","k"],"d"],[["str","ab","a","k"],"ab"],[["str","","a","k"],"a"],[["explicit","15","0","10"],"10"],[["ref","-3","0","10"],"lo"],[["ref","15","0","10"],"hi"],[["ref","5","0","10"],"x"],[["ref","10","0","10"],"x"]]},
    solution: {
      approach: `<p>A single function template using <code>const T&amp;</code> everywhere, mirroring <code>std::clamp</code>. Deduction forces the three arguments to share a type, which avoids silent mixed-type comparisons.</p>`,
      code: R`
        #include <iostream>
        #include <string>

        template <class T>
        const T& clampTo(const T& x, const T& lo, const T& hi) {
            if (x < lo) return lo;
            if (hi < x) return hi;
            return x;
        }

        int main() {
            std::cout << clampTo(15, 0, 10) << " " << clampTo(2.5, 0.0, 1.0) << "\n";   // 10 1
            std::string a = "a", k = "k", m = "m";
            std::cout << clampTo(m, a, k) << "\n";                                        // k
            std::cout << clampTo<double>(15, 0.0, 10) << "\n";   // explicit T: 15 and 10 convert -> 10
            std::cout << clampTo(-5, 0, 10) << " " << clampTo(5, 0, 10) << " " << clampTo(0, 0, 0) << " "
                      << clampTo(10, 0, 10) << " " << clampTo(-0.5, -1.0, -0.25) << "\n";   // 0 5 0 10 -0.5
            std::string b = "b";
            std::cout << clampTo(a, b, k) << "\n";                                        // b
            int lo = 0, hi = 10, below = -3, inside = 5;
            std::cout << (&clampTo(below, lo, hi) == &lo) << (&clampTo(15, lo, hi) == &hi)
                      << (&clampTo(inside, lo, hi) == &inside) << "\n";                   // 111 (no copies: it returns the argument itself)
        }
      `,
      dry: { head: ['call', 'T', 'test', 'returns'], rows: [['clampTo(15, 0, 10)', 'int', '15 &lt; 0? no; 10 &lt; 15? yes', 'hi = 10'], ['clampTo(2.5, 0.0, 1.0)', 'double', '1.0 &lt; 2.5', '1'], ['clampTo(m, a, k)', 'std::string', '"k" &lt; "m"', '"k"']] },
      complexity: `<p>O(1) comparisons (O(length) for strings). One instantiation per T.</p>`,
      followUps: ['Add a comparator parameter like <code>std::clamp(x, lo, hi, comp)</code>.', 'Constrain T with <code>std::totally_ordered</code>.', 'Show a dangling-reference bug with <code>const auto&amp; r = clampTo(f(), 0, 10);</code>']
    }
  });

  practice.push({
    title: 'Stack<T> class template', level: 'Easy', tags: ['class template'], companies: ['Amazon', 'Cisco'],
    statement: `<p>Implement a class template <code>Stack&lt;T&gt;</code> with <code>push</code>, <code>pop</code> (returns the removed value), <code>top</code>, <code>empty</code> and <code>size</code>, backed by <code>std::vector&lt;T&gt;</code>. <code>pop</code>/<code>top</code> on an empty stack throws <code>std::out_of_range</code>. Define <code>push</code> outside the class body.</p>`,
    constraints: `Up to 10<sup>6</sup> operations. T is movable.`,
    example: `<p>push 1, push 2, pop → ${H.c('g', '2')}, top → ${H.c('g', '1')}, size → ${H.c('g', '1')}. A <code>Stack&lt;std::string&gt;</code> is a different class with identical code.</p>`,
    brute: { why: `<p>Write <code>IntStack</code>, then copy-paste into <code>StringStack</code>… Every bug fix must be repeated; every new type needs a new class.</p>`, code: R`
      #include <stdexcept>
      #include <vector>
      class IntStack {
          std::vector<int> v_;
      public:
          void push(int x) { v_.push_back(x); }
          int pop() { if (v_.empty()) throw std::out_of_range("empty"); int x = v_.back(); v_.pop_back(); return x; }
      };
    ` },
    mcq: { q: 'How do you define <code>push</code> outside the class?', options: ['<code>template&lt;class T&gt; void Stack&lt;T&gt;::push(T x) { … }</code>', '<code>void Stack::push(T x) { … }</code>', '<code>template&lt;&gt; void Stack&lt;T&gt;::push(T x)</code>', 'It must be inside the class'], answer: 0, explain: 'Repeat the template header and qualify with <code>Stack&lt;T&gt;::</code>. It still belongs in the header.' },
    hints: [`<p>Hint 1: <code>template &lt;class T&gt; class Stack { std::vector&lt;T&gt; v_; … };</code></p>`, `<p>Hint 2: Take <code>push</code>'s argument by value and <code>std::move</code> it into the vector — one signature handles lvalues (copy) and rvalues (move).</p>`, `<p>Hint 3: <code>pop</code>: check empty → throw; <code>T x = std::move(v_.back()); v_.pop_back(); return x;</code>. Out-of-class: <code>template&lt;class T&gt; void Stack&lt;T&gt;::push(T x)</code>.</p>`],
    tests: {"cls":"StackProbe","sigs":{"StackProbe":"","push":"int -> void","pop":"-> string","top":"-> string","empty":"-> bool","size":"-> int","drain":"-> long"},"harness":{"cpp":"struct StackProbe {\n  Stack<int> s;\n  void push(int x) { s.push(x); }\n  string pop() { try { return to_string(s.pop()); } catch (const out_of_range&) { return \"out_of_range\"; } }\n  string top() { try { return to_string(s.top()); } catch (const out_of_range&) { return \"out_of_range\"; } }\n  bool empty() { return s.empty(); }\n  int size() { return (int)s.size(); }\n  long long drain() { long long t = 0; while (!s.empty()) t += s.pop(); return t; }\n};"},"cases":[{"ops":["StackProbe","push","push","pop","top","size"],"args":[[],[1],[2],[],[],[]],"out":[null,null,null,"2","1",1]},{"ops":["StackProbe","empty","size","pop","top"],"args":[[],[],[],[],[]],"out":[null,true,0,"out_of_range","out_of_range"]},{"ops":["StackProbe","push","pop","empty","pop","push","top","size"],"args":[[],[5],[],[],[],[6],[],[]],"out":[null,null,"5",true,"out_of_range",null,"6",1]},{"ops":["StackProbe","push","push","push","pop","pop","pop","empty"],"args":[[],[-3],[0],[-3],[],[],[],[]],"out":[null,null,null,null,"-3","0","-3",true]},{"ops":["StackProbe","push","push","push","push","push","pop","pop","pop","pop","pop","empty"],"args":[[],[1],[2],[3],[4],[5],[],[],[],[],[],[]],"out":[null,null,null,null,null,null,"5","4","3","2","1",true]},{"ops":["StackProbe","push","push","push","push","drain","empty"],"args":[[],[1],[2],[3],[4],[],[]],"out":[null,null,null,null,null,10,true]},{"ops":["StackProbe","push","top","top","size"],"args":[[],[9],[],[],[]],"out":[null,null,"9","9",1]},{"ops":["StackProbe","push","push","pop","push","top","size"],"args":[[],[1],[2],[],[3],[],[]],"out":[null,null,null,"2",null,"3",2]},{"ops":["StackProbe","push","push","drain","pop"],"args":[[],[2147483647],[1],[],[]],"out":[null,null,null,2147483648,"out_of_range"]},{"ops":{"$concat":[["StackProbe"],{"$rep":"push","n":3000},["size","drain","empty"]]},"args":{"$concat":[[[]],{"$rep":[5],"n":3000},[[],[],[]]]},"out":{"$concat":[[null],{"$rep":null,"n":3000},[3000,15000,true]]}}]},
    solution: {
      approach: `<p>A thin class template around <code>std::vector&lt;T&gt;</code>. Members are instantiated only when used, so even a <code>Stack</code> of a non-copyable type works as long as you only move.</p>`,
      code: R`
        #include <iostream>
        #include <memory>
        #include <stdexcept>
        #include <string>
        #include <utility>
        #include <vector>

        template <class T>
        class Stack {
            std::vector<T> v_;
        public:
            void push(T x);                                   // defined below
            T pop() {
                if (v_.empty()) throw std::out_of_range("pop on empty stack");
                T x = std::move(v_.back());
                v_.pop_back();
                return x;
            }
            const T& top() const {
                if (v_.empty()) throw std::out_of_range("top on empty stack");
                return v_.back();
            }
            bool empty() const { return v_.empty(); }
            std::size_t size() const { return v_.size(); }
        };

        template <class T>
        void Stack<T>::push(T x) { v_.push_back(std::move(x)); }

        int main() {
            Stack<int> s; s.push(1); s.push(2);
            std::cout << s.pop() << " " << s.top() << " " << s.size() << "\n";   // 2 1 1
            Stack<std::unique_ptr<int>> owners;                                   // move-only T works
            owners.push(std::make_unique<int>(7));
            std::cout << *owners.pop() << "\n";                                   // 7
            Stack<int> e;
            std::cout << e.empty() << " " << e.size() << "\n";                    // 1 0
            try { e.pop(); } catch (const std::out_of_range& ex) { std::cout << "pop: " << ex.what() << "\n"; }
            try { e.top(); } catch (const std::out_of_range& ex) { std::cout << "top: " << ex.what() << "\n"; }
            Stack<std::string> names;
            names.push("ann"); names.push("bo");
            std::string x = names.pop(), y = names.pop();
            std::cout << x << " " << y << " " << names.empty() << "\n";           // bo ann 1
            Stack<int> big;
            for (int i = 0; i < 1000000; i++) big.push(i);
            long long sum = 0;
            while (!big.empty()) sum += big.pop();
            std::cout << sum << "\n";                                             // 499999500000
        }
      `,
      complexity: `<p>Amortized O(1) per operation; O(n) space.</p>`,
      followUps: ['Add <code>emplace(Args&amp;&amp;...)</code> with perfect forwarding.', 'Make the backing container a template parameter, like <code>std::stack&lt;T, Container&gt;</code>.', 'Why does <code>std::stack::pop</code> return <code>void</code>? (exception safety)']
    }
  });

  practice.push({
    title: 'sumAll with a fold expression', level: 'Easy', tags: ['variadic', 'fold expression'], companies: ['Google', 'Meta'],
    statement: `<p>Write <code>sumAll(args...)</code> that adds any number of arithmetic arguments and returns 0 when called with no arguments. The result type should be the common type of the arguments (int for no arguments).</p>`,
    constraints: `0 ≤ number of arguments ≤ 100.`,
    example: `<p><code>sumAll(1, 2, 3)</code> → ${H.c('g', '6')}; <code>sumAll(1, 2.5)</code> → ${H.c('g', '3.5')}; <code>sumAll()</code> → ${H.c('g', '0')}. A unary fold <code>(args + ...)</code> would ${H.c('r', 'not compile')} for the empty call.</p>`,
    brute: { why: `<p>An <code>initializer_list&lt;double&gt;</code> loop: works, but converts everything to double (precision loss for large 64-bit ints) and needs braces at the call site.</p>`, code: R`
      #include <initializer_list>
      double sumBrute(std::initializer_list<double> xs) { double s = 0; for (double x : xs) s += x; return s; }
    ` },
    mcq: { q: 'Which fold handles zero arguments?', options: ['<code>(args + ... + 0)</code>', '<code>(args + ...)</code>', '<code>(... + args)</code>', 'None — packs cannot be empty'], answer: 0, explain: 'A binary fold has an initial value, so the empty expansion is just <code>0</code>. Unary folds over + are ill-formed for empty packs.' },
    hints: [`<p>Hint 1: <code>template&lt;class... Ts&gt; auto sumAll(Ts... args)</code>.</p>`, `<p>Hint 2: A binary right fold with init 0: <code>return (args + ... + 0);</code>.</p>`, `<p>Hint 3: The <code>+ 0</code> participates in usual arithmetic conversions; with doubles present the result is double. Add <code>static_assert((std::is_arithmetic_v&lt;Ts&gt; &amp;&amp; ...))</code> for a clear error.</p>`],
    tests: {"sig":"string list<double> -> string","fn":"sumP","harness":{"cpp":"string sumP(string kind, vector<double> v) {\n  ostringstream os;\n  if (kind == \"int\") {\n    vector<int> a(v.begin(), v.end());\n    switch (a.size()) {\n      case 0: os << sumAll(); break;\n      case 1: os << sumAll(a[0]); break;\n      case 2: os << sumAll(a[0], a[1]); break;\n      case 3: os << sumAll(a[0], a[1], a[2]); break;\n      case 4: os << sumAll(a[0], a[1], a[2], a[3]); break;\n    }\n  } else if (kind == \"dbl\") {\n    switch (v.size()) {\n      case 2: os << sumAll(v[0], v[1]); break;\n      case 3: os << sumAll(v[0], v[1], v[2]); break;\n    }\n  } else if (kind == \"mixed\") os << sumAll((int)v[0], v[1]);\n  else if (kind == \"ll\") os << sumAll((long long)v[0], (long long)v[1]);\n  else if (kind == \"bool\") os << sumAll(v[0] != 0, v[1] != 0);\n  else if (kind == \"char\") os << sumAll((char)v[0]);\n  return os.str();\n}"},"cases":[[["int",[]],"0"],[["int",[5]],"5"],[["int",[1,2,3]],"6"],[["int",[-1,1]],"0"],[["int",[1,2,3,4]],"10"],[["int",[-7,-8]],"-15"],[["dbl",[0.1,0.2]],"0.3"],[["dbl",[0.5,0.25,0.125]],"0.875"],[["mixed",[1,2.5]],"3.5"],[["ll",[2000000000,2000000000]],"4000000000"],[["bool",[1,1]],"2"],[["char",[97]],"97"]]},
    solution: {
      approach: `<p>A binary fold with identity element 0, plus a fold over <code>&amp;&amp;</code> in a <code>static_assert</code> to reject non-arithmetic arguments with a readable message.</p>`,
      code: R`
        #include <iostream>
        #include <type_traits>

        template <class... Ts>
        auto sumAll(Ts... args) {
            static_assert((std::is_arithmetic_v<Ts> && ...), "sumAll: arithmetic arguments only");
            return (args + ... + 0);      // a1 + (a2 + (... + (aN + 0)))
        }

        int main() {
            std::cout << sumAll(1, 2, 3) << " " << sumAll(1, 2.5) << " " << sumAll() << "\n";   // 6 3.5 0
            std::cout << sumAll(-1, 1) << " " << sumAll(5) << " " << sumAll(0.1, 0.2) << " "
                      << sumAll(true, true) << " " << sumAll('a') << "\n";                       // 0 5 0.3 2 97
            std::cout << sumAll(2000000000LL, 2000000000LL) << "\n";                             // 4000000000
            static_assert(std::is_same_v<decltype(sumAll()), int>);
            static_assert(std::is_same_v<decltype(sumAll(1, 2.5)), double>);
            static_assert(std::is_same_v<decltype(sumAll(1, 2L)), long>);
        }
      `,
      dry: { head: ['call', 'expansion', 'value'], rows: [['sumAll(1,2,3)', '1 + (2 + (3 + 0))', '6'], ['sumAll(1, 2.5)', '1 + (2.5 + 0)', '3.5 (double)'], ['sumAll()', '0', '0 (int)']] },
      complexity: `<p>O(N) additions; one instantiation per argument-type list.</p>`,
      followUps: ['Return <code>long long</code> for integer packs to avoid overflow.', 'Write <code>productAll</code> with identity 1.', 'Make it <code>constexpr</code> and test with <code>static_assert</code>.']
    }
  });

  practice.push({
    title: 'countOf: array length via a non-type template parameter', level: 'Easy', tags: ['non-type template parameter', 'constexpr'], companies: ['Qualcomm', 'Intel'],
    statement: `<p>Write <code>countOf(arr)</code> returning the number of elements of a built-in array at <b>compile time</b>. Passing a pointer must <b>not compile</b> (the classic <code>sizeof(a)/sizeof(a[0])</code> macro silently returns a wrong number for pointers).</p>`,
    constraints: `Built-in arrays of any element type and size.`,
    example: `<p><code>int a[7]; static_assert(countOf(a) == 7);</code> ✓. <code>void f(int* p) { countOf(p); }</code> → ${H.c('r', 'no matching function')} — good! The macro version would give ${H.c('r', 'sizeof(int*)/sizeof(int) = 2')} on 64-bit.</p>`,
    brute: { why: `<p>The C macro works for real arrays but compiles happily for pointers (e.g. after an array parameter decayed) and returns garbage like 2.</p>`, code: R`
      #define COUNT_OF(a) (sizeof(a) / sizeof((a)[0]))
      int f(int* p) { return COUNT_OF(p); }   // compiles, returns 2 on x86-64: a silent bug
    ` },
    mcq: { q: 'Why must the parameter be a reference to array, <code>const T (&amp;)[N]</code>?', options: ['By-value array parameters decay to pointers and lose N', 'References are faster', 'N must be a type', 'Arrays cannot be passed to templates'], answer: 0, explain: 'Only reference binding keeps the array type, letting deduction recover N. A pointer argument cannot match <code>T (&amp;)[N]</code>, so misuse fails to compile.' },
    hints: [`<p>Hint 1: Make N a template parameter: <code>template&lt;class T, std::size_t N&gt;</code>.</p>`, `<p>Hint 2: Parameter <code>const T (&amp;)[N]</code> — the parentheses make it "reference to array", not "array of references".</p>`, `<p>Hint 3: Mark it <code>constexpr</code> (or <code>consteval</code>) and <code>noexcept</code>; it just returns N. C++17 also provides <code>std::size(arr)</code> doing exactly this.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"7 6 2 1 10"}]},
    solution: {
      approach: `<p>Deduce N from a reference-to-array parameter. Pointers cannot bind, so the bug class is eliminated at compile time. <code>std::size</code> / <code>std::ssize</code> are the standard versions.</p>`,
      code: R`
        #include <iostream>
        #include <cstddef>
        #include <iterator>

        template <class T, std::size_t N>
        constexpr std::size_t countOf(const T (&)[N]) noexcept { return N; }

        int a[7];
        const char msg[] = "hello";
        static_assert(countOf(a) == 7);
        static_assert(countOf(msg) == 6);          // includes the '\0'
        static_assert(std::size(a) == 7);          // the standard library equivalent
        // int* p = a; countOf(p);                 // error: no matching function (good!)
        int m[2][3];
        double one[1];
        struct S { char c; } many[10];
        static_assert(countOf(m) == 2 && countOf(one) == 1 && countOf(many) == 10);
        static_assert(noexcept(countOf(a)));
        int main() {
            std::cout << countOf(a) << " " << countOf(msg) << " " << countOf(m) << " " << countOf(one) << " " << countOf(many) << "\n";   // 7 6 2 1 10
        }
      `,
      complexity: `<p>Zero run-time cost — a compile-time constant.</p>`,
      followUps: ['Make it work for <code>std::array</code> too (overload or concept).', 'What does <code>std::ssize</code> return and why was it added?', 'Use it to size another array: <code>int b[countOf(a)];</code>']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Which overload is chosen? (predict the output)', level: 'Medium', tags: ['overload resolution', 'templates', 'output prediction'], companies: ['Bloomberg', 'Jane Street', 'Optiver'],
    statement: `<p>Given the overload set below, predict what each call prints, then explain the rule that decided it.</p>
      <pre>void g(long)                     // A
void g(const char*)              // B
template &lt;class T&gt; void g(T)     // C
template &lt;class T&gt; void g(T*)    // D
template &lt;&gt; void g&lt;int*&gt;(int*)   // E: explicit specialization of C</pre>
      <p>Calls: <code>g(1)</code>, <code>g(1L)</code>, <code>g("hi")</code>, <code>g(nullptr)</code>, <code>int x; g(&amp;x)</code>, <code>g&lt;&gt;("hi")</code>.</p>`,
    constraints: `Standard C++20 overload resolution.`,
    example: `<p>${H.table(['call', 'prints', 'reason'], [['g(1)', 'C', 'T=int exact beats int→long conversion'], ['g(1L)', 'A', 'exact tie with C → non-template wins'], ['g("hi")', 'B', 'array-to-pointer is Exact; tie C/D/B → non-template'], ['g(nullptr)', 'C', 'nullptr_t is not a pointer type, D cannot deduce; B needs a conversion'], ['g(&amp;x)', 'D', 'C (T=int*) vs D (T=int): D more specialized; E is ignored!'], ['g&lt;&gt;("hi")', 'D', 'templates only; D more specialized than C']])}</p>`,
    brute: { why: `<p>Guessing, or sprinkling <code>typeid(T).name()</code> prints at run time. You get the answer for one compiler run but not the <i>rule</i>, and you will not be able to defend it in an interview.</p>`, code: R`
      #include <iostream>
      #include <typeinfo>
      template <class T> void probe(T) { std::cout << typeid(T).name() << "\n"; }   // shows T, not which overload won
    ` },
    mcq: { q: 'Why is E (the explicit specialization <code>g&lt;int*&gt;</code> of C) not called for <code>g(&amp;x)</code>?', options: ['Specializations do not take part in overload resolution; D beats C first, so C\'s specialization is never considered', 'E has a syntax error', 'Explicit specializations are always ignored', 'Because &amp;x is an rvalue'], answer: 0, explain: 'Overload resolution chooses among primary templates and plain functions. Only if C won would the compiler then look for C\'s specialization for T=int*. D (T*) is more specialized than C, so D wins.' },
    hints: [`<p>Hint 1: For every call, list candidates, deduce T for C and D, and rank conversions: Exact &gt; Promotion &gt; Conversion.</p>`, `<p>Hint 2: Ties: non-template beats template; then more specialized template beats less specialized. Explicit specializations are invisible to this process.</p>`, `<p>Hint 3: <code>nullptr</code> has type <code>std::nullptr_t</code>, which is not <code>T*</code> for any T. <code>int → long</code> is a conversion, not a promotion. <code>g&lt;&gt;</code> removes non-templates from consideration.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"C\nA\nB\nC\nD\nD\nC\nC\nA\nD"}]},
    solution: {
      approach: `<p>Apply the ranking rules per call and confirm by compiling. The famous lesson (Herb Sutter's "Why not specialize function templates?") is that E is dead code here: overload instead of specializing function templates.</p>`,
      code: R`
        #include <iostream>

        void g(long)        { std::cout << "A\n"; }
        void g(const char*) { std::cout << "B\n"; }
        template <class T> void g(T)  { std::cout << "C\n"; }
        template <class T> void g(T*) { std::cout << "D\n"; }
        template <> void g<int*>(int*) { std::cout << "E\n"; }   // specializes C, not D

        int main() {
            int x = 0;
            g(1);        // C : T=int exact, A needs int->long conversion
            g(1L);       // A : exact tie with C -> non-template wins
            g("hi");     // B : exact (array-to-pointer) tie -> non-template wins
            g(nullptr);  // C : T=std::nullptr_t; D cannot deduce, B needs a conversion
            g(&x);       // D : C(T=int*) vs D(T=int) -> D more specialized; E never considered
            g<>("hi");   // D : templates only; T=const char
            g(2.5);      // C : double -> long is a conversion, T=double is exact
            g('c');      // C : char -> long is a conversion, T=char is exact
            g(0L);       // A : long exact, ties with C, non-template wins
            int* p = &x;
            g(p);        // D : same reasoning as g(&x)
        }
      `,
      dry: { head: ['call', 'A long', 'B const char*', 'C T', 'D T*', 'winner'], rows: [
        ['g(1)', 'conversion', 'not viable', 'exact (int)', 'fails', 'C'],
        ['g(1L)', 'exact', 'not viable', 'exact (long)', 'fails', 'A (non-template)'],
        ['g("hi")', 'not viable', 'exact', 'exact (const char*)', 'exact (const char)', 'B (non-template)'],
        ['g(nullptr)', 'not viable', 'conversion', 'exact', 'fails', 'C'],
        ['g(&amp;x)', 'not viable', 'not viable', 'exact (int*)', 'exact (int)', 'D (more specialized)']
      ] },
      complexity: `<p>Compile-time reasoning only.</p>`,
      followUps: ['Move E below D but make it specialize D (<code>template&lt;&gt; void g&lt;int&gt;(int*)</code>) — what prints now?', 'Add <code>void g(int)</code>: which calls change?', 'Why does <code>g(0)</code> not pick B even though 0 is a null pointer constant?']
    }
  });

  practice.push({
    title: 'is_specialization_of<T, Template>', level: 'Medium', tags: ['type traits', 'template template parameter', 'partial specialization'], companies: ['Google', 'Bloomberg'],
    statement: `<p>Write a trait <code>is_specialization_of_v&lt;T, Tmpl&gt;</code> that is true when T is an instantiation of the class template Tmpl, e.g. <code>is_specialization_of_v&lt;std::vector&lt;int&gt;, std::vector&gt;</code> is true and <code>is_specialization_of_v&lt;std::list&lt;int&gt;, std::vector&gt;</code> is false. Use it to write <code>is_vector_v</code> and <code>is_optional_v</code>.</p>`,
    constraints: `Tmpl takes only type parameters (works for vector, map, optional, pair, tuple; not for std::array).`,
    example: `<p>${H.table(['T', 'Tmpl', 'value'], [['std::vector&lt;int&gt;', 'std::vector', '<span class="c-g">true</span>'], ['std::map&lt;int, char&gt;', 'std::map', '<span class="c-g">true</span>'], ['std::list&lt;int&gt;', 'std::vector', 'false'], ['int', 'std::optional', 'false']])}</p>`,
    brute: { why: `<p>Hand-write one trait per template (<code>is_vector</code>, <code>is_map</code>, <code>is_optional</code>…), each a primary + partial specialization. Correct but repetitive, and easy to forget the allocator parameter for vector.</p>`, code: R`
      #include <type_traits>
      #include <vector>
      template <class T> struct is_vector : std::false_type {};
      template <class T, class A> struct is_vector<std::vector<T, A>> : std::true_type {};
    ` },
    mcq: { q: 'How can a template take <code>std::vector</code> itself (not <code>std::vector&lt;int&gt;</code>) as an argument?', options: ['A template template parameter: <code>template&lt;class...&gt; class Tmpl</code>', 'Pass <code>decltype(std::vector)</code>', 'Use <code>auto</code>', 'It is impossible'], answer: 0, explain: 'A template template parameter accepts a class template. Using a pack <code>class...</code> lets it match templates with defaulted extra parameters like allocators.' },
    hints: [`<p>Hint 1: Primary: <code>template&lt;class T, template&lt;class...&gt; class Tmpl&gt; struct is_spec : std::false_type {};</code></p>`, `<p>Hint 2: Partial: <code>template&lt;template&lt;class...&gt; class Tmpl, class... Args&gt; struct is_spec&lt;Tmpl&lt;Args...&gt;, Tmpl&gt; : std::true_type {};</code> — the same Tmpl appears twice, so it must match.</p>`, `<p>Hint 3: Strip cv/ref first (<code>std::remove_cvref_t</code>) so <code>const std::vector&lt;int&gt;&amp;</code> also counts; then define <code>is_vector_v</code> as an alias using it.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"1001110"}]},
    solution: {
      approach: `<p>Template template parameter + variadic args + partial specialization. The pattern <code>Tmpl&lt;Args...&gt;</code> deduces both the template and its arguments from T, and matches only if that template is the same one passed as the second argument.</p>`,
      code: R`
        #include <iostream>
        #include <list>
        #include <map>
        #include <optional>
        #include <type_traits>
        #include <vector>

        template <class T, template <class...> class Tmpl>
        struct is_specialization_of : std::false_type {};

        template <template <class...> class Tmpl, class... Args>
        struct is_specialization_of<Tmpl<Args...>, Tmpl> : std::true_type {};

        template <class T, template <class...> class Tmpl>
        inline constexpr bool is_specialization_of_v = is_specialization_of<std::remove_cvref_t<T>, Tmpl>::value;

        template <class T> inline constexpr bool is_vector_v   = is_specialization_of_v<T, std::vector>;
        template <class T> inline constexpr bool is_optional_v = is_specialization_of_v<T, std::optional>;

        static_assert(is_vector_v<std::vector<int>>);
        static_assert(is_vector_v<const std::vector<double>&>);
        static_assert(!is_vector_v<std::list<int>>);
        static_assert(is_specialization_of_v<std::map<int, char>, std::map>);
        static_assert(is_optional_v<std::optional<int>> && !is_optional_v<int>);
        static_assert(is_specialization_of_v<std::pair<int, int>, std::pair>);
        static_assert(!is_specialization_of_v<int*, std::vector>);
        static_assert(!is_specialization_of_v<std::vector<int>, std::list>);
        static_assert(is_specialization_of_v<std::vector<std::vector<int>>, std::vector>);
        static_assert(is_vector_v<std::vector<bool>> && is_vector_v<std::vector<int>&&>);
        static_assert(!is_optional_v<std::vector<std::optional<int>>>);
        int main() {
            std::cout << is_vector_v<std::vector<int>> << is_vector_v<std::list<int>> << is_vector_v<int>
                      << is_optional_v<std::optional<char>> << is_optional_v<const std::optional<int>&>
                      << is_specialization_of_v<std::map<int, char>, std::map>
                      << is_specialization_of_v<std::map<int, char>, std::vector> << "\n";   // 1001110
        }
      `,
      dry: { head: ['T', 'pattern Tmpl&lt;Args...&gt;', 'second arg', 'match?'], rows: [['vector&lt;int, allocator&lt;int&gt;&gt;', 'Tmpl=vector, Args={int, alloc}', 'vector', '<span class="c-g">yes → true</span>'], ['list&lt;int&gt;', 'Tmpl=list', 'vector', 'list ≠ vector → primary → false'], ['int', 'cannot deduce', 'optional', 'primary → false']] },
      complexity: `<p>Compile time only; zero run-time cost.</p>`,
      followUps: ['Why does this not work for <code>std::array&lt;int, 3&gt;</code>? (non-type parameter)', 'Turn it into a C++20 concept <code>SpecializationOf&lt;T, Tmpl&gt;</code>.', 'Extract the first template argument: <code>first_arg_t&lt;std::vector&lt;int&gt;&gt;</code>.']
    }
  });

  practice.push({
    title: 'join(sep, args...) without a trailing separator', level: 'Medium', tags: ['variadic', 'fold expression', 'ostringstream'], companies: ['Amazon', 'Uber'],
    statement: `<p>Write <code>join(sep, args...)</code> that streams any number of printable arguments into a string with <code>sep</code> between them and <b>no</b> leading or trailing separator. Zero arguments → empty string.</p>`,
    constraints: `Arguments support <code>operator&lt;&lt;</code>; up to 50 arguments.`,
    example: `<p><code>join(", ", 1, "two", 3.5)</code> → ${H.c('g', '"1, two, 3.5"')}; <code>join("-")</code> → ${H.c('g', '""')}; <code>join("|", \'x\')</code> → ${H.c('g', '"x"')}.</p>`,
    brute: { why: `<p>Convert everything to strings in a vector first, then join with a loop. Two passes and extra allocations; also needs a conversion for every type.</p>`, code: R`
      #include <sstream>
      #include <string>
      #include <vector>
      template <class... Ts>
      std::string joinBrute(const std::string& sep, const Ts&... args) {
          std::vector<std::string> parts;
          auto toS = [](const auto& x) { std::ostringstream os; os << x; return os.str(); };
          (parts.push_back(toS(args)), ...);
          std::string out;
          for (std::size_t i = 0; i < parts.size(); ++i) out += (i ? sep : "") + parts[i];
          return out;
      }
    ` },
    mcq: { q: 'What keeps the separator out of the front?', options: ['A <code>bool first</code> flag updated inside the comma fold', 'A right fold', '<code>sizeof...(args) - 1</code> in a loop', 'Removing the last character afterwards always works'], answer: 0, explain: 'The comma fold runs left to right; for each element print the separator unless it is the first. Trimming afterwards breaks when sep has several characters or args are empty strings.' },
    hints: [`<p>Hint 1: Use an <code>std::ostringstream os</code> and a comma fold that runs a small lambda per element.</p>`, `<p>Hint 2: Keep <code>bool first = true;</code>. For each arg: <code>if (!first) os &lt;&lt; sep; os &lt;&lt; arg; first = false;</code>.</p>`, `<p>Hint 3: Write it as <code>(( (first ? void() : void(os &lt;&lt; sep)), os &lt;&lt; args, first = false ), ...);</code> or call a lambda: <code>(emit(args), ...)</code>. Zero args → the fold is empty → <code>""</code>.</p>`],
    tests: {"sig":"string string list<string> -> string","fn":"joinP","harness":{"cpp":"string joinP(string sep, string kind, vector<string> v) {\n  if (kind == \"str\") {\n    switch (v.size()) {\n      case 0: return join(sep);\n      case 1: return join(sep, v[0]);\n      case 2: return join(sep, v[0], v[1]);\n      case 3: return join(sep, v[0], v[1], v[2]);\n      case 5: return join(sep, v[0], v[1], v[2], v[3], v[4]);\n    }\n  } else if (kind == \"num\") {\n    vector<int> a; for (auto& s : v) a.push_back(stoi(s));\n    switch (a.size()) {\n      case 0: return join(sep);\n      case 1: return join(sep, a[0]);\n      case 3: return join(sep, a[0], a[1], a[2]);\n      case 4: return join(sep, a[0], a[1], a[2], a[3]);\n    }\n  } else if (kind == \"mix\") return join(sep, stoi(v[0]), v[1], stod(v[2]), v[3][0], true);\n  return \"?\";\n}"},"cases":[[[", ","str",["a","b","c"]],"a, b, c"],[["-","str",[]],""],[["|","str",["x"]],"x"],[["-","str",["a","","b"]],"a--b"],[["--","str",["","",""]],"----"],[[" and ","str",["p","q","r","s","t"]],"p and q and r and s and t"],[["","num",["1","2","3"]],"123"],[[",","num",["1","2","3","4"]],"1,2,3,4"],[["--","num",["1"]],"1"],[["--","num",[]],""],[[", ","mix",["1","two","3.5","c"]],"1, two, 3.5, c, 1"],[[" ","mix",["-1","","2.50","x"]],"-1  2.5 x 1"]]},
    solution: {
      approach: `<p>A comma fold calls a lambda for each element in order. The lambda prints the separator before every element except the first.</p>`,
      code: R`
        #include <iostream>
        #include <sstream>
        #include <string>

        template <class... Ts>
        std::string join(const std::string& sep, const Ts&... args) {
            std::ostringstream os;
            bool first = true;
            auto emit = [&](const auto& x) {
                if (!first) os << sep;
                os << x;
                first = false;
            };
            (emit(args), ...);              // left to right, once per argument
            return os.str();
        }

        int main() {
            std::cout << join(", ", 1, "two", 3.5) << "\n";   // 1, two, 3.5
            std::cout << "[" << join("-") << "]\n";           // []
            std::cout << join("|", 'x') << "\n";              // x
            std::cout << join(", ", 42) << "\n";              // 42
            std::cout << join("", 1, 2, 3) << "\n";           // 123
            std::cout << join("-", "a", "", "b") << "\n";     // a--b
            std::cout << join(" ", std::string("s"), 'c', true, -1) << "\n";   // s c 1 -1
            std::cout << join("--", 1.0, 2.50) << "\n";       // 1--2.5
            std::cout << join(",", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10) << "\n";   // 1,2,...,10
        }
      `,
      dry: { head: ['element', 'first?', 'stream so far'], rows: [['1', 'yes', '"1"'], ['"two"', 'no', '"1, two"'], ['3.5', 'no', '"1, two, 3.5"']] },
      complexity: `<p>O(total output length).</p>`,
      followUps: ['Use <code>std::format</code> instead of streams.', 'Accept a range instead of a pack — which API is more flexible?', 'Constrain the pack with a concept requiring <code>os &lt;&lt; x</code>.']
    }
  });

  practice.push({
    title: 'serialize(): member if available, else free function (if constexpr + requires)', level: 'Medium', tags: ['concepts', 'requires expression', 'if constexpr', 'detection'], companies: ['Meta', 'Bloomberg'],
    statement: `<p>Write <code>serialize(x)</code>: if <code>x.serialize()</code> exists, use it; otherwise if <code>std::to_string(x)</code> works, use that; otherwise if <code>x</code> is convertible to <code>std::string</code>, use it; otherwise fail with a clear <code>static_assert</code> message. Prefer a single function with compile-time branches.</p>`,
    constraints: `C++20. No macros.`,
    example: `<p><code>struct P { std::string serialize() const { return "P"; } };</code> → ${H.c('g', '"P"')}; <code>serialize(42)</code> → ${H.c('g', '"42"')}; <code>serialize("hi")</code> → ${H.c('g', '"hi"')}; <code>serialize(Widget{})</code> → ${H.c('r', 'static_assert: no way to serialize')}.</p>`,
    brute: { why: `<p>The C++11 way: three SFINAE overloads plus priority tags or a <code>void_t</code> detector per feature. It works but is ~4× longer, and overlap between the cases needs careful ordering.</p>`, code: R`
      #include <string>
      #include <type_traits>
      #include <utility>
      template <class T, class = void> struct has_serialize : std::false_type {};
      template <class T>
      struct has_serialize<T, std::void_t<decltype(std::declval<const T&>().serialize())>> : std::true_type {};
    ` },
    mcq: { q: 'What does <code>if constexpr (requires { x.serialize(); })</code> do?', options: ['Evaluates at compile time whether the expression is valid and discards the other branch', 'Calls serialize() and checks the result', 'Throws if serialize is missing', 'Only works with concepts declared at namespace scope'], answer: 0, explain: 'A requires-expression is a bool constant expression. Inside a template, the untaken <code>if constexpr</code> branch is discarded, so it may contain code that would not compile for T.' },
    hints: [`<p>Hint 1: A requires-expression can be used inline as a bool: <code>requires { x.serialize(); }</code>.</p>`, `<p>Hint 2: Chain <code>if constexpr / else if constexpr</code> in priority order: member, to_string, convertible_to.</p>`, `<p>Hint 3: The last <code>else</code> needs a dependent false: <code>static_assert(sizeof(T) == 0, "…")</code> or (C++23 compilers) plain <code>static_assert(false, "…")</code>.</p>`],
    tests: {"sig":"string string -> string","fn":"serP","harness":{"cpp":"string serP(string kind, string x) {\n  if (kind == \"P\") return serialize(P{});\n  if (kind == \"Q\") return serialize(Q{});\n  if (kind == \"Both\") return serialize(Both{});\n  if (kind == \"int\") return serialize(stoi(x));\n  if (kind == \"long\") return serialize(stoll(x));\n  if (kind == \"uint\") return serialize((unsigned)stoul(x));\n  if (kind == \"dbl\") return serialize(stod(x));\n  if (kind == \"float\") return serialize((float)stod(x));\n  if (kind == \"str\") return serialize(x);\n  if (kind == \"lit\") return serialize(\"hi\");\n  if (kind == \"cstr\") return serialize(x.c_str());\n  if (kind == \"char\") return serialize(x[0]);\n  if (kind == \"bool\") return serialize(x == \"1\");\n  return \"?\";\n}"},"cases":[[["P",""],"P"],[["Q",""],"Q7"],[["Both",""],"R"],[["int","42"],"42"],[["int","-12"],"-12"],[["int","0"],"0"],[["long","-9000000000"],"-9000000000"],[["uint","0"],"0"],[["uint","4000000000"],"4000000000"],[["dbl","2.5"],"2.500000"],[["float","0.5"],"0.500000"],[["str","abc"],"abc"],[["str",""],""],[["lit",""],"hi"],[["cstr","xyz"],"xyz"],[["char","A"],"65"],[["bool","1"],"1"],[["bool","0"],"0"]]},
    solution: {
      approach: `<p>One function template with an <code>if constexpr</code> chain whose conditions are inline requires-expressions. Priority is simply the order of the branches — no tags, no overload ranking.</p>`,
      code: R`
        #include <concepts>
        #include <iostream>
        #include <string>

        template <class T>
        std::string serialize(const T& x) {
            if constexpr (requires { { x.serialize() } -> std::convertible_to<std::string>; }) {
                return x.serialize();
            } else if constexpr (requires { std::to_string(x); }) {
                return std::to_string(x);
            } else if constexpr (std::convertible_to<const T&, std::string>) {
                return std::string(x);
            } else {
                static_assert(sizeof(T) == 0, "serialize: no way to serialize this type");
            }
        }

        struct P { std::string serialize() const { return "P"; } };

        struct Q { std::string serialize() const { return "Q" + std::to_string(7); } };
        struct Both {
            std::string serialize() const { return "R"; }
            operator int() const { return 5; }          // the member wins over to_string
        };

        int main() {
            std::cout << serialize(P{}) << " " << serialize(42) << " " << serialize("hi") << "\n";  // P 42 hi
            std::cout << serialize(Q{}) << " " << serialize(-12) << " " << serialize(2.5) << " " << serialize(std::string("abc"))
                      << " " << serialize('A') << " " << serialize(true) << " " << serialize(0u) << "\n";   // Q7 -12 2.500000 abc 65 1 0
            std::cout << serialize(Both{}) << "\n";                    // R
            std::cout << "[" << serialize(std::string()) << "]\n";     // []
        }
      `,
      dry: { head: ['argument', 'has .serialize()?', 'to_string ok?', 'convertible?', 'branch'], rows: [['P{}', 'yes', '—', '—', 'member'], ['42', 'no', 'yes', '—', 'to_string'], ['"hi" (const char[3])', 'no', 'no', 'yes', 'std::string(x)'], ['Widget{}', 'no', 'no', 'no', '<span class="c-r">static_assert</span>']] },
      complexity: `<p>Decided at compile time; run time is just the chosen conversion.</p>`,
      followUps: ['Add containers by recursing with <code>serialize(elem)</code>.', 'Convert the conditions into named concepts — when is that worth it?', 'Why does <code>to_string</code> accept <code>bool</code> and <code>char</code> (what does it print)?']
    }
  });

  practice.push({
    title: 'Shape concept and a variadic totalArea', level: 'Medium', tags: ['concepts', 'variadic', 'static polymorphism'], companies: ['Apple', 'Nvidia'],
    statement: `<p>Define a concept <code>Shape</code> requiring <code>s.area()</code> convertible to <code>double</code> and <code>s.name()</code> convertible to <code>std::string</code>. Write <code>totalArea(shapes...)</code> that accepts any number of different shape types (no common base class, no virtual functions) and sums their areas. Non-shapes must be rejected by the constraint.</p>`,
    constraints: `0 ≤ number of shapes ≤ 100.`,
    example: `<p><code>totalArea(Circle{1}, Square{2})</code> → ${H.c('g', '3.14159 + 4 = 7.14159')}; <code>totalArea()</code> → ${H.c('g', '0')}; <code>totalArea(Square{2}, 5)</code> → ${H.c('r', 'constraints not satisfied: Shape&lt;int&gt;')}.</p>`,
    brute: { why: `<p>The classic OOP answer: an abstract <code>Shape</code> base with virtual <code>area()</code>, heap-allocated shapes in a <code>vector&lt;unique_ptr&lt;Shape&gt;&gt;</code>. Flexible at run time, but costs an allocation and a virtual call per shape, and forces every type to inherit from your base.</p>`, code: R`
      #include <memory>
      #include <vector>
      struct ShapeBase { virtual ~ShapeBase() = default; virtual double area() const = 0; };
      double totalAreaVirtual(const std::vector<std::unique_ptr<ShapeBase>>& v) {
          double s = 0; for (const auto& p : v) s += p->area(); return s;
      }
    ` },
    mcq: { q: 'What does <code>const Shape auto&amp;... shapes</code> declare?', options: ['A function parameter pack where every element\'s type must satisfy Shape', 'A single shape', 'A pack of Shape base-class references', 'A runtime check'], answer: 0, explain: 'An abbreviated variadic template: each element gets its own invented template parameter, and the type-constraint applies to each of them.' },
    hints: [`<p>Hint 1: <code>concept Shape = requires(const T&amp; s) { { s.area() } -&gt; std::convertible_to&lt;double&gt;; { s.name() } -&gt; std::convertible_to&lt;std::string&gt;; };</code></p>`, `<p>Hint 2: Signature: <code>double totalArea(const Shape auto&amp;... shapes)</code>.</p>`, `<p>Hint 3: Body: <code>return (0.0 + ... + shapes.area());</code> — a binary left fold with 0.0, valid for an empty pack.</p>`],
    tests: {"sig":"string list<double> -> double","fn":"totalP","cmp":"float","harness":{"cpp":"double totalP(string pat, vector<double> s) {\n  if (pat == \"\") return totalArea();\n  if (pat == \"C\") return totalArea(Circle{s[0]});\n  if (pat == \"S\") return totalArea(Square{s[0]});\n  if (pat == \"CS\") return totalArea(Circle{s[0]}, Square{s[1]});\n  if (pat == \"SC\") return totalArea(Square{s[0]}, Circle{s[1]});\n  if (pat == \"SSS\") return totalArea(Square{s[0]}, Square{s[1]}, Square{s[2]});\n  if (pat == \"CCS\") return totalArea(Circle{s[0]}, Circle{s[1]}, Square{s[2]});\n  return -1;\n}"},"cases":[[["",[]],0],[["C",[1]],3.141592653589793],[["C",[2]],12.566370614359172],[["C",[0]],0],[["S",[0]],0],[["S",[2.5]],6.25],[["CS",[1,2]],7.141592653589793],[["SC",[3,0.5]],9.78539816339745],[["SSS",[1.5,2,0.5]],6.5],[["CCS",[1,1,1]],7.283185307179586]]},
    solution: {
      approach: `<p>Static polymorphism: the concept states the interface; the constrained pack accepts any mix of conforming types; a binary fold sums. Every call is resolved and inlined at compile time — no vtables, no heap.</p>`,
      code: R`
        #include <concepts>
        #include <iostream>
        #include <numbers>
        #include <string>

        template <class T>
        concept Shape = requires(const T& s) {
            { s.area() } -> std::convertible_to<double>;
            { s.name() } -> std::convertible_to<std::string>;
        };

        struct Circle { double r; double area() const { return std::numbers::pi * r * r; } std::string name() const { return "circle"; } };
        struct Square { double a; double area() const { return a * a; } std::string name() const { return "square"; } };

        double totalArea(const Shape auto&... shapes) {
            return (0.0 + ... + shapes.area());          // binary left fold, 0 for no shapes
        }

        void describeAll(const Shape auto&... shapes) {
            ((std::cout << shapes.name() << '=' << shapes.area() << ' '), ...);
            std::cout << "\n";
        }

        struct OnlyArea { double area() const { return 1; } };
        static_assert(Shape<Circle> && Shape<Square> && !Shape<int> && !Shape<OnlyArea>);

        int main() {
            std::cout << totalArea(Circle{1}, Square{2}) << " " << totalArea() << "\n";   // 7.14159 0
            describeAll(Square{3}, Circle{0.5});
            std::cout << totalArea(Square{1.5}, Square{2}, Square{0.5}) << " " << totalArea(Circle{2}) << " "
                      << totalArea(Square{0}) << "\n";                                    // 6.5 12.5664 0
            // totalArea(Square{2}, 5);   // error: Shape not satisfied
        }
      `,
      dry: { head: ['step', 'element', 'running sum'], rows: [['init', '—', '0.0'], ['1', 'Circle{1}.area() = 3.14159', '3.14159'], ['2', 'Square{2}.area() = 4', '7.14159']] },
      complexity: `<p>O(N) area calls, all inlinable. One instantiation per distinct list of shape types.</p>`,
      followUps: ['Store mixed shapes in a container: compare <code>std::variant&lt;Circle, Square&gt;</code> + <code>std::visit</code> with the virtual approach.', 'Add a semantic requirement (area ≥ 0) — can a concept check it?', 'How would you type-erase Shape (like <code>std::function</code>) without inheritance in the user types?']
    }
  });

  practice.push({
    title: 'Build my_is_same, my_conditional and my_enable_if from scratch', level: 'Medium', tags: ['type traits', 'specialization', 'SFINAE'], companies: ['Bloomberg', 'Citadel'],
    statement: `<p>Without using <code>&lt;type_traits&gt;</code> for the implementations, write <code>my_is_same&lt;A, B&gt;</code>, <code>my_conditional&lt;B, T, F&gt;</code> and <code>my_enable_if&lt;B, T&gt;</code> with <code>_v</code>/<code>_t</code> helpers, then use <code>my_enable_if_t</code> to write a function <code>half(x)</code> available only for floating-point types.</p>`,
    constraints: `C++17 or later; check results with <code>static_assert</code>.`,
    example: `<p>${H.table(['expression', 'result'], [['my_is_same_v&lt;int, int&gt;', 'true'], ['my_is_same_v&lt;int, const int&gt;', 'false'], ['my_conditional_t&lt;true, int, double&gt;', 'int'], ['half(3.0)', '1.5'], ['half(3)', '<span class="c-r">no matching function</span>']])}</p>`,
    brute: { why: `<p>Just <code>#include &lt;type_traits&gt;</code> — fine in production, but interviewers ask this to see whether you understand that traits are ordinary specializations, not compiler magic.</p>`, code: R`
      #include <type_traits>
      static_assert(std::is_same_v<std::conditional_t<true, int, double>, int>);
    ` },
    mcq: { q: 'In <code>my_enable_if&lt;false, T&gt;</code>, what makes SFINAE work?', options: ['The primary template has no <code>type</code> member, so <code>::type</code> is an invalid type during substitution', 'It throws an exception', 'It defines <code>type = void</code>', 'It is marked deleted'], answer: 0, explain: 'Naming a non-existent member type in the signature is a substitution failure in the immediate context, so the overload is removed.' },
    hints: [`<p>Hint 1: <code>my_is_same</code>: primary inherits a false constant; partial <code>my_is_same&lt;T, T&gt;</code> inherits true.</p>`, `<p>Hint 2: <code>my_conditional</code>: primary <code>&lt;bool B, class T, class F&gt; { using type = T; }</code>; partial for <code>&lt;false, T, F&gt;</code> uses F.</p>`, `<p>Hint 3: <code>my_enable_if</code>: primary is empty; partial <code>&lt;true, T&gt;</code> has <code>using type = T;</code>. Use it as <code>template&lt;class T, my_enable_if_t&lt;is_float&lt;T&gt;, int&gt; = 0&gt;</code>. You may write a tiny <code>is_float</code> via <code>my_is_same</code>.</p>`],
    tests: {"sig":"string double -> string","fn":"halfP","harness":{"cpp":"string halfP(string kind, double x) {\n  ostringstream os; os << setprecision(10);\n  if (kind == \"double\") os << half(x);\n  else if (kind == \"float\") os << half((float)x);\n  else if (kind == \"ld\") os << half((long double)x);\n  else if (kind == \"isf_float\") os << is_float_v<float>;\n  else if (kind == \"isf_double\") os << is_float_v<double>;\n  else if (kind == \"isf_ld\") os << is_float_v<long double>;\n  else if (kind == \"isf_int\") os << is_float_v<int>;\n  else if (kind == \"isf_long\") os << is_float_v<long>;\n  else if (kind == \"isf_cfloat\") os << is_float_v<const float>;\n  else if (kind == \"isf_ptr\") os << is_float_v<float*>;\n  return os.str();\n}"},"cases":[[["double",3],"1.5"],[["float",5],"2.5"],[["double",-1],"-0.5"],[["double",0],"0"],[["ld",1],"0.5"],[["float",7],"3.5"],[["double",1e+300],"5e+299"],[["double",1],"0.5"],[["isf_float",0],"1"],[["isf_double",0],"1"],[["isf_ld",0],"1"],[["isf_int",0],"0"],[["isf_long",0],"0"],[["isf_cfloat",0],"0"],[["isf_ptr",0],"0"]]},
    solution: {
      approach: `<p>Every trait is a primary template plus one partial specialization. A tiny <code>bool_constant</code> replaces <code>std::integral_constant</code>.</p>`,
      code: R`
        #include <iostream>

        template <bool B> struct bool_c { static constexpr bool value = B; };

        template <class A, class B> struct my_is_same : bool_c<false> {};
        template <class T>          struct my_is_same<T, T> : bool_c<true> {};
        template <class A, class B> inline constexpr bool my_is_same_v = my_is_same<A, B>::value;

        template <bool B, class T, class F> struct my_conditional { using type = T; };
        template <class T, class F>         struct my_conditional<false, T, F> { using type = F; };
        template <bool B, class T, class F> using my_conditional_t = typename my_conditional<B, T, F>::type;

        template <bool B, class T = void> struct my_enable_if {};
        template <class T>                struct my_enable_if<true, T> { using type = T; };
        template <bool B, class T = void> using my_enable_if_t = typename my_enable_if<B, T>::type;

        template <class T>
        inline constexpr bool is_float_v = my_is_same_v<T, float> || my_is_same_v<T, double> || my_is_same_v<T, long double>;

        template <class T, my_enable_if_t<is_float_v<T>, int> = 0>
        T half(T x) { return x / 2; }

        static_assert(my_is_same_v<int, int> && !my_is_same_v<int, const int>);
        static_assert(my_is_same_v<my_conditional_t<true, int, double>, int>);
        static_assert(my_is_same_v<my_conditional_t<false, int, double>, double>);

        static_assert(my_is_same_v<int*, int*> && !my_is_same_v<int, long>);
        static_assert(my_is_same_v<my_conditional_t<false, int, double>, double>);
        static_assert(my_is_same_v<my_enable_if_t<true, int>, int>);

        int main() {
            std::cout << half(3.0) << "\n";   // 1.5   (half(3) would not compile)
            std::cout << half(5.0f) << " " << half(-1.0) << " " << half(0.0) << " " << half(1.0L) << "\n";   // 2.5 -0.5 0 0.5
            std::cout << is_float_v<float> << is_float_v<int> << is_float_v<long double> << "\n";            // 101
        }   // 1.5   (half(3) would not compile)
      `,
      dry: { head: ['instantiation', 'specialization chosen', 'result'], rows: [['my_is_same&lt;int, int&gt;', 'partial &lt;T, T&gt;', 'true'], ['my_is_same&lt;int, const int&gt;', 'primary', 'false'], ['my_enable_if&lt;false, int&gt;::type', 'primary (empty)', 'invalid → SFINAE']] },
      complexity: `<p>Compile time only; zero run-time cost.</p>`,
      followUps: ['Implement <code>my_remove_reference</code> and <code>my_decay</code>.', 'Why is <code>std::is_same</code> often a compiler built-in today?', 'Write <code>my_void_t</code> and a detector with it.']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Compile-time TypeList: size, contains, indexOf, at', level: 'Hard', tags: ['variadic', 'metaprogramming', 'partial specialization', 'fold expression'], companies: ['Jane Street', 'Hudson River Trading'],
    statement: `<p>Implement a compile-time type list <code>TypeList&lt;Ts...&gt;</code> with: <code>size</code>, <code>contains&lt;T&gt;</code>, <code>indexOf&lt;T&gt;</code> (first index, or -1), and <code>At&lt;I, List&gt;::type</code> (the I-th type; out of range must not compile). Everything must be usable in <code>static_assert</code>.</p>`,
    constraints: `Up to 100 types in a list. No run-time code.`,
    example: `<p>For <code>L = TypeList&lt;int, char, double, char&gt;</code>: size ${H.c('g', '4')}, contains&lt;char&gt; ${H.c('g', 'true')}, indexOf&lt;char&gt; ${H.c('g', '1')} (first match), indexOf&lt;float&gt; ${H.c('g', '-1')}, <code>At&lt;2, L&gt;::type</code> = ${H.c('g', 'double')}, <code>At&lt;9, L&gt;</code> ${H.c('r', 'compile error')}.</p>`,
    brute: { why: `<p>Find the index at <b>run time</b> by comparing <code>typeid</code>s in a loop. It costs run time, needs RTTI, cannot be used in <code>static_assert</code> or as a template argument, and cannot produce a <i>type</i> (At) at all.</p>`, code: R`
      #include <typeinfo>
      #include <vector>
      #include <typeindex>
      template <class T, class... Ts>
      int indexOfRuntime() {
          std::vector<std::type_index> ids{typeid(Ts)...};
          for (int i = 0; i < (int)ids.size(); ++i) if (ids[i] == typeid(T)) return i;
          return -1;
      }
    ` },
    mcq: { q: 'For <code>At&lt;0, TypeList&lt;H, T...&gt;&gt;</code> vs <code>At&lt;I, TypeList&lt;H, T...&gt;&gt;</code> with I = 0, which partial specialization is chosen?', options: ['The one with the literal 0 — it is more specialized', 'The generic I one — it was declared later', 'Ambiguous', 'The primary template'], answer: 0, explain: 'Every argument list matching <code>&lt;0, …&gt;</code> also matches <code>&lt;I, …&gt;</code>, but not vice versa, so the 0-version is more specialized and terminates the recursion.' },
    hints: [`<p>Hint 1: <code>size = sizeof...(Ts)</code>; <code>contains = (std::is_same_v&lt;T, Ts&gt; || ...)</code>.</p>`, `<p>Hint 2: indexOf in a <code>consteval</code>/<code>constexpr</code> function: walk the pack with a comma fold, counting <code>i</code> and recording the first match.</p>`, `<p>Hint 3: At: declare the primary but do not define it (so out-of-range is an error). Partial <code>&lt;0, TypeList&lt;H, T...&gt;&gt;</code> gives H; partial <code>&lt;I, TypeList&lt;H, T...&gt;&gt;</code> inherits from <code>At&lt;I - 1, TypeList&lt;T...&gt;&gt;</code>.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"4 1 -1 0 2 1 0 0 -1"}]},
    solution: {
      approach: `<p>Folds for the boolean/counting questions (one instantiation, no recursion) and a recursive partial specialization for <code>At</code>, which must produce a type. Leaving the primary <code>At</code> undefined turns out-of-range access into a compile error.</p>`,
      code: R`
        #include <iostream>
        #include <cstddef>
        #include <type_traits>

        template <class... Ts>
        struct TypeList {
            static constexpr std::size_t size = sizeof...(Ts);

            template <class T>
            static constexpr bool contains = (std::is_same_v<T, Ts> || ...);

            template <class T>
            static constexpr int indexOf() {
                int i = 0, found = -1;
                ((found == -1 && std::is_same_v<T, Ts> ? (found = i) : 0, ++i), ...);
                return found;
            }
        };

        template <std::size_t I, class List> struct At;                 // undefined: out of range = error
        template <class H, class... T>
        struct At<0, TypeList<H, T...>> { using type = H; };             // found it
        template <std::size_t I, class H, class... T>
        struct At<I, TypeList<H, T...>> : At<I - 1, TypeList<T...>> {};  // drop the head, recurse

        template <std::size_t I, class List> using At_t = typename At<I, List>::type;

        using L = TypeList<int, char, double, char>;
        static_assert(L::size == 4);
        static_assert(L::contains<char> && !L::contains<float>);
        static_assert(L::indexOf<char>() == 1 && L::indexOf<float>() == -1);
        static_assert(std::is_same_v<At_t<2, L>, double>);
        // At_t<9, L> x;   // error: incomplete type At<5, TypeList<>>
        static_assert(L::indexOf<int>() == 0 && L::indexOf<double>() == 2 && L::contains<double>);
        static_assert(std::is_same_v<At_t<0, L>, int> && std::is_same_v<At_t<3, L>, char>);
        static_assert(TypeList<>::size == 0 && !TypeList<>::contains<int>);
        static_assert(TypeList<>::indexOf<int>() == -1);
        static_assert(TypeList<int>::indexOf<int>() == 0 && std::is_same_v<At_t<0, TypeList<float>>, float>);
        int main() {
            std::cout << L::size << " " << L::indexOf<char>() << " " << L::indexOf<float>() << " " << L::indexOf<int>() << " "
                      << L::indexOf<double>() << " " << L::contains<char> << " " << L::contains<float> << " "
                      << TypeList<>::size << " " << TypeList<>::indexOf<int>() << "\n";   // 4 1 -1 0 2 1 0 0 -1
        }
      `,
      dry: { head: ['instantiation', 'specialization', 'result'], rows: [['At&lt;2, TL&lt;int,char,double,char&gt;&gt;', 'generic I', 'inherit At&lt;1, TL&lt;char,double,char&gt;&gt;'], ['At&lt;1, TL&lt;char,double,char&gt;&gt;', 'generic I', 'inherit At&lt;0, TL&lt;double,char&gt;&gt;'], ['At&lt;0, TL&lt;double,char&gt;&gt;', 'I = 0 (more specialized)', '<span class="c-g">type = double</span>']] },
      complexity: `<p>size/contains/indexOf: O(N) work in one instantiation. At&lt;I&gt;: O(I) instantiations (compilers also offer <code>__type_pack_element</code> for O(1)).</p>`,
      followUps: ['Add <code>PushFront</code>, <code>Reverse</code> and <code>Unique</code>.', 'Convert a <code>TypeList</code> into a <code>std::variant</code> of those types.', 'Use C++26 pack indexing <code>Ts...[I]</code> — what disappears?']
    }
  });

  practice.push({
    title: 'Implement std::apply and a tuple printer with index_sequence', level: 'Hard', tags: ['variadic', 'index_sequence', 'perfect forwarding', 'tuple'], companies: ['Google', 'Bloomberg'],
    statement: `<p>Implement <code>myApply(f, tuple)</code> that calls <code>f</code> with the tuple's elements as separate arguments (perfectly forwarding both <code>f</code> and the elements, returning exactly what <code>f</code> returns, including references). Then use it to write <code>tupleToString(t)</code> producing <code>(1, x, 2.5)</code>.</p>`,
    constraints: `Tuples of 0..20 elements; works with lvalue and rvalue tuples; move-only elements must be movable out of an rvalue tuple.`,
    example: `<p><code>myApply([](int a, int b) { return a + b; }, std::tuple{2, 3})</code> → ${H.c('g', '5')}. <code>tupleToString(std::tuple{1, \'x\', 2.5})</code> → ${H.c('g', '"(1, x, 2.5)"')}; empty tuple → ${H.c('g', '"()"')}.</p>`,
    brute: { why: `<p>Hand-write one overload per tuple size (0, 1, 2, 3 …), each calling <code>f(std::get&lt;0&gt;(t), std::get&lt;1&gt;(t), …)</code>. It caps the size and repeats code; forgetting to forward makes move-only elements fail.</p>`, code: R`
      #include <tuple>
      template <class F, class A, class B>
      auto apply2(F f, const std::tuple<A, B>& t) { return f(std::get<0>(t), std::get<1>(t)); }
      template <class F, class A, class B, class C>
      auto apply3(F f, const std::tuple<A, B, C>& t) { return f(std::get<0>(t), std::get<1>(t), std::get<2>(t)); }
    ` },
    mcq: { q: 'Why expand <code>std::get&lt;I&gt;(std::forward&lt;Tuple&gt;(t))...</code> rather than <code>std::get&lt;I&gt;(t)...</code>?', options: ['So elements of an rvalue tuple are passed as rvalues (move-only types work, no extra copies)', 'Because std::get requires rvalues', 'To change the evaluation order', 'It makes no difference'], answer: 0, explain: '<code>std::get</code> on an rvalue tuple returns <code>T&amp;&amp;</code>. Forwarding the tuple preserves its value category per element; forwarding "the same tuple" several times is fine because each <code>get</code> touches a different element.' },
    hints: [`<p>Hint 1: A helper that receives <code>std::index_sequence&lt;I...&gt;</code> gives you the pack 0, 1, …, N-1 to expand.</p>`, `<p>Hint 2: <code>std::make_index_sequence&lt;std::tuple_size_v&lt;std::remove_reference_t&lt;Tuple&gt;&gt;&gt;{}</code> creates it; return type <code>decltype(auto)</code> preserves references.</p>`, `<p>Hint 3: Inside: <code>return std::invoke(std::forward&lt;F&gt;(f), std::get&lt;I&gt;(std::forward&lt;Tuple&gt;(t))...);</code>. For the printer, apply a variadic lambda that uses a comma fold with a "first" flag.</p>`],
    tests: {"sig":"string list<string> -> string","fn":"tupP","harness":{"cpp":"string tupP(string kind, vector<string> v) {\n  if (kind == \"add\") return to_string(myApply([](int a, int b) { return a + b; }, tuple{stoi(v[0]), stoi(v[1])}));\n  if (kind == \"sum3\") { tuple<int, int, int> t{stoi(v[0]), stoi(v[1]), stoi(v[2])}; return to_string(myApply([](int a, int b, int c) { return a + b + c; }, t)); }\n  if (kind == \"mixed\") return tupleToString(tuple{stoi(v[0]), v[1][0], stod(v[2])});\n  if (kind == \"empty\") return tupleToString(tuple<>{});\n  if (kind == \"one\") return tupleToString(tuple<int>{stoi(v[0])});\n  if (kind == \"strint\") return tupleToString(tuple<string, int>{v[0], stoi(v[1])});\n  if (kind == \"move\") return to_string(myApply([](unique_ptr<int> p) { return *p; }, tuple<unique_ptr<int>>{make_unique<int>(stoi(v[0]))}));\n  if (kind == \"ref\") { int x = stoi(v[0]); int& r = myApply([](int& a) -> int& { return a; }, tuple<int&>(x)); r = stoi(v[1]); return to_string(x); }\n  if (kind == \"const\") return to_string(myApply([] { return 42; }, tuple<>{}));\n  if (kind == \"twenty\") return tupleToString(make_tuple(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20));\n  return \"?\";\n}"},"cases":[[["add",["2","3"]],"5"],[["add",["-4","4"]],"0"],[["sum3",["1","2","3"]],"6"],[["mixed",["1","x","2.5"]],"(1, x, 2.5)"],[["mixed",["-7","z","0.125"]],"(-7, z, 0.125)"],[["empty",[]],"()"],[["one",["7"]],"(7)"],[["strint",["hi","-3"]],"(hi, -3)"],[["strint",["","0"]],"(, 0)"],[["move",["9"]],"9"],[["ref",["1","5"]],"5"],[["ref",["10","-2"]],"-2"],[["const",[]],"42"],[["twenty",[]],"(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)"]]},
    solution: {
      approach: `<p>The index-sequence trick turns "N elements" into a pack of indices that can be expanded in one expression. <code>std::invoke</code> supports member pointers too, and <code>decltype(auto)</code> returns exactly what <code>f</code> returns.</p>`,
      code: R`
        #include <cstddef>
        #include <functional>
        #include <iostream>
        #include <memory>
        #include <sstream>
        #include <string>
        #include <tuple>
        #include <type_traits>
        #include <utility>

        template <class F, class Tuple, std::size_t... I>
        decltype(auto) applyImpl(F&& f, Tuple&& t, std::index_sequence<I...>) {
            return std::invoke(std::forward<F>(f), std::get<I>(std::forward<Tuple>(t))...);
        }

        template <class F, class Tuple>
        decltype(auto) myApply(F&& f, Tuple&& t) {
            constexpr std::size_t N = std::tuple_size_v<std::remove_reference_t<Tuple>>;
            return applyImpl(std::forward<F>(f), std::forward<Tuple>(t), std::make_index_sequence<N>{});
        }

        template <class... Ts>
        std::string tupleToString(const std::tuple<Ts...>& t) {
            std::ostringstream os;
            os << '(';
            myApply([&os](const auto&... xs) {
                bool first = true;
                ((os << (first ? "" : ", ") << xs, first = false), ...);
            }, t);
            os << ')';
            return os.str();
        }

        int main() {
            std::cout << myApply([](int a, int b) { return a + b; }, std::tuple{2, 3}) << "\n";   // 5
            std::cout << tupleToString(std::tuple{1, 'x', 2.5}) << " " << tupleToString(std::tuple<>{}) << "\n";
            auto owned = myApply([](std::unique_ptr<int> p) { return *p; },
                                 std::tuple<std::unique_ptr<int>>{std::make_unique<int>(9)});  // moved out
            std::cout << owned << "\n";                                                         // 9
            std::cout << tupleToString(std::tuple<int>{7}) << " " << tupleToString(std::tuple<std::string, int>{"hi", -3}) << "\n";   // (7) (hi, -3)
            int v = 1;
            int& r = myApply([](int& a) -> int& { return a; }, std::tuple<int&>(v));   // the reference survives
            r = 5;
            std::cout << v << " " << myApply([] { return 42; }, std::tuple<>{}) << "\n";   // 5 42
            std::cout << tupleToString(std::make_tuple(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)) << "\n";
        }
      `,
      dry: { head: ['step', 'value'], rows: [['N for tuple{1, \'x\', 2.5}', '3'], ['index_sequence', '&lt;0, 1, 2&gt;'], ['expansion', 'f(get&lt;0&gt;(t), get&lt;1&gt;(t), get&lt;2&gt;(t))'], ['printer fold', '"1" → "1, x" → "1, x, 2.5"']] },
      complexity: `<p>O(N) element accesses; one instantiation per tuple type. No recursion.</p>`,
      followUps: ['Implement <code>std::make_from_tuple&lt;T&gt;</code>.', 'Write <code>tupleTransform(t, f)</code> returning a new tuple.', 'Make <code>myApply</code> <code>constexpr</code> and <code>noexcept</code>-correct.']
    }
  });

  practice.push({
    title: 'Strongly typed physical units with non-type template parameters', level: 'Hard', tags: ['non-type template parameter', 'operator templates', 'compile-time safety'], companies: ['SpaceX', 'Tesla', 'Waymo'],
    statement: `<p>Model quantities as <code>Quantity&lt;M, S&gt;</code> where M and S are the exponents of metres and seconds. Adding/subtracting requires identical dimensions; multiplying/dividing adds/subtracts exponents. <code>Meters / Seconds</code> must produce a <code>Speed</code> type, and <code>Meters + Seconds</code> must <b>fail to compile</b>. Zero run-time overhead versus <code>double</code>.</p>`,
    constraints: `Integer exponents in [-8, 8]. C++20.`,
    example: `<p><code>Meters d{100}; Seconds t{20}; auto v = d / t;</code> → type ${H.c('g', 'Quantity&lt;1, -1&gt;')}, value ${H.c('g', '5')}. <code>d + t</code> → ${H.c('r', 'no match for operator+')}. (The 1999 Mars Climate Orbiter was lost to a unit mix-up exactly like this.)</p>`,
    brute: { why: `<p>Plain <code>double</code>s with naming conventions (<code>distM</code>, <code>timeS</code>). The compiler cannot catch <code>distM + timeS</code>; bugs show up in production, not at build time.</p>`, code: R`
      double speed(double distM, double timeS) { return distM / timeS; }
      double oops(double distM, double timeS) { return distM + timeS; }   // compiles, meaningless
    ` },
    mcq: { q: 'How does <code>operator*</code> produce the right result type?', options: ['Its return type is <code>Quantity&lt;M1 + M2, S1 + S2&gt;</code>, computed from deduced non-type parameters', 'It checks units at run time', 'It returns double', 'Through virtual functions'], answer: 0, explain: 'Non-type template parameters are deduced from the argument types, and arithmetic on them in the return type happens at compile time.' },
    hints: [`<p>Hint 1: <code>template &lt;int M, int S&gt; struct Quantity { double value; };</code> — the dimensions live only in the type.</p>`, `<p>Hint 2: <code>operator+</code> takes <code>Quantity&lt;M, S&gt;</code> twice (same M, S), so mismatched dimensions simply fail deduction → "no match".</p>`, `<p>Hint 3: <code>template&lt;int M1, int S1, int M2, int S2&gt; constexpr Quantity&lt;M1 + M2, S1 + S2&gt; operator*(Quantity&lt;M1, S1&gt; a, Quantity&lt;M2, S2&gt; b)</code>; same for <code>/</code> with minus. Add aliases Meters, Seconds, Speed, Acceleration and check with <code>static_assert</code>.</p>`],
    tests: {"sig":"string double double -> string","fn":"qP","harness":{"cpp":"template <int M, int S> string qs(Quantity<M, S> q) { ostringstream os; os << q.value << \" m^\" << M << \" s^\" << S; return os.str(); }\nstring qP(string op, double a, double b) {\n  Meters m{a}; Seconds t{b};\n  if (op == \"m/t\") return qs(m / t);\n  if (op == \"m/t/t\") return qs(m / t / t);\n  if (op == \"t*(m/t)\") return qs(t * (m / t));\n  if (op == \"m+m\") return qs(m + m);\n  if (op == \"m-m\") return qs(m - Meters{b});\n  if (op == \"m*m\") return qs(m * m);\n  if (op == \"m/m\") return qs(m / m);\n  if (op == \"t*t\") return qs(t * t);\n  if (op == \"m*m/t\") return qs(m * m / t);\n  return \"?\";\n}"},"cases":[[["m/t",100,20],"5 m^1 s^-1"],[["m/t/t",100,20],"0.25 m^1 s^-2"],[["t*(m/t)",100,20],"100 m^1 s^0"],[["m+m",1.5,0],"3 m^1 s^0"],[["m-m",100,1.5],"98.5 m^1 s^0"],[["m*m",100,1.5],"10000 m^2 s^0"],[["m/m",7,1],"1 m^0 s^0"],[["t*t",0,3],"9 m^0 s^2"],[["m*m/t",6,4],"9 m^2 s^-1"],[["m/t",-2,4],"-0.5 m^1 s^-1"],[["m/t",0,5],"0 m^1 s^-1"],[["m*m/t",1000,10],"100000 m^2 s^-1"]]},
    solution: {
      approach: `<p>Dimensions are encoded as non-type template parameters, so the type system does dimensional analysis. Deduction makes mismatched addition impossible and computes product/quotient dimensions at compile time. The object is just a <code>double</code>, so it optimizes to identical machine code.</p>`,
      code: R`
        #include <iostream>
        #include <type_traits>

        template <int M, int S>
        struct Quantity {
            double value;
        };

        template <int M, int S>
        constexpr Quantity<M, S> operator+(Quantity<M, S> a, Quantity<M, S> b) { return {a.value + b.value}; }
        template <int M, int S>
        constexpr Quantity<M, S> operator-(Quantity<M, S> a, Quantity<M, S> b) { return {a.value - b.value}; }
        template <int M1, int S1, int M2, int S2>
        constexpr Quantity<M1 + M2, S1 + S2> operator*(Quantity<M1, S1> a, Quantity<M2, S2> b) { return {a.value * b.value}; }
        template <int M1, int S1, int M2, int S2>
        constexpr Quantity<M1 - M2, S1 - S2> operator/(Quantity<M1, S1> a, Quantity<M2, S2> b) { return {a.value / b.value}; }

        using Meters       = Quantity<1, 0>;
        using Seconds      = Quantity<0, 1>;
        using Speed        = Quantity<1, -1>;
        using Acceleration = Quantity<1, -2>;

        int main() {
            constexpr Meters d{100};
            constexpr Seconds t{20};
            constexpr auto v = d / t;                         // Quantity<1, -1>
            constexpr auto a = v / t;                         // Quantity<1, -2>
            static_assert(std::is_same_v<std::remove_const_t<decltype(v)>, Speed>);
            static_assert(std::is_same_v<std::remove_const_t<decltype(a)>, Acceleration>);
            static_assert(sizeof(Speed) == sizeof(double));   // zero overhead
            std::cout << v.value << " m/s, " << a.value << " m/s^2\n";   // 5 m/s, 0.25 m/s^2
            // auto bad = d + t;   // error: no match for operator+ (Quantity<1,0>, Quantity<0,1>)
            constexpr Meters e{1.5};
            static_assert(std::is_same_v<decltype(d * d), Quantity<2, 0>>);
            static_assert(std::is_same_v<decltype(d / d), Quantity<0, 0>>);
            static_assert(std::is_same_v<decltype(t * v), Meters>);
            std::cout << (e + e).value << " " << (d - e).value << " " << (d * e).value << " " << (d / d).value << " "
                      << (t * v).value << " " << (Meters{-2} / Seconds{4}).value << "\n";   // 3 98.5 150 1 100 -0.5
        }
      `,
      dry: { head: ['expression', 'deduced', 'result type', 'value'], rows: [['d / t', 'M1=1,S1=0,M2=0,S2=1', 'Quantity&lt;1, -1&gt; (Speed)', '5'], ['v / t', 'M1=1,S1=-1,M2=0,S2=1', 'Quantity&lt;1, -2&gt;', '0.25'], ['d + t', 'M: 1 vs 0 conflict', '<span class="c-r">no match</span>', '—']] },
      complexity: `<p>Run time identical to raw doubles; compile time: one instantiation per dimension combination.</p>`,
      followUps: ['Add kilograms and a <code>Newton</code> alias.', 'Support scaled units (km, ms) with <code>std::ratio</code> — compare with <code>std::chrono::duration</code>.', 'Use a C++20 class-type NTTP <code>struct Dim { int m, s, kg; }</code> instead of separate ints.']
    }
  });

  practice.push({
    title: 'The overloaded visitor for std::variant', level: 'Hard', tags: ['variadic', 'CTAD', 'overload resolution', 'variant'], companies: ['Meta', 'Bloomberg', 'Adobe'],
    statement: `<p>Write the <code>overloaded</code> helper so that <code>std::visit(overloaded{lambda1, lambda2, …}, v)</code> dispatches on the active alternative of a <code>std::variant&lt;int, double, std::string, bool&gt;</code>. Use it to evaluate a vector of such tokens: sum the numbers, concatenate strings, count true bools. Explain which lambda is chosen for each alternative, including when a generic <code>[](auto)</code> fallback is present.</p>`,
    constraints: `Up to 10<sup>6</sup> tokens. C++20.`,
    example: `<p>Tokens <code>{3, 2.5, "ab", true, "c", false}</code> → sum ${H.c('g', '5.5')}, text ${H.c('g', '"abc"')}, trues ${H.c('g', '1')}. With lambdas for <code>int</code>, <code>double</code>, <code>const std::string&amp;</code> and <code>auto</code>: a <code>bool</code> alternative goes to ${H.c('y', 'the generic auto lambda')} (exact match through deduction beats bool→int promotion).</p>`,
    brute: { why: `<p>An if-else chain on <code>std::holds_alternative&lt;T&gt;</code> / <code>v.index()</code>. Easy to forget an alternative (no compile-time exhaustiveness), and every new alternative means editing every chain.</p>`, code: R`
      #include <string>
      #include <variant>
      double numericValue(const std::variant<int, double, std::string, bool>& v) {
          if (std::holds_alternative<int>(v)) return std::get<int>(v);
          if (std::holds_alternative<double>(v)) return std::get<double>(v);
          return 0;   // silently ignores strings and bools — and any alternative added later
      }
    ` },
    mcq: { q: 'Why do we need <code>using Fs::operator()...;</code> in <code>struct overloaded : Fs...</code>?', options: ['Otherwise the operator() names from different bases are ambiguous; the using-declarations bring them into one overload set', 'To make the lambdas copyable', 'It enables CTAD', 'It is only for style'], answer: 0, explain: 'Name lookup finds operator() in several base classes and stops with an ambiguity. A pack-expanded using-declaration merges them so normal overload resolution can pick the best one.' },
    hints: [`<p>Hint 1: <code>template&lt;class... Fs&gt; struct overloaded : Fs... { using Fs::operator()...; };</code> inherits from every lambda type.</p>`, `<p>Hint 2: C++20 aggregate CTAD deduces <code>Fs...</code> from <code>overloaded{l1, l2}</code>; in C++17 add a deduction guide <code>template&lt;class... Fs&gt; overloaded(Fs...) -&gt; overloaded&lt;Fs...&gt;;</code>.</p>`, `<p>Hint 3: <code>std::visit</code> calls the visitor with the active alternative's exact type; then ordinary overload resolution among the lambdas' <code>operator()</code> decides. A bool alternative + an <code>int</code> lambda + an <code>auto</code> lambda → the auto one wins (exact). If no lambda accepts an alternative, <code>std::visit</code> fails to compile — free exhaustiveness checking.</p>`],
    tests: {"sig":"list<string> -> string","fn":"visP","harness":{"cpp":"string visP(vector<string> toks) {\n  bool who = !toks.empty() && toks[0] == \"who\";\n  auto make = [](const string& t) {\n    Token tok; string val = t.substr(2);\n    if (t[0] == 'i') tok = stoi(val); else if (t[0] == 'd') tok = stod(val); else if (t[0] == 's') tok = val; else tok = (val == \"1\");\n    return tok;\n  };\n  if (who) {\n    auto f = overloaded{[](int) { return \"int\"; }, [](const string&) { return \"string\"; }, [](auto) { return \"auto\"; }};\n    string out;\n    for (size_t i = 1; i < toks.size(); i++) { if (i > 1) out += \" \"; out += std::visit(f, make(toks[i])); }\n    return out;\n  }\n  double sum = 0; string text; int trues = 0;\n  for (auto& t : toks) {\n    std::visit(overloaded{[&](int i) { sum += i; }, [&](double d) { sum += d; }, [&](const string& s) { text += s; }, [&](bool b) { trues += b; }}, make(t));\n  }\n  ostringstream os; os << sum << \" [\" << text << \"] \" << trues; return os.str();\n}"},"cases":[[[["i:3","d:2.5","s:ab","b:1","s:c","b:0"]],"5.5 [abc] 1"],[[[]],"0 [] 0"],[[["i:-5","i:5","i:2"]],"2 [] 0"],[[["b:1","b:1","b:1"]],"0 [] 3"],[[["s:x","s:y"]],"0 [xy] 0"],[[["d:1.5","d:1.5","d:1.5","d:0.25"]],"4.75 [] 0"],[[["s:","i:1"]],"1 [] 0"],[[{"$rep":"i:1","n":20000}],"20000 [] 0"],[[["who","b:1","i:7","d:1.5","s:s","b:0"]],"auto int auto string auto"]]},
    solution: {
      approach: `<p>Inherit from all lambdas and merge their call operators with a pack-expanded using-declaration; CTAD deduces the lambda types. <code>std::visit</code> generates a jump table over alternatives, so dispatch is O(1) and missing cases are compile errors.</p>`,
      code: R`
        #include <iostream>
        #include <string>
        #include <variant>
        #include <vector>

        template <class... Fs>
        struct overloaded : Fs... { using Fs::operator()...; };
        template <class... Fs> overloaded(Fs...) -> overloaded<Fs...>;   // needed only before C++20

        using Token = std::variant<int, double, std::string, bool>;

        int main() {
            auto report = [](const std::vector<Token>& tokens) {
                double sum = 0; std::string text; int trues = 0;
                for (const auto& tok : tokens) {
                    std::visit(overloaded{
                        [&](int i)                { sum += i; },
                        [&](double d)             { sum += d; },
                        [&](const std::string& s) { text += s; },
                        [&](bool b)               { trues += b; }
                    }, tok);
                }
                std::cout << sum << " [" << text << "] " << trues << "\n";
            };
            report({3, 2.5, std::string("ab"), true, std::string("c"), false});   // 5.5 [abc] 1
            report({});                                                           // 0 [] 0
            report({-5, 5, 2});                                                   // 2 [] 0
            report({true, true, true});                                           // 0 [] 3
            report({std::string("x"), std::string("y")});                         // 0 [xy] 0
            report({1.5, 1.5, 1.5, 0.25});                                        // 4.75 [] 0
            report(std::vector<Token>(500000, Token{1}));                         // 500000 [] 0

            // Which overload? A generic fallback catches bool before the int lambda does.
            auto who = overloaded{
                [](int)                { return "int"; },
                [](const std::string&) { return "string"; },
                [](auto)               { return "auto"; }
            };
            std::cout << std::visit(who, Token{true}) << " "              // auto (exact via deduction)
                      << std::visit(who, Token{7}) << " "                 // int  (non-template wins tie)
                      << std::visit(who, Token{1.5}) << " "               // auto
                      << std::visit(who, Token{std::string("s")}) << " "  // string
                      << std::visit(who, Token{false}) << "\n";           // auto
        }
      `,
      dry: { head: ['alternative', 'int lambda', 'string lambda', 'auto lambda', 'chosen'], rows: [['bool', 'promotion', 'not viable', 'exact (template)', 'auto'], ['int', 'exact', 'not viable', 'exact (template)', 'int (non-template wins tie)'], ['double', 'conversion', 'not viable', 'exact', 'auto'], ['std::string', 'not viable', 'exact (reference binding)', 'exact (copy, template)', 'string (non-template wins tie)']] },
      complexity: `<p>O(1) dispatch per token (jump table); O(n) total.</p>`,
      followUps: ['Make a missing case a readable error with a constrained <code>[](auto) requires false</code>-style trick or a static_assert in a generic lambda.', 'Visit two variants at once — how many combinations does <code>std::visit</code> generate?', 'Compare with a virtual <code>Token</code> hierarchy: memory, speed, extensibility.']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'Given <code>template&lt;class T&gt; T maxOf(T a, T b)</code>, what happens with <code>maxOf(3, 2.5)</code>?', options: ['Compile error: T deduced as both int and double', 'Returns 3 as int', 'Returns 3.0 as double', 'T becomes common_type&lt;int, double&gt;'], answer: 0, explain: 'Each argument deduces T independently and deduction never applies conversions. Use <code>maxOf&lt;double&gt;(3, 2.5)</code> or two type parameters.' },
    { q: 'With <code>void f(int)</code> and <code>template&lt;class T&gt; void f(T)</code>, which is called by <code>f(\'a\')</code>?', options: ['The template with T = char', 'f(int)', 'Ambiguous', 'Neither'], answer: 0, explain: 'char → int is a promotion; the template deduces T = char, an exact match. The "non-template wins" rule is only a tie-breaker for equally good conversions.' },
    { q: 'Why do template definitions normally live in header files?', options: ['The compiler needs the full definition at each point of use to instantiate it', 'Headers compile faster', 'The linker cannot handle templates', 'It is required by the ODR for all functions'], answer: 0, explain: 'Instantiation happens in the translation unit that uses the template. If only a declaration is visible, no code is generated and the link fails (unless you explicitly instantiate the needed types elsewhere).' },
    { q: 'Which is a <b>partial</b> specialization?', options: ['<code>template&lt;class T&gt; struct Hash&lt;T*&gt; { … };</code>', '<code>template&lt;&gt; struct Hash&lt;int&gt; { … };</code>', '<code>template struct Hash&lt;int&gt;;</code>', '<code>template&lt;class T&gt; void f&lt;T*&gt;(T*);</code>'], answer: 0, explain: 'A partial specialization still has template parameters. Option B is a full specialization, option C an explicit instantiation, option D is illegal (function templates cannot be partially specialized).' },
    { q: 'What does <code>sizeof...(Ts)</code> give for <code>f(1, "a", 2.0)</code> where <code>template&lt;class... Ts&gt; void f(Ts... args)</code>?', options: ['3, at compile time', 'The total byte size of the arguments', '3, computed at run time', 'It does not compile'], answer: 0, explain: '<code>sizeof...</code> counts pack elements and is a constant expression.' },
    { q: 'Which unary fold is <b>ill-formed</b> for an empty pack?', options: ['<code>(args + ...)</code>', '<code>(args &amp;&amp; ...)</code>', '<code>(args || ...)</code>', '<code>(f(args), ...)</code>'], answer: 0, explain: 'Only &amp;&amp; (true), || (false) and the comma operator (void()) have defined empty expansions. Use a binary fold <code>(args + ... + 0)</code>.' },
    { q: '<code>std::is_const_v&lt;const int&amp;&gt;</code> is…', options: ['false', 'true', 'ill-formed', 'implementation-defined'], answer: 0, explain: 'References themselves are never cv-qualified; the const applies to the referred-to int. Use <code>std::is_const_v&lt;std::remove_reference_t&lt;T&gt;&gt;</code>.' },
    { q: '<code>std::decay_t&lt;const int(&amp;)[3]&gt;</code> is…', options: ['<code>const int*</code>', '<code>int*</code>', '<code>int[3]</code>', '<code>const int[3]</code>'], answer: 0, explain: 'Remove the reference, then the array decays to a pointer to its (const) element type. Top-level cv removal does not touch the pointee.' },
    { q: 'What does SFINAE stand for and when does it apply?', options: ['Substitution Failure Is Not An Error — invalid types/expressions formed while substituting into a template\'s declaration remove that candidate', 'Static Function Inlining Not Always Enabled — an optimization rule', 'It turns all template errors into warnings', 'It applies to errors inside function bodies'], answer: 0, explain: 'Only the immediate context of substitution (signature, template parameter defaults) is covered. Errors in bodies are hard errors.' },
    { q: 'Why do two templates <code>template&lt;class T, class = enable_if_t&lt;A&gt;&gt; void f(T)</code> and <code>template&lt;class T, class = enable_if_t&lt;!A&gt;&gt; void f(T)</code> fail?', options: ['Default template arguments are not part of the signature, so they redeclare the same template with conflicting defaults', 'enable_if cannot be negated', 'The second always wins', 'Two templates cannot share a name'], answer: 0, explain: 'Use <code>enable_if_t&lt;A, int&gt; = 0</code> so the condition is part of the non-type parameter\'s type, making the templates distinct.' },
    { q: 'For <code>int</code>, with overloads constrained by <code>std::integral</code> and <code>std::signed_integral</code>, which is chosen?', options: ['The signed_integral one — it subsumes integral', 'The integral one — it was declared first', 'Ambiguous', 'Neither; constraints only reject'], answer: 0, explain: 'signed_integral is defined as integral&lt;T&gt; &amp;&amp; is_signed_v&lt;T&gt;, so it is more constrained and wins when both are satisfied.' },
    { q: 'In a requires-expression, what does <code>{ c.size() } -&gt; std::convertible_to&lt;std::size_t&gt;;</code> check?', options: ['That <code>c.size()</code> is a valid expression and its type satisfies <code>convertible_to&lt;…, std::size_t&gt;</code>', 'That size() returns exactly size_t', 'It calls size() at compile time', 'That size() is noexcept'], answer: 0, explain: 'A compound requirement checks validity and then applies the type-constraint to <code>decltype((expr))</code>. Add <code>noexcept</code> after the braces to also require non-throwing.' },
    { q: 'Two overloads are written as <code>requires std::is_integral_v&lt;T&gt;</code> and <code>requires std::is_integral_v&lt;T&gt; &amp;&amp; std::is_signed_v&lt;T&gt;</code>. Calling with <code>int</code> gives…', options: ['An ambiguity error, because the two is_integral_v atoms are not identical for subsumption', 'The second overload', 'The first overload', 'A substitution failure'], answer: 0, explain: 'Atomic constraints are identical only if they are the same expression from the same declaration. Wrap them in named concepts to get subsumption.' }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { q: 'What is a template and what does "instantiation" mean?', level: 'B', a: `<p>A template is a <b>compile-time recipe</b> for functions or classes with type (or value) placeholders. <b>Instantiation</b> is when the compiler substitutes concrete arguments (deduced or explicit) and generates real code: <code>maxOf&lt;int&gt;</code> and <code>maxOf&lt;double&gt;</code> are two separate functions in the binary. Nothing is generated for types never used, and class template members are instantiated only when used. Trade-off: zero run-time overhead and full inlining, paid for with compile time and binary size.</p>`, followUps: ['What is the difference between implicit and explicit instantiation?', 'What does <code>extern template</code> do?', 'How do linkers avoid duplicate instantiations across files?'] },
    { q: 'Why must templates usually be defined in headers? What are the alternatives?', level: 'B', a: `<p>Instantiation happens in the translation unit where the template is used, so that TU must see the full definition. If the body is in a .cpp file, other TUs only see the declaration, generate a call to <code>foo&lt;int&gt;</code>, and the linker finds no definition. Alternatives: (1) explicit instantiation definitions in the .cpp (<code>template int foo&lt;int&gt;(int);</code>) for a closed set of types, with <code>extern template</code> declarations in the header; (2) C++20 <b>modules</b>, where the exported template is compiled once into a module interface and importers instantiate from it.</p>`, followUps: ['Does putting templates in headers violate the ODR?', 'How do modules change build times for template-heavy code?'] },
    { q: 'Explain template argument deduction rules for <code>T</code>, <code>T&amp;</code>, and <code>T&amp;&amp;</code> parameters.', level: 'I', a: `<p><b>By value <code>T</code></b>: references ignored, top-level const/volatile dropped, arrays and functions decay to pointers (<code>const int[3]</code> → <code>const int*</code>). <b><code>T&amp;</code></b>: no decay, constness kept (<code>const int</code> lvalue → T = <code>const int</code>), arrays bind as <code>T = int[3]</code> (how <code>std::size</code> gets N); rvalues cannot bind unless T deduces const. <b><code>T&amp;&amp;</code> with deduced T</b> is a <b>forwarding reference</b>: lvalue argument → T = <code>X&amp;</code> and reference collapsing makes the parameter <code>X&amp;</code>; rvalue → T = <code>X</code>. Deduction never applies implicit conversions; conflicting deductions are an error; <code>std::type_identity_t&lt;T&gt;</code> blocks deduction for a parameter.</p>`, followUps: ['What is reference collapsing?', 'Why is <code>auto</code> deduction the same as template deduction except for braced lists?', 'How do you deduce from <code>std::initializer_list</code>?'] },
    { q: 'How does overload resolution treat function templates vs normal functions?', level: 'I', a: `<p>Each function template that deduces and substitutes successfully contributes one specialization to the candidate set. All candidates are ranked by implicit conversion sequences per argument (Exact &gt; Promotion &gt; Conversion &gt; User-defined &gt; Ellipsis). Only if two are equally good do tie-breakers apply: a <b>non-template beats a template</b>, then the <b>more specialized</b> template wins (partial ordering), then (C++20) the <b>more constrained</b> one. So <code>f('a')</code> picks <code>template f(T)</code> over <code>f(int)</code> because exact beats promotion. Explicit specializations of function templates are not candidates; they are used only if their primary template wins.</p>`, followUps: ['Why does <code>g(&amp;x)</code> ignore <code>template&lt;&gt; void g&lt;int*&gt;(int*)</code> when <code>template&lt;class T&gt; g(T*)</code> exists?', 'What does <code>f&lt;&gt;(x)</code> do?'] },
    { q: 'Full vs partial specialization: what is each for, and why can\'t function templates be partially specialized?', level: 'I', a: `<p><b>Full (explicit) specialization</b> replaces the implementation for one exact argument list: <code>template&lt;&gt; struct hash&lt;MyKey&gt;</code>. <b>Partial specialization</b> (class and variable templates only) handles a pattern: <code>Traits&lt;T*&gt;</code>, <code>Traits&lt;std::vector&lt;T&gt;&gt;</code>. Selection: exact full specialization, else the most specialized matching partial (ambiguity = error), else primary. Function templates have <b>overloading</b> instead, which already handles patterns (<code>f(T*)</code>), so the language never added function partial specialization; mixing specializations with overloads causes surprises. Rule: overload functions, specialize classes (or delegate from a function to a class template).</p>`, followUps: ['When may you specialize templates in namespace std?', 'Why is <code>std::vector&lt;bool&gt;</code> considered a mistake?'] },
    { q: 'What are variadic templates and fold expressions? Give a practical use.', level: 'I', a: `<p>A variadic template has a <b>parameter pack</b> (<code>class... Ts</code> / <code>Ts... args</code>) holding zero or more arguments. Packs are expanded with patterns (<code>f(g(args)...)</code>), counted with <code>sizeof...</code>, and since C++17 reduced with <b>fold expressions</b>: <code>(args + ... + 0)</code>, <code>(... &amp;&amp; preds)</code>, <code>((os &lt;&lt; args), ...)</code>. Practical uses: <code>make_unique</code>/<code>emplace_back</code> perfect-forwarding constructor arguments (<code>std::forward&lt;Args&gt;(args)...</code>), <code>std::tuple</code>/<code>variant</code>, type-safe logging/formatting, and the <code>overloaded{…}</code> visitor (<code>struct overloaded : Fs... { using Fs::operator()...; }</code>). Folds replace recursive "head + tail" templates and cut instantiations from O(N) to 1.</p>`, followUps: ['Which unary folds are valid for an empty pack?', 'Is evaluation order guaranteed in <code>g(f(args)...)</code>?', 'How would you index into a pack (pre-C++26)?'] },
    { q: 'What is perfect forwarding and how does it interact with variadic templates?', level: 'A', a: `<p>Perfect forwarding passes arguments on with their <b>original value category</b> (lvalue stays lvalue, rvalue stays rvalue) and constness. It needs a forwarding reference <code>template&lt;class... Args&gt; void emplace(Args&amp;&amp;... args)</code> and <code>std::forward&lt;Args&gt;(args)...</code>: for an lvalue, Args = <code>X&amp;</code> and forward returns an lvalue; for an rvalue, Args = <code>X</code> and forward casts to <code>X&amp;&amp;</code>. Pitfalls: forwarding the same argument twice (double move), braced initializer lists cannot be deduced, overloads with forwarding references are greedy (a forwarding constructor can hijack copying a non-const lvalue — constrain it), and bit-fields/overloaded function names cannot be forwarded directly.</p>`, followUps: ['Write <code>std::forward</code> yourself.', 'Why does <code>emplace_back({1, 2})</code> not compile?', 'How do you constrain a forwarding constructor?'] },
    { q: 'What are type traits and how are they implemented?', level: 'I', a: `<p>Compile-time queries and transformations on types in <code>&lt;type_traits&gt;</code>: <code>is_integral_v</code>, <code>is_trivially_copyable_v</code>, <code>is_base_of_v</code>, <code>remove_cvref_t</code>, <code>decay_t</code>, <code>conditional_t</code>, <code>common_type_t</code>. Most are class templates with a primary template and specializations: <code>template&lt;class T&gt; struct is_pointer : false_type {}; template&lt;class T&gt; struct is_pointer&lt;T*&gt; : true_type {};</code> (plus cv variants). Some need compiler intrinsics (<code>__is_trivially_copyable</code>, <code>__underlying_type</code>). They are used in <code>static_assert</code>, <code>if constexpr</code>, <code>enable_if</code>, concepts, and inside the STL (e.g. <code>vector</code> uses <code>is_nothrow_move_constructible</code> to decide move vs copy on reallocation).</p>`, followUps: ['Why is specializing <code>std::is_integral</code> undefined behavior?', 'What is <code>std::declval</code> and why is it never defined?'] },
    { q: 'Explain SFINAE with an example, including the "immediate context" limitation.', level: 'A', a: `<p>When substituting deduced arguments into a function template's declaration produces an invalid type or expression, the template is <b>removed from the candidate set</b> instead of causing an error. Example: <code>template&lt;class T&gt; auto len(const T&amp; c) -&gt; decltype(c.size()) { return c.size(); }</code> is silently dropped for <code>int</code>, letting another overload win. <code>std::enable_if_t&lt;cond, int&gt; = 0</code> creates such a failure deliberately. <b>Immediate context</b>: only the declaration (return type, parameter types, template parameter defaults, explicit specifier expressions) counts. If the failure happens while instantiating a function body (e.g. for <code>auto</code> return-type deduction) or inside a class template that the signature needed, it is a hard error.</p>`, followUps: ['How does the void_t detection idiom work?', 'Why did C++20 introduce concepts if SFINAE already worked?'] },
    { q: 'enable_if vs if constexpr vs concepts: when do you use each?', level: 'A', a: `<p><b>if constexpr</b> (C++17): branching <i>inside</i> one function body by a compile-time condition; best when the function's interface is the same and only the implementation differs. <b>Concepts</b> (C++20): when the <i>interface</i> must reject types or when you want different overloads chosen by properties; they give readable errors, document requirements, and order overloads by subsumption. <b>enable_if/SFINAE</b>: legacy code or pre-C++20 toolchains; also still seen in library-style "shall not participate in overload resolution" constraints. Rule of thumb: if callers should see "this does not accept X", use concepts; if it is an internal detail, use <code>if constexpr</code>.</p>`, followUps: ['Can <code>if constexpr</code> be used outside templates? What happens to the discarded branch then?', 'How do you write an exhaustive compile-time branch with a final static_assert?'] },
    { q: 'What are C++20 concepts? Show the four syntaxes and a requires-expression.', level: 'I', a: `<p>A concept is a named predicate on template arguments: <code>template&lt;class T&gt; concept Number = std::integral&lt;T&gt; || std::floating_point&lt;T&gt;;</code>. Syntaxes: <code>template&lt;Number T&gt; void f(T)</code>; <code>template&lt;class T&gt; requires Number&lt;T&gt; void f(T)</code>; trailing <code>void f(T) requires Number&lt;T&gt;</code>; abbreviated <code>void f(Number auto x)</code>. A requires-expression lists required operations: simple (<code>a + b;</code>), type (<code>typename T::value_type;</code>), compound (<code>{ c.size() } -&gt; std::convertible_to&lt;std::size_t&gt;;</code>, optionally <code>noexcept</code>), nested (<code>requires sizeof(T) &lt;= 8;</code>). Concepts are checked before the body is instantiated, so misuse yields short diagnostics naming the failed requirement.</p>`, followUps: ['What does <code>requires requires</code> mean?', 'Can a concept check semantics (e.g. that &lt; is a strict weak order)?'] },
    { q: 'Explain constraint subsumption. When does it fail to order overloads?', level: 'E', a: `<p>When two constrained templates are both viable and otherwise equivalent, the compiler normalizes each constraint into conjunctions/disjunctions of <b>atomic constraints</b> (expanding named concepts) and checks whether one implies the other. <code>std::random_access_iterator</code> is built from <code>bidirectional_iterator &amp;&amp; …</code>, so it subsumes <code>std::input_iterator</code> and wins. It fails when (1) the "same" condition is written as separate raw expressions (<code>requires std::is_integral_v&lt;T&gt;</code> in two places are different atoms → ambiguous); (2) the function parameter types differ (<code>T</code> vs <code>const T&amp;</code>) so the templates are not equivalent and ordering falls back to partial ordering; (3) constraints overlap without one implying the other (<code>Hashable</code> vs <code>Printable</code> both satisfied → ambiguous).</p>`, followUps: ['Why are atomic constraints compared by identity rather than meaning?', 'How would you break an ambiguity between two unrelated concepts?'] },
    { q: 'What is two-phase name lookup, and why do you need <code>typename</code> and <code>template</code> keywords inside templates?', level: 'A', a: `<p>When a template is <b>defined</b>, non-dependent names are looked up and checked (phase 1). Names that depend on template parameters are looked up only at <b>instantiation</b> (phase 2), with ADL at the point of instantiation. Because the parser cannot know what a dependent name like <code>T::value_type</code> is in phase 1, it assumes "a value"; you write <code>typename T::value_type</code> to say it is a type, and <code>x.template get&lt;0&gt;()</code> to say <code>get</code> is a template so <code>&lt;</code> opens an argument list. Related trap: members of a dependent base class are not found by unqualified lookup — write <code>this-&gt;member</code>. (C++20 relaxed <code>typename</code> in some contexts where only a type can appear.)</p>`, followUps: ['Show a dependent base class bug and its fix.', 'What did MSVC\'s old "permissive" mode do differently?'] },
    { q: 'Templates make code fast but builds slow and binaries big. How do you manage that in a large codebase?', level: 'E', a: `<p>Measure first: Clang <code>-ftime-trace</code> or GCC <code>-ftime-report</code>, ClangBuildAnalyzer, binary-size tools (bloaty). Techniques: (1) <b>thin templates</b> — move type-independent logic into non-template functions; (2) <b>explicit instantiation</b> + <code>extern template</code> for commonly used arguments so they are compiled once; (3) replace recursive metaprograms with folds, <code>if constexpr</code>, and compiler built-ins; (4) use type erasure (<code>std::function</code>, <code>std::any</code>, hand-written) at API boundaries where run-time dispatch is acceptable; (5) precompiled headers and <b>C++20 modules</b>; (6) keep heavy headers out of widely included headers (pimpl, forward declarations); (7) rely on linker identical-code folding (<code>--icf=all</code>) for duplicate instantiations. The trade-off: templates give inlining and static dispatch; erasure gives build-time and binary-size savings — choose per layer.</p>`, followUps: ['When would you prefer <code>std::function</code> over a template parameter for a callback?', 'How does ICF interact with function pointer identity?'] }
  );

  registerModule({
    id: 'cpp09',
    title: 'Templates, SFINAE & Concepts',
    intro: `<p>Templates are how C++ writes code <b>once</b> and runs it at full speed for <b>every</b> type: <code>std::vector</code>, <code>std::sort</code>, <code>std::unique_ptr</code>, <code>std::format</code> and the whole STL are templates. In this module you learn to think like the compiler: how it <b>deduces</b> T from a call, <b>instantiates</b> a fresh function per type, picks a <b>specialization</b>, expands a <b>parameter pack</b>, asks <b>type traits</b> questions, silently drops candidates with <b>SFINAE</b>, and — the modern way — checks <b>C++20 concepts</b> before anything else.</p>
      <p>Every topic has a step-by-step visualizer: watch instantiations appear per type, watch overload candidates get eliminated row by row, watch a pack peel off one argument at a time, and watch a concept check each requirement. Interviews at trading firms, game studios, compilers and infrastructure teams love "which overload is chosen?" and "write a generic X" questions; by the end you can answer them by applying rules, not by guessing.</p>`,
    goals: [
      'Write function and class templates, predict what T deduces to, and fix deduction conflicts',
      'Predict which overload, template, or specialization the compiler chooses — and explain the ranking and tie-breakers',
      'Write variadic templates with pack expansion and all four fold-expression forms, including perfect forwarding',
      'Use and build type traits; branch at compile time with <code>if constexpr</code> and <code>std::conditional_t</code>',
      'Read and write SFINAE / <code>enable_if</code> / <code>void_t</code> code found in real libraries',
      'Design C++20 concepts with requires-expressions and use subsumption to order overloads cleanly'
    ],
    prereqs: `<p>C++ 5 (Advanced OOP: operators, rule of 3/5/0), C++ 6 (RAII &amp; smart pointers), C++ 7–8 (STL containers, iterators and algorithms). Comfort with references, <code>const</code>, and basic overloading from C++ 2–3.</p>`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
