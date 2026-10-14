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

  /* ================= TOPIC 4: Iteration methods — forEach, map, filter, find, some/every, flatMap ================= */
  topics.push({
    title: 'Arrays II: map, filter, find, some/every, forEach & Method Pipelines',
    analogy: `<p>Picture a <b>factory conveyor belt</b> of apples. <code>filter</code> is a worker who <b>throws out bruised apples</b> (fewer come out than went in). <code>map</code> is a machine that <b>turns every apple into juice</b> (same count, new shape). <code>find</code> is a quality inspector who walks along until she spots <b>the first</b> golden apple, grabs it and <b>stops walking</b>. <code>some</code> asks "is there <i>at least one</i> rotten apple?", <code>every</code> asks "are they <i>all</i> fresh?". Chain the stations and you have a <b>pipeline</b>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Instead of writing a <code>for</code> loop and managing an index yourself, you hand the array a small function (a <b>callback</b>) and the method runs it for each item. Every callback receives <code>(element, index, array)</code> — most of the time you only use the first.</p>
${H.table(['Method', 'Question it answers', 'Returns', 'Stops early?'], [
  ['<code>map(fn)</code>', '"Turn each item into something else"', 'new array, <b>same length</b>', 'no'],
  ['<code>filter(fn)</code>', '"Keep only items that pass"', 'new array, length ≤ original', 'no'],
  ['<code>find(fn)</code>', '"Give me the first match"', 'the item, or <code>undefined</code>', '<span class="c-g">yes</span>'],
  ['<code>findIndex(fn)</code>', '"Where is the first match?"', 'index, or <code>-1</code>', '<span class="c-g">yes</span>'],
  ['<code>findLast</code> / <code>findLastIndex</code>', 'same, searching from the end (ES2023)', 'item / index', '<span class="c-g">yes</span>'],
  ['<code>some(fn)</code>', '"Does at least one pass?"', 'boolean', '<span class="c-g">yes, on first true</span>'],
  ['<code>every(fn)</code>', '"Do all pass?"', 'boolean (<code>true</code> for an empty array!)', '<span class="c-g">yes, on first false</span>'],
  ['<code>forEach(fn)</code>', '"Just do something with each"', '<code>undefined</code>', 'no (cannot <code>break</code>)'],
  ['<code>flatMap(fn)</code>', '"Map, then flatten one level"', 'new array', 'no']
])}
<p><b>Pipelines.</b> Because <code>map</code> and <code>filter</code> return arrays, you can chain them: <code>orders.filter(o =&gt; o.paid).map(o =&gt; o.total)</code>. Read it like a sentence: "take orders, keep the paid ones, give me their totals". The <b>original array is never changed</b>.</p>
<p><b>Picking the right tool:</b> want one item → <code>find</code> (not <code>filter(...)[0]</code>, which scans everything). Want yes/no → <code>some</code>/<code>every</code> (not <code>filter(...).length &gt; 0</code>). Want a side effect only (logging, pushing to an outside list) → <code>forEach</code> or <code>for...of</code>. Want to <code>break</code>, <code>await</code> in order, or squeeze out speed → a plain <code>for...of</code> loop.</p>
<p><b>Golden rule for <code>map</code>:</b> the callback must <b>return</b> something. An arrow with braces and no <code>return</code> gives you an array of <code>undefined</code>s.</p>`,
    clues: [
      '"transform each element" / "convert to" / "extract the field" → <code>map</code>',
      '"only the items that…" / "remove those that…" → <code>filter</code>',
      '"first item that…" / "look up by id" → <code>find</code> / <code>findIndex</code> (stops early)',
      '"is there any…" / "contains at least one" → <code>some</code>; "are all…" / "validate every" → <code>every</code>',
      '"each item produces several items" / "map then flatten" → <code>flatMap</code>',
      '"need to break out early" / "await each item in order" → <code>for...of</code>, not <code>forEach</code>',
      '"<code>[\'1\',\'2\',\'3\'].map(parseInt)</code>" → callback receives (value, index) — classic trap'
    ],
    code: [{ lang: 'js', run: true, title: 'The core iteration methods (runnable)', code: `const products = [
  { name: 'pen', price: 20, inStock: true },
  { name: 'book', price: 350, inStock: false },
  { name: 'bag', price: 1200, inStock: true },
  { name: 'cap', price: 250, inStock: true },
];

// map: same length, new shape
const names = products.map(p => p.name);
console.log(names); // [ 'pen', 'book', 'bag', 'cap' ]

// filter: keep the ones that pass
const available = products.filter(p => p.inStock);
console.log(available.length); // 3

// find / findIndex: first match, then STOP
console.log(products.find(p => p.price > 300).name);   // book
console.log(products.findIndex(p => p.name === 'cap')); // 3
console.log(products.find(p => p.price > 5000));        // undefined

// some / every: yes-or-no questions
console.log(products.some(p => !p.inStock));  // true (book)
console.log(products.every(p => p.price > 0)); // true
console.log([].every(p => false));             // true (vacuous truth!)

// pipeline: in-stock items under 1000, as labels
const labels = products
  .filter(p => p.inStock)
  .filter(p => p.price < 1000)
  .map(p => p.name.toUpperCase() + ' - Rs ' + p.price);
console.log(labels); // [ 'PEN - Rs 20', 'CAP - Rs 250' ]

// index argument
console.log(['a', 'b', 'c'].map((ch, i) => i + ':' + ch)); // [ '0:a', '1:b', '2:c' ]

// flatMap: each sentence -> many words, flattened one level
console.log(['hi there', 'good day'].flatMap(s => s.split(' '))); // [ 'hi', 'there', 'good', 'day' ]

// forEach: side effects only, returns undefined
let total = 0;
const ret = products.forEach(p => { total += p.price; });
console.log(total, ret); // 1820 undefined` },
    { lang: 'js', run: true, title: 'Same job: loop vs methods, and when the loop wins', code: `const scores = [45, 82, 67, 91, 38, 74];

// Old school: manual loop
const passedLoop = [];
for (let i = 0; i < scores.length; i++) {
  if (scores[i] >= 50) passedLoop.push(scores[i] + 5); // +5 grace marks
}

// New school: declarative pipeline (says WHAT, not HOW)
const passedChain = scores.filter(s => s >= 50).map(s => s + 5);
console.log(passedLoop, passedChain); // both [ 87, 72, 96, 79 ]

// A loop is better when you need to stop early with a complex condition:
let firstFail = null;
for (const s of scores) {
  if (s < 40) { firstFail = s; break; } // forEach cannot break
}
console.log('first fail:', firstFail); // 38

// ... though find often does the same job:
console.log(scores.find(s => s < 40)); // 38

// Gotcha: map with braces but no return
console.log([1, 2, 3].map(n => { n * 2; })); // [ undefined, undefined, undefined ]` }],
    codeTitle: ['map / filter / find / some / every / flatMap', 'Loop vs method chain'],
    viz: [{
      title: 'Pipeline: nums.filter(even).map(×10).find(> 50)',
      input: '3 8 1 12 7 4 10',
      inputLabel: 'Numbers (space separated, up to 10)',
      gen: function (input) {
        var a = nums(input, 1, 10);
        a.forEach(function (x) { if (Math.abs(x) > 9999 || x !== Math.trunc(x)) throw new Error('Use whole numbers between -9999 and 9999'); });
        var code = ['const result = nums', '  .filter(n => n % 2 === 0)   // keep evens', '  .map(n => n * 10)           // scale', '  .find(n => n > 50);         // first big one'].join('\n');
        var f = [], kept = [], keepHl = {};
        f.push(fr('Source array <code>nums</code>. Each method will run its callback on <b>every</b> item (except <code>find</code>, which stops at the first match). The original is never changed.', [cp(code, 1), ap('nums', a, {}, {})]));
        a.forEach(function (x, i) {
          var ok = x % 2 === 0, hl = {}, p = {};
          hl[i] = ok ? 'ok' : 'bad'; p[i] = 'n';
          if (ok) { kept.push(x); }
          keepHl[i] = ok ? 'ok' : 'done';
          f.push(fr('<b>filter</b> callback on index ' + i + ': <code>' + x + ' % 2 === 0</code> → ' + (ok ? '<span class="c-g">true, keep</span>' : '<span class="c-r">false, drop</span>') + '.', [cp(code, 2), ap('nums', a, hl, p), ap('filter result (building)', kept.slice(), kept.length && ok ? (function () { var h = {}; h[kept.length - 1] = 'ok'; return h; })() : {}, {})]));
        });
        if (!kept.length) {
          f.push(fr('No even numbers, so <code>filter</code> returns <b>[]</b>. <code>map</code> on an empty array returns <b>[]</b>, and <code>find</code> returns <b>undefined</b>. No error — empty arrays flow through pipelines safely.', [cp(code, 4, 'bad'), ap('filter result', [], {}, {}), vp({ result: undefined }, 'result', 'bad', 'Result')]));
          return f;
        }
        var mapped = [];
        kept.forEach(function (x, i) {
          mapped.push(x * 10);
          var hl = {}; hl[i] = 'cur';
          var mh = {}; mh[i] = 'ok';
          f.push(fr('<b>map</b> callback on ' + x + ' → returns <b>' + (x * 10) + '</b>. map always produces exactly one output per input.', [cp(code, 3), ap('filter result', kept, hl, {}), ap('map result (building)', mapped.slice(), mh, {})]));
        });
        var found;
        for (var j = 0; j < mapped.length; j++) {
          var hit = mapped[j] > 50, h2 = {}, p2 = {};
          for (var q = 0; q < j; q++) h2[q] = 'done';
          h2[j] = hit ? 'sel' : 'bad'; p2[j] = 'n';
          f.push(fr('<b>find</b> checks ' + mapped[j] + ' &gt; 50 → ' + (hit ? '<span class="c-g">true — return it and STOP.</span>' + (j < mapped.length - 1 ? ' The remaining ' + (mapped.length - 1 - j) + ' item(s) are never visited.' : '') : '<span class="c-r">false</span>, move on.'), [cp(code, 4, hit ? 'ok' : 'cur'), ap('map result', mapped, h2, p2)]));
          if (hit) { found = mapped[j]; break; }
        }
        f.push(fr('Final: <code>result = ' + esc(show(found)) + '</code>. ' + (found === undefined ? 'Nothing passed, so find returned <b>undefined</b>.' : '') + ' Work done: filter ran ' + a.length + ' callbacks, map ' + kept.length + ', find ' + (found === undefined ? mapped.length : mapped.indexOf(found) + 1) + '. Each step built a new array in between.', [ap('nums (unchanged)', a, {}, {}), vp({ result: found, 'filter calls': a.length, 'map calls': kept.length }, 'result', 'sel', 'Result')]));
        return f;
      }
    }, {
      title: 'Predict the output: [\'1\', \'2\', \'3\'].map(parseInt)',
      gen: function () {
        var code = "['1', '2', '3'].map(parseInt);\n// map calls parseInt(element, index, array)\n// parseInt(string, radix)";
        var src = ['1', '2', '3'];
        return [
          fr('Looks like it should give <code>[1, 2, 3]</code>. But <code>map</code> passes <b>three</b> arguments to the callback: element, <b>index</b>, array. <code>parseInt</code> takes a second argument too: the <b>radix</b> (number base).', [cp(code, 1), ap('source', src, {}, {})]),
          fr('Index 0: <code>parseInt(\'1\', 0)</code>. Radix 0 means "guess" → base 10 → <b>1</b>.', [cp(code, 2), ap('source', src, { 0: 'cur' }, { 0: 'radix 0' }), ap('result (building)', [1], { 0: 'ok' }, {})]),
          fr('Index 1: <code>parseInt(\'2\', 1)</code>. Base 1 is invalid (radix must be 2–36) → <b>NaN</b>.', [cp(code, 3, 'bad'), ap('source', src, { 1: 'bad' }, { 1: 'radix 1' }), ap('result (building)', [1, NaN], { 1: 'bad' }, {})]),
          fr('Index 2: <code>parseInt(\'3\', 2)</code>. In base 2 only digits 0 and 1 exist; "3" is not a valid binary digit → <b>NaN</b>.', [cp(code, 3, 'bad'), ap('source', src, { 2: 'bad' }, { 2: 'radix 2' }), ap('result', [1, NaN, NaN], { 1: 'bad', 2: 'bad' }, {})]),
          fr('Output: <b>[1, NaN, NaN]</b>. Fix: control the arguments yourself — <code>.map(s =&gt; parseInt(s, 10))</code> or simply <code>.map(Number)</code> (Number ignores extra arguments).', [ap('.map(Number)', [1, 2, 3], { 0: 'ok', 1: 'ok', 2: 'ok' }, {}), tx('Lesson: when you pass a function <i>reference</i> as a callback, it receives <b>all</b> the arguments the method sends.', 'Takeaway')])
        ];
      }
    }],
    examples: [
      { title: 'find vs filter()[0] — same answer, different work', html: `<p>On 1 000 000 users where the match is at index 3, <code>find</code> runs 4 callbacks; <code>filter(...)[0]</code> runs <b>1 000 000</b> and also builds a throwaway array.</p>${H.table(['Expression', 'Callbacks run', 'Extra array?'], [['<code>users.find(u =&gt; u.id === 3)</code>', '4', 'no'], ['<code>users.filter(u =&gt; u.id === 3)[0]</code>', '1 000 000', 'yes']])}`, code: { lang: 'js', run: true, code: `const users = Array.from({ length: 1000000 }, (_, i) => ({ id: i }));
let calls = 0;
users.find(u => { calls++; return u.id === 3; });
console.log('find callbacks:', calls);     // 4
calls = 0;
users.filter(u => { calls++; return u.id === 3; })[0];
console.log('filter callbacks:', calls);   // 1000000` } },
      { title: 'Predict the output: some/every on empty arrays', html: `<p>"Every item in an empty box is red" is (vacuously) <b>true</b>; "some item is red" is <b>false</b>. Remember this when validating possibly-empty input: <code>items.every(isValid)</code> passes for <code>[]</code>!</p>${H.table(['Expression', 'Result'], [['<code>[].every(x =&gt; x &gt; 0)</code>', '<b>true</b>'], ['<code>[].some(x =&gt; x &gt; 0)</code>', '<b>false</b>'], ['<code>[1, -2].every(x =&gt; x &gt; 0)</code>', '<b>false</b> (stops at -2)']])}`, code: { lang: 'js', run: true, code: `console.log([].every(x => x > 0));       // true
console.log([].some(x => x > 0));        // false
console.log([1, -2, 3].every(x => x > 0)); // false
// Safer validation when empty input should fail:
const isValidList = list => list.length > 0 && list.every(x => x > 0);
console.log(isValidList([]));            // false` } },
      { title: 'flatMap to filter and map in one pass', html: `<p>Return <code>[]</code> to drop an item, <code>[value]</code> to keep a transformed one, or <code>[a, b]</code> to emit two. Here we parse strings, keeping only valid numbers, doubled.</p>${H.arr(['4', 'x', '10', ''], { label: 'input', hl: { 1: 'r', 3: 'r' } })}${H.arr([8, 20], { label: 'output', hl: { 0: 'g', 1: 'g' } })}`, code: { lang: 'js', run: true, code: `const raw = ['4', 'x', '10', ''];
const doubled = raw.flatMap(s => {
  const n = Number(s);
  return s.trim() !== '' && Number.isFinite(n) ? [n * 2] : []; // [] = skip
});
console.log(doubled); // [ 8, 20 ]` } },
      { title: 'forEach does not wait for async callbacks', html: `<p><code>forEach</code> ignores the promises returned by an <code>async</code> callback, so "done" prints before the work finishes. Use <code>for...of</code> with <code>await</code> (sequential) or <code>Promise.all(items.map(...))</code> (parallel). You will meet this properly in the async modules.</p>`, code: { lang: 'js', run: true, code: `const wait = ms => new Promise(r => setTimeout(r, ms));
async function demo() {
  [30, 10].forEach(async ms => { await wait(ms); console.log('forEach item', ms); });
  console.log('forEach "done" (too early!)');
  for (const ms of [30, 10]) { await wait(ms); console.log('for...of item', ms); }
  console.log('for...of done (really done)');
}
demo();` } }
    ],
    deepDive: `<p>🟣 <b>What the spec actually does.</b> Methods like <code>map</code> read <code>length</code> <b>once</b> at the start, then for each index <code>k</code> check <code>k in array</code> (so <b>holes are skipped</b>) and call the callback with <code>(element, k, array)</code>. Items appended during iteration are not visited; items deleted before being reached are skipped. Mutating the array inside the callback is legal but confusing — don't.</p>
<p><b>The second argument <code>thisArg</code>.</b> <code>arr.map(fn, ctx)</code> calls <code>fn</code> with <code>this = ctx</code>. Arrow functions ignore it (lexical <code>this</code>). Rarely needed today.</p>
<p><b>Performance reality.</b> V8 inlines <code>map</code>/<code>filter</code>/<code>forEach</code> with monomorphic callbacks, so for normal sizes they are within a small factor of a hand loop. The real cost of long chains is <b>intermediate arrays</b>: <code>a.filter().map().slice(0, 5)</code> allocates two full arrays to keep five items. For huge or infinite data, ES2025 <b>iterator helpers</b> (Chrome 122+, Node 22+) give <b>lazy</b> pipelines: <code>arr.values().filter(f).map(g).take(5).toArray()</code> only touches what it needs.</p>
<p><b>Generic methods.</b> Array methods work on any array-like via <code>call</code>: <code>Array.prototype.map.call('abc', c =&gt; c.toUpperCase())</code>. They also respect <code>Symbol.species</code> for subclasses (an <code>class MyList extends Array</code> returns MyList from map).</p>
<p><b>Truthiness in filter.</b> <code>arr.filter(Boolean)</code> removes all falsy values — including <code>0</code> and <code>''</code>, which may be real data. Be explicit (<code>x =&gt; x != null</code>) when 0 matters.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI loves long method chains — they look elegant and are easy to generate. Most are fine, but watch for <code>filter(...)[0]</code> instead of <code>find</code>, <code>filter(...).length &gt; 0</code> instead of <code>some</code>, <code>forEach</code> with <code>async</code> callbacks, and <code>.map(parseInt)</code>-style point-free calls.</p>
<p><b>Use AI as a partner:</b> <code>"Convert this for-loop into a filter/map pipeline and tell me if the behaviour differs for empty arrays or holes"</code>, <code>"Which of these chains could stop early?"</code>, <code>"Rewrite this hot path as a single loop and estimate the allocation savings"</code>.</p>
<p><b>Where AI goes wrong:</b> it may call <code>map</code> purely for side effects (wasting an array), forget that <code>every([])</code> is true, or chain five passes over a 10 M-row array in a performance-sensitive loop.</p>
<p><b>What you must still own:</b> picking the method that matches the question (one item / yes-no / transform / subset), predicting outputs including edge cases, and knowing when a plain loop is the clearer or faster tool.</p>`,
    problems: [{
      title: 'Order Report Pipeline',
      level: 'Medium', tags: ['map', 'filter', 'pipeline', 'objects'], companies: ['Shopify', 'Amazon', 'Razorpay'],
      statement: `<p>Each order looks like <code>{ id, status, items: [{ price, qty }] }</code>. Return an array of <code>{ id, total }</code> for orders whose <code>status</code> is <code>'paid'</code> and whose total (sum of <code>price × qty</code>) is <b>at least 100</b>, in the original order. Do not mutate the input.</p>`,
      constraints: `<p>0 ≤ orders ≤ 10<sup>5</sup>; each order has 0–50 items; prices are integers (cents) so no floating-point issues.</p>`,
      example: `${H.table(['id', 'status', 'items', 'total', 'kept?'], [['A1', 'paid', '2×30, 1×50', '110', H.c('g', 'yes')], ['A2', 'pending', '1×500', '500', H.c('r', 'no (not paid)')], ['A3', 'paid', '3×20', '60', H.c('r', 'no (&lt; 100)')], ['A4', 'paid', '(none)', '0', H.c('r', 'no')]])}<p>Output: <code>[{ id: 'A1', total: 110 }]</code></p>`,
      brute: { why: `<p>This version computes the total <b>twice</b> per order (once to test, once to output) and does it for unpaid orders too. It also builds the result by pushing in a loop with nested loops — easy to get wrong and hard to read.</p>`, code: { lang: 'js', run: true, code: `function report(orders) {
  const out = [];
  for (const o of orders) {
    let t1 = 0;
    for (const it of o.items) t1 += it.price * it.qty;   // total #1 (even for unpaid)
    if (o.status === 'paid' && t1 >= 100) {
      let t2 = 0;
      for (const it of o.items) t2 += it.price * it.qty; // total #2 (wasted)
      out.push({ id: o.id, total: t2 });
    }
  }
  return out;
}
console.log(report([{ id: 'A1', status: 'paid', items: [{ price: 30, qty: 2 }, { price: 50, qty: 1 }] }]));` } },
      mcq: { q: 'Which order of steps does the least work?', options: ['filter by status → map to {id, total} → filter by total', 'map to totals for all → filter by status → filter by total', 'sort by total → filter → map', 'forEach and push'], answer: 0, explain: 'The cheap status check removes unpaid orders before the expensive total calculation; the total is computed once in map and reused by the second filter.' },
      hints: [`<p>Do the <b>cheap</b> filter first (status), the <b>expensive</b> calculation once (total), then the filter that needs it.</p>`, `<p>Total of one order: <code>o.items.reduce((s, it) =&gt; s + it.price * it.qty, 0)</code> — or a <code>for...of</code> if reduce feels new (next topic!).</p>`, `<p>Recipe: <code>orders.filter(paid).map(o =&gt; ({ id: o.id, total: totalOf(o) })).filter(r =&gt; r.total &gt;= 100)</code>. Remember the brackets around the object literal. Empty items → total 0.</p>`],
      solution: {
        approach: `<p>Three-station pipeline: cheap filter → map that computes each total exactly once into a new small object → filter on the computed total. Pure: the input array and its objects are never modified.</p>`,
        code: { lang: 'js', run: true, code: `// Sum of price * qty for one order (0 for no items).
const totalOf = order => order.items.reduce((sum, it) => sum + it.price * it.qty, 0);

function report(orders) {
  return orders
    .filter(o => o.status === 'paid')               // cheap test first
    .map(o => ({ id: o.id, total: totalOf(o) }))    // compute total ONCE
    .filter(row => row.total >= 100);               // uses the computed total
}

const orders = [
  { id: 'A1', status: 'paid', items: [{ price: 30, qty: 2 }, { price: 50, qty: 1 }] },
  { id: 'A2', status: 'pending', items: [{ price: 500, qty: 1 }] },
  { id: 'A3', status: 'paid', items: [{ price: 20, qty: 3 }] },
  { id: 'A4', status: 'paid', items: [] },
  { id: 'A5', status: 'paid', items: [{ price: 100, qty: 1 }] },
];
console.log(report(orders)); // [ { id: 'A1', total: 110 }, { id: 'A5', total: 100 } ]
console.log(report([]));     // []` },
        dry: { head: ['order', 'status filter', 'total (map)', 'total filter', 'in output?'], rows: [
          ['A1', 'pass', '60 + 50 = 110', '110 ≥ 100 pass', '<span class="c-g">yes</span>'],
          ['A2', '<span class="c-r">drop</span>', '— (never computed)', '—', 'no'],
          ['A3', 'pass', '60', '<span class="c-r">drop</span>', 'no'],
          ['A4', 'pass', '0 (no items)', '<span class="c-r">drop</span>', 'no'],
          ['A5', 'pass', '100', '100 ≥ 100 pass', '<span class="c-g">yes</span>']
        ] },
        complexity: `<p>Time O(total items across paid orders + number of orders). Space O(paid orders) for the intermediate arrays; a single loop could avoid them if this ran on millions of rows.</p>`,
        followUps: ['Also return the grand total of the report', 'Sort the report by total descending (without mutating)', 'Rewrite as a single <code>reduce</code> or <code>flatMap</code> pass — is it clearer?']
      }
    }]
  });

  /* ================= TOPIC 5: reduce ================= */
  topics.push({
    title: 'Arrays III: reduce — Folding a List into One Value',
    analogy: `<p>Think of a <b>snowball rolling down a hill</b>. It starts small (the <b>initial value</b>). Each time it rolls over a patch of snow (an <b>array item</b>), it picks some up and becomes a slightly bigger snowball (the <b>accumulator</b>). At the bottom you have <b>one</b> big snowball — the result. The snowball can be anything: a number (a total), an object (a tally sheet), an array (a collection), even a function.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>reduce</code> walks the array and keeps <b>one running value</b> (the accumulator, usually called <code>acc</code>). For each item, your callback receives the current <code>acc</code> and the item, and must <b>return the new <code>acc</code></b>. After the last item, that value is the answer.</p>
<pre>const total = [5, 3, 9].reduce((acc, x) =&gt; acc + x, 0);</pre>
${H.table(['Step', 'acc (in)', 'x', 'returned → new acc'], [['start', '—', '—', '<b>0</b> (initial value)'], ['1', '0', '5', '5'], ['2', '5', '3', '8'], ['3', '8', '9', '<span class="c-g">17</span> ← result']])}
<p><b>Signature:</b> <code>arr.reduce((acc, item, index, array) =&gt; newAcc, initialValue)</code>.</p>
<p><b>Always pass an initial value</b> (beginners' safety rule). Without it, the <b>first item becomes the starting acc</b> and the loop begins at index 1 — which is fine for sums, but on an <b>empty array</b> it throws <code>TypeError: Reduce of empty array with no initial value</code>, and it breaks when acc should be a different type (an object or array) than the items.</p>
<p><b>What the accumulator can be:</b></p>
${H.table(['Goal', 'Initial value', 'Callback returns'], [
  ['sum / product', '<code>0</code> / <code>1</code>', '<code>acc + x</code> / <code>acc * x</code>'],
  ['max / min', '<code>-Infinity</code> / <code>Infinity</code>', '<code>Math.max(acc, x)</code>'],
  ['count occurrences', '<code>{}</code>', 'acc with <code>acc[x] = (acc[x] ?? 0) + 1</code>'],
  ['group by key', '<code>{}</code>', 'acc with item pushed into <code>acc[key]</code>'],
  ['index by id', '<code>{}</code> or <code>new Map()</code>', 'acc with <code>acc[item.id] = item</code>'],
  ['flatten', '<code>[]</code>', '<code>acc.concat(x)</code>'],
]) }
<p><b>The #1 bug:</b> forgetting to <code>return acc</code> from a callback with braces. The next step then receives <code>undefined</code> and crashes or produces <code>NaN</code>.</p>
<p><b>When NOT to use reduce:</b> if <code>map</code>, <code>filter</code>, <code>some</code>, a simple <code>for...of</code>, or a built-in like <code>Math.max(...)</code> / <code>Object.groupBy</code> (ES2024) says it more clearly, use that. reduce is powerful but can become unreadable fast.</p>`,
    clues: [
      '"sum / total / product / average of an array" → <code>reduce</code> with a numeric initial value',
      '"count occurrences" / "frequency" / "histogram" → reduce into an object or Map',
      '"group by category" / "bucket by key" → reduce into <code>{ key: [...] }</code> (or <code>Object.groupBy</code>)',
      '"convert an array to an object keyed by id" / "lookup table" → reduce (or <code>Object.fromEntries(arr.map(...))</code>)',
      '"combine/compose a list of functions" / "pipe" → <code>fns.reduce((v, f) =&gt; f(v), x)</code>',
      '"TypeError: Reduce of empty array with no initial value" → add the initial value',
      '"NaN" or "Cannot read properties of undefined" inside reduce → callback forgot <code>return acc</code>'
    ],
    code: [{ lang: 'js', run: true, title: 'reduce recipes (runnable)', code: `const nums = [5, 3, 9, 2];

// Sum: acc starts at 0
const sum = nums.reduce((acc, x) => acc + x, 0);
console.log('sum', sum); // 19

// Max: start at -Infinity so any number beats it
const max = nums.reduce((acc, x) => Math.max(acc, x), -Infinity);
console.log('max', max); // 9

// Average: reduce for the total, then divide (guard empty arrays)
const avg = nums.length ? sum / nums.length : 0;
console.log('avg', avg); // 4.75

// Count occurrences into an object
const fruits = ['apple', 'kiwi', 'apple', 'fig', 'kiwi', 'apple'];
const counts = fruits.reduce((acc, f) => {
  acc[f] = (acc[f] ?? 0) + 1; // missing key -> start from 0
  return acc;                 // ALWAYS return the accumulator
}, {});
console.log(counts); // { apple: 3, kiwi: 2, fig: 1 }

// Group by a computed key
const people = [
  { name: 'Asha', city: 'Pune' },
  { name: 'Ben', city: 'Delhi' },
  { name: 'Cy', city: 'Pune' },
];
const byCity = people.reduce((acc, p) => {
  (acc[p.city] ??= []).push(p.name); // create the bucket on first use
  return acc;
}, {});
console.log(byCity); // { Pune: [ 'Asha', 'Cy' ], Delhi: [ 'Ben' ] }

// Index by id for O(1) lookups later
const byName = people.reduce((acc, p) => { acc[p.name] = p; return acc; }, {});
console.log(byName.Ben.city); // Delhi

// Flatten one level
console.log([[1, 2], [3], [4, 5]].reduce((acc, a) => acc.concat(a), [])); // [ 1, 2, 3, 4, 5 ]

// Pipe: apply a list of functions in order
const pipeline = [s => s.trim(), s => s.toUpperCase(), s => s + '!'];
console.log(pipeline.reduce((value, fn) => fn(value), '  hello ')); // HELLO!` },
    { lang: 'js', run: true, title: 'No initial value, reduceRight, and Object.groupBy', code: `// Without an initial value, the first element is the starting accumulator.
console.log([5, 3, 9].reduce((acc, x) => acc + x)); // 17 (callback ran only twice)

// ...which throws on an empty array:
try {
  [].reduce((acc, x) => acc + x);
} catch (e) {
  console.log(e.name + ': ' + e.message);
}
console.log([].reduce((acc, x) => acc + x, 0)); // 0 — safe with an initial value

// Forgot to return acc:
const broken = [1, 2, 3].reduce((acc, x) => { acc + x; }, 0);
console.log(broken); // undefined

// reduceRight walks from the end
console.log(['a', 'b', 'c'].reduceRight((acc, ch) => acc + ch, '')); // cba

// ES2024 built-in grouping (Node 21+, modern browsers): returns a null-prototype object
if (typeof Object.groupBy === 'function') {
  const grouped = Object.groupBy([1, 2, 3, 4, 5], n => (n % 2 ? 'odd' : 'even'));
  console.log({ ...grouped }); // { odd: [ 1, 3, 5 ], even: [ 2, 4 ] }
}` }],
    codeTitle: ['reduce recipes', 'Edge cases & alternatives'],
    viz: [{
      title: 'The accumulator rolling: nums.reduce((acc, x) => acc + x, 0)',
      input: '5 3 9 2',
      inputLabel: 'Numbers (space separated, up to 10)',
      gen: function (input) {
        var a = nums(input, 1, 10);
        var code = ['const total = nums.reduce(', '  (acc, x, i) => acc + x,   // return the new acc', '  0                          // initial value', ');'].join('\n');
        var f = [], acc = 0, hist = [0];
        f.push(fr('Before the first item, <code>acc</code> is set to the <b>initial value 0</b>. Think: an empty snowball.', [cp(code, 3, 'ok'), ap('nums', a, {}, {}), vp({ acc: 0 }, 'acc', 'ok', 'Accumulator'), { type: 'bars', label: 'acc after each step', values: hist.slice(), idxLabels: ['start'] }]));
        a.forEach(function (x, i) {
          var before = acc;
          acc = acc + x;
          hist.push(acc);
          var hl = {}, p = {};
          for (var k = 0; k < i; k++) hl[k] = 'done';
          hl[i] = 'cur'; p[i] = 'x';
          var lbls = ['start'].concat(a.slice(0, i + 1).map(function (_, j) { return 'i=' + j; }));
          f.push(fr('i = ' + i + ': callback gets <code>acc = ' + before + '</code>, <code>x = ' + x + '</code> and returns <code>' + before + ' + ' + x + ' = ' + acc + '</code>. That return value <b>becomes</b> the next acc.', [cp(code, 2), ap('nums', a, hl, p), vp({ 'acc (in)': before, x: x, i: i, 'returned (new acc)': acc }, 'returned (new acc)', 'ok', 'Accumulator'), { type: 'bars', label: 'acc after each step', values: hist.slice(), idxLabels: lbls, hl: (function () { var h = {}; h[hist.length - 1] = 'cur'; return h; })() }]));
        });
        f.push(fr('No items left. reduce returns the last acc: <code>total = ' + acc + '</code>. The callback ran <b>' + a.length + '</b> times — once per item because we gave an initial value.', [cp(code, 4, 'ok'), vp({ total: acc }, 'total', 'sel', 'Result')]));
        var noInit = a.slice(1).reduce(function (s, x) { return s + x; }, a[0]);
        f.push(fr('Without the <code>0</code>, acc would start as <b>' + a[0] + '</b> (the first item) and the callback would run only <b>' + (a.length - 1) + '</b> times. Same total here (' + noInit + '), but on an <b>empty</b> array that version throws a TypeError.', [ap('nums', a, { 0: 'sel' }, { 0: 'initial acc' }), vp({ 'callbacks with init': a.length, 'callbacks without init': a.length - 1, '[].reduce(fn)': 'TypeError' }, '[].reduce(fn)', 'bad', 'Comparison')]));
        return f;
      }
    }, {
      title: 'Group words by first letter with reduce',
      input: 'apple avocado banana blueberry cherry apricot',
      inputLabel: 'Words (space separated, up to 10)',
      gen: function (input) {
        var w = words(input, 1, 10);
        var code = ['const groups = words.reduce((acc, word) => {', '  const key = word[0];', '  (acc[key] ??= []).push(word);', '  return acc;', '}, {});'].join('\n');
        var f = [], acc = {};
        function entries(o) { return Object.keys(o).map(function (k) { return [k, '[' + o[k].join(', ') + ']']; }); }
        f.push(fr('Initial accumulator: an empty object <code>{}</code> — our tally sheet with no rows yet.', [cp(code, 5, 'ok'), ap('words', w, {}, {}), { type: 'map', label: 'acc', entries: [] }]));
        w.forEach(function (word, i) {
          var key = word.charAt(0), isNew = !acc[key];
          if (isNew) acc[key] = [];
          acc[key].push(word);
          var hl = {}, p = {}, mh = {};
          for (var k = 0; k < i; k++) hl[k] = 'done';
          hl[i] = 'cur'; p[i] = 'word';
          mh[key] = isNew ? 'ok' : 'cur';
          f.push(fr('"' + esc(word) + '" → key <b>' + esc(key) + '</b>. ' + (isNew ? 'No bucket yet, so <code>??=</code> creates <code>[]</code>, then we push.' : 'Bucket exists, just push.') + ' Return the <b>same</b> acc object.', [cp(code, isNew ? 3 : 3), ap('words', w, hl, p), { type: 'map', label: 'acc', entries: entries(acc), hl: mh }]));
        });
        f.push(fr('Done: <b>' + Object.keys(acc).length + '</b> groups. We mutated the accumulator we created ourselves — that is fine and fast. (Building a new object with spread every step would be O(n²).)', [cp(code, 4, 'ok'), { type: 'map', label: 'groups', entries: entries(acc), hl: (function () { var h = {}; Object.keys(acc).forEach(function (k) { h[k] = 'sel'; }); return h; })() }]));
        return f;
      }
    }],
    examples: [
      { title: 'Predict the output: the missing return', html: `<p>With braces you must <code>return</code>. Step 1 returns <code>undefined</code>, so step 2 receives <code>acc = undefined</code>, computes <code>undefined + 2</code> (NaN) — and throws that away too.</p>${H.table(['Step', 'acc in', 'x', 'returned'], [['1', '0', '1', '<span class="c-r">undefined</span>'], ['2', 'undefined', '2', '<span class="c-r">undefined</span>'], ['3', 'undefined', '3', '<span class="c-r">undefined</span>']])}<p>Note: the callback <i>computes</i> <code>acc + x</code> but throws the value away — so the final result is <b>undefined</b>, not NaN.</p>`, code: { lang: 'js', run: true, code: `const r1 = [1, 2, 3].reduce((acc, x) => { acc + x; }, 0);
console.log(r1); // undefined

const r2 = [1, 2, 3].reduce((acc, x) => { return acc + x; }, 0);
console.log(r2); // 6

const r3 = [1, 2, 3].reduce((acc, x) => acc + x, 0); // implicit return
console.log(r3); // 6` } },
      { title: 'Max with index in one pass', html: `<p>The accumulator can be an object holding several things at once. Here it tracks the best value <b>and</b> where it was found.</p>${H.arr([4, 11, 7, 11], { hl: { 1: 'g' } })}<p>Ties keep the <b>first</b> max because we only replace on strictly greater.</p>`, code: { lang: 'js', run: true, code: `const arr = [4, 11, 7, 11];
const best = arr.reduce(
  (acc, x, i) => (x > acc.value ? { value: x, index: i } : acc),
  { value: -Infinity, index: -1 }
);
console.log(best); // { value: 11, index: 1 }` } },
      { title: 'Spread inside reduce is a hidden O(n²)', html: `<p><code>(acc, x) =&gt; ({ ...acc, [x.id]: x })</code> copies the whole accumulator every step: 1 + 2 + … + n copies ≈ n²/2. For 10 000 items that is about 50 million property copies. Mutating your own fresh accumulator is O(n).</p>${H.table(['n', 'spread version (copies)', 'mutate version (writes)'], [['100', '≈ 5 000', '100'], ['10 000', '≈ 50 000 000', '10 000']])}`, code: { lang: 'js', run: true, code: `const items = Array.from({ length: 1000 }, (_, i) => ({ id: "k" + i }));

let t = Date.now();
const slow = items.reduce((acc, x) => ({ ...acc, [x.id]: x }), {});
const slowMs = Date.now() - t;

t = Date.now();
const fast = items.reduce((acc, x) => { acc[x.id] = x; return acc; }, {});
const fastMs = Date.now() - t;

console.log(Object.keys(slow).length, Object.keys(fast).length); // 1000 1000
console.log('spread slower?', slowMs >= fastMs);` } },
      { title: 'Running totals: reduce vs map with a closure', html: `<p>To produce an array of prefix sums you can reduce into an array, or keep a running variable in <code>map</code>. Both are O(n); pick the one your team reads faster.</p>${H.arr([2, 5, 1], { label: 'in' })}${H.arr([2, 7, 8], { label: 'prefix', hl: { 2: 'g' } })}`, code: { lang: 'js', run: true, code: `const vals = [2, 5, 1];
const prefixA = vals.reduce((acc, x) => {
  acc.push((acc.at(-1) ?? 0) + x);
  return acc;
}, []);
let running = 0;
const prefixB = vals.map(x => (running += x));
console.log(prefixA, prefixB); // [ 2, 7, 8 ] [ 2, 7, 8 ]` } }
    ],
    deepDive: `<p>🟣 <b>Spec details.</b> <code>reduce</code> reads <code>length</code> once, skips holes, and if no initial value is given it searches for the <b>first present element</b> to use as acc (so <code>[, , 5].reduce(f)</code> starts with 5 and never calls <code>f</code>). With exactly one element and no initial value, the callback is <b>never called</b> and that element is returned.</p>
<p><b>Why reduce is the "universal" array method.</b> <code>map</code>, <code>filter</code>, <code>some</code>, <code>find</code>, <code>flat</code> can all be written as reduces — reduce is a <b>fold</b>, the most general list-consuming operation from functional programming. That is why interviewers ask you to <b>implement map/filter using reduce</b>, or to write a reduce polyfill (handle: no initial value, empty array TypeError, holes, index and array arguments).</p>
<p><b>Floating-point sums.</b> <code>[0.1, 0.2, 0.3].reduce((a, b) =&gt; a + b, 0)</code> gives <code>0.6000000000000001</code>. For money, store integer cents. For long scientific sums, order matters (adding tiny numbers to a huge acc loses them) — Kahan summation fixes it, and a newer built-in, <code>Math.sumPrecise</code>, is arriving in engines (check support before relying on it).</p>
<p><b>Mutating the accumulator</b> you created (<code>{}</code> or <code>[]</code> passed as the initial value) is safe — nobody else holds it. Mutating the <b>items</b> is not. If you pass a shared object as the initial value (<code>reduce(f, sharedObj)</code>), you will mutate that shared object — create a fresh one.</p>
<p><b>Alternatives.</b> <code>Object.groupBy</code> / <code>Map.groupBy</code> (ES2024) for grouping, <code>Object.fromEntries(arr.map(x =&gt; [k, v]))</code> for indexing, <code>Math.max(...arr)</code> for small arrays. Many teams' style guides prefer a <code>for...of</code> loop over a complex reduce for readability.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> models produce reduce one-liners eagerly, often using the spread-in-reducer pattern (<code>({ ...acc, [k]: v })</code>) that is quietly O(n²), or omitting the initial value so empty input crashes in production.</p>
<p><b>Use AI as a partner:</b> <code>"Is this reduce O(n) or O(n²)? Rewrite it if needed."</code>, <code>"Rewrite this 12-line reduce as a for...of loop and as Object.groupBy; which is clearest?"</code>, <code>"Write a reduce polyfill and list the spec edge cases it must handle."</code></p>
<p><b>Where AI goes wrong:</b> claiming <code>[x].reduce(f)</code> calls <code>f</code> once (it does not), floating-point money sums, and using reduce where <code>some</code> would short-circuit.</p>
<p><b>What you must still own:</b> tracing acc step by step on paper (a top interview skill), choosing the right initial value and type, and judging readability — the "clever" reduce is often the one that gets rejected in code review.</p>`,
    problems: [{
      title: 'Tally Votes and Pick the Winner',
      level: 'Medium', tags: ['reduce', 'counting', 'objects', 'tie-break'], companies: ['Microsoft', 'Uber', 'PhonePe'],
      statement: `<p>Given an array of candidate names (one per vote), return <code>{ winner, counts }</code> where <code>counts</code> maps each name to its votes and <code>winner</code> has the most votes. On a tie, the alphabetically <b>smaller</b> name wins. For no votes return <code>{ winner: null, counts: {} }</code>.</p>`,
      constraints: `<p>0 ≤ votes ≤ 10<sup>6</sup>; names are non-empty lowercase strings.</p>`,
      example: `${H.arr(['bob', 'amy', 'bob', 'cat', 'amy'])}<p>counts = ${H.kv([['bob', 2], ['amy', 2], ['cat', 1]])} bob and amy tie at 2 → ${H.c('g', 'winner = "amy"')} (alphabetically first).</p>`,
      brute: { why: `<p>For each distinct name, count it with <code>filter(v =&gt; v === name).length</code>. With k distinct names and n votes that is O(n·k) — up to 10<sup>12</sup> for a million votes with many candidates.</p>`, code: { lang: 'js', run: true, code: `function tally(votes) {
  const names = [...new Set(votes)];
  const counts = {};
  for (const name of names) counts[name] = votes.filter(v => v === name).length; // full scan per name
  let winner = null;
  for (const name of names.sort()) {
    if (winner === null || counts[name] > counts[winner]) winner = name;
  }
  return { winner, counts };
}
console.log(tally(['bob', 'amy', 'bob', 'cat', 'amy']));` } },
      mcq: { q: 'After counting, how do you apply the tie-break "alphabetically smaller wins" in one pass?', options: ['Replace the best when count is greater, OR equal and name &lt; best name', 'Sort names descending first', 'Only replace when count is greater', 'Use Math.max on the counts'], answer: 0, explain: 'Comparing (count, then name) in the replacement condition handles ties without sorting. Only "greater" would keep whichever name appeared first in insertion order.' },
      hints: [`<p>Two stages: (1) count everything in one pass, (2) scan the counts once to pick the winner.</p>`, `<p>Counting: <code>votes.reduce((acc, v) =&gt; { acc[v] = (acc[v] ?? 0) + 1; return acc; }, {})</code>. Picking: <code>Object.entries(counts).reduce(...)</code> with the tie rule.</p>`, `<p>Tie rule in the comparison: <code>c &gt; best.c || (c === best.c &amp;&amp; name &lt; best.name)</code>. Empty input: counts is <code>{}</code> and winner stays <code>null</code>.</p>`],
      solution: {
        approach: `<p>Reduce #1 builds the frequency object in O(n). Reduce #2 walks the (name, count) pairs once and keeps the best pair, using the tie-break in the comparison. Starting the second accumulator at <code>{ name: null, c: 0 }</code> handles the empty case naturally.</p>`,
        code: { lang: 'js', run: true, code: `function tally(votes) {
  // Pass 1: frequency table
  const counts = votes.reduce((acc, name) => {
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});

  // Pass 2: pick the best (higher count, then alphabetically smaller name)
  const best = Object.entries(counts).reduce(
    (acc, [name, c]) =>
      c > acc.c || (c === acc.c && name < acc.name) ? { name, c } : acc,
    { name: null, c: 0 }
  );

  return { winner: best.name, counts };
}

console.log(tally(['bob', 'amy', 'bob', 'cat', 'amy'])); // winner 'amy'
console.log(tally(['zed', 'zed', 'amy']));               // winner 'zed'
console.log(tally([]));                                  // { winner: null, counts: {} }` },
        dry: { head: ['step', 'item', 'acc after'], rows: [
          ['count 1', "'bob'", '{ bob: 1 }'],
          ['count 2', "'amy'", '{ bob: 1, amy: 1 }'],
          ['count 3–5', "'bob', 'cat', 'amy'", '{ bob: 2, amy: 2, cat: 1 }'],
          ['pick 1', "['bob', 2]", '2 &gt; 0 → { name: bob, c: 2 }'],
          ['pick 2', "['amy', 2]", "tie and 'amy' &lt; 'bob' → { name: amy, c: 2 }"],
          ['pick 3', "['cat', 1]", '1 &lt; 2 → keep amy <span class="c-g">winner = amy</span>']
        ] },
        complexity: `<p>Time O(n + k) where k = distinct names; space O(k). The brute force is O(n·k).</p>`,
        followUps: ['Return all tied winners instead of one', 'Use a <code>Map</code> so names like <code>"__proto__"</code> are safe', 'Stream votes in real time and answer "current leader" in O(1)']
      }
    }]
  });

  /* ================= TOPIC 6: sort & comparators ================= */
  topics.push({
    title: 'Arrays IV: sort, Comparators, Stability & toSorted',
    analogy: `<p>Imagine a <b>librarian who only reads spines as text</b>. Hand her books numbered 10, 9 and 100 and she shelves them as "10", "100", "9" — because "1" comes before "9" in the alphabet. That is JavaScript's <b>default</b> <code>sort()</code>. To sort properly you give her a <b>rule card</b> (a <b>comparator</b>) that answers one question for any two books: <i>"which one goes first?"</i> — negative means the first book, positive means the second, zero means "leave them in the order they are".</p>`,
    explain: `<p>🟢 <b>Default sort compares as strings.</b> <code>arr.sort()</code> with no arguments converts every item to a string and orders them by UTF-16 code units (roughly dictionary order, but all uppercase letters come before lowercase).</p>
${H.table(['Expression', 'Result', 'Why'], [['<code>[10, 9, 1, 100].sort()</code>', '<span class="c-r">[1, 10, 100, 9]</span>', '"1" &lt; "10" &lt; "100" &lt; "9" as text'], ['<code>[\'b\', \'a\', \'C\'].sort()</code>', "<span class=\"c-y\">['C', 'a', 'b']</span>", 'uppercase codes (65–90) &lt; lowercase (97–122)'], ['<code>[10, 9, 1, 100].sort((a, b) =&gt; a - b)</code>', '<span class="c-g">[1, 9, 10, 100]</span>', 'numeric comparator']])}
<p><b>The comparator contract.</b> <code>compare(a, b)</code> must return:</p>
${H.table(['Return value', 'Meaning'], [['negative (e.g. -1)', '<b>a</b> goes before b'], ['positive (e.g. 1)', '<b>b</b> goes before a'], ['0', 'keep their current relative order (stable)']])}
<p>Recipes: numbers ascending <code>(a, b) =&gt; a - b</code>; descending <code>(a, b) =&gt; b - a</code>; strings <code>(a, b) =&gt; a.localeCompare(b)</code>; objects by a field <code>(a, b) =&gt; a.age - b.age</code>; dates <code>(a, b) =&gt; a.date - b.date</code> (Dates subtract as milliseconds).</p>
<p><b>Multiple keys</b> ("by department, then by salary descending"): compare the first key; only if it is a tie, compare the next. The <code>||</code> trick does this neatly because 0 is falsy: <code>(a, b) =&gt; a.dept.localeCompare(b.dept) || b.salary - a.salary</code>.</p>
<p><b>sort mutates!</b> It sorts <b>in place</b> and returns the <b>same</b> array. If you need the original untouched (React state, function inputs), use <code>arr.toSorted(cmp)</code> (ES2023) or <code>[...arr].sort(cmp)</code>.</p>
<p><b>Stability</b> (guaranteed since ES2019): items the comparator calls equal keep their original order. So if you sort a list already in name order by age, people with the same age remain in name order.</p>`,
    clues: [
      '"sort numbers" and the output looks like 1, 10, 100, 9 → missing comparator <code>(a, b) =&gt; a - b</code>',
      '"sort by X then by Y" / "tie-break" → chain comparisons with <code>||</code>',
      '"without modifying the original" → <code>toSorted</code> or <code>[...arr].sort()</code>',
      '"stable sort" / "keep original order for equal keys" → guaranteed since ES2019 (TimSort in V8)',
      '"sort names alphabetically, accents/case-insensitive" → <code>localeCompare</code> or <code>Intl.Collator</code>',
      '"top K" / "k largest" → sort descending then <code>slice(0, k)</code> (O(n log n)); a heap if n is huge',
      '"comparator returns a boolean" (<code>a &gt; b</code>) → bug: it never returns negative'
    ],
    code: [{ lang: 'js', run: true, title: 'Default vs comparator sorts (runnable)', code: `// Default sort: items become strings!
console.log([10, 9, 1, 100].sort());               // [ 1, 10, 100, 9 ]
console.log(['banana', 'Apple', 'cherry'].sort()); // [ 'Apple', 'banana', 'cherry' ]
console.log(['b', 'a', 'C'].sort());               // [ 'C', 'a', 'b' ] uppercase first

// Numeric comparators
const nums = [10, 9, 1, 100];
console.log([...nums].sort((a, b) => a - b));      // [ 1, 9, 10, 100 ]
console.log([...nums].sort((a, b) => b - a));      // [ 100, 10, 9, 1 ]

// Locale-aware, case-insensitive string sort
const names = ['émile', 'Zoe', 'adam', 'Éva'];
console.log(names.toSorted((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
// [ 'adam', 'émile', 'Éva', 'Zoe' ]

// Objects by a field, then a tie-breaker with ||
const people = [
  { name: 'Ravi', age: 30 },
  { name: 'Asha', age: 25 },
  { name: 'Ben', age: 30 },
];
const byAgeThenName = people.toSorted((a, b) => a.age - b.age || a.name.localeCompare(b.name));
console.log(byAgeThenName.map(p => p.name + ' ' + p.age)); // [ 'Asha 25', 'Ben 30', 'Ravi 30' ]

// sort mutates and returns the SAME array
const arr = [3, 1, 2];
const sorted = arr.sort((a, b) => a - b);
console.log(sorted === arr, arr); // true [ 1, 2, 3 ]

// toSorted leaves the original alone (ES2023)
const orig = [3, 1, 2];
console.log(orig.toSorted(), orig); // [ 1, 2, 3 ] [ 3, 1, 2 ]

// Dates subtract as milliseconds
const events = [new Date('2026-03-01'), new Date('2025-12-25'), new Date('2026-01-10')];
console.log(events.toSorted((a, b) => a - b).map(d => d.toISOString().slice(0, 10)));` },
    { lang: 'js', run: true, title: 'Stability, undefined, and the boolean-comparator bug', code: `// Stable: equal keys keep their input order.
const tasks = [
  { t: 'email', pri: 2 }, { t: 'deploy', pri: 1 }, { t: 'lunch', pri: 2 }, { t: 'fix', pri: 1 },
];
console.log(tasks.toSorted((a, b) => a.pri - b.pri).map(x => x.t)); // [ 'deploy', 'fix', 'email', 'lunch' ]

// undefined always goes to the end (the comparator is not even called for it).
console.log([3, undefined, 1].sort((a, b) => a - b)); // [ 1, 3, undefined ]

// WRONG: boolean comparator. true -> 1, false -> 0: never "a first".
// The result depends on the engine's algorithm — do not rely on it.
const wrong = [3, 1, 2, 5, 4].sort((a, b) => a > b);
console.log('boolean comparator gave:', wrong);

// RIGHT:
console.log([3, 1, 2, 5, 4].sort((a, b) => a - b)); // [ 1, 2, 3, 4, 5 ]

// Sorting by an expensive computed key: compute once (decorate-sort-undecorate).
const words = ['banana', 'kiwi', 'apple', 'fig'];
const byVowels = words
  .map(w => ({ w, key: (w.match(/[aeiou]/g) || []).length })) // compute key once per item
  .sort((a, b) => a.key - b.key || a.w.localeCompare(b.w))
  .map(x => x.w);
console.log(byVowels); // [ 'fig', 'kiwi', 'apple', 'banana' ]` }],
    codeTitle: ['Default vs comparator', 'Stability & pitfalls'],
    viz: [{
      title: 'Why [10, 9, 1, 100].sort() is "wrong": the string trap',
      input: '10 9 1 100 25',
      inputLabel: 'Numbers (space separated, up to 8)',
      gen: function (input) {
        var a = nums(input, 2, 8);
        var strs = a.map(String);
        var lex = strs.slice().sort();
        var num = a.slice().sort(function (x, y) { return x - y; });
        var f = [];
        f.push(fr('We call <code>arr.sort()</code> with <b>no comparator</b>.', [ap('arr', a, {}, {})]));
        f.push(fr('Step 1: every item is converted to a <b>string</b>. Now the engine compares text, character by character, like words in a dictionary.', [ap('as strings', strs, (function () { var h = {}; strs.forEach(function (_, i) { h[i] = 'cur'; }); return h; })(), {})]));
        f.push(fr('Step 2: compare first characters. "1…" strings all come before "2…", which come before "9…", no matter how long they are. Length only matters when one string is a prefix of another ("1" &lt; "10" &lt; "100").', [{ type: 'table', label: 'first character decides', columns: ['string', 'first char', 'char code'], rows: strs.map(function (s) { return [s, s.charAt(0), String(s.charCodeAt(0))]; }) }]));
        f.push(fr('Result of the default sort: <b>' + esc(show(lex.map(Number))) + '</b>. ' + (lex.join() === num.map(String).join() ? 'Lucky — here text order equals number order.' : '<span class="c-r">Not numeric order!</span>'), [ap('arr.sort()', lex.map(Number), (function () { var h = {}; lex.forEach(function (s, i) { if (s !== String(num[i])) h[i] = 'bad'; }); return h; })(), {})]));
        f.push(fr('With a comparator <code>(a, b) =&gt; a - b</code>, the engine compares <b>numbers</b>: a negative result puts a first. Result: <b>' + esc(show(num)) + '</b>.', [ap('arr.sort((a, b) => a - b)', num, (function () { var h = {}; num.forEach(function (_, i) { h[i] = 'ok'; }); return h; })(), {})]));
        f.push(fr('Remember: both versions <b>mutate</b> arr. Use <code>toSorted</code> to keep the original.', [ap('default (string order)', lex.map(Number), {}, {}), ap('numeric comparator', num, {}, {})]));
        return f;
      }
    }, {
      title: 'Comparator calls, one by one (insertion-sort illustration)',
      input: '5 2 9 1 5',
      inputLabel: 'Numbers to sort ascending (2 to 7)',
      gen: function (input) {
        var a = nums(input, 2, 7);
        var code = ['arr.sort((a, b) => a - b);', '// < 0 : a stays before b', '// > 0 : b moves before a', '// = 0 : keep order (stable)'].join('\n');
        var f = [], calls = 0;
        f.push(fr('We illustrate how a sort uses your comparator with simple <b>insertion sort</b> (V8\'s TimSort also uses binary insertion sort on short runs, then merges runs). Your comparator only answers "which of these two first?" — the algorithm decides which pairs to ask about.', [cp(code, 1), ap('arr', a, {}, {}), vp({ 'comparator calls': 0 }, '', '', 'Stats')]));
        for (var i = 1; i < a.length; i++) {
          var j = i;
          while (j > 0) {
            var x = a[j - 1], y = a[j], r = x - y;
            calls++;
            var hl = {}; hl[j - 1] = 'cur'; hl[j] = 'cur';
            var p = {}; p[j - 1] = 'a'; p[j] = 'b';
            if (r > 0) {
              f.push(fr('compare(a = ' + x + ', b = ' + y + ') returns <b>' + r + '</b> (positive) → <b>b</b> must come first: swap.', [cp(code, 3, 'bad'), ap('arr', a.slice(), hl, p), vp({ a: x, b: y, 'a - b': r, 'comparator calls': calls }, 'a - b', 'bad', 'Stats')]));
              a[j - 1] = y; a[j] = x;
              j--;
            } else {
              f.push(fr('compare(a = ' + x + ', b = ' + y + ') returns <b>' + r + '</b> ' + (r === 0 ? '(zero → equal, keep order: this is what makes it <b>stable</b>)' : '(negative → a already first)') + '. Item is in place; move to the next one.', [cp(code, r === 0 ? 4 : 2, 'ok'), ap('arr', a.slice(), hl, p), vp({ a: x, b: y, 'a - b': r, 'comparator calls': calls }, 'a - b', 'ok', 'Stats')]));
              break;
            }
          }
          if (f.length > 40) break;
        }
        f.push(fr('Sorted: <b>' + esc(show(a)) + '</b> after <b>' + calls + '</b> comparator calls. A good comparator is <b>consistent</b>: same inputs, same answer, and if a &lt; b and b &lt; c then a &lt; c.', [ap('arr (sorted in place)', a, (function () { var h = {}; a.forEach(function (_, k) { h[k] = 'ok'; }); return h; })(), {}), vp({ 'comparator calls': calls }, 'comparator calls', 'sel', 'Stats')]));
        return f;
      }
    }],
    examples: [
      { title: 'Predict the output: sort returns the same array', html: `<p><code>b</code> is not a copy — it is the same array as <code>a</code>, now sorted. Both names print the sorted order.</p>${H.table(['Line', 'a', 'b'], [['<code>const a = [3, 1, 2]</code>', '[3, 1, 2]', '—'], ['<code>const b = a.sort()</code>', '<span class="c-y">[1, 2, 3]</span>', '<span class="c-y">same array</span>'], ['<code>b.push(9)</code>', '[1, 2, 3, 9]', '[1, 2, 3, 9]']])}`, code: { lang: 'js', run: true, code: `const a = [3, 1, 2];
const b = a.sort();
b.push(9);
console.log(a, b, a === b); // [ 1, 2, 3, 9 ] [ 1, 2, 3, 9 ] true` } },
      { title: 'Top 3 scores without touching the original', html: `<p>Sort descending on a copy, then slice the first three. For a few hundred items this is perfect; for millions of items and small k, a heap is better (O(n log k)).</p>${H.arr([72, 95, 60, 88, 95, 41], { label: 'scores' })}${H.arr([95, 95, 88], { label: 'top 3', hl: { 0: 'g', 1: 'g', 2: 'g' } })}`, code: { lang: 'js', run: true, code: `const scores = [72, 95, 60, 88, 95, 41];
const top3 = scores.toSorted((a, b) => b - a).slice(0, 3);
console.log(top3, scores); // [ 95, 95, 88 ] [ 72, 95, 60, 88, 95, 41 ]` } },
      { title: 'Custom order with a rank table', html: `<p>To sort by a business order like <b>high → medium → low</b>, map each label to a number and compare the numbers.</p>${H.kv([['high', 0], ['medium', 1], ['low', 2]], { label: 'RANK' })}`, code: { lang: 'js', run: true, code: `const RANK = { high: 0, medium: 1, low: 2 };
const tickets = [
  { id: 1, pri: 'low' }, { id: 2, pri: 'high' }, { id: 3, pri: 'medium' }, { id: 4, pri: 'high' },
];
const ordered = tickets.toSorted((a, b) => RANK[a.pri] - RANK[b.pri] || a.id - b.id);
console.log(ordered.map(t => t.id + ':' + t.pri)); // [ '2:high', '4:high', '3:medium', '1:low' ]` } },
      { title: 'Shuffling: sort with Math.random is biased', html: `<p><code>arr.sort(() =&gt; Math.random() - 0.5)</code> is a famous but <b>biased</b> shuffle (the comparator is inconsistent, so some orders appear far more often). Use the Fisher–Yates shuffle: walk from the end, swap each item with a random earlier (or same) position.</p>`, code: { lang: 'js', run: true, code: `function shuffle(arr) {
  const a = [...arr];                         // do not mutate the input
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // 0..i inclusive
    [a[i], a[j]] = [a[j], a[i]];              // swap via destructuring
  }
  return a;
}
const deck = [1, 2, 3, 4, 5];
const s = shuffle(deck);
console.log(s.length, s.toSorted((x, y) => x - y).join() === deck.join()); // 5 true (same items)` } }
    ],
    deepDive: `<p>🟣 <b>The algorithm.</b> Since V8 7.0 / Chrome 70 (2018), <code>Array.prototype.sort</code> uses <b>TimSort</b>: it finds already-sorted "runs", extends short ones with binary insertion sort, and merges runs. Worst case O(n log n), best case O(n) on already-sorted data, extra memory O(n). It is <b>stable</b>, and ES2019 made stability a spec requirement for all engines.</p>
<p><b>Comparator rules (the spec calls it a "consistent comparator").</b> It must be pure and transitive, and <code>compare(a, b)</code> and <code>compare(b, a)</code> must have opposite signs. If not — random results, booleans, <code>NaN</code> from <code>a - b</code> on non-numbers — the resulting order is <b>implementation-defined</b> (but it will not crash). <code>a - b</code> is also unsafe for huge numbers near ±1.8·10<sup>308</sup> (overflow to Infinity), and wrong for BigInt mixed with numbers; use <code>(a &gt; b) - (a &lt; b)</code> as a generic three-way compare.</p>
<p><b>Strings.</b> Default sort compares <b>UTF-16 code units</b>, so emoji and some accented letters (stored as two units or decomposed) sort oddly. <code>localeCompare</code> follows human language rules but is slower per call; when sorting thousands of strings, create one <code>new Intl.Collator('en', { sensitivity: 'base', numeric: true })</code> and pass <code>collator.compare</code> — <code>numeric: true</code> also gives "natural" order (file2 &lt; file10).</p>
<p><b>Holes and undefined.</b> The engine first collects values, moves <code>undefined</code>s to the end (without calling the comparator) and holes after them, then sorts the rest.</p>
<p><b>Cost of the comparator.</b> A sort makes about n·log₂n comparator calls (≈ 20 million for n = 1 million). Expensive keys (regex, date parsing, <code>toLowerCase</code>) inside the comparator multiply that — precompute keys once ("decorate-sort-undecorate" / Schwartzian transform).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants generally write correct numeric comparators now, but you will still see <code>.sort()</code> on numbers in generated scripts, <code>.sort((a, b) =&gt; a &gt; b)</code> copied from old StackOverflow answers, in-place <code>sort</code> on props/state, and the biased <code>Math.random() - 0.5</code> shuffle.</p>
<p><b>Use AI as a partner:</b> <code>"Write a comparator for: department asc, salary desc, name asc — and generate test data with ties at every level"</code>; <code>"Does this function mutate its input when it sorts?"</code>; <code>"Convert these sort calls to toSorted and tell me the minimum Node version."</code></p>
<p><b>Where AI goes wrong:</b> describing V8's sort as quicksort (true only before 2018), claiming sort is unstable, and forgetting locale rules for user-visible names.</p>
<p><b>What you must still own:</b> the comparator contract (negative / positive / zero), multi-key ordering, mutation awareness, and explaining <b>why</b> <code>[10, 9, 1].sort()</code> gives <code>[1, 10, 9]</code> — a guaranteed interview warm-up.</p>`,
    problems: [{
      title: 'Sort Employees: Department, then Salary, then Name',
      level: 'Medium', tags: ['sort', 'comparator', 'multi-key', 'immutability'], companies: ['Google', 'Atlassian', 'Zoho'],
      statement: `<p>Given employees <code>{ name, dept, salary }</code>, return a <b>new</b> array sorted by <code>dept</code> A→Z (case-insensitive), then <code>salary</code> high→low, then <code>name</code> A→Z. The input array must not change.</p>`,
      constraints: `<p>n ≤ 10<sup>5</sup>; salaries are integers; names/depts are non-empty strings.</p>`,
      example: `${H.table(['name', 'dept', 'salary'], [['Zed', 'eng', '120'], ['Amy', 'Eng', '150'], ['Bob', 'ops', '90'], ['Cal', 'eng', '120']])}<p>Output order: ${H.c('g', 'Amy (eng 150), Cal (eng 120), Zed (eng 120), Bob (ops 90)')} — "Eng" and "eng" are the same dept; Cal and Zed tie on salary so name decides.</p>`,
      brute: { why: `<p>A hand-written bubble sort with nested <code>if</code>s works but is O(n²) (10<sup>10</sup> comparisons for 10<sup>5</sup> employees), it mutates a copy element by element, and the tie-break logic is spread over many branches — easy to get subtly wrong.</p>`, code: { lang: 'js', run: true, code: `function sortEmployees(list) {
  const a = [...list];
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a.length - 1 - i; j++) {
      const x = a[j], y = a[j + 1];
      const dx = x.dept.toLowerCase(), dy = y.dept.toLowerCase();
      let swap = false;
      if (dx > dy) swap = true;
      else if (dx === dy && x.salary < y.salary) swap = true;
      else if (dx === dy && x.salary === y.salary && x.name > y.name) swap = true;
      if (swap) { a[j] = y; a[j + 1] = x; }
    }
  }
  return a;
}
console.log(sortEmployees([{ name: 'Zed', dept: 'eng', salary: 120 }, { name: 'Amy', dept: 'Eng', salary: 150 }]).map(e => e.name));` } },
      mcq: { q: 'Which comparator implements dept asc → salary desc → name asc?', options: ['<code>(a, b) =&gt; cmp(a.dept, b.dept) || b.salary - a.salary || cmp(a.name, b.name)</code>', '<code>(a, b) =&gt; a.dept &gt; b.dept || a.salary &lt; b.salary</code>', '<code>(a, b) =&gt; a.salary - b.salary || cmp(a.dept, b.dept)</code>', '<code>(a, b) =&gt; cmp(a.name, b.name)</code>'], answer: 0, explain: 'Compare keys in priority order; || falls through to the next key only when the previous result is 0 (a tie). Salary descending means b − a.' },
      hints: [`<p>Write one comparator that checks keys in priority order. A key only matters when all earlier keys tie.</p>`, `<p><code>||</code> returns the first non-zero (truthy) result. Salary descending = <code>b.salary - a.salary</code>. Case-insensitive strings: <code>localeCompare</code> with <code>{ sensitivity: 'base' }</code>.</p>`, `<p>Use <code>toSorted</code> (or <code>[...list].sort</code>) to avoid mutation. Edge cases: equal everything → 0 (stable keeps input order), empty list → [].</p>`],
      solution: {
        approach: `<p>One comparator, three keys chained with <code>||</code>. A shared <code>Intl.Collator</code> gives fast, case-insensitive string comparison. <code>toSorted</code> keeps the input intact; TimSort makes it O(n log n) and stable.</p>`,
        code: { lang: 'js', run: true, code: `const collator = new Intl.Collator('en', { sensitivity: 'base' }); // 'Eng' equals 'eng'

function sortEmployees(list) {
  return list.toSorted(
    (a, b) =>
      collator.compare(a.dept, b.dept) ||  // 1) dept A -> Z
      b.salary - a.salary ||               // 2) salary high -> low
      collator.compare(a.name, b.name)     // 3) name A -> Z
  );
}

const staff = [
  { name: 'Zed', dept: 'eng', salary: 120 },
  { name: 'Amy', dept: 'Eng', salary: 150 },
  { name: 'Bob', dept: 'ops', salary: 90 },
  { name: 'Cal', dept: 'eng', salary: 120 },
];
const out = sortEmployees(staff);
console.log(out.map(e => e.name + ' (' + e.dept + ' ' + e.salary + ')'));
// [ 'Amy (Eng 150)', 'Cal (eng 120)', 'Zed (eng 120)', 'Bob (ops 90)' ]
console.log(staff[0].name); // 'Zed' — input untouched` },
        dry: { head: ['a', 'b', 'dept cmp', 'salary b−a', 'name cmp', 'result'], rows: [
          ['Zed eng 120', 'Amy Eng 150', '0 (same)', '150 − 120 = 30', '—', '<b>+30</b> → Amy first'],
          ['Cal eng 120', 'Zed eng 120', '0', '0', '-1', '<b>-1</b> → Cal first'],
          ['Bob ops 90', 'Cal eng 120', '+1', '—', '—', '<b>+1</b> → Cal first'],
          ['Amy Eng 150', 'Cal eng 120', '0', '−30', '—', '<b>−30</b> → Amy first']
        ] },
        complexity: `<p>Time O(n log n) comparisons, each O(length of strings). Space O(n) for the copy.</p>`,
        followUps: ['Let the caller pass the key order as data: <code>[["dept", "asc"], ["salary", "desc"]]</code>', 'Put employees with a missing dept last', 'Return only the top earner per department']
      }
    }]
  });

  /* ================= TOPIC 7: Objects ================= */
  topics.push({
    title: 'Objects: Properties, Methods, Iteration & References',
    analogy: `<p>An object is a <b>labelled filing cabinet</b>: every drawer has a <b>label</b> (the key) and holds something (the value). You open a drawer by its label — <code>user.name</code>. Now the twist: a variable does not <i>contain</i> the cabinet; it holds a <b>sticky note with the cabinet's address</b>. Copy the variable and you copy the <b>note</b>, not the cabinet — two notes, one cabinet. Anyone who follows either note and changes a drawer changes it for everybody.</p>`,
    explain: `<p>🟢 <b>Creating and reading.</b> An object literal groups related data: <code>const user = { name: 'Asha', age: 30, 'favourite colour': 'teal' }</code>. Read with <b>dot notation</b> (<code>user.name</code>) when the key is a simple fixed word; use <b>bracket notation</b> (<code>user['favourite colour']</code>, <code>user[key]</code>) when the key has spaces/dashes, starts with a digit, or is stored in a variable. A missing key reads as <code>undefined</code> (no error) — but reading a property <i>of</i> <code>undefined</code> throws (<code>user.address.city</code> when there is no address). <code>user.address?.city</code> (optional chaining) safely gives <code>undefined</code>.</p>
<p><b>Changing.</b> Add or update: <code>user.age = 31</code>, <code>user['city'] = 'Pune'</code>. Remove: <code>delete user.age</code>. A <code>const</code> object can still have its properties changed — <code>const</code> only locks the variable. <code>Object.freeze(obj)</code> makes it read-only (shallowly).</p>
<p><b>Handy shortcuts:</b></p>
${H.table(['Feature', 'Code', 'Means'], [
  ['Shorthand property', '<code>{ name, age }</code>', '<code>{ name: name, age: age }</code>'],
  ['Computed key', "<code>{ [field]: value }</code>", 'key comes from an expression'],
  ['Method shorthand', '<code>{ greet() { return \'hi\'; } }</code>', 'a function property with its own <code>this</code>'],
  ['Optional chaining', '<code>user.address?.city</code>', 'undefined instead of an error']
])}
<p><b>Checking keys.</b> <code>'age' in user</code> (own <i>or</i> inherited), <code>Object.hasOwn(user, 'age')</code> (own only — the modern choice), <code>user.age !== undefined</code> (wrong if the value is literally undefined).</p>
<p><b>Iterating.</b> <code>Object.keys(o)</code> → array of keys, <code>Object.values(o)</code> → values, <code>Object.entries(o)</code> → <code>[key, value]</code> pairs (great with <code>for (const [k, v] of …)</code>), and <code>Object.fromEntries(pairs)</code> goes back. Pattern: <b>entries → map/filter → fromEntries</b> to transform an object.</p>
<p><b>References.</b> Objects (and arrays, functions) are <b>reference values</b>. <code>const b = a</code> copies the reference: <code>a</code> and <code>b</code> are the same object. <code>===</code> compares <b>identity</b>, not contents: <code>{ x: 1 } === { x: 1 }</code> is <code>false</code>.</p>`,
    clues: [
      '"key stored in a variable" / "dynamic property" → bracket notation <code>obj[key]</code>, computed keys <code>{ [key]: v }</code>',
      '"Cannot read properties of undefined" → optional chaining <code>?.</code> or a guard',
      '"transform every value of an object" → <code>Object.fromEntries(Object.entries(o).map(…))</code>',
      '"does the object have this key?" → <code>Object.hasOwn</code> (not <code>!== undefined</code>, not <code>in</code> for own-only)',
      '"I changed the copy and the original changed too" → shared reference; copy with spread / structuredClone',
      '"compare two objects" → <code>===</code> is identity; write a shallow/deep equal for contents',
      '"why are numeric keys sorted?" → integer-like keys come first in ascending order'
    ],
    code: [{ lang: 'js', run: true, title: 'Object basics (runnable)', code: `const field = 'role';
const name = 'Asha';

const user = {
  name,                       // shorthand for name: name
  age: 30,
  'favourite colour': 'teal', // key with a space needs quotes
  [field]: 'admin',           // computed key -> role: 'admin'
  greet() {                   // method shorthand
    return 'Hi, I am ' + this.name;
  },
};

console.log(user.name, user['favourite colour'], user[field]); // Asha teal admin
console.log(user.greet());                                      // Hi, I am Asha
console.log(user.salary);                                       // undefined (no error)
console.log(user.address?.city);                                // undefined (safe)

user.age = 31;          // update
user.city = 'Pune';     // add
delete user.role;       // remove
console.log(user);

// Checking keys
console.log('age' in user, Object.hasOwn(user, 'age'));        // true true
console.log('toString' in user, Object.hasOwn(user, 'toString')); // true false (inherited)

// Iterating
for (const [key, value] of Object.entries(user)) {
  if (typeof value !== 'function') console.log(key, '=>', value);
}
console.log(Object.keys(user).length); // number of own enumerable keys

// Transform values: entries -> map -> fromEntries
const prices = { pen: 20, book: 350, bag: 1200 };
const withGst = Object.fromEntries(
  Object.entries(prices).map(([item, p]) => [item, Math.round(p * 1.18)])
);
console.log(withGst); // { pen: 24, book: 413, bag: 1416 }` },
    { lang: 'js', run: true, title: 'References, identity and freezing', code: `const a = { name: 'Asha', scores: [90] };
const b = a;                 // copies the REFERENCE
b.name = 'Ben';
console.log(a.name);         // Ben  — same object
console.log(a === b);        // true

console.log({ x: 1 } === { x: 1 }); // false: two different objects

// A function receiving an object can mutate it
function addScore(person, s) { person.scores.push(s); }
addScore(a, 75);
console.log(b.scores);       // [ 90, 75 ]

// const does not freeze
const settings = { theme: 'dark' };
settings.theme = 'light';    // allowed
console.log(settings.theme);

// Object.freeze is shallow
const frozen = Object.freeze({ level: 1, inner: { hp: 10 } });
frozen.level = 99;           // silently ignored (TypeError in strict mode / modules)
frozen.inner.hp = 0;         // nested object is NOT frozen
console.log(frozen.level, frozen.inner.hp); // 1 0

// Key order: integer-like keys ascending, then strings in insertion order
const order = { b: 1, 10: 'x', a: 2, 2: 'y', 1: 'z' };
console.log(Object.keys(order)); // [ '1', '2', '10', 'b', 'a' ]` }],
    codeTitle: ['Object basics', 'References & identity'],
    viz: [{
      title: 'Variables hold arrows to objects (references)',
      gen: function () {
        var code = ['const a = { name: \'Asha\', age: 30 };', 'const b = a;', 'b.age = 31;', 'function birthday(p) { p.age++; }', 'birthday(a);', 'function reset(p) { p = { name: \'New\' }; }', 'reset(a);', 'console.log(a === b, a.age);'].join('\n');
        function g(o1, opts) {
          opts = opts || {};
          var nodes = [{ id: 'a', label: 'a', x: 10, y: 10, shape: 'box' }];
          var edges = [['a', 'O1']];
          if (opts.b) { nodes.push({ id: 'b', label: 'b', x: 10, y: 32, shape: 'box' }); edges.push(['b', 'O1']); }
          if (opts.p) { nodes.push({ id: 'p', label: 'p (param)', x: 10, y: 54, shape: 'box' }); edges.push(['p', opts.p]); }
          nodes.push({ id: 'O1', label: o1, x: 62, y: 22, shape: 'box', w: 34 });
          if (opts.o2) nodes.push({ id: 'O2', label: "{ name: 'New' }", x: 62, y: 54, shape: 'box', w: 30 });
          return { type: 'graph', label: 'Stack (names) → Heap (objects)', directed: true, height: 66, nodes: nodes, edges: edges, hl: opts.hl || {}, ehl: opts.ehl || {} };
        }
        return [
          fr('Line 1: the object is built in memory (the <b>heap</b>). <code>a</code> stores a <b>reference</b> — an arrow — to it.', [cp(code, 1, 'ok'), g("{ name: 'Asha', age: 30 }", { hl: { O1: 'ok' } })]),
          fr('Line 2: <code>const b = a</code> copies the <b>arrow</b>, not the object. Two names, <b>one</b> object.', [cp(code, 2, 'ok'), g("{ name: 'Asha', age: 30 }", { b: true, hl: { b: 'ok' }, ehl: { 'b-O1': 'ok' } })]),
          fr('Line 3: <code>b.age = 31</code> follows b\'s arrow and changes the shared object. <code>a.age</code> is now 31 too.', [cp(code, 3, 'cur'), g("{ name: 'Asha', age: 31 }", { b: true, hl: { O1: 'cur' }, ehl: { 'b-O1': 'cur' } })]),
          fr('Line 5: calling <code>birthday(a)</code> copies a\'s arrow into parameter <code>p</code>. <code>p.age++</code> changes the same object → <b>32</b>.', [cp(code, { 4: 'win', 5: 'cur' }), g("{ name: 'Asha', age: 32 }", { b: true, p: 'O1', hl: { O1: 'ok', p: 'cur' }, ehl: { 'p-O1': 'ok' } })]),
          fr('Line 7: <code>reset(a)</code> — p starts pointing at the same object, but <code>p = { … }</code> <b>re-points p</b> to a brand-new object. a and b are untouched.', [cp(code, { 6: 'win', 7: 'cur' }), g("{ name: 'Asha', age: 32 }", { b: true, p: 'O2', o2: true, hl: { O2: 'bad', p: 'bad' }, ehl: { 'p-O2': 'bad' } })]),
          fr('After reset returns, p is gone and the new object has no arrows pointing at it — the <b>garbage collector</b> will reclaim it.', [cp(code, 7, 'ok'), g("{ name: 'Asha', age: 32 }", { b: true, hl: { O1: 'sel' } })]),
          fr('Line 8 prints <b>true 32</b>: <code>a === b</code> compares the arrows (same object → true). Two separately written <code>{ … }</code> literals would never be <code>===</code>, even with identical contents.', [cp(code, 8, 'ok'), tx('<b>Console:</b> <code>true 32</code>', 'Output'), g("{ name: 'Asha', age: 32 }", { b: true, hl: { a: 'sel', b: 'sel' } })])
        ];
      }
    }, {
      title: 'Property order: what Object.keys returns',
      input: 'name 2 age 1 10 zip',
      inputLabel: 'Keys in the order you add them (up to 8)',
      gen: function (input) {
        var ks = words(input, 1, 8, 'Enter keys separated by spaces, e.g. name 2 age 1');
        var seen = [], f = [];
        function isIdx(k) { return /^(0|[1-9]\d*)$/.test(k) && Number(k) < 4294967295; }
        function order() {
          var ints = seen.filter(isIdx).sort(function (x, y) { return Number(x) - Number(y); });
          var strs = seen.filter(function (k) { return !isIdx(k); });
          return ints.concat(strs);
        }
        f.push(fr('We start with an empty object and add keys one at a time: <code>obj[key] = …</code>. Watch where each key lands in <code>Object.keys(obj)</code>.', [ap('keys to add (insertion order)', ks, {}, {}), { type: 'map', label: 'obj (in Object.keys order)', entries: [] }]));
        ks.forEach(function (k, i) {
          var dup = seen.indexOf(k) >= 0;
          if (!dup) seen.push(k);
          var o = order(), hl = {}, ph = {}, pp = {};
          hl[k] = dup ? 'bad' : 'ok';
          for (var q = 0; q < i; q++) ph[q] = 'done';
          ph[i] = 'cur'; pp[i] = 'add';
          f.push(fr('Add <b>"' + esc(k) + '"</b>: ' + (dup ? 'it already exists, so this just <b>updates</b> the value — its position does not change.' : isIdx(k) ? 'an <b>integer-like</b> key, so it joins the numeric group, sorted ascending (' + o.filter(isIdx).join(' &lt; ') + ').' : 'a normal <b>string</b> key, so it goes after all integer keys, in insertion order.'), [ap('keys to add', ks, ph, pp), { type: 'map', label: 'obj (in Object.keys order)', entries: o.map(function (x) { return [x, 'step ' + (seen.indexOf(x) + 1)]; }), hl: hl }]));
        });
        f.push(fr('Final <code>Object.keys(obj)</code> = <b>' + esc(show(order())) + '</b>. Rule: integer-like keys ascending, then string keys by insertion, then Symbols (not shown by keys). Need guaranteed insertion order for any key type? Use a <b>Map</b>.', [ap('Object.keys(obj)', order(), {}, {})]));
        return f;
      }
    }],
    examples: [
      { title: 'Predict the output: keys are always strings', html: `<p>Plain-object keys are strings (or Symbols). The number <code>1</code> and the string <code>'1'</code> are the same key, and an object used as a key becomes the string <code>'[object Object]'</code> — so two different objects collide!</p>${H.table(['Write', 'Actual key'], [['<code>o[1] = \'a\'</code>', "'1'"], ["<code>o['1'] = 'b'</code>", "'1' (overwrites)"], ['<code>o[{}] = \'c\'</code>', "'[object Object]'"], ['<code>o[{ id: 2 }] = \'d\'</code>', "'[object Object]' (overwrites!)"]])}`, code: { lang: 'js', run: true, code: `const o = {};
o[1] = 'a';
o['1'] = 'b';
o[{}] = 'c';
o[{ id: 2 }] = 'd';
console.log(o);                  // { '1': 'b', '[object Object]': 'd' }
console.log(Object.keys(o));     // [ '1', '[object Object]' ]
// Need object keys? Use a Map:
const m = new Map([[{ id: 1 }, 'x'], [{ id: 2 }, 'y']]);
console.log(m.size);             // 2` } },
      { title: 'Counting with an object vs a Map', html: `<p>Objects work fine as small dictionaries with string keys. But a plain object inherits from <code>Object.prototype</code>, so a key like <code>"constructor"</code> already "exists". <code>Map</code> (or <code>Object.create(null)</code>) has no such surprises and keeps any key type.</p>${H.kv([['the', 2], ['constructor', 1]], { label: 'counts' })}`, code: { lang: 'js', run: true, code: `const words = ['the', 'constructor', 'the'];

const bad = {};
for (const w of words) bad[w] = (bad[w] || 0) + 1;
console.log(bad.constructor); // a weird string — it started from the inherited function!

const good = Object.create(null); // no prototype at all
for (const w of words) good[w] = (good[w] ?? 0) + 1;
console.log(good.constructor);    // 1

const map = new Map();
for (const w of words) map.set(w, (map.get(w) ?? 0) + 1);
console.log([...map]);            // [ [ 'the', 2 ], [ 'constructor', 1 ] ]` } },
      { title: 'Filtering an object\'s properties', html: `<p>Objects have no <code>filter</code> method. Go through entries: keep the pairs you want, then rebuild.</p>${H.kv([['math', 91], ['art', 48], ['science', 77]], { label: 'marks', hl: { art: 'r' } })}${H.kv([['math', 91], ['science', 77]], { label: 'passed', hl: { math: 'g', science: 'g' } })}`, code: { lang: 'js', run: true, code: `const marks = { math: 91, art: 48, science: 77 };
const passed = Object.fromEntries(
  Object.entries(marks).filter(([, score]) => score >= 50)
);
console.log(passed); // { math: 91, science: 77 }` } },
      { title: 'Methods and this (preview)', html: `<p>A method written with shorthand gets <code>this</code> = the object before the dot at call time. An <b>arrow</b> used as a method does not get its own <code>this</code> — a classic bug. You will master <code>this</code> in the dedicated module; for now, use method shorthand for object methods.</p>`, code: { lang: 'js', run: true, code: `const counter = {
  count: 0,
  inc() { this.count++; return this.count; },      // shorthand: this = counter
  incArrow: () => typeof this,                     // arrow: no own this
};
console.log(counter.inc(), counter.inc()); // 1 2
console.log(counter.incArrow());           // 'object' or 'undefined' depending on module/script — NOT counter` } }
    ],
    deepDive: `<p>🟣 <b>Properties are more than key → value.</b> Each property has a <b>descriptor</b>: <code>value</code>, <code>writable</code>, <code>enumerable</code>, <code>configurable</code> (or <code>get</code>/<code>set</code> for accessors). <code>Object.getOwnPropertyDescriptor(o, 'x')</code> shows it; <code>Object.defineProperty</code> sets it. Non-enumerable properties are hidden from <code>Object.keys</code>, <code>for...in</code>, spread and <code>JSON.stringify</code>. <code>freeze</code> = non-writable + non-configurable + non-extensible; <code>seal</code> = no add/remove but values writable; <code>preventExtensions</code> = no add.</p>
<p><b>Ordering rule</b> (ES2015+, fully specified for <code>for...in</code> since ES2020): integer-like keys ("array indices", 0 … 2<sup>32</sup>−2) ascending; then string keys in creation order; then Symbol keys in creation order (only via <code>Object.getOwnPropertySymbols</code> / <code>Reflect.ownKeys</code>).</p>
<p><b>for...in vs Object.keys.</b> <code>for...in</code> also walks <b>inherited</b> enumerable properties up the prototype chain, which is why old code wraps it in <code>hasOwnProperty</code> checks. Prefer <code>Object.keys/entries</code>.</p>
<p><b>Engine view: hidden classes (shapes).</b> V8 gives objects with the same keys added in the same order a shared "shape", which makes property access as fast as a struct field via inline caches. Adding properties in different orders, or using <code>delete</code>, can push an object into slow "dictionary mode". Practical advice: initialise all fields in one literal/constructor, and set to <code>undefined</code>/<code>null</code> rather than <code>delete</code> in hot code.</p>
<p><b>Objects vs Map.</b> Use objects for records with known fields ("a user"), Map for dictionaries with dynamic keys, frequent add/remove, non-string keys, or guaranteed insertion order. Also beware <b>prototype pollution</b>: writing user-controlled keys like <code>"__proto__"</code> into a plain object via naive merge code can modify <code>Object.prototype</code> for the whole app.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI tools write object manipulation (pick, omit, rename keys, entries/fromEntries pipelines) instantly and usually correctly. Typical slips: using <code>obj.key</code> when the key is in a variable, <code>if (obj[key])</code> treating 0 / empty string as "missing", <code>for...in</code> without own-property checks, and accidental mutation of shared config objects.</p>
<p><b>Use AI as a partner:</b> <code>"Draw the reference diagram for this snippet: which variables point to which objects after each line?"</code>, <code>"Is any user input written as an object key here? Check for prototype pollution."</code>, <code>"Should this dictionary be a Map?"</code></p>
<p><b>Where AI goes wrong:</b> claiming objects preserve insertion order for all keys (integer keys are reordered), suggesting <code>JSON.stringify(a) === JSON.stringify(b)</code> as an equality check (fails on key order), and arrow-function methods.</p>
<p><b>What you must still own:</b> the reference model (arrows, identity, mutation visibility), choosing object vs Map, and safe key checks — these drive real bugs in production apps and state management.</p>`,
    problems: [{
      title: 'Invert an Object (with collisions)',
      level: 'Easy', tags: ['objects', 'Object.entries', 'grouping'], companies: ['Adobe', 'Paytm', 'Walmart'],
      statement: `<p>Write <code>invert(obj)</code> that swaps keys and values. Because several keys can share a value, each new key maps to an <b>array</b> of original keys (in original key order). Do not mutate the input.</p>`,
      constraints: `<p>Up to 10<sup>5</sup> keys; values are strings or numbers (they become string keys).</p>`,
      example: `<p>${H.kv([['alice', 'admin'], ['bob', 'user'], ['cara', 'admin']], { label: 'input' })} → ${H.kv([['admin', "['alice', 'cara']"], ['user', "['bob']"]], { label: 'output', hl: { admin: 'g' } })} — two people share the value "admin", so both names are collected.</p>`,
      brute: { why: `<p>For each distinct value, scan <b>all</b> keys again to collect matches: O(n × distinct values) — for 10<sup>5</sup> keys with many distinct values that is ~10<sup>10</sup> steps. One pass is enough.</p>`, code: { lang: 'js', run: true, code: `function invert(obj) {
  const result = {};
  const values = [...new Set(Object.values(obj))];
  for (const v of values) {
    result[v] = Object.keys(obj).filter(k => obj[k] === v); // full scan per value
  }
  return result;
}
console.log(invert({ alice: 'admin', bob: 'user', cara: 'admin' }));` } },
      mcq: { q: 'Why use <code>Object.create(null)</code> (or a Map) for the result here?', options: ['A value like "constructor" or "__proto__" would clash with inherited properties of a plain {}', 'Plain objects cannot hold arrays', 'It is faster to create', 'Object.entries does not work on plain objects'], answer: 0, explain: 'If a value is "constructor", <code>result["constructor"]</code> already exists on a plain object (inherited), so <code>??=</code> would not create a fresh array. A prototype-less object or Map avoids that.' },
      hints: [`<p>Walk the entries once. For each <code>[key, value]</code>, the <b>value</b> becomes a bucket name and the <b>key</b> goes in that bucket.</p>`, `<p><code>(out[value] ??= []).push(key)</code> creates the bucket on first sight. Use <code>Object.create(null)</code> for <code>out</code> so values like "constructor" are safe.</p>`, `<p>Order: <code>Object.entries</code> follows key order, so buckets fill in original order. Empty object → empty result. Number values become string keys automatically.</p>`],
      solution: {
        approach: `<p>Single pass over <code>Object.entries</code>; group keys into buckets named by their value. A prototype-less accumulator prevents clashes with inherited names. Returns a fresh object, input untouched.</p>`,
        code: { lang: 'js', run: true, code: `function invert(obj) {
  const out = Object.create(null); // no inherited keys like 'constructor'
  for (const [key, value] of Object.entries(obj)) {
    (out[value] ??= []).push(key); // create bucket on first use, then add key
  }
  return out;
}

const roles = { alice: 'admin', bob: 'user', cara: 'admin' };
console.log(invert(roles));                 // { admin: [ 'alice', 'cara' ], user: [ 'bob' ] }
console.log(invert({ x: 1, y: 2, z: 1 }));  // { '1': [ 'x', 'z' ], '2': [ 'y' ] }
console.log(invert({ a: 'constructor' }));  // { constructor: [ 'a' ] } — safe
console.log(roles);                         // unchanged` },
        dry: { head: ['entry', 'value (bucket)', 'bucket existed?', 'out after'], rows: [
          ["['alice', 'admin']", 'admin', 'no → create []', "{ admin: ['alice'] }"],
          ["['bob', 'user']", 'user', 'no → create []', "{ admin: ['alice'], user: ['bob'] }"],
          ["['cara', 'admin']", 'admin', '<span class="c-g">yes</span>', "{ admin: ['alice', 'cara'], user: ['bob'] }"]
        ] },
        complexity: `<p>Time O(n), space O(n). The brute force is O(n × distinct values).</p>`,
        followUps: ['If values are unique, return a plain one-to-one inverted object', 'Invert a Map whose values are objects (use a Map for the result)', 'Make the "collision policy" a parameter: keep first, keep last, or collect']
      }
    }]
  });

  /* ================= TOPIC 8: Destructuring, spread & rest ================= */
  topics.push({
    title: 'Destructuring, Spread & Rest: Unpacking and Copying',
    analogy: `<p><b>Destructuring</b> is unpacking a delivery box: instead of saying "the box's first item, the box's second item", you lift things straight out into your hands — <i>"phone in my left hand, charger in my right, everything else stays in a bag"</i>. <b>Spread</b> is the opposite: tipping the contents of one box into a new, bigger box. But careful — if the old box held a <b>small inner box</b>, you only move that inner box across; you do not unpack and duplicate what is inside it. That is a <b>shallow copy</b>.</p>`,
    explain: `<p>🟢 <b>Array destructuring — by position.</b></p>
<pre>const [first, second] = ['red', 'green', 'blue'];   // first='red', second='green'
const [, , third] = ['red', 'green', 'blue'];       // skip with commas → 'blue'
const [a = 1, b = 2] = [10];                        // defaults: a=10, b=2
const [head, ...tail] = [1, 2, 3, 4];               // head=1, tail=[2, 3, 4]
[x, y] = [y, x];                                    // swap two variables</pre>
<p><b>Object destructuring — by name.</b></p>
<pre>const { name, age } = user;                 // pull properties into variables
const { name: fullName } = user;            // rename: variable is fullName
const { role = 'guest' } = user;            // default if missing/undefined
const { address: { city } } = user;         // nested: only 'city' is created
const { password, ...safeUser } = user;     // rest: everything except password</pre>
<p>Works in <b>function parameters</b> too: <code>function show({ name, age = 18 }) { … }</code> and in loops: <code>for (const [key, value] of Object.entries(o))</code>.</p>
<p><b>Spread <code>...</code></b> expands an iterable (array, string, Set, Map) into individual items, or an object into its own properties:</p>
${H.table(['Use', 'Code', 'Result'], [
  ['copy an array', '<code>[...arr]</code>', 'new array, same items'],
  ['merge arrays', '<code>[...a, ...b]</code>', 'one combined array'],
  ['insert in the middle', '<code>[...a.slice(0, i), x, ...a.slice(i)]</code>', 'new array'],
  ['unique values', '<code>[...new Set(arr)]</code>', 'duplicates removed'],
  ['string → chars', "<code>[...'héllo']</code>", "['h', 'é', 'l', 'l', 'o']"],
  ['copy an object', '<code>{ ...obj }</code>', 'new object, same props'],
  ['merge/override', '<code>{ ...defaults, ...options }</code>', '<b>later wins</b> on key clashes'],
  ['call with array', '<code>Math.max(...nums)</code>', 'array → separate arguments']
])}
<p><b>Rest vs spread:</b> same three dots. On the <b>left</b> of <code>=</code> or in a parameter list they <b>gather</b> (rest). On the <b>right</b> or in a call they <b>scatter</b> (spread).</p>
<p><b>⚠ Shallow!</b> Both spread and rest copy only one level. Nested objects/arrays are <b>shared</b> between the original and the copy. Changing <code>copy.address.city</code> changes <code>original.address.city</code>. For a full independent copy use <code>structuredClone(obj)</code>.</p>`,
    clues: [
      '"swap two variables without a temp" → <code>[a, b] = [b, a]</code>',
      '"function returns multiple values" → return an array/object and destructure at the call',
      '"remove a key without mutating" / "omit password" → <code>const { password, ...rest } = user</code>',
      '"merge defaults with user options" → <code>{ ...defaults, ...options }</code> (later wins)',
      '"I copied the object but nested changes leak back" → spread is shallow; use structuredClone or copy each level',
      '"remove duplicates" → <code>[...new Set(arr)]</code>',
      '"Cannot destructure property of undefined" → add a default: <code>function f({ a } = {})</code>'
    ],
    code: [{ lang: 'js', run: true, title: 'Destructuring patterns (runnable)', code: `// ----- Arrays: by position -----
const colours = ['red', 'green', 'blue'];
const [first, , third] = colours;          // skip the middle
console.log(first, third);                 // red blue

const [p = 'none', q = 'none'] = ['only-one'];
console.log(p, q);                         // only-one none

const [head, ...tail] = [1, 2, 3, 4];
console.log(head, tail);                   // 1 [ 2, 3, 4 ]

let x = 1, y = 2;
[x, y] = [y, x];                           // swap
console.log(x, y);                         // 2 1

// ----- Objects: by name -----
const user = {
  id: 7,
  name: 'Asha',
  address: { city: 'Pune', pin: '411001' },
  password: 'secret',
};
const { name: fullName, role = 'guest', address: { city } } = user;
console.log(fullName, role, city);          // Asha guest Pune
// note: no variable called 'address' was created by the nested pattern

const { password, ...safeUser } = user;     // omit a key
console.log(safeUser);                      // { id: 7, name: 'Asha', address: {...} }

// ----- In parameters, with a default for the whole object -----
function describe({ name, age = 18 } = {}) {
  return name + ' is ' + age;
}
console.log(describe({ name: 'Ben' }));     // Ben is 18
console.log(describe());                    // undefined is 18 (no crash)

// ----- In loops -----
for (const [k, v] of Object.entries({ a: 1, b: 2 })) console.log(k, v);

// ----- Returning several values -----
function minMax(arr) { return [Math.min(...arr), Math.max(...arr)]; }
const [lo, hi] = minMax([4, 9, 1]);
console.log(lo, hi);                        // 1 9` },
    { lang: 'js', run: true, title: 'Spread: copy, merge, and the shallow-copy trap', code: `// Arrays
const a = [1, 2];
const b = [3, 4];
console.log([...a, ...b], [0, ...a, 99]);    // [ 1, 2, 3, 4 ] [ 0, 1, 2, 99 ]
console.log([...new Set([3, 1, 3, 2, 1])]);  // [ 3, 1, 2 ]
console.log([...'hey']);                     // [ 'h', 'e', 'y' ]

// Objects: later properties win
const defaults = { theme: 'light', fontSize: 14, beta: false };
const prefs = { fontSize: 18 };
console.log({ ...defaults, ...prefs });      // { theme: 'light', fontSize: 18, beta: false }
console.log({ ...prefs, ...defaults });      // fontSize back to 14 — order matters!

// Conditional properties
const isAdmin = true;
const headers = { accept: 'json', ...(isAdmin && { 'x-role': 'admin' }) };
console.log(headers);                        // { accept: 'json', 'x-role': 'admin' }

// SHALLOW: nested objects are shared
const original = { name: 'Asha', address: { city: 'Pune' } };
const copy = { ...original };
copy.name = 'Ben';                // top level: independent
copy.address.city = 'Delhi';      // nested: SHARED with original!
console.log(original.name, original.address.city); // Asha Delhi
console.log(copy.address === original.address);    // true

// Fix 1: copy each level you change
const copy2 = { ...original, address: { ...original.address, city: 'Goa' } };
console.log(original.address.city, copy2.address.city); // Delhi Goa

// Fix 2: deep copy everything
const deep = structuredClone(original);
deep.address.city = 'Mumbai';
console.log(original.address.city, deep.address.city);  // Delhi Mumbai` }],
    codeTitle: ['Destructuring', 'Spread & shallow copies'],
    viz: [{
      title: 'Destructuring step by step: const { name, age = 18, address: { city }, ...rest } = user',
      gen: function () {
        var code = ["const user = { name: 'Asha', age: undefined,", "  address: { city: 'Pune', pin: 411001 }, role: 'admin', active: true };", '', 'const {', '  name,', '  age = 18,', '  address: { city },', '  ...rest', '} = user;'].join('\n');
        var userEntries = [['name', "'Asha'"], ['age', 'undefined'], ['address', '{ city, pin }'], ['role', "'admin'"], ['active', 'true']];
        function up(hl) { return { type: 'map', label: 'user (source object)', entries: userEntries, hl: hl || {} }; }
        return [
          fr('Destructuring reads the <b>pattern on the left</b> and pulls matching properties from <code>user</code> <b>by name</b>. Order in the pattern does not matter — names do.', [cp(code, { 4: 'cur', 9: 'cur' }), up({})]),
          fr('<code>name</code> → finds <code>user.name</code> → new variable <b>name = \'Asha\'</b>.', [cp(code, 5, 'ok'), up({ name: 'ok' }), vp({ name: 'Asha' }, 'name', 'ok', 'New variables')]),
          fr('<code>age = 18</code> → <code>user.age</code> exists but is <b>undefined</b>, so the <b>default 18</b> kicks in. (If it were <code>null</code> or <code>0</code>, the default would NOT apply.)', [cp(code, 6, 'ok'), up({ age: 'cur' }), vp({ name: 'Asha', age: 18 }, 'age', 'ok', 'New variables')]),
          fr('<code>address: { city }</code> is a <b>nested pattern</b>: go into <code>user.address</code>, pull <code>city</code>. Only <b>city</b> becomes a variable — there is <b>no</b> variable called <code>address</code>!', [cp(code, 7, 'ok'), up({ address: 'cur' }), vp({ name: 'Asha', age: 18, city: 'Pune' }, 'city', 'ok', 'New variables')]),
          fr('<code>...rest</code> gathers every <b>remaining own property</b> not already named (name, age, address are taken) into a <b>new object</b>.', [cp(code, 8, 'ok'), up({ role: 'win', active: 'win' }), vp({ name: 'Asha', age: 18, city: 'Pune', rest: { role: 'admin', active: true } }, 'rest', 'ok', 'New variables')]),
          fr('Done. <code>user</code> itself is <b>unchanged</b>. Common errors: destructuring <code>undefined</code>/<code>null</code> throws <span class="c-r">TypeError: Cannot destructure…</span>; a nested pattern throws if the middle object is missing, unless you give it a default: <code>address: { city } = {}</code>.', [cp(code, 9, 'ok'), vp({ name: 'Asha', age: 18, city: 'Pune', rest: { role: 'admin', active: true }, address: 'ReferenceError: not defined' }, 'address', 'bad', 'Final variables')])
        ];
      }
    }, {
      title: 'Spread makes a SHALLOW copy (nested objects are shared)',
      gen: function () {
        var code = ["const original = { name: 'Asha', address: { city: 'Pune' } };", 'const copy = { ...original };', "copy.name = 'Ben';", "copy.address.city = 'Delhi';", 'console.log(original.address.city);', "const safe = { ...original, address: { ...original.address } };"].join('\n');
        function g(o1, o2, addr, addr2, hl, ehl) {
          var nodes = [{ id: 'orig', label: 'original', x: 10, y: 10, shape: 'box' }, { id: 'O1', label: o1, x: 45, y: 10, shape: 'box', w: 30 }, { id: 'A', label: addr, x: 85, y: 30, shape: 'box', w: 22 }];
          var edges = [['orig', 'O1'], ['O1', 'A', 'address']];
          if (o2) { nodes.push({ id: 'cp', label: 'copy', x: 10, y: 50, shape: 'box' }); nodes.push({ id: 'O2', label: o2, x: 45, y: 50, shape: 'box', w: 30 }); edges.push(['cp', 'O2']); edges.push(['O2', addr2 ? 'A2' : 'A', 'address']); }
          if (addr2) nodes.push({ id: 'A2', label: addr2, x: 85, y: 58, shape: 'box', w: 22 });
          return { type: 'graph', label: 'References in memory', directed: true, height: 68, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} };
        }
        return [
          fr('Line 1: <code>original</code> points to an object whose <code>address</code> property points to <b>another</b> object.', [cp(code, 1, 'ok'), g("{ name: 'Asha' }", null, "{ city: 'Pune' }", null, { O1: 'ok', A: 'ok' })]),
          fr('Line 2: <code>{ ...original }</code> creates a <b>new outer object</b> and copies each property value. <code>name</code> is a string (copied). <code>address</code> holds a <b>reference</b> — so the reference is copied, and both outer objects point to the <b>same</b> address object.', [cp(code, 2, 'cur'), g("{ name: 'Asha' }", "{ name: 'Asha' }", "{ city: 'Pune' }", null, { O2: 'ok', A: 'cur' }, { 'O2-A': 'cur', 'O1-A': 'cur' })]),
          fr("Line 3: <code>copy.name = 'Ben'</code> changes only the copy's own top-level property. Original still says Asha. ✔", [cp(code, 3, 'ok'), g("{ name: 'Asha' }", "{ name: 'Ben' }", "{ city: 'Pune' }", null, { O2: 'ok' })]),
          fr("Line 4: <code>copy.address.city = 'Delhi'</code> follows copy → <b>shared</b> address object and changes it…", [cp(code, 4, 'bad'), g("{ name: 'Asha' }", "{ name: 'Ben' }", "{ city: 'Delhi' }", null, { A: 'bad' }, { 'O2-A': 'bad' })]),
          fr("…so line 5 prints <b>'Delhi'</b> for the original too. <span class=\"c-r\">This is the #1 bug with spread copies</span> (and with React/Redux state updates).", [cp(code, 5, 'bad'), g("{ name: 'Asha' }", "{ name: 'Ben' }", "{ city: 'Delhi' }", null, { A: 'bad', O1: 'cur' }, { 'O1-A': 'bad', 'O2-A': 'bad' }), tx('<b>Console:</b> <code>Delhi</code>', 'Output')]),
          fr('Line 6 — the fix: also spread the <b>nested</b> level you plan to change. Now the copy has its <b>own</b> address object. (Or use <code>structuredClone</code> for a full deep copy.)', [cp(code, 6, 'ok'), g("{ name: 'Asha' }", "{ name: 'Asha' }", "{ city: 'Delhi' }", "{ city: 'Delhi' } (new)", { A2: 'ok', O2: 'ok' }, { 'O2-A2': 'ok' })])
        ];
      }
    }],
    examples: [
      { title: 'Predict the output: default only for undefined', html: `<p>Destructuring defaults follow the same rule as parameter defaults.</p>${H.table(['Source', 'Pattern', 'Result']
      , [['<code>{ a: undefined }</code>', '<code>{ a = 5 }</code>', '<span class="c-g">a = 5</span>'], ['<code>{ a: null }</code>', '<code>{ a = 5 }</code>', '<span class="c-r">a = null</span>'], ['<code>{ a: 0 }</code>', '<code>{ a = 5 }</code>', '<span class="c-r">a = 0</span>'], ['<code>{}</code>', '<code>{ a = 5 }</code>', '<span class="c-g">a = 5</span>']])}`, code: { lang: 'js', run: true, code: `const { a: a1 = 5 } = { a: undefined };
const { a: a2 = 5 } = { a: null };
const { a: a3 = 5 } = { a: 0 };
const { a: a4 = 5 } = {};
console.log(a1, a2, a3, a4); // 5 null 0 5` } },
      { title: 'Rename + default + nested in one go', html: `<p>Real API responses are nested and inconsistent. One pattern can rename, default and dig at once. Read <code>data: { user: { name: userName = 'anon' } = {} } = {}</code> as: "go into data (or an empty object), into user (or an empty object), take name, call it userName, default 'anon'".</p>`, code: { lang: 'js', run: true, code: `function getName(response) {
  const { data: { user: { name: userName = 'anon' } = {} } = {} } = response;
  return userName;
}
console.log(getName({ data: { user: { name: 'Asha' } } })); // Asha
console.log(getName({ data: {} }));                         // anon
console.log(getName({}));                                   // anon
// (For simple reads, optional chaining is often clearer:)
const resp = { data: {} };
console.log(resp.data?.user?.name ?? 'anon');               // anon` } },
      { title: 'Immutable update of nested state', html: `<p>To change <code>state.user.address.city</code> without mutating, copy <b>every level on the path</b> and leave untouched branches shared (that sharing is fine — and efficient — because nobody mutates them).</p>${H.table(['Level', 'Copied?'], [['state', '<span class="c-g">yes (new object)</span>'], ['state.user', '<span class="c-g">yes</span>'], ['state.user.address', '<span class="c-g">yes</span>'], ['state.settings', '<span class="c-m">no — shared, unchanged</span>']])}`, code: { lang: 'js', run: true, code: `const state = {
  user: { name: 'Asha', address: { city: 'Pune', pin: '411001' } },
  settings: { theme: 'dark' },
};
const next = {
  ...state,
  user: {
    ...state.user,
    address: { ...state.user.address, city: 'Goa' },
  },
};
console.log(state.user.address.city, next.user.address.city); // Pune Goa
console.log(next.settings === state.settings);                // true (shared, fine)
console.log(next.user === state.user);                        // false (new)` } },
      { title: 'Spread vs Object.assign', html: `<p><code>{ ...a, ...b }</code> creates a <b>new</b> object. <code>Object.assign(target, a, b)</code> <b>mutates</b> <code>target</code> (and triggers its setters). <code>Object.assign({}, a, b)</code> is the pre-2018 equivalent of spread.</p>`, code: { lang: 'js', run: true, code: `const target = { x: 1 };
const merged = Object.assign(target, { y: 2 });
console.log(merged === target, target); // true { x: 1, y: 2 } — mutated!

const t2 = { x: 1 };
const spread = { ...t2, y: 2 };
console.log(spread === t2, t2);        // false { x: 1 } — untouched` } }
    ],
    deepDive: `<p>🟣 <b>What array destructuring really uses.</b> Array patterns work on any <b>iterable</b> — they call <code>[Symbol.iterator]()</code> and pull values one by one. That is why <code>const [a, b] = new Set([1, 2])</code> and <code>const [[k, v]] = map</code> work, and why destructuring a non-iterable (<code>const [x] = {}</code>) throws <code>TypeError: {} is not iterable</code>. Object patterns instead do property lookups (including inherited ones), and work on primitives too: <code>const { length } = 'hello'</code> → 5.</p>
<p><b>Object rest</b> copies only <b>own enumerable</b> properties (string and symbol keys) — not inherited ones, not non-enumerable ones. Object spread is the same, and it <b>invokes getters</b> on the source (copying the current value, not the getter) while <b>defining</b> (not setting) properties on the result — so setters on the target are not triggered, unlike <code>Object.assign</code>. Spreading <code>null</code>/<code>undefined</code> into an object is a no-op (<code>{ ...null }</code> → <code>{}</code>), but spreading them into an array throws.</p>
<p><b>Statement gotcha.</b> Assigning to existing variables with an object pattern needs brackets, because a line starting with <code>{</code> is a block: <code>({ a, b } = obj);</code>. Also put a semicolon before a line starting with <code>[</code> (e.g. the swap) if you do not use semicolons — otherwise it merges with the previous line.</p>
<p><b>Performance & memory.</b> Spread is O(n) per copy. Copying a large object or array inside a loop (or a reducer) is the classic accidental O(n²). Structural sharing — copy only the path you change, share the rest — is how Redux, Immer and persistent data structures stay fast.</p>
<p><b>Deep copy options.</b> <code>structuredClone</code> (all modern browsers, Node 17+) deep-copies plain objects, arrays, Date, Map, Set, RegExp, typed arrays and even cycles; it throws on functions and DOM nodes, and drops class prototypes and property descriptors. <code>JSON.parse(JSON.stringify(x))</code> is lossier (see the JSON topic).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> generated code uses destructuring and spread everywhere — good for readability. The silent danger is <b>shallow copies</b>: AI-written state updates often spread the top level and then mutate a nested array (<code>newState.items.push(x)</code>), producing UI bugs where the screen does not refresh.</p>
<p><b>Use AI as a partner:</b> <code>"Which objects are shared between 'state' and 'next' after this update? Draw the reference tree."</code>, <code>"Rewrite this nested update with structural sharing, then with Immer."</code>, <code>"Add safe defaults so this destructuring cannot throw on missing data."</code></p>
<p><b>Where AI goes wrong:</b> treating <code>{ ...obj }</code> as a deep clone, deep-destructuring API responses without defaults (crash on a missing field), and spreading huge arrays into function calls.</p>
<p><b>What you must still own:</b> knowing exactly which level a copy reaches, reading complex patterns quickly (rename vs nested vs default), and the reference diagram that explains "why did my original change?".</p>`,
    problems: [{
      title: 'Deep-Merge Settings (defaults + user overrides)',
      level: 'Medium', tags: ['spread', 'recursion', 'objects', 'immutability'], companies: ['Microsoft', 'Atlassian', 'Postman'],
      statement: `<p>Write <code>mergeSettings(defaults, overrides)</code> returning a <b>new</b> object. Plain-object values are merged <b>recursively</b>; any other value (number, string, boolean, null, array) in <code>overrides</code> replaces the default. Keys whose override is <code>undefined</code> keep the default. Neither input may be mutated.</p>`,
      constraints: `<p>Depth ≤ 20; no cycles; arrays are replaced, not merged.</p>`,
      example: `<p><code>defaults = { theme: 'light', editor: { tabSize: 2, wrap: true }, plugins: ['git'] }</code><br><code>overrides = { editor: { tabSize: 4 }, plugins: ['lint'] }</code><br>→ ${H.c('g', "{ theme: 'light', editor: { tabSize: 4, wrap: true }, plugins: ['lint'] }")}<br>A plain <code>{ ...defaults, ...overrides }</code> would give ${H.c('r', '{ editor: { tabSize: 4 } }')} — <code>wrap</code> is lost because the whole <code>editor</code> object was replaced.</p>`,
      brute: { why: `<p>One-level spread is short but <b>wrong</b> for nested settings: the override's <code>editor</code> object replaces the default's entirely, losing <code>wrap</code>. Patching it by hand for each nested key does not scale and breaks when new nested groups are added.</p>`, code: { lang: 'js', run: true, code: `function mergeSettings(defaults, overrides) {
  return { ...defaults, ...overrides }; // shallow: nested objects are replaced, not merged
}
const out = mergeSettings(
  { theme: 'light', editor: { tabSize: 2, wrap: true } },
  { editor: { tabSize: 4 } }
);
console.log(out.editor); // { tabSize: 4 } — 'wrap' is gone` } },
      mcq: { q: 'Which check correctly decides "merge recursively" for a value v?', options: ['<code>v !== null &amp;&amp; typeof v === \'object\' &amp;&amp; !Array.isArray(v)</code>', '<code>typeof v === \'object\'</code>', '<code>v instanceof Object</code>', '<code>Object.keys(v).length &gt; 0</code>'], answer: 0, explain: 'typeof null is "object" and arrays are objects too; both must be excluded. instanceof Object is also true for arrays, dates and functions.' },
      hints: [`<p>Start from a shallow copy of <code>defaults</code>. Then walk the override's entries and decide per key: recurse or replace.</p>`, `<p>Write a helper <code>isPlainObject(v)</code>. Recurse only when <b>both</b> the default value and the override value are plain objects.</p>`, `<p>Skip keys whose override is <code>undefined</code>. Because you always build new objects with spread, neither input is mutated. Arrays are replaced (copy them with <code>[...v]</code> so the result does not share them).</p>`],
      solution: {
        approach: `<p>Recursive structural merge. Copy the defaults' top level, then for each override key: if both sides are plain objects, recurse; if the override is undefined, keep the default; otherwise replace (copying arrays). Every level that differs is a fresh object, so inputs stay untouched.</p>`,
        code: { lang: 'js', run: true, code: `const isPlainObject = v =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

function mergeSettings(defaults, overrides = {}) {
  const result = { ...defaults };                        // new top-level object
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;                   // keep the default
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = mergeSettings(result[key], value);   // merge nested groups
    } else {
      result[key] = Array.isArray(value) ? [...value] : value; // replace
    }
  }
  return result;
}

const defaults = { theme: 'light', editor: { tabSize: 2, wrap: true, font: { size: 12, family: 'mono' } }, plugins: ['git'] };
const overrides = { editor: { tabSize: 4, font: { size: 14 } }, plugins: ['lint'], theme: undefined };
const merged = mergeSettings(defaults, overrides);
console.log(JSON.stringify(merged));
// {"theme":"light","editor":{"tabSize":4,"wrap":true,"font":{"size":14,"family":"mono"}},"plugins":["lint"]}
console.log(defaults.editor.tabSize, defaults.editor.font.size); // 2 12 — untouched` },
        dry: { head: ['key path', 'default', 'override', 'decision', 'result'], rows: [
          ['theme', "'light'", 'undefined', 'skip', "'light'"],
          ['editor', '{ tabSize, wrap, font }', '{ tabSize, font }', 'both plain → recurse', 'new object'],
          ['editor.tabSize', '2', '4', 'replace', '4'],
          ['editor.font', '{ size: 12, family }', '{ size: 14 }', 'recurse', "{ size: 14, family: 'mono' }"],
          ['plugins', "['git']", "['lint']", 'array → replace (copied)', "['lint']"]
        ] },
        complexity: `<p>Time O(total keys in overrides + copied keys of defaults along merged paths). Space the same for the new objects; recursion depth = nesting depth.</p>`,
        followUps: ['Guard against prototype pollution: skip <code>__proto__</code>, <code>constructor</code>, <code>prototype</code> keys', 'Support cycles with a WeakMap of visited objects', 'Allow a "replace" marker to replace a nested object instead of merging']
      }
    }]
  });

  registerModule({ id: 'js02', title: 'Functions, Arrays & Objects', intro: '<p>stub</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
