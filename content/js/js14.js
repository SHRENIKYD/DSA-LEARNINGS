(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (js14) ---------- */
  function cp(code, hlMap, label) {
    return { type: 'code', label: label || 'JavaScript (current line highlighted)', lang: 'js', code: code, hl: hlMap || {} };
  }
  function vp(obj, hlMap, label) {
    var vals = {};
    Object.keys(obj).forEach(function (k) { vals[k] = String(obj[k]); });
    return { type: 'vars', label: label || 'Variables', vals: vals, hl: hlMap || {} };
  }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function outBox(lines) { return tx(lines.length ? '<pre>' + lines.map(esc).join('\n') + '</pre>' : '<i>(nothing printed yet)</i>', 'Console output'); }
  function items(s) { return String(s).split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x.length; }); }
  function cmds(s) { return String(s).split(';').map(function (x) { return x.trim(); }).filter(function (x) { return x.length; }); }

  /* ================= TOPIC 1: call / apply / bind polyfills ================= */
  var CALL_SRC = [
    'Function.prototype.myCall = function (ctx, ...args) {',
    '  if (typeof this !== "function") throw new TypeError("not a function");',
    '  ctx = (ctx === null || ctx === undefined) ? globalThis : Object(ctx);',
    '  const key = Symbol("fn");',
    '  ctx[key] = this;',
    '  try {',
    '    return ctx[key](...args);',
    '  } finally {',
    '    delete ctx[key];',
    '  }',
    '};'
  ].join('\n');
  var BIND_SRC = [
    'Function.prototype.myBind = function (ctx, ...preset) {',
    '  const fn = this;',
    '  function bound(...later) {',
    '    const all = [...preset, ...later];',
    '    if (new.target) return new fn(...all);',
    '    return fn.myCall(ctx, ...all);',
    '  }',
    '  if (fn.prototype) bound.prototype = fn.prototype;',
    '  return bound;',
    '};'
  ].join('\n');

  topics.push({
    title: 'Polyfills I: call, apply and bind from Scratch',
    analogy: `<p>Think of a <b>borrowed microphone</b> at a party. The song (the function) is always the same, but <i>whoever holds the mic</i> decides whose name is announced ("Hi, I am <b>this</b>!").</p>
<ul><li><b>call</b> = hand the mic to Asha <i>right now</i> and give her the lyrics one by one.</li>
<li><b>apply</b> = same, but you give the lyrics as <b>one sheet</b> (an array).</li>
<li><b>bind</b> = <b>tape</b> the mic to Asha's hand and walk away. Whenever the song plays later, it is always Asha singing.</li></ul>
<p>The polyfill trick is literally that: <b>stick the function onto the object for a moment</b>, call it as <code>obj.fn()</code> so <code>this</code> becomes <code>obj</code>, then take it back off.</p>`,
    explain: `<p>🟢 <b>What is a polyfill?</b> A <b>polyfill</b> is your own code that adds a missing built-in feature, written with only older features. In a machine-coding round "write a polyfill for X" really means: <i>prove you understand exactly how X behaves</i> — the normal path <b>and</b> the edge cases.</p>
<p>🔵 <b>The one idea behind call.</b> In JavaScript, <code>this</code> is decided by <i>how</i> a function is called. When you write <code>obj.greet()</code>, <code>this</code> is <code>obj</code> (the "implicit binding" rule from Module JS 5). So to call any function <code>fn</code> with <code>this = ctx</code>, we:</p>
<ol><li>Put the function on the object under a key that cannot clash: <code>ctx[key] = fn</code> (a <code>Symbol</code> is perfect — it is unique).</li>
<li>Call it as a method: <code>ctx[key](...args)</code> → now <code>this === ctx</code>.</li>
<li>Remove the key again (in <code>finally</code>, so it is cleaned up even if the function throws).</li></ol>
${H.table(['Method', 'Runs now?', 'How arguments are passed', 'Returns'], [['<code>fn.call(ctx, a, b)</code>', H.c('g', 'yes'), 'one by one', 'fn\'s return value'], ['<code>fn.apply(ctx, [a, b])</code>', H.c('g', 'yes'), 'as one array (or array-like)', 'fn\'s return value'], ['<code>fn.bind(ctx, a)</code>', H.c('r', 'no'), 'some now (preset), rest later', 'a <b>new function</b>']])}
<p><b>apply</b> is just call with the array spread out. <b>bind</b> is a <i>closure</i>: it remembers <code>fn</code>, <code>ctx</code> and the preset arguments, and returns a new function that calls <code>fn</code> later with all of them joined: <code>[...preset, ...later]</code>.</p>
<p>🔵 <b>The edge cases interviewers check</b> (say them out loud — they score points):</p>
<ul><li><code>ctx</code> is <code>null</code>/<code>undefined</code> → use <code>globalThis</code> (sloppy-mode behaviour).</li>
<li><code>ctx</code> is a primitive like <code>5</code> or <code>'hi'</code> → box it with <code>Object(ctx)</code> so we can attach a property.</li>
<li>The object may already have a property called <code>fn</code> → use a <code>Symbol</code> key so we never overwrite it.</li>
<li><code>bind</code> + <code>new</code>: <code>new Bound()</code> must <b>ignore</b> the bound <code>this</code> and build a fresh object. Detect it with <code>new.target</code>.</li>
<li>Calling the polyfill on something that is not a function → throw a <code>TypeError</code>.</li></ul>`,
    clues: ['"Write a polyfill for Function.prototype.bind / call / apply" → attach-as-method trick + closure', '"Without using the built-in call/apply/bind" → Symbol key on the context object', '"Should support partial application" → bind must merge preset and later args', '"What if the bound function is used with new?" → check <code>new.target</code>, ignore bound this', '"Borrow a method from another object" (e.g. <code>Array.prototype.slice.call(arguments)</code>) → call/apply', '"Fix the lost this in a setTimeout / event callback" → bind (or an arrow function)'],
    code: [{ lang: 'js', run: true, title: 'call, apply and bind polyfills + tests (runnable)', code: `
// ---------- myCall ----------
Function.prototype.myCall = function (ctx, ...args) {
  if (typeof this !== 'function') throw new TypeError('myCall: not a function');
  // null / undefined -> global object; primitives (5, 'hi') -> boxed objects
  ctx = (ctx === null || ctx === undefined) ? globalThis : Object(ctx);
  const key = Symbol('fn');      // unique key: can never overwrite a real property
  ctx[key] = this;               // 'this' here is the function we were called on
  try {
    return ctx[key](...args);    // called as a method -> inside fn, this === ctx
  } finally {
    delete ctx[key];             // always clean up, even if fn throws
  }
};

// ---------- myApply: same as call, args come as one array-like ----------
Function.prototype.myApply = function (ctx, argList) {
  const args = (argList === null || argList === undefined) ? [] : Array.from(argList);
  return this.myCall(ctx, ...args);
};

// ---------- myBind: returns a NEW function (closure) ----------
Function.prototype.myBind = function (ctx, ...preset) {
  const fn = this;
  if (typeof fn !== 'function') throw new TypeError('myBind: not a function');
  function bound(...later) {
    const all = [...preset, ...later];      // partial application: preset first
    if (new.target) return new fn(...all);  // used with new -> ignore ctx
    return fn.myCall(ctx, ...all);
  }
  if (fn.prototype) bound.prototype = fn.prototype; // so instanceof keeps working
  return bound;
};

// ---------- tests ----------
function greet(greeting, mark) { return greeting + ', ' + this.name + mark; }
const asha = { name: 'Asha', fn: 'my own fn prop' };

console.log(greet.myCall(asha, 'Hi', '!'));        // Hi, Asha!
console.log(greet.myApply(asha, ['Hello', '?']));   // Hello, Asha?
console.log(asha.fn);                               // untouched: my own fn prop

const hiAsha = greet.myBind(asha, 'Hey');          // preset 'Hey'
console.log(hiAsha('...'));                         // Hey, Asha...

function Point(x, y) { this.x = x; this.y = y; }
const PointAt10 = Point.myBind({ ignored: true }, 10);
const p = new PointAt10(20);
console.log(p.x, p.y, p instanceof Point);          // 10 20 true

console.log(Math.max.myApply(null, [3, 9, 4]));     // 9
console.log(function () { return typeof this; }.myCall(5)); // object (boxed Number)
` }],
    codeTitle: ['call / apply / bind polyfills'],
    viz: [{
      title: 'myCall step by step: the borrowed-method trick',
      input: 'Asha | Hi, !',
      inputLabel: 'context name | args (comma separated)',
      gen: function (input) {
        var parts = String(input).split('|');
        var name = (parts[0] || '').trim();
        if (!name) throw new Error('Format: name | arg1, arg2  e.g. Asha | Hi, !');
        if (name.length > 12) throw new Error('Keep the name under 12 characters');
        var args = items(parts[1] || '').slice(0, 4);
        var argStr = args.map(function (a) { return "'" + a + "'"; }).join(', ');
        var f = [];
        var objBefore = [['name', "'" + name + "'"]];
        var call = "greet.myCall(user, " + argStr + ")";
        f.push(fr('We call <code>' + esc(call) + '</code>. Inside <code>myCall</code>, <b>this</b> is the function <code>greet</code> (because myCall was called as <code>greet.myCall</code>), and <code>ctx</code> is the <code>user</code> object.', [cp(CALL_SRC, { 1: 'cur' }), vp({ 'this': 'greet()', ctx: 'user', args: '[' + argStr + ']' }, { 'this': 'cur' }), { type: 'map', label: 'user object', entries: objBefore }]));
        f.push(fr('Guard: <code>this</code> really is a function, so no TypeError.', [cp(CALL_SRC, { 2: 'ok' }), vp({ 'typeof this': 'function' }, { 'typeof this': 'ok' })]));
        f.push(fr('<code>ctx</code> is a real object (not null/undefined, not a primitive), so <code>Object(ctx)</code> returns the same object. With <code>null</code> we would use <code>globalThis</code>; with <code>5</code> we would get a boxed Number.', [cp(CALL_SRC, { 3: 'cur' }), vp({ ctx: 'user (unchanged)' })]));
        f.push(fr('Make a brand-new <b>Symbol</b> key. No other property in the world can have this key, so we cannot overwrite something the user already had (like a property called <code>fn</code>).', [cp(CALL_SRC, { 4: 'cur' }), vp({ key: 'Symbol(fn)' }, { key: 'ok' })]));
        f.push(fr('Attach the function to the object for a moment: <code>user[Symbol(fn)] = greet</code>.', [cp(CALL_SRC, { 5: 'cur' }), { type: 'map', label: 'user object', entries: objBefore.concat([['Symbol(fn)', 'greet']]), hl: { 'Symbol(fn)': 'ok' } }]));
        f.push(fr('Call it <b>as a method</b>: <code>user[key](' + esc(argStr) + ')</code>. The implicit-binding rule says "the object before the dot / bracket is <b>this</b>" → inside greet, <code>this === user</code>.', [cp(CALL_SRC, { 7: 'cur' }), { type: 'stack', label: 'Call stack', items: ['main', 'myCall', 'greet (this = user)'], hl: { 2: 'cur' } }, vp({ 'this.name': "'" + name + "'" }, { 'this.name': 'sel' }, 'Inside greet')]));
        var result = (args[0] || 'undefined') + ', ' + name + (args[1] || 'undefined');
        f.push(fr('greet returns <code>' + esc(result) + '</code>. Before the value leaves myCall, the <code>finally</code> block runs.', [cp(CALL_SRC, { 7: 'ok', 9: 'cur' }), vp({ returnValue: "'" + result + "'" }, { returnValue: 'sel' })]));
        f.push(fr('Cleanup: <code>delete ctx[key]</code>. The object looks exactly like before — the caller never sees our temporary property.', [cp(CALL_SRC, { 9: 'ok' }), { type: 'map', label: 'user object', entries: objBefore.concat([['Symbol(fn)', 'deleted']]), hl: { 'Symbol(fn)': 'bad' } }]));
        f.push(fr('Done. <b>apply</b> is the same with the args given as one array; <b>bind</b> wraps all this inside a closure and runs it later.', [outBox([result]), { type: 'map', label: 'user object (final)', entries: objBefore }]));
        return f;
      }
    }, {
      title: 'myBind: preset args, later args, and new',
      input: '10 | 20',
      inputLabel: 'preset arg | later arg',
      gen: function (input) {
        var parts = String(input).split('|');
        var a = (parts[0] || '').trim(), b = (parts[1] || '').trim();
        if (!a || !b) throw new Error('Format: preset | later   e.g. 10 | 20');
        var f = [];
        f.push(fr('<code>const Bound = Point.myBind(obj, ' + esc(a) + ')</code>. Nothing runs yet! myBind only <b>remembers</b> fn, ctx and preset in a closure.', [cp(BIND_SRC, { 1: 'cur', 2: 'cur' }), vp({ fn: 'Point', ctx: 'obj', preset: '[' + a + ']' }, { preset: 'ok' }, 'Closure (remembered)')]));
        f.push(fr('It creates the inner function <code>bound</code> and copies <code>fn.prototype</code> so <code>instanceof Point</code> keeps working for objects built with <code>new Bound()</code>.', [cp(BIND_SRC, { 3: 'cur', 8: 'cur', 9: 'ok' }), vp({ 'bound.prototype': 'Point.prototype' })]));
        f.push(fr('Normal call later: <code>Bound(' + esc(b) + ')</code>. Arguments are glued: preset first, then later → <code>[' + esc(a) + ', ' + esc(b) + ']</code>.', [cp(BIND_SRC, { 4: 'cur' }), { type: 'array', label: 'all args', values: [a, b], hl: { 0: 'sel', 1: 'ok' }, idxLabels: ['preset', 'later'] }]));
        f.push(fr('<code>new.target</code> is <code>undefined</code> for a normal call, so we use <code>fn.myCall(ctx, ...all)</code> → <code>this === obj</code>.', [cp(BIND_SRC, { 5: 'done', 6: 'cur' }), vp({ 'new.target': 'undefined', 'this inside Point': 'obj' }, { 'this inside Point': 'sel' })]));
        f.push(fr('Now with <code>new Bound(' + esc(b) + ')</code>: <code>new.target</code> is set, so we <b>ignore ctx</b> and run <code>new fn(' + esc(a) + ', ' + esc(b) + ')</code>. A fresh object is built — that is what native bind does too.', [cp(BIND_SRC, { 5: 'cur' }), vp({ 'new.target': 'bound', 'this inside Point': 'fresh {}' }, { 'new.target': 'cur' })]));
        f.push(fr('Result: <code>{ x: ' + esc(a) + ', y: ' + esc(b) + ' }</code>, and <code>p instanceof Point</code> is <b>true</b>.', [{ type: 'map', label: 'p', entries: [['x', a], ['y', b]] }, outBox(['p instanceof Point → true'])]));
        return f;
      }
    }],
    examples: [
      { title: 'Borrowing an array method for array-like objects', html: `<p><code>arguments</code> and DOM NodeLists look like arrays (they have indexes and <code>length</code>) but have no <code>map</code>. With <b>call</b> you can borrow the method: inside <code>map</code>, <code>this</code> becomes the array-like.</p>`, code: { lang: 'js', run: true, code: `
function demo() {
  // 'arguments' has no .map, but Array.prototype.map works on any array-like
  return Array.prototype.map.call(arguments, (x) => x * 10);
}
console.log(demo(1, 2, 3)); // [10, 20, 30]

const arrayLike = { 0: 'a', 1: 'b', length: 2 };
console.log(Array.prototype.join.call(arrayLike, '-')); // a-b
` } },
      { title: 'Fixing the lost-this bug with bind', html: `<p>Passing <code>obj.method</code> as a callback detaches it from <code>obj</code>, so <code>this</code> is lost (undefined in strict mode / modules). <code>bind</code> tapes <code>this</code> on permanently.</p>`, code: { lang: 'js', run: true, code: `
'use strict';
const counter = {
  count: 0,
  inc() { this.count++; return this.count; }
};
const loose = counter.inc;           // detached: this is undefined when called plainly
try { loose(); } catch (e) { console.log('Error:', e.constructor.name); } // TypeError

const fixed = counter.inc.bind(counter);
fixed(); fixed();
console.log(counter.count); // 2
` } },
      { title: 'Bind is permanent: re-binding does not work', html: `<p>Once bound, <code>this</code> cannot be changed by <code>call</code>, <code>apply</code> or another <code>bind</code>. Our polyfill behaves the same, because the closure always uses its stored <code>ctx</code>. Only <code>new</code> overrides it.</p>`, code: { lang: 'js', run: true, code: `
function who() { return this.name; }
const a = who.bind({ name: 'A' });
const b = a.bind({ name: 'B' });   // tries to re-bind
console.log(a.call({ name: 'C' })); // A
console.log(b());                   // A  (first bind wins forever)
` } },
      { title: 'apply for "spread before spread existed"', html: `<p>Old code used <code>apply</code> to pass an array as separate arguments: <code>Math.max.apply(null, nums)</code>. Today <code>Math.max(...nums)</code> does the same. Both can hit the engine's max-argument limit (often around 65 k–500 k args) for huge arrays — use a loop or <code>reduce</code> for millions of items.</p>`, code: { lang: 'js', run: true, code: `
const nums = [4, 17, 9, 2];
console.log(Math.max.apply(null, nums)); // 17 (old style)
console.log(Math.max(...nums));          // 17 (modern)
console.log(nums.reduce((m, x) => (x > m ? x : m), -Infinity)); // 17 (safe for huge arrays)
` } }
    ],
    deepDive: `<p>🟣 <b>Where our polyfill differs from the real thing</b> (great to mention — shows maturity):</p>
<ul><li><b>Strict mode and primitives:</b> native <code>fn.call(5)</code> in a strict function gives <code>this === 5</code> (a primitive). Our version boxes it (<code>Object(5)</code>), because you cannot attach a property to a primitive. With <code>null</code> in strict mode native call keeps <code>this === null</code>; we substitute <code>globalThis</code>.</li>
<li><b>Frozen / sealed / non-extensible objects:</b> <code>Object.freeze(obj)</code> then <code>ctx[key] = fn</code> silently fails (or throws in strict mode). A more robust polyfill falls back to <code>Reflect.apply(fn, ctx, args)</code> — which is really just the native mechanism.</li>
<li><b>Proxies</b> can observe the temporary property (a <code>set</code>/<code>deleteProperty</code> trap fires). Native call is invisible.</li>
<li><b>Bound function metadata:</b> native bound functions have <code>name</code> = <code>"bound greet"</code>, <code>length</code> = <code>max(0, fn.length - preset.length)</code>, and <b>no</b> <code>prototype</code> property. You can mimic with <code>Object.defineProperty(bound, 'name', { value: 'bound ' + fn.name })</code> and the same for <code>length</code>.</li>
<li><b>Classes:</b> <code>new fn(...all)</code> works for classes too; but calling a bound class <i>without</i> new must throw — our <code>myCall</code> path throws "Class constructor cannot be invoked without new", which matches.</li>
<li><b>Arrow functions ignore all of this.</b> They have lexical <code>this</code>; <code>call/apply/bind</code> can pass args but never change their <code>this</code>.</li></ul>
<p><b>Performance:</b> adding and deleting a property changes the object's hidden class (Module JS 12), which can deoptimise hot code. Never use these polyfills in production — they are interview tools. Real engines implement call/apply/bind natively with no property juggling.</p>
<p><b>Old-school ES5 bind polyfill</b> (MDN classic) used an empty function <code>fNOP</code> and <code>this instanceof fNOP</code> to detect <code>new</code>, because <code>new.target</code> did not exist yet. Mention it if asked "how would you do it without ES6?"</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> any assistant can spit out a bind polyfill in two seconds, so interviewers no longer grade "can you type it" — they grade <b>whether you know the edge cases</b> (new, primitives, symbol keys, frozen objects) and whether you can <b>explain each line</b>. Expect the follow-up "now support <code>new</code>" live.</p>
<p><b>Use AI as a partner:</b> ask <code>Write 10 tricky tests for a Function.prototype.bind polyfill — include new, classes, re-binding, length, name. Don't write the polyfill.</code> Then run your own polyfill against them.</p>
<p><b>Where AI goes wrong:</b> it often uses a string key like <code>ctx.fn = this</code> (overwrites real props), forgets <code>finally</code> cleanup, uses an arrow function for <code>bound</code> (breaks <code>new</code>), or claims bound functions keep a <code>prototype</code> (native ones don't).</p>
<p><b>What you must still own:</b> the four <code>this</code> rules and their priority (new &gt; explicit &gt; implicit &gt; default), and explaining calmly why the trick works.</p>`,
    problems: [{
      title: 'Implement Function.prototype.myBind (with partial args and new)', level: 'Medium', tags: ['polyfill', 'this', 'closure'], companies: ['Flipkart', 'Atlassian', 'Uber', 'Microsoft'],
      statement: `<p>Implement <code>Function.prototype.myBind(ctx, ...preset)</code> that behaves like the native <code>bind</code>: it returns a new function which, when called, runs the original with <code>this = ctx</code> and arguments <code>[...preset, ...later]</code>. When the returned function is used with <code>new</code>, the bound <code>this</code> must be ignored and a new instance created. Do not use the native <code>bind</code>.</p>`,
      constraints: `You may use <code>call</code>/<code>apply</code> or write your own. Must support any number of preset and later args. <code>instanceof</code> must work for <code>new</code>-created objects.`,
      example: `<p><code>function add(a, b, c) { return this.base + a + b + c; }</code><br><code>const f = add.myBind({ base: 100 }, 1);</code><br><code>f(2, 3)</code> → ${H.c('g', '106')} because this.base = 100, args = [1] + [2, 3].</p>`,
      brute: { why: `<p>A first attempt returns an <b>arrow function</b> that calls <code>fn.apply(ctx, args)</code>. It works for normal calls, but arrow functions <b>cannot be used with new</b> (TypeError: not a constructor) and it forgets the <b>preset</b> args. That is where the marks are lost.</p>`, code: `
Function.prototype.badBind = function (ctx) {
  const fn = this;
  // Problems: ignores preset args, and arrows can't be 'new'-ed
  return (...later) => fn.apply(ctx, later);
};
` },
      mcq: { q: 'Inside <code>bound</code>, how do you best detect that it was called with <code>new</code>?', options: ['<code>new.target</code> is defined', '<code>typeof this === "object"</code>', '<code>arguments.length &gt; 0</code>', '<code>this === ctx</code>'], answer: 0, explain: '<code>new.target</code> is set only when a function is invoked via <code>new</code>. <code>typeof this</code> is "object" for many normal calls too.' },
      hints: [`<p>Hint 1: bind does not call anything — it <b>returns a function</b>. That returned function is a closure over <code>fn</code>, <code>ctx</code> and the preset args.</p>`, `<p>Hint 2: use a <b>regular function</b> (not an arrow) for the returned function so it can be used with <code>new</code>; merge args with <code>[...preset, ...later]</code>.</p>`, `<p>Hint 3: recipe — save <code>fn = this</code>; define <code>bound(...later)</code>; if <code>new.target</code> → <code>return new fn(...all)</code>; else <code>return fn.apply(ctx, all)</code>; set <code>bound.prototype = fn.prototype</code>; return bound.</p>`],
      solution: {
        approach: `<p>Capture <code>fn</code>, <code>ctx</code>, <code>preset</code> in a closure. The returned regular function merges args and branches on <code>new.target</code>: constructor call → <code>new fn(...)</code>; normal call → <code>fn.apply(ctx, ...)</code>. Copy the prototype link so <code>instanceof</code> works.</p>`,
        code: { lang: 'js', run: true, code: `
Function.prototype.myBind = function (ctx, ...preset) {
  const fn = this;
  if (typeof fn !== 'function') throw new TypeError('myBind called on non-function');
  function bound(...later) {
    const all = [...preset, ...later];
    if (new.target) return new fn(...all);   // constructor call: ignore ctx
    return fn.apply(ctx, all);               // normal call: this = ctx
  }
  if (fn.prototype) bound.prototype = fn.prototype;
  return bound;
};

function add(a, b, c) { return this.base + a + b + c; }
const f = add.myBind({ base: 100 }, 1);
console.log(f(2, 3)); // 106

function User(name, role) { this.name = name; this.role = role; }
const Admin = User.myBind(null, 'root');
const u = new Admin('superuser');
console.log(u.name, u.role, u instanceof User); // root superuser true
` },
        dry: { head: ['step', 'call', 'new.target', 'all args', 'result'], rows: [['1', '<code>add.myBind({base:100}, 1)</code>', '—', 'preset = [1]', 'returns bound'], ['2', '<code>f(2, 3)</code>', 'undefined', '[1, 2, 3]', 'apply → 100+1+2+3 = <b>106</b>'], ['3', '<code>User.myBind(null, "root")</code>', '—', 'preset = ["root"]', 'returns Admin'], ['4', '<code>new Admin("superuser")</code>', 'Admin', '["root", "superuser"]', '<code>new User(...)</code> → instance']] },
        complexity: `<p>O(p + l) per call to copy preset and later arguments; O(p) extra memory held by the closure.</p>`,
        followUps: ['Make <code>bound.name</code> equal to <code>"bound " + fn.name</code> and <code>length</code> correct.', 'Write it in ES5 without <code>new.target</code> or spread.', 'Why can an arrow function never be a constructor?']
      }
    }]
  });

  /* ================= TOPIC 2: map / filter / reduce polyfills ================= */
  var REDUCE_SRC = [
    'Array.prototype.myReduce = function (cb, ...init) {',
    '  const O = Object(this), len = O.length >>> 0;',
    '  let i = 0, acc;',
    '  if (init.length) acc = init[0];',
    '  else {',
    '    while (i < len && !(i in O)) i++;',
    '    if (i >= len) throw new TypeError("empty array, no initial value");',
    '    acc = O[i++];',
    '  }',
    '  for (; i < len; i++) {',
    '    if (i in O) acc = cb(acc, O[i], i, O);',
    '  }',
    '  return acc;',
    '};'
  ].join('\n');
  var MAPF_SRC = [
    'Array.prototype.myMap = function (cb, thisArg) {',
    '  const O = Object(this), len = O.length >>> 0;',
    '  const out = new Array(len);',
    '  for (let i = 0; i < len; i++) {',
    '    if (i in O) out[i] = cb.call(thisArg, O[i], i, O);',
    '  }',
    '  return out;',
    '};',
    'Array.prototype.myFilter = function (cb, thisArg) {',
    '  const O = Object(this), len = O.length >>> 0, out = [];',
    '  for (let i = 0; i < len; i++) {',
    '    if (i in O && cb.call(thisArg, O[i], i, O)) out.push(O[i]);',
    '  }',
    '  return out;',
    '};'
  ].join('\n');

  function parseNums(s, max) {
    var a = String(s || '').trim().split(/[\s,]+/).filter(function (x) { return x.length; }).map(Number);
    if (a.some(isNaN)) throw new Error('Enter numbers separated by spaces, e.g. 1 2 3 4');
    if (a.length > (max || 10)) throw new Error('Use at most ' + (max || 10) + ' numbers');
    return a;
  }

  topics.push({
    title: 'Polyfills II: map, filter and reduce',
    analogy: `<p>Picture a <b>factory conveyor belt</b> carrying boxes (array items) past three workers:</p>
<ul><li><b>map</b> is the <b>painter</b>: every box goes in, every box comes out — just painted. Same number of boxes.</li>
<li><b>filter</b> is the <b>quality inspector</b>: looks at each box and only lets the good ones through. Fewer (or equal) boxes come out, unchanged.</li>
<li><b>reduce</b> is the <b>packer</b> with one big crate: he drops every box into the crate, one by one, and at the end hands you <b>one thing</b> — the filled crate (a sum, an object, a map, anything).</li></ul>
<p>Writing the polyfill means you build the conveyor belt yourself: a plain <code>for</code> loop that walks the indexes and calls the worker (callback) at each stop.</p>`,
    explain: `<p>🟢 <b>The callback contract.</b> All three methods call your function with the <b>same three arguments</b>: <code>(value, index, array)</code>. Reduce adds one in front: <code>(accumulator, value, index, array)</code>. That is why <code>['1','2','3'].map(parseInt)</code> is a famous trap (see the output bank) — <code>parseInt</code> receives the index as its radix!</p>
${H.table(['Method', 'Callback gets', 'Returns', 'Length of result'], [['<code>map</code>', '(v, i, arr)', 'new array of callback results', H.c('g', 'same as input')], ['<code>filter</code>', '(v, i, arr)', 'new array of items where callback was truthy', H.c('y', '≤ input')], ['<code>reduce</code>', '(acc, v, i, arr)', 'the final accumulator (anything)', H.c('p', 'one value')]])}
<p>🔵 <b>Reduce step by step</b> with <code>[1, 2, 3, 4].reduce((acc, x) =&gt; acc + x, 0)</code>:</p>
${H.table(['i', 'acc before', 'x', 'acc after'], [['0', '0', '1', '1'], ['1', '1', '2', '3'], ['2', '3', '3', '6'], ['3', '6', '4', H.c('g', '<b>10</b>')]])}
<p>If you do <b>not</b> pass an initial value, reduce uses the <b>first element</b> as the starting accumulator and begins from index 1. On an <b>empty array with no initial value</b> it throws <code>TypeError: Reduce of empty array with no initial value</code>.</p>
<p>🔵 <b>The spec details that separate a good polyfill from a weak one:</b></p>
<ul><li><b>Holes are skipped.</b> In a sparse array like <code>[1, , 3]</code>, index 1 does not exist. The real methods check <code>i in O</code> and do not call the callback there. <code>map</code> keeps the hole in the output.</li>
<li><b>Length is read once</b> at the start (<code>len = O.length &gt;&gt;&gt; 0</code>). Items pushed during the loop are not visited.</li>
<li><b>thisArg:</b> <code>map</code>/<code>filter</code> accept a second argument used as <code>this</code> inside a regular-function callback. So call the callback with <code>cb.call(thisArg, ...)</code>.</li>
<li><b>Detect "no initial value" correctly.</b> <code>reduce(cb, undefined)</code> is <i>different</i> from <code>reduce(cb)</code>: undefined is a real initial value. Use rest params (<code>...init</code>) or <code>arguments.length</code>, never <code>init === undefined</code>.</li>
<li><b>Validate:</b> if <code>cb</code> is not a function, throw <code>TypeError</code>.</li></ul>`,
    clues: ['"Implement Array.prototype.map / filter / reduce without using the built-ins" → plain for loop + callback contract', '"Should behave exactly like the native one" → holes (<code>i in O</code>), thisArg, length read once, TypeError on empty reduce', '"Implement map/filter using reduce" → reduce is the universal loop', '"Group by / count frequency / build an index" → reduce into an object or Map', '"Why does [\'1\',\'2\',\'3\'].map(parseInt) give [1, NaN, NaN]?" → callback receives (value, index)', '"Sum / max / flatten / compose in one pass" → reduce'],
    code: [{ lang: 'js', run: true, title: 'map, filter, reduce polyfills that follow the spec (runnable)', code: `
// ---------- myMap ----------
Array.prototype.myMap = function (cb, thisArg) {
  if (typeof cb !== 'function') throw new TypeError(cb + ' is not a function');
  const O = Object(this);          // works for array-likes too
  const len = O.length >>> 0;      // read length ONCE, force to a uint32
  const out = new Array(len);      // same length; holes stay holes
  for (let i = 0; i < len; i++) {
    if (i in O) out[i] = cb.call(thisArg, O[i], i, O); // skip holes
  }
  return out;
};

// ---------- myFilter ----------
Array.prototype.myFilter = function (cb, thisArg) {
  if (typeof cb !== 'function') throw new TypeError(cb + ' is not a function');
  const O = Object(this), len = O.length >>> 0, out = [];
  for (let i = 0; i < len; i++) {
    if (i in O) {
      const v = O[i];                       // read once (getters may have side effects)
      if (cb.call(thisArg, v, i, O)) out.push(v);
    }
  }
  return out;
};

// ---------- myReduce ----------
Array.prototype.myReduce = function (cb, ...init) {
  if (typeof cb !== 'function') throw new TypeError(cb + ' is not a function');
  const O = Object(this), len = O.length >>> 0;
  let i = 0, acc;
  if (init.length) {
    acc = init[0];                          // initial value given (even if undefined!)
  } else {
    while (i < len && !(i in O)) i++;       // find first real element
    if (i >= len) throw new TypeError('Reduce of empty array with no initial value');
    acc = O[i++];
  }
  for (; i < len; i++) {
    if (i in O) acc = cb(acc, O[i], i, O);
  }
  return acc;
};

// ---------- tests ----------
console.log([1, 2, 3].myMap((x) => x * 2));                // [2, 4, 6]
console.log([1, , 3].myMap((x) => x * 2));                 // [2, <1 empty item>, 6]
console.log([5, 12, 8, 130].myFilter((x) => x > 10));      // [12, 130]
console.log([1, 2, 3, 4].myReduce((a, x) => a + x, 0));    // 10
console.log([1, 2, 3, 4].myReduce((a, x) => a + x));       // 10 (starts with acc = 1)
console.log([[1, 2], [3]].myReduce((a, x) => a.concat(x), [])); // [1, 2, 3]
try { [].myReduce((a, x) => a + x); } catch (e) { console.log(e.name + ': ' + e.message); }
const ctx = { factor: 3 };
console.log([1, 2].myMap(function (x) { return x * this.factor; }, ctx)); // [3, 6]
console.log(Array.prototype.myMap.call('abc', (ch) => ch.toUpperCase())); // ['A','B','C']
` }],
    codeTitle: ['map / filter / reduce polyfills'],
    viz: [{
      title: 'myReduce step by step (accumulator in motion)',
      input: '1 2 3 4 | 0',
      inputLabel: 'numbers | initial value (leave blank for none)',
      gen: function (input) {
        var parts = String(input).split('|');
        var a = parseNums(parts[0], 8);
        var hasInit = parts.length > 1 && parts[1].trim() !== '';
        var init = hasInit ? Number(parts[1]) : undefined;
        if (hasInit && isNaN(init)) throw new Error('Initial value must be a number (or leave it blank)');
        var f = [], i = 0, acc;
        f.push(fr('Call <code>[' + a.join(', ') + '].myReduce((acc, x) =&gt; acc + x' + (hasInit ? ', ' + init : '') + ')</code>. We read the length <b>once</b>: len = ' + a.length + '.', [cp(REDUCE_SRC, { 2: 'cur' }), { type: 'array', label: 'O (this)', values: a.slice(), showIdx: true }, vp({ len: a.length, 'init.length': hasInit ? 1 : 0 })]));
        if (hasInit) {
          acc = init;
          f.push(fr('An initial value was passed, so <code>acc = ' + init + '</code> and we start the loop at index 0.', [cp(REDUCE_SRC, { 4: 'cur' }), vp({ acc: acc, i: 0 }, { acc: 'ok' })]));
        } else {
          if (!a.length) {
            f.push(fr('No initial value and the array is empty. There is nothing to start the accumulator with.', [cp(REDUCE_SRC, { 6: 'cur' }), vp({ i: 0, len: 0 })]));
            f.push(fr('<span class="c-r">Throw TypeError: Reduce of empty array with no initial value.</span> Native reduce does exactly the same.', [cp(REDUCE_SRC, { 7: 'bad' }), outBox(['TypeError: Reduce of empty array with no initial value'])]));
            f.push(fr('Fix: always pass an initial value when the array might be empty, e.g. <code>reduce(fn, 0)</code>.', [tx('Tip: <b>always</b> pass the initial value in production code.')]));
            f.push(fr('Try again with some numbers to watch the accumulator move.', [tx('Example input: <code>1 2 3 4 | 0</code>')]));
            return f;
          }
          acc = a[0]; i = 1;
          f.push(fr('No initial value: the <b>first element</b> becomes the accumulator (acc = ' + acc + ') and the loop starts at index <b>1</b>. That is why the callback runs one time fewer.', [cp(REDUCE_SRC, { 8: 'cur' }), { type: 'array', label: 'O', values: a.slice(), hl: { 0: 'sel' }, ptr: { 1: 'i' } }, vp({ acc: acc, i: 1 }, { acc: 'ok' })]));
        }
        var accHist = [];
        for (; i < a.length; i++) {
          var before = acc;
          acc = acc + a[i];
          accHist.push(acc);
          var hl = {}; hl[i] = 'cur';
          for (var k = 0; k < i; k++) hl[k] = 'done';
          var ptr = {}; ptr[i] = 'i';
          f.push(fr('i = ' + i + ': <code>acc = cb(' + before + ', ' + a[i] + ', ' + i + ', O)</code> → <b>' + acc + '</b>. The callback\'s return value <i>becomes</i> the next accumulator.', [cp(REDUCE_SRC, { 11: 'cur' }), { type: 'array', label: 'O', values: a.slice(), hl: hl, ptr: ptr }, vp({ i: i, x: a[i], 'acc before': before, 'acc after': acc }, { 'acc after': 'ok' }), { type: 'bars', label: 'accumulator after each call', values: accHist.slice() }]));
        }
        f.push(fr('Loop finished. Return <b>' + acc + '</b>. One value out of many — that is the whole idea of reduce.', [cp(REDUCE_SRC, { 13: 'ok' }), vp({ result: acc }, { result: 'sel' }), outBox([String(acc)])]));
        return f;
      }
    }, {
      title: 'myMap vs myFilter side by side (with a hole)',
      input: '4 _ 9 2 15',
      inputLabel: 'numbers, use _ for a hole (sparse slot)',
      gen: function (input) {
        var raw = String(input).trim().split(/[\s,]+/).filter(function (x) { return x.length; });
        if (!raw.length || raw.length > 8) throw new Error('Enter 1 to 8 numbers; _ marks a hole');
        var vals = raw.map(function (x) { if (x === '_') return null; var n = Number(x); if (isNaN(n)) throw new Error('Use numbers or _ only'); return n; });
        var shown = vals.map(function (v) { return v === null ? 'hole' : v; });
        var mapOut = vals.map(function () { return 'hole'; }), filt = [];
        var f = [];
        f.push(fr('Input array (sparse where you typed _). Callbacks: <code>map(x =&gt; x * 2)</code> and <code>filter(x =&gt; x &gt; 5)</code>. map pre-creates <code>new Array(' + vals.length + ')</code> — all holes.', [cp(MAPF_SRC, { 3: 'cur' }), { type: 'array', label: 'input', values: shown.slice(), showIdx: true }, { type: 'array', label: 'map output', values: mapOut.slice() }, { type: 'array', label: 'filter output', values: filt.slice() }]));
        for (var i = 0; i < vals.length; i++) {
          var hl = {}; hl[i] = vals[i] === null ? 'bad' : 'cur';
          var ptr = {}; ptr[i] = 'i';
          if (vals[i] === null) {
            f.push(fr('i = ' + i + ': <code>' + i + ' in O</code> is <b>false</b> (a hole). Both polyfills <b>skip</b> it — the callback is never called. map\'s output keeps the hole.', [cp(MAPF_SRC, { 5: 'bad', 12: 'bad' }), { type: 'array', label: 'input', values: shown.slice(), hl: hl, ptr: ptr }, { type: 'array', label: 'map output', values: mapOut.slice(), hl: (function () { var h = {}; h[i] = 'bad'; return h; })() }, { type: 'array', label: 'filter output', values: filt.slice() }]));
            continue;
          }
          mapOut[i] = vals[i] * 2;
          var keep = vals[i] > 5;
          if (keep) filt.push(vals[i]);
          var mh = {}; mh[i] = 'ok';
          var fh = {}; if (keep) fh[filt.length - 1] = 'ok';
          f.push(fr('i = ' + i + ', x = ' + vals[i] + '. map writes <code>out[' + i + '] = ' + mapOut[i] + '</code> (same slot). filter asks "' + vals[i] + ' &gt; 5?" → ' + (keep ? '<span class="c-g">yes, push it</span>' : '<span class="c-r">no, drop it</span>') + '.', [cp(MAPF_SRC, { 5: 'ok', 12: keep ? 'ok' : 'bad' }), { type: 'array', label: 'input', values: shown.slice(), hl: hl, ptr: ptr }, { type: 'array', label: 'map output', values: mapOut.slice(), hl: mh }, { type: 'array', label: 'filter output', values: filt.slice(), hl: fh }]));
        }
        f.push(fr('Done. map output has the <b>same length</b> (' + mapOut.length + ') with holes preserved; filter output is <b>compact</b> (' + filt.length + ' items), never has holes.', [{ type: 'array', label: 'map result', values: mapOut.slice(), hl: (function () { var h = {}; mapOut.forEach(function (v, k) { if (v !== 'hole') h[k] = 'sel'; }); return h; })() }, { type: 'array', label: 'filter result', values: filt.slice() }]));
        return f;
      }
    }],
    examples: [
      { title: 'Implement map and filter USING reduce', html: `<p>A classic follow-up: "reduce is the most general — prove it." Map = reduce into an array pushing <code>cb(x)</code>; filter = reduce pushing <code>x</code> only when <code>cb(x)</code> is truthy.</p>`, code: { lang: 'js', run: true, code: `
const mapViaReduce = (arr, cb) => arr.reduce((out, x, i, a) => { out.push(cb(x, i, a)); return out; }, []);
const filterViaReduce = (arr, cb) => arr.reduce((out, x, i, a) => (cb(x, i, a) ? (out.push(x), out) : out), []);
console.log(mapViaReduce([1, 2, 3], (x) => x * x));        // [1, 4, 9]
console.log(filterViaReduce([1, 2, 3, 4], (x) => x % 2));  // [1, 3]
` } },
      { title: 'groupBy and frequency count with reduce', html: `<p>Reduce into an <b>object</b> or <b>Map</b> is the bread-and-butter of real code: counting, grouping, indexing by id. (Modern JS also has <code>Object.groupBy</code> / <code>Map.groupBy</code> since ES2024.)</p>`, code: { lang: 'js', run: true, code: `
const people = [{ name: 'Asha', city: 'Pune' }, { name: 'Ben', city: 'Delhi' }, { name: 'Chen', city: 'Pune' }];
const byCity = people.reduce((acc, p) => {
  (acc[p.city] = acc[p.city] || []).push(p.name);
  return acc;                  // forgetting this return is the #1 reduce bug
}, {});
console.log(byCity); // { Pune: ['Asha', 'Chen'], Delhi: ['Ben'] }

const freq = 'banana'.split('').reduce((m, ch) => m.set(ch, (m.get(ch) || 0) + 1), new Map());
console.log([...freq]); // [['b',1],['a',3],['n',2]]
` } },
      { title: 'reduce(cb) vs reduce(cb, undefined)', html: `<p>These are <b>not</b> the same. Passing <code>undefined</code> explicitly is a real initial value. A polyfill that checks <code>init === undefined</code> gets this wrong; one that checks <code>arguments.length</code> / rest length gets it right.</p>`, code: { lang: 'js', run: true, code: `
console.log([1, 2].reduce((a, x) => String(a) + x));            // '12'  (acc starts as 1)
console.log([1, 2].reduce((a, x) => String(a) + x, undefined)); // 'undefined12'
` } },
      { title: 'Chaining cost: map + filter vs one reduce', html: `<p><code>arr.filter(f).map(g)</code> walks twice and allocates a temporary array. For big arrays in hot paths, one <code>reduce</code> or a plain loop does it in a single pass. For normal UI-sized arrays the chain is clearer — readability wins.</p>`, code: { lang: 'js', run: true, code: `
const nums = Array.from({ length: 10 }, (_, i) => i + 1);
const twoPass = nums.filter((x) => x % 2 === 0).map((x) => x * x);
const onePass = nums.reduce((out, x) => (x % 2 === 0 ? (out.push(x * x), out) : out), []);
console.log(twoPass, onePass); // [4,16,36,64,100] twice
` } }
    ],
    deepDive: `<p>🟣 <b>What the spec really does</b> (ECMA-262 <i>Array.prototype.map</i>):</p>
<ol><li><code>O = ToObject(this)</code> — that is why <code>Array.prototype.map.call('abc', f)</code> works on strings.</li>
<li><code>len = LengthOfArrayLike(O)</code> — read once; changes to length during iteration are ignored for the loop bound.</li>
<li><code>A = ArraySpeciesCreate(O, len)</code> — map/filter create the result with <code>O.constructor[Symbol.species]</code>, so subclasses of Array get subclass instances back. Our polyfill always returns a plain Array (fine for interviews; mention it).</li>
<li>For each k: <code>HasProperty(O, k)</code> (walks the prototype chain — <code>i in O</code>, not <code>hasOwnProperty</code>) then <code>Get</code>, then call. Elements <b>deleted</b> before they are visited are skipped; elements <b>changed</b> before they are visited show their new value.</li></ol>
<p><b>Why <code>&gt;&gt;&gt; 0</code>?</b> It converts length to an unsigned 32-bit integer (handles <code>undefined</code> → 0, negative → huge). Modern spec uses <code>ToLength</code> (clamps to 2<sup>53</sup>−1); for interviews <code>&gt;&gt;&gt; 0</code> is the well-known idiom.</p>
<p><b>Performance reality:</b> V8 has hand-tuned builtins (written in Torque/CSA) for these methods and can inline the callback for packed arrays. Calling them on <b>holey</b> arrays (<code>HOLEY_ELEMENTS</code> kind) is slower because every index needs a hole check — another reason to avoid <code>new Array(n)</code> + sparse writes in hot code. A hand-written <code>for</code> loop is still usually the fastest, but the difference is small enough that clarity should win outside tight loops.</p>
<p><b>Immutability:</b> map/filter never modify the input, but your <b>callback</b> can (bad practice). Since ES2023 we also have non-mutating cousins of mutating methods: <code>toSorted</code>, <code>toReversed</code>, <code>toSpliced</code>, <code>with</code>.</p>
<p><b>reduceRight</b> is the mirror (walks from <code>len-1</code> to 0) and is the natural way to write <code>compose(f, g, h)</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "write map/filter/reduce" is the most auto-completable question that exists; Copilot finishes it after two characters. Interviewers therefore probe the <b>spec corners</b>: holes, <code>thisArg</code>, <code>reduce(cb, undefined)</code>, empty-array TypeError, array-likes. Knowing these is what proves understanding.</p>
<p><b>Use AI as a partner:</b> <code>Generate a table-driven test suite comparing my myReduce with the native reduce on: sparse arrays, array-likes, undefined initial, mutating callbacks. Print mismatches only.</code> Differential testing against the native method is a great habit.</p>
<p><b>Where AI goes wrong:</b> uses <code>initialValue === undefined</code> to detect "no initial value"; forgets the TypeError; uses <code>forEach</code> inside a polyfill of <code>forEach</code>'s cousins (circular); fills holes with <code>undefined</code>.</p>
<p><b>What you must still own:</b> choosing reduce vs a loop for readability, and spotting the "forgot to return acc" bug in AI-written reducers during code review.</p>`,
    problems: [{
      title: 'Implement Array.prototype.myReduce exactly like the native one', level: 'Medium', tags: ['polyfill', 'array', 'reduce'], companies: ['Amazon', 'Walmart', 'PhonePe', 'Swiggy'],
      statement: `<p>Implement <code>Array.prototype.myReduce(callback, initialValue?)</code> without using the built-in <code>reduce</code>. It must: call <code>callback(acc, value, index, array)</code> for each <b>existing</b> element; use the first existing element as the starting accumulator when no initial value is given; throw a <code>TypeError</code> on an empty array without an initial value; treat an explicitly passed <code>undefined</code> as a real initial value.</p>`,
      constraints: `Array length up to 10<sup>6</sup>. Must handle sparse arrays and array-like objects (<code>{0:'a', length:1}</code>).`,
      example: `<p><code>[1, 2, 3].myReduce((a, x) =&gt; a + x)</code> → ${H.c('g', '6')} (acc starts at 1, callback runs twice).<br><code>[].myReduce((a, x) =&gt; a + x, 0)</code> → ${H.c('g', '0')} (initial value returned, callback never runs).<br><code>[].myReduce((a, x) =&gt; a + x)</code> → ${H.c('r', 'TypeError')}.</p>`,
      brute: { why: `<p>The naive version checks <code>if (init === undefined) { acc = this[0]; start = 1 }</code>. It breaks for <code>reduce(cb, undefined)</code>, for arrays whose first slot is a hole, and silently returns <code>undefined</code> instead of throwing on an empty array.</p>`, code: `
Array.prototype.naiveReduce = function (cb, init) {
  let acc = init, start = 0;
  if (init === undefined) { acc = this[0]; start = 1; } // wrong detection
  for (let i = start; i < this.length; i++) acc = cb(acc, this[i], i, this); // visits holes
  return acc;
};
` },
      mcq: { q: 'How should the polyfill decide that NO initial value was passed?', options: ['Check <code>arguments.length &lt; 2</code> (or rest-param length)', 'Check <code>init === undefined</code>', 'Check <code>!init</code>', 'Check <code>this.length === 0</code>'], answer: 0, explain: 'Only the number of arguments distinguishes <code>reduce(cb)</code> from <code>reduce(cb, undefined)</code>. <code>!init</code> is even worse: it treats 0 and "" as missing.' },
      hints: [`<p>Hint 1: there are two phases — <b>pick the starting accumulator</b>, then <b>loop</b>. Only the first phase depends on whether an initial value was given.</p>`, `<p>Hint 2: use rest parameters <code>(cb, ...init)</code> and test <code>init.length</code>. To find the first real element of a sparse array, advance <code>i</code> while <code>!(i in O)</code>.</p>`, `<p>Hint 3: recipe — validate cb; O = Object(this); len = O.length &gt;&gt;&gt; 0; if init given acc = init[0] else skip holes, throw if none left, acc = O[i++]; loop i..len-1 calling cb only when <code>i in O</code>; return acc.</p>`],
      solution: {
        approach: `<p>Two-phase algorithm: (1) choose the starting accumulator honestly using the argument count, skipping leading holes; (2) a plain loop that only visits indexes that exist. Throwing on the impossible case matches the native method.</p>`,
        code: { lang: 'js', run: true, code: `
Array.prototype.myReduce = function (cb, ...init) {
  if (typeof cb !== 'function') throw new TypeError(cb + ' is not a function');
  const O = Object(this), len = O.length >>> 0;
  let i = 0, acc;
  if (init.length > 0) {
    acc = init[0];
  } else {
    while (i < len && !(i in O)) i++;                   // skip leading holes
    if (i >= len) throw new TypeError('Reduce of empty array with no initial value');
    acc = O[i++];
  }
  for (; i < len; i++) if (i in O) acc = cb(acc, O[i], i, O);
  return acc;
};

console.log([1, 2, 3].myReduce((a, x) => a + x));             // 6
console.log([].myReduce((a, x) => a + x, 0));                 // 0
console.log([, , 5, 6].myReduce((a, x) => a * x));            // 30 (holes skipped)
console.log([1].myReduce((a, x) => a + x, undefined));        // NaN (undefined + 1)
console.log(Array.prototype.myReduce.call({ 0: 'a', 1: 'b', length: 2 }, (a, x) => a + x)); // ab
try { [].myReduce((a, x) => a + x); } catch (e) { console.log(e instanceof TypeError); } // true
` },
        dry: { head: ['call', 'init given?', 'start acc', 'start i', 'loop calls', 'result'], rows: [['<code>[1,2,3].myReduce(add)</code>', 'no', '1 (O[0])', '1', 'add(1,2)=3, add(3,3)=6', '<b>6</b>'], ['<code>[].myReduce(add, 0)</code>', 'yes', '0', '0', 'none', '<b>0</b>'], ['<code>[,,5,6].myReduce(mul)</code>', 'no', 'skip 0,1 → 5', '3', 'mul(5,6)=30', '<b>30</b>'], ['<code>[].myReduce(add)</code>', 'no', 'no element', '—', '—', '<span class="c-r">TypeError</span>']] },
        complexity: `<p>Time O(N) callback calls (N = length). Extra space O(1) besides what the callback builds.</p>`,
        followUps: ['Write <code>myReduceRight</code>.', 'Implement <code>compose(...fns)</code> using reduceRight.', 'Make myMap return a subclass instance for subclasses of Array (Symbol.species).']
      }
    }]
  });

  /* ================= TOPIC 3: Promise.all / race / allSettled / any ================= */
  var PALL_SRC = [
    'function promiseAll(iterable) {',
    '  return new Promise((resolve, reject) => {',
    '    const items = Array.from(iterable);',
    '    const results = new Array(items.length);',
    '    let remaining = items.length;',
    '    if (remaining === 0) return resolve(results);',
    '    items.forEach((item, i) => {',
    '      Promise.resolve(item).then((value) => {',
    '        results[i] = value;            // keep INPUT order',
    '        if (--remaining === 0) resolve(results);',
    '      }, reject);                       // first rejection wins',
    '    });',
    '  });',
    '}'
  ].join('\n');

  topics.push({
    title: 'Promise Polyfills: all, race, allSettled and any',
    analogy: `<p>You order food for a group from <b>four restaurants</b> at once.</p>
<ul><li><b>Promise.all</b> = "We eat when <b>every</b> order arrives. If <b>any</b> restaurant cancels, dinner is off." Plates are served in the order you <i>ordered</i>, not the order they arrived.</li>
<li><b>Promise.race</b> = "Whatever arrives (or gets cancelled) <b>first</b> decides the evening."</li>
<li><b>Promise.allSettled</b> = "Wait for every restaurant to either deliver or cancel, then show me a <b>report card</b> for each one." Never fails.</li>
<li><b>Promise.any</b> = "I just need <b>one</b> successful delivery. I only give up if <b>all</b> of them cancel."</li></ul>`,
    explain: `<p>🟢 <b>A quick refresher.</b> A <b>promise</b> is a box that will hold a value later. It starts <b>pending</b> and settles exactly once: <b>fulfilled</b> (with a value) or <b>rejected</b> (with a reason). Combinators take <b>many</b> promises and give back <b>one</b> promise.</p>
${H.table(['Combinator', 'Fulfills when', 'Rejects when', 'Empty input []'], [['<code>Promise.all</code>', 'all fulfill → array of values (input order)', H.c('r', 'first rejection'), 'fulfills with <code>[]</code> immediately'], ['<code>Promise.race</code>', 'first to settle is a fulfill', H.c('r', 'first to settle is a reject'), H.c('y', 'stays pending forever')], ['<code>Promise.allSettled</code>', 'all settle → array of {status, value|reason}', H.c('g', 'never'), 'fulfills with <code>[]</code>'], ['<code>Promise.any</code>', 'first fulfill', H.c('r', 'all reject → AggregateError'), 'rejects with AggregateError']])}
<p>🔵 <b>The four rules of a correct Promise.all polyfill</b> (every interviewer checks these):</p>
<ol><li><b>Order:</b> results go to <code>results[i]</code> — the slot of the <i>input</i> index — not <code>push</code>, because promises finish in random order.</li>
<li><b>Counting:</b> keep a <code>remaining</code> counter. You cannot use <code>results.length</code> — writing <code>results[5]</code> first makes length 6 instantly.</li>
<li><b>Non-promises:</b> wrap every item with <code>Promise.resolve(item)</code>, so plain values like <code>42</code> and "thenables" also work.</li>
<li><b>Empty input</b> resolves to <code>[]</code> right away (otherwise it would hang forever).</li></ol>
<p>Fail-fast: the outer promise rejects on the first rejection, but the other operations <b>keep running</b> — promises cannot be cancelled. Calling <code>resolve</code>/<code>reject</code> again later is harmless: a promise settles only once.</p>
<p>🔵 <b>race</b> is the shortest polyfill of all: attach the outer <code>resolve, reject</code> to every item; whoever calls first wins. <b>allSettled</b> is <b>all</b> with both handlers writing a report object and decrementing the counter. <b>any</b> is the mirror of <b>all</b>: count <i>rejections</i>, store errors in input order, and reject with <code>new AggregateError(errors, msg)</code> when every one failed.</p>`,
    clues: ['"Implement Promise.all" / "run these API calls in parallel and wait for all" → counter + results[i] + Promise.resolve wrap', '"Results must be in the same order as the input" → index slots, not push', '"Fail fast as soon as one request fails" → Promise.all; "show a report of which succeeded" → allSettled', '"Timeout a fetch after N ms" → Promise.race with a timer promise', '"Use the fastest mirror / first successful CDN" → Promise.any', '"Limit concurrency to K at a time" → promise pool (follow-up after all)'],
    code: [{ lang: 'js', run: true, title: 'all, race, allSettled, any polyfills + tests (runnable)', code: `
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);          // accept any iterable (Set, generator...)
    const results = new Array(items.length);
    let remaining = items.length;
    if (remaining === 0) return resolve(results); // [] resolves immediately
    items.forEach((item, i) => {
      Promise.resolve(item).then((value) => {     // wrap plain values / thenables
        results[i] = value;                       // keep input order
        if (--remaining === 0) resolve(results);
      }, reject);                                 // first rejection rejects the whole thing
    });
  });
}

function promiseRace(iterable) {
  return new Promise((resolve, reject) => {
    for (const item of iterable) Promise.resolve(item).then(resolve, reject); // first to settle wins
  });
}

function promiseAllSettled(iterable) {
  return new Promise((resolve) => {
    const items = Array.from(iterable);
    const out = new Array(items.length);
    let remaining = items.length;
    if (remaining === 0) return resolve(out);
    items.forEach((item, i) => {
      Promise.resolve(item).then(
        (value) => { out[i] = { status: 'fulfilled', value }; },
        (reason) => { out[i] = { status: 'rejected', reason }; }
      ).then(() => { if (--remaining === 0) resolve(out); });
    });
  });
}

function promiseAny(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const errors = new Array(items.length);
    let remaining = items.length;
    if (remaining === 0) return reject(new AggregateError([], 'All promises were rejected'));
    items.forEach((item, i) => {
      Promise.resolve(item).then(resolve, (err) => {
        errors[i] = err;
        if (--remaining === 0) reject(new AggregateError(errors, 'All promises were rejected'));
      });
    });
  });
}

// ---------- helpers + tests ----------
const wait = (ms, v, fail) => new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms));

(async () => {
  console.log(await promiseAll([wait(30, 'A'), wait(10, 'B'), 42]));      // ['A','B',42] input order
  console.log(await promiseAll([]));                                       // []
  try { await promiseAll([wait(30, 'A'), wait(10, 'boom', true)]); }
  catch (e) { console.log('all rejected:', e.message); }                  // boom
  console.log(await promiseRace([wait(30, 'slow'), wait(10, 'fast')]));   // fast
  const settled = await promiseAllSettled([wait(10, 'ok'), wait(5, 'bad', true)]);
  console.log(settled.map((r) => r.status + ':' + (r.value || r.reason.message))); // ['fulfilled:ok','rejected:bad']
  console.log(await promiseAny([wait(5, 'x', true), wait(20, 'y')]));      // y
  try { await promiseAny([wait(5, 'e1', true), wait(10, 'e2', true)]); }
  catch (e) { console.log(e.constructor.name, e.errors.map((x) => x.message)); } // AggregateError ['e1','e2']
})();
` }],
    codeTitle: ['Promise combinator polyfills'],
    viz: [{
      title: 'Promise combinators on a timeline (results table)',
      input: 'all | 300 ok, 100 ok, 200 ok',
      inputLabel: 'all|race|allSettled|any  |  delay ok/fail, ...',
      gen: function (input) {
        var parts = String(input).split('|');
        var mode = (parts[0] || '').trim();
        if (['all', 'race', 'allSettled', 'any'].indexOf(mode) < 0) throw new Error('Start with all, race, allSettled or any, e.g. all | 300 ok, 100 fail');
        var specs = items(parts[1] || '');
        if (!specs.length || specs.length > 6) throw new Error('Give 1 to 6 promises like "300 ok, 100 fail"');
        var ps = specs.map(function (s, i) {
          var m = /^(\d+)\s*(ok|fail)$/i.exec(s.trim());
          if (!m) throw new Error('Each promise looks like "250 ok" or "120 fail"');
          var d = Math.min(Number(m[1]), 5000);
          var ok = m[2].toLowerCase() === 'ok';
          return { i: i, d: d, ok: ok, val: ok ? String.fromCharCode(65 + i) : 'Err' + i, state: 'pending', note: '' };
        });
        var order = ps.slice().sort(function (a, b) { return a.d - b.d || a.i - b.i; });
        var outer = 'pending', outerVal = '', remaining = ps.length;
        var results = ps.map(function () { return 'empty'; });
        var f = [];
        function tbl(hlRow) {
          var hl = {}; if (hlRow !== undefined) hl[hlRow] = ps[hlRow].ok ? 'ok' : 'bad';
          ps.forEach(function (p, k) { if (p.note === 'ignored' && k !== hlRow) hl[k] = 'done'; });
          return { type: 'table', label: 'Input promises (index = input order)', columns: ['#', 'settles at', 'will', 'state', 'value / reason', 'note'], rows: ps.map(function (p) { return [p.i, p.d + ' ms', p.ok ? 'fulfill' : 'reject', p.state, p.state === 'pending' ? '—' : p.val, p.note]; }), hl: hl };
        }
        function vars(t) {
          var v = { time: t + ' ms', 'outer promise': outer + (outerVal ? ' → ' + outerVal : '') };
          if (mode === 'all' || mode === 'allSettled' || mode === 'any') v.remaining = remaining;
          return vp(v, { 'outer promise': outer === 'pending' ? 'cur' : (outer === 'fulfilled' ? 'ok' : 'bad') }, 'Combinator state');
        }
        var label = mode === 'any' ? 'errors[] (input order)' : 'results[] (input order)';
        f.push(fr('<code>Promise.' + mode + '([' + ps.length + ' promises])</code> starts. Every input is wrapped with <code>Promise.resolve</code> and gets handlers attached. Nothing has settled yet' + (mode === 'race' ? '.' : '; <code>remaining = ' + remaining + '</code>.'), [tbl(), vars(0), { type: 'array', label: label, values: results.slice() }].concat(mode === 'all' ? [cp(PALL_SRC, { 5: 'cur', 7: 'cur' })] : [])));
        order.forEach(function (p) {
          var wasSettled = outer !== 'pending';
          p.state = p.ok ? 'fulfilled' : 'rejected';
          var why = '';
          var codeHl = {};
          if (mode === 'all') {
            if (wasSettled) { p.note = 'ignored'; why = 'The outer promise already settled, so this result is <b>ignored</b> (a promise settles only once). The work still ran — promises cannot be cancelled.'; }
            else if (p.ok) { results[p.i] = p.val; remaining--; p.note = 'stored'; why = 'Fulfilled → store in <code>results[' + p.i + ']</code> (its <b>input</b> slot) and <code>remaining--</code> → ' + remaining + '.'; codeHl = { 9: 'ok', 10: 'cur' }; if (remaining === 0) { outer = 'fulfilled'; outerVal = '[' + results.join(', ') + ']'; why += ' remaining hit 0 → <span class="c-g">resolve(results)</span>.'; } }
            else { outer = 'rejected'; outerVal = p.val; p.note = 'rejects outer'; why = '<span class="c-r">Rejected → the outer promise rejects immediately with ' + p.val + '</span> (fail-fast).'; codeHl = { 11: 'bad' }; }
          } else if (mode === 'race') {
            if (wasSettled) { p.note = 'ignored'; why = 'Too late — the race already has a winner. Ignored.'; }
            else { outer = p.ok ? 'fulfilled' : 'rejected'; outerVal = p.val; p.note = 'winner'; why = 'First to settle → the outer promise <b>' + outer + '</b> with ' + p.val + '. Race does not care whether it was a success or a failure.'; }
          } else if (mode === 'allSettled') {
            results[p.i] = p.ok ? '{fulfilled: ' + p.val + '}' : '{rejected: ' + p.val + '}'; remaining--; p.note = 'report written';
            why = 'Settled (' + p.state + ') → write a report object in slot ' + p.i + ', <code>remaining = ' + remaining + '</code>. allSettled never rejects.';
            if (remaining === 0) { outer = 'fulfilled'; outerVal = 'report array'; why += ' All settled → <span class="c-g">resolve(report)</span>.'; }
          } else {
            if (wasSettled) { p.note = 'ignored'; why = 'Already fulfilled by an earlier success → ignored.'; }
            else if (p.ok) { outer = 'fulfilled'; outerVal = p.val; p.note = 'winner'; why = '<span class="c-g">First success → any() fulfills with ' + p.val + '.</span>'; }
            else { results[p.i] = p.val; remaining--; p.note = 'error stored'; why = 'Rejected → store the error in <code>errors[' + p.i + ']</code>; remaining = ' + remaining + '.'; if (remaining === 0) { outer = 'rejected'; outerVal = 'AggregateError'; why += ' <span class="c-r">Every promise failed → reject with AggregateError(errors).</span>'; } }
          }
          var rh = {}; if (results[p.i] !== 'empty' && p.note !== 'ignored') rh[p.i] = p.ok ? 'ok' : 'bad';
          f.push(fr('t = ' + p.d + ' ms: promise #' + p.i + ' ' + p.state + ' (' + p.val + '). ' + why, [tbl(p.i), vars(p.d), { type: 'array', label: label, values: results.slice(), hl: rh }].concat(mode === 'all' ? [cp(PALL_SRC, codeHl)] : [])));
        });
        var summary = { all: 'All: fast when everything succeeds, fails fast otherwise. Results always come back in INPUT order, even though they arrived in time order.', race: 'Race: the earliest settlement decides. Classic use: timeouts.', allSettled: 'allSettled: always fulfills with a full report. Use for dashboards / batch jobs where partial failure is OK.', any: 'Any: first success wins; only an all-fail gives AggregateError. Use for redundant mirrors.' }[mode];
        f.push(fr('<b>Final:</b> outer promise is <b>' + outer + '</b>' + (outerVal ? ' with ' + esc(outerVal) : '') + '. ' + summary, [vars(order[order.length - 1].d), tx('<b>Arrival order:</b> ' + order.map(function (p) { return '#' + p.i; }).join(' → ') + '<br><b>Result order:</b> input order 0..' + (ps.length - 1), 'Order matters')]));
        return f;
      }
    }],
    examples: [
      { title: 'Timeout any promise with race', html: `<p>Build a "loser" promise that rejects after <code>ms</code>, then race it with the real work. Remember to <b>clear the timer</b> in <code>finally</code>, otherwise Node keeps the process alive and you leak timers.</p>`, code: { lang: 'js', run: true, code: `
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timed out after ' + ms + ' ms')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
const slow = new Promise((r) => setTimeout(() => r('data'), 50));
withTimeout(slow, 10).catch((e) => console.log(e.message));        // Timed out after 10 ms
withTimeout(Promise.resolve('fast'), 10).then((v) => console.log(v)); // fast
` } },
      { title: 'Why results.length is the wrong counter', html: `<p>A buggy polyfill checks <code>if (results.length === items.length) resolve(results)</code>. If the <b>last</b> promise finishes first, <code>results[2] = x</code> makes length 3 immediately → resolves with holes. Always use a separate counter.</p>`, code: { lang: 'js', run: true, code: `
const results = [];
results[2] = 'C';                   // the last promise finished first
console.log(results.length);        // 3  -> buggy code would resolve now!
console.log(results);               // [ <2 empty items>, 'C' ]
` } },
      { title: 'allSettled for a partial-failure dashboard', html: `<p>Loading three widgets: if one API fails, still show the other two. <code>allSettled</code> + filter by status is the idiomatic pattern.</p>`, code: { lang: 'js', run: true, code: `
const api = (name, ok) => (ok ? Promise.resolve(name + ' data') : Promise.reject(new Error(name + ' down')));
Promise.allSettled([api('news', true), api('weather', false), api('stocks', true)]).then((rs) => {
  const ok = rs.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const bad = rs.filter((r) => r.status === 'rejected').map((r) => r.reason.message);
  console.log('show:', ok);    // ['news data', 'stocks data']
  console.log('errors:', bad); // ['weather down']
});
` } },
      { title: 'Sequential vs parallel awaits', html: `<p><code>await a(); await b();</code> takes <b>a + b</b> time. <code>await Promise.all([a(), b()])</code> takes <b>max(a, b)</b>. Start the work first, await later.</p>`, code: { lang: 'js', run: true, code: `
const job = (ms) => new Promise((r) => setTimeout(() => r(ms), ms));
(async () => {
  let t = Date.now();
  await job(40); await job(40);
  console.log('sequential ~', Math.round((Date.now() - t) / 10) * 10, 'ms'); // ~80
  t = Date.now();
  await Promise.all([job(40), job(40)]);
  console.log('parallel   ~', Math.round((Date.now() - t) / 10) * 10, 'ms'); // ~40
})();
` } }
    ],
    deepDive: `<p>🟣 <b>Spec-level details:</b></p>
<ul><li>The real <code>Promise.all</code> calls <code>this.resolve(item)</code> (the constructor's resolve, so subclasses work) and reads <code>then</code> once per item. It iterates the iterable <b>lazily</b>, and if iteration itself throws, the returned promise rejects.</li>
<li>Handlers always run as <b>microtasks</b>. Even if every input is an already-resolved value, <code>Promise.all([1,2])</code> resolves asynchronously — never synchronously.</li>
<li>The spec uses a small trick to count: <code>remainingElementsCount</code> starts at <b>1</b>, is incremented per item, and decremented once after the loop. That handles empty input and avoids resolving before all handlers are attached. Our early-return for <code>[]</code> is the readable version of the same idea.</li>
<li>Each element's resolve function has an <code>alreadyCalled</code> flag, so a misbehaving thenable that calls its callback twice cannot double-decrement the counter. Our version is safe for real promises (they settle once) but a hostile thenable could break it — mention it as an expert edge.</li></ul>
<p><b>Unhandled rejections:</b> with <code>Promise.all</code>, after the first rejection, later rejections are swallowed by the combinator (they are handled, just ignored), so you will not get "unhandledRejection" warnings for them. With a hand-rolled loop of <code>await</code>s you can.</p>
<p><b>Cancellation:</b> promises have no cancel. Pair combinators with <code>AbortController</code>: when <code>all</code> rejects, call <code>controller.abort()</code> so the remaining <code>fetch</code> calls stop. <code>AbortSignal.timeout(ms)</code> and <code>AbortSignal.any([...])</code> are the modern building blocks.</p>
<p><b>Concurrency limits:</b> <code>Promise.all(urls.map(fetch))</code> fires <i>everything</i> at once — 10 000 requests will be rate-limited or exhaust sockets. Production code uses a <b>pool</b> (see practice) or libraries like <code>p-limit</code>. Also new in ES2024: <code>Promise.withResolvers()</code> returns <code>{ promise, resolve, reject }</code>, handy for writing these utilities.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI writes Promise.all perfectly most of the time — so the interview moves to the <b>follow-ups</b>: concurrency-limited pool, cancellation with AbortController, retries, timeouts, ordering guarantees, and "what happens to the other requests after a rejection?". You must reason about time, not just syntax.</p>
<p><b>Use AI as a partner:</b> <code>Give me 8 timing scenarios (delays + success/fail) for Promise.all, race, allSettled, any and the expected outcome of each — as a table.</code> Then predict them yourself before reading the answers; the visualizer above lets you check.</p>
<p><b>Where AI goes wrong:</b> uses <code>results.push</code> (wrong order), uses <code>results.length</code> as the counter, forgets <code>Promise.resolve</code> for non-promise values, forgets the empty-array case, or writes <code>async</code> functions with <code>await</code> in a <code>forEach</code> (which does not wait).</p>
<p><b>What you must still own:</b> choosing the right combinator from the product requirement ("show partial results" → allSettled) and spotting accidental sequential awaits in AI-generated code.</p>`,
    problems: [{
      title: 'Implement Promise.all from scratch', level: 'Medium', tags: ['promise', 'polyfill', 'async'], companies: ['Google', 'Meta', 'Flipkart', 'Razorpay', 'Atlassian'],
      statement: `<p>Write <code>promiseAll(iterable)</code> that behaves like <code>Promise.all</code>: returns a promise that fulfills with an array of results <b>in input order</b> once every item fulfills, or rejects with the <b>first</b> rejection reason. Items may be promises or plain values. Do not use <code>Promise.all</code>, <code>allSettled</code>, <code>any</code> or <code>race</code>.</p>`,
      constraints: `0 ≤ number of items ≤ 10<sup>4</sup>. Items finish in any order. Empty input must fulfill with <code>[]</code>.`,
      example: `<p>Input: <code>[delay(300,'A'), delay(100,'B'), 42]</code><br>Arrival order: 42 (immediately), B (100 ms), A (300 ms)<br>Output after ~300 ms: ${H.c('g', "['A', 'B', 42]")} — the input order, not arrival order.</p>`,
      brute: { why: `<p>A first try awaits each promise in a loop. It gives correct values but is <b>not</b> Promise.all: the total time is fine only because promises were already started — yet a rejection in item 3 is not noticed until items 0–2 finish (not fail-fast), and if the loop happens before work starts it becomes sequential. Another naive version uses <code>push</code>, which scrambles the order.</p>`, code: `
async function naiveAll(items) {
  const out = [];
  for (const p of items) out.push(await p); // waits in order: rejection of a later item is noticed late
  return out;
}
` },
      mcq: { q: 'Item #2 fulfills first. Where must its value go?', options: ['<code>results[2]</code>', '<code>results.push(value)</code>', '<code>results[0]</code>', '<code>results.unshift(value)</code>'], answer: 0, explain: 'The result array mirrors the input order, so each value goes to its own input index regardless of finish time.' },
      hints: [`<p>Hint 1: return <code>new Promise((resolve, reject) =&gt; ...)</code>. The outer promise is controlled by you; attach handlers to every input.</p>`, `<p>Hint 2: keep <code>results = new Array(n)</code> and a <code>remaining = n</code> counter. In each fulfillment handler write <code>results[i]</code> and decrement; resolve at 0. Pass the outer <code>reject</code> directly as the rejection handler.</p>`, `<p>Hint 3: edge cases — wrap with <code>Promise.resolve(item)</code> for plain values; if n is 0 resolve <code>[]</code> immediately; convert any iterable with <code>Array.from</code>.</p>`],
      solution: {
        approach: `<p>Index-slotted results + countdown latch. Each item is normalised with <code>Promise.resolve</code>; fulfillment writes its own slot and decrements; the first rejection calls the outer reject (later calls are no-ops since a promise settles once).</p>`,
        code: { lang: 'js', run: true, code: `
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const results = new Array(items.length);
    let remaining = items.length;
    if (remaining === 0) { resolve(results); return; }
    items.forEach((item, i) => {
      Promise.resolve(item).then((value) => {
        results[i] = value;
        remaining -= 1;
        if (remaining === 0) resolve(results);
      }, reject);
    });
  });
}

const delay = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
promiseAll([delay(30, 'A'), delay(10, 'B'), 42]).then((r) => console.log(r)); // ['A','B',42]
promiseAll([]).then((r) => console.log('empty ->', r));                      // []
promiseAll([delay(20, 'ok'), Promise.reject(new Error('nope'))])
  .catch((e) => console.log('rejected with', e.message));                    // nope
` },
        dry: { head: ['time', 'event', 'results', 'remaining', 'outer'], rows: [['0 ms', 'handlers attached to 3 items', '[ , , ]', '3', 'pending'], ['microtask', '42 fulfills (index 2)', '[ , , 42]', '2', 'pending'], ['10 ms', "'B' fulfills (index 1)", "[ , 'B', 42]", '1', 'pending'], ['30 ms', "'A' fulfills (index 0)", "['A','B',42]", '0', '<span class="c-g">fulfilled</span>']] },
        complexity: `<p>O(N) time to attach handlers and O(N) space for results. Wall-clock time = the slowest item (or the first rejection).</p>`,
        followUps: ['Now implement <code>allSettled</code> and <code>any</code>.', 'Add a concurrency limit K (promise pool).', 'Abort the remaining fetches when one fails (AbortController).']
      }
    }]
  });

  /* ================= TOPIC 4: debounce & throttle ================= */
  var DEB_SRC = [
    'function debounce(fn, wait) {',
    '  let timer = null;',
    '  return function (...args) {',
    '    clearTimeout(timer);              // cancel the old plan',
    '    timer = setTimeout(() => {',
    '      timer = null;',
    '      fn.apply(this, args);            // run with the LATEST args',
    '    }, wait);',
    '  };',
    '}'
  ].join('\n');
  var THR_SRC = [
    'function throttle(fn, wait) {',
    '  let last = -Infinity, timer = null, pending = null;',
    '  return function (...args) {',
    '    const now = Date.now();',
    '    if (now - last >= wait && !timer) {   // window open',
    '      last = now; fn.apply(this, args);  // leading call',
    '    } else {',
    '      pending = args;                     // remember latest',
    '      if (!timer) timer = setTimeout(() => {',
    '        last = Date.now(); timer = null;',
    '        fn.apply(this, pending);          // trailing call',
    '      }, wait - (now - last));',
    '    }',
    '  };',
    '}'
  ].join('\n');

  topics.push({
    title: 'Debounce and Throttle',
    analogy: `<p><b>Debounce = a lift (elevator) door.</b> The door waits 3 seconds before closing. Every time someone new walks in, the 3-second countdown <b>restarts</b>. The lift only leaves after a quiet gap with nobody arriving.</p>
<p><b>Throttle = a ticket gate that lets one person through every 2 seconds.</b> No matter how big the crowd pushing, the gate opens at a steady rhythm. People in between wait (or, in the simple version, are turned away).</p>
<p>Search-as-you-type? Wait until the user <b>stops</b> typing → debounce. Scroll or mouse-move handler? React at a <b>steady rate</b> while it keeps happening → throttle.</p>`,
    explain: `<p>🟢 <b>The problem.</b> Some browser events fire extremely often: <code>input</code> (every key), <code>scroll</code> and <code>mousemove</code> (up to 60–120 times a second), <code>resize</code>. If each one triggers an API call or heavy layout work, the app stutters and your server melts. Both tools <b>reduce how often a function runs</b>, in different ways.</p>
${H.table(['', 'Debounce', 'Throttle'], [['Runs', 'once, <b>after</b> the events stop for <code>wait</code> ms', 'at most once every <code>wait</code> ms <b>while</b> events continue'], ['Never runs while…', H.c('r', 'events keep coming faster than wait'), H.c('g', 'never starves — guaranteed steady calls')], ['Typical use', 'search box, autosave, resize-end, form validation', 'scroll position, infinite scroll check, drag, game input, analytics pings'], ['Core state', 'one timer', 'last-run time (+ timer for trailing call)']])}
<p>🔵 <b>Debounce in 4 lines of thought:</b> keep one <code>timer</code> in a closure. On every call: <code>clearTimeout(timer)</code> (cancel the old plan), then start a new <code>setTimeout</code> for <code>wait</code> ms that calls <code>fn</code> with the <b>latest</b> arguments. Only the call that is not followed by another within <code>wait</code> survives.</p>
<p>Example with wait = 100 ms, events at 0, 30, 60, 250 ms:</p>
${H.table(['event at', 'what happens', 'timer due at'], [['0', 'start timer', '100'], ['30', 'cancel, restart', '130'], ['60', 'cancel, restart', '160'], ['160', H.c('g', 'timer fires → fn(args of 60)'), '—'], ['250', 'start timer', '350'], ['350', H.c('g', 'timer fires → fn(args of 250)'), '—']])}
<p>🔵 <b>Throttle:</b> remember <code>last</code> = when fn last ran. If <code>now - last &gt;= wait</code>, run immediately (<b>leading</b> call). Otherwise store the latest args and, if no timer is scheduled, schedule one for the moment the window reopens (<b>trailing</b> call), so the final position after a scroll is never lost.</p>
<p>🔵 <b>Must-mention details:</b> preserve <code>this</code> and arguments (<code>fn.apply(this, args)</code> inside a regular function); return a <code>cancel()</code> to clear pending timers (e.g. on component unmount); optional <code>leading</code>/<code>trailing</code> flags; <code>flush()</code> to run the pending call immediately (e.g. autosave before the page closes).</p>`,
    clues: ['"Call the search API only after the user stops typing for 300 ms" → debounce', '"Fire at most once every 200 ms while scrolling / resizing / dragging" → throttle', '"Button gets double-clicked and submits twice" → debounce with leading: true (or disable the button)', '"Make sure the last scroll position is still processed" → throttle with trailing call', '"Should support cancel() / flush() / leading / trailing options" → lodash-style implementation with closure state', '"Avoid too many re-renders / API calls / layout thrash" → rate-limit with debounce/throttle or requestAnimationFrame'],
    code: [{ lang: 'js', run: true, title: 'debounce (with leading, cancel, flush) and throttle (leading + trailing) — runnable', code: `
function debounce(fn, wait, { leading = false } = {}) {
  let timer = null, lastArgs = null, lastThis = null;
  function invoke() {
    const args = lastArgs, ctx = lastThis;
    lastArgs = lastThis = null;
    return fn.apply(ctx, args);
  }
  function debounced(...args) {
    const callNow = leading && timer === null;   // first call of a burst
    lastArgs = args; lastThis = this;
    clearTimeout(timer);                         // restart the quiet-period countdown
    timer = setTimeout(() => {
      timer = null;
      if (!leading && lastArgs) invoke();         // trailing edge
    }, wait);
    if (callNow) invoke();                        // leading edge
  }
  debounced.cancel = () => { clearTimeout(timer); timer = null; lastArgs = lastThis = null; };
  debounced.flush = () => { if (timer !== null && lastArgs) { clearTimeout(timer); timer = null; invoke(); } };
  return debounced;
}

function throttle(fn, wait) {
  let last = -Infinity, timer = null, pendingArgs = null, pendingThis = null;
  function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0 && timer === null) {      // window is open: leading call
      last = now;
      fn.apply(this, args);
    } else {                                     // inside the window: remember latest
      pendingArgs = args; pendingThis = this;
      if (timer === null) {
        timer = setTimeout(() => {               // trailing call when window reopens
          last = Date.now(); timer = null;
          fn.apply(pendingThis, pendingArgs);
          pendingArgs = pendingThis = null;
        }, Math.max(remaining, 0));
      }
    }
  }
  throttled.cancel = () => { clearTimeout(timer); timer = null; pendingArgs = null; };
  return throttled;
}

// ---------- tests with a tiny scheduler ----------
const log = [];
const start = Date.now();
const t = () => Math.round((Date.now() - start) / 50) * 50;   // round to 50 ms buckets
const search = debounce((q) => log.push('search(' + q + ') @~' + t()), 100);
const onScroll = throttle((y) => log.push('scroll(' + y + ') @~' + t()), 100);

['r', 're', 'rea', 'reac', 'react'].forEach((q, i) => setTimeout(() => search(q), i * 20)); // burst
for (let i = 0; i <= 10; i++) setTimeout(() => onScroll(i * 10), i * 25);                  // 250 ms of scrolling

setTimeout(() => {
  console.log(log.filter((s) => s.startsWith('search')));  // ONE call: search(react)
  console.log(log.filter((s) => s.startsWith('scroll')));  // ~4 calls spread over time, last one is scroll(100)
}, 500);
` }],
    codeTitle: ['debounce + throttle'],
    viz: [{
      title: 'Debounce vs throttle on the same event timeline',
      input: 'debounce 100 | 0 30 60 250 280 500',
      inputLabel: 'debounce|throttle  wait  |  event times in ms',
      gen: function (input) {
        var parts = String(input).split('|');
        var head = (parts[0] || '').trim().split(/\s+/);
        var mode = head[0], wait = Number(head[1]);
        if (['debounce', 'throttle'].indexOf(mode) < 0 || !(wait > 0) || wait > 5000) throw new Error('Format: debounce 100 | 0 30 60 250   (or throttle 100 | ...)');
        var ev = parseNums(parts[1], 12).map(function (x) { return Math.max(0, Math.round(x)); }).sort(function (a, b) { return a - b; });
        if (!ev.length) throw new Error('Give at least one event time');
        var f = [], calls = [], evHl = {};
        function evArr(curIdx) {
          var hl = {}; Object.keys(evHl).forEach(function (k) { hl[k] = evHl[k]; });
          var ptr = {}; if (curIdx !== undefined) { hl[curIdx] = 'cur'; ptr[curIdx] = 'now'; }
          return { type: 'array', label: 'events (ms) — green = its args were used, faded = swallowed', values: ev.map(function (x, k) { return 'e' + k + '@' + x; }), hl: hl, ptr: ptr };
        }
        function callTbl() { return { type: 'table', label: 'fn actually ran', columns: ['#', 'at (ms)', 'with args of', 'why'], rows: calls.length ? calls.map(function (c, k) { return [k + 1, c.at, 'e' + c.ev, c.why]; }) : [['—', '—', '—', 'not yet']], hl: calls.length ? (function () { var h = {}; h[calls.length - 1] = 'ok'; return h; })() : {} }; }
        if (mode === 'debounce') {
          var due = null, pend = null;
          f.push(fr('Debounce with wait = ' + wait + ' ms. Rule: every event <b>cancels</b> the old timer and starts a new one. fn runs only after a quiet gap of ' + wait + ' ms.', [evArr(), vp({ timer: 'none', 'due at': '—' }), callTbl(), cp(DEB_SRC, { 1: 'cur' })]));
          for (var k = 0; k < ev.length; k++) {
            if (due !== null && due <= ev[k]) {
              calls.push({ at: due, ev: pend, why: 'quiet for ' + wait + ' ms' }); evHl[pend] = 'ok';
              f.push(fr('t = ' + due + ': no new event arrived in time, so the timer <b>fires</b>: fn runs with the args of e' + pend + '.', [evArr(), vp({ timer: 'fired', 'due at': due }, { timer: 'ok' }), callTbl(), cp(DEB_SRC, { 6: 'ok', 7: 'ok' })]));
              due = null; pend = null;
            }
            var cancelled = pend;
            if (cancelled !== null) evHl[cancelled] = 'done';
            due = ev[k] + wait; pend = k;
            f.push(fr('t = ' + ev[k] + ': event e' + k + '. ' + (cancelled !== null ? '<span class="c-r">clearTimeout</span> cancels the plan for e' + cancelled + ' (its args are dropped). ' : 'No timer running. ') + 'New timer due at <b>' + due + '</b>.', [evArr(k), vp({ timer: 'running', 'due at': due, 'latest args': 'e' + k }, { 'due at': 'cur' }), callTbl(), cp(DEB_SRC, { 4: cancelled !== null ? 'bad' : 'done', 5: 'cur' })]));
          }
          calls.push({ at: due, ev: pend, why: 'quiet after last event' }); evHl[pend] = 'ok';
          f.push(fr('t = ' + due + ': the final timer fires → fn(args of e' + pend + '). Total runs: <b>' + calls.length + '</b> for ' + ev.length + ' events.', [evArr(), vp({ timer: 'none', runs: calls.length, events: ev.length }, { runs: 'sel' }), callTbl(), cp(DEB_SRC, { 7: 'ok' })]));
        } else {
          var last = -Infinity, tdue = null, tp = null;
          f.push(fr('Throttle (leading + trailing) with wait = ' + wait + ' ms. Rule: run now if the window is open; otherwise remember the latest args and run them when the window reopens.', [evArr(), vp({ last: '-∞', 'trailing timer': 'none' }), callTbl(), cp(THR_SRC, { 2: 'cur' })]));
          for (var j = 0; j < ev.length; j++) {
            if (tdue !== null && tdue <= ev[j]) {
              calls.push({ at: tdue, ev: tp, why: 'trailing call' }); evHl[tp] = 'ok'; last = tdue;
              f.push(fr('t = ' + tdue + ': the window reopens and the <b>trailing</b> timer runs fn with the latest stored args (e' + tp + '). last = ' + tdue + '.', [evArr(), vp({ last: last, 'trailing timer': 'fired' }, { last: 'ok' }), callTbl(), cp(THR_SRC, { 10: 'ok', 11: 'ok' })]));
              tdue = null; tp = null;
            }
            var t0 = ev[j];
            if (t0 - last >= wait && tdue === null) {
              last = t0; calls.push({ at: t0, ev: j, why: 'leading (window open)' }); evHl[j] = 'ok';
              f.push(fr('t = ' + t0 + ': e' + j + ' — window is open (' + (isFinite(t0 - wait) && calls.length > 1 ? 'now − last ≥ ' + wait : 'first call') + '). Run fn <b>immediately</b>. last = ' + t0 + '.', [evArr(j), vp({ last: last, 'trailing timer': 'none' }, { last: 'ok' }), callTbl(), cp(THR_SRC, { 5: 'ok', 6: 'ok' })]));
            } else {
              if (tp !== null) evHl[tp] = 'done';
              tp = j;
              var created = tdue === null;
              if (created) tdue = last + wait;
              f.push(fr('t = ' + t0 + ': e' + j + ' — inside the window (only ' + (t0 - last) + ' ms since last run). Store its args as <b>pending</b>' + (created ? ' and schedule the trailing call for t = ' + tdue + '.' : '; a trailing timer is already set for t = ' + tdue + ' (older pending args are replaced).'), [evArr(j), vp({ last: last, 'trailing timer': 'due ' + tdue, pending: 'e' + j }, { pending: 'cur' }), callTbl(), cp(THR_SRC, { 8: 'cur', 9: created ? 'cur' : 'done' })]));
            }
          }
          if (tdue !== null) {
            calls.push({ at: tdue, ev: tp, why: 'trailing call' }); evHl[tp] = 'ok';
            f.push(fr('t = ' + tdue + ': final trailing call with e' + tp + ' — the last position is never lost.', [evArr(), vp({ last: tdue, 'trailing timer': 'fired' }), callTbl(), cp(THR_SRC, { 11: 'ok' })]));
          }
          f.push(fr('Summary: <b>' + calls.length + '</b> runs for ' + ev.length + ' events, never closer than ' + wait + ' ms apart. Compare with debounce on the same input: debounce waits for silence, throttle keeps a steady beat.', [evArr(), callTbl()]));
        }
        return f;
      }
    }],
    examples: [
      { title: 'Search box: debounce the API call', html: `<p>Typing "react" quickly fires 5 input events. With a 300 ms debounce only <b>one</b> request goes out, for the final text. Combine with an <b>AbortController</b> so a slow older response cannot overwrite a newer one.</p>`, code: { lang: 'js', run: true, code: `
function debounce(fn, wait) {
  let timer;
  return function (...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), wait); };
}
const requests = [];
const fetchSuggestions = debounce((q) => requests.push(q), 30);
'react'.split('').forEach((_, i, a) => fetchSuggestions(a.slice(0, i + 1).join(''))); // r, re, rea, reac, react
setTimeout(() => console.log('requests sent:', requests), 80); // ['react']
` } },
      { title: 'Losing this: why we use a regular function inside', html: `<p>If the returned wrapper is an <b>arrow</b>, <code>this</code> comes from where <code>debounce</code> was defined, not from the object the method is called on. Use <code>function (...args)</code> and <code>fn.apply(this, args)</code>.</p>`, code: { lang: 'js', run: true, code: `
function debounce(fn, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait); // arrow inside keeps the wrapper's this
  };
}
const editor = {
  name: 'doc-1',
  save: debounce(function () { console.log('saving', this.name); }, 10)
};
editor.save(); editor.save(); // saving doc-1 (once)
` } },
      { title: 'Throttle with requestAnimationFrame (frame-rate throttle)', html: `<p>For visual updates (moving a tooltip, parallax), throttling to the display's frame rate with <code>requestAnimationFrame</code> is ideal: at most one update per frame, synced with paint. Shown as code (needs a browser).</p>`, code: `
function rafThrottle(fn) {
  let scheduled = false, lastArgs;
  return function (...args) {
    lastArgs = args;
    if (scheduled) return;           // already have a frame booked
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      fn.apply(this, lastArgs);      // latest args, once per frame
    });
  };
}
window.addEventListener('mousemove', rafThrottle((e) => {
  document.title = e.clientX + ',' + e.clientY;
}));
` },
      { title: 'Leading-edge debounce to stop double submits', html: `<p>With <code>leading: true</code> the first click runs <b>immediately</b>, and further clicks within the wait are ignored. Great for "Pay now" buttons (but also disable the button and make the backend idempotent!).</p>`, code: { lang: 'js', run: true, code: `
function debounceLeading(fn, wait) {
  let timer = null;
  return function (...args) {
    if (timer === null) fn.apply(this, args);   // first click in a burst runs now
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; }, wait);
  };
}
let payments = 0;
const pay = debounceLeading(() => payments++, 50);
pay(); pay(); pay();                 // frantic triple-click
setTimeout(() => { pay(); console.log('payments:', payments); }, 100); // 2 (one per burst)
` } }
    ],
    deepDive: `<p>🟣 <b>lodash's model (the gold standard):</b> <code>_.debounce(fn, wait, { leading, trailing, maxWait })</code>. Interesting facts:</p>
<ul><li><b><code>_.throttle</code> is implemented as <code>debounce</code> with <code>maxWait = wait</code></b>. maxWait means "even if events never stop, run at least every maxWait ms" — which is exactly throttling.</li>
<li>lodash does <b>not</b> clear/re-create a timer on every call. It records <code>lastCallTime</code> and, when the timer fires, checks whether enough quiet time has passed; if not, it re-arms for the remaining time. That avoids thousands of <code>clearTimeout/setTimeout</code> pairs during a mousemove storm — a nice performance detail.</li>
<li>If both <code>leading</code> and <code>trailing</code> are true, the trailing call only happens if the function was called <b>again</b> during the wait.</li></ul>
<p><b>Timers are not precise.</b> <code>setTimeout(fn, 100)</code> means "not earlier than 100 ms". Busy main threads, nested timers clamped to ≥ 4 ms, and background tabs (throttled to ~1 s, or more aggressively by Chrome's intensive throttling) all delay it. Never use debounce/throttle for correctness — only for rate.</p>
<p><b>Memory and lifecycle:</b> a pending timer holds references to <code>args</code> and <code>this</code>. In React/Vue, create the debounced function once (<code>useMemo</code>/<code>useRef</code>), and call <code>cancel()</code> in cleanup, otherwise a timer may call <code>setState</code> on an unmounted component or keep a large object alive.</p>
<p><b>Server side:</b> the same ideas appear as <b>rate limiting</b> (token bucket ≈ throttle), <b>batching</b> writes (debounce a flush), and <b>coalescing</b> duplicate requests. In UIs, also consider <code>requestIdleCallback</code>, <code>IntersectionObserver</code> (instead of throttled scroll checks), and passive event listeners.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> any assistant writes the 5-line debounce. Interviewers now ask for the <b>harder variants</b>: leading/trailing, cancel/flush, maxWait, throttle in terms of debounce, preserving <code>this</code>, returning the last result, and testing with <b>fake timers</b>.</p>
<p><b>Use AI as a partner:</b> <code>Write Jest tests using jest.useFakeTimers() for my debounce: leading, trailing, cancel, flush, this-binding. Use advanceTimersByTime.</code> Fake timers make time deterministic — a skill that matters more than typing the function.</p>
<p><b>Where AI goes wrong:</b> returns an arrow wrapper (loses <code>this</code>), creates the debounced function <i>inside</i> a React render (new timer every render → it never debounces), mixes up which one to use ("throttle the search box"), or drops the trailing call so the final scroll position is lost.</p>
<p><b>What you must still own:</b> picking debounce vs throttle vs rAF vs IntersectionObserver for a given UX, and explaining the timeline on a whiteboard like the visualizer above.</p>`,
    problems: [{
      title: 'Debounce with cancel() and flush()', level: 'Medium', tags: ['closure', 'timers', 'debounce'], companies: ['Microsoft', 'Uber', 'Zomato', 'Adobe'],
      statement: `<p>Implement <code>debounce(fn, wait)</code> returning a function <code>d</code> that delays calling <code>fn</code> until <code>wait</code> ms have passed since the <b>last</b> call to <code>d</code>. <code>fn</code> must receive the latest arguments and the <code>this</code> of the latest call. Also add <code>d.cancel()</code> (drop the pending call) and <code>d.flush()</code> (run the pending call right now, if any).</p>`,
      constraints: `wait ≥ 0. d may be called thousands of times per second. Must work as an object method.`,
      example: `<p>wait = 100. Calls at 0 ms ("a"), 50 ms ("b"), 120 ms ("c").<br>Timeline: "a" timer due 100 → cancelled at 50; "b" due 150 → cancelled at 120; "c" due 220 → ${H.c('g', 'fn("c") runs at 220')}. Only one call.<br>If <code>flush()</code> is called at 130 → ${H.c('g', 'fn("c") runs at 130')} and nothing at 220.</p>`,
      brute: { why: `<p>A naive version sets a new timer on every call <b>without clearing</b> the old one, so every call still runs fn (just later) — no debouncing. Another common bug: storing <code>args</code> but not <code>this</code>, or using an arrow wrapper.</p>`, code: `
function brokenDebounce(fn, wait) {
  return (...args) => {
    setTimeout(() => fn(...args), wait); // never cancels: N calls -> N runs; also loses this
  };
}
` },
      mcq: { q: 'Which state must live in the closure for cancel/flush to work?', options: ['the timer id plus the latest args and this', 'only the timer id', 'an array of every call', 'nothing — use a global variable'], answer: 0, explain: 'flush needs the pending args/this to call fn immediately; cancel needs the timer id and should drop the pending args.' },
      hints: [`<p>Hint 1: one timer id in the closure. Every call: clear it, then set a new one. That is the whole debounce.</p>`, `<p>Hint 2: store <code>lastArgs</code> and <code>lastThis</code> on every call; the timer callback calls a helper <code>invoke()</code> that uses and then clears them.</p>`, `<p>Hint 3: <code>cancel</code> = clearTimeout + reset state. <code>flush</code> = if a timer is pending: clearTimeout, reset timer, invoke(). Use a regular function wrapper so <code>this</code> is the caller's.</p>`],
      solution: {
        approach: `<p>Closure holds <code>timer</code>, <code>lastArgs</code>, <code>lastThis</code>. The wrapper records the latest call and restarts the countdown. A shared <code>invoke()</code> runs fn and clears the pending state; <code>cancel</code> and <code>flush</code> manipulate the same state.</p>`,
        code: { lang: 'js', run: true, code: `
function debounce(fn, wait) {
  let timer = null, lastArgs = null, lastThis = null;
  function invoke() {
    const args = lastArgs, ctx = lastThis;
    lastArgs = lastThis = null;
    timer = null;
    return fn.apply(ctx, args);
  }
  function d(...args) {
    lastArgs = args; lastThis = this;
    clearTimeout(timer);
    timer = setTimeout(invoke, wait);
  }
  d.cancel = function () { clearTimeout(timer); timer = null; lastArgs = lastThis = null; };
  d.flush = function () {
    if (timer === null) return undefined;   // nothing pending
    clearTimeout(timer);
    return invoke();
  };
  return d;
}

const out = [];
const obj = { id: 'X', log: debounce(function (v) { out.push(this.id + ':' + v); }, 30) };
obj.log('a'); obj.log('b'); obj.log('c');          // burst -> only 'c'
setTimeout(() => {
  obj.log('d'); obj.log.flush();                   // flushed immediately
  obj.log('e'); obj.log.cancel();                  // dropped
}, 60);
setTimeout(() => console.log(out), 150);           // ['X:c', 'X:d']
` },
        dry: { head: ['time', 'call', 'timer', 'lastArgs', 'fn runs?'], rows: [['0', "log('a')", 'due 30', "['a']", 'no'], ['0', "log('b'), log('c')", 'cleared → due 30', "['c']", 'no'], ['30', 'timer fires', 'null', 'null', "<span class=\"c-g\">X:c</span>"], ['60', "log('d') + flush()", 'cleared → null', "['d'] → null", "<span class=\"c-g\">X:d</span>"], ['60', "log('e') + cancel()", 'cleared', 'null', '<span class="c-r">dropped</span>']] },
        complexity: `<p>O(1) work per call (one clearTimeout + one setTimeout). O(1) memory: just the latest args.</p>`,
        followUps: ['Add <code>{ leading, trailing, maxWait }</code> options like lodash.', 'Return a Promise that resolves with fn\'s result for every caller in the burst.', 'Implement throttle using your debounce + maxWait.']
      }
    }]
  });

  /* ================= TOPIC 5: deep clone & deep equal ================= */
  var CLONE_SRC = [
    'function deepClone(value, seen = new WeakMap()) {',
    '  if (value === null || typeof value !== "object") return value;',
    '  if (seen.has(value)) return seen.get(value);   // cycle!',
    '  const copy = Array.isArray(value) ? [] : {};',
    '  seen.set(value, copy);                       // register BEFORE recursing',
    '  for (const key of Object.keys(value)) {',
    '    copy[key] = deepClone(value[key], seen);',
    '  }',
    '  return copy;',
    '}'
  ].join('\n');
  var EQ_SRC = [
    'function deepEqual(a, b) {',
    '  if (Object.is(a, b)) return true;',
    '  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;',
    '  if (Array.isArray(a) !== Array.isArray(b)) return false;',
    '  const ka = Object.keys(a), kb = Object.keys(b);',
    '  if (ka.length !== kb.length) return false;',
    '  for (const k of ka) {',
    '    if (!Object.hasOwn(b, k) || !deepEqual(a[k], b[k])) return false;',
    '  }',
    '  return true;',
    '}'
  ].join('\n');

  function shortJson(v) { try { var s = JSON.stringify(v); return s && s.length > 60 ? s.slice(0, 57) + '...' : String(s); } catch (e) { return '[cyclic]'; } }
  function parseJsonInput(s, what) {
    var v;
    try { v = JSON.parse(String(s).trim()); } catch (e) { throw new Error(what + ' must be valid JSON, e.g. {"a":1,"b":[2,3]}'); }
    if (String(s).length > 160) throw new Error('Keep ' + what + ' under 160 characters');
    return v;
  }

  topics.push({
    title: 'Deep Clone and Deep Equal',
    analogy: `<p><b>Shallow copy</b> is photocopying the <b>cover page</b> of a folder: you get a new cover, but the papers inside are still the <i>same</i> papers — scribble on one and the "copy" changes too. <b>Deep copy</b> is photocopying <b>every page in every sub-folder</b>: a fully independent folder.</p>
<p><b>Deep equal</b> is two teachers checking whether two folders have <b>the same content page by page</b>, even though they are different physical folders. <code>===</code> only asks "is it literally the same folder?"</p>
<p>And if a page says "see page 1" (a <b>cycle</b>), a careless copier loops forever. A smart copier keeps a <b>notebook of pages already copied</b> — that notebook is the <code>WeakMap</code>.</p>`,
    explain: `<p>🟢 <b>Why we need it.</b> Objects and arrays are stored <b>by reference</b>: a variable holds an <i>address</i>, not the data. <code>{...obj}</code>, <code>Object.assign</code> and <code>arr.slice()</code> copy only the <b>first level</b>. Nested objects are still shared.</p>
${H.table(['Way to copy', 'Depth', 'Breaks on'], [['<code>{...o}</code>, <code>Object.assign</code>, <code>slice</code>', H.c('y', '1 level'), 'nested objects stay shared'], ['<code>JSON.parse(JSON.stringify(o))</code>', 'deep', H.c('r', 'Date → string, undefined/functions/Symbols dropped, NaN/Infinity → null, Map/Set → {}, cycles → throws, BigInt → throws')], ['<code>structuredClone(o)</code> (built-in since 2022)', 'deep', 'functions, DOM nodes, class prototypes (instances become plain objects); handles Date, Map, Set, RegExp, cycles ✔'], ['Your own <code>deepClone</code>', 'deep', 'whatever you choose to support']])}
<p>🔵 <b>The recursive recipe for deepClone:</b></p>
<ol><li><b>Primitives</b> (number, string, boolean, null, undefined, symbol, bigint) are immutable → return as is.</li>
<li>If we have <b>already cloned</b> this object (it is in <code>seen</code>), return that clone → handles <b>cycles</b> and <b>shared references</b> (two paths pointing at the same object stay pointing at one clone).</li>
<li>Create an empty container of the right type (array or object; extra branches for Date, RegExp, Map, Set).</li>
<li><b>Register it in <code>seen</code> before recursing</b> — otherwise a cycle would recurse forever before the entry exists.</li>
<li>Copy each key by calling deepClone recursively.</li></ol>
<p>🔵 <b>deepEqual recipe:</b> (1) <code>Object.is(a, b)</code> → true (also makes <code>NaN</code> equal <code>NaN</code>); (2) if either is not an object → false; (3) both arrays or both not; (4) same number of own keys; (5) every key exists in both and values are deepEqual. Extras for experts: compare Dates by <code>getTime()</code>, RegExps by <code>source</code> + <code>flags</code>, Maps/Sets by size and entries, prototypes with <code>Object.getPrototypeOf</code>, and cycles with a pair-memo.</p>
${H.table(['a', 'b', '===', 'deepEqual'], [['<code>{x:1}</code>', '<code>{x:1}</code>', H.c('r', 'false'), H.c('g', 'true')], ['<code>[1,[2]]</code>', '<code>[1,[2]]</code>', H.c('r', 'false'), H.c('g', 'true')], ['<code>NaN</code>', '<code>NaN</code>', H.c('r', 'false'), H.c('g', 'true')], ['<code>{a:undefined}</code>', '<code>{}</code>', '—', H.c('r', 'false (key counts differ)')]])}`,
    clues: ['"Copy this nested object so changes to the copy don\'t affect the original" → deep clone', '"Object may contain circular references" → WeakMap of visited objects, register before recursion', '"Should handle Date, RegExp, Map, Set" → type branches (or structuredClone)', '"Implement isEqual / deep compare two objects / check if state changed" → deepEqual', '"Why does JSON.parse(JSON.stringify()) lose my dates?" → JSON clone limitations', '"Two keys point to the same object — keep that in the copy" → seen map preserves shared references'],
    code: [{ lang: 'js', run: true, title: 'Production-grade deepClone + deepEqual (runnable)', code: `
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;  // primitives & functions
  if (seen.has(value)) return seen.get(value);                    // cycle / shared ref

  let copy;
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) { copy = new RegExp(value.source, value.flags); copy.lastIndex = value.lastIndex; return copy; }
  if (value instanceof Map) {
    copy = new Map(); seen.set(value, copy);
    value.forEach((v, k) => copy.set(deepClone(k, seen), deepClone(v, seen)));
    return copy;
  }
  if (value instanceof Set) {
    copy = new Set(); seen.set(value, copy);
    value.forEach((v) => copy.add(deepClone(v, seen)));
    return copy;
  }
  // arrays and plain/class objects: keep the prototype so methods still work
  copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);                                          // BEFORE recursing
  for (const key of Reflect.ownKeys(value)) {                     // includes symbol keys
    const desc = Object.getOwnPropertyDescriptor(value, key);
    if (desc && desc.enumerable) copy[key] = deepClone(value[key], seen);
  }
  return copy;
}

function deepEqual(a, b, seen = new Map()) {
  if (Object.is(a, b)) return true;                               // same ref, or NaN/NaN
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (a instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof RegExp) return a.source === b.source && a.flags === b.flags;
  // cycle guard: if we're already comparing this pair, assume equal for now
  if (seen.get(a) === b) return true;
  seen.set(a, b);
  if (a instanceof Map || a instanceof Set) {
    if (a.size !== b.size) return false;
    if (a instanceof Set) return [...a].every((x) => b.has(x) || [...b].some((y) => deepEqual(x, y, seen)));
    for (const [k, v] of a) if (!b.has(k) || !deepEqual(v, b.get(k), seen)) return false;
    return true;
  }
  const ka = Reflect.ownKeys(a), kb = Reflect.ownKeys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual(a[k], b[k], seen)) return false;
  }
  return true;
}

// ---------- tests ----------
const original = {
  name: 'Asha', born: new Date('2000-01-02'), tags: new Set(['a', 'b']),
  scores: new Map([['math', [90, 95]]]), re: /ab+c/gi, nested: { deep: { n: 1 } }
};
original.self = original;                     // cycle
original.alias = original.nested;             // shared reference

const copy = deepClone(original);
copy.nested.deep.n = 999;
console.log(original.nested.deep.n);                      // 1  (independent)
console.log(copy.self === copy, copy.alias === copy.nested); // true true (cycle + sharing preserved)
console.log(copy.born instanceof Date, copy.born !== original.born); // true true
console.log(deepEqual({ a: [1, { b: NaN }] }, { a: [1, { b: NaN }] })); // true
console.log(deepEqual({ a: 1, b: undefined }, { a: 1 }));             // false
console.log(deepEqual(new Map([['k', [1]]]), new Map([['k', [1]]])));  // true
const c1 = { v: 1 }; c1.me = c1; const c2 = { v: 1 }; c2.me = c2;
console.log(deepEqual(c1, c2));                                         // true (no infinite loop)
console.log(typeof structuredClone === 'function' ? structuredClone({ d: new Date(0) }).d instanceof Date : 'n/a'); // true
` }],
    codeTitle: ['deepClone + deepEqual'],
    viz: [{
      title: 'deepClone recursion with the seen WeakMap (cycle safe)',
      input: '{"a":1,"b":{"c":[2,3]}} | cycle',
      inputLabel: 'JSON object | type "cycle" to add obj.self = obj',
      gen: function (input) {
        var parts = String(input).split('|');
        var root = parseJsonInput(parts[0], 'The object');
        if (root === null || typeof root !== 'object') throw new Error('Give an object or array, e.g. {"a":1,"b":{"c":[2]}}');
        var cyc = /cycle/i.test(parts[1] || '');
        if (cyc && !Array.isArray(root)) root.self = root;
        var f = [], stack = [], seenNames = [], ids = new Map(), steps = 0;
        function nameOf(v) { if (!ids.has(v)) ids.set(v, (Array.isArray(v) ? 'arr' : 'obj') + '#' + (ids.size + 1)); return ids.get(v); }
        function seenEntries() { return seenNames.map(function (n) { return [n, 'clone of ' + n]; }); }
        function walk(v, path) {
          if (++steps > 40) return;
          if (v === null || typeof v !== 'object') {
            f.push(fr('<code>' + esc(path) + '</code> = <b>' + esc(JSON.stringify(v)) + '</b> is a primitive → return it as is (primitives are immutable, so sharing is safe).', [cp(CLONE_SRC, { 2: 'ok' }), { type: 'stack', label: 'Recursion stack', items: stack.concat([path]), hl: (function () { var s = {}; s[stack.length] = 'cur'; return s; })() }, { type: 'map', label: 'seen (WeakMap: original → clone)', entries: seenEntries() }]));
            return;
          }
          var nm = nameOf(v);
          if (seenNames.indexOf(nm) >= 0) {
            var h = {}; h[nm] = 'sel';
            f.push(fr('<code>' + esc(path) + '</code> points to <b>' + nm + '</b>, which is <b>already in seen</b>. <span class="c-g">Return the existing clone</span> instead of recursing → no infinite loop, and the clone gets the same cycle.', [cp(CLONE_SRC, { 3: 'sel' }), { type: 'stack', label: 'Recursion stack', items: stack.concat([path]) }, { type: 'map', label: 'seen (WeakMap: original → clone)', entries: seenEntries(), hl: h }]));
            return;
          }
          seenNames.push(nm);
          stack.push(path);
          var hh = {}; hh[nm] = 'ok';
          f.push(fr('Enter <code>' + esc(path) + '</code> (' + nm + '). Make an empty ' + (Array.isArray(v) ? 'array' : 'object') + ' and <b>register it in seen first</b>, then copy its keys: ' + esc(Object.keys(v).join(', ') || '(none)') + '.', [cp(CLONE_SRC, { 4: 'cur', 5: 'ok' }), { type: 'stack', label: 'Recursion stack', items: stack.slice(), hl: (function () { var s = {}; s[stack.length - 1] = 'cur'; return s; })() }, { type: 'map', label: 'seen (WeakMap: original → clone)', entries: seenEntries(), hl: hh }]));
          Object.keys(v).forEach(function (k) { walk(v[k], path + (Array.isArray(v) ? '[' + k + ']' : '.' + k)); });
          stack.pop();
          f.push(fr('All keys of <code>' + esc(path) + '</code> copied → return its clone to the caller (pop the stack).', [cp(CLONE_SRC, { 9: 'ok' }), { type: 'stack', label: 'Recursion stack', items: stack.slice() }, { type: 'map', label: 'seen (WeakMap: original → clone)', entries: seenEntries() }]));
        }
        walk(root, 'root');
        f.push(fr('Finished. Every object was cloned <b>exactly once</b> (' + seenNames.length + ' entries in seen). ' + (cyc ? 'The clone\'s <code>self</code> points to the clone, not the original — the cycle is reproduced.' : 'Try adding "| cycle" to the input to see the cycle guard.'), [tx('<b>Clone (JSON view):</b> <code>' + esc(cyc ? '(cyclic — JSON.stringify would throw)' : shortJson(root)) + '</code><br>Without <code>seen</code>, a cycle means infinite recursion → <span class="c-r">RangeError: Maximum call stack size exceeded</span>.', 'Result'), { type: 'map', label: 'seen (final)', entries: seenEntries() }]));
        return f;
      }
    }, {
      title: 'deepEqual: walking two values side by side',
      input: '{"a":[1,2],"b":{"c":3}} ; {"a":[1,2],"b":{"c":4}}',
      inputLabel: 'JSON value A ; JSON value B',
      gen: function (input) {
        var parts = String(input).split(';');
        if (parts.length !== 2) throw new Error('Separate the two JSON values with ; e.g. {"a":1} ; {"a":2}');
        var A = parseJsonInput(parts[0], 'Value A'), B = parseJsonInput(parts[1], 'Value B');
        var rows = [], f = [], stop = false;
        function snap(narr, hlLine, cls) {
          var hl = {}; if (rows.length) hl[rows.length - 1] = cls === 'bad' ? 'bad' : (cls === 'ok' ? 'ok' : 'cur');
          var code = {}; code[hlLine] = cls || 'cur';
          f.push(fr(narr, [cp(EQ_SRC, code), { type: 'table', label: 'Comparisons so far', columns: ['path', 'a', 'b', 'verdict'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }]));
        }
        function eq(a, b, path) {
          if (stop || rows.length > 30) return false;
          if (a === b) { rows.push([path, shortJson(a), shortJson(b), 'same → true']); snap('<code>' + esc(path) + '</code>: Object.is says identical → <b>true</b>.', 2, 'ok'); return true; }
          if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) { rows.push([path, shortJson(a), shortJson(b), 'different primitive → false']); snap('<code>' + esc(path) + '</code>: at least one is a primitive and they differ → <span class="c-r">false</span>. We can stop immediately (short-circuit).', 3, 'bad'); stop = true; return false; }
          if (Array.isArray(a) !== Array.isArray(b)) { rows.push([path, Array.isArray(a) ? 'array' : 'object', Array.isArray(b) ? 'array' : 'object', 'kind differs → false']); snap('<code>' + esc(path) + '</code>: one is an array, the other a plain object → false.', 4, 'bad'); stop = true; return false; }
          var ka = Object.keys(a), kb = Object.keys(b);
          if (ka.length !== kb.length) { rows.push([path, ka.length + ' keys', kb.length + ' keys', 'key count differs → false']); snap('<code>' + esc(path) + '</code>: different number of keys → false, without looking at values.', 6, 'bad'); stop = true; return false; }
          rows.push([path, (Array.isArray(a) ? 'array ' : 'object ') + ka.length + ' keys', (Array.isArray(b) ? 'array ' : 'object ') + kb.length + ' keys', 'recurse into keys']);
          snap('<code>' + esc(path) + '</code>: both containers with ' + ka.length + ' keys → compare each key recursively.', 7, 'cur');
          for (var i = 0; i < ka.length; i++) {
            var k = ka[i], p = path + (Array.isArray(a) ? '[' + k + ']' : '.' + k);
            if (!Object.prototype.hasOwnProperty.call(b, k)) { rows.push([p, shortJson(a[k]), '(missing)', 'key missing in b → false']); snap('Key <code>' + esc(k) + '</code> is missing in b → false.', 8, 'bad'); stop = true; return false; }
            if (!eq(a[k], b[k], p)) return false;
          }
          return true;
        }
        var res = eq(A, B, 'root');
        f.push(fr('Result: <b>' + (res ? '<span class="c-g">deepEqual = true</span>' : '<span class="c-r">deepEqual = false</span>') + '</b>. Note <code>A === B</code> is false for any two separately created objects — deepEqual compares <i>content</i>.', [vp({ deepEqual: res, '===': false }, { deepEqual: res ? 'ok' : 'bad' }), { type: 'table', label: 'All comparisons', columns: ['path', 'a', 'b', 'verdict'], rows: rows }]));
        while (f.length < 4) f.push(fr('Try values that differ deep inside, e.g. change one number in a nested array.', [tx('Comparisons made: ' + rows.length)]));
        return f;
      }
    }],
    examples: [
      { title: 'The shallow-copy bug in React state', html: `<p>Spreading copies only one level. Mutating a nested field changes the original too — React then sees the "same" nested object and may not re-render the parts that depend on it.</p>`, code: { lang: 'js', run: true, code: `
const state = { user: { name: 'Asha', prefs: { theme: 'dark' } } };
const shallow = { ...state };
shallow.user.prefs.theme = 'light';           // oops: mutates the original
console.log(state.user.prefs.theme);           // light

const state2 = { user: { name: 'Asha', prefs: { theme: 'dark' } } };
const updated = { ...state2, user: { ...state2.user, prefs: { ...state2.user.prefs, theme: 'light' } } };
console.log(state2.user.prefs.theme, updated.user.prefs.theme); // dark light (immutable update)
` } },
      { title: 'What JSON cloning silently destroys', html: `<p>The JSON trick is fast and fine for plain data from an API, but know its losses by heart — it is a favourite interview question.</p>`, code: { lang: 'js', run: true, code: `
const src = { d: new Date(0), u: undefined, f() {}, n: NaN, inf: Infinity, s: new Set([1]), m: new Map([[1, 2]]) };
const viaJson = JSON.parse(JSON.stringify(src));
console.log(viaJson); // { d: '1970-01-01T00:00:00.000Z', n: null, inf: null, s: {}, m: {} }  (u and f are gone)
const cyclic = {}; cyclic.me = cyclic;
try { JSON.stringify(cyclic); } catch (e) { console.log(e.name); } // TypeError
` } },
      { title: 'structuredClone: the built-in deep copy', html: `<p>Available in all modern browsers and Node 17+. Handles cycles, Date, Map, Set, RegExp, typed arrays, Blob/File (browser). Throws <code>DataCloneError</code> on functions and DOM nodes, and class instances come back as plain objects (prototype lost).</p>`, code: { lang: 'js', run: true, code: `
class Point { constructor(x) { this.x = x; } len() { return Math.abs(this.x); } }
const o = { when: new Date(5), tags: new Set(['x']), p: new Point(3) };
o.loop = o;
const c = structuredClone(o);
console.log(c.when instanceof Date, c.tags.has('x'), c.loop === c); // true true true
console.log(c.p instanceof Point, c.p.x);                             // false 3  (prototype lost)
try { structuredClone({ fn() {} }); } catch (e) { console.log(e.name); } // DataCloneError
` } },
      { title: 'Shared references: one object, two paths', html: `<p>If <code>a.left</code> and <code>a.right</code> point to the <b>same</b> object, a naive clone produces two separate copies. The <code>seen</code> map keeps the sharing intact — important for graphs and normalized state.</p>`, code: { lang: 'js', run: true, code: `
function naiveClone(v) {
  if (v === null || typeof v !== 'object') return v;
  const out = Array.isArray(v) ? [] : {};
  for (const k of Object.keys(v)) out[k] = naiveClone(v[k]);
  return out;
}
function clone(v, seen = new WeakMap()) {
  if (v === null || typeof v !== 'object') return v;
  if (seen.has(v)) return seen.get(v);
  const out = Array.isArray(v) ? [] : {};
  seen.set(v, out);
  for (const k of Object.keys(v)) out[k] = clone(v[k], seen);
  return out;
}
const shared = { n: 1 };
const tree = { left: shared, right: shared };
const a = naiveClone(tree), b = clone(tree);
console.log(a.left === a.right, b.left === b.right); // false true
` } }
    ],
    deepDive: `<p>🟣 <b>Why WeakMap and not Map for <code>seen</code>?</b> A WeakMap holds its keys <i>weakly</i>: it does not stop the originals from being garbage-collected, and it only accepts objects as keys (exactly what we store). For a single clone call either works because the map dies at the end; WeakMap is the idiomatic signal "this is a cache keyed by object identity".</p>
<p><b>Recursion depth:</b> a 100 000-node linked list (<code>{next: {next: ...}}</code>) blows the call stack (~10 k frames in many engines). The robust version uses an <b>explicit stack/queue</b> (iterative DFS/BFS): push <code>[source, targetParent, key]</code> tuples and loop — same idea as converting any recursion to iteration.</p>
<p><b>Property fidelity:</b> a truly faithful clone also copies getters/setters (via <code>Object.getOwnPropertyDescriptors</code> + <code>Object.defineProperties</code>), non-enumerable props, frozen/sealed state, and the prototype. Libraries (lodash <code>cloneDeep</code>) copy typed arrays, ArrayBuffers, arguments objects, boxed primitives and more — around 300 lines.</p>
<p><b>structuredClone internals:</b> it uses the HTML "structured serialize" algorithm — the same one used by <code>postMessage</code>, IndexedDB and Web Workers. That is why it cannot clone functions: a function's closure (its captured scope) cannot be serialized.</p>
<p><b>deepEqual pitfalls:</b> <code>+0</code> vs <code>-0</code> (<code>Object.is</code> says different; most libraries treat them equal for data), key <b>order</b> (deepEqual ignores order; <code>JSON.stringify(a) === JSON.stringify(b)</code> does not — another reason not to compare via JSON), sparse arrays (<code>[ , 1]</code> vs <code>[undefined, 1]</code> differ in keys), and Set equality with object members (O(n²) unless you canonicalize). Cycles need a <b>pair</b> memo (a→b) because the same <i>a</i> could be compared with different <i>b</i>s.</p>
<p><b>Performance in UI:</b> deep equality on every render is expensive. React deliberately uses <b>shallow</b> comparison (<code>Object.is</code> per prop) and relies on immutable updates — so a changed object always means a new reference. Immutable data makes "did it change?" O(1).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI will often suggest <code>structuredClone</code> or lodash — correct in production. In interviews you are expected to <b>write it by hand</b> and then say "in real code I'd use structuredClone, except for class instances or functions." That two-level answer is the expert signal.</p>
<p><b>Use AI as a partner:</b> <code>Generate adversarial inputs for my deepClone: cycles, shared refs, Date, Map with object keys, Symbol keys, getters, class instances, 50k-deep nesting. For each, say what a correct clone should preserve.</code></p>
<p><b>Where AI goes wrong:</b> registers the object in <code>seen</code> <i>after</i> the recursion (infinite loop on cycles), uses <code>for...in</code> (copies inherited enumerable props), compares with <code>JSON.stringify</code> (key order + Date issues), or forgets <code>NaN</code>.</p>
<p><b>What you must still own:</b> deciding what "equal" and "copy" mean for <i>your</i> domain (e.g. ignore timestamps, treat -0 as 0) — no generic utility can know that.</p>`,
    problems: [{
      title: 'deepClone that survives cycles and shared references', level: 'Hard', tags: ['recursion', 'weakmap', 'objects'], companies: ['Meta', 'Salesforce', 'Atlassian', 'CRED'],
      statement: `<p>Implement <code>deepClone(value)</code> for plain objects, arrays, <code>Date</code> and primitives. The clone must be fully independent of the original, must <b>not</b> crash on circular references (reproduce the cycle in the clone), and must keep <b>shared references</b> shared (if two keys point at one object, the two cloned keys point at one cloned object).</p>`,
      constraints: `Up to 10<sup>5</sup> objects; nesting depth ≤ 1000 (recursion is fine). Do not use JSON or structuredClone.`,
      example: `<p><code>const o = { a: [1, 2], d: new Date(0) }; o.self = o;</code><br><code>const c = deepClone(o);</code><br>${H.c('g', 'c !== o')}, ${H.c('g', 'c.a !== o.a')}, ${H.c('g', 'c.self === c')}, ${H.c('g', 'c.d instanceof Date')}.</p>`,
      brute: { why: `<p>The naive recursion copies every key but never remembers what it has visited. On <code>o.self = o</code> it recurses into o, then o.self (= o), then o.self.self... until <b>RangeError: Maximum call stack size exceeded</b>. It also duplicates shared objects and turns Dates into empty objects.</p>`, code: `
function naiveClone(v) {
  if (v === null || typeof v !== 'object') return v;
  const out = Array.isArray(v) ? [] : {};
  for (const k in v) out[k] = naiveClone(v[k]); // infinite recursion on cycles
  return out;
}
` },
      mcq: { q: 'When must the new copy be stored in the <code>seen</code> map?', options: ['Right after creating the empty copy, before recursing into children', 'After all children are copied', 'Only for arrays', 'Never — just catch the RangeError'], answer: 0, explain: 'A child may point back to the parent. If the parent is not yet in seen, the cycle check fails and recursion never ends.' },
      hints: [`<p>Hint 1: think graph traversal — objects are nodes, properties are edges. Traversing a graph with cycles needs a <b>visited</b> structure.</p>`, `<p>Hint 2: use <code>WeakMap&lt;original, clone&gt;</code>. If an object is already in it, return the stored clone (this also keeps shared references shared).</p>`, `<p>Hint 3: recipe — primitive? return. Date? new Date(time). seen has it? return seen.get. Create [] or {}; seen.set(original, copy); for each own key copy[key] = deepClone(value[key], seen); return copy.</p>`],
      solution: {
        approach: `<p>DFS over the object graph with a <code>WeakMap</code> from original to clone. The clone is registered before descending so back-edges (cycles) and cross-edges (shared refs) resolve to the existing clone. Dates get a dedicated branch.</p>`,
        code: { lang: 'js', run: true, code: `
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (seen.has(value)) return seen.get(value);
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);                     // register first: cycles resolve to this copy
  for (const key of Object.keys(value)) {
    copy[key] = deepClone(value[key], seen);
  }
  return copy;
}

const o = { a: [1, 2], d: new Date(0), inner: { x: 1 } };
o.self = o;
o.twin = o.inner;                            // shared reference
const c = deepClone(o);
c.a.push(3);
console.log(o.a.length, c.a.length);         // 2 3
console.log(c.self === c, c.self !== o);     // true true
console.log(c.twin === c.inner);             // true
console.log(c.d instanceof Date, c.d.getTime()); // true 0
` },
        dry: { head: ['call', 'value', 'in seen?', 'action', 'seen after'], rows: [['1', 'o', 'no', 'copy c = {}, register', '{o→c}'], ['2', 'o.a = [1,2]', 'no', 'copy [1,2], register', '{o→c, a→a\'}'], ['3', 'o.d (Date)', '—', 'new Date(0)', 'unchanged'], ['4', 'o.inner', 'no', 'copy {x:1}', '+ inner→i\''], ['5', 'o.self (= o)', '<span class="c-g">yes</span>', 'return c (cycle)', 'unchanged'], ['6', 'o.twin (= inner)', '<span class="c-g">yes</span>', "return i' (shared)", 'unchanged']] },
        complexity: `<p>O(V + E): each object cloned once, each property visited once. O(V) extra memory for the WeakMap plus recursion depth.</p>`,
        followUps: ['Support Map, Set and RegExp.', 'Make it iterative to survive depth 10<sup>6</sup>.', 'Preserve prototypes and getters/setters.']
      }
    }]
  });

  /* ================= TOPIC 6: curry & flatten ================= */
  var CURRY_SRC = [
    'function curry(fn) {',
    '  return function curried(...args) {',
    '    if (args.length >= fn.length) {',
    '      return fn.apply(this, args);       // enough args: run it',
    '    }',
    '    return function (...more) {          // not enough: wait for more',
    '      return curried.apply(this, [...args, ...more]);',
    '    };',
    '  };',
    '}'
  ].join('\n');
  var FLAT_SRC = [
    'function flatten(arr, depth = 1) {',
    '  const stack = arr.map((v) => [v, depth]);',
    '  const out = [];',
    '  while (stack.length) {',
    '    const [v, d] = stack.pop();',
    '    if (Array.isArray(v) && d > 0) {',
    '      for (const x of v) stack.push([x, d - 1]);  // open the box',
    '    } else {',
    '      out.push(v);                                  // keep as is',
    '    }',
    '  }',
    '  return out.reverse();       // stack popped from the end',
    '}'
  ].join('\n');

  topics.push({
    title: 'Currying and Flattening',
    analogy: `<p><b>Currying = a coffee machine that asks one question at a time.</b> "Size?" → "Milk?" → "Sugar?" → only after the last answer does coffee come out. You can stop after "Size: large", walk away, and later someone else continues from that point — the machine <b>remembers</b> the answers so far (a closure!).</p>
<p><b>Flattening = unpacking nested gift boxes.</b> A box contains toys and smaller boxes, which contain more toys and boxes. Flatten with depth 1 opens <b>one layer</b> of boxes; <code>depth = Infinity</code> keeps opening until only toys remain, laid out in a single row in their original order.</p>`,
    explain: `<p>🟢 <b>Currying</b> turns <code>f(a, b, c)</code> into <code>f(a)(b)(c)</code>: a chain of functions that each take some arguments and return a new function until <b>all</b> arguments have arrived. Why bother? <b>Reuse</b>: <code>const addTax = curry(price)(0.18)</code> pre-fills an argument; and it makes function composition (<code>pipe</code>) easy because each step takes one input.</p>
<p>🔵 <b>The generic curry</b> uses <code>fn.length</code> (the number of declared parameters). Each call collects arguments into an array; if we have <b>at least</b> <code>fn.length</code>, call the real function; otherwise return a new function that will merge more arguments in. Every partial call creates a <b>new</b> collected array — so a partial function can be reused safely.</p>
${H.table(['call', 'collected args', 'enough? (need 3)', 'returns'], [['<code>c(1)</code>', '[1]', H.c('r', 'no'), 'function'], ['<code>c(1)(2)</code>', '[1, 2]', H.c('r', 'no'), 'function'], ['<code>c(1)(2)(3)</code>', '[1, 2, 3]', H.c('g', 'yes'), 'fn(1,2,3)'], ['<code>c(1, 2)(3)</code>', '[1, 2, 3]', H.c('g', 'yes'), 'fn(1,2,3)']])}
<p>🔵 <b>Infinite currying</b> — the famous <code>sum(1)(2)(3)()</code> = 6 — has no fixed arity, so it needs a <b>stop signal</b>: an empty call <code>()</code>. Each call with an argument returns a function that remembers the running total; the empty call returns the total. (A trickier variant uses <code>valueOf</code>/<code>toString</code> so <code>+sum(1)(2)</code> works.)</p>
<p>🟢 <b>Flattening</b> turns <code>[1, [2, [3, [4]]]]</code> into <code>[1, 2, [3, [4]]]</code> (depth 1) or <code>[1, 2, 3, 4]</code> (depth Infinity). Native: <code>arr.flat(depth)</code> (default depth 1).</p>
<p>🔵 <b>Two ways to write it:</b></p>
<ul><li><b>Recursive:</b> for each item, if it is an array and depth &gt; 0 → push all of <code>flatten(item, depth − 1)</code>; else push the item. Short and clear.</li>
<li><b>Iterative with a stack:</b> avoids "Maximum call stack size exceeded" for very deep nesting. Push items with their remaining depth; pop; if it is an array with depth left, push its children; else output. Because a stack is last-in-first-out, either push children in reverse or reverse the output at the end.</li></ul>
<p>Spec detail: <code>flat</code> <b>removes holes</b> (<code>[1, , 3].flat()</code> → <code>[1, 3]</code>). Objects are flattened too in interviews: <code>{a: {b: 1}}</code> → <code>{'a.b': 1}</code>.</p>`,
    clues: ['"Implement curry(fn) so that f(1)(2)(3), f(1, 2)(3) and f(1)(2, 3) all work" → fn.length + collect args', '"sum(1)(2)(3)...() with any number of calls" → infinite curry with a stop call or valueOf', '"Pre-fill some arguments / create specialised functions" → currying / partial application', '"Implement Array.prototype.flat / flatten a nested array to a given depth" → recursion or stack', '"Very deeply nested input / stack overflow concerns" → iterative flatten with explicit stack', '"Flatten an object into dot-notation keys" (e.g. for form errors, query strings) → recursive object flatten'],
    code: [{ lang: 'js', run: true, title: 'curry, infinite sum, flat polyfill and object flatten (runnable)', code: `
// ---------- curry with fixed arity ----------
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn.apply(this, args);  // all args collected
    return function (...more) {                                  // wait for more
      return curried.apply(this, [...args, ...more]);
    };
  };
}
const volume = curry((l, w, h) => l * w * h);
console.log(volume(2)(3)(4), volume(2, 3)(4), volume(2)(3, 4), volume(2, 3, 4)); // 24 24 24 24
const base2 = volume(2);                     // reusable partial
console.log(base2(5)(5), base2(1)(1));       // 50 2 (partials don't share state)

// ---------- infinite curry: sum(1)(2)(3)() ----------
function sum(a) {
  return function next(b) {
    if (b === undefined) return a;           // empty call = stop
    return sum(a + b);
  };
}
console.log(sum(1)(2)(3)(4)());              // 10

// ---------- Array.prototype.flat polyfill (recursive) ----------
Array.prototype.myFlat = function (depth = 1) {
  const out = [];
  (function walk(arr, d) {
    for (let i = 0; i < arr.length; i++) {
      if (!(i in arr)) continue;             // flat() removes holes
      const v = arr[i];
      if (Array.isArray(v) && d > 0) walk(v, d - 1);
      else out.push(v);
    }
  })(this, Math.floor(Number(depth)) || 0);
  return out;
};
const nested = [1, [2, [3, [4, [5]]]], , 6];
console.log(nested.myFlat());                // [1, 2, [3, [4, [5]]], 6]
console.log(nested.myFlat(2));               // [1, 2, 3, [4, [5]], 6]
console.log(nested.myFlat(Infinity));        // [1, 2, 3, 4, 5, 6]

// ---------- flatten an object to dot keys ----------
function flattenObject(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (v !== null && typeof v === 'object' && Object.keys(v).length) flattenObject(v, key, out);
    else out[key] = v;
  }
  return out;
}
console.log(flattenObject({ user: { name: 'Asha', address: { city: 'Pune' } }, tags: ['a', 'b'] }));
// { 'user.name': 'Asha', 'user.address.city': 'Pune', 'tags.0': 'a', 'tags.1': 'b' }
` }],
    codeTitle: ['curry + flatten'],
    viz: [{
      title: 'curry(fn): collecting arguments call by call',
      input: '3 | 1 ; 2 ; 3',
      inputLabel: 'fn.length | argument groups separated by ; (e.g. 1 2 ; 3)',
      gen: function (input) {
        var parts = String(input).split('|');
        var arity = Number((parts[0] || '').trim());
        if (!(arity >= 1 && arity <= 6) || Math.floor(arity) !== arity) throw new Error('fn.length must be an integer 1..6. Format: 3 | 1 ; 2 3');
        var groups = String(parts[1] || '').split(';').map(function (g) { return parseNums(g, 6); }).filter(function (g) { return g.length; });
        if (!groups.length || groups.length > 8) throw new Error('Give 1 to 8 argument groups separated by ;');
        var f = [], collected = [], callStr = 'c';
        f.push(fr('<code>const c = curry(fn)</code> where fn takes <b>' + arity + '</b> parameters (<code>fn.length = ' + arity + '</code>). curry returns <code>curried</code>; nothing is called yet.', [cp(CURRY_SRC, { 1: 'cur', 2: 'ok' }), vp({ 'fn.length': arity, collected: '[]' }), { type: 'array', label: 'collected args', values: [] }]));
        for (var g = 0; g < groups.length; g++) {
          var before = collected.slice();
          collected = collected.concat(groups[g]);
          callStr += '(' + groups[g].join(', ') + ')';
          var hl = {}; for (var k = before.length; k < collected.length; k++) hl[k] = 'ok';
          var enough = collected.length >= arity;
          f.push(fr('Call <code>' + callStr + '</code>: merge <code>[' + before.join(', ') + ']</code> with the new <code>[' + groups[g].join(', ') + ']</code> → ' + collected.length + ' of ' + arity + ' args. ' + (enough ? '<span class="c-g">Enough! Call the real fn.</span>' : 'Not enough yet → return a <b>new function</b> that remembers these args (a closure).'), [cp(CURRY_SRC, enough ? { 3: 'ok', 4: 'ok' } : { 3: 'cur', 6: 'cur', 7: 'cur' }), vp({ 'args.length': collected.length, 'fn.length': arity, enough: enough }, { enough: enough ? 'ok' : 'bad' }), { type: 'array', label: 'collected args', values: collected.slice(), hl: hl }]));
          if (enough) {
            var used = collected.slice(0, collected.length);
            var prod = used.reduce(function (a, b) { return a + b; }, 0);
            f.push(fr('<code>fn.apply(this, [' + used.join(', ') + '])</code> runs. With fn = (…xs) =&gt; sum of its params the answer is <b>' + prod + '</b>. ' + (collected.length > arity ? 'Extra args are passed too (fn just ignores them unless it uses <code>arguments</code>).' : ''), [cp(CURRY_SRC, { 4: 'sel' }), outBox([callStr + ' → ' + prod])]));
            if (g < groups.length - 1) f.push(fr('The result is a <b>number</b>, not a function — calling it again with <code>(' + groups[g + 1].join(', ') + ')</code> would throw <span class="c-r">TypeError: ... is not a function</span>. A fixed-arity curry stops once it has enough.', [tx('Use infinite currying (<code>sum(1)(2)()</code>) when the number of calls is unknown.')]));
            break;
          }
        }
        if (collected.length < arity) f.push(fr('We ran out of calls with only ' + collected.length + '/' + arity + ' args, so the result is still a <b>function</b> waiting for more. That partial function can be stored and reused.', [vp({ result: 'function (...more)', missing: arity - collected.length }, { missing: 'cur' })]));
        while (f.length < 4) f.push(fr('Each partial call created a fresh array <code>[...args, ...more]</code>, so partials never interfere with each other.', [{ type: 'array', label: 'collected args', values: collected.slice() }]));
        return f;
      }
    }, {
      title: 'Iterative flatten with an explicit stack',
      input: '[1,[2,[3,4]],5] | 1',
      inputLabel: 'JSON array | depth (number or Infinity)',
      gen: function (input) {
        var parts = String(input).split('|');
        var arr = parseJsonInput(parts[0], 'The array');
        if (!Array.isArray(arr)) throw new Error('Give a JSON array like [1,[2,[3]]]');
        var dRaw = (parts[1] || '1').trim();
        var depth = dRaw === 'Infinity' ? Infinity : Number(dRaw);
        if (isNaN(depth) || depth < 0) throw new Error('Depth must be a number ≥ 0 or Infinity');
        function show(x) { return Array.isArray(x) ? JSON.stringify(x) : String(JSON.stringify(x)); }
        function dStr(d) { return d === Infinity ? '∞' : d; }
        var stack = arr.map(function (v) { return [v, depth]; });
        var out = [], f = [], guard = 0;
        f.push(fr('Put every top-level item on the stack, each tagged with how many more levels we may open (depth = ' + dStr(depth) + ').', [cp(FLAT_SRC, { 2: 'cur' }), { type: 'stack', label: 'stack (top = right/last)', items: stack.map(function (e) { return show(e[0]) + ' d=' + dStr(e[1]); }) }, { type: 'array', label: 'out (reversed at the end)', values: [] }]));
        while (stack.length && guard++ < 40) {
          var e = stack.pop(), v = e[0], d = e[1];
          if (Array.isArray(v) && d > 0) {
            v.forEach(function (x) { stack.push([x, d - 1]); });
            f.push(fr('Pop <code>' + esc(show(v)) + '</code>: it is an array and we may still open ' + dStr(d) + ' level(s) → push its ' + v.length + ' children with depth ' + dStr(d - 1) + '.', [cp(FLAT_SRC, { 5: 'cur', 6: 'ok', 7: 'ok' }), { type: 'stack', label: 'stack (top = right/last)', items: stack.map(function (q) { return show(q[0]) + ' d=' + dStr(q[1]); }), hl: (function () { var h = {}; for (var z = stack.length - v.length; z < stack.length; z++) h[z] = 'ok'; return h; })() }, { type: 'array', label: 'out (reversed at the end)', values: out.slice() }]));
          } else {
            out.push(Array.isArray(v) ? show(v) : v);
            f.push(fr('Pop <code>' + esc(show(v)) + '</code>: ' + (Array.isArray(v) ? 'an array but depth is used up → keep it <b>as a whole</b>.' : 'not an array → output it.'), [cp(FLAT_SRC, { 5: 'cur', 9: 'ok' }), { type: 'stack', label: 'stack (top = right/last)', items: stack.map(function (q) { return show(q[0]) + ' d=' + dStr(q[1]); }) }, { type: 'array', label: 'out (reversed at the end)', values: out.slice(), hl: (function () { var h = {}; h[out.length - 1] = 'ok'; return h; })() }]));
          }
        }
        var res = out.slice().reverse();
        f.push(fr('Stack empty. We always popped from the <b>end</b>, so <code>out</code> is backwards → reverse it. Result: <code>' + esc('[' + res.map(function (x) { return typeof x === 'string' && x.charAt(0) === '[' ? x : JSON.stringify(x); }).join(',') + ']') + '</code>.', [cp(FLAT_SRC, { 12: 'sel' }), { type: 'array', label: 'flattened result', values: res, hl: (function () { var h = {}; res.forEach(function (_, i) { h[i] = 'sel'; }); return h; })() }]));
        return f;
      }
    }],
    examples: [
      { title: 'Currying in real code: reusable validators and loggers', html: `<p>Partial application creates small specialised functions from a general one. This is the everyday payoff of currying.</p>`, code: { lang: 'js', run: true, code: `
const curry = (fn) => function c(...a) { return a.length >= fn.length ? fn(...a) : (...b) => c(...a, ...b); };
const log = curry((level, module, msg) => '[' + level + '] ' + module + ': ' + msg);
const errorIn = log('ERROR');
const authError = errorIn('auth');
console.log(authError('token expired'));       // [ERROR] auth: token expired
const inRange = curry((min, max, x) => x >= min && x <= max);
console.log([5, 50, 500].filter(inRange(1, 100))); // [5, 50]
` } },
      { title: 'fn.length gotchas: defaults and rest params', html: `<p><code>fn.length</code> counts parameters <b>before</b> the first one with a default value, and ignores rest params. So <code>curry((a, b = 2) =&gt; ...)</code> thinks arity is 1. Fix: let curry accept an explicit arity.</p>`, code: { lang: 'js', run: true, code: `
console.log(((a, b) => 0).length);       // 2
console.log(((a, b = 2) => 0).length);   // 1  (stops at first default)
console.log(((...xs) => 0).length);      // 0  (rest params not counted)
function curryN(fn, arity = fn.length) {
  return function c(...a) { return a.length >= arity ? fn(...a) : (...b) => c(...a, ...b); };
}
const add3 = curryN((...xs) => xs.reduce((s, x) => s + x, 0), 3);
console.log(add3(1)(2)(3));              // 6
` } },
      { title: 'Infinite sum with valueOf (no empty call)', html: `<p>A tricky variant: <code>sum(1)(2)(3) == 6</code>. Return a function and give it a <code>valueOf</code>, so when JS converts it to a primitive (with <code>+</code>, <code>==</code> or template strings) it yields the total.</p>`, code: { lang: 'js', run: true, code: `
function sum(a) {
  const next = (b) => sum(a + b);
  next.valueOf = () => a;              // used by +, ==, <, etc.
  next.toString = () => String(a);     // used by String() / template literals
  return next;
}
console.log(+sum(1)(2)(3));            // 6
console.log(sum(1)(2)(3) == 6);        // true (loose equality calls valueOf)
console.log(String(sum(10)(5)));       // 15
` } },
      { title: 'Flatten with reduce + concat (the one-liner) and its cost', html: `<p>A popular short answer. It is clear but copies arrays repeatedly (<code>concat</code> makes a new array each time) → roughly O(N · depth) or worse for wide inputs. Fine for interviews; mention the cost.</p>`, code: { lang: 'js', run: true, code: `
const flatDeep = (arr, d = 1) =>
  d > 0 ? arr.reduce((acc, v) => acc.concat(Array.isArray(v) ? flatDeep(v, d - 1) : v), []) : arr.slice();
console.log(flatDeep([1, [2, [3, [4]]]], Infinity)); // [1, 2, 3, 4]
console.log(flatDeep([1, [2, [3, [4]]]], 1));        // [1, 2, [3, [4]]]
console.log(['a', ['b']].flatMap((x) => x));         // flatMap = map + flat(1): ['a', 'b']
` } }
    ],
    deepDive: `<p>🟣 <b>Currying vs partial application.</b> Strictly, <b>currying</b> converts an n-ary function into n unary functions (<code>f(a)(b)(c)</code>). <b>Partial application</b> fixes some arguments and returns a function of the rest (<code>bind</code> does this!). The JS "curry" utility (lodash, Ramda) is really an <i>auto-partial</i> that accepts any grouping — say so if asked.</p>
<p><b>Placeholders:</b> lodash's <code>_.curry</code> supports <code>_</code> placeholders: <code>curried(_, 2)(1)</code> fills position 0 later. Implementation: keep an args array with holes marked by a sentinel; each call fills placeholders left-to-right, then appends; count only non-placeholder args against arity. Popular "Hard" follow-up.</p>
<p><b>Performance:</b> every partial call allocates a closure and an array. In hot loops this costs garbage-collection time; V8 handles short-lived closures well (young generation), but avoid currying in per-frame code. Readability is the real benefit.</p>
<p><b>Flatten complexity:</b> the stack version is O(N) where N = total number of elements and nested arrays visited; extra memory O(N). Recursive version uses call-stack depth = nesting depth; ~10 000 nested levels can overflow. Native <code>flat</code> in V8 is also recursive internally but in C++/Torque with a larger effective limit.</p>
<p><b>Order preservation trick:</b> instead of reversing at the end, push children in <b>reverse</b> order (<code>for (let i = v.length - 1; i &gt;= 0; i--)</code>) so the leftmost child is on top. Or use a generator: <code>function* flat(a, d) { for (const x of a) Array.isArray(x) &amp;&amp; d &gt; 0 ? yield* flat(x, d - 1) : yield x; }</code> — lazy, great for huge inputs.</p>
<p><b>Object flatten edge cases:</b> empty objects/arrays (keep as leaf or drop?), keys containing dots (escape them), Dates (treat as leaf), cycles (seen set), and the reverse operation <code>unflatten</code> (split on '.' and build nested objects; numeric segments → arrays).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> curry and flatten are textbook — AI outputs them instantly. The interview value moved to: placeholders, <code>fn.length</code> pitfalls, the <code>valueOf</code> trick, iterative flatten for deep input, and explaining <b>why</b> partials do not share state.</p>
<p><b>Use AI as a partner:</b> <code>Explain line by line why my curry's partial functions don't share their args array. Then show a buggy version that does share state.</code> Seeing the broken twin is how intuition sticks.</p>
<p><b>Where AI goes wrong:</b> pushes into a shared <code>args</code> array in the closure (so <code>const p = c(1); p(2); p(3)</code> breaks), uses arrow functions and loses <code>this</code>, writes flatten that ignores depth or does not remove holes, or recurses on strings (strings are iterable!).</p>
<p><b>What you must still own:</b> knowing when currying improves code (configuration, composition pipelines) and when it obscures it (most app code — prefer named parameters/objects).</p>`,
    problems: [{
      title: 'Implement curry(fn) supporting any argument grouping', level: 'Medium', tags: ['closure', 'functional', 'curry'], companies: ['Flipkart', 'Paytm', 'Meesho', 'Amazon'],
      statement: `<p>Implement <code>curry(fn)</code>. The returned function collects arguments across calls; as soon as it has <b>at least</b> <code>fn.length</code> arguments it calls <code>fn</code> with them and returns the result. Every grouping must work: <code>c(1)(2)(3)</code>, <code>c(1, 2)(3)</code>, <code>c(1)(2, 3)</code>, <code>c(1, 2, 3)</code>. Partially applied functions must be <b>reusable</b> independently.</p>`,
      constraints: `1 ≤ fn.length ≤ 10. Preserve <code>this</code>. Calling with zero args should just return a function waiting for more.`,
      example: `<p><code>const join = curry((a, b, c) =&gt; a + '-' + b + '-' + c);</code><br><code>const p = join('x');</code> → function<br><code>p('y')('z')</code> → ${H.c('g', "'x-y-z'")}, and <code>p('q', 'r')</code> → ${H.c('g', "'x-q-r'")} (p was not affected by the first use).</p>`,
      brute: { why: `<p>A common buggy version keeps <b>one shared array</b> in the outer closure and pushes into it. The first full use works, but the partial <code>p</code> now has stale extra args — the second use returns garbage. Every partial needs its own copy of the arguments.</p>`, code: `
function badCurry(fn) {
  const args = [];                       // shared by ALL partial calls -> bug
  return function c(...more) {
    args.push(...more);
    return args.length >= fn.length ? fn(...args) : c;
  };
}
` },
      mcq: { q: 'Why does <code>curried.apply(this, [...args, ...more])</code> fix the shared-state bug?', options: ['It builds a brand-new array for each call path, so partials never mutate each other', 'apply is faster than calling directly', 'Spread syntax freezes the array', 'It resets fn.length'], answer: 0, explain: 'Each call creates a new merged array; the closure of a partial keeps its own args untouched.' },
      hints: [`<p>Hint 1: the decision at every call is binary: "do I have <code>fn.length</code> args yet?" Yes → call fn. No → return a function.</p>`, `<p>Hint 2: name the inner function (<code>curried</code>) so it can call itself recursively with the merged args: <code>curried(...args, ...more)</code>.</p>`, `<p>Hint 3: never mutate <code>args</code>; build <code>[...args, ...more]</code>. Use <code>function</code> (not arrow) + <code>apply(this, ...)</code> to keep <code>this</code>.</p>`],
      solution: {
        approach: `<p>Recursive closure: <code>curried(...args)</code> compares the count with <code>fn.length</code>. If short, it returns a fresh function that calls <code>curried</code> with an immutable concatenation of old and new args. Because nothing is mutated, every partial is an independent "checkpoint".</p>`,
        code: { lang: 'js', run: true, code: `
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn.apply(this, args);
    return function (...more) {
      return curried.apply(this, [...args, ...more]);
    };
  };
}

const join = curry((a, b, c) => a + '-' + b + '-' + c);
const p = join('x');
console.log(p('y')('z'));          // x-y-z
console.log(p('q', 'r'));          // x-q-r  (p unaffected)
console.log(join('a', 'b', 'c'));  // a-b-c
console.log(join()('a')()('b', 'c')); // a-b-c (empty calls just wait)
` },
        dry: { head: ['expression', 'args collected', '≥ 3?', 'returns'], rows: [["join('x')", "['x']", 'no', 'fn A (remembers [x])'], ["A('y')", "['x','y']", 'no', 'fn B'], ["B('z')", "['x','y','z']", 'yes', "'x-y-z'"], ["A('q','r')", "['x','q','r']", 'yes', "'x-q-r'"]] },
        complexity: `<p>Each call copies the collected args: O(k) per call, O(n<sup>2</sup>) worst case for n single-arg calls (n ≤ 10, so trivial). O(n) memory per partial chain.</p>`,
        followUps: ['Support lodash-style placeholders <code>curry.placeholder</code>.', 'Write <code>uncurry</code>.', 'Implement <code>pipe</code> and <code>compose</code> and use them with curried functions.']
      }
    }]
  });
registerModule({ id: 'js14', title: 'Machine Coding & Polyfills + Output Question Bank', intro: '<p>tmp</p>', goals: [], prereqs: 'tmp', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
