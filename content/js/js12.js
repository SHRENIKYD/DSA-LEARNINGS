(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (js12) ---------- */
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function cp(code, hlMap, label) { return { type: 'code', label: label || 'JavaScript (current line highlighted)', lang: 'js', code: code, hl: hlMap || {} }; }
  function vp(obj, hlMap, label) {
    var vals = {};
    Object.keys(obj).forEach(function (k) { vals[k] = String(obj[k]); });
    return { type: 'vars', label: label || 'Variables', vals: vals, hl: hlMap || {} };
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function items(s) { return String(s).split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x.length; }); }
  function bx(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 16 }; }
  function one(k, v) { var o = {}; o[k] = v; return o; }
  // The V8 pipeline as boxes, reused by several visualizers
  function pipeline(hl, ehl, tags, extraLabel) {
    return {
      type: 'graph', label: extraLabel || 'V8 pipeline', directed: true, height: 62,
      nodes: [
        bx('SRC', 'Source text', 8, 10, 14), bx('SCAN', 'Scanner', 28, 10, 13), bx('PARSE', 'Parser', 48, 10, 13),
        bx('AST', 'AST', 68, 10, 10), bx('IGN', 'Ignition (bytecode)', 88, 10, 18),
        bx('SPK', 'Sparkplug', 88, 32, 14), bx('MAG', 'Maglev', 62, 32, 13), bx('TF', 'TurboFan', 36, 32, 14),
        bx('MC', 'Optimized machine code', 36, 54, 22), bx('FB', 'Feedback vector', 70, 54, 18)
      ],
      edges: [['SRC', 'SCAN', 'chars'], ['SCAN', 'PARSE', 'tokens'], ['PARSE', 'AST'], ['AST', 'IGN', 'bytecode'], ['IGN', 'SPK', 'warm'], ['SPK', 'MAG', 'hot'], ['MAG', 'TF', 'very hot'], ['TF', 'MC'], ['IGN', 'FB', 'records types'], ['MC', 'IGN', 'deopt']],
      hl: hl || {}, ehl: ehl || {}, tags: tags || {}
    };
  }

  /* ================= TOPIC 1: Parsing ================= */
  topics.push({
    title: 'From Source Text to Bytecode: Scanner, Parser, AST & Lazy Parsing',
    analogy: `<p>Think of a <b>chef reading a long recipe book</b> before a dinner party. A smart chef does not study all 300 recipes in detail. They <b>skim</b> every page quickly (to check nothing is torn or missing), and only <b>read carefully</b> the recipes they will actually cook tonight. If a guest later orders dessert, the chef reads that recipe properly <i>then</i>.</p>
<p>V8 does the same with your JavaScript. It <b>skims</b> (pre-parses) every function to check the grammar, and only <b>fully parses and compiles</b> a function when it is actually called.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Your JavaScript arrives as plain text, a long string of characters. The CPU cannot run text. So the engine (V8 in Chrome, Node.js, Deno, Edge; SpiderMonkey in Firefox; JavaScriptCore in Safari and Bun) turns it into something runnable in a few steps:</p>
${H.table(['Step', 'Who does it', 'Input → output', 'Everyday picture'], [
  ['1. Scan', '<b>Scanner</b> (tokenizer)', 'characters → <b>tokens</b>', 'Splitting a sentence into words'],
  ['2. Parse', '<b>Parser</b>', 'tokens → <b>AST</b> (Abstract Syntax Tree)', 'Diagramming the sentence: subject, verb, object'],
  ['3. Generate bytecode', '<b>Bytecode generator</b>', 'AST → <b>bytecode</b>', 'Writing a short to-do list from the diagram'],
  ['4. Run', '<b>Ignition</b> interpreter', 'bytecode → actions', 'Following the to-do list step by step']
])}
<p>Example: <code>let total = price + tax * 2;</code></p>
${H.chips(['let', 'total', '=', 'price', '+', 'tax', '*', '2', ';'], { label: 'Tokens', hl: { 0: 'p', 1: 'b', 3: 'b', 5: 'b', 7: 'g' } })}
<p>The parser knows <b>operator precedence</b>, so <code>tax * 2</code> becomes a smaller sub-tree under <code>+</code>. That tree (the AST) is what later steps work with.</p>
<p>🔵 <b>Lazy parsing — the big startup trick.</b> Most functions on a web page are <i>not</i> called during startup (think: error handlers, settings dialogs). Fully parsing them would waste time and memory. So V8 uses two parsers:</p>
<ul>
<li><b>Pre-parser</b> (fast skim): checks the grammar and notes which outer variables the function uses, but builds <b>no AST</b> and <b>no bytecode</b>.</li>
<li><b>Full parser</b>: builds the AST, then bytecode is generated. This happens the <b>first time the function is called</b>.</li>
</ul>
<p>Top-level code is parsed fully right away (it runs immediately). An inner function that is never called costs only one quick pre-parse.</p>
<p>🔵 <b>Errors.</b> A <code>SyntaxError</code> anywhere in a script (even inside a function that is never called) stops the <i>whole script</i> before any line of it runs. That is because the pre-parser still checks the grammar. A <code>TypeError</code> only happens at <i>runtime</i>, when that line actually executes.</p>`,
    clues: ['"What happens when the browser downloads a JS file?" → scan, parse, compile to bytecode, interpret', '"Why is our app slow to start / poor Time-to-Interactive?" → parse + compile cost of a big bundle; code-split, lazy load', '"Why does a typo in an unused function break the whole page?" → early SyntaxError from the (pre-)parser', '"What is an AST used for?" → engines, Babel, ESLint, Prettier, bundlers, codemods', '"What is lazy parsing / pre-parsing?" → skim now, fully compile on first call', '"Large inline config object slows startup" → <code>JSON.parse</code> of a string is faster to parse than a huge JS object literal'],
    code: [{ lang: 'js', run: true, title: 'Syntax errors are found before ANY code runs (even in uncalled functions)', code: `
// new Function(...) asks the engine to parse a fresh piece of source text.
const goodSource = 'function neverCalled() { return 1 + 2; }  return "script ran";';
const badSource  = 'function neverCalled() { return 1 + ; }   return "script ran";';

console.log(new Function(goodSource)()); // "script ran"

try {
  // neverCalled is never invoked, but the pre-parser still checks its grammar.
  new Function(badSource);
} catch (e) {
  console.log('Parse failed before running anything:', e.name);
}

// Runtime errors are different: they only fire when the line executes.
const lazyBomb = new Function('function boom() { return null.x; }  return "parsed fine";');
console.log(lazyBomb()); // "parsed fine" - boom() was never called, so no TypeError
` }, { lang: 'js', run: true, title: 'A 40-line toy scanner (tokenizer) like the first stage of V8', code: `
// Turns source text into tokens: the very first thing every engine does.
const KEYWORDS = new Set(['let', 'const', 'var', 'function', 'return', 'if', 'else']);

function scan(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\\s/.test(ch)) { i++; continue; }                 // skip whitespace
    if (/[0-9]/.test(ch)) {                                // number literal
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ type: 'Number', value: src.slice(i, j) });
      i = j; continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {                           // identifier or keyword
      let j = i;
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      tokens.push({ type: KEYWORDS.has(word) ? 'Keyword' : 'Identifier', value: word });
      i = j; continue;
    }
    if (src.startsWith('===', i)) { tokens.push({ type: 'Punctuator', value: '===' }); i += 3; continue; }
    if ('+-*/=;(){}<>,'.includes(ch)) { tokens.push({ type: 'Punctuator', value: ch }); i++; continue; }
    throw new SyntaxError('Unexpected character ' + ch + ' at ' + i);
  }
  return tokens;
}

console.log(scan('let total = price + tax * 2;').map(t => t.type + ':' + t.value).join('  '));
` }],
    codeTitle: ['Early (parse-time) errors vs runtime errors — runnable', 'Toy scanner — runnable'],
    viz: [{
      title: 'Scanner → Parser → AST → Bytecode for one line',
      input: 'let total = price + tax * 2;',
      inputLabel: 'One declaration: let NAME = expression; (use + - * / and parentheses)',
      gen: function (input) {
        var src = String(input || '').trim();
        if (!src) throw new Error('Type something like: let total = price + tax * 2;');
        if (src.length > 60) throw new Error('Keep it under 60 characters');
        var toks = [], m, re = /\s*([0-9]+(?:\.[0-9]+)?|[A-Za-z_$][A-Za-z0-9_$]*|[-+*\/=;()])/y, pos = 0;
        while (pos < src.length) {
          re.lastIndex = pos;
          m = re.exec(src);
          if (!m) { if (/^\s+$/.test(src.slice(pos))) break; throw new Error('Unexpected character near "' + src.slice(pos, pos + 5) + '". Use letters, numbers, + - * / ( ) = ;'); }
          toks.push(m[1]); pos = re.lastIndex;
        }
        if (toks.length > 16) throw new Error('Use at most 16 tokens');
        var kinds = toks.map(function (t) { return /^(let|const|var)$/.test(t) ? 'Keyword' : /^[0-9]/.test(t) ? 'Number' : /^[A-Za-z_$]/.test(t) ? 'Identifier' : 'Punctuator'; });
        // recursive-descent parser for: (let|const|var) NAME = expr ;?
        var p = 0;
        function peek() { return toks[p]; }
        function eat(t) { if (toks[p] !== t) throw new Error('Expected "' + t + '" but found "' + (toks[p] || 'end of input') + '"'); p++; }
        function factor() {
          var t = toks[p];
          if (t === '(') { p++; var e = expr(); eat(')'); return e; }
          if (t === undefined || !/^[A-Za-z0-9_$.]+$/.test(t) || /^(let|const|var)$/.test(t)) throw new Error('Expected a name or number but found "' + (t || 'end of input') + '"');
          p++; return { v: t };
        }
        function term() { var n = factor(); while (peek() === '*' || peek() === '/') { var op = toks[p++]; n = { v: op, l: n, r: factor() }; } return n; }
        function expr() { var n = term(); while (peek() === '+' || peek() === '-') { var op = toks[p++]; n = { v: op, l: n, r: term() }; } return n; }
        if (!/^(let|const|var)$/.test(toks[0] || '')) throw new Error('Start with let, const or var');
        p = 1;
        var name = toks[p];
        if (!name || !/^[A-Za-z_$]/.test(name)) throw new Error('Expected a variable name after ' + toks[0]);
        p++; eat('=');
        var init = expr();
        if (peek() === ';') p++;
        if (p !== toks.length) throw new Error('Unexpected extra token "' + toks[p] + '"');
        var root = { v: '= (' + toks[0] + ')', l: { v: name }, r: init };
        function depth(n) { return n ? 1 + Math.max(depth(n.l), depth(n.r)) : 0; }
        if (depth(root) > 4) throw new Error('Expression too deep for the picture (tree depth ≤ 4). Try: let total = price + tax * 2;');
        var arr = []; for (var q = 0; q < 15; q++) arr.push(null);
        var levelOf = [];
        (function place(n, i, d) { if (!n) return; arr[i] = n.v; levelOf[i] = d; place(n.l, 2 * i + 1, d + 1); place(n.r, 2 * i + 2, d + 1); })(root, 0, 0);
        while (arr.length && arr[arr.length - 1] === null) arr.pop();
        // illustrative bytecode generator (accumulator machine, like Ignition)
        var bc = [], reg = 0, OPS = { '+': 'Add', '-': 'Sub', '*': 'Mul', '/': 'Div' };
        function gen(n) {
          if (!n.l) { if (/^[0-9]+$/.test(n.v) && Number(n.v) < 1073741824) bc.push('LdaSmi [' + n.v + ']'); else if (/^[0-9]/.test(n.v)) bc.push('LdaConstant [' + n.v + ']'); else bc.push('LdaGlobal [' + n.v + ']'); return; }
          if (!n.r.l && /^[0-9]+$/.test(n.r.v)) { gen(n.l); bc.push(OPS[n.v] + 'Smi [' + n.r.v + ']'); return; }
          gen(n.l); var r = 'r' + (reg++); bc.push('Star ' + r); gen(n.r); bc.push(OPS[n.v] + ' ' + r);
        }
        gen(init); bc.push('StaGlobal [' + name + ']   ; illustrative store'); bc.push('Return');
        var frames = [];
        frames.push(fr('The engine receives <b>' + src.length + ' characters</b> of plain text. To the CPU this is just bytes. Step 1 is the <b>scanner</b>: it walks the characters left to right and groups them into <b>tokens</b> (the "words" of JavaScript).', [
          { type: 'array', label: 'source characters (first 24)', values: src.slice(0, 24).split('').map(function (c) { return c === ' ' ? '␣' : c; }) },
          pipeline({ SRC: 'cur', SCAN: 'cur' }, { 'SRC-SCAN': 'cur' })
        ]));
        for (var k = 0; k < toks.length; k++) {
          var hl = one(k, 'cur');
          frames.push(fr('Scanner emits token <b>' + esc(toks[k]) + '</b> of kind <b>' + kinds[k] + '</b>. ' + (kinds[k] === 'Keyword' ? 'Keywords are reserved words with fixed meaning.' : kinds[k] === 'Identifier' ? 'Identifiers are names the program chose.' : kinds[k] === 'Number' ? 'Number literals become constants (small integers become <b>Smis</b>, see Topic 5).' : 'Punctuators are operators and separators. Whitespace was skipped: it never becomes a token.'), [
            { type: 'array', label: 'tokens so far', values: toks.slice(0, k + 1), hl: hl, idxLabels: kinds.slice(0, k + 1).map(function (x) { return x.slice(0, 5); }) },
            pipeline({ SCAN: 'cur' })
          ]));
        }
        var maxLvl = 0; levelOf.forEach(function (d) { if (d > maxLvl) maxLvl = d; });
        for (var L = 0; L <= maxLvl; L++) {
          var partial = arr.map(function (v, i) { return levelOf[i] !== undefined && levelOf[i] <= L ? v : null; });
          while (partial.length && partial[partial.length - 1] === null) partial.pop();
          var thl = {}; arr.forEach(function (v, i) { if (levelOf[i] === L) thl[i] = 'ok'; });
          frames.push(fr(L === 0 ? 'The <b>parser</b> reads the tokens with grammar rules and builds the <b>AST</b>. The root is the declaration: "assign the value on the right to <b>' + esc(name) + '</b>".' : 'AST level ' + L + ': the parser used <b>precedence</b> (<code>*</code> and <code>/</code> bind tighter than <code>+</code> and <code>-</code>), so the tighter operations sit <b>deeper</b> and are evaluated first.', [
            { type: 'tree', label: 'AST (built top-down for the picture)', arr: partial, hl: thl },
            pipeline({ PARSE: 'cur', AST: 'ok' }, { 'SCAN-PARSE': 'cur', 'PARSE-AST': 'ok' })
          ]));
        }
        for (var b = 0; b < bc.length; b++) {
          var chl = {}; chl[b + 1] = 'cur';
          frames.push(fr('The <b>bytecode generator</b> walks the AST and writes compact instructions for <b>Ignition</b>, an accumulator machine: most instructions read or write one hidden register called the <b>accumulator</b>. Now: <code>' + esc(bc[b]) + '</code>.', [
            { type: 'code', label: 'Illustrative Ignition bytecode', lang: 'text', code: bc.join('\n'), hl: chl },
            { type: 'tree', label: 'AST', arr: arr },
            pipeline({ IGN: 'cur' }, { 'AST-IGN': 'cur' })
          ]));
        }
        frames.push(fr('Done: text → tokens → AST → bytecode. The AST is thrown away after bytecode is made (it is big). From here, <b>Ignition</b> runs the bytecode and starts collecting <b>type feedback</b> for the JIT compilers (next topic).', [
          { type: 'code', label: 'Final bytecode', lang: 'text', code: bc.join('\n') },
          pipeline({ IGN: 'ok', FB: 'sel' }, { 'IGN-FB': 'ok' })
        ]));
        return frames;
      }
    }, {
      title: 'Lazy parsing: who gets a quick skim and who gets a full parse?',
      gen: function () {
        var code = 'const config = loadConfig();      // top-level: runs now\n\nfunction loadConfig() {             // called at startup\n  return { theme: "dark" };\n}\n\nfunction openSettingsDialog() {     // only on click\n  /* 300 lines */\n}\n\n(function init() {                  // PIFE: wrapped in ( )\n  console.log("ready");\n})();';
        var row = function (fn, a, b, c) { return [fn, a, b, c]; };
        var frames = [];
        frames.push(fr('A file with top-level code, two normal functions and one function wrapped in parentheses. V8 must decide, for each function: <b>full parse now</b> or <b>pre-parse (skim) now, full parse later</b>?', [cp(code, {}), { type: 'table', label: 'Parsing decisions', columns: ['function', 'first pass', 'full parse?', 'why'], rows: [] }]));
        var rows = [];
        rows.push(row('top-level', 'full parse', 'now', 'it runs immediately'));
        frames.push(fr('Top-level code always runs right away, so it gets a <b>full parse</b> and bytecode immediately.', [cp(code, { 1: 'cur' }), { type: 'table', label: 'Parsing decisions', columns: ['function', 'first pass', 'full parse?', 'why'], rows: rows.slice(), hl: { 0: 'ok' } }]));
        rows.push(row('loadConfig', 'pre-parse (skim)', 'on first call', 'V8 cannot know it will be called soon'));
        frames.push(fr('<code>loadConfig</code> is just a declaration. The <b>pre-parser</b> skims it: checks grammar, records that it uses no outer variables. No AST, no bytecode yet.', [cp(code, { 3: 'cur', 4: 'cur', 5: 'cur' }), { type: 'table', label: 'Parsing decisions', columns: ['function', 'first pass', 'full parse?', 'why'], rows: rows.slice(), hl: { 1: 'cur' } }]));
        rows.push(row('openSettingsDialog', 'pre-parse (skim)', 'maybe never', 'saves time and memory'));
        frames.push(fr('<code>openSettingsDialog</code> (300 lines) is also only skimmed. If the user never opens settings, V8 <b>never</b> pays for a full parse. This is the main win of lazy parsing.', [cp(code, { 7: 'cur', 8: 'cur', 9: 'cur' }), { type: 'table', label: 'Parsing decisions', columns: ['function', 'first pass', 'full parse?', 'why'], rows: rows.slice(), hl: { 2: 'ok' } }]));
        rows.push(row('init (PIFE)', 'full parse', 'now', 'the "(" heuristic says it will run immediately'));
        frames.push(fr('The <b>PIFE heuristic</b> (Possibly-Invoked Function Expression): a function that starts right after <code>(</code> is very likely called immediately, so V8 parses it <b>fully right away</b> and avoids skimming it twice.', [cp(code, { 11: 'cur', 12: 'cur', 13: 'cur' }), { type: 'table', label: 'Parsing decisions', columns: ['function', 'first pass', 'full parse?', 'why'], rows: rows.slice(), hl: { 3: 'ok' } }]));
        rows[1] = row('loadConfig', 'pre-parse, then FULL parse', 'yes, at call on line 1', 'called during startup → parsed twice (the cost of guessing wrong)');
        frames.push(fr('Line 1 calls <code>loadConfig()</code>. Now V8 parses it <b>again, fully</b>, and makes bytecode. A function that is skimmed and then needed soon costs <span class="c-r">two parses</span>. For startup-critical code you can hint V8 (see deep dive: compile hints).', [cp(code, { 1: 'cur', 3: 'bad' }), { type: 'table', label: 'Parsing decisions', columns: ['function', 'first pass', 'full parse?', 'why'], rows: rows.slice(), hl: { 1: 'bad' } }]));
        frames.push(fr('Summary: skim everything for grammar errors, fully compile only what runs. Plus: browsers <b>stream-parse</b> scripts on a background thread while they download, and <b>cache bytecode</b> for repeat visits.', [{ type: 'bars', label: 'parse work (relative units)', values: [3, 2, 1, 2], idxLabels: ['top', 'loadCfg', 'settings', 'init'], hl: { 1: 'bad', 2: 'ok' } }, tx('<b>Green</b>: skim only (cheap). <b>Red</b>: skim + full parse (paid twice).')]));
        return frames;
      }
    }],
    examples: [
      { title: 'Typo in an unused function kills the whole script', html: `<p>A file contains <code>function oldHelper() { return 1 + ; }</code>, never called. The page still breaks: no line of that file runs, and DevTools shows <code>Uncaught SyntaxError</code>. Why? Even the quick pre-parse checks <b>grammar</b>. JavaScript requires the whole script to be grammatically valid before running any of it. <b>Lesson:</b> lint in CI so syntax errors never reach production, and note that one bad file in a bundle can take down unrelated features.</p>`, code: { lang: 'js', run: true, code: `try {
  new Function('function oldHelper() { return 1 + ; }  console.log("never printed");');
} catch (e) {
  console.log(e.name + ': the script was rejected before running');
}` } },
      { title: 'Big data: JSON.parse beats a JavaScript object literal', html: `<p>A 1 MB config inlined as a JavaScript object literal must go through the full JavaScript grammar (any value could be a function call, a getter, a spread...). The same data as a <b>string</b> passed to <code>JSON.parse('...')</code> uses the much simpler JSON grammar, and the V8 team measured it as clearly faster for large payloads (roughly 10 kB and above). This is why some build tools emit <code>JSON.parse("...")</code> for big static data.</p>${H.table(['Form', 'Parser used', 'Typical cost'], [['<code>const cfg = { ... 1 MB ... };</code>', 'full JS parser', H.c('r', 'slower')], ['<code>const cfg = JSON.parse(\'{ ... }\');</code>', 'JSON fast path', H.c('g', 'faster for big data')]])}` },
      { title: 'Why bundle size is a CPU problem, not only a network problem', html: `<p>A 2 MB (uncompressed) bundle downloaded over fast Wi-Fi can still freeze a cheap phone for hundreds of milliseconds: the main thread must parse and compile it. Fixes that reduce parse/compile work:</p><ul><li><b>Code splitting</b> with dynamic <code>import()</code>, so settings-page code is not even downloaded on the home page.</li><li><b>Tree shaking</b> to drop unused exports.</li><li>Ship modern syntax (fewer polyfills = less code to parse).</li><li>Let the browser <b>cache bytecode</b> (code cache): repeat visits skip most parsing.</li></ul>` },
      { title: 'Reading the real bytecode in Node', html: `<p>You can see what Ignition receives. Save a file with a small function, call it once, and run Node with V8 flags. The output lists instructions like <code>Ldar a1</code>, <code>Add a0, [0]</code>, <code>Return</code>. The <code>[0]</code> is a <b>feedback slot</b> index (next topic).</p>`, code: { lang: 'bash', code: `# add.js:  function add(a, b) { return a + b; }  add(1, 2);
node --print-bytecode --print-bytecode-filter=add add.js
# Shows something like:
#   Ldar a1
#   Add a0, [0]
#   Return` } }
    ],
    deepDive: `<p>🟣 <b>Why pre-parsing is harder than it sounds.</b> The pre-parser cannot just count braces. It must do <b>scope analysis</b>: decide which variables are captured by inner functions (closures). Captured variables must live in a heap-allocated <b>Context</b> object instead of a fast stack slot. If the outer function is fully parsed but an inner one was only pre-parsed, V8 still needs to know exactly which outer variables the inner function references. Getting this right without building an AST is why V8 keeps "pre-parse data" for inner functions so they are not re-skimmed every time the outer function is compiled.</p>
<p>🟣 <b>Startup tricks in production (2025–2026).</b></p>
<ul>
<li><b>Script streaming</b>: Chrome parses scripts on a background thread while bytes are still arriving.</li>
<li><b>Code caching</b>: after a script runs, Chrome stores its bytecode; repeat visits deserialize instead of re-parsing. Node 22+ offers <code>module.enableCompileCache()</code> / <code>NODE_COMPILE_CACHE</code> for the same idea on the server and CLI tools.</li>
<li><b>Startup snapshots</b>: Node can serialize an already-initialised heap (<code>node --build-snapshot</code>) so a CLI starts with work already done.</li>
<li><b>Explicit compile hints</b>: Chrome supports a magic comment <code>//# allFunctionsCalledOnLoad</code> at the top of a file to tell V8 "compile everything here eagerly", avoiding the double parse for files whose functions all run at load. Use it only on small, truly startup-critical files; eager compilation of code that never runs wastes memory.</li>
<li><b>Bytecode flushing</b>: if a function has not run for a while, V8 may drop its bytecode during GC to save memory and re-compile on demand. Memory is traded for a tiny risk of re-compiling.</li>
</ul>
<p>🟣 <b>Edge cases.</b> <code>eval</code> and <code>with</code> make scope analysis pessimistic (any variable might be looked up dynamically), which forces more variables into contexts and blocks optimisations. A function's <code>toString()</code> returns its <b>original source</b>, so engines must keep the source text around. Engines measure parse cost in <b>bytes</b>, which is why minified-but-huge bundles still parse slowly.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate code fast, and it is easy to accept a 400 kB dependency or a giant generated config without noticing. Parse and compile cost grows with every byte, so AI-written apps often have bloated startup. <b>Use AI as a partner:</b> paste your bundle analyzer output and ask <code>"Which of these modules are not needed for first paint? Propose dynamic import() boundaries."</code> Ask it to write an AST-based codemod (with Babel or the TypeScript compiler API) to migrate 2,000 call sites safely instead of regex find-and-replace. <b>Where AI goes wrong:</b> it claims "V8 compiles JavaScript directly to machine code" (old, pre-2017 Full-codegen story), confuses pre-parsing with minification, or invents flags. Verify flags with <code>node --v8-options | grep parse</code>. <b>What you must still own:</b> the mental model of the pipeline, reading a performance trace where "Compile Script" and "Parse" blocks show up, and deciding what to split or defer.</p>`,
    problems: [{
      title: 'Build a Mini Scanner (Tokenizer)',
      level: 'Easy', tags: ['parsing', 'scanner', 'strings'], companies: ['Google', 'Microsoft', 'Vercel'],
      statement: `<p>Write <code>tokenize(src)</code> that turns a tiny JavaScript-like string into tokens, the first stage of every engine. Support: identifiers/keywords (<code>let const var return function</code> are keywords), integer and decimal numbers, single-quoted strings, and punctuators <code>+ - * / = ; ( ) { } ,</code> plus the 3-char operator <code>===</code>. Skip whitespace. Return an array of <code>[type, value]</code> pairs. Throw a <code>SyntaxError</code> on any other character.</p>`,
      constraints: `<p>Length of src ≤ 10<sup>5</sup>. Must run in O(N): each character is looked at a constant number of times.</p>`,
      example: `<p>Input: <code>let x = 'hi' === y;</code></p>${H.table(['type', 'value'], [['Keyword', 'let'], ['Identifier', 'x'], ['Punctuator', '='], ['String', 'hi'], ['Punctuator', '==='], ['Identifier', 'y'], ['Punctuator', ';']])}<p>Note <code>===</code> is <b>one</b> token, not three <code>=</code> tokens: scanners use the <b>longest match</b> rule (also called "maximal munch").</p>`,
      brute: { why: `<p>The tempting version builds substrings again and again (e.g. <code>src = src.slice(1)</code> each step). Every slice copies the rest of the string, so scanning N characters costs O(N<sup>2</sup>). On a 100 kB file that is ~5·10<sup>9</sup> character copies.</p>`, code: `function tokenizeSlow(src) {
  const out = [];
  while (src.length) {
    const ch = src[0];
    if (ch === ' ') { src = src.slice(1); continue; }     // copies the whole rest!
    const m = src.match(/^(===|[A-Za-z_$][\\w$]*|\\d+(\\.\\d+)?|'[^']*'|[-+*\\/=;(){},])/);
    if (!m) throw new SyntaxError('Unexpected ' + ch);
    out.push(m[0]);
    src = src.slice(m[0].length);                          // O(N) copy again
  }
  return out;
}` },
      mcq: { q: 'The scanner sees <code>===</code>. Why must it produce ONE token instead of three <code>=</code>?', options: ['Longest-match rule: the scanner always takes the longest valid token', 'Because = is not a valid token', 'Because the parser cannot handle =', 'It is random'], answer: 0, explain: 'Scanners use maximal munch: at each position, consume the longest character sequence that forms a valid token. That is also why <code>a+++b</code> scans as <code>a ++ + b</code>.' },
      hints: [`<p>Hint 1: Keep ONE index <code>i</code> into the string and never slice the remaining string. Each branch advances <code>i</code> past what it consumed.</p>`, `<p>Hint 2: Decide by the <b>first character</b>: digit → number loop; letter/_/$ → identifier loop then check the keyword set; quote → read until the closing quote; otherwise check the 3-char operator before 1-char punctuators.</p>`, `<p>Hint 3: Edge cases: unterminated string (throw), decimal points (<code>3.14</code>), keyword vs identifier (<code>letter</code> is an identifier, not <code>let</code> + <code>ter</code>). Recipe: while i &lt; n → skip spaces → branch → push → advance.</p>`],
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(src) {\n  if (src === 'BIG') { var t = tokenize('x+'.repeat(50000)); return [t.length, t[0], t[99999]]; }\n  try { return tokenize(src); } catch (e) { return e.name; }\n}"},"cases":[[["let x = 'hi' === y;"],[["Keyword","let"],["Identifier","x"],["Punctuator","="],["String","hi"],["Punctuator","==="],["Identifier","y"],["Punctuator",";"]]],[["const letter = 3.14 * r;"],[["Keyword","const"],["Identifier","letter"],["Punctuator","="],["Number","3.14"],["Punctuator","*"],["Identifier","r"],["Punctuator",";"]]],[[""],[]],[["  \n\t "],[]],[["== ==="],[["Punctuator","="],["Punctuator","="],["Punctuator","==="]]],[["===="],[["Punctuator","==="],["Punctuator","="]]],[["return1 function var"],[["Identifier","return1"],["Keyword","function"],["Keyword","var"]]],[["12ab"],[["Number","12"],["Identifier","ab"]]],[["f(a, 'b c')"],[["Identifier","f"],["Punctuator","("],["Identifier","a"],["Punctuator",","],["String","b c"],["Punctuator",")"]]],[["''"],[["String",""]]],[["$_a1"],[["Identifier","$_a1"]]],[["a @ b"],"SyntaxError"],[["'open"],"SyntaxError"],[["1."],"SyntaxError"],[["BIG"],[100000,["Identifier","x"],["Punctuator","+"]]]]},
      solution: {
        approach: `<p>Single pass with an index pointer. Each branch consumes a maximal run of characters and pushes one token. Because <code>i</code> only moves forward and every character is visited once, it is O(N). This is exactly how hand-written production scanners (V8's included) work: a loop over characters with a switch on the current character.</p>`,
        code: { lang: 'js', run: true, code: `const KEYWORDS = new Set(['let', 'const', 'var', 'return', 'function']);
const isDigit = (c) => c >= '0' && c <= '9';
const isIdStart = (c) => /[A-Za-z_$]/.test(c);
const isIdPart = (c) => /[A-Za-z0-9_$]/.test(c);

function tokenize(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\\n' || c === '\\t') { i++; continue; }      // skip whitespace
    if (isDigit(c)) {                                                  // number
      let j = i;
      while (j < n && isDigit(src[j])) j++;
      if (src[j] === '.' && isDigit(src[j + 1] || '')) { j++; while (j < n && isDigit(src[j])) j++; }
      out.push(['Number', src.slice(i, j)]); i = j; continue;
    }
    if (isIdStart(c)) {                                                // identifier / keyword
      let j = i + 1;
      while (j < n && isIdPart(src[j])) j++;
      const word = src.slice(i, j);
      out.push([KEYWORDS.has(word) ? 'Keyword' : 'Identifier', word]); i = j; continue;
    }
    if (c === "'") {                                                   // string literal
      const end = src.indexOf("'", i + 1);
      if (end === -1) throw new SyntaxError('Unterminated string at ' + i);
      out.push(['String', src.slice(i + 1, end)]); i = end + 1; continue;
    }
    if (src.startsWith('===', i)) { out.push(['Punctuator', '===']); i += 3; continue; } // longest match first
    if ('+-*/=;(){},'.includes(c)) { out.push(['Punctuator', c]); i++; continue; }
    throw new SyntaxError('Unexpected character "' + c + '" at ' + i);
  }
  return out;
}

console.log(JSON.stringify(tokenize("let x = 'hi' === y;")));
console.log(JSON.stringify(tokenize('const letter = 3.14 * r;')));` },
        dry: { head: ['i', 'char', 'branch', 'token pushed', 'new i'], rows: [['0', 'l', 'identifier → keyword', 'Keyword:let', '3'], ['4', 'x', 'identifier', 'Identifier:x', '5'], ['6', '=', '"===" ? no → punctuator', 'Punctuator:=', '7'], ['8', "'", 'string until next quote', 'String:hi', '12'], ['13', '=', '"===" ? <span class="c-g">yes</span>', 'Punctuator:===', '16'], ['17', 'y', 'identifier', 'Identifier:y', '18'], ['18', ';', 'punctuator', 'Punctuator:;', '19 (end)']] },
        complexity: `<p>Time O(N): the index only moves forward. Space O(T) for T tokens. The slicing to create token values is proportional to the token length, so the total is still O(N).</p>`,
        followUps: ['Add line/column tracking for error messages', 'Support template literals with nested expressions inside them (needs a stack of scanner modes)', 'Why is regex-per-token slower than a char switch in hot scanners?']
      }
    }]
  });

  /* ================= TOPIC 2: Ignition + JIT tiers ================= */
  topics.push({
    title: 'Ignition, Sparkplug, Maglev & TurboFan: How Hot Code Gets Faster',
    analogy: `<p>Imagine a new <b>delivery driver</b>. On day one they read the map at every turn (slow but works for any address): that is the <b>interpreter</b>. After a week on the same route they stop checking the map at familiar turns: a <b>baseline compiler</b>. After a month they know shortcuts that only work because "this street is always empty at 9 am": an <b>optimizing compiler</b> making <i>bets</i>. If one day the street is blocked (the bet fails), they pull out the map again: that is <b>deoptimization</b>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> V8 does not compile all your code to the fastest machine code up front. That would take too long and waste effort on code that runs once. Instead it uses <b>tiers</b>: start cheap, and spend more compile effort only on code that proves it is <b>hot</b> (runs a lot).</p>
${H.table(['Tier', 'What it is', 'Compile speed', 'Run speed', 'When used'], [
  ['<b>Ignition</b>', 'Interpreter: runs bytecode one instruction at a time', H.c('g', 'instant (bytecode already made)'), H.c('r', 'slowest'), 'every function starts here'],
  ['<b>Sparkplug</b>', 'Baseline compiler: turns bytecode into machine code 1-to-1, no optimisation', H.c('g', 'very fast'), 'faster', 'warm functions'],
  ['<b>Maglev</b>', 'Mid-tier optimizing compiler: uses type feedback, quick optimisations', H.c('y', 'fast'), H.c('g', 'fast'), 'hot functions'],
  ['<b>TurboFan</b>', 'Top-tier optimizing compiler: inlining, escape analysis, loop opts', H.c('r', 'slow'), H.c('g', 'fastest'), 'very hot, long-running code']
])}
<p>🔵 <b>The fuel: type feedback.</b> While Ignition runs, every operation like <code>a + b</code> or <code>obj.x</code> has a <b>feedback slot</b> in the function's <b>feedback vector</b>. It records what it saw: "both were small integers", "obj always had shape S1". The optimizing compilers read this and make <b>bets</b> (speculation): "<code>a + b</code> is always integer addition", so they emit one CPU <code>add</code> instruction plus a cheap <b>guard</b> (check). If a guard fails, the code <b>deoptimizes</b> back to Ignition (Topic 4).</p>
<p>🔵 <b>Ignition is a register machine with an accumulator.</b> <code>return a + b * 2;</code> becomes:</p>
${H.table(['Bytecode', 'Meaning', 'Feedback slot'], [['<code>Ldar a1</code>', 'load argument b into the accumulator', '-'], ['<code>MulSmi [2], [0]</code>', 'acc = acc * 2', 'slot 0 records the types seen'], ['<code>Add a0, [1]</code>', 'acc = a + acc', 'slot 1 records the types seen'], ['<code>Return</code>', 'return acc', '-']])}
<p><b>OSR (On-Stack Replacement):</b> what if a function is called only once but contains a loop that runs 100 million times? V8 can optimize it <i>while it is running</i> and jump from the interpreter frame into optimized code in the middle of the loop.</p>
<p><b>Key takeaway for interviews:</b> "JavaScript is interpreted" and "JavaScript is compiled" are both half-true. Modern engines are <b>adaptive JIT (Just-In-Time) compilers</b>: interpret first, then compile hot code using runtime feedback.</p>`,
    clues: ['"Is JavaScript interpreted or compiled?" → both: bytecode interpreter + tiered JIT', '"Why is the first run of a benchmark slower?" → cold code in Ignition; warm-up tiers it up', '"What is a JIT and why does it need warm-up?" → it needs type feedback before it can specialise', '"Long-running loop in a function called once" → OSR', '"App works but CPU is high in Node after deploy" → check for code that never reaches optimized tiers (deopt loops)', '"Run JS where executable memory is forbidden" → <code>--jitless</code> (interpreter only)'],
    code: [{ lang: 'js', run: true, title: 'Watch warm-up happen: time the same function in batches', code: `
// The same work, measured in batches. Early batches run in the interpreter
// (and pay compile costs); later batches run optimized machine code.
function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

const a = Array.from({ length: 64 }, (_, i) => i);
const b = Array.from({ length: 64 }, (_, i) => 64 - i);
let sink = 0; // use results so the JIT cannot delete the work

for (let batch = 1; batch <= 6; batch++) {
  const t0 = performance.now();
  for (let k = 0; k < 20000; k++) sink += dot(a, b);
  const ms = performance.now() - t0;
  console.log('batch ' + batch + ': ' + ms.toFixed(2) + ' ms');
}
console.log('sink =', sink, '(printed so the work is "used")');
// Typical shape: batch 1 is the slowest, later batches flatten out.
` }, { lang: 'bash', title: 'Seeing the tiers yourself (V8 flags in Node)', code: `# Print when functions are optimized / deoptimized
node --trace-opt --trace-deopt app.js | grep -E "optimiz|deoptimiz" | head

# Interpreter only: no Sparkplug, Maglev or TurboFan (and no executable memory)
node --jitless bench.js       # compare timings with plain "node bench.js"

# Turn individual tiers off to compare (for learning, never in production)
node --no-sparkplug --no-maglev bench.js` }],
    codeTitle: ['Warm-up curve — runnable', 'Tracing tiers with V8 flags'],
    viz: [{
      title: 'Ignition executes bytecode and fills the feedback vector',
      input: '3 4 | 5 6 | 1.5 2 | "a" 1',
      inputLabel: 'Calls to add(a, b) separated by |, e.g. 3 4 | 1.5 2 | "a" 1 (max 4 calls)',
      gen: function (input) {
        var calls = String(input || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!calls.length || calls.length > 4) throw new Error('Give 1 to 4 calls like: 3 4 | 1.5 2');
        function parseVal(t) {
          if (/^".*"$|^'.*'$/.test(t)) return t.slice(1, -1);
          var n = Number(t); if (t === '' || isNaN(n)) throw new Error('Values must be numbers or quoted strings, got ' + t); return n;
        }
        function kind(v) { return typeof v === 'string' ? 'String' : (Number.isInteger(v) && Math.abs(v) < 1073741824 ? 'SignedSmall' : 'Number'); }
        function merge(old, k) {
          if (old === 'None') return k;
          if (old === k) return old;
          if ((old === 'SignedSmall' && k === 'Number') || (old === 'Number' && k === 'SignedSmall')) return 'Number';
          return 'Any';
        }
        function show(v) { return typeof v === 'string' ? '"' + v + '"' : String(v); }
        var code = 'function add(a, b) {\n  return a + b * 2;\n}';
        var bc = 'Ldar a1\nMulSmi [2], [0]\nAdd a0, [1]\nReturn';
        var fb = ['None', 'None'], frames = [];
        frames.push(fr('Source: <code>a + b * 2</code>. Ignition runs the bytecode on the right. The <b>feedback vector</b> starts empty (<code>None</code>): nothing has been observed yet.', [cp(code, { 2: 'cur' }), { type: 'code', label: 'Bytecode', lang: 'text', code: bc }, { type: 'map', label: 'Feedback vector', entries: [['slot 0 (b * 2)', fb[0]], ['slot 1 (a + …)', fb[1]]] }]));
        calls.forEach(function (c, ci) {
          var parts = c.match(/"[^"]*"|'[^']*'|\S+/g) || [];
          if (parts.length !== 2) throw new Error('Each call needs exactly two values, e.g. 3 4');
          var a = parseVal(parts[0]), b = parseVal(parts[1]);
          var acc = b, before;
          frames.push(fr('Call ' + (ci + 1) + ': <code>add(' + show(a) + ', ' + show(b) + ')</code>. <code>Ldar a1</code> copies argument <b>b</b> into the accumulator.', [{ type: 'code', label: 'Bytecode', lang: 'text', code: bc, hl: { 1: 'cur' } }, vp({ a0: show(a), a1: show(b), acc: show(acc) }, { acc: 'cur' }, 'Registers'), { type: 'map', label: 'Feedback vector', entries: [['slot 0 (b * 2)', fb[0]], ['slot 1 (a + …)', fb[1]]] }]));
          before = fb[0]; fb[0] = merge(fb[0], kind(b)); acc = b * 2;
          frames.push(fr('<code>MulSmi [2], [0]</code>: acc = acc × 2 = <b>' + show(acc) + '</b>. Slot 0 saw a <b>' + kind(b) + '</b>' + (before === fb[0] ? ' again: feedback is <span class="c-g">stable</span>.' : ': feedback moves <b>' + before + ' → ' + fb[0] + '</b>' + (fb[0] === 'Any' ? ' <span class="c-r">(generic: optimizers cannot specialise much)</span>.' : '.')), [{ type: 'code', label: 'Bytecode', lang: 'text', code: bc, hl: { 2: 'cur' } }, vp({ a0: show(a), a1: show(b), acc: show(acc) }, { acc: 'ok' }, 'Registers'), { type: 'map', label: 'Feedback vector', entries: [['slot 0 (b * 2)', fb[0]], ['slot 1 (a + …)', fb[1]]], hl: one('slot 0 (b * 2)', before === fb[0] ? 'ok' : (fb[0] === 'Any' ? 'bad' : 'cur')) }]));
          var res = a + acc, k1 = typeof a === 'string' || typeof acc === 'string' ? 'String' : kind(res);
          before = fb[1]; fb[1] = merge(fb[1], k1); acc = res;
          frames.push(fr('<code>Add a0, [1]</code>: acc = a + acc = <b>' + show(acc) + '</b>. Slot 1 records <b>' + k1 + '</b>' + (k1 === 'String' ? ' (string concatenation: a completely different operation from adding numbers).' : '.') + (before !== fb[1] ? ' Feedback: <b>' + before + ' → ' + fb[1] + '</b>.' : ' Same as before.'), [{ type: 'code', label: 'Bytecode', lang: 'text', code: bc, hl: { 3: 'cur' } }, vp({ a0: show(a), a1: show(b), acc: show(acc) }, { acc: 'ok' }, 'Registers'), { type: 'map', label: 'Feedback vector', entries: [['slot 0 (b * 2)', fb[0]], ['slot 1 (a + …)', fb[1]]], hl: one('slot 1 (a + …)', before === fb[1] ? 'ok' : (fb[1] === 'Any' ? 'bad' : 'cur')) }]));
          frames.push(fr('<code>Return</code> hands back <b>' + show(acc) + '</b>.', [{ type: 'code', label: 'Bytecode', lang: 'text', code: bc, hl: { 4: 'ok' } }, vp({ returned: show(acc) }, { returned: 'sel' }, 'Result')]));
        });
        var verdict = fb.every(function (f) { return f === 'SignedSmall'; }) ? '<span class="c-g">All integer feedback</span>: TurboFan can emit plain CPU integer adds/multiplies plus an overflow check. Best case.' : fb.indexOf('Any') >= 0 ? '<span class="c-r">Mixed types (Any)</span>: optimized code must use slow generic paths, or keeps deoptimizing. Keep hot functions type-stable!' : 'Feedback is <b>' + fb.join(' / ') + '</b>: still specialisable (e.g. floating point math), slightly less tight than pure Smi math.';
        frames.push(fr('After ' + calls.length + ' call(s) the feedback vector says: ' + verdict, [{ type: 'map', label: 'Final feedback vector', entries: [['slot 0 (b * 2)', fb[0]], ['slot 1 (a + …)', fb[1]]], hl: { 'slot 0 (b * 2)': fb[0] === 'Any' ? 'bad' : 'ok', 'slot 1 (a + …)': fb[1] === 'Any' ? 'bad' : 'ok' } }, pipeline({ FB: 'sel', MAG: 'cur', TF: 'cur' }, { 'IGN-FB': 'ok' })]));
        return frames;
      }
    }, {
      title: 'Tiering up: a function climbs from Ignition to TurboFan',
      input: '1, 50, 500, 5000, 50000',
      inputLabel: 'Call counts to inspect (increasing, comma separated; thresholds below are illustrative)',
      gen: function (input) {
        var counts = items(input).map(Number);
        if (counts.length < 2 || counts.length > 8 || counts.some(function (n) { return isNaN(n) || n < 1; })) throw new Error('Give 2 to 8 positive counts like: 1, 50, 500, 5000');
        for (var i = 1; i < counts.length; i++) if (counts[i] <= counts[i - 1]) throw new Error('Counts must increase');
        function tier(n) { return n >= 5000 ? 'TF' : n >= 500 ? 'MAG' : n >= 20 ? 'SPK' : 'IGN'; }
        var name = { IGN: 'Ignition (interpreter)', SPK: 'Sparkplug (baseline)', MAG: 'Maglev (mid-tier)', TF: 'TurboFan (top tier)' };
        var cost = { IGN: 100, SPK: 55, MAG: 18, TF: 8 };
        var frames = [], seen = [];
        frames.push(fr('Every function starts in <b>Ignition</b>. Numbers in this picture are <b>illustrative</b>: real V8 uses "interrupt budgets" (roughly, how much bytecode has run) rather than simple call counts, and the thresholds change between versions.', [pipeline({ IGN: 'cur' }), { type: 'table', label: 'Illustrative tier thresholds', columns: ['tier', 'reached after about', 'relative time per call'], rows: [['Ignition', 'first call', '100'], ['Sparkplug', '~20 calls', '55'], ['Maglev', '~500 calls', '18'], ['TurboFan', '~5000 calls', '8']] }]));
        counts.forEach(function (n) {
          var t = tier(n); seen.push(cost[t]);
          var e = {}; if (t === 'SPK') e['IGN-SPK'] = 'ok'; if (t === 'MAG') e['SPK-MAG'] = 'ok'; if (t === 'TF') { e['MAG-TF'] = 'ok'; e['TF-MC'] = 'ok'; }
          frames.push(fr('After <b>' + n + '</b> calls the function runs in <b>' + name[t] + '</b>. ' + (t === 'IGN' ? 'Cold code: each bytecode is decoded and dispatched one at a time, while feedback is collected.' : t === 'SPK' ? 'Sparkplug copied the bytecode into machine code with no analysis. Compiling is almost free, and the dispatch overhead is gone.' : t === 'MAG' ? 'Maglev read the feedback vector and compiled specialised code quickly, on a background thread.' : 'TurboFan spent real effort: inlining callees, removing allocations (escape analysis), hoisting checks out of loops. Highest peak speed.'), [pipeline(one(t, 'cur'), e, one(t, n + ' calls')), { type: 'bars', label: 'relative time per call so far', values: seen.slice(), idxLabels: counts.slice(0, seen.length).map(String), hl: one(seen.length - 1, 'cur') }]));
        });
        frames.push(fr('<b>OSR (On-Stack Replacement)</b>: a function called <i>once</i> with a 100-million-iteration loop never gets a "second call". V8 notices the hot loop (via a back-edge counter), compiles an optimized version in the background, and <b>jumps into it mid-loop</b>, carrying over the loop variables.', [cp('function crunch(n) {\n  let s = 0;\n  for (let i = 0; i < n; i++) {   // hot back-edge → OSR\n    s += i % 7;\n  }\n  return s;\n}\ncrunch(1e8); // called only ONCE', { 3: 'cur' }), pipeline({ IGN: 'done', TF: 'cur', MC: 'ok' }, { 'MAG-TF': 'ok' }, 'OSR: jump from interpreter frame into optimized code')]));
        frames.push(fr('If a bet inside optimized code fails (a new type shows up), the code <b>deoptimizes</b>: execution jumps back to Ignition with the exact same state, more feedback is gathered, and V8 may re-optimize later with a more general bet. That is Topic 4.', [pipeline({ MC: 'bad', IGN: 'cur' }, { 'MC-IGN': 'bad' })]));
        return frames;
      }
    }],
    examples: [
      { title: 'The first request to a Node API is slow', html: `<p>After a deploy, the first few hundred requests to <code>/search</code> take 40 ms, later ones 8 ms. Nothing is "wrong": route handlers, JSON serializers and validation code start in Ignition and are tiered up as they get hot. <b>Fixes:</b> send synthetic warm-up traffic before adding the instance to the load balancer, use Node's compile cache to skip parsing, and keep hot paths type-stable so optimized code is not thrown away. Never benchmark only the first request.</p>` },
      { title: 'Lockdown and "jitless" modes', html: `<p>Some environments forbid generating machine code at runtime (writable + executable memory is a security risk). Safari's Lockdown Mode and Edge's enhanced security mode turn the JIT off; Node/V8 has <code>--jitless</code>. Everything still works because <b>Ignition alone can run all JavaScript</b>. Heavy compute pages get noticeably slower (often several times), while typical UI code barely changes. This shows tiers are a <b>performance</b> feature, not a correctness one.</p>` },
      { title: 'Why microbenchmarks lie at small iteration counts', html: `<p>Comparing <code>for</code> vs <code>forEach</code> with 1,000 iterations mostly measures interpreter speed and compile time, not steady-state speed. With many more iterations the picture changes again: TurboFan can inline the <code>forEach</code> callback, but a callback that <b>writes to a captured variable</b> (<code>s</code> here lives in a heap Context, not a register) can still be slower. Run the snippet: the ratio you see depends on your Node version and machine, which is exactly the point. Always warm up, run multiple batches, keep a result sink, and report steady state separately from cold start.</p>`, code: { lang: 'js', run: true, code: `const arr = Array.from({ length: 1000 }, (_, i) => i);
function viaFor() { let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i]; return s; }
function viaForEach() { let s = 0; arr.forEach((x) => { s += x; }); return s; }
function time(fn, reps) { const t = performance.now(); let k = 0; for (let r = 0; r < reps; r++) k += fn(); return [(performance.now() - t).toFixed(2), k]; }
console.log('cold (10 reps)  for:', time(viaFor, 10)[0], 'ms  forEach:', time(viaForEach, 10)[0], 'ms');
console.log('warm (5000 reps) for:', time(viaFor, 5000)[0], 'ms  forEach:', time(viaForEach, 5000)[0], 'ms');` } },
      { title: 'Feedback is per function, not per call site in your head', html: `<p>A shared helper <code>format(x)</code> called from 50 places with numbers, strings and objects gets <b>mixed feedback</b> in its single feedback vector, so it cannot be specialised well. When TurboFan <b>inlines</b> <code>format</code> into a hot caller, it can sometimes use the caller's narrower context, but generic utility functions are a classic reason hot code stays slow. Splitting into <code>formatNumber</code> and <code>formatString</code> gives each a clean, monomorphic feedback vector.</p>` }
    ],
    deepDive: `<p>🟣 <b>How tier-up is actually decided.</b> Each function has an <b>interrupt budget</b>. Bytecode execution (especially loop back-edges and returns) decrements it; when it runs out, the <b>tiering manager</b> looks at how hot the function is and whether its feedback is stable, then may request Sparkplug, Maglev or TurboFan compilation. Feedback vectors themselves are allocated lazily, after a function has run a little, to save memory for code that runs once.</p>
<p>🟣 <b>Why so many tiers?</b> Sparkplug (2021) closes the big gap between the interpreter and optimizing code with almost zero compile cost: it walks the bytecode once and emits machine code, keeping Ignition's exact frame layout so switching between them is trivial. Maglev (shipped in Chrome 2023) is an SSA-based optimizing compiler that compiles roughly ten times faster than TurboFan while producing good code, which matters for real web pages where code is "warm" but rarely runs long enough to justify TurboFan. TurboFan does the expensive work: speculative inlining, escape analysis (removing short-lived object allocations entirely), redundancy elimination, bounds-check elimination and loop optimisations. Its backend has been moving from the "Sea of Nodes" graph IR to a CFG-based IR called <b>Turboshaft</b>.</p>
<p>🟣 <b>Concurrency.</b> Maglev and TurboFan compile on <b>background threads</b>; the main thread keeps running Ignition/Sparkplug code until the optimized code is installed. Feedback must therefore be read consistently while JS keeps mutating it, one of the hard engineering problems inside V8.</p>
<p>🟣 <b>Other engines, same idea.</b> JavaScriptCore: LLInt → Baseline → DFG → FTL. SpiderMonkey: Baseline Interpreter → Baseline JIT → WarpMonkey. All are adaptive, feedback-driven, speculative JITs with deoptimization ("bailouts").</p>`,
    aiEra: `<p><b>What AI changes:</b> you can ask an assistant to explain <code>--trace-opt</code> / <code>--trace-deopt</code> logs or a CPU profile line by line, which used to require reading V8 source. <b>Use AI as a partner:</b> <code>"Here is the deopt trace and the function. Which feedback slot went polymorphic and what input caused it?"</code> or <code>"Write a benchmark harness with warm-up, multiple batches and a result sink."</code> <b>Where AI goes wrong:</b> it repeats outdated folklore (Crankshaft-era rules like "try/catch prevents optimization" or "never use arguments"), and it confidently names V8 internal thresholds that are version-specific or invented. Treat any exact number as suspicious. <b>What you must still own:</b> knowing that tiers exist, that feedback drives speculation, how to measure warm vs cold performance, and the habit of verifying with a profiler instead of trusting a confident answer.</p>`,
    problems: [{
      title: 'Write a Tiny Accumulator Bytecode Interpreter (Ignition in 40 lines)',
      level: 'Medium', tags: ['interpreter', 'bytecode', 'simulation'], companies: ['Google', 'Meta', 'Bloomberg'],
      statement: `<p>Implement <code>run(program, args)</code> for an accumulator machine like Ignition. Registers <code>r0..r7</code>, arguments <code>a0..a7</code>, one accumulator <code>acc</code>. Instructions (one string each):</p>
<ul><li><code>LdaSmi n</code> (acc = n), <code>Ldar x</code> (acc = x), <code>Star r</code> (r = acc)</li><li><code>Add x</code>, <code>Sub x</code>, <code>Mul x</code> (acc = x op acc), <code>AddSmi n</code> (acc = acc + n)</li><li><code>TestLessThan x</code> (acc = x &lt; acc), <code>JumpIfFalse k</code>, <code>Jump k</code> (k = instruction index)</li><li><code>Return</code></li></ul>
<p>Also count how many times each instruction index executed (a "hotness" counter, like the data V8 uses to pick code to optimize). Return <code>{ value, counts }</code>.</p>`,
      constraints: `<p>Program ≤ 100 instructions; stop with an error after 10<sup>6</sup> executed instructions (infinite-loop guard).</p>`,
      example: `<p>Sum 0..n-1 with <code>n = a0 = 4</code>:</p><pre>0 LdaSmi 0      5 Ldar r1
1 Star r0       6 Add r0
2 LdaSmi 0      7 Star r0
3 Star r1       8 Ldar r1
4 Ldar a0 → acc 9 AddSmi 1 ...</pre><p>Result <b>6</b> (0+1+2+3). The loop body indices have count 4, the setup has count 1, which is exactly how the engine discovers the loop is <b>hot</b>.</p>`,
      brute: { why: `<p>The naive version re-parses every instruction string (<code>split(' ')</code>, regex) every time it executes it. Inside a loop that runs a million times, string parsing dominates. Real interpreters decode once into a compact form (bytecode + operands) and dispatch on an opcode.</p>`, code: `function runSlow(program, args) {
  const regs = {}; let acc = 0, pc = 0;
  const get = (x) => (x[0] === 'a' ? args[+x.slice(1)] : regs[x]);
  while (true) {
    const [op, arg] = program[pc].split(' ');          // parsed again on every execution
    if (op === 'LdaSmi') acc = Number(arg);
    else if (op === 'Ldar') acc = get(arg);
    else if (op === 'Star') regs[arg] = acc;
    else if (op === 'Add') acc = get(arg) + acc;
    else if (op === 'AddSmi') acc = acc + Number(arg);
    else if (op === 'TestLessThan') acc = get(arg) < acc;
    else if (op === 'JumpIfFalse') { if (!acc) { pc = Number(arg); continue; } }
    else if (op === 'Jump') { pc = Number(arg); continue; }
    else if (op === 'Return') return acc;
    pc++;
  }
}` },
      mcq: { q: 'Why do real interpreters convert source to bytecode once instead of walking the AST or text each time?', options: ['Decoding once makes each execution a cheap array lookup + switch', 'Bytecode uses less electricity per instruction', 'The AST cannot represent loops', 'Bytecode is required by the CPU'], answer: 0, explain: 'Bytecode is compact (good for memory and caches) and pre-decoded, so the hot dispatch loop does minimal work per instruction. The CPU still does not run bytecode directly; the interpreter does.' },
      hints: [`<p>Hint 1: Pre-decode: map each string to <code>{ op, arg }</code> once, where <code>arg</code> is already a number or a register name. The main loop should never call <code>split</code>.</p>`, `<p>Hint 2: Keep <code>pc</code> (program counter). Most instructions do <code>pc++</code>; jumps set <code>pc = k</code>. Increment <code>counts[pc]</code> before executing.</p>`, `<p>Hint 3: Operand order matters: <code>Sub r0</code> means acc = r0 − acc (like V8). Add a step counter and throw after 10<sup>6</sup> steps. Recipe: decode → loop { count; switch(op) } → return acc.</p>`],
      tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(json, argsJson) {\n  try { var r = run(JSON.parse(json), JSON.parse(argsJson)); return { value: r.value, counts: r.counts }; } catch (e) { return e.message.indexOf('unknown') >= 0 ? 'unknown op' : e instanceof Error ? 'error' : 'other'; }\n}"},"cases":[[["[\"LdaSmi 0\",\"Star r0\",\"LdaSmi 0\",\"Star r1\",\"Ldar a0\",\"TestLessThan r1\",\"JumpIfFalse 14\",\"Ldar r1\",\"Add r0\",\"Star r0\",\"Ldar r1\",\"AddSmi 1\",\"Star r1\",\"Jump 4\",\"Ldar r0\",\"Return\"]","[4]"],{"value":6,"counts":[1,1,1,1,5,5,5,4,4,4,4,4,4,4,1,1]}],[["[\"LdaSmi 0\",\"Star r0\",\"LdaSmi 0\",\"Star r1\",\"Ldar a0\",\"TestLessThan r1\",\"JumpIfFalse 14\",\"Ldar r1\",\"Add r0\",\"Star r0\",\"Ldar r1\",\"AddSmi 1\",\"Star r1\",\"Jump 4\",\"Ldar r0\",\"Return\"]","[0]"],{"value":0,"counts":[1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1]}],[["[\"LdaSmi 0\",\"Star r0\",\"LdaSmi 0\",\"Star r1\",\"Ldar a0\",\"TestLessThan r1\",\"JumpIfFalse 14\",\"Ldar r1\",\"Add r0\",\"Star r0\",\"Ldar r1\",\"AddSmi 1\",\"Star r1\",\"Jump 4\",\"Ldar r0\",\"Return\"]","[1]"],{"value":0,"counts":[1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1]}],[["[\"LdaSmi 0\",\"Star r0\",\"LdaSmi 0\",\"Star r1\",\"Ldar a0\",\"TestLessThan r1\",\"JumpIfFalse 14\",\"Ldar r1\",\"Add r0\",\"Star r0\",\"Ldar r1\",\"AddSmi 1\",\"Star r1\",\"Jump 4\",\"Ldar r0\",\"Return\"]","[5]"],{"value":10,"counts":[1,1,1,1,6,6,6,5,5,5,5,5,5,5,1,1]}],[["[\"LdaSmi 0\",\"Star r0\",\"LdaSmi 0\",\"Star r1\",\"Ldar a0\",\"TestLessThan r1\",\"JumpIfFalse 14\",\"Ldar r1\",\"Add r0\",\"Star r0\",\"Ldar r1\",\"AddSmi 1\",\"Star r1\",\"Jump 4\",\"Ldar r0\",\"Return\"]","[-3]"],{"value":0,"counts":[1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1]}],[["[\"LdaSmi 7\",\"Return\"]","[]"],{"value":7,"counts":[1,1]}],[["[\"LdaSmi 3\",\"Star r0\",\"LdaSmi 10\",\"Sub r0\",\"Return\"]","[]"],{"value":-7,"counts":[1,1,1,1,1]}],[["[\"LdaSmi 4\",\"Star r1\",\"LdaSmi 5\",\"Mul r1\",\"Return\"]","[]"],{"value":20,"counts":[1,1,1,1,1]}],[["[\"LdaSmi 5\",\"Star r0\",\"LdaSmi 9\",\"TestLessThan r0\",\"Return\"]","[]"],{"value":true,"counts":[1,1,1,1,1]}],[["[\"Ldar a1\",\"Return\"]","[3,8]"],{"value":8,"counts":[1,1]}],[["[\"Ldar a0\",\"AddSmi -5\",\"Return\"]","[2]"],{"value":-3,"counts":[1,1,1]}],[["[\"Jump 2\",\"LdaSmi 1\",\"LdaSmi 2\",\"Return\"]","[]"],{"value":2,"counts":[1,0,1,1]}],[["[\"LdaSmi 1\",\"JumpIfFalse 3\",\"LdaSmi 7\",\"Return\"]","[]"],{"value":7,"counts":[1,1,1,1]}],[["[\"LdaSmi 0\",\"JumpIfFalse 3\",\"LdaSmi 7\",\"Return\"]","[]"],{"value":0,"counts":[1,1,0,1]}],[["[\"Jump 0\"]","[]"],"error"],[["[\"Bogus 1\",\"Return\"]","[]"],"unknown op"]]},
      solution: {
        approach: `<p>Decode once into an array of objects, then run a classic <b>fetch–decode–dispatch</b> loop with a <code>switch</code>. Registers live in a small array (like Ignition's register file in the stack frame). The <code>counts</code> array is a tiny version of V8's hotness signals: the loop body indexes run N times, so a tiering manager would pick this function (or this loop, via OSR) for compilation.</p>`,
        code: { lang: 'js', run: true, code: `function run(program, args) {
  // 1) Decode ONCE: string -> { op, kind, val }
  const code = program.map((line) => {
    const [op, raw] = line.trim().split(/\\s+/);
    if (raw === undefined) return { op };
    if (/^[ra]\\d$/.test(raw)) return { op, kind: raw[0], val: Number(raw[1]) };
    return { op, kind: 'imm', val: Number(raw) };
  });
  const regs = new Array(8).fill(0);
  const counts = new Array(code.length).fill(0);
  const read = (ins) => (ins.kind === 'r' ? regs[ins.val] : ins.kind === 'a' ? args[ins.val] : ins.val);
  let acc = 0, pc = 0, steps = 0;

  // 2) Dispatch loop
  while (true) {
    if (++steps > 1e6) throw new Error('step limit exceeded (infinite loop?)');
    const ins = code[pc];
    counts[pc]++;
    switch (ins.op) {
      case 'LdaSmi': acc = ins.val; pc++; break;
      case 'Ldar': acc = read(ins); pc++; break;
      case 'Star': regs[ins.val] = acc; pc++; break;
      case 'Add': acc = read(ins) + acc; pc++; break;
      case 'Sub': acc = read(ins) - acc; pc++; break;
      case 'Mul': acc = read(ins) * acc; pc++; break;
      case 'AddSmi': acc = acc + ins.val; pc++; break;
      case 'TestLessThan': acc = read(ins) < acc; pc++; break;
      case 'JumpIfFalse': pc = acc ? pc + 1 : ins.val; break;
      case 'Jump': pc = ins.val; break;
      case 'Return': return { value: acc, counts };
      default: throw new Error('unknown op ' + ins.op);
    }
  }
}

// sum = 0; for (i = 0; i < n; i++) sum += i;  return sum;
const sumProgram = [
  'LdaSmi 0', 'Star r0',            // 0-1:   sum = 0
  'LdaSmi 0', 'Star r1',            // 2-3:   i = 0
  'Ldar a0', 'TestLessThan r1',     // 4-5:   acc = (i < n)
  'JumpIfFalse 14',                 // 6:     leave the loop when false
  'Ldar r1', 'Add r0', 'Star r0',   // 7-9:   sum = sum + i
  'Ldar r1', 'AddSmi 1', 'Star r1', // 10-12: i = i + 1
  'Jump 4',                         // 13:    back-edge to the test (this is what makes a loop "hot")
  'Ldar r0',                        // 14:    exit lands here: acc = sum
  'Return'                          // 15:    return acc
];

const r = run(sumProgram, [4]);
console.log('value =', r.value);       // 6
console.log('hotness counts =', r.counts.join(' '));` },
        dry: { head: ['step', 'pc', 'instruction', 'acc after', 'r0 (sum)', 'r1 (i)'], rows: [['1-4', '0-3', 'setup', '0', '0', '0'], ['5', '4', 'Ldar a0', '4', '0', '0'], ['6', '5', 'TestLessThan r1', 'true (0 &lt; 4)', '0', '0'], ['…', '7-12', 'body: sum += i; i++', '1', '0', '1'], ['…', '13', 'Jump 4 (back-edge: hotness++)', '1', '0', '1'], ['last loop', '5', 'TestLessThan r1', 'false (4 &lt; 4)', '6', '4'], ['end', '14-15', 'Ldar r0; Return', '<span class="c-g">6</span>', '6', '4']] },
        complexity: `<p>Decoding O(P) for P instructions; execution O(S) for S executed steps, O(1) per step. Space O(P) for decoded code and counts.</p>`,
        followUps: ['Add per-instruction type feedback (record typeof operands for Add) like a feedback vector', 'Implement a "baseline compiler": turn the decoded array into a single JS function with new Function and compare speed', 'How would you implement OSR in this design?']
      }
    }]
  });

  /* ================= TOPIC 3: Hidden classes + inline caches ================= */
  topics.push({
    title: 'Hidden Classes (Shapes/Maps), Inline Caches & Elements Kinds',
    analogy: `<p>Picture a big <b>office with paper forms</b>. If every customer fills in the <b>same printed form</b> (Name in box 1, Age in box 2), a clerk can grab the age instantly: "always box 2". That printed form is a <b>hidden class</b>. If every customer instead writes on a <b>blank sheet in any order</b>, the clerk must read the whole sheet each time to find the age.</p>
<p>Now imagine the clerk keeps a <b>sticky note</b> on their desk: "blue form → age is in box 2". Next time a blue form arrives, they skip thinking and go straight to box 2. That sticky note is an <b>inline cache</b>. One kind of form = one sticky note (fast). Twenty kinds of forms = the desk is covered in notes and the clerk gives up and looks things up in a big binder (slow).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> In the JavaScript language, an object is a bag of <code>key → value</code> pairs, and you can add or remove keys any time. Looking up a key in a real hash table for every <code>obj.x</code> would be slow. So V8 secretly gives every object a <b>hidden class</b> (V8 calls it a <b>Map</b>; other engines say <b>Shape</b> or <b>Structure</b>). The hidden class says: "objects like me have <code>x</code> in slot 0 and <code>y</code> in slot 1".</p>
${H.table(['Code', 'Hidden class of p', 'Layout'], [
  ['<code>const p = {};</code>', 'M0', H.c('m', '(empty)')],
  ['<code>p.x = 1;</code>', 'M1 (from M0 by "+x")', 'slot 0 = x'],
  ['<code>p.y = 2;</code>', 'M2 (from M1 by "+y")', 'slot 0 = x, slot 1 = y'],
  ['<code>const q = {}; q.x = 5; q.y = 6;</code>', H.c('g', 'M2 again (reused!)'), 'same layout, shared']
])}
<p>Hidden classes form a <b>transition tree</b>. Objects that get the <b>same properties in the same order</b> end up sharing one hidden class. Different order means a <b>different</b> hidden class:</p>
${H.chips(['{x, y} → M2', '{y, x} → M4 (different!)'], { label: 'Order matters', hl: { 0: 'g', 1: 'r' } })}
<p>🔵 <b>Inline caches (ICs).</b> Each property access in your code (like <code>o.x</code> inside a function) has a feedback slot that remembers the hidden classes it has seen and where <code>x</code> lives for each. The slot moves through states:</p>
${H.table(['IC state', 'Hidden classes seen', 'What a lookup costs'], [
  ['uninitialized', '0', 'first time: full lookup'],
  [H.c('g', 'monomorphic'), '1', H.c('g', 'one compare + one load: fastest')],
  [H.c('y', 'polymorphic'), '2 to 4', 'a short list to check'],
  [H.c('r', 'megamorphic'), 'more than 4', H.c('r', 'generic lookup in a global stub cache: slow, and optimizers cannot inline it')]
])}
<p>🔵 <b>Elements kinds (arrays).</b> Indexed elements (<code>arr[0]</code>) are stored separately and tracked with an <b>elements kind</b>: <code>PACKED_SMI_ELEMENTS</code> (small integers only) → <code>PACKED_DOUBLE_ELEMENTS</code> (any numbers, stored as raw doubles) → <code>PACKED_ELEMENTS</code> (anything). Each has a <code>HOLEY_</code> twin for arrays with gaps. Transitions go only one way: toward more general. Removing the string later does <b>not</b> make the array fast again.</p>
<p><b>Rules of thumb:</b> initialise all fields in the constructor, in the same order; do not add properties later conditionally; avoid <code>delete</code> on hot objects; keep arrays of one type and without holes; keep hot functions fed with objects of one shape.</p>`,
    clues: ['"Why is it faster to initialise all properties in the constructor?" → shared hidden class, monomorphic ICs', '"Same data, objects built in different key orders, code got slower" → different hidden classes → polymorphic/megamorphic', '"Is delete slow?" → can drop the object into dictionary (hash table) mode', '"Monomorphic vs polymorphic vs megamorphic" → inline cache states', '"Array of numbers became slow after one string was pushed" → elements kind transition to PACKED_ELEMENTS (one-way)', '"new Array(1000) vs push" → holey vs packed elements', '"A generic helper is slow in a hot loop" → mixed shapes at one IC'],
    code: [{ lang: 'js', run: true, title: 'Which is faster? One shape vs eight shapes at the same property access', code: `
// Two identical functions so each gets its OWN feedback vector (its own inline caches).
function sumXMono(list) { let s = 0; for (let i = 0; i < list.length; i++) s += list[i].x; return s; }
function sumXMega(list) { let s = 0; for (let i = 0; i < list.length; i++) s += list[i].x; return s; }

// 1 shape: every object is built the same way -> monomorphic IC.
const mono = [];
for (let i = 0; i < 800; i++) mono.push({ x: i, y: i });

// 8 shapes: same "x" value, but different keys/orders -> 8 hidden classes -> megamorphic IC.
const makers = [
  (i) => ({ x: i }), (i) => ({ x: i, a: 1 }), (i) => ({ a: 1, x: i }), (i) => ({ x: i, b: 1 }),
  (i) => ({ b: 1, x: i }), (i) => ({ x: i, c: 1 }), (i) => ({ c: 1, x: i }), (i) => ({ d: 1, e: 2, x: i })
];
const mega = [];
for (let i = 0; i < 800; i++) mega.push(makers[i % 8](i));

function time(label, fn, list) {
  let sink = 0;
  for (let w = 0; w < 200; w++) sink += fn(list);          // warm-up so the JIT kicks in
  const t0 = performance.now();
  for (let r = 0; r < 3000; r++) sink += fn(list);
  const ms = performance.now() - t0;
  console.log(label.padEnd(26) + ms.toFixed(1).padStart(7) + ' ms   (sink ' + sink + ')');
  return ms;
}
const a = time('monomorphic (1 shape)', sumXMono, mono);
const b = time('megamorphic (8 shapes)', sumXMega, mega);
console.log('megamorphic / monomorphic = ' + (b / a).toFixed(1) + 'x  (exact ratio depends on machine and V8 version)');
` }, { lang: 'bash', title: 'Peek at hidden classes with V8 natives syntax (learning only)', code: `# %HaveSameMap and %DebugPrint are V8 internals, only available behind a flag.
node --allow-natives-syntax -e '
  const a = { x: 1, y: 2 };
  const b = { x: 3, y: 4 };
  const c = { y: 2, x: 1 };
  console.log(%HaveSameMap(a, b));   // true  : same keys, same order
  console.log(%HaveSameMap(a, c));   // false : same keys, different order
  delete a.x;                        // not the last-added key -> dictionary mode
  %DebugPrint(a);                    // look for "dictionary_map" / "DICTIONARY_PROPERTIES"
'` }],
    codeTitle: ['Monomorphic vs megamorphic — runnable benchmark', 'Inspecting maps with V8 natives'],
    viz: [{
      title: 'Hidden class transition tree: build objects and watch shapes get shared (or not)',
      input: 'p1: x,y | p2: x,y | p3: y,x | p4: x,y,z | p5: x,y,-x',
      inputLabel: 'Objects as name: keys in insertion order, separated by |  (use -key to delete; max 5 objects, 4 steps each)',
      gen: function (input) {
        var groups = String(input || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!groups.length || groups.length > 5) throw new Error('Give 1 to 5 objects like: p1: x,y | p2: y,x');
        var objs = groups.map(function (g, gi) {
          var m = g.match(/^([A-Za-z_$][\w$]*)\s*:\s*(.*)$/);
          var name = m ? m[1] : 'o' + (gi + 1);
          var ops = items(m ? m[2] : g);
          if (!ops.length || ops.length > 4) throw new Error('Each object needs 1 to 4 steps, e.g. p1: x,y,z');
          ops.forEach(function (op) { if (!/^-?[A-Za-z_$][\w$]*$/.test(op)) throw new Error('Keys must be simple names like x or -x (delete), got "' + op + '"'); });
          return { name: name, ops: ops };
        });
        // ---- pass 1: build full tree so positions are stable ----
        var nodes = [{ id: 'M0', keys: [], parent: null, key: null, depth: 0, kids: {} }];
        function child(n, k) {
          if (n.kids[k]) return n.kids[k];
          var c = { id: 'M' + nodes.length, keys: n.keys.concat([k]), parent: n, key: k, depth: n.depth + 1, kids: {} };
          nodes.push(c); n.kids[k] = c; return c;
        }
        var events = [], usedDict = false;
        objs.forEach(function (o) {
          var cur = nodes[0], dict = false;
          o.ops.forEach(function (op) {
            if (dict) { events.push({ o: o.name, op: op, kind: 'dict', node: null }); return; }
            if (op[0] === '-') {
              var k = op.slice(1);
              if (cur.keys.indexOf(k) < 0) { events.push({ o: o.name, op: op, kind: 'nokey', node: cur }); return; }
              if (cur.key === k) { cur = cur.parent; events.push({ o: o.name, op: op, kind: 'rollback', node: cur }); return; }
              dict = true; usedDict = true; events.push({ o: o.name, op: op, kind: 'dict', node: null }); return;
            }
            if (cur.keys.indexOf(op) >= 0) { events.push({ o: o.name, op: op, kind: 'exists', node: cur }); return; }
            var existed = !!cur.kids[op], from = cur;
            cur = child(cur, op);
            events.push({ o: o.name, op: op, kind: existed ? 'reuse' : 'new', node: cur, from: from });
          });
        });
        // layout: leaves top to bottom, parents centred
        var leaf = 0;
        (function lay(n) {
          var ks = Object.keys(n.kids);
          if (!ks.length) { n.y = 6 + leaf * 13; leaf++; }
          else { var ys = ks.map(function (k) { lay(n.kids[k]); return n.kids[k].y; }); n.y = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2; }
          n.x = 7 + n.depth * 21;
        })(nodes[0]);
        var H_ = Math.max(40, 6 + leaf * 13 + (usedDict ? 14 : 0));
        var dictY = 6 + leaf * 13 + 2;
        // ---- pass 2: replay creation for frames ----
        var shown = { M0: true }, where = {}, frames = [];
        function graphPart(hlId, ehlKey, label) {
          var ns = [], es = [], tags = {};
          nodes.forEach(function (n) {
            if (!shown[n.id]) return;
            ns.push({ id: n.id, label: n.id + (n.keys.length ? ' {' + n.keys.join(',') + '}' : ' {}'), x: n.x, y: n.y, shape: 'box', w: 17 });
            if (n.parent) es.push([n.parent.id, n.id, '+' + n.key]);
          });
          if (shown.DICT) ns.push({ id: 'DICT', label: 'dictionary mode (hash table)', x: 60, y: dictY, shape: 'box', w: 30 });
          Object.keys(where).forEach(function (o) { var id = where[o]; tags[id] = tags[id] ? tags[id] + ',' + o : o; });
          var h = {}; if (hlId) h[hlId] = hlId === 'DICT' ? 'bad' : 'cur';
          var e = {}; if (ehlKey) e[ehlKey] = 'ok';
          return { type: 'graph', label: label || 'Transition tree (V8 Maps)', directed: true, height: H_, nodes: ns, edges: es, hl: h, ehl: e, tags: tags };
        }
        function tablePart(hlName) {
          var rows = [], hi = {};
          objs.forEach(function (o) {
            if (where[o.name] === undefined) return;
            var id = where[o.name], n = null;
            nodes.forEach(function (x) { if (x.id === id) n = x; });
            if (o.name === hlName) hi[rows.length] = id === 'DICT' ? 'bad' : 'cur';
            rows.push([o.name, id, id === 'DICT' ? 'hash table (slow)' : (n.keys.length ? n.keys.map(function (k, i) { return k + '@' + i; }).join(' ') : '(empty)')]);
          });
          return { type: 'table', label: 'Objects → hidden class → slot layout', columns: ['object', 'hidden class', 'slots'], rows: rows, hl: hi };
        }
        frames.push(fr('Every object literal <code>{}</code> starts with the root hidden class <b>M0</b> (no properties). Each time a property is added, V8 follows (or creates) a <b>transition</b> to a child hidden class.', [graphPart('M0'), tx('Objects to build: ' + objs.map(function (o) { return '<b>' + esc(o.name) + '</b>: ' + esc(o.ops.join(', ')); }).join(' · '))]));
        var ei = 0;
        objs.forEach(function (o) {
          where[o.name] = 'M0';
          frames.push(fr('<code>const ' + esc(o.name) + ' = {};</code> → hidden class <b>M0</b>.', [graphPart('M0'), tablePart(o.name)]));
          o.ops.forEach(function () {
            var ev = events[ei++], narr, hlId, ek = null;
            if (ev.kind === 'new') { shown[ev.node.id] = true; where[o.name] = ev.node.id; hlId = ev.node.id; ek = ev.from.id + '-' + ev.node.id; narr = '<code>' + esc(o.name) + '.' + esc(ev.op) + ' = …</code>: no transition "+' + esc(ev.op) + '" exists from ' + ev.from.id + ', so V8 <b>creates</b> hidden class <b>' + ev.node.id + '</b>. <b>' + esc(ev.op) + '</b> goes into slot ' + (ev.node.keys.length - 1) + '.'; }
            else if (ev.kind === 'reuse') { where[o.name] = ev.node.id; hlId = ev.node.id; ek = ev.from.id + '-' + ev.node.id; narr = '<code>' + esc(o.name) + '.' + esc(ev.op) + ' = …</code>: the transition "+' + esc(ev.op) + '" <span class="c-g">already exists</span>. ' + esc(o.name) + ' simply moves to <b>' + ev.node.id + '</b>, shared with earlier objects. Code that saw ' + ev.node.id + ' before stays fast.'; }
            else if (ev.kind === 'rollback') { where[o.name] = ev.node.id; hlId = ev.node.id; narr = '<code>delete ' + esc(o.name) + '.' + esc(ev.op.slice(1)) + '</code> removes the <b>most recently added</b> key. V8 has a fast path for this: it rolls back to the parent hidden class <b>' + ev.node.id + '</b>. No harm done.'; }
            else if (ev.kind === 'dict') { var wasDict = where[o.name] === 'DICT'; shown.DICT = true; where[o.name] = 'DICT'; hlId = 'DICT'; narr = (ev.op[0] === '-' && !wasDict) ? '<code>delete ' + esc(o.name) + '.' + esc(ev.op.slice(1)) + '</code> removes a key from the <b>middle</b>. Slots would have to shift, so V8 converts the object to <span class="c-r">dictionary mode</span>: a private hash table. Property access on it can no longer use a fast "slot N" inline cache.' : esc(o.name) + ' is already in dictionary mode, so <code>' + esc(ev.op) + '</code> is stored in its hash table. Once slow, it stays slow (mostly).'; }
            else if (ev.kind === 'exists') { hlId = ev.node.id; narr = esc(o.name) + ' already has <b>' + esc(ev.op) + '</b>: assigning a new value just overwrites the slot. Same hidden class.'; }
            else { hlId = ev.node.id; narr = esc(o.name) + ' has no key <b>' + esc(ev.op.slice(1)) + '</b>, so <code>delete</code> does nothing.'; }
            frames.push(fr(narr, [graphPart(hlId, ek), tablePart(o.name)]));
          });
        });
        var finals = {}; objs.forEach(function (o) { var id = where[o.name]; (finals[id] = finals[id] || []).push(o.name); });
        var shared = Object.keys(finals).filter(function (k) { return finals[k].length > 1 && k !== 'DICT'; });
        frames.push(fr('Summary: ' + Object.keys(shown).length + ' hidden classes were needed. ' + (shared.length ? 'Shared: ' + shared.map(function (k) { return '<b>' + k + '</b> ← ' + finals[k].join(', '); }).join('; ') + '. A function that receives only these objects stays <span class="c-g">monomorphic</span>.' : 'No two objects ended with the same hidden class: code that handles all of them will be <span class="c-r">polymorphic</span>.') + ' Same keys in a different order give a <b>different</b> hidden class.', [graphPart(null), tablePart(null)]));
        return frames;
      }
    }, {
      title: 'Inline cache states at one property access: o.x',
      input: 'A A A B A C D E F A',
      inputLabel: 'Shapes passed to getX(o), letters A–H separated by spaces (max 16 calls)',
      gen: function (input) {
        var seq = String(input || '').trim().toUpperCase().split(/[\s,]+/).filter(Boolean);
        if (!seq.length || seq.length > 16) throw new Error('Give 1 to 16 shape letters like: A A B C');
        seq.forEach(function (s) { if (!/^[A-H]$/.test(s)) throw new Error('Use only letters A to H, got "' + s + '"'); });
        var SH = { A: ['{x, y}', 0], B: ['{y, x}', 1], C: ['{x, y, z}', 0], D: ['{a, b, x}', 2], E: ['{z, x}', 1], F: ['{p, q, r, x}', 3], G: ['{x}', 0], H: ['{k, x, v}', 1] };
        var code = 'function getX(o) {\n  return o.x;   // ← this access owns one IC slot\n}';
        var entries = [], state = 'uninitialized', hits = 0, misses = 0, costs = [], frames = [];
        function tbl(hlI) {
          var rows = state === 'megamorphic' ? [['*', 'any map', 'global stub cache (hash lookup)', '-']] : entries.map(function (e, i) { return [String(i + 1), 'Map ' + e.m + ' ' + SH[e.m][0], 'x at slot ' + SH[e.m][1], String(e.h)]; });
          var h = {}; if (hlI !== undefined && hlI >= 0) h[hlI] = 'ok';
          return { type: 'table', label: 'IC entries (feedback slot for o.x)', columns: ['#', 'hidden class', 'cached answer', 'hits'], rows: rows, hl: h };
        }
        frames.push(fr('<code>getX</code> has one property access, <code>o.x</code>. Its inline cache starts <b>uninitialized</b>: it has never seen an object. Costs below are <b>illustrative units</b> (1 = a compare and a load).', [cp(code, { 2: 'cur' }), vp({ state: state, hits: 0, misses: 0 }, { state: 'cur' }, 'IC'), tbl()]));
        seq.forEach(function (m, ci) {
          var idx = -1, cost, note;
          entries.forEach(function (e, i) { if (e.m === m) idx = i; });
          if (state === 'megamorphic') { cost = 6; hits++; note = 'IC is <span class="c-r">megamorphic</span>: no per-site list any more. V8 hashes (map, "x") into a shared <b>stub cache</b>. Works, but slower, and TurboFan cannot inline a fast field load here.'; }
          else if (idx >= 0) { entries[idx].h++; hits++; cost = 1 + idx; note = '<span class="c-g">IC hit</span>: Map ' + m + ' is entry #' + (idx + 1) + ', so the answer "slot ' + SH[m][1] + '" is reused with no lookup. ' + (state === 'monomorphic' ? 'Monomorphic: one map compare, one load. The best case.' : 'Polymorphic: compared ' + (idx + 1) + ' map(s) before matching.'); }
          else {
            misses++; cost = 10;
            if (entries.length < 4) {
              entries.push({ m: m, h: 0 }); idx = entries.length - 1;
              var old = state; state = entries.length === 1 ? 'monomorphic' : 'polymorphic';
              note = '<span class="c-r">IC miss</span>: Map ' + m + ' ' + SH[m][0] + ' is new. V8 does the slow full lookup, finds <b>x at slot ' + SH[m][1] + '</b>, and caches it. State: <b>' + old + ' → ' + state + '</b>' + (state === 'polymorphic' ? ' (' + entries.length + ' of max 4 maps).' : '.');
            } else {
              state = 'megamorphic'; entries = []; idx = -1;
              note = '<span class="c-r">IC miss with 4 maps already cached</span>: a 5th shape arrives, so V8 gives up on the list and marks this site <b>megamorphic</b>. From now on every call uses the generic path.';
            }
          }
          costs.push(cost);
          frames.push(fr('Call ' + (ci + 1) + ': <code>getX(obj of shape ' + m + ' ' + SH[m][0] + ')</code>. ' + note, [cp(code, { 2: cost === 1 ? 'ok' : cost >= 6 ? 'bad' : 'cur' }), vp({ state: state, hits: hits, misses: misses, 'cost this call': cost }, { state: state === 'megamorphic' ? 'bad' : state === 'monomorphic' ? 'ok' : 'cur' }, 'IC'), tbl(idx), { type: 'bars', label: 'cost per call (illustrative)', values: costs.slice(), idxLabels: seq.slice(0, costs.length), hl: one(costs.length - 1, cost === 1 ? 'ok' : cost >= 6 ? 'bad' : 'cur') }]));
        });
        var total = costs.reduce(function (a, b) { return a + b; }, 0);
        frames.push(fr('Done. Final state: <b>' + state + '</b>, total cost ' + total + ' units for ' + seq.length + ' calls. ' + (state === 'monomorphic' ? 'Keep it that way: create these objects in one place, one order.' : state === 'polymorphic' ? 'Still OK (a few compares), but TurboFan code gets bigger. Normalising shapes would help.' : 'Fix: make callers pass objects of one shape (one class / one factory) or split the hot path per shape.'), [vp({ 'final state': state, hits: hits, misses: misses, 'total cost': total }, { 'final state': state === 'megamorphic' ? 'bad' : 'ok' }, 'Summary'), { type: 'bars', label: 'cost per call (illustrative)', values: costs.slice(), idxLabels: seq.slice() }]));
        return frames;
      }
    }, {
      title: 'Elements kinds: an array only ever gets more general',
      input: '1 2 3 4.5 hi _',
      inputLabel: 'Values pushed into [] one by one: integers, decimals, words; _ makes a hole (max 10)',
      gen: function (input) {
        var vals = String(input || '').trim().split(/\s+/).filter(Boolean);
        if (!vals.length || vals.length > 10) throw new Error('Give 1 to 10 values like: 1 2 3.5 hi _');
        var arr = [], kind = { num: 0, holey: false }, frames = [];
        var KN = ['SMI', 'DOUBLE', 'ELEMENTS'];
        function id() { return (kind.holey ? 'H' : 'P') + kind.num; }
        function name() { return (kind.holey ? 'HOLEY_' : 'PACKED_') + (kind.num === 2 ? '' : KN[kind.num] + '_') + 'ELEMENTS'; }
        function g(ek) {
          var ns = [];
          [0, 1, 2].forEach(function (n) {
            ns.push({ id: 'P' + n, label: 'PACKED_' + (n === 2 ? '' : KN[n] + '_') + 'ELEMENTS', x: 15 + n * 35, y: 10, shape: 'box', w: 30 });
            ns.push({ id: 'H' + n, label: 'HOLEY_' + (n === 2 ? '' : KN[n] + '_') + 'ELEMENTS', x: 15 + n * 35, y: 42, shape: 'box', w: 30 });
          });
          var e = {}; if (ek) e[ek] = 'ok';
          return { type: 'graph', label: 'Elements-kind lattice (arrows = allowed transitions, never backwards)', directed: true, height: 52, nodes: ns, edges: [['P0', 'P1'], ['P1', 'P2'], ['H0', 'H1'], ['H1', 'H2'], ['P0', 'H0'], ['P1', 'H1'], ['P2', 'H2']], hl: one(id(), 'cur'), ehl: e };
        }
        frames.push(fr('<code>const arr = [];</code> An empty array literal starts as <b>PACKED_SMI_ELEMENTS</b>: the most specific (fastest) kind. Smi = small integer.', [{ type: 'array', label: 'arr', values: [] }, g()]));
        vals.forEach(function (v) {
          var before = id(), what;
          if (v === '_') {
            arr.push('·'); arr.push(0); kind.holey = true;
            what = '<code>arr[arr.length + 1] = 0</code> skips an index, leaving a <b>hole</b>. The array becomes <b>HOLEY</b>: every read must now also check "is this a hole? then walk the prototype chain".';
          } else if (/^-?\d+$/.test(v) && Math.abs(Number(v)) < 1073741824) { arr.push(Number(v)); what = '<code>arr.push(' + v + ')</code>: a small integer fits the current kind.'; }
          else if (!isNaN(Number(v))) { arr.push(Number(v)); if (kind.num < 1) kind.num = 1; what = '<code>arr.push(' + v + ')</code>: not a small integer, so the backing store switches to raw 64-bit doubles: <b>DOUBLE</b>.'; }
          else { arr.push('"' + v + '"'); kind.num = 2; what = '<code>arr.push("' + esc(v) + '")</code>: a non-number. The array must hold any value now, so it becomes the generic <b>ELEMENTS</b> kind (tagged pointers).'; }
          var after = id(), ek = null;
          if (after !== before && (before[0] === after[0] ? Number(after[1]) - Number(before[1]) === 1 : before[1] === after[1])) ek = before + '-' + after;
          frames.push(fr(what + (after === before ? ' Kind unchanged: <b>' + name() + '</b>.' : ' Transition → <span class="c-y">' + name() + '</span>.'), [{ type: 'array', label: 'arr', values: arr.slice(), hl: one(arr.length - 1, after === before ? 'ok' : 'cur') }, g(ek)]));
        });
        frames.push(fr('Final kind: <b>' + name() + '</b>. Even if you remove the decimal or the string later, the kind <b>never goes back</b>. Hot numeric code is fastest with PACKED_SMI or PACKED_DOUBLE arrays, or with typed arrays (<code>Float64Array</code>, <code>Int32Array</code>), whose type is fixed forever.', [{ type: 'array', label: 'arr', values: arr.slice() }, g()]));
        return frames;
      }
    }],
    examples: [
      { title: 'Constructor discipline: all fields, same order, every time', html: `<p>Two ways to build users:</p>${H.table(['Leaky shapes', 'Stable shape'], [['<code>const u = {}; u.name = n; if (admin) u.role = "admin"; u.id = id;</code>', '<code>const u = { name: n, role: admin ? "admin" : null, id: id };</code>'], [H.c('r', 'two hidden classes: {name,role,id} and {name,id}'), H.c('g', 'one hidden class for every user')]])}<p>Code reading <code>u.id</code> sees two layouts (id in slot 2 vs slot 1) on the left: polymorphic. On the right it is monomorphic. Use <code>null</code> for "not set" instead of leaving the property out. Classes with field declarations (<code>class User { name; role = null; id; }</code>) give this for free, because fields are defined in the same order in the constructor.</p>`, code: { lang: 'js', run: true, code: `class User {
  name; role = null; id;              // fields declared up front -> one shape
  constructor(name, id, admin) {
    this.name = name;
    this.id = id;
    if (admin) this.role = 'admin';   // assigning an EXISTING field keeps the shape
  }
}
const users = [new User('ann', 1, false), new User('bo', 2, true)];
console.log(users.map((u) => Object.keys(u).join(',')));  // same key order for both` } },
      { title: 'delete vs = undefined vs a real Map', html: `<p>You track online users in an object and remove them with <code>delete online[userId]</code>. After a few deletes from the middle, the object is in dictionary mode. That is <b>fine</b> for a hash-table-like use, but then use the right tool: a <code>Map</code> is built for frequent adds and deletes with arbitrary keys. For a fixed-shape record (a "struct"), never <code>delete</code>; set the field to <code>undefined</code> or <code>null</code> instead.</p>${H.table(['Use case', 'Best choice', 'Why'], [['record with known fields', 'object, set to null', 'keeps hidden class + fast ICs'], ['dynamic keys, many deletes', H.c('g', 'Map'), 'designed as a hash table'], ['keys are objects, no leak', 'WeakMap', 'entries die with their keys']])}` },
      { title: 'Elements kinds in real code: parsing CSV numbers', html: `<p>You parse a CSV column into <code>const prices = []</code>. One bad row pushes the string <code>"N/A"</code>. Now the whole array is <code>PACKED_ELEMENTS</code> and every later sum must check types. Fix: validate first, push <code>NaN</code> (still a number, keeps DOUBLE kind) or skip the row, or allocate a <code>Float64Array</code>. Also avoid <code>new Array(n)</code> followed by filling indexes out of order, which creates a HOLEY array; prefer <code>push</code> or <code>Array.from({ length: n }, fn)</code>.</p>`, code: { lang: 'js', run: true, code: `const raw = ['10.5', '7', 'N/A', '3.25'];
// Keep the array numeric: convert, and turn bad rows into NaN instead of strings.
const prices = raw.map((s) => { const n = Number(s); return Number.isFinite(n) ? n : NaN; });
const total = prices.reduce((a, b) => (Number.isNaN(b) ? a : a + b), 0);
console.log(prices, 'total =', total);
// A typed array can never change its element type at all:
const fixed = Float64Array.from(prices);
console.log(fixed.constructor.name, fixed.length);` } },
      { title: 'A polymorphic hot loop in a React-style renderer', html: `<p>A render loop calls <code>node.type</code> on text nodes, element nodes and fragment nodes created by three different factories with different key orders. That one access sees 3 maps: polymorphic. Frameworks such as React deliberately create every fiber/element with the <b>same set of fields in the same order</b> (even unused ones set to <code>null</code>) for exactly this reason: one hidden class, monomorphic access in the reconciler's hottest loops.</p>` }
    ],
    deepDive: `<p>🟣 <b>What a V8 Map really holds.</b> A Map (hidden class) stores: the instance type, the object size, the number of <b>in-object properties</b> (slots inside the object itself, sized from "slack tracking" over the first few constructions), a pointer to a <b>DescriptorArray</b> (key → slot index + attributes such as writable/enumerable + a field representation like Smi/Double/HeapObject + a field type), the <b>prototype</b>, the elements kind, and the transition array. Properties beyond the in-object slots go to a separate <b>properties backing store</b> (one extra pointer hop). After construction finishes, slack tracking shrinks unused in-object space.</p>
<p>🟣 <b>Field representation and generalisation.</b> If <code>p.x</code> has always been a Smi, the Map records that. Storing a double later <b>generalises</b> the field representation (Smi → Double → Tagged) for every object with that Map and can deoptimize code that relied on it. Changing a field's type is another reason to keep values type-stable.</p>
<p>🟣 <b>Prototype ICs and validity cells.</b> A method call <code>obj.toString()</code> finds the method on the prototype. The IC caches "Map M + prototype chain unchanged → function F". Instead of re-checking the whole chain each time, V8 uses a <b>prototype validity cell</b>; patching any prototype in the chain invalidates the cell. That is why monkey-patching <code>Array.prototype</code> at runtime can make many call sites slow again.</p>
<p>🟣 <b>IC thresholds and megamorphic stub cache.</b> V8's polymorphic limit is 4 maps per site. Megamorphic loads go through a global hash table keyed by (map, name). Megamorphic is not a disaster on its own (it is a cache, not a full lookup) but it blocks inlining and specialisation in TurboFan. <b>Inlining helps</b>: if a generic helper is inlined into a hot caller, each inlined copy gets the caller's narrower feedback context.</p>
<p>🟣 <b>Other engines.</b> SpiderMonkey calls them Shapes and uses CacheIR stubs; JavaScriptCore calls them Structures. The principles (shape sharing, transitions, monomorphic ICs, dictionary fallback) are the same everywhere, so these habits pay off in every browser.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants often write "object-spread soup": <code>{ ...base, ...(flag ? { extra } : {}) }</code> repeated with different orders across files. Each variant can mean a new hidden class, so a hot loop fed by AI-generated factories can quietly go megamorphic. <b>Use AI as a partner:</b> ask <code>"List every place that creates an Order object and show the key order each produces"</code> or <code>"Refactor these 6 factories into one class with all fields declared"</code>. Ask it to write the <code>--allow-natives-syntax</code> experiment that proves two objects share a map. <b>Where AI goes wrong:</b> it may claim "V8 has no hidden classes for object literals", that <code>delete</code> is always catastrophic (the last-added key has a fast path), or recommend micro-hacks without a profile. <b>What you must still own:</b> spotting shape instability in a code review, reading a CPU profile to confirm the hotspot, and deciding when readability wins because the code is not hot.</p>`,
    problems: [{
      title: 'Shape Detective: Count Hidden Classes in a Transition Tree',
      level: 'Medium', tags: ['hidden classes', 'trie', 'hash map'], companies: ['Google', 'Microsoft', 'Shopify'],
      statement: `<p>You are given a list of objects, each described by the <b>order in which its keys were added</b> (e.g. <code>['x', 'y']</code>). Simulate V8's hidden classes: start every object at the root class, and for each added key follow the existing transition or create a new hidden class. Return <code>{ total, groups }</code>: <code>total</code> = number of hidden classes created (including the empty root), and <code>groups</code> = lists of object indexes that end on the <b>same</b> hidden class (only groups of size ≥ 2).</p>`,
      constraints: `<p>1 ≤ objects ≤ 10<sup>4</sup>, each with ≤ 50 keys, keys unique within an object. Aim for O(total keys).</p>`,
      example: `<p>Input: <code>[['x','y'], ['x','y'], ['y','x'], ['x','y','z']]</code></p>${H.table(['object', 'path', 'final class'], [['0', 'M0 →x M1 →y M2', 'M2'], ['1', 'M0 →x M1 →y M2 (reused)', H.c('g', 'M2')], ['2', 'M0 →y M3 →x M4', 'M4'], ['3', 'M0 →x M1 →y M2 →z M5', 'M5']])}<p>Output: <code>{ total: 6, groups: [[0, 1]] }</code>. Objects 0 and 1 share M2. Object 2 has the same keys but a <b>different order</b>, so it does not share.</p>`,
      brute: { why: `<p>Compare every pair of objects' key lists to decide whether they share a final class, and count classes by collecting every distinct <b>prefix</b> as a joined string. Joining prefixes costs O(k<sup>2</sup>) per object and pairwise comparison is O(n<sup>2</sup>·k): about 10<sup>8</sup>·50 operations for 10<sup>4</sup> objects.</p>`, code: `function shapesBrute(objs) {
  const prefixes = new Set(['']);                 // '' = root class
  for (const keys of objs)
    for (let i = 1; i <= keys.length; i++) prefixes.add(keys.slice(0, i).join('>'));  // O(k^2) per object
  const groups = [], used = new Set();
  for (let i = 0; i < objs.length; i++) {          // O(n^2 * k) pairwise compare
    if (used.has(i)) continue;
    const g = [i];
    for (let j = i + 1; j < objs.length; j++)
      if (objs[i].join('>') === objs[j].join('>')) { g.push(j); used.add(j); }
    if (g.length > 1) groups.push(g);
  }
  return { total: prefixes.size, groups };
}` },
      mcq: { q: 'Objects <code>{a:1, b:2}</code> and <code>{b:2, a:1}</code>: how many hidden classes exist in total (including the root)?', options: ['5', '3', '2', '4'], answer: 0, explain: 'Root M0; a-path: M0→a→M1→b→M2; b-path: M0→b→M3→a→M4. Five classes, and the two objects do not share a final class.' },
      hints: [`<p>Hint 1: Hidden classes form a <b>tree</b> (really a trie): each node is a class, each edge is "+key". Two objects share a class exactly when they walk the same path.</p>`, `<p>Hint 2: Represent each node as <code>{ id, next: new Map() }</code>. For each key, look up <code>node.next.get(key)</code>; create a child if missing and increment the counter.</p>`, `<p>Hint 3: Record the final node id per object, then bucket objects by id with a Map and keep buckets of size ≥ 2. Recipe: root → for each object walk/create → bucket by final id.</p>`],
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(json) {\n  if (json === 'BIG') { var objs = []; var keys = []; for (var k = 0; k < 50; k++) keys.push('k' + k); for (var i = 0; i < 10000; i++) objs.push(keys); var r0 = countShapes(objs); return [r0.total, r0.groups.length, r0.groups[0].length]; }\n  var r = countShapes(JSON.parse(json));\n  return { total: r.total, groups: r.groups.map(function (g) { return g.slice().sort(function (a, b) { return a - b; }); }).sort(function (a, b) { return a[0] - b[0]; }) };\n}"},"cases":[[["[[\"x\",\"y\"],[\"x\",\"y\"],[\"y\",\"x\"],[\"x\",\"y\",\"z\"]]"],{"total":6,"groups":[[0,1]]}],[["[[\"a\",\"b\"],[\"b\",\"a\"]]"],{"total":5,"groups":[]}],[["[]"],{"total":1,"groups":[]}],[["[[]]"],{"total":1,"groups":[]}],[["[[],[]]"],{"total":1,"groups":[[0,1]]}],[["[[\"x\"],[\"x\",\"y\"]]"],{"total":3,"groups":[]}],[["[[\"q\"],[\"q\"],[\"q\"]]"],{"total":2,"groups":[[0,1,2]]}],[["[[\"a\"],[\"b\"],[\"b\"],[\"a\"]]"],{"total":3,"groups":[[0,3],[1,2]]}],[["[[\"a\",\"b\"],[\"a\",\"c\"],[\"a\",\"b\"]]"],{"total":4,"groups":[[0,2]]}],[["BIG"],[51,1,10000]]]},
      solution: {
        approach: `<p>Build the transition trie exactly like V8: one root, a <code>Map</code> of outgoing transitions per class. Walking an object costs one hash lookup per key. The count of created nodes is the number of hidden classes. Bucketing final ids gives the sharing groups. This is literally how V8 decides sharing: it never compares objects to each other, it just follows transitions.</p>`,
        code: { lang: 'js', run: true, code: `function countShapes(objs) {
  let nextId = 0;
  const makeNode = () => ({ id: nextId++, next: new Map() });
  const root = makeNode();                         // M0: the empty object {}
  const finalOf = [];
  for (const keys of objs) {
    let node = root;
    for (const k of keys) {
      let child = node.next.get(k);
      if (!child) { child = makeNode(); node.next.set(k, child); }  // new transition
      node = child;                                                  // follow transition
    }
    finalOf.push(node.id);
  }
  const buckets = new Map();
  finalOf.forEach((id, i) => { if (!buckets.has(id)) buckets.set(id, []); buckets.get(id).push(i); });
  const groups = [...buckets.values()].filter((g) => g.length > 1);
  return { total: nextId, groups };
}

console.log(JSON.stringify(countShapes([['x', 'y'], ['x', 'y'], ['y', 'x'], ['x', 'y', 'z']])));
// {"total":6,"groups":[[0,1]]}
console.log(JSON.stringify(countShapes([['a', 'b'], ['b', 'a']])));   // total 5, no groups` },
        dry: { head: ['object', 'key', 'transition exists?', 'node after', 'total so far'], rows: [['-', '-', '-', 'M0 (root)', '1'], ['0', 'x', 'no → create', 'M1', '2'], ['0', 'y', 'no → create', 'M2', '3'], ['1', 'x', H.c('g', 'yes'), 'M1', '3'], ['1', 'y', H.c('g', 'yes'), 'M2', '3'], ['2', 'y', 'no → create', 'M3', '4'], ['2', 'x', 'no → create', 'M4', '5'], ['3', 'x, y, z', 'yes, yes, no', 'M5', '6']] },
        complexity: `<p>Time O(total keys) expected (one hash lookup per key). Space O(number of hidden classes) ≤ O(total keys).</p>`,
        followUps: ['Add support for delete: deleting the last key rolls back, deleting any other key puts the object in "dictionary mode"', 'Report, for a given property access, how many distinct classes it would see (mono/poly/mega)', 'Why does V8 keep transitions weak (so unused hidden classes can be garbage collected)?']
      }
    }]
  });

  /* ================= TOPIC 4: Deoptimization ================= */
  topics.push({
    title: 'Deoptimization: When the JIT\'s Bets Fail',
    analogy: `<p>A <b>bakery</b> notices that every order for weeks has been for chocolate cake. So the baker pre-mixes chocolate batter and skips reading the order slip: super fast. One morning a customer asks for <b>vanilla</b>. The baker cannot pour chocolate batter into it. They must <b>stop, throw away the shortcut, go back to the full recipe book</b> (slow), and serve the vanilla. If vanilla orders keep coming, the baker stops pre-mixing only chocolate and prepares for both.</p>
<p>Optimized JIT code is the pre-mixed batter. The vanilla order is a value of a type the code did not expect. Going back to the recipe book is <b>deoptimization</b>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Optimizing compilers (Maglev, TurboFan) produce fast machine code by making <b>assumptions</b> based on what Ignition observed: "<code>x</code> is always a small integer", "<code>obj</code> always has hidden class M2", "this array never has holes". Each assumption is protected by a cheap <b>guard</b> (a check). If a guard fails at runtime, the optimized code cannot continue safely, so V8 <b>deoptimizes</b>: it rebuilds the interpreter's view of the current function (registers, variables, the exact bytecode position) and continues in Ignition. Your program gives the same answer; it just gets slower for a while.</p>
${H.table(['Assumption (speculation)', 'Guard in optimized code', 'What breaks it'], [
  ['<code>x</code> is a Smi (small integer)', 'CheckSmi', 'a decimal, a string, an object'],
  ['<code>x * 2</code> stays a Smi', 'overflow check', 'result above 2<sup>30</sup> − 1 (with pointer compression)'],
  ['<code>obj</code> has hidden class M2', 'CheckMaps', 'an object built in a different key order'],
  ['<code>i</code> is inside the array', 'bounds check', 'reading <code>arr[arr.length]</code>'],
  ['array is packed, no holes', 'hole check', '<code>arr[100] = 1</code> on a short array'],
  ['a function / prototype / constant field never changes', 'code dependency (no runtime check)', 'monkey-patching a prototype, reassigning a "constant" field']
])}
<p>🔵 <b>Kinds of deopt.</b></p>
<ul>
<li><b>Eager</b>: a guard fails right now, inside the optimized code. Jump out immediately.</li>
<li><b>Lazy</b>: something the code <i>depended on</i> changed elsewhere (e.g. a prototype was patched). The code is marked invalid, and functions currently on the stack deoptimize when control <b>returns</b> to them.</li>
<li><b>Soft / insufficient feedback</b>: the optimizer reached a branch that never ran during warm-up (no feedback), so it planted an unconditional deopt there.</li>
</ul>
<p>🔵 <b>Why it matters.</b> One deopt is cheap and normal. A <b>deopt loop</b> (optimize → deopt → re-optimize → deopt ...) burns CPU on compilation and keeps the function slow. V8 learns from each deopt (feedback becomes more general) and limits how often it re-optimizes the same function. The cure is almost always the same: <b>keep hot functions type-stable and shape-stable</b>.</p>`,
    clues: ['"Code was fast in a benchmark but slow in production with real data" → mixed types/shapes cause deopts', '"Function gets slower after it sees one weird input" → deoptimization + generalised feedback', '"What does --trace-deopt show?" → bailout kind, reason (e.g. "not a Smi", "wrong map"), function and bytecode offset', '"High CPU in Node, flame graph shows the same function compiling again and again" → deopt loop', '"Loop uses i &lt;= arr.length" → out-of-bounds read, deopt and slow path', '"Monkey-patching built-in prototypes at runtime" → lazy deopts of dependent code'],
    code: [{ lang: 'js', run: true, title: 'A performance cliff: one string in a numeric hot path', code: `
// scale() is fed only integers, gets optimized, then sees a string.
function scale(v) { return v * 2; }

function bench(label, input, reps) {
  let sink = 0;
  const t0 = performance.now();
  for (let r = 0; r < reps; r++) sink += scale(input[r % input.length]);
  console.log(label.padEnd(34) + (performance.now() - t0).toFixed(1).padStart(7) + ' ms');
  return sink;
}

const ints = Array.from({ length: 1000 }, (_, i) => i);
bench('warm-up (ints)', ints, 2e6);
bench('steady state (ints only)', ints, 2e6);

scale('21');          // a string: '21' * 2 = 42 is valid JS, but breaks the "v is a Smi" guard
bench('after one string (ints again)', ints, 2e6);

const mixed = ints.map((x, i) => (i % 10 === 0 ? String(x) : x));
bench('mixed ints + strings', mixed, 2e6);
console.log('Numbers vary by machine; the mixed case usually stays the slowest.');
` }, { lang: 'js', run: true, title: 'Values that silently leave the fast "small integer" world', code: `
// Smi range with pointer compression (Chrome, Node on 64-bit): -(2**30) .. 2**30 - 1
const SMI_MAX = 2 ** 30 - 1;
const samples = [42, SMI_MAX, SMI_MAX + 1, 0.5, -0, NaN, 2 ** 53];
for (const v of samples) {
  const smiLike = Number.isInteger(v) && !Object.is(v, -0) && v >= -(2 ** 30) && v <= SMI_MAX;
  console.log(String(Object.is(v, -0) ? '-0' : v).padEnd(18), smiLike ? 'Smi (stored inside the pointer)' : 'HeapNumber / double');
}
// -0 is a classic: 0 * -1 produces -0, which is NOT a Smi, so integer-specialised code must check for it.
console.log(Object.is(0 * -1, -0));   // true
` }, { lang: 'bash', title: 'Catching deopts in a real app', code: `# 1) Log every optimization and deoptimization with reasons
node --trace-opt --trace-deopt server.js 2>&1 | grep -E "bailout|deoptimiz" | head -20
# Typical (trimmed) line:
# [bailout (kind: deopt-eager, reason: not a Smi): begin. deoptimizing ... <JSFunction scale ...>, bytecode offset 2 ...]

# 2) Sample a CPU profile and look for functions that keep being (re)compiled
node --cpu-prof server.js          # writes a .cpuprofile you can open in Chrome DevTools

# 3) Richer visual tooling: "Deopt Explorer" (VS Code extension) reads a V8 log:
node --log-deopt --log-ic --log-maps --logfile=v8.log server.js` }],
    codeTitle: ['Performance cliff demo — runnable', 'Smi range and -0 — runnable', 'Tracing deopts'],
    viz: [{
      title: 'Speculate → guard → deopt → re-optimize (one function, many calls)',
      input: '1 2 3 4 5 6 2.5 7 8 9 10 11 hi 12 13 14 15 16',
      inputLabel: 'Values passed to scale(v) in order: integers, decimals, words (max 20)',
      gen: function (input) {
        var vals = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
        if (vals.length < 2 || vals.length > 20) throw new Error('Give 2 to 20 values like: 1 2 3 4 2.5 hi');
        var SMI_MAX = 1073741823;
        function kindOf(t) { var n = Number(t); if (isNaN(n)) return 'String'; return Number.isInteger(n) && Math.abs(n) <= SMI_MAX ? 'Smi' : 'Number'; }
        function merge(a, b) { if (a === 'None') return b; if (a === b) return a; if (a === 'Any' || b === 'Any') return 'Any'; if (a !== 'String' && b !== 'String') return 'Number'; return 'Any'; }
        var tier = 'Ignition', fb = 'None', guard = null, deopts = 0, sinceChange = 0, gaveUp = false;
        var log = [], costs = [], frames = [];
        function optCode() {
          if (!guard) return 'function scale(v) {\n  return v * 2;\n}';
          if (guard === 'Smi') return '// optimized (TurboFan/Maglev), illustrative\nCheckSmi v            ; else DEOPT "not a Smi"\nr = v * 2 (int32)\nCheckOverflow r       ; else DEOPT "overflow"\nreturn r';
          if (guard === 'Number') return '// optimized, illustrative\nCheckNumber v         ; else DEOPT "not a Number"\nr = v * 2 (float64)\nreturn r';
          return '// optimized with GENERIC path\nr = GenericMultiply(v, 2) ; handles anything, slower\nreturn r';
        }
        function parts(hlLine, outcomeCls) {
          var hl = {}; if (hlLine) hl[hlLine] = outcomeCls || 'cur';
          return [
            { type: 'code', label: tier === 'Ignition' ? 'Running in Ignition (bytecode interpreter)' : 'Running optimized machine code', lang: 'text', code: optCode(), hl: hl },
            vp({ tier: tier, feedback: fb, guard: guard || '-', deopts: deopts }, { tier: tier === 'Ignition' ? 'cur' : 'ok', deopts: deopts ? 'bad' : '' }, 'Engine state'),
            { type: 'table', label: 'Call log (last 6)', columns: ['call', 'v', 'tier', 'outcome'], rows: log.slice(-6), hl: one(Math.min(log.length, 6) - 1, outcomeCls === 'bad' ? 'bad' : 'cur') },
            { type: 'bars', label: 'cost per call (illustrative units)', values: costs.length ? costs.slice() : [0], hl: one(costs.length - 1, outcomeCls === 'bad' ? 'bad' : 'cur') }
          ];
        }
        frames.push(fr('<code>scale(v)</code> starts in <b>Ignition</b> with no feedback. Rule used here (illustrative): after <b>4 calls</b> with usable feedback, V8 optimizes, betting that future values look like past ones.', parts(2)));
        vals.forEach(function (t, i) {
          var k = kindOf(t), n = Number(t), narr, cls = 'cur', cost, line = 2;
          if (tier === 'Ignition') {
            var before = fb; fb = merge(fb, k); sinceChange++; cost = 10;
            log.push([String(i + 1), t, 'Ignition', 'feedback: ' + fb]);
            narr = 'Call ' + (i + 1) + ': <code>scale(' + esc(t) + ')</code> runs in the interpreter (cost 10). Feedback ' + (before === fb ? 'stays <b>' + fb + '</b>.' : 'moves <b>' + before + ' → ' + fb + '</b>.');
            costs.push(cost);
            frames.push(fr(narr, parts(2)));
            if (sinceChange >= 4 && !gaveUp) {
              tier = 'Optimized'; guard = fb === 'Any' ? 'Any' : fb; sinceChange = 0;
              frames.push(fr('Hot and feedback is <b>' + fb + '</b>, so the optimizer compiles a specialised version on a background thread. ' + (guard === 'Any' ? 'Feedback is <b>Any</b> (mixed types): the code must use a generic multiply. No deopt risk, but no big speed-up either.' : 'It plants a guard: <b>Check' + guard + '</b>. As long as the bet holds, each call is a couple of CPU instructions.'), parts(2, 'ok')));
            }
          } else {
            var fail = null;
            if (guard === 'Smi' && k !== 'Smi') fail = k === 'String' ? 'not a Smi' : 'not a Smi (it is a double)';
            else if (guard === 'Smi' && Math.abs(n * 2) > SMI_MAX) fail = 'overflow';
            else if (guard === 'Number' && k === 'String') fail = 'not a Number';
            if (!fail) {
              cost = guard === 'Any' ? 5 : 1; cls = 'ok'; line = guard === 'Any' ? 2 : 3;
              log.push([String(i + 1), t, 'optimized', 'guard passed']);
              costs.push(cost);
              frames.push(fr('Call ' + (i + 1) + ': <code>scale(' + esc(t) + ')</code>. ' + (guard === 'Any' ? 'Generic optimized path (cost 5).' : 'Guard <b>Check' + guard + '</b> passes → fast path (cost 1).'), parts(line, 'ok')));
            } else {
              deopts++; cost = 30; cls = 'bad'; line = fail === 'overflow' ? 4 : 2;
              fb = merge(fb, fail === 'overflow' ? 'Number' : k);
              log.push([String(i + 1), t, 'optimized', 'DEOPT: ' + fail]);
              costs.push(cost);
              frames.push(fr('Call ' + (i + 1) + ': <code>scale(' + esc(t) + ')</code>. <span class="c-r">Guard fails: "' + fail + '"</span>. This is an <b>eager deopt</b>: V8 rebuilds the interpreter frame (v, the bytecode offset) and finishes this call in Ignition (cost 30 incl. the bailout). Feedback is generalised to <b>' + fb + '</b> so the next optimization makes a safer bet.', parts(line, 'bad')));
              tier = 'Ignition'; guard = null; sinceChange = 0;
              if (deopts >= 3) {
                gaveUp = true;
                frames.push(fr('Third deopt of the same function. Real V8 also limits re-optimization of functions that keep deoptimizing (exact limits vary by version). This function is now stuck in the slow tiers: the classic <b>deopt loop</b> cost.', parts(2, 'bad')));
              }
            }
          }
        });
        var total = costs.reduce(function (a, b) { return a + b; }, 0);
        frames.push(fr('Done: ' + vals.length + ' calls, <b>' + deopts + '</b> deopt(s), total cost <b>' + total + '</b> (illustrative). With type-stable input (all small integers) the same calls would cost about ' + (4 * 10 + (vals.length - 4)) + '. ' + (deopts ? 'Fix: validate/convert inputs at the boundary (e.g. <code>Number(v)</code> once when parsing), so the hot function only ever sees one type.' : 'No deopts: the bets held.'), parts(null, deopts ? 'bad' : 'ok')));
        return frames;
      }
    }, {
      title: 'Lazy deopt: someone else changes what the optimized code depended on',
      gen: function () {
        function g(hl, ehl, tags) {
          return { type: 'graph', label: 'Who depends on what', directed: true, height: 56, nodes: [
            bx('OPT', 'Optimized total()', 18, 10, 22), bx('DEP', 'Dependency: Config.rate is constant (0.2)', 60, 10, 34),
            bx('W', 'Code: config.rate = 0.25', 60, 44, 28), bx('DE', 'Deoptimizer', 18, 44, 18), bx('IGN', 'Ignition frame', 90, 44, 16)
          ], edges: [['OPT', 'DEP', 'assumes'], ['W', 'DEP', 'writes'], ['DEP', 'OPT', 'invalidates'], ['OPT', 'DE', 'on return'], ['DE', 'IGN', 'rebuilds frame']], hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        var src = 'const config = { rate: 0.2 };\nfunction total(items) {\n  let s = 0;\n  for (const p of items) s += p * (1 + config.rate);\n  return s;\n}\n// ... later, in a settings handler:\nconfig.rate = 0.25;';
        return [
          fr('<code>config.rate</code> has only ever held one value, so V8 tracks the field as <b>constant</b>. TurboFan compiles <code>total()</code> and <b>embeds 1.2</b> directly in the machine code, with no load and no check in the loop.', [cp(src, { 4: 'ok' }), g({ OPT: 'ok', DEP: 'sel' }, { 'OPT-DEP': 'ok' })]),
          fr('Instead of a runtime guard, the optimized code registers a <b>code dependency</b>: "if Config.rate ever changes, I am invalid". Checks that cost nothing per iteration are the reason optimized code can be so fast.', [cp(src, { 4: 'cur' }), g({ DEP: 'cur' }, { 'OPT-DEP': 'cur' }, { DEP: 'watched' })]),
          fr('A settings handler runs <code>config.rate = 0.25</code>. The field is no longer constant. V8 immediately <b>marks every dependent optimized function as invalid</b>. Nothing in <code>total</code> has executed yet.', [cp(src, { 8: 'bad' }), g({ W: 'cur', DEP: 'bad' }, { 'W-DEP': 'bad', 'DEP-OPT': 'bad' }, { OPT: 'invalid' })]),
          fr('If <code>total()</code> was <b>on the call stack</b> at that moment (it called something that triggered the write), it is deoptimized <b>lazily</b>: when control returns into it, the deoptimizer rebuilds an interpreter frame and execution continues in Ignition, now reading <code>config.rate</code> for real.', [{ type: 'stack', label: 'Call stack at the moment of the write', items: ['main()', 'total()  [optimized, marked invalid]', 'onSettingsChange()', 'config.rate = 0.25'], hl: { 1: 'bad', 3: 'cur' } }, g({ DE: 'cur', IGN: 'ok' }, { 'OPT-DE': 'cur', 'DE-IGN': 'ok' })]),
          fr('Next calls run in Ignition, collect fresh feedback, and later V8 re-optimizes <code>total()</code>, this time loading <code>config.rate</code> from memory because it is now known to be mutable. Lesson: reassigning "configuration" in a hot path costs a deopt; changing it once at startup is free.', [g({ IGN: 'ok', OPT: 'cur' }, {}, { OPT: 're-optimized' }), tx('Same idea applies to: patching <code>Array.prototype.map</code>, changing a prototype chain with <code>Object.setPrototypeOf</code>, or redefining a global function the optimized code inlined.')]),
          fr('Summary table of deopt kinds.', [{ type: 'table', label: 'Deopt kinds', columns: ['kind', 'trigger', 'when it jumps out'], rows: [['eager', 'guard fails (CheckMaps, CheckSmi, bounds, overflow)', 'immediately'], ['lazy', 'a dependency was invalidated elsewhere', 'when control returns to that frame'], ['soft / insufficient feedback', 'reached code that never ran during warm-up', 'immediately, then gathers feedback']], hl: { 1: 'sel' } }])
        ];
      }
    }],
    examples: [
      { title: 'The off-by-one that is also a performance bug', html: `<p><code>for (let i = 0; i &lt;= arr.length; i++) sum += arr[i];</code> reads one element past the end. In JavaScript that gives <code>undefined</code> (no crash) and <code>sum</code> becomes <code>NaN</code>. For the engine, an out-of-bounds read fails the bounds-check guard, may deoptimize, and forces a slower path that must consult the prototype chain (someone could have put index 1000 on <code>Array.prototype</code>!). Always use <code>i &lt; arr.length</code>, or <code>for...of</code>.</p>`, code: { lang: 'js', run: true, code: `const arr = [1, 2, 3];
let bad = 0, good = 0;
for (let i = 0; i <= arr.length; i++) bad += arr[i];   // reads arr[3] -> undefined
for (let i = 0; i < arr.length; i++) good += arr[i];
console.log('bad =', bad, ' good =', good);           // bad = NaN  good = 6` } },
      { title: 'An API that sometimes returns ids as strings', html: `<p>A backend returns <code>{ id: 17 }</code> most of the time but <code>{ id: "17" }</code> from one legacy endpoint. Your hot <code>indexById</code> function compares and hashes ids. The rare string fails the Smi guard, deoptimizes, and the generalised version handles both types more slowly forever after. <b>Fix at the boundary:</b> normalise in the API client (<code>id: Number(raw.id)</code>) so the rest of the app sees one type. TypeScript types do not help here: they are erased at runtime and the JSON can still lie.</p>` },
      { title: 'Counter overflow: from Smi to HeapNumber', html: `<p>A request counter starts at 0 and is incremented with <code>count++</code>. After about 1.07 billion (2<sup>30</sup>) increments it no longer fits in a Smi (on pointer-compressed 64-bit V8). The optimized code's overflow check fails once, the function deopts, and the field generalises to a double. This is correct and rare, but explains "random" one-off deopts in long-running servers. If you need big exact counts, use a <code>BigInt</code> or a <code>Float64Array</code> slot deliberately.</p>${H.table(['value', 'representation'], [['1,073,741,823 (2<sup>30</sup> − 1)', H.c('g', 'Smi')], ['1,073,741,824', H.c('y', 'HeapNumber (boxed double)')], ['2<sup>53</sup> + 1', H.c('r', 'cannot be represented exactly as a Number')]])}` },
      { title: 'Reading a deopt trace in a code review', html: `<p>A teammate posts: <code>[bailout (kind: deopt-eager, reason: wrong map): ... &lt;JSFunction renderRow&gt; ...]</code> repeated hundreds of times per second. Read it as: "<code>renderRow</code> was optimized assuming one hidden class for its argument; objects with another hidden class keep arriving". Next step: find where row objects are created (probably two factories, or properties added conditionally) and unify the shape. Reasons you will see often: <i>not a Smi</i>, <i>not a heap number</i>, <i>wrong map</i>, <i>out of bounds</i>, <i>hole</i>, <i>overflow</i>, <i>insufficient type feedback</i>, <i>division by zero</i>, <i>minus zero</i>.</p>` }
    ],
    deepDive: `<p>🟣 <b>How V8 rebuilds the interpreter frame.</b> At every point where optimized code can deopt, the compiler records a <b>deoptimization data</b> entry ("frame state"): for each interpreter register and the accumulator, where its value lives in the optimized frame (a CPU register, a stack slot, or a constant) and the bytecode offset to resume at. With <b>inlining</b>, one optimized frame may need to become <i>several</i> interpreter frames (caller + inlined callees). Objects that escape analysis removed (never allocated!) must be <b>materialized</b> on deopt from their field values. This translation is why deopts cost microseconds rather than nanoseconds.</p>
<p>🟣 <b>Feedback after deopt.</b> The guard that failed points at a feedback slot; V8 updates it with the new type/map so the next optimization makes a more general (polymorphic or generic) assumption. That is why most programs settle after a few deopts. A real deopt <i>loop</i> usually means the feedback cannot capture the pattern, for example an IC that flips between shapes created in a cycle, or code being repeatedly invalidated by a dependency (a prototype being patched in a loop, a "constant" field reassigned per request).</p>
<p>🟣 <b>Old folklore you can drop.</b> In the Crankshaft era (before 2017), <code>try/catch</code>, <code>arguments</code> leaking, <code>for-in</code> over some objects and generator functions could prevent optimization entirely. TurboFan optimizes all of these. Modern advice is not "avoid feature X" but "keep types and shapes stable and measure".</p>
<p>🟣 <b>Maglev and deopts.</b> Maglev also speculates and deopts, using the same frame-state machinery. Because Maglev compiles quickly, re-optimizing after a deopt is cheaper than it used to be, which made V8 more forgiving of programs that deopt a few times during start-up.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated glue code often mixes types casually (<code>id</code> as string in one file, number in another; <code>null</code> vs <code>undefined</code> vs <code>""</code> for "missing"). That is harmless for correctness but a deopt generator in hot paths. <b>Use AI as a partner:</b> paste a <code>--trace-deopt</code> excerpt and ask <code>"Group these bailouts by function and reason, and point to the source line"</code>; ask it to add input normalisation at API boundaries; ask for a micro-benchmark that reproduces a suspected deopt. <b>Where AI goes wrong:</b> it repeats Crankshaft-era rules (try/catch kills optimization), invents V8 flags, or "fixes" a deopt by adding <code>%NeverOptimizeFunction</code>, which is a test-only intrinsic. <b>What you must still own:</b> understanding speculation + guards + deopt, the judgement that one deopt is normal and a loop is a bug, and verifying every claim with a trace or profile.</p>`,
    problems: [{
      title: 'Deopt Log Analyzer: Find the Deopt Loops',
      level: 'Medium', tags: ['hash map', 'parsing', 'performance tooling'], companies: ['Google', 'Netflix', 'Datadog'],
      statement: `<p>You get V8-style log lines, each one of: <code>opt &lt;fn&gt;</code> or <code>deopt &lt;fn&gt; &lt;reason words...&gt;</code>. A function is in a <b>deopt loop</b> if it has at least <code>k</code> deopts. Return those functions sorted by deopt count (descending, ties by name), each with its count and its <b>most frequent reason</b> (ties: the reason seen first).</p>`,
      constraints: `<p>Up to 10<sup>5</sup> lines, up to 10<sup>4</sup> distinct functions. Target O(L log F).</p>`,
      example: `<pre>opt scale
deopt scale not a Smi
opt scale
deopt scale not a Smi
deopt render wrong map
opt scale
deopt scale overflow</pre><p>With <code>k = 2</code>: <code>[{ fn: 'scale', count: 3, reason: 'not a Smi' }]</code>. <code>render</code> only deopted once, which is normal.</p>`,
      brute: { why: `<p>For each distinct function, re-scan all lines to count its deopts, and for each of its reasons re-scan again to count that reason. With F functions and L lines that is O(F·L) or worse: 10<sup>9</sup> steps for the limits above.</p>`, code: `function deoptLoopsBrute(lines, k) {
  const fns = [...new Set(lines.map((l) => l.split(' ')[1]))];
  const out = [];
  for (const fn of fns) {                                   // F times...
    const mine = lines.filter((l) => l.startsWith('deopt ' + fn + ' '));   // ...scan all L lines
    if (mine.length < k) continue;
    let best = null, bestCount = 0;
    for (const l of mine) {
      const reason = l.split(' ').slice(2).join(' ');
      const c = mine.filter((m) => m.split(' ').slice(2).join(' ') === reason).length; // quadratic again
      if (c > bestCount) { best = reason; bestCount = c; }
    }
    out.push({ fn, count: mine.length, reason: best });
  }
  return out.sort((a, b) => b.count - a.count || a.fn.localeCompare(b.fn));
}` },
      mcq: { q: 'A function shows exactly ONE deopt in a 10-minute trace. What should you conclude?', options: ['Normal: feedback generalised once and the function re-optimized', 'Critical bug: deopts must never happen', 'The function can never be optimized again', 'V8 crashed and restarted the function'], answer: 0, explain: 'A few deopts during warm-up or on rare inputs are expected. Only repeated deopts of the same function (a loop) indicate a real performance problem.' },
      hints: [`<p>Hint 1: One pass is enough. Everything you need per function is a counter and a small map of reason → count.</p>`, `<p>Hint 2: Use <code>Map&lt;fn, { count, reasons: Map&lt;reason, count&gt; }&gt;</code>. JavaScript Maps keep insertion order, which handles the "reason seen first" tie rule for free.</p>`, `<p>Hint 3: Ignore <code>opt</code> lines; the reason is everything after the second word. Filter count ≥ k, pick the max reason with a strict <code>&gt;</code> (keeps the first on ties), then sort.</p>`],
      tests: {"sig":"string[] int -> string[]","fn":"deoptLoops","cases":[[[["opt scale","deopt scale not a Smi","opt scale","deopt scale not a Smi","deopt render wrong map","opt scale","deopt scale overflow"],2],[{"fn":"scale","count":3,"reason":"not a Smi"}]],[[["opt scale","deopt scale not a Smi","opt scale","deopt scale not a Smi","deopt render wrong map","opt scale","deopt scale overflow"],1],[{"fn":"scale","count":3,"reason":"not a Smi"},{"fn":"render","count":1,"reason":"wrong map"}]],[[[],1],[]],[[["opt a","opt b"],1],[]],[[["deopt f"],1],[{"fn":"f","count":1,"reason":"unknown"}]],[[["deopt b x","deopt a y","deopt b x","deopt a y"],2],[{"fn":"a","count":2,"reason":"y"},{"fn":"b","count":2,"reason":"x"}]],[[["deopt f r1","deopt f r2","deopt f r2","deopt f r1"],4],[{"fn":"f","count":4,"reason":"r1"}]],[[["deopt f a","deopt g b","deopt g b","deopt h c","deopt h c","deopt h c"],2],[{"fn":"h","count":3,"reason":"c"},{"fn":"g","count":2,"reason":"b"}]],[[["deopt f a"],2],[]],[[{"$rep":"deopt f not a Smi","n":100000},5],[{"fn":"f","count":100000,"reason":"not a Smi"}]]]},
      solution: {
        approach: `<p>Single pass aggregation into a Map of Maps, then filter and sort the (small) result. This is exactly what tools like Deopt Explorer do with a V8 log before drawing anything.</p>`,
        code: { lang: 'js', run: true, code: `function deoptLoops(lines, k) {
  const stats = new Map();                      // fn -> { count, reasons: Map(reason -> n) }
  for (const line of lines) {
    const parts = line.trim().split(' ');
    if (parts[0] !== 'deopt') continue;         // only deopt lines matter
    const fn = parts[1];
    const reason = parts.slice(2).join(' ') || 'unknown';
    if (!stats.has(fn)) stats.set(fn, { count: 0, reasons: new Map() });
    const s = stats.get(fn);
    s.count++;
    s.reasons.set(reason, (s.reasons.get(reason) || 0) + 1);
  }
  const out = [];
  for (const [fn, s] of stats) {
    if (s.count < k) continue;
    let best = null, bestN = 0;
    for (const [r, n] of s.reasons) if (n > bestN) { best = r; bestN = n; }   // strict > keeps first on ties
    out.push({ fn, count: s.count, reason: best });
  }
  return out.sort((a, b) => b.count - a.count || a.fn.localeCompare(b.fn));
}

const log = [
  'opt scale', 'deopt scale not a Smi', 'opt scale', 'deopt scale not a Smi',
  'deopt render wrong map', 'opt scale', 'deopt scale overflow'
];
console.log(JSON.stringify(deoptLoops(log, 2)));   // [{"fn":"scale","count":3,"reason":"not a Smi"}]
console.log(JSON.stringify(deoptLoops(log, 1)));` },
        dry: { head: ['line', 'kind', 'fn', 'reason', 'scale.count', 'render.count'], rows: [['1', 'opt', 'scale', '-', '0', '0'], ['2', 'deopt', 'scale', 'not a Smi', '1', '0'], ['4', 'deopt', 'scale', 'not a Smi', '2', '0'], ['5', 'deopt', 'render', 'wrong map', '2', '1'], ['7', 'deopt', 'scale', 'overflow', '3', '1'], ['end', 'filter k=2', 'scale', 'best: not a Smi (2)', H.c('g', '3 → reported'), H.c('m', '1 → dropped')]] },
        complexity: `<p>Time O(L + F log F) where L = lines, F = functions reported. Space O(F + distinct reasons).</p>`,
        followUps: ['Also detect "flapping": opt → deopt → opt → deopt within a time window', 'Map bytecode offsets back to source lines using a source map', 'Stream the log (it can be gigabytes) instead of loading all lines']
      }
    }]
  });

  /* ================= TOPIC 5: Stack, heap & value representation ================= */
  topics.push({
    title: 'Stack vs Heap: Frames, Smis, HeapNumbers, Pointer Tagging & Closures',
    analogy: `<p>Think of a <b>chef's workbench</b> and a <b>storage room</b>. The workbench (the <b>stack</b>) holds what you need for the dish you are cooking right now: a few labelled bowls. When the dish is done, you clear the whole bench in one sweep. The storage room (the <b>heap</b>) holds big or long-lived things: sacks of flour, tools shared between dishes. On the bench you keep a <b>note</b> saying "flour is on shelf 12" instead of the sack itself.</p>
<p>Tiny things, like "3 eggs", you just write directly on the note. That is a <b>Smi</b>: a small integer stored right inside the note, no trip to the storage room needed.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> JavaScript memory has two main areas:</p>
${H.table(['', 'Stack', 'Heap'], [
  ['What lives there', 'one <b>frame</b> per active function call: its parameters, local variables, return address', 'objects, arrays, functions, strings, closures\' captured variables, boxed numbers'],
  ['Cleanup', H.c('g', 'instant: pop the frame when the function returns'), 'the <b>garbage collector</b> frees what is no longer reachable'],
  ['Size', 'small (about 1 MB in V8 by default)', 'large (hundreds of MB to several GB)'],
  ['Failure mode', '<code>RangeError: Maximum call stack size exceeded</code>', '<code>FATAL ERROR: ... JavaScript heap out of memory</code>']
])}
<p>🔵 <b>The famous myth.</b> "Primitives live on the stack, objects live on the heap" is <b>not</b> how V8 works. Every JavaScript value is a <b>tagged</b> machine word:</p>
<ul>
<li>If the lowest bit is <b>0</b>, the rest of the word <b>is</b> a small integer: a <b>Smi</b>. No heap object at all. With pointer compression (Chrome, Node on 64-bit) Smis are 31-bit: from −2<sup>30</sup> to 2<sup>30</sup> − 1.</li>
<li>If the lowest bit is <b>1</b>, the word is a <b>pointer</b> to a heap object: a string, an object, an array, or a <b>HeapNumber</b> (a box holding a 64-bit double such as <code>0.5</code> or <code>2<sup>40</sup></code>).</li>
</ul>
${H.bits(60, 8, { label: 'Smi 30 stored as 30 << 1 = 60 (low bit 0 = "I am a number")', hl: { 0: 'g' } })}
${H.bits(0x45, 8, { label: 'Heap pointer (low bit 1 = "follow me to the heap")', hl: { 0: 'y' } })}
<p>So a string like <code>'hi'</code> is a primitive but lives in the heap, and a local variable captured by a closure lives in a heap object called a <b>Context</b>, not in the stack frame (otherwise it would vanish when the function returns).</p>
<p>🔵 <b>Copy vs share.</b> Assigning or passing a value copies the <b>tagged word</b>. For a Smi that copies the number. For an object it copies the pointer, so both variables see the same object. That is why mutating an object inside a function is visible outside, but reassigning the parameter is not.</p>`,
    clues: ['"Where are primitives stored in JS?" → trick question: tagged values; Smis inline, strings and doubles on the heap', '"Maximum call stack size exceeded" → recursion too deep; convert to an explicit stack/loop', '"Why do closures keep variables alive after return?" → captured variables live in a heap Context', '"JavaScript heap out of memory" → heap limit; leak or need --max-old-space-size', '"Is a number always 8 bytes in JS?" → Smi (no allocation) vs HeapNumber vs raw doubles in Float64Array/double arrays', '"Do Buffers count toward the JS heap?" → no, ArrayBuffer backing stores are external memory'],
    code: [{ lang: 'js', run: true, title: 'How deep can the stack go? And the explicit-stack fix', code: `
// 1) Measure how many frames fit before V8 throws RangeError.
function measureDepth() {
  let depth = 0;
  function dive() { depth++; dive(); }
  try { dive(); } catch (e) { return { depth, error: e.constructor.name + ': ' + e.message }; }
}
console.log(measureDepth());   // typically around 10,000 frames (depends on frame size and flags)

// 2) Recursive sum of a linked list blows up for long lists...
function makeList(n) { let head = null; for (let i = n; i >= 1; i--) head = { value: i, next: head }; return head; }
const sumRec = (node) => (node === null ? 0 : node.value + sumRec(node.next));
const long = makeList(200000);
try { console.log(sumRec(long)); } catch (e) { console.log('recursive version:', e.constructor.name); }

// 3) ...a loop uses one frame no matter how long the list is (the list itself lives on the heap).
function sumLoop(node) { let s = 0; for (; node !== null; node = node.next) s += node.value; return s; }
console.log('loop version:', sumLoop(long));   // 20000100000
` }, { lang: 'js', run: true, title: 'Heap vs external memory: objects vs typed arrays', code: `
// process.memoryUsage exists in Node only; in the browser sandbox we print n/a.
const hasMem = typeof process !== 'undefined' && typeof process.memoryUsage === 'function';
const snap = () => (hasMem ? process.memoryUsage() : null);
const mb = (b) => (b / 1048576).toFixed(1) + ' MB';

const before = snap();
const objs = Array.from({ length: 300000 }, (_, i) => ({ x: i + 0.5 }));   // 300k heap objects + 300k HeapNumbers
const mid = snap();
const floats = new Float64Array(300000);                               // one off-heap buffer of raw doubles
for (let i = 0; i < floats.length; i++) floats[i] = i + 0.5;          // stored unboxed: no HeapNumbers
const after = snap();

if (hasMem) {
  console.log('objects:      heapUsed +' + mb(mid.heapUsed - before.heapUsed));
  console.log('Float64Array: heapUsed +' + mb(after.heapUsed - mid.heapUsed) + ', arrayBuffers +' + mb(after.arrayBuffers - mid.arrayBuffers));
} else {
  console.log('memory numbers: n/a in this sandbox');
}
console.log('Float64Array payload is exactly', floats.byteLength, 'bytes (8 per number); objs length', objs.length);
` }],
    codeTitle: ['Stack depth and the explicit-loop fix — runnable', 'Heap vs external memory — runnable'],
    viz: [{
      title: 'Stack frames and heap objects while code runs',
      gen: function () {
        var code = 'function makeUser(name) {\n  const age = 30;\n  const tags = [\'new\'];\n  const user = { name, age, tags };\n  return user;\n}\nconst u = makeUser(\'Ann\');\nfunction greeter(u) {\n  const greeting = \'Hi \' + u.name;\n  return () => greeting;   // captures greeting\n}\nconst say = greeter(u);';
        var ALL = {
          S1: bx('S1', 'String "Ann"', 12, 8, 18), A1: bx('A1', 'Array [ → ]', 40, 30, 16), S2: bx('S2', 'String "new"', 70, 30, 18),
          O1: bx('O1', '{ name, age: Smi 30, tags }', 40, 8, 28), S3: bx('S3', 'String "Hi Ann"', 86, 8, 20),
          C1: bx('C1', 'Context { greeting }', 70, 52, 24), F1: bx('F1', 'Closure say()', 30, 52, 18)
        };
        var EDGES = { 'O1-S1': ['O1', 'S1', 'name'], 'O1-A1': ['O1', 'A1', 'tags'], 'A1-S2': ['A1', 'S2', '[0]'], 'C1-S3': ['C1', 'S3', 'greeting'], 'F1-C1': ['F1', 'C1', 'context'] };
        function heap(ids, eids, hl, tags) {
          return { type: 'graph', label: 'Heap (managed by the garbage collector)', directed: true, height: 60, nodes: ids.map(function (i) { return ALL[i]; }), edges: eids.map(function (e) { return EDGES[e]; }), hl: hl || {}, tags: tags || {} };
        }
        function st(items, hlTop) { var h = {}; if (hlTop) h[items.length - 1] = hlTop; return { type: 'stack', label: 'Call stack (top = running)', items: items, hl: h }; }
        return [
          fr('Before line 7 runs. The global frame holds <code>u</code> and <code>say</code> (in the temporal dead zone). The string literal <b>"Ann"</b> already exists in the heap: literals are created when the code is compiled and are shared.', [cp(code, { 7: 'cur' }), st(['global: u = (TDZ), say = (TDZ)'], 'cur'), heap(['S1'], [])]),
          fr('<code>makeUser(\'Ann\')</code> is called: a new <b>frame</b> is pushed. Parameter <code>name</code> holds a <b>pointer</b> to the heap string, not the characters.', [cp(code, { 1: 'cur' }), st(['global: u, say', 'makeUser: name → "Ann"'], 'cur'), heap(['S1'], [], { S1: 'cur' })]),
          fr('<code>const age = 30</code>: 30 is a <b>Smi</b>. The frame slot contains the tagged word <code>60</code> (30 shifted left, low bit 0). <b>Nothing is allocated</b> on the heap.', [cp(code, { 2: 'cur' }), st(['global: u, say', 'makeUser: name → "Ann", age = Smi 30'], 'cur'), heap(['S1'], []), { type: 'bits', label: 'tagged word in the age slot', value: 60, width: 8, hl: { 0: 'ok' }, showDec: true }]),
          fr('<code>const tags = [\'new\']</code>: an <b>Array</b> is allocated in the heap (in the young generation, see next topic). The frame only stores a pointer.', [cp(code, { 3: 'cur' }), st(['global: u, say', 'makeUser: name, age = 30, tags → Array'], 'cur'), heap(['S1', 'A1', 'S2'], ['A1-S2'], { A1: 'ok', S2: 'ok' })]),
          fr('<code>const user = { name, age, tags }</code>: a new object with hidden class {name, age, tags}. Its <code>age</code> field holds the Smi <b>inline</b>; <code>name</code> and <code>tags</code> are pointers to existing heap objects. No strings or arrays are copied.', [cp(code, { 4: 'cur' }), st(['global: u, say', 'makeUser: name, age, tags, user → Object'], 'cur'), heap(['S1', 'A1', 'S2', 'O1'], ['O1-S1', 'O1-A1', 'A1-S2'], { O1: 'ok' })]),
          fr('<code>return user</code>: the frame of <code>makeUser</code> is <b>popped</b>. Its slots are gone instantly, no GC needed. But the objects survive, because the returned pointer is stored in <code>u</code>: they are still <b>reachable</b>.', [cp(code, { 5: 'cur', 7: 'ok' }), st(['global: u → Object, say = (TDZ)'], 'ok'), heap(['S1', 'A1', 'S2', 'O1'], ['O1-S1', 'O1-A1', 'A1-S2'], { O1: 'sel' }, { O1: 'u' })]),
          fr('<code>greeter(u)</code> runs. V8\'s parser already saw that the arrow function uses <code>greeting</code>, so <code>greeting</code> is <b>context-allocated</b>: it lives in a heap <b>Context</b> object, not in the frame. The concatenation creates a new heap string "Hi Ann".', [cp(code, { 9: 'cur' }), st(['global: u, say', 'greeter: u → Object, context → Context'], 'cur'), heap(['S1', 'A1', 'S2', 'O1', 'S3', 'C1'], ['O1-S1', 'O1-A1', 'A1-S2', 'C1-S3'], { C1: 'cur', S3: 'ok' }, { O1: 'u' })]),
          fr('<code>return () =&gt; greeting</code> creates a <b>closure</b> object pointing at the Context. The <code>greeter</code> frame is popped, but the Context lives on because <code>say</code> → closure → Context → "Hi Ann". This is exactly how closures "remember" variables.', [cp(code, { 10: 'cur', 12: 'ok' }), st(['global: u → Object, say → Closure'], 'ok'), heap(['S1', 'A1', 'S2', 'O1', 'S3', 'C1', 'F1'], ['O1-S1', 'O1-A1', 'A1-S2', 'C1-S3', 'F1-C1'], { F1: 'sel', C1: 'ok' }, { O1: 'u', F1: 'say' })]),
          fr('Summary: what lived where.', [{ type: 'table', label: 'Where each value lived', columns: ['value', 'where', 'freed when'], rows: [['age = 30', 'stack slot (Smi inline)', 'makeUser returns'], ['"Ann", "new", "Hi Ann"', 'heap strings', 'unreachable + GC'], ['tags array, user object', 'heap', 'unreachable + GC'], ['greeting', H.c('y', 'heap Context (captured)'), 'closure say becomes unreachable'], ['u, say (pointers)', 'global scope', 'page/process ends']], hl: { 3: 'sel' } }])
        ];
      }
    }, {
      title: 'Tagged values: Smi or pointer to a HeapNumber?',
      input: '7 -3 1073741823 1073741824 0.5 -0',
      inputLabel: 'Numbers separated by spaces (max 8)',
      gen: function (input) {
        var toks = String(input || '').trim().split(/\s+/).filter(Boolean);
        if (!toks.length || toks.length > 8) throw new Error('Give 1 to 8 numbers like: 7 -3 0.5');
        var nums = toks.map(function (t) { var n = Number(t); if (t === '' || isNaN(n)) throw new Error('"' + t + '" is not a number'); return n; });
        var MAX = 1073741823, MIN = -1073741824, frames = [], rows = [], nextAddr = 0x1A40;
        frames.push(fr('With <b>pointer compression</b> (default in Chrome and Node on 64-bit), every tagged value is a <b>32-bit word</b>. Low bit 0 → the other 31 bits are a small integer (Smi). Low bit 1 → a compressed pointer into the heap cage.', [{ type: 'table', label: 'Rules', columns: ['condition', 'representation', 'heap allocation?'], rows: [['integer in [−2<sup>30</sup>, 2<sup>30</sup> − 1] and not −0', 'Smi: word = n &lt;&lt; 1', H.c('g', 'none')], ['anything else (fractions, big numbers, −0, NaN)', 'pointer → HeapNumber box with a 64-bit double', H.c('r', 'yes (unless stored in a double array / typed array)')]] }]));
        nums.forEach(function (n) {
          var negZero = Object.is(n, -0), isSmi = Number.isInteger(n) && !negZero && n >= MIN && n <= MAX, word, narr;
          var label = negZero ? '-0' : String(n);
          if (isSmi) {
            word = (n << 1) >>> 0;
            narr = '<b>' + label + '</b> is a Smi. Tagged word = ' + label + ' &lt;&lt; 1 = <b>' + (n << 1) + '</b> (shown as unsigned 32-bit). Low bit is 0. Reading it back is one arithmetic shift right. No memory allocated.';
            rows.push([label, 'Smi', '0x' + word.toString(16).toUpperCase().padStart(8, '0'), '-']);
            frames.push(fr(narr, [{ type: 'bits', label: 'tagged 32-bit word for ' + label, value: word, width: 32, hl: { 0: 'ok' }, showDec: false }, { type: 'table', label: 'Values so far', columns: ['value', 'kind', 'tagged word', 'heap box'], rows: rows.slice(), hl: one(rows.length - 1, 'ok') }]));
          } else {
            var dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, n);
            var hex = ''; for (var b = 0; b < 8; b++) hex += dv.getUint8(b).toString(16).padStart(2, '0');
            var addr = nextAddr; nextAddr += 0x10;
            word = (addr | 1) >>> 0;
            var why = negZero ? 'Smi 0 means +0, so −0 has no Smi encoding (and 1/−0 = −Infinity must keep working)' : !Number.isInteger(n) ? 'it has a fractional part / is not finite' : 'it is outside the 31-bit Smi range';
            narr = '<b>' + label + '</b> cannot be a Smi: ' + why + '. V8 allocates a <b>HeapNumber</b> (map pointer + 8-byte IEEE-754 double <code>0x' + hex + '</code>) and the tagged word is a pointer with the low bit set to <b>1</b>.';
            rows.push([label, 'HeapNumber', '0x' + word.toString(16).toUpperCase().padStart(8, '0'), 'double 0x' + hex]);
            frames.push(fr(narr, [{ type: 'bits', label: 'tagged 32-bit word (compressed pointer) for ' + label, value: word, width: 32, hl: { 0: 'cur' } }, { type: 'graph', label: 'Pointer → heap box', directed: true, height: 30, nodes: [bx('W', 'tagged word ' + '0x' + word.toString(16).toUpperCase(), 18, 15, 26), bx('HN', 'HeapNumber [map | ' + label + ']', 70, 15, 34)], edges: [['W', 'HN', 'low bit 1 → pointer']], hl: { HN: 'cur' } }, { type: 'table', label: 'Values so far', columns: ['value', 'kind', 'tagged word', 'heap box'], rows: rows.slice(), hl: one(rows.length - 1, 'cur') }]));
          }
        });
        var heapCount = rows.filter(function (r) { return r[1] === 'HeapNumber'; }).length;
        frames.push(fr(heapCount + ' of ' + rows.length + ' values needed a heap box. In hot numeric code this is why V8 prefers integer math, why a <code>Float64Array</code> or a PACKED_DOUBLE array (raw doubles, no boxes) is great for big numeric data, and why optimized code keeps doubles in CPU registers instead of allocating boxes ("unboxing").', [{ type: 'table', label: 'Final', columns: ['value', 'kind', 'tagged word', 'heap box'], rows: rows.slice() }, { type: 'bars', label: 'bytes used per value (approx: 4-byte slot + 12-byte HeapNumber)', values: rows.map(function (r) { return r[1] === 'Smi' ? 4 : 16; }), idxLabels: rows.map(function (r) { return r[0]; }) }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Myth-busting in an interview', html: `<p>Q: "Strings are primitives, so they are on the stack, right?" A strong answer: "Not in V8. Every value is a tagged word. Small integers (Smis) are stored directly in that word. Everything else, including strings and most doubles, is a heap object, and the word holds a pointer. Primitives are <b>immutable</b>, which is what makes them behave like values, not where they are stored. Also, locals captured by closures are moved to heap Contexts."</p>${H.table(['Value', 'Where in V8'], [['<code>42</code>', 'Smi inside the tagged word'], ['<code>3.14</code>', 'HeapNumber (or raw double in a double array / register)'], ['<code>"hello"</code>', 'heap string (often internalized and shared)'], ['<code>{ a: 1 }</code>', 'heap object; a = Smi stored in the object']])}` },
      { title: 'Deeply nested JSON crashes the parser of your own code', html: `<p>A recursive <code>walk(node)</code> over a user-uploaded JSON tree works in tests, then crashes in production with <code>RangeError: Maximum call stack size exceeded</code> because one file is 50,000 levels deep (malicious or generated). Each recursive call costs a stack frame; the stack is about 1 MB. <b>Fix:</b> iterate with an explicit array as a stack (it lives on the heap, which is much larger), and also put a depth limit on untrusted input.</p>`, code: { lang: 'js', run: true, code: `// Build a 50,000-level nested object: { child: { child: ... } }
let deep = { value: 0 };
for (let i = 1; i <= 50000; i++) deep = { value: i, child: deep };

function countRec(n) { return n ? 1 + countRec(n.child) : 0; }
function countIter(n) { let c = 0; const stack = [n]; while (stack.length) { const x = stack.pop(); if (!x) continue; c++; stack.push(x.child); } return c; }

try { console.log(countRec(deep)); } catch (e) { console.log('recursive:', e.message); }
console.log('iterative:', countIter(deep));` } },
      { title: 'Buffers do not show up in heapUsed', html: `<p>A Node service reports <code>heapUsed</code> of 150 MB but the container is killed at 1 GB RSS. Culprit: large <code>Buffer</code>s / <code>ArrayBuffer</code>s (file uploads, image processing) whose bytes live <b>outside</b> the V8 heap ("external" memory, reported as <code>external</code> and <code>arrayBuffers</code> in <code>process.memoryUsage()</code>). Only the small JS wrapper objects are on the heap. Monitor <code>rss</code>, <code>external</code> and <code>arrayBuffers</code>, not just <code>heapUsed</code>, and stream large files instead of buffering them.</p>` },
      { title: 'Passing objects: the pointer is copied, not the object', html: `<p>Tagged words are copied on assignment and when passing arguments, so a function can mutate a caller's object through the pointer, but reassigning the parameter only changes the local slot.</p>`, code: { lang: 'js', run: true, code: `function mutate(o) { o.count += 1; }      // follows the pointer: caller sees it
function reassign(o) { o = { count: 99 }; }  // only changes the local frame slot
const obj = { count: 1 };
mutate(obj);
reassign(obj);
console.log(obj.count);                      // 2` } }
    ],
    deepDive: `<p>🟣 <b>What an interpreter frame contains.</b> From high to low addresses: the arguments (receiver <code>this</code> first), the return address, the caller's frame pointer, the <b>current Context</b>, the <b>JSFunction</b> being run, the argument count, then Ignition's <b>register file</b> (locals and temporaries) and the bytecode array/offset. Sparkplug reuses exactly this layout, which is why switching between Ignition and Sparkplug is free. Optimized frames are custom: values may sit in CPU registers and never touch memory.</p>
<p>🟣 <b>Pointer compression.</b> Since 2020 Chrome (and Node 14+ builds by default) store tagged values as 32-bit offsets from a 4 GB-aligned <b>cage base</b>. Decompressing is <code>base + offset</code>. It cut V8 heap size by up to roughly 40% on real sites and made Smis 31-bit. The trade-off: one isolate's pointer-compressed heap is limited to the cage (4 GB, with newer "sandbox" builds organising memory further), which is one reason huge single-process heaps hit hard limits.</p>
<p>🟣 <b>Heap spaces.</b> New space (young generation, two semi-spaces), old space, code space (executable machine code), large-object space (objects bigger than a regular page, never moved), and read-only space (immutable roots such as <code>undefined</code>, shared across isolates and loaded from the startup snapshot). Each Worker / worker_thread is a separate <b>isolate</b> with its own heap; only <code>SharedArrayBuffer</code> memory (and, newer, shared structs proposals) is truly shared.</p>
<p>🟣 <b>String representations.</b> Sequential (one-byte Latin-1 or two-byte UTF-16), <b>cons strings</b> (ropes made by <code>a + b</code>, flattened lazily), <b>sliced strings</b> (a <code>substring</code> of 13+ chars can point into its parent, which keeps the whole parent alive: a classic hidden retention), thin strings, external strings and internalized strings (deduplicated, used for property names). The <code>stack</code> size can be changed with <code>node --stack-size</code>, but raising it beyond what the OS thread provides can segfault: fix the recursion instead.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants love elegant recursive solutions (tree walks, deep clones, JSON transforms). They pass small tests and crash on real, deep inputs. AI also repeats the "primitives on the stack" myth in explanations. <b>Use AI as a partner:</b> <code>"Rewrite this recursive deepClone iteratively with an explicit stack and handle cycles with a WeakMap"</code>, <code>"Generate a 100k-deep test input for this function"</code>, or <code>"Explain the fields of process.memoryUsage() for this output"</code>. <b>Where AI goes wrong:</b> suggesting <code>--stack-size=65500</code> as a "fix" (can crash the process), claiming numbers are always 8-byte doubles in memory, or ignoring external memory when diagnosing an OOM. <b>What you must still own:</b> a correct mental model of tagged values, frames and contexts, so you can predict which code will overflow, allocate, or retain memory.</p>`,
    problems: [{
      title: 'Flatten a 100,000-Level Nested Array Without Blowing the Stack',
      level: 'Medium', tags: ['stack', 'iteration', 'recursion'], companies: ['Meta', 'Uber', 'Atlassian'],
      statement: `<p>Implement <code>flattenDeep(arr)</code> that returns all non-array values of an arbitrarily nested array <b>in order</b>. It must work for nesting depth 100,000 (where a recursive solution throws <code>RangeError</code>) and must not use <code>Array.prototype.flat(Infinity)</code>.</p>`,
      constraints: `<p>Total elements ≤ 10<sup>6</sup>; nesting depth ≤ 10<sup>5</sup>; O(N) time.</p>`,
      example: `<p>Input <code>[1, [2, [3, [4]], 5]]</code> → Output <code>[1, 2, 3, 4, 5]</code>. With input built as <code>a = [a, i]</code> 100,000 times, the output has 100,001 numbers in order: the innermost value first.</p>`,
      brute: { why: `<p>The natural recursive version adds one stack frame per nesting level. At ~10,000 levels it throws <code>RangeError: Maximum call stack size exceeded</code>. Spreading results (<code>out.push(...flattenRec(x))</code>) also copies arrays at every level: O(N·depth) work.</p>`, code: `function flattenRec(arr) {
  const out = [];
  for (const x of arr) {
    if (Array.isArray(x)) out.push(...flattenRec(x));   // one frame per level + copying
    else out.push(x);
  }
  return out;
}` },
      mcq: { q: 'Why does an explicit stack (an array you push/pop) survive depth 100,000 when recursion does not?', options: ['The array lives on the heap, which is far larger than the ~1 MB call stack', 'Arrays are faster than functions', 'V8 optimizes away the array', 'Explicit stacks use tail-call optimization'], answer: 0, explain: 'Each recursive call needs a stack frame from the small fixed-size call stack. An explicit stack is an ordinary heap object that can grow to hundreds of MB. (V8 does not implement proper tail calls.)' },
      hints: [`<p>Hint 1: Simulate what the call stack would hold: for each array you are inside, remember <b>which array</b> and <b>which index</b> you are at.</p>`, `<p>Hint 2: Keep a stack of <code>[array, index]</code> pairs. Look at the top: if its index is past the end, pop it; otherwise read the element, advance the index, and either push the element's array or output the value.</p>`, `<p>Hint 3: Advancing the index <b>before</b> pushing a child keeps the order correct when you come back. Edge cases: empty arrays, holes (treat as undefined or skip), very wide arrays.</p>`],
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(json) {\n  if (json === 'DEEP') { var deep = [0]; for (var i = 1; i <= 100000; i++) deep = [deep, i]; var f = flattenDeep(deep); return [f.length, f[0], f[1], f[f.length - 1]]; }\n  if (json === 'WIDE') { var w = []; for (var j = 0; j < 1000000; j++) w.push(j); var fw = flattenDeep([w, [w.slice(0, 5)]]); return [fw.length, fw[999999], fw[1000000]]; }\n  if (json === 'INPUT') { var a = [1, [2]]; var before = JSON.stringify(a); flattenDeep(a); return JSON.stringify(a) === before; }\n  return flattenDeep(JSON.parse(json));\n}"},"cases":[[["[1,[2,[3,[4]],5]]"],[1,2,3,4,5]],[["[]"],[]],[["[[]]"],[]],[["[[],[[]],[[],[]]]"],[]],[["[1]"],[1]],[["[[[[\"a\"]]],\"b\",[null,[0]]]"],["a","b",null,0]],[["[[1,2],[3,[4,5]],6]"],[1,2,3,4,5,6]],[["[\"x\",[[\"y\"],\"z\"]]"],["x","y","z"]],[["INPUT"],true],[["DEEP"],[100001,0,1,100000]],[["WIDE"],[1000005,999999,0]]]},
      solution: {
        approach: `<p>Replace the call stack with a heap-allocated stack of cursors. Each cursor is exactly what a recursive frame would have held (the array and the loop index). Memory grows with depth on the heap instead of the call stack, and every element is visited once.</p>`,
        code: { lang: 'js', run: true, code: `function flattenDeep(input) {
  const out = [];
  const stack = [[input, 0]];                 // cursors: [array, nextIndex]
  while (stack.length) {
    const top = stack[stack.length - 1];
    const [arr, i] = top;
    if (i >= arr.length) { stack.pop(); continue; }   // finished this array: "return"
    top[1] = i + 1;                                     // advance BEFORE descending
    const x = arr[i];
    if (Array.isArray(x)) stack.push([x, 0]);           // "recursive call" without a frame
    else out.push(x);
  }
  return out;
}

console.log(JSON.stringify(flattenDeep([1, [2, [3, [4]], 5]])));   // [1,2,3,4,5]

let deep = [0];
for (let i = 1; i <= 100000; i++) deep = [deep, i];   // 100,000 levels
const flat = flattenDeep(deep);
console.log(flat.length, flat[0], flat[flat.length - 1]);   // 100001 0 100000` },
        dry: { head: ['step', 'stack (top right)', 'element read', 'action', 'out'], rows: [['1', '[A,0]', '1', 'output', '[1]'], ['2', '[A,1]', '[2,[3,[4]],5]', 'push B', '[1]'], ['3', '[A,2] [B,0]', '2', 'output', '[1,2]'], ['4', '[A,2] [B,1]', '[3,[4]]', 'push C', '[1,2]'], ['5-7', '… [C,·] [D,·]', '3, then [4] → 4', 'output, push, output', '[1,2,3,4]'], ['8', 'pop D, pop C, [B,2]', '5', 'output', '[1,2,3,4,5]'], ['end', 'pop B, pop A', '-', 'done', H.c('g', '[1,2,3,4,5]')]] },
        complexity: `<p>Time O(N + A) where A = number of arrays. Extra space O(depth) for the cursor stack, on the heap.</p>`,
        followUps: ['Make it a generator (function*) that yields values lazily', 'Flatten only up to depth d (like flat(d))', 'Detect cycles (an array that contains itself) with a Set of arrays on the current path']
      }
    }]
  });

  /* ================= TOPIC 6: Generational garbage collection ================= */
  topics.push({
    title: 'Garbage Collection: Reachability, Scavenger (Young Gen) & Mark-Compact (Old Gen)',
    analogy: `<p>Think of a <b>busy café</b>. Most customers grab a coffee and leave within minutes; a few stay for hours with laptops. The staff wipe the small <b>takeaway counter</b> every few minutes (quick, because almost everyone there has already left). The big <b>dining room</b>, where the long-stayers sit, gets a deep clean only occasionally, because it is slow and most people there are still sitting.</p>
<p>V8's heap works the same way. New objects go to a small <b>young generation</b> cleaned very often and very quickly. Objects that survive a couple of cleanings are moved to the big <b>old generation</b>, which is cleaned rarely and more carefully.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> You never call <code>free()</code> in JavaScript. The <b>garbage collector (GC)</b> frees an object when it is <b>unreachable</b>: no chain of references leads to it from a <b>root</b>. Roots are things the engine always keeps: the current call stack's variables, global objects, active handles (timers, pending callbacks), and internal engine references.</p>
${H.chips(['roots: stack, globals, handles', '→ reachable = alive', 'not reachable = garbage (even in a cycle!)'], { label: 'The one rule', hl: { 1: 'g', 2: 'r' } })}
<p>🔵 <b>The generational hypothesis:</b> "most objects die young". Temporary arrays from <code>map</code>, strings built for one log line, promise objects... they live microseconds. So V8 splits the heap:</p>
${H.table(['', 'Young generation', 'Old generation'], [
  ['Size', 'small (a few MB to tens of MB)', 'large (up to the heap limit, often GBs)'],
  ['Collector', '<b>Scavenger</b> (minor GC): copies survivors between two semi-spaces', '<b>Mark-Compact</b> (major GC): mark live, sweep dead, compact fragmented pages'],
  ['How often', 'very often', 'rarely'],
  ['Cost depends on', H.c('g', 'number of <b>live</b> objects (dead ones are never even touched)'), 'size of the live heap'],
  ['Pause', 'usually around 1 ms or less, parallel', 'mostly concurrent/incremental; short final pause']
])}
<p>🔵 <b>Scavenge in 4 steps.</b> (1) New objects are bump-allocated in the <b>from-space</b> (just move a pointer: super cheap). (2) When it fills up, find live objects starting from the roots <b>and</b> from old objects that point into the young generation (tracked in a <b>remembered set</b> by a <b>write barrier</b>). (3) <b>Copy</b> each live object to the empty <b>to-space</b>; objects that already survived one scavenge are <b>promoted</b> to old space. (4) <b>Flip</b>: the to-space becomes the new from-space; the old from-space is now entirely free, garbage and all, in one go.</p>
<p>🔵 <b>Mark-Compact.</b> Mark every reachable object (tri-color: white = not seen, grey = seen but children not scanned, black = done), <b>sweep</b> white objects into free lists, and <b>compact</b> (evacuate) badly fragmented pages. V8's <b>Orinoco</b> project made most of this happen on helper threads <b>concurrently</b> with your JavaScript, leaving only short pauses on the main thread.</p>`,
    clues: ['"How does garbage collection work in JavaScript?" → reachability from roots, mark-and-sweep, generational', '"Can circular references leak in JS?" → no, unreachable cycles are collected (unlike reference counting)', '"Short-lived allocations in a hot loop, latency spikes" → frequent scavenges, premature promotion', '"p99 latency spikes every few seconds in Node" → GC pauses; check --trace-gc', '"What is a write barrier / remembered set?" → tracking old→young pointers', '"Object pool: should I reuse objects?" → usually no in JS; young-gen allocation is cheap', '"Heap out of memory" → old space full; leak or raise --max-old-space-size'],
    code: [{ lang: 'js', run: true, title: 'Which is faster? Short-lived garbage vs objects that survive', code: `
// Both loops allocate the same number of objects.
// A: objects die immediately -> scavenges find almost nothing alive -> very cheap.
// B: objects are kept alive in a big array -> every scavenge must COPY them, then promote them,
//    and the old generation grows until a major GC has to mark them all.
function shortLived(n) {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const p = { x: i, y: i * 2 };   // garbage right after this iteration
    sum += p.x + p.y;
  }
  return sum;
}
function longLived(n) {
  const keep = [];
  for (let i = 0; i < n; i++) keep.push({ x: i, y: i * 2 });   // all survive
  let sum = 0;
  for (const p of keep) sum += p.x + p.y;
  return sum;
}
const N = 1500000;
let t = performance.now(); shortLived(N); const a = performance.now() - t;
t = performance.now(); longLived(N); const b = performance.now() - t;
console.log('short-lived objects: ' + a.toFixed(1) + ' ms');
console.log('long-lived objects:  ' + b.toFixed(1) + ' ms  (' + (b / a).toFixed(1) + 'x slower)');
// Note: in A the optimizer may even remove the allocation entirely (escape analysis).
` }, { lang: 'js', run: true, title: 'Cycles are collected: a tiny mark-and-sweep you can run', code: `
// heap: id -> list of ids it references
const heap = new Map([
  ['window', ['app']], ['app', ['user', 'cache']], ['user', ['app']],   // cycle app <-> user, but reachable
  ['cache', []], ['oldModal', ['oldBtn']], ['oldBtn', ['oldModal']]   // cycle, NOT reachable
]);
const roots = ['window'];

function markSweep(heap, roots) {
  const marked = new Set(roots), work = [...roots];       // grey worklist
  while (work.length) {
    const id = work.pop();
    for (const child of heap.get(id) || []) if (!marked.has(child)) { marked.add(child); work.push(child); }
  }
  const garbage = [...heap.keys()].filter((id) => !marked.has(id));
  garbage.forEach((id) => heap.delete(id));                // sweep
  return garbage;
}
console.log('collected:', markSweep(heap, roots));         // [ 'oldModal', 'oldBtn' ]
console.log('alive:', [...heap.keys()]);
` }, { lang: 'bash', title: 'Watching the GC in Node', code: `# One line per GC: type, heap before -> after, pause time
node --trace-gc server.js
# [12345:0x...]   41 ms: Scavenge 4.1 (5.8) -> 3.6 (6.8) MB, 0.9 / 0.0 ms  (average mu = 1.000) allocation failure
# [12345:0x...] 2210 ms: Mark-Compact 210.4 (230.1) -> 150.2 (190.0) MB, 3.1 / 0.0 ms ... finalize incremental marking

# Old-generation limit (MB). Raise only when the live data is genuinely big, never to "fix" a leak.
node --max-old-space-size=4096 server.js

# Bigger young generation (MB per semi-space): fewer scavenges and less premature promotion
node --max-semi-space-size=64 server.js` }],
    codeTitle: ['Short-lived vs long-lived — runnable', 'Mark-and-sweep with cycles — runnable', 'GC tracing and tuning flags'],
    viz: [{
      title: 'Generational GC: semi-spaces, scavenges, promotion and a major GC',
      input: 'alloc A, alloc B, alloc C, drop B, alloc D, gc, alloc E, link A E, drop C, drop E, gc, alloc F, drop A, major',
      inputLabel: 'Commands: alloc X, drop X (variable no longer holds X), link X Y (X.ref = Y), gc (minor), major (full). Max 24.',
      gen: function (input) {
        var cmds = items(input);
        if (!cmds.length || cmds.length > 24) throw new Error('Give 1 to 24 commands like: alloc A, drop A, gc');
        var CAP = 6, OLDCAP = 10, objs = {}, from = [], old = [], roots = [], frames = [], stats = { minor: 0, major: 0, promoted: 0, freed: 0 }, oom = false;
        function refsList() { var e = []; Object.keys(objs).forEach(function (k) { objs[k].refs.forEach(function (r) { e.push([k, r]); }); }); return e; }
        function cell(n) { return n ? n + (objs[n] && objs[n].space === 'young' ? '·' + objs[n].age : '') : ''; }
        function grid(to, hl) {
          var r1 = [], r2 = [], r3 = [];
          for (var i = 0; i < OLDCAP; i++) {
            r1.push(i < CAP ? cell(from[i]) : '—');
            r2.push(i < CAP ? cell(to ? to[i] : null) : '—');
            r3.push(cell(old[i]));
          }
          return { type: 'grid', label: 'Heap (name·age = scavenges survived)', rowHead: ['young: from-space', 'young: to-space', 'old space'], colHead: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], rows: [r1, r2, r3], hl: hl || {} };
        }
        function side(hlRoots) {
          var h = {}; (hlRoots || []).forEach(function (r) { h[r] = 'ok'; });
          return [{ type: 'set', label: 'Roots (variables that still hold the object)', items: roots.slice(), hl: h }, { type: 'map', label: 'References X → Y', entries: refsList().map(function (e) { return [e[0], e[1]]; }) }, vp(stats, {}, 'GC stats')];
        }
        function reach(startSet) {
          var seen = {}, work = startSet.slice();
          work.forEach(function (n) { seen[n] = true; });
          while (work.length) { var n = work.pop(); (objs[n] ? objs[n].refs : []).forEach(function (c) { if (!seen[c] && objs[c]) { seen[c] = true; work.push(c); } }); }
          return seen;
        }
        function where(n) { var i = from.indexOf(n); if (i >= 0) return '0,' + i; i = old.indexOf(n); return i >= 0 ? '2,' + i : null; }
        function minor(reason) {
          stats.minor++;
          var remembered = [];
          old.forEach(function (o) { objs[o].refs.forEach(function (r) { if (objs[r] && objs[r].space === 'young' && remembered.indexOf(o) < 0) remembered.push(o); }); });
          var live = reach(roots.concat(remembered)), hl = {};
          from.forEach(function (n, i) { hl['0,' + i] = live[n] ? 'ok' : 'bad'; });
          frames.push(fr('<b>Minor GC (scavenge)</b>' + (reason ? ' triggered by ' + reason : '') + '. Step 1: trace from the roots' + (remembered.length ? ' <b>and</b> from the <b>remembered set</b> (old objects ' + remembered.join(', ') + ' point into the young generation; the write barrier recorded that)' : '') + '. Green = reachable, red = garbage. Old space is <b>not</b> traced: that is why minor GCs are fast.', [grid(null, hl)].concat(side(roots))));
          var to = [], hl2 = {}, promotedNow = [], dead = 0;
          from.forEach(function (n) {
            if (!live[n]) { dead++; delete objs[n]; return; }
            objs[n].age++;
            if (objs[n].age >= 2) {
              if (old.length >= OLDCAP) { oom = true; return; }
              objs[n].space = 'old'; old.push(n); promotedNow.push(n); stats.promoted++; hl2['2,' + (old.length - 1)] = 'sel';
            } else { to.push(n); hl2['1,' + (to.length - 1)] = 'ok'; }
          });
          stats.freed += dead;
          Object.keys(objs).forEach(function (k) { objs[k].refs = objs[k].refs.filter(function (r) { return objs[r]; }); });
          frames.push(fr('Step 2: <b>copy</b> survivors to the to-space (age +1) and <b>promote</b> objects that survived their second scavenge to old space' + (promotedNow.length ? ' (<b>' + promotedNow.join(', ') + '</b>, purple)' : '') + '. The ' + dead + ' dead object(s) are never touched: the copying collector only pays for <b>live</b> objects.' + (oom ? ' <span class="c-r">Old space is full and cannot take promotions!</span>' : ''), [grid(to, hl2)].concat(side())));
          from = to;
          frames.push(fr('Step 3: <b>flip</b>. The to-space becomes the new from-space; the old from-space is now completely empty and ready for bump allocation. Live objects are packed together, so there is no fragmentation in the young generation.', [grid(null, {})].concat(side())));
        }
        function major() {
          stats.major++;
          var live = reach(roots), hl = {};
          from.forEach(function (n, i) { hl['0,' + i] = live[n] ? 'ok' : 'bad'; });
          old.forEach(function (n, i) { hl['2,' + i] = live[n] ? 'ok' : 'bad'; });
          frames.push(fr('<b>Major GC (Mark-Compact)</b>. Mark phase: trace from the roots through <b>the whole heap</b>, old space included (in real V8 most of this runs concurrently on helper threads). Red objects are unreachable, including any unreachable <b>cycles</b>.', [grid(null, hl)].concat(side(roots))));
          var dead = 0;
          from = from.filter(function (n) { if (!live[n]) { dead++; delete objs[n]; return false; } return true; });
          old = old.filter(function (n) { if (!live[n]) { dead++; delete objs[n]; return false; } return true; });
          stats.freed += dead;
          Object.keys(objs).forEach(function (k) { objs[k].refs = objs[k].refs.filter(function (r) { return objs[r]; }); });
          var hl2 = {}; old.forEach(function (n, i) { hl2['2,' + i] = 'win'; });
          frames.push(fr('Sweep + compact: ' + dead + ' dead object(s) freed. Fragmented old-space pages are <b>compacted</b> (survivors moved together, pointers updated) so big objects can be allocated later. This is the expensive collection, which is why V8 runs it rarely.', [grid(null, hl2)].concat(side())));
        }
        frames.push(fr('Empty heap. Young from-space has ' + CAP + ' slots, old space ' + OLDCAP + '. Commands: <b>' + esc(cmds.join(', ')) + '</b>', [grid(null, {})].concat(side())));
        for (var ci = 0; ci < cmds.length && !oom; ci++) {
          var p = cmds[ci].split(/\s+/), op = p[0].toLowerCase(), a = p[1], b = p[2];
          if (op === 'alloc') {
            if (!a) throw new Error('alloc needs a name, e.g. alloc A');
            if (objs[a]) throw new Error('Object ' + a + ' already exists; pick a new name');
            if (Object.keys(objs).length >= 16) throw new Error('Keep at most 16 live objects for the picture');
            if (from.length >= CAP) minor('allocation failure (from-space is full)');
            if (oom) break;
            objs[a] = { space: 'young', age: 0, refs: [] }; from.push(a); if (roots.indexOf(a) < 0) roots.push(a);
            var h = {}; h['0,' + (from.length - 1)] = 'cur';
            frames.push(fr('<code>let ' + esc(a) + ' = {…}</code>: allocated in the young <b>from-space</b> by bumping a pointer (just an add and a compare: allocation in V8 is very cheap). ' + esc(a) + ' is held by a variable, so it is a <b>root</b>.', [grid(null, h)].concat(side([a]))));
          } else if (op === 'drop') {
            if (!a || roots.indexOf(a) < 0) throw new Error('drop needs a name that is currently a root, e.g. drop A');
            roots.splice(roots.indexOf(a), 1);
            var w = where(a), h2 = {}; if (w) h2[w] = 'cur';
            frames.push(fr('<code>' + esc(a) + ' = null</code> (or it went out of scope): the variable no longer points to ' + esc(a) + '. The object is <b>still in memory</b>: nothing is freed until the next GC, and only if nothing else references it.', [grid(null, h2)].concat(side())));
          } else if (op === 'link') {
            if (!objs[a] || !objs[b]) throw new Error('link needs two existing objects, e.g. link A B');
            if (objs[a].refs.indexOf(b) < 0) objs[a].refs.push(b);
            var barrier = objs[a].space === 'old' && objs[b].space === 'young';
            var h3 = {}; if (where(a)) h3[where(a)] = 'cur'; if (where(b)) h3[where(b)] = 'ok';
            frames.push(fr('<code>' + esc(a) + '.ref = ' + esc(b) + '</code>. ' + (barrier ? 'An <b>old</b> object now points to a <b>young</b> one. The <b>write barrier</b> (a few instructions V8 adds to every pointer store) records this slot in the <b>remembered set</b>, so the next scavenge can find ' + esc(b) + ' without scanning all of old space.' : 'Now ' + esc(b) + ' stays alive as long as ' + esc(a) + ' is reachable.'), [grid(null, h3)].concat(side())));
          } else if (op === 'gc' || op === 'minor') { minor('an explicit request (in real code: whenever the from-space fills up)'); }
          else if (op === 'major' || op === 'full') { major(); }
          else throw new Error('Unknown command "' + cmds[ci] + '". Use alloc X, drop X, link X Y, gc, major');
        }
        frames.push(fr(oom ? '<span class="c-r">Out of memory</span>: survivors could not be promoted because old space is full of <b>reachable</b> objects. In Node this is "FATAL ERROR: Reached heap limit ... JavaScript heap out of memory". Usually a leak: things stay reachable that should not.' : 'Final heap. Minor GCs: ' + stats.minor + ', major GCs: ' + stats.major + ', promoted: ' + stats.promoted + ', freed: ' + stats.freed + '. Notice how cheap it was to free short-lived objects, and that only <b>reachability</b> decided what survived.', [grid(null, {})].concat(side())));
        return frames;
      }
    }, {
      title: 'Tri-color marking (and why cycles are not a problem)',
      input: 'root>A, A>B, B>C, A>C, root>F, F>G, D>E, E>D, H>A',
      inputLabel: 'Edges X>Y (X references Y). "root" is the root set. Max 12 edges, 10 objects.',
      gen: function (input) {
        var edges = items(input).map(function (e) { var m = e.split('>'); if (m.length !== 2 || !m[0].trim() || !m[1].trim()) throw new Error('Write edges like root>A, A>B'); return [m[0].trim(), m[1].trim()]; });
        if (!edges.length || edges.length > 12) throw new Error('Give 1 to 12 edges');
        var names = [];
        edges.forEach(function (e) { e.forEach(function (n) { if (n !== 'root' && names.indexOf(n) < 0) names.push(n); }); });
        if (names.length > 10) throw new Error('At most 10 objects');
        if (!edges.some(function (e) { return e[0] === 'root'; })) throw new Error('Add at least one root edge, e.g. root>A');
        var nodes = [{ id: 'root', label: 'ROOTS', x: 8, y: 32, shape: 'box', w: 12 }];
        names.forEach(function (n, i) { var ang = -Math.PI / 2 + (2 * Math.PI * i) / names.length; nodes.push({ id: n, label: n, x: 58 + 34 * Math.cos(ang), y: 32 + 26 * Math.sin(ang) }); });
        var color = {}; names.forEach(function (n) { color[n] = 'white'; });
        function g(extraE) {
          var hl = { root: 'sel' };
          names.forEach(function (n) { var c = color[n] === 'grey' ? 'cur' : color[n] === 'black' ? 'ok' : color[n] === 'freed' ? 'bad' : null; if (c) hl[n] = c; });
          return { type: 'graph', label: 'Heap graph (amber = grey, green = black, uncoloured = white, red = swept)', directed: true, height: 64, nodes: nodes, edges: edges, hl: hl, ehl: extraE || {} };
        }
        var work = [], frames = [];
        frames.push(fr('All objects start <b>white</b> ("not proven alive"). The collector will paint reachable objects <b>grey</b> (found, children not scanned yet) and then <b>black</b> (found and fully scanned).', [g(), { type: 'queue', label: 'Grey worklist', items: [] }]));
        edges.forEach(function (e) { if (e[0] === 'root' && color[e[1]] === 'white') { color[e[1]] = 'grey'; work.push(e[1]); } });
        frames.push(fr('Mark the objects referenced directly by the <b>roots</b> grey and put them in the worklist: <b>' + work.join(', ') + '</b>.', [g(), { type: 'queue', label: 'Grey worklist', items: work.slice(), frontLabel: 'next' }]));
        var guard = 0;
        while (work.length && guard++ < 50) {
          var n = work.shift(), found = [], eh = {};
          edges.forEach(function (e) { if (e[0] === n) { eh[e[0] + '-' + e[1]] = 'cur'; if (color[e[1]] === 'white') { color[e[1]] = 'grey'; work.push(e[1]); found.push(e[1]); } } });
          color[n] = 'black';
          frames.push(fr('Scan <b>' + n + '</b>: ' + (found.length ? 'its white children <b>' + found.join(', ') + '</b> become grey.' : 'no white children (already-grey/black ones are skipped, which is why <b>cycles never loop forever</b>).') + ' ' + n + ' is now <b>black</b>.', [g(eh), { type: 'queue', label: 'Grey worklist', items: work.slice(), frontLabel: 'next' }]));
        }
        var dead = names.filter(function (x) { return color[x] === 'white'; });
        frames.push(fr('Worklist empty: marking is done. Everything still <b>white</b> is unreachable: <b>' + (dead.length ? dead.join(', ') : 'nothing') + '</b>. ' + (dead.length ? 'Unreachable objects may point to live ones, or to each other in a cycle: neither keeps them alive. Only a path <b>from a root</b> counts.' : ''), [g(), vp({ black: names.filter(function (x) { return color[x] === 'black'; }).join(' ') || '-', white: dead.join(' ') || '-' }, { white: 'bad' }, 'Result')]));
        dead.forEach(function (x) { color[x] = 'freed'; });
        frames.push(fr('<b>Sweep</b>: white objects are added to free lists (their memory is reused). In V8 sweeping runs <b>concurrently</b> on helper threads and lazily per page.', [g(), tx('Freed: ' + (dead.length ? dead.join(', ') : 'nothing'))]));
        frames.push(fr('Concurrent marking twist: while helper threads mark, your JavaScript keeps running and may store a pointer to a white object into a black one. The <b>marking write barrier</b> catches every such store and greys the target, so a live object is never freed by mistake. Same tri-color idea, made safe for concurrency.', [g(), { type: 'code', label: 'Conceptual write barrier (added by the engine to pointer stores)', lang: 'js', code: 'function writeBarrier(host, value) {\n  if (marking && isBlack(host) && isWhite(value)) {\n    markGrey(value);           // keep the invariant: black never points to white\n  }\n  if (isOld(host) && isYoung(value)) rememberedSet.add(slotOf(host));\n}', hl: { 3: 'cur' } }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Why method chains are usually fine', html: `<p><code>orders.filter(o =&gt; o.paid).map(o =&gt; o.total).reduce(add, 0)</code> creates two temporary arrays. They die immediately, so the scavenger never copies them: cost ≈ the bump allocation plus a tiny share of a scavenge. For 1,000 elements this is irrelevant. For 10 million elements in a hot path, the temporaries fill the young generation repeatedly; a single <code>for</code> loop avoids that. <b>Rule:</b> write clear code first, and optimize allocation only where a profile shows GC time.</p>` },
      { title: 'Latency spikes in a Node API: premature promotion', html: `<p>An API builds large response objects (each lives ~50 ms, across a few awaits). With a small young generation, a scavenge happens <i>while</i> they are still alive: they get copied, then promoted to old space, where they die soon after. Old space fills with short-lived garbage, so major GCs run often and p99 latency spikes. <b>Fixes:</b> stream responses instead of building huge objects, and try <code>--max-semi-space-size</code> (e.g. 32 or 64 MB) so objects die young. Measure with <code>--trace-gc</code> before and after.</p>${H.table(['Symptom in --trace-gc', 'Likely meaning'], [['Scavenges every few ms', 'heavy allocation rate'], ['Mark-Compact frequently, heap drops a lot each time', 'premature promotion of short-lived data'], ['Mark-Compact frequently, heap barely drops', H.c('r', 'a leak or genuinely big live data')]])}` },
      { title: 'Reference counting vs tracing (the old IE leak)', html: `<p>Early Internet Explorer managed DOM objects with <b>reference counting</b>: an object is freed when its count hits 0. A cycle (DOM node → event handler closure → DOM node) never reaches 0, so it leaked. JavaScript engines today use <b>tracing</b> GC: only reachability from roots matters, so cycles are collected. Modern Chrome even traces across the JS/C++ boundary (V8 + Oilpan "unified heap"), so JS ⇄ DOM cycles are also collected.</p>` },
      { title: 'Object pools: usually a bad trade in JS', html: `<p>In C++ games, pools avoid <code>malloc</code>. In JavaScript, young allocation is a pointer bump and dead objects cost nothing to free, so pooling often makes things <b>worse</b>: pooled objects live long, get promoted, and every write into them goes through the write barrier (old → young pointers). Pools still make sense for large buffers (<code>ArrayBuffer</code>s, WebGL resources) or when a profile proves GC pauses hurt frame times.</p>`, code: { lang: 'js', run: true, code: `// Typed-array reuse is the GOOD kind of pooling: one big buffer, no per-frame garbage.
const particles = new Float32Array(1000 * 2);           // x, y pairs, allocated once
function step(dt) { for (let i = 0; i < particles.length; i += 2) { particles[i] += dt; particles[i + 1] += dt * 2; } }
for (let frame = 0; frame < 60; frame++) step(1 / 60);
console.log(particles[0].toFixed(3), particles[1].toFixed(3));   // 1.000 2.000` } }
    ],
    deepDive: `<p>🟣 <b>Orinoco, piece by piece.</b> The <b>parallel scavenger</b> splits young-generation copying across helper threads (work stealing). For the old generation: <b>concurrent marking</b> runs on helper threads while JavaScript runs; <b>incremental marking</b> slices any remaining main-thread marking into small steps interleaved with JS; a short <b>atomic pause</b> finalizes marking; <b>concurrent sweeping</b> and <b>parallel compaction</b> (evacuating the most fragmented pages and updating pointers) follow. Chrome also schedules GC work in <b>idle time</b> between frames.</p>
<p>🟣 <b>Barriers and remembered sets.</b> Every pointer store in JS gets a write barrier (in optimized code it is inlined and often elided when the compiler proves it unnecessary, e.g. storing a Smi or into a freshly allocated young object). The <b>generational barrier</b> records old→young slots in per-page slot sets; the <b>marking barrier</b> preserves the tri-color invariant during concurrent marking. <b>Black allocation</b>: objects allocated during marking are born black, so they survive the current cycle.</p>
<p>🟣 <b>Young generation details.</b> Survivors of the first scavenge stay in the young generation (in an "intermediate" region); the second survival promotes them. The young generation grows dynamically up to a limit based on available memory (tunable with <code>--max-semi-space-size</code>). V8 has also developed a non-moving young-generation collector ("minor mark-sweep") as an alternative design, so details continue to evolve.</p>
<p>🟣 <b>Heap limits.</b> Node picks a default old-space limit from system/container memory; <code>--max-old-space-size</code> overrides it. When the limit is near, V8 runs increasingly desperate full GCs (you will see "last resort" GCs in traces) before crashing with "Reached heap limit". <code>--heapsnapshot-near-heap-limit=N</code> writes heap snapshots just before that, the best evidence for a post-mortem.</p>
<p>🟣 <b>Weak references and finalizers.</b> <code>WeakMap</code>/<code>WeakSet</code> use <b>ephemeron</b> semantics (a value is kept alive only while its key is). <code>WeakRef</code> and <code>FinalizationRegistry</code> expose GC timing to JS, but the spec gives <b>no guarantee when (or whether)</b> callbacks run: never use them for program logic, only for optional cleanup and caches.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants readily suggest <code>global.gc()</code> calls, object pools, or "set everything to null at the end of the function" to "help the GC". Almost always useless in modern V8: locals die with the frame, young garbage is free, and forced GCs cause pauses. <b>Use AI as a partner:</b> feed it a <code>--trace-gc</code> log and ask <code>"Summarise scavenge vs mark-compact frequency, average pause, and whether old space is growing between major GCs"</code>; ask it to generate a load test that reproduces a GC-heavy endpoint. <b>Where AI goes wrong:</b> describing JS GC as reference counting, claiming cycles leak, inventing <code>--gc-interval</code>-style flags as production tuning, or relying on <code>FinalizationRegistry</code> for correctness. <b>What you must still own:</b> the reachability model, knowing which numbers in a trace matter, and choosing between "allocate less", "retain less" and "give it more memory".</p>`,
    problems: [{
      title: 'Mark-and-Sweep: Which Objects Get Collected?',
      level: 'Easy', tags: ['graph', 'BFS', 'garbage collection'], companies: ['Google', 'Microsoft', 'Oracle'],
      statement: `<p>A heap has objects <code>0..n-1</code>. <code>refs[i]</code> lists the objects that object <code>i</code> references. <code>roots</code> lists the objects referenced from the stack and globals. Return, in increasing order, the ids of all objects a tracing garbage collector would free.</p>`,
      constraints: `<p>1 ≤ n ≤ 10<sup>5</sup>, total references ≤ 2·10<sup>5</sup>. References may form cycles. O(n + E) expected.</p>`,
      example: `<p><code>n = 6, refs = [[1], [2], [1], [4], [3], []], roots = [0]</code></p>${H.table(['object', 'reachable from root 0?', 'freed?'], [['0', 'root', 'no'], ['1', '0 → 1', 'no'], ['2', '0 → 1 → 2', 'no'], ['3', H.c('r', 'no (3 ⇄ 4 cycle)'), H.c('r', 'yes')], ['4', H.c('r', 'no'), H.c('r', 'yes')], ['5', H.c('r', 'nobody points to it'), H.c('r', 'yes')]])}<p>Output <code>[3, 4, 5]</code>. The 1 ⇄ 2 cycle is reachable, so it survives; the 3 ⇄ 4 cycle is not, so it is freed.</p>`,
      brute: { why: `<p>For every object, run a separate BFS from the roots to see whether it is reachable: n searches of O(n + E) each, O(n·(n + E)) total, about 10<sup>10</sup> steps at the limits. The insight: one traversal from all roots answers the question for every object at once.</p>`, code: `function garbageBrute(n, refs, roots) {
  const out = [];
  for (let target = 0; target < n; target++) {           // n separate searches
    const seen = new Set(roots), q = [...roots];
    let found = seen.has(target);
    while (q.length && !found) {
      const x = q.shift();
      for (const y of refs[x]) if (!seen.has(y)) { seen.add(y); q.push(y); if (y === target) found = true; }
    }
    if (!found) out.push(target);
  }
  return out;
}` },
      mcq: { q: 'Object X is referenced only by object Y, and Y is referenced only by X. Neither is reachable from a root. What happens?', options: ['Both are collected: tracing GC only cares about reachability from roots', 'Both leak forever because their reference counts are 1', 'Only one is collected', 'It depends on which was allocated first'], answer: 0, explain: 'V8 uses tracing, not reference counting. An unreachable cycle is just unreachable garbage.' },
      hints: [`<p>Hint 1: Do not ask "is X reachable?" n times. Ask once: "what is reachable from the roots?" Everything else is garbage.</p>`, `<p>Hint 2: Use a <code>marked</code> boolean array and an explicit worklist (stack or queue) seeded with all roots. This is the mark phase.</p>`, `<p>Hint 3: Mark a node <b>when you push it</b> so cycles and duplicates are pushed once. Then the sweep phase is a loop over 0..n−1 collecting unmarked ids (already sorted). Use an explicit stack, not recursion, for deep chains.</p>`],
      tests: {"sig":"int int[][] int[] -> int[]","fn":"garbage","cases":[[[6,[[1],[2],[1],[4],[3],[]],[0]],[3,4,5]],[[3,[[],[],[]],[0,1,2]],[]],[[1,[[]],[0]],[]],[[1,[[0]],[]],[0]],[[4,[[1],[0],[3],[2]],[0]],[2,3]],[[4,[[0],[0],[0],[0]],[2]],[1,3]],[[5,[[],[],[],[],[]],[]],[0,1,2,3,4]],[[3,[[1],[2],[0]],[1]],[]],[[100000,{"$rep":[],"n":100000},[0]],{"$range":[1,100000]}],[[100000,{"$rep":[0],"n":100000},[5]],{"$concat":[{"$range":[1,5]},{"$range":[6,100000]}]}]]},
      solution: {
        approach: `<p>Exactly the GC's own algorithm: <b>mark</b> with an iterative DFS from all roots (marking when pushing so each object is pushed at most once), then <b>sweep</b> by scanning ids in order. Cycles are harmless because marked objects are never pushed again.</p>`,
        code: { lang: 'js', run: true, code: `function garbage(n, refs, roots) {
  const marked = new Uint8Array(n);       // 0 = white, 1 = reached
  const work = [];
  for (const r of roots) if (!marked[r]) { marked[r] = 1; work.push(r); }
  while (work.length) {                    // mark phase (iterative: no stack overflow)
    const x = work.pop();
    for (const y of refs[x]) if (!marked[y]) { marked[y] = 1; work.push(y); }
  }
  const freed = [];
  for (let i = 0; i < n; i++) if (!marked[i]) freed.push(i);   // sweep phase
  return freed;
}

console.log(garbage(6, [[1], [2], [1], [4], [3], []], [0]));      // [ 3, 4, 5 ]
console.log(garbage(3, [[], [], []], [0, 1, 2]));                 // []  (everything is a root)` },
        dry: { head: ['step', 'pop', 'push (newly marked)', 'work stack', 'marked'], rows: [['init', '-', '0', '[0]', '{0}'], ['1', '0', '1', '[1]', '{0,1}'], ['2', '1', '2', '[2]', '{0,1,2}'], ['3', '2', '(1 already marked)', '[]', '{0,1,2}'], ['sweep', '-', '-', '-', H.c('r', 'free 3, 4, 5')]] },
        complexity: `<p>Time O(n + E): each object pushed once, each reference scanned once. Space O(n) for the mark bits and worklist.</p>`,
        followUps: ['Return the retained size of each root (how much memory it keeps alive alone): needs dominators', 'Make it incremental: process at most K objects per call and resume later', 'Add a write barrier: what must happen if refs change while you are in the middle of marking?']
      }
    }]
  });

  /* ================= TOPIC 7: Memory leaks and how to find them ================= */
  topics.push({
    title: 'Memory Leaks: Common Causes and How to Hunt Them (DevTools, Heap Snapshots, Node)',
    analogy: `<p>A <b>hotel</b> frees a room when the guest hands back the key card. Now imagine the front desk keeps a <b>copy of every key card</b> "just in case", in a drawer nobody ever empties. Guests leave, but the hotel believes every room might still be used, so it can never rent them out. Eventually the hotel is "full" while being nearly empty.</p>
<p>That is a JavaScript memory leak. The garbage collector is the cleaning staff: it only cleans rooms whose key cards are <b>all</b> gone. A leak is not the GC failing; it is <b>your code still holding a key card</b> (a reference) to something it will never use again.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> In a garbage-collected language, a <b>leak = memory that is still reachable but no longer needed</b>. The GC is doing its job correctly; something is accidentally keeping a path from a root to the data. The usual suspects:</p>
${H.table(['#', 'Leak pattern', 'What holds the reference', 'Fix'], [
  ['1', 'Forgotten timers', '<code>setInterval</code> callback (an active handle = root) closes over big data', '<code>clearInterval</code> on cleanup / unmount'],
  ['2', 'Listeners never removed', 'window, document, a global emitter, a socket', '<code>removeEventListener</code>, <code>{ signal }</code> with AbortController, <code>once</code>'],
  ['3', 'Detached DOM nodes', 'a JS variable/array/Map still points to removed elements', 'drop the references; use WeakMap/WeakRef for caches keyed by nodes'],
  ['4', 'Unbounded caches', 'module-level Map/object that only grows', 'LRU size limit, TTL, or WeakMap keyed by owner object'],
  ['5', 'Closures capturing too much', 'a long-lived closure keeps its whole scope Context alive', 'capture only what you need; null out big locals'],
  ['6', 'Accidental globals', '<code>x = 5</code> without let/const in sloppy mode makes <code>window.x</code>', '<code>"use strict"</code> / ES modules (always strict), linting'],
  ['7', 'Logging and debugging', '<code>console.log(bigObject)</code> while DevTools is open keeps it for inspection', 'remove logs, log summaries'],
  ['8', 'Promises that never settle', 'reactions pile up on a long-lived promise (<code>Promise.race</code> loops)', 'timeouts that settle, AbortSignal, avoid racing against eternal promises']
])}
<p>🔵 <b>How to recognise a leak.</b> Watch memory over time while repeating the same action (open/close a dialog 10 times; send 10,000 requests). After each GC the heap should return to roughly the same floor: a <b>sawtooth</b>. A leak looks like a <b>staircase</b>: the floor after every GC keeps rising.</p>
<p>🔵 <b>The hunting workflow (browser).</b> Chrome DevTools → <b>Memory</b> panel:</p>
<ol>
<li><b>Heap snapshot</b> → do the action several times → snapshot again → <b>Comparison</b> view: which constructors grew (# Delta)?</li>
<li>Filter for <b>"Detached"</b> to find DOM nodes removed from the page but still referenced.</li>
<li>Click a leaked object → read the <b>Retainers</b> panel bottom-up: it shows the path from the object back to a GC root. The first line that is <i>your</i> code is usually the bug.</li>
<li><b>Allocation instrumentation on timeline</b> shows which allocations (blue bars) are still alive.</li>
</ol>
<p>🔵 <b>In Node.js:</b> watch <code>process.memoryUsage()</code> (<code>heapUsed</code>, <code>rss</code>, <code>external</code>), take snapshots with <code>node --inspect</code> + Chrome DevTools, <code>v8.writeHeapSnapshot()</code>, <code>--heapsnapshot-signal=SIGUSR2</code>, or <code>--heapsnapshot-near-heap-limit=2</code> to capture evidence right before an out-of-memory crash.</p>`,
    clues: ['"Memory keeps growing in our SPA after navigating between pages" → listeners/timers/subscriptions not cleaned on unmount, detached DOM', '"Node service RSS grows until the container is OOM-killed" → unbounded cache, global arrays, listeners, or external buffers', '"How would you find a memory leak?" → reproduce, three-snapshot comparison, retainers path, fix, verify flat sawtooth', '"MaxListenersExceededWarning: Possible EventEmitter memory leak detected" → adding a listener per request', '"Difference between shallow and retained size" → own bytes vs bytes freed if this object went away', '"WeakMap vs Map for caching per-object data" → WeakMap does not keep keys alive', '"Heap grows only while DevTools is open" → console.log retention'],
    code: [{ lang: 'js', run: true, title: 'Leak hunt: unbounded cache vs LRU vs WeakMap', code: `
// 1) The classic server leak: memoize by request id in a module-level Map. It never shrinks.
const leakyCache = new Map();
function leakyLookup(id) {
  if (!leakyCache.has(id)) leakyCache.set(id, { id, payload: new Array(100).fill(id) });
  return leakyCache.get(id);
}

// 2) Bounded LRU: Map keeps insertion order, so the first key is the least recently used.
class LRU {
  constructor(limit) { this.limit = limit; this.map = new Map(); }
  get(key, compute) {
    if (this.map.has(key)) {
      const v = this.map.get(key);
      this.map.delete(key); this.map.set(key, v);          // mark as most recently used
      return v;
    }
    const v = compute(key);
    this.map.set(key, v);
    if (this.map.size > this.limit) this.map.delete(this.map.keys().next().value);  // evict oldest
    return v;
  }
}
const lru = new LRU(1000);

// 3) Per-object metadata: WeakMap entries disappear when the key object becomes unreachable.
const meta = new WeakMap();
function tag(obj) { if (!meta.has(obj)) meta.set(obj, { seenAt: Date.now() }); return meta.get(obj); }

for (let i = 0; i < 50000; i++) {          // 50,000 distinct requests
  leakyLookup('req-' + i);
  lru.get('req-' + i, (k) => ({ k, payload: new Array(100).fill(k) }));
  tag({ requestId: i });                    // the object dies right after this line
}
console.log('unbounded Map size:', leakyCache.size, '<- grows forever');
console.log('LRU size:          ', lru.map.size, '<- capped');
console.log('WeakMap: no .size on purpose; its entries are collectable once keys die');
` }, { lang: 'js', run: true, title: 'Listener leaks and the AbortController cleanup pattern', code: `
// EventTarget and AbortController exist in browsers and in Node (global).
const bus = new EventTarget();            // imagine: window, a socket, a global store
let calls = 0;

function mountWidget(bigData) {
  const ac = new AbortController();
  // The listener closes over bigData. While it is registered, bigData is reachable from bus.
  bus.addEventListener('tick', () => { calls++; return bigData.length; }, { signal: ac.signal });
  return () => ac.abort();                // one call removes every listener tied to this signal
}

// Mount and unmount 100 widgets, each holding 1 MB-ish of data.
for (let i = 0; i < 100; i++) {
  const unmount = mountWidget(new Array(125000).fill(i));
  unmount();                              // forget this line and all 100 arrays stay alive
}
bus.dispatchEvent(new Event('tick'));
console.log('listeners still firing after unmount:', calls);   // 0 -> nothing retained
` }, { lang: 'js', title: 'The shared-closure-context leak (pattern only)', code: `
// All closures created in the same scope share ONE Context object.
// If any long-lived closure exists, every variable captured by ANY sibling closure stays alive.
let keep = null;
function replaceThing() {
  const previous = keep;                       // captured by 'unused' below
  const bigString = new Array(1e6).join('*');  // ~1 MB
  function unused() { return previous && bigString; }  // never called, but forces both into the shared Context
  keep = {
    bigString,
    someMethod() { return 1; }                 // long-lived closure -> keeps the shared Context alive
  };
}
// Each call chains: keep.someMethod -> Context -> previous -> old keep -> its Context -> ...
// Fix: do not capture 'previous' at all, or set previous = null at the end of replaceThing.
setInterval(replaceThing, 1000);
` }, { lang: 'bash', title: 'Collecting evidence in Node.js', code: `# Attach Chrome DevTools (chrome://inspect) -> Memory tab -> take heap snapshots
node --inspect server.js

# Write a snapshot when you send a signal (no code change needed)
node --heapsnapshot-signal=SIGUSR2 server.js &
kill -USR2 "$!"                         # $! = pid of the background server; writes Heap.<date>.<pid>.heapsnapshot in the cwd

# Automatically capture up to 2 snapshots when the heap approaches its limit
node --heapsnapshot-near-heap-limit=2 --max-old-space-size=512 server.js

# From code (blocking: the process pauses and needs extra memory while writing)
node -e "require('v8').writeHeapSnapshot()"

# Automated leak detection for web apps in CI (Meta's open-source tool)
npx memlab run --scenario ./scenario.js` }],
    codeTitle: ['Unbounded cache vs LRU vs WeakMap — runnable', 'Listener cleanup with AbortController — runnable', 'Shared closure context leak', 'Node heap snapshot tooling'],
    viz: [{
      title: 'Sawtooth vs staircase: what a leak looks like over time',
      input: '30, 3',
      inputLabel: 'requests, leaked units per request (e.g. 30, 3). Each request also makes 10 units of temporary garbage.',
      gen: function (input) {
        var p = items(input).map(Number);
        if (p.length !== 2 || p.some(isNaN) || p[0] < 6 || p[0] > 60 || p[1] < 0 || p[1] > 20) throw new Error('Format: requests (6-60), leak per request (0-20), e.g. 30, 3');
        var N = p[0], L = p[1], BASE = 20, LIMIT = 200, GC_AT = 80;
        var leaky = [], fixed = [], heapL = BASE, heapF = BASE, retained = 0, frames = [], crashed = false, gcs = 0, thrL = GC_AT, gcNow = false, lastFloor = BASE;
        frames.push(fr('A server handles requests. Each request creates <b>10 units</b> of temporary objects. In the leaky version it also pushes <b>' + L + ' unit(s)</b> into a module-level array that is never cleared. The GC runs when the heap passes ' + GC_AT + ' units (like V8, the trigger point moves up when more memory survives a GC). Heap limit: ' + LIMIT + '.', [cp('const seen = [];                 // module level: lives forever\nfunction handle(req) {\n  const temp = buildResponse(req); // 10 units, garbage after return\n  seen.push(req.body);            // ' + L + ' unit(s) retained: THE LEAK\n  return temp;\n}', { 4: 'bad' }), { type: 'bars', label: 'heap (leaky)', values: [BASE] }, { type: 'bars', label: 'heap (fixed: no seen.push)', values: [BASE] }]));
        for (var r = 1; r <= N && !crashed; r++) {
          heapL += 10 + L; heapF += 10; retained += L;
          if (heapL >= thrL) { heapL = BASE + retained; lastFloor = heapL; gcNow = true; gcs++; thrL = Math.min(LIMIT, Math.max(GC_AT, heapL + 40)); }
          if (heapF >= GC_AT) { heapF = BASE; }
          leaky.push(heapL); fixed.push(heapF);
          if (heapL >= LIMIT) crashed = true;
          if (r % 2 === 0 || crashed || r === N) {
            frames.push(fr('After request ' + r + ': leaky heap = <b>' + heapL + '</b>, fixed heap = <b>' + heapF + '</b>. ' + (gcNow ? 'A GC ran since the last picture: the leaky heap could only drop to its floor of <b>' + lastFloor + '</b> (the floor keeps rising: ' + (lastFloor - BASE) + ' units were still reachable through <code>seen</code>).' : 'Temporary garbage is piling up until the next GC.') + (crashed ? ' <span class="c-r">The heap limit is reached even right after GC: "JavaScript heap out of memory". The process crashes.</span>' : ''), [{ type: 'bars', label: 'heap (leaky): staircase', values: leaky.slice(), hl: one(leaky.length - 1, crashed ? 'bad' : gcNow ? 'sel' : 'cur') }, { type: 'bars', label: 'heap (fixed): sawtooth', values: fixed.slice(), hl: one(fixed.length - 1, 'ok') }, vp({ request: r, 'retained by seen[]': retained, GCs: gcs }, { 'retained by seen[]': L ? 'bad' : 'ok' }, 'Counters')]));
            gcNow = false;
          }
        }
        frames.push(fr(L === 0 ? 'With 0 leak per request both lines are the same healthy <b>sawtooth</b>: memory rises with garbage, the GC cuts it back to the same floor.' : 'Read the shapes: the fixed version is a <b>sawtooth</b> with a flat floor. The leaky version is a <b>staircase</b>: every GC returns to a higher floor. This is the first thing to look for in a memory graph (DevTools Performance monitor, Grafana, <code>--trace-gc</code>). A rising floor after GCs = something is still reachable.', [{ type: 'bars', label: 'leaky', values: leaky.slice() }, { type: 'bars', label: 'fixed', values: fixed.slice() }, { type: 'table', label: 'How to tell', columns: ['pattern', 'floor after each GC', 'verdict'], rows: [['sawtooth', 'flat', H.c('g', 'healthy')], ['staircase', 'rising', H.c('r', 'leak')], ['one big step, then flat', 'jumped once', 'cache warm-up / lazy init (probably fine)']] }]));
        return frames;
      }
    }, {
      title: 'Retainer path: why is the closed modal still in memory?',
      gen: function () {
        var N = [bx('WIN', 'Window (GC root)', 12, 8, 18), bx('DOC', 'document', 40, 8, 14), bx('LST', 'resize listeners', 12, 32, 18), bx('FN', 'onResize closure', 40, 32, 18), bx('CTX', 'Context {modal, rows}', 68, 32, 22), bx('DIV', 'div.modal (DOM)', 68, 8, 18), bx('ROWS', 'rows: 50,000 objects', 92, 32, 16)];
        var E_ALL = [['WIN', 'DOC'], ['DOC', 'DIV', 'child'], ['WIN', 'LST'], ['LST', 'FN'], ['FN', 'CTX', 'context'], ['CTX', 'DIV', 'modal'], ['CTX', 'ROWS', 'rows']];
        function g(edges, hl, ehl, tags, label) { return { type: 'graph', label: label || 'Heap', directed: true, height: 44, nodes: N, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var code = 'function openModal(rows) {\n  const modal = document.createElement("div");\n  document.body.append(modal);\n  window.addEventListener("resize", function onResize() {\n    layout(modal, rows);\n  });\n  return () => modal.remove();   // close: removes from page only\n}';
        var noDoc = E_ALL.filter(function (e) { return !(e[0] === 'DOC' && e[1] === 'DIV'); });
        return [
          fr('<code>openModal(rows)</code> creates a modal, adds it to the page, and registers a <code>resize</code> listener whose closure uses <code>modal</code> and <code>rows</code>. Both are therefore stored in the closure\'s heap <b>Context</b>.', [cp(code, { 2: 'cur', 3: 'cur', 4: 'cur', 5: 'cur' }), g(E_ALL, { WIN: 'sel', DIV: 'ok', ROWS: 'ok' })]),
          fr('The user closes the modal: <code>modal.remove()</code> cuts the <b>document → div</b> edge. The page looks clean. But the listener was never removed, so <b>Window → listeners → onResize → Context → div</b> still exists. The div is now a <b>detached DOM node</b>, and 50,000 rows are retained with it.', [cp(code, { 7: 'bad' }), g(noDoc, { DIV: 'bad', ROWS: 'bad' }, {}, { DIV: 'detached' })]),
          fr('Hunt step 1: open DevTools → Memory → take a heap snapshot, open/close the modal 5 times, take another. In <b>Comparison</b> view, <code>Detached HTMLDivElement</code> shows <b>+5</b> and <code>Object</code> +250,000. Typing "Detached" in the class filter lists them directly.', [{ type: 'table', label: 'Snapshot 2 vs 1 (Comparison view)', columns: ['Constructor', '# New', '# Deleted', '# Delta', 'Size Delta'], rows: [['Detached HTMLDivElement', '5', '0', '+5', '+1.1 kB'], ['Object', '250,012', '12', '+250,000', '+9.6 MB'], ['(closure)', '9', '4', '+5', '+0.4 kB'], ['(string)', '310', '305', '+5', '+0.2 kB']], hl: { 0: 'bad', 1: 'bad' } }]),
          fr('Hunt step 2: click one detached div and read the <b>Retainers</b> panel from the bottom up: who holds it? The first entry that is your code (<code>onResize</code>) is the culprit. "Distance" = number of hops from a GC root.', [{ type: 'table', label: 'Retainers of Detached HTMLDivElement', columns: ['retainer', 'via', 'distance'], rows: [['Context (onResize scope)', 'modal', '4'], ['onResize()', 'context', '3'], ['listener list (resize)', '[0]', '2'], ['Window', 'event listeners', '1 (GC root)']], hl: { 1: 'sel' } }, g(noDoc, { DIV: 'bad', CTX: 'cur', FN: 'sel', LST: 'cur', WIN: 'cur' }, { 'WIN-LST': 'bad', 'LST-FN': 'bad', 'FN-CTX': 'bad', 'CTX-DIV': 'bad' }, {}, 'Retainer path (red edges)')]),
          fr('Shallow vs retained size: the div itself is small (<b>shallow size</b> ≈ 200 bytes), but its <b>retained size</b> (everything freed if it went away) is huge because the Context also holds <code>rows</code>. Sort by retained size to find what matters.', [{ type: 'table', label: 'Sizes', columns: ['object', 'shallow size', 'retained size'], rows: [['div.modal', '~0.2 kB', '~0.2 kB'], ['Context {modal, rows}', '~0.05 kB', H.c('r', '~1.9 MB')], ['onResize closure', '~0.07 kB', H.c('r', '~1.9 MB')]], hl: { 1: 'bad' } }]),
          fr('<b>Fix:</b> remove the listener when closing. Easiest: pass an <code>AbortController</code> signal to <code>addEventListener</code> and abort on close. The Window → listener edge disappears, nothing reaches the Context, and the next GC frees the closure, the div and the rows.', [cp('function openModal(rows) {\n  const modal = document.createElement("div");\n  document.body.append(modal);\n  const ac = new AbortController();\n  window.addEventListener("resize", () => layout(modal, rows), { signal: ac.signal });\n  return () => { ac.abort(); modal.remove(); };\n}', { 4: 'ok', 5: 'ok', 6: 'ok' }), g([['WIN', 'DOC']], { WIN: 'sel', DIV: 'done', ROWS: 'done', CTX: 'done', FN: 'done', LST: 'done' }, {}, { DIV: 'collectable', ROWS: 'collectable' })]),
          fr('Verify: repeat open/close 5 times, force GC (trash-can icon), snapshot again. <code>Detached HTMLDivElement</code> delta is now <b>0</b> and the memory graph is a flat sawtooth. Always verify the fix with the same measurement that found the leak.', [{ type: 'table', label: 'After the fix', columns: ['Constructor', '# Delta'], rows: [['Detached HTMLDivElement', '0'], ['Object', '+12'], ['(closure)', '0']], hl: { 0: 'ok' } }])
        ];
      }
    }, {
      title: 'The three-snapshot technique: separate leaks from noise',
      input: 'Array: 120,180,240 | Listener: 10,20,30 | Detached HTMLDivElement: 0,40,80 | String: 900,950,910 | Promise: 5,30,6',
      inputLabel: 'Constructor: count in snapshot1,snapshot2,snapshot3 groups separated by | (max 8)',
      gen: function (input) {
        var groups = String(input || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!groups.length || groups.length > 8) throw new Error('Give 1 to 8 groups like: Array: 10,20,30');
        var rows = groups.map(function (g) {
          var m = g.match(/^([^:]+):\s*(.+)$/);
          if (!m) throw new Error('Use Name: a,b,c for each group');
          var c = items(m[2]).map(Number);
          if (c.length !== 3 || c.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Each group needs 3 non-negative counts, e.g. Array: 10,20,30');
          return { name: m[1].trim(), c: c };
        });
        var frames = [];
        frames.push(fr('Recipe: <b>(1)</b> load the page, warm up, take <b>snapshot 1</b> (baseline). <b>(2)</b> perform the suspect action N times, take <b>snapshot 2</b>. <b>(3)</b> perform it N more times, take <b>snapshot 3</b>. DevTools forces a GC before each snapshot, so only <b>reachable</b> objects are counted.', [{ type: 'table', label: 'Snapshot 1 (baseline)', columns: ['constructor', 'count'], rows: rows.map(function (r) { return [esc(r.name), String(r.c[0])]; }) }]));
        frames.push(fr('Snapshot 2 after the first batch of actions. Some things grew. Growth alone proves nothing: caches warm up, lazy modules load, framework pools fill.', [{ type: 'table', label: 'Snapshot 1 → 2', columns: ['constructor', 's1', 's2', 'Δ1'], rows: rows.map(function (r) { return [esc(r.name), String(r.c[0]), String(r.c[1]), (r.c[1] - r.c[0] >= 0 ? '+' : '') + (r.c[1] - r.c[0])]; }) }]));
        var verdicts = rows.map(function (r) {
          var d1 = r.c[1] - r.c[0], d2 = r.c[2] - r.c[1];
          if (d1 > 0 && d2 > 0 && Math.abs(d1 - d2) <= Math.max(2, 0.25 * Math.max(d1, d2))) return 'LEAK suspect (steady growth)';
          if (d1 > 0 && d2 > 0) return 'growing (check)';
          if (d1 > 0 && d2 <= 0) return 'warm-up / transient';
          return 'stable';
        });
        var hl = {}; verdicts.forEach(function (v, i) { hl[i] = v.indexOf('LEAK') === 0 ? 'bad' : v.indexOf('growing') === 0 ? 'cur' : 'ok'; });
        frames.push(fr('Snapshot 3 after the second batch. Now compare <b>both</b> deltas. A real leak grows by about the <b>same amount per batch</b> (each action leaks the same objects). Things that grew once and then stopped or fell back are warm-up or transient objects.', [{ type: 'table', label: 'Three-snapshot comparison', columns: ['constructor', 's1', 's2', 's3', 'Δ1', 'Δ2', 'verdict'], rows: rows.map(function (r, i) { return [esc(r.name), String(r.c[0]), String(r.c[1]), String(r.c[2]), String(r.c[1] - r.c[0]), String(r.c[2] - r.c[1]), verdicts[i]]; }), hl: hl }]));
        var suspects = rows.filter(function (r, i) { return verdicts[i].indexOf('LEAK') === 0; });
        frames.push(fr(suspects.length ? 'Suspects ranked by growth per batch: <b>' + suspects.map(function (r) { return esc(r.name); }).join(', ') + '</b>. Next step: in snapshot 3, use the "Objects allocated between snapshot 1 and 2" filter so you see only objects born during the first batch that are <b>still alive</b> after the second, then open their Retainers.' : 'No steady growth: this action does not leak (or N is too small to see it; repeat more times).', [{ type: 'bars', label: 'growth per batch (Δ2) for each constructor', values: rows.map(function (r) { return Math.max(0, r.c[2] - r.c[1]); }), idxLabels: rows.map(function (r) { return r.name.slice(0, 8); }), hl: hl }]));
        frames.push(fr('Why three snapshots and not two? With two you cannot tell a <b>one-time</b> increase (a cache that filled up once, a lazily created singleton) from a <b>per-action</b> increase. The second interval is your control experiment. Tip: make N a distinctive number (like 7) so leaked counts jump out as multiples of 7.', [tx('Workflow: reproduce → 3 snapshots → filter "allocated between 1 and 2" → Retainers → fix → re-measure.')]));
        return frames;
      }
    }],
    examples: [
      { title: 'React/Vue component that leaks an interval', html: `<p>A dashboard widget starts <code>setInterval(fetchStats, 5000)</code> on mount. Navigating away unmounts the component, but the interval keeps running (timers are GC roots), and its callback closes over the component's state and props. After 20 navigations, 20 intervals are firing and 20 copies of stale state are retained. <b>Fix:</b> return a cleanup from <code>useEffect</code> (or <code>onUnmounted</code>) that calls <code>clearInterval</code>.</p>`, code: { lang: 'js', run: true, code: `function startPolling(fn, ms) {
  const id = setInterval(fn, ms);
  return () => clearInterval(id);          // the cleanup a component must call on unmount
}
let ticks = 0;
const stop = startPolling(() => { ticks++; }, 10);
setTimeout(() => {
  stop();                                  // without this, the process would never exit
  const seen = ticks;
  setTimeout(() => console.log('ticks before stop:', seen, ' ticks after stop:', ticks - seen), 50);
}, 55);` } },
      { title: 'Detached nodes kept by a "helpful" cache', html: `<p>A table component caches row elements in <code>const rowCache = new Map()</code> keyed by row id to speed up re-renders. When the table re-renders with new data, old rows are removed from the DOM but stay in <code>rowCache</code>. The Memory panel shows thousands of <b>Detached HTMLTableRowElement</b>. <b>Fix:</b> clear stale entries when data changes, or key the cache by the row <i>object</i> in a <code>WeakMap</code> so entries die with the data.</p>` },
      { title: 'Node: a listener per request (MaxListenersExceededWarning)', html: `<p>Middleware does <code>db.on('reconnect', () =&gt; req.log('reconnected'))</code> for every request. <code>db</code> lives forever, so every request object (with its body and headers) is retained by a closure. Node prints <code>MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 reconnect listeners added</code>. That warning is a gift: it points straight at the leak. <b>Fix:</b> register once at startup, or remove the listener in a <code>finally</code>/<code>res.on('close')</code> handler.</p>` },
      { title: 'Promise.race against a promise that never settles', html: `<p>A loop runs <code>await Promise.race([shutdownPromise, nextJob()])</code> thousands of times. <code>shutdownPromise</code> stays pending for the life of the process, and every <code>race</code> call adds a new reaction (a callback that holds the race's result promise) to it. Those reactions are never released until <code>shutdownPromise</code> settles: a slow, invisible leak. <b>Fix:</b> subscribe to shutdown once (an <code>AbortSignal</code> or a flag), and race only against promises that settle.</p>` },
      { title: 'console.log keeps objects alive while DevTools is open', html: `<p>Logging a large object in the browser lets you expand it later in the console, so DevTools keeps a reference to it. A debug log inside a render loop can therefore look like a leak that "disappears when DevTools is closed". Remove debug logs from hot paths, and log identifiers or summaries (<code>console.log(items.length)</code>) instead of whole objects.</p>` }
    ],
    deepDive: `<p>🟣 <b>Reading a heap snapshot like an expert.</b> A snapshot is a graph of every object and edge. <b>Shallow size</b> = the object's own bytes. <b>Retained size</b> = bytes that would be freed if this object were deleted, computed with the <b>dominator tree</b> (object A dominates B if every path from the roots to B goes through A). <b>Distance</b> = shortest hop count from a root; leaked objects often have unusually large distance values. Names in parentheses are internal: <code>(closure)</code>, <code>(string)</code>, <code>(array)</code>, <code>(compiled code)</code>, <code>(system)</code>. A "Context" node shows the variables a closure scope keeps alive.</p>
<p>🟣 <b>Tooling beyond snapshots.</b> <b>Allocation instrumentation on timeline</b> records stack traces for allocations and shows which are still alive (good for finding the line that allocates the leaked object). <b>Allocation sampling</b> is low-overhead and safe-ish for production profiling. <code>performance.measureUserAgentSpecificMemory()</code> (in cross-origin-isolated pages) gives real-user memory telemetry. In Node, <code>v8.getHeapStatistics()</code> and <code>v8.getHeapSpaceStatistics()</code> show per-space usage; <b>memlab</b> automates "do action, undo action, check for leaked objects" in CI with a headless browser.</p>
<p>🟣 <b>Production cautions.</b> Writing a heap snapshot pauses the process (seconds for big heaps) and needs roughly as much extra memory as the heap itself, which can trigger the OOM you are investigating. Take snapshots on one instance removed from the load balancer, or rely on <code>--heapsnapshot-near-heap-limit</code>. Snapshots contain <b>user data</b> (strings, tokens, PII): treat them as sensitive files.</p>
<p>🟣 <b>Subtle retainers.</b> Sliced strings retaining a huge parent string; <code>Function.prototype.bind</code> or arrow functions capturing <code>this</code>; <code>AsyncLocalStorage</code> stores living as long as async resources do; source-map-heavy error stacks; module-level <code>require</code> caches; global event buses in micro-frontends; and in V8, the shared Context: closures created in the same scope share one Context, so one long-lived closure keeps <b>all</b> captured variables of its siblings alive.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated components often forget cleanup (effects without return functions, subscriptions without unsubscribe) and generate memoization helpers with unbounded caches. These leaks pass every unit test. <b>Use AI as a partner:</b> paste a Retainers path or the Comparison table and ask <code>"Which line of my code creates this retaining path? Propose a fix and a test that proves it"</code>; ask it to write a <b>memlab</b> scenario or a Node script that repeats an action 1,000 times and asserts <code>heapUsed</code> stays flat after GC (run with <code>--expose-gc</code>). <b>Where AI goes wrong:</b> blaming "the GC", suggesting <code>global.gc()</code> or larger heap limits as fixes, or claiming WeakRef makes caches safe without explaining that cleanup timing is unspecified. <b>What you must still own:</b> the reachability mental model, the reproduce → snapshot → retainers → fix → verify loop, and the judgement to distinguish leaks from caches doing their job.</p>`,
    problems: [{
      title: 'Find the Retainer Path (Shortest Path from a GC Root)',
      level: 'Medium', tags: ['graph', 'BFS', 'memory tooling'], companies: ['Google', 'Meta', 'Figma'],
      statement: `<p>A heap snapshot is given as <code>edges</code> (pairs <code>[from, to, name]</code>), a list of <code>roots</code>, and a <code>target</code> object id. Return the <b>shortest retainer path</b> from any root to the target as a readable string like <code>Window --listeners--&gt; L --[0]--&gt; onResize --context--&gt; Ctx --modal--&gt; div</code>, or <code>null</code> if the target is unreachable (it would be collected). This is what DevTools' Retainers panel shows first.</p>`,
      constraints: `<p>Up to 10<sup>5</sup> objects and 3·10<sup>5</sup> edges. O(V + E).</p>`,
      example: `<p>Edges: <code>Window→Doc (document)</code>, <code>Window→L (listeners)</code>, <code>L→onResize ([0])</code>, <code>onResize→Ctx (context)</code>, <code>Ctx→div (modal)</code>. Roots: <code>[Window]</code>, target <code>div</code>.</p><p>Output: <code>Window --listeners--&gt; L --[0]--&gt; onResize --context--&gt; Ctx --modal--&gt; div</code> (distance 4). The <code>Doc</code> branch no longer reaches <code>div</code> because the modal was removed from the page.</p>`,
      brute: { why: `<p>Enumerate <b>every</b> path from every root with DFS and keep the shortest one that ends at the target. The number of simple paths can be exponential in a heap graph (many objects reference each other), so this explodes on real snapshots.</p>`, code: `function retainerPathBrute(edges, roots, target) {
  const out = new Map();
  for (const [a, b, name] of edges) { if (!out.has(a)) out.set(a, []); out.get(a).push([b, name]); }
  let best = null;
  function dfs(node, path, onPath) {                 // explores ALL simple paths: exponential
    if (node === target) { if (!best || path.length < best.length) best = path.slice(); return; }
    for (const [next, name] of out.get(node) || []) {
      if (onPath.has(next)) continue;
      onPath.add(next); path.push([name, next]);
      dfs(next, path, onPath);
      path.pop(); onPath.delete(next);
    }
  }
  for (const r of roots) dfs(r, [], new Set([r]));
  return best;
}` },
      mcq: { q: 'Why does BFS (not DFS) give the path DevTools shows first?', options: ['BFS from all roots visits objects in order of distance, so the first time it reaches the target is via a shortest path', 'DFS cannot handle cycles', 'BFS uses less memory than DFS', 'DevTools sorts paths alphabetically'], answer: 0, explain: 'Multi-source BFS explores distance 1, then 2, ... Recording the parent edge when an object is first discovered yields a shortest path, which is also how the "Distance" column is computed.' },
      hints: [`<p>Hint 1: This is "shortest path in an unweighted graph from many sources": multi-source BFS, starting with all roots in the queue at distance 0.</p>`, `<p>Hint 2: When you discover a node for the first time, store <code>parent[node] = [prev, edgeName]</code>. Never overwrite it: the first discovery is the shortest.</p>`, `<p>Hint 3: Stop when the target is dequeued (or discovered), then walk parents back to a root and reverse. If the target is never discovered, return null: it is garbage. Use an index pointer instead of <code>queue.shift()</code> for O(1) dequeues.</p>`],
      tests: {"sig":"string string string -> string","fn":"chk","harness":{"js":"\nfunction chk(edgesJson, rootsJson, target) {\n  if (edgesJson === 'CHAIN') { var e = []; for (var i = 0; i < 99999; i++) e.push(['n' + i, 'n' + (i + 1), 'e']); var p = retainerPath(e, ['n0'], 'n99999'); return [p.split('-->').length - 1, p.slice(0, 12), p.slice(-6)]; }\n  if (edgesJson === 'WIDE') { var w = []; for (var j = 0; j < 300000; j++) w.push(['r', 'c' + j, 'k']); w.push(['c150000', 't', 'deep']); return retainerPath(w, ['r'], 't'); }\n  return retainerPath(JSON.parse(edgesJson), JSON.parse(rootsJson), target);\n}"},"cases":[[["[[\"Window\",\"Doc\",\"document\"],[\"Window\",\"L\",\"listeners\"],[\"L\",\"onResize\",\"[0]\"],[\"onResize\",\"Ctx\",\"context\"],[\"Ctx\",\"div\",\"modal\"],[\"Ctx\",\"rows\",\"rows\"],[\"div\",\"Ctx\",\"back\"]]","[\"Window\"]","div"],"Window --listeners--> L --[0]--> onResize --context--> Ctx --modal--> div"],[["[[\"Window\",\"Doc\",\"document\"],[\"L\",\"onResize\",\"[0]\"],[\"onResize\",\"Ctx\",\"context\"],[\"Ctx\",\"div\",\"modal\"]]","[\"Window\"]","div"],null],[["[]","[\"R\"]","R"],"R"],[["[[\"A\",\"x\",\"e1\"],[\"x\",\"t\",\"e2\"],[\"B\",\"t\",\"direct\"]]","[\"A\",\"B\"]","t"],"B --direct--> t"],[["[[\"A\",\"B\",\"ab\"],[\"B\",\"A\",\"ba\"],[\"B\",\"C\",\"bc\"]]","[\"A\"]","C"],"A --ab--> B --bc--> C"],[["[[\"A\",\"B\",\"ab\"]]","[\"A\"]","Z"],null],[["[[\"A\",\"B\",\"ab\"],[\"A\",\"C\",\"ac\"],[\"C\",\"B\",\"cb\"]]","[\"A\"]","B"],"A --ab--> B"],[["[[\"A\",\"B\",\"long1\"],[\"B\",\"C\",\"long2\"],[\"C\",\"T\",\"long3\"],[\"A\",\"T\",\"short\"]]","[\"A\"]","T"],"A --short--> T"],[["CHAIN","",""],[99999,"n0 --e--> n1","n99999"]],[["WIDE","",""],"r --k--> c150000 --deep--> t"]]},
      solution: {
        approach: `<p>Build an adjacency list once, run multi-source BFS from all roots recording the first parent edge of each object, then reconstruct the path from the target back to its root. Cycles are harmless because each object is discovered once.</p>`,
        code: { lang: 'js', run: true, code: `function retainerPath(edges, roots, target) {
  const out = new Map();
  for (const [a, b, name] of edges) { if (!out.has(a)) out.set(a, []); out.get(a).push([b, name]); }
  const parent = new Map();                    // node -> [previous node, edge name]
  const seen = new Set(roots);
  const queue = [...roots];
  for (let head = 0; head < queue.length; head++) {   // index pointer: O(1) dequeue
    const node = queue[head];
    if (node === target) break;
    for (const [next, name] of out.get(node) || []) {
      if (seen.has(next)) continue;
      seen.add(next);
      parent.set(next, [node, name]);
      queue.push(next);
    }
  }
  if (!seen.has(target)) return null;           // unreachable -> would be garbage collected
  const parts = [target];
  let cur = target;
  while (parent.has(cur)) { const [prev, name] = parent.get(cur); parts.push(' --' + name + '--> '); parts.push(prev); cur = prev; }
  return parts.reverse().join('');
}

const edges = [
  ['Window', 'Doc', 'document'], ['Window', 'L', 'listeners'], ['L', 'onResize', '[0]'],
  ['onResize', 'Ctx', 'context'], ['Ctx', 'div', 'modal'], ['Ctx', 'rows', 'rows'], ['div', 'Ctx', 'back']
];
console.log(retainerPath(edges, ['Window'], 'div'));
console.log(retainerPath(edges.filter((e) => e[1] !== 'L'), ['Window'], 'div'));   // listener removed -> null` },
        dry: { head: ['dequeue', 'distance', 'newly discovered (parent edge)', 'queue after'], rows: [['Window', '0', 'Doc (document), L (listeners)', '[Doc, L]'], ['Doc', '1', '-', '[L]'], ['L', '1', 'onResize ([0])', '[onResize]'], ['onResize', '2', 'Ctx (context)', '[Ctx]'], ['Ctx', '3', 'div (modal), rows (rows)', '[div, rows]'], ['div', '4', H.c('g', 'target reached'), 'walk parents back']] },
        complexity: `<p>Time O(V + E) for building the adjacency list and the BFS; space O(V + E).</p>`,
        followUps: ['Return the top 3 distinct retainer paths (k shortest paths)', 'Ignore "weak" edges (WeakMap keys, internal weak refs) as DevTools does', 'Compute retained sizes with a dominator tree (see the Hard practice problem)']
      }
    }]
  });

  /* ================= PRACTICE: Easy ================= */
  practice.push({
    title: 'Leak Hunt: The Forgotten Interval',
    level: 'Easy', tags: ['memory leak', 'timers', 'cleanup'], companies: ['Atlassian', 'Spotify', 'Zomato'],
    statement: `<p>A widget polls a server every <code>ms</code> milliseconds while it is on screen. The current code starts a <code>setInterval</code> in <code>mount()</code> and never stops it, so after many navigations dozens of intervals keep running and each keeps the widget's state alive. Write <code>createPoller(fetchFn, ms)</code> returning <code>{ start, stop, isRunning }</code> such that <code>start</code> is idempotent (calling it twice does not create two intervals) and <code>stop</code> clears the timer and drops references to the widget's data.</p>`,
    constraints: `<p>Must work in the browser and in Node. After <code>stop()</code>, no further calls to <code>fetchFn</code> may happen.</p>`,
    example: `<p><code>const p = createPoller(f, 10); p.start(); p.start(); /* 35 ms later */ p.stop();</code> → <code>f</code> ran about 3 times (not 6), and never runs again. <code>p.isRunning()</code> → <code>false</code>.</p>`,
    brute: { why: `<p>The leaky version: each mount creates a new interval and nothing ever clears it. Timers are <b>GC roots</b> while active, so the callback, its closure, and everything it captures (props, state, DOM nodes) stay reachable forever. Calling <code>mount</code> twice also doubles the polling traffic.</p>`, code: `function mountWidget(state, fetchFn) {
  setInterval(() => {               // never cleared: a root that lives forever
    state.data = fetchFn();         // keeps 'state' (and everything it references) alive
  }, 1000);
}` },
    mcq: { q: 'Why does an un-cleared <code>setInterval</code> keep the widget\'s state in memory?', options: ['Active timers are GC roots and their callbacks close over the state', 'setInterval copies the whole heap', 'The GC never runs while timers exist', 'Intervals are stored in localStorage'], answer: 0, explain: 'The engine/runtime keeps a reference to every active timer callback (it must call it later). The closure keeps its captured variables reachable.' },
    hints: [`<p>Hint 1: Keep the interval id in a variable owned by the poller. <code>null</code> means "not running".</p>`, `<p>Hint 2: <code>start()</code> returns early if the id is not null; <code>stop()</code> calls <code>clearInterval(id)</code> and sets the id back to null.</p>`, `<p>Hint 3: For extra safety, set the captured function reference to null on stop so even an accidental extra reference to the poller does not retain heavy data. In React, call <code>stop</code> from the <code>useEffect</code> cleanup.</p>`],
    tests: {"sig":"string int int -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, ms, advance) {\n  var timers = [], nextId = 1, setCalls = 0, cleared = 0, now = 0;\n  var realSet = globalThis.setInterval, realClear = globalThis.clearInterval;\n  globalThis.setInterval = function (fn, every) { setCalls++; var t = { id: nextId++, fn: fn, every: every, due: now + every, on: true }; timers.push(t); return t.id; };\n  globalThis.clearInterval = function (id) { cleared++; timers.forEach(function (t) { if (t.id === id) t.on = false; }); };\n  var tick = function (total) { var end = now + total; while (true) { var next = null; timers.forEach(function (t) { if (t.on && t.due <= end && (!next || t.due < next.due)) next = t; }); if (!next) break; now = next.due; next.due += next.every; next.fn(); } now = end; };\n  try {\n    var calls = 0, p = createPoller(function () { calls++; }, ms);\n    if (kind === 'twice') { p.start(); p.start(); tick(advance); p.stop(); var atStop = calls; tick(advance); return [calls, atStop, setCalls, p.isRunning(), timers.filter(function (t) { return t.on; }).length]; }\n    if (kind === 'running') { var a = p.isRunning(); p.start(); var b = p.isRunning(); p.stop(); return [a, b, p.isRunning()]; }\n    if (kind === 'stopFirst') { p.stop(); p.stop(); return [calls, setCalls, p.isRunning()]; }\n    if (kind === 'interval') { p.start(); return [timers[0].every, setCalls]; }\n    if (kind === 'neverCalledEarly') { p.start(); tick(advance); return calls; }\n    if (kind === 'noCallsAfterStop') { p.start(); tick(advance); p.stop(); tick(1000); return calls; }\n  } finally { globalThis.setInterval = realSet; globalThis.clearInterval = realClear; }\n}"},"cases":[[["twice",10,35],[3,3,1,false,0]],[["running",5,0],[false,true,false]],[["stopFirst",5,0],[0,0,false]],[["interval",250,0],[250,1]],[["neverCalledEarly",10,9],0],[["neverCalledEarly",10,10],1],[["noCallsAfterStop",10,25],2],[["twice",1,100],[100,100,1,false,0]]]},
    solution: {
      approach: `<p>Own the timer handle and make start/stop idempotent. This turns "a timer that lives forever" into "a timer whose lifetime equals the widget's lifetime", which is the whole fix for this leak class (the same applies to <code>requestAnimationFrame</code>, WebSocket handlers, and store subscriptions).</p>`,
      code: { lang: 'js', run: true, code: `function createPoller(fetchFn, ms) {
  let id = null;
  let fn = fetchFn;                      // dropped on stop so heavy closures can be collected
  return {
    start() {
      if (id !== null) return;           // idempotent: never two intervals
      id = setInterval(() => fn && fn(), ms);
    },
    stop() {
      if (id === null) return;
      clearInterval(id);
      id = null;
      fn = null;                         // release the reference to the widget's data
    },
    isRunning() { return id !== null; }
  };
}

let calls = 0;
const p = createPoller(() => { calls++; }, 10);
p.start();
p.start();                               // ignored
setTimeout(() => {
  p.stop();
  const atStop = calls;
  setTimeout(() => {
    console.log('calls before stop:', atStop, '| calls after stop:', calls - atStop, '| running:', p.isRunning());
  }, 40);
}, 35);` },
      dry: { head: ['time', 'event', 'id', 'calls'], rows: [['0 ms', 'start()', 'set', '0'], ['0 ms', 'start() again', 'unchanged (early return)', '0'], ['10/20/30 ms', 'tick', 'set', '1 → 3'], ['35 ms', 'stop()', 'null', '3'], ['75 ms', 'check', 'null', H.c('g', '3 (no new calls)')]] },
      complexity: `<p>O(1) per start/stop. Memory: one timer while running, zero after stop.</p>`,
      followUps: ['Pause polling while the tab is hidden (document.visibilityState)', 'Use setTimeout chaining so a slow request never overlaps the next one', 'Add an AbortController so an in-flight fetch is cancelled on stop']
    }
  });

  practice.push({
    title: 'Which Is Faster? One Shape vs Ad-hoc Objects',
    level: 'Easy', tags: ['hidden classes', 'inline caches', 'performance'], companies: ['Google', 'Microsoft', 'Canva'],
    statement: `<p>A charting library creates point objects in several places. Some code builds <code>{ x, y }</code>, some <code>{ y, x }</code>, some adds <code>label</code> only when present. The hot function <code>pathLength(points)</code> reads <code>p.x</code> and <code>p.y</code> millions of times. Rewrite point creation so every point has the <b>same hidden class</b>, and explain why that is faster.</p>`,
    constraints: `<p>Up to 10<sup>6</sup> points; behaviour (results) must not change.</p>`,
    example: `<p>Before: 3 creation styles → 3+ hidden classes → <code>p.x</code> is polymorphic. After: one <code>Point</code> class with fields <code>x, y, label</code> always initialised in the same order (label = null when absent) → monomorphic. Same total length, faster loop.</p>`,
    brute: { why: `<p>Mixed creation styles produce several hidden classes for "the same" kind of object. Every property access in the hot loop must compare against several maps (polymorphic) or fall back to the generic stub cache (megamorphic), and TurboFan cannot emit a single fixed-offset load.</p>`, code: `function makePointsAdHoc(n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    if (i % 3 === 0) pts.push({ x: i, y: i * 2 });
    else if (i % 3 === 1) pts.push({ y: i * 2, x: i });          // different key order
    else { const p = { x: i }; p.y = i * 2; if (i % 2) p.label = 'p' + i; pts.push(p); }  // conditional key
  }
  return pts;
}` },
    mcq: { q: '<code>{x:1, y:2}</code> and <code>{y:2, x:1}</code> are passed to the same hot function. What happens to the IC for <code>p.x</code>?', options: ['It becomes polymorphic: two hidden classes with x at different slots', 'Nothing: they are the same object shape', 'It throws a TypeError', 'It becomes megamorphic immediately'], answer: 0, explain: 'Key order defines the transition path, so these are different hidden classes. Two maps → polymorphic (up to 4), more than 4 → megamorphic.' },
    hints: [`<p>Hint 1: Hidden classes depend on <b>which</b> keys are added and in <b>what order</b>. Make both identical for every point.</p>`, `<p>Hint 2: A class with declared fields (<code>class Point { x; y; label = null; }</code>) or a single factory function guarantees one order.</p>`, `<p>Hint 3: Represent "no label" as <code>null</code>, not a missing key. Benchmark fairly: two separate functions so each has its own feedback, warm up, and print a result so work is not eliminated.</p>`],
    tests: {"sig":"string int -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, n) {\n  var shapes = function (pts) { return new Set(pts.map(function (p) { return Object.keys(p).join(); })).size; };\n  if (kind === 'goodShapes') return shapes(makePoints(n));\n  if (kind === 'badShapes') return shapes(makePointsAdHoc(n));\n  if (kind === 'labels') return makePoints(n).map(function (p) { return p.label; });\n  if (kind === 'keys') return Object.keys(makePoints(1)[0]);\n  if (kind === 'len') return lenA(makePoints(n));\n  if (kind === 'lenAdHoc') return lenB(makePointsAdHoc(n));\n  if (kind === 'xy') { var p = makePoints(n); return [p[n - 1].x, p[n - 1].y]; }\n  if (kind === 'sameLen') return Math.abs(lenA(makePoints(n)) - lenB(makePointsAdHoc(n))) < 1e-6 * Math.max(1, lenA(makePoints(n)));\n}"},"cases":[[["goodShapes",1000],1],[["badShapes",1000],3],[["labels",7],[null,null,null,null,null,"p5",null]],[["labels",12],[null,null,null,null,null,"p5",null,null,null,null,null,"p11"]],[["keys",1],["x","y","label"]],[["len",5],8.94427190999916],[["len",1],0],[["len",0],0],[["xy",10],[9,18]],[["sameLen",100000],true],[["goodShapes",1000000],1]],"cmp":"float"},
    solution: {
      approach: `<p>Funnel all creation through one constructor with every field initialised in the same order. The loop then sees one hidden class, each <code>p.x</code> is a monomorphic IC (one compare + one load), and the optimizer can inline the loads. Results are identical; only the memory layout changed.</p>`,
      code: { lang: 'js', run: true, code: `class Point {
  x; y; label = null;                      // declared fields -> one shape for every Point
  constructor(x, y, label) { this.x = x; this.y = y; if (label !== undefined) this.label = label; }
}
function makePoints(n) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(new Point(i, i * 2, i % 3 === 2 && i % 2 ? 'p' + i : undefined));
  return pts;
}
function makePointsAdHoc(n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    if (i % 3 === 0) pts.push({ x: i, y: i * 2 });
    else if (i % 3 === 1) pts.push({ y: i * 2, x: i });
    else { const p = { x: i }; p.y = i * 2; if (i % 2) p.label = 'p' + i; pts.push(p); }
  }
  return pts;
}
// Two copies so each has its own inline caches.
function lenA(p) { let s = 0; for (let i = 1; i < p.length; i++) { const dx = p[i].x - p[i - 1].x, dy = p[i].y - p[i - 1].y; s += Math.sqrt(dx * dx + dy * dy); } return s; }
function lenB(p) { let s = 0; for (let i = 1; i < p.length; i++) { const dx = p[i].x - p[i - 1].x, dy = p[i].y - p[i - 1].y; s += Math.sqrt(dx * dx + dy * dy); } return s; }

const good = makePoints(200000), bad = makePointsAdHoc(200000);
function time(fn, pts) { let r = 0; for (let w = 0; w < 5; w++) r = fn(pts); const t = performance.now(); for (let k = 0; k < 30; k++) r = fn(pts); return [performance.now() - t, r]; }
const [tBad, rBad] = time(lenB, bad), [tGood, rGood] = time(lenA, good);
console.log('same result:', rGood.toFixed(2) === rBad.toFixed(2));
console.log('one shape:  ' + tGood.toFixed(1) + ' ms');
console.log('ad-hoc:     ' + tBad.toFixed(1) + ' ms  (ratio varies by machine)');` },
      complexity: `<p>Both versions are O(N); the difference is the constant factor per property access (monomorphic fixed-offset load vs map checks / stub-cache lookups).</p>`,
      followUps: ['What changes if label were added only after construction?', 'Would Object.freeze on each point help or hurt?', 'How would you verify shapes with --allow-natives-syntax?']
    }
  });

  practice.push({
    title: 'Leak Hunt: Accidental Globals',
    level: 'Easy', tags: ['memory leak', 'strict mode', 'scope'], companies: ['Amazon', 'Flipkart', 'Booking.com'],
    statement: `<p>This helper is called for every uploaded document and the page's memory keeps growing:</p><pre>function indexWords(text) {
  words = text.split(' ');          // forgot const
  for (w of words) seen[w] = true;  // forgot const, and 'seen' is global too
  return words.length;
}</pre><p>Explain the leak and write a fixed <code>indexWords(text)</code> that returns <code>{ count, unique }</code> without creating or growing any global state.</p>`,
    constraints: `<p>Texts up to 10<sup>6</sup> words. The function must be pure: same input, same output, nothing retained after it returns.</p>`,
    example: `<p><code>indexWords('a b a')</code> → <code>{ count: 3, unique: 2 }</code>, and afterwards <code>globalThis.words</code> and <code>globalThis.seen</code> are <code>undefined</code>.</p>`,
    brute: { why: `<p>In sloppy (non-strict) scripts, assigning to an undeclared name creates a property on the <b>global object</b>. The global object is a GC root, so the last <code>words</code> array and the ever-growing <code>seen</code> dictionary live until the page closes. <code>seen</code> also turns into a huge dictionary-mode object.</p>`, code: `var seen = {};                         // global "cache" nobody clears
function indexWordsLeaky(text) {
  words = text.split(' ');               // implicit global in sloppy mode
  for (w of words) seen[w] = true;       // 'w' is an implicit global too
  return words.length;
}` },
    mcq: { q: 'Which single change makes the missing-<code>const</code> mistake throw instead of leaking?', options: ['Strict mode ("use strict" or ES modules)', 'Using var instead of nothing', 'Wrapping the code in try/catch', 'Calling the function with new'], answer: 0, explain: 'In strict mode (and all ES modules / class bodies) assigning to an undeclared variable throws ReferenceError, turning a silent leak into a visible bug.' },
    hints: [`<p>Hint 1: Every variable the function needs must be declared inside it (<code>const</code>/<code>let</code>), including the loop variable.</p>`, `<p>Hint 2: Use a local <code>Set</code> for unique words; it becomes garbage when the function returns.</p>`, `<p>Hint 3: Add <code>'use strict'</code> (or ship as an ES module) and a linter rule (<code>no-undef</code>, <code>no-implicit-globals</code>) so the bug class cannot come back. Edge case: empty string and multiple spaces.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(text) {\n  if (text === 'BIG') { var parts = []; for (var i = 0; i < 1000000; i++) parts.push('w' + (i % 1000)); return indexWords(parts.join(' ')); }\n  if (text === 'GLOBALS') { indexWords('a b a'); return [typeof globalThis.words, typeof globalThis.seen, typeof globalThis.w]; }\n  if (text === 'PURE') { var a = indexWords('x y x'), b = indexWords('x y x'); return [a.count === b.count && a.unique === b.unique]; }\n  return indexWords(text);\n}"},"cases":[[["a b a"],{"count":3,"unique":2}],[["  spaced   out  text "],{"count":3,"unique":3}],[[""],{"count":0,"unique":0}],[["   "],{"count":0,"unique":0}],[["one"],{"count":1,"unique":1}],[["a\nb\tc a"],{"count":4,"unique":3}],[["A a"],{"count":2,"unique":2}],[["GLOBALS"],["undefined","undefined","undefined"]],[["PURE"],[true]],[["BIG"],{"count":1000000,"unique":1000}]]},
    solution: {
      approach: `<p>Declare everything locally and use strict mode. Local values die with the call (unless returned or captured), so nothing accumulates. Splitting on whitespace runs (<code>/\\s+/</code>) and filtering empties handles odd spacing.</p>`,
      code: { lang: 'js', run: true, code: `'use strict';
function indexWords(text) {
  const words = text.split(/\\s+/).filter(Boolean);   // local: dies when the function returns
  const unique = new Set(words);                     // local Set instead of a global dictionary
  return { count: words.length, unique: unique.size };
}

console.log(indexWords('a b a'));                    // { count: 3, unique: 2 }
console.log(indexWords('  spaced   out  text '));    // { count: 3, unique: 3 }
console.log('globals leaked?', typeof globalThis.words, typeof globalThis.seen);   // undefined undefined

// Strict mode turns the original bug into an error you can see:
try { (function () { 'use strict'; oops = 1; })(); } catch (e) { console.log('strict mode caught:', e.name); }` },
      dry: { head: ['call', 'words (local)', 'unique', 'globals after'], rows: [['"a b a"', '[a, b, a]', '{a, b}', 'none'], ['"  spaced   out  text "', '[spaced, out, text]', '3', 'none'], ['leaky version, 1000 docs', 'global words', 'global seen grows', H.c('r', 'retained forever')]] },
      complexity: `<p>O(W) time and O(W) temporary space per call; zero retained memory after it returns.</p>`,
      followUps: ['How would you find accidental globals in an existing page? (compare Object.keys(window) before/after)', 'Why are ES modules automatically strict?', 'When IS a module-level cache acceptable, and how do you bound it?']
    }
  });

  practice.push({
    title: 'Which Is Faster? Packed vs Holey Arrays',
    level: 'Easy', tags: ['elements kinds', 'arrays', 'performance'], companies: ['Google', 'Adobe', 'Uber'],
    statement: `<p>You need an array of the first <code>n</code> squares. A teammate wrote <code>const a = new Array(n); for (let i = n - 1; i &gt;= 0; i--) a[i] = i * i;</code>. Write <code>squares(n)</code> that produces a <b>packed</b> small-integer array, and explain why it is faster to <b>read</b> later than the holey one.</p>`,
    constraints: `<p>1 ≤ n ≤ 10<sup>6</sup>; values fit in Smi range for n ≤ 32,768 (larger n produce doubles, which is fine but explain it).</p>`,
    example: `<p><code>squares(5)</code> → <code>[0, 1, 4, 9, 16]</code> with elements kind <code>PACKED_SMI_ELEMENTS</code>. The teammate's version holds the same values but is <code>HOLEY_SMI_ELEMENTS</code> forever, because <code>new Array(n)</code> starts with n holes.</p>`,
    brute: { why: `<p><code>new Array(n)</code> creates an array of length n made entirely of <b>holes</b>, so its elements kind is HOLEY from birth. Filling it (in any order) does not make it packed again: elements kinds only move toward more general. Every read in optimized code must then also check for the hole marker and potentially consult the prototype chain.</p>`, code: `function squaresHoley(n) {
  const a = new Array(n);               // HOLEY_SMI_ELEMENTS from the start
  for (let i = n - 1; i >= 0; i--) a[i] = i * i;
  return a;
}` },
    mcq: { q: 'An array became HOLEY because of <code>new Array(n)</code>. After filling every index, what is its elements kind?', options: ['Still HOLEY: transitions are one-way', 'PACKED again automatically', 'DICTIONARY elements', 'It depends on n being even'], answer: 0, explain: 'V8 does not scan arrays to "un-hole" them. Once HOLEY, always HOLEY for that array.' },
    hints: [`<p>Hint 1: Start from an empty literal <code>[]</code> (PACKED_SMI_ELEMENTS) and append in order with <code>push</code>.</p>`, `<p>Hint 2: <code>Array.from({ length: n }, (_, i) =&gt; i * i)</code> also produces a packed array in one line.</p>`, `<p>Hint 3: For a fair "which is faster" check, time a separate <b>read loop</b> (summing) over both arrays with separate functions, warm up first, and print the sums. Also note: squares above 2<sup>30</sup> are not Smis, so huge n gives PACKED_DOUBLE.</p>`],
    tests: {"sig":"string int -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, n) {\n  if (kind === 'squares') return squares(n);\n  if (kind === 'holey') return squaresHoley(n);\n  if (kind === 'same') return JSON.stringify(squares(n)) === JSON.stringify(squaresHoley(n));\n  if (kind === 'big') { var a = squares(n), s = 0n; for (var i = 0; i < a.length; i++) s += BigInt(a[i]); return [a.length, a[n - 1], a.indexOf(undefined), String(s)]; }\n  if (kind === 'noHoles') { var b = squares(n); var holes = 0; for (var j = 0; j < b.length; j++) if (!(j in b)) holes++; return holes; }\n}"},"cases":[[["squares",5],[0,1,4,9,16]],[["squares",1],[0]],[["squares",2],[0,1]],[["squares",0],[]],[["holey",5],[0,1,4,9,16]],[["same",1000],true],[["noHoles",100],0],[["squares",12],[0,1,4,9,16,25,36,49,64,81,100,121]],[["big",32769],[32769,1073741824,-1,"11728660905984"]],[["big",1000000],[1000000,999998000001,-1,"333332833333500000"]]]},
    solution: {
      approach: `<p>Build the array by appending from an empty literal so it is born packed and stays packed. Reads then need only a bounds check and a load. The difference is usually modest (holey checks are cheap when the prototype chain is pristine), so the main lesson is: do not create holes, and do not pre-size with <code>new Array(n)</code> unless you fill it front to back and profiling says it helps.</p>`,
      code: { lang: 'js', run: true, code: `function squares(n) {
  const a = [];                          // PACKED_SMI_ELEMENTS
  for (let i = 0; i < n; i++) a.push(i * i);
  return a;
}
function squaresHoley(n) {
  const a = new Array(n);                // HOLEY from birth
  for (let i = n - 1; i >= 0; i--) a[i] = i * i;
  return a;
}
function sumA(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; }
function sumB(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; }

const n = 30000;
const packed = squares(n), holey = squaresHoley(n);
console.log(JSON.stringify(squares(5)));                       // [0,1,4,9,16]
function bench(fn, arr) { let s = 0; for (let w = 0; w < 50; w++) s += fn(arr); const t = performance.now(); for (let r = 0; r < 400; r++) s += fn(arr); return [(performance.now() - t).toFixed(1), s]; }
const [tp, sp] = bench(sumA, packed), [th, sh] = bench(sumB, holey);
console.log('packed read: ' + tp + ' ms | holey read: ' + th + ' ms | equal sums: ' + (sp === sh));
console.log('Expect a small gap (or noise): with a pristine Array.prototype, hole checks are cheap. The bigger costs of holes show up with prototype changes and in generic paths.');` },
      complexity: `<p>Both O(n) to build and read. The packed array avoids per-element hole checks and keeps the most specific elements kind.</p>`,
      followUps: ['What does arr.length = 0 followed by refilling do to the kind?', 'Is a typed array (Int32Array) better here? When?', 'Why does delete arr[i] create a hole?']
    }
  });

  /* ================= PRACTICE: Medium ================= */
  practice.push({
    title: 'Leak Hunt: Replace an Unbounded Memo Cache with an O(1) LRU',
    level: 'Medium', tags: ['LRU', 'Map', 'memory leak', 'caching'], companies: ['Amazon', 'Netflix', 'Swiggy'],
    statement: `<p>A Node service memoizes <code>getUserProfile(id)</code> in a module-level <code>Map</code>. With millions of distinct users the Map never shrinks and the process is OOM-killed every few days. Implement <code>memoLRU(fn, capacity)</code> returning a function with the same signature (single primitive argument) that caches at most <code>capacity</code> results, evicting the <b>least recently used</b> entry, with O(1) get and set.</p>`,
    constraints: `<p>1 ≤ capacity ≤ 10<sup>5</sup>; up to 10<sup>7</sup> calls. O(1) amortised per call.</p>`,
    example: `<p>capacity 2: calls <code>f(1), f(2), f(1), f(3), f(2)</code> → computes 1, 2, (hit 1), 3 (evicts 2, the least recently used), 2 again (miss, evicts 1). Total computations: <b>4</b>.</p>`,
    brute: { why: `<p>An unbounded Map: O(1) per call but memory grows with every distinct key: a textbook leak. A naive "fix" that keeps keys in an array and does <code>indexOf</code>/<code>splice</code> to track recency is bounded but O(capacity) per call.</p>`, code: `function memoLeaky(fn) {
  const cache = new Map();               // grows forever: one entry per distinct id
  return (k) => {
    if (!cache.has(k)) cache.set(k, fn(k));
    return cache.get(k);
  };
}` },
    mcq: { q: 'Why can a JavaScript <code>Map</code> alone implement an O(1) LRU?', options: ['Map iterates in insertion order, so delete+set moves a key to the "newest" end and keys().next() is the oldest', 'Map sorts keys automatically by access time', 'Map has a built-in evict() method', 'Map entries are weak'], answer: 0, explain: 'Re-inserting a key after deleting it moves it to the end of the iteration order; the first key in iteration order is the least recently used one.' },
    hints: [`<p>Hint 1: You need two operations in O(1): find an entry by key, and find/remove the least recently used entry.</p>`, `<p>Hint 2: <code>Map</code> preserves insertion order. On a hit: <code>delete</code> then <code>set</code> again to mark it as most recent. On insert beyond capacity: delete <code>map.keys().next().value</code>.</p>`, `<p>Hint 3: Cache <code>undefined</code> results correctly (use <code>has</code>, not a truthiness check). In other languages you would build a hash map + doubly linked list; mention that in the interview.</p>`],
    tests: {"sig":"string int int[] -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, cap, keys) {\n  var computed = 0;\n  var f = memoLRU(function (k) { computed++; return kind === 'falsy' ? (k % 2 ? 0 : undefined) : k * 10; }, cap);\n  if (kind === 'cyc') { for (var i = 0; i < keys[1]; i++) f(i % keys[0]); return computed; }\n  var out = keys.map(function (k) { return f(k); });\n  return kind === 'values' || kind === 'falsy' ? out : computed;\n}"},"cases":[[["count",2,[1,2,1,3,2]],4],[["count",1,[5,5,5]],1],[["count",3,[1,2,3,1,4,2]],5],[["count",3,[1,2,3,1,2,3]],3],[["count",2,[1,2,3,1,2,3]],6],[["count",5,[]],0],[["values",2,[1,2,1,3,2]],[10,20,10,30,20]],[["falsy",2,[1,1,2,2]],[0,0,null,null]],[["count",2,[1,1,2,2,1,1]],2],[["cyc",1000,[500,1000000]],500],[["cyc",1000,[5000,1000000]],1000000],[["count",1,[1,2,1,2]],4]]},
    solution: {
      approach: `<p>Use the insertion order of <code>Map</code> as the recency list. Hits re-insert the key (most recent at the end); inserts evict the first key when over capacity. Memory is now bounded by <code>capacity</code>, which converts a leak into a cache with a known memory budget.</p>`,
      code: { lang: 'js', run: true, code: `function memoLRU(fn, capacity) {
  const cache = new Map();
  const wrapped = (key) => {
    if (cache.has(key)) {
      const v = cache.get(key);
      cache.delete(key);                 // move to most-recent end
      cache.set(key, v);
      wrapped.hits++;
      return v;
    }
    const v = fn(key);
    cache.set(key, v);
    if (cache.size > capacity) cache.delete(cache.keys().next().value);   // evict least recent
    wrapped.misses++;
    return v;
  };
  wrapped.hits = 0; wrapped.misses = 0;
  wrapped.size = () => cache.size;
  return wrapped;
}

let computed = 0;
const f = memoLRU((id) => { computed++; return { id, name: 'user' + id }; }, 2);
[1, 2, 1, 3, 2].forEach((k) => f(k));
console.log('computed:', computed, 'hits:', f.hits, 'size:', f.size());   // computed: 4 hits: 1 size: 2

const g = memoLRU((x) => x * 2, 1000);
for (let i = 0; i < 1e6; i++) g(i % 5000);
console.log('after 1e6 calls, cache size is', g.size(), '(bounded)');` },
      dry: { head: ['call', 'hit?', 'action', 'cache order (old → new)'], rows: [['f(1)', 'miss', 'compute', '[1]'], ['f(2)', 'miss', 'compute', '[1, 2]'], ['f(1)', H.c('g', 'hit'), 'move 1 to end', '[2, 1]'], ['f(3)', 'miss', 'compute, evict 2', '[1, 3]'], ['f(2)', 'miss', 'compute, evict 1', '[3, 2]']] },
      complexity: `<p>O(1) average per call (hash operations). Memory O(capacity) instead of O(distinct keys).</p>`,
      followUps: ['Add a TTL so stale profiles expire', 'Bound by total bytes instead of entry count', 'Cache promises (in-flight deduplication) and evict rejected ones']
    }
  });

  practice.push({
    title: 'Event Emitter with Unsubscribe, once, and a Leak Warning',
    level: 'Medium', tags: ['event emitter', 'memory leak', 'design'], companies: ['Microsoft', 'Slack', 'Razorpay'],
    statement: `<p>Implement <code>class Emitter</code> with <code>on(event, fn)</code> returning an <b>unsubscribe function</b>, <code>once(event, fn)</code>, <code>off(event, fn)</code>, <code>emit(event, ...args)</code> and <code>listenerCount(event)</code>. Like Node's EventEmitter, print a <b>one-time warning</b> per event when more than <code>maxListeners</code> (default 10) are registered: that is the most common early signal of a listener leak.</p>`,
    constraints: `<p>Listeners added or removed during an <code>emit</code> must not break the current emit. O(1) amortised <code>on</code>; <code>off</code> may be O(k) for k listeners of that event.</p>`,
    example: `<p>Registering a per-request listener 11 times on a long-lived emitter prints <code>Possible leak: 11 "reconnect" listeners</code> once. Calling each returned unsubscribe brings <code>listenerCount('reconnect')</code> back to 0.</p>`,
    brute: { why: `<p>A minimal emitter with no way to remove listeners (or where callers ignore it) means every <code>on</code> from a short-lived object (a request, a component) is retained by a long-lived emitter, along with everything its closure captures. Emitting while iterating the live array also misbehaves when a <code>once</code> listener removes itself.</p>`, code: `class LeakyEmitter {
  constructor() { this.events = {}; }
  on(e, fn) { (this.events[e] = this.events[e] || []).push(fn); }   // no way to remove
  emit(e, ...args) { (this.events[e] || []).forEach((fn) => fn(...args)); }
}` },
    mcq: { q: 'Why iterate over a <b>copy</b> of the listener array inside <code>emit</code>?', options: ['A listener (e.g. a once wrapper) may remove itself or add others during emit, which would shift the live array', 'Copies are faster to iterate', 'To make listeners run in parallel', 'Because arrays cannot be iterated twice'], answer: 0, explain: 'Mutating an array while iterating it skips or repeats elements. Snapshotting gives well-defined semantics (Node does the same).' },
    hints: [`<p>Hint 1: Store listeners in a <code>Map&lt;event, Array&lt;fn&gt;&gt;</code>. <code>on</code> pushes and returns <code>() =&gt; this.off(event, fn)</code>.</p>`, `<p>Hint 2: <code>once</code> wraps the function: the wrapper calls <code>off</code> on itself, then the original. Keep a link from wrapper to original so <code>off(event, original)</code> also works.</p>`, `<p>Hint 3: Track which events already warned (a Set) so the warning prints once. Delete the Map entry when the last listener goes, so empty arrays for one-off event names do not accumulate either.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var logs = [], old = console.log;\n  console.log = function () { logs.push([].join.call(arguments, ' ')); };\n  try {\n    var em = new Emitter(), got = [];\n    if (k === 'on') { em.on('a', function (x, y) { got.push([x, y]); }); em.emit('a', 1, 2); em.emit('b', 9); return got; }\n    if (k === 'unsub') { var off = em.on('a', function () { got.push(1); }); em.emit('a'); off(); em.emit('a'); return [got.length, em.listenerCount('a')]; }\n    if (k === 'once') { em.once('a', function (v) { got.push(v); }); em.emit('a', 1); em.emit('a', 2); return [got, em.listenerCount('a')]; }\n    if (k === 'offOnce') { var fn = function () { got.push('x'); }; em.once('a', fn); em.off('a', fn); em.emit('a'); return [got.length, em.listenerCount('a')]; }\n    if (k === 'off') { var f1 = function () { got.push(1); }, f2 = function () { got.push(2); }; em.on('a', f1); em.on('a', f2); em.off('a', f1); em.emit('a'); return [got, em.listenerCount('a')]; }\n    if (k === 'count') { em.on('a', function () {}); em.on('a', function () {}); em.on('b', function () {}); return [em.listenerCount('a'), em.listenerCount('b'), em.listenerCount('zzz')]; }\n    if (k === 'order') { em.on('a', function () { got.push(1); }); em.on('a', function () { got.push(2); }); em.on('a', function () { got.push(3); }); em.emit('a'); return got; }\n    if (k === 'selfRemove') { var self = em.on('a', function () { got.push('s'); self(); }); em.on('a', function () { got.push('t'); }); em.emit('a'); em.emit('a'); return got; }\n    if (k === 'addDuring') { em.on('a', function () { got.push('first'); em.on('a', function () { got.push('late'); }); }); em.emit('a'); return got; }\n    if (k === 'warn') { for (var i = 0; i < 15; i++) em.on('reconnect', function () {}); return [logs.length, logs[0].indexOf('Possible leak: 11') === 0 || logs[0].indexOf('Possible leak: 11') > -1, logs[0].indexOf('\"reconnect\"') > -1]; }\n    if (k === 'noWarn10') { for (var j = 0; j < 10; j++) em.on('e', function () {}); return logs.length; }\n    if (k === 'warnPerEvent') { for (var m = 0; m < 11; m++) { em.on('x', function () {}); em.on('y', function () {}); } return logs.length; }\n    if (k === 'warnCustom') { var small = new Emitter(2); small.on('q', function () {}); small.on('q', function () {}); var before = logs.length; small.on('q', function () {}); return [before, logs.length]; }\n    if (k === 'cleanup') { var offs = []; for (var n = 0; n < 11; n++) offs.push(em.on('reconnect', function () {})); offs.forEach(function (o) { o(); }); return em.listenerCount('reconnect'); }\n    if (k === 'many') { var c = 0, os = []; for (var q = 0; q < 20000; q++) os.push(em.on('t', function () { c++; })); em.emit('t'); os.forEach(function (o) { o(); }); return [c, em.listenerCount('t'), logs.length]; }\n  } finally { console.log = old; }\n}"},"cases":[[["on"],[[1,2]]],[["unsub"],[1,0]],[["once"],[[1],0]],[["offOnce"],[0,0]],[["off"],[[2],1]],[["count"],[2,1,0]],[["order"],[1,2,3]],[["selfRemove"],["s","t","t"]],[["addDuring"],["first"]],[["warn"],[1,true,true]],[["noWarn10"],0],[["warnPerEvent"],2],[["warnCustom"],[0,1]],[["cleanup"],0],[["many"],[20000,0,1]]]},
    solution: {
      approach: `<p>A Map of arrays, unsubscribe closures, wrapper-based <code>once</code>, snapshot iteration in <code>emit</code>, and a max-listener warning. Cleaning empty entries matters for emitters keyed by dynamic names (per-user channels), which would otherwise leak keys.</p>`,
      code: { lang: 'js', run: true, code: `class Emitter {
  constructor(maxListeners = 10) { this.map = new Map(); this.max = maxListeners; this.warned = new Set(); }
  on(event, fn) {
    if (!this.map.has(event)) this.map.set(event, []);
    const list = this.map.get(event);
    list.push(fn);
    if (list.length > this.max && !this.warned.has(event)) {
      this.warned.add(event);
      console.log('Possible leak: ' + list.length + ' "' + event + '" listeners (max ' + this.max + ')');
    }
    return () => this.off(event, fn);
  }
  once(event, fn) {
    const wrapper = (...args) => { this.off(event, wrapper); fn(...args); };
    wrapper.original = fn;
    return this.on(event, wrapper);
  }
  off(event, fn) {
    const list = this.map.get(event);
    if (!list) return;
    const i = list.findIndex((l) => l === fn || l.original === fn);
    if (i >= 0) list.splice(i, 1);
    if (list.length === 0) this.map.delete(event);      // do not leak empty keys
  }
  emit(event, ...args) {
    const list = this.map.get(event);
    if (!list) return false;
    for (const fn of list.slice()) fn(...args);         // snapshot: safe against self-removal
    return true;
  }
  listenerCount(event) { return (this.map.get(event) || []).length; }
}

const db = new Emitter();
const unsubs = [];
for (let req = 0; req < 11; req++) unsubs.push(db.on('reconnect', () => req));   // 11th triggers warning
console.log('count:', db.listenerCount('reconnect'));
unsubs.forEach((u) => u());
console.log('after cleanup:', db.listenerCount('reconnect'), 'keys:', db.map.size);
let n = 0;
db.once('ready', () => n++);
db.emit('ready'); db.emit('ready');
console.log('once fired', n, 'time(s)');` },
      dry: { head: ['op', 'reconnect listeners', 'output'], rows: [['on × 10', '10', '-'], ['on (11th)', '11', 'Possible leak warning'], ['unsubscribe × 11', '0 (key deleted)', '-'], ['once ready; emit × 2', '1 → 0', 'fired 1 time']] },
      complexity: `<p><code>on</code> O(1) amortised, <code>off</code> O(k), <code>emit</code> O(k) for k listeners of that event. Memory O(total listeners).</p>`,
      followUps: ['Support AbortSignal: on(event, fn, { signal })', 'Make emit async-safe (await each listener, collect errors)', 'Use a WeakRef-based listener list: why is that usually a bad idea?']
    }
  });

  practice.push({
    title: 'Which Is Faster? Normalize Shapes Before the Hot Loop',
    level: 'Medium', tags: ['hidden classes', 'megamorphic', 'data processing'], companies: ['Stripe', 'Shopify', 'PhonePe'],
    statement: `<p>An analytics job merges order records from 6 sources. Each source has the same logical fields (<code>id</code>, <code>price</code>, <code>qty</code>) but different key orders and extra fields, so the hot aggregation loop sees 6+ hidden classes. Write <code>normalize(records)</code> that converts records into one shape, and <code>revenueRows(rows)</code> that sums <code>price * qty</code>. Show that the total is unchanged and the loop becomes monomorphic.</p>`,
    constraints: `<p>Up to 10<sup>6</sup> records. Normalisation is one O(N) pass; the aggregation may run many times (dashboards re-aggregate on every filter change).</p>`,
    example: `<p>Sources produce <code>{id, price, qty}</code>, <code>{qty, price, id}</code>, <code>{price, id, qty, coupon}</code>, ... → all become <code>Row {id, price, qty}</code>. <code>revenue</code> returns the same number, but its <code>r.price</code> / <code>r.qty</code> loads go from megamorphic to monomorphic.</p>`,
    brute: { why: `<p>Aggregating the raw records directly means the property loads in the loop see 6 maps: more than the polymorphic limit of 4, so the ICs go <b>megamorphic</b> (global stub-cache lookups) and TurboFan cannot inline field loads. If the aggregation runs many times, you pay that cost every time.</p>`, code: `function revenueRaw(records) {
  let s = 0;
  for (const r of records) s += r.price * r.qty;   // 6 shapes -> megamorphic loads
  return s;
}` },
    mcq: { q: 'Normalization costs one extra pass. When does it pay off?', options: ['When the normalized data is processed many times or in very hot loops', 'Never: an extra pass is always slower', 'Only when records have fewer than 4 shapes', 'Only in Firefox'], answer: 0, explain: 'You pay O(N) once to get monomorphic access for every later pass. For a single pass over small data, it may not be worth it: measure.' },
    hints: [`<p>Hint 1: Create one class (or one factory) with the three fields assigned in a fixed order; build every row through it.</p>`, `<p>Hint 2: Read each source's fields by name (<code>r.price</code>) inside <code>normalize</code>; that one pass is megamorphic, but every later pass is not.</p>`, `<p>Hint 3: Benchmark with two separately written aggregation functions (separate feedback), warm up, repeat the aggregation ~20 times, and compare totals for equality.</p>`],
    tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, json) {\n  if (kind === 'big') {\n    var makers = [function (i) { return { id: i, price: i % 50, qty: 2 }; }, function (i) { return { qty: 2, price: i % 50, id: i }; }, function (i) { return { price: i % 50, id: i, qty: 2, coupon: null }; }, function (i) { return { id: i, src: 'b', price: i % 50, qty: 2 }; }, function (i) { return { qty: 2, id: i, price: i % 50, ts: 0 }; }, function (i) { return { id: i, qty: 2, price: i % 50 }; }];\n    var raw = []; for (var i = 0; i < 300000; i++) raw.push(makers[i % 6](i));\n    var rows = normalize(raw);\n    return [revenueRows(rows), revenueRaw(raw), new Set(rows.map(function (r) { return Object.keys(r).join(); })).size, rows.length];\n  }\n  var recs = JSON.parse(json);\n  var rs = normalize(recs);\n  if (kind === 'total') return revenueRows(rs);\n  if (kind === 'shape') return rs.map(function (r) { return Object.keys(r).join(); });\n  if (kind === 'values') return rs.map(function (r) { return [r.id, r.price, r.qty]; });\n  if (kind === 'same') return revenueRows(rs) === revenueRaw(recs);\n}"},"cases":[[["total","[{\"id\":1,\"price\":2,\"qty\":3}]"],6],[["total","[{\"qty\":3,\"price\":2,\"id\":1},{\"price\":5,\"id\":2,\"qty\":1,\"coupon\":\"x\"}]"],11],[["total","[]"],0],[["total","[{\"id\":1,\"price\":0,\"qty\":9}]"],0],[["total","[{\"id\":1,\"price\":-2.5,\"qty\":4}]"],-10],[["shape","[{\"qty\":3,\"price\":2,\"id\":1},{\"price\":5,\"id\":2,\"qty\":1,\"coupon\":\"x\"}]"],["id,price,qty","id,price,qty"]],[["values","[{\"qty\":3,\"price\":2,\"id\":7,\"extra\":1}]"],[[7,2,3]]],[["same","[{\"id\":1,\"price\":2,\"qty\":3},{\"qty\":1,\"price\":4,\"id\":2}]"],true],[["big",""],[14700000,14700000,1,300000]]],"cmp":"float"},
    solution: {
      approach: `<p>Pay the shape chaos once at the boundary, then work on uniform data. This mirrors real systems: parse/validate at the edge into one internal type, keep the core monomorphic. It also simplifies code (one type to reason about).</p>`,
      code: { lang: 'js', run: true, code: `class Row { constructor(id, price, qty) { this.id = id; this.price = price; this.qty = qty; } }
function normalize(records) {
  const out = new Array(0);
  for (const r of records) out.push(new Row(r.id, r.price, r.qty));   // one shape out
  return out;
}
function revenueRows(rows) { let s = 0; for (let i = 0; i < rows.length; i++) s += rows[i].price * rows[i].qty; return s; }
function revenueRaw(recs) { let s = 0; for (let i = 0; i < recs.length; i++) s += recs[i].price * recs[i].qty; return s; }

const makers = [
  (i) => ({ id: i, price: i % 50, qty: 2 }), (i) => ({ qty: 2, price: i % 50, id: i }),
  (i) => ({ price: i % 50, id: i, qty: 2, coupon: null }), (i) => ({ id: i, src: 'b', price: i % 50, qty: 2 }),
  (i) => ({ qty: 2, id: i, price: i % 50, ts: 0 }), (i) => ({ id: i, qty: 2, price: i % 50 })
];
const raw = Array.from({ length: 300000 }, (_, i) => makers[i % 6](i));
const t0 = performance.now(); const rows = normalize(raw); const tn = performance.now() - t0;
function bench(fn, data) { let s = 0; s += fn(data); const t = performance.now(); for (let k = 0; k < 20; k++) s = fn(data); return [performance.now() - t, s]; }
const [tRaw, sRaw] = bench(revenueRaw, raw), [tRows, sRows] = bench(revenueRows, rows);
console.log('totals equal:', sRaw === sRows, sRows);
console.log('normalize once: ' + tn.toFixed(1) + ' ms');
console.log('20x raw (6 shapes):  ' + tRaw.toFixed(1) + ' ms');
console.log('20x rows (1 shape):  ' + tRows.toFixed(1) + ' ms');` },
      dry: { head: ['stage', 'shapes seen at r.price', 'IC state'], rows: [['revenueRaw', '6', H.c('r', 'megamorphic')], ['normalize (once)', '6', 'megamorphic, but runs once'], ['revenueRows', '1 (Row)', H.c('g', 'monomorphic')]] },
      complexity: `<p>Normalize O(N) once; each aggregation O(N) with a smaller constant. Extra memory O(N) for the normalized rows (or normalize in place at ingestion and drop the raw records).</p>`,
      followUps: ['Go further: struct-of-arrays with Float64Array columns', 'How would TypeScript types help or not help here?', 'What if sources add new fields at runtime?']
    }
  });

  practice.push({
    title: 'Build an Inline Cache Simulator',
    level: 'Medium', tags: ['inline caches', 'state machine', 'simulation'], companies: ['Google', 'Apple', 'Mozilla'],
    statement: `<p>Implement <code>class InlineCache</code> modelling one property-access site. <code>load(mapId, slotOf)</code> is called with the receiver's hidden-class id; <code>slotOf(mapId)</code> is the slow lookup. Rules: <b>uninitialized</b> → first map makes it <b>monomorphic</b>; up to <b>4</b> distinct maps → <b>polymorphic</b> (check entries in order); a 5th distinct map → <b>megamorphic</b> (entries cleared, every later load uses a shared global cache keyed by map). Track <code>hits</code>, <code>misses</code>, and the number of entry comparisons (<code>checks</code>).</p>`,
    constraints: `<p>Up to 10<sup>6</sup> loads, map ids are integers. Each load O(1) (at most 4 comparisons, or one hash lookup when megamorphic).</p>`,
    example: `<p>Maps <code>1 1 1 2 1 3 4 5 1</code>: uninitialized → mono (miss) → hit, hit → poly (miss) → hit (1 check: map 1 is entry #1) → poly (miss) → poly (miss, 4 maps) → <b>megamorphic</b> (miss) → map 1 is not yet in the global cache (miss). Final: 3 hits, 6 misses.</p>`,
    brute: { why: `<p>Without an inline cache, every load calls the slow lookup (walk the hidden class's descriptor list, maybe the prototype chain). That is the "dictionary lookup per property access" cost the IC exists to avoid. In this model that means one <code>slotOf</code> call per load.</p>`, code: `function loadNoCache(maps, slotOf) {
  let slowLookups = 0;
  for (const m of maps) { slotOf(m); slowLookups++; }   // full lookup every single time
  return slowLookups;
}` },
    mcq: { q: 'In V8, after an IC goes megamorphic, what happens if later calls see only ONE map again?', options: ['It stays megamorphic (ICs do not go back down in normal operation)', 'It immediately becomes monomorphic again', 'It throws a deopt error', 'It resets after every call'], answer: 0, explain: 'IC state only moves toward more generic states for that feedback slot (until the code/feedback is reset). That is why one burst of mixed shapes can permanently slow a site.' },
    hints: [`<p>Hint 1: Keep <code>state</code>, an array <code>entries</code> of <code>{ map, slot }</code> (max 4), and a shared <code>Map</code> for the megamorphic cache.</p>`, `<p>Hint 2: For mono/poly: scan entries in order, counting comparisons; on a match it is a hit. Otherwise call <code>slotOf</code>, then either append (≤ 4) or switch to megamorphic.</p>`, `<p>Hint 3: In megamorphic state, look the map up in the global cache: present → hit, absent → miss (call slotOf and store). Do not forget the uninitialized → monomorphic transition on the very first load.</p>`],
    tests: {"sig":"int[] -> string","fn":"chk","harness":{"js":"\nfunction chk(maps, extra) {\n  GLOBAL_STUB_CACHE.clear();\n  var slow = 0, slotOf = function (m) { slow++; return m % 3; };\n  var ic = new InlineCache(), slots = [];\n  if (maps.length === 2 && maps[0] === -1) { for (var i = 0; i < maps[1]; i++) ic.load(3, slotOf); return { hits: ic.hits, misses: ic.misses, checks: ic.checks, state: ic.state, slow: slow }; }\n  if (maps[0] === -2) {\n    var a = new InlineCache(), b = new InlineCache();\n    [1, 2, 3, 4, 5, 6, 7].forEach(function (m) { a.load(m, slotOf); });\n    var slowBefore = slow;\n    [1, 2, 3, 4, 5, 6, 7].forEach(function (m) { b.load(m, slotOf); });\n    return { hits: b.hits, misses: b.misses, state: b.state, slowByB: slow - slowBefore };\n  }\n  maps.forEach(function (m) { slots.push(ic.load(m, slotOf)); });\n  return { slots: slots, hits: ic.hits, misses: ic.misses, checks: ic.checks, state: ic.state, slow: slow };\n}"},"cases":[[[[1,1,1,2,1,3,4,5,1]],{"slots":[1,1,1,2,1,0,1,2,1],"hits":3,"misses":6,"checks":13,"state":"megamorphic","slow":6}],[[[7,7,7,7,7]],{"slots":[1,1,1,1,1],"hits":4,"misses":1,"checks":4,"state":"monomorphic","slow":1}],[[[1,2,1,2]],{"slots":[1,2,1,2],"hits":2,"misses":2,"checks":4,"state":"polymorphic","slow":2}],[[[1,2,3,4,4,3,2,1]],{"slots":[1,2,0,1,1,0,2,1],"hits":4,"misses":4,"checks":16,"state":"polymorphic","slow":4}],[[[1,2,3,4,5,5,5]],{"slots":[1,2,0,1,2,2,2],"hits":2,"misses":5,"checks":10,"state":"megamorphic","slow":5}],[[[]],{"slots":[],"hits":0,"misses":0,"checks":0,"state":"uninitialized","slow":0}],[[[-2]],{"hits":2,"misses":5,"state":"megamorphic","slowByB":5}],[[[-1,1000000]],{"hits":999999,"misses":1,"checks":999999,"state":"monomorphic","slow":1}],[[[1,2,3,4,5,1,2,3,4,5]],{"slots":[1,2,0,1,2,1,2,0,1,2],"hits":1,"misses":9,"checks":10,"state":"megamorphic","slow":9}]]},
    solution: {
      approach: `<p>A small state machine mirroring V8's feedback slot. The stats show why monomorphic sites are cheapest (1 comparison), polymorphic ones cost more comparisons, and megamorphic ones fall back to a hashed global cache.</p>`,
      code: { lang: 'js', run: true, code: `const GLOBAL_STUB_CACHE = new Map();      // shared by all megamorphic sites: key "map" -> slot

class InlineCache {
  constructor() { this.state = 'uninitialized'; this.entries = []; this.hits = 0; this.misses = 0; this.checks = 0; this.history = []; }
  load(map, slotOf) {
    let slot;
    if (this.state === 'megamorphic') {
      if (GLOBAL_STUB_CACHE.has(map)) { this.hits++; slot = GLOBAL_STUB_CACHE.get(map); }
      else { this.misses++; slot = slotOf(map); GLOBAL_STUB_CACHE.set(map, slot); }
    } else {
      for (const e of this.entries) {
        this.checks++;
        if (e.map === map) { this.hits++; slot = e.slot; break; }
      }
      if (slot === undefined) {
        this.misses++;
        slot = slotOf(map);
        if (this.entries.length < 4) {
          this.entries.push({ map, slot });
          this.state = this.entries.length === 1 ? 'monomorphic' : 'polymorphic';
        } else {
          this.state = 'megamorphic';
          this.entries = [];
          GLOBAL_STUB_CACHE.set(map, slot);
        }
      }
    }
    this.history.push(this.state.slice(0, 4));
    return slot;
  }
}

let slowCalls = 0;
const slotOf = (m) => { slowCalls++; return m % 3; };   // pretend descriptor lookup
const ic = new InlineCache();
[1, 1, 1, 2, 1, 3, 4, 5, 1].forEach((m) => ic.load(m, slotOf));
console.log(ic.history.join(' '));
console.log({ state: ic.state, hits: ic.hits, misses: ic.misses, checks: ic.checks, slowCalls });` },
      dry: { head: ['load', 'state before', 'result', 'state after'], rows: [['1', 'uninitialized', 'miss', 'monomorphic'], ['1, 1', 'monomorphic', 'hit, hit (1 check each)', 'monomorphic'], ['2', 'monomorphic', 'miss', 'polymorphic'], ['1', 'polymorphic', 'hit (1 check)', 'polymorphic'], ['3, 4', 'polymorphic', 'miss, miss', 'polymorphic (4 maps)'], ['5', 'polymorphic', 'miss', H.c('r', 'megamorphic')], ['1', 'megamorphic', 'miss in global cache (first time)', 'megamorphic']] },
      complexity: `<p>O(1) per load: at most 4 comparisons or one hash lookup. Memory O(1) per site plus the shared global cache.</p>`,
      followUps: ['Add prototype-chain loads: cache (map → holder object + slot) and invalidate on prototype change', 'Model the global cache as a fixed-size hash table with collisions', 'Count how often TurboFan could inline (mono/poly) vs not (mega)']
    }
  });

  practice.push({
    title: 'Leak Hunt: Per-Node Metadata Without Retaining Detached DOM',
    level: 'Medium', tags: ['WeakMap', 'memory leak', 'DOM'], companies: ['Meta', 'Figma', 'Notion'],
    statement: `<p>A tooltip library stores measurements for each element in <code>const sizes = new Map()</code> keyed by the element. When a list re-renders, old elements are removed from the page, but the Map keeps them (and their whole subtree) alive: thousands of <b>Detached</b> nodes in heap snapshots. Rewrite <code>measure(el, computeFn)</code> so per-element data is cached without keeping elements alive, and explain the semantics you rely on.</p>`,
    constraints: `<p>Keys are objects (elements). Lookups O(1). The cache must not prevent removed elements from being collected, and must not need manual cleanup.</p>`,
    example: `<p><code>measure(row1, f)</code> computes once; a second call returns the cached value. After <code>row1</code> is removed from the page and no other code references it, the cache entry is collectable automatically, so <code>Detached HTMLDivElement</code> count stays flat.</p>`,
    brute: { why: `<p>A strong <code>Map</code> holds its keys. Every element ever measured stays reachable from the module-level Map (a GC root path), together with its children, its event listeners and anything their closures capture.</p>`, code: `const sizes = new Map();                 // strong keys: retains every element ever measured
function measureLeaky(el, computeFn) {
  if (!sizes.has(el)) sizes.set(el, computeFn(el));
  return sizes.get(el);
}` },
    mcq: { q: 'Why can a <code>WeakMap</code> not be iterated or report its size?', options: ['Its contents depend on GC timing, which must stay unobservable to keep programs deterministic', 'It is a performance optimization only', 'Because WeakMap stores values in the DOM', 'It can, using WeakMap.prototype.keys()'], answer: 0, explain: 'If you could enumerate a WeakMap you could observe exactly when objects get collected. The spec forbids that, so WeakMaps only support get/set/has/delete by key.' },
    hints: [`<p>Hint 1: You want "data attached to an object that lives exactly as long as the object". That is the definition of a <code>WeakMap</code> entry.</p>`, `<p>Hint 2: WeakMap keys are held weakly; a value is kept alive only while its key is alive (ephemeron semantics), so even a value that references its own key does not leak.</p>`, `<p>Hint 3: WeakMap keys must be objects (or non-registered symbols). If you need iteration (e.g. "invalidate all"), keep a version counter in the value instead of iterating.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var calls = 0, fm = function (el) { calls++; return el.text === 'zero' ? 0 : { w: el.text.length * 8, h: 16 }; };\n  var a = { text: 'hello' }, b = { text: 'hi' };\n  if (k === 'cached') { var r1 = measure(a, fm), r2 = measure(a, fm); return [r1, r2 === r1, calls]; }\n  if (k === 'perElement') { return [measure(a, fm), measure(b, fm), calls]; }\n  if (k === 'invalidate') { measure(a, fm); invalidateAll(); measure(a, fm); measure(a, fm); return calls; }\n  if (k === 'invalidateAll') { measure(a, fm); measure(b, fm); invalidateAll(); measure(b, fm); measure(a, fm); return calls; }\n  if (k === 'weak') return [sizes instanceof WeakMap, typeof sizes.size, typeof sizes[Symbol.iterator]];\n  if (k === 'falsy') { var z = { text: 'zero' }; measure(z, fm); measure(z, fm); return [measure(z, fm), calls]; }\n  if (k === 'sameShape') { var c = { text: 'hello' }; measure(a, fm); measure(c, fm); return calls; }\n  if (k === 'many') { var els = []; for (var i = 0; i < 100000; i++) els.push({ text: 'x' }); els.forEach(function (e) { measure(e, fm); }); els.forEach(function (e) { measure(e, fm); }); return calls; }\n}"},"cases":[[["cached"],[{"w":40,"h":16},true,1]],[["perElement"],[{"w":40,"h":16},{"w":16,"h":16},2]],[["invalidate"],2],[["invalidateAll"],4],[["weak"],[true,"undefined","undefined"]],[["falsy"],[0,1]],[["sameShape"],2],[["many"],100000]]},
    solution: {
      approach: `<p>Swap the <code>Map</code> for a <code>WeakMap</code>. Entries disappear automatically when their key element is no longer reachable from anywhere else. Use a version number for global invalidation (e.g. on window resize) instead of iterating.</p>`,
      code: { lang: 'js', run: true, code: `const sizes = new WeakMap();               // weak keys: does not keep elements alive
let layoutVersion = 0;                      // bump on resize to invalidate everything lazily

function measure(el, computeFn) {
  const cached = sizes.get(el);
  if (cached && cached.version === layoutVersion) return cached.value;
  const value = computeFn(el);
  sizes.set(el, { value, version: layoutVersion, owner: el });   // even referencing el is fine (ephemeron)
  return value;
}
function invalidateAll() { layoutVersion++; }

// Plain objects stand in for DOM elements in this sandbox.
let computeCalls = 0;
const fakeMeasure = (el) => { computeCalls++; return { w: el.text.length * 8, h: 16 }; };
let row1 = { text: 'hello' };
console.log(measure(row1, fakeMeasure), measure(row1, fakeMeasure), 'computed', computeCalls, 'time(s)');
invalidateAll();
measure(row1, fakeMeasure);
console.log('after invalidateAll, computed', computeCalls, 'times');
row1 = null;   // the only strong reference is gone -> the WeakMap entry is collectable
console.log('row1 released; nothing else to clean up');` },
      dry: { head: ['step', 'cache entry for row1', 'computeCalls'], rows: [['measure(row1) #1', 'created (v0)', '1'], ['measure(row1) #2', 'hit (v0)', '1'], ['invalidateAll → v1; measure', 'stale → recomputed (v1)', '2'], ['row1 = null', 'collectable with row1', '2']] },
      complexity: `<p>O(1) average per lookup. Memory proportional to <b>live</b> elements only.</p>`,
      followUps: ['When would WeakRef + FinalizationRegistry be needed instead?', 'Why must you never rely on FinalizationRegistry callbacks for correctness?', 'How do frameworks (e.g. Vue reactivity) use WeakMap internally?']
    }
  });

  practice.push({
    title: 'Which Is Faster? Array of Objects vs Typed-Array Columns',
    level: 'Medium', tags: ['typed arrays', 'memory layout', 'performance'], companies: ['Uber', 'Mapbox', 'Bloomberg'],
    statement: `<p>A map renderer stores 10<sup>6</sup> points as <code>[{ x, y }, ...]</code> and computes their centroid on every pan. Convert the data to a <b>struct-of-arrays</b> layout (<code>xs</code>, <code>ys</code> as <code>Float64Array</code>) and implement <code>centroid</code> for both layouts. Explain the memory and speed difference in terms of heap objects, HeapNumbers, GC and cache locality.</p>`,
    constraints: `<p>N ≤ 10<sup>6</sup>; coordinates are doubles. Results must match to 1e-9.</p>`,
    example: `<p>Points (0,0), (2,0), (2,2), (0,2) → centroid (1, 1) in both layouts. For 10<sup>6</sup> points, the object layout is 10<sup>6</sup> heap objects (plus boxed doubles for fractional coordinates); the typed layout is two contiguous 8 MB buffers.</p>`,
    brute: { why: `<p>An array of objects means one pointer per element, each pointing to a separate heap object, whose fractional fields are typically separate <b>HeapNumber</b> boxes. Reading x means pointer → object → (maybe) box: scattered memory, poor CPU cache use, and millions of objects for the GC to trace and possibly copy.</p>`, code: `function centroidObjects(points) {
  let sx = 0, sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }   // pointer chasing per element
  return [sx / points.length, sy / points.length];
}` },
    mcq: { q: 'Why do typed arrays reduce GC work for large numeric datasets?', options: ['The numbers live in one off-heap backing store with no per-element objects to trace', 'Typed arrays are never garbage collected', 'They compress numbers to 1 byte', 'They disable the GC while in use'], answer: 0, explain: 'A Float64Array is one small JS object plus a raw byte buffer. The GC traces one object instead of millions, and never copies the numbers.' },
    hints: [`<p>Hint 1: Allocate <code>xs = new Float64Array(n)</code> and <code>ys = new Float64Array(n)</code> once, then copy coordinates in a single pass.</p>`, `<p>Hint 2: The centroid loop over typed arrays reads contiguous memory with a fixed element type: no shape checks, no boxes, great cache locality.</p>`, `<p>Hint 3: Benchmark both (separate functions, warm-up, repeat ~10 times), compare results with a tolerance, and also report the heap cost difference with <code>process.memoryUsage()</code> if available.</p>`],
    tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, json) {\n  if (kind === 'big') { var pts = []; for (var i = 0; i < 1000000; i++) pts.push({ x: i, y: 2 * i }); return [centroidObjects(pts), centroidColumns(toColumns(pts))]; }\n  var p = JSON.parse(json);\n  if (kind === 'both') return [centroidObjects(p), centroidColumns(toColumns(p))];\n  if (kind === 'cols') { var c = toColumns(p); return [Array.from(c.xs), Array.from(c.ys), c.xs.constructor.name, c.ys.constructor.name]; }\n}"},"cases":[[["both","[{\"x\":0,\"y\":0},{\"x\":2,\"y\":0},{\"x\":2,\"y\":2},{\"x\":0,\"y\":2}]"],[[1,1],[1,1]]],[["both","[{\"x\":3.5,\"y\":-2}]"],[[3.5,-2],[3.5,-2]]],[["both","[{\"x\":-1,\"y\":-1},{\"x\":1,\"y\":1}]"],[[0,0],[0,0]]],[["both","[{\"x\":0.1,\"y\":0.2},{\"x\":0.3,\"y\":0.4},{\"x\":0.5,\"y\":0.6}]"],[[0.3,0.4],[0.3,0.4]]],[["both","[{\"x\":1e9,\"y\":-1e9},{\"x\":3e9,\"y\":1e9}]"],[[2000000000,0],[2000000000,0]]],[["cols","[{\"x\":1,\"y\":2},{\"x\":3,\"y\":4}]"],[[1,3],[2,4],"Float64Array","Float64Array"]],[["cols","[]"],[[],[],"Float64Array","Float64Array"]],[["big",""],[[499999.5,999999],[499999.5,999999]]]],"cmp":"float"},
    solution: {
      approach: `<p>Struct-of-arrays: each field becomes one typed column. Hot numeric loops then read raw doubles sequentially. This is the same idea used by game engines (ECS), WebGL vertex buffers and columnar databases. Keep the object form at the API edges if it is more convenient, but convert once for heavy computation.</p>`,
      code: { lang: 'js', run: true, code: `function toColumns(points) {
  const n = points.length, xs = new Float64Array(n), ys = new Float64Array(n);
  for (let i = 0; i < n; i++) { xs[i] = points[i].x; ys[i] = points[i].y; }
  return { xs, ys };
}
function centroidColumns({ xs, ys }) {
  let sx = 0, sy = 0;
  for (let i = 0; i < xs.length; i++) { sx += xs[i]; sy += ys[i]; }   // contiguous raw doubles
  return [sx / xs.length, sy / xs.length];
}
function centroidObjects(points) {
  let sx = 0, sy = 0;
  for (let i = 0; i < points.length; i++) { sx += points[i].x; sy += points[i].y; }
  return [sx / points.length, sy / points.length];
}

console.log(centroidColumns(toColumns([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }])));   // [1, 1]

const N = 400000;
const pts = Array.from({ length: N }, (_, i) => ({ x: (i % 1000) + 0.25, y: Math.floor(i / 1000) + 0.75 }));
const cols = toColumns(pts);
function bench(fn, data) { fn(data); const t = performance.now(); let r; for (let k = 0; k < 10; k++) r = fn(data); return [performance.now() - t, r]; }
const [tObj, rObj] = bench(centroidObjects, pts), [tCol, rCol] = bench(centroidColumns, cols);
console.log('match:', Math.abs(rObj[0] - rCol[0]) < 1e-9 && Math.abs(rObj[1] - rCol[1]) < 1e-9);
console.log('objects: ' + tObj.toFixed(1) + ' ms | typed columns: ' + tCol.toFixed(1) + ' ms');
console.log('typed payload: ' + (cols.xs.byteLength + cols.ys.byteLength) / 1e6 + ' MB in 2 buffers vs ' + N + ' heap objects');` },
      complexity: `<p>Both O(N). Typed columns: 16 bytes per point, 2 heap objects total. Objects: one object per point (header + fields, plus HeapNumber boxes for fractional values) and GC tracing proportional to N.</p>`,
      followUps: ['Use a single interleaved Float64Array [x0, y0, x1, y1, ...]: pros and cons', 'Move the computation to a Worker with a transferable ArrayBuffer', 'When is the object layout still the right choice?']
    }
  });

  practice.push({
    title: 'Leak Hunt: Promise.race Against a Promise That Never Settles',
    level: 'Medium', tags: ['promises', 'memory leak', 'AbortSignal', 'async'], companies: ['Vercel', 'Cloudflare', 'Postman'],
    statement: `<p>A job worker runs <code>await Promise.race([shutdown, runJob(job)])</code> for every job, where <code>shutdown</code> is a promise that settles only when the process stops. Each <code>race</code> attaches a reaction to <code>shutdown</code> that is never released, so memory grows per job. Implement <code>runUntilAborted(task, signal)</code> that resolves with the task result, rejects with an <code>AbortError</code> if <code>signal</code> aborts first, and <b>removes its abort listener</b> when the task settles, so nothing accumulates.</p>`,
    constraints: `<p>Millions of jobs over the process lifetime; per-job memory must be released when the job finishes. Works in Node 18+ and browsers.</p>`,
    example: `<p>Run 10,000 quick jobs with one long-lived <code>AbortController</code>: all results arrive and the signal still has <b>0</b> leftover listeners (we count them with a wrapper). Aborting during a slow job rejects that job with <code>AbortError</code>.</p>`,
    brute: { why: `<p><code>Promise.race</code> subscribes to <b>every</b> input with <code>then</code>. A pending promise stores its reaction list; reactions are only released when it settles. Racing against an eternal promise in a loop therefore appends one reaction (holding the race's internal resolve functions and result) per job, forever.</p>`, code: `async function workerLeaky(jobs, shutdown, runJob) {
  const results = [];
  for (const job of jobs) {
    results.push(await Promise.race([shutdown, runJob(job)]));   // adds a reaction to 'shutdown' every time
  }
  return results;
}` },
    mcq: { q: 'Where exactly is the leaked memory held in the Promise.race pattern?', options: ['In the reaction list of the never-settling shutdown promise', 'In the microtask queue forever', 'In the job promise after it resolves', 'In the global object'], answer: 0, explain: 'A pending promise keeps every then-callback registered on it until it settles. The long-lived shutdown promise is reachable for the whole process, so all those reactions are too.' },
    hints: [`<p>Hint 1: Use an <code>AbortSignal</code> instead of an eternal promise: you can add <b>and remove</b> listeners on it.</p>`, `<p>Hint 2: Inside a <code>new Promise</code>, add an <code>'abort'</code> listener that rejects; when the task settles, remove that listener in a <code>finally</code>-style cleanup before resolving/rejecting.</p>`, `<p>Hint 3: Handle the already-aborted case up front (<code>signal.aborted</code>). Use <code>signal.reason</code> or a <code>DOMException('Aborted', 'AbortError')</code>. Count listeners in a test by wrapping add/removeEventListener.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 1); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(k) {\n  return __job(async function () {\n    var ac = new AbortController(), live = 0;\n    var add = ac.signal.addEventListener.bind(ac.signal), rem = ac.signal.removeEventListener.bind(ac.signal);\n    ac.signal.addEventListener = function () { live++; add.apply(null, arguments); };\n    ac.signal.removeEventListener = function () { live--; rem.apply(null, arguments); };\n    var name = function (e) { return e && e.name ? e.name : String(e); };\n    if (k === 'ok') return await runUntilAborted(function () { return Promise.resolve(5); }, ac.signal);\n    if (k === 'taskRejects') { try { await runUntilAborted(function () { return Promise.reject(new Error('x')); }, ac.signal); } catch (e) { return [e.message, live]; } }\n    if (k === 'abortDuring') { var p = runUntilAborted(function () { return new Promise(function (r) { setTimeout(function () { r('late'); }, 150); }); }, ac.signal); setTimeout(function () { ac.abort(); }, 5); try { await p; return 'resolved'; } catch (e) { return name(e); } }\n    if (k === 'preAborted') { ac.abort(); try { await runUntilAborted(function () { return Promise.resolve(1); }, ac.signal); return 'resolved'; } catch (e) { return name(e); } }\n    if (k === 'noLeak') { var sum = 0; for (var i = 0; i < 10000; i++) sum += await runUntilAborted(function () { return Promise.resolve(i); }, ac.signal); return [sum, live]; }\n    if (k === 'abortAfter') { var v = await runUntilAborted(function () { return Promise.resolve(7); }, ac.signal); ac.abort(); return [v, live]; }\n    if (k === 'listenerWhileRunning') { var pr = runUntilAborted(function () { return new Promise(function (r) { setTimeout(function () { r(1); }, 10); }); }, ac.signal); var during = live; await pr; return [during, live]; }\n    if (k === 'rejectLate') { var q = runUntilAborted(function () { return new Promise(function (r, j) { setTimeout(function () { j(new Error('late fail')); }, 10); }); }, ac.signal); try { await q; } catch (e) { return [e.message, live]; } }\n  });\n}"},"cases":[[["ok"],5],[["taskRejects"],["x",0]],[["abortDuring"],"AbortError"],[["preAborted"],"AbortError"],[["noLeak"],[49995000,0]],[["abortAfter"],[7,0]],[["listenerWhileRunning"],[1,0]],[["rejectLate"],["late fail",0]]]},
    solution: {
      approach: `<p>Subscribe per job and unsubscribe when the job settles. The signal's listener list therefore holds at most the number of <b>in-flight</b> jobs, not the number of jobs ever run. This is the general rule for any long-lived event source: every subscription must have a matching unsubscription.</p>`,
      code: { lang: 'js', run: true, code: `function runUntilAborted(task, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    const onAbort = () => reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    task().then(
      (v) => { signal.removeEventListener('abort', onAbort); resolve(v); },
      (e) => { signal.removeEventListener('abort', onAbort); reject(e); }
    );
  });
}

// Count live listeners to prove nothing accumulates.
const ac = new AbortController();
let live = 0;
const add = ac.signal.addEventListener.bind(ac.signal), remove = ac.signal.removeEventListener.bind(ac.signal);
ac.signal.addEventListener = (...a) => { live++; add(...a); };
ac.signal.removeEventListener = (...a) => { live--; remove(...a); };

(async () => {
  let sum = 0;
  for (let i = 0; i < 10000; i++) sum += await runUntilAborted(() => Promise.resolve(i), ac.signal);
  console.log('sum', sum, '| listeners left after 10,000 jobs:', live);
  const slow = runUntilAborted(() => new Promise((r) => setTimeout(() => r('late'), 200)), ac.signal);
  setTimeout(() => ac.abort(), 10);
  try { await slow; } catch (e) { console.log('slow job rejected with', e.name); }
})();` },
      dry: { head: ['moment', 'in-flight jobs', 'abort listeners', 'shutdown-race version'], rows: [['job 1 running', '1', '1', '1 reaction'], ['job 1 done', '0', '0', '1 reaction (kept)'], ['after 10,000 jobs', '0', H.c('g', '0'), H.c('r', '10,000 reactions')], ['abort during slow job', '1 → rejected', '0', '-']] },
      complexity: `<p>O(1) extra memory per in-flight job, released on completion. Time overhead: one add + one remove listener per job.</p>`,
      followUps: ['Node 20+: AbortSignal.any([a, b]) and AbortSignal.timeout(ms): how do they help?', 'Also cancel the underlying work (pass the signal into fetch)', 'Write a test that fails if listener count grows (leak regression test)']
    }
  });

  practice.push({
    title: 'Three-Snapshot Leak Finder',
    level: 'Medium', tags: ['heap snapshots', 'set operations', 'memory tooling'], companies: ['Meta', 'Google', 'LinkedIn'],
    statement: `<p>You have three heap snapshots, each an array of <code>[objectId, constructorName]</code>. Snapshot 1 = baseline, snapshot 2 = after doing an action N times, snapshot 3 = after doing it N more times. Report, per constructor, how many objects were <b>allocated between snapshot 1 and 2</b> (present in s2, not in s1) and are <b>still alive in snapshot 3</b>. Sort by count descending, then by name. These are your leak suspects.</p>`,
    constraints: `<p>Each snapshot up to 10<sup>6</sup> objects. Object ids are stable across snapshots (as in V8 heap snapshots). O(total size).</p>`,
    example: `<p>s1: <code>[1 Window] [2 App]</code>; s2: adds <code>[3 Modal] [4 Modal] [5 Temp]</code>; s3: has 1, 2, 3, 4 and new 6, 7 (Modal) — 5 is gone. Output: <code>[['Modal', 2]]</code>. Temp was allocated in the window but died (not a leak); 6 and 7 were allocated after s2, so they are not counted (they belong to the next batch).</p>`,
    brute: { why: `<p>For each object in s2, scan all of s1 to see if it existed, and all of s3 to see if it survived: O(|s2| · (|s1| + |s3|)), about 10<sup>12</sup> comparisons for real snapshots.</p>`, code: `function suspectsBrute(s1, s2, s3) {
  const counts = {};
  for (const [id, ctor] of s2) {
    const inS1 = s1.some(([x]) => x === id);          // O(|s1|) each
    const inS3 = s3.some(([x]) => x === id);          // O(|s3|) each
    if (!inS1 && inS3) counts[ctor] = (counts[ctor] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}` },
    mcq: { q: 'Why count only objects born between s1 and s2 that survive to s3, rather than everything that grew from s1 to s3?', options: ['It filters out one-time warm-up allocations and very recent objects, isolating per-action retention', 'Because s3 is always incomplete', 'Because DevTools cannot show s1 objects', 'It is just a convention with no benefit'], answer: 0, explain: 'Objects from the first batch that are still alive after a whole second batch (and a GC) are very likely retained per action. Warm-up singletons existed before s1 or were freed.' },
    hints: [`<p>Hint 1: Build <code>Set</code>s of ids for s1 and s3 once: O(1) membership checks.</p>`, `<p>Hint 2: Walk s2: keep objects not in s1 but in s3, and count them per constructor in a <code>Map</code>.</p>`, `<p>Hint 3: Sort the Map entries by count desc then name. Edge cases: ids reused across snapshots (assume stable ids), empty result means "no leak in this action".</p>`],
    tests: {"sig":"string string string -> string","fn":"chk","harness":{"js":"\nfunction chk(a, b, c) {\n  if (a === 'BIG') { var s2 = []; for (var i = 0; i < 100000; i++) s2.push([i, 'T']); return leakSuspects([], s2, s2); }\n  return leakSuspects(JSON.parse(a), JSON.parse(b), JSON.parse(c));\n}"},"cases":[[["[[1,\"Window\"],[2,\"App\"]]","[[1,\"Window\"],[2,\"App\"],[3,\"Modal\"],[4,\"Modal\"],[5,\"Temp\"]]","[[1,\"Window\"],[2,\"App\"],[3,\"Modal\"],[4,\"Modal\"],[6,\"Modal\"],[7,\"Modal\"]]"],[["Modal",2]]],[["[]","[]","[]"],[]],[["[[1,\"A\"]]","[[1,\"A\"]]","[[1,\"A\"]]"],[]],[["[]","[[1,\"B\"],[2,\"A\"]]","[[1,\"B\"],[2,\"A\"]]"],[["A",1],["B",1]]],[["[]","[[1,\"A\"],[2,\"B\"],[3,\"B\"]]","[[1,\"A\"],[2,\"B\"],[3,\"B\"]]"],[["B",2],["A",1]]],[["[]","[[1,\"A\"],[2,\"A\"]]","[[1,\"A\"]]"],[["A",1]]],[["[]","[[1,\"A\"]]","[]"],[]],[["[[1,\"A\"]]","[[1,\"A\"],[2,\"A\"]]","[[2,\"A\"]]"],[["A",1]]],[["BIG","",""],[["T",100000]]]]},
    solution: {
      approach: `<p>Two hash sets and one pass over s2. This is precisely the "Objects allocated between Snapshot 1 and Snapshot 2" filter in Chrome DevTools applied to snapshot 3.</p>`,
      code: { lang: 'js', run: true, code: `function leakSuspects(s1, s2, s3) {
  const before = new Set(s1.map(([id]) => id));
  const after = new Set(s3.map(([id]) => id));
  const counts = new Map();
  for (const [id, ctor] of s2) {
    if (!before.has(id) && after.has(id)) counts.set(ctor, (counts.get(ctor) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const s1 = [[1, 'Window'], [2, 'App']];
const s2 = [[1, 'Window'], [2, 'App'], [3, 'Modal'], [4, 'Modal'], [5, 'Temp']];
const s3 = [[1, 'Window'], [2, 'App'], [3, 'Modal'], [4, 'Modal'], [6, 'Modal'], [7, 'Modal']];
console.log(JSON.stringify(leakSuspects(s1, s2, s3)));     // [["Modal",2]]` },
      dry: { head: ['s2 object', 'in s1?', 'in s3?', 'counted'], rows: [['1 Window', 'yes', 'yes', 'no'], ['2 App', 'yes', 'yes', 'no'], ['3 Modal', 'no', 'yes', H.c('r', 'Modal +1')], ['4 Modal', 'no', 'yes', H.c('r', 'Modal +1')], ['5 Temp', 'no', 'no (died)', 'no']] },
      complexity: `<p>O(|s1| + |s2| + |s3| + C log C) for C constructors. Space O(|s1| + |s3|).</p>`,
      followUps: ['Also report retained size per constructor', 'Flag constructors whose count grows by an exact multiple of N', 'Stream-parse real .heapsnapshot JSON files without loading them fully']
    }
  });

  /* ================= PRACTICE: Hard ================= */
  practice.push({
    title: 'Retained Size with a Dominator Tree (What DevTools Computes)',
    level: 'Hard', tags: ['graph', 'dominator tree', 'heap snapshots'], companies: ['Google', 'Meta', 'Microsoft'],
    statement: `<p>Given a heap graph (<code>n</code> objects, <code>size[i]</code> bytes, directed <code>edges</code>) and a list of <code>roots</code>, compute the <b>retained size</b> of every object: the total size of all objects that would become unreachable if that object were removed (itself included). Unreachable objects have retained size 0. This is the "Retained Size" column of a heap snapshot.</p>`,
    constraints: `<p>n ≤ 10<sup>5</sup>, edges ≤ 3·10<sup>5</sup>. Target near-linear time (iterative dominators), no recursion (deep graphs).</p>`,
    example: `<p>Root R(0) → A(1), R → B(2), A → C(3), B → C, C → D(4). Sizes: R 0, A 10, B 20, C 30, D 40.</p>${H.table(['object', 'immediate dominator', 'retained size'], [['A', 'R', '10 (C is also reachable via B)'], ['B', 'R', '20'], ['C', H.c('y', 'R (two paths: via A and via B)'), '70 (C + D)'], ['D', 'C', '40']])}<p>Removing A frees only A, because C is still reachable through B.</p>`,
    brute: { why: `<p>For each object x: delete x, BFS from the roots, sum sizes of everything that became unreachable. That is n separate traversals: O(n·(n + E)) ≈ 10<sup>10</sup> for real snapshots, which is why DevTools uses a dominator tree instead.</p>`, code: `function retainedBrute(n, size, edges, roots) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) adj[a].push(b);
  const reach = (removed) => {
    const seen = new Uint8Array(n), st = roots.filter((r) => r !== removed);
    st.forEach((r) => { seen[r] = 1; });
    while (st.length) { const x = st.pop(); for (const y of adj[x]) if (y !== removed && !seen[y]) { seen[y] = 1; st.push(y); } }
    return seen;
  };
  const base = reach(-1), out = new Array(n).fill(0);
  for (let x = 0; x < n; x++) {
    if (!base[x]) continue;
    const s = reach(x);
    for (let i = 0; i < n; i++) if (base[i] && !s[i]) out[x] += size[i];   // includes x itself
  }
  return out;
}` },
    mcq: { q: 'Object X <b>dominates</b> Y when…', options: ['every path from the roots to Y passes through X', 'X has a direct edge to Y', 'X was allocated before Y', 'X is larger than Y'], answer: 0, explain: 'If every root path goes through X, removing X disconnects Y. So the retained size of X is the sum over its dominator subtree.' },
    hints: [`<p>Hint 1: Retained size of X = sum of sizes in X's subtree of the <b>dominator tree</b>. So compute immediate dominators (idom), then sum sizes bottom-up.</p>`, `<p>Hint 2: Add a virtual super-root pointing to all roots. Use the Cooper–Harvey–Kennedy iterative algorithm: number nodes in reverse postorder; repeat until stable: idom[b] = intersect of the processed predecessors of b, where intersect walks two fingers up the idom chain by postorder number.</p>`, `<p>Hint 3: Do the DFS for postorder iteratively (explicit stack of [node, nextChildIndex]). For the sums, visit nodes in <b>postorder</b> (children before dominators) and add each node's retained size into its idom. Skip unreachable nodes.</p>`],
    tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, json) {\n  if (kind === 'chain') { var n = 100000, size = [], edges = []; for (var i = 0; i < n; i++) { size.push(1); if (i + 1 < n) edges.push([i, i + 1]); } var r = retainedSizes(n, size, edges, [0]).retained; return [r[0], r[50000], r[n - 1]]; }\n  if (kind === 'skip') { var m = 100000, sz = [], ed = []; for (var j = 0; j < m; j++) { sz.push(1); for (var d = 1; d <= 3; d++) if (j + d < m) ed.push([j, j + d]); } var rr = retainedSizes(m, sz, ed, [0]).retained; var ok = true; for (var k = 0; k < m; k++) if (rr[k] < 1) ok = false; return [rr[0], rr[m - 1], ok]; }\n  var g = JSON.parse(json);\n  var res = retainedSizes(g.n, g.size, g.edges, g.roots);\n  if (kind === 'idom') return res.idom;\n  return res.retained;\n}"},"cases":[[["retained","{\"n\":5,\"size\":[0,10,20,30,40],\"edges\":[[0,1],[0,2],[1,3],[2,3],[3,4]],\"roots\":[0]}"],[100,10,20,70,40]],[["retained","{\"n\":4,\"size\":[1,2,3,4],\"edges\":[[0,1],[1,2],[2,3]],\"roots\":[0]}"],[10,9,7,4]],[["retained","{\"n\":4,\"size\":[5,5,5,5],\"edges\":[[0,1],[0,2],[1,3],[2,3]],\"roots\":[0]}"],[20,5,5,5]],[["retained","{\"n\":3,\"size\":[4,6,8],\"edges\":[[0,1],[1,2],[2,1]],\"roots\":[0]}"],[18,14,8]],[["retained","{\"n\":5,\"size\":[1,2,3,4,5],\"edges\":[[0,2],[1,2],[2,3]],\"roots\":[0,1]}"],[1,2,7,4,0]],[["retained","{\"n\":4,\"size\":[3,3,3,3],\"edges\":[[0,1]],\"roots\":[0]}"],[6,3,0,0]],[["retained","{\"n\":2,\"size\":[7,9],\"edges\":[[0,0],[0,1],[1,1]],\"roots\":[0]}"],[16,9]],[["retained","{\"n\":1,\"size\":[5],\"edges\":[],\"roots\":[]}"],[0]],[["retained","{\"n\":12,\"size\":[1,1,2,4,9,6,3,9,7,6,6,4],\"edges\":[[0,4],[4,0],[0,4],[0,4],[8,4],[4,8],[0,0],[0,4],[0,4],[4,8],[0,8],[4,8],[8,8],[4,4],[8,0],[0,4],[0,8],[0,8],[8,0],[0,4]],\"roots\":[0]}"],[17,0,0,0,9,0,0,0,7,0,0,0]],[["retained","{\"n\":15,\"size\":[5,8,7,7,4,8,5,6,7,2,3,9,2,6,8],\"edges\":[[11,8],[7,11],[9,2],[6,5],[6,10],[5,1],[12,9],[0,8],[6,4],[6,3],[3,4],[1,2],[3,2],[12,1],[11,0],[5,3],[1,3],[3,14],[0,12],[11,6],[4,1],[10,1],[7,7],[11,6],[4,8],[7,12],[1,14],[11,0],[7,14],[6,14]],\"roots\":[0,3]}"],[9,8,7,11,4,0,0,0,7,2,0,0,4,0,8]],[["retained","{\"n\":20,\"size\":[7,3,5,4,3,9,4,6,2,3,6,2,3,2,5,5,2,8,2,3],\"edges\":[[12,8],[0,8],[4,4],[16,4],[4,4],[12,0],[12,0],[4,16],[12,16],[12,16],[4,12],[8,8],[12,8],[8,4],[4,4],[8,4],[16,8],[4,4],[8,4],[8,8],[0,8],[4,4],[0,8],[4,16],[12,16]],\"roots\":[1,2,5]}"],[0,3,5,0,0,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],[["idom","{\"n\":5,\"size\":[0,10,20,30,40],\"edges\":[[0,1],[0,2],[1,3],[2,3],[3,4]],\"roots\":[0]}"],["root",0,0,0,3]],[["chain",""],[100000,50000,1]],[["skip",""],[100000,1,true]]]},
    solution: {
      approach: `<p>(1) Super-root S with edges to all roots. (2) Iterative DFS from S gives a postorder number per reachable node and the reverse-postorder list. (3) Cooper–Harvey–Kennedy: initialise idom[S] = S; loop over nodes in reverse postorder computing idom from already-processed predecessors via <code>intersect</code>; repeat until nothing changes (usually 2–3 rounds). (4) Retained sizes: start with own size; walk nodes in postorder and add each node's total into its idom. This is how heap-snapshot tools compute the "Retained Size" column.</p>`,
      code: { lang: 'js', run: true, code: `function retainedSizes(n, size, edges, roots) {
  const S = n;                                       // virtual super-root
  const succ = Array.from({ length: n + 1 }, () => []), pred = Array.from({ length: n + 1 }, () => []);
  const addEdge = (a, b) => { succ[a].push(b); pred[b].push(a); };
  for (const [a, b] of edges) addEdge(a, b);
  for (const r of roots) addEdge(S, r);

  // 1) iterative DFS postorder from S
  const po = new Int32Array(n + 1).fill(-1), order = [];          // order = nodes in postorder
  const visited = new Uint8Array(n + 1), stack = [[S, 0]];
  visited[S] = 1;
  while (stack.length) {
    const top = stack[stack.length - 1], [v, i] = top;
    if (i < succ[v].length) {
      top[1]++;
      const w = succ[v][i];
      if (!visited[w]) { visited[w] = 1; stack.push([w, 0]); }
    } else { po[v] = order.length; order.push(v); stack.pop(); }
  }
  // 2) Cooper-Harvey-Kennedy iterative dominators
  const idom = new Int32Array(n + 1).fill(-1);
  idom[S] = S;
  const intersect = (a, b) => {
    while (a !== b) {
      while (po[a] < po[b]) a = idom[a];
      while (po[b] < po[a]) b = idom[b];
    }
    return a;
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (let k = order.length - 1; k >= 0; k--) {               // reverse postorder
      const b = order[k];
      if (b === S) continue;
      let newIdom = -1;
      for (const p of pred[b]) {
        if (po[p] === -1 || idom[p] === -1) continue;           // unreachable or not processed yet
        newIdom = newIdom === -1 ? p : intersect(p, newIdom);
      }
      if (newIdom !== -1 && idom[b] !== newIdom) { idom[b] = newIdom; changed = true; }
    }
  }
  // 3) sum sizes bottom-up over the dominator tree
  const retained = new Array(n).fill(0);
  const acc = new Float64Array(n + 1);
  for (const v of order) if (v !== S) acc[v] = size[v];
  for (const v of order) {                                        // postorder: subtree before parent
    if (v === S) continue;
    retained[v] = acc[v];
    if (idom[v] !== S) acc[idom[v]] += acc[v];
  }
  return { retained, idom: Array.from(idom.slice(0, n)).map((d) => (d === S ? 'root' : d)) };
}

// R=0, A=1, B=2, C=3, D=4
const res = retainedSizes(5, [0, 10, 20, 30, 40], [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]], [0]);
console.log('idom    ', JSON.stringify(res.idom));        // ["root",0,0,0,3]
console.log('retained', JSON.stringify(res.retained));    // [100,10,20,70,40]` },
      dry: { head: ['node', 'preds', 'idom', 'retained = own + dominated subtree'], rows: [['R (0)', 'super-root', 'root', '0 + 10 + 20 + 70 = 100'], ['A (1)', 'R', 'R', '10'], ['B (2)', 'R', 'R', '20'], ['C (3)', 'A, B', H.c('y', 'intersect(A, B) = R'), '30 + 40 = 70'], ['D (4)', 'C', 'C', '40']] },
      complexity: `<p>DFS O(n + E). Cooper–Harvey–Kennedy is O(n<sup>2</sup>) worst case but runs in a few linear passes on real heaps; Lengauer–Tarjan gives O(E·α(n)) if you need a guarantee. Summation O(n). Space O(n + E).</p>`,
      followUps: ['Implement Lengauer–Tarjan and compare on a 10<sup>6</sup>-node graph', 'Ignore weak edges (WeakMap keys) like DevTools does', 'Report the top 10 objects by retained size with their retainer paths']
    }
  });

  practice.push({
    title: 'Implement a Generational Scavenger (Cheney Copying + Promotion)',
    level: 'Hard', tags: ['garbage collection', 'BFS', 'simulation'], companies: ['Google', 'Oracle', 'Apple'],
    statement: `<p>Model V8's young generation. Objects live in <code>from</code> (an array of <code>{ name, age, refs }</code>, where <code>refs</code> holds <b>indexes</b> into <code>from</code> or <code>{ old: k }</code> for old-space objects). Old space is an array of objects whose refs may point into <code>from</code> (old → young pointers, recorded in <code>rememberedSet</code> as old indexes). Implement <code>scavenge(from, old, roots, rememberedSet)</code>: copy every live young object exactly once, Cheney-style (breadth-first with a scan pointer and <b>forwarding addresses</b>); objects with <code>age ≥ 1</code> before this GC are <b>promoted</b> (appended to old space) instead; fix up all references (roots, copied objects, promoted objects, remembered old objects). Return the new <code>to</code>, <code>old</code>, <code>roots</code> and the number freed.</p>`,
    constraints: `<p>Up to 10<sup>5</sup> young objects. No recursion. Each live object copied once; dead objects never touched.</p>`,
    example: `<p>from = [A(age0) → B, B(age1), C(age0) → A, D(age0)], roots = [0], old = [O → young C], rememberedSet = [0]. Live: A (root), B (via A), C (via old O), and A again via C (already forwarded). B is promoted (age was 1). D is dead. Result: to = [A, C] (age 1), old = [O, B], freed = 1.</p>`,
    brute: { why: `<p>A naive collector marks with recursion (stack overflow on long chains), then copies objects in a second pass and fixes pointers by searching for each object's new index (O(n) per pointer → O(n<sup>2</sup>)). It may also copy shared objects twice, breaking identity (two copies of the "same" object).</p>`, code: `function scavengeNaive(from, roots) {
  const live = new Set();
  const mark = (i) => { if (live.has(i)) return; live.add(i); from[i].refs.forEach((r) => typeof r === 'number' && mark(r)); };  // recursive
  roots.forEach(mark);
  const to = [...live].map((i) => ({ ...from[i], refs: from[i].refs.slice() }));
  const indexOfOld = [...live];
  to.forEach((o) => { o.refs = o.refs.map((r) => (typeof r === 'number' ? indexOfOld.indexOf(r) : r)); });  // O(n) lookup per pointer
  return { to, roots: roots.map((r) => indexOfOld.indexOf(r)) };
}` },
    mcq: { q: 'What is a <b>forwarding address</b> used for in a copying collector?', options: ['After copying an object, the old copy records its new location so later pointers to it are redirected instead of copying it again', 'It forwards the object to the old generation immediately', 'It is the address of the next free byte', 'It forwards GC requests to another thread'], answer: 0, explain: 'The first time an object is reached it is copied and its old slot gets a forwarding pointer. Every later reference finds the forwarding pointer and is updated to the copy, preserving identity and sharing.' },
    hints: [`<p>Hint 1: Keep <code>forward[i]</code> for each young object: <code>null</code> (not yet copied) or a location <code>{ space: 'to' | 'old', index }</code>. A function <code>evacuate(i)</code> copies or promotes on first visit and returns the location.</p>`, `<p>Hint 2: Cheney's trick: the destination arrays themselves are the BFS queue. Keep a worklist of newly copied objects (to or old) whose refs still point into from-space, and process it until empty.</p>`, `<p>Hint 3: Order: evacuate roots → fix refs of remembered old objects (they act as extra roots) → drain the worklist, rewriting each young ref via <code>evacuate</code>. Increment age on copy. freed = from.length − number of evacuated objects.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(json) {\n  if (json === 'BIG') { var from = []; for (var i = 0; i < 100000; i++) from.push({ name: 'n' + i, age: 0, refs: i + 1 < 100000 ? [i + 1] : [] }); var r = scavenge(from, [], [0], []); return [r.to.length, r.to[0].refs, r.to[99999].refs, r.freed, r.old.length]; }\n  var a = JSON.parse(json), before = JSON.stringify([a.from, a.old]);\n  var res = scavenge(a.from, a.old, a.roots, a.remembered);\n  return { to: res.to, old: res.old, roots: res.roots, freed: res.freed, inputUntouched: JSON.stringify([a.from, a.old]) === before };\n}"},"cases":[[["{\"from\":[{\"name\":\"A\",\"age\":0,\"refs\":[1]},{\"name\":\"B\",\"age\":1,\"refs\":[]},{\"name\":\"C\",\"age\":0,\"refs\":[0]},{\"name\":\"D\",\"age\":0,\"refs\":[]}],\"old\":[{\"name\":\"O\",\"age\":5,\"refs\":[2]}],\"roots\":[0],\"remembered\":[0]}"],{"to":[{"name":"A","age":1,"refs":[{"old":1}]},{"name":"C","age":1,"refs":[0]}],"old":[{"name":"O","age":5,"refs":[1]},{"name":"B","age":2,"refs":[]}],"roots":[0],"freed":1,"inputUntouched":true}],[["{\"from\":[],\"old\":[],\"roots\":[],\"remembered\":[]}"],{"to":[],"old":[],"roots":[],"freed":0,"inputUntouched":true}],[["{\"from\":[{\"name\":\"X\",\"age\":0,\"refs\":[]}],\"old\":[],\"roots\":[],\"remembered\":[]}"],{"to":[],"old":[],"roots":[],"freed":1,"inputUntouched":true}],[["{\"from\":[{\"name\":\"A\",\"age\":0,\"refs\":[1]},{\"name\":\"B\",\"age\":0,\"refs\":[0]}],\"old\":[],\"roots\":[0],\"remembered\":[]}"],{"to":[{"name":"A","age":1,"refs":[1]},{"name":"B","age":1,"refs":[0]}],"old":[],"roots":[0],"freed":0,"inputUntouched":true}],[["{\"from\":[{\"name\":\"A\",\"age\":1,\"refs\":[]}],\"old\":[],\"roots\":[0],\"remembered\":[]}"],{"to":[],"old":[{"name":"A","age":2,"refs":[]}],"roots":[{"old":0}],"freed":0,"inputUntouched":true}],[["{\"from\":[{\"name\":\"A\",\"age\":0,\"refs\":[]}],\"old\":[],\"roots\":[0,0],\"remembered\":[]}"],{"to":[{"name":"A","age":1,"refs":[]}],"old":[],"roots":[0,0],"freed":0,"inputUntouched":true}],[["{\"from\":[{\"name\":\"A\",\"age\":0,\"refs\":[{\"old\":0}]}],\"old\":[{\"name\":\"O\",\"age\":3,\"refs\":[]}],\"roots\":[0],\"remembered\":[]}"],{"to":[{"name":"A","age":1,"refs":[{"old":0}]}],"old":[{"name":"O","age":3,"refs":[]}],"roots":[0],"freed":0,"inputUntouched":true}],[["{\"from\":[{\"name\":\"A\",\"age\":0,\"refs\":[2,1]},{\"name\":\"B\",\"age\":0,\"refs\":[]},{\"name\":\"C\",\"age\":0,\"refs\":[]}],\"old\":[],\"roots\":[0],\"remembered\":[]}"],{"to":[{"name":"A","age":1,"refs":[1,2]},{"name":"C","age":1,"refs":[]},{"name":"B","age":1,"refs":[]}],"old":[],"roots":[0],"freed":0,"inputUntouched":true}],[["{\"from\":[{\"name\":\"A\",\"age\":0,\"refs\":[]},{\"name\":\"B\",\"age\":0,\"refs\":[0]}],\"old\":[{\"name\":\"O\",\"age\":1,\"refs\":[1]}],\"roots\":[],\"remembered\":[0]}"],{"to":[{"name":"B","age":1,"refs":[1]},{"name":"A","age":1,"refs":[]}],"old":[{"name":"O","age":1,"refs":[0]}],"roots":[],"freed":0,"inputUntouched":true}],[["BIG"],[100000,[1],[],0,0]]]},
    solution: {
      approach: `<p>Each young object is evacuated at most once (forwarding table), so sharing and cycles are preserved. Destinations double as the BFS queue (Cheney), so there is no recursion and no separate mark phase: <b>marking and copying happen together</b>, and cost is proportional to live objects only. Remembered old objects are treated as roots, exactly like V8's remembered set, so old space is never scanned in full.</p>`,
      code: { lang: 'js', run: true, code: `function scavenge(from, old, roots, rememberedSet) {
  const to = [];
  old = old.slice();
  const forward = new Array(from.length).fill(null);
  const work = [];                                       // objects whose refs need fixing

  function evacuate(i) {                                 // returns the new reference value
    if (forward[i]) return forward[i].ref;
    const o = from[i];
    const copy = { name: o.name, age: o.age + 1, refs: o.refs.slice() };
    let ref;
    if (o.age >= 1) { old.push(copy); ref = { old: old.length - 1 }; }   // promote
    else { to.push(copy); ref = to.length - 1; }                          // copy to to-space
    forward[i] = { ref };
    work.push(copy);
    return ref;
  }
  const fix = (obj) => { obj.refs = obj.refs.map((r) => (typeof r === 'number' ? evacuate(r) : r)); };

  const newRoots = roots.map(evacuate);
  for (const k of rememberedSet) { old[k] = { ...old[k], refs: old[k].refs.slice() }; fix(old[k]); }
  while (work.length) fix(work.shift());                // Cheney scan (BFS)
  const evacuated = forward.filter(Boolean).length;
  return { to, old, roots: newRoots, freed: from.length - evacuated };
}

const from = [
  { name: 'A', age: 0, refs: [1] },        // 0
  { name: 'B', age: 1, refs: [] },         // 1  survived once already -> will be promoted
  { name: 'C', age: 0, refs: [0] },        // 2  only reachable from old space
  { name: 'D', age: 0, refs: [] }          // 3  garbage
];
const old = [{ name: 'O', age: 5, refs: [2] }];
const r = scavenge(from, old, [0], [0]);
const show = (o) => o.name + '(age ' + o.age + ') -> ' + JSON.stringify(o.refs);
console.log('to :', r.to.map(show).join(' | '));
console.log('old:', r.old.map(show).join(' | '));
console.log('roots:', JSON.stringify(r.roots), 'freed:', r.freed);` },
      dry: { head: ['step', 'action', 'to-space', 'old space', 'worklist'], rows: [['roots', 'evacuate A (age 0 → copy)', '[A]', '[O]', '[A]'], ['remembered O', 'fix O.refs: evacuate C → copy', '[A, C]', '[O → C]', '[A, C]'], ['scan A', 'evacuate B (age 1 → promote)', '[A, C]', '[O, B]', '[C, B]'], ['scan C', 'ref A already forwarded → reuse', '[A, C]', '[O, B]', '[B]'], ['scan B', 'no refs', '[A, C]', '[O, B]', '[]'], ['done', 'D never touched', '-', '-', H.c('g', 'freed = 1')]] },
      complexity: `<p>O(L + R) where L = live young objects and R = their references plus remembered slots. Dead objects cost nothing, which is the whole point of a copying young generation.</p>`,
      followUps: ['Parallelise: how would multiple threads avoid copying the same object twice? (atomic forwarding pointers)', 'Add a write barrier that maintains rememberedSet when old objects get new young refs', 'Why does promoting too early (age threshold 0) hurt the old generation?']
    }
  });

  practice.push({
    title: 'Mini Engine: Hidden Classes + Per-Site Inline Caches',
    level: 'Hard', tags: ['hidden classes', 'inline caches', 'design'], companies: ['Google', 'Mozilla', 'Bloomberg'],
    statement: `<p>Build a tiny object model like V8's. <code>Shape</code>s form a transition tree (root = empty shape; <code>shape.add(key)</code> returns the shared child). <code>EngineObject</code> stores values in a <code>slots</code> array and points to its shape. Implement <code>get(obj, key, site)</code> where <code>site</code> is an inline cache object belonging to one call site: it caches up to 4 <code>(shapeId → slotIndex)</code> pairs; beyond that the site becomes megamorphic and uses the slow path (search the shape's key list) every time. Report per-site hit rates for a monomorphic workload and a megamorphic one.</p>`,
    constraints: `<p>Up to 10<sup>6</sup> gets. Shape lookups must be shared (the same key order always yields the same shape object). Gets on a monomorphic site must not search the key list after the first miss.</p>`,
    example: `<p>Create 1,000 objects via <code>{x, y}</code> and read <code>x</code> 1,000 times at site S1: 1 miss + 999 hits (monomorphic). Create objects with 6 different key orders and read <code>x</code> at site S2: misses until 4 entries, then megamorphic, and every later read uses the slow path.</p>`,
    brute: { why: `<p>Without shapes, each object would store its own key→index dictionary (memory per object) and every <code>get</code> does a hash/linear lookup. Without inline caches, even with shared shapes every <code>get</code> searches the shape's key list. Both throw away the key insight: objects with the same shape need the lookup done <b>once per site</b>.</p>`, code: `class DictObject {
  constructor() { this.props = new Map(); }           // per-object dictionary: no sharing
  set(k, v) { this.props.set(k, v); }
  get(k) { return this.props.get(k); }                // hash lookup on every access
}` },
    mcq: { q: 'In this model, why must <code>shape.add(key)</code> return an <b>existing</b> child shape when one exists?', options: ['So objects built the same way share one shape, which is what makes IC entries reusable across objects', 'To save one line of code', 'Because JavaScript forbids duplicate objects', 'To keep keys sorted'], answer: 0, explain: 'Sharing is the entire point: an IC entry keyed by shape id helps every object with that shape. Fresh shapes per object would make every site megamorphic.' },
    hints: [`<p>Hint 1: <code>Shape</code> = { id, keys (array), index (Map key → slot), transitions (Map key → Shape) }. The root shape has no keys. <code>add(k)</code> looks up <code>transitions</code> first.</p>`, `<p>Hint 2: <code>EngineObject.set(k, v)</code>: if the shape has k, overwrite the slot; else move to <code>shape.add(k)</code> and push v onto <code>slots</code>.</p>`, `<p>Hint 3: Site = { entries: [], mega: false, hits, misses, slow }. In <code>get</code>: if not mega, scan entries for the object's shape id → hit; otherwise slow-lookup via <code>shape.index</code>, then add an entry or flip to mega (clear entries). Count everything.</p>`],
    tests: {"sig":"string int -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, n) {\n  var stats = function (s) { return [s.hits, s.misses, s.mega, s.entries.length]; };\n  var ord = [['x', 'y'], ['y', 'x'], ['x', 'z'], ['z', 'x'], ['x', 'y', 'z'], ['w', 'x']];\n  if (kind === 'mono') { var s1 = newSite('s'); for (var i = 0; i < n; i++) get(build(['x', 'y'], i), 'x', s1); return stats(s1); }\n  if (kind === 'monoSameObj') { var s0 = newSite('s'); var o = build(['x', 'y'], 5); var v = 0; for (var i0 = 0; i0 < n; i0++) v += get(o, 'x', s0); return stats(s0).concat([v]); }\n  if (kind === 'six') { var s2 = newSite('s'); for (var j = 0; j < n; j++) get(build(ord[j % 6], j), 'x', s2); return stats(s2); }\n  if (kind === 'four') { var s3 = newSite('s'); for (var k = 0; k < n; k++) get(build(ord[k % 4], k), 'x', s3); return stats(s3); }\n  if (kind === 'five') { var s4 = newSite('s'); for (var m = 0; m < n; m++) get(build(ord[m % 5], m), 'x', s4); return stats(s4); }\n  if (kind === 'values') { var s5 = newSite('s'); return [get(build(['y', 'x'], 7), 'x', s5), get(build(['x', 'y'], 8), 'x', s5), get(build(['y', 'x'], 9), 'x', s5)]; }\n  if (kind === 'missingKey') { var s6 = newSite('s'); var r = get(build(['y'], 1), 'x', s6); return [r === undefined, s6.misses]; }\n  if (kind === 'sharing') { var a = build(['p', 'q'], 1), b = build(['p', 'q'], 2), c = build(['q', 'p'], 3); return [a.shape === b.shape, a.shape === c.shape, a.shape.keys, ROOT_SHAPE.add('p') === ROOT_SHAPE.add('p')]; }\n  if (kind === 'slots') { var e = new EngineObject(); e.set('a', 1); e.set('b', 2); e.set('a', 3); return [e.slots, e.shape.keys]; }\n  if (kind === 'slow') { var s7 = newSite('s'); for (var q = 0; q < n; q++) get(build(ord[q % 6], q), 'x', s7); return s7.slow === s7.misses; }\n}"},"cases":[[["mono",1000],[999,1,false,1]],[["monoSameObj",1000000],[999999,1,false,1,5000000]],[["six",1000],[0,1000,true,0]],[["four",1000],[996,4,false,4]],[["five",5],[0,5,true,0]],[["values",0],[7,8,9]],[["missingKey",0],[true,1]],[["sharing",0],[true,false,["p","q"],true]],[["slots",0],[[3,2],["a","b"]]],[["slow",600],true]]},
    solution: {
      approach: `<p>Shapes give structural sharing (memory and identity); inline caches give per-site memoisation of "shape → slot". Together they turn property access into "compare one shape id, load one array slot" for monomorphic sites, the same fast path V8 emits in machine code.</p>`,
      code: { lang: 'js', run: true, code: `let nextShapeId = 0;
class Shape {
  constructor(keys) { this.id = nextShapeId++; this.keys = keys; this.index = new Map(keys.map((k, i) => [k, i])); this.transitions = new Map(); }
  add(key) {
    let child = this.transitions.get(key);
    if (!child) { child = new Shape([...this.keys, key]); this.transitions.set(key, child); }   // shared transition
    return child;
  }
}
const ROOT_SHAPE = new Shape([]);

class EngineObject {
  constructor() { this.shape = ROOT_SHAPE; this.slots = []; }
  set(key, value) {
    const i = this.shape.index.get(key);
    if (i !== undefined) { this.slots[i] = value; return; }
    this.shape = this.shape.add(key);
    this.slots.push(value);
  }
}
const newSite = (name) => ({ name, entries: [], mega: false, hits: 0, misses: 0, slow: 0 });

function get(obj, key, site) {
  if (!site.mega) {
    for (const e of site.entries) if (e.shapeId === obj.shape.id) { site.hits++; return obj.slots[e.slot]; }
  }
  site.misses++; site.slow++;
  const slot = obj.shape.index.get(key);                                  // slow path
  if (!site.mega) {
    if (site.entries.length < 4) site.entries.push({ shapeId: obj.shape.id, slot });
    else { site.mega = true; site.entries = []; }
  }
  return slot === undefined ? undefined : obj.slots[slot];
}
function build(order, i) { const o = new EngineObject(); for (const k of order) o.set(k, k === 'x' ? i : 0); return o; }

const S1 = newSite('S1 (one order)'), S2 = newSite('S2 (six orders)');
const orders = [['x', 'y'], ['y', 'x'], ['x', 'z'], ['z', 'x'], ['x', 'y', 'z'], ['w', 'x']];
let sum1 = 0, sum2 = 0;
for (let i = 0; i < 1000; i++) sum1 += get(build(['x', 'y'], i), 'x', S1);
for (let i = 0; i < 1000; i++) sum2 += get(build(orders[i % 6], i), 'x', S2);
for (const s of [S1, S2]) console.log(s.name.padEnd(17), 'hits', String(s.hits).padStart(4), 'misses', String(s.misses).padStart(4), s.mega ? 'MEGAMORPHIC' : 'entries ' + s.entries.length);
console.log('sums equal:', sum1 === sum2, '| shapes created:', nextShapeId);` },
      dry: { head: ['get #', 'object shape', 'site S2 entries', 'result'], rows: [['1', '{x,y}', '[]', 'miss → add (1)'], ['2', '{y,x}', '1', 'miss → add (2)'], ['3', '{x,z}', '2', 'miss → add (3)'], ['4', '{z,x}', '3', 'miss → add (4)'], ['5', '{x,y,z}', '4 (full)', H.c('r', 'miss → megamorphic')], ['6+', 'any', 'cleared', 'slow path every time']] },
      complexity: `<p>Monomorphic hit: O(1) (one comparison + array load). Polymorphic: ≤ 4 comparisons. Megamorphic: a Map lookup per get (in V8, the global stub cache). Shapes: one per distinct key-order prefix.</p>`,
      followUps: ['Add delete: last-key delete rolls back to the parent shape, otherwise switch the object to dictionary mode', 'Add prototype lookups with a validity cell', 'Implement a global megamorphic stub cache keyed by (shapeId, key) instead of the slow path']
    }
  });

  practice.push({
    title: 'Incremental Tri-Color Marking with a Write Barrier',
    level: 'Hard', tags: ['garbage collection', 'concurrency', 'invariants'], companies: ['Google', 'Microsoft', 'Discord'],
    statement: `<p>Implement <code>class IncrementalMarker</code> over a heap (<code>Map&lt;id, Set&lt;id&gt;&gt;</code> of references) that marks in small slices: <code>start(roots)</code>, <code>step(budget)</code> (scan at most <code>budget</code> grey objects; returns true when marking is complete), <code>write(host, target)</code> (the mutator adds a reference <code>host → target</code>), <code>unlink(host, target)</code>, and <code>sweep()</code> (returns the ids freed). The mutator runs <b>between</b> steps. Your write barrier must guarantee that no reachable object is ever freed. Show a schedule where marking <b>without</b> the barrier frees a live object.</p>`,
    constraints: `<p>Up to 10<sup>5</sup> objects; each step O(budget + scanned edges). The barrier must be O(1).</p>`,
    example: `<p>Heap: root → A, A → B, B → C. Step 1 scans root and A (A black, B grey). Mutator: <code>write(A, C)</code>, then <code>unlink(B, C)</code>. Now C is reachable only from <b>black</b> A, which will never be scanned again. Without a barrier, C stays white and is swept while still in use. With a Dijkstra-style insertion barrier, <code>write(A, C)</code> greys C, and it survives.</p>`,
    brute: { why: `<p>The simplest correct approach is <b>stop-the-world</b>: pause the program and mark everything at once. It is correct but the pause is proportional to the live heap (hundreds of ms for big heaps). Making marking incremental without a barrier is fast but <b>wrong</b>, as the example shows.</p>`, code: `function markStopTheWorld(heap, roots) {
  const black = new Set(roots), work = [...roots];       // program paused for the whole loop
  while (work.length) {
    const x = work.pop();
    for (const y of heap.get(x) || []) if (!black.has(y)) { black.add(y); work.push(y); }
  }
  return [...heap.keys()].filter((id) => !black.has(id));   // garbage
}` },
    mcq: { q: 'Which invariant does a Dijkstra-style insertion barrier maintain during incremental marking?', options: ['No black object points to a white object', 'No white object points to a grey object', 'All objects are grey until the end', 'Roots are always white'], answer: 0, explain: 'If black objects could point to white ones, those white objects might never be discovered (black objects are not rescanned). Greying the target on every store into a black host keeps the strong tri-color invariant.' },
    hints: [`<p>Hint 1: Colors: white (not in <code>color</code> map), grey (in worklist), black (scanned). <code>shade(x)</code>: if white, make grey and push.</p>`, `<p>Hint 2: <code>step(budget)</code>: pop up to <code>budget</code> greys; for each, shade all its children, then mark it black. Complete when the worklist is empty.</p>`, `<p>Hint 3: Barrier in <code>write(host, target)</code>: add the edge, and if marking is active and <code>host</code> is black, shade <code>target</code>. Also allocate new objects black during marking. Add a flag to disable the barrier to demonstrate the bug.</p>`],
    tests: {"sig":"string int -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, n) {\n  var mk = function (spec) { var h = new Map(); Object.keys(spec).forEach(function (k) { h.set(k, new Set(spec[k])); }); return h; };\n  var run = function (barrier) {\n    var heap = mk({ root: ['A'], A: ['B'], B: ['C'], C: [] }), m = new IncrementalMarker(heap, { barrier: barrier });\n    m.start(['root']); m.step(2); m.write('A', 'C'); m.unlink('B', 'C'); while (!m.step(1)) {} return m.sweep();\n  };\n  if (kind === 'noBarrier') return run(false);\n  if (kind === 'barrier') return run(true);\n  if (kind === 'garbage') { var h1 = mk({ root: ['A'], A: [], X: ['A'], Y: ['Z'], Z: ['Y'] }), m1 = new IncrementalMarker(h1); m1.start(['root']); while (!m1.step(10)) {} return m1.sweep().sort(); }\n  if (kind === 'budget') { var h2 = mk({ r: ['a'], a: ['b'], b: ['c'], c: [] }), m2 = new IncrementalMarker(h2); m2.start(['r']); var done = []; for (var i = 0; i < 4; i++) done.push(m2.step(1)); return done; }\n  if (kind === 'budgetBig') { var h3 = mk({ r: ['a', 'b', 'c'], a: [], b: [], c: [] }), m3 = new IncrementalMarker(h3); m3.start(['r']); return [m3.step(1), m3.step(100)]; }\n  if (kind === 'cycle') { var h4 = mk({ r: ['a'], a: ['b'], b: ['a'] }), m4 = new IncrementalMarker(h4); m4.start(['r']); while (!m4.step(1)) {} return m4.sweep(); }\n  if (kind === 'sweepRemoves') { var h5 = mk({ r: [], dead: [] }), m5 = new IncrementalMarker(h5); m5.start(['r']); while (!m5.step(5)) {} m5.sweep(); return [h5.has('dead'), h5.has('r')]; }\n  if (kind === 'chain') { var spec = {}; for (var j = 0; j < n; j++) spec['o' + j] = j + 1 < n ? ['o' + (j + 1)] : []; var h6 = mk(spec), m6 = new IncrementalMarker(h6); m6.start(['o0']); var steps = 0; while (!m6.step(1000)) steps++; return [m6.sweep().length, steps >= n / 1000 - 1]; }\n  if (kind === 'random') {\n    var seed = n, rnd = function (k) { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % k; };\n    var N = 60, spec2 = {}; for (var a = 0; a < N; a++) { var targets = []; for (var t = 0; t < 2; t++) targets.push('o' + rnd(N)); spec2['o' + a] = targets; }\n    var h7 = mk(spec2), m7 = new IncrementalMarker(h7, { barrier: true }), roots = ['o0', 'o1'];\n    var reachable = function () { var seen = new Set(roots), st = roots.slice(); while (st.length) { var x = st.pop(); h7.get(x).forEach(function (y) { if (!seen.has(y)) { seen.add(y); st.push(y); } }); } return seen; };\n    m7.start(roots);\n    for (var op = 0; op < 3000; op++) {\n      var live = Array.from(reachable());\n      var r = rnd(3);\n      if (r === 0) { m7.step(1 + rnd(3)); }\n      else if (r === 1) { m7.write(live[rnd(live.length)], live[rnd(live.length)]); }\n      else { var host = live[rnd(live.length)], outs = Array.from(h7.get(host)); if (outs.length) m7.unlink(host, outs[rnd(outs.length)]); }\n    }\n    while (!m7.step(10)) {}\n    var needed = reachable(), freed = m7.sweep();\n    return [freed.filter(function (id) { return needed.has(id); }).length, needed.size > 0];\n  }\n}"},"cases":[[["noBarrier",0],["C"]],[["barrier",0],[]],[["garbage",0],["X","Y","Z"]],[["budget",0],[false,false,false,true]],[["budgetBig",0],[false,true]],[["cycle",0],[]],[["sweepRemoves",0],[false,true]],[["chain",100000],[0,true]],[["random",1],[0,true]],[["random",99],[0,true]],[["random",12345],[0,true]]]},
    solution: {
      approach: `<p>Classic incremental tri-color marking with an insertion (Dijkstra) write barrier: every pointer store into an already-scanned (black) object shades the stored target, so the collector can never "miss" an object that the mutator hid behind a black object. V8 uses this idea (plus black allocation) so marking can run concurrently and incrementally with JavaScript.</p>`,
      code: { lang: 'js', run: true, code: `class IncrementalMarker {
  constructor(heap, { barrier = true } = {}) { this.heap = heap; this.barrier = barrier; this.color = new Map(); this.grey = []; this.marking = false; }
  shade(id) { if (!this.color.has(id)) { this.color.set(id, 'grey'); this.grey.push(id); } }
  start(roots) { this.marking = true; this.color.clear(); this.grey = []; roots.forEach((r) => this.shade(r)); }
  step(budget) {
    while (budget-- > 0 && this.grey.length) {
      const id = this.grey.pop();
      for (const child of this.heap.get(id) || []) this.shade(child);
      this.color.set(id, 'black');
    }
    return this.grey.length === 0;
  }
  write(host, target) {                                  // mutator store: host.ref = target
    this.heap.get(host).add(target);
    if (this.barrier && this.marking && this.color.get(host) === 'black') this.shade(target);   // write barrier
  }
  unlink(host, target) { this.heap.get(host).delete(target); }
  sweep() {
    const freed = [...this.heap.keys()].filter((id) => this.color.get(id) !== 'black');
    freed.forEach((id) => this.heap.delete(id));
    this.marking = false;
    return freed;
  }
}

function scenario(barrier) {
  const heap = new Map([['root', new Set(['A'])], ['A', new Set(['B'])], ['B', new Set(['C'])], ['C', new Set()]]);
  const m = new IncrementalMarker(heap, { barrier });
  m.start(['root']);
  m.step(2);               // scans root and A -> A is black, B is grey
  m.write('A', 'C');       // mutator: A.ref2 = C   (A is black!)
  m.unlink('B', 'C');      // mutator: B no longer points to C
  while (!m.step(1)) {}    // finish marking
  const freed = m.sweep();
  const stillUsed = heap.has('A') && [...(heap.get('A') || [])].includes('C');
  return 'barrier=' + barrier + ' freed=' + JSON.stringify(freed) + (stillUsed && freed.includes('C') ? '  <- BUG: A still references freed C' : '  (correct)');
}
console.log(scenario(false));
console.log(scenario(true));` },
      dry: { head: ['moment', 'root', 'A', 'B', 'C', 'note'], rows: [['start', 'grey', 'white', 'white', 'white', '-'], ['step(2)', 'black', 'black', 'grey', 'white', '-'], ['write(A, C)', 'black', 'black', 'grey', 'white / ' + H.c('g', 'grey with barrier'), 'black → white store'], ['unlink(B, C)', 'black', 'black', 'grey', 'same', 'only path is via black A'], ['finish + sweep', 'black', 'black', 'black', H.c('r', 'freed (no barrier)') + ' / ' + H.c('g', 'kept'), '-']] },
      complexity: `<p>Total marking work O(live objects + edges), split into slices of size <code>budget</code>. Barrier O(1) per pointer store. The cost moves from one long pause to small pauses plus a tiny tax on every write.</p>`,
      followUps: ['Implement a Yuasa (deletion/snapshot-at-the-beginning) barrier instead and compare', 'Allocate new objects black during marking: why is that necessary?', 'What extra synchronisation is needed when marking runs on another thread (concurrent marking)?']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push(
    { q: 'What does V8 do with a function that is declared but never called during page load?', options: ['Pre-parses it (grammar check only), no AST or bytecode until the first call', 'Compiles it straight to optimized machine code', 'Ignores it completely, even syntax errors', 'Interprets it once to collect feedback'], answer: 0, explain: 'Lazy parsing: the pre-parser checks grammar and scopes cheaply; full parsing and bytecode generation happen on the first call. That is also why a syntax error in an unused function still breaks the script.' },
    { q: 'Which statement about V8\'s execution tiers is correct?', options: ['Every function starts in Ignition; hot ones are tiered up to Sparkplug, Maglev and TurboFan using type feedback', 'All code is compiled by TurboFan before it runs', 'Sparkplug is the most aggressive optimizing compiler', 'Maglev is the bytecode interpreter'], answer: 0, explain: 'Ignition interprets bytecode; Sparkplug is a fast non-optimizing baseline compiler; Maglev is a fast mid-tier optimizer; TurboFan is the top-tier optimizer.' },
    { q: 'Two objects are created as <code>{a: 1, b: 2}</code> and <code>{b: 2, a: 1}</code>. Do they share a hidden class?', options: ['No: the same keys added in a different order follow different transitions', 'Yes: hidden classes ignore key order', 'Yes, but only in strict mode', 'Only if both are frozen'], answer: 0, explain: 'Hidden classes form a transition tree keyed by the order of property additions.' },
    { q: 'An inline cache at <code>o.x</code> has seen 6 different hidden classes. What state is it in?', options: ['Megamorphic', 'Monomorphic', 'Polymorphic', 'Uninitialized'], answer: 0, explain: 'V8 keeps up to 4 maps per site (polymorphic). Beyond that the site becomes megamorphic and uses the global stub cache.' },
    { q: 'Optimized code for <code>add(a, b)</code> assumed Smis. A call passes <code>1.5</code>. What happens?', options: ['A guard fails, the code deoptimizes to Ignition, and feedback is generalised', 'The result is silently truncated to 1', 'A TypeError is thrown', 'The optimized code is recompiled before the call returns, without leaving machine code'], answer: 0, explain: 'Speculation is protected by guards. A failed guard triggers an eager deopt; the result is still correct.' },
    { q: 'Which value is stored as a Smi in 64-bit Chrome/Node (pointer compression enabled)?', options: ['<code>1073741823</code>', '<code>1073741824</code>', '<code>0.5</code>', '<code>-0</code>'], answer: 0, explain: 'Smis are 31-bit with pointer compression: −2<sup>30</sup> … 2<sup>30</sup> − 1 = 1,073,741,823. Larger values, fractions and −0 become HeapNumbers (or raw doubles in double arrays).' },
    { q: 'Where does a local variable live if an inner arrow function that is returned uses it?', options: ['In a heap-allocated Context object shared by the closures of that scope', 'Only in the stack frame, copied into the closure', 'In the global object', 'In the feedback vector'], answer: 0, explain: 'Captured variables are context-allocated, so they survive after the outer function\'s frame is popped.' },
    { q: 'Why is a minor GC (scavenge) usually very fast?', options: ['It only copies live young objects; dead objects are never visited', 'It skips the roots', 'It only runs when the heap is empty', 'It frees memory by reference counting'], answer: 0, explain: 'A copying collector\'s cost is proportional to survivors. Since most young objects are dead, there is little to copy.' },
    { q: 'What is the job of the generational write barrier?', options: ['Record old-to-young pointers in a remembered set so a scavenge does not have to scan all of old space', 'Prevent writes to frozen objects', 'Stop the program during GC', 'Encrypt heap pointers'], answer: 0, explain: 'Old objects pointing to young ones act as extra roots for a minor GC; the barrier records those slots on every pointer store.' },
    { q: 'Two objects reference only each other and nothing else references them. In V8 they are…', options: ['collected at the next GC that covers them (tracing GC handles cycles)', 'leaked forever (reference counts never reach zero)', 'collected only if you call delete on both', 'moved to old space permanently'], answer: 0, explain: 'Tracing collectors free anything unreachable from roots, cycles included.' },
    { q: 'In a heap snapshot, an object has shallow size 200 B and retained size 5 MB. What does that mean?', options: ['The object is small itself, but 5 MB would be freed if it became unreachable', 'The snapshot is corrupted', 'The object is 5 MB and 200 B is compressed', 'It allocates 5 MB per second'], answer: 0, explain: 'Retained size is the size of the object plus everything it exclusively keeps alive (its dominator subtree).' },
    { q: 'Memory after each GC keeps rising while you repeat the same user action. Best next step?', options: ['Three-snapshot comparison and read the Retainers of objects allocated between snapshots 1 and 2', 'Raise --max-old-space-size and move on', 'Call global.gc() after each action', 'Convert all let to var'], answer: 0, explain: 'A rising floor is a leak signature. Snapshot comparison finds what grows per action; the retainers path finds who holds it.' },
    { q: 'Which change fixes a listener leak on <code>window</code> most robustly in modern code?', options: ['Pass an AbortController signal to addEventListener and abort it on cleanup', 'Use an arrow function instead of a named function', 'Wrap the handler in setTimeout', 'Store the handler in a WeakRef'], answer: 0, explain: 'One abort() removes every listener registered with that signal; arrow functions do not change retention, and WeakRef gives no timing guarantee.' }
  );

  /* ================= INTERVIEW ================= */
  interview.push(
    { q: 'Walk me through what happens from the moment V8 receives a JavaScript file until a hot function runs as optimized machine code.', level: 'I', a: `<p>(1) The <b>scanner</b> turns characters into tokens. (2) The <b>parser</b> builds an AST for code that runs now; inner functions are only <b>pre-parsed</b> (lazy parsing). (3) The bytecode generator emits <b>Ignition</b> bytecode and the AST is discarded. (4) Ignition interprets the bytecode and records <b>type feedback</b> (seen types and hidden classes) in a per-function feedback vector. (5) As the function gets hot, the tiering manager compiles it with <b>Sparkplug</b> (baseline, no optimization), then <b>Maglev</b> (fast optimizer), then <b>TurboFan</b> (top tier: inlining, escape analysis). (6) Optimized code embeds speculative assumptions protected by guards; if one fails, it <b>deoptimizes</b> back to Ignition. Browsers add streaming parsing and code caching on top.</p>`, followUps: ['What is OSR and when is it needed?', 'Why keep the interpreter if we have a JIT?', 'How does code caching change the picture on repeat visits?'] },
    { q: 'Is JavaScript interpreted or compiled?', level: 'B', a: `<p>Both, which is the point of a modern <b>JIT</b> (just-in-time) engine. Source is compiled to <b>bytecode</b> ahead of execution, then interpreted by Ignition. Code that runs often is compiled further to <b>machine code</b> at runtime, using what the interpreter observed (types, shapes) to specialise it. So "interpreted" describes how every function starts and "compiled" describes how hot code ends up. Saying "JIT-compiled with an interpreter tier" is the precise answer, and mentioning <code>--jitless</code> (interpreter-only mode used in locked-down environments) shows you understand the JIT is a performance feature, not required for correctness.</p>`, followUps: ['What is the trade-off of compiling everything eagerly?', 'What does warm-up mean for benchmarks?'] },
    { q: 'What are hidden classes and why should application developers care?', level: 'I', a: `<p>A hidden class (V8 "Map", elsewhere "Shape") describes an object's layout: which properties it has, in which slots, plus attributes and prototype. Objects that get the same properties <b>in the same order</b> share a hidden class, forming a transition tree. That lets the engine replace a dictionary lookup with "check the hidden class, load slot N". Developers should care because shape-unstable code (adding properties conditionally, different key orders from different factories, <code>delete</code> on non-last properties, changing field types) makes inline caches polymorphic or megamorphic and can push objects into slow dictionary mode. The practical rules: initialise every field in the constructor in a fixed order (class fields help), use <code>null</code> instead of omitting fields, and use <code>Map</code> for truly dynamic keys.</p>`, followUps: ['What happens when you delete the last-added property vs a middle one?', 'How do class fields affect hidden classes?', 'How would you prove two objects share a map?'] },
    { q: 'Explain monomorphic, polymorphic and megamorphic inline caches with an example.', level: 'A', a: `<p>Each property access site (e.g. <code>shape.area</code> inside <code>render</code>) owns a feedback slot. <b>Monomorphic</b>: it has seen one hidden class, so the fast path is one map comparison and one load. <b>Polymorphic</b>: 2–4 hidden classes; it checks a small list. <b>Megamorphic</b>: more than 4; V8 abandons the per-site list and uses a global stub cache keyed by (map, name), and optimizing compilers cannot inline a fixed-offset load. Example: a renderer that receives circles, squares and triangles created by three factories is polymorphic at <code>s.area</code>; add a fifth and sixth shape type with different key orders and it goes megamorphic. Fixes: one class/factory with identical fields, or split the hot loop per type, or normalise data at the boundary.</p>`, followUps: ['Is megamorphic always bad?', 'How does inlining interact with IC state?', 'How do prototype method calls get cached?'] },
    { q: 'What is deoptimization? Give real causes and how you would detect a deopt loop in production.', level: 'A', a: `<p>Optimized code is built on speculation (types, shapes, bounds, constant fields) protected by guards or code dependencies. When an assumption breaks, V8 <b>deoptimizes</b>: it reconstructs the interpreter frame from recorded frame state and continues in Ignition. Eager deopts come from failed guards (not a Smi, wrong map, out of bounds, hole, overflow, −0), lazy deopts from invalidated dependencies (prototype patched, "constant" field reassigned), and soft deopts from insufficient feedback. One deopt is normal; a <b>loop</b> (optimize/deopt repeatedly) wastes CPU. Detection: <code>node --trace-opt --trace-deopt</code> filtered by function, CPU profiles showing compile time, or Deopt Explorer on a <code>--log-deopt</code> log. Fix: make inputs type-stable at boundaries and keep object shapes consistent, then re-measure.</p>`, followUps: ['How does V8 rebuild the interpreter frame for inlined functions?', 'Why did try/catch stop being a deopt reason?', 'What is "insufficient type feedback"?'] },
    { q: '"Primitives are stored on the stack and objects on the heap." Is that true in JavaScript?', level: 'I', a: `<p>Not for V8. Every JS value is a <b>tagged</b> word. Small integers (<b>Smis</b>, 31-bit with pointer compression) are stored directly inside the word, so they need no heap allocation whether they sit in a frame slot or an object field. Everything else, including strings and most doubles (<b>HeapNumbers</b>), is a heap object and the word is a pointer (low bit 1). Locals captured by closures live in heap <b>Contexts</b>, not frames. Optimized code may keep doubles unboxed in CPU registers, and double arrays and typed arrays store raw doubles. Primitives behave like values because they are <b>immutable</b>, not because of where they live. The stack holds frames (arguments, locals, return addresses) and overflows with deep recursion.</p>`, followUps: ['What is pointer compression and what did it change?', 'When is a number boxed?', 'Why can a substring keep a large string alive?'] },
    { q: 'How does garbage collection work in V8? Describe both generations.', level: 'I', a: `<p>V8 uses <b>tracing</b> GC: objects reachable from roots (stack, globals, handles) survive; everything else, including cycles, is garbage. Based on the generational hypothesis, the heap is split. The <b>young generation</b> uses a parallel <b>scavenger</b>: bump allocation in a semi-space, then copy survivors into the other semi-space (Cheney-style), promoting objects that survive twice to old space; old→young pointers are found through a <b>remembered set</b> maintained by a <b>write barrier</b>. The <b>old generation</b> uses <b>mark-compact</b>: tri-color marking (mostly concurrent and incremental, with a marking barrier), concurrent sweeping into free lists, and compaction of fragmented pages. Orinoco keeps main-thread pauses short; Chrome also uses idle time.</p>`, followUps: ['Why is a scavenge cheap when most objects die?', 'What is premature promotion?', 'What do --max-semi-space-size and --max-old-space-size change?'] },
    { q: 'What is a memory leak in a garbage-collected language, and what are the most common causes in front-end code?', level: 'B', a: `<p>A leak is memory that is still <b>reachable</b> but will never be used again; the GC cannot free it because a reference path from a root still exists. Common front-end causes: event listeners on <code>window</code>/<code>document</code> or global stores never removed on unmount; <code>setInterval</code>/<code>requestAnimationFrame</code> loops never cancelled; <b>detached DOM nodes</b> kept in arrays, Maps or closures; unbounded caches; closures capturing large objects (shared Context); accidental globals in sloppy scripts; subscriptions (WebSocket, observables) not unsubscribed; and <code>console.log</code> of big objects while DevTools is open. The fixes share one idea: every subscription or registration needs a matching cleanup, and caches need bounds or weak keys.</p>`, followUps: ['How does AbortController simplify cleanup?', 'When is WeakMap the right tool?', 'How would you write a regression test for a leak?'] },
    { q: 'You suspect a memory leak in a single-page app. Walk me through how you would find and prove it.', level: 'A', a: `<p>(1) <b>Reproduce</b> with a repeatable action (open/close a modal, navigate A→B→A) and watch the Performance monitor or a Performance recording with Memory: after GCs, is the floor rising? (2) <b>Three snapshots</b> in the Memory panel: baseline, after N actions, after N more. (3) In snapshot 3, filter "Objects allocated between snapshot 1 and 2"; sort by retained size; also filter "Detached". (4) Open the <b>Retainers</b> panel for a leaked object and follow the path to a GC root; the first frame that is our code (a listener, a cache, a store) is the bug. (5) Fix (remove listener, clear interval, bound cache, WeakMap). (6) <b>Verify</b> with the same experiment: delta should be 0. Optionally automate with memlab in CI so it cannot regress.</p>`, followUps: ['Shallow vs retained size?', 'Why choose N = 7 instead of 1?', 'What changes when the leak is in a Web Worker?'] },
    { q: 'A Node.js service is OOM-killed every few days. heapUsed looks fine. What do you investigate?', level: 'E', a: `<p>First, separate <b>V8 heap</b> from <b>process memory</b>: compare <code>rss</code>, <code>heapUsed</code>, <code>external</code> and <code>arrayBuffers</code> from <code>process.memoryUsage()</code> over time. If heapUsed is flat but RSS grows: Buffers/ArrayBuffers (uploads, image processing, compression streams not consumed), native addons, too many worker threads (each has its own heap), or allocator fragmentation. If heapUsed grows: classic JS leak, capture evidence with <code>--heapsnapshot-near-heap-limit</code> or <code>--heapsnapshot-signal</code> on one instance taken out of rotation, then three-snapshot analysis. Also check container limits vs Node's default old-space size (Node sizes the heap from available memory; set <code>--max-old-space-size</code> explicitly below the container limit to leave room for external memory). Track per-endpoint memory with metrics to find which traffic correlates.</p>`, followUps: ['What are the costs and risks of taking a heap snapshot in production?', 'How do worker_threads affect memory?', 'What does MaxListenersExceededWarning tell you?'] },
    { q: 'What do WeakMap, WeakSet, WeakRef and FinalizationRegistry each give you, and when should you avoid them?', level: 'A', a: `<p><b>WeakMap/WeakSet</b>: keys held weakly with ephemeron semantics (a value lives only as long as its key); ideal for per-object metadata, caches keyed by objects, and private data, because entries disappear with the key. They are not iterable and have no size, by design, so GC timing stays unobservable. <b>WeakRef</b>: a reference that does not keep its target alive; <code>deref()</code> may return undefined after a GC. <b>FinalizationRegistry</b>: a callback some time after a registered object is collected. The spec gives <b>no guarantee</b> when (or whether) cleanup callbacks run, so never use them for correctness (closing files, releasing locks, billing). Use them only for optional cache cleanup, and prefer explicit <code>dispose</code>/<code>using</code> (explicit resource management) for real resources.</p>`, followUps: ['Why is a WeakMap value that references its own key not a leak?', 'Can primitives be WeakMap keys?', 'How would you build a cache that holds values weakly?'] },
    { q: 'Which is faster and why: <code>arr.push(x)</code> into <code>[]</code> or pre-sizing with <code>new Array(n)</code> and assigning?', level: 'I', a: `<p>It depends on what you measure, which is the real answer. <code>new Array(n)</code> creates a <b>holey</b> array (n holes), and its elements kind stays HOLEY forever, so every later read in optimized code needs a hole check and may consult the prototype chain. <code>[]</code> plus <code>push</code> keeps a <b>packed</b> kind (PACKED_SMI → PACKED_DOUBLE → PACKED_ELEMENTS as values demand). Pre-sizing can save a few reallocations while building, but push uses amortised growth, so building cost is similar. For data read many times, packed usually wins; for numeric data with a known size, a <b>typed array</b> beats both. I would measure with a warmed-up benchmark that keeps results alive, and not micro-optimize code that is not hot.</p>`, followUps: ['What is the elements-kind lattice?', 'Does Array.from({length: n}) create holes?', 'How do typed arrays change GC behavior?'] },
    { q: 'How do you write a micro-benchmark for JavaScript that does not lie?', level: 'E', a: `<p>(1) <b>Warm up</b> so you measure steady state, not Ignition plus compile time; report cold start separately if it matters. (2) Keep a <b>result sink</b> that you print, or the optimizer may delete the work (dead code elimination) or hoist it out of the loop. (3) Give each variant its <b>own function</b> so they do not pollute each other's feedback (one megamorphic site can slow all variants). (4) Use realistic, varied inputs (one constant input lets TurboFan constant-fold). (5) Run several batches and look at the distribution; watch GC (<code>--trace-gc</code>) since allocation-heavy variants pay later. (6) Test on target hardware/engines (V8, JSC, SpiderMonkey differ). (7) Prefer profiling the real app; a micro-benchmark only answers a narrow question. Tools: <code>mitata</code>, <code>tinybench</code>, Chrome Performance panel, <code>--cpu-prof</code>.</p>`, followUps: ['How can GC skew results between variants?', 'Why might the first variant measured always look slower?', 'When is a micro-benchmark the wrong tool?'] }
  );

  registerModule({
    id: 'js12',
    title: 'JS Engine Internals: V8, Memory & GC',
    lang: 'js',
    intro: `<p>You have written a lot of JavaScript by now. This module opens the hood. We follow your code through <b>V8</b> (the engine inside Chrome, Node.js, Deno and Edge): how text becomes tokens, an AST and <b>bytecode</b>; how the <b>Ignition</b> interpreter collects type feedback; how <b>Sparkplug, Maglev and TurboFan</b> turn hot code into fast machine code by making bets; and what happens when a bet fails (<b>deoptimization</b>).</p>
<p>Then we look at memory: <b>hidden classes</b> and <b>inline caches</b> (why object shape matters), the stack and the heap (Smis, HeapNumbers, closures' Contexts), <b>generational garbage collection</b> (scavenger + mark-compact), and finally the practical skill interviewers love: <b>finding memory leaks</b> with heap snapshots, retainer paths and the three-snapshot technique.</p>
<p>Every topic starts with an everyday analogy, has step-by-step visualizers you can feed your own input, runnable experiments ("which is faster and why?"), leak hunts, and an AI-era section on what to trust and verify.</p>`,
    goals: [
      'Explain the V8 pipeline end to end: scanner, parser, lazy parsing, Ignition bytecode, feedback vectors, Sparkplug, Maglev, TurboFan, OSR',
      'Predict when objects share hidden classes and when inline caches become polymorphic or megamorphic, and write shape-stable code',
      'Explain deoptimization (eager, lazy, soft), read a --trace-deopt line, and fix type or shape instability in hot paths',
      'Describe where values live (tagged words, Smis, HeapNumbers, frames, closure Contexts) and convert deep recursion to explicit stacks',
      'Explain generational GC (scavenger, promotion, write barriers, tri-color mark-compact) and read --trace-gc output',
      'Find, prove and fix memory leaks in browsers and Node using heap snapshots, retainers, three-snapshot comparison, WeakMap and AbortController'
    ],
    prereqs: `JS 4 (Scope, Hoisting, TDZ & Closures), JS 6 (Prototypes & Classes), JS 8 (Event Loop & async/await) and JS 9 (Map/Set/WeakMap). Helpful: DSA basics on graphs and BFS (used in GC and retainer-path problems).`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
