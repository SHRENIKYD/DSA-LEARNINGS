(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (js11) ---------- */
  var DOL = '$' + '{';   // a literal "${" for TypeScript template-literal code shown inside visualizers
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function cp(code, hl, label) { return { type: 'code', label: label || 'TypeScript (the line being evaluated is highlighted)', lang: 'ts', code: code, hl: hl || {} }; }
  function vp(obj, hl, label) {
    var vals = {};
    Object.keys(obj).forEach(function (k) { vals[k] = String(obj[k]); });
    return { type: 'vars', label: label || 'Type variables (what the compiler knows right now)', vals: vals, hl: hl || {} };
  }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function tb(columns, rows, hl, label) { return { type: 'table', label: label, columns: columns.slice(), rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  // split "a, b<c, d>, e" at top-level separators only (ignores separators inside <> () [] {} and quotes)
  function splitTop(s, sep) {
    var out = [], depth = 0, cur = '', q = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (q) { cur += ch; if (ch === q) q = ''; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { q = ch; cur += ch; continue; }
      if ('<([{'.indexOf(ch) >= 0) depth++;
      if ('>)]}'.indexOf(ch) >= 0 && !(ch === '>' && s.charAt(i - 1) === '=')) depth--;
      if (depth === 0 && ch === sep) { out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  /* ================= TOPIC 1: Generic Constraints ================= */
  topics.push({
    title: 'Generic Constraints: "Any Type, As Long As It Has…"',
    analogy: `<p>Think of a <b>job advert</b> that says <i>"Any applicant welcome — <b>must hold a driving licence</b>."</i> The company does not care if you are tall, short, a designer or a chef. It only needs one guarantee, because the job involves driving.</p>
<p>A <b>generic</b> is the "any applicant welcome" part: a function that works for <i>many</i> types. A <b>constraint</b> (<code>T extends …</code>) is the "must hold a licence" line: the smallest promise the function needs so it can safely use something (like <code>.length</code> or a key) on whatever type arrives.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A generic type parameter <code>T</code> is like a <b>function argument, but for types</b>. When you call <code>identity('hi')</code>, TypeScript fills <code>T</code> with <code>"hi"</code> for you. Without any rule, <code>T</code> could be <i>anything</i> — so inside the function you may not touch <code>.length</code>, because a number has no length.</p>
<p>A <b>constraint</b> writes the rule: <code>&lt;T extends { length: number }&gt;</code> means "T can be any type <b>that is assignable to</b> <code>{ length: number }</code>". Strings, arrays and <code>{ length: 3, x: 1 }</code> all pass; <code>42</code> is rejected at the call site. Note: <code>extends</code> here does <b>not</b> mean class inheritance. It means <b>"fits inside"</b> (is assignable to) — TypeScript is structural, so any type with the right shape qualifies.</p>
${H.table(['You write', 'Plain English', 'What it unlocks'], [
      ['<code>&lt;T&gt;</code>', 'any type at all', 'only things every type supports (pass it around, return it)'],
      ['<code>&lt;T extends { length: number }&gt;</code>', 'any type that has a numeric <code>length</code>', '<code>x.length</code> inside the function'],
      ['<code>&lt;T, K extends keyof T&gt;</code>', 'K must be one of T\'s keys', 'safe <code>obj[key]</code> with return type <code>T[K]</code>'],
      ['<code>&lt;T = string&gt;</code>', 'default if nobody says otherwise', 'nicer APIs: <code>Box</code> means <code>Box&lt;string&gt;</code>'],
      ['<code>&lt;const T extends readonly unknown[]&gt;</code>', 'infer the narrowest literal type', '<code>["a", 1]</code> stays <code>readonly ["a", 1]</code>'],
      ['<code>NoInfer&lt;T&gt;</code> (TS 5.4)', '"don\'t guess T from this argument"', 'the other argument decides T; this one is only checked']
    ])}
<p>🔵 <b>How the compiler uses it.</b> At each call, TypeScript <b>infers</b> T from the arguments (collects "candidates", picks the best one), then <b>checks</b> the inferred T against the constraint. If no candidate exists (nothing to infer from), T falls back to its <b>default</b>, else to its <b>constraint</b>, else to <code>unknown</code>.</p>
<p>The most famous pattern in this whole module links two type parameters: <code>function get&lt;T, K extends keyof T&gt;(obj: T, key: K): T[K]</code>. Read it as: "give me any object, and a key that <b>really exists</b> on it, and I will give you back exactly the type stored under that key." A typo like <code>get(user, 'emial')</code> is now a compile error, and <code>get(user, 'age')</code> returns <code>number</code>, not <code>any</code>.</p>`,
    clues: ['"make this function work for any object but only accept valid keys" → <code>K extends keyof T</code>', '"the return type should depend on the argument" → generic + indexed access <code>T[K]</code>', '"accept anything with a length / id / toString" → structural constraint <code>T extends { id: string }</code>', '"keep the literal types, don\'t widen to string" → <code>const</code> type parameter or a <code>T extends string</code> constraint', '"the default should be X but callers can override" → type parameter default <code>&lt;T = X&gt;</code>', '"infer T from the first argument only" → <code>NoInfer&lt;T&gt;</code> on the other one'],
    code: [`
// 1) A constraint lets us use .length safely on "any" type that has it
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
const word = longest('apple', 'fig');   // T = "apple" | "fig"
const list = longest([1, 2], [3]);      // T = number[]
// @ts-expect-error  number has no 'length' -> rejected at the call site
longest(10, 20);

// 2) Linking two type parameters: K must be a real key of T
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { id: 7, name: 'Asha', admin: true };
const n = getProp(user, 'name');        // string
const a = getProp(user, 'admin');       // boolean
// @ts-expect-error  "emial" is not "id" | "name" | "admin"
getProp(user, 'emial');

// 3) Defaults: callers who don't care get a sensible type
interface ApiResult<TData = unknown, TError = Error> {
  data?: TData;
  error?: TError;
}
const r1: ApiResult = { data: 1 };                  // TData = unknown
const r2: ApiResult<string[]> = { data: ['ok'] };   // TError still Error
`, `
// 4) const type parameters (TS 5.0): keep the narrowest literal types
function tuple<const T extends readonly unknown[]>(...xs: T): T {
  return xs;
}
const t1 = tuple('a', 1, true);        // readonly ["a", 1, true]

// Without "const" the same call widens:
function tupleLoose<T extends unknown[]>(...xs: T): T {
  return xs;
}
const t2 = tupleLoose('a', 1, true);   // [string, number, boolean]

// 5) NoInfer (TS 5.4): only "states" decides S; "initial" is just checked
function createMachine<S extends string>(states: S[], initial: NoInfer<S>) {
  return { states, current: initial };
}
createMachine(['idle', 'loading', 'done'], 'idle');      // OK
// @ts-expect-error  "oops" is not one of the listed states
createMachine(['idle', 'loading', 'done'], 'oops');
`],
    codeTitle: ['Constraints, keyof links and defaults', 'const type parameters and NoInfer'],
    viz: {
      title: 'Does the key satisfy K extends keyof T?',
      input: 'id:number, name:string, email:string, admin:boolean | name, phone',
      inputLabel: 'Object properties (key:type, ...) | keys you pass (comma separated)',
      gen: function (input) {
        var halves = String(input).split('|');
        if (halves.length !== 2) throw new Error('Format: key:type, key:type | key1, key2');
        var props = halves[0].split(',').map(function (s) { return s.trim(); }).filter(Boolean).map(function (p) {
          var kv = p.split(':');
          if (kv.length < 2 || !/^\w+$/.test(kv[0].trim())) throw new Error('Each property must look like name:type');
          return [kv[0].trim(), kv.slice(1).join(':').trim()];
        });
        var asked = halves[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!props.length || !asked.length) throw new Error('Give at least one property and one key');
        if (props.length > 10 || asked.length > 6) throw new Error('Use at most 10 properties and 6 keys');
        var keys = props.map(function (p) { return p[0]; });
        var keyUnion = keys.map(function (k) { return '"' + k + '"'; }).join(' | ');
        var code = 'function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {\n  return obj[key];\n}\nconst obj = { ' + props.map(function (p) { return p[0] + ': ' + p[1]; }).join(', ') + ' };\ngetProp(obj, ' + asked.map(function (k) { return "'" + k + "'"; }).join(' | ') + ');';
        var frames = [];
        frames.push(fr('Step 1 — TypeScript infers <b>T</b> from the first argument: it is the shape of <code>obj</code>.', [cp(code, { 4: 'cur' }), tb(['key', 'type'], props, {}, 'T = typeof obj'), vp({ T: '{ ' + props.map(function (p) { return p[0] + ': ' + p[1]; }).join('; ') + ' }', K: '?' }, { T: 'ok' })]));
        frames.push(fr('Step 2 — compute the constraint <code>keyof T</code>: the <b>union of all key names</b>. K is only allowed to be something inside this set.', [cp(code, { 1: 'cur' }), { type: 'set', label: 'keyof T', items: keys.slice() }, vp({ 'keyof T': keyUnion }, { 'keyof T': 'cur' })]));
        var okTypes = [], bad = [];
        asked.forEach(function (k, i) {
          var idx = keys.indexOf(k), hl = {};
          if (idx >= 0) { hl[k] = 'ok'; okTypes.push(props[idx][1]); } else { bad.push(k); }
          var rowHl = {}; if (idx >= 0) rowHl[idx] = 'ok';
          frames.push(fr('Step ' + (3 + i) + ' — check candidate <code>"' + esc(k) + '"</code>: ' + (idx >= 0 ? '<span class="c-g">it IS in keyof T</span>, so this member of K is fine and <code>T["' + esc(k) + '"]</code> = <code>' + esc(props[idx][1]) + '</code>.' : '<span class="c-r">it is NOT in keyof T</span>. A union passes the constraint only if <b>every</b> member fits, so this is a compile error.'),
            [cp(code, { 5: idx >= 0 ? 'ok' : 'bad' }), { type: 'set', label: 'keyof T', items: keys.slice(), hl: hl }, tb(['key', 'type'], props, rowHl, 'T')]));
        });
        if (bad.length) {
          frames.push(fr('<span class="c-r">Result: compile error.</span> The editor underlines the key argument — the bug is caught before the code ever runs. That is the whole point of the constraint.', [tx('<pre>Argument of type \'' + esc(asked.map(function (k) { return '"' + k + '"'; }).join(' | ')) + '\' is not assignable to parameter of type \'' + esc(keyUnion) + '\'.</pre>', 'tsc says'), vp({ invalid: bad.map(function (k) { return '"' + k + '"'; }).join(' | ') }, { invalid: 'bad' })]));
        }
        var uniq = okTypes.filter(function (t, i) { return okTypes.indexOf(t) === i; });
        frames.push(fr('Return type is the <b>indexed access</b> <code>T[K]</code>. For a union K it is the union of each looked-up type' + (bad.length ? ' (shown for the valid keys only)' : '') + '. No <code>any</code> anywhere — the result is exact.', [cp(code, { 1: 'sel' }), vp({ K: asked.filter(function (k) { return keys.indexOf(k) >= 0; }).map(function (k) { return '"' + k + '"'; }).join(' | ') || 'never', 'T[K]': uniq.join(' | ') || 'never' }, { 'T[K]': 'sel' })]));
        frames.push(fr('Take-away: <code>K extends keyof T</code> <b>links</b> the two parameters, so a typo is impossible and the result type follows the key you pass.', [tx('<b>Pattern:</b> <code>function f&lt;T, K extends keyof T&gt;(o: T, k: K): T[K]</code> — memorise it, it shows up in every TS interview.')]));
        return frames;
      }
    },
    examples: [
      { title: 'Constraint unlocks property access', html: `<p>Without a constraint, <code>T</code> might be a number, so <code>x.length</code> is an error: <i>Property 'length' does not exist on type 'T'</i>. Adding <code>extends { length: number }</code> narrows the allowed types and unlocks the property. Strings, arrays and plain objects with a numeric length all pass.</p>`, code: `
function logLength<T extends { length: number }>(x: T): T {
  console.log(x.length);   // allowed: every T has length
  return x;                // we return T, not { length: number } -> caller keeps the exact type
}
const s = logLength('hello');            // "hello"
const arr = logLength([1, 2, 3]);        // number[]
const obj = logLength({ length: 2, tag: 'x' });  // { length: number; tag: string }
` },
      { title: 'Setter whose value must match the key', html: `<p>Linking three positions: the key must exist and the value must have <b>that key's</b> type. <code>setField(cfg, 'port', '80')</code> fails because <code>Config['port']</code> is <code>number</code>.</p>`, code: `
interface Config { host: string; port: number; debug: boolean }

function setField<T, K extends keyof T>(obj: T, key: K, value: T[K]): void {
  obj[key] = value;
}
const cfg: Config = { host: 'localhost', port: 8080, debug: false };
setField(cfg, 'port', 3000);      // OK
setField(cfg, 'debug', true);     // OK
// @ts-expect-error  string is not assignable to number
setField(cfg, 'port', '80');
` },
      { title: 'Returning the constraint instead of T loses information', html: `<p>A classic review comment. If the function is declared to return the <b>constraint</b> type, callers lose their specific type. Return <code>T</code> so the extra properties survive.</p>`, code: `
interface HasId { id: string }

function bad(x: HasId): HasId { return x; }
function good<T extends HasId>(x: T): T { return x; }

const u = { id: 'u1', name: 'Ben' };
const b = bad(u);    // HasId          -> b.name is an error
const g = good(u);   // { id: string; name: string } -> g.name works
console.log(g.name);
` }
    ],
    deepDive: `<p>🟣 <b>Constraint = upper bound.</b> <code>T extends C</code> means "T is assignable to C". It is checked <b>at the call site</b> after inference. Inside the function body the compiler only knows "T is <i>some</i> subtype of C", so <code>const x: T = someC</code> is an error — a C is not necessarily a T (the classic message <i>"'C' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype"</i>).</p>
<p><b>How inference picks T.</b> The checker walks the parameters, collects <b>candidates</b> for each type parameter, then picks a best common supertype (or a union for literal candidates, as with <code>longest('apple', 'fig')</code> → <code>"apple" | "fig"</code>). Literal types are kept when the type parameter appears at the top level of the return type, or when the constraint includes a primitive (<code>T extends string</code>); they widen when assigned to a mutable <code>let</code>. A <code>const</code> type parameter makes the checker infer as if the argument had <code>as const</code>.</p>
<p><b>Picking the bound.</b> <code>unknown</code> accepts everything (including <code>null</code>); <code>{}</code> accepts everything except <code>null</code>/<code>undefined</code>; <code>object</code> accepts only non-primitives; <code>readonly unknown[]</code> accepts both mutable and readonly arrays (prefer it over <code>any[]</code>). <b>Variance annotations</b> <code>in</code>/<code>out</code> on type parameters (TS 4.7) document and speed up variance checks for big generic types.</p>
<p><b>Production reality.</b> Over-generic code is a smell: if T appears only once in a signature, it is usually pointless (<code>function f&lt;T&gt;(x: T): void</code> ≈ <code>(x: unknown)</code>). Deeply nested generic calls can hit <i>"Type instantiation is excessively deep and possibly infinite"</i>; slow builds are often caused by huge inferred types — use <code>tsc --extendedDiagnostics</code> and <code>--generateTrace</code> to find them.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants write generic signatures instantly, but they love two failure modes: slapping <code>any</code> on the hard part, or making everything generic "just in case". Your job shifts from typing the signature to <b>judging</b> it.</p>
<p><b>Use AI as a partner:</b> ask <code>"Write a getProp helper typed with K extends keyof T, plus 5 @ts-expect-error lines proving bad keys fail"</code>. Then run <code>tsc --noEmit</code> — the compiler is the judge, not the chat. Ask it to add type tests with <code>expectTypeOf</code> (Vitest) or <code>tsd</code> so the contract is locked in CI.</p>
<p><b>Where AI goes wrong:</b> returns the constraint type instead of <code>T</code> (losing info), forgets that a <code>let</code> widens literals, uses <code>T extends object</code> when <code>null</code> must be allowed, invents utility types that do not exist. <b>What you must still own:</b> knowing <i>why</i> a constraint is needed, reading inference errors, and deciding when a plain non-generic type is simpler.</p>`,
    problems: [{
      title: 'Type-safe pluck',
      level: 'Easy', tags: ['generics', 'keyof', 'indexed access'], companies: ['Microsoft', 'Atlassian'],
      statement: `<p>Write <code>pluck(items, key)</code> that returns the value of <code>key</code> from every object in <code>items</code>. The types must be exact: plucking <code>'age'</code> from users gives <code>number[]</code>, and a key that does not exist must be a <b>compile error</b>.</p>`,
      constraints: `<p>No <code>any</code>. Works for any object type. Runtime is a simple map.</p>`,
      example: `<p><code>pluck([{name:'Asha', age: 31}, {name:'Ben', age: 25}], 'age')</code> → ${H.c('g', '[31, 25]')} typed as ${H.c('b', 'number[]')}. <code>pluck(users, 'agee')</code> → ${H.c('r', 'compile error')} because "agee" is not a key.</p>`,
      brute: { why: `<p>Typing everything as <code>any</code> compiles and runs, but the type checker learns nothing: typos in the key are allowed and the result is <code>any[]</code>, so mistakes leak downstream.</p>`, code: `
function pluck(items: any[], key: string): any[] {
  return items.map((item) => item[key]);   // typo in key? no error. result? any[]
}
const ages = pluck([{ age: 31 }], 'agee'); // compiles, returns [undefined] at runtime
` },
      mcq: { q: 'Which signature makes a wrong key a compile error AND keeps the exact element type?', options: ['<code>pluck&lt;T&gt;(items: T[], key: string): unknown[]</code>', '<code>pluck&lt;T, K extends keyof T&gt;(items: T[], key: K): T[K][]</code>', '<code>pluck(items: object[], key: keyof object): any[]</code>', '<code>pluck&lt;K extends string&gt;(items: Record&lt;K, any&gt;[], key: K): any[]</code>'], answer: 1, explain: 'K is linked to T by the constraint (only real keys), and the result uses indexed access T[K] so the element type is exact.' },
      hints: [`<p>Hint 1: the valid keys depend on the type of the items, so the key's type parameter must be <b>constrained by</b> the items' type parameter.</p>`, `<p>Hint 2: use <code>K extends keyof T</code> and the indexed access type <code>T[K]</code> for one value; the result is an array of those.</p>`, `<p>Hint 3: recipe — declare <code>&lt;T, K extends keyof T&gt;</code>, parameters <code>items: T[]</code> and <code>key: K</code>, return <code>T[K][]</code>, body <code>items.map(i =&gt; i[key])</code>. Also try a union key: you get a union element type.</p>`],
      solution: {
        approach: `<p>Infer <code>T</code> from the array, constrain <code>K</code> to <code>keyof T</code>, and return <code>T[K][]</code>. The runtime code is a one-liner; all the value is in the signature.</p>`,
        code: `
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

const users = [{ name: 'Asha', age: 31 }, { name: 'Ben', age: 25 }];
const ages = pluck(users, 'age');            // number[]
const names = pluck(users, 'name');          // string[]
const mixed = pluck(users, Math.random() > 0.5 ? 'age' : 'name'); // (string | number)[]
// @ts-expect-error  "agee" is not a key of the user objects
pluck(users, 'agee');

type cases = [
  Expect<Equal<typeof ages, number[]>>,
  Expect<Equal<typeof names, string[]>>,
  Expect<Equal<typeof mixed, (string | number)[]>>
];
console.log(ages, names, mixed);
`,
        dry: { head: ['call', 'T inferred', 'K inferred', 'K extends keyof T?', 'return T[K][]'], rows: [
          ["pluck(users, 'age')", '{ name: string; age: number }', '"age"', H.c('g', 'yes'), 'number[]'],
          ["pluck(users, 'name')", 'same', '"name"', H.c('g', 'yes'), 'string[]'],
          ["pluck(users, cond ? 'age' : 'name')", 'same', '"age" | "name"', H.c('g', 'yes (both members)'), '(string | number)[]'],
          ["pluck(users, 'agee')", 'same', '"agee"', H.c('r', 'no → error'), '—']
        ] },
        complexity: `<p>Runtime O(n) for the map. Type-level cost is trivial: one inference and one keyof check per call.</p>`,
        followUps: ['Make it accept a readonly array too (<code>readonly T[]</code>).', 'Pluck several keys at once and return <code>Pick&lt;T, K&gt;[]</code>.', 'Support dot-paths like <code>"address.city"</code> (see the template-literal topic).']
      }
    }]
  });

  /* ================= TOPIC 2: keyof, typeof, indexed access ================= */
  topics.push({
    title: 'keyof, typeof & Indexed Access: Reading Types Like Data',
    analogy: `<p>Imagine a <b>filing cabinet</b>. <code>typeof</code> is taking a <b>photo of a real cabinet</b> so you get its blueprint without re-drawing it by hand. <code>keyof</code> reads the <b>labels on the drawers</b> ("id", "name", "email"). <b>Indexed access</b> <code>T["name"]</code> is <b>opening one drawer</b> to see what kind of thing is inside.</p>
<p>Together they let you <b>derive</b> new types from things that already exist, instead of copying and pasting shapes that drift out of sync.</p>`,
    explain: `<p>🟢 <b>Three operators, one idea: compute types from other types.</b></p>
<ul>
<li><b><code>typeof value</code></b> (in a <i>type</i> position) gives the static type of a variable or function. <code>const cfg = { port: 80 }; type Cfg = typeof cfg;</code> → <code>{ port: number }</code>. This is TypeScript's <code>typeof</code>, different from the runtime JavaScript <code>typeof x === 'string'</code> check.</li>
<li><b><code>keyof T</code></b> gives the <b>union of T's property names</b> as literal types: <code>keyof { id: number; name: string }</code> → <code>"id" | "name"</code>.</li>
<li><b><code>T[K]</code></b> (indexed access) looks up the type of a property. <code>K</code> can be a single key, a union of keys (you get a union of types), <code>keyof T</code> (every value type), or <code>number</code> for arrays/tuples (the element type).</li>
</ul>
${H.table(['Expression', 'Result', 'Why'], [
      ['<code>keyof { id: number; name: string }</code>', '<code>"id" | "name"</code>', 'the drawer labels'],
      ['<code>User["name"]</code>', '<code>string</code>', 'open one drawer'],
      ['<code>User["id" | "name"]</code>', '<code>number | string</code>', 'open two drawers, union the contents'],
      ['<code>User[keyof User]</code>', 'union of every value type', 'open every drawer'],
      ['<code>string[][number]</code>', '<code>string</code>', 'element type of an array'],
      ['<code>[boolean, Date][1]</code>', '<code>Date</code>', 'tuple slot by position'],
      ['<code>keyof { [k: string]: number }</code>', '<code>string | number</code>', 'JS turns numeric keys into strings, so number keys fit too'],
      ['<code>(typeof COLORS)[number]</code> with <code>as const</code>', '<code>"red" | "green"</code>', 'array of literals → union of literals']
    ])}
<p>🔵 <b>The "single source of truth" pattern.</b> Write the data <b>once</b> (an object or an <code>as const</code> array) and derive every type from it with <code>keyof typeof</code> and <code>(typeof X)[number]</code>. Add a new route or role to the data and every type, switch and lookup updates automatically.</p>
<p>Use <code>satisfies</code> (TS 4.9) to <b>check</b> such data against a wider type without <b>losing</b> its narrow literal types: <code>const ROUTES = { home: '/', user: '/u/:id' } satisfies Record&lt;string, string&gt;</code> keeps <code>"home" | "user"</code> as the keys.</p>`,
    clues: ['"derive the type from this constant / config so they can\'t drift" → <code>typeof</code> + <code>as const</code>', '"union of the object\'s keys" → <code>keyof typeof obj</code>', '"the element type of this array / the type of this nested field" → <code>T[number]</code>, <code>T["a"]["b"]</code>', '"type of what this function returns" → <code>ReturnType&lt;typeof fn&gt;</code>', '"validate the shape but keep literal keys" → <code>satisfies</code>', '"list of allowed values at runtime AND as a type" → <code>const X = [...] as const; type T = (typeof X)[number]</code>'],
    code: [`
// --- typeof: copy the type of a VALUE into the type world
const config = { host: 'localhost', port: 8080, retries: [100, 200, 400] };
type Config = typeof config;
//   { host: string; port: number; retries: number[] }

// --- keyof: union of property names
type ConfigKey = keyof Config;                 // "host" | "port" | "retries"

// --- indexed access: look up property types
type Port = Config['port'];                    // number
type HostOrPort = Config['host' | 'port'];     // string | number
type AnyValue = Config[keyof Config];          // string | number | number[]
type Retry = Config['retries'][number];        // number

// --- deriving a union from a runtime list (single source of truth)
const ROLES = ['admin', 'editor', 'viewer'] as const;
type Role = (typeof ROLES)[number];            // "admin" | "editor" | "viewer"

function isRole(x: string): x is Role {
  return (ROLES as readonly string[]).includes(x);
}

// --- keyof typeof on an object map + satisfies keeps the literal keys
const ROUTES = {
  home: '/',
  profile: '/users/:id',
  settings: '/settings',
} satisfies Record<string, string>;
type RouteName = keyof typeof ROUTES;          // "home" | "profile" | "settings"

function go(route: RouteName): string {
  return ROUTES[route];
}
go('profile');
`],
    codeTitle: ['typeof, keyof, T[K], as const and satisfies'],
    viz: [{
      title: 'From a value to keyof and T[K]',
      input: 'id:number, name:string, tags:string[], admin:boolean',
      inputLabel: 'Fields of the object (key:type, comma separated)',
      gen: function (input) {
        var props = splitTop(String(input), ',').map(function (p) {
          var i = p.indexOf(':');
          if (i < 1) throw new Error('Each field must look like key:type');
          var k = p.slice(0, i).trim(), t = p.slice(i + 1).trim();
          if (!/^\w+$/.test(k) || !t) throw new Error('Keys must be plain words, types must be non-empty');
          return [k, t];
        });
        if (props.length < 2 || props.length > 8) throw new Error('Use between 2 and 8 fields');
        var keys = props.map(function (p) { return p[0]; });
        var objType = '{ ' + props.map(function (p) { return p[0] + ': ' + p[1]; }).join('; ') + ' }';
        var code = 'const user = { ' + props.map(function (p) { return p[0] + ': /* ' + p[1] + ' */ ' + (p[1] === 'number' ? '1' : p[1] === 'boolean' ? 'true' : /\[\]$/.test(p[1]) ? '[]' : p[1] === 'string' ? "'x'" : 'null!'); }).join(', ') + ' };\ntype User = typeof user;\ntype Keys = keyof User;\ntype First = User["' + keys[0] + '"];\ntype Two = User["' + keys[0] + '" | "' + keys[1] + '"];\ntype Values = User[keyof User];';
        var frames = [];
        frames.push(fr('We start with a <b>runtime value</b> (an object). TypeScript already knows its type — we just need a way to <i>name</i> it.', [cp(code, { 1: 'cur' }), tb(['key', 'type'], props, {}, 'user (value)')]));
        frames.push(fr('<code>typeof user</code> in a <b>type position</b> copies the inferred type. No hand-written interface, so it can never drift from the data.', [cp(code, { 2: 'ok' }), vp({ User: objType }, { User: 'ok' })]));
        frames.push(fr('<code>keyof User</code> collects the property <b>names</b> as string literal types and joins them with <code>|</code>.', [cp(code, { 3: 'cur' }), { type: 'set', label: 'keyof User', items: keys.slice(), hl: {} }, vp({ Keys: keys.map(function (k) { return '"' + k + '"'; }).join(' | ') }, { Keys: 'ok' })]));
        props.forEach(function (p, i) {
          var hl = {}; hl[p[0]] = 'cur';
          if (i < 3) frames.push(fr('Each key is a <b>literal type</b> on its own: <code>"' + esc(p[0]) + '"</code> is a type whose only value is that exact string. It maps to <code>' + esc(p[1]) + '</code>.', [{ type: 'map', label: 'User as key → type', entries: props.map(function (q) { return [q[0], q[1]]; }), hl: hl }]));
        });
        frames.push(fr('Indexed access <code>User["' + esc(keys[0]) + '"]</code> opens one drawer → <code>' + esc(props[0][1]) + '</code>.', [cp(code, { 4: 'sel' }), tb(['key', 'type'], props, { 0: 'sel' }, 'User'), vp({ First: props[0][1] }, { First: 'sel' })]));
        var two = [props[0][1], props[1][1]].filter(function (t, i, a) { return a.indexOf(t) === i; }).join(' | ');
        frames.push(fr('Pass a <b>union of keys</b> and you get a <b>union of types</b>: each key is looked up separately (indexed access distributes over the key union).', [cp(code, { 5: 'sel' }), tb(['key', 'type'], props, { 0: 'sel', 1: 'sel' }, 'User'), vp({ Two: two }, { Two: 'sel' })]));
        var all = props.map(function (p) { return p[1]; }).filter(function (t, i, a) { return a.indexOf(t) === i; });
        var allHl = {}; props.forEach(function (_, i) { allHl[i] = 'sel'; });
        frames.push(fr('<code>User[keyof User]</code> opens <b>every</b> drawer → the union of all value types (duplicates collapse). Handy for "any value of this object".', [cp(code, { 6: 'sel' }), tb(['key', 'type'], props, allHl, 'User'), vp({ Values: all.join(' | ') }, { Values: 'sel' })]));
        var arrField = props.filter(function (p) { return /\[\]$/.test(p[1]); })[0];
        if (arrField) frames.push(fr('Bonus: <code>User["' + esc(arrField[0]) + '"][number]</code> indexes an <b>array type with number</b> → its element type <code>' + esc(arrField[1].replace(/\[\]$/, '')) + '</code>.', [vp({ Element: arrField[1].replace(/\[\]$/, '') }, { Element: 'ok' })]));
        return frames;
      }
    }, {
      title: 'as const: from a runtime list to a union type',
      input: 'small, medium, large',
      inputLabel: 'Allowed values (comma separated words)',
      gen: function (input) {
        var vals = String(input).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (vals.length < 2 || vals.length > 8 || vals.some(function (v) { return !/^[\w-]+$/.test(v); })) throw new Error('Give 2-8 simple words separated by commas');
        var lit = vals.map(function (v) { return "'" + v + "'"; }).join(', ');
        var quoted = vals.map(function (v) { return '"' + v + '"'; });
        var code1 = 'const SIZES = [' + lit + '];\ntype Size = (typeof SIZES)[number];';
        var code2 = 'const SIZES = [' + lit + '] as const;\ntype Size = (typeof SIZES)[number];';
        var frames = [];
        frames.push(fr('Without <code>as const</code>, an array literal is <b>widened</b>: TS assumes you may push other strings later.', [cp(code1, { 1: 'cur' }), vp({ 'typeof SIZES': 'string[]' }, { 'typeof SIZES': 'bad' })]));
        frames.push(fr('So <code>(typeof SIZES)[number]</code> is just <code>string</code> — useless as a set of allowed values.', [cp(code1, { 2: 'bad' }), vp({ Size: 'string' }, { Size: 'bad' })]));
        frames.push(fr('Add <code>as const</code>: the array becomes a <b>readonly tuple of literal types</b>. Nothing can be pushed, so each slot keeps its exact value.', [cp(code2, { 1: 'ok' }), { type: 'array', label: 'typeof SIZES (readonly tuple)', values: quoted.slice() }, vp({ 'typeof SIZES': 'readonly [' + quoted.join(', ') + ']' }, { 'typeof SIZES': 'ok' })]));
        quoted.forEach(function (q, i) {
          var hl = {}; hl[i] = 'cur';
          frames.push(fr('Indexing with <code>number</code> means "any position" — slot ' + i + ' contributes <code>' + esc(q) + '</code> to the union.', [{ type: 'array', label: 'typeof SIZES', values: quoted.slice(), hl: hl }, vp({ 'Size so far': quoted.slice(0, i + 1).join(' | ') }, { 'Size so far': 'cur' })]));
        });
        frames.push(fr('Done: one runtime list drives both the UI (loop over <code>SIZES</code>) and the type (<code>Size</code>). Add a value once and both update.', [cp(code2, { 2: 'sel' }), vp({ Size: quoted.join(' | ') }, { Size: 'sel' })]));
        return frames;
      }
    }],
    examples: [
      { title: 'Deep lookup in an API response type', html: `<p>Indexed access chains like property access. You can pull the type of a deeply nested item without declaring it separately — great when the response type is generated from OpenAPI/GraphQL.</p>`, code: `
interface SearchResponse {
  data: {
    items: { id: string; title: string; score: number }[];
    total: number;
  };
}
type Item = SearchResponse['data']['items'][number];   // { id: string; title: string; score: number }
type Score = Item['score'];                             // number

function topTitle(res: SearchResponse): Item['title'] | undefined {
  return res.data.items.toSorted((a, b) => b.score - a.score)[0]?.title;
}
` },
      { title: 'ReturnType of a value with typeof', html: `<p><code>ReturnType</code> takes a <b>type</b>, so you must write <code>ReturnType&lt;typeof makeStore&gt;</code>, not <code>ReturnType&lt;makeStore&gt;</code> (error: <i>'makeStore' refers to a value, but is being used as a type</i>).</p>`, code: `
function makeStore() {
  let count = 0;
  return { inc: () => ++count, get: () => count };
}
type Store = ReturnType<typeof makeStore>;   // { inc: () => number; get: () => number }

function useStore(s: Store): number {
  s.inc();
  return s.get();
}
` },
      { title: 'Exhaustive lookup table keyed by a union', html: `<p>Deriving the key union from data and then using <code>Record&lt;Role, …&gt;</code> forces you to handle every role: forget one and the compiler complains <i>Property 'viewer' is missing</i>.</p>`, code: `
const ROLES = ['admin', 'editor', 'viewer'] as const;
type Role = (typeof ROLES)[number];

const permissions: Record<Role, readonly string[]> = {
  admin: ['read', 'write', 'delete'],
  editor: ['read', 'write'],
  viewer: ['read'],
};
for (const r of ROLES) console.log(r, permissions[r].join(','));
` }
    ],
    deepDive: `<p>🟣 <b>keyof edge cases.</b> <code>keyof any</code> is <code>string | number | symbol</code> (the type of any property key, also spelled <code>PropertyKey</code>). With a string index signature, <code>keyof</code> is <code>string | number</code> because <code>obj[1]</code> is really <code>obj["1"]</code>. <code>keyof</code> of a union gives only the <b>common</b> keys (<code>keyof (A | B)</code> = <code>keyof A &amp; keyof B</code>), while <code>keyof</code> of an intersection gives <b>all</b> keys. <code>keyof</code> an array type includes <code>number</code> plus every method name (<code>"length" | "push" | …</code>).</p>
<p><b>Indexed access rules.</b> The index type must be assignable to <code>keyof T</code>, otherwise: <i>Property 'x' does not exist on type</i>. Optional properties include <code>undefined</code> in the lookup (<code>{ a?: string }["a"]</code> is <code>string | undefined</code>). On a generic <code>T[K]</code> the compiler <b>defers</b> resolution until T and K are known — that is what makes <code>getProp</code> precise.</p>
<p><b>typeof limits.</b> Type-level <code>typeof</code> only accepts identifiers and property chains (<code>typeof a.b.c</code>), not arbitrary expressions (<code>typeof f()</code> is invalid — use <code>ReturnType&lt;typeof f&gt;</code>). <b>as const</b> makes properties <code>readonly</code> deeply and preserves literals; <b>satisfies</b> validates without widening, so <code>as const satisfies Record&lt;string, Route&gt;</code> is a powerful combo. Enums can often be replaced by <code>as const</code> objects + <code>keyof typeof</code>, which also works with <code>erasableSyntaxOnly</code>/type-stripping in Node.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant can turn a JSON sample into a full interface in a second — but that interface is a <b>copy</b>, and copies drift. Prefer prompting for the <b>derivation</b>: <code>"Rewrite these hand-written types to be derived from the ROUTES constant with keyof typeof and satisfies."</code></p>
<p><b>Use AI as a partner:</b> paste a big generated type (OpenAPI, Prisma, GraphQL codegen) and ask for indexed-access aliases for the 5 shapes you actually use (<code>Paths['/users']['get']['responses']['200']</code>…). It is tedious for humans and easy to verify with hover.</p>
<p><b>Where AI goes wrong:</b> mixes runtime <code>typeof x === 'object'</code> with type-level <code>typeof</code>, forgets <code>as const</code> so unions collapse to <code>string</code>, writes <code>ReturnType&lt;fn&gt;</code> without <code>typeof</code>, or uses an <code>enum</code> where a const object is the team convention. <b>What you must still own:</b> choosing the single source of truth and making sure types are derived from it, not duplicated.</p>`,
    problems: [{
      title: 'Typed lookup from a constant map',
      level: 'Easy', tags: ['keyof typeof', 'as const', 'indexed access'], companies: ['Shopify', 'Stripe'],
      statement: `<p>You have <code>const STATUS = { ok: 200, created: 201, notFound: 404 } as const</code>. Write the types <code>StatusName</code> (the keys) and <code>StatusCode</code> (the values), plus a function <code>codeOf(name)</code> whose return type is the <b>exact</b> code for that name (e.g. <code>codeOf('created')</code> is typed <code>201</code>).</p>`,
      constraints: `<p>Derive everything from <code>STATUS</code>; no hand-written unions.</p>`,
      example: `<p><code>codeOf('notFound')</code> → ${H.c('g', '404')} typed as the literal ${H.c('b', '404')}. <code>StatusCode</code> = ${H.c('b', '200 | 201 | 404')}. <code>codeOf('teapot')</code> → ${H.c('r', 'compile error')}.</p>`,
      brute: { why: `<p>Writing the unions by hand works today but duplicates the data: add <code>teapot: 418</code> to the object and the hand-written types are silently stale. And typing the return as <code>number</code> throws away the exact code.</p>`, code: `
const STATUS = { ok: 200, created: 201, notFound: 404 };
type StatusName = 'ok' | 'created' | 'notFound';   // duplicated by hand
type StatusCode = number;                         // too wide
function codeOf(name: StatusName): StatusCode {
  return STATUS[name];
}
` },
      mcq: { q: 'Without <code>as const</code>, what is <code>(typeof STATUS)["ok"]</code>?', options: ['<code>200</code>', '<code>number</code>', '<code>"ok"</code>', '<code>readonly 200</code>'], answer: 1, explain: 'Object literal properties are mutable, so TS widens 200 to number. as const keeps the literal 200 and adds readonly.' },
      hints: [`<p>Hint 1: freeze the object with <code>as const</code> so its values stay literal types instead of widening to <code>number</code>.</p>`, `<p>Hint 2: keys are <code>keyof typeof STATUS</code>; values are <code>(typeof STATUS)[keyof typeof STATUS]</code>.</p>`, `<p>Hint 3: make <code>codeOf</code> generic: <code>&lt;N extends StatusName&gt;(name: N)</code> returning <code>(typeof STATUS)[N]</code> — the return type then follows the argument.</p>`],
      solution: {
        approach: `<p>Make the data the single source of truth (<code>as const</code>), derive the key union with <code>keyof typeof</code>, derive the value union with an indexed access over all keys, and use a generic key parameter so the function returns the exact literal.</p>`,
        code: `
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

const STATUS = { ok: 200, created: 201, notFound: 404 } as const;

type StatusName = keyof typeof STATUS;                  // "ok" | "created" | "notFound"
type StatusCode = (typeof STATUS)[StatusName];          // 200 | 201 | 404

function codeOf<N extends StatusName>(name: N): (typeof STATUS)[N] {
  return STATUS[name];
}

const c = codeOf('created');
// @ts-expect-error  "teapot" is not a StatusName
codeOf('teapot');

type cases = [
  Expect<Equal<StatusName, 'ok' | 'created' | 'notFound'>>,
  Expect<Equal<StatusCode, 200 | 201 | 404>>,
  Expect<Equal<typeof c, 201>>
];
console.log(c);
`,
        dry: { head: ['expression', 'evaluates to'], rows: [
          ['typeof STATUS', '{ readonly ok: 200; readonly created: 201; readonly notFound: 404 }'],
          ['keyof typeof STATUS', '"ok" | "created" | "notFound"'],
          ['(typeof STATUS)[StatusName]', '200 | 201 | 404'],
          ["codeOf('created') → N", '"created"'],
          ['return type (typeof STATUS)["created"]', H.c('g', '201')]
        ] },
        complexity: `<p>Runtime O(1) lookup. Type-level: constant work per call.</p>`,
        followUps: ['Build the reverse map type: code → name (see mapped types + key remapping).', 'Add <code>satisfies Record&lt;string, number&gt;</code> and explain what it adds.', 'Write <code>isStatusName(x: string): x is StatusName</code>.']
      }
    }]
  });
registerModule({ id: 'js11', title: 'x', lang:'ts', topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
