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
console.log(byVowels); // [ 'fig', 'apple', 'kiwi', 'banana' ] (apple and kiwi tie on 2 vowels → alphabetical)` }],
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

  /* ================= TOPIC 9: JSON ================= */
  topics.push({
    title: 'JSON: stringify, parse, What Gets Lost & Deep Copies',
    analogy: `<p>JSON is like <b>vacuum-packing clothes for shipping</b>. <code>JSON.stringify</code> squeezes your living JavaScript object into a flat, portable <b>text</b> package that any language can open. <code>JSON.parse</code> unpacks it on the other side. But the vacuum bag only fits plain things: shirts (strings), socks (numbers), trousers (booleans), boxes (objects/arrays) and empty space (<code>null</code>). Batteries (functions), mystery items (<code>undefined</code>) and fancy gadgets (Dates, Maps) get <b>thrown out or flattened</b> on the way.</p>`,
    explain: `<p>🟢 <b>What JSON is.</b> JSON (JavaScript Object Notation) is a <b>text format</b> for data — the language of web APIs, config files and local storage. It looks like a JS object literal but is stricter:</p>
${H.table(['Rule', 'Valid JSON', '<span class="c-r">Invalid JSON</span>'], [
  ['keys in double quotes', '<code>{"name": "Asha"}</code>', "<code>{name: 'Asha'}</code>"],
  ['strings in double quotes', '<code>"hi"</code>', "<code>'hi'</code>"],
  ['no trailing commas', '<code>[1, 2]</code>', '<code>[1, 2,]</code>'],
  ['no comments', '—', '<code>// note</code>'],
  ['allowed values', 'string, number, true/false, null, object, array', 'undefined, NaN, Infinity, functions, Dates']
])}
<p><b>Two functions do all the work:</b></p>
<ul><li><code>JSON.stringify(value, replacer?, space?)</code> → JS value to JSON <b>text</b>. Pass <code>space = 2</code> for pretty, indented output.</li>
<li><code>JSON.parse(text, reviver?)</code> → JSON text back to a JS value. Invalid text throws <code>SyntaxError</code>, so wrap untrusted input in <code>try/catch</code>.</li></ul>
<p><b>What stringify does with awkward values:</b></p>
${H.table(['JS value', 'Inside an object', 'Inside an array', 'At the top level'], [
  ['<code>undefined</code>, functions, Symbols', '<span class="c-r">key dropped</span>', '<code>null</code>', '<code>undefined</code> (not a string!)'],
  ['<code>NaN</code>, <code>Infinity</code>', '<code>null</code>', '<code>null</code>', '<code>"null"</code>'],
  ['<code>Date</code>', 'ISO string (via <code>toJSON</code>)', 'ISO string', 'ISO string'],
  ['<code>Map</code>, <code>Set</code>', '<code>{}</code> (data lost)', '<code>{}</code>', '<code>"{}"</code>'],
  ['<code>BigInt</code>', '<span class="c-r">TypeError</span>', '<span class="c-r">TypeError</span>', '<span class="c-r">TypeError</span>'],
  ['circular reference', '<span class="c-r">TypeError</span>', '<span class="c-r">TypeError</span>', '—']
])}
<p><b>Round trip is not perfect.</b> After <code>JSON.parse(JSON.stringify(x))</code>, Dates come back as <b>strings</b>, Maps as empty objects, class instances as plain objects, and <code>undefined</code> fields vanish. Use a <b>reviver</b> to rebuild Dates, and <code>structuredClone</code> when you just need a deep copy in memory.</p>`,
    clues: [
      '"send/receive data from an API" / "save to localStorage" → <code>JSON.stringify</code> / <code>JSON.parse</code>',
      '"Unexpected token … in JSON" / "is not valid JSON" → <code>SyntaxError</code>; wrap parse in try/catch',
      '"my Date became a string after parse" → reviver or convert explicitly',
      '"deep clone an object" → <code>structuredClone</code> (JSON trick loses Dates, Maps, undefined)',
      '"Converting circular structure to JSON" → cycles; use a replacer with a WeakSet or restructure',
      '"hide the password field when logging" → replacer function or <code>toJSON</code>',
      '"pretty print" → <code>JSON.stringify(obj, null, 2)</code>'
    ],
    code: [{ lang: 'js', run: true, title: 'stringify & parse basics (runnable)', code: `const user = { name: 'Asha', age: 30, skills: ['js', 'sql'], active: true, manager: null };

// Object -> JSON text
const text = JSON.stringify(user);
console.log(text);           // {"name":"Asha","age":30,"skills":["js","sql"],"active":true,"manager":null}
console.log(typeof text);    // string

// Pretty print with 2-space indentation
console.log(JSON.stringify({ a: 1, b: [1, 2] }, null, 2));

// JSON text -> object (a brand-new object)
const back = JSON.parse(text);
console.log(back.skills[1], back === user); // sql false

// What gets lost or changed
const tricky = {
  missing: undefined,          // dropped
  fn() { return 1; },          // dropped
  notANumber: NaN,             // null
  when: new Date('2026-01-15T10:00:00Z'), // ISO string
  lookup: new Map([['k', 1]]), // {}
  list: [undefined, () => 1, Infinity],   // [null, null, null]
};
console.log(JSON.stringify(tricky));
// {"notANumber":null,"when":"2026-01-15T10:00:00.000Z","lookup":{},"list":[null,null,null]}

// Top-level oddities
console.log(JSON.stringify(undefined), JSON.stringify(() => 1)); // undefined undefined (not strings!)
console.log(JSON.stringify('hi'), JSON.stringify(42));           // "hi" 42

// Invalid JSON throws
for (const bad of ["{name: 'x'}", '[1, 2,]', '']) {
  try {
    JSON.parse(bad);
  } catch (e) {
    console.log('SyntaxError for', JSON.stringify(bad), '->', e.name);
  }
}` },
    { lang: 'js', run: true, title: 'replacer, toJSON, reviver and structuredClone', code: `const account = { id: 7, user: 'asha', password: 'hunter2', balance: 1500 };

// Replacer ARRAY: whitelist of keys
console.log(JSON.stringify(account, ['id', 'user'])); // {"id":7,"user":"asha"}

// Replacer FUNCTION: called for every key/value; return undefined to drop
const masked = JSON.stringify(account, (key, value) =>
  key === 'password' ? '***' : value
);
console.log(masked); // {"id":7,"user":"asha","password":"***","balance":1500}

// toJSON: an object decides how it is serialised
class Money {
  constructor(paise) { this.paise = paise; }
  toJSON() { return (this.paise / 100).toFixed(2) + ' INR'; }
}
console.log(JSON.stringify({ total: new Money(123450) })); // {"total":"1234.50 INR"}

// Reviver: rebuild Dates while parsing
const ISO = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$/;
const json = '{"title":"launch","at":"2026-03-01T09:30:00.000Z"}';
const plain = JSON.parse(json);
const revived = JSON.parse(json, (key, value) =>
  typeof value === 'string' && ISO.test(value) ? new Date(value) : value
);
console.log(typeof plain.at, revived.at instanceof Date); // string true

// Deep copy: JSON trick vs structuredClone
const original = { when: new Date(0), tags: new Set(['a']), nested: { n: 1 }, gone: undefined };
const viaJson = JSON.parse(JSON.stringify(original));
const viaClone = structuredClone(original);
console.log(typeof viaJson.when, viaJson.tags, 'gone' in viaJson);          // string {} false
console.log(viaClone.when instanceof Date, viaClone.tags.has('a'), 'gone' in viaClone); // true true true
viaClone.nested.n = 99;
console.log(original.nested.n); // 1 — truly independent` }],
    codeTitle: ['stringify & parse', 'replacer / toJSON / reviver / structuredClone'],
    viz: [{
      title: 'JSON.stringify walks an object: kept, converted, dropped',
      gen: function () {
        var code = ['JSON.stringify({', "  id: 42,", "  item: 'pen',", '  price: NaN,', '  note: undefined,', '  print() {},', "  tags: ['a', undefined],", "  created: new Date('2026-01-15T10:00:00Z'),", "  meta: new Map([['k', 1]]),", '});'].join('\n');
        var steps = [
          ['id', '42', '42', 'number → kept', 'ok', 2],
          ['item', "'pen'", '"pen"', 'string → double quotes', 'ok', 3],
          ['price', 'NaN', 'null', 'NaN/Infinity are not valid JSON numbers', 'cur', 4],
          ['note', 'undefined', '(key dropped)', 'undefined has no JSON form', 'bad', 5],
          ['print', 'ƒ print', '(key dropped)', 'functions are not data', 'bad', 6],
          ['tags', "['a', undefined]", '["a",null]', 'inside arrays undefined becomes null (to keep positions)', 'cur', 7],
          ['created', 'Date object', '"2026-01-15T10:00:00.000Z"', 'Date has toJSON() → ISO string', 'cur', 8],
          ['meta', "Map { 'k' → 1 }", '{}', 'Map has no own enumerable props → data lost!', 'bad', 9]
        ];
        var f = [], rows = [], out = [];
        f.push(fr('stringify visits each <b>own enumerable</b> property in order and decides: keep, convert, or drop.', [cp(code, 1), { type: 'table', label: 'Decisions so far', columns: ['key', 'JS value', 'JSON', 'why'], rows: [] }]));
        steps.forEach(function (s) {
          rows.push([s[0], s[1], s[2], s[3]]);
          if (s[2] !== '(key dropped)') out.push('"' + s[0] + '":' + s[2]);
          var hl = {}; hl[rows.length - 1] = s[4] === 'ok' ? 'ok' : s[4] === 'bad' ? 'bad' : 'cur';
          f.push(fr('<b>' + s[0] + '</b>: ' + esc(s[3]) + '.', [cp(code, s[5], s[4] === 'bad' ? 'bad' : s[4] === 'ok' ? 'ok' : 'cur'), { type: 'table', label: 'Decisions so far', columns: ['key', 'JS value', 'JSON', 'why'], rows: rows.slice(), hl: hl }, tx('<code>' + esc('{' + out.join(',') + '}') + '</code>', 'JSON text being built')]));
        });
        f.push(fr('Final text. <b>2 keys vanished</b>, NaN became null, the Date became a string, the Map became <code>{}</code>. Parsing this back will NOT give you the original object.', [tx('<code>' + esc('{' + out.join(',') + '}') + '</code>', 'Result of JSON.stringify'), vp({ 'keys in': 8, 'keys out': out.length }, 'keys out', 'bad', 'Summary')]));
        return f;
      }
    }, {
      title: 'JSON.parse with a reviver: the order of calls',
      input: '{"name":"Asha","born":"1995-06-01T00:00:00.000Z","tags":["x","y"]}',
      inputLabel: 'JSON text (short, ≤ 200 chars)',
      gen: function (input) {
        var text = String(input === undefined ? '' : input).trim();
        if (!text) throw new Error('Enter some JSON text, e.g. {"a":1,"b":[2,3]}');
        if (text.length > 200) throw new Error('Keep the JSON under 200 characters');
        var calls = [], ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
        var result;
        try {
          result = JSON.parse(text, function (key, value) {
            var conv = typeof value === 'string' && ISO.test(value);
            calls.push({ key: key, value: value, conv: conv });
            return conv ? new Date(value) : value;
          });
        } catch (e) {
          throw new Error('Not valid JSON (' + e.message + '). Remember: double quotes, no trailing commas.');
        }
        if (calls.length > 25) throw new Error('Too many values for the animation — use a smaller JSON (≤ 25 values)');
        function brief(v) {
          if (v instanceof Date) return 'Date(' + v.toISOString().slice(0, 10) + ')';
          if (Array.isArray(v)) return '[' + v.length + ' items]';
          if (v && typeof v === 'object') return '{' + Object.keys(v).join(', ') + '}';
          return show(v);
        }
        var f = [], rows = [];
        f.push(fr('JSON.parse first builds the whole value, then calls the reviver <b>bottom-up</b>: children before their parent, and finally the root with key <code>""</code>. Our reviver turns ISO date strings into <b>Date</b> objects.', [tx('<code>' + esc(text) + '</code>', 'Input text'), { type: 'table', label: 'Reviver calls', columns: ['#', 'key', 'value received', 'returned'], rows: [] }]));
        calls.forEach(function (c, i) {
          rows.push([String(i + 1), c.key === '' ? '"" (root)' : c.key, c.conv ? show(c.value) : brief(c.value), c.conv ? 'Date object ✔' : 'unchanged']);
          var hl = {}; hl[i] = c.conv ? 'ok' : c.key === '' ? 'sel' : 'cur';
          var why = c.key === '' ? 'Last call: the <b>root</b> value with key <code>""</code>. Whatever you return here is the final result.' : c.conv ? 'Key <b>' + esc(c.key) + '</b> holds an ISO date string → reviver returns <b>new Date(…)</b>.' : (c.value !== null && typeof c.value === 'object') ? 'Key <b>' + esc(c.key) + '</b> is a container — all its children were already revived.' : 'Key <b>' + esc(c.key) + '</b> is a plain value → returned unchanged.';
          f.push(fr('Call #' + (i + 1) + ': ' + why + ' (Returning <code>undefined</code> would delete the key.)', [{ type: 'table', label: 'Reviver calls', columns: ['#', 'key', 'value received', 'returned'], rows: rows.slice(), hl: hl }]));
        });
        f.push(fr('Done after <b>' + calls.length + '</b> calls. Result: <b>' + esc(brief(result)) + '</b>' + (calls.some(function (c) { return c.conv; }) ? ' with real Date objects inside.' : '. No ISO dates found, so nothing was converted.'), [vp({ 'reviver calls': calls.length, 'dates revived': calls.filter(function (c) { return c.conv; }).length }, 'dates revived', 'sel', 'Summary')]));
        return f;
      }
    }],
    examples: [
      { title: 'Predict the output: the round-trip surprise', html: `<p>Look at each field before and after <code>JSON.parse(JSON.stringify(x))</code>.</p>${H.table(['Field', 'Before', 'After round trip'], [['<code>n</code>', '1', '1 ✔'], ['<code>d</code>', 'Date', '<span class="c-r">string</span>'], ['<code>u</code>', 'undefined', '<span class="c-r">key missing</span>'], ['<code>inf</code>', 'Infinity', '<span class="c-r">null</span>'], ['<code>s</code>', 'Set {1, 2}', '<span class="c-r">{}</span>']])}`, code: { lang: 'js', run: true, code: `const x = { n: 1, d: new Date(0), u: undefined, inf: Infinity, s: new Set([1, 2]) };
const y = JSON.parse(JSON.stringify(x));
console.log(y);                    // { n: 1, d: '1970-01-01T00:00:00.000Z', inf: null, s: {} }
console.log(typeof y.d, 'u' in y); // string false` } },
      { title: 'Safe parse for untrusted input', html: `<p>Data from users, files, or the network can be broken. Never let one bad payload crash your app: catch the <code>SyntaxError</code> and return a fallback — and remember valid JSON can still be the <b>wrong shape</b>, so check what you got.</p>${H.table(['Input', 'Result'], [['<code>\'{"a":1}\'</code>', '{ ok: true, value: { a: 1 } }'], ["<code>'{a:1}'</code>", '{ ok: false, error: \'SyntaxError…\' }'], ["<code>'null'</code>", '{ ok: true, value: null } — valid but maybe not what you expect!']])}`, code: { lang: 'js', run: true, code: `function safeParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e.name + ': ' + e.message };
  }
}
console.log(safeParse('{"a":1}'));
console.log(safeParse('{a:1}').ok);  // false
console.log(safeParse('null'));      // { ok: true, value: null }` } },
      { title: 'Circular references', html: `<p>An object that (directly or indirectly) contains itself cannot be written as finite text. stringify throws <code>TypeError: Converting circular structure to JSON</code>. A replacer with a <code>WeakSet</code> of seen objects can substitute a marker.</p>`, code: { lang: 'js', run: true, code: `const node = { name: 'root', children: [] };
node.children.push({ name: 'child', parent: node }); // cycle

try { JSON.stringify(node); } catch (e) { console.log(e.name); } // TypeError

function safeStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (key, v) => {
    if (v !== null && typeof v === 'object') {
      if (seen.has(v)) return '[Circular]';
      seen.add(v);
    }
    return v;
  });
}
console.log(safeStringify(node)); // {"name":"root","children":[{"name":"child","parent":"[Circular]"}]}` } },
      { title: 'Big numbers lose precision', html: `<p>JSON numbers become JS doubles, which are exact only up to 2<sup>53</sup> − 1 = 9 007 199 254 740 991. IDs from databases (e.g. 64-bit snowflake IDs) can be silently changed. APIs therefore send big IDs as <b>strings</b>.</p>${H.table(['JSON text', 'Parsed'], [['<code>{"id": 9007199254740993}</code>', '<span class="c-r">9007199254740992</span>'], ['<code>{"id": "9007199254740993"}</code>', '<span class="c-g">"9007199254740993"</span> → <code>BigInt(id)</code>']])}`, code: { lang: 'js', run: true, code: `const parsed = JSON.parse('{"id": 9007199254740993}');
console.log(parsed.id);                      // 9007199254740992 (changed!)
const safe = JSON.parse('{"id": "9007199254740993"}');
console.log(BigInt(safe.id) + 1n);           // 9007199254740994n
try { JSON.stringify({ big: 10n }); } catch (e) { console.log(e.name, '-', e.message); }` } }
    ],
    deepDive: `<p>🟣 <b>stringify algorithm in order:</b> for each value — (1) if it has a <code>toJSON</code> method, call it (Date does this); (2) call the replacer function (with <code>this</code> = the containing object); (3) unwrap Number/String/Boolean wrapper objects; (4) serialise by type. Only <b>own enumerable string-keyed</b> properties are included, in normal property order. The <code>space</code> argument is capped at 10 characters. Well-formed stringify (ES2019) escapes lone surrogates as <code>\\uDXXX</code>, so output is always valid UTF-8.</p>
<p><b>parse details.</b> The grammar is strict (RFC 8259): no comments, no single quotes, no leading zeros (<code>012</code>), no <code>NaN</code>. Duplicate keys are allowed and the <b>last one wins</b>. A key named <code>"__proto__"</code> becomes an ordinary own property (JSON.parse does not set the prototype) — the danger appears later if your code <b>merges</b> that parsed object into another with naive assignment, which is how prototype-pollution bugs happen. Newer engines (V8 / Chrome 114+, Node 21+) also pass a third <code>context</code> argument to the reviver with the <b>source text</b> of primitives, enabling exact big-number parsing.</p>
<p><b>Performance.</b> JSON.parse is extremely fast — V8 has a dedicated parser, and parsing a JSON string can even be faster than evaluating an equivalent JS object literal for large data (a known trick for big embedded configs). stringify on huge objects blocks the main thread; for multi-MB payloads consider streaming or doing it in a Worker. <code>structuredClone</code> uses the HTML structured-clone algorithm (the same one used by <code>postMessage</code>), so its cost is similar to stringify+parse but it keeps types.</p>
<p><b>JSON vs JS object literal.</b> All JSON is (almost) valid JS, but not the other way round. JSON has no dates, no comments, no references — formats like JSON5, YAML, or MessagePack/CBOR exist for those needs, and schema tools (JSON Schema, Zod) validate the <b>shape</b> after parsing.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> LLMs speak JSON natively: tool/function calling, "structured outputs" and agent protocols all exchange JSON. That makes <code>JSON.parse</code> on <b>model output</b> a daily task — and model output may include markdown fences, trailing commas or truncated text. Robust code wraps parse in try/catch, strips fences, and validates the shape with a schema (e.g. Zod) before trusting it.</p>
<p><b>Use AI as a partner:</b> <code>"Generate a JSON Schema and a Zod validator for this payload"</code>, <code>"Which fields of this object will be lost or changed by JSON.stringify?"</code>, <code>"Write a reviver that restores Dates and BigInt IDs"</code>.</p>
<p><b>Where AI goes wrong:</b> recommending <code>JSON.parse(JSON.stringify(x))</code> as a universal deep clone, comparing objects with <code>JSON.stringify(a) === JSON.stringify(b)</code> (key order breaks it), and assuming API numbers are safe for 64-bit IDs.</p>
<p><b>What you must still own:</b> the exact loss table (undefined, functions, NaN, Date, Map, BigInt, cycles), safe parsing of untrusted text, and choosing JSON vs structuredClone vs a schema validator.</p>`,
    problems: [{
      title: 'Round-Trip Objects with Dates (safe parse + reviver)',
      level: 'Medium', tags: ['JSON', 'reviver', 'error handling', 'Date'], companies: ['Stripe', 'Zomato', 'Salesforce'],
      statement: `<p>Write <code>save(obj)</code> → JSON text and <code>load(text)</code> → <code>{ ok: true, value }</code> or <code>{ ok: false, error }</code>. After <code>load(save(obj))</code>, every field that was a <code>Date</code> must be a <code>Date</code> again (equal time), at any depth (objects and arrays). Invalid text must not throw.</p>`,
      constraints: `<p>Payload ≤ 1 MB; no cycles; strings that merely <i>look</i> like a date but were plain strings may also be revived (document this trade-off).</p>`,
      example: `<p><code>save({ title: 'launch', at: new Date('2026-03-01T09:30:00Z'), steps: [{ due: new Date(0) }] })</code><br>→ <code>'{"title":"launch","at":"2026-03-01T09:30:00.000Z","steps":[{"due":"1970-01-01T00:00:00.000Z"}]}'</code><br><code>load(...)</code> → ${H.c('g', 'value.at instanceof Date === true, value.steps[0].due.getTime() === 0')}<br><code>load('{oops}')</code> → ${H.c('r', "{ ok: false, error: 'SyntaxError: …' }")}</p>`,
      brute: { why: `<p>Plain <code>JSON.parse</code> leaves dates as strings, so callers sprinkle <code>new Date(obj.at)</code> everywhere — and forget the nested ones. It also throws on bad input, crashing whoever calls it.</p>`, code: { lang: 'js', run: true, code: `function save(obj) { return JSON.stringify(obj); }
function load(text) {
  const value = JSON.parse(text);          // throws on bad input!
  if (value.at) value.at = new Date(value.at); // only the field we remembered
  return { ok: true, value };
}
const r = load(save({ at: new Date(0), steps: [{ due: new Date(0) }] }));
console.log(r.value.at instanceof Date, r.value.steps[0].due instanceof Date); // true false` } },
      mcq: { q: 'Why does a reviver reach nested dates automatically?', options: ['JSON.parse calls it for every key at every depth, children before parents', 'It only runs on top-level keys, so you must recurse yourself', 'Dates are revived by default', 'Because stringify stored type information'], answer: 0, explain: 'The reviver is invoked bottom-up for every property in every object and array, ending with the root (key ""). JSON itself stores no type information — that is why we must recognise the ISO pattern.' },
      hints: [`<p>stringify already turns Dates into ISO strings via <code>Date.prototype.toJSON</code>. The hard part is going back.</p>`, `<p>Use a reviver that tests strings against an ISO-8601 regex and returns <code>new Date(value)</code>. It runs on every nested value for free.</p>`, `<p>Wrap <code>JSON.parse</code> in try/catch and return <code>{ ok: false, error }</code>. Also reject an invalid date (<code>isNaN(d.getTime())</code>) by leaving the string as it was.</p>`],
      solution: {
        approach: `<p>Serialise with plain <code>JSON.stringify</code> (Dates become ISO strings). Deserialise with <code>JSON.parse</code> plus a reviver that recognises the exact ISO format stringify produces and rebuilds valid Dates. try/catch turns syntax errors into a result object instead of an exception.</p>`,
        code: { lang: 'js', run: true, code: `// Exactly the format Date.prototype.toJSON produces: 2026-03-01T09:30:00.000Z
const ISO_DATE = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/;

function save(obj) {
  return JSON.stringify(obj);
}

function reviveDates(key, value) {
  if (typeof value === 'string' && ISO_DATE.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d; // only real dates
  }
  return value;
}

function load(text) {
  try {
    return { ok: true, value: JSON.parse(text, reviveDates) };
  } catch (e) {
    return { ok: false, error: e.name + ': ' + e.message };
  }
}

const original = {
  title: 'launch',
  at: new Date('2026-03-01T09:30:00Z'),
  steps: [{ due: new Date(0) }, { due: new Date('2026-02-20T00:00:00Z') }],
};
const text = save(original);
const result = load(text);
console.log(text);
console.log(result.ok, result.value.at instanceof Date);             // true true
console.log(result.value.at.getTime() === original.at.getTime());     // true
console.log(result.value.steps.map(s => s.due instanceof Date));      // [ true, true ]
console.log(load('{oops}'));                                          // { ok: false, error: ... }` },
        dry: { head: ['reviver call', 'key', 'value', 'returned'], rows: [
          ['1', 'title', '"launch"', 'unchanged'],
          ['2', 'at', '"2026-03-01T09:30:00.000Z"', '<span class="c-g">Date</span>'],
          ['3', 'due', '"1970-01-01T00:00:00.000Z"', '<span class="c-g">Date</span>'],
          ['4', '0', '{ due: Date }', 'unchanged (object)'],
          ['…', 'steps', '[ … ]', 'unchanged'],
          ['last', '"" (root)', '{ title, at, steps }', 'final value']
        ] },
        complexity: `<p>Time O(size of text) — one parse plus one regex test per string. Space O(size of resulting object).</p>`,
        followUps: ['Tag types explicitly instead of guessing: <code>{"$date": "…"}</code>, and also support Map and BigInt', 'Validate the shape with a schema after parsing', 'Stream-parse a 500 MB file without loading it all']
      }
    }]
  });

  /* ================= TOPIC 10: PRIORITY QUEUES / BINARY HEAP ================= */
  topics.push({
    title: 'Priority Queues in JavaScript: Building a Binary Heap',
    analogy: `<p>Picture a hospital emergency room. Patients do not see the doctor in the order they arrived — the <b>most urgent</b> one goes first, and when a new patient walks in, the nurse slots them in by urgency. Nobody re-sorts the whole waiting room each time; the nurse only makes sure the person at the front desk is always the most urgent. That is a <b>priority queue</b>. A <b>binary heap</b> is the trick that keeps "the most urgent is at the front" true using only a few swaps per arrival or departure. JavaScript ships no heap, so this lesson builds one you can trust.</p>`,
    explain: `<p>🟢 <b>The problem.</b> You need three things, fast: <b>add</b> an item, <b>look at</b> the best item, <b>remove</b> the best item. A plain array makes one of them slow. Keeping it sorted makes adding slow (shift everything). Leaving it unsorted makes finding the best slow (scan everything). A heap makes add and remove both about <code>log₂ n</code> steps — for a million items that is about 20 steps, not a million.</p>
<p>🟢 <b>The layout: a tree inside an array.</b> A heap is a tree where every parent is "better" than its two children (for a min-heap: smaller). We do not build tree nodes. We store the tree in a plain array, level by level, and use arithmetic to move around:</p>
${H.table(['Index i', 'Where', 'Formula'], [['parent of i', 'one level up', '<code>(i - 1) &gt;&gt; 1</code>'], ['left child of i', 'one level down', '<code>2 * i + 1</code>'], ['right child of i', 'one level down', '<code>2 * i + 2</code>'], ['root (the best item)', 'index 0', '<code>a[0]</code>']])}
${H.arr([1, 3, 2, 7, 4], { label: 'array a', idx: true, hl: { 0: 'g', 1: 'b', 2: 'b' } })}
<p>Here index 0 (value 1) has children at 1 and 2 (values 3 and 2). Index 1 has children at 3 and 4 (values 7 and 4). Every parent is smaller than its children. Note the rule is <b>not</b> "fully sorted" — 3 and 2 are in either order. It only promises the root is the minimum.</p>
<p>🔵 <b>Push = add at the end, then sift UP.</b> Put the new value in the next free slot (the end of the array). While it is better than its parent, swap them. At most one swap per level, so at most <code>log₂ n</code> swaps.</p>
<p>🔵 <b>Pop = take the root, refill from the end, sift DOWN.</b> Save <code>a[0]</code> as the answer. Remove the last element and drop it into the root. Now the root may be too big, so compare it with its two children, swap with the <b>better</b> child, and repeat until neither child is better. Again at most <code>log₂ n</code> swaps.</p>
<p>🔵 <b>One class, any order, via a comparator.</b> We pass <code>less(a, b)</code>: "should <code>a</code> leave the heap before <code>b</code>?" The default <code>a &lt; b</code> gives a min-heap, <code>a &gt; b</code> gives a max-heap, and a function that compares fields gives a heap of objects. This is exactly the <code>MinHeap</code> class you will see inside the JavaScript solutions of the DSA modules: <code>push</code>, <code>pop</code>, <code>peek</code>, <code>size</code>.</p>
<p>🔵 <b>Cost summary.</b></p>
${H.table(['Operation', 'Heap', 'Sorted array', 'Re-sort on every insert'], [['peek best', 'O(1)', 'O(1)', 'O(1)'], ['push', '<span class="c-g">O(log n)</span>', 'O(n) shift', '<span class="c-r">O(n log n)</span>'], ['pop best', '<span class="c-g">O(log n)</span>', 'O(1) from the right end, O(n) from the left', 'O(1)–O(n)'], ['build from n items', '<span class="c-g">O(n)</span> heapify', 'O(n log n)', '—']])}
<p>🟣 <b>Why re-sorting is the trap.</b> The brute force is <code>arr.push(x); arr.sort(cmp)</code>. Each sort costs <code>O(n log n)</code>, so n inserts cost <code>O(n² log n)</code>. With n = 10<sup>5</sup> that is about 10<sup>11</sup> basic steps — far too slow. A heap does the same work in <code>O(n log n)</code> total.</p>`,
    clues: [
      'The words <b>"k-th largest"</b>, <b>"top K"</b>, <b>"K closest"</b>, <b>"K most frequent"</b> — keep a heap of size k, not a full sort.',
      '<b>"Merge k sorted lists/arrays"</b> — a heap holds the current head of each list.',
      '<b>"Repeatedly take the largest/smallest, then put something back"</b> (last stone weight, task scheduling, Huffman coding, Dijkstra) — that is exactly pop + push.',
      '<b>Data arrives as a stream</b> and you must answer after every item — you cannot afford to re-sort each time.',
      'N ≤ 10<sup>5</sup> with an answer needed after each of N steps → you need O(log n) per step, not O(n).',
      '"Median of a stream" → two heaps (a max-heap of the lower half, a min-heap of the upper half).',
      'Greedy problems saying "always pick the cheapest/earliest available" → the "available" set is a heap.'
    ],
    code: [
      { lang: 'js', run: true, title: 'A binary heap with a comparator (the MinHeap used across the course)', code: `// A binary heap stored in a plain array.
// less(a, b) answers: "should a leave the heap BEFORE b?" (true / false).
class MinHeap {
  constructor(less = (a, b) => a < b) {
    this.a = [];            // the tree, level by level
    this.less = less;
  }
  size() { return this.a.length; }
  peek() { return this.a[0]; }               // undefined when empty

  push(x) {
    const a = this.a;
    a.push(x);                               // 1) put it in the next free slot
    let i = a.length - 1;
    while (i > 0) {                          // 2) sift UP
      const p = (i - 1) >> 1;                //    parent index
      if (!this.less(a[i], a[p])) break;     //    parent is fine: stop
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }

  pop() {
    const a = this.a;
    if (a.length === 0) return undefined;    // never forget the empty case
    const top = a[0];
    const last = a.pop();                    // 1) remove the last slot
    if (a.length > 0) {
      a[0] = last;                           // 2) it takes the root's place
      let i = 0;
      for (;;) {                             // 3) sift DOWN
        const l = 2 * i + 1, r = l + 1;      //    children
        let m = i;                           //    m = who should be on top
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;                  //    both children are worse: stop
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

// Min-heap (default comparator)
const h = new MinHeap();
[5, 3, 8, 1, 9, 2].forEach(x => h.push(x));
console.log(h.a, h.peek(), h.size());       // [1, 3, 2, 5, 9, 8] 1 6
const out = [];
while (h.size()) out.push(h.pop());
console.log(out);                           // [1, 2, 3, 5, 8, 9]
console.log(h.pop(), h.peek());             // undefined undefined

// Max-heap: flip the comparator
const mx = new MinHeap((a, b) => a > b);
[5, 3, 8, 1].forEach(x => mx.push(x));
console.log(mx.pop(), mx.pop());            // 8 5

// Heap of objects: lowest priority number first, ties by name
const jobs = new MinHeap((x, y) => x.pri !== y.pri ? x.pri < y.pri : x.name < y.name);
jobs.push({ name: 'email', pri: 3 });
jobs.push({ name: 'deploy', pri: 1 });
jobs.push({ name: 'backup', pri: 1 });
console.log(jobs.pop().name, jobs.pop().name, jobs.pop().name); // backup deploy email` },
      { lang: 'js', run: true, title: 'Heapify: build a heap from n items in O(n)', code: `// Build a heap from n items in O(n): sift DOWN every non-leaf, last parent first.
function heapify(a, less = (x, y) => x < y) {
  const n = a.length;
  for (let s = (n >> 1) - 1; s >= 0; s--) {   // (n >> 1) - 1 is the last parent
    let i = s;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < n && less(a[l], a[m])) m = l;
      if (r < n && less(a[r], a[m])) m = r;
      if (m === i) break;
      [a[i], a[m]] = [a[m], a[i]];
      i = m;
    }
  }
  return a;
}
console.log(heapify([9, 4, 7, 1, 8, 2]));   // [1, 4, 2, 9, 8, 7]
console.log(heapify([]), heapify([5]));     // [] [5]` }
    ],
    codeTitle: ['A binary heap with a comparator (the MinHeap used across the course)', 'Heapify: build a heap from n items in O(n)'],
    viz: [{
      title: 'Array and tree side by side: pushes and pops',
      input: 'push 5 push 3 push 8 push 1 pop push 2 pop',
      inputLabel: 'Operations: push N or pop (max 12 operations, at most 15 items in the heap)',
      gen: function (input) {
        var tok = String(input === undefined ? '' : input).trim().split(/[\s,]+/).filter(function (x) { return x.length; });
        var ops = [], i, t;
        for (i = 0; i < tok.length; i++) {
          t = tok[i].toLowerCase();
          if (t === 'pop') ops.push({ k: 'pop' });
          else if (t === 'push') {
            var v = Number(tok[i + 1]);
            if (tok[i + 1] === undefined || !isFinite(v)) throw new Error('Write push followed by a number, e.g. push 5 push 3 pop');
            ops.push({ k: 'push', v: v }); i++;
          } else throw new Error('Use only the words push (with a number) and pop, e.g. push 5 push 3 pop');
        }
        if (!ops.length) throw new Error('Enter at least one operation, e.g. push 5 push 3 pop');
        if (ops.length > 12) throw new Error('Please use at most 12 operations so the animation stays readable');
        var a = [], f = [];
        function snap(narr, hl, extra) {
          var parts = [{ type: 'array', label: 'Array a (the storage)', values: a.map(String), hl: hl, showIdx: true }];
          if (a.length) parts.push({ type: 'tree', label: 'The same data drawn as a tree', arr: a.slice(), hl: hl });
          else parts.push(tx('The tree is empty: no nodes yet.', 'Tree'));
          if (extra) parts.push(tx(extra, 'Note'));
          f.push(fr(narr, parts));
        }
        f.push(fr('A <b>min-heap</b>. Parent of index i is <code>(i-1)&gt;&gt;1</code>, children are <code>2i+1</code> and <code>2i+2</code>. Rule: every parent is ≤ both children, so <code>a[0]</code> is always the minimum. Watch the array and the tree change together.', [{ type: 'array', label: 'Array a (the storage)', values: [], hl: {}, showIdx: true }, tx('Empty heap. size = 0.', 'Tree')]));
        ops.forEach(function (op) {
          var j, p, hl, big = false;
          if (op.k === 'push') {
            if (a.length >= 15) throw new Error('At most 15 items fit in the picture. Add more pop operations.');
            a.push(op.v); j = a.length - 1;
            snap('<b>push(' + op.v + ')</b>: put it in the next free slot, index ' + j + ' (the end of the array). In the tree it is the next free spot on the bottom row.', (function () { var o = {}; o[j] = 'cur'; return o; })());
            while (j > 0) {
              p = (j - 1) >> 1;
              hl = {}; hl[j] = 'cur'; hl[p] = 'win';
              if (!(a[j] < a[p])) {
                snap('Sift up: compare ' + a[j] + ' (index ' + j + ') with its parent ' + a[p] + ' (index ' + p + '). The parent is not larger, so the order is already correct. <b>Stop.</b>', hl);
                break;
              }
              snap('Sift up: ' + a[j] + ' is smaller than its parent ' + a[p] + ' (parent index = (' + j + '-1)&gt;&gt;1 = ' + p + '). <b>Swap</b> them.', hl);
              var tmp = a[j]; a[j] = a[p]; a[p] = tmp; j = p;
              hl = {}; hl[j] = 'ok';
              snap('Swapped. The value now sits at index ' + j + '.', hl);
            }
            hl = {}; hl[0] = 'sel';
            snap('<b>push done.</b> Heap is valid again; the minimum is ' + a[0] + ' at the root. At most one swap per tree level: O(log n).', hl);
          } else {
            if (a.length === 0) {
              snap('<b>pop()</b> on an empty heap: the <code>size === 0</code> guard returns <code>undefined</code>. Without that guard the code would read <code>a[0]</code> of nothing and put <code>undefined</code> in the heap.', {}, 'Always check for empty first.');
              return;
            }
            var top = a[0], last = a.pop();
            hl = {}; hl[0] = 'sel';
            if (a.length === 0) {
              f.push(fr('<b>pop()</b>: the root ' + top + ' is the only item. Remove it. The heap is empty again; the answer is <b>' + top + '</b>.', [{ type: 'array', label: 'Array a (the storage)', values: [], hl: {}, showIdx: true }, tx('Popped ' + top + '. The heap is empty.', 'Tree')]));
              return;
            }
            a[0] = last; j = 0;
            snap('<b>pop()</b>: the answer is the root, <b>' + top + '</b>. Take the LAST item (' + last + ') out of its slot and drop it into the root. The shape stays complete, but the root may now be too big.', hl);
            for (;;) {
              var l = 2 * j + 1, r = l + 1, m = j;
              if (l < a.length && a[l] < a[m]) m = l;
              if (r < a.length && a[r] < a[m]) m = r;
              hl = {}; hl[j] = 'cur'; if (l < a.length) hl[l] = 'win'; if (r < a.length) hl[r] = 'win';
              if (m === j) {
                snap('Sift down at index ' + j + ' (value ' + a[j] + '): ' + (l >= a.length ? 'it has no children' : 'children are ' + a[l] + (r < a.length ? ' and ' + a[r] : '') + ', neither smaller') + '. <b>Stop.</b>', hl);
                break;
              }
              snap('Sift down at index ' + j + ' (value ' + a[j] + '): children are at ' + l + (r < a.length ? ' and ' + r : '') + '. The smaller child is ' + a[m] + ' (index ' + m + '), so <b>swap</b> with it. (Always the smaller child, or the other child would be larger than its new parent.)', hl);
              var t2 = a[j]; a[j] = a[m]; a[m] = t2; j = m;
              hl = {}; hl[j] = 'ok';
              snap('Swapped. The value now sits at index ' + j + '.', hl);
            }
            hl = {}; hl[0] = 'sel';
            snap('<b>pop done</b>: returned ' + top + '. New minimum is ' + a[0] + '. At most one swap per level: O(log n).', hl);
          }
        });
        f.push(fr('Finished. Final array: <code>[' + a.join(', ') + ']</code>. Notice the array is <b>not</b> sorted; only parent ≤ children is guaranteed. Popping repeatedly would give the numbers in sorted order.', [{ type: 'array', label: 'Final array', values: a.map(String), hl: a.length ? { 0: 'sel' } : {}, showIdx: true }].concat(a.length ? [{ type: 'tree', label: 'Final tree', arr: a.slice(), hl: { 0: 'sel' } }] : [])));
        return f;
      }
    }],
    examples: [
      { title: 'Index arithmetic: where is everyone?', html: `<p>For the array below, check the formulas by hand. Index 4 (value 4): parent is <code>(4-1)&gt;&gt;1 = 1</code> (value 3). Index 1 has children <code>2*1+1 = 3</code> and <code>2*1+2 = 4</code>. Index 2 has children 5 and 6, but the array only has 5 items, so both are <span class="c-r">out of range</span>: that is why the sift-down code checks <code>l &lt; a.length</code> before reading.</p>${H.table(['i', 'value', 'parent', 'left child', 'right child'], [['0', '1', '—', '1 (3)', '2 (2)'], ['1', '3', '0 (1)', '3 (7)', '4 (4)'], ['2', '2', '0 (1)', '5 → <span class="c-r">none</span>', '6 → <span class="c-r">none</span>'], ['3', '7', '1 (3)', 'none', 'none'], ['4', '4', '1 (3)', 'none', 'none']])}<p><b>Off-by-one trap:</b> with a 0-based array the children of <code>i</code> are <code>2i+1</code> and <code>2i+2</code>. The formulas <code>2i</code> and <code>2i+1</code> belong to a 1-based array (root at index 1). Mixing them makes index 0 its own child and quietly corrupts the heap.</p>` },
      { title: 'One class, three behaviours: min, max, objects', html: `<p>Only the comparator changes. The heap asks <code>less(a, b)</code> — "does <code>a</code> come out before <code>b</code>?" — and never looks inside your items. For objects, compare the field you care about, and add a tie-breaker so results are predictable (a heap is <b>not stable</b>: equal items may come out in any order).</p>${H.table(['Want', 'Comparator'], [['smallest first', '<code>(a, b) =&gt; a &lt; b</code> (default)'], ['largest first', '<code>(a, b) =&gt; a &gt; b</code>'], ['closest to origin first', '<code>(p, q) =&gt; p.d &lt; q.d</code>'], ['pairs <code>[count, word]</code>: highest count, then alphabetical', '<code>(x, y) =&gt; x[0] !== y[0] ? x[0] &gt; y[0] : x[1] &lt; y[1]</code>']])}`, code: { lang: 'js', run: true, code: `class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a; a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]]; i = p;
    }
  }
  pop() {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
}

// pairs [count, word]: highest count first, ties alphabetical
const pq = new MinHeap((x, y) => (x[0] !== y[0] ? x[0] > y[0] : x[1] < y[1]));
[[2, 'pear'], [5, 'fig'], [2, 'apple'], [5, 'date']].forEach(p => pq.push(p));
const order = [];
while (pq.size()) order.push(pq.pop().join(':'));
console.log(order.join(' '));   // 5:date 5:fig 2:apple 2:pear` } },
      { title: 'Bug hunt: sort() and comparators', html: `<p>Two of the classic bugs come from <code>sort</code>, which people use as the brute force. (1) With no comparator, <code>sort()</code> turns numbers into <b>strings</b> and compares text, so <code>10</code> lands before <code>9</code>. (2) The comparator for <code>sort</code> must return a <b>number</b> — negative, zero or positive. Returning a boolean (<code>a &gt; b</code>) gives only 1 or 0, never negative, so the engine cannot tell "less than" from "equal" and the order stays wrong.</p><p>The heap comparator is different on purpose: it returns a <b>boolean</b> ("does a come first?"). Mixing the two styles is the bug. If you ever pass a heap's <code>less</code> to <code>sort</code>, or a <code>sort</code> comparator to the heap, it breaks silently: <code>(a, b) =&gt; a - b</code> as a heap predicate is truthy for every non-zero difference, so it behaves like "always first".</p>`, code: { lang: 'js', run: true, code: `console.log([10, 9, 1, 100].sort());                // [ 1, 10, 100, 9 ]  strings!
console.log([10, 9, 1, 100].sort((a, b) => a - b)); // [ 1, 9, 10, 100 ]  numeric
console.log([3, 1, 2, 5, 4].sort((a, b) => a > b)); // [ 3, 1, 2, 5, 4 ]  boolean: unchanged in V8
const less = (a, b) => a < b;                       // a HEAP predicate
console.log(less(1, 2), less(2, 1));                // true false
const wrong = (a, b) => a - b;                      // a SORT comparator used as a predicate
console.log(Boolean(wrong(5, 1)), Boolean(wrong(1, 5))); // true true  "everyone comes first"` } },
      { title: 'Numbers: 2^53, BigInt, % and | 0', html: `<p>A heap is only as good as the numbers you compare. Four facts about JavaScript numbers that bite in heap problems:</p>${H.table(['Fact', 'Example', 'Result'], [['<code>Number</code> is exact only up to 2<sup>53</sup> − 1 (<code>Number.MAX_SAFE_INTEGER</code>)', '<code>2 ** 53 === 2 ** 53 + 1</code>', '<span class="c-r">true</span>'], ['Past that use <code>BigInt</code> (<code>123n</code>); <code>&lt;</code> and <code>&gt;</code> work, but you cannot mix it with Number', '<code>1n + 1</code>', '<span class="c-r">TypeError</span>'], ['A BigInt <code>a - b</code> inside <code>sort</code> throws, because sort needs a Number', '<code>[3n,1n].sort((a,b)=&gt;a-b)</code>', '<span class="c-r">TypeError</span>'], ['<code>%</code> keeps the sign of the left operand', '<code>-7 % 3</code>', '-1'], ['<code>| 0</code> truncates to a signed 32-bit integer', '<code>2 ** 32 + 5 | 0</code>', '5'], ['', '<code>2 ** 31 | 0</code>', '-2147483648']])}<p>Our heap only uses <code>&lt;</code> and <code>&gt;</code> on your items, so it works unchanged with BigInt values. Use <code>(a, b) =&gt; a &lt; b</code>, not <code>a - b</code>. For the index math, <code>(i - 1) &gt;&gt; 1</code> is safe because heap indexes are small. Do not use <code>| 0</code> on values (sums, products, weights): it silently wraps anything past 2<sup>31</sup>. Use <code>Math.floor(x / 2)</code> or <code>&gt;&gt;</code> only for indexes. Negative numbers: a <code>%</code> result can be negative, so for a bucket index use <code>((x % m) + m) % m</code>.</p>`, code: { lang: 'js', run: true, code: `console.log(Number.MAX_SAFE_INTEGER);                // 9007199254740991
console.log(2 ** 53 === 2 ** 53 + 1);                // true  (precision lost)
console.log(9007199254740993n + 2n);                 // 9007199254740995n  exact
try { 1n + 1; } catch (e) { console.log(e.name); }   // TypeError  cannot mix
console.log([3n, 1n, 2n].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))); // [ 1n, 2n, 3n ]
console.log(-7 % 3, 7 % -3, ((-7 % 3) + 3) % 3);     // -1 1 2
console.log(2 ** 32 + 5 | 0, 2 ** 31 | 0, 3.9 | 0, -3.9 | 0); // 5 -2147483648 3 -3` } },
      { title: 'Java, Python and C++ compared with JavaScript', html: `<p>You will meet heaps in every language. They differ in two ways: <b>which end</b> comes out first, and <b>how you say "better"</b>.</p>${H.table(['Language', 'Type', 'Default order', 'How to flip / customise', 'Calls'], [['Java', '<code>PriorityQueue</code>', 'min-heap', 'comparator returns an <b>int</b> (negative → first); <code>Collections.reverseOrder()</code> for max', '<code>offer, poll, peek, size</code>'], ['Python', '<code>heapq</code> (functions on a list)', 'min-heap only', 'no comparator: push tuples <code>(key, tie, item)</code>, negate numbers for a max-heap', '<code>heappush, heappop, h[0], heapify</code>'], ['C++', '<code>priority_queue</code>', '<b>max</b>-heap', 'third template argument; <code>greater&lt;int&gt;</code> gives a min-heap (the comparator is "less", so the biggest by that order is on top)', '<code>push, pop (returns void), top, size</code>'], ['JavaScript', 'none built in: our <code>MinHeap</code>', 'whatever <code>less</code> says (default min)', '<code>less(a, b)</code> returns a <b>boolean</b>: true if <code>a</code> comes first', '<code>push, pop, peek, size</code>']])}<p>Watch two traps. Python and Java return the minimum, C++ returns the maximum, so a solution ported straight across can answer the opposite question. And C++ <code>pop()</code> returns nothing: read <code>top()</code> first.</p>` }
    ],
    deepDive: `<p>🟣 <b>Why the shape is an array.</b> The heap is a <b>complete</b> binary tree: every level is full except possibly the last, which fills left to right. A complete tree has no gaps, so a plain array holds it with no wasted slots, and the index formulas replace pointers. That is faster in practice than node objects (better cache behaviour, less garbage), which is why every standard-library heap works this way.</p>
<p>🟣 <b>Why push and pop are O(log n).</b> A complete tree with n nodes has height <code>⌊log₂ n⌋</code>. Sift-up moves a node at most to the root; sift-down moves it at most to the bottom. One swap per level, so about 20 swaps for a million items.</p>
<p>🟣 <b>Why heapify is O(n), not O(n log n).</b> Pushing n items one by one costs O(n log n). Heapify instead sifts down every non-leaf, starting from the last parent <code>(n &gt;&gt; 1) - 1</code> and going back to index 0. Half the nodes are leaves and need no work. A quarter can sink at most 1 level, an eighth at most 2, and so on: the total is <code>n · (1/4 + 2/8 + 3/16 + …) ≤ n</code>. So build from an existing array with heapify, not with n pushes.</p>
<p>🟣 <b>Edge cases the class must survive.</b></p>
<ul><li><b>Empty heap:</b> <code>pop</code> and <code>peek</code> return <code>undefined</code>. Forgetting <code>size === 0</code> in <code>pop</code> is the classic bug: <code>a.pop()</code> returns <code>undefined</code> and <code>a[0] = undefined</code> then puts a hole into a non-empty-looking heap.</li>
<li><b>One item:</b> after removing the last slot the array is empty. Only refill the root when something remains, as the code does with <code>if (a.length &gt; 0)</code>.</li>
<li><b>Only a left child:</b> the right child index can be out of range. Always guard with <code>l &lt; a.length</code> and <code>r &lt; a.length</code> before reading.</li>
<li><b>Child pick:</b> swap with the <b>better</b> child. Swapping with the worse one leaves the better child above its new parent.</li>
<li><b>Duplicates and ties:</b> a heap is not stable. If the answer depends on tie order, put the tie-breaker in the comparator.</li></ul>
<p>🟣 <b>Mutating items while they are in the heap.</b> A heap only re-checks order on push and pop. If you change an item's priority in place, the heap is silently wrong. Either push a new entry and ignore stale ones when they pop out (the "lazy deletion" used in Dijkstra), or use a heap that supports decrease-key and tracks positions.</p>
<p>🟣 <b>Other limits worth knowing.</b> A heap finds the best item fast but cannot search for an arbitrary one (O(n)). It does not iterate in sorted order: <code>heap.a</code> is only partly ordered, so never print it and expect a sorted list. For a one-off "sort once, then walk" job, <code>arr.sort((a, b) =&gt; a - b)</code> is simpler and equally fast overall; reach for a heap when items arrive or change <b>between</b> the reads. And <code>a - b</code> as a sort comparator can lose precision or give <code>NaN</code> with <code>Infinity</code> or mixed types; for huge values and BigInt use explicit <code>-1 / 0 / 1</code>.</p>
<p>🟣 <b>Production reality.</b> Node and browsers have no standard heap as of 2026. Many teams use a small library, but in interviews you write it yourself. Know the class above cold: about 25 lines, and every interviewer will accept it.</p>`,
    aiEra: `<p>🤖 <b>What AI does well:</b> it writes a correct textbook heap in seconds, converts between Java <code>PriorityQueue</code>, Python <code>heapq</code> and JavaScript, and explains sift-up and sift-down with a worked example. It is also a good generator of test cases.</p>
<p>🤖 <b>Where it slips on this topic.</b> Models trained on Java and Python often assume JavaScript has <code>PriorityQueue</code> or <code>heapq</code>, and emit code that throws <code>ReferenceError</code>. They will also write the "easy" version — <code>arr.sort()</code> after each insert — that passes small tests and times out on N = 10<sup>5</sup>. Watch for the number-sort bug (no comparator, so strings), a boolean returned from a sort comparator, and a max-heap built by copying C++ semantics into a min-heap default.</p>
<p>🤖 <b>How to work with it.</b> Ask for the comparator contract in one sentence ("<code>less(a, b)</code> true means a leaves first"). Then verify cheaply: push 10<sup>4</sup> random numbers, pop them all, and compare with <code>[...nums].sort((a, b) =&gt; a - b)</code>. A ten-line check like that catches nearly every heap bug. Ask the AI to state the complexity of each operation and to point at the line where <code>size === 0</code> is handled; if it cannot, it probably is not.</p>
<p>🤖 <b>Old school still wins in interviews.</b> You cannot paste a library on a whiteboard. Practise writing the class from memory until push, pop and the three index formulas are automatic; then the AI is your reviewer, not your crutch.</p>`,
    after: `<p>Next you will use this class: the guided problem below keeps a heap of size k to answer "k-th largest" for a stream, and the two practice problems at the end of the module (<b>Merge K Sorted Arrays</b> and <b>Last Stone Weight</b>) use the same class in a merge and a smash simulation.</p>`,
    problems: [{
      title: 'Kth Largest Element in a Stream',
      level: 'Easy', tags: ['heap', 'priority queue', 'streaming', 'top-k'], companies: ['Amazon', 'Meta', 'Google'],
      statement: `<p>Design a class <code>KthLargest</code>. The constructor takes an integer <code>k</code> and an array <code>nums</code> (the numbers so far). The method <code>add(val)</code> adds a number to the stream and returns the <b>k-th largest</b> number seen so far (the k-th largest in sorted order, counting duplicates).</p>`,
      constraints: `<p>1 ≤ k ≤ 10<sup>4</sup>; 0 ≤ nums.length ≤ 10<sup>4</sup>; −10<sup>4</sup> ≤ nums[i], val ≤ 10<sup>4</sup>; up to 10<sup>4</sup> calls to <code>add</code>. It is guaranteed that there are at least k numbers when <code>add</code> is called.</p>`,
      example: `<p><code>new KthLargest(3, [4, 5, 8, 2])</code>, then:</p>${H.table(['call', 'numbers so far (sorted, largest first)', 'returns'], [['add(3)', '8 5 <span class="c-g">4</span> 3 2', '<span class="c-g">4</span>'], ['add(5)', '8 5 <span class="c-g">5</span> 4 3 2', '<span class="c-g">5</span>'], ['add(10)', '10 8 <span class="c-g">5</span> 5 4 3 2', '<span class="c-g">5</span>'], ['add(9)', '10 9 <span class="c-g">8</span> 5 5 4 3 2', '<span class="c-g">8</span>'], ['add(4)', '10 9 <span class="c-g">8</span> 5 5 4 4 3 2', '<span class="c-g">8</span>']])}<p>The green number is the 3rd one in each row.</p>`,
      brute: { why: `<p>Keep every number, push the new one, <code>sort</code> the whole array, read index <code>k - 1</code>. Correct, but each <code>add</code> sorts everything again: <code>O(n log n)</code> per call, and memory grows forever. With 10<sup>4</sup> numbers and 10<sup>4</sup> calls that is around 10<sup>9</sup> steps. The wasted work: we sort numbers we will never need again (everything smaller than the k-th largest can never matter).</p>`, code: `class KthLargest {
  constructor(k, nums) {
    this.k = k;
    this.nums = [...nums];
  }
  add(val) {
    this.nums.push(val);
    this.nums.sort((a, b) => b - a);   // O(n log n) every single call
    return this.nums[this.k - 1];
  }
}` },
      mcq: { q: 'You only ever need the k-th largest. Which structure holds the least data and answers fastest?', options: ['A min-heap that keeps only the k largest numbers; its root is the k-th largest', 'A max-heap holding every number so far', 'A sorted array of every number, re-sorted on each add', 'A hash set of every number'], answer: 0, explain: 'The k-th largest is the smallest of the top k. A min-heap of size k keeps exactly those k numbers with the smallest at the root, so peek is the answer, and each add costs O(log k). A max-heap of everything would need k pops to reach the k-th item; a re-sorted array is O(n log n) per add; a set has no order.' },
      hints: [
        `<p>Hint 1: the k-th largest is the <b>smallest</b> of the k largest numbers. Anything smaller than that can never be the answer again, because numbers only get added, never removed.</p>`,
        `<p>Hint 2: keep a <b>min-heap of size at most k</b>. Its root is the smallest of the top k, which is your answer. When a new number is bigger than the root, it deserves a place: pop the root, push the newcomer.</p>`,
        `<p>Hint 3: recipe. Constructor: set k, create an empty heap, call <code>add</code> for every number in <code>nums</code>. <code>add(val)</code>: if the heap has fewer than k items, push; else if <code>val &gt; peek()</code>, pop then push; otherwise ignore. Return <code>peek()</code>. Edge cases: empty <code>nums</code>, duplicates (equal values count separately, and <code>val &gt; peek()</code> being false for an equal value is fine), k = 1.</p>`
      ],
      tests: {"cls":"KthLargest","sigs":{"KthLargest":"int int[]","add":"int -> int"},"cases":[{"ops":["KthLargest","add","add","add","add","add"],"args":[[3,[4,5,8,2]],[3],[5],[10],[9],[4]],"out":[null,4,5,5,8,8]},{"ops":["KthLargest","add","add","add","add","add"],"args":[[1,[]],[-3],[-2],[-4],[0],[4]],"out":[null,-3,-2,-2,0,4]},{"ops":["KthLargest","add","add","add","add","add"],"args":[[2,[0]],[-1],[1],[-2],[-4],[3]],"out":[null,-1,0,0,0,1]},{"ops":["KthLargest","add","add","add","add"],"args":[[3,[5,5,5]],[5],[6],[5],[1]],"out":[null,5,5,5,5]},{"ops":["KthLargest","add","add","add","add","add","add","add"],"args":[[4,[1,2,3]],[4],[10],[0],[7],[7],[7],[-1]],"out":[null,1,2,2,3,4,7,7]},{"ops":["KthLargest","add","add","add","add","add"],"args":[[2,[-10000,10000]],[10000],[-10000],[0],[10000],[9999]],"out":[null,10000,10000,10000,10000,10000]},{"ops":["KthLargest","add","add","add","add","add","add","add"],"args":[[5000,{$range:[0,10000,1]}],[10001],[-5],[5000],[9999],[10000],[10000],[0]],"out":[null,5001,5001,5001,5002,5003,5004,5004]},{"ops":["KthLargest","add","add","add"],"args":[[1,{$range:[10000,0,-1]}],[1],[10001],[5]],"out":[null,10000,10001,10001]},{"ops":["KthLargest","add","add","add","add"],"args":[[3,[7,7]],[1],[9],[-2],[9]],"out":[null,1,7,7,7]}]},
      solution: {
        approach: `<p>Keep a <b>min-heap holding only the k largest numbers seen so far</b>. The root is the smallest of those k, which is exactly the k-th largest overall. A new number smaller than or equal to the root changes nothing; a bigger one replaces the root. The heap never grows beyond k, so each <code>add</code> costs <code>O(log k)</code> and memory is <code>O(k)</code>. The class below is the course-standard <code>MinHeap</code> with <code>push</code>, <code>pop</code>, <code>peek</code> and <code>size</code>.</p>`,
        code: { lang: 'js', code: `// JS has no built-in heap: a small binary min-heap with a comparator.
class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

class KthLargest {
  constructor(k, nums) {
    this.k = k;
    this.heap = new MinHeap();            // holds the k largest so far; root = k-th largest
    for (const x of nums) this.add(x);
  }
  add(val) {
    if (this.heap.size() < this.k) {
      this.heap.push(val);                // still filling up
    } else if (val > this.heap.peek()) {
      this.heap.pop();                    // drop the old k-th largest
      this.heap.push(val);
    }                                     // else: val cannot be in the top k
    return this.heap.peek();
  }
}` },
        dry: { head: ['call', 'heap (k = 3) after', 'decision', 'returns'], rows: [
          ['constructor [4,5,8,2]', '{4, 5, 8}', '4, 5, 8 fill the heap; 2 is not &gt; 4, ignored', '—'],
          ['add(3)', '{4, 5, 8}', '3 &gt; 4? no, ignore', '<span class="c-g">4</span>'],
          ['add(5)', '{5, 5, 8}', '5 &gt; 4: pop 4, push 5', '<span class="c-g">5</span>'],
          ['add(10)', '{5, 8, 10}', '10 &gt; 5: pop 5, push 10', '<span class="c-g">5</span>'],
          ['add(9)', '{8, 9, 10}', '9 &gt; 5: pop 5, push 9', '<span class="c-g">8</span>'],
          ['add(4)', '{8, 9, 10}', '4 &gt; 8? no, ignore', '<span class="c-g">8</span>']
        ] },
        complexity: `<p>Constructor O(n log k); each <code>add</code> O(log k) (one push and at most one pop on a heap of size ≤ k); peek O(1). Space O(k). The sort-every-time brute force is O(n log n) per add and O(n) space.</p>`,
        followUps: ['Return the k-th <b>smallest</b> instead: use a max-heap (flip the comparator to <code>a &gt; b</code>) of size k.', 'Top-K frequent words: count with a <code>Map</code>, then a size-k heap ordered by (count, word).', 'The stream has 10<sup>9</sup> numbers and k is 10<sup>6</sup>: why is O(k) memory still fine, and what would you use for the median instead (two heaps)?']
      }
    }]
  });

  /* ================= PRACTICE: Easy ================= */
  practice.push({
    title: 'Chunk an Array into Groups of Size k',
    level: 'Easy', tags: ['arrays', 'slice', 'loops'], companies: ['Amazon', 'Meesho', 'Lodash-style utilities'],
    statement: `<p>Write <code>chunk(arr, size)</code> that splits <code>arr</code> into consecutive groups of <code>size</code> items. The last group may be smaller. Do not mutate the input. <code>size</code> &lt; 1 must throw a <code>RangeError</code>.</p>`,
    constraints: `<p>0 ≤ n ≤ 10<sup>6</sup>; 1 ≤ size ≤ 10<sup>6</sup> (integer).</p>`,
    example: `<p><code>chunk([1, 2, 3, 4, 5], 2)</code> → ${H.c('g', '[[1, 2], [3, 4], [5]]')}<br>${H.arr([1, 2, 3, 4, 5], { hl: { 0: 'g', 1: 'g', 2: 'b', 3: 'b', 4: 'y' } })}Colours show the groups; 5 is left over, so it forms a short final group.</p>`,
    brute: { why: `<p>Repeatedly <code>splice(0, size)</code> from a copy works and reads nicely, but each <code>splice(0, …)</code> shifts every remaining element left: O(n²/size) moves overall — painful for a million items with small chunks.</p>`, code: { lang: 'js', run: true, code: `function chunk(arr, size) {
  if (size < 1) throw new RangeError('size must be >= 1');
  const copy = [...arr];
  const out = [];
  while (copy.length) out.push(copy.splice(0, size)); // front removal shifts everything
  return out;
}
console.log(chunk([1, 2, 3, 4, 5], 2)); // [ [ 1, 2 ], [ 3, 4 ], [ 5 ] ]` } },
    mcq: { q: 'Which call extracts the chunk that starts at index i?', options: ['<code>arr.slice(i, i + size)</code>', '<code>arr.splice(i, i + size)</code>', '<code>arr.slice(i, size)</code>', '<code>arr.slice(i * size)</code>'], answer: 0, explain: 'slice(start, end) copies [start, end). slice ignores an end past the array length, which handles the short last chunk for free. splice would mutate.' },
    hints: [`<p>Jump the index by <code>size</code> each time: 0, size, 2·size… Each jump starts a new group.</p>`, `<p><code>arr.slice(i, i + size)</code> copies one group without mutating, and quietly stops at the array's end.</p>`, `<p>Validate <code>size</code> first (0 would loop forever). Empty input → <code>[]</code>. One-liner variant: <code>Array.from({ length: Math.ceil(n / size) }, (_, k) =&gt; arr.slice(k * size, k * size + size))</code>.</p>`],
    solution: {
      approach: `<p>Step the start index by <code>size</code> and slice each window. Every element is copied exactly once, the input is untouched, and the short tail falls out naturally.</p>`,
      code: { lang: 'js', run: true, code: `function chunk(arr, size) {
  if (!Number.isInteger(size) || size < 1) throw new RangeError('size must be an integer >= 1');
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size)); // copy one group; slice stops at the end
  }
  return out;
}

console.log(chunk([1, 2, 3, 4, 5], 2)); // [ [ 1, 2 ], [ 3, 4 ], [ 5 ] ]
console.log(chunk(['a', 'b', 'c'], 5)); // [ [ 'a', 'b', 'c' ] ]
console.log(chunk([], 3));              // []
try { chunk([1], 0); } catch (e) { console.log(e.name); } // RangeError` },
      dry: { head: ['i', 'slice(i, i + 2)', 'out'], rows: [['0', '[1, 2]', '[[1, 2]]'], ['2', '[3, 4]', '[[1, 2], [3, 4]]'], ['4', '[5] (end clipped)', '[[1, 2], [3, 4], [5]]'], ['6', 'loop ends (6 ≥ 5)', '—']] },
      complexity: `<p>Time O(n), space O(n) for the output.</p>`,
      followUps: ['Chunk lazily with a generator', 'Split into exactly k groups as evenly as possible', 'Chunk a string into lines of width w without breaking words']
    }
  });

  practice.push({
    title: 'Remove Duplicates, Keep First Occurrence Order',
    level: 'Easy', tags: ['arrays', 'Set', 'filter'], companies: ['Google', 'Infosys', 'Flipkart'],
    statement: `<p>Return a new array with duplicates removed, keeping the <b>first</b> occurrence of each value in its original position. Treat <code>NaN</code> as equal to <code>NaN</code>.</p>`,
    constraints: `<p>n ≤ 10<sup>6</sup>; values are primitives (numbers, strings, booleans, null, undefined).</p>`,
    example: `${H.arr([3, 1, 3, 'a', 1, NaN, NaN], { hl: { 2: 'r', 4: 'r', 6: 'r' } })}<p>→ ${H.c('g', "[3, 1, 'a', NaN]")} — red items are repeats of something seen earlier.</p>`,
    brute: { why: `<p><code>filter((x, i) =&gt; arr.indexOf(x) === i)</code> is a famous one-liner, but <code>indexOf</code> scans from the start each time: O(n²) — and because <code>indexOf</code> uses <code>===</code>, it never finds <code>NaN</code>, so <b>all</b> NaNs are dropped!</p>`, code: { lang: 'js', run: true, code: `function unique(arr) {
  return arr.filter((x, i) => arr.indexOf(x) === i); // O(n^2); indexOf(NaN) is -1
}
console.log(unique([3, 1, 3, 'a', 1, NaN, NaN])); // [ 3, 1, 'a' ]  <- NaN lost!` } },
    mcq: { q: 'Why does <code>[...new Set(arr)]</code> keep exactly one NaN?', options: ['Set uses SameValueZero equality, where NaN equals NaN', 'Set converts values to strings', 'Spread removes NaN duplicates', 'It does not — all NaNs are removed'], answer: 0, explain: 'Set, Map and includes use SameValueZero: like === except NaN equals NaN. Sets also keep insertion order, so first occurrences stay in place.' },
    hints: [`<p>You need fast "have I seen this before?" checks — a hash-based structure, not a scan.</p>`, `<p>A <code>Set</code> stores each value once and remembers insertion order. Spreading it back gives an array.</p>`, `<p>Check NaN handling and order. Explicit loop version: if <code>!seen.has(x)</code>, add it to <code>seen</code> and push to output.</p>`],
    solution: {
      approach: `<p>Insert values into a <code>Set</code> (O(1) average per insert, insertion-ordered, SameValueZero equality) and spread it back into an array.</p>`,
      code: { lang: 'js', run: true, code: `const unique = arr => [...new Set(arr)];

// Same thing, written out — useful when you need a custom key (e.g. by id):
function uniqueBy(arr, keyFn = x => x) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (!seen.has(k)) { seen.add(k); out.push(item); }
  }
  return out;
}

console.log(unique([3, 1, 3, 'a', 1, NaN, NaN]));          // [ 3, 1, 'a', NaN ]
console.log(uniqueBy([{ id: 1 }, { id: 2 }, { id: 1 }], o => o.id)); // [ { id: 1 }, { id: 2 } ]` },
      dry: { head: ['item', 'in set?', 'output'], rows: [['3', 'no → add', '[3]'], ['1', 'no → add', '[3, 1]'], ['3', '<span class="c-r">yes</span>', '[3, 1]'], ["'a'", 'no → add', "[3, 1, 'a']"], ['NaN', 'no → add', "[3, 1, 'a', NaN]"], ['NaN', '<span class="c-r">yes</span>', "[3, 1, 'a', NaN]"]] },
      complexity: `<p>Time O(n) average, space O(n). The indexOf version is O(n²).</p>`,
      followUps: ['Keep the LAST occurrence instead', 'Remove duplicates in place in a sorted array (two pointers)', 'Deduplicate objects by deep content']
    }
  });

  practice.push({
    title: 'pick and omit for Objects',
    level: 'Easy', tags: ['objects', 'destructuring', 'Object.entries'], companies: ['Atlassian', 'Swiggy', 'Freshworks'],
    statement: `<p>Write <code>pick(obj, keys)</code> → new object with only those keys (that exist on <code>obj</code>), and <code>omit(obj, keys)</code> → new object without them. Neither may mutate <code>obj</code>.</p>`,
    constraints: `<p>Objects up to 10<sup>5</sup> keys; <code>keys</code> up to 10<sup>5</sup> strings.</p>`,
    example: `<p>${H.kv([['id', 7], ['name', "'Asha'"], ['password', "'x'"], ['age', 30]], { label: 'user' })}<code>pick(user, ['id', 'name', 'email'])</code> → ${H.c('g', "{ id: 7, name: 'Asha' }")} (email does not exist, so it is skipped)<br><code>omit(user, ['password'])</code> → ${H.c('g', "{ id: 7, name: 'Asha', age: 30 }")}</p>`,
    brute: { why: `<p>Copying with <code>{ ...obj }</code> then <code>delete</code>-ing keys works for omit, but <code>delete</code> can push the object into slow "dictionary mode", and checking membership with <code>keys.includes(k)</code> inside a loop is O(n·k).</p>`, code: { lang: 'js', run: true, code: `function omit(obj, keys) {
  const copy = { ...obj };
  for (const k of Object.keys(copy)) {
    if (keys.includes(k)) delete copy[k]; // O(k) scan per key + delete
  }
  return copy;
}
console.log(omit({ id: 7, name: 'Asha', password: 'x' }, ['password']));` } },
    mcq: { q: 'In <code>pick</code>, why check <code>Object.hasOwn(obj, k)</code> before copying?', options: ['So missing keys are skipped instead of being added as undefined, and inherited keys are ignored', 'Because obj[k] throws for missing keys', 'To make it faster', 'It is required by Object.fromEntries'], answer: 0, explain: 'Without the check, pick({}, ["email"]) would return { email: undefined }, and a key like "toString" would copy an inherited function.' },
    hints: [`<p>Both functions build a <b>new</b> object; neither needs <code>delete</code>.</p>`, `<p><code>pick</code>: loop over <code>keys</code>, copy own ones. <code>omit</code>: turn <code>keys</code> into a <code>Set</code>, then <code>Object.fromEntries(Object.entries(obj).filter(([k]) =&gt; !drop.has(k)))</code>.</p>`, `<p>For a single fixed key, destructuring with rest is the neatest omit: <code>const { password, ...safe } = user</code>. Edge cases: empty keys list, keys not present.</p>`],
    solution: {
      approach: `<p><code>pick</code> walks the requested keys and copies only own properties. <code>omit</code> filters entries against a Set of excluded keys and rebuilds with <code>Object.fromEntries</code>. Both are pure.</p>`,
      code: { lang: 'js', run: true, code: `function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (Object.hasOwn(obj, k)) out[k] = obj[k]; // skip missing/inherited keys
  }
  return out;
}

function omit(obj, keys) {
  const drop = new Set(keys);                   // O(1) membership checks
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !drop.has(k)));
}

const user = { id: 7, name: 'Asha', password: 'x', age: 30 };
console.log(pick(user, ['id', 'name', 'email'])); // { id: 7, name: 'Asha' }
console.log(omit(user, ['password']));            // { id: 7, name: 'Asha', age: 30 }

// Fixed key? Destructuring rest is the idiomatic omit:
const { password, ...safe } = user;
console.log(safe, user.password);                 // { id: 7, name: 'Asha', age: 30 } x` },
      dry: { head: ['function', 'key', 'decision'], rows: [['pick', 'id', 'own → copy'], ['pick', 'email', '<span class="c-m">missing → skip</span>'], ['omit', 'password', '<span class="c-r">in drop set → filter out</span>'], ['omit', 'age', 'keep']] },
      complexity: `<p>pick: O(k). omit: O(n + k). Space O(result).</p>`,
      followUps: ['Support nested paths like <code>"address.city"</code>', 'Type them in TypeScript with <code>Pick</code>/<code>Omit</code> utility types', 'Make pickBy(obj, predicate)']
    }
  });

  practice.push({
    title: 'Largest Number Without Crashing',
    level: 'Easy', tags: ['spread', 'reduce', 'edge cases'], companies: ['Microsoft', 'Oracle'],
    statement: `<p>Write <code>maxOf(nums)</code> returning the largest number, or <code>undefined</code> for an empty array. It must work for arrays of <b>5 million</b> numbers, where <code>Math.max(...nums)</code> can crash.</p>`,
    constraints: `<p>0 ≤ n ≤ 5·10<sup>6</sup>; values are finite numbers.</p>`,
    example: `<p><code>maxOf([3, 9, 4])</code> → ${H.c('g', '9')}; <code>maxOf([])</code> → ${H.c('m', 'undefined')} (while <code>Math.max()</code> returns ${H.c('r', '-Infinity')}); <code>maxOf(hugeArray)</code> → works, while <code>Math.max(...hugeArray)</code> → ${H.c('r', 'RangeError: Maximum call stack size exceeded')}.</p>`,
    brute: { why: `<p>Spread passes every element as a separate <b>argument</b>, and engines cap the number of arguments (stack space). Around a few hundred thousand items V8 throws a RangeError (Safari lower). Also <code>Math.max()</code> of nothing is <code>-Infinity</code>, a confusing "answer" for empty input.</p>`, code: { lang: 'js', run: true, code: `const maxOf = nums => Math.max(...nums);
console.log(maxOf([3, 9, 4])); // 9
console.log(maxOf([]));        // -Infinity (surprising)
try {
  maxOf(new Array(5000000).fill(1));
} catch (e) {
  console.log(e.name);         // RangeError
}` } },
    mcq: { q: 'Why does <code>Math.max(...bigArray)</code> fail but a loop does not?', options: ['Spread turns each element into a function argument and argument count is limited by stack size', 'Math.max only accepts 255 arguments', 'Spread is O(n²)', 'Loops use less CPU'], answer: 0, explain: 'All arguments are placed on the call stack for the call. A loop or reduce keeps only one running value.' },
    hints: [`<p>You only ever need to remember <b>one</b> number: the biggest seen so far.</p>`, `<p>A simple <code>for</code> loop or <code>reduce((m, x) =&gt; x &gt; m ? x : m)</code> keeps one running value.</p>`, `<p>Handle empty input first (return undefined). Start the running max from <code>nums[0]</code>, not 0 — all numbers could be negative.</p>`],
    solution: {
      approach: `<p>Single pass keeping the best value. Constant extra memory, no argument-count limits, and an explicit decision for empty input.</p>`,
      code: { lang: 'js', run: true, code: `function maxOf(nums) {
  if (nums.length === 0) return undefined;   // explicit empty-case contract
  let best = nums[0];                        // not 0: values may all be negative
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] > best) best = nums[i];
  }
  return best;
}

console.log(maxOf([3, 9, 4]));     // 9
console.log(maxOf([-5, -2, -9]));  // -2
console.log(maxOf([]));            // undefined
const huge = Array.from({ length: 5000000 }, (_, i) => i % 1000);
console.log(maxOf(huge));          // 999` },
      dry: { head: ['i', 'nums[i]', 'best'], rows: [['start', '3', '3'], ['1', '9', '9'], ['2', '4', '9 (unchanged)']] },
      complexity: `<p>Time O(n), extra space O(1). Spread version: O(n) stack space and a hard size limit.</p>`,
      followUps: ['Return both min and max in one pass', 'Find the max of an array of objects by a field', 'What does Math.max return if one element is NaN?']
    }
  });

  practice.push({
    title: 'Predict the Output: Array Method Return Values',
    level: 'Easy', tags: ['predict the output', 'arrays', 'mutation'], companies: ['Common screening round'],
    statement: `<p>Without running it, write down every line this program prints. Then run it and explain each line in one sentence.</p>
<pre>const a = [3, 1, 2];
console.log(a.push(10));
const b = a.sort();
console.log(b === a, a);
console.log(a.splice(1, 2));
console.log(a.slice(0, 1), a);
console.log([1, 2, 3].map(x =&gt; { x * 2 }));
console.log([1, 2, 3].forEach(x =&gt; x * 2));</pre>`,
    constraints: `<p>Assume Node 20+ or any modern browser.</p>`,
    example: `<p>Line 1 prints ${H.c('g', '4')} — <code>push</code> returns the new length, not the array. Work out the rest yourself before peeking at the solution.</p>`,
    brute: { why: `<p>Guessing from method names ("sort probably copies", "push probably returns the array") gives wrong answers. The reliable way is to track the array's state line by line and know each method's <b>return value</b> and whether it <b>mutates</b>.</p>`, code: { lang: 'js', run: true, code: `// Run it to check your predictions
const a = [3, 1, 2];
console.log(a.push(10));
const b = a.sort();
console.log(b === a, a);
console.log(a.splice(1, 2));
console.log(a.slice(0, 1), a);
console.log([1, 2, 3].map(x => { x * 2 }));
console.log([1, 2, 3].forEach(x => x * 2));` } },
    mcq: { q: 'What does <code>[3, 1, 2, 10].sort()</code> produce?', options: ['<code>[1, 10, 2, 3]</code>', '<code>[1, 2, 3, 10]</code>', '<code>[10, 3, 2, 1]</code>', '<code>[3, 1, 2, 10]</code>'], answer: 0, explain: 'Default sort compares strings: "1" &lt; "10" &lt; "2" &lt; "3".' },
    hints: [`<p>Keep a little table: line → state of <code>a</code> → printed value. Update the state only for mutating methods.</p>`, `<p>Return values: push → length; sort → same array (string order by default!); splice → removed items; slice → copy; map → array of callback results; forEach → undefined.</p>`, `<p>The map callback has braces but no <code>return</code>. After the default sort, a is <code>[1, 10, 2, 3]</code>; splice(1, 2) removes index 1 and 2.</p>`],
    solution: {
      approach: `<p>Trace state: a = [3,1,2] → push → [3,1,2,10] (prints 4) → sort (string order) → [1,10,2,3], b is the same array → splice(1,2) removes [10,2] leaving [1,3] → slice(0,1) copies [1] → map with braces returns undefineds → forEach returns undefined.</p>`,
      code: { lang: 'js', run: true, code: `const a = [3, 1, 2];
console.log(a.push(10));          // 4                       (new length)
const b = a.sort();
console.log(b === a, a);          // true [ 1, 10, 2, 3 ]    (same array, string order)
console.log(a.splice(1, 2));      // [ 10, 2 ]               (removed items; a is now [1, 3])
console.log(a.slice(0, 1), a);    // [ 1 ] [ 1, 3 ]          (copy; a unchanged)
console.log([1, 2, 3].map(x => { x * 2 }));    // [ undefined, undefined, undefined ]
console.log([1, 2, 3].forEach(x => x * 2));    // undefined` },
      dry: { head: ['line', 'a after', 'printed'], rows: [['push(10)', '[3, 1, 2, 10]', '4'], ['sort()', '[1, 10, 2, 3]', 'true [1, 10, 2, 3]'], ['splice(1, 2)', '[1, 3]', '[10, 2]'], ['slice(0, 1)', '[1, 3]', '[1] [1, 3]'], ['map / forEach', '—', '[undefined ×3] / undefined']] },
      complexity: `<p>Not an algorithm question — the skill is mental execution. Each line is O(n) or less.</p>`,
      followUps: ['Rewrite every mutating call with its ES2023 non-mutating twin', 'What would <code>a.sort((x, y) =&gt; x - y)</code> print instead?']
    }
  });

  /* ================= PRACTICE: Medium ================= */
  practice.push({
    title: 'Flatten a Nested Array to a Given Depth',
    level: 'Medium', tags: ['arrays', 'recursion', 'reduce', 'polyfill'], companies: ['Meta', 'Uber', 'Adobe'],
    statement: `<p>Implement <code>flatten(arr, depth = 1)</code> that behaves like <code>Array.prototype.flat(depth)</code>: nested arrays are opened up to <code>depth</code> levels; <code>depth = Infinity</code> flattens fully. Holes are removed. Do not use <code>flat</code>.</p>`,
    constraints: `<p>Total elements ≤ 10<sup>5</sup>; nesting depth ≤ 1000 (deep inputs may hit recursion limits — mention an iterative version).</p>`,
    example: `<p><code>flatten([1, [2, [3, [4]]], 5])</code> → ${H.c('g', '[1, 2, [3, [4]], 5]')}<br><code>flatten([1, [2, [3, [4]]], 5], 2)</code> → ${H.c('g', '[1, 2, 3, [4], 5]')}<br><code>flatten([1, [2, [3, [4]]], 5], Infinity)</code> → ${H.c('g', '[1, 2, 3, 4, 5]')}</p>`,
    brute: { why: `<p>Repeatedly doing <code>result = [].concat(...result)</code> one level at a time works but rebuilds the whole array for every level (O(n·depth)) and spreading a huge array into <code>concat</code> can exceed argument limits. It also loops forever-ish with Infinity unless you check "any arrays left?" each pass.</p>`, code: { lang: 'js', run: true, code: `function flatten(arr, depth = 1) {
  let result = arr.filter(() => true);     // drop holes
  while (depth > 0 && result.some(Array.isArray)) {
    result = [].concat(...result);         // one level per pass, full rebuild each time
    depth--;
  }
  return result;
}
console.log(flatten([1, [2, [3, [4]]], 5], Infinity)); // [ 1, 2, 3, 4, 5 ]` } },
    mcq: { q: 'In the recursive version, when do you recurse into an element?', options: ['When it is an array AND depth &gt; 0 (recursing with depth − 1)', 'Whenever it is an object', 'Only at depth 0', 'Always, then trim the result'], answer: 0, explain: 'Each recursion consumes one level of depth. At depth 0 nested arrays are copied as-is.' },
    hints: [`<p>Think recursively: flattening <code>[a, [b, c]]</code> to depth d means: keep non-arrays, and for each array element, flatten <i>it</i> to depth d − 1 and splice its items in.</p>`, `<p><code>arr.reduce((acc, x) =&gt; Array.isArray(x) &amp;&amp; depth &gt; 0 ? acc.concat(flatten(x, depth - 1)) : (acc.push(x), acc), [])</code> — or a loop with push to avoid concat copies.</p>`, `<p><code>reduce</code> already skips holes. Infinity − 1 is still Infinity, so full flattening works for free. For very deep inputs, use an explicit stack instead of recursion.</p>`],
    solution: {
      approach: `<p>Depth-first recursion that pushes into one shared output array (no intermediate concat copies). <code>forEach</code> skips holes, matching <code>flat</code>. An iterative stack-based alternative avoids recursion limits.</p>`,
      code: { lang: 'js', run: true, code: `function flatten(arr, depth = 1, out = []) {
  arr.forEach(item => {                        // forEach skips holes, like flat()
    if (Array.isArray(item) && depth > 0) {
      flatten(item, depth - 1, out);           // open one level, push into same out
    } else {
      out.push(item);
    }
  });
  return out;
}

// Iterative full flatten with an explicit stack (no recursion limit)
function flattenDeep(arr) {
  const stack = [...arr].reverse();
  const out = [];
  while (stack.length) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) if (i in item) stack.push(item[i]);
    } else {
      out.push(item);
    }
  }
  return out;
}

const data = [1, [2, [3, [4]]], 5];
console.log(flatten(data));            // [ 1, 2, [ 3, [ 4 ] ], 5 ]
console.log(flatten(data, 2));         // [ 1, 2, 3, [ 4 ], 5 ]
console.log(flatten(data, Infinity));  // [ 1, 2, 3, 4, 5 ]
console.log(flatten([1, , [2, , 3]], 1)); // [ 1, 2, 3 ] (holes removed)
console.log(flattenDeep(data));        // [ 1, 2, 3, 4, 5 ]
console.log(JSON.stringify(flatten(data, 2)) === JSON.stringify(data.flat(2))); // true` },
      dry: { head: ['call', 'item', 'action', 'out'], rows: [['flatten(data, 1)', '1', 'push', '[1]'], ['', '[2, [3, [4]]]', 'array & depth 1 → recurse depth 0', '—'], ['flatten([2, [3,[4]]], 0)', '2', 'push', '[1, 2]'], ['', '[3, [4]]', 'depth 0 → push as-is', '[1, 2, [3, [4]]]'], ['back in depth 1', '5', 'push', '[1, 2, [3, [4]], 5]']] },
      complexity: `<p>Time O(total elements visited), space O(n) output + O(depth) recursion stack.</p>`,
      followUps: ['Write <code>flatMap</code> using your flatten', 'Flatten a nested object into dot-path keys: <code>{ a: { b: 1 } }</code> → <code>{ "a.b": 1 }</code>', 'Make it a lazy generator']
    }
  });

  practice.push({
    title: 'zip(...arrays)',
    level: 'Medium', tags: ['rest parameters', 'Array.from', 'arrays'], companies: ['Google', 'Bloomberg'],
    statement: `<p>Write a variadic <code>zip(...arrays)</code> that groups items by index: the i-th result is an array of the i-th item of every input. The result length is the length of the <b>shortest</b> input. With no arguments return <code>[]</code>.</p>`,
    constraints: `<p>Up to 100 arrays, each up to 10<sup>5</sup> items.</p>`,
    example: `<p><code>zip(['a', 'b', 'c'], [1, 2, 3], [true, false])</code> → ${H.c('g', "[['a', 1, true], ['b', 2, false]]")} — the third array has only 2 items, so only 2 groups are made.</p>`,
    brute: { why: `<p>Hard-coding two parameters (<code>zip(a, b)</code>) does not scale to any number of arrays, and using the first array's length produces <code>undefined</code>s when another array is shorter.</p>`, code: { lang: 'js', run: true, code: `function zip(a, b) {
  const out = [];
  for (let i = 0; i < a.length; i++) out.push([a[i], b[i]]); // b may be shorter -> undefined
  return out;
}
console.log(zip(['a', 'b', 'c'], [1, 2])); // [ [ 'a', 1 ], [ 'b', 2 ], [ 'c', undefined ] ]` } },
    mcq: { q: 'How do you get the shortest length among all input arrays?', options: ['<code>Math.min(...arrays.map(a =&gt; a.length))</code>', '<code>arrays.length</code>', '<code>arrays[0].length</code>', '<code>Math.min(arrays)</code>'], answer: 0, explain: 'Map each array to its length, then spread the lengths into Math.min. With zero arrays Math.min() is Infinity — guard that case.' },
    hints: [`<p>A rest parameter <code>...arrays</code> gives you a real array of all the input arrays.</p>`, `<p>Result length = shortest length. Build with <code>Array.from({ length: n }, (_, i) =&gt; arrays.map(arr =&gt; arr[i]))</code>.</p>`, `<p>No arguments: <code>Math.min()</code> is <code>Infinity</code> — return <code>[]</code> first. One argument: each group has a single item.</p>`],
    solution: {
      approach: `<p>Gather inputs with rest, compute the shortest length, then build each group by mapping over the arrays at index i. Pure and works for any number of inputs.</p>`,
      code: { lang: 'js', run: true, code: `function zip(...arrays) {
  if (arrays.length === 0) return [];
  const n = Math.min(...arrays.map(a => a.length));        // shortest wins
  return Array.from({ length: n }, (_, i) => arrays.map(arr => arr[i]));
}

console.log(zip(['a', 'b', 'c'], [1, 2, 3], [true, false])); // [ [ 'a', 1, true ], [ 'b', 2, false ] ]
console.log(zip([1, 2]));                                     // [ [ 1 ], [ 2 ] ]
console.log(zip());                                           // []

// Unzip is just zip applied to the groups (spread them back in):
const pairs = zip(['x', 'y'], [10, 20]);
console.log(zip(...pairs));                                   // [ [ 'x', 'y' ], [ 10, 20 ] ]` },
      dry: { head: ['i', 'arrays.map(arr =&gt; arr[i])'], rows: [['0', "['a', 1, true]"], ['1', "['b', 2, false]"], ['(n = 2, stop)', '—']] },
      complexity: `<p>Time O(n·k) for k arrays of usable length n; space the same for the output.</p>`,
      followUps: ['zipWith(fn, ...arrays) that combines each group with fn', 'Pad to the LONGEST array with a fill value', 'Make it work on any iterables, lazily']
    }
  });

  practice.push({
    title: 'Partition by Predicate in One Pass',
    level: 'Medium', tags: ['arrays', 'reduce', 'destructuring'], companies: ['Amazon', 'Razorpay'],
    statement: `<p>Write <code>partition(arr, predicate)</code> returning <code>[pass, fail]</code>: items where the predicate is truthy, and the rest, each in original order — using <b>one</b> pass. The predicate receives <code>(item, index)</code>.</p>`,
    constraints: `<p>n ≤ 10<sup>6</sup>; the predicate may be expensive, so call it exactly once per item.</p>`,
    example: `<p><code>const [even, odd] = partition([1, 2, 3, 4, 5], n =&gt; n % 2 === 0)</code><br>even = ${H.c('g', '[2, 4]')}, odd = ${H.c('r', '[1, 3, 5]')}</p>`,
    brute: { why: `<p>Two filters (<code>arr.filter(p)</code> and <code>arr.filter(x =&gt; !p(x))</code>) are clear but call the predicate <b>twice</b> per item and walk the array twice — wrong if the predicate is slow, random or has side effects.</p>`, code: { lang: 'js', run: true, code: `let calls = 0;
const isEven = n => { calls++; return n % 2 === 0; };
const arr = [1, 2, 3, 4, 5];
const pass = arr.filter(isEven);
const fail = arr.filter(x => !isEven(x));
console.log(pass, fail, 'predicate calls:', calls); // [ 2, 4 ] [ 1, 3, 5 ] predicate calls: 10` } },
    mcq: { q: 'Which return shape lets callers write <code>const [ok, bad] = partition(...)</code>?', options: ['An array of two arrays', 'An object { pass, fail }', 'A Map', 'Two separate return statements'], answer: 0, explain: 'Array destructuring is positional, so [pass, fail] works. An object would need const { pass, fail } instead.' },
    hints: [`<p>One loop, two buckets. Decide each item's bucket with a single predicate call.</p>`, `<p>With reduce: initial value <code>[[], []]</code>; push into <code>acc[predicate(x, i) ? 0 : 1]</code>; return acc.</p>`, `<p>Destructure the result at the call site. Empty array → <code>[[], []]</code>. Keep original order by pushing in iteration order.</p>`],
    solution: {
      approach: `<p>Reduce into a pair of arrays, choosing the bucket by one predicate call. Return the pair so callers can destructure it.</p>`,
      code: { lang: 'js', run: true, code: `function partition(arr, predicate) {
  return arr.reduce(
    (acc, item, i) => {
      acc[predicate(item, i) ? 0 : 1].push(item); // one call per item
      return acc;
    },
    [[], []]
  );
}

let calls = 0;
const [even, odd] = partition([1, 2, 3, 4, 5], n => { calls++; return n % 2 === 0; });
console.log(even, odd, 'calls:', calls);                         // [ 2, 4 ] [ 1, 3, 5 ] calls: 5

const users = [{ name: 'a', active: true }, { name: 'b', active: false }];
const [active, inactive] = partition(users, u => u.active);
console.log(active.map(u => u.name), inactive.map(u => u.name)); // [ 'a' ] [ 'b' ]
console.log(partition([], Boolean));                             // [ [], [] ]` },
      dry: { head: ['item', 'predicate', 'acc'], rows: [['1', 'false', '[[], [1]]'], ['2', 'true', '[[2], [1]]'], ['3', 'false', '[[2], [1, 3]]'], ['4', 'true', '[[2, 4], [1, 3]]'], ['5', 'false', '[[2, 4], [1, 3, 5]]']] },
      complexity: `<p>Time O(n) with exactly n predicate calls; space O(n).</p>`,
      followUps: ['Generalise to groupBy with any number of buckets', 'Partition in place (like quicksort\'s partition step)', 'Compare with <code>Object.groupBy</code>']
    }
  });

  practice.push({
    title: 'Polyfill map and filter',
    level: 'Medium', tags: ['polyfill', 'callbacks', 'prototypes', 'holes'], companies: ['Flipkart', 'Paytm', 'Walmart', 'Uber'],
    statement: `<p>Implement <code>Array.prototype.myMap(callback, thisArg)</code> and <code>Array.prototype.myFilter(callback, thisArg)</code> matching the built-ins: callback gets <code>(element, index, array)</code>, <code>this</code> inside a normal-function callback is <code>thisArg</code>, holes are skipped, non-function callbacks throw <code>TypeError</code>, and the original array is not changed.</p>`,
    constraints: `<p>Do not use the built-in <code>map</code>/<code>filter</code>/<code>reduce</code>/<code>forEach</code>.</p>`,
    example: `<p><code>[1, 2, 3].myMap((x, i) =&gt; x * i)</code> → ${H.c('g', '[0, 2, 6]')}<br><code>[5, , 7].myMap(x =&gt; x + 1)</code> → ${H.c('g', '[6, &lt;empty&gt;, 8]')} (hole preserved in map)<br><code>[4, 9, 16].myFilter(x =&gt; x &gt; 5)</code> → ${H.c('g', '[9, 16]')}</p>`,
    brute: { why: `<p>A naive version passes only the element, ignores <code>thisArg</code>, visits holes (calling the callback with <code>undefined</code>), uses an arrow function for the method (so <code>this</code> is wrong!), and reads <code>this.length</code> on every iteration.</p>`, code: { lang: 'js', run: true, code: `// Buggy: arrow function as a method -> 'this' is NOT the array
Array.prototype.badMap = (cb) => {
  const out = [];
  const len = this && this.length; // 'this' here is the outer (module/global) this
  for (let i = 0; i < len; i++) out.push(cb(this[i]));
  return out;
};
console.log([1, 2, 3].badMap(x => x * 2)); // [] — 'this' is not the array
delete Array.prototype.badMap;` } },
    mcq: { q: 'Why must the polyfill be a <code>function</code>, not an arrow?', options: ['A method needs its own <code>this</code> (the array it was called on); arrows inherit this from outside', 'Arrows are slower', 'Arrows cannot return arrays', 'Prototypes only accept named functions'], answer: 0, explain: 'arr.myMap(...) sets this = arr only for normal functions. An arrow captures this from where it was defined (module/global scope).' },
    hints: [`<p>Inside <code>function (callback, thisArg) { … }</code>, <code>this</code> is the array. Validate <code>typeof callback === 'function'</code> first.</p>`, `<p>Read <code>len = this.length</code> once. For each index use <code>if (i in this)</code> to skip holes, and call <code>callback.call(thisArg, this[i], i, this)</code>.</p>`, `<p>map: pre-size the result <code>new Array(len)</code> and assign <code>result[i]</code> so holes stay holes. filter: push only when the callback returns truthy. Define them with <code>Object.defineProperty</code> (non-enumerable) so <code>for...in</code> on arrays is not polluted.</p>`],
    solution: {
      approach: `<p>Follow the spec steps: validate the callback, capture length once, loop indices, skip holes with <code>in</code>, call with <code>(element, index, array)</code> and <code>thisArg</code>. map writes to the same index of a pre-sized array; filter pushes passing elements. Installed as non-enumerable properties.</p>`,
      code: { lang: 'js', run: true, code: `Object.defineProperty(Array.prototype, 'myMap', {
  value: function (callback, thisArg) {
    if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');
    const len = this.length;              // read once, like the spec
    const result = new Array(len);        // same length; holes stay holes
    for (let i = 0; i < len; i++) {
      if (i in this) result[i] = callback.call(thisArg, this[i], i, this);
    }
    return result;
  },
  writable: true, configurable: true, enumerable: false,
});

Object.defineProperty(Array.prototype, 'myFilter', {
  value: function (callback, thisArg) {
    if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');
    const len = this.length;
    const result = [];
    for (let i = 0; i < len; i++) {
      if (i in this) {
        const value = this[i];
        if (callback.call(thisArg, value, i, this)) result.push(value);
      }
    }
    return result;
  },
  writable: true, configurable: true, enumerable: false,
});

console.log([1, 2, 3].myMap((x, i) => x * i));        // [ 0, 2, 6 ]
console.log([5, , 7].myMap(x => x + 1));              // [ 6, <1 empty item>, 8 ]
console.log([4, 9, 16].myFilter(x => x > 5));         // [ 9, 16 ]
const ctx = { factor: 10 };
console.log([1, 2].myMap(function (x) { return x * this.factor; }, ctx)); // [ 10, 20 ]
try { [1].myMap(null); } catch (e) { console.log(e.name); } // TypeError
for (const k in [1]) console.log('enumerable key:', k);  // only '0' — no 'myMap'` },
      dry: { head: ['i', 'i in this?', 'callback(x, i)', 'result'], rows: [['0', 'yes', '5 + 1 = 6', '[6, , ]'], ['1', '<span class="c-m">no (hole) → skip</span>', '—', '[6, , ]'], ['2', 'yes', '7 + 1 = 8', '[6, , 8]']] },
      complexity: `<p>Time O(n), space O(n) for the result.</p>`,
      followUps: ['Implement reduce with the no-initial-value rules (see the Hard set)', 'Why is extending built-in prototypes discouraged in libraries?', 'Make them work on array-likes via <code>Array.prototype.myMap.call(\'abc\', …)</code>']
    }
  });

  practice.push({
    title: 'Shallow Diff of Two Objects',
    level: 'Medium', tags: ['objects', 'Object.keys', 'Set'], companies: ['Atlassian', 'Notion', 'Postman'],
    statement: `<p>Write <code>diff(before, after)</code> returning <code>{ added, removed, changed }</code>: <code>added</code> = keys only in <code>after</code>, <code>removed</code> = keys only in <code>before</code>, <code>changed</code> = keys in both whose values differ by <code>Object.is</code>. Each list sorted alphabetically.</p>`,
    constraints: `<p>Up to 10<sup>5</sup> keys per object; values compared shallowly (two different objects with equal contents count as changed).</p>`,
    example: `<p>${H.kv([['name', "'Asha'"], ['age', 30], ['city', "'Pune'"]], { label: 'before' })}${H.kv([['name', "'Asha'"], ['age', 31], ['email', "'a@x.io'"]], { label: 'after', hl: { age: 'y', email: 'g' } })}→ ${H.c('g', "added: ['email']")}, ${H.c('r', "removed: ['city']")}, ${H.c('y', "changed: ['age']")}</p>`,
    brute: { why: `<p>Comparing <code>JSON.stringify(before)</code> with <code>JSON.stringify(after)</code> only tells you <i>something</i> differs (and gives false alarms when key order differs). Nested loops over both key lists to match keys are O(n²).</p>`, code: { lang: 'js', run: true, code: `function diff(before, after) {
  const added = [], removed = [], changed = [];
  const bk = Object.keys(before), ak = Object.keys(after);
  for (const k of ak) if (!bk.includes(k)) added.push(k);          // O(n) scan each
  for (const k of bk) if (!ak.includes(k)) removed.push(k);
  for (const k of bk) if (ak.includes(k) && before[k] !== after[k]) changed.push(k);
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort() };
}
console.log(diff({ a: 1, b: 2 }, { b: 3, c: 4 }));` } },
    mcq: { q: 'Why use <code>Object.is</code> rather than <code>!==</code> for "changed"?', options: ['Object.is(NaN, NaN) is true, so a NaN that stayed NaN is not reported as changed', 'It compares deeply', 'It is faster', 'It ignores types'], answer: 0, explain: 'NaN !== NaN is true, which would flag an unchanged NaN. Object.is treats NaN as equal to itself (and distinguishes +0 from -0).' },
    hints: [`<p>Use <code>Object.hasOwn</code> for O(1) "does the other object have this key?" checks instead of scanning key arrays.</p>`, `<p>Loop over <code>after</code>'s keys → added or (maybe) changed. Loop over <code>before</code>'s keys → removed.</p>`, `<p>Compare values with <code>Object.is</code>. Sort each result list at the end. Empty objects → three empty lists.</p>`],
    solution: {
      approach: `<p>Two linear passes with constant-time own-key checks. The first pass over <code>after</code> classifies keys as added or changed; the second over <code>before</code> finds removed keys.</p>`,
      code: { lang: 'js', run: true, code: `function diff(before, after) {
  const added = [], removed = [], changed = [];
  for (const key of Object.keys(after)) {
    if (!Object.hasOwn(before, key)) added.push(key);
    else if (!Object.is(before[key], after[key])) changed.push(key);
  }
  for (const key of Object.keys(before)) {
    if (!Object.hasOwn(after, key)) removed.push(key);
  }
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort() };
}

console.log(diff({ name: 'Asha', age: 30, city: 'Pune' }, { name: 'Asha', age: 31, email: 'a@x.io' }));
// { added: [ 'email' ], removed: [ 'city' ], changed: [ 'age' ] }
console.log(diff({ v: NaN, tags: ['a'] }, { v: NaN, tags: ['a'] }));
// { added: [], removed: [], changed: [ 'tags' ] }  (new array object = changed, shallowly)` },
      dry: { head: ['pass', 'key', 'check', 'list'], rows: [['after', 'name', "same 'Asha'", '—'], ['after', 'age', '30 vs 31', 'changed'], ['after', 'email', 'not in before', 'added'], ['before', 'city', 'not in after', 'removed']] },
      complexity: `<p>Time O(n + m + output·log output) for sorting; space O(output).</p>`,
      followUps: ['Make it deep: recurse into nested plain objects and report paths like <code>"address.city"</code>', 'Produce a patch that turns before into after', 'Ignore keys listed in an options object']
    }
  });

  practice.push({
    title: 'keyBy and countBy Helpers',
    level: 'Medium', tags: ['reduce', 'Map', 'objects', 'grouping'], companies: ['Amazon', 'Shopify'],
    statement: `<p>Write <code>keyBy(arr, keyFn)</code> → object mapping <code>keyFn(item)</code> to the <b>last</b> item with that key, and <code>countBy(arr, keyFn)</code> → <code>Map</code> from key to count (a Map so any key type works and insertion order is kept). <code>keyFn</code> may also be a property name string.</p>`,
    constraints: `<p>n ≤ 10<sup>6</sup>.</p>`,
    example: `<p><code>keyBy([{ id: 'a', v: 1 }, { id: 'b', v: 2 }, { id: 'a', v: 3 }], 'id')</code> → ${H.c('g', "{ a: { id: 'a', v: 3 }, b: { id: 'b', v: 2 } }")}<br><code>countBy(['apple', 'avocado', 'banana'], w =&gt; w[0])</code> → ${H.c('g', "Map { 'a' → 2, 'b' → 1 }")}</p>`,
    brute: { why: `<p>Using <code>find</code> inside a loop to check if a key was already seen, or <code>filter(...).length</code> per distinct key, makes these O(n²). A single pass with an object/Map is enough.</p>`, code: { lang: 'js', run: true, code: `function countBy(arr, keyFn) {
  const keys = [...new Set(arr.map(keyFn))];
  return new Map(keys.map(k => [k, arr.filter(x => keyFn(x) === k).length])); // O(n * distinct)
}
console.log(countBy(['apple', 'avocado', 'banana'], w => w[0]));` } },
    mcq: { q: 'How do you accept either a function or a property name for <code>keyFn</code>?', options: ['<code>const fn = typeof keyFn === \'function\' ? keyFn : x =&gt; x[keyFn]</code>', '<code>keyFn.call(x)</code>', '<code>x.keyFn</code>', '<code>eval(keyFn)</code>'], answer: 0, explain: 'Normalise once at the start: wrap a string into an accessor arrow. x.keyFn would look for a property literally named "keyFn".' },
    hints: [`<p>Both are single-pass folds: one into an object, one into a Map.</p>`, `<p>Normalise the key function first. keyBy: <code>acc[fn(x)] = x</code>. countBy: <code>m.set(k, (m.get(k) ?? 0) + 1)</code>.</p>`, `<p>"Last item wins" in keyBy happens automatically because later writes overwrite earlier ones. Use <code>Object.create(null)</code> for keyBy so keys like "constructor" are safe.</p>`],
    solution: {
      approach: `<p>Normalise <code>keyFn</code>, then one reduce per helper: keyBy assigns into a prototype-less object (later items overwrite earlier ones), countBy increments counts in a Map.</p>`,
      code: { lang: 'js', run: true, code: `const toFn = keyFn => (typeof keyFn === 'function' ? keyFn : item => item[keyFn]);

function keyBy(arr, keyFn) {
  const fn = toFn(keyFn);
  return arr.reduce((acc, item) => {
    acc[fn(item)] = item;          // last one with the same key wins
    return acc;
  }, Object.create(null));
}

function countBy(arr, keyFn) {
  const fn = toFn(keyFn);
  return arr.reduce((m, item) => {
    const k = fn(item);
    return m.set(k, (m.get(k) ?? 0) + 1); // Map.set returns the map itself
  }, new Map());
}

const rows = [{ id: 'a', v: 1 }, { id: 'b', v: 2 }, { id: 'a', v: 3 }];
console.log(keyBy(rows, 'id'));                                  // a -> { id: 'a', v: 3 }, b -> { id: 'b', v: 2 }
console.log(countBy(['apple', 'avocado', 'banana'], w => w[0])); // Map(2) { 'a' => 2, 'b' => 1 }
console.log(countBy([1.2, 1.7, 2.1], Math.floor));               // Map(2) { 1 => 2, 2 => 1 }` },
      dry: { head: ['item', 'key', 'keyBy acc', 'countBy map'], rows: [["{ id: 'a', v: 1 }", 'a', '{ a: v1 }', 'a → 1'], ["{ id: 'b', v: 2 }", 'b', '{ a: v1, b: v2 }', 'a → 1, b → 1'], ["{ id: 'a', v: 3 }", 'a', '{ a: <b>v3</b>, b: v2 }', 'a → 2, b → 1']] },
      complexity: `<p>Time O(n), space O(distinct keys).</p>`,
      followUps: ['groupBy returning arrays — compare with Object.groupBy / Map.groupBy', 'keyBy that throws on duplicate keys', 'sumBy(arr, keyFn, valueFn)']
    }
  });

  practice.push({
    title: 'Predict the Output: References, Spread & JSON',
    level: 'Medium', tags: ['predict the output', 'references', 'spread', 'JSON'], companies: ['Common frontend screening'],
    statement: `<p>Predict every printed line, then explain the memory picture behind each.</p>
<pre>const a = { n: 1, inner: { m: 1 }, list: [1] };
const b = a;
const c = { ...a };
const d = JSON.parse(JSON.stringify(a));
b.n = 2;
c.inner.m = 2;
c.list = [9];
d.inner.m = 3;
console.log(a.n, a.inner.m, a.list);
console.log(c.n, c.inner === a.inner, d.inner === a.inner);
console.log(a === b, a === c, JSON.stringify(a) === JSON.stringify(b));</pre>`,
    constraints: `<p>Assume a modern engine; reason with the "variables hold arrows to objects" model.</p>`,
    example: `<p>Hint for line 1: <code>b</code> is the same object as <code>a</code>, so <code>b.n = 2</code> is visible through <code>a</code>. Work out <code>inner</code> and <code>list</code> yourself.</p>`,
    brute: { why: `<p>Assuming "every new variable is a copy" (or that spread is deep) leads to wrong answers on lines 1 and 2. You must track which objects are <b>shared</b> after each line.</p>`, code: { lang: 'js', run: true, code: `const a = { n: 1, inner: { m: 1 }, list: [1] };
const b = a;
const c = { ...a };
const d = JSON.parse(JSON.stringify(a));
b.n = 2;
c.inner.m = 2;
c.list = [9];
d.inner.m = 3;
console.log(a.n, a.inner.m, a.list);
console.log(c.n, c.inner === a.inner, d.inner === a.inner);
console.log(a === b, a === c, JSON.stringify(a) === JSON.stringify(b));` } },
    mcq: { q: 'After <code>c.list = [9]</code>, what is <code>a.list</code>?', options: ['<code>[1]</code> — c.list was re-pointed to a new array, a still points to the old one', '<code>[9]</code> — lists are shared', '<code>undefined</code>', '<code>[1, 9]</code>'], answer: 0, explain: 'Assigning a new array to c.list changes only c\'s own property. Mutating it (c.list.push(9)) would have affected a, because the spread copy shared the array.' },
    hints: [`<p>Draw boxes: a and b → object O1. c → new object O2 whose inner/list arrows point to the <b>same</b> inner/list as O1. d → a completely separate deep copy.</p>`, `<p>Mutation through a shared arrow (<code>c.inner.m = 2</code>) is visible to everyone sharing it. Re-pointing (<code>c.list = [9]</code>) is not.</p>`, `<p>c was copied <b>before</b> <code>b.n = 2</code>, so c.n is still 1. d's inner is its own object.</p>`],
    solution: {
      approach: `<p>a/b share O1. c is a shallow copy taken when n was 1, sharing inner and list. d is a deep copy. b.n=2 → a.n=2. c.inner.m=2 → shared inner, so a.inner.m=2. c.list=[9] re-points only c. d.inner.m=3 changes d's private inner.</p>`,
      code: { lang: 'js', run: true, code: `const a = { n: 1, inner: { m: 1 }, list: [1] };
const b = a;                              // same object
const c = { ...a };                       // shallow copy (n copied as 1; inner & list shared)
const d = JSON.parse(JSON.stringify(a));  // deep copy (plain data only)
b.n = 2;                                  // O1.n = 2 (a sees it)
c.inner.m = 2;                            // shared inner -> a.inner.m = 2
c.list = [9];                             // re-point c.list only
d.inner.m = 3;                            // d's own inner
console.log(a.n, a.inner.m, a.list);                                // 2 2 [ 1 ]
console.log(c.n, c.inner === a.inner, d.inner === a.inner);         // 1 true false
console.log(a === b, a === c, JSON.stringify(a) === JSON.stringify(b)); // true false true` },
      dry: { head: ['line', 'a', 'c', 'd'], rows: [['copies made', 'n1 m1 [1]', 'n1, shares inner/list', 'n1 m1 [1] (own)'], ['b.n = 2', '<b>n2</b>', 'n1', 'n1'], ['c.inner.m = 2', '<b>m2</b> (shared)', 'm2', 'm1'], ['c.list = [9]', '[1]', '<b>[9]</b>', '[1]'], ['d.inner.m = 3', 'm2', 'm2', '<b>m3</b>']] },
      complexity: `<p>Mental-model question; the key complexity insight is that spread copies one level (O(top-level keys)), JSON round-trip copies everything (O(total size)).</p>`,
      followUps: ['Replace the JSON copy with structuredClone — what changes for Dates and Maps?', 'Which lines would change if <code>c</code> were made with <code>structuredClone(a)</code>?']
    }
  });

  /* ================= PRACTICE: Hard ================= */
  practice.push({
    title: 'Spec-Faithful reduce Polyfill',
    level: 'Hard', tags: ['polyfill', 'reduce', 'spec', 'holes'], companies: ['Uber', 'Flipkart', 'Atlassian', 'Microsoft'],
    statement: `<p>Implement <code>Array.prototype.myReduce(callback, initialValue)</code> exactly like the built-in: callback gets <code>(acc, element, index, array)</code>; with no initial value the <b>first present element</b> is the accumulator and iteration starts after it; an empty array (or all holes) with no initial value throws <code>TypeError</code>; holes are skipped; an explicitly passed <code>undefined</code> initial value <b>counts</b> as provided.</p>`,
    constraints: `<p>No built-in iteration methods. Use <code>arguments.length</code> (or rest) to tell "not passed" apart from "passed undefined".</p>`,
    example: `<p><code>[1, 2, 3].myReduce((a, b) =&gt; a + b)</code> → ${H.c('g', '6')} (callback called 2×)<br><code>[, , 5].myReduce((a, b) =&gt; a + b)</code> → ${H.c('g', '5')} (callback never called)<br><code>[].myReduce((a, b) =&gt; a + b)</code> → ${H.c('r', 'TypeError')}<br><code>[1].myReduce((a, b) =&gt; [a, b], undefined)</code> → ${H.c('g', '[undefined, 1]')} (undefined WAS provided)</p>`,
    brute: { why: `<p>The common interview answer <code>let acc = init ?? this[0]</code> is wrong in three ways: it treats a passed <code>undefined</code> (or <code>null</code>!) as "missing", it starts at index 0 or 1 without checking for holes, and it returns <code>undefined</code> on an empty array instead of throwing.</p>`, code: { lang: 'js', run: true, code: `Array.prototype.naiveReduce = function (cb, init) {
  let acc = init ?? this[0];                 // null/undefined treated as missing
  const start = init === undefined ? 1 : 0;  // ignores holes
  for (let i = start; i < this.length; i++) acc = cb(acc, this[i], i, this);
  return acc;
};
console.log([].naiveReduce((a, b) => a + b));            // undefined (should throw)
console.log([1, 2].naiveReduce((a, b) => a + b, null));  // 3 (built-in gives null + 1 + 2 = 3 too, but by luck)
console.log([, , 5].naiveReduce((a, b) => a + b));       // NaN (should be 5)
delete Array.prototype.naiveReduce;` } },
    mcq: { q: 'How can the polyfill distinguish <code>reduce(fn)</code> from <code>reduce(fn, undefined)</code>?', options: ['Check <code>arguments.length &gt;= 2</code> (or use a rest parameter and check its length)', 'Check <code>initialValue === undefined</code>', 'Check <code>typeof initialValue</code>', 'It is impossible in JavaScript'], answer: 0, explain: 'Both calls make initialValue undefined, but arguments.length is 1 vs 2. The spec makes exactly this distinction.' },
    hints: [`<p>Three phases: validate the callback; find the starting accumulator and index; loop the remaining present indices.</p>`, `<p>If <code>arguments.length &gt;= 2</code>, acc = initialValue, start at 0. Otherwise scan forward for the first <code>k in this</code>; if none, throw <code>TypeError('Reduce of empty array with no initial value')</code>; acc = this[k], start at k + 1.</p>`, `<p>In the loop, skip holes with <code>if (i in this)</code>, and read <code>len</code> once before the loop. Define it non-enumerable with <code>Object.defineProperty</code>.</p>`],
    solution: {
      approach: `<p>Mirror the spec (Array.prototype.reduce, steps 1–10): length captured once; "initial value present" decided by argument count; first present element search when absent; TypeError if none; loop skipping holes; return the accumulator.</p>`,
      code: { lang: 'js', run: true, code: `Object.defineProperty(Array.prototype, 'myReduce', {
  value: function (callback, initialValue) {
    if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');
    const O = Object(this);
    const len = O.length >>> 0;                // read length once
    let k = 0;
    let acc;
    if (arguments.length >= 2) {
      acc = initialValue;                      // provided, even if undefined
    } else {
      while (k < len && !(k in O)) k++;        // find first present element
      if (k >= len) throw new TypeError('Reduce of empty array with no initial value');
      acc = O[k++];
    }
    for (; k < len; k++) {
      if (k in O) acc = callback(acc, O[k], k, O); // skip holes
    }
    return acc;
  },
  writable: true, configurable: true, enumerable: false,
});

let calls = 0;
console.log([1, 2, 3].myReduce((a, b) => { calls++; return a + b; }), 'calls:', calls); // 6 calls: 2
console.log([, , 5].myReduce((a, b) => a + b));                 // 5
console.log([1].myReduce((a, b) => [a, b], undefined));         // [ undefined, 1 ]
try { [].myReduce((a, b) => a + b); } catch (e) { console.log(e.name + ': ' + e.message); }
console.log([1, 2, 3].myReduce((a, b) => a + b, 10) === [1, 2, 3].reduce((a, b) => a + b, 10)); // true
console.log(Array.prototype.myReduce.call('abc', (a, ch) => ch + a, '')); // cba (works on array-likes)` },
      dry: { head: ['input', 'args', 'start acc / k', 'calls', 'result'], rows: [['[1, 2, 3]', '1', 'acc = 1, k = 1', '(1,2) (3,3)', '6'], ['[ , , 5]', '1', 'skip 0,1 → acc = 5, k = 3', 'none', '5'], ['[]', '1', 'no present element', '—', '<span class="c-r">TypeError</span>'], ['[1]', '2 (undefined)', 'acc = undefined, k = 0', '(undefined, 1)', '[undefined, 1]']] },
      complexity: `<p>Time O(n), extra space O(1).</p>`,
      followUps: ['Implement reduceRight', 'Implement map and filter on top of myReduce', 'Why does <code>len &gt;&gt;&gt; 0</code> appear in old polyfills?']
    }
  });

  practice.push({
    title: 'Deep Clone with Cycles, Dates, Maps and Sets',
    level: 'Hard', tags: ['objects', 'recursion', 'WeakMap', 'cloning'], companies: ['Google', 'Microsoft', 'Rippling'],
    statement: `<p>Implement <code>deepClone(value)</code> without <code>structuredClone</code> or JSON. Support primitives, arrays, plain objects, <code>Date</code>, <code>RegExp</code>, <code>Map</code>, <code>Set</code>, and <b>circular references</b> (a cycle in the input becomes the same cycle in the copy). Preserve the prototype of plain/class objects and copy own enumerable string and symbol keys. Functions are returned as-is (shared).</p>`,
    constraints: `<p>Up to 10<sup>5</sup> nodes; nesting depth ≤ 1000.</p>`,
    example: `<p><code>const a = { when: new Date(0), tags: new Set(['x']), list: [1, { y: 2 }] }; a.self = a;</code><br><code>const b = deepClone(a)</code> → ${H.c('g', 'b.self === b')}, ${H.c('g', 'b.when instanceof Date')}, ${H.c('g', "b.tags.has('x')")}, ${H.c('g', 'b.list[1] !== a.list[1]')}</p>`,
    brute: { why: `<p><code>JSON.parse(JSON.stringify(x))</code> turns Dates into strings, Maps/Sets into <code>{}</code>, drops undefined and functions, loses prototypes — and <b>throws</b> on cycles. A naive recursive copy without a "visited" map recurses forever on cycles (stack overflow).</p>`, code: { lang: 'js', run: true, code: `const a = { when: new Date(0), tags: new Set(['x']) };
const viaJson = JSON.parse(JSON.stringify(a));
console.log(typeof viaJson.when, viaJson.tags);   // string {}
a.self = a;
try { JSON.stringify(a); } catch (e) { console.log(e.name); } // TypeError (circular)` } },
    mcq: { q: 'Why record the clone in the WeakMap BEFORE recursing into children?', options: ['So a child that points back to the parent finds the half-built clone instead of recursing forever', 'WeakMap needs entries sorted', 'To save memory', 'Order does not matter'], answer: 0, explain: 'In a cycle, the recursion reaches the same object again while still building it. If the clone is registered first, that lookup returns it and the cycle is reproduced.' },
    hints: [`<p>Primitives and functions: return as-is. Objects: check a <code>WeakMap</code> of original → clone first, to handle cycles and shared references.</p>`, `<p>Branch by type: Date → <code>new Date(v.getTime())</code>; RegExp → <code>new RegExp(v.source, v.flags)</code>; Map/Set → new collection, cloning keys and values; arrays → <code>new Array(len)</code>; others → <code>Object.create(Object.getPrototypeOf(v))</code>.</p>`, `<p>Register the empty clone in the WeakMap <b>before</b> filling it. Copy keys with <code>Reflect.ownKeys</code> filtered to enumerable ones (gets symbols too).</p>`],
    solution: {
      approach: `<p>Recursive copy with a WeakMap "visited" table. Each object type gets its own construction; the empty clone is registered before children are cloned, so cycles and shared sub-objects are reproduced faithfully.</p>`,
      code: { lang: 'js', run: true, code: `function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value; // primitives & functions
  if (seen.has(value)) return seen.get(value);                     // cycle / shared ref

  let copy;
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (value instanceof Map) {
    copy = new Map();
    seen.set(value, copy);
    value.forEach((v, k) => copy.set(deepClone(k, seen), deepClone(v, seen)));
    return copy;
  }
  if (value instanceof Set) {
    copy = new Set();
    seen.set(value, copy);
    value.forEach(v => copy.add(deepClone(v, seen)));
    return copy;
  }
  copy = Array.isArray(value) ? new Array(value.length) : Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);                                           // register BEFORE recursing
  for (const key of Reflect.ownKeys(value)) {                      // strings + symbols
    const desc = Object.getOwnPropertyDescriptor(value, key);
    if (desc.enumerable) copy[key] = deepClone(value[key], seen);
  }
  return copy;
}

class Point { constructor(x) { this.x = x; } norm() { return Math.abs(this.x); } }
const tag = Symbol('tag');
const a = { when: new Date(0), tags: new Set(['x']), list: [1, { y: 2 }], p: new Point(-3), re: /ab+c/gi, [tag]: 'sym' };
a.self = a;
a.map = new Map([['back', a]]);

const b = deepClone(a);
console.log(b.self === b, b.map.get('back') === b);       // true true   (cycles preserved)
console.log(b.when instanceof Date, b.tags.has('x'));     // true true
console.log(b.list[1] !== a.list[1], b.list[1].y);        // true 2
console.log(b.p instanceof Point, b.p.norm());            // true 3
console.log(b.re.flags, b[tag]);                          // gi sym
b.list[1].y = 99;
console.log(a.list[1].y);                                 // 2 (independent)` },
      dry: { head: ['visiting', 'seen?', 'action'], rows: [['a (object)', 'no', 'create copy B, seen.set(a, B)'], ['a.when', '—', 'new Date(0)'], ['a.list → [1, {y}]', 'no', 'new array, recurse'], ['a.self = a', '<span class="c-g">yes</span>', 'return B (cycle reproduced)'], ['a.map → Map', 'no', 'new Map; value a → seen → B']] },
      complexity: `<p>Time O(number of nodes + edges); space O(nodes) for the copy and the WeakMap, plus O(depth) stack.</p>`,
      followUps: ['Make it iterative to survive 100 000-deep nesting', 'Copy property descriptors (getters/setters, non-writable) exactly', 'Compare with structuredClone: what does each support that the other does not?']
    }
  });

  practice.push({
    title: 'get and set by Path ("a.b[0].c")',
    level: 'Hard', tags: ['objects', 'strings', 'parsing', 'immutability'], companies: ['Lodash-style utilities', 'Amazon', 'Postman'],
    statement: `<p>Implement <code>get(obj, path, fallback)</code> and an <b>immutable</b> <code>setIn(obj, path, value)</code>. Paths look like <code>"user.addresses[0].city"</code> (dots and <code>[index]</code>). <code>get</code> returns <code>fallback</code> when any step is missing (never throws). <code>setIn</code> returns a new object with copies along the path only, creating missing containers: an array if the next key is a number, otherwise an object. Reject the keys <code>__proto__</code>, <code>constructor</code> and <code>prototype</code>.</p>`,
    constraints: `<p>Path length ≤ 100 segments; objects up to 10<sup>5</sup> nodes.</p>`,
    example: `<p><code>get(data, 'user.addresses[0].city')</code> → ${H.c('g', "'Pune'")}; <code>get(data, 'user.phone.home', 'n/a')</code> → ${H.c('m', "'n/a'")}<br><code>setIn({}, 'a.list[1].x', 5)</code> → ${H.c('g', '{ a: { list: [ &lt;empty&gt;, { x: 5 } ] } }')}</p>`,
    brute: { why: `<p><code>path.split('.')</code> fails on bracket indexes, chained <code>obj.a.b.c</code> access throws on the first missing level, and a mutating <code>set</code> changes shared state (and with keys like <code>__proto__</code>, can pollute <code>Object.prototype</code> for the whole app).</p>`, code: { lang: 'js', run: true, code: `function naiveGet(obj, path) {
  return path.split('.').reduce((cur, key) => cur[key], obj); // throws on missing levels
}
const data = { user: { addresses: [{ city: 'Pune' }] } };
try {
  console.log(naiveGet(data, 'user.addresses[0].city'));
} catch (e) {
  console.log(e.name); // TypeError: 'addresses[0]' is not a key
}` } },
    mcq: { q: 'What does <code>setIn</code> copy when updating <code>a.b.c</code>?', options: ['The root, a, and a.b (the path); everything else is shared', 'Every object in the tree', 'Only the leaf', 'Nothing — it mutates'], answer: 0, explain: 'Structural sharing: copy each container on the path so the original is untouched, and reuse all untouched branches. That is how Redux/Immer stay fast.' },
    hints: [`<p>First turn the path into segments: replace <code>[n]</code> with <code>.n</code>, split on dots, drop empty pieces, and convert digit-only pieces to numbers.</p>`, `<p>get: walk the segments; if the current value is <code>null</code>/<code>undefined</code> or does not own the key, return the fallback. setIn: recursive — copy the current container (<code>Array.isArray ? [...c] : { ...c }</code>), then set <code>copy[key] = setIn(child, rest, value)</code>.</p>`, `<p>When a container is missing, create <code>[]</code> if the next segment is a number, else <code>{}</code>. Throw on forbidden keys before touching anything.</p>`],
    solution: {
      approach: `<p>A tiny path parser produces segments. <code>get</code> walks them defensively with own-property checks. <code>setIn</code> recurses along the path, shallow-copying each container (structural sharing) and creating missing ones based on the next segment's type. Dangerous keys are rejected.</p>`,
      code: { lang: 'js', run: true, code: String.raw`const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

function parsePath(path) {
  const segs = path
    .replace(/\[(\d+)\]/g, '.$1')      // a[0].b -> a.0.b
    .split('.')
    .filter(s => s.length > 0)
    .map(s => (/^\d+$/.test(s) ? Number(s) : s));
  for (const s of segs) if (FORBIDDEN.has(String(s))) throw new Error('Forbidden key: ' + s);
  return segs;
}

function get(obj, path, fallback) {
  let cur = obj;
  for (const key of parsePath(path)) {
    if (cur === null || typeof cur !== 'object' || !Object.hasOwn(cur, key)) return fallback;
    cur = cur[key];
  }
  return cur === undefined ? fallback : cur;
}

function setIn(obj, path, value) {
  const segs = typeof path === 'string' ? parsePath(path) : path;
  if (segs.length === 0) return value;
  const [key, ...rest] = segs;
  const container =
    obj !== null && typeof obj === 'object'
      ? (Array.isArray(obj) ? [...obj] : { ...obj })   // copy this level
      : (typeof key === 'number' ? [] : {});           // create missing level
  container[key] = setIn(container[key], rest, value); // recurse into the child
  return container;
}

const data = { user: { name: 'Asha', addresses: [{ city: 'Pune' }, { city: 'Goa' }] }, settings: { dark: true } };
console.log(get(data, 'user.addresses[0].city'));         // Pune
console.log(get(data, 'user.phone.home', 'n/a'));         // n/a
console.log(get(data, 'user.addresses[5].city', 'none')); // none

const next = setIn(data, 'user.addresses[1].city', 'Delhi');
console.log(next.user.addresses[1].city, data.user.addresses[1].city); // Delhi Goa
console.log(next.settings === data.settings);                          // true (shared)
console.log(next.user.addresses[0] === data.user.addresses[0]);        // true (shared)
console.log(JSON.stringify(setIn({}, 'a.list[1].x', 5)));              // {"a":{"list":[null,{"x":5}]}}
try { setIn({}, '__proto__.polluted', true); } catch (e) { console.log(e.message); }
console.log({}.polluted);                                              // undefined` },
      dry: { head: ['setIn level', 'key', 'container', 'action'], rows: [['root', 'user', 'copy of data', 'recurse into data.user'], ['user', 'addresses', 'copy of user', 'recurse'], ['addresses', '1', 'copy of array', 'recurse into element 1'], ['element 1', 'city', '{ ...{ city: Goa } }', "set 'Delhi'"], ['leaf', '—', '—', 'return value']] },
      complexity: `<p>get: O(path length). setIn: O(sum of sizes of the containers on the path) for the shallow copies; untouched branches are shared, so memory grows only along the path.</p>`,
      followUps: ['Support quoted keys like <code>a["weird.key"]</code>', 'Write <code>updateIn(obj, path, fn)</code>', 'Add TypeScript types that infer the value type from the path string']
    }
  });

  practice.push({
    title: 'Write Your Own JSON.stringify (core rules)',
    level: 'Hard', tags: ['JSON', 'recursion', 'strings', 'polyfill'], companies: ['Meta', 'Google', 'Atlassian'],
    statement: `<p>Implement <code>toJSON(value)</code> matching <code>JSON.stringify(value)</code> (no replacer/space) for: strings (escape <code>"</code>, <code>\\</code>, and control characters), finite numbers (NaN/±Infinity → <code>null</code>), booleans, <code>null</code>, arrays (undefined/function/symbol → <code>null</code>), plain objects (undefined/function/symbol values → key skipped), objects with a <code>toJSON()</code> method (e.g. Date), and a top-level <code>undefined</code>/function → <code>undefined</code>. Cycles must throw <code>TypeError</code>.</p>`,
    constraints: `<p>No calls to the real JSON.stringify inside your implementation. Depth ≤ 1000.</p>`,
    example: `<p><code>toJSON({ a: [1, undefined, 'x"y'], b: undefined, c: NaN, d: new Date(0) })</code><br>→ ${H.c('g', '{"a":[1,null,"x\\"y"],"c":null,"d":"1970-01-01T00:00:00.000Z"}')}</p>`,
    brute: { why: `<p>A first attempt usually wraps strings in quotes without escaping (<code>'"' + s + '"'</code>), so a value containing a quote produces <b>invalid JSON</b>; it prints <code>undefined</code> inside arrays, keeps keys with undefined values, and recurses forever on cycles.</p>`, code: { lang: 'js', run: true, code: `function naive(v) {
  if (typeof v === 'string') return '"' + v + '"';         // no escaping!
  if (Array.isArray(v)) return '[' + v.map(naive).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).map(k => '"' + k + '":' + naive(v[k])).join(',') + '}';
  return String(v);
}
const out = naive({ a: [1, undefined, 'x"y'], b: undefined });
console.log(out);
try { JSON.parse(out); } catch (e) { console.log('invalid JSON:', e.name); }` } },
    mcq: { q: 'Inside an ARRAY, what does stringify output for <code>undefined</code>?', options: ['<code>null</code> — positions must be preserved', 'Nothing — the item is skipped', '<code>"undefined"</code>', 'It throws'], answer: 0, explain: 'Objects can drop a key, but arrays cannot drop a position without shifting every later index, so the spec writes null.' },
    hints: [`<p>Write one recursive function <code>ser(value, inArray)</code> that returns a string, or <code>undefined</code> meaning "nothing to write". The caller decides: skip the key (object) or write <code>null</code> (array).</p>`, `<p>Order of checks: call <code>toJSON</code> if present → null → boolean → number (finite?) → string (escape) → undefined/function/symbol → array → object. Keep a <code>Set</code> of objects on the current path to detect cycles.</p>`, `<p>Escaping: <code>\\</code> → <code>\\\\</code>, <code>"</code> → <code>\\"</code>, newline → <code>\\n</code>, other chars below U+0020 → <code>\\u00XX</code>. Remove the object from the path set after serialising it (shared, non-cyclic references are allowed).</p>`],
    solution: {
      approach: `<p>Recursive serializer returning <code>undefined</code> for "no representation". Arrays turn that into <code>null</code>; objects skip the key. A path Set detects true cycles while still allowing the same object to appear twice in different branches. Strings are escaped per the JSON grammar.</p>`,
      code: { lang: 'js', run: true, code: String.raw`function quote(s) {
  const map = { '"': '\\"', '\\': '\\\\', '\n': '\\n', '\r': '\\r', '\t': '\\t', '\b': '\\b', '\f': '\\f' };
  let out = '"';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (map[ch]) out += map[ch];
    else if (code < 0x20) out += '\\u' + code.toString(16).padStart(4, '0');
    else out += ch;
  }
  return out + '"';
}

function toJSON(value) {
  const path = new Set(); // objects currently being serialised (cycle detection)

  function ser(v) {
    if (v !== null && typeof v === 'object' && typeof v.toJSON === 'function') v = v.toJSON();
    if (v === null) return 'null';
    switch (typeof v) {
      case 'boolean': return String(v);
      case 'number': return Number.isFinite(v) ? String(v) : 'null';
      case 'string': return quote(v);
      case 'bigint': throw new TypeError('Do not know how to serialize a BigInt');
      case 'undefined': case 'function': case 'symbol': return undefined; // "nothing"
    }
    if (path.has(v)) throw new TypeError('Converting circular structure to JSON');
    path.add(v);
    let result;
    if (Array.isArray(v)) {
      const parts = [];
      for (let i = 0; i < v.length; i++) {
        const s = ser(v[i]);
        parts.push(s === undefined ? 'null' : s);     // arrays keep positions
      }
      result = '[' + parts.join(',') + ']';
    } else {
      const parts = [];
      for (const key of Object.keys(v)) {
        const s = ser(v[key]);
        if (s !== undefined) parts.push(quote(key) + ':' + s); // objects skip the key
      }
      result = '{' + parts.join(',') + '}';
    }
    path.delete(v);
    return result;
  }
  return ser(value);
}

const samples = [
  { a: [1, undefined, 'x"y'], b: undefined, c: NaN, d: new Date(0) },
  ['line\nbreak', 'tab\there', 'back\\slash', '\u0001'],
  { nested: { deep: [true, false, null, -0, 1e21] }, fn() {} },
  'plain', 42, null, undefined,
];
for (const s of samples) {
  const mine = toJSON(s), real = JSON.stringify(s);
  console.log(mine === real ? 'MATCH' : 'DIFF ', mine);
}
const shared = { k: 1 };
console.log(toJSON({ x: shared, y: shared }));       // {"x":{"k":1},"y":{"k":1}} (shared is fine)
const cyc = { name: 'c' }; cyc.me = cyc;
try { toJSON(cyc); } catch (e) { console.log(e.name + ': ' + e.message); }` },
      dry: { head: ['value', 'branch', 'returns', 'caller writes'], rows: [['1', 'number, finite', '"1"', '1'], ['undefined (in array)', 'undefined', 'undefined', '<b>null</b>'], ['\'x"y\'', 'string', '"x\\"y"', '"x\\"y"'], ['b: undefined (in object)', 'undefined', 'undefined', '<span class="c-m">key skipped</span>'], ['NaN', 'number, not finite', '"null"', 'null'], ['Date(0)', 'toJSON → string', '"1970-01-01T…Z"', 'ISO string']] },
      complexity: `<p>Time O(total size of the value + output length). Space O(depth) for recursion and the path set, plus the output string.</p>`,
      followUps: ['Add the <code>space</code> argument for pretty printing', 'Add replacer function and replacer-array support', 'Serialise Map and Set as tagged objects and write the matching reviver']
    }
  });


  /* ================= PRACTICE: heaps (appended) ================= */
  practice.push({
    title: 'Merge K Sorted Arrays',
    level: 'Hard', tags: ['heap', 'priority queue', 'merge', 'arrays'], companies: ['Amazon', 'Google', 'Meta', 'Microsoft'],
    statement: `<p>You get <code>arrays</code>, a list of k arrays of integers, each already sorted in ascending order. Write <code>mergeKSorted(arrays)</code> that returns one sorted array with every value from all of them (duplicates kept). Some arrays may be empty. Do not mutate the input. Write your own <code>MinHeap</code> class (<code>push</code>, <code>pop</code>, <code>peek</code>, <code>size</code>, with a comparator).</p>`,
    constraints: `<p>0 ≤ k ≤ 10<sup>4</sup>; total number of values n ≤ 10<sup>5</sup>; −10<sup>9</sup> ≤ value ≤ 10<sup>9</sup>.</p>`,
    example: `<p><code>mergeKSorted([[1, 4, 5], [1, 3, 4], [2, 6]])</code> → ${H.c('g', '[1, 1, 2, 3, 4, 4, 5, 6]')}<br>${H.arr([1, 4, 5], { label: 'A' })}${H.arr([1, 3, 4], { label: 'B' })}${H.arr([2, 6], { label: 'C' })}Each array is sorted, so the overall smallest is always the front of one of them. The heap holds those k fronts. Also: <code>mergeKSorted([])</code> → <code>[]</code> and <code>mergeKSorted([[], []])</code> → <code>[]</code>.</p>`,
    brute: { why: `<p>Concatenate everything and call <code>sort((a, b) =&gt; a - b)</code>. It is correct and short, but it costs <code>O(n log n)</code> and ignores the fact that every array is already sorted. The wasted work is re-discovering order that was given to us. (Forgetting the comparator is worse: <code>sort()</code> compares as strings and puts 10 before 9.)</p>`, code: `function mergeKSorted(arrays) {
  const all = [];
  for (const arr of arrays) for (const x of arr) all.push(x);
  return all.sort((a, b) => a - b);   // O(n log n), ignores the sorted input
}` },
    mcq: { q: 'What goes into the heap?', options: ['One entry per array: its current front value plus which array and which position it came from', 'Every value from every array', 'Only the largest value of each array', 'The arrays themselves, compared by length'], answer: 0, explain: 'The next output value is always the smallest current front. So the heap holds just k entries (value, array index, position). Pop the smallest, then push the next value from the same array. The heap never has more than k entries, so each of the n steps costs O(log k).' },
    hints: [
      `<p>Hint 1: the smallest value not yet output must be at the <b>front</b> of one of the k arrays. You never need to look deeper than the fronts.</p>`,
      `<p>Hint 2: put the k fronts in a min-heap, as <code>[value, arrayIndex, position]</code>, compared by value. Pop the smallest, append it to the output, then push the next element of that same array (if any).</p>`,
      `<p>Hint 3: skip empty arrays when you seed the heap. Loop <code>while heap.size() &gt; 0</code>. Edge cases: <code>arrays = []</code>, all arrays empty, one array, duplicates across arrays, negative numbers. Compare numbers with <code>a &lt; b</code> in the heap predicate (not <code>a - b</code>).</p>`
    ],
    tests: {"sig":"int[][] -> int[]","fn":"mergeKSorted","cases":[[[[[1,4,5],[1,3,4],[2,6]]],[1,1,2,3,4,4,5,6]],[[[]],[]],[[[[]]],[]],[[[[],[],[]]],[]],[[[[5]]],[5]],[[[[1,1,1],[1,1],[1]]],[1,1,1,1,1,1]],[[[[-5,-1,0],[-3,-3],[10],[]]],[-5,-3,-3,-1,0,10]],[[[[1000000000,1000000000],[-1000000000],[0,1000000000]]],[-1000000000,0,1000000000,1000000000,1000000000]],[[[[1,2,3],[4,5,6],[7,8,9]]],[1,2,3,4,5,6,7,8,9]],[[[[7,8,9],[4,5,6],[1,2,3]]],[1,2,3,4,5,6,7,8,9]],[[{$rep:[1,2,3],"n":1000}],{$concat:[{$rep:1,"n":1000},{$rep:2,"n":1000},{$rep:3,"n":1000}]}],[[[{$range:[0,100000,2]},{$range:[1,100000,2]}]],{$range:[0,100000,1]}],[[{$rep:[4],"n":10000}],{$rep:4,"n":10000}]]},
    solution: {
      approach: `<p>Seed a min-heap with the first element of each non-empty array, as <code>[value, which array, position]</code>. Repeat: pop the smallest entry, add its value to the answer, and push the next element from the same array. Each of the n values is pushed and popped once on a heap of at most k entries, so the total is <code>O(n log k)</code>.</p>`,
      code: { lang: 'js', code: `// JS has no built-in heap: a small binary min-heap with a comparator.
class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function mergeKSorted(arrays) {
  // entry = [value, which array, position inside that array]
  const heap = new MinHeap((x, y) => x[0] < y[0]);
  for (let k = 0; k < arrays.length; k++) {
    if (arrays[k].length > 0) heap.push([arrays[k][0], k, 0]);   // skip empty arrays
  }
  const out = [];
  while (heap.size() > 0) {
    const [val, k, pos] = heap.pop();          // smallest current front
    out.push(val);
    if (pos + 1 < arrays[k].length) {
      heap.push([arrays[k][pos + 1], k, pos + 1]);   // advance in the same array
    }
  }
  return out;
}` },
      dry: { head: ['step', 'popped', 'output so far', 'heap fronts after pushing next'], rows: [
        ['seed', '—', '[]', '(1,A) (1,B) (2,C)'],
        ['1', '1 from A', '[1]', '(1,B) (2,C) (4,A)'],
        ['2', '1 from B', '[1,1]', '(2,C) (3,B) (4,A)'],
        ['3', '2 from C', '[1,1,2]', '(3,B) (4,A) (6,C)'],
        ['4', '3 from B', '[1,1,2,3]', '(4,A) (4,B) (6,C)'],
        ['5-6', '4 and 4', '[1,1,2,3,4,4]', '(5,A) (6,C)'],
        ['7-8', '5, 6', '[1,1,2,3,4,4,5,6]', 'empty → done']
      ] },
      complexity: `<p>Time O(n log k) for n total values and k arrays (each value is pushed and popped once on a heap of at most k entries). Space O(k) for the heap plus O(n) for the output. The concatenate-and-sort brute force is O(n log n).</p>`,
      followUps: ['Merge two sorted arrays with two pointers, then merge k by divide and conquer: also O(n log k), with no heap.', 'The k lists do not fit in memory (external merge sort): which part of this solution still works?', 'Return only the smallest m values: stop after m pops.']
    }
  });

  practice.push({
    title: 'Last Stone Weight',
    level: 'Medium', tags: ['heap', 'priority queue', 'simulation', 'max-heap'], companies: ['Amazon', 'Google', 'Bloomberg'],
    statement: `<p>You have an array <code>stones</code> of positive integer weights. Each turn, take the two heaviest stones, <code>y ≥ x</code>, and smash them together:</p><ul><li>if <code>x === y</code>, both stones are destroyed;</li><li>otherwise <code>x</code> is destroyed and <code>y</code> becomes <code>y - x</code>.</li></ul><p>Repeat until at most one stone is left. Write <code>lastStoneWeight(stones)</code> that returns the weight of the last stone, or <code>0</code> if none is left. Write your own <code>MinHeap</code> class and use a comparator to make it a max-heap.</p>`,
    constraints: `<p>1 ≤ stones.length ≤ 10<sup>5</sup>; 1 ≤ stones[i] ≤ 10<sup>9</sup>.</p>`,
    example: `<p><code>lastStoneWeight([2, 7, 4, 1, 8, 1])</code> → ${H.c('g', '1')}<br>${H.table(['turn', 'stones (largest first)', 'smash', 'result'], [['1', '8 7 4 2 1 1', '8 vs 7', 'leaves 1'], ['2', '4 2 1 1 1', '4 vs 2', 'leaves 2'], ['3', '2 1 1 1', '2 vs 1', 'leaves 1'], ['4', '1 1 1', '1 vs 1', 'both gone'], ['end', '1', '—', '<span class="c-g">answer 1</span>']])}</p>`,
    brute: { why: `<p>Sort the array, take the last two, smash, push the leftover and sort again. Every turn pays a full sort: <code>O(n log n)</code> per turn and up to n turns, so <code>O(n² log n)</code>. We only ever need the top two stones, never a complete order. (Also remember <code>sort</code> needs <code>(a, b) =&gt; a - b</code>; the default sorts as strings.)</p>`, code: `function lastStoneWeight(stones) {
  const s = [...stones];
  while (s.length > 1) {
    s.sort((a, b) => a - b);           // full sort every turn
    const y = s.pop(), x = s.pop();
    if (y !== x) s.push(y - x);
  }
  return s.length ? s[0] : 0;
}` },
    mcq: { q: 'Which structure gives "the heaviest stone" fastest, even as new leftovers keep being added?', options: ['A max-heap (a MinHeap with the comparator flipped to a &gt; b)', 'A sorted array that is re-sorted after each smash', 'A Set of the weights', 'A queue in the original order'], answer: 0, explain: 'Each turn is two removals of the maximum and at most one insertion. A max-heap does each in O(log n). Re-sorting costs O(n log n) per turn, a Set loses duplicates, and a queue has no notion of "heaviest".' },
    hints: [
      `<p>Hint 1: each turn needs only the <b>two largest</b> stones, and then one new stone may appear. That is "remove the max, remove the max, maybe insert".</p>`,
      `<p>Hint 2: a max-heap does exactly that. Take your <code>MinHeap</code> and pass the comparator <code>(a, b) =&gt; a &gt; b</code> so the biggest comes out first.</p>`,
      `<p>Hint 3: push all stones. While <code>heap.size() &gt; 1</code>: pop <code>y</code>, pop <code>x</code>; if they differ, push <code>y - x</code>. At the end return the one remaining stone, or 0 if the heap is empty. Edge cases: a single stone, two equal stones, all stones equal (odd count leaves one).</p>`
    ],
    tests: {"sig":"int[] -> int","fn":"lastStoneWeight","cases":[[[[2,7,4,1,8,1]],1],[[[1]],1],[[[2,2]],0],[[[10,4]],6],[[[3,7,2]],2],[[[1,1,1]],1],[[[9,3,1000,1000,2]],4],[[[1000000000,1]],999999999],[[[1000000000,1000000000,1000000000]],1000000000],[[[5,5,5,5,6]],4],[[{$range:[1,3001,1]}],0],[[{$rep:1000,"n":100000}],0],[[{$rep:1000,"n":99999}],1000]]},
    solution: {
      approach: `<p>Put all stones in a max-heap. While at least two remain, pop the two heaviest, and if they differ push the difference back. The heap shrinks by one or two stones per turn, so there are at most n turns, each costing <code>O(log n)</code>. Because weights go up to 10<sup>9</sup>, check that nothing here needs more than a normal <code>Number</code>: differences only get smaller, so there is no precision problem.</p>`,
      code: { lang: 'js', code: `// JS has no built-in heap: a small binary min-heap with a comparator.
class MinHeap {
  constructor(less = (a, b) => a < b) { this.a = []; this.less = less; }  // less(a, b): a comes out first
  size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0], last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function lastStoneWeight(stones) {
  const heap = new MinHeap((a, b) => a > b);   // flipped comparator = max-heap
  for (const s of stones) heap.push(s);
  while (heap.size() > 1) {
    const y = heap.pop();                       // heaviest
    const x = heap.pop();                       // second heaviest
    if (y !== x) heap.push(y - x);              // leftover goes back in
  }
  return heap.size() === 0 ? 0 : heap.peek();
}` },
      dry: { head: ['turn', 'pop y', 'pop x', 'push', 'heap (largest first)'], rows: [
        ['start', '—', '—', '—', '8 7 4 2 1 1'],
        ['1', '8', '7', '1', '4 2 1 1 1'],
        ['2', '4', '2', '2', '2 1 1 1'],
        ['3', '2', '1', '1', '1 1 1'],
        ['4', '1', '1', 'nothing (equal)', '1'],
        ['end', '—', '—', '—', 'size 1 → return 1']
      ] },
      complexity: `<p>Time O(n log n): n initial pushes plus at most n smashes of 2 pops and 1 push on a heap of at most n stones. Space O(n). The re-sorting brute force is O(n² log n).</p>`,
      followUps: ['Build the heap in O(n) with heapify instead of n pushes. Does the total complexity change?', 'Return the number of smashes performed.', 'Stones can weigh up to 10<sup>18</sup>: switch to BigInt. Which parts of the code must change (the comparator, the subtraction literals, the empty-case return)?']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push({
    q: `What does <code>[10, 1, 2].sort()</code> return?`,
    options: [`<code>[1, 10, 2]</code>`, `<code>[1, 2, 10]</code>`, `<code>[10, 2, 1]</code>`, `It throws because no comparator was given`],
    answer: 0,
    explain: `<p>Without a comparator, <code>sort</code> turns every element into a <b>string</b> and compares them like dictionary words: <code>"1" &lt; "10" &lt; "2"</code>. For numbers always pass <code>(a, b) =&gt; a - b</code>.</p>`
  });
  quiz.push({
    q: `<pre>const a = [1, 2, 3, 4];
const r = a.splice(1, 2);</pre>What are <code>r</code> and <code>a</code> afterwards?`,
    options: [`<code>r = [2, 3]</code>, <code>a = [1, 4]</code>`, `<code>r = [2]</code>, <code>a = [1, 2, 3, 4]</code>`, `<code>r = [1, 4]</code>, <code>a = [2, 3]</code>`, `<code>r = [2, 3]</code>, <code>a = [1, 2, 3, 4]</code>`],
    answer: 0,
    explain: `<p><code>splice(start, deleteCount)</code> <b>cuts out</b> 2 items starting at index 1 and returns them. It changes the original array. <code>slice(1, 3)</code> would have returned <code>[2, 3]</code> and left <code>a</code> untouched.</p>`
  });
  quiz.push({
    q: `<pre>function f(x = 5) { return x; }
console.log(f(null), f(undefined), f());</pre>What is printed?`,
    options: [`<code>null 5 5</code>`, `<code>5 5 5</code>`, `<code>null undefined 5</code>`, `<code>5 undefined 5</code>`],
    answer: 0,
    explain: `<p>A default kicks in <b>only</b> when the argument is <code>undefined</code> (passed or missing). <code>null</code> is a real value, so it is kept.</p>`
  });
  quiz.push({
    q: `<pre>const a = { user: { name: 'Asha' } };
const b = { ...a };
b.user.name = 'Ravi';
console.log(a.user.name);</pre>`,
    options: [`<code>'Ravi'</code>`, `<code>'Asha'</code>`, `<code>undefined</code>`, `TypeError`],
    answer: 0,
    explain: `<p>Spread makes a <b>shallow</b> copy: <code>b</code> is a new outer object, but <code>b.user</code> and <code>a.user</code> point to the <b>same</b> inner object. Changing it through one name is visible through the other. Use <code>structuredClone(a)</code> for a deep copy.</p>`
  });
  quiz.push({
    q: `What does <code>JSON.stringify({ a: undefined, b: () =&gt; 1, c: NaN, d: [undefined] })</code> return?`,
    options: [`<code>'{"c":null,"d":[null]}'</code>`, `<code>'{"a":null,"b":null,"c":null,"d":[null]}'</code>`, `<code>'{"c":NaN,"d":[]}'</code>`, `It throws a TypeError`],
    answer: 0,
    explain: `<p>Inside an <b>object</b>, keys whose value is <code>undefined</code>, a function or a symbol are skipped. Inside an <b>array</b>, those become <code>null</code> (to keep positions). <code>NaN</code> and <code>Infinity</code> always become <code>null</code>.</p>`
  });
  quiz.push({
    q: `What does <code>['1', '2', '3'].map(parseInt)</code> return?`,
    options: [`<code>[1, NaN, NaN]</code>`, `<code>[1, 2, 3]</code>`, `<code>['1', '2', '3']</code>`, `<code>[NaN, NaN, NaN]</code>`],
    answer: 0,
    explain: `<p><code>map</code> calls the callback with <code>(element, index, array)</code>, so the calls are <code>parseInt('1', 0)</code> → 1 (radix 0 means "guess", base 10), <code>parseInt('2', 1)</code> → NaN (radix 1 is invalid), <code>parseInt('3', 2)</code> → NaN ('3' is not a binary digit). Fix: <code>.map(Number)</code> or <code>.map(s =&gt; parseInt(s, 10))</code>.</p>`
  });
  quiz.push({
    q: `<pre>const [a, , b = 10, ...rest] = [1, 2];</pre>What are <code>a</code>, <code>b</code> and <code>rest</code>?`,
    options: [`<code>1</code>, <code>10</code>, <code>[]</code>`, `<code>1</code>, <code>2</code>, <code>[]</code>`, `<code>1</code>, <code>undefined</code>, <code>undefined</code>`, `<code>1</code>, <code>10</code>, <code>undefined</code>`],
    answer: 0,
    explain: `<p>The empty slot skips index 1. Index 2 does not exist (<code>undefined</code>), so the default <code>10</code> is used. A rest element always produces an array, possibly empty.</p>`
  });
  quiz.push({
    q: `<pre>console.log(add(2, 3));
const add = function (a, b) { return a + b; };</pre>What happens?`,
    options: [`<code>ReferenceError</code>: cannot access 'add' before initialization`, `Prints <code>5</code>`, `<code>TypeError</code>: add is not a function`, `Prints <code>undefined</code>`],
    answer: 0,
    explain: `<p>Only function <b>declarations</b> are fully hoisted. Here <code>add</code> is a <code>const</code> holding a function expression, and it is in the temporal dead zone until its line runs. (With <code>var</code> you would get <code>TypeError: add is not a function</code>, because the variable exists but is <code>undefined</code>.)</p>`
  });
  quiz.push({
    q: `Which statement about arrow functions is <b>true</b>?`,
    options: [`They have no own <code>this</code> or <code>arguments</code> and cannot be called with <code>new</code>`, `They are hoisted like function declarations`, `They always need a <code>return</code> keyword`, `They get a fresh <code>this</code> on every call, set to the caller`],
    answer: 0,
    explain: `<p>Arrows borrow <code>this</code> and <code>arguments</code> from the surrounding code, have no <code>prototype</code>, and throw if you use <code>new</code>. A concise body (<code>x =&gt; x * 2</code>) returns automatically.</p>`
  });
  quiz.push({
    q: `What is <code>Object.keys({ b: 1, 2: 1, a: 1, 1: 1 })</code>?`,
    options: [`<code>['1', '2', 'b', 'a']</code>`, `<code>['b', '2', 'a', '1']</code>`, `<code>['a', 'b', '1', '2']</code>`, `The order is random`],
    answer: 0,
    explain: `<p>Own keys are listed in a fixed order: integer-like keys first in ascending numeric order, then string keys in insertion order (then symbols, which <code>Object.keys</code> leaves out). Keys are always strings.</p>`
  });
  quiz.push({
    q: `<pre>function f(a, b = 2, ...c) {}
console.log(f.length);</pre>`,
    options: [`<code>1</code>`, `<code>2</code>`, `<code>3</code>`, `<code>0</code>`],
    answer: 0,
    explain: `<p><code>length</code> counts the parameters <b>before</b> the first one with a default or the rest parameter. Only <code>a</code> counts.</p>`
  });
  quiz.push({
    q: `What does <code>[].reduce((acc, x) =&gt; acc + x)</code> do?`,
    options: [`Throws <code>TypeError: Reduce of empty array with no initial value</code>`, `Returns <code>0</code>`, `Returns <code>undefined</code>`, `Returns <code>NaN</code>`],
    answer: 0,
    explain: `<p>With no initial value, reduce uses the first element as the starting accumulator. An empty array has none, so it throws. Passing an initial value (<code>reduce(fn, 0)</code>) makes it safe and returns <code>0</code>.</p>`
  });
  quiz.push({
    q: `<pre>const nums = [3, 1, 2];
const sorted = nums.toSorted((a, b) =&gt; a - b);
console.log(nums, sorted);</pre>`,
    options: [`<code>[3, 1, 2] [1, 2, 3]</code>`, `<code>[1, 2, 3] [1, 2, 3]</code>`, `<code>[3, 1, 2] undefined</code>`, `TypeError: toSorted is not a function (in all modern engines)`],
    answer: 0,
    explain: `<p><code>toSorted</code> (ES2023, in every current browser and Node 20+) returns a <b>new</b> sorted array and leaves the original alone. Its siblings are <code>toReversed</code>, <code>toSpliced</code> and <code>with(index, value)</code>.</p>`
  });
  quiz.push({
    q: `<pre>const users = [{ id: 1 }, { id: 2 }];
console.log(users.find(u =&gt; u.id === 3), users.findIndex(u =&gt; u.id === 3));</pre>`,
    options: [`<code>undefined -1</code>`, `<code>null -1</code>`, `<code>[] -1</code>`, `<code>undefined undefined</code>`],
    answer: 0,
    explain: `<p><code>find</code> returns the first matching <b>element</b> or <code>undefined</code>; <code>findIndex</code> returns its <b>index</b> or <code>-1</code>. <code>filter</code> would return an empty array.</p>`
  });


  /* ================= INTERVIEW ================= */
  interview.push({
    q: `What is the difference between a function declaration, a function expression and an arrow function?`, level: 'B',
    a: `<p>A <b>declaration</b> (<code>function add(a, b) {}</code>) is a statement; it is hoisted completely, so you can call it above the line where it is written. A <b>function expression</b> (<code>const add = function (a, b) {}</code>) is a value assigned to a variable; it exists only after that line runs. An <b>arrow function</b> (<code>const add = (a, b) =&gt; a + b</code>) is a shorter expression that has <b>no own</b> <code>this</code>, <code>arguments</code>, <code>super</code> or <code>prototype</code>, and cannot be used with <code>new</code>. Rule of thumb: arrows for short callbacks and when you want the outer <code>this</code>; declarations for named top-level helpers; regular functions for object methods that use <code>this</code>.</p>`,
    followUps: [`Why might a named function expression help in stack traces?`, `What happens if you call an arrow function with <code>new</code>?`, `Can an arrow function return an object literal in a concise body? How?`]
  });
  interview.push({
    q: `Is JavaScript pass-by-value or pass-by-reference?`, level: 'B',
    a: `<p>Always <b>pass-by-value</b>, but for objects the value being copied is a <b>reference</b> (an address). This is often called "call by sharing". So inside a function you can <b>mutate</b> the object the caller passed (<code>obj.x = 1</code> is seen outside), but <b>reassigning</b> the parameter (<code>obj = {}</code>) only changes the local copy of the address and the caller never sees it. Primitives (numbers, strings, booleans, null, undefined, symbols, bigints) are copied and immutable, so nothing the function does can change the caller's variable.</p>`,
    followUps: [`Write a swap function — why can't it swap two caller variables?`, `How do you protect an argument from being mutated?`, `Is a string passed by reference internally? Does it matter?`]
  });
  interview.push({
    q: `Explain <code>slice</code> vs <code>splice</code>.`, level: 'B',
    a: `<p><code>slice(start, end)</code> <b>copies</b> a piece of the array (end not included) and returns a new array; the original is untouched. Negative indexes count from the end, and <code>slice()</code> with no arguments is a quick shallow copy. <code>splice(start, deleteCount, ...items)</code> <b>edits the array in place</b>: it removes <code>deleteCount</code> items, inserts the new items, and returns an array of what it removed. Memory trick: <i>splice has a "p" for "patch the original"</i>. In React or Redux code prefer <code>slice</code>, spread or the ES2023 non-mutating <code>toSpliced</code>.</p>`,
    followUps: [`How do you insert an item at index 2 without removing anything?`, `What does <code>arr.splice(-1)</code> do?`, `How would you remove an item immutably?`]
  });
  interview.push({
    q: `When would you use <code>map</code> vs <code>forEach</code> vs a <code>for...of</code> loop?`, level: 'B',
    a: `<p><code>map</code> <b>returns a new array</b> of the same length, one output per input — use it to <b>transform</b>. <code>forEach</code> returns <code>undefined</code> and is only for side effects (logging, pushing elsewhere); you cannot <code>break</code> out of it and it ignores returned promises, so <code>await</code> inside it does not wait. <code>for...of</code> is a plain loop: you can <code>break</code>, <code>continue</code>, <code>return</code> and <code>await</code> one item at a time. A common smell is using <code>map</code> for side effects and throwing the result away — use <code>forEach</code> or <code>for...of</code> instead.</p>`,
    followUps: [`How do you run async work for each item in parallel? In sequence?`, `How do you stop early with array methods? (some/every/find)`, `What do map and forEach do with holes in sparse arrays?`]
  });
  interview.push({
    q: `Explain how <code>reduce</code> works and when you should NOT use it.`, level: 'I',
    a: `<p><code>reduce(callback, initial)</code> walks the array left to right carrying an <b>accumulator</b>. Each call gets <code>(acc, item, index, array)</code> and returns the next accumulator; the final one is the result. Always pass an initial value: without one, the first element becomes the accumulator and an empty array throws a <code>TypeError</code>. Use it to fold a list into one thing (sum, max, a lookup object, a count map). Avoid it when a clearer method exists (<code>map</code>, <code>filter</code>, <code>some</code>, <code>Object.groupBy</code>, a <code>for</code> loop), and avoid the trap <code>reduce((acc, x) =&gt; ({ ...acc, [x.id]: x }), {})</code>: copying the accumulator on every step makes it O(n²). Mutate the accumulator you created yourself, or use a <code>Map</code>.</p>`,
    followUps: [`Implement <code>map</code> using only <code>reduce</code>.`, `What is <code>reduceRight</code> good for?`, `Why is spreading the accumulator quadratic?`]
  });
  interview.push({
    q: `Why does <code>[10, 1, 2].sort()</code> give <code>[1, 10, 2]</code>? How does sort really work?`, level: 'I',
    a: `<p>With no comparator, elements are converted to strings and compared by UTF-16 code units, so "10" comes before "2". Pass a comparator that returns a negative number if <code>a</code> goes first, positive if <code>b</code> goes first, zero if equal: <code>(a, b) =&gt; a - b</code>. For strings use <code>a.localeCompare(b)</code> or an <code>Intl.Collator</code>. <code>sort</code> mutates and returns the same array; <code>toSorted</code> returns a copy. Since ES2019 sort must be <b>stable</b> (equal items keep their order), which lets you sort by a secondary key first and then by the primary key. V8 uses TimSort: O(n log n) worst case, close to O(n) on nearly-sorted data. <code>undefined</code> values always go to the end, and the comparator is never called with them.</p>`,
    followUps: [`Sort users by age, then by name for ties, in one comparator.`, `Why is <code>() =&gt; Math.random() - 0.5</code> a bad shuffle?`, `What happens if your comparator returns a boolean?`]
  });
  interview.push({
    q: `What is the difference between a shallow copy and a deep copy? Which tools give you each?`, level: 'I',
    a: `<p>A <b>shallow copy</b> creates a new outer object or array, but nested objects are still <b>shared</b>. <code>{ ...obj }</code>, <code>Object.assign({}, obj)</code>, <code>[...arr]</code>, <code>arr.slice()</code> and <code>Array.from(arr)</code> are all shallow. A <b>deep copy</b> also copies every nested level. <code>structuredClone(value)</code> (built in to browsers and Node 17+) is the modern choice: it handles Dates, Maps, Sets, typed arrays and even cycles, but throws on functions and DOM nodes, and drops class prototypes. <code>JSON.parse(JSON.stringify(x))</code> is the old trick and loses <code>undefined</code>, functions, Dates (become strings), Maps/Sets (become <code>{}</code>), NaN/Infinity (become <code>null</code>) and throws on cycles and BigInt.</p>`,
    followUps: [`Write a small recursive deep clone that handles cycles.`, `Why might you prefer immutable updates over deep cloning in React state?`, `Does <code>Object.freeze</code> make a deep-frozen object?`]
  });
  interview.push({
    q: `Rest vs spread — they use the same <code>...</code> syntax. How do you tell them apart?`, level: 'B',
    a: `<p>Look at <b>which side</b> it is on. <b>Rest</b> appears where values are being <b>received</b> — in a parameter list (<code>function f(...args)</code>) or on the left of a destructuring (<code>const [first, ...others] = arr</code>) — and it <b>gathers</b> the leftover items into a real array (or object). <b>Spread</b> appears where values are being <b>supplied</b> — in a call (<code>Math.max(...nums)</code>), an array literal (<code>[...a, ...b]</code>) or an object literal (<code>{ ...defaults, ...opts }</code>) — and it <b>expands</b> them. Rest must be the last element. Object spread copies own enumerable properties and later keys win; array spread works on any iterable (strings, Sets, Maps).</p>`,
    followUps: [`Why is <code>...args</code> better than <code>arguments</code>?`, `Can spreading a huge array into <code>Math.max</code> fail?`, `What does <code>{ ...null }</code> give? <code>[...null]</code>?`]
  });
  interview.push({
    q: `How do default parameters behave? Any surprising details?`, level: 'I',
    a: `<p>A default is used only when the argument is <code>undefined</code>, not for <code>null</code>, <code>0</code> or <code>''</code>. The default expression is <b>evaluated at call time, every call</b>, so <code>function f(list = [])</code> gets a fresh array each time (unlike Python's shared default). Later parameters can use earlier ones (<code>function f(a, b = a * 2)</code>), but not the other way round — that hits the temporal dead zone. Defaults also work inside destructuring: <code>function f({ retries = 3, timeout = 1000 } = {})</code> is the standard "options object" pattern, and the trailing <code>= {}</code> keeps <code>f()</code> from throwing. Defaults reduce <code>f.length</code>.</p>`,
    followUps: [`Rewrite a function that uses <code>x = x || 10</code> correctly. What bug did the old version have?`, `Can a default call another function? When does it run?`, `Why add <code>= {}</code> after a destructured parameter?`]
  });
  interview.push({
    q: `What does JSON support, and what gets lost when you <code>JSON.stringify</code> a JavaScript value?`, level: 'I',
    a: `<p>JSON has only objects, arrays, strings (double quoted), finite numbers, <code>true</code>/<code>false</code> and <code>null</code>; no comments and no trailing commas. <code>JSON.stringify</code> drops <code>undefined</code>, functions and symbols in objects (they become <code>null</code> in arrays), turns <code>NaN</code>/<code>Infinity</code> into <code>null</code>, calls <code>toJSON</code> (that is how a Date becomes an ISO string), turns Maps and Sets into <code>{}</code>, and <b>throws</b> on BigInt and circular references. You can customise it with a <code>replacer</code> (function or allow-list array) and pretty-print with the <code>space</code> argument; <code>JSON.parse</code> accepts a <code>reviver</code> to rebuild Dates and other types. Always wrap <code>JSON.parse</code> of outside data in try/catch and validate the shape (e.g. with Zod).</p>`,
    followUps: [`How would you serialise and restore a Map?`, `How do you find which key causes "Converting circular structure to JSON"?`, `Why should you validate parsed JSON even when it parses?`]
  });
  interview.push({
    q: `How do you compare two objects or arrays for equality?`, level: 'I',
    a: `<p><code>===</code> (and <code>==</code>) on objects compares <b>references</b>: two different objects with the same contents are not equal. For a shallow comparison, check that both have the same number of keys and that every key's value is <code>===</code> (or <code>Object.is</code>, which treats <code>NaN</code> as equal to itself). For deep equality, recurse into nested arrays and objects, handle Dates, Maps and Sets specially, and guard against cycles with a <code>WeakMap</code> of pairs already compared. <code>JSON.stringify(a) === JSON.stringify(b)</code> is a quick hack but breaks on key order, <code>undefined</code>, NaN and non-JSON types. In tests use the framework's <code>toEqual</code>/<code>assert.deepStrictEqual</code>.</p>`,
    followUps: [`Why does React use shallow (reference) comparison for props and state?`, `How does <code>Object.is</code> differ from <code>===</code>?`, `Write <code>shallowEqual(a, b)</code>.`]
  });
  interview.push({
    q: `<code>const arr = []</code> — can you still change <code>arr</code>? What about <code>Object.freeze</code>?`, level: 'B',
    a: `<p><code>const</code> locks the <b>variable</b>, not the value. You cannot do <code>arr = [1]</code>, but you can <code>push</code>, <code>pop</code>, set <code>arr.length = 0</code> or change elements, because the array object itself is mutable. <code>Object.freeze(obj)</code> makes the object's own properties read-only and stops adding or removing keys (silently in sloppy mode, <code>TypeError</code> in strict mode/modules). But freeze is <b>shallow</b>: nested objects can still change unless you freeze them recursively. TypeScript's <code>readonly</code> and <code>as const</code> give compile-time protection with zero runtime cost.</p>`,
    followUps: [`Write a deepFreeze helper.`, `What's the difference between seal, freeze and preventExtensions?`, `Does freezing make code faster?`]
  });
  interview.push({
    q: `What are sparse arrays (holes), and how do array methods treat them?`, level: 'A',
    a: `<p>A hole is an index with <b>no property at all</b>, e.g. <code>[1, , 3]</code>, <code>new Array(3)</code>, or <code>arr[10] = x</code> on a short array. It is different from an element holding <code>undefined</code>: <code>1 in [1, , 3]</code> is false. The ES5-era methods (<code>forEach</code>, <code>map</code>, <code>filter</code>, <code>reduce</code>, <code>some</code>, <code>every</code>) <b>skip</b> holes (<code>map</code> keeps them as holes in the result), while newer ones (<code>find</code>, <code>findIndex</code>, <code>includes</code>, <code>Array.from</code>, spread, <code>for...of</code>, <code>toSorted</code>) treat them as <code>undefined</code>. <code>sort</code> moves holes to the very end, after <code>undefined</code>s. In V8, holes also switch the array to a slower "HOLEY" elements kind, so prefer <code>Array.from({ length: n }, () =&gt; 0)</code> or <code>new Array(n).fill(0)</code>.</p>`,
    followUps: [`Why does <code>new Array(3).map((_, i) =&gt; i)</code> return <code>[ &lt;3 empty items&gt; ]</code>?`, `How does <code>indexOf</code> vs <code>includes</code> treat <code>NaN</code> and holes?`, `What are V8 elements kinds?`]
  });
  interview.push({
    q: `Explain how arrays and objects are stored in memory, and how references cause "spooky" bugs.`, level: 'I',
    a: `<p>A variable holding an object or array stores a <b>reference</b> — think of it as a house address — while the object lives on the heap. Assigning (<code>const b = a</code>), passing it to a function, putting it into another array, or a shallow copy all copy the <b>address</b>, so several names can point to one house. Classic bugs: a default state object shared by every component instance, <code>Array(3).fill([])</code> creating three references to <b>one</b> inner array, sorting a prop array in place and changing the parent's data, or caching an object then mutating it. Fixes: create fresh objects (<code>Array.from({ length: 3 }, () =&gt; [])</code>), use non-mutating methods (<code>toSorted</code>, spread, <code>map</code>), and copy at boundaries.</p>`,
    followUps: [`Draw what happens in memory for <code>const grid = Array(3).fill([]); grid[0].push(1)</code>.`, `When is an object eligible for garbage collection?`, `How do WeakMap keys relate to references and GC?`]
  });
  interview.push({
    q: `Is chaining <code>filter().map().reduce()</code> slow? How would you optimise a hot array pipeline?`, level: 'E',
    a: `<p>Each step allocates a new intermediate array and makes one more pass, so a three-step chain on n items is about 3n callback calls plus two temporary arrays. For a few thousand items this is negligible and the readability wins. For large data in hot paths: (1) <b>measure first</b> with a profiler; (2) fuse steps into one <code>for</code> loop or a single <code>reduce</code>; (3) stop early with <code>find</code>/<code>some</code> instead of <code>filter()[0]</code>; (4) use ES2025 <b>iterator helpers</b> (<code>arr.values().filter(f).map(g).take(10).toArray()</code>), which are lazy and avoid intermediate arrays; (5) keep arrays monomorphic (same element types, no holes) so V8 stays on its fast paths; (6) for numeric data consider typed arrays. Also avoid O(n²) patterns hidden in pipelines, such as <code>includes</code> inside <code>filter</code> — build a <code>Set</code> first.</p>`,
    followUps: [`How would you profile this in Chrome DevTools or Node?`, `What are iterator helpers and how are they lazy?`, `When is a Set lookup faster than includes, and why?`]
  });
  interview.push({
    q: `How do you group, index and count items in modern JavaScript?`, level: 'I',
    a: `<p>Before 2024 the standard tool was <code>reduce</code> into an object or <code>Map</code>: <code>acc[key] ??= []; acc[key].push(item)</code>. Now there is <b><code>Object.groupBy(items, fn)</code></b> (ES2024), which returns a null-prototype object of arrays, and <b><code>Map.groupBy</code></b> when keys are not strings (e.g. objects or numbers you want kept as numbers). For counting, a <code>Map</code> with <code>map.set(k, (map.get(k) ?? 0) + 1)</code> is clean and avoids prototype keys like <code>"constructor"</code>. For indexing by id, <code>new Map(items.map(x =&gt; [x.id, x]))</code> or <code>Object.fromEntries</code> gives O(1) lookups instead of repeated <code>find</code> calls (O(n) each).</p>`,
    followUps: [`Why does <code>Object.groupBy</code> return a null-prototype object?`, `When is a Map better than a plain object as a dictionary?`, `Convert a Map to JSON and back.`]
  });


  registerModule({
    id: 'js02',
    title: 'Functions, Arrays & Objects',
    intro: `<p>Almost every line of real JavaScript — a React component, an Express handler, a data script, a coding-round answer — is made of three building blocks: <b>functions</b> (little machines that take input and give output), <b>arrays</b> (ordered lists) and <b>objects</b> (labelled boxes of data). This module teaches all three from zero, with an analogy first and an animation for every idea.</p>
<p>You will write functions three ways and learn when each fits; master default and rest parameters; use the core array methods (<code>push</code>, <code>slice</code>, <code>splice</code>, <code>map</code>, <code>filter</code>, <code>reduce</code>, <code>find</code>, <code>sort</code>) and watch them flow through pipelines step by step; see how objects live behind <b>references</b> (the root of the most common JS bugs); unpack data with <b>destructuring</b>, copy it with <b>spread</b>, and send it over the wire with <b>JSON</b>.</p>
<p>Interviewers love this material: "predict the output" puzzles, polyfills for <code>map</code>/<code>reduce</code>, deep clone, flatten and <code>get(obj, 'a.b.c')</code> are standard screening questions. Every topic ends with how AI coding tools change the work — and the subtle bugs they still produce here.</p>`,
    goals: [
      `Write function declarations, expressions and arrow functions, and explain hoisting, <code>this</code> and <code>arguments</code> differences between them.`,
      `Use default parameters, rest parameters and the "options object" pattern correctly, and explain why JavaScript passes object references by value.`,
      `Choose the right array method — <code>push/pop/shift/unshift</code>, <code>slice</code> vs <code>splice</code>, <code>map</code>, <code>filter</code>, <code>find</code>, <code>some/every</code>, <code>reduce</code> — and predict both its return value and whether it mutates.`,
      `Sort numbers, strings and objects with correct, stable comparators, and use the ES2023 non-mutating methods (<code>toSorted</code>, <code>toSpliced</code>, <code>with</code>).`,
      `Create, read, update and iterate objects; draw the reference diagram for any snippet; and make shallow vs deep copies with spread, <code>structuredClone</code> and JSON.`,
      `Destructure arrays and objects with defaults, renames and rest; serialise and parse JSON safely, knowing exactly what it loses.`,
      `Implement interview classics from scratch: map/filter/reduce polyfills, flatten, chunk, deep clone with cycles, path get/set and a mini <code>JSON.stringify</code>.`
    ],
    prereqs: `<p><b>JS 1 (JavaScript Basics: Syntax, Types &amp; Operators)</b> — you should be comfortable with <code>let</code>/<code>const</code>, primitive types, <code>typeof</code>, template literals, truthy/falsy and <code>if</code>/<code>for</code> loops. No prior knowledge of functions-as-values or array methods is assumed.</p>`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
