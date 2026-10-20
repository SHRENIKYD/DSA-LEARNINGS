(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function esc(s) { return H.esc(String(s)); }
  function out(lines) {
    var text = Array.isArray(lines) ? lines.join('\n') : (lines || '');
    return { type: 'text', label: 'Console output', html: text ? '<code>' + esc(text).replace(/\n/g, '<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  function note(label, htmlText) { return { type: 'text', label: label, html: htmlText }; }
  /* Turns a list of steps into frames for one fixed JS listing.
     step = { l: line | [lines], cls, envs: [[label, vals, hl]], st: [call stack], out: [lines], extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Code (highlighted line = running now)', lang: 'js', code: code, hl: hl }];
      (s.envs || []).forEach(function (e) { parts.push({ type: 'vars', label: e[0], vals: e[1], hl: e[2] || {} }); });
      if (s.st) parts.push({ type: 'stack', label: 'Call stack (top = running now)', items: s.st.slice(), hl: one(s.st.length - 1, 'cur') });
      (s.extra || []).forEach(function (p) { parts.push(p); });
      if (s.out !== undefined) parts.push(out(s.out));
      return { narr: s.narr, parts: parts };
    });
  }
  /* Scope-chain diagram: list = [{id, label}] from OUTERMOST (global, drawn at the top) to INNERMOST (bottom).
     Arrows go from each inner scope up to its outer scope, labelled "outer". */
  function chain(label, list, hl, ehl, tags) {
    var gap = 20, h = 10 + gap * (list.length - 1) + 12;
    var nodes = list.map(function (n, i) { return { id: n.id, label: n.label, x: 50, y: 10 + gap * i, shape: 'box' }; });
    var edges = [];
    for (var i = list.length - 1; i > 0; i--) edges.push([list[i].id, list[i - 1].id, 'outer']);
    return { type: 'graph', label: label, directed: true, height: h, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
  }
  function boxes(label, nodes, edges, hl, ehl, tags, height) {
    return {
      type: 'graph', label: label, directed: true, height: height || 60,
      nodes: nodes.map(function (n) { return { id: n.id, label: n.label || n.id, x: n.x, y: n.y, shape: 'box', w: n.w }; }),
      edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {}
    };
  }
  function words(input, def) {
    return String(input === undefined || input === null ? def : input).trim().split(/[\s,]+/).filter(function (w) { return w.length; });
  }

  /* ======================================================================
     TOPIC 1 — Global, function and block scope
     ====================================================================== */
  topics.push({
    title: 'Scope Basics: Global, Function and Block Scope',
    analogy: `<p>Think of a <b>house with rooms and cupboards</b>. Things on the <b>street</b> (global scope) can be seen by every house. Things in the <b>house</b> (function scope) can be used in every room of that house, but people on the street cannot see them. Things inside a <b>cupboard</b> (a block, the <code>{ }</code> of an <code>if</code> or a loop) are only visible while that cupboard is open. <code>let</code> and <code>const</code> respect cupboards. Old-school <code>var</code> ignores cupboards completely: whatever you put "in the cupboard" with <code>var</code> actually lands on the floor of the whole house.</p>`,
    explain: `<p><b>Scope</b> answers one simple question: <i>"From this line of code, which variables can I see?"</i> A variable is only usable inside the region of code where it was declared. JavaScript has three main kinds of region:</p>
      <ul>
        <li><b>Global scope</b> — code that is not inside any function or block. Visible everywhere.</li>
        <li><b>Function scope</b> — everything inside a function body (including its parameters). Created fresh <b>every time</b> the function is called.</li>
        <li><b>Block scope</b> — anything between <code>{</code> and <code>}</code>: <code>if</code>, <code>for</code>, <code>while</code>, <code>try/catch</code>, or a bare <code>{ }</code>. Only <code>let</code>, <code>const</code>, <code>class</code> (and, in strict mode, function declarations) live here.</li>
      </ul>
      <p>The single most important table in this topic:</p>
      ${H.table(['Keyword', 'Scope it lives in', 'Can re-declare?', 'Can re-assign?', 'Top-level in a classic script creates <code>window.x</code>?'], [
        ['<code>var</code>', H.c('y', 'function') + ' (ignores blocks)', H.c('g', 'yes'), H.c('g', 'yes'), H.c('r', 'yes')],
        ['<code>let</code>', H.c('g', 'block'), H.c('r', 'no (SyntaxError)'), H.c('g', 'yes'), H.c('g', 'no')],
        ['<code>const</code>', H.c('g', 'block'), H.c('r', 'no'), H.c('r', 'no (TypeError)'), H.c('g', 'no')],
        ['<code>function f(){}</code>', H.c('y', 'function') + ' (block in strict mode)', 'yes (last wins)', 'yes', H.c('r', 'yes')],
        ['<code>class C {}</code>', H.c('g', 'block'), H.c('r', 'no'), 'yes (but don\'t)', H.c('g', 'no')]
      ])}
      <p><b>Inner sees outer, outer never sees inner.</b> Code inside a block can read variables of its function and of the global scope. Code outside a block cannot read the block's <code>let</code>/<code>const</code> variables — they simply do not exist out there.</p>
      ${H.chips(['global: site', 'function checkout: price, total, note', 'if-block: discount'], { label: 'Nested scopes (outer → inner)' })}
      <p><b>Shadowing</b>: if an inner scope declares a variable with the <i>same name</i> as an outer one, the inner one "shadows" (hides) the outer one inside that region. The outer variable is untouched.</p>
      <p><b>Accidental globals</b>: in old "sloppy" (non-strict) mode, assigning to a name you never declared (<code>total = 5</code> without <code>let</code>) silently creates a global property. In <b>strict mode</b> (<code>'use strict'</code>, and automatically inside ES modules and classes) it throws <code>ReferenceError</code>. This is why modern code is always strict.</p>
      <p><b>Scope is not <code>this</code>.</b> Scope is about <i>variables you can see</i> and is fixed by where code is written. <code>this</code> is about <i>which object a function was called on</i> and is decided at call time (next module).</p>`,
    clues: [
      '"What is the difference between <code>var</code>, <code>let</code> and <code>const</code>?" → function vs block scope, re-declaration, TDZ, global-object property',
      '"Why does this variable still exist after the <code>for</code> loop?" → <code>var</code> ignores blocks',
      '"Variable is not defined outside the <code>if</code>" → block scope of <code>let</code>/<code>const</code>',
      '"A value mysteriously appears on <code>window</code>" → top-level <code>var</code>/function or an implicit global in sloppy mode',
      '"What does <code>\'use strict\'</code> change about variables?" → undeclared assignment throws instead of creating a global',
      '"Same variable name inside and outside" → shadowing (and illegal shadowing of <code>let</code> by <code>var</code>)',
      'Output puzzles with <code>typeof x</code> for a name declared in a nested block → <code>"undefined"</code>, not an error'
    ],
    code: [{ lang: 'js', run: true, title: 'var vs let vs const across blocks (runnable)', code: `
// Global scope: visible everywhere in this file
var site = 'shop';
let visits = 0;

function checkout(price) {
  // Function scope: price, total and note all live here
  var total = price;
  if (price > 100) {
    // Block scope: only discount lives here
    let discount = 10;
    var note = 'big order'; // var IGNORES the block -> goes to function scope
    total = price - discount; // total found one scope out
  }
  console.log('total:', total, '| note:', note); // note is visible here
  console.log('typeof discount outside block:', typeof discount); // 'undefined'
  visits++; // reaching all the way out to the global scope
}

checkout(150);
console.log('visits:', visits, '| site:', site);
console.log('typeof total outside function:', typeof total); // 'undefined'

// const means the BINDING cannot change, not that the value is frozen
const cart = ['pen'];
cart.push('book'); // allowed: same array, new content
console.log('cart:', cart);
try {
  cart = []; // not allowed: re-pointing a const binding
} catch (e) {
  console.log(e.name + ':', e.message);
}
` }],
    codeTitle: ['Scope rules in one program'],
    viz: {
      title: 'Which scope does each variable live in? (step through)',
      gen: function () {
        var code = [
          "var site = 'shop';",
          'let visits = 0;',
          'function checkout(price) {',
          '  var total = price;',
          '  if (price > 100) {',
          '    let discount = 10;',
          "    var note = 'big order';",
          '    total = price - discount;',
          '  }',
          '  console.log(total, note);',
          '  console.log(typeof discount);',
          '}',
          'checkout(150);',
          'console.log(typeof total);'
        ].join('\n');
        var G = 'Global scope', F = 'checkout() function scope', B = 'if-block scope';
        var gChain = [{ id: 'g', label: 'Global: site, visits, checkout' }];
        var fChain = gChain.concat([{ id: 'f', label: 'checkout(): price, total, note' }]);
        var bChain = fChain.concat([{ id: 'b', label: 'if-block: discount' }]);
        var steps = [
          { l: [], narr: 'Before line 1 runs, the engine sets up the <b>global scope</b>. <code>site</code> (var) starts as <code>undefined</code>, <code>checkout</code> is a ready function, and <code>visits</code> (let) exists but is <b>not initialised</b> yet.',
            envs: [[G, { site: 'undefined', visits: '<uninitialised>', checkout: 'ƒ checkout' }, { checkout: 'ok' }]], st: ['global'], extra: [chain('Scope chain right now', gChain, { g: 'cur' })], out: [] },
          { l: 1, narr: 'Line 1 stores <code>\'shop\'</code> in the global <code>site</code>.', envs: [[G, { site: "'shop'", visits: '<uninitialised>', checkout: 'ƒ checkout' }, { site: 'ok' }]], st: ['global'], out: [] },
          { l: 2, narr: 'Line 2 initialises <code>visits</code> to 0. From now on it can be read.', envs: [[G, { site: "'shop'", visits: 0, checkout: 'ƒ checkout' }, { visits: 'ok' }]], st: ['global'], out: [] },
          { l: 13, narr: 'Calling <code>checkout(150)</code> creates a <b>brand-new function scope</b>. It already contains <code>total</code> <b>and</b> <code>note</code> — both are <code>var</code>, so both belong to the whole function even though <code>note</code> is written inside the <code>if</code>.',
            envs: [[G, { site: "'shop'", visits: 0, checkout: 'ƒ checkout' }], [F, { price: 150, total: 'undefined', note: 'undefined' }, { price: 'ok', note: 'sel' }]], st: ['global', 'checkout(150)'], extra: [chain('Scope chain right now', fChain, { f: 'cur' })], out: [] },
          { l: 4, narr: '<code>total = price</code> → 150.', envs: [[G, { site: "'shop'", visits: 0 }], [F, { price: 150, total: 150, note: 'undefined' }, { total: 'ok' }]], st: ['global', 'checkout(150)'], extra: [chain('Scope chain right now', fChain, { f: 'cur' })], out: [] },
          { l: 5, narr: '150 &gt; 100, so we enter the block. A <b>block scope</b> is created for the <code>let</code> inside it. <code>discount</code> exists but is uninitialised (in its TDZ).',
            envs: [[F, { price: 150, total: 150, note: 'undefined' }], [B, { discount: '<uninitialised>' }, { discount: 'cur' }]], st: ['global', 'checkout(150)'], extra: [chain('Scope chain right now', bChain, { b: 'cur' })], out: [] },
          { l: 6, narr: '<code>discount = 10</code>, stored in the <b>block</b> scope.', envs: [[F, { price: 150, total: 150, note: 'undefined' }], [B, { discount: 10 }, { discount: 'ok' }]], st: ['global', 'checkout(150)'], extra: [chain('Scope chain right now', bChain, { b: 'cur' })], out: [] },
          { l: 7, narr: '<code>var note</code> is written inside the block, but <code>var</code> ignores blocks — the value goes into the <b>function</b> scope.',
            envs: [[F, { price: 150, total: 150, note: "'big order'" }, { note: 'ok' }], [B, { discount: 10 }]], st: ['global', 'checkout(150)'], extra: [chain('Scope chain right now', bChain, { f: 'cur' }, { 'b-f': 'cur' })], out: [] },
          { l: 8, narr: '<code>total</code> is not in the block, so the engine walks <b>one scope out</b> and updates the function\'s <code>total</code> to 140.',
            envs: [[F, { price: 150, total: 140, note: "'big order'" }, { total: 'ok' }], [B, { discount: 10 }]], st: ['global', 'checkout(150)'], extra: [chain('Lookup of total: block → function', bChain, { b: 'done', f: 'ok' }, { 'b-f': 'ok' })], out: [] },
          { l: 9, narr: 'The block ends. Its scope is thrown away — <code>discount</code> is <span class="c-r">gone</span>.',
            envs: [[F, { price: 150, total: 140, note: "'big order'" }], [B + ' (destroyed)', { discount: '—' }, { discount: 'bad' }]], st: ['global', 'checkout(150)'], extra: [chain('Scope chain right now', fChain, { f: 'cur' })], out: [] },
          { l: 10, narr: 'Both <code>total</code> and <code>note</code> live in the function scope, so this prints <b>140 big order</b>.', envs: [[F, { price: 150, total: 140, note: "'big order'" }, { total: 'sel', note: 'sel' }]], st: ['global', 'checkout(150)'], out: ['140 big order'] },
          { l: 11, narr: '<code>discount</code> is not visible here. <code>typeof</code> on an unknown name is safe and returns <b>"undefined"</b> (no error).', envs: [[F, { price: 150, total: 140, note: "'big order'" }]], st: ['global', 'checkout(150)'], out: ['140 big order', 'undefined'] },
          { l: 12, narr: 'The function returns. Its scope is popped (nothing kept it alive — no closure).', envs: [[G, { site: "'shop'", visits: 0, checkout: 'ƒ checkout' }]], st: ['global'], extra: [chain('Scope chain right now', gChain, { g: 'cur' })], out: ['140 big order', 'undefined'] },
          { l: 14, narr: '<code>total</code> lived only inside <code>checkout</code>. From global code it does not exist → <b>"undefined"</b>. <span class="c-g">Inner sees outer; outer never sees inner.</span>', envs: [[G, { site: "'shop'", visits: 0, checkout: 'ƒ checkout' }]], st: ['global'], out: ['140 big order', 'undefined', 'undefined'] }
        ];
        return codeFrames(code, steps);
      }
    },
    examples: [
      { title: 'var leaks out of loops, let does not', html: `<p>A <code>for</code> loop body is a block. <code>var i</code> belongs to the surrounding function (or global), so it is still alive after the loop with its final value <b>3</b>. <code>let j</code> belongs to the loop, so outside it there is no <code>j</code> at all.</p>${H.table(['', 'after loop', 'why'], [['<code>var i</code>', H.c('r', '3'), 'one variable for the whole function'], ['<code>let j</code>', H.c('g', 'typeof j → "undefined"'), 'lives only inside the loop']])}`,
        code: { lang: 'js', run: true, code: `
for (var i = 0; i < 3; i++) { /* empty body */ }
console.log('after var loop, i =', i); // 3

for (let j = 0; j < 3; j++) { /* empty body */ }
console.log('typeof j =', typeof j); // 'undefined' - j never existed out here
` } },
      { title: 'Shadowing: three variables named level', html: `<p>Three separate variables happen to share one name. Each <code>console.log</code> uses the <b>closest</b> one. Changing the inner one never touches the outer one. Predict the output first: ${H.c('b', 'block, outer, global')}.</p>`,
        code: { lang: 'js', run: true, code: `
let level = 'global';
function outer() {
  let level = 'outer';      // shadows the global one inside outer()
  {
    let level = 'block';    // shadows outer's one inside this block
    console.log(level);     // block
  }
  console.log(level);       // outer
}
outer();
console.log(level);         // global
` } },
      { title: 'Accidental global (sloppy) vs ReferenceError (strict)', html: `<p>Forgetting <code>let</code> in sloppy mode quietly creates a property on the global object — a bug that can leak data between unrelated pieces of code. Strict mode turns the same mistake into a loud error. ES modules and class bodies are always strict.</p>`,
        code: { lang: 'js', run: true, code: `
function sloppy() {
  leaked = 42; // no let/const/var! creates globalThis.leaked
}
sloppy();
console.log('globalThis.leaked =', globalThis.leaked); // 42

function strict() {
  'use strict';
  try {
    leaked2 = 1; // same mistake, strict mode
  } catch (e) {
    console.log(e.name + ': ' + e.message);
  }
}
strict();
` } },
      { title: 'Illegal shadowing: var cannot hide an outer let in the same function', html: `<p><code>let</code> inside a block may shadow an outer <code>var</code> (fine). The opposite is a <b>SyntaxError</b>: the <code>var</code> wants to be hoisted to the function level, where a <code>let</code> with the same name already lives.</p>
<pre>function ok() {
  var a = 1;
  { let a = 2; }      // fine: block-level a shadows function-level a
}
function bad() {
  let a = 1;
  { var a = 2; }      // SyntaxError: Identifier 'a' has already been declared
}</pre><p>Note: the whole script fails to <b>parse</b>, so nothing in it runs — not even lines above the error.</p>` },
      { title: 'catch parameters and bare blocks are scopes too', html: `<p>The <code>e</code> in <code>catch (e)</code> lives only in the catch block. A bare <code>{ }</code> is a handy way to keep temporary helpers from cluttering a function.</p>`,
        code: { lang: 'js', run: true, code: `
try {
  JSON.parse('{bad json');
} catch (e) {
  console.log('inside catch:', e.name);
}
console.log('outside catch, typeof e =', typeof e); // 'undefined'

{
  const temp = [3, 1, 2].sort();
  console.log('temp inside bare block:', temp);
}
console.log('typeof temp =', typeof temp); // 'undefined'
` } }
    ],
    deepDive: `<p><b>What the spec actually builds.</b> Every scope is an <b>Environment Record</b>: a little table of name → binding. There are several kinds: <i>Declarative</i> (functions, blocks, catch clauses, modules), <i>Object</i> (backed by a real object — used by <code>with</code> and for the global object's half), <i>Function</i> (adds <code>this</code>, <code>super</code>, <code>new.target</code>) and the <i>Global</i> record, which is two records glued together: an object record backed by <code>globalThis</code> (holds top-level <code>var</code> and function declarations) plus a declarative record (holds top-level <code>let</code>/<code>const</code>/<code>class</code>). That is why top-level <code>let x</code> is visible in all classic scripts on the page but is <b>not</b> <code>window.x</code>.</p>
      <p><b>Scripts vs modules vs Node CommonJS.</b> In an ES module, top-level declarations go into a per-module scope — nothing leaks to <code>globalThis</code>. In Node CommonJS files, your code is wrapped in a function <code>(exports, require, module, __filename, __dirname)</code>, so a top-level <code>var</code> is local to the file. Only true classic browser scripts share one global.</p>
      <p><b>Function declarations inside blocks</b> are the weird corner. In strict mode they are block-scoped like <code>let</code>. In sloppy mode, "Annex B" web-compat rules also create a <code>var</code>-like binding in the enclosing function that gets assigned when the block runs — so the function is visible after the block but <code>undefined</code> before it. Avoid relying on it: use <code>const f = () =&gt; {}</code> inside blocks.</p>
      <p><b>Performance and memory.</b> Engines resolve most names at parse time ("this <code>x</code> is slot 2 of the scope two levels up"), so scope lookups are fast. Variables that no inner function captures live on the stack/registers and vanish when the function returns; captured ones are moved to a heap-allocated <i>Context</i>. Block scopes that contain no captured variables cost nothing at runtime.</p>
      <p><b>Production reality.</b> Lint rules <code>no-var</code>, <code>prefer-const</code>, <code>no-undef</code>, <code>no-shadow</code> and <code>block-scoped-var</code> catch almost every scope bug before review. Rule of thumb used by most teams: <code>const</code> by default, <code>let</code> when you must re-assign, never <code>var</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants almost never write <code>var</code> any more and will happily convert a legacy file to <code>let</code>/<code>const</code> in seconds. But a blind <code>var</code> → <code>let</code> conversion can <b>change behaviour</b>: code that read a <code>var</code> after its loop or block (on purpose!) now gets a ReferenceError, and code that relied on <code>window.someVar</code> breaks.</p>
      <p><b>Use AI as a partner:</b> ask <code>"List every place in this file where a var is read outside the block it is declared in, and every top-level var another script might read via window"</code> before you let it modernise anything. Ask it to generate <i>predict-the-output</i> drills on shadowing for you to solve without running them.</p>
      <p><b>Where AI goes wrong:</b> it sometimes claims top-level <code>let</code> creates <code>window.x</code> (it does not), mixes up Node CommonJS (file-local) with browser scripts (shared global), or "fixes" an implicit global by adding <code>let</code> in the wrong scope so two functions stop sharing state they needed.</p>
      <p><b>What you must still own:</b> drawing the scope boxes in your head for any snippet, explaining why <code>var</code> is function-scoped, and spotting accidental globals during code review — interviewers test exactly this by hand.</p>`,
    problems: [
      {
        title: 'Find the Leaked Globals', level: 'Medium', tags: ['scope', 'globals', 'debugging'], companies: ['Atlassian', 'Microsoft'],
        statement: `<p>A legacy sloppy-mode function sometimes forgets <code>let</code>, creating accidental globals. Write <code>findLeaks(fn)</code> that calls <code>fn()</code> once and returns an array of the <b>names of new properties</b> that appeared on <code>globalThis</code> because of that call (in the order they were created). Then remove those leaked properties so the global object is clean again.</p>`,
        constraints: `<code>fn</code> takes no arguments. Leaked names are new (did not exist before the call). Do not use any library.`,
        example: `<p><code>function buggy(){ total = 0; for (idx = 0; idx &lt; 3; idx++) total += idx; let safe = 1; }</code></p><p>Output: ${H.c('r', "['total', 'idx']")} — <code>safe</code> is properly declared, so it is ${H.c('g', 'not')} a leak.</p>`,
        brute: { why: `<p>Guess candidate names and test each one with <code>name in globalThis</code>. It only finds leaks you already suspect, misses everything else, and cannot tell an old global from a new one.</p>`,
          code: `
function findLeaksBrute(fn, suspects) {
  fn();
  // Only checks names we guessed in advance
  return suspects.filter(function (name) { return name in globalThis; });
}` },
        mcq: { q: 'Why does <code>total = 0</code> (no keyword) create a global in a sloppy function?', options: ['The scope-chain lookup reaches the global scope without finding <code>total</code>, and sloppy mode then creates it there', '<code>total</code> is hoisted to the top of the function', 'Assignments are always global in JavaScript', 'Because <code>0</code> is a primitive'], answer: 0, explain: 'Assignment walks the scope chain like a read. If nothing is found, sloppy mode creates a property on the global object; strict mode throws ReferenceError instead.' },
        hints: [`<p>Hint 1: a leak is simply "a global property name that exists <b>after</b> the call but did not exist <b>before</b> it".</p>`, `<p>Hint 2: snapshot <code>Object.getOwnPropertyNames(globalThis)</code> into a <code>Set</code> before the call; after the call, filter the new list against the set.</p>`, `<p>Hint 3: property creation order is preserved for string keys, so the filtered list is already in creation order. Implicit globals are <i>configurable</i>, so <code>delete globalThis[name]</code> cleans them up.</p>`],
        tests: { sig: 'string -> string', fn: 'leak', harness: { js: `function leak(kind) {
  const g = globalThis;
  const fns = {
    buggy() { total = 0; for (idx = 0; idx < 3; idx++) { total += idx; } let safe = 1; return safe; },
    clean() { const x = 1; var y = 2; return x + y; },
    existing() { g.__preexisting = 1; },
    twice() { dup1 = 1; dup1 = 2; dup2 = 3; },
    viaThis() { this.viaThisName = 1; },
    many() { for (let i = 0; i < 1000; i++) g['mass' + i] = i; },
    order() { zeta = 1; alpha = 2; mid = 3; }
  };
  if (kind === 'existing') { g.__preexisting = 0; }
  const leaks = findLeaks(fns[kind]);
  const out = { leaks: leaks.length > 20 ? [leaks.length, leaks[0], leaks[leaks.length - 1]] : leaks };
  out.cleaned = leaks.every((n) => !(n in g));
  if (kind === 'existing') { out.stillThere = '__preexisting' in g; delete g.__preexisting; }
  return out;
}` }, cases: [
          [["buggy"],{"leaks":["total","idx"],"cleaned":true}],
          [["clean"],{"leaks":[],"cleaned":true}],
          [["existing"],{"leaks":[],"cleaned":true,"stillThere":true}],
          [["twice"],{"leaks":["dup1","dup2"],"cleaned":true}],
          [["viaThis"],{"leaks":["viaThisName"],"cleaned":true}],
          [["order"],{"leaks":["zeta","alpha","mid"],"cleaned":true}],
          [["many"],{"leaks":[1000,"mass0","mass999"],"cleaned":true}]
        ] },
        solution: {
          approach: `<p>Take a "before" snapshot of the global object's own property names, run the function, take an "after" list, and keep the names that are not in "before". Clean up with <code>delete</code>. This is how test runners (Mocha's <code>--check-leaks</code>) detect leaked globals.</p>`,
          code: { lang: 'js', run: true, code: `
function findLeaks(fn) {
  // 1) Snapshot every global name that exists right now
  const before = new Set(Object.getOwnPropertyNames(globalThis));
  // 2) Run the suspicious code
  fn();
  // 3) Anything new is a leak (string keys keep creation order)
  const leaks = Object.getOwnPropertyNames(globalThis).filter((k) => !before.has(k));
  // 4) Clean up so later code is not affected
  for (const name of leaks) delete globalThis[name];
  return leaks;
}

// A sloppy-mode function with two forgotten declarations
function buggy() {
  total = 0;                       // leak 1
  for (idx = 0; idx < 3; idx++) {  // leak 2
    total += idx;
  }
  let safe = 1;                    // properly declared, not a leak
  return safe;
}

console.log(findLeaks(buggy));          // [ 'total', 'idx' ]
console.log('cleaned:', typeof total);  // 'undefined'
console.log(findLeaks(function clean() { const x = 1; return x; })); // []
` },
          dry: { head: ['step', 'before set has total?', 'globals after call', 'result'], rows: [['snapshot', 'no', '—', '—'], ['run buggy()', 'no', '…, total, idx', '—'], ['filter', '—', 'total ∉ before, idx ∉ before', "['total','idx']"], ['delete', '—', 'total, idx removed', H.c('g', 'clean')]] },
          complexity: `<p>O(G) time and space where G is the number of global properties (a few hundred in a browser).</p>`,
          followUps: ['How would you detect leaks that overwrite an <i>existing</i> global? (compare values, not just names)', 'Why does running this inside an ES module make the problem disappear?', 'Which ESLint rule prevents this at write time? (<code>no-undef</code> + strict mode)']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 2 — Lexical scope and the scope chain
     ====================================================================== */
  topics.push({
    title: 'Lexical Scope and the Scope Chain',
    analogy: `<p>Imagine a set of <b>Russian nesting dolls</b>, each with a sticky note inside listing the things it owns. When the smallest doll needs something, it first checks its own note. If the item is not there, it looks at the note of the doll <b>it is sitting inside</b>, then the next one out, and so on until the biggest doll. Crucially, which doll sits inside which was decided <b>when the dolls were made</b> (where the code is written) — not by who happens to be holding the doll later (who calls the function).</p>`,
    explain: `<p><b>Lexical scope</b> (also called <i>static scope</i>) means: <b>the place where you write a function decides which variables it can see</b>. "Lexical" just means "related to the text of the code". You can figure out every variable's meaning by reading the source — you never need to know who calls the function.</p>
      <p>Every time a scope is created (a function call, a block), JavaScript makes a small record of its variables and stores a hidden <b>outer link</b> pointing to the scope that surrounds it <i>in the source code</i>. Those links form the <b>scope chain</b>.</p>
      <p><b>How a name is looked up</b> (both for reading and for assigning):</p>
      <ol>
        <li>Look in the current scope. Found? Use it and <b>stop</b>.</li>
        <li>Not found? Follow the outer link and repeat.</li>
        <li>Reached the global scope and still nothing? Reading → <code>ReferenceError: x is not defined</code>. Assigning → sloppy mode creates a global; strict mode throws.</li>
      </ol>
      ${H.table(['', 'Call stack', 'Scope chain'], [
        ['Answers', '"Who called whom? Where do I return to?"', '"Which variables can this code see?"'],
        ['Built from', 'the order of calls at <b>run time</b>', 'the nesting of code at <b>write time</b>'],
        ['Example', 'global → caller → printX', 'printX → global (caller is NOT in it!)']
      ])}
      <p>The classic demonstration: <code>printX</code> is written at the top level, so its outer link points to the global scope. Even when it is called from inside <code>caller</code> (which has its own <code>x</code>), it still prints the <b>global</b> <code>x</code>. A <i>dynamically</i> scoped language (like Bash) would print the caller's <code>x</code> instead.</p>
      <p>Lookups stop at the <b>first</b> match, which is exactly why shadowing works. And because the outer link is stored inside the function when the function is created, a function carries its surroundings around with it — that is the seed of <b>closures</b> (Topic 5).</p>`,
    clues: [
      '"What will this print?" where a function is <b>defined</b> in one place and <b>called</b> from another that has a same-named variable → lexical scope decides',
      '"Explain the scope chain" / "how does JS resolve a variable?" → inner → outer → global, first match wins',
      '"What is the difference between lexical and dynamic scope?"',
      '"Is the scope chain the same as the call stack?" → no; one is about writing, the other about running',
      '"x is not defined" vs "undefined" → lookup failed everywhere vs found but holds undefined',
      'Mentions of <code>eval</code> or <code>with</code> → the only ways to bend lexical scope (and why strict mode limits them)'
    ],
    code: [{ lang: 'js', run: true, title: 'Lexical, not dynamic (runnable)', code: `
const x = 'global';

function printX() {
  // printX was WRITTEN at the top level, so its outer link -> global scope
  console.log('printX sees x =', x);
}

function caller() {
  const x = 'caller'; // this x is NOT visible to printX
  printX();
}

caller(); // printX sees x = global

// Nesting in the source code is what matters:
function outer() {
  const y = 'outer y';
  function inner() {
    // inner was written INSIDE outer -> it can see y
    console.log('inner sees y =', y);
  }
  return inner;
}
const fn = outer();
fn(); // still works after outer() has returned (that is a closure!)
` }],
    codeTitle: ['Lexical scope in action'],
    viz: [{
      title: 'Scope-chain lookup: type a variable name',
      input: 'b',
      inputLabel: 'Name to look up from inside inner() (try a, b, c, d, console, z)',
      gen: function (input) {
        var name = String(input === undefined ? 'b' : input).trim();
        if (!/^[A-Za-z_$][A-Za-z0-9_$]{0,19}$/.test(name)) throw new Error('Type one identifier, e.g. a, b, c, d or z');
        if (/^(var|let|const|class|function|return|if|else|for|while|do|new|this|typeof|delete|in|of|switch|case|break|continue|try|catch|finally|throw|void|with|yield|await|import|export|default|super|extends|null|true|false|enum)$/.test(name)) throw new Error('"' + name + '" is a reserved word, not a variable name. Try a, b, c, d or z');
        var code = [
          "const a = 'global a';",
          "const b = 'global b';",
          'function outer() {',
          "  const b = 'outer b';",
          "  const d = 'outer d';",
          '  function inner() {',
          "    const c = 'inner c';",
          '    console.log(' + name + ');',
          '  }',
          '  inner();',
          '}',
          'outer();'
        ].join('\n');
        var envs = [
          { id: 'i', label: 'inner(): c', vars: { c: "'inner c'" }, title: 'inner() scope' },
          { id: 'o', label: 'outer(): b, d, inner', vars: { b: "'outer b'", d: "'outer d'", inner: 'ƒ' }, title: 'outer() scope' },
          { id: 'g', label: 'Global: a, b, outer', vars: { a: "'global a'", b: "'global b'", outer: 'ƒ' }, title: 'Global scope (+ built-ins)' }
        ];
        var builtins = { console: 'console object', Math: 'Math object', JSON: 'JSON object', globalThis: 'global object', undefined: 'undefined' };
        var full = [envs[2], envs[1], envs[0]].map(function (e) { return { id: e.id, label: e.label }; });
        var frames = [];
        frames.push({ narr: 'The engine creates the <b>global scope</b>: <code>a</code>, <code>b</code> and <code>outer</code>. Built-ins like <code>console</code> and <code>Math</code> also live at this outermost level.',
          parts: [{ type: 'code', lang: 'js', code: code, hl: { 1: 'cur', 2: 'cur' } }, chain('Scope chain', full.slice(0, 1), { g: 'ok' })] });
        frames.push({ narr: '<code>outer()</code> is called. Its new scope gets <code>b</code>, <code>d</code>, <code>inner</code>. Its <b>outer link</b> points to the global scope — because <code>outer</code> was <i>written</i> at the top level.',
          parts: [{ type: 'code', lang: 'js', code: code, hl: { 12: 'cur', 4: 'ok', 5: 'ok' } }, chain('Scope chain', full.slice(0, 2), { o: 'ok' }, { 'o-g': 'ok' }), { type: 'stack', label: 'Call stack', items: ['global', 'outer()'], hl: { 1: 'cur' } }] });
        frames.push({ narr: '<code>inner()</code> is called. Its scope holds <code>c</code>, and its outer link points to <code>outer</code>\'s scope (where it was written). The chain is now inner → outer → global.',
          parts: [{ type: 'code', lang: 'js', code: code, hl: { 10: 'cur', 7: 'ok' } }, chain('Scope chain', full, { i: 'ok' }, { 'i-o': 'ok' }), { type: 'stack', label: 'Call stack', items: ['global', 'outer()', 'inner()'], hl: { 2: 'cur' } }] });
        var found = null;
        for (var k = 0; k < envs.length; k++) {
          var e = envs[k], has = Object.prototype.hasOwnProperty.call(e.vars, name) || (e.id === 'g' && Object.prototype.hasOwnProperty.call(builtins, name));
          var hl = {}, ehl = {};
          for (var j = 0; j < k; j++) hl[envs[j].id] = 'done';
          hl[e.id] = has ? 'ok' : 'cur';
          if (k > 0) ehl[envs[k - 1].id + '-' + e.id] = 'cur';
          var shown = {};
          Object.keys(e.vars).forEach(function (v) { shown[v] = e.vars[v]; });
          if (e.id === 'g' && builtins[name]) shown[name] = builtins[name];
          frames.push({ narr: 'Looking for <code>' + esc(name) + '</code> in the <b>' + e.title + '</b>… ' + (has ? '<span class="c-g">found it! The lookup stops here.</span>' : '<span class="c-y">not here</span> → follow the outer link.'),
            parts: [{ type: 'code', lang: 'js', code: code, hl: { 8: 'cur' } }, chain('Scope chain (walk outward)', full, hl, ehl), { type: 'vars', label: e.title, vals: shown, hl: has ? one(name, 'ok') : {} }] });
          if (has) { found = { env: e, value: shown[name] }; break; }
        }
        if (found) {
          var extra = '';
          if (name === 'b') extra = ' Notice the global <code>b</code> was never reached: the outer <code>b</code> <b>shadows</b> it.';
          frames.push({ narr: 'Result: <code>console.log(' + esc(name) + ')</code> prints <b>' + esc(found.value) + '</b> from the ' + found.env.title + '.' + extra,
            parts: [{ type: 'code', lang: 'js', code: code, hl: { 8: 'ok' } }, out(String(found.value).replace(/^'|'$/g, ''))] });
        } else {
          frames.push({ narr: 'Reached the global scope and found nothing. Reading an undeclared name throws <span class="c-r">ReferenceError: ' + esc(name) + ' is not defined</span>. (Note: <code>typeof ' + esc(name) + '</code> would return "undefined" instead of throwing.)',
            parts: [{ type: 'code', lang: 'js', code: code, hl: { 8: 'bad' } }, chain('Scope chain', full, { i: 'done', o: 'done', g: 'bad' }), out('Uncaught ReferenceError: ' + name + ' is not defined')] });
        }
        return frames;
      }
    }, {
      title: 'Call stack vs scope chain (lexical vs dynamic)',
      gen: function () {
        var code = [
          "const x = 'global';",
          'function printX() {',
          '  console.log(x);',
          '}',
          'function caller() {',
          "  const x = 'caller';",
          '  printX();',
          '}',
          'caller();'
        ].join('\n');
        var steps = [
          { l: [1, 2, 5], narr: 'Global scope: <code>x = \'global\'</code>, plus the two functions. Each function quietly remembers <b>where it was written</b>: both were written at the top level, so both have outer link → global.',
            envs: [['Global scope', { x: "'global'", printX: 'ƒ (outer: global)', caller: 'ƒ (outer: global)' }]], st: ['global'], out: [] },
          { l: 9, narr: '<code>caller()</code> runs and gets its own scope with its own <code>x = \'caller\'</code>.',
            envs: [['Global scope', { x: "'global'" }], ['caller() scope', { x: "'caller'" }, { x: 'ok' }]], st: ['global', 'caller()'], out: [] },
          { l: 7, narr: '<code>caller</code> calls <code>printX()</code>. The <b>call stack</b> is now global → caller → printX. But the <b>scope chain</b> of printX is just printX → global, because printX was not written inside caller.',
            envs: [['caller() scope', { x: "'caller'" }]], st: ['global', 'caller()', 'printX()'],
            extra: [boxes('Two different "chains"', [{ id: 'G', label: 'global', x: 15, y: 10 }, { id: 'C', label: 'caller()', x: 15, y: 30 }, { id: 'P', label: 'printX()', x: 15, y: 50 }, { id: 'G2', label: 'Global scope', x: 75, y: 10 }, { id: 'P2', label: 'printX scope', x: 75, y: 50 }],
              [['G', 'C', 'calls'], ['C', 'P', 'calls'], ['P2', 'G2', 'outer link']], { P: 'cur', P2: 'cur' }, { 'P2-G2': 'ok' }, { G: 'call stack', G2: 'scope chain' }, 60)], out: [] },
          { l: 3, narr: 'Lookup of <code>x</code>: printX scope (none) → <b>global</b> (found <code>\'global\'</code>). caller\'s <code>x</code> is never consulted.',
            envs: [['printX() scope', {}], ['Global scope', { x: "'global'" }, { x: 'ok' }]], st: ['global', 'caller()', 'printX()'],
            extra: [chain('Scope chain of printX', [{ id: 'g', label: 'Global: x = global' }, { id: 'p', label: 'printX(): (empty)' }], { p: 'done', g: 'ok' }, { 'p-g': 'ok' })], out: ['global'] },
          { l: 3, cls: 'bad', narr: 'If JavaScript were <b>dynamically</b> scoped (like Bash or early Lisp), the lookup would follow the <i>call stack</i> and print <code>caller</code>. JavaScript is <b>lexically</b> scoped, so the answer is <span class="c-g">global</span>.',
            envs: [['What a dynamic language would do', { lookupPath: 'printX → caller → global', wouldPrint: "'caller'" }, { wouldPrint: 'bad' }]], st: ['global', 'caller()', 'printX()'], out: ['global'] },
          { l: 9, cls: 'ok', narr: 'Both functions return; the stack unwinds. Takeaway: <b>where a function is written decides what it sees; where it is called decides only where it returns to.</b>',
            envs: [['Global scope', { x: "'global'" }]], st: ['global'], out: ['global'] }
        ];
        return codeFrames(code, steps);
      }
    }],
    examples: [
      { title: 'Passing a callback does not give it the receiver\'s variables', html: `<p>The arrow function is written inside <code>main</code>, so it sees <code>main</code>'s <code>secret</code> — even though it is <b>executed</b> inside <code>runner</code>, which has its own <code>secret</code>. Predict: ${H.c('b', 'main secret')}.</p>`,
        code: { lang: 'js', run: true, code: `
function runner(cb) {
  const secret = 'runner secret'; // invisible to cb
  return cb();
}
function main() {
  const secret = 'main secret';
  return runner(() => secret);   // written inside main
}
console.log(main()); // main secret
` } },
      { title: 'Assignments walk the chain too', html: `<p>Writing <code>count++</code> looks up <code>count</code> exactly like reading does and updates the <b>nearest</b> binding. A local <code>let count</code> shadows the global one, so the global is untouched in <code>bumpLocal</code>.</p>${H.table(['call', 'which count?', 'global count after'], [['bump()', 'global', '1'], ['bumpLocal()', 'local (101 returned)', '1'], ['bump()', 'global', '2']])}`,
        code: { lang: 'js', run: true, code: `
let count = 0;
function bump() { count++; }                 // no local count -> global one
function bumpLocal() { let count = 100; count++; return count; }

bump();
console.log('bumpLocal returns', bumpLocal());
bump();
console.log('global count =', count); // 2
` } },
      { title: 'Each level checks itself first: a three-level shadowing puzzle', html: `<p>Predict before running. Inside <code>c()</code> there is no <code>v</code>, so it walks to <code>b()</code> (which has one). Inside <code>b()</code> the lookup of <code>w</code> walks two levels up to global.</p>`,
        code: { lang: 'js', run: true, code: `
const v = 'global v', w = 'global w';
function a() {
  const v = 'a v';
  function b() {
    const v = 'b v';
    function c() {
      return v + ' | ' + w; // v from b, w from global
    }
    return c();
  }
  return b();
}
console.log(a()); // b v | global w
` } },
      { title: 'eval and with: the only ways to bend lexical scope', html: `<p>In sloppy mode, <code>eval("var x = ...")</code> can inject a brand-new variable into the calling function's scope at run time, so the engine can no longer know the scope by reading the code. Strict mode gives <code>eval</code> its own private scope, and <code>with</code> is a SyntaxError in strict mode. This is one reason <code>eval</code> also makes engines de-optimise the surrounding function.</p>`,
        code: { lang: 'js', run: true, code: `
function sloppyEval() {
  eval("var injected = 'surprise'"); // adds a var to THIS function's scope
  return injected;
}
console.log(sloppyEval()); // surprise

function strictEval() {
  'use strict';
  eval("var injected = 'hidden'"); // stays inside eval's own scope
  return typeof injected;
}
console.log(strictEval()); // undefined
` } }
    ],
    deepDive: `<p><b>The mechanism.</b> Every function object has an internal slot <code>[[Environment]]</code>. When the function is <i>created</i> (when its declaration or expression is evaluated), the engine stores the currently running scope there. When the function is <i>called</i>, a new Function Environment Record is made whose <code>[[OuterEnv]]</code> is set to that saved <code>[[Environment]]</code> — <b>not</b> to the caller's scope. That single line of the spec is lexical scoping.</p>
      <p><b>Static resolution.</b> Because scopes are visible in the text, V8's parser does <i>scope analysis</i> up front: each identifier reference is resolved to "local slot", "context slot at depth N" or "global lookup". At run time a captured variable is read with a fixed hop count up the context chain — no string search. That is why <code>eval</code> and <code>with</code> are expensive: any name could be shadowed at run time, so the parser must fall back to slow dynamic lookups for the whole function.</p>
      <p><b>Global lookups</b> are the slowest common case (they may need to check the declarative record, then the global object, which can have getters). Inline caches make repeated ones fast. Tip from production: hot loops that reference a deep global repeatedly are sometimes micro-optimised by aliasing to a local <code>const</code>, but modern engines rarely need it.</p>
      <p><b>Reads vs typeof vs writes.</b> An unresolvable <i>read</i> throws ReferenceError. <code>typeof undeclaredName</code> is special-cased to return <code>"undefined"</code> (useful for feature detection like <code>typeof window !== 'undefined'</code>). An unresolvable <i>write</i> creates a global in sloppy mode only. A resolvable-but-TDZ binding throws for all three (Topic 4).</p>
      <p><b>Edge cases.</b> Named function expressions get an extra tiny scope containing just their own name (read-only), so <code>const f = function g() { return typeof g; }</code> returns "function" while <code>g</code> is not visible outside. Default parameters get their own scope between the outer scope and the function body. Class bodies are strict-mode block scopes, and the class name inside its body is a const binding.</p>`,
    aiEra: `<p><b>What AI changes:</b> tools like Copilot or Claude can trace a variable to its declaration instantly, and IDE "go to definition" already uses the same static scope analysis the engine uses. So simple "which <code>x</code> is this?" questions are cheap now.</p>
      <p><b>Use AI as a partner:</b> paste a confusing snippet and ask <code>"Draw the scope chain for each function as nested boxes and mark which declaration each identifier resolves to — do not run it"</code>. Then check its boxes against your own. Ask it for 5 lexical-vs-dynamic puzzles in increasing difficulty.</p>
      <p><b>Where AI goes wrong:</b> models sometimes "explain" output as if JavaScript followed the call stack (dynamic scope), especially when a callback is passed into a function that has a same-named variable. They also confuse scope with <code>this</code> — e.g. claiming an arrow function "inherits the caller's variables". Arrow functions inherit <i>this</i> lexically, but every function inherits <i>variables</i> lexically.</p>
      <p><b>What you must still own:</b> the one-sentence rule "functions see variables from where they are written" and the ability to prove an output by walking the chain by hand in an interview.</p>`,
    problems: [
      {
        title: 'Resolve a Name Through a Scope Chain', level: 'Easy', tags: ['scope chain', 'simulation'], companies: ['Google', 'Uber'],
        statement: `<p>Model the engine's lookup. A scope chain is given as an array of scopes, <b>innermost first</b>: <code>[{ name: 'inner', vars: {...} }, { name: 'outer', vars: {...} }, { name: 'global', vars: {...} }]</code>. Implement:</p><ul><li><code>resolve(chain, id)</code> → returns <code>{ value, foundIn }</code> for the first scope that has <code>id</code>, or throws <code>ReferenceError(id + ' is not defined')</code>.</li><li><code>assign(chain, id, value, strict)</code> → updates the nearest scope that has <code>id</code>; if none has it, sloppy mode creates it in the <b>last</b> (global) scope, strict mode throws ReferenceError.</li></ul>`,
        constraints: `1 ≤ chain length ≤ 50, each scope ≤ 100 names. Values may be <code>undefined</code> (a declared-but-undefined variable still counts as <b>found</b>).`,
        example: `<p>chain = inner{c:3} → outer{b:'outer b'} → global{a:1, b:'global b'}</p><p><code>resolve(chain,'b')</code> → ${H.c('g', "{ value: 'outer b', foundIn: 'outer' }")} (shadowing: stops at first match). <code>resolve(chain,'z')</code> → ${H.c('r', 'ReferenceError')}.</p>`,
        brute: { why: `<p>Flatten all scopes into one object with <code>Object.assign({}, global, outer, inner)</code> and read from it. It returns the right value for reads, but it loses <i>where</i> a name was found, breaks assignment (you update a copy), and treats <code>{x: undefined}</code> the same as "not declared" if you test with <code>!== undefined</code>.</p>`,
          code: `
function resolveBrute(chain, id) {
  // later sources overwrite earlier ones, so pass global first and inner last
  const flat = Object.assign({}, ...chain.slice().reverse().map((s) => s.vars));
  if (flat[id] === undefined) throw new ReferenceError(id + ' is not defined'); // wrong for declared-undefined
  return { value: flat[id], foundIn: '?' };
}` },
        mcq: { q: 'A scope has <code>{ x: undefined }</code>. Is <code>x</code> "found" there?', options: ['Yes — the binding exists, its value just happens to be undefined', 'No — undefined means not declared', 'Only in strict mode', 'Only if it is a let'], answer: 0, explain: 'Declared-with-undefined and undeclared are different: one prints undefined, the other throws ReferenceError. Use hasOwnProperty / the in operator, not a value check.' },
        hints: [`<p>Hint 1: walk the array from index 0 (innermost) outward and stop at the first scope that <b>has</b> the name.</p>`, `<p>Hint 2: use <code>Object.prototype.hasOwnProperty.call(scope.vars, id)</code> so names with value <code>undefined</code> still count, and inherited names like <code>toString</code> do not.</p>`, `<p>Hint 3: write a small <code>findScope(chain, id)</code> returning the scope or null; build both <code>resolve</code> and <code>assign</code> on top of it. In <code>assign</code>, null + strict → throw; null + sloppy → put it into <code>chain[chain.length - 1].vars</code>.</p>`],
        tests: { sig: 'string string string string string -> string', fn: 'sc', harness: { js: `function sc(op, chainJson, id, value, strict) {
  const fix = (v) => (v === '__undef__' ? undefined : v);
  let chain;
  if (chainJson === 'BIG') { chain = []; for (let k = 0; k < 50; k++) { const vars = { x: k }; for (let j = 0; j < 99; j++) vars['v' + k + '_' + j] = j; chain.push({ name: 's' + k, vars }); } }
  else { chain = JSON.parse(chainJson); chain.forEach((s) => { for (const k of Object.keys(s.vars)) s.vars[k] = fix(s.vars[k]); }); }
  try {
    if (op === 'resolve') { const r = resolve(chain, id); return { value: r.value === undefined ? '<undefined>' : r.value, foundIn: r.foundIn }; }
    const where = assign(chain, id, JSON.parse(value), strict === 'strict');
    return { where, state: chain.map((s) => s.name + ':' + (id in s.vars ? JSON.stringify(s.vars[id]) : '-')) };
  } catch (e) { return e.name + ': ' + e.message; }
}` }, cases: [
          [["resolve","[{\"name\":\"inner\",\"vars\":{\"c\":3,\"maybe\":\"__undef__\"}},{\"name\":\"outer\",\"vars\":{\"b\":\"outer b\"}},{\"name\":\"global\",\"vars\":{\"a\":1,\"b\":\"global b\"}}]","b","",""],{"value":"outer b","foundIn":"outer"}],
          [["resolve","[{\"name\":\"inner\",\"vars\":{\"c\":3,\"maybe\":\"__undef__\"}},{\"name\":\"outer\",\"vars\":{\"b\":\"outer b\"}},{\"name\":\"global\",\"vars\":{\"a\":1,\"b\":\"global b\"}}]","a","",""],{"value":1,"foundIn":"global"}],
          [["resolve","[{\"name\":\"inner\",\"vars\":{\"c\":3,\"maybe\":\"__undef__\"}},{\"name\":\"outer\",\"vars\":{\"b\":\"outer b\"}},{\"name\":\"global\",\"vars\":{\"a\":1,\"b\":\"global b\"}}]","c","",""],{"value":3,"foundIn":"inner"}],
          [["resolve","[{\"name\":\"inner\",\"vars\":{\"c\":3,\"maybe\":\"__undef__\"}},{\"name\":\"outer\",\"vars\":{\"b\":\"outer b\"}},{\"name\":\"global\",\"vars\":{\"a\":1,\"b\":\"global b\"}}]","maybe","",""],{"value":"<undefined>","foundIn":"inner"}],
          [["resolve","[{\"name\":\"inner\",\"vars\":{\"c\":3,\"maybe\":\"__undef__\"}},{\"name\":\"outer\",\"vars\":{\"b\":\"outer b\"}},{\"name\":\"global\",\"vars\":{\"a\":1,\"b\":\"global b\"}}]","z","",""],"ReferenceError: z is not defined"],
          [["resolve","[{\"name\":\"inner\",\"vars\":{\"c\":3,\"maybe\":\"__undef__\"}},{\"name\":\"outer\",\"vars\":{\"b\":\"outer b\"}},{\"name\":\"global\",\"vars\":{\"a\":1,\"b\":\"global b\"}}]","toString","",""],"ReferenceError: toString is not defined"],
          [["resolve","[{\"name\":\"only\",\"vars\":{}}]","q","",""],"ReferenceError: q is not defined"],
          [["resolve","[{\"name\":\"only\",\"vars\":{\"q\":0}}]","q","",""],{"value":0,"foundIn":"only"}],
          [["assign","[{\"name\":\"inner\",\"vars\":{\"c\":3,\"maybe\":\"__undef__\"}},{\"name\":\"outer\",\"vars\":{\"b\":\"outer b\"}},{\"name\":\"global\",\"vars\":{\"a\":1,\"b\":\"global b\"}}]","a","99","strict"],{"where":"global","state":["inner:-","outer:-","global:99"]}],
          [["assign","[{\"name\":\"inner\",\"vars\":{\"c\":3,\"maybe\":\"__undef__\"}},{\"name\":\"outer\",\"vars\":{\"b\":\"outer b\"}},{\"name\":\"global\",\"vars\":{\"a\":1,\"b\":\"global b\"}}]","b","\"new\"","strict"],{"where":"outer","state":["inner:-","outer:\"new\"","global:\"global b\""]}],
          [["assign","[{\"name\":\"inner\",\"vars\":{\"c\":3,\"maybe\":\"__undef__\"}},{\"name\":\"outer\",\"vars\":{\"b\":\"outer b\"}},{\"name\":\"global\",\"vars\":{\"a\":1,\"b\":\"global b\"}}]","leak","1","sloppy"],{"where":"global","state":["inner:-","outer:-","global:1"]}],
          [["assign","[{\"name\":\"inner\",\"vars\":{\"c\":3,\"maybe\":\"__undef__\"}},{\"name\":\"outer\",\"vars\":{\"b\":\"outer b\"}},{\"name\":\"global\",\"vars\":{\"a\":1,\"b\":\"global b\"}}]","q","1","strict"],"ReferenceError: q is not defined"],
          [["assign","[{\"name\":\"inner\",\"vars\":{\"c\":3,\"maybe\":\"__undef__\"}},{\"name\":\"outer\",\"vars\":{\"b\":\"outer b\"}},{\"name\":\"global\",\"vars\":{\"a\":1,\"b\":\"global b\"}}]","maybe","5","strict"],{"where":"inner","state":["inner:5","outer:-","global:-"]}],
          [["assign","[{\"name\":\"inner\",\"vars\":{\"c\":3,\"maybe\":\"__undef__\"}},{\"name\":\"outer\",\"vars\":{\"b\":\"outer b\"}},{\"name\":\"global\",\"vars\":{\"a\":1,\"b\":\"global b\"}}]","c","null","sloppy"],{"where":"inner","state":["inner:null","outer:-","global:-"]}],
          [["resolve","BIG","x","",""],{"value":0,"foundIn":"s0"}],
          [["resolve","BIG","v49_98","",""],{"value":98,"foundIn":"s49"}],
          [["assign","BIG","nothing","7","sloppy"],{"where":"s49","state":["s0:-","s1:-","s2:-","s3:-","s4:-","s5:-","s6:-","s7:-","s8:-","s9:-","s10:-","s11:-","s12:-","s13:-","s14:-","s15:-","s16:-","s17:-","s18:-","s19:-","s20:-","s21:-","s22:-","s23:-","s24:-","s25:-","s26:-","s27:-","s28:-","s29:-","s30:-","s31:-","s32:-","s33:-","s34:-","s35:-","s36:-","s37:-","s38:-","s39:-","s40:-","s41:-","s42:-","s43:-","s44:-","s45:-","s46:-","s47:-","s48:-","s49:7"]}]
        ] },
        solution: {
          approach: `<p>Linear walk from innermost to outermost using an own-property check — exactly what the spec's <code>ResolveBinding</code> does with environment records and their <code>[[OuterEnv]]</code> links.</p>`,
          code: { lang: 'js', run: true, code: `
const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);

// Return the nearest scope that declares id, or null.
function findScope(chain, id) {
  for (const scope of chain) {        // innermost -> outermost
    if (has(scope.vars, id)) return scope;
  }
  return null;
}

function resolve(chain, id) {
  const scope = findScope(chain, id);
  if (!scope) throw new ReferenceError(id + ' is not defined');
  return { value: scope.vars[id], foundIn: scope.name };
}

function assign(chain, id, value, strict) {
  const scope = findScope(chain, id);
  if (scope) { scope.vars[id] = value; return scope.name; }
  if (strict) throw new ReferenceError(id + ' is not defined');
  chain[chain.length - 1].vars[id] = value; // sloppy: accidental global
  return chain[chain.length - 1].name;
}

const chain = [
  { name: 'inner', vars: { c: 3, maybe: undefined } },
  { name: 'outer', vars: { b: 'outer b' } },
  { name: 'global', vars: { a: 1, b: 'global b' } }
];
console.log(resolve(chain, 'b'));      // { value: 'outer b', foundIn: 'outer' }
console.log(resolve(chain, 'maybe'));  // found, value undefined
console.log(assign(chain, 'a', 99, true), chain[2].vars.a); // global 99
console.log(assign(chain, 'leak', 1, false));               // global (sloppy leak)
try { resolve(chain, 'z'); } catch (e) { console.log(e.name + ': ' + e.message); }
try { assign(chain, 'q', 1, true); } catch (e) { console.log('strict:', e.message); }
` },
          dry: { head: ['call', 'inner has?', 'outer has?', 'global has?', 'result'], rows: [["resolve('b')", 'no', H.c('g', 'yes'), '(not checked)', "'outer b'"], ["resolve('a')", 'no', 'no', H.c('g', 'yes'), '1'], ["resolve('z')", 'no', 'no', 'no', H.c('r', 'ReferenceError')], ["assign('leak', sloppy)", 'no', 'no', 'no', 'created in global']] },
          complexity: `<p>O(D) per lookup where D is chain depth (plus O(1) hash check per scope). Real engines make it O(1) for most names by resolving the depth at parse time.</p>`,
          followUps: ['Add a <code>kind</code> per name (var/let/const) and make <code>assign</code> throw TypeError for const.', 'Add a TDZ state: a let that exists but is uninitialised should throw on read.', 'How would <code>with(obj)</code> fit into this model? (an object-backed scope inserted into the chain)']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 3 — Hoisting: creation phase vs execution phase
     ====================================================================== */
  topics.push({
    title: 'Hoisting: Creation Phase vs Execution Phase',
    analogy: `<p>Before a teacher starts a class, she <b>reads the attendance list</b> and writes every name on the board — but leaves the "marks" column empty. Only then does the lesson start, line by line. During roll call, names written with <code>var</code> get a "?" (<code>undefined</code>) next to them, <code>function</code> names get their <b>full homework already attached</b>, and <code>let</code>/<code>const</code> names are written but <b>covered with tape</b> — you can see the name exists, but touching it before the lesson reaches that line is forbidden. That roll-call pass is the <b>creation phase</b>; the lesson is the <b>execution phase</b>. "Hoisting" is just the visible effect of that roll call.</p>`,
    explain: `<p>JavaScript does not run your file in one single pass. Every time it enters a new scope — the whole script, or a function call — it creates an <b>execution context</b> and handles it in <b>two phases</b>:</p>
      <ol>
        <li><b>Creation (memory) phase</b> — the engine scans the scope for <b>declarations</b> and makes room for them before running anything.</li>
        <li><b>Execution phase</b> — it runs the code top to bottom, doing assignments, calls and logs.</li>
      </ol>
      <p>Because declarations are registered first, it <i>looks</i> as if they were "lifted" (hoisted) to the top of their scope. Nothing actually moves in your source — that is just the mental model. What each declaration gets during the creation phase:</p>
      ${H.table(['Declaration', 'Creation phase stores', 'Using it BEFORE its line'], [
        ['<code>var x = 5</code>', '<code>x = undefined</code>', H.c('y', 'undefined (no error)')],
        ['<code>function f() {}</code>', 'the <b>whole function</b>', H.c('g', 'works — you can call it')],
        ['<code>var f = function () {}</code>', '<code>f = undefined</code> (only the var)', H.c('r', 'TypeError: f is not a function')],
        ['<code>let x</code> / <code>const x</code>', 'binding created but <b>uninitialised</b>', H.c('r', 'ReferenceError (TDZ)')],
        ['<code>const f = () =&gt; {}</code>', 'uninitialised', H.c('r', 'ReferenceError (TDZ)')],
        ['<code>class C {}</code>', 'uninitialised', H.c('r', 'ReferenceError (TDZ)')],
        ['<code>import x from \'./m.js\'</code>', 'linked before any module code runs', H.c('g', 'works (live binding)')]
      ])}
      <p>Three rules settle almost every hoisting puzzle:</p>
      <ul>
        <li><b>Only the declaration is hoisted, never the assignment.</b> <code>var a = 10</code> is really "declare <code>a</code> (creation)" + "<code>a = 10</code> (execution, on that line)".</li>
        <li><b>Hoisting is per scope.</b> A <code>var</code> inside a function is hoisted to the top of <i>that function</i>, and it shadows any outer variable of the same name for the whole function — even the lines above it.</li>
        <li><b>Functions win the roll call.</b> If a <code>function foo</code> and a <code>var foo</code> share a name, after the creation phase <code>foo</code> is the function. The <code>var</code> line only matters when its <i>assignment</i> runs during execution. Two function declarations with the same name → the last one wins.</li>
      </ul>`,
    clues: [
      '"What is hoisting?" / "Explain the execution context" → two phases: creation (memory) then execution',
      'A <code>console.log(x)</code> placed <b>above</b> <code>var x = …</code> → prints <code>undefined</code>',
      'Calling a function above its definition → works for declarations, TypeError for <code>var f = function</code>, ReferenceError for <code>const f = () =&gt;</code>',
      'A global and a local variable with the same name, local declared <b>later</b> in the function → local shadows from line 1 of the function',
      '"Function declaration vs function expression" → full hoisting vs only the variable',
      'Same name used for a <code>var</code> and a <code>function</code> → <code>typeof</code> puzzles',
      '<code>var</code> inside <code>if (false) { }</code> → still declared (hoisting ignores whether the line ever runs)'
    ],
    code: [{ lang: 'js', run: true, title: 'Creation vs execution phase (runnable)', code: `
// Creation phase already ran before this first line:
//   a = undefined, greet = <function>, sayHi = undefined
console.log('a before:', a);                  // undefined
console.log('greet():', greet());             // hello (declaration fully hoisted)
console.log('typeof sayHi:', typeof sayHi);   // undefined (only the var was hoisted)

try {
  sayHi(); // calling undefined
} catch (e) {
  console.log(e.name + ':', e.message);       // TypeError: sayHi is not a function
}

var a = 10;
function greet() { return 'hello'; }
var sayHi = function () { return 'hi'; };

console.log('after:', a, sayHi());            // 10 hi

// Hoisting is per scope: this local x shadows the global x for the WHOLE function
var x = 'global';
function test() {
  console.log('inside test, first line:', x); // undefined, not 'global'!
  var x = 'local';
  console.log('inside test, after var:', x);  // local
}
test();
` }],
    codeTitle: ['Hoisting rules in one runnable file'],
    viz: [{
      title: 'Global execution context: creation phase, then execution phase',
      gen: function () {
        var code = [
          'console.log(a);',
          'console.log(greet());',
          'console.log(typeof sayHi);',
          'var a = 10;',
          "function greet() { return 'hello'; }",
          "var sayHi = function () { return 'hi'; };",
          'console.log(a, sayHi());'
        ].join('\n');
        function ec(phase) {
          return boxes('Global execution context', [{ id: 'EC', label: 'Global Execution Context', x: 50, y: 8 }, { id: 'M', label: '1. Memory (creation phase)', x: 25, y: 32 }, { id: 'C', label: '2. Code (execution phase)', x: 75, y: 32 }],
            [['EC', 'M'], ['EC', 'C'], ['M', 'C', 'then']], phase === 1 ? { M: 'cur', C: 'done' } : { M: 'done', C: 'cur' }, phase === 2 ? { 'M-C': 'ok' } : {}, {}, 42);
        }
        var M = 'Memory (variable environment)';
        var steps = [
          { l: [], narr: 'Before running a single line, the engine creates the <b>Global Execution Context</b> and starts the <b>creation phase</b>: it scans for declarations only.', envs: [[M, {}]], extra: [ec(1)], out: [] },
          { l: 4, narr: 'Creation phase finds <code>var a</code> → reserves <code>a</code> and sets it to <b>undefined</b>. The <code>= 10</code> part is <i>not</i> done now.', envs: [[M, { a: 'undefined' }, { a: 'ok' }]], extra: [ec(1)], out: [] },
          { l: 5, narr: 'Finds <code>function greet</code> → stores the <b>entire function</b>. It is callable from line 1.', envs: [[M, { a: 'undefined', greet: 'ƒ greet()' }, { greet: 'ok' }]], extra: [ec(1)], out: [] },
          { l: 6, narr: 'Finds <code>var sayHi</code> → <b>undefined</b>. The function on the right side is an <i>expression</i>; it will only be created when line 6 executes.', envs: [[M, { a: 'undefined', greet: 'ƒ greet()', sayHi: 'undefined' }, { sayHi: 'ok' }]], extra: [ec(1)], out: [] },
          { l: 1, narr: 'Creation phase done — now the <b>execution phase</b> runs from the top. Line 1 reads <code>a</code>: it exists but is still <b>undefined</b>.', envs: [[M, { a: 'undefined', greet: 'ƒ greet()', sayHi: 'undefined' }, { a: 'cur' }]], extra: [ec(2)], out: ['undefined'] },
          { l: 2, narr: '<code>greet()</code> works even though its definition is further down — it was fully stored in memory. Prints <b>hello</b>.', envs: [[M, { a: 'undefined', greet: 'ƒ greet()', sayHi: 'undefined' }, { greet: 'ok' }]], st: ['global', 'greet()'], out: ['undefined', 'hello'] },
          { l: 3, narr: '<code>sayHi</code> is undefined, so <code>typeof sayHi</code> is <b>"undefined"</b>. (Calling <code>sayHi()</code> here would throw <span class="c-r">TypeError: sayHi is not a function</span>.)', envs: [[M, { a: 'undefined', greet: 'ƒ greet()', sayHi: 'undefined' }, { sayHi: 'bad' }]], out: ['undefined', 'hello', 'undefined'] },
          { l: 4, narr: 'Now the assignment part of line 4 finally runs: <code>a = 10</code>.', envs: [[M, { a: 10, greet: 'ƒ greet()', sayHi: 'undefined' }, { a: 'ok' }]], out: ['undefined', 'hello', 'undefined'] },
          { l: 5, cls: 'done', narr: 'Line 5 is a function declaration — it was already handled in the creation phase, so execution simply <b>skips</b> it.', envs: [[M, { a: 10, greet: 'ƒ greet()', sayHi: 'undefined' }]], out: ['undefined', 'hello', 'undefined'] },
          { l: 6, narr: 'The function expression is created now and assigned: <code>sayHi</code> becomes a function.', envs: [[M, { a: 10, greet: 'ƒ greet()', sayHi: 'ƒ anonymous' }, { sayHi: 'ok' }]], out: ['undefined', 'hello', 'undefined'] },
          { l: 7, cls: 'ok', narr: 'Everything is initialised: prints <b>10 hi</b>. Summary: declarations are registered first; assignments happen where they are written.', envs: [[M, { a: 10, greet: 'ƒ greet()', sayHi: 'ƒ anonymous' }, { a: 'sel', sayHi: 'sel' }]], st: ['global', 'sayHi()'], out: ['undefined', 'hello', 'undefined', '10 hi'] }
        ];
        return codeFrames(code, steps);
      }
    }, {
      title: 'Function execution context: the local var shadows from line one',
      gen: function () {
        var code = [
          'var x = 1;',
          'function test() {',
          '  console.log(x);',
          '  var x = 2;',
          '  console.log(x);',
          '}',
          'test();',
          'console.log(x);'
        ].join('\n');
        var full = [{ id: 'g', label: 'Global: x, test' }, { id: 't', label: 'test(): x' }];
        var steps = [
          { l: [1, 2], narr: 'Global creation phase: <code>x = undefined</code>, <code>test = ƒ</code>. Then execution sets global <code>x = 1</code>.', envs: [['Global memory', { x: 1, test: 'ƒ test()' }, { x: 'ok' }]], st: ['global'], out: [] },
          { l: 7, narr: 'Calling <code>test()</code> creates a <b>new function execution context</b>. Its creation phase scans the function body and finds <code>var x</code> on line 4 → local <code>x = undefined</code>.', envs: [['Global memory', { x: 1, test: 'ƒ test()' }], ['test() memory (creation phase)', { x: 'undefined' }, { x: 'ok' }]], st: ['global', 'test()'], extra: [chain('Scope chain', full, { t: 'cur' })], out: [] },
          { l: 3, narr: 'Execution of line 3: lookup of <code>x</code> starts in test()\'s scope and <b>finds the local x</b> (undefined). It never reaches the global 1. Prints <b>undefined</b>.', envs: [['test() memory', { x: 'undefined' }, { x: 'cur' }], ['Global memory', { x: 1 }, { x: 'done' }]], st: ['global', 'test()'], extra: [chain('Lookup stops at the local x', full, { t: 'ok', g: 'done' })], out: ['undefined'] },
          { l: 4, narr: 'Line 4 assigns the local <code>x = 2</code>. The global is untouched.', envs: [['test() memory', { x: 2 }, { x: 'ok' }], ['Global memory', { x: 1 }]], st: ['global', 'test()'], out: ['undefined'] },
          { l: 5, narr: 'Prints the local <b>2</b>.', envs: [['test() memory', { x: 2 }, { x: 'sel' }]], st: ['global', 'test()'], out: ['undefined', '2'] },
          { l: 8, cls: 'ok', narr: 'test() returned and its context was destroyed. The global <code>x</code> is still <b>1</b>. Classic interview answer: <b>undefined, 2, 1</b>.', envs: [['Global memory', { x: 1, test: 'ƒ test()' }, { x: 'sel' }]], st: ['global'], out: ['undefined', '2', '1'] }
        ];
        return codeFrames(code, steps);
      }
    }],
    examples: [
      { title: 'Function vs var with the same name (typeof puzzle)', html: `<p>Creation phase: <code>var foo</code> reserves <code>foo</code>, then <code>function foo</code> overwrites it with the function (functions win). Execution: line 1 sees the function; line 2 assigns the string; line 3 is skipped (already handled). Answer: ${H.c('b', 'function, then string')}.</p>`,
        code: { lang: 'js', run: true, code: `
console.log(typeof foo);   // function
var foo = 'bar';
function foo() { return 1; }
console.log(typeof foo);   // string
` } },
      { title: 'Two declarations with the same name: the last one wins — even above both', html: `<p>Both declarations are processed in the creation phase, in order, so the second overwrites the first <b>before any code runs</b>. A linter (<code>no-redeclare</code>, <code>no-dupe-class-members</code>) flags this; TypeScript reports "Duplicate function implementation".</p>`,
        code: { lang: 'js', run: true, code: `
console.log(speak()); // second
function speak() { return 'first'; }
function speak() { return 'second'; }
console.log(speak()); // second
` } },
      { title: 'var inside dead code is still hoisted', html: `<p>The creation phase does not care whether a line will ever execute. <code>var y</code> inside <code>if (false)</code> still creates a local <code>y</code> for the whole function, so the outer <code>y</code> is shadowed and reads give <b>undefined</b>.</p>`,
        code: { lang: 'js', run: true, code: `
var y = 'outer';
function f() {
  console.log(y);            // undefined (local y already exists!)
  if (false) { var y = 1; }  // never runs, but the declaration counts
  return typeof y;
}
console.log(f());            // undefined
` } },
      { title: 'Helper functions after return still work', html: `<p>A popular style puts the "story" at the top of a function and helper declarations at the bottom, even after <code>return</code>. It works only because function declarations are fully hoisted. (Arrow helpers in <code>const</code> would throw.)</p>`,
        code: { lang: 'js', run: true, code: `
function calculateInvoice(items) {
  return addTax(subtotal(items)); // helpers are defined below

  function subtotal(list) { return list.reduce((s, it) => s + it.price * it.qty, 0); }
  function addTax(amount) { return Math.round(amount * 1.18 * 100) / 100; }
}
console.log(calculateInvoice([{ price: 100, qty: 2 }, { price: 50, qty: 1 }])); // 295
` } },
      { title: 'Parameters and a var with the same name', html: `<p>Parameters are bound in the creation phase too. A later <code>var a;</code> (no initialiser) does <b>not</b> reset the parameter — re-declaring an existing <code>var</code>-style binding is a no-op. But a <b>function declaration</b> with the parameter's name does replace it during creation.</p>`,
        code: { lang: 'js', run: true, code: `
function p1(a) { var a; return a; }
console.log(p1(5));            // 5  (var a; did nothing)

function p2(a) { return typeof a; function a() {} }
console.log(p2(5));            // function (declaration overwrote the parameter)
` } }
    ],
    deepDive: `<p><b>What the spec really does.</b> On entering a function, <code>FunctionDeclarationInstantiation</code> runs: it binds parameters (and <code>arguments</code> for non-arrow functions), collects <code>VarDeclaredNames</code> (all <code>var</code>s and top-level function declarations in the body, including those in nested blocks for <code>var</code>), creates those bindings initialised to <code>undefined</code> (skipping names already bound as parameters), then instantiates each function declaration and assigns it. <code>LexicallyDeclaredNames</code> (<code>let</code>, <code>const</code>, <code>class</code>) are created in a separate lexical environment and left <b>uninitialised</b>. For scripts, <code>GlobalDeclarationInstantiation</code> does the same and also throws a SyntaxError if, say, a <code>let x</code> collides with an existing <code>var x</code> from another script.</p>
      <p><b>"So is let hoisted?"</b> Yes — its binding is created when the scope is entered, which is precisely why a <code>let x</code> later in a block shadows an outer <code>x</code> from the very first line of the block and causes a ReferenceError there. The difference is initialisation, not hoisting.</p>
      <p><b>Engine reality.</b> V8 does not literally build a dictionary per call. The parser pre-computes every scope's declarations; "hoisting" becomes slot allocation in the stack frame or in a heap Context. Lazy parsing means inner functions are only pre-parsed (checked for syntax and free variables) until first called — hoisting info is still exact because pre-parsing tracks declarations.</p>
      <p><b>Modules.</b> In ES modules, <code>import</code> bindings are created and linked before any module body runs, and function declarations in a module are initialised during linking, so circular imports can call each other's hoisted functions — but touching an imported <code>let</code>/<code>const</code>/<code>class</code> before its module has evaluated throws a TDZ ReferenceError. That is a real-world bug source in large codebases with import cycles.</p>
      <p><b>Annex B surprise.</b> In sloppy mode, a function declared inside a block also gets a <code>var</code>-like binding in the enclosing function, initialised to <code>undefined</code> and assigned when the block is evaluated. So <code>typeof f</code> before the block is "undefined" instead of a ReferenceError. In strict mode it is purely block-scoped.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI code generators default to <code>const</code> + arrow functions, so in AI-written code "call before definition" usually means a TDZ ReferenceError, not the old <code>undefined</code>. Refactoring tools also convert function declarations to arrows — which silently breaks code that relied on hoisting (helpers below <code>return</code>, mutually recursive functions called early).</p>
      <p><b>Use AI as a partner:</b> ask <code>"Before converting these function declarations to const arrow functions, list every call site that runs before the declaration line"</code>. Ask it to generate hoisting puzzles and answer them yourself first, then compare.</p>
      <p><b>Where AI goes wrong:</b> models still frequently say "let and const are not hoisted" (they are — they are just uninitialised), or claim the <code>var</code> wins over the function in the <code>typeof foo</code> puzzle. They can also mis-handle the Annex B block-function rules.</p>
      <p><b>What you must still own:</b> narrating the two phases out loud for any snippet. Interviewers love "walk me through what the engine does before line 1" — a crisp creation/execution answer signals real understanding.</p>`,
    problems: [
      {
        title: 'Build a Mini Hoisting Simulator', level: 'Medium', tags: ['hoisting', 'simulation', 'execution context'], companies: ['Amazon', 'Flipkart'],
        statement: `<p>Simulate one execution context. A program is an array of statements:</p><ul><li><code>{ type: 'var', name, value }</code>, <code>{ type: 'let', name, value }</code>, <code>{ type: 'func', name, returns }</code></li><li><code>{ type: 'log', name }</code> → prints the value (String(value))</li><li><code>{ type: 'call', name }</code> → prints the function's <code>returns</code> value</li></ul><p>Run a creation phase then an execution phase and return the printed lines. Errors are printed as <code>'ReferenceError'</code> or <code>'TypeError'</code> and <b>stop</b> the program (like an uncaught error).</p>`,
        constraints: `≤ 1000 statements. Names are unique per kind but a <code>var</code> and a <code>func</code> may share a name. A <code>let</code> never shares a name with anything.`,
        example: `<p>[log a, call f, var a=1, func f→'hi', log a] → ${H.c('g', "['undefined', 'hi', '1']")}. With [call g, var g=5] → ${H.c('r', "['TypeError']")} because <code>g</code> is <code>undefined</code> when called.</p>`,
        brute: { why: `<p>A single top-to-bottom pass that only knows a name after its line ran: every early <code>log</code> becomes ReferenceError, so it gets hoisting completely wrong. The missing idea is the separate <b>creation pass</b>.</p>`,
          code: `
function runOnePass(program) {
  const mem = {}, out = [];
  for (const s of program) {
    if (s.type === 'var' || s.type === 'let') mem[s.name] = s.value;
    else if (s.type === 'func') mem[s.name] = { fn: true, returns: s.returns };
    else if (!(s.name in mem)) { out.push('ReferenceError'); break; } // wrong for hoisted names
    else out.push(s.type === 'call' ? String(mem[s.name].returns) : String(mem[s.name]));
  }
  return out;
}` },
        mcq: { q: 'After the creation phase, what does memory hold for <code>var f = 5; function f(){}</code>?', options: ['f = the function', 'f = undefined', 'f = 5', 'a SyntaxError'], answer: 0, explain: 'Function declarations are instantiated after var bindings are created, so f holds the function until the execution phase reaches f = 5.' },
        hints: [`<p>Hint 1: use two loops. The first only looks at declarations; the second runs everything in order.</p>`, `<p>Hint 2: store a special <code>TDZ</code> marker for <code>let</code>, <code>undefined</code> for <code>var</code> (unless a function already took the name), and a function object for <code>func</code> (always overwrite).</p>`, `<p>Hint 3: execution: <code>var</code>/<code>let</code> assign; <code>func</code> does nothing; <code>log</code>: missing or TDZ → ReferenceError; <code>call</code>: missing/TDZ → ReferenceError, not a function → TypeError. Push the error and stop.</p>`],
        tests: { sig: 'string -> string', fn: 'hs', harness: { js: `function hs(json) {
  let prog;
  if (json === 'BIG') { prog = []; for (let i = 0; i < 500; i++) prog.push({ type: 'var', name: 'v' + i, value: i }); for (let i = 0; i < 500; i++) prog.push({ type: 'log', name: 'v' + i }); } else prog = JSON.parse(json);
  const r = simulate(prog);
  return r.length > 100 ? { len: r.length, first: r[0], last: r[r.length - 1] } : r;
}` }, cases: [
          [["[{\"type\":\"log\",\"name\":\"a\"},{\"type\":\"call\",\"name\":\"f\"},{\"type\":\"var\",\"name\":\"a\",\"value\":1},{\"type\":\"func\",\"name\":\"f\",\"returns\":\"hi\"},{\"type\":\"log\",\"name\":\"a\"}]"],["undefined","hi","1"]],
          [["[{\"type\":\"call\",\"name\":\"g\"},{\"type\":\"var\",\"name\":\"g\",\"value\":5}]"],["TypeError"]],
          [["[{\"type\":\"log\",\"name\":\"n\"},{\"type\":\"let\",\"name\":\"n\",\"value\":3}]"],["ReferenceError"]],
          [["[{\"type\":\"log\",\"name\":\"foo\"},{\"type\":\"var\",\"name\":\"foo\",\"value\":\"bar\"},{\"type\":\"func\",\"name\":\"foo\",\"returns\":1},{\"type\":\"log\",\"name\":\"foo\"}]"],["function","bar"]],
          [["[]"],[]],
          [["[{\"type\":\"log\",\"name\":\"nope\"}]"],["ReferenceError"]],
          [["[{\"type\":\"call\",\"name\":\"nope\"}]"],["ReferenceError"]],
          [["[{\"type\":\"let\",\"name\":\"n\",\"value\":0},{\"type\":\"log\",\"name\":\"n\"}]"],["0"]],
          [["[{\"type\":\"let\",\"name\":\"n\",\"value\":false},{\"type\":\"log\",\"name\":\"n\"}]"],["false"]],
          [["[{\"type\":\"var\",\"name\":\"a\",\"value\":1},{\"type\":\"call\",\"name\":\"a\"},{\"type\":\"log\",\"name\":\"a\"}]"],["TypeError"]],
          [["[{\"type\":\"func\",\"name\":\"f\",\"returns\":42},{\"type\":\"call\",\"name\":\"f\"},{\"type\":\"call\",\"name\":\"f\"}]"],["42","42"]],
          [["[{\"type\":\"call\",\"name\":\"f\"},{\"type\":\"func\",\"name\":\"f\",\"returns\":\"x\"}]"],["x"]],
          [["[{\"type\":\"var\",\"name\":\"a\"},{\"type\":\"log\",\"name\":\"a\"}]"],["undefined"]],
          [["[{\"type\":\"log\",\"name\":\"a\"},{\"type\":\"log\",\"name\":\"zz\"},{\"type\":\"var\",\"name\":\"a\",\"value\":1}]"],["undefined","ReferenceError"]],
          [["[{\"type\":\"func\",\"name\":\"foo\",\"returns\":1},{\"type\":\"var\",\"name\":\"foo\",\"value\":2},{\"type\":\"log\",\"name\":\"foo\"}]"],["2"]],
          [["BIG"],{"len":500,"first":"0","last":"499"}]
        ] },
        solution: {
          approach: `<p>Mirror the engine: pass 1 = creation phase (declarations only, functions win), pass 2 = execution phase (assignments happen on their own line; errors stop everything).</p>`,
          code: { lang: 'js', run: true, code: `
const TDZ = Symbol('uninitialised');

function simulate(program) {
  const mem = new Map();
  // ---- creation phase: declarations only ----
  for (const s of program) {
    if (s.type === 'var' && !mem.has(s.name)) mem.set(s.name, undefined);
    if (s.type === 'let') mem.set(s.name, TDZ);
    if (s.type === 'func') mem.set(s.name, { isFn: true, returns: s.returns }); // functions win
  }
  // ---- execution phase: top to bottom ----
  const out = [];
  for (const s of program) {
    if (s.type === 'var' || s.type === 'let') { mem.set(s.name, s.value); continue; }
    if (s.type === 'func') continue; // already done during creation
    if (!mem.has(s.name) || mem.get(s.name) === TDZ) { out.push('ReferenceError'); break; }
    const v = mem.get(s.name);
    if (s.type === 'log') out.push(v && v.isFn ? 'function' : String(v));
    if (s.type === 'call') {
      if (!(v && v.isFn)) { out.push('TypeError'); break; }
      out.push(String(v.returns));
    }
  }
  return out;
}

console.log(simulate([
  { type: 'log', name: 'a' }, { type: 'call', name: 'f' },
  { type: 'var', name: 'a', value: 1 }, { type: 'func', name: 'f', returns: 'hi' },
  { type: 'log', name: 'a' }
])); // [ 'undefined', 'hi', '1' ]
console.log(simulate([{ type: 'call', name: 'g' }, { type: 'var', name: 'g', value: 5 }])); // [ 'TypeError' ]
console.log(simulate([{ type: 'log', name: 'n' }, { type: 'let', name: 'n', value: 3 }]));  // [ 'ReferenceError' ]
console.log(simulate([{ type: 'log', name: 'foo' }, { type: 'var', name: 'foo', value: 'bar' }, { type: 'func', name: 'foo', returns: 1 }, { type: 'log', name: 'foo' }])); // [ 'function', 'bar' ]
` },
          dry: { head: ['phase', 'statement', 'memory after', 'printed'], rows: [['creation', 'var a', 'a=undefined', '—'], ['creation', 'func f', 'a=undefined, f=ƒ', '—'], ['execution', 'log a', 'same', 'undefined'], ['execution', 'call f', 'same', 'hi'], ['execution', 'var a=1', 'a=1', '—'], ['execution', 'log a', 'a=1', '1']] },
          complexity: `<p>O(N) time, O(D) space for D distinct names.</p>`,
          followUps: ['Add <code>const</code> and make re-assignment a TypeError.', 'Support nested function scopes with their own creation phase.', 'Model Annex B: a func inside a block in sloppy mode.']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 4 — Temporal Dead Zone
     ====================================================================== */
  topics.push({
    title: 'The Temporal Dead Zone (TDZ)',
    analogy: `<p>A hotel <b>books your room</b> the moment you reserve it — your name is on the door list — but the room is <b>locked until check-in time</b>. If you try to open it early, security stops you (ReferenceError). The room clearly exists, nobody else can take it, but you cannot use it yet. With <code>var</code>, the hotel instead hands you an <b>empty room</b> early (<code>undefined</code>) and you might not even notice the furniture has not arrived. The locked period between "booked" and "checked in" is the <b>Temporal Dead Zone</b>.</p>`,
    explain: `<p>Remember from hoisting: <code>let</code>, <code>const</code> and <code>class</code> bindings are <b>created</b> when their scope starts, but they are <b>initialised</b> only when the engine actually executes the declaration line. The stretch of <i>time</i> in between is the <b>Temporal Dead Zone</b>. Touching the variable inside it — reading, writing, even <code>typeof</code> — throws:</p>
      <p>${H.c('r', "ReferenceError: Cannot access 'x' before initialization")}</p>
      <p>Compare with a name that was <b>never declared</b>: ${H.c('r', 'ReferenceError: x is not defined')}. Different message, different cause.</p>
      ${H.table(['Situation', '<code>console.log(x)</code>', '<code>typeof x</code>'], [
        ['<code>var x</code> later in scope', H.c('y', 'undefined'), '"undefined"'],
        ['<code>let/const/class x</code> later in scope (TDZ)', H.c('r', 'ReferenceError'), H.c('r', 'ReferenceError')],
        ['never declared anywhere', H.c('r', 'ReferenceError (not defined)'), H.c('g', '"undefined"')],
        ['after the <code>let</code> line ran', H.c('g', 'the value'), 'its type']
      ])}
      <p><b>"Temporal" means time, not position.</b> A function written <i>above</i> a <code>let</code> may use that variable perfectly well, as long as the function is <b>called after</b> the declaration has run. The TDZ is about <i>when</i> code runs, not <i>where</i> it is written.</p>
      <p>Common TDZ traps you will see in interviews:</p>
      <ul>
        <li><b>Shadowing</b>: <code>let x = 1; { console.log(x); let x = 2; }</code> → the inner <code>x</code> exists from the start of the block, so line 1 of the block hits the inner TDZ, not the outer 1.</li>
        <li><b>Self-reference</b>: <code>let x = x + 1;</code> → the right side reads <code>x</code> while it is still in its TDZ.</li>
        <li><b>Default parameters</b> are evaluated left to right in their own scope: <code>function f(a = b, b = 1)</code> throws when <code>a</code>'s default is used.</li>
        <li><b>switch</b>: all <code>case</code> clauses share one block, so a <code>let</code> in <code>case 1</code> is in its TDZ in <code>case 2</code>.</li>
        <li><b>Classes</b>: <code>new User()</code> before <code>class User {}</code> throws (unlike function constructors).</li>
      </ul>
      <p><b>Why does the TDZ exist?</b> To catch use-before-initialisation bugs early instead of silently working with <code>undefined</code>, and to make <code>const</code> meaningful — a <code>const</code> that could be observed as <code>undefined</code> first and <code>42</code> later would not really be constant.</p>`,
    clues: [
      '"Cannot access \'x\' before initialization" in the question or stack trace → TDZ',
      '"Are let and const hoisted?" → yes, but uninitialised (TDZ)',
      'An outer variable and an inner <code>let</code> with the same name, inner declared <b>after</b> the read → TDZ, not the outer value',
      '<code>typeof</code> used as a "safe check" on a <code>let</code>/<code>const</code> declared later → it throws',
      'Default parameter referring to a later parameter → TDZ',
      '<code>let</code> declarations inside <code>switch</code> cases → shared block, TDZ / redeclaration errors',
      'Circular ES module imports where one module reads another\'s <code>const</code> during load → TDZ at module level'
    ],
    code: [{ lang: 'js', run: true, title: 'TDZ is about time, not position (runnable)', code: `
function demo() {
  // read is written ABOVE score, but that is fine...
  const read = () => score;

  try {
    read(); // ...called while score is still in its TDZ -> throws
  } catch (e) {
    console.log('early call:', e.name + ': ' + e.message);
  }

  let score = 10; // TDZ for score ends here

  console.log('late call:', read()); // 10 - same function, later time
}
demo();

// typeof is NOT a safe check inside the TDZ
console.log(typeof neverDeclared); // 'undefined' (no error for undeclared names)
try {
  console.log(typeof laterLet);
} catch (e) {
  console.log('typeof in TDZ:', e.name);
}
let laterLet = 'ready';
console.log(typeof laterLet); // 'string'
` }],
    codeTitle: ['Temporal dead zone demo'],
    viz: [{
      title: 'Watching the TDZ open and close',
      gen: function () {
        var code = [
          'function demo() {',
          '  const read = () => score;',
          '  try { read(); }',
          '  catch (e) { console.log(e.name); }',
          '  let score = 10;',
          '  console.log(read());',
          '}',
          'demo();'
        ].join('\n');
        var E = 'demo() scope';
        var steps = [
          { l: 8, narr: '<code>demo()</code> is called. Creation phase: <b>both</b> <code>read</code> and <code>score</code> get bindings immediately, but both are <b>uninitialised</b> — the TDZ starts now for both.',
            envs: [[E, { read: '‹TDZ›', score: '‹TDZ›' }, { read: 'bad', score: 'bad' }]], st: ['global', 'demo()'], out: [] },
          { l: 2, narr: 'Line 2 runs: <code>read</code> is initialised with an arrow function. Its TDZ is over. The arrow remembers demo()\'s scope (where it was written) — it does not copy <code>score</code>, it will look it up <b>when called</b>.',
            envs: [[E, { read: 'ƒ () => score', score: '‹TDZ›' }, { read: 'ok', score: 'bad' }]], st: ['global', 'demo()'], out: [] },
          { l: 3, narr: '<code>read()</code> is called. It looks up <code>score</code>, finds the binding in demo()\'s scope… but it is still in the TDZ.',
            envs: [[E, { read: 'ƒ () => score', score: '‹TDZ›' }, { score: 'cur' }]], st: ['global', 'demo()', 'read()'], out: [] },
          { l: 4, cls: 'bad', narr: '<span class="c-r">ReferenceError: Cannot access \'score\' before initialization</span> — caught, so we print the error name. Note it is not "not defined": the binding <i>exists</i>, it is just locked.',
            envs: [[E, { read: 'ƒ () => score', score: '‹TDZ›' }, { score: 'bad' }]], st: ['global', 'demo()'], out: ['ReferenceError'] },
          { l: 5, cls: 'ok', narr: 'Line 5 executes the declaration: <code>score = 10</code>. <b>The TDZ for score ends now.</b>',
            envs: [[E, { read: 'ƒ () => score', score: 10 }, { score: 'ok' }]], st: ['global', 'demo()'], out: ['ReferenceError'] },
          { l: 6, narr: 'Same function <code>read</code>, called later: now the lookup succeeds and returns <b>10</b>. The TDZ is about <b>time</b>, not about the order lines are written.',
            envs: [[E, { read: 'ƒ () => score', score: 10 }, { score: 'sel' }]], st: ['global', 'demo()', 'read()'], out: ['ReferenceError', '10'] }
        ];
        return codeFrames(code, steps);
      }
    }, {
      title: 'Use-before-declaration for every kind of declaration',
      input: 'let',
      inputLabel: 'Declaration kind: var, let, const, class, function, funcexpr, arrow, none',
      gen: function (input) {
        var kind = String(input === undefined ? 'let' : input).trim().toLowerCase();
        var K = {
          'var': { decl: 'var thing = 42;', create: 'undefined', after: '42', t1: '"undefined"', l2: 'undefined', t1c: 'ok', l2c: 'ok' },
          'let': { decl: 'let thing = 42;', create: '‹TDZ›', after: '42', t1: 'ReferenceError (TDZ)', l2: 'ReferenceError (TDZ)', t1c: 'bad', l2c: 'bad' },
          'const': { decl: 'const thing = 42;', create: '‹TDZ›', after: '42', t1: 'ReferenceError (TDZ)', l2: 'ReferenceError (TDZ)', t1c: 'bad', l2c: 'bad' },
          'class': { decl: 'class thing {}', create: '‹TDZ›', after: '[class thing]', t1: 'ReferenceError (TDZ)', l2: 'ReferenceError (TDZ)', t1c: 'bad', l2c: 'bad' },
          'function': { decl: 'function thing() {}', create: 'ƒ thing', after: '[Function: thing]', t1: '"function"', l2: '[Function: thing]', t1c: 'ok', l2c: 'ok' },
          'funcexpr': { decl: 'var thing = function () {};', create: 'undefined', after: '[Function: thing]', t1: '"undefined"', l2: 'undefined', t1c: 'ok', l2c: 'ok' },
          'arrow': { decl: 'const thing = () => 42;', create: '‹TDZ›', after: '[Function: thing]', t1: 'ReferenceError (TDZ)', l2: 'ReferenceError (TDZ)', t1c: 'bad', l2c: 'bad' },
          'none': { decl: '// (no declaration at all)', create: null, after: 'ReferenceError: thing is not defined', t1: '"undefined"', l2: 'ReferenceError: not defined', t1c: 'ok', l2c: 'bad' }
        };
        var k = K[kind];
        if (!k) throw new Error('Type one of: var, let, const, class, function, funcexpr, arrow, none');
        var code = ['console.log(typeof thing);', 'console.log(thing);', k.decl, 'console.log(thing);'].join('\n');
        var mem = function (v, cls) { var o = {}; if (v !== null) o.thing = v; return { type: 'vars', label: 'Scope memory', vals: o, hl: cls ? { thing: cls } : {} }; };
        var outs = [];
        var frames = [];
        frames.push({ narr: 'Each line below is imagined inside its own try/catch so we can see all of them. <b>Creation phase</b> for <code>' + esc(k.decl) + '</code>: ' + (k.create === null ? 'nothing is declared, so no binding exists at all.' : '<code>thing</code> is registered as <b>' + esc(k.create) + '</b>.'),
          parts: [{ type: 'code', lang: 'js', code: code, hl: { 3: 'cur' } }, mem(k.create, k.create === '‹TDZ›' ? 'bad' : 'ok'), out(outs)] });
        outs.push(k.t1);
        frames.push({ narr: 'Line 1, <code>typeof thing</code> → <b>' + esc(k.t1) + '</b>. ' + (kind === 'none' ? '<code>typeof</code> is forgiving for names that were never declared.' : k.t1c === 'bad' ? '<code>typeof</code> is <b>not</b> safe in the TDZ.' : 'No error.'),
          parts: [{ type: 'code', lang: 'js', code: code, hl: { 1: k.t1c === 'bad' ? 'bad' : 'cur' } }, mem(k.create, k.t1c === 'bad' ? 'bad' : 'cur'), out(outs)] });
        outs.push(k.l2);
        frames.push({ narr: 'Line 2, reading <code>thing</code> → <b>' + esc(k.l2) + '</b>.' + (kind === 'var' || kind === 'funcexpr' ? ' Silent <code>undefined</code> — the bug hides.' : ''),
          parts: [{ type: 'code', lang: 'js', code: code, hl: { 2: k.l2c === 'bad' ? 'bad' : 'cur' } }, mem(k.create, k.l2c === 'bad' ? 'bad' : 'cur'), out(outs)] });
        var afterVal = kind === 'none' ? null : (kind === 'var' || kind === 'let' || kind === 'const' ? '42' : (kind === 'class' ? 'class thing' : 'ƒ thing'));
        frames.push({ narr: kind === 'none' ? 'Line 3 is just a comment — still no binding.' : (kind === 'function' ? 'Line 3: the declaration was fully handled in the creation phase, so execution skips it.' : 'Line 3 executes: <code>thing</code> is now initialised' + (k.create === '‹TDZ›' ? ' and its <b>TDZ ends</b>.' : '.')),
          parts: [{ type: 'code', lang: 'js', code: code, hl: { 3: 'ok' } }, mem(afterVal, 'ok'), out(outs)] });
        outs.push(k.after);
        frames.push({ narr: 'Line 4 prints <b>' + esc(k.after) + '</b>.', parts: [{ type: 'code', lang: 'js', code: code, hl: { 4: kind === 'none' ? 'bad' : 'ok' } }, mem(afterVal, 'sel'), out(outs)] });
        frames.push({ narr: 'Summary table — try another kind in the input box to compare.',
          parts: [{ type: 'table', label: 'Before-the-line behaviour', columns: ['kind', 'creation phase', 'typeof before', 'read before'], rows: Object.keys(K).map(function (n) { return [n, K[n].create === null ? '(no binding)' : K[n].create, K[n].t1, K[n].l2]; }), hl: one(Object.keys(K).indexOf(kind), 'sel') }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Shadowing creates a TDZ even when an outer variable exists', html: `<p>Many people expect <b>100</b>. But <code>let price</code> inside <code>show</code> creates a new binding for the <i>whole</i> function body from its first line, shadowing the global. Reading it before its declaration hits the TDZ.</p>`,
        code: { lang: 'js', run: true, code: `
let price = 100;
function show() {
  try {
    console.log(price); // inner price is in TDZ - the global 100 is shadowed
  } catch (e) {
    console.log(e.name + ': ' + e.message);
  }
  let price = 200;
  return price;
}
console.log(show()); // 200
` } },
      { title: 'Default parameters run left to right', html: `<p>Parameters behave like <code>let</code> declarations evaluated in order. <code>b = a * 2</code> is fine (a is ready). <code>a = b</code> reads <code>b</code> before it is initialised — but only when the default is actually used.</p>${H.table(['call', 'what happens'], [['okDefaults(3)', H.c('g', '[3, 6]')], ['badDefaults()', H.c('r', 'ReferenceError (b in TDZ)')], ['badDefaults(5)', H.c('g', '[5, 1] — default for a never evaluated')]])}`,
        code: { lang: 'js', run: true, code: `
function okDefaults(a, b = a * 2) { return [a, b]; }
function badDefaults(a = b, b = 1) { return [a, b]; }

console.log(okDefaults(3));                 // [ 3, 6 ]
try { badDefaults(); } catch (e) { console.log(e.name + ': ' + e.message); }
console.log(badDefaults(5));                // [ 5, 1 ]
` } },
      { title: 'let x = x and the switch-case trap', html: `<p>In <code>let x = x + 1</code> the right side reads the new <code>x</code> during its own TDZ. In a <code>switch</code>, every <code>case</code> shares one block: <code>msg</code> declared in <code>case 1</code> is in its TDZ when <code>case 2</code> runs. Fix: wrap each case body in its own <code>{ }</code> (ESLint: <code>no-case-declarations</code>).</p>`,
        code: { lang: 'js', run: true, code: `
const x = 5;
{
  try {
    let x = x + 1; // inner x shadows outer x and is still in TDZ
    console.log(x);
  } catch (e) {
    console.log('let x = x + 1 ->', e.name);
  }
}

function label(n) {
  switch (n) {
    case 1:
      let msg = 'one';
      return msg;
    case 2:
      msg = 'two'; // same block as case 1, but never initialised
      return msg;
  }
}
console.log(label(1));
try { label(2); } catch (e) { console.log('switch case 2 ->', e.name); }

function labelFixed(n) {
  switch (n) {
    case 1: { const msg = 'one'; return msg; }
    case 2: { const msg = 'two'; return msg; }
  }
}
console.log(labelFixed(2));
` } },
      { title: 'Classes are in the TDZ before their declaration', html: `<p>Old constructor functions are hoisted like any function declaration; classes are not usable early. This often surprises people converting legacy code to classes, especially with code that registers subclasses at the top of a file.</p>`,
        code: { lang: 'js', run: true, code: `
const legacy = new OldUser('asha');   // works: function declaration is hoisted
console.log(legacy.name);
function OldUser(name) { this.name = name; }

try {
  const u = new User('ben');          // class still in TDZ
  console.log(u.name);
} catch (e) {
  console.log(e.name + ': ' + e.message);
}
class User { constructor(name) { this.name = name; } }
console.log(new User('ben').name);    // fine after the declaration
` } }
    ],
    deepDive: `<p><b>Spec view.</b> A <code>let</code>/<code>const</code>/<code>class</code> binding is created by <code>CreateMutableBinding</code>/<code>CreateImmutableBinding</code> when its scope is instantiated, and stays uninitialised until <code>InitializeBinding</code> runs on the declaration. <code>GetBindingValue</code> and <code>SetMutableBinding</code> on an uninitialised binding throw ReferenceError. <code>let x;</code> with no initialiser initialises to <code>undefined</code> when that line runs. <code>const</code> without an initialiser is a SyntaxError. Assigning to an initialised <code>const</code> throws TypeError ("Assignment to constant variable") — a different error type than the TDZ.</p>
      <p><b>The cost of the TDZ.</b> Engines must sometimes insert a "hole check" on every access to a <code>let</code>/<code>const</code> that might be read before initialisation (for example from a closure). V8 stores a special <i>the_hole</i> sentinel in the slot and checks for it; when static analysis proves the access always happens after initialisation (same scope, later line, no closure), the check is removed. This is a real, measurable cost in very hot code: when the TypeScript team bundled its own compiler for TS 5.0 (2023), they reported a noticeable speed-up from emitting top-level <code>var</code> instead of <code>let</code>/<code>const</code>, citing TDZ checks as a reason. For normal application code the cost is negligible — never trade correctness for it.</p>
      <p><b>Module-level TDZ and import cycles.</b> With ES modules A ↔ B, if A starts evaluating, imports B, and B's top-level code reads <code>A.config</code> (a <code>const</code>), B hits A's TDZ because A has not finished running. In bundled apps this shows up as "Cannot access 'X' before initialization" only in production builds when module order changes. Fixes: break the cycle, move the read into a function called later, or export a function instead of a value.</p>
      <p><b>Global TDZ across scripts.</b> Top-level <code>let</code> in one classic script lives in the shared global declarative record. If a second script runs a function that reads it before the first script's <code>let</code> line executed (e.g. after an exception aborted the first script), the binding can be stuck in the TDZ <b>forever</b> for that page — you cannot redeclare it either.</p>
      <p><b>Not TDZ:</b> function declarations, <code>var</code>, parameters without defaults, and <code>import</code> bindings of already-evaluated modules.</p>`,
    aiEra: `<p><b>What AI changes:</b> because AI tools default to <code>const</code> and arrow functions, the TDZ is now the most common way "use before define" bugs show up — especially after an AI refactor reorders code or splits a file and creates an import cycle. The error message is clear, but the <i>cause</i> (module evaluation order) often is not.</p>
      <p><b>Use AI as a partner:</b> when you see "Cannot access 'X' before initialization" in a bundled app, ask <code>"Find import cycles involving the module that exports X and show which module's top-level code reads X during evaluation"</code>. Tools like <code>madge --circular</code> plus AI explanation find these fast.</p>
      <p><b>Where AI goes wrong:</b> models often suggest "just change const to var" to silence a TDZ error. That turns a loud bug into a silent <code>undefined</code>. They also claim <code>typeof</code> is always safe — false inside the TDZ.</p>
      <p><b>What you must still own:</b> explaining TDZ as "created at scope start, initialised at the declaration line", telling apart the three different errors (not defined / before initialization / assignment to constant), and fixing the real ordering problem instead of hiding it.</p>`,
    problems: [
      {
        title: 'Environment Record with TDZ and const', level: 'Medium', tags: ['TDZ', 'simulation', 'class design'], companies: ['Microsoft', 'Adobe'],
        statement: `<p>Implement a class <code>Env</code> that behaves like a JavaScript lexical environment:</p><ul><li><code>new Env(outer)</code> — optional outer Env.</li><li><code>declare(name, kind)</code> — kind is <code>'let'</code> or <code>'const'</code>; the binding starts <b>uninitialised</b>. Declaring the same name twice in one Env throws <code>SyntaxError</code>.</li><li><code>init(name, value)</code> — runs the declaration line.</li><li><code>get(name)</code> / <code>set(name, value)</code> — look up through the chain. Uninitialised → <code>ReferenceError("Cannot access 'name' before initialization")</code>; missing everywhere → <code>ReferenceError("name is not defined")</code>; <code>set</code> on a const → <code>TypeError("Assignment to constant variable.")</code>.</li></ul>`,
        constraints: `Chain depth ≤ 100. Names are strings.`,
        example: `<p>global: let x = 1. block: declare let x (not yet initialised). <code>block.get('x')</code> → ${H.c('r', "ReferenceError: Cannot access 'x' before initialization")} (shadowing TDZ). After <code>block.init('x', 2)</code>: ${H.c('g', '2')}.</p>`,
        brute: { why: `<p>Storing <code>undefined</code> for "not yet initialised" makes it impossible to distinguish <code>let x;</code> (initialised to undefined) from the TDZ, and a plain object chain via prototypes leaks inherited names like <code>toString</code>.</p>`,
          code: `
class EnvBrute {
  constructor(outer) { this.vars = Object.create(outer ? outer.vars : null); }
  declare(name) { this.vars[name] = undefined; } // TDZ lost: looks initialised
  init(name, value) { this.vars[name] = value; }
  get(name) { if (!(name in this.vars)) throw new ReferenceError(name + ' is not defined'); return this.vars[name]; }
}` },
        mcq: { q: 'Which value should mark "binding exists but is in its TDZ"?', options: ['A unique sentinel (e.g. a Symbol) that user code can never produce', '<code>undefined</code>', '<code>null</code>', 'Delete the key until init'], answer: 0, explain: 'undefined and null are legal values. Deleting the key would make the lookup fall through to an outer scope — wrong, because the inner binding must shadow the outer one even during its TDZ.' },
        hints: [`<p>Hint 1: each Env owns a <code>Map</code> from name → <code>{ kind, value }</code> plus an <code>outer</code> pointer.</p>`, `<p>Hint 2: use a private <code>Symbol('TDZ')</code> as the initial value. The lookup must <b>stop</b> at the first Env that has the name, even if it is still TDZ — that is what makes shadowing TDZ work.</p>`, `<p>Hint 3: <code>find(name)</code> walks the chain and returns the record or null; <code>get</code>/<code>set</code> check: null → not defined; TDZ → before initialization; set + const → TypeError.</p>`],
        tests: { sig: 'string -> string[]', fn: 'envRun', harness: { js: `function envRun(kind) {
  const show = (f) => { try { return String(f()); } catch (e) { return e.name + ': ' + e.message; } };
  const shownName = (f) => { try { f(); return 'no error'; } catch (e) { return e.name; } };
  const g = new Env();
  switch (kind) {
    case 'shadow-tdz': { g.declare('x', 'let'); g.init('x', 1); const b = new Env(g); b.declare('x', 'let'); const r = [show(() => b.get('x'))]; b.init('x', 2); r.push(show(() => b.get('x')), show(() => g.get('x'))); return r; }
    case 'const': { g.declare('PI', 'const'); g.init('PI', 3.14); const b = new Env(g); return [show(() => b.set('PI', 3)), show(() => b.get('PI'))]; }
    case 'missing': return [show(() => new Env(g).get('nope')), show(() => g.set('nope', 1))];
    case 'redeclare': { g.declare('x', 'let'); return [shownName(() => g.declare('x', 'let')), shownName(() => g.declare('x', 'const'))]; }
    case 'set-let': { g.declare('a', 'let'); g.init('a', 1); g.set('a', 5); return [show(() => g.get('a'))]; }
    case 'set-tdz': { g.declare('a', 'let'); return [show(() => g.set('a', 1))]; }
    case 'set-outer': { g.declare('x', 'let'); g.init('x', 1); const b = new Env(g); b.set('x', 9); return [show(() => g.get('x')), show(() => b.get('x'))]; }
    case 'same-name-diff-env': { g.declare('x', 'let'); const b = new Env(g); b.declare('x', 'const'); return ['ok']; }
    case 'const-tdz': { g.declare('k', 'const'); return [show(() => g.set('k', 1)), show(() => g.get('k'))]; }
    case 'undefined-value': { g.declare('u', 'let'); g.init('u', undefined); return [show(() => g.get('u'))]; }
    case 'three-levels': { g.declare('top', 'const'); g.init('top', 'T'); const m = new Env(g), i = new Env(m); m.declare('mid', 'let'); m.init('mid', 'M'); return [show(() => i.get('top')), show(() => i.get('mid')), show(() => g.get('mid'))]; }
    case 'deep-100': { let e = g; g.declare('n0', 'let'); g.init('n0', 0); for (let i = 1; i < 100; i++) { e = new Env(e); e.declare('n' + i, 'let'); e.init('n' + i, i); } return [show(() => e.get('n0')), show(() => e.get('n99')), show(() => e.get('n50'))]; }
    case 'tdz-shadow-const': { g.declare('v', 'const'); g.init('v', 1); const b = new Env(g); b.declare('v', 'let'); return [show(() => b.set('v', 2)), show(() => g.get('v'))]; }
    case 'sibling-isolation': { const a = new Env(g), b = new Env(g); a.declare('s', 'let'); a.init('s', 1); return [show(() => b.get('s')), show(() => a.get('s'))]; }
    case 'reassign-multiple': { g.declare('c', 'let'); g.init('c', 1); for (let i = 0; i < 1000; i++) g.set('c', i); return [show(() => g.get('c'))]; }
  }
}` }, cases: [
          [["shadow-tdz"],["ReferenceError: Cannot access 'x' before initialization","2","1"]],
          [["const"],["TypeError: Assignment to constant variable.","3.14"]],
          [["missing"],["ReferenceError: nope is not defined","ReferenceError: nope is not defined"]],
          [["redeclare"],["SyntaxError","SyntaxError"]],
          [["set-let"],["5"]],
          [["set-tdz"],["ReferenceError: Cannot access 'a' before initialization"]],
          [["set-outer"],["9","9"]],
          [["same-name-diff-env"],["ok"]],
          [["const-tdz"],["ReferenceError: Cannot access 'k' before initialization","ReferenceError: Cannot access 'k' before initialization"]],
          [["undefined-value"],["undefined"]],
          [["three-levels"],["T","M","ReferenceError: mid is not defined"]],
          [["deep-100"],["0","99","50"]],
          [["tdz-shadow-const"],["ReferenceError: Cannot access 'v' before initialization","1"]],
          [["sibling-isolation"],["ReferenceError: s is not defined","1"]],
          [["reassign-multiple"],["999"]]
        ] },
        solution: {
          approach: `<p>Each environment is a Map plus an outer link. A sentinel marks uninitialised bindings. Lookups stop at the first environment that declares the name, so an inner binding in its TDZ correctly shadows an initialised outer one.</p>`,
          code: { lang: 'js', run: true, code: `
const TDZ = Symbol('TDZ');

class Env {
  constructor(outer = null) {
    this.outer = outer;
    this.bindings = new Map(); // name -> { kind, value }
  }
  declare(name, kind) {
    if (this.bindings.has(name)) throw new SyntaxError("Identifier '" + name + "' has already been declared");
    this.bindings.set(name, { kind, value: TDZ });
  }
  init(name, value) {
    this.bindings.get(name).value = value; // the declaration line runs
  }
  find(name) {
    for (let env = this; env; env = env.outer) {
      if (env.bindings.has(name)) return env.bindings.get(name); // stop at FIRST match
    }
    return null;
  }
  get(name) {
    const rec = this.find(name);
    if (!rec) throw new ReferenceError(name + ' is not defined');
    if (rec.value === TDZ) throw new ReferenceError("Cannot access '" + name + "' before initialization");
    return rec.value;
  }
  set(name, value) {
    const rec = this.find(name);
    if (!rec) throw new ReferenceError(name + ' is not defined');
    if (rec.value === TDZ) throw new ReferenceError("Cannot access '" + name + "' before initialization");
    if (rec.kind === 'const') throw new TypeError('Assignment to constant variable.');
    rec.value = value;
  }
}

const show = (fn) => { try { console.log(fn()); } catch (e) { console.log(e.name + ': ' + e.message); } };
const globalEnv = new Env();
globalEnv.declare('x', 'let'); globalEnv.init('x', 1);
const block = new Env(globalEnv);
block.declare('x', 'let');                 // shadows global x, TDZ starts
show(() => block.get('x'));                // ReferenceError: Cannot access 'x' ...
block.init('x', 2);
show(() => block.get('x'));                // 2
globalEnv.declare('PI', 'const'); globalEnv.init('PI', 3.14);
show(() => block.set('PI', 3));            // TypeError
show(() => block.get('nope'));             // ReferenceError: nope is not defined
show(() => block.declare('x', 'let'));     // SyntaxError
` },
          dry: { head: ['operation', 'block has x?', 'record value', 'result'], rows: [["block.declare('x')", 'yes', 'TDZ', '—'], ["block.get('x')", 'yes (stop here)', 'TDZ', H.c('r', 'ReferenceError')], ["block.init('x', 2)", 'yes', '2', '—'], ["block.get('x')", 'yes', '2', H.c('g', '2')], ["block.set('PI', 3)", 'no → global has PI', '3.14 (const)', H.c('r', 'TypeError')]] },
          complexity: `<p>O(D) per get/set for chain depth D; O(1) per declare/init.</p>`,
          followUps: ['Add <code>var</code> semantics: hoist to the nearest function Env and initialise to undefined immediately.', 'Add <code>typeofName(name)</code> that returns "undefined" for missing names but still throws for TDZ.', 'How would you model a closure capturing this Env?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 5 — Closures: functions that remember
     ====================================================================== */
  topics.push({
    title: 'Closures: Functions That Remember Where They Were Born',
    analogy: `<p>A <b>backpack</b>. When a function is created inside another function, it packs a backpack containing a <b>link</b> to the variables around it. Even after the outer function has finished and "left the building", the inner function keeps carrying that backpack wherever it goes — into a timer, an event handler, another module. Note: the backpack holds the <b>actual variables</b> (like a key to a shared locker), not photocopies. If someone changes what is in the locker, the function sees the new contents next time it looks.</p>`,
    explain: `<p>A <b>closure</b> is a function <b>together with</b> the scope it was created in. Because of lexical scoping (Topic 2), a function can always see variables from where it was written. A closure is what happens when that function <b>outlives</b> the scope — the scope is kept alive for it instead of being thrown away.</p>
      <p>The three-ingredient recipe:</p>
      <ol>
        <li>A function is defined <b>inside</b> another function (or block).</li>
        <li>The inner function uses a variable from the outer one.</li>
        <li>The inner function <b>escapes</b>: it is returned, stored in an object, passed as a callback, or scheduled with a timer.</li>
      </ol>
      <p>Then, after the outer call returns, the inner function can still read <b>and change</b> those variables. Nobody else can reach them — which makes closures JavaScript's original way to create <b>private state</b>.</p>
      ${H.table(['Key fact', 'What it means in practice'], [
        ['Captures <b>variables</b>, not values', 'If the variable changes later, the closure sees the new value ("live binding")'],
        ['Each call of the outer function makes a <b>new</b> scope', 'Two counters from two calls have independent counts'],
        ['Closures from the <b>same</b> call share one scope', 'A <code>get</code> and a <code>set</code> returned together see each other\'s changes'],
        ['The scope lives as long as some closure can reach it', 'Closures can keep large data in memory (leaks)'],
        ['Every JS function is technically a closure', 'It only becomes interesting when the function outlives its birthplace']
      ])}
      ${H.kv([['a', 'ƒ → Env#1 { count: 2 }'], ['b', 'ƒ → Env#2 { count: 1 }']], { label: 'Two counters, two backpacks' })}
      <p>You use closures all the time, often without naming them: callbacks to <code>setTimeout</code> and <code>addEventListener</code>, array callbacks that use an outer variable, React hooks (every render's handlers close over that render's props and state), middleware factories in Express, and module patterns.</p>`,
    clues: [
      '"What is a closure?" — expected answer: function + its lexical environment, kept alive after the outer function returns',
      '"Create a function that remembers / keeps state between calls without a global" → closure',
      '"Private variables in JavaScript (before #private fields)" → closure / module pattern',
      'A function returning a function, e.g. <code>makeCounter()</code>, <code>makeAdder(5)</code> → each call creates a new environment',
      '"Why does my callback see an old value?" (stale closure in React) → the closure captured an earlier render\'s binding',
      '"Memory leak with event listeners / timers" → closures keeping big objects reachable',
      '"Do closures capture by value or by reference?" → the variable (binding) itself, so later changes are visible'
    ],
    code: [{ lang: 'js', run: true, title: 'Closures: private, independent, live (runnable)', code: `
function makeCounter(label) {
  let count = 0;                 // private: only the inner function can reach it
  return function () {
    count++;                     // reads AND writes the captured variable
    return label + ':' + count;
  };
}

const a = makeCounter('A');      // Env#1 { label: 'A', count: 0 }
const b = makeCounter('B');      // Env#2 { label: 'B', count: 0 }
console.log(a(), a(), b(), a()); // A:1 A:2 B:1 A:3  -> independent environments
console.log(typeof count);       // 'undefined' - no outside access

// Closures returned from the SAME call share one environment
function makeBox(initial) {
  let value = initial;
  return {
    get: () => value,
    set: (v) => { value = v; }
  };
}
const box = makeBox('first');
box.set('second');
console.log(box.get());          // second - get sees set's change
` }],
    codeTitle: ['Closure basics'],
    viz: [{
      title: 'Two counters, two captured environments',
      input: 'a a b a b',
      inputLabel: 'Calls to make, in order (a or b), e.g. a a b a',
      gen: function (input) {
        var calls = words(input, 'a a b a b').map(function (w) { return w.replace(/\(\)$/, '').toLowerCase(); });
        if (!calls.length || calls.some(function (c) { return c !== 'a' && c !== 'b'; })) throw new Error('Type a sequence of a and b, e.g. "a a b a"');
        if (calls.length > 12) throw new Error('Use at most 12 calls');
        var code = [
          'function makeCounter(label) {',
          '  let count = 0;',
          '  return function () {',
          '    count++;',
          "    return label + ':' + count;",
          '  };',
          '}',
          "const a = makeCounter('A');",
          "const b = makeCounter('B');",
          '// now call a() / b() as typed in the input box'
        ].join('\n');
        var cnt = { a: 0, b: 0 }, outs = [];
        function heap(hl, ehl, showB) {
          var nodes = [{ id: 'a', label: 'const a', x: 12, y: 10 }, { id: 'E1', label: "Env#1 label='A' count=" + cnt.a, x: 52, y: 10 }, { id: 'G', label: 'Global', x: 88, y: 25 }];
          var edges = [['a', 'E1', 'closure'], ['E1', 'G', 'outer']];
          if (showB) { nodes.push({ id: 'b', label: 'const b', x: 12, y: 40 }); nodes.push({ id: 'E2', label: "Env#2 label='B' count=" + cnt.b, x: 52, y: 40 }); edges.push(['b', 'E2', 'closure']); edges.push(['E2', 'G', 'outer']); }
          return boxes('Heap: who keeps which environment alive', nodes, edges, hl, ehl, {}, 50);
        }
        var frames = [];
        frames.push({ narr: '<code>makeCounter(\'A\')</code> is called: a new environment <b>Env#1</b> is created with <code>label = \'A\'</code>, <code>count = 0</code>.',
          parts: [{ type: 'code', lang: 'js', code: code, hl: { 8: 'cur', 2: 'ok' } }, { type: 'stack', label: 'Call stack', items: ['global', "makeCounter('A')"], hl: { 1: 'cur' } }, { type: 'vars', label: 'Env#1 (makeCounter call #1)', vals: { label: "'A'", count: 0 }, hl: { count: 'ok' } }] });
        frames.push({ narr: 'It returns the inner function. makeCounter\'s stack frame is popped… but Env#1 is <b>not</b> destroyed: the returned function (now stored in <code>a</code>) still points to it. That pointer is the <b>closure</b>.',
          parts: [{ type: 'code', lang: 'js', code: code, hl: { 3: 'ok' } }, { type: 'stack', label: 'Call stack', items: ['global'], hl: { 0: 'cur' } }, heap({ E1: 'ok' }, { 'a-E1': 'ok' }, false)] });
        frames.push({ narr: '<code>makeCounter(\'B\')</code> runs the same code again but creates a <b>separate</b> Env#2. Same code, different backpack.',
          parts: [{ type: 'code', lang: 'js', code: code, hl: { 9: 'cur' } }, heap({ E2: 'ok' }, { 'b-E2': 'ok' }, true)] });
        calls.forEach(function (c, i) {
          cnt[c]++;
          var envId = c === 'a' ? 'E1' : 'E2', L = c === 'a' ? 'A' : 'B';
          outs.push(L + ':' + cnt[c]);
          var hl = {}; hl[envId] = 'cur'; hl[c] = 'cur';
          var ehl = {}; ehl[c + '-' + envId] = 'cur';
          frames.push({ narr: 'Call #' + (i + 1) + ': <code>' + c + '()</code> follows its closure to <b>' + (c === 'a' ? 'Env#1' : 'Env#2') + '</b> and does <code>count++</code> there → ' + cnt[c] + '. The other environment is untouched.',
            parts: [{ type: 'code', lang: 'js', code: code, hl: { 4: 'cur', 5: 'ok' } }, { type: 'stack', label: 'Call stack', items: ['global', c + '()'], hl: { 1: 'cur' } }, heap(hl, ehl, true), out(outs)] });
        });
        frames.push({ narr: 'Done. <code>a</code> was called ' + calls.filter(function (c) { return c === 'a'; }).length + ' time(s) and <code>b</code> ' + calls.filter(function (c) { return c === 'b'; }).length + ' time(s); each count lives in its own environment that only its own function can reach.',
          parts: [heap({ E1: 'sel', E2: 'sel' }, {}, true), { type: 'table', label: 'Final private state', columns: ['function', 'environment', 'count'], rows: [['a', 'Env#1', cnt.a], ['b', 'Env#2', cnt.b]] }, out(outs)] });
        return frames;
      }
    }, {
      title: 'Closures capture variables, not snapshots (shared environment)',
      gen: function () {
        var code = [
          'function makeBox() {',
          "  let value = 'first';",
          '  const get = () => value;',
          '  const set = (v) => { value = v; };',
          '  return { get, set };',
          '}',
          'const box = makeBox();',
          'console.log(box.get());',
          "box.set('second');",
          'console.log(box.get());'
        ].join('\n');
        function heap(val, hl, ehl) {
          return boxes('Both closures point at ONE environment', [{ id: 'get', label: 'box.get', x: 15, y: 10 }, { id: 'set', label: 'box.set', x: 15, y: 40 }, { id: 'E', label: 'Env { value: ' + val + ' }', x: 62, y: 25 }], [['get', 'E', 'closure'], ['set', 'E', 'closure']], hl, ehl, {}, 50);
        }
        var steps = [
          { l: 7, narr: '<code>makeBox()</code> creates one environment with <code>value = \'first\'</code> and two arrow functions created in it.', envs: [['makeBox() environment', { value: "'first'" }, { value: 'ok' }]], st: ['global', 'makeBox()'], out: [] },
          { l: 5, narr: 'Both functions are returned inside an object. They do not get copies of <code>value</code> — they both hold a link to the <b>same</b> environment.', extra: [heap("'first'", { E: 'ok' }, { 'get-E': 'ok', 'set-E': 'ok' })], st: ['global'], out: [] },
          { l: 8, narr: '<code>box.get()</code> reads <code>value</code> through its link → <b>first</b>.', extra: [heap("'first'", { get: 'cur', E: 'cur' }, { 'get-E': 'cur' })], st: ['global', 'get()'], out: ['first'] },
          { l: 9, narr: '<code>box.set(\'second\')</code> writes through <b>its</b> link into the same environment.', extra: [heap("'second'", { set: 'cur', E: 'ok' }, { 'set-E': 'cur' })], st: ['global', 'set()'], out: ['first'] },
          { l: 10, cls: 'ok', narr: '<code>box.get()</code> now sees <b>second</b>. Closures capture the <b>variable</b> (a live link), not the value at creation time.', extra: [heap("'second'", { get: 'sel', E: 'sel' }, { 'get-E': 'ok' })], st: ['global', 'get()'], out: ['first', 'second'] }
        ];
        return codeFrames(code, steps);
      }
    }],
    examples: [
      { title: 'Live binding: the closure sees later changes', html: `<p><code>greet</code> was created while <code>greeting</code> was "Hello", but it reads the variable <b>when called</b>. Predict: ${H.c('b', 'Hi, Asha')}.</p>`,
        code: { lang: 'js', run: true, code: `
let greeting = 'Hello';
const greet = (name) => greeting + ', ' + name;
greeting = 'Hi';
console.log(greet('Asha')); // Hi, Asha
` } },
      { title: 'The "stale closure" (how React handlers see old state)', html: `<p>Each call of <code>render</code> creates a <b>new</b> <code>count</code> binding. A handler created during render 1 closes over render 1's binding forever. That is exactly the React "stale closure" bug with <code>useEffect</code>/<code>setInterval</code> — fixed with dependency arrays, functional updates (<code>setCount(c =&gt; c + 1)</code>) or refs.</p>${H.table(['handler', 'closes over', 'returns'], [['from render 1', 'count of call #1', H.c('r', '1 (stale)')], ['from render 2', 'count of call #2', H.c('g', '2')]])}`,
        code: { lang: 'js', run: true, code: `
function render(count) {
  const onClick = () => 'clicked with count = ' + count;
  return onClick;
}
const handlerFromRender1 = render(1);
const handlerFromRender2 = render(2);
console.log(handlerFromRender1()); // clicked with count = 1  (stale)
console.log(handlerFromRender2()); // clicked with count = 2
` } },
      { title: 'Closures outlive their function: timers', html: `<p><code>remindLater</code> returns immediately, yet 10 ms later the arrow function still knows <code>msg</code>. The timer holds the function, the function holds the environment.</p>`,
        code: { lang: 'js', run: true, code: `
function remindLater(msg, ms) {
  setTimeout(() => console.log('Reminder:', msg), ms);
  console.log('remindLater returned');
}
remindLater('drink water', 10);
console.log('main code finished');
` } },
      { title: 'What exactly is kept alive?', html: `<p>Modern engines keep only the variables that inner functions actually reference. Here <code>bigRows</code> is not used by the returned function, so it can be garbage-collected after <code>makeReport</code> returns; only <code>total</code> stays. <b>But</b> if any other closure from the same call used <code>bigRows</code> (or the function used <code>eval</code>), it would be kept for all of them, because sibling closures share one context.</p>`,
        code: { lang: 'js', run: true, code: `
function makeReport() {
  const bigRows = new Array(100000).fill('row'); // large temporary data
  const total = bigRows.length;
  return () => 'rows: ' + total;                 // captures only total
}
const report = makeReport();
console.log(report()); // rows: 100000
` } },
      { title: 'Function factories: makeAdder / makeMultiplier', html: `<p>A factory returns specialised functions, each with its own captured configuration. This is also the idea behind <b>partial application</b> and middleware factories like <code>rateLimit({ max: 100 })</code>.</p>`,
        code: { lang: 'js', run: true, code: `
const makeAdder = (n) => (x) => x + n;
const add5 = makeAdder(5);
const add10 = makeAdder(10);
console.log(add5(1), add10(1));               // 6 11
console.log([1, 2, 3].map(makeAdder(100)));   // [ 101, 102, 103 ]
` } }
    ],
    deepDive: `<p><b>Spec view.</b> A closure is not a special object type — it is the normal function object plus its <code>[[Environment]]</code> slot. Calling it creates a new environment whose outer link is that slot. As long as the function object is reachable, the environment chain it points to is reachable, so the GC keeps it.</p>
      <p><b>V8 view: Contexts.</b> During scope analysis V8 marks each variable as <i>stack-allocated</i> (never captured) or <i>context-allocated</i> (captured by some inner function). Captured variables live in a heap-allocated <b>Context</b> object; the inner function's JSFunction has a pointer to it. Crucially, all closures created by one invocation share <b>one</b> Context for that scope. So if closure A uses a huge array and closure B only uses a tiny number, keeping B alive keeps the array alive too. This is the famous "Meteor leak" pattern (2013): a chain of closures each retaining the previous one through a shared context.</p>
      <p><b>DevTools.</b> In a heap snapshot, a closure shows up as <code>(closure)</code> with a <code>context</code> edge; retainers tell you which listener, timer or cache holds it. In the debugger, the Scope pane lists <i>Local</i>, <i>Closure (makeCounter)</i>, <i>Script</i> and <i>Global</i> — the scope chain made visible. Note the debugger can show "Optimized away" for captured-but-unused variables.</p>
      <p><b>Performance.</b> Creating a closure costs an allocation (function object, plus a Context if the scope captures anything). Creating closures in hot loops is usually fine in 2026 engines, but allocation-heavy code (e.g., an arrow per element per frame in a game loop) can increase GC pressure. Reading a captured variable is a couple of pointer hops — cheap.</p>
      <p><b>Closures vs classes.</b> Private state via closures is truly private and needs no <code>this</code> (no binding bugs), but each instance gets its own copy of every method function (more memory), and you cannot add methods via a shared prototype. <code>#private</code> class fields (ES2022) give privacy with shared prototype methods. Both are valid; pick by style and instance count.</p>
      <p><b>Garbage-collection gotchas.</b> Long-lived closures (global event listeners, intervals, module-level caches, unresolved promises holding callbacks) are the #1 cause of JS memory leaks. Always pair <code>addEventListener</code> with removal (or use <code>{ signal }</code> from an <code>AbortController</code>), clear intervals, and bound your caches.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes closure-heavy code effortlessly — factories, hooks, callbacks — so the bottleneck has moved from <i>writing</i> closures to <i>reviewing</i> what they capture. Stale closures in React effects and accidental retention of large objects are classic AI-generated bugs because they compile, pass simple tests and fail only over time.</p>
      <p><b>Use AI as a partner:</b> ask <code>"For each function in this file that escapes (returned, stored, passed as callback), list the outer variables it captures and how long it lives"</code>. Ask it to write a heap-snapshot reproduction for a suspected listener leak. Use it to generate predict-the-output closure puzzles.</p>
      <p><b>Where AI goes wrong:</b> claiming closures "copy the value at creation time" (they capture the variable), suggesting a <code>useEffect</code> with an empty dependency array that reads changing state (stale closure), and adding listeners in effects without cleanup.</p>
      <p><b>What you must still own:</b> a precise definition (function + lexical environment), the ability to draw the environments on a whiteboard, and the judgment to spot what a long-lived closure keeps alive.</p>`,
    problems: [
      {
        title: 'Counter Factory with Step, Peek and Reset', level: 'Easy', tags: ['closures', 'private state'], companies: ['Meta', 'Zoho'],
        statement: `<p>Write <code>createCounter(start = 0, step = 1)</code> returning an object with three methods sharing <b>private</b> state:</p><ul><li><code>next()</code> — returns the current value, then advances by <code>step</code>.</li><li><code>peek()</code> — returns the current value without changing it.</li><li><code>reset()</code> — goes back to <code>start</code>.</li></ul><p>Two counters must be independent, and the state must not be reachable from outside (no <code>counter.value</code>).</p>`,
        constraints: `start, step are integers; up to 10<sup>5</sup> calls.`,
        example: `<p><code>c = createCounter(10, 5)</code>: next() → ${H.c('g', '10')}, next() → ${H.c('g', '15')}, peek() → ${H.c('b', '20')}, reset(); next() → ${H.c('g', '10')}.</p>`,
        brute: { why: `<p>Keep the state as a public property on the object. It works, but any caller can write <code>c.current = -999</code> and break the counter; nothing is private and the methods depend on <code>this</code>, so <code>const n = c.next; n()</code> breaks.</p>`,
          code: `
function createCounterBrute(start = 0, step = 1) {
  return {
    current: start, // public - anyone can change it
    next() { const v = this.current; this.current += step; return v; },
    peek() { return this.current; },
    reset() { this.current = start; }
  };
}` },
        mcq: { q: 'Two counters made by two calls to <code>createCounter()</code> — why are they independent?', options: ['Each call creates a new environment with its own <code>current</code> variable', 'Because <code>let</code> copies values', 'Because objects are passed by value', 'They are not independent'], answer: 0, explain: 'Every invocation of the outer function creates a fresh scope; the returned closures point at that specific scope.' },
        hints: [`<p>Hint 1: keep <code>let current = start</code> as a local variable of <code>createCounter</code>.</p>`, `<p>Hint 2: return an object literal of arrow functions that all read/write <code>current</code>; they share one environment.</p>`, `<p>Hint 3: in <code>next()</code>, save the value first, then advance: <code>const v = current; current += step; return v;</code>. No <code>this</code> needed, so methods can be detached safely.</p>`],
        tests: { sig: 'string string[] -> string[]', fn: 'cnt', harness: { js: `function cnt(spec, ops) {
  const args = spec === '' ? [] : spec.split(',').map(Number);
  const c = createCounter(...args), b = createCounter(...args), out = [];
  for (const op of ops) {
    const m = /^(B\\.)?(next|peek|reset)(\\*(\\d+))?$/.exec(op);
    if (m) {
      const k = m[1] ? b : c, times = m[4] ? +m[4] : 1; let r;
      for (let i = 0; i < times; i++) r = k[m[2]]();
      out.push(m[2] === 'reset' ? 'ok' : r);
    } else if (op === 'hasValue') out.push(String(c.value) + '/' + String(c.current));
    else if (op === 'detached') { const f = c.next; out.push(f()); }
    else if (op === 'keys') out.push(Object.keys(c).sort().join(','));
  }
  return out;
}` }, cases: [
          [["10,5",["next","next","peek","reset","next"]],[10,15,20,"ok",10]],
          [["",["next","next","peek"]],[0,1,2]],
          [["7",["next","next"]],[7,8]],
          [["5,-2",["next","next","next","peek"]],[5,3,1,-1]],
          [["3,0",["next","next","peek"]],[3,3,3]],
          [["-3,2",["next","next","reset","peek"]],[-3,-1,"ok",-3]],
          [["0,1",["next","B.next","next","B.next","peek","B.peek"]],[0,0,1,1,2,2]],
          [["0,1",["next","next","B.reset","peek"]],[0,1,"ok",2]],
          [["10,5",["hasValue","keys"]],["undefined/undefined","next,peek,reset"]],
          [["10,5",["next","detached","peek"]],[10,15,20]],
          [["0,1",["reset","peek"]],["ok",0]],
          [["0,1",["next*100000","peek"]],[99999,100000]],
          [["5,3",["next*50000","reset","next"]],[150002,"ok",5]]
        ] },
        solution: {
          approach: `<p>Classic closure-based private state: one environment per counter, three closures sharing it. Because the methods never use <code>this</code>, they work even when passed around as callbacks.</p>`,
          code: { lang: 'js', run: true, code: `
function createCounter(start = 0, step = 1) {
  let current = start; // private, one per createCounter call
  return {
    next: () => { const v = current; current += step; return v; },
    peek: () => current,
    reset: () => { current = start; }
  };
}

const c = createCounter(10, 5);
console.log(c.next(), c.next(), c.peek()); // 10 15 20
c.reset();
console.log(c.next());                     // 10
const d = createCounter();
console.log(d.next(), d.next(), c.peek()); // 0 1 15 -> independent
const detached = c.next;                   // safe: no 'this' involved
console.log(detached());                   // 15
console.log(c.current);                    // undefined - truly private
` },
          dry: { head: ['call', 'current before', 'returned', 'current after'], rows: [['next()', '10', '10', '15'], ['next()', '15', '15', '20'], ['peek()', '20', '20', '20'], ['reset()', '20', '—', '10'], ['next()', '10', '10', '15']] },
          complexity: `<p>O(1) per call; O(1) memory per counter (one environment + three function objects).</p>`,
          followUps: ['Add <code>history()</code> returning a copy of all values produced.', 'Implement the same with a class and <code>#private</code> fields — compare memory per instance.', 'Make <code>next</code> throw after a maximum value.']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 6 — Practical closures: private state, module pattern, memoize, once
     ====================================================================== */
  topics.push({
    title: 'Closures at Work: Private State, Module Pattern, memoize and once',
    analogy: `<p>A closure is like a <b>personal assistant with a notebook</b> nobody else can read. <b>Counter</b>: the assistant keeps a tally. <b>Memoize</b>: the assistant writes down every answer they have worked out, so when you ask the same question again they read it from the notebook instead of redoing the maths. <b>Once</b>: the assistant ticks a box "already done" and politely refuses to do the job a second time, handing you the first result instead. <b>Module pattern</b>: a shop counter — customers use the counter (public API), the stockroom (private variables) stays behind the door.</p>`,
    explain: `<p>Closures give every function its own private, persistent memory. That one ability powers a toolbox of patterns interviewers ask you to <b>write from scratch</b>:</p>
      ${H.table(['Pattern', 'Captured state', 'One-line idea'], [
        ['Counter / ID generator', '<code>let count</code>', 'Each call updates the private count'],
        ['Module pattern (IIFE)', 'private variables + helpers', 'Run a function once, return only the public API'],
        ['Function factory / partial application', 'configuration (e.g. <code>prefix</code>, <code>rate</code>)', '<code>makeLogger(\'API\')</code> returns a pre-configured function'],
        ['<b>memoize</b>', 'a <code>Map</code> cache', 'Same input → return the stored answer'],
        ['<b>once</b>', '<code>done</code> flag + <code>result</code>', 'Run the real function only the first time'],
        ['debounce / throttle (preview)', 'timer id / last time', 'Control how often a function really runs']
      ])}
      <p><b>The module pattern.</b> Before ES modules, the standard way to hide internals was an <b>IIFE</b> (Immediately Invoked Function Expression): <code>const api = (function () { /* private */ return { /* public */ }; })();</code>. The function runs once, its scope becomes the private room, and the returned object's methods are closures over it. ES modules give you the same privacy at file level today, but the IIFE pattern still appears in libraries, bundler output and interviews.</p>
      <p><b>memoize</b> trades memory for speed. It only makes sense for <b>pure</b> functions — same inputs always give the same output and no side effects. The cache key must represent <i>all</i> inputs: a single primitive works directly as a <code>Map</code> key; several arguments need a combined key (e.g. <code>JSON.stringify(args)</code> for simple values, or nested Maps for object identity).</p>
      <p><b>once</b> guarantees a side effect happens exactly one time — initialising a database connection, attaching a handler, charging a card when a user double-clicks "Pay". Store the first result so later calls still get a useful answer, and forward <code>this</code> and the arguments with <code>fn.apply(this, args)</code>.</p>
      <p>All of these share the same skeleton: <b>outer function sets up private state → returns an inner function that reads/updates it</b>.</p>`,
    clues: [
      '"Implement <code>memoize(fn)</code>" / "cache the results of an expensive pure function" → closure over a Map',
      '"Implement <code>once(fn)</code>" / "make sure init runs only one time" / "prevent double submit" → closure over a done flag',
      '"How do you create private variables in JavaScript?" → closures / module pattern / #private fields',
      '"What is an IIFE and why was it used?" → private scope + module pattern before ES modules',
      '"Generate unique IDs without a global counter" → closure-based generator',
      '"Function that returns a pre-configured function" → factory / partial application',
      'LeetCode JS series: 2620 Counter, 2665 Counter II, 2666 Allow One Function Call, 2623 Memoize, 2630 Memoize II'
    ],
    code: [{ lang: 'js', run: true, title: 'memoize and once from scratch (runnable)', code: `
// memoize: cache results of a pure single-argument function
function memoize(fn) {
  const cache = new Map();                 // private, lives as long as the returned function
  return function (n) {
    if (cache.has(n)) return cache.get(n); // hit: no recomputation
    const result = fn.call(this, n);       // miss: compute once
    cache.set(n, result);
    return result;
  };
}

let realCalls = 0;
function slowSquare(n) { realCalls++; return n * n; }
const fastSquare = memoize(slowSquare);
console.log(fastSquare(4), fastSquare(4), fastSquare(9), fastSquare(4)); // 16 16 81 16
console.log('real computations:', realCalls);                            // 2

// once: run fn only the first time, remember the result
function once(fn) {
  let done = false, result;
  return function (...args) {
    if (!done) {
      done = true;                         // set BEFORE calling, protects against re-entry
      result = fn.apply(this, args);
    }
    return result;
  };
}

const connect = once((url) => { console.log('connecting to', url); return { url }; });
const c1 = connect('db://main');
const c2 = connect('db://other');          // ignored
console.log(c1 === c2, c2.url);            // true db://main
` }],
    codeTitle: ['memoize + once'],
    viz: [{
      title: 'memoize: cache hits and misses',
      input: '4 2 4 9 2 4',
      inputLabel: 'Arguments passed to fastSquare, in order',
      gen: function (input) {
        var args = words(input, '4 2 4 9 2 4').map(Number);
        if (!args.length || args.some(function (x) { return !isFinite(x); })) throw new Error('Type numbers separated by spaces, e.g. 4 2 4 9');
        if (args.length > 12) throw new Error('Use at most 12 calls');
        var code = [
          'function memoize(fn) {',
          '  const cache = new Map();',
          '  return function (n) {',
          '    if (cache.has(n)) return cache.get(n);',
          '    const result = fn(n);',
          '    cache.set(n, result);',
          '    return result;',
          '  };',
          '}',
          'const fastSquare = memoize(slowSquare);'
        ].join('\n');
        var cache = [], hits = 0, misses = 0, outs = [], frames = [];
        function state(hlKey, cls) {
          var h = {}; if (hlKey !== undefined) h[String(hlKey)] = cls;
          return [{ type: 'map', label: 'cache (private Map inside the closure)', entries: cache.map(function (e) { return [String(e[0]), e[1]]; }), hl: h },
            { type: 'vars', label: 'Stats', vals: { hits: hits, misses: misses, 'real slowSquare calls': misses }, hl: cls === 'ok' ? { hits: 'ok' } : cls === 'cur' ? { misses: 'cur' } : {} }];
        }
        frames.push({ narr: '<code>memoize(slowSquare)</code> runs once: it creates an empty <code>cache</code> and returns the inner function. <code>fastSquare</code> is a closure over that cache.',
          parts: [{ type: 'code', lang: 'js', code: code, hl: { 2: 'ok', 10: 'cur' } }].concat(state()) });
        args.forEach(function (n, i) {
          var found = null;
          cache.forEach(function (e) { if (e[0] === n) found = e; });
          if (found) {
            hits++; outs.push('fastSquare(' + n + ') = ' + found[1] + '  (hit)');
            frames.push({ narr: 'Call #' + (i + 1) + ': <code>fastSquare(' + n + ')</code> → <code>cache.has(' + n + ')</code> is <b>true</b>. <span class="c-g">Cache hit</span>: return ' + found[1] + ' instantly, no work.',
              parts: [{ type: 'code', lang: 'js', code: code, hl: { 4: 'ok' } }].concat(state(n, 'ok'), [out(outs)]) });
          } else {
            misses++;
            frames.push({ narr: 'Call #' + (i + 1) + ': <code>fastSquare(' + n + ')</code> → not in cache. <span class="c-y">Miss</span>: call the slow function.',
              parts: [{ type: 'code', lang: 'js', code: code, hl: { 4: 'bad', 5: 'cur' } }].concat(state()) });
            cache.push([n, n * n]);
            outs.push('fastSquare(' + n + ') = ' + (n * n) + '  (computed)');
            frames.push({ narr: 'Store <code>' + n + ' → ' + (n * n) + '</code> in the cache and return it. Next time ' + n + ' is free.',
              parts: [{ type: 'code', lang: 'js', code: code, hl: { 6: 'ok', 7: 'ok' } }].concat(state(n, 'cur'), [out(outs)]) });
          }
        });
        frames.push({ narr: 'Done: ' + args.length + ' calls, only <b>' + misses + '</b> real computations, ' + hits + ' answered from memory. The cache lives as long as <code>fastSquare</code> does — in real apps, cap its size (LRU) or it grows forever.',
          parts: state().concat([out(outs)]) });
        return frames;
      }
    }, {
      title: 'once: the done flag inside the closure',
      input: '3',
      inputLabel: 'How many times to call init() (1-8)',
      gen: function (input) {
        var raw = String(input === undefined ? '3' : input).trim();
        var n = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
        if (!(n >= 1 && n <= 8)) throw new Error('Type a number from 1 to 8');
        var code = [
          'function once(fn) {',
          '  let done = false, result;',
          '  return function (...args) {',
          '    if (!done) {',
          '      done = true;',
          '      result = fn.apply(this, args);',
          '    }',
          '    return result;',
          '  };',
          '}',
          "const init = once(() => { console.log('connecting'); return 'db'; });"
        ].join('\n');
        var outs = [], frames = [];
        frames.push({ narr: '<code>once(...)</code> creates a private environment with <code>done = false</code> and <code>result = undefined</code>, then returns the guard function as <code>init</code>.',
          parts: [{ type: 'code', lang: 'js', code: code, hl: { 2: 'ok', 11: 'cur' } }, { type: 'vars', label: 'Captured environment of init', vals: { done: false, result: 'undefined' }, hl: { done: 'ok' } }] });
        for (var i = 1; i <= n; i++) {
          if (i === 1) {
            frames.push({ narr: 'Call #1: <code>done</code> is false → set <code>done = true</code> <b>first</b> (so even a recursive/re-entrant call cannot run fn twice)…',
              parts: [{ type: 'code', lang: 'js', code: code, hl: { 4: 'cur', 5: 'ok' } }, { type: 'vars', label: 'Captured environment of init', vals: { done: true, result: 'undefined' }, hl: { done: 'ok' } }, out(outs)] });
            outs.push('connecting'); outs.push("init() #1 → 'db'");
            frames.push({ narr: '…then run the real function. It prints "connecting" and its return value <code>\'db\'</code> is stored in <code>result</code>.',
              parts: [{ type: 'code', lang: 'js', code: code, hl: { 6: 'cur', 8: 'ok' } }, { type: 'vars', label: 'Captured environment of init', vals: { done: true, result: "'db'" }, hl: { result: 'ok' } }, out(outs)] });
          } else {
            outs.push('init() #' + i + " → 'db' (cached, fn not called)");
            frames.push({ narr: 'Call #' + i + ': <code>done</code> is already true → skip the body and return the remembered <code>result</code>. "connecting" is <b>not</b> printed again.',
              parts: [{ type: 'code', lang: 'js', code: code, hl: { 4: 'bad', 8: 'ok' } }, { type: 'vars', label: 'Captured environment of init', vals: { done: true, result: "'db'" }, hl: { done: 'sel' } }, out(outs)] });
          }
        }
        frames.push({ narr: 'Summary: the real function ran <b>exactly once</b> out of ' + n + ' call(s). The flag lives in the closure, so no global variable and no way for outside code to reset it.',
          parts: [{ type: 'table', label: 'Calls', columns: ['call #', 'fn ran?', 'returned'], rows: Array.apply(null, { length: n }).map(function (_, k) { return [k + 1, k === 0 ? 'yes' : 'no', "'db'"]; }), hl: { 0: 'ok' } }, out(outs)] });
        return frames;
      }
    }],
    examples: [
      { title: 'Module pattern with an IIFE: a private shopping cart', html: `<p>The IIFE runs immediately and only once. <code>items</code> and <code>format</code> are private; the returned object is the public API. Nothing can push a negative price directly into <code>items</code>.</p>`,
        code: { lang: 'js', run: true, code: `
const cart = (function () {
  const items = [];                                     // private
  const format = (n) => 'Rs ' + n.toFixed(2);           // private helper

  function add(name, price) {
    if (price <= 0) throw new RangeError('price must be positive');
    items.push({ name, price });
  }
  function total() { return format(items.reduce((s, it) => s + it.price, 0)); }

  return { add, total, count: () => items.length };     // public API
})();

cart.add('pen', 20);
cart.add('book', 349.5);
console.log(cart.count(), cart.total()); // 2 Rs 369.50
console.log(cart.items);                 // undefined - private
` } },
      { title: 'Memoizing a recursive function (fib in O(n))', html: `<p>The recursive calls must go through the <b>memoized</b> version, otherwise only the top-level call is cached. Here the arrow refers to <code>fib</code>, which is the memoized function by the time it runs (called after initialisation, so no TDZ). Calls drop from ~2.7 million to 31 for n = 30.</p>`,
        code: { lang: 'js', run: true, code: `
function memoize(fn) {
  const cache = new Map();
  return (n) => {
    if (!cache.has(n)) cache.set(n, fn(n));
    return cache.get(n);
  };
}
let calls = 0;
const fib = memoize((n) => { calls++; return n < 2 ? n : fib(n - 1) + fib(n - 2); });
console.log(fib(30), 'computed with', calls, 'real calls'); // 832040 computed with 31 real calls
` } },
      { title: 'Multi-argument memoize with a string key', html: `<p>For simple primitive arguments, <code>JSON.stringify(args)</code> is an easy key. Limits: objects with the same content collide, key order matters, functions/<code>undefined</code> are dropped, and stringifying is O(size). For identity-based keys use nested Maps (see the guided problem).</p>`,
        code: { lang: 'js', run: true, code: `
function memoizeArgs(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (!cache.has(key)) cache.set(key, fn.apply(this, args));
    return cache.get(key);
  };
}
let work = 0;
const gridPaths = memoizeArgs((r, c) => { work++; return r === 0 || c === 0 ? 1 : gridPaths(r - 1, c) + gridPaths(r, c - 1); });
console.log(gridPaths(10, 10), 'work =', work); // 184756 work = 120
` } },
      { title: 'Partial application: a logger factory', html: `<p>Each logger closes over its own <code>prefix</code> and its own <code>seq</code> counter. This is the same idea as Express middleware factories (<code>cors({ origin })</code>) and Redux action creators.</p>`,
        code: { lang: 'js', run: true, code: `
function makeLogger(prefix) {
  let seq = 0;
  return (msg) => console.log('[' + prefix + ' #' + (++seq) + '] ' + msg);
}
const apiLog = makeLogger('API');
const dbLog = makeLogger('DB');
apiLog('request received');
dbLog('query ran');
apiLog('response sent'); // [API #2] response sent
` } },
      { title: 'Preview: debounce is a closure over a timer id', html: `<p>Debounce waits until calls stop for <code>ms</code> milliseconds, then runs once. The private <code>timer</code> survives between calls thanks to the closure. Full treatment comes in the Patterns and Polyfills modules.</p>`,
        code: { lang: 'js', run: true, code: `
function debounce(fn, ms) {
  let timer = null;                          // private, shared by all calls
  return function (...args) {
    clearTimeout(timer);                     // cancel the previous pending run
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
const search = debounce((q) => console.log('searching for', q), 20);
search('j'); search('ja'); search('jav'); search('java'); // only the last one runs
` } }
    ],
    deepDive: `<p><b>memoize correctness checklist.</b> (1) Only for <b>pure, deterministic</b> functions — memoizing <code>Date.now()</code>-dependent or random code returns stale answers. (2) Use <code>cache.has(key)</code>, not <code>if (cache.get(key))</code>, otherwise results like <code>0</code>, <code>''</code> or <code>undefined</code> are recomputed every time. (3) Map keys compare with SameValueZero: <code>NaN</code> matches <code>NaN</code>, <code>+0</code> matches <code>-0</code>, objects match by identity. (4) Forward <code>this</code> if the function is a method. (5) Async functions: cache the <b>promise</b>, and delete the entry on rejection so failures are retried.</p>
      <p><b>Unbounded caches are memory leaks.</b> A memoized function lives as long as its module, so its cache does too. Production options: LRU with a max size (a <code>Map</code> preserves insertion order — delete + re-set to mark as recent, evict <code>map.keys().next().value</code>), TTL expiry, or <code>WeakMap</code> keyed by objects so entries vanish when the key object is garbage-collected. Libraries: lodash <code>_.memoize</code> (exposes <code>.cache</code>), <code>memoize-one</code> (only the last call — perfect for React selectors), Reselect, React's <code>useMemo</code>/<code>React.cache</code>.</p>
      <p><b>once and re-entrancy.</b> Set <code>done = true</code> <i>before</i> calling <code>fn</code>. If <code>fn</code> throws, decide the policy: lodash's <code>once</code> stays "done" (returns undefined later); some codebases reset <code>done</code> in a catch so a failed init can be retried. For async init, store the promise so concurrent callers share one in-flight attempt. Also release the reference with <code>fn = null</code> after the call so whatever <code>fn</code> captured can be garbage-collected.</p>
      <p><b>Module pattern trade-offs.</b> The revealing module pattern (define everything privately, return an object mapping names to functions) is readable, but private functions cannot be patched or tested directly, and every module instance gets fresh function objects. ES modules are now the default; they also give a singleton module scope, live bindings and static analysis for tree-shaking — none of which IIFEs provide.</p>
      <p><b>Closures vs #private.</b> <code>#count</code> in a class is also hard-private, works with <code>instanceof</code> and shares methods on the prototype. Closures are better for one-off functions (once/memoize/debounce) and when you want detachable methods with no <code>this</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> "write memoize/once/debounce" is now a two-second prompt, so interviews increasingly ask you to <b>extend</b> or <b>critique</b> one: add LRU eviction, make it async-safe, handle <code>this</code>, explain why a cache leaks. Machine-coding rounds may even hand you AI-generated code with a subtle bug.</p>
      <p><b>Use AI as a partner:</b> generate edge-case tests: <code>"Write tests for memoize that cover 0/undefined results, NaN keys, object arguments by identity, method this, and thrown errors"</code>. Ask for a comparison of lodash <code>memoize</code> vs <code>memoize-one</code> for a React selector.</p>
      <p><b>Where AI goes wrong:</b> it often writes <code>if (cache[key]) return cache[key]</code> (falsy results recomputed, and plain-object caches collide with <code>__proto__</code>/<code>toString</code>), uses <code>JSON.stringify</code> keys for object arguments without warning, forgets <code>this</code> forwarding in <code>once</code>, memoizes impure functions, and never bounds the cache.</p>
      <p><b>What you must still own:</b> knowing <i>when</i> memoization is valid (purity), what the key must contain, how long the cache lives, and how to explain the closure that makes it all work.</p>`,
    problems: [
      {
        title: 'Memoize Any Arity (Memoize II)', level: 'Hard', tags: ['closures', 'memoize', 'Map', 'trie'], companies: ['Google', 'Meta', 'Amazon'],
        statement: `<p>Write <code>memoize(fn)</code> that works for <b>any number of arguments of any type</b>. Two calls hit the same cache entry only if they have the same number of arguments and each argument is identical (<code>===</code>, except <code>NaN</code> equals <code>NaN</code>). Objects are compared by <b>reference</b>, not content: <code>f({})</code> twice computes twice. Also expose <code>memoized.size()</code> = number of cached results.</p>`,
        constraints: `Up to 10<sup>5</sup> calls, up to 10 arguments per call. <code>fn</code> is pure. Results may be falsy (0, '', null, undefined).`,
        example: `<p>const o = {x:1}; m = memoize((a,b) =&gt; …). m(1,2) ${H.c('y', 'computed')}, m(1,2) ${H.c('g', 'cached')}, m(o,2) ${H.c('y', 'computed')}, m(o,2) ${H.c('g', 'cached')}, m({x:1},2) ${H.c('y', 'computed (different object)')}, m(1) ${H.c('y', 'computed (different arity)')}.</p>`,
        brute: { why: `<p><code>JSON.stringify(args)</code> as the key: <code>{x:1}</code> and another <code>{x:1}</code> collide (wrong — they are different objects), <code>[undefined]</code> becomes <code>[null]</code>, functions vanish, and circular objects throw. It also costs O(size of arguments) per call.</p>`,
          code: `
function memoizeBrute(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args); // content-based, collides for different objects
    if (!cache.has(key)) cache.set(key, fn(...args));
    return cache.get(key);
  };
}` },
        mcq: { q: 'Why use nested Maps instead of one Map with a string key?', options: ['Map keys can be any value compared by identity, so each argument can be a key level without stringifying', 'Nested Maps use less memory', 'Strings cannot be Map keys', 'It sorts arguments automatically'], answer: 0, explain: 'A trie of Maps keyed by the actual argument values gives identity semantics (and SameValueZero for NaN) with O(k) lookups for k arguments.' },
        hints: [`<p>Hint 1: think of the argument list as a path in a tree (a trie): level 1 is keyed by the first argument, level 2 by the second, and so on.</p>`, `<p>Hint 2: every node is a <code>Map</code>. Store the result at the end of the path under a private <code>Symbol</code> key so it can never collide with a real argument and so different arities end at different nodes.</p>`, `<p>Hint 3: use <code>node.has(RESULT)</code> (not a truthiness test) so <code>0</code>/<code>undefined</code> results are cached. Keep a private <code>count</code> for <code>size()</code>.</p>`],
        tests: { sig: 'string -> string', fn: 'mz', harness: { js: `function mz(kind) {
  let computed = 0;
  const mk = (f) => memoize(function (...a) { computed++; return f.apply(this, a); });
  switch (kind) {
    case 'demo': {
      const m = mk((a, b) => String(a) + '|' + String(b)), o = { x: 1 };
      m(1, 2); m(1, 2); m(o, 2); m(o, 2); m({ x: 1 }, 2); m(1); m(NaN, NaN); m(NaN, NaN);
      return { computed, size: m.size() };
    }
    case 'falsy': { const m = mk(() => 0), n = mk(() => ''), q = mk(() => null), u = mk(() => undefined); m(); m(); n(1); n(1); q(2); q(2); u(3); u(3); return { computed, size: m.size() + n.size() + q.size() + u.size() }; }
    case 'zero-arity': { const m = mk(() => 7); return [m(), m(), computed, m.size()]; }
    case 'arity': { const m = mk((...a) => a.length); return [m(1), m(1, undefined), m(1), m(1, undefined), computed, m.size()]; }
    case 'neg-zero': { const m = mk((x) => 1 / x); m(0); const r = m(-0); return [r, computed]; }
    case 'order': { const m = mk((a, b) => a - b); return [m(1, 2), m(2, 1), m(1, 2), computed]; }
    case 'types': { const m = mk((x) => typeof x); return [m(1), m('1'), m(true), m(null), m(undefined), m(1), m('1'), computed, m.size()]; }
    case 'this': { const o = { k: 5, f: memoize(function (a) { return this.k + a; }) }; return [o.f(1), o.f(1), o.f(2)]; }
    case 'results': { const m = mk((a, b) => a * b); return [m(2, 3), m(2, 3), m(3, 2), m(0, 9), m(0, 9), computed]; }
    case 'ten-args': { const m = mk((...a) => a.reduce((s, x) => s + x, 0)); const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; return [m(...a), m(...a), computed, m.size()]; }
    case 'size-empty': { const m = mk(() => 1); return [m.size()]; }
    case 'distinct-objects': { const m = mk((o) => o.id); const a = { id: 1 }, b = { id: 1 }; return [m(a), m(b), m(a), computed, m.size()]; }
    case 'symbol-fn': { const s = Symbol('s'), m = mk((x) => x === s); return [m(s), m(s), m(Symbol('s')), computed]; }
    case 'many': { const m = mk((i) => i * 2); for (let i = 0; i < 100000; i++) m(i); return { computed, size: m.size(), last: m(99999), after: computed }; }
    case 'many-repeat': { const m = mk((i) => i); for (let i = 0; i < 100000; i++) m(i % 10); return { computed, size: m.size() }; }
  }
}` }, cases: [
          [["demo"],{"computed":5,"size":5}],
          [["falsy"],{"computed":4,"size":4}],
          [["zero-arity"],[7,7,1,1]],
          [["arity"],[1,2,1,2,2,2]],
          [["neg-zero"],[null,1]],
          [["order"],[-1,1,-1,2]],
          [["types"],["number","string","boolean","object","undefined","number","string",5,5]],
          [["this"],[6,6,7]],
          [["results"],[6,6,6,0,0,3]],
          [["ten-args"],[55,55,1,1]],
          [["size-empty"],[0]],
          [["distinct-objects"],[1,1,1,2,2]],
          [["symbol-fn"],[true,true,false,2]],
          [["many"],{"computed":100000,"size":100000,"last":199998,"after":100000}],
          [["many-repeat"],{"computed":10,"size":10}]
        ] },
        solution: {
          approach: `<p>A trie of Maps captured in the closure. Walking k arguments is O(k); Map key comparison (SameValueZero) gives reference equality for objects and treats NaN as equal to itself. A Symbol marks "a result is stored here".</p>`,
          code: { lang: 'js', run: true, code: `
function memoize(fn) {
  const root = new Map();
  const RESULT = Symbol('result'); // can never be passed as a real argument by callers
  let count = 0;

  function memoized(...args) {
    let node = root;
    for (const arg of args) {                 // walk / build the path
      if (!node.has(arg)) node.set(arg, new Map());
      node = node.get(arg);
    }
    if (!node.has(RESULT)) {                  // has(), so falsy results are cached too
      node.set(RESULT, fn.apply(this, args));
      count++;
    }
    return node.get(RESULT);
  }
  memoized.size = () => count;
  return memoized;
}

let computed = 0;
const m = memoize((a, b) => { computed++; return String(a) + '|' + String(b); });
const o = { x: 1 };
m(1, 2); m(1, 2);          // computed once
m(o, 2); m(o, 2);          // computed once (same object)
m({ x: 1 }, 2);            // different object -> computed
m(1);                      // different arity -> computed
m(NaN, NaN); m(NaN, NaN);  // NaN matches NaN -> computed once
console.log('computed:', computed, 'size:', m.size()); // computed: 5 size: 5

const zero = memoize(() => { computed++; return 0; });
zero(); zero();
console.log('falsy cached, computed now:', computed); // 6
` },
          dry: { head: ['call', 'path walked', 'RESULT at end?', 'action'], rows: [['m(1,2)', 'root→1→2', 'no', H.c('y', 'compute, store')], ['m(1,2)', 'root→1→2', 'yes', H.c('g', 'return cached')], ['m(o,2)', 'root→o→2', 'no', H.c('y', 'compute')], ['m({x:1},2)', 'root→{x:1}#2→2', 'no', H.c('y', 'compute (new object)')], ['m(1)', 'root→1', 'no', H.c('y', 'compute (shorter path)')]] },
          complexity: `<p>O(k) per call for k arguments (Map get/set are O(1) average). Memory O(total distinct argument paths).</p>`,
          followUps: ['Use <code>WeakMap</code> for object keys so cached entries can be garbage-collected (needs a split: Map for primitives, WeakMap for objects).', 'Add LRU eviction with a max size.', 'Memoize an async function and evict on rejection.']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 7 — The closure-in-loop bug
     ====================================================================== */
  topics.push({
    title: 'The Closure-in-Loop Bug (var vs let) and Every Way to Fix It',
    analogy: `<p>A teacher asks three students to "<b>look at the whiteboard later</b> and tell me the number written there". With <code>var</code> there is <b>one whiteboard</b> for the whole class; the teacher writes 0, then 1, then 2, then 3 — and only after that do the students look up. All three read <b>3</b>. With <code>let</code>, every student gets their <b>own small whiteboard</b> with the number of their turn written on it, so they read 0, 1 and 2. The bug is never about timing alone — it is about <b>how many whiteboards</b> (variables) exist.</p>`,
    explain: `<p>The most famous JavaScript interview question:</p>
      <pre>for (var i = 0; i &lt; 3; i++) {
  setTimeout(() =&gt; console.log(i), 0);
}
// prints 3, 3, 3   (not 0, 1, 2)</pre>
      <p>Two facts combine to cause it:</p>
      <ol>
        <li><b><code>var</code> is function-scoped</b>, so there is exactly <b>one</b> <code>i</code> shared by all iterations.</li>
        <li><b>The callbacks run later</b> — after the loop has finished — and closures read the variable's <b>current</b> value when they run, which by then is <b>3</b> (the value that made <code>i &lt; 3</code> false).</li>
      </ol>
      <p><b>Why <code>let</code> fixes it.</b> A <code>for (let …)</code> loop gets special treatment: the engine creates a <b>fresh copy of <code>i</code> for every iteration</b> (copying the previous value forward before running <code>i++</code>). Each callback closes over its own iteration's <code>i</code>.</p>
      ${H.table(['Loop', 'How many <code>i</code> variables?', 'Callbacks print'], [
        ['<code>for (var i …)</code>', H.c('r', '1 shared'), H.c('r', '3 3 3')],
        ['<code>for (let i …)</code>', H.c('g', '1 per iteration'), H.c('g', '0 1 2')],
        ['<code>var</code> + IIFE <code>(function (j) {…})(i)</code>', H.c('g', '1 parameter j per call'), H.c('g', '0 1 2')],
        ['<code>setTimeout(fn, 0, i)</code> / <code>fn.bind(null, i)</code>', 'value passed as an argument', H.c('g', '0 1 2')],
        ['<code>[0,1,2].forEach(i =&gt; …)</code>', '1 parameter per callback call', H.c('g', '0 1 2')]
      ])}
      <p>The same bug appears anywhere a function is <b>created in a loop and used later</b>: event listeners attached to a list of buttons, arrays of callbacks, promises created in a loop, retry handlers. The fix is always the same idea: give each function <b>its own variable</b>.</p>
      <p><b>Careful:</b> only <code>for (let …;;)</code>, <code>for (let/const … of)</code> and <code>for (let/const … in)</code> make per-iteration bindings. A <code>while</code> loop whose counter is declared outside the loop still has one shared variable.</p>`,
    clues: [
      '<code>setTimeout</code> inside a <code>for (var i …)</code> loop → "3 3 3" puzzle',
      '"Why do all my buttons alert the last index?" → closure-in-loop with <code>var</code>',
      '"Fix it without using <code>let</code>" → IIFE, extra <code>setTimeout</code> argument, <code>bind</code>, <code>forEach</code>',
      '"How does <code>let</code> fix the loop?" → per-iteration binding (CreatePerIterationEnvironment)',
      '"What prints if the delay is <code>i * 1000</code>?" → timing changes, but values still 3 3 3 with var',
      'An array of functions built in a loop and called after it',
      '<code>for (const i = 0; i &lt; 3; i++)</code> → TypeError on the first <code>i++</code>'
    ],
    code: [{ lang: 'js', run: true, title: 'The bug and four fixes (runnable)', code: `
const results = { bug: [], let: [], iife: [], arg: [], forEach: [] };

// BUG: one shared i
for (var i = 0; i < 3; i++) {
  setTimeout(() => results.bug.push(i), 0);
}

// FIX 1: let -> new binding every iteration
for (let k = 0; k < 3; k++) {
  setTimeout(() => results.let.push(k), 0);
}

// FIX 2: IIFE gives each callback its own parameter j
for (var a = 0; a < 3; a++) {
  (function (j) {
    setTimeout(() => results.iife.push(j), 0);
  })(a);
}

// FIX 3: pass the current value as a setTimeout argument (evaluated NOW)
for (var b = 0; b < 3; b++) {
  setTimeout((v) => results.arg.push(v), 0, b);
}

// FIX 4: forEach calls the callback with a fresh parameter each time
[0, 1, 2].forEach((n) => setTimeout(() => results.forEach.push(n), 0));

setTimeout(() => {
  for (const [name, vals] of Object.entries(results)) console.log(name.padEnd(8), vals.join(' '));
}, 5);
` }],
    codeTitle: ['Closure in a loop: bug + fixes'],
    viz: {
      title: 'Closures created in a loop: one shared variable vs one per iteration',
      input: '3 var',
      inputLabel: 'Iterations (1-6) and mode: var, let or iife — e.g. "3 var", "3 let", "4 iife"',
      gen: function (input) {
        var w = words(input, '3 var');
        var n = parseInt(w[0], 10), mode = (w[1] || 'var').toLowerCase();
        if (!(n >= 1 && n <= 6) || ['var', 'let', 'iife'].indexOf(mode) < 0) throw new Error('Format: <iterations 1-6> <var|let|iife>, e.g. "3 let"');
        var code = mode === 'iife'
          ? ['for (var i = 0; i < ' + n + '; i++) {', '  (function (j) {', '    setTimeout(() => console.log(j), 0);', '  })(i);', '}', '// loop done; the event loop now runs the timers'].join('\n')
          : ['for (' + mode + ' i = 0; i < ' + n + '; i++) {', '  setTimeout(() => console.log(i), 0);', '}', '// loop done; the event loop now runs the timers'].join('\n');
        var schedLine = mode === 'iife' ? 3 : 2, endLine = mode === 'iife' ? 6 : 4;
        var envs = [], cbs = [], shared = { name: mode === 'var' ? 'i' : 'i', val: 0 };
        function graph(hlCb, ehlCb, cls) {
          var nodes = [], edges = [], hl = {}, ehl = {}, gap = 13;
          var h = Math.max(30, 10 + gap * Math.max(cbs.length, 1));
          cbs.forEach(function (c, k) { nodes.push({ id: 'cb' + k, label: 'callback #' + k, x: 16, y: 8 + gap * k }); });
          if (mode === 'var') {
            nodes.push({ id: 'E', label: 'shared scope: i = ' + shared.val, x: 70, y: Math.max(8, (h - 4) / 2) });
            cbs.forEach(function (c, k) { edges.push(['cb' + k, 'E', '']); });
          } else {
            envs.forEach(function (e, k) { nodes.push({ id: 'E' + k, label: (mode === 'let' ? 'iteration env: i = ' : 'IIFE call: j = ') + e, x: 70, y: 8 + gap * k }); });
            cbs.forEach(function (c, k) { edges.push(['cb' + k, 'E' + k, '']); });
          }
          if (hlCb !== undefined) { hl['cb' + hlCb] = cls || 'cur'; hl[mode === 'var' ? 'E' : 'E' + hlCb] = cls || 'cur'; ehl['cb' + hlCb + '-' + (mode === 'var' ? 'E' : 'E' + hlCb)] = cls || 'cur'; }
          if (!nodes.length) nodes.push({ id: 'none', label: '(no callbacks yet)', x: 30, y: 10 });
          return boxes('Which variable each callback is closed over', nodes, edges, hl, ehl, {}, h);
        }
        function q(hlIdx) { var h = {}; if (hlIdx !== undefined) h[hlIdx] = 'cur'; return { type: 'queue', label: 'Timer (task) queue', items: cbs.map(function (c, k) { return 'callback #' + k; }), hl: h, frontLabel: 'runs first', backLabel: 'last' }; }
        var frames = [], outs = [];
        frames.push({ narr: mode === 'var' ? '<code>var i</code> creates <b>one</b> variable in the surrounding (function/global) scope. Every iteration will reuse it.' : mode === 'let' ? '<code>let i</code> in a for-loop header: the engine will create a <b>new copy of i for every iteration</b>.' : 'Still <code>var i</code> (one shared i), but each iteration calls an IIFE whose <b>parameter j</b> is a brand-new variable per call.',
          parts: [{ type: 'code', lang: 'js', code: code, hl: { 1: 'cur' } }, graph(), q()] });
        for (var k = 0; k < n; k++) {
          if (mode !== 'var') envs.push(k);
          shared.val = k;
          cbs.push(k);
          frames.push({ narr: 'Iteration ' + k + ': <code>i &lt; ' + n + '</code> is true. ' + (mode === 'var' ? 'A callback is created and closes over the <b>shared</b> <code>i</code> (currently ' + k + '). It does not copy the value.' : mode === 'let' ? 'This iteration has its own <code>i = ' + k + '</code>; the callback closes over <b>that</b> one.' : 'The IIFE is called with <code>i</code> (' + k + '); its parameter <code>j = ' + k + '</code> lives in a new scope and the callback closes over it.') + ' setTimeout puts the callback in the timer queue — it will run <b>later</b>.',
            parts: [{ type: 'code', lang: 'js', code: code, hl: one(schedLine, 'cur') }, graph(k, null, 'ok'), q(k)] });
        }
        shared.val = n;
        frames.push({ narr: 'After the last <code>i++</code>, <code>i</code> is ' + n + ' and <code>i &lt; ' + n + '</code> is false: the loop ends. ' + (mode === 'var' ? '<span class="c-r">The one shared i now holds ' + n + '.</span>' : mode === 'let' ? 'The per-iteration copies still hold 0…' + (n - 1) + '. (The final copy with i = ' + n + ' has no callback attached.)' : 'The shared <code>i</code> is ' + n + ', but no callback looks at it — they use their own <code>j</code>.') + ' The call stack is now empty, so the event loop can run the timers.',
          parts: [{ type: 'code', lang: 'js', code: code, hl: one(endLine, 'cur') }, { type: 'vars', label: 'Loop variable', vals: { i: n }, hl: { i: mode === 'var' ? 'bad' : 'done' } }, graph(), q()] });
        for (k = 0; k < n; k++) {
          var v = mode === 'var' ? n : k;
          outs.push(String(v));
          frames.push({ narr: 'Timer callback #' + k + ' runs and looks up <code>' + (mode === 'iife' ? 'j' : 'i') + '</code> through its closure → <b>' + v + '</b>' + (mode === 'var' ? ' <span class="c-r">(not ' + k + ')</span>.' : ' <span class="c-g">✓</span>'),
            parts: [{ type: 'code', lang: 'js', code: code, hl: one(schedLine, mode === 'var' ? 'bad' : 'ok') }, graph(k, null, mode === 'var' ? 'bad' : 'ok'), { type: 'queue', label: 'Timer (task) queue', items: cbs.slice(k).map(function (c) { return 'callback #' + c; }), hl: { 0: 'cur' }, frontLabel: 'running', backLabel: 'last' }, out(outs)] });
        }
        frames.push({ narr: mode === 'var' ? 'Result: <b>' + outs.join(' ') + '</b>. One variable, read after the loop finished. Fix: use <code>let</code> (try "' + n + ' let") or an IIFE (try "' + n + ' iife").' : 'Result: <b>' + outs.join(' ') + '</b>. Each callback had its own variable, so each remembers its own number.',
          parts: [graph(), out(outs)] });
        return frames;
      }
    },
    examples: [
      { title: 'Same bug without timers: an array of functions', html: `<p>No async code needed. The functions are simply <b>called after</b> the loop, when the shared <code>i</code> is 3.</p>${H.table(['loop', 'fns.map(f =&gt; f())'], [['var i', H.c('r', '[3, 3, 3]')], ['let k', H.c('g', '[0, 1, 2]')]])}`,
        code: { lang: 'js', run: true, code: `
var fns = [];
for (var i = 0; i < 3; i++) fns.push(() => i);
console.log(fns.map((f) => f())); // [ 3, 3, 3 ]

const fns2 = [];
for (let k = 0; k < 3; k++) fns2.push(() => k);
console.log(fns2.map((f) => f())); // [ 0, 1, 2 ]
` } },
      { title: 'Expert puzzle: changing the let variable inside the body', html: `<p>Per-iteration copying happens at the <b>end</b> of each iteration, <i>before</i> <code>i++</code>: the new environment gets the value the old one ended with. The body's own <code>i++</code> changes the current iteration's copy, which the closure sees. Trace: env1 i=0→1 (closure sees 1); copy 1, ++ → 2; env2 i=2→3 (sees 3); env3 i=4→5 (sees 5).</p>`,
        code: { lang: 'js', run: true, code: `
const seen = [];
for (let i = 0; i < 6; i++) {
  seen.push(() => i);
  i++; // modifies THIS iteration's binding
}
console.log(seen.map((f) => f())); // [ 1, 3, 5 ]
` } },
      { title: 'while loops do not get per-iteration bindings', html: `<p>Only <code>for</code>-loop headers with <code>let</code>/<code>const</code> get the special treatment. A counter declared outside a <code>while</code> loop is one variable. Fix: copy it into a <code>const</code> inside the body — the body block is a fresh scope on every pass.</p>`,
        code: { lang: 'js', run: true, code: `
const buggy = [];
let n = 0;
while (n < 3) { buggy.push(() => n); n++; }
console.log(buggy.map((f) => f())); // [ 3, 3, 3 ]

const fixed = [];
let m = 0;
while (m < 3) { const copy = m; fixed.push(() => copy); m++; }
console.log(fixed.map((f) => f())); // [ 0, 1, 2 ]
` } },
      { title: 'const in loops: fine in for-of, an error in a classic for', html: `<p><code>for (const x of list)</code> creates a new constant per iteration — perfect. <code>for (const i = 0; i &lt; 3; i++)</code> runs the first iteration, then <code>i++</code> tries to change a constant → TypeError.</p>`,
        code: { lang: 'js', run: true, code: `
const handlers = [];
for (const name of ['save', 'load', 'quit']) handlers.push(() => 'clicked ' + name);
console.log(handlers.map((h) => h())); // [ 'clicked save', 'clicked load', 'clicked quit' ]

try {
  for (const i = 0; i < 3; i++) console.log('iteration with i =', i);
} catch (e) {
  console.log(e.name + ': ' + e.message); // TypeError: Assignment to constant variable.
}
` } },
      { title: 'Delays do not change the values', html: `<p>A common follow-up: "what if the delay is <code>i * 100</code>?" Now the timers fire at 0, 100, 200 ms — but each still reads the single shared <code>i</code>, which became 3 long before any of them ran. Output: 3, 3, 3 (spaced out in time). We use 10 ms steps here to keep the demo fast.</p>`,
        code: { lang: 'js', run: true, code: `
for (var i = 0; i < 3; i++) {
  const delay = i * 10; // evaluated NOW: 0, 10, 20
  setTimeout(() => console.log('timer scheduled for', delay, 'ms sees i =', i), delay);
}
` } }
    ],
    deepDive: `<p><b>Spec: CreatePerIterationEnvironment.</b> For <code>for (let i = 0; cond; inc) body</code>, the spec evaluates the initialiser in a new environment, then before the first test <i>and at the end of every iteration</i> it creates a fresh declarative environment, copies the current values of the loop's <code>let</code> bindings into it, and only then runs <code>inc</code> and <code>cond</code> in the new environment. So the increment always operates on the next iteration's copy — that is why modifying <code>i</code> inside the body carries forward, and why closures created in the body see their own iteration's final value.</p>
      <p><b>Closures in the initialiser are a famous edge case:</b> <code>for (let i = 0, f = () =&gt; i; i &lt; 3; i++)</code> — <code>f</code> was created in the very first environment, before any copy, so <code>f()</code> always returns 0 even at the end.</p>
      <p><b>Cost.</b> Per-iteration environments sound expensive, but engines only allocate them when a closure actually captures the loop variable. Otherwise <code>let</code> loops compile to exactly the same machine code as <code>var</code> loops. When closures do capture, each iteration allocates a small Context object — negligible except in extremely hot loops.</p>
      <p><b>Transpilers.</b> When Babel/TypeScript down-level <code>let</code> loops for ES5 targets, they generate a helper function per iteration (<code>var _loop = function (i) { … }; for (var i = 0; i &lt; 3; i++) _loop(i);</code>) — the IIFE fix, automated. If the body modifies <code>i</code>, they also copy it back out. Reading transpiled output is a great way to "see" the per-iteration semantics.</p>
      <p><b>Async variants.</b> <code>for (let i …) { await fetchPage(i); }</code> is fine — each <code>await</code> runs in order. The bug resurfaces with <code>var</code> + <code>.then(() =&gt; use(i))</code>, with <code>arr.forEach(async …)</code> (which does not wait), and with event listeners added in loops. For DOM lists, <b>event delegation</b> (one listener on the parent, read <code>event.target.dataset.index</code>) avoids creating N closures at all.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI code almost never uses <code>var</code>, so the textbook bug is rarer in new code — but it lives on in legacy code, transpiled bundles, and in disguised forms: <code>while</code> loops with outer counters, shared mutable objects reused across iterations, and handlers registered in loops that read a variable mutated later.</p>
      <p><b>Use AI as a partner:</b> ask it to <code>"generate 10 variations of the setTimeout-in-a-loop puzzle (var, let, IIFE, while, const-of, modified loop variable, nested loops) without answers"</code>; solve them by hand, then verify by running. Ask it to explain the Babel output for a <code>let</code> loop.</p>
      <p><b>Where AI goes wrong:</b> explanations that blame only "asynchrony" (the array-of-functions version proves it is about bindings, not timers), the claim that <code>let</code> "captures the value" (it creates a new variable per iteration — modify it in the body and the closure sees the change), and missing the <code>while</code>-loop variant.</p>
      <p><b>What you must still own:</b> a crisp two-part explanation (one shared binding + deferred execution), at least three fixes with their mechanisms, and the per-iteration binding detail — this question appears in a huge share of front-end screening rounds.</p>`,
    problems: [
      {
        title: 'Fix the Menu Click Handlers', level: 'Easy', tags: ['closures', 'loops', 'var vs let'], companies: ['Swiggy', 'Paytm', 'Microsoft'],
        statement: `<p>A legacy function builds click handlers for menu items, but every handler reports <code>"Clicked undefined (#3)"</code>. Write <code>createHandlers(labels)</code> that returns an array of functions where handler <code>k</code> returns <code>"Clicked " + labels[k] + " (#" + k + ")"</code>. Give the fix using <code>let</code>, and explain an alternative that works in ES5 (no <code>let</code>).</p>`,
        constraints: `1 ≤ labels.length ≤ 10<sup>4</sup>. Handlers are called after createHandlers returns.`,
        example: `<p>labels = ['Home', 'Cart', 'Help'] → handlers[1]() returns ${H.c('g', '"Clicked Cart (#1)"')}. Buggy version returns ${H.c('r', '"Clicked undefined (#3)"')} because the shared <code>i</code> is 3 and <code>labels[3]</code> is undefined.</p>`,
        brute: { why: `<p>The buggy original: <code>var i</code> is shared, every handler reads it after the loop when <code>i === labels.length</code>.</p>`,
          code: { lang: 'js', run: true, code: `
function createHandlersBuggy(labels) {
  var handlers = [];
  for (var i = 0; i < labels.length; i++) {
    handlers.push(function () { return 'Clicked ' + labels[i] + ' (#' + i + ')'; });
  }
  return handlers;
}
console.log(createHandlersBuggy(['Home', 'Cart', 'Help'])[1]()); // Clicked undefined (#3)
` } },
        mcq: { q: 'Which change alone fixes the buggy function?', options: ['Change <code>var i</code> to <code>let i</code> in the loop header', 'Change <code>var handlers</code> to <code>const handlers</code>', 'Use an arrow function instead of <code>function</code>', 'Add <code>"use strict"</code>'], answer: 0, explain: 'Only the loop variable\'s binding matters. let gives each iteration its own i. Arrow functions change this-binding, not variable capture.' },
        hints: [`<p>Hint 1: each handler needs its <b>own</b> copy of the index — ask yourself "how many <code>i</code> variables exist?"</p>`, `<p>Hint 2: <code>let</code> in the for header gives one binding per iteration; in ES5, an IIFE taking <code>i</code> as a parameter (or <code>labels.map((label, k) =&gt; …)</code>) does the same.</p>`, `<p>Hint 3: capture the label too (<code>const label = labels[k]</code>) so later changes to the array do not affect handlers — decide which behaviour you want and say it out loud in the interview.</p>`],
        tests: { sig: 'string string[] -> string', fn: 'ch', harness: { js: `function ch(variant, labels) {
  const f = variant === 'let' ? createHandlers : variant === 'es5' ? createHandlersES5 : createHandlersMap;
  const hs = f(labels), r = hs.map((h) => h());
  return r.length > 100 ? { len: r.length, first: r[0], last: r[r.length - 1], mid: r[Math.floor(r.length / 2)] } : r;
}` }, cases: [
          [["let",["Home","Cart","Help"]],["Clicked Home (#0)","Clicked Cart (#1)","Clicked Help (#2)"]],
          [["let",["Only"]],["Clicked Only (#0)"]],
          [["let",[]],[]],
          [["let",["x","x","x"]],["Clicked x (#0)","Clicked x (#1)","Clicked x (#2)"]],
          [["es5",["Home","Cart","Help"]],["Clicked Home (#0)","Clicked Cart (#1)","Clicked Help (#2)"]],
          [["es5",["Only"]],["Clicked Only (#0)"]],
          [["es5",[]],[]],
          [["es5",["x","x","x"]],["Clicked x (#0)","Clicked x (#1)","Clicked x (#2)"]],
          [["map",["Home","Cart","Help"]],["Clicked Home (#0)","Clicked Cart (#1)","Clicked Help (#2)"]],
          [["map",["Only"]],["Clicked Only (#0)"]],
          [["map",[]],[]],
          [["map",["x","x","x"]],["Clicked x (#0)","Clicked x (#1)","Clicked x (#2)"]],
          [["let",{"$concat":[[],{"$rep":"L","n":10000}]}],{"len":10000,"first":"Clicked L (#0)","last":"Clicked L (#9999)","mid":"Clicked L (#5000)"}],
          [["es5",{"$rep":"L","n":10000}],{"len":10000,"first":"Clicked L (#0)","last":"Clicked L (#9999)","mid":"Clicked L (#5000)"}],
          [["map",{"$rep":"L","n":10000}],{"len":10000,"first":"Clicked L (#0)","last":"Clicked L (#9999)","mid":"Clicked L (#5000)"}]
        ] },
        solution: {
          approach: `<p>Give each handler its own binding: <code>let</code> per-iteration binding (modern), or a factory/IIFE whose parameter is a new variable per call (ES5). <code>map</code> is the most idiomatic: its callback parameter is fresh per element.</p>`,
          code: { lang: 'js', run: true, code: `
// Fix 1: let -> one k per iteration
function createHandlers(labels) {
  const handlers = [];
  for (let k = 0; k < labels.length; k++) {
    handlers.push(() => 'Clicked ' + labels[k] + ' (#' + k + ')');
  }
  return handlers;
}

// Fix 2 (ES5-friendly): a factory function gives each handler its own parameters
function createHandlersES5(labels) {
  var handlers = [];
  function makeHandler(label, index) {
    return function () { return 'Clicked ' + label + ' (#' + index + ')'; };
  }
  for (var i = 0; i < labels.length; i++) handlers.push(makeHandler(labels[i], i));
  return handlers;
}

// Fix 3: map - the callback parameters are new for every element
const createHandlersMap = (labels) => labels.map((label, k) => () => 'Clicked ' + label + ' (#' + k + ')');

const labels = ['Home', 'Cart', 'Help'];
console.log(createHandlers(labels).map((h) => h()));
console.log(createHandlersES5(labels)[1]());
console.log(createHandlersMap(labels)[2]());
` },
          dry: { head: ['iteration', 'binding created', 'handler captures', 'handler returns later'], rows: [['k = 0', 'env#0 {k:0}', 'env#0', 'Clicked Home (#0)'], ['k = 1', 'env#1 {k:1}', 'env#1', 'Clicked Cart (#1)'], ['k = 2', 'env#2 {k:2}', 'env#2', 'Clicked Help (#2)'], ['k = 3', 'env#3 {k:3}', '(none — loop ends)', '—']] },
          complexity: `<p>O(n) time and O(n) memory (n closures, each with a tiny environment).</p>`,
          followUps: ['How would event delegation avoid creating n closures in the DOM?', 'What changes if <code>labels</code> is mutated after the handlers are created?', 'Show what Babel generates for the <code>let</code> loop when targeting ES5.']
        }
      }
    ]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Counter (LeetCode 2620)', level: 'Easy', tags: ['closures'], companies: ['Amazon', 'Google'],
    statement: `<p>Given an integer <code>n</code>, return a <code>counter</code> function. The first call returns <code>n</code>, and every later call returns 1 more than the previous call (<code>n</code>, <code>n + 1</code>, <code>n + 2</code>, …).</p>`,
    constraints: `-1000 ≤ n ≤ 1000; at most 1000 calls.`,
    example: `<p>n = 10 → calls return ${H.c('g', '10, 11, 12')}. The value lives in the closure, so it survives between calls.</p>`,
    brute: { why: `<p>A module-level variable works for <b>one</b> counter, but two counters created with different <code>n</code> overwrite each other's state.</p>`,
      code: `
let shared; // one variable for every counter - wrong
function createCounterBrute(n) {
  shared = n;
  return () => shared++;
}` },
    mcq: { q: 'Where should the running value live?', options: ['In a variable inside <code>createCounter</code>, captured by the returned function', 'In a global variable', 'In <code>this</code>', 'In a parameter of the returned function'], answer: 0, explain: 'Each createCounter call gets its own scope, so each returned counter keeps its own value.' },
    hints: [`<p>Hint 1: the parameter <code>n</code> itself is already a variable in the outer scope — you can mutate it.</p>`, `<p>Hint 2: post-increment returns the old value: <code>return n++;</code>.</p>`, `<p>Hint 3: recipe: <code>return () =&gt; n++;</code> — one line, one closure.</p>`],
    tests: { sig: 'int[] int -> int[]', fn: 'cn', harness: { js: `function cn(ns, calls) {
  const cs = ns.map((n) => createCounter(n)), out = [];
  for (let k = 0; k < calls; k++) for (const c of cs) out.push(c());
  return out;
}` }, cases: [
      [[[10],3],[10,11,12]],
      [[[10,-2],2],[10,-2,11,-1]],
      [[[0],1],[0]],
      [[[1000],1],[1000]],
      [[[-1000],2],[-1000,-999]],
      [[[5,5,5],2],[5,5,5,6,6,6]],
      [[[1000],0],[]],
      [[[-1000],1000],{"$range":[-1000,0]}],
      [[[1000],1000],{"$range":[1000,2000]}]
    ] },
    solution: {
      approach: `<p>Return an arrow function that post-increments the captured <code>n</code>. Each call to <code>createCounter</code> creates a fresh <code>n</code>.</p>`,
      code: { lang: 'js', run: true, code: `
function createCounter(n) {
  return () => n++; // returns current n, then increments the captured variable
}
const c1 = createCounter(10);
const c2 = createCounter(-2);
console.log(c1(), c1(), c1()); // 10 11 12
console.log(c2(), c2(), c1()); // -2 -1 13
` },
      dry: { head: ['call', 'n before', 'returned', 'n after'], rows: [['c1()', '10', '10', '11'], ['c1()', '11', '11', '12'], ['c1()', '12', '12', '13']] },
      complexity: `<p>O(1) per call, O(1) memory per counter.</p>`,
      followUps: ['Return a counter that can count down with a negative step.', 'Why does <code>n++</code> (post) vs <code>++n</code> (pre) matter here?']
    }
  });

  practice.push({
    title: 'Counter II: increment, decrement, reset (LeetCode 2665)', level: 'Easy', tags: ['closures', 'private state'], companies: ['Microsoft', 'Adobe'],
    statement: `<p>Write <code>createCounter(init)</code> returning an object with <code>increment()</code> (+1 and return), <code>decrement()</code> (−1 and return) and <code>reset()</code> (set back to <code>init</code> and return it).</p>`,
    constraints: `-1000 ≤ init ≤ 1000; at most 1000 calls.`,
    example: `<p>init = 5: increment() → ${H.c('g', '6')}, reset() → ${H.c('b', '5')}, decrement() → ${H.c('g', '4')}.</p>`,
    brute: { why: `<p>Storing <code>current</code> as a public property and using <code>this</code> works only when methods are called as <code>obj.method()</code>; detaching a method (e.g. passing <code>counter.increment</code> as a callback) breaks it, and anyone can corrupt the state.</p>`,
      code: `
function createCounterBrute(init) {
  return {
    current: init,
    increment() { return ++this.current; },
    decrement() { return --this.current; },
    reset() { this.current = init; return this.current; }
  };
}` },
    mcq: { q: 'Why remember <code>init</code> separately from the current value?', options: ['reset() needs the original starting value after current has changed', 'JavaScript copies parameters', 'To avoid the TDZ', 'It is not needed'], answer: 0, explain: 'The parameter init is captured and never modified; current is a separate captured variable that changes.' },
    hints: [`<p>Hint 1: two captured variables: <code>init</code> (never changes) and <code>current</code>.</p>`, `<p>Hint 2: pre-increment (<code>++current</code>) returns the new value — exactly what increment() must return.</p>`, `<p>Hint 3: return an object of arrow functions; no <code>this</code> anywhere.</p>`],
    tests: { sig: 'int string[] -> int[]', fn: 'c2', harness: { js: `function c2(init, ops) {
  const c = createCounter(init), out = [];
  for (const op of ops) {
    if (op === 'inc') out.push(c.increment()); else if (op === 'dec') out.push(c.decrement()); else if (op === 'reset') out.push(c.reset());
    else if (op === 'detached') { const f = c.increment; out.push(f()); }
  }
  return out;
}` }, cases: [
      [[5,["inc","reset","dec"]],[6,5,4]],
      [[0,["dec","dec","reset","inc"]],[-1,-2,0,1]],
      [[-7,["reset","inc"]],[-7,-6]],
      [[1000,["inc","inc"]],[1001,1002]],
      [[-1000,["dec","reset"]],[-1001,-1000]],
      [[3,["detached","detached","inc"]],[4,5,6]],
      [[2,[]],[]],
      [[0,["reset","reset"]],[0,0]],
      [[-1000,{"$rep":"inc","n":1000}],{"$range":[-999,1]}],
      [[1000,{"$rep":"dec","n":1000}],{"$range":[999,-1,-1]}]
    ] },
    solution: {
      approach: `<p>Three closures over one shared environment holding <code>current</code>, plus the captured <code>init</code> parameter for reset.</p>`,
      code: { lang: 'js', run: true, code: `
function createCounter(init) {
  let current = init;
  return {
    increment: () => ++current,
    decrement: () => --current,
    reset: () => (current = init)
  };
}
const counter = createCounter(5);
console.log(counter.increment(), counter.reset(), counter.decrement()); // 6 5 4
const inc = counter.increment;   // detached - still works, no 'this'
console.log(inc(), inc());       // 5 6
` },
      dry: { head: ['call', 'current before', 'returned'], rows: [['increment()', '5', '6'], ['reset()', '6', '5'], ['decrement()', '5', '4']] },
      complexity: `<p>O(1) time per method call; O(1) memory per counter (one closed-over number shared by three methods).</p>`,
      followUps: ['Add <code>onChange(listener)</code> that is called with every new value.', 'Rewrite with a class using <code>#current</code> and compare.']
    }
  });

  practice.push({
    title: 'Allow One Function Call (LeetCode 2666)', level: 'Easy', tags: ['closures', 'once'], companies: ['Meta', 'Atlassian'],
    statement: `<p>Given a function <code>fn</code>, return a new function that behaves like <code>fn</code> the <b>first</b> time it is called (same arguments, same result) and returns <code>undefined</code> for every later call without calling <code>fn</code>.</p>`,
    constraints: `fn may return any value including undefined; up to 10 arguments.`,
    example: `<p>fn = (a,b,c) =&gt; a+b+c. onceFn(1,2,3) → ${H.c('g', '6')}; onceFn(2,3,6) → ${H.c('m', 'undefined')} (fn not called).</p>`,
    brute: { why: `<p>Checking whether a stored result is "truthy" to decide if fn already ran fails when the first result was <code>0</code>, <code>''</code> or <code>undefined</code> — fn would run again.</p>`,
      code: `
function onceBrute(fn) {
  let result;
  return function (...args) {
    if (result) return undefined;      // wrong when first result is falsy
    result = fn(...args);
    return result;
  };
}` },
    mcq: { q: 'What is the correct state to remember?', options: ['A boolean "called" flag', 'The last result only', 'The arguments', 'Nothing — use fn.length'], answer: 0, explain: 'A separate flag is unambiguous; results can be falsy.' },
    hints: [`<p>Hint 1: keep <code>let called = false</code> in the closure.</p>`, `<p>Hint 2: set the flag before calling fn so re-entrant calls are blocked too.</p>`, `<p>Hint 3: forward arguments and <code>this</code>: <code>fn.apply(this, args)</code>; use a regular <code>function</code> for the wrapper so <code>this</code> is dynamic.</p>`],
    tests: { sig: 'string -> string', fn: 'oc', harness: { js: `function oc(kind) {
  let n = 0;
  switch (kind) {
    case 'sum': { const f = once((a, b, c) => { n++; return a + b + c; }); return [f(1, 2, 3), U(f(2, 3, 6)), n]; }
    case 'zero': { const f = once(() => { n++; return 0; }); return [f(), U(f()), n]; }
    case 'this': { const o = { name: 'svc', start: once(function () { n++; return this.name + ' started'; }) }; return [o.start(), U(o.start()), n]; }
    case 'undefined-result': { const f = once(() => { n++; }); return [U(f()), U(f()), n]; }
    case 'throws': { const f = once(() => { n++; throw new Error('first'); }); let e1 = 'none'; try { f(); } catch (e) { e1 = e.message; } return [e1, U(f()), n]; }
    case 'independent': { const fn = () => { n++; return 'x'; }; const a = once(fn), b = once(fn); return [a(), b(), U(a()), U(b()), n]; }
    case 'ten-args': { const f = once((...a) => a.length); return [f(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), U(f(1))]; }
    case 'arg-forward': { const f = once((x) => x); return [f(null), U(f(5))]; }
    case 'many': { const f = once(() => { n++; return 1; }); let last; for (let i = 0; i < 100000; i++) last = f(); return [n, U(last)]; }
    case 'falsy-first': { const f = once(() => { n++; return false; }); return [f(), U(f()), n]; }
    case 'no-call-yet': { const f = once(() => { n++; return 1; }); return [n]; }
  }
}
function U(v) { return v === undefined ? 'undefined' : v; }` }, cases: [
      [["sum"],[6,"undefined",1]],
      [["zero"],[0,"undefined",1]],
      [["this"],["svc started","undefined",1]],
      [["undefined-result"],["undefined","undefined",1]],
      [["throws"],["first","undefined",1]],
      [["independent"],["x","x","undefined","undefined",2]],
      [["ten-args"],[10,"undefined"]],
      [["arg-forward"],[null,"undefined"]],
      [["many"],[1,"undefined"]],
      [["falsy-first"],[false,"undefined",1]],
      [["no-call-yet"],[0]]
    ] },
    solution: {
      approach: `<p>A boolean flag captured by the wrapper. First call flips it and delegates; later calls return undefined.</p>`,
      code: { lang: 'js', run: true, code: `
function once(fn) {
  let called = false;
  return function (...args) {
    if (called) return undefined;
    called = true;
    return fn.apply(this, args);
  };
}
const onceSum = once((a, b, c) => a + b + c);
console.log(onceSum(1, 2, 3), onceSum(2, 3, 6)); // 6 undefined
const onceZero = once(() => 0);
console.log(onceZero(), onceZero());             // 0 undefined
const obj = { name: 'svc', start: once(function () { return this.name + ' started'; }) };
console.log(obj.start());                        // svc started
` },
      dry: { head: ['call', 'called before', 'fn runs?', 'returned'], rows: [['(1,2,3)', 'false', 'yes', '6'], ['(2,3,6)', 'true', 'no', 'undefined']] },
      complexity: `<p>O(1) overhead per call.</p>`,
      followUps: ['Return the first result on later calls instead of undefined (lodash <code>_.once</code> behaviour).', 'Allow retry if the first call throws.']
    }
  });

  practice.push({
    title: 'Prefixed ID Generator with Reset', level: 'Easy', tags: ['closures', 'factory'], companies: ['Zoho', 'Freshworks'],
    statement: `<p>Write <code>createIdGenerator(prefix, start = 1)</code> returning <code>{ next, reset, issued }</code>. <code>next()</code> returns <code>prefix + '-' + number</code> (zero-padded to at least 3 digits) and advances; <code>reset()</code> restarts at <code>start</code>; <code>issued()</code> returns how many IDs were produced since creation (reset does not change it). Generators must not share state.</p>`,
    constraints: `prefix is a non-empty string, 1 ≤ start ≤ 10<sup>6</sup>, up to 10<sup>5</sup> calls.`,
    example: `<p>g = createIdGenerator('user'): next() → ${H.c('g', "'user-001'")}, next() → ${H.c('g', "'user-002'")}, reset(), next() → ${H.c('g', "'user-001'")}, issued() → ${H.c('b', '3')}.</p>`,
    brute: { why: `<p>One global counter for all prefixes: orders and users share numbers (<code>user-001</code>, <code>order-002</code>, …) and reset for one resets all.</p>`,
      code: `
let globalCounter = 0;
function nextIdBrute(prefix) {
  globalCounter++;
  return prefix + '-' + String(globalCounter).padStart(3, '0');
}` },
    mcq: { q: 'Which values must be captured separately?', options: ['the current number and the total issued count (plus prefix and start)', 'only the prefix', 'only the current number', 'nothing; use Date.now()'], answer: 0, explain: 'reset() changes the current number but not the issued count, so they need separate variables.' },
    hints: [`<p>Hint 1: four captured values: <code>prefix</code>, <code>start</code>, <code>current</code>, <code>total</code>.</p>`, `<p>Hint 2: <code>String(n).padStart(3, '0')</code> pads; numbers longer than 3 digits are left as they are.</p>`, `<p>Hint 3: next(): build the id from current, then <code>current++</code> and <code>total++</code>.</p>`],
    tests: { sig: 'string int string[] -> string[]', fn: 'idg', harness: { js: `function idg(prefix, start, ops) {
  const g = start === 0 ? createIdGenerator(prefix) : createIdGenerator(prefix, start), h = createIdGenerator('b'), out = [];
  for (const op of ops) {
    const m = /^(h\\.)?(next|reset|issued)(\\*(\\d+))?$/.exec(op); const k = m[1] ? h : g, times = m[4] ? +m[4] : 1; let r;
    for (let i = 0; i < times; i++) r = k[m[2]]();
    out.push(m[2] === 'reset' ? 'ok' : r);
  }
  return out;
}` }, cases: [
      [["user",0,["next","next","reset","next","issued"]],["user-001","user-002","ok","user-001",3]],
      [["order",1000,["next","next"]],["order-1000","order-1001"]],
      [["x",999,["next","next"]],["x-999","x-1000"]],
      [["a",5,["next","issued","reset","issued","next","issued"]],["a-005",1,"ok",1,"a-005",2]],
      [["a",1000000,["next","next"]],["a-1000000","a-1000001"]],
      [["u",0,["issued"]],[0]],
      [["u",0,["next","h.next","next","h.next","h.issued","issued"]],["u-001","b-001","u-002","b-002",2,2]],
      [["u",7,["next","next","reset","reset","next"]],["u-007","u-008","ok","ok","u-007"]],
      [["p",0,["next*100000","issued","reset","issued","next"]],["p-100000",100000,"ok",100000,"p-001"]],
      [["pre-fix",99,["next","next","next"]],["pre-fix-099","pre-fix-100","pre-fix-101"]]
    ] },
    solution: {
      approach: `<p>Factory with private counters per generator; three closures share them.</p>`,
      code: { lang: 'js', run: true, code: `
function createIdGenerator(prefix, start = 1) {
  let current = start;
  let total = 0;
  return {
    next() {
      const id = prefix + '-' + String(current).padStart(3, '0');
      current++;
      total++;
      return id;
    },
    reset() { current = start; },
    issued: () => total
  };
}
const users = createIdGenerator('user');
const orders = createIdGenerator('order', 1000);
console.log(users.next(), users.next(), orders.next()); // user-001 user-002 order-1000
users.reset();
console.log(users.next(), users.issued());              // user-001 3
` },
      dry: { head: ['call', 'current', 'total', 'returned'], rows: [['next()', '1→2', '1', 'user-001'], ['next()', '2→3', '2', 'user-002'], ['reset()', '1', '2', '—'], ['next()', '1→2', '3', 'user-001']] },
      complexity: `<p>O(1) per call (padding is O(digits)).</p>`,
      followUps: ['Guarantee uniqueness across resets (e.g. add a generation suffix).', 'Make the generator iterable with <code>Symbol.iterator</code>.']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Memoize with Call Count (LeetCode 2623)', level: 'Medium', tags: ['closures', 'memoize', 'Map'], companies: ['Google', 'Amazon', 'Uber'],
    statement: `<p>Given a function <code>fn</code> (one of <code>sum(a, b)</code>, <code>fib(n)</code>, <code>factorial(n)</code>), return a memoized version that never calls <code>fn</code> twice with the same inputs. Also return a way to read how many times the <b>real</b> fn was called. Note: <code>sum(2, 3)</code> and <code>sum(3, 2)</code> are different inputs.</p>`,
    constraints: `0 ≤ a, b ≤ 10<sup>5</sup>; 1 ≤ n ≤ 10; up to 10<sup>5</sup> calls.`,
    example: `<p>memoSum(2,2) → 4 ${H.c('y', '(computed)')}, memoSum(2,2) → 4 ${H.c('g', '(cached)')}, memoSum(1,3) → 4 ${H.c('y', '(computed)')}. getCallCount() → ${H.c('b', '2')}.</p>`,
    brute: { why: `<p>Calling fn every time gives correct answers but repeats expensive work; the call count equals the number of calls instead of the number of distinct inputs.</p>`,
      code: `
function memoizeBrute(fn) {
  let calls = 0;
  const wrapped = (...args) => { calls++; return fn(...args); }; // no cache at all
  return { wrapped, getCallCount: () => calls };
}` },
    mcq: { q: 'For <code>sum(a, b)</code> with numbers, which key is correct and cheap?', options: ["<code>a + ',' + b</code>", '<code>a + b</code>', '<code>[a, b]</code> (array as Map key)', '<code>String(a * b)</code>'], answer: 0, explain: 'a + b collides (2,2 and 1,3); a new array is a new object each call so Map lookups never hit; a joined string with a separator is unique for numbers.' },
    hints: [`<p>Hint 1: the cache and the counter are private variables of <code>memoize</code>.</p>`, `<p>Hint 2: build a string key from all arguments with a separator: <code>args.join(',')</code> is safe for numbers.</p>`, `<p>Hint 3: check with <code>cache.has(key)</code>; only on a miss increment the counter and call fn.</p>`],
    tests: { sig: 'string -> string', fn: 'mm', harness: { js: `function mm(kind) {
  switch (kind) {
    case 'sum': { const m = memoize((a, b) => a + b); return [m(2, 2), m(2, 2), m(1, 3), m(3, 1), m.getCallCount()]; }
    case 'sum-statement': { const m = memoize((a, b) => a + b); m(2, 2); m(2, 2); m(1, 3); return [m.getCallCount()]; }
    case 'fact': { const m = memoize((n) => (n <= 1 ? 1 : n * m(n - 1))); return [m(5), m(3), m.getCallCount()]; }
    case 'fib': { const m = memoize((n) => (n < 2 ? n : m(n - 1) + m(n - 2))); return [m(10), m(10), m.getCallCount()]; }
    case 'initial': { const m = memoize((a, b) => a + b); return [m.getCallCount()]; }
    case 'zero-result': { const m = memoize((a, b) => a * b); return [m(0, 5), m(0, 5), m(5, 0), m.getCallCount()]; }
    case 'order-matters': { let seen = []; const m = memoize((a, b) => { seen.push(a + ',' + b); return a - b; }); return [m(2, 3), m(3, 2), m(2, 3), seen.join(' ')]; }
    case 'big-distinct': { const m = memoize((a, b) => a + b); let s = 0; for (let i = 0; i < 100000; i++) s += m(i, 100000 - i); return [s, m.getCallCount()]; }
    case 'big-repeat': { const m = memoize((a, b) => a + b); let s = 0; for (let i = 0; i < 100000; i++) s += m(3, 4); return [s, m.getCallCount()]; }
    case 'fact-10': { const m = memoize((n) => (n <= 1 ? 1 : n * m(n - 1))); return [m(10), m.getCallCount(), m(7), m.getCallCount()]; }
    case 'max-args': { const m = memoize((a, b) => a + b); return [m(100000, 100000), m(100000, 100000), m.getCallCount()]; }
  }
}` }, cases: [
      [["sum"],[4,4,4,4,3]],
      [["sum-statement"],[2]],
      [["fact"],[120,6,5]],
      [["fib"],[55,55,11]],
      [["initial"],[0]],
      [["zero-result"],[0,0,0,2]],
      [["order-matters"],[-1,1,-1,"2,3 3,2"]],
      [["big-distinct"],[10000000000,100000]],
      [["big-repeat"],[700000,1]],
      [["fact-10"],[3628800,10,5040,10]],
      [["max-args"],[200000,200000,1]]
    ] },
    solution: {
      approach: `<p>Closure over a Map cache and a counter. The key is the argument list joined with commas (safe because inputs are numbers).</p>`,
      code: { lang: 'js', run: true, code: `
function memoize(fn) {
  const cache = new Map();
  let callCount = 0;
  function memoized(...args) {
    const key = args.join(',');
    if (!cache.has(key)) {
      callCount++;
      cache.set(key, fn(...args));
    }
    return cache.get(key);
  }
  memoized.getCallCount = () => callCount;
  return memoized;
}

const memoSum = memoize((a, b) => a + b);
console.log(memoSum(2, 2), memoSum(2, 2), memoSum(1, 3), memoSum(3, 1)); // 4 4 4 4
console.log('sum real calls:', memoSum.getCallCount());                  // 3

const memoFact = memoize((n) => (n <= 1 ? 1 : n * memoFact(n - 1)));
console.log(memoFact(5), memoFact(3), 'fact real calls:', memoFact.getCallCount()); // 120 6 fact real calls: 5
` },
      dry: { head: ['call', 'key', 'cache hit?', 'callCount'], rows: [['(2,2)', "'2,2'", 'no', '1'], ['(2,2)', "'2,2'", 'yes', '1'], ['(1,3)', "'1,3'", 'no', '2'], ['(3,1)', "'3,1'", 'no', '3']] },
      complexity: `<p>O(k) per call to build the key for k args; memory O(distinct inputs).</p>`,
      followUps: ['Why does recursion through <code>memoFact</code> (not the raw function) matter?', 'Support object arguments by identity (see Memoize II).']
    }
  });

  practice.push({
    title: 'Private Bank Account (Module Pattern)', level: 'Medium', tags: ['closures', 'module pattern', 'encapsulation'], companies: ['JPMorgan', 'Razorpay', 'PhonePe'],
    statement: `<p>Write <code>createAccount(owner, opening = 0)</code> returning <code>{ deposit, withdraw, balance, statement }</code>:</p><ul><li><code>deposit(amount)</code> / <code>withdraw(amount)</code> — amount must be a positive finite number, else throw <code>RangeError</code>; withdraw more than the balance throws <code>Error('Insufficient funds')</code>. Both return the new balance.</li><li><code>balance()</code> — current balance.</li><li><code>statement()</code> — array of <code>{ type, amount, balance }</code> entries. Returning it must <b>not</b> let callers modify the internal history.</li></ul>`,
    constraints: `Up to 10<sup>5</sup> operations. Amounts in rupees (you may keep them as numbers with two decimals; production code should use integer paise).`,
    example: `<p>a = createAccount('Asha', 100): deposit(50) → ${H.c('g', '150')}, withdraw(500) → ${H.c('r', 'Error: Insufficient funds')}, statement() → ${H.c('b', '[{type:"open",…},{type:"deposit",amount:50,balance:150}]')}.</p>`,
    brute: { why: `<p>A plain object with a public <code>balance</code> field and a public <code>history</code> array: callers can set <code>acct.balance = 1e9</code> or <code>acct.history.length = 0</code>, bypassing every rule.</p>`,
      code: `
function createAccountBrute(owner, opening = 0) {
  return { owner, balance: opening, history: [] }; // everything public, no rules enforced
}` },
    mcq: { q: 'Why return <code>history.map(e =&gt; ({ ...e }))</code> instead of <code>history</code>?', options: ['Returning the internal array would let callers mutate private state', 'map is faster', 'Arrays cannot be returned from closures', 'To sort the history'], answer: 0, explain: 'A closure hides the variable, but if you hand out a reference to a mutable object the caller can still change it. Return a copy (or a frozen copy).' },
    hints: [`<p>Hint 1: keep <code>let bal</code> and <code>const history = []</code> inside <code>createAccount</code>.</p>`, `<p>Hint 2: write one private <code>validate(amount)</code> helper and one private <code>record(type, amount)</code> helper.</p>`, `<p>Hint 3: <code>statement()</code> returns copies of the entries; consider <code>Object.freeze</code> on the returned API object so methods cannot be replaced.</p>`],
    tests: { sig: 'string string string[] -> string', fn: 'acctRun', harness: { js: `function acctRun(owner, opening, ops) {
  const a = opening === '' ? createAccount(owner) : createAccount(owner, +opening), out = [];
  const tryOp = (f) => { try { return f(); } catch (e) { return e.name + (e.name === 'Error' ? ': ' + e.message : ''); } };
  for (const op of ops) {
    if (op === 'b') out.push(a.balance());
    else if (op === 's') out.push(a.statement());
    else if (op === 'slen') out.push(a.statement().length);
    else if (op === 'mut') { const st = a.statement(); st.length = 0; out.push('mut'); }
    else if (op === 'mut2') { const st = a.statement(); if (st[0]) st[0].amount = 12345; out.push('mut2'); }
    else if (op === 'bal-prop') out.push(String(a.bal) + '/' + String(a.history));
    else if (op === 'owner') out.push(a.owner);
    else if (op === 'frozen') out.push(Object.isFrozen(a));
    else {
      const m = /^([dw])(\\*(\\d+))?:(.*)$/.exec(op), times = m[3] ? +m[3] : 1;
      const raw = m[4], amt = raw.startsWith('s') ? raw.slice(1) : Number(raw);
      let r; for (let i = 0; i < times; i++) r = tryOp(() => (m[1] === 'd' ? a.deposit(amt) : a.withdraw(amt)));
      out.push(r);
    }
  }
  return out;
}` }, cases: [
      [["Asha","100",["d:50","w:500","d:-5","b","s"]],[150,"Error: Insufficient funds","RangeError",150,[{"type":"open","amount":100,"balance":100},{"type":"deposit","amount":50,"balance":150}]]],
      [["Asha","",["b","d:0","w:0","d:NaN","d:Infinity","w:-1","d:s5","b"]],[0,"RangeError","RangeError","RangeError","RangeError","RangeError","RangeError",0]],
      [["Ben","100",["w:100","b","w:0.5"]],[0,0,"Error: Insufficient funds"]],
      [["Ben","100",["d:0.5","w:0.25","s"]],[100.5,100.25,[{"type":"open","amount":100,"balance":100},{"type":"deposit","amount":0.5,"balance":100.5},{"type":"withdraw","amount":0.25,"balance":100.25}]]],
      [["Cy","10",["mut","slen","mut2","s"]],["mut",1,"mut2",[{"type":"open","amount":10,"balance":10}]]],
      [["Cy","10",["bal-prop","owner","frozen"]],["undefined/undefined","Cy",true]],
      [["Di","0",["w:1","d:1","w:1","b","slen"]],["Error: Insufficient funds",1,0,0,3]],
      [["Ed","5",["d*100000:1","b","slen"]],[100005,100005,100001]],
      [["Fay","1",["w:1","d:1","w:2"]],[0,1,"Error: Insufficient funds"]]
    ] },
    solution: {
      approach: `<p>Module pattern: private state + private helpers in the factory scope, a frozen public API of closures, and defensive copies for anything mutable that leaves the closure.</p>`,
      code: { lang: 'js', run: true, code: `
function createAccount(owner, opening = 0) {
  let bal = opening;
  const history = [{ type: 'open', amount: opening, balance: opening }];

  function validate(amount) {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new RangeError('Amount must be a positive number');
    }
  }
  function record(type, amount) {
    history.push({ type, amount, balance: bal });
    return bal;
  }

  return Object.freeze({
    owner,
    deposit(amount) { validate(amount); bal += amount; return record('deposit', amount); },
    withdraw(amount) {
      validate(amount);
      if (amount > bal) throw new Error('Insufficient funds');
      bal -= amount;
      return record('withdraw', amount);
    },
    balance: () => bal,
    statement: () => history.map((e) => ({ ...e }))   // defensive copy
  });
}

const acct = createAccount('Asha', 100);
console.log(acct.deposit(50));                       // 150
try { acct.withdraw(500); } catch (e) { console.log(e.message); }
try { acct.deposit(-5); } catch (e) { console.log(e.name); }
const st = acct.statement();
st.length = 0;                                       // only the copy is cleared
console.log(acct.statement().length, acct.balance()); // 2 150
console.log(acct.bal);                               // undefined
` },
      dry: { head: ['call', 'bal', 'history length', 'result'], rows: [['createAccount(100)', '100', '1', '—'], ['deposit(50)', '150', '2', '150'], ['withdraw(500)', '150', '2', H.c('r', 'Insufficient funds')], ['statement().length = 0', '150', '2', 'copy cleared only']] },
      complexity: `<p>O(1) per deposit/withdraw; O(h) for statement (copy of h entries).</p>`,
      followUps: ['Store money as integer paise to avoid floating-point errors.', 'Add <code>transfer(to, amount)</code> that is atomic across two accounts.', 'Rewrite with <code>#private</code> class fields.']
    }
  });

  practice.push({
    title: 'Infinite Curry Sum: sum(1)(2)(3)()', level: 'Medium', tags: ['closures', 'currying', 'recursion'], companies: ['Flipkart', 'Walmart', 'Uber'],
    statement: `<p>Implement <code>sum</code> such that <code>sum(a)(b)(c)…()</code> returns the total of all numbers once it is called with <b>no argument</b>. Each call may pass one or more numbers: <code>sum(1, 2)(3)()</code> = 6. <code>sum()</code> = 0. Partial chains must be reusable: <code>const s = sum(10); s(1)()</code> → 11 and then <code>s(2)()</code> → 12 (branches do not affect each other).</p>`,
    constraints: `Up to 10<sup>4</sup> chained calls; numbers are finite.`,
    example: `<p>sum(1)(2)(3)() → ${H.c('g', '6')}. const s = sum(10); s(1)() → ${H.c('g', '11')}; s(2)() → ${H.c('g', '12')} — ${H.c('b', 'not 13')}, so the running total must not be shared mutable state.</p>`,
    brute: { why: `<p>Using one mutable outer <code>total</code> that every call adds into: the first chain works, but reusing a partial chain (branching) double-counts, and a second, unrelated <code>sum(…)</code> chain starts from the old total.</p>`,
      code: `
let total = 0; // shared across every chain - wrong
function sumBrute(...nums) {
  if (nums.length === 0) { const t = total; total = 0; return t; }
  total += nums.reduce((s, x) => s + x, 0);
  return sumBrute;
}` },
    mcq: { q: 'How do you make branches like <code>s(1)</code> and <code>s(2)</code> independent?', options: ['Each call returns a NEW function closing over a NEW accumulated total (no mutation)', 'Reset a global total after each ()', 'Use this.total', 'Use setTimeout'], answer: 0, explain: 'Immutable accumulation: next = acc + newNumbers, captured by a fresh closure. Old closures still hold their old totals.' },
    hints: [`<p>Hint 1: write a helper <code>make(acc)</code> that returns a function closing over <code>acc</code>.</p>`, `<p>Hint 2: inside it: no arguments → return <code>acc</code>; otherwise return <code>make(acc + sumOf(args))</code>.</p>`, `<p>Hint 3: <code>sum</code> itself is just <code>make(0)</code> applied to the first call: <code>const sum = (...a) =&gt; make(0)(...a)</code>.</p>`],
    tests: { sig: 'int[][][] -> int[]', fn: 'cur', harness: { js: `function cur(chains) {
  const out = [];
  const apply = (f, chain) => { let r = f; for (const nums of chain) r = r(...nums); return r; };
  const first = apply(sum, chains[0]);
  if (typeof first === 'number') { out.push(first); return out; }
  for (const ch of chains.slice(1)) out.push(apply(first, ch));
  return out;
}` }, cases: [
      [[[[[1],[2],[3],[]]]],[6]],
      [[[[[1,2],[3],[]]]],[6]],
      [[[[[]]]],[0]],
      [[[[[10]],[[1],[]],[[2],[]]]],[11,12]],
      [[[[[1]],[[]]]],[1]],
      [[[[[-1],[1],[]]]],[0]],
      [[[[[1,2,3,4,5],[]]]],[15]],
      [[[[[0],[]]]],[0]],
      [[[[[5]],[[5],[5],[]],[[]],[[1,1],[]]]],[15,5,7]],
      [[[[[1000000000],[1000000000],[]]]],[2000000000]],
      [[[{"$concat":[{"$rep":[1],"n":10000},[[]]]}]],[10000]],
      [[[{"$concat":[{"$rep":[1,2],"n":5000},[[]]]}]],[15000]]
    ] },
    solution: {
      approach: `<p>Each step creates a new closure with the accumulated total so far; nothing is mutated, so any partial chain is a reusable, independent value.</p>`,
      code: { lang: 'js', run: true, code: `
function make(acc) {
  return function next(...nums) {
    if (nums.length === 0) return acc;                    // terminator ()
    return make(acc + nums.reduce((s, x) => s + x, 0));   // new closure, new total
  };
}
const sum = (...nums) => make(0)(...nums);

console.log(sum(1)(2)(3)());   // 6
console.log(sum(1, 2)(3)());   // 6
console.log(sum());            // 0
const s = sum(10);
console.log(s(1)(), s(2)());   // 11 12  (branches are independent)
` },
      dry: { head: ['call', 'acc captured', 'returns'], rows: [['sum(1)', '0 → 1', 'ƒ (acc=1)'], ['(2)', '1 → 3', 'ƒ (acc=3)'], ['(3)', '3 → 6', 'ƒ (acc=6)'], ['()', '6', '6']] },
      complexity: `<p>O(k) total for k numbers; each call allocates one small closure.</p>`,
      followUps: ['Make <code>sum(1)(2) + 3</code> work using <code>valueOf</code>.', 'Generalise to <code>curry(fn)</code> for a fixed-arity function.']
    }
  });

  practice.push({
    title: 'Call Limiters: before(n, fn) and after(n, fn)', level: 'Medium', tags: ['closures', 'higher-order functions'], companies: ['Atlassian', 'Intuit'],
    statement: `<p>Implement two lodash-style helpers:</p><ul><li><code>before(n, fn)</code>: calls <code>fn</code> while it has been called <b>fewer than n</b> times; later calls return the result of the last real call.</li><li><code>after(n, fn)</code>: does nothing (returns undefined) for the first <code>n − 1</code> calls, then calls <code>fn</code> on the n-th and every later call.</li></ul><p>Both must forward <code>this</code> and arguments, and release <code>fn</code> when it can no longer be called (so its captured data can be garbage-collected).</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>.`,
    example: `<p>const b = before(3, f): b() calls f, b() calls f, b() ${H.c('m', 'does not')} (returns 2nd result). const a = after(3, f): a() ${H.c('m', 'skip')}, a() ${H.c('m', 'skip')}, a() ${H.c('g', 'calls f')}, a() ${H.c('g', 'calls f')}.</p>`,
    brute: { why: `<p>A global call counter shared by all limited functions: two different <code>before</code> wrappers interfere, and the counter never resets per wrapper.</p>`,
      code: `
let calls = 0; // shared by every wrapper - wrong
const beforeBrute = (n, fn) => (...args) => (++calls < n ? fn(...args) : undefined);` },
    mcq: { q: 'Why set <code>fn = undefined</code> inside <code>before</code> once the limit is reached?', options: ['So the closure stops retaining fn (and whatever fn captured), allowing GC', 'To throw an error on next call', 'Because fn is const', 'It is required by the spec'], answer: 0, explain: 'Closures keep captured values alive. Dropping the reference is a small but real memory hygiene step (lodash does exactly this).' },
    hints: [`<p>Hint 1: each wrapper captures its own <code>count</code> and (for before) <code>lastResult</code>.</p>`, `<p>Hint 2: before: increment first; if <code>count &lt; n</code> call fn and store result; when count reaches n, drop fn.</p>`, `<p>Hint 3: after: <code>if (++count &gt;= n) return fn.apply(this, args);</code> Use regular <code>function</code> wrappers to forward <code>this</code>.</p>`],
    tests: { sig: 'string int int -> string', fn: 'ba', harness: { js: `function ba(kind, n, k) {
  let real = 0; const res = [];
  const f = function (x) { real++; return (this && this.tag ? this.tag : 'r') + x; };
  const obj = { tag: 'T' };
  let w;
  if (kind.startsWith('before')) w = before(n, f); else w = after(n, f);
  for (let c = 1; c <= k; c++) res.push(U(kind.endsWith('-this') ? (obj.m = w, obj.m(c)) : w(c)));
  if (k > 100) return { real, first: res[0], last: res[res.length - 1], uCount: res.filter((x) => x === 'undefined').length };
  return { res, real };
}
function U(v) { return v === undefined ? 'undefined' : v; }` }, cases: [
      [["before",3,5],{"res":["r1","r2","r2","r2","r2"],"real":2}],
      [["before",0,3],{"res":["undefined","undefined","undefined"],"real":0}],
      [["before",1,3],{"res":["undefined","undefined","undefined"],"real":0}],
      [["before",2,1],{"res":["r1"],"real":1}],
      [["before",2,0],{"res":[],"real":0}],
      [["after",3,5],{"res":["undefined","undefined","r3","r4","r5"],"real":3}],
      [["after",0,3],{"res":["r1","r2","r3"],"real":3}],
      [["after",1,3],{"res":["r1","r2","r3"],"real":3}],
      [["after",2,1],{"res":["undefined"],"real":0}],
      [["before-this",2,3],{"res":["T1","T1","T1"],"real":1}],
      [["after-this",2,3],{"res":["undefined","T2","T3"],"real":2}],
      [["before",1000000,1000000],{"real":999999,"first":"r1","last":"r999999","uCount":0}],
      [["after",1000000,1000000],{"real":1,"first":"undefined","last":"r1000000","uCount":999999}]
    ] },
    solution: {
      approach: `<p>Two tiny closures, each with private counters. <code>before</code> remembers the last result and releases fn after the limit.</p>`,
      code: { lang: 'js', run: true, code: `
function before(n, fn) {
  let count = 0, last;
  return function (...args) {
    if (++count < n) last = fn.apply(this, args);
    if (count >= n) fn = undefined; // release for GC
    return last;
  };
}
function after(n, fn) {
  let count = 0;
  return function (...args) {
    if (++count >= n) return fn.apply(this, args);
    return undefined;
  };
}

let realCalls = 0;
const b = before(3, (x) => { realCalls++; return 'got ' + x; });
console.log(b('a'), b('b'), b('c'), b('d'), 'real:', realCalls); // got a got b got b got b real: 2

const done = after(3, () => 'all 3 uploads finished');
console.log(done(), done(), done(), done()); // undefined undefined all 3 uploads finished all 3 uploads finished
` },
      dry: { head: ['call', 'count', 'before(3) calls fn?', 'after(3) calls fn?'], rows: [['1st', '1', 'yes', 'no'], ['2nd', '2', 'yes', 'no'], ['3rd', '3', 'no (returns last)', 'yes'], ['4th', '4', 'no', 'yes']] },
      complexity: `<p>O(1) time per call; O(1) memory per wrapper (one closed-over call counter plus the cached result).</p>`,
      followUps: ['Implement <code>once</code> as <code>before(2, fn)</code>.', 'Use <code>after</code> to run a callback when N parallel tasks finish.']
    }
  });

  practice.push({
    title: 'Event Emitter with Unsubscribe Closures', level: 'Medium', tags: ['closures', 'observer', 'Map'], companies: ['Microsoft', 'Uber', 'Swiggy'],
    statement: `<p>Write <code>createEmitter()</code> returning <code>{ on, emit, count }</code>:</p><ul><li><code>on(event, listener)</code> → returns an <code>unsubscribe()</code> function. Subscribing the <b>same</b> listener twice creates two independent subscriptions. Calling unsubscribe twice is harmless.</li><li><code>emit(event, ...args)</code> → calls listeners in subscription order and returns how many ran. A listener unsubscribing during emit must not break the loop.</li><li><code>count(event)</code> → number of active subscriptions.</li></ul>`,
    constraints: `Up to 10<sup>4</sup> listeners per event.`,
    example: `<p>const off = em.on('save', log); em.on('save', log); em.emit('save', 1) → ${H.c('g', '2')}; off(); off(); em.emit('save', 2) → ${H.c('g', '1')}.</p>`,
    brute: { why: `<p>Removing by function reference (<code>list.indexOf(listener)</code>) removes the wrong subscription when the same function is subscribed twice, and mutating the array during <code>emit</code> skips listeners.</p>`,
      code: `
function createEmitterBrute() {
  const map = {};
  return {
    on(e, fn) { (map[e] = map[e] || []).push(fn); return () => map[e].splice(map[e].indexOf(fn), 1); }, // double-off removes another one!
    emit(e, ...a) { (map[e] || []).forEach((fn) => fn(...a)); }
  };
}` },
    mcq: { q: 'What makes each unsubscribe function remove exactly its own subscription?', options: ['It closes over a unique subscription token/record created in that on() call', 'It compares listener functions', 'It uses the event name only', 'It clears all listeners'], answer: 0, explain: 'Each on() call creates a new record object; the returned closure captures that record and deletes only it.' },
    hints: [`<p>Hint 1: store, per event, a <code>Set</code> of subscription records <code>{ listener }</code> — a new object per <code>on()</code> call.</p>`, `<p>Hint 2: the unsubscribe closure captures the record and does <code>set.delete(record)</code> — idempotent automatically.</p>`, `<p>Hint 3: in emit, iterate over a snapshot (<code>[...set]</code>) and skip records already removed (<code>set.has(rec)</code>).</p>`],
    tests: { sig: 'string -> string', fn: 'emRun', harness: { js: `function emRun(kind) {
  const em = createEmitter(), seen = [];
  switch (kind) {
    case 'basic': { const log = (x) => seen.push(x); const off = em.on('save', log); em.on('save', log); const r1 = em.emit('save', 1); off(); off(); const r2 = em.emit('save', 2); return { r: [r1, r2, em.count('save')], seen }; }
    case 'self-unsub': { const off = em.on('x', () => { off(); seen.push('s'); }); return [em.emit('x'), em.emit('x'), em.count('x'), seen]; }
    case 'order': { em.on('x', () => seen.push(1)); em.on('x', () => seen.push(2)); em.on('x', () => seen.push(3)); return [em.emit('x'), seen]; }
    case 'none': return [em.emit('nothing'), em.count('nothing')];
    case 'same-listener-twice': { const f = () => seen.push('f'); const off1 = em.on('x', f); em.on('x', f); off1(); return [em.emit('x'), em.count('x'), seen]; }
    case 'args': { em.on('x', (a, b, c) => seen.push([a, b, c])); em.emit('x', 1, 'two', null); return seen; }
    case 'events': { em.on('a', () => seen.push('A')); em.on('b', () => seen.push('B')); em.on('b', () => seen.push('B2')); return [em.emit('a'), em.emit('b'), em.count('a'), em.count('b'), seen]; }
    case 'many': { const offs = []; let n = 0; for (let i = 0; i < 10000; i++) offs.push(em.on('x', () => { n++; })); const r = em.emit('x'); const c = em.count('x'); offs.forEach((o) => o()); return [r, n, c, em.count('x'), em.emit('x')]; }
    case 'resubscribe': { const f = () => seen.push('f'); const off = em.on('x', f); off(); em.on('x', f); return [em.emit('x'), seen]; }
    case 'unsub-others-first-then-emit': { const a = em.on('x', () => seen.push('a')); const b = em.on('x', () => seen.push('b')); b(); return [em.emit('x'), seen, a === b]; }
    case 'unsub-before-emit-all': { const o = em.on('x', () => {}); o(); return [em.emit('x'), em.count('x')]; }
    case 'listener-added-during-emit': { em.on('x', () => { seen.push('a'); em.on('x', () => seen.push('late')); }); const r1 = em.emit('x'); const r2 = em.emit('x'); return [r1, r2, seen]; }
  }
}` }, cases: [
      [["basic"],{"r":[2,1,1],"seen":[1,1,2]}],
      [["self-unsub"],[1,0,0,["s"]]],
      [["order"],[3,[1,2,3]]],
      [["none"],[0,0]],
      [["same-listener-twice"],[1,1,["f"]]],
      [["args"],[[1,"two",null]]],
      [["events"],[1,2,1,2,["A","B","B2"]]],
      [["many"],[10000,10000,10000,0,0]],
      [["resubscribe"],[1,["f"]]],
      [["unsub-others-first-then-emit"],[1,["a"],false]],
      [["unsub-before-emit-all"],[0,0]],
      [["listener-added-during-emit"],[1,2,["a","a","late"]]]
    ] },
    solution: {
      approach: `<p>Map of event → Set of unique records. Each <code>on()</code> returns a closure over its own record, so removal is O(1), exact and idempotent. Emitting iterates a snapshot.</p>`,
      code: { lang: 'js', run: true, code: `
function createEmitter() {
  const events = new Map(); // event -> Set of { listener }
  return {
    on(event, listener) {
      if (!events.has(event)) events.set(event, new Set());
      const record = { listener };          // unique per subscription
      events.get(event).add(record);
      return function unsubscribe() {        // closure over THIS record
        const set = events.get(event);
        if (set) set.delete(record);
      };
    },
    emit(event, ...args) {
      const set = events.get(event);
      if (!set) return 0;
      let ran = 0;
      for (const rec of [...set]) {          // snapshot: safe if listeners unsubscribe
        if (!set.has(rec)) continue;
        rec.listener(...args);
        ran++;
      }
      return ran;
    },
    count: (event) => (events.has(event) ? events.get(event).size : 0)
  };
}

const em = createEmitter();
const seen = [];
const log = (x) => seen.push(x);
const off = em.on('save', log);
em.on('save', log);
console.log(em.emit('save', 1));        // 2
off(); off();                            // second call harmless
console.log(em.emit('save', 2), em.count('save')); // 1 1
const offSelf = em.on('save', () => { offSelf(); seen.push('self-removed'); });
console.log(em.emit('save', 3), em.emit('save', 4), seen.join(','));
` },
      dry: { head: ['op', 'records in Set', 'result'], rows: [["on(log) → off", 'r1', '—'], ["on(log)", 'r1, r2', '—'], ["emit(1)", 'r1, r2', '2'], ["off(); off()", 'r2', 'r1 removed once'], ["emit(2)", 'r2', '1']] },
      complexity: `<p>on/unsubscribe O(1); emit O(L) for L listeners (plus snapshot copy).</p>`,
      followUps: ['Add <code>once(event, fn)</code> built on <code>on</code>.', 'Prevent leaks: warn when an event exceeds 10 listeners (like Node\'s MaxListenersExceededWarning).', 'Support <code>AbortSignal</code> for unsubscription.']
    }
  });

  practice.push({
    title: 'Memoize with Expiry (TTL Cache)', level: 'Medium', tags: ['closures', 'memoize', 'cache'], companies: ['Amazon', 'Razorpay'],
    statement: `<p>Write <code>memoizeTTL(fn, ttlMs, now = Date.now)</code>: like memoize for a single primitive argument, but a cached result is only reused if it is <b>younger than</b> <code>ttlMs</code> milliseconds. Expired entries are recomputed. <code>now</code> is injectable so tests are deterministic. Expose <code>.clear()</code>.</p>`,
    constraints: `1 ≤ ttlMs ≤ 10<sup>7</sup>; up to 10<sup>5</sup> calls.`,
    example: `<p>ttl = 1000. t=0: f('a') ${H.c('y', 'computed')}; t=500: f('a') ${H.c('g', 'cached')}; t=1000: f('a') ${H.c('y', 'recomputed (age 1000 is not < 1000)')}.</p>`,
    brute: { why: `<p>Plain memoize never expires: stale prices/exchange rates are served forever. Clearing the whole cache on a <code>setInterval</code> works roughly, but it drops fresh entries too and keeps a timer alive (blocking Node from exiting).</p>`,
      code: `
function memoizeForever(fn) {
  const cache = new Map();
  return (k) => { if (!cache.has(k)) cache.set(k, fn(k)); return cache.get(k); }; // never expires
}` },
    mcq: { q: 'Why inject <code>now</code> instead of calling <code>Date.now()</code> directly?', options: ['Tests can control time precisely without waiting or fake timers', 'Date.now is slow', 'Closures cannot call Date.now', 'It is required for Map'], answer: 0, explain: 'Dependency-injecting the clock makes time-based logic deterministic and testable — a standard production technique.' },
    hints: [`<p>Hint 1: store <code>{ value, at }</code> per key in a Map captured by the closure.</p>`, `<p>Hint 2: on each call compute <code>age = now() - entry.at</code>; reuse only if <code>age &lt; ttlMs</code>.</p>`, `<p>Hint 3: on recompute overwrite the entry with a fresh timestamp; <code>clear</code> just calls <code>cache.clear()</code>.</p>`],
    tests: { sig: 'int string[] -> string', fn: 'ttl', harness: { js: `function ttl(ttlMs, ops) {
  let time = 0, computed = 0; const out = [];
  const f = memoizeTTL((k) => { computed++; return k + '@' + time; }, ttlMs, () => time);
  for (const op of ops) {
    if (op.startsWith('t:')) time = +op.slice(2);
    else if (op === 'clear') f.clear();
    else if (op.startsWith('num:')) out.push(f(Number(op.slice(4))));
    else if (op.startsWith('x*')) { let r; for (let i = 0; i < +op.slice(2); i++) r = f('k'); out.push(r); }
    else out.push(f(op));
  }
  return { out, computed };
}
function ttlDefault() {
  let computed = 0; const f = memoizeTTL((k) => { computed++; return k; }, 10000000); f('a'); f('a'); f('b'); return computed;
}` }, cases: [
      [[1000,["INFY","t:500","INFY","t:1000","INFY"]],{"out":["INFY@0","INFY@0","INFY@1000"],"computed":2}],
      [[1000,["a","b","t:999","a","b","t:1000","a","b"]],{"out":["a@0","b@0","a@0","b@0","a@1000","b@1000"],"computed":4}],
      [[1000,["a","t:999","a","t:1000","a","t:1999","a","t:2000","a"]],{"out":["a@0","a@0","a@1000","a@1000","a@2000"],"computed":3}],
      [[1000,["a","clear","a"]],{"out":["a@0","a@0"],"computed":2}],
      [[1,["a","a","t:1","a"]],{"out":["a@0","a@0","a@1"],"computed":2}],
      [[10000000,["a","t:9999999","a"]],{"out":["a@0","a@0"],"computed":1}],
      [[1000,["num:1","num:1","x*1"]],{"out":["1@0","1@0","k@0"],"computed":2}],
      [[1000,[]],{"out":[],"computed":0}],
      [[500,["x*100000","t:499","x*100000","t:500","x*100000"]],{"out":["k@0","k@0","k@500"],"computed":2}]
    ] },
    solution: {
      approach: `<p>Closure over a Map of timestamped entries and the injected clock. Lazy expiry: entries are checked when read, no timers needed.</p>`,
      code: { lang: 'js', run: true, code: `
function memoizeTTL(fn, ttlMs, now = Date.now) {
  const cache = new Map(); // key -> { value, at }
  function cached(key) {
    const t = now();
    const hit = cache.get(key);
    if (hit && t - hit.at < ttlMs) return hit.value; // fresh enough
    const value = fn(key);
    cache.set(key, { value, at: t });
    return value;
  }
  cached.clear = () => cache.clear();
  return cached;
}

let fakeTime = 0;
let computed = 0;
const price = memoizeTTL((sym) => { computed++; return sym + '@' + fakeTime; }, 1000, () => fakeTime);
console.log(price('INFY'));              // INFY@0   (computed)
fakeTime = 500;
console.log(price('INFY'));              // INFY@0   (cached)
fakeTime = 1000;
console.log(price('INFY'), 'computed:', computed); // INFY@1000 computed: 2
` },
      dry: { head: ['time', 'entry.at', 'age', 'action'], rows: [['0', '—', '—', 'compute'], ['500', '0', '500', 'cached'], ['1000', '0', '1000', 'recompute']] },
      complexity: `<p>O(1) per call; memory grows with distinct keys (add LRU or periodic sweep for bounds).</p>`,
      followUps: ['Serve stale value while refreshing in the background (stale-while-revalidate).', 'Cache promises for async fn and evict on rejection.']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Bounded Memoize with LRU Eviction', level: 'Hard', tags: ['closures', 'memoize', 'LRU', 'Map'], companies: ['Google', 'Netflix', 'Atlassian'],
    statement: `<p>Write <code>memoizeLRU(fn, capacity)</code> for single-argument pure functions. The cache holds at most <code>capacity</code> results; when full, adding a new result evicts the <b>least recently used</b> one (a cache hit counts as a use). Expose <code>stats()</code> → <code>{ hits, misses, evictions, size }</code> and <code>keys()</code> → keys from least to most recently used.</p>`,
    constraints: `1 ≤ capacity ≤ 10<sup>5</sup>; up to 10<sup>6</sup> calls; every operation must be O(1) average.`,
    example: `<p>capacity 2: f(1) miss, f(2) miss, f(1) ${H.c('g', 'hit')} (1 becomes most recent), f(3) miss → evict ${H.c('r', '2')}, keys() → ${H.c('b', '[1, 3]')}.</p>`,
    brute: { why: `<p>Keep an array of keys in usage order and <code>indexOf</code>/<code>splice</code> on every hit: correct, but O(capacity) per call — 10<sup>6</sup> calls × 10<sup>5</sup> capacity is far too slow.</p>`,
      code: `
function memoizeLRUBrute(fn, capacity) {
  const cache = new Map(), order = [];
  return (k) => {
    if (cache.has(k)) { order.splice(order.indexOf(k), 1); order.push(k); return cache.get(k); } // O(n)
    if (order.length === capacity) cache.delete(order.shift());
    cache.set(k, fn(k)); order.push(k);
    return cache.get(k);
  };
}` },
    mcq: { q: 'Which built-in property makes an O(1) LRU in JavaScript easy?', options: ['A Map iterates keys in insertion order, so delete + set moves a key to the end', 'Objects sort keys alphabetically', 'WeakMap evicts automatically', 'Arrays have O(1) splice'], answer: 0, explain: 'The first key of a Map (map.keys().next().value) is the oldest inserted; re-inserting on each use keeps the least recently used at the front.' },
    hints: [`<p>Hint 1: one Map is enough: its insertion order <b>is</b> your recency list.</p>`, `<p>Hint 2: on a hit, <code>delete</code> then <code>set</code> the same key to move it to the most-recent end.</p>`, `<p>Hint 3: on a miss with a full cache, evict <code>cache.keys().next().value</code> before inserting. Keep hits/misses/evictions as private counters in the closure.</p>`],
    tests: { sig: 'int int[] -> string', fn: 'lruRun', harness: { js: `function lruRun(cap, keys) {
  let calls = 0;
  const f = memoizeLRU((n) => { calls++; return n * n; }, cap);
  const res = []; for (const k of keys) res.push(f(k));
  if (keys.length > 1000) { const ks = f.keys(); return { stats: f.stats(), calls, first: ks[0], last: ks[ks.length - 1], n: ks.length }; }
  return { res, keys: f.keys(), stats: f.stats(), calls };
}` }, cases: [
      [[2,[1,2,1,3]],{"res":[1,4,1,9],"keys":[1,3],"stats":{"hits":1,"misses":3,"evictions":1,"size":2},"calls":3}],
      [[2,[1,2,1,3,2]],{"res":[1,4,1,9,4],"keys":[3,2],"stats":{"hits":1,"misses":4,"evictions":2,"size":2},"calls":4}],
      [[1,[1,1,2,2,1]],{"res":[1,1,4,4,1],"keys":[1],"stats":{"hits":2,"misses":3,"evictions":2,"size":1},"calls":3}],
      [[3,[1,2,3,1,2,3]],{"res":[1,4,9,1,4,9],"keys":[1,2,3],"stats":{"hits":3,"misses":3,"evictions":0,"size":3},"calls":3}],
      [[3,[1,2,3,1]],{"res":[1,4,9,1],"keys":[2,3,1],"stats":{"hits":1,"misses":3,"evictions":0,"size":3},"calls":3}],
      [[3,[]],{"res":[],"keys":[],"stats":{"hits":0,"misses":0,"evictions":0,"size":0},"calls":0}],
      [[2,[0,0,-3,0,5]],{"res":[0,0,9,0,25],"keys":[0,5],"stats":{"hits":2,"misses":3,"evictions":1,"size":2},"calls":3}],
      [[2,[1,2,3,4]],{"res":[1,4,9,16],"keys":[3,4],"stats":{"hits":0,"misses":4,"evictions":2,"size":2},"calls":4}],
      [[3,[1,2,3,4,1]],{"res":[1,4,9,16,1],"keys":[3,4,1],"stats":{"hits":0,"misses":5,"evictions":2,"size":3},"calls":5}],
      [[100000,{"$concat":[{"$range":[0,150000]},{"$range":[0,150000]},{"$range":[0,150000]},{"$range":[0,150000]},{"$range":[0,150000]},{"$range":[0,150000]}]}],{"stats":{"hits":0,"misses":900000,"evictions":800000,"size":100000},"calls":900000,"first":50000,"last":149999,"n":100000}],
      [[100000,{"$concat":[{"$range":[0,80000]},{"$range":[0,80000]},{"$range":[0,80000]},{"$range":[0,80000]},{"$range":[0,80000]},{"$range":[0,80000]},{"$range":[0,80000]},{"$range":[0,80000]},{"$range":[0,80000]},{"$range":[0,80000]},{"$range":[0,80000]},{"$range":[0,80000]}]}],{"stats":{"hits":880000,"misses":80000,"evictions":0,"size":80000},"calls":80000,"first":0,"last":79999,"n":80000}]
    ] },
    solution: {
      approach: `<p>A Map from key to a node of a doubly linked list ordered least → most recently used, plus counters. Hit → unlink the node and append it at the MRU end (O(1)); miss → evict the node after the head sentinel if full (O(1)), then append the new node. (The shortcut of deleting and re-setting keys in a Map and evicting <code>map.keys().next()</code> looks O(1), but V8 keeps deleted slots until a rehash, so evicting from the front slows down badly at this scale.)</p>`,
      code: { lang: 'js', run: true, code: `
function memoizeLRU(fn, capacity) {
  // Doubly linked list ordered LRU -> MRU between two sentinels, plus a Map key -> node.
  const map = new Map();
  const head = { prev: null, next: null }, tail = { prev: head, next: null };
  head.next = tail;
  let hits = 0, misses = 0, evictions = 0;

  const unlink = (node) => { node.prev.next = node.next; node.next.prev = node.prev; };
  const append = (node) => {             // becomes the most recently used
    node.prev = tail.prev; node.next = tail;
    tail.prev.next = node; tail.prev = node;
  };

  function memo(key) {
    const hit = map.get(key);
    if (hit) {
      hits++;
      unlink(hit);                       // move to the MRU end, O(1)
      append(hit);
      return hit.value;
    }
    misses++;
    const value = fn(key);
    if (map.size >= capacity) {
      const lru = head.next;             // least recently used
      unlink(lru);
      map.delete(lru.key);
      evictions++;
    }
    const node = { key, value, prev: null, next: null };
    append(node);
    map.set(key, node);
    return value;
  }
  memo.stats = () => ({ hits, misses, evictions, size: map.size });
  memo.keys = () => {
    const out = [];
    for (let n = head.next; n !== tail; n = n.next) out.push(n.key);
    return out;
  };
  return memo;
}

const square = memoizeLRU((n) => n * n, 2);
square(1); square(2); square(1); square(3);
console.log(square.keys(), square.stats()); // [ 1, 3 ] { hits: 1, misses: 3, evictions: 1, size: 2 }
square(2);                                   // was evicted -> miss again
console.log(square.keys(), square.stats().misses); // [ 3, 2 ] 4
` },
      dry: { head: ['call', 'hit?', 'evicted', 'keys (LRU → MRU)'], rows: [['f(1)', 'no', '—', '[1]'], ['f(2)', 'no', '—', '[1, 2]'], ['f(1)', 'yes', '—', '[2, 1]'], ['f(3)', 'no', '2', '[1, 3]'], ['f(2)', 'no', '1', '[3, 2]']] },
      complexity: `<p>O(1) average per call; O(capacity) memory.</p>`,
      followUps: ['Support multiple arguments (combine with the Map-trie from Memoize II).', 'Add TTL as well as size limits.', 'Why can\'t a WeakMap implement LRU? (not iterable, no size)']
    }
  });

  practice.push({
    title: 'Static Scope Resolver with Hoisting and TDZ', level: 'Hard', tags: ['scope', 'hoisting', 'TDZ', 'interpreter'], companies: ['Google', 'Microsoft', 'Vercel'],
    statement: `<p>Write a tiny scope analyzer. A program is an array of statements:</p><ul><li><code>['var', name]</code>, <code>['let', name]</code>, <code>['const', name]</code> — declarations (executing a let/const line initialises it)</li><li><code>['use', name]</code> — read a variable</li><li><code>['block', stmts]</code> — a nested block; <code>['fn', stmts]</code> — a nested function scope that runs immediately (like an IIFE)</li></ul><p>For every <code>use</code>, output <code>name@scope</code> (the scope where it resolves), <code>TDZ:name</code>, or <code>ReferenceError:name</code>, continuing after errors. Scopes are labelled <code>global</code>, then <code>block1</code>, <code>fn2</code>, … numbered in the order they are entered. Apply real JS rules: <code>var</code> hoists to the nearest function (or global) scope — even out of nested blocks — and is usable immediately; <code>let</code>/<code>const</code> exist from the start of their block but are in the TDZ until their line runs.</p>`,
    constraints: `≤ 10<sup>4</sup> statements, nesting depth ≤ 100. Programs are valid (no illegal redeclarations).`,
    example: `<p>[use a, var a, let b, block[use b, let b, use b, var c], use c, fn[use a, var a, use b, use zz]] →</p><p>${H.c('g', 'a@global')}, ${H.c('r', 'TDZ:b')} (inner b shadows), ${H.c('g', 'b@block1')}, ${H.c('g', 'c@global')} (var escaped the block), ${H.c('g', 'a@fn2')} (local var hoisted), ${H.c('g', 'b@global')}, ${H.c('r', 'ReferenceError:zz')}.</p>`,
    brute: { why: `<p>A single forward pass that only declares names when their line is reached: every early <code>use</code> of a <code>var</code> wrongly becomes ReferenceError, block-level shadowing TDZ is missed (the outer <code>b</code> is found instead), and <code>var</code>s stay trapped in blocks.</p>`,
      code: `
function resolveBrute(program) {
  const out = [], scope = new Map();
  for (const [kind, name] of program) {
    if (kind === 'use') out.push(scope.has(name) ? name + '@global' : 'ReferenceError:' + name);
    else if (kind !== 'block' && kind !== 'fn') scope.set(name, true); // no hoisting, no nesting
  }
  return out;
}` },
    mcq: { q: 'Inside a block, a <code>use b</code> appears before <code>let b</code>, and the global scope also has an initialised <code>b</code>. What is the result?', options: ['TDZ:b — the block\'s b exists from the block start and shadows the global b', 'b@global', 'ReferenceError:b', 'undefined'], answer: 0, explain: 'Lexical declarations are created when the block is entered. Lookup stops at the first scope that has the name, even if that binding is still uninitialised.' },
    hints: [`<p>Hint 1: on entering any scope, first create all its <b>direct</b> <code>let</code>/<code>const</code> names in state <code>'tdz'</code>. On entering a function (or global) scope, also collect all <code>var</code> names in its body, recursing into <code>block</code>s but <b>not</b> into nested <code>fn</code>s, and mark them <code>'ready'</code>.</p>`, `<p>Hint 2: then execute statements in order: let/const → set to <code>'ready'</code> in the current scope; use → walk up the parent chain and stop at the first scope that has the name; block/fn → recurse with a new child scope.</p>`, `<p>Hint 3: keep a global counter for labels (<code>'block' + (++id)</code>, <code>'fn' + (++id)</code>). A scope is <code>{ label, vars: Map, parent }</code>.</p>`],
    tests: { sig: 'string -> string', fn: 'sa', harness: { js: `function sa(json) {
  let prog;
  if (json === 'DEEP') { let inner = [['use', 'v'], ['use', 'g']]; for (let d = 100; d >= 1; d--) inner = d === 50 ? [['let', 'v'], ['block', inner]] : [['block', inner]]; prog = [['var', 'g']].concat(inner); }
  else if (json === 'LONG') { prog = []; for (let i = 0; i < 5000; i++) prog.push(['var', 'v' + i]); for (let i = 0; i < 5000; i++) prog.push(['use', 'v' + i]); }
  else prog = JSON.parse(json);
  const r = analyze(prog);
  return r.length > 100 ? { len: r.length, first: r[0], last: r[r.length - 1] } : r;
}` }, cases: [
      [["[[\"use\",\"a\"],[\"var\",\"a\"],[\"let\",\"b\"],[\"block\",[[\"use\",\"b\"],[\"let\",\"b\"],[\"use\",\"b\"],[\"var\",\"c\"]]],[\"use\",\"c\"],[\"fn\",[[\"use\",\"a\"],[\"var\",\"a\"],[\"use\",\"b\"],[\"use\",\"zz\"]]]]"],["a@global","TDZ:b","b@block1","c@global","a@fn2","b@global","ReferenceError:zz"]],
      [["[[\"fn\",[[\"block\",[[\"var\",\"x\"]]],[\"use\",\"x\"]]],[\"use\",\"x\"]]"],["x@fn1","ReferenceError:x"]],
      [["[[\"use\",\"x\"],[\"let\",\"x\"]]"],["TDZ:x"]],
      [["[[\"use\",\"x\"],[\"const\",\"x\"],[\"use\",\"x\"]]"],["TDZ:x","x@global"]],
      [["[[\"block\",[[\"let\",\"y\"]]],[\"use\",\"y\"]]"],["ReferenceError:y"]],
      [["[[\"var\",\"a\"],[\"fn\",[[\"use\",\"a\"]]]]"],["a@global"]],
      [["[[\"var\",\"a\"],[\"fn\",[[\"use\",\"a\"],[\"var\",\"a\"]]]]"],["a@fn1"]],
      [["[[\"block\",[[\"let\",\"a\"],[\"use\",\"a\"]]],[\"fn\",[[\"block\",[[\"let\",\"b\"],[\"use\",\"b\"]]]]]]"],["a@block1","b@block3"]],
      [["[[\"fn\",[[\"let\",\"z\"],[\"use\",\"z\"]]]]"],["z@fn1"]],
      [["[[\"block\",[[\"use\",\"a\"]]],[\"let\",\"a\"]]"],["TDZ:a"]],
      [["[]"],[]],
      [["[[\"block\",[[\"use\",\"v\"],[\"var\",\"v\"]]]]"],["v@global"]],
      [["[[\"block\",[[\"fn\",[[\"var\",\"q\"]]],[\"use\",\"q\"]]]]"],["ReferenceError:q"]],
      [["[[\"block\",[[\"block\",[[\"var\",\"deep\"]]]]],[\"use\",\"deep\"]]"],["deep@global"]],
      [["[[\"let\",\"a\"],[\"block\",[[\"let\",\"a\"],[\"block\",[[\"use\",\"a\"]]]]],[\"use\",\"a\"]]"],["a@block1","a@global"]],
      [["[[\"fn\",[[\"var\",\"a\"],[\"fn\",[[\"use\",\"a\"]]]]]]"],["a@fn1"]],
      [["[[\"use\",\"u\"]]"],["ReferenceError:u"]],
      [["DEEP"],["v@block49","g@global"]],
      [["LONG"],{"len":5000,"first":"v0@global","last":"v4999@global"}]
    ] },
    solution: {
      approach: `<p>Simulate the two phases for every scope: a creation pass (lexical names → TDZ; for function/global scopes, hoisted var names → ready) followed by an execution pass that initialises let/const on their line and resolves uses by walking the parent chain. This is exactly the engine's environment-record model.</p>`,
      code: { lang: 'js', run: true, code: `
function analyze(program) {
  const out = [];
  let id = 0;

  // var names declared anywhere in this function body, but not inside nested functions
  function collectVars(stmts, acc) {
    for (const st of stmts) {
      if (st[0] === 'var') acc.push(st[1]);
      else if (st[0] === 'block') collectVars(st[1], acc);
    }
    return acc;
  }

  function lookup(scope, name) {
    for (let s = scope; s; s = s.parent) {
      if (s.vars.has(name)) {
        return s.vars.get(name) === 'tdz' ? 'TDZ:' + name : name + '@' + s.label;
      }
    }
    return 'ReferenceError:' + name;
  }

  function run(stmts, kind, parent) {
    const label = kind === 'global' ? 'global' : kind + (++id);
    const scope = { label, vars: new Map(), parent };
    // ---- creation phase ----
    if (kind !== 'block') collectVars(stmts, []).forEach((n) => scope.vars.set(n, 'ready'));
    for (const st of stmts) if (st[0] === 'let' || st[0] === 'const') scope.vars.set(st[1], 'tdz');
    // ---- execution phase ----
    for (const st of stmts) {
      const [k, arg] = st;
      if (k === 'let' || k === 'const') scope.vars.set(arg, 'ready');
      else if (k === 'use') out.push(lookup(scope, arg));
      else if (k === 'block' || k === 'fn') run(arg, k, scope);
      // 'var' needs nothing at execution time in this model
    }
  }

  run(program, 'global', null);
  return out;
}

console.log(analyze([
  ['use', 'a'], ['var', 'a'], ['let', 'b'],
  ['block', [['use', 'b'], ['let', 'b'], ['use', 'b'], ['var', 'c']]],
  ['use', 'c'],
  ['fn', [['use', 'a'], ['var', 'a'], ['use', 'b'], ['use', 'zz']]]
]));
// [ 'a@global', 'TDZ:b', 'b@block1', 'c@global', 'a@fn2', 'b@global', 'ReferenceError:zz' ]

console.log(analyze([['fn', [['block', [['var', 'x']]], ['use', 'x']]], ['use', 'x']]));
// [ 'x@fn1', 'ReferenceError:x' ]  var escapes the block but not the function
` },
      dry: { head: ['statement', 'current scope', 'scope state', 'output'], rows: [['enter global', 'global', 'a:ready (var), b:tdz, c:ready (var in block)', '—'], ['use a', 'global', 'a ready', 'a@global'], ['let b', 'global', 'b ready', '—'], ['enter block1', 'block1', 'b:tdz (shadow)', '—'], ['use b', 'block1', 'b tdz → stop', 'TDZ:b'], ['use c (after block)', 'global', 'c ready', 'c@global']] },
      complexity: `<p>O(S · D) time for S statements and nesting depth D (each lookup walks ≤ D scopes) plus O(S) for var collection per function; O(S) memory.</p>`,
      followUps: ["Add <code>['assign', name]</code> with sloppy/strict implicit-global rules and const TypeErrors.", 'Report illegal redeclarations (let after var in the same function) as SyntaxError before running anything.', 'Add function declarations that are hoisted with their body.']
    }
  });

  practice.push({
    title: 'Tiny Reactive Signals with Closures', level: 'Hard', tags: ['closures', 'reactivity', 'observer'], companies: ['Vercel', 'Meta', 'Shopify'],
    statement: `<p>Modern frameworks (Solid, Preact Signals, Angular signals, Vue refs) are built on closures. Implement:</p><ul><li><code>createSignal(initial)</code> → <code>[read, write]</code>. <code>read()</code> returns the value; <code>write(v)</code> sets it and re-runs every effect that read it (skip if the value is unchanged per <code>Object.is</code>).</li><li><code>createEffect(fn)</code> → runs <code>fn</code> immediately and <b>automatically tracks</b> which signals it reads, re-running whenever any of them changes.</li><li><code>createMemo(fn)</code> → returns a read function for a derived value that updates automatically.</li></ul>`,
    constraints: `Up to 10<sup>3</sup> signals and effects. Effects must not be subscribed twice to the same signal. No library.`,
    example: `<p>const [count, setCount] = createSignal(1); const double = createMemo(() =&gt; count() * 2); createEffect(() =&gt; log('double is ' + double())); → logs ${H.c('g', 'double is 2')}. setCount(5) → logs ${H.c('g', 'double is 10')}. setCount(5) again → ${H.c('m', 'nothing (unchanged)')}.</p>`,
    brute: { why: `<p>Make every <code>write</code> re-run <b>all</b> effects ever created. Correct output, but unrelated effects re-run on every change (O(total effects) per write), and there is no way to know dependencies.</p>`,
      code: `
const allEffects = [];
function createSignalBrute(v) {
  return [() => v, (nv) => { v = nv; allEffects.forEach((e) => e()); }]; // re-run everything
}
function createEffectBrute(fn) { allEffects.push(fn); fn(); }` },
    mcq: { q: 'How does <code>read()</code> know which effect is reading it?', options: ['A module-level "currently running effect" variable, set by createEffect around the fn call and captured by read via closure scope', 'It parses the effect\'s source code', 'Through this', 'Via the call stack API'], answer: 0, explain: 'The tracking context is a variable in the shared outer (module) scope. createEffect sets it before running fn and restores it after; read() adds that effect to its own private subscriber Set.' },
    hints: [`<p>Hint 1: keep <code>let currentEffect = null</code> at module scope. Each signal closes over its own <code>value</code> and a private <code>Set</code> of subscribers.</p>`, `<p>Hint 2: <code>createEffect</code> wraps fn in a runner that saves the previous <code>currentEffect</code>, sets itself, runs fn in <code>try</code>, and restores in <code>finally</code> (supports nested effects).</p>`, `<p>Hint 3: <code>createMemo(fn)</code> = a private signal + an effect that writes <code>fn()</code> into it; return the signal's reader.</p>`],
    tests: { sig: 'string -> string', fn: 'sg', harness: { js: `function sg(kind) {
  const logs = [];
  switch (kind) {
    case 'demo': {
      const [count, setCount] = createSignal(1), [name, setName] = createSignal('Asha');
      const double = createMemo(() => count() * 2);
      createEffect(() => logs.push('double is ' + double())); createEffect(() => logs.push('hello ' + name()));
      setCount(5); setCount(5); setName('Ben'); return logs;
    }
    case 'immediate': { const [a] = createSignal(1); createEffect(() => logs.push('ran ' + a())); return logs; }
    case 'unchanged': { const [a, setA] = createSignal(1); createEffect(() => logs.push(a())); setA(1); setA(2); setA(2); return logs; }
    case 'nan-and-zero': { const [a, setA] = createSignal(NaN); createEffect(() => logs.push(String(Object.is(a(), -0) ? '-0' : a()))); setA(NaN); setA(0); setA(-0); setA(-0); return logs; }
    case 'double-read': { const [a, setA] = createSignal(1); createEffect(() => logs.push(a() + a())); setA(2); return logs; }
    case 'two-signals': { const [a, setA] = createSignal(1), [b, setB] = createSignal(10); createEffect(() => logs.push(a() + b())); setA(2); setB(20); return logs; }
    case 'chain': { const [a, setA] = createSignal(1); const m1 = createMemo(() => a() + 1), m2 = createMemo(() => m1() * 10); createEffect(() => logs.push(m2())); setA(2); setA(3); return logs; }
    case 'memo-filters': { const [a, setA] = createSignal(1); let runs = 0; const parity = createMemo(() => { runs++; return a() % 2; }); createEffect(() => logs.push('parity ' + parity())); setA(3); setA(5); setA(6); return [logs, runs]; }
    case 'memo-value': { const [a, setA] = createSignal(2); const sq = createMemo(() => a() * a()); const r = [sq()]; setA(5); r.push(sq()); return r; }
    case 'no-deps': { createEffect(() => logs.push('static')); return logs; }
    case 'write-returns': { const [a, setA] = createSignal(1); return [String(setA(2)), String(setA(2)), a()]; }
    case 'many-effects': { const [a, setA] = createSignal(0); let n = 0; for (let i = 0; i < 1000; i++) createEffect(() => { a(); n++; }); const before = n; setA(1); return [before, n]; }
    case 'independent-signals': { const [a, setA] = createSignal(1), [b, setB] = createSignal(1); createEffect(() => logs.push('a' + a())); createEffect(() => logs.push('b' + b())); setB(2); setA(2); return logs; }
    case 'effect-restores-context': { const [a, setA] = createSignal(1), [b, setB] = createSignal(1); createEffect(() => { a(); }); const m = createMemo(() => b()); createEffect(() => logs.push('m' + m())); setB(2); return logs; }
    case 'object-identity': { const o = {}, [s, setS] = createSignal(o); createEffect(() => logs.push('run')); createEffect(() => { s(); logs.push('read'); }); setS(o); setS({}); return logs; }
  }
}` }, cases: [
      [["demo"],["double is 2","hello Asha","double is 10","hello Ben"]],
      [["immediate"],["ran 1"]],
      [["unchanged"],[1,2]],
      [["nan-and-zero"],["NaN","0","-0"]],
      [["double-read"],[2,4]],
      [["two-signals"],[11,12,22]],
      [["chain"],[20,30,40]],
      [["memo-filters"],[["parity 1","parity 0"],4]],
      [["memo-value"],[4,25]],
      [["no-deps"],["static"]],
      [["write-returns"],["undefined","undefined",2]],
      [["many-effects"],[1000,2000]],
      [["independent-signals"],["a1","b1","b2","a2"]],
      [["effect-restores-context"],["m1","m2"]],
      [["object-identity"],["run","read","read"]]
    ] },
    solution: {
      approach: `<p>Three layers of closures: each signal privately owns its value and subscribers; a shared module-scope tracking variable tells <code>read</code> who is listening; each effect runner closes over its fn. Writes notify only subscribers (snapshot to avoid infinite iteration while effects re-subscribe).</p>`,
      code: { lang: 'js', run: true, code: `
let currentEffect = null; // shared tracking context (module scope)

function createSignal(initial) {
  let value = initial;
  const subscribers = new Set();
  const read = () => {
    if (currentEffect) subscribers.add(currentEffect); // auto-track the reader
    return value;
  };
  const write = (next) => {
    if (Object.is(next, value)) return;                // unchanged -> no work
    value = next;
    for (const effect of [...subscribers]) effect();   // snapshot
  };
  return [read, write];
}

function createEffect(fn) {
  const runner = () => {
    const prev = currentEffect;
    currentEffect = runner;
    try { fn(); } finally { currentEffect = prev; }
  };
  runner();
}

function createMemo(fn) {
  const [get, set] = createSignal(undefined);
  createEffect(() => set(fn()));
  return get;
}

const logs = [];
const [count, setCount] = createSignal(1);
const [name, setName] = createSignal('Asha');
const double = createMemo(() => count() * 2);
createEffect(() => logs.push('double is ' + double()));
createEffect(() => logs.push('hello ' + name()));

setCount(5);        // only the double effect re-runs
setCount(5);        // unchanged -> nothing
setName('Ben');     // only the name effect re-runs
console.log(logs);  // [ 'double is 2', 'hello Asha', 'double is 10', 'hello Ben' ]
` },
      dry: { head: ['action', 'signal changed', 'effects re-run', 'logs added'], rows: [['create effects', '—', 'both run once', 'double is 2, hello Asha'], ['setCount(5)', 'count → memo double', 'memo, double-effect', 'double is 10'], ['setCount(5)', 'none (Object.is)', 'none', '—'], ["setName('Ben')", 'name', 'name-effect', 'hello Ben']] },
      complexity: `<p>A write costs O(subscribers of that signal); reads O(1). Memory O(edges between signals and effects).</p>`,
      followUps: ['Dynamic dependencies: clear an effect\'s old subscriptions before each run (needs each runner to remember its sources).', 'Batch multiple writes so effects run once.', 'Why can stale subscriptions leak memory, and how do frameworks dispose effects?']
    }
  });

  practice.push({
    title: 'Deduplicate In-Flight Async Requests', level: 'Hard', tags: ['closures', 'promises', 'caching'], companies: ['Airbnb', 'Uber', 'Google'],
    statement: `<p>Ten components ask for <code>/user/1</code> at the same moment and you fire ten identical network requests. Write <code>dedupe(fetcher)</code> that returns <code>get(key)</code>: while a request for <code>key</code> is <b>in flight</b>, every caller receives the <b>same promise</b>. When it settles (success <b>or</b> failure) the entry is removed, so a later call fetches fresh data and failures can be retried.</p>`,
    constraints: `Up to 10<sup>4</sup> concurrent calls; fetcher returns a promise (or throws synchronously).`,
    example: `<p>get(1), get(1), get(2), get(1) at once → fetcher called ${H.c('g', '2')} times (1 and 2); all three get(1) callers share one promise. After it resolves, get(1) → fetcher called again (${H.c('b', '3')} total). A rejected request is ${H.c('r', 'not cached')}.</p>`,
    brute: { why: `<p>Cache the <b>resolved value</b> after it arrives: concurrent callers made before the first response still all miss and fire requests (the thundering-herd problem stays). Caching forever also serves stale data and caches errors.</p>`,
      code: `
function cacheValueBrute(fetcher) {
  const done = new Map();
  return async (key) => {
    if (done.has(key)) return done.get(key);
    const v = await fetcher(key); // concurrent callers all reach this line
    done.set(key, v);
    return v;
  };
}` },
    mcq: { q: 'Why store the <b>promise</b> in the Map before it resolves?', options: ['Callers arriving while the request is in flight can await the same promise instead of starting a new request', 'Promises are smaller than values', 'Maps cannot store objects', 'To make the request faster'], answer: 0, explain: 'The promise represents the in-flight work. Sharing it coalesces concurrent requests into one.' },
    hints: [`<p>Hint 1: the closure holds <code>const inFlight = new Map()</code> from key → promise.</p>`, `<p>Hint 2: if the key exists, return the stored promise. Otherwise create it with <code>Promise.resolve().then(() =&gt; fetcher(key))</code> so synchronous throws also become rejections.</p>`, `<p>Hint 3: chain <code>.finally(() =&gt; inFlight.delete(key))</code> and store <b>that</b> promise, so both success and failure clear the entry.</p>`],
    tests: { io: true, harness: { js: `function dedupeMain() {
  const flush = async () => { for (let i = 0; i < 10; i++) await null; };
  const deferred = () => { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; };
  const out = (...a) => console.log(...a);
  (async () => {
    const pending = new Map(); let calls = 0; const keysSeen = [];
    const fetcher = (key) => { calls++; keysSeen.push(String(key)); const d = deferred(); pending.set(key, d); return d.p; };
    const get = dedupe(fetcher);
    const p1 = get(1), p2 = get(1), p3 = get(2), p4 = get(1);
    out('same promise:', p1 === p2, p1 === p4, p1 === p3);
    await flush();
    out('calls in flight:', calls, keysSeen.join(','));
    const user1 = { id: 1 };
    pending.get(1).res(user1); pending.get(2).res({ id: 2 });
    const [a, b, c, d] = await Promise.all([p1, p2, p3, p4]);
    out('shared result:', a === user1, b === user1, d === user1, c.id);
    const p5 = get(1);
    await flush();
    out('refetch after settle:', calls, p5 === p1);
    pending.get(1).res({ id: 1 });
    await p5;
    const bad1 = get('bad'), bad2 = get('bad');
    await flush();
    pending.get('bad').rej(new Error('500'));
    const r = await Promise.allSettled([bad1, bad2]);
    out('rejections:', r.map((x) => x.status + ':' + (x.reason && x.reason.message)).join(','), bad1 === bad2);
    const before = calls;
    const retry = get('bad'); await flush();
    out('retry fetches again:', calls - before, retry === bad1);
    pending.get('bad').res('ok');
    out('retry value:', await retry);
    const sync = dedupe(() => { throw new Error('sync boom'); });
    let thrown = 'no';
    let pr; try { pr = sync('k'); } catch (e) { thrown = 'threw'; }
    out('sync throw is thrown?', thrown, pr instanceof Promise);
    const e1 = await pr.catch((e) => e.message);
    out('sync throw rejects:', e1);
    const types = []; const typed = dedupe((k) => { types.push(typeof k); return Promise.resolve(k); });
    await Promise.all([typed(1), typed('1'), typed(1), typed('1')]);
    out('keys 1 vs "1":', types.join(','));
    let big = 0; const bigGet = dedupe(() => { big++; return new Promise(() => {}); });
    const ps = []; for (let i = 0; i < 10000; i++) ps.push(bigGet(7));
    await flush();
    out('10000 callers:', big, ps.every((p) => p === ps[0]));
    const seenArgs = []; const argsGet = dedupe((k) => { seenArgs.push(k); return Promise.resolve(k); });
    await argsGet('abc');
    out('fetcher receives key:', seenArgs.join(','));
  })();
}
dedupeMain();` }, cases: [
      {"stdin":"","stdout":"same promise: true true false\ncalls in flight: 2 1,2\nshared result: true true true 2\nrefetch after settle: 3 false\nrejections: rejected:500,rejected:500 true\nretry fetches again: 1 false\nretry value: ok\nsync throw is thrown? no true\nsync throw rejects: sync boom\nkeys 1 vs \"1\": number,string\n10000 callers: 1 true\nfetcher receives key: abc\ncalls after burst: 2 | same object for 1: true | user2\ncalls after settle + refetch: 3\nrejected,rejected | calls: 4\nretry happened: 500 for bad | calls: 5"}
    ] },
    solution: {
      approach: `<p>Closure over a Map of in-flight promises (request coalescing — the same idea as Go's singleflight, DataLoader and SWR/React Query dedupe). Cleanup in <code>finally</code> means the cache only lives as long as the request.</p>`,
      code: { lang: 'js', run: true, code: `
function dedupe(fetcher) {
  const inFlight = new Map(); // key -> shared promise
  return function get(key) {
    if (inFlight.has(key)) return inFlight.get(key);
    const p = Promise.resolve()
      .then(() => fetcher(key))              // sync throws become rejections
      .finally(() => inFlight.delete(key));  // success OR failure clears the entry
    inFlight.set(key, p);
    return p;
  };
}

let calls = 0;
const fakeFetch = (id) => new Promise((resolve, reject) => {
  calls++;
  setTimeout(() => (id === 'bad' ? reject(new Error('500 for ' + id)) : resolve({ id, name: 'user' + id })), 10);
});
const getUser = dedupe(fakeFetch);

async function main() {
  const [a, b, c, d] = await Promise.all([getUser(1), getUser(1), getUser(2), getUser(1)]);
  console.log('calls after burst:', calls, '| same object for 1:', a === b && b === d, '|', c.name); // 2 true user2
  await getUser(1);
  console.log('calls after settle + refetch:', calls);       // 3
  const r = await Promise.allSettled([getUser('bad'), getUser('bad')]);
  console.log(r.map((x) => x.status).join(','), '| calls:', calls); // rejected,rejected | calls: 4
  await getUser('bad').catch((e) => console.log('retry happened:', e.message, '| calls:', calls)); // 5
}
main();
` },
      dry: { head: ['call', 'inFlight before', 'fetcher called?', 'inFlight after'], rows: [['get(1)', '{}', 'yes (#1)', '{1}'], ['get(1)', '{1}', 'no — shared', '{1}'], ['get(2)', '{1}', 'yes (#2)', '{1,2}'], ['(both settle)', '{1,2}', '—', '{}'], ['get(1) later', '{}', 'yes (#3)', '{1}']] },
      complexity: `<p>O(1) per call; memory O(number of distinct in-flight keys).</p>`,
      followUps: ['Add a short-lived result cache (stale-while-revalidate) on top.', 'Support cancellation with AbortController when all callers give up.', 'Batch different keys requested in the same tick into one request (DataLoader).']
    }
  });

  /* ======================================================================
     QUIZ — mostly "predict the output"
     ====================================================================== */
  quiz.push(
    { q: `What does this print?<pre>console.log(x);
var x = 5;</pre>`, options: ['<code>undefined</code>', '<code>5</code>', 'ReferenceError', 'TypeError'], answer: 0, explain: 'var x is created and set to undefined in the creation phase; the = 5 assignment only runs on line 2.' },
    { q: `What does this print?<pre>console.log(y);
let y = 5;</pre>`, options: ['ReferenceError: Cannot access \'y\' before initialization', '<code>undefined</code>', '<code>5</code>', 'ReferenceError: y is not defined'], answer: 0, explain: 'let y is hoisted (the binding exists) but stays uninitialised until its line runs — the temporal dead zone. The message is "before initialization", not "not defined".' },
    { q: `What happens?<pre>greet();
var greet = function () { console.log('hi'); };</pre>`, options: ['TypeError: greet is not a function', 'prints hi', 'ReferenceError', 'prints undefined'], answer: 0, explain: 'Only the var is hoisted (as undefined). Calling undefined throws TypeError. A function declaration would have worked.' },
    { q: `What does this print?<pre>console.log(typeof foo);
var foo = 'bar';
function foo() {}</pre>`, options: ['<code>"function"</code>', '<code>"string"</code>', '<code>"undefined"</code>', 'ReferenceError'], answer: 0, explain: 'In the creation phase the function declaration takes the name foo (functions win over a plain var declaration). The string is only assigned during execution, after this line.' },
    { q: `What does this print?<pre>for (var i = 0; i &lt; 3; i++) {
  setTimeout(() =&gt; console.log(i), 0);
}</pre>`, options: ['3 3 3', '0 1 2', '0 0 0', '2 2 2'], answer: 0, explain: 'One shared var i; the callbacks run after the loop, when i is 3. With let you get 0 1 2.' },
    { q: `What does this print?<pre>let a = 1;
{
  console.log(a);
  let a = 2;
}</pre>`, options: ['ReferenceError', '<code>1</code>', '<code>2</code>', '<code>undefined</code>'], answer: 0, explain: 'The inner let a exists from the start of the block and shadows the outer a, but it is in its TDZ at the console.log line.' },
    { q: `What does this print?<pre>const x = 'global';
function printX() { console.log(x); }
function caller() { const x = 'local'; printX(); }
caller();</pre>`, options: ['<code>global</code>', '<code>local</code>', '<code>undefined</code>', 'ReferenceError'], answer: 0, explain: 'Lexical scope: printX was written at the top level, so its scope chain is printX → global. Where it is called from does not matter.' },
    { q: `What does this print?<pre>var a = 1;
function f() {
  a = 2;
  return;
  function a() {}
}
f();
console.log(a);</pre>`, options: ['<code>1</code>', '<code>2</code>', '<code>[Function: a]</code>', 'ReferenceError'], answer: 0, explain: 'function a is hoisted inside f, creating a LOCAL binding a. The assignment a = 2 changes that local binding; the global a is untouched. The return does not prevent hoisting.' },
    { q: `What does this print (sloppy mode)?<pre>(function () {
  var a = b = 5;
})();
console.log(typeof a, typeof b);</pre>`, options: ['<code>undefined number</code>', '<code>number number</code>', '<code>undefined undefined</code>', 'ReferenceError'], answer: 0, explain: 'It parses as var a = (b = 5). a is local to the IIFE; b was never declared, so sloppy mode creates an implicit global b = 5. In strict mode this throws.' },
    { q: `What does this print?<pre>function makeCounter() { let n = 0; return () =&gt; ++n; }
const c1 = makeCounter();
const c2 = makeCounter();
c1(); c1();
console.log(c2());</pre>`, options: ['<code>1</code>', '<code>3</code>', '<code>2</code>', '<code>0</code>'], answer: 0, explain: 'Each makeCounter() call creates a new environment with its own n. c2 has never been called, so its first call returns 1.' },
    { q: `What does this print?<pre>const fns = [];
for (let i = 0; i &lt; 6; i++) {
  fns.push(() =&gt; i);
  i++;
}
console.log(fns.map((f) =&gt; f()));</pre>`, options: ['<code>[1, 3, 5]</code>', '<code>[0, 2, 4]</code>', '<code>[6, 6, 6]</code>', '<code>[0, 1, 2]</code>'], answer: 0, explain: 'Each iteration has its own i. The body increments that iteration\'s copy (0→1, 2→3, 4→5) after the closure was created; the closure reads the variable later, so it sees 1, 3, 5.' },
    { q: `What happens?<pre>function f(a = b, b = 2) { return a + b; }
console.log(f());</pre>`, options: ['ReferenceError (b is in its TDZ)', '<code>4</code>', '<code>NaN</code>', '<code>undefined</code>'], answer: 0, explain: 'Parameters are initialised left to right like let declarations. When a\'s default runs, b is not initialised yet. f(1) would work (a\'s default is not evaluated) and return 3.' },
    { q: 'Which top-level declaration in a classic browser <code>&lt;script&gt;</code> creates a property on <code>window</code>?', options: ['<code>var count = 0;</code>', '<code>let count = 0;</code>', '<code>const count = 0;</code>', '<code>class Count {}</code>'], answer: 0, explain: 'Top-level var and function declarations go into the global object record (window). let/const/class go into the global declarative record: visible everywhere but not window properties. In ES modules none of them touch window.' },
    { q: `This memoize sometimes recomputes. Which line is the bug?<pre>function memoize(fn) {
  const cache = {};
  return (n) =&gt; {
    if (cache[n]) return cache[n];   // line A
    return (cache[n] = fn(n));       // line B
  };
}</pre>`, options: ['Line A: falsy results (0, \'\', null, undefined) are never treated as cached', 'Line B: assignment expressions cannot be returned', 'The closure loses cache after the first call', 'const cache cannot be modified'], answer: 0, explain: 'Use an existence check (n in cache, or a Map with has()). Also prefer Map over {} to avoid keys like "__proto__" or "toString" colliding with Object.prototype.' },
    { q: `What does this print?<pre>console.log(typeof notDeclared);
console.log(typeof later);
let later = 1;</pre>`, options: ['<code>"undefined"</code>, then ReferenceError', '<code>"undefined"</code>, <code>"undefined"</code>', 'ReferenceError, then <code>"number"</code>', '<code>"undefined"</code>, <code>"number"</code>'], answer: 0, explain: 'typeof is forgiving only for names that are not declared anywhere. later is declared (with let) in this scope, so it is in its TDZ and typeof throws.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'What is scope in JavaScript, and what kinds of scope are there?', level: 'B',
      a: `<p><b>Scope</b> is the region of code where a variable can be seen and used. JavaScript has <b>global scope</b> (top level, visible everywhere), <b>function scope</b> (created on every call; holds parameters and <code>var</code>s), <b>block scope</b> (any <code>{ }</code>; holds <code>let</code>, <code>const</code>, <code>class</code>) and <b>module scope</b> (top level of an ES module, private to that file). Scopes nest: inner code can read outer variables, never the other way round. A good one-liner: <i>"scope decides which variables a line of code can see, and it is decided by where the code is written."</i></p>`,
      followUps: ['Is a <code>catch (e)</code> parameter block-scoped?', 'What scope does a top-level <code>let</code> in a classic script live in?', 'How is scope different from <code>this</code>?'] },
    { q: 'Compare <code>var</code>, <code>let</code> and <code>const</code>.', level: 'B',
      a: `<p><code>var</code> is <b>function-scoped</b>, can be re-declared, is hoisted and initialised to <code>undefined</code>, and at the top level of a classic script becomes a <code>window</code> property. <code>let</code> and <code>const</code> are <b>block-scoped</b>, cannot be re-declared in the same scope, are hoisted but stay in the <b>temporal dead zone</b> until their line runs, and never create <code>window</code> properties. <code>const</code> additionally cannot be re-assigned (TypeError) and must be initialised — but the object it points to can still be mutated. In loops, <code>let</code> gets a fresh binding per iteration, which fixes the closure-in-loop bug. Modern style: <code>const</code> by default, <code>let</code> when you re-assign, never <code>var</code>.</p>`,
      followUps: ['How do you make an object truly immutable? (<code>Object.freeze</code>, shallow)', 'Why does <code>for (const i = 0; i &lt; 3; i++)</code> fail but <code>for (const x of arr)</code> work?'] },
    { q: 'What is hoisting? Explain it in terms of execution contexts.', level: 'I',
      a: `<p>When JavaScript enters a scope (the script, or a function call) it creates an <b>execution context</b> in two phases. In the <b>creation phase</b> it scans for declarations: <code>var</code>s are created as <code>undefined</code>, function declarations are created with their full body, <code>let</code>/<code>const</code>/<code>class</code> are created but left uninitialised, and parameters/<code>arguments</code>/<code>this</code> are set up. In the <b>execution phase</b> it runs the code line by line, performing assignments. "Hoisting" is the observable effect: declarations behave as if moved to the top of their scope, while assignments stay where they are. Nothing in the source physically moves.</p>`,
      followUps: ['What wins when a <code>var</code> and a function declaration share a name?', 'Are <code>import</code> declarations hoisted?', 'What does a <code>var</code> inside <code>if (false)</code> do?'] },
    { q: 'What is the temporal dead zone? Are <code>let</code> and <code>const</code> hoisted?', level: 'I',
      a: `<p>Yes, they are hoisted: the binding is created when the enclosing block starts. But it is <b>not initialised</b> until the declaration line executes. The period in between is the <b>temporal dead zone</b>; any access — read, write or <code>typeof</code> — throws <code>ReferenceError: Cannot access 'x' before initialization</code>. It is "temporal" because it depends on <i>when</i> code runs: a function defined above the <code>let</code> can use the variable if it is <i>called</i> after the declaration. The TDZ exists to catch use-before-init bugs and to make <code>const</code> meaningful. Proof that let is hoisted: <code>let x = 1; { console.log(x); let x = 2; }</code> throws instead of printing 1.</p>`,
      followUps: ['Give three places where the TDZ shows up besides plain variables (default params, classes, switch cases, module cycles).', 'Why is <code>typeof</code> not safe in the TDZ?'] },
    { q: 'What exactly is a closure? Give a practical example.', level: 'I',
      a: `<p>A <b>closure</b> is a function bundled with references to the variables of the scope where it was created. Because JavaScript is lexically scoped, an inner function can use outer variables; when the inner function <b>outlives</b> the outer call (returned, stored, passed as a callback), the engine keeps that outer scope alive for it. Example: <code>function makeCounter() { let n = 0; return () =&gt; ++n; }</code> — each counter has its own private <code>n</code> that nothing else can touch. Practical uses: private state and the module pattern, function factories and partial application, <code>memoize</code>, <code>once</code>, <code>debounce</code>/<code>throttle</code>, event handlers and timers that remember context, and React hooks. Closures capture <b>variables</b> (live bindings), not snapshots of values.</p>`,
      followUps: ['Do two closures created in the same call share variables?', 'How do closures relate to the module pattern?', 'Is every function in JavaScript a closure?'] },
    { q: 'Explain the "setTimeout inside a for loop prints 3 3 3" problem and every way to fix it.', level: 'I',
      a: `<p>With <code>for (var i = 0; i &lt; 3; i++) setTimeout(() =&gt; console.log(i))</code> there is <b>one</b> function-scoped <code>i</code>. All three callbacks close over that same variable and run after the loop finishes, when <code>i</code> is 3. Fixes: (1) <code>let i</code> — the loop creates a new binding per iteration; (2) an IIFE <code>(function (j) { setTimeout(() =&gt; console.log(j)); })(i)</code> — each call gets its own parameter; (3) pass the value as an argument: <code>setTimeout(console.log, 0, i)</code> or <code>.bind(null, i)</code>; (4) use <code>forEach</code>/<code>map</code>, whose callback parameter is fresh per element. The root cause is the shared binding, not asynchrony: an array of functions built in the loop shows the same bug.</p>`,
      followUps: ['What prints if the delay is <code>i * 1000</code>?', 'Does a <code>while</code> loop with an outer <code>let</code> counter have the bug?', 'How does Babel compile a let-loop to ES5?'] },
    { q: 'What is lexical scope, and how is the scope chain different from the call stack?', level: 'I',
      a: `<p><b>Lexical scope</b> means a function's accessible variables are determined by <b>where it is written</b> in the source. Each scope has an outer link to the scope that encloses it textually; following those links gives the <b>scope chain</b>, which is used to resolve names (first match wins). The <b>call stack</b> records which function called which at run time and where to return. They are independent: if <code>printX</code> is defined globally and called from inside <code>caller</code>, the call stack is global → caller → printX, but printX's scope chain is printX → global — so it cannot see caller's locals. A dynamically scoped language (like Bash) would resolve via the call stack instead.</p>`,
      followUps: ['Which features can modify lexical scope at run time? (sloppy <code>eval</code>, <code>with</code>)', 'Where is the outer link stored? (<code>[[Environment]]</code> of the function object)'] },
    { q: 'What do "x is not defined", "Cannot access \'x\' before initialization", "Assignment to constant variable" and "x is not a function" each tell you?', level: 'I',
      a: `<p><b>ReferenceError: x is not defined</b> — the scope-chain lookup found no binding at all (typo, missing import, wrong scope). <b>ReferenceError: Cannot access 'x' before initialization</b> — the binding exists (<code>let</code>/<code>const</code>/<code>class</code>) but is still in its TDZ (ordering problem, often shadowing or a module import cycle). <b>TypeError: Assignment to constant variable</b> — you re-assigned a <code>const</code> binding. <b>TypeError: x is not a function</b> — the name resolved, but its value is not callable, classically a hoisted <code>var x = function…</code> called too early (value <code>undefined</code>). Reading the exact message tells you which phase went wrong.</p>`,
      followUps: ['Which of these can <code>typeof</code> avoid?', 'How would you debug a TDZ error that only happens in the production bundle?'] },
    { q: 'How can closures cause memory leaks, and how do you find them?', level: 'A',
      a: `<p>A closure keeps its captured environment reachable for as long as the function itself is reachable. Leaks happen when a long-lived owner (a global event listener, a <code>setInterval</code>, a module-level cache or memoize table, an emitter, a never-settled promise) holds a closure that captures something big (DOM nodes, large arrays, request objects). In V8, closures created in the same scope share one context object, so a tiny closure can keep a big variable alive because a sibling closure used it. To find leaks: take heap snapshots in Chrome DevTools before/after repeating an action, compare, and follow the <b>Retainers</b> path to the <code>(closure)</code> and <code>context</code> holding the object; use the Allocation timeline; in Node use <code>--inspect</code> or <code>v8.writeHeapSnapshot()</code>. Fixes: remove listeners (or use <code>AbortController</code> signals), clear timers, bound caches (LRU/TTL/WeakMap), and null out references you no longer need.</p>`,
      followUps: ['What is a detached DOM node and how does a closure keep it alive?', 'When does a <code>WeakMap</code> help and when does it not?'] },
    { q: 'Implement <code>memoize</code> and discuss its pitfalls.', level: 'A',
      a: `<p>Core: <code>function memoize(fn) { const cache = new Map(); return function (...args) { const key = args.length === 1 ? args[0] : JSON.stringify(args); if (!cache.has(key)) cache.set(key, fn.apply(this, args)); return cache.get(key); }; }</code>. Pitfalls: only valid for <b>pure</b> functions; use <code>has()</code> not truthiness (falsy results); <code>JSON.stringify</code> keys conflate different objects with equal content and drop <code>undefined</code>/functions — use nested Maps/WeakMaps for identity keys; plain-object caches collide with prototype keys; forward <code>this</code>; recursive functions must call the memoized version; unbounded caches leak memory (add LRU/TTL); for async functions cache the promise and evict on rejection.</p>`,
      followUps: ['Make it O(1) LRU with a Map.', 'How does React\'s <code>useMemo</code> differ from a general memoize?', 'How would you memoize an async function?'] },
    { q: 'How does <code>let</code> actually create a new binding for each loop iteration?', level: 'A',
      a: `<p>The spec's <code>ForBodyEvaluation</code> calls <b>CreatePerIterationEnvironment</b> before the first iteration and at the end of each iteration: it creates a new declarative environment, copies the current values of the loop's <code>let</code> bindings into it, and makes it current — and only <i>then</i> runs the increment and test. So the increment acts on the next iteration's copy, and closures created in the body keep the previous one. Consequences: modifying <code>i</code> inside the body carries forward to the next iteration; a closure created in the <b>initialiser</b> captures the very first environment; <code>for...of/in</code> with <code>let</code>/<code>const</code> also create a fresh binding per iteration; <code>while</code> loops do not. Engines only allocate these environments when something captures the variable.</p>`,
      followUps: ['What does <code>for (let i = 0, f = () =&gt; i; i &lt; 3; i++)</code> make <code>f()</code> return at the end?', 'Why does <code>for (const i = 0; …; i++)</code> throw only after the first iteration?'] },
    { q: 'What is an IIFE and the module pattern? Are they still relevant with ES modules?', level: 'A',
      a: `<p>An <b>IIFE</b> (Immediately Invoked Function Expression), <code>(function () { … })()</code>, creates a private scope and runs once. The <b>module pattern</b> returns an object of closures from an IIFE, exposing a public API while keeping state and helpers private — this was how libraries (jQuery plugins, early app code) avoided polluting the global scope before ES2015. ES modules now provide file-level private scope, explicit <code>import</code>/<code>export</code>, live bindings, singleton evaluation and static analysis for tree-shaking, so new code uses modules. IIFEs still appear in bundler output (each module wrapped in a function), in UMD builds, in inline scripts, and for one-off async setup: <code>(async () =&gt; { … })()</code> where top-level await is unavailable.</p>`,
      followUps: ['Why is the leading parenthesis needed in an IIFE?', 'What is the "revealing module pattern"?'] },
    { q: 'How does V8 implement closures, and what are the performance and memory implications?', level: 'E',
      a: `<p>During parsing, V8 performs scope analysis and marks variables that are referenced by inner functions as <b>context-allocated</b>; all others live in registers/stack slots. For each scope that has captured variables, a heap-allocated <b>Context</b> object is created when the scope is entered, linked to its parent context. A closure is a JSFunction pointing to its SharedFunctionInfo (code) and to the current Context. Accessing a captured variable is a fixed number of hops plus a slot load (resolved at compile time). Implications: (1) creating closures allocates (function object, maybe a context) — fine normally, measurable in hot loops; (2) all closures created in one scope share one context, so one closure can retain variables only another uses; (3) <code>eval</code> or <code>with</code> forces everything to be context-allocated and blocks optimisations; (4) the debugger may show captured-but-unused variables as "optimized away".</p>`,
      followUps: ['How would you restructure code so a small callback does not retain a large buffer?', 'What is the difference between a Context and a FunctionContext/BlockContext?'] },
    { q: 'Our production bundle throws "Cannot access \'Config\' before initialization" but dev works. How do you debug it?', level: 'E',
      a: `<p>This is a <b>module-level TDZ</b>, almost always from an <b>import cycle</b>: module A imports B, B (directly or transitively) imports A, and B's top-level code reads A's exported <code>const</code>/<code>class</code> before A finished evaluating. Dev and prod differ because bundlers can reorder or concatenate modules (scope hoisting) and dev servers may load modules differently. Steps: read the stack to find the module that reads <code>Config</code> at load time; run a cycle detector (<code>madge --circular</code>, eslint-plugin-import <code>no-cycle</code>, or the bundler's circular warnings); then break the cycle — move shared values into a leaf module, read the value lazily inside a function instead of at module top level, or invert the dependency. Changing <code>const</code> to <code>var</code> only hides it as <code>undefined</code>.</p>`,
      followUps: ['Why do function declarations survive cycles while classes do not?', 'How does CommonJS behave differently in a cycle? (partial <code>exports</code> object)'] },
    { q: 'What is a "stale closure" in React, and how do you fix it?', level: 'E',
      a: `<p>Every render of a function component is a new call, so every render creates new <code>props</code>/<code>state</code> bindings and new handler/effect closures over them. A closure created in one render keeps that render's values forever. Classic bug: <code>useEffect(() =&gt; { const id = setInterval(() =&gt; setCount(count + 1), 1000); return () =&gt; clearInterval(id); }, [])</code> — the interval callback closes over the first render's <code>count</code> (0), so the count gets stuck at 1. Fixes: functional updates (<code>setCount(c =&gt; c + 1)</code>), correct dependency arrays (let the effect re-subscribe), a <code>useRef</code> holding the latest value, or React's <code>useEffectEvent</code> for event-like logic. The ESLint <code>react-hooks/exhaustive-deps</code> rule exists precisely to catch stale closures.</p>`,
      followUps: ['Why is the empty dependency array the usual culprit?', 'How do signals-based frameworks avoid this class of bug?'] }
  );

  /* Spread correct answers across positions (options were authored with the right one first).
     Deterministic rotation, so the page is identical on every load. */
  var mcqCounter = 0;
  function spread(m) {
    if (!m || !m.options || m.options.length < 2) return;
    var n = m.options.length, k = (mcqCounter * 7 + 2) % n;
    mcqCounter++;
    var correct = m.options[m.answer];
    m.options = m.options.slice(k).concat(m.options.slice(0, k));
    m.answer = m.options.indexOf(correct);
  }
  quiz.forEach(spread);
  topics.forEach(function (t) { (t.problems || []).forEach(function (p) { spread(p.mcq); }); });
  practice.forEach(function (p) { spread(p.mcq); });

  /* ======================================================================
     MODULE REGISTRATION
     ====================================================================== */
  registerModule({
    id: 'js04',
    title: 'Scope, Hoisting, TDZ & Closures',
    intro: `<p>Almost every tricky JavaScript interview question — "what does this print?", "why does my loop log 3, 3, 3?", "write <code>once</code> / <code>memoize</code>", "why is my React handler seeing old state?" — comes down to four ideas: <b>scope</b> (which variables a line can see), <b>hoisting</b> (what the engine sets up before your code runs), the <b>temporal dead zone</b> (why <code>let</code>/<code>const</code> throw when touched too early) and <b>closures</b> (functions that remember the variables around them).</p>
      <p>In this module you will build a mental model of how the engine really works: the <b>creation phase</b> vs the <b>execution phase</b> of every execution context, the <b>scope chain</b> as a linked list of environment boxes, and closures as functions holding a pointer to their birth environment. Every topic has a step-by-step visualizer, lots of runnable "predict the output" puzzles, and practice problems that turn closures into real tools: counters, <code>memoize</code>, <code>once</code>, the module pattern, event emitters and LRU caches. You will finish able to explain the closure-in-loop bug four different ways and fix it in four different ways.</p>`,
    goals: [
      'Say exactly which scope (global, module, function, block) any <code>var</code>, <code>let</code>, <code>const</code>, <code>function</code> or <code>class</code> lives in, and spot accidental globals and illegal shadowing',
      'Resolve any identifier by walking the lexical scope chain, and explain why JavaScript scope is lexical, not dynamic',
      'Simulate the creation phase and execution phase of an execution context and predict the output of hoisting puzzles (var vs function, same-name declarations, function expressions)',
      'Explain the temporal dead zone precisely ("time, not position"), including default parameters, <code>typeof</code>, classes, <code>switch</code> cases and module import cycles',
      'Describe a closure as "function + its outer environment", predict live-binding behaviour, and build counters, <code>memoize</code>, <code>once</code>, the module pattern and factories from scratch',
      'Explain the closure-in-loop bug step by step and fix it with <code>let</code>, an IIFE, <code>forEach</code> or <code>bind</code>, while knowing the memory cost of closures in production'
    ],
    prereqs: `JS 1 (Basics: Syntax, Types &amp; Operators), JS 2 (Functions, Arrays &amp; Objects) and JS 3 (Runtimes: Browser vs Node). You should be comfortable writing functions, arrow functions and loops, and running a snippet in Node or the browser console. <code>this</code> is NOT needed — it is a separate topic (JS 5).`,
    hours: 10,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
