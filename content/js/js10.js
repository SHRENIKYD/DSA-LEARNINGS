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
  registerModule({ id: 'js10', title: 'TypeScript Fundamentals', lang: 'ts', intro: '<p>tmp</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
