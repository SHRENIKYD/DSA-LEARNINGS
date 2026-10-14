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
registerModule({ id: 'js14', title: 'Machine Coding & Polyfills + Output Question Bank', intro: '<p>tmp</p>', goals: [], prereqs: 'tmp', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
