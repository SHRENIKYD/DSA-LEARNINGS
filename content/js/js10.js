(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (js10) ---------- */
  function cp(code, hlMap, label, lang) {
    return { type: 'code', label: label || 'TypeScript (current line highlighted)', lang: lang || 'ts', code: code, hl: hlMap || {} };
  }
  function vp(obj, hlMap, label) {
    var vals = {};
    Object.keys(obj).forEach(function (k) { vals[k] = String(obj[k]); });
    return { type: 'vars', label: label || 'What the compiler knows', vals: vals, hl: hlMap || {} };
  }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function uniq(a) { var o = []; a.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }

  /* tiny literal parser: 42, -1.5, "hi", 'hi', true, null, undefined, [..], { k: v } */
  function parseLit(src) {
    var s = String(src === undefined ? '' : src).trim(), i = 0;
    var hint = 'Type a JS value such as 42, "hi", true, null, [1, "a"] or { name: "Ann", age: 3 }';
    if (!s) throw new Error(hint);
    if (s.length > 120) throw new Error('Keep the value under 120 characters');
    function ws() { while (i < s.length && /\s/.test(s[i])) i++; }
    function fail() { throw new Error('Could not read that value. ' + hint); }
    function val(depth) {
      if (depth > 4) throw new Error('Nesting too deep (max 4 levels)');
      ws();
      var c = s[i], m;
      if (c === '"' || c === "'") {
        var q = c; i++; var st = i;
        while (i < s.length && s[i] !== q) i++;
        if (i >= s.length) fail();
        var v = s.slice(st, i); i++;
        return { k: 'string', v: v };
      }
      if (c === '[') {
        i++; var items = []; ws();
        if (s[i] === ']') { i++; return { k: 'array', items: items }; }
        while (true) {
          items.push(val(depth + 1)); ws();
          if (items.length > 8) throw new Error('Use at most 8 array items');
          if (s[i] === ',') { i++; continue; }
          if (s[i] === ']') { i++; break; }
          fail();
        }
        return { k: 'array', items: items };
      }
      if (c === '{') {
        i++; var props = []; ws();
        if (s[i] === '}') { i++; return { k: 'object', props: props }; }
        while (true) {
          ws();
          var key;
          m = /^[A-Za-z_$][\w$]*/.exec(s.slice(i));
          if (m) { key = m[0]; i += key.length; }
          else if (s[i] === '"' || s[i] === "'") { key = val(depth + 1).v; }
          else fail();
          ws(); if (s[i] !== ':') fail(); i++;
          props.push([key, val(depth + 1)]); ws();
          if (props.length > 6) throw new Error('Use at most 6 properties');
          if (s[i] === ',') { i++; continue; }
          if (s[i] === '}') { i++; break; }
          fail();
        }
        return { k: 'object', props: props };
      }
      m = /^-?\d+(\.\d+)?/.exec(s.slice(i));
      if (m) { i += m[0].length; return { k: 'number', v: m[0] }; }
      m = /^(true|false|null|undefined)\b/.exec(s.slice(i));
      if (m) {
        i += m[0].length;
        if (m[0] === 'null') return { k: 'null' };
        if (m[0] === 'undefined') return { k: 'undefined' };
        return { k: 'boolean', v: m[0] };
      }
      fail();
    }
    var r = val(0); ws();
    if (i !== s.length) fail();
    return r;
  }
  function showVal(n) {
    if (n.k === 'string') return '"' + n.v + '"';
    if (n.k === 'number' || n.k === 'boolean') return n.v;
    if (n.k === 'null' || n.k === 'undefined') return n.k;
    if (n.k === 'array') return '[' + n.items.map(showVal).join(', ') + ']';
    return '{ ' + n.props.map(function (p) { return p[0] + ': ' + showVal(p[1]); }).join(', ') + ' }';
  }
  /* type TS infers for `let x = value` (widened) */
  function widen(n) {
    if (n.k === 'string' || n.k === 'number' || n.k === 'boolean') return n.k;
    if (n.k === 'null' || n.k === 'undefined') return 'any (evolving)';
    if (n.k === 'array') {
      if (!n.items.length) return 'any[] (evolving)';
      var ts = uniq(n.items.map(function (x) { var w = widen(x); return w === 'any (evolving)' ? x.k : w; }));
      return ts.length === 1 ? (/[|{ ]/.test(ts[0]) ? '(' + ts[0] + ')[]' : ts[0] + '[]') : '(' + ts.join(' | ') + ')[]';
    }
    return '{ ' + n.props.map(function (p) { var w = widen(p[1]); if (w === 'any (evolving)') w = p[1].k; return p[0] + ': ' + w; }).join('; ') + (n.props.length ? ' }' : '}');
  }
  /* type for `const x = value` (literal for primitives, still widened inside objects/arrays) */
  function constType(n) {
    if (n.k === 'string') return '"' + n.v + '"';
    if (n.k === 'number' || n.k === 'boolean') return n.v;
    if (n.k === 'null' || n.k === 'undefined') return n.k;
    return widen(n);
  }
  /* type for `value as const` */
  function asConst(n) {
    if (n.k === 'array') return 'readonly [' + n.items.map(asConst).join(', ') + ']';
    if (n.k === 'object') return '{ ' + n.props.map(function (p) { return 'readonly ' + p[0] + ': ' + asConst(p[1]); }).join('; ') + ' }';
    return constType(n);
  }

  /* ================= TOPIC 1: Why TypeScript, annotations & inference ================= */
  topics.push({
    title: 'Why TypeScript, Type Annotations & Type Inference',
    analogy: `<p>Think of <b>labels on kitchen jars</b>. Plain JavaScript is a kitchen where no jar has a label: you only find out the white powder is <i>salt, not sugar</i> when the cake tastes awful (a runtime error, in front of users). TypeScript is a friend who <b>labels every jar</b> and shouts <i>"that's salt!"</i> the moment you reach for it while baking — <b>before</b> anyone eats.</p>
<p>The best part: your friend is clever. If you pour sugar into a jar, they write "sugar" on it themselves (<b>inference</b>). You only write labels by hand where it is not obvious (<b>annotations</b>). And when the cake is served, the labels are peeled off: the browser only ever sees plain JavaScript.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <b>TypeScript (TS)</b> is JavaScript plus <b>types</b>. A <b>type</b> is a description of what a value can be: "a number", "a string", "an object with a <code>name</code> string". The TypeScript <b>compiler</b> (<code>tsc</code>) reads your code, checks that you never use a value in a way its type does not allow, and then <b>erases</b> the types to produce normal JavaScript.</p>
${H.table(['', 'JavaScript', 'TypeScript'], [['When are mistakes found?', H.c('r', 'At runtime (users see them)'), H.c('g', 'While you type / at build time')], ['Editor help', 'Guesses', 'Exact autocomplete, rename, go-to-definition'], ['Runs in browser / Node?', 'Yes, directly', 'Types are erased first (tsc, esbuild, or Node\'s built-in type stripping)'], ['Runtime speed', 'Same', 'Same — types do not exist at runtime']])}
<p>🔵 <b>Annotations</b> are labels you write: <code>let age: number = 30;</code>, <code>function greet(name: string): string</code>. <b>Inference</b> is TS working out the type by itself: <code>let age = 30</code> is already a <code>number</code>. The rule of thumb used by experienced teams:</p>
<ul>
<li><b>Annotate the edges:</b> function parameters, exported function return types, public APIs, and data coming from outside (JSON, <code>fetch</code>).</li>
<li><b>Let TS infer the middle:</b> local variables, callback parameters (<code>arr.map(x =&gt; x * 2)</code> already knows <code>x</code>).</li>
</ul>
<p><b>let vs const changes the inferred type.</b> <code>let x = "hi"</code> → <code>string</code> (it may change later, so TS <b>widens</b> it). <code>const y = "hi"</code> → the <b>literal type</b> <code>"hi"</code> (it can never change). Objects and arrays are widened even with <code>const</code>, because their insides can still change — unless you add <code>as const</code>.</p>
<p>🟣 <b>The four special types</b> you must know on day one:</p>
${H.table(['Type', 'Meaning', 'Plain English'], [['<code>any</code>', 'Turns checking OFF', '"Trust me" — the jar label is ripped off. Avoid.'], ['<code>unknown</code>', 'Could be anything; must check before use', '"Sealed box": open (narrow) it before using it. Use for outside data.'], ['<code>never</code>', 'No value can ever have this type', '"Impossible" — functions that always throw, exhausted unions'], ['<code>void</code>', 'Function returns nothing useful', '"Don\'t look at the return value"']])}
<p>Remember: TypeScript checks <b>shapes at compile time only</b>. A wrong type coming from a server at runtime will not be caught unless you validate it (more in the deep dive).</p>`,
    clues: ['"Why would you use TypeScript over JavaScript?" → catch bugs before runtime, safer refactors, editor tooling, self-documenting APIs', '"Does TypeScript make the code faster / check at runtime?" → no, types are erased; runtime validation needs Zod/Valibot or hand-written guards', '"<code>let</code> vs <code>const</code> — what type is inferred?" → widening vs literal types', '"When should you write an annotation?" → parameters, public return types, external data; infer the rest', '"any vs unknown" → unknown forces you to narrow; any silently disables checking', '"Should the return type of this exported function be explicit?" → yes, it is a contract and speeds up the compiler on big projects'],
    code: [{ title: 'Annotations at the edges, inference in the middle', code: `
// Annotate the edges: parameters and the public return type
export function totalPrice(prices: number[], taxRate: number): number {
  // Inferred: subtotal is number (no annotation needed)
  const subtotal = prices.reduce((sum, p) => sum + p, 0); // sum, p inferred as number
  return Math.round(subtotal * (1 + taxRate) * 100) / 100;
}

// let widens, const keeps the literal
let status = "loading";        // type: string
const mode = "dark";           // type: "dark"
const point = { x: 1, y: 2 };  // type: { x: number; y: number } (properties can change)
const fixed = { x: 1 } as const; // type: { readonly x: 1 }

status = "done";               // fine: any string allowed
// @ts-expect-error -- mode is the literal "dark", cannot be reassigned (it is const)
mode = "light";

// unknown forces a check; any does not
function parseAge(raw: unknown): number {
  if (typeof raw === "number") return raw;           // narrowed to number
  if (typeof raw === "string") return Number(raw);   // narrowed to string
  throw new Error("age must be a number or numeric string");
}
console.log(totalPrice([10, 20], 0.1), status, point.x, fixed.x, parseAge("42"));
` }, { lang: 'js', run: true, title: 'What actually runs: the same code after types are erased (runnable JS)', code: `
// This is what tsc / esbuild / Node type-stripping produce: types gone, logic identical
function totalPrice(prices, taxRate) {
  const subtotal = prices.reduce((sum, p) => sum + p, 0);
  return Math.round(subtotal * (1 + taxRate) * 100) / 100;
}
console.log(totalPrice([10, 20], 0.1)); // 33

// Types do NOT exist at runtime: nothing stops a bad call made from plain JS
console.log(totalPrice(["10", "20"], 0.1)); // 1122 — 0 + "10" + "20" = "01020" (string glue), a silent wrong total
console.log(typeof totalPrice); // "function" — there is no "number[]" left anywhere
` }],
    codeTitle: ['TypeScript: annotations, inference, unknown', 'JavaScript output (runnable)'],
    viz: {
      title: 'Inference lab: what type does TypeScript give this value?',
      input: '{ name: "Ann", tags: ["a", 1] }',
      inputLabel: 'A JS value (number, "string", true, null, [array], { object })',
      gen: function (input) {
        var n = parseLit(input), v = showVal(n), frames = [];
        var lt = widen(n), ct = constType(n), ac = asConst(n);
        var prim = ['string', 'number', 'boolean'].indexOf(n.k) >= 0;
        var nul = n.k === 'null' || n.k === 'undefined';
        var code = 'let a = ' + v + ';\nconst b = ' + v + ';\nconst c = ' + v + ' as const;\nlet d: unknown = ' + v + ';\n// after compiling: types erased';
        frames.push(fr('We give TypeScript the value <code>' + esc(v) + '</code> four different ways. Watch how the <b>same value</b> gets <b>different types</b> depending on how we declare it.', [cp(code, {}), vp({ value: v, kind: n.k }, {}, 'Runtime value')]));
        frames.push(fr('<b>let a</b>: a <code>let</code> can be reassigned later, so TS <b>widens</b> the type to the general family' + (nul ? '. For <code>null</code>/<code>undefined</code> TS uses an <i>evolving</i> type that learns from later assignments — better to annotate it, e.g. <code>let a: string | null = null</code>.' : (prim ? ' (<code>' + esc(lt) + '</code>), not the exact value.' : '. Arrays get a union of their element types; objects get each property widened.')), [cp(code, { 1: 'cur' }), vp({ a: lt }, { a: 'cur' })]));
        frames.push(fr('<b>const b</b>: ' + (prim || nul ? 'a primitive <code>const</code> can never change, so TS keeps the exact <b>literal type</b> <code>' + esc(ct) + '</code>.' : 'the <i>variable</i> cannot be reassigned, but the object/array <b>contents still can</b> (b.push, b.x = ...). So TS widens the insides exactly like <code>let</code>: <code>' + esc(ct) + '</code>. This surprises many people!'), [cp(code, { 1: 'done', 2: 'cur' }), vp({ a: lt, b: ct }, { b: prim || nul ? 'ok' : 'cur' })]));
        frames.push(fr('<b>as const</b> tells TS "this will never change, not even inside". Everything becomes <b>readonly</b> and every leaf keeps its literal type: <code>' + esc(ac) + '</code>. Great for config objects and lists of allowed values.', [cp(code, { 1: 'done', 2: 'done', 3: 'cur' }), vp({ a: lt, b: ct, c: ac }, { c: 'sel' })]));
        frames.push(fr('<b>let d: unknown</b>: here <i>we</i> wrote the label (an <b>annotation</b>), so TS stops inferring and uses our type. <code>unknown</code> accepts the value, but you cannot use <code>d</code> until you check what it is (narrowing, topic 4).', [cp(code, { 4: 'cur' }), vp({ a: lt, b: ct, c: ac, d: 'unknown (annotated)' }, { d: 'cur' })]));
        var errs = [];
        if (n.k === 'number') errs.push(['a = "text"', 'Error: string is not assignable to number']);
        else if (n.k === 'string') errs.push(['a = 5', 'Error: number is not assignable to string']);
        else if (n.k === 'boolean') errs.push(['a = "yes"', 'Error: string is not assignable to boolean']);
        else if (n.k === 'array') errs.push(['c.push(...)', 'Error: push does not exist on a readonly tuple']);
        else if (n.k === 'object' && n.props.length) errs.push(['c.' + n.props[0][0] + ' = ...', 'Error: cannot assign to a read-only property']);
        else errs.push(['a = 1; a = "x"', 'Allowed: evolving any learns string | number']);
        errs.push(['d.toString()', 'Error: d is of type unknown — narrow it first']);
        frames.push(fr('What does each label <b>protect</b> you from? These lines would be flagged in your editor <b>before</b> the code ever runs.', [{ type: 'table', label: 'Compile-time checks', columns: ['You write', 'Compiler says'], rows: errs, hl: { 0: 'bad', 1: 'bad' } }, vp({ a: lt, b: ct, c: ac, d: 'unknown' })]));
        frames.push(fr('Finally the compiler <b>erases every type</b>. The JavaScript that runs is identical for all four lines — types cost nothing at runtime and protect nothing at runtime.', [cp('let a = ' + v + ';\nconst b = ' + v + ';\nconst c = ' + v + ';\nlet d = ' + v + ';', { 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok' }, 'Emitted JavaScript', 'js'), tx('Types live only in the editor and the build step. <b>Validate</b> data from outside (APIs, forms) at runtime.', 'Remember')]));
        return frames;
      }
    },
    examples: [
      { title: 'Inference through callbacks (contextual typing)', html: `<p>You almost never annotate callback parameters. In <code>[1, 2, 3].map(n =&gt; n.toFixed(1))</code>, TS knows the array is <code>number[]</code>, so <code>n</code> is <code>number</code> and the result is <code>string[]</code>. This is called <b>contextual typing</b>: the type flows <i>into</i> the arrow function from where it is used.</p>`, code: `const prices = [1, 2, 3];               // number[]
const labels = prices.map(n => n.toFixed(1)); // n: number, labels: string[]
window.addEventListener("click", e => console.log(e.clientX)); // e: MouseEvent, inferred from "click"
console.log(labels);` },
      { title: 'Why is my empty array any[]?', html: `<p><code>const list = [];</code> starts as an <b>evolving array</b>: TS watches your <code>push</code> calls and figures out the element type. In a function that returns it before any push, or when you hover early, it is confusing. Always annotate empty collections: <code>const list: string[] = [];</code> or <code>new Map&lt;string, number&gt;()</code>.</p>`, code: `const names: string[] = [];         // clear intent
const counts = new Map<string, number>(); // generic annotation on the constructor
names.push("Ann");
counts.set("Ann", 1);
// @ts-expect-error -- number is not assignable to string
names.push(42);` },
      { title: 'any spreads like a virus; unknown does not', html: `<p>Anything touched by <code>any</code> becomes <code>any</code>: <code>const x: any = JSON.parse(s); const y = x.foo.bar;</code> — <code>y</code> is <code>any</code> too, and typos are never caught. With <code>unknown</code>, TS blocks you until you check. <code>JSON.parse</code> returns <code>any</code> for historical reasons, so wrap it and return <code>unknown</code>.</p>`, code: `function safeParse(text: string): unknown {
  return JSON.parse(text); // any is converted to unknown at the boundary
}
const data = safeParse('{"age": 3}');
// @ts-expect-error -- 'data' is of type 'unknown'
console.log(data.age);
if (typeof data === "object" && data !== null && "age" in data) {
  console.log(data.age); // OK: narrowed to object with an 'age' property
}` },
      { title: 'Explicit return types catch "accidental" changes', html: `<p>Without a return annotation, if someone edits <code>getUser</code> so one branch returns <code>undefined</code>, the inferred type silently becomes <code>User | undefined</code> and errors appear far away in callers. With <code>: User</code>, the error appears <b>inside</b> the function, right where the mistake is.</p>`, code: `interface User { id: number; name: string }
function getUser(id: number): User {
  if (id <= 0) throw new Error("bad id");
  return { id, name: "user" + id };
}
console.log(getUser(7).name);` }
    ],
    deepDive: `<p><b>Structural, erased, and (intentionally) unsound.</b> TypeScript's type system is <b>structural</b> (types match by shape, topic 2), <b>erased</b> (zero runtime footprint — no reflection of types at runtime), and <b>not fully sound</b>: a few holes are kept on purpose for usability — <code>any</code>, type assertions (<code>x as Foo</code>), array index reads returning <code>T</code> instead of <code>T | undefined</code> (unless <code>noUncheckedIndexedAccess</code>), and method parameter <b>bivariance</b>. Interviewers love hearing that you know these holes exist.</p>
<p><b>How inference really works.</b> TS infers from the initializer, then <b>widens</b> literal types for mutable locations (<code>let</code>, object properties, array elements). For arrays it computes a <b>best common type</b> (union of element types). Return types are inferred from all <code>return</code> statements (union). Contextual typing pushes types the other way: from the expected type into lambdas and object literals. Since TS 5.5, TS also <b>infers type predicates</b>: <code>arr.filter(x =&gt; x !== undefined)</code> now gives <code>T[]</code> instead of <code>(T | undefined)[]</code>.</p>
<p><b><code>satisfies</code> (TS 4.9+).</b> <code>const cfg = { port: 8080 } satisfies Config;</code> checks the value against <code>Config</code> but <b>keeps the more precise inferred type</b>. Annotation (<code>const cfg: Config</code>) would forget that <code>port</code> is exactly <code>8080</code>. Use <code>satisfies</code> for config tables, route maps and lookup objects.</p>
<p><b>Runtime reality.</b> Because types are erased, every trust boundary (HTTP responses, <code>localStorage</code>, env vars, message queues, LLM JSON output) needs <b>runtime validation</b>: libraries like Zod, Valibot or ArkType define a schema once and derive the static type from it (<code>z.infer&lt;typeof Schema&gt;</code>), so the type and the check can never drift apart.</p>
<p><b>Tooling in 2026.</b> TypeScript 6.0 is the "bridge" release: <code>strict</code> is on by default and old options are deprecated; TypeScript 7 is the native compiler port written in Go (<code>tsgo</code>), roughly 10x faster type-checking on large repos. Node.js (22.18+/23.6+) can run <code>.ts</code> files directly by <b>stripping</b> erasable type syntax; Bun and Deno run TS natively. Type <i>checking</i> still needs <code>tsc</code> (or <code>tsgo</code>) in CI — strippers never report type errors.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants write a lot of TypeScript, and types are now the <b>contract that keeps AI-written code honest</b>. A strict type checker catches the hallucinated property (<code>user.fullName</code> when the type only has <code>name</code>) instantly. Typed codebases also give the model better context: it reads your interfaces and autocompletes correctly.</p>
<p><b>Use AI as a partner:</b> <code>Convert this JS file to TypeScript with strict mode; do not use any or non-null assertions; list every place you had to guess a type</code>. Then review the list — those guesses are where bugs hide. Ask: <code>Which values in this module come from outside and need runtime validation?</code></p>
<p><b>Where AI goes wrong:</b> sprinkling <code>as any</code> or <code>as unknown as T</code> to "fix" errors, annotating everything (noisy, and sometimes <i>less</i> precise than inference), confusing compile-time checks with runtime safety (trusting <code>response.json() as User</code>), and using outdated advice (old tsconfig flags, <code>namespace</code>, <code>const enum</code> in libraries).</p>
<p><b>What you must still own:</b> deciding where the trust boundaries are, choosing <code>unknown</code> vs a validated schema, reading compiler errors fluently, and explaining <i>why</i> a type is the way it is in a code review or interview.</p>`,
    problems: [{
      title: 'Add Types to This JavaScript (No any Allowed)', level: 'Easy', tags: ['annotations', 'inference', 'migration'], companies: ['Microsoft', 'Shopify', 'Atlassian'],
      statement: `<p>You are migrating a small JS helper to TypeScript in <b>strict</b> mode. Add the <b>minimum</b> annotations needed so that it compiles with no implicit <code>any</code>, the return type is explicit (it is exported), and a caller passing a string for <code>qty</code> gets a compile error.</p>
<pre>export function lineTotal(item, qty) {
  return item.price * qty;
}
export function cartTotal(items) {
  return items.reduce((s, it) =&gt; s + lineTotal(it, it.qty), 0);
}</pre>`,
      constraints: `strict: true · no <code>any</code>, no <code>as</code> casts · exported functions need explicit return types · local variables and callbacks should rely on inference`,
      example: `<p><code>cartTotal([{ price: 2, qty: 3 }, { price: 5, qty: 1 }])</code> → ${H.c('g', '11')}. <code>lineTotal({ price: 2 }, "3")</code> → ${H.c('r', 'compile error: string not assignable to number')}. Why: the JS version would compute <code>2 * "3" = 6</code> by coercion and hide the bug.</p>`,
      brute: { why: `<p>The lazy migration slaps <code>any</code> on everything. It compiles, but the compiler is now blind: <code>lineTotal({ prcie: 2 }, "3")</code> (typo + string) passes silently. You got the cost of TypeScript with none of the safety.</p>`, code: `// "Migrated" but useless: every check is switched off
export function lineTotal(item: any, qty: any): any {
  return item.price * qty;
}
export function cartTotal(items: any): any {
  return items.reduce((s: any, it: any) => s + lineTotal(it, it.qty), 0);
}
console.log(lineTotal({ prcie: 2 }, "3")); // NaN at runtime, no compile error` },
      mcq: { q: 'Which places truly NEED an annotation here?', options: ['Every variable and callback parameter', 'Only function parameters (and the exported return types by team rule)', 'Nothing — TS infers parameters from usage', 'Only the reduce accumulator'], answer: 1, explain: 'TypeScript never infers a parameter type from how the body uses it (that would be implicit any). Parameters need labels; callbacks get contextual types; locals are inferred.' },
      hints: [`<p>Hint 1: TS cannot guess what <code>item</code> is from <code>item.price</code> — that is exactly an "implicit any" error. Describe the shape once.</p>`, `<p>Hint 2: Create <code>interface CartItem { price: number; qty: number }</code>. <code>lineTotal</code> only needs <code>price</code>, so its parameter can be <code>Pick&lt;CartItem, "price"&gt;</code> or a small inline type.</p>`, `<p>Hint 3: In <code>reduce</code>, pass the initial value <code>0</code> so the accumulator is inferred as <code>number</code>. Recipe: type the shape → annotate params → annotate exported returns → leave callbacks alone → test a bad call with <code>@ts-expect-error</code>.</p>`],
      tests: {"sig":"string string -> double","fn":"chk","harness":{"js":"\nfunction chk(kind, json) {\n  if (kind === 'cart') return cartTotal(JSON.parse(json));\n  if (kind === 'line') { var a = JSON.parse(json); return lineTotal(a[0], a[1]); }\n  if (kind === 'big') { var items = []; for (var i = 0; i < Number(json); i++) items.push({ price: 3, qty: 2 }); return cartTotal(items); }\n}"},"cases":[[["cart","[{\"price\":2,\"qty\":3},{\"price\":5,\"qty\":1}]"],11],[["cart","[]"],0],[["cart","[{\"price\":0,\"qty\":5}]"],0],[["cart","[{\"price\":-4,\"qty\":2}]"],-8],[["cart","[{\"price\":0.5,\"qty\":3},{\"price\":1.25,\"qty\":4}]"],6.5],[["line","[{\"price\":2},3]"],6],[["line","[{\"price\":7},0]"],0],[["big","100000"],600000]],"cmp":"float"},
      solution: {
        approach: `<p>Describe the data shape once with an <code>interface</code>, annotate parameters and exported return types, and let inference handle <code>s</code> and <code>it</code> inside <code>reduce</code> (contextual typing from <code>CartItem[]</code> and the <code>0</code> seed). A bad call is now a red squiggle.</p>`,
        code: `export interface CartItem {
  price: number; // unit price
  qty: number;   // how many
}

// lineTotal only needs price, so it accepts anything with a numeric price
export function lineTotal(item: { price: number }, qty: number): number {
  return item.price * qty;
}

export function cartTotal(items: CartItem[]): number {
  // s: number (from the 0 seed), it: CartItem (from items) — both inferred
  return items.reduce((s, it) => s + lineTotal(it, it.qty), 0);
}

console.log(cartTotal([{ price: 2, qty: 3 }, { price: 5, qty: 1 }])); // 11
// @ts-expect-error -- Argument of type 'string' is not assignable to parameter of type 'number'
lineTotal({ price: 2 }, "3");`,
        dry: { head: ['code location', 'type known to TS', 'source'], rows: [['item', '{ price: number }', 'annotation'], ['qty', 'number', 'annotation'], ['items', 'CartItem[]', 'annotation'], ['s (accumulator)', 'number', 'inferred from seed 0'], ['it', 'CartItem', 'contextual from items'], ['lineTotal(…, "3")', H.c('r', 'error'), 'string vs number']] },
        complexity: `<p>Runtime: O(n) for <code>cartTotal</code>, unchanged from JS (types are erased). Type-check cost is trivial.</p>`,
        followUps: ['Make <code>cartTotal</code> accept a <code>readonly CartItem[]</code> — why is that a better parameter type?', 'Add an optional <code>discount?: number</code> and handle undefined safely.', 'Data comes from <code>fetch</code>: where must runtime validation happen?']
      }
    }]
  });

  /* ================= TOPIC 2: Interfaces vs type aliases & structural typing ================= */
  function parseProps(s) {
    var out = [];
    String(s).split(',').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (p) {
      var m = /^(readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*(.+)$/.exec(p);
      if (!m) throw new Error('Write properties like  name: string, age?: number  (got "' + p + '")');
      out.push({ ro: !!m[1], name: m[2], opt: !!m[3], type: m[4].trim() });
    });
    if (out.length > 7) throw new Error('Use at most 7 properties per side');
    return out;
  }
  function members(t) { return t.split('|').map(function (x) { return x.trim(); }).filter(Boolean); }
  function memberOk(src, tgt) {
    if (src === tgt || tgt === 'unknown' || tgt === 'any' || src === 'any') return true;
    if (tgt === 'string' && /^["'].*["']$/.test(src)) return true;
    if (tgt === 'number' && /^-?\d+(\.\d+)?$/.test(src)) return true;
    if (tgt === 'boolean' && (src === 'true' || src === 'false')) return true;
    return false;
  }
  function typeOk(src, tgt) {
    var tm = members(tgt);
    return members(src).every(function (s) { return tm.some(function (t) { return memberOk(s, t); }); });
  }

  topics.push({
    title: 'Interfaces vs Type Aliases & Structural Typing',
    analogy: `<p>A <b>job advert</b> says: "Must drive a car and speak English." It does not care about your <i>name</i>, your <i>diploma's university</i>, or that you also play guitar. Anyone who <b>has those skills</b> fits the job. That is <b>structural typing</b> ("duck typing at compile time"): if it has the right properties, it fits — no matter what it is called or where it came from.</p>
<p><b>Interfaces</b> and <b>type aliases</b> are two ways to write the job advert. An <code>interface</code> is a form that other departments can <b>add lines to</b> later (declaration merging). A <code>type</code> is a name you can stick on <b>any</b> description — not just objects, but also "either A or B" or "a pair of numbers".</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Both describe the <b>shape</b> of an object:</p>
<pre>interface User { id: number; name: string; email?: string }
type UserT = { id: number; name: string; email?: string };</pre>
<p>For plain object shapes they are almost the same. <code>?</code> means <b>optional</b> (may be missing), <code>readonly</code> means "you may not reassign it".</p>
${H.table(['Feature', 'interface', 'type alias'], [['Object shapes', H.c('g', 'yes'), H.c('g', 'yes')], ['Unions <code>A | B</code>, tuples, primitives, functions', H.c('r', 'no (objects only)'), H.c('g', 'yes')], ['Extend', '<code>interface B extends A</code>', '<code>type B = A &amp; { … }</code>'], ['Declaration merging (re-open to add fields)', H.c('g', 'yes'), H.c('r', 'no — duplicate name error')], ['Mapped / conditional types', H.c('r', 'no'), H.c('g', 'yes')], ['Conflicting field when extending', H.c('g', 'clear error at the declaration'), H.c('y', 'silently becomes never')], ['<code>class X implements …</code>', H.c('g', 'yes'), H.c('g', 'yes (if it is an object type)')]])}
<p><b>Practical rule:</b> use <code>interface</code> for object shapes you may extend (especially public APIs and classes); use <code>type</code> for unions, tuples, functions and anything computed. Most importantly, <b>be consistent</b> in a codebase.</p>
<p>🔵 <b>Structural typing.</b> TypeScript compares types by <b>shape</b>, not by name. If <code>Point</code> needs <code>x</code> and <code>y</code>, then <i>any</i> object with numeric <code>x</code> and <code>y</code> is a <code>Point</code> — even a class instance or an object with extra fields. Java and C# are <b>nominal</b> (names must match); TypeScript is not.</p>
<p>🟣 <b>One exception — excess property checks.</b> When you pass a <b>fresh object literal</b> (written right there, in place) where a type is expected, TS rejects <b>unknown extra properties</b>, because that is almost always a typo: <code>createUser({ name: "a", emial: "x" })</code> → error. The same object stored in a variable first is accepted (it is no longer "fresh"). This rule catches typos without breaking structural typing.</p>`,
    clues: ['"interface vs type — which do you use and why?" → objects/extendable → interface; unions/tuples/computed → type; consistency', '"Why does this object with an extra property compile here but not there?" → excess property check only on fresh literals', '"TypeScript is structurally typed — what does that mean?" → compatibility by shape, not name', '"How do I add a field to Window / a library type?" → declaration merging with interface (module augmentation)', '"Two interfaces with the same name in one file" → they merge', '"Brand / nominal type for UserId vs OrderId" → structural typing lets them mix; use a brand field'],
    code: [{ title: 'Shapes, structural typing, merging and excess property checks', code: `
interface Point { x: number; y: number }

// A class that never mentions Point still IS a Point (same shape)
class Pixel {
  constructor(public x: number, public y: number, public color: string) {}
}
function dist(p: Point): number {
  return Math.hypot(p.x, p.y);
}
console.log(dist(new Pixel(3, 4, "red"))); // 5 — extra 'color' is fine

// type alias can name things an interface cannot
type Id = number | string;              // union
type Pair = [number, number];           // tuple
type Handler = (event: string) => void; // function type

// Declaration merging: two declarations of the same interface combine
interface Settings { theme: string }
interface Settings { fontSize: number }
const s: Settings = { theme: "dark", fontSize: 14 }; // needs both fields

// Excess property check: only for fresh object literals
interface Options { name: string; retries?: number }
function start(o: Options): string { return o.name + ":" + (o.retries ?? 0); }
// @ts-expect-error -- Object literal may only specify known properties ('retires' is a typo)
start({ name: "job", retires: 3 });
const fromVar = { name: "job", retires: 3 };
start(fromVar); // compiles: not fresh, structurally has 'name' (typo still sneaks through!)

const id: Id = "u-1";
const pair: Pair = [1, 2];
const h: Handler = (e) => console.log(e);
h(String(id) + pair.join(",") + s.theme);
` }],
    codeTitle: ['interface vs type, structural typing, merging'],
    viz: {
      title: 'Structural compatibility checker: is Source assignable to Target?',
      input: 'name: string, age?: number / name: "Ann", age: number, email: string',
      inputLabel: 'Target props  /  Source props   (e.g. id: number, tag?: string / id: 1, extra: boolean)',
      gen: function (input) {
        var halves = String(input).split('/');
        if (halves.length !== 2) throw new Error('Separate Target and Source with a single "/"');
        var T = parseProps(halves[0]), S = parseProps(halves[1]);
        if (!T.length) throw new Error('Target needs at least one property');
        var frames = [], rows = [], ok = true;
        var tName = '{ ' + T.map(function (p) { return (p.ro ? 'readonly ' : '') + p.name + (p.opt ? '?' : '') + ': ' + p.type; }).join('; ') + ' }';
        var sName = '{ ' + S.map(function (p) { return p.name + (p.opt ? '?' : '') + ': ' + p.type; }).join('; ') + ' }';
        frames.push(fr('We ask: can a value of type <b>Source</b> go where <b>Target</b> is expected? TypeScript ignores names and checks <b>shape</b>: every property Target needs must exist in Source with a compatible type.', [vp({ Target: tName, Source: sName }, {}, 'The two shapes'), { type: 'table', label: 'Property-by-property check', columns: ['property', 'Target needs', 'Source has', 'result'], rows: [] }]));
        T.forEach(function (tp) {
          var sp = null;
          S.forEach(function (x) { if (x.name === tp.name) sp = x; });
          var res, why;
          if (!sp) {
            if (tp.opt) { res = 'ok'; why = 'missing, but Target marks it optional (<code>?</code>) — fine.'; }
            else { res = 'bad'; why = 'Source has <b>no</b> <code>' + tp.name + '</code> and Target requires it. Not assignable.'; }
          } else if (sp.opt && !tp.opt) {
            res = 'bad'; why = 'Source says <code>' + tp.name + '</code> <i>might</i> be missing (optional), Target says it must be there. Not safe.';
          } else if (typeOk(sp.type, tp.type)) {
            res = 'ok'; why = '<code>' + esc(sp.type) + '</code> fits into <code>' + esc(tp.type) + '</code>' + (sp.type !== tp.type ? ' (a literal or narrower type fits a wider one).' : '.');
          } else {
            res = 'bad'; why = '<code>' + esc(sp.type) + '</code> does <b>not</b> fit into <code>' + esc(tp.type) + '</code>.';
          }
          if (res === 'bad') ok = false;
          rows.push([tp.name, (tp.opt ? 'optional ' : '') + tp.type, sp ? (sp.opt ? 'optional ' : '') + sp.type : '(missing)', res === 'ok' ? '✔ ok' : '✘ error']);
          var hl = {}; hl[rows.length - 1] = res === 'ok' ? 'ok' : 'bad';
          frames.push(fr('Check <code>' + tp.name + '</code>: ' + why, [vp({ Target: tName, Source: sName, checking: tp.name }, { checking: 'cur' }, 'The two shapes'), { type: 'table', label: 'Property-by-property check', columns: ['property', 'Target needs', 'Source has', 'result'], rows: rows.slice(), hl: hl }]));
        });
        var extras = S.filter(function (x) { return !T.some(function (t) { return t.name === x.name; }); }).map(function (x) { return x.name; });
        var hlx = {}; extras.forEach(function (e) { hlx[e] = 'cur'; });
        frames.push(fr(extras.length ? 'Source has <b>extra</b> properties (' + extras.join(', ') + '). Structural typing says: <b>extra is fine</b> — Target just ignores them (a Pixel with a color is still a Point).' : 'Source has no extra properties. Nothing more to consider.', [{ type: 'set', label: 'Extra properties in Source', items: extras.length ? extras : ['(none)'], hl: hlx }, { type: 'table', label: 'Property-by-property check', columns: ['property', 'Target needs', 'Source has', 'result'], rows: rows.slice() }]));
        var vVar = ok ? '✔ compiles' : '✘ error';
        var vLit = !ok ? '✘ error' : (extras.length ? '✘ error: object literal may only specify known properties' : '✔ compiles');
        frames.push(fr('Verdict. Assigning a <b>variable</b> of type Source: ' + (ok ? H.c('g', 'allowed') : H.c('r', 'rejected')) + '. Writing the same thing as a <b>fresh object literal</b>: ' + (ok && extras.length ? H.c('r', 'rejected by the excess property check') + ' — TS assumes extra keys in a literal are typos.' : (ok ? H.c('g', 'allowed') : H.c('r', 'rejected'))) + '', [{ type: 'table', label: 'Two ways to assign', columns: ['code', 'result'], rows: [['const t: Target = sourceVar;', vVar], ['const t: Target = { ...written inline... };', vLit]], hl: { 0: ok ? 'ok' : 'bad', 1: vLit.charAt(0) === '✔' ? 'ok' : 'bad' } }, vp({ assignable: ok ? 'yes' : 'no', extraKeys: extras.length ? extras.join(', ') : 'none' }, { assignable: ok ? 'ok' : 'bad' }, 'Result')]));
        frames.push(fr('Name never mattered. If you need two same-shaped types to be <b>incompatible</b> (e.g. <code>UserId</code> vs <code>OrderId</code>, both strings), add a <b>brand</b>: <code>type UserId = string &amp; { readonly __brand: "UserId" }</code>.', [tx('Structural = "has the right properties". Nominal (Java/C#) = "was declared with the right name". TypeScript is structural, with excess-property checks as a typo guard.', 'Takeaway')]));
        return frames;
      }
    },
    examples: [
      { title: 'Interface extends vs intersection with a conflict', html: `<p><code>interface B extends A { id: string }</code> when <code>A</code> has <code>id: number</code> → <b>immediate error</b> at the declaration ("incorrectly extends"). <code>type B = A &amp; { id: string }</code> → no error, but <code>id</code> becomes <code>number &amp; string</code> = <code>never</code>, and you only find out when nothing can be assigned. Interfaces fail loudly; intersections fail quietly.</p>`, code: `interface A { id: number }
// @ts-expect-error -- Interface 'B' incorrectly extends interface 'A' (id types clash)
interface B extends A { id: string }
type C = A & { id: string }; // compiles... but id is now never
// @ts-expect-error -- no value can satisfy number & string
const c: C = { id: 1 };` },
      { title: 'Adding a field to a global with declaration merging', html: `<p>Libraries and globals are often typed with interfaces precisely so you can <b>augment</b> them. Need <code>window.appVersion</code>? Re-open the <code>Window</code> interface in a <code>declare global</code> block of a module file. A <code>type</code> alias could not be re-opened like this.</p>`, code: `declare global {
  interface Window { appVersion: string }
}
window.appVersion = "1.4.2";
console.log(window.appVersion);
export {};` },
      { title: 'Index signatures and Record for dictionaries', html: `<p>When keys are not known ahead of time, use an <b>index signature</b> <code>{ [key: string]: number }</code> or the equivalent <code>Record&lt;string, number&gt;</code>. Reading <code>scores["zed"]</code> is typed <code>number</code> even if missing — turn on <code>noUncheckedIndexedAccess</code> (topic 7) to get <code>number | undefined</code> and be forced to handle it.</p>`, code: `interface Scores { [player: string]: number }
const scores: Scores = { ann: 3, bob: 5 };
scores.cat = 7;                       // any string key allowed
const total = Object.values(scores).reduce((a, b) => a + b, 0);
type Scores2 = Record<string, number>; // same thing
const s2: Scores2 = scores;
console.log(total, s2.ann);` },
      { title: 'Readonly is shallow and only compile-time', html: `<p><code>readonly</code> stops <code>p.x = 5</code> at compile time but: (1) nested objects are still mutable, (2) at runtime nothing is frozen, (3) a <code>Readonly&lt;T&gt;</code> value can even be assigned to a mutable <code>T</code> variable (a known soundness hole). Use <code>Object.freeze</code> if you need runtime protection.</p>`, code: `interface Cfg { readonly url: string; readonly headers: { auth: string } }
const cfg: Cfg = { url: "/api", headers: { auth: "x" } };
// @ts-expect-error -- Cannot assign to 'url' because it is a read-only property
cfg.url = "/v2";
cfg.headers.auth = "y"; // allowed: readonly is shallow
console.log(cfg.headers.auth);` }
    ],
    deepDive: `<p><b>Assignability rules in one breath.</b> <code>S</code> is assignable to <code>T</code> if for every property of <code>T</code>, <code>S</code> has a property with an assignable type (optional in <code>T</code> may be missing in <code>S</code>), plus call/construct signatures and index signatures line up. Function parameters are compared <b>contravariantly</b> under <code>strictFunctionTypes</code> — but only for function-<i>property</i> syntax (<code>f: (x: A) =&gt; void</code>); <b>method</b> syntax (<code>f(x: A): void</code>) stays <b>bivariant</b> for backward compatibility (that is why <code>Array&lt;Dog&gt;</code> is assignable to <code>Array&lt;Animal&gt;</code>, unsoundly).</p>
<p><b>Performance (big repos).</b> The TypeScript team's own performance guide recommends <code>interface ... extends</code> over large intersections: interfaces are cached by name and their relationships are checked once, while intersections are re-normalized at each use. In very large monorepos this is measurable in editor latency.</p>
<p><b>Excess property check details.</b> It applies to fresh object literals in assignments, arguments and returns. It is <b>skipped</b> when the target has an index signature, when you use a type assertion, or when you go through a variable. For unions, a literal is checked against the union as a whole (with discriminants narrowing which member is used) — one reason discriminated unions give better errors.</p>
<p><b>Nominal typing workarounds.</b> Brands (<code>string &amp; { __brand: "UserId" }</code>) or <code>unique symbol</code> brands make look-alike primitives incompatible, created through a single validating constructor. Classes with a <code>#private</code> field are also effectively nominal: two classes with identically named private fields are not compatible.</p>
<p><b>Weak types.</b> A type whose properties are <i>all</i> optional (<code>{ a?: number; b?: string }</code>) triggers the <b>weak type detection</b>: assigning something that shares <i>no</i> properties with it is an error, catching mistakes like passing a string where an options bag was expected.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code often declares a fresh <code>interface</code> for every function, duplicating shapes that already exist. Structural typing means duplicates "work", so drift creeps in (two <code>User</code> types that slowly diverge). Your job in review is to point it at the <b>single source of truth</b> (a shared types module, or types derived from a schema / OpenAPI / database client).</p>
<p><b>Use AI as a partner:</b> <code>Find object types in this folder that are structurally identical or near-identical and propose one shared type with Pick/Omit derivations</code>. Or: <code>Explain this TS2322 assignability error in plain English and show the smallest fix</code> — models are good at untangling long error chains.</p>
<p><b>Where AI goes wrong:</b> silencing excess-property errors with <code>as Options</code> (hiding a real typo), adding <code>[key: string]: any</code> index signatures to "make it compile", and mixing <code>interface</code>/<code>type</code> styles randomly within one file.</p>
<p><b>What you must still own:</b> knowing when two concepts deserve <b>different</b> types even if they look alike today (brand them), choosing interface vs type consistently, and recognising that a compile error is often the type system protecting you — not something to cast away.</p>`,
    problems: [{
      title: 'Why Does This Not Compile? The Excess Property Puzzle', level: 'Medium', tags: ['excess property check', 'structural typing', 'debugging'], companies: ['Stripe', 'Airbnb', 'Microsoft'],
      statement: `<p>A teammate reports: "TypeScript is inconsistent!" This line errors:</p>
<pre>sendEmail({ to: "a@b.com", subject: "Hi", bcc: "boss@b.com" });</pre>
<p>but this compiles:</p>
<pre>const msg = { to: "a@b.com", subject: "Hi", bcc: "boss@b.com" };
sendEmail(msg);</pre>
<p>with <code>interface Email { to: string; subject: string; cc?: string }</code>. Explain <b>why</b>, explain the <b>real bug</b> hiding in the second version, and change the types so that <code>bcc</code> is properly supported.</p>`,
      constraints: `No type assertions (<code>as</code>), no index signatures with <code>any</code>. The fix must make <code>bcc</code> type-checked as an optional string.`,
      example: `<p>Inline literal → ${H.c('r', "error: Object literal may only specify known properties, and 'bcc' does not exist in type 'Email'")}. Via variable → ${H.c('y', 'compiles, but bcc is silently ignored by sendEmail')} — the boss never gets a copy.</p>`,
      brute: { why: `<p>The "fix" people reach for is a cast or an <code>any</code>. It compiles everywhere, but now any typo (<code>subjcet</code>) also compiles, and <code>bcc</code> is still never sent because the function does not know about it.</p>`, code: `interface Email { to: string; subject: string; cc?: string }
function sendEmail(e: Email): string { return "to=" + e.to + (e.cc ? " cc=" + e.cc : ""); }
// Silences the checker, fixes nothing: bcc is still dropped
console.log(sendEmail({ to: "a@b.com", subject: "Hi", bcc: "boss@b.com" } as Email));` },
      mcq: { q: 'Why does the inline object literal fail but the variable succeed?', options: ['Variables are not type-checked', 'Excess property checks only apply to fresh object literals', 'const makes the object readonly', 'bcc is a reserved word'], answer: 1, explain: 'Structural typing allows extra properties, but TS adds an extra typo-guard for object literals written in place. Once stored in a variable the object is no longer "fresh".' },
      hints: [`<p>Hint 1: Structural typing says extra properties are allowed. So the error must come from a special extra rule — which one applies only to literals?</p>`, `<p>Hint 2: The variable version compiles, but look at <code>sendEmail</code>'s body: does it ever read <code>bcc</code>? The compile error was telling you something true.</p>`, `<p>Hint 3: Real fix: add <code>bcc?: string</code> to <code>Email</code> and handle it in the function. Then both call styles compile and the value is actually used. Recipe: understand the rule → find the dropped data → model it → use it.</p>`],
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(json) { return sendEmail(JSON.parse(json)); }"},"cases":[[["{\"to\":\"a@b.com\",\"subject\":\"Hi\",\"bcc\":\"boss@b.com\"}"],"to=a@b.com subject=Hi bcc=boss@b.com"],[["{\"to\":\"a@b.com\",\"subject\":\"Hi\"}"],"to=a@b.com subject=Hi"],[["{\"to\":\"a@b.com\",\"subject\":\"Hi\",\"cc\":\"c@x.com\"}"],"to=a@b.com subject=Hi cc=c@x.com"],[["{\"to\":\"a@b.com\",\"subject\":\"Hi\",\"cc\":\"c@x.com\",\"bcc\":\"d@x.com\"}"],"to=a@b.com subject=Hi cc=c@x.com bcc=d@x.com"],[["{\"to\":\"a@b.com\",\"subject\":\"Hi\",\"bcc\":\"\"}"],"to=a@b.com subject=Hi"],[["{\"to\":\"\",\"subject\":\"\"}"],"to= subject="],[["{\"to\":\"x@y.z\",\"subject\":\"A B C\",\"bcc\":\"q\"}"],"to=x@y.z subject=A B C bcc=q"]]},
      solution: {
        approach: `<p>The inline call hits the <b>excess property check</b> (fresh literal + unknown key = probable typo). Through a variable the object is not fresh, and structurally it has <code>to</code> and <code>subject</code>, so it is accepted — but <code>bcc</code> is silently ignored. The compiler was right. Model the field and use it.</p>`,
        code: `interface Email {
  to: string;
  subject: string;
  cc?: string;
  bcc?: string; // now part of the contract and type-checked
}

function sendEmail(e: Email): string {
  let header = "to=" + e.to + " subject=" + e.subject;
  if (e.cc) header += " cc=" + e.cc;
  if (e.bcc) header += " bcc=" + e.bcc; // actually used
  return header;
}

console.log(sendEmail({ to: "a@b.com", subject: "Hi", bcc: "boss@b.com" }));
const msg = { to: "a@b.com", subject: "Hi", bcc: "boss@b.com" };
console.log(sendEmail(msg));
// @ts-expect-error -- typos are still caught in literals: 'subjcet' does not exist
sendEmail({ to: "x@y.z", subjcet: "oops" });`,
        dry: { head: ['call', 'fresh literal?', 'extra keys vs Email', 'result'], rows: [['inline, old Email', 'yes', 'bcc', H.c('r', 'error (excess property)')], ['via variable, old Email', 'no', 'bcc (ignored)', H.c('y', 'compiles, bcc dropped')], ['inline, new Email', 'yes', 'none', H.c('g', 'compiles, bcc used')], ['inline typo subjcet', 'yes', 'subjcet', H.c('r', 'error (good!)')]] },
        complexity: `<p>Type-level fix, no runtime cost. The function stays O(1).</p>`,
        followUps: ['When is an index signature the right answer instead of a new field?', 'How do weak-type checks differ from excess-property checks?', 'Make <code>to</code> accept either one address or an array of addresses.']
      }
    }]
  });

  /* ================= TOPIC 3: Unions, intersections & literal types ================= */
  /* Type-as-set helpers: members are primitives (string, number, boolean, null, undefined, bigint, symbol),
     literals ("a", 1, true) or object names (User). boolean is expanded to true | false. */
  var PRIMS = ['string', 'number', 'boolean', 'null', 'undefined', 'bigint', 'symbol', 'unknown', 'never'];
  function parseUnion(s) {
    var raw = String(s).split('|').map(function (x) { return x.trim(); }).filter(Boolean);
    if (!raw.length) throw new Error('Write a union like  string | number | "a"');
    if (raw.length > 8) throw new Error('Use at most 8 members per side');
    var out = [];
    raw.forEach(function (m) {
      if (!(/^"[^"]*"$/.test(m) || /^'[^']*'$/.test(m) || /^-?\d+(\.\d+)?$/.test(m) || m === 'true' || m === 'false' || PRIMS.indexOf(m) >= 0 || /^[A-Z][\w]*$/.test(m)))
        throw new Error('Members must be primitives (string, number, boolean, null…), literals ("a", 1, true) or names (User). Got: ' + m);
      if (m.charAt(0) === "'") m = '"' + m.slice(1, -1) + '"';
      if (m === 'boolean') { out.push('true'); out.push('false'); } else if (m !== 'never') out.push(m);
    });
    return uniq(out);
  }
  function familyOf(m) {
    if (m.charAt(0) === '"') return 'string';
    if (/^-?\d/.test(m)) return 'number';
    if (m === 'true' || m === 'false') return 'boolean';
    return m;
  }
  /* is a ⊆ b (every value of a is a value of b) */
  function sub(a, b) {
    if (a === b || b === 'unknown') return true;
    if (b === 'string' || b === 'number') return familyOf(a) === b && a !== b;
    return false;
  }
  function reduceUnion(ms) {
    var r = ms.filter(function (a) { return !ms.some(function (b) { return b !== a && sub(a, b); }); });
    if (r.indexOf('true') >= 0 && r.indexOf('false') >= 0) { r = r.filter(function (x) { return x !== 'true' && x !== 'false'; }); r.push('boolean'); }
    if (r.indexOf('unknown') >= 0) r = ['unknown'];
    return r;
  }
  function meet(a, b) {
    if (a === b) return a;
    if (sub(a, b)) return a;
    if (sub(b, a)) return b;
    return null; /* disjoint → never */
  }

  topics.push({
    title: 'Union Types, Intersection Types & Literal Types',
    analogy: `<p>Think of a <b>parking garage sign</b>. "<b>Cars OR motorbikes</b>" (a <b>union</b>, <code>Car | Bike</code>) lets in more vehicles, but the attendant can only assume what is true for <i>both</i> — "it has wheels". "<b>Electric AND compact</b>" (an <b>intersection</b>, <code>Electric &amp; Compact</code>) lets in fewer vehicles, but each one you get can do <i>everything</i> on both lists.</p>
<p>A <b>literal type</b> is a sign that names exact spots: "<b>only spots A1, A2 or B7</b>". Not "any spot" (<code>string</code>), but <code>"A1" | "A2" | "B7"</code>. Write the wrong spot name and the attendant stops you at the gate.</p>`,
    explain: `<p>🟢 <b>The plain idea: a type is a set of values.</b> <code>number</code> is the set of all numbers. <code>"red"</code> (a <b>literal type</b>) is a set with exactly one value. Once you see types as sets, the operators are easy:</p>
${H.table(['Syntax', 'Name', 'Set meaning', 'Example'], [['<code>A | B</code>', 'Union', 'values in A <b>or</b> B (bigger set)', '<code>string | number</code>'], ['<code>A &amp; B</code>', 'Intersection', 'values in A <b>and</b> B (smaller set)', '<code>HasId &amp; HasName</code>'], ['<code>"GET" | "POST"</code>', 'Union of literals', 'exactly these values', 'HTTP methods, statuses, sizes'], ['<code>never</code>', 'Empty set', 'no value at all', '<code>string &amp; number</code>'], ['<code>unknown</code>', 'Everything', 'every value', 'untrusted input']])}
<p>${H.chips(['"sm"', '"md"', '"lg"'], { label: 'type Size = "sm" | "md" | "lg"', hl: { 1: 'g' } })}</p>
<p>🔵 <b>The surprise that trips everyone up:</b> with <b>object</b> types the property lists go the <i>opposite</i> way to the value sets.</p>
<ul>
<li><code>Cat | Dog</code>: the value could be either, so you may only touch properties <b>both</b> have (e.g. <code>name</code>). To use <code>meow()</code> you must first <b>narrow</b> (topic 4).</li>
<li><code>Cat &amp; Dog</code>: the value is both at once, so it has <b>all</b> properties of both. Intersections are how you <b>combine</b> object types: <code>type Employee = Person &amp; { salary: number }</code>.</li>
</ul>
${H.table(['', 'Values allowed', 'Properties you can use'], [['<code>Cat | Dog</code>', H.c('g', 'more (either one)'), H.c('r', 'fewer (only shared ones)')], ['<code>Cat &amp; Dog</code>', H.c('r', 'fewer (must be both)'), H.c('g', 'more (all of them)')]])}
<p>🟣 <b>Literal types in practice.</b> A union of string literals is the everyday TypeScript replacement for "magic strings": <code>type Status = "idle" | "loading" | "error"</code>. You get autocomplete, typo detection, and zero runtime cost. Remember the inference rule from topic 1: <code>let</code> and object properties <b>widen</b> <code>"idle"</code> to <code>string</code>; use <code>const</code>, an annotation, or <code>as const</code> to keep the literal.</p>
<p><b>Nullable values are just unions.</b> With <code>strictNullChecks</code>, <code>string</code> does not include <code>null</code>. A value that may be missing is <code>string | null</code> or <code>string | undefined</code>, and TS forces you to handle the empty case. That single rule removes the most common JavaScript crash: "Cannot read properties of undefined".</p>`,
    clues: ['"The value can be X or Y" / "accepts a string or an array" → union type', '"Combine two object types" / "add fields to an existing type" / mixins → intersection', '"Only these values are allowed" (status, method, size, direction) → union of string literals', '"Why can I not call this method on my union?" → only shared members are accessible until you narrow', '"Why is this property type never?" → intersection of conflicting property types', '"Type string is not assignable to type \'left\' | \'right\'" → literal widening; use as const or annotate'],
    code: [{ title: 'Unions, intersections and literal types in one file', code: `
// Union of literal types: only these three strings are allowed
type Size = "sm" | "md" | "lg";
// Union of different kinds: a padding can be a number (px) or a CSS string
type Padding = number | string;

function pad(p: Padding): string {
  // Only operations valid for BOTH number and string are allowed here,
  // so we narrow first (topic 4)
  return typeof p === "number" ? p + "px" : p;
}

// Intersection: combine object types (must have ALL properties)
type HasId = { id: string };
type Timestamped = { createdAt: Date; updatedAt: Date };
type Entity = HasId & Timestamped;

const row: Entity = { id: "u1", createdAt: new Date(0), updatedAt: new Date(0) };

// Union of object types: only shared members are accessible
type Cat = { name: string; meow(): string };
type Dog = { name: string; bark(): string };
function greet(pet: Cat | Dog): string {
  // pet.meow();  would be an error: Dog has no meow
  return "Hi " + pet.name; // OK: both have name
}

// Nullable = union with null; strictNullChecks makes you handle it
function initials(name: string | null): string {
  if (name === null) return "?";
  return name.split(" ").map((w) => w[0]).join("");
}

const s: Size = "md";
// @ts-expect-error -- Type '"xl"' is not assignable to type 'Size'
const bad: Size = "xl";
console.log(pad(8), pad("1rem"), row.id, greet({ name: "Rex", bark: () => "woof" }), initials("Ada Lovelace"), s);
` }],
    codeTitle: ['Unions, intersections, literal unions, nullable types'],
    viz: [{
      title: 'Types as sets: computing A | B and A & B',
      input: 'string | number | "admin" / "admin" | "guest" | boolean | number',
      inputLabel: 'Type A  /  Type B   (primitives, literals like "x" 1 true, or Names)',
      gen: function (input) {
        var halves = String(input).split('/');
        if (halves.length !== 2) throw new Error('Separate type A and type B with a single "/"');
        var A = parseUnion(halves[0]), B = parseUnion(halves[1]);
        var frames = [];
        var all = uniq(A.concat(B));
        function setPart(label, items, hl) { return { type: 'set', label: label, items: items.length ? items : ['never (empty)'], hl: hl || {} }; }
        frames.push(fr('Think of each type as a <b>set of possible values</b>. <code>boolean</code> is really the two values <code>true | false</code>, and a literal like <code>"admin"</code> is a set with one value inside the bigger <code>string</code> set.', [setPart('A', A), setPart('B', B)]));
        var u = [], uhl = {};
        all.forEach(function (m, i) {
          u.push(m);
          var h = {}; h[m] = 'cur';
          frames.push(fr('<b>Union</b> step ' + (i + 1) + ': add <code>' + esc(m) + '</code> (it is in ' + (A.indexOf(m) >= 0 && B.indexOf(m) >= 0 ? 'both A and B' : (A.indexOf(m) >= 0 ? 'A' : 'B')) + '). A union keeps <b>everything</b> from either side.', [setPart('A', A, A.indexOf(m) >= 0 ? h : {}), setPart('B', B, B.indexOf(m) >= 0 ? h : {}), setPart('A | B (building)', u.slice(), h)]));
        });
        var red = reduceUnion(u);
        var absorbed = u.filter(function (m) { return red.indexOf(m) < 0 && m !== 'true' && m !== 'false'; });
        red.forEach(function (m) { uhl[m] = 'ok'; });
        frames.push(fr('TypeScript then <b>simplifies</b> the union: ' + (absorbed.length ? 'literal(s) <code>' + esc(absorbed.join(', ')) + '</code> disappear because a wider member already contains them (<code>"admin" | string</code> is just <code>string</code>). ' : 'nothing can be absorbed here. ') + (red.indexOf('boolean') >= 0 ? '<code>true | false</code> is written back as <code>boolean</code>.' : ''), [setPart('A | B (simplified)', red, uhl), tx('Bigger set of values ⇒ you can <b>assign more</b> things to it, but you can <b>do less</b> with a value of this type until you narrow it.', 'Union rule of thumb')]));
        var rows = [], inter = [];
        A.forEach(function (a) {
          B.forEach(function (b) {
            var r = meet(a, b);
            if (r !== null || a === b || familyOf(a) === familyOf(b)) {
              rows.push([a, b, r === null ? 'never' : r]);
              if (r !== null) inter.push(r);
            }
          });
        });
        inter = uniq(inter);
        frames.push(fr('<b>Intersection</b>: a value must be in A <b>and</b> in B. We pair up members and keep only the overlap. Pairs from different families (a string literal vs a number) overlap in nothing, so they vanish.', [{ type: 'table', label: 'Pairs that could overlap', columns: ['from A', 'from B', 'A & B gives'], rows: rows.length ? rows : [['—', '—', 'no overlapping pairs']], hl: (function () { var h = {}; rows.forEach(function (r, i) { h[i] = r[2] === 'never' ? 'bad' : 'ok'; }); return h; })() }, setPart('A & B', inter, (function () { var h = {}; inter.forEach(function (m) { h[m] = 'sel'; }); return h; })())]));
        var ired = reduceUnion(inter);
        frames.push(fr(ired.length ? 'Result: <code>A &amp; B</code> = <code>' + esc(ired.join(' | ')) + '</code>. The intersection is always <b>the same or smaller</b> than either side.' : 'Result: <code>A &amp; B</code> = <b>never</b> — the empty set. No value can be in both, so nothing can ever be assigned to it. This is what happens with <code>string &amp; number</code>.', [setPart('A | B', red), setPart('A & B', ired, (function () { var h = {}; ired.forEach(function (m) { h[m] = 'sel'; }); return h; })()), vp({ 'A | B': red.join(' | ') || 'never', 'A & B': ired.join(' | ') || 'never' }, { 'A & B': ired.length ? 'ok' : 'bad' }, 'Final types')]));
        frames.push(fr('Careful: for <b>object</b> types this flips for <i>properties</i>. <code>Cat | Dog</code> lets you use only shared properties; <code>Cat &amp; Dog</code> has all of them. Try the next visualizer to see it.', [tx('Values: union = more, intersection = fewer.<br>Properties you may use: union = fewer, intersection = more.', 'The flip')]));
        return frames;
      }
    }, {
      title: 'Object unions vs intersections: which properties can you use?',
      input: 'name, age, meow / name, age, bark, fetch',
      inputLabel: 'Cat properties  /  Dog properties',
      gen: function (input) {
        var halves = String(input).split('/');
        if (halves.length !== 2) throw new Error('Separate the two property lists with "/"');
        function keys(s) {
          var k = uniq(String(s).split(',').map(function (x) { return x.trim(); }).filter(Boolean));
          k.forEach(function (x) { if (!/^[A-Za-z_$][\w$]*$/.test(x)) throw new Error('Property names only, e.g. name, age, meow (got ' + x + ')'); });
          if (!k.length || k.length > 7) throw new Error('Give 1 to 7 property names per side');
          return k;
        }
        var C = keys(halves[0]), D = keys(halves[1]);
        var shared = C.filter(function (k) { return D.indexOf(k) >= 0; });
        var all = uniq(C.concat(D));
        var frames = [];
        var nodes = [{ id: 'C', label: 'Cat', x: 15, y: 15, shape: 'box' }, { id: 'D', label: 'Dog', x: 15, y: 50, shape: 'box' }, { id: 'U', label: 'Cat | Dog', x: 55, y: 15, shape: 'box', w: 22 }, { id: 'I', label: 'Cat & Dog', x: 55, y: 50, shape: 'box', w: 22 }, { id: 'SU', label: 'uses: shared', x: 88, y: 15, shape: 'box', w: 20 }, { id: 'SI', label: 'uses: all', x: 88, y: 50, shape: 'box', w: 20 }];
        var edges = [['C', 'U', 'or'], ['D', 'U', 'or'], ['C', 'I', 'and'], ['D', 'I', 'and'], ['U', 'SU'], ['I', 'SI']];
        frames.push(fr('Two object types. A <code>Cat</code> has <code>' + C.join(', ') + '</code>; a <code>Dog</code> has <code>' + D.join(', ') + '</code>. We combine them two ways.', [{ type: 'set', label: 'Cat properties', items: C }, { type: 'set', label: 'Dog properties', items: D }, { type: 'graph', directed: true, height: 65, nodes: nodes, edges: edges }]));
        var hs = {}; shared.forEach(function (k) { hs[k] = 'ok'; });
        frames.push(fr('<code>pet: Cat | Dog</code> means "I hold <b>one of them</b>, I do not know which". TypeScript only lets you read what is <b>safe for both</b>: ' + (shared.length ? '<code>' + shared.join(', ') + '</code>' : '<b>nothing</b> (no shared property)') + '.', [{ type: 'set', label: 'Cat | Dog — safe to read', items: shared.length ? shared : ['(none)'], hl: hs }, { type: 'graph', directed: true, height: 65, nodes: nodes, edges: edges, hl: { U: 'cur', SU: 'ok' }, ehl: { 'C-U': 'ok', 'D-U': 'ok', 'U-SU': 'ok' } }]));
        var only = all.filter(function (k) { return shared.indexOf(k) < 0; });
        only.forEach(function (k) {
          var owner = C.indexOf(k) >= 0 ? 'Cat' : 'Dog';
          frames.push(fr('<code>pet.' + k + '</code> on <code>Cat | Dog</code> → ' + H.c('r', 'error') + ': only <code>' + owner + '</code> has it. Narrow first: <code>if ("' + k + '" in pet) pet.' + k + '</code>, or use a discriminant field such as <code>kind</code>.', [vp({ expression: 'pet.' + k, 'type of pet': 'Cat | Dog', verdict: 'Property \'' + k + '\' does not exist on type \'' + (owner === 'Cat' ? 'Dog' : 'Cat') + '\'' }, { verdict: 'bad' }, 'Compiler check'), { type: 'code', label: 'Fix by narrowing', lang: 'ts', code: 'if ("' + k + '" in pet) {\n  pet.' + k + '; // pet: ' + owner + ' here\n}', hl: { 1: 'cur', 2: 'ok' } }]));
        });
        var ha = {}; all.forEach(function (k) { ha[k] = 'sel'; });
        frames.push(fr('<code>x: Cat &amp; Dog</code> means "this value is <b>both</b>". It must have <b>every</b> property from both lists, and you may use all of them: <code>' + all.join(', ') + '</code>. This is how intersections <b>combine</b> types.', [{ type: 'set', label: 'Cat & Dog — must have AND may use', items: all, hl: ha }, { type: 'graph', directed: true, height: 65, nodes: nodes, edges: edges, hl: { I: 'cur', SI: 'sel' }, ehl: { 'C-I': 'sel', 'D-I': 'sel', 'I-SI': 'sel' } }]));
        frames.push(fr('Watch out: if a shared property had <b>different literal types</b> (Cat <code>kind: "cat"</code>, Dog <code>kind: "dog"</code>), then in <code>Cat &amp; Dog</code> that property would be <code>"cat" &amp; "dog"</code> = <b>never</b>, and TS reduces the whole intersection to <code>never</code>. In a <b>union</b>, that same <code>kind</code> field is exactly what lets you tell the two apart (a discriminated union, next topic).', [{ type: 'table', label: 'Summary', columns: ['type', 'values allowed', 'properties usable'], rows: [['Cat | Dog', 'a Cat or a Dog', shared.join(', ') || '(none)'], ['Cat & Dog', 'only things that are both', all.join(', ')]], hl: { 0: 'win', 1: 'sel' } }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Literal widening: why "left" became string', html: `<p>A classic "why does this not compile?". The object property <code>align</code> is mutable, so TS widens <code>"left"</code> to <code>string</code>. Passing a <code>string</code> where <code>"left" | "right"</code> is required fails. Three fixes: annotate the object, use <code>as const</code>, or use <code>satisfies</code>.</p>`, code: `type Align = "left" | "right";
function setAlign(a: Align): Align { return a; }

const opts = { align: "left" };            // align: string (widened)
// @ts-expect-error -- Argument of type 'string' is not assignable to parameter of type 'Align'
setAlign(opts.align);

const opts1: { align: Align } = { align: "left" };  // fix 1: annotate
const opts2 = { align: "left" } as const;           // fix 2: as const → readonly align: "left"
const opts3 = { align: "left" } satisfies { align: Align }; // fix 3: satisfies keeps "left"
console.log(setAlign(opts1.align), setAlign(opts2.align), setAlign(opts3.align));` },
      { title: 'string[] | number[] is not (string | number)[]', html: `<p><code>(string | number)[]</code> is <b>one</b> array that may mix both: <code>[1, "a"]</code>. <code>string[] | number[]</code> is <b>either</b> an all-strings array <b>or</b> an all-numbers array. Calling methods on a union of arrays can be awkward (each member has its own <code>push</code> signature), so pick the one that matches your data.</p>`, code: `const mixed: (string | number)[] = [1, "a", 2];   // OK: one array, mixed items
const oneKind: string[] | number[] = [1, 2, 3];   // OK: all numbers
// @ts-expect-error -- a mixed array fits neither string[] nor number[]
const notOk: string[] | number[] = [1, "a"];
// Reading is fine: every element is string | number
const firstVal: string | number = oneKind[0];
console.log(mixed.length, firstVal);` },
      { title: 'Intersections to extend and to "mix in"', html: `<p>Intersections build bigger types from smaller reusable pieces. A function that adds fields returns <code>T &amp; Extra</code>, so the caller keeps every original property <i>and</i> gains the new ones — fully typed.</p>`, code: `type WithTimestamps = { createdAt: Date; updatedAt: Date };

function stamp<T extends object>(obj: T): T & WithTimestamps {
  const now = new Date(0);
  return { ...obj, createdAt: now, updatedAt: now };
}

const post = stamp({ title: "Hello", likes: 3 });
// post: { title: string; likes: number } & WithTimestamps
console.log(post.title, post.likes, post.createdAt.getTime());` },
      { title: 'Optional property vs union with undefined', html: `<p><code>nick?: string</code> means "the key may be <b>missing</b>". <code>nick: string | undefined</code> means "the key must be <b>present</b>, its value may be undefined". Callers feel the difference: the second forces <code>{ nick: undefined }</code>. With <code>exactOptionalPropertyTypes</code> (topic 7), <code>nick?: string</code> even forbids writing <code>nick: undefined</code> explicitly.</p>`, code: `type A = { nick?: string };
type B = { nick: string | undefined };
const a: A = {};                   // OK: key missing
// @ts-expect-error -- Property 'nick' is missing in type '{}' but required in type 'B'
const b: B = {};
const b2: B = { nick: undefined }; // OK: present but undefined
console.log(a.nick ?? "none", b2.nick ?? "none");` }
    ],
    deepDive: `<p><b>Subtype reduction and normalisation.</b> TS simplifies unions: <code>"a" | string</code> → <code>string</code>, <code>true | false</code> is displayed as <code>boolean</code>, <code>T | never</code> → <code>T</code>, and <code>T | unknown</code> → <code>unknown</code>. Intersections of disjoint primitives (<code>string &amp; number</code>) reduce to <code>never</code>, and since TS 3.9 an object intersection whose <b>discriminant</b> properties conflict (<code>{ kind: "a" } &amp; { kind: "b" }</code>) is reduced to <code>never</code> as a whole — the error message even says "was reduced to never because property kind has conflicting types".</p>
<p><b>Distribution.</b> Property access distributes over unions: for <code>pet: Cat | Dog</code>, <code>pet.name</code> has type <code>Cat["name"] | Dog["name"]</code>. Calling a union of functions requires arguments that satisfy <b>all</b> signatures (parameters intersect): <code>((x: string) =&gt; void) | ((x: number) =&gt; void)</code> can only be called with <code>string &amp; number</code> = <code>never</code>, which is why calling such a union often fails.</p>
<p><b>Literal types and widening in detail.</b> A <code>const</code> declaration of a primitive gets a <i>widening</i> literal type: <code>const c = "x"</code> is <code>"x"</code>, but <code>let d = c</code> widens back to <code>string</code>. Annotated literal types (<code>const c: "x" = "x"</code>) are non-widening. <code>as const</code> produces deeply readonly, non-widening literals and turns arrays into readonly <b>tuples</b>: <code>["a", "b"] as const</code> is <code>readonly ["a", "b"]</code>, and <code>(typeof arr)[number]</code> recovers the union <code>"a" | "b"</code> — the standard way to keep a runtime list and a type in sync.</p>
<p><b>Big unions cost compile time.</b> Unions with thousands of members (often generated by template-literal types) make assignability checks O(n·m); TS has limits (e.g. "Expression produces a union type that is too complex to represent" past ~100,000 members). In real code, unions of a few dozen literals are free.</p>
<p><b>Runtime reality.</b> A union of literals has no runtime presence. If you need to <i>iterate</i> the allowed values (for a dropdown, or validation), start from a runtime array <code>as const</code> and derive the type from it, never the other way around.</p>`,
    aiEra: `<p><b>What AI changes:</b> models are good at proposing literal unions from data ("here are 40 log lines — infer the <code>LogLevel</code> type"), and at writing the boilerplate of combining object types. The type-as-set mental model is what lets you judge whether the suggestion is too loose (<code>string</code>) or too tight (missing a value that exists in production).</p>
<p><b>Use AI as a partner:</b> <code>List every distinct value of the status field in this JSON sample and propose a union type; flag values that look like typos</code>. Or: <code>Explain in plain English why this intersection type became never</code>.</p>
<p><b>Where AI goes wrong:</b> typing a status field as <code>string</code> (losing all checks), confusing <code>A | B</code> with <code>A &amp; B</code> when "merging" config types, using <code>string[] | number[]</code> when the data is mixed, and widening a literal by storing it in a mutable object before passing it on, then "fixing" the error with a cast.</p>
<p><b>What you must still own:</b> choosing the right set of allowed values (that is a product decision, not a typing one), keeping a single runtime source of truth for literal lists, and spotting when a union should become a <b>discriminated</b> union so that impossible combinations cannot be represented.</p>`,
    problems: [{
      title: 'Why Does This Not Compile? The Widened Literal', level: 'Medium', tags: ['literal types', 'widening', 'as const', 'unions'], companies: ['Vercel', 'Meta', 'Atlassian'],
      statement: `<p>This code is rejected with <i>"Argument of type 'string' is not assignable to parameter of type 'Method'"</i>. Explain exactly <b>why</b>, then fix it in a way that keeps the list of methods as a single source of truth usable at runtime (for a dropdown) <b>and</b> at compile time.</p>
<pre>type Method = "GET" | "POST" | "PUT" | "DELETE";
function call(method: Method, url: string) { /* ... */ }
const req = { method: "GET", url: "/users" };
call(req.method, req.url);</pre>`,
      constraints: `No type assertions on the call (<code>as Method</code> is not allowed). The allowed methods must be written <b>once</b>.`,
      example: `<p>Before: ${H.c('r', 'error on req.method')} because <code>req</code> is inferred as <code>{ method: string; url: string }</code>. After: ${H.c('g', 'compiles')}, and <code>METHODS</code> can be mapped into <code>&lt;option&gt;</code> elements at runtime.</p>`,
      brute: { why: `<p>Casting at the call site silences the error, but the cast is a lie the compiler cannot verify: change <code>"GET"</code> to <code>"GETT"</code> and it still compiles. The type and the dropdown list are also written in two places, so they drift.</p>`, code: `type Method = "GET" | "POST" | "PUT" | "DELETE";
function call(method: Method, url: string): string { return method + " " + url; }
const req = { method: "GETT", url: "/users" };          // typo, nobody notices
console.log(call(req.method as Method, req.url));      // cast hides it
const dropdown = ["GET", "POST", "PUT", "DELETE"];     // second copy of the list` },
      mcq: { q: 'What type does TS infer for <code>req.method</code> in <code>const req = { method: "GET" }</code>?', options: ['"GET"', 'string', 'Method', 'any'], answer: 1, explain: '<code>const</code> only freezes the variable binding; the object property is mutable, so TS widens the literal "GET" to string.' },
      hints: [`<p>Hint 1: <code>const</code> protects the variable, not the properties inside the object. What does TS do with literals in mutable positions?</p>`, `<p>Hint 2: <code>as const</code> on an array gives a readonly tuple of literals; <code>(typeof ARR)[number]</code> turns that tuple into a union.</p>`, `<p>Hint 3: Recipe: <code>const METHODS = [...] as const</code> → <code>type Method = (typeof METHODS)[number]</code> → type the request object as <code>{ method: Method; url: string }</code> (or use <code>satisfies</code>) → call works, and the dropdown maps over <code>METHODS</code>.</p>`],
      tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, arg) {\n  if (kind === 'call') return call(arg.split(' ')[0], arg.split(' ')[1]);\n  if (kind === 'methods') return METHODS.slice();\n  if (kind === 'options') return [options.length, options[1]];\n  if (kind === 'req') return call(req.method, req.url);\n  if (kind === 'unique') return new Set(METHODS).size === METHODS.length;\n}"},"cases":[[["call","GET /users"],"GET /users"],[["call","POST /a/b"],"POST /a/b"],[["call","DELETE /"],"DELETE /"],[["methods",""],["GET","POST","PUT","DELETE"]],[["options",""],[4,{"label":"POST","value":"POST"}]],[["req",""],"GET /users"],[["unique",""],true]]},
      solution: {
        approach: `<p>The property is widened to <code>string</code> because objects are mutable. Make the runtime array the source of truth with <code>as const</code>, derive the union type from it, and give the request object a type that keeps the literal (an annotation or <code>satisfies</code>). Typos are now caught and the dropdown can never disagree with the type.</p>`,
        code: `// Single source of truth: a runtime array of literals
const METHODS = ["GET", "POST", "PUT", "DELETE"] as const;
// Derive the union from it: "GET" | "POST" | "PUT" | "DELETE"
type Method = (typeof METHODS)[number];

interface ApiRequest { method: Method; url: string }

function call(method: Method, url: string): string {
  return method + " " + url;
}

// satisfies checks the shape AND keeps method: "GET" (no widening to string)
const req = { method: "GET", url: "/users" } satisfies ApiRequest;
console.log(call(req.method, req.url));

// Runtime use of the same list (e.g. building a dropdown)
const options = METHODS.map((m) => ({ label: m, value: m }));
console.log(options.length);

// @ts-expect-error -- Type '"GETT"' is not assignable to type 'Method'
const typo: ApiRequest = { method: "GETT", url: "/x" };`,
        dry: { head: ['declaration', 'type of method', 'call(req.method)'], rows: [['const req = { method: "GET" }', 'string', H.c('r', 'error')], ['const req = {...} as const', 'readonly "GET"', H.c('g', 'ok')], ['const req: ApiRequest = {...}', 'Method', H.c('g', 'ok')], ['const req = {...} satisfies ApiRequest', '"GET"', H.c('g', 'ok')], ['method: "GETT"', '—', H.c('r', 'typo caught')]] },
        complexity: `<p>Zero runtime cost for the types; <code>METHODS</code> is one small array. Compile-time checks are O(number of literals).</p>`,
        followUps: ['Write a runtime guard <code>isMethod(x: string): x is Method</code> using <code>METHODS.includes</code> — what typing issue appears with <code>includes</code> on a readonly tuple?', 'When would you prefer an annotation over <code>satisfies</code>?', 'How would you add lowercase aliases without duplicating the list?']
      }
    }]
  });

  /* ================= TOPIC 4: Narrowing & type guards ================= */
  function parseMembers(s) {
    var ms = uniq(String(s).split('|').map(function (x) { return x.trim(); }).filter(Boolean));
    if (ms.length < 2) throw new Error('Give a union with at least 2 members, e.g. string | number | null | Date');
    if (ms.length > 7) throw new Error('Use at most 7 members');
    ms.forEach(function (m) {
      if (!(/^(string|number|boolean|bigint|symbol|null|undefined)$/.test(m) || /^[A-Z]\w*$/.test(m) || /^(string|number|boolean|[A-Z]\w*)\[\]$/.test(m)))
        throw new Error('Members: string, number, boolean, bigint, symbol, null, undefined, a class name like Date, RegExp or Error, or an array like string[]. Got: ' + m);
    });
    return ms;
  }
  function guardFor(group) {
    var m = group[0];
    if (m === 'null' || m === 'undefined') return { test: 'x === ' + m, body: 'return "' + (m === 'null' ? 'nothing' : 'missing') + '";', how: '<b>equality narrowing</b>: <code>=== ' + m + '</code> leaves only <code>' + m + '</code> inside' };
    if (/\[\]$/.test(m)) return { test: 'Array.isArray(x)', body: 'return "list of " + x.length;', how: '<code>Array.isArray</code> is a built-in <b>type predicate</b> (<code>arg is any[]</code>), so every array member goes in' };
    if (/^[A-Z]/.test(m)) return { test: 'x instanceof ' + m, body: 'return "a " + x.constructor.name;', how: '<b>instanceof narrowing</b>: works for classes (they exist at runtime). It would <i>not</i> work for an interface' };
    var bodies = { string: 'return x.toUpperCase();', number: 'return x.toFixed(2);', boolean: 'return x ? "yes" : "no";', bigint: 'return x.toString() + "n";', symbol: 'return x.description ?? "symbol";' };
    return { test: 'typeof x === "' + m + '"', body: bodies[m], how: '<b>typeof narrowing</b>: JavaScript reports <code>"' + m + '"</code> at runtime and TS understands that check' };
  }

  topics.push({
    title: 'Narrowing & Type Guards (typeof, in, instanceof, Discriminated Unions, never)',
    analogy: `<p>You receive a <b>wrapped present</b> labelled "toy OR book OR sweets". You cannot start reading it or eating it yet — first you <b>shake it, feel it, peek inside</b>. Each check rules options out: "it rattles, so it is not a book". After enough checks you know exactly what you hold and can use it safely.</p>
<p>That is <b>narrowing</b>: TypeScript follows your <code>if</code> checks like a detective with a notebook, crossing out possibilities line by line. A <b>discriminated union</b> is a present with a <b>tag on the outside</b> ("kind: book") — one glance and you know.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A union like <code>string | number</code> only lets you do what is safe for <i>every</i> member. To do more, you <b>check</b> at runtime, and TypeScript <b>narrows</b> the type inside that branch. This is called <b>control-flow analysis</b>: the type of a variable can be different on different lines.</p>
${H.table(['Guard', 'Example', 'Narrows to', 'Use for'], [['<code>typeof</code>', '<code>typeof x === "string"</code>', 'string', 'primitives'], ['Truthiness', '<code>if (user)</code>', 'removes null/undefined (and falsy!)', 'optional values'], ['Equality', '<code>x === null</code>, <code>a === b</code>', 'the matching type', 'null checks, literals'], ['<code>in</code>', '<code>"bark" in pet</code>', 'members that have that key', 'object unions without a tag'], ['<code>instanceof</code>', '<code>err instanceof TypeError</code>', 'that class', 'classes, Date, Error'], ['Discriminant', '<code>switch (s.kind)</code>', 'the member with that tag', 'state, events, results'], ['Type predicate', '<code>function isCat(p): p is Cat</code>', 'whatever you claim', 'reusable custom checks'], ['Assertion fn', '<code>asserts x is string</code>', 'rest of the scope', 'validate-or-throw']])}
<p>🔵 <b>Discriminated (tagged) unions</b> are the most important pattern in real TypeScript. Give each member a common <b>literal</b> field (usually <code>kind</code>, <code>type</code> or <code>status</code>):</p>
<pre>type Result =
  | { status: "ok"; data: string }
  | { status: "error"; message: string };</pre>
<p>Checking <code>r.status === "ok"</code> narrows <code>r</code> to the first member, so <code>r.data</code> is allowed there and <code>r.message</code> is not. Impossible states ("ok but with an error message") simply cannot be written.</p>
<p>🟣 <b>Exhaustiveness with <code>never</code>.</b> After you handle every member, the remaining type is <code>never</code> (empty set). Assign it to a <code>never</code> variable in the <code>default</code> branch. When someone later adds a new member to the union, that line turns red everywhere a case is missing — the compiler becomes your to-do list.</p>
<p><b>Custom type guards</b> (<code>x is T</code>) and <b>assertion functions</b> (<code>asserts x is T</code>) let you package checks. Careful: TS <b>trusts</b> them. If your function body checks the wrong thing, TS still narrows — a lying guard is as dangerous as <code>as</code>.</p>`,
    clues: ['"The parameter can be a string or an array" → typeof / Array.isArray narrowing', '"Handle every case / make adding a new type a compile error" → discriminated union + never exhaustiveness check', '"Model loading / success / error states" → discriminated union on a status field', '"Validate unknown JSON from an API" → unknown + type predicate (or a schema library)', '"Property does not exist on type A | B" → narrow with in, a discriminant, or instanceof', '"Why is my narrowing lost inside the callback?" → mutable let captured in a closure; copy to a const', '"Object is possibly null" → equality/truthiness narrowing, optional chaining'],
    code: [{ title: 'Every narrowing technique, side by side', code: `
// 1) typeof + equality + Array.isArray
function format(x: string | number | string[] | null): string {
  if (x === null) return "-";                 // x: null
  if (typeof x === "number") return x.toFixed(2); // x: number
  if (Array.isArray(x)) return x.join(", ");  // x: string[]
  return x.trim();                            // x: string (only one left)
}

// 2) in operator for object unions without a tag
type Fish = { swim(): string };
type Bird = { fly(): string };
function move(a: Fish | Bird): string {
  return "swim" in a ? a.swim() : a.fly();
}

// 3) instanceof for classes (exist at runtime)
function message(e: unknown): string {
  if (e instanceof Error) return e.message; // e: Error
  return String(e);
}

// 4) Discriminated union + exhaustive switch
type Shape =
  | { kind: "circle"; r: number }
  | { kind: "square"; side: number };

function assertNever(x: never): never {
  throw new Error("Unhandled case: " + JSON.stringify(x));
}
function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r ** 2; // s: circle member
    case "square": return s.side ** 2;        // s: square member
    default: return assertNever(s);           // s: never — all cases handled
  }
}

// 5) User-defined type predicate
interface User { id: number; name: string }
function isUser(v: unknown): v is User {
  return typeof v === "object" && v !== null &&
    "id" in v && typeof v.id === "number" &&
    "name" in v && typeof v.name === "string";
}

// 6) Assertion function: throws or narrows for the rest of the scope
function assertIsString(v: unknown, label: string): asserts v is string {
  if (typeof v !== "string") throw new TypeError(label + " must be a string");
}

const raw: unknown = JSON.parse('{"id": 1, "name": "Ada"}');
if (isUser(raw)) console.log(raw.name);       // raw: User
const env: unknown = "prod";
assertIsString(env, "env");
console.log(env.toUpperCase(), format(["a", "b"]), move({ fly: () => "flap" }), message(new Error("x")), area({ kind: "square", side: 3 }));
` }],
    codeTitle: ['typeof, in, instanceof, discriminants, predicates, assertions'],
    viz: [{
      title: 'Narrowing step by step: what is x on each line?',
      input: 'string | number | null | Date | string[]',
      inputLabel: 'A union for parameter x (string, number, boolean, null, undefined, Date/RegExp/Error, string[] …)',
      gen: function (input) {
        var ms = parseMembers(input);
        /* order: null/undefined, primitives, arrays (grouped), classes */
        var groups = [];
        ms.filter(function (m) { return m === 'null' || m === 'undefined'; }).forEach(function (m) { groups.push([m]); });
        ms.filter(function (m) { return /^(string|number|boolean|bigint|symbol)$/.test(m); }).forEach(function (m) { groups.push([m]); });
        var arrs = ms.filter(function (m) { return /\[\]$/.test(m); });
        if (arrs.length) groups.push(arrs);
        ms.filter(function (m) { return /^[A-Z]\w*$/.test(m); }).forEach(function (m) { groups.push([m]); });
        var lines = ['function describe(x: ' + ms.join(' | ') + '): string {'];
        var info = [];
        groups.forEach(function (g) {
          var gd = guardFor(g);
          info.push({ g: g, gd: gd, ifLine: lines.length + 1 });
          lines.push('  if (' + gd.test + ') {');
          lines.push('    ' + gd.body);
          lines.push('  }');
        });
        var neverLine = lines.length + 1;
        lines.push('  const done: never = x; // exhaustive');
        lines.push('  return done;');
        lines.push('}');
        var code = lines.join('\n');
        var frames = [], remaining = ms.slice();
        var hist = [];
        frames.push(fr('At the top of the function, <code>x</code> could be <b>any</b> of the ' + ms.length + ' members. You may only use operations that are valid for all of them — practically nothing. Let us narrow it down.', [cp(code, { 1: 'cur' }), vp({ 'x (here)': remaining.join(' | ') }, { 'x (here)': 'cur' }), { type: 'set', label: 'Still possible', items: remaining.slice() }]));
        info.forEach(function (it) {
          var inside = it.g.slice();
          var after = remaining.filter(function (m) { return it.g.indexOf(m) < 0; });
          var hlS = {}; inside.forEach(function (m) { hlS[m] = 'ok'; });
          var h1 = {}; h1[it.ifLine] = 'cur';
          frames.push(fr('Check <code>' + esc(it.gd.test) + '</code>. ' + it.gd.how + '.', [cp(code, h1), vp({ 'x if true': inside.join(' | '), 'x if false': after.length ? after.join(' | ') : 'never' }, { 'x if true': 'ok', 'x if false': 'win' }), { type: 'set', label: 'Still possible', items: remaining.slice(), hl: hlS }]));
          var h2 = {}; h2[it.ifLine] = 'done'; h2[it.ifLine + 1] = 'ok';
          frames.push(fr('Inside the branch <code>x</code> is exactly <code>' + esc(inside.join(' | ')) + '</code>' + (/x[.?]|x\b \?/.test(it.gd.body) ? ', so <code>' + esc(it.gd.body.replace(/^return /, '').replace(/;$/, '')) + '</code> type-checks' : ' and we return a fixed message') + '. Because the branch <b>returns</b>, TS knows that code below it only runs when the check was false.', [cp(code, h2), vp({ x: inside.join(' | ') }, { x: 'ok' })]));
          remaining = after;
          hist.push([it.gd.test, inside.join(' | '), remaining.length ? remaining.join(' | ') : 'never']);
          var hlR = {}; it.g.forEach(function (m) { hlR[m] = 'bad'; });
          frames.push(fr('After the <code>if</code>: <code>' + esc(it.g.join(' | ')) + '</code> is crossed out. Remaining: <code>' + esc(remaining.length ? remaining.join(' | ') : 'never') + '</code>.', [{ type: 'set', label: 'Crossed out now', items: it.g.slice(), hl: hlR }, { type: 'set', label: 'Still possible', items: remaining.length ? remaining.slice() : ['never'] }, { type: 'table', label: 'Narrowing history', columns: ['check', 'inside', 'after'], rows: hist.slice(), hl: (function () { var h = {}; h[hist.length - 1] = 'cur'; return h; })() }]));
        });
        var hn = {}; hn[neverLine] = 'sel';
        frames.push(fr('Every member has been handled, so on this line <code>x</code> is <b>never</b> (the empty set). Assigning it to a <code>never</code> variable compiles. This line is your <b>exhaustiveness alarm</b>.', [cp(code, hn), vp({ x: 'never' }, { x: 'sel' }), { type: 'table', label: 'Narrowing history', columns: ['check', 'inside', 'after'], rows: hist.slice() }]));
        var last = info[info.length - 1];
        var hb = {}; hb[last.ifLine] = 'bad'; hb[neverLine] = 'bad';
        frames.push(fr('Now imagine someone adds <code>' + esc(last.g.join(' | ')) + '</code> to the union but forgets the <code>if</code> (or deletes it). The never line becomes a <b>compile error</b>: <i>Type \'' + esc(last.g.join(' | ')) + '\' is not assignable to type \'never\'</i>. The bug is caught before it ships.', [cp(code, hb), vp({ x: last.g.join(' | '), error: 'Type \'' + last.g.join(' | ') + '\' is not assignable to type \'never\'' }, { error: 'bad' })]));
        return frames;
      }
    }, {
      title: 'Discriminated union: compile-time narrowing + runtime path',
      input: 'rect 3 4',
      inputLabel: 'A shape value: circle R  |  square SIDE  |  rect W H',
      gen: function (input) {
        var p = String(input).trim().split(/\s+/);
        var kind = p[0], nums = p.slice(1).map(Number);
        var need = { circle: 1, square: 1, rect: 2 };
        if (!need[kind] || nums.length !== need[kind] || nums.some(function (n) { return isNaN(n) || n < 0 || n > 1000; })) throw new Error('Write e.g. "circle 2", "square 3" or "rect 3 4" (numbers 0..1000)');
        var val = kind === 'circle' ? '{ kind: "circle", r: ' + nums[0] + ' }' : kind === 'square' ? '{ kind: "square", side: ' + nums[0] + ' }' : '{ kind: "rect", w: ' + nums[0] + ', h: ' + nums[1] + ' }';
        var code = 'type Shape =\n  | { kind: "circle"; r: number }\n  | { kind: "square"; side: number }\n  | { kind: "rect"; w: number; h: number };\n\nfunction area(s: Shape): number {\n  switch (s.kind) {\n    case "circle": return Math.PI * s.r ** 2;\n    case "square": return s.side ** 2;\n    case "rect":   return s.w * s.h;\n    default:       return assertNever(s);\n  }\n}';
        var full = 'Shape (3 members)';
        var frames = [];
        frames.push(fr('Three shapes share one field, <code>kind</code>, whose type is a different <b>literal</b> in each member. That field is the <b>discriminant</b> (the tag on the outside of the box). Our runtime value: <code>' + esc(val) + '</code>.', [cp(code, { 2: 'win', 3: 'win', 4: 'win' }), vp({ 'runtime s': val })]));
        frames.push(fr('Entering <code>area</code>: statically, <code>s</code> is any of the three. <code>s.kind</code> is allowed (every member has it) and its type is <code>"circle" | "square" | "rect"</code>. <code>s.r</code> would be an error here.', [cp(code, { 6: 'cur', 7: 'cur' }), vp({ 's (compile time)': full, 's.kind type': '"circle" | "square" | "rect"', 'runtime s.kind': '"' + kind + '"' }, { 's (compile time)': 'cur' })]));
        var cases = [['circle', 8, 'r', 'Math.PI * s.r ** 2'], ['square', 9, 'side', 's.side ** 2'], ['rect', 10, 'w, h', 's.w * s.h']];
        var rows = [];
        for (var c = 0; c < cases.length; c++) {
          var cs = cases[c], match = cs[0] === kind;
          var h = {}; h[cs[1]] = match ? 'ok' : 'cur';
          for (var d = 0; d < c; d++) h[cases[d][1]] = 'done';
          rows.push(['case "' + cs[0] + '"', '{ kind: "' + cs[0] + '"; ' + cs[2] + ' }', match ? 'MATCH' : 'skip']);
          frames.push(fr('<code>case "' + cs[0] + '"</code>: inside this case TS narrows <code>s</code> to the member whose kind is <code>"' + cs[0] + '"</code>, so <code>' + esc(cs[3]) + '</code> type-checks (no other member has <code>' + cs[2] + '</code>). At runtime, <code>"' + kind + '" === "' + cs[0] + '"</code> is <b>' + (match ? 'true' : 'false') + '</b>.', [cp(code, h), vp({ 's in this case': '{ kind: "' + cs[0] + '"; ' + cs[2] + ': number }', runtime: match ? 'this case runs' : 'skipped' }, { runtime: match ? 'ok' : 'done' }), { type: 'table', label: 'Cases', columns: ['case', 'compile-time s', 'runtime'], rows: rows.slice(), hl: (function () { var x = {}; x[rows.length - 1] = match ? 'ok' : 'done'; return x; })() }]));
          if (match) {
            var area = kind === 'circle' ? Math.PI * nums[0] * nums[0] : kind === 'square' ? nums[0] * nums[0] : nums[0] * nums[1];
            frames.push(fr('Runtime result: <b>' + (Math.round(area * 1000) / 1000) + '</b>. The type system and the runtime agree: the tag we checked is the tag that exists.', [vp({ result: Math.round(area * 1000) / 1000 }, { result: 'sel' }), cp(code, (function () { var x = {}; x[cs[1]] = 'sel'; return x; })())]));
            break;
          }
        }
        frames.push(fr('<code>default</code>: after all three cases, TS has crossed out every member, so <code>s</code> is <b>never</b> and <code>assertNever(s)</code> compiles. It never runs for valid data.', [cp(code, { 11: 'sel' }), vp({ 's in default': 'never' }, { 's in default': 'sel' })]));
        frames.push(fr('Add a 4th member <code>| { kind: "triangle"; b: number; h: number }</code> without a new case: in <code>default</code>, <code>s</code> is now the triangle member and <code>assertNever(s)</code> fails to compile. Every switch over Shape in the codebase lights up.', [cp(code.replace('{ kind: "rect"; w: number; h: number };', '{ kind: "rect"; w: number; h: number }\n  | { kind: "triangle"; b: number; h: number };'), { 5: 'ok', 12: 'bad' }), vp({ 's in default': '{ kind: "triangle"; b: number; h: number }', error: 'Argument of type \'{ kind: "triangle"; ... }\' is not assignable to parameter of type \'never\'' }, { error: 'bad' })]));
        return frames;
      }
    }],
    examples: [
      { title: 'Narrowing puzzle: truthiness drops 0 and ""', html: `<p><code>if (count)</code> narrows <code>number | undefined</code> to <code>number</code> — but it also skips the <b>real value 0</b>. Same for <code>""</code> with strings. TS cannot warn you, because the narrowing is type-correct; it is the <i>logic</i> that is wrong. Prefer <code>count !== undefined</code> or <code>count ?? default</code>.</p>`, code: `function label(count: number | undefined): string {
  if (count) return count + " items";            // BUG: 0 falls through
  return "no data";
}
function labelFixed(count: number | undefined): string {
  if (count !== undefined) return count + " items"; // 0 handled correctly
  return "no data";
}
console.log(label(0), "|", labelFixed(0)); // "no data" | "0 items"` },
      { title: 'Narrowing puzzle: why is it lost in the callback?', html: `<p>Narrowing is per <b>location</b>. A <code>let</code> that is reassigned later could change before a callback runs, so TS resets it to the declared type inside the closure. Fixes: copy into a <code>const</code> after checking, or avoid reassigning the variable (TS 5.4+ keeps narrowing in closures created <i>after</i> the last assignment).</p>`, code: `function run(input: string | null): string[] {
  let value = input;
  value = value ?? "default";        // value: string now
  const items = ["a", "b"];
  // TS 5.4+: no assignments after this point, so narrowing survives in the arrow
  const out = items.map((i) => value.toUpperCase() + i);
  const fixed = value;               // also fine: a const can never change
  return out.concat(items.map((i) => fixed + i));
}
console.log(run(null));` },
      { title: 'Lying type predicates: TS trusts you', html: `<p>A predicate's body is not checked against its claim. Below, <code>isNumberArray</code> only checks the first element; <code>[1, "two"]</code> passes, TS believes it is <code>number[]</code>, and <code>.toFixed</code> crashes at runtime. Test guards carefully, or generate them from a schema library.</p>`, code: `function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && typeof v[0] === "number"; // checks only one item!
}
const data: unknown = [1, "two"];
if (isNumberArray(data)) {
  // TS: data is number[]; reality: "two" is a string
  try { console.log(data.map((n) => n.toFixed(1))); }
  catch (e) { console.log("runtime crash:", e instanceof Error ? e.message : e); }
}` },
      { title: 'Aliased conditions and inferred predicates (TS 4.4 / 5.5)', html: `<p>You can store a check in a <code>const</code> and narrowing still works (<b>aliased conditions</b>, TS 4.4). Since TS 5.5, simple arrow functions like <code>x =&gt; x !== null</code> are <b>inferred as type predicates</b>, so <code>filter</code> finally removes <code>null</code> from the array type.</p>`, code: `function show(v: string | number): string {
  const isText = typeof v === "string"; // aliased condition
  return isText ? v.toUpperCase() : v.toFixed(1);
}
const raw = ["a", null, "b", null];        // (string | null)[]
const clean = raw.filter((x) => x !== null); // string[] (TS 5.5+ inferred predicate)
console.log(show("hi"), clean.join(""));` }
    ],
    deepDive: `<p><b>Control-flow analysis (CFA) under the hood.</b> The checker builds a <b>flow graph</b> of your function; each reference to a variable asks "what is the narrowed type at this node?" by walking backwards through conditions, assignments and returns, merging (union-ing) types at join points. That is why <code>return</code>, <code>throw</code>, <code>continue</code> and assertion functions all narrow the code <i>after</i> them. CFA only tracks <b>references</b> it can identify: local variables, parameters, <code>readonly</code>-ish property paths like <code>obj.a.b</code> (reset when any part is assigned or a function is called that could mutate it — in practice TS is optimistic and does <i>not</i> invalidate on function calls, a known unsoundness).</p>
<p><b>What counts as a discriminant.</b> A property whose type in each member is a <b>unit/literal</b> type (string, number or boolean literal, <code>null</code>, <code>undefined</code>). Destructuring keeps the link: <code>const { kind, ...rest } = s</code> then <code>if (kind === "a")</code> narrows <code>rest</code> (TS 4.6+, for <code>const</code> destructuring). <code>switch (true)</code> narrowing works since TS 5.3.</p>
<p><b>Predicates vs assertions vs <code>satisfies never</code>.</b> A predicate returns <code>boolean</code> and narrows in the true/false branches; an assertion function returns <code>void</code> and narrows everything after the call (it must be called through an explicitly typed reference — a common "assertions require every name in the call target to be declared with an explicit type annotation" error). For exhaustiveness without a helper, <code>default: s satisfies never;</code> works too, but <code>assertNever</code> also throws at runtime for data that slipped past the types (e.g. a newer server sending a new kind).</p>
<p><b><code>in</code> narrowing details.</b> Since TS 4.9, <code>"key" in obj</code> on an object not known to have <code>key</code> narrows it to <code>obj &amp; Record&lt;"key", unknown&gt;</code>, which is what makes hand-written <code>unknown</code> validators readable. <code>instanceof</code> only works for values with a runtime constructor — never for interfaces or type aliases — and can fail across realms (iframes, separate copies of a library in <code>node_modules</code>).</p>
<p><b>Production reality.</b> Most bugs at type boundaries come from <i>trusting</i> data: hand-written predicates drift from the type as fields are added. Teams increasingly derive both the type and the guard from one schema (Zod <code>safeParse</code>, Valibot, ArkType, or JSON Schema + codegen), and keep discriminated unions for internal state (Redux/useReducer actions, XState, API result types).</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate switch statements and type guards very quickly, and an exhaustive <code>never</code> check turns "did the AI handle every case?" from a code-review question into a compiler error. Asking for discriminated unions in prompts produces noticeably safer generated code than asking for "an object with optional fields".</p>
<p><b>Use AI as a partner:</b> <code>Rewrite this state type with optional fields as a discriminated union so impossible states cannot be represented, and add an assertNever default to every switch</code>. Or: <code>Write a type predicate for this interface and 6 test inputs that should fail it</code> — then run the tests, because generated predicates often check too little.</p>
<p><b>Where AI goes wrong:</b> using <code>as Circle</code> instead of narrowing, truthiness checks that skip 0/"", <code>instanceof</code> on interfaces (does not compile, or compiles against an unrelated class with the same name), predicates that only check one field, and <code>default: break</code> which silently swallows new cases.</p>
<p><b>What you must still own:</b> designing the union (which states exist and which combinations are impossible), deciding where runtime validation lives, and reading a narrowing error ("property does not exist on type ...") as information about your <i>model</i> rather than an obstacle to cast away.</p>`,
    problems: [{
      title: 'Narrowing Puzzle: Make "Forgot a Case" a Compile Error', level: 'Medium', tags: ['discriminated union', 'never', 'exhaustiveness', 'narrowing'], companies: ['Stripe', 'Uber', 'Google'],
      statement: `<p>A payment screen models its state with optional fields and boolean flags:</p>
<pre>interface PaymentState { loading: boolean; error?: string; receiptId?: string }</pre>
<p>Bugs keep shipping: screens showing a spinner <i>and</i> an error, or "paid" with no receipt. Redesign the type as a <b>discriminated union</b> with states <code>idle</code>, <code>processing</code>, <code>failed</code> (has <code>error</code>), <code>paid</code> (has <code>receiptId</code>), and write <code>render(state)</code> so that adding a new state later (e.g. <code>refunded</code>) produces a compile error until it is handled.</p>`,
      constraints: `No optional fields in the new type. No <code>as</code> casts. <code>render</code> returns a <code>string</code>. Use a <code>never</code>-based exhaustiveness check.`,
      example: `<p><code>render({ status: "failed", error: "Card declined" })</code> → ${H.c('g', '"Error: Card declined"')}. <code>{ status: "paid" }</code> without a <code>receiptId</code> → ${H.c('r', 'compile error')}. Adding <code>| { status: "refunded"; amount: number }</code> → ${H.c('r', 'compile error in render')} until a case is added.</p>`,
      brute: { why: `<p>The flags-and-optionals shape allows 2 × 2 × 2 = 8 combinations, but only 4 are valid. Every consumer must remember which combinations are "real", and the compiler cannot help: <code>state.receiptId!</code> assertions appear everywhere.</p>`, code: `interface PaymentState { loading: boolean; error?: string; receiptId?: string }

function render(s: PaymentState): string {
  if (s.loading) return "Processing...";
  if (s.error) return "Error: " + s.error;
  if (s.receiptId) return "Paid! Receipt " + s.receiptId;
  return "Ready";
}
// Nonsense state compiles fine: loading AND error AND receipt
console.log(render({ loading: true, error: "x", receiptId: "r1" }));` },
      mcq: { q: 'What type does <code>state</code> have in the <code>default</code> branch after handling all 4 statuses?', options: ['PaymentState', 'unknown', 'never', 'undefined'], answer: 2, explain: 'Each case removes one member from the union. With all members removed, the remaining type is the empty set: never.' },
      hints: [`<p>Hint 1: Give every state a literal <code>status</code> field and put each extra field <b>only</b> on the state that has it.</p>`, `<p>Hint 2: <code>switch (state.status)</code> narrows the whole object in each case. Write <code>assertNever(x: never): never</code> for the default.</p>`, `<p>Hint 3: Recipe: union of 4 object types → switch on status → one case each → <code>default: return assertNever(state)</code>. Test: add a 5th member and confirm the error appears.</p>`],
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(json) { try { return render(JSON.parse(json)); } catch (e) { return e.message; } }"},"cases":[[["{\"status\":\"idle\"}"],"Ready"],[["{\"status\":\"processing\"}"],"Processing..."],[["{\"status\":\"failed\",\"error\":\"Card declined\"}"],"Error: Card declined"],[["{\"status\":\"paid\",\"receiptId\":\"R-42\"}"],"Paid! Receipt R-42"],[["{\"status\":\"failed\",\"error\":\"\"}"],"Error: "],[["{\"status\":\"refunded\",\"amount\":5}"],"Unhandled state: {\"status\":\"refunded\",\"amount\":5}"],[["{\"status\":\"paid\",\"receiptId\":\"0\"}"],"Paid! Receipt 0"]]},
      solution: {
        approach: `<p>Make impossible states unrepresentable: one union member per real state, each carrying only its own data, tagged by a literal <code>status</code>. The switch narrows per case; after the last case the type is <code>never</code>, and <code>assertNever</code> both enforces exhaustiveness at compile time and throws on unexpected runtime data.</p>`,
        code: `type PaymentState =
  | { status: "idle" }
  | { status: "processing" }
  | { status: "failed"; error: string }
  | { status: "paid"; receiptId: string };

function assertNever(x: never): never {
  throw new Error("Unhandled state: " + JSON.stringify(x));
}

function render(state: PaymentState): string {
  switch (state.status) {
    case "idle":       return "Ready";
    case "processing": return "Processing...";
    case "failed":     return "Error: " + state.error;            // state: failed member
    case "paid":       return "Paid! Receipt " + state.receiptId; // state: paid member
    default:           return assertNever(state);                 // state: never
  }
}

console.log(render({ status: "failed", error: "Card declined" }));
console.log(render({ status: "paid", receiptId: "R-42" }));
// @ts-expect-error -- Property 'receiptId' is missing: impossible state rejected
render({ status: "paid" });`,
        dry: { head: ['case reached', 'state type inside', 'fields usable'], rows: [['"idle"', '{ status: "idle" }', 'status'], ['"failed"', '{ status: "failed"; error }', 'error'], ['"paid"', '{ status: "paid"; receiptId }', 'receiptId'], ['default', 'never', H.c('g', 'assertNever compiles')], ['default (after adding refunded)', '{ status: "refunded"; amount }', H.c('r', 'compile error')]] },
        complexity: `<p>O(1) per render. The union has 4 valid states instead of 8 combinations, so the number of cases to test goes down too.</p>`,
        followUps: ['How would you model a <code>retrying</code> state that keeps the previous error?', 'Write the same exhaustiveness check with <code>satisfies never</code>.', 'How does a <code>useReducer</code> action type benefit from the same pattern?']
      }
    }]
  });

  /* ================= TOPIC 5: Enums (and their modern alternatives) ================= */
  function parseEnum(s) {
    var txt = String(s).trim();
    var m = /^([A-Z][\w]*)\s*:\s*(.+)$/.exec(txt);
    var name = 'Direction', body = txt;
    if (m) { name = m[1]; body = m[2]; }
    var parts = body.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    if (!parts.length || parts.length > 6) throw new Error('Give 1 to 6 members, e.g.  Direction: Up, Down, Left = 10, Right');
    var out = [], next = 0, lastWasString = false;
    parts.forEach(function (p) {
      var mm = /^([A-Za-z_]\w*)\s*(=\s*(.+))?$/.exec(p);
      if (!mm) throw new Error('Members look like  Up  or  Left = 10  or  Red = "red"  (got ' + p + ')');
      var init = mm[3] ? mm[3].trim() : null, mem;
      if (init === null) {
        if (lastWasString) throw new Error('"' + mm[1] + '" needs an initializer: after a string member TS cannot auto-increment (that is a real TS error too)');
        mem = { key: mm[1], val: next, num: true, auto: true };
        next = next + 1;
      } else if (/^-?\d+$/.test(init)) {
        mem = { key: mm[1], val: Number(init), num: true }; next = Number(init) + 1; lastWasString = false;
      } else if (/^"[^"]*"$/.test(init) || /^'[^']*'$/.test(init)) {
        mem = { key: mm[1], val: init.slice(1, -1), num: false }; lastWasString = true;
      } else throw new Error('Initializers must be integers or "quoted strings" (got ' + init + ')');
      if (out.some(function (o) { return o.key === mem.key; })) throw new Error('Duplicate member ' + mem.key);
      out.push(mem);
    });
    return { name: name, members: out };
  }

  topics.push({
    title: 'Enums: Numeric, String, const enum — and the as const Alternative',
    analogy: `<p>An enum is like the <b>buttons on a lift</b>: a fixed, named set of choices — <i>Ground, 1, 2, Roof</i>. You press "Roof"; the lift's computer stores a number (say <b>3</b>). Numeric enums work exactly like that: friendly <b>names</b> for you, <b>numbers</b> underneath.</p>
<p>A <b>string enum</b> is a lift whose buttons store their own label ("ROOF") — easier to read in logs. And a <b>union of string literals</b> is a lift with no hidden computer at all: the label <i>is</i> the value, and the type checker simply refuses any button that does not exist.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>enum</code> declares a named group of constants. Unlike almost everything else in TypeScript, an enum is <b>not erased</b>: it produces a real JavaScript object at runtime.</p>
<pre>enum Direction { Up, Down, Left, Right }   // Up = 0, Down = 1, Left = 2, Right = 3
enum Status { Active = "ACTIVE", Banned = "BANNED" }</pre>
${H.table(['Kind', 'Values', 'Runtime object', 'Reverse mapping', 'Notes'], [['Numeric', '0, 1, 2… (auto-increment)', 'yes', H.c('y', 'yes: Direction[0] === "Up"'), 'any <code>number</code> variable is assignable (soundness hole)'], ['String', 'you write each one', 'yes', 'no', 'readable in logs/JSON; a plain "ACTIVE" string is <b>not</b> assignable'], ['<code>const enum</code>', 'inlined at use sites', H.c('g', 'no object'), 'no', 'breaks with <code>isolatedModules</code> across files'], ['Union of literals', '<code>"ACTIVE" | "BANNED"</code>', 'none', '—', 'fully erased; most common in modern code'], ['<code>as const</code> object', '<code>{ Active: "ACTIVE" } as const</code>', 'plain object', '—', 'enum-like dot access + derived union type']])}
<p>🔵 <b>An enum is both a value and a type.</b> <code>Direction.Up</code> is a value; <code>Direction</code> as a type means "one of the members". Numeric enums also get a <b>reverse mapping</b>: <code>Direction[0]</code> gives <code>"Up"</code>. That is why <code>Object.keys(Direction)</code> returns <b>8</b> keys for 4 members — a classic bug when building dropdowns.</p>
<p>🟣 <b>Why many teams now avoid enums.</b> (1) They are one of the few TS features that <b>generate code</b>, so tools that just <i>strip</i> types (Node.js native TypeScript support, the <code>erasableSyntaxOnly</code> flag added in TS 5.8) reject them. (2) Numeric enums accept any number. (3) <code>const enum</code> does not work well with single-file compilers. The modern alternative gives you the same ergonomics:</p>
<pre>const Status = { Active: "ACTIVE", Banned: "BANNED" } as const;
type Status = (typeof Status)[keyof typeof Status];   // "ACTIVE" | "BANNED"</pre>
<p>Enums are still perfectly valid and widely used (Angular, NestJS, many backends). Know both, pick one per codebase, and know the trade-offs — that is what interviewers want to hear.</p>`,
    clues: ['"Fixed set of named constants" (roles, directions, log levels) → enum or union of literals', '"Why does Object.keys on my enum return twice as many items?" → numeric enum reverse mapping', '"Node / esbuild says enums are not supported" → erasableSyntaxOnly / type stripping; use as const objects', '"Compare enums vs union types" → runtime object vs zero-cost, nominal-ish vs structural', '"const enum and isolatedModules" → inlining needs cross-file type info; avoid in libraries', '"Type string is not assignable to type Status" → string enums only accept their own members'],
    code: [{ title: 'Numeric, string, const enums and the as const alternative', code: `
// Numeric enum: auto-increments from 0, has a reverse mapping
enum Direction { Up, Down, Left, Right }
console.log(Direction.Up, Direction[0]);          // 0 "Up"

// String enum: every member needs a value, no reverse mapping
enum Role { Admin = "ADMIN", Editor = "EDITOR", Viewer = "VIEWER" }
function canEdit(r: Role): boolean {
  return r === Role.Admin || r === Role.Editor;
}
console.log(canEdit(Role.Viewer));                  // false
// @ts-expect-error -- Argument of type '"ADMIN"' is not assignable to parameter of type 'Role'
canEdit("ADMIN");

// const enum: no runtime object, values are inlined where used
const enum Flag { None = 0, Bold = 1, Italic = 2 }
const style = Flag.Bold | Flag.Italic;             // emitted as: 1 | 2
console.log(style);

// Modern alternative: a plain object 'as const' + a derived union type
const LogLevel = { Debug: "debug", Info: "info", Error: "error" } as const;
type LogLevel = (typeof LogLevel)[keyof typeof LogLevel]; // "debug" | "info" | "error"
function log(level: LogLevel, msg: string): string {
  return "[" + level + "] " + msg;
}
console.log(log(LogLevel.Info, "started"), log("error", "plain strings work too"));
// Iterating is predictable: exactly 3 values, no reverse-mapping surprises
console.log(Object.values(LogLevel));
` }, { lang: 'js', run: true, title: 'What the numeric and string enums compile to (runnable JS)', code: `
// tsc output for: enum Direction { Up, Down, Left, Right }
var Direction;
(function (Direction) {
  Direction[Direction["Up"] = 0] = "Up";      // sets Up -> 0 AND 0 -> "Up"
  Direction[Direction["Down"] = 1] = "Down";
  Direction[Direction["Left"] = 2] = "Left";
  Direction[Direction["Right"] = 3] = "Right";
})(Direction || (Direction = {}));

// tsc output for: enum Role { Admin = "ADMIN", Viewer = "VIEWER" }
var Role;
(function (Role) {
  Role["Admin"] = "ADMIN";                    // string members: one direction only
  Role["Viewer"] = "VIEWER";
})(Role || (Role = {}));

console.log(Object.keys(Direction));          // 8 keys: "0","1","2","3","Up","Down","Left","Right"
console.log(Object.keys(Role));               // 2 keys
// Getting only the names of a numeric enum:
console.log(Object.keys(Direction).filter((k) => isNaN(Number(k))));
` }],
    codeTitle: ['TypeScript enums and alternatives', 'Emitted JavaScript (runnable)'],
    viz: {
      title: 'What does this enum become at runtime?',
      input: 'Direction: Up, Down, Left = 10, Right',
      inputLabel: 'EnumName: members (e.g. Up, Down = 5  or  Red = "r", Green = "g")',
      gen: function (input) {
        var e = parseEnum(input), N = e.name, frames = [];
        var tsCode = 'enum ' + N + ' {\n' + e.members.map(function (m) { return '  ' + m.key + (m.auto ? '' : ' = ' + (m.num ? m.val : '"' + m.val + '"')) + ','; }).join('\n') + '\n}';
        var jsLines = ['var ' + N + ';', '(function (' + N + ') {'];
        e.members.forEach(function (m) {
          jsLines.push(m.num ? '  ' + N + '[' + N + '["' + m.key + '"] = ' + m.val + '] = "' + m.key + '";' : '  ' + N + '["' + m.key + '"] = "' + m.val + '";');
        });
        jsLines.push('})(' + N + ' || (' + N + ' = {}));');
        var js = jsLines.join('\n');
        var hasNum = e.members.some(function (m) { return m.num; });
        frames.push(fr('Your TypeScript enum. ' + e.members.filter(function (m) { return m.auto; }).map(function (m) { return '<code>' + m.key + '</code> gets <b>' + m.val + '</b> automatically'; }).join(', ') + (e.members.some(function (m) { return m.auto; }) ? ' (numeric members count up from 0, or from the previous number + 1).' : 'Every member has an explicit value.'), [cp(tsCode, {}, 'TypeScript source'), { type: 'table', label: 'Members', columns: ['name', 'value', 'kind'], rows: e.members.map(function (m) { return [m.key, m.num ? m.val : '"' + m.val + '"', m.num ? (m.auto ? 'numeric (auto)' : 'numeric') : 'string']; }) }]));
        frames.push(fr('Unlike interfaces or unions, an enum is <b>not erased</b>. The compiler emits a JavaScript object, built inside an IIFE (a function that runs immediately). <code>' + N + ' || (' + N + ' = {})</code> lets two declarations of the same enum add to one object.', [cp(js, (function () { var h = { 1: 'cur', 2: 'cur' }; h[3 + e.members.length] = 'cur'; return h; })(), 'Emitted JavaScript', 'js'), { type: 'map', label: 'Runtime object ' + N, entries: [] }]));
        var entries = [];
        e.members.forEach(function (m, i) {
          var hl = {}; var line = {}; line[3 + i] = 'cur';
          for (var k = 0; k < i; k++) line[3 + k] = 'done';
          entries.push([m.key, m.num ? m.val : '"' + m.val + '"']); hl[m.key] = 'ok';
          var narr;
          if (m.num) {
            entries.push([String(m.val), '"' + m.key + '"']); hl[String(m.val)] = 'sel';
            narr = '<code>' + N + '["' + m.key + '"] = ' + m.val + '</code> stores the forward entry <b>and returns ' + m.val + '</b>, which is then used as a key: <code>' + N + '[' + m.val + '] = "' + m.key + '"</code>. That second entry is the <b>reverse mapping</b> — two keys per numeric member.';
          } else {
            narr = 'String member: only <code>' + N + '["' + m.key + '"] = "' + m.val + '"</code>. No reverse mapping (it could collide with other keys), so just <b>one</b> key.';
          }
          frames.push(fr(narr, [cp(js, line, 'Emitted JavaScript', 'js'), { type: 'map', label: 'Runtime object ' + N, entries: entries.slice(), hl: hl }]));
        });
        var keys = entries.map(function (x) { return x[0]; });
        frames.push(fr('Final object has <b>' + keys.length + '</b> keys for ' + e.members.length + ' members. ' + (hasNum ? 'So <code>Object.keys(' + N + ')</code> or a <code>for…in</code> loop over a numeric enum returns both names <i>and</i> numbers — the classic "my dropdown shows 0, 1, 2" bug. Filter with <code>isNaN(Number(k))</code> to keep only names.' : 'With only string members, iterating gives exactly the names you wrote.'), [{ type: 'set', label: 'Object.keys(' + N + ')', items: keys, hl: (function () { var h = {}; keys.forEach(function (k) { h[k] = /^-?\d+$/.test(k) ? 'bad' : 'ok'; }); return h; })() }, vp({ members: e.members.length, 'runtime keys': keys.length }, { 'runtime keys': keys.length > e.members.length ? 'bad' : 'ok' }, 'Count')]));
        var first = e.members[0];
        frames.push(fr('At the <b>type</b> level: ' + (first.num ? 'a numeric enum accepts <b>any number</b> stored in a <code>number</code> variable (<code>const d: ' + N + ' = someNumber</code> compiles), though out-of-range literals like <code>99</code> are rejected since TS 5.0.' : 'a string enum is <b>not</b> assignable from a plain string: <code>const x: ' + N + ' = "' + first.val + '"</code> is an error — you must write <code>' + N + '.' + first.key + '</code>.'), [{ type: 'table', label: 'Assignability', columns: ['code', 'result'], rows: first.num ? [['const a: ' + N + ' = ' + N + '.' + first.key, '✔ ok'], ['const n: number = 7; const b: ' + N + ' = n;', '✔ compiles (soundness hole)'], ['const c: ' + N + ' = 99', '✘ error (TS 5.0+)']] : [['const a: ' + N + ' = ' + N + '.' + first.key, '✔ ok'], ['const b: ' + N + ' = "' + first.val + '"', '✘ error: not assignable'], ['const s: string = ' + N + '.' + first.key, '✔ ok (enum → string is fine)']], hl: first.num ? { 0: 'ok', 1: 'win', 2: 'bad' } : { 0: 'ok', 1: 'bad', 2: 'ok' } }]));
        var alt = 'const ' + N + ' = {\n' + e.members.map(function (m) { return '  ' + m.key + ': ' + (m.num ? m.val : '"' + m.val + '"') + ','; }).join('\n') + '\n} as const;\ntype ' + N + ' = (typeof ' + N + ')[keyof typeof ' + N + '];';
        frames.push(fr('The <b>erasable alternative</b>: a plain object with <code>as const</code> plus a type of the same name. Dot access (<code>' + N + '.' + first.key + '</code>) still works, there is no reverse mapping, and Node\'s type stripping / <code>erasableSyntaxOnly</code> are happy because the only TypeScript left is the type annotation, which is simply deleted.', [cp(alt, {}, 'as const object + derived union'), vp((function () { var o = {}; o['type ' + N] = e.members.map(function (m) { return m.num ? m.val : '"' + m.val + '"'; }).join(' | '); return o; })(), {}, 'Derived type')]));
        frames.push(fr('And a <code>const enum</code>? The object disappears entirely: <code>' + N + '.' + first.key + '</code> is replaced by <code>' + (first.num ? first.val : '"' + first.val + '"') + ' /* ' + first.key + ' */</code> at each use. Fast and small, but the compiler needs to see the enum\'s file while compiling yours, which single-file tools (esbuild, swc, Babel, <code>isolatedModules</code>) cannot do.', [cp('const enum ' + N + ' { ' + e.members.map(function (m) { return m.key + (m.auto ? '' : ' = ' + (m.num ? m.val : '"' + m.val + '"')); }).join(', ') + ' }\nconst x = ' + N + '.' + first.key + ';', { 2: 'cur' }, 'TypeScript'), cp('const x = ' + (first.num ? first.val : '"' + first.val + '"') + ' /* ' + first.key + ' */;', { 1: 'ok' }, 'Emitted JavaScript (no object!)', 'js')]));
        return frames;
      }
    },
    examples: [
      { title: 'Turning an enum into a dropdown (the right way)', html: `<p>For a <b>string</b> enum, <code>Object.values</code> is clean. For a <b>numeric</b> enum, filter out the reverse-mapped number keys first. Better still, use the <code>as const</code> pattern where iteration has no surprises.</p>`, code: `enum Size { Small, Medium, Large }
const sizeNames = Object.keys(Size).filter((k) => isNaN(Number(k))); // ["Small","Medium","Large"]
const sizeValues = sizeNames.map((k) => Size[k as keyof typeof Size]); // [0, 1, 2]

const Theme = { Light: "light", Dark: "dark" } as const;
const themeOptions = Object.values(Theme); // ("light" | "dark")[]
console.log(sizeNames, sizeValues, themeOptions);` },
      { title: 'Bit flags: where numeric enums shine', html: `<p>Numeric enums with powers of two make readable <b>bit flags</b>. Combine with <code>|</code>, test with <code>&amp;</code>. (This is also where "any number is assignable" is useful: <code>Perm.Read | Perm.Write</code> is 3, which is not a member but still a valid <code>Perm</code>.)</p>`, code: `enum Perm { None = 0, Read = 1 << 0, Write = 1 << 1, Exec = 1 << 2 }
const mine: Perm = Perm.Read | Perm.Write;     // 3
const canWrite = (mine & Perm.Write) !== 0;    // true
const canExec = (mine & Perm.Exec) !== 0;      // false
console.log(mine, canWrite, canExec);` },
      { title: 'keyof typeof Enum: going from names to values', html: `<p><code>typeof Role</code> is the type of the runtime enum <b>object</b>; <code>keyof typeof Role</code> is the union of its member <b>names</b>. This is how you safely turn a string from a URL or config into an enum member.</p>`, code: `enum Role { Admin = "ADMIN", Viewer = "VIEWER" }
type RoleName = keyof typeof Role; // "Admin" | "Viewer"

function parseRole(name: string): Role | undefined {
  // runtime check that the key exists, then a safe lookup
  return name in Role ? Role[name as RoleName] : undefined;
}
console.log(parseRole("Admin"), parseRole("Root"));` },
      { title: 'Why does this not compile? Comparing two different enums', html: `<p>Enums are compared by <b>declaration</b>, not just value: even if <code>A.X</code> and <code>B.X</code> are both <code>"x"</code>, TS says the comparison "appears to be unintentional because the types have no overlap". That is a feature — it catches mixing up two unrelated sets of constants.</p>`, code: `enum A { X = "x" }
enum B { X = "x" }
function same(a: A, b: B): boolean {
  // @ts-expect-error -- This comparison appears to be unintentional because the types 'A' and 'B' have no overlap
  return a === b;
}
console.log(same(A.X, B.X));` }
    ],
    deepDive: `<p><b>Enum typing internals.</b> Since TS 5.0 all enums are <b>union enums</b>: each member gets its own literal-like type (<code>Direction.Up</code>), and <code>Direction</code> is the union of them, so narrowing and exhaustiveness checks work exactly as with literal unions. Members can be <b>computed</b> (<code>Big = 1 &lt;&lt; 10</code>, or referencing other constants); a non-constant computed member (e.g. a function call) makes later members require explicit initializers.</p>
<p><b>Nominal-ish behaviour.</b> Enums are the one place TypeScript is partly nominal: two enums with identical members are not interchangeable, and a string enum does not accept matching string literals. Numeric enums, however, accept any <code>number</code>-typed value (for bit flags), while literal numbers outside the member set are rejected since 5.0.</p>
<p><b><code>const enum</code> pitfalls.</b> Inlining requires the compiler to read the declaring file. Under <code>isolatedModules</code> (required by esbuild, swc, Babel, Vite, and implied by <code>verbatimModuleSyntax</code>) TS errors when you reference an <i>ambient</i> const enum from another file, and libraries that ship <code>const enum</code> in <code>.d.ts</code> files break consumers. <code>preserveConstEnums</code> keeps the object around as a compromise. Rule: never export <code>const enum</code> from a library.</p>
<p><b>Erasable-only TypeScript.</b> TS 5.8 added <code>erasableSyntaxOnly</code>, which errors on syntax that needs code generation: <code>enum</code>, <code>namespace</code> with values, parameter properties (<code>constructor(public x: number)</code>), and <code>import x = require()</code>. Node.js runs <code>.ts</code> by <b>stripping</b> types (replacing them with whitespace, so line/column positions survive) and refuses those constructs unless you opt into its transform mode. That is the strongest practical reason new codebases prefer <code>as const</code> objects and literal unions.</p>
<p><b>Size and speed.</b> Each regular enum costs a small IIFE and an object lookup; negligible for apps, noticeable only in hot loops or huge generated enums. A union of literals costs nothing at runtime, and a frozen <code>as const</code> object is as fast as any object property read.</p>`,
    aiEra: `<p><b>What AI changes:</b> code generators reach for <code>enum</code> by habit (lots of older training data), and also by habit write <code>Object.keys(MyEnum)</code> for dropdowns — reproducing the reverse-mapping bug. Knowing what an enum compiles to lets you catch both instantly.</p>
<p><b>Use AI as a partner:</b> <code>Convert every enum in this package to an as-const object plus a derived union type, keep the same names so call sites do not change, and list any place that relied on reverse mapping</code>. Or ask it to <code>add erasableSyntaxOnly to tsconfig and fix every error</code> when moving to Node's native TypeScript support.</p>
<p><b>Where AI goes wrong:</b> mixing string and numeric members (heterogeneous enums), exporting <code>const enum</code> from a library, comparing enum values to raw strings with a cast, and claiming enums are "erased like other types".</p>
<p><b>What you must still own:</b> the codebase-wide decision (enum vs union vs as-const object), knowing which build tools you use and whether they support enums, and the migration plan if you change your mind.</p>`,
    problems: [{
      title: 'The Dropdown Shows "0, 1, 2, Low, Medium, High"', level: 'Medium', tags: ['enums', 'reverse mapping', 'as const', 'keyof typeof'], companies: ['Microsoft', 'Salesforce', 'Adobe'],
      statement: `<p>A settings page builds a priority dropdown from a numeric enum:</p>
<pre>enum Priority { Low, Medium, High }
const options = Object.keys(Priority).map((k) =&gt; ({ label: k }));</pre>
<p>Users see six options. (1) Explain why. (2) Fix it with a helper <code>enumNames</code> that works for any numeric enum. (3) Rewrite <code>Priority</code> as an <code>as const</code> object so the problem cannot happen and the code is erasable (works with Node type stripping), keeping <code>Priority.High</code> call sites unchanged.</p>`,
      constraints: `No <code>any</code>. The derived type must be <code>0 | 1 | 2</code> (or names, your choice — explain). Existing code <code>Priority.High</code> must still compile.`,
      example: `<p>Before: ${H.c('r', '["0","1","2","Low","Medium","High"]')}. After: ${H.c('g', '["Low","Medium","High"]')}. Why: the emitted JS sets both <code>Priority["Low"] = 0</code> and <code>Priority[0] = "Low"</code>.</p>`,
      brute: { why: `<p>Hard-coding the list "fixes" the dropdown but creates a second source of truth. Add <code>Urgent</code> to the enum and the dropdown silently misses it.</p>`, code: `enum Priority { Low, Medium, High }
// Hard-coded copy: drifts as soon as the enum changes
const options = ["Low", "Medium", "High"].map((k) => ({ label: k }));
console.log(options.length, Priority.High);` },
      mcq: { q: 'How many keys does <code>Object.keys</code> return for <code>enum Priority { Low, Medium, High }</code>?', options: ['3', '6', '0', '4'], answer: 1, explain: 'Each numeric member creates a forward key (name → number) and a reverse key (number → name).' },
      hints: [`<p>Hint 1: Picture the emitted IIFE: <code>Priority[Priority["Low"] = 0] = "Low"</code>. Which keys end up on the object?</p>`, `<p>Hint 2: Reverse-mapped keys are numeric strings. <code>isNaN(Number(k))</code> keeps only the names.</p>`, `<p>Hint 3: For the erasable version: <code>const Priority = { Low: 0, Medium: 1, High: 2 } as const;</code> and <code>type Priority = (typeof Priority)[keyof typeof Priority];</code> — same name for value and type, so call sites do not change.</p>`],
      tests: {"sig":"string int -> string","fn":"chk","harness":{"js":"\nenum Sparse { A = -1, B = 5, C = 0 }\nenum Empty {}\nfunction chk(kind, n) {\n  if (kind === 'names') return enumNames(PriorityEnum);\n  if (kind === 'rawKeys') return Object.keys(PriorityEnum);\n  if (kind === 'label') return label(n);\n  if (kind === 'options') return Object.keys(Priority);\n  if (kind === 'sparse') return enumNames(Sparse);\n  if (kind === 'empty') return enumNames(Empty);\n  if (kind === 'values') return [Priority.Low, Priority.Medium, Priority.High];\n}"},"cases":[[["names",0],["Low","Medium","High"]],[["rawKeys",0],["0","1","2","Low","Medium","High"]],[["label",0],"Low"],[["label",1],"Medium"],[["label",2],"High"],[["label",5],"Unknown"],[["label",-1],"Unknown"],[["options",0],["Low","Medium","High"]],[["sparse",0],["A","B","C"]],[["empty",0],[]],[["values",0],[0,1,2]]]},
      solution: {
        approach: `<p>Numeric enums emit a two-way object, so iteration sees both directions. A generic helper filters numeric keys for any numeric enum. The long-term fix is an <code>as const</code> object: identical dot-access syntax, a derived literal union type, no reverse mapping, and fully erasable.</p>`,
        code: `// (2) Generic helper for any numeric enum object
function enumNames(e: Record<string, string | number>): string[] {
  return Object.keys(e).filter((k) => isNaN(Number(k)));
}
enum PriorityEnum { Low, Medium, High }
console.log(enumNames(PriorityEnum)); // ["Low", "Medium", "High"]

// (3) Erasable replacement: same name for the value and the type
const Priority = { Low: 0, Medium: 1, High: 2 } as const;
type Priority = (typeof Priority)[keyof typeof Priority]; // 0 | 1 | 2

function label(p: Priority): string {
  // find the name for a value (reverse lookup done explicitly)
  const entry = Object.entries(Priority).find(([, v]) => v === p);
  return entry ? entry[0] : "Unknown";
}

const options = Object.keys(Priority).map((k) => ({ label: k })); // exactly 3
const current: Priority = Priority.High; // call sites unchanged
console.log(options.length, label(current));
// @ts-expect-error -- Type '5' is not assignable to type 'Priority'
const wrong: Priority = 5;`,
        dry: { head: ['step', 'keys on object', 'dropdown size'], rows: [['enum Priority (numeric)', '0,1,2,Low,Medium,High', H.c('r', '6')], ['enumNames(enum)', 'Low,Medium,High', H.c('g', '3')], ['as const object', 'Low,Medium,High', H.c('g', '3')], ['Priority.High', 'value 2, type 2', H.c('g', 'compiles')]] },
        complexity: `<p>O(k) to list k members. The as-const object has no IIFE and no reverse keys; the type is erased completely.</p>`,
        followUps: ['Make the dropdown values strongly typed: <code>{ label: keyof typeof Priority; value: Priority }[]</code>.', 'Why does <code>enumNames</code> take <code>Record&lt;string, string | number&gt;</code> and not a generic?', 'How would you keep string labels for the UI and numbers for the API?']
      }
    }]
  });

  /* ================= TOPIC 6: Generics basics ================= */
  function membersOf(t) {
    if (/\)\[\]$/.test(t)) return t.slice(1, -3).split(' | ');
    if (/\[\]$/.test(t)) return [t.slice(0, -2)];
    return [t];
  }
  function elemCandidate(n) {
    /* candidate for T from an argument of type T[] */
    if (n.k !== 'array') return null;
    if (!n.items.length) return [];
    var w = widen(n);
    return membersOf(w).map(function (x) { return x === 'any (evolving)' ? 'null' : x; });
  }
  function valCandidate(n) {
    if (n.k === 'null' || n.k === 'undefined') return [n.k];
    return [widen(n)];
  }

  topics.push({
    title: 'Generics Basics: Type Parameters, Inference & Constraints',
    analogy: `<p>A <b>generic</b> is like a <b>labelled storage box from a shop</b> that says "<i>holds ___</i>". The box design is the same whether you fill it with shoes or books, but once <b>you</b> put shoes in, the label reads "holds shoes" — and whoever opens it later <b>knows</b> they will find shoes, not "some stuff".</p>
<p>A <b>constraint</b> is a rule printed on the box: "<i>holds ___ — must fit in 30 cm</i>". You still choose what goes in, but only things that meet the rule.</p>`,
    explain: `<p>🟢 <b>The problem generics solve.</b> Write a function that returns the first item of an array. With <code>any</code> you lose all type information; with <code>number[]</code> it only works for numbers:</p>
${H.table(['Signature', 'first(["a","b"]) returns', 'Problem'], [['<code>(arr: any[]) =&gt; any</code>', '<code>any</code>', H.c('r', 'typos on the result are never caught')], ['<code>(arr: number[]) =&gt; number</code>', H.c('r', 'compile error'), 'not reusable'], ['<code>(arr: unknown[]) =&gt; unknown</code>', '<code>unknown</code>', H.c('y', 'safe but useless — caller must re-check')], ['<code>&lt;T&gt;(arr: T[]) =&gt; T | undefined</code>', H.c('g', '<code>string | undefined</code>'), H.c('g', 'reusable AND precise')]])}
<p>A <b>type parameter</b> (<code>T</code>) is a <b>variable for a type</b>. It connects the input type to the output type: "whatever type of array you give me, I return that type of element".</p>
<pre>function first&lt;T&gt;(arr: T[]): T | undefined { return arr[0]; }
first([10, 20]);        // T inferred as number
first&lt;string&gt;(["a"]);   // T given explicitly</pre>
<p>🔵 <b>Inference does the work.</b> You rarely write <code>&lt;string&gt;</code> at the call; TS looks at the arguments and solves for <code>T</code>. You write explicit type arguments only when TS cannot see them (e.g. <code>new Map&lt;string, number&gt;()</code>, <code>useState&lt;User | null&gt;(null)</code>).</p>
<p><b>Generic types</b> work the same way: <code>Array&lt;T&gt;</code>, <code>Promise&lt;T&gt;</code>, <code>Map&lt;K, V&gt;</code>, <code>Record&lt;K, V&gt;</code>, or your own <code>interface ApiResponse&lt;T&gt; { data: T; error: string | null }</code>.</p>
<p>🟣 <b>Constraints</b> with <code>extends</code> say what <code>T</code> must at least have: <code>&lt;T extends { length: number }&gt;</code> accepts strings, arrays and anything with a <code>length</code>. The most common constraint is <code>K extends keyof T</code> — "K must be one of T's property names" — which lets <code>getProp(user, "name")</code> return exactly <code>string</code>. You can also give <b>defaults</b>: <code>interface Box&lt;T = string&gt;</code>.</p>
<p><b>Golden rule:</b> a type parameter should appear <b>at least twice</b> (e.g. in a parameter and the return type). If it appears only once, you do not need a generic — use the constraint type directly.</p>`,
    clues: ['"Make this function work for any type but keep the return type precise" → generic type parameter', '"Return type is any / unknown and callers have to cast" → missing generic', '"Get a property by name in a type-safe way" → K extends keyof T, return T[K]', '"Container / wrapper / API response for any payload" → generic interface ApiResponse&lt;T&gt;', '"Only accept things with an id / length" → generic constraint extends', '"Why is T inferred as string | number when I wanted an error?" → inference from multiple candidates; NoInfer or explicit type args', '"Typed stack / queue / cache class" → generic class'],
    code: [{ title: 'Generic functions, types, classes and constraints', code: `
// 1) Generic function: T links input and output
function first<T>(arr: readonly T[]): T | undefined {
  return arr[0];
}
const n = first([10, 20]);      // number | undefined
const s = first(["a", "b"]);    // string | undefined

// 2) Two type parameters
function pair<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}
const p = pair("age", 42);      // [string, number]

// 3) Constraint: T must have a length
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
longest("hello", "hi");         // string
longest([1, 2, 3], [4]);        // number[]
// @ts-expect-error -- number does not have a 'length' property
longest(10, 20);

// 4) keyof constraint: type-safe property access
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 7, name: "Ada", admin: true };
const nm = getProp(user, "name");   // string
const ad = getProp(user, "admin");  // boolean
// @ts-expect-error -- "email" is not a key of user
getProp(user, "email");

// 5) Generic interface with a default type argument
interface ApiResponse<T = unknown> {
  data: T;
  error: string | null;
}
const res: ApiResponse<{ token: string }> = { data: { token: "abc" }, error: null };

// 6) Generic class
class Stack<T> {
  private items: T[] = [];
  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
  get size(): number { return this.items.length; }
}
const st = new Stack<number>();
st.push(1);
// @ts-expect-error -- Argument of type 'string' is not assignable to parameter of type 'number'
st.push("two");

console.log(n, s, p, nm, ad, res.data.token, st.pop(), st.size);
` }, { title: 'Generic arrow functions in .ts vs .tsx files', code: `
// In a .ts file you can write: const identity = <T>(x: T): T => x;
// In a .tsx file "<T>" looks like a JSX tag, so add a trailing comma:
const identity = <T,>(x: T): T => x;
// Or use a constraint, which is also unambiguous:
const toArray = <T extends unknown>(x: T): T[] => [x];
console.log(identity("ok"), toArray(3));
` }],
    codeTitle: ['Generics in functions, interfaces and classes', 'Generic arrow syntax gotcha'],
    viz: [{
      title: 'Watch TypeScript infer T: firstOr<T>(items: T[], fallback: T)',
      input: '[1, 2, 3] / 0',
      inputLabel: 'items / fallback   (try  ["a"] / 0   or   [1, 2] / null   or   [] / "x")',
      gen: function (input) {
        var halves = String(input).split(' / ');
        if (halves.length !== 2) throw new Error('Write items and fallback separated by " / " (space slash space), e.g. [1, 2] / 0');
        var items = parseLit(halves[0]), fb = parseLit(halves[1]);
        if (items.k !== 'array') throw new Error('The first value must be an array, e.g. [1, 2, 3]');
        var call = 'firstOr(' + showVal(items) + ', ' + showVal(fb) + ')';
        var code = 'function firstOr<T>(items: T[], fallback: T): T {\n  return items.length > 0 ? items[0] : fallback;\n}\n\nconst r = ' + call + ';';
        var frames = [];
        var c1 = elemCandidate(items), c2 = valCandidate(fb);
        frames.push(fr('A generic function with one type parameter <code>T</code>, used <b>three</b> times: in both parameters and in the return type. That is what ties them together. Now we call it without writing <code>&lt;…&gt;</code> — TS must work out <code>T</code> itself.', [cp(code, { 1: 'cur', 5: 'cur' }), vp({ T: '? (to be inferred)' }, { T: 'cur' }, 'Type parameters')]));
        frames.push(fr('Step 1 — match <code>' + esc(showVal(items)) + '</code> against <code>T[]</code>. ' + (c1.length ? 'The array\'s element type is <code>' + esc(c1.join(' | ')) + '</code>, so that is a <b>candidate</b> for T.' : 'The array is <b>empty</b>, so it says nothing about T (no candidate).'), [cp(code, { 1: 'cur', 5: 'cur' }), { type: 'table', label: 'Inference candidates for T', columns: ['from argument', 'matched against', 'candidate'], rows: [['items = ' + showVal(items), 'T[]', c1.length ? c1.join(' | ') : '(none)']], hl: { 0: 'cur' } }]));
        var rows2 = [['items = ' + showVal(items), 'T[]', c1.length ? c1.join(' | ') : '(none)'], ['fallback = ' + showVal(fb), 'T', c2.join(' | ')]];
        frames.push(fr('Step 2 — match <code>' + esc(showVal(fb)) + '</code> against <code>T</code>. Literals are widened (TS does not assume you meant only that exact value), giving candidate <code>' + esc(c2.join(' | ')) + '</code>.', [cp(code, { 1: 'cur', 5: 'cur' }), { type: 'table', label: 'Inference candidates for T', columns: ['from argument', 'matched against', 'candidate'], rows: rows2, hl: { 1: 'cur' } }]));
        var T, err = null, why;
        var nul = c2[0] === 'null' || c2[0] === 'undefined';
        function subset(a, b) { return a.every(function (x) { return b.indexOf(x) >= 0; }); }
        if (!c1.length) { T = c2.join(' | '); why = 'Only one candidate exists, so T = <code>' + esc(T) + '</code>.'; }
        else if (subset(c2, c1)) { T = c1.join(' | '); why = 'The fallback candidate already fits inside <code>' + esc(c1.join(' | ')) + '</code>, so that is T.'; }
        else if (nul) { T = c1.join(' | ') + ' | ' + c2[0]; why = '<code>' + c2[0] + '</code> is special: with <code>strictNullChecks</code> TS simply <b>adds</b> it to the other candidate, giving <code>' + esc(T) + '</code>. No error — but the result may now be null!'; }
        else if (subset(c1, c2)) { T = c2.join(' | '); why = 'The array candidate fits inside the fallback candidate, so T is the wider one.'; }
        else { T = c1.join(' | '); err = 'Argument of type \'' + c2.join(' | ') + '\' is not assignable to parameter of type \'' + T + '\''; why = 'The candidates <b>disagree</b> and neither contains the other. TS does <b>not</b> invent a union; it picks the first candidate (<code>' + esc(T) + '</code>) and reports an error on the other argument. That is usually what you want — mixing types is often a bug.'; }
        frames.push(fr('Step 3 — combine the candidates. ' + why, [{ type: 'table', label: 'Inference candidates for T', columns: ['from argument', 'matched against', 'candidate'], rows: rows2, hl: { 0: 'win', 1: 'win' } }, vp({ T: T }, { T: err ? 'bad' : 'ok' }, 'Type parameters')]));
        var sub = code.replace(/T\[\]/, '(' + T + ')[]').replace('fallback: T', 'fallback: ' + T).replace('): T {', '): ' + T + ' {').replace('<T>', '');
        if (err) {
          frames.push(fr(H.c('r', 'Compile error') + ' on the fallback argument: <i>' + esc(err) + '</i>. If mixing really is intended, say so explicitly: <code>firstOr&lt;' + esc(c1.concat(c2).join(' | ')) + '&gt;(…)</code>.', [cp(code, { 5: 'bad' }), vp({ T: T, error: err }, { error: 'bad' }, 'Compiler says')]));
          frames.push(fr('With an <b>explicit type argument</b> there is nothing to infer: T is exactly what you wrote, and both arguments fit. Explicit type arguments are the escape hatch when inference picks something you did not intend.', [cp('const r = firstOr<' + c1.concat(c2).join(' | ') + '>(' + showVal(items) + ', ' + showVal(fb) + ');', { 1: 'ok' }), vp({ T: c1.concat(c2).join(' | '), 'type of r': c1.concat(c2).join(' | ') }, { T: 'ok' })]));
        } else {
          frames.push(fr('TS substitutes T = <code>' + esc(T) + '</code> everywhere in the signature. The call type-checks and <code>r</code> gets type <code>' + esc(T) + '</code> — not <code>any</code>, not <code>unknown</code>. That precision is the whole point of generics.', [cp(sub, { 1: 'ok', 5: 'ok' }, 'Signature after substitution'), vp({ T: T, 'type of r': T }, { 'type of r': 'sel' })]));
          var rv = items.items.length ? showVal(items.items[0]) : showVal(fb);
          frames.push(fr('At runtime the generic disappears (erased), and the function just runs: <code>r = ' + esc(rv) + '</code>. Generics cost nothing at runtime — they are purely a compile-time contract.', [cp('function firstOr(items, fallback) {\n  return items.length > 0 ? items[0] : fallback;\n}\nconst r = ' + call + '; // ' + rv, { 4: 'ok' }, 'Emitted JavaScript', 'js'), vp({ r: rv }, { r: 'ok' }, 'Runtime')]));
        }
        return frames;
      }
    }, {
      title: 'A generic Stack<T>: T is fixed when you create it',
      input: 'number: push 4, push 7, push hello, pop, push 9, peek',
      inputLabel: 'T: operations (push X, pop, peek) — T is number, string or boolean',
      gen: function (input) {
        var m = /^\s*(number|string|boolean)\s*:\s*(.+)$/.exec(String(input));
        if (!m) throw new Error('Start with the type, then operations, e.g.  number: push 1, push 2, pop');
        var T = m[1];
        var ops = m[2].split(',').map(function (x) { return x.trim(); }).filter(Boolean);
        if (!ops.length || ops.length > 12) throw new Error('Use 1 to 12 operations');
        var frames = [], items = [], rows = [];
        var cls = 'class Stack<T> {\n  private items: T[] = [];\n  push(item: T): void { this.items.push(item); }\n  pop(): T | undefined { return this.items.pop(); }\n  peek(): T | undefined { return this.items[this.items.length - 1]; }\n}\nconst s = new Stack<' + T + '>();';
        frames.push(fr('<code>new Stack&lt;' + T + '&gt;()</code> fixes <b>T = ' + T + '</b> for this object. From now on <code>push</code> accepts only <code>' + T + '</code>, and <code>pop</code>/<code>peek</code> return <code>' + T + ' | undefined</code> (the stack might be empty).', [cp(cls, { 7: 'cur' }), vp({ T: T, 'push(item: T)': 'push(item: ' + T + ')', 'pop(): T | undefined': T + ' | undefined' }, { T: 'sel' }, 'This instance'), { type: 'stack', label: 's.items (bottom → top)', items: [] }]));
        function kindOf(v) {
          if (/^-?\d+(\.\d+)?$/.test(v)) return 'number';
          if (v === 'true' || v === 'false') return 'boolean';
          return 'string';
        }
        ops.forEach(function (op) {
          var mm = /^(push)\s+(\S+)$|^(pop|peek)$/.exec(op);
          if (!mm) throw new Error('Operations are: push VALUE, pop, peek (got ' + op + ')');
          if (mm[1]) {
            var v = mm[2], k = kindOf(v), shown = k === 'string' ? '"' + v + '"' : v;
            if (k !== T) {
              rows.push(['s.push(' + shown + ')', '✘ compile error']);
              frames.push(fr('<code>s.push(' + esc(shown) + ')</code>: the argument is a <code>' + k + '</code> but this stack is <code>Stack&lt;' + T + '&gt;</code>. ' + H.c('r', 'Compile error') + ' — the line never makes it into the program, so the stack is unchanged.', [cp(cls, { 3: 'bad' }), vp({ argument: k, expected: T, error: 'Argument of type \'' + k + '\' is not assignable to parameter of type \'' + T + '\'' }, { error: 'bad' }, 'Compiler check'), { type: 'stack', label: 's.items (bottom → top)', items: items.slice() }, { type: 'table', label: 'Log', columns: ['call', 'result'], rows: rows.slice(), hl: (function () { var h = {}; h[rows.length - 1] = 'bad'; return h; })() }]));
            } else {
              items.push(shown);
              rows.push(['s.push(' + shown + ')', 'ok']);
              frames.push(fr('<code>s.push(' + esc(shown) + ')</code>: <code>' + k + '</code> matches T, so it compiles and runs. The value goes on top.', [cp(cls, { 3: 'ok' }), { type: 'stack', label: 's.items (bottom → top)', items: items.slice(), hl: (function () { var h = {}; h[items.length - 1] = 'ok'; return h; })() }, { type: 'table', label: 'Log', columns: ['call', 'result'], rows: rows.slice(), hl: (function () { var h = {}; h[rows.length - 1] = 'ok'; return h; })() }]));
            }
          } else {
            var isPop = mm[3] === 'pop';
            var top = items.length ? items[items.length - 1] : 'undefined';
            var hlS = {}; if (items.length) hlS[items.length - 1] = isPop ? 'bad' : 'cur';
            var before = items.slice();
            if (isPop && items.length) items.pop();
            rows.push(['s.' + mm[3] + '()', String(top)]);
            frames.push(fr('<code>s.' + mm[3] + '()</code> returns <code>' + esc(top) + '</code>. Its static type is <code>' + T + ' | undefined</code>, so before calling, say, ' + (T === 'number' ? '<code>.toFixed()</code>' : T === 'string' ? '<code>.toUpperCase()</code>' : 'a boolean method') + ' on it you must handle the empty case (<code>if (x !== undefined)</code> or <code>??</code>).', [cp(cls, isPop ? { 4: 'cur' } : { 5: 'cur' }), { type: 'stack', label: 's.items (bottom → top)', items: isPop ? before : items.slice(), hl: hlS }, vp({ returned: top, 'static type': T + ' | undefined' }, { returned: top === 'undefined' ? 'bad' : 'ok' }, 'Result'), { type: 'table', label: 'Log', columns: ['call', 'result'], rows: rows.slice() }]));
          }
        });
        frames.push(fr('One class, many safe uses: <code>Stack&lt;number&gt;</code>, <code>Stack&lt;string&gt;</code>, <code>Stack&lt;User&gt;</code>. Without generics you would write one class per type or fall back to <code>any</code> and lose every check you just saw.', [{ type: 'stack', label: 'final s.items', items: items.slice() }, { type: 'table', label: 'Log', columns: ['call', 'result'], rows: rows.slice() }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Generic constraints: "anything with an id"', html: `<p><code>T extends { id: string }</code> means T can be <b>any</b> object type that has at least an <code>id</code> string. Inside, you may use <code>item.id</code>; outside, callers get their <b>full</b> type back (not just <code>{ id }</code>). This "keep the caller's type" property is what a plain parameter type cannot do.</p>`, code: `function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const it of items) map.set(it.id, it); // it.id allowed by the constraint
  return map;
}
const users = byId([{ id: "u1", name: "Ada" }, { id: "u2", name: "Linus" }]);
console.log(users.get("u1")?.name); // name is known: T kept the full shape` },
      { title: 'Why does this not compile? Returning a "fresh" T', html: `<p>A classic generic error: <i>"Type '{ id: string; }' is not assignable to type 'T'. '{ id: string; }' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype of constraint '{ id: string; }'"</i>. The constraint says T has <b>at least</b> an <code>id</code>; the caller may expect more fields. You cannot build a T from scratch — return the input, or widen the return type.</p>`, code: `function withDefaultId<T extends { id: string }>(obj: T): T {
  if (obj.id) return obj;               // fine: obj really is a T
  // @ts-expect-error -- '{ id: string }' is assignable to the constraint, but T could be a subtype with more fields
  return { id: "generated" };
}
function withDefaultIdFixed<T extends { id: string }>(obj: T): T {
  return obj.id ? obj : { ...obj, id: "generated" }; // spread keeps every field of T
}
console.log(withDefaultId({ id: "a" }).id, withDefaultIdFixed({ id: "", role: "x" }).role);` },
      { title: 'Explicit type arguments when inference cannot see', html: `<p>Empty containers and <code>null</code> initial values give inference nothing to work with. Pass the type argument explicitly. Without it, <code>new Map()</code> becomes <code>Map&lt;any, any&gt;</code>, and a <code>useState(null)</code>-style API would be stuck at <code>null</code> forever.</p>`, code: `const scores = new Map<string, number>();     // explicit: nothing to infer from
scores.set("ada", 10);

function createStore<S>(initial: S) {
  let state = initial;
  return { get: () => state, set: (next: S) => { state = next; } };
}
interface User { name: string }
const store = createStore<User | null>(null);  // without <...>, S would be null
store.set({ name: "Ada" });
console.log(scores.get("ada"), store.get()?.name);` },
      { title: 'Golden rule: do not add a generic you do not need', html: `<p>If a type parameter is used only <b>once</b>, it adds noise without connecting anything. <code>function log&lt;T&gt;(x: T): void</code> is just <code>function log(x: unknown): void</code>. Generics earn their place when they <b>relate</b> two positions (input ↔ output, or two inputs).</p>`, code: `// Unnecessary generic: T appears once
function logBad<T>(value: T): void { console.log(value); }
// Same thing, simpler
function logGood(value: unknown): void { console.log(value); }
// Necessary generic: T relates input and output
function wrap<T>(value: T): { value: T } { return { value }; }
logBad(1); logGood(2);
console.log(wrap("x").value.toUpperCase());` }
    ],
    deepDive: `<p><b>How inference really works.</b> For each call, TS collects <b>candidates</b> for every type parameter by structurally matching argument types against parameter types (<code>number[]</code> against <code>T[]</code> gives <code>number</code>). Candidates from <b>covariant</b> positions are combined by picking a common supertype; if none exists, the first candidate wins and the other argument errors. <code>null</code>/<code>undefined</code> candidates are added as a union under <code>strictNullChecks</code>. Contravariant candidates (from callback parameters) are intersected. Context-sensitive arguments (un-annotated lambdas) are inferred in a <b>second pass</b>, left to right, which is why argument order sometimes matters.</p>
<p><b>Literal preservation.</b> If <code>T</code> has a primitive constraint (<code>T extends string</code>), literals are kept: <code>f("a")</code> infers <code>"a"</code>, not <code>string</code>. TS 5.0's <b><code>const</code> type parameters</b> (<code>function f&lt;const T&gt;(x: T)</code>) infer as if the caller wrote <code>as const</code> — great for route tables and tuples. TS 5.4's <b><code>NoInfer&lt;T&gt;</code></b> blocks a parameter from contributing candidates: in <code>createFSM&lt;S extends string&gt;(states: S[], initial: NoInfer&lt;S&gt;)</code>, a typo in <code>initial</code> errors instead of widening S.</p>
<p><b>Variance.</b> Is <code>Box&lt;Dog&gt;</code> assignable to <code>Box&lt;Animal&gt;</code>? TS measures variance per type parameter (covariant if T is only read, contravariant if only written, invariant if both), caching the result for speed. You can annotate it explicitly with <code>in</code>/<code>out</code> modifiers (<code>interface Producer&lt;out T&gt;</code>, TS 4.7) — mainly a performance and documentation tool for library authors.</p>
<p><b>Erasure and runtime.</b> Generics vanish at runtime: you cannot write <code>new T()</code> or <code>x instanceof T</code>. Pass a constructor or a validator instead (<code>function make&lt;T&gt;(ctor: new () =&gt; T): T</code>). Unlike Java, there is no boxing and no runtime cost; unlike C++ templates, there is no code duplication per type.</p>
<p><b>Generic syntax in .tsx.</b> <code>&lt;T&gt;(x: T) =&gt; x</code> is parsed as a JSX element in <code>.tsx</code> files; write <code>&lt;T,&gt;</code> or <code>&lt;T extends unknown&gt;</code>. Old-style <code>&lt;Type&gt;value</code> assertions are not allowed in .tsx at all; use <code>value as Type</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> generic utility functions (groupBy, pick, debounce, typed fetch wrappers) are exactly what assistants produce best — and also where they most often over-engineer: five type parameters, conditional types, and overloads for a function that needed one <code>T</code>. Your skill is spotting when the types are more complex than the problem.</p>
<p><b>Use AI as a partner:</b> <code>Add generics to this function so the return type follows the input; keep it to the minimum number of type parameters and show three call sites with their inferred types</code>. Or paste a generic error ("T could be instantiated with an arbitrary type") and ask for a plain-English explanation plus the smallest fix.</p>
<p><b>Where AI goes wrong:</b> type parameters used only once, <code>as T</code> casts to make a "fresh T" compile (the bug from the examples), <code>T extends any</code> noise, <code>fetchJson&lt;T&gt;(): Promise&lt;T&gt;</code> wrappers that pretend to validate network data (the generic is just a disguised cast), and <code>&lt;T&gt;</code> arrow syntax inside <code>.tsx</code> files.</p>
<p><b>What you must still own:</b> deciding which relationships between types matter in your API, keeping signatures readable for teammates, and remembering that a generic return type on unvalidated external data is a promise the compiler cannot check.</p>`,
    problems: [{
      title: 'Add Types: a Generic groupBy That Is Not any', level: 'Medium', tags: ['generics', 'constraints', 'Record', 'PropertyKey'], companies: ['Amazon', 'Shopify', 'Netflix'],
      statement: `<p>This helper works but returns <code>any</code>:</p>
<pre>function groupBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    (out[key] ||= []).push(item);
  }
  return out;
}</pre>
<p>Type it with generics so that <code>groupBy(users, u =&gt; u.role)</code> returns <code>Record&lt;"admin" | "user", User[]&gt;</code>-like precision (or at least <code>Record&lt;string, User[]&gt;</code>), the callback parameter <code>u</code> is inferred as <code>User</code>, and returning an object from <code>keyFn</code> is a compile error.</p>`,
      constraints: `strict mode · no <code>any</code> · at most 2 type parameters · callers must not need explicit type arguments. (ES2024 also has a built-in <code>Object.groupBy</code>; implement your own here.)`,
      example: `<p><code>groupBy([{ n: "a", role: "admin" }, { n: "b", role: "user" }, { n: "c", role: "admin" }], u =&gt; u.role)</code> → ${H.c('g', '{ admin: [a, c], user: [b] }')}. <code>groupBy(users, u =&gt; ({ r: u.role }))</code> → ${H.c('r', 'compile error: object is not a valid key')}.</p>`,
      brute: { why: `<p>Typing everything as <code>any</code> compiles, but the callback gets no autocomplete, typos like <code>u.rol</code> return <code>undefined</code> keys silently, and callers receive <code>any</code> back, spreading unsafety.</p>`, code: `function groupBy(items: any[], keyFn: (item: any) => any): any {
  const out: any = {};
  for (const item of items) {
    const key = keyFn(item);
    (out[key] ||= []).push(item);
  }
  return out;
}
const g = groupBy([{ role: "admin" }], (u) => u.rol); // typo compiles; key is undefined
console.log(Object.keys(g)); // ["undefined"]` },
      mcq: { q: 'What constraint should the key type K have?', options: ['K extends string', 'K extends PropertyKey (string | number | symbol)', 'K extends object', 'No constraint'], answer: 1, explain: 'Object keys can be strings, numbers or symbols; PropertyKey is the built-in alias for exactly that, and it rejects objects as keys.' },
      hints: [`<p>Hint 1: Two things vary: the item type and the key type. That is two type parameters, <code>T</code> and <code>K</code>.</p>`, `<p>Hint 2: <code>keyFn: (item: T) =&gt; K</code> with <code>K extends PropertyKey</code>. The return type is <code>Partial&lt;Record&lt;K, T[]&gt;&gt;</code> — partial because not every possible key necessarily appears.</p>`, `<p>Hint 3: Recipe: declare <code>&lt;T, K extends PropertyKey&gt;</code> → type <code>items: readonly T[]</code> → build <code>out</code> typed as the return type → push with <code>(out[key] ??= []).push(item)</code> → return. Test with an object-returning callback under <code>@ts-expect-error</code>.</p>`],
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(kind) {\n  var people = [{ name: 'Ada', role: 'admin' }, { name: 'Bob', role: 'user' }, { name: 'Cy', role: 'admin' }];\n  var names = function (g) { var o = {}; for (var k of Object.keys(g)) o[k] = g[k].map(function (p) { return p.name || p; }); return o; };\n  if (kind === 'role') return names(groupBy(people, function (u) { return u.role; }));\n  if (kind === 'len') return groupBy(['hi', 'hey', 'yo'], function (s) { return s.length; });\n  if (kind === 'empty') return groupBy([], function (x) { return x; });\n  if (kind === 'single') return groupBy([7], function (x) { return x > 0 ? 'pos' : 'neg'; });\n  if (kind === 'negative') return groupBy([-1, 2, -3, 4, 0], function (x) { return x < 0 ? 'neg' : 'nonneg'; });\n  if (kind === 'same') return groupBy(['a', 'a', 'a'], function (x) { return x; });\n  if (kind === 'immutable') { var before = JSON.stringify(people); groupBy(people, function (u) { return u.role; }); return JSON.stringify(people) === before; }\n  if (kind === 'big') { var arr = []; for (var i = 0; i < 100000; i++) arr.push(i); var g = groupBy(arr, function (x) { return x % 10; }); return [Object.keys(g).length, g[0].length, g[9][g[9].length - 1]]; }\n}"},"cases":[[["role"],{"admin":["Ada","Cy"],"user":["Bob"]}],[["len"],{"2":["hi","yo"],"3":["hey"]}],[["empty"],{}],[["single"],{"pos":[7]}],[["negative"],{"neg":[-1,-3],"nonneg":[2,4,0]}],[["same"],{"a":["a","a","a"]}],[["immutable"],true],[["big"],[10,10000,99999]]]},
      solution: {
        approach: `<p>Use two type parameters: <code>T</code> for items (inferred from the array, which also types the callback parameter) and <code>K extends PropertyKey</code> for keys (inferred from the callback's return type, preserving literal unions like <code>"admin" | "user"</code> when the data has them). Return <code>Partial&lt;Record&lt;K, T[]&gt;&gt;</code> because a key may have no items.</p>`,
        code: `function groupBy<T, K extends PropertyKey>(
  items: readonly T[],
  keyFn: (item: T) => K
): Partial<Record<K, T[]>> {
  const out: Partial<Record<K, T[]>> = {};
  for (const item of items) {
    const key = keyFn(item);          // key: K
    (out[key] ??= []).push(item);     // create the bucket on first use
  }
  return out;
}

interface User { name: string; role: "admin" | "user" }
const users: User[] = [
  { name: "Ada", role: "admin" },
  { name: "Bob", role: "user" },
  { name: "Cy", role: "admin" },
];

const byRole = groupBy(users, (u) => u.role); // u: User, K: "admin" | "user"
console.log(byRole.admin?.map((u) => u.name)); // ["Ada", "Cy"]
const byLen = groupBy(["hi", "hey", "yo"], (s) => s.length); // K: number
console.log(byLen[2]);
// @ts-expect-error -- Type '{ r: "admin" | "user"; }' is not assignable to type 'PropertyKey'
groupBy(users, (u) => ({ r: u.role }));`,
        dry: { head: ['item', 'keyFn(item)', 'out after push'], rows: [['Ada (admin)', '"admin"', '{ admin: [Ada] }'], ['Bob (user)', '"user"', '{ admin: [Ada], user: [Bob] }'], ['Cy (admin)', '"admin"', '{ admin: [Ada, Cy], user: [Bob] }'], ['types', 'T = User, K = "admin" | "user"', 'Partial&lt;Record&lt;K, User[]&gt;&gt;']] },
        complexity: `<p>O(n) time and O(n) extra space. Type inference cost is negligible; the two parameters are both inferred from the call.</p>`,
        followUps: ['Why <code>Partial&lt;Record&lt;K, T[]&gt;&gt;</code> and not <code>Record&lt;K, T[]&gt;</code>?', 'Return a <code>Map&lt;K, T[]&gt;</code> instead — when is a Map better than an object?', 'Compare with the built-in <code>Object.groupBy</code> signature in lib.es2024.']
      }
    }]
  });

  /* ================= TOPIC 7: tsconfig & strict mode ================= */
  var STRICT_FAMILY = ['noImplicitAny', 'strictNullChecks', 'strictFunctionTypes', 'strictBindCallApply', 'strictPropertyInitialization', 'noImplicitThis', 'useUnknownInCatchVariables', 'alwaysStrict', 'strictBuiltinIteratorReturn'];
  var EXTRA_FLAGS = ['noUncheckedIndexedAccess', 'exactOptionalPropertyTypes', 'noImplicitReturns', 'noFallthroughCasesInSwitch', 'noImplicitOverride'];
  var FLAG_LINES = [
    { flag: 'noImplicitAny', code: 'function greet(name) { return "hi " + name; }', err: "Parameter 'name' implicitly has an 'any' type.", risk: 'name is any: greet(42), greet() and typos all compile.' },
    { flag: 'strictNullChecks', code: 'const el = document.getElementById("app"); el.textContent = "x";', err: "'el' is possibly 'null'.", risk: 'Crashes with "Cannot set properties of null" when #app is missing.' },
    { flag: 'noUncheckedIndexedAccess', code: 'const names: string[] = []; names[0].toUpperCase();', err: "Object is possibly 'undefined'.", risk: 'names[0] is undefined at runtime — crash, although the type said string.' },
    { flag: 'strictPropertyInitialization', code: 'class Box { size: number; }', err: "Property 'size' has no initializer and is not definitely assigned in the constructor.", risk: 'new Box().size is undefined, typed as number.' },
    { flag: 'useUnknownInCatchVariables', code: 'try { run(); } catch (e) { console.log(e.message); }', err: "'e' is of type 'unknown'.", risk: 'Anything can be thrown (strings, numbers); e.message may be undefined.' },
    { flag: 'strictFunctionTypes', code: 'const h: (x: string | number) => void = (x: string) => x.trim();', err: "Type '(x: string) => string' is not assignable to type '(x: string | number) => void'.", risk: 'h(5) calls (5).trim() → TypeError at runtime.' },
    { flag: 'strictBindCallApply', code: 'add.call(null, 1, "2");', err: "Argument of type 'string' is not assignable to parameter of type 'number'.", risk: 'call/apply/bind arguments are unchecked: 1 + "2" = "12".' },
    { flag: 'exactOptionalPropertyTypes', code: 'const opts: { debug?: boolean } = { debug: undefined };', err: "Type '{ debug: undefined; }' is not assignable to type '{ debug?: boolean; }' with 'exactOptionalPropertyTypes: true'.", risk: '"debug" in opts is true although no value was given — subtle merge/spread bugs.' },
    { flag: 'noImplicitReturns', code: 'function sign(x: number) { if (x > 0) return "pos"; }', err: 'Not all code paths return a value.', risk: 'sign(-1) returns undefined; the return type silently becomes string | undefined.' }
  ];

  topics.push({
    title: 'tsconfig.json & Strict Mode: Configuring the Compiler',
    analogy: `<p><code>tsconfig.json</code> is the <b>settings panel of a smoke alarm</b>. With sensitivity on "low" (<code>strict: false</code>), it stays quiet while you cook — and also while the curtains catch fire. On "high" (<code>strict: true</code>), it beeps a bit more, but every beep is a real risk you get to fix <i>before</i> the house burns.</p>
<p>The other settings are about <b>where you live</b>: which building rules apply (<code>target</code>, <code>lib</code>), how rooms connect (<code>module</code>, <code>moduleResolution</code>), and whether the alarm also wires the house (<code>noEmit</code> vs emitting JavaScript).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>tsconfig.json</code> sits at the root of a project and tells <code>tsc</code> (and your editor) <b>which files</b> to check and <b>how strictly</b>. The single most important line is <code>"strict": true</code>. Since <b>TypeScript 6.0</b> it is even the default, but write it explicitly anyway.</p>
<p><code>strict</code> is a <b>bundle</b> of checks. Turning it on enables all of these:</p>
${H.table(['Flag (in strict)', 'What it catches'], [['<code>noImplicitAny</code>', 'parameters/variables TS cannot type silently becoming <code>any</code>'], ['<code>strictNullChecks</code>', '<code>null</code>/<code>undefined</code> not allowed unless the type says so (the big one)'], ['<code>strictFunctionTypes</code>', 'unsafe function parameter assignments'], ['<code>strictBindCallApply</code>', 'wrong arguments to <code>call</code>/<code>apply</code>/<code>bind</code>'], ['<code>strictPropertyInitialization</code>', 'class fields never assigned in the constructor'], ['<code>noImplicitThis</code>', '<code>this</code> with an unknown type'], ['<code>useUnknownInCatchVariables</code>', '<code>catch (e)</code> is <code>unknown</code>, not <code>any</code>'], ['<code>alwaysStrict</code>', 'emits "use strict"; parses in strict mode'], ['<code>strictBuiltinIteratorReturn</code>', 'built-in iterator results typed precisely (TS 5.6)']])}
<p>🔵 <b>Worth adding on top of strict</b> (not included in it):</p>
${H.chips(['noUncheckedIndexedAccess', 'exactOptionalPropertyTypes', 'noImplicitReturns', 'noFallthroughCasesInSwitch', 'noImplicitOverride'], { label: 'Extra safety flags', hl: { 0: 'g' } })}
<p><code>noUncheckedIndexedAccess</code> is the most valuable: <code>arr[i]</code> and <code>record[key]</code> become <code>T | undefined</code>, matching reality.</p>
<p>🟣 <b>The other settings, in plain words:</b></p>
${H.table(['Setting', 'Question it answers', 'Typical 2026 value'], [['<code>target</code>', 'Which JS version should the output use?', '<code>ES2022</code> or newer'], ['<code>lib</code>', 'Which built-in APIs exist (DOM? ES2024?)', '<code>["ES2023", "DOM"]</code> for web'], ['<code>module</code>', 'What module format is emitted/understood?', '<code>"preserve"</code> (bundler) or <code>"nodenext"</code> (Node)'], ['<code>moduleResolution</code>', 'How are import paths found?', '<code>"bundler"</code> or <code>"nodenext"</code>'], ['<code>noEmit</code>', 'Only type-check; another tool builds', '<code>true</code> in Vite/Next apps'], ['<code>isolatedModules</code> / <code>verbatimModuleSyntax</code>', 'Is each file safe to compile alone (esbuild, swc)?', '<code>true</code>'], ['<code>skipLibCheck</code>', 'Skip type-checking <code>.d.ts</code> files of dependencies', '<code>true</code> (speed)'], ['<code>declaration</code>, <code>outDir</code>', 'Emit <code>.d.ts</code> and JS for a library', 'libraries only'], ['<code>include</code> / <code>extends</code>', 'Which files; inherit from a base config', '<code>["src"]</code>, shared base']])}`,
    clues: ['"How do you set up TypeScript for a new project?" → strict + module/moduleResolution matching your runtime/bundler + noEmit when a bundler builds', '"Migrating a big JS codebase" → allowJs/checkJs, strict per folder or incrementally, @ts-check, ts-expect-error budget', '"What does strict actually turn on?" → the strict family list', '"Object is possibly undefined on array access" → noUncheckedIndexedAccess is on', '"Works in tsc but esbuild/Vite complains" → isolatedModules / verbatimModuleSyntax / const enum', '"Why is type-checking slow in our monorepo?" → project references, skipLibCheck, incremental, TS 7 native compiler', '"Node runs .ts directly now — do we still need tsc?" → yes, for type checking; Node only strips types'],
    code: [{ lang: 'json', title: 'A modern tsconfig for a bundled web app (Vite / Next style)', code: `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "preserve",
    "moduleResolution": "bundler",
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,

    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}` }, { lang: 'json', title: 'A tsconfig for a Node.js library that publishes JS + .d.ts', code: `{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2023",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src"],
  "exclude": ["**/*.test.ts"]
}` }, { title: 'What strict mode changes in real code', code: `
// strictNullChecks: find() may return undefined, so TS makes you handle it
interface Task { id: number; done: boolean }
const tasks: Task[] = [{ id: 1, done: false }];
const t = tasks.find((x) => x.id === 2);   // Task | undefined
console.log(t?.done ?? "not found");

// strictPropertyInitialization: initialise, assign in the constructor, or use '!'
class Timer {
  startedAt: number;          // assigned in constructor: OK
  label = "default";          // initialiser: OK
  handle?: number;            // optional: OK (may be undefined)
  constructor() { this.startedAt = Date.now(); }
}

// useUnknownInCatchVariables: e is unknown, narrow before reading .message
function safeRun(fn: () => void): string {
  try { fn(); return "ok"; }
  catch (e) { return e instanceof Error ? e.message : String(e); }
}

// noImplicitOverride: overriding requires the 'override' keyword (with that flag on)
class Base { greet(): string { return "hi"; } }
class Child extends Base { override greet(): string { return "hey"; } }

console.log(new Timer().label, safeRun(() => { throw "boom"; }), new Child().greet());
` }],
    codeTitle: ['tsconfig: bundled app', 'tsconfig: Node library', 'strict mode in practice'],
    viz: [{
      title: 'Strict flags lab: which bugs does your config catch?',
      input: 'strict, noUncheckedIndexedAccess',
      inputLabel: 'Enabled flags (comma separated). "strict" expands to its family. Try: noImplicitAny  or  strict, exactOptionalPropertyTypes, noImplicitReturns',
      gen: function (input) {
        var toks = String(input).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
        var known = STRICT_FAMILY.concat(EXTRA_FLAGS).concat(['strict']);
        toks.forEach(function (t) { if (known.indexOf(t) < 0) throw new Error('Unknown flag "' + t + '". Use: strict, ' + STRICT_FAMILY.concat(EXTRA_FLAGS).join(', ')); });
        var on = [];
        toks.forEach(function (t) { if (t === 'strict') STRICT_FAMILY.forEach(function (f) { on.push(f); }); else on.push(t); });
        on = uniq(on);
        var code = FLAG_LINES.map(function (l) { return l.code; }).join('\n');
        var frames = [], rows = [], caught = 0;
        var fv = {}; on.forEach(function (f) { fv[f] = 'on'; });
        frames.push(fr('Nine small lines, each hiding a classic bug. We compile them with your flags: <b>' + (on.length ? on.join(', ') : 'nothing extra (strict: false)') + '</b>. ' + (toks.indexOf('strict') >= 0 ? '<code>strict</code> expanded into ' + STRICT_FAMILY.length + ' flags. ' : '') + 'Note: <code>noUncheckedIndexedAccess</code>, <code>exactOptionalPropertyTypes</code> and <code>noImplicitReturns</code> are <b>not</b> part of strict.', [cp(code, {}), on.length ? vp(fv, {}, 'Flags on') : vp({ strict: 'off' }, { strict: 'bad' }, 'Flags on')]));
        FLAG_LINES.forEach(function (l, i) {
          var isOn = on.indexOf(l.flag) >= 0;
          if (isOn) caught++;
          rows.push([String(i + 1), l.flag, isOn ? '✘ error (caught)' : '✔ compiles']);
          var h = {}; h[i + 1] = isOn ? 'ok' : 'bad';
          for (var k = 0; k < i; k++) h[k + 1] = 'done';
          frames.push(fr('Line ' + (i + 1) + ' — governed by <code>' + l.flag + '</code> (' + (on.indexOf(l.flag) >= 0 ? H.c('g', 'on') : H.c('r', 'off')) + '). ' + (isOn ? 'Compiler: <i>' + esc(l.err) + '</i> You fix it now, in the editor.' : 'Compiles silently. Runtime risk: ' + esc(l.risk)), [cp(code, h), { type: 'table', label: 'Results so far', columns: ['line', 'flag', 'result'], rows: rows.slice(), hl: (function () { var x = {}; x[rows.length - 1] = isOn ? 'ok' : 'bad'; return x; })() }]));
        });
        var missing = FLAG_LINES.filter(function (l) { return on.indexOf(l.flag) < 0; }).map(function (l) { return l.flag; });
        frames.push(fr('Your config caught <b>' + caught + ' of ' + FLAG_LINES.length + '</b> bugs at compile time. ' + (missing.length ? 'To catch the rest, enable: <code>' + missing.join(', ') + '</code>.' : 'Excellent — every bug is caught before it runs.') + ' Each caught bug is a production incident that never happens.', [{ type: 'bars', label: 'Bugs caught vs missed', values: [caught, FLAG_LINES.length - caught], texts: ['caught ' + caught, 'missed ' + (FLAG_LINES.length - caught)], idxLabels: ['caught', 'missed'], hl: { 0: 'ok', 1: 'bad' } }, { type: 'table', label: 'All results', columns: ['line', 'flag', 'result'], rows: rows.slice(), hl: (function () { var x = {}; rows.forEach(function (r, i) { x[i] = r[2].charAt(0) === '✘' ? 'ok' : 'bad'; }); return x; })() }]));
        return frames;
      }
    }, {
      title: 'From .ts to running code: who type-checks, who builds?',
      input: 'bundler',
      inputLabel: 'Setup: bundler (Vite/Next app) · library (tsc emits .js + .d.ts) · node (Node runs .ts directly)',
      gen: function (input) {
        var mode = String(input).trim().toLowerCase();
        if (['bundler', 'library', 'node'].indexOf(mode) < 0) throw new Error('Type one of: bundler, library, node');
        var nodes = [
          { id: 'src', label: 'src/*.ts', x: 8, y: 35, shape: 'box', w: 14 },
          { id: 'cfg', label: 'tsconfig.json', x: 30, y: 8, shape: 'box', w: 18 },
          { id: 'tsc', label: 'tsc --noEmit (type check)', x: 38, y: 35, shape: 'box', w: 26 },
          { id: 'strip', label: mode === 'node' ? 'Node: strip types' : 'esbuild / swc (strip)', x: 38, y: 62, shape: 'box', w: 26 },
          { id: 'emit', label: 'tsc emit', x: 66, y: 12, shape: 'box', w: 14 },
          { id: 'js', label: '.js output', x: 72, y: 62, shape: 'box', w: 14 },
          { id: 'dts', label: '.d.ts types', x: 90, y: 12, shape: 'box', w: 14 },
          { id: 'run', label: mode === 'node' ? 'node app.ts' : 'browser / node', x: 92, y: 40, shape: 'box', w: 16 }
        ];
        var all = [['cfg', 'tsc'], ['src', 'tsc'], ['src', 'strip'], ['src', 'emit'], ['strip', 'js'], ['emit', 'js'], ['emit', 'dts'], ['js', 'run'], ['strip', 'run']];
        var flows = {
          bundler: [['cfg', 'tsc', 'tsconfig tells tsc which files and how strictly to check.'], ['src', 'tsc', '<b>tsc --noEmit</b> type-checks everything (in CI and in your editor). It produces <b>no files</b> — <code>"noEmit": true</code>.'], ['src', 'strip', 'Meanwhile the bundler (Vite uses esbuild; Next uses swc) compiles each file <b>alone</b>, just deleting the types. Very fast, but it <b>never reports type errors</b>. That is why <code>isolatedModules</code>/<code>verbatimModuleSyntax</code> must be on: every file must be compilable in isolation.'], ['strip', 'js', 'Output: bundled, minified JavaScript.'], ['js', 'run', 'The browser runs plain JS. If you skipped <code>tsc</code> in CI, type errors would ship!']],
          library: [['cfg', 'tsc', 'tsconfig with <code>declaration: true</code>, <code>outDir: "dist"</code>, <code>module: "nodenext"</code>.'], ['src', 'tsc', 'tsc type-checks first. With errors, it still emits by default unless <code>noEmitOnError</code> is set.'], ['src', 'emit', 'tsc itself emits JavaScript, one .js per .ts.'], ['emit', 'js', 'dist/*.js — what consumers execute.'], ['emit', 'dts', 'dist/*.d.ts — type declarations, so consumers get autocomplete and checking. <code>isolatedDeclarations</code> (TS 5.5) lets other tools generate these in parallel.'], ['js', 'run', 'Consumers import the JS; their editor reads the .d.ts.']],
          node: [['src', 'strip', 'Node.js 22.18+ / 23.6+ runs <code>node app.ts</code> by <b>stripping</b> types: it replaces type syntax with spaces (so line numbers in stack traces stay correct). No tsconfig is read for this step.'], ['strip', 'run', 'Your program runs immediately. But only <b>erasable</b> syntax is allowed: no <code>enum</code>, no <code>namespace</code>, no parameter properties — enable <code>erasableSyntaxOnly</code> so tsc warns you.'], ['cfg', 'tsc', 'Type checking is a separate job: Node does <b>not</b> check types at all.'], ['src', 'tsc', 'Run <code>tsc --noEmit</code> in CI and rely on the editor locally. Imports use real file extensions (<code>./util.ts</code>) with <code>allowImportingTsExtensions</code> or <code>rewriteRelativeImportExtensions</code>.']]
        };
        var flow = flows[mode], frames = [], ehl = {}, hl = {};
        frames.push(fr('Setup: <b>' + mode + '</b>. Key idea: <b>type checking</b> and <b>producing JavaScript</b> are two separate jobs, often done by different tools.', [{ type: 'graph', directed: true, height: 75, nodes: nodes, edges: all }]));
        flow.forEach(function (f) {
          ehl = {}; Object.keys(hl).forEach(function (k) { hl[k] = 'done'; });
          ehl[f[0] + '-' + f[1]] = 'cur'; hl[f[0]] = 'cur'; hl[f[1]] = 'ok';
          var h2 = {}; Object.keys(hl).forEach(function (k) { h2[k] = hl[k]; });
          frames.push(fr(f[2], [{ type: 'graph', directed: true, height: 75, nodes: nodes, edges: all, hl: h2, ehl: ehl }]));
        });
        frames.push(fr('Summary for <b>' + mode + '</b>.', [{ type: 'table', label: 'Who does what', columns: ['job', 'tool'], rows: mode === 'bundler' ? [['type check', 'tsc --noEmit (CI + editor)'], ['JS output', 'esbuild / swc via the bundler'], ['.d.ts', 'not needed (an app)']] : mode === 'library' ? [['type check', 'tsc'], ['JS output', 'tsc (or tsup/tsdown)'], ['.d.ts', 'tsc declaration: true']] : [['type check', 'tsc --noEmit (CI + editor)'], ['JS output', 'none: Node strips at load time'], ['restrictions', 'erasableSyntaxOnly']], hl: { 0: 'sel' } }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Migrating a JS project gradually', html: `<p>You do not need a big-bang rewrite. Step 1: add a tsconfig with <code>allowJs</code> and <code>checkJs: false</code>, rename nothing. Step 2: add <code>// @ts-check</code> at the top of JS files you want checked (JSDoc types work too). Step 3: rename leaf files to <code>.ts</code> one by one, fixing errors. Step 4: turn on <code>strict</code>; for files not ready yet, put <code>// @ts-expect-error</code> on the few failing lines and track their count down to zero.</p>`, code: { lang: 'js', code: `// A JS file can be type-checked with JSDoc before renaming it to .ts
// @ts-check
/**
 * @param {number[]} prices
 * @returns {number}
 */
export function sum(prices) {
  return prices.reduce((a, b) => a + b, 0);
}` } },
      { title: 'noUncheckedIndexedAccess in action', html: `<p>With the flag on, index reads include <code>undefined</code>. It feels noisy for a day, then it catches real bugs: an empty array, a missing config key, an off-by-one. <code>for…of</code> loops and array methods are unaffected because they never read past the end.</p>`, code: `const ports: Record<string, number> = { web: 80 };
const scores = [90, 85];

// With noUncheckedIndexedAccess: number | undefined
const api = ports["api"];
const third = scores[2];
console.log(api ?? 3000, third ?? 0);

for (const s of scores) console.log(s.toFixed(0)); // s: number, no undefined here` },
      { title: 'Why does this not compile? import type and verbatimModuleSyntax', html: `<p>With <code>verbatimModuleSyntax</code> on, TS keeps every <code>import</code> exactly as written in the output. If you import something that is <b>only a type</b> without the <code>type</code> keyword, the emitted JS would try to import a value that does not exist at runtime. TS forces you to write <code>import type</code> (or an inline <code>type</code> modifier) so single-file compilers know they can delete it.</p>`, code: `// With verbatimModuleSyntax: type-only imports must say so
import type { IncomingMessage } from "node:http";
import { type ServerResponse, createServer } from "node:http";

export function handler(req: IncomingMessage, res: ServerResponse): void {
  res.end("hello " + req.url);
}
export const server = createServer(handler);` },
      { title: 'The definite assignment assertion (!) and when it is OK', html: `<p><code>strictPropertyInitialization</code> complains about fields set outside the constructor (by a framework, or an <code>init()</code> method). <code>field!: Type</code> tells TS "trust me, it will be set". Use it sparingly — it is a small <code>any</code>. Prefer constructor parameters or initialisers.</p>`, code: `class Component {
  // Set by a framework after construction: '!' silences the check
  element!: HTMLElement;
  // Better when possible: initialise right away
  count = 0;
  mount(el: HTMLElement): void {
    this.element = el;
    this.count++;
  }
}
const c = new Component();
console.log(c.count);` }
    ],
    deepDive: `<p><b>TypeScript 6.0 and the road to 7.</b> TS 6.0 is a transition release: <code>strict</code> defaults to <code>true</code>, and many legacy options are <b>deprecated</b> and error unless you set <code>"ignoreDeprecations": "6.0"</code> — e.g. <code>target: "ES5"</code>, <code>moduleResolution: "node10"</code>, <code>baseUrl</code>, <code>outFile</code>, <code>module: "amd" | "umd" | "system"</code>, <code>esModuleInterop: false</code>, <code>downlevelIteration</code>. They are scheduled for removal in TS 7, the native compiler port written in Go (<code>tsgo</code>), which type-checks large projects around an order of magnitude faster thanks to native code and parallelism. Clean configs now = painless upgrade later.</p>
<p><b><code>module</code> and <code>moduleResolution</code> must match reality.</b> <code>nodenext</code> follows Node's actual rules: ESM files need explicit extensions in relative imports, <code>package.json</code> <code>"type"</code> and <code>"exports"</code> are respected, and <code>.mts</code>/<code>.cts</code> force a format. <code>bundler</code> mimics Vite/webpack/esbuild: extensionless imports allowed, <code>exports</code> conditions honoured. <code>module: "preserve"</code> (TS 5.4) leaves import/export syntax untouched for the bundler. Picking <code>bundler</code> for code that Node will run directly is a classic source of "works in the editor, crashes in production" import errors.</p>
<p><b>Scaling.</b> In monorepos use <b>project references</b> (<code>composite: true</code> + <code>references</code>) and <code>tsc --build</code>: each package is checked once, its <code>.d.ts</code> output is reused by dependents, and <code>incremental</code> stores a <code>.tsbuildinfo</code> to skip unchanged work. <code>skipLibCheck</code> avoids re-checking every dependency's declaration files. <code>tsc --extendedDiagnostics</code> and <code>--generateTrace</code> show where check time goes (often a few huge union or conditional types).</p>
<p><b>Strictness has a real effect.</b> Turning <code>strictNullChecks</code> on in an existing codebase typically surfaces hundreds of errors — many of them genuine latent null bugs. Teams roll it out per directory (separate tsconfigs with <code>extends</code>), or with tooling that tracks an allow-list of not-yet-strict files, rather than flipping it everywhere in one PR.</p>
<p><b>Editor = compiler.</b> VS Code and other editors run the same TypeScript language service using your <code>tsconfig.json</code>; a file not matched by <code>include</code> gets default settings, which explains "no errors in the editor but errors in CI" (or the reverse). Always make sure the editor uses the workspace TypeScript version.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI agents can now run <code>tsc</code> in a loop and fix errors on their own — which makes your <code>tsconfig</code> the <b>rulebook the agent must obey</b>. A strict config with <code>noUncheckedIndexedAccess</code> forces generated code to handle edge cases; a loose config lets it ship <code>any</code>-flavoured code that "compiles".</p>
<p><b>Use AI as a partner:</b> <code>Enable strictNullChecks in packages/billing only, fix the errors without non-null assertions or casts, and summarise which ones were real bugs</code>. Or: <code>Audit this tsconfig for deprecated TS 6 options and mismatches between module settings and how the code actually runs</code>. Add a CI step that rejects new <code>@ts-ignore</code>, <code>as any</code> and <code>!</code> so agents cannot quietly lower the bar.</p>
<p><b>Where AI goes wrong:</b> suggesting outdated configs (<code>moduleResolution: "node"</code>, <code>target: "es5"</code>, <code>baseUrl</code> path hacks), "fixing" errors by switching off <code>strict</code> or adding <code>skipLibCheck</code> as if it hid application errors (it only skips <code>.d.ts</code> files), and mixing <code>bundler</code> resolution with code that Node runs directly.</p>
<p><b>What you must still own:</b> choosing the strictness level and migration plan for your team, matching module settings to the real runtime, and treating config changes as reviewed, deliberate decisions — not as a quick way to make red squiggles disappear.</p>`,
    problems: [{
      title: 'Turn On strict: Fix Every Error Without Cheating', level: 'Hard', tags: ['strict mode', 'strictNullChecks', 'migration', 'narrowing'], companies: ['Airbnb', 'Slack', 'Bloomberg'],
      statement: `<p>This file compiled with <code>strict: false</code>. After enabling <code>strict</code> (and <code>noUncheckedIndexedAccess</code>) it reports five errors. Fix them <b>properly</b> — the real runtime bugs must be gone, not hidden.</p>
<pre>function findUser(users, id) {
  return users.find(u =&gt; u.id === id);
}
function shout(users, id) {
  return findUser(users, id).name.toUpperCase();
}
function firstTag(tags: string[]) {
  return tags[0].trim();
}
class Session { token: string; }
function parse(json: string) {
  try { return JSON.parse(json); } catch (e) { return e.message; }
}</pre>`,
      constraints: `No <code>any</code>, no <code>as</code>, no non-null assertions (<code>!</code>), no <code>@ts-ignore</code>. Behaviour for valid input must not change. Decide and document what happens for missing data.`,
      example: `<p><code>shout(users, 99)</code> used to ${H.c('r', 'crash: Cannot read properties of undefined (reading "name")')}; after the fix it returns ${H.c('g', '"UNKNOWN"')} (or throws a clear error — your choice, but explicit). <code>firstTag([])</code> used to crash; now returns ${H.c('g', '""')}.</p>`,
      brute: { why: `<p>Silencing errors with <code>!</code> and casts makes the compiler happy and leaves every crash in place — the worst outcome, because now the types claim the code is safe.</p>`, code: `interface User { id: number; name: string }
function findUser(users: User[], id: number): User {
  return users.find((u) => u.id === id)!;        // lie: may be undefined
}
function shout(users: User[], id: number): string {
  return findUser(users, id).name.toUpperCase(); // still crashes for unknown ids
}
function firstTag(tags: string[]): string {
  return tags[0]!.trim();                        // still crashes for []
}
class Session { token!: string; }                // never actually set
console.log(firstTag(["a"]), new Session().token);` },
      mcq: { q: 'Which strict sub-flag is responsible for <code>findUser(...).name</code> becoming an error?', options: ['noImplicitAny', 'strictNullChecks', 'strictFunctionTypes', 'alwaysStrict'], answer: 1, explain: 'Array.prototype.find returns T | undefined. Only with strictNullChecks does undefined count as a separate type that must be handled.' },
      hints: [`<p>Hint 1: List the errors by flag: implicit any (parameters), possibly undefined (find, tags[0]), uninitialised property, unknown catch variable.</p>`, `<p>Hint 2: Each needs a <i>decision</i>, not a cast: what should happen when the user is missing? When tags is empty? Where does the token come from? What does parse return on bad JSON?</p>`, `<p>Hint 3: Recipe: add a <code>User</code> interface → <code>findUser</code> returns <code>User | undefined</code> → <code>shout</code> uses <code>?.</code> and <code>??</code> → <code>tags[0]?.trim() ?? ""</code> → token via constructor parameter → <code>parse</code> returns <code>unknown</code> or a result union, narrowing <code>e</code> with <code>instanceof Error</code>.</p>`],
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(kind) {\n  var users = [{ id: 1, name: 'Ada' }, { id: 2, name: 'bob' }];\n  if (kind === 'find') return [findUser(users, 2), findUser(users, 9) === undefined];\n  if (kind === 'shout1') return shout(users, 1);\n  if (kind === 'shout2') return shout(users, 2);\n  if (kind === 'shout99') return shout(users, 99);\n  if (kind === 'shoutEmpty') return shout([], 1);\n  if (kind === 'tag0') return firstTag([]);\n  if (kind === 'tag1') return firstTag(['  hi  ', 'x']);\n  if (kind === 'tag2') return firstTag(['   ']);\n  if (kind === 'session') return new Session('t-1').token;\n  if (kind === 'parseOk') return parse('{\"a\":[1,2]}');\n  if (kind === 'parseNum') return parse('5');\n  if (kind === 'parseBad') { var r = parse('{bad'); return [r.ok, typeof r.error, r.error.length > 0]; }\n  if (kind === 'parseEmpty') { var e = parse(''); return [e.ok, typeof e.error]; }\n  if (kind === 'big') { var many = []; for (var i = 0; i < 100000; i++) many.push({ id: i, name: 'u' + i }); return [shout(many, 99999), shout(many, 100000)]; }\n}"},"cases":[[["find"],[{"id":2,"name":"bob"},true]],[["shout1"],"ADA"],[["shout2"],"BOB"],[["shout99"],"UNKNOWN"],[["shoutEmpty"],"UNKNOWN"],[["tag0"],""],[["tag1"],"hi"],[["tag2"],""],[["session"],"t-1"],[["parseOk"],{"ok":true,"value":{"a":[1,2]}}],[["parseNum"],{"ok":true,"value":5}],[["parseBad"],[false,"string",true]],[["parseEmpty"],[false,"string"]],[["big"],["U99999","UNKNOWN"]]]},
      solution: {
        approach: `<p>Fix each error by making the missing case explicit: <code>find</code> honestly returns <code>User | undefined</code>, callers decide the fallback; index access uses optional chaining; the class receives its token in the constructor; <code>parse</code> returns a discriminated result instead of mixing data with error strings, and narrows the <code>unknown</code> catch variable.</p>`,
        code: `interface User { id: number; name: string }

function findUser(users: readonly User[], id: number): User | undefined {
  return users.find((u) => u.id === id);
}

function shout(users: readonly User[], id: number): string {
  // explicit decision: unknown users are shown as "UNKNOWN"
  return findUser(users, id)?.name.toUpperCase() ?? "UNKNOWN";
}

function firstTag(tags: readonly string[]): string {
  return tags[0]?.trim() ?? ""; // tags[0]: string | undefined
}

class Session {
  constructor(public readonly token: string) {} // always initialised
}

type ParseResult = { ok: true; value: unknown } | { ok: false; error: string };
function parse(json: string): ParseResult {
  try {
    return { ok: true, value: JSON.parse(json) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const users: User[] = [{ id: 1, name: "Ada" }];
console.log(shout(users, 1), shout(users, 99), firstTag([]), new Session("t-1").token);
const r = parse("{bad");
console.log(r.ok ? r.value : "error: " + r.error);`,
        dry: { head: ['original line', 'flag', 'error', 'fix'], rows: [['findUser(users, id)', 'noImplicitAny', 'implicit any params', 'User interface + annotations'], ['findUser(...).name', 'strictNullChecks', 'possibly undefined', '?. and ?? "UNKNOWN"'], ['tags[0].trim()', 'noUncheckedIndexedAccess', 'possibly undefined', 'tags[0]?.trim() ?? ""'], ['token: string', 'strictPropertyInitialization', 'not definitely assigned', 'constructor parameter'], ['e.message', 'useUnknownInCatchVariables', 'e is unknown', 'instanceof Error narrowing']] },
        complexity: `<p>Same runtime complexity as before (find is O(n)). The win is that two crash paths are now handled, and the types tell callers the truth.</p>`,
        followUps: ['How would you roll this out across 2,000 files without blocking every team?', 'When is throwing better than returning a fallback like "UNKNOWN"?', 'Note: the constructor parameter property is not erasable syntax. Rewrite <code>Session</code> for an <code>erasableSyntaxOnly</code> codebase.']
      }
    }]
  });

  /* ================= PRACTICE (Easy → Medium → Hard) ================= */
  practice.push({
    title: 'Add Types: formatPrice', level: 'Easy', tags: ['annotations', 'optional parameters', 'inference'], companies: ['Shopify', 'Etsy'],
    statement: `<p>Add types to this JavaScript function so that it compiles under <code>strict</code>, the currency defaults to <code>"USD"</code>, only <code>"USD" | "EUR" | "INR"</code> are accepted, and the return type is explicit.</p>
<pre>export function formatPrice(amount, currency = "USD") {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}</pre>`,
    constraints: `No <code>any</code>. Use a literal union for the currency. Calling <code>formatPrice("10")</code> or <code>formatPrice(10, "GBP")</code> must be a compile error.`,
    example: `<p><code>formatPrice(12.5)</code> → ${H.c('g', '"$12.50"')}; <code>formatPrice(99, "EUR")</code> → ${H.c('g', '"€99.00"')}; <code>formatPrice(10, "GBP")</code> → ${H.c('r', 'error: "GBP" is not assignable to Currency')}.</p>`,
    brute: { why: `<p>Annotating <code>currency: string</code> compiles but accepts <code>"usd"</code> or <code>"DOLLARS"</code>, which throw a <code>RangeError</code> inside <code>Intl.NumberFormat</code> at runtime.</p>`, code: `export function formatPrice(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}
// compiles, but throws RangeError: Invalid currency code at runtime
try { formatPrice(5, "DOLLARS"); } catch (e) { console.log(e instanceof RangeError); }` },
    mcq: { q: 'With a default value <code>currency = "USD"</code> and no annotation, what type would TS infer for <code>currency</code>?', options: ['"USD"', 'string', 'Currency', 'any'], answer: 1, explain: 'A default value in a parameter position is a mutable location, so the literal is widened to string. You need an explicit annotation to get the union.' },
    hints: [`<p>Hint 1: A parameter with a default value is automatically optional for callers — no <code>?</code> needed.</p>`, `<p>Hint 2: Declare <code>type Currency = "USD" | "EUR" | "INR"</code> and annotate the parameter with it; the default must be one of the members.</p>`, `<p>Hint 3: Recipe: <code>amount: number</code>, <code>currency: Currency = "USD"</code>, <code>: string</code> return. Verify bad calls with <code>@ts-expect-error</code>.</p>`],
    tests: {"sig":"double string -> string","fn":"formatPrice","cases":[[[12.5,"USD"],"$12.50"],[[99,"EUR"],"€99.00"],[[1234.5,"INR"],"₹1,234.50"],[[0,"USD"],"$0.00"],[[-5,"USD"],"-$5.00"],[[1000000000,"USD"],"$1,000,000,000.00"],[[0.1,"USD"],"$0.10"],[[2.999,"EUR"],"€3.00"]]},
    solution: {
      approach: `<p>Model the allowed currencies as a literal union, annotate the parameter (the default keeps it optional), and declare the return type since the function is exported.</p>`,
      code: `export type Currency = "USD" | "EUR" | "INR";

export function formatPrice(amount: number, currency: Currency = "USD"): string {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}

console.log(formatPrice(12.5), formatPrice(99, "EUR"));
// @ts-expect-error -- Argument of type '"GBP"' is not assignable to parameter of type 'Currency'
formatPrice(10, "GBP");
// @ts-expect-error -- Argument of type 'string' is not assignable to parameter of type 'number'
formatPrice("10");`,
      dry: { head: ['call', 'amount', 'currency', 'result'], rows: [['formatPrice(12.5)', 'number', '"USD" (default)', '"$12.50"'], ['formatPrice(99, "EUR")', 'number', '"EUR"', '"€99.00"'], ['formatPrice(10, "GBP")', 'number', H.c('r', 'not in union'), H.c('r', 'compile error')]] },
      complexity: `<p>O(1) per call. Types are erased; the union check happens only at compile time.</p>`,
      followUps: ['Derive <code>Currency</code> from a runtime array so a select box can list them.', 'Accept a <code>locale</code> parameter too — what type would you give it?']
    }
  });

  practice.push({
    title: 'Literal Union: Next Traffic Light', level: 'Easy', tags: ['literal types', 'union', 'exhaustiveness'], companies: ['Uber', 'Tesla'],
    statement: `<p>Write <code>next(light)</code> for a traffic light that cycles <code>"red" → "green" → "yellow" → "red"</code>. The parameter and return type must be a literal union so that <code>next("blue")</code> does not compile and the compiler complains if a colour is added but not handled.</p>`,
    constraints: `Use a <code>switch</code> with an exhaustive <code>never</code> check, or a lookup object typed with <code>Record</code>.`,
    example: `<p><code>next("red")</code> → ${H.c('g', '"green"')}; <code>next("yellow")</code> → ${H.c('g', '"red"')}; <code>next("blue")</code> → ${H.c('r', 'compile error')}.</p>`,
    brute: { why: `<p>Using <code>string</code> accepts any colour and returns <code>undefined</code> for unknown ones — a silent bug the type system could have prevented.</p>`, code: `function next(light: string): string | undefined {
  if (light === "red") return "green";
  if (light === "green") return "yellow";
  if (light === "yellow") return "red";
  return undefined; // "blue" silently produces undefined
}
console.log(next("blue"));` },
    mcq: { q: 'Which approach makes adding <code>"flashing"</code> to the union a compile error until it is handled?', options: ['A default branch that returns "red"', 'Record&lt;Light, Light&gt; lookup or a switch with a never check', 'Typing the return as string', 'Using an if/else chain'], answer: 1, explain: 'Record&lt;Light, Light&gt; requires a key for every member; a never check fails when a member is left over. A default branch hides the new member.' },
    hints: [`<p>Hint 1: <code>type Light = "red" | "green" | "yellow"</code>.</p>`, `<p>Hint 2: <code>const NEXT: Record&lt;Light, Light&gt; = { ... }</code> — TS demands every key.</p>`, `<p>Hint 3: Recipe: union type → Record lookup (or switch + <code>const _x: never = light</code>) → return type <code>Light</code>.</p>`],
    tests: {"sig":"string int -> string","fn":"chk","harness":{"js":"\nfunction chk(start, steps) { var l = start; for (var i = 0; i < steps; i++) l = next(l); return l; }"},"cases":[[["red",0],"red"],[["red",1],"green"],[["green",1],"yellow"],[["yellow",1],"red"],[["red",3],"red"],[["red",2],"yellow"],[["green",1000],"yellow"],[["yellow",999999],"yellow"]]},
    solution: {
      approach: `<p>A <code>Record&lt;Light, Light&gt;</code> table is the shortest exhaustive solution: missing keys and extra keys are both compile errors, and the return type stays the literal union.</p>`,
      code: `type Light = "red" | "green" | "yellow";

const NEXT: Record<Light, Light> = {
  red: "green",
  green: "yellow",
  yellow: "red",
};

function next(light: Light): Light {
  return NEXT[light];
}

console.log(next("red"), next("yellow"));
// @ts-expect-error -- Argument of type '"blue"' is not assignable to parameter of type 'Light'
next("blue");`,
      dry: { head: ['input', 'NEXT[input]', 'type'], rows: [['"red"', '"green"', 'Light'], ['"green"', '"yellow"', 'Light'], ['"yellow"', '"red"', 'Light'], ['"blue"', '—', H.c('r', 'compile error')]] },
      complexity: `<p>O(1) lookup. Adding a colour to <code>Light</code> forces a new entry in <code>NEXT</code>.</p>`,
      followUps: ['Write the switch version with an <code>assertNever</code> default.', 'Add a pedestrian "walk" state that only follows "red".']
    }
  });

  practice.push({
    title: 'Fix "Object Is Possibly undefined": Full Name', level: 'Easy', tags: ['strictNullChecks', 'optional properties', 'narrowing'], companies: ['LinkedIn', 'Meta'],
    statement: `<p>Under <code>strict</code>, this code fails with <i>"'user.middle' is possibly 'undefined'"</i>. Fix it so that the full name is <code>"Ada K. Lovelace"</code> when a middle name exists and <code>"Ada Lovelace"</code> otherwise — without using <code>!</code>.</p>
<pre>interface User { first: string; middle?: string; last: string }
function fullName(user: User): string {
  return user.first + " " + user.middle[0] + ". " + user.last;
}</pre>`,
    constraints: `No non-null assertion, no <code>as</code>. Handle empty-string middle names like missing ones.`,
    example: `<p><code>{ first: "Ada", middle: "King", last: "Lovelace" }</code> → ${H.c('g', '"Ada K. Lovelace"')}. <code>{ first: "Ada", last: "Lovelace" }</code> → ${H.c('g', '"Ada Lovelace"')} (the old code produced a crash: <i>Cannot read properties of undefined</i>).</p>`,
    brute: { why: `<p><code>user.middle![0]</code> compiles and still crashes for users without a middle name — the assertion just lies to the compiler.</p>`, code: `interface User { first: string; middle?: string; last: string }
function fullName(user: User): string {
  return user.first + " " + user.middle![0] + ". " + user.last; // crashes when middle is missing
}
try { fullName({ first: "Ada", last: "Lovelace" }); } catch (e) { console.log("crash"); }` },
    mcq: { q: 'What type does <code>user.middle</code> have inside <code>if (user.middle) { ... }</code>?', options: ['string | undefined', 'string', 'never', '"" | string'], answer: 1, explain: 'Truthiness narrowing removes undefined (and the empty string is excluded at runtime, though the type remains string).' },
    hints: [`<p>Hint 1: <code>middle?: string</code> means its type is <code>string | undefined</code>.</p>`, `<p>Hint 2: A truthiness check also skips <code>""</code> — exactly what we want here.</p>`, `<p>Hint 3: Recipe: build an array of parts, push the initial only when <code>user.middle</code> is truthy, join with spaces.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(json) { return fullName(JSON.parse(json)); }"},"cases":[[["{\"first\":\"Ada\",\"middle\":\"King\",\"last\":\"Lovelace\"}"],"Ada K. Lovelace"],[["{\"first\":\"Ada\",\"last\":\"Lovelace\"}"],"Ada Lovelace"],[["{\"first\":\"Ada\",\"middle\":\"\",\"last\":\"Lovelace\"}"],"Ada Lovelace"],[["{\"first\":\"Ada\",\"middle\":\"a\",\"last\":\"Lovelace\"}"],"Ada a. Lovelace"],[["{\"first\":\"A\",\"middle\":\"B\",\"last\":\"C\"}"],"A B. C"],[["{\"first\":\"\",\"last\":\"\"}"]," "],[["{\"first\":\"Jean\",\"middle\":\"élan\",\"last\":\"Du\"}"],"Jean é. Du"]]},
    solution: {
      approach: `<p>Narrow with a truthiness check (which deliberately treats <code>""</code> as missing), then build the name from parts. Inside the branch <code>user.middle</code> is <code>string</code>.</p>`,
      code: `interface User { first: string; middle?: string; last: string }

function fullName(user: User): string {
  const parts: string[] = [user.first];
  if (user.middle) {                 // narrows string | undefined to string
    parts.push(user.middle.charAt(0) + ".");
  }
  parts.push(user.last);
  return parts.join(" ");
}

console.log(fullName({ first: "Ada", middle: "King", last: "Lovelace" })); // Ada K. Lovelace
console.log(fullName({ first: "Ada", last: "Lovelace" }));                 // Ada Lovelace
console.log(fullName({ first: "Ada", middle: "", last: "Lovelace" }));     // Ada Lovelace`,
      dry: { head: ['middle', 'if (user.middle)', 'parts', 'result'], rows: [['"King"', 'true → string', '[Ada, K., Lovelace]', 'Ada K. Lovelace'], ['undefined', 'false', '[Ada, Lovelace]', 'Ada Lovelace'], ['""', 'false', '[Ada, Lovelace]', 'Ada Lovelace']] },
      complexity: `<p>O(1). The narrowing is free at runtime; it is just an <code>if</code>.</p>`,
      followUps: ['Rewrite as a one-liner with optional chaining and a template literal.', 'What changes with <code>exactOptionalPropertyTypes</code> on?']
    }
  });

  practice.push({
    title: 'Generic last<T>: Keep the Element Type', level: 'Easy', tags: ['generics', 'readonly arrays', 'inference'], companies: ['Google', 'Atlassian'],
    statement: `<p>Write <code>last(arr)</code> that returns the last element of any array. <code>last([1, 2, 3])</code> must be typed <code>number | undefined</code>, <code>last(["a"])</code> <code>string | undefined</code>, and it must accept <code>readonly</code> arrays and tuples created with <code>as const</code>.</p>`,
    constraints: `One type parameter. No <code>any</code>. Empty array returns <code>undefined</code>.`,
    example: `<p><code>last([1, 2, 3])</code> → ${H.c('g', '3 (number | undefined)')}; <code>last([])</code> → ${H.c('g', 'undefined')}; <code>last(["x", "y"] as const)</code> → ${H.c('g', '"y" ("x" | "y" | undefined)')}.</p>`,
    brute: { why: `<p>Typing the parameter as <code>any[]</code> returns <code>any</code>: callers lose the element type and can call nonexistent methods without errors.</p>`, code: `function last(arr: any[]): any {
  return arr[arr.length - 1];
}
const v = last([1, 2, 3]);
console.log(v.toUpperCase === undefined); // v is any: v.toUpperCase() would compile and crash` },
    mcq: { q: 'Why type the parameter as <code>readonly T[]</code> instead of <code>T[]</code>?', options: ['It is faster', 'A readonly array cannot be passed where a mutable T[] is required, but a mutable array can be passed as readonly', 'readonly is required for generics', 'It changes the return type'], answer: 1, explain: 'Accepting readonly T[] is the more permissive input type: both mutable and readonly arrays (and as const tuples) are assignable to it.' },
    hints: [`<p>Hint 1: T should be inferred from the array argument.</p>`, `<p>Hint 2: <code>function last&lt;T&gt;(arr: readonly T[]): T | undefined</code>.</p>`, `<p>Hint 3: Use <code>arr.at(-1)</code> (ES2022), which already returns <code>T | undefined</code>, or index with <code>arr.length - 1</code>.</p>`],
    tests: {"sig":"int[] -> int","fn":"last","cases":[[[[1,2,3]],3],[[[]],null],[[[5]],5],[[[-1,0]],0],[[[0,0,0]],0],[[[7,-9,-3]],-3],[[{"$range":[0,1000000]}],999999]]},
    solution: {
      approach: `<p>One type parameter ties the array's element type to the return type. Accept <code>readonly T[]</code> so tuples and readonly arrays work, and include <code>undefined</code> in the return type for empty arrays.</p>`,
      code: `function last<T>(arr: readonly T[]): T | undefined {
  return arr.at(-1); // ES2022: negative index from the end, undefined when empty
}

const a = last([1, 2, 3]);           // number | undefined
const b = last<string>([]);          // string | undefined
const c = last(["x", "y"] as const); // "x" | "y" | undefined
console.log(a, b, c);
if (a !== undefined) console.log(a.toFixed(1)); // narrowed to number`,
      dry: { head: ['call', 'T inferred', 'returns'], rows: [['last([1, 2, 3])', 'number', '3'], ['last&lt;string&gt;([])', 'string (explicit)', 'undefined'], ['last(["x","y"] as const)', '"x" | "y"', '"y"']] },
      complexity: `<p>O(1). Generics are erased: the JS is just <code>arr.at(-1)</code>.</p>`,
      followUps: ['Write <code>lastOr&lt;T&gt;(arr, fallback: T): T</code>.', 'For a tuple <code>[1, "a"]</code>, could you return exactly <code>"a"</code>? (Preview of module 11.)']
    }
  });

  practice.push({
    title: 'Narrowing: Normalize string | string[] | null | undefined', level: 'Medium', tags: ['narrowing', 'typeof', 'Array.isArray', 'unions'], companies: ['Stripe', 'Vercel'],
    statement: `<p>A config option <code>tags</code> may be a single string, an array of strings, <code>null</code>, or missing. Write <code>normalizeTags(input)</code> that always returns a clean <code>string[]</code>: trimmed, lower-cased, no empty strings, no duplicates, in first-seen order. A comma-separated single string should be split.</p>`,
    constraints: `Input type: <code>string | string[] | null | undefined</code>. No casts. Every branch must be narrowed by a real check.`,
    example: `<p><code>" A, b ,a"</code> → ${H.c('g', '["a", "b"]')}; <code>["X", " x ", ""]</code> → ${H.c('g', '["x"]')}; <code>null</code> → ${H.c('g', '[]')}. Why: we split strings on commas, then trim, lower-case, drop empties, and de-duplicate with a <code>Set</code>.</p>`,
    brute: { why: `<p>Treating the input as <code>any</code> and calling <code>input.split</code> crashes for arrays and null; calling <code>.map</code> crashes for strings. Without narrowing, each shape breaks a different line.</p>`, code: `function normalizeTags(input: any): string[] {
  return input.split(",").map((t: string) => t.trim().toLowerCase()); // arrays and null crash
}
try { normalizeTags(["a"]); } catch (e) { console.log("crash for arrays"); }` },
    mcq: { q: 'After <code>if (input == null) return [];</code>, what type is <code>input</code>?', options: ['string | string[] | undefined', 'string | string[]', 'string', 'never'], answer: 1, explain: 'Loose equality with null (== null) matches both null and undefined, so both are removed by the narrowing.' },
    hints: [`<p>Hint 1: Handle the empty cases first with <code>input == null</code> (removes null and undefined together).</p>`, `<p>Hint 2: Then <code>typeof input === "string"</code> → split; otherwise it must be <code>string[]</code>.</p>`, `<p>Hint 3: Recipe: get a raw <code>string[]</code> → <code>map(trim + toLowerCase)</code> → <code>filter(Boolean-ish)</code> → <code>[...new Set(list)]</code>.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(json) {\n  if (json === 'BIG') { var tags = []; for (var i = 0; i < 100000; i++) tags.push(' T' + (i % 100) + ' '); var r = normalizeTags(tags); return [r.length, r[0], r[99]]; }\n  return normalizeTags(json === 'undefined' ? undefined : JSON.parse(json));\n}"},"cases":[[["\" A, b ,a\""],["a","b"]],[["[\"X\",\" x \",\"\"]"],["x"]],[["null"],[]],[["undefined"],[]],[["\"\""],[]],[["\"a,,b, ,A\""],["a","b"]],[["[\"B\",\"a\",\"b\"]"],["b","a"]],[["\"Hello\""],["hello"]],[["[]"],[]],[["BIG"],[100,"t0","t99"]]]},
    solution: {
      approach: `<p>Three narrowing steps turn a 4-member union into one shape: <code>== null</code> removes null/undefined, <code>typeof</code> handles the single string, and what remains is <code>string[]</code>. Then a normal pipeline cleans the list; a <code>Set</code> keeps insertion order while removing duplicates.</p>`,
      code: `function normalizeTags(input: string | string[] | null | undefined): string[] {
  if (input == null) return [];                         // input: string | string[]
  const raw = typeof input === "string" ? input.split(",") : input; // raw: string[]
  const cleaned = raw.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0);
  return [...new Set(cleaned)];
}

console.log(normalizeTags(" A, b ,a"));     // ["a", "b"]
console.log(normalizeTags(["X", " x ", ""])); // ["x"]
console.log(normalizeTags(null), normalizeTags(undefined)); // [] []`,
      dry: { head: ['input', 'after == null', 'raw', 'result'], rows: [['" A, b ,a"', 'string', '[" A"," b ","a"]', '["a","b"]'], ['["X"," x ",""]', 'string[]', 'same', '["x"]'], ['null', 'returned early', '—', '[]']] },
      complexity: `<p>O(n) over the total characters/tags; the <code>Set</code> gives O(1) average de-duplication.</p>`,
      followUps: ['Accept <code>readonly string[]</code> too — does anything change?', 'Return a branded <code>NormalizedTag[]</code> so un-normalized tags cannot be passed by mistake.']
    }
  });

  practice.push({
    title: 'Write a Type Guard for Untrusted JSON', level: 'Medium', tags: ['type predicates', 'unknown', 'in operator', 'runtime validation'], companies: ['Stripe', 'Plaid', 'Coinbase'],
    statement: `<p>An endpoint returns JSON that should match <code>interface Product { id: string; price: number; tags: string[]; discount?: number }</code>. Write <code>isProduct(value: unknown): value is Product</code> that checks <b>every</b> field (including array contents and the optional field), and <code>parseProducts(text)</code> that returns only the valid products from a JSON array, counting the rejected ones.</p>`,
    constraints: `No <code>any</code>, no <code>as Product</code>. <code>discount</code> may be missing, but if present must be a number between 0 and 1.`,
    example: `<p>Input <code>[{"id":"a","price":5,"tags":["x"]}, {"id":"b","price":"5","tags":[]}, {"id":"c","price":2,"tags":[1]}]</code> → ${H.c('g', '1 valid (a)')}, ${H.c('r', '2 rejected')}: <code>b</code> has a string price, <code>c</code> has a numeric tag.</p>`,
    brute: { why: `<p><code>JSON.parse(text) as Product[]</code> trusts the server completely. A string price makes <code>price * qty</code> produce string concatenation or <code>NaN</code> far away from the real cause.</p>`, code: `interface Product { id: string; price: number; tags: string[]; discount?: number }
const items = JSON.parse('[{"id":"b","price":"5","tags":[]}]') as Product[];
console.log(items[0]?.price.toFixed(2)); // TypeError: toFixed is not a function (price is "5")` },
    mcq: { q: 'Why must the guard check each element of <code>tags</code>, not just <code>Array.isArray(tags)</code>?', options: ['Array.isArray is slow', 'Array.isArray only proves "some array"; Product promises string elements', 'TS requires it to compile', 'It does not matter'], answer: 1, explain: 'TS trusts the predicate. If you only check the array, a [1, 2] passes and code calling tag.toUpperCase() crashes.' },
    hints: [`<p>Hint 1: Start with <code>typeof value === "object" &amp;&amp; value !== null</code>; then use <code>"id" in value</code> to safely read <code>value.id</code> (TS 4.9+ narrowing).</p>`, `<p>Hint 2: For the optional field: <code>!("discount" in v) || (typeof v.discount === "number" &amp;&amp; v.discount &gt;= 0 &amp;&amp; v.discount &lt;= 1)</code>.</p>`, `<p>Hint 3: <code>parseProducts</code>: parse to <code>unknown</code>, check <code>Array.isArray</code>, then <code>filter(isProduct)</code> — the predicate narrows the result to <code>Product[]</code>.</p>`],
    tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, json) {\n  if (kind === 'is') return isProduct(JSON.parse(json));\n  if (kind === 'parse') { var r = parseProducts(json); return [r.valid.map(function (p) { return p.id; }), r.rejected]; }\n  if (kind === 'big') { var arr = []; for (var i = 0; i < 100000; i++) arr.push(i % 2 ? { id: 'x' + i, price: '1', tags: [] } : { id: 'x' + i, price: i, tags: ['t'] }); var o = parseProducts(JSON.stringify(arr)); return [o.valid.length, o.rejected]; }\n}"},"cases":[[["parse","[{\"id\":\"a\",\"price\":5,\"tags\":[\"x\"]},{\"id\":\"b\",\"price\":\"5\",\"tags\":[]},{\"id\":\"c\",\"price\":2,\"tags\":[1]}]"],[["a"],2]],[["is","{\"id\":\"a\",\"price\":1,\"tags\":[],\"discount\":0.5}"],true],[["is","{\"id\":\"a\",\"price\":1,\"tags\":[],\"discount\":1.5}"],false],[["is","{\"id\":\"a\",\"price\":1,\"tags\":[],\"discount\":\"x\"}"],false],[["is","{\"id\":\"a\",\"price\":1,\"tags\":[],\"discount\":0}"],true],[["is","{\"id\":\"a\",\"price\":1,\"tags\":[],\"discount\":-0.1}"],false],[["is","{\"id\":\"a\",\"price\":1}"],false],[["is","{\"id\":1,\"price\":1,\"tags\":[]}"],false],[["is","null"],false],[["is","[]"],false],[["is","\"text\""],false],[["parse","{\"a\":1}"],[[],0]],[["parse","[]"],[[],0]],[["parse","null"],[[],0]],[["big",""],[50000,50000]]]},
    solution: {
      approach: `<p>Narrow step by step from <code>unknown</code>: object → each required key with <code>in</code> and <code>typeof</code> → array contents with <code>every</code> → optional field only when present. Passing the predicate to <code>filter</code> narrows the array type automatically.</p>`,
      code: `interface Product { id: string; price: number; tags: string[]; discount?: number }

function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) return false;
  if (!("id" in value) || typeof value.id !== "string") return false;
  if (!("price" in value) || typeof value.price !== "number" || !Number.isFinite(value.price)) return false;
  if (!("tags" in value) || !Array.isArray(value.tags)) return false;
  if (!value.tags.every((t: unknown) => typeof t === "string")) return false;
  if ("discount" in value) {
    const d = value.discount;
    if (typeof d !== "number" || d < 0 || d > 1) return false;
  }
  return true;
}

function parseProducts(text: string): { valid: Product[]; rejected: number } {
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data)) return { valid: [], rejected: 0 };
  const valid = data.filter(isProduct); // Product[]
  return { valid, rejected: data.length - valid.length };
}

const res = parseProducts('[{"id":"a","price":5,"tags":["x"]},{"id":"b","price":"5","tags":[]},{"id":"c","price":2,"tags":[1]}]');
console.log(res.valid.map((p) => p.id), res.rejected); // ["a"] 2`,
      dry: { head: ['item', 'failed check', 'kept?'], rows: [['a', '—', H.c('g', 'yes')], ['b', 'typeof price !== "number"', H.c('r', 'no')], ['c', 'tags.every(string) is false', H.c('r', 'no')]] },
      complexity: `<p>O(total size of the JSON) — every field and tag is checked once.</p>`,
      followUps: ['Rewrite with a schema library (Zod/Valibot) and derive the type from the schema.', 'Return per-item error messages instead of a boolean.', 'How would you handle extra unexpected fields?']
    }
  });

  practice.push({
    title: 'Discriminated Union: RemoteData<T> for Async UI', level: 'Medium', tags: ['discriminated union', 'generics', 'exhaustiveness'], companies: ['Airbnb', 'Netflix', 'Spotify'],
    statement: `<p>Model the state of any async request with a <b>generic</b> discriminated union <code>RemoteData&lt;T&gt;</code> with four states: <code>notAsked</code>, <code>loading</code>, <code>failure</code> (with <code>error: string</code>), <code>success</code> (with <code>data: T</code>). Write <code>fold</code>, which takes one handler per state and returns their result, so UI code can never forget a state.</p>`,
    constraints: `No optional fields. <code>fold</code> must be generic in both <code>T</code> (data) and <code>R</code> (result). Exhaustiveness must be enforced by the types.`,
    example: `<p><code>fold({ status: "success", data: [1, 2] }, { notAsked: () =&gt; "-", loading: () =&gt; "...", failure: (e) =&gt; "!" + e, success: (d) =&gt; "n=" + d.length })</code> → ${H.c('g', '"n=2"')}. Leaving out <code>loading</code> → ${H.c('r', 'compile error: property loading is missing')}.</p>`,
    brute: { why: `<p>The usual <code>{ loading: boolean; error?: string; data?: T }</code> allows nonsense like loading + error + data together, and every consumer re-checks <code>data !== undefined</code> with no guarantee all states are rendered.</p>`, code: `interface Loose<T> { loading: boolean; error?: string; data?: T }
function view(s: Loose<number[]>): string {
  if (s.loading) return "...";
  if (s.error) return "!" + s.error;
  return "n=" + (s.data?.length ?? 0); // "not asked" and "empty" look the same
}
console.log(view({ loading: false }));` },
    mcq: { q: 'Why make <code>fold</code> take an object of handlers instead of a switch at every call site?', options: ['It is faster', 'The handlers object type requires a key for every state, so a missing state is a compile error everywhere', 'Switch statements cannot narrow', 'Generics do not work with switch'], answer: 1, explain: 'A required property per state turns "forgot to render loading" into a missing-property error at each call site.' },
    hints: [`<p>Hint 1: <code>type RemoteData&lt;T&gt; = { status: "notAsked" } | { status: "loading" } | { status: "failure"; error: string } | { status: "success"; data: T }</code>.</p>`, `<p>Hint 2: Handlers type: <code>{ notAsked: () =&gt; R; loading: () =&gt; R; failure: (e: string) =&gt; R; success: (d: T) =&gt; R }</code>.</p>`, `<p>Hint 3: Inside <code>fold</code>, switch on <code>rd.status</code>, call the right handler, and end with an <code>assertNever</code> default.</p>`],
    tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(json, kind) {\n  var h = { notAsked: function () { return '-'; }, loading: function () { return '...'; }, failure: function (e) { return '!' + e; }, success: function (d) { return 'n=' + d.length; } };\n  try { return fold(JSON.parse(json), h); } catch (e) { return e.message; }\n}"},"cases":[[["{\"status\":\"success\",\"data\":[1,2]}",""],"n=2"],[["{\"status\":\"success\",\"data\":[]}",""],"n=0"],[["{\"status\":\"notAsked\"}",""],"-"],[["{\"status\":\"loading\"}",""],"..."],[["{\"status\":\"failure\",\"error\":\"boom\"}",""],"!boom"],[["{\"status\":\"failure\",\"error\":\"\"}",""],"!"],[["{\"status\":\"weird\"}",""],"Unexpected state {\"status\":\"weird\"}"]]},
    solution: {
      approach: `<p>A generic discriminated union captures exactly four legal states. <code>fold</code> pattern-matches inside one place (with an exhaustive switch) and exposes a handlers object whose type demands every state, so callers get exhaustiveness for free and a precisely typed <code>data</code>.</p>`,
      code: `type RemoteData<T> =
  | { status: "notAsked" }
  | { status: "loading" }
  | { status: "failure"; error: string }
  | { status: "success"; data: T };

interface Handlers<T, R> {
  notAsked: () => R;
  loading: () => R;
  failure: (error: string) => R;
  success: (data: T) => R;
}

function assertNever(x: never): never {
  throw new Error("Unexpected state " + JSON.stringify(x));
}

function fold<T, R>(rd: RemoteData<T>, h: Handlers<T, R>): R {
  switch (rd.status) {
    case "notAsked": return h.notAsked();
    case "loading":  return h.loading();
    case "failure":  return h.failure(rd.error);
    case "success":  return h.success(rd.data);
    default:         return assertNever(rd);
  }
}

const state: RemoteData<number[]> = { status: "success", data: [1, 2] };
const label = fold(state, {
  notAsked: () => "-",
  loading: () => "...",
  failure: (e) => "!" + e,
  success: (d) => "n=" + d.length, // d: number[]
});
console.log(label); // n=2`,
      dry: { head: ['rd.status', 'narrowed rd', 'handler called', 'R'], rows: [['"loading"', '{ status: "loading" }', 'h.loading()', 'string'], ['"failure"', '{ ...; error: string }', 'h.failure(rd.error)', 'string'], ['"success"', '{ ...; data: number[] }', 'h.success(rd.data)', '"n=2"']] },
      complexity: `<p>O(1) per fold. Four legal states instead of 2 × 2 × 2 = 8 combinations.</p>`,
      followUps: ['Add <code>map&lt;T, U&gt;(rd, f: (t: T) =&gt; U): RemoteData&lt;U&gt;</code>.', 'Store a typed error object instead of a string.', 'Keep stale data visible while reloading — how does the union change?']
    }
  });

  practice.push({
    title: 'Generic pluck<T, K>: Type-Safe Column Extraction', level: 'Medium', tags: ['generics', 'keyof', 'indexed access'], companies: ['Amazon', 'Snowflake'],
    statement: `<p>Write <code>pluck(items, key)</code> that returns an array of one property from every object. The key must be a real property of the items (typos are compile errors), and the result must have the exact property type: <code>pluck(users, "age")</code> is <code>number[]</code>, <code>pluck(users, "name")</code> is <code>string[]</code>.</p>`,
    constraints: `Two type parameters, inferred from the call. No <code>any</code>, no casts.`,
    example: `<p><code>pluck([{ name: "Ada", age: 36 }, { name: "Alan", age: 41 }], "age")</code> → ${H.c('g', '[36, 41] (number[])')}. <code>pluck(users, "agee")</code> → ${H.c('r', 'error: "agee" is not assignable to "name" | "age"')}.</p>`,
    brute: { why: `<p>With <code>key: string</code> and an <code>any</code> result, typos return arrays of <code>undefined</code> and the caller has no idea what type comes back.</p>`, code: `function pluck(items: Record<string, unknown>[], key: string): unknown[] {
  return items.map((it) => it[key]);
}
console.log(pluck([{ name: "Ada", age: 36 }], "agee")); // [undefined], no error` },
    mcq: { q: 'What is the type of <code>T[K]</code> when <code>T = { name: string; age: number }</code> and <code>K = "age"</code>?', options: ['string | number', 'number', '"age"', 'unknown'], answer: 1, explain: 'T[K] is an indexed access type: the type of property K in T, here number.' },
    hints: [`<p>Hint 1: <code>K extends keyof T</code> restricts the key to T's property names.</p>`, `<p>Hint 2: The element type of the result is the indexed access type <code>T[K]</code>.</p>`, `<p>Hint 3: Signature: <code>function pluck&lt;T, K extends keyof T&gt;(items: readonly T[], key: K): T[K][]</code>; body is a single <code>map</code>.</p>`],
    tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(json, key) {\n  if (json === 'BIG') { var items = []; for (var i = 0; i < 100000; i++) items.push({ v: i }); var r = pluck(items, 'v'); return [r.length, r[99999]]; }\n  return pluck(JSON.parse(json), key);\n}"},"cases":[[["[{\"name\":\"Ada\",\"age\":36},{\"name\":\"Alan\",\"age\":41}]","age"],[36,41]],[["[{\"name\":\"Ada\",\"age\":36},{\"name\":\"Alan\",\"age\":41}]","name"],["Ada","Alan"]],[["[{\"ok\":true},{\"ok\":false}]","ok"],[true,false]],[["[]","x"],[]],[["[{\"n\":{\"a\":1}}]","n"],[{"a":1}]],[["[{\"v\":0},{\"v\":-1}]","v"],[0,-1]],[["BIG","v"],[100000,99999]]]},
    solution: {
      approach: `<p><code>T</code> is inferred from the items, <code>K</code> from the key literal, constrained to <code>keyof T</code>. The return type <code>T[K][]</code> looks up the exact property type, so each call site gets a precise array type.</p>`,
      code: `function pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

const users = [
  { name: "Ada", age: 36, admin: true },
  { name: "Alan", age: 41, admin: false },
];
const ages = pluck(users, "age");     // number[]
const names = pluck(users, "name");   // string[]
console.log(ages.reduce((a, b) => a + b, 0), names.join(", "));
// @ts-expect-error -- Argument of type '"agee"' is not assignable to parameter of type '"name" | "age" | "admin"'
pluck(users, "agee");`,
      dry: { head: ['call', 'T', 'K', 'returns'], rows: [['pluck(users, "age")', '{ name; age; admin }', '"age"', 'number[] = [36, 41]'], ['pluck(users, "name")', 'same', '"name"', 'string[]'], ['pluck(users, "agee")', 'same', H.c('r', 'not in keyof T'), H.c('r', 'error')]] },
      complexity: `<p>O(n). Type-level work is constant per call.</p>`,
      followUps: ['Pluck several keys at once: return <code>Pick&lt;T, K&gt;[]</code> for <code>keys: K[]</code>.', 'Why does <code>K extends keyof T</code> also accept number and symbol keys?']
    }
  });

  practice.push({
    title: 'Config Defaults: Merge Partial Overrides Safely', level: 'Medium', tags: ['generics', 'Partial', 'object types', 'exactOptionalPropertyTypes'], companies: ['Vercel', 'Datadog'],
    statement: `<p>Write <code>withDefaults(defaults, overrides)</code> that returns a complete config. Overrides may contain any subset of keys; unknown keys must be compile errors; explicitly passing <code>undefined</code> for a key must <b>not</b> erase the default (a common spread bug).</p>`,
    constraints: `Generic in the config type. No <code>any</code>. Return type must be the full config type.`,
    example: `<p>defaults <code>{ port: 3000, host: "localhost", debug: false }</code>, overrides <code>{ port: 8080, debug: undefined }</code> → ${H.c('g', '{ port: 8080, host: "localhost", debug: false }')}. Plain spread would give ${H.c('r', 'debug: undefined')}.</p>`,
    brute: { why: `<p><code>{ ...defaults, ...overrides }</code> copies <code>undefined</code> values over defaults, and with a loose <code>Partial</code> type TS cannot warn you (unless <code>exactOptionalPropertyTypes</code> is on).</p>`, code: `interface Cfg { port: number; host: string; debug: boolean }
const defaults: Cfg = { port: 3000, host: "localhost", debug: false };
const merged = { ...defaults, ...{ port: 8080, debug: undefined } };
console.log(merged.debug); // undefined — the default was erased` },
    mcq: { q: 'What does <code>Partial&lt;Cfg&gt;</code> do?', options: ['Removes properties', 'Makes every property optional', 'Makes every property readonly', 'Picks some properties'], answer: 1, explain: 'Partial maps over the keys of Cfg and adds ? to each one.' },
    hints: [`<p>Hint 1: Type overrides as <code>Partial&lt;T&gt;</code> so any subset of keys is allowed and unknown keys are rejected on literals.</p>`, `<p>Hint 2: Copy only entries whose value is not <code>undefined</code>.</p>`, `<p>Hint 3: Recipe: <code>const out = { ...defaults }</code> → loop <code>Object.keys(overrides)</code> typed as <code>(keyof T)[]</code> → assign when defined → return <code>out</code>.</p>`],
    tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(defJson, ovJson) {\n  var d = JSON.parse(defJson), o = JSON.parse(ovJson);\n  for (var k of Object.keys(o)) if (o[k] === '__undef__') o[k] = undefined;\n  var before = JSON.stringify(d);\n  var r = withDefaults(d, o);\n  return [r, JSON.stringify(d) === before];\n}"},"cases":[[["{\"port\":3000,\"host\":\"localhost\",\"debug\":false}","{\"port\":8080,\"debug\":\"__undef__\"}"],[{"port":8080,"host":"localhost","debug":false},true]],[["{\"port\":3000,\"host\":\"localhost\",\"debug\":false}","{}"],[{"port":3000,"host":"localhost","debug":false},true]],[["{\"port\":3000,\"host\":\"localhost\",\"debug\":false}","{\"port\":1,\"host\":\"h\",\"debug\":true}"],[{"port":1,"host":"h","debug":true},true]],[["{\"port\":3000,\"host\":\"localhost\",\"debug\":true}","{\"port\":0,\"host\":\"\",\"debug\":false}"],[{"port":0,"host":"","debug":false},true]],[["{\"a\":1}","{\"a\":\"__undef__\"}"],[{"a":1},true]],[["{}","{}"],[{},true]],[["{\"x\":\"d\",\"y\":\"e\"}","{\"y\":\"__undef__\",\"x\":\"z\"}"],[{"x":"z","y":"e"},true]]]},
    solution: {
      approach: `<p>Use <code>Partial&lt;T&gt;</code> for overrides and copy only defined values. The loop needs one small, justified cast (<code>Object.keys</code> returns <code>string[]</code> by design, because objects may have extra keys at runtime); the function's public signature stays fully typed.</p>`,
      code: `function withDefaults<T extends object>(defaults: T, overrides: Partial<T>): T {
  const out: T = { ...defaults };
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const value = overrides[key];       // T[keyof T] | undefined
    if (value !== undefined) out[key] = value;
  }
  return out;
}

interface Cfg { port: number; host: string; debug: boolean }
const defaults: Cfg = { port: 3000, host: "localhost", debug: false };

const cfg = withDefaults(defaults, { port: 8080, debug: undefined });
console.log(cfg); // { port: 8080, host: "localhost", debug: false }
// @ts-expect-error -- Object literal may only specify known properties: 'prot' does not exist
withDefaults(defaults, { prot: 1 });`,
      dry: { head: ['key', 'override value', 'action', 'out'], rows: [['port', '8080', 'copy', 'port: 8080'], ['debug', 'undefined', H.c('y', 'skip'), 'debug: false (kept)'], ['host', '(absent)', 'not visited', 'host: "localhost"']] },
      complexity: `<p>O(k) for k override keys. One shallow copy of the defaults.</p>`,
      followUps: ['Make it deep for nested objects — what type would <code>DeepPartial&lt;T&gt;</code> need? (module 11)', 'Why is <code>Object.keys</code> typed as <code>string[]</code> and not <code>(keyof T)[]</code>?']
    }
  });

  practice.push({
    title: 'Log Levels Without enum: Ordered as const Union', level: 'Medium', tags: ['as const', 'literal types', 'enum alternatives', 'type guards'], companies: ['Datadog', 'Elastic', 'Splunk'],
    statement: `<p>Replace <code>enum Level { Debug, Info, Warn, Error }</code> with an <b>erasable</b> design: a readonly ordered list, a derived <code>Level</code> union, <code>shouldLog(msgLevel, minLevel)</code> using the order, and <code>parseLevel(s: string): Level | undefined</code> for values read from an environment variable.</p>`,
    constraints: `No <code>enum</code>, no <code>any</code>. The list of levels is written exactly once. <code>parseLevel</code> must be a real runtime check.`,
    example: `<p><code>shouldLog("warn", "info")</code> → ${H.c('g', 'true')}; <code>shouldLog("debug", "info")</code> → ${H.c('r', 'false')}; <code>parseLevel("WARN")</code> → ${H.c('g', '"warn"')}; <code>parseLevel("loud")</code> → ${H.c('y', 'undefined')}.</p>`,
    brute: { why: `<p>Comparing level strings directly (<code>"warn" &gt; "info"</code>) compares <b>alphabetically</b>: <code>"debug" &lt; "error" &lt; "info" &lt; "warn"</code>, so <code>error</code> would be considered less severe than <code>info</code>.</p>`, code: `type Level = "debug" | "info" | "warn" | "error";
function shouldLog(msg: Level, min: Level): boolean {
  return msg >= min; // alphabetical, not severity!
}
console.log(shouldLog("error", "info")); // false — wrong` },
    mcq: { q: 'Given <code>const LEVELS = ["debug", "info"] as const</code>, what is <code>(typeof LEVELS)[number]</code>?', options: ['string', '"debug" | "info"', 'number', 'readonly string[]'], answer: 1, explain: 'Indexing a readonly tuple type with number gives the union of its element types.' },
    hints: [`<p>Hint 1: Order = array index. <code>LEVELS.indexOf(x)</code> is the severity.</p>`, `<p>Hint 2: <code>includes</code> on a readonly tuple of literals expects a <code>Level</code>, not a <code>string</code>. Write a small type guard that searches with <code>some</code>.</p>`, `<p>Hint 3: Recipe: <code>const LEVELS = [...] as const</code> → <code>type Level = (typeof LEVELS)[number]</code> → <code>isLevel(s): s is Level</code> → <code>parseLevel</code> lower-cases then guards.</p>`],
    tests: {"sig":"string string string -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, a, b) {\n  if (kind === 'should') return shouldLog(a, b);\n  if (kind === 'parse') { var r = parseLevel(a); return r === undefined ? null : r; }\n  if (kind === 'levels') return LEVELS.slice();\n}"},"cases":[[["should","warn","info"],true],[["should","debug","info"],false],[["should","error","error"],true],[["should","debug","debug"],true],[["should","info","error"],false],[["should","error","debug"],true],[["parse","WARN",""],"warn"],[["parse","loud",""],null],[["parse"," Info ",""],"info"],[["parse","",""],null],[["parse","Error",""],"error"],[["levels","",""],["debug","info","warn","error"]]]},
    solution: {
      approach: `<p>A readonly tuple is both the runtime list and the source of the union type; its index encodes severity. A type guard bridges runtime strings to the union without casts.</p>`,
      code: `const LEVELS = ["debug", "info", "warn", "error"] as const;
type Level = (typeof LEVELS)[number]; // "debug" | "info" | "warn" | "error"

function isLevel(s: string): s is Level {
  return LEVELS.some((l) => l === s);
}

function severity(l: Level): number {
  return LEVELS.indexOf(l);
}

function shouldLog(msg: Level, min: Level): boolean {
  return severity(msg) >= severity(min);
}

function parseLevel(raw: string): Level | undefined {
  const s = raw.trim().toLowerCase();
  return isLevel(s) ? s : undefined;
}

console.log(shouldLog("warn", "info"), shouldLog("debug", "info"), shouldLog("error", "info"));
console.log(parseLevel("WARN"), parseLevel("loud"));`,
      dry: { head: ['call', 'severities', 'result'], rows: [['shouldLog("warn","info")', '2 ≥ 1', 'true'], ['shouldLog("debug","info")', '0 ≥ 1', 'false'], ['shouldLog("error","info")', '3 ≥ 1', 'true'], ['parseLevel("loud")', 'isLevel false', 'undefined']] },
      complexity: `<p>O(L) per call for L levels (4) — effectively O(1). Precompute a <code>Record&lt;Level, number&gt;</code> if called in a hot path.</p>`,
      followUps: ['Build the <code>Record&lt;Level, number&gt;</code> lookup with full typing.', 'Why does <code>LEVELS.includes(s)</code> not compile when <code>s: string</code>?']
    }
  });

  practice.push({
    title: 'Exhaustive Cart Reducer with Action Unions', level: 'Hard', tags: ['discriminated union', 'never', 'reducer', 'readonly'], companies: ['Amazon', 'Instacart', 'Shopify'],
    statement: `<p>Implement <code>cartReducer(state, action)</code> for actions <code>add</code> (item with <code>id</code>, <code>price</code>), <code>remove</code> (<code>id</code>), <code>setQty</code> (<code>id</code>, <code>qty</code>), and <code>clear</code>. State is <code>{ readonly items: readonly CartLine[] }</code>. The reducer must be pure (never mutate), handle <code>setQty</code> with 0 as remove, and make a forgotten action a compile error.</p>`,
    constraints: `Discriminated union on <code>type</code>. No mutation (readonly types must enforce it). Exhaustive <code>never</code> check. Adding the same id twice increases its quantity.`,
    example: `<p>add(a, 2) → add(a, 2) → setQty(a, 5) → remove(a): lines go ${H.c('g', '[a×1]')} → ${H.c('g', '[a×2]')} → ${H.c('g', '[a×5]')} → ${H.c('g', '[]')}. Dispatching <code>{ type: "applyCoupon" }</code> → ${H.c('r', 'compile error')} until it is added to the union and handled.</p>`,
    brute: { why: `<p>A reducer typed with <code>action: { type: string; payload?: any }</code> mutates state with <code>push</code>, reads <code>payload.id</code> without checks, and ends with <code>default: return state</code>, so typos in action types silently do nothing.</p>`, code: `interface Line { id: string; price: number; qty: number }
function reducer(state: { items: Line[] }, action: { type: string; payload?: any }) {
  switch (action.type) {
    case "add": state.items.push({ ...action.payload, qty: 1 }); return state; // mutation!
    default: return state; // "remvoe" typo silently ignored
  }
}
console.log(reducer({ items: [] }, { type: "remvoe", payload: { id: "a" } }).items.length);` },
    mcq: { q: 'Why do <code>readonly</code> types help in a reducer?', options: ['They freeze objects at runtime', 'They make push/assignment on state compile errors, catching accidental mutation', 'They speed up rendering', 'They are required for unions'], answer: 1, explain: 'readonly is compile-time only, but it turns state.items.push(...) and state.items[0] = x into errors, which is exactly the class of bug reducers suffer from.' },
    hints: [`<p>Hint 1: <code>type CartAction = { type: "add"; id: string; price: number } | { type: "remove"; id: string } | { type: "setQty"; id: string; qty: number } | { type: "clear" }</code>.</p>`, `<p>Hint 2: Return new arrays with <code>map</code>/<code>filter</code>/spread; <code>readonly CartLine[]</code> forbids <code>push</code>.</p>`, `<p>Hint 3: <code>setQty</code> with <code>qty &lt;= 0</code> delegates to the remove logic. End the switch with <code>default: return assertNever(action)</code>.</p>`],
    tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction deepFreeze(o) { Object.freeze(o); for (var k of Object.keys(o)) if (o[k] && typeof o[k] === 'object') deepFreeze(o[k]); return o; }\nfunction chk(stateJson, actionsJson) {\n  if (stateJson === 'BIG') { var s = { items: [] }; for (var i = 0; i < 10000; i++) s = cartReducer(s, { type: 'add', id: 'i' + (i % 100), price: i % 100 }); return [s.items.length, s.items[0].qty, s.items[99].price]; }\n  var state = deepFreeze(JSON.parse(stateJson));\n  try { for (var a of JSON.parse(actionsJson)) state = cartReducer(state, a); } catch (e) { return e.message; }\n  return state.items;\n}"},"cases":[[["{\"items\":[]}","[{\"type\":\"add\",\"id\":\"a\",\"price\":2},{\"type\":\"add\",\"id\":\"a\",\"price\":2}]"],[{"id":"a","price":2,"qty":2}]],[["{\"items\":[]}","[{\"type\":\"add\",\"id\":\"a\",\"price\":2},{\"type\":\"add\",\"id\":\"a\",\"price\":2},{\"type\":\"setQty\",\"id\":\"a\",\"qty\":5}]"],[{"id":"a","price":2,"qty":5}]],[["{\"items\":[]}","[{\"type\":\"add\",\"id\":\"a\",\"price\":2},{\"type\":\"add\",\"id\":\"a\",\"price\":2},{\"type\":\"setQty\",\"id\":\"a\",\"qty\":5},{\"type\":\"remove\",\"id\":\"a\"}]"],[]],[["{\"items\":[]}","[{\"type\":\"add\",\"id\":\"a\",\"price\":2},{\"type\":\"add\",\"id\":\"b\",\"price\":3}]"],[{"id":"a","price":2,"qty":1},{"id":"b","price":3,"qty":1}]],[["{\"items\":[]}","[{\"type\":\"add\",\"id\":\"a\",\"price\":2},{\"type\":\"setQty\",\"id\":\"a\",\"qty\":0}]"],[]],[["{\"items\":[]}","[{\"type\":\"add\",\"id\":\"a\",\"price\":2},{\"type\":\"setQty\",\"id\":\"a\",\"qty\":-3}]"],[]],[["{\"items\":[]}","[{\"type\":\"add\",\"id\":\"a\",\"price\":2},{\"type\":\"add\",\"id\":\"b\",\"price\":3},{\"type\":\"clear\"}]"],[]],[["{\"items\":[{\"id\":\"z\",\"price\":1,\"qty\":4}]}","[{\"type\":\"remove\",\"id\":\"nope\"}]"],[{"id":"z","price":1,"qty":4}]],[["{\"items\":[{\"id\":\"z\",\"price\":1,\"qty\":4}]}","[{\"type\":\"setQty\",\"id\":\"nope\",\"qty\":9}]"],[{"id":"z","price":1,"qty":4}]],[["{\"items\":[]}","[{\"type\":\"applyCoupon\"}]"],"Unknown action: {\"type\":\"applyCoupon\"}"],[["BIG",""],[100,100,99]]]},
    solution: {
      approach: `<p>Each action is a member of a discriminated union, so each case gets exactly its own payload fields. Readonly state types make mutation a compile error; every case returns a fresh state. The <code>never</code> default turns a new action into a to-do list for the compiler.</p>`,
      code: `interface CartLine { readonly id: string; readonly price: number; readonly qty: number }
interface CartState { readonly items: readonly CartLine[] }

type CartAction =
  | { type: "add"; id: string; price: number }
  | { type: "remove"; id: string }
  | { type: "setQty"; id: string; qty: number }
  | { type: "clear" };

function assertNever(x: never): never {
  throw new Error("Unknown action: " + JSON.stringify(x));
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const exists = state.items.some((l) => l.id === action.id);
      return {
        items: exists
          ? state.items.map((l) => (l.id === action.id ? { ...l, qty: l.qty + 1 } : l))
          : [...state.items, { id: action.id, price: action.price, qty: 1 }],
      };
    }
    case "remove":
      return { items: state.items.filter((l) => l.id !== action.id) };
    case "setQty":
      if (action.qty <= 0) return cartReducer(state, { type: "remove", id: action.id });
      return { items: state.items.map((l) => (l.id === action.id ? { ...l, qty: action.qty } : l)) };
    case "clear":
      return { items: [] };
    default:
      return assertNever(action);
  }
}

let s: CartState = { items: [] };
const actions: CartAction[] = [
  { type: "add", id: "a", price: 2 },
  { type: "add", id: "a", price: 2 },
  { type: "setQty", id: "a", qty: 5 },
  { type: "remove", id: "a" },
];
for (const a of actions) {
  s = cartReducer(s, a);
  console.log(a.type, JSON.stringify(s.items));
}
// @ts-expect-error -- Property 'push' does not exist on type 'readonly CartLine[]'
s.items.push({ id: "x", price: 1, qty: 1 });`,
      dry: { head: ['action', 'case narrowed to', 'items after'], rows: [['add a', '{ type: "add"; id; price }', '[a×1]'], ['add a', 'same (exists)', '[a×2]'], ['setQty a 5', '{ type: "setQty"; id; qty }', '[a×5]'], ['remove a', '{ type: "remove"; id }', '[]'], ['default', 'never', 'unreachable']] },
      complexity: `<p>O(n) per action for n cart lines (map/filter/some). Immutability costs one new array per action — fine for UI-sized carts.</p>`,
      followUps: ['Add <code>applyCoupon</code> and watch the compiler point at the reducer.', 'Derive <code>CartAction["type"]</code> to build a typed action-creator map.', 'How would you write a test that proves the reducer never mutates its input?']
    }
  });

  practice.push({
    title: 'Branded Types: Stop Mixing UserId and OrderId', level: 'Hard', tags: ['structural typing', 'brands', 'intersections', 'type guards'], companies: ['Stripe', 'Robinhood', 'Square'],
    statement: `<p>Both IDs are strings, so structural typing happily lets you call <code>refundOrder(userId)</code> — a real production bug. Create <b>branded</b> types <code>UserId</code> and <code>OrderId</code> that are incompatible with each other and with plain strings, with validating constructors (<code>usr_</code> / <code>ord_</code> prefixes), while still usable as strings (e.g. in template strings and <code>.startsWith</code>).</p>`,
    constraints: `Zero runtime overhead beyond the validation. No classes. A raw string must not be passable where an ID is expected; IDs must remain assignable to <code>string</code>.`,
    example: `<p><code>refundOrder(toOrderId("ord_9"))</code> → ${H.c('g', 'ok')}; <code>refundOrder(toUserId("usr_1"))</code> → ${H.c('r', 'compile error')}; <code>refundOrder("ord_9")</code> → ${H.c('r', 'compile error')}; <code>toOrderId("abc")</code> → ${H.c('y', 'throws at runtime')}.</p>`,
    brute: { why: `<p>Type aliases (<code>type UserId = string</code>) are just new names for the same set of values. Structurally they are identical, so the mix-up still compiles.</p>`, code: `type UserId = string;
type OrderId = string;
function refundOrder(id: OrderId): string { return "refunded " + id; }
const user: UserId = "usr_1";
console.log(refundOrder(user)); // compiles: aliases do not create new types` },
    mcq: { q: 'Why is <code>string &amp; { readonly __brand: "UserId" }</code> not assignable from a plain <code>string</code>?', options: ['Strings are nominal', 'A plain string lacks the __brand property required by the intersection', 'Intersections are always never', 'readonly blocks assignment'], answer: 1, explain: 'The intersection requires both string-ness and a __brand property. Plain strings have no such property, so they do not fit; a branded value still fits string because it is a subset.' },
    hints: [`<p>Hint 1: Make the types structurally different with an intersection: <code>string &amp; { readonly __brand: "UserId" }</code>. The brand property never exists at runtime.</p>`, `<p>Hint 2: The only way to create one should be a function that validates and then casts once: <code>return s as UserId</code>.</p>`, `<p>Hint 3: Optionally use a <code>declare const brand: unique symbol</code> key so the brand cannot be spelled by accident. Write an <code>isOrderId</code> type guard for non-throwing parsing.</p>`],
    tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(kind, s) {\n  try {\n    if (kind === 'order') return toOrderId(s);\n    if (kind === 'user') return toUserId(s);\n    if (kind === 'refund') return refundOrder(toOrderId(s));\n  } catch (e) { return e.message; }\n}"},"cases":[[["order","ord_9"],"ord_9"],[["order","abc"],"Invalid order id: abc"],[["order","ord_"],"Invalid order id: ord_"],[["order","ORD_9"],"Invalid order id: ORD_9"],[["order","ord_a1b2"],"ord_a1b2"],[["order","ord_9\n"],"Invalid order id: ord_9\n"],[["user","usr_1"],"usr_1"],[["user","ord_1"],"Invalid user id: ord_1"],[["user",""],"Invalid user id: "],[["refund","ord_9"],"refunded ord_9 (5 chars)"],[["refund","usr_1"],"Invalid order id: usr_1"]]},
    solution: {
      approach: `<p>Branding simulates nominal typing in a structural system: intersect <code>string</code> with a phantom property that differs per ID kind. Construction goes through validating functions (the single, audited place where a cast is allowed). Branded values are still strings, so all string operations work.</p>`,
      code: `declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;

function isOrderId(s: string): s is OrderId {
  return /^ord_[a-z0-9]+$/.test(s);
}
function toOrderId(s: string): OrderId {
  if (!isOrderId(s)) throw new Error("Invalid order id: " + s);
  return s; // narrowed by the guard, no cast needed here
}
function toUserId(s: string): UserId {
  if (!/^usr_[a-z0-9]+$/.test(s)) throw new Error("Invalid user id: " + s);
  return s as UserId; // the one audited cast
}

function refundOrder(id: OrderId): string {
  return "refunded " + id + " (" + id.length + " chars)"; // still a string
}

const order = toOrderId("ord_9");
const user = toUserId("usr_1");
console.log(refundOrder(order), user.startsWith("usr_"));
// @ts-expect-error -- UserId is not assignable to OrderId (brands differ)
refundOrder(user);
// @ts-expect-error -- a plain string has no brand
refundOrder("ord_9");
try { toOrderId("abc"); } catch (e) { console.log(e instanceof Error ? e.message : e); }`,
      dry: { head: ['value', 'static type', 'refundOrder(value)'], rows: [['toOrderId("ord_9")', 'OrderId', H.c('g', 'ok')], ['toUserId("usr_1")', 'UserId', H.c('r', 'compile error')], ['"ord_9"', 'string', H.c('r', 'compile error')], ['toOrderId("abc")', '—', H.c('y', 'throws at runtime')]] },
      complexity: `<p>Runtime: one regex test per construction, O(length). The brand has zero runtime cost — it exists only in the type.</p>`,
      followUps: ['Brand numbers: <code>Cents</code> vs <code>Dollars</code>.', 'How do Zod/Valibot <code>.brand()</code> helpers do the same thing?', 'Why is a <code>unique symbol</code> key safer than <code>__brand</code>?']
    }
  });

  practice.push({
    title: 'Assertion Functions: Validate Environment Config', level: 'Hard', tags: ['asserts', 'unknown', 'narrowing', 'runtime validation'], companies: ['Datadog', 'HashiCorp', 'Cloudflare'],
    statement: `<p>A service reads settings from an environment-like record <code>Record&lt;string, string | undefined&gt;</code>. Write assertion functions <code>assertDefined</code> and <code>assertPort</code>, then <code>loadConfig(env)</code> returning <code>{ dbUrl: string; port: number; mode: "dev" | "prod" }</code>. Every failure must throw a clear message naming the variable; after each assertion the narrowed type must flow to the following lines without casts.</p>`,
    constraints: `Use <code>asserts value is T</code> signatures. No <code>!</code>, no <code>as</code>. <code>PORT</code> must be an integer 1–65535; <code>MODE</code> defaults to <code>"dev"</code>.`,
    example: `<p><code>{ DB_URL: "postgres://x", PORT: "8080", MODE: "prod" }</code> → ${H.c('g', '{ dbUrl: "postgres://x", port: 8080, mode: "prod" }')}. Missing <code>DB_URL</code> → ${H.c('r', 'Error: DB_URL is required')}. <code>PORT: "abc"</code> → ${H.c('r', 'Error: PORT must be an integer 1-65535')}.</p>`,
    brute: { why: `<p>Reading <code>env.DB_URL as string</code> and <code>Number(env.PORT)</code> compiles but produces <code>undefined</code> connection strings and <code>NaN</code> ports that fail much later, deep in a driver, with confusing errors.</p>`, code: `function loadConfig(env: Record<string, string | undefined>) {
  return { dbUrl: env.DB_URL as string, port: Number(env.PORT), mode: env.MODE ?? "dev" };
}
console.log(loadConfig({})); // { dbUrl: undefined, port: NaN, mode: "dev" } — no error!` },
    mcq: { q: 'What is the return type of an assertion function like <code>assertDefined</code>?', options: ['boolean', 'asserts value is T (it returns nothing, it throws on failure)', 'T', 'never'], answer: 1, explain: 'Assertion functions return void at runtime; their asserts signature tells TS that if the call returns at all, the condition holds for the rest of the scope.' },
    hints: [`<p>Hint 1: <code>function assertDefined&lt;T&gt;(v: T, name: string): asserts v is NonNullable&lt;T&gt;</code>.</p>`, `<p>Hint 2: Assertion functions must be called through a name with an explicit type — a plain <code>function</code> declaration works.</p>`, `<p>Hint 3: For <code>mode</code>, write an <code>isMode</code> type predicate and use it in a conditional: <code>const mode = raw === undefined ? "dev" : isMode(raw) ? raw : fail()</code>, where <code>fail</code> returns <code>never</code>.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(envJson) { try { return loadConfig(JSON.parse(envJson)); } catch (e) { return e.message; } }"},"cases":[[["{\"DB_URL\":\"postgres://x\",\"PORT\":\"8080\",\"MODE\":\"prod\"}"],{"dbUrl":"postgres://x","port":8080,"mode":"prod"}],[["{\"PORT\":\"1\"}"],"DB_URL is required"],[["{\"DB_URL\":\"x\",\"PORT\":\"abc\"}"],"PORT must be an integer 1-65535"],[["{\"DB_URL\":\"x\",\"PORT\":\"80\",\"MODE\":\"test\"}"],"MODE must be dev or prod"],[["{\"DB_URL\":\"x\",\"PORT\":\"80\"}"],{"dbUrl":"x","port":80,"mode":"dev"}],[["{\"DB_URL\":\"\",\"PORT\":\"80\"}"],"DB_URL is required"],[["{\"DB_URL\":\"x\"}"],"PORT is required"],[["{\"DB_URL\":\"x\",\"PORT\":\"0\"}"],"PORT must be an integer 1-65535"],[["{\"DB_URL\":\"x\",\"PORT\":\"65535\"}"],{"dbUrl":"x","port":65535,"mode":"dev"}],[["{\"DB_URL\":\"x\",\"PORT\":\"65536\"}"],"PORT must be an integer 1-65535"],[["{\"DB_URL\":\"x\",\"PORT\":\"80.5\"}"],"PORT must be an integer 1-65535"],[["{\"DB_URL\":\"x\",\"PORT\":\"1\",\"MODE\":\"dev\"}"],{"dbUrl":"x","port":1,"mode":"dev"}]]},
    solution: {
      approach: `<p>Assertion functions validate and narrow in one call: after <code>assertDefined(env.DB_URL, ...)</code> the variable is <code>string</code> for the rest of the scope. A <code>never</code>-returning <code>fail</code> helper lets throwing expressions sit inside conditionals while keeping precise types.</p>`,
      code: `type Mode = "dev" | "prod";
interface AppConfig { dbUrl: string; port: number; mode: Mode }

function fail(message: string): never {
  throw new Error(message);
}

function assertDefined<T>(value: T, name: string): asserts value is NonNullable<T> {
  if (value === undefined || value === null || value === "") fail(name + " is required");
}

function assertPort(value: number, name: string): asserts value is number {
  if (!Number.isInteger(value) || value < 1 || value > 65535) fail(name + " must be an integer 1-65535");
}

function isMode(s: string): s is Mode {
  return s === "dev" || s === "prod";
}

function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const dbUrl = env["DB_URL"];
  assertDefined(dbUrl, "DB_URL");           // dbUrl: string from here on
  const rawPort = env["PORT"];
  assertDefined(rawPort, "PORT");
  const port = Number(rawPort);
  assertPort(port, "PORT");
  const rawMode = env["MODE"];
  const mode: Mode = rawMode === undefined ? "dev" : isMode(rawMode) ? rawMode : fail("MODE must be dev or prod");
  return { dbUrl, port, mode };
}

console.log(loadConfig({ DB_URL: "postgres://x", PORT: "8080", MODE: "prod" }));
for (const bad of [{ PORT: "1" }, { DB_URL: "x", PORT: "abc" }, { DB_URL: "x", PORT: "80", MODE: "test" }]) {
  try { loadConfig(bad); } catch (e) { console.log(e instanceof Error ? e.message : e); }
}`,
      dry: { head: ['step', 'type before', 'type after', 'on failure'], rows: [['assertDefined(dbUrl)', 'string | undefined', 'string', 'DB_URL is required'], ['assertDefined(rawPort)', 'string | undefined', 'string', 'PORT is required'], ['assertPort(port)', 'number', 'number (validated)', 'PORT must be an integer 1-65535'], ['isMode(rawMode)', 'string', 'Mode', 'MODE must be dev or prod']] },
      complexity: `<p>O(1) per variable. Failing fast at startup turns late, confusing runtime errors into one clear message at boot.</p>`,
      followUps: ['Collect all errors instead of throwing on the first one — how do the types change?', 'Replace the hand-written checks with a schema and <code>z.infer</code>.', 'Why does <code>assertPort</code> use a branded <code>Port</code> type in some codebases?']
    }
  });

  practice.push({
    title: 'Typed Event Emitter with Generic Keys', level: 'Hard', tags: ['generics', 'keyof', 'indexed access', 'classes'], companies: ['Microsoft', 'Discord', 'Figma'],
    statement: `<p>Build a small <code>Emitter&lt;Events&gt;</code> class where <code>Events</code> maps event names to payload types, e.g. <code>{ login: { userId: string }; logout: undefined; progress: number }</code>. <code>on(name, handler)</code> must type the handler's payload from the event name, <code>emit(name, payload)</code> must reject wrong payloads, unknown event names must be compile errors, and <code>on</code> returns an unsubscribe function.</p>`,
    constraints: `No <code>any</code> in the public API. Handlers stored per event. Emitting with no listeners is a no-op.`,
    example: `<p><code>bus.on("progress", p =&gt; p.toFixed(0))</code> → ${H.c('g', 'p: number')}. <code>bus.emit("login", { userId: 42 })</code> → ${H.c('r', 'error: number is not assignable to string')}. <code>bus.emit("signup", {})</code> → ${H.c('r', 'error: not a key of Events')}.</p>`,
    brute: { why: `<p>A string-keyed emitter with <code>(...args: any[]) =&gt; void</code> handlers accepts any name and any payload: misspelled events never fire, and handlers receive data of the wrong shape.</p>`, code: `class LooseEmitter {
  private handlers: Record<string, ((payload: any) => void)[]> = {};
  on(name: string, h: (payload: any) => void): void { (this.handlers[name] ??= []).push(h); }
  emit(name: string, payload?: any): void { (this.handlers[name] ?? []).forEach((h) => h(payload)); }
}
const e = new LooseEmitter();
e.on("progres", (p) => console.log(p.toFixed(0))); // typo: never fires
e.emit("progress", "50%");                       // wrong payload type, no error` },
    mcq: { q: 'In <code>on&lt;K extends keyof Events&gt;(name: K, handler: (payload: Events[K]) =&gt; void)</code>, how is K determined?', options: ['It must be given explicitly', 'Inferred from the literal event name passed as name', 'It is always keyof Events', 'From the handler return type'], answer: 1, explain: 'Passing "progress" infers K = "progress", so Events[K] = number types the handler parameter by contextual typing.' },
    hints: [`<p>Hint 1: The class is generic in an events map: <code>class Emitter&lt;Events extends Record&lt;string, unknown&gt;&gt;</code>.</p>`, `<p>Hint 2: Methods are generic in the key: <code>on&lt;K extends keyof Events&gt;(name: K, handler: (payload: Events[K]) =&gt; void)</code>.</p>`, `<p>Hint 3: Store handlers in <code>{ [K in keyof Events]?: Array&lt;(p: Events[K]) =&gt; void&gt; }</code>; <code>on</code> returns <code>() =&gt; void</code> that filters the handler out.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var bus = new Emitter(), log = [];\n  if (k === 'basic') { bus.on('progress', function (p) { log.push(p); }); bus.emit('progress', 50); return log; }\n  if (k === 'unsub') { var off = bus.on('progress', function (p) { log.push(p); }); bus.emit('progress', 1); off(); bus.emit('progress', 2); return log; }\n  if (k === 'multi') { bus.on('progress', function (p) { log.push('a' + p); }); bus.on('progress', function (p) { log.push('b' + p); }); bus.emit('progress', 7); return log; }\n  if (k === 'none') { bus.emit('progress', 1); bus.emit('logout', undefined); return 'ok'; }\n  if (k === 'payloads') { bus.on('login', function (e) { log.push(e.userId); }); bus.on('logout', function (e) { log.push(e === undefined ? 'undef' : 'other'); }); bus.emit('login', { userId: 'u1' }); bus.emit('logout', undefined); return log; }\n  if (k === 'perEvent') { bus.on('progress', function (p) { log.push('p' + p); }); bus.on('login', function () { log.push('l'); }); bus.emit('login', { userId: 'x' }); return log; }\n  if (k === 'unsubOne') { var off1 = bus.on('progress', function () { log.push('first'); }); bus.on('progress', function () { log.push('second'); }); off1(); bus.emit('progress', 0); return log; }\n  if (k === 'unsubTwice') { var off2 = bus.on('progress', function () { log.push('x'); }); off2(); off2(); bus.emit('progress', 0); return log; }\n  if (k === 'many') { var n = 0; for (var i = 0; i < 10000; i++) bus.on('progress', function () { n++; }); bus.emit('progress', 1); bus.emit('progress', 2); return n; }\n  if (k === 'order') { for (var j = 0; j < 5; j++) (function (x) { bus.on('progress', function () { log.push(x); }); })(j); bus.emit('progress', 0); return log; }\n}"},"cases":[[["basic"],[50]],[["unsub"],[1]],[["multi"],["a7","b7"]],[["none"],"ok"],[["payloads"],["u1","undef"]],[["perEvent"],["l"]],[["unsubOne"],["second"]],[["unsubTwice"],[]],[["many"],20000],[["order"],[0,1,2,3,4]]]},
    solution: {
      approach: `<p>Two levels of generics: the class captures the event map once; each method captures the specific key, so <code>Events[K]</code> links the event name to its payload type. A mapped type keeps the internal storage typed per key. Gotcha: declare the events map with <code>type</code>, not <code>interface</code> — interfaces get no implicit index signature, so they do not satisfy <code>Record&lt;string, unknown&gt;</code>.</p>`,
      code: `type Handler<P> = (payload: P) => void;

class Emitter<Events extends Record<string, unknown>> {
  private handlers: { [K in keyof Events]?: Handler<Events[K]>[] } = {};

  on<K extends keyof Events>(name: K, handler: Handler<Events[K]>): () => void {
    const list = (this.handlers[name] ??= []);
    list.push(handler);
    return () => {
      this.handlers[name] = list.filter((h) => h !== handler);
    };
  }

  emit<K extends keyof Events>(name: K, payload: Events[K]): void {
    for (const h of this.handlers[name] ?? []) h(payload);
  }
}

// A type alias (not an interface) so it satisfies Record<string, unknown>:
// interfaces have no implicit index signature, type literals do.
type AppEvents = { login: { userId: string }; logout: undefined; progress: number };

const bus = new Emitter<AppEvents>();
const off = bus.on("progress", (p) => console.log("progress " + p.toFixed(0) + "%")); // p: number
bus.on("login", (e) => console.log("hello " + e.userId));                           // e: { userId: string }
bus.emit("progress", 50);
bus.emit("login", { userId: "u1" });
bus.emit("logout", undefined);
off();
bus.emit("progress", 99); // no output: unsubscribed
// @ts-expect-error -- Type 'number' is not assignable to type 'string'
bus.emit("login", { userId: 42 });
// @ts-expect-error -- '"signup"' is not assignable to parameter of type '"login" | "logout" | "progress"'
bus.emit("signup", {});`,
      dry: { head: ['call', 'K inferred', 'Events[K]', 'result'], rows: [['on("progress", p =&gt; …)', '"progress"', 'number', 'handler stored'], ['emit("progress", 50)', '"progress"', 'number', 'prints "progress 50%"'], ['emit("login", { userId: 42 })', '"login"', '{ userId: string }', H.c('r', 'compile error')], ['off(); emit("progress", 99)', '"progress"', 'number', 'no handlers, no output']] },
      complexity: `<p><code>on</code>: O(1) amortised; <code>emit</code>: O(h) for h handlers of that event; unsubscribe O(h).</p>`,
      followUps: ['Make <code>emit("logout")</code> callable without a payload when the payload type is undefined (needs conditional types, module 11).', 'Add <code>once</code>.', 'How does the DOM\'s <code>addEventListener</code> typing use the same idea (<code>HTMLElementEventMap</code>)?']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push({ q: 'What happens to TypeScript type annotations when the code runs?', options: ['They are checked at runtime and throw on mismatch', 'They are erased; the runtime sees plain JavaScript', 'They are converted to JSDoc comments that the engine reads', 'They make the code run faster through optimisation hints'], answer: 1, explain: 'Types are erased by tsc, esbuild, swc or Node\'s type stripping. Runtime validation needs explicit code or a schema library.' });
  quiz.push({ q: 'What type does TS infer for <code>let status = "idle";</code>?', options: ['"idle"', 'string', 'any', 'unknown'], answer: 1, explain: 'A let can be reassigned, so the literal "idle" is widened to string. const status = "idle" would keep the literal type.' });
  quiz.push({ q: 'Which is the safest type for a value parsed from an untrusted API response before validation?', options: ['any', 'object', 'unknown', 'never'], answer: 2, explain: 'unknown accepts anything but forces you to narrow before using it. any switches checking off entirely.' });
  quiz.push({ q: 'Which feature is available on <code>interface</code> but NOT on a <code>type</code> alias?', options: ['Describing object shapes', 'Declaration merging (re-opening to add members)', 'Being implemented by a class', 'Optional properties'], answer: 1, explain: 'Two interface declarations with the same name merge. Declaring the same type alias twice is a "duplicate identifier" error.' });
  quiz.push({ q: 'Given <code>type Cat = { name: string; meow(): void }</code> and <code>type Dog = { name: string; bark(): void }</code>, what can you call on <code>pet: Cat | Dog</code> without narrowing?', options: ['meow and bark', 'Only name', 'Nothing at all', 'Everything on both types'], answer: 1, explain: 'A union value might be either member, so only members common to both are safe until you narrow.' });
  quiz.push({ q: 'What is <code>string &amp; number</code>?', options: ['string | number', 'unknown', 'never', 'A compile error'], answer: 2, explain: 'No value is both a string and a number; the intersection is the empty set, never.' });
  quiz.push({ q: 'Why does <code>start({ name: "job", retires: 3 })</code> fail when <code>start</code> expects <code>{ name: string; retries?: number }</code>, while passing the same object through a variable compiles?', options: ['Variables are not checked', 'Excess property checking applies only to fresh object literals', 'Optional properties cannot be passed inline', 'TS has a bug'], answer: 1, explain: 'Structural typing allows extra properties, but fresh literals get an extra typo check because unknown keys are almost always mistakes.' });
  quiz.push({ q: 'In <code>switch (shape.kind)</code> over a discriminated union, what is the type of <code>shape</code> in the <code>default</code> branch once every kind has a case?', options: ['The full union', 'unknown', 'never', 'object'], answer: 2, explain: 'Each case removes one member; when all are removed, the remaining type is never. Assigning it to a never variable gives an exhaustiveness check.' });
  quiz.push({ q: 'What does <code>function isFish(p: Fish | Bird): p is Fish</code> tell the compiler?', options: ['That p is always a Fish', 'That when the function returns true, p can be treated as Fish', 'That the function throws for birds', 'Nothing — it is a comment'], answer: 1, explain: 'A type predicate narrows in the true branch (and narrows to Bird in the false branch). TS trusts the body, so the check must be correct.' });
  quiz.push({ q: 'How many keys does <code>Object.keys</code> return for <code>enum Dir { Up, Down }</code>?', options: ['2', '4', '0', '1'], answer: 1, explain: 'Numeric enums get a reverse mapping: "Up", "Down", "0" and "1".' });
  quiz.push({ q: 'Which syntax is rejected by <code>erasableSyntaxOnly</code> and by Node.js type stripping?', options: ['interface User {}', 'type Id = string', 'enum Color { Red }', 'function f(x: number): void {}'], answer: 2, explain: 'enum generates runtime code, so it cannot be removed by just deleting type syntax. Interfaces, aliases and annotations are erasable.' });
  quiz.push({ q: 'Which call makes TS report an error for <code>function firstOr&lt;T&gt;(items: T[], fallback: T): T</code>?', options: ['firstOr([1, 2], 0)', 'firstOr([], "x")', 'firstOr(["a"], 0)', 'firstOr([1, 2], null)'], answer: 2, explain: 'Candidates string and number disagree; TS picks string from the first argument and reports 0. null is merged into the union (number | null) instead.' });
  quiz.push({ q: 'What does <code>K extends keyof T</code> mean in <code>getProp&lt;T, K extends keyof T&gt;(obj: T, key: K): T[K]</code>?', options: ['K is any string', 'K must be one of T\'s property names', 'K must be a number', 'K is the value type of T'], answer: 1, explain: 'keyof T is the union of T\'s keys. Constraining K to it rejects typos and lets T[K] look up the exact property type.' });
  quiz.push({ q: 'Which flag is NOT included in <code>"strict": true</code>?', options: ['strictNullChecks', 'noImplicitAny', 'noUncheckedIndexedAccess', 'useUnknownInCatchVariables'], answer: 2, explain: 'noUncheckedIndexedAccess (index reads include undefined) must be enabled separately, as must exactOptionalPropertyTypes and noImplicitReturns.' });
  quiz.push({ q: 'In a Vite or Next.js app, which tool reports TypeScript type errors?', options: ['esbuild/swc during the build', 'The browser', 'tsc (or the editor\'s language service), typically with noEmit', 'Nobody — bundlers infer them'], answer: 2, explain: 'Bundlers strip types file by file without checking them. Run tsc --noEmit in CI and rely on the editor locally.' });

  /* ================= INTERVIEW Q&A ================= */
  interview.push({ level: 'B', q: 'Why would a team adopt TypeScript? What does it NOT give you?', a: `<p><b>Gives:</b> bugs caught while typing instead of in production (wrong argument types, missing null checks, typos in property names), safe large-scale refactors (rename a field and the compiler lists every place to update), excellent editor tooling (autocomplete, go-to-definition), and types as always-up-to-date documentation of APIs. It scales code bases and teams.</p><p><b>Does not give:</b> runtime safety or speed. Types are erased, so data from the network, storage or users must still be validated at runtime (hand-written guards or Zod/Valibot). It also has deliberate unsound spots (<code>any</code>, <code>as</code>, unchecked index access without <code>noUncheckedIndexedAccess</code>), and it adds a build/check step.</p>`, followUps: ['Where in your app would you validate at runtime?', 'How do you measure whether TypeScript is paying off?'] });
  interview.push({ level: 'B', q: 'What is the difference between <code>any</code>, <code>unknown</code> and <code>never</code>?', a: `<p><code>any</code> disables type checking for that value — anything goes, and it spreads to everything it touches. <code>unknown</code> is the type-safe top type: any value can be assigned to it, but you cannot use it until you narrow it (<code>typeof</code>, <code>instanceof</code>, a type guard). <code>never</code> is the bottom type, the empty set: no value has it. It appears as the return type of functions that always throw or loop forever, as the result of impossible intersections (<code>string &amp; number</code>), and as what is left after exhaustively narrowing a union — which is the basis of exhaustiveness checks.</p>`, followUps: ['Why does JSON.parse return any, and what should you do about it?', 'Show an exhaustiveness check using never.'] });
  interview.push({ level: 'B', q: 'When do you write type annotations and when do you rely on inference?', a: `<p>Annotate the <b>boundaries</b>: function parameters (TS cannot infer them), return types of exported/public functions (a stable contract, clearer errors, faster checking in big projects), empty collections (<code>const ids: string[] = []</code>), and values coming from outside (parsed JSON, env vars). Let inference handle the <b>inside</b>: local variables, callback parameters (contextual typing from <code>arr.map</code>), and intermediate results. Over-annotating adds noise and can be <i>less</i> precise than inference (e.g. annotating <code>string</code> where inference would keep a literal). Use <code>satisfies</code> when you want a check without losing the inferred precise type.</p>`, followUps: ['What is contextual typing?', 'When is satisfies better than an annotation?'] });
  interview.push({ level: 'I', q: 'Interface or type alias — which do you use and why?', a: `<p>For plain object shapes they are nearly equivalent. Differences: only <code>type</code> can name unions, tuples, primitives, function types, mapped and conditional types; only <code>interface</code> supports <b>declaration merging</b> (needed for module augmentation like adding to <code>Window</code> or a library's types). When extending, <code>interface B extends A</code> reports conflicting members as an error right away, while <code>A &amp; B</code> silently produces <code>never</code> properties; interfaces are also cached by name, which the TS team recommends for performance in large codebases. My rule: interfaces for object shapes that may be extended or implemented, types for everything else — and consistency within the codebase matters more than the choice.</p>`, followUps: ['How do you add a property to a third-party library\'s type?', 'What happens when two interfaces with the same name declare the same property with different types?'] });
  interview.push({ level: 'I', q: 'Explain structural typing. How does it differ from Java or C#, and how do you get nominal behaviour when you need it?', a: `<p>TypeScript compares types by their <b>shape</b>: a value is assignable if it has all required members with compatible types; names and declarations do not matter, and extra members are allowed. Java and C# are <b>nominal</b>: a class must explicitly declare that it implements an interface. Structural typing fits JavaScript's duck-typed objects and literals. The downside is that look-alike types mix freely (<code>UserId</code> and <code>OrderId</code> are both <code>string</code>). For nominal behaviour, use <b>brands</b> (<code>string &amp; { readonly __brand: "UserId" }</code>) created via validating constructors, or classes with <code>#private</code> fields. Also mention the exception to "extra members allowed": excess property checks on fresh object literals.</p>`, followUps: ['Why does a class instance with extra fields pass where an interface is expected?', 'Where do brands show up in popular libraries?'] });
  interview.push({ level: 'I', q: 'What are union and intersection types? Explain the "properties flip" for object types.', a: `<p>Seeing types as sets of values: <code>A | B</code> contains values from either set (bigger); <code>A &amp; B</code> contains values in both sets (smaller). For object types, the <i>usable properties</i> go the opposite way: on <code>Cat | Dog</code> you can only access members both have, because you do not know which one you hold; on <code>Cat &amp; Dog</code> the value has all members of both. Unions model "one of several shapes" (results, events, nullable values), intersections model composition (<code>Entity = HasId &amp; Timestamped</code>, mixin return types <code>T &amp; Extra</code>). Conflicting property types in an intersection collapse to <code>never</code>.</p>`, followUps: ['Why is calling a union of functions often an error?', 'What is the difference between (string | number)[] and string[] | number[]?'] });
  interview.push({ level: 'I', q: 'What are literal types and why does "widening" cause errors like "string is not assignable to \'left\' | \'right\'"?', a: `<p>A literal type is a type with exactly one value, like <code>"left"</code> or <code>42</code>. Unions of literals model fixed sets of values (statuses, HTTP methods). When TS infers a type for a <b>mutable</b> location — a <code>let</code>, an object property, an array element — it widens the literal to its base type, since the value could change later: <code>const opts = { align: "left" }</code> gives <code>align: string</code>. Passing <code>opts.align</code> to a parameter of type <code>"left" | "right"</code> then fails. Fixes: annotate the object, use <code>as const</code> (readonly literals), or <code>satisfies</code> a type with the union (keeps the literal and checks the shape).</p>`, followUps: ['What does as const do to an array?', 'How do you derive a union type from a runtime array?'] });
  interview.push({ level: 'I', q: 'List the ways TypeScript narrows types and when you would use each.', a: `<p><code>typeof</code> for primitives; truthiness for optional values (careful: it also drops <code>0</code> and <code>""</code>); equality (<code>=== null</code>, comparing literals); <code>in</code> for object unions without a tag; <code>instanceof</code> for classes (not interfaces — they do not exist at runtime); <code>Array.isArray</code>; <b>discriminated unions</b> via a shared literal field in <code>if</code>/<code>switch</code> — the main pattern for state and events; <b>type predicates</b> (<code>x is T</code>) to reuse checks; <b>assertion functions</b> (<code>asserts x is T</code>) that throw or narrow the rest of the scope; plus control-flow effects of <code>return</code>, <code>throw</code> and assignments. Since TS 5.5, simple filters like <code>x =&gt; x !== undefined</code> are inferred as predicates.</p>`, followUps: ['Why is narrowing sometimes lost inside callbacks?', 'What is the risk of a user-defined type guard?'] });
  interview.push({ level: 'A', q: 'How do you make "forgot to handle a case" a compile-time error?', a: `<p>Model the cases as a <b>discriminated union</b> and end every <code>switch</code> with an exhaustiveness check: <code>default: return assertNever(x)</code> where <code>function assertNever(x: never): never { throw new Error(...) }</code>. After all cases, <code>x</code> is <code>never</code>, so this compiles; when someone adds a new member, <code>x</code> becomes that member and the call fails to compile at every switch that lacks a case. Alternatives: <code>x satisfies never</code>, or a <code>Record&lt;Union, Handler&gt;</code> lookup / a handlers object (missing keys are errors). <code>assertNever</code> also throws at runtime for data that bypassed the types, e.g. a newer server sending an unknown kind.</p>`, followUps: ['How does this help when AI-generated code adds new event types?', 'What does a default: break do to exhaustiveness?'] });
  interview.push({ level: 'A', q: 'Enums vs union of string literals vs as const objects — what do you recommend in 2026?', a: `<p><b>Enums</b> generate a runtime object (numeric ones with reverse mapping, so iteration returns names and numbers), are partly nominal (string enums reject raw strings), and numeric enums accept any <code>number</code>. <code>const enum</code> inlines values but breaks with <code>isolatedModules</code> and in published libraries. Crucially, enums are not <b>erasable</b>: Node.js type stripping and <code>erasableSyntaxOnly</code> reject them. <b>Literal unions</b> are zero-cost and structural. <b>as const objects</b> with a derived type (<code>type Role = (typeof Role)[keyof typeof Role]</code>) give enum-like dot access, iterable values and erasability. For new code I default to literal unions or as-const objects; in an existing enum-heavy codebase (Angular, NestJS) consistency wins and enums are fine.</p>`, followUps: ['When are numeric enums genuinely useful?', 'How would you migrate 200 enums safely?'] });
  interview.push({ level: 'A', q: 'What problem do generics solve? Explain constraints and how inference picks T.', a: `<p>Generics let a function, type or class work with many types while <b>preserving the relationship</b> between them — <code>first&lt;T&gt;(arr: T[]): T | undefined</code> returns the element type of whatever array is passed, which <code>any</code> (loses information) and <code>unknown</code> (forces re-checking) cannot. <b>Constraints</b> (<code>T extends { length: number }</code>, <code>K extends keyof T</code>) state what T must at least have, so the body can use those members. <b>Inference</b> collects candidates by matching argument types to parameter types; it chooses a common supertype, otherwise the first candidate and reports the other argument (null/undefined are unioned in). Explicit type arguments override inference; <code>NoInfer&lt;T&gt;</code> (TS 5.4) blocks a position from contributing candidates. Rule: a type parameter should appear at least twice.</p>`, followUps: ['Why can you not write new T() in TypeScript?', 'What does a const type parameter do?'] });
  interview.push({ level: 'A', q: 'Why does "T could be instantiated with an arbitrary type" (or "a different subtype of constraint") appear, and how do you fix it?', a: `<p>Inside a generic function, <code>T</code> stands for whatever the <b>caller</b> chooses, which may be a subtype of the constraint with more properties. If you return a fresh object like <code>{ id: "x" }</code> where the return type is <code>T</code>, TS rejects it: the caller might expect <code>T = { id: string; role: Role }</code> and would get an object without <code>role</code>. Fixes: return (a modified copy of) the input, e.g. <code>{ ...obj, id: "x" }</code> which has type <code>T &amp; { id: string }</code>; change the return type to the constraint type instead of <code>T</code>; or accept a factory function from the caller. Casting with <code>as T</code> silences the error but reintroduces the bug.</p>`, followUps: ['Show the spread fix and its resulting type.', 'How does variance relate to this error?'] });
  interview.push({ level: 'A', q: 'Walk me through a tsconfig you would use for a new project and justify the important options.', a: `<p>Start with <code>"strict": true</code> (default since TS 6.0 but explicit is clearer) plus <code>noUncheckedIndexedAccess</code>, <code>exactOptionalPropertyTypes</code>, <code>noImplicitReturns</code>, <code>noFallthroughCasesInSwitch</code>, <code>noImplicitOverride</code>. Match module settings to the runtime: bundled app → <code>module: "preserve"</code>, <code>moduleResolution: "bundler"</code>, <code>noEmit: true</code> (Vite/esbuild builds, tsc only checks); Node app or library → <code>module</code>/<code>moduleResolution: "nodenext"</code>, <code>declaration</code> for libraries. Add <code>verbatimModuleSyntax</code>/<code>isolatedModules</code> so per-file compilers are safe, <code>erasableSyntaxOnly</code> if Node runs <code>.ts</code> directly, <code>skipLibCheck</code> for speed, <code>target</code> ES2022+ and an explicit <code>lib</code>. Avoid TS 6-deprecated options (<code>baseUrl</code>, <code>node10</code> resolution, ES5 target).</p>`, followUps: ['How would you introduce strict into a 500k-line JS codebase?', 'What does skipLibCheck skip, exactly?'] });
  interview.push({ level: 'E', q: 'In an AI-assisted codebase, how do you use TypeScript to keep generated code safe?', a: `<p>Treat the type checker as an automated reviewer the AI must satisfy. Concretely: strict config including <code>noUncheckedIndexedAccess</code>; lint rules and CI checks that block new <code>any</code>, <code>as</code> casts, non-null assertions and <code>@ts-ignore</code> (allow <code>@ts-expect-error</code> with a reason); discriminated unions with <code>assertNever</code> so new cases cannot be half-handled; schemas (Zod/Valibot) at every trust boundary, including LLM JSON output, with types derived from them; branded IDs for high-risk mix-ups. Give agents the types as context and ask them to run <code>tsc --noEmit</code> and tests before proposing changes. Then review the places where the agent had to guess types — that is where bugs hide.</p>`, followUps: ['How do you validate structured output from an LLM?', 'What metrics show type-safety is improving over time?'] });

  registerModule({
    id: 'js10',
    title: 'TypeScript Fundamentals',
    lang: 'ts',
    intro: `<p>TypeScript is JavaScript with a <b>type checker</b> on top: you describe what your values look like, and the compiler catches wrong arguments, missing null checks and typos <b>before</b> the code runs — then erases the types, so what ships is plain JavaScript. Today most serious JS codebases (and most AI-generated JS) are TypeScript, and interviews for frontend, backend and full-stack roles routinely include "why does this not compile?" and "add types to this" questions.</p>
<p>In this module you will learn the everyday core: <b>annotations and inference</b>, <b>interfaces vs type aliases</b> and <b>structural typing</b>, <b>unions, intersections and literal types</b>, <b>narrowing and type guards</b> (including discriminated unions and exhaustive <code>never</code> checks), <b>enums</b> and their modern erasable alternatives, <b>generics</b>, and <b>tsconfig / strict mode</b> as of TypeScript 6. Every topic starts with an analogy, has an interactive visualizer (watch types narrow line by line, compute unions as sets, see enums compile to objects), and ends with expert notes and how AI changes the work. Module 11 builds on this with type-level programming.</p>`,
    goals: [
      'Explain what TypeScript checks (and what it cannot) and decide where to annotate vs rely on inference, including <code>let</code>/<code>const</code> widening, <code>as const</code> and <code>satisfies</code>',
      'Choose between <code>interface</code> and <code>type</code>, explain structural typing and excess property checks, and fix assignability errors',
      'Model data with unions, intersections and literal types, and predict which properties are usable on each',
      'Narrow any union with <code>typeof</code>, <code>in</code>, <code>instanceof</code>, discriminants, type predicates and assertion functions, and enforce exhaustiveness with <code>never</code>',
      'Compare enums, literal unions and <code>as const</code> objects and explain what each compiles to',
      'Write generic functions, interfaces and classes with constraints like <code>K extends keyof T</code>, and debug generic inference errors',
      'Configure <code>tsconfig.json</code> for apps, libraries and Node type stripping, and migrate code to <code>strict</code> mode without casts'
    ],
    prereqs: `JS 1–2 (types, functions, objects, destructuring), JS 6 (classes) and JS 9 (ES modules). Comfort reading compiler error messages helps; no prior TypeScript needed.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
