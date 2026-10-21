(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var esc = H.esc;

  /* =====================================================================
     Shared helpers for this module's visualizers.
     A tiny, SAFE JavaScript expression evaluator (no eval, no Function):
     it parses literals + operators, then computes every operation with the
     REAL JavaScript operator (so results are always truthful) while
     recording the coercion rules JavaScript applied along the way.
     ===================================================================== */

  // Print a value the way a developer console would.
  function show(v) {
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v);
    if (typeof v === 'bigint') return String(v) + 'n';
    if (typeof v === 'symbol') return v.toString();
    if (typeof v === 'function') return 'ƒ ' + (v.name || 'anonymous') + '()';
    if (Array.isArray(v)) return '[' + v.map(show).join(', ') + ']';
    if (v === null) return 'null';
    if (typeof v === 'object') {
      var ks = Object.keys(v);
      return ks.length ? '{ ' + ks.map(function (k) { return k + ': ' + show(v[k]); }).join(', ') + ' }' : '{}';
    }
    return String(v);
  }
  // typeof, but with null and arrays called out.
  function kind(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'object (array)';
    return typeof v;
  }
  function isPrim(v) { return v === null || (typeof v !== 'object' && typeof v !== 'function'); }

  function tokenize(src) {
    var s = String(src), toks = [], i = 0;
    var re = /\s*(?:(0[xX][0-9a-fA-F]+n?|0[bB][01]+n?|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?n?)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|([A-Za-z_$][\w$]*)|(===|!==|==|!=|<=|>=|\*\*|&&|\|\||\?\?|[-+*\/%<>!()\[\]{},]))/y;
    while (i < s.length) {
      if (/^\s*$/.test(s.slice(i))) break;
      re.lastIndex = i;
      var m = re.exec(s);
      if (!m) throw new Error('Cannot read "' + s.slice(i).trim().slice(0, 12) + '" — use numbers, \'strings\', true/false/null/undefined/NaN/Infinity, [], {} and operators');
      i = re.lastIndex;
      if (m[1] !== undefined) {
        var txt = m[1];
        if (/n$/.test(txt)) {
          if (/[.eE]/.test(txt) && !/^0[xX]/.test(txt)) throw new Error('A BigInt literal must be a whole number, e.g. 10n');
          toks.push({ t: 'lit', v: BigInt(txt.slice(0, -1)) });
        } else toks.push({ t: 'lit', v: Number(txt) });
      } else if (m[2] !== undefined) {
        var body = m[2].slice(1, -1).replace(/\\(.)/g, function (_, c) { return c === 'n' ? '\n' : c === 't' ? '\t' : c; });
        toks.push({ t: 'lit', v: body });
      } else if (m[3] !== undefined) {
        var w = m[3];
        var known = { 'true': true, 'false': false, 'null': null, 'undefined': undefined, 'NaN': NaN, 'Infinity': Infinity };
        if (w === 'typeof') toks.push({ t: 'op', v: 'typeof' });
        else if (Object.prototype.hasOwnProperty.call(known, w)) toks.push({ t: 'lit', v: known[w] });
        else throw new Error('Unknown name "' + w + '" — this mini-evaluator only understands literal values (no variables)');
      } else toks.push({ t: 'op', v: m[4] });
      if (toks.length > 80) throw new Error('Expression too long for the demo (max ~80 tokens)');
    }
    if (!toks.length) throw new Error('Type an expression, e.g.  "5" - 2 + "1"');
    return toks;
  }

  function parse(toks) {
    var p = 0;
    var LEVELS = [['??', '||'], ['&&'], ['==', '!=', '===', '!=='], ['<', '>', '<=', '>='], ['+', '-'], ['*', '/', '%']];
    function isOp(v) { var t = toks[p]; return !!t && t.t === 'op' && t.v === v; }
    function eat(v) { if (!isOp(v)) throw new Error('Expected "' + v + '"' + (toks[p] ? ' near token ' + (p + 1) : ' at the end')); p++; }
    function bin(l) {
      if (l === LEVELS.length) return expo();
      var left = bin(l + 1);
      while (toks[p] && toks[p].t === 'op' && LEVELS[l].indexOf(toks[p].v) >= 0) {
        var op = toks[p++].v, right = bin(l + 1);
        var logic = function (x) { return x.k === 'bin' && !x.par && (x.op === '||' || x.op === '&&'); };
        if ((op === '??' && (logic(left) || logic(right))) || (op !== '??' && left.k === 'bin' && left.op === '??' && !left.par) || (op === '??' && left.k === 'bin' && left.op === '&&'))
          throw new Error('SyntaxError in real JS: ?? cannot be mixed with || or && without parentheses — write (a || b) ?? c');
        left = { k: 'bin', op: op, l: left, r: right };
      }
      return left;
    }
    function expo() {
      var base = unary();
      if (isOp('**')) {
        if (base.k === 'un' && !base.par) throw new Error('SyntaxError in real JS: a unary operator cannot sit right before ** — write (-2) ** 2');
        p++;
        return { k: 'bin', op: '**', l: base, r: expo() };   // right-associative
      }
      return base;
    }
    function unary() {
      var t = toks[p];
      if (t && t.t === 'op' && (t.v === '!' || t.v === '-' || t.v === '+' || t.v === 'typeof')) { p++; return { k: 'un', op: t.v, e: unary() }; }
      return primary();
    }
    function primary() {
      var t = toks[p];
      if (!t) throw new Error('The expression ends too early');
      if (t.t === 'lit') { p++; return { k: 'lit', v: t.v }; }
      if (isOp('(')) { p++; var e = bin(0); eat(')'); e.par = true; return e; }
      if (isOp('[')) {
        p++; var items = [];
        while (!isOp(']')) { items.push(bin(0)); if (!isOp(']')) eat(','); }
        p++; return { k: 'arr', items: items };
      }
      if (isOp('{')) { p++; eat('}'); return { k: 'obj' }; }
      throw new Error('Unexpected "' + t.v + '"');
    }
    var root = bin(0);
    if (p < toks.length) throw new Error('Unexpected "' + toks[p].v + '" — check your operators/parentheses');
    return root;
  }

  // Fully parenthesised form: makes precedence visible.
  function srcOf(n) {
    if (n.k === 'lit') return show(n.v);
    if (n.k === 'arr') return '[' + n.items.map(srcOf).join(', ') + ']';
    if (n.k === 'obj') return '{}';
    if (n.k === 'un') return n.op === 'typeof' ? '(typeof ' + srcOf(n.e) + ')' : '(' + n.op + srcOf(n.e) + ')';
    return '(' + srcOf(n.l) + ' ' + n.op + ' ' + srcOf(n.r) + ')';
  }

  function JsErr(msg) { this.msg = msg; }
  function attempt(fn) { try { return fn(); } catch (e) { throw new JsErr(e.name + ': ' + e.message); } }

  var NATIVE = {
    '+': function (a, b) { return a + b; }, '-': function (a, b) { return a - b; }, '*': function (a, b) { return a * b; },
    '/': function (a, b) { return a / b; }, '%': function (a, b) { return a % b; }, '**': function (a, b) { return a ** b; },
    '==': function (a, b) { return a == b; }, '!=': function (a, b) { return a != b; },   // eslint-disable-line eqeqeq
    '===': function (a, b) { return a === b; }, '!==': function (a, b) { return a !== b; },
    '<': function (a, b) { return a < b; }, '>': function (a, b) { return a > b; }, '<=': function (a, b) { return a <= b; }, '>=': function (a, b) { return a >= b; }
  };

  function toPrim(v, S) {
    if (isPrim(v)) return v;
    var p = String(v);
    S.push(['ToPrimitive(' + show(v) + ')', 'an object must become a primitive first: valueOf() just returns the object itself (useless), so toString() is used' + (Array.isArray(v) ? ' — for arrays that means join(",")' : ' — plain objects give "[object Object]"'), show(p)]);
    return p;
  }
  function numWhy(v) {
    if (typeof v === 'string') return v.trim() === '' ? 'an empty / blank string becomes 0' : (isNaN(Number(v)) ? 'the text is not a clean number → NaN' : 'the text is a clean number → that number');
    if (v === true) return 'true becomes 1';
    if (v === false) return 'false becomes 0';
    if (v === null) return 'null becomes 0';
    if (v === undefined) return 'undefined becomes NaN';
    return 'already a number';
  }
  function toNum(v, S) {
    if (typeof v === 'number' || typeof v === 'bigint') return v;
    var n = Number(v);
    S.push(['ToNumber(' + show(v) + ')', numWhy(v), show(n)]);
    return n;
  }
  function tname(v) { return v === null ? 'null' : typeof v === 'function' ? 'object' : typeof v; }

  function loose(x, y, S, d) {
    var row = show(x) + ' == ' + show(y);
    if (d > 8) return;
    var tx = tname(x), ty = tname(y);
    if (tx === ty) { S.push([row, 'same type → works exactly like ===' + (tx === 'object' ? ' (objects: are they the very same object in memory?)' : tx === 'number' ? ' (NaN never equals anything)' : ''), show(x === y)]); return; }
    if (x == null && y == null) { S.push([row, 'special rule: null and undefined are loosely equal to each other', 'true']); return; }   // eslint-disable-line eqeqeq
    if (x == null || y == null) { S.push([row, 'null / undefined are only == to each other — they are NOT converted to 0', 'false']); return; }   // eslint-disable-line eqeqeq
    if (tx === 'number' && ty === 'string') { var n1 = Number(y); S.push([row, 'number vs string → turn the string into a number', show(x) + ' == ' + show(n1)]); return loose(x, n1, S, d + 1); }
    if (tx === 'string' && ty === 'number') { var n2 = Number(x); S.push([row, 'string vs number → turn the string into a number', show(n2) + ' == ' + show(y)]); return loose(n2, y, S, d + 1); }
    if ((tx === 'bigint' && ty === 'string') || (tx === 'string' && ty === 'bigint')) {
      var str = tx === 'string' ? x : y, big;
      try { big = BigInt(str); } catch (e) { S.push([row, 'the string cannot become a BigInt → not equal', 'false']); return; }
      S.push([row, 'bigint vs string → parse the string as a BigInt', tx === 'string' ? show(big) + ' == ' + show(y) : show(x) + ' == ' + show(big)]);
      return tx === 'string' ? loose(big, y, S, d + 1) : loose(x, big, S, d + 1);
    }
    if (tx === 'boolean') { S.push([row, 'a boolean is turned into a number first (true → 1, false → 0)', show(Number(x)) + ' == ' + show(y)]); return loose(Number(x), y, S, d + 1); }
    if (ty === 'boolean') { S.push([row, 'a boolean is turned into a number first (true → 1, false → 0)', show(x) + ' == ' + show(Number(y))]); return loose(x, Number(y), S, d + 1); }
    if (tx === 'object') { var p1 = toPrim(x, S); return loose(p1, y, S, d + 1); }
    if (ty === 'object') { var p2 = toPrim(y, S); return loose(x, p2, S, d + 1); }
    if ((tx === 'bigint' && ty === 'number') || (tx === 'number' && ty === 'bigint')) { S.push([row, 'bigint vs number → compare the mathematical values', show(x == y)]); return; }   // eslint-disable-line eqeqeq
    S.push([row, 'no rule makes them equal', 'false']);
  }

  function evalNode(n, S) {
    if (n.k === 'lit') return n.v;
    if (n.k === 'arr') return n.items.map(function (x) { return evalNode(x, S); });
    if (n.k === 'obj') return {};
    var v, r;
    if (n.k === 'un') {
      v = evalNode(n.e, S);
      if (n.op === 'typeof') { r = typeof v; S.push(['typeof ' + show(v), v === null ? 'typeof null is "object" — a bug from 1995 kept forever for compatibility' : 'ask for the type tag (always returns a string)', show(r)]); return r; }
      if (n.op === '!') { r = !v; S.push(['!' + show(v), show(v) + ' is ' + (v ? 'truthy' : 'falsy') + ', so ! flips it', show(r)]); return r; }
      var pv = toPrim(v, S);
      if (typeof pv !== 'bigint') pv = toNum(pv, S);
      r = attempt(function () { return n.op === '-' ? -pv : +pv; });
      S.push([n.op + show(v), n.op === '+' ? 'unary + is the shortest way to say Number(x)' : 'negate the number', show(r)]);
      return r;
    }
    var op = n.op, a = evalNode(n.l, S), b;
    if (op === '&&' || op === '||' || op === '??') {
      var stopNow = op === '&&' ? !a : op === '||' ? !!a : (a !== null && a !== undefined);
      if (stopNow) {
        S.push([show(a) + ' ' + op + ' …', op === '??' ? 'left is not null/undefined → keep the LEFT value; the right side never runs' : 'left is ' + (a ? 'truthy' : 'falsy') + ' → short-circuit: return the LEFT value itself; the right side never runs', show(a)]);
        return a;
      }
      b = evalNode(n.r, S);
      S.push([show(a) + ' ' + op + ' ' + show(b), op === '??' ? 'left is null/undefined → result is the RIGHT value' : 'left is ' + (a ? 'truthy' : 'falsy') + ' → result is the RIGHT value (not true/false!)', show(b)]);
      return b;
    }
    b = evalNode(n.r, S);
    var row = show(a) + ' ' + op + ' ' + show(b);
    if (op === '+') {
      var pa = toPrim(a, S), pb = toPrim(b, S);
      if (typeof pa === 'string' || typeof pb === 'string') S.push([show(pa) + ' + ' + show(pb), 'at least one side is a string → + means JOIN text; the other side becomes a string', '']);
      else if (typeof pa !== 'bigint' || typeof pb !== 'bigint') { if (typeof pa !== 'bigint') toNum(pa, S); if (typeof pb !== 'bigint') toNum(pb, S); }
    } else if (op === '-' || op === '*' || op === '/' || op === '%' || op === '**') {
      var qa = toPrim(a, S), qb = toPrim(b, S);
      if (typeof qa !== 'bigint') toNum(qa, S);
      if (typeof qb !== 'bigint') toNum(qb, S);
    } else if (op === '===' || op === '!==') {
      S.push(['types?', tname(a) === tname(b) ? 'same type (' + tname(a) + ') → compare values, no conversion' : 'different types (' + tname(a) + ' vs ' + tname(b) + ') → NOT equal, no conversion at all', '']);
    } else if (op === '==' || op === '!=') {
      loose(a, b, S, 0);
    } else {
      var ra = toPrim(a, S), rb = toPrim(b, S);
      if (typeof ra === 'string' && typeof rb === 'string') S.push(['both strings', 'compare character codes left to right, like a dictionary ("10" < "9" because "1" < "9")', '']);
      else { if (typeof ra === 'string' || typeof ra === 'boolean' || ra == null) toNum(ra, S); if (typeof rb === 'string' || typeof rb === 'boolean' || rb == null) toNum(rb, S); }   // eslint-disable-line eqeqeq
    }
    r = attempt(function () { return NATIVE[op](a, b); });
    S.push([row, op === '+' ? 'final + ' : 'apply ' + op, show(r)]);
    return r;
  }

  // Evaluate a source string → { ast, steps, value, error }
  function runExpr(text) {
    var ast = parse(tokenize(text)), S = [], out = { ast: ast, steps: S };
    try { out.value = evalNode(ast, S); } catch (e) {
      if (e instanceof JsErr) { out.error = e.msg; S.push(['error', 'JavaScript throws here', e.msg]); } else throw e;
    }
    return out;
  }

  // Parse a single "value" for the typeof/truthy visualizers (adds Symbol and functions).
  function readValue(text) {
    var t = String(text).trim();
    var sm = /^Symbol\((?:"([^"]*)"|'([^']*)')?\)$/.exec(t);
    if (sm) return { v: Symbol(sm[1] || sm[2] || ''), src: t };
    if (/^\(\s*\)\s*=>/.test(t) || /^function\s*\w*\s*\(\s*\)\s*\{.*\}$/.test(t)) return { v: function demoFn() { return 1; }, src: t };
    var r = runExpr(t);
    if (r.error) throw new Error(t + ' throws ' + r.error);
    return { v: r.value, src: t };
  }
  function splitList(input, sep, max) {
    var items = String(input || '').split(sep).map(function (x) { return x.trim(); }).filter(function (x) { return x.length; });
    if (!items.length) throw new Error('Enter values separated by "' + sep + '"');
    if (items.length > max) throw new Error('Use at most ' + max + ' values');
    return items;
  }

  // Frames for the "coercion stepper" visualizer (operators topic).
  function exprFrames(input) {
    var text = String(input || '').trim();
    if (text.length > 140) throw new Error('Keep the expression under 140 characters');
    var R = runExpr(text), frames = [];
    frames.push({ narr: 'We will evaluate <code>' + esc(text) + '</code> exactly like a JavaScript engine: first figure out the grouping (precedence), then run each operator, writing down every hidden conversion (coercion).', parts: [
      { type: 'code', label: 'Expression', lang: 'js', code: text, hl: { 1: 'cur' } },
      { type: 'text', html: '<span class="c-m">Tip: try </span><code>[] + {}</code>, <code>"5" - 2 + "1"</code>, <code>null == 0</code>, <code>[] == ![]</code>, <code>0 || "x" ?? "y"</code> is a SyntaxError in real JS — use parentheses.' }
    ] });
    frames.push({ narr: 'Precedence decides the grouping before anything runs. <b>**</b> binds tightest, then <b>* / %</b>, then <b>+ -</b>, then comparisons, then equality, then <b>&amp;&amp;</b>, then <b>|| ??</b>. Same level → left to right (except ** which goes right to left). Here is the same expression with every group made explicit:', parts: [
      { type: 'code', label: 'Fully parenthesised (what the engine really sees)', lang: 'js', code: srcOf(R.ast), hl: { 1: 'sel' } }
    ] });
    for (var i = 0; i < R.steps.length; i++) {
      var st = R.steps[i], hl = {};
      hl[i] = st[0] === 'error' ? 'bad' : 'cur';
      frames.push({ narr: 'Step ' + (i + 1) + ': <code>' + esc(st[0]) + '</code> — ' + esc(st[1]) + (st[2] !== '' ? ' → <b>' + esc(st[2]) + '</b>' : '') + '.', parts: [
        { type: 'table', label: 'Coercion log', columns: ['#', 'doing', 'rule JavaScript applies', 'value'], rows: R.steps.slice(0, i + 1).map(function (s, j) { return [j + 1, s[0], s[1], s[2]]; }), hl: hl }
      ] });
    }
    if (R.error) {
      frames.push({ narr: '<span class="c-r">The expression throws <b>' + esc(R.error) + '</b>.</span> Real code would stop here unless wrapped in try/catch.', parts: [{ type: 'vars', label: 'Outcome', vals: { thrown: R.error }, hl: { thrown: 'bad' } }] });
    } else {
      var v = R.value;
      frames.push({ narr: 'Final value: <b>' + esc(show(v)) + '</b> (typeof → "' + esc(typeof v) + '"). In an <code>if</code> it would count as <b>' + (v ? 'truthy' : 'falsy') + '</b>.', parts: [
        { type: 'vars', label: 'Result', vals: { value: show(v), 'typeof': typeof v, 'Boolean(value)': String(!!v) }, hl: { value: 'ok' } }
      ] });
    }
    return frames;
  }

  /* =====================================================================
     TOPIC 1 — Running JavaScript
     ===================================================================== */
  topics.push({
    title: 'Running JavaScript: Browser Console, Node.js & Your First Program',
    analogy: `<p>Think of JavaScript code as a <b>recipe</b>. A recipe on paper does nothing — you need a <b>chef</b> to read it and cook. The <b>JavaScript engine</b> (V8 in Chrome and Node, SpiderMonkey in Firefox, JavaScriptCore in Safari) is the chef. But a chef also needs a <b>kitchen</b> with tools: the <b>runtime</b>. A browser is a kitchen with a window display (the web page, buttons, <code>document</code>); Node.js is a back-office kitchen with filing cabinets (files, network, <code>process</code>). Same chef, same recipe language — different tools on the counter.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> JavaScript (JS) is the programming language of the web, and today it also runs servers, command-line tools, mobile and desktop apps. You can run it in two places right now, with nothing to install except what you probably already have:</p>
      <ol>
        <li><b>The browser console.</b> Open any page, press <kbd>F12</kbd> (or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>J</kbd> on Windows/Linux, <kbd>Cmd</kbd>+<kbd>Option</kbd>+<kbd>J</kbd> on Mac), click <b>Console</b>, type <code>2 + 3</code> and press Enter. The console is a <b>REPL</b>: Read a line, Evaluate it, Print the result, Loop.</li>
        <li><b>Node.js in a terminal.</b> Install Node (an LTS version such as 22 or 24), save code in <code>hello.js</code>, then run <code>node hello.js</code>. Typing just <code>node</code> opens a REPL like the browser console.</li>
      </ol>
      <p>🔵 <b>How a program is built.</b> A JS program is a list of <b>statements</b> (instructions) run top to bottom. Each statement usually ends with a semicolon <code>;</code>. Text after <code>//</code> is a one-line <b>comment</b> (ignored by the engine); <code>/* … */</code> is a multi-line comment. JavaScript is <b>case-sensitive</b>: <code>console</code> works, <code>Console</code> is a different (non-existent) name. <code>console.log(a, b, …)</code> prints its arguments separated by spaces — it is your best friend for learning and debugging.</p>
      ${H.table(['You type', 'Where', 'What you see'], [['<code>2 + 3</code>', 'console / REPL', '<code>5</code> (the REPL echoes the value of the expression)'], ['<code>console.log("hi")</code>', 'console / REPL', '<code>hi</code> and then <code>undefined</code> (log itself returns nothing)'], ['<code>console.log("hi")</code>', '<code>node hello.js</code>', 'just <code>hi</code> — files do not echo values'], ['<code>Console.log("hi")</code>', 'anywhere', H.c('r', 'ReferenceError: Console is not defined')]])}
      <p>🔵 <b>Semicolons and ASI.</b> If you leave a semicolon out, the engine tries <b>Automatic Semicolon Insertion</b> (ASI): it adds one at a line break when the next line cannot continue the statement. It mostly works, but it has traps (see the deep dive), so beginners should simply <b>write semicolons</b> — or use a formatter like Prettier that handles it for you.</p>
      <p>🔵 <b>Strict mode.</b> Putting <code>"use strict";</code> at the top of a file (or using ES modules / classes, which are strict automatically) turns some silent mistakes into loud errors — for example assigning to an undeclared variable throws instead of quietly creating a global. Modern code is almost always strict.</p>`,
    clues: [
      '"What will the console print?" — remember the REPL echoes the expression value; <code>console.log</code> returns <code>undefined</code>',
      '"Why does this work in the browser but crash in Node?" → a browser-only API such as <code>window</code>, <code>document</code>, <code>alert</code> (or Node-only <code>process</code>, <code>require</code>, <code>fs</code>)',
      '"A function returns undefined even though I wrote the value" → ASI after a bare <code>return</code> line break',
      '"Where does JavaScript run?" / "engine vs runtime" → V8/SpiderMonkey/JavaScriptCore vs browser/Node/Deno/Bun',
      '"Code that works without semicolons suddenly breaks when a line starts with ( or [" → ASI did not insert a semicolon',
      '"Check whether we are in Node or the browser without crashing" → <code>typeof window !== "undefined"</code> / <code>globalThis</code>'
    ],
    code: [{ lang: 'js', run: true, title: 'Your first program (runs in the browser and in Node)', code: `
// hello.js — run with:  node hello.js   (or press ▶ Run here)
"use strict";                         // opt into strict mode: catches silent mistakes

console.log("Hello, JavaScript!");    // a statement; prints a line of text
console.log("2 + 3 =", 2 + 3);        // several arguments are printed separated by a space

/* A multi-line comment:
   the engine skips everything in here. */
const year = 2026;                     // store a value in a named box (variable)
console.log(\`It is \${year}. JS is \${year - 1995} years old.\`);   // template literal

// Where are we running? typeof never crashes, even for names that do not exist.
const where = typeof window !== "undefined" ? "a browser"
            : typeof process !== "undefined" ? "Node.js"
            : "some other runtime";
console.log("This code is running in " + where);

console.error("console.error is for problems (shown in red in DevTools).");
` }],
    codeTitle: ['Hello, JavaScript'],
    viz: {
      title: 'From source code to output: engine + runtime',
      gen: function () {
        var nodes = [
          { id: 'SRC', label: 'hello.js / console line', x: 14, y: 30, shape: 'box' },
          { id: 'BR', label: 'Browser (Chrome)', x: 46, y: 10, shape: 'box' },
          { id: 'ND', label: 'Node.js (terminal)', x: 46, y: 50, shape: 'box' },
          { id: 'V8', label: 'V8 engine: parse → run', x: 76, y: 30, shape: 'box' },
          { id: 'DOM', label: 'DevTools Console', x: 92, y: 10, shape: 'box' },
          { id: 'OUT', label: 'stdout (terminal)', x: 92, y: 50, shape: 'box' }
        ];
        var E = [['SRC', 'BR', 'paste / <script>'], ['SRC', 'ND', 'node hello.js'], ['BR', 'V8'], ['ND', 'V8'], ['V8', 'DOM', 'log'], ['V8', 'OUT', 'log']];
        function g(hl, ehl, tags) { return { type: 'graph', directed: true, height: 60, nodes: nodes, edges: E, hl: hl, ehl: ehl, tags: tags || {} }; }
        var prog = 'console.log("Hello");\nconsole.log(2 + 3);\nConsole.log("oops");';
        return [
          { narr: 'You write <b>source code</b> — plain text. Text alone does nothing until something reads and runs it.', parts: [g({ SRC: 'cur' }, {}), { type: 'code', lang: 'js', label: 'source', code: prog }] },
          { narr: 'Path 1: paste it into the <b>browser console</b> (F12 → Console) or load it with a script tag. The browser is a <b>runtime</b>: it gives JS extra tools like <code>document</code>, <code>window</code>, <code>fetch</code>.', parts: [g({ SRC: 'done', BR: 'cur' }, { 'SRC-BR': 'ok' }, { BR: 'window, document' })] },
          { narr: 'Path 2: save it as <code>hello.js</code> and run <code>node hello.js</code>. Node is a different runtime: it gives <code>process</code>, <code>fs</code> (files), <code>http</code> — but no <code>document</code>.', parts: [g({ SRC: 'done', ND: 'cur' }, { 'SRC-ND': 'ok' }, { ND: 'process, fs' })] },
          { narr: 'Both runtimes hand the text to the same kind of <b>engine</b> (Chrome and Node both use <b>V8</b>). The engine first <b>parses</b>: it checks the grammar. A grammar mistake (SyntaxError) stops the whole file before line 1 runs.', parts: [g({ V8: 'cur' }, { 'BR-V8': 'ok', 'ND-V8': 'ok' }, { V8: 'parse OK' })] },
          { narr: 'Now it <b>executes</b> statements top to bottom. Line 1 prints <b>Hello</b>.', parts: [g({ V8: 'cur', DOM: 'ok', OUT: 'ok' }, { 'V8-DOM': 'ok', 'V8-OUT': 'ok' }), { type: 'code', lang: 'js', label: 'running', code: prog, hl: { 1: 'cur' } }, { type: 'queue', label: 'output so far', items: ['Hello'] }] },
          { narr: 'Line 2 evaluates <code>2 + 3</code> first, then logs <b>5</b>.', parts: [{ type: 'code', lang: 'js', label: 'running', code: prog, hl: { 1: 'done', 2: 'cur' } }, { type: 'vars', vals: { '2 + 3': 5 }, hl: { '2 + 3': 'ok' } }, { type: 'queue', label: 'output so far', items: ['Hello', '5'] }] },
          { narr: 'Line 3 is grammatically fine, so parsing passed — but at <b>run time</b> the name <code>Console</code> (capital C) does not exist. JS is case-sensitive → <span class="c-r">ReferenceError</span>. Lines before it already ran.', parts: [{ type: 'code', lang: 'js', label: 'running', code: prog, hl: { 1: 'done', 2: 'done', 3: 'bad' } }, { type: 'queue', label: 'output', items: ['Hello', '5', 'ReferenceError: Console is not defined'], hl: { 2: 'bad' } }] },
          { narr: 'Big picture: <b>engine</b> = understands the language (same everywhere). <b>Runtime</b> = engine + extra APIs + an event loop. Browser, Node, Deno and Bun are runtimes. Knowing which APIs belong to which runtime prevents "works on my machine" bugs.', parts: [g({ V8: 'sel', BR: 'ok', ND: 'ok' }, {}, { BR: 'DOM APIs', ND: 'OS APIs', V8: 'language core' })] }
        ];
      }
    },
    examples: [
      { title: 'REPL echo vs console.log', html: `<p>In the console, typing <code>7 * 6</code> shows <code>42</code>: the REPL prints the value of the last expression. Typing <code>console.log(7 * 6)</code> shows <code>42</code> <b>and then</b> <code>undefined</code> — the first is what log printed, the second is log's own return value, echoed by the REPL. In a file run with <code>node</code>, nothing is echoed: only <code>console.log</code> output appears.</p>`, code: { lang: 'js', run: true, code: `
const result = console.log("printing...");   // log prints, then returns undefined
console.log("log returned:", String(result)); // "log returned: undefined"
` } },
      { title: 'Predict the output: the ASI return trap', html: `<p>What does <code>getConfig()</code> return? Most people say the object. The answer is <b>undefined</b>: ASI inserts a semicolon right after <code>return</code> because a line break follows it, so the object below is unreachable code. Rule: keep the returned value on the <b>same line</b> as <code>return</code>.</p>`, code: { lang: 'js', run: true, code: `
function getConfig() {
  return            // ASI turns this into "return;"
  {
    debug: true
  };
}
function getConfigFixed() {
  return {          // value starts on the same line → works
    debug: true
  };
}
console.log("broken:", String(getConfig()));            // broken: undefined
console.log("fixed:", JSON.stringify(getConfigFixed())); // fixed: {"debug":true}
` } },
      { title: 'Predict the output: a line starting with ( or [', html: `<p>Without semicolons, a line that begins with <code>(</code>, <code>[</code> or a backtick is glued onto the previous line. Below, <code>const b = a</code> followed by <code>[1, 2].forEach(...)</code> is read as <code>const b = a[1, 2].forEach(...)</code> → a crash. The comma operator turns <code>[1, 2]</code> into index <code>2</code>, and <code>a[2]</code> is <code>undefined</code>. This is why style guides either require semicolons or start such lines with <code>;</code>.</p>`, code: { lang: 'js', run: true, code: `
const a = "hi";
try {
  // Written WITHOUT a semicolon after "a", these two lines are parsed as ONE statement:
  //   const b = a
  //   [1, 2].forEach(n => console.log(n))
  // becomes: const b = a[1, 2].forEach(...)  →  a[2] is undefined → TypeError
  const b = a[1, 2].forEach((n) => console.log(n));
  console.log(b);
} catch (e) {
  console.log("Crash:", e.name, "-", e.message);
}
` } },
      { title: 'Browser-only vs Node-only APIs', html: `${H.table(['API', 'Browser', 'Node.js', 'Both'], [['<code>document</code>, <code>window</code>, <code>alert</code>', '✔', '✘', ''], ['<code>process</code>, <code>require</code>, <code>fs</code>, <code>__dirname</code>', '✘', '✔', ''], ['<code>console</code>, <code>setTimeout</code>, <code>fetch</code>, <code>URL</code>, <code>globalThis</code>, <code>structuredClone</code>', '', '', '✔']])}<p>The core language (variables, strings, numbers, loops) is identical everywhere; only the <b>host APIs</b> differ. <code>globalThis</code> is the portable name for the global object in every runtime.</p>` }
    ],
    deepDive: `<p>🟣 <b>Parse first, then run.</b> The engine reads the whole script before executing it. A <code>SyntaxError</code> anywhere (say a missing <code>)</code> on line 90) means <b>no</b> line runs — even line 1. A <code>ReferenceError</code> or <code>TypeError</code> is a <b>runtime</b> error: everything before it already happened. This is why the console shows "Uncaught SyntaxError" with nothing printed above it.</p>
      <p>🟣 <b>The exact ASI rules (ECMAScript spec).</b> A semicolon is inserted when (1) the next token cannot legally continue the statement and a line break separates them, (2) at the end of the input or before a <code>}</code>, and (3) after "restricted productions" — <code>return</code>, <code>break</code>, <code>continue</code>, <code>throw</code>, postfix <code>++</code>/<code>--</code>, <code>yield</code>, arrow <code>=&gt;</code> — when a line break follows them. Rule 3 causes the return trap. The opposite trap (no insertion) happens when the next line starts with <code>(</code> <code>[</code> <code>&#96;</code> <code>+</code> <code>-</code> <code>/</code>, because those CAN continue an expression.</p>
      <p>🟣 <b>Engines today.</b> V8 (Chrome, Edge, Node, Deno), SpiderMonkey (Firefox), JavaScriptCore (Safari, Bun). They interpret quickly at first, then JIT-compile hot code into machine code (module 12 covers Ignition/TurboFan). The language is standardised as <b>ECMAScript</b> by TC39, with a new edition every June (ES2015 = ES6 was the big one; ES2025 added things like iterator helpers and <code>Set</code> methods). Recent Node versions (22.18+ and 24) also run TypeScript files directly by stripping types (<code>node file.ts</code>) — the types are erased, the JavaScript underneath is what runs.</p>
      <p>🟣 <b>Script vs module.</b> A classic <code>&lt;script&gt;</code> shares one global scope with every other script on the page; a module (<code>&lt;script type="module"&gt;</code>, <code>.mjs</code>, or <code>"type": "module"</code> in package.json) has its own scope, is strict by default and can use <code>import</code>/<code>export</code>. Module 3 goes deeper.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> you can paste an error like "Uncaught SyntaxError: Unexpected token" into an assistant and get the fix in seconds, and coding agents can run <code>node file.js</code> for you and read the output. Setting up runtimes, picking a Node version or writing a <code>package.json</code> is now mostly a prompt away.</p>
      <p><b>Use AI as a partner:</b> ask "explain this stack trace line by line" or "what runtime APIs does this snippet need?" — great for learning which API belongs to the browser vs Node. Ask it to add semicolons / run Prettier rather than hand-fixing ASI issues.</p>
      <p><b>Where AI goes wrong:</b> it happily mixes browser and Node code (calling <code>document</code> in a server file, or <code>require</code> in an ES module), suggests outdated Node versions or APIs, and sometimes "fixes" an ASI bug by reformatting without noticing the real cause. <b>What you must still own:</b> knowing whether you are in a browser or Node, reading errors yourself (SyntaxError vs ReferenceError tells you whether anything ran), and verifying by actually running the code.</p>`,
    problems: [{
      title: 'Detect the Runtime Safely', level: 'Easy', tags: ['runtime', 'typeof', 'globalThis'], companies: ['Vercel', 'Shopify'],
      statement: `<p>Write <code>detectRuntime()</code> that returns <code>"browser"</code>, <code>"node"</code> or <code>"unknown"</code> depending on where the code runs. It must <b>never throw</b>, even in a runtime where <code>window</code> or <code>process</code> does not exist.</p>`,
      constraints: `No try/catch allowed (make it crash-proof by construction). Must work in a classic script, an ES module, and a web worker.`,
      example: `<p>In Chrome: ${H.c('g', '"browser"')} · In <code>node app.js</code>: ${H.c('g', '"node"')} · In an unusual embedded engine: ${H.c('y', '"unknown"')}.<br>Why: the browser defines a global <code>window</code> with a <code>document</code>; Node defines a global <code>process</code> whose <code>versions.node</code> is a string.</p>`,
      brute: { why: `<p>The naive check <code>if (window) …</code> reads a variable that does not exist in Node — reading an <b>undeclared</b> name throws <span class="c-r">ReferenceError: window is not defined</span>. The program dies before it can answer.</p>`, code: { lang: 'js', code: `
function detectRuntimeNaive() {
  if (window) return "browser";       // ReferenceError in Node: window is not defined
  if (process) return "node";         // ReferenceError in the browser
  return "unknown";
}
` } },
      mcq: { q: 'Which expression is safe to evaluate in ANY runtime, even if <code>window</code> was never declared?', options: ['<code>window !== undefined</code>', '<code>typeof window !== "undefined"</code>', '<code>window == null</code>', '<code>!!window</code>'], answer: 1, explain: '<code>typeof</code> is the only operator allowed on an undeclared name — it returns "undefined" instead of throwing. All the others READ the variable and throw ReferenceError.' },
      hints: [`<p>Reading an undeclared variable throws, but <code>typeof undeclaredName</code> returns the string "undefined" — it never throws.</p>`, `<p>Alternatively look things up as <b>properties</b> of <code>globalThis</code>: a missing property is just <code>undefined</code>, not an error.</p>`, `<p>Recipe: if typeof window is not "undefined" and window.document exists → browser; else if typeof process is not "undefined" and process.versions has a node string → node; else unknown. Optional chaining <code>?.</code> keeps property reads safe.</p>`],
      tests: { sig: 'string -> string', fn: 'envCase', harness: { js: `function envCase(kind) {
  const g = globalThis;
  const keep = { window: Object.getOwnPropertyDescriptor(g, 'window'), process: Object.getOwnPropertyDescriptor(g, 'process') };
  const set = (k, v) => Object.defineProperty(g, k, { value: v, configurable: true, writable: true });
  try {
    if (kind === 'browser') { set('window', { document: {} }); set('process', undefined); }
    else if (kind === 'browser-with-process-shim') set('window', { document: {} });
    else if (kind === 'window-without-document') set('window', {});
    else if (kind === 'worker') set('process', undefined);
    else if (kind === 'bare') { set('process', undefined); }
    else if (kind === 'process-without-versions') set('process', {});
    else if (kind === 'process-numeric-node') set('process', { versions: { node: 18 } });
    return detectRuntime();
  } finally {
    for (const k of ['window', 'process']) { if (keep[k]) Object.defineProperty(g, k, keep[k]); else delete g[k]; }
  }
}` }, cases: [
        [["real"],"node"],
        [["browser"],"browser"],
        [["browser-with-process-shim"],"browser"],
        [["window-without-document"],"node"],
        [["worker"],"unknown"],
        [["bare"],"unknown"],
        [["process-without-versions"],"unknown"],
        [["process-numeric-node"],"unknown"]
      ] },
      solution: {
        approach: `<p>Use <code>typeof</code> (never throws on undeclared names) plus optional chaining for nested properties. Check for a <i>specific</i> fingerprint (<code>window.document</code>, <code>process.versions.node</code>) rather than just the global, because some tools fake one global.</p>`,
        code: { lang: 'js', run: true, code: `
function detectRuntime() {
  // typeof on an undeclared name returns "undefined" instead of throwing
  if (typeof window !== "undefined" && typeof window.document !== "undefined") {
    return "browser";
  }
  // process.versions.node is a string like "22.11.0" only in Node
  if (typeof process !== "undefined" && typeof process.versions?.node === "string") {
    return "node";
  }
  return "unknown";
}

console.log("Running in:", detectRuntime());
console.log("globalThis exists everywhere:", typeof globalThis);   // "object"
` },
        alt: [{ lang: 'ts', code: `
type Runtime = "browser" | "node" | "unknown";

function detectRuntime(): Runtime {
  const g = globalThis as { window?: { document?: unknown }; process?: { versions?: { node?: string } } };
  if (g.window?.document !== undefined) return "browser";
  if (typeof g.process?.versions?.node === "string") return "node";
  return "unknown";
}
console.log(detectRuntime());
` }],
        dry: { head: ['Runtime', 'typeof window', 'typeof process', 'versions.node', 'returns'], rows: [['Chrome tab', '"object"', '"undefined"', '—', H.c('g', '"browser"')], ['node app.js', '"undefined"', '"object"', '"22.11.0"', H.c('g', '"node"')], ['web worker', '"undefined"', '"undefined"', '—', H.c('y', '"unknown"')]] },
        complexity: `<p>O(1) time and space — a couple of property checks.</p>`,
        followUps: ['Add "deno" (check <code>typeof Deno</code>) and "bun" (<code>process.versions.bun</code>).', 'Why is feature detection ("does fetch exist?") usually better than runtime detection?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — let, const, var
     ===================================================================== */
  var VARPROG = 'console.log(a);        // ?\nvar a = 1;\nlet b = 2;\nconst c = { n: 3 };\nif (true) {\n  let b = 20;\n  var a = 10;\n  console.log(a, b);\n}\nconsole.log(a, b);\nc.n = 4;\nc = {};';
  topics.push({
    title: 'Variables: let, const and var',
    analogy: `<p>A variable is a <b>labelled box</b>. <code>let</code> is a box with a <b>sticky note</b> label: you can take the old thing out and put a new thing in. <code>const</code> is a box whose label is <b>glued</b> to one thing forever — but if that thing is a backpack (an object), you can still add and remove stuff <i>inside</i> the backpack. <code>var</code> is the old-fashioned box from 1995 that ignores room walls: put it inside a closet (a block) and it still ends up in the whole house (the function).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> You <b>declare</b> a variable to give a value a name, then use the name later.</p>
      <ul>
        <li><code>const total = 10;</code> — a name that will <b>never be reassigned</b>. Use it by default (most values never change after you compute them).</li>
        <li><code>let count = 0;</code> — a name you <b>will reassign</b> (<code>count = count + 1</code>). Use it for counters, accumulators, loop variables.</li>
        <li><code>var x = 1;</code> — the pre-2015 keyword. It still works, but has surprising rules. Don't use it in new code; you must understand it to read old code and to answer interview questions.</li>
      </ul>
      ${H.table(['', '<code>const</code>', '<code>let</code>', '<code>var</code>'], [['Reassign later?', H.c('r', 'no → TypeError'), H.c('g', 'yes'), H.c('g', 'yes')], ['Must give a value now?', H.c('y', 'yes'), 'no (starts <code>undefined</code>)', 'no (starts <code>undefined</code>)'], ['Scope (where the name exists)', H.c('b', 'block { }'), H.c('b', 'block { }'), H.c('r', 'whole function (ignores blocks)')], ['Use before the declaration line', H.c('r', 'ReferenceError (TDZ)'), H.c('r', 'ReferenceError (TDZ)'), H.c('y', 'gives undefined (hoisted)')], ['Declare same name twice in one scope', H.c('r', 'SyntaxError'), H.c('r', 'SyntaxError'), H.c('y', 'allowed (silently)')], ['Top-level becomes property of window?', 'no', 'no', H.c('y', 'yes, in classic scripts')]])}
      <p>🔵 <b>Scope in one sentence:</b> a <b>block</b> is any pair of curly braces <code>{ }</code> (an <code>if</code>, a loop, or just braces). <code>let</code>/<code>const</code> names live only inside the block where they are declared; <code>var</code> names leak out to the enclosing function (or the global scope).</p>
      <p>🔵 <b>Hoisting &amp; the TDZ (beginner version).</b> Before running a scope, the engine scans it and creates all its variables. <code>var</code> ones are created <b>and set to <code>undefined</code></b>, so using them early gives <code>undefined</code>. <code>let</code>/<code>const</code> ones are created but left <b>uninitialized</b> — touching them before their line throws a <code>ReferenceError</code>. That "too early" zone is the <b>Temporal Dead Zone</b> (TDZ). Module 4 goes deep on this.</p>
      <p>🔵 <b>const ≠ frozen.</b> <code>const</code> protects the <b>binding</b> (the label → value link), not the value. <code>const arr = []; arr.push(1)</code> is fine; <code>arr = [1]</code> throws. To make the object itself read-only use <code>Object.freeze(obj)</code> (shallow).</p>
      <p>🔵 <b>Naming rules.</b> Names may contain letters, digits, <code>_</code> and <code>$</code>, but cannot start with a digit and cannot be reserved words (<code>let</code>, <code>class</code>, <code>return</code>…). Conventions: <code>camelCase</code> for variables/functions, <code>PascalCase</code> for classes, <code>UPPER_SNAKE_CASE</code> for true constants such as <code>MAX_RETRIES</code>.</p>`,
    clues: [
      '"What is printed when a variable is used before its declaration?" → <code>var</code>: undefined; <code>let/const</code>: ReferenceError (TDZ)',
      '"Why can I push into a const array?" → const freezes the binding, not the object',
      '"Variable changed outside the if/for block" → it was declared with <code>var</code> (function-scoped)',
      '"Cannot access \'x\' before initialization" in an error message → TDZ of let/const',
      '"Assignment to constant variable" → reassigning a <code>const</code>',
      '"Which keyword should we use by default?" → <code>const</code>, then <code>let</code> when reassignment is needed, never <code>var</code>'
    ],
    code: [{ lang: 'js', run: true, title: 'let vs const vs var in action', code: `
// const: the label is glued to one value
const PI = 3.14159;
// PI = 3;                 // would throw TypeError: Assignment to constant variable.

// let: reassign freely
let score = 0;
score = score + 10;
score += 5;                 // shorthand for score = score + 5
console.log("score:", score);           // 15

// const with an object: the binding is fixed, the contents are not
const user = { name: "Asha", tags: [] };
user.name = "Asha K.";      // allowed: we changed a property, not the binding
user.tags.push("admin");    // allowed
console.log("user:", JSON.stringify(user));

// Block scope: let/const exist only inside { }
if (score > 10) {
  const message = "high score";
  let bonus = 3;
  var leaky = "I escape the block";      // var ignores the braces
  console.log(message, bonus);
}
console.log(typeof message);            // "undefined" - message does not exist out here
console.log(leaky);                     // "I escape the block"

// Hoisting difference
console.log("old before declaration:", String(old));   // undefined (var is hoisted with undefined)
var old = "var value";
try {
  console.log(fresh);                   // TDZ!
} catch (e) {
  console.log(e.name + ":", e.message);  // ReferenceError: Cannot access 'fresh' before initialization
}
let fresh = "let value";
` }],
    codeTitle: ['Declarations side by side'],
    viz: {
      title: 'Scopes, hoisting and the TDZ — step by step',
      gen: function () {
        var F = [];
        function fr(line, narr, glob, block, out, extra) {
          var hl = {}; if (line) hl[line] = (extra && extra.bad) ? 'bad' : 'cur';
          var parts = [{ type: 'code', label: 'program', lang: 'js', code: VARPROG, hl: hl }, { type: 'vars', label: 'Global scope', vals: glob.vals, hl: glob.hl || {} }];
          if (block) parts.push({ type: 'vars', label: 'Block scope { } (lives only while inside the if)', vals: block.vals, hl: block.hl || {} });
          if (extra && extra.heap) parts.push({ type: 'map', label: 'Heap (objects live here)', entries: extra.heap.entries, hl: extra.heap.hl || {} });
          parts.push({ type: 'queue', label: 'console output', items: out.slice(), hl: extra && extra.outHl ? extra.outHl : {} });
          F.push({ narr: narr, parts: parts });
        }
        var TDZ = '⛔ TDZ (uninitialized)';
        fr(0, '<b>Before line 1 runs</b>, the engine scans the scope and creates every variable (this is <b>hoisting</b>). <code>var a</code> is created and set to <code>undefined</code>. <code>let b</code> and <code>const c</code> are created but <b>uninitialized</b> — the Temporal Dead Zone.', { vals: { a: 'undefined', b: TDZ, c: TDZ }, hl: { a: 'sel', b: 'bad', c: 'bad' } }, null, []);
        fr(1, 'Line 1 reads <code>a</code>. It exists already (hoisted) and holds <b>undefined</b>, so it prints undefined — no error. (Had we read <code>b</code> here: ReferenceError.)', { vals: { a: 'undefined', b: TDZ, c: TDZ }, hl: { a: 'cur' } }, null, ['undefined'], { outHl: { 0: 'ok' } });
        fr(2, 'Line 2 assigns 1 to <code>a</code>.', { vals: { a: 1, b: TDZ, c: TDZ }, hl: { a: 'ok' } }, null, ['undefined']);
        fr(3, 'Line 3: the <code>let</code> line is reached — <code>b</code> leaves the TDZ and gets 2.', { vals: { a: 1, b: 2, c: TDZ }, hl: { b: 'ok' } }, null, ['undefined']);
        fr(4, 'Line 4: an object <code>{ n: 3 }</code> is created on the <b>heap</b>; <code>c</code> holds a <b>reference</b> (an arrow) to it. const glues <code>c</code> to that reference.', { vals: { a: 1, b: 2, c: '→ obj#1' }, hl: { c: 'ok' } }, null, ['undefined'], { heap: { entries: [['obj#1', '{ n: 3 }']], hl: { 'obj#1': 'ok' } } });
        fr(5, 'Line 5 enters a <b>block</b>. A new block scope is created. Its own <code>let b</code> is hoisted inside the block (in TDZ until line 6). The inner <code>var a</code> is NOT here — var skipped the block and was hoisted to the global scope at the start.', { vals: { a: 1, b: 2, c: '→ obj#1' } }, { vals: { b: TDZ }, hl: { b: 'bad' } }, ['undefined'], { heap: { entries: [['obj#1', '{ n: 3 }']] } });
        fr(6, 'Line 6: the block\'s own <code>b</code> becomes 20. It <b>shadows</b> (hides) the global b while we are inside the block. The global b is still 2.', { vals: { a: 1, b: 2, c: '→ obj#1' } }, { vals: { b: 20 }, hl: { b: 'ok' } }, ['undefined'], { heap: { entries: [['obj#1', '{ n: 3 }']] } });
        fr(7, 'Line 7: <code>var a = 10</code> inside the block — var ignores blocks, so this is the SAME global <code>a</code>. It is overwritten to 10. (Redeclaring with var is silently allowed; with let it would be a SyntaxError.)', { vals: { a: 10, b: 2, c: '→ obj#1' }, hl: { a: 'bad' } }, { vals: { b: 20 } }, ['undefined'], { heap: { entries: [['obj#1', '{ n: 3 }']] } });
        fr(8, 'Line 8: the engine looks names up from the <b>innermost scope outward</b>. <code>a</code> → not in block → global: 10. <code>b</code> → found in block: 20. Prints <b>10 20</b>.', { vals: { a: 10, b: 2, c: '→ obj#1' }, hl: { a: 'cur' } }, { vals: { b: 20 }, hl: { b: 'cur' } }, ['undefined', '10 20'], { outHl: { 1: 'ok' }, heap: { entries: [['obj#1', '{ n: 3 }']] } });
        fr(9, 'Line 9 closes the block: the block scope (and the inner <code>b</code>) is thrown away.', { vals: { a: 10, b: 2, c: '→ obj#1' } }, null, ['undefined', '10 20'], { heap: { entries: [['obj#1', '{ n: 3 }']] } });
        fr(10, 'Line 10 prints <b>10 2</b>: <code>a</code> was changed by the var inside the block (leak!), while the outer <code>b</code> was never touched.', { vals: { a: 10, b: 2, c: '→ obj#1' }, hl: { a: 'cur', b: 'cur' } }, null, ['undefined', '10 20', '10 2'], { outHl: { 2: 'ok' }, heap: { entries: [['obj#1', '{ n: 3 }']] } });
        fr(11, 'Line 11: <code>c.n = 4</code> changes the object <i>inside</i> the box. Allowed! const only stops <code>c</code> from pointing somewhere else.', { vals: { a: 10, b: 2, c: '→ obj#1' } }, null, ['undefined', '10 20', '10 2'], { heap: { entries: [['obj#1', '{ n: 4 }']], hl: { 'obj#1': 'ok' } } });
        fr(12, 'Line 12 tries to point <code>c</code> at a new object → <span class="c-r">TypeError: Assignment to constant variable.</span> The program stops here.', { vals: { a: 10, b: 2, c: '→ obj#1 (unchanged)' }, hl: { c: 'bad' } }, null, ['undefined', '10 20', '10 2', 'TypeError: Assignment to constant variable.'], { bad: true, outHl: { 3: 'bad' }, heap: { entries: [['obj#1', '{ n: 4 }']] } });
        F.push({ narr: 'Summary: prefer <b>const</b>; use <b>let</b> when you must reassign; avoid <b>var</b> because it ignores blocks, allows redeclaration and hides use-before-declare bugs behind a silent undefined.', parts: [{ type: 'table', label: 'Cheat sheet', columns: ['keyword', 'scope', 'hoisted as', 'reassign', 'redeclare'], rows: [['const', 'block', 'TDZ', 'no', 'no'], ['let', 'block', 'TDZ', 'yes', 'no'], ['var', 'function', 'undefined', 'yes', 'yes']], hl: { 0: 'ok', 2: 'bad' } }] });
        return F;
      }
    },
    examples: [
      { title: 'Predict the output: loop counter visibility', html: `<p>After a <code>for (var i …)</code> loop, <code>i</code> is still alive and equals the value that ended the loop (3). With <code>let</code>, <code>j</code> exists only inside the loop, so reading it outside throws.</p>`, code: { lang: 'js', run: true, code: `
for (var i = 0; i < 3; i++) { /* empty */ }
console.log("i after var loop:", i);        // 3  (var leaked out of the loop)

for (let j = 0; j < 3; j++) { /* empty */ }
console.log("typeof j:", typeof j);        // "undefined" — j never existed out here
` } },
      { title: 'Predict the output: const array vs reassignment', html: `<p><code>push</code> mutates the array that <code>list</code> points to — fine. <code>list = []</code> tries to re-point the const label — TypeError. <code>Object.freeze</code> blocks mutation of the object itself (shallowly; frozen-object writes fail silently in sloppy mode and throw in strict mode).</p>`, code: { lang: 'js', run: true, code: `
"use strict";
const list = [1, 2];
list.push(3);
console.log(JSON.stringify(list));          // [1,2,3]
try { list = []; } catch (e) { console.log(e.name + ": " + e.message); }

const frozen = Object.freeze([1, 2]);
try { frozen.push(3); } catch (e) { console.log(e.name + ": " + e.message); } // cannot add property
` } },
      { title: 'Accidental globals (sloppy vs strict mode)', html: `<p>Assigning to a name you never declared, e.g. <code>totl = 5</code> (typo of <code>total</code>), silently creates a <b>global variable</b> in sloppy mode. In strict mode it throws <code>ReferenceError: totl is not defined</code> — which is exactly what you want. ES modules and classes are always strict.</p>`, code: { lang: 'js', run: true, code: `
function sloppy() { typoVar = 5; }           // no let/const/var!
sloppy();
console.log("created a global:", globalThis.typoVar);   // 5 — oops

function strict() { "use strict"; anotherTypo = 5; }
try { strict(); } catch (e) { console.log(e.name + ": " + e.message); }
` } },
      { title: 'Naming: legal, illegal and conventional', html: `${H.table(['Name', 'Legal?', 'Note'], [['<code>userName</code>', H.c('g', 'yes'), 'camelCase — the convention for variables'], ['<code>$price</code>, <code>_cache</code>', H.c('g', 'yes'), '$ and _ are allowed anywhere'], ['<code>MAX_SIZE</code>', H.c('g', 'yes'), 'UPPER_SNAKE for fixed configuration constants'], ['<code>2fast</code>', H.c('r', 'no'), 'cannot start with a digit'], ['<code>class</code>, <code>let</code>, <code>return</code>', H.c('r', 'no'), 'reserved words'], ['<code>café</code>', H.c('g', 'yes'), 'Unicode letters work (but keep code ASCII for teams)']])}` }
    ],
    deepDive: `<p>🟣 <b>What hoisting really is.</b> Nothing is physically moved. When a scope (function, block, module, script) starts, the engine performs <b>declaration instantiation</b>: it creates bindings for every declaration in that scope. <code>var</code> and function declarations are initialised immediately (to <code>undefined</code> and to the function object, respectively). <code>let</code>, <code>const</code> and <code>class</code> are created but left uninitialised until execution reaches their declaration — any access in between throws, and that window is the TDZ. Even <code>typeof x</code> throws inside the TDZ, although it is safe for a name that was never declared at all.</p>
      <p>🟣 <b>Where globals live.</b> In a classic script, top-level <code>var</code> and function declarations become properties of the global object (<code>window.x</code>); top-level <code>let</code>/<code>const</code> live in a separate "declarative" global record, so <code>window.x</code> is undefined for them. In ES modules, nothing becomes global — each module has its own scope. In Node CommonJS files, top-level declarations are local to the file because Node wraps the file in a function.</p>
      <p>🟣 <b>Performance and tooling.</b> There is no meaningful speed difference between let and const in modern engines; prefer const for <b>readability</b>: a reader instantly knows the name never changes. ESLint rules <code>prefer-const</code> and <code>no-var</code> enforce this automatically. Edge case: <code>const</code> in a classic <code>for (const i = 0; i &lt; 3; i++)</code> throws on <code>i++</code>, but <code>for (const x of arr)</code> is fine because each iteration gets a brand-new binding.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants and linters auto-convert <code>var</code> to <code>let</code>/<code>const</code> in old code in seconds — the kind of migration that used to take a sprint.</p>
      <p><b>Use AI as a partner:</b> "Convert this file from var to let/const and list every place where behaviour could change." The second half of that prompt is the valuable part: a mechanical swap can change behaviour when code relied on hoisting or function scope (for example a var used after its loop, or read before its declaration).</p>
      <p><b>Where AI goes wrong:</b> it may claim const makes objects immutable, or "fix" a TDZ error by switching to var (hiding the bug instead of fixing the order). <b>What you must still own:</b> reading scope at a glance, explaining TDZ vs hoisting in an interview, and judging whether an automated refactor is behaviour-preserving.</p>`,
    problems: [{
      title: 'Swap Two Variables (three ways)', level: 'Easy', tags: ['variables', 'destructuring', 'let'], companies: ['TCS', 'Infosys', 'Amazon'],
      statement: `<p>Given <code>let a</code> and <code>let b</code> holding any values, swap them so that <code>a</code> holds the old <code>b</code> and vice-versa. Show the classic temp-variable way and the modern one-liner. Explain why the arithmetic trick (<code>a = a + b; b = a - b; a = a - b</code>) is a bad idea in JavaScript.</p>`,
      constraints: `Values can be numbers, strings, objects or anything else. Must not lose precision.`,
      example: `<p>Before: <code>a = ${H.c('b', '"left"')}, b = ${H.c('p', '"right"')}</code> → After: <code>a = ${H.c('p', '"right"')}, b = ${H.c('b', '"left"')}</code>. With numbers <code>a = 0.1, b = 0.2</code>, the arithmetic trick ends with <code>b = 0.10000000000000003</code> — ${H.c('r', 'wrong')} — because floating-point addition rounds.</p>`,
      brute: { why: `<p>The arithmetic trick avoids a temp variable but <b>only works for numbers</b> (strings get concatenated), can lose precision with decimals, and can overflow precision for values beyond 2<sup>53</sup>. It also needs <code>let</code> on both names — it is clever, not correct.</p>`, code: { lang: 'js', run: true, code: `
let a = 0.1, b = 0.2;
a = a + b;   // 0.30000000000000004 (rounded!)
b = a - b;   // 0.10000000000000003
a = a - b;   // 0.2
console.log("arithmetic swap:", a, b);   // not exactly 0.2 and 0.1
` } },
      mcq: { q: 'You write <code>const a = 1; const b = 2; [a, b] = [b, a];</code>. What happens?', options: ['They swap', 'TypeError: Assignment to constant variable', 'SyntaxError before anything runs', 'Nothing changes, silently'], answer: 1, explain: 'Destructuring assignment REASSIGNS a and b. Both are const, so assigning throws a TypeError at run time. Use let for values you plan to swap.' },
      hints: [`<p>The problem: after <code>a = b</code>, the old value of <code>a</code> is gone. Save it somewhere first.</p>`, `<p>A temp variable (<code>const tmp = a</code>) works for every type. JavaScript also has <b>array destructuring</b>: build a little array of the new values, then unpack it into the names.</p>`, `<p>Recipe: <code>[a, b] = [b, a];</code>. The right side is fully evaluated first (creating <code>[oldB, oldA]</code>), then unpacked left to right. Careful: if the previous line has no semicolon, a line starting with <code>[</code> glues onto it (ASI trap).</p>`],
      tests: { io: true, cases: [
        {"stdin":"","stdout":"temp swap: right left\ndestructuring swap: 0.2 0.1\nobjects: 2 1"}
      ] },
      solution: {
        approach: `<p>Use <code>let</code> (we reassign). The temp-variable swap is universal and explicit. The destructuring swap is idiomatic modern JS: the right-hand array snapshot <code>[b, a]</code> is created before any assignment happens, so nothing is lost.</p>`,
        code: { lang: 'js', run: true, code: `
// Way 1: temp variable — works for every type
let a = "left", b = "right";
const tmp = a;      // save old a
a = b;              // a gets old b
b = tmp;            // b gets saved a
console.log("temp swap:", a, b);          // right left

// Way 2: destructuring — idiomatic, one line
let x = 0.1, y = 0.2;
[x, y] = [y, x];    // right side [0.2, 0.1] is built first, then unpacked
console.log("destructuring swap:", x, y); // 0.2 0.1 (exact, no arithmetic)

// Works for any type, even objects
let p = { id: 1 }, q = { id: 2 };
[p, q] = [q, p];
console.log("objects:", p.id, q.id);      // 2 1
` },
        dry: { head: ['Step', 'a', 'b', 'tmp / temp array'], rows: [['start', '"left"', '"right"', '—'], ['const tmp = a', '"left"', '"right"', '"left"'], ['a = b', '"right"', '"right"', '"left"'], ['b = tmp', '"right"', H.c('g', '"left"'), '"left"'], ['[x, y] = [y, x] (builds [0.2, 0.1])', 'x = 0.2', 'y = 0.1', '[0.2, 0.1]']] },
        complexity: `<p>O(1) time. The destructuring version allocates a tiny temporary array (engines often optimise it away).</p>`,
        followUps: ['Rotate three variables a → b → c → a in one line.', 'Why does <code>let a = 1, b = 2</code> followed by a line <code>[a, b] = [b, a]</code> without a semicolon break?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Primitive types & typeof
     ===================================================================== */
  topics.push({
    title: 'Primitive Types, null vs undefined & the typeof Operator',
    analogy: `<p>Imagine a post office that ships only <b>eight kinds of parcel</b>. Seven are small sealed envelopes — <b>primitives</b>: text (string), a number, a huge whole number (bigint), a yes/no card (boolean), an empty envelope nobody filled in yet (undefined), an envelope deliberately marked "nothing inside" (null), and a unique wax seal (symbol). The eighth is a <b>box with compartments</b> — an object — and arrays, functions and dates are all kinds of boxes. <code>typeof</code> is the clerk who reads the label on the parcel… and who, because of a 30-year-old printing error, labels the "nothing inside" envelope as a <i>box</i>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Every value in JavaScript has a <b>type</b>. Variables don't have types — values do, and the same variable can hold a number now and a string later (<b>dynamic typing</b>). There are exactly <b>7 primitive types</b> plus <b>objects</b>:</p>
      ${H.table(['Type', 'Examples', '<code>typeof</code> says', 'Notes'], [
        ['string', '<code>"hi"</code>, <code>\'a\'</code>, <code>&#96;x&#96;</code>', '"string"', 'text, immutable'],
        ['number', '<code>42</code>, <code>3.14</code>, <code>-0</code>, <code>NaN</code>, <code>Infinity</code>', '"number"', 'one type for ints AND decimals (64-bit float)'],
        ['bigint', '<code>10n</code>, <code>2n ** 64n</code>', '"bigint"', 'whole numbers of any size'],
        ['boolean', '<code>true</code>, <code>false</code>', '"boolean"', ''],
        ['undefined', '<code>undefined</code>', '"undefined"', '"no value yet" — the default'],
        ['null', '<code>null</code>', H.c('r', '"object"') + ' (bug!)', '"intentionally empty"'],
        ['symbol', '<code>Symbol("id")</code>', '"symbol"', 'unique keys'],
        ['object', '<code>{}</code>, <code>[]</code>, <code>new Date()</code>', '"object"', 'everything that is not a primitive'],
        ['(function)', '<code>function f() {}</code>, <code>() =&gt; 1</code>', '"function"', 'functions are objects, but typeof singles them out']
      ])}
      <p>🔵 <b>typeof</b> is an operator (not a function) that returns a <b>string</b>. Three surprises to memorise: <code>typeof null === "object"</code>, <code>typeof NaN === "number"</code> and <code>typeof [] === "object"</code>. So: check null with <code>x === null</code>, arrays with <code>Array.isArray(x)</code>, NaN with <code>Number.isNaN(x)</code>.</p>
      <p>🔵 <b>undefined vs null.</b> <code>undefined</code> is what JavaScript gives you automatically: a declared-but-unassigned variable, a missing object property, a missing function argument, a function without <code>return</code>. <code>null</code> is what a <b>programmer</b> writes to say "deliberately empty" (e.g. "no user logged in"). <code>null == undefined</code> is true, <code>null === undefined</code> is false.</p>
      <p>🔵 <b>Primitives are copied by value, objects by reference.</b> <code>let a = 5; let b = a; b++</code> leaves <code>a</code> at 5. But <code>const o = {n: 1}; const p = o; p.n = 2</code> changes <code>o.n</code> too — both names point to the <b>same</b> box. And <code>{} === {}</code> is <b>false</b>: two different boxes.</p>
      <p>🔵 <b>Why can a primitive have methods?</b> <code>"hi".toUpperCase()</code> works because JS briefly wraps the primitive in a temporary <code>String</code> object (<b>auto-boxing</b>), calls the method, and throws the wrapper away. Never create wrappers yourself with <code>new String</code>/<code>new Number</code>/<code>new Boolean</code>.</p>`,
    clues: [
      '"What does <code>typeof null</code> return?" → "object" (historic bug); test with <code>=== null</code>',
      '"How do you check if something is an array?" → <code>Array.isArray</code>, not typeof',
      '"Difference between null and undefined?" → accidental absence vs intentional emptiness; == true, === false',
      '"How many data types does JavaScript have?" → 8: 7 primitives + object',
      '"Why does <code>{} === {}</code> return false?" → objects compare by reference, primitives by value',
      '"How can a string have methods if it is a primitive?" → auto-boxing into a temporary wrapper object'
    ],
    code: [{ lang: 'js', run: true, title: 'typeof tour', code: `
const samples = [
  ["\\"hello\\"", "hello"],
  ["42", 42],
  ["3.14", 3.14],
  ["NaN", NaN],
  ["10n", 10n],
  ["true", true],
  ["undefined", undefined],
  ["null", null],
  ["Symbol('id')", Symbol("id")],
  ["{}", {}],
  ["[]", []],
  ["() => 1", () => 1],
];
for (const [label, value] of samples) {
  console.log(label.padEnd(14), "→ typeof:", (typeof value).padEnd(10), "| isArray:", Array.isArray(value));
}

// The three "gotchas" and the correct checks
const x = null;
console.log("x === null:", x === null);                 // true  (the reliable null check)
console.log("Number.isNaN(NaN):", Number.isNaN(NaN));    // true
console.log("Array.isArray([]):", Array.isArray([]));    // true

// undefined appears automatically
let notSet;
const obj = { a: 1 };
function noReturn() {}
console.log(typeof notSet, typeof obj.missing, typeof noReturn()); // undefined undefined undefined
` }],
    codeTitle: ['typeof on every type'],
    viz: {
      title: 'typeof inspector — what type is each value?',
      input: '42; "hi"; true; undefined; null; 10n; NaN; []; {}; Symbol("id"); () => 1',
      inputLabel: 'Values separated by ;',
      gen: function (input) {
        var items = splitList(input, ';', 14), rows = [], frames = [], seen = [];
        frames.push({ narr: '<code>typeof x</code> returns a <b>string</b> naming the type. JavaScript has 7 primitive types and objects. Let\'s inspect each value you typed.', parts: [
          { type: 'set', label: 'possible typeof answers', items: ['"string"', '"number"', '"bigint"', '"boolean"', '"undefined"', '"symbol"', '"object"', '"function"'] }
        ] });
        items.forEach(function (src) {
          var rv;
          try { rv = readValue(src); } catch (e) { throw new Error('Could not read "' + src + '": ' + e.message); }
          var v = rv.v, t = typeof v, prim = isPrim(v), surprise = '', cls = prim ? 'ok' : 'win';
          if (v === null) { surprise = 'typeof null is "object" — a 1995 bug. Use x === null.'; cls = 'bad'; }
          else if (typeof v === 'number' && v !== v) { surprise = 'NaN is a NUMBER value meaning "not a valid number". Use Number.isNaN(x).'; cls = 'bad'; }
          else if (Array.isArray(v)) { surprise = 'arrays are objects. Use Array.isArray(x).'; cls = 'bad'; }
          else if (t === 'function') surprise = 'functions are objects, but typeof reports "function".';
          else if (t === 'bigint') surprise = 'bigint: whole numbers of any size; cannot mix with number in math.';
          else if (t === 'symbol') surprise = 'every Symbol() is unique: Symbol("id") !== Symbol("id").';
          else if (t === 'undefined') surprise = 'the default "no value yet".';
          else surprise = prim ? 'a primitive: immutable, compared by value.' : 'an object: compared by reference.';
          rows.push([src, show(v), '"' + t + '"', prim ? 'primitive' : 'object', surprise]);
          if (seen.indexOf('"' + t + '"') < 0) seen.push('"' + t + '"');
          var hl = {}; hl[rows.length - 1] = cls === 'bad' ? 'bad' : 'cur';
          var shl = {}; shl['"' + t + '"'] = cls === 'bad' ? 'bad' : 'ok';
          frames.push({ narr: '<code>typeof ' + esc(src) + '</code> → <b>"' + esc(t) + '"</b>. ' + esc(surprise), parts: [
            { type: 'vars', label: 'inspecting', vals: { value: show(v), 'typeof': '"' + t + '"', 'is primitive?': String(prim), 'Array.isArray': String(Array.isArray(v)), '=== null': String(v === null) }, hl: { 'typeof': cls === 'bad' ? 'bad' : 'ok' } },
            { type: 'table', label: 'results so far', columns: ['you typed', 'value', 'typeof', 'kind', 'note'], rows: rows.map(function (r) { return r.slice(); }), hl: hl },
            { type: 'set', label: 'typeof answers seen', items: seen.slice(), hl: shl }
          ] });
        });
        frames.push({ narr: 'Rule of thumb: <b>typeof</b> is perfect for string / number / boolean / undefined / bigint / symbol / function. For <b>null</b> use <code>=== null</code>, for <b>arrays</b> use <code>Array.isArray</code>, for <b>NaN</b> use <code>Number.isNaN</code>.', parts: [
          { type: 'table', label: 'Correct checks', columns: ['want to know', 'use'], rows: [['is it null?', 'x === null'], ['is it an array?', 'Array.isArray(x)'], ['is it NaN?', 'Number.isNaN(x)'], ['null or undefined?', 'x == null  (or x ?? fallback)'], ['a real object?', 'x !== null && typeof x === "object"']], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: typeof chains', html: `<p><code>typeof typeof 42</code> → <code>typeof "number"</code> → <b>"string"</b>, because typeof always returns a string. <code>typeof undeclaredThing</code> → <b>"undefined"</b> without an error (the only safe way to touch an undeclared name). <code>typeof class {}</code> → <b>"function"</b>: classes are functions under the hood.</p>`, code: { lang: 'js', run: true, code: `
console.log(typeof typeof 42);          // "string"
console.log(typeof undeclaredThing);    // "undefined" — no ReferenceError
console.log(typeof class {});           // "function"
console.log(typeof new Date());         // "object"
console.log(typeof Math);               // "object"
console.log(typeof Infinity);           // "number"
` } },
      { title: 'Value vs reference', html: `<p>Primitives are copied: changing the copy never touches the original. Objects are shared: two names, one box. Equality follows the same rule — two separately created objects are never <code>===</code>, even with identical contents.</p>${H.table(['Code', 'Result', 'Why'], [['<code>let a = 5; let b = a; b = 6;</code> → a', '5', 'b got a copy of 5'], ['<code>const o = {n:1}; const p = o; p.n = 2;</code> → o.n', H.c('y', '2'), 'o and p point to the same object'], ['<code>"hi" === "hi"</code>', H.c('g', 'true'), 'primitives compare by value'], ['<code>[1] === [1]</code>', H.c('r', 'false'), 'two different arrays (references)']])}`, code: { lang: 'js', run: true, code: `
let a = 5; let b = a; b = 6;
console.log("a:", a);                  // 5
const o = { n: 1 }; const p = o; p.n = 2;
console.log("o.n:", o.n);              // 2 — same object
console.log("[1] === [1]:", [1] === [1]);   // false
console.log("o === p:", o === p);           // true — same reference
` } },
      { title: 'Wrapper objects are a trap', html: `<p><code>new Boolean(false)</code> creates an <b>object</b>, and every object is truthy — so the <code>if</code> runs! <code>new String("a") === "a"</code> is false (object vs primitive). Calling <code>String(x)</code>, <code>Number(x)</code>, <code>Boolean(x)</code> <b>without</b> <code>new</code> is the correct way to convert: it returns a primitive.</p>`, code: { lang: 'js', run: true, code: `
const flag = new Boolean(false);
if (flag) console.log("runs! an object is always truthy");
console.log(typeof flag, typeof Boolean(false));     // object boolean
console.log(new String("a") === "a", String("a") === "a"); // false true
` } },
      { title: 'Where undefined comes from', html: `${H.table(['Situation', 'Value'], [['<code>let x;</code> then read x', 'undefined'], ['<code>({}).missing</code>', 'undefined'], ['<code>function f(a) { return a; } f()</code>', 'undefined (missing argument)'], ['<code>function g() {} g()</code>', 'undefined (no return)'], ['<code>[1, 2][5]</code>', 'undefined (index out of range — no error!)'], ['<code>JSON.stringify({a: undefined})</code>', '"{}" — undefined properties are dropped; null ones are kept']])}<p>Use <code>null</code> yourself when you mean "empty on purpose"; let <code>undefined</code> mean "not provided". APIs like <code>JSON</code> treat them differently.</p>` }
    ],
    deepDive: `<p>🟣 <b>Why typeof null is "object".</b> In the first JavaScript engine (1995), values were stored with a small <b>type tag</b> in their low bits; the tag for objects was <code>000</code>, and <code>null</code> was represented as the NULL pointer — all zero bits — so its tag read as "object". A later proposal to fix it (typeof null === "null") was rejected because it would break existing websites. "Don't break the web" is a core rule of JS evolution, which is why oddities are permanent and new features are added alongside instead.</p>
      <p>🟣 <b>Robust type checks.</b> <code>Object.prototype.toString.call(x)</code> returns tags like <code>"[object Array]"</code>, <code>"[object Date]"</code>, <code>"[object Null]"</code> — it works across iframes (where <code>instanceof Array</code> fails because each frame has its own <code>Array</code>). Objects can customise this tag with <code>Symbol.toStringTag</code>, so it is a strong hint, not a proof.</p>
      <p>🟣 <b>Engine reality.</b> V8 stores small integers ("Smis") directly in the pointer, and everything else (doubles, strings, objects) on the heap. So "primitives live on the stack, objects on the heap" is a simplification — what matters for your code is the <b>semantics</b>: primitives are immutable and behave as values; objects have identity. <code>document.all</code> is the one object in the web platform with <code>typeof</code> "undefined" (a legacy compatibility hack) — a fun interview trivia item.</p>
      <p>🟣 <b>Symbols</b> are guaranteed-unique values used as property keys that cannot clash with string keys — the language itself uses well-known symbols like <code>Symbol.iterator</code> to define how <code>for...of</code> works. <code>Symbol.for("k")</code> is the exception: it returns a shared symbol from a global registry.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> TypeScript plus AI completion means most "what type is this?" questions are answered by your editor before you run anything. Assistants also generate type-guard helpers (<code>isString</code>, <code>isPlainObject</code>) on request.</p>
      <p><b>Use AI as a partner:</b> ask "list every value for which my <code>isObject</code> function gives a wrong answer" — it is good at brainstorming edge cases like <code>null</code>, arrays, <code>Object.create(null)</code>, class instances and cross-realm objects.</p>
      <p><b>Where AI goes wrong:</b> generated code often writes <code>typeof x === "object"</code> and forgets that null passes, or uses <code>x instanceof Array</code> which fails across iframes/realms, or treats <code>NaN</code> as "not a number type". <b>What you must still own:</b> the 8-type mental model, value vs reference semantics, and choosing the right check — runtime data from APIs is untyped even in TypeScript code.</p>`,
    problems: [{
      title: 'A Better typeOf()', level: 'Medium', tags: ['typeof', 'types', 'Object.prototype.toString'], companies: ['Google', 'Atlassian', 'Flipkart'],
      statement: `<p>Write <code>typeOf(x)</code> that fixes typeof's blind spots. It returns a lowercase name: <code>"null"</code> for null, <code>"array"</code> for arrays, <code>"nan"</code> for NaN, <code>"date"</code> for Date objects, <code>"regexp"</code> for regular expressions, and otherwise the normal typeof answer for non-objects (<code>"string"</code>, <code>"number"</code>, <code>"function"</code>, <code>"bigint"</code>…). Other objects get their lowercase built-in tag: <code>"object"</code> for plain objects, <code>"map"</code>, <code>"set"</code>, <code>"error"</code>…</p>`,
      constraints: `Must not throw for any input (including Object.create(null)). Must not mis-classify a plain object as array.`,
      example: `<p><code>typeOf(null)</code> → ${H.c('g', '"null"')} (typeof says "object") · <code>typeOf([1])</code> → ${H.c('g', '"array"')} · <code>typeOf(NaN)</code> → ${H.c('g', '"nan"')} · <code>typeOf(new Date())</code> → ${H.c('g', '"date"')} · <code>typeOf({})</code> → ${H.c('g', '"object"')}</p>`,
      brute: { why: `<p>Plain <code>typeof</code> returns "object" for null, arrays, dates and regexps, and "number" for NaN — four different things collapse into the same answer. Chaining many <code>instanceof</code> checks is long and breaks for objects that come from another iframe/realm.</p>`, code: { lang: 'js', run: true, code: `
function typeOfNaive(x) { return typeof x; }
console.log(typeOfNaive(null), typeOfNaive([]), typeOfNaive(NaN), typeOfNaive(new Date())); // object object number object
` } },
      mcq: { q: 'What does <code>Object.prototype.toString.call([])</code> return?', options: ['<code>"[object Object]"</code>', '<code>"[object Array]"</code>', '<code>""</code>', '<code>"array"</code>'], answer: 1, explain: 'The generic Object.prototype.toString reads the internal class tag: "[object Array]". Array.prototype.toString (used by String([])) would instead join the elements and give "".' },
      hints: [`<p>Handle the special cases first: null (only value equal to null with ===) and NaN (the only value not equal to itself).</p>`, `<p>For objects, <code>Object.prototype.toString.call(x)</code> gives "[object Type]". Slice out <code>Type</code> and lowercase it.</p>`, `<p>Recipe: if x === null → "null"; if typeof x is "number" and Number.isNaN(x) → "nan"; if typeof x is not "object" → return typeof x; else take toString tag "[object Date]" → slice(8, -1) → "Date" → lowercase.</p>`],
      tests: { sig: 'string -> string', fn: 'typeCase', harness: { js: `function typeCase(label) {
  const m = {
    null: () => null, undef: () => undefined, arr: () => [1, 2], emptyArr: () => [], nan: () => NaN, int: () => 42, negzero: () => -0,
    inf: () => Infinity, str: () => 'hi', date: () => new Date(0), re: () => /ab+c/g, obj: () => ({}), nullproto: () => Object.create(null),
    fn: () => () => 1, arrow: () => function* () {}, big: () => 5n, map: () => new Map(), set: () => new Set(), sym: () => Symbol('s'),
    bool: () => true, err: () => new Error('x'), boxed: () => new Number(5), instance: () => new (class A {})(), promise: () => Promise.resolve(1)
  };
  return typeOf(m[label]());
}` }, cases: [
        [["null"],"null"],
        [["undef"],"undefined"],
        [["arr"],"array"],
        [["emptyArr"],"array"],
        [["nan"],"nan"],
        [["int"],"number"],
        [["negzero"],"number"],
        [["inf"],"number"],
        [["str"],"string"],
        [["date"],"date"],
        [["re"],"regexp"],
        [["obj"],"object"],
        [["nullproto"],"object"],
        [["fn"],"function"],
        [["arrow"],"function"],
        [["big"],"bigint"],
        [["map"],"map"],
        [["set"],"set"],
        [["sym"],"symbol"],
        [["bool"],"boolean"],
        [["err"],"error"],
        [["boxed"],"number"],
        [["instance"],"object"],
        [["promise"],"promise"]
      ] },
      solution: {
        approach: `<p>Short-circuit the two primitive oddities (null, NaN), return typeof for every other primitive and functions, and only for objects read the internal tag via the generic <code>Object.prototype.toString</code>. Calling it through <code>.call</code> avoids objects that override or lack their own <code>toString</code> (like <code>Object.create(null)</code>).</p>`,
        code: { lang: 'js', run: true, code: `
function typeOf(x) {
  if (x === null) return "null";                          // typeof says "object"
  if (typeof x === "number" && Number.isNaN(x)) return "nan";
  if (typeof x !== "object") return typeof x;             // string, number, bigint, boolean, undefined, symbol, function
  // "[object Array]" → "Array" → "array"
  return Object.prototype.toString.call(x).slice(8, -1).toLowerCase();
}

const tests = [null, [1, 2], NaN, 42, "hi", new Date(0), /ab+c/, {}, Object.create(null), () => 1, 5n, undefined, new Map()];
for (const t of tests) console.log(typeOf(t));
// null array nan number string date regexp object object function bigint undefined map
` },
        alt: [{ lang: 'ts', code: `
type TypeName = "null" | "nan" | "string" | "number" | "bigint" | "boolean" | "undefined" | "symbol" | "function" | (string & {});

function typeOf(x: unknown): TypeName {
  if (x === null) return "null";
  if (typeof x === "number" && Number.isNaN(x)) return "nan";
  if (typeof x !== "object") return typeof x;
  return Object.prototype.toString.call(x).slice(8, -1).toLowerCase();
}
console.log(typeOf([1]));
` }],
        dry: { head: ['x', 'x === null?', 'NaN?', 'typeof x', 'toString tag', 'returns'], rows: [['null', H.c('g', 'yes'), '—', '—', '—', '"null"'], ['NaN', 'no', H.c('g', 'yes'), '—', '—', '"nan"'], ['"hi"', 'no', 'no', '"string"', '—', '"string"'], ['[1, 2]', 'no', 'no', '"object"', '[object Array]', '"array"'], ['new Date(0)', 'no', 'no', '"object"', '[object Date]', '"date"']] },
        complexity: `<p>O(1) time and space per call.</p>`,
        followUps: ['How could a class make <code>typeOf(instance)</code> return "money"? (Hint: <code>get [Symbol.toStringTag]()</code>.)', 'Write <code>isPlainObject(x)</code> that is true only for <code>{}</code>-style objects.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Strings & template literals
     ===================================================================== */
  topics.push({
    title: 'Strings & Template Literals',
    analogy: `<p>A string is a <b>row of letter tiles glued onto a ruler</b> — each tile sits at a numbered position starting at <b>0</b>. The glue is permanent: you can <i>read</i> any tile, photocopy a section (<code>slice</code>), or make a new ruler in capitals (<code>toUpperCase</code>), but you can never swap a tile on the original. A <b>template literal</b> is a fill-in-the-blanks form: <code>&#96;Dear &#36;{name}, you owe &#36;{amount}&#96;</code> — JavaScript writes the answers into the blanks for you.</p>`,
    explain: `<p>🟢 <b>Making strings.</b> Three kinds of quotes: <code>'single'</code>, <code>"double"</code> (identical — pick one style) and <code>&#96;backticks&#96;</code> (template literals, which can contain <code>&#36;{expressions}</code> and real line breaks). Special characters use a backslash <b>escape</b>: <code>\\n</code> new line, <code>\\t</code> tab, <code>\\\\</code> a backslash, <code>\\'</code> a quote, <code>\\u{1F600}</code> an emoji by code point.</p>
      <p>🟢 <b>Positions start at 0.</b> <code>s.length</code> counts characters (more precisely: UTF-16 code units). <code>s[0]</code> is the first, <code>s[s.length - 1]</code> or <code>s.at(-1)</code> the last. Reading past the end gives <code>undefined</code>, not an error.</p>
      ${H.arr(['J', 'a', 'v', 'a', 'S', 'c', 'r', 'i', 'p', 't'], { label: 's = "JavaScript"', hl: { 0: 'g', 9: 'p' } })}
      <p>🔵 <b>Strings are immutable</b>: every method returns a <b>new</b> string and leaves the original alone. <code>s.toUpperCase()</code> on its own line does nothing useful — you must keep the result: <code>s = s.toUpperCase()</code>.</p>
      ${H.table(['Method', 'Example on <code>"Hello, World"</code>', 'Result'], [
        ['<code>slice(start, end)</code>', '<code>s.slice(0, 5)</code> / <code>s.slice(-5)</code>', '"Hello" / "World" (end is <b>excluded</b>; negatives count from the end)'],
        ['<code>substring(a, b)</code>', '<code>s.substring(5, 0)</code>', '"Hello" (swaps args; negatives become 0)'],
        ['<code>indexOf / lastIndexOf</code>', '<code>s.indexOf("o")</code> / <code>s.lastIndexOf("o")</code>', '4 / 8 (−1 when not found)'],
        ['<code>includes / startsWith / endsWith</code>', '<code>s.includes("World")</code>', 'true'],
        ['<code>toUpperCase / toLowerCase</code>', '<code>s.toLowerCase()</code>', '"hello, world"'],
        ['<code>trim / trimStart / trimEnd</code>', '<code>"  hi  ".trim()</code>', '"hi"'],
        ['<code>split(sep)</code> / <code>arr.join(sep)</code>', '<code>s.split(", ")</code>', '["Hello", "World"]'],
        ['<code>replace / replaceAll</code>', '<code>"a-b-c".replaceAll("-", "+")</code>', '"a+b+c" (replace with a string changes only the FIRST match)'],
        ['<code>padStart / padEnd</code>', '<code>"7".padStart(3, "0")</code>', '"007"'],
        ['<code>repeat(n)</code>', '<code>"ab".repeat(3)</code>', '"ababab"'],
        ['<code>at(i)</code>', '<code>s.at(-1)</code>', '"d"']
      ])}
      <p>🔵 <b>Template literals</b> replace messy <code>+</code> chains: <code>&#96;Total: &#36;{qty * price} USD&#96;</code>. Anything inside <code>&#36;{ }</code> is a full expression (math, function calls, ternaries); its result is converted to a string. They also keep real line breaks, which makes multi-line text and HTML snippets readable.</p>
      <p>🔵 <b>Comparing strings.</b> <code>===</code> checks exact equality (case-sensitive). <code>&lt;</code> / <code>&gt;</code> compare character codes one by one — so <code>"Zebra" &lt; "apple"</code> (uppercase codes are smaller) and <code>"10" &lt; "9"</code> (compares "1" vs "9"). For human sorting use <code>a.localeCompare(b)</code>.</p>`,
    clues: [
      '"Reverse a string / check palindrome / count characters" → index loop, two pointers, or <code>[...s]</code>',
      '"Why does my emoji have length 2?" → <code>length</code> counts UTF-16 code units; use <code>[...s].length</code> or <code>Intl.Segmenter</code>',
      '"I called toUpperCase() but the string did not change" → strings are immutable, keep the return value',
      '"Build a message from variables" → template literal instead of <code>+</code> concatenation',
      '"Sort names alphabetically (case/accents)" → <code>localeCompare</code>, not <code>&lt;</code>',
      '"replace() only changed the first one" → use <code>replaceAll</code> or a regex with the <code>g</code> flag'
    ],
    code: [{ lang: 'js', run: true, title: 'String toolkit', code: `
const s = "Hello, World";

console.log(s.length);              // 12
console.log(s[0], s.at(-1));        // H d
console.log(s[99]);                 // undefined — no error for out-of-range
console.log(s.slice(0, 5));         // Hello   (index 5 is NOT included)
console.log(s.slice(-5));           // World   (negative counts from the end)
console.log(s.indexOf("o"), s.lastIndexOf("o"), s.indexOf("z")); // 4 8 -1
console.log(s.includes("World"), s.startsWith("Hell"));           // true true

// Immutable: methods return NEW strings
const upper = s.toUpperCase();
console.log(s, "|", upper);         // Hello, World | HELLO, WORLD

// split / join round-trip
const words = s.split(", ");
console.log(words.length, words.join(" & "));   // 2 Hello & World

// Template literals: expressions + multi-line
const item = "coffee", qty = 3, price = 2.5;
const receipt = \`Item: \${item.toUpperCase()}
Qty:  \${qty}
Total: $\${(qty * price).toFixed(2)}\`;
console.log(receipt);

// Padding for tables
for (const [name, score] of [["Ana", 7], ["Bartholomew", 10]]) {
  console.log(name.padEnd(12, ".") + String(score).padStart(3, " "));
}
` }],
    codeTitle: ['Everyday string methods'],
    viz: {
      title: 'String inspector: indexes, slice and immutability',
      input: 'Hello, World',
      inputLabel: 'Any text (2–20 characters)',
      gen: function (input) {
        var s = String(input === undefined ? '' : input);
        if (s.length < 2 || s.length > 20) throw new Error('Type between 2 and 20 characters');
        var chars = s.split(''), n = s.length, frames = [];
        function A(label, hl, ptr, range) { return { type: 'array', label: label, values: chars.map(function (c) { return c === ' ' ? '␣' : c; }), hl: hl || {}, ptr: ptr || {}, range: range }; }
        frames.push({ narr: 'The string <code>' + esc(JSON.stringify(s)) + '</code> is a row of ' + n + ' characters. Positions (indexes) start at <b>0</b>, so the last one is <b>' + (n - 1) + '</b> = length − 1. (␣ marks a space.)', parts: [A('s', {}, {}), { type: 'vars', vals: { 's.length': n, 'last index': n - 1 } }] });
        var p0 = {}; p0[0] = 's[0]'; p0[n - 1] = 's.at(-1)';
        var h0 = {}; h0[0] = 'ok'; h0[n - 1] = 'sel';
        frames.push({ narr: '<code>s[0]</code> is <b>' + esc(JSON.stringify(chars[0])) + '</b>. The last character can be read as <code>s[s.length - 1]</code> or, more simply, <code>s.at(-1)</code> → <b>' + esc(JSON.stringify(chars[n - 1])) + '</b>. <code>s[' + n + ']</code> is <b>undefined</b> — no error.', parts: [A('s', h0, p0), { type: 'vars', vals: { 's[0]': show(chars[0]), 's.at(-1)': show(chars[n - 1]), 's[length]': 'undefined' }, hl: { 's[0]': 'ok', 's.at(-1)': 'sel' } }] });
        var target = chars[Math.min(4, n - 1)] === ' ' ? chars[1] : chars[Math.min(4, n - 1)];
        var first = s.indexOf(target), last = s.lastIndexOf(target), h1 = {}, p1 = {};
        for (var i = 0; i < n; i++) if (chars[i] === target) h1[i] = 'win';
        h1[first] = 'ok'; p1[first] = 'indexOf'; if (last !== first) { h1[last] = 'sel'; p1[last] = 'lastIndexOf'; }
        frames.push({ narr: '<code>s.indexOf(' + esc(JSON.stringify(target)) + ')</code> scans left→right and returns the FIRST match: <b>' + first + '</b>. <code>lastIndexOf</code> scans from the right: <b>' + last + '</b>. If nothing matches you get <b>−1</b> (so test with <code>!== -1</code>, or just use <code>includes</code>).', parts: [A('s', h1, p1), { type: 'vars', vals: { indexOf: first, lastIndexOf: last, 'includes': 'true' } }] });
        var k = Math.min(5, n - 1), h2 = {}, p2 = {};
        for (i = 0; i < k; i++) h2[i] = 'win';
        h2[k] = 'bad'; p2[0] = 'start 0'; p2[k] = 'end ' + k + ' (excluded)';
        frames.push({ narr: '<code>s.slice(0, ' + k + ')</code> copies from index 0 up to but <b>not including</b> ' + k + ' → <b>' + esc(JSON.stringify(s.slice(0, k))) + '</b>. Think of the indexes as fence posts BETWEEN letters: you get exactly end − start = ' + k + ' characters.', parts: [A('s', h2, p2, [0, k - 1]), { type: 'vars', vals: { ['slice(0, ' + k + ')']: show(s.slice(0, k)), 'length of piece': k }, hl: { ['slice(0, ' + k + ')']: 'ok' } }] });
        var m = Math.min(5, n - 1), h3 = {}, p3 = {};
        for (i = n - m; i < n; i++) h3[i] = 'win';
        p3[n - m] = '-' + m;
        frames.push({ narr: 'Negative numbers count from the end: <code>s.slice(-' + m + ')</code> = <code>s.slice(' + (n - m) + ')</code> → <b>' + esc(JSON.stringify(s.slice(-m))) + '</b>. (<code>substring</code> treats negatives as 0 — another reason to prefer slice.)', parts: [A('s', h3, p3, [n - m, n - 1]), { type: 'vars', vals: { ['slice(-' + m + ')']: show(s.slice(-m)), ['substring(-' + m + ')']: show(s.substring(-m)) }, hl: { ['substring(-' + m + ')']: 'bad' } }] });
        var up = s.toUpperCase();
        frames.push({ narr: '<code>const up = s.toUpperCase()</code> builds a <b>brand-new</b> string. The original is untouched — strings are immutable. Writing <code>s[0] = "J"</code> is silently ignored (TypeError in strict mode).', parts: [A('s (unchanged)', {}), { type: 'array', label: 'up (new string)', values: up.split('').map(function (c) { return c === ' ' ? '␣' : c; }), hl: (function () { var h = {}; for (var j = 0; j < n; j++) if (up[j] !== chars[j]) h[j] = 'ok'; return h; })() }] });
        var sep = s.indexOf(', ') >= 0 ? ', ' : s.indexOf(' ') >= 0 ? ' ' : '';
        var parts = s.split(sep);
        frames.push({ narr: '<code>s.split(' + esc(JSON.stringify(sep)) + ')</code> cuts the string at every separator and returns an <b>array</b> of ' + parts.length + ' piece(s)' + (sep === '' ? ' — with "" every character becomes its own piece' : '') + '. <code>arr.join(sep)</code> glues them back.', parts: [{ type: 'array', label: 'split result', values: parts.slice(0, 20), hl: { 0: 'ok' } }, { type: 'vars', vals: { 'pieces': parts.length, 'join back equals s?': String(parts.join(sep) === s) } }] });
        var tpl = 'Length of "' + s + '" is ' + n + ' and it ' + (s === s.split('').reverse().join('') ? 'IS' : 'is NOT') + ' a palindrome';
        frames.push({ narr: 'A template literal fills the blanks: <code>&#96;Length of "&#36;{s}" is &#36;{s.length} and it &#36;{isPal ? "IS" : "is NOT"} a palindrome&#96;</code> → each <code>&#36;{…}</code> is evaluated and turned into text.', parts: [{ type: 'code', lang: 'js', label: 'template', code: 'const isPal = s === [...s].reverse().join("");\nconst msg = `Length of "${s}" is ${s.length} and it ${isPal ? "IS" : "is NOT"} a palindrome`;', hl: { 2: 'cur' } }, { type: 'text', html: '<b>msg</b> = ' + esc(JSON.stringify(tpl)) }] });
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: emoji length', html: `<p><code>"😀".length</code> is <b>2</b>, not 1. JavaScript strings are sequences of 16-bit <b>code units</b> (UTF-16); characters outside the basic range (most emoji) need two units, a "surrogate pair". Spreading <code>[..."😀"]</code> iterates by <b>code point</b> → 1. Family emoji like 👨‍👩‍👧 are several code points joined — only <code>Intl.Segmenter</code> counts what a human calls "one character" (a grapheme).</p>`, code: { lang: 'js', run: true, code: `
const e = "😀";
console.log(e.length);              // 2   (UTF-16 code units)
console.log([...e].length);         // 1   (code points)
console.log("naïve".length);        // 5
const fam = "👨‍👩‍👧";
console.log(fam.length, [...fam].length);   // 8 5
const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
console.log([...seg.segment(fam)].length);  // 1 — what a human sees
` } },
      { title: 'Predict the output: forgetting immutability', html: `<p>The first <code>trim()</code> result is thrown away, so <code>name</code> is unchanged and its length stays 7. Reassigning fixes it. This bug is common in interviews when candidates "clean" input and then use the original.</p>`, code: { lang: 'js', run: true, code: `
let name = "  Ana  ";
name.trim();                        // result discarded!
console.log(name.length);           // 7
name = name.trim();                 // keep the new string
console.log(name.length, \`[\${name}]\`);   // 3 [Ana]
` } },
      { title: 'Comparing and sorting strings correctly', html: `${H.table(['Expression', 'Result', 'Why'], [['<code>"apple" &lt; "banana"</code>', 'true', '"a" (97) &lt; "b" (98)'], ['<code>"Zebra" &lt; "apple"</code>', H.c('y', 'true'), 'uppercase letters have smaller codes (Z = 90)'], ['<code>"10" &lt; "9"</code>', H.c('y', 'true'), 'character by character: "1" &lt; "9"'], ['<code>"é".localeCompare("f", "fr")</code>', '-1', 'locale-aware: é sorts before f'], ['<code>"a".localeCompare("B", undefined, {sensitivity: "base"})</code>', '-1', 'case-insensitive ordering']])}`, code: { lang: 'js', run: true, code: `
const names = ["émile", "Zoe", "adam", "Bob"];
console.log([...names].sort().join(", "));                         // Bob, Zoe, adam, émile (code-unit order)
console.log([...names].sort((a, b) => a.localeCompare(b)).join(", ")); // adam, Bob, émile, Zoe
` } },
      { title: 'Tagged templates (bonus)', html: `<p>A <b>tag</b> is a function placed before a template literal. It receives the fixed text pieces and the interpolated values separately, so it can escape, translate or format them. Libraries use this for SQL (safe parameters), CSS-in-JS and GraphQL. <code>String.raw</code> is a built-in tag that keeps backslashes literally.</p>`, code: { lang: 'js', run: true, code: `
function money(strings, ...values) {
  // strings: the fixed text pieces; values: the \${...} results
  return strings.reduce((out, str, i) =>
    out + str + (i < values.length ? "$" + Number(values[i]).toFixed(2) : ""), "");
}
const price = 3, tax = 0.255;
console.log(money\`Price \${price} + tax \${tax}\`);   // Price $3.00 + tax $0.26
console.log(String.raw\`C:\\new\\table\`);             // C:\\new\\table — no escapes processed
` } }
    ],
    deepDive: `<p>🟣 <b>UTF-16 under the hood.</b> The spec defines a string as a sequence of 16-bit unsigned integers. <code>length</code>, indexing, <code>slice</code> and <code>charCodeAt</code> all work on these code units; <code>codePointAt</code>, <code>for...of</code>, spread and <code>Array.from</code> work on code points. Slicing in the middle of a surrogate pair produces a "lone surrogate" (garbage character) — <code>s.isWellFormed()</code> / <code>toWellFormed()</code> (ES2024) detect and repair that. Use <code>normalize("NFC")</code> before comparing user text: "é" can be one code point or "e" + a combining accent.</p>
      <p>🟣 <b>Performance.</b> Engines store Latin-1-only strings with 1 byte per character and others with 2. Repeated <code>+=</code> in a loop used to be O(n²); V8 now builds a <b>rope</b> (a tree of pieces) and flattens it lazily, so <code>+=</code> is usually fine — but <code>arr.push(piece)</code> + <code>arr.join("")</code> is still a predictable choice for very large outputs. <code>slice</code> may create a "sliced string" pointing into the parent, which can keep a huge parent string alive in memory.</p>
      <p>🟣 <b>Edge cases.</b> <code>replace</code> with a string pattern replaces only the first match and interprets <code>$&amp;</code>, <code>$1</code> in the replacement; <code>replaceAll</code> with a regex requires the <code>g</code> flag (else TypeError). <code>split("")</code> splits by code unit and breaks emoji — use <code>[...s]</code>. <code>"abc".at(-4)</code> is undefined, <code>"abc".slice(-4)</code> is "abc". Comparing with <code>==</code> to numbers coerces: <code>"42" == 42</code> is true — always use <code>===</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> string manipulation is where AI completion shines — padding tables, building messages, parsing simple formats are near-instant. Regexes, which used to cost an hour, can be drafted and explained in seconds.</p>
      <p><b>Use AI as a partner:</b> "Write the function, then give me 10 tricky test strings (emoji, accents, empty, whitespace-only, very long)". Also ask it to <b>explain</b> any regex it writes token by token before you trust it.</p>
      <p><b>Where AI goes wrong:</b> it routinely uses <code>split("").reverse().join("")</code> (breaks emoji), <code>length</code> as "number of characters" for user-visible limits, <code>&lt;</code> for sorting names, and builds HTML or SQL by string concatenation (injection risk — use tagged templates/parameters). <b>What you must still own:</b> knowing that strings are UTF-16 code units, that methods return new strings, and when locale-aware APIs (<code>Intl</code>, <code>localeCompare</code>) are required.</p>`,
    problems: [{
      title: 'Valid Palindrome (ignore case and symbols)', level: 'Easy', tags: ['strings', 'two pointers'], companies: ['Meta', 'Microsoft', 'Amazon'],
      statement: `<p>Return <code>true</code> if string <code>s</code> reads the same forwards and backwards after <b>lower-casing</b> it and <b>removing every character that is not a letter or digit</b>.</p>`,
      constraints: `1 ≤ s.length ≤ 2·10<sup>5</sup>; s contains printable ASCII characters.`,
      example: `<p><code>"A man, a plan, a canal: Panama"</code> → cleaned ${H.c('b', '"amanaplanacanalpanama"')} → ${H.c('g', 'true')}.<br><code>"race a car"</code> → ${H.c('b', '"raceacar"')} → reversed "racaecar" → ${H.c('r', 'false')}.</p>`,
      brute: { why: `<p>Clean the whole string, build a reversed copy, compare. Correct and O(n) time, but it allocates several full copies (lower-cased, cleaned, split array, reversed array, joined string) — about 5n extra memory. It also cannot stop early: <code>"ab…"</code> is rejected only after all the copying.</p>`, code: { lang: 'js', run: true, code: `
function isPalindromeCopy(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return clean === clean.split("").reverse().join("");
}
console.log(isPalindromeCopy("A man, a plan, a canal: Panama"), isPalindromeCopy("race a car"));
` } },
      mcq: { q: 'Two pointers L=0 and R=s.length−1. s[L] is ",". What should you do?', options: ['Return false', 'Move L right (skip it)', 'Move R left', 'Compare it with s[R] anyway'], answer: 1, explain: 'Non-alphanumeric characters are ignored, so skip them by moving that pointer inward. Only compare when both pointers sit on letters/digits.' },
      hints: [`<p>A palindrome compares the first with the last, the second with the second-last… — two pointers walking toward each other.</p>`, `<p>Skip characters that are not letters/digits with a small helper (a regex test <code>/[a-z0-9]/i</code> or char-code ranges). Compare lower-cased characters.</p>`, `<p>Recipe: L = 0, R = n − 1. While L &lt; R: move L right while it is a symbol; move R left while it is a symbol; if lower(s[L]) !== lower(s[R]) return false; L++, R−−. Return true. Empty/only-symbols strings are palindromes.</p>`],
      tests: { sig: 'string -> bool', fn: 'isPalindrome', cases: [
        [["A man, a plan, a canal: Panama"],true],
        [["race a car"],false],
        [[" .,"],true],
        [["a"],true],
        [["ab"],false],
        [["0P"],false],
        [["Aa"],true],
        [["ab@a"],true],
        [["ab_a"],true],
        [["No 'x' in Nixon"],true],
        [["12 21"],true],
        [["1a2"],false],
        [[{"$rep":"a","n":200000}],true],
        [[{"$concat":[{"$rep":"a","n":100000},"b",{"$rep":"a","n":100000}]}],true],
        [[{"$concat":[{"$rep":"a","n":100000},"b",{"$rep":"a","n":99998},"c"]}],false],
        [[{"$concat":[{"$rep":".","n":100000},"x",{"$rep":",","n":100000}]}],true]
      ] },
      solution: {
        approach: `<p>Two pointers, no copies: skip non-alphanumerics from both ends and compare case-insensitively. Stops at the first mismatch.</p>`,
        code: { lang: 'js', run: true, code: `
function isAlnum(ch) {
  const c = ch.charCodeAt(0);
  return (c >= 48 && c <= 57) ||   // 0-9
         (c >= 65 && c <= 90) ||   // A-Z
         (c >= 97 && c <= 122);    // a-z
}

function isPalindrome(s) {
  let L = 0, R = s.length - 1;
  while (L < R) {
    while (L < R && !isAlnum(s[L])) L++;          // skip symbols on the left
    while (L < R && !isAlnum(s[R])) R--;          // skip symbols on the right
    if (s[L].toLowerCase() !== s[R].toLowerCase()) return false;   // mismatch → stop early
    L++;
    R--;
  }
  return true;
}

console.log(isPalindrome("A man, a plan, a canal: Panama")); // true
console.log(isPalindrome("race a car"));                     // false
console.log(isPalindrome(" .,"));                            // true (nothing to compare)
` },
        dry: { head: ['L', 'R', 's[L]', 's[R]', 'action'], rows: [['0', '29', '"A"', '"a"', 'a = a ✓, move both'], ['1', '28', '" "', '"m"', 'skip L → 2 ("m")'], ['2', '28', '"m"', '"m"', 'm = m ✓'], ['…', '…', '…', '…', 'pointers meet in the middle'], ['15', '15', '—', '—', H.c('g', 'L ≥ R → true')]] },
        complexity: `<p>Time O(n): each pointer moves at most n steps. Space O(1).</p>`,
        followUps: ['Valid Palindrome II: may delete at most one character.', 'Make it Unicode-aware (accented letters, emoji) using <code>/\\p{L}|\\p{N}/u</code> and code-point iteration.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Numbers, NaN, Infinity, BigInt
     ===================================================================== */
  function numExplain(s) {
    var n = Number(s), pi = parseInt(s), pf = parseFloat(s), t = s.trim(), why = [];
    if (t === '') why.push('Number() treats an empty/blank string as <b>0</b>, but parseInt/parseFloat find no digits → <b>NaN</b>');
    else if (/^[+-]?0[xX][0-9a-fA-F]+$/.test(t)) why.push('hex text: Number() and parseInt() understand the 0x prefix; parseFloat() reads "0" then stops at "x"');
    else if (/^[+-]?\d*\.?\d+[eE][+-]?\d+$/.test(t)) why.push('exponent notation: Number() and parseFloat() understand "e"; parseInt() stops at the first non-digit ("." or "e")');
    else if (/^[+-]?(Infinity)$/.test(t)) why.push('"Infinity" is valid for Number() and parseFloat(), but parseInt() only accepts digits → NaN');
    else if (!isNaN(n)) why.push('a clean number (spaces around it are trimmed) → every function agrees' + (pi !== n && !isNaN(pi) ? ', except parseInt() which drops the decimals' : ''));
    else if (!isNaN(pf)) why.push('Number() is <b>strict</b>: the WHOLE string must be numeric, so "' + esc(t) + '" → NaN. parseInt/parseFloat are <b>lenient</b>: they read digits from the start and stop at the first character they don\'t understand');
    else why.push('no leading digits at all → everything gives NaN');
    return why.join('. ');
  }
  topics.push({
    title: 'Numbers: Floating Point, NaN, Infinity, -0 & BigInt',
    analogy: `<p>JavaScript numbers are like a <b>calculator with a fixed-size display</b>. Every number — 7, 3.5, a price, a population — goes into the same 64-bit display (an IEEE-754 "double"). Whole numbers up to about 9 quadrillion fit exactly; decimals like 0.1 have to be <b>rounded</b> to the nearest value the display can show, just like 1/3 can only be written as 0.3333… on paper. <code>NaN</code> is the display showing <b>"Error"</b>, <code>Infinity</code> is <b>"Overflow"</b>. When you need numbers bigger than the display, <b>BigInt</b> is a strip of paper that grows as long as you need.</p>`,
    explain: `<p>🟢 <b>One number type.</b> <code>42</code>, <code>-7</code>, <code>3.14</code> and <code>1e6</code> are all <code>"number"</code>. You can write <code>1_000_000</code> (underscores for readability), <code>0xFF</code> (hex = 255), <code>0b1010</code> (binary = 10), <code>0o17</code> (octal = 15).</p>
      <p>🟢 <b>Arithmetic.</b> <code>+ - * /</code> as usual, <code>%</code> remainder, <code>**</code> power. <code>/</code> never rounds: <code>7 / 2</code> is <code>3.5</code>. For whole-number division use <code>Math.floor(7 / 2)</code> (or <code>Math.trunc</code> for negatives toward 0). <code>%</code> keeps the sign of the <b>left</b> number: <code>-7 % 3</code> is <code>-1</code>, not 2.</p>
      <p>🔵 <b>Precision.</b> Integers are exact only up to <code>Number.MAX_SAFE_INTEGER</code> = 2<sup>53</sup> − 1 = 9,007,199,254,740,991. Beyond that, neighbours merge: <code>9007199254740992 === 9007199254740993</code> is <b>true</b>. Decimals are stored in binary, and most decimal fractions (0.1, 0.2, 0.3) cannot be represented exactly — hence the famous <code>0.1 + 0.2 === 0.30000000000000004</code>.</p>
      ${H.table(['Special value', 'How you get it', 'Key facts'], [
        ['<code>NaN</code> ("Not a Number")', '<code>0 / 0</code>, <code>"abc" * 2</code>, <code>Math.sqrt(-1)</code>, <code>Number("12px")</code>', H.c('r', 'NaN !== NaN') + '; any math with NaN gives NaN; test with <code>Number.isNaN(x)</code>'],
        ['<code>Infinity</code> / <code>-Infinity</code>', '<code>1 / 0</code>, <code>-1 / 0</code>, <code>Number.MAX_VALUE * 2</code>', 'dividing by zero does NOT throw; test with <code>Number.isFinite(x)</code>'],
        ['<code>-0</code>', '<code>0 * -1</code>, <code>Math.round(-0.4)</code>', '<code>-0 === 0</code> is true; <code>Object.is(-0, 0)</code> is false; <code>1 / -0</code> is -Infinity']
      ])}
      <p>🔵 <b>Text → number.</b> <code>Number(s)</code> (or the shortcut <code>+s</code>) is <b>strict</b>: the whole string must be a number (spaces around are fine; <code>""</code> → 0). <code>parseInt(s, 10)</code> and <code>parseFloat(s)</code> are <b>lenient</b>: they read from the start and stop at the first unexpected character — <code>parseInt("42px")</code> is 42. Always pass the radix 10 to <code>parseInt</code>.</p>
      <p>🔵 <b>Number → text.</b> <code>String(n)</code>, <code>n.toString(2)</code> (binary), <code>n.toFixed(2)</code> (fixed decimals — returns a <b>string</b>), <code>n.toLocaleString("en-IN")</code> (grouping like 12,34,567). <b>Math</b> helpers: <code>Math.round</code> (halves round UP toward +∞: <code>Math.round(-2.5)</code> is -2), <code>floor</code>, <code>ceil</code>, <code>trunc</code>, <code>abs</code>, <code>max</code>, <code>min</code>, <code>random()</code> (0 ≤ r &lt; 1).</p>
      <p>🔵 <b>BigInt</b> for huge whole numbers: add <code>n</code>: <code>2n ** 64n</code> = 18446744073709551616n exactly. You cannot mix BigInt and number in math (<code>1n + 1</code> → TypeError) — convert explicitly with <code>BigInt(x)</code> or <code>Number(b)</code>. BigInt division truncates: <code>7n / 2n</code> is <code>3n</code>.</p>`,
    clues: [
      '"Why is 0.1 + 0.2 not 0.3?" → binary floating point; compare with a tolerance or work in integer cents',
      '"IDs / timestamps larger than 2<sup>53</sup> get corrupted" → beyond MAX_SAFE_INTEGER; use BigInt or keep them as strings',
      '"Check if a value is NaN" → <code>Number.isNaN</code> (never <code>x === NaN</code>)',
      '"parseInt vs Number" / "parseInt(0.0000005)" questions → lenient vs strict parsing, and parseInt converts its input to a string first',
      '"Money / prices / currency" → integer minor units (cents/paise) or a decimal library, never raw floats',
      '"Integer division / remainder with negatives" → <code>Math.floor</code> vs <code>Math.trunc</code>, sign of <code>%</code>'
    ],
    code: [{ lang: 'js', run: true, title: 'Number facts you can verify', code: `
console.log(7 / 2, Math.floor(7 / 2), Math.trunc(-7 / 2), Math.floor(-7 / 2)); // 3.5 3 -3 -4
console.log(-7 % 3, 7 % -3);                    // -1 1  (sign follows the LEFT operand)
console.log(2 ** 10, 1_000_000, 0xff, 0b1010);  // 1024 1000000 255 10

// Precision
console.log(0.1 + 0.2);                          // 0.30000000000000004
console.log(0.1 + 0.2 === 0.3);                  // false
console.log(Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON);   // true (tolerance compare)
console.log(Number.MAX_SAFE_INTEGER, 2 ** 53 === 2 ** 53 + 1); // 9007199254740991 true

// Special values (String() so every console shows them the same way)
console.log(String(0 / 0), String(1 / 0), String(-1 / 0));    // NaN Infinity -Infinity
console.log(NaN === NaN, Number.isNaN(NaN), Object.is(NaN, NaN)); // false true true
console.log(isNaN("hello"), Number.isNaN("hello"));            // true false  (global isNaN converts first!)
console.log(Object.is(-0, 0), String(1 / -0));                  // false -Infinity

// Parsing
console.log(Number("42"), +"42", Number(""), Number(" 12 "), String(Number("12px"))); // 42 42 0 12 NaN
console.log(parseInt("42px", 10), parseFloat("3.14abc"), parseInt("0x1F"), parseInt("101", 2)); // 42 3.14 31 5

// Formatting
console.log((1234.5678).toFixed(2), typeof (1.5).toFixed(1));  // 1234.57 string
console.log((255).toString(16), (1234567.891).toLocaleString("en-US")); // ff 1,234,567.891

// BigInt
console.log(String(2n ** 64n), String(7n / 2n));                 // 18446744073709551616 3
try { console.log(1n + 1); } catch (e) { console.log(e.name + ": " + e.message); }
` }],
    codeTitle: ['Numbers in practice'],
    viz: [{
      title: 'Text → number: Number() vs parseInt() vs parseFloat()',
      input: '42 | 3.14abc | "" | 0x1F | 1e3 | 12px | abc | " 7 " | Infinity',
      inputLabel: 'Strings separated by | (wrap in "quotes" to keep spaces)',
      gen: function (input) {
        var items = String(input || '').split('|').map(function (x) { var t = x.trim(); return /^".*"$/.test(t) ? t.slice(1, -1) : t; });
        if (!items.length || items.length > 12) throw new Error('Enter 1–12 strings separated by |');
        var frames = [], rows = [];
        frames.push({ narr: 'Three ways to read a number out of text. <b>Number(s)</b> (same as <code>+s</code>) is strict: all-or-nothing. <b>parseInt(s, 10)</b> and <b>parseFloat(s)</b> are lenient: read the digits at the start, stop at the first stranger.', parts: [
          { type: 'code', lang: 'js', label: 'the three tools', code: 'Number(s)        // whole string must be numeric\nparseInt(s, 10)  // leading whole number, stops at first non-digit\nparseFloat(s)    // leading decimal number (understands . and e)' }
        ] });
        items.forEach(function (s, i) {
          var n = Number(s), pi = parseInt(s, 10), pf = parseFloat(s), pix = parseInt(s);
          rows.push([JSON.stringify(s), show(n), show(pi), show(pf)]);
          var hl = {}; hl[i] = 'cur';
          var chars = s.length ? s.split('').map(function (c) { return c === ' ' ? '␣' : c; }) : ['(empty)'];
          var stop = -1;
          var m = /^\s*[+-]?\d+/.exec(s); if (m) stop = m[0].length;
          var ah = {}; if (stop >= 0) { for (var k = 0; k < stop; k++) ah[k] = 'ok'; if (stop < s.length) ah[stop] = 'bad'; } else if (s.length) ah[0] = 'bad';
          frames.push({ narr: '<code>' + esc(JSON.stringify(s)) + '</code>: ' + numExplain(s) + '. Number → <b>' + esc(show(n)) + '</b>, parseInt → <b>' + esc(show(pi)) + '</b>' + (pix !== pi && !(isNaN(pix) && isNaN(pi)) ? ' (without radix 10: ' + esc(show(pix)) + ')' : '') + ', parseFloat → <b>' + esc(show(pf)) + '</b>.', parts: [
            { type: 'array', label: 'characters (green = digits parseInt keeps, red = where it stops)', values: chars, hl: ah },
            { type: 'table', label: 'results', columns: ['string', 'Number(s)', 'parseInt(s, 10)', 'parseFloat(s)'], rows: rows.map(function (r) { return r.slice(); }), hl: hl },
            { type: 'vars', vals: { 'Number.isNaN(Number(s))': String(Number.isNaN(n)) }, hl: { 'Number.isNaN(Number(s))': Number.isNaN(n) ? 'bad' : 'ok' } }
          ] });
        });
        frames.push({ narr: 'Rule of thumb: validate user input with <b>Number()</b> + <code>Number.isNaN</code>/<code>Number.isFinite</code> (rejects "12px"); use <b>parseInt/parseFloat</b> only when you deliberately want to pull a number off the front of text such as "12px" or "3.5rem". And remember <code>Number("")</code> is 0 — check for empty input separately!', parts: [
          { type: 'table', label: 'final comparison', columns: ['string', 'Number(s)', 'parseInt(s, 10)', 'parseFloat(s)'], rows: rows, hl: {} }
        ] });
        return frames;
      }
    }, {
      title: 'Why 0.1 + 0.2 !== 0.3 (and how to fix it)',
      input: '0.1 + 0.2',
      inputLabel: 'Two decimals: a + b',
      gen: function (input) {
        var m = /^\s*(-?\d*\.?\d+)\s*\+\s*(-?\d*\.?\d+)\s*$/.exec(String(input || ''));
        if (!m) throw new Error('Write two decimal numbers like  0.1 + 0.2');
        var as = m[1], bs = m[2], a = Number(as), b = Number(bs);
        var dec = function (t) { var i = t.indexOf('.'); return i < 0 ? 0 : t.length - i - 1; };
        var d = Math.max(dec(as), dec(bs));
        if (d > 9) throw new Error('Use at most 9 decimal places');
        var P = Math.pow(10, d), ia = Math.round(a * P), ib = Math.round(b * P);
        var sum = a + b, exact = (ia + ib) / P, same = sum === exact;
        return [
          { narr: 'You typed the decimals <b>' + esc(as) + '</b> and <b>' + esc(bs) + '</b>. Computers store numbers in <b>binary</b> (base 2). Just like 1/3 = 0.3333… never ends in decimal, most decimal fractions never end in binary — so they get <b>rounded</b> to the nearest storable value.', parts: [{ type: 'vars', label: 'what you typed', vals: { a: as, b: bs } }] },
          { narr: 'Here are the values that are <b>actually stored</b> (shown with 21 significant digits). The tiny tails are the rounding errors.', parts: [{ type: 'table', label: 'stored doubles', columns: ['typed', 'actually stored'], rows: [[as, a.toPrecision(21)], [bs, b.toPrecision(21)], [String(exact) + ' (the answer you expect)', exact.toPrecision(21)]], hl: { 0: 'cur', 1: 'cur' } }] },
          { narr: 'The CPU adds the two stored values exactly, then rounds the result to the nearest double: <b>' + esc(sum.toPrecision(21)) + '</b>. JavaScript prints the shortest text that identifies that double: <b>' + esc(String(sum)) + '</b>.', parts: [{ type: 'vars', label: 'a + b', vals: { 'stored sum': sum.toPrecision(21), 'printed as': String(sum) }, hl: { 'printed as': same ? 'ok' : 'bad' } }] },
          { narr: same ? 'Lucky case: the rounded sum lands on exactly the same double as the literal <b>' + esc(String(exact)) + '</b>, so <code>===</code> is true. Rounding errors still exist — they just cancelled out here.' : 'The literal <b>' + esc(String(exact)) + '</b> is stored as a <i>different</i> double (' + esc(exact.toPrecision(21)) + '), so <code>a + b === ' + esc(String(exact)) + '</code> is <span class="c-r"><b>false</b></span>. The difference is ' + esc(String(sum - exact)) + '.', parts: [{ type: 'vars', label: 'comparison', vals: { ['a + b === ' + exact]: String(same), difference: String(sum - exact) }, hl: { ['a + b === ' + exact]: same ? 'ok' : 'bad' } }] },
          { narr: 'Fix 1 — compare with a <b>tolerance</b>: <code>Math.abs(x - y) &lt; Number.EPSILON</code> (EPSILON ≈ 2.2e-16 is right for numbers near 1; for big numbers scale it: <code>EPSILON * Math.max(|x|, |y|)</code>).', parts: [{ type: 'code', lang: 'js', code: 'const close = Math.abs((a + b) - ' + exact + ') < Number.EPSILON;   // ' + (Math.abs(sum - exact) < Number.EPSILON), hl: { 1: 'ok' } }] },
          { narr: 'Fix 2 (best for money) — use <b>integers</b>: ' + esc(as) + ' → ' + ia + ', ' + esc(bs) + ' → ' + ib + ' (units of 1/' + P + '). Integer math is exact: ' + ia + ' + ' + ib + ' = ' + (ia + ib) + ' → format only at the end: <b>' + ((ia + ib) / P).toFixed(d) + '</b>.', parts: [{ type: 'table', label: 'integer units', columns: ['value', 'x ' + P, 'exact?'], rows: [[as, String(ia), 'yes'], [bs, String(ib), 'yes'], ['sum', String(ia + ib), 'yes → ' + ((ia + ib) / P).toFixed(d)]], hl: { 2: 'ok' } }] },
          { narr: 'Fix 3 — for display only, round when printing: <code>(a + b).toFixed(' + d + ')</code> → "' + esc(sum.toFixed(d)) + '". Careful: toFixed returns a <b>string</b> and inherits the binary error too (e.g. <code>(1.005).toFixed(2)</code> is "1.00"). Never use it for the math itself.', parts: [{ type: 'vars', vals: { 'toFixed result': JSON.stringify(sum.toFixed(d)), 'typeof': 'string' }, hl: { 'typeof': 'sel' } }] }
        ];
      }
    }],
    examples: [
      { title: 'Predict the output: parseInt surprises', html: `<p><code>parseInt(0.0000005)</code> is <b>5</b>: parseInt converts its argument to a string first, and <code>String(0.0000005)</code> is <code>"5e-7"</code>; reading digits stops at "e". <code>["1", "2", "3"].map(parseInt)</code> gives <b>[1, NaN, NaN]</b> because <code>map</code> passes the index as the radix: <code>parseInt("2", 1)</code> and <code>parseInt("3", 2)</code> are invalid.</p>`, code: { lang: 'js', run: true, code: `
console.log(String(0.0000005), parseInt(0.0000005));       // 5e-7 5
console.log(["1", "2", "3"].map(parseInt).map(String));    // ["1","NaN","NaN"]
console.log(["1", "2", "3"].map(Number));                  // [1,2,3] — the correct way
console.log(parseInt("08"), parseInt("1e3"), Number("1e3")); // 8 1 1000
` } },
      { title: 'Predict the output: the edges of safe integers', html: `<p>Above 2<sup>53</sup> the gap between storable integers becomes 2, then 4, … So adding 1 can do nothing. Real-world bug: 64-bit database IDs or tweet IDs parsed with <code>JSON.parse</code> silently change their last digits. Keep such IDs as <b>strings</b>, or parse them as BigInt.</p>`, code: { lang: 'js', run: true, code: `
const big = 2 ** 53;                         // 9007199254740992
console.log(big + 1 === big);                // true — the +1 is lost
console.log(Number.isSafeInteger(big - 1), Number.isSafeInteger(big)); // true false
console.log(JSON.parse('{"id": 1234567890123456789}').id);  // 1234567890123456800 (corrupted)
console.log(String(BigInt("1234567890123456789") + 1n));     // 1234567890123456790 (exact)
` } },
      { title: 'Rounding to N decimals correctly', html: `<p><code>Math.round(1.005 * 100) / 100</code> gives 1 (not 1.01) because 1.005 is stored as 1.00499999…. A robust trick shifts the decimal point using exponent notation in a <b>string</b> (no binary multiplication), then rounds. For money, the real fix is integer minor units or <code>Intl.NumberFormat</code> for display.</p>`, code: { lang: 'js', run: true, code: `
function roundTo(x, places) {
  // "1.005e2" is parsed exactly as 100.5, so Math.round gives 101
  return Number(Math.round(Number(x + "e" + places)) + "e-" + places);
}
console.log(Math.round(1.005 * 100) / 100);   // 1      (wrong)
console.log(roundTo(1.005, 2));               // 1.01   (right)
console.log(new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(1234.5)); // $1,234.50
` } },
      { title: 'NaN is contagious — find where it started', html: `<p>One <code>undefined</code> in a sum turns the whole total into NaN, and NaN never throws an error, so bugs travel far from their cause. Check inputs at the boundary with <code>Number.isFinite</code>.</p>${H.table(['Step', 'Value'], [['<code>let total = 0</code>', '0'], ['<code>total += 10</code>', '10'], ['<code>total += cart.missingField</code> (undefined)', H.c('r', 'NaN')], ['<code>total += 5</code>', H.c('r', 'NaN') + ' forever'], ['<code>total &gt; 0</code>, <code>total &lt; 0</code>, <code>total === total</code>', H.c('r', 'false, false, false')]])}` }
    ],
    deepDive: `<p>🟣 <b>IEEE-754 double layout.</b> 64 bits = 1 sign bit + 11 exponent bits + 52 fraction bits (53 bits of precision with the hidden leading 1). Value = (−1)<sup>sign</sup> × 1.fraction × 2<sup>exponent−1023</sup>. That is why integers are exact up to 2<sup>53</sup>, why <code>Number.EPSILON</code> = 2<sup>−52</sup> (the gap after 1.0), and why <code>Number.MAX_VALUE</code> ≈ 1.8 × 10<sup>308</sup>. All-ones exponent encodes Infinity (fraction 0) and NaN (fraction ≠ 0) — there are actually millions of NaN bit patterns, which JS hides.</p>
      <p>🟣 <b>Bitwise operators convert to 32-bit integers.</b> <code>x | 0</code>, <code>~~x</code>, <code>x &gt;&gt; 0</code> truncate to a signed 32-bit int — handy in old code, but wrong above 2<sup>31</sup>: <code>2 ** 31 | 0</code> is −2147483648. Use <code>Math.trunc</code>. <code>&gt;&gt;&gt; 0</code> gives an unsigned 32-bit value.</p>
      <p>🟣 <b>Engine reality.</b> V8 keeps small integers as tagged "Smis" (31/32-bit) without allocation and switches to heap-boxed doubles when a value stops fitting — so code that mixes ints and floats in hot loops can be slower. <code>Number.prototype.toString</code> prints the <b>shortest</b> decimal that round-trips to the same double (that's why 0.1 prints as "0.1" although it is not exactly 0.1). <code>Math.round</code> rounds .5 toward +∞ (so −2.5 → −2), unlike "banker's rounding" in some languages. For financial math, TC39's Decimal proposal is still in progress in 2026; production code uses integer minor units or libraries such as decimal.js / big.js.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> you rarely hand-write currency formatting or parsing anymore — ask for an <code>Intl.NumberFormat</code> setup and you get it. AI is also excellent at explaining a surprising float result if you paste it.</p>
      <p><b>Use AI as a partner:</b> "Review this price calculation for floating-point bugs and suggest an integer-cents version", or "generate test cases around 2<sup>53</sup>, -0, NaN and very small decimals".</p>
      <p><b>Where AI goes wrong:</b> it often suggests <code>parseFloat(x.toFixed(2))</code> as a "fix" (still float), uses global <code>isNaN</code>, forgets the radix in <code>parseInt</code>, or uses <code>Number(id)</code> on 64-bit IDs. <b>What you must still own:</b> the mental model of doubles (exact integers to 2<sup>53</sup>, rounded fractions), the decision to use integer units or BigInt, and validating untrusted numeric input with <code>Number.isFinite</code>.</p>`,
    problems: [{
      title: 'Shopping Cart Total Without Float Errors', level: 'Medium', tags: ['numbers', 'floating point', 'strings', 'money'], companies: ['Stripe', 'Shopify', 'Razorpay', 'PayPal'],
      statement: `<p>Each cart line is <code>{ price: "19.99", qty: 3 }</code> where <code>price</code> is a decimal <b>string</b> with at most 2 decimals. Return the total as a string with exactly two decimals, e.g. <code>"59.97"</code>. The result must be exact for any realistic cart.</p>`,
      constraints: `1 ≤ lines ≤ 10<sup>4</sup>; 0 ≤ price ≤ 10<sup>6</sup>; 1 ≤ qty ≤ 1000; prices like "5", "5.5", "0.10".`,
      example: `<p>Cart: <code>[{price:"0.10", qty:1}, {price:"0.20", qty:1}]</code> → ${H.c('g', '"0.30"')}. Summing floats gives 0.30000000000000004 — printing it raw shows the error; toFixed hides it here but not always (try many lines of 1.005-style values).<br>Cart: <code>[{price:"19.99", qty:3}]</code> → 1999 × 3 = 5997 cents → ${H.c('g', '"59.97"')}.</p>`,
      brute: { why: `<p><code>parseFloat</code> each price and add floats. Every addition can add a tiny rounding error, errors <b>accumulate</b> over thousands of lines, and <code>toFixed</code> at the end can then round the wrong way. You are relying on luck.</p>`, code: { lang: 'js', run: true, code: `
function cartTotalFloat(lines) {
  let total = 0;
  for (const line of lines) total += parseFloat(line.price) * line.qty;   // float errors pile up
  return total;                                                             // e.g. 0.30000000000000004
}
console.log(cartTotalFloat([{ price: "0.10", qty: 1 }, { price: "0.20", qty: 1 }]));
` } },
      mcq: { q: 'What is the safest way to turn the price string "19.9" into cents?', options: ['<code>Math.round(parseFloat("19.9") * 100)</code> — always exact', 'Split on ".", pad the fraction to 2 digits, combine as integers: 19 * 100 + 90', '<code>parseInt("19.9") * 100</code>', '<code>Number("19.9") | 0</code>'], answer: 1, explain: 'Splitting the TEXT never goes through binary fractions, so it is exact by construction. Math.round(x*100) is usually right but relies on the error being smaller than 0.5 cents; parseInt and |0 drop the fraction.' },
      hints: [`<p>Floats cannot hold 0.1 exactly, but integers up to 2<sup>53</sup> are exact. Convert everything to <b>cents</b> (integers) first.</p>`, `<p>The price arrives as text — you can parse the whole part and the fractional part separately as integers, without ever creating a fraction: "5.5" → whole "5", frac "5" → pad to "50".</p>`, `<p>Recipe: for each line, cents = whole * 100 + Number(frac.padEnd(2, "0")); total += cents * qty. At the end: units = Math.floor(total / 100), rest = total % 100 → \`units.rest\` with rest padded to 2 digits.</p>`],
      tests: { sig: 'string[] int[] -> string', fn: 'cart', harness: { js: `function cart(prices, qtys) { return cartTotal(prices.map((p, i) => ({ price: p, qty: qtys[i] }))); }` }, cases: [
        [[["0.10","0.20"],[1,1]],"0.30"],
        [[["19.99"],[3]],"59.97"],
        [[["5","5.5"],[2,1]],"15.50"],
        [[{"$rep":"0.01","n":1000},{"$rep":1,"n":1000}],"10.00"],
        [[["0"],[1]],"0.00"],
        [[["0.07"],[3]],"0.21"],
        [[["100"],[1000]],"100000.00"],
        [[["0.99"],[1000]],"990.00"],
        [[["0.5","0.5"],[1,1]],"1.00"],
        [[["3.1"],[1]],"3.10"],
        [[{"$rep":"999999.99","n":10000},{"$rep":1000,"n":10000}],"9999999900000.00"],
        [[{"$rep":"0.10","n":10000},{"$rep":3,"n":10000}],"3000.00"]
      ] },
      solution: {
        approach: `<p>Exact integer arithmetic in cents. Parsing the price string by hand means no binary fraction is ever created; sums of integers stay exact while below 2<sup>53</sup> (≈ 90 trillion dollars in cents — plenty). Formatting happens once, at the end.</p>`,
        code: { lang: 'js', run: true, code: `
function toCents(price) {
  const [whole, frac = ""] = price.trim().split(".");
  if (!/^\\d+$/.test(whole) || !/^\\d{0,2}$/.test(frac)) throw new Error("Bad price: " + price);
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));   // "5.5" → 500 + 50
}

function cartTotal(lines) {
  let cents = 0;
  for (const { price, qty } of lines) cents += toCents(price) * qty;   // integers: exact
  const units = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, "0");
  return \`\${units}.\${rest}\`;
}

console.log(cartTotal([{ price: "0.10", qty: 1 }, { price: "0.20", qty: 1 }]));  // 0.30
console.log(cartTotal([{ price: "19.99", qty: 3 }]));                            // 59.97
console.log(cartTotal([{ price: "5", qty: 2 }, { price: "5.5", qty: 1 }]));      // 15.50
const many = Array.from({ length: 1000 }, () => ({ price: "0.01", qty: 1 }));
console.log(cartTotal(many));                                                    // 10.00
` },
        dry: { head: ['line', 'whole', 'frac → padded', 'cents', 'x qty', 'running total'], rows: [['"0.10" x 1', '0', '"10"', '10', '10', '10'], ['"0.20" x 1', '0', '"20"', '20', '20', '30'], ['format', '—', '—', '—', '—', H.c('g', '30 → "0.30"')]] },
        complexity: `<p>Time O(n) over the lines (each price string is tiny). Space O(1).</p>`,
        followUps: ['Support negative amounts (refunds) and a "-" sign in the formatter.', 'Apply an 18% tax rounded half-up per line — in integer cents.', 'When would you switch to BigInt cents?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Operators, precedence & coercion
     ===================================================================== */
  var INCPROG = 'let i = 5;\nconst a = i++;\nconst b = ++i;\nconst c = i-- + --i;\ni += 10;\ni **= 2;';
  topics.push({
    title: 'Operators, Precedence & Type Coercion (== vs ===)',
    analogy: `<p>Operators are the <b>buttons on a calculator</b>: <code>+</code>, <code>*</code>, <code>===</code>, <code>&amp;&amp;</code>. Precedence is the <b>"BODMAS/PEMDAS" rule</b> that says which button acts first. Coercion is a helpful but overeager <b>translator</b>: if you hand JavaScript a word and a number and say "plus", it doesn't complain — it quietly translates one so both speak the same language. <code>===</code> is a strict border guard ("same type AND same value, or no entry"); <code>==</code> is a guard who first translates your passport and then decides.</p>`,
    explain: `<p>🟢 <b>The operator families.</b></p>
      ${H.table(['Family', 'Operators', 'Example → result'], [
        ['Arithmetic', '<code>+ - * / % **</code>, unary <code>-x</code> <code>+x</code>', '<code>2 ** 3 * 2</code> → 16'],
        ['Assignment', '<code>= += -= *= /= %= **=</code>, <code>&amp;&amp;= ||= ??=</code>', '<code>x ??= 5</code> sets x only if it is null/undefined'],
        ['Increment', '<code>x++ ++x x-- --x</code>', 'postfix returns the OLD value, prefix the NEW one'],
        ['Comparison', '<code>&lt; &gt; &lt;= &gt;=</code>', '<code>"b" &gt; "a"</code> → true'],
        ['Equality', '<code>=== !==</code> (strict), <code>== !=</code> (loose)', '<code>1 === "1"</code> → false; <code>1 == "1"</code> → true'],
        ['Logical', '<code>&amp;&amp; || !</code> and <code>??</code>', '<code>"" || "guest"</code> → "guest"'],
        ['Conditional', '<code>cond ? a : b</code>', '<code>age &gt;= 18 ? "adult" : "minor"</code>'],
        ['Other', '<code>typeof</code>, <code>in</code>, <code>instanceof</code>, <code>void</code>, comma', '<code>"a" in {a: 1}</code> → true']
      ])}
      <p>🔵 <b>Precedence (who goes first)</b>, highest to lowest: grouping <code>( )</code> → unary <code>! - + typeof ++ --</code> → <code>**</code> → <code>* / %</code> → <code>+ -</code> → <code>&lt; &gt; &lt;= &gt;=</code> → <code>== != === !==</code> → <code>&amp;&amp;</code> → <code>|| ??</code> → <code>? :</code> → assignment. Same level → left to right, except <code>**</code>, <code>? :</code> and assignment (right to left: <code>2 ** 3 ** 2</code> = 2<sup>9</sup> = 512). When in doubt, add parentheses — readers will thank you.</p>
      <p>🔵 <b>The + operator is overloaded.</b> If either side (after turning objects into primitives) is a <b>string</b>, <code>+</code> <b>joins text</b>; otherwise it adds numbers. Every other arithmetic operator (<code>- * / % **</code>) always converts to numbers. So <code>"5" + 2</code> → "52" but <code>"5" - 2</code> → 3. And it is evaluated left to right: <code>1 + 2 + "3"</code> → "33", while <code>"1" + 2 + 3</code> → "123".</p>
      <p>🔵 <b>=== vs ==.</b> <code>===</code> (strict) never converts: different types → false. <code>==</code> (loose) converts using a set of rules: null and undefined equal each other only; booleans become numbers; strings become numbers when compared to numbers; objects become primitives. Use <code>===</code> everywhere; the one idiom some teams allow is <code>x == null</code> meaning "null or undefined".</p>
      <p>🔵 <b>Logical operators return one of their operands</b>, not necessarily true/false: <code>a || b</code> returns the first <b>truthy</b> value (or the last one), <code>a &amp;&amp; b</code> returns the first <b>falsy</b> value (or the last one), <code>a ?? b</code> returns <code>a</code> unless it is null/undefined. They <b>short-circuit</b>: the right side is not evaluated if the left already decides.</p>`,
    clues: [
      '"What does <code>[] + {}</code> / <code>"5" - 2 + "1"</code> / <code>true + true</code> print?" → ToPrimitive, then + joins strings, other operators convert to numbers',
      '"Difference between == and ===" → loose equality coerces with fixed rules; strict never coerces',
      '"<code>x++</code> vs <code>++x</code>" output puzzles → postfix returns the old value',
      '"Why does <code>null &gt;= 0</code> give true but <code>null == 0</code> false?" → relational converts null to 0, equality does not',
      '"Give a default value" → <code>||</code> (any falsy) vs <code>??</code> (only null/undefined)',
      '"Why is <code>-2 ** 2</code> an error?" → unary minus before ** is ambiguous, JS forces parentheses'
    ],
    code: [{ lang: 'js', run: true, title: 'Operators and coercion you should be able to predict', code: `
// + joins as soon as a string is involved; - * / always do math
console.log("5" + 2, "5" - 2, "5" * "2", 1 + 2 + "3", "1" + 2 + 3);   // 52 3 10 33 123
console.log(true + true, true + "1", null + 1, String(undefined + 1));  // 2 true1 1 NaN

// Objects are first converted to primitives
console.log([] + [], [1, 2] + [3], String([] + {}));     // "" "1,23" "[object Object]"

// Strict vs loose equality
console.log(1 === "1", 1 == "1");                         // false true
console.log(null == undefined, null === undefined);       // true false
console.log(null == 0, null >= 0, undefined == 0);        // false true false
console.log(NaN == NaN, [] == false, [] == ![]);          // false true true
console.log(Object.is(NaN, NaN), Object.is(0, -0));       // true false

// Logical operators return operands
console.log(0 || "fallback", "x" && "y", null ?? "default", 0 ?? "default");  // fallback y default 0

// Logical assignment (ES2021)
const settings = { theme: "", retries: 0 };
settings.theme ||= "dark";      // "" is falsy → replaced
settings.retries ??= 3;         // 0 is not null/undefined → kept
settings.lang ??= "en";         // missing → set
console.log(JSON.stringify(settings));   // {"theme":"dark","retries":0,"lang":"en"}

// Precedence & associativity
console.log(2 + 3 * 4, (2 + 3) * 4, 2 ** 3 ** 2, (-2) ** 2);  // 14 20 512 4
const age = 20;
console.log(age >= 18 ? "adult" : "minor");
` }],
    codeTitle: ['Operator cheat-run'],
    viz: [{
      title: 'Coercion stepper — watch JavaScript convert types',
      input: '"5" - 2 + "1"',
      inputLabel: 'A JS expression made of literals',
      gen: exprFrames
    }, {
      title: 'Loose equality algorithm: why [] == ![] is true',
      input: '[] == ![]',
      inputLabel: 'An expression using == (try null == 0, "1" == true, [1,2] == "1,2")',
      gen: exprFrames
    }, {
      title: 'Prefix vs postfix ++ / -- and compound assignment',
      gen: function () {
        var F = [];
        function fr(line, narr, vals, hl) { var h = {}; h[line] = 'cur'; F.push({ narr: narr, parts: [{ type: 'code', lang: 'js', label: 'program', code: INCPROG, hl: h }, { type: 'vars', label: 'variables', vals: vals, hl: hl || {} }] }); }
        fr(1, '<code>i</code> starts at 5.', { i: 5 }, { i: 'ok' });
        fr(2, '<code>i++</code> is <b>postfix</b>: it hands out the OLD value (5) to <code>a</code>, then bumps i to 6.', { i: 6, a: 5 }, { a: 'ok', i: 'cur' });
        fr(3, '<code>++i</code> is <b>prefix</b>: bump first (i becomes 7), then hand out the NEW value 7 to <code>b</code>.', { i: 7, a: 5, b: 7 }, { b: 'ok', i: 'cur' });
        fr(4, 'Left to right: <code>i--</code> gives the old 7 and makes i 6; then <code>--i</code> makes i 5 and gives 5. So <code>c = 7 + 5 = 12</code>, and i is 5. (Code like this is legal but unreadable — avoid it in real code.)', { i: 5, a: 5, b: 7, c: 12 }, { c: 'ok', i: 'cur' });
        fr(5, '<code>i += 10</code> means <code>i = i + 10</code> → 15.', { i: 15, a: 5, b: 7, c: 12 }, { i: 'ok' });
        fr(6, '<code>i **= 2</code> means <code>i = i ** 2</code> → 225.', { i: 225, a: 5, b: 7, c: 12 }, { i: 'ok' });
        F.push({ narr: 'Rule: <b>x++ → use, then add</b>; <b>++x → add, then use</b>. In a statement on its own (<code>i++;</code>) both are identical. In loops, <code>i++</code> and <code>i += 1</code> are equivalent and both fine.', parts: [{ type: 'table', label: 'summary', columns: ['expression', 'returns', 'i afterwards (i was 5)'], rows: [['i++', '5', '6'], ['++i', '6', '6'], ['i--', '5', '4'], ['--i', '4', '4']], hl: { 0: 'sel', 1: 'ok' } }] });
        return F;
      }
    }],
    examples: [
      { title: 'Predict the output: the "banana" classic', html: `<p><code>"b" + "a" + +"a" + "a"</code> → <b>"baNaNa"</b>. The <code>+"a"</code> in the middle is a <b>unary plus</b> (convert to number) → NaN, which then gets joined as the text "NaN". Run it in the coercion stepper above to see each step.</p>`, code: { lang: 'js', run: true, code: `
console.log("b" + "a" + +"a" + "a");    // baNaNa
console.log(("b" + "a" + +"a" + "a").toLowerCase());  // banana
` } },
      { title: 'Predict the output: comparisons that look broken', html: `${H.table(['Expression', 'Result', 'Rule'], [['<code>"10" &lt; "9"</code>', H.c('y', 'true'), 'both strings → compare text "1" vs "9"'], ['<code>"10" &lt; 9</code>', 'false', 'one number → "10" becomes 10'], ['<code>null &gt;= 0</code>', H.c('y', 'true'), 'relational: null → 0, and 0 &gt;= 0'], ['<code>null == 0</code>', 'false', 'equality: null only == undefined'], ['<code>undefined &gt; 0</code>, <code>undefined &lt; 0</code>, <code>undefined == 0</code>', 'false, false, false', 'undefined → NaN; every comparison with NaN is false'], ['<code>1 &lt; 2 &lt; 3</code>, <code>3 &gt; 2 &gt; 1</code>', 'true, ' + H.c('r', 'false'), '(3 &gt; 2) is true → true &gt; 1 → 1 &gt; 1 → false']])}`, code: { lang: 'js', run: true, code: `
console.log("10" < "9", "10" < 9, null >= 0, null == 0);   // true false true false
console.log(1 < 2 < 3, 3 > 2 > 1);                        // true false
` } },
      { title: 'Short-circuiting as control flow', html: `<p>Because <code>&amp;&amp;</code> stops at the first falsy value, <code>user &amp;&amp; user.name</code> is a classic guard against reading a property of null (today written <code>user?.name</code>). <code>||</code> picks the first truthy value — a quick default. The right-hand side is <b>not evaluated</b> when skipped, so side effects there never happen.</p>`, code: { lang: 'js', run: true, code: `
let calls = 0;
function expensive() { calls++; return "computed"; }

const cached = "from cache";
const value = cached || expensive();     // expensive() never runs
console.log(value, "calls =", calls);    // from cache calls = 0

const user = null;
console.log(String(user && user.name));  // null — no TypeError
console.log(String(user?.name));         // undefined — optional chaining
` } },
      { title: 'Which equality to use?', html: `${H.table(['Need', 'Use', 'Notes'], [['Normal comparisons', '<code>===</code> / <code>!==</code>', 'no surprises'], ['null OR undefined check', '<code>x == null</code> or <code>x ?? fallback</code>', 'the only widely accepted == idiom'], ['NaN-aware or -0-aware equality', '<code>Object.is(a, b)</code>', 'Object.is(NaN, NaN) is true; Object.is(0, -0) is false'], ['Comparing objects by content', 'loop / JSON / deep-equal helper', '=== compares references only']])}` }
    ],
    deepDive: `<p>🟣 <b>ToPrimitive in full.</b> When an object meets an operator, the engine calls <code>obj[Symbol.toPrimitive](hint)</code> if it exists; otherwise, for hint "number"/"default" it tries <code>valueOf()</code> then <code>toString()</code>, and for hint "string" the reverse, taking the first one that returns a primitive. Arrays and plain objects return themselves from valueOf, so toString wins: <code>[1,2]</code> → "1,2", <code>{}</code> → "[object Object]". <code>Date</code> objects prefer the string hint for <code>+</code>, which is why <code>new Date() + 1</code> gives a long date string while <code>new Date() - 0</code> gives milliseconds.</p>
      <p>🟣 <b>The == algorithm (IsLooselyEqual).</b> (1) Same type → <code>===</code>. (2) null/undefined → true only with each other. (3) number vs string → ToNumber(string). (4) bigint vs string → StringToBigInt. (5) boolean → ToNumber(boolean), retry. (6) object vs primitive → ToPrimitive(object), retry. (7) bigint vs number → compare mathematical values. (8) otherwise false. That's all — eight rules explain every "WAT" meme. <code>[] == ![]</code>: <code>![]</code> is false → 0; <code>[]</code> → "" → 0; 0 == 0.</p>
      <p>🟣 <b>Gotchas in the grammar.</b> <code>{} + []</code> typed at the <i>start</i> of a console line gives <b>0</b>, because <code>{}</code> is parsed as an empty <b>block</b> and the rest is <code>+[]</code>. <code>a ?? b || c</code> is a SyntaxError — <code>??</code> cannot be mixed with <code>||</code>/<code>&amp;&amp;</code> without parentheses. <code>-2 ** 2</code> is a SyntaxError (math says −4, others expect 4; JS refuses to guess). The comma operator evaluates both sides and returns the right one: <code>(1, 2)</code> → 2. <code>x = y = 5</code> works because assignment is right-associative and returns the assigned value.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> linters with AI-assisted fixes (and TypeScript's strict mode) catch most coercion bugs — <code>eqeqeq</code> rules auto-replace <code>==</code> with <code>===</code>, and type checkers flag <code>string + number</code> mixes.</p>
      <p><b>Use AI as a partner:</b> paste an expression and ask "show the coercion steps per the ECMAScript spec, then confirm by running it". Compare its steps with the stepper above — it's a great way to learn, and to catch the AI when it is wrong.</p>
      <p><b>Where AI goes wrong:</b> language models are notoriously unreliable at predicting output puzzles like <code>[] + {}</code> or <code>null &gt;= 0</code> from memory, and confidently invent rules. They also "simplify" <code>x ?? 0</code> to <code>x || 0</code> (changing behaviour for 0 and ""). <b>What you must still own:</b> the + rule, the == rules and precedence — interviewers ask these precisely because they test real understanding, and you need them to review AI-written code.</p>`,
    problems: [{
      title: 'Fix the Form Adder ("10" + "20" = "1020")', level: 'Medium', tags: ['coercion', 'operators', 'validation'], companies: ['Zoho', 'Freshworks', 'Adobe'],
      statement: `<p>A form gives you field values as <b>strings</b> (or <code>null</code> for untouched fields), e.g. <code>["10", " 20 ", "", null, "2.5"]</code>. Write <code>sumFields(values)</code> that returns the <b>numeric</b> sum. Blank strings and null count as 0. Any other non-numeric value (e.g. <code>"12px"</code>, <code>"abc"</code>) must throw an Error naming the bad value.</p>`,
      constraints: `0 ≤ values.length ≤ 10<sup>5</sup>. Values are strings, numbers or null.`,
      example: `<p><code>["10", " 20 ", "", null, "2.5"]</code> → ${H.c('g', '32.5')}. The buggy version returns ${H.c('r', '"010 20 null2.5"')} because <code>0 + "10"</code> switches <code>+</code> into text-joining mode forever.</p>`,
      brute: { why: `<p>Using <code>+=</code> directly on strings: the first string turns the running total into a string and every later <code>+</code> concatenates. Using <code>parseFloat</code> instead "fixes" it but silently accepts <code>"12px"</code> as 12 and turns blank into NaN.</p>`, code: { lang: 'js', run: true, code: `
function sumFieldsBuggy(values) {
  let total = 0;
  for (const v of values) total += v;      // 0 + "10" → "010" — now it's a string
  return total;
}
console.log(sumFieldsBuggy(["10", " 20 ", "", null, "2.5"]));   // "010 20 null2.5"
` } },
      mcq: { q: 'Which conversion rejects <code>"12px"</code> but accepts <code>" 20 "</code>?', options: ['<code>parseInt(v, 10)</code>', '<code>parseFloat(v)</code>', '<code>Number(v)</code> / unary <code>+v</code>', '<code>v | 0</code>'], answer: 2, explain: 'Number() requires the whole string (after trimming whitespace) to be numeric: " 20 " → 20, "12px" → NaN. parseInt/parseFloat accept the leading digits of "12px"; | 0 also truncates decimals.' },
      hints: [`<p>The bug: <code>+</code> concatenates as soon as one side is a string. Convert each value to a number <b>before</b> adding.</p>`, `<p>Handle blank/null first (<code>v == null || String(v).trim() === ""</code> → 0), because <code>Number("")</code> is 0 but <code>Number(null)</code> is also 0 — make the intent explicit. Then use strict <code>Number(v)</code> and check <code>Number.isFinite</code>.</p>`, `<p>Recipe: total = 0; for each v: if null or blank → continue; n = Number(v); if !Number.isFinite(n) → throw new Error(\`Bad value: \${v}\`) ; total += n. Return total.</p>`.replace(/\$\{/g, '&#36;{').replace(/`/g, '&#96;')],
      tests: { sig: 'string[] -> string', fn: 'sumSafe', check: `(args, out, exp) => typeof exp === 'number' ? out === exp : (typeof out === 'string' && out.startsWith('throws:') && out.includes(exp))`, harness: { js: `function sumSafe(values) { try { return sumFields(values); } catch (e) { return 'throws:' + e.message; } }` }, cases: [
        [[["10"," 20 ","",null,"2.5"]],32.5],
        [[[]],0],
        [[["5","12px"]],"12px"],
        [[[null,null]],0],
        [[[1,2,3]],6],
        [[["-3","3"]],0],
        [[["abc"]],"abc"],
        [[["   "]],0],
        [[["1e3"]],1000],
        [[["10",5]],15],
        [[["Infinity"]],"Infinity"],
        [[["2","x1","y2"]],"x1"],
        [[{"$rep":"1","n":100000}],100000]
      ] },
      solution: {
        approach: `<p>Normalise every input to a real number before any <code>+</code>: treat null/blank explicitly, convert with the strict <code>Number()</code>, reject anything not finite (NaN, Infinity). The accumulator stays a number the whole time.</p>`,
        code: { lang: 'js', run: true, code: `
function sumFields(values) {
  let total = 0;                                   // stays a number throughout
  for (const v of values) {
    if (v == null || String(v).trim() === "") continue;   // null/undefined/blank → 0
    const n = Number(v);                           // strict: "12px" → NaN, " 20 " → 20
    if (!Number.isFinite(n)) throw new Error(\`Bad value: \${JSON.stringify(v)}\`);
    total += n;                                    // number + number → real addition
  }
  return total;
}

console.log(sumFields(["10", " 20 ", "", null, "2.5"]));   // 32.5
console.log(sumFields([]));                                 // 0
try { sumFields(["5", "12px"]); } catch (e) { console.log(e.message); }   // Bad value: "12px"
` },
        dry: { head: ['v', 'blank/null?', 'Number(v)', 'finite?', 'total'], rows: [['"10"', 'no', '10', 'yes', '10'], ['" 20 "', 'no', '20', 'yes', '30'], ['""', H.c('y', 'yes → skip'), '—', '—', '30'], ['null', H.c('y', 'yes → skip'), '—', '—', '30'], ['"2.5"', 'no', '2.5', 'yes', H.c('g', '32.5')]] },
        complexity: `<p>O(n) time, O(1) extra space.</p>`,
        followUps: ['Return all bad values at once instead of throwing on the first.', 'Sum money fields exactly (see the cart-total problem).', 'How would TypeScript\'s types have prevented the original bug?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Truthy & falsy, || vs ??
     ===================================================================== */
  topics.push({
    title: 'Truthy & Falsy, Boolean Logic and || vs ??',
    analogy: `<p>A nightclub bouncer checks one thing: "Are you on the <b>banned list</b>?" The banned list is short — exactly <b>eight</b> names: <code>false</code>, <code>0</code>, <code>-0</code>, <code>0n</code>, <code>""</code>, <code>null</code>, <code>undefined</code>, <code>NaN</code>. Everyone else walks in — even someone wearing a T-shirt that says "false" (<code>"false"</code>), an empty backpack (<code>[]</code>) or an empty box (<code>{}</code>). That's how <code>if (x)</code> works: it doesn't ask "is x true?", it asks "is x on the falsy list?"</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Whenever JavaScript needs a yes/no — in <code>if</code>, <code>while</code>, <code>? :</code>, <code>!</code>, <code>&amp;&amp;</code>, <code>||</code> — it converts the value with <b>ToBoolean</b>. Values that become <code>false</code> are called <b>falsy</b>; everything else is <b>truthy</b>.</p>
      ${H.chips(['false', '0', '-0', '0n', '""', 'null', 'undefined', 'NaN'], { label: 'The ONLY 8 falsy values', hl: { 'false': 'r', '0': 'r', '-0': 'r', '0n': 'r', '""': 'r', 'null': 'r', 'undefined': 'r', 'NaN': 'r' } })}
      ${H.chips(['"0"', '"false"', '" "', '[]', '{}', '-1', 'Infinity', 'function(){}', 'new Boolean(false)'], { label: 'Surprisingly TRUTHY', hl: { '"0"': 'g', '"false"': 'g', '" "': 'g', '[]': 'g', '{}': 'g' } })}
      <p>🔵 <b>Convert explicitly</b> with <code>Boolean(x)</code> or the double-bang <code>!!x</code> (the first <code>!</code> converts and flips, the second flips back).</p>
      <p>🔵 <b>Defaults: <code>||</code> vs <code>??</code>.</b> <code>a || b</code> falls back when <code>a</code> is <b>any falsy</b> value; <code>a ?? b</code> (nullish coalescing, ES2020) falls back <b>only</b> when <code>a</code> is <code>null</code> or <code>undefined</code>. That difference matters whenever <code>0</code>, <code>""</code> or <code>false</code> are valid values:</p>
      ${H.table(['a', '<code>a || "default"</code>', '<code>a ?? "default"</code>'], [['<code>0</code> (e.g. volume = 0)', H.c('r', '"default" (bug!)'), H.c('g', '0')], ['<code>""</code> (user cleared the name)', H.c('r', '"default"'), H.c('g', '""')], ['<code>false</code> (notifications off)', H.c('r', '"default"'), H.c('g', 'false')], ['<code>null</code> / <code>undefined</code>', '"default"', '"default"'], ['<code>"Asha"</code>', '"Asha"', '"Asha"']])}
      <p>🔵 <b>Truthiness is not equality.</b> <code>if ([])</code> runs (arrays are objects → truthy), yet <code>[] == false</code> is <b>true</b> (because <code>==</code> converts both to numbers: 0 == 0). Never compare to booleans with <code>==</code>; just write <code>if (x)</code> or be explicit: <code>if (arr.length &gt; 0)</code>, <code>if (str !== "")</code>, <code>if (n !== 0)</code>.</p>
      <p>🔵 <b>Common checks done right:</b> empty array → <code>arr.length === 0</code>; empty object → <code>Object.keys(obj).length === 0</code>; "has a value" (but 0 allowed) → <code>x != null</code> or <code>x !== undefined</code>.</p>`,
    clues: [
      '"List the falsy values in JavaScript" → exactly 8: false, 0, -0, 0n, "", null, undefined, NaN',
      '"Is an empty array / empty object truthy?" → yes, all objects are truthy',
      '"The setting 0 (or empty string) is replaced by the default" → <code>||</code> used where <code>??</code> was needed',
      '"What does !!x do?" → converts to a real boolean',
      '"<code>if ([] == false)</code> and <code>if ([])</code> both run — why?" → == coerces to numbers, if uses ToBoolean',
      '"<code>document.all</code> is falsy" trivia → the single legacy object that is falsy (browser only)'
    ],
    code: [{ lang: 'js', run: true, title: 'Truthiness explorer', code: `
const values = [false, 0, -0, 0n, "", null, undefined, NaN, "0", "false", " ", [], {}, -1, Infinity];
for (const v of values) {
  // String() so every console prints the same thing; arrays/objects shown via JSON
  const label = Object.is(v, -0) ? "-0" : typeof v === "object" && v !== null ? JSON.stringify(v) : (typeof v === "string" ? JSON.stringify(v) : String(v) + (typeof v === "bigint" ? "n" : ""));
  console.log(label.padEnd(10), Boolean(v) ? "truthy" : "falsy");
}

// || vs ?? for defaults
const volume = 0;
console.log("volume || 50 =", volume || 50);   // 50  — 0 was a real choice, lost!
console.log("volume ?? 50 =", volume ?? 50);   // 0   — kept

// !! converts to boolean
const name = "Asha";
console.log(!!name, !!"", !![]);               // true false true

// Short-circuit returns operands
console.log("" || null || "first truthy" || "never");   // first truthy
console.log(1 && "a" && 0 && "never");                  // 0 (first falsy)
` }],
    codeTitle: ['Truthy/falsy in code'],
    viz: {
      title: 'The bouncer: truthy or falsy?',
      input: '0; "0"; ""; " "; []; {}; null; undefined; NaN; -0; 0n; "false"; 42',
      inputLabel: 'Values separated by ;',
      gen: function (input) {
        var items = splitList(input, ';', 14), frames = [], rows = [], falsy = [], truthy = [];
        var prog = 'if (x) {\n  console.log("truthy");\n} else {\n  console.log("falsy");\n}\nconst a = x || "default";\nconst b = x ?? "default";';
        frames.push({ narr: 'For each value we run <code>if (x)</code> (ToBoolean) and compute the two default operators. Remember: only 8 values are falsy.', parts: [{ type: 'code', lang: 'js', label: 'program', code: prog }, { type: 'set', label: 'the falsy list', items: ['false', '0', '-0', '0n', '""', 'null', 'undefined', 'NaN'], hl: {} }] });
        items.forEach(function (src) {
          var rv;
          try { rv = readValue(src); } catch (e) { throw new Error('Could not read "' + src + '": ' + e.message); }
          var v = rv.v, t = !!v, s = show(v);
          var or = v || 'default', nn = (v !== null && v !== undefined) ? v : 'default';
          if (t) { if (truthy.indexOf(s) < 0) truthy.push(s); } else if (falsy.indexOf(s) < 0) falsy.push(s);
          rows.push([src, t ? 'truthy' : 'falsy', show(or), show(nn)]);
          var why = t ? (isPrim(v) ? 'it is not on the falsy list' : 'it is an <b>object</b> — every object is truthy, even an empty one') : 'it is one of the 8 falsy values';
          if (typeof v === 'string' && t && (v === '0' || v === 'false' || v.trim() === '')) why = 'a <b>non-empty string</b> is truthy no matter what it says';
          var hl = {}; hl[t ? 2 : 4] = t ? 'ok' : 'bad';
          var rh = {}; rh[rows.length - 1] = t ? 'ok' : 'bad';
          var differs = show(or) !== show(nn);
          frames.push({ narr: '<code>x = ' + esc(src) + '</code> is <b>' + (t ? 'truthy' : 'falsy') + '</b> because ' + why + '. ' + (differs ? '<span class="c-y">Note: <code>||</code> and <code>??</code> disagree here!</span> ' : '') + '<code>x || "default"</code> → ' + esc(show(or)) + ', <code>x ?? "default"</code> → ' + esc(show(nn)) + '.', parts: [
            { type: 'code', lang: 'js', label: 'program', code: prog, hl: (function () { var h = {}; h[1] = 'cur'; h[t ? 2 : 4] = t ? 'ok' : 'bad'; h[6] = differs ? 'sel' : ''; h[7] = differs ? 'sel' : ''; return h; })() },
            { type: 'table', label: 'results', columns: ['x', 'if (x)', 'x || "default"', 'x ?? "default"'], rows: rows.map(function (r) { return r.slice(); }), hl: rh },
            { type: 'set', label: 'falsy seen', items: falsy.slice(), hl: (function () { var h = {}; if (!t) h[s] = 'bad'; return h; })() },
            { type: 'set', label: 'truthy seen', items: truthy.slice(), hl: (function () { var h = {}; if (t) h[s] = 'ok'; return h; })() }
          ] });
        });
        frames.push({ narr: 'Takeaways: (1) memorise the 8 falsy values; (2) all objects — <code>[]</code>, <code>{}</code> — are truthy; (3) non-empty strings like "0" and "false" are truthy; (4) use <b>??</b> for defaults when 0, "" or false are valid values.', parts: [{ type: 'table', label: 'all results', columns: ['x', 'if (x)', 'x || "default"', 'x ?? "default"'], rows: rows, hl: {} }] });
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: the empty-array trap', html: `<p>An API returns <code>[]</code> when there are no results. <code>if (results)</code> is always true, so the "No results" message never shows. Check <code>results.length === 0</code> instead.</p>`, code: { lang: 'js', run: true, code: `
const results = [];
if (results) console.log("Showing results...");          // runs! [] is truthy
if (results.length === 0) console.log("No results found"); // the correct check
` } },
      { title: 'Predict the output: || and && return values, not booleans', html: `${H.table(['Expression', 'Result', 'Why'], [['<code>null || 0 || ""</code>', '""', 'all falsy → returns the LAST operand'], ['<code>"a" &amp;&amp; "b" &amp;&amp; "c"</code>', '"c"', 'all truthy → returns the LAST operand'], ['<code>"a" &amp;&amp; 0 &amp;&amp; "c"</code>', '0', 'first falsy wins, "c" never evaluated'], ['<code>0 ?? 42</code>', '0', '0 is not null/undefined'], ['<code>(null || undefined) ?? "x"</code>', '"x"', 'parentheses required to mix ?? with ||']])}`, code: { lang: 'js', run: true, code: `
console.log(JSON.stringify(null || 0 || ""));    // ""
console.log("a" && "b" && "c");                  // c
console.log("a" && 0 && "c");                    // 0
console.log(0 ?? 42, (null || undefined) ?? "x"); // 0 x
` } },
      { title: 'Rendering a count of zero', html: `<p>In UI code (e.g. React), <code>{count &amp;&amp; &lt;Badge/&gt;}</code> renders the number <b>0</b> on screen when count is 0, because <code>&amp;&amp;</code> returns the falsy operand itself. The fix is to produce a real boolean: <code>{count &gt; 0 &amp;&amp; &lt;Badge/&gt;}</code>. The same logic in plain JS:</p>`, code: { lang: 'js', run: true, code: `
function badgeText(count) {
  return count && \`\${count} new\`;      // returns 0 (a number!) when count is 0
}
function badgeTextFixed(count) {
  return count > 0 ? \`\${count} new\` : "";
}
console.log(JSON.stringify(badgeText(0)), JSON.stringify(badgeText(3)));        // 0 "3 new"
console.log(JSON.stringify(badgeTextFixed(0)), JSON.stringify(badgeTextFixed(3))); // "" "3 new"
` } },
      { title: 'Explicit checks beat truthiness for data', html: `${H.table(['Want to know', 'Fragile', 'Robust'], [['Was an age provided?', '<code>if (age)</code> — fails for 0', '<code>if (age != null)</code>'], ['Is the list empty?', '<code>if (!list)</code> — never true for []', '<code>if (list.length === 0)</code>'], ['Is the text empty?', '<code>if (!text)</code> — OK, but "  " passes', '<code>if (text.trim() === "")</code>'], ['Is the object empty?', '<code>if (!obj)</code> — never true for {}', '<code>Object.keys(obj).length === 0</code>']])}` }
    ],
    deepDive: `<p>🟣 <b>ToBoolean is a lookup, not a conversion chain.</b> Unlike ToNumber/ToString, ToBoolean never calls <code>valueOf</code> or <code>toString</code> — objects are simply truthy, which is why even <code>new Boolean(false)</code> is truthy. The one exception in the whole platform is <code>document.all</code>, which the HTML spec marks with the internal slot [[IsHTMLDDA]] so that old "if (document.all) → Internet Explorer" checks fail in modern browsers. It is falsy, <code>typeof</code> "undefined", and <code>== null</code>.</p>
      <p>🟣 <b>Short-circuit evaluation semantics.</b> <code>a &amp;&amp; b</code> ≡ <code>ToBoolean(a) ? b : a</code>; <code>a || b</code> ≡ <code>ToBoolean(a) ? a : b</code>; <code>a ?? b</code> ≡ <code>(a === null || a === undefined) ? b : a</code> — and <code>a</code> is evaluated exactly once. Logical assignment operators (<code>&amp;&amp;= ||= ??=</code>) are also short-circuiting: <code>obj.x ??= f()</code> does not even <b>assign</b> (no setter call) when <code>obj.x</code> already has a value — subtly different from <code>obj.x = obj.x ?? f()</code>.</p>
      <p>🟣 <b>Why the grammar forbids mixing ?? with || / &amp;&amp;.</b> The committee could not agree which precedence people would expect, so they made <code>a || b ?? c</code> a SyntaxError and forced parentheses. In V8, truthiness checks on values of a known type (e.g. always a Smi) are a single machine instruction; mixing types in a hot <code>if</code> makes the inline cache polymorphic and slightly slower — another reason to keep variables to one type.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> code generators and reviewers now flag <code>||</code>-for-defaults bugs and suggest <code>??</code>; TypeScript's <code>strictNullChecks</code> plus AI fixes make "maybe undefined" handling much less error-prone.</p>
      <p><b>Use AI as a partner:</b> "Find every place in this file where a truthiness check would wrongly treat 0, '' or false as missing" — a focused, reviewable request that AI handles well.</p>
      <p><b>Where AI goes wrong:</b> it writes <code>if (!value) return defaultValue</code> by reflex, uses <code>arr &amp;&amp; arr.length</code> where it should check the length explicitly, and generates React <code>{count &amp;&amp; …}</code> patterns that print 0. <b>What you must still own:</b> the 8-value falsy list, the || vs ?? decision, and recognising when "missing" and "falsy" are different concepts in your data model.</p>`,
    problems: [{
      title: 'Apply Config Defaults Without Losing 0, "" or false', level: 'Medium', tags: ['truthy/falsy', 'nullish coalescing', 'objects'], companies: ['Microsoft', 'Uber', 'Swiggy'],
      statement: `<p>Write <code>withDefaults(options)</code> that returns a full config <code>{ volume, nickname, notifications, retries }</code>. A field that is <b>missing, null or undefined</b> gets its default (<code>volume: 50</code>, <code>nickname: "guest"</code>, <code>notifications: true</code>, <code>retries: 3</code>). Any other value the user gave — including <code>0</code>, <code>""</code> and <code>false</code> — must be <b>kept</b>. <code>options</code> itself may be undefined.</p>`,
      constraints: `Do not mutate the input object. Ignore unknown keys.`,
      example: `<p><code>withDefaults({ volume: 0, notifications: false })</code> → <code>{ volume: ${H.c('g', '0')}, nickname: "guest", notifications: ${H.c('g', 'false')}, retries: 3 }</code>.<br>With <code>||</code> you would get ${H.c('r', 'volume: 50, notifications: true')} — overriding the user's explicit choices.</p>`,
      brute: { why: `<p>The classic pre-2020 pattern <code>opts.volume || 50</code> treats every falsy value as "missing". A user who muted the volume (0), cleared their nickname ("") or turned notifications off (false) is silently overruled.</p>`, code: { lang: 'js', run: true, code: `
function withDefaultsBuggy(options) {
  options = options || {};
  return {
    volume: options.volume || 50,               // 0 → 50  (bug)
    nickname: options.nickname || "guest",      // "" → "guest"
    notifications: options.notifications || true, // false → true (bug)
    retries: options.retries || 3,              // 0 → 3 (bug)
  };
}
console.log(JSON.stringify(withDefaultsBuggy({ volume: 0, notifications: false })));
` } },
      mcq: { q: '<code>options.retries = 0</code>. Which expression keeps 0?', options: ['<code>options.retries || 3</code>', '<code>options.retries ?? 3</code>', '<code>!!options.retries || 3</code>', '<code>options.retries &amp;&amp; 3</code>'], answer: 1, explain: '?? only falls back for null and undefined, so 0 survives. || treats 0 as falsy and returns 3; the other two return booleans/3.' },
      hints: [`<p>The question is not "is it falsy?" but "is it missing?" — and in JavaScript "missing" means <code>null</code> or <code>undefined</code>.</p>`, `<p><code>??</code> (nullish coalescing) is exactly "use the right side only for null/undefined". For a possibly-undefined <code>options</code>, read fields with optional chaining <code>options?.volume</code>.</p>`, `<p>Recipe: build a NEW object: <code>{ volume: options?.volume ?? 50, nickname: options?.nickname ?? "guest", ... }</code>. No mutation, unknown keys ignored automatically because you only copy known ones.</p>`],
      tests: { sig: 'string -> string', fn: 'wd', harness: { js: `function wd(json) {
  const o = json === '' ? undefined : JSON.parse(json);
  const before = JSON.stringify(o);
  const r = withDefaults(o);
  return JSON.stringify(r) + (JSON.stringify(o) === before ? '' : ' MUTATED');
}` }, cases: [
        [["{}"],"{\"volume\":50,\"nickname\":\"guest\",\"notifications\":true,\"retries\":3}"],
        [[""],"{\"volume\":50,\"nickname\":\"guest\",\"notifications\":true,\"retries\":3}"],
        [["null"],"{\"volume\":50,\"nickname\":\"guest\",\"notifications\":true,\"retries\":3}"],
        [["{\"volume\":0,\"notifications\":false}"],"{\"volume\":0,\"nickname\":\"guest\",\"notifications\":false,\"retries\":3}"],
        [["{\"nickname\":\"\",\"retries\":null,\"extra\":1}"],"{\"volume\":50,\"nickname\":\"\",\"notifications\":true,\"retries\":3}"],
        [["{\"volume\":10,\"nickname\":\"bob\",\"notifications\":false,\"retries\":0}"],"{\"volume\":10,\"nickname\":\"bob\",\"notifications\":false,\"retries\":0}"],
        [["{\"volume\":null,\"nickname\":null,\"notifications\":null,\"retries\":null}"],"{\"volume\":50,\"nickname\":\"guest\",\"notifications\":true,\"retries\":3}"],
        [["{\"extra\":{\"a\":1}}"],"{\"volume\":50,\"nickname\":\"guest\",\"notifications\":true,\"retries\":3}"]
      ] },
      solution: {
        approach: `<p>Use nullish coalescing per field, optional chaining for the possibly-missing options object, and build a fresh object so the input is untouched. A defaults table keeps the code data-driven.</p>`,
        code: { lang: 'js', run: true, code: `
const DEFAULTS = { volume: 50, nickname: "guest", notifications: true, retries: 3 };

function withDefaults(options) {
  const result = {};
  for (const key of Object.keys(DEFAULTS)) {
    // ?? → fall back ONLY for null/undefined; 0, "" and false are kept
    result[key] = options?.[key] ?? DEFAULTS[key];
  }
  return result;   // new object; input untouched; unknown keys ignored
}

console.log(JSON.stringify(withDefaults({ volume: 0, notifications: false })));
// {"volume":0,"nickname":"guest","notifications":false,"retries":3}
console.log(JSON.stringify(withDefaults({ nickname: "", retries: null, extra: 1 })));
// {"volume":50,"nickname":"","notifications":true,"retries":3}
console.log(JSON.stringify(withDefaults(undefined)));
// {"volume":50,"nickname":"guest","notifications":true,"retries":3}
` },
        alt: [{ lang: 'ts', code: `
interface Config { volume: number; nickname: string; notifications: boolean; retries: number }
const DEFAULTS: Config = { volume: 50, nickname: "guest", notifications: true, retries: 3 };

function withDefaults(options?: Partial<{ [K in keyof Config]: Config[K] | null }>): Config {
  return {
    volume: options?.volume ?? DEFAULTS.volume,
    nickname: options?.nickname ?? DEFAULTS.nickname,
    notifications: options?.notifications ?? DEFAULTS.notifications,
    retries: options?.retries ?? DEFAULTS.retries,
  };
}
console.log(withDefaults({ volume: 0 }));
` }],
        dry: { head: ['key', 'options[key]', 'null/undefined?', 'result'], rows: [['volume', '0', 'no', H.c('g', '0')], ['nickname', 'undefined', 'yes', '"guest"'], ['notifications', 'false', 'no', H.c('g', 'false')], ['retries', 'undefined', 'yes', '3']] },
        complexity: `<p>O(k) for k known keys (constant here). Space O(k) for the new object.</p>`,
        followUps: ['Support nested defaults (e.g. <code>{ audio: { volume } }</code>) — deep merge.', 'Compare with <code>{ ...DEFAULTS, ...options }</code>: how does spread treat explicit <code>undefined</code> and <code>null</code>?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 8 — Control flow
     ===================================================================== */
  var FBPROG = 'for (let i = 1; i <= n; i++) {\n  if (i % 15 === 0) out.push("FizzBuzz");\n  else if (i % 3 === 0) out.push("Fizz");\n  else if (i % 5 === 0) out.push("Buzz");\n  else out.push(String(i));\n}';
  var SWPROG = 'let msg = "";\nswitch (day) {\n  case 1: msg += "Mon ";\n  case 2: msg += "Tue ";\n  case 3: msg += "Wed "; break;\n  case 4: msg += "Thu "; break;\n  default: msg += "Weekend?";\n}';
  topics.push({
    title: 'Control Flow: if/else, switch, Loops, break/continue',
    analogy: `<p>Control flow is a <b>GPS for your code</b>. Normally it drives straight down the road (top to bottom). An <code>if</code> is a <b>fork</b>: "if the bridge is open go left, else go right". A <code>switch</code> is a <b>roundabout</b> with numbered exits — and if you forget to take your exit (<code>break</code>), you keep driving past the next ones. A loop is a <b>race track</b>: go around while the condition holds; <code>continue</code> skips the rest of this lap, <code>break</code> leaves the track entirely.</p>`,
    explain: `<p>🟢 <b>Decisions.</b> <code>if (condition) { … } else if (other) { … } else { … }</code> — the condition is converted with ToBoolean (truthy/falsy). Only the <b>first</b> matching branch runs. For choosing between two <i>values</i>, the ternary <code>cond ? a : b</code> is an expression and fits inside other code.</p>
      <p>🟢 <b>switch</b> compares one value against several <code>case</code>s using <b>strict equality (===)</b>. Execution starts at the matching case and <b>falls through</b> into the following cases until a <code>break</code> (or <code>return</code>). <code>default</code> runs when nothing matched. Fall-through is useful for grouping: <code>case "sat": case "sun": return "weekend";</code>.</p>
      <p>🟢 <b>Loops.</b></p>
      ${H.table(['Loop', 'Use it when', 'Example'], [
        ['<code>for (init; cond; step)</code>', 'you need an index or a count', '<code>for (let i = 0; i &lt; n; i++)</code>'],
        ['<code>while (cond)</code>', 'you don\'t know how many rounds', '<code>while (queue.length) …</code>'],
        ['<code>do { } while (cond)</code>', 'body must run at least once', 'ask until the input is valid'],
        ['<code>for (const x of iterable)</code>', 'values of arrays, strings, Maps, Sets', '<code>for (const ch of "hi")</code>'],
        ['<code>for (const k in object)</code>', 'keys of a plain object', '<code>for (const key in config)</code> — avoid on arrays']
      ])}
      <p>🔵 <b>break and continue.</b> <code>break</code> exits the nearest loop (or switch) immediately; <code>continue</code> jumps to the next iteration. To exit an <b>outer</b> loop from an inner one, label it: <code>outer: for (…) { for (…) { if (found) break outer; } }</code>.</p>
      <p>🔵 <b>Guard clauses</b> keep code flat: instead of nesting <code>if (user) { if (user.active) { … } }</code>, return early: <code>if (!user) return; if (!user.active) return; …</code>. Interviewers love readable control flow.</p>
      <p>🔵 <b>Classic bugs:</b> off-by-one (<code>i &lt;= arr.length</code> reads one past the end → undefined), infinite loops (forgetting to update the loop variable), <code>=</code> instead of <code>===</code> in a condition (<code>if (x = 5)</code> assigns and is always truthy), and a missing <code>break</code> in switch.</p>
      <p>🔵 <b>Errors as control flow.</b> <code>throw new Error("msg")</code> stops normal flow and jumps to the nearest <code>try { } catch (e) { }</code>; <code>finally { }</code> always runs (cleanup). Use it for exceptional situations, not for normal branching.</p>`,
    clues: [
      '"FizzBuzz" / "print numbers with rules" → loop + if/else-if chain, check the most specific rule FIRST',
      '"switch prints more than one case" → missing <code>break</code> (fall-through)',
      '"switch never matches even though the value looks right" → strict === comparison: "2" is not 2',
      '"for...in on an array gives strings / extra keys" → use <code>for...of</code> or a classic for loop',
      '"Exit both nested loops when found" → labeled <code>break outer</code> or extract a function and <code>return</code>',
      '"Run at least once, e.g. prompt until valid" → <code>do...while</code>'
    ],
    code: [{ lang: 'js', run: true, title: 'All control-flow statements in one tour', code: `
// if / else if / else
function grade(score) {
  if (score >= 90) return "A";        // guard-style early returns
  else if (score >= 75) return "B";
  else if (score >= 50) return "C";
  return "F";
}
console.log(grade(95), grade(80), grade(10));        // A B F

// ternary: choose a VALUE
const n = 7;
console.log(\`\${n} is \${n % 2 === 0 ? "even" : "odd"}\`); // 7 is odd

// switch with grouped cases (intentional fall-through)
function kind(day) {
  switch (day) {
    case "sat":
    case "sun":
      return "weekend";
    case "mon": case "tue": case "wed": case "thu": case "fri":
      return "weekday";
    default:
      return "unknown";
  }
}
console.log(kind("sun"), kind("tue"), kind("xyz"));  // weekend weekday unknown

// classic for, while, do...while
let total = 0;
for (let i = 1; i <= 5; i++) total += i;
console.log("1+2+3+4+5 =", total);                   // 15

let countdown = 3;
while (countdown > 0) { console.log("T-minus", countdown); countdown--; }

let attempts = 0;
do { attempts++; } while (attempts < 0);             // body runs once even though the condition is false
console.log("do...while ran", attempts, "time(s)");

// for...of (values) vs for...in (keys)
for (const ch of "hey") console.log("char:", ch);
const user = { name: "Ana", role: "admin" };
for (const key in user) console.log("key:", key, "→", user[key]);

// break / continue / labels
outer: for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 3; c++) {
    if (c === 1) continue;            // skip column 1
    if (r === 2) break outer;         // leave BOTH loops
    console.log("cell", r, c);
  }
}

// try / catch / finally
try {
  JSON.parse("{bad json");
} catch (e) {
  console.log("Caught:", e.name);
} finally {
  console.log("finally always runs");
}
` }],
    codeTitle: ['Control flow tour'],
    viz: [{
      title: 'FizzBuzz loop, one iteration at a time',
      input: '15',
      inputLabel: 'n (1–20)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (!(n >= 1 && n <= 20)) throw new Error('Enter a whole number from 1 to 20');
        var frames = [], out = [];
        frames.push({ narr: 'We loop i from 1 to ' + n + '. Order matters: the <b>most specific</b> rule (divisible by 15) is checked first; otherwise 15 would be caught by the "Fizz" branch and never reach "FizzBuzz".', parts: [{ type: 'code', lang: 'js', label: 'FizzBuzz', code: FBPROG, hl: { 1: 'cur' } }, { type: 'vars', vals: { n: n, i: 1 } }] });
        for (var i = 1; i <= n; i++) {
          var line = i % 15 === 0 ? 2 : i % 3 === 0 ? 3 : i % 5 === 0 ? 4 : 5;
          var word = i % 15 === 0 ? 'FizzBuzz' : i % 3 === 0 ? 'Fizz' : i % 5 === 0 ? 'Buzz' : String(i);
          var hl = {}; hl[1] = 'done';
          for (var L = 2; L < line; L++) hl[L] = 'bad';
          hl[line] = 'ok';
          out.push(word);
          var checks = [];
          if (line >= 2) checks.push(i + ' % 15 = ' + (i % 15) + (i % 15 === 0 ? ' ✓' : ' ✗'));
          if (line >= 3) checks.push(i + ' % 3 = ' + (i % 3) + (i % 3 === 0 ? ' ✓' : ' ✗'));
          if (line >= 4) checks.push(i + ' % 5 = ' + (i % 5) + (i % 5 === 0 ? ' ✓' : ' ✗'));
          var qh = {}; qh[out.length - 1] = word === String(i) ? 'cur' : 'ok';
          frames.push({ narr: 'i = <b>' + i + '</b>: ' + esc(checks.join(', ')) + (line === 5 ? ' → no rule matched, so the <code>else</code> pushes the number itself.' : ' → first true condition wins, push <b>"' + word + '"</b>; the remaining <code>else if</code>s are skipped.'), parts: [
            { type: 'code', lang: 'js', label: 'FizzBuzz', code: FBPROG, hl: hl },
            { type: 'vars', vals: { i: i, 'i % 3': i % 3, 'i % 5': i % 5, 'i % 15': i % 15 }, hl: { 'i % 15': i % 15 === 0 ? 'ok' : '', 'i % 3': i % 3 === 0 ? 'ok' : '', 'i % 5': i % 5 === 0 ? 'ok' : '' } },
            { type: 'queue', label: 'out', items: out.slice(), hl: qh, frontLabel: 'first', backLabel: 'newest' }
          ] });
        }
        frames.push({ narr: 'i becomes ' + (n + 1) + ', the condition <code>i &lt;= n</code> is false, the loop ends. ' + n + ' iterations, each doing a constant amount of work → O(n).', parts: [{ type: 'code', lang: 'js', label: 'FizzBuzz', code: FBPROG, hl: { 1: 'sel' } }, { type: 'queue', label: 'final out', items: out.slice(), frontLabel: 'first', backLabel: 'last' }] });
        return frames;
      }
    }, {
      title: 'switch: strict matching and fall-through',
      input: '1',
      inputLabel: 'day (try 1, 3, 4, 9, or "2" in quotes)',
      gen: function (input) {
        var rv = readValue(String(input || '1'));
        var day = rv.v, frames = [], msg = '';
        var cases = [1, 2, 3, 4], lines = [3, 4, 5, 6];
        frames.push({ narr: '<code>switch (day)</code> with day = <b>' + esc(show(day)) + '</b> (' + esc(kind(day)) + '). Each <code>case</code> is compared with <b>===</b> — no type conversion.', parts: [{ type: 'code', lang: 'js', label: 'switch', code: SWPROG, hl: { 2: 'cur' } }, { type: 'vars', vals: { day: show(day), msg: show(msg) } }] });
        var start = -1;
        for (var c = 0; c < cases.length; c++) {
          var match = day === cases[c];
          var h = { 2: 'done' }; h[lines[c]] = match ? 'ok' : 'bad';
          frames.push({ narr: 'Compare <code>' + esc(show(day)) + ' === ' + cases[c] + '</code> → <b>' + match + '</b>' + (match ? '. Jump in here!' : (typeof day === 'string' && Number(day) === cases[c] ? ' — <span class="c-y">the string "' + esc(day) + '" is not the number ' + cases[c] + '</span>.' : '.')), parts: [{ type: 'code', lang: 'js', label: 'switch', code: SWPROG, hl: h }, { type: 'vars', vals: { day: show(day), msg: show(msg) } }] });
          if (match) { start = c; break; }
        }
        if (start < 0) {
          msg += 'Weekend?';
          frames.push({ narr: 'No case matched → run <code>default</code>.', parts: [{ type: 'code', lang: 'js', label: 'switch', code: SWPROG, hl: { 7: 'ok' } }, { type: 'vars', vals: { day: show(day), msg: show(msg) }, hl: { msg: 'ok' } }] });
        } else {
          var words = ['Mon ', 'Tue ', 'Wed ', 'Thu '];
          for (var k = start; k < cases.length; k++) {
            msg += words[k];
            var brk = k === 2 || k === 3;
            var h2 = {}; h2[lines[k]] = k === start ? 'ok' : 'sel';
            frames.push({ narr: (k === start ? 'Run the matching case: ' : '<span class="c-y">No break before this line → FALL THROUGH</span> into the next case (its label is not checked again!): ') + 'msg += "' + words[k] + '"' + (brk ? '. Then <code>break</code> leaves the switch.' : '.'), parts: [{ type: 'code', lang: 'js', label: 'switch', code: SWPROG, hl: h2 }, { type: 'vars', vals: { day: show(day), msg: show(msg) }, hl: { msg: 'ok' } }] });
            if (brk) break;
          }
        }
        frames.push({ narr: 'Result: msg = <b>' + esc(show(msg)) + '</b>. ' + (start === 0 || start === 1 ? 'Fall-through collected several days — usually a bug unless deliberate (then add a <code>// falls through</code> comment).' : start < 0 ? 'Tip: if a user typed "2" into a form, convert with Number() before switching.' : 'A break right after the case stopped fall-through.'), parts: [{ type: 'vars', label: 'final', vals: { msg: show(msg) }, hl: { msg: 'sel' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: assignment inside if', html: `<p><code>if (x = 0)</code> assigns 0 to x and then tests 0 → falsy, so the branch is skipped, and x is now 0 forever. <code>if (x = 5)</code> would always run. Linters flag this (<code>no-cond-assign</code>); writing <code>===</code> by habit prevents it.</p>`, code: { lang: 'js', run: true, code: `
let x = 10;
if (x = 0) console.log("never printed");
console.log("x is now", x);            // 0 — the condition overwrote it
let y = 10;
if (y === 0) console.log("not printed"); else console.log("y is still", y);
` } },
      { title: 'Predict the output: for...in on an array', html: `<p><code>for...in</code> iterates <b>keys as strings</b> — and includes any extra enumerable properties. So <code>i + 1</code> gives "01", "11"… and the custom <code>extra</code> key appears. Use <code>for...of</code> for values or a classic index loop.</p>`, code: { lang: 'js', run: true, code: `
const arr = ["a", "b"];
arr.extra = "surprise";
for (const i in arr) console.log("in:", i, typeof i, i + 1);  // "0" string 01 / "1" string 11 / extra string extra1
for (const v of arr) console.log("of:", v);                   // a, b
` } },
      { title: 'Predict the output: off-by-one', html: `<p>Arrays of length n have indexes 0…n−1. Looping with <code>i &lt;= arr.length</code> visits one index too many, which yields <code>undefined</code> (no crash in JS, but wrong results — e.g. a sum becomes NaN).</p>${H.table(['i', 'arr[i]', 'sum'], [['0', '5', '5'], ['1', '7', '12'], ['2 (= length)', H.c('r', 'undefined'), H.c('r', 'NaN')]])}`, code: { lang: 'js', run: true, code: `
const arr = [5, 7];
let sum = 0;
for (let i = 0; i <= arr.length; i++) sum += arr[i];   // bug: <= reads arr[2]
console.log(String(sum));                               // NaN
sum = 0;
for (let i = 0; i < arr.length; i++) sum += arr[i];    // correct
console.log(sum);                                       // 12
` } },
      { title: 'Guard clauses vs nesting', html: `<p>Both functions do the same thing; the second reads top-to-bottom with no pyramid. Early <code>return</code>/<code>continue</code> is a hallmark of clean interview code.</p>`, code: { lang: 'js', run: true, code: `
function canCheckoutNested(user, cart) {
  if (user) {
    if (user.verified) {
      if (cart.length > 0) {
        return "ok";
      } else { return "empty cart"; }
    } else { return "verify email"; }
  } else { return "log in"; }
}
function canCheckout(user, cart) {
  if (!user) return "log in";
  if (!user.verified) return "verify email";
  if (cart.length === 0) return "empty cart";
  return "ok";
}
console.log(canCheckoutNested({ verified: true }, [1]), canCheckout(null, []), canCheckout({ verified: true }, []));
` } }
    ],
    deepDive: `<p>🟣 <b>Block scoping in loops.</b> In <code>for (let i = 0; …)</code>, each iteration gets a <b>fresh copy</b> of <code>i</code> (the spec copies the binding per iteration). That's why callbacks created in the loop remember their own <code>i</code>, whereas with <code>var</code> they all share one — the famous closure-in-loop bug covered in module 4.</p>
      <p>🟣 <b>switch internals.</b> Cases are evaluated top to bottom with <code>===</code> (actually IsStrictlyEqual), and case expressions can be any expression — <code>switch (true) { case score &gt;= 90: … }</code> is a legitimate range-matching idiom. The whole switch body is <b>one block</b>, so <code>case 1: let x = 1; break; case 2: let x = 2;</code> is a SyntaxError (duplicate declaration) — wrap each case body in its own <code>{ }</code>. Engines compile dense integer cases into jump tables, but in JS the performance difference vs an if-chain is rarely relevant; an object lookup map (<code>const handlers = { add: …, remove: … }</code>) is often cleaner.</p>
      <p>🟣 <b>Iteration protocols.</b> <code>for...of</code> works on anything with a <code>[Symbol.iterator]</code> method (arrays, strings by code point, Map, Set, arguments, NodeList, generators), not plain objects — use <code>Object.entries(obj)</code> for those. <code>for...in</code> walks enumerable string keys <b>including inherited ones</b> up the prototype chain; order is: integer-like keys ascending, then other strings in insertion order. Modifying an array while iterating it (push/splice) leads to skipped or repeated elements — iterate over a copy or build a new array. <code>finally</code> runs even after <code>return</code> in <code>try</code>; a <code>return</code> inside <code>finally</code> overrides the earlier one (a well-known trick question).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> boilerplate loops are largely generated, and higher-level array methods (<code>map</code>, <code>filter</code>, <code>reduce</code> — module 2) replace many hand-written loops. Static analysis catches missing breaks and unreachable branches automatically.</p>
      <p><b>Use AI as a partner:</b> ask it to "rewrite this nested if-pyramid with guard clauses and keep behaviour identical", or to "list the boundary inputs for this loop (0, 1, n, n+1, empty)". Then trace one input yourself to confirm.</p>
      <p><b>Where AI goes wrong:</b> off-by-one boundaries (<code>&lt;</code> vs <code>&lt;=</code>), switch statements that rely on loose matching of strings vs numbers, and for...in on arrays still appear in generated code. It may also "simplify" a deliberate fall-through away. <b>What you must still own:</b> tracing a loop by hand with a dry-run table (exactly what interviews test), choosing the right loop form, and reasoning about termination.</p>`,
    problems: [{
      title: 'FizzBuzz (and why check order matters)', level: 'Easy', tags: ['loops', 'conditionals', 'modulo'], companies: ['Amazon', 'Bloomberg', 'Infosys'],
      statement: `<p>Return an array of strings for i = 1…n: <code>"FizzBuzz"</code> if i is divisible by 3 and 5, <code>"Fizz"</code> if divisible by 3, <code>"Buzz"</code> if divisible by 5, otherwise the number as a string.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>4</sup>.`,
      example: `<p>n = 15 → ["1","2",${H.c('g', '"Fizz"')},"4",${H.c('b', '"Buzz"')},${H.c('g', '"Fizz"')},"7","8",${H.c('g', '"Fizz"')},${H.c('b', '"Buzz"')},"11",${H.c('g', '"Fizz"')},"13","14",${H.c('p', '"FizzBuzz"')}]. 15 is divisible by both 3 and 5, so it gets the combined word — but only if that check runs <b>before</b> the single checks.</p>`,
      brute: { why: `<p>Checking "divisible by 3" first means 15 hits the Fizz branch and the FizzBuzz branch is unreachable — a logic bug, not a speed problem. Hard-coding results (a giant switch) also "works" for small n and is the worst possible answer in an interview.</p>`, code: { lang: 'js', run: true, code: `
function fizzBuzzWrongOrder(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    if (i % 3 === 0) out.push("Fizz");            // 15 stops here...
    else if (i % 5 === 0) out.push("Buzz");
    else if (i % 15 === 0) out.push("FizzBuzz");  // ...so this never runs
    else out.push(String(i));
  }
  return out;
}
console.log(fizzBuzzWrongOrder(15).slice(-1));     // ["Fizz"] — wrong
` } },
      mcq: { q: 'Which ordering of checks is correct for FizzBuzz using else-if?', options: ['%3, %5, %15', '%15, %3, %5', '%5, %3, %15', 'Order does not matter with else-if'], answer: 1, explain: 'With an else-if chain, the first true condition wins. The most specific rule (divisible by 15) must come first, otherwise multiples of 15 are captured by the %3 or %5 branch.' },
      hints: [`<p>"Divisible by k" means <code>i % k === 0</code>. Divisible by both 3 and 5 is the same as divisible by 15.</p>`, `<p>In an if / else if chain, the first true branch wins and the rest are skipped. Put the most specific condition first.</p>`, `<p>Alternative without ordering issues: build the word: <code>let s = ""; if (i % 3 === 0) s += "Fizz"; if (i % 5 === 0) s += "Buzz"; out.push(s || String(i));</code> — note the <code>||</code> default works because "" is falsy.</p>`],
      tests: { sig: 'int -> string[]', fn: 'fbCase', harness: { js: `function fbCase(n) {
  const r = fizzBuzz(n);
  if (n <= 30) return r;
  let fizz = 0, buzz = 0, both = 0, num = 0;
  for (const s of r) { if (s === 'FizzBuzz') both++; else if (s === 'Fizz') fizz++; else if (s === 'Buzz') buzz++; else num++; }
  return { len: r.length, fizz, buzz, both, num, first: r[0], last: r[r.length - 1], at99: r[98], at100: r[99] };
}` }, cases: [
        [[1],["1"]],
        [[2],["1","2"]],
        [[3],["1","2","Fizz"]],
        [[5],["1","2","Fizz","4","Buzz"]],
        [[15],["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]],
        [[16],["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz","16"]],
        [[30],["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz","16","17","Fizz","19","Buzz","Fizz","22","23","Fizz","Buzz","26","Fizz","28","29","FizzBuzz"]],
        [[100],{"len":100,"fizz":27,"buzz":14,"both":6,"num":53,"first":"1","last":"Buzz","at99":"Fizz","at100":"Buzz"}],
        [[10000],{"len":10000,"fizz":2667,"buzz":1334,"both":666,"num":5333,"first":"1","last":"Buzz","at99":"Fizz","at100":"Buzz"}]
      ] },
      solution: {
        approach: `<p>Loop 1…n with an if/else-if chain ordered from most to least specific, or the string-building variant which scales to more rules (e.g. 7 → "Bazz") without combinatorial cases.</p>`,
        code: { lang: 'js', run: true, code: `
function fizzBuzz(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) out.push("FizzBuzz");   // most specific first
    else if (i % 3 === 0) out.push("Fizz");
    else if (i % 5 === 0) out.push("Buzz");
    else out.push(String(i));
  }
  return out;
}

// Extensible version: rules as data, no ordering trap
function fizzBuzzRules(n, rules = [[3, "Fizz"], [5, "Buzz"]]) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    let s = "";
    for (const [d, word] of rules) if (i % d === 0) s += word;
    out.push(s || String(i));                 // "" is falsy → fall back to the number
  }
  return out;
}

console.log(fizzBuzz(15).join(" "));
console.log(fizzBuzzRules(21, [[3, "Fizz"], [5, "Buzz"], [7, "Bazz"]]).slice(-1)[0]);   // FizzBazz
` },
        dry: { head: ['i', 'i % 15', 'i % 3', 'i % 5', 'pushed'], rows: [['1', '1', '1', '1', '"1"'], ['3', '3', H.c('g', '0'), '—', '"Fizz"'], ['5', '5', '2', H.c('g', '0'), '"Buzz"'], ['15', H.c('g', '0'), '—', '—', '"FizzBuzz"']] },
        complexity: `<p>O(n) time (O(n·r) for r rules), O(n) space for the output.</p>`,
        followUps: ['Do it without using the % operator (counters that reset).', 'Print instead of returning — what changes for n = 10<sup>7</sup>?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Celsius → Fahrenheit Table', level: 'Easy', tags: ['loops', 'numbers', 'strings'], companies: ['Infosys', 'Wipro'],
    statement: `<p>Print a table of temperatures from <code>start</code> to <code>end</code> °C (inclusive) in steps of <code>step</code>, each line formatted as <code>"  -10°C =   14.0°F"</code>: Celsius right-aligned to 4 characters, Fahrenheit with exactly 1 decimal right-aligned to 6 characters. F = C × 9 / 5 + 32. Return the lines as an array (and print them).</p>`,
    constraints: `-100 ≤ start ≤ end ≤ 100, 1 ≤ step ≤ 50 (integers).`,
    example: `<p><code>table(-10, 10, 10)</code> → <code>[" -10°C =   14.0°F", "   0°C =   32.0°F", "  10°C =   50.0°F"]</code>. ${H.c('b', 'padStart')} aligns the columns; ${H.c('g', 'toFixed(1)')} forces one decimal (32 → "32.0").</p>`,
    brute: { why: `<p>Concatenating with <code>+</code> and no formatting gives ragged columns like "-10°C = 14°F" and "0°C = 32°F" — and <code>String(c * 9 / 5 + 32)</code> may print long decimals (e.g. 33.8 vs 33.800000000000004 for other formulas). Correct values, unusable output.</p>`, code: { lang: 'js', run: true, code: `
function tableNaive(start, end, step) {
  const lines = [];
  for (let c = start; c <= end; c += step) lines.push(c + "°C = " + (c * 9 / 5 + 32) + "°F");
  return lines;
}
console.log(tableNaive(-10, 10, 10).join("\\n"));
` } },
    mcq: { q: 'What does <code>(32).toFixed(1)</code> return?', options: ['<code>32</code> (number)', '<code>"32.0"</code> (string)', '<code>32.0</code> (number)', '<code>"32"</code>'], answer: 1, explain: 'toFixed always returns a STRING with exactly the requested number of decimals. JavaScript numbers have no concept of "32.0" — only strings can show trailing zeros.' },
    hints: [`<p>A classic counting loop: <code>for (let c = start; c &lt;= end; c += step)</code> — note the <code>&lt;=</code> because end is inclusive.</p>`, `<p>Compute F with the formula, then format: <code>toFixed(1)</code> for one decimal, <code>padStart(width)</code> to right-align. Convert C to a string first with <code>String(c)</code>.</p>`, `<p>Recipe: line = String(c).padStart(4) + "°C = " + f.toFixed(1).padStart(6) + "°F". Template literals make it cleaner.</p>`],
    tests: { sig: 'int int int -> string[]', fn: 'table', cases: [
      [[-10,10,10],[" -10°C =   14.0°F","   0°C =   32.0°F","  10°C =   50.0°F"]],
      [[0,0,1],["   0°C =   32.0°F"]],
      [[-100,-100,1],["-100°C = -148.0°F"]],
      [[100,100,1],[" 100°C =  212.0°F"]],
      [[37,37,1],["  37°C =   98.6°F"]],
      [[-40,-40,1],[" -40°C =  -40.0°F"]],
      [[1,1,1],["   1°C =   33.8°F"]],
      [[-3,-3,1],["  -3°C =   26.6°F"]],
      [[0,100,50],["   0°C =   32.0°F","  50°C =  122.0°F"," 100°C =  212.0°F"]],
      [[-100,100,50],["-100°C = -148.0°F"," -50°C =  -58.0°F","   0°C =   32.0°F","  50°C =  122.0°F"," 100°C =  212.0°F"]],
      [[4,4,50],["   4°C =   39.2°F"]],
      [[-100,100,1],["-100°C = -148.0°F"," -99°C = -146.2°F"," -98°C = -144.4°F"," -97°C = -142.6°F"," -96°C = -140.8°F"," -95°C = -139.0°F"," -94°C = -137.2°F"," -93°C = -135.4°F"," -92°C = -133.6°F"," -91°C = -131.8°F"," -90°C = -130.0°F"," -89°C = -128.2°F"," -88°C = -126.4°F"," -87°C = -124.6°F"," -86°C = -122.8°F"," -85°C = -121.0°F"," -84°C = -119.2°F"," -83°C = -117.4°F"," -82°C = -115.6°F"," -81°C = -113.8°F"," -80°C = -112.0°F"," -79°C = -110.2°F"," -78°C = -108.4°F"," -77°C = -106.6°F"," -76°C = -104.8°F"," -75°C = -103.0°F"," -74°C = -101.2°F"," -73°C =  -99.4°F"," -72°C =  -97.6°F"," -71°C =  -95.8°F"," -70°C =  -94.0°F"," -69°C =  -92.2°F"," -68°C =  -90.4°F"," -67°C =  -88.6°F"," -66°C =  -86.8°F"," -65°C =  -85.0°F"," -64°C =  -83.2°F"," -63°C =  -81.4°F"," -62°C =  -79.6°F"," -61°C =  -77.8°F"," -60°C =  -76.0°F"," -59°C =  -74.2°F"," -58°C =  -72.4°F"," -57°C =  -70.6°F"," -56°C =  -68.8°F"," -55°C =  -67.0°F"," -54°C =  -65.2°F"," -53°C =  -63.4°F"," -52°C =  -61.6°F"," -51°C =  -59.8°F"," -50°C =  -58.0°F"," -49°C =  -56.2°F"," -48°C =  -54.4°F"," -47°C =  -52.6°F"," -46°C =  -50.8°F"," -45°C =  -49.0°F"," -44°C =  -47.2°F"," -43°C =  -45.4°F"," -42°C =  -43.6°F"," -41°C =  -41.8°F"," -40°C =  -40.0°F"," -39°C =  -38.2°F"," -38°C =  -36.4°F"," -37°C =  -34.6°F"," -36°C =  -32.8°F"," -35°C =  -31.0°F"," -34°C =  -29.2°F"," -33°C =  -27.4°F"," -32°C =  -25.6°F"," -31°C =  -23.8°F"," -30°C =  -22.0°F"," -29°C =  -20.2°F"," -28°C =  -18.4°F"," -27°C =  -16.6°F"," -26°C =  -14.8°F"," -25°C =  -13.0°F"," -24°C =  -11.2°F"," -23°C =   -9.4°F"," -22°C =   -7.6°F"," -21°C =   -5.8°F"," -20°C =   -4.0°F"," -19°C =   -2.2°F"," -18°C =   -0.4°F"," -17°C =    1.4°F"," -16°C =    3.2°F"," -15°C =    5.0°F"," -14°C =    6.8°F"," -13°C =    8.6°F"," -12°C =   10.4°F"," -11°C =   12.2°F"," -10°C =   14.0°F","  -9°C =   15.8°F","  -8°C =   17.6°F","  -7°C =   19.4°F","  -6°C =   21.2°F","  -5°C =   23.0°F","  -4°C =   24.8°F","  -3°C =   26.6°F","  -2°C =   28.4°F","  -1°C =   30.2°F","   0°C =   32.0°F","   1°C =   33.8°F","   2°C =   35.6°F","   3°C =   37.4°F","   4°C =   39.2°F","   5°C =   41.0°F","   6°C =   42.8°F","   7°C =   44.6°F","   8°C =   46.4°F","   9°C =   48.2°F","  10°C =   50.0°F","  11°C =   51.8°F","  12°C =   53.6°F","  13°C =   55.4°F","  14°C =   57.2°F","  15°C =   59.0°F","  16°C =   60.8°F","  17°C =   62.6°F","  18°C =   64.4°F","  19°C =   66.2°F","  20°C =   68.0°F","  21°C =   69.8°F","  22°C =   71.6°F","  23°C =   73.4°F","  24°C =   75.2°F","  25°C =   77.0°F","  26°C =   78.8°F","  27°C =   80.6°F","  28°C =   82.4°F","  29°C =   84.2°F","  30°C =   86.0°F","  31°C =   87.8°F","  32°C =   89.6°F","  33°C =   91.4°F","  34°C =   93.2°F","  35°C =   95.0°F","  36°C =   96.8°F","  37°C =   98.6°F","  38°C =  100.4°F","  39°C =  102.2°F","  40°C =  104.0°F","  41°C =  105.8°F","  42°C =  107.6°F","  43°C =  109.4°F","  44°C =  111.2°F","  45°C =  113.0°F","  46°C =  114.8°F","  47°C =  116.6°F","  48°C =  118.4°F","  49°C =  120.2°F","  50°C =  122.0°F","  51°C =  123.8°F","  52°C =  125.6°F","  53°C =  127.4°F","  54°C =  129.2°F","  55°C =  131.0°F","  56°C =  132.8°F","  57°C =  134.6°F","  58°C =  136.4°F","  59°C =  138.2°F","  60°C =  140.0°F","  61°C =  141.8°F","  62°C =  143.6°F","  63°C =  145.4°F","  64°C =  147.2°F","  65°C =  149.0°F","  66°C =  150.8°F","  67°C =  152.6°F","  68°C =  154.4°F","  69°C =  156.2°F","  70°C =  158.0°F","  71°C =  159.8°F","  72°C =  161.6°F","  73°C =  163.4°F","  74°C =  165.2°F","  75°C =  167.0°F","  76°C =  168.8°F","  77°C =  170.6°F","  78°C =  172.4°F","  79°C =  174.2°F","  80°C =  176.0°F","  81°C =  177.8°F","  82°C =  179.6°F","  83°C =  181.4°F","  84°C =  183.2°F","  85°C =  185.0°F","  86°C =  186.8°F","  87°C =  188.6°F","  88°C =  190.4°F","  89°C =  192.2°F","  90°C =  194.0°F","  91°C =  195.8°F","  92°C =  197.6°F","  93°C =  199.4°F","  94°C =  201.2°F","  95°C =  203.0°F","  96°C =  204.8°F","  97°C =  206.6°F","  98°C =  208.4°F","  99°C =  210.2°F"," 100°C =  212.0°F"]],
      [[-99,99,7],[" -99°C = -146.2°F"," -92°C = -133.6°F"," -85°C = -121.0°F"," -78°C = -108.4°F"," -71°C =  -95.8°F"," -64°C =  -83.2°F"," -57°C =  -70.6°F"," -50°C =  -58.0°F"," -43°C =  -45.4°F"," -36°C =  -32.8°F"," -29°C =  -20.2°F"," -22°C =   -7.6°F"," -15°C =    5.0°F","  -8°C =   17.6°F","  -1°C =   30.2°F","   6°C =   42.8°F","  13°C =   55.4°F","  20°C =   68.0°F","  27°C =   80.6°F","  34°C =   93.2°F","  41°C =  105.8°F","  48°C =  118.4°F","  55°C =  131.0°F","  62°C =  143.6°F","  69°C =  156.2°F","  76°C =  168.8°F","  83°C =  181.4°F","  90°C =  194.0°F","  97°C =  206.6°F"]]
    ] },
    solution: {
      approach: `<p>Loop with the given step, compute Fahrenheit, format each column with <code>toFixed</code> + <code>padStart</code>, collect lines.</p>`,
      code: { lang: 'js', run: true, code: `
function table(start, end, step) {
  const lines = [];
  for (let c = start; c <= end; c += step) {
    const f = c * 9 / 5 + 32;
    lines.push(\`\${String(c).padStart(4)}°C = \${f.toFixed(1).padStart(6)}°F\`);
  }
  return lines;
}
for (const line of table(-10, 30, 10)) console.log(line);
` },
      dry: { head: ['c', 'f', 'formatted line'], rows: [['-10', '14', '" -10°C =   14.0°F"'], ['0', '32', '"   0°C =   32.0°F"'], ['10', '50', '"  10°C =   50.0°F"']] },
      complexity: `<p>O((end − start) / step) lines, O(1) work each.</p>`,
      followUps: ['Add a Kelvin column.', 'Let step be a decimal like 0.5 — what goes wrong with <code>c += 0.1</code> loops, and how do you avoid it (loop over an integer counter)?']
    }
  });

  practice.push({
    title: 'Count the Vowels', level: 'Easy', tags: ['strings', 'loops'], companies: ['TCS', 'Accenture'],
    statement: `<p>Return the number of vowels (a, e, i, o, u — upper or lower case) in string <code>s</code>.</p>`,
    constraints: `0 ≤ s.length ≤ 10<sup>5</sup>.`,
    example: `<p><code>"Hello World"</code> → ${H.c('g', '3')} (e, o, o). <code>"RHYTHM"</code> → ${H.c('g', '0')}. <code>""</code> → 0.</p>`,
    brute: { why: `<p>Checking each character against five separate conditions joined with <code>||</code> — and twice for upper case — is long and error-prone (easy to forget "U"). Calling <code>s.toLowerCase()</code> inside the loop allocates a new string on every iteration: O(n²).</p>`, code: { lang: 'js', run: true, code: `
function countVowelsSlow(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s.toLowerCase()[i];          // re-lowercases the WHOLE string each time
    if (ch === "a" || ch === "e" || ch === "i" || ch === "o" || ch === "u") n++;
  }
  return n;
}
console.log(countVowelsSlow("Hello World"));
` } },
    mcq: { q: 'Which is the cleanest membership test for a vowel?', options: ['<code>"aeiou".includes(ch.toLowerCase())</code>', '<code>ch == "aeiou"</code>', '<code>"aeiou".indexOf(ch) &gt; 0</code>', '<code>ch in "aeiou"</code>'], answer: 0, explain: 'includes checks whether the vowel string contains the character. indexOf(...) &gt; 0 misses "a" at index 0; == compares the whole string; the in operator checks property keys, not characters.' },
    hints: [`<p>Lower-case the string <b>once</b> before the loop, or lower-case each character.</p>`, `<p>Keep the vowels in a string <code>"aeiou"</code> (or a Set) and test membership with <code>includes</code> / <code>has</code>.</p>`, `<p>Recipe: let count = 0; for (const ch of s.toLowerCase()) if ("aeiou".includes(ch)) count++; return count.</p>`],
    tests: { sig: 'string -> int', fn: 'countVowels', cases: [
      [["Hello World"],3],
      [["RHYTHM"],0],
      [[""],0],
      [["aeiouAEIOU"],10],
      [["xyz"],0],
      [["Programming in JavaScript"],7],
      [["y"],0],
      [["Éa"],1],
      [[{"$rep":"a","n":100000}],100000],
      [[{"$concat":[{"$rep":"b","n":99999},"U"]}],1],
      [[{"$rep":"xyz","n":33333}],0]
    ] },
    solution: {
      approach: `<p>One pass with <code>for...of</code> over the lower-cased string, membership test via a Set of vowels (O(1) lookup).</p>`,
      code: { lang: 'js', run: true, code: `
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

function countVowels(s) {
  let count = 0;
  for (const ch of s.toLowerCase()) {   // lower-case once, iterate characters
    if (VOWELS.has(ch)) count++;
  }
  return count;
}
console.log(countVowels("Hello World"), countVowels("RHYTHM"), countVowels(""));   // 3 0 0
// One-liner alternative with a regex:
console.log(("Programming in JavaScript".match(/[aeiou]/gi) || []).length);        // 7
` },
      dry: { head: ['ch', 'vowel?', 'count'], rows: [['h', 'no', '0'], ['e', H.c('g', 'yes'), '1'], ['l, l', 'no', '1'], ['o', H.c('g', 'yes'), '2'], ['" ", w', 'no', '2'], ['o', H.c('g', 'yes'), '3']] },
      complexity: `<p>O(n) time, O(n) for the lower-cased copy (O(1) if you lower-case per character).</p>`,
      followUps: ['Return a count per vowel as an object.', 'Treat accented vowels (é, ü) as vowels — hint: <code>normalize("NFD")</code>.']
    }
  });

  practice.push({
    title: 'Even, Odd or Not an Integer', level: 'Easy', tags: ['numbers', 'modulo', 'conditionals'], companies: ['Cognizant', 'Capgemini'],
    statement: `<p>Write <code>parity(x)</code> returning <code>"even"</code>, <code>"odd"</code>, or <code>"not an integer"</code>. Inputs may be negative, decimal, NaN, Infinity or numeric strings like <code>"7"</code> (treat numeric strings as their number; any other string is "not an integer").</p>`,
    constraints: `x is a number or a string.`,
    example: `<p><code>parity(-3)</code> → ${H.c('g', '"odd"')} — but the naive test <code>x % 2 === 1</code> says not odd, because <code>-3 % 2</code> is ${H.c('r', '-1')}. <code>parity(2.5)</code> → "not an integer". <code>parity("8")</code> → "even". <code>parity(NaN)</code> → "not an integer".</p>`,
    brute: { why: `<p><code>x % 2 === 1 ? "odd" : "even"</code> mislabels negative odd numbers (remainder −1) as even, calls 2.5 "even", calls NaN "even", and "8" works only by accident of coercion.</p>`, code: { lang: 'js', run: true, code: `
function parityNaive(x) { return x % 2 === 1 ? "odd" : "even"; }
console.log(parityNaive(-3), parityNaive(2.5), parityNaive(NaN));   // even even even — all wrong
` } },
    mcq: { q: 'What is <code>-7 % 2</code> in JavaScript?', options: ['1', '-1', '0', 'NaN'], answer: 1, explain: 'JavaScript % is a remainder that takes the sign of the dividend (left side): -7 = 2 × (-3) + (-1). Test oddness with x % 2 !== 0 instead of === 1.' },
    hints: [`<p>First normalise: convert strings with <code>Number()</code> (strict), and reject anything that is not an integer with <code>Number.isInteger</code> (false for NaN, Infinity and 2.5).</p>`, `<p>The remainder of a negative odd number is −1, so test <code>n % 2 === 0</code> for even and treat everything else as odd.</p>`, `<p>Recipe: n = typeof x === "string" ? (x.trim() === "" ? NaN : Number(x)) : x; if (!Number.isInteger(n)) return "not an integer"; return n % 2 === 0 ? "even" : "odd".</p>`],
    tests: { sig: 'string -> string', fn: 'par', harness: { js: `function par(spec) { const v = spec.slice(2); return parity(spec[0] === 'n' ? Number(v) : v); }` }, cases: [
      [["n:4"],"even"],
      [["n:-3"],"odd"],
      [["n:0"],"even"],
      [["n:-0"],"even"],
      [["n:1"],"odd"],
      [["n:-7"],"odd"],
      [["n:2.5"],"not an integer"],
      [["n:NaN"],"not an integer"],
      [["n:Infinity"],"not an integer"],
      [["n:-Infinity"],"not an integer"],
      [["s:8"],"even"],
      [["s:abc"],"not an integer"],
      [["s:"],"not an integer"],
      [["s:   "],"not an integer"],
      [["s: 7 "],"odd"],
      [["s:3.5"],"not an integer"],
      [["s:-3"],"odd"],
      [["s:1e3"],"even"],
      [["s:Infinity"],"not an integer"],
      [["n:9007199254740991"],"odd"],
      [["n:9007199254740992"],"even"],
      [["n:1e21"],"even"]
    ] },
    solution: {
      approach: `<p>Normalise strings strictly (blank → invalid), validate with <code>Number.isInteger</code>, then compare the remainder with 0 (sign-proof).</p>`,
      code: { lang: 'js', run: true, code: `
function parity(x) {
  let n = x;
  if (typeof x === "string") n = x.trim() === "" ? NaN : Number(x);  // "" would become 0 — reject it
  if (!Number.isInteger(n)) return "not an integer";                 // NaN, Infinity, 2.5, "abc"
  return n % 2 === 0 ? "even" : "odd";                               // works for negatives too
}
for (const x of [4, -3, 0, 2.5, NaN, Infinity, "8", "abc", "", -0]) {
  const label = typeof x === "string" ? JSON.stringify(x) : Object.is(x, -0) ? "-0" : String(x);
  console.log(label, "→", parity(x));
}
` },
      dry: { head: ['x', 'n', 'isInteger?', 'n % 2', 'result'], rows: [['-3', '-3', 'yes', '-1', '"odd"'], ['2.5', '2.5', H.c('r', 'no'), '—', '"not an integer"'], ['"8"', '8', 'yes', '0', '"even"'], ['""', 'NaN', H.c('r', 'no'), '—', '"not an integer"']] },
      complexity: `<p>O(1) time and O(1) space — a type check, Number.isInteger and one modulo, no loops.</p>`,
      followUps: ['Use the bitwise trick <code>(n &amp; 1)</code> — for which integers does it break?', 'Support BigInt inputs like <code>7n</code>.']
    }
  });

  practice.push({
    title: 'Reverse a String (emoji-safe)', level: 'Easy', tags: ['strings', 'unicode'], companies: ['Google', 'Meta'],
    statement: `<p>Return the reverse of string <code>s</code>. Characters outside the basic plane (emoji such as 😀, 🚀) must stay intact — reversing must not split them into broken halves.</p>`,
    constraints: `0 ≤ s.length ≤ 10<sup>5</sup>. Ignore multi-code-point graphemes (flags, families) for the main solution.`,
    example: `<p><code>"hello"</code> → ${H.c('g', '"olleh"')}. <code>"ab😀"</code> → ${H.c('g', '"😀ba"')}. The naive <code>split("")</code> version returns ${H.c('r', '"\\uDE00\\uD83Dba"')} — the emoji's two UTF-16 halves end up in the wrong order and render as garbage.</p>`,
    brute: { why: `<p><code>s.split("").reverse().join("")</code> splits by UTF-16 <b>code unit</b>, so a 2-unit emoji is cut in half and its halves are swapped. It also allocates an array of n single-character strings.</p>`, code: { lang: 'js', run: true, code: `
function reverseNaive(s) { return s.split("").reverse().join(""); }
const r = reverseNaive("ab😀");
console.log(r.length, [...r].map((c) => c.codePointAt(0).toString(16)).join(" "));  // 4 de00 d83d 62 61 — broken
` } },
    mcq: { q: 'Which expression iterates a string by code point (keeping 😀 whole)?', options: ['<code>s.split("")</code>', '<code>[...s]</code>', '<code>s.charAt(i)</code> in a loop', '<code>Object.keys(s)</code>'], answer: 1, explain: 'The string iterator (used by spread, for...of, Array.from) walks code points, so surrogate pairs stay together. split("") and charAt work on UTF-16 code units.' },
    hints: [`<p><code>"😀".length</code> is 2: it is stored as two UTF-16 code units (a surrogate pair). Anything that walks by index will split it.</p>`, `<p>The string <b>iterator</b> (<code>for...of</code>, spread <code>[...s]</code>, <code>Array.from(s)</code>) walks by code point instead.</p>`, `<p>Recipe: <code>[...s].reverse().join("")</code>, or build the result with a for...of loop prepending each character. For full grapheme safety (👨‍👩‍👧, 🇮🇳) use <code>Intl.Segmenter</code>.</p>`],
    tests: { sig: 'string -> string', fn: 'reverse', cases: [
      [["hello"],"olleh"],
      [["ab😀"],"😀ba"],
      [[""],""],
      [["a"],"a"],
      [["🚀😀"],"😀🚀"],
      [["racecar"],"racecar"],
      [["a😀b🚀c"],"c🚀b😀a"],
      [[{"$rep":"ab","n":50000}],{"$rep":"ba","n":50000}],
      [[{"$concat":["x",{"$rep":"y","n":99999}]}],{"$concat":[{"$rep":"y","n":99999},"x"]}],
      [[{"$rep":"😀","n":50000}],{"$rep":"😀","n":50000}]
    ] },
    solution: {
      approach: `<p>Spread the string into code points, reverse, join. For the strict "what a human sees" version, segment into graphemes with <code>Intl.Segmenter</code> first.</p>`,
      code: { lang: 'js', run: true, code: `
function reverse(s) {
  return [...s].reverse().join("");          // code points stay intact
}

function reverseGraphemes(s) {
  const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
  return Array.from(seg.segment(s), (x) => x.segment).reverse().join("");
}

console.log(reverse("hello"), reverse("ab😀"));            // olleh 😀ba
console.log(reverseGraphemes("hi👨‍👩‍👧!"));                   // !👨‍👩‍👧ih  (family emoji kept whole)
` },
      dry: { head: ['step', 'value'], rows: [['s', '"ab😀" (length 4)'], ['[...s]', '["a", "b", "😀"] (3 code points)'], ['.reverse()', '["😀", "b", "a"]'], ['.join("")', H.c('g', '"😀ba"')]] },
      complexity: `<p>O(n) time and space.</p>`,
      followUps: ['Reverse the order of words, not characters.', 'Why is reversing combining accents ("e" + U+0301) still wrong with spread?']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Leap Year Checker', level: 'Medium', tags: ['boolean logic', 'operators', 'precedence'], companies: ['Amazon', 'Oracle'],
    statement: `<p>Return <code>true</code> if <code>year</code> is a Gregorian leap year: divisible by 4, except century years (divisible by 100), which are leap only if divisible by 400. Write it as a single boolean expression and explain the precedence.</p>`,
    constraints: `1 ≤ year ≤ 10<sup>6</sup>, integer.`,
    example: `<p>2024 → ${H.c('g', 'true')} (÷4). 1900 → ${H.c('r', 'false')} (÷100 but not ÷400). 2000 → ${H.c('g', 'true')} (÷400). 2023 → false.</p>`,
    brute: { why: `<p>A deep nest of ifs works but is hard to read; the common buggy one-liner <code>year % 4 === 0 || year % 400 === 0 &amp;&amp; year % 100 !== 0</code> mixes up the grouping: because <code>&amp;&amp;</code> binds tighter than <code>||</code>, 1900 (÷4) is wrongly reported as leap.</p>`, code: { lang: 'js', run: true, code: `
function isLeapBuggy(year) {
  return year % 4 === 0 || year % 400 === 0 && year % 100 !== 0;   // && groups first
}
console.log(isLeapBuggy(1900));   // true — wrong
` } },
    mcq: { q: 'How does JS group <code>a || b &amp;&amp; c</code>?', options: ['<code>(a || b) &amp;&amp; c</code>', '<code>a || (b &amp;&amp; c)</code>', 'left to right, no precedence', 'SyntaxError'], answer: 1, explain: '&& has higher precedence than ||, just like * binds tighter than +. Use parentheses whenever you mix them to make the intent obvious.' },
    hints: [`<p>Spell out the rule: leap if (divisible by 4 AND NOT divisible by 100) OR (divisible by 400).</p>`, `<p><code>&amp;&amp;</code> binds tighter than <code>||</code>, but add parentheses anyway — the reader shouldn't need a precedence table.</p>`, `<p>Recipe: <code>return (y % 4 === 0 &amp;&amp; y % 100 !== 0) || y % 400 === 0;</code>. Test 1900, 2000, 2024, 2023.</p>`],
    tests: { sig: 'int -> bool', fn: 'isLeap', cases: [
      [[2024],true],
      [[1900],false],
      [[2000],true],
      [[2023],false],
      [[1],false],
      [[4],true],
      [[100],false],
      [[400],true],
      [[2100],false],
      [[1000000],true],
      [[999999],false],
      [[1996],true],
      [[2400],true],
      [[1800],false],
      [[999996],true]
    ] },
    solution: {
      approach: `<p>Translate the rule directly into one boolean expression with explicit parentheses; verify on the four classic test years and against the built-in Date (Feb 29 exists?).</p>`,
      code: { lang: 'js', run: true, code: `
function isLeap(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// Cross-check with the Date object: does Feb 29 stay in February?
function isLeapViaDate(y) {
  const d = new Date(Date.UTC(2000, 1, 29));
  d.setUTCFullYear(y);                       // set year separately: Date.UTC maps 0–99 to 1900s
  return d.getUTCMonth() === 1;              // month 1 = February
}

for (const y of [1900, 2000, 2023, 2024, 2100]) {
  console.log(y, isLeap(y), isLeap(y) === isLeapViaDate(y) ? "✓" : "MISMATCH");
}
` },
      dry: { head: ['year', '%4', '%100', '%400', 'result'], rows: [['2024', '0 ✓', '24 ✓(≠0)', '—', H.c('g', 'true')], ['1900', '0 ✓', '0 ✗', '300 ✗', H.c('r', 'false')], ['2000', '0 ✓', '0 ✗', '0 ✓', H.c('g', 'true')], ['2023', '3 ✗', '—', '23 ✗', H.c('r', 'false')]] },
      complexity: `<p>O(1) time and O(1) space — at most three modulo checks, no matter how large the year.</p>`,
      followUps: ['Count leap years between two years in O(1) using floor division.', 'Why might <code>isLeapViaDate</code> be slower, and why does it answer false for every year past 275,760 (the limit of a JavaScript Date)?']
    }
  });

  practice.push({
    title: 'Seconds to H:MM:SS', level: 'Medium', tags: ['numbers', 'Math.floor', 'padStart'], companies: ['Netflix', 'Spotify', 'Hotstar'],
    statement: `<p>Convert a non-negative number of seconds into a <code>"H:MM:SS"</code> string (hours not padded, minutes and seconds always two digits). Fractional seconds are <b>floored</b>. Invalid input (negative, NaN, Infinity) throws a RangeError.</p>`,
    constraints: `0 ≤ seconds ≤ 10<sup>9</sup>.`,
    example: `<p>3725 → ${H.c('g', '"1:02:05"')} (3725 = 1×3600 + 2×60 + 5). 59.9 → ${H.c('g', '"0:00:59"')}. 86400 → ${H.c('g', '"24:00:00"')}.</p>`,
    brute: { why: `<p>Using <code>new Date(sec * 1000).toISOString().slice(11, 19)</code> is a popular hack: it silently wraps after 24 hours (86400 → "00:00:00") and always pads hours. Subtracting in a loop (<code>while (s &gt;= 3600) { h++; s -= 3600; }</code>) is O(seconds / 3600).</p>`, code: { lang: 'js', run: true, code: `
function formatHack(sec) { return new Date(sec * 1000).toISOString().slice(11, 19); }
console.log(formatHack(3725), formatHack(86400));   // 01:02:05 00:00:00 — wraps at 24h
` } },
    mcq: { q: 'What is <code>Math.floor(3725 / 60) % 60</code>?', options: ['2', '62', '5', '1'], answer: 0, explain: '3725 / 60 = 62.08… → floor 62 total minutes; 62 % 60 = 2 minutes left over after removing whole hours.' },
    hints: [`<p>Hours = how many full 3600-second blocks fit: <code>Math.floor(s / 3600)</code>.</p>`, `<p>Minutes = full minutes modulo 60: <code>Math.floor(s / 60) % 60</code>; seconds = <code>s % 60</code> (after flooring the input).</p>`, `<p>Recipe: validate with Number.isFinite and s ≥ 0; s = Math.floor(s); build \`h:mm:ss\` with String(x).padStart(2, "0") for mm and ss.</p>`.replace(/`/g, '&#96;')],
    tests: { sig: 'string -> string', fn: 'hmsCase', harness: { js: `function hmsCase(s) { try { return hms(Number(s)); } catch (e) { return e.name; } }` }, cases: [
      [["3725"],"1:02:05"],
      [["59.9"],"0:00:59"],
      [["86400"],"24:00:00"],
      [["0"],"0:00:00"],
      [["-1"],"RangeError"],
      [["NaN"],"RangeError"],
      [["Infinity"],"RangeError"],
      [["-Infinity"],"RangeError"],
      [["-0.5"],"RangeError"],
      [["1000000000"],"277777:46:40"],
      [["59"],"0:00:59"],
      [["60"],"0:01:00"],
      [["3599"],"0:59:59"],
      [["3600"],"1:00:00"],
      [["0.999"],"0:00:00"],
      [["86399.99"],"23:59:59"],
      [["-0"],"0:00:00"]
    ] },
    solution: {
      approach: `<p>Integer arithmetic with floor and modulo, then format with <code>padStart</code>. Validate first so NaN or negatives cannot leak through.</p>`,
      code: { lang: 'js', run: true, code: `
function hms(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError("seconds must be a finite number ≥ 0");
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor(s / 60) % 60;
  const sec = s % 60;
  const two = (n) => String(n).padStart(2, "0");
  return \`\${h}:\${two(m)}:\${two(sec)}\`;
}

console.log(hms(3725), hms(59.9), hms(86400), hms(0));   // 1:02:05 0:00:59 24:00:00 0:00:00
try { hms(-1); } catch (e) { console.log(e.name, e.message); }
` },
      dry: { head: ['expr', 'value (s = 3725)'], rows: [['h = floor(3725 / 3600)', '1'], ['m = floor(3725 / 60) % 60', '62 % 60 = 2'], ['sec = 3725 % 60', '5'], ['format', H.c('g', '"1:02:05"')]] },
      complexity: `<p>O(1) time and O(1) space — three integer divisions/modulos plus padStart on tiny strings.</p>`,
      followUps: ['Parse "1:02:05" back into seconds.', 'Support days: "2d 03:04:05".']
    }
  });

  practice.push({
    title: 'Compare Version Strings', level: 'Medium', tags: ['strings', 'comparison', 'parsing'], companies: ['Apple', 'Microsoft', 'Atlassian'],
    statement: `<p>Compare two version strings like <code>"1.10.0"</code> and <code>"1.9.3"</code>. Return <code>1</code> if the first is newer, <code>-1</code> if older, <code>0</code> if equal. Missing parts count as 0 (<code>"1.2"</code> equals <code>"1.2.0"</code>). Leading zeros are ignored (<code>"1.01"</code> equals <code>"1.1"</code>).</p>`,
    constraints: `1 ≤ length ≤ 500; parts are non-negative integers separated by "."; each part fits in a safe integer.`,
    example: `<p><code>compare("1.10.0", "1.9.3")</code> → ${H.c('g', '1')}, because part-by-part: 1 = 1, then ${H.c('b', '10 &gt; 9')}. Comparing the raw strings gives the opposite answer: <code>"1.10.0" &gt; "1.9.3"</code> is ${H.c('r', 'false')} since the character "1" &lt; "9".</p>`,
    brute: { why: `<p>Comparing the strings directly with <code>&lt;</code>/<code>&gt;</code> uses dictionary order, so "1.10" sorts before "1.9". Removing the dots and comparing numbers (<code>Number("1100") vs Number("193")</code>) is also wrong: "1.10.0" vs "11.0.0" both become 1100.</p>`, code: { lang: 'js', run: true, code: `
function compareNaive(a, b) { return a > b ? 1 : a < b ? -1 : 0; }
console.log(compareNaive("1.10.0", "1.9.3"));   // -1 — wrong (should be 1)
` } },
    mcq: { q: 'Why is <code>"10" &lt; "9"</code> true?', options: ['JS converts both to numbers', 'Strings compare character by character by code unit, and "1" &lt; "9"', 'Because 10 has more digits', 'It is a bug in V8'], answer: 1, explain: 'When BOTH operands are strings, relational operators compare lexicographically by UTF-16 code units. Only when one side is a number do they convert to numbers.' },
    hints: [`<p>Split each version on <code>"."</code> and convert each part to a <b>number</b> so 10 &gt; 9 numerically.</p>`, `<p>Walk up to the longer length; a missing part is 0 (<code>parts[i] ?? 0</code>).</p>`, `<p>Recipe: A = a.split(".").map(Number), B likewise; for i in 0..max-1: x = A[i] ?? 0, y = B[i] ?? 0; if x &gt; y return 1; if x &lt; y return -1. Return 0.</p>`],
    tests: { sig: 'string string -> int', fn: 'compareVersions', cases: [
      [["1.10.0","1.9.3"],1],
      [["1.2","1.2.0"],0],
      [["1.01","1.1"],0],
      [["1.9.3","1.10.0"],-1],
      [["1","1"],0],
      [["0","0.0.0"],0],
      [["1.0.1","1"],1],
      [["1","1.0.1"],-1],
      [["2.0","10.0"],-1],
      [["007","7"],0],
      [["9007199254740991","9007199254740990"],1],
      [["1.0.0.0.0.1","1"],1],
      [[{"$concat":["1",{"$rep":".0","n":249}]},"1"],0],
      [[{"$concat":["1",{"$rep":".0","n":248},".1"]},"1"],1],
      [["1",{"$concat":["1",{"$rep":".0","n":248},".1"]}],-1]
    ] },
    solution: {
      approach: `<p>Split, convert parts to numbers, compare position by position, padding the shorter one with zeros via <code>??</code>.</p>`,
      code: { lang: 'js', run: true, code: `
function compareVersions(a, b) {
  const A = a.split(".").map(Number);       // "01" → 1 handles leading zeros
  const B = b.split(".").map(Number);
  const n = Math.max(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const x = A[i] ?? 0, y = B[i] ?? 0;     // missing parts count as 0
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

console.log(compareVersions("1.10.0", "1.9.3"));   // 1
console.log(compareVersions("1.2", "1.2.0"));      // 0
console.log(compareVersions("1.01", "1.1"));       // 0
console.log(["1.10", "1.2", "1.9.1", "1.9"].sort(compareVersions).join(" < "));   // 1.2 < 1.9 < 1.9.1 < 1.10
` },
      dry: { head: ['i', 'A[i]', 'B[i]', 'decision'], rows: [['0', '1', '1', 'equal, continue'], ['1', '10', '9', H.c('g', '10 &gt; 9 → return 1')]] },
      complexity: `<p>O(n + m) to split and compare.</p>`,
      followUps: ['Support pre-release tags like "1.0.0-beta.2" (semver rules).', 'Why is <code>localeCompare(b, undefined, { numeric: true })</code> almost — but not quite — enough?']
    }
  });

  practice.push({
    title: 'Caesar Cipher (with negative shifts)', level: 'Medium', tags: ['strings', 'char codes', 'modulo'], companies: ['Goldman Sachs', 'Cisco'],
    statement: `<p>Shift every letter of <code>text</code> by <code>k</code> positions in the alphabet, wrapping around (z + 1 → a). Keep case; leave non-letters unchanged. <code>k</code> may be negative or larger than 26.</p>`,
    constraints: `0 ≤ text.length ≤ 10<sup>5</sup>; -10<sup>9</sup> ≤ k ≤ 10<sup>9</sup>.`,
    example: `<p><code>shift("Hello, World!", 3)</code> → ${H.c('g', '"Khoor, Zruog!"')}. <code>shift("abc", -1)</code> → ${H.c('g', '"zab"')} — which needs a modulo that never goes negative, because in JS ${H.c('r', '-1 % 26 is -1')}.</p>`,
    brute: { why: `<p>Using <code>(code - 97 + k) % 26</code> breaks for negative k (JS remainder keeps the sign → negative index → wrong character). Looping k times shifting by 1 is O(n·|k|) — with k = 10<sup>9</sup> that never finishes.</p>`, code: { lang: 'js', run: true, code: `
function shiftBuggy(text, k) {
  return text.replace(/[a-z]/g, (ch) => String.fromCharCode(97 + ((ch.charCodeAt(0) - 97 + k) % 26)));
}
console.log(shiftBuggy("abc", -1));   // "\`ab" — 'a' became the backtick character (code 96)
` } },
    mcq: { q: 'Which expression always gives a result in 0..25 for any integer x?', options: ['<code>x % 26</code>', '<code>Math.abs(x) % 26</code>', '<code>((x % 26) + 26) % 26</code>', '<code>x &amp; 26</code>'], answer: 2, explain: 'x % 26 lies in -25..25; adding 26 moves it into 1..51; a second % 26 maps that into 0..25. Math.abs flips direction for negatives (wrong letter).' },
    hints: [`<p>Letters are consecutive in Unicode: 'a' is 97 … 'z' is 122; 'A' is 65 … 'Z' is 90. Convert with <code>charCodeAt</code> / <code>String.fromCharCode</code>.</p>`, `<p>Normalise k once: <code>k = ((k % 26) + 26) % 26</code>, which also turns huge or negative shifts into 0..25.</p>`, `<p>Recipe: for each char: if a–z: base = 97, else if A–Z: base = 65, else keep; new = base + (code − base + k) % 26. Build with an array and join (or replace with a callback).</p>`],
    tests: { sig: 'string int -> string', fn: 'caesar', cases: [
      [["Hello, World!",3],"Khoor, Zruog!"],
      [["abc",-1],"zab"],
      [["",5],""],
      [["xyz",3],"abc"],
      [["Zz",1],"Aa"],
      [["abc",26],"abc"],
      [["abc",-27],"zab"],
      [["Hello",1000000000],"Tqxxa"],
      [["Hello",-1000000000],"Vszzc"],
      [["123 !?",5],"123 !?"],
      [["é😀",3],"é😀"],
      [["abc",0],"abc"],
      [[{"$rep":"a","n":100000},1],{"$rep":"b","n":100000}]
    ] },
    solution: {
      approach: `<p>Normalise the shift with a "true modulo", then map each letter relative to its case base. Non-letters pass through. One pass, no repeated shifting.</p>`,
      code: { lang: 'js', run: true, code: `
const mod = (x, m) => ((x % m) + m) % m;        // true modulo: result always in 0..m-1

function caesar(text, k) {
  const s = mod(k, 26);
  let out = "";
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    let base = -1;
    if (c >= 97 && c <= 122) base = 97;         // a-z
    else if (c >= 65 && c <= 90) base = 65;     // A-Z
    out += base === -1 ? ch : String.fromCharCode(base + mod(c - base + s, 26));
  }
  return out;
}

console.log(caesar("Hello, World!", 3));        // Khoor, Zruog!
console.log(caesar("abc", -1));                 // zab
console.log(caesar(caesar("Round trip ✓", 1e9), -1e9));   // Round trip ✓
` },
      dry: { head: ['ch', 'code', 'base', 'code − base + s', 'mod 26', 'out'], rows: [['a (k = −1 → s = 25)', '97', '97', '25', '25', '"z"'], ['b', '98', '97', '26', '0', '"a"'], ['c', '99', '97', '27', '1', '"b"']] },
      complexity: `<p>O(n) time; O(n) for the output string.</p>`,
      followUps: ['Crack an unknown shift by trying all 26 and scoring English letter frequency.', 'Implement ROT13 as a one-liner with replace + callback.']
    }
  });

  practice.push({
    title: 'Compact: Drop Empty Values but Keep 0 and false', level: 'Medium', tags: ['truthy/falsy', 'arrays', 'nullish'], companies: ['Walmart', 'PhonePe'],
    statement: `<p>Given an array from a CSV import, remove "empty" entries — <code>null</code>, <code>undefined</code>, <code>NaN</code> and strings that are empty or only whitespace — but <b>keep</b> real values like <code>0</code>, <code>false</code>, <code>"0"</code> and <code>0n</code>. Return a new array; order preserved.</p>`,
    constraints: `0 ≤ length ≤ 10<sup>5</sup>.`,
    example: `<p><code>[0, "", " ", null, false, "0", NaN, undefined, "x", 0n]</code> → ${H.c('g', '[0, false, "0", "x", 0n]')}. The popular <code>arr.filter(Boolean)</code> returns ${H.c('r', '[" ", "0", "x"]')} — it drops 0, false and 0n because they are falsy, and keeps " " because a space is truthy.</p>`,
    brute: { why: `<p><code>filter(Boolean)</code> conflates "falsy" with "empty": it deletes legitimate zeros and false flags and keeps whitespace-only strings. A chain of <code>!==</code> checks works but misses NaN (because <code>NaN !== NaN</code> is always true).</p>`, code: { lang: 'js', run: true, code: `
const input = [0, "", " ", null, false, "0", NaN, undefined, "x", 0n];
console.log(input.filter(Boolean).map(String));   // ["0"," ","x"] — lost 0, false, 0n and kept " "
` } },
    mcq: { q: 'Which test correctly detects NaN inside a filter?', options: ['<code>v !== NaN</code>', '<code>v === NaN</code>', '<code>Number.isNaN(v)</code>', '<code>isNaN(v)</code>'], answer: 2, explain: 'NaN is not equal to anything, itself included, so === / !== never detect it. Global isNaN converts first, so isNaN("x") is true — wrong for strings. Number.isNaN is true only for the actual NaN value.' },
    hints: [`<p>Define "empty" explicitly instead of relying on truthiness: null/undefined, NaN, or a string whose <code>trim()</code> is "".</p>`, `<p><code>v == null</code> covers both null and undefined; <code>Number.isNaN(v)</code> catches NaN without misfiring on strings.</p>`, `<p>Recipe: <code>const isEmpty = (v) =&gt; v == null || Number.isNaN(v) || (typeof v === "string" &amp;&amp; v.trim() === "");</code> then <code>arr.filter((v) =&gt; !isEmpty(v))</code>.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'cmpt', harness: { js: `function cmpt(tokens) {
  const mk = (t) => {
    if (t === 'null') return null; if (t === 'undef') return undefined; if (t === 'NaN') return NaN; if (t === 'false') return false;
    if (t === 'true') return true; if (t === 'obj') return {}; if (t === 'arr') return [];
    if (t.startsWith('n:')) return Number(t.slice(2)); if (t.startsWith('s:')) return t.slice(2); if (t.startsWith('big:')) return BigInt(t.slice(4));
  };
  const show = (v) => v === null ? 'null' : v === undefined ? 'undef' : typeof v === 'bigint' ? 'big:' + v : typeof v === 'string' ? 's:' + v :
    typeof v === 'number' ? (Number.isNaN(v) ? 'NaN' : 'n:' + (Object.is(v, -0) ? '-0' : v)) : typeof v === 'boolean' ? String(v) : Array.isArray(v) ? 'arr' : 'obj';
  const input = tokens.map(mk);
  const r = compact(input);
  if (r === input) return ['SAME ARRAY'];
  return r.map(show);
}` }, cases: [
      [[["n:0","s:","s: ","null","false","s:0","NaN","undef","s:x","big:0"]],["n:0","false","s:0","s:x","big:0"]],
      [[[]],[]],
      [[["null","undef","NaN"]],[]],
      [[["s:   ","s:\t\n"]],[]],
      [[["n:-0"]],["n:-0"]],
      [[["false","false"]],["false","false"]],
      [[["obj","arr","n:0"]],["obj","arr","n:0"]],
      [[["s:NaN","s:null","s:undefined"]],["s:NaN","s:null","s:undefined"]],
      [[["true","big:-5","n:Infinity"]],["true","big:-5","n:Infinity"]],
      [[{"$rep":"n:1","n":100000}],{"$rep":"n:1","n":100000}],
      [[{"$concat":[{"$rep":"null","n":50000},{"$rep":"n:2","n":50000}]}],{"$rep":"n:2","n":50000}]
    ] },
    solution: {
      approach: `<p>An explicit <code>isEmpty</code> predicate that encodes the business definition, used with <code>filter</code> (which returns a new array).</p>`,
      code: { lang: 'js', run: true, code: `
function isEmpty(v) {
  return v == null                                   // null or undefined
      || Number.isNaN(v)                             // the NaN value only
      || (typeof v === "string" && v.trim() === "");  // "" or whitespace
}
const compact = (arr) => arr.filter((v) => !isEmpty(v));

const input = [0, "", " ", null, false, "0", NaN, undefined, "x", 0n];
const out = compact(input);
console.log(out.map((v) => typeof v === "bigint" ? v + "n" : JSON.stringify(v)).join(", "));  // 0, false, "0", "x", 0n
console.log("input untouched:", input.length);   // 10
` },
      dry: { head: ['v', '== null', 'isNaN', 'blank str', 'kept?'], rows: [['0', 'no', 'no', 'no', H.c('g', 'yes')], ['" "', 'no', 'no', H.c('r', 'yes'), 'no'], ['null', H.c('r', 'yes'), '—', '—', 'no'], ['false', 'no', 'no', 'no', H.c('g', 'yes')], ['NaN', 'no', H.c('r', 'yes'), '—', 'no']] },
      complexity: `<p>O(n) time, O(n) space for the new array.</p>`,
      followUps: ['Make the definition of "empty" configurable via an options object.', 'Do it in place (no new array) with a write pointer.']
    }
  });

  practice.push({
    title: 'Run-Length Encoding', level: 'Medium', tags: ['strings', 'loops', 'two pointers'], companies: ['Amazon', 'Paytm'],
    statement: `<p>Encode a string by replacing each run of the same character with the character followed by the run length: <code>"aaabccdddd"</code> → <code>"a3b1c2d4"</code>. Also write <code>decode</code> that reverses it (counts may have several digits, e.g. <code>"x12"</code>).</p>`,
    constraints: `0 ≤ length ≤ 10<sup>5</sup>; input to encode contains no digits.`,
    example: `<p><code>encode("aaabccdddd")</code> → ${H.c('g', '"a3b1c2d4"')}; <code>decode("x12y1")</code> → "xxxxxxxxxxxxy". Edge: empty string → "".</p>`,
    brute: { why: `<p>For each position, count forward how many equal characters follow, append, then <b>restart from the next position</b> (not after the run) — that re-counts the same run again and again: O(n²) and wrong output ("a3a2a1…").</p>`, code: { lang: 'js', run: true, code: `
function encodeWrong(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j < s.length && s[j] === s[i]) j++;
    out += s[i] + (j - i);                // forgot to jump i to j
  }
  return out;
}
console.log(encodeWrong("aaab"));        // a3a2a1b1 — wrong
` } },
    mcq: { q: 'In the run-scanning loop, after counting a run from i to j (exclusive), where should i go next?', options: ['i + 1', 'j', 'j + 1', '0'], answer: 1, explain: 'j is the first index of the NEXT run. Jumping i to j makes each character visited once: O(n). i + 1 re-counts inside the same run.' },
    hints: [`<p>A run starts at i; advance j while <code>s[j] === s[i]</code>. The run length is <code>j − i</code>.</p>`, `<p>After appending, jump <code>i = j</code> so every character is read once. Collect pieces in an array and <code>join("")</code>.</p>`, `<p>Decode: scan a letter, then read all following digits (while the char is between "0" and "9") to build the count; append <code>letter.repeat(count)</code>.</p>`],
    tests: { sig: 'string string -> string', fn: 'rle', harness: { js: `function rle(mode, s) { return mode === 'e' ? encode(s) : mode === 'd' ? decode(s) : decode(encode(s)); }` }, cases: [
      [["e","aaabccdddd"],"a3b1c2d4"],
      [["d","x12y1"],"xxxxxxxxxxxxy"],
      [["e",""],""],
      [["d",""],""],
      [["e","a"],"a1"],
      [["e","abc"],"a1b1c1"],
      [["e","aaaaaaaaaaaa"],"a12"],
      [["d","a12"],"aaaaaaaaaaaa"],
      [["e","  ##"]," 2#2"],
      [["e","aabbaa"],"a2b2a2"],
      [["r","hello world"],"hello world"],
      [["e",{"$rep":"z","n":100000}],"z100000"],
      [["d","z100000"],{"$rep":"z","n":100000}],
      [["r",{"$rep":"ab","n":50000}],{"$rep":"ab","n":50000}]
    ] },
    solution: {
      approach: `<p>Two pointers mark each run; parts collected in an array. Decoding reads a character then a multi-digit number with a small inner loop.</p>`,
      code: { lang: 'js', run: true, code: `
function encode(s) {
  const parts = [];
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j < s.length && s[j] === s[i]) j++;   // extend the run
    parts.push(s[i] + (j - i));                  // char + length (number joins as text)
    i = j;                                       // jump to the next run
  }
  return parts.join("");
}

function decode(code) {
  let out = "", i = 0;
  while (i < code.length) {
    const ch = code[i++];
    let count = 0;
    while (i < code.length && code[i] >= "0" && code[i] <= "9") {
      count = count * 10 + (code.charCodeAt(i) - 48);   // build multi-digit numbers
      i++;
    }
    out += ch.repeat(count);
  }
  return out;
}

console.log(encode("aaabccdddd"));                // a3b1c2d4
console.log(decode("x12y1"));                     // xxxxxxxxxxxxy
console.log(decode(encode("hello")) === "hello"); // true
` },
      dry: { head: ['i', 'j (run end)', 'run', 'parts'], rows: [['0', '3', '"aaa"', '["a3"]'], ['3', '4', '"b"', '["a3","b1"]'], ['4', '6', '"cc"', '["a3","b1","c2"]'], ['6', '10', '"dddd"', H.c('g', '["a3","b1","c2","d4"]')]] },
      complexity: `<p>Encode O(n). Decode O(output length).</p>`,
      followUps: ['Only write the count when it is greater than 1 ("a3bc2d4"). How does decoding change?', 'Encoding strings that contain digits — design an escape scheme.']
    }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Polyfill Object.is (SameValue)', level: 'Hard', tags: ['equality', 'NaN', '-0', 'polyfill'], companies: ['Google', 'Meta', 'Microsoft'],
    statement: `<p>Implement <code>sameValue(a, b)</code> that behaves exactly like <code>Object.is</code> using only <code>===</code>, <code>!==</code> and arithmetic. It differs from <code>===</code> in two cases: <code>sameValue(NaN, NaN)</code> is <b>true</b> and <code>sameValue(0, -0)</code> is <b>false</b>.</p>`,
    constraints: `a and b are any JavaScript values. Do not call Object.is, Number.isNaN or isNaN.`,
    example: `${H.table(['a', 'b', '===', 'Object.is'], [['NaN', 'NaN', 'false', H.c('g', 'true')], ['0', '-0', 'true', H.c('g', 'false')], ['"a"', '"a"', 'true', 'true'], ['{}', '{}', 'false', 'false']])}<p>How do you even tell 0 from -0? Divide: ${H.c('b', '1 / 0 = Infinity')} but ${H.c('b', '1 / -0 = -Infinity')}.</p>`,
    brute: { why: `<p>Plain <code>a === b</code> is wrong in exactly the two special cases. Converting to strings (<code>String(a) === String(b)</code>) "fixes" NaN but breaks everything else: <code>String(-0)</code> is "0", <code>1</code> vs <code>"1"</code> become equal, and all plain objects stringify to "[object Object]".</p>`, code: { lang: 'js', run: true, code: `
const naive = (a, b) => String(a) === String(b);
console.log(naive(NaN, NaN), naive(0, -0), naive(1, "1"), naive({}, {}));   // true true true true — 3 wrong
` } },
    mcq: { q: 'Which expression is true ONLY when x is NaN?', options: ['<code>x === NaN</code>', '<code>x !== x</code>', '<code>typeof x === "number"</code>', '<code>!x</code>'], answer: 1, explain: 'NaN is the only JavaScript value that is not equal to itself, so x !== x is a complete NaN test. x === NaN is always false.' },
    hints: [`<p>Start from <code>a === b</code>. When it is true, the only wrong case is +0 vs -0. When it is false, the only wrong case is NaN vs NaN.</p>`, `<p>NaN test: <code>x !== x</code>. Zero sign test: when a === b === 0, compare <code>1 / a === 1 / b</code> (Infinity vs -Infinity).</p>`, `<p>Recipe: if (a === b) return a !== 0 || 1 / a === 1 / b; return a !== a &amp;&amp; b !== b;</p>`],
    tests: { sig: 'string string -> bool', fn: 'sv', harness: { js: `function sv(a, b) {
  const o1 = {}, o2 = {};
  const mk = (t) => ({ NaN: NaN, '0': 0, '-0': -0, '1': 1, inf: Infinity, '-inf': -Infinity, '': '', o1, o2, null: null, undef: undefined, big1: 1n, 'true': true, 'false': false })[t] ?? (t.startsWith('s:') ? t.slice(2) : (t === 'null' ? null : undefined));
  return sameValue(mk(a), mk(b));
}` }, cases: [
      [["NaN","NaN"],true],
      [["0","-0"],false],
      [["-0","0"],false],
      [["-0","-0"],true],
      [["0","0"],true],
      [["1","1"],true],
      [["1","s:1"],false],
      [["o1","o2"],false],
      [["o1","o1"],true],
      [["null","undef"],false],
      [["s:a","s:a"],true],
      [["undef","undef"],true],
      [["null","null"],true],
      [["inf","inf"],true],
      [["inf","-inf"],false],
      [["NaN","s:NaN"],false],
      [["NaN","0"],false],
      [["0","NaN"],false],
      [["big1","big1"],true],
      [["big1","1"],false],
      [["","0"],false],
      [["true","true"],true],
      [["true","false"],false]
    ] },
    solution: {
      approach: `<p>Split on the result of <code>===</code>. Equal: still distinguish +0/−0 via the sign of the infinity you get from dividing 1. Not equal: report true only if both are NaN (self-inequality). This is the actual polyfill used by core-js.</p>`,
      code: { lang: 'js', run: true, code: `
function sameValue(a, b) {
  if (a === b) {
    // +0 === -0 is true, but 1/+0 = Infinity and 1/-0 = -Infinity
    return a !== 0 || 1 / a === 1 / b;
  }
  // NaN is the only value that is not equal to itself
  return a !== a && b !== b;
}

const cases = [[NaN, NaN], [0, -0], [-0, -0], [1, 1], [1, "1"], [{}, {}], [null, undefined], ["a", "a"]];
for (const [a, b] of cases) {
  const mine = sameValue(a, b), real = Object.is(a, b);
  console.log(String(mine).padEnd(6), mine === real ? "✓ matches Object.is" : "✗ MISMATCH");
}
` },
      dry: { head: ['a', 'b', 'a === b', 'extra check', 'result'], rows: [['NaN', 'NaN', 'false', 'a !== a && b !== b → true', H.c('g', 'true')], ['0', '-0', 'true', '1/0 = Infinity vs 1/-0 = -Infinity → false', H.c('g', 'false')], ['5', '5', 'true', 'a !== 0 → true', 'true']] },
      complexity: `<p>O(1) time and O(1) space — a handful of comparisons and one division to tell +0 from -0.</p>`,
      followUps: ['Implement SameValueZero (used by includes, Map, Set): NaN equals NaN but 0 equals -0.', 'Which built-ins use ===, SameValue and SameValueZero respectively? (indexOf vs Object.is vs includes)']
    }
  });

  practice.push({
    title: 'Implement Loose Equality (==) Without Using ==', level: 'Hard', tags: ['coercion', 'equality', 'spec'], companies: ['Google', 'Amazon', 'Uber'],
    statement: `<p>Implement <code>looseEquals(a, b)</code> that returns exactly what <code>a == b</code> returns, using only <code>===</code> and explicit conversions (<code>Number()</code>, <code>String()</code>, <code>BigInt()</code>). Support primitives (including bigint and symbol) and objects (arrays, plain objects, Dates) via ToPrimitive.</p>`,
    constraints: `Do not use == or != anywhere. Verify against the real operator for a large table of pairs.`,
    example: `<p><code>looseEquals([], false)</code> → ${H.c('g', 'true')}: boolean → number (0); object → primitive ("" ); string vs number → Number("") = 0; 0 === 0. <code>looseEquals(null, 0)</code> → ${H.c('r', 'false')}: null only equals undefined.</p>`,
    brute: { why: `<p>Shortcuts like "convert both sides to numbers" or "convert both to strings" each match the real operator on some pairs and fail on others: <code>Number(null) === Number(0)</code> says null == 0 (wrong), and <code>String([1]) === String(1)</code> happens to be right while <code>String(NaN) === String(NaN)</code> says NaN == NaN (wrong).</p>`, code: { lang: 'js', run: true, code: `
const viaNumber = (a, b) => Number(a) === Number(b);
console.log(viaNumber(null, 0), viaNumber("", 0), viaNumber(undefined, null));  // true true false — 1st and 3rd are wrong
` } },
    mcq: { q: 'In the == algorithm, what happens first when comparing <code>true == "1"</code>?', options: ['"1" becomes a boolean', 'true becomes the number 1', 'Both become strings', 'It returns false: different types'], answer: 1, explain: 'Any boolean operand is converted with ToNumber first (true → 1). Then 1 == "1" applies the number-vs-string rule: "1" → 1, and 1 === 1.' },
    hints: [`<p>Write a small <code>type(x)</code> helper (null → "null", functions → "object", otherwise typeof). If both types are equal → return <code>a === b</code>.</p>`, `<p>Then apply the rules in order: null/undefined pair → true; any other null/undefined → false; number vs string → Number(string); bigint vs string → BigInt(string) in try/catch; boolean → Number(boolean) and recurse; object vs non-object → ToPrimitive and recurse; bigint vs number → compare mathematically.</p>`, `<p>ToPrimitive(o): try <code>o[Symbol.toPrimitive]("default")</code>, else <code>valueOf()</code>, then <code>toString()</code>, taking the first primitive result. Dates use the string order for the default hint. Bigint vs number: false if the number is not an integer, otherwise BigInt(n) === big.</p>`],
    tests: { sig: 'string string -> string', fn: 'le', harness: { js: `function mkPair(ta, tb) {
  const sym = Symbol('s'), objs = {};
  const table = {
    '0': () => 0, '-0': () => -0, '1': () => 1, '2': () => 2, NaN: () => NaN, inf: () => Infinity, 'e': () => '', 's0': () => '0', 's1': () => '1',
    'sp1': () => ' 1 ', 'sa': () => 'a', 's12': () => '1,2', 'true': () => true, 'false': () => false, 'null': () => null, 'undef': () => undefined,
    'arr': () => [], 'arr0': () => [0], 'arr1': () => [1], 'arr12': () => [1, 2], 'obj': () => ({}), 'big0': () => 0n, 'big1': () => 1n,
    'big2': () => 2n, 'sym': () => sym, 'date': () => new Date(0), 'vo1': () => ({ valueOf() { return 1; } })
  };
  const get = (t) => (t in objs ? objs[t] : (objs[t] = table[t]()));
  return [get(ta), get(tb)];
}
function le(ta, tb) {
  if (ta === 'ALL') {
    const names = ['0', '-0', '1', '2', 'NaN', 'inf', 'e', 's0', 's1', 'sp1', 'sa', 's12', 'true', 'false', 'null', 'undef', 'arr', 'arr0', 'arr1', 'arr12', 'obj', 'big0', 'big1', 'big2', 'sym', 'date', 'vo1'];
    let bad = 0;
    for (const x of names) for (const y of names) { const [a, b] = mkPair(x, y); if (looseEquals(a, b) !== (a == b)) bad++; }
    return bad;
  }
  const [a, b] = mkPair(ta, tb);
  return looseEquals(a, b);
}` }, cases: [
      [["arr","false"],true],
      [["null","0"],false],
      [["s1","true"],true],
      [["big1","s1"],true],
      [["null","undef"],true],
      [["undef","undef"],true],
      [["0","e"],true],
      [["0","-0"],true],
      [["NaN","NaN"],false],
      [["arr0","false"],true],
      [["arr","e"],true],
      [["arr12","s12"],true],
      [["obj","obj"],true],
      [["obj","arr"],false],
      [["sym","sym"],true],
      [["sym","sa"],false],
      [["date","sa"],false],
      [["date","0"],false],
      [["vo1","1"],true],
      [["vo1","s1"],true],
      [["vo1","true"],true],
      [["big1","1"],true],
      [["big1","inf"],false],
      [["big0","e"],true],
      [["big2","2"],true],
      [["sp1","1"],true],
      [["e","false"],true],
      [["sa","false"],false],
      [["arr1","big1"],true],
      [["null","false"],false],
      [["undef","0"],false],
      [["1","true"],true],
      [["2","true"],false],
      [["ALL",""],0]
    ] },
    solution: {
      approach: `<p>Direct transcription of the spec's IsLooselyEqual with recursion for the "convert and retry" steps, plus a faithful ToPrimitive (default hint). A brute-force cross-check against the real == over every pair of a value table proves equivalence.</p>`,
      code: { lang: 'js', run: true, code: `
const type = (x) => (x === null ? "null" : typeof x === "function" ? "object" : typeof x);

function toPrimitive(o) {
  const exotic = o[Symbol.toPrimitive];
  if (typeof exotic === "function") {
    const r = exotic.call(o, "default");
    if (type(r) !== "object") return r;
    throw new TypeError("Cannot convert object to primitive value");
  }
  // default hint: Date prefers string, everything else prefers number (valueOf first)
  const order = o instanceof Date ? ["toString", "valueOf"] : ["valueOf", "toString"];
  for (const m of order) {
    if (typeof o[m] === "function") {
      const r = o[m]();
      if (type(r) !== "object") return r;
    }
  }
  throw new TypeError("Cannot convert object to primitive value");
}

function looseEquals(a, b) {
  const ta = type(a), tb = type(b);
  if (ta === tb) return a === b;                                       // same type → strict
  const nullish = (t) => t === "null" || t === "undefined";
  if (nullish(ta) && nullish(tb)) return true;                         // null == undefined
  if (nullish(ta) || nullish(tb)) return false;                        // nothing else equals them
  if (ta === "number" && tb === "string") return looseEquals(a, Number(b));
  if (ta === "string" && tb === "number") return looseEquals(Number(a), b);
  if (ta === "bigint" && tb === "string") { try { return a === BigInt(b); } catch { return false; } }
  if (ta === "string" && tb === "bigint") return looseEquals(b, a);
  if (ta === "boolean") return looseEquals(Number(a), b);
  if (tb === "boolean") return looseEquals(a, Number(b));
  if (ta === "object") return looseEquals(toPrimitive(a), b);           // object vs primitive
  if (tb === "object") return looseEquals(a, toPrimitive(b));
  if ((ta === "bigint" && tb === "number") || (ta === "number" && tb === "bigint")) {
    const [big, num] = ta === "bigint" ? [a, b] : [b, a];
    return Number.isInteger(num) && BigInt(num) === big;               // exact mathematical compare
  }
  return false;
}

// Cross-check against the real operator on every pair
const sym = Symbol("s");
const values = [0, -0, 1, 2, NaN, Infinity, "", "0", "1", " 1 ", "a", "1,2", true, false, null, undefined,
                [], [0], [1], [1, 2], {}, 0n, 1n, 2n, sym, new Date(0), { valueOf() { return 1; } }];
let checked = 0, bad = 0;
for (const a of values) for (const b of values) {
  checked++;
  // eslint-disable-next-line eqeqeq
  if (looseEquals(a, b) !== (a == b)) { bad++; console.log("mismatch:", String(a), String(b)); }
}
console.log(\`\${checked} pairs checked, \${bad} mismatches\`);
console.log(looseEquals([], false), looseEquals(null, 0), looseEquals("1", true), looseEquals(1n, "1"));  // true false true true
` },
      dry: { head: ['call', 'types', 'rule', 'next call'], rows: [['looseEquals([], false)', 'object, boolean', 'boolean → number', 'looseEquals([], 0)'], ['looseEquals([], 0)', 'object, number', 'ToPrimitive([]) = ""', 'looseEquals("", 0)'], ['looseEquals("", 0)', 'string, number', 'Number("") = 0', 'looseEquals(0, 0)'], ['looseEquals(0, 0)', 'number, number', 'same type → ===', H.c('g', 'true')]] },
      complexity: `<p>O(1) per comparison (bounded recursion depth ≤ 4); the cross-check is O(V²) for V test values.</p>`,
      followUps: ['Add the hint parameter and implement ToNumber for objects (hint "number").', 'Explain why <code>new Date(0) == 0</code> is false but <code>new Date(0) - 0 === 0</code> is true.']
    }
  });

  practice.push({
    title: 'Is It a Numeric String? (match Number() exactly)', level: 'Hard', tags: ['parsing', 'state machine', 'numbers', 'strings'], companies: ['Stripe', 'Bloomberg', 'LinkedIn'],
    statement: `<p>Write <code>isFiniteNumeric(s)</code> that returns <code>true</code> exactly when <code>Number(s)</code> would produce a <b>finite</b> number — <b>without</b> calling <code>Number</code>, <code>parseFloat</code>, <code>parseInt</code>, <code>isNaN</code>, unary <code>+</code> or arithmetic on <code>s</code>. Then verify it against <code>Number.isFinite(Number(s))</code> on a test list.</p>`,
    constraints: `s is a string up to 10<sup>4</sup> characters; prefixed 0x/0b/0o forms have at most 200 digits. Rules to match: surrounding whitespace is ignored; empty/blank → true (Number("") is 0); optional sign then a decimal literal (digits, optional ".", optional digits, at least one digit overall, optional exponent e/E with optional sign and ≥ 1 digit); OR an unsigned 0x/0b/0o integer; "Infinity" is not finite; no underscores.`,
    example: `${H.table(['s', 'Number(s)', 'expected'], [['"  42 "', '42', H.c('g', 'true')], ['""', '0', H.c('g', 'true') + ' (surprise!)'], ['"-1.5e3"', '-1500', H.c('g', 'true')], ['".5"', '0.5', H.c('g', 'true')], ['"5."', '5', H.c('g', 'true')], ['"0x1F"', '31', H.c('g', 'true')], ['"-0x1F"', 'NaN', H.c('r', 'false')], ['"1_000"', 'NaN', H.c('r', 'false')], ['"Infinity"', 'Infinity', H.c('r', 'false') + ' (not finite)'], ['"12px"', 'NaN', H.c('r', 'false')]])}`,
    brute: { why: `<p>The tempting regex <code>/^\\d+$/</code> rejects valid inputs ("-1.5e3", ".5", " 7 ", "0x1F", "") while a lazy <code>/\\d/</code> accepts "12px". And <code>!isNaN(s)</code> is "cheating" here and still wrong for "Infinity" (not finite).</p>`, code: { lang: 'js', run: true, code: `
const naive = (s) => /^\\d+$/.test(s);
console.log(["42", "-1.5e3", ".5", " 7 ", "0x1F", ""].map(naive).join(" "));   // true false false false false false
` } },
    mcq: { q: 'What is <code>Number("-0x10")</code>?', options: ['-16', '16', 'NaN', '0'], answer: 2, explain: 'The StringNumericLiteral grammar allows a sign only before DECIMAL literals. Hex/binary/octal literals must be unsigned, so "-0x10" → NaN (although parseInt("-0x10") gives -16!).' },
    hints: [`<p>Trim first (<code>s.trim()</code> removes the same whitespace and line terminators Number does). Empty after trimming → true.</p>`, `<p>Prefixed integers: <code>/^0[xX][0-9a-fA-F]+$/</code>, <code>/^0[bB][01]+$/</code>, <code>/^0[oO][0-7]+$/</code> — no sign allowed. Otherwise parse a decimal literal by hand (or a careful regex): sign? digits* ("." digits*)? with at least one digit, then optional exponent.</p>`, `<p>A tiny state machine: i = 0; skip one + or −; count digits; if "." count more digits; require count ≥ 1; if "e"/"E": skip sign, require ≥ 1 digit; must end exactly at the string end. Finite check: very large exponents (1e999) overflow to Infinity — handle by computing the decimal magnitude (digits before the point + exponent) and comparing with 308/309 carefully, or accept the documented limitation and test it.</p>`],
    tests: { sig: 'string -> bool', fn: 'isFiniteNumeric', cases: [
      [["  42 "],true],
      [[""],true],
      [["   "],true],
      [["-1.5e3"],true],
      [[".5"],true],
      [["5."],true],
      [["+.5e-2"],true],
      [["0x1F"],true],
      [["-0x1F"],false],
      [["0b102"],false],
      [["0o17"],true],
      [["1_000"],false],
      [["Infinity"],false],
      [["-Infinity"],false],
      [["12px"],false],
      [["."],false],
      [["e5"],false],
      [["1e"],false],
      [["1e+"],false],
      [["1e308"],true],
      [["1.7976931348623157e308"],true],
      [["1.7976931348623158e308"],true],
      [["1.7976931348623159e308"],false],
      [["1e309"],false],
      [["0.0001e312"],true],
      [["1e-400"],true],
      [["007"],true],
      [["0000.0000"],true],
      [["\n 3 \t"],true],
      [["+"],false],
      [["-"],false],
      [["1e+5"],true],
      [["1E5"],true],
      [["1.e2"],true],
      [["0b101"],true],
      [["0xg"],false],
      [[{"$concat":["1",{"$rep":"0","n":9999}]}],false],
      [[{"$concat":["0.",{"$rep":"0","n":9990},"1"]}],true],
      [[{"$rep":"9","n":309}],false],
      [[{"$concat":["1",{"$rep":"0","n":308}]}],true],
      [[{"$concat":["1",{"$rep":"0","n":309}]}],false],
      [[{"$rep":"0","n":10000}],true],
      [[{"$concat":["1e",{"$rep":"0","n":9990},"5"]}],true],
      [[{"$concat":["0x",{"$rep":"F","n":200}]}],true],
      [[{"$concat":["1e",{"$rep":"9","n":7}]}],false],
      [[{"$concat":["1e-",{"$rep":"9","n":7}]}],true],
      [[{"$concat":[{"$rep":" ","n":5000},"5",{"$rep":" ","n":4999}]}],true]
    ] },
    solution: {
      approach: `<p>Trim, handle blank, handle the three unsigned prefixed forms with regexes, then run a hand-written scanner for decimal literals. For finiteness, estimate the order of magnitude: the position of the first non-zero digit relative to the decimal point plus the exponent; anything above 10<sup>308</sup> needs a precise check, which we do by comparing the normalised digit string with the digits of Number.MAX_VALUE (1.7976931348623157e308) plus half an ulp — the rounding boundary is 1.797693134862315807…e308.</p>`,
      code: { lang: 'js', run: true, code: `
function isFiniteNumeric(str) {
  const s = str.trim();
  if (s === "") return true;                                   // Number("") → 0
  if (/^0[xX][0-9a-fA-F]+$/.test(s) || /^0[bB][01]+$/.test(s) || /^0[oO][0-7]+$/.test(s)) {
    return true;                                               // unsigned 0x/0b/0o integers (≤ 200 digits) are finite
  }
  // Decimal literal scanner
  let i = 0, intDigits = "", fracDigits = "", exp = 0;
  if (s[i] === "+" || s[i] === "-") i++;
  while (i < s.length && s[i] >= "0" && s[i] <= "9") intDigits += s[i++];
  if (s[i] === ".") {
    i++;
    while (i < s.length && s[i] >= "0" && s[i] <= "9") fracDigits += s[i++];
  }
  if (intDigits.length + fracDigits.length === 0) return false;   // "." or "+" alone, "Infinity", "abc"
  if (s[i] === "e" || s[i] === "E") {
    i++;
    let sign = 1, expDigits = "";
    if (s[i] === "+" || s[i] === "-") { if (s[i] === "-") sign = -1; i++; }
    while (i < s.length && s[i] >= "0" && s[i] <= "9") expDigits += s[i++];
    if (expDigits.length === 0) return false;
    const ed = expDigits.replace(/^0+/, "");                   // "e0005" → "5"
    if (ed.length > 7) exp = 1e7;                                // astronomically large exponent
    else for (const d of ed) exp = exp * 10 + (d.charCodeAt(0) - 48);   // digit by digit
    exp *= sign;
  }
  if (i !== s.length) return false;                                // trailing junk like "px"
  // Finiteness: normalise to d.ddd × 10^mag
  const all = (intDigits + fracDigits).replace(/^0+/, "");
  if (all === "") return true;                                     // value is zero
  const leadingZerosInInt = intDigits.length - intDigits.replace(/^0+/, "").length;
  const mag = intDigits.replace(/^0+/, "").length > 0
    ? intDigits.length - leadingZerosInInt - 1 + exp
    : -(fracDigits.length - fracDigits.replace(/^0+/, "").length) - 1 + exp;
  if (mag < 308) return true;
  if (mag > 308) return false;
  // mag === 308: compare the significant digits with the exact rounding boundary
  // MAX_VALUE + half an ulp = 2^1024 - 2^970; values >= it round to Infinity.
  const LIMIT = String(2n ** 1024n - 2n ** 970n);                  // 309 exact digits
  const sig = all.replace(/0+$/, "");
  const cmp = sig.length <= LIMIT.length ? sig.padEnd(LIMIT.length, "0") : sig.slice(0, LIMIT.length);
  return cmp < LIMIT;                                              // equal-length digit strings compare numerically
}

const tests = ["  42 ", "", "   ", "-1.5e3", ".5", "5.", "+.5e-2", "0x1F", "-0x1F", "0b102", "0o17", "1_000",
               "Infinity", "-Infinity", "12px", ".", "e5", "1e", "1e+", "1e308", "1.7976931348623157e308",
               "1.7976931348623159e308", "1e309", "0.0001e312", "1e-400", "007", "0000.0000", "\\n 3 \\t"];
let ok = 0;
for (const t of tests) {
  const mine = isFiniteNumeric(t), real = Number.isFinite(Number(t));
  if (mine === real) ok++; else console.log("MISMATCH", JSON.stringify(t), mine, real);
}
console.log(\`\${ok}/\${tests.length} match Number()\`);
` },
      dry: { head: ['s', 'step', 'state', 'result'], rows: [['"-1.5e3"', 'sign, int "1", ".", frac "5", "e3"', 'mag = 0 + 3', H.c('g', 'true')], ['"12px"', 'int "12", stop at "p"', 'i ≠ length', H.c('r', 'false')], ['"Infinity"', 'no digits at all', 'digit count 0', H.c('r', 'false')], ['"1e309"', 'int "1", exp 309', 'mag 309 &gt; 308', H.c('r', 'false')]] },
      complexity: `<p>O(n) time for a string of length n, O(n) extra space for the digit strings.</p>`,
      followUps: ['Turn the scanner into a full parser that returns the value (watch out: correct rounding of decimal → double is a hard problem — engines use algorithms like Eisel-Lemire).', 'Match <code>parseFloat</code> semantics instead (prefix allowed, "Infinity" accepted, no hex).']
    }
  });

  practice.push({
    title: 'Add Two Decimal Strings of Any Length', level: 'Hard', tags: ['strings', 'big numbers', 'simulation'], companies: ['Goldman Sachs', 'Google', 'Adobe'],
    statement: `<p>Given two non-negative decimal numbers as strings (they may have a fractional part, e.g. <code>"123.45"</code> and <code>"0.555"</code>), return their exact sum as a string, without trailing zeros in the fraction and without a trailing ".". Do not use BigInt or convert to number.</p>`,
    constraints: `1 ≤ length ≤ 10<sup>5</sup> each; no sign; at most one "." each; no leading "." (always a digit before it).`,
    example: `<p><code>"123.45" + "0.555"</code> → ${H.c('g', '"124.005"')}. <code>"0.1" + "0.2"</code> → ${H.c('g', '"0.3"')} (exact — unlike floats). <code>"99999999999999999999" + "1"</code> → "100000000000000000000" (beyond 2<sup>53</sup>, still exact). <code>"1.5" + "1.5"</code> → "3".</p>`,
    brute: { why: `<p><code>String(Number(a) + Number(b))</code> loses precision beyond 2<sup>53</sup> and in fractions (0.1 + 0.2), and switches to exponent notation for huge values ("1e+21"). Using BigInt is not allowed — and in an interview the point is to show you can simulate grade-school addition.</p>`, code: { lang: 'js', run: true, code: `
const naive = (a, b) => String(Number(a) + Number(b));
console.log(naive("0.1", "0.2"));                                         // 0.30000000000000004
console.log(naive("123456789012345678901234", "1"));                      // 1.2345678901234568e+23
` } },
    mcq: { q: 'Before adding digit by digit, what must you do with "123.45" and "0.555"?', options: ['Nothing, add from the left', 'Align the decimal points by padding the fractions to equal length (with zeros on the right) and the integer parts (zeros on the left)', 'Remove the dots and add', 'Convert to numbers'], answer: 1, explain: 'Column addition only works when digits of the same place value line up: pad fractions on the right ("450" vs "555") and integer parts on the left ("123" vs "000").' },
    hints: [`<p>Split each number into integer and fraction parts on ".". Pad the fractions on the right with zeros to the same length, and the integer parts on the left.</p>`, `<p>Now concatenate int+frac for each and add from the rightmost digit with a carry, like on paper. Digit value = <code>s.charCodeAt(i) - 48</code>.</p>`, `<p>Finally re-insert the "." at (length − fracLen), remove trailing zeros from the fraction (and the "." if nothing is left), remove leading zeros from the integer part (keep at least one "0").</p>`],
    tests: { sig: 'string string -> string', fn: 'addDecimalStrings', cases: [
      [["123.45","0.555"],"124.005"],
      [["0.1","0.2"],"0.3"],
      [["1.5","1.5"],"3"],
      [["99999999999999999999","1"],"100000000000000000000"],
      [["0","0"],"0"],
      [["0.0","0.00"],"0"],
      [["5","5"],"10"],
      [["0.5","0.5"],"1"],
      [["9.99","0.01"],"10"],
      [["1","0.001"],"1.001"],
      [["100","0.0"],"100"],
      [["0.05","0.05"],"0.1"],
      [[{"$concat":[{"$rep":"9","n":100000}]},"1"],{"$concat":["1",{"$rep":"0","n":100000}]}],
      [[{"$concat":["0.",{"$rep":"9","n":99998}]},{"$concat":["0.",{"$rep":"0","n":99997},"1"]}],"1"],
      [[{"$rep":"1","n":100000},{"$rep":"1","n":100000}],{"$rep":"2","n":100000}]
    ] },
    solution: {
      approach: `<p>Align by place value, then classic right-to-left addition with carry over the combined digit strings (collect digits in an array, reverse once at the end). Normalise the result's zeros. Verified against BigInt in the tests (allowed only for checking).</p>`,
      code: { lang: 'js', run: true, code: `
function addDecimalStrings(a, b) {
  const [ai, af = ""] = a.split(".");
  const [bi, bf = ""] = b.split(".");
  const fracLen = Math.max(af.length, bf.length);
  const intLen = Math.max(ai.length, bi.length);
  const A = ai.padStart(intLen, "0") + af.padEnd(fracLen, "0");   // aligned digits
  const B = bi.padStart(intLen, "0") + bf.padEnd(fracLen, "0");

  const out = [];
  let carry = 0;
  for (let i = A.length - 1; i >= 0; i--) {
    const sum = (A.charCodeAt(i) - 48) + (B.charCodeAt(i) - 48) + carry;
    out.push(sum % 10);
    carry = sum >= 10 ? 1 : 0;
  }
  if (carry) out.push(1);
  const digits = out.reverse().join("");

  let intPart = digits.slice(0, digits.length - fracLen).replace(/^0+(?=\\d)/, "");
  let fracPart = digits.slice(digits.length - fracLen).replace(/0+$/, "");
  if (intPart === "") intPart = "0";
  return fracPart ? \`\${intPart}.\${fracPart}\` : intPart;
}

console.log(addDecimalStrings("123.45", "0.555"));                  // 124.005
console.log(addDecimalStrings("0.1", "0.2"));                       // 0.3
console.log(addDecimalStrings("1.5", "1.5"));                       // 3
console.log(addDecimalStrings("99999999999999999999", "1"));        // 100000000000000000000
// Verify integers against BigInt (only for testing)
const x = "123456789012345678901234567890", y = "987654321098765432109876543210";
console.log(addDecimalStrings(x, y) === String(BigInt(x) + BigInt(y)));   // true
` },
      dry: { head: ['col (right→left)', 'A digit', 'B digit', 'carry in', 'sum', 'write', 'carry out'], rows: [['3rd frac', '0', '5', '0', '5', '5', '0'], ['2nd frac', '5', '5', '0', '10', '0', '1'], ['1st frac', '4', '5', '1', '10', '0', '1'], ['ones', '3', '0', '1', '4', '4', '0'], ['tens, hundreds', '2, 1', '0, 0', '0', '2, 1', '2, 1', '0']] },
      complexity: `<p>O(n + m) time and space.</p>`,
      followUps: ['Support negative numbers (implement subtraction and pick by comparing magnitudes).', 'Multiply two decimal strings (grade-school O(n·m)).']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'You type <code>console.log("hi")</code> into the browser console. What appears?', options: ['<code>hi</code> only', '<code>hi</code> and then <code>undefined</code>', '<code>"hi"</code> with quotes only', 'Nothing until you press Run'], answer: 1, explain: 'console.log prints hi; then the REPL echoes the value of the whole expression, which is log\'s return value: undefined.' },
    { q: 'What does this print? <pre>console.log(x);\nvar x = 5;</pre>', options: ['5', 'undefined', 'ReferenceError', 'null'], answer: 1, explain: 'var declarations are hoisted and initialised to undefined before the code runs; the assignment of 5 happens later, on line 2.' },
    { q: 'And this? <pre>console.log(y);\nlet y = 5;</pre>', options: ['5', 'undefined', 'ReferenceError: Cannot access \'y\' before initialization', 'SyntaxError'], answer: 2, explain: 'let/const are hoisted but stay uninitialised until their declaration line runs — reading them earlier is the Temporal Dead Zone and throws.' },
    { q: 'Which line throws an error? <pre>const arr = [1];\narr.push(2);   // A\narr[0] = 9;    // B\narr = [3];     // C</pre>', options: ['A', 'B', 'C', 'None'], answer: 2, explain: 'const prevents re-pointing the name (line C → TypeError: Assignment to constant variable). Mutating the array\'s contents (A, B) is allowed.' },
    { q: 'What is <code>typeof null</code>?', options: ['"null"', '"undefined"', '"object"', '"NaN"'], answer: 2, explain: 'A famous bug from JavaScript\'s first implementation, kept for backward compatibility. Use x === null to test for null.' },
    { q: 'What is <code>"5" + 3 - 1</code>?', options: ['7', '"52"', '52', '"531"'], answer: 2, explain: 'Left to right: "5" + 3 → "53" (string join); "53" - 1 → 52 (minus always converts to numbers). The result is the number 52.' },
    { q: 'Which of these is TRUTHY?', options: ['<code>0</code>', '<code>""</code>', '<code>"0"</code>', '<code>NaN</code>'], answer: 2, explain: '"0" is a non-empty string, and every non-empty string is truthy. 0, "", NaN (plus false, -0, 0n, null, undefined) are the falsy values.' },
    { q: 'What is <code>0 || "a"</code> vs <code>0 ?? "a"</code>?', options: ['"a" and "a"', '"a" and 0', '0 and "a"', 'true and false'], answer: 1, explain: '|| falls back for any falsy left side (0 is falsy) → "a". ?? only falls back for null/undefined → keeps 0.' },
    { q: 'What is <code>[] == ![]</code>?', options: ['true', 'false', 'TypeError', 'undefined'], answer: 0, explain: '![] is false (arrays are truthy). [] == false → false becomes 0 → [] becomes "" → "" becomes 0 → 0 == 0 → true.' },
    { q: 'What is <code>0.1 + 0.2 === 0.3</code>?', options: ['true', 'false', 'TypeError', 'Depends on the browser'], answer: 1, explain: '0.1 and 0.2 cannot be stored exactly in binary floating point; their sum is 0.30000000000000004, a different double than the literal 0.3. This is IEEE-754 behaviour, identical in every engine.' },
    { q: 'Which correctly checks whether <code>x</code> is NaN?', options: ['<code>x === NaN</code>', '<code>x == NaN</code>', '<code>Number.isNaN(x)</code>', '<code>typeof x === "NaN"</code>'], answer: 2, explain: 'NaN is not equal to anything, including itself, so comparisons never work. typeof NaN is "number". Number.isNaN is precise (unlike global isNaN, which converts strings first).' },
    { q: 'What does <code>"Hello".slice(1, 3)</code> return?', options: ['"el"', '"ell"', '"He"', '"llo"'], answer: 0, explain: 'slice(start, end) includes start (index 1 = "e") and excludes end (index 3), giving characters at indexes 1 and 2: "el".' },
    { q: 'What does this switch log for <code>x = 2</code>? <pre>switch (x) {\n  case 1: console.log("one");\n  case 2: console.log("two");\n  case 3: console.log("three"); break;\n  default: console.log("other");\n}</pre>', options: ['two', 'two three', 'two three other', 'one two three'], answer: 1, explain: 'Execution starts at case 2 and falls through into case 3 (no break after "two"), then the break after "three" leaves the switch.' },
    { q: 'What is <code>parseInt("42px")</code> vs <code>Number("42px")</code>?', options: ['42 and 42', '42 and NaN', 'NaN and NaN', 'NaN and 42'], answer: 1, explain: 'parseInt is lenient: it reads leading digits and stops at "p". Number is strict: the whole (trimmed) string must be numeric, otherwise NaN.' }
  );

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push(
    { q: 'What is the difference between a JavaScript engine and a JavaScript runtime?', level: 'B',
      a: `<p>The <b>engine</b> (V8, SpiderMonkey, JavaScriptCore) parses and executes the language itself: variables, functions, objects, the core built-ins like <code>Math</code> and <code>JSON</code>. A <b>runtime</b> wraps an engine and adds host APIs plus an event loop: the browser adds <code>document</code>, <code>window</code>, <code>fetch</code>, timers; Node.js adds <code>fs</code>, <code>process</code>, <code>http</code>, modules. That's why <code>document</code> crashes in Node and <code>require("fs")</code> doesn't exist in a browser — same language, different host. Deno and Bun are other runtimes (Bun uses JavaScriptCore).</p>`,
      followUps: ['Is <code>setTimeout</code> part of the JavaScript language?', 'How would you write code that runs in both environments?'] },
    { q: 'Explain the differences between var, let and const.', level: 'B',
      a: `<p><b>Scope:</b> var is function-scoped (ignores blocks); let/const are block-scoped. <b>Hoisting:</b> all are hoisted, but var is initialised to undefined while let/const stay uninitialised until their line (TDZ → ReferenceError if accessed early). <b>Reassignment:</b> var and let can be reassigned; const cannot (but the object it points to can still be mutated). <b>Redeclaration:</b> var allows it silently; let/const throw a SyntaxError. <b>Globals:</b> a top-level var in a classic script becomes a property of <code>window</code>. Modern practice: const by default, let when reassigning, never var.</p>`,
      followUps: ['What is the Temporal Dead Zone and why was it introduced?', 'How do you make an object truly immutable?'] },
    { q: 'What are the data types in JavaScript?', level: 'B',
      a: `<p>Eight types: seven <b>primitives</b> — string, number, bigint, boolean, undefined, null, symbol — and <b>object</b> (which includes arrays, functions, dates, maps, etc.). Primitives are immutable and compared by value; objects are mutable and compared by reference (<code>{} === {}</code> is false). <code>typeof</code> reports them, with two quirks: <code>typeof null</code> is "object" (historic bug) and functions report "function". JavaScript is dynamically typed: types belong to values, not variables.</p>`,
      followUps: ['How do you reliably check for an array?', 'Why can you call methods on a primitive string?'] },
    { q: 'What is the difference between null and undefined?', level: 'B',
      a: `<p><b>undefined</b> means "no value has been assigned": it is the default for uninitialised variables, missing properties, missing arguments and functions without a return. <b>null</b> is an explicit "intentionally empty" value set by the programmer. <code>null == undefined</code> is true, <code>null === undefined</code> is false. <code>typeof undefined</code> is "undefined", <code>typeof null</code> is "object". In arithmetic, <code>Number(null)</code> is 0 and <code>Number(undefined)</code> is NaN. JSON keeps null but drops undefined properties. Nullish operators (<code>??</code>, <code>?.</code>) treat both the same way.</p>`,
      followUps: ['Why is <code>null &gt;= 0</code> true but <code>null == 0</code> false?', 'When would you deliberately return null instead of undefined from an API?'] },
    { q: 'Explain == vs === with examples. When, if ever, would you use ==?', level: 'I',
      a: `<p><code>===</code> (strict) compares type and value with no conversion. <code>==</code> (loose) first coerces using the IsLooselyEqual rules: null and undefined equal only each other; booleans become numbers; a string compared with a number becomes a number; objects become primitives via valueOf/toString. Examples: <code>1 == "1"</code> true, <code>0 == ""</code> true, <code>null == 0</code> false, <code>[] == false</code> true, <code>NaN == NaN</code> false. Default to ===. The one common, deliberate use of == is <code>x == null</code> to test "null or undefined" in one check (often replaced by <code>??</code> today). For NaN/-0-aware equality use <code>Object.is</code>.</p>`,
      followUps: ['Walk through <code>[] == ![]</code> step by step.', 'What equality do <code>includes</code>, <code>indexOf</code> and <code>Map</code> keys use?'] },
    { q: 'What are truthy and falsy values? Give tricky examples.', level: 'B',
      a: `<p>In a boolean context (if, while, !, &amp;&amp;, ||, ternary) a value is converted with ToBoolean. Exactly eight values are falsy: <code>false</code>, <code>0</code>, <code>-0</code>, <code>0n</code>, <code>""</code>, <code>null</code>, <code>undefined</code>, <code>NaN</code>. Everything else is truthy, including <code>"0"</code>, <code>"false"</code>, <code>" "</code>, <code>[]</code>, <code>{}</code>, <code>new Boolean(false)</code> and <code>Infinity</code>. Classic bugs: <code>if (arr)</code> to test emptiness (always true), and <code>value || default</code> discarding valid 0/""/false — use <code>??</code> or explicit checks instead.</p>`,
      followUps: ['What does <code>!!</code> do?', 'What is special about <code>document.all</code>?'] },
    { q: 'Why does 0.1 + 0.2 !== 0.3 and how do you handle money in JavaScript?', level: 'I',
      a: `<p>All JS numbers are IEEE-754 64-bit binary floats. Decimal fractions like 0.1 have infinite binary expansions, so they are rounded to the nearest representable value; the rounding errors of 0.1 and 0.2 add up to 0.30000000000000004, which is a different double than the literal 0.3. Comparisons should use a tolerance (<code>Math.abs(a - b) &lt; Number.EPSILON * scale</code>). For money, store <b>integer minor units</b> (cents/paise), do integer arithmetic, and format at the edge with <code>Intl.NumberFormat</code>; for very large values use BigInt, or a decimal library when you need arbitrary decimal precision (division, interest).</p>`,
      followUps: ['What is Number.MAX_SAFE_INTEGER and why 2<sup>53</sup> − 1?', 'Why is <code>(1.005).toFixed(2)</code> "1.00"?'] },
    { q: 'What is NaN? How do isNaN and Number.isNaN differ?', level: 'I',
      a: `<p>NaN ("Not a Number") is a special <b>number</b> value representing an invalid numeric result: <code>0/0</code>, <code>Math.sqrt(-1)</code>, <code>Number("abc")</code>, <code>undefined + 1</code>. It is the only value not equal to itself (<code>NaN !== NaN</code>), and it propagates through arithmetic. The global <code>isNaN(x)</code> first converts x to a number, so <code>isNaN("hello")</code> is true even though "hello" is a string, not NaN. <code>Number.isNaN(x)</code> returns true only for the actual NaN value. <code>Object.is(x, NaN)</code> and <code>x !== x</code> also work.</p>`,
      followUps: ['Why does <code>[NaN].includes(NaN)</code> return true but <code>[NaN].indexOf(NaN)</code> return -1?', 'How would you debug a NaN that appears in a large computation?'] },
    { q: 'How does the + operator decide between addition and string concatenation?', level: 'I',
      a: `<p>Both operands are first converted with ToPrimitive (objects call <code>Symbol.toPrimitive</code>, else valueOf, else toString — arrays become their joined string, plain objects "[object Object]"). If <b>either</b> resulting primitive is a string, both are converted to strings and joined. Otherwise both are converted to numbers (or both must be BigInt — mixing throws a TypeError) and added. Evaluation is left to right, so <code>1 + 2 + "3"</code> is "33" while <code>"1" + 2 + 3</code> is "123". All other arithmetic operators (<code>- * / % **</code>) always convert to numbers: <code>"5" - 2</code> is 3.</p>`,
      followUps: ['What are <code>[] + []</code>, <code>[] + {}</code> and <code>{} + []</code> at the start of a console line?', 'How do Date objects behave differently with + ?'] },
    { q: 'What is the difference between || and ?? (and what are ||=, &&=, ??=)?', level: 'I',
      a: `<p><code>a || b</code> returns a if a is truthy, otherwise b — so it replaces every falsy value (0, "", false, NaN). <code>a ?? b</code> returns a unless a is null or undefined — it keeps 0, "" and false. Both short-circuit: b is not evaluated if a decides. They cannot be mixed without parentheses (<code>a || b ?? c</code> is a SyntaxError). The logical assignments (ES2021) combine this with assignment and only assign when needed: <code>x ||= v</code> assigns if x is falsy, <code>x &amp;&amp;= v</code> if x is truthy, <code>x ??= v</code> if x is null/undefined — handy for lazy defaults like <code>cache[key] ??= compute()</code>.</p>`,
      followUps: ['Why is <code>obj.x ??= 1</code> not exactly the same as <code>obj.x = obj.x ?? 1</code>?', 'Rewrite <code>user &amp;&amp; user.profile &amp;&amp; user.profile.name</code> in modern syntax.'] },
    { q: 'What is Automatic Semicolon Insertion and how can it break code?', level: 'A',
      a: `<p>ASI is the parser rule that inserts semicolons at line breaks when the next token cannot continue the statement, at the end of input, and after "restricted productions" (return, break, continue, throw, postfix ++/--, yield) when followed by a newline. Two failure modes: (1) <code>return</code> followed by a newline and an object literal returns undefined; (2) no insertion happens when the next line starts with <code>(</code>, <code>[</code>, a template backtick, <code>+</code>, <code>-</code> or <code>/</code>, so it is glued to the previous expression — e.g. a line starting with <code>[1, 2].forEach</code> becomes an index access on the previous value. Fix: use semicolons or a formatter (Prettier), and lint with <code>no-unexpected-multiline</code>.</p>`,
      followUps: ['Which style guides use no semicolons, and what rule do they follow?', 'Why does <code>a\n++b</code> increment b and not a?'] },
    { q: 'Explain how JavaScript strings handle Unicode. Why can "😀".length be 2?', level: 'A',
      a: `<p>Strings are sequences of UTF-16 code units. Characters in the Basic Multilingual Plane take one unit; others (most emoji, some CJK) need two — a surrogate pair — so <code>"😀".length</code> is 2 and <code>s[0]</code> returns half a character. Iteration APIs (<code>for...of</code>, spread, <code>Array.from</code>, <code>codePointAt</code>) work on code points instead. User-perceived characters (graphemes) may consist of several code points (👨‍👩‍👧, flags, accents), so correct character counting or truncation needs <code>Intl.Segmenter</code>. Also normalise with <code>normalize("NFC")</code> before comparing, and use <code>localeCompare</code> / <code>Intl.Collator</code> for sorting.</p>`,
      followUps: ['How would you truncate a tweet to 280 user-visible characters safely?', 'What do <code>isWellFormed</code>/<code>toWellFormed</code> do?'] },
    { q: 'Why is typeof null "object", and what other legacy quirks are kept in the language?', level: 'E',
      a: `<p>In the original 1995 implementation, values carried a type tag in their low bits; objects used tag 000 and null was the null pointer (all zeros), so typeof read it as an object. A proposal to change it to "null" was rejected because it broke real websites — the TC39 principle is "don't break the web". Other kept quirks: <code>document.all</code> being falsy with typeof "undefined" (the [[IsHTMLDDA]] slot), <code>var</code> hoisting and function scope, the loose equality algorithm, global <code>isNaN</code>, <code>Date</code> month indexes starting at 0, and sloppy-mode implicit globals. The language evolves by <b>adding</b> better alternatives (let/const, Number.isNaN, ??, Temporal) rather than changing old behaviour; strict mode and modules opt into stricter semantics.</p>`,
      followUps: ['What does "use strict" change? Name four behaviours.', 'How does TC39\'s stage process work?'] },
    { q: 'Design question: a payments dashboard shows totals like 19.989999999999998 and some order IDs end in 00. What went wrong and how do you fix it end to end?', level: 'E',
      a: `<p>Two number-model bugs. (1) <b>Float money:</b> prices are summed as binary doubles, accumulating rounding error. Fix: represent amounts as integer minor units (or decimal strings) from the API through the database to the client; sum integers; format with <code>Intl.NumberFormat</code> only for display; for tax/percentages define an explicit rounding rule (half-up, banker's) applied in integer space. (2) <b>Corrupted IDs:</b> 64-bit IDs exceed 2<sup>53</sup> − 1, so <code>JSON.parse</code> rounds them to the nearest double (trailing digits become 00). Fix: send IDs as <b>strings</b> in JSON (Twitter's id_str approach), or parse with a reviver/JSON.parse source access and BigInt; never do arithmetic on IDs. Add tests at the boundaries (2<sup>53</sup>, many small amounts) and a lint/type rule (branded types in TypeScript) so money and IDs can't be plain numbers.</p>`,
      followUps: ['How would you handle currency with 3 decimal places (e.g. KWD) or zero (JPY)?', 'Where should rounding happen in a multi-line invoice with discounts?'] }
  );

  /* =====================================================================
     MODULE REGISTRATION
     ===================================================================== */
  registerModule({
    id: 'js01',
    title: 'JavaScript Basics: Syntax, Types & Operators',
    lang: 'js',
    intro: `<p>Welcome to JavaScript — the only language that runs natively in every web browser, and (through Node.js, Deno and Bun) on servers, laptops and edge networks too. This module is your <b>solid ground floor</b>. We start by actually running code (browser console and Node), then learn how to store values with <code>let</code>, <code>const</code> and the old <code>var</code>, meet the <b>seven primitive types</b> and the quirky <code>typeof</code> operator, work with strings and template literals, and tame numbers — including <code>NaN</code>, <code>Infinity</code>, floating-point surprises and <code>BigInt</code>.</p>
<p>Then we tackle the part interviewers love: <b>operators and type coercion</b> (<code>==</code> vs <code>===</code>, <code>"5" + 3</code> vs <code>"5" - 3</code>), the short list of <b>falsy</b> values, <code>||</code> vs <code>??</code>, and finally <b>control flow</b> — <code>if</code>, <code>switch</code>, loops, <code>break</code>/<code>continue</code>. Every topic has a step-by-step visualizer you can feed your own input, runnable examples, "predict the output" puzzles and AI-era advice, so by the end you can read tricky JS snippets like a JavaScript engine would.</p>`,
    goals: [
      'Run JavaScript in the browser console and in Node.js, and explain the difference between an engine and a runtime',
      'Choose between <code>const</code>, <code>let</code> and <code>var</code> and predict hoisting / block-scope behaviour',
      'Name all 7 primitive types, explain <code>typeof null === "object"</code>, and tell <code>null</code> from <code>undefined</code>',
      'Use strings and template literals fluently (slice, includes, padStart, split/join, immutability, Unicode pitfalls)',
      'Explain <code>0.1 + 0.2 !== 0.3</code>, detect <code>NaN</code> correctly, and know when to reach for <code>BigInt</code> or integer cents',
      'Predict the result of any coercion puzzle (<code>+</code>, <code>==</code>, comparisons) by walking the spec\'s steps',
      'List all falsy values from memory and pick correctly between <code>||</code>, <code>??</code> and <code>?.</code>',
      'Write clean control flow with if/else, switch (and fall-through), for/while/do-while, for...of vs for...in, labels, break and continue'
    ],
    prereqs: `<p>None — this is the first JavaScript module. Basic comfort with a text editor and a terminal helps. Install a recent <b>Node.js LTS</b> (22 or 24) to run snippets locally, or just use the ▶ Run buttons on this page.</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
