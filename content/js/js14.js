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
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  function add(a, b, c) { return this.base + a + b + c; }\n  if (k === 'basic') return add.myBind({ base: 100 }, 1)(2, 3);\n  if (k === 'noPreset') return add.myBind({ base: 1 })(1, 1, 1);\n  if (k === 'allPreset') return add.myBind({ base: 0 }, 1, 2, 3)();\n  if (k === 'new') { function User(name, role) { this.name = name; this.role = role; } var Admin = User.myBind(null, 'root'); var u = new Admin('superuser'); return [u.name, u.role, u instanceof User, u instanceof Admin]; }\n  if (k === 'newIgnoresCtx') { function P(x) { this.x = x; } var B = P.myBind({ x: 'ignored' }, 5); var p = new B(); return [p.x, Object.keys(p)]; }\n  if (k === 'protoMethod') { function C() {} C.prototype.hi = function () { return 'hi'; }; var BC = C.myBind({}); return new BC().hi(); }\n  if (k === 'ctxObject') { var o = { n: 5 }; function get() { return this.n; } return [get.myBind(o)(), get.myBind({ n: 9 })()]; }\n  if (k === 'laterArgsOrder') { function cat() { return [].slice.call(arguments).join(''); } return cat.myBind(null, 'a', 'b')('c', 'd'); }\n  if (k === 'separate') { var b1 = add.myBind({ base: 1 }, 1), b2 = add.myBind({ base: 10 }, 1); return [b1(1, 1), b2(1, 1)]; }\n  if (k === 'nonFunction') { try { Function.prototype.myBind.call({}, null); } catch (e) { return e.name; } return 'none'; }\n  if (k === 'many') { function sum() { var s = 0; for (var i = 0; i < arguments.length; i++) s += arguments[i]; return s; } var pre = []; for (var j = 0; j < 1000; j++) pre.push(1); return sum.myBind(null, ...pre)(...pre); }\n  if (k === 'twice') { function f2() { return this.v + [].slice.call(arguments).join(''); } var first = f2.myBind({ v: 'A' }, 'x'); return first.myBind({ v: 'B' }, 'y')('z'); }\n}"},"cases":[[["basic"],106],[["noPreset"],4],[["allPreset"],6],[["new"],["root","superuser",true,true]],[["newIgnoresCtx"],[5,["x"]]],[["protoMethod"],"hi"],[["ctxObject"],[5,9]],[["laterArgsOrder"],"abcd"],[["separate"],[4,13]],[["nonFunction"],"TypeError"],[["many"],2000],[["twice"],"Axyz"]]},
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
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var plus = function (a, x) { return a + x; };\n  if (k === 'noInit') return [1, 2, 3].myReduce(plus);\n  if (k === 'emptyInit') return [].myReduce(plus, 0);\n  if (k === 'emptyNoInit') { try { [].myReduce(plus); } catch (e) { return e instanceof TypeError; } return 'none'; }\n  if (k === 'holes') return [, , 5, 6].myReduce(function (a, x) { return a * x; });\n  if (k === 'holesMid') { var calls = []; [1, , 3].myReduce(function (a, x, i) { calls.push(i); return a + x; }, 0); return calls; }\n  if (k === 'undefInit') { var n = 0; var r = [1].myReduce(function (a, x) { n++; return a === undefined ? 'u' + x : 'no'; }, undefined); return [r, n]; }\n  if (k === 'arrayLike') return Array.prototype.myReduce.call({ 0: 'a', 1: 'b', length: 2 }, plus);\n  if (k === 'args') { var seen = []; ['a', 'b'].myReduce(function (acc, x, i, arr) { seen.push([acc, x, i, arr.length]); return acc + x; }, '>'); return seen; }\n  if (k === 'single') { var c = 0; var v = [7].myReduce(function () { c++; }); return [v, c]; }\n  if (k === 'notFn') { try { [1].myReduce(5); } catch (e) { return e.name; } return 'none'; }\n  if (k === 'allHoles') { try { new Array(3).myReduce(plus); } catch (e) { return e.name; } return 'none'; }\n  if (k === 'big') { var a = new Array(1000000); for (var i = 0; i < a.length; i++) a[i] = 1; return a.myReduce(plus, 0); }\n  if (k === 'falsyInit') return [[1, 2].myReduce(plus, 0), [1, 2].myReduce(plus, ''), [[1], [2]].myReduce(function (a, x) { return a.concat(x); }, [])];\n  if (k === 'objects') return [{ v: 1 }, { v: 2 }].myReduce(function (a, o) { return a + o.v; }, 10);\n  if (k === 'mutatingLen') { var arr = [1, 2, 3]; var seenX = []; arr.myReduce(function (a, x) { if (x === 1) arr.push(99); seenX.push(x); return a; }, 0); return seenX; }\n}"},"cases":[[["noInit"],6],[["emptyInit"],0],[["emptyNoInit"],true],[["holes"],30],[["holesMid"],[0,2]],[["undefInit"],["u1",1]],[["arrayLike"],"ab"],[["args"],[[">","a",0,2],[">a","b",1,2]]],[["single"],[7,0]],[["notFn"],"TypeError"],[["allHoles"],"TypeError"],[["big"],1000000],[["falsyInit"],[3,"12",[1,2]]],[["objects"],13],[["mutatingLen"],[1,2,3]]]},
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
      brute: { why: `<p>A first try awaits each promise in a loop. The values come out right, but it is <b>not</b> Promise.all: it is not fail-fast (a rejection in item 3 is not noticed until items 0–2 have finished), and if each await also starts its own work, the calls run one after another instead of in parallel. Another naive version uses <code>push</code>, which scrambles the order.</p>`, code: `
async function naiveAll(items) {
  const out = [];
  for (const p of items) out.push(await p); // waits in order: rejection of a later item is noticed late
  return out;
}
` },
      mcq: { q: 'Item #2 fulfills first. Where must its value go?', options: ['<code>results[2]</code>', '<code>results.push(value)</code>', '<code>results[0]</code>', '<code>results.unshift(value)</code>'], answer: 0, explain: 'The result array mirrors the input order, so each value goes to its own input index regardless of finish time.' },
      hints: [`<p>Hint 1: return <code>new Promise((resolve, reject) =&gt; ...)</code>. The outer promise is controlled by you; attach handlers to every input.</p>`, `<p>Hint 2: keep <code>results = new Array(n)</code> and a <code>remaining = n</code> counter. In each fulfillment handler write <code>results[i]</code> and decrement; resolve at 0. Pass the outer <code>reject</code> directly as the rejection handler.</p>`, `<p>Hint 3: edge cases — wrap with <code>Promise.resolve(item)</code> for plain values; if n is 0 resolve <code>[]</code> immediately; convert any iterable with <code>Array.from</code>.</p>`],
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 1); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(k) {\n  return __job(async function () {\n    var delay = function (ms, v) { return new Promise(function (r) { setTimeout(function () { r(v); }, ms); }); };\n    var fail = function (ms, m) { return new Promise(function (_, j) { setTimeout(function () { j(new Error(m)); }, ms); }); };\n    if (k === 'order') return promiseAll([delay(30, 'A'), delay(10, 'B'), 42]);\n    if (k === 'empty') return promiseAll([]);\n    if (k === 'rejectFirst') { try { await promiseAll([delay(20, 'ok'), fail(5, 'first'), fail(10, 'second')]); return 'resolved'; } catch (e) { return e.message; } }\n    if (k === 'plain') return promiseAll([1, 'two', null, undefined, false]);\n    if (k === 'set') return promiseAll(new Set([1, 2, 3]));\n    if (k === 'generator') { function* g() { yield delay(5, 'a'); yield 'b'; } return promiseAll(g()); }\n    if (k === 'thenable') return promiseAll([{ then: function (res) { res('t'); } }, 1]);\n    if (k === 'immediateReject') { try { await promiseAll([Promise.reject(new Error('now')), delay(5, 1)]); return 'resolved'; } catch (e) { return e.message; } }\n    if (k === 'many') { var items = []; for (var i = 0; i < 10000; i++) items.push(i % 3 === 0 ? delay(i % 7, i) : i); var r = await promiseAll(items); return [r.length, r.every(function (v, j) { return v === j; })]; }\n    if (k === 'single') return promiseAll([delay(1, 'only')]);\n    if (k === 'nested') return promiseAll([promiseAll([1, 2]), promiseAll([3])]);\n    if (k === 'notNative') return promiseAll([1]) instanceof Promise;\n  });\n}"},"cases":[[["order"],["A","B",42]],[["empty"],[]],[["rejectFirst"],"first"],[["plain"],[1,"two",null,null,false]],[["set"],[1,2,3]],[["generator"],["a","b"]],[["thenable"],["t",1]],[["immediateReject"],"now"],[["many"],[10000,true]],[["single"],["only"]],[["nested"],[[1,2],[3]]],[["notNative"],true]]},
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
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"function __ft() {\n  var now = 0, id = 0, timers = [], real = { st: globalThis.setTimeout, ct: globalThis.clearTimeout, dn: Date.now };\n  var api = {\n    now: function () { return now; },\n    install: function () { globalThis.setTimeout = function (fn, ms) { var t = { id: ++id, at: now + Math.max(0, ms || 0), fn: fn }; timers.push(t); return t.id; }; globalThis.clearTimeout = function (i) { timers = timers.filter(function (t) { return t.id !== i; }); }; Date.now = function () { return now; }; },\n    uninstall: function () { globalThis.setTimeout = real.st; globalThis.clearTimeout = real.ct; Date.now = real.dn; },\n    advanceTo: function (target) { while (true) { var due = timers.filter(function (t) { return t.at <= target; }).sort(function (a, b) { return a.at - b.at || a.id - b.id; })[0]; if (!due) break; timers = timers.filter(function (t) { return t !== due; }); now = due.at; due.fn(); } now = target; },\n    pending: function () { return timers.length; }\n  };\n  return api;\n}\n\nfunction chk(k) {\n  var ft = __ft(); ft.install();\n  try {\n    var out = [];\n    var rec = function (v) { out.push(v + '@' + ft.now()); };\n    if (k === 'example') { var d = debounce(rec, 100); ft.advanceTo(0); d('a'); ft.advanceTo(50); d('b'); ft.advanceTo(120); d('c'); ft.advanceTo(1000); return out; }\n    if (k === 'flushAt130') { var d2 = debounce(rec, 100); d2('a'); ft.advanceTo(50); d2('b'); ft.advanceTo(120); d2('c'); ft.advanceTo(130); d2.flush(); ft.advanceTo(1000); return out; }\n    if (k === 'cancel') { var d3 = debounce(rec, 100); d3('a'); d3.cancel(); ft.advanceTo(1000); return out; }\n    if (k === 'flushIdle') { var d4 = debounce(rec, 100); var r = d4.flush(); ft.advanceTo(1000); return [r === undefined, out]; }\n    if (k === 'flushReturns') { var d5 = debounce(function (x) { return x * 2; }, 100); d5(21); return d5.flush(); }\n    if (k === 'this') { var obj = { id: 'X', f: debounce(function (v) { out.push(this.id + ':' + v); }, 30) }; var other = { id: 'Y' }; obj.f('a'); obj.f.call(other, 'b'); ft.advanceTo(100); return out; }\n    if (k === 'latestArgs') { var d6 = debounce(function () { out.push([].slice.call(arguments)); }, 10); d6(1, 2); d6(3); ft.advanceTo(50); return out; }\n    if (k === 'twoBursts') { var d7 = debounce(rec, 100); d7('a'); ft.advanceTo(300); d7('b'); ft.advanceTo(1000); return out; }\n    if (k === 'zeroWait') { var d8 = debounce(rec, 0); d8('z'); ft.advanceTo(0); return out; }\n    if (k === 'afterFlush') { var d9 = debounce(rec, 100); d9('a'); d9.flush(); ft.advanceTo(500); d9('b'); ft.advanceTo(1000); return out; }\n    if (k === 'many') { var d10 = debounce(rec, 100); for (var i = 0; i < 100000; i++) { ft.advanceTo(i); d10('v' + i); } ft.advanceTo(1000000); return [out, ft.pending()]; }\n    if (k === 'restart') { var d11 = debounce(rec, 100); d11('a'); ft.advanceTo(99); d11('b'); ft.advanceTo(198); var before = out.length; ft.advanceTo(199); return [before, out]; }\n  } finally { ft.uninstall(); }\n}"},"cases":[[["example"],["c@220"]],[["flushAt130"],["c@130"]],[["cancel"],[]],[["flushIdle"],[true,[]]],[["flushReturns"],42],[["this"],["Y:b"]],[["latestArgs"],[[3]]],[["twoBursts"],["a@100","b@400"]],[["zeroWait"],["z@0"]],[["afterFlush"],["a@0","b@600"]],[["many"],[["v99999@100099"],0]],[["restart"],[0,["b@199"]]]]},
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
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  if (k === 'example') { var o = { a: [1, 2], d: new Date(0), inner: { x: 1 } }; o.self = o; o.twin = o.inner; var c = deepClone(o); c.a.push(3); return [o.a.length, c.a.length, c.self === c, c.self !== o, c.twin === c.inner, c.twin !== o.inner, c.d instanceof Date, c.d.getTime(), c.d !== o.d]; }\n  if (k === 'primitives') return [deepClone(5), deepClone('s'), deepClone(null), deepClone(true), deepClone(undefined) === undefined];\n  if (k === 'independent') { var src = { n: { m: [1, { z: 1 }] } }; var cp = deepClone(src); cp.n.m[1].z = 2; cp.n.m.push(9); return [src.n.m[1].z, src.n.m.length, cp.n.m[1].z]; }\n  if (k === 'arrayCycle') { var a = [1]; a.push(a); var ac = deepClone(a); return [ac !== a, ac[1] === ac, ac[0]]; }\n  if (k === 'mutualCycle') { var p = { name: 'p' }, q = { name: 'q', p: p }; p.q = q; var pc = deepClone(p); return [pc.q.p === pc, pc.q !== q, pc.q.name]; }\n  if (k === 'sharedArrays') { var sh = [1]; var holder = { x: sh, y: sh, z: [sh] }; var hc = deepClone(holder); return [hc.x === hc.y, hc.z[0] === hc.x, hc.x !== sh]; }\n  if (k === 'dates') { var d = new Date(1234); var dc = deepClone([d, d]); return [dc[0] instanceof Date, dc[0].getTime(), dc[0] !== d]; }\n  if (k === 'empty') return [deepClone({}), deepClone([]), Array.isArray(deepClone([]))];\n  if (k === 'nested') return deepClone({ a: { b: { c: [[1, 2], [3]] } }, s: 'x', n: null });\n  if (k === 'deep') { var root = {}, cur = root; for (var i = 0; i < 1000; i++) { cur.next = { v: i }; cur = cur.next; } var dcl = deepClone(root), depth = 0, node = dcl; while (node.next) { node = node.next; depth++; } return [depth, node.v, dcl !== root]; }\n  if (k === 'wide') { var arr = []; for (var j = 0; j < 100000; j++) arr.push({ j: j }); var wc = deepClone(arr); return [wc.length, wc[99999].j, wc[7] !== arr[7]]; }\n  if (k === 'arrayIs') { var ar = deepClone({ list: [1, 2] }); return [Array.isArray(ar.list), ar.list.length]; }\n}"},"cases":[[["example"],[2,3,true,true,true,true,true,0,true]],[["primitives"],[5,"s",null,true,true]],[["independent"],[1,2,2]],[["arrayCycle"],[true,true,1]],[["mutualCycle"],[true,true,"q"]],[["sharedArrays"],[true,true,true]],[["dates"],[true,1234,true]],[["empty"],[{},[],true]],[["nested"],{"a":{"b":{"c":[[1,2],[3]]}},"s":"x","n":null}],[["deep"],[1000,999,true]],[["wide"],[100000,99999,true]],[["arrayIs"],[true,2]]]},
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
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var join = curry(function (a, b, c) { return a + '-' + b + '-' + c; });\n  if (k === 'groupings') return [join('x')('y')('z'), join('x', 'y')('z'), join('x')('y', 'z'), join('x', 'y', 'z')];\n  if (k === 'reuse') { var p = join('x'); return [p('y')('z'), p('q', 'r'), p('y')('z')]; }\n  if (k === 'empty') return join()('a')()('b', 'c');\n  if (k === 'function') return typeof join('x');\n  if (k === 'this') { var o = { base: 100, add: curry(function (x, y) { return this.base + x + y; }) }; return o.add(1).call(o, 2); }\n  if (k === 'arity1') return curry(function (a) { return a + 1; })(41);\n  if (k === 'extra') return curry(function (a, b) { return [].slice.call(arguments).length; })(1, 2, 3);\n  if (k === 'numbers') { var add3 = curry(function (a, b, c) { return a + b + c; }); return [add3(1)(2)(3), add3(1, 2)(3), add3(1)(2, 3)]; }\n  if (k === 'ten') { var f = curry(function (a, b, c, d, e, f2, g, h, i, j) { return [a, b, c, d, e, f2, g, h, i, j].join(''); }); return f(1)(2)(3)(4)(5)(6)(7)(8)(9)(0); }\n  if (k === 'independent') { var q = curry(function (a, b) { return a * b; }); var dbl = q(2), tri = q(3); return [dbl(5), tri(5), dbl(7)]; }\n}"},"cases":[[["groupings"],["x-y-z","x-y-z","x-y-z","x-y-z"]],[["reuse"],["x-y-z","x-q-r","x-y-z"]],[["empty"],"a-b-c"],[["function"],"function"],[["this"],103],[["arity1"],42],[["extra"],3],[["numbers"],[6,6,6]],[["ten"],"1234567890"],[["independent"],[10,15,14]]]},
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

  /* ================= TOPIC 7: Event Emitter (pub/sub) ================= */
  var EMIT_SRC = [
    'class EventEmitter {',
    '  #events = new Map();                      // name -> [listeners]',
    '  on(name, fn) {',
    '    if (!this.#events.has(name)) this.#events.set(name, []);',
    '    this.#events.get(name).push(fn);',
    '    return () => this.off(name, fn);         // unsubscribe handle',
    '  }',
    '  off(name, fn) {',
    '    const list = this.#events.get(name) || [];',
    '    const i = list.indexOf(fn);',
    '    if (i >= 0) list.splice(i, 1);',
    '  }',
    '  once(name, fn) {',
    '    const wrapper = (...a) => { this.off(name, wrapper); fn(...a); };',
    '    return this.on(name, wrapper);',
    '  }',
    '  emit(name, ...args) {',
    '    const list = this.#events.get(name);',
    '    if (!list || !list.length) return false;',
    '    for (const fn of [...list]) fn(...args); // iterate a COPY',
    '    return true;',
    '  }',
    '}'
  ].join('\n');

  topics.push({
    title: 'Event Emitter (Pub/Sub) from Scratch',
    analogy: `<p>A <b>YouTube channel with a bell icon</b>. Viewers <b>subscribe</b> (<code>on</code>) to a channel (an event name). When the creator <b>uploads</b> (<code>emit</code>), every subscriber gets notified, in the order they subscribed. Viewers can <b>unsubscribe</b> (<code>off</code>). A <b>once</b> subscriber is someone who only wants the <i>next</i> video and then unsubscribes automatically.</p>
<p>The creator does not know or care who the viewers are — that loose coupling is the whole point of pub/sub.</p>`,
    explain: `<p>🟢 <b>What it is.</b> An event emitter is an object that keeps a <b>list of callback functions per event name</b> and calls them when that event is emitted. It is everywhere: Node's <code>EventEmitter</code> (streams, servers), the browser's <code>addEventListener</code>, Redux-style stores, WebSocket wrappers, and the <b>Observer pattern</b> from Module JS 13.</p>
<p>🔵 <b>Data structure:</b> a <code>Map</code> from event name → <b>array</b> of listeners (array keeps subscription order and allows the same function twice, like Node). Some designs use a <code>Set</code> (no duplicates, like the DOM's addEventListener).</p>
${H.kv([['"login"', '[logUser, showToast]'], ['"logout"', '[clearCache]']], { label: 'events Map' })}
${H.table(['Method', 'What it does', 'Detail interviewers check'], [['<code>on(name, fn)</code>', 'append fn to the list', 'return an <b>unsubscribe</b> function; support chaining or not'], ['<code>off(name, fn)</code>', 'remove fn (one occurrence)', 'must work for listeners added via <code>once</code> too'], ['<code>once(name, fn)</code>', 'wrap fn so it removes itself before running', 'remove <b>before</b> calling, so a re-emit inside fn does not call it twice'], ['<code>emit(name, ...args)</code>', 'call every listener with args, in order', '<b>iterate a copy</b> — listeners may add/remove listeners while we loop']])}
<p>🔵 <b>Why copy the list in emit?</b> If listener A calls <code>off</code> on itself (which <code>once</code> does!), the array shifts left while we are looping and listener B gets <b>skipped</b>. Looping over <code>[...list]</code> (a snapshot) makes emit behave predictably: exactly the listeners present at emit time run.</p>
<p>🔵 <b>Error handling:</b> if one listener throws, should the others still run? Node's emitter lets the error propagate (later listeners do not run). A robust app emitter can wrap each call in <code>try/catch</code> and report errors, so one bad subscriber cannot break the rest. Node also treats the <code>'error'</code> event specially: emitting <code>'error'</code> with no listener <b>throws</b>.</p>
<p>🔵 <b>Memory leaks:</b> every <code>on</code> keeps a reference to the callback (and everything its closure captures). Forgetting to unsubscribe (e.g. on component unmount) is a classic leak. Node warns when more than 10 listeners are added to one event (<code>setMaxListeners</code>).</p>`,
    clues: ['"Implement an EventEmitter with on, off, once, emit" → Map of name → array of listeners', '"Pub/sub / observer / notify multiple subscribers" → event emitter', '"subscribe() should return a function to unsubscribe" → return a closure calling off', '"A listener removes itself during emit" → iterate over a copy', '"once listener should be removable with off(original)" → store the original on the wrapper', '"Components communicate without knowing each other" → event bus'],
    code: [{ lang: 'js', run: true, title: 'EventEmitter with on/off/once/emit, unsubscribe and safe iteration (runnable)', code: `
class EventEmitter {
  #events = new Map();                       // eventName -> array of listener functions

  on(name, fn) {
    if (typeof fn !== 'function') throw new TypeError('listener must be a function');
    if (!this.#events.has(name)) this.#events.set(name, []);
    this.#events.get(name).push(fn);
    return () => this.off(name, fn);           // unsubscribe handle
  }

  off(name, fn) {
    const list = this.#events.get(name);
    if (!list) return this;
    // match the function itself OR a once-wrapper around it
    const i = list.findIndex((l) => l === fn || l.original === fn);
    if (i >= 0) list.splice(i, 1);
    if (list.length === 0) this.#events.delete(name); // tidy up empty lists
    return this;
  }

  once(name, fn) {
    const wrapper = (...args) => {
      this.off(name, wrapper);                 // remove FIRST, then call
      return fn.apply(this, args);
    };
    wrapper.original = fn;                     // so off(name, fn) still works
    return this.on(name, wrapper);
  }

  emit(name, ...args) {
    const list = this.#events.get(name);
    if (!list) return false;
    for (const fn of [...list]) {              // snapshot: safe if listeners change the list
      fn.apply(this, args);
    }
    return true;
  }

  listenerCount(name) { return (this.#events.get(name) || []).length; }
}

// ---------- tests ----------
const bus = new EventEmitter();
const log = [];
const a = (x) => log.push('A' + x);
const unsubB = bus.on('ping', (x) => log.push('B' + x));
bus.on('ping', a);
bus.once('ping', (x) => log.push('ONCE' + x));

bus.emit('ping', 1);          // B1 A1 ONCE1
bus.emit('ping', 2);          // B2 A2  (once is gone)
unsubB();
bus.off('ping', a);
console.log(bus.emit('ping', 3), log); // false [ 'B1','A1','ONCE1','B2','A2' ]

// a listener removing itself mid-emit does not skip the next one
const e2 = new EventEmitter();
const out = [];
const self = () => { out.push('self'); e2.off('x', self); };
e2.on('x', self);
e2.on('x', () => out.push('next'));
e2.emit('x');
console.log(out);             // [ 'self', 'next' ]

// once listener can be removed by its original function
const e3 = new EventEmitter();
const hi = () => console.log('should not print');
e3.once('greet', hi);
e3.off('greet', hi);
console.log(e3.listenerCount('greet')); // 0
` }],
    codeTitle: ['EventEmitter'],
    viz: [{
      title: 'Event emitter: the listeners map in action',
      input: 'on login A; on login B; once login C; emit login; off login A; emit login; emit logout',
      inputLabel: 'commands separated by ; (on/once/off NAME LISTENER, emit NAME)',
      gen: function (input) {
        var list = cmds(input);
        if (!list.length) throw new Error('Give commands like: on click A; emit click');
        if (list.length > 14) throw new Error('Use at most 14 commands');
        var ev = {}, order = [], f = [], outLines = [];
        function entries() { return order.filter(function (n) { return ev[n] && ev[n].length; }).map(function (n) { return [n, ev[n].map(function (l) { return l.once ? l.name + '(once)' : l.name; }).join(', ')]; }); }
        f.push(fr('A fresh emitter: an empty <code>Map</code> from event name → array of listeners.', [{ type: 'map', label: '#events', entries: [] }, cp(EMIT_SRC, { 2: 'cur' })]));
        list.forEach(function (c) {
          var p = c.split(/\s+/), op = p[0], name = p[1], who = p[2];
          if (['on', 'once', 'off', 'emit'].indexOf(op) < 0 || !name) throw new Error('Unknown command "' + c + '". Use on/once/off NAME LISTENER or emit NAME');
          if (op !== 'emit' && !who) throw new Error('"' + c + '" needs a listener name, e.g. on click A');
          var hl = {};
          if (op === 'on' || op === 'once') {
            if (!ev[name]) { ev[name] = []; if (order.indexOf(name) < 0) order.push(name); }
            ev[name].push({ name: who, once: op === 'once' });
            hl[name] = 'ok';
            f.push(fr('<code>' + esc(c) + '</code>: append listener <b>' + esc(who) + '</b> to the "' + esc(name) + '" list' + (op === 'once' ? ' — wrapped so it removes itself before it runs' : '') + '. Order of subscription = order of calls.', [{ type: 'map', label: '#events', entries: entries(), hl: hl }, cp(EMIT_SRC, op === 'on' ? { 4: 'cur', 5: 'ok', 6: 'ok' } : { 14: 'cur', 15: 'ok' })]));
          } else if (op === 'off') {
            var arr = ev[name] || [], idx = -1;
            for (var i = 0; i < arr.length; i++) if (arr[i].name === who) { idx = i; break; }
            if (idx >= 0) arr.splice(idx, 1);
            hl[name] = idx >= 0 ? 'bad' : 'cur';
            f.push(fr('<code>' + esc(c) + '</code>: ' + (idx >= 0 ? 'find <b>' + esc(who) + '</b> in the list and splice it out.' : '<b>' + esc(who) + '</b> is not subscribed to "' + esc(name) + '" → nothing happens (no error).'), [{ type: 'map', label: '#events', entries: entries(), hl: hl }, cp(EMIT_SRC, { 10: 'cur', 11: idx >= 0 ? 'bad' : 'done' })]));
          } else {
            var ls = ev[name] || [];
            if (!ls.length) {
              f.push(fr('<code>' + esc(c) + '</code>: nobody listens to "' + esc(name) + '" → emit returns <b>false</b>. (Node would throw if the event were "error".)', [{ type: 'map', label: '#events', entries: entries() }, cp(EMIT_SRC, { 19: 'bad' }), outBox(outLines)]));
              return;
            }
            var snap = ls.slice();
            f.push(fr('<code>' + esc(c) + '</code>: take a <b>snapshot</b> of the ' + snap.length + ' listener(s) — we will call exactly these, even if the list changes while we loop.', [{ type: 'map', label: '#events', entries: entries(), hl: (function () { var h = {}; h[name] = 'cur'; return h; })() }, { type: 'queue', label: 'snapshot to call (front first)', items: snap.map(function (l) { return l.name; }) }, cp(EMIT_SRC, { 20: 'cur' })]));
            snap.forEach(function (l, k) {
              if (l.once) { var j = ev[name].indexOf(l); if (j >= 0) ev[name].splice(j, 1); }
              outLines.push(l.name + ' handled ' + name);
              f.push(fr('Call listener <b>' + esc(l.name) + '</b> with the emitted args' + (l.once ? ' — it is a <b>once</b> listener, so its wrapper first removes it from the list, then runs it.' : ' (listener #' + (k + 1) + ' of ' + snap.length + ').'), [{ type: 'map', label: '#events', entries: entries(), hl: (function () { var h = {}; h[name] = l.once ? 'bad' : 'cur'; return h; })() }, { type: 'queue', label: 'snapshot to call (front first)', items: snap.map(function (q) { return q.name; }), hl: (function () { var h = {}; for (var z = 0; z < k; z++) h[z] = 'done'; h[k] = 'cur'; return h; })() }, outBox(outLines)]));
            });
          }
        });
        f.push(fr('All commands done. Final listener map shown; every <code>on</code> without a matching <code>off</code> keeps its callback alive in memory.', [{ type: 'map', label: '#events (final)', entries: entries() }, outBox(outLines)]));
        return f;
      }
    }],
    examples: [
      { title: 'Why emit must iterate a copy', html: `<p>Without the snapshot, a listener that unsubscribes itself shifts the array, and the <b>next</b> listener is skipped — a real bug that shows up as "sometimes my handler doesn't fire".</p>`, code: { lang: 'js', run: true, code: `
const listeners = [];
const first = () => { out.push('first'); listeners.splice(listeners.indexOf(first), 1); };
const second = () => out.push('second');
const out = [];
listeners.push(first, second);
for (let i = 0; i < listeners.length; i++) listeners[i]();   // live array: second is skipped!
console.log(out); // ['first']

const out2 = [], l2 = [];
const f2 = () => { out2.push('first'); l2.splice(l2.indexOf(f2), 1); };
l2.push(f2, () => out2.push('second'));
for (const fn of [...l2]) fn();                                 // snapshot
console.log(out2); // ['first', 'second']
` } },
      { title: 'Typed events with a tiny mitt-style emitter', html: `<p><b>mitt</b> (a ~200-byte library) uses a Map of handler arrays and supports a wildcard <code>'*'</code> that receives every event. Wildcards are great for logging/analytics.</p>`, code: { lang: 'js', run: true, code: `
function mitt() {
  const all = new Map();
  return {
    on(type, h) { (all.get(type) || all.set(type, []).get(type)).push(h); },
    off(type, h) { const hs = all.get(type); if (hs) hs.splice(hs.indexOf(h) >>> 0, 1); },
    emit(type, evt) {
      (all.get(type) || []).slice().forEach((h) => h(evt));
      (all.get('*') || []).slice().forEach((h) => h(type, evt));  // wildcard listeners
    }
  };
}
const em = mitt();
em.on('*', (type, e) => console.log('[log]', type, e));
em.on('cart:add', (e) => console.log('added', e.sku));
em.emit('cart:add', { sku: 'P-42' }); // added P-42 / [log] cart:add { sku: 'P-42' }
` } },
      { title: 'One failing listener should not break the others', html: `<p>For an app-level bus, isolate listener errors: catch, collect, and report them (or rethrow asynchronously with <code>queueMicrotask</code>), so one buggy subscriber cannot stop notifications to everyone else.</p>`, code: { lang: 'js', run: true, code: `
function safeEmit(listeners, ...args) {
  const errors = [];
  for (const fn of [...listeners]) {
    try { fn(...args); } catch (err) { errors.push(err); }
  }
  if (errors.length) console.log('listener errors:', errors.map((e) => e.message));
}
safeEmit([
  () => console.log('analytics ok'),
  () => { throw new Error('toast crashed'); },
  () => console.log('cache ok')
]);
// analytics ok / cache ok / listener errors: ['toast crashed']
` } },
      { title: 'Awaiting an event once (promise wrapper)', html: `<p>Node ships <code>events.once(emitter, name)</code> which returns a promise. You can build it on top of your <code>once</code> — handy for "wait until the server is ready".</p>`, code: { lang: 'js', run: true, code: `
class Emitter {
  constructor() { this.m = {}; }
  on(n, f) { (this.m[n] = this.m[n] || []).push(f); }
  off(n, f) { this.m[n] = (this.m[n] || []).filter((x) => x !== f); }
  once(n, f) { const w = (...a) => { this.off(n, w); f(...a); }; this.on(n, w); }
  emit(n, ...a) { (this.m[n] || []).slice().forEach((f) => f(...a)); }
}
const onceAsync = (em, name) => new Promise((resolve) => em.once(name, (...args) => resolve(args)));
const server = new Emitter();
onceAsync(server, 'ready').then(([port]) => console.log('ready on', port));
setTimeout(() => server.emit('ready', 8080), 10);
` } }
    ],
    deepDive: `<p>🟣 <b>Node's EventEmitter internals:</b> listeners live in <code>this._events</code>, a prototype-less object. As a memory optimisation, an event with <b>one</b> listener stores the function directly (not an array); only the second <code>on</code> upgrades it to an array. <code>emit</code> copies the array (<code>arrayClone</code>) before iterating — the same snapshot rule. <code>prependListener</code> adds to the front; <code>'newListener'</code>/<code>'removeListener'</code> meta-events fire on changes.</p>
<p><b>Synchronous by design:</b> <code>emit</code> calls listeners <b>synchronously</b>, in order, on the current call stack. Code after <code>emit()</code> runs after all listeners finish. If a listener should not block the emitter, it can defer itself (<code>setImmediate</code>/<code>queueMicrotask</code>). Contrast with DOM events from user input, which are dispatched as separate tasks, while <code>element.dispatchEvent()</code> is synchronous.</p>
<p><b>The browser's EventTarget</b> is available everywhere now (including Node): <code>new EventTarget()</code> + <code>addEventListener</code> + <code>dispatchEvent(new CustomEvent('x', { detail }))</code>. It dedupes identical listeners, supports <code>{ once: true }</code> and <code>{ signal }</code> (remove via AbortController — the cleanest unsubscribe for many listeners at once).</p>
<p><b>Memory leaks:</b> emitters hold <b>strong</b> references to listeners. A long-lived emitter (global bus, socket) + short-lived subscribers (components) = leak unless unsubscribed. Patterns: return disposer functions, use <code>AbortSignal</code>, or <code>WeakRef</code>-based listeners for caches (rarely worth the complexity).</p>
<p><b>Complexity:</b> on O(1) amortised, emit O(k) for k listeners, off O(k) with an array (O(1) with a Set, but then duplicates are impossible and order is insertion order anyway). For thousands of listeners per event, consider a Set or a linked list.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an AI can generate an emitter in one shot, so interviewers focus on <b>behavioural edge cases</b>: mutation during emit, <code>off</code> for once-listeners, error isolation, ordering, sync vs async delivery, and leaks. Expect live "now add wildcard / priority / async emit" extensions.</p>
<p><b>Use AI as a partner:</b> <code>Act as an interviewer. Ask me 6 increasingly hard follow-ups about my EventEmitter, one at a time, and point out any behaviour that differs from Node's.</code></p>
<p><b>Where AI goes wrong:</b> iterates the live array; implements <code>once</code> by removing <i>after</i> calling (re-entrant emits call it twice); uses <code>filter</code> in <code>off</code> which removes <b>all</b> duplicates; forgets to delete empty lists (tiny leak); makes emit async without saying so.</p>
<p><b>What you must still own:</b> deciding when an event bus is the right tool — it decouples components but hides control flow; overuse makes apps hard to debug. In React apps, prefer state/context; in Node, emitters are idiomatic for streams and lifecycle events.</p>`,
    problems: [{
      title: 'Build an EventEmitter with on, off, once and emit', level: 'Medium', tags: ['design', 'pub-sub', 'class'], companies: ['Uber', 'Microsoft', 'Swiggy', 'Rippling', 'Zeta'],
      statement: `<p>Implement a class <code>EventEmitter</code> with: <code>on(name, fn)</code> → returns an unsubscribe function; <code>off(name, fn)</code>; <code>once(name, fn)</code> → listener runs at most once; <code>emit(name, ...args)</code> → calls listeners in subscription order and returns <code>true</code> if any listener existed. Listeners added or removed <b>during</b> an emit must not affect that emit.</p>`,
      constraints: `Up to 10<sup>4</sup> listeners per event. Same function may be subscribed twice (it then runs twice). <code>off</code> removes one occurrence. <code>off(name, fn)</code> must also remove a pending <code>once(name, fn)</code>.`,
      example: `<p><code>const e = new EventEmitter(); const un = e.on('x', A); e.once('x', B);</code><br><code>e.emit('x', 1)</code> → A(1), B(1) → ${H.c('g', 'true')}<br><code>e.emit('x', 2)</code> → A(2) only<br><code>un(); e.emit('x', 3)</code> → ${H.c('r', 'false')} (no listeners left)</p>`,
      brute: { why: `<p>A plain-object version that loops over the <b>live</b> array and implements once with a boolean flag seems to work, but it skips listeners when one unsubscribes mid-emit, never actually removes once-listeners (memory leak), and cannot remove a once-listener by its original function.</p>`, code: `
class NaiveEmitter {
  constructor() { this.events = {}; }
  on(n, f) { (this.events[n] = this.events[n] || []).push(f); }
  off(n, f) { const l = this.events[n] || []; l.splice(l.indexOf(f), 1); } // indexOf -1 removes the LAST item!
  emit(n, ...a) { const l = this.events[n] || []; for (let i = 0; i < l.length; i++) l[i](...a); }
}
` },
      mcq: { q: '<code>off</code> uses <code>list.splice(list.indexOf(fn), 1)</code>. What happens if fn is not in the list?', options: ['<code>indexOf</code> returns −1 and <code>splice(-1, 1)</code> removes the LAST listener', 'Nothing happens', 'It throws a RangeError', 'It removes the first listener'], answer: 0, explain: 'Negative indexes count from the end in splice. Always check <code>i &gt;= 0</code> first — a classic subtle bug.' },
      hints: [`<p>Hint 1: store <code>Map&lt;name, Function[]&gt;</code>. on = push; off = find index and splice (guard −1!).</p>`, `<p>Hint 2: once = a wrapper function that calls <code>off(name, wrapper)</code> and then the real fn. Store <code>wrapper.original = fn</code> so <code>off(name, fn)</code> can find it.</p>`, `<p>Hint 3: emit loops over <code>[...list]</code> (snapshot). on returns <code>() =&gt; this.off(name, fn)</code>. Return true/false from emit based on whether the list was non-empty.</p>`],
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var e = new EventEmitter(), log = [];\n  var A = function (v) { log.push('A' + v); }, B = function (v) { log.push('B' + v); };\n  if (k === 'example') { var un = e.on('x', A); e.once('x', B); var r1 = e.emit('x', 1), r2 = e.emit('x', 2); un(); var r3 = e.emit('x', 3); return [r1, r2, r3, log]; }\n  if (k === 'offOnce') { e.once('y', B); e.off('y', B); return [e.emit('y', 1), log]; }\n  if (k === 'twice') { e.on('t', A); e.on('t', A); e.emit('t', 1); e.off('t', A); e.emit('t', 2); return log; }\n  if (k === 'order') { e.on('o', function () { log.push(1); }); e.on('o', function () { log.push(2); }); e.emit('o'); return log; }\n  if (k === 'addDuring') { e.on('a', function () { log.push('first'); e.on('a', function () { log.push('late'); }); }); e.emit('a'); return log; }\n  if (k === 'removeDuring') { var later = function () { log.push('later'); }; e.on('r', function () { log.push('first'); e.off('r', later); }); e.on('r', later); e.emit('r'); return log; }\n  if (k === 'none') return [e.emit('nothing'), e.emit('nothing', 1, 2)];\n  if (k === 'args') { e.on('p', function (a, b) { log.push([a, b]); }); e.emit('p', 1, 'two'); return log; }\n  if (k === 'onceOnce') { var n = 0; e.once('z', function () { n++; }); e.emit('z'); e.emit('z'); e.emit('z'); return n; }\n  if (k === 'unsubTwice') { var u = e.on('u', A); u(); u(); return e.emit('u', 1); }\n  if (k === 'many') { var c = 0; for (var i = 0; i < 10000; i++) e.on('m', function () { c++; }); e.emit('m'); return c; }\n  if (k === 'separateEvents') { e.on('a1', function () { log.push('a1'); }); e.on('b1', function () { log.push('b1'); }); e.emit('b1'); return log; }\n}"},"cases":[[["example"],[true,true,false,["A1","B1","A2"]]],[["offOnce"],[false,[]]],[["twice"],["A1","A1","A2"]],[["order"],[1,2]],[["addDuring"],["first"]],[["removeDuring"],["first","later"]],[["none"],[false,false]],[["args"],[[1,"two"]]],[["onceOnce"],1],[["unsubTwice"],false],[["many"],10000],[["separateEvents"],["b1"]]]},
      solution: {
        approach: `<p>Map of arrays; unsubscribe closures; once via a self-removing wrapper tagged with the original; emit over a snapshot so in-flight mutations are invisible to the current dispatch.</p>`,
        code: { lang: 'js', run: true, code: `
class EventEmitter {
  constructor() { this.events = new Map(); }
  on(name, fn) {
    if (!this.events.has(name)) this.events.set(name, []);
    this.events.get(name).push(fn);
    return () => this.off(name, fn);
  }
  off(name, fn) {
    const list = this.events.get(name);
    if (!list) return;
    const i = list.findIndex((l) => l === fn || l.original === fn);
    if (i >= 0) list.splice(i, 1);
  }
  once(name, fn) {
    const wrapper = (...args) => { this.off(name, wrapper); fn(...args); };
    wrapper.original = fn;
    return this.on(name, wrapper);
  }
  emit(name, ...args) {
    const list = this.events.get(name);
    if (!list || list.length === 0) return false;
    for (const fn of [...list]) fn(...args);
    return true;
  }
}

const e = new EventEmitter(), log = [];
const A = (v) => log.push('A' + v), B = (v) => log.push('B' + v);
const un = e.on('x', A);
e.once('x', B);
console.log(e.emit('x', 1), e.emit('x', 2)); // true true
un();
console.log(e.emit('x', 3), log);            // false [ 'A1', 'B1', 'A2' ]
` },
        dry: { head: ['op', 'list for "x" after', 'calls', 'returns'], rows: [['on(x, A)', '[A]', '—', 'unsubscribe fn'], ['once(x, B)', '[A, wrap(B)]', '—', 'unsubscribe fn'], ['emit(x, 1)', '[A]  (wrapper removed itself)', 'A1, B1', 'true'], ['emit(x, 2)', '[A]', 'A2', 'true'], ['un(); emit(x, 3)', '[]', '—', 'false']] },
        complexity: `<p>on: O(1) amortised. off: O(k). emit: O(k) time and O(k) temporary memory for the snapshot (k = listeners for that event).</p>`,
        followUps: ['Add a wildcard <code>*</code> listener.', 'Add priorities (higher priority runs first).', 'Add <code>emitAsync</code> that awaits async listeners in order / in parallel.']
      }
    }]
  });

  /* ================= TOPIC 8: retry with exponential backoff ================= */
  var RETRY_SRC = [
    'async function retry(fn, { retries = 3, base = 100, max = 2000 } = {}) {',
    '  for (let attempt = 0; ; attempt++) {',
    '    try {',
    '      return await fn(attempt);           // success: done',
    '    } catch (err) {',
    '      if (attempt >= retries || !isRetryable(err)) throw err;',
    '      const cap = Math.min(max, base * 2 ** attempt);',
    '      const delay = Math.random() * cap;  // full jitter',
    '      await sleep(delay);',
    '    }',
    '  }',
    '}'
  ].join('\n');

  topics.push({
    title: 'Retry with Exponential Backoff and Jitter',
    analogy: `<p>You call a friend and the line is busy. You do not hit redial <b>every second</b> for an hour — that is annoying and keeps the line busy. You wait 1 minute, then 2, then 4, then 8… and after a few tries you give up and send a text. That is <b>exponential backoff</b>.</p>
<p>Now imagine <b>1 000 people</b> all trying to call the same radio show at the same moment. If everyone waits <i>exactly</i> 1, 2, 4 minutes, they all redial at the same instants and jam the line again. If each person adds a <b>random</b> wait (<b>jitter</b>), the calls spread out and get through.</p>`,
    explain: `<p>🟢 <b>Why retry?</b> Networks and servers fail <b>temporarily</b> all the time: a dropped packet, a server restarting, a rate limit (HTTP 429), "service unavailable" (503). Many of those succeed if you simply try again a bit later. But retrying <b>blindly and immediately</b> makes overload worse (a "retry storm").</p>
<p>🔵 <b>The recipe</b> — every term matters:</p>
<ul><li><b>Max retries</b> (e.g. 3–5): never retry forever. After the last attempt, give up and throw the <b>last error</b>.</li>
<li><b>Exponential delay:</b> <code>base × 2<sup>attempt</sup></code> → 100, 200, 400, 800 ms… The server gets more breathing room each time.</li>
<li><b>Cap</b> (<code>maxDelay</code>): 2<sup>10</sup> × 100 ms is 102 s — too long. Clamp: <code>min(maxDelay, base × 2<sup>attempt</sup>)</code>.</li>
<li><b>Jitter:</b> randomise the wait so many clients do not retry in lockstep. "Full jitter" (popularised by AWS): <code>delay = random(0, cap)</code>.</li>
<li><b>Only retry retryable errors:</b> network errors, 408, 429, 500, 502, 503, 504. Do <b>not</b> retry 400 (bad request), 401/403 (auth), 404, 422 — they will fail the same way every time.</li>
<li><b>Respect <code>Retry-After</code></b> headers on 429/503 when the server tells you how long to wait.</li></ul>
${H.table(['attempt', 'base × 2^attempt', 'cap (max 2000)', 'full-jitter wait'], [['0 (first retry)', '100', '100', '0–100 ms'], ['1', '200', '200', '0–200 ms'], ['2', '400', '400', '0–400 ms'], ['3', '800', '800', '0–800 ms'], ['5', '3200', H.c('y', '2000'), '0–2000 ms']])}
<p>🔵 <b>Idempotency — the safety question.</b> Retrying a <code>GET</code> is safe. Retrying "charge the card ₹500" may charge <b>twice</b> if the first request actually succeeded but the response got lost. Make writes idempotent (send an <b>Idempotency-Key</b> header the server de-duplicates) before you retry them.</p>
<p>🔵 <b>Cancellation:</b> a user leaving the page should stop the retry loop. Accept an <code>AbortSignal</code> and check it before each attempt and during the sleep.</p>`,
    clues: ['"Implement retry(fn, n) for a flaky API / promise" → loop with try/catch + await', '"Wait longer between each attempt" → exponential backoff base × 2^n', '"Many clients retry at the same time (thundering herd)" → add jitter', '"Don\'t retry on 4xx, do retry on 5xx / 429 / network errors" → retryable predicate', '"Server sends Retry-After" → honour it instead of your own delay', '"Payment / write request being retried" → idempotency keys, at-least-once semantics'],
    code: [{ lang: 'js', run: true, title: 'retry with exponential backoff, full jitter, retryable errors and AbortSignal (runnable)', code: `
const sleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal && signal.aborted) return reject(signal.reason);
  const t = setTimeout(resolve, ms);
  if (signal) signal.addEventListener('abort', () => { clearTimeout(t); reject(signal.reason); }, { once: true });
});

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
function isRetryable(err) {
  if (err && err.name === 'AbortError') return false;     // user cancelled: stop
  if (err && typeof err.status === 'number') return RETRYABLE_STATUS.has(err.status);
  return true;                                             // network-ish error: retry
}

async function retry(fn, { retries = 3, base = 100, max = 2000, jitter = true, signal, onRetry } = {}) {
  for (let attempt = 0; ; attempt++) {
    if (signal && signal.aborted) throw signal.reason;
    try {
      return await fn(attempt);                            // success
    } catch (err) {
      if (attempt >= retries || !isRetryable(err)) throw err; // out of tries / pointless to retry
      const cap = Math.min(max, base * 2 ** attempt);
      let delay = jitter ? Math.random() * cap : cap;      // full jitter
      if (err.retryAfterMs) delay = Math.max(delay, err.retryAfterMs); // server knows best
      if (onRetry) onRetry({ attempt: attempt + 1, delay: Math.round(delay), err });
      await sleep(delay, signal);
    }
  }
}

// ---------- tests ----------
function flaky(failTimes, status = 503) {
  let calls = 0;
  return async () => {
    calls++;
    if (calls <= failTimes) { const e = new Error('HTTP ' + status); e.status = status; throw e; }
    return 'ok after ' + calls + ' calls';
  };
}

(async () => {
  console.log(await retry(flaky(2), { base: 5, jitter: false,
    onRetry: (r) => console.log('  retry #' + r.attempt + ' in ' + r.delay + ' ms (' + r.err.message + ')') }));
  // retry #1 in 5 ms, retry #2 in 10 ms, then: ok after 3 calls

  try { await retry(flaky(10), { retries: 2, base: 5 }); }
  catch (e) { console.log('gave up:', e.message); }        // gave up: HTTP 503 (after 3 calls)

  let calls404 = 0;
  try { await retry(async () => { calls404++; const e = new Error('HTTP 404'); e.status = 404; throw e; }, { base: 5 }); }
  catch (e) { console.log('404 not retried, calls =', calls404); } // 1

  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(new Error('user left page')), 20);
  try { await retry(flaky(100), { retries: 50, base: 10, signal: ctrl.signal }); }
  catch (e) { console.log('aborted:', e.message); }        // aborted: user left page
})();
` }],
    codeTitle: ['retry with backoff'],
    viz: [{
      title: 'Backoff schedule: attempts, delays and the cap',
      input: '100 1000 | fail fail fail fail ok',
      inputLabel: 'base max | outcome of each attempt (fail / ok / 404)',
      gen: function (input) {
        var parts = String(input).split('|');
        var nums = parseNums(parts[0], 2);
        if (nums.length !== 2 || nums[0] <= 0 || nums[1] < nums[0]) throw new Error('First part: base max, e.g. 100 1000 (max ≥ base)');
        var base = nums[0], max = nums[1];
        var outs = String(parts[1] || '').trim().split(/[\s,]+/).filter(function (x) { return x; });
        if (!outs.length || outs.length > 8 || outs.some(function (o) { return ['fail', 'ok', '404'].indexOf(o) < 0; })) throw new Error('Outcomes: 1 to 8 of fail / ok / 404');
        var retries = 5;
        var rows = [], delays = [], f = [], clock = 0;
        f.push(fr('retry(fn, { retries: ' + retries + ', base: ' + base + ', max: ' + max + ' }). Each failed attempt waits <code>random(0, min(max, base × 2<sup>attempt</sup>))</code>. The table shows the <b>cap</b> (the upper bound of the random wait).', [cp(RETRY_SRC, { 1: 'cur' }), { type: 'table', label: 'Attempts', columns: ['attempt', 'outcome', 'cap = min(max, base·2^n)', 'wait range', 'worst-case clock'], rows: [['—', '—', '—', '—', '0 ms']] }]));
        for (var a = 0; a < outs.length; a++) {
          var o = outs[a];
          if (o === 'ok') {
            rows.push([a, 'success', '—', '—', clock + ' ms']);
            f.push(fr('Attempt ' + a + ' <span class="c-g">succeeds</span> → return its value immediately. Total worst-case waiting: <b>' + clock + ' ms</b> over ' + a + ' retries.', [cp(RETRY_SRC, { 4: 'ok' }), { type: 'table', label: 'Attempts', columns: ['attempt', 'outcome', 'cap = min(max, base·2^n)', 'wait range', 'worst-case clock'], rows: rows.slice(), hl: (function () { var h = {}; h[rows.length - 1] = 'ok'; return h; })() }, { type: 'bars', label: 'cap per retry (ms)', values: delays.length ? delays.slice() : [0] }]));
            break;
          }
          if (o === '404') {
            rows.push([a, '404 Not Found', '—', '—', clock + ' ms']);
            f.push(fr('Attempt ' + a + ' fails with <b>404</b>. That is <b>not retryable</b> — asking again will not make the page exist. <span class="c-r">Throw immediately</span>, no waiting.', [cp(RETRY_SRC, { 6: 'bad' }), { type: 'table', label: 'Attempts', columns: ['attempt', 'outcome', 'cap = min(max, base·2^n)', 'wait range', 'worst-case clock'], rows: rows.slice(), hl: (function () { var h = {}; h[rows.length - 1] = 'bad'; return h; })() }]));
            break;
          }
          if (a >= retries) {
            rows.push([a, 'fail (503)', '—', '—', clock + ' ms']);
            f.push(fr('Attempt ' + a + ' fails and we have used all ' + retries + ' retries → <span class="c-r">throw the last error</span>. Never retry forever.', [cp(RETRY_SRC, { 6: 'bad' }), { type: 'table', label: 'Attempts', columns: ['attempt', 'outcome', 'cap = min(max, base·2^n)', 'wait range', 'worst-case clock'], rows: rows.slice(), hl: (function () { var h = {}; h[rows.length - 1] = 'bad'; return h; })() }]));
            break;
          }
          var raw = base * Math.pow(2, a), cap = Math.min(max, raw);
          clock += cap; delays.push(cap);
          rows.push([a, 'fail (503)', raw > max ? raw + ' → capped ' + cap : String(cap), '0 – ' + cap + ' ms', clock + ' ms']);
          f.push(fr('Attempt ' + a + ' fails with 503 (retryable). cap = min(' + max + ', ' + base + ' × 2<sup>' + a + '</sup> = ' + raw + ') = <b>' + cap + '</b>' + (raw > max ? ' <span class="c-y">(the cap kicked in)</span>' : '') + '. Sleep a random time in [0, ' + cap + '] ms, then try again.', [cp(RETRY_SRC, { 7: 'cur', 8: 'cur', 9: 'cur' }), { type: 'table', label: 'Attempts', columns: ['attempt', 'outcome', 'cap = min(max, base·2^n)', 'wait range', 'worst-case clock'], rows: rows.slice(), hl: (function () { var h = {}; h[rows.length - 1] = 'cur'; return h; })() }, { type: 'bars', label: 'cap per retry (ms) — doubles, then flattens at max', values: delays.slice(), hl: (function () { var h = {}; h[delays.length - 1] = raw > max ? 'bad' : 'cur'; return h; })() }]));
        }
        if (outs[outs.length - 1] === 'fail' && outs.length <= retries) f.push(fr('Input ended while still failing; in real life the loop would keep going up to ' + retries + ' retries, then throw.', [vp({ retries: retries, 'attempts shown': outs.length })]));
        f.push(fr('Why jitter? Without it, 1 000 clients that failed together would all retry at exactly ' + delays.slice(0, 3).join(', ') + ' ms… and collide again. Random waits in [0, cap] spread them evenly, so the recovering server sees a smooth trickle instead of spikes.', [tx('<b>No jitter:</b> spikes of 1 000 requests at the same instants.<br><b>Full jitter:</b> ~1 000 / cap requests per ms — flat load.', 'Thundering herd')]));
        return f;
      }
    }],
    examples: [
      { title: 'Retrying fetch only on retryable HTTP statuses', html: `<p><code>fetch</code> only rejects on <b>network</b> errors; HTTP 500 is a resolved response with <code>ok: false</code>. So you must turn bad statuses into thrown errors yourself, tagging them with the status so the retry policy can decide. Shown as code (needs network).</p>`, code: `
async function fetchJson(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = new Error('HTTP ' + res.status);
    err.status = res.status;
    const ra = res.headers.get('Retry-After');           // seconds or an HTTP date
    if (ra) err.retryAfterMs = isNaN(ra) ? Math.max(0, Date.parse(ra) - Date.now()) : Number(ra) * 1000;
    throw err;
  }
  return res.json();
}
// usage: await retry(() => fetchJson('/api/orders'), { retries: 4, base: 200, max: 5000 });
` },
      { title: 'Compare jitter strategies numerically', html: `<p>AWS's analysis compared "no jitter", "full jitter", "equal jitter" (half fixed + half random) and "decorrelated jitter" (<code>min(cap, random(base, prev × 3))</code>). Full and decorrelated jitter finish the work with the fewest total calls.</p>`, code: { lang: 'js', run: true, code: `
const base = 100, cap = 2000;
const expo = (n) => Math.min(cap, base * 2 ** n);
const strategies = {
  none:  (n) => expo(n),
  full:  (n) => Math.random() * expo(n),
  equal: (n) => expo(n) / 2 + Math.random() * (expo(n) / 2)
};
for (const [name, f] of Object.entries(strategies)) {
  const sample = [0, 1, 2, 3, 4, 5].map((n) => Math.round(f(n)));
  console.log(name.padEnd(5), sample.join(' '));
}
let prev = base; const decor = [];
for (let i = 0; i < 6; i++) { prev = Math.min(cap, base + Math.random() * (prev * 3 - base)); decor.push(Math.round(prev)); }
console.log('decor', decor.join(' '));
` } },
      { title: 'Idempotency key: making a retried payment safe', html: `<p>The client generates one key per <i>logical</i> operation and sends it with every retry. The server stores <code>key → result</code>; a duplicate request returns the stored result instead of charging again.</p>`, code: { lang: 'js', run: true, code: `
const processed = new Map();                  // server-side store: key -> result
let charges = 0;
function chargeServer(key, amount) {
  if (processed.has(key)) return processed.get(key);   // duplicate: replay result
  charges++;
  const result = { id: 'ch_' + charges, amount };
  processed.set(key, result);
  if (charges === 1 && !chargeServer.lostOnce) { chargeServer.lostOnce = true; throw new Error('response lost'); }
  return result;
}
const key = 'order-42-attempt';               // same key for every retry
let res;
for (let i = 0; i < 3; i++) { try { res = chargeServer(key, 500); break; } catch (e) { console.log('retrying:', e.message); } }
console.log(res, 'total charges =', charges); // { id: 'ch_1', amount: 500 } total charges = 1
` } },
      { title: 'Circuit breaker: when to stop retrying altogether', html: `<p>If a service is down hard, every client retrying 5 times multiplies load ×5. A <b>circuit breaker</b> counts recent failures; after a threshold it "opens" and fails fast for a cool-down, then lets one trial request through ("half-open").</p>`, code: { lang: 'js', run: true, code: `
function circuitBreaker(fn, { threshold = 3, coolDownMs = 50 } = {}) {
  let failures = 0, openedAt = 0;
  return async (...args) => {
    if (failures >= threshold && Date.now() - openedAt < coolDownMs) throw new Error('circuit open: failing fast');
    try { const r = await fn(...args); failures = 0; return r; }
    catch (e) { failures++; if (failures >= threshold) openedAt = Date.now(); throw e; }
  };
}
const down = circuitBreaker(async () => { throw new Error('503'); });
(async () => {
  for (let i = 0; i < 5; i++) { try { await down(); } catch (e) { console.log(i, e.message); } }
})(); // 0..2: 503, then 3..4: circuit open: failing fast
` } }
    ],
    deepDive: `<p>🟣 <b>Retry amplification.</b> In a call chain A → B → C where each layer retries 3 times, one failure at C can cause 3 × 3 × 3 = 27 calls. Rule of thumb: <b>retry at one layer only</b> (usually the edge/client), and use <b>retry budgets</b> (e.g. retries may add at most 10% extra load — gRPC and Envoy support this).</p>
<p><b>Deadlines beat counts.</b> Production clients often say "keep trying for at most 10 s total" rather than "3 times". Pass the remaining deadline downstream (gRPC deadline propagation, or <code>AbortSignal.timeout()</code> combined with <code>AbortSignal.any</code>) so inner calls do not keep working after the caller gave up.</p>
<p><b>Which errors are retryable?</b> Also consider: <code>ECONNRESET</code>/<code>ETIMEDOUT</code> (yes), TLS/certificate errors (no), 409 conflict (maybe, after re-reading), and <b>non-idempotent methods</b> — POST should not be retried unless an idempotency key is used. HTTP/2 <code>GOAWAY</code> and "connection closed before response" mean the request may or may not have been processed.</p>
<p><b>Math:</b> with base b and k retries without cap, total worst-case wait = b(2<sup>k</sup> − 1). With full jitter the expected wait per retry is cap/2. Success probability with independent failure rate p per try is 1 − p<sup>k+1</sup> — e.g. p = 0.2 and 3 retries → 99.84%. Failures are often <b>correlated</b> (an outage), which is why a breaker matters.</p>
<p><b>Testing:</b> never test with real sleeps of seconds. Inject the <code>sleep</code> and <code>random</code> functions (dependency injection) or use fake timers, so tests are instant and deterministic.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI agents themselves call flaky APIs constantly — LLM providers return 429 (rate limit) and 529/503 (overloaded). Every agent framework needs exactly this utility, and official SDKs (OpenAI, Anthropic) ship built-in retries with exponential backoff and respect <code>retry-after</code>. Knowing the policy lets you tune it instead of stacking a second retry layer on top (amplification!).</p>
<p><b>Use AI as a partner:</b> <code>Review my retry helper for: non-idempotent retries, missing jitter, retrying 4xx, no cap, no abort support, retry amplification with the SDK's own retries.</code></p>
<p><b>Where AI goes wrong:</b> writes <code>for</code> loops with <code>setTimeout</code> that do not await (all retries fire at once), retries every error including 400/401, recursive retry without a limit, and forgets that <code>fetch</code> resolves on HTTP 500.</p>
<p><b>What you must still own:</b> the product decision — how long is the user willing to wait, is the operation safe to repeat, and what do we show after giving up.</p>`,
    problems: [{
      title: 'retry(fn, options) with capped exponential backoff', level: 'Medium', tags: ['async', 'promises', 'resilience'], companies: ['Amazon', 'Stripe', 'Razorpay', 'Netflix'],
      statement: `<p>Implement <code>retry(fn, { retries, base, max })</code>. <code>fn</code> returns a promise. If it rejects, wait <code>min(max, base × 2<sup>attempt</sup>)</code> ms (attempt = 0 for the first retry) and call it again, up to <code>retries</code> extra times. Resolve with the first success; if all attempts fail, reject with the <b>last</b> error. Errors with <code>err.retryable === false</code> must be rethrown immediately.</p>`,
      constraints: `0 ≤ retries ≤ 10. Must not block the thread (no busy waiting). Total calls ≤ retries + 1.`,
      example: `<p>fn fails twice then returns "ok"; base = 100, max = 1000.<br>call #1 fails → wait 100 → call #2 fails → wait 200 → call #3 → ${H.c('g', '"ok"')} (total wait 300 ms).<br>If fn always fails with retries = 2 → 3 calls, then ${H.c('r', 'reject with the 3rd error')}.</p>`,
      brute: { why: `<p>The tempting version schedules every retry with <code>setTimeout</code> inside a plain loop. The loop does not wait for anything, so all attempts fire almost at once (no backoff), and errors are never propagated to the caller because nothing awaits them.</p>`, code: `
function badRetry(fn, retries) {
  for (let i = 0; i <= retries; i++) {
    setTimeout(() => fn().catch(() => {}), 100 * 2 ** i); // fires all attempts regardless of success
  }
}
` },
      mcq: { q: 'All retries failed. What should <code>retry</code> reject with?', options: ['The last error (most recent cause)', 'The first error only', 'A generic "failed" string', 'undefined'], answer: 0, explain: 'The last error is the most relevant; better still, attach all errors (e.g. AggregateError or err.cause) for debugging.' },
      hints: [`<p>Hint 1: an <code>async</code> function with a <code>for</code> loop and <code>try/catch</code> around <code>await fn()</code> reads exactly like the English description.</p>`, `<p>Hint 2: a promise-based <code>sleep(ms)</code> lets you <code>await</code> the backoff without blocking. Delay = <code>Math.min(max, base * 2 ** attempt)</code>.</p>`, `<p>Hint 3: in the catch: if <code>attempt === retries</code> or <code>err.retryable === false</code> → <code>throw err</code>. Otherwise sleep and continue. Success → <code>return</code> the value.</p>`],
      tests: {"sig":"string int int int int -> string","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 300); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(k, retries, base, max, failTimes) {\n  return __job(async function () {\n    var delays = [], real = globalThis.setTimeout;\n    globalThis.setTimeout = function (fn, ms) { delays.push(ms); return real(fn, 0); };\n    var calls = 0;\n    try {\n      var fn = async function () { calls++; if (k === 'nonRetryable') throw Object.assign(new Error('bad input'), { retryable: false }); if (calls <= failTimes) throw new Error('fail ' + calls); return 'ok'; };\n      var result;\n      try { result = await retry(fn, { retries: retries, base: base, max: max }); } catch (e) { result = 'rejected ' + e.message; }\n      return [result, calls, delays];\n    } finally { globalThis.setTimeout = real; }\n  });\n}"},"cases":[[["t",5,100,1000,2],["ok",3,[100,200]]],[["t",2,100,1000,99],["rejected fail 3",3,[100,200]]],[["t",5,100,300,99],["rejected fail 6",6,[100,200,300,300,300]]],[["t",3,10,1000,0],["ok",1,[]]],[["t",0,10,1000,1],["rejected fail 1",1,[]]],[["nonRetryable",5,10,100,0],["rejected bad input",1,[]]],[["t",10,1,1000,10],["ok",11,[1,2,4,8,16,32,64,128,256,512]]],[["t",3,50,60,3],["ok",4,[50,60,60]]]]},
      solution: {
        approach: `<p>Async loop: try the call; on failure decide (give up vs wait), compute the capped exponential delay, await a promise-based sleep, and loop. The function's own promise naturally resolves/rejects with the outcome.</p>`,
        code: { lang: 'js', run: true, code: `
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function retry(fn, { retries = 3, base = 100, max = 2000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || err.retryable === false) throw err;
      await sleep(Math.min(max, base * 2 ** attempt));
    }
  }
}

let n = 0;
const t0 = Date.now();
retry(async () => { n++; if (n < 3) throw new Error('fail ' + n); return 'ok'; }, { base: 10, max: 100 })
  .then((v) => console.log(v, 'after', n, 'calls, waited ~', Math.round((Date.now() - t0) / 10) * 10, 'ms')); // ok after 3 calls, waited ~30-40 ms (10 + 20 plus timer overhead)

retry(async () => { throw Object.assign(new Error('bad input'), { retryable: false }); }, { base: 10 })
  .catch((e) => console.log('no retry for:', e.message));
` },
        dry: { head: ['attempt', 'fn result', 'decision', 'wait (base 10, max 100)'], rows: [['0', 'throws fail 1', 'attempt &lt; retries → wait', 'min(100, 10·1) = 10'], ['1', 'throws fail 2', 'wait', 'min(100, 10·2) = 20'], ['2', "returns 'ok'", '<span class="c-g">return ok</span>', '—'], ['(other call) 0', 'throws retryable:false', '<span class="c-r">rethrow now</span>', '—']] },
        complexity: `<p>At most retries + 1 calls. Worst-case total wait = Σ min(max, base·2<sup>i</sup>) for i &lt; retries. O(1) memory.</p>`,
        followUps: ['Add full jitter and an AbortSignal.', 'Honour a Retry-After value on the error.', 'Collect every error and reject with an AggregateError.']
      }
    }]
  });

  /* ================= TOPIC 9: LRU cache in JS ================= */
  var LRU_SRC = [
    'class LRUCache {',
    '  constructor(capacity) { this.cap = capacity; this.map = new Map(); }',
    '  get(key) {',
    '    if (!this.map.has(key)) return -1;',
    '    const val = this.map.get(key);',
    '    this.map.delete(key);           // move to the "newest" end',
    '    this.map.set(key, val);',
    '    return val;',
    '  }',
    '  put(key, val) {',
    '    if (this.map.has(key)) this.map.delete(key);',
    '    this.map.set(key, val);',
    '    if (this.map.size > this.cap) {',
    '      const oldest = this.map.keys().next().value;',
    '      this.map.delete(oldest);      // evict least recently used',
    '    }',
    '  }',
    '}'
  ].join('\n');

  topics.push({
    title: 'LRU Cache in JavaScript (Map trick and Linked List)',
    analogy: `<p>Your <b>study desk</b> has room for only 3 books. The rest live on a far-away shelf. Every time you use a book you put it on <b>top of the pile</b>. When you need a 4th book and the desk is full, which one goes back to the shelf? The one at the <b>bottom of the pile</b> — the one you have not touched for the longest time. That is <b>Least Recently Used</b> eviction.</p>
<p>In JavaScript, a <code>Map</code> is that pile: it remembers the order in which keys were inserted. "Touching" a book = delete it and insert it again, so it moves to the top.</p>`,
    explain: `<p>🟢 <b>The task</b> (LeetCode 146, asked everywhere): a cache with a fixed <b>capacity</b> supporting <code>get(key)</code> and <code>put(key, value)</code>, both in <b>O(1)</b>. When full, <code>put</code> evicts the least recently used key. Both <code>get</code> and <code>put</code> count as "use".</p>
<p>🔵 <b>The JS shortcut: Map keeps insertion order.</b> The spec guarantees that iterating a <code>Map</code> yields keys in insertion order. So:</p>
<ul><li><b>Oldest</b> key = <code>map.keys().next().value</code> (the first one) — O(1).</li>
<li><b>Mark as recently used</b> = <code>map.delete(k); map.set(k, v)</code> — moves it to the end, O(1).</li>
<li><b>Evict</b> = delete the first key when <code>size &gt; capacity</code>.</li></ul>
${H.table(['op (capacity 2)', 'Map order (oldest → newest)', 'note'], [['put(a,1)', 'a', ''], ['put(b,2)', 'a, b', ''], ['get(a) → 1', 'b, a', 'a moved to newest'], ['put(c,3)', H.c('r', 'b evicted') + ' → a, c', 'b was oldest'], ['get(b) → -1', 'a, c', 'miss']])}
<p>🔵 <b>The classic way: HashMap + Doubly Linked List.</b> Interviewers often say "don't rely on Map ordering" to see the real data structure. The list holds nodes in recency order (head = most recent, tail = least recent). The hash map gives O(1) access from key → node. With <b>prev/next</b> pointers, unlinking any node is O(1). Two <b>sentinel</b> (dummy) nodes at head and tail remove all the "is the list empty?" special cases.</p>
${H.table(['Operation', 'Map-only', 'Map + DLL'], [['get hit', 'delete + set', 'unlink node, insert after head'], ['put new', 'set; evict first key if over', 'create node, insert after head; evict tail.prev if over'], ['put existing', 'delete + set', 'update value, move to head'], ['Complexity', 'O(1) average', 'O(1) average']])}
<p>🟢 <b>Where LRU is used:</b> browser HTTP caches, CDN edges, database buffer pools, React Query/Apollo caches, memoizing expensive functions with bounded memory, image thumbnails in an infinite feed.</p>`,
    clues: ['"Design a cache with capacity N; get and put in O(1)" → LRU = hash map + recency order', '"Evict the least recently used item" → Map ordering or doubly linked list', '"Without using Map\'s insertion order" → doubly linked list with sentinel nodes + object/Map index', '"Memoize but don\'t let memory grow forever" → LRU-bounded memoize', '"Items should also expire after T seconds" → LRU + TTL (store expiry, lazy delete on get)', '"Least FREQUENTLY used" → LFU (freq buckets), not LRU — read the wording!'],
    code: [{ lang: 'js', run: true, title: 'LRU two ways: Map-ordering and Map + doubly linked list (runnable)', code: `
// ---------- 1) Map insertion order (shortest correct answer) ----------
class LRUCache {
  constructor(capacity) { this.cap = capacity; this.map = new Map(); }
  get(key) {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key);
    this.map.delete(key);            // re-insert -> becomes the newest
    this.map.set(key, val);
    return val;
  }
  put(key, val) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, val);
    if (this.map.size > this.cap) this.map.delete(this.map.keys().next().value); // oldest
  }
}

// ---------- 2) Hash map + doubly linked list with sentinels ----------
class Node { constructor(k, v) { this.k = k; this.v = v; this.prev = this.next = null; } }
class LRUList {
  constructor(capacity) {
    this.cap = capacity; this.index = new Map();
    this.head = new Node(null, null);   // sentinel: head.next = most recent
    this.tail = new Node(null, null);   // sentinel: tail.prev = least recent
    this.head.next = this.tail; this.tail.prev = this.head;
  }
  #unlink(n) { n.prev.next = n.next; n.next.prev = n.prev; }
  #addFront(n) { n.next = this.head.next; n.prev = this.head; this.head.next.prev = n; this.head.next = n; }
  get(k) {
    const n = this.index.get(k);
    if (!n) return -1;
    this.#unlink(n); this.#addFront(n); // mark as most recently used
    return n.v;
  }
  put(k, v) {
    let n = this.index.get(k);
    if (n) { n.v = v; this.#unlink(n); this.#addFront(n); return; }
    n = new Node(k, v); this.index.set(k, n); this.#addFront(n);
    if (this.index.size > this.cap) {
      const lru = this.tail.prev;        // least recently used
      this.#unlink(lru); this.index.delete(lru.k);
    }
  }
  keys() { const out = []; for (let n = this.head.next; n !== this.tail; n = n.next) out.push(n.k); return out; }
}

// ---------- same script against both ----------
for (const C of [LRUCache, LRUList]) {
  const c = new C(2), out = [];
  c.put(1, 'one'); c.put(2, 'two');
  out.push(c.get(1));        // 'one'  (1 becomes most recent)
  c.put(3, 'three');         // evicts key 2
  out.push(c.get(2));        // -1
  c.put(4, 'four');          // evicts key 1
  out.push(c.get(1), c.get(3), c.get(4)); // -1 'three' 'four'
  console.log(C.name, out);
}
console.log(new LRUList(3).keys()); // []
` }],
    codeTitle: ['LRU cache two ways'],
    viz: [{
      title: 'LRU cache: linked list (recency) + Map (index)',
      input: '3 | put a 1; put b 2; put c 3; get a; put d 4; get b; put c 30; put e 5',
      inputLabel: 'capacity | commands: put KEY VALUE ; get KEY',
      gen: function (input) {
        var parts = String(input).split('|');
        var cap = Number((parts[0] || '').trim());
        if (!(cap >= 1 && cap <= 6) || Math.floor(cap) !== cap) throw new Error('Capacity must be 1..6. Format: 3 | put a 1; get a');
        var ops = cmds(parts[1] || '');
        if (!ops.length || ops.length > 14) throw new Error('Give 1 to 14 commands like put a 1; get a');
        var order = [], vals = {}, hits = 0, misses = 0, f = [];
        function listPart(hl, label) {
          var vs = ['HEAD'].concat(order.map(function (k) { return k + ':' + vals[k]; })).concat(['TAIL']);
          var h = {}; h[0] = 'done'; h[vs.length - 1] = 'done';
          Object.keys(hl || {}).forEach(function (k) { h[Number(k) + 1] = hl[k]; });
          var ptr = {}; if (order.length) { ptr[1] = 'MRU'; ptr[order.length] = order.length === 1 ? ['MRU', 'LRU'] : 'LRU'; }
          return { type: 'list', label: label || 'Doubly linked list (most recent → least recent)', values: vs, hl: h, ptr: ptr };
        }
        function mapPart(hlKey, cls) { var h = {}; if (hlKey !== undefined) h[hlKey] = cls; return { type: 'map', label: 'Map index: key → node', entries: order.map(function (k) { return [k, 'node(' + k + ':' + vals[k] + ')']; }), hl: h }; }
        function stats() { return vp({ capacity: cap, size: order.length, hits: hits, misses: misses }, {}, 'Stats'); }
        f.push(fr('Empty cache with capacity <b>' + cap + '</b>. The list starts as just the two <b>sentinels</b> HEAD ⇄ TAIL, so inserting/removing never needs "is it empty?" checks.', [listPart(), mapPart(), stats()]));
        ops.forEach(function (c) {
          var p = c.split(/\s+/);
          if (p[0] === 'get' && p[1]) {
            var k = p[1], i = order.indexOf(k);
            if (i < 0) {
              misses++;
              f.push(fr('<code>get(' + esc(k) + ')</code>: the Map has no "' + esc(k) + '" → <span class="c-r">miss, return -1</span>. Nothing moves.', [listPart(), mapPart(), stats(), cp(LRU_SRC, { 4: 'bad' })]));
            } else {
              hits++;
              var hlB = {}; hlB[i] = 'cur';
              f.push(fr('<code>get(' + esc(k) + ')</code>: Map lookup finds the node in O(1) → <span class="c-g">hit, value ' + esc(vals[k]) + '</span>. Now it must become the <b>most recent</b>…', [listPart(hlB), mapPart(k, 'ok'), stats(), cp(LRU_SRC, { 5: 'ok' })]));
              order.splice(i, 1); order.unshift(k);
              f.push(fr('…so unlink it (fix prev/next of its neighbours) and insert right after HEAD. With a JS Map this is <code>delete(' + esc(k) + ')</code> + <code>set(' + esc(k) + ')</code>.', [listPart({ 0: 'ok' }), mapPart(k, 'ok'), stats(), cp(LRU_SRC, { 6: 'cur', 7: 'cur' })]));
            }
          } else if (p[0] === 'put' && p[1] && p.length >= 3) {
            var key = p[1], val = p.slice(2).join(' ');
            var j = order.indexOf(key);
            if (j >= 0) {
              vals[key] = val; order.splice(j, 1); order.unshift(key);
              f.push(fr('<code>put(' + esc(key) + ', ' + esc(val) + ')</code>: key exists → update its value and move it to the front (a write is also a "use"). No eviction because size did not grow.', [listPart({ 0: 'ok' }), mapPart(key, 'ok'), stats(), cp(LRU_SRC, { 11: 'cur', 12: 'cur' })]));
            } else {
              vals[key] = val; order.unshift(key);
              f.push(fr('<code>put(' + esc(key) + ', ' + esc(val) + ')</code>: new key → create a node, insert after HEAD, add it to the Map. Size is now ' + order.length + (order.length > cap ? ' <span class="c-r">&gt; capacity ' + cap + '</span>.' : '.'), [listPart({ 0: 'ok' }), mapPart(key, 'ok'), stats(), cp(LRU_SRC, { 12: 'ok', 13: order.length > cap ? 'bad' : '' })]));
              if (order.length > cap) {
                var victim = order[order.length - 1];
                var hv = {}; hv[order.length - 1] = 'bad';
                f.push(fr('Over capacity → evict the node just before TAIL: <b>' + esc(victim) + '</b>, the least recently used. With a JS Map that is the <b>first</b> key: <code>map.keys().next().value</code>.', [listPart(hv), mapPart(victim, 'bad'), stats(), cp(LRU_SRC, { 14: 'cur', 15: 'bad' })]));
                order.pop(); delete vals[victim];
                f.push(fr('Removed <b>' + esc(victim) + '</b> from both the list and the Map (forgetting the Map is a classic bug → memory leak + stale hits).', [listPart(), mapPart(), stats()]));
              }
            }
          } else throw new Error('Unknown command "' + c + '". Use put KEY VALUE or get KEY');
        });
        f.push(fr('Done. Hit rate: <b>' + hits + '/' + (hits + misses) + '</b>. Every operation touched only a constant number of pointers + one Map lookup → O(1).', [listPart(), mapPart(), stats()]));
        return f;
      }
    }],
    examples: [
      { title: 'Memoize with an LRU bound', html: `<p>Plain memoization grows forever (a memory leak for endless distinct inputs). Bounding it with an LRU keeps the hottest results only.</p>`, code: { lang: 'js', run: true, code: `
function memoizeLRU(fn, capacity = 100) {
  const cache = new Map();
  return function (arg) {
    if (cache.has(arg)) {
      const v = cache.get(arg);
      cache.delete(arg); cache.set(arg, v);       // refresh recency
      return v;
    }
    const v = fn.call(this, arg);
    cache.set(arg, v);
    if (cache.size > capacity) cache.delete(cache.keys().next().value);
    return v;
  };
}
let computeCount = 0;
const slowSquare = memoizeLRU((n) => { computeCount++; return n * n; }, 2);
[2, 3, 2, 4, 3, 2].forEach((n) => slowSquare(n));
console.log('computed', computeCount, 'times for 6 calls'); // computed 5 times (only the 3rd call, a repeat of 2, was a hit)
` } },
      { title: 'LRU + TTL: entries also expire', html: `<p>Real caches (API responses, auth tokens) also have a <b>time-to-live</b>. Store <code>expiresAt</code> with the value and delete lazily on <code>get</code> — no background timer needed.</p>`, code: { lang: 'js', run: true, code: `
class TTLLRU {
  constructor(cap, ttlMs, now = () => Date.now()) { this.cap = cap; this.ttl = ttlMs; this.now = now; this.m = new Map(); }
  get(k) {
    const e = this.m.get(k);
    if (!e) return undefined;
    if (e.exp <= this.now()) { this.m.delete(k); return undefined; }   // lazily expire
    this.m.delete(k); this.m.set(k, e);
    return e.v;
  }
  set(k, v) {
    this.m.delete(k);
    this.m.set(k, { v, exp: this.now() + this.ttl });
    if (this.m.size > this.cap) this.m.delete(this.m.keys().next().value);
  }
}
let fakeNow = 0;
const c = new TTLLRU(2, 100, () => fakeNow);   // injected clock -> deterministic test
c.set('token', 'abc');
fakeNow = 50;  console.log(c.get('token'));    // abc
fakeNow = 160; console.log(c.get('token'));    // undefined (expired)
` } },
      { title: 'Using a plain object instead of Map: the integer-key trap', html: `<p>Plain objects order <b>integer-like keys numerically first</b>, then string keys in insertion order. So an object cannot replace a Map for LRU ordering when keys are numbers — a subtle bug.</p>`, code: { lang: 'js', run: true, code: `
const obj = {};
obj['b'] = 1; obj['10'] = 2; obj['2'] = 3; obj['a'] = 4;
console.log(Object.keys(obj));            // ['2', '10', 'b', 'a']  (NOT insertion order)
const map = new Map([['b', 1], ['10', 2], ['2', 3], ['a', 4]]);
console.log([...map.keys()]);             // ['b', '10', '2', 'a']  (insertion order)
` } },
      { title: 'Measuring hit rate: is the cache worth it?', html: `<p>A cache is only useful if the <b>hit rate</b> is high. Simulate your access pattern before choosing capacity. Here a skewed pattern (hot keys) gets a good hit rate even with a small cache; uniform random access does not.</p>`, code: { lang: 'js', run: true, code: `
function hitRate(capacity, accesses) {
  const m = new Map(); let hits = 0;
  for (const k of accesses) {
    if (m.has(k)) { hits++; m.delete(k); }
    m.set(k, true);
    if (m.size > capacity) m.delete(m.keys().next().value);
  }
  return (100 * hits / accesses.length).toFixed(1) + '%';
}
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // deterministic PRNG
const skewed = Array.from({ length: 5000 }, () => Math.floor(100 * rnd() ** 4));  // few hot keys
const uniform = Array.from({ length: 5000 }, () => Math.floor(100 * rnd()));
console.log('skewed :', hitRate(10, skewed));   // ~44% (hot keys stay cached)
console.log('uniform:', hitRate(10, uniform));  // ~10%
` } }
    ],
    deepDive: `<p>🟣 <b>Is the Map trick really O(1)?</b> <code>map.delete</code> + <code>map.set</code> are O(1) average. <code>map.keys().next()</code> is O(1) in V8 because Map is an <b>OrderedHashMap</b>: entries live in an insertion-ordered array with a hash-bucket index on top. Deleting leaves a tombstone ("hole"); the first <code>next()</code> may skip a few tombstones, and the table is compacted on rehash, so the amortised cost is O(1). Under heavy churn, the delete+set pattern does create tombstones that trigger periodic rehashing — still amortised O(1).</p>
<p><b>Why the DLL version still matters:</b> (1) other languages (Java's <code>LinkedHashMap(accessOrder=true)</code> does it for you, C++ needs <code>list</code> + <code>unordered_map</code> of iterators); (2) it extends to <b>LFU</b> (frequency buckets of DLLs), <b>segmented LRU</b>, and <b>ARC</b>; (3) interviewers want to see pointer manipulation and sentinels.</p>
<p><b>Concurrency:</b> JavaScript is single-threaded per event loop, so no locks are needed for an in-process cache. Across Node cluster workers or servers you need a shared cache (Redis — which uses <b>approximated LRU</b>: samples ~5 random keys and evicts the oldest of the sample, to avoid maintaining a global list).</p>
<p><b>Memory accounting:</b> real caches limit <b>bytes</b>, not entry count (the popular <code>lru-cache</code> npm package supports <code>maxSize</code> + <code>sizeCalculation</code>, TTL, stale-while-revalidate, and uses typed arrays for its linked list to reduce GC pressure).</p>
<p><b>WeakMap is not a cache replacement:</b> WeakMap entries vanish when the <i>key</i> is collected, not under memory pressure, and keys must be objects. WeakRef + FinalizationRegistry can build GC-aware caches but give no timing guarantees.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> LRU is one of the most memorised interview problems; AI produces both versions instantly. Interviewers respond by asking for <b>extensions</b>: TTL, byte-size limits, LFU, thread safety in another language, hit-rate metrics, and "why is Map ordering guaranteed?". In the AI era the LRU idea also appears in <b>KV-cache eviction for LLM serving</b> and prompt caches — same principle, new place.</p>
<p><b>Use AI as a partner:</b> <code>Fuzz-test my LRUList against a reference Map-based LRU with 10 000 random get/put operations and report the first divergence.</code> Differential fuzzing catches pointer bugs fast.</p>
<p><b>Where AI goes wrong:</b> forgets that <code>put</code> on an existing key must refresh recency, evicts <i>before</i> inserting (evicts when updating an existing key at capacity), forgets to delete the evicted key from the index, or uses a plain object with numeric keys.</p>
<p><b>What you must still own:</b> choosing the eviction policy for the workload (LRU vs LFU vs TTL-only) and sizing the cache from measured hit rates.</p>`,
    problems: [{
      title: 'LRU Cache (get/put in O(1))', level: 'Medium', tags: ['design', 'hash map', 'linked list'], companies: ['Amazon', 'Microsoft', 'Google', 'Goldman Sachs', 'Oracle'],
      statement: `<p>Design <code>LRUCache(capacity)</code> with <code>get(key)</code> → value or <code>-1</code>, and <code>put(key, value)</code> → insert or update; when the number of keys exceeds capacity, evict the <b>least recently used</b> key. Both must run in O(1) average time. Implement it <b>without</b> relying on Map insertion order (use a doubly linked list).</p>`,
      constraints: `1 ≤ capacity ≤ 3000, up to 2·10<sup>5</sup> calls to get and put.`,
      example: `<p>cap 2: put(1,1), put(2,2), get(1) → ${H.c('g', '1')}, put(3,3) evicts key 2, get(2) → ${H.c('r', '-1')}, put(4,4) evicts key 1, get(1) → ${H.c('r', '-1')}, get(3) → ${H.c('g', '3')}, get(4) → ${H.c('g', '4')}.</p>`,
      brute: { why: `<p>Keep an array of keys in recency order. <code>get</code>/<code>put</code> must find the key with <code>indexOf</code> and <code>splice</code> it — O(capacity) per call → 2·10<sup>5</sup> × 3000 = 6·10<sup>8</sup> steps, too slow.</p>`, code: `
class SlowLRU {
  constructor(cap) { this.cap = cap; this.keys = []; this.vals = {}; }
  touch(k) { const i = this.keys.indexOf(k); if (i >= 0) this.keys.splice(i, 1); this.keys.push(k); } // O(n)
  get(k) { if (!(k in this.vals)) return -1; this.touch(k); return this.vals[k]; }
  put(k, v) { this.vals[k] = v; this.touch(k); if (this.keys.length > this.cap) delete this.vals[this.keys.shift()]; }
}
` },
      mcq: { q: 'Why does the linked list need to be <b>doubly</b> linked?', options: ['To unlink an arbitrary node in O(1) you need its previous node, which a singly linked list cannot give you directly', 'To iterate backwards for printing', 'Because JS has no singly linked lists', 'To save memory'], answer: 0, explain: 'The Map gives us the node; removing it requires fixing prev.next, so each node must know its prev.' },
      hints: [`<p>Hint 1: you need two abilities in O(1): find a key (hash map) and move/remove an item in an ordered sequence (linked list).</p>`, `<p>Hint 2: Map key → node; nodes in a doubly linked list with dummy HEAD and TAIL. Most recent right after HEAD, least recent right before TAIL.</p>`, `<p>Hint 3: helpers unlink(node) and addFront(node). get: lookup, unlink, addFront. put: if exists update + move; else create + addFront + index; if size &gt; cap remove TAIL.prev from list and Map.</p>`],
      tests: {"sig":"int int[][] -> int[]","fn":"chk","harness":{"js":"\nfunction chk(cap, ops) {\n  var c = new LRUCache(cap), out = [];\n  if (ops.length === 1 && ops[0][0] === 2) {\n    var n = ops[0][1], keys = ops[0][2], seed = 12345, model = [], bad = -1;\n    var rnd = function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed; };\n    for (var i = 0; i < n && bad < 0; i++) {\n      var k = rnd() % keys;\n      if (rnd() % 2) { var v = rnd() % 1000; c.put(k, v); var ix = model.findIndex(function (e) { return e[0] === k; }); if (ix >= 0) model.splice(ix, 1); model.push([k, v]); if (model.length > cap) model.shift(); }\n      else { var got = c.get(k), j = model.findIndex(function (e) { return e[0] === k; }), want = -1; if (j >= 0) { want = model[j][1]; var e2 = model.splice(j, 1)[0]; model.push(e2); } if (got !== want) bad = i; }\n    }\n    return bad;\n  }\n  for (var o of ops) { if (o[0] === 0) out.push(c.get(o[1])); else c.put(o[1], o[2]); }\n  return out;\n}"},"cases":[[[2,[[1,1,1],[1,2,2],[0,1],[1,3,3],[0,2],[1,4,4],[0,1],[0,3],[0,4]]],[1,-1,-1,3,4]],[[1,[[1,5,50],[0,5],[1,6,60],[0,5],[0,6]]],[50,-1,60]],[[3,[[0,9]]],[-1]],[[2,[[1,1,1],[1,1,10],[0,1],[1,2,2],[1,3,3],[0,1],[0,2]]],[10,-1,2]],[[2,[[1,0,0],[1,-1,-5],[0,0],[0,-1],[1,7,7],[0,0],[0,-1]]],[0,-5,-1,-5]],[[3,[[1,1,1],[1,2,2],[1,3,3],[0,1],[1,4,4],[0,2],[0,3],[0,1],[0,4]]],[1,-1,3,1,4]],[[2,[[1,1,1],[1,2,2],[1,1,100],[1,3,3],[0,1],[0,2],[0,3]]],[100,-1,3]],[[3000,[[2,200000,4000]]],-1],[[1,[[2,50000,5]]],-1]]},
      solution: {
        approach: `<p>Hash map for O(1) lookup + doubly linked list for O(1) recency updates. Sentinels make every insertion/removal the same four pointer assignments. Eviction takes the node before TAIL and deletes its key from the map (store the key inside the node for this).</p>`,
        code: { lang: 'js', run: true, code: `
class LRUCache {
  constructor(capacity) {
    this.cap = capacity;
    this.map = new Map();
    this.head = { k: null, v: null, prev: null, next: null };
    this.tail = { k: null, v: null, prev: this.head, next: null };
    this.head.next = this.tail;
  }
  unlink(n) { n.prev.next = n.next; n.next.prev = n.prev; }
  addFront(n) { n.prev = this.head; n.next = this.head.next; this.head.next.prev = n; this.head.next = n; }
  get(key) {
    const n = this.map.get(key);
    if (!n) return -1;
    this.unlink(n); this.addFront(n);
    return n.v;
  }
  put(key, value) {
    const n = this.map.get(key);
    if (n) { n.v = value; this.unlink(n); this.addFront(n); return; }
    const node = { k: key, v: value, prev: null, next: null };
    this.map.set(key, node); this.addFront(node);
    if (this.map.size > this.cap) {
      const lru = this.tail.prev;
      this.unlink(lru); this.map.delete(lru.k);
    }
  }
}

const c = new LRUCache(2), out = [];
c.put(1, 1); c.put(2, 2); out.push(c.get(1));
c.put(3, 3); out.push(c.get(2));
c.put(4, 4); out.push(c.get(1), c.get(3), c.get(4));
console.log(out); // [1, -1, -1, 3, 4]
` },
        dry: { head: ['op', 'list HEAD → TAIL', 'evicted', 'returns'], rows: [['put(1,1)', '1', '—', '—'], ['put(2,2)', '2, 1', '—', '—'], ['get(1)', '1, 2', '—', '1'], ['put(3,3)', '3, 1', '2', '—'], ['get(2)', '3, 1', '—', '-1'], ['put(4,4)', '4, 3', '1', '—']] },
        complexity: `<p>get and put: O(1) average (one Map op + constant pointer updates). Space: O(capacity).</p>`,
        followUps: ['Add TTL expiry.', 'Implement LFU cache (LeetCode 460).', 'Make capacity count bytes instead of entries.']
      }
    }]
  });

  /* ================= TOPIC 10: tricky output question bank ================= */
  function elParse(input) {
    var list = cmds(input);
    if (!list.length) throw new Error('Give commands like: log A; timeout B; then C; await D>E');
    if (list.length > 9) throw new Error('Use at most 9 commands');
    return list.map(function (c) {
      var m = /^(log|timeout|then|micro|await)\s+([A-Za-z0-9]{1,6})(?:>([A-Za-z0-9]{1,6}))?$/.exec(c);
      if (!m) throw new Error('Bad command "' + c + '". Use log X | timeout X | timeout X>Y | then X | then X>Y | micro X | await X>Y');
      if (m[1] === 'await' && !m[3]) throw new Error('await needs two labels: await X>Y (X before the await, Y after)');
      if ((m[1] === 'log' || m[1] === 'micro') && m[3]) throw new Error(m[1] + ' takes one label');
      return { k: m[1], a: m[2], b: m[3] };
    });
  }
  function elLine(c) {
    var L = function (x) { return "console.log('" + x + "')"; };
    if (c.k === 'log') return L(c.a) + ';';
    if (c.k === 'micro') return 'queueMicrotask(() => ' + L(c.a) + ');';
    if (c.k === 'then') return 'Promise.resolve().then(() => ' + L(c.a) + ')' + (c.b ? '.then(() => ' + L(c.b) + ')' : '') + ';';
    if (c.k === 'timeout') return c.b ? 'setTimeout(() => { ' + L(c.a) + '; Promise.resolve().then(() => ' + L(c.b) + '); });' : 'setTimeout(() => ' + L(c.a) + ');';
    return '(async () => { ' + L(c.a) + '; await null; ' + L(c.b) + '; })();';
  }

  topics.push({
    title: 'Tricky Output Questions: The Big Bank',
    analogy: `<p>Output questions are like <b>reading a recipe and predicting the dish</b> without cooking it. Most people read top to bottom and guess. A chef knows the hidden rules: the oven (timers) only gets attention after the stove (current code) is free; the sauce (microtasks) is always finished before the next dish goes in the oven; "a pinch" (<code>==</code>) means something odd in this kitchen.</p>
<p>The trick is not memorising 500 puzzles — it is knowing the <b>~10 rules</b> that generate all of them: event loop order, hoisting/TDZ, closures, <code>this</code>, coercion, reference vs value, and a few famous quirks.</p>`,
    explain: `<p>🟢 <b>How to solve any output question</b> — a calm 4-step method:</p>
<ol><li><b>Classify</b> the puzzle: async order? scope/hoisting? <code>this</code>? coercion? reference? Each has its own rule set.</li>
<li><b>Run the synchronous code first</b>, line by line, writing the output and the state of variables.</li>
<li><b>Track two queues</b>: microtasks (promise callbacks, <code>await</code> continuations, <code>queueMicrotask</code>) and macrotasks (<code>setTimeout</code>, <code>setInterval</code>, I/O, UI events).</li>
<li><b>Event loop:</b> when the stack is empty, drain <b>all</b> microtasks (including ones added while draining), then take <b>one</b> macrotask, then drain microtasks again… repeat.</li></ol>
${H.table(['Rule family', 'The rule in one line', 'Classic trap'], [['Event loop', 'sync → all microtasks → one macrotask → all microtasks …', '<code>setTimeout(f, 0)</code> runs <b>after</b> <code>Promise.then</code>'], ['async/await', 'code before the first <code>await</code> runs synchronously; the rest is a microtask', '"a1 start" prints before "script end"'], ['Hoisting', '<code>var</code> → undefined; function declarations → full function; <code>let/const/class</code> → TDZ', '<code>typeof x</code> throws for a let in its TDZ'], ['Closures in loops', '<code>var</code>: one shared binding; <code>let</code>: a new binding per iteration', '3 3 3 vs 0 1 2'], ['this', 'decided by the call site; arrows inherit', 'detached method → undefined (strict)'], ['Coercion', '<code>+</code> with a string concatenates; other math converts to number; objects → primitive via valueOf/toString', '<code>[] + {}</code> → "[object Object]"'], ['Equality', '<code>==</code> converts; <code>===</code> does not; NaN ≠ NaN', '<code>[] == ![]</code> → true'], ['References', 'objects are shared by reference; object keys are strings/symbols', '<code>a[obj1]</code> and <code>a[obj2]</code> are the same key'], ['Quirks', '<code>typeof null</code>, sort() is lexicographic, <code>map(parseInt)</code>, floats', '<code>[10,1,2].sort()</code> → [1,10,2]']])}
<p>🔵 <b>The event loop in one picture:</b></p>
${H.table(['Phase', 'Runs', 'Example'], [['1. Script (a macrotask itself)', 'all synchronous lines', '<code>console.log</code>, the executor of <code>new Promise</code>, code before <code>await</code>'], ['2. Microtask checkpoint', 'every queued microtask, until the queue is empty', '<code>.then</code>, <code>await</code> continuation, <code>queueMicrotask</code>, (Node: <code>process.nextTick</code> even earlier)'], ['3. Next macrotask', 'ONE task', 'a <code>setTimeout</code> callback'], ['4. Microtasks again', 'drain', 'promises created inside that timeout'], ['(browser) render', 'maybe paint between tasks', '<code>requestAnimationFrame</code> before paint']])}
<p>Use the visualizer below with your own mini-programs, then work through the bank in the examples — <b>predict first, then press Run</b>.</p>`,
    clues: ['"What will be logged / in which order?" with setTimeout + Promise + async → event-loop rule: sync, microtasks, one macrotask', '"Explain why this prints 3 3 3" → var shared binding + closures', '"What is the output of typeof / == / + with mixed types?" → coercion rules (ToPrimitive, ToNumber)', '"Why is this undefined / TypeError: Cannot read properties of undefined?" → this binding lost', '"Accessing a variable before declaration" → hoisting vs TDZ', '"Object used as a key" / "array length after delete" → reference and property-key rules'],
    code: [{ lang: 'js', run: true, title: 'The 8 most-asked output puzzles in one file (predict, then run)', code: `
// 1. Event loop: sync -> microtasks -> macrotasks
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
(async () => { console.log('D'); await null; console.log('E'); })();
console.log('F');
// Answer: A D F C E B

setTimeout(() => {
  console.log('---');
  // 2. Closures in loops
  for (var i = 0; i < 3; i++) setTimeout(() => console.log('var', i));   // var 3 x3
  for (let j = 0; j < 3; j++) setTimeout(() => console.log('let', j));   // let 0 1 2

  // 3. Coercion
  console.log([] + [], '|', [] + {}, '|', 1 + '2', '|', '3' - 1, '|', true + true); // '' | [object Object] | 12 | 2 | 2
  console.log([] == ![], null == 0, null >= 0, NaN === NaN);                       // true false true false

  // 4. Quirks
  console.log(['1', '2', '3'].map(parseInt), [10, 1, 2].sort(), typeof null);    // [1,NaN,NaN] [1,10,2] object

  // 5. Object keys are strings
  const a = {}, k1 = { id: 1 }, k2 = { id: 2 };
  a[k1] = 'first'; a[k2] = 'second';
  console.log(a[k1]);                                                             // second

  // 6. finally overrides return
  const f = () => { try { return 'try'; } finally { return 'finally'; } };
  console.log(f());                                                               // finally

  // 7. Hoisting
  console.log(typeof hoisted, typeof notYet);                                     // function undefined
  function hoisted() {}
  var notYet = () => {};

  // 8. this in a detached method (strict mode inside class bodies)
  class Counter { constructor() { this.n = 0; } inc() { return this ? ++this.n : 'this is undefined'; } }
  const c = new Counter(), inc = c.inc;
  console.log(c.inc(), inc());                                                    // 1 'this is undefined'
}, 5);
` }],
    codeTitle: ['Output puzzle sampler'],
    viz: [{
      title: 'Event loop simulator: write a mini program, watch the queues',
      input: 'log A; timeout B>C; then D>E; await F>G; micro H; log I',
      inputLabel: 'log X | timeout X | timeout X>Y | then X | then X>Y | micro X | await X>Y  (separate with ;)',
      gen: function (input) {
        var prog = elParse(input);
        var code = prog.map(elLine).join('\n');
        var micro = [], macro = [], out = [], f = [];
        function parts(lineHl, stack, mhl, Mhl) {
          var h = {}; if (lineHl) h[lineHl] = 'cur';
          return [cp(code, h, 'Program'), { type: 'stack', label: 'Call stack', items: stack }, { type: 'queue', label: 'Microtask queue (drained completely)', items: micro.map(function (m) { return m.label; }), hl: mhl || {} }, { type: 'queue', label: 'Macrotask queue (one per turn)', items: macro.map(function (m) { return m.label; }), hl: Mhl || {} }, outBox(out)];
        }
        f.push(fr('The whole script is the first macrotask. We run it <b>top to bottom</b> first; callbacks only get queued.', parts(0, ['script'])));
        prog.forEach(function (c, i) {
          var ln = i + 1, msg;
          if (c.k === 'log') { out.push(c.a); msg = 'Synchronous <code>console.log</code> → prints <b>' + c.a + '</b> right now.'; }
          else if (c.k === 'timeout') { macro.push({ label: 'timer→' + c.a + (c.b ? '+then ' + c.b : ''), a: c.a, b: c.b }); msg = '<code>setTimeout</code> hands the callback to the timer system; when 0 ms has passed it goes into the <b>macrotask</b> queue. It cannot run before the stack is empty <i>and</i> all microtasks are done.'; }
          else if (c.k === 'then') { micro.push({ label: 'then→' + c.a, a: c.a, b: c.b }); msg = '<code>Promise.resolve()</code> is already fulfilled, so its <code>.then</code> callback is queued as a <b>microtask</b> immediately.' + (c.b ? ' The second <code>.then</code> waits — it is queued only after the first one runs.' : ''); }
          else if (c.k === 'micro') { micro.push({ label: 'micro→' + c.a, a: c.a }); msg = '<code>queueMicrotask</code> puts the callback straight into the <b>microtask</b> queue.'; }
          else { out.push(c.a); micro.push({ label: 'resume→' + c.b, a: c.b }); msg = 'The async function runs <b>synchronously</b> until <code>await</code>: prints <b>' + c.a + '</b>. <code>await null</code> pauses it; the rest of the function (print ' + c.b + ') is queued as a <b>microtask</b>.'; }
          f.push(fr('Line ' + ln + ': ' + msg, parts(ln, ['script', 'line ' + ln], c.k === 'then' || c.k === 'micro' || c.k === 'await' ? (function () { var h = {}; h[micro.length - 1] = 'ok'; return h; })() : {}, c.k === 'timeout' ? (function () { var h = {}; h[macro.length - 1] = 'ok'; return h; })() : {})));
        });
        f.push(fr('Script finished → the call stack is empty. Now the event loop runs the <b>microtask checkpoint</b>: every microtask, oldest first, including ones added during draining.', parts(0, [])));
        var guard = 0;
        while ((micro.length || macro.length) && guard++ < 40) {
          while (micro.length && guard++ < 40) {
            var m = micro.shift();
            out.push(m.a);
            var extra = '';
            if (m.b) { micro.push({ label: 'then→' + m.b, a: m.b }); extra = ' Its promise now fulfills, so the chained <code>.then</code> (print ' + m.b + ') is queued at the <b>back</b> of the microtask queue.'; }
            f.push(fr('Microtask: run <b>' + esc(m.label) + '</b> → prints <b>' + m.a + '</b>.' + extra, parts(0, ['microtask: ' + m.label], m.b ? (function () { var h = {}; h[micro.length - 1] = 'ok'; return h; })() : {})));
          }
          if (macro.length) {
            var t = macro.shift();
            out.push(t.a);
            var ex2 = '';
            if (t.b) { micro.push({ label: 'then→' + t.b, a: t.b }); ex2 = ' Inside it, a promise callback (print ' + t.b + ') is queued — it will run <b>before</b> the next timer, because microtasks drain after every macrotask.'; }
            f.push(fr('Microtask queue empty → take <b>one</b> macrotask: <b>' + esc(t.label) + '</b> → prints <b>' + t.a + '</b>.' + ex2, parts(0, ['timer callback'], t.b ? { 0: 'ok' } : {})));
          }
        }
        f.push(fr('Both queues are empty. Final output: <b>' + out.join(' ') + '</b>. Try moving lines around or adding <code>then X&gt;Y</code> chains to see how far a chain "jumps the queue".', [cp(code, {}, 'Program'), outBox(out)]));
        return f;
      }
    }, {
      title: 'Closure in a loop: var (one box) vs let (a box per turn)',
      input: 'var 3',
      inputLabel: 'var or let, and the loop count (1..5)',
      gen: function (input) {
        var m = /^\s*(var|let)\s+(\d)\s*$/.exec(String(input));
        if (!m) throw new Error('Format: var 3  or  let 3');
        var kind = m[1], n = Number(m[2]);
        if (n < 1 || n > 5) throw new Error('Loop count must be 1..5');
        var src = 'for (' + kind + ' i = 0; i < ' + n + '; i++) {\n  setTimeout(() => console.log(i));\n}\n// loop is done, timers run later';
        var f = [], env = [], q = [];
        f.push(fr('<code>' + kind + '</code> loop. ' + (kind === 'var' ? '<code>var</code> is function-scoped: there is <b>one</b> variable <code>i</code> for the whole loop.' : '<code>let</code> in a for-loop header creates a <b>fresh binding of i for every iteration</b>, copied from the previous one.'), [cp(src, { 1: 'cur' }), { type: 'map', label: 'Variable boxes (environments)', entries: kind === 'var' ? [['i (shared)', 0]] : [['i (iter 0)', 0]] }]));
        for (var i = 0; i < n; i++) {
          if (kind === 'var') env = [['i (shared)', i]]; else env.push(['i (iter ' + i + ')', i]);
          q.push('() => log(' + (kind === 'var' ? 'shared i' : 'i of iter ' + i) + ')');
          f.push(fr('Iteration ' + i + ': schedule a timer whose arrow function <b>closes over</b> ' + (kind === 'var' ? 'the <b>shared</b> i (it remembers the box, not the value!).' : 'this iteration\'s own i = ' + i + '.'), [cp(src, { 2: 'cur' }), { type: 'map', label: 'Variable boxes (environments)', entries: env.map(function (e) { return e.slice(); }), hl: (function () { var h = {}; h[env[env.length - 1][0]] = 'ok'; return h; })() }, { type: 'queue', label: 'Macrotask queue', items: q.slice() }]));
        }
        if (kind === 'var') env = [['i (shared)', n]];
        f.push(fr('The loop ends when i becomes ' + n + '. ' + (kind === 'var' ? 'The shared box now holds <b>' + n + '</b>.' : 'Each iteration box still holds its own value.'), [cp(src, { 4: 'cur' }), { type: 'map', label: 'Variable boxes (environments)', entries: env.map(function (e) { return e.slice(); }), hl: kind === 'var' ? { 'i (shared)': 'bad' } : {} }, { type: 'queue', label: 'Macrotask queue', items: q.slice() }]));
        var outs = [];
        for (var k = 0; k < n; k++) {
          outs.push(kind === 'var' ? n : k);
          f.push(fr('Timer ' + k + ' runs and reads ' + (kind === 'var' ? 'the shared i → <b>' + n + '</b>' : 'its own i → <b>' + k + '</b>') + '.', [{ type: 'queue', label: 'Macrotask queue', items: q.slice(k + 1) }, outBox(outs.map(String))]));
        }
        f.push(fr(kind === 'var' ? 'Output: <b>' + outs.join(' ') + '</b>. Fixes: use <code>let</code>, or an IIFE <code>(function (j) { setTimeout(() =&gt; log(j)); })(i)</code>, or <code>setTimeout(log, 0, i)</code> (extra args).' : 'Output: <b>' + outs.join(' ') + '</b>. Each closure captured a different box. Try "var ' + n + '" to compare.', [outBox(outs.map(String))]));
        return f;
      }
    }],
    examples: [
      { title: 'Q1 — async/await vs then vs setTimeout (the most asked one)', html: `<p><b>Predict:</b> the order of 8 lines. <b>Rules used:</b> async function body runs synchronously until <code>await</code>; the executor of <code>new Promise</code> is synchronous; the <code>await</code> continuation and <code>.then</code> are microtasks queued in order; timers last.<br><b>Answer:</b> script start, a1 start, a2, p1, script end, a1 end, p2, timeout.</p>`, code: { lang: 'js', run: true, code: `
async function a1() { console.log('a1 start'); await a2(); console.log('a1 end'); }
async function a2() { console.log('a2'); }
console.log('script start');
setTimeout(() => console.log('timeout'), 0);
a1();
new Promise((resolve) => { console.log('p1'); resolve(); }).then(() => console.log('p2'));
console.log('script end');
` } },
      { title: 'Q2 — microtasks scheduled inside a timer', html: `<p><b>Predict.</b> After each macrotask the microtask queue is drained, so <b>T1-then</b> runs before <b>T2</b> even though T2 was queued earlier.<br><b>Answer:</b> sync, P, T1, T1-then, T2.</p>`, code: { lang: 'js', run: true, code: `
setTimeout(() => {
  console.log('T1');
  Promise.resolve().then(() => console.log('T1-then'));
}, 0);
setTimeout(() => console.log('T2'), 0);
Promise.resolve().then(() => console.log('P'));
console.log('sync');
` } },
      { title: 'Q3 — then chains interleave', html: `<p><b>Predict.</b> Two chains started together alternate, because each <code>.then</code> only queues the next step when it runs. <b>Answer:</b> a1 b1 a2 b2 a3.</p>`, code: { lang: 'js', run: true, code: `
Promise.resolve().then(() => console.log('a1')).then(() => console.log('a2')).then(() => console.log('a3'));
Promise.resolve().then(() => console.log('b1')).then(() => console.log('b2'));
` } },
      { title: 'Q4 — hoisting and the TDZ', html: `<p><b>Predict.</b> <code>var</code> is hoisted as <code>undefined</code>; a function declaration is hoisted completely; <code>let</code> exists but is in the <b>temporal dead zone</b> until its line, so even <code>typeof</code> throws.<br><b>Answer:</b> undefined, hi, ReferenceError.</p>`, code: { lang: 'js', run: true, code: `
console.log(v);            // undefined
console.log(sayHi());      // hi
try { console.log(typeof t); } catch (e) { console.log(e.name); } // ReferenceError (TDZ)
var v = 1;
function sayHi() { return 'hi'; }
let t = 2;
` } },
      { title: 'Q5 — shadowing + TDZ in a block', html: `<p><b>Predict.</b> Inside the block, <code>let x</code> is hoisted to the top of the <b>block</b> and shadows the outer x, so the first log hits the TDZ. Many people answer "1".<br><b>Answer:</b> ReferenceError.</p>`, code: { lang: 'js', run: true, code: `
let x = 1;
{
  try { console.log(x); } catch (e) { console.log(e.name + ': ' + e.message); }
  let x = 2;
}
` } },
      { title: 'Q6 — this: method, detached, arrow, nested function', html: `<p><b>Predict.</b> <code>obj.regular()</code> → this = obj. Detached call in strict code → undefined. Arrow inside a method inherits the method's this. A regular nested function gets its own (undefined) this.<br><b>Answer:</b> obj, undefined, obj, undefined.</p>`, code: { lang: 'js', run: true, code: `
'use strict';
const obj = {
  name: 'obj',
  regular() { return this && this.name; },
  viaArrow() { return [1].map(() => this.name)[0]; },
  viaFunction() { return [1].map(function () { return this && this.name; })[0]; }
};
const detached = obj.regular;
console.log(obj.regular(), detached(), obj.viaArrow(), obj.viaFunction());
` } },
      { title: 'Q7 — coercion with + and ==', html: `<p><b>Rules:</b> <code>+</code> converts both sides to primitives; if either is a string → concatenate, else add numbers. <code>[]</code> → "" ; <code>{}</code> → "[object Object]". For <code>[] == ![]</code>: <code>![]</code> is false → compare <code>[] == false</code> → "" == 0 → 0 == 0 → true. <code>null == 0</code> is false (null only == undefined) but <code>null &gt;= 0</code> converts null to 0 → true.</p>`, code: { lang: 'js', run: true, code: `
console.log([] + []);          // ''
console.log([] + {});          // '[object Object]'
console.log(1 + '2', '3' - 1); // '12' 2
console.log('5' * '2', '5' + 2 - 1); // 10 51
console.log(true + 1, [2] * [3]);    // 2 6
console.log([] == ![], null == 0, null >= 0, undefined == null, NaN == NaN); // true false true true false
` } },
      { title: 'Q8 — map(parseInt), sort() and other built-in quirks', html: `<p><code>map</code> passes (value, index); <code>parseInt('2', 1)</code> → NaN (radix 1 invalid), <code>parseInt('3', 2)</code> → NaN (3 is not a binary digit). <code>sort()</code> without a comparator sorts <b>as strings</b>. <code>typeof null</code> is "object" (a 1995 bug kept for compatibility).</p>`, code: { lang: 'js', run: true, code: `
console.log(['1', '2', '3'].map(parseInt));           // [1, NaN, NaN]
console.log(['1', '2', '3'].map(Number));             // [1, 2, 3]
console.log([10, 1, 2, 25].sort());                   // [1, 10, 2, 25]
console.log([10, 1, 2, 25].sort((a, b) => a - b));    // [1, 2, 10, 25]
console.log(typeof null, typeof NaN, typeof typeof 1); // object number string
console.log(0.1 + 0.2 === 0.3, Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON); // false true
console.log([NaN].includes(NaN), [NaN].indexOf(NaN)); // true -1
` } },
      { title: 'Q9 — objects as keys and shared references', html: `<p>Plain-object keys are converted to <b>strings</b>: both objects become "[object Object]", so the second write overwrites the first. Also, assigning an object copies the <b>reference</b>; reassigning a parameter does not affect the caller, but mutating it does.</p>`, code: { lang: 'js', run: true, code: `
const a = {}, b = { key: 'b' }, c = { key: 'c' };
a[b] = 123; a[c] = 456;
console.log(a[b], Object.keys(a));   // 456 ['[object Object]']

function mutate(o) { o.x = 1; }
function reassign(o) { o = { x: 2 }; }
const obj = {};
mutate(obj); reassign(obj);
console.log(obj);                     // { x: 1 }
` } },
      { title: 'Q10 — closures sharing state', html: `<p>Each call to <code>makeCounter</code> creates a <b>new</b> scope; functions created in the same call share it. <b>Answer:</b> 1 2 1 3.</p>`, code: { lang: 'js', run: true, code: `
function makeCounter() {
  let n = 0;
  return { inc: () => ++n, get: () => n };
}
const c1 = makeCounter(), c2 = makeCounter();
console.log(c1.inc(), c1.inc(), c2.inc(), c1.inc()); // 1 2 1 3
` } },
      { title: 'Q11 — promise error flow and finally', html: `<p><code>throw</code> inside <code>then</code> rejects the next promise; <code>catch</code> returns a value → the chain is fulfilled again; <code>finally</code>'s return value is <b>ignored</b> (it passes the previous value through) unless it throws.<br><b>Answer:</b> 20.</p>`, code: { lang: 'js', run: true, code: `
Promise.resolve(1)
  .then((x) => { throw x + 1; })      // rejects with 2
  .then(() => console.log('skipped'))  // skipped: chain is rejected
  .catch((x) => x * 10)                // recovers with 20
  .finally(() => 99)                   // ignored
  .then((v) => console.log(v));        // 20
` } },
      { title: 'Q12 — try/finally, generators and array length', html: `<p><code>finally</code>'s return overrides the try's return. Spreading a generator ignores its <code>return</code> value. Writing index 10 sets length to 11; <code>delete</code> leaves a hole and does not change length.</p>`, code: { lang: 'js', run: true, code: `
function f() { try { return 'try'; } finally { return 'finally'; } }
function* g() { yield 1; yield 2; return 3; }
const arr = [1, 2, 3];
arr[10] = 4;
console.log(f(), [...g()], arr.length); // finally [1, 2] 11
delete arr[0];
console.log(arr.length, arr[0], 0 in arr); // 11 undefined false
arr.length = 2;
console.log(arr);                          // [ <1 empty item>, 2 ]
` } },
      { title: 'Q13 — prototype shadowing and class fields', html: `<p>Reading looks up the prototype chain; <b>writing</b> creates an own property that shadows the prototype one. Arrow-function class fields are per-instance (so they keep <code>this</code> when detached); methods live on the prototype.</p>`, code: { lang: 'js', run: true, code: `
function Animal() {}
Animal.prototype.sound = 'generic';
const dog = new Animal(), cat = new Animal();
dog.sound = 'woof';                       // own property shadows the prototype
console.log(dog.sound, cat.sound);        // woof generic
delete dog.sound;
console.log(dog.sound);                   // generic

class Btn {
  label = 'ok';
  arrow = () => this.label;               // instance field, lexical this
  method() { return this && this.label; } // prototype method
}
const b = new Btn();
const { arrow, method } = b;
console.log(arrow(), method(), Btn.prototype.hasOwnProperty('arrow')); // ok undefined false
` } },
      { title: 'Q14 — var in function scope, IIFE and the arguments object', html: `<p>An IIFE gets its own scope. Inside <code>test</code>, <code>var a</code> is hoisted, so the condition sees <code>undefined</code> (the global a is shadowed). Sloppy-mode <code>arguments</code> is linked to simple parameters.</p>`, code: { lang: 'js', run: true, code: `
var a = 'global';
function test() {
  if (!a) { var a = 'local'; }   // hoisted 'var a' shadows the global -> undefined -> falsy
  return a;
}
console.log(test());              // local

function linked(x) { arguments[0] = 99; return x; }
function unlinked(x = 0) { arguments[0] = 99; return x; } // default params break the link
console.log(linked(1), unlinked(1)); // 99 1
` } }
    ],
    deepDive: `<p>🟣 <b>Why async/await ordering changed in 2019.</b> Originally <code>await p</code> (for a native promise p) wrapped p in an extra promise and took <b>3</b> microtask ticks; V8 7.2 / ES2019 spec change ("await optimization") made it take <b>1</b> tick. That is why old blog posts give a different order for Q1 ("p2" before "a1 end"). Today, all modern engines print "a1 end" first. However, <b>returning</b> a promise from an async function (<code>return p</code>) still costs extra ticks — <code>return await p</code> in try/catch has different timing.</p>
<p><b>Node specifics:</b> <code>process.nextTick</code> callbacks run <b>before</b> promise microtasks. Between macrotask phases Node runs timers → pending callbacks → poll (I/O) → check (<code>setImmediate</code>) → close callbacks. <code>setTimeout(f, 0)</code> vs <code>setImmediate(g)</code> order is <b>non-deterministic</b> in the main module but deterministic inside an I/O callback (immediate first). Browsers clamp nested timers (depth ≥ 5) to ≥ 4 ms.</p>
<p><b>Coercion algorithm (ToPrimitive):</b> for <code>+</code> and <code>==</code> the hint is "default" → call <code>valueOf()</code>, and if it does not return a primitive, call <code>toString()</code>. Dates prefer toString. <code>Symbol.toPrimitive</code> overrides everything. That is how <code>sum(1)(2) == 3</code> tricks work.</p>
<p><b>Strict vs sloppy matters:</b> many output answers flip in strict mode: detached <code>this</code> (undefined vs globalThis), assigning to undeclared variables (ReferenceError vs creating a global), <code>arguments</code> linkage, writing to read-only properties (TypeError vs silent). ES modules and class bodies are <b>always strict</b>. When an interviewer shows a snippet, ask "module or script? browser or Node?" — that question alone shows seniority.</p>
<p><b>Engine-dependent output:</b> <code>console.log</code> of objects may show the object's <b>current</b> state (live reference) in DevTools rather than the state at log time; key order rules (integer keys first); and error messages differ across V8/SpiderMonkey/JavaScriptCore.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> you can paste any snippet into a REPL or an AI and get the output — so interviewers now ask you to <b>explain the mechanism</b>, predict <b>after a small change</b> ("what if this await moved up one line?"), or debug a production bug caused by the same rule (stale closure in React, lost <code>this</code>, an unawaited promise).</p>
<p><b>Use AI as a partner:</b> <code>Generate 10 new event-loop output puzzles of increasing difficulty with answers hidden at the end; include process.nextTick and setImmediate for Node.</code> Then solve them with the 4-step method and verify with the visualizer or Node.</p>
<p><b>Where AI goes wrong:</b> LLMs frequently give the <b>pre-2019</b> async ordering, mix up browser and Node timer phases, claim <code>typeof</code> is always safe (not in the TDZ), or forget strict mode in modules/classes. Always run it.</p>
<p><b>What you must still own:</b> the mental model. Reading code reviews — including AI-written code — requires you to see "this callback runs after that one" without running it.</p>`,
    problems: [{
      title: 'Predict and explain: nested promises, timers and await', level: 'Medium', tags: ['event loop', 'output', 'async'], companies: ['Google', 'Microsoft', 'Atlassian', 'Groww'],
      statement: `<p>Predict the exact console output of the program below and justify each line using the event-loop rules. Then rewrite it so that the output is in alphabetical order A, B, C, D, E, F <b>without</b> removing any <code>console.log</code>.</p><pre>console.log('A');
setTimeout(() =&gt; console.log('F'), 0);
Promise.resolve().then(() =&gt; {
  console.log('C');
  setTimeout(() =&gt; console.log('E'), 0);
});
(async () =&gt; { console.log('B'); await null; console.log('D'); })();</pre>`,
      constraints: `Assume a modern engine (ES2019+ await semantics). No changes to the logged letters.`,
      example: `<p>Output: ${H.c('g', 'A B C D F E')}. Not alphabetical: F's timer was queued during the script, E's only later inside a microtask, so F runs first.</p>`,
      brute: { why: `<p>Reading top to bottom gives "A F C E B D" — wrong, because it ignores that timers wait for the stack and microtasks, that the async function body runs synchronously until <code>await</code>, and that timers queued later run later.</p>`, code: `
// Naive mental model: "every line runs in order, timers with 0 ms run immediately"
const naiveGuess = ['A', 'F', 'C', 'E', 'B', 'D'];
console.log(naiveGuess.join(' ')); // wrong answer
` },
      mcq: { q: 'Why does F print before E even though both use <code>setTimeout(..., 0)</code>?', options: ['F\'s timer was registered during the script; E\'s was registered later inside a microtask, so it is queued behind F', 'E has a lower priority', 'Timers inside promises are slower by 4 ms', 'Random order'], answer: 0, explain: 'Timers with equal delay fire in registration order; E was registered after F.' },
      hints: [`<p>Hint 1: first list only the synchronous output (script phase). Remember the async arrow runs until its first <code>await</code>.</p>`, `<p>Hint 2: write the microtask queue after the script: [then-callback (C), resume (D)]. Write the macrotask queue: [F]. Which new tasks does running C add?</p>`, `<p>Hint 3: to get alphabetical order, E must be scheduled before F, or F must be scheduled after E — e.g. register F inside E's timer, or nest the timers.</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"original : A B C D F E\nrewritten: A B C D E F"}]},
      solution: {
        approach: `<p>Script: A, then B (async body before await). Microtasks: C (also registers timer E), then D. Macrotasks: F (registered first), then E. To get A–F in order, schedule F from inside E's timer so it is guaranteed to run after E.</p>`,
        code: { lang: 'js', run: true, code: `
// Original program: prints A B C D F E
const out = [];
const log = (x) => out.push(x);
log('A');
setTimeout(() => log('F'), 0);
Promise.resolve().then(() => { log('C'); setTimeout(() => log('E'), 0); });
(async () => { log('B'); await null; log('D'); })();
setTimeout(() => console.log('original :', out.join(' ')), 20);

// Rewritten: alphabetical A B C D E F
const out2 = [];
const log2 = (x) => out2.push(x);
log2('A');
Promise.resolve().then(() => {
  log2('C');
  setTimeout(() => { log2('E'); setTimeout(() => log2('F'), 0); }, 0); // F scheduled after E runs
});
(async () => { log2('B'); await null; log2('D'); })();
setTimeout(() => console.log('rewritten:', out2.join(' ')), 40);
` },
        dry: { head: ['step', 'runs', 'output so far', 'microtasks', 'macrotasks'], rows: [['script', "log A; register F; queue then(C); async: log B, queue resume(D)", 'A B', '[C, D]', '[F]'], ['micro 1', 'C → registers timer E', 'A B C', '[D]', '[F, E]'], ['micro 2', 'D', 'A B C D', '[]', '[F, E]'], ['macro 1', 'F', 'A B C D F', '[]', '[E]'], ['macro 2', 'E', 'A B C D F E', '[]', '[]']] },
        complexity: `<p>Not an algorithmic problem: the "cost" is the number of event-loop turns — here 2 macrotasks after the script.</p>`,
        followUps: ['What changes if <code>await null</code> becomes <code>await new Promise(r =&gt; setTimeout(r, 0))</code>?', 'Add <code>process.nextTick</code> (Node) — where does it go?', 'Where would a <code>requestAnimationFrame</code> callback appear in a browser?']
      }
    }]
  });

  /* ================= PRACTICE (Easy → Medium → Hard) ================= */
  practice.push({
    title: 'once(fn): run a function only one time', level: 'Easy', tags: ['closure', 'higher-order'], companies: ['Amazon', 'Flipkart', 'Paytm'],
    statement: `<p>Implement <code>once(fn)</code> that returns a new function. The first call runs <code>fn</code> (with the caller's <code>this</code> and arguments) and remembers its result; every later call returns that same result without running <code>fn</code> again.</p>`,
    constraints: `fn may return undefined (still counts as "already called"). Preserve <code>this</code>.`,
    example: `<p><code>const init = once(() =&gt; { console.log('setup'); return 42; });</code><br><code>init(); init();</code> → prints "setup" ${H.c('g', 'once')}; both calls return ${H.c('g', '42')}.</p>`,
    brute: { why: `<p>Checking <code>if (result === undefined)</code> to decide whether fn ran fails when fn legitimately returns <code>undefined</code> — it would run again. Use a separate boolean flag.</p>`, code: `
function onceBuggy(fn) {
  let result;
  return function (...args) {
    if (result === undefined) result = fn.apply(this, args); // re-runs if fn returns undefined
    return result;
  };
}
` },
    mcq: { q: 'What is the most reliable way to know fn already ran?', options: ['A separate <code>called</code> boolean in the closure', 'Check whether result is undefined', 'Check fn.length', 'Delete fn from the closure and check typeof'], answer: 0, explain: 'Only a dedicated flag distinguishes "never called" from "called and returned undefined". (Setting fn = null afterwards is a nice bonus to free memory.)' },
    hints: [`<p>Hint 1: the returned function needs memory that survives between calls — a closure.</p>`, `<p>Hint 2: keep <code>called</code> (boolean) and <code>result</code>. On the first call set called = true before/after running fn.</p>`, `<p>Hint 3: use <code>fn.apply(this, args)</code> inside a regular function; set <code>fn = null</code> after the call so its closure can be garbage-collected.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  if (k === 'basic') { var runs = 0; var init = once(function (x) { runs++; return this.base + x; }); var obj = { base: 40, init: init }; return [obj.init(2), obj.init(100), runs]; }\n  if (k === 'noReturn') { var n = 0; var nr = once(function () { n++; }); nr(); nr(); return n; }\n  if (k === 'sameResult') { var o = {}; var f = once(function () { return o; }); return f() === f(); }\n  if (k === 'args') { var seen; var g = once(function () { seen = [].slice.call(arguments); return 1; }); g(1, 2); g(3); return seen; }\n  if (k === 'falsy') { var z = once(function () { return 0; }); return [z(), z()]; }\n  if (k === 'separate') { var a = once(function () { return 'a'; }), b = once(function () { return 'b'; }); return [a(), b(), a(), b()]; }\n  if (k === 'reentrant') { var depth = 0; var r = once(function () { depth++; r(); return 1; }); r(); return depth; }\n  if (k === 'many') { var c = 0; var m = once(function () { c++; return c; }); var last; for (var i = 0; i < 100000; i++) last = m(); return [last, c]; }\n  if (k === 'nullResult') { var nn = once(function () { return null; }); return [nn(), nn()]; }\n}"},"cases":[[["basic"],[42,42,1]],[["noReturn"],1],[["sameResult"],true],[["args"],[1,2]],[["falsy"],[0,0]],[["separate"],["a","b","a","b"]],[["reentrant"],1],[["many"],[1,1]],[["nullResult"],[null,null]]]},
    solution: {
      approach: `<p>Closure with a flag and a cached result. Setting the flag <b>before</b> calling fn also protects against re-entrant calls (fn calling the once-wrapper again).</p>`,
      code: { lang: 'js', run: true, code: `
function once(fn) {
  let called = false, result;
  return function (...args) {
    if (!called) {
      called = true;                 // set first: re-entrant calls won't re-run fn
      result = fn.apply(this, args);
      fn = null;                     // free memory held by fn's closure
    }
    return result;
  };
}

let runs = 0;
const init = once(function (x) { runs++; return this.base + x; });
const obj = { base: 40, init };
console.log(obj.init(2), obj.init(100), runs); // 42 42 1
const noReturn = once(() => { runs++; });
noReturn(); noReturn();
console.log(runs);                             // 2 (ran once more, not twice)
` },
      complexity: `<p>O(1) per call; O(1) memory (plus the cached result).</p>`,
      followUps: ['Write <code>before(n, fn)</code> (runs at most n−1 times).', 'Make an async once that shares the same pending promise between concurrent callers.']
    }
  });

  practice.push({
    title: 'Array.prototype.myFlat(depth)', level: 'Easy', tags: ['polyfill', 'recursion', 'array'], companies: ['Swiggy', 'Meesho', 'Zomato'],
    statement: `<p>Implement <code>Array.prototype.myFlat(depth = 1)</code> matching native <code>flat</code>: nested arrays are opened up to <code>depth</code> levels, order is preserved, and holes are removed. <code>depth = Infinity</code> flattens completely; <code>depth ≤ 0</code> returns a shallow copy (without holes).</p>`,
    constraints: `Up to 10<sup>5</sup> total elements; nesting depth ≤ 1000.`,
    example: `<p><code>[1, [2, [3, [4]]], , 5].myFlat()</code> → ${H.c('g', '[1, 2, [3, [4]], 5]')}<br><code>.myFlat(Infinity)</code> → ${H.c('g', '[1, 2, 3, 4, 5]')} (the hole is gone).</p>`,
    brute: { why: `<p>Repeatedly calling <code>[].concat(...arr)</code> until no element is an array works only for depth Infinity, scans the whole array on every round (O(N × depth)), and cannot stop at a given depth correctly if you lose count.</p>`, code: `
function flattenAll(arr) {
  while (arr.some(Array.isArray)) arr = [].concat(...arr); // full rescan every round
  return arr;
}
` },
    mcq: { q: '<code>[[1], [[2]]].flat()</code> returns…', options: ['<code>[1, [2]]</code>', '<code>[1, 2]</code>', '<code>[[1], [[2]]]</code>', '<code>[1, [[2]]]</code>'], answer: 0, explain: 'Default depth is 1: one level of brackets is removed from each element.' },
    hints: [`<p>Hint 1: recursion with a depth counter: arrays with depth left are opened, everything else is copied.</p>`, `<p>Hint 2: skip holes with <code>if (!(i in arr)) continue</code>.</p>`, `<p>Hint 3: convert depth with <code>Math.floor(Number(depth))</code>; NaN → 0. Use an inner helper <code>walk(arr, d)</code> pushing into one output array (no repeated concat).</p>`],
    tests: {"sig":"string int -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, depth) {\n  if (kind === 'example') { var a = [1, [2, [3, [4]]], , 5]; return depth === 99 ? a.myFlat(Infinity) : depth === -99 ? a.myFlat() : a.myFlat(depth); }\n  if (kind === 'json') return JSON.parse(String(depth)).myFlat();\n  if (kind === 'holes') return [[1, , 3], [, [2, , 4]]].myFlat(Infinity);\n  if (kind === 'copy') { var src = [1, [2]]; var c = src.myFlat(0); return [c, c !== src, c[1] === src[1]]; }\n  if (kind === 'empty') return [[].myFlat(), [[]].myFlat(), [[], [[]]].myFlat(Infinity)];\n  if (kind === 'deep') { var deep = [42]; for (var i = 0; i < 1000; i++) deep = [deep]; return deep.myFlat(Infinity); }\n  if (kind === 'wide') { var w = []; for (var j = 0; j < 100000; j++) w.push([j]); var f = w.myFlat(); return [f.length, f[0], f[99999]]; }\n  if (kind === 'strings') return ['ab', ['cd', ['ef']]].myFlat(Infinity);\n  if (kind === 'negative') return [1, [2]].myFlat(-3);\n  if (kind === 'fractional') return [1, [2, [3]]].myFlat(1.9);\n  if (kind === 'objects') { var o = { a: 1 }; return [[o]].myFlat(1)[0] === o; }\n  if (kind === 'nested1') return [[1, [2]], [3]].myFlat();\n}"},"cases":[[["example",-99],[1,2,[3,[4]],5]],[["example",2],[1,2,3,[4],5]],[["example",99],[1,2,3,4,5]],[["example",0],[1,[2,[3,[4]]],5]],[["holes",0],[1,3,2,4]],[["copy",0],[[1,[2]],true,true]],[["empty",0],[[],[],[]]],[["deep",0],[42]],[["wide",0],[100000,0,99999]],[["strings",0],["ab","cd","ef"]],[["negative",0],[1,[2]]],[["fractional",0],[1,2,[3]]],[["objects",0],true],[["nested1",0],[1,[2],3]]]},
    solution: {
      approach: `<p>Single output array; recursive walker that decrements depth per level and pushes leaves. Each element is visited once.</p>`,
      code: { lang: 'js', run: true, code: `
Array.prototype.myFlat = function (depth = 1) {
  const d0 = Math.floor(Number(depth));
  const out = [];
  const walk = (arr, d) => {
    for (let i = 0; i < arr.length; i++) {
      if (!(i in arr)) continue;                  // remove holes
      const v = arr[i];
      if (Array.isArray(v) && d > 0) walk(v, d - 1);
      else out.push(v);
    }
  };
  walk(this, Number.isNaN(d0) ? 0 : d0);
  return out;
};

const a = [1, [2, [3, [4]]], , 5];
console.log(a.myFlat());          // [1, 2, [3, [4]], 5]
console.log(a.myFlat(2));         // [1, 2, 3, [4], 5]
console.log(a.myFlat(Infinity));  // [1, 2, 3, 4, 5]
console.log(a.myFlat(0));         // [1, [2, [3, [4]]], 5]
` },
      complexity: `<p>O(N) time for N total elements visited; O(N) output + O(depth) call stack.</p>`,
      followUps: ['Make it iterative with an explicit stack.', 'Write it as a generator for lazy flattening.']
    }
  });

  practice.push({
    title: 'memoize(fn, resolver)', level: 'Easy', tags: ['closure', 'cache', 'map'], companies: ['Google', 'Adobe', 'Intuit'],
    statement: `<p>Implement <code>memoize(fn, resolver?)</code>. The returned function caches results by key. By default the key is the <b>first argument</b>; if <code>resolver</code> is given, the key is <code>resolver(...args)</code>. Expose the cache as <code>memoized.cache</code> (a Map) so callers can clear it.</p>`,
    constraints: `Keys may be objects (use a Map, not a plain object). fn is pure.`,
    example: `<p><code>const sq = memoize((n) =&gt; n * n);</code> <code>sq(4); sq(4);</code> → fn runs ${H.c('g', 'once')}.<br><code>const add = memoize((a, b) =&gt; a + b, (a, b) =&gt; a + ',' + b);</code> → <code>add(1,2)</code> and <code>add(1,3)</code> are cached separately.</p>`,
    brute: { why: `<p>Using <code>JSON.stringify(args)</code> as the key for everything is slow for large arguments, breaks for cyclic objects, and makes different objects with equal content collide (sometimes desired, often not). Using a plain object turns object keys into "[object Object]".</p>`, code: `
function memoizeNaive(fn) {
  const cache = {};
  return (...args) => {
    const key = JSON.stringify(args);            // costly + throws on cycles
    if (!(key in cache)) cache[key] = fn(...args);
    return cache[key];
  };
}
` },
    mcq: { q: 'Why use a <code>Map</code> for the cache?', options: ['Keys can be any value (objects keep identity) and has/get are O(1)', 'Maps are automatically limited in size', 'Maps serialize keys to JSON', 'Plain objects cannot store numbers'], answer: 0, explain: 'Map keys keep their identity and type; plain object keys are coerced to strings.' },
    hints: [`<p>Hint 1: closure over a Map; check <code>cache.has(key)</code> before computing.</p>`, `<p>Hint 2: key = resolver ? resolver.apply(this, args) : args[0].</p>`, `<p>Hint 3: store even <code>undefined</code> results — use <code>has</code>, not a truthiness check. Attach <code>memoized.cache = cache</code>.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var calls = 0;\n  if (k === 'sq') { var sq = memoize(function (n) { calls++; return n * n; }); return [sq(4), sq(4), sq(5), calls]; }\n  if (k === 'resolver') { var add = memoize(function (a, b) { calls++; return a + b; }, function (a, b) { return a + ',' + b; }); return [add(1, 2), add(1, 3), add(1, 2), calls, add.cache.size]; }\n  if (k === 'defaultFirstArg') { var f = memoize(function (a, b) { calls++; return a + b; }); return [f(1, 2), f(1, 99), calls]; }\n  if (k === 'objectKeys') { var o1 = {}, o2 = {}; var g = memoize(function () { calls++; return calls; }); g(o1); g(o1); g(o2); return calls; }\n  if (k === 'cache') { var h = memoize(function (n) { calls++; return n; }); h(1); h.cache.clear(); h(1); return [calls, h.cache instanceof Map]; }\n  if (k === 'fib') { var fib = memoize(function (n) { calls++; return n < 2 ? n : fib(n - 1) + fib(n - 2); }); return [fib(40), calls]; }\n  if (k === 'undef') { var u = memoize(function () { calls++; return undefined; }); u(1); u(1); return calls; }\n  if (k === 'this') { var obj = { m: 3, f: memoize(function (x) { return this.m * x; }) }; return obj.f(2); }\n  if (k === 'typed') { var t = memoize(function (x) { calls++; return typeof x; }); return [t(1), t('1'), calls]; }\n  if (k === 'nan') { var nn = memoize(function () { calls++; return 1; }); nn(NaN); nn(NaN); return calls; }\n  if (k === 'many') { var m = memoize(function (x) { calls++; return x * 2; }); for (var i = 0; i < 100000; i++) m(i % 1000); return [calls, m.cache.size]; }\n}"},"cases":[[["sq"],[16,16,25,2]],[["resolver"],[3,4,3,2,2]],[["defaultFirstArg"],[3,3,1]],[["objectKeys"],2],[["cache"],[2,true]],[["fib"],[102334155,41]],[["undef"],1],[["this"],6],[["typed"],["number","string",2]],[["nan"],1],[["many"],[1000,1000]]]},
    solution: {
      approach: `<p>Map-backed cache with a pluggable key function (lodash's design). <code>has</code> avoids recomputing falsy results.</p>`,
      code: { lang: 'js', run: true, code: `
function memoize(fn, resolver) {
  const cache = new Map();
  function memoized(...args) {
    const key = resolver ? resolver.apply(this, args) : args[0];
    if (cache.has(key)) return cache.get(key);
    const value = fn.apply(this, args);
    cache.set(key, value);
    return value;
  }
  memoized.cache = cache;
  return memoized;
}

let calls = 0;
const fib = memoize((n) => { calls++; return n < 2 ? n : fib(n - 1) + fib(n - 2); });
console.log(fib(40), 'computed in', calls, 'calls');   // 102334155 computed in 41 calls
const add = memoize((a, b) => a + b, (a, b) => a + ',' + b);
console.log(add(1, 2), add(1, 3), add.cache.size);     // 3 4 2
` },
      complexity: `<p>O(1) average per cached call; memory grows with distinct keys (bound it with an LRU in production).</p>`,
      followUps: ['Bound the cache with LRU eviction.', 'Memoize async functions so concurrent calls share one in-flight promise.']
    }
  });

  practice.push({
    title: 'Promise.race polyfill + timeout helper', level: 'Easy', tags: ['promise', 'polyfill'], companies: ['Microsoft', 'PhonePe', 'Cred'],
    statement: `<p>Implement <code>promiseRace(iterable)</code> that settles the same way as the first input to settle (fulfill or reject). Then use it to build <code>timeout(promise, ms)</code> that rejects with <code>Error('timeout')</code> if the promise takes longer than <code>ms</code>.</p>`,
    constraints: `Inputs may be plain values. Empty input stays pending forever (like native).`,
    example: `<p><code>promiseRace([delay(50,'slow'), delay(10,'fast')])</code> → ${H.c('g', "'fast'")}.<br><code>timeout(delay(50,'x'), 10)</code> → ${H.c('r', 'rejects: timeout')}.</p>`,
    brute: { why: `<p>Polling every few milliseconds for "is any promise done?" is impossible (promises expose no state) and wasteful. The real trick is that a promise can only settle once — so just let every input try to settle it.</p>`, code: `
function raceWrong(promises) {
  // waits for ALL, then returns the first in the array: that's not a race
  return Promise.all(promises).then((values) => values[0]);
}
` },
    mcq: { q: 'Several inputs call <code>resolve</code> of the outer promise. What happens to later calls?', options: ['They are ignored — a promise settles only once', 'They overwrite the value', 'They throw an error', 'They queue extra then callbacks'], answer: 0, explain: 'Once settled, a promise\'s state is locked; extra resolve/reject calls are no-ops.' },
    hints: [`<p>Hint 1: return a new Promise and hand its resolve/reject to every input.</p>`, `<p>Hint 2: <code>Promise.resolve(item).then(resolve, reject)</code> for each item.</p>`, `<p>Hint 3: timeout = race the promise against a timer promise that rejects; clear the timer in <code>finally</code>.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 300); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(k) {\n  return __job(async function () {\n    var delay = function (ms, v) { return new Promise(function (r) { setTimeout(function () { r(v); }, ms); }); };\n    var fail = function (ms, m) { return new Promise(function (_, j) { setTimeout(function () { j(new Error(m)); }, ms); }); };\n    var tryIt = async function (p) { try { return await p; } catch (e) { return 'rejected ' + e.message; } };\n    if (k === 'fastWins') return promiseRace([delay(50, 'slow'), delay(10, 'fast')]);\n    if (k === 'rejectWins') return tryIt(promiseRace([delay(30, 'slow'), fail(5, 'quick fail')]));\n    if (k === 'plainValue') return promiseRace([delay(10, 'late'), 'now']);\n    if (k === 'set') return promiseRace(new Set([delay(20, 'a'), delay(5, 'b')]));\n    if (k === 'single') return promiseRace([delay(1, 'only')]);\n    if (k === 'empty') { var settled = false; promiseRace([]).then(function () { settled = true; }, function () { settled = true; }); await delay(20); return settled; }\n    if (k === 'timeoutHit') return tryIt(timeout(delay(60, 'x'), 10));\n    if (k === 'timeoutOk') return timeout(delay(5, 'quick'), 100);\n    if (k === 'timeoutRejection') return tryIt(timeout(fail(5, 'inner'), 100));\n    if (k === 'timerCleared') { var real = globalThis.clearTimeout, cleared = 0; globalThis.clearTimeout = function (id) { cleared++; return real(id); }; try { await timeout(delay(1, 'v'), 1000); await delay(5); } finally { globalThis.clearTimeout = real; } return cleared; }\n    if (k === 'immediateValue') return timeout(5, 50);\n  });\n}"},"cases":[[["fastWins"],"fast"],[["rejectWins"],"rejected quick fail"],[["plainValue"],"now"],[["set"],"b"],[["single"],"only"],[["empty"],false],[["timeoutHit"],"rejected timeout"],[["timeoutOk"],"quick"],[["timeoutRejection"],"rejected inner"],[["timerCleared"],1],[["immediateValue"],5]]},
    solution: {
      approach: `<p>Attach the outer settle functions to all inputs; first one wins by the "settles once" rule. The timeout is just a race with a rejecting timer.</p>`,
      code: { lang: 'js', run: true, code: `
function promiseRace(iterable) {
  return new Promise((resolve, reject) => {
    for (const item of iterable) Promise.resolve(item).then(resolve, reject);
  });
}
function timeout(promise, ms) {
  let id;
  const timer = new Promise((_, reject) => { id = setTimeout(() => reject(new Error('timeout')), ms); });
  return promiseRace([promise, timer]).finally(() => clearTimeout(id));
}
const delay = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
promiseRace([delay(50, 'slow'), delay(10, 'fast')]).then((v) => console.log(v)); // fast
timeout(delay(50, 'x'), 10).catch((e) => console.log(e.message));                // timeout
timeout(delay(5, 'quick'), 50).then((v) => console.log(v));                      // quick
` },
      complexity: `<p>O(N) to attach handlers. The losers keep running (no cancellation) — pair with AbortController for real fetches.</p>`,
      followUps: ['Implement Promise.any.', 'Use AbortSignal.timeout(ms) with fetch instead.']
    }
  });

  practice.push({
    title: 'throttle(fn, wait) with leading and trailing calls', level: 'Medium', tags: ['timers', 'closure', 'throttle'], companies: ['Uber', 'Atlassian', 'Zomato', 'Booking.com'],
    statement: `<p>Implement <code>throttle(fn, wait)</code>: the first call runs immediately; calls during the next <code>wait</code> ms are not run immediately, but the <b>latest</b> of them runs once the window ends (trailing call). fn never runs more than once per <code>wait</code> ms. Add <code>cancel()</code>.</p>`,
    constraints: `Must preserve <code>this</code> and the latest arguments. O(1) work per call.`,
    example: `<p>wait = 100, calls at 0, 20, 50, 130 ms.<br>runs: 0 (leading, args of call@0), 100 (trailing, args of call@50), and the call at 130 is inside the new window [100, 200) → trailing at 200.<br>${H.c('g', '3 runs at 0, 100, 200')}.</p>`,
    brute: { why: `<p>The simplest "ignore calls within the window" version drops the last events entirely — the final scroll position or the last drag coordinate is lost, which users notice.</p>`, code: `
function throttleLeadingOnly(fn, wait) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= wait) { last = now; fn.apply(this, args); } // trailing call lost
  };
}
` },
    mcq: { q: 'A trailing timer is already scheduled and a new call arrives. What should happen?', options: ['Replace the pending args with the newest ones; keep the existing timer', 'Schedule a second timer', 'Run fn immediately', 'Ignore the call completely'], answer: 0, explain: 'One trailing call per window, always with the freshest arguments.' },
    hints: [`<p>Hint 1: state: <code>last</code> run time, <code>timer</code>, <code>pendingArgs/pendingThis</code>.</p>`, `<p>Hint 2: remaining = wait − (now − last). If remaining ≤ 0 and no timer → run now. Else store pending and, if no timer, set one for <code>remaining</code> ms.</p>`, `<p>Hint 3: in the timer callback, set last = Date.now(), timer = null, run with pending args. cancel clears all state.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"function __ft() {\n  var now = 0, id = 0, timers = [], real = { st: globalThis.setTimeout, ct: globalThis.clearTimeout, dn: Date.now };\n  var api = {\n    now: function () { return now; },\n    install: function () { globalThis.setTimeout = function (fn, ms) { var t = { id: ++id, at: now + Math.max(0, ms || 0), fn: fn }; timers.push(t); return t.id; }; globalThis.clearTimeout = function (i) { timers = timers.filter(function (t) { return t.id !== i; }); }; Date.now = function () { return now; }; },\n    uninstall: function () { globalThis.setTimeout = real.st; globalThis.clearTimeout = real.ct; Date.now = real.dn; },\n    advanceTo: function (target) { while (true) { var due = timers.filter(function (t) { return t.at <= target; }).sort(function (a, b) { return a.at - b.at || a.id - b.id; })[0]; if (!due) break; timers = timers.filter(function (t) { return t !== due; }); now = due.at; due.fn(); } now = target; },\n    pending: function () { return timers.length; }\n  };\n  return api;\n}\n\nfunction chk(k) {\n  var ft = __ft(); ft.install();\n  try {\n    var out = [];\n    var rec = function (v) { out.push(v + '@' + ft.now()); };\n    var callAt = function (th, times) { times.forEach(function (t) { ft.advanceTo(t); th('c' + t); }); };\n    if (k === 'example') { var th = throttle(rec, 100); callAt(th, [0, 20, 50, 130]); ft.advanceTo(1000); return out; }\n    if (k === 'single') { var s = throttle(rec, 100); callAt(s, [40]); ft.advanceTo(1000); return out; }\n    if (k === 'apart') { var a = throttle(rec, 100); callAt(a, [0, 500]); ft.advanceTo(1000); return out; }\n    if (k === 'exactWait') { var e = throttle(rec, 100); callAt(e, [0, 100]); ft.advanceTo(1000); return out; }\n    if (k === 'cancel') { var c = throttle(rec, 100); callAt(c, [0, 10]); c.cancel(); ft.advanceTo(1000); return out; }\n    if (k === 'afterCancel') { var d = throttle(rec, 100); callAt(d, [0, 10]); d.cancel(); callAt(d, [20]); ft.advanceTo(1000); return out; }\n    if (k === 'this') { var obj = { id: 'O', f: throttle(function (v) { out.push(this.id + v); }, 50) }; obj.f(1); obj.f(2); ft.advanceTo(100); return out; }\n    if (k === 'burst') { var b = throttle(rec, 100); for (var i = 0; i < 1000; i++) { ft.advanceTo(i); b('c' + i); } ft.advanceTo(5000); var runs = out.length; return [runs, out[0], out[out.length - 1]]; }\n    if (k === 'rate') {\n      var seed = 5, rnd = function (m) { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % m; };\n      var times = [], t = 0; for (var j = 0; j < 500; j++) { t += rnd(60); times.push(t); }\n      var th2 = throttle(function (v) { out.push([v, ft.now()]); }, 100);\n      times.forEach(function (tm) { ft.advanceTo(tm); th2('c' + tm); });\n      ft.advanceTo(t + 1000);\n      var gapsOk = out.every(function (r, i) { return i === 0 || r[1] - out[i - 1][1] >= 100; });\n      return [gapsOk, out[0][1] === times[0], out[out.length - 1][0] === 'c' + times[times.length - 1], out.length <= times.length];\n    }\n  } finally { ft.uninstall(); }\n}"},"cases":[[["example"],["c0@0","c50@100","c130@200"]],[["single"],["c40@40"]],[["apart"],["c0@0","c500@500"]],[["exactWait"],["c0@0","c100@100"]],[["cancel"],["c0@0"]],[["afterCancel"],["c0@0","c20@20"]],[["this"],["O1","O2"]],[["burst"],[11,"c0@0","c999@1000"]],[["rate"],[true,true,true,true]]]},
    solution: {
      approach: `<p>Leading call when the window is open; otherwise remember the latest call and schedule exactly one trailing call at the window boundary.</p>`,
      code: { lang: 'js', run: true, code: `
function throttle(fn, wait) {
  let last = -Infinity, timer = null, pArgs = null, pThis = null;
  function throttled(...args) {
    const now = Date.now(), remaining = wait - (now - last);
    if (remaining <= 0 && timer === null) {
      last = now;
      fn.apply(this, args);
      return;
    }
    pArgs = args; pThis = this;
    if (timer === null) {
      timer = setTimeout(() => {
        last = Date.now(); timer = null;
        const a = pArgs, t = pThis; pArgs = pThis = null;
        fn.apply(t, a);
      }, Math.max(0, remaining));
    }
  }
  throttled.cancel = () => { clearTimeout(timer); timer = null; pArgs = pThis = null; last = -Infinity; };
  return throttled;
}

const runs = [];
const t0 = Date.now();
const th = throttle((v) => runs.push(v + '@' + Math.round((Date.now() - t0) / 50) * 50), 100);
[0, 20, 50, 130].forEach((ms) => setTimeout(() => th('call' + ms), ms));
setTimeout(() => console.log(runs), 350); // [ 'call0@0', 'call50@100', 'call130@200' ]
` },
      complexity: `<p>O(1) per call, at most one live timer, O(1) memory.</p>`,
      followUps: ['Add options { leading: false } and { trailing: false }.', 'Implement throttle via debounce with maxWait.']
    }
  });

  practice.push({
    title: 'Promise.allSettled and Promise.any polyfills', level: 'Medium', tags: ['promise', 'polyfill'], companies: ['Meta', 'Razorpay', 'Atlassian'],
    statement: `<p>Implement <code>allSettled(iterable)</code> → fulfills with <code>[{status:'fulfilled', value} | {status:'rejected', reason}]</code> in input order once all settle. Implement <code>any(iterable)</code> → fulfills with the first fulfillment; if <b>all</b> reject, rejects with an <code>AggregateError</code> whose <code>errors</code> are in input order. Empty input: allSettled → <code>[]</code>, any → AggregateError.</p>`,
    constraints: `Plain values allowed. No use of the native versions.`,
    example: `<p><code>allSettled([P.resolve(1), P.reject('x')])</code> → ${H.c('g', "[{fulfilled,1},{rejected,'x'}]")}<br><code>any([P.reject('a'), P.resolve(2)])</code> → ${H.c('g', '2')}; <code>any([P.reject('a')])</code> → ${H.c('r', "AggregateError(['a'])")}.</p>`,
    brute: { why: `<p>Calling <code>Promise.all(items.map(p =&gt; p.catch(e =&gt; e)))</code> looks like allSettled, but you can no longer tell a rejection from a fulfillment whose value happens to be an Error, and it relies on the native all.</p>`, code: `
const fakeAllSettled = (items) => Promise.all(items.map((p) => Promise.resolve(p).catch((e) => e)));
// [1, Error] -> was index 1 a rejection or a resolved Error object? Unknown.
` },
    mcq: { q: 'For <code>any</code>, what do you count down?', options: ['The number of rejections still needed before giving up', 'The number of fulfillments', 'Elapsed time', 'Nothing — just use race'], answer: 0, explain: 'any succeeds on the first fulfill; it fails only when every input has rejected, so count rejections.' },
    hints: [`<p>Hint 1: both are countdown latches like Promise.all, with different "what to store" and "when to finish" rules.</p>`, `<p>Hint 2: allSettled: both handlers write a status object to slot i and decrement; resolve at 0. any: fulfillment → resolve immediately; rejection → errors[i] = e, decrement, reject AggregateError at 0.</p>`, `<p>Hint 3: handle empty input up front; wrap items with Promise.resolve.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 300); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(k) {\n  return __job(async function () {\n    var delay = function (ms, v) { return new Promise(function (r) { setTimeout(function () { r(v); }, ms); }); };\n    var norm = function (r) { return r.map(function (x) { return x.status === 'fulfilled' ? ['f', x.value] : ['r', x.reason]; }); };\n    var anyFail = async function (items) { try { return await any(items); } catch (e) { return [e.name, e.errors, e instanceof AggregateError]; } };\n    if (k === 'settledMix') return norm(await allSettled([1, Promise.reject('x'), delay(5, 'late')]));\n    if (k === 'settledEmpty') return allSettled([]);\n    if (k === 'settledOrder') return norm(await allSettled([delay(20, 'slow'), delay(1, 'fast'), Promise.reject('no')]));\n    if (k === 'settledShape') { var r = await allSettled([Promise.resolve(1), Promise.reject(2)]); return [Object.keys(r[0]).sort(), Object.keys(r[1]).sort()]; }\n    if (k === 'settledNeverRejects') { try { await allSettled([Promise.reject(1)]); return 'resolved'; } catch (e) { return 'rejected'; } }\n    if (k === 'settledSet') return norm(await allSettled(new Set([1, 2])));\n    if (k === 'anyFirstFulfil') return any([Promise.reject('a'), delay(5, 2)]);\n    if (k === 'anyAllReject') return anyFail([Promise.reject('a'), Promise.reject('b')]);\n    if (k === 'anyOrderOfErrors') return anyFail([new Promise(function (_, j) { setTimeout(function () { j('slow'); }, 10); }), Promise.reject('fast')]);\n    if (k === 'anyEmpty') return anyFail([]);\n    if (k === 'anyPlain') return any([Promise.reject('x'), 'plain']);\n    if (k === 'anyFastest') return any([delay(20, 'slow'), delay(1, 'quick')]);\n    if (k === 'anyIgnoresRejection') return any([Promise.reject('early'), delay(10, 'later')]);\n    if (k === 'settledMany') { var items = []; for (var i = 0; i < 10000; i++) items.push(i % 2 ? Promise.reject(i) : i); var res = await allSettled(items); return [res.length, res[0].status, res[1].status, res[9999].reason]; }\n  });\n}"},"cases":[[["settledMix"],[["f",1],["r","x"],["f","late"]]],[["settledEmpty"],[]],[["settledOrder"],[["f","slow"],["f","fast"],["r","no"]]],[["settledShape"],[["status","value"],["reason","status"]]],[["settledNeverRejects"],"resolved"],[["settledSet"],[["f",1],["f",2]]],[["anyFirstFulfil"],2],[["anyAllReject"],["AggregateError",["a","b"],true]],[["anyOrderOfErrors"],["AggregateError",["slow","fast"],true]],[["anyEmpty"],["AggregateError",[],true]],[["anyPlain"],"plain"],[["anyFastest"],"quick"],[["anyIgnoresRejection"],"later"],[["settledMany"],[10000,"fulfilled","rejected",9999]]]},
    solution: {
      approach: `<p>Two countdown latches. allSettled never rejects; any mirrors all with fulfill/reject roles swapped.</p>`,
      code: { lang: 'js', run: true, code: `
function allSettled(iterable) {
  const items = Array.from(iterable);
  return new Promise((resolve) => {
    const out = new Array(items.length);
    let left = items.length;
    if (!left) return resolve(out);
    items.forEach((it, i) => {
      Promise.resolve(it).then(
        (value) => { out[i] = { status: 'fulfilled', value }; },
        (reason) => { out[i] = { status: 'rejected', reason }; }
      ).then(() => { if (--left === 0) resolve(out); });
    });
  });
}
function any(iterable) {
  const items = Array.from(iterable);
  return new Promise((resolve, reject) => {
    const errors = new Array(items.length);
    let left = items.length;
    if (!left) return reject(new AggregateError([], 'All promises were rejected'));
    items.forEach((it, i) => {
      Promise.resolve(it).then(resolve, (e) => {
        errors[i] = e;
        if (--left === 0) reject(new AggregateError(errors, 'All promises were rejected'));
      });
    });
  });
}

allSettled([1, Promise.reject('x'), new Promise((r) => setTimeout(() => r('late'), 10))])
  .then((r) => console.log(JSON.stringify(r)));
any([Promise.reject('a'), new Promise((r) => setTimeout(() => r(2), 5))]).then((v) => console.log('any ->', v)); // 2
any([Promise.reject('a'), Promise.reject('b')]).catch((e) => console.log(e.name, e.errors));              // AggregateError ['a','b']
any([]).catch((e) => console.log('empty ->', e.name));
` },
      complexity: `<p>O(N) handlers, O(N) result memory.</p>`,
      followUps: ['Why does allSettled never need a reject parameter?', 'Implement allSettled using only Promise.all + map.']
    }
  });

  practice.push({
    title: 'deepEqual(a, b) with NaN, Dates, arrays and cycles', level: 'Medium', tags: ['recursion', 'objects', 'comparison'], companies: ['Salesforce', 'Microsoft', 'Rippling'],
    statement: `<p>Implement <code>deepEqual(a, b)</code> that returns true when both values are structurally equal: primitives by <code>Object.is</code> semantics except <code>+0</code> equals <code>-0</code>; arrays by length and elements; plain objects by own enumerable keys (order-independent) and values; Dates by time. Must terminate on circular structures.</p>`,
    constraints: `Depth ≤ 1000; up to 10<sup>5</sup> nodes.`,
    example: `<p><code>deepEqual({a:[1,{b:NaN}]}, {a:[1,{b:NaN}]})</code> → ${H.c('g', 'true')}<br><code>deepEqual([1,2], {0:1, 1:2, length:2})</code> → ${H.c('r', 'false')} (array vs object)<br><code>deepEqual({x: undefined}, {})</code> → ${H.c('r', 'false')}</p>`,
    brute: { why: `<p><code>JSON.stringify(a) === JSON.stringify(b)</code> depends on key order (<code>{a:1,b:2}</code> vs <code>{b:2,a:1}</code> → false), drops undefined (so <code>{x: undefined}</code> equals <code>{}</code>), turns NaN into null and throws on cycles.</p>`, code: `
const jsonEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
console.log(jsonEqual({ a: 1, b: 2 }, { b: 2, a: 1 })); // false (wrong)
` },
    mcq: { q: 'Which check correctly treats NaN as equal to NaN?', options: ['<code>a !== a &amp;&amp; b !== b</code> (or Object.is)', '<code>a === b</code>', '<code>a == b</code>', '<code>isNaN(a) === isNaN(b)</code>'], answer: 0, explain: 'NaN is the only value not equal to itself; isNaN("x") is also true, so the last option is wrong for strings.' },
    hints: [`<p>Hint 1: fast path: <code>a === b</code> (covers +0/-0) or both NaN → true.</p>`, `<p>Hint 2: then require both non-null objects with the same "kind" (Array.isArray, Date) and the same key count; recurse on each key.</p>`, `<p>Hint 3: cycles: keep a Map from a → Set of b's already being compared; if the pair is seen, return true.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var cyc = function () { var x = { n: 1 }; x.self = x; return x; };\n  if (k === 'nanNested') return deepEqual({ a: [1, { b: NaN }] }, { a: [1, { b: NaN }] });\n  if (k === 'order') return deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 });\n  if (k === 'arrayVsObject') return deepEqual([1, 2], { 0: 1, 1: 2, length: 2 });\n  if (k === 'undefinedKey') return [deepEqual({ x: undefined }, {}), deepEqual({}, { x: undefined })];\n  if (k === 'zeros') return [deepEqual(0, -0), deepEqual(-0, 0)];\n  if (k === 'cycles') return deepEqual(cyc(), cyc());\n  if (k === 'cycleDiff') { var a = cyc(), b = cyc(); b.n = 2; return deepEqual(a, b); }\n  if (k === 'dates') return [deepEqual(new Date(5), new Date(5)), deepEqual(new Date(5), new Date(6)), deepEqual(new Date(5), {}), deepEqual({}, new Date(5))];\n  if (k === 'primitives') return [deepEqual(1, 1), deepEqual(1, 2), deepEqual('a', 'a'), deepEqual('1', 1), deepEqual(null, null), deepEqual(null, undefined), deepEqual(undefined, undefined), deepEqual(true, 1), deepEqual(NaN, NaN), deepEqual(NaN, 0)];\n  if (k === 'arrays') return [deepEqual([1, 2, 3], [1, 2, 3]), deepEqual([1, 2, 3], [1, 2]), deepEqual([1, 2], [2, 1]), deepEqual([], []), deepEqual([[1], [2]], [[1], [2]]), deepEqual([[1]], [[2]])];\n  if (k === 'nullObject') return [deepEqual(null, {}), deepEqual({}, null), deepEqual({}, {})];\n  if (k === 'sparse') return [deepEqual([1, , 3], [1, undefined, 3]), deepEqual([1, ,], [1])];\n  if (k === 'deep') { var a1 = {}, b1 = {}, ca = a1, cb = b1; for (var i = 0; i < 1000; i++) { ca.n = {}; cb.n = {}; ca = ca.n; cb = cb.n; } var same = deepEqual(a1, b1); cb.leaf = 1; return [same, deepEqual(a1, b1)]; }\n  if (k === 'wide') { var xa = [], xb = []; for (var j = 0; j < 100000; j++) { xa.push({ v: j }); xb.push({ v: j }); } var eq = deepEqual(xa, xb); xb[99999].v = -1; return [eq, deepEqual(xa, xb)]; }\n  if (k === 'sharedRef') { var s = { v: 1 }; return deepEqual({ a: s, b: s }, { a: { v: 1 }, b: { v: 1 } }); }\n  if (k === 'extraKey') return [deepEqual({ a: 1 }, { a: 1, b: 2 }), deepEqual({ a: 1, b: 2 }, { a: 1 })];\n  if (k === 'sameRef') { var o = { z: [1] }; return deepEqual(o, o); }\n}"},"cases":[[["nanNested"],true],[["order"],true],[["arrayVsObject"],false],[["undefinedKey"],[false,false]],[["zeros"],[true,true]],[["cycles"],true],[["cycleDiff"],false],[["dates"],[true,false,false,false]],[["primitives"],[true,false,true,false,true,false,true,false,true,false]],[["arrays"],[true,false,false,true,true,false]],[["nullObject"],[false,false,true]],[["sparse"],[false,false]],[["deep"],[true,false]],[["wide"],[true,false]],[["sharedRef"],true],[["extraKey"],[false,false]],[["sameRef"],true]]},
    solution: {
      approach: `<p>Recursive structural comparison with early exits (kind, key count, missing key) and a pair memo for cycles.</p>`,
      code: { lang: 'js', run: true, code: `
function deepEqual(a, b, seen = new Map()) {
  if (a === b) return true;
  if (a !== a && b !== b) return true;                       // NaN
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  let partners = seen.get(a);
  if (partners && partners.has(b)) return true;              // already comparing this pair
  if (!partners) seen.set(a, (partners = new Set()));
  partners.add(b);
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length || (Array.isArray(a) && a.length !== b.length)) return false;  // trailing holes: [1, ,] vs [1]
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k], seen));
}

console.log(deepEqual({ a: [1, { b: NaN }] }, { a: [1, { b: NaN }] })); // true
console.log(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }));                 // true
console.log(deepEqual([1, 2], { 0: 1, 1: 2, length: 2 }));              // false
console.log(deepEqual({ x: undefined }, {}), deepEqual(0, -0));         // false true
const x = { n: 1 }; x.self = x; const y = { n: 1 }; y.self = y;
console.log(deepEqual(x, y), deepEqual(new Date(5), new Date(5)));      // true true
` },
      complexity: `<p>O(N) for N nodes compared (early exits often faster); O(depth + pairs) memory.</p>`,
      followUps: ['Support Map and Set.', 'Add an option to ignore certain keys (e.g. updatedAt).']
    }
  });

  practice.push({
    title: 'flattenObject and unflattenObject (dot paths)', level: 'Medium', tags: ['recursion', 'objects'], companies: ['Amazon', 'Freshworks', 'Postman'],
    statement: `<p>Implement <code>flattenObject(obj)</code> → an object whose keys are dot paths to every leaf (<code>{a:{b:1}}</code> → <code>{'a.b':1}</code>; arrays use indexes: <code>'tags.0'</code>). Empty objects/arrays are kept as leaves. Then implement <code>unflattenObject(flat)</code> that rebuilds the original (numeric segments create arrays).</p>`,
    constraints: `Keys contain no dots. Depth ≤ 100. Values are JSON-like.`,
    example: `<p><code>{user:{name:'A', tags:['x','y']}, empty:{}}</code> → ${H.c('g', "{'user.name':'A','user.tags.0':'x','user.tags.1':'y','empty':{}}")} and back.</p>`,
    brute: { why: `<p>Hand-writing nested loops for a fixed depth (for each key, for each sub-key…) only works for known shapes; real data has arbitrary depth, so recursion (or a stack) is needed.</p>`, code: `
function flattenTwoLevels(o) {
  const out = {};
  for (const k in o) {
    if (typeof o[k] === 'object') for (const k2 in o[k]) out[k + '.' + k2] = o[k][k2]; // breaks at depth 3
    else out[k] = o[k];
  }
  return out;
}
` },
    mcq: { q: 'While unflattening <code>"tags.0"</code>, how do you know <code>tags</code> should be an array?', options: ['The NEXT path segment ("0") is a non-negative integer', 'The key is plural', 'The value is a string', 'Always use arrays'], answer: 0, explain: 'Look ahead one segment: an integer index means the container being created is an array.' },
    hints: [`<p>Hint 1: flatten = DFS carrying the path prefix; a leaf is a primitive, null, or an empty container.</p>`, `<p>Hint 2: unflatten = for each key, split('.') and walk/create containers from the root.</p>`, `<p>Hint 3: when creating a missing container for segment i, check if segment i+1 matches <code>/^\\d+$/</code> → [] else {}.</p>`],
    tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, json) {\n  var v = JSON.parse(json);\n  if (kind === 'flat') return flattenObject(v);\n  if (kind === 'round') return JSON.stringify(unflattenObject(flattenObject(v))) === JSON.stringify(v);\n  if (kind === 'unflat') return unflattenObject(v);\n  if (kind === 'deep') { var o = {}, cur = o; for (var i = 0; i < 99; i++) { cur.k = {}; cur = cur.k; } cur.k = 'leaf'; var f = flattenObject(o); var key = Object.keys(f)[0]; return [Object.keys(f).length, key.split('.').length, f[key]]; }\n  if (kind === 'wide') { var w = {}; for (var j = 0; j < 100000; j++) w['k' + j] = { v: j }; var fw = flattenObject(w); return [Object.keys(fw).length, fw['k99999.v']]; }\n  if (kind === 'input') { var before = JSON.stringify(v); flattenObject(v); return JSON.stringify(v) === before; }\n}"},"cases":[[["flat","{\"user\":{\"name\":\"A\",\"tags\":[\"x\",\"y\"]},\"empty\":{},\"n\":null}"],{"user.name":"A","user.tags.0":"x","user.tags.1":"y","empty":{},"n":null}],[["flat","{}"],{}],[["flat","{\"a\":{\"b\":{\"c\":1}}}"],{"a.b.c":1}],[["flat","{\"a\":[],\"b\":[{}],\"c\":[[1]]}"],{"a":[],"b.0":{},"c.0.0":1}],[["flat","{\"x\":0,\"y\":\"\",\"z\":false}"],{"x":0,"y":"","z":false}],[["round","{\"user\":{\"name\":\"A\",\"tags\":[\"x\",\"y\"]},\"empty\":{},\"n\":null}"],true],[["round","{\"a\":[{\"b\":1},{\"b\":2}],\"c\":{\"d\":[[1,2],[3]]}}"],true],[["unflat","{\"a.b\":1,\"a.c\":2,\"d\":3}"],{"a":{"b":1,"c":2},"d":3}],[["unflat","{\"list.0.name\":\"x\",\"list.1.name\":\"y\"}"],{"list":[{"name":"x"},{"name":"y"}]}],[["unflat","{\"t.0\":\"a\",\"t.1\":\"b\"}"],{"t":["a","b"]}],[["unflat","{}"],{}],[["input","{\"a\":{\"b\":[1,2]}}"],true],[["deep","{}"],[1,100,"leaf"]],[["wide","{}"],[100000,99999]]]},
    solution: {
      approach: `<p>Recursive DFS for flatten; path-walking with lazy container creation for unflatten. Both are linear in the total number of keys × path length.</p>`,
      code: { lang: 'js', run: true, code: `
function flattenObject(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? prefix + '.' + k : k;
    const isContainer = v !== null && typeof v === 'object';
    if (isContainer && Object.keys(v).length) flattenObject(v, path, out);
    else out[path] = v;                        // primitive, null, or empty {} / []
  }
  return out;
}
function unflattenObject(flat) {
  const root = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.');
    let node = root;
    parts.forEach((p, i) => {
      if (i === parts.length - 1) { node[p] = value; return; }
      if (!(p in node)) node[p] = /^\\d+$/.test(parts[i + 1]) ? [] : {};
      node = node[p];
    });
  }
  return root;
}

const src = { user: { name: 'A', tags: ['x', 'y'] }, empty: {}, n: null };
const flat = flattenObject(src);
console.log(flat);   // { 'user.name': 'A', 'user.tags.0': 'x', 'user.tags.1': 'y', empty: {}, n: null }
console.log(JSON.stringify(unflattenObject(flat)) === JSON.stringify(src)); // true
` },
      complexity: `<p>O(total path characters) for both directions; O(depth) recursion.</p>`,
      followUps: ['Escape keys that contain dots.', 'Support a custom separator and max depth.']
    }
  });

  practice.push({
    title: 'compose, pipe and async pipe', level: 'Medium', tags: ['functional', 'reduce', 'promises'], companies: ['Walmart', 'Intuit', 'ThoughtWorks'],
    statement: `<p>Implement <code>compose(...fns)</code> (right to left: <code>compose(f, g)(x) = f(g(x))</code>), <code>pipe(...fns)</code> (left to right) and <code>pipeAsync(...fns)</code> where any function may return a promise and the result is a promise. With zero functions, return the identity.</p>`,
    constraints: `The first function (in execution order) may take multiple arguments; the rest take one.`,
    example: `<p><code>pipe((a, b) =&gt; a + b, x =&gt; x * 2, String)(3, 4)</code> → ${H.c('g', "'14'")}.<br><code>compose(String, x =&gt; x * 2)(5)</code> → ${H.c('g', "'10'")}.</p>`,
    brute: { why: `<p>Nesting calls manually (<code>h(g(f(x)))</code>) works for a fixed list but cannot be built from an array of steps at runtime, and is hard to read when there are many steps.</p>`, code: `
const manual = (x) => String(double(inc(x)));   // fixed shape, not reusable
function inc(x) { return x + 1; }
function double(x) { return x * 2; }
` },
    mcq: { q: 'Which array method naturally implements compose?', options: ['<code>reduceRight</code>', '<code>map</code>', '<code>filter</code>', '<code>flat</code>'], answer: 0, explain: 'compose applies functions from right to left: reduceRight walks the list in that order, feeding each result to the next function.' },
    hints: [`<p>Hint 1: pipe = <code>fns.reduce((acc, f) =&gt; f(acc), initial)</code>.</p>`, `<p>Hint 2: to allow multiple args for the first function, call it separately: <code>first(...args)</code>, then reduce over the rest.</p>`, `<p>Hint 3: async: start with <code>Promise.resolve(first(...args))</code> and chain <code>.then(f)</code> for each remaining f.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 1); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(k) {\n  return __job(async function () {\n    var dbl = function (x) { return x * 2; }, inc = function (x) { return x + 1; };\n    if (k === 'pipe') return pipe(function (a, b) { return a + b; }, dbl, String)(3, 4);\n    if (k === 'compose') return compose(String, dbl)(5);\n    if (k === 'pipe0') return pipe()(7);\n    if (k === 'compose0') return compose()(7);\n    if (k === 'orderPipe') return pipe(inc, dbl)(3);\n    if (k === 'orderCompose') return compose(inc, dbl)(3);\n    if (k === 'single') return [pipe(dbl)(4), compose(dbl)(4)];\n    if (k === 'async') { var fetchUser = function (id) { return new Promise(function (r) { setTimeout(function () { r({ id: id, name: 'asha' }); }, 5); }); }; return pipeAsync(fetchUser, function (u) { return u.name; }, function (s) { return s.toUpperCase(); })(1); }\n    if (k === 'async0') return pipeAsync()(9);\n    if (k === 'asyncPlain') return pipeAsync(inc, dbl)(1);\n    if (k === 'asyncMultiArg') return pipeAsync(function (a, b) { return a * b; }, inc)(3, 4);\n    if (k === 'asyncReject') { try { await pipeAsync(inc, function () { throw new Error('bad'); }, dbl)(1); return 'resolved'; } catch (e) { return e.message; } }\n    if (k === 'asyncIsPromise') return pipeAsync(inc)(1) instanceof Promise;\n    if (k === 'many') { var fns = []; for (var i = 0; i < 1000; i++) fns.push(inc); return [pipe.apply(null, fns)(0), compose.apply(null, fns)(0), await pipeAsync.apply(null, fns)(0)]; }\n  });\n}"},"cases":[[["pipe"],"14"],[["compose"],"10"],[["pipe0"],7],[["compose0"],7],[["orderPipe"],8],[["orderCompose"],7],[["single"],[8,8]],[["async"],"ASHA"],[["async0"],9],[["asyncPlain"],4],[["asyncMultiArg"],13],[["asyncReject"],"bad"],[["asyncIsPromise"],true],[["many"],[1000,1000,1000]]]},
    solution: {
      approach: `<p>Reduce the function list, threading the accumulator; async version threads a promise instead of a value.</p>`,
      code: { lang: 'js', run: true, code: `
const pipe = (...fns) => (...args) => {
  if (!fns.length) return args[0];
  const [first, ...rest] = fns;
  return rest.reduce((acc, f) => f(acc), first(...args));
};
const compose = (...fns) => pipe(...fns.slice().reverse());
const pipeAsync = (...fns) => (...args) => {
  if (!fns.length) return Promise.resolve(args[0]);
  const [first, ...rest] = fns;
  return rest.reduce((p, f) => p.then(f), Promise.resolve().then(() => first(...args)));
};

console.log(pipe((a, b) => a + b, (x) => x * 2, String)(3, 4)); // '14'
console.log(compose(String, (x) => x * 2)(5));                   // '10'
console.log(pipe()(7));                                          // 7
const fetchUser = (id) => new Promise((r) => setTimeout(() => r({ id, name: 'asha' }), 5));
pipeAsync(fetchUser, (u) => u.name, (s) => s.toUpperCase())(1).then((v) => console.log(v)); // ASHA
` },
      complexity: `<p>O(k) calls for k functions. No extra memory beyond the closure.</p>`,
      followUps: ['Add a <code>tap</code> helper for logging inside a pipe.', 'Short-circuit the async pipe when a step returns null.']
    }
  });

  practice.push({
    title: 'Infinite currying: sum(1)(2)(3)…()', level: 'Medium', tags: ['closure', 'currying', 'coercion'], companies: ['Paytm', 'Ola', 'MakeMyTrip'],
    statement: `<p>Implement <code>sum</code> so that <code>sum(1)(2)(3)()</code> → 6, <code>sum(5)()</code> → 5, and each call may pass several numbers: <code>sum(1, 2)(3, 4)()</code> → 10. Bonus: make <code>+sum(1)(2)</code> and <code>sum(1)(2) == 3</code> work without the final empty call.</p>`,
    constraints: `Up to 1000 chained calls. Partial chains must be reusable: <code>const s = sum(1); s(2)(); s(10)()</code> → 3 and 11.`,
    example: `<p><code>sum(1)(2)(3)()</code> → ${H.c('g', '6')}; <code>sum(1, 2)(3, 4)()</code> → ${H.c('g', '10')}; <code>+sum(10)(5)</code> → ${H.c('g', '15')}.</p>`,
    brute: { why: `<p>A global running total (<code>let total = 0</code> outside) works once, but the second expression continues from the old total, and reusing a partial chain corrupts the state.</p>`, code: `
let total = 0;
function sumGlobal(x) {
  if (x === undefined) { const t = total; return t; }  // never resets; partials share state
  total += x;
  return sumGlobal;
}
` },
    mcq: { q: 'Why does <code>+sum(1)(2)</code> produce a number when sum returns a function?', options: ['Unary + converts the function to a primitive by calling its valueOf (which we override)', 'Functions are numbers in JS', 'The + operator calls the function', 'It throws a TypeError'], answer: 0, explain: 'ToPrimitive calls valueOf/toString; returning the running total from valueOf makes the conversion yield it.' },
    hints: [`<p>Hint 1: each call returns a NEW function closing over the running total so far (no shared mutable state).</p>`, `<p>Hint 2: inner function: if called with no args → return total; else return sum(total + Σargs).</p>`, `<p>Hint 3: attach <code>valueOf</code>/<code>toString</code> (or <code>Symbol.toPrimitive</code>) returning total for the bonus.</p>`],
    tests: {"sig":"int[][] -> int","fn":"chk","harness":{"js":"\nfunction chk(groups) {\n  if (groups.length === 1 && groups[0].length === 1 && groups[0][0] === -1) { var s = sum(1); return [s(2)(), s(10)(), s(2)()]; }\n  if (groups.length === 1 && groups[0].length === 1 && groups[0][0] === -2) { var c = sum(0); for (var i = 1; i <= 1000; i++) c = c(i); return c(); }\n  if (groups.length === 1 && groups[0].length === 1 && groups[0][0] === -3) return [+sum(10)(5), sum(1)(2) == 3, String(sum(4)(4)), 1 + sum(2)(3), `${sum(7)}`];\n  var f = sum;\n  for (var g of groups) f = f.apply(null, g);\n  return f;\n}"},"cases":[[[[[1],[2],[3],[]]],6],[[[[1,2],[3,4],[]]],10],[[[[5],[]]],5],[[[[0],[]]],0],[[[[-5],[5],[]]],0],[[[[1.5],[2.5],[]]],4],[[[[-1]]],[3,11,3]],[[[[-2]]],500500],[[[[-3]]],[15,true,"8",6,"7"]]]},
    solution: {
      approach: `<p>Immutable accumulation: <code>sum(...xs)</code> computes a total and returns a function that either returns it (empty call) or recurses with a bigger total. Conversion hooks expose the total for coercion.</p>`,
      code: { lang: 'js', run: true, code: `
function sum(...xs) {
  const total = xs.reduce((s, x) => s + x, 0);
  const next = (...more) => (more.length ? sum(total, ...more) : total);
  next[Symbol.toPrimitive] = () => total;   // used by +, ==, template strings
  return next;
}

console.log(sum(1)(2)(3)());        // 6
console.log(sum(1, 2)(3, 4)());     // 10
console.log(sum(5)());              // 5
const s = sum(1);
console.log(s(2)(), s(10)());       // 3 11 (partials independent)
console.log(+sum(10)(5), sum(1)(2) == 3, String(sum(4)(4))); // 15 true '8'
` },
      complexity: `<p>O(args) per call; each call allocates one small closure.</p>`,
      followUps: ['Generalise: <code>infiniteCurry(fn, seed)</code> for any reducer.', 'Explain the difference between valueOf and Symbol.toPrimitive.']
    }
  });

  practice.push({
    title: 'promisify(fn) for Node-style callbacks', level: 'Medium', tags: ['promise', 'callbacks', 'polyfill'], companies: ['Google', 'Postman', 'BrowserStack'],
    statement: `<p>Implement <code>promisify(fn)</code>: <code>fn</code> takes normal arguments followed by a callback <code>(err, value)</code>. The returned function takes the same normal arguments and returns a promise that rejects with <code>err</code> if it is truthy, otherwise fulfills with <code>value</code>. Preserve <code>this</code>.</p>`,
    constraints: `The callback may be called synchronously or asynchronously; fn may also throw synchronously (reject in that case).`,
    example: `<p><code>function div(a, b, cb) { b === 0 ? cb(new Error('div by 0')) : cb(null, a / b); }</code><br><code>promisify(div)(6, 3)</code> → ${H.c('g', '2')}; <code>promisify(div)(1, 0)</code> → ${H.c('r', 'rejects: div by 0')}.</p>`,
    brute: { why: `<p>Wrapping each callback API by hand (writing <code>new Promise</code> around every function) is repetitive and easy to get wrong (forgetting <code>this</code>, forgetting to reject when fn throws).</p>`, code: `
function divAsync(a, b) {
  return new Promise((res, rej) => div(a, b, (e, v) => (e ? rej(e) : res(v)))); // repeated for EVERY API
}
function div(a, b, cb) { b === 0 ? cb(new Error('div by 0')) : cb(null, a / b); }
` },
    mcq: { q: 'fn throws synchronously before calling the callback. What should the promise do?', options: ['Reject with the thrown error', 'Stay pending forever', 'Crash the process', 'Fulfill with undefined'], answer: 0, explain: 'The Promise executor catches synchronous throws and rejects — another reason to do the call inside the executor.' },
    hints: [`<p>Hint 1: return a regular function that returns <code>new Promise((resolve, reject) =&gt; ...)</code>.</p>`, `<p>Hint 2: call <code>fn.call(this, ...args, (err, value) =&gt; err ? reject(err) : resolve(value))</code> inside the executor.</p>`, `<p>Hint 3: the executor automatically converts a synchronous throw into a rejection.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 300); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(k) {\n  return __job(async function () {\n    var div = function (a, b, cb) { setTimeout(function () { if (b === 0) cb(new Error('div by 0')); else cb(null, a / b); }, 2); };\n    var tryIt = async function (p) { try { return await p; } catch (e) { return 'rejected ' + e.message; } };\n    if (k === 'ok') return promisify(div)(6, 3);\n    if (k === 'err') return tryIt(promisify(div)(1, 0));\n    if (k === 'syncCb') return promisify(function (x, cb) { cb(null, x + 1); })(1);\n    if (k === 'syncErr') return tryIt(promisify(function (cb) { cb(new Error('now')); })());\n    if (k === 'throws') return tryIt(promisify(function () { throw new Error('sync boom'); })());\n    if (k === 'this') { var db = { name: 'users', find: function (id, cb) { cb(null, this.name + '#' + id); } }; db.findP = promisify(db.find); return db.findP(7); }\n    if (k === 'noArgs') return promisify(function (cb) { cb(null, 'x'); })();\n    if (k === 'falsyErr') return [await promisify(function (cb) { cb(0, 'a'); })(), await promisify(function (cb) { cb('', 'b'); })(), await promisify(function (cb) { cb(undefined, 'c'); })()];\n    if (k === 'noValue') return (await promisify(function (cb) { cb(null); })()) === undefined;\n    if (k === 'errorObject') { var e = new Error('x'); try { await promisify(function (cb) { cb(e); })(); } catch (err) { return err === e; } }\n    if (k === 'isPromise') return promisify(function (cb) { cb(null, 1); })() instanceof Promise;\n    if (k === 'manyArgs') return promisify(function (a, b, c, d, cb) { cb(null, a + b + c + d); })(1, 2, 3, 4);\n    if (k === 'many') { var p = promisify(function (x, cb) { cb(null, x * 2); }); var all = []; for (var i = 0; i < 10000; i++) all.push(p(i)); var r = await Promise.all(all); return [r.length, r[9999]]; }\n  });\n}"},"cases":[[["ok"],2],[["err"],"rejected div by 0"],[["syncCb"],2],[["syncErr"],"rejected now"],[["throws"],"rejected sync boom"],[["this"],"users#7"],[["noArgs"],"x"],[["falsyErr"],["a","b","c"]],[["noValue"],true],[["errorObject"],true],[["isPromise"],true],[["manyArgs"],10],[["many"],[10000,19998]]]},
    solution: {
      approach: `<p>Append an error-first callback that settles the promise; run fn inside the executor so sync throws become rejections. Node ships this as <code>util.promisify</code>.</p>`,
      code: { lang: 'js', run: true, code: `
function promisify(fn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (err, value) => (err ? reject(err) : resolve(value)));
    });
  };
}

function div(a, b, cb) { setTimeout(() => (b === 0 ? cb(new Error('div by 0')) : cb(null, a / b)), 5); }
const divP = promisify(div);
divP(6, 3).then((v) => console.log('6/3 =', v));                     // 2
divP(1, 0).catch((e) => console.log('error:', e.message));           // div by 0
const db = { name: 'users', find(id, cb) { cb(null, this.name + '#' + id); } };
db.findP = promisify(db.find);
db.findP(7).then((v) => console.log(v));                             // users#7
promisify(() => { throw new Error('sync boom'); })().catch((e) => console.log(e.message));
` },
      complexity: `<p>O(1) overhead per call.</p>`,
      followUps: ['Write the reverse: callbackify(asyncFn).', 'Support callbacks that pass multiple values.']
    }
  });

  practice.push({
    title: 'Promise pool: run async tasks with a concurrency limit', level: 'Hard', tags: ['promise', 'concurrency', 'queue'], companies: ['Google', 'Netflix', 'Stripe', 'Atlassian'],
    statement: `<p>Implement <code>promisePool(tasks, limit)</code> where <code>tasks</code> is an array of functions returning promises. Run at most <code>limit</code> tasks at once; as soon as one finishes, start the next. Resolve with results in <b>input order</b>; reject on the first failure (and start no new tasks after that).</p>`,
    constraints: `1 ≤ limit ≤ 100, up to 10<sup>4</sup> tasks. Tasks must be started lazily (do not call a task function before a slot is free).`,
    example: `<p>tasks take [300, 100, 200, 50] ms, limit 2.<br>t=0 start #0, #1 · t=100 #1 done → start #2 · t=300 #0 done → start #3 · #2 done at 300 · #3 done at 350.<br>Result ${H.c('g', '[r0, r1, r2, r3]')} after ${H.c('g', '~350 ms')} (vs 650 sequential).</p>`,
    brute: { why: `<p><code>Promise.all(tasks.map(t =&gt; t()))</code> starts <b>everything</b> at once (10 000 requests → rate limits, socket exhaustion). Batching in fixed chunks of <code>limit</code> is better but wastes time: each batch waits for its slowest task while free slots sit idle.</p>`, code: `
async function batches(tasks, limit) {
  const out = [];
  for (let i = 0; i < tasks.length; i += limit) {
    out.push(...(await Promise.all(tasks.slice(i, i + limit).map((t) => t())))); // idle slots
  }
  return out;
}
` },
    mcq: { q: 'What is the key difference between a pool and fixed batches?', options: ['A pool refills a slot the moment any task finishes; batches wait for the whole batch', 'A pool runs tasks sequentially', 'Batches preserve order and pools do not', 'There is no difference'], answer: 0, explain: 'Pools keep exactly <code>limit</code> tasks in flight, so total time is close to optimal.' },
    hints: [`<p>Hint 1: think "<code>limit</code> workers pulling from a shared index". Each worker loops: take next index, await the task, store result, repeat.</p>`, `<p>Hint 2: <code>let next = 0</code> shared; a worker does <code>const i = next++</code> — safe because JS is single-threaded between awaits.</p>`, `<p>Hint 3: start <code>Math.min(limit, n)</code> workers and <code>await Promise.all(workers)</code>; set a <code>failed</code> flag so workers stop taking new tasks after an error.</p>`],
    tests: {"sig":"string int[] int -> string","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 300); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(kind, durs, limit) {\n  return __job(async function () {\n    var running = 0, max = 0, order = [], started = [];\n    var mkTasks = function () { return durs.map(function (ms, id) { return function () { started.push(id); running++; max = Math.max(max, running); return new Promise(function (res, rej) { setTimeout(function () { running--; order.push(id); if (ms < 0) rej(new Error('boom' + id)); else res('r' + id); }, Math.abs(ms) * 3); }); }; }); };\n    if (kind === 'many') { var tasks = durs.map(function (_, id) { return function () { running++; max = Math.max(max, running); return Promise.resolve().then(function () { running--; return id; }); }; }); var res = await promisePool(tasks, limit); return [res.length, res[0], res[res.length - 1], max, res.every(function (v, i) { return v === i; })]; }\n    if (kind === 'fail') { try { await promisePool(mkTasks(), limit); return 'resolved'; } catch (e) { return [e.message, started.length]; } }\n    var out = await promisePool(mkTasks(), limit);\n    return [out, max, order, started];\n  });\n}"},"cases":[[["run",[300,100,200,50],2],[["r0","r1","r2","r3"],2,[1,0,2,3],[0,1,2,3]]],[["run",[],3],[[],0,[],[]]],[["run",[20,10],5],[["r0","r1"],2,[1,0],[0,1]]],[["run",[30,10,20],1],[["r0","r1","r2"],1,[0,1,2],[0,1,2]]],[["run",[40],1],[["r0"],1,[0],[0]]],[["fail",[10,-10,10],1],["boom1",2]],[["fail",[-10],3],["boom0",1]],[["fail",[10,-20,30,30],2],["boom1",3]],[["many",{"$rep":0,"n":10000},7],[10000,0,9999,7,true]]]},
    solution: {
      approach: `<p>Worker-loop pattern: <code>limit</code> async workers share a cursor into the task list. Each pulls the next index, runs it, writes <code>results[i]</code>. Promise.all over the workers propagates the first error; a flag prevents new starts after failure.</p>`,
      code: { lang: 'js', run: true, code: `
async function promisePool(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0, failed = false;
  async function worker() {
    while (!failed && next < tasks.length) {
      const i = next++;                         // claim an index (no race: single thread)
      try {
        results[i] = await tasks[i]();
      } catch (e) {
        failed = true;
        throw e;
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

const started = [];
const t0 = Date.now();
const task = (ms, v) => () => { started.push(v + '@' + Math.round((Date.now() - t0) / 50) * 50); return new Promise((r) => setTimeout(() => r(v), ms)); };
promisePool([task(300, 'r0'), task(100, 'r1'), task(200, 'r2'), task(50, 'r3')], 2).then((res) => {
  console.log(res);                             // [ 'r0', 'r1', 'r2', 'r3' ]
  console.log(started);                         // r0@0 r1@0 r2@100 r3@300
  console.log('total ~', Math.round((Date.now() - t0) / 50) * 50, 'ms'); // ~350
});
promisePool([() => Promise.reject(new Error('task failed'))], 3).catch((e) => console.log(e.message));
` },
      dry: { head: ['time', 'event', 'in flight', 'next index'], rows: [['0', 'workers start #0, #1', '#0, #1', '2'], ['100', '#1 done → start #2', '#0, #2', '3'], ['300', '#0 done → start #3; #2 done', '#3', '4'], ['350', '#3 done; workers exit', '—', '4']] },
      complexity: `<p>Total time ≈ optimal greedy schedule; O(n) results memory; O(limit) concurrent promises.</p>`,
      followUps: ['Return allSettled-style results instead of failing fast.', 'Add retries with backoff per task.', 'Make it an async iterator yielding results as they complete.']
    }
  });

  practice.push({
    title: 'Build a minimal Promise (MyPromise) with then-chaining', level: 'Hard', tags: ['promise', 'microtask', 'design'], companies: ['Meta', 'Google', 'Uber', 'Atlassian'],
    statement: `<p>Implement <code>class MyPromise</code> with <code>constructor(executor)</code>, <code>then(onFulfilled, onRejected)</code>, <code>catch</code>, and static <code>resolve</code>/<code>reject</code>. Requirements: settles once; handlers run <b>asynchronously</b> (as microtasks); <code>then</code> returns a new MyPromise resolved with the handler's return value; if a handler returns a promise/thenable, adopt its state; if it throws, reject; missing handlers pass values/errors through.</p>`,
    constraints: `Use <code>queueMicrotask</code> for scheduling. Do not use the native Promise inside the class.`,
    example: `<p><code>new MyPromise(r =&gt; r(1)).then(x =&gt; x + 1).then(x =&gt; { throw x * 10; }).catch(e =&gt; e + 5).then(console.log)</code> → ${H.c('g', '25')}, logged asynchronously (after synchronous code).</p>`,
    brute: { why: `<p>A naive version calls handlers <b>synchronously</b> when the promise is already resolved and stores a single callback. This breaks ordering guarantees (code after <code>then</code> runs later than the handler), supports only one <code>then</code> per promise, and has no chaining.</p>`, code: `
class NaivePromise {
  constructor(ex) { this.cb = null; ex((v) => { this.v = v; if (this.cb) this.cb(v); }); }
  then(cb) { if ('v' in this) cb(this.v); else this.cb = cb; } // sync call, one handler, no chaining
}
` },
    mcq: { q: 'Why must then-handlers run asynchronously even for an already-resolved promise?', options: ['So behaviour is consistent: code after .then() always runs before the handler (no "sometimes sync, sometimes async" bugs)', 'To make promises faster', 'Because queueMicrotask is required by Node', 'They don\'t have to'], answer: 0, explain: 'The spec guarantees asynchronous handler execution, avoiding the "Zalgo" problem of APIs that are sometimes sync.' },
    hints: [`<p>Hint 1: state machine: 'pending' | 'fulfilled' | 'rejected', plus value and a list of pending handler records.</p>`, `<p>Hint 2: <code>then</code> returns <code>new MyPromise((res, rej) =&gt; ...)</code> and registers a record that, when run, calls the handler in try/catch and resolves the child with the result (or rejects).</p>`, `<p>Hint 3: in resolve, if the value is a thenable (object/function with a then method), call <code>value.then(resolve, reject)</code> instead of fulfilling; guard with a "called" flag so it settles once.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 300); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(k) {\n  return __job(async function () {\n    var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };\n    var log = [];\n    if (k === 'chain') { return await new Promise(function (res) { new MyPromise(function (r) { r(1); }).then(function (x) { return x + 1; }).then(function (x) { throw x * 10; }).catch(function (e) { return e + 5; }).then(function (v) { res(v); }); }); }\n    if (k === 'async') { new MyPromise(function (r) { r(1); }).then(function () { log.push('handler'); }); log.push('sync'); await wait(5); return log; }\n    if (k === 'adopt') { return await new Promise(function (res) { new MyPromise(function (r) { setTimeout(function () { r('later'); }, 5); }).then(function (v) { return new MyPromise(function (r) { r(v + '!'); }); }).then(function (v) { res(v); }); }); }\n    if (k === 'rejectCatch') { return await new Promise(function (res) { MyPromise.reject(new Error('x')).then(function (v) { return v; }).catch(function (e) { res('caught ' + e.message); }); }); }\n    if (k === 'passThrough') { return await new Promise(function (res) { new MyPromise(function (r) { r(7); }).then().then(null, null).then(function (v) { res(v); }); }); }\n    if (k === 'passThroughReject') { return await new Promise(function (res) { MyPromise.reject('no').then(function () { return 1; }).then(function () { return 2; }).catch(function (e) { res('got ' + e); }); }); }\n    if (k === 'settleOnce') { return await new Promise(function (res) { new MyPromise(function (resolve, reject) { resolve('first'); resolve('second'); reject('third'); }).then(function (v) { res(v); }); }); }\n    if (k === 'executorThrows') { return await new Promise(function (res) { new MyPromise(function () { throw new Error('exec'); }).catch(function (e) { res(e.message); }); }); }\n    if (k === 'thenable') { return await new Promise(function (res) { new MyPromise(function (r) { r({ then: function (ok) { ok('from thenable'); } }); }).then(function (v) { res(v); }); }); }\n    if (k === 'native') { return await new MyPromise(function (r) { r(1); }).then(function (v) { return v + 1; }); }\n    if (k === 'selfResolve') { return await new Promise(function (res) { var p = new MyPromise(function (r) { setTimeout(function () { r(p); }, 1); }); p.catch(function (e) { res(e.name); }); }); }\n    if (k === 'resolveStatic') { return await new Promise(function (res) { MyPromise.resolve(5).then(function (v) { res(v); }); }); }\n    if (k === 'resolveSame') { var p1 = MyPromise.resolve(1); return MyPromise.resolve(p1) === p1; }\n    if (k === 'order') { var a = new MyPromise(function (r) { r(); }); a.then(function () { log.push(1); }); a.then(function () { log.push(2); }); a.then(function () { log.push(3); }); await wait(5); return log; }\n    if (k === 'handlerThrows') { return await new Promise(function (res) { new MyPromise(function (r) { r(1); }).then(function () { throw new Error('in handler'); }).then(function () { res('wrong'); }, function (e) { res(e.message); }); }); }\n    if (k === 'long') { var p = MyPromise.resolve(0); for (var i = 0; i < 10000; i++) p = p.then(function (v) { return v + 1; }); return await new Promise(function (res) { p.then(function (v) { res(v); }); }); }\n    if (k === 'laterHandler') { var done = MyPromise.resolve('v'); await wait(5); return await new Promise(function (res) { done.then(function (v) { res(v + '!'); }); }); }\n  });\n}"},"cases":[[["chain"],25],[["async"],["sync","handler"]],[["adopt"],"later!"],[["rejectCatch"],"caught x"],[["passThrough"],7],[["passThroughReject"],"got no"],[["settleOnce"],"first"],[["executorThrows"],"exec"],[["thenable"],"from thenable"],[["native"],2],[["selfResolve"],"TypeError"],[["resolveStatic"],5],[["resolveSame"],true],[["order"],[1,2,3]],[["handlerThrows"],"in handler"],[["long"],10000],[["laterHandler"],"v!"]]},
    solution: {
      approach: `<p>Small state machine. <code>then</code> creates a child promise and a "reaction" that runs via <code>queueMicrotask</code> when the parent settles. Resolution procedure: rejects self-resolution, adopts thenables, otherwise fulfills.</p>`,
      code: { lang: 'js', run: true, code: `
class MyPromise {
  #state = 'pending'; #value; #reactions = [];
  constructor(executor) {
    let called = false;
    const resolve = (v) => { if (!called) { called = true; this.#resolveWith(v); } };
    const reject = (e) => { if (!called) { called = true; this.#settle('rejected', e); } };
    try { executor(resolve, reject); } catch (e) { reject(e); }
  }
  #resolveWith(v) {
    if (v === this) return this.#settle('rejected', new TypeError('cannot resolve with itself'));
    if (v !== null && (typeof v === 'object' || typeof v === 'function')) {
      let then;
      try { then = v.then; } catch (e) { return this.#settle('rejected', e); }
      if (typeof then === 'function') {            // adopt the thenable's state
        let done = false;
        try {
          then.call(v, (x) => { if (!done) { done = true; this.#resolveWith(x); } },
                       (e) => { if (!done) { done = true; this.#settle('rejected', e); } });
        } catch (e) { if (!done) { done = true; this.#settle('rejected', e); } }
        return;
      }
    }
    this.#settle('fulfilled', v);
  }
  #settle(state, value) {
    if (this.#state !== 'pending') return;
    this.#state = state; this.#value = value;
    this.#reactions.forEach((r) => queueMicrotask(r));
    this.#reactions = [];
  }
  then(onFul, onRej) {
    return new MyPromise((resolve, reject) => {
      const reaction = () => {
        const handler = this.#state === 'fulfilled' ? onFul : onRej;
        if (typeof handler !== 'function') {        // pass-through
          return this.#state === 'fulfilled' ? resolve(this.#value) : reject(this.#value);
        }
        try { resolve(handler(this.#value)); } catch (e) { reject(e); }
      };
      if (this.#state === 'pending') this.#reactions.push(reaction);
      else queueMicrotask(reaction);
    });
  }
  catch(onRej) { return this.then(undefined, onRej); }
  static resolve(v) { return v instanceof MyPromise ? v : new MyPromise((r) => r(v)); }
  static reject(e) { return new MyPromise((_, r) => r(e)); }
}

new MyPromise((r) => r(1))
  .then((x) => x + 1)
  .then((x) => { throw x * 10; })
  .catch((e) => e + 5)
  .then((v) => console.log('chain ->', v));        // 25
new MyPromise((r) => setTimeout(() => r('later'), 5))
  .then((v) => new MyPromise((r) => r(v + '!')))   // adopt a returned promise
  .then((v) => console.log(v));                    // later!
MyPromise.reject(new Error('x')).then((v) => v).catch((e) => console.log('caught', e.message));
console.log('sync first');                         // printed before every handler
` },
      complexity: `<p>then: O(1); settle: O(h) for h registered handlers. Memory O(h) until settlement.</p>`,
      followUps: ['Add finally, all, race.', 'Pass the Promises/A+ test suite (handles thenable edge cases).', 'Add unhandled-rejection tracking.']
    }
  });

  practice.push({
    title: 'curry with placeholders (lodash-style)', level: 'Hard', tags: ['currying', 'closure', 'functional'], companies: ['Flipkart', 'Atlassian', 'Sprinklr'],
    statement: `<p>Implement <code>curry(fn)</code> with a placeholder <code>curry.placeholder</code> (call it <code>_</code>). Placeholders reserve a position to be filled by later calls. The function runs when the first <code>fn.length</code> positions are filled with real (non-placeholder) values.</p>`,
    constraints: `fn.length ≤ 10. Later arguments first fill earlier placeholders (left to right), then append.`,
    example: `<p><code>const f = curry((a, b, c) =&gt; [a, b, c]); const _ = curry.placeholder;</code><br><code>f(_, 2)(1, 3)</code> → ${H.c('g', '[1, 2, 3]')}; <code>f(_, _, 3)(1)(2)</code> → ${H.c('g', '[1, 2, 3]')}; <code>f(1, _, 3)(_)(2)</code> → ${H.c('g', '[1, 2, 3]')}.</p>`,
    brute: { why: `<p>The plain curry just concatenates arguments; a placeholder object would be counted as a real argument, so <code>f(_, 2)(1)</code> would call fn too early with the placeholder object inside.</p>`, code: `
function plainCurry(fn) {
  return function c(...a) { return a.length >= fn.length ? fn(...a) : (...b) => c(...a, ...b); };
}
` },
    mcq: { q: 'Collected args are <code>[_, 2]</code> and the next call is <code>(1, 3)</code>. What is the merged list?', options: ['<code>[1, 2, 3]</code>', '<code>[_, 2, 1, 3]</code>', '<code>[1, 3, 2]</code>', '<code>[2, 1, 3]</code>'], answer: 0, explain: 'The 1 fills the first placeholder; leftover 3 is appended.' },
    hints: [`<p>Hint 1: keep one args array. A merge step walks it: replace each placeholder with the next new arg if any.</p>`, `<p>Hint 2: after filling placeholders, append the remaining new args.</p>`, `<p>Hint 3: ready when the first fn.length slots exist and none is the placeholder. Otherwise return a function that merges into a <b>copy</b>.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var _ = curry.placeholder;\n  var f = curry(function (a, b, c) { return [a, b, c]; });\n  if (k === 'mid') return f(_, 2)(1, 3);\n  if (k === 'twoHoles') return f(_, _, 3)(1)(2);\n  if (k === 'holeAgain') return f(1, _, 3)(_)(2);\n  if (k === 'plain') return [f(1)(2)(3), f(1, 2, 3), f(1, 2)(3), f(1)(2, 3)];\n  if (k === 'reuse') { var p = f(_, 'b'); return [p('a', 'c'), p('x', 'z')]; }\n  if (k === 'allHoles') return f(_, _, _)(1, 2, 3);\n  if (k === 'lastFirst') return f(_, _, 3)(_, 2)(1);\n  if (k === 'extraArgs') return f(1, 2, 3, 4);\n  if (k === 'this') { var o = { v: 7, g: curry(function (a, b) { return this.v + a + b; }) }; return o.g(_, 1).call(o, 2); }\n  if (k === 'symbol') return typeof curry.placeholder;\n  if (k === 'arity1') return curry(function (a) { return a; })(_)(5);\n  if (k === 'four') { var f4 = curry(function (a, b, c, d) { return [a, b, c, d].join(''); }); return [f4(_, 'b', _, 'd')('a', 'c'), f4('a')(_, 'c')('b')('d')]; }\n  if (k === 'independent') { var q = f(1, _, 3); return [q(2), q(9)]; }\n}"},"cases":[[["mid"],[1,2,3]],[["twoHoles"],[1,2,3]],[["holeAgain"],[1,2,3]],[["plain"],[[1,2,3],[1,2,3],[1,2,3],[1,2,3]]],[["reuse"],[["a","b","c"],["x","b","z"]]],[["allHoles"],[1,2,3]],[["lastFirst"],[1,2,3]],[["extraArgs"],[1,2,3]],[["this"],10],[["symbol"],"symbol"],[["arity1"],5],[["four"],["abcd","abcd"]],[["independent"],[[1,2,3],[1,9,3]]]]},
    solution: {
      approach: `<p>Immutable merge of the stored argument list with each new call (fill holes first, then append), and a readiness check that ignores placeholders.</p>`,
      code: { lang: 'js', run: true, code: `
function curry(fn) {
  const _ = curry.placeholder;
  const arity = fn.length;
  function merge(prev, next) {
    const out = prev.slice();
    let j = 0;
    for (let i = 0; i < out.length && j < next.length; i++) if (out[i] === _) out[i] = next[j++];
    while (j < next.length) out.push(next[j++]);
    return out;
  }
  const ready = (args) => args.length >= arity && args.slice(0, arity).every((x) => x !== _);
  function make(args) {
    return function (...more) {
      const all = merge(args, more);
      return ready(all) ? fn.apply(this, all.slice(0, arity)) : make(all);
    };
  }
  return make([]);
}
curry.placeholder = Symbol('curry placeholder');

const _ = curry.placeholder;
const f = curry((a, b, c) => [a, b, c]);
console.log(f(_, 2)(1, 3));          // [1, 2, 3]
console.log(f(_, _, 3)(1)(2));       // [1, 2, 3]
console.log(f(1, _, 3)(_)(2));       // [1, 2, 3]
console.log(f(1)(2)(3), f(1, 2, 3)); // [1, 2, 3] [1, 2, 3]
` },
      complexity: `<p>O(k) per call for k collected args (k ≤ 10).</p>`,
      followUps: ['Support a custom arity parameter.', 'Implement partialRight.']
    }
  });

  practice.push({
    title: 'takeLatest: race-condition-safe async search', level: 'Hard', tags: ['async', 'debounce', 'abort'], companies: ['Airbnb', 'Swiggy', 'Microsoft', 'Notion'],
    statement: `<p>A search box calls <code>fetchResults(query)</code> on every keystroke. Responses can arrive <b>out of order</b> (a slow response for "re" can arrive after the fast one for "react" and overwrite the UI). Implement <code>takeLatest(asyncFn)</code>: the wrapper passes an <code>AbortSignal</code> to asyncFn, aborts the previous in-flight call when a new one starts, and only the <b>latest</b> call's promise ever fulfills; superseded calls reject with an <code>AbortError</code>.</p>`,
    constraints: `asyncFn(signal, ...args) returns a promise and may or may not respect the signal — results of superseded calls must be ignored either way.`,
    example: `<p>Calls: "re" (takes 50 ms), then "react" (takes 10 ms).<br>Without protection the UI ends showing ${H.c('r', '"re" results')}. With takeLatest: "react" resolves at 10 ms → UI shows ${H.c('g', '"react"')}; "re" ${H.c('r', 'rejects AbortError')}.</p>`,
    brute: { why: `<p>Just debouncing reduces the number of requests but does <b>not</b> fix ordering — two requests can still overlap if the user pauses, types again, and the network is uneven. You need to discard stale responses.</p>`, code: `
let shown = null;
async function naiveSearch(q, fetchResults) {
  shown = await fetchResults(q);   // whichever finishes LAST wins, not the latest query
}
` },
    mcq: { q: 'Besides aborting, what guarantees a stale response is never applied?', options: ['A call id/counter: only apply the result if it belongs to the latest call', 'Sorting the responses by length', 'Using Promise.all', 'Retrying the request'], answer: 0, explain: 'Some APIs ignore abort signals; comparing a monotonically increasing call id is a cheap, reliable guard.' },
    hints: [`<p>Hint 1: keep <code>controller</code> (current AbortController) and <code>latestId</code> in a closure.</p>`, `<p>Hint 2: on each call: abort the previous controller, create a new one, increment id, call asyncFn(signal, ...args).</p>`, `<p>Hint 3: after await: if id !== latestId, throw a DOMException-like AbortError; else return the result. Combine with debounce for fewer requests.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 300); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(k) {\n  return __job(async function () {\n    var delay = function (ms, v) { return new Promise(function (r) { setTimeout(function () { r(v); }, ms); }); };\n    var settle = function (p) { return p.then(function (v) { return ['ok', v]; }, function (e) { return ['err', e.name]; }); };\n    var signals = [];\n    var api = function (signal, q, ms) { signals.push(signal); return delay(ms, q + ' results'); };\n    var search = takeLatest(api);\n    if (k === 'example') { var a = settle(search('re', 50)), b = settle(search('react', 10)); return [await a, await b]; }\n    if (k === 'single') return settle(search('solo', 5));\n    if (k === 'fastFirst') { var f = settle(search('first', 10)), s = settle(search('second', 40)); return [await f, await s]; }\n    if (k === 'three') { var r1 = settle(search('a', 30)), r2 = settle(search('b', 20)), r3 = settle(search('c', 10)); return [await r1, await r2, await r3]; }\n    if (k === 'signals') { settle(search('a', 5)); settle(search('b', 5)); settle(search('c', 5)); await delay(20); return signals.map(function (s) { return s.aborted; }); }\n    if (k === 'sequential') { var x = await settle(search('one', 5)); var y = await settle(search('two', 5)); return [x, y]; }\n    if (k === 'latestRejects') { var bad = takeLatest(function () { return Promise.reject(new Error('server')); }); try { await bad(); return 'resolved'; } catch (e) { return e.message; } }\n    if (k === 'errorName') { try { var p1 = search('a', 30); settle(search('b', 5)); await p1; return 'resolved'; } catch (e) { return [e.name, e instanceof Error]; } }\n    if (k === 'argsPassed') { var seen = []; var t = takeLatest(function (signal, a1, b1) { seen.push([typeof signal.aborted, a1, b1]); return Promise.resolve(a1 + b1); }); var v = await t(2, 3); return [v, seen]; }\n    if (k === 'many') { var ps = []; for (var i = 0; i < 1000; i++) ps.push(settle(search('q' + i, 1 + (i % 5)))); var all = await Promise.all(ps); return [all.filter(function (z) { return z[0] === 'ok'; }).length, all[999]]; }\n    if (k === 'laterWins') { var ps2 = [settle(search('slowOld', 40)), settle(search('fastNew', 5))]; var res = await Promise.all(ps2); return res; }\n  });\n}"},"cases":[[["example"],[["err","AbortError"],["ok","react results"]]],[["single"],["ok","solo results"]],[["fastFirst"],[["err","AbortError"],["ok","second results"]]],[["three"],[["err","AbortError"],["err","AbortError"],["ok","c results"]]],[["signals"],[true,true,false]],[["sequential"],[["ok","one results"],["ok","two results"]]],[["latestRejects"],"server"],[["errorName"],["AbortError",true]],[["argsPassed"],[5,[["boolean",2,3]]]],[["many"],[1,["ok","q999 results"]]],[["laterWins"],[["err","AbortError"],["ok","fastNew results"]]]]},
    solution: {
      approach: `<p>"Switch to latest" (like RxJS <code>switchMap</code> / redux-saga <code>takeLatest</code>): abort the previous request for efficiency, and use a monotonically increasing id for correctness.</p>`,
      code: { lang: 'js', run: true, code: `
function takeLatest(asyncFn) {
  let controller = null, latestId = 0;
  return async function (...args) {
    if (controller) controller.abort();           // cancel previous in-flight work
    controller = new AbortController();
    const id = ++latestId;
    const result = await asyncFn(controller.signal, ...args);
    if (id !== latestId) {                        // a newer call started meanwhile
      const err = new Error('superseded'); err.name = 'AbortError';
      throw err;
    }
    return result;
  };
}

// fake API that IGNORES the signal and has uneven latency
const latency = { re: 50, react: 10 };
const fetchResults = (signal, q) => new Promise((r) => setTimeout(() => r(q + ' results'), latency[q]));

let ui = '(empty)';
const search = takeLatest(fetchResults);
search('re').then((r) => { ui = r; }).catch((e) => console.log('re ->', e.name));
search('react').then((r) => { ui = r; });
setTimeout(() => console.log('UI shows:', ui), 80); // UI shows: react results
` },
      complexity: `<p>O(1) bookkeeping per call; at most one request matters at a time.</p>`,
      followUps: ['Add debounce in front and a cache of recent queries.', 'Implement takeEvery and takeLeading (ignore new calls while one is running).']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push(
    { q: 'What does this print? <code>console.log(1); setTimeout(() =&gt; console.log(2)); Promise.resolve().then(() =&gt; console.log(3)); console.log(4);</code>', options: ['1 4 3 2', '1 2 3 4', '1 4 2 3', '1 3 4 2'], answer: 0, explain: 'Synchronous lines first (1, 4), then the microtask (3), then the macrotask timer (2).' },
    { q: 'In a <code>myCall</code> polyfill, why attach the function under a <code>Symbol</code> key instead of <code>ctx.fn</code>?', options: ['A Symbol can never clash with (and overwrite) an existing property of ctx', 'Symbols make the call faster', 'Strings cannot hold functions', 'Symbols bind this automatically'], answer: 0, explain: 'If ctx already had a property called fn it would be overwritten and then deleted. A fresh Symbol is guaranteed unique.' },
    { q: '<code>const B = Point.bind({ x: 1 }); const p = new B();</code> — what is <code>this</code> inside Point?', options: ['A brand-new object (new overrides the bound this)', '<code>{ x: 1 }</code>', '<code>undefined</code>', 'globalThis'], answer: 0, explain: 'new binding has the highest priority; a bound function used as a constructor ignores its bound this.' },
    { q: 'What does <code>[1, 2, 3].reduce((a, x) =&gt; a + x, undefined)</code> return?', options: ['NaN', '6', 'TypeError', 'undefined'], answer: 0, explain: 'undefined is a real initial value: undefined + 1 = NaN, and NaN stays NaN. Only omitting the argument makes reduce start from the first element.' },
    { q: 'Promise.all receives three promises; the one at index 2 rejects first at 10 ms, the others fulfill at 50 ms. What happens?', options: ['The result rejects at ~10 ms; the other two still run to completion but their results are ignored', 'It waits 50 ms and then rejects', 'It fulfills with two values and one error', 'It cancels the other two promises'], answer: 0, explain: 'all is fail-fast. Promises cannot be cancelled, so the other operations continue (use AbortController to stop real work).' },
    { q: 'Which combinator should a dashboard use to show every widget that loaded, even if some APIs fail?', options: ['Promise.allSettled', 'Promise.all', 'Promise.race', 'Promise.any'], answer: 0, explain: 'allSettled never rejects and reports status per input, so partial success can be rendered.' },
    { q: 'A search box should call the API only after the user stops typing for 300 ms. Which tool?', options: ['debounce(fn, 300)', 'throttle(fn, 300)', 'setInterval(fn, 300)', 'requestAnimationFrame'], answer: 0, explain: 'Debounce waits for a quiet period; throttle would fire every 300 ms during typing.' },
    { q: 'What is the main bug in a debounce whose wrapper is an arrow function: <code>return (...a) =&gt; { clearTimeout(t); t = setTimeout(() =&gt; fn.apply(this, a), w); }</code>?', options: ['<code>this</code> is taken from where debounce was defined, not from the object the debounced method is called on', 'clearTimeout cannot take undefined', 'Rest parameters are not allowed in arrows', 'Nothing — it is correct'], answer: 0, explain: 'Arrow functions have lexical this. Use a regular function wrapper so obj.debounced() passes obj as this.' },
    { q: '<code>JSON.parse(JSON.stringify({ d: new Date(0), u: undefined, n: NaN }))</code> gives…', options: ['<code>{ d: "1970-01-01T00:00:00.000Z", n: null }</code>', 'An exact copy', '<code>{ d: Date, u: undefined, n: NaN }</code>', 'A TypeError'], answer: 0, explain: 'Dates become ISO strings, undefined-valued keys are dropped, NaN becomes null.' },
    { q: 'In a deepClone with a WeakMap <code>seen</code>, what happens if you call <code>seen.set(original, copy)</code> AFTER copying the children?', options: ['Cyclic objects recurse forever (stack overflow)', 'Shared references are preserved', 'Nothing changes', 'Dates are lost'], answer: 0, explain: 'A child pointing back to the parent is not found in seen yet, so recursion re-enters the parent endlessly.' },
    { q: 'With <code>const c = curry((a, b, c) =&gt; a + b + c)</code>, what is <code>c(1)(2)</code>?', options: ['A function waiting for one more argument', '3', 'NaN', 'TypeError'], answer: 0, explain: 'Only 2 of fn.length = 3 arguments have arrived, so curry returns another function.' },
    { q: 'Inside <code>emit</code>, a listener removes itself with <code>off</code>. Why should emit iterate over <code>[...listeners]</code>?', options: ['Removing during iteration shifts the live array and the next listener would be skipped', 'Spread is faster than a for loop', 'To deduplicate listeners', 'To call listeners in reverse order'], answer: 0, explain: 'A snapshot makes the set of listeners called by one emit fixed at the moment emit started.' },
    { q: 'Exponential backoff with base 100 ms and cap 1000 ms: what is the cap for the 5th retry (attempt index 4)?', options: ['1000 ms (100 × 2⁴ = 1600, capped)', '1600 ms', '500 ms', '400 ms'], answer: 0, explain: 'min(1000, 100 × 16) = 1000. With full jitter the actual wait is random in [0, 1000].' },
    { q: 'Which retry policy is correct for an HTTP 404 from a GET request?', options: ['Do not retry; fail immediately', 'Retry with backoff up to 5 times', 'Retry immediately once', 'Retry forever until it succeeds'], answer: 0, explain: '404 is a permanent client-side condition; retrying wastes time and load. Retry 408/429/5xx and network errors.' },
    { q: 'In a Map-based LRU, how do you find the least recently used key in O(1)?', options: ['<code>map.keys().next().value</code> (first key in insertion order)', 'Sort the keys by a timestamp', '<code>[...map.keys()].pop()</code>', 'Maps have no order, so you cannot'], answer: 0, explain: 'Map iterates in insertion order; touching a key re-inserts it at the end, so the first key is the least recently used.' },
    { q: 'What does <code>[\'1\', \'2\', \'3\'].map(parseInt)</code> return?', options: ['[1, NaN, NaN]', '[1, 2, 3]', '[NaN, NaN, NaN]', '["1", "2", "3"]'], answer: 0, explain: 'map passes (value, index): parseInt("1", 0) → 1 (radix 0 means auto), parseInt("2", 1) → NaN (invalid radix), parseInt("3", 2) → NaN (3 is not a binary digit).' },
    { q: 'Output? <code>for (var i = 0; i &lt; 3; i++) setTimeout(() =&gt; console.log(i));</code>', options: ['3 3 3', '0 1 2', '2 2 2', 'undefined ×3'], answer: 0, explain: 'var creates one function-scoped binding; all callbacks read it after the loop finished, when i is 3.' },
    { q: 'What is <code>[] + {}</code> in JavaScript?', options: ['"[object Object]"', '0', '"{}"', 'NaN'], answer: 0, explain: '[] becomes "" and {} becomes "[object Object]"; with a string involved, + concatenates.' }
  );

  /* ================= INTERVIEW ================= */
  interview.push(
    { q: 'How do you approach a 60–90 minute machine-coding round (e.g. "build a debounced autocomplete" or "implement Promise.all + an event emitter")?', level: 'B', a: `<p><b>1. Clarify (5 min):</b> inputs/outputs, edge cases, which browser APIs are allowed, whether tests are expected. Restate the requirements in your own words. <b>2. Plan (5 min):</b> list the functions/classes and their state; sketch the data structures (Map of listeners, results array + counter, timer id…). <b>3. Build the happy path first</b> and make it run end to end, then <b>4. layer edge cases</b> (empty input, errors, this-binding, cleanup/cancel). <b>5. Test out loud</b> with small cases, including one failure case. Keep code readable: small helpers, good names, comments for non-obvious choices. Finally, <b>6. mention trade-offs and extensions</b> you would add with more time (concurrency limits, cancellation, accessibility, performance). Interviewers grade working code + communication + edge-case awareness more than cleverness.</p>`, followUps: ['How do you recover if you realise your design is wrong halfway?', 'How much time do you spend on tests?'] },
    { q: 'Explain how your <code>Function.prototype.myCall</code> polyfill works and where it differs from the native call.', level: 'I', a: `<p>It uses the implicit-binding rule: a function called as <code>obj.method()</code> gets <code>this === obj</code>. So we temporarily store the function on the context under a unique <b>Symbol</b> key, call it as a method with the spread arguments, and delete the key in a <code>finally</code> block. <code>null</code>/<code>undefined</code> contexts become <code>globalThis</code>; primitives are boxed with <code>Object(ctx)</code>. Differences from native: strict-mode functions natively receive primitives/null as-is (we box or substitute); frozen or non-extensible objects reject the temporary property; Proxies can observe the set/delete; and the property juggling changes hidden classes (slower). A robust version falls back to <code>Reflect.apply</code>, which is the native mechanism.</p>`, followUps: ['Implement apply in terms of your call.', 'Why use finally?', 'How would you do this in ES5 without Symbol or spread?'] },
    { q: 'Walk me through a correct Promise.all polyfill and its edge cases.', level: 'I', a: `<p>Return a new promise. Convert the iterable with <code>Array.from</code>, create <code>results = new Array(n)</code> and <code>remaining = n</code>. If n is 0, resolve <code>[]</code> immediately. For each item i, wrap with <code>Promise.resolve(item)</code> (so plain values and thenables work), and on fulfillment write <code>results[i]</code> (input order, not push) and decrement; when remaining hits 0 resolve with results. Pass the outer <code>reject</code> as the rejection handler — the first rejection wins, later settlements are no-ops because a promise settles once. Edge cases: empty input, non-promises, order, not using <code>results.length</code> as the counter, and that "fail-fast" does not cancel other work (use AbortController). The spec additionally guards each element's resolve with an alreadyCalled flag against hostile thenables.</p>`, followUps: ['Now implement allSettled and any.', 'Add a concurrency limit.', 'What happens to unhandled rejections from the other promises?'] },
    { q: 'Debounce vs throttle: explain the difference with a timeline, and when you would use each.', level: 'B', a: `<p>Both rate-limit a function. <b>Debounce</b> delays the call until events stop for <code>wait</code> ms — each event resets a timer, so a continuous stream never fires until it pauses. Use for search-as-you-type, autosave, resize-end, validation. <b>Throttle</b> guarantees at most one call per <code>wait</code> ms while events continue, typically with a leading call immediately and a trailing call with the latest args. Use for scroll/drag/mousemove handlers, progress reporting, analytics pings. Timeline with wait 100 and events at 0, 30, 60: debounce runs once at 160; throttle runs at 0 and at 100 (trailing, args from 60). For visual updates, a requestAnimationFrame throttle is often better; for "is element visible" checks, IntersectionObserver beats throttled scroll handlers.</p>`, followUps: ['Implement throttle using debounce with maxWait.', 'How do you test these without real waiting?', 'What goes wrong if you create the debounced function inside a React render?'] },
    { q: 'How do you deep-clone an object in JavaScript today, and when would you write your own?', level: 'I', a: `<p>Default: <code>structuredClone(value)</code> — built into browsers and Node 17+, handles cycles, Date, Map, Set, RegExp, typed arrays, Blobs. Limits: throws on functions and DOM nodes, and class instances come back as plain objects (prototype lost), getters are evaluated into values. <code>JSON.parse(JSON.stringify(x))</code> is only OK for plain JSON data — it turns Dates into strings, drops undefined/functions/symbols, converts NaN/Infinity to null and throws on cycles/BigInt. I write my own (or use lodash <code>cloneDeep</code>) when I need to preserve prototypes/class instances, copy symbol keys or property descriptors, customise behaviour (skip certain keys), or clone huge/deep structures iteratively. The core of my own: primitives returned as-is, a WeakMap of original → clone registered before recursing (cycles + shared refs), and type branches.</p>`, followUps: ['How would you make it iterative?', 'Why can\'t functions be cloned by structuredClone?', 'How do immutable updates avoid deep cloning in React?'] },
    { q: 'Design a deepEqual. What are the tricky cases?', level: 'A', a: `<p>Start with <code>Object.is(a, b)</code> (handles same reference and NaN; decide whether +0/-0 should be equal — most data libraries say yes). If either is not an object (or is null) → false. Check same "kind": arrays vs plain objects, same prototype, and special types: Date by <code>getTime()</code>, RegExp by source+flags, Map/Set by size and entries (Set with object members is O(n²) unless you canonicalise), typed arrays by bytes. Then compare own key counts and recurse key by key (order-independent, which is why JSON-string comparison is wrong). For cycles, keep a memo of pairs being compared (a → set of b's) and assume true if the pair is already in progress. Also consider sparse arrays (holes vs undefined), symbol keys, and non-enumerable props. For performance, short-circuit on first difference and prefer immutability so most comparisons are reference checks.</p>`, followUps: ['Why does React use shallow comparison?', 'How would you produce a diff instead of a boolean?'] },
    { q: 'What is currying, how is it different from partial application, and where is it actually useful?', level: 'I', a: `<p><b>Currying</b> transforms f(a, b, c) into f(a)(b)(c): a chain of unary functions. <b>Partial application</b> fixes some arguments now and returns a function of the rest (<code>fn.bind(null, a)</code> does this). The common JS <code>curry</code> helper is really "auto-partial": it collects arguments across calls in any grouping until <code>fn.length</code> are available, then calls fn. Implementation: closure + immutable concatenation <code>[...args, ...more]</code> so partials are reusable. Useful for building specialised functions from general ones (loggers with a fixed level, validators with fixed bounds), for point-free pipelines with pipe/compose, and in FP libraries (Ramda). Pitfalls: <code>fn.length</code> ignores defaults and rest parameters, readability suffers when overused, and each partial allocates closures.</p>`, followUps: ['Implement placeholders.', 'Explain sum(1)(2)(3)() and the valueOf trick.'] },
    { q: 'Design an EventEmitter. Which edge cases would you test?', level: 'I', a: `<p>State: <code>Map&lt;eventName, listener[]&gt;</code>. <code>on</code> pushes and returns an unsubscribe closure; <code>off</code> finds the index (guarding −1, because <code>splice(-1, 1)</code> removes the last item!) and splices; <code>once</code> wraps the listener in a function that removes itself <b>before</b> calling it, tagging <code>wrapper.original = fn</code> so <code>off(name, fn)</code> works; <code>emit</code> iterates a <b>snapshot</b> copy so listeners added/removed during emit do not affect it, and returns whether anyone listened. Tests: order of calls, same function subscribed twice, off of an unknown function, once + re-entrant emit, removal during emit, errors thrown by a listener (propagate like Node or isolate with try/catch), the special 'error' event, memory (delete empty lists, unsubscribe on teardown), and emit with multiple args.</p>`, followUps: ['Make emit async-aware.', 'Add wildcard listeners.', 'How does the browser EventTarget differ?'] },
    { q: 'Implement a retry helper. How do you choose what to retry and how long to wait?', level: 'A', a: `<p>An async loop: try <code>await fn()</code>; on failure, if attempts are exhausted or the error is not retryable, rethrow the last error; otherwise wait <code>random(0, min(maxDelay, base × 2^attempt))</code> (exponential backoff with full jitter) and loop. Retryable: network errors, 408, 429, 500/502/503/504; not retryable: other 4xx, auth failures, validation errors, user aborts. Honour <code>Retry-After</code>. Accept an AbortSignal and an overall deadline so the loop stops when the user leaves or time runs out. Safety: only retry idempotent operations, or use idempotency keys for writes like payments. At system level avoid retry amplification (retry at one layer, retry budgets) and add a circuit breaker when the dependency is hard down. Make sleep and random injectable for deterministic tests.</p>`, followUps: ['Why does jitter matter?', 'What is retry amplification?', 'How do LLM SDKs handle 429s?'] },
    { q: 'Implement an LRU cache in JavaScript. Why does the Map trick work, and why might an interviewer ask for a linked list anyway?', level: 'I', a: `<p>JS <code>Map</code> preserves insertion order by spec. <code>get</code>: if present, delete and re-set the key (moves it to the newest end) and return the value. <code>put</code>: delete if present, set, and if <code>size &gt; capacity</code> delete <code>map.keys().next().value</code> — the oldest key. All O(1) average (V8's ordered hash table makes the first-key lookup cheap, with occasional compaction). Interviewers ask for the <b>HashMap + doubly linked list</b> version to see the real data structure: nodes with prev/next in recency order, sentinel head/tail to avoid null checks, and the map from key to node; eviction removes <code>tail.prev</code> and deletes its key from the map. That design generalises to LFU, TTL, byte-size limits and to languages without ordered maps.</p>`, followUps: ['Add TTL.', 'How would you build LFU in O(1)?', 'How does Redis approximate LRU?'] },
    { q: 'Explain the event loop and predict: <code>async function f(){ console.log(1); await null; console.log(2); } f(); Promise.resolve().then(() =&gt; console.log(3)); console.log(4);</code>', level: 'I', a: `<p>Output: <b>1 4 2 3</b>. Calling f runs its body synchronously until <code>await</code>: logs 1. <code>await null</code> pauses f and queues its continuation as a microtask. Next line queues the <code>.then</code> callback as a microtask (after f's continuation). Then 4 is logged synchronously. The script (a macrotask) ends; the event loop drains microtasks in FIFO order: f resumes and logs 2, then the then-callback logs 3. General model: run the current macrotask to completion → drain all microtasks (including those added while draining) → (browser) maybe render → next macrotask (timers, I/O, events). In Node, <code>process.nextTick</code> runs before promise microtasks, and timers/I/O/setImmediate run in libuv phases.</p>`, followUps: ['Where would setTimeout(() =&gt; log(5)) appear?', 'Why did this ordering differ in 2018?', 'What does queueMicrotask do?'] },
    { q: 'Why is <code>[] == ![]</code> true, and how do you avoid coercion bugs?', level: 'B', a: `<p><code>![]</code> is <code>false</code> because every object (including an empty array) is truthy. Now <code>[] == false</code>: when one side is a boolean, it is converted to a number → <code>[] == 0</code>. When one side is an object and the other a number, the object is converted to a primitive (valueOf returns the array itself, so toString → "") → <code>"" == 0</code> → string to number → <code>0 == 0</code> → true. Avoid it by using <code>===</code> everywhere (lint rule <code>eqeqeq</code>), converting explicitly (<code>Number(x)</code>, <code>String(x)</code>), using <code>Number.isNaN</code> instead of <code>isNaN</code>, TypeScript to catch mixed-type comparisons, and the one accepted idiom <code>x == null</code> to test for null or undefined.</p>`, followUps: ['What is ToPrimitive?', 'Why is null &gt;= 0 true but null == 0 false?'] },
    { q: 'You need to fire 5 000 API calls. How do you do it efficiently and safely in JavaScript?', level: 'A', a: `<p>Never <code>Promise.all(urls.map(fetch))</code> — that opens thousands of requests at once and gets rate-limited or exhausts sockets/memory. Use a <b>promise pool</b> with a concurrency limit (e.g. 10–50, tuned to the API's limits): N async workers share a cursor and each pulls the next task as soon as it finishes, writing results by index. Add per-task retry with exponential backoff + jitter for retryable errors and honour 429 Retry-After; consider a global token-bucket rate limiter if the API enforces requests per second. Decide failure semantics (fail-fast vs allSettled-style report). Support cancellation with an AbortController shared by all tasks. Stream results (async iterator) if the consumer can process incrementally, and log progress. Server side, batch endpoints or bulk APIs beat 5 000 small calls.</p>`, followUps: ['Write the pool.', 'How do you pick the limit?', 'How would you resume after a crash?'] },
    { q: 'How has AI changed polyfill and machine-coding interviews, and how do you use AI tools responsibly while preparing?', level: 'E', a: `<p>Because assistants can generate standard polyfills instantly, interviews moved from "can you type Promise.all" to <b>reasoning</b>: spec edge cases (holes in map, reduce with undefined, bind with new), live extensions (concurrency limit, cancel/flush, placeholders), timing models (event loop, fake timers), and code review of plausible-but-wrong AI output. Some companies allow AI in the round and grade how you prompt, verify, and fix. I prepare by writing each utility by hand first, then asking AI for adversarial test cases and differential tests against native implementations, and by reviewing AI solutions for classic bugs (results.push in all, live-array iteration in emit, seen.set after recursion, arrow wrappers losing this). The skill that matters is the mental model plus verification — run it, test it, explain it.</p>`, followUps: ['Show a bug you have seen AI produce in a debounce.', 'How would you test an AI-written LRU quickly?'] },
    { q: 'What are the most common memory leaks in utilities like debounce, event emitters and caches, and how do you prevent them?', level: 'E', a: `<p><b>Event emitters:</b> long-lived emitters (global bus, sockets, window) hold strong references to listeners and everything their closures capture; forgetting <code>off</code> on component unmount leaks whole component trees. Prevent with returned disposers, <code>{ signal }</code> + AbortController for addEventListener, and cleanup in useEffect. <b>Debounce/throttle:</b> pending timers retain args and <code>this</code>; cancel them on teardown and create the debounced function once (useMemo/useRef). <b>Caches/memoize:</b> unbounded Maps grow forever — bound with LRU/TTL, or use WeakMap when keys are objects whose lifetime should control the entry. <b>Promises:</b> never-settling promises keep their reaction closures alive (e.g. race against an empty array). Diagnose with heap snapshots (retainers view), comparing snapshots before/after an action, and Node's <code>--inspect</code>.</p>`, followUps: ['WeakMap vs WeakRef for caches?', 'How do you find a detached DOM node leak?'] }
  );

  /* every visualizer returns at least 4 frames, even for very short custom inputs */
  topics.forEach(function (t) {
    [].concat(t.viz || []).forEach(function (v) {
      var gen = v.gen;
      v.gen = function (inp) {
        var frames = gen(inp);
        var tips = ['That is the whole run for this input. Try a longer or trickier input to see more steps.', 'Tip: change one value in the input and predict the result before you press play.', 'Interview habit: narrate each step out loud, exactly like these frames do.'];
        var k = 0;
        while (frames.length && frames.length < 4) {
          frames.push({ narr: tips[k++ % tips.length], parts: frames[frames.length - 1].parts });
        }
        return frames;
      };
    });
  });

  registerModule({
    id: 'js14',
    title: 'Machine Coding & Polyfills + Output Question Bank',
    intro: `<p>This is the module for the round that decides many frontend and full-stack offers: the <b>machine-coding / JavaScript fundamentals round</b>. You will be asked to rebuild pieces of the language and its ecosystem from scratch — <code>bind</code>, <code>call</code>, <code>apply</code>, <code>map</code>, <code>filter</code>, <code>reduce</code>, <code>Promise.all</code>/<code>race</code>/<code>allSettled</code>/<code>any</code> — and everyday utilities: <b>debounce</b>, <b>throttle</b>, <b>deep clone</b>, <b>deep equal</b>, <b>curry</b>, <b>flatten</b>, an <b>event emitter</b>, <b>retry with backoff</b> and an <b>LRU cache</b>. Then you will face the famous <b>"what does this print?"</b> questions.</p>
<p>Every topic starts with a real-world analogy, builds the polyfill line by line, shows a step-by-step visualizer (watch <code>this</code> get attached, a reduce accumulator grow, promises settle on a timeline, timers reset, listeners fire, LRU nodes move), and finishes with the spec-level edge cases interviewers love, plus how AI changes the game. All the pure-JS code is runnable — <b>predict first, then press ▶ Run</b>.</p>`,
    goals: [
      'Write spec-faithful polyfills for call, apply, bind (including <code>new</code>), map, filter and reduce (holes, thisArg, missing initial value) and explain every edge case',
      'Implement Promise.all, race, allSettled and any from scratch, plus timeouts and a concurrency-limited promise pool',
      'Build debounce (leading, cancel, flush) and throttle (leading + trailing) and choose the right one from a product requirement',
      'Write deepClone (cycles, shared references, Date/Map/Set) and deepEqual (NaN, key order, cycles), and know when structuredClone is enough',
      'Implement curry (including infinite sum and placeholders), array/object flatten, an EventEmitter, retry with exponential backoff + jitter, and an O(1) LRU cache',
      'Predict the output of tricky snippets about the event loop, async/await, hoisting/TDZ, closures, this and coercion using a repeatable 4-step method'
    ],
    prereqs: `JS 4 (Scope, Hoisting, TDZ &amp; Closures), JS 5 (this, call/apply/bind), JS 7–8 (Promises, Event Loop &amp; async/await) and JS 13 (Functional Programming &amp; Patterns). Comfort with Maps, classes and array methods from JS 2 and JS 9. DSA linked lists and hash maps help for the LRU cache.`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
