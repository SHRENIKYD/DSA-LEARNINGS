(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (js02) ---------- */
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // JS-console-like text for a value: strings quoted, arrays/objects printed shallowly.
  function show(v, depth) {
    depth = depth || 0;
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    if (typeof v === 'string') return "'" + v + "'";
    if (typeof v === 'function') return 'ƒ ' + (v.name || 'anonymous');
    if (typeof v === 'number' && isNaN(v)) return 'NaN';
    if (Array.isArray(v)) return depth > 2 ? '[…]' : '[' + v.map(function (x) { return show(x, depth + 1); }).join(', ') + ']';
    if (v && v.__tdz) return '‹TDZ: not initialised›';
    if (v && v.__fn) return 'ƒ ' + v.__fn;
    if (typeof v === 'object') {
      if (depth > 2) return '{…}';
      var ks = Object.keys(v);
      return '{ ' + ks.map(function (k) { return k + ': ' + show(v[k], depth + 1); }).join(', ') + (ks.length ? ' }' : '}');
    }
    return String(v);
  }
  // Code part with highlighted lines. lines: number | {line: cls}
  function cp(code, lines, cls, label) {
    var hl = {};
    if (typeof lines === 'number') hl[lines] = cls || 'cur';
    else if (lines && typeof lines === 'object') hl = lines;
    return { type: 'code', label: label || 'JavaScript (current line highlighted)', lang: 'js', code: code, hl: hl };
  }
  // vars part; values converted with show(); hlKeys = 'a,b'
  function vp(obj, hlKeys, cls, label) {
    var vals = {}, hl = {};
    Object.keys(obj).forEach(function (k) { vals[k] = show(obj[k]); });
    if (hlKeys) String(hlKeys).split(',').forEach(function (k) { hl[k] = cls || 'ok'; });
    return { type: 'vars', label: label || 'Variables', vals: vals, hl: hl };
  }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function ap(label, values, hl, ptr, extra) {
    var p = { type: 'array', label: label, values: values.map(function (x) { return show(x); }), hl: hl || {}, ptr: ptr || {} };
    if (extra) Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
    return p;
  }
  function stk(items, label) {
    var hl = {};
    if (items.length) hl[items.length - 1] = 'cur';
    return { type: 'stack', label: label || 'Call stack (top = running now)', items: items.slice(), hl: hl };
  }
  function nums(input, min, max, hint) {
    var a = String(input === undefined ? '' : input).trim().split(/[\s,]+/).filter(function (x) { return x.length; }).map(Number);
    if (a.length < (min || 1) || a.some(function (x) { return !isFinite(x); })) throw new Error(hint || 'Enter numbers separated by spaces, e.g. 3 8 1 12');
    if (a.length > (max || 10)) throw new Error('Please use at most ' + (max || 10) + ' numbers so the animation stays readable');
    return a;
  }
  function words(input, min, max, hint) {
    var a = String(input === undefined ? '' : input).trim().split(/[\s,]+/).filter(function (x) { return x.length; });
    if (a.length < (min || 1)) throw new Error(hint || 'Enter words separated by spaces');
    if (a.length > (max || 10)) throw new Error('Please use at most ' + (max || 10) + ' words');
    a.forEach(function (w) { if (w.length > 14) throw new Error('Keep each word at most 14 characters'); });
    return a;
  }
  // Parse a JS-ish literal token: numbers, undefined, null, true/false, 'str' / "str", bare word → string.
  function lit(t) {
    t = String(t).trim();
    if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
    if (t === 'undefined') return undefined;
    if (t === 'null') return null;
    if (t === 'true') return true;
    if (t === 'false') return false;
    if (/^'.*'$/.test(t) || /^".*"$/.test(t)) return t.slice(1, -1);
    return t;
  }

  /* ================= TOPIC 1: Functions — declarations, expressions, arrows ================= */
  topics.push({
    title: 'Functions: Declarations, Expressions & Arrow Functions',
    analogy: `<p>A function is a <b>recipe card</b> in your kitchen drawer. Writing the card does not cook anything — it just stores the steps. Cooking happens only when someone says <i>"make pancakes with 2 eggs"</i> (that is <b>calling</b> the function with <b>arguments</b>). The card can be written in three handwriting styles — a full formal card (<b>declaration</b>), a card stuck onto a labelled jar (<b>expression</b> stored in a variable), or a quick sticky note (<b>arrow function</b>). Same idea, different shapes, and a few small but important differences in behaviour.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A function is a named, reusable block of code. You <b>define</b> it once and <b>call</b> it as many times as you like. It can take inputs (<b>parameters</b>) and hand back one output with <code>return</code>. If you never write <code>return</code> (or write a bare <code>return;</code>), the function gives back <code>undefined</code>.</p>
<p><b>Three ways to write the same function:</b></p>
${H.table(['Style', 'Looks like', 'Hoisted? (usable before its line)', 'Own <code>this</code> / <code>arguments</code>?'], [
  ['Declaration', '<code>function add(a, b) { return a + b; }</code>', '<span class="c-g">Yes — whole function</span>', 'Yes'],
  ['Expression', '<code>const add = function (a, b) { return a + b; };</code>', '<span class="c-r">No — the variable is in the TDZ until that line</span>', 'Yes'],
  ['Arrow', '<code>const add = (a, b) =&gt; a + b;</code>', '<span class="c-r">No</span>', '<span class="c-y">No — borrows them from outside</span>']
])}
<p><b>Arrow function shortcuts.</b> One parameter → brackets optional: <code>n =&gt; n * 2</code>. One expression → braces and <code>return</code> optional (an <b>implicit return</b>). If you use braces, you must write <code>return</code> yourself. To return an object literal directly, wrap it in brackets: <code>() =&gt; ({ ok: true })</code> — without them the braces are read as a code block.</p>
<p><b>Functions are values</b> ("first-class"). You can store them in variables, put them in arrays and objects, pass them to other functions (a <b>callback</b>) and return them from functions. A function that takes or returns a function is called a <b>higher-order function</b> — <code>map</code>, <code>filter</code>, <code>setTimeout</code> and <code>addEventListener</code> are all higher-order.</p>
<p><b>Calling</b> runs the body: JavaScript pushes a new <b>frame</b> onto the <b>call stack</b> (a to-do pile of "functions currently running"), creates fresh local variables, runs the lines, then pops the frame and hands the return value back to whoever called it.</p>
<p><b>Which one should I use?</b> Modern code uses <b>declarations</b> for named top-level helpers (readable, hoisted), <b>arrows</b> for short callbacks (<code>items.map(x =&gt; x.id)</code>), and <b>method shorthand</b> inside objects and classes (<code>{ greet() { … } }</code>) — because arrows do not get their own <code>this</code>.</p>`,
    clues: [
      '"pass a function as an argument" / "callback" / "higher-order function" → functions are first-class values',
      '"why can I call this function before it is defined but not that one?" → declaration hoisting vs expression/arrow in the TDZ',
      '"returns undefined" in an arrow with braces → missing <code>return</code> (implicit return only works without braces)',
      '"return an object from an arrow" → wrap it: <code>() =&gt; ({ … })</code>',
      '"arrow function as an object method prints undefined" → arrows have no own <code>this</code>',
      '"lookup table of operations" / "strategy" / "replace a long switch" → object or Map of functions',
      '"IIFE" / "run once immediately" → <code>(function () { … })()</code> or <code>(() =&gt; { … })()</code>'
    ],
    code: [{ lang: 'js', run: true, title: 'Three function styles side by side (runnable)', code: `// 1) Function DECLARATION: hoisted, so this call works even above the definition.
console.log('declaration:', add(2, 3)); // 5

function add(a, b) {
  const sum = a + b; // 'sum' is local: it only exists while add() runs
  return sum;        // hands 5 back to the caller
}

// 2) Function EXPRESSION: a function value stored in a variable.
const square = function (n) {
  return n * n;
};

// 3) ARROW function: shortest form; one expression = implicit return.
const double = n => n * 2;

// Arrow with braces needs an explicit return.
const triple = n => { return n * 3; };

// Arrow returning an object literal: wrap in ( ) or JS thinks { } is a block.
const makePoint = (x, y) => ({ x, y });

console.log('expression:', square(4));     // 16
console.log('arrow:', double(5));          // 10
console.log('arrow + braces:', triple(5)); // 15
console.log('object:', makePoint(1, 2));   // { x: 1, y: 2 }

// Nesting: the innermost call runs first.
console.log('nested:', double(square(add(1, 2)))); // add→3, square→9, double→18

// No return statement → undefined
function noReturn() { const x = 1; }
console.log('no return gives:', noReturn()); // undefined` },
    { lang: 'js', run: true, title: 'Functions are values: callbacks, arrays of functions, returning functions', code: `// A higher-order function: takes another function as a parameter.
function applyTwice(fn, value) {
  return fn(fn(value));
}
console.log(applyTwice(n => n + 10, 1)); // 21

// Functions stored in an array and an object.
const steps = [s => s.trim(), s => s.toLowerCase(), s => s.replaceAll(' ', '-')];
let slug = '  Hello World Again ';
for (const step of steps) slug = step(slug);
console.log(slug); // hello-world-again

// A function that RETURNS a function (a "factory").
function makeGreeter(greeting) {
  return name => greeting + ', ' + name + '!';
}
const hi = makeGreeter('Hi');
const namaste = makeGreeter('Namaste');
console.log(hi('Asha'), '|', namaste('Ben'));

// Every function is an object with useful properties.
function area(width, height = 1) { return width * height; }
console.log(area.name, area.length); // 'area' 1  (length stops at the first default)
console.log(typeof area);            // 'function'

// IIFE: define and run immediately (old-school way to make a private scope).
const counterStart = (function () {
  const secret = 42;
  return secret / 2;
})();
console.log('IIFE result:', counterStart); // 21` }],
    codeTitle: ['Declaration vs expression vs arrow', 'First-class functions'],
    viz: [{
      title: 'Call stack & local variables while functions run',
      input: '2 3',
      inputLabel: 'Two numbers passed to add(A, B)',
      gen: function (input) {
        var v = nums(input, 2, 2, 'Enter exactly two numbers, e.g. 2 3');
        var A = v[0], B = v[1];
        if (Math.abs(A) > 999 || Math.abs(B) > 999) throw new Error('Keep both numbers between -999 and 999');
        var code = ['console.log(add(' + A + ', ' + B + '));   // called above its definition', 'function add(a, b) {', '  const sum = a + b;', '  return sum;', '}', 'const square = function (n) { return n * n; };', 'const double = (n) => n * 2;', 'const r = double(square(add(' + A + ', ' + B + ')));', 'console.log(r);'].join('\n');
        var S = A + B, Q = S * S, D = Q * 2, f = [];
        var TDZ = { __tdz: true }, fnAdd = { __fn: 'add(a, b)' };
        f.push(fr('<b>Before line 1 runs</b>, JavaScript scans the file (the "creation phase"). The <b>declaration</b> <code>add</code> is hoisted with its whole body, so it is ready. <code>square</code>, <code>double</code> and <code>r</code> are <code>const</code>: they exist but sit in the <b>Temporal Dead Zone</b> — touching them now would throw.', [cp(code, { 2: 'ok', 6: 'bad', 7: 'bad', 8: 'bad' }), vp({ add: fnAdd, square: TDZ, double: TDZ, r: TDZ }, 'add', 'ok', 'Global variables'), stk(['global'])]));
        f.push(fr('Line 1 calls <code>add(' + A + ', ' + B + ')</code>. It works even though the definition is lower down — that is hoisting. A new <b>frame</b> is pushed on the call stack and the arguments are copied into the parameters <code>a</code> and <code>b</code>.', [cp(code, { 1: 'cur', 2: 'ok' }), vp({ a: A, b: B }, 'a,b', 'ok', 'Local variables of add()'), stk(['global', 'add(' + A + ', ' + B + ')'])]));
        f.push(fr('Line 3: <code>const sum = a + b</code> → <b>' + S + '</b>. <code>sum</code> lives only inside this call; it disappears when the frame is popped.', [cp(code, 3), vp({ a: A, b: B, sum: S }, 'sum', 'ok', 'Local variables of add()'), stk(['global', 'add(' + A + ', ' + B + ')'])]));
        f.push(fr('Line 4: <code>return sum</code> hands <b>' + S + '</b> back. The frame is popped (locals gone) and <code>console.log</code> prints <b>' + S + '</b>.', [cp(code, 4, 'ok'), tx('<b>Console:</b> <code>' + S + '</code>', 'Output'), stk(['global'])]));
        f.push(fr('Line 6: a <b>function expression</b> is created and stored in <code>square</code>. Only now does <code>square</code> leave the TDZ.', [cp(code, 6, 'ok'), vp({ add: fnAdd, square: { __fn: 'anonymous → named "square"' }, double: TDZ, r: TDZ }, 'square', 'ok', 'Global variables'), stk(['global'])]));
        f.push(fr('Line 7: an <b>arrow function</b> is stored in <code>double</code>. No braces → its single expression <code>n * 2</code> is returned automatically.', [cp(code, 7, 'ok'), vp({ add: fnAdd, square: { __fn: 'square(n)' }, double: { __fn: 'double(n) (arrow)' }, r: TDZ }, 'double', 'ok', 'Global variables'), stk(['global'])]));
        f.push(fr('Line 8: nested calls run <b>inside-out</b>. First <code>add(' + A + ', ' + B + ')</code> is pushed and returns <b>' + S + '</b>.', [cp(code, 8), vp({ a: A, b: B, sum: S }, 'sum', 'ok', 'Locals of the running call'), stk(['global', 'add(' + A + ', ' + B + ')'])]));
        f.push(fr('Next <code>square(' + S + ')</code> is pushed: <code>n * n</code> = <b>' + Q + '</b>.', [cp(code, { 6: 'cur', 8: 'win' }), vp({ n: S }, 'n', 'ok', 'Locals of square()'), stk(['global', 'square(' + S + ')'])]));
        f.push(fr('Then <code>double(' + Q + ')</code> is pushed: <code>n * 2</code> = <b>' + D + '</b>. Each call got its own fresh <code>n</code> — they never clash.', [cp(code, { 7: 'cur', 8: 'win' }), vp({ n: Q }, 'n', 'ok', 'Locals of double()'), stk(['global', 'double(' + Q + ')'])]));
        f.push(fr('All frames popped. <code>r</code> is initialised with <b>' + D + '</b> and line 9 prints it. The call stack is back to just the global frame.', [cp(code, 9, 'ok'), vp({ add: fnAdd, square: { __fn: 'square(n)' }, double: { __fn: 'double(n) (arrow)' }, r: D }, 'r', 'sel', 'Global variables'), tx('<b>Console:</b><br><code>' + S + '</code><br><code>' + D + '</code>', 'Output'), stk(['global'])]));
        return f;
      }
    }, {
      title: 'Hoisting showdown: which call survives?',
      gen: function () {
        var code = ['sayHi();            // ?', 'sayBye();           // ?', 'shout();            // ?', '', 'function sayHi() { console.log("hi"); }', 'var sayBye = function () { console.log("bye"); };', 'const shout = () => console.log("HEY");'].join('\n');
        return [
          fr('Three functions, three styles, each called <b>before</b> its definition line. Before running, JavaScript hoists names: declaration → whole function; <code>var</code> → <code>undefined</code>; <code>const</code> → TDZ.', [cp(code, { 5: 'ok', 6: 'cur', 7: 'bad' }), vp({ sayHi: { __fn: 'sayHi()' }, sayBye: undefined, shout: { __tdz: true } }, 'sayHi', 'ok', 'After the creation phase')]),
          fr('Line 1: <code>sayHi()</code> — the declaration was hoisted with its body → prints <b>hi</b>.', [cp(code, 1, 'ok'), tx('<b>Console:</b> <code>hi</code>', 'Output')]),
          fr('Line 2: <code>sayBye</code> is a <code>var</code> holding <code>undefined</code> right now. Calling <code>undefined()</code> → <span class="c-r">TypeError: sayBye is not a function</span>. Execution stops here.', [cp(code, 2, 'bad'), vp({ sayBye: undefined }, 'sayBye', 'bad', 'Value at this moment')]),
          fr('If we deleted line 2, line 3 would fail differently: <code>shout</code> is in the TDZ → <span class="c-r">ReferenceError: Cannot access \'shout\' before initialization</span>.', [cp(code, 3, 'bad'), vp({ shout: { __tdz: true } }, 'shout', 'bad', 'Value at this moment')]),
          fr('<b>Lesson:</b> only <b>declarations</b> are safe to call early. Different error types tell you which mistake you made: <b>TypeError</b> (var → undefined) vs <b>ReferenceError</b> (let/const in TDZ).', [tx('<table><tr><th>Style</th><th>Early call</th></tr><tr><td>function declaration</td><td class="c-g">works</td></tr><tr><td>var + function expression</td><td class="c-r">TypeError</td></tr><tr><td>const/let + expression/arrow</td><td class="c-r">ReferenceError</td></tr></table>', 'Summary')])
        ];
      }
    }],
    examples: [
      { title: 'Predict the output: implicit vs explicit return', html: `<p>Two arrows look almost the same. One has braces, so it needs <code>return</code>; without it you get <code>undefined</code>. The third returns an object — it needs brackets around the braces.</p>${H.table(['Call', 'Result', 'Why'], [['<code>a(2)</code>', '<span class="c-g">4</span>', 'no braces → implicit return'], ['<code>b(2)</code>', '<span class="c-r">undefined</span>', 'braces, no return'], ['<code>c()</code>', '<span class="c-r">undefined</span>', '<code>{ ok: true }</code> parsed as a block with a label <code>ok:</code>'], ['<code>d()</code>', '<span class="c-g">{ ok: true }</span>', 'brackets make it an object expression']])}`, code: { lang: 'js', run: true, code: `const a = n => n * 2;
const b = n => { n * 2 };          // block body, no return
const c = () => { ok: true };      // 'ok:' is a LABEL inside a block!
const d = () => ({ ok: true });    // object literal
console.log(a(2), b(2), c(), d()); // 4 undefined undefined { ok: true }` } },
      { title: 'Callbacks: give a function, not its result', html: `<p>A very common beginner bug: <code>setTimeout(sayHi(), 1000)</code> calls <code>sayHi</code> <b>right now</b> and passes its return value (<code>undefined</code>) to setTimeout. Pass the function itself — <code>setTimeout(sayHi, 1000)</code> — or wrap it when you need arguments: <code>setTimeout(() =&gt; greet('Asha'), 1000)</code>.</p>`, code: { lang: 'js', run: true, code: `function greet(name) { return 'Hello ' + name; }

const names = ['Asha', 'Ben'];
// Passing the function itself as the callback:
console.log(names.map(greet));                 // [ 'Hello Asha', 'Hello Ben' ]
// Wrapping to control the arguments:
console.log(names.map(n => greet(n.toUpperCase())));
// Bug version: greet() runs once with undefined, map gets a string, not a function.
try {
  names.map(greet());
} catch (e) {
  console.log('Error:', e.constructor.name, '-', e.message);
}` } },
      { title: 'Named function expression: the name is private', html: `<p>A function expression can have its own name: <code>const fact = function f(n) { … }</code>. The name <code>f</code> is visible <b>only inside</b> the function — handy for recursion and nicer stack traces — but outside, only <code>fact</code> exists.</p>`, code: { lang: 'js', run: true, code: `const fact = function f(n) {
  return n <= 1 ? 1 : n * f(n - 1); // 'f' works in here
};
console.log(fact(5));          // 120
console.log(typeof f);         // 'undefined' — f is not visible outside
console.log(fact.name);        // 'f'` } },
      { title: 'Default return values & early return', html: `<p><code>return</code> exits immediately — code after it never runs. Use <b>early returns</b> (guard clauses) to handle bad input first, keeping the "happy path" un-indented.</p>${H.table(['Call', 'Path taken', 'Returns'], [['<code>safeDivide(10, 2)</code>', 'happy path', '5'], ['<code>safeDivide(10, 0)</code>', 'guard clause', 'null'], ['<code>safeDivide("x", 2)</code>', 'guard clause', 'null']])}`, code: { lang: 'js', run: true, code: `function safeDivide(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') return null; // guard 1
  if (b === 0) return null;                                          // guard 2
  return a / b;                                                      // happy path
}
console.log(safeDivide(10, 2), safeDivide(10, 0), safeDivide('x', 2)); // 5 null null` } }
    ],
    deepDive: `<p>🟣 <b>Under the hood.</b> Every call creates an <b>execution context</b>: a record holding the parameters, local variables (the "environment record"), a link to the <b>outer</b> scope where the function was <i>written</i>, and the value of <code>this</code>. The context is pushed on the call stack; when the function returns it is popped. Engines limit stack depth (roughly 10 000 frames in V8 by default, depends on frame size) — infinite recursion ends with <code>RangeError: Maximum call stack size exceeded</code>.</p>
<p><b>Declaration vs expression is about grammar position.</b> If a statement <i>starts</i> with the keyword <code>function</code>, it is a declaration. Anywhere else (right side of <code>=</code>, inside brackets, as an argument) it is an expression. That is why <code>(function () {})()</code> works as an IIFE: the bracket turns it into an expression. In strict-mode ES modules, a function declaration inside a block (<code>if { function f(){} }</code>) is block-scoped; in sloppy scripts it has legacy "Annex B" behaviour — avoid declaring functions inside blocks.</p>
<p><b>What arrows lack (on purpose):</b> no own <code>this</code>, <code>arguments</code>, <code>super</code> or <code>new.target</code>; no <code>prototype</code> property; cannot be called with <code>new</code> (TypeError); cannot be generators. This makes them perfect for callbacks inside methods (they see the method's <code>this</code>) and wrong for object methods, constructors and event handlers that need <code>this</code> to be the element.</p>
<p><b>Function properties.</b> <code>fn.name</code> is inferred from the variable it is assigned to (<code>const square = function(){}</code> → <code>"square"</code>). <code>fn.length</code> counts parameters <b>before</b> the first default or rest parameter — libraries such as curry helpers rely on it. Functions are objects, so you can attach properties (<code>fn.calls = 0</code>), though a closure or class is usually cleaner.</p>
<p><b>Performance reality:</b> creating a small arrow inside a hot loop is cheap in modern engines (V8 shares the compiled code; only a small closure object is allocated), so prefer clarity. The real costs are in what the function does, not the style you write it in.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants generate functions instantly, and they love arrows everywhere — including as object methods and class event handlers where <code>this</code> then breaks. They also often write <code>() =&gt; { value }</code> (forgetting the implicit-return rule) or pass <code>fn()</code> instead of <code>fn</code> as a callback.</p>
<p><b>Use AI as a partner:</b> ask <code>"Rewrite this switch statement as a lookup table of functions and explain the trade-offs"</code> or <code>"List every place in this file where an arrow function is used as a method"</code>. Ask it to generate test calls for edge cases (no arguments, extra arguments, wrong types).</p>
<p><b>Where AI goes wrong:</b> mixing hoisting rules (claiming function expressions are hoisted), producing recursive helpers with no base case, and over-abstracting a two-line function into a factory of factories.</p>
<p><b>What you must still own:</b> reading a stack trace and knowing which frame you are in, choosing declaration vs arrow on purpose, and predicting what a call returns before you run it — interviewers test exactly this "mental execution" skill.</p>`,
    problems: [{
      title: 'Calculator with a Function Table',
      level: 'Easy', tags: ['functions', 'first-class functions', 'lookup table'], companies: ['Amazon', 'Flipkart', 'Atlassian'],
      statement: `<p>Write <code>calc(op, a, b)</code> that supports the operators <code>'+'</code>, <code>'-'</code>, <code>'*'</code>, <code>'/'</code>, <code>'**'</code> and <code>'max'</code>. For an unknown operator it must <b>throw</b> <code>new Error('Unknown operator: ' + op)</code>. Adding a new operator later should <b>not</b> require editing the body of <code>calc</code>.</p>`,
      constraints: `<p><code>a</code>, <code>b</code> are finite numbers. <code>op</code> is any string (including tricky ones like <code>'toString'</code> or <code>'constructor'</code>, which must be rejected).</p>`,
      example: `<p><code>calc('+', 2, 3)</code> → ${H.c('g', '5')}<br><code>calc('**', 2, 10)</code> → ${H.c('g', '1024')}<br><code>calc('max', 7, 9)</code> → ${H.c('g', '9')}<br><code>calc('toString', 1, 2)</code> → ${H.c('r', 'throws Error: Unknown operator: toString')} — a plain object inherits <code>toString</code> from <code>Object.prototype</code>, so a naive lookup would wrongly find it.</p>`,
      brute: { why: `<p>A long <code>if / else if</code> chain works, but every new operator means editing the function, the checks run one by one, and the logic and the data (which operators exist) are tangled together. It is the classic "switch smell".</p>`, code: { lang: 'js', run: true, code: `function calc(op, a, b) {
  if (op === '+') return a + b;
  else if (op === '-') return a - b;
  else if (op === '*') return a * b;
  else if (op === '/') return a / b;
  else if (op === '**') return a ** b;
  else if (op === 'max') return Math.max(a, b);
  throw new Error('Unknown operator: ' + op);
}
console.log(calc('+', 2, 3), calc('**', 2, 10), calc('max', 7, 9));` } },
      mcq: { q: 'You store operators in a plain object <code>OPS</code>. Why can <code>OPS[\'toString\']</code> be a problem?', options: ['It is inherited from Object.prototype, so the lookup finds a function you never added', 'It throws a SyntaxError', 'Plain objects cannot hold functions', 'Strings cannot be keys'], answer: 0, explain: 'Plain objects inherit from Object.prototype. Guard with Object.hasOwn(OPS, op), or build the table with Object.create(null) or a Map.' },
      hints: [`<p>Functions are values. What if each operator <b>key</b> mapped to a small arrow function that does the work?</p>`, `<p>Build <code>const OPS = { '+': (a, b) =&gt; a + b, … }</code>. Then <code>calc</code> is just: find the function, call it.</p>`, `<p>Edge case: inherited keys like <code>'toString'</code>. Use <code>Object.hasOwn(OPS, op)</code> before calling. Recipe: if not own key → throw; else return <code>OPS[op](a, b)</code>.</p>`],
      solution: {
        approach: `<p>Separate <b>data</b> (which operations exist) from <b>logic</b> (how to dispatch). A table of arrow functions is open for extension: adding <code>'%'</code> is one new line in the table. <code>Object.hasOwn</code> blocks inherited keys.</p>`,
        code: { lang: 'js', run: true, code: `// Lookup table: operator symbol -> function that performs it.
const OPS = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  '**': (a, b) => a ** b,
  max: (a, b) => Math.max(a, b),
};

function calc(op, a, b) {
  // Only accept keys we added ourselves (not inherited ones like 'toString').
  if (!Object.hasOwn(OPS, op)) throw new Error('Unknown operator: ' + op);
  return OPS[op](a, b); // look up the function, then call it
}

// Extending later needs NO change to calc():
OPS['%'] = (a, b) => a % b;

console.log(calc('+', 2, 3));     // 5
console.log(calc('**', 2, 10));   // 1024
console.log(calc('max', 7, 9));   // 9
console.log(calc('%', 17, 5));    // 2
for (const bad of ['toString', 'constructor', '^']) {
  try { calc(bad, 1, 2); } catch (e) { console.log(e.message); }
}` },
        dry: { head: ['call', 'Object.hasOwn(OPS, op)?', 'function found', 'result'], rows: [
          ["calc('+', 2, 3)", '<span class="c-g">true</span>', '(a, b) =&gt; a + b', '5'],
          ["calc('max', 7, 9)", '<span class="c-g">true</span>', '(a, b) =&gt; Math.max(a, b)', '9'],
          ["calc('toString', 1, 2)", '<span class="c-r">false</span> (inherited only)', '—', '<span class="c-r">throws</span>'],
          ["calc('%', 17, 5)", '<span class="c-g">true</span> (added later)', '(a, b) =&gt; a % b', '2']
        ] },
        complexity: `<p>Time O(1) per call (one hash lookup + one call). Space O(k) for k operators. The chain version is O(k) comparisons per call.</p>`,
        followUps: ['Use a <code>Map</code> instead — what changes?', 'Support unary operators like <code>neg</code> (one argument) using <code>fn.length</code>', 'Parse a string like <code>"12 * 3"</code> and evaluate it with the table']
      }
    }]
  });

  /* ================= TOPIC 2: Parameters — default, rest, arguments, pass-by-sharing ================= */
  topics.push({
    title: 'Parameters: Defaults, Rest, arguments & How Values Are Passed',
    analogy: `<p>Think of a <b>pizza order form</b>. The form has boxes: <i>size</i>, <i>crust</i>, and a big "<i>extra toppings</i>" box at the bottom. If you leave <i>crust</i> blank, the shop fills in its <b>default</b> ("regular"). Whatever toppings you shout out go into the one "extras" box as a list — that is the <b>rest parameter</b>. And if you hand the cook your <b>own lunchbox</b> to fill, he works on that exact box (an object is shared), but if you just tell him a number, he writes his own copy of it (a primitive is copied).</p>`,
    explain: `<p>🟢 <b>Parameters vs arguments.</b> <b>Parameters</b> are the names in the function definition (<code>function f(a, b)</code>). <b>Arguments</b> are the actual values you pass when calling (<code>f(1, 2)</code>). JavaScript is relaxed about counts:</p>
${H.table(['Call', 'Inside <code>function f(a, b)</code>', 'Rule'], [['<code>f(1, 2)</code>', 'a = 1, b = 2', 'normal'], ['<code>f(1)</code>', 'a = 1, b = <span class="c-r">undefined</span>', 'missing → undefined (no error!)'], ['<code>f(1, 2, 3)</code>', 'a = 1, b = 2, 3 is ignored', 'extras are silently dropped (still visible in <code>arguments</code>)']])}
<p><b>Default parameters</b> fill a gap: <code>function greet(name = 'friend')</code>. The default is used <b>only when the argument is <code>undefined</code></b> (missing or passed as <code>undefined</code>). Passing <code>null</code>, <code>0</code> or <code>''</code> does <b>not</b> trigger the default. Defaults are evaluated <b>fresh on every call</b>, left to right, and may use earlier parameters: <code>function box(w, h = w)</code>.</p>
<p><b>Rest parameter</b> <code>...nums</code> gathers "all the remaining arguments" into a <b>real array</b>. It must be the <b>last</b> parameter and there can be only one: <code>function sum(...nums) { return nums.reduce((t, n) =&gt; t + n, 0); }</code>.</p>
<p><b>The old <code>arguments</code> object</b> is an array-<i>like</i> list of every argument passed (it has <code>length</code> and indexes but no <code>map</code>). Arrow functions do not have their own. Modern code uses rest parameters instead.</p>
<p><b>How values are passed — "pass by sharing".</b> JavaScript always copies the <i>value in the variable</i> into the parameter. For a primitive (number, string, boolean…) that value is the data itself, so the function gets its own copy. For an object or array, the value is a <b>reference</b> (an arrow pointing at the object), so the function gets a copy of the <b>arrow</b>: it can <b>change the object</b> (mutation is visible to the caller) but <b>re-pointing</b> the parameter to a new object does not affect the caller.</p>
<p><b>Options-object pattern.</b> When a function has many optional settings, take one object and destructure it with defaults: <code>function connect({ host = 'localhost', port = 5432 } = {})</code>. Callers name what they set (<code>connect({ port: 6000 })</code>) and the trailing <code>= {}</code> lets them call <code>connect()</code> with nothing.</p>`,
    clues: [
      '"accept any number of arguments" / "variadic" → rest parameter <code>...args</code>',
      '"optional argument with a fallback" → default parameter (remember: only for <code>undefined</code>, not <code>null</code>)',
      '"the function changed my array/object!" → pass-by-sharing; copy first (<code>[...arr]</code>, <code>{...obj}</code>) if you must not mutate',
      '"too many positional parameters" / "boolean trap" → options object with destructuring defaults',
      '"array-like object", "arguments.length" → legacy <code>arguments</code>; convert with <code>Array.from(arguments)</code> or use rest',
      '"spread an array into a function call" → <code>Math.max(...arr)</code> (call-site spread, the mirror of rest)',
      '"what is <code>fn.length</code>?" → number of parameters before the first default/rest'
    ],
    code: [{ lang: 'js', run: true, title: 'Defaults, rest and arguments (runnable)', code: `// Default: used only when the argument is undefined.
function greet(name = 'friend', punctuation = '!') {
  return 'Hello, ' + name + punctuation;
}
console.log(greet());                 // Hello, friend!
console.log(greet('Asha'));           // Hello, Asha!
console.log(greet(undefined, '?'));   // Hello, friend?
console.log(greet(null));             // Hello, null!   (null is a real value)

// Defaults may use earlier parameters and are evaluated per call.
function rectangle(width, height = width) {
  return width * height;
}
console.log(rectangle(4), rectangle(4, 2)); // 16 8

// A fresh default array every call (unlike Python's mutable-default gotcha).
function addItem(item, list = []) {
  list.push(item);
  return list;
}
console.log(addItem('a'), addItem('b')); // [ 'a' ] [ 'b' ]

// Rest parameter: a REAL array of the remaining arguments.
function sum(label, ...nums) {
  const total = nums.reduce((t, n) => t + n, 0);
  return label + ': ' + total + ' (from ' + nums.length + ' numbers)';
}
console.log(sum('total', 1, 2, 3, 4)); // total: 10 (from 4 numbers)
console.log(sum('empty'));             // empty: 0 (from 0 numbers)

// The old 'arguments' object: array-like, not a real array.
function legacy() {
  console.log(arguments.length, Array.isArray(arguments)); // 3 false
  return Array.from(arguments).join('-');
}
console.log(legacy('x', 'y', 'z')); // x-y-z

// fn.length counts parameters before the first default/rest.
console.log(greet.length, rectangle.length, sum.length); // 0 1 1` },
    { lang: 'js', run: true, title: 'Pass by sharing: mutate vs reassign', code: `function mutate(arr) {
  arr.push(99);          // changes the SHARED array: caller sees it
}
function reassign(arr) {
  arr = [1, 2, 3];       // re-points the local parameter only
  arr.push(100);         // changes the NEW array, which nobody else sees
}
function bump(n) {
  n = n + 1;             // primitives are copied: caller unaffected
  return n;
}

const data = [10, 20];
mutate(data);
console.log(data);       // [ 10, 20, 99 ]
reassign(data);
console.log(data);       // [ 10, 20, 99 ]  (unchanged by reassign)

let count = 5;
console.log(bump(count), count); // 6 5

// Defensive copy if you must not touch the caller's data:
function withTax(prices) {
  const copy = [...prices];          // shallow copy
  for (let i = 0; i < copy.length; i++) copy[i] = +(copy[i] * 1.18).toFixed(2);
  return copy;
}
const prices = [100, 250];
console.log(withTax(prices), prices); // [ 118, 295 ] [ 100, 250 ]

// Options object with destructuring defaults.
function connect({ host = 'localhost', port = 5432, ssl = false } = {}) {
  return (ssl ? 'postgres+ssl' : 'postgres') + '://' + host + ':' + port;
}
console.log(connect());                         // postgres://localhost:5432
console.log(connect({ port: 6000, ssl: true })); // postgres+ssl://localhost:6000` }],
    codeTitle: ['Defaults, rest & arguments', 'Pass by sharing & options objects'],
    viz: [{
      title: 'How arguments bind to f(a, b = a * 2, ...rest)',
      input: '5 undefined 7 8',
      inputLabel: 'Arguments (numbers, undefined, null, \'text\')',
      gen: function (input) {
        var toks = String(input === undefined ? '' : input).trim().split(/[\s,]+/).filter(function (x) { return x.length; });
        if (toks.length > 7) throw new Error('Use at most 7 arguments');
        var args = toks.map(lit);
        args.forEach(function (x) { if (typeof x === 'string' && x.length > 10) throw new Error('Keep text arguments short (≤ 10 chars)'); });
        var code = ['function f(a, b = a * 2, ...rest) {', '  return [a, b, rest];', '}', 'f(' + toks.join(', ') + ');'].join('\n');
        var f = [], a = args[0], b, rest = args.slice(2);
        f.push(fr('The call passes <b>' + args.length + '</b> argument(s). JavaScript lines them up against the parameters <b>left to right</b>. The legacy <code>arguments</code> object would hold all of them.', [cp(code, 4), ap('arguments (what the caller passed)', args, {}, {}), vp({ a: { __tdz: true }, b: { __tdz: true }, rest: { __tdz: true } }, '', '', 'Parameters (not bound yet)')]));
        f.push(fr('Parameter <code>a</code> takes argument #0' + (args.length ? ' → <b>' + esc(show(a)) + '</b>.' : ', but nothing was passed → <b>undefined</b> (no error in JS!).'), [cp(code, 1), ap('arguments', args, { 0: 'ok' }, { 0: 'a' }), vp({ a: a }, 'a', 'ok', 'Parameters')]));
        var useDefault = args.length < 2 || args[1] === undefined;
        if (useDefault) {
          b = (typeof a === 'number') ? a * 2 : (a === null ? 0 : NaN);
          f.push(fr('Parameter <code>b</code>: argument #1 is ' + (args.length < 2 ? '<b>missing</b>' : '<b>undefined</b>') + ', so the <b>default</b> <code>a * 2</code> is evaluated <i>now</i>, using the already-bound <code>a</code> → <b>' + esc(show(b)) + '</b>.', [cp(code, 1, 'ok'), ap('arguments', args, { 1: 'cur' }, args.length > 1 ? { 1: 'b' } : {}), vp({ a: a, b: b }, 'b', 'ok', 'Parameters')]));
        } else {
          b = args[1];
          f.push(fr('Parameter <code>b</code>: argument #1 is <b>' + esc(show(b)) + '</b>, which is not <code>undefined</code>, so the default is <b>skipped</b>.' + (b === null ? ' <span class="c-y">Note: null does NOT trigger a default!</span>' : ''), [cp(code, 1), ap('arguments', args, { 1: 'ok' }, { 1: 'b' }), vp({ a: a, b: b }, 'b', 'ok', 'Parameters')]));
        }
        var hl = {};
        for (var i = 2; i < args.length; i++) hl[i] = 'win';
        f.push(fr('<code>...rest</code> collects <b>everything left</b> (index 2 onward) into a brand-new <b>real array</b>: <b>' + esc(show(rest)) + '</b>' + (rest.length ? '.' : ' — empty, never undefined.'), [cp(code, 1), ap('arguments', args, hl, {}), vp({ a: a, b: b, rest: rest }, 'rest', 'ok', 'Parameters')]));
        f.push(fr('Line 2 returns <code>[a, b, rest]</code> → <b>' + esc(show([a, b, rest])) + '</b>. Bonus: <code>f.length</code> is <b>1</b> — only parameters before the first default count.', [cp(code, 2, 'ok'), vp({ returned: [a, b, rest], 'f.length': 1 }, 'returned', 'sel', 'Result')]));
        return f;
      }
    }, {
      title: 'Pass by sharing: two arrows, one object',
      gen: function () {
        var code = ['const cart = { items: 1 };', 'function addOne(c) { c.items++; }', 'function replace(c) { c = { items: 100 }; }', 'addOne(cart);', 'replace(cart);', 'console.log(cart.items);'].join('\n');
        function g(ptrTo, items, extra, hl, ehl) {
          var nodes = [{ id: 'cart', label: 'cart', x: 12, y: 15, shape: 'box' }, { id: 'O1', label: '{ items: ' + items + ' }', x: 62, y: 15, shape: 'box', w: 26 }];
          var edges = [['cart', 'O1']];
          if (ptrTo) { nodes.push({ id: 'c', label: 'c (param)', x: 12, y: 42, shape: 'box' }); edges.push(['c', ptrTo]); }
          if (extra) nodes.push({ id: 'O2', label: '{ items: 100 }', x: 62, y: 42, shape: 'box', w: 26 });
          return { type: 'graph', label: 'Variables → objects in memory', directed: true, height: 55, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} };
        }
        return [
          fr('Line 1: <code>cart</code> holds a <b>reference</b> (an arrow) to an object in memory.', [cp(code, 1, 'ok'), g(null, 1, false, { O1: 'ok' })]),
          fr('Line 4 calls <code>addOne(cart)</code>. The <b>arrow is copied</b> into parameter <code>c</code> — now two arrows point at the <b>same</b> object.', [cp(code, { 4: 'cur', 2: 'win' }), g('O1', 1, false, { c: 'cur' }, { 'c-O1': 'cur' })]),
          fr('<code>c.items++</code> follows the arrow and changes the shared object → <b>items: 2</b>. The caller will see it.', [cp(code, 2, 'ok'), g('O1', 2, false, { O1: 'ok' }, { 'c-O1': 'ok', 'cart-O1': 'ok' })]),
          fr('Line 5 calls <code>replace(cart)</code>: <code>c</code> again starts as a copy of the arrow…', [cp(code, { 5: 'cur', 3: 'win' }), g('O1', 2, false, { c: 'cur' }, { 'c-O1': 'cur' })]),
          fr('…but <code>c = { items: 100 }</code> just <b>re-points the local arrow</b> to a new object. <code>cart</code> still points to the old one.', [cp(code, 3, 'bad'), g('O2', 2, true, { O2: 'bad' }, { 'c-O2': 'bad' })]),
          fr('Function ends, <code>c</code> disappears, the new object becomes garbage. Line 6 prints <b>2</b>: mutation was visible, reassignment was not.', [cp(code, 6, 'ok'), g(null, 2, false, { O1: 'sel' }), tx('<b>Console:</b> <code>2</code>', 'Output')])
        ];
      }
    }],
    examples: [
      { title: 'Predict the output: null vs undefined with defaults', html: `<p>Defaults fire only for <code>undefined</code>. This is why <code>??</code> (nullish coalescing) is often used inside the function when you also want to treat <code>null</code> as "missing".</p>${H.table(['Call', 'name', 'Output'], [['<code>hello()</code>', 'default', 'Hi guest'], ['<code>hello(undefined)</code>', 'default', 'Hi guest'], ['<code>hello(null)</code>', '<span class="c-r">null</span>', 'Hi null'], ['<code>hello(\'\')</code>', '<span class="c-r">\'\'</span>', 'Hi ']])}`, code: { lang: 'js', run: true, code: `function hello(name = 'guest') { return 'Hi ' + name; }
console.log(hello());          // Hi guest
console.log(hello(undefined)); // Hi guest
console.log(hello(null));      // Hi null
console.log(JSON.stringify(hello(''))); // "Hi "

// Treat null AND undefined as missing:
function hello2(name) { return 'Hi ' + (name ?? 'guest'); }
console.log(hello2(null));     // Hi guest` } },
      { title: 'Rest vs spread — same dots, opposite jobs', html: `<p><b>Rest</b> (in a <i>definition</i>) <b>gathers</b> many values into one array. <b>Spread</b> (in a <i>call</i> or literal) <b>scatters</b> one array into many values.</p>${H.arr([3, 9, 4], { label: 'scores' })}<p><code>Math.max(...scores)</code> is the same as <code>Math.max(3, 9, 4)</code> → ${H.c('g', '9')}. Without the dots, <code>Math.max([3, 9, 4])</code> → ${H.c('r', 'NaN')} (an array is not a number).</p>`, code: { lang: 'js', run: true, code: `const scores = [3, 9, 4];
console.log(Math.max(...scores));   // 9    (spread at the call)
console.log(Math.max(scores));      // NaN  (one array argument)

function logAll(first, ...others) { // rest in the definition
  console.log('first:', first, '| others:', others);
}
logAll(...scores);                  // first: 3 | others: [ 9, 4 ]` } },
      { title: 'Default expressions run on every call', html: `<p>A default can call a function. It is evaluated <b>each time</b> the default is needed — not once at definition time. Here each call without an id gets a new id; calls that pass an id never run <code>nextId()</code>.</p>${H.table(['Call', 'nextId() runs?', 'id'], [['<code>makeUser(\'a\')</code>', 'yes', '1'], ['<code>makeUser(\'b\', 50)</code>', '<span class="c-m">no</span>', '50'], ['<code>makeUser(\'c\')</code>', 'yes', '2']])}`, code: { lang: 'js', run: true, code: `let counter = 0;
function nextId() { counter += 1; return counter; }
function makeUser(name, id = nextId()) { return { name, id }; }
console.log(makeUser('a'));      // { name: 'a', id: 1 }
console.log(makeUser('b', 50));  // { name: 'b', id: 50 }
console.log(makeUser('c'));      // { name: 'c', id: 2 }` } },
      { title: 'Required-parameter trick', html: `<p>JavaScript never complains about missing arguments. A neat trick turns a missing argument into a clear error: make the default a function call that <b>throws</b>. It runs only when the argument is missing.</p>`, code: { lang: 'js', run: true, code: `function required(name) { throw new Error('Missing parameter: ' + name); }
function divide(a = required('a'), b = required('b')) { return a / b; }
console.log(divide(10, 4)); // 2.5
try { divide(10); } catch (e) { console.log(e.message); } // Missing parameter: b` } }
    ],
    deepDive: `<p>🟣 <b>Parameter scope.</b> When a function has any default, rest or destructured parameter, the parameter list gets its <b>own scope</b>, created before the body's scope. Defaults are evaluated left to right inside it, so a default can see earlier parameters (<code>(a, b = a)</code>) but not later ones (<code>(a = b, b)</code> → ReferenceError, <code>b</code> is in the TDZ) and not variables declared in the body.</p>
<p><b><code>arguments</code> aliasing.</b> In sloppy-mode functions with only simple parameters, <code>arguments[0]</code> and <code>a</code> are <b>linked</b>: changing one changes the other. In strict mode, or as soon as the function uses defaults/rest/destructuring, the link is cut. Another reason to avoid <code>arguments</code> — it also historically made functions harder for engines to optimise.</p>
<p><b>Spread limits.</b> <code>fn(...arr)</code> places every element on the stack as a separate argument. Engines cap argument counts (V8 throws <code>RangeError: Maximum call stack size exceeded</code> at roughly a few hundred thousand elements; Safari's limit is lower, about 65 536). So <code>Math.max(...hugeArray)</code> can crash in production — use a loop or <code>reduce</code> for big data.</p>
<p><b>Evaluation strategy.</b> Calling this "pass by reference" is technically wrong: in true pass-by-reference (C++ <code>int&amp;</code>), assigning to the parameter would change the caller's variable. JS is <b>call by sharing</b> — the same model as Python and Java objects. Primitives are immutable anyway, so "copy vs share" only matters for objects.</p>
<p><b>API design.</b> Prefer at most 2–3 positional parameters. After that, use an options object — it is self-documenting at the call site (<code>render({ animate: true })</code> beats <code>render(true, false, null, 2)</code>) and lets you add options later without breaking callers. TypeScript then gives each option a type.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI tools generate function signatures quickly and usually pick an options object for anything with many settings — good. But they frequently confuse <code>||</code> defaults with <code>=</code> defaults (<code>port = port || 80</code> turns a legitimate <code>0</code> into 80) and quietly mutate input arrays (<code>arr.sort()</code> on a parameter) in "helper" functions.</p>
<p><b>Use AI as a partner:</b> <code>"Does this function mutate any of its arguments? List each line."</code> and <code>"Convert these 5 positional parameters to an options object with defaults, keeping old callers working."</code></p>
<p><b>Where AI goes wrong:</b> claiming defaults trigger on <code>null</code>, using <code>arguments</code> inside an arrow function (it silently picks up the outer function's), and spreading huge arrays into <code>Math.max</code>.</p>
<p><b>What you must still own:</b> knowing the exact default/undefined rule, the call-by-sharing model (and drawing the arrow diagram when asked), and choosing between mutation and copying deliberately.</p>`,
    problems: [{
      title: 'Python-style range(start, end, step)',
      level: 'Easy', tags: ['default parameters', 'arguments', 'arrays'], companies: ['Google', 'Swiggy'],
      statement: `<p>Write <code>range(start, end, step)</code> returning an array, behaving like Python: with <b>one</b> argument it is the <b>end</b> (start = 0); <code>step</code> defaults to 1 and may be negative. <code>step === 0</code> must throw <code>RangeError</code>. The end is <b>exclusive</b>.</p>`,
      constraints: `<p>Integers, |values| ≤ 10<sup>6</sup>, result length ≤ 10<sup>5</sup>.</p>`,
      example: `<p><code>range(5)</code> → ${H.arr([0, 1, 2, 3, 4])}<code>range(2, 6)</code> → ${H.arr([2, 3, 4, 5])}<code>range(10, 0, -3)</code> → ${H.arr([10, 7, 4, 1])}<code>range(3, 1)</code> → ${H.c('m', '[] (step +1 can never reach a smaller end)')}</p>`,
      brute: { why: `<p>A version that inspects <code>arguments.length</code> works, but it is legacy, does not work in arrow functions, hides the signature (readers cannot see the parameters), and mixes shuffling logic with the loop.</p>`, code: { lang: 'js', run: true, code: `function range() {
  let start, end, step;
  if (arguments.length === 1) { start = 0; end = arguments[0]; step = 1; }
  else { start = arguments[0]; end = arguments[1]; step = arguments.length > 2 ? arguments[2] : 1; }
  const out = [];
  if (step > 0) for (let i = start; i < end; i += step) out.push(i);
  else for (let i = start; i > end; i += step) out.push(i);
  return out;
}
console.log(range(5), range(10, 0, -3));` } },
      mcq: { q: 'Inside <code>function range(start, end, step = 1)</code>, how do you detect that only ONE argument was passed?', options: ['<code>end === undefined</code>', '<code>end === null</code>', '<code>!end</code>', '<code>step === 1</code>'], answer: 0, explain: 'A missing argument is undefined. <code>!end</code> would wrongly treat range(5, 0) (end = 0) as one argument.' },
      hints: [`<p>Default parameters handle <code>step</code>. The tricky part is "one argument means it is the end".</p>`, `<p>If <code>end === undefined</code>, shift: <code>end = start; start = 0</code>. Use <code>let</code>-style reassignment of parameters (fine for primitives).</p>`, `<p>Loop condition depends on direction: <code>step &gt; 0 ? i &lt; end : i &gt; end</code>. Guard <code>step === 0</code> first, or you loop forever.</p>`],
      solution: {
        approach: `<p>Use defaults for <code>step</code>, detect the one-argument form with <code>end === undefined</code>, guard the infinite-loop case, then run one loop whose stopping test depends on the sign of <code>step</code>.</p>`,
        code: { lang: 'js', run: true, code: `function range(start, end, step = 1) {
  // One-argument form: range(5) means range(0, 5).
  if (end === undefined) {
    end = start;
    start = 0;
  }
  if (step === 0) throw new RangeError('step must not be zero');
  const out = [];
  // Keep going while we have not passed 'end' in the direction of travel.
  for (let i = start; step > 0 ? i < end : i > end; i += step) {
    out.push(i);
  }
  return out;
}

console.log(range(5));          // [ 0, 1, 2, 3, 4 ]
console.log(range(2, 6));       // [ 2, 3, 4, 5 ]
console.log(range(10, 0, -3));  // [ 10, 7, 4, 1 ]
console.log(range(3, 1));       // []
try { range(1, 5, 0); } catch (e) { console.log(e.name + ': ' + e.message); }` },
        dry: { head: ['call', 'start', 'end', 'step', 'i values pushed'], rows: [
          ['range(5)', '0 (shifted)', '5', '1 (default)', '0, 1, 2, 3, 4'],
          ['range(10, 0, -3)', '10', '0', '-3', '10, 7, 4, 1 (next -2 fails i &gt; 0)'],
          ['range(3, 1)', '3', '1', '1', '<span class="c-m">none: 3 &lt; 1 is false</span>'],
          ['range(1, 5, 0)', '1', '5', '0', '<span class="c-r">RangeError</span>']
        ] },
        complexity: `<p>Time O(|end − start| / |step|), space the same for the output array.</p>`,
        followUps: ['Make it lazy with a generator so <code>range(1e9)</code> does not allocate', 'Support floating-point steps without accumulating rounding error (compute <code>start + k * step</code>)', 'Write it as one expression with <code>Array.from({ length }, (_, k) =&gt; …)</code>']
      }
    }]
  });

  /* ================= TOPIC 3: Arrays — creating, indexing, push/pop/shift/unshift, slice vs splice ================= */
  topics.push({
    title: 'Arrays I: Creating, Indexing, push/pop/shift/unshift, slice vs splice',
    analogy: `<p>An array is a <b>row of numbered lockers</b> starting at locker 0. Adding or removing at the <b>end</b> of the row (<code>push</code>/<code>pop</code>) is quick — nobody else moves. Adding or removing at the <b>front</b> (<code>unshift</code>/<code>shift</code>) means every person has to shuffle one locker over and get a new number — slow for a long row. <code>slice</code> is <b>photocopying</b> some lockers (the originals stay untouched), while <code>splice</code> is <b>renovation</b>: you rip lockers out and/or install new ones in the real row.</p>`,
    explain: `<p>🟢 <b>Creating arrays.</b> Use a literal: <code>const nums = [10, 20, 30]</code>. Arrays can mix types (<code>[1, 'two', { three: 3 }]</code>) but in practice keep one kind per array. Other ways: <code>Array.from('abc')</code> → <code>['a','b','c']</code>, <code>Array.from({ length: 3 }, (_, i) =&gt; i * i)</code> → <code>[0, 1, 4]</code>, <code>new Array(3).fill(0)</code> → <code>[0, 0, 0]</code>. Beware <code>new Array(3)</code> alone makes 3 empty <b>holes</b>, and <code>new Array(3, 4)</code> makes <code>[3, 4]</code> — use <code>Array.of</code> or literals.</p>
<p><b>Indexing.</b> <code>nums[0]</code> is the first item, <code>nums[nums.length - 1]</code> the last, and <code>nums.at(-1)</code> (modern) also the last. Reading past the end gives <code>undefined</code>, not an error. <code>length</code> is always "highest index + 1" and is writable: <code>nums.length = 0</code> empties the array.</p>
<p><b>Mutating vs non-mutating.</b> The single most important thing to know about each array method is whether it <b>changes the original</b>:</p>
${H.table(['Method', 'What it does', 'Mutates?', 'Returns'], [
  ['<code>push(x, …)</code>', 'add to end', '<span class="c-r">yes</span>', 'new <b>length</b> (not the array!)'],
  ['<code>pop()</code>', 'remove from end', '<span class="c-r">yes</span>', 'removed item (or undefined)'],
  ['<code>unshift(x, …)</code>', 'add to front', '<span class="c-r">yes</span>', 'new length'],
  ['<code>shift()</code>', 'remove from front', '<span class="c-r">yes</span>', 'removed item'],
  ['<code>splice(start, count, …items)</code>', 'remove and/or insert anywhere', '<span class="c-r">yes</span>', 'array of <b>removed</b> items'],
  ['<code>slice(start, end)</code>', 'copy a part (end exclusive)', '<span class="c-g">no</span>', 'new array'],
  ['<code>concat(…)</code>', 'join arrays', '<span class="c-g">no</span>', 'new array'],
  ['<code>indexOf</code> / <code>includes</code>', 'search', '<span class="c-g">no</span>', 'index or -1 / boolean'],
  ['<code>join(sep)</code>', 'make a string', '<span class="c-g">no</span>', 'string'],
  ['<code>reverse()</code>, <code>sort()</code>, <code>fill()</code>', 'reorder / overwrite', '<span class="c-r">yes</span>', 'the same array'],
  ['<code>toReversed()</code>, <code>toSorted()</code>, <code>toSpliced()</code>, <code>with(i, v)</code>', 'ES2023 copying versions', '<span class="c-g">no</span>', 'new array']
])}
<p><b>slice vs splice in one line:</b> <code>slice(1, 3)</code> = "give me a copy of items 1 and 2"; <code>splice(1, 2)</code> = "cut items 1 and 2 out of the real array and hand them to me". Both accept negative positions counted from the end (<code>-1</code> = last).</p>
<p><b><code>const</code> arrays can still change.</b> <code>const</code> stops you re-assigning the variable (<code>nums = []</code> fails), not changing the contents (<code>nums.push(4)</code> works).</p>`,
    clues: [
      '"in place" / "without extra space" / "modify the input array" → mutating methods (<code>splice</code>, swaps, write-pointer)',
      '"do not modify the original" / "pure" / React state → <code>slice</code>, spread, <code>toSorted</code>, <code>toSpliced</code>, <code>with</code>',
      '"remove the element at index i" → <code>splice(i, 1)</code> (mutating) or <code>toSpliced(i, 1)</code> / <code>filter((_, j) =&gt; j !== i)</code> (copy)',
      '"last element" → <code>arr.at(-1)</code> or <code>arr[arr.length - 1]</code>',
      '"use the array as a stack" → <code>push</code>/<code>pop</code>; "as a queue" → <code>push</code>/<code>shift</code> (O(n) shift — use an index pointer for big queues)',
      '"create an array of N items" → <code>Array.from({ length: N }, (_, i) =&gt; …)</code>, not <code>new Array(N).map(…)</code> (holes are skipped!)',
      '"check if value exists, including NaN" → <code>includes</code> (<code>indexOf</code> cannot find NaN)'
    ],
    code: [{ lang: 'js', run: true, title: 'Creating, indexing and the end/front methods (runnable)', code: `const nums = [10, 20, 30];

console.log(nums[0], nums[nums.length - 1], nums.at(-1)); // 10 30 30
console.log(nums[99]);                                    // undefined (no error)

// push / pop work at the END: fast, nobody moves.
console.log(nums.push(40, 50)); // 5   <- returns the NEW LENGTH, not the array
console.log(nums.pop());        // 50  <- returns the removed item
console.log(nums);              // [ 10, 20, 30, 40 ]

// unshift / shift work at the FRONT: every element is re-numbered.
console.log(nums.unshift(0));   // 5
console.log(nums.shift());      // 0
console.log(nums);              // [ 10, 20, 30, 40 ]

// Ways to create arrays
console.log(Array.from('abc'));                          // [ 'a', 'b', 'c' ]
console.log(Array.from({ length: 4 }, (_, i) => i * i)); // [ 0, 1, 4, 9 ]
console.log(new Array(3).fill(0));                       // [ 0, 0, 0 ]
console.log(Array.of(3), new Array(3).length);           // [ 3 ] 3 (holes!)

// length is writable
const tmp = [1, 2, 3, 4];
tmp.length = 2;
console.log(tmp);               // [ 1, 2 ]

// Search
const letters = ['a', 'b', NaN];
console.log(letters.indexOf('b'), letters.includes('z')); // 1 false
console.log(letters.indexOf(NaN), letters.includes(NaN)); // -1 true

// const does not freeze contents
const fixed = [1];
fixed.push(2);
console.log(fixed);             // [ 1, 2 ]` },
    { lang: 'js', run: true, title: 'slice (copy) vs splice (surgery) vs toSpliced (copying surgery)', code: `const base = ['a', 'b', 'c', 'd', 'e'];

// slice(start, end): copy from start up to (not including) end. Original untouched.
console.log(base.slice(1, 3));  // [ 'b', 'c' ]
console.log(base.slice(-2));    // [ 'd', 'e' ]
console.log(base.slice());      // full shallow copy
console.log(base);              // [ 'a', 'b', 'c', 'd', 'e' ]

// splice(start, deleteCount, ...items): mutates, returns the REMOVED items.
const arr = [...base];
const removed = arr.splice(1, 2, 'X', 'Y', 'Z'); // remove b,c ; insert X,Y,Z
console.log(removed);           // [ 'b', 'c' ]
console.log(arr);               // [ 'a', 'X', 'Y', 'Z', 'd', 'e' ]

// Insert without deleting: deleteCount = 0
arr.splice(1, 0, 'NEW');
console.log(arr);               // [ 'a', 'NEW', 'X', 'Y', 'Z', 'd', 'e' ]

// Delete from index to the end: omit deleteCount
console.log(arr.splice(4));     // [ 'Z', 'd', 'e' ]
console.log(arr);               // [ 'a', 'NEW', 'X', 'Y' ]

// ES2023 non-mutating twins (Node 20+, all modern browsers)
const orig = [3, 1, 2];
console.log(orig.toSpliced(0, 1), orig.toReversed(), orig.with(1, 99), orig); // [1,2] [2,1,3] [3,99,2] [3,1,2]

// concat and join
console.log([1, 2].concat([3], 4, [[5]])); // [ 1, 2, 3, 4, [ 5 ] ]  (only one level)
console.log(['2026', '10', '14'].join('-')); // 2026-10-14` }],
    codeTitle: ['Creating & end/front methods', 'slice vs splice'],
    viz: [{
      title: 'splice step by step: remove, then insert',
      input: '10 20 30 40 50 | 1 2 | 99 98',
      inputLabel: 'array | start deleteCount | items to insert',
      gen: function (input) {
        var segs = String(input === undefined ? '' : input).split('|');
        if (segs.length < 2) throw new Error('Format: values | start deleteCount | items   e.g. 10 20 30 | 1 1 | 7');
        var arr = nums(segs[0], 1, 10);
        var sc = String(segs[1]).trim().split(/[\s,]+/).filter(function (x) { return x.length; }).map(Number);
        if (!sc.length || sc.length > 2 || sc.some(function (x) { return !isFinite(x); })) throw new Error('Middle part needs start and optional deleteCount, e.g. 1 2');
        var items = segs.length > 2 && segs[2].trim() ? nums(segs[2], 1, 4) : [];
        var len = arr.length, s0 = Math.trunc(sc[0]);
        var start = s0 < 0 ? Math.max(len + s0, 0) : Math.min(s0, len);
        var dc = sc.length > 1 ? Math.min(Math.max(Math.trunc(sc[1]), 0), len - start) : len - start;
        var call = 'arr.splice(' + sc.join(', ') + (items.length ? ', ' + items.join(', ') : '') + ')';
        var f = [];
        f.push(fr('We run <code>' + call + '</code> on an array of length <b>' + len + '</b>. splice <b>changes this array</b> and returns what it removed.', [ap('arr (before)', arr, {}, {}), vp({ call: call }, '', '', 'Call')]));
        f.push(fr('Step 1 — find the real start. ' + (s0 < 0 ? 'Start <b>' + s0 + '</b> is negative, so count from the end: ' + len + ' + (' + s0 + ') = <b>' + start + '</b>' + (len + s0 < 0 ? ' (clamped to 0)' : '') + '.' : 'Start <b>' + s0 + '</b>' + (s0 > len ? ' is past the end, so it is clamped to length <b>' + len + '</b>.' : ' is used as-is.')), [ap('arr', arr, start < len ? (function () { var h = {}; h[start] = 'cur'; return h; })() : {}, start < len ? (function () { var p = {}; p[start] = 'start'; return p; })() : {}), vp({ start: start, deleteCount: dc }, 'start', 'ok', 'Normalised arguments')]));
        var hl = {};
        for (var i = start; i < start + dc; i++) hl[i] = 'bad';
        f.push(fr('Step 2 — mark <b>' + dc + '</b> item(s) for removal' + (sc.length < 2 ? ' (deleteCount omitted → everything from start to the end)' : '') + (dc === 0 ? ' — none: this call only inserts.' : '.'), [ap('arr', arr, hl, {}), vp({ start: start, deleteCount: dc }, 'deleteCount', 'cur', 'Normalised arguments')]));
        var removed = arr.slice(start, start + dc);
        var mid = arr.slice(0, start).concat(arr.slice(start + dc));
        f.push(fr('Step 3 — cut them out. They go into a <b>new array</b>, which is splice\'s return value. Items after the cut slide left to close the gap.', [ap('arr (gap closed)', mid, {}, {}), ap('returned (removed items)', removed, (function () { var h = {}; removed.forEach(function (_, k) { h[k] = 'bad'; }); return h; })(), {})]));
        var fin = arr.slice(0, start).concat(items, arr.slice(start + dc));
        var hl2 = {};
        for (var j = start; j < start + items.length; j++) hl2[j] = 'ok';
        f.push(fr('Step 4 — ' + (items.length ? 'insert <b>' + items.join(', ') + '</b> at index ' + start + '; later items slide right.' : 'no items to insert.') + ' Final length: <b>' + fin.length + '</b>.', [ap('arr (after)', fin, hl2, {}), ap('returned', removed, {}, {})]));
        f.push(fr('Compare: <code>arr.slice(' + start + ', ' + (start + dc) + ')</code> would have returned the same items <b>without touching arr</b>, and <code>arr.toSpliced(…)</code> would return the "after" array as a copy, leaving arr alone.', [ap('original (slice / toSpliced leave it alone)', arr, {}, {}), ap('toSpliced result (new array)', fin, hl2, {}), ap('slice result (new array)', removed, {}, {})]));
        return f;
      }
    }, {
      title: 'End vs front: push/pop/shift/unshift and how many items move',
      input: 'push 4, push 5, pop, unshift 0, shift',
      inputLabel: 'Operations on [1, 2, 3] (push N, pop, unshift N, shift)',
      gen: function (input) {
        var ops = String(input === undefined ? '' : input).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!ops.length || ops.length > 8) throw new Error('Give 1 to 8 operations separated by commas, e.g. push 4, pop, shift');
        var arr = [1, 2, 3], moved = 0, f = [];
        f.push(fr('Start with <code>arr = [1, 2, 3]</code>. Watch the "items re-numbered" counter: end operations cost nothing extra, front operations shift everyone.', [ap('arr', arr, {}, {}), vp({ 'items re-numbered (total)': 0 }, '', '', 'Work done')]));
        ops.forEach(function (op) {
          var m = op.match(/^(push|unshift)\s+(-?\d+)$|^(pop|shift)$/);
          if (!m) throw new Error('Unknown operation "' + op + '" — use push N, pop, unshift N or shift');
          if (arr.length >= 10 && (m[1] === 'push' || m[1] === 'unshift')) throw new Error('Array would exceed 10 items');
          var name = m[1] || m[3], ret, hl = {}, cost = 0;
          if (name === 'push') { arr.push(Number(m[2])); ret = arr.length; hl[arr.length - 1] = 'ok'; }
          else if (name === 'pop') { ret = arr.pop(); }
          else if (name === 'unshift') { cost = arr.length; arr.unshift(Number(m[2])); ret = arr.length; hl[0] = 'ok'; for (var i = 1; i < arr.length; i++) hl[i] = 'cur'; }
          else { ret = arr.shift(); cost = arr.length; for (var k = 0; k < arr.length; k++) hl[k] = 'cur'; }
          moved += cost;
          var why = name === 'push' ? 'added at the end — returns the <b>new length</b> (' + ret + '), not the array.' : name === 'pop' ? 'removed the last item and returned it (' + esc(show(ret)) + ').' : name === 'unshift' ? 'inserted at index 0 — all ' + cost + ' existing items moved one slot right (amber). Returns new length ' + ret + '.' : 'removed index 0 and returned ' + esc(show(ret)) + ' — the remaining ' + cost + ' items each moved one slot left (amber).';
          f.push(fr('<code>arr.' + (m[2] !== undefined ? name + '(' + m[2] + ')' : name + '()') + '</code>: ' + why, [ap('arr', arr.slice(), hl, {}), vp({ 'return value': ret, 'items re-numbered (this op)': cost, 'items re-numbered (total)': moved }, 'items re-numbered (this op)', cost ? 'bad' : 'ok', 'Work done')]));
        });
        f.push(fr('Done. Total re-numbered items: <b>' + moved + '</b>. For a queue with millions of items, repeated <code>shift()</code> is O(n) each — keep a head index or use a proper deque instead.', [ap('final arr', arr, {}, {}), vp({ 'items re-numbered (total)': moved }, 'items re-numbered (total)', 'sel', 'Work done')]));
        return f;
      }
    }],
    examples: [
      { title: 'Predict the output: what do these methods return?', html: `<p>Interviewers love this one because people expect <code>push</code> to return the array.</p>${H.table(['Expression', 'Value'], [['<code>a.push(4)</code>', '<b>4</b> (new length)'], ['<code>a.pop()</code>', '<b>4</b> (removed item)'], ['<code>a.splice(0, 1)</code>', '<b>[1]</b> (array of removed)'], ['<code>a.slice(0, 1)</code>', '<b>[2]</b> (copy)'], ['<code>a</code> at the end', '<b>[2, 3]</b>']])}`, code: { lang: 'js', run: true, code: `const a = [1, 2, 3];
console.log(a.push(4));       // 4
console.log(a.pop());         // 4
console.log(a.splice(0, 1));  // [ 1 ]
console.log(a.slice(0, 1));   // [ 2 ]
console.log(a);               // [ 2, 3 ]` } },
      { title: 'Remove an item by value (first match)', html: `<p>Find its index with <code>indexOf</code>, then <code>splice(i, 1)</code>. Always check for <code>-1</code>: <code>splice(-1, 1)</code> would silently delete the <b>last</b> item!</p>${H.arr(['apple', 'kiwi', 'fig'], { hl: { 1: 'r' } })}`, code: { lang: 'js', run: true, code: `function removeFirst(arr, value) {
  const i = arr.indexOf(value);
  if (i !== -1) arr.splice(i, 1); // guard against -1!
  return arr;
}
console.log(removeFirst(['apple', 'kiwi', 'fig'], 'kiwi')); // [ 'apple', 'fig' ]
console.log(removeFirst(['apple', 'fig'], 'mango'));        // unchanged
// The bug without the guard:
const bug = ['apple', 'fig'];
bug.splice(bug.indexOf('mango'), 1);
console.log(bug);                                           // [ 'apple' ]  oops` } },
      { title: 'Holes: why new Array(3).map(...) does nothing', html: `<p><code>new Array(3)</code> creates <b>empty slots</b> (holes), not <code>undefined</code> values. Most iteration methods (<code>map</code>, <code>forEach</code>, <code>filter</code>) <b>skip holes</b>. <code>Array.from</code> and spread turn holes into real <code>undefined</code>s.</p>${H.table(['Expression', 'Result'], [['<code>new Array(3).map(() =&gt; 7)</code>', '<span class="c-r">[ &lt;3 empty items&gt; ]</span>'], ['<code>Array.from({ length: 3 }, () =&gt; 7)</code>', '<span class="c-g">[7, 7, 7]</span>'], ['<code>[...new Array(3)].map(() =&gt; 7)</code>', '<span class="c-g">[7, 7, 7]</span>']])}`, code: { lang: 'js', run: true, code: `console.log(new Array(3).map(() => 7));              // [ <3 empty items> ]
console.log(Array.from({ length: 3 }, () => 7));     // [ 7, 7, 7 ]
console.log([...new Array(3)].map(() => 7));         // [ 7, 7, 7 ]
console.log(new Array(3).fill().map((_, i) => i));   // [ 0, 1, 2 ]` } },
      { title: 'Immutable updates (React-style state)', html: `<p>UI frameworks compare old vs new state by reference, so you must produce a <b>new</b> array instead of mutating. The ES2023 methods make this tidy.</p>${H.table(['Goal', 'Mutating (avoid in state)', 'Copying (use)'], [['add', '<code>todos.push(t)</code>', '<code>[...todos, t]</code>'], ['remove index i', '<code>todos.splice(i, 1)</code>', '<code>todos.toSpliced(i, 1)</code>'], ['replace index i', '<code>todos[i] = t</code>', '<code>todos.with(i, t)</code>'], ['sort', '<code>todos.sort(cmp)</code>', '<code>todos.toSorted(cmp)</code>']])}`, code: { lang: 'js', run: true, code: `const todos = ['wake', 'code', 'sleep'];
const added = [...todos, 'gym'];
const removed = todos.toSpliced(1, 1);
const replaced = todos.with(2, 'nap');
console.log(todos);    // original untouched: [ 'wake', 'code', 'sleep' ]
console.log(added, removed, replaced);
console.log(added === todos); // false — a new array, so a UI can detect the change` } }
    ],
    deepDive: `<p>🟣 <b>Arrays are objects.</b> <code>typeof []</code> is <code>'object'</code>; use <code>Array.isArray</code>. Indexes are really property keys (<code>'0'</code>, <code>'1'</code>…) with a special <code>length</code> that tracks the highest index. Engines optimise heavily: V8 stores arrays in <b>"elements kinds"</b> — packed small integers (PACKED_SMI), packed doubles, packed generic objects, and their <b>HOLEY</b> variants. Transitions only go one way (SMI → DOUBLE → ELEMENTS, PACKED → HOLEY), so writing <code>arr[1000] = 1</code> on a small array or creating holes can permanently push it into a slower representation; very sparse arrays fall back to a dictionary (hash table).</p>
<p><b>Complexity.</b> <code>push</code>/<code>pop</code>: amortised O(1) (the backing store grows by about 1.5× when full). <code>shift</code>/<code>unshift</code>/<code>splice</code> in the middle: O(n) because elements are moved (V8 has a trick for <code>shift</code> on large arrays — "left-trimming" the backing store — but treat it as O(n)). <code>slice</code>, <code>concat</code>, spread: O(k) for the copied part. <code>indexOf</code>/<code>includes</code>: O(n) linear scan — use a <code>Set</code> for repeated membership tests.</p>
<p><b>Equality differences.</b> <code>indexOf</code> uses strict equality (<code>===</code>), which says <code>NaN !== NaN</code>, so it cannot find NaN. <code>includes</code> uses <b>SameValueZero</b>, which finds NaN and treats <code>+0</code> and <code>-0</code> as equal.</p>
<p><b>Shallow copies.</b> <code>slice()</code>, <code>[...arr]</code>, <code>Array.from(arr)</code> and <code>concat()</code> copy only the top level — nested arrays/objects are still shared. For deep copies use <code>structuredClone</code> (see the JSON topic).</p>
<p><b>Array-likes.</b> Strings, <code>arguments</code>, DOM <code>NodeList</code>s have <code>length</code> and indexes but not all array methods. Convert with <code>Array.from(x)</code> or spread (spread needs an iterable). Typed arrays (<code>Int32Array</code>, <code>Float64Array</code>) are fixed-length, single-type, and much faster for numeric work.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> autocomplete writes <code>splice</code>/<code>slice</code> calls in a blink — and mixes them up surprisingly often, or uses <code>arr.indexOf(x)</code> without the <code>-1</code> guard, deleting the last element by accident. It may also suggest <code>shift()</code> in a loop for a BFS queue over a million nodes (quadratic).</p>
<p><b>Use AI as a partner:</b> ask <code>"Which lines in this function mutate their input arrays?"</code>, <code>"Rewrite this state update immutably using ES2023 methods"</code>, or <code>"Generate 10 edge-case calls for splice with negative and out-of-range arguments and the expected results"</code> — then verify them in the console.</p>
<p><b>Where AI goes wrong:</b> claiming <code>push</code> returns the array (so it writes <code>return arr.push(x)</code>), forgetting that ES2023 copy methods need Node 20+ / modern browsers, and treating <code>sort()</code> as non-mutating.</p>
<p><b>What you must still own:</b> the mutate-or-copy decision for every method you call, the return values of the core methods, and big-O awareness (front operations are O(n)).</p>`,
    problems: [{
      title: 'Move Zeros to the End (in place)',
      level: 'Easy', tags: ['arrays', 'in place', 'two pointers', 'splice'], companies: ['Meta', 'Amazon', 'Microsoft'],
      statement: `<p>Given an array <code>nums</code>, move all <code>0</code>s to the end <b>in place</b> while keeping the relative order of the non-zero items. Return the same array.</p>`,
      constraints: `<p>1 ≤ n ≤ 10<sup>5</sup>; must not create a new array (O(1) extra space).</p>`,
      example: `${H.arr([0, 1, 0, 3, 12], { label: 'in', hl: { 0: 'r', 2: 'r' } })}${H.arr([1, 3, 12, 0, 0], { label: 'out', hl: { 3: 'm', 4: 'm' } })}<p>Non-zeros ${H.c('g', '1, 3, 12')} keep their order; the two zeros go to the end.</p>`,
      brute: { why: `<p>Using <code>splice(i, 1)</code> to cut each zero out and <code>push(0)</code> it at the end works, but each splice shifts every later item left — O(n) per zero, O(n²) overall (10<sup>10</sup> moves for 10<sup>5</sup> zeros). You also must not advance <code>i</code> after a removal, and must stop before re-visiting the pushed zeros.</p>`, code: { lang: 'js', run: true, code: `function moveZeroes(nums) {
  let checked = 0, i = 0;
  const n = nums.length;
  while (checked < n) {
    if (nums[i] === 0) {
      nums.splice(i, 1); // O(n): everything after i shifts left
      nums.push(0);      // put the zero at the end
    } else {
      i++;               // only move on when we kept the item
    }
    checked++;
  }
  return nums;
}
console.log(moveZeroes([0, 1, 0, 3, 12])); // [ 1, 3, 12, 0, 0 ]` } },
      mcq: { q: 'What is the key idea that avoids O(n²) shifting?', options: ['Keep a "write" index: copy each non-zero to the next write slot, then fill the rest with zeros', 'Sort the array descending', 'Use filter and concat', 'Use unshift for non-zeros'], answer: 0, explain: 'filter/concat creates a new array (violates in-place). A write pointer touches each item a constant number of times: O(n).' },
      hints: [`<p>You never need to <i>remove</i> anything. Think of compacting non-zeros to the front, like squeezing toothpaste.</p>`, `<p>Keep <code>write = 0</code>. For each item, if it is non-zero, put it at <code>nums[write]</code> and do <code>write++</code>.</p>`, `<p>After the loop, every slot from <code>write</code> to the end must become 0. Edge cases: no zeros (write reaches n), all zeros (write stays 0).</p>`],
      solution: {
        approach: `<p>Two pointers: <code>read</code> scans every item; <code>write</code> marks where the next non-zero belongs. Non-zeros are copied forward in order; then the tail is filled with zeros. Each element is read once and written at most twice.</p>`,
        code: { lang: 'js', run: true, code: `function moveZeroes(nums) {
  let write = 0;                       // next slot for a non-zero value
  for (let read = 0; read < nums.length; read++) {
    if (nums[read] !== 0) {
      nums[write] = nums[read];        // compact non-zeros to the front, in order
      write++;
    }
  }
  for (let i = write; i < nums.length; i++) {
    nums[i] = 0;                       // fill the remaining tail with zeros
  }
  return nums;                         // same array object (in place)
}

const data = [0, 1, 0, 3, 12];
const result = moveZeroes(data);
console.log(result, result === data); // [ 1, 3, 12, 0, 0 ] true
console.log(moveZeroes([0, 0, 1]));   // [ 1, 0, 0 ]
console.log(moveZeroes([4, 5]));      // [ 4, 5 ]` },
        dry: { head: ['read', 'nums[read]', 'action', 'write after', 'array state'], rows: [
          ['0', '0', 'skip', '0', '[0, 1, 0, 3, 12]'],
          ['1', '1', 'nums[0] = 1', '1', '[1, 1, 0, 3, 12]'],
          ['2', '0', 'skip', '1', '[1, 1, 0, 3, 12]'],
          ['3', '3', 'nums[1] = 3', '2', '[1, 3, 0, 3, 12]'],
          ['4', '12', 'nums[2] = 12', '3', '[1, 3, 12, 3, 12]'],
          ['fill', '—', 'indices 3..4 = 0', '3', '<span class="c-g">[1, 3, 12, 0, 0]</span>']
        ] },
        complexity: `<p>Time O(n), extra space O(1). The splice version is O(n²) in the worst case.</p>`,
        followUps: ['Minimise writes: swap instead of copy-then-fill', 'Move all items equal to <code>k</code> to the end', 'Do it immutably in one line with <code>filter</code> (what is the space cost?)']
      }
    }]
  });

  registerModule({ id: 'js02', title: 'Functions, Arrays & Objects', intro: '<p>stub</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
