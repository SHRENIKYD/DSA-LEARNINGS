(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (js13) ---------- */
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
  function nums(s, max) {
    var a = String(s).trim().split(/[\s,]+/).filter(function (x) { return x.length; }).map(Number);
    if (!a.length || a.some(isNaN)) throw new Error('Enter numbers separated by spaces, e.g. 3 5 3');
    if (a.length > max) throw new Error('Use at most ' + max + ' numbers');
    return a;
  }

  /* ================= TOPIC 1: Pure functions ================= */
  topics.push({
    title: 'Pure Functions & Side Effects',
    analogy: `<p>A <b>pocket calculator</b> is pure: type <code>2 + 3</code> and you get <code>5</code> today, tomorrow and on the moon. It does not phone anybody, it does not change your bank balance, and it does not care what time it is.</p>
<p>Now picture a <b>moody barista</b>. Ask for "one coffee" and the price depends on the time of day, how many cups were sold before you, and while making it they also scribble in <i>your</i> notebook. Same order, different results, plus surprise changes to your stuff. That barista is an <b>impure</b> function.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A function is <b>pure</b> when it follows two rules:</p>
<ol>
<li><b>Same input → same output, every time.</b> The result depends <i>only</i> on its arguments. No peeking at global variables, the clock or random numbers.</li>
<li><b>No side effects.</b> It changes nothing outside itself: no editing its arguments, no editing globals, no printing, no network calls, no DOM changes, no writing to storage.</li>
</ol>
<p>Anything a function does to the outside world, beyond returning a value, is a <b>side effect</b>. Anything it secretly reads from the outside world is a <b>hidden input</b>.</p>
${H.table(['Function', 'Pure?', 'Why'], [
  ['<code>(a, b) =&gt; a + b</code>', H.c('g', 'Yes'), 'only uses its arguments'],
  ['<code>(arr) =&gt; arr.map(x =&gt; x * 2)</code>', H.c('g', 'Yes'), 'builds a <i>new</i> array, old one untouched'],
  ['<code>(arr) =&gt; arr.sort()</code>', H.c('r', 'No'), '<code>sort</code> changes the caller\'s array in place'],
  ['<code>() =&gt; Date.now()</code>', H.c('r', 'No'), 'hidden input: the clock'],
  ['<code>(x) =&gt; { total += x; }</code>', H.c('r', 'No'), 'changes a global'],
  ['<code>(msg) =&gt; console.log(msg)</code>', H.c('r', 'No'), 'I/O is a side effect'],
  ['<code>(cfg) =&gt; ({ ...cfg, debug: true })</code>', H.c('g', 'Yes'), 'returns a fresh copy']
])}
<p>🔵 <b>Why should you care?</b> Pure functions are:</p>
<ul>
<li><b>Easy to test</b> — no mocks, no setup: <code>expect(add(2, 3)).toBe(5)</code>.</li>
<li><b>Safe to cache</b> (memoize) — same input always gives same output, so you can remember answers.</li>
<li><b>Easy to reason about</b> — you can replace a call with its result (this is called <b>referential transparency</b>): <code>add(2, 3)</code> can be swapped for <code>5</code> anywhere.</li>
<li><b>Required by frameworks</b> — React render functions and Redux reducers must be pure, or you get weird bugs.</li>
</ul>
<p>Real apps <i>need</i> side effects (saving data, showing UI). The trick is the <b>"functional core, imperative shell"</b> pattern: keep the <i>decision-making</i> logic pure, and push the side effects (I/O, clock, random, DOM) to a thin outer layer that calls the pure core.</p>
<p>🔑 <b>Hidden inputs fix:</b> pass them in as arguments. Instead of reading <code>Date.now()</code> inside, accept <code>now</code> as a parameter. That one move makes the function pure and testable.</p>`,
    clues: ['"Is this function pure? What are its side effects?" → check hidden inputs + outside changes', '"Make this testable without mocking time / random" → inject <code>now</code> / <code>rng</code> as parameters', '"Reducer must not mutate state" / "React render must be pure" → purity requirement', '"Same input gives different output in tests (flaky)" → hidden input (clock, random, global)', '"Can we safely cache / memoize this?" → only if pure', '"Functional core, imperative shell" / "separate logic from I/O" → move effects to the edges'],
    code: [{ lang: 'js', run: true, title: 'Impure vs pure: the same idea written two ways', code: `
// ---------- IMPURE version ----------
let cart = [{ name: 'pen', price: 10, qty: 2 }, { name: 'book', price: 50, qty: 1 }];
let TAX = 0.1; // global the function secretly reads

function addItemImpure(item) {
  cart.push(item);                 // side effect: mutates global array
  let sub = 0;
  for (const i of cart) sub += i.price * i.qty;
  return sub * (1 + TAX);          // hidden input: global TAX
}

console.log('impure #1:', addItemImpure({ name: 'cap', price: 5, qty: 1 }));
console.log('impure #2:', addItemImpure({ name: 'cap', price: 5, qty: 1 })); // same call, different answer!
console.log('cart length is now', cart.length); // the outside world changed

// ---------- PURE version ----------
// Everything it needs comes in as arguments; it returns NEW data.
function addItem(items, item) {
  return [...items, item];        // new array, the old one is untouched
}
function totalWithTax(items, taxRate) {
  const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
  return Math.round(sub * (1 + taxRate) * 100) / 100;
}

const base = [{ name: 'pen', price: 10, qty: 2 }, { name: 'book', price: 50, qty: 1 }];
const next = addItem(base, { name: 'cap', price: 5, qty: 1 });
console.log('pure #1:', totalWithTax(next, 0.1));
console.log('pure #2:', totalWithTax(next, 0.1)); // always the same
console.log('base still has', base.length, 'items');
` }, { lang: 'js', run: true, title: 'Removing hidden inputs: inject the clock and the random generator', code: `
// Impure: reads the real clock and Math.random -> impossible to test exactly
function makeIdImpure() {
  return 'id-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}
console.log('impure id (changes every run):', makeIdImpure());

// Pure: the "outside world" is passed in
function makeId(now, rand) {
  return 'id-' + now + '-' + Math.floor(rand * 1000);
}
console.log('pure id:', makeId(1700000000000, 0.42)); // always id-1700000000000-420

// The imperative SHELL supplies real values; the CORE stays pure
function shell() {
  return makeId(Date.now(), Math.random());
}
console.log('shell id:', shell());

// A tiny seeded RNG (mulberry32) makes "random" deterministic for tests
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rngA = mulberry32(7), rngB = mulberry32(7);
console.log('same seed, same sequence:', rngA().toFixed(4), rngB().toFixed(4));
` }],
    codeTitle: ['Impure vs pure cart (runnable)', 'Injecting clock + randomness (runnable)'],
    viz: [{
      title: 'Purity test: call both functions with the same inputs',
      input: '3 5 3 3',
      inputLabel: 'Arguments to pass, in order (max 8 numbers)',
      gen: function (input) {
        var args = nums(input, 8);
        var frames = [], rows = [], counter = 0, seenPure = {}, seenImpure = {};
        var code = 'let counter = 0;              // outside state\nconst pure   = (x) => x * 2;\nconst impure = (x) => { counter++; return x * 2 + counter; };';
        frames.push(fr('Two functions that look alike. <b>pure(x)</b> only uses <code>x</code>. <b>impure(x)</b> reads <i>and changes</i> the outside variable <code>counter</code>. Let us call both with the same arguments and compare.', [
          cp(code, { 2: 'ok', 3: 'bad' }),
          vp({ counter: 0 }, {}, 'Outside world'),
          { type: 'table', label: 'Call log', columns: ['call', 'x', 'pure(x)', 'impure(x)', 'counter after'], rows: [] }
        ]));
        args.forEach(function (x, k) {
          counter++;
          var p = x * 2, ip = x * 2 + counter;
          var badPure = seenPure[x] !== undefined && seenPure[x] !== p;
          var badImp = seenImpure[x] !== undefined && seenImpure[x] !== ip;
          var repeat = seenImpure[x] !== undefined;
          seenPure[x] = p; seenImpure[x] = ip;
          rows.push(['#' + (k + 1), String(x), String(p), (badImp ? '❌ ' : '') + ip, String(counter)]);
          var hl = {}; hl[k] = repeat ? 'bad' : 'cur';
          var narr = 'Call #' + (k + 1) + ' with x = <b>' + x + '</b>. pure → <b>' + p + '</b>, impure → <b>' + ip + '</b> and <code>counter</code> becomes ' + counter + '. ';
          narr += repeat ? '<span class="c-r">We used x = ' + x + ' before, and impure gave a DIFFERENT answer.</span> pure gave the same ' + p + ' again' + (badPure ? '?!' : ' ✔.') : 'First time we see x = ' + x + '.';
          frames.push(fr(narr, [
            cp(code, { 3: 'cur' }),
            vp({ counter: counter }, { counter: 'bad' }, 'Outside world (changed by impure!)'),
            { type: 'table', label: 'Call log', columns: ['call', 'x', 'pure(x)', 'impure(x)', 'counter after'], rows: rows.slice(), hl: hl }
          ]));
        });
        frames.push(fr('<b>Verdict.</b> <span class="c-g">pure</span>: same x → same result, nothing outside changed, safe to cache and test. <span class="c-r">impure</span>: has a hidden input (<code>counter</code>) <i>and</i> a side effect (<code>counter++</code>). You cannot memoize it, and tests depend on call order.', [
          { type: 'table', label: 'Call log', columns: ['call', 'x', 'pure(x)', 'impure(x)', 'counter after'], rows: rows.slice() },
          { type: 'map', label: 'pure: remembered answers (a valid cache!)', entries: Object.keys(seenPure).map(function (k) { return [k, seenPure[k]]; }), hl: {} }
        ]));
        frames.push(fr('Fix it: make the outside state an <b>argument</b> and return the new state instead of changing it. Now it is pure again: <code>step(x, counter)</code> → <code>{ value, counter }</code>.', [
          cp('// pure replacement: state in, state out\nconst step = (x, counter) => ({\n  value: x * 2 + (counter + 1),\n  counter: counter + 1\n});', { 2: 'ok', 3: 'ok', 4: 'ok' }),
          tx('Same <code>(x, counter)</code> pair → same result. The caller decides where to keep the new counter.', 'Functional core, imperative shell')
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'sort() vs toSorted(): purity of built-ins', html: `<p><code>arr.sort()</code>, <code>reverse()</code>, <code>splice()</code>, <code>push()</code>, <code>fill()</code> change the array <b>in place</b>, so a function that calls them on its argument is impure. ES2023 added pure twins: <code>toSorted()</code>, <code>toReversed()</code>, <code>toSpliced()</code>, <code>with(i, v)</code>. They return new arrays.</p>${H.table(['Mutating (impure on arg)', 'Copying (pure)'], [['<code>sort</code>', '<code>toSorted</code>'], ['<code>reverse</code>', '<code>toReversed</code>'], ['<code>splice</code>', '<code>toSpliced</code>'], ['<code>a[i] = v</code>', '<code>a.with(i, v)</code>']])}`, code: { lang: 'js', run: true, code: `
const scores = [40, 10, 30];
function topImpure(a) { return a.sort((x, y) => y - x)[0]; }
function topPure(a) { return a.toSorted((x, y) => y - x)[0]; }

const s1 = [40, 10, 30];
console.log('pure top:', topPure(s1), '| s1 still', s1);
console.log('impure top:', topImpure(scores), '| scores now', scores); // caller's array reordered!
console.log('with():', [1, 2, 3].with(1, 99));
` } },
      { title: 'Local mutation is still pure', html: `<p>Purity is about what the <b>outside world can observe</b>. A function may create its own array and <code>push</code> into it; nobody else can see that array until it is returned. So this is pure:</p><p>${H.c('g', 'function range(n) { const out = []; for (let i = 0; i &lt; n; i++) out.push(i); return out; }')}</p><p>This matters for performance: you do not need to avoid loops or mutation <i>inside</i> a function, only mutation of things you did not create.</p>`, code: { lang: 'js', run: true, code: `
function range(n) {
  const out = [];               // created here, private to this call
  for (let i = 0; i < n; i++) out.push(i); // mutation of local data = fine
  return out;
}
console.log(range(5), range(5)); // same input, same output, no outside change
` } },
      { title: 'Redux-style reducer: the classic purity interview check', html: `<p>A reducer takes <code>(state, action)</code> and returns the <b>next</b> state. If it mutates <code>state</code>, a UI library that compares old vs new by reference (<code>prev !== next</code>) sees "nothing changed" and does not re-render.</p>${H.table(['Line', 'Problem'], [['<code>state.count++; return state;</code>', H.c('r', 'mutates, returns SAME reference → no re-render')], ['<code>return { ...state, count: state.count + 1 };</code>', H.c('g', 'new object → change detected')]])}`, code: { lang: 'js', run: true, code: `
function badReducer(state, action) {
  if (action.type === 'inc') { state.count++; return state; }
  return state;
}
function goodReducer(state, action) {
  if (action.type === 'inc') return { ...state, count: state.count + 1 };
  return state;
}
const s0 = { count: 0 };
const s1 = badReducer(s0, { type: 'inc' });
console.log('bad: changed?', s0 !== s1, '(UI thinks nothing changed)');
const t0 = { count: 0 };
const t1 = goodReducer(t0, { type: 'inc' });
console.log('good: changed?', t0 !== t1, '| old', t0.count, 'new', t1.count);
` } },
      { title: 'Spot the hidden inputs', html: `<p>Each of these looks innocent but is impure:</p><ul><li><code>(price) =&gt; price * window.rate</code> — reads a global.</li><li><code>(user) =&gt; user.name.toUpperCase() + new Date().getFullYear()</code> — reads the clock.</li><li><code>(list) =&gt; list.length &gt; 0 ? list.pop() : null</code> — <code>pop</code> mutates the argument.</li><li><code>(x) =&gt; { if (x &lt; 0) console.warn(x); return Math.abs(x); }</code> — logging is I/O.</li></ul><p>Fix pattern: pass <code>rate</code> / <code>year</code> as parameters, use <code>list.at(-1)</code> instead of <code>pop()</code>, and move logging to the caller.</p>` }
    ],
    deepDive: `<p>🟣 <b>Referential transparency, precisely.</b> An expression is referentially transparent if replacing it with its value never changes program behaviour. Purity of a function guarantees its calls are referentially transparent, which unlocks <i>equational reasoning</i>: you can refactor <code>f(x) + f(x)</code> into <code>2 * f(x)</code>, move calls out of loops, or run them in any order or in parallel.</p>
<p><b>Edge cases interviewers love:</b></p>
<ul>
<li><b>Throwing:</b> a function that throws on bad input is usually still considered pure if it <i>always</i> throws for that input (it is a total function into "value or error"). Libraries like fp-ts model this as <code>Either</code> instead of throwing.</li>
<li><b>Closures over mutable variables</b> are hidden inputs: <code>const f = () =&gt; config.limit</code> is impure if <code>config.limit</code> can change.</li>
<li><b>Getters and Proxies</b> can make a plain property read run arbitrary code; <code>obj.x</code> is not guaranteed to be side-effect-free in JS.</li>
<li><b>Idempotent ≠ pure.</b> An HTTP <code>PUT</code> is idempotent (doing it twice equals doing it once) but it is a side effect. A pure function is trivially idempotent-safe because it does nothing to the world.</li>
<li><b>Object identity:</b> <code>() =&gt; ({})</code> returns a <i>new</i> object each time. Same "shape", different reference. Most people still call it pure; React's <code>useMemo</code> exists partly because of this.</li>
</ul>
<p><b>Production reality.</b> React 18+ <code>StrictMode</code> deliberately calls components, reducers and state initialisers <b>twice</b> in development to expose impurity. Redux Toolkit uses Immer so you can write "mutating" code that is turned into pure updates. Bundlers rely on purity for tree-shaking: <code>/*#__PURE__*/</code> annotations and <code>"sideEffects": false</code> in <code>package.json</code> tell them unused calls can be deleted safely.</p>
<p><b>Cost:</b> purity often means copying. Copying a 10-element object is trivially cheap; copying a 100k-element array on every keystroke is not. That is why the next topic covers <b>structural sharing</b>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants happily produce code that "works" in the demo but hides side effects: <code>arr.sort()</code> on a prop, <code>Date.now()</code> buried in business logic, a module-level cache that leaks across tests. Reviewing for purity is now a core reviewer skill.</p>
<p><b>Use AI as a partner:</b></p>
<ul>
<li><code>List every side effect and hidden input in this function, line by line. Do not rewrite it.</code></li>
<li><code>Refactor this into a pure core plus a thin shell that does the I/O. Keep behaviour identical.</code></li>
<li><code>Write property-based tests (fast-check) proving this function is deterministic and does not mutate its arguments.</code> — a quick trick: deep-freeze the input in the test, and any mutation throws.</li>
</ul>
<p><b>Where AI goes wrong:</b> calls a function "pure" because it has no <code>console.log</code>, while it mutates an argument; suggests memoizing functions that read the clock; forgets that <code>sort</code> mutates. <b>What you must still own:</b> deciding where the effect boundary lives in your architecture, and spotting impurity in review — pure code is also what makes AI-generated tests trustworthy, because the test does not need a fragile mock.</p>`,
    problems: [{
      title: 'Refactor an Impure Checkout into a Pure Function',
      level: 'Easy', tags: ['pure functions', 'refactoring', 'reduce'], companies: ['Flipkart', 'Shopify', 'Atlassian'],
      statement: `<p>The function below mutates a global cart, reads a global discount and uses the real clock to decide a "happy hour" discount. Rewrite it as a <b>pure</b> function <code>checkout(items, discountPct, hour)</code> that returns <code>{ subtotal, discount, total }</code> and never changes <code>items</code>. Happy hour (hour 17 or 18) adds an extra 5% discount.</p>`,
      constraints: `<p>0 ≤ items.length ≤ 10<sup>4</sup>; prices and quantities are non-negative integers; round money to 2 decimals.</p>`,
      example: `<p>items = <code>[{price: 100, qty: 2}, {price: 50, qty: 1}]</code>, discountPct = 10, hour = 17 → subtotal ${H.c('b', '250')}, discount ${H.c('y', '15% of 250 = 37.5')}, total ${H.c('g', '212.5')}. Calling it again with the same arguments gives exactly the same object, and <code>items</code> is unchanged.</p>`,
      brute: { why: `<p>The original works once, but it has hidden inputs (<code>DISCOUNT</code>, <code>new Date()</code>) and a side effect (<code>cart.push</code>). Tests are flaky (they depend on what time CI runs) and the cart grows every call.</p>`, code: `
let cart = [{ price: 100, qty: 2 }];
let DISCOUNT = 10;
function checkoutImpure(extraItem) {
  cart.push(extraItem);                          // side effect
  const hour = new Date().getHours();            // hidden input: clock
  let pct = DISCOUNT;                            // hidden input: global
  if (hour === 17 || hour === 18) pct += 5;
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  return subtotal - subtotal * pct / 100;
}
console.log(checkoutImpure({ price: 50, qty: 1 }));
` },
      mcq: { q: 'Which change alone makes the result deterministic for testing?', options: ['Pass <code>hour</code> in as a parameter', 'Wrap the body in try/catch', 'Use <code>const</code> instead of <code>let</code>', 'Make the function async'], answer: 0, explain: 'The clock is a hidden input. Turning it into a parameter removes the non-determinism; const/try/async do not.' },
      hints: [`<p>Hint 1: list every value the function reads that is NOT an argument — each one must become a parameter.</p>`, `<p>Hint 2: never call <code>push</code> on the input. Use <code>reduce</code> to compute the subtotal without touching the array.</p>`, `<p>Hint 3: recipe — pct = discountPct + (hour is 17 or 18 ? 5 : 0); subtotal = Σ price·qty; discount = round2(subtotal·pct/100); total = round2(subtotal − discount). Return a new object. Edge: empty cart → all zeros.</p>`],
      tests: {"sig":"string int int -> string","fn":"chk","harness":{"js":"\nfunction chk(json, pct, hour) {\n  if (json === 'BIG') { var big = []; for (var i = 0; i < 10000; i++) big.push({ price: 3, qty: 2 }); return checkout(big, pct, hour); }\n  if (json === 'PURE') { var items = Object.freeze([Object.freeze({ price: 10, qty: 3 })]); var a = checkout(items, pct, hour), b = checkout(items, pct, hour); return [JSON.stringify(a) === JSON.stringify(b), items.length, items[0].qty]; }\n  return checkout(JSON.parse(json), pct, hour);\n}"},"cases":[[["[{\"price\":100,\"qty\":2},{\"price\":50,\"qty\":1}]",10,17],{"subtotal":250,"discount":37.5,"total":212.5}],[["[{\"price\":100,\"qty\":2},{\"price\":50,\"qty\":1}]",10,12],{"subtotal":250,"discount":25,"total":225}],[["[]",10,17],{"subtotal":0,"discount":0,"total":0}],[["[{\"price\":100,\"qty\":2},{\"price\":50,\"qty\":1}]",10,18],{"subtotal":250,"discount":37.5,"total":212.5}],[["[{\"price\":100,\"qty\":2},{\"price\":50,\"qty\":1}]",10,16],{"subtotal":250,"discount":25,"total":225}],[["[{\"price\":100,\"qty\":2},{\"price\":50,\"qty\":1}]",10,19],{"subtotal":250,"discount":25,"total":225}],[["[{\"price\":100,\"qty\":2},{\"price\":50,\"qty\":1}]",0,12],{"subtotal":250,"discount":0,"total":250}],[["[{\"price\":100,\"qty\":2},{\"price\":50,\"qty\":1}]",100,12],{"subtotal":250,"discount":250,"total":0}],[["[{\"price\":111,\"qty\":3}]",10,12],{"subtotal":333,"discount":33.3,"total":299.7}],[["[{\"price\":1,\"qty\":1}]",33,12],{"subtotal":1,"discount":0.33,"total":0.67}],[["[{\"price\":0,\"qty\":5},{\"price\":7,\"qty\":0}]",20,17],{"subtotal":0,"discount":0,"total":0}],[["PURE",5,17],[true,1,3]],[["BIG",10,12],{"subtotal":60000,"discount":6000,"total":54000}]],"cmp":"float"},
      solution: {
        approach: `<p>Turn each hidden input into a parameter, compute with <code>reduce</code> (no mutation), return a brand-new object. The caller (the "shell") supplies <code>new Date().getHours()</code> in production and a fixed hour in tests.</p>`,
        code: { lang: 'js', run: true, code: `
const round2 = (x) => Math.round(x * 100) / 100;

function checkout(items, discountPct, hour) {
  const pct = discountPct + (hour === 17 || hour === 18 ? 5 : 0);
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const discount = round2(subtotal * pct / 100);
  return { subtotal, discount, total: round2(subtotal - discount) };
}

const items = Object.freeze([{ price: 100, qty: 2 }, { price: 50, qty: 1 }]); // frozen: mutation would throw in strict mode
console.log(checkout(items, 10, 17)); // { subtotal: 250, discount: 37.5, total: 212.5 }
console.log(checkout(items, 10, 12)); // { subtotal: 250, discount: 25, total: 225 }
console.log(checkout([], 10, 17));    // all zeros
console.log('items untouched:', items.length);
` },
        dry: { head: ['step', 'value', 'note'], rows: [['pct', '10 + 5 = 15', 'hour 17 is happy hour'], ['subtotal', '100·2 + 50·1 = 250', 'reduce, no push'], ['discount', '250·15/100 = 37.5', 'round2'], ['total', '250 − 37.5 = 212.5', H.c('g', 'new object returned')]] },
        complexity: `<p>Time O(n) for the reduce, extra space O(1) (just the result object). The impure version was also O(n) but grew the cart forever.</p>`,
        followUps: ['How would you test it so that a hidden mutation fails loudly? (deep-freeze inputs)', 'Where should <code>new Date()</code> live now?', 'How would you add per-item coupons while staying pure?']
      }
    }]
  });

  /* ================= TOPIC 2: Immutability ================= */
  topics.push({
    title: 'Immutability, Copies & Structural Sharing',
    analogy: `<p>Think of a <b>Google Doc's version history</b>. When you fix one typo, Google does not photocopy the entire 300-page document. It saves "version 2 = version 1, except page 47 line 3". Every old version stays readable forever, and the unchanged pages are <b>shared</b> between versions.</p>
<p>Immutable data in JavaScript works the same way: never scribble on the old version; make a new version that <b>reuses</b> every untouched piece.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <b>Mutable</b> data can be changed in place (<code>user.age = 31</code>). <b>Immutable</b> data is never changed; to "change" it you create a new value (<code>const older = { ...user, age: 31 }</code>). The old value stays exactly as it was.</p>
<p>Why bother? Because in JavaScript objects are shared <b>by reference</b>. Two variables can point at the <i>same</i> object, so a change through one is a surprise for the other:</p>
<pre>const a = { tags: ['js'] };
const b = a;            // NOT a copy, same object
b.tags.push('ts');
console.log(a.tags);    // ['js', 'ts']  ← a changed too!</pre>
<p>🔵 <b>Four tools and their limits:</b></p>
${H.table(['Tool', 'What it really does', 'Trap'], [
  ['<code>const</code>', 'the <b>variable</b> cannot be re-pointed', 'the object it points to can still change'],
  ['<code>Object.freeze(o)</code>', 'o\'s own properties become read-only', H.c('r', 'shallow') + ': nested objects stay mutable; silent failure outside strict mode'],
  ['spread <code>{...o}</code> / <code>[...a]</code>', 'new top-level container', H.c('r', 'shallow') + ': nested objects are still shared'],
  ['<code>structuredClone(o)</code>', 'full deep copy', 'slow for big data; cannot clone functions, DOM nodes; class instances lose their prototype']
])}
<p><b>Immutable update recipe for nested data:</b> copy <i>every level on the path</i> to the thing you change, and reuse everything else.</p>
<pre>const next = {
  ...state,                          // copy level 1
  user: {
    ...state.user,                   // copy level 2
    address: { ...state.user.address, city: 'Pune' }  // copy level 3 + change
  }
};
// next.settings === state.settings  → true (shared, untouched)</pre>
<p>That reuse is called <b>structural sharing</b>. It makes immutable updates cheap (you copy only the path, roughly the depth of the tree) and makes change detection trivial: if <code>prev.settings === next.settings</code>, the settings did not change. React, Redux, Zustand and many memo caches rely on exactly this <b>reference equality</b> check.</p>
<p>Array cheat-sheet: use <code>map</code>, <code>filter</code>, <code>slice</code>, <code>concat</code>, spread, and the ES2023 copies <code>toSorted</code>, <code>toReversed</code>, <code>toSpliced</code>, <code>with</code> instead of <code>push</code>, <code>pop</code>, <code>splice</code>, <code>sort</code>, <code>reverse</code>, <code>a[i] = v</code>.</p>`,
    clues: ['"Why didn\'t my React component re-render?" → state was mutated, same reference', '"Update a deeply nested field without mutating" → copy the path (spread at each level) or Immer', '"Undo / redo / time travel" → keep old immutable versions', '"const object still changed" → const freezes the binding, not the value', '"Deep clone vs shallow clone" → spread/Object.assign are shallow; structuredClone is deep', '"Detect what changed cheaply" → structural sharing + <code>===</code>'],
    code: [{ lang: 'js', run: true, title: 'const, freeze, shallow vs deep copies', code: `
'use strict';
// 1) const freezes the BINDING, not the object
const user = { name: 'Asha', tags: ['js'] };
user.name = 'Asha K';            // allowed!
console.log('const object changed:', user.name);

// 2) Object.freeze is shallow
const frozen = Object.freeze({ name: 'Ben', tags: ['go'] });
try { frozen.name = 'X'; } catch (e) { console.log('freeze blocked top level:', e.constructor.name); }
frozen.tags.push('rust');        // nested array is NOT frozen
console.log('nested still mutable:', frozen.tags);

// 3) deepFreeze: freeze recursively
function deepFreeze(o) {
  Object.values(o).forEach((v) => {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  });
  return Object.freeze(o);
}
const cfg = deepFreeze({ db: { host: 'x', ports: [1, 2] } });
try { cfg.db.ports.push(3); } catch (e) { console.log('deepFreeze blocked nested push:', e.constructor.name); }

// 4) shallow copy shares nested objects; structuredClone does not
const original = { meta: { v: 1 } };
const shallow = { ...original };
const deep = structuredClone(original);
original.meta.v = 2;
console.log('shallow sees change:', shallow.meta.v, '| deep is independent:', deep.meta.v);
` }, { lang: 'js', run: true, title: 'Nested immutable update + structural sharing proof', code: `
const state = {
  user: { name: 'Asha', address: { city: 'Delhi', zip: '110001' } },
  settings: { theme: 'dark' },
  cart: { items: [1, 2, 3] }
};

// Change user.address.city — copy ONLY the path root -> user -> address
const next = {
  ...state,
  user: {
    ...state.user,
    address: { ...state.user.address, city: 'Pune' }
  }
};

console.log('old city:', state.user.address.city, '| new city:', next.user.address.city);
console.log('root copied?     ', state !== next);
console.log('user copied?     ', state.user !== next.user);
console.log('address copied?  ', state.user.address !== next.user.address);
console.log('settings shared? ', state.settings === next.settings);
console.log('cart shared?     ', state.cart === next.cart);

// Immutable array updates
const todos = [{ id: 1, done: false }, { id: 2, done: false }];
const toggled = todos.map((t) => (t.id === 2 ? { ...t, done: true } : t));
console.log('item 1 shared:', todos[0] === toggled[0], '| item 2 replaced:', todos[1] !== toggled[1]);
const removed = todos.filter((t) => t.id !== 1);
const inserted = todos.toSpliced(1, 0, { id: 9, done: false });
console.log(removed.length, inserted.map((t) => t.id), 'original length', todos.length);
` }],
    codeTitle: ['Freeze / copy behaviour (runnable)', 'Structural sharing (runnable)'],
    viz: [{
      title: 'Structural sharing: copy the path, share the rest',
      input: 'user.address.city',
      inputLabel: 'Path to update (try user.address.city, user.name, settings.theme, cart.items)',
      gen: function (input) {
        var T = {
          root: { label: 'state', x: 24, y: 8, kids: ['user', 'settings', 'cart'] },
          user: { label: 'user', x: 9, y: 30, kids: ['name', 'address'] },
          settings: { label: 'settings', x: 26, y: 30, kids: ['theme'] },
          cart: { label: 'cart', x: 42, y: 30, kids: ['items'] },
          name: { label: 'name', x: 3, y: 54, kids: [] },
          address: { label: 'address', x: 15, y: 54, kids: ['city', 'zip'] },
          theme: { label: 'theme', x: 26, y: 54, kids: [] },
          items: { label: 'items', x: 42, y: 54, kids: [] },
          city: { label: 'city', x: 10, y: 78, kids: [] },
          zip: { label: 'zip', x: 21, y: 78, kids: [] }
        };
        var steps = String(input || '').trim().split('.').filter(function (s) { return s.length; });
        if (!steps.length) throw new Error('Type a path like user.address.city');
        var path = ['root'], cur = 'root';
        steps.forEach(function (s) {
          var nxt = T[cur].kids.filter(function (k) { return T[k].label === s; })[0];
          if (!nxt) throw new Error('"' + s + '" is not a child of ' + T[cur].label + '. Try user.address.city or settings.theme');
          path.push(nxt); cur = nxt;
        });
        var all = Object.keys(T);
        function oldNodes(hl) {
          return all.map(function (id) { return { id: id, label: T[id].label, x: T[id].x, y: T[id].y, shape: 'box' }; });
        }
        function oldEdges() {
          var e = [];
          all.forEach(function (id) { T[id].kids.forEach(function (k) { e.push([id, k]); }); });
          return e;
        }
        var frames = [];
        frames.push(fr('The current state is a tree of objects. We want to change <b>' + steps.join('.') + '</b> <i>without mutating</i> anything. Rule: copy every object on the path from the root to the target; share everything else.', [
          { type: 'graph', label: 'old state (left)', directed: true, height: 90, nodes: oldNodes(), edges: oldEdges(), hl: path.reduce(function (h, id) { h[id] = 'win'; return h; }, {}), tags: { root: 'v1' } },
          { type: 'array', label: 'path to copy', values: path.map(function (id) { return T[id].label; }) }
        ]));
        var newNodes = [], newEdges = [], ehl = {}, hl = {}, shared = [];
        path.forEach(function (id, depth) {
          var nid = id + "'";
          newNodes.push({ id: nid, label: T[id].label + "'", x: T[id].x + 52, y: T[id].y, shape: 'box' });
          hl[nid] = depth === path.length - 1 ? 'ok' : 'cur';
          if (depth > 0) { newEdges.push([path[depth - 1] + "'", nid]); ehl[path[depth - 1] + "'-" + nid] = 'cur'; }
          var nextOnPath = path[depth + 1];
          T[id].kids.forEach(function (k) {
            if (k !== nextOnPath) { newEdges.push([nid, k]); ehl[nid + '-' + k] = 'ok'; shared.push(T[k].label); hl[k] = 'ok'; }
          });
          var isLeaf = depth === path.length - 1;
          var narr = isLeaf
            ? 'Reached the target <b>' + T[id].label + '</b>. Create its new version <b>' + T[id].label + "'</b> with the new value" + (T[id].kids.length ? ', still pointing at the old children (they did not change)' : '') + '.'
            : 'Copy <b>' + T[id].label + '</b> → <b>' + T[id].label + "'</b> (like <code>{ ...obj }</code>). Its children that are NOT on the path are <span class=\"c-g\">shared</span>: the new copy just points at the old objects.";
          frames.push(fr(narr, [
            { type: 'graph', label: 'old (left) and new (right) versions', directed: true, height: 90, nodes: oldNodes().concat(newNodes.slice()), edges: oldEdges().concat(newEdges.slice()), hl: Object.assign({}, hl), ehl: Object.assign({}, ehl), tags: { root: 'v1', "root'": 'v2' } },
            { type: 'set', label: 'shared (reused) objects so far', items: shared.slice() },
            vp({ copied: newNodes.length, shared: shared.length })
          ]));
        });
        var total = all.length;
        frames.push(fr('Done. We created only <b>' + path.length + '</b> new objects (the path) and reused <b>' + (total - path.length) + '</b> old ones. The old version <b>v1</b> is still intact (undo is free), and a component reading <code>state.settings</code> can skip re-rendering because <code>v1.settings === v2.settings</code>' + (path.indexOf('settings') >= 0 ? ' — except here we changed settings, so that check correctly says "changed".' : '.'), [
          { type: 'graph', label: 'final: two versions sharing structure', directed: true, height: 90, nodes: oldNodes().concat(newNodes), edges: oldEdges().concat(newEdges), hl: hl, ehl: ehl, tags: { root: 'v1', "root'": 'v2' } },
          { type: 'table', label: 'reference checks after the update', columns: ['check', 'result'], rows: all.filter(function (id) { return T[id].kids.length || id === path[path.length - 1]; }).map(function (id) { return ['v1.' + T[id].label + ' === v2.' + T[id].label, path.indexOf(id) >= 0 ? 'false (copied)' : 'true (shared)']; }) }
        ]));
        frames.push(fr('Cost comparison: a <b>deep clone</b> (<code>structuredClone</code>) would copy all <b>' + total + '</b> objects and break every <code>===</code> check, causing every component to re-render. Path copying costs O(depth); deep cloning costs O(size).', [
          { type: 'bars', label: 'objects allocated', values: [path.length, total], idxLabels: ['path copy', 'deep clone'], hl: { 0: 'ok', 1: 'bad' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'The half-copied nested update bug', html: `<p>A very common bug: copying the top level but mutating a nested object.</p>${H.table(['Code', 'Result'], [['<code>const next = { ...state }; next.user.name = \'X\';</code>', H.c('r', 'state.user.name is ALSO X (shared nested object)')], ['<code>const next = { ...state, user: { ...state.user, name: \'X\' } };</code>', H.c('g', 'only next changed')]])}`, code: { lang: 'js', run: true, code: `
const state = { user: { name: 'Asha' }, theme: 'dark' };
const bad = { ...state };
bad.user.name = 'X';                 // mutates the shared nested object
console.log('state after bad update:', state.user.name);

const state2 = { user: { name: 'Asha' }, theme: 'dark' };
const good = { ...state2, user: { ...state2.user, name: 'X' } };
console.log('state2 after good update:', state2.user.name, '| good:', good.user.name);
` } },
      { title: 'Immutable array operations cheat-sheet', html: `${H.table(['Goal', 'Mutating ❌', 'Immutable ✅'], [['add to end', '<code>a.push(x)</code>', '<code>[...a, x]</code>'], ['remove index i', '<code>a.splice(i, 1)</code>', '<code>a.toSpliced(i, 1)</code> or <code>a.filter((_, j) =&gt; j !== i)</code>'], ['replace index i', '<code>a[i] = v</code>', '<code>a.with(i, v)</code>'], ['sort', '<code>a.sort(cmp)</code>', '<code>a.toSorted(cmp)</code>'], ['update one item', '<code>a[i].done = true</code>', '<code>a.map(t =&gt; t.id === id ? { ...t, done: true } : t)</code>']])}`, code: { lang: 'js', run: true, code: `
const a = [3, 1, 2];
console.log([...a, 4], a.toSpliced(0, 1), a.with(1, 9), a.toSorted(), a.toReversed());
console.log('a is untouched:', a);
` } },
      { title: 'What structuredClone can and cannot copy', html: `<p><code>structuredClone</code> (available in browsers and Node 17+) deep-copies plain objects, arrays, <code>Map</code>, <code>Set</code>, <code>Date</code>, <code>RegExp</code>, typed arrays and even <b>circular references</b>. It throws <code>DataCloneError</code> on functions and DOM nodes, and class instances come back as plain objects (prototype lost).</p>`, code: { lang: 'js', run: true, code: `
const o = { d: new Date(0), m: new Map([['k', 1]]), list: [1, 2] };
o.self = o;                                 // circular reference
const c = structuredClone(o);
console.log(c.self === c, c.m.get('k'), c.d instanceof Date);
try { structuredClone({ f: () => 1 }); } catch (e) { console.log('functions:', e.name); }
class Point { constructor(x) { this.x = x; } len() { return this.x; } }
const p = structuredClone(new Point(3));
console.log('prototype kept?', p instanceof Point, '| plain data:', p);
` } }
    ],
    deepDive: `<p>🟣 <b>Persistent data structures.</b> Structural sharing is the trick behind Clojure's vectors and Immutable.js: a 32-way trie (HAMT) where an update copies only ~log<sub>32</sub>(n) nodes — about 4 nodes for a million items. Plain JS objects copy the whole <i>level</i> on spread, so a single object with 10,000 keys costs O(10,000) per update. Rule of thumb: keep objects shallow-ish and normalized (<code>byId</code> maps + <code>ids</code> arrays) so each spread is small.</p>
<p><b>Immer</b> (used by Redux Toolkit) gives you a <i>draft</i> Proxy: you write <code>draft.user.city = 'Pune'</code> and Immer records the writes, then produces a new tree with structural sharing and auto-freezes it in development. It is copy-on-write: untouched branches are returned as-is.</p>
<p><b>Freeze details:</b> in strict mode (ES modules and classes are always strict) writing to a frozen property throws <code>TypeError</code>; in sloppy scripts it fails <i>silently</i>. <code>Object.freeze</code> on a typed array with elements throws. <code>Object.isFrozen</code>, <code>Object.seal</code> (no add/delete, but writable) and <code>Object.preventExtensions</code> are the weaker cousins. Freezing has historically had small engine costs; most teams freeze only in development.</p>
<p><b>Language status (2026):</b> the Records &amp; Tuples proposal (<code>#{}</code> / <code>#[]</code>) was withdrawn from TC39 in 2025, so there is still no built-in deeply immutable value type; libraries and conventions fill the gap. TypeScript's <code>readonly</code> and <code>Readonly&lt;T&gt;</code> / <code>as const</code> give <i>compile-time</i> immutability only — nothing is enforced at runtime.</p>
<p><b>When mutation wins:</b> hot loops (game physics, parsing, numeric code) where allocation pressure hurts GC. Use local mutation inside a pure function, or pooled objects, and keep the public API immutable.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI writes nested spreads quickly, but it frequently copies the wrong level (the half-copy bug), deep-clones everything "to be safe" (killing memoization), or uses <code>JSON.parse(JSON.stringify(x))</code> which silently drops <code>undefined</code>, functions, <code>Date</code> objects and fails on cycles.</p>
<p><b>Use AI as a partner:</b> <code>Convert these reducers to Immer and keep the same tests passing</code>; <code>Normalize this nested API response into byId/allIds so updates are shallow</code>; <code>Find every place that mutates props or state in this diff</code>. Ask it to add a dev-only deep-freeze around your store so mutation bugs crash early.</p>
<p><b>What you must still own:</b> choosing the data shape (normalized vs nested), knowing which identity checks your UI relies on, and judging cost — whether a "harmless" <code>structuredClone</code> in a render path is copying 5 MB per keystroke. That needs a profiler and your judgement, not a guess.</p>`,
    problems: [{
      title: 'Implement Immutable setIn(obj, path, value)',
      level: 'Medium', tags: ['immutability', 'recursion', 'structural sharing'], companies: ['Meta', 'Atlassian', 'Razorpay'],
      statement: `<p>Write <code>setIn(obj, path, value)</code> that returns a <b>new</b> object equal to <code>obj</code> except that the property at <code>path</code> (an array of keys, which may include array indexes) is set to <code>value</code>. The original must not change, and every branch not on the path must be <b>shared</b> (same reference). Missing intermediate keys should be created (array if the next key is a number, object otherwise).</p>`,
      constraints: `<p>Path length ≤ 50; objects are plain objects/arrays; do not use <code>structuredClone</code> or JSON.</p>`,
      example: `<p><code>setIn({a: {b: 1}, c: {d: 2}}, ['a', 'b'], 9)</code> → <code>{a: {b: ${H.c('g', '9')}}, c: {d: 2}}</code>. ${H.c('b', 'result.c === obj.c')} (shared), ${H.c('y', 'result.a !== obj.a')} (copied).</p>`,
      brute: { why: `<p>Deep clone the whole object, then mutate the clone. Correct values, but O(total size) per update and every reference changes, so all memoized components re-render.</p>`, code: { lang: 'js', run: true, code: `
function setInBrute(obj, path, value) {
  const copy = structuredClone(obj);        // copies EVERYTHING
  let cur = copy;
  for (let i = 0; i < path.length - 1; i++) {
    if (cur[path[i]] == null) cur[path[i]] = typeof path[i + 1] === 'number' ? [] : {};
    cur = cur[path[i]];
  }
  cur[path[path.length - 1]] = value;
  return copy;
}
const o = { a: { b: 1 }, c: { d: 2 } };
const r = setInBrute(o, ['a', 'b'], 9);
console.log(r.a.b, 'c shared?', r.c === o.c); // 9 false  <- sharing lost
` } },
      mcq: { q: 'For path <code>[\'a\', \'b\']</code>, which objects must be newly created?', options: ['The root and <code>obj.a</code>', 'Only <code>obj.a</code>', 'The root, <code>obj.a</code> and <code>obj.c</code>', 'Nothing — just assign'], answer: 0, explain: 'Every container on the path from the root to the target must be copied; siblings like obj.c are shared.' },
      hints: [`<p>Hint 1: the problem is recursive — setting <code>[k, ...rest]</code> on <code>obj</code> means copying <code>obj</code> and setting <code>rest</code> on <code>obj[k]</code>.</p>`, `<p>Hint 2: copy arrays with <code>[...arr]</code> / <code>slice()</code> and objects with <code>{ ...o }</code> so the type is preserved.</p>`, `<p>Hint 3: base case — empty path returns <code>value</code>. If <code>obj[k]</code> is missing, start from <code>[]</code> when the next key is a number, else <code>{}</code>. Optional optimisation: if the value is already identical (<code>Object.is</code>), return <code>obj</code> unchanged.</p>`],
      tests: {"sig":"string string string -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, objJson, argJson) {\n  var o = JSON.parse(objJson), a = JSON.parse(argJson);\n  if (kind === 'set') return setIn(o, a[0], a[1]);\n  if (kind === 'frozen') { var f = deepFr(o); var r0 = setIn(f, a[0], a[1]); return [r0, JSON.stringify(f) === objJson]; }\n  if (kind === 'share') { var r = setIn(o, ['a', 'b'], 9); return [r.c === o.c, r.a !== o.a, o.a.b, r !== o]; }\n  if (kind === 'noop') return setIn(o, a[0], a[1]) === o;\n  if (kind === 'creates') { var rc = setIn(o, a[0], a[1]); return [rc, Array.isArray(rc.list)]; }\n  if (kind === 'arraySiblings') { var ra = setIn(o, ['a', 1], 9); return [ra.a, ra.a !== o.a, ra.other === o.other]; }\n  if (kind === 'deep') { var path = [], n = 50, base = {}; for (var i = 0; i < n; i++) path.push('k' + i); var out = setIn(base, path, 'v'); var cur = out; for (var j = 0; j < n; j++) cur = cur['k' + j]; return [cur, Object.keys(base).length]; }\n}\nfunction deepFr(x) { if (x && typeof x === 'object') { Object.keys(x).forEach(function (k) { deepFr(x[k]); }); Object.freeze(x); } return x; }"},"cases":[[["set","{\"a\":{\"b\":1},\"c\":{\"d\":2}}","[[\"a\",\"b\"],9]"],{"a":{"b":9},"c":{"d":2}}],[["frozen","{\"a\":{\"b\":1},\"c\":{\"d\":2}}","[[\"a\",\"b\"],9]"],[{"a":{"b":9},"c":{"d":2}},true]],[["share","{\"a\":{\"b\":1},\"c\":{\"d\":2}}","[]"],[true,true,1,true]],[["noop","{\"a\":{\"b\":1}}","[[\"a\",\"b\"],1]"],true],[["creates","{}","[[\"list\",0,\"name\"],\"x\"]"],[{"list":[{"name":"x"}]},true]],[["set","{\"a\":1}","[[],5]"],5],[["set","{\"a\":[1,2,3]}","[[\"a\",1],9]"],{"a":[1,9,3]}],[["set","{\"a\":{\"b\":1}}","[[\"a\",\"x\",\"y\"],2]"],{"a":{"b":1,"x":{"y":2}}}],[["set","{\"a\":null}","[[\"a\",\"b\"],1]"],{"a":{"b":1}}],[["arraySiblings","{\"a\":[1,2,3],\"other\":{\"z\":1}}","[]"],[[1,9,3],true,true]],[["set","{}","[[\"a\"],null]"],{"a":null}],[["deep","{}","[]"],["v",0]]]},
      solution: {
        approach: `<p>Recurse along the path. At each level make a shallow copy of the current container, then replace only the child on the path with the recursive result. Siblings are carried over by reference automatically because the shallow copy copies their <i>pointers</i>.</p>`,
        code: { lang: 'js', run: true, code: `
function setIn(obj, path, value) {
  if (path.length === 0) return value;               // base case: replace whole thing
  const [key, ...rest] = path;
  const base = obj == null ? (typeof key === 'number' ? [] : {}) : obj;
  const child = base[key] == null && rest.length ? (typeof rest[0] === 'number' ? [] : {}) : base[key];
  const newChild = setIn(child, rest, value);
  if (Object.is(newChild, base[key])) return base;   // nothing changed: keep identity
  const copy = Array.isArray(base) ? base.slice() : { ...base };
  copy[key] = newChild;
  return copy;
}

const o = Object.freeze({ a: Object.freeze({ b: 1 }), c: Object.freeze({ d: 2 }) });
const r = setIn(o, ['a', 'b'], 9);
console.log(JSON.stringify(r), '| original b:', o.a.b);
console.log('c shared:', r.c === o.c, '| a copied:', r.a !== o.a);
console.log(JSON.stringify(setIn({}, ['list', 0, 'name'], 'x')));   // creates {list:[{name:'x'}]}
console.log('no-op keeps identity:', setIn(o, ['a', 'b'], 1) === o);
` },
        dry: { head: ['call', 'key', 'action', 'returns'], rows: [['setIn(o, [a,b], 9)', 'a', 'recurse into o.a', 'copy of o with a replaced'], ['setIn(o.a, [b], 9)', 'b', 'recurse into o.a.b', 'copy of o.a with b = 9'], ['setIn(1, [], 9)', '—', 'base case', '9'], ['back at root', '—', 'c copied by reference', H.c('g', 'r.c === o.c')]] },
        complexity: `<p>Time O(d · w) where d is path depth and w the width of each copied level (spread copies all keys of that level). Space the same. Deep clone would be O(total size).</p>`,
        followUps: ['Write <code>updateIn(obj, path, fn)</code> and <code>deleteIn</code>.', 'How does Immer achieve the same result with mutable-looking syntax?', 'How would you type <code>setIn</code> in TypeScript with a tuple path?']
      }
    }]
  });

  /* ================= TOPIC 3: Composition & pipe ================= */
  var FN_LIB = {
    add1: { f: function (x) { return x + 1; }, src: 'x => x + 1' },
    double: { f: function (x) { return x * 2; }, src: 'x => x * 2' },
    square: { f: function (x) { return x * x; }, src: 'x => x * x' },
    negate: { f: function (x) { return -x; }, src: 'x => -x' },
    half: { f: function (x) { return x / 2; }, src: 'x => x / 2' },
    minus3: { f: function (x) { return x - 3; }, src: 'x => x - 3' },
    abs: { f: function (x) { return Math.abs(x); }, src: 'x => Math.abs(x)' }
  };
  topics.push({
    title: 'Function Composition: compose & pipe',
    analogy: `<p>Think of a <b>car wash tunnel</b>. The car rolls in, gets <i>soaped</i>, then <i>scrubbed</i>, then <i>rinsed</i>, then <i>dried</i>. Each station does one small job and hands the car to the next one. You never build one giant robot that does everything; you line up small stations.</p>
<p><b>pipe</b> is that tunnel written in the order the car travels (soap → scrub → rinse → dry). <b>compose</b> is the same tunnel described the way a mathematician writes it, from the last station backwards: <code>dry(rinse(scrub(soap(car))))</code>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <b>Composition</b> means building a new function by plugging the output of one function into the input of the next. If <code>f</code> doubles and <code>g</code> adds one, then "double, then add one" is a new function <code>x =&gt; g(f(x))</code>.</p>
<p>Writing <code>h(g(f(x)))</code> by hand gets ugly fast — you have to read it <i>inside-out</i>. So we write two helpers:</p>
${H.table(['Helper', 'Order of running', 'Reads like', 'Example'], [
  ['<code>pipe(f, g, h)</code>', 'left → right: f first', 'a recipe / a Unix pipe <code>cat | grep | sort</code>', '<code>pipe(double, add1)(3)</code> = add1(double(3)) = ' + H.c('g', '7')],
  ['<code>compose(f, g, h)</code>', 'right → left: h first', 'math notation f ∘ g ∘ h', '<code>compose(double, add1)(3)</code> = double(add1(3)) = ' + H.c('b', '8')]
])}
<p>Both are one-liners with <code>reduce</code>:</p>
<pre>const pipe    = (...fns) =&gt; (x) =&gt; fns.reduce((acc, fn) =&gt; fn(acc), x);
const compose = (...fns) =&gt; (x) =&gt; fns.reduceRight((acc, fn) =&gt; fn(acc), x);</pre>
<p>Walk through <code>pipe(double, add1, square)(3)</code>:</p>
${H.table(['step', 'function', 'acc in', 'acc out'], [['start', '—', '—', '3'], ['1', 'double', '3', '6'], ['2', 'add1', '6', '7'], ['3', 'square', '7', H.c('g', '49')]])}
<p>🔵 <b>Rules that make composition work:</b></p>
<ul>
<li><b>Unary functions</b> (one argument in, one value out) snap together like LEGO. Functions needing more arguments are first turned into unary ones with <b>currying</b> or <b>partial application</b> (next topic).</li>
<li><b>Types must line up</b>: the output of step <i>k</i> must be a valid input for step <i>k+1</i>. In TypeScript, a typed <code>pipe</code> catches mismatches at compile time.</li>
<li><b>Pure steps</b> make the pipeline easy to test: test each tiny step alone, then trust the plumbing.</li>
<li><b>Identity</b>: <code>pipe()</code> with no functions should return the input unchanged (<code>x =&gt; x</code>). This is why we seed <code>reduce</code> with <code>x</code>.</li>
<li><b>Associativity</b>: <code>pipe(pipe(f, g), h)</code> behaves exactly like <code>pipe(f, pipe(g, h))</code>, so you can group steps into named sub-pipelines freely.</li>
</ul>
<p>Where you see this in real life: Express/Koa middleware, Redux <code>compose</code> for enhancers, RxJS <code>.pipe(map, filter)</code>, lodash <code>flow</code>/<code>flowRight</code>, data-cleaning pipelines, and the proposed <code>|&gt;</code> pipeline operator (still a stage 2 TC39 proposal in 2026, so not usable without a transpiler).</p>`,
    clues: ['"Implement compose / pipe" or "flow / flowRight" → reduce / reduceRight over a list of functions', '"Chain transformations without nested calls" → pipe', '"Point-free style" / "build a function out of smaller functions" → composition', '"Middleware chain" (Express, Redux) → composition of functions that call next', '"Support async steps in the pipeline" → pipeAsync with <code>await</code> in reduce', '"Order matters: right-to-left vs left-to-right" → compose vs pipe'],
    code: [{ lang: 'js', run: true, title: 'pipe and compose from scratch, with checks', code: `
// pipe: run functions left -> right
const pipe = (...fns) => {
  fns.forEach((fn, i) => {
    if (typeof fn !== 'function') throw new TypeError('pipe: argument ' + i + ' is not a function');
  });
  return (x) => fns.reduce((acc, fn) => fn(acc), x); // seed = x, so pipe() is identity
};

// compose: run functions right -> left (math style f(g(h(x))))
const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);

const double = (x) => x * 2;
const add1 = (x) => x + 1;
const square = (x) => x * x;

console.log('pipe(double, add1, square)(3)    =', pipe(double, add1, square)(3));    // ((3*2)+1)^2 = 49
console.log('compose(double, add1, square)(3) =', compose(double, add1, square)(3)); // ((3^2)+1)*2 = 20
console.log('pipe()(42) identity              =', pipe()(42));

// Associativity: grouping does not matter
const a = pipe(pipe(double, add1), square);
const b = pipe(double, pipe(add1, square));
console.log('associative?', a(5) === b(5), a(5));

// Real-ish use: slugify a blog title
const trim = (s) => s.trim();
const lower = (s) => s.toLowerCase();
const dashes = (s) => s.replace(/[^a-z0-9]+/g, '-');
const stripEdges = (s) => s.replace(/^-+|-+$/g, '');
const slugify = pipe(trim, lower, dashes, stripEdges);
console.log(slugify('  Hello, Functional World!  ')); // hello-functional-world
` }, { lang: 'js', run: true, title: 'Async pipe: steps may return promises', code: `
// Each step may be sync or async; await normalises both.
const pipeAsync = (...fns) => (x) =>
  fns.reduce((p, fn) => p.then(fn), Promise.resolve(x));

const fetchUser = async (id) => ({ id, name: 'asha', score: 41 }); // fake network call
const addBonus = (u) => ({ ...u, score: u.score + 1 });           // sync step is fine
const format = async (u) => u.name.toUpperCase() + ' scored ' + u.score;

pipeAsync(fetchUser, addBonus, format)(7).then((s) => console.log(s)); // ASHA scored 42

// Errors short-circuit the chain just like a normal promise chain
const boom = () => { throw new Error('step failed'); };
pipeAsync(fetchUser, boom, format)(7).catch((e) => console.log('caught:', e.message));
` }],
    codeTitle: ['pipe / compose (runnable)', 'pipeAsync (runnable)'],
    viz: [{
      title: 'Data flowing through a pipe vs a compose',
      input: '3 | double add1 square',
      inputLabel: 'start value | functions (add1 double square negate half minus3 abs), max 5',
      gen: function (input) {
        var parts = String(input || '').split('|');
        if (parts.length !== 2) throw new Error('Format: 3 | double add1 square');
        var x0 = Number(parts[0].trim());
        if (parts[0].trim() === '' || isNaN(x0)) throw new Error('Start value must be a number, e.g. 3 | double add1');
        var names = parts[1].trim().split(/[\s,]+/).filter(function (s) { return s.length; });
        if (!names.length) throw new Error('List at least one function after |');
        if (names.length > 5) throw new Error('Use at most 5 functions');
        names.forEach(function (n) { if (!FN_LIB[n]) throw new Error('Unknown function "' + n + '". Use: ' + Object.keys(FN_LIB).join(', ')); });
        var frames = [];
        function build(order, vals, active, label) {
          var nodes = [{ id: 'in', label: 'input', x: 6, y: 25, shape: 'box', w: 10 }];
          var step = 84 / (order.length + 1);
          order.forEach(function (n, i) { nodes.push({ id: 's' + i, label: n, x: 6 + step * (i + 1), y: 25, shape: 'box', w: 12 }); });
          nodes.push({ id: 'out', label: 'output', x: 94, y: 25, shape: 'box', w: 10 });
          var edges = [], ehl = {}, hl = {}, ids = ['in'];
          order.forEach(function (n, i) { ids.push('s' + i); });
          ids.push('out');
          for (var i = 0; i < ids.length - 1; i++) {
            var v = vals[i];
            edges.push([ids[i], ids[i + 1], v === undefined ? '' : String(v)]);
            if (v !== undefined) ehl[ids[i] + '-' + ids[i + 1]] = i === active ? 'cur' : 'ok';
          }
          if (active >= 0 && active < order.length) hl['s' + active] = 'cur';
          if (active >= order.length) hl.out = 'sel';
          hl['in'] = 'done';
          return { type: 'graph', label: label, directed: true, height: 50, nodes: nodes, edges: edges, hl: hl, ehl: ehl };
        }
        var pipeSrc = 'const pipe = (...fns) => (x) =>\n  fns.reduce((acc, fn) => fn(acc), x);\n\npipe(' + names.join(', ') + ')(' + x0 + ')';
        frames.push(fr('We will push <b>' + x0 + '</b> through <code>pipe(' + names.join(', ') + ')</code>. pipe runs the functions in the order you <i>read</i> them: left to right. The number on each arrow is the value travelling along it.', [
          build(names, [x0], 0, 'pipe: left → right'),
          cp(pipeSrc, { 2: 'cur' }),
          vp({ acc: x0, step: 0 })
        ]));
        var acc = x0, vals = [x0];
        names.forEach(function (n, i) {
          var before = acc;
          acc = FN_LIB[n].f(acc);
          if (!isFinite(acc)) throw new Error('Value became too large; try smaller numbers');
          vals.push(acc);
          frames.push(fr('Step ' + (i + 1) + ': <code>' + n + '</code> (' + esc(FN_LIB[n].src) + ') takes <b>' + before + '</b> and returns <b>' + acc + '</b>. <code>reduce</code> stores it in <code>acc</code> and hands it to the next function.', [
            build(names, vals.slice(), i + 1, 'pipe: left → right'),
            cp(pipeSrc, { 2: 'cur' }),
            vp({ acc: acc, step: i + 1, 'just ran': n }, { acc: 'ok' })
          ]));
        });
        var pipeResult = acc;
        frames.push(fr('pipe result: <b>' + pipeResult + '</b>. Read as math: <code>' + names.slice().reverse().join('(') + '(' + x0 + ')'.repeat(names.length) + '</code>.', [
          build(names, vals.slice(), names.length, 'pipe finished'),
          vp({ result: pipeResult }, { result: 'sel' })
        ]));
        var rev = names.slice().reverse();
        var compSrc = 'const compose = (...fns) => (x) =>\n  fns.reduceRight((acc, fn) => fn(acc), x);\n\ncompose(' + names.join(', ') + ')(' + x0 + ')';
        frames.push(fr('Now the SAME list with <code>compose</code>. <code>reduceRight</code> starts from the <b>last</b> function, so the run order flips to: <b>' + rev.join(' → ') + '</b>.', [
          build(rev, [x0], 0, 'compose: right → left (drawn in run order)'),
          cp(compSrc, { 2: 'cur' }),
          vp({ acc: x0 })
        ]));
        acc = x0; vals = [x0];
        rev.forEach(function (n, i) {
          var before = acc;
          acc = FN_LIB[n].f(acc);
          if (!isFinite(acc)) throw new Error('Value became too large; try smaller numbers');
          vals.push(acc);
          frames.push(fr('compose step ' + (i + 1) + ': <code>' + n + '</code>(' + before + ') = <b>' + acc + '</b>.', [
            build(rev, vals.slice(), i + 1, 'compose: right → left (drawn in run order)'),
            vp({ acc: acc, 'just ran': n }, { acc: 'ok' })
          ]));
        });
        var same = acc === pipeResult;
        frames.push(fr('compose result: <b>' + acc + '</b> vs pipe result: <b>' + pipeResult + '</b>. ' + (same ? 'They happen to match here (the steps commute or there is just one), but in general the order changes the answer.' : '<span class="c-r">Different!</span> Same functions, different order, different answer. Always ask the interviewer which order they expect.'), [
          { type: 'table', label: 'pipe vs compose', columns: ['helper', 'run order', 'result'], rows: [['pipe', names.join(' → '), String(pipeResult)], ['compose', rev.join(' → '), String(acc)]], hl: same ? {} : { 0: 'ok', 1: 'sel' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Data pipeline: clean a list of orders', html: `<p>Composition shines when each step is a named, testable idea. Here each step takes an array and returns a new array or value:</p>${H.table(['step', 'turns', 'into'], [['onlyPaid', 'all orders', 'paid orders'], ['toAmounts', 'orders', 'numbers'], ['sum', 'numbers', 'one number'], ['toRupees', 'number', '"₹1,234"']])}<p>Read the pipeline aloud: "only paid, to amounts, sum, to rupees". No temporary variables needed.</p>`, code: { lang: 'js', run: true, code: `
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);
const onlyPaid = (orders) => orders.filter((o) => o.status === 'paid');
const toAmounts = (orders) => orders.map((o) => o.amount);
const sum = (nums) => nums.reduce((a, b) => a + b, 0);
const toRupees = (n) => '\\u20B9' + n.toLocaleString('en-IN');

const paidRevenue = pipe(onlyPaid, toAmounts, sum, toRupees);
const orders = [
  { id: 1, status: 'paid', amount: 1200 },
  { id: 2, status: 'refunded', amount: 500 },
  { id: 3, status: 'paid', amount: 34 }
];
console.log(paidRevenue(orders)); // ₹1,234
` } },
      { title: 'Debugging a pipeline with a tap step', html: `<p>Because each stage just passes a value along, you can drop a <b>tap</b> (also called <code>trace</code>) anywhere to peek at the value without changing it. It returns its input unchanged, so the pipeline result is identical.</p><p>${H.c('b', 'const tap = (label) =&gt; (x) =&gt; { console.log(label, x); return x; };')}</p>`, code: { lang: 'js', run: true, code: `
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);
const tap = (label) => (x) => { console.log('  [' + label + ']', x); return x; };

const parseMax = pipe(
  (s) => s.split(','),
  tap('after split'),
  (parts) => parts.map(Number),
  tap('after Number'),
  (nums) => nums.filter((n) => !Number.isNaN(n)),
  (nums) => Math.max(...nums)
);
console.log('max =', parseMax('4,x,9,2'));
` } },
      { title: 'Middleware is composition with a next()', html: `<p>Express/Koa/Redux middleware are functions that receive a <code>next</code> function and decide when to call it. Composing them gives the famous "onion": code before <code>next()</code> runs on the way in, code after it on the way out.</p>${H.table(['order', 'log'], [['1', 'auth in'], ['2', 'timer in'], ['3', 'handler'], ['4', 'timer out'], ['5', 'auth out']])}`, code: { lang: 'js', run: true, code: `
// Koa-style composition: each middleware is (ctx, next) => ...
function composeMiddleware(middlewares) {
  return function run(ctx) {
    function dispatch(i) {
      const mw = middlewares[i];
      if (!mw) return Promise.resolve();
      return Promise.resolve(mw(ctx, () => dispatch(i + 1)));
    }
    return dispatch(0);
  };
}
const log = [];
const auth = async (ctx, next) => { log.push('auth in'); await next(); log.push('auth out'); };
const timer = async (ctx, next) => { log.push('timer in'); await next(); log.push('timer out'); };
const handler = async (ctx) => { log.push('handler'); ctx.body = 'ok'; };

const ctx = {};
composeMiddleware([auth, timer, handler])(ctx).then(() => console.log(log.join(' -> '), '| body:', ctx.body));
` } },
      { title: 'Point-free style (and when it hurts)', html: `<p><b>Point-free</b> means defining a function without naming its argument: <code>const countWords = pipe(trim, splitWords, length)</code> instead of <code>s =&gt; length(splitWords(trim(s)))</code>. It reads nicely for short pipelines. It hurts when:</p><ul><li>stack traces show anonymous arrows, so name your steps;</li><li>a step is variadic, e.g. <code>['1','2','3'].map(parseInt)</code> gives <code>[1, NaN, NaN]</code> because <code>map</code> passes <code>(value, index)</code> and <code>parseInt</code> treats index as the radix;</li><li>the team cannot follow it; readability beats cleverness.</li></ul>`, code: { lang: 'js', run: true, code: `
console.log(['1', '2', '3'].map(parseInt));          // [1, NaN, NaN] - point-free trap
const unary = (fn) => (x) => fn(x);                    // force exactly one argument
console.log(['1', '2', '3'].map(unary(parseInt)));   // [1, 2, 3]
` } }
    ],
    deepDive: `<p>🟣 <b>Why reduce is the right shape.</b> Composition is a <i>monoid</i>: an associative operation (<code>∘</code>) with an identity (<code>x =&gt; x</code>). Any monoid can be folded with <code>reduce</code>, which is exactly why <code>pipe</code> is a one-liner and why seeding with the input makes the empty case correct.</p>
<p><b>Multi-argument first step.</b> Redux's <code>compose</code> lets the <i>rightmost</i> function take many arguments: <code>funcs.reduce((a, b) =&gt; (...args) =&gt; a(b(...args)))</code>. Lodash's <code>flow</code> does the same for the first function. That version builds nested closures once, at compose time, instead of looping at call time — a micro-optimisation that matters only in hot paths.</p>
<p><b>Typing pipe in TypeScript.</b> A fully generic variadic <code>pipe</code> is hard: libraries (fp-ts, Effect, RxJS) ship overloads for up to ~20 functions: <code>pipe&lt;A, B, C&gt;(ab: (a: A) =&gt; B, bc: (b: B) =&gt; C): (a: A) =&gt; C</code>. Effect and fp-ts also offer <code>pipe(value, f, g)</code> (value-first) because it gives better inference.</p>
<p><b>Performance reality.</b> Each stage that maps/filters an array allocates a new array. <code>pipe(filter, map, take(10))</code> over a million items does a million-item pass per step. Fixes: <b>transducers</b>, lazy iterator helpers (<code>Iterator.prototype.map/filter/take</code>, shipped in all major engines by 2025), or a single hand-written loop in hot code. Measure before changing.</p>
<p><b>Error handling.</b> A throwing step aborts the whole pipe, and the stack trace points into <code>reduce</code>. In production pipelines, give steps names, add a <code>tap</code> for logging, or move to a <code>Result</code>/<code>Either</code> type (fp-ts, Effect, neverthrow) where errors become values that later steps can skip.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> asking an assistant to "write pipe and compose" gives you a correct one-liner in seconds, so interviewers now probe <i>understanding</i>: run order, identity case, async steps, the <code>map(parseInt)</code> trap, and when a pipeline is over-engineered.</p>
<p><b>Use AI as a partner:</b> <code>Refactor this 80-line function into a pipe of named pure steps and write one unit test per step</code>; <code>Give me TypeScript overloads for pipe up to 6 functions</code>; <code>Explain the run order of compose(a, b, c)(x) as a table</code>. Agent frameworks are themselves pipelines — retrieve → rerank → prompt → call model → parse → validate — and thinking in composable steps makes them testable.</p>
<p><b>Where AI goes wrong:</b> mixes up <code>reduce</code> and <code>reduceRight</code>, forgets to seed with <code>x</code> (so <code>pipe()</code> throws on empty), or produces point-free code nobody can debug. <b>What you must still own:</b> choosing step boundaries, naming, and deciding when a plain loop is clearer and faster.</p>`,
    problems: [{
      title: 'Implement pipe, compose and pipeAsync',
      level: 'Easy', tags: ['composition', 'reduce', 'higher-order functions'], companies: ['Google', 'Uber', 'Swiggy'],
      statement: `<p>Implement three helpers: <code>pipe(...fns)</code> (left to right), <code>compose(...fns)</code> (right to left) and <code>pipeAsync(...fns)</code> (left to right, where any step may return a Promise; the result is a Promise). With zero functions each must behave as the identity. Throw a <code>TypeError</code> if any argument is not a function.</p>`,
      constraints: `<p>0 ≤ fns.length ≤ 100. Steps are unary.</p>`,
      example: `<p><code>pipe(x =&gt; x + 1, x =&gt; x * 10)(2)</code> → ${H.c('g', '30')} because (2 + 1) · 10. <code>compose(x =&gt; x + 1, x =&gt; x * 10)(2)</code> → ${H.c('b', '21')} because 2 · 10 + 1. <code>pipe()(5)</code> → 5.</p>`,
      brute: { why: `<p>Hard-coding nesting like <code>(x) =&gt; h(g(f(x)))</code> works for exactly three functions only. A loop with an index works too, but it is easy to get the empty case and the direction wrong.</p>`, code: { lang: 'js', run: true, code: `
// Only works for exactly three functions
const pipe3 = (f, g, h) => (x) => h(g(f(x)));
console.log(pipe3((x) => x + 1, (x) => x * 10, (x) => x - 1)(2)); // 29
` } },
      mcq: { q: 'Which built-in makes <code>compose</code> a one-liner?', options: ['<code>Array.prototype.reduceRight</code>', '<code>Array.prototype.sort</code>', '<code>Function.prototype.bind</code>', '<code>Array.prototype.flat</code>'], answer: 0, explain: 'compose applies the last function first, which is exactly a right-to-left fold.' },
      hints: [`<p>Hint 1: think of the value as an accumulator that each function transforms in turn — that is the definition of <code>reduce</code>.</p>`, `<p>Hint 2: seed the reduce with the input <code>x</code>, so an empty list returns <code>x</code> (identity). Use <code>reduceRight</code> for compose.</p>`, `<p>Hint 3: for async, seed with <code>Promise.resolve(x)</code> and chain <code>p.then(fn)</code>; <code>then</code> accepts both sync and async functions. Validate arguments up front so errors happen at build time, not call time.</p>`],
      tests: {"sig":"string int -> string","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 1); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nvar __inc = function (x) { return x + 1; }, __t10 = function (x) { return x * 10; };\nvar __later = function (x) { return new Promise(function (r) { setTimeout(function () { r(x * 2); }, 5); }); };\nfunction chk(kind, x) {\n  return __job(async function () {\n    if (kind === 'pipe') return pipe(__inc, __t10)(x);\n    if (kind === 'compose') return compose(__inc, __t10)(x);\n    if (kind === 'pipe0') return pipe()(x);\n    if (kind === 'compose0') return compose()(x);\n    if (kind === 'pipe1') return pipe(__t10)(x);\n    if (kind === 'async') return pipeAsync(__inc, __later, __t10)(x);\n    if (kind === 'async0') return pipeAsync()(x);\n    if (kind === 'asyncReject') { try { await pipeAsync(__inc, function () { return Promise.reject(new Error('bad')); }, __t10)(x); return 'resolved'; } catch (e) { return e.message; } }\n    if (kind === 'typePipe') { try { pipe(__inc, 42); } catch (e) { return e.name; } return 'none'; }\n    if (kind === 'typeCompose') { try { compose('no'); } catch (e) { return e.name; } return 'none'; }\n    if (kind === 'typeAsync') { try { pipeAsync(null); } catch (e) { return e.name; } return 'none'; }\n    if (kind === 'many') { var fns = []; for (var i = 0; i < 100; i++) fns.push(__inc); return [pipe.apply(null, fns)(x), compose.apply(null, fns)(x), await pipeAsync.apply(null, fns)(x)]; }\n    if (kind === 'order') { var l = []; pipe(function (v) { l.push('a'); return v; }, function (v) { l.push('b'); return v; })(0); compose(function (v) { l.push('c'); return v; }, function (v) { l.push('d'); return v; })(0); return l; }\n  });\n}"},"cases":[[["pipe",2],30],[["compose",2],21],[["pipe0",5],5],[["compose0",5],5],[["pipe1",3],30],[["async",1],40],[["async0",5],5],[["asyncReject",1],"bad"],[["typePipe",0],"TypeError"],[["typeCompose",0],"TypeError"],[["typeAsync",0],"TypeError"],[["many",-50],[50,50,50]],[["order",0],["a","b","d","c"]],[["pipe",-1],0]]},
      solution: {
        approach: `<p>Validate once when building, return a closure that folds the functions over the input. Async version folds over a promise chain.</p>`,
        code: { lang: 'js', run: true, code: `
function assertFns(fns, name) {
  fns.forEach((fn, i) => {
    if (typeof fn !== 'function') throw new TypeError(name + ': argument ' + i + ' is not a function');
  });
}
function pipe(...fns) {
  assertFns(fns, 'pipe');
  return (x) => fns.reduce((acc, fn) => fn(acc), x);
}
function compose(...fns) {
  assertFns(fns, 'compose');
  return (x) => fns.reduceRight((acc, fn) => fn(acc), x);
}
function pipeAsync(...fns) {
  assertFns(fns, 'pipeAsync');
  return (x) => fns.reduce((p, fn) => p.then(fn), Promise.resolve(x));
}

const inc = (x) => x + 1, times10 = (x) => x * 10;
console.log(pipe(inc, times10)(2), compose(inc, times10)(2), pipe()(5), compose()(5));
try { pipe(inc, 42); } catch (e) { console.log(e.name + ':', e.message); }
const later = (x) => new Promise((r) => setTimeout(() => r(x * 2), 10));
pipeAsync(inc, later, times10)(1).then((v) => console.log('async:', v)); // ((1+1)*2)*10 = 40
` },
        dry: { head: ['call', 'acc before', 'fn', 'acc after'], rows: [['pipe(inc, times10)(2)', '2', 'inc', '3'], ['', '3', 'times10', H.c('g', '30')], ['compose(inc, times10)(2)', '2', 'times10', '20'], ['', '20', 'inc', H.c('b', '21')]] },
        complexity: `<p>Building: O(k) to validate k functions. Calling: O(k) function calls plus whatever the steps cost. Space O(1) extra for sync, O(k) promise objects for async.</p>`,
        followUps: ['Allow the first function in pipe to take multiple arguments.', 'Make pipeAsync stop early and return a default if any step returns <code>null</code>.', 'Write TypeScript overloads so the types flow through the pipeline.']
      }
    }]
  });

  /* ================= TOPIC 4: Currying & partial application ================= */
  topics.push({
    title: 'Currying & Partial Application',
    analogy: `<p>Ordering at a <b>sandwich counter</b>: the server asks one question at a time. "Which bread?" — <i>wheat</i>. "Which filling?" — <i>paneer</i>. "Which sauce?" — <i>mint</i>. Only after the last answer do you get the sandwich. Between questions the server <b>remembers</b> what you already said.</p>
<p>That is <b>currying</b>: a function that takes its arguments one at a time and remembers the earlier ones. <b>Partial application</b> is a regular customer who says "my usual bread and filling" up front, so only the sauce question is left.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A normal function takes all its arguments at once: <code>add(1, 2, 3)</code>. A <b>curried</b> version takes them one at a time and returns a new function after each, until it has enough: <code>add(1)(2)(3)</code>.</p>
<pre>const add  = (a, b, c) =&gt; a + b + c;          // normal
const addC = (a) =&gt; (b) =&gt; (c) =&gt; a + b + c;  // curried by hand
addC(1)(2)(3); // 6</pre>
<p>Each inner arrow is a <b>closure</b>: it remembers <code>a</code> and <code>b</code> from the outer calls (see the Closures module). That memory is the whole trick.</p>
${H.table(['Term', 'Meaning', 'Example'], [
  ['<b>Arity</b>', 'how many parameters a function expects (<code>fn.length</code>)', '<code>add.length === 3</code>'],
  ['<b>Currying</b>', 'turn an n-arity function into n one-argument functions', '<code>add(1)(2)(3)</code>'],
  ['<b>Partial application</b>', 'fix <i>some</i> arguments now, get a function for the rest', '<code>const add10 = add.bind(null, 10)</code>'],
  ['<b>Auto-curry</b> (lodash/Ramda style)', 'accept any grouping: <code>f(1)(2)(3)</code>, <code>f(1, 2)(3)</code>, <code>f(1)(2, 3)</code>', 'generic <code>curry(fn)</code> helper']
])}
<p>🔵 <b>How a generic curry works.</b> Keep collecting arguments; as soon as you have at least <code>fn.length</code> of them, call the original function.</p>
<pre>function curry(fn) {
  return function curried(...args) {
    if (args.length &gt;= fn.length) return fn.apply(this, args);  // enough → run
    return (...more) =&gt; curried.apply(this, [...args, ...more]); // not enough → wait
  };
}</pre>
${H.table(['call', 'args collected', 'enough? (need 3)', 'returns'], [['<code>c(1)</code>', '[1]', H.c('r', 'no'), 'a new function'], ['<code>(2, 3)</code>', '[1, 2, 3]', H.c('g', 'yes'), H.c('g', 'add(1, 2, 3) = 6')]])}
<p><b>Why bother?</b></p>
<ul>
<li><b>Specialise general functions:</b> <code>const isAdult = gte(18)</code>, <code>const logError = log('ERROR')</code>, <code>const getJSON = request('GET')({ accept: 'json' })</code>.</li>
<li><b>Make functions composable:</b> <code>pipe</code> needs one-argument steps. <code>map(double)</code>, <code>filter(isEven)</code> become pipeline steps once curried with <b>data last</b>.</li>
<li><b>Configure once, use many times:</b> dependency injection without classes: <code>const makeRepo = (db) =&gt; (table) =&gt; (id) =&gt; db.get(table, id)</code>.</li>
</ul>
<p><b>Design rule — data last.</b> Put the things that change least first (config, the operation) and the data last. <code>map(fn)(list)</code> composes; <code>map(list)(fn)</code> does not.</p>`,
    clues: ['"Implement curry so that f(1)(2)(3) === f(1, 2)(3) === f(1, 2, 3)" → generic curry using fn.length', '"sum(1)(2)(3)() / infinite currying" → recursion that stops on an empty call (or valueOf)', '"Pre-fill some arguments" / "create add10 from add" → partial application, bind', '"Make this function usable in a pipeline" → curry, data-last argument order', '"Remembers previous arguments between calls" → closures', '"Support placeholders like _ " (lodash curry) → curry with placeholder merge'],
    code: [{ lang: 'js', run: true, title: 'Generic curry + partial application', code: `
function curry(fn) {
  return function curried(...args) {
    // enough arguments collected -> call the real function (keep 'this')
    if (args.length >= fn.length) return fn.apply(this, args);
    // otherwise return a function that remembers args and waits for more
    return function (...more) {
      return curried.apply(this, args.concat(more));
    };
  };
}

const volume = (l, w, h) => l * w * h;
const cv = curry(volume);
console.log(cv(2)(3)(4), cv(2, 3)(4), cv(2)(3, 4), cv(2, 3, 4)); // 24 x4

// Partial application: fix the first argument(s) now
const partial = (fn, ...preset) => (...later) => fn(...preset, ...later);
const area10 = partial(volume, 10);       // l = 10 fixed
console.log('partial:', area10(2, 3));    // 60

// bind also does left-to-right partial application (and fixes 'this')
const withL5 = volume.bind(null, 5);
console.log('bind:', withL5(2, 2));       // 20

// Data-last curried helpers compose beautifully
const map = curry((fn, xs) => xs.map(fn));
const filter = curry((pred, xs) => xs.filter(pred));
const pipe = (...fns) => (x) => fns.reduce((a, f) => f(a), x);
const evensDoubled = pipe(filter((n) => n % 2 === 0), map((n) => n * 2));
console.log(evensDoubled([1, 2, 3, 4, 5, 6])); // [4, 8, 12]
` }, { lang: 'js', run: true, title: 'Infinite currying: sum(1)(2)(3)()', code: `
// Version A: stop when called with no arguments
function sum(a) {
  return function next(b) {
    if (b === undefined) return a;  // empty call ends the chain
    return sum(a + b);              // keep the running total in a new closure
  };
}
console.log('sum(1)(2)(3)() =', sum(1)(2)(3)());

// Version B: no terminating (), uses valueOf / Symbol.toPrimitive
function add(...first) {
  let total = first.reduce((s, x) => s + x, 0);
  const inner = (...more) => { total += more.reduce((s, x) => s + x, 0); return inner; };
  inner[Symbol.toPrimitive] = () => total; // used by +, ==, template strings
  return inner;
}
console.log('+add(1)(2, 3)(4) =', +add(1)(2, 3)(4));
console.log('add(5)(5) == 10 ?', add(5)(5) == 10);
` }],
    codeTitle: ['curry / partial / bind (runnable)', 'Infinite currying (runnable)'],
    viz: [{
      title: 'Curry collecting arguments call by call',
      input: '2 | 3 | 4',
      inputLabel: 'Argument groups for curried volume(l, w, h), groups split by | (e.g. 2 3 | 4)',
      gen: function (input) {
        var groups = String(input || '').split('|').map(function (g) { return g.trim(); });
        if (groups.length > 6) throw new Error('Use at most 6 call groups');
        var parsed = groups.map(function (g) {
          if (g === '') return [];
          var a = g.split(/[\s,]+/).map(Number);
          if (a.some(isNaN)) throw new Error('Each group must contain numbers, e.g. 2 | 3 4');
          if (a.length > 4) throw new Error('At most 4 numbers per group');
          return a;
        });
        var ARITY = 3;
        var curSrc = 'function curry(fn) {               // fn = volume, fn.length = 3\n  return function curried(...args) {\n    if (args.length >= fn.length) return fn.apply(this, args);\n    return (...more) => curried.apply(this, [...args, ...more]);\n  };\n}\nconst volume = (l, w, h) => l * w * h;\nconst cv = curry(volume);';
        var callExpr = 'cv' + parsed.map(function (g) { return '(' + g.join(', ') + ')'; }).join('');
        var frames = [];
        frames.push(fr('<code>curry(volume)</code> returns <code>curried</code>. Nothing has been multiplied yet. volume needs <b>' + ARITY + '</b> arguments (<code>fn.length</code>). We will evaluate <code>' + callExpr + '</code> one call at a time and watch the closures remember arguments.', [
          cp(curSrc, { 8: 'cur' }),
          vp({ 'fn.length': ARITY, collected: '[]', result: '—' }),
          { type: 'stack', label: 'Closures alive (bottom = oldest)', items: ['curried (no args yet)'] }
        ]));
        var collected = [], closures = ['curried (no args yet)'], done = false, result = null;
        for (var k = 0; k < parsed.length; k++) {
          var g = parsed[k];
          if (done) {
            frames.push(fr('Call #' + (k + 1) + ' <code>(' + g.join(', ') + ')</code>: but the previous call already returned the <b>number ' + result + '</b>, not a function. <span class="c-r">TypeError: cv(...)(...) is not a function.</span> A curried function stops being callable once it has enough arguments.', [
              cp(curSrc, {}),
              vp({ collected: '[' + collected.join(', ') + ']', result: result }, { result: 'bad' }),
              { type: 'stack', label: 'Closures alive', items: closures.slice(), hl: {} }
            ]));
            return frames;
          }
          var before = collected.slice();
          collected = collected.concat(g);
          var enough = collected.length >= ARITY;
          var sHl = {};
          frames.push(fr('Call #' + (k + 1) + ' with <code>(' + g.join(', ') + ')</code>. The closure already remembered <b>[' + before.join(', ') + ']</b>; merge → <code>args = [' + collected.join(', ') + ']</code>. Check line 3: is ' + collected.length + ' ≥ ' + ARITY + '?', [
            cp(curSrc, { 3: 'cur', 4: before.length ? 'cur' : '' }),
            vp({ 'fn.length': ARITY, 'remembered': '[' + before.join(', ') + ']', 'new args': '[' + g.join(', ') + ']', collected: '[' + collected.join(', ') + ']' }, { collected: 'cur' }),
            { type: 'array', label: 'args so far (slots needed: ' + ARITY + ')', values: collected.length ? collected.slice() : ['(empty)'], hl: collected.reduce(function (h, v, i) { h[i] = i >= before.length ? 'ok' : 'done'; return h; }, {}) }
          ]));
          if (enough) {
            var used = collected.slice(0, ARITY);
            result = used[0] * used[1] * used[2];
            done = true;
            sHl[closures.length] = 'ok';
            closures.push('volume(' + collected.join(', ') + ') → ' + result);
            frames.push(fr('Yes, ' + collected.length + ' ≥ ' + ARITY + ', so line 3 runs <code>volume(' + collected.join(', ') + ')</code> = ' + used.join(' × ') + ' = <b>' + result + '</b>.' + (collected.length > ARITY ? ' (Extra arguments are passed too; volume simply ignores them.)' : '') + ' Every earlier closure is now garbage unless someone kept a reference to it.', [
              cp(curSrc, { 3: 'ok' }),
              vp({ collected: '[' + collected.join(', ') + ']', result: result }, { result: 'sel' }),
              { type: 'stack', label: 'Closures alive (bottom = oldest)', items: closures.slice(), hl: sHl }
            ]));
          } else {
            sHl[closures.length] = 'cur';
            closures.push('closure remembers [' + collected.join(', ') + ']');
            frames.push(fr('No, only ' + collected.length + ' of ' + ARITY + '. Line 4 returns a <b>new arrow function</b> that closes over <code>args = [' + collected.join(', ') + ']</code>. ' + (g.length === 0 ? 'An empty call added nothing, so we just got an equivalent function back.' : 'This closure is the server "remembering" your earlier answers.'), [
              cp(curSrc, { 4: 'cur' }),
              vp({ collected: '[' + collected.join(', ') + ']', 'still need': ARITY - collected.length, result: 'a function' }, { 'still need': 'cur' }),
              { type: 'stack', label: 'Closures alive (bottom = oldest)', items: closures.slice(), hl: sHl }
            ]));
          }
        }
        if (!done) {
          frames.push(fr('The calls ran out after collecting <b>[' + collected.join(', ') + ']</b>. The value of <code>' + callExpr + '</code> is still a <b>function</b> waiting for ' + (ARITY - collected.length) + ' more argument(s). That is partial application: you can store it, e.g. <code>const box = ' + callExpr + '</code>, and call it later.', [
            vp({ collected: '[' + collected.join(', ') + ']', result: 'function (waiting)' }, { result: 'win' }),
            { type: 'stack', label: 'Closures alive', items: closures.slice(), hl: { 0: 'done' } }
          ]));
        } else {
          frames.push(fr('Summary: <code>' + callExpr + '</code> = <b>' + result + '</b>. The same answer comes from <code>cv(2)(3)(4)</code>, <code>cv(2, 3)(4)</code>, <code>cv(2)(3, 4)</code> and <code>cv(2, 3, 4)</code> — auto-curry accepts any grouping because it only counts arguments.', [
            { type: 'table', label: 'Groupings that give the same result', columns: ['call', 'closures created'], rows: [['cv(2)(3)(4)', '2'], ['cv(2, 3)(4)', '1'], ['cv(2)(3, 4)', '1'], ['cv(2, 3, 4)', '0']] }
          ]));
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Specialised helpers from one general function', html: `<p>A curried, config-first logger lets you create many small loggers without repeating yourself:</p>${H.table(['Created with', 'Prints'], [['<code>log(\'ERROR\')(\'payments\')</code>', '[ERROR][payments] message'], ['<code>log(\'INFO\')(\'auth\')</code>', '[INFO][auth] message']])}<p>This is the "configure once, use many times" pattern, and it is how many SDKs build clients.</p>`, code: { lang: 'js', run: true, code: `
const log = (level) => (area) => (msg) => '[' + level + '][' + area + '] ' + msg;
const payErr = log('ERROR')('payments');
const authInfo = log('INFO')('auth');
console.log(payErr('card declined'));
console.log(authInfo('user signed in'));

const between = (lo) => (hi) => (x) => x >= lo && x <= hi;
const isTeen = between(13)(19);
console.log([9, 13, 17, 21].filter(isTeen)); // [13, 17]
` } },
      { title: 'The fn.length trap: defaults and rest parameters', html: `<p>Generic curry trusts <code>fn.length</code>, but <code>length</code> counts only parameters <b>before the first default or rest</b>.</p>${H.table(['function', 'fn.length'], [['<code>(a, b, c) =&gt; 0</code>', '3'], ['<code>(a, b = 2, c) =&gt; 0</code>', H.c('r', '1')], ['<code>(...xs) =&gt; 0</code>', H.c('r', '0')], ['<code>(a, ...xs) =&gt; 0</code>', '1']])}<p>So <code>curry((a, b = 1) =&gt; a + b)</code> runs after the first argument. Fix: let the caller pass the arity explicitly: <code>curry(fn, arity = fn.length)</code>.</p>`, code: { lang: 'js', run: true, code: `
console.log(((a, b, c) => 0).length, ((a, b = 2, c) => 0).length, ((...xs) => 0).length);
function curryN(fn, arity = fn.length) {
  return function curried(...args) {
    if (args.length >= arity) return fn.apply(this, args);
    return (...more) => curried.apply(this, args.concat(more));
  };
}
const sumAll = (...xs) => xs.reduce((a, b) => a + b, 0);
console.log(curryN(sumAll, 3)(1)(2)(3)); // 6 (arity given explicitly)
` } },
      { title: 'Currying keeps this (method currying)', html: `<p>A good curry passes <code>this</code> through with <code>apply(this, ...)</code>. If you use arrow functions everywhere and call <code>fn(...args)</code>, curried <i>methods</i> lose their object.</p><p>${H.c('y', 'Rule: inside curry, use function expressions + fn.apply(this, args).')}</p>`, code: { lang: 'js', run: true, code: `
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn.apply(this, args);
    return function (...more) { return curried.apply(this, args.concat(more)); };
  };
}
const shop = {
  taxRate: 0.18,
  price: curry(function (base, qty) { return base * qty * (1 + this.taxRate); })
};
console.log(shop.price(100)(2));  // NaN: the final call has no object, so this.taxRate is undefined
const step = shop.price(100);
console.log(step.call(shop, 2));   // 236: 'this' must be supplied on the final call
` } },
      { title: 'Currying vs partial application side by side', html: `${H.table(['', 'Currying', 'Partial application'], [['returns', 'a chain of unary functions', 'one function taking the rest'], ['calls needed', 'one per argument (or any grouping with auto-curry)', 'exactly one more call'], ['built-in', 'none', '<code>fn.bind(thisArg, ...preset)</code>'], ['typical use', 'pipelines, point-free', 'pre-filling config, event handlers']])}<p>In interviews, say "curry turns an n-ary function into nested unary ones; partial application fixes some arguments and returns a function of the rest — curried functions make partial application trivial."</p>` }
    ],
    deepDive: `<p>🟣 <b>Origin.</b> Named after logician Haskell Curry (idea also from Moses Schönfinkel). In Haskell and ML every function is curried automatically; JavaScript is not, so we write helpers.</p>
<p><b>Placeholders.</b> Lodash/Ramda support <code>curry(fn)(_, 2)(1)</code>: a placeholder reserves a slot. Implementation: keep an array of slots; on each call, fill placeholders from left to right with new arguments, then append the rest; the function is "ready" when the first <code>arity</code> slots contain no placeholders. That is a common Hard follow-up (see practice).</p>
<p><b>Cost.</b> Every partial call allocates a closure and an args array. In a hot loop called millions of times, <code>cv(a)(b)(c)</code> is measurably slower than <code>volume(a, b, c)</code>, and V8 may not inline through <code>apply</code> with spread. Curry at <i>setup time</i> (create <code>isTeen</code> once), not inside tight loops.</p>
<p><b>Readability and types.</b> Deep curry chains hurt stack traces and TypeScript inference. TypeScript can type a fixed-arity curry with overloads or recursive conditional types (<code>Curried&lt;[A, B, C], R&gt;</code>), but the error messages get scary; many teams prefer explicit small closures (<code>(x) =&gt; between(13, 19, x)</code>) over a generic curry utility.</p>
<p><b>Real usage today:</b> React hooks and event handlers (<code>onClick={select(id)}</code> where <code>select = (id) =&gt; () =&gt; ...</code>), Redux middleware signature <code>store =&gt; next =&gt; action =&gt; ...</code> (a hand-curried function), styled-components/tagged templates, and dependency injection in functional backends.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "implement curry" is a top-10 frontend machine-coding question, and every assistant knows the textbook answer. Interviewers therefore twist it: placeholders, <code>fn.length</code> with defaults, infinite currying with <code>valueOf</code>, preserving <code>this</code>, or "explain what closures exist after <code>cv(2)(3)</code>".</p>
<p><b>Use AI as a partner:</b> <code>Generate 10 edge-case calls for my curry implementation (empty calls, extra args, defaults, this)</code>; <code>Type this curry helper in TypeScript for up to 4 arguments</code>; <code>Should this API be curried? Argue both sides.</code></p>
<p><b>Where AI goes wrong:</b> uses <code>fn(...args)</code> and silently drops <code>this</code>; mutates a shared <code>args</code> array so <code>const a = cv(1); a(2)(3); a(5)(6)</code> leaks state between branches; over-curries everything making code unreadable. <b>What you must still own:</b> closure reasoning, knowing that each partial call must create a <i>new</i> args array, and the taste to use currying only where it improves composition.</p>`,
    problems: [{
      title: 'Implement curry (any grouping, keeps this, no shared state)',
      level: 'Medium', tags: ['currying', 'closures', 'higher-order functions'], companies: ['Amazon', 'Flipkart', 'Microsoft', 'PhonePe'],
      statement: `<p>Implement <code>curry(fn)</code>. The returned function accepts arguments in any grouping and calls <code>fn</code> once it has collected at least <code>fn.length</code> arguments. Requirements: (1) <code>this</code> from the final call is passed to <code>fn</code>; (2) partially applied functions are <b>reusable</b> — <code>const p = c(1); p(2)(3); p(5)(6)</code> must not interfere; (3) calling with zero arguments returns an equivalent function.</p>`,
      constraints: `<p>fn.length ≤ 10. Do not use libraries.</p>`,
      example: `<p><code>const c = curry((a, b, c) =&gt; a + b + c)</code><br><code>c(1)(2)(3)</code> → ${H.c('g', '6')}, <code>c(1, 2)(3)</code> → ${H.c('g', '6')}, <code>const p = c(10); p(1)(1)</code> → ${H.c('g', '12')} and then <code>p(5)(5)</code> → ${H.c('g', '20')} (not 22 — no leaked state).</p>`,
      brute: { why: `<p>A version that pushes into one shared array works for the first chain, but reusing a partial function sees arguments left over from the previous chain. It also forgets <code>this</code>.</p>`, code: { lang: 'js', run: true, code: `
function curryBuggy(fn) {
  const args = [];                       // ONE array shared by every call: bug
  return function step(...more) {
    args.push(...more);
    return args.length >= fn.length ? fn(...args) : step; // also drops 'this'
  };
}
const c = curryBuggy((a, b, cc) => a + b + cc);
const p = c(10);
console.log(p(1)(1));       // 12, looks fine
console.log(p(5));          // 10 + 1 + 1 + 5 -> already "complete": returns 12 again, wrong
` } },
      mcq: { q: 'Why must each partial call create a NEW array instead of pushing into the old one?', options: ['So that a stored partial function can be reused without seeing arguments from other chains', 'Because arrays are immutable in JavaScript', 'To make fn.length correct', 'It does not matter'], answer: 0, explain: 'Closures share whatever they reference. A fresh array per call (concat/spread) gives each branch its own snapshot.' },
      hints: [`<p>Hint 1: the function you return must remember the args collected so far — that is a closure over an array that is never mutated.</p>`, `<p>Hint 2: compare <code>args.length</code> with <code>fn.length</code>; if enough, call <code>fn.apply(this, args)</code>, else return a function that calls <code>curried</code> with <code>args.concat(more)</code>.</p>`, `<p>Hint 3: use <code>function</code> expressions (not arrows) for the returned functions so <code>this</code> is the caller's <code>this</code>; pass it along with <code>apply</code>. Zero-arg call: concat adds nothing, so you just get an equivalent function.</p>`],
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var c = curry(function (a, b, cc) { return a + b + cc; });\n  if (k === 'groupings') return [c(1)(2)(3), c(1, 2)(3), c(1)(2, 3), c(1, 2, 3), c()(1)()(2, 3)];\n  if (k === 'reuse') { var p = c(10); return [p(1)(1), p(5)(5), p(1)(1)]; }\n  if (k === 'this') { var counter = { base: 100, add: curry(function (x, y) { return this.base + x + y; }) }; var half = counter.add(1); return [half.call(counter, 2), counter.add(1, 2)]; }\n  if (k === 'extra') { return curry(function (a, b) { return [].slice.call(arguments); })(1)(2, 3, 4); }\n  if (k === 'arity0') return curry(function () { return 'ran'; })();\n  if (k === 'arity1') return curry(function (a) { return a * 2; })(21);\n  if (k === 'strings') return curry(function (a, b) { return a + '-' + b; })('x')('y');\n  if (k === 'ten') { var f = curry(function (a, b, c2, d, e, f2, g, h, i, j) { return a + b + c2 + d + e + f2 + g + h + i + j; }); return [f(1)(2)(3)(4)(5)(6)(7)(8)(9)(10), f(1, 2, 3)(4, 5, 6, 7)(8, 9, 10)]; }\n  if (k === 'partialIsFunction') return typeof c(1) + typeof c(1)(2);\n  if (k === 'lengthOneAfter') { var q = curry(function (a, b) { return a - b; }); var m = q(5); return [m(1), m(2), m(5)]; }\n}"},"cases":[[["groupings"],[6,6,6,6,6]],[["reuse"],[12,20,12]],[["this"],[103,103]],[["extra"],[1,2,3,4]],[["arity0"],"ran"],[["arity1"],42],[["strings"],"x-y"],[["ten"],[55,55]],[["partialIsFunction"],"functionfunction"],[["lengthOneAfter"],[4,3,0]]]},
      solution: {
        approach: `<p>Recursive closure: <code>curried(...args)</code> either finishes or returns a new function whose own closure holds a <i>new</i> array <code>args.concat(more)</code>. Nothing is ever mutated, so branches never interfere.</p>`,
        code: { lang: 'js', run: true, code: `
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);           // keep the caller's this
    }
    return function (...more) {
      return curried.apply(this, args.concat(more)); // NEW array each time
    };
  };
}

const c = curry((a, b, cc) => a + b + cc);
console.log(c(1)(2)(3), c(1, 2)(3), c(1)(2, 3), c()(1)()(2, 3));
const p = c(10);
console.log(p(1)(1), p(5)(5));               // 12 20: no shared state

const counter = { base: 100, add: curry(function (x, y) { return this.base + x + y; }) };
const half = counter.add(1);
console.log(half.call(counter, 2));           // 103: 'this' flows to fn
` },
        dry: { head: ['call', 'args (closure)', 'enough?', 'returns'], rows: [['p = c(10)', '[10]', 'no (1 < 3)', 'fn A remembering [10]'], ['p(1)', '[10, 1] (new array)', 'no', 'fn B remembering [10, 1]'], ['B(1)', '[10, 1, 1]', 'yes', H.c('g', '12')], ['p(5)(5)', '[10, 5, 5]', 'yes', H.c('g', '20 — p still holds only [10]')]] },
        complexity: `<p>Each call costs O(k) to copy the k arguments collected so far, so a full one-at-a-time chain for arity n is O(n<sup>2</sup>) element copies — negligible for n ≤ 10. Space O(n) per live branch.</p>`,
        followUps: ['Support placeholders: <code>c(_, 2)(1, 3)</code>.', 'Accept an explicit arity for functions with default/rest parameters.', 'Write <code>uncurry</code>.']
      }
    }]
  });

  /* ================= TOPIC 5: Memoization ================= */
  topics.push({
    title: 'Memoization: Caching Pure Function Results',
    analogy: `<p>A maths teacher asks you <b>37 × 43</b>. You work it out on paper: 1591. Five minutes later she asks again. You do not redo the multiplication — you glance at the <b>sticky note</b> where you wrote "37 × 43 = 1591".</p>
<p>Memoization is that sticky note for functions: the first time you compute an answer, write it down next to its inputs; next time the same inputs show up, just read the note. It only works if the answer <b>never changes</b> for the same question — so only for pure functions.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <b>Memoize</b> = wrap a function so it remembers (caches) results by their arguments. A repeat call with the same arguments returns the saved result instantly instead of recomputing.</p>
<pre>function memoize(fn) {
  const cache = new Map();             // argument → result
  return function (x) {
    if (cache.has(x)) return cache.get(x);   // HIT: reuse
    const result = fn(x);                     // MISS: compute once
    cache.set(x, result);
    return result;
  };
}</pre>
<p>🔵 <b>The four questions every memoize must answer:</b></p>
${H.table(['Question', 'Simple answer', 'Better answer'], [
  ['What is the <b>key</b>?', 'the single argument', 'multi-arg: <code>JSON.stringify(args)</code> (only for primitives) or a nested <code>Map</code>/<code>WeakMap</code> trie keyed by each argument'],
  ['Is the function <b>pure</b>?', 'assume yes', 'if it reads time/random/globals, memoizing returns stale answers — do not'],
  ['How big can the cache get?', 'unbounded', H.c('y', 'bound it') + ': LRU with max size, or TTL expiry, or <code>WeakMap</code> for object keys so GC can clean up'],
  ['What about <b>errors</b> and <b>promises</b>?', 'cache whatever comes back', 'cache the in-flight promise (dedupes concurrent calls) but delete it if it rejects']
])}
<p><b>The classic win: recursion with overlapping sub-problems.</b> Naive <code>fib(n)</code> recomputes the same values exponentially many times. Memoized, each <code>fib(k)</code> is computed once:</p>
${H.table(['n', 'naive fib calls', 'memoized calls'], [['10', '177', '19'], ['20', '21,891', '39'], ['30', '2,692,537', '59'], ['40', H.c('r', '331,160,281'), H.c('g', '79')]])}
<p>That is the bridge to <b>dynamic programming</b>: top-down DP = recursion + memoization.</p>
<p><b>Where you meet it in real code:</b> React's <code>useMemo</code>/<code>useCallback</code>/<code>React.memo</code> (and the React Compiler, which auto-memoizes components), Reselect selectors (memoize-one: cache only the last arguments), GraphQL DataLoader (per-request promise cache), and expensive formatting like <code>Intl.NumberFormat</code> instances.</p>
<p><b>Memoize when:</b> the function is pure, called often with repeating arguments, and expensive compared with a cache lookup. <b>Do not</b> memoize cheap functions (the hashing costs more than the work) or functions whose arguments are always new objects (every call misses and the cache only grows).</p>`,
    clues: ['"Implement memoize" / "cache results of an expensive function" → Map keyed by arguments', '"Same inputs called repeatedly" / "overlapping subproblems" → memoization / top-down DP', '"Avoid duplicate network requests for the same id" → cache the in-flight promise', '"Memory keeps growing" in a memoized app → unbounded cache: add LRU/TTL/WeakMap', '"Re-render only when props change" (React.memo, useMemo, reselect) → reference-equality memoization', '"Function with object arguments" → WeakMap key or a resolver function'],
    code: [{ lang: 'js', run: true, title: 'memoize with multi-argument keys and a resolver', code: `
// Generic memoize: cache keyed by a resolver (default: JSON of primitive args)
function memoize(fn, resolver = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  function memoized(...args) {
    const key = resolver.apply(this, args);
    if (cache.has(key)) { memoized.hits++; return cache.get(key); }
    memoized.misses++;
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  }
  memoized.cache = cache;   // expose for clearing / inspection (lodash does this)
  memoized.hits = 0;
  memoized.misses = 0;
  return memoized;
}

let work = 0;
const slowAdd = (a, b) => { work++; for (let i = 0; i < 1e6; i++); return a + b; };
const fastAdd = memoize(slowAdd);
console.log(fastAdd(2, 3), fastAdd(2, 3), fastAdd(3, 2));
console.log('real work done:', work, '| hits:', fastAdd.hits, '| misses:', fastAdd.misses);

// Recursive memoization: the recursive call must go through the memoized version
const fib = memoize((n) => (n < 2 ? n : fib(n - 1) + fib(n - 2)));
console.log('fib(90) =', fib(90), '| cache size:', fib.cache.size);

// Naive version for comparison (count calls)
let naiveCalls = 0;
const fibNaive = (n) => { naiveCalls++; return n < 2 ? n : fibNaive(n - 1) + fibNaive(n - 2); };
fibNaive(25);
console.log('naive fib(25) made', naiveCalls, 'calls');
` }, { lang: 'js', run: true, title: 'Object arguments: WeakMap trie keyed by reference', code: `
// Works for any argument types, including objects and functions.
// Objects go into WeakMaps so the cache never keeps them alive.
function memoizeDeep(fn) {
  const root = { weak: new WeakMap(), strong: new Map(), hasValue: false, value: undefined };
  const isObj = (v) => (typeof v === 'object' && v !== null) || typeof v === 'function';
  return function (...args) {
    let node = root;
    for (const arg of args) {
      const store = isObj(arg) ? node.weak : node.strong;
      let next = store.get(arg);
      if (!next) {
        next = { weak: new WeakMap(), strong: new Map(), hasValue: false, value: undefined };
        store.set(arg, next);
      }
      node = next;
    }
    if (!node.hasValue) { node.value = fn.apply(this, args); node.hasValue = true; }
    return node.value;
  };
}

let calls = 0;
const fullName = memoizeDeep((user, sep) => { calls++; return user.first + sep + user.last; });
const u = { first: 'Asha', last: 'Rao' };
console.log(fullName(u, ' '), fullName(u, ' '), fullName(u, '_'));
console.log(fullName({ first: 'Asha', last: 'Rao' }, ' ')); // different object -> new entry
console.log('computed', calls, 'times (expected 3)');
` }],
    codeTitle: ['memoize + stats (runnable)', 'WeakMap trie memoize (runnable)'],
    viz: [{
      title: 'Memoized fib(n): call stack + cache',
      input: '6',
      inputLabel: 'n for fib(n) (0 to 10)',
      gen: function (input) {
        var n = Number(String(input).trim());
        if (String(input).trim() === '' || !Number.isInteger(n) || n < 0 || n > 10) throw new Error('Enter an integer n between 0 and 10');
        var frames = [], cache = [], stack = [], calls = 0, hits = 0;
        var src = 'const memo = new Map();\nfunction fib(n) {\n  if (memo.has(n)) return memo.get(n); // hit\n  const r = n < 2 ? n : fib(n - 1) + fib(n - 2);\n  memo.set(n, r);                     // remember\n  return r;\n}';
        function naive(k) { return k < 2 ? 1 : 1 + naive(k - 1) + naive(k - 2); }
        function snap(narr, line, cls, hlKey) {
          var mh = {}; if (hlKey !== undefined) mh[String(hlKey)] = cls === 'bad' ? 'ok' : cls;
          var sh = {}; if (stack.length) sh[stack.length - 1] = 'cur';
          var lh = {}; lh[line] = cls;
          frames.push(fr(narr, [
            cp(src, lh),
            { type: 'stack', label: 'Call stack (top = running)', items: stack.length ? stack.slice() : ['(empty)'], hl: sh },
            { type: 'map', label: 'memo cache (n → fib(n))', entries: cache.map(function (e) { return [String(e[0]), e[1]]; }), hl: mh },
            vp({ 'calls so far': calls, 'cache hits': hits }, {})
          ]));
        }
        function has(k) { for (var i = 0; i < cache.length; i++) if (cache[i][0] === k) return i; return -1; }
        function fib(k) {
          calls++;
          stack.push('fib(' + k + ')');
          var at = has(k);
          if (at >= 0) {
            hits++;
            snap('Call <code>fib(' + k + ')</code>: <span class="c-g">cache HIT</span> — the sticky note already says fib(' + k + ') = <b>' + cache[at][1] + '</b>. Return it immediately, no recursion.', 3, 'ok', k);
            stack.pop();
            return cache[at][1];
          }
          snap('Call <code>fib(' + k + ')</code>: <span class="c-y">cache MISS</span>. ' + (k < 2 ? 'Base case: fib(' + k + ') = ' + k + '.' : 'Must compute fib(' + (k - 1) + ') + fib(' + (k - 2) + ').'), 4, 'cur');
          var r = k < 2 ? k : fib(k - 1) + fib(k - 2);
          cache.push([k, r]);
          snap('<code>fib(' + k + ')</code> = <b>' + r + '</b>. Store it in the cache (line 5) so nobody computes it again, then return.', 5, 'ok', k);
          stack.pop();
          return r;
        }
        snap('Start: empty cache. We call <code>fib(' + n + ')</code>. Watch how the left branch fills the cache and the right branches become instant hits.', 2, 'cur');
        var res = fib(n);
        var nv = naive(n);
        frames.push(fr('Done: fib(' + n + ') = <b>' + res + '</b> using <b>' + calls + '</b> calls (' + hits + ' were cache hits). The naive version makes <b>' + nv + '</b> calls for the same n. Each sub-problem was computed exactly once → O(n) time, O(n) cache.', [
          { type: 'bars', label: 'number of calls', values: [nv, calls], idxLabels: ['naive', 'memoized'], hl: { 0: 'bad', 1: 'ok' } },
          { type: 'map', label: 'final cache', entries: cache.map(function (e) { return [String(e[0]), e[1]]; }) }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Memoizing an async lookup (dedupe + evict on failure)', html: `<p>Cache the <b>promise</b>, not the value. Then two components asking for user 7 at the same moment share one network request. If the request fails, delete the entry so the next call can retry instead of being stuck with a cached error.</p>${H.table(['call', 'cache', 'network'], [['getUser(7) #1', 'store pending promise', H.c('y', '1 request')], ['getUser(7) #2 (same tick)', 'hit: same promise', H.c('g', '0 new')], ['getUser(9) fails', 'entry deleted on reject', 'next call retries']])}`, code: { lang: 'js', run: true, code: `
function memoizeAsync(fn) {
  const cache = new Map();
  return (key) => {
    if (cache.has(key)) return cache.get(key);
    const p = fn(key).catch((err) => { cache.delete(key); throw err; }); // do not cache failures
    cache.set(key, p);
    return p;
  };
}
let requests = 0;
const fakeFetch = (id) => new Promise((res, rej) => {
  requests++;
  setTimeout(() => (id === 9 ? rej(new Error('404')) : res({ id, name: 'user' + id })), 20);
});
const getUser = memoizeAsync(fakeFetch);
Promise.all([getUser(7), getUser(7), getUser(7)]).then((us) => {
  console.log('same object?', us[0] === us[2], '| requests:', requests);
  return getUser(9).catch((e) => console.log('failed:', e.message));
}).then(() => getUser(9).catch(() => console.log('retried, requests now', requests)));
` } },
      { title: 'memoize-one: the React/Reselect flavour', html: `<p>UIs usually only need the <b>last</b> result: "if the inputs are the same objects as last render, return the same output". This needs no growing cache and preserves <b>reference identity</b>, which stops child components re-rendering.</p><p>${H.c('b', 'Cache size: exactly 1. Comparison: === on each argument.')}</p>`, code: { lang: 'js', run: true, code: `
function memoizeOne(fn) {
  let lastArgs = null, lastResult;
  return (...args) => {
    const same = lastArgs && args.length === lastArgs.length && args.every((a, i) => Object.is(a, lastArgs[i]));
    if (!same) { lastResult = fn(...args); lastArgs = args; }
    return lastResult;
  };
}
const todos = [{ t: 'a', done: true }, { t: 'b', done: false }];
const selectDone = memoizeOne((list) => list.filter((x) => x.done));
const r1 = selectDone(todos), r2 = selectDone(todos);
console.log('same reference (no re-render):', r1 === r2);
const r3 = selectDone([...todos]);   // new array with same items -> recompute
console.log('new input -> new result:', r1 !== r3);
` } },
      { title: 'When memoization is WRONG', html: `${H.table(['Function', 'Problem'], [['<code>getPrice(id)</code> reads a live price feed', H.c('r', 'stale data: impure')], ['<code>(x) =&gt; x + 1</code>', 'lookup costs more than the work'], ['<code>render({ ...props })</code>', 'always a new object → 0% hit rate, cache only grows'], ['<code>JSON.stringify</code> key for <code>{a:1,b:2}</code> vs <code>{b:2,a:1}</code>', 'different strings for "equal" objects; also drops functions/undefined'], ['<code>random()</code>', 'returns the same "random" number forever']])}<p>Always check purity and hit rate before memoizing.</p>` }
    ],
    deepDive: `<p>🟣 <b>Cache keys are the hard part.</b> <code>JSON.stringify</code> is O(size of args) per call, fails on cycles and <code>BigInt</code>, depends on key order, and confuses <code>undefined</code>/<code>null</code> in arrays. A nested <code>Map</code>/<code>WeakMap</code> trie keyed by each argument's identity is O(number of args) and GC-friendly; lodash instead takes only the <b>first</b> argument as key by default, which surprises people: <code>_.memoize((a, b) =&gt; a + b)(1, 2)</code> then <code>(1, 5)</code> returns 3.</p>
<p><b>Bounding memory.</b> An unbounded <code>Map</code> in a long-running Node server is a classic memory leak. Options: LRU (a <code>Map</code> preserves insertion order, so delete + re-set on hit and evict <code>map.keys().next().value</code> when over capacity), TTL (store <code>{ value, expires }</code>), or <code>WeakMap</code>/<code>WeakRef</code>+<code>FinalizationRegistry</code> for object keys. Libraries: <code>lru-cache</code>, <code>quick-lru</code>.</p>
<p><b>Concurrency.</b> Cache the promise to prevent the <i>thundering herd</i> (100 concurrent misses → 100 identical DB queries). Server-side, scope caches per request (DataLoader) or share them carefully: a module-level memo in a multi-tenant server can leak one user's data into another's response if the key does not include the tenant.</p>
<p><b>React specifics (2026).</b> <code>useMemo</code> is a <i>hint</i>, not a guarantee; React may discard it. The React Compiler (stable since late 2025) inserts memoization automatically in many codebases, so hand-written <code>useMemo</code> is increasingly about expensive computations rather than identity. <code>React.memo</code> does a shallow prop comparison — inline objects/arrows in props defeat it.</p>
<p><b>Complexity view.</b> Memoized recursion costs (number of distinct states) × (work per state). fib: n states × O(1) = O(n). Grid paths: R·C states. If the state space is huge (e.g. a bitmask over 40 items), memoization cannot save you — you need a better algorithm.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants add <code>useMemo</code>, <code>useCallback</code> and memo caches everywhere "for performance". Many of these never hit, cost memory, and add bugs (stale closures, missing dependencies). With the React Compiler, much manual memoization is now redundant.</p>
<p><b>Use AI as a partner:</b> <code>For each memoized function in this file, tell me if it is pure, what the key is, and whether the cache is bounded</code>; <code>Add hit/miss counters and print the hit rate after this test run</code>; <code>Convert this unbounded memo to an LRU of 500 entries</code>.</p>
<p><b>Where AI goes wrong:</b> memoizes impure functions (reads <code>Date.now()</code>), uses <code>JSON.stringify</code> keys for objects with functions, caches rejected promises forever, or memoizes the outer function but recurses through the un-memoized one. <b>What you must still own:</b> measuring (profile first), choosing key semantics and eviction, and knowing when the right fix is a better algorithm rather than a cache.</p>`,
    problems: [{
      title: 'Memoize with Capacity (LRU Eviction)',
      level: 'Medium', tags: ['memoization', 'Map', 'LRU', 'caching'], companies: ['Google', 'Meta', 'Zomato'],
      statement: `<p>Implement <code>memoizeLRU(fn, capacity)</code>. It caches results keyed by the first argument (a primitive). When the cache holds more than <code>capacity</code> entries, evict the <b>least recently used</b> one. Both a cache hit and a new insert count as "use". Expose <code>memoized.size()</code> and <code>memoized.keys()</code> (oldest → newest) for testing.</p>`,
      constraints: `<p>1 ≤ capacity ≤ 10<sup>4</sup>; every operation must be O(1) average.</p>`,
      example: `<p>capacity 2. Calls: f(1) ${H.c('y', 'miss')}, f(2) ${H.c('y', 'miss')}, f(1) ${H.c('g', 'hit')} (1 becomes newest), f(3) ${H.c('y', 'miss')} → evict ${H.c('r', '2')} (least recent). keys() = [1, 3].</p>`,
      brute: { why: `<p>Keep an array of keys in recency order and move a key to the end with <code>indexOf</code> + <code>splice</code>. Correct, but each hit is O(capacity), so 10<sup>4</sup> entries makes every call slow.</p>`, code: { lang: 'js', run: true, code: `
function memoizeLRUSlow(fn, capacity) {
  const cache = new Map(), order = [];
  return (k) => {
    if (cache.has(k)) { order.splice(order.indexOf(k), 1); order.push(k); return cache.get(k); } // O(n)
    const v = fn(k); cache.set(k, v); order.push(k);
    if (order.length > capacity) cache.delete(order.shift());          // shift is O(n) too
    return v;
  };
}
const sq = memoizeLRUSlow((x) => x * x, 2);
console.log(sq(1), sq(2), sq(1), sq(3));
` } },
      mcq: { q: 'Which built-in property of <code>Map</code> makes an O(1) LRU possible without a linked list?', options: ['It iterates keys in insertion order, and delete + set moves a key to the end', 'It sorts keys automatically', 'It is a WeakMap', 'It has a built-in maxSize option'], answer: 0, explain: 'Map preserves insertion order. Re-inserting a key makes it the newest; map.keys().next().value is the oldest.' },
      hints: [`<p>Hint 1: "least recently used" just needs an ordering by last use — <code>Map</code> already keeps insertion order.</p>`, `<p>Hint 2: on a hit, <code>delete</code> the key and <code>set</code> it again so it moves to the newest end.</p>`, `<p>Hint 3: after inserting a new key, if <code>size &gt; capacity</code>, evict <code>cache.keys().next().value</code> (the oldest). Edge: capacity 1 should still work; a cached <code>undefined</code> result must count as a hit (use <code>has</code>, not truthiness).</p>`],
      tests: {"sig":"string int int[] -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, cap, keys) {\n  var computed = 0, f;\n  if (kind === 'undef') { f = memoizeLRU(function () { computed++; return undefined; }, cap); keys.forEach(function (k) { f(k); }); return [f.size(), computed]; }\n  if (kind === 'cap') { try { memoizeLRU(function (x) { return x; }, cap); return 'ok'; } catch (e) { return e.name; } }\n  f = memoizeLRU(function (x) { computed++; return x * x; }, cap);\n  var out = keys.map(function (k) { return f(k); });\n  if (kind === 'values') return out;\n  if (kind === 'big') { for (var i = 0; i < 100000; i++) f(i % 20000); return [f.size(), computed]; }\n  return { keys: f.keys(), computed: computed, size: f.size() };\n}"},"cases":[[["state",2,[1,2,1,3]],{"keys":[1,3],"computed":3,"size":2}],[["state",2,[1,2,1,3,2]],{"keys":[3,2],"computed":4,"size":2}],[["state",1,[5,5,6]],{"keys":[6],"computed":2,"size":1}],[["state",3,[]],{"keys":[],"computed":0,"size":0}],[["state",3,[1,2,3,1,2,3]],{"keys":[1,2,3],"computed":3,"size":3}],[["values",2,[3,3,4,-2]],[9,9,16,4]],[["undef",1,[1,1]],[1,1]],[["cap",0,[]],"RangeError"],[["cap",1,[]],"ok"],[["state",2,[0,0,-1]],{"keys":[0,-1],"computed":2,"size":2}],[["big",10000,[]],[10000,100000]]]},
      solution: {
        approach: `<p>One <code>Map</code> serves as both the hash table and the recency list. Hit → delete + re-set (move to newest). Miss → compute, set, and evict the first key if over capacity.</p>`,
        code: { lang: 'js', run: true, code: `
function memoizeLRU(fn, capacity) {
  if (!(capacity >= 1)) throw new RangeError('capacity must be >= 1');
  const cache = new Map();
  function memoized(key) {
    if (cache.has(key)) {
      const v = cache.get(key);
      cache.delete(key);          // move to newest
      cache.set(key, v);
      return v;
    }
    const v = fn(key);
    cache.set(key, v);
    if (cache.size > capacity) cache.delete(cache.keys().next().value); // evict oldest
    return v;
  }
  memoized.size = () => cache.size;
  memoized.keys = () => [...cache.keys()];
  return memoized;
}

let computed = 0;
const sq = memoizeLRU((x) => { computed++; return x * x; }, 2);
sq(1); sq(2); sq(1); sq(3);
console.log('keys:', sq.keys(), '| computed:', computed); // [1, 3] 3
sq(2);                                                     // 2 was evicted -> recompute
console.log('keys:', sq.keys(), '| computed:', computed); // [3, 2] 4
const u = memoizeLRU(() => undefined, 1);
u('a'); u('a');
console.log('undefined results cached:', u.size() === 1);
` },
        dry: { head: ['call', 'hit?', 'map order after (old → new)', 'evicted'], rows: [['sq(1)', 'miss', '[1]', '—'], ['sq(2)', 'miss', '[1, 2]', '—'], ['sq(1)', H.c('g', 'hit'), '[2, 1]', '—'], ['sq(3)', 'miss', '[1, 3]', H.c('r', '2')]] },
        complexity: `<p>O(1) average per call (Map get/set/delete and reading the first key). Space O(capacity).</p>`,
        followUps: ['Add a TTL so entries expire after <i>t</i> ms.', 'Support multi-argument keys.', 'Make it work for async functions without caching rejections.']
      }
    }]
  });

  /* ================= TOPIC 6: Patterns: module, singleton, factory, observer ================= */
  topics.push({
    title: 'JS Design Patterns: Module, Singleton, Factory, Observer',
    analogy: `<p>Think of a <b>restaurant</b>:</p>
<ul>
<li><b>Module</b> = the kitchen. Customers see a menu (the public API); the recipes, knives and mess stay behind the door (private state).</li>
<li><b>Singleton</b> = the one cash register. Everyone pays at the <i>same</i> register; you do not build a new one for every customer.</li>
<li><b>Factory</b> = the order window. You say "one veg burger"; you do not care how it is assembled or which cook makes it — you just get a burger.</li>
<li><b>Observer</b> = the "your order is ready" screen. You do not keep asking the cook; you <i>subscribe</i> with your token number and get notified.</li>
</ul>`,
    explain: `<p>🟢 <b>The plain idea.</b> Design patterns are named, reusable answers to recurring design problems. JavaScript's closures, first-class functions and ES modules make the classic patterns much lighter than in Java.</p>
${H.table(['Pattern', 'Problem it solves', 'Idiomatic JS (2026)'], [
  ['<b>Module</b>', 'hide private state, expose a small public API, avoid global name clashes', 'ES modules (<code>export</code>) — or a closure / IIFE returning an object; <code>#private</code> class fields'],
  ['<b>Singleton</b>', 'exactly one shared instance (config, logger, DB pool)', 'export one instance from a module — modules are evaluated once and cached'],
  ['<b>Factory</b>', 'create objects without the caller knowing the concrete type or using <code>new</code>', 'a function returning an object; a registry <code>{ type: creator }</code> to pick at runtime'],
  ['<b>Observer</b> (pub/sub)', 'one thing changes, many others react, without tight coupling', '<code>on/off/emit</code> emitter, DOM <code>EventTarget</code>, Node <code>EventEmitter</code>, signals, RxJS']
])}
<p>🔵 <b>Module.</b> Before ES modules, the <b>revealing module pattern</b> used an IIFE (immediately invoked function expression) so variables lived in a private function scope:</p>
<pre>const counter = (function () {
  let count = 0;                     // private: nobody outside can touch it
  function inc() { return ++count; }
  return { inc, get value() { return count; } };  // public API
})();</pre>
<p>Today every file with <code>export</code> is a module: top-level variables are private unless exported, and the module body runs <b>once</b>, no matter how many files import it.</p>
<p>🔵 <b>Singleton.</b> Because modules run once, <code>export const db = createPool()</code> is already a singleton. The class version uses a static field and returns the existing instance. Warning: singletons are <b>global state in disguise</b> — they make testing harder (tests share state) and hide dependencies. Prefer passing the instance in (dependency injection) for logic you want to test.</p>
<p>🔵 <b>Factory.</b> A plain function that builds and returns an object. Benefits over <code>new SomeClass()</code>: can return different types based on input, can hide private state in closures, no <code>this</code>/<code>new</code> confusion, easy to swap in tests.</p>
<p>🔵 <b>Observer.</b> A <b>subject</b> keeps a list of <b>listeners</b>; <code>emit</code> calls each one. Subscribers can leave with <code>off</code> (or an unsubscribe function returned by <code>on</code>). This decouples "something happened" from "who cares".</p>
${H.table(['step', 'listeners for "order"', 'output'], [['on(A)', '[A]', ''], ['on(B)', '[A, B]', ''], ['emit(42)', '[A, B]', 'A(42), B(42)'], ['off(A)', '[B]', ''], ['emit(7)', '[B]', 'B(7)']])}`,
    clues: ['"Implement an EventEmitter with on / off / once / emit" → observer with Map&lt;event, listener[]&gt;', '"Only one instance across the app" (config, logger, connection pool) → singleton (module export)', '"Hide internal state, expose a public API" / "private variables without classes" → module pattern / closures', '"Create different objects based on a type string" → factory + registry', '"Notify many components when data changes" / "pub-sub" → observer', '"Memory leak from listeners" → missing unsubscribe (off) in observer'],
    code: [{ lang: 'js', run: true, title: 'Module, Singleton and Factory in idiomatic JS', code: `
// ---------- Module pattern (closure-based) ----------
const bank = (function () {
  let balance = 0;                          // private
  const history = [];                       // private
  function record(type, amt) { history.push(type + ':' + amt); }
  return {                                  // public API ("revealed")
    deposit(amt) { if (amt <= 0) throw new RangeError('amount must be > 0'); balance += amt; record('dep', amt); return balance; },
    withdraw(amt) { if (amt > balance) throw new Error('insufficient funds'); balance -= amt; record('wd', amt); return balance; },
    get balance() { return balance; },
    statement() { return history.slice(); } // return a copy, keep internals safe
  };
})();
bank.deposit(100); bank.withdraw(30);
console.log('balance:', bank.balance, '| history:', bank.statement(), '| private?', bank.history);

// ---------- Singleton (class version) ----------
class Config {
  static #instance = null;
  #values = {};
  constructor() {
    if (Config.#instance) return Config.#instance;   // reuse the one instance
    Config.#instance = this;
  }
  static get() { return new Config(); }
  set(k, v) { this.#values[k] = v; return this; }
  read(k) { return this.#values[k]; }
}
Config.get().set('env', 'prod');
console.log('same instance?', new Config() === Config.get(), '| env:', new Config().read('env'));

// ---------- Factory with a registry ----------
const notifierFactory = (() => {
  const registry = {
    email: (to) => ({ send: (msg) => 'EMAIL to ' + to + ': ' + msg }),
    sms: (to) => ({ send: (msg) => 'SMS to ' + to + ': ' + msg.slice(0, 20) }),
    push: (to) => ({ send: (msg) => 'PUSH to device ' + to + ': ' + msg })
  };
  return {
    create(type, to) {
      const make = registry[type];
      if (!make) throw new Error('unknown notifier: ' + type);
      return make(to);
    },
    register(type, maker) { registry[type] = maker; } // open for extension
  };
})();
['email', 'sms', 'push'].forEach((t) => console.log(notifierFactory.create(t, 'asha').send('Your order has shipped today!')));
notifierFactory.register('slack', (ch) => ({ send: (m) => 'SLACK #' + ch + ': ' + m }));
console.log(notifierFactory.create('slack', 'ops').send('deploy done'));
` }, { lang: 'js', run: true, title: 'Observer: a small EventEmitter', code: `
class Emitter {
  #events = new Map();                              // event -> array of listeners
  on(event, fn) {
    if (!this.#events.has(event)) this.#events.set(event, []);
    this.#events.get(event).push(fn);
    return () => this.off(event, fn);               // handy unsubscribe function
  }
  off(event, fn) {
    const list = this.#events.get(event);
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
    if (!list.length) this.#events.delete(event);
  }
  once(event, fn) {
    const wrapper = (...args) => { this.off(event, wrapper); fn(...args); };
    return this.on(event, wrapper);
  }
  emit(event, ...args) {
    const list = this.#events.get(event);
    if (!list) return false;
    [...list].forEach((fn) => fn(...args));         // copy: safe if a listener unsubscribes
    return true;
  }
  count(event) { return (this.#events.get(event) || []).length; }
}

const orders = new Emitter();
const stopKitchen = orders.on('placed', (o) => console.log('kitchen cooks', o.item));
orders.on('placed', (o) => console.log('billing charges', o.price));
orders.once('placed', () => console.log('welcome coupon sent (first order only)'));
orders.emit('placed', { item: 'dosa', price: 120 });
stopKitchen();
orders.emit('placed', { item: 'idli', price: 60 });
console.log('listeners left:', orders.count('placed'), '| emit unknown:', orders.emit('nope'));
` }],
    codeTitle: ['Module / Singleton / Factory (runnable)', 'EventEmitter (runnable)'],
    viz: [{
      title: 'Observer: subscribe, emit, unsubscribe',
      input: 'on A; on B; emit 5; once C; emit 7; off A; emit 9',
      inputLabel: 'Commands separated by ; — on X, once X, off X, emit N (X = one letter)',
      gen: function (input) {
        var cmds = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!cmds.length) throw new Error('Type commands like: on A; emit 5');
        if (cmds.length > 14) throw new Error('Use at most 14 commands');
        var listeners = [], log = [], frames = [];
        function graph(hlIds, ehl, tags) {
          var nodes = [{ id: 'S', label: 'emitter "order"', x: 18, y: 30, shape: 'box', w: 22 }];
          var n = listeners.length;
          listeners.forEach(function (l, i) {
            nodes.push({ id: 'L' + l.name, label: l.name + (l.once ? ' (once)' : ''), x: 75, y: n === 1 ? 30 : 6 + i * (48 / Math.max(1, n - 1)), shape: 'box', w: 16 });
          });
          var edges = listeners.map(function (l) { return ['S', 'L' + l.name]; });
          var hl = {}; (hlIds || []).forEach(function (h) { hl[h[0]] = h[1]; });
          return { type: 'graph', label: 'Subject → subscribers', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} };
        }
        function listPart(hl) { return { type: 'array', label: 'listeners["order"] (call order)', values: listeners.length ? listeners.map(function (l) { return l.name + (l.once ? '*' : ''); }) : ['(none)'], hl: hl || {} }; }
        frames.push(fr('An emitter keeps a <b>list of listener functions</b> per event. Nobody is subscribed yet, so emitting now would call nobody. (* marks a once-listener.)', [graph(), listPart(), { type: 'table', label: 'Output log', columns: ['command', 'calls'], rows: [] }]));
        cmds.forEach(function (c) {
          var m = c.match(/^(on|once|off)\s+([A-Za-z])$/i), e = c.match(/^emit\s+(-?\d+)$/i);
          if (!m && !e) throw new Error('Bad command "' + c + '". Use on X, once X, off X or emit N');
          if (m) {
            var op = m[1].toLowerCase(), name = m[2].toUpperCase();
            var idx = -1; listeners.forEach(function (l, i) { if (l.name === name) idx = i; });
            if (op === 'on' || op === 'once') {
              if (idx >= 0) {
                log.push([c, 'already subscribed (we skip duplicates here)']);
                frames.push(fr('<code>' + c + '</code>: ' + name + ' is already in the list. Real emitters (Node) would add it <i>again</i> and call it twice — a common bug. Here we skip it.', [graph([['L' + name, 'bad']]), listPart(), { type: 'table', label: 'Output log', columns: ['command', 'calls'], rows: log.slice(), hl: (function () { var h = {}; h[log.length - 1] = 'bad'; return h; })() }]));
                return;
              }
              listeners.push({ name: name, once: op === 'once' });
              log.push([c, '—']);
              var ap = {}; ap[listeners.length - 1] = 'ok';
              var ee = {}; ee['S-L' + name] = 'ok';
              frames.push(fr('<code>' + c + '</code>: push listener <b>' + name + '</b> onto the list' + (op === 'once' ? ' wrapped so it removes itself after its first call' : '') + '. The emitter does not know what ' + name + ' does — that is the loose coupling.', [graph([['L' + name, 'ok']], ee), listPart(ap), { type: 'table', label: 'Output log', columns: ['command', 'calls'], rows: log.slice() }]));
            } else {
              if (idx < 0) {
                log.push([c, 'not subscribed: no-op']);
                frames.push(fr('<code>' + c + '</code>: ' + name + ' is not in the list, so <code>off</code> does nothing. (Common bug: passing a <i>new</i> arrow function to off — it is a different function object, so nothing is removed.)', [graph(), listPart(), { type: 'table', label: 'Output log', columns: ['command', 'calls'], rows: log.slice() }]));
                return;
              }
              var rh = {}; rh[idx] = 'bad';
              frames.push(fr('<code>' + c + '</code>: find <b>' + name + '</b> in the list (indexOf) and remove it (splice). Forgetting this step is the #1 source of listener memory leaks.', [graph([['L' + name, 'bad']]), listPart(rh), { type: 'table', label: 'Output log', columns: ['command', 'calls'], rows: log.slice() }]));
              listeners.splice(idx, 1);
              log.push([c, '—']);
            }
          } else {
            var val = Number(e[1]);
            var snapshot = listeners.slice();
            if (!snapshot.length) {
              log.push([c, 'nobody listening (returns false)']);
              frames.push(fr('<code>' + c + '</code>: the list is empty, so nothing happens and <code>emit</code> returns <b>false</b>.', [graph([['S', 'cur']]), listPart(), { type: 'table', label: 'Output log', columns: ['command', 'calls'], rows: log.slice(), hl: (function () { var h = {}; h[log.length - 1] = 'cur'; return h; })() }]));
              return;
            }
            var called = [], ehl2 = {}, hl2 = [['S', 'cur']];
            snapshot.forEach(function (l) { called.push(l.name + '(' + val + ')'); ehl2['S-L' + l.name] = 'cur'; hl2.push(['L' + l.name, l.once ? 'sel' : 'ok']); });
            log.push([c, called.join(', ')]);
            var lh = {}; snapshot.forEach(function (l, i) { lh[i] = l.once ? 'sel' : 'ok'; });
            frames.push(fr('<code>' + c + '</code>: copy the list, then call every listener in subscription order with <b>' + val + '</b>: ' + called.join(', ') + '. Copying first means a listener that unsubscribes during emit cannot make us skip the next one.', [graph(hl2, ehl2), listPart(lh), { type: 'table', label: 'Output log', columns: ['command', 'calls'], rows: log.slice(), hl: (function () { var h = {}; h[log.length - 1] = 'ok'; return h; })() }]));
            var gone = snapshot.filter(function (l) { return l.once; });
            if (gone.length) {
              listeners = listeners.filter(function (l) { return !l.once; });
              frames.push(fr('The once-listener' + (gone.length > 1 ? 's ' : ' ') + '<b>' + gone.map(function (g) { return g.name; }).join(', ') + '</b> removed ' + (gone.length > 1 ? 'themselves' : 'itself') + ' right after running. Next emit will not reach ' + (gone.length > 1 ? 'them' : 'it') + '.', [graph(), listPart(), { type: 'table', label: 'Output log', columns: ['command', 'calls'], rows: log.slice() }]));
            }
          }
        });
        frames.push(fr('Final state: <b>' + listeners.length + '</b> listener(s) remain. In a real app, every <code>on</code> in a component needs a matching <code>off</code> when the component unmounts (e.g. return the unsubscribe from a React <code>useEffect</code>).', [graph(), listPart(), { type: 'table', label: 'Output log', columns: ['command', 'calls'], rows: log.slice() }]));
        return frames;
      }
    }],
    examples: [
      { title: 'ES module singleton (the modern default)', html: `<p>A module body runs once per process (Node) or page (browser) and the result is cached, so every importer gets the <b>same</b> object. No class, no static field needed.</p>${H.table(['file', 'code'], [['logger.js', '<code>export const logger = createLogger({ level: \'info\' });</code>'], ['a.js', '<code>import { logger } from \'./logger.js\';</code>'], ['b.js', '<code>import { logger } from \'./logger.js\'; // same instance</code>']])}<p>${H.c('y', 'Gotchas:')} two copies of a package in <code>node_modules</code> (version mismatch) or mixing CommonJS and ESM builds can give you <b>two</b> "singletons"; hot module reload in dev re-runs modules; serverless functions create one per warm container, not one globally.</p>`, code: { lang: 'js', code: `
// logger.js
let created = 0;
function createLogger(opts) {
  created++;
  return { log: (msg) => console.log('[' + opts.level + '] ' + msg), created: () => created };
}
export const logger = createLogger({ level: 'info' });

// a.js and b.js both do:
// import { logger } from './logger.js';
// logger.created() === 1 everywhere
` } },
      { title: 'Factory functions vs classes', html: `${H.table(['', 'Factory function', 'Class'], [['private state', 'closures (truly private)', '<code>#fields</code> (truly private since ES2022)'], ['<code>this</code> pitfalls', 'none — methods close over variables', 'methods lose <code>this</code> when passed as callbacks'], ['memory', 'each object gets its own copy of methods', 'methods shared on the prototype'], ['<code>instanceof</code>', 'no', 'yes'], ['return different types', 'easy', 'awkward']])}<p>Rule of thumb: thousands of objects → class (shared prototype methods). Few objects with private state or polymorphic creation → factory.</p>`, code: { lang: 'js', run: true, code: `
function makeCounter(start = 0) {
  let n = start;                                  // private via closure
  return { inc: () => ++n, value: () => n };
}
const c = makeCounter(5);
const inc = c.inc;                                // detached method still works
inc(); inc();
console.log('factory value:', c.value());

class Counter { #n = 0; inc() { return ++this.#n; } }
const k = new Counter();
const kinc = k.inc;
try { kinc(); } catch (e) { console.log('class method lost this:', e.constructor.name); }
console.log('methods shared on prototype?', new Counter().inc === k.inc, '| factory shared?', makeCounter().inc === c.inc);
` } },
      { title: 'Observer in the platform: EventTarget and AbortController', html: `<p>Browsers and Node 15+ ship <code>EventTarget</code>. Unsubscribing many listeners at once is easiest with an <code>AbortController</code> signal: pass <code>{ signal }</code> to <code>addEventListener</code>, call <code>abort()</code> once, and all of them are removed.</p>`, code: { lang: 'js', run: true, code: `
const bus = new EventTarget();
const ac = new AbortController();
bus.addEventListener('tick', (e) => console.log('A got', e.detail), { signal: ac.signal });
bus.addEventListener('tick', (e) => console.log('B got', e.detail), { signal: ac.signal });
bus.addEventListener('tick', (e) => console.log('C (once) got', e.detail), { once: true });
bus.dispatchEvent(new CustomEvent('tick', { detail: 1 }));
ac.abort();                                       // removes A and B in one go
bus.dispatchEvent(new CustomEvent('tick', { detail: 2 }));
console.log('after abort: nothing printed for tick 2');
` } }
    ],
    deepDive: `<p>🟣 <b>Observer pitfalls in production.</b></p>
<ul>
<li><b>Leaks:</b> a listener holds a reference to its closure (often a whole component). If the subject outlives the subscriber and you never call <code>off</code>, the subscriber can never be garbage-collected. Node warns at 11 listeners for one event (<code>MaxListenersExceededWarning</code>) precisely to catch this.</li>
<li><b>Mutation during emit:</b> if a listener calls <code>off</code> on itself while you iterate the live array, the next listener shifts into its index and gets skipped. Iterate over a copy.</li>
<li><b>Errors:</b> one throwing listener stops the rest in a naive loop. Node's EventEmitter rethrows; robust buses wrap each call in try/catch and report errors separately. Node's special <code>'error'</code> event throws if nobody listens.</li>
<li><b>Sync vs async delivery:</b> Node's emit is synchronous; DOM events dispatched by code are synchronous too. Re-entrancy (emitting inside a listener) can cause surprising ordering — some buses queue events.</li>
</ul>
<p><b>Signals (2026).</b> Fine-grained reactivity (SolidJS, Preact Signals, Angular signals, Vue refs, Svelte 5 runes) is the observer pattern with automatic dependency tracking: reading a signal inside an effect subscribes it. A TC39 Signals proposal is at stage 1. Push-based observers (RxJS) add operators like debounce and throttle on top.</p>
<p><b>Singleton critique.</b> Singletons couple code to a global, make test isolation hard (state leaks between tests; Jest's module registry reset is a workaround), and hide dependencies. Senior answer: use a module-scoped instance at the <b>composition root</b> and inject it into functions/classes that need it.</p>
<p><b>Module internals.</b> ES modules are statically analysable (imports are hoisted and resolved before execution), have live bindings (an importer sees updates to an exported <code>let</code>), are strict by default, and are cached by resolved URL/path. That static structure enables tree-shaking — something the IIFE module pattern cannot offer.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants reach for "enterprise" patterns by reflex — an <code>AbstractNotifierFactorySingleton</code> where a plain object or an exported function would do. In JavaScript most patterns collapse into closures and modules; being able to say "we don't need a class here" is a senior signal.</p>
<p><b>Use AI as a partner:</b> <code>Find every addEventListener / on() in this codebase without a matching removal</code>; <code>Replace this class-based singleton with dependency injection and show how the tests change</code>; <code>Write tests for my EventEmitter: once, off during emit, duplicate listeners, errors in listeners</code>.</p>
<p><b>Where AI goes wrong:</b> iterates the live listener array during emit, forgets to delete empty event keys, implements <code>once</code> so that <code>off(event, originalFn)</code> cannot remove it, or creates a "singleton" that is actually one-per-import because of duplicated packages. Agent systems are full of observers (tool-call events, streaming tokens, hooks), so the same leak and ordering bugs appear there. <b>What you must still own:</b> lifecycle — who subscribes, who unsubscribes, and when.</p>`,
    problems: [{
      title: 'Implement an EventEmitter (on, off, once, emit)',
      level: 'Medium', tags: ['observer', 'event emitter', 'Map', 'closures'], companies: ['Meta', 'Microsoft', 'Uber', 'CRED'],
      statement: `<p>Implement <code>class EventEmitter</code> with: <code>on(event, fn)</code> returning an unsubscribe function; <code>off(event, fn)</code>; <code>once(event, fn)</code> (runs at most once and can also be removed with <code>off(event, fn)</code> using the <i>original</i> fn); <code>emit(event, ...args)</code> returning <code>true</code> if any listener ran. Listeners run in subscription order. A listener removing itself (or another) during emit must not cause others in the current emit to be skipped.</p>`,
      constraints: `<p>Up to 10<sup>4</sup> listeners per event; the same function may be added twice (it then runs twice, like Node).</p>`,
      example: `<p><code>e.on('x', A); e.once('x', B); e.emit('x', 1)</code> → ${H.c('g', 'A(1), B(1)')}, returns true. <code>e.emit('x', 2)</code> → ${H.c('g', 'A(2)')} only. <code>e.off('x', A); e.emit('x', 3)</code> → ${H.c('r', 'false')}.</p>`,
      brute: { why: `<p>Storing everything in one array of <code>{event, fn}</code> pairs works but makes every emit scan all listeners of all events. Iterating the live array while a once-listener splices itself out skips the next listener.</p>`, code: { lang: 'js', run: true, code: `
class NaiveEmitter {
  constructor() { this.all = []; }
  on(ev, fn) { this.all.push({ ev, fn }); }
  off(ev, fn) { this.all = this.all.filter((l) => !(l.ev === ev && l.fn === fn)); }
  emit(ev, ...a) { for (let i = 0; i < this.all.length; i++) if (this.all[i].ev === ev) this.all[i].fn(...a); }
}
const n = new NaiveEmitter();
const selfRemoving = () => { n.all.splice(0, 1); console.log('first'); };
n.on('x', selfRemoving);
n.on('x', () => console.log('second'));
n.emit('x'); // prints only "first": the second listener shifted into index 0 and was skipped
` } },
      mcq: { q: 'How can <code>off(event, originalFn)</code> remove a listener that was added with <code>once</code>?', options: ['Store the original fn on the wrapper (e.g. <code>wrapper.listener = fn</code>) and match either', 'It cannot; once-listeners are permanent', 'Compare functions with <code>toString()</code>', 'Use a WeakSet of once-listeners only'], answer: 0, explain: 'once registers a wrapper. Keeping a pointer to the original lets off match it (this is exactly what Node does).' },
      hints: [`<p>Hint 1: a <code>Map</code> from event name to an array of listeners gives O(1) lookup of the right list.</p>`, `<p>Hint 2: <code>once</code> registers a wrapper that removes itself and then calls fn; remember the original on <code>wrapper.listener</code> so <code>off</code> can match it.</p>`, `<p>Hint 3: in <code>emit</code>, iterate over a <b>copy</b> (<code>list.slice()</code>). In <code>off</code>, remove the <i>last</i> matching occurrence (Node behaviour) and delete the key when the list is empty.</p>`],
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var e = new EventEmitter(), log = [];\n  var A = function (v) { log.push('A' + v); }, B = function (v) { log.push('B' + v); };\n  if (k === 'example') { e.on('x', A); e.once('x', B); var r1 = e.emit('x', 1), r2 = e.emit('x', 2); e.off('x', A); var r3 = e.emit('x', 3); return [r1, r2, r3, log]; }\n  if (k === 'offOnce') { var C = function () { log.push('C'); }; e.once('y', C); e.off('y', C); return [e.emit('y'), log]; }\n  if (k === 'selfRemove') { var self = function () { e.off('z', self); log.push('self'); }; e.on('z', self); e.on('z', function () { log.push('next'); }); e.emit('z'); e.emit('z'); return log; }\n  if (k === 'unsub') { var u = e.on('a', A); u(); return [e.emit('a', 1), log]; }\n  if (k === 'twice') { e.on('t', A); e.on('t', A); e.emit('t', 1); e.off('t', A); e.emit('t', 2); return log; }\n  if (k === 'order') { e.on('o', function () { log.push(1); }); e.on('o', function () { log.push(2); }); e.on('o', function () { log.push(3); }); e.emit('o'); return log; }\n  if (k === 'noListeners') return e.emit('none');\n  if (k === 'args') { e.on('p', function (a, b, c) { log.push([a, b, c]); }); e.emit('p', 1, 'two', null); return log; }\n  if (k === 'badListener') { try { e.on('q', 'nope'); } catch (err) { return err.name; } return 'none'; }\n  if (k === 'offOther') { e.on('r', function () { log.push('r1'); }); var other = function () { log.push('r2'); }; e.on('r', function () { other(); e.off('r', B); }); e.emit('r'); return log; }\n  if (k === 'removeOtherDuring') { var later = function () { log.push('later'); }; e.on('s', function () { log.push('first'); e.off('s', later); }); e.on('s', later); e.emit('s'); return log; }\n  if (k === 'many') { var n = 0; for (var i = 0; i < 10000; i++) e.on('m', function () { n++; }); e.emit('m'); return n; }\n  if (k === 'onceOrder') { e.once('w', function () { log.push('o1'); }); e.on('w', function () { log.push('p'); }); e.once('w', function () { log.push('o2'); }); e.emit('w'); e.emit('w'); return log; }\n}"},"cases":[[["example"],[true,true,false,["A1","B1","A2"]]],[["offOnce"],[false,[]]],[["selfRemove"],["self","next","next"]],[["unsub"],[false,[]]],[["twice"],["A1","A1","A2"]],[["order"],[1,2,3]],[["noListeners"],false],[["args"],[[1,"two",null]]],[["badListener"],"TypeError"],[["removeOtherDuring"],["first","later"]],[["many"],10000],[["onceOrder"],["o1","p","o2","p"]]]},
      solution: {
        approach: `<p>Map&lt;event, listener[]&gt;. on pushes; once pushes a self-removing wrapper tagged with the original; off finds the last match by identity (fn or fn.listener) and splices; emit snapshots the list and calls each.</p>`,
        code: { lang: 'js', run: true, code: `
class EventEmitter {
  constructor() { this.events = new Map(); }
  on(event, fn) {
    if (typeof fn !== 'function') throw new TypeError('listener must be a function');
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push(fn);
    return () => this.off(event, fn);
  }
  once(event, fn) {
    const wrapper = (...args) => { this.off(event, wrapper); return fn.apply(this, args); };
    wrapper.listener = fn;                       // lets off(event, fn) find it
    this.on(event, wrapper);
    return () => this.off(event, wrapper);
  }
  off(event, fn) {
    const list = this.events.get(event);
    if (!list) return this;
    for (let i = list.length - 1; i >= 0; i--) {  // remove the most recent match
      if (list[i] === fn || list[i].listener === fn) { list.splice(i, 1); break; }
    }
    if (list.length === 0) this.events.delete(event);
    return this;
  }
  emit(event, ...args) {
    const list = this.events.get(event);
    if (!list || list.length === 0) return false;
    for (const fn of list.slice()) fn.apply(this, args); // snapshot protects iteration
    return true;
  }
}

const e = new EventEmitter();
const A = (v) => console.log('A', v), B = (v) => console.log('B', v);
e.on('x', A); e.once('x', B);
console.log(e.emit('x', 1));       // A 1, B 1, true
console.log(e.emit('x', 2));       // A 2, true
e.off('x', A);
console.log(e.emit('x', 3));       // false
const C = () => console.log('C never runs');
e.once('y', C); e.off('y', C);     // remove a once-listener by its original fn
console.log(e.emit('y'));          // false
const self = () => { e.off('z', self); console.log('self removed'); };
e.on('z', self); e.on('z', () => console.log('next still runs'));
e.emit('z');
` },
        dry: { head: ['op', 'events["x"]', 'output'], rows: [['on(x, A)', '[A]', '—'], ['once(x, B)', '[A, wrap(B)]', '—'], ['emit(x, 1)', 'snapshot [A, wrap(B)] → wrap removes itself', 'A 1, B 1'], ['emit(x, 2)', '[A]', 'A 2'], ['off(x, A); emit(x, 3)', 'key deleted', H.c('r', 'false')]] },
        complexity: `<p>on O(1) amortised; off O(k) for k listeners of that event; emit O(k) (copy + calls). Space O(total listeners).</p>`,
        followUps: ['Make listener errors not stop other listeners, and collect them.', 'Add <code>prependListener</code> and a max-listeners warning.', 'Support wildcard events like <code>user.*</code>.']
      }
    }]
  });

  /* ================= TOPIC 7: Debounce vs throttle ================= */
  topics.push({
    title: 'Debounce vs Throttle (with Simulated Time)',
    analogy: `<p><b>Debounce</b> is a <b>lift (elevator) door</b>. Each time someone walks in, the door timer restarts. The door only closes once nobody has entered for, say, 3 seconds. A stream of people keeps it open; the lift leaves <i>once</i>, after the rush ends.</p>
<p><b>Throttle</b> is a <b>metro train every 5 minutes</b>. However many people pour onto the platform, a train leaves at most once per 5 minutes. A steady crowd gets regular departures, not one at the very end.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Some events fire <i>way</i> too often: <code>input</code> on every keystroke, <code>scroll</code>/<code>resize</code>/<code>mousemove</code> dozens of times a second. Running an expensive handler (API call, layout work) for each one wastes CPU and network. Both techniques <b>rate-limit</b> a function, but differently:</p>
${H.table(['', 'Debounce', 'Throttle'], [
  ['rule', 'run only after <b>wait</b> ms of <b>silence</b>', 'run at most <b>once per wait</b> ms'],
  ['during a non-stop burst', H.c('r', 'never runs') + ' until it stops', H.c('g', 'runs regularly') + ' (every wait ms)'],
  ['typical use', 'search-as-you-type, autosave, window resize "done", form validation', 'scroll position, infinite scroll check, drag/mousemove, analytics pings, game input'],
  ['mental model', '"wait until they stop"', '"no more often than"']
])}
<p><b>Simulated timeline</b> (wait = 100 ms; events at 0, 30, 60, 90, 300 ms):</p>
${H.table(['time (ms)', '0', '30', '60', '90', '190', '300', '400'], [
  ['event', '●', '●', '●', '●', '', '●', ''],
  ['debounce (trailing)', '', '', '', '', H.c('g', 'RUN'), '', H.c('g', 'RUN')],
  ['throttle (leading)', H.c('b', 'RUN'), '', '', '', '', H.c('b', 'RUN'), '']
])}
<p>Debounce ran at 190 (90 + 100, the burst ended at 90) and 400 (300 + 100). Throttle ran at 0 (first event) and 300 (100 ms had passed since its last run); 30, 60, 90 were dropped because they arrived within 100 ms of the run at 0.</p>
<p>🔵 <b>Core implementations:</b></p>
<pre>function debounce(fn, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);                                  // cancel the previous plan
    timer = setTimeout(() =&gt; fn.apply(this, args), wait); // plan a new one
  };
}
function throttle(fn, wait) {
  let last = -Infinity;
  return function (...args) {
    const now = Date.now();
    if (now - last &gt;= wait) { last = now; fn.apply(this, args); }   // else: drop
  };
}</pre>
<p><b>Leading vs trailing edge.</b> <i>Trailing</i> runs at the end of the window (with the latest arguments). <i>Leading</i> runs at the start (instant feedback). Lodash's <code>throttle</code> defaults to <b>both</b> (run immediately, and once more at the end if more events came in), its <code>debounce</code> defaults to trailing only. The simple throttle above is leading-only and can <b>lose the final event</b> — e.g. the last scroll position — which is why the trailing call matters.</p>
<p>🔑 <b>Testing tip.</b> Never test timing code with real waits. Inject the clock and timer functions (or use fake timers like <code>vi.useFakeTimers()</code> / <code>jest.useFakeTimers()</code>) so tests are instant and deterministic — the "remove hidden inputs" idea from the purity topic.</p>`,
    clues: ['"Search box fires an API call on every keystroke" → debounce (trailing), ~250–400 ms', '"Handler must run at a steady rate while the user keeps scrolling/dragging" → throttle', '"Only after the user stops typing / resizing" → debounce', '"Prevent double-submit / ignore rapid clicks" → leading debounce or leading throttle', '"Implement debounce with cancel and flush" / "leading and trailing options" → lodash-style debounce', '"Rate-limit to N calls per second" → throttle (client) or token bucket (server)', '"Smooth animation on scroll" → requestAnimationFrame throttling'],
    code: [{ lang: 'js', run: true, title: 'debounce + throttle tested with a fake clock (deterministic)', code: `
// A tiny fake clock: we control time instead of waiting for it.
function createClock() {
  let now = 0, id = 0;
  const timers = new Map();                       // id -> { at, fn }
  return {
    now: () => now,
    setTimeout(fn, ms) { timers.set(++id, { at: now + ms, fn }); return id; },
    clearTimeout(tid) { timers.delete(tid); },
    advanceTo(t) {                                // run due timers in time order
      for (;;) {
        let next = null;
        for (const [tid, tm] of timers) if (tm.at <= t && (!next || tm.at < next[1].at)) next = [tid, tm];
        if (!next) break;
        timers.delete(next[0]); now = next[1].at; next[1].fn();
      }
      now = t;
    }
  };
}

// Implementations take the clock as a dependency (pure core idea)
function debounce(fn, wait, clock) {
  let timer = null;
  return (...args) => {
    clock.clearTimeout(timer);
    timer = clock.setTimeout(() => fn(...args), wait);
  };
}
function throttle(fn, wait, clock) {
  let last = -Infinity;
  return (...args) => {
    if (clock.now() - last >= wait) { last = clock.now(); fn(...args); }
  };
}

const clock = createClock();
const log = [];
const d = debounce((t) => log.push('debounce ran at ' + clock.now() + ' (event ' + t + ')'), 100, clock);
const th = throttle((t) => log.push('throttle ran at ' + clock.now() + ' (event ' + t + ')'), 100, clock);

for (const t of [0, 30, 60, 90, 300]) {           // simulated event timestamps
  clock.advanceTo(t);
  d(t); th(t);
}
clock.advanceTo(1000);                            // let pending timers fire
console.log(log.join('\\n'));
` }, { lang: 'js', run: true, title: 'Lodash-style debounce: leading, trailing, maxWait, cancel, flush', code: `
function debounce(fn, wait, { leading = false, trailing = true, maxWait } = {}) {
  let timer = null, lastArgs = null, lastThis = null, result;
  let lastCallTime = 0, lastInvokeTime = 0;

  function invoke(time) {
    lastInvokeTime = time;
    const args = lastArgs, ctx = lastThis;
    lastArgs = lastThis = null;
    result = fn.apply(ctx, args);
    return result;
  }
  function remaining(time) {
    const sinceCall = time - lastCallTime, sinceInvoke = time - lastInvokeTime;
    const waitLeft = wait - sinceCall;
    return maxWait === undefined ? waitLeft : Math.min(waitLeft, maxWait - sinceInvoke);
  }
  function shouldInvoke(time) {
    const sinceCall = time - lastCallTime;
    return timer === null || sinceCall >= wait || (maxWait !== undefined && time - lastInvokeTime >= maxWait);
  }
  function timerExpired() {
    const time = Date.now();
    if (time - lastCallTime >= wait || (maxWait !== undefined && time - lastInvokeTime >= maxWait)) {
      timer = null;
      if (trailing && lastArgs) invoke(time);
      lastArgs = lastThis = null;
      return;
    }
    timer = setTimeout(timerExpired, remaining(time));   // not yet: re-arm for the rest
  }
  function debounced(...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    lastArgs = args; lastThis = this; lastCallTime = time;
    if (isInvoking && timer === null) {
      lastInvokeTime = time;
      timer = setTimeout(timerExpired, wait);
      if (leading) return invoke(time);
      return result;
    }
    if (timer === null) timer = setTimeout(timerExpired, wait);
    return result;
  }
  debounced.cancel = () => { clearTimeout(timer); timer = lastArgs = lastThis = null; };
  debounced.flush = () => { if (timer !== null) { clearTimeout(timer); timer = null; if (lastArgs) invoke(Date.now()); } return result; };
  debounced.pending = () => timer !== null;
  return debounced;
}

// Quick real-timer demo (about 300 ms total)
const calls = [];
const save = debounce((v) => calls.push(v), 50, { leading: true });
save('a'); save('b'); save('c');                    // leading runs 'a' now, trailing runs 'c' later
setTimeout(() => {
  const s2 = debounce((v) => calls.push(v), 50);
  s2('x'); s2('y');
  s2.flush();                                       // run immediately with latest args
  s2('z'); s2.cancel();                             // dropped
  setTimeout(() => console.log('calls:', calls.join(', ')), 120); // a, c, y
}, 120);
` }],
    codeTitle: ['Fake-clock simulation (runnable)', 'Full-featured debounce (runnable)'],
    viz: [{
      title: 'Event timeline: debounce vs throttle',
      input: '0 40 80 120 160 450 480 900 | 150',
      inputLabel: 'Event times in ms (ascending, max 12) | wait ms',
      gen: function (input) {
        var sp = String(input || '').split('|');
        if (sp.length !== 2) throw new Error('Format: 0 40 80 | 150 (event times | wait)');
        var ev = nums(sp[0], 12);
        var wait = Number(sp[1].trim());
        if (!(wait > 0) || wait > 5000) throw new Error('wait must be a number between 1 and 5000');
        for (var i = 0; i < ev.length; i++) {
          if (ev[i] < 0 || ev[i] > 20000) throw new Error('Times must be between 0 and 20000');
          if (i && ev[i] < ev[i - 1]) throw new Error('Event times must be in ascending order');
        }
        // --- simulate ---
        var debFires = [];
        ev.forEach(function (t, k) { var nx = ev[k + 1]; if (nx === undefined || nx - t >= wait) debFires.push({ at: t + wait, from: t }); });
        var thrFires = [], last = -Infinity;
        ev.forEach(function (t) { if (t - last >= wait) { thrFires.push({ at: t, from: t }); last = t; } });
        // leading+trailing throttle
        var ltFires = [], lLast = -Infinity, pending = null, timerAt = null, k2 = 0;
        var evQ = ev.slice();
        while (k2 < evQ.length || timerAt !== null) {
          var nextEv = k2 < evQ.length ? evQ[k2] : Infinity;
          if (timerAt !== null && timerAt <= nextEv) {
            if (pending !== null) { ltFires.push({ at: timerAt, from: pending, trailing: true }); lLast = timerAt; pending = null; timerAt = lLast + wait; }
            else timerAt = null;
            continue;
          }
          var t = nextEv; k2++;
          if (t - lLast >= wait && timerAt === null) { ltFires.push({ at: t, from: t }); lLast = t; timerAt = t + wait; }
          else { pending = t; if (timerAt === null) timerAt = lLast + wait; }
        }
        var end = Math.max(ev[ev.length - 1] + wait, debFires.length ? debFires[debFires.length - 1].at : 0, ltFires.length ? ltFires[ltFires.length - 1].at : 0);
        var bucket = Math.max(10, Math.ceil(end / 22 / 10) * 10);
        var cols = Math.floor(end / bucket) + 1;
        function col(t) { return Math.floor(t / bucket); }
        var colHead = []; for (var c = 0; c < cols; c++) colHead.push(String(c * bucket));
        var rowHead = ['events', 'debounce', 'throttle (lead)', 'throttle (lead+trail)'];
        function blank() { var g = []; for (var r = 0; r < 4; r++) { var row = []; for (var c2 = 0; c2 < cols; c2++) row.push(''); g.push(row); } return g; }
        function mark(g, hl, r, t, sym, cls) { var cc = col(t); g[r][cc] = g[r][cc] ? g[r][cc] + sym : sym; if (cls) hl[r + ',' + cc] = cls; }
        // Build per-time frames: process "moments" (events and fire times) in time order
        var moments = [];
        ev.forEach(function (t, i) { moments.push({ t: t, kind: 'ev', i: i }); });
        debFires.forEach(function (f) { moments.push({ t: f.at, kind: 'deb', f: f }); });
        ltFires.forEach(function (f) { if (f.trailing) moments.push({ t: f.at, kind: 'lt', f: f }); });
        moments.sort(function (a, b) { var ra = a.kind === 'ev' ? 1 : 0, rb = b.kind === 'ev' ? 1 : 0; return a.t - b.t || ra - rb; });
        var frames = [];
        var g0 = blank();
        frames.push(fr('Each column is a <b>' + bucket + ' ms</b> slice of time; wait = <b>' + wait + ' ms</b>. Row 1 will show raw events (●), the other rows show when each strategy actually <b>runs</b> the handler (▲). Watch the debounce timer get pushed back and the throttle drop events.', [
          { type: 'grid', label: 'timeline (ms)', rows: g0, rowHead: rowHead, colHead: colHead },
          vp({ wait: wait, 'debounce timer due': '—', 'throttle last run': '—' })
        ]));
        var G = blank(), debDue = null, tLast = -Infinity, ltLast = -Infinity, ltPending = '—', runs = { d: 0, t: 0, lt: 0 };
        var thrSet = {}; thrFires.forEach(function (f) { thrSet[f.from] = true; });
        var ltLead = {}; ltFires.forEach(function (f) { if (!f.trailing) ltLead[f.at] = true; });
        var seenEv = {};
        moments.forEach(function (m) {
          var hl = {};
          var narr;
          if (m.kind === 'ev') {
            var t = m.t;
            mark(G, hl, 0, t, '●', 'cur');
            var prevDue = debDue;
            debDue = t + wait;
            var thrRan = thrSet[t] && !seenEv['t' + t];
            if (thrRan) { seenEv['t' + t] = true; mark(G, hl, 2, t, '▲', 'ok'); tLast = t; runs.t++; }
            else hl['2,' + col(t)] = hl['2,' + col(t)] || 'bad';
            var ltRan = ltLead[t] && !seenEv['l' + t];
            if (ltRan) { seenEv['l' + t] = true; mark(G, hl, 3, t, '▲', 'ok'); ltLast = t; runs.lt++; ltPending = '—'; }
            else { ltPending = 'event@' + t; }
            narr = 'Event at <b>' + t + ' ms</b>. Debounce: ' + (prevDue !== null && prevDue > t ? 'cancel the timer due at ' + prevDue + ' and ' : '') + 'set a new timer due at <b>' + debDue + '</b>. Throttle: ' + (thrRan ? '<span class="c-g">' + (runs.t === 1 ? 'first event → RUN now</span>' : 'at least ' + wait + ' ms since last run → RUN now</span>') : '<span class="c-r">ran ' + (t - tLast) + ' ms ago (&lt; ' + wait + ') → DROP</span>') + '. Lead+trail throttle: ' + (ltRan ? 'runs now (leading edge).' : 'remembers this as the <i>latest</i> event for its trailing run.');
          } else if (m.kind === 'deb') {
            mark(G, hl, 1, m.t, '▲', 'sel'); runs.d++;
            debDue = null;
            narr = '<b>' + m.t + ' ms</b>: ' + wait + ' ms of silence since the event at ' + m.f.from + ' → the debounce timer finally fires and the handler <b>runs</b> with that last event.';
          } else {
            mark(G, hl, 3, m.t, '▲', 'win'); runs.lt++; ltLast = m.t; ltPending = '—';
            narr = '<b>' + m.t + ' ms</b>: the lead+trail throttle\'s window ended and an event (at ' + m.f.from + ') arrived during it, so it runs once more on the <b>trailing edge</b> — this is how the final scroll position is never lost.';
          }
          frames.push(fr(narr, [
            { type: 'grid', label: 'timeline (ms)', rows: G.map(function (r) { return r.slice(); }), rowHead: rowHead, colHead: colHead, hl: hl },
            vp({ now: m.t, 'debounce timer due': debDue === null ? '—' : debDue, 'throttle last run': tLast === -Infinity ? '—' : tLast, 'lead+trail pending': ltPending }, {})
          ]));
        });
        frames.push(fr('Totals for <b>' + ev.length + '</b> events: debounce ran <b>' + runs.d + '</b>× (once per burst, after it ends), leading throttle ran <b>' + runs.t + '</b>× (steady, but may miss the last event), lead+trail throttle ran <b>' + runs.lt + '</b>× (steady and catches the last event).', [
          { type: 'grid', label: 'final timeline (ms)', rows: G, rowHead: rowHead, colHead: colHead },
          { type: 'bars', label: 'handler runs', values: [ev.length, runs.d, runs.t, runs.lt], idxLabels: ['raw', 'debounce', 'thr lead', 'thr lead+trail'], hl: { 0: 'bad', 1: 'sel', 2: 'ok', 3: 'win' } }
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Search-as-you-type with debounce + stale-response guard', html: `<p>Typing "react" quickly fires 5 input events. Debounced at 300 ms → <b>1</b> request. But debounce alone does not solve <b>races</b>: if an old request returns after a newer one, it overwrites fresh results. Guard with an <code>AbortController</code> or a request id.</p>${H.table(['typed at', 'request?'], [['r (0)', 'no'], ['re (80)', 'no'], ['rea (150)', 'no'], ['reac (210)', 'no'], ['react (260)', H.c('g', 'yes at 560 ms')]])}`, code: { lang: 'js', run: true, code: `
function debounce(fn, wait) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
}
let latestId = 0, requests = 0;
async function search(q) {
  const id = ++latestId;                          // tag this request
  requests++;
  const results = await new Promise((r) => setTimeout(() => r([q + ' docs', q + ' tutorial']), 30));
  if (id !== latestId) return;                    // a newer search started: ignore stale data
  console.log('show results for "' + q + '":', results, '| requests so far:', requests);
}
const onInput = debounce(search, 40);
['r', 're', 'rea', 'reac', 'react'].forEach((q, i) => setTimeout(() => onInput(q), i * 10)); // fast typing
` } },
      { title: 'Throttle scroll work with requestAnimationFrame', html: `<p>For visual updates (sticky headers, parallax, progress bars), the best throttle interval is "once per frame". <code>requestAnimationFrame</code> runs right before the browser paints (~16.7 ms at 60 Hz, ~8.3 ms at 120 Hz), so you never do work that will not be seen. For pure scroll <i>listening</i>, mark the listener <code>{ passive: true }</code>; for visibility checks prefer <code>IntersectionObserver</code>, which needs no scroll handler at all.</p>`, code: { lang: 'js', code: `
// Browser-only: rAF throttle -> at most one update per painted frame
function rafThrottle(fn) {
  let scheduled = false, lastArgs;
  return (...args) => {
    lastArgs = args;                               // always keep the latest event
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; fn(...lastArgs); });
  };
}
const bar = document.querySelector('#progress');
const update = rafThrottle(() => {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = 'scaleX(' + (scrollY / max) + ')'; // transform: no layout needed
});
addEventListener('scroll', update, { passive: true });
` } },
      { title: 'Choosing the right tool', html: `${H.table(['Situation', 'Use', 'Why'], [['autocomplete search', 'debounce 250–400 ms', 'only the final query matters'], ['autosave a draft', 'debounce ~1 s + <code>maxWait</code> 10 s', 'save after a pause, but never go too long without saving'], ['window resize → recompute layout', 'debounce ~150 ms or ResizeObserver', 'only final size matters'], ['infinite scroll near bottom', 'throttle 200 ms or IntersectionObserver', 'need checks during scrolling'], ['drag / mousemove', 'rAF throttle', 'match the screen refresh'], ['"Pay" button', 'leading debounce / disable button', 'first click counts, repeats ignored'], ['analytics heartbeat', 'throttle', 'steady rate']])}<p>Fun fact: lodash's <code>throttle</code> is literally <code>debounce(fn, wait, { leading: true, trailing: true, maxWait: wait })</code>.</p>` }
    ],
    deepDive: `<p>🟣 <b>Edge cases a senior implementation handles:</b></p>
<ul>
<li><b>this and arguments:</b> capture both at call time; use the <i>latest</i> for trailing calls.</li>
<li><b>Return value:</b> a debounced function cannot return the result of a call that has not happened; lodash returns the <i>last</i> result. For async needs, return a Promise that resolves when the trailing call runs (and settle/reject earlier pending promises when superseded).</li>
<li><b>cancel / flush / pending:</b> needed for component unmount (cancel, or you call setState on an unmounted component) and for "save before navigating away" (flush).</li>
<li><b>maxWait:</b> pure debounce can starve forever under constant input (a user who never stops typing never gets autosave). <code>maxWait</code> guarantees a run at least every N ms.</li>
<li><b>Clock choice:</b> <code>Date.now()</code> can jump if the system clock changes; <code>performance.now()</code> is monotonic. Background tabs clamp timers to ≥ 1 s (and Chrome's intensive throttling to once per minute after 5 minutes hidden), so debounce delays are minimums, not guarantees.</li>
<li><b>React:</b> creating <code>debounce(fn)</code> inside render makes a <i>new</i> debounced function each render, so the timer never accumulates. Create it once (<code>useMemo</code>/<code>useRef</code>) and cancel in the effect cleanup. React 18+ <code>useDeferredValue</code> is a scheduler-based alternative for expensive rendering (not for network calls).</li>
</ul>
<p><b>Throttle variants.</b> Timestamp throttle (leading only, simple), timer throttle (trailing only), and leading + trailing (lodash). On the server, rate limiting uses token bucket / sliding window algorithms (see HLD rate limiter) — similar idea, but per user and distributed.</p>
<p><b>Complexity.</b> Both wrappers are O(1) per event. The win is in the handler: 60 scroll events per second × 5 ms of work = 300 ms of CPU per second (jank). Throttled to 10/s = 50 ms.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "debounce vs throttle" is the single most-asked frontend performance question and AI writes the 6-line versions perfectly. Interviewers now ask for the hard bits: leading + trailing, <code>maxWait</code>, cancel/flush, <code>this</code> handling, React lifecycle, and <b>how you would test it without waiting</b>.</p>
<p><b>Use AI as a partner:</b> <code>Write fake-timer tests (vitest) for my debounce: leading, trailing, maxWait, cancel, flush</code>; <code>Simulate these event timestamps through debounce(150) and throttle(150) and print a table of when each runs</code> — then check its table against your own reasoning.</p>
<p><b>Where AI goes wrong:</b> confuses the two (calls a timestamp throttle "debounce"), recreates the debounced function on every React render, forgets to cancel on unmount, drops the final event with leading-only throttle, or adds a debounce where an <code>IntersectionObserver</code>/<code>ResizeObserver</code> would remove the event storm entirely. <b>What you must still own:</b> picking the strategy from the UX requirement ("final value" vs "steady updates"), choosing the delay, and handling races in async handlers.</p>`,
    problems: [{
      title: 'Debounce with leading option, cancel and flush (fake clock)',
      level: 'Hard', tags: ['debounce', 'timers', 'closures', 'testing'], companies: ['Google', 'Atlassian', 'Airbnb', 'Razorpay'],
      statement: `<p>Implement <code>debounce(fn, wait, { leading = false, trailing = true }, clock)</code> where <code>clock</code> provides <code>now()</code>, <code>setTimeout</code> and <code>clearTimeout</code> (so it can be tested with simulated time). Rules: within a burst (calls closer than <code>wait</code> apart), <code>fn</code> runs on the leading edge if <code>leading</code>, and on the trailing edge (with the latest args, <code>wait</code> ms after the last call) if <code>trailing</code> — but never twice for a single call (a burst of exactly one call with both options runs once). Provide <code>cancel()</code> and <code>flush()</code>.</p>`,
      constraints: `<p>Up to 10<sup>5</sup> calls; O(1) per call; no real waiting in tests.</p>`,
      example: `<p>wait = 100, calls at 0 (a), 50 (b), 120 (c), then silence. Default (trailing): runs ${H.c('g', 'c at 220')}. leading+trailing: runs ${H.c('b', 'a at 0')} and ${H.c('g', 'c at 220')}. Leading only: ${H.c('b', 'a at 0')} only. Single call x at 500 with leading+trailing: runs once at 500.</p>`,
      brute: { why: `<p>The basic clearTimeout/setTimeout debounce has no leading edge, no cancel/flush, and uses the real clock, so tests need real sleeps and become slow and flaky.</p>`, code: { lang: 'js', run: true, code: `
function debounceBasic(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}
const d = debounceBasic((v) => console.log('ran with', v), 30);
d('a'); d('b'); d('c');      // only 'c' after 30 ms of real time, no leading, no cancel
` } },
      mcq: { q: 'With leading + trailing and a burst containing ONE call, how many times should fn run?', options: ['Once (leading); the trailing edge has no new call to run', 'Twice (leading and trailing)', 'Zero', 'It depends on wait'], answer: 0, explain: 'Trailing runs only if there was a call after the leading invocation. Track whether there are pending args.' },
      hints: [`<p>Hint 1: keep three pieces of state: the pending timer, the latest <code>args</code> not yet used (<code>pendingArgs</code>), and whether we are inside a burst (timer active).</p>`, `<p>Hint 2: on each call: if no timer is active and <code>leading</code>, run now and leave <code>pendingArgs</code> empty; otherwise store args in <code>pendingArgs</code>. In both cases (re)start the timer.</p>`, `<p>Hint 3: when the timer fires: clear it; if <code>trailing</code> and <code>pendingArgs</code> exist, run with them. <code>cancel</code> clears timer + pendingArgs; <code>flush</code> clears the timer and runs pendingArgs immediately if any.</p>`],
      tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction __mkClock() {\n  var now = 0, id = 0, timers = [];\n  return {\n    now: function () { return now; },\n    setTimeout: function (fn, ms) { var t = { id: ++id, at: now + ms, fn: fn, seq: id }; timers.push(t); return t.id; },\n    clearTimeout: function (i) { timers = timers.filter(function (t) { return t.id !== i; }); },\n    advanceTo: function (target) { while (true) { var due = timers.filter(function (t) { return t.at <= target; }).sort(function (a, b) { return a.at - b.at || a.seq - b.seq; })[0]; if (!due) break; timers = timers.filter(function (t) { return t !== due; }); now = due.at; due.fn(); } now = target; }\n  };\n}\nfunction chk(kind, json) {\n  var clock = __mkClock(), out = [];\n  var cfg = JSON.parse(json);\n  var d = debounce(function (v) { out.push(v + '@' + clock.now()); }, 100, cfg.opts || {}, clock);\n  if (kind === 'calls') { cfg.calls.forEach(function (c) { clock.advanceTo(c[0]); d(c[1]); }); clock.advanceTo(100000); return out.join(' '); }\n  if (kind === 'flush') { d('p'); d.flush(); d('q'); d.cancel(); clock.advanceTo(1000); return out; }\n  if (kind === 'flushIdle') { d.flush(); clock.advanceTo(1000); return out; }\n  if (kind === 'flushLeading') { var d2 = debounce(function (v) { out.push(v); }, 100, { leading: true }, clock); d2('a'); d2.flush(); clock.advanceTo(1000); return out; }\n  if (kind === 'cancelThenCall') { d('a'); d.cancel(); d('b'); clock.advanceTo(1000); return out; }\n  if (kind === 'latestArgs') { d('a', 1); d('b'); clock.advanceTo(1000); return out; }\n  if (kind === 'many') { for (var i = 0; i < 100000; i++) { clock.advanceTo(i); d('v' + i); } clock.advanceTo(1000000); return out; }\n  if (kind === 'flushArgs') { d('x'); d('y'); d.flush(); return out; }\n}"},"cases":[[["calls","{\"calls\":[[0,\"a\"],[50,\"b\"],[120,\"c\"]]}"],"c@220"],[["calls","{\"opts\":{\"leading\":true},\"calls\":[[0,\"a\"],[50,\"b\"],[120,\"c\"]]}"],"a@0 c@220"],[["calls","{\"opts\":{\"leading\":true,\"trailing\":false},\"calls\":[[0,\"a\"],[50,\"b\"],[120,\"c\"]]}"],"a@0"],[["calls","{\"opts\":{\"leading\":true},\"calls\":[[500,\"x\"]]}"],"x@500"],[["calls","{\"calls\":[[0,\"a\"],[200,\"b\"]]}"],"a@100 b@300"],[["calls","{\"calls\":[[0,\"a\"],[100,\"b\"]]}"],"a@100 b@200"],[["calls","{\"opts\":{\"leading\":true},\"calls\":[[0,\"a\"],[10,\"b\"]]}"],"a@0 b@110"],[["calls","{\"opts\":{\"leading\":true,\"trailing\":false},\"calls\":[[0,\"a\"],[50,\"b\"],[500,\"c\"]]}"],"a@0 c@500"],[["calls","{\"calls\":[]}"],""],[["flush","{}"],["p@0"]],[["flushIdle","{}"],[]],[["flushLeading","{}"],["a"]],[["cancelThenCall","{}"],["b@100"]],[["flushArgs","{}"],["y@0"]],[["many","{}"],["v99999@100099"]]]},
      solution: {
        approach: `<p>The timer marks "inside a burst". Leading runs only when a call starts a burst. Every call resets the timer. Trailing runs only for args that were not already used by the leading edge.</p>`,
        code: { lang: 'js', run: true, code: `
function debounce(fn, wait, { leading = false, trailing = true } = {}, clock) {
  let timer = null, pendingArgs = null;
  const fire = (args) => fn(...args);
  function onTimer() {
    timer = null;
    if (trailing && pendingArgs) { const a = pendingArgs; pendingArgs = null; fire(a); }
    pendingArgs = null;
  }
  function debounced(...args) {
    const startsBurst = timer === null;
    if (startsBurst && leading) fire(args);         // leading edge
    else pendingArgs = args;                        // remember latest for trailing
    if (timer !== null) clock.clearTimeout(timer);
    timer = clock.setTimeout(onTimer, wait);        // (re)start the quiet-period timer
  }
  debounced.cancel = () => { if (timer !== null) clock.clearTimeout(timer); timer = null; pendingArgs = null; };
  debounced.flush = () => {
    if (timer !== null) { clock.clearTimeout(timer); timer = null; }
    if (pendingArgs) { const a = pendingArgs; pendingArgs = null; fire(a); }
  };
  return debounced;
}

function createClock() {
  let now = 0, id = 0; const timers = new Map();
  return {
    now: () => now,
    setTimeout(fn, ms) { timers.set(++id, { at: now + ms, fn }); return id; },
    clearTimeout(t) { timers.delete(t); },
    advanceTo(t) {
      for (;;) {
        let best = null;
        for (const [k, v] of timers) if (v.at <= t && (!best || v.at < best[1].at)) best = [k, v];
        if (!best) break;
        timers.delete(best[0]); now = best[1].at; best[1].fn();
      }
      now = t;
    }
  };
}
function run(opts, calls) {
  const clock = createClock(), out = [];
  const d = debounce((v) => out.push(v + '@' + clock.now()), 100, opts, clock);
  calls.forEach(([t, v]) => { clock.advanceTo(t); d(v); });
  clock.advanceTo(10000);
  return out.join(' ');
}
const burst = [[0, 'a'], [50, 'b'], [120, 'c']];
console.log('trailing      :', run({}, burst));                                  // c@220
console.log('lead+trail    :', run({ leading: true }, burst));                   // a@0 c@220
console.log('leading only  :', run({ leading: true, trailing: false }, burst));  // a@0
console.log('single call   :', run({ leading: true }, [[500, 'x']]));            // x@500
const clock = createClock(), out = [];
const d = debounce((v) => out.push(v), 100, {}, clock);
d('p'); d.flush(); d('q'); d.cancel(); clock.advanceTo(1000);
console.log('flush/cancel  :', out.join(' '));                                   // p
` },
        dry: { head: ['time', 'call', 'timer active before?', 'action', 'timer due'], rows: [['0', 'a', 'no', 'leading → run a', '100'], ['50', 'b', 'yes', 'pending = b, reset', '150'], ['120', 'c', 'yes', 'pending = c, reset', '220'], ['220', '(timer)', '—', H.c('g', 'trailing → run c'), '—']] },
        complexity: `<p>O(1) per call (one clearTimeout + one setTimeout). O(1) memory: one timer and one args array.</p>`,
        followUps: ['Add <code>maxWait</code> so a never-ending burst still runs every N ms.', 'Return a Promise resolving with the eventual result.', 'Use it in a React component without recreating it each render.']
      }
    }]
  });

  /* ================= TOPIC 8: Layout thrashing & rendering performance ================= */
  topics.push({
    title: 'Avoiding Layout Thrashing & Rendering Performance',
    analogy: `<p>Imagine a <b>tailor</b> making a suit. You keep saying: "Make the sleeve 1 cm longer… now <i>measure me again</i>… make the collar wider… now <i>measure me again</i>…". Every measurement forces the tailor to stop, pin everything up and re-measure your whole body. Ten changes = ten full fittings.</p>
<p>Smart customer: "Here are all my measurements first. Now make all ten changes. Fit once at the end." That is <b>batching reads before writes</b> — and it is exactly how you avoid layout thrashing in the browser.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> To show a frame, the browser runs a pipeline: <b>JavaScript → Style → Layout → Paint → Composite</b>. <b>Layout</b> (also called <i>reflow</i>) works out the size and position of every box — it can be expensive on big pages.</p>
<p>Browsers are lazy on purpose: when you <b>write</b> (change a style or the DOM), they just mark layout as "dirty" and wait to recompute it once, right before the next paint. But if you then <b>read</b> a geometry value (<code>offsetHeight</code>, <code>getBoundingClientRect()</code>, <code>scrollTop</code>, <code>getComputedStyle</code>), the browser must give you a correct answer <i>now</i>, so it runs layout <b>immediately</b>. That is a <b>forced synchronous layout</b>.</p>
<p><b>Layout thrashing</b> = doing write, read, write, read… in a loop, forcing a fresh layout on every iteration.</p>
${H.table(['Loop over 100 cards', 'Pattern', 'Layouts per frame'], [
  ['for each card: <code>el.style.height = h</code>; then read <code>el.offsetTop</code>', 'W R W R W R …', H.c('r', '≈ 100 (thrashing)')],
  ['first read all <code>offsetTop</code> into an array, then write all heights', 'R R R … W W W …', H.c('g', '1 forced (or 0) + the normal one before paint')]
])}
<p>🔵 <b>The fixes, from simplest to most powerful:</b></p>
<ol>
<li><b>Batch: all reads, then all writes.</b> Store measurements in variables/arrays first.</li>
<li><b>Schedule writes in <code>requestAnimationFrame</code></b> so they happen once per frame, just before paint (libraries like <i>fastdom</i> queue reads and writes for you).</li>
<li><b>Animate only <code>transform</code> and <code>opacity</code></b>: these skip layout and paint and run on the compositor. Animating <code>top</code>/<code>left</code>/<code>width</code> forces layout every frame.</li>
<li><b>Use observers instead of polling:</b> <code>ResizeObserver</code>, <code>IntersectionObserver</code> give you sizes/visibility without forced layouts in your own code.</li>
<li><b>Shrink the work:</b> build off-screen with <code>DocumentFragment</code> and insert once; virtualize long lists (render only visible rows); CSS <code>contain: layout</code> / <code>content-visibility: auto</code> so changes do not ripple through the whole page.</li>
</ol>
<p><b>Common "read" triggers:</b> <code>offsetWidth/Height/Top/Left</code>, <code>clientWidth/Height</code>, <code>scrollWidth/Height/Top</code>, <code>getBoundingClientRect()</code>, <code>getComputedStyle()</code> (for layout-dependent values), <code>innerText</code>, <code>focus()</code>, <code>scrollIntoView()</code>, <code>window.innerHeight</code>/<code>scrollY</code>.</p>
<p><b>Why it matters in 2026:</b> Google's Core Web Vital <b>INP</b> (Interaction to Next Paint, which replaced FID in March 2024) measures how quickly the page responds to clicks/taps/keys. Long tasks and forced layouts in event handlers are the top INP killers. Target: INP ≤ 200 ms; a 60 Hz frame budget is 16.7 ms total.</p>`,
    clues: ['"Page janks when we resize / animate a list" → look for read-after-write in a loop', '"Forced reflow while executing JavaScript" warning in DevTools → layout thrashing', '"Animate smoothly at 60fps" → transform/opacity + requestAnimationFrame', '"Render 10,000 rows" → virtualization, DocumentFragment, content-visibility', '"Improve INP / input responsiveness" → break long tasks, avoid forced layouts, defer non-urgent work', '"Measure element size when it changes" → ResizeObserver instead of polling offsetWidth'],
    code: [{ lang: 'js', run: true, title: 'Simulated browser: count forced layouts (thrash vs batch)', code: `
// A tiny fake "browser" that behaves like the real one:
// writes mark layout dirty; geometry reads force layout if dirty.
class FakePage {
  constructor(n) {
    this.layouts = 0;
    this.dirty = false;
    this.items = Array.from({ length: n }, (_, i) => ({ height: 20, top: i * 20 }));
  }
  setHeight(i, h) { this.items[i].height = h; this.dirty = true; }  // WRITE
  offsetTop(i) {                                                     // READ
    if (this.dirty) this.layout();
    return this.items[i].top;
  }
  layout() {                         // recompute every box position (expensive!)
    this.layouts++;
    let y = 0;
    for (const it of this.items) { it.top = y; y += it.height; }
    this.dirty = false;
  }
}

// Thrashing: write then read inside the same loop
const thrash = new FakePage(200);
for (let i = 0; i < 200; i++) {
  thrash.setHeight(i, 30);               // write -> dirty
  const t = thrash.offsetTop(i);         // read  -> forced layout EVERY time
  if (t < 0) console.log('never');
}
console.log('thrashing loop forced layouts:', thrash.layouts);

// Batched: all reads first, then all writes
const batched = new FakePage(200);
const tops = [];
for (let i = 0; i < 200; i++) tops.push(batched.offsetTop(i));  // reads (layout clean: 0 forced)
for (let i = 0; i < 200; i++) batched.setHeight(i, 30);         // writes (just mark dirty)
batched.layout();                                                // browser does ONE layout before paint
console.log('batched forced layouts during JS:', batched.layouts - 1, '| total incl. frame layout:', batched.layouts);
` }, { lang: 'js', title: 'Real DOM: the same fix, plus a read/write scheduler (fastdom-style)', code: `
// BAD: interleaved read/write -> forced synchronous layout on every iteration
function equalizeBad(cards) {
  for (const card of cards) {
    const w = card.parentElement.offsetWidth;   // READ (forces layout if dirty)
    card.style.height = (w / 2) + 'px';         // WRITE (dirties layout)
  }
}

// GOOD: measure everything, then mutate everything
function equalizeGood(cards) {
  const widths = cards.map((c) => c.parentElement.offsetWidth); // all READS
  cards.forEach((c, i) => { c.style.height = (widths[i] / 2) + 'px'; }); // all WRITES
}

// Scheduler: queue reads and writes, flush once per frame (reads first)
const reads = [], writes = [];
let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    reads.splice(0).forEach((fn) => fn());   // phase 1: measure
    writes.splice(0).forEach((fn) => fn());  // phase 2: mutate
  });
}
const measure = (fn) => { reads.push(fn); schedule(); };
const mutate = (fn) => { writes.push(fn); schedule(); };

// usage: components can call these in any order without thrashing
document.querySelectorAll('.card').forEach((card) => {
  measure(() => {
    const h = card.scrollHeight;
    mutate(() => { card.style.maxHeight = h + 'px'; });
  });
});
` }],
    codeTitle: ['Fake layout engine (runnable)', 'Real DOM batching (browser only)'],
    viz: [{
      title: 'Read/write order vs forced layouts',
      input: 'W R W R W R W R',
      inputLabel: 'Sequence of DOM operations: W = write a style, R = read geometry (max 14)',
      gen: function (input) {
        var ops = String(input || '').toUpperCase().split(/[\s,]+/).filter(function (s) { return s.length; });
        if (!ops.length || ops.some(function (o) { return o !== 'R' && o !== 'W'; })) throw new Error('Use only R and W separated by spaces, e.g. W R W R');
        if (ops.length > 14) throw new Error('Use at most 14 operations');
        var stages = [['JS', 'JavaScript', 8], ['ST', 'Style', 28], ['LA', 'Layout', 48], ['PA', 'Paint', 68], ['CO', 'Composite', 88]];
        function pipe(hlStage, cls, label) {
          var hl = {}; if (hlStage) hl[hlStage] = cls;
          var ehl = {}; if (hlStage === 'LA') ehl['ST-LA'] = cls;
          return { type: 'graph', label: label || 'Rendering pipeline', directed: true, height: 30, nodes: stages.map(function (s) { return { id: s[0], label: s[1], x: s[2], y: 15, shape: 'box', w: 15 }; }), edges: [['JS', 'ST'], ['ST', 'LA'], ['LA', 'PA'], ['PA', 'CO']], hl: hl, ehl: ehl };
        }
        function run(seq, title) {
          var fr2 = [], dirty = false, forced = 0, log = [];
          var cellsHl = {};
          seq.forEach(function (op, i) {
            var hl = {}; hl[i] = 'cur';
            var narr, stageCls = null, stage = null;
            if (op === 'W') {
              dirty = true;
              log.push(['#' + (i + 1), 'W: el.style.height = …', 'layout marked dirty', '—']);
              narr = title + ' op ' + (i + 1) + ': <b>write</b>. The browser does NOT re-layout now; it just marks layout <span class="c-y">dirty</span> and plans to do it once before the next paint.';
              stage = 'ST'; stageCls = 'cur';
            } else if (dirty) {
              forced++; dirty = false;
              hl[i] = 'bad';
              log.push(['#' + (i + 1), 'R: el.offsetTop', '<span class="c-r">FORCED layout</span>', String(forced)]);
              narr = title + ' op ' + (i + 1) + ': <b>read</b> while layout is dirty → the browser must stop your JavaScript and run <span class="c-r">Layout right now</span> to give a correct number. Forced layouts so far: <b>' + forced + '</b>.';
              stage = 'LA'; stageCls = 'bad';
            } else {
              hl[i] = 'ok';
              log.push(['#' + (i + 1), 'R: el.offsetTop', 'layout clean → cached value', String(forced)]);
              narr = title + ' op ' + (i + 1) + ': <b>read</b>, and layout is clean, so the answer is already known. <span class="c-g">Free.</span>';
            }
            fr2.push(fr(narr, [
              { type: 'array', label: title + ' — operation order', values: seq.slice(), hl: hl, ptr: (function () { var p = {}; p[i] = 'now'; return p; })() },
              pipe(stage, stageCls),
              vp({ 'layout dirty?': dirty ? 'yes' : 'no', 'forced layouts': forced }, { 'forced layouts': op === 'R' && hl[i] === 'bad' ? 'bad' : '' }),
              { type: 'table', label: 'log', columns: ['op', 'code', 'effect', 'forced'], rows: log.slice(), hl: (function () { var h = {}; h[log.length - 1] = op === 'W' ? 'cur' : (hl[i] === 'bad' ? 'bad' : 'ok'); return h; })() }
            ]));
          });
          return { frames: fr2, forced: forced, dirtyAtEnd: dirty };
        }
        var frames = [];
        frames.push(fr('The browser pipeline. Writes only mark work as pending; the real Layout normally happens <b>once</b>, between your JavaScript and Paint. We will run your order <b>' + ops.join(' ') + '</b> and count how often a read forces Layout early.', [pipe('JS', 'cur'), { type: 'array', label: 'your operation order', values: ops.slice() }]));
        var a = run(ops, 'Original');
        frames = frames.concat(a.frames);
        var reads = ops.filter(function (o) { return o === 'R'; }), writes = ops.filter(function (o) { return o === 'W'; });
        var batchedOps = reads.concat(writes);
        frames.push(fr('Original order caused <b>' + a.forced + '</b> forced layout(s). Fix: do every <b>read first</b> (store values in variables), then every <b>write</b>. Same work, new order: <b>' + batchedOps.join(' ') + '</b>.', [
          { type: 'array', label: 'original', values: ops.slice(), hl: ops.reduce(function (h, o, i) { h[i] = o === 'R' ? 'win' : 'done'; return h; }, {}) },
          { type: 'array', label: 'batched (reads, then writes)', values: batchedOps, hl: batchedOps.reduce(function (h, o, i) { h[i] = o === 'R' ? 'ok' : 'cur'; return h; }, {}) }
        ]));
        var b = run(batchedOps, 'Batched');
        frames = frames.concat(b.frames.filter(function (f, i) { return i === 0 || i === reads.length || i === batchedOps.length - 1; }));
        frames.push(fr('Result: original order → <b>' + a.forced + '</b> forced layout(s); batched → <b>' + b.forced + '</b>. ' + (b.dirtyAtEnd ? 'The pending writes are handled by the browser\'s single normal Layout before Paint.' : '') + ' On a page where one layout costs 5 ms, that is ' + (a.forced * 5) + ' ms vs ' + (b.forced * 5) + ' ms of blocked main thread (frame budget: 16.7 ms).', [
          { type: 'bars', label: 'forced layouts', values: [a.forced, b.forced], idxLabels: ['original', 'batched'], hl: { 0: 'bad', 1: 'ok' } },
          pipe('LA', 'ok', 'One layout per frame, at the right time')
        ]));
        return frames;
      }
    }],
    examples: [
      { title: 'Animating with transform instead of left', html: `${H.table(['Property animated', 'Pipeline stages per frame', 'Cost'], [['<code>left</code>, <code>top</code>, <code>width</code>, <code>margin</code>', 'Style → Layout → Paint → Composite', H.c('r', 'highest')], ['<code>color</code>, <code>background</code>, <code>box-shadow</code>', 'Style → Paint → Composite', H.c('y', 'medium')], ['<code>transform</code>, <code>opacity</code>', 'Style → Composite (GPU)', H.c('g', 'lowest')]])}<p>Moving a box 300 px: <code>transform: translateX(300px)</code> runs on the compositor thread and stays smooth even if the main thread is busy. Use <code>will-change: transform</code> sparingly (each promoted layer costs GPU memory).</p>`, code: { lang: 'css', code: `
/* BAD: layout on every frame */
.drawer-bad { position: absolute; left: -300px; transition: left 300ms ease; }
.drawer-bad.open { left: 0; }

/* GOOD: compositor-only */
.drawer { transform: translateX(-300px); transition: transform 300ms ease; }
.drawer.open { transform: translateX(0); }

/* Skip rendering work for off-screen sections */
.feed-item { content-visibility: auto; contain-intrinsic-size: auto 400px; }
` } },
      { title: 'Insert 1,000 rows: DocumentFragment and virtualization', html: `<p>Appending 1,000 rows one by one to a live table can trigger style/layout work repeatedly (especially if you read sizes in between). Build them in a <code>DocumentFragment</code> (not in the document, so no layout) and append once. For 100,000 rows, even one insert is too much: <b>virtualize</b> — render only the ~30 visible rows and swap their content on scroll (react-window, TanStack Virtual).</p>${H.table(['Approach', 'DOM nodes for 100k rows'], [['render all', H.c('r', '100,000+')], ['virtualized', H.c('g', '≈ 30–50')]])}`, code: { lang: 'js', code: `
function renderRows(tbody, rows) {
  const frag = document.createDocumentFragment();   // off-document: no layout while building
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + r.id + '</td><td>' + r.name + '</td>';
    frag.appendChild(tr);
  }
  tbody.replaceChildren(frag);                        // one insertion
}

// Virtualization core math (framework-agnostic)
function visibleRange(scrollTop, viewportH, rowH, total, overscan = 5) {
  const first = Math.max(0, Math.floor(scrollTop / rowH) - overscan);
  const last = Math.min(total - 1, Math.ceil((scrollTop + viewportH) / rowH) + overscan);
  return { first, last, offsetY: first * rowH };
}
` } },
      { title: 'Breaking up long tasks for responsiveness (INP)', html: `<p>Any task over 50 ms is a <b>long task</b>: clicks during it wait. Split big loops into chunks and yield to the browser between them so input and paint can happen. Modern Chromium has <code>scheduler.yield()</code>; a portable fallback is <code>await new Promise(r =&gt; setTimeout(r, 0))</code>.</p>${H.table(['Approach', 'Main thread'], [['process 50,000 items in one loop', H.c('r', 'blocked ~400 ms')], ['chunks of 500 + yield', H.c('g', 'free every ~4 ms')]])}`, code: { lang: 'js', run: true, code: `
const yieldToMain = () =>
  (globalThis.scheduler && typeof globalThis.scheduler.yield === 'function')
    ? globalThis.scheduler.yield()
    : new Promise((r) => setTimeout(r, 0));

async function processInChunks(items, work, chunk = 500) {
  let done = 0, yields = 0;
  for (let i = 0; i < items.length; i += chunk) {
    for (const it of items.slice(i, i + chunk)) { work(it); done++; }
    await yieldToMain();                               // let input/paint run between chunks
    yields++;
  }
  return { done, yields };
}
let sum = 0;
processInChunks(Array.from({ length: 5000 }, (_, i) => i), (x) => { sum += x; })
  .then((r) => console.log('processed', r.done, 'items with', r.yields, 'yields; sum =', sum));
` } }
    ],
    deepDive: `<p>🟣 <b>What exactly gets invalidated.</b> Style changes invalidate style for affected elements; geometry changes invalidate layout for the affected subtree and possibly ancestors (a taller child can push siblings and grow its parent). Modern engines do incremental layout (only dirty subtrees), so one forced layout after a tiny change can be cheap — thrashing hurts because it multiplies <i>any</i> cost by N, and on big DOMs (5k+ nodes) or with complex flex/grid layouts each pass can be milliseconds.</p>
<p><b>Finding it.</b> Chrome DevTools Performance panel: purple "Layout" blocks inside a script task with the warning <i>Forced reflow is a likely performance bottleneck</i>, and a link to the exact line that read geometry. The "Rendering" drawer shows layout shift regions and paint flashing. Web Vitals library and the Long Animation Frames API (LoAF, shipped in Chrome 123) attribute slow frames to scripts in the field.</p>
<p><b>Containment.</b> <code>contain: layout paint</code> tells the engine changes inside an element cannot affect outside layout, limiting the dirty region. <code>content-visibility: auto</code> skips layout and paint for off-screen subtrees entirely (huge wins for long feeds) — pair with <code>contain-intrinsic-size</code> to avoid scrollbar jumps.</p>
<p><b>Frameworks.</b> React batches state updates (automatic batching since React 18) and commits DOM writes together, but your <code>useLayoutEffect</code> measuring code can still interleave reads and writes across components. Measuring in <code>useLayoutEffect</code> (before paint) avoids flicker but runs synchronously; prefer <code>ResizeObserver</code> where possible.</p>
<p><b>Other performance techniques in the same family:</b> passive event listeners (<code>{ passive: true }</code>) so scrolling never waits for your handler; Web Workers for CPU-heavy work (parsing, diffing) off the main thread; <code>requestIdleCallback</code> for non-urgent work; image <code>width</code>/<code>height</code> attributes to prevent layout shift (CLS); avoiding giant DOM sizes.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI-generated UI code often measures inside loops (<code>el.getBoundingClientRect()</code> per item after setting styles), animates <code>top/left</code>, or renders thousands of rows naively — it works on the demo data and janks on real data. Spotting read/write interleaving in review is a durable skill.</p>
<p><b>Use AI as a partner:</b> paste a Performance-panel trace summary and ask <code>Which functions force synchronous layout and how do I batch them?</code>; ask it to <code>rewrite this animation to use only transform and opacity</code>, or to <code>add virtualization with TanStack Virtual</code>. Agents with browser tooling (Chrome DevTools MCP, Playwright traces) can now record a trace, find long tasks and propose fixes — but verify with a before/after INP measurement.</p>
<p><b>Where AI goes wrong:</b> sprinkles <code>will-change</code> everywhere (GPU memory blow-up), wraps everything in <code>requestAnimationFrame</code> including reads that then run after writes from other code, or "fixes" jank with debounce when the real problem is a forced layout. <b>What you must still own:</b> the rendering pipeline mental model, profiling on a low-end device (CPU throttling 4–6×), and deciding what work can be skipped entirely.</p>`,
    problems: [{
      title: 'Fix the Thrashing Masonry Layout',
      level: 'Medium', tags: ['performance', 'layout thrashing', 'batching'], companies: ['Pinterest', 'Google', 'Myntra'],
      statement: `<p>A masonry grid sets each card's height and then reads the <code>offsetTop</code> of the next card to place a badge. Using the provided <code>FakePage</code> model (writes mark layout dirty; reads force layout if dirty), rewrite <code>placeBadges(page, heights)</code> so that it produces the <b>same badge positions</b> but causes at most <b>1</b> forced layout, regardless of the number of cards. Badge position for card i = its top after <i>all</i> heights have been applied.</p>`,
      constraints: `<p>1 ≤ n ≤ 10<sup>4</sup> cards. Layout costs O(n) per run, so thrashing is O(n<sup>2</sup>).</p>`,
      example: `<p>heights = [30, 50, 20] (all cards start at 20 px). Badge tops = ${H.c('g', '[0, 30, 80]')}. Thrashing version: ${H.c('r', '3 forced layouts')}; fixed: ${H.c('g', '1')}.</p>`,
      brute: { why: `<p>The interleaved version writes a height then immediately reads a top, forcing a full layout per card: n layouts × O(n) each = O(n<sup>2</sup>) work. With 10<sup>4</sup> cards that is 10<sup>8</sup> box updates.</p>`, code: { lang: 'js', run: true, code: `
class FakePage {
  constructor(n) { this.layouts = 0; this.dirty = false; this.items = Array.from({ length: n }, (_, i) => ({ height: 20, top: i * 20 })); }
  setHeight(i, h) { this.items[i].height = h; this.dirty = true; }
  offsetTop(i) { if (this.dirty) this.layout(); return this.items[i].top; }
  layout() { this.layouts++; let y = 0; for (const it of this.items) { it.top = y; y += it.height; } this.dirty = false; }
}
function placeBadgesThrash(page, heights) {
  const badges = [];
  heights.forEach((h, i) => { page.setHeight(i, h); badges.push(page.offsetTop(i)); }); // W R W R
  return heights.map((_, i) => page.offsetTop(i));                                      // final tops
}
const p = new FakePage(3);
console.log(placeBadgesThrash(p, [30, 50, 20]), 'forced layouts:', p.layouts);
` } },
      mcq: { q: 'You need final positions after all writes. What is the minimum number of forced layouts?', options: ['1 — do all writes, then read (one layout serves every read)', '0 — reads never trigger layout', 'n — one per card', 'n / 2'], answer: 0, explain: 'All writes first, then the first read forces one layout; every later read is served from the clean layout.' },
      hints: [`<p>Hint 1: the final tops depend on <i>all</i> heights, so you must write everything before reading anything.</p>`, `<p>Hint 2: loop 1 — all <code>setHeight</code> calls (just marks dirty). Loop 2 — all <code>offsetTop</code> reads: the first forces one layout, the rest are free.</p>`, `<p>Hint 3: if you needed <i>old</i> positions (before changes) as well, read them all first into an array — reads, then writes, then reads costs at most 1 forced layout as long as reads and writes are not interleaved.</p>`],
      tests: {"sig":"string int[] -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, heights) {\n  var n = kind === 'big' ? 10000 : heights.length;\n  var hs = kind === 'big' ? Array.from({ length: n }, function (_, i) { return 10 + (i % 7); }) : heights;\n  var page = new FakePage(n);\n  var tops = placeBadges(page, hs);\n  var want = [], y = 0; for (var i = 0; i < n; i++) { want.push(y); y += hs[i]; }\n  if (kind === 'big') return [page.layouts, tops.every(function (t, i) { return t === want[i]; }), tops[n - 1]];\n  return [tops, page.layouts];\n}"},"cases":[[["small",[30,50,20]],[[0,30,80],1]],[["small",[7]],[[0],1]],[["small",[20,20,20,20]],[[0,20,40,60],1]],[["small",[0,0,5]],[[0,0,0],1]],[["small",[100,1]],[[0,100],1]],[["small",[1,2,3,4,5,6]],[[0,1,3,6,10,15],1]],[["big",[]],[1,true,129981]]]},
      solution: {
        approach: `<p>Split the loop into two phases: a write phase (all heights) and a read phase (all tops). The first read triggers one layout; subsequent reads hit the clean layout.</p>`,
        code: { lang: 'js', run: true, code: `
class FakePage {
  constructor(n) { this.layouts = 0; this.dirty = false; this.items = Array.from({ length: n }, (_, i) => ({ height: 20, top: i * 20 })); }
  setHeight(i, h) { this.items[i].height = h; this.dirty = true; }
  offsetTop(i) { if (this.dirty) this.layout(); return this.items[i].top; }
  layout() { this.layouts++; let y = 0; for (const it of this.items) { it.top = y; y += it.height; } this.dirty = false; }
}
function placeBadges(page, heights) {
  heights.forEach((h, i) => page.setHeight(i, h));        // phase 1: all WRITES
  return heights.map((_, i) => page.offsetTop(i));        // phase 2: all READS (1 layout)
}
const p = new FakePage(3);
console.log(placeBadges(p, [30, 50, 20]), 'forced layouts:', p.layouts);   // [0, 30, 80] 1

const big = new FakePage(10000);
const t0 = Date.now();
placeBadges(big, Array.from({ length: 10000 }, (_, i) => 10 + (i % 7)));
console.log('10k cards -> forced layouts:', big.layouts, 'in', Date.now() - t0, 'ms');
` },
        dry: { head: ['phase', 'operation', 'dirty after', 'layouts'], rows: [['write', 'setHeight(0..2)', 'yes', '0'], ['read', 'offsetTop(0) → layout runs', 'no', '1'], ['read', 'offsetTop(1) = 30', 'no', '1'], ['read', 'offsetTop(2) = 80', 'no', H.c('g', '1')]] },
        complexity: `<p>O(n) total: n writes + one O(n) layout + n O(1) reads. The thrashing version is O(n<sup>2</sup>).</p>`,
        followUps: ['How would you do this with a fastdom-style measure/mutate scheduler across many components?', 'What if each card\'s height depends on its own measured content (scrollHeight)?', 'How would CSS grid-template-rows: masonry (or column layouts) remove the JS entirely?']
      }
    }]
  });

  /* ================= PRACTICE: Easy ================= */
  practice.push({
    title: 'Immutable Todo List Operations',
    level: 'Easy', tags: ['immutability', 'pure functions', 'arrays'], companies: ['Atlassian', 'Freshworks', 'Zoho'],
    statement: `<p>Write four <b>pure</b> functions over an array of todos <code>{ id, text, done }</code>: <code>addTodo(list, text, id)</code>, <code>toggleTodo(list, id)</code>, <code>renameTodo(list, id, text)</code>, <code>removeTodo(list, id)</code>. Each returns a new array, never mutates the input, and keeps <b>unchanged todo objects by reference</b> (structural sharing). If the id does not exist, return the <i>same</i> list reference.</p>`,
    constraints: `<p>0 ≤ list.length ≤ 10<sup>5</sup>; ids are unique.</p>`,
    example: `<p>list = [{id:1, done:false}, {id:2, done:false}] → <code>toggleTodo(list, 2)</code> gives a new array where ${H.c('g', 'item 2 is a new object with done: true')} and ${H.c('b', 'item 1 is the very same object')}. <code>toggleTodo(list, 99) === list</code>.</p>`,
    brute: { why: `<p>Mutating in place (<code>list.find(...).done = !done</code>) is short but breaks every <code>===</code> change check: React/Redux see the same array and skip re-rendering. Deep cloning first is correct but copies every todo.</p>`, code: { lang: 'js', run: true, code: `
function toggleMutating(list, id) {
  const t = list.find((x) => x.id === id);
  if (t) t.done = !t.done;          // mutates the caller's object
  return list;                       // same reference: UI cannot detect the change
}
const l = [{ id: 1, done: false }];
console.log(toggleMutating(l, 1) === l, l[0].done);
` } },
    mcq: { q: 'Which array method is the natural fit for "replace one item, keep the rest"?', options: ['<code>map</code>, returning a new object only for the matching id', '<code>forEach</code> with assignment', '<code>sort</code>', '<code>splice</code>'], answer: 0, explain: 'map builds a new array; returning the old element for non-matches keeps them shared by reference.' },
    hints: [`<p>Hint 1: <code>map</code> and <code>filter</code> already return new arrays — you only need to create a new object for the one todo that changes.</p>`, `<p>Hint 2: to return the same reference when nothing changes, first check <code>list.some(t =&gt; t.id === id)</code> (or compare lengths after filter).</p>`, `<p>Hint 3: add = <code>[...list, { id, text, done: false }]</code>; toggle/rename = map with spread for the match; remove = filter. Freeze inputs in your tests to catch accidental mutation.</p>`],
    tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction fz(list) { return Object.freeze(list.map(function (t) { return Object.freeze(Object.assign({}, t)); })); }\nfunction chk(kind, json) {\n  var list = fz(JSON.parse(json));\n  if (kind === 'add') { var r = addTodo(list, 'new', 9); return [r, list.length, r.slice(0, list.length).every(function (t, i) { return t === list[i]; })]; }\n  if (kind === 'toggle2') { var t = toggleTodo(list, 2); return [t, t[0] === list[0], t !== list]; }\n  if (kind === 'toggleMissing') return toggleTodo(list, 99) === list;\n  if (kind === 'rename1') { var rn = renameTodo(list, 1, 'oat'); return [rn, rn[1] === list[1]]; }\n  if (kind === 'renameMissing') return renameTodo(list, 99, 'x') === list;\n  if (kind === 'remove2') { var rm = removeTodo(list, 2); return [rm, rm[0] === list[0]]; }\n  if (kind === 'removeMissing') return removeTodo(list, 99) === list;\n  if (kind === 'toggleTwice') return toggleTodo(toggleTodo(list, 1), 1);\n  if (kind === 'big') { var big = []; for (var i = 0; i < 100000; i++) big.push({ id: i, text: 't', done: false }); var bl = fz(big); var out = toggleTodo(bl, 77777); var same = 0; for (var j = 0; j < bl.length; j++) if (out[j] === bl[j]) same++; return [out.length, out[77777].done, same]; }\n}"},"cases":[[["add","[{\"id\":1,\"text\":\"milk\",\"done\":false}]"],[[{"id":1,"text":"milk","done":false},{"id":9,"text":"new","done":false}],1,true]],[["toggle2","[{\"id\":1,\"text\":\"a\",\"done\":false},{\"id\":2,\"text\":\"b\",\"done\":false}]"],[[{"id":1,"text":"a","done":false},{"id":2,"text":"b","done":true}],true,true]],[["toggleMissing","[{\"id\":1,\"text\":\"a\",\"done\":false}]"],true],[["rename1","[{\"id\":1,\"text\":\"milk\",\"done\":false},{\"id\":2,\"text\":\"b\",\"done\":true}]"],[[{"id":1,"text":"oat","done":false},{"id":2,"text":"b","done":true}],true]],[["renameMissing","[]"],true],[["remove2","[{\"id\":1,\"text\":\"a\",\"done\":false},{\"id\":2,\"text\":\"b\",\"done\":false},{\"id\":3,\"text\":\"c\",\"done\":false}]"],[[{"id":1,"text":"a","done":false},{"id":3,"text":"c","done":false}],true]],[["removeMissing","[{\"id\":1,\"text\":\"a\",\"done\":false}]"],true],[["toggleTwice","[{\"id\":1,\"text\":\"a\",\"done\":false}]"],[{"id":1,"text":"a","done":false}]],[["add","[]"],[[{"id":9,"text":"new","done":false}],0,true]],[["remove2","[{\"id\":2,\"text\":\"only\",\"done\":true}]"],[[],false]],[["big","[]"],[100000,true,99999]]]},
    solution: {
      approach: `<p>Use copying array methods; create a new object only on the changed path; early-return the input when the id is missing to preserve identity.</p>`,
      code: { lang: 'js', run: true, code: `
const has = (list, id) => list.some((t) => t.id === id);
const addTodo = (list, text, id) => [...list, { id, text, done: false }];
const toggleTodo = (list, id) =>
  has(list, id) ? list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) : list;
const renameTodo = (list, id, text) =>
  has(list, id) ? list.map((t) => (t.id === id ? { ...t, text } : t)) : list;
const removeTodo = (list, id) => (has(list, id) ? list.filter((t) => t.id !== id) : list);

const l0 = Object.freeze([Object.freeze({ id: 1, text: 'milk', done: false })]);
const l1 = addTodo(l0, 'eggs', 2);
const l2 = toggleTodo(l1, 2);
const l3 = renameTodo(l2, 1, 'oat milk');
const l4 = removeTodo(l3, 2);
console.log(JSON.stringify(l4), '| l0 untouched:', JSON.stringify(l0));
console.log('item 1 shared after toggle(2):', l1[0] === l2[0]);
console.log('missing id keeps identity:', toggleTodo(l2, 99) === l2);
` },
      complexity: `<p>Each operation O(n) time (one scan, plus one for <code>has</code>), O(n) new array; only one new todo object.</p>`,
      followUps: ['Store todos normalized as <code>{ byId, ids }</code> — what does each operation cost now?', 'Add <code>moveTodo(list, from, to)</code> immutably with <code>toSpliced</code>.']
    }
  });

  practice.push({
    title: 'Implement once(fn)',
    level: 'Easy', tags: ['closures', 'higher-order functions', 'memoization'], companies: ['Amazon', 'Paytm', 'Walmart'],
    statement: `<p>Implement <code>once(fn)</code>: the returned function calls <code>fn</code> the first time (with the caller's <code>this</code> and arguments) and returns its result; every later call returns that <b>same first result</b> without calling <code>fn</code>. If the first call throws, the error propagates and the next call should try again.</p>`,
    constraints: `<p>fn may return <code>undefined</code>; that is still a valid cached result.</p>`,
    example: `<p><code>const init = once(() =&gt; { console.log('init!'); return 42; })</code>; <code>init(); init(); init()</code> prints ${H.c('g', 'init! once')} and returns 42 each time.</p>`,
    brute: { why: `<p>A boolean flag without storing the result returns <code>undefined</code> on later calls; checking <code>if (result)</code> instead of a separate flag re-runs fn whenever the first result was falsy (0, '', undefined).</p>`, code: { lang: 'js', run: true, code: `
function onceBuggy(fn) {
  let result;
  return (...args) => {
    if (!result) result = fn(...args);   // re-runs when result is 0 / '' / undefined
    return result;
  };
}
let n = 0;
const zero = onceBuggy(() => { n++; return 0; });
zero(); zero(); zero();
console.log('fn ran', n, 'times (expected 1)');
` } },
    mcq: { q: 'Why keep a separate <code>called</code> flag instead of checking <code>result !== undefined</code>?', options: ['fn might legitimately return undefined (or any falsy value)', 'Flags are faster than comparisons', 'undefined cannot be stored in a closure', 'It is required by the spec'], answer: 0, explain: 'The cached value itself cannot double as the "has run" marker when every value is a valid result.' },
    hints: [`<p>Hint 1: two closure variables: <code>called</code> (boolean) and <code>result</code>.</p>`, `<p>Hint 2: use a <code>function</code> expression and <code>fn.apply(this, args)</code> to keep <code>this</code>.</p>`, `<p>Hint 3: set <code>called = true</code> only <i>after</i> fn returns successfully, so a throwing first call can be retried. Optionally drop the reference to fn afterwards so it can be garbage-collected.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  if (k === 'basic') { var runs = 0; var init = once(function (x) { runs++; return x * 2 + (this ? this.bonus : 0); }); var obj = { bonus: 1, init: init }; return [obj.init(20), obj.init(99), init(5), runs]; }\n  if (k === 'undefined') { var n = 0; var u = once(function () { n++; return undefined; }); u(); u(); return n; }\n  if (k === 'throws') { var attempts = 0; var flaky = once(function () { attempts++; if (attempts < 2) throw new Error('fail'); return 'ok'; }); var first; try { flaky(); } catch (e) { first = e.message; } return [first, flaky(), flaky(), attempts]; }\n  if (k === 'args') { var seen = []; var o = once(function () { seen.push([].slice.call(arguments)); return 1; }); o(1, 2); o(3, 4); return seen; }\n  if (k === 'falsy') { var z = once(function () { return 0; }); return [z(), z()]; }\n  if (k === 'separate') { var a = once(function () { return 'a'; }), b = once(function () { return 'b'; }); return [a(), b(), a(), b()]; }\n  if (k === 'many') { var c = 0; var m = once(function () { c++; return c; }); var last; for (var i = 0; i < 100000; i++) last = m(); return [last, c]; }\n  if (k === 'sameRef') { var obj2 = {}; var r = once(function () { return obj2; }); return r() === r(); }\n  if (k === 'throwKeepsRetry') { var t = 0; var f = once(function () { t++; throw new Error('always'); }); var msgs = []; for (var j = 0; j < 3; j++) { try { f(); } catch (e) { msgs.push(e.message); } } return [msgs.length, t]; }\n}"},"cases":[[["basic"],[41,41,41,1]],[["undefined"],1],[["throws"],["fail","ok","ok",2]],[["args"],[[1,2]]],[["falsy"],[0,0]],[["separate"],["a","b","a","b"]],[["many"],[1,1]],[["sameRef"],true],[["throwKeepsRetry"],[3,3]]]},
    solution: {
      approach: `<p>Closure with a flag and a cached result; set the flag after a successful call; release fn to free memory.</p>`,
      code: { lang: 'js', run: true, code: `
function once(fn) {
  let called = false, result;
  return function (...args) {
    if (called) return result;
    result = fn.apply(this, args);     // if this throws, called stays false -> retry later
    called = true;
    fn = null;                          // let GC reclaim fn and its closure
    return result;
  };
}
let runs = 0;
const init = once(function (x) { runs++; return x * 2 + (this ? this.bonus : 0); });
const obj = { bonus: 1, init };
console.log(obj.init(20), obj.init(99), init(5), 'runs:', runs);   // 41 41 41 runs: 1

let attempts = 0;
const flaky = once(() => { attempts++; if (attempts < 2) throw new Error('fail'); return 'ok'; });
try { flaky(); } catch (e) { console.log('first call threw'); }
console.log(flaky(), flaky(), 'attempts:', attempts);            // ok ok attempts: 2
` },
      complexity: `<p>O(1) per call; O(1) memory (plus the cached result).</p>`,
      followUps: ['Write <code>before(n, fn)</code> that allows at most n − 1 calls.', 'Make an async once that shares the in-flight promise.']
    }
  });

  practice.push({
    title: 'Which Events Does a Throttle Let Through?',
    level: 'Easy', tags: ['throttle', 'simulation', 'timestamps'], companies: ['Swiggy', 'Meesho', 'Google'],
    statement: `<p>Given sorted event timestamps (ms) and <code>wait</code>, return the timestamps at which a <b>leading-edge throttle</b> runs the handler: an event runs if at least <code>wait</code> ms have passed since the last <i>run</i> (the first event always runs). Also return how many events were dropped.</p>`,
    constraints: `<p>1 ≤ n ≤ 10<sup>5</sup>, 0 ≤ t ≤ 10<sup>9</sup>, 1 ≤ wait ≤ 10<sup>6</sup>.</p>`,
    example: `<p>times = [0, 30, 60, 100, 130, 250], wait = 100 → runs ${H.c('g', '[0, 100, 250]')}, dropped ${H.c('r', '3')}. 30 and 60 are within 100 ms of 0; 130 is within 100 of 100.</p>`,
    brute: { why: `<p>Comparing each event with <i>all</i> previous runs is O(n · runs); and comparing with the previous <i>event</i> (instead of the previous <i>run</i>) is a classic bug that turns throttle into something else.</p>`, code: { lang: 'js', run: true, code: `
function throttleWrong(times, wait) {
  const runs = [];
  times.forEach((t, i) => { if (i === 0 || t - times[i - 1] >= wait) runs.push(t); }); // compares with previous EVENT
  return runs;
}
console.log(throttleWrong([0, 30, 60, 100, 130, 250], 100)); // [0, 250]: wrong, 100 should run
` } },
    mcq: { q: 'The throttle decision compares the current time with…', options: ['the time of the last RUN', 'the time of the previous event', 'the first event', 'the next event'], answer: 0, explain: 'Throttle guarantees spacing between executions, so it measures from the last execution.' },
    hints: [`<p>Hint 1: one variable <code>last</code> = time of the last run, starting at <code>-Infinity</code>.</p>`, `<p>Hint 2: for each t: if <code>t - last &gt;= wait</code>, push t and set <code>last = t</code>; else count a drop.</p>`, `<p>Hint 3: edge cases — equal timestamps (second is dropped), wait larger than the whole span (only the first runs). This is exactly what the real throttle does with <code>Date.now()</code>.</p>`],
    tests: {"sig":"int[] int -> string","fn":"chk","harness":{"js":"\nfunction chk(times, wait) {\n  if (wait < 0) { var r = throttleRuns(times, -wait); return [r.runs.length, r.runs[r.runs.length - 1], r.dropped]; }\n  return throttleRuns(times, wait);\n}"},"cases":[[[[0,30,60,100,130,250],100],{"runs":[0,100,250],"dropped":3}],[[[5,5,5],1],{"runs":[5],"dropped":2}],[[[0,10,20],1000],{"runs":[0],"dropped":2}],[[[7],5],{"runs":[7],"dropped":0}],[[[0,100,200,300],100],{"runs":[0,100,200,300],"dropped":0}],[[[0,99,100,199,200],100],{"runs":[0,100,200],"dropped":2}],[[[1000000000],1000000],{"runs":[1000000000],"dropped":0}],[[[0,1,2,3,4,5,6,7,8,9,10],5],{"runs":[0,5,10],"dropped":8}],[[{"$range":[0,100000]},-1000],[100,99000,99900]]]},
    solution: {
      approach: `<p>Single pass tracking the last run time.</p>`,
      code: { lang: 'js', run: true, code: `
function throttleRuns(times, wait) {
  let last = -Infinity, dropped = 0;
  const runs = [];
  for (const t of times) {
    if (t - last >= wait) { runs.push(t); last = t; }
    else dropped++;
  }
  return { runs, dropped };
}
console.log(throttleRuns([0, 30, 60, 100, 130, 250], 100)); // { runs: [0, 100, 250], dropped: 3 }
console.log(throttleRuns([5, 5, 5], 1));                    // { runs: [5], dropped: 2 }
console.log(throttleRuns([0, 10, 20], 1000));               // { runs: [0], dropped: 2 }
` },
      complexity: `<p>O(n) time, O(runs) space.</p>`,
      followUps: ['Add a trailing edge: also run once at <code>last + wait</code> if an event was dropped in that window.', 'Return the trailing-debounce run times for the same input.']
    }
  });

  practice.push({
    title: 'deepFreeze (with cycles)',
    level: 'Easy', tags: ['immutability', 'recursion', 'Object.freeze'], companies: ['Microsoft', 'Adobe', 'Intuit'],
    statement: `<p>Implement <code>deepFreeze(obj)</code> that freezes an object and every nested object/array reachable from it, then returns it. It must handle <b>circular references</b> without infinite recursion and skip primitives.</p>`,
    constraints: `<p>Depth ≤ 10<sup>3</sup>; up to 10<sup>5</sup> nested objects.</p>`,
    example: `<p><code>const c = deepFreeze({ a: { b: [1, 2] } })</code>; in strict mode ${H.c('r', 'c.a.b.push(3) throws TypeError')}. <code>const o = {}; o.self = o; deepFreeze(o)</code> ${H.c('g', 'terminates')}.</p>`,
    brute: { why: `<p><code>Object.freeze</code> alone is shallow: nested objects stay mutable. A naive recursion without a visited check loops forever on cycles (stack overflow).</p>`, code: { lang: 'js', run: true, code: `
'use strict';
const shallow = Object.freeze({ a: { b: [1, 2] } });
shallow.a.b.push(3);                       // allowed: freeze is shallow
console.log('shallow freeze let nested push through:', shallow.a.b);
` } },
    mcq: { q: 'How does checking <code>Object.isFrozen(v)</code> before recursing help with cycles?', options: ['Freeze the parent before recursing, so a cycle back to it sees a frozen object and stops', 'It does not help; you need JSON.stringify', 'Frozen objects cannot have cycles', 'It makes freezing faster only'], answer: 0, explain: 'If you freeze first and skip already-frozen values, revisiting a node ends the recursion. A WeakSet of visited nodes is the more explicit alternative.' },
    hints: [`<p>Hint 1: recurse over <code>Reflect.ownKeys(obj)</code> (includes symbol keys) and look at each value.</p>`, `<p>Hint 2: only recurse into values that are objects or functions and not yet visited — track visits in a <code>WeakSet</code>.</p>`, `<p>Hint 3: freeze the current object, then recurse. Note: an object that was frozen elsewhere may still have unfrozen children, so a visited set is more correct than relying on <code>isFrozen</code>.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  if (k === 'nested') { var c = deepFreeze({ a: { b: [1, 2] } }); var threw = ''; try { c.a.b.push(3); } catch (e) { threw = e.constructor.name; } return [threw, Object.isFrozen(c), Object.isFrozen(c.a), Object.isFrozen(c.a.b)]; }\n  if (k === 'cycle') { var o = { name: 'loop' }; o.self = o; var r = deepFreeze(o); return [r === o, Object.isFrozen(o.self), r.self === o]; }\n  if (k === 'returns') { var x = { y: 1 }; return deepFreeze(x) === x; }\n  if (k === 'primitives') return [deepFreeze(5), deepFreeze('s'), deepFreeze(null), deepFreeze(undefined), deepFreeze(true)];\n  if (k === 'symbol') { var sym = Symbol('m'); var s = deepFreeze({ [sym]: { v: 1 } }); return Object.isFrozen(s[sym]); }\n  if (k === 'shared') { var shared = { v: 1 }; var t = deepFreeze({ a: shared, b: shared }); return [Object.isFrozen(shared), t.a === t.b]; }\n  if (k === 'getter') { var calls = 0; var g = { get x() { calls++; return {}; } }; deepFreeze(g); return [calls, Object.isFrozen(g)]; }\n  if (k === 'mutual') { var p = {}, q = { p: p }; p.q = q; deepFreeze(p); return [Object.isFrozen(p), Object.isFrozen(q)]; }\n  if (k === 'array') { var arr = deepFreeze([{ a: 1 }, [2, [3]]]); return [Object.isFrozen(arr), Object.isFrozen(arr[0]), Object.isFrozen(arr[1][1])]; }\n  if (k === 'fn') { var f = function () {}; f.meta = { v: 1 }; deepFreeze({ f: f }); return [Object.isFrozen(f), Object.isFrozen(f.meta)]; }\n  if (k === 'deep') { var root = {}, cur = root; for (var i = 0; i < 1000; i++) { cur.next = {}; cur = cur.next; } deepFreeze(root); return Object.isFrozen(cur); }\n  if (k === 'wide') { var list = []; for (var j = 0; j < 100000; j++) list.push({ j: j }); deepFreeze(list); return [Object.isFrozen(list), Object.isFrozen(list[99999])]; }\n}"},"cases":[[["nested"],["TypeError",true,true,true]],[["cycle"],[true,true,true]],[["returns"],true],[["primitives"],[5,"s",null,null,true]],[["symbol"],true],[["shared"],[true,true]],[["getter"],[0,true]],[["mutual"],[true,true]],[["array"],[true,true,true]],[["fn"],[true,true]],[["deep"],true],[["wide"],[true,true]]]},
    solution: {
      approach: `<p>DFS with a WeakSet of visited objects; freeze each node and recurse into object-typed property values (including symbol keys).</p>`,
      code: { lang: 'js', run: true, code: `
'use strict';
function deepFreeze(obj, seen = new WeakSet()) {
  if ((typeof obj !== 'object' && typeof obj !== 'function') || obj === null || seen.has(obj)) return obj;
  seen.add(obj);
  Object.freeze(obj);
  for (const key of Reflect.ownKeys(obj)) {
    const desc = Object.getOwnPropertyDescriptor(obj, key);
    if (desc && 'value' in desc) deepFreeze(desc.value, seen);   // skip getters: do not run them
  }
  return obj;
}
const cfg = deepFreeze({ db: { hosts: ['a', 'b'] }, [Symbol('meta')]: { v: 1 } });
try { cfg.db.hosts.push('c'); } catch (e) { console.log('nested push blocked:', e.constructor.name); }
const o = { name: 'loop' }; o.self = o;
console.log('cycle ok, frozen:', Object.isFrozen(deepFreeze(o).self));
const sym = Object.getOwnPropertySymbols(cfg)[0];
console.log('symbol-keyed child frozen:', Object.isFrozen(cfg[sym]));
` },
      complexity: `<p>O(V + E) over reachable objects and properties; O(V) for the visited set and recursion depth.</p>`,
      followUps: ['Why might you only deep-freeze in development builds?', 'How would you freeze a Map or Set (freeze does not stop <code>map.set</code>)?']
    }
  });

  /* ================= PRACTICE: Medium ================= */
  practice.push({
    title: 'Infinite Currying: sum(1)(2)(3)()',
    level: 'Medium', tags: ['currying', 'closures', 'recursion'], companies: ['Flipkart', 'Amazon', 'Ola'],
    statement: `<p>Implement <code>sum</code> so that <code>sum(a)(b)(c)…()</code> returns the total of all numbers; an empty call ends the chain. Each call may pass several numbers: <code>sum(1, 2)(3)()</code> = 6. Partial chains must be <b>reusable</b>: <code>const s = sum(10); s(1)(); s(2)()</code> → 11 then 12.</p>`,
    constraints: `<p>Up to 10<sup>4</sup> chained calls; numbers are finite.</p>`,
    example: `<p><code>sum(1)(2)(3)()</code> → ${H.c('g', '6')}; <code>sum()</code> → ${H.c('g', '0')}; reuse example gives ${H.c('g', '11, 12')} — not 11, 13.</p>`,
    brute: { why: `<p>Keeping one running total in an outer variable shared by all chains breaks reuse: the second chain starts from the first chain's total.</p>`, code: { lang: 'js', run: true, code: `
let total = 0;                               // shared across all chains: bug
function sumShared(...xs) {
  if (xs.length === 0) { const t = total; return t; }
  total += xs.reduce((a, b) => a + b, 0);
  return sumShared;
}
const s = sumShared(10);
console.log(s(1)(), s(2)());                 // 11 13: the second chain saw the first
` } },
    mcq: { q: 'What makes each partial chain independent?', options: ['Each call returns a NEW closure holding its own running total', 'Using a global counter', 'Calling Object.freeze', 'Using var instead of let'], answer: 0, explain: 'Immutable accumulation: every step creates a new function with total + new numbers, leaving the old closure unchanged.' },
    hints: [`<p>Hint 1: write a helper <code>make(total)</code> that returns a function remembering <code>total</code>.</p>`, `<p>Hint 2: inside, if called with no args return <code>total</code>; otherwise return <code>make(total + sum of args)</code> — a fresh closure.</p>`, `<p>Hint 3: <code>sum(...xs)</code> is just <code>make(0)(...xs)</code>, which also makes <code>sum()</code> return 0.</p>`],
    tests: {"sig":"int[][] -> int","fn":"chk","harness":{"js":"\nfunction chk(groups) {\n  if (groups.length === 1 && groups[0].length === 1 && groups[0][0] === -1) { var s = sum(10); var a = s(1)(), b = s(2)(); var c = s(5)(); return [a, b, c]; }\n  if (groups.length === 1 && groups[0].length === 1 && groups[0][0] === -2) { var chain = sum(0); for (var i = 1; i <= 10000; i++) chain = chain(i); return chain(); }\n  var f = sum;\n  for (var g of groups) f = f.apply(null, g);\n  return f;\n}"},"cases":[[[[[1],[2],[3],[]]],6],[[[[]]],0],[[[[1,2],[3],[]]],6],[[[[5],[]]],5],[[[[-4],[4],[]]],0],[[[[0],[0],[]]],0],[[[[1,2,3,4],[]]],10],[[[[-1]]],[11,12,15]],[[[[-2]]],50005000]]},
    solution: {
      approach: `<p>Persistent (immutable) accumulator: each call creates a new closure with the updated total; empty call returns the total.</p>`,
      code: { lang: 'js', run: true, code: `
function make(total) {
  return function next(...xs) {
    if (xs.length === 0) return total;
    return make(xs.reduce((a, b) => a + b, total));   // new closure, old one untouched
  };
}
const sum = (...xs) => make(0)(...xs);

console.log(sum(1)(2)(3)(), sum(1, 2)(3)(), sum());
const s = sum(10);
console.log(s(1)(), s(2)());   // 11 12
let chain = sum(0);
for (let i = 1; i <= 100; i++) chain = chain(i);
console.log('1..100 =', chain());
` },
      complexity: `<p>O(k) per call with k arguments; O(1) memory per live closure.</p>`,
      followUps: ['Make <code>+sum(1)(2)</code> work without the empty call using <code>Symbol.toPrimitive</code>.', 'Generalise to <code>chain(reducer, init)</code>.']
    }
  });

  practice.push({
    title: 'createSelector: memoized derived data',
    level: 'Medium', tags: ['memoization', 'reference equality', 'composition'], companies: ['Meta', 'Atlassian', 'Postman'],
    statement: `<p>Implement Reselect-style <code>createSelector(inputSelectors, combiner)</code>. The returned <code>selector(state)</code> runs every input selector on <code>state</code>; if all their results are <b>identical</b> (<code>Object.is</code>) to the previous call's, it returns the previous output without calling <code>combiner</code>. Expose <code>selector.recomputations()</code>.</p>`,
    constraints: `<p>1 ≤ inputSelectors.length ≤ 10; cache size 1 (memoize-one).</p>`,
    example: `<p><code>selectVisible = createSelector([s =&gt; s.todos, s =&gt; s.filter], (todos, f) =&gt; todos.filter(...))</code>. Calling it twice with states that share the same <code>todos</code> array and filter → ${H.c('g', '1 recomputation, same output reference')}. Changing only <code>s.user</code> → still cached.</p>`,
    brute: { why: `<p>Recomputing on every call returns a <b>new array</b> each time, so every <code>React.memo</code> child re-renders even when nothing relevant changed. Caching on the whole <code>state</code> object misses whenever any unrelated slice changes.</p>`, code: { lang: 'js', run: true, code: `
const selectDoneNaive = (s) => s.todos.filter((t) => t.done);
const s1 = { todos: [{ done: true }], user: 'a' };
const s2 = { ...s1, user: 'b' };                   // unrelated change
console.log('same output ref?', selectDoneNaive(s1) === selectDoneNaive(s2)); // false -> needless re-render
` } },
    mcq: { q: 'Why compare the <i>input selector results</i> rather than the whole state?', options: ['Unrelated state changes create a new root object but leave the relevant slices identical', 'Comparing state is impossible in JS', 'It is faster to compare functions', 'To support deep equality'], answer: 0, explain: 'With immutable updates, untouched slices keep their references, so comparing slices gives precise cache hits.' },
    hints: [`<p>Hint 1: store <code>lastInputs</code> (array) and <code>lastResult</code> in the closure.</p>`, `<p>Hint 2: compute <code>inputs = inputSelectors.map(f =&gt; f(state))</code>; compare element-wise with <code>Object.is</code>.</p>`, `<p>Hint 3: on miss, call <code>combiner(...inputs)</code>, count a recomputation, store both. First call is always a miss (lastInputs null).</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var combined = 0;\n  var sel = createSelector([function (s) { return s.todos; }, function (s) { return s.filter; }], function (todos, f) { combined++; return todos.filter(function (t) { return f === 'done' ? t.done : true; }); });\n  var s1 = { todos: [{ id: 1, done: true }, { id: 2, done: false }], filter: 'done', user: 'a' };\n  if (k === 'unrelated') { var r1 = sel(s1), r2 = sel(Object.assign({}, s1, { user: 'b' })); return [r1 === r2, combined, sel.recomputations()]; }\n  if (k === 'todosChange') { var a = sel(s1), b = sel(Object.assign({}, s1, { todos: s1.todos.concat([{ id: 3, done: true }]) })); return [a === b, b.length, sel.recomputations()]; }\n  if (k === 'filterChange') { sel(s1); var c = sel(Object.assign({}, s1, { filter: 'all' })); return [c.length, sel.recomputations()]; }\n  if (k === 'sameState') { sel(s1); sel(s1); sel(s1); return sel.recomputations(); }\n  if (k === 'initial') return sel.recomputations();\n  if (k === 'cacheOne') { var s2 = Object.assign({}, s1, { filter: 'all' }); sel(s1); sel(s2); sel(s1); return sel.recomputations(); }\n  if (k === 'isNaN') { var n = 0; var q = createSelector([function (s) { return s.v; }], function (v) { n++; return v; }); q({ v: NaN }); q({ v: NaN }); return n; }\n  if (k === 'zeroes') { var z = 0; var w = createSelector([function (s) { return s.v; }], function (v) { z++; return v; }); w({ v: 0 }); w({ v: -0 }); return z; }\n  if (k === 'many') { var m = createSelector([function (s) { return s.a; }, function (s) { return s.b; }, function (s) { return s.c; }, function (s) { return s.d; }], function (a, b, c2, d) { return a + b + c2 + d; }); var st = { a: 1, b: 2, c: 3, d: 4 }; var r = 0; for (var i = 0; i < 100000; i++) r = m(st); return [r, m.recomputations()]; }\n  if (k === 'argsOrder') { var ord = createSelector([function (s) { return s.x; }, function (s) { return s.y; }], function (x, y) { return x + ':' + y; }); return ord({ x: 'a', y: 'b' }); }\n}"},"cases":[[["unrelated"],[true,1,1]],[["todosChange"],[false,2,2]],[["filterChange"],[2,2]],[["sameState"],1],[["initial"],0],[["cacheOne"],3],[["isNaN"],1],[["zeroes"],2],[["many"],[10,1]],[["argsOrder"],"a:b"]]},
    solution: {
      approach: `<p>Two-level memoization: input selectors are cheap reads; the combiner is guarded by a memoize-one cache over their results.</p>`,
      code: { lang: 'js', run: true, code: `
function createSelector(inputSelectors, combiner) {
  let lastInputs = null, lastResult, count = 0;
  function selector(state) {
    const inputs = inputSelectors.map((f) => f(state));
    const hit = lastInputs !== null && inputs.every((v, i) => Object.is(v, lastInputs[i]));
    if (!hit) { lastResult = combiner(...inputs); lastInputs = inputs; count++; }
    return lastResult;
  }
  selector.recomputations = () => count;
  return selector;
}

const selectVisible = createSelector(
  [(s) => s.todos, (s) => s.filter],
  (todos, filter) => todos.filter((t) => (filter === 'done' ? t.done : true))
);
const s1 = { todos: [{ id: 1, done: true }, { id: 2, done: false }], filter: 'done', user: 'a' };
const s2 = { ...s1, user: 'b' };                          // unrelated change
const s3 = { ...s2, todos: [...s2.todos, { id: 3, done: true }] };
const r1 = selectVisible(s1), r2 = selectVisible(s2), r3 = selectVisible(s3);
console.log('r1 === r2:', r1 === r2, '| r3 length:', r3.length, '| recomputations:', selectVisible.recomputations());
` },
      complexity: `<p>Hit: O(k) for k input selectors. Miss: O(k) + combiner cost. O(k) memory.</p>`,
      followUps: ['Why does a selector shared by many list rows with different props thrash this cache? (Use a factory per row or a larger cache.)', 'Allow selectors to compose: an input selector may itself be a memoized selector.']
    }
  });

  practice.push({
    title: 'Mini Redux: createStore with subscribe',
    level: 'Medium', tags: ['observer', 'pure functions', 'immutability'], companies: ['Microsoft', 'Uber', 'Groww'],
    statement: `<p>Implement <code>createStore(reducer, initialState)</code> returning <code>{ getState, dispatch, subscribe }</code>. <code>dispatch(action)</code> computes <code>reducer(state, action)</code>, stores it, and notifies subscribers <b>only if the state reference changed</b>. <code>subscribe(fn)</code> returns an unsubscribe function. Dispatching from inside the reducer must throw. Unsubscribing during a notification must not skip other listeners in that round.</p>`,
    constraints: `<p>Reducers are pure; up to 10<sup>3</sup> listeners.</p>`,
    example: `<p>reducer handles <code>inc</code>; <code>dispatch({type:'inc'})</code> → state ${H.c('g', '{count: 1}')} and listeners run; <code>dispatch({type:'unknown'})</code> → reducer returns same state → ${H.c('b', 'no notification')}.</p>`,
    brute: { why: `<p>Notifying on every dispatch (even no-ops) causes wasted renders; iterating the live listener array while one unsubscribes skips the next; letting reducers dispatch causes re-entrant, inconsistent state.</p>`, code: { lang: 'js', run: true, code: `
function createStoreNaive(reducer, state) {
  const ls = [];
  return {
    getState: () => state,
    dispatch(a) { state = reducer(state, a); for (let i = 0; i < ls.length; i++) ls[i](); }, // always notifies
    subscribe(fn) { ls.push(fn); return () => ls.splice(ls.indexOf(fn), 1); }
  };
}
const st = createStoreNaive((s) => s, { n: 0 });
st.subscribe(() => console.log('render (wasted)'));
st.dispatch({ type: 'noop' });
` } },
    mcq: { q: 'How does the store know the state "changed" cheaply?', options: ['Reference comparison: the pure reducer returns a new object only when something changed', 'Deep equality on every dispatch', 'JSON.stringify comparison', 'A version counter set by listeners'], answer: 0, explain: 'Immutability turns change detection into a single === check.' },
    hints: [`<p>Hint 1: closure variables: <code>state</code>, <code>listeners</code> array, <code>isDispatching</code> flag.</p>`, `<p>Hint 2: in dispatch: guard re-entrancy, compute next with try/finally to reset the flag, compare <code>next !== state</code> before notifying.</p>`, `<p>Hint 3: notify over a <b>snapshot</b> (<code>listeners.slice()</code>); unsubscribe should be idempotent (calling it twice must not remove someone else).</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var reducer = function (s, a) { return a.type === 'inc' ? Object.assign({}, s, { count: s.count + 1 }) : s; };\n  var store = createStore(reducer, { count: 0 }), log = [];\n  if (k === 'state') { store.dispatch({ type: 'inc' }); store.dispatch({ type: 'inc' }); return store.getState(); }\n  if (k === 'notify') { store.subscribe(function () { log.push(store.getState().count); }); store.dispatch({ type: 'inc' }); store.dispatch({ type: 'noop' }); store.dispatch({ type: 'inc' }); return log; }\n  if (k === 'selfUnsub') { var unA = store.subscribe(function () { log.push('A'); unA(); }); store.subscribe(function () { log.push('B'); }); store.dispatch({ type: 'inc' }); store.dispatch({ type: 'inc' }); return log; }\n  if (k === 'unsub') { var un = store.subscribe(function () { log.push('x'); }); un(); un(); store.dispatch({ type: 'inc' }); return log; }\n  if (k === 'reentrant') { var bad = createStore(function (s, a) { if (a.type === 'x') bad.dispatch({ type: 'y' }); return s; }, {}); try { bad.dispatch({ type: 'x' }); } catch (e) { return e.message; } return 'none'; }\n  if (k === 'afterThrow') { var st2 = createStore(function (s, a) { if (a.type === 'boom') throw new Error('r'); return reducer(s, a); }, { count: 0 }); try { st2.dispatch({ type: 'boom' }); } catch (e) {} st2.dispatch({ type: 'inc' }); return st2.getState().count; }\n  if (k === 'returnsAction') { var act = { type: 'inc' }; return store.dispatch(act) === act; }\n  if (k === 'initial') return store.getState();\n  if (k === 'unsubOther') { var later = function () { log.push('later'); }; var unL; store.subscribe(function () { log.push('first'); unL(); }); unL = store.subscribe(later); store.dispatch({ type: 'inc' }); store.dispatch({ type: 'inc' }); return log; }\n  if (k === 'many') { var n = 0; for (var i = 0; i < 1000; i++) store.subscribe(function () { n++; }); store.dispatch({ type: 'inc' }); return n; }\n  if (k === 'sameRefNoNotify') { var same = { count: 5 }; var s3 = createStore(function (s) { return s; }, same); s3.subscribe(function () { log.push('n'); }); s3.dispatch({ type: 'any' }); return log; }\n}"},"cases":[[["state"],{"count":2}],[["notify"],[1,2]],[["selfUnsub"],["A","B","B"]],[["unsub"],[]],[["reentrant"],"Reducers may not dispatch actions."],[["afterThrow"],1],[["returnsAction"],true],[["initial"],{"count":0}],[["unsubOther"],["first","later","first"]],[["many"],1000],[["sameRefNoNotify"],[]]]},
    solution: {
      approach: `<p>Pure reducer for transitions, observer list for notifications, reference equality for change detection, a snapshot for safe iteration.</p>`,
      code: { lang: 'js', run: true, code: `
function createStore(reducer, initialState) {
  let state = initialState, isDispatching = false;
  let listeners = [];
  return {
    getState: () => state,
    subscribe(fn) {
      listeners.push(fn);
      let active = true;
      return () => {
        if (!active) return;                    // idempotent
        active = false;
        listeners = listeners.filter((l) => l !== fn);
      };
    },
    dispatch(action) {
      if (isDispatching) throw new Error('Reducers may not dispatch actions.');
      let next;
      try { isDispatching = true; next = reducer(state, action); } finally { isDispatching = false; }
      if (next !== state) {
        state = next;
        listeners.slice().forEach((l) => l());  // snapshot
      }
      return action;
    }
  };
}

const reducer = (s, a) => (a.type === 'inc' ? { ...s, count: s.count + 1 } : s);
const store = createStore(reducer, { count: 0 });
const unsubA = store.subscribe(() => { console.log('A sees', store.getState().count); unsubA(); });
store.subscribe(() => console.log('B sees', store.getState().count));
store.dispatch({ type: 'inc' });    // A 1, B 1 (A unsubscribes itself, B not skipped)
store.dispatch({ type: 'noop' });   // nothing printed
store.dispatch({ type: 'inc' });    // B 2
const bad = createStore((s, a) => { if (a.type === 'x') bad.dispatch({ type: 'y' }); return s; }, {});
try { bad.dispatch({ type: 'x' }); } catch (e) { console.log('blocked:', e.message); }
` },
      complexity: `<p>dispatch: O(reducer) + O(L) for L listeners; subscribe O(1); unsubscribe O(L).</p>`,
      followUps: ['Add middleware support: <code>applyMiddleware(...mws)</code> using compose.', 'Add <code>select(selector, onChange)</code> that fires only when the selected slice changes.']
    }
  });

  practice.push({
    title: 'Lazy Async Singleton (one connection, even under concurrency)',
    level: 'Medium', tags: ['singleton', 'promises', 'memoization'], companies: ['Amazon', 'Zerodha', 'Stripe'],
    statement: `<p>Write <code>lazySingleton(factory)</code> returning <code>get()</code>. The async <code>factory()</code> creates an expensive resource (e.g. a DB pool). Requirements: the factory runs <b>at most once</b> even if 100 callers call <code>get()</code> at the same moment; all of them receive the same instance; if the factory <b>rejects</b>, the failure is passed to those callers but the <i>next</i> <code>get()</code> retries. Also provide <code>reset()</code> for tests.</p>`,
    constraints: `<p>Up to 10<sup>4</sup> concurrent callers.</p>`,
    example: `<p>Three concurrent <code>get()</code> calls → ${H.c('g', 'factory runs once')}, all three get the same object. First factory call rejects → callers see the error, ${H.c('b', 'next get() calls factory again')}.</p>`,
    brute: { why: `<p>Caching the <i>resolved instance</i> (<code>if (!instance) instance = await factory()</code>) has a race: every caller that arrives before the first await finishes sees <code>instance</code> still empty and starts its own factory call — 100 pools instead of 1.</p>`, code: { lang: 'js', run: true, code: `
let created = 0, instance = null;
const factory = () => new Promise((r) => setTimeout(() => r({ id: ++created }), 10));
async function getRacy() {
  if (!instance) instance = await factory();   // everyone passes this check before the first await resolves
  return instance;
}
Promise.all([getRacy(), getRacy(), getRacy()]).then(() => console.log('factory ran', created, 'times'));
` } },
    mcq: { q: 'What should be cached to fix the race?', options: ['The pending Promise, stored synchronously before any await', 'The resolved value only', 'A boolean "creating" flag and busy-waiting', 'Nothing; use setTimeout'], answer: 0, explain: 'Storing the promise synchronously means every later caller in the same tick finds it and awaits the same work.' },
    hints: [`<p>Hint 1: the critical section is the gap between "check" and "store" — make it synchronous by storing the promise immediately.</p>`, `<p>Hint 2: <code>promise ??= factory().catch(err =&gt; { promise = null; throw err; })</code>.</p>`, `<p>Hint 3: <code>reset()</code> just sets the cached promise to null. Be careful that a late rejection from an <i>old</i> promise does not clear a newer one — compare before clearing.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 1); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(k) {\n  return __job(async function () {\n    var created = 0, calls = 0, failFirst = k === 'failRetry';\n    var factory = function () { calls++; return new Promise(function (res, rej) { setTimeout(function () { if (failFirst && calls === 1) rej(new Error('db down')); else res({ id: ++created }); }, 5); }); };\n    var get = lazySingleton(factory);\n    if (k === 'concurrent') { var rs = await Promise.all(Array.from({ length: 100 }, function () { return get(); })); return [calls, rs.every(function (r) { return r === rs[0]; }), rs[0].id]; }\n    if (k === 'failRetry') {\n      var first = await Promise.allSettled([get(), get(), get()]);\n      var afterFirst = calls;\n      var second = await get();\n      return [first.map(function (r) { return r.status === 'rejected' ? r.reason.message : 'ok'; }), afterFirst, second.id, calls];\n    }\n    if (k === 'cached') { var a = await get(), b = await get(); return [a === b, calls]; }\n    if (k === 'reset') { var x = await get(); get.reset(); var y = await get(); return [x === y, calls, x.id, y.id]; }\n    if (k === 'many') { var all = await Promise.all(Array.from({ length: 10000 }, function () { return get(); })); return [calls, all[9999] === all[0]]; }\n    if (k === 'laterConcurrent') { var p1 = get(); var v1 = await p1; var p2 = get(); return [p1 === p2, (await p2) === v1, calls]; }\n  });\n}"},"cases":[[["concurrent"],[1,true,1]],[["failRetry"],[["db down","db down","db down"],1,1,2]],[["cached"],[true,1]],[["reset"],[false,2,1,2]],[["many"],[1,true]],[["laterConcurrent"],[true,true,1]]]},
    solution: {
      approach: `<p>Memoize the promise (not the value). On rejection, clear the cache only if it still holds that same promise, so retries work and newer attempts are not clobbered.</p>`,
      code: { lang: 'js', run: true, code: `
function lazySingleton(factory) {
  let promise = null;
  function get() {
    if (!promise) {
      const p = Promise.resolve().then(factory).catch((err) => {
        if (promise === p) promise = null;      // allow retry, but only for this attempt
        throw err;
      });
      promise = p;
    }
    return promise;
  }
  get.reset = () => { promise = null; };
  return get;
}

let created = 0, failNext = true;
const getPool = lazySingleton(() => new Promise((res, rej) => setTimeout(() => {
  if (failNext) { failNext = false; rej(new Error('db down')); } else res({ id: ++created });
}, 10)));

Promise.allSettled([getPool(), getPool(), getPool()])
  .then((rs) => console.log('first round:', rs.map((r) => r.status).join(',')))
  .then(() => Promise.all([getPool(), getPool(), getPool()]))
  .then((pools) => console.log('same instance:', pools[0] === pools[2], '| factory successes:', created));
` },
      complexity: `<p>O(1) per <code>get()</code>; one factory call per success (plus one per failed attempt).</p>`,
      followUps: ['Add a timeout so a hung factory does not block callers forever.', 'Why is a module-level singleton dangerous in a multi-tenant server?']
    }
  });

  practice.push({
    title: 'Simulate Debounce and Throttle Schedules',
    level: 'Medium', tags: ['debounce', 'throttle', 'simulation', 'event timeline'], companies: ['Google', 'Microsoft', 'Swiggy'],
    statement: `<p>Write a <b>pure</b> function <code>schedule(times, wait)</code> that, for sorted event timestamps, returns when each strategy runs the handler: <code>debounce</code> (trailing: <code>wait</code> ms after the last event of each burst) and <code>throttle</code> (leading + trailing, lodash-style: run on an event if the window is free; if events arrive during the window, run once more at the window's end with the latest one, and that trailing run opens a new window). Return <code>{ debounce: [[runAt, eventTime], …], throttle: [[runAt, eventTime], …] }</code>.</p>`,
    constraints: `<p>1 ≤ n ≤ 10<sup>5</sup>; ties: a timer due at time T fires before an event at T.</p>`,
    example: `<p>times = [0, 40, 80, 300], wait = 100 → debounce ${H.c('g', '[[180, 80], [400, 300]]')}; throttle ${H.c('b', '[[0, 0], [100, 80], [300, 300]]')} — 40 and 80 fell in the window [0, 100), so 80 (latest) runs at 100.</p>`,
    brute: { why: `<p>Simulating every millisecond (a loop from 0 to the last time) is O(T) — for timestamps up to 10<sup>9</sup> that is far too slow. You only need to visit event times and timer-due times.</p>`, code: { lang: 'js', run: true, code: `
function debounceTick(times, wait) {             // simulate every ms: O(maxTime)
  const runs = []; let due = null, lastEv = null, k = 0;
  for (let t = 0; t <= times[times.length - 1] + wait; t++) {
    if (due === t) { runs.push([t, lastEv]); due = null; }
    while (k < times.length && times[k] === t) { lastEv = t; due = t + wait; k++; }
  }
  return runs;
}
console.log(debounceTick([0, 40, 80, 300], 100));
` } },
    mcq: { q: 'For trailing debounce, event i produces a run if and only if…', options: ['the next event is at least wait ms later (or there is no next event)', 'it is the first event', 'the previous event was wait ms earlier', 'its index is even'], answer: 0, explain: 'A run happens wait ms after an event only when no new event resets the timer before then.' },
    hints: [`<p>Hint 1: debounce needs no simulation: event i runs at <code>t[i] + wait</code> exactly when <code>t[i+1] - t[i] &gt;= wait</code> or i is last.</p>`, `<p>Hint 2: throttle: keep <code>windowEnd</code> (−∞ when free) and <code>pending</code> (latest event during the window). Before handling an event at t, flush any trailing run whose <code>windowEnd &lt;= t</code>.</p>`, `<p>Hint 3: flushing a trailing run at <code>windowEnd</code> opens a new window ending at <code>windowEnd + wait</code>; with no pending event, the window simply closes. After the last event, keep flushing once.</p>`],
    tests: {"sig":"int[] int -> string","fn":"chk","harness":{"js":"\nfunction chk(times, wait) {\n  if (wait < 0) { var r = schedule(times, -wait); return [r.debounce.length, r.throttle.length, r.debounce[r.debounce.length - 1], r.throttle[r.throttle.length - 1]]; }\n  return schedule(times, wait);\n}"},"cases":[[[[0,40,80,300],100],{"debounce":[[180,80],[400,300]],"throttle":[[0,0],[100,80],[300,300]]}],[[[0,10,20,30,40,50,60,70],25],{"debounce":[[95,70]],"throttle":[[0,0],[25,20],[50,40],[75,70]]}],[[[5],10],{"debounce":[[15,5]],"throttle":[[5,5]]}],[[[0,100],100],{"debounce":[[100,0],[200,100]],"throttle":[[0,0],[100,100]]}],[[[0,100,200,300],100],{"debounce":[[100,0],[200,100],[300,200],[400,300]],"throttle":[[0,0],[100,100],[200,200],[300,300]]}],[[[0,50,100,150,200],100],{"debounce":[[300,200]],"throttle":[[0,0],[100,50],[200,150],[300,200]]}],[[[0,1,2,3],1],{"debounce":[[1,0],[2,1],[3,2],[4,3]],"throttle":[[0,0],[1,1],[2,2],[3,3]]}],[[[10,10,10],5],{"debounce":[[15,10]],"throttle":[[10,10],[15,10]]}],[[[0,99,100,101,250,251],100],{"debounce":[[201,101],[351,251]],"throttle":[[0,0],[100,99],[200,101],[300,251]]}],[[[0,60,120,180,240,300],100],{"debounce":[[400,300]],"throttle":[[0,0],[100,60],[200,180],[300,240],[400,300]]}],[[[0,40,80,300],100],{"debounce":[[180,80],[400,300]],"throttle":[[0,0],[100,80],[300,300]]}],[[{"$range":[0,100000]},-1000],[1,101,[100999,99999],[100000,99999]]]]},
    solution: {
      approach: `<p>Debounce by a gap rule in one pass. Throttle by an event-driven simulation that only visits event times and window ends.</p>`,
      code: { lang: 'js', run: true, code: `
function schedule(times, wait) {
  const debounce = [];
  times.forEach((t, i) => {
    if (i === times.length - 1 || times[i + 1] - t >= wait) debounce.push([t + wait, t]);
  });

  const throttle = [];
  let windowEnd = -Infinity, pending = null;
  function flushUntil(t) {                         // fire trailing runs due at or before t
    while (windowEnd <= t && windowEnd !== -Infinity) {
      if (pending === null) { windowEnd = -Infinity; break; }
      throttle.push([windowEnd, pending]);
      pending = null;
      windowEnd += wait;                            // trailing run opens a new window
    }
  }
  for (const t of times) {
    flushUntil(t);
    if (windowEnd === -Infinity) { throttle.push([t, t]); windowEnd = t + wait; }  // leading
    else pending = t;                                                                // remember latest
  }
  flushUntil(Infinity);
  return { debounce, throttle };
}
const r = schedule([0, 40, 80, 300], 100);
console.log('debounce:', JSON.stringify(r.debounce));   // [[180,80],[400,300]]
console.log('throttle:', JSON.stringify(r.throttle));   // [[0,0],[100,80],[300,300]]
console.log(JSON.stringify(schedule([0, 10, 20, 30, 40, 50, 60, 70], 25).throttle));
` },
      complexity: `<p>O(n) time (each event and each trailing run handled once), O(runs) space.</p>`,
      followUps: ['Add <code>maxWait</code> to the debounce simulation.', 'Use this pure function to unit-test your real debounce/throttle with fake timers.']
    }
  });

  practice.push({
    title: 'Measure/Mutate Scheduler (fastdom-style)',
    level: 'Medium', tags: ['layout thrashing', 'batching', 'requestAnimationFrame'], companies: ['Pinterest', 'LinkedIn', 'Canva'],
    statement: `<p>Build <code>createScheduler(raf)</code> with <code>measure(fn)</code> and <code>mutate(fn)</code>. Jobs are queued; one <code>raf</code> callback per frame runs <b>all queued measures first, then all mutates</b>. Jobs added during a flush (e.g. a measure that queues a mutate) run in the same frame if they are mutates queued during the measure phase; anything else waits for the next frame. Test with a fake <code>raf</code>.</p>`,
    constraints: `<p>Up to 10<sup>4</sup> jobs per frame; at most one raf request outstanding.</p>`,
    example: `<p>Calls: mutate(W1), measure(R1 → queues mutate W2), measure(R2). One frame runs ${H.c('g', 'R1, R2, W1, W2')} — reads never interleave with writes.</p>`,
    brute: { why: `<p>Running each job immediately in call order produces W R W R… — the exact thrashing pattern. Calling <code>raf</code> per job schedules many callbacks per frame and still interleaves.</p>`, code: { lang: 'js', run: true, code: `
const order = [];
const measureNow = (fn) => fn(), mutateNow = (fn) => fn();
mutateNow(() => order.push('W1'));
measureNow(() => { order.push('R1'); mutateNow(() => order.push('W2')); });
measureNow(() => order.push('R2'));
console.log(order.join(' '));   // W1 R1 W2 R2 -> interleaved (thrash)
` } },
    mcq: { q: 'Why must the scheduler request at most ONE frame callback at a time?', options: ['So all jobs of a frame are flushed together in one read phase and one write phase', 'Because raf can only be called once per page', 'To save memory on closures', 'Because mutates must run before measures'], answer: 0, explain: 'Batching is the whole point; multiple callbacks per frame would bring back interleaving.' },
    hints: [`<p>Hint 1: two arrays (<code>reads</code>, <code>writes</code>) and a <code>scheduled</code> flag.</p>`, `<p>Hint 2: in the frame: drain reads (<code>splice(0)</code>) and run them; then drain writes in a loop, because measures may have queued new writes.</p>`, `<p>Hint 3: measures queued during the write phase must wait for the next frame (reading after writing would force layout) — schedule another frame if <code>reads</code> is non-empty at the end.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var queue = [], rafCalls = 0, fakeRaf = function (cb) { rafCalls++; queue.push(cb); };\n  var frame = function () { var cbs = queue.splice(0); cbs.forEach(function (cb) { cb(); }); return cbs.length; };\n  var s = createScheduler(fakeRaf), order = [];\n  if (k === 'example') { s.mutate(function () { order.push('W1'); }); s.measure(function () { order.push('R1'); s.mutate(function () { order.push('W2'); }); }); s.measure(function () { order.push('R2'); }); frame(); return [order, rafCalls, queue.length]; }\n  if (k === 'oneRaf') { for (var i = 0; i < 100; i++) { s.measure(function () {}); s.mutate(function () {}); } return [rafCalls, frame()]; }\n  if (k === 'readsFirst') { s.mutate(function () { order.push('W'); }); s.measure(function () { order.push('R'); }); frame(); return order; }\n  if (k === 'fifo') { s.measure(function () { order.push('r1'); }); s.measure(function () { order.push('r2'); }); s.mutate(function () { order.push('w1'); }); s.mutate(function () { order.push('w2'); }); frame(); return order; }\n  if (k === 'nextFrameRead') { s.mutate(function () { order.push('W'); s.measure(function () { order.push('R-next'); }); }); frame(); var after1 = order.slice(); var pending = queue.length; frame(); return [after1, pending, order]; }\n  if (k === 'nextFrameMutate') { s.mutate(function () { order.push('W1'); s.mutate(function () { order.push('W2-next'); }); }); frame(); var a1 = order.slice(); var pend = queue.length; frame(); return [a1, pend, order]; }\n  if (k === 'readInRead') { s.measure(function () { order.push('R1'); s.measure(function () { order.push('R2-next'); }); }); frame(); var b1 = order.slice(); var pq = queue.length; frame(); return [b1, pq, order]; }\n  if (k === 'idle') { frame(); return [rafCalls, queue.length]; }\n  if (k === 'frameAfterIdle') { s.measure(function () { order.push('A'); }); frame(); s.measure(function () { order.push('B'); }); frame(); return [order, rafCalls]; }\n  if (k === 'many') { var n = 0; for (var j = 0; j < 10000; j++) { s.measure(function () { n++; }); s.mutate(function () { n++; }); } frame(); return [n, rafCalls]; }\n}"},"cases":[[["example"],[["R1","R2","W1","W2"],1,0]],[["oneRaf"],[1,1]],[["readsFirst"],["R","W"]],[["fifo"],["r1","r2","w1","w2"]],[["nextFrameRead"],[["W"],1,["W","R-next"]]],[["nextFrameMutate"],[["W1"],1,["W1","W2-next"]]],[["readInRead"],[["R1"],1,["R1","R2-next"]]],[["idle"],[0,0]],[["frameAfterIdle"],[["A","B"],2]],[["many"],[20000,1]]]},
    solution: {
      approach: `<p>Queue + single frame flush with two phases; re-schedule if new reads arrived during writes.</p>`,
      code: { lang: 'js', run: true, code: `
function createScheduler(raf) {
  const reads = [], writes = [];
  let scheduled = false;
  function flush() {
    for (const fn of reads.splice(0)) fn();                 // phase 1: all measures
    for (const fn of writes.splice(0)) fn();                 // phase 2: all mutates (includes mutates queued by measures)
    scheduled = false;                                       // jobs queued during flush did not request a frame
    if (reads.length || writes.length) request();            // anything queued during the writes waits for the next frame
  }
  function request() { if (!scheduled) { scheduled = true; raf(flush); } }
  return {
    measure(fn) { reads.push(fn); request(); },
    mutate(fn) { writes.push(fn); request(); }
  };
}

// Fake requestAnimationFrame: we decide when a frame happens
const frameQueue = [];
const fakeRaf = (cb) => frameQueue.push(cb);
const nextFrame = (label) => { const cbs = frameQueue.splice(0); console.log(label, '-> callbacks:', cbs.length); cbs.forEach((cb) => cb()); };

const order = [];
const s = createScheduler(fakeRaf);
s.mutate(() => order.push('W1'));
s.measure(() => { order.push('R1'); s.mutate(() => order.push('W2')); });
s.measure(() => order.push('R2'));
s.mutate(() => { order.push('W3'); s.measure(() => order.push('R3 (next frame)')); });
nextFrame('frame 1');
nextFrame('frame 2');
console.log(order.join(' '));   // R1 R2 W1 W3 W2 R3 (next frame): W2 was queued during the read phase
` },
      complexity: `<p>O(1) to queue; O(jobs) per frame; at most one raf callback outstanding.</p>`,
      followUps: ['Add <code>clear(job)</code> to cancel a queued job.', 'Return a Promise from measure so callers can <code>await</code> a value.']
    }
  });

  /* ================= PRACTICE: Hard ================= */
  practice.push({
    title: 'Curry with Placeholders',
    level: 'Hard', tags: ['currying', 'closures', 'lodash'], companies: ['Google', 'Uber', 'Flipkart'],
    statement: `<p>Implement <code>curry(fn)</code> supporting a placeholder <code>curry.placeholder</code> (call it <code>_</code>). A placeholder reserves a position to be filled by later calls. The function runs once the first <code>fn.length</code> slots are all filled with non-placeholders. Example: <code>c(_, 2)(1, 3)</code> ≡ <code>fn(1, 2, 3)</code>; <code>c(_, _, 3)(1)(2)</code> ≡ <code>fn(1, 2, 3)</code>.</p>`,
    constraints: `<p>fn.length ≤ 10; each partial must be reusable (no shared mutable state).</p>`,
    example: `<p>fn = (a, b, c) =&gt; [a, b, c]. <code>c(_, 'b')('a')('c')</code> → ${H.c('g', "['a','b','c']")}. <code>c(_, _, 'c')(_, 'b')('a')</code> → ${H.c('g', "['a','b','c']")} — the new placeholder in the second call keeps slot 0 open.</p>`,
    brute: { why: `<p>Plain curry concatenates arguments, so a placeholder is treated as a real value and <code>fn</code> runs too early with <code>_</code> inside. Counting only non-placeholder args is also wrong — order matters.</p>`, code: { lang: 'js', run: true, code: `
const _ = Symbol('placeholder');
function curryPlain(fn) {
  return function c(...args) {
    return args.length >= fn.length ? fn(...args) : (...m) => c(...args, ...m);
  };
}
const show = curryPlain((a, b, cc) => [a, b, cc]);
console.log(show(_, 'b')('a')); // runs with the placeholder inside: wrong
` } },
    mcq: { q: 'When a new call arrives, which slots do its arguments fill first?', options: ['Existing placeholder slots, left to right; leftovers are appended', 'Always appended to the end', 'Always the first slots, overwriting', 'Random slots'], answer: 0, explain: 'That is lodash semantics: holes are filled in order, then extra arguments extend the list.' },
    hints: [`<p>Hint 1: keep an array <code>slots</code> that may contain placeholders. A merge step takes the old slots and the new args and returns a NEW array.</p>`, `<p>Hint 2: merge — walk old slots; each placeholder slot takes the next new arg (which may itself be a placeholder); then append remaining new args.</p>`, `<p>Hint 3: ready when <code>slots.length &gt;= arity</code> and none of the first <code>arity</code> slots is the placeholder. Then call <code>fn.apply(this, slots)</code>.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var _ = curry.placeholder;\n  var c = curry(function (a, b, cc) { return [a, b, cc].join('-'); });\n  if (k === 'mid') return c(_, 'b')('a', 'c');\n  if (k === 'lead') return c(_, _, 'c')(_, 'b')('a');\n  if (k === 'mixed') return c('a')(_, 'c')('b');\n  if (k === 'reuse') { var p = c(_, 'x'); return [p('1', '2'), p('3', '4')]; }\n  if (k === 'plain') return [c('a')('b')('c'), c('a', 'b')('c'), c('a', 'b', 'c')];\n  if (k === 'allHoles') return c(_, _, _)('x', 'y', 'z');\n  if (k === 'tail') return c(_, _, 'z')('x', 'y');\n  if (k === 'oneByOne') return c(_)(_)('a', 'b', 'c');\n  if (k === 'extra') return curry(function (a, b) { return [].slice.call(arguments).join(','); })(1, 2, 3);\n  if (k === 'arity1') return curry(function (a) { return a + '!'; })('hi');\n  if (k === 'placeholderIsSymbol') return typeof _;\n  if (k === 'this') { var o = { v: 7, f: curry(function (a, b) { return this.v + a + b; }) }; return o.f(_, 1).call(o, 2); }\n  if (k === 'four') { var f4 = curry(function (a, b, c2, d) { return a + b + c2 + d; }); return [f4(_, 'b', _, 'd')('a', 'c'), f4(_, _, _, 'd')(_, 'b')(_, 'c')('a')]; }\n}"},"cases":[[["mid"],"a-b-c"],[["lead"],"a-b-c"],[["mixed"],"a-b-c"],[["reuse"],["1-x-2","3-x-4"]],[["plain"],["a-b-c","a-b-c","a-b-c"]],[["allHoles"],"x-y-z"],[["tail"],"x-y-z"],[["oneByOne"],"a-b-c"],[["extra"],"1,2,3"],[["arity1"],"hi!"],[["placeholderIsSymbol"],"symbol"],[["this"],10],[["four"],["abcd","abcd"]]]},
    solution: {
      approach: `<p>Immutable slot merging: each call produces a new slots array (holes filled left-to-right, rest appended) and a new closure; run when the first n slots are real values.</p>`,
      code: { lang: 'js', run: true, code: `
function curry(fn, arity = fn.length) {
  const PH = curry.placeholder;
  function merge(slots, args) {
    const out = slots.slice();
    let j = 0;
    for (let i = 0; i < out.length && j < args.length; i++) {
      if (out[i] === PH) out[i] = args[j++];      // fill holes in order
    }
    while (j < args.length) out.push(args[j++]); // append the rest
    return out;
  }
  const ready = (slots) => slots.length >= arity && slots.slice(0, arity).every((v) => v !== PH);
  function make(slots) {
    return function (...args) {
      const next = merge(slots, args);
      return ready(next) ? fn.apply(this, next) : make(next);
    };
  }
  return make([]);
}
curry.placeholder = Symbol('_');
const _ = curry.placeholder;

const c = curry((a, b, cc) => [a, b, cc].join('-'));
console.log(c(_, 'b')('a', 'c'));           // a-b-c
console.log(c(_, _, 'c')(_, 'b')('a'));     // a-b-c
console.log(c('a')(_, 'c')('b'));           // a-b-c
const p = c(_, 'x');
console.log(p('1', '2'), p('3', '4'));      // 1-x-2 3-x-4 (reusable)
` },
      complexity: `<p>Each call O(k) for k collected slots; overall O(n<sup>2</sup>) worst case for arity n — trivial for n ≤ 10.</p>`,
      followUps: ['Support <code>curryRight</code> with placeholders.', 'How would you type this in TypeScript? (Hint: it gets very hard — discuss trade-offs.)']
    }
  });

  practice.push({
    title: 'memoizeAsync with TTL, Dedupe and Max Size',
    level: 'Hard', tags: ['memoization', 'promises', 'LRU', 'TTL'], companies: ['Netflix', 'Razorpay', 'Cloudflare'],
    statement: `<p>Implement <code>memoizeAsync(fn, { ttl, max, now })</code> for an async function of one primitive key. Rules: concurrent calls with the same key share one in-flight promise; successful results are cached for <code>ttl</code> ms (measured with the injected <code>now()</code>); rejected promises are <b>not</b> cached; at most <code>max</code> entries are kept with LRU eviction; expired entries are recomputed. Expose <code>size()</code>.</p>`,
    constraints: `<p>1 ≤ max ≤ 10<sup>4</sup>; O(1) average per call.</p>`,
    example: `<p>ttl 1000. t=0: get(1) ×3 concurrently → ${H.c('g', '1 call to fn')}. t=500: get(1) → cached. t=1500: get(1) → ${H.c('y', 'expired, recompute')}. get(9) rejects → next get(9) ${H.c('b', 'retries')}.</p>`,
    brute: { why: `<p>Caching resolved values only (after await) loses dedupe — concurrent calls all miss. Caching promises forever keeps failures and stale data, and the map grows without bound.</p>`, code: { lang: 'js', run: true, code: `
function memoAsyncNaive(fn) {
  const cache = new Map();
  return async (k) => {
    if (cache.has(k)) return cache.get(k);
    const v = await fn(k);            // concurrent callers all reach here before set
    cache.set(k, v);                  // never expires, never evicts
    return v;
  };
}
let calls = 0;
const m = memoAsyncNaive(async (k) => { calls++; return k * 2; });
Promise.all([m(1), m(1), m(1)]).then(() => console.log('fn calls:', calls)); // 3
` } },
    mcq: { q: 'When should the TTL clock start for an entry?', options: ['When the promise resolves successfully', 'When the request starts', 'When the entry is evicted', 'It does not matter'], answer: 0, explain: 'Starting at resolution gives every successful value a full ttl of freshness; starting at request time would shorten it by the latency. (Both are defensible; state your choice in an interview.)' },
    hints: [`<p>Hint 1: one <code>Map</code> key → <code>{ promise, expires }</code>; <code>expires = Infinity</code> while in flight.</p>`, `<p>Hint 2: on lookup: if present and <code>now() &lt; expires</code>, move to newest (delete + set) and return the promise; else delete it and start a new call.</p>`, `<p>Hint 3: on resolve set <code>expires = now() + ttl</code> (only if the entry is still the same object); on reject delete it (again only if it is the same entry). Evict <code>map.keys().next().value</code> while size &gt; max.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 1); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction chk(k) {\n  return __job(async function () {\n    var t = 0, calls = 0;\n    var mk = function (opts) { return memoizeAsync(async function (key) { calls++; if (key === 9) throw new Error('boom'); return key * 10; }, Object.assign({ ttl: 1000, max: 100, now: function () { return t; } }, opts || {})); };\n    var get = mk();\n    if (k === 'dedupe') { var rs = await Promise.all([get(1), get(1), get(1)]); return [rs, calls]; }\n    if (k === 'cachedWithin') { await get(1); t = 500; await get(1); t = 999; await get(1); return calls; }\n    if (k === 'expired') { await get(1); t = 1001; await get(1); return calls; }\n    if (k === 'rejectNotCached') { var m = []; for (var i = 0; i < 2; i++) { try { await get(9); } catch (e) { m.push(e.message); } } return [m, calls]; }\n    if (k === 'sharedRejection') { var rr = await Promise.allSettled([get(9), get(9), get(9)]); return [rr.map(function (r) { return r.status; }), calls]; }\n    if (k === 'lru') { var g2 = mk({ max: 2 }); await g2(1); await g2(2); await g2(1); await g2(3); await g2(2); await g2(1); return [calls, g2.size()]; }\n    if (k === 'size') { var g3 = mk({ max: 2 }); await g3(1); await g3(2); await g3(3); return g3.size(); }\n    if (k === 'values') return [await get(4), await get(5)];\n    if (k === 'differentKeys') { await get(1); await get(2); await get(1); await get(2); return calls; }\n    if (k === 'big') { var g4 = mk({ max: 10000 }); for (var j = 0; j < 20000; j++) await g4(j + 100); return [calls, g4.size()]; }\n    if (k === 'ttlAfterResolve') { await get(1); t = 400; await get(1); t = 1100; await get(1); return calls; }\n    if (k === 'retryAfterFail') { try { await get(9); } catch (e) {} try { await get(9); } catch (e) {} return calls; }\n  });\n}"},"cases":[[["dedupe"],[[10,10,10],1]],[["cachedWithin"],1],[["expired"],2],[["rejectNotCached"],[["boom","boom"],2]],[["sharedRejection"],[["rejected","rejected","rejected"],1]],[["lru"],[5,2]],[["size"],2],[["values"],[40,50]],[["differentKeys"],2],[["ttlAfterResolve"],2],[["big"],[20000,10000]]]},
    solution: {
      approach: `<p>Map-based LRU of entries holding the shared promise and an expiry. Identity checks ensure late settlements of old attempts never corrupt newer entries.</p>`,
      code: { lang: 'js', run: true, code: `
function memoizeAsync(fn, { ttl = 1000, max = 100, now = Date.now } = {}) {
  const cache = new Map();
  function get(key) {
    const hit = cache.get(key);
    if (hit && now() < hit.expires) {
      cache.delete(key); cache.set(key, hit);          // LRU touch
      return hit.promise;
    }
    if (hit) cache.delete(key);                          // expired
    const entry = { expires: Infinity, promise: null };
    entry.promise = Promise.resolve().then(() => fn(key)).then(
      (v) => { if (cache.get(key) === entry) entry.expires = now() + ttl; return v; },
      (e) => { if (cache.get(key) === entry) cache.delete(key); throw e; }
    );
    cache.set(key, entry);
    while (cache.size > max) cache.delete(cache.keys().next().value);
    return entry.promise;
  }
  get.size = () => cache.size;
  return get;
}

let t = 0, calls = 0;
const get = memoizeAsync(async (k) => { calls++; if (k === 9) throw new Error('boom'); return k * 10; }, { ttl: 1000, max: 2, now: () => t });

(async () => {
  await Promise.all([get(1), get(1), get(1)]);
  console.log('after 3 concurrent:', calls);           // 1
  t = 500; await get(1); console.log('t=500 cached:', calls);   // 1
  t = 1500; await get(1); console.log('t=1500 expired:', calls); // 2
  await get(9).catch(() => {}); await get(9).catch(() => {});
  console.log('failures not cached:', calls);          // 4
  await get(2); await get(3);                           // max 2 -> evicts LRU
  console.log('size:', get.size());                     // 2
})();
` },
      complexity: `<p>O(1) average per call; O(max) memory.</p>`,
      followUps: ['Add stale-while-revalidate: return the stale value instantly and refresh in the background.', 'Support an AbortSignal so a caller can stop waiting without cancelling the shared request.']
    }
  });

  practice.push({
    title: 'Undo/Redo History with Structural Sharing',
    level: 'Hard', tags: ['immutability', 'structural sharing', 'design'], companies: ['Figma', 'Canva', 'Notion'],
    statement: `<p>Implement <code>createHistory(initial, limit)</code> with <code>state()</code>, <code>apply(updater)</code> (updater is a pure function <code>state =&gt; newState</code>), <code>undo()</code>, <code>redo()</code>, <code>canUndo()</code>, <code>canRedo()</code>. Applying after an undo discards the redo stack. If the updater returns the <i>same</i> reference, record nothing. Keep at most <code>limit</code> past states. Because states are immutable and share structure, storing many versions must be cheap.</p>`,
    constraints: `<p>1 ≤ limit ≤ 10<sup>3</sup>; O(1) per operation (excluding the updater).</p>`,
    example: `<p>apply(add 'a') → apply(add 'b') → undo → state ${H.c('b', "['a']")} → redo → ${H.c('g', "['a','b']")} → undo, apply(add 'c') → ${H.c('g', "['a','c']")}, canRedo() = ${H.c('r', 'false')}.</p>`,
    brute: { why: `<p>Storing deep clones of the whole document for every step multiplies memory by the number of steps, and mutating the current state in place makes the stored "past" states change too (they are the same objects).</p>`, code: { lang: 'js', run: true, code: `
const past = [];
let doc = { items: ['a'] };
past.push(doc);
doc.items.push('b');                    // mutation: the stored past changes too
console.log('past[0] after mutation:', past[0].items); // ['a','b'] -> undo impossible
` } },
    mcq: { q: 'Why is storing every past state cheap here?', options: ['Immutable updates copy only the changed path; unchanged subtrees are shared between versions', 'JavaScript compresses objects automatically', 'Old states are garbage collected immediately', 'Because we store diffs as strings'], answer: 0, explain: 'Structural sharing means each version costs only the size of the changed path, not the whole document.' },
    hints: [`<p>Hint 1: three parts — <code>past</code> stack, <code>present</code>, <code>future</code> stack (the classic Redux-undo shape).</p>`, `<p>Hint 2: apply: next = updater(present); if next === present return; push present to past (trim to limit), present = next, future = [].</p>`, `<p>Hint 3: undo moves present to the front of future and pops past; redo is the mirror. Use arrays with push/pop for O(1) (trimming with shift is O(limit) — acceptable, or use a ring buffer).</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var add = function (x) { return function (s) { return { title: s.title, meta: s.meta, items: s.items.concat([x]) }; }; };\n  var h = createHistory({ title: 'doc', meta: { big: [0] }, items: [] }, k === 'limit' ? 3 : 50);\n  var items = function () { return h.state().items; };\n  if (k === 'example') { h.apply(add('a')); h.apply(add('b')); var out = [items()]; h.undo(); out.push(items()); h.redo(); out.push(items()); h.undo(); h.apply(add('c')); out.push(items(), h.canRedo()); return out; }\n  if (k === 'empty') return [h.canUndo(), h.canRedo(), h.undo(), h.redo()];\n  if (k === 'noop') { var r = h.apply(function (s) { return s; }); return [r, h.canUndo(), h.canRedo()]; }\n  if (k === 'returns') { return [h.apply(add('a')), h.undo(), h.redo()]; }\n  if (k === 'shared') { h.apply(add('a')); var v1 = h.state(); h.apply(add('b')); var v2 = h.state(); return [v1.meta === v2.meta, v1 !== v2]; }\n  if (k === 'limit') { for (var i = 1; i <= 6; i++) h.apply(add(i)); var steps = 0; while (h.undo()) steps++; return [steps, items()]; }\n  if (k === 'redoClears') { h.apply(add('a')); h.apply(add('b')); h.undo(); h.apply(add('x')); return [h.canRedo(), items(), h.redo()]; }\n  if (k === 'undoAll') { h.apply(add(1)); h.apply(add(2)); h.apply(add(3)); h.undo(); h.undo(); h.undo(); return [items(), h.canUndo(), h.canRedo()]; }\n  if (k === 'redoAll') { h.apply(add(1)); h.apply(add(2)); h.undo(); h.undo(); h.redo(); h.redo(); return [items(), h.canRedo()]; }\n  if (k === 'identity') { h.apply(add('a')); var s1 = h.state(); h.undo(); h.redo(); return h.state() === s1; }\n  if (k === 'big') { var g = createHistory({ n: 0 }, 1000); for (var j = 0; j < 100000; j++) g.apply(function (s) { return { n: s.n + 1 }; }); var back = 0; while (g.undo()) back++; return [back, g.state().n]; }\n}"},"cases":[[["example"],[["a","b"],["a"],["a","b"],["a","c"],false]],[["empty"],[false,false,false,false]],[["noop"],[false,false,false]],[["returns"],[true,true,true]],[["shared"],[true,true]],[["limit"],[3,[1,2,3]]],[["redoClears"],[false,["a","x"],false]],[["undoAll"],[[],false,true]],[["redoAll"],[[1,2],false]],[["identity"],true],[["big"],[1000,99000]]]},
    solution: {
      approach: `<p>past/present/future stacks of immutable snapshots. Updaters are pure, so snapshots never change after being stored, and structural sharing keeps memory proportional to the edits.</p>`,
      code: { lang: 'js', run: true, code: `
function createHistory(initial, limit = 100) {
  let past = [], present = initial, future = [];
  return {
    state: () => present,
    apply(updater) {
      const next = updater(present);
      if (next === present) return false;          // no-op: record nothing
      past.push(present);
      if (past.length > limit) past.shift();
      present = next;
      future = [];                                 // new branch: redo history is gone
      return true;
    },
    undo() { if (!past.length) return false; future.push(present); present = past.pop(); return true; },
    redo() { if (!future.length) return false; past.push(present); present = future.pop(); return true; },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0
  };
}

const add = (x) => (s) => ({ ...s, items: [...s.items, x] });
const h = createHistory({ title: 'doc', meta: { big: new Array(1000).fill(0) }, items: [] }, 50);
h.apply(add('a')); h.apply(add('b'));
const v2 = h.state();
h.undo(); console.log(h.state().items);           // ['a']
h.redo(); console.log(h.state().items, h.state() === v2);
h.undo(); h.apply(add('c'));
console.log(h.state().items, 'canRedo:', h.canRedo());
console.log('big meta shared across versions:', h.state().meta === v2.meta);
console.log('no-op recorded?', h.apply((s) => s));
` },
      complexity: `<p>apply/undo/redo O(1) (shift is O(limit) when trimming). Memory O(limit × size of changed path) thanks to sharing.</p>`,
      followUps: ['Coalesce rapid edits (typing) into one undo step using a debounce window.', 'How do collaborative editors (CRDTs/OT) change the undo story?']
    }
  });

  practice.push({
    title: 'debouncePromise: every caller gets the final result',
    level: 'Hard', tags: ['debounce', 'promises', 'closures'], companies: ['Airbnb', 'Atlassian', 'Microsoft'],
    statement: `<p>Implement <code>debouncePromise(fn, wait, clock)</code> where <code>fn</code> may be async. Every call returns a Promise. All calls in the same burst resolve (or reject) with the result of the <b>single</b> trailing <code>fn</code> call made with the latest arguments. A later burst gets a fresh promise. Use the injected <code>clock.setTimeout/clearTimeout</code> so it can be tested with simulated time.</p>`,
    constraints: `<p>Up to 10<sup>5</sup> calls per burst; O(1) per call.</p>`,
    example: `<p>validate('a'), validate('ab'), validate('abc') within the wait window → ${H.c('g', 'fn called once with "abc"')}; all three promises resolve to its result. A call after the burst settles starts a new burst.</p>`,
    brute: { why: `<p>A plain debounce returns <code>undefined</code> to callers, so form code cannot <code>await</code> validation. Returning a new promise per call that is never settled when superseded leaks pending promises and hangs awaiting callers.</p>`, code: { lang: 'js', run: true, code: `
function debounce(fn, wait) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
}
const v = debounce(async (s) => s.length > 2, 10);
console.log('caller receives:', v('abc'));   // undefined: nothing to await
` } },
    mcq: { q: 'What do all callers in one burst share?', options: ['One deferred promise (resolve/reject captured once per burst)', 'One setTimeout per caller', 'Their own fn calls', 'Nothing — only the last caller is resolved'], answer: 0, explain: 'Create a deferred on the first call of a burst; every call in that burst returns it; the trailing run settles it.' },
    hints: [`<p>Hint 1: state: <code>timer</code>, <code>latestArgs</code>, and a <code>deferred</code> = { promise, resolve, reject } created lazily at the start of each burst.</p>`, `<p>Hint 2: each call stores its args, resets the timer, and returns <code>deferred.promise</code>.</p>`, `<p>Hint 3: when the timer fires, detach the deferred (set the variable to null so the next call starts a new burst), then <code>Promise.resolve().then(() =&gt; fn(...args))</code> and pipe the outcome to resolve/reject. <code>Promise.withResolvers()</code> (ES2024) builds the deferred in one line.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"var __q = Promise.resolve(), __n = 0, __ready = new Promise(function (r) { setTimeout(r, 1); });\nfunction __job(f) { var ci = __n++; __q = __q.then(function () { return __ready; }).then(f).then(function (v) { console.log('@@' + ci + ' ' + _h_json(v)); }, function (e) { console.log('@@' + ci + ' !' + e); }); return null; }\nfunction __cap(f) { var out = [], old = console.log; console.log = function () { out.push([].join.call(arguments, ' ')); }; return Promise.resolve().then(f).then(function (v) { console.log = old; return [v, out]; }, function (e) { console.log = old; throw e; }); }\n\nfunction __mk() {\n  var now = 0, id = 0, timers = [];\n  return {\n    setTimeout: function (fn, ms) { var t = { id: ++id, at: now + ms, fn: fn }; timers.push(t); return t.id; },\n    clearTimeout: function (i) { timers = timers.filter(function (t) { return t.id !== i; }); },\n    advance: function (ms) { var end = now + ms; while (true) { var due = timers.filter(function (t) { return t.at <= end; }).sort(function (a, b) { return a.at - b.at; })[0]; if (!due) break; timers = timers.filter(function (t) { return t !== due; }); now = due.at; due.fn(); } now = end; }\n  };\n}\nfunction chk(k) {\n  return __job(async function () {\n    var clock = __mk(), calls = [];\n    var fn = async function (s) { calls.push(s); if (s === 'bad') throw new Error('invalid'); return s + ' is ' + (s.length >= 3 ? 'valid' : 'short'); };\n    var d = debouncePromise(fn, 100, clock);\n    if (k === 'burst') { var ps = [d('a'), d('ab'), d('abc')]; clock.advance(150); var rs = await Promise.all(ps); return [rs, calls, ps[0] === ps[2]]; }\n    if (k === 'twoBursts') { var p1 = d('abc'); clock.advance(100); var r1 = await p1; var p2 = d('xy'); clock.advance(100); var r2 = await p2; return [r1, r2, p1 === p2, calls]; }\n    if (k === 'noEarly') { var p = d('abc'); clock.advance(99); var settled = false; p.then(function () { settled = true; }); await Promise.resolve(); await Promise.resolve(); var early = settled; clock.advance(1); await p; return [early, settled, calls]; }\n    if (k === 'rejects') { var q = [d('x'), d('bad')]; clock.advance(100); var out = await Promise.allSettled(q); return [out.map(function (r) { return r.status === 'rejected' ? r.reason.message : r.value; }), calls]; }\n    if (k === 'restart') { var a = d('abc'); clock.advance(60); d('abcd'); clock.advance(60); var early2 = calls.length; clock.advance(40); await a; return [early2, calls]; }\n    if (k === 'sync') { var ds = debouncePromise(function (x) { return x * 2; }, 50, clock); var pr = ds(21); clock.advance(50); return await pr; }\n    if (k === 'many') { var all = []; for (var i = 0; i < 100000; i++) all.push(d('abc' + i)); clock.advance(100); var res = await Promise.all(all); return [calls.length, res[0], res[99999] === res[0], calls[0]]; }\n    if (k === 'afterReject') { var f1 = d('bad'); clock.advance(100); try { await f1; } catch (e) {} var f2 = d('ok1'); clock.advance(100); return [await f2, calls]; }\n  });\n}"},"cases":[[["burst"],[["abc is valid","abc is valid","abc is valid"],["abc"],true]],[["twoBursts"],["abc is valid","xy is short",false,["abc","xy"]]],[["noEarly"],[false,true,["abc"]]],[["rejects"],[["invalid","invalid"],["bad"]]],[["restart"],[0,["abcd"]]],[["sync"],42],[["many"],[1,"abc99999 is valid",true,"abc99999"]],[["afterReject"],["ok1 is valid",["bad","ok1"]]]]},
    solution: {
      approach: `<p>One deferred per burst; the trailing run settles it; detaching before running ensures calls made while fn is in flight start a new burst.</p>`,
      code: { lang: 'js', run: true, code: `
function debouncePromise(fn, wait, clock) {
  let timer = null, latestArgs = null, deferred = null;
  return function (...args) {
    latestArgs = args;
    if (!deferred) {
      let resolve, reject;
      const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
      deferred = { promise, resolve, reject };
    }
    if (timer !== null) clock.clearTimeout(timer);
    timer = clock.setTimeout(() => {
      const d = deferred, a = latestArgs;
      timer = null; deferred = null; latestArgs = null;      // next call = new burst
      Promise.resolve().then(() => fn(...a)).then(d.resolve, d.reject);
    }, wait);
    return deferred.promise;
  };
}

function createClock() {
  let now = 0, id = 0; const timers = new Map();
  return {
    setTimeout(f, ms) { timers.set(++id, { at: now + ms, f }); return id; },
    clearTimeout(i) { timers.delete(i); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        let best = null;
        for (const [k, v] of timers) if (v.at <= end && (!best || v.at < best[1].at)) best = [k, v];
        if (!best) break;
        timers.delete(best[0]); now = best[1].at; best[1].f();
      }
      now = end;
    }
  };
}

const clock = createClock();
let calls = 0;
const validate = debouncePromise(async (s) => { calls++; return s + ' is ' + (s.length >= 3 ? 'valid' : 'too short'); }, 100, clock);
const ps = [validate('a'), validate('ab'), validate('abc')];
clock.advance(150);
Promise.all(ps).then((rs) => {
  console.log(rs, '| fn calls:', calls, '| same promise:', ps[0] === ps[2]);
  const p2 = validate('x');
  clock.advance(100);
  return p2;
}).then((r) => console.log('second burst:', r, '| fn calls:', calls));
` },
      complexity: `<p>O(1) per call; one promise per burst; one fn call per burst.</p>`,
      followUps: ['Reject superseded bursts with an AbortError instead of sharing (which semantics fits search vs validation?).', 'Add <code>cancel()</code> that rejects the pending promise.']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push(
    { q: 'Which function is pure?', options: ['<code>(a) =&gt; a.toSorted()</code>', '<code>(a) =&gt; a.sort()</code>', '<code>() =&gt; Date.now()</code>', '<code>(x) =&gt; { cache.push(x); return x; }</code>'], answer: 0, explain: '<code>toSorted</code> returns a new array. <code>sort</code> mutates its argument, <code>Date.now</code> is a hidden input, and pushing to an outer array is a side effect.' },
    { q: '<code>const o = Object.freeze({ list: [1] }); o.list.push(2);</code> — what happens?', options: ['It works; freeze is shallow so the nested array is still mutable', 'TypeError in all modes', 'The push is silently ignored', 'o.list becomes undefined'], answer: 0, explain: 'Object.freeze only freezes own properties of o. The array it points to is a separate, unfrozen object.' },
    { q: 'After <code>const next = { ...state, user: { ...state.user, name: \'X\' } }</code>, which is true?', options: ['<code>next.settings === state.settings</code>', '<code>next.user === state.user</code>', '<code>next === state</code>', 'state.user.name is now X'], answer: 0, explain: 'Only the path root → user was copied; untouched branches like settings are shared by reference (structural sharing).' },
    { q: 'What does <code>compose(x =&gt; x + 1, x =&gt; x * 2)(5)</code> return?', options: ['11', '12', '7', '10'], answer: 0, explain: 'compose runs right to left: 5 * 2 = 10, then 10 + 1 = 11. pipe would give (5 + 1) * 2 = 12.' },
    { q: 'Why does <code>pipe()</code> (no functions) need <code>reduce</code> seeded with <code>x</code>?', options: ['So that an empty pipeline returns its input (identity) instead of throwing', 'To make it faster', 'Because reduce cannot be called without a seed on functions', 'To support async functions'], answer: 0, explain: 'reduce on an empty array without an initial value throws a TypeError; seeding with x makes pipe() the identity function.' },
    { q: 'With a generic <code>curry(fn)</code> that relies on <code>fn.length</code>, what goes wrong for <code>(a, b = 2) =&gt; a + b</code>?', options: ['fn.length is 1, so it runs after the first argument', 'It never runs', 'It throws a SyntaxError', 'Nothing; defaults are counted'], answer: 0, explain: 'length counts parameters before the first default or rest parameter. Pass an explicit arity to fix it.' },
    { q: '<code>[\'1\', \'2\', \'3\'].map(parseInt)</code> returns…', options: ['[1, NaN, NaN]', '[1, 2, 3]', '[NaN, NaN, NaN]', 'TypeError'], answer: 0, explain: 'map passes (value, index): parseInt(\'2\', 1) and parseInt(\'3\', 2) are NaN. A classic point-free pitfall; use <code>map(Number)</code> or <code>map(s =&gt; parseInt(s, 10))</code>.' },
    { q: 'Which function is UNSAFE to memoize?', options: ['<code>(id) =&gt; fetchLivePrice(id)</code>', '<code>(n) =&gt; fib(n)</code>', '<code>(s) =&gt; s.toUpperCase()</code> on long strings', '<code>(a, b) =&gt; gcd(a, b)</code>'], answer: 0, explain: 'A live price changes over time (hidden input); memoizing returns stale data. The others are pure.' },
    { q: 'A memoized async function should handle a rejected promise by…', options: ['removing it from the cache so the next call retries', 'caching it forever', 'converting it to undefined', 'retrying in an infinite loop'], answer: 0, explain: 'Cache the in-flight promise for dedupe, but evict it on rejection or every later call gets the same error.' },
    { q: 'User types continuously for 3 seconds with debounce(300) and throttle(300). How many times does each handler run during the typing (before it stops)?', options: ['debounce: 0, throttle: about 10', 'debounce: 10, throttle: 0', 'both about 10', 'both 0'], answer: 0, explain: 'Debounce waits for 300 ms of silence, which never happens while typing. Throttle runs at most once per 300 ms → ~10 times in 3 s.' },
    { q: 'Which loop causes layout thrashing?', options: ['for each el: <code>el.style.width = w; total += el.offsetWidth;</code>', 'read all <code>offsetWidth</code> values, then set all widths', 'set all <code>transform</code> values', 'build nodes in a DocumentFragment then append once'], answer: 0, explain: 'Writing a style then reading geometry in the same iteration forces a synchronous layout each time.' },
    { q: 'Animating which property usually avoids layout AND paint?', options: ['<code>transform</code>', '<code>width</code>', '<code>top</code>', '<code>margin-left</code>'], answer: 0, explain: 'transform (and opacity) can be handled by the compositor; geometry properties trigger layout every frame.' },
    { q: 'In an EventEmitter, why iterate over a copy of the listener array in <code>emit</code>?', options: ['A listener that unsubscribes during emit would otherwise make the loop skip the next listener', 'Copies are faster to iterate', 'To deep-clone the event arguments', 'It is required for once() to work in Node'], answer: 0, explain: 'Splicing the live array during iteration shifts indexes; a snapshot keeps this round stable.' },
    { q: 'Why is <code>export const logger = createLogger()</code> effectively a singleton?', options: ['An ES module is evaluated once and cached; every importer gets the same binding', 'export makes objects frozen', 'const prevents a second instance', 'Node forbids multiple instances of objects'], answer: 0, explain: 'Module evaluation happens once per module record (resolved specifier). Caveat: duplicate package copies or dual ESM/CJS builds can create two.' }
  );

  /* ================= INTERVIEW ================= */
  interview.push(
    { q: 'What is a pure function, and why do React and Redux care about purity?', level: 'I', a: `<p>A pure function returns the same output for the same input and has no side effects: it reads nothing but its arguments and changes nothing outside itself. React assumes components render as pure functions of props/state, so it can render them twice (StrictMode does this deliberately), pause and resume rendering, or skip rendering. Redux reducers must be pure so time-travel debugging, replay and reference-based change detection work: a reducer that mutates <code>state</code> returns the same reference and the UI never updates. Practical rule: keep decisions in a pure core, and push I/O, clock and randomness to the edges.</p>`, followUps: ['Is a function that throws on invalid input pure?', 'Is local mutation inside a function allowed?', 'How do you make <code>Date.now()</code>-dependent logic testable?'] },
    { q: 'Explain shallow vs deep copy and structural sharing in JavaScript.', level: 'I', a: `<p>A shallow copy (<code>{...o}</code>, <code>[...a]</code>, <code>Object.assign</code>) creates a new top-level container whose properties still point at the same nested objects. A deep copy (<code>structuredClone</code>) recursively copies everything, so nothing is shared, but it costs O(size), breaks every <code>===</code> check and cannot clone functions or class prototypes. Structural sharing is the middle ground used by immutable updates: copy only the objects on the path to the change and reuse every untouched branch. The update costs O(depth × width of each level), old versions remain valid (cheap undo), and unchanged slices keep their identity, so memoized components and selectors can skip work.</p>`, followUps: ['When would <code>JSON.parse(JSON.stringify(x))</code> give wrong results?', 'How does Immer produce structurally shared updates from mutable-looking code?'] },
    { q: 'Implement compose and pipe, and explain the difference.', level: 'B', a: `<p><code>const pipe = (...fns) =&gt; x =&gt; fns.reduce((acc, f) =&gt; f(acc), x)</code> and <code>const compose = (...fns) =&gt; x =&gt; fns.reduceRight((acc, f) =&gt; f(acc), x)</code>. Both build one function out of many unary functions. pipe runs left to right (reads like a recipe or a Unix pipe), compose runs right to left (mirrors math notation f(g(x))). Seeding with <code>x</code> makes the empty case the identity. For async steps, fold over a promise: <code>fns.reduce((p, f) =&gt; p.then(f), Promise.resolve(x))</code>. Composition is associative, so steps can be grouped into named sub-pipelines.</p>`, followUps: ['How would you let the first function take multiple arguments?', 'How do you debug a long pipeline?', 'How is Koa/Express middleware a form of composition?'] },
    { q: 'What is currying? How is it different from partial application? Implement curry.', level: 'I', a: `<p>Currying transforms an n-argument function into a chain of functions each taking one argument (auto-curry accepts any grouping). Partial application fixes some arguments now and returns a function expecting the rest — <code>fn.bind(null, a)</code> is built-in partial application. Implementation: <code>function curry(fn) { return function curried(...args) { return args.length &gt;= fn.length ? fn.apply(this, args) : function (...more) { return curried.apply(this, args.concat(more)); }; }; }</code>. Key details: create a new args array each time (so partials are reusable), forward <code>this</code>, and beware that <code>fn.length</code> ignores default and rest parameters.</p>`, followUps: ['Add placeholder support.', 'Implement infinite currying <code>sum(1)(2)(3)()</code>.', 'When does currying hurt readability or performance?'] },
    { q: 'Design a memoize function for production use. What decisions matter?', level: 'A', a: `<p>Decisions: (1) <b>purity</b> — only memoize deterministic functions; (2) <b>key</b> — single primitive arg uses the value directly; multiple args need a resolver, JSON for primitives only, or a nested Map/WeakMap trie keyed by identity for objects; (3) <b>bounds</b> — unbounded Maps leak in long-running servers, so add LRU (Map insertion order: delete + set on hit, evict the first key) and/or TTL; WeakMap for object keys lets GC clean up; (4) <b>async</b> — cache the in-flight promise for dedupe, evict on rejection; (5) <b>scope</b> — per request vs global, include tenant/user in keys to avoid data leaks; (6) <b>observability</b> — hit-rate metrics, because a 0% hit-rate cache is pure overhead.</p>`, followUps: ['Why is lodash.memoize keyed only by the first argument by default?', 'How do you prevent a thundering herd on a cache miss?'] },
    { q: 'Debounce vs throttle: explain, give use cases, and implement both.', level: 'B', a: `<p>Debounce delays execution until <code>wait</code> ms pass with no new calls — it runs once after a burst ends (search-as-you-type, autosave, resize end). Throttle guarantees at most one execution per <code>wait</code> ms — it runs steadily during a burst (scroll tracking, drag, infinite scroll checks). Debounce: <code>clearTimeout(t); t = setTimeout(() =&gt; fn.apply(this, args), wait)</code>. Throttle (timestamp, leading): <code>if (now - last &gt;= wait) { last = now; fn.apply(this, args); }</code>. Leading-only throttle can drop the final event, so production throttles add a trailing call. Lodash throttle is debounce with <code>leading: true, trailing: true, maxWait: wait</code>.</p>`, followUps: ['What does <code>maxWait</code> solve?', 'How do you use a debounced function correctly inside a React component?', 'How would you unit-test them without real waiting?'] },
    { q: 'How would you test debounce and throttle deterministically?', level: 'A', a: `<p>Remove the hidden inputs: inject the clock and timer functions (or use fake timers such as <code>vi.useFakeTimers()</code>/<code>jest.useFakeTimers()</code>, which replace <code>setTimeout</code> and <code>Date.now</code>). Then drive simulated time: call the function at chosen timestamps (<code>advanceTimersByTime</code> between calls) and assert exactly when and with which arguments the spy ran. Test cases: single call, burst, two bursts, leading/trailing combos (single call with both should run once), <code>cancel</code>, <code>flush</code>, <code>maxWait</code> under continuous calls, <code>this</code> forwarding, and ties at exactly <code>wait</code>. A pure <code>schedule(times, wait)</code> model function can serve as an oracle for property-based tests.</p>`, followUps: ['Why are real-time sleeps in tests flaky?', 'How do fake timers interact with promises and microtasks?'] },
    { q: 'What is layout thrashing and how do you fix it?', level: 'I', a: `<p>Browsers defer layout: a style/DOM write only marks layout dirty. Reading geometry (<code>offsetHeight</code>, <code>getBoundingClientRect</code>, <code>scrollTop</code>, <code>getComputedStyle</code>) while it is dirty forces a synchronous layout. Interleaving writes and reads in a loop forces one layout per iteration — thrashing — which can take hundreds of milliseconds on large DOMs and hurts INP. Fixes: batch all reads then all writes; schedule writes in <code>requestAnimationFrame</code> or use a measure/mutate scheduler (fastdom); animate <code>transform</code>/<code>opacity</code>; use <code>ResizeObserver</code>/<code>IntersectionObserver</code> instead of polling; reduce scope with CSS containment or <code>content-visibility</code>; virtualize long lists. Find it in DevTools Performance as "Forced reflow" warnings.</p>`, followUps: ['Which properties are compositor-only?', 'What is INP and what is a good value?', 'How does React batching interact with useLayoutEffect measurements?'] },
    { q: 'Implement an EventEmitter. What edge cases do you handle?', level: 'I', a: `<p>Store <code>Map&lt;event, listener[]&gt;</code>. <code>on</code> pushes and returns an unsubscribe function; <code>off</code> removes by identity (most recent match) and deletes empty keys; <code>once</code> registers a wrapper that removes itself before calling the original, and stores <code>wrapper.listener = fn</code> so <code>off(event, fn)</code> works; <code>emit</code> iterates over a snapshot so self-removal does not skip listeners and returns whether anyone listened. Edge cases: duplicate listeners (Node allows them), errors thrown by one listener (isolate or rethrow), re-entrant emits, max-listener warnings for leaks, and the special <code>'error'</code> event in Node.</p>`, followUps: ['How would you add wildcard events?', 'How do you prevent memory leaks with listeners in SPA components?'] },
    { q: 'Singleton in JavaScript: how do you implement it, and why is it often considered an anti-pattern?', level: 'I', a: `<p>Simplest: export an instance from a module — ES modules evaluate once and are cached. Class version: a static private field holding the instance, returned from the constructor or a static <code>getInstance()</code>; for async resources, cache the creation <i>promise</i> so concurrent callers share one initialisation. Criticism: it is global mutable state, hides dependencies (functions reach out instead of receiving what they need), makes tests share state, and can silently become several instances with duplicate package versions, dual ESM/CJS builds, HMR or per-container serverless. Better: create the instance at the composition root and inject it.</p>`, followUps: ['How do you reset a singleton between tests?', 'Why can a module-level cache leak data between users on a server?'] },
    { q: 'Factory functions vs classes in JavaScript — when do you choose which?', level: 'I', a: `<p>Factory functions return objects built from closures: private state is truly private, methods never lose <code>this</code> when passed as callbacks, they can return different concrete types (registry-based factories), and they avoid <code>new</code>. Downsides: each object gets its own method closures (more memory with many instances) and no <code>instanceof</code>. Classes put methods on the prototype (shared, memory-efficient, well-optimised by engines with hidden classes), support <code>#private</code> fields, inheritance and <code>instanceof</code>, but methods need binding when detached. Choose classes for many instances or framework requirements; factories for small numbers of objects, polymorphic creation, or dependency injection-style APIs.</p>`, followUps: ['How does a factory help with testing?', 'What is the abstract factory pattern and do you need it in JS?'] },
    { q: 'How would you make a search box fast and correct (performance + race conditions)?', level: 'A', a: `<p>Debounce the input handler (~250–400 ms trailing) so only pauses trigger requests; optionally require a minimum length. Handle races: abort the previous request with <code>AbortController</code> or tag requests with an increasing id and ignore stale responses, so an old slow response cannot overwrite newer results. Cache results per query (memoized promise with TTL and LRU bound) so backspacing is instant and concurrent duplicates are deduped. Render efficiently: virtualize long result lists, keep the input responsive (avoid heavy synchronous work in the handler; use <code>useDeferredValue</code>/<code>startTransition</code> in React for filtering). Measure with INP in the field.</p>`, followUps: ['Debounce vs AbortController — are both needed?', 'How would you add keyboard navigation without re-rendering the whole list?'] },
    { q: 'What changes when you apply functional programming ideas in a large JavaScript codebase? Trade-offs?', level: 'E', a: `<p>Gains: pure, small functions are easy to test and reuse; immutability enables cheap change detection, undo, safe concurrency (workers, React concurrent rendering) and debugging (time travel); composition makes data flow explicit. Costs: allocation and copying (GC pressure in hot paths), deep spread chains that are hard to read (Immer helps), point-free code that obscures intent and stack traces, and TypeScript complexity for generic pipe/curry. Pragmatic approach: functional core, imperative shell; local mutation inside pure functions is fine; normalize state to keep updates shallow; profile before optimising; prefer readable named steps over clever combinators.</p>`, followUps: ['Where would you deliberately allow mutation?', 'How do you introduce these practices to a team incrementally?'] },
    { q: 'How do you use AI assistants effectively for this kind of code (patterns, performance utilities) without shipping subtle bugs?', level: 'E', a: `<p>Use AI to draft utilities (debounce, memoize, emitters) and, more importantly, to generate adversarial tests: fake-timer suites for timing code, concurrency tests for memoized promises, mutation-detection tests with deep-frozen inputs. Then review against a checklist the model often misses: <code>this</code> forwarding, shared mutable state across partials, caching rejections, unbounded caches, live-array iteration during emit, recreating debounced functions on every render, read/write interleaving in DOM code. Verify performance claims with a profiler and real metrics (INP, long tasks) rather than trusting "this is faster". Own the architecture decisions — effect boundaries, cache scope, and lifecycles — yourself.</p>`, followUps: ['Which of these bugs would type checking catch, and which need tests?', 'How would you prompt an agent to profile and fix jank on a page?'] }
  );

  registerModule({
    id: 'js13',
    title: 'Functional Programming, Patterns & Performance in JS',
    intro: `<p>This expert module turns everyday JavaScript into <b>clean, fast, interview-ready code</b>. You will learn to write <b>pure functions</b> and <b>immutable updates</b> (and why React/Redux depend on them), build bigger functions out of small ones with <b>compose/pipe</b>, specialise functions with <b>currying</b>, and speed things up safely with <b>memoization</b>.</p>
<p>Then we cover the classic <b>JS design patterns</b> — module, singleton, factory and observer — the way they are really written in modern JavaScript (closures and ES modules, not Java-style ceremony), and two performance topics that appear in nearly every frontend interview: <b>debounce vs throttle</b> (studied with simulated timestamps, so you can see every timer) and <b>avoiding layout thrashing</b> in the browser rendering pipeline.</p>
<p>Every topic has an analogy first, a visualizer you can play with, runnable code, worked examples, expert deep dives and an "AI era" section on how to use assistants without shipping their typical bugs. The practice set mirrors real machine-coding rounds: implement <code>pipe</code>, <code>curry</code> (with placeholders), <code>memoize</code> (LRU, TTL, async), <code>EventEmitter</code>, a mini Redux store, lodash-style <code>debounce</code>, and a fastdom-style scheduler.</p>`,
    goals: [
      'Spot side effects and hidden inputs, and refactor code into a pure core with an imperative shell',
      'Update deeply nested state immutably with structural sharing, and explain why <code>===</code> change detection depends on it',
      'Implement <code>compose</code>, <code>pipe</code>, <code>pipeAsync</code>, <code>curry</code> (including placeholders and infinite currying) from scratch',
      'Design a production memoize: keys, purity, LRU/TTL bounds, async dedupe without caching failures',
      'Implement module, singleton (incl. lazy async), factory and observer/EventEmitter patterns idiomatically and discuss their trade-offs',
      'Choose and implement debounce vs throttle (leading/trailing, maxWait, cancel/flush) and test them with a fake clock',
      'Explain the rendering pipeline, diagnose forced synchronous layouts, and fix layout thrashing by batching reads and writes'
    ],
    prereqs: `JS 4 (Scope, Hoisting, TDZ &amp; Closures), JS 5 (this, call/apply/bind), JS 7–8 (Promises, Event Loop &amp; async/await) and JS 2 (array methods: map, filter, reduce). Basic DOM knowledge helps for the layout-thrashing topic.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
