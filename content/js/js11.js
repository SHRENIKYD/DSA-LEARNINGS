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
      tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(json, key) {\n  if (json === 'BIG') { var items = []; for (var i = 0; i < 100000; i++) items.push({ v: i }); var r = pluck(items, 'v'); return [r.length, r[99999]]; }\n  return pluck(JSON.parse(json), key);\n}"},"cases":[[["[{\"name\":\"Asha\",\"age\":31},{\"name\":\"Ben\",\"age\":25}]","age"],[31,25]],[["[{\"name\":\"Asha\",\"age\":31},{\"name\":\"Ben\",\"age\":25}]","name"],["Asha","Ben"]],[["[]","x"],[]],[["[{\"v\":0}]","v"],[0]],[["[{\"ok\":false},{\"ok\":true},{\"ok\":false}]","ok"],[false,true,false]],[["[{\"a\":{\"b\":1}}]","a"],[{"b":1}]],[["BIG","v"],[100000,99999]]]},
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
      tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(name) {\n  if (name === 'STATUS') return STATUS;\n  if (name === 'frozenish') return Object.keys(STATUS);\n  return codeOf(name);\n}"},"cases":[[["ok"],200],[["created"],201],[["notFound"],404],[["STATUS"],{"ok":200,"created":201,"notFound":404}],[["frozenish"],["ok","created","notFound"]]]},
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

  /* ---------- tiny "is this simple type assignable to that one?" checker for the visualizers ---------- */
  function litKind(t) {
    t = t.trim();
    if (/^(['"]).*\1$/.test(t)) return 'string';
    if (/^-?\d+(\.\d+)?$/.test(t)) return 'number';
    if (t === 'true' || t === 'false') return 'boolean';
    if (/^-?\d+n$/.test(t)) return 'bigint';
    return null;
  }
  function assignable(m, u) {
    m = m.trim(); u = u.trim();
    if (m === u) return true;
    if (u === 'unknown' || u === 'any') return true;
    if (m === 'never') return true;
    if (m === 'any') return true;   // any is special (both branches) — handled by the caller
    var lk = litKind(m);
    if (lk && lk === u) return true;
    if (u === 'object' && /^(\{.*\}|Date|RegExp|Map<.*>|Set<.*>|.*\[\]|\(.*\)\s*=>.*)$/.test(m)) return true;
    if (u === 'Function' && /^\(.*\)\s*=>.*$/.test(m)) return true;
    if (u === '{}' && m !== 'null' && m !== 'undefined') return true;
    if (/\[\]$/.test(u) && /\[\]$/.test(m)) return assignable(m.slice(0, -2), u.slice(0, -2));
    return false;
  }
  function assignableToUnion(m, uParts) { return uParts.some(function (u) { return assignable(m, u); }); }
  function expandBoolean(parts) {
    var out = [];
    parts.forEach(function (p) { if (p === 'boolean') { out.push('true'); out.push('false'); } else out.push(p); });
    return out;
  }
  function uniqStr(a) { var o = []; a.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }
  function joinUnion(parts) {
    var p = uniqStr(parts.filter(function (x) { return x !== 'never'; }));
    // subtype reduction: a literal disappears when its primitive is also in the union ('a' | string → string)
    p = p.filter(function (x) { var k = litKind(x); return !(k && k !== 'boolean' && p.indexOf(k) >= 0); });
    if (p.indexOf('true') >= 0 && p.indexOf('false') >= 0) {
      p = p.filter(function (x) { return x !== 'true' && x !== 'false'; });
      p.push('boolean');
    }
    return p.length ? p.join(' | ') : 'never';
  }

  /* ================= TOPIC 3: Conditional types & distribution ================= */
  topics.push({
    title: 'Conditional Types: if/else for Types (and Distribution over Unions)',
    analogy: `<p>Think of an <b>airport security gate</b>. Each passenger (a type) walks up and the officer asks one question: <i>"Do you fit the rule?"</i> Yes → go left, No → go right. That is a conditional type: <code>T extends Rule ? Left : Right</code>.</p>
<p>Now a whole <b>tour group</b> arrives (a union like <code>string | number | null</code>). The officer does not judge the group as one blob — each person goes through the gate <b>one at a time</b>, and at the end the people on the left side are gathered back into a new group. That "one at a time" behaviour is called <b>distribution</b>, and it is the reason <code>Exclude</code> and <code>Extract</code> work.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A conditional type is a ternary operator that runs inside the type checker:</p>
<pre>type IsString&lt;T&gt; = T extends string ? 'yes' : 'no';
type A = IsString&lt;'hi'&gt;;   // 'yes'
type B = IsString&lt;42&gt;;     // 'no'</pre>
<p>Read <code>T extends string</code> as <b>"is T assignable to string?"</b> — the same "fits inside" meaning as in a generic constraint. If yes, the result is the first branch; otherwise the second.</p>
<p>🔵 <b>Distribution — the rule that surprises everyone.</b> When the thing being checked is a <b>naked type parameter</b> (just <code>T</code>, not wrapped in anything) and you pass in a <b>union</b>, TypeScript splits the union, runs the conditional for <b>each member separately</b>, and unions the answers back together. Any member that produced <code>never</code> simply disappears (a union with <code>never</code> in it drops the <code>never</code>).</p>
${H.table(['Step', 'ToArray&lt;string | number&gt; where ToArray&lt;T&gt; = T extends any ? T[] : never'], [
      ['1. split', '<code>string</code>, <code>number</code>'],
      ['2. run each', '<code>string[]</code>, <code>number[]</code>'],
      ['3. union back', '<code>string[] | number[]</code> (NOT <code>(string | number)[]</code>)']
    ])}
<p>That gives us the two classic built-ins for free:</p>
<pre>type Exclude&lt;T, U&gt; = T extends U ? never : T;   // remove members that fit U
type Extract&lt;T, U&gt; = T extends U ? T : never;   // keep members that fit U
type NonNullable&lt;T&gt; = T &amp; {};                   // (modern definition; was T extends null | undefined ? never : T)</pre>
<p><b>Turning distribution off.</b> Wrap both sides in a one-element tuple: <code>[T] extends [U] ? X : Y</code>. Now T is no longer "naked", so the union is judged <b>as a whole</b>. This is essential for checks like <code>IsNever&lt;T&gt;</code> (a naked <code>never</code> distributes over zero members and returns <code>never</code> instead of <code>true</code>) and for "is this a union?" checks.</p>
<p><b>Conditional types can nest</b> (an if / else-if chain) and can <b>recurse</b> (call themselves), which together make the type system able to compute surprisingly much — loops, string parsing, arithmetic on tuple lengths.</p>`,
    clues: ['"remove / keep certain members of a union" → <code>Exclude</code> / <code>Extract</code> (distributive conditional)', '"the return type depends on the input type" (string in → string out, number in → number out) → conditional type in the signature or overloads', '"why does my type become <code>string[] | number[]</code> instead of <code>(string | number)[]</code>?" → distribution; wrap in <code>[T]</code>', '"check if a type is never / any / a union" → non-distributive <code>[T] extends [never]</code> tricks', '"filter the keys of an object by their value type" → conditional inside a mapped type', '"if/else on types", "type-level ternary", "branch on a generic" → conditional types'],
    code: [`
// --- 1) basic if/else on types
type IsString<T> = T extends string ? true : false;
type A1 = IsString<'hi'>;          // true
type A2 = IsString<42>;            // false

// --- 2) else-if chains: a type-level "switch"
type TypeName<T> =
  T extends string ? 'string' :
  T extends number ? 'number' :
  T extends boolean ? 'boolean' :
  T extends undefined ? 'undefined' :
  T extends (...args: any[]) => any ? 'function' :
  'object';
type N1 = TypeName<() => void>;    // "function"
type N2 = TypeName<string[]>;      // "object"

// --- 3) distribution over a union (T is "naked")
type ToArray<T> = T extends any ? T[] : never;
type D1 = ToArray<string | number>;          // string[] | number[]

// --- 4) distribution switched OFF by wrapping in a tuple
type ToArrayWhole<T> = [T] extends [any] ? T[] : never;
type D2 = ToArrayWhole<string | number>;     // (string | number)[]

// --- 5) our own Exclude / Extract / NonNullable
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;
type MyNonNullable<T> = T extends null | undefined ? never : T;

type Ev = 'click' | 'scroll' | 'keydown' | 'keyup';
type KeyEvents = MyExtract<Ev, \`key\${string}\`>;   // "keydown" | "keyup"
type NotKey = MyExclude<Ev, \`key\${string}\`>;      // "click" | "scroll"
type Clean = MyNonNullable<string | null | undefined>; // string
`, `
// --- 6) the never trap: a naked never distributes over ZERO members
type IsNeverWrong<T> = T extends never ? true : false;
type W = IsNeverWrong<never>;      // never   (not true!)
type IsNever<T> = [T] extends [never] ? true : false;
type R = IsNever<never>;           // true

// --- 7) IsUnion: compare the distributed T with the whole union
type IsUnion<T, Whole = T> =
  T extends any                    // distribute: inside here T is ONE member
    ? ([Whole] extends [T] ? false : true)   // whole == member? then it was not a union
    : never;
type U1 = IsUnion<'a' | 'b'>;      // true
type U2 = IsUnion<'a'>;            // false

// --- 8) a conditional type in a function signature
type Parsed<T extends string | number> = T extends string ? number : string;
function convert<T extends string | number>(x: T): Parsed<T> {
  // the body cannot "see" which branch applies, so one cast is needed here
  return (typeof x === 'string' ? Number(x) : String(x)) as Parsed<T>;
}
const p1 = convert('42');   // number
const p2 = convert(42);     // string
`],
    codeTitle: ['Conditional types, distribution, Exclude/Extract', 'never trap, IsUnion, conditional return types'],
    viz: [{
      title: 'Distribution: a conditional type runs once per union member',
      input: "string | 42 | 'a' | boolean | null | undefined | Date ; string | number",
      inputLabel: 'Union T (members separated by |) ; target U for "T extends U ? T : never" (Extract)',
      gen: function (input) {
        var halves = String(input).split(';');
        if (halves.length !== 2) throw new Error('Format: member | member | ... ; target | target');
        var tParts = splitTop(halves[0], '|').filter(Boolean);
        var uParts = splitTop(halves[1], '|').filter(Boolean);
        if (!tParts.length || !uParts.length) throw new Error('Both sides need at least one type');
        if (tParts.length > 9 || uParts.length > 5) throw new Error('Use at most 9 union members and 5 target types');
        var hadBool = tParts.indexOf('boolean') >= 0;
        var members = expandBoolean(tParts);
        var T = tParts.join(' | '), U = uParts.join(' | ');
        var code = 'type MyExtract<T, U> = T extends U ? T : never;\ntype MyExclude<T, U> = T extends U ? never : T;\n\ntype Kept    = MyExtract<' + T + ', ' + U + '>;\ntype Dropped = MyExclude<' + T + ', ' + U + '>;';
        var frames = [], rows = [];
        frames.push(fr('We evaluate <code>MyExtract&lt;T, U&gt;</code>. Because <code>T</code> appears <b>naked</b> on the left of <code>extends</code>, TypeScript will <b>distribute</b>: split the union and judge each member alone.', [cp(code, { 1: 'cur', 4: 'cur' }), vp({ T: T, U: U }, { T: 'cur' })]));
        frames.push(fr('Split step. ' + (hadBool ? '<b>Note:</b> <code>boolean</code> is really <code>true | false</code>, so it becomes <b>two</b> members. ' : '') + 'We now have ' + members.length + ' separate checks to run.', [{ type: 'array', label: 'members of T (judged one at a time)', values: members.slice() }, vp({ U: U }, {})]));
        var kept = [], dropped = [];
        members.forEach(function (m, i) {
          var ok = assignableToUnion(m, uParts);
          (ok ? kept : dropped).push(m);
          rows.push([m, ok ? 'yes' : 'no', ok ? m : 'never', ok ? 'never' : m]);
          var hlRow = {}; hlRow[i] = ok ? 'ok' : 'bad';
          var hlArr = {}; hlArr[i] = 'cur';
          var why = ok ? (m === uParts.filter(function (u) { return assignable(m, u); })[0] ? 'it is literally one of the targets' : 'its base type is in U (a literal fits its primitive)') : (m === 'null' || m === 'undefined' ? 'with strictNullChecks on, null/undefined are their own types and do not fit' : 'no member of U accepts it');
          frames.push(fr('Check <code>' + esc(m) + ' extends ' + esc(U) + '</code>? ' + (ok ? '<span class="c-g">Yes</span>' : '<span class="c-r">No</span>') + ' — ' + why + '. Extract gives <code>' + esc(ok ? m : 'never') + '</code>, Exclude gives <code>' + esc(ok ? 'never' : m) + '</code>.',
            [{ type: 'array', label: 'members of T', values: members.slice(), hl: hlArr, ptr: (function () { var p = {}; p[i] = 'T'; return p; })() },
              tb(['member', 'extends U?', 'Extract → ', 'Exclude → '], rows, hlRow, 'per-member results so far')]));
        });
        frames.push(fr('Union the answers back together. Every <code>never</code> vanishes (a union with "nothing" in it is just the rest), and a literal like <code>\'a\'</code> is absorbed if its primitive <code>string</code> is also present.' + (hadBool ? ' <code>true | false</code> collapses back into <code>boolean</code> when both survive.' : ''), [tb(['member', 'extends U?', 'Extract → ', 'Exclude → '], rows, {}, 'all members judged'), vp({ Kept: joinUnion(kept), Dropped: joinUnion(dropped) }, { Kept: 'ok', Dropped: 'bad' })]));
        var whole = assignableToUnion(T, uParts) || members.every(function (m) { return assignableToUnion(m, uParts); });
        frames.push(fr('Compare with the <b>non-distributive</b> form <code>[T] extends [U] ? T : never</code>: the union is judged <b>as one block</b>. ' + (whole ? 'Every member fits, so the whole union is kept.' : 'At least one member does not fit, so the <b>whole</b> union fails and the result is <code>never</code>.'), [cp('type ExtractWhole<T, U> = [T] extends [U] ? T : never;\ntype All = ExtractWhole<' + T + ', ' + U + '>;', { 1: whole ? 'ok' : 'bad' }), vp({ All: whole ? T : 'never' }, { All: whole ? 'ok' : 'bad' })]));
        frames.push(fr('Take-away: <b>naked T + union ⇒ map over members</b>. That single rule is how <code>Exclude</code>, <code>Extract</code> and <code>NonNullable</code> are built, and why <code>[T]</code> wrapping exists.', [tx('<b>Distributive:</b> <code>T extends U ? X : Y</code> &nbsp; | &nbsp; <b>Whole union:</b> <code>[T] extends [U] ? X : Y</code>')]));
        return frames;
      }
    }, {
      title: 'Else-if chain: TypeName<T> picks the first matching branch',
      input: "'hi' | 7 | () => void | string[] | undefined",
      inputLabel: 'Union to classify (members separated by |)',
      gen: function (input) {
        var parts = splitTop(String(input), '|').filter(Boolean);
        if (!parts.length || parts.length > 7) throw new Error('Give 1-7 union members separated by |');
        var branches = [['string', 'string'], ['number', 'number'], ['boolean', 'boolean'], ['undefined', 'undefined'], ['Function', 'function'], ['*', 'object']];
        var code = "type TypeName<T> =\n  T extends string ? 'string' :\n  T extends number ? 'number' :\n  T extends boolean ? 'boolean' :\n  T extends undefined ? 'undefined' :\n  T extends (...args: any[]) => any ? 'function' :\n  'object';";
        var frames = [], results = [];
        frames.push(fr('A chain of conditionals behaves like <code>if / else if / else</code>: the <b>first</b> branch that matches wins. With a union input it still distributes, so each member walks the chain separately.', [cp(code, { 1: 'cur' }), { type: 'array', label: 'members', values: parts.slice() }]));
        parts.forEach(function (m, i) {
          for (var b = 0; b < branches.length; b++) {
            var hit = branches[b][0] === '*' || assignable(m, branches[b][0]);
            var hl = {}; hl[b + 2] = hit ? 'ok' : 'bad';
            if (!hit) {
              if (b < 2) frames.push(fr('<code>' + esc(m) + '</code>: does it extend <code>' + esc(branches[b][0] === 'Function' ? '(...args) => any' : branches[b][0]) + '</code>? <span class="c-r">No</span> → fall through to the next line.', [cp(code, hl), vp({ member: m }, { member: 'cur' })]));
              continue;
            }
            results.push("'" + branches[b][1] + "'");
            var ah = {}; ah[i] = 'ok';
            frames.push(fr('<code>' + esc(m) + '</code> matches line ' + (b + 2) + ' → <span class="c-g"><code>\'' + branches[b][1] + '\'</code></span>. Later branches are never looked at.', [cp(code, hl), { type: 'array', label: 'members', values: parts.slice(), hl: ah }, vp({ member: m, result: "'" + branches[b][1] + "'" }, { result: 'ok' })]));
            break;
          }
        });
        frames.push(fr('All members done; union the answers (duplicates merge).', [vp({ 'TypeName<input>': uniqStr(results).join(' | ') }, { 'TypeName<input>': 'sel' })]));
        return frames;
      }
    }],
    examples: [
      { title: 'Why ToArray gives string[] | number[]', html: `<p>Distribution maps over members, so you get an array <b>per member</b>. If you wanted one mixed array, switch distribution off with the tuple wrap. Both are useful — the bug is not knowing which one you wrote.</p>`, code: `
type ToArray<T> = T extends any ? T[] : never;
type ToArrayWhole<T> = [T] extends [any] ? T[] : never;

type Each = ToArray<string | number>;        // string[] | number[]
type Mixed = ToArrayWhole<string | number>;  // (string | number)[]

const ok1: Each = ['a', 'b'];        // fine: a string[]
// @ts-expect-error  a mixed array is neither string[] nor number[]
const bad1: Each = ['a', 1];
const ok2: Mixed = ['a', 1];         // fine
` },
      { title: 'Filter object keys by value type', html: `<p>A conditional inside a mapped type, then index with <code>[keyof T]</code> to collect the surviving keys. Keys whose value is not a function become <code>never</code> and disappear from the union. Result for <code>Api</code>: <code>"load" | "save"</code>.</p>`, code: `
type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

interface Api {
  baseUrl: string;
  retries: number;
  load(id: string): Promise<string>;
  save(data: string): Promise<void>;
}
type Methods = FunctionKeys<Api>;           // "load" | "save"
type MethodsOnly = Pick<Api, Methods>;      // { load(...); save(...) }
` },
      { title: 'The never surprise', html: `<p>Passing <code>never</code> to a distributive conditional returns <code>never</code> — there are zero members to map over, so there are zero answers. Library authors guard against this with <code>[T] extends [never]</code> as the very first check.</p>`, code: `
type IsStringNaive<T> = T extends string ? true : false;
type X1 = IsStringNaive<never>;                 // never  (surprise!)

type IsStringSafe<T> = [T] extends [never] ? false : T extends string ? true : false;
type X2 = IsStringSafe<never>;                  // false
type X3 = IsStringSafe<'a'>;                    // true
` }
    ],
    deepDive: `<p>🟣 <b>Exactly when does distribution happen?</b> Only when the checked type is a <b>naked type parameter</b> and the conditional is evaluated with a union substituted for it. <code>T[] extends …</code>, <code>[T] extends …</code>, <code>Promise&lt;T&gt; extends …</code> and <code>keyof T extends …</code> do <b>not</b> distribute. Distribution happens at <b>instantiation</b>; inside a generic function the conditional stays <b>deferred</b> (unresolved) because T is unknown — which is why the body of <code>convert</code> needs a cast. TS 5.8 added limited narrowing for conditional return types in some cases, but the general rule is still: implementations of conditional-return functions use overloads or a single assertion.</p>
<p><b>any and unknown.</b> <code>any extends X ? A : B</code> resolves to <code>A | B</code> (any is "both" unless X is also any/unknown). <code>unknown extends string</code> is false. <code>boolean</code> distributes into <code>true | false</code>, which is why <code>IsTrue&lt;boolean&gt;</code> often returns <code>boolean</code> instead of <code>false</code>.</p>
<p><b>Recursion limits and performance.</b> Recursive conditional types are allowed (TS 4.1+), and <b>tail-recursive</b> ones (the recursive call is the whole branch result) can go about 1000 levels deep (TS 4.5+); non-tail ones hit <i>"Type instantiation is excessively deep and possibly infinite"</i> around 50–100 levels. Large unions × distribution can explode: a template literal or conditional over unions with 10<sup>4</sup>+ members becomes the slowest part of a build ("Expression produces a union type that is too complex to represent" at 100,000 members). Measure with <code>tsc --extendedDiagnostics</code> and <code>--generateTrace</code>.</p>
<p><b>Assignability, not equality.</b> <code>T extends U</code> is a one-way check. Two types being mutually assignable still does not make them identical (e.g. <code>any</code>, optional vs <code>| undefined</code>, readonly modifiers). For exact equality, libraries use the "deferred generic function" trick: <code>(&lt;G&gt;() =&gt; G extends X ? 1 : 2) extends (&lt;G&gt;() =&gt; G extends Y ? 1 : 2)</code>, which compares X and Y via the compiler's internal identity relation.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants can produce a 15-line conditional type puzzle answer instantly — and very confidently get distribution wrong. Treat every generated conditional type as a hypothesis and <b>test it</b> with <code>Expect&lt;Equal&lt;…&gt;&gt;</code> cases, including the edge inputs <code>never</code>, <code>any</code>, <code>boolean</code> and a union.</p>
<p><b>Use AI as a partner:</b> <code>"Here is my IsUnion type. Generate 10 test cases including never, any, boolean and nested unions, written as Expect&lt;Equal&lt;…&gt;&gt;. Do not fix my type."</code> Then you fix it. Also ask it to explain a scary library type (zod, tRPC, Prisma) one branch at a time.</p>
<p><b>Where AI goes wrong:</b> forgets the <code>[T] extends [never]</code> guard, writes <code>T extends null</code> but the project has <code>strictNullChecks</code> off (so it never matches as expected), produces non-tail-recursive types that blow the depth limit, or uses a conditional where a simple overload would be clearer. <b>What you must still own:</b> predicting distribution in your head, deciding when type cleverness is worth the readability cost, and keeping compile times sane.</p>`,
    problems: [{
      title: 'Implement Exclude, Extract and NonNullable',
      level: 'Easy', tags: ['conditional types', 'distribution', 'utility types'], companies: ['Microsoft', 'Vercel'],
      statement: `<p>Implement <code>MyExclude&lt;T, U&gt;</code> (remove from T the members assignable to U), <code>MyExtract&lt;T, U&gt;</code> (keep only those) and <code>MyNonNullable&lt;T&gt;</code> (remove <code>null</code> and <code>undefined</code>) <b>without</b> using the built-ins.</p>`,
      constraints: `<p>Type-level only. Must work for any union, including literals and object types.</p>`,
      example: `<p><code>MyExclude&lt;'a' | 'b' | 'c', 'a'&gt;</code> → ${H.c('g', "'b' | 'c'")}. <code>MyExtract&lt;string | number | (() =&gt; void), Function&gt;</code> → ${H.c('g', '() =&gt; void')}. <code>MyNonNullable&lt;string | null&gt;</code> → ${H.c('g', 'string')}. Why: each union member is checked <b>separately</b> and the losers become <code>never</code>, which vanishes.</p>`,
      brute: { why: `<p>Writing the result unions by hand (<code>type NotA = 'b' | 'c'</code>) duplicates information and breaks the moment the source union changes. A non-distributive attempt like <code>[T] extends [U] ? never : T</code> judges the union as a whole and returns the full union unchanged (or never) instead of filtering.</p>`, code: `
type Letters = 'a' | 'b' | 'c';
type NotA = 'b' | 'c';                                  // hand-maintained copy
type WrongExclude<T, U> = [T] extends [U] ? never : T;  // not distributive
type Oops = WrongExclude<Letters, 'a'>;                 // 'a' | 'b' | 'c'  (nothing removed)
` },
      mcq: { q: 'What makes <code>T extends U ? never : T</code> filter a union member by member?', options: ['The <code>never</code> keyword', 'T is a naked type parameter, so the conditional distributes over the union', 'Unions are always processed one member at a time everywhere in TS', 'The <code>?</code> operator loops'], answer: 1, explain: 'Distribution only happens for a naked type parameter in the checked position. never then disappears from the resulting union.' },
      hints: [`<p>Hint 1: you need the check to run <b>once per member</b> — that is free if <code>T</code> is naked on the left of <code>extends</code>.</p>`, `<p>Hint 2: "drop" a member by returning <code>never</code> for it; "keep" it by returning <code>T</code> (which, inside the branch, is just that one member).</p>`, `<p>Hint 3: NonNullable is Exclude with <code>U = null | undefined</code>. Modern lib.d.ts defines it as <code>T &amp; {}</code> — intersecting with <code>{}</code> removes null/undefined because they are not assignable to <code>{}</code>.</p>`],
      tests: {"types":["type _0 = Expect<Equal<MyExclude<\"a\" | \"b\" | \"c\", \"a\">, \"b\" | \"c\">>","type _1 = Expect<Equal<MyExclude<never, \"a\">, never>>","type _2 = Expect<Equal<MyExclude<\"a\" | \"b\", never>, \"a\" | \"b\">>","type _3 = Expect<Equal<MyExclude<string | number | boolean, string | boolean>, number>>","type _4 = Expect<Equal<MyExclude<{ a: 1 } | { b: 2 }, { a: 1 }>, { b: 2 }>>","type _5 = Expect<Equal<MyExtract<string | number | (() => void), Function>, () => void>>","type _6 = Expect<Equal<MyExtract<\"x\" | 1 | true, string>, \"x\">>","type _7 = Expect<Equal<MyExtract<1 | 2, string>, never>>","type _8 = Expect<Equal<MyExtract<\"a\" | \"b\", \"a\" | \"c\">, \"a\">>","type _9 = Expect<Equal<MyNonNullable<string | null | undefined>, string>>","type _10 = Expect<Equal<MyNonNullable<null>, never>>","type _11 = Expect<Equal<MyNonNullable<0 | \"\" | false | null>, 0 | \"\" | false>>","type _12 = Expect<Equal<MyNonNullable<{ a: 1 } | undefined>, { a: 1 }>>","// @ts-expect-error\nconst bad: MyExclude<\"a\" | \"b\", \"a\"> = \"a\";","// @ts-expect-error\nconst bad2: MyNonNullable<string | null> = null;","// @ts-expect-error\nconst bad3: MyExtract<1 | \"x\", string> = 1;"]},
      solution: {
        approach: `<p>Use distributive conditional types: for each member, return <code>never</code> to drop it or the member itself to keep it. Unions absorb <code>never</code>, leaving exactly the survivors.</p>`,
        code: `
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;
type MyNonNullable<T> = T extends null | undefined ? never : T;
type MyNonNullable2<T> = T & {};   // the modern lib.d.ts definition

type cases = [
  Expect<Equal<MyExclude<'a' | 'b' | 'c', 'a'>, 'b' | 'c'>>,
  Expect<Equal<MyExclude<string | number | boolean, string | boolean>, number>>,
  Expect<Equal<MyExtract<string | number | (() => void), Function>, () => void>>,
  Expect<Equal<MyExtract<'x' | 1 | true, string>, 'x'>>,
  Expect<Equal<MyNonNullable<string | null | undefined>, string>>,
  Expect<Equal<MyNonNullable2<number | undefined>, number>>
];
`,
        dry: { head: ['member of T', "extends 'a'?", 'MyExclude gives', 'MyExtract gives'], rows: [
          ["'a'", H.c('g', 'yes'), 'never', "'a'"],
          ["'b'", H.c('r', 'no'), "'b'", 'never'],
          ["'c'", H.c('r', 'no'), "'c'", 'never'],
          ['union back', '—', "'b' | 'c'", "'a'"]
        ] },
        complexity: `<p>Type-checker work is O(|T| × |U|) assignability checks — trivial for normal unions, noticeable for unions with thousands of members.</p>`,
        followUps: ['Why does <code>MyExclude&lt;never, string&gt;</code> return <code>never</code>?', 'Write <code>ExcludeByShape&lt;T, { type: "a" }&gt;</code> for discriminated unions.', 'Implement <code>IsUnion&lt;T&gt;</code>.']
      }
    }]
  });

  /* ================= TOPIC 4: infer ================= */
  topics.push({
    title: 'infer: Pattern-Matching to Pull Types Out',
    analogy: `<p>Think of a <b>stencil</b> or a <b>fill-in-the-blanks form</b>: <i>"Dear ____, your order of ____ has shipped."</i> Hold it over a real letter and you can <b>read off</b> what is in each blank — the name and the product — without anybody telling you.</p>
<p><code>infer</code> is a blank in a type-level stencil. <code>T extends Promise&lt;infer U&gt;</code> means "hold the <i>Promise of ____</i> stencil over T; if it lines up, call whatever sits in the blank <b>U</b>." If the stencil does not line up, you take the "no" branch.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>infer X</code> can only appear inside the <code>extends</code> part of a conditional type. It declares a <b>new type variable</b> X and asks the compiler to <b>figure out</b> X so the pattern matches. In the "true" branch you can use X.</p>
<pre>type ElementOf&lt;T&gt; = T extends (infer E)[] ? E : never;
type A = ElementOf&lt;string[]&gt;;        // string
type B = ElementOf&lt;number&gt;;          // never (pattern didn't match)</pre>
${H.table(['Pattern (stencil)', 'Matches', 'Extracted'], [
      ['<code>T extends (infer E)[]</code>', '<code>Date[]</code>', 'E = <code>Date</code>'],
      ['<code>T extends Promise&lt;infer V&gt;</code>', '<code>Promise&lt;User&gt;</code>', 'V = <code>User</code>'],
      ['<code>T extends (...args: any[]) =&gt; infer R</code>', '<code>(id: string) =&gt; boolean</code>', 'R = <code>boolean</code>  (ReturnType)'],
      ['<code>T extends (...args: infer P) =&gt; any</code>', '<code>(id: string, n: number) =&gt; void</code>', 'P = <code>[id: string, n: number]</code>  (Parameters)'],
      ['<code>T extends [infer H, ...infer Rest]</code>', '<code>[1, 2, 3]</code>', 'H = <code>1</code>, Rest = <code>[2, 3]</code>'],
      ['<code>T extends \`&#36;{infer A}-&#36;{infer B}\`</code>', '<code>"en-US"</code>', 'A = <code>"en"</code>, B = <code>"US"</code>'],
      ['<code>T extends new (...a: any[]) =&gt; infer I</code>', '<code>typeof Date</code>', 'I = <code>Date</code>  (InstanceType)']
    ])}
<p>🔵 <b>How the compiler fills the blank.</b> It lines the pattern up against T structurally, collects candidate types for each <code>infer</code> slot (exactly like inferring a generic function's T from its arguments), picks the best candidate, then checks the whole pattern really matches. If it does → true branch with the variables bound; if not → false branch.</p>
<p><b>Recursion turns infer into a loop.</b> Peel one layer, then call yourself on what is left: <code>type UnwrapAll&lt;T&gt; = T extends Promise&lt;infer U&gt; ? UnwrapAll&lt;U&gt; : T</code> unwraps <code>Promise&lt;Promise&lt;number&gt;&gt;</code> to <code>number</code>. Tuples work the same way: take the head with <code>[infer H, ...infer R]</code>, process H, recurse on R. That is how type-level <code>Reverse</code>, <code>Join</code>, <code>Length</code> and string parsers are written.</p>
<p><b>Constraints on infer</b> (TS 4.7+): <code>infer N extends number</code> only matches if the extracted type fits — e.g. pulling a number out of a string: <code>"42" extends \`&#36;{infer N extends number}\`</code> gives <code>N = 42</code> (a numeric literal type).</p>`,
    clues: ['"get the type that this function returns / accepts" → <code>ReturnType</code> / <code>Parameters</code> via <code>infer</code>', '"unwrap the Promise / array / Observable / Ref" → <code>T extends Wrapper&lt;infer U&gt; ? U : T</code>', '"first / last element of a tuple", "reverse a tuple", "tuple length" → <code>[infer H, ...infer R]</code> recursion', '"parse a string type" (route params, CSS units, dotted paths) → template literal + <code>infer</code>', '"type of the resolved value of an async function" → <code>Awaited&lt;ReturnType&lt;typeof fn&gt;&gt;</code>', '"type challenges" / "type-level puzzle" in an interview → almost always <code>infer</code> + recursion'],
    code: [`
// --- the built-ins, rewritten with infer
type MyReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never;

type MyParameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never;

type MyInstanceType<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer I ? I : never;

// Awaited-like: unwrap Promises recursively (the real one also handles any "thenable")
type MyAwaited<T> =
  T extends null | undefined ? T :
  T extends object & { then(onfulfilled: infer F, ...args: infer _): any }
    ? F extends (value: infer V, ...args: infer _2) => any
      ? MyAwaited<V>
      : never
    : T;

async function fetchUser(id: string, withPosts: boolean) {
  return { id, name: 'Asha', posts: withPosts ? ['hi'] : [] };
}
type FetchArgs = MyParameters<typeof fetchUser>;            // [id: string, withPosts: boolean]
type FetchRet = MyReturnType<typeof fetchUser>;             // Promise<{ id: string; name: string; posts: string[] }>
type User = MyAwaited<FetchRet>;                            // { id: string; name: string; posts: string[] }
type D = MyInstanceType<typeof Date>;                       // Date
`, `
// --- tuples: head, tail, last, length, reverse
type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never;
type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer R] ? R : [];
type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;
type Length<T extends readonly unknown[]> = T['length'];

type Reverse<T extends readonly unknown[], Acc extends unknown[] = []> =
  T extends readonly [infer H, ...infer R]
    ? Reverse<R, [H, ...Acc]>          // tail-recursive: the call IS the branch result
    : Acc;

type H1 = Head<[1, 2, 3]>;      // 1
type T1 = Tail<[1, 2, 3]>;      // [2, 3]
type L1 = Last<[1, 2, 3]>;      // 3
type N1 = Length<[1, 2, 3]>;    // 3
type R1 = Reverse<['a', 'b', 'c']>;  // ["c", "b", "a"]

// --- infer with an extends constraint (TS 4.7+)
type ToNumber<S extends string> = S extends \`\${infer N extends number}\` ? N : never;
type Num = ToNumber<'42'>;      // 42
type Bad = ToNumber<'abc'>;     // never
`],
    codeTitle: ['ReturnType, Parameters, InstanceType, Awaited from scratch', 'Tuple recursion and constrained infer'],
    viz: [{
      title: 'infer extraction: peel a function type layer by layer',
      input: '(id: string, opts: Options) => Promise<Promise<User[]>>',
      inputLabel: 'A function type: (params) => ReturnType',
      gen: function (input) {
        var s = String(input).trim();
        if (s.length > 140) throw new Error('Keep the type under 140 characters');
        var m = s.match(/^\((.*)\)\s*=>\s*(.+)$/);
        var frames = [];
        var code = 'type MyReturnType<T> = T extends (...args: any) => infer R ? R : never;\ntype MyParameters<T> = T extends (...args: infer P) => any ? P : never;\ntype Unwrap<T> = T extends Promise<infer U> ? Unwrap<U> : T;\ntype ElementOf<T> = T extends (infer E)[] ? E : T;\n\ntype Fn = ' + s + ';\ntype Ret = MyReturnType<Fn>;\ntype Args = MyParameters<Fn>;\ntype Value = Unwrap<Ret>;\ntype Item = ElementOf<Value>;';
        frames.push(fr('We have a function type <code>Fn</code>. Goal: pull out its <b>parameters</b>, its <b>return type</b>, the value inside any <b>Promise</b>, and the <b>array element</b> — all with <code>infer</code> stencils.', [cp(code, { 6: 'cur' }), vp({ Fn: s }, { Fn: 'cur' })]));
        if (!m) {
          frames.push(fr('Hold the stencil <code>(...args: any) =&gt; infer R</code> over <code>Fn</code>… it is <span class="c-r">not a function shape</span>, so the pattern fails and we take the <b>false</b> branch.', [cp(code, { 1: 'bad', 7: 'bad' }), vp({ Ret: 'never' }, { Ret: 'bad' })]));
          frames.push(fr('That is the contract of <code>infer</code>: no match → no variables are bound, the else-branch decides the result (here <code>never</code>).', [tx('Try an input like <code>(a: string) =&gt; Promise&lt;number[]&gt;</code>')]));
          frames.push(fr('Built-in <code>ReturnType</code> prevents this by <b>constraining</b> T: <code>T extends (...args: any) =&gt; any</code>, so passing a non-function is a compile error instead of a silent never.', [cp('type ReturnType<T extends (...args: any) => any> =\n  T extends (...args: any) => infer R ? R : any;', { 1: 'ok' })]));
          return frames;
        }
        var params = m[1].trim(), ret = m[2].trim();
        var plist = params ? splitTop(params, ',') : [];
        frames.push(fr('Stencil 1: <code>(...args: any) =&gt; <b>infer R</b></code>. The arrow lines up with <code>Fn</code>, so the blank after <code>=&gt;</code> is read off: <b>R = <code>' + esc(ret) + '</code></b>.', [cp(code, { 1: 'ok', 7: 'ok' }), tb(['pattern piece', 'Fn piece'], [['(...args: any)', '(' + params + ')'], ['=>', '=>'], ['infer R', ret]], { 2: 'ok' }, 'line the stencil up'), vp({ R: ret, Ret: ret }, { Ret: 'ok' })]));
        frames.push(fr('Stencil 2: <code>(...args: <b>infer P</b>) =&gt; any</code>. A rest parameter captures <b>all</b> parameters as a <b>labelled tuple</b>: P = <code>[' + esc(plist.join(', ')) + ']</code>.', [cp(code, { 2: 'ok', 8: 'ok' }), { type: 'array', label: 'P (tuple of parameters)', values: plist.length ? plist : ['(empty)'] }, vp({ Args: '[' + plist.join(', ') + ']' }, { Args: 'ok' })]));
        var cur = ret, depth = 0, stackItems = [];
        while (depth < 6) {
          var pm = cur.match(/^Promise<(.+)>$/);
          if (!pm) break;
          var inner = pm[1].trim();
          stackItems.push('Unwrap<' + cur + '>');
          frames.push(fr('Unwrap: does <code>' + esc(cur) + '</code> match <code>Promise&lt;<b>infer U</b>&gt;</code>? <span class="c-g">Yes</span> → U = <code>' + esc(inner) + '</code>. The true branch calls <code>Unwrap&lt;U&gt;</code> again (recursion = a loop).', [cp(code, { 3: 'ok', 9: 'cur' }), { type: 'stack', label: 'recursive calls (top = current)', items: stackItems.slice(), hl: (function () { var h = {}; h[stackItems.length - 1] = 'cur'; return h; })() }, vp({ T: cur, U: inner }, { U: 'ok' })]));
          cur = inner; depth++;
        }
        stackItems.push('Unwrap<' + cur + '>');
        frames.push(fr('Does <code>' + esc(cur) + '</code> match <code>Promise&lt;infer U&gt;</code>? <span class="c-r">No</span> → false branch returns T itself. The recursion stops' + (depth ? ' after peeling ' + depth + ' Promise layer' + (depth > 1 ? 's' : '') : ' immediately (it was not a Promise)') + '.', [cp(code, { 3: 'bad', 9: 'ok' }), { type: 'stack', label: 'recursive calls (unwinding)', items: stackItems.slice(), hl: (function () { var h = {}; h[stackItems.length - 1] = 'ok'; return h; })() }, vp({ Value: cur }, { Value: 'ok' })]));
        var am = cur.match(/^(.+)\[\]$/) || cur.match(/^Array<(.+)>$/);
        if (am) {
          frames.push(fr('Last stencil: <code>(<b>infer E</b>)[]</code> over <code>' + esc(cur) + '</code> matches → E = <code>' + esc(am[1]) + '</code>, the element type.', [cp(code, { 4: 'ok', 10: 'sel' }), vp({ Item: am[1] }, { Item: 'sel' })]));
        } else {
          frames.push(fr('Last stencil: <code>(infer E)[]</code> over <code>' + esc(cur) + '</code> does <span class="c-r">not</span> match (not an array) → false branch returns it unchanged.', [cp(code, { 4: 'bad', 10: 'sel' }), vp({ Item: cur }, { Item: 'sel' })]));
        }
        frames.push(fr('Summary of everything <code>infer</code> pulled out of one function type — no hand-written duplicates, so if <code>Fn</code> changes, all of these follow.', [vp({ Args: '[' + plist.join(', ') + ']', Ret: ret, Value: cur, Item: am ? am[1] : cur }, { Args: 'ok', Ret: 'ok', Value: 'ok', Item: 'sel' })]));
        return frames;
      }
    }, {
      title: 'Tuple recursion: Reverse<T> with an accumulator',
      input: "'a', 'b', 'c', 'd'",
      inputLabel: 'Tuple elements (comma separated)',
      gen: function (input) {
        var els = splitTop(String(input), ',').filter(Boolean);
        if (!els.length || els.length > 8) throw new Error('Give 1-8 tuple elements');
        var code = 'type Reverse<T extends unknown[], Acc extends unknown[] = []> =\n  T extends [infer H, ...infer R]\n    ? Reverse<R, [H, ...Acc]>\n    : Acc;';
        var frames = [], T = els.slice(), Acc = [];
        frames.push(fr('Start: <code>T = [' + esc(T.join(', ')) + ']</code>, accumulator empty. Each step pattern-matches <code>[infer H, ...infer R]</code>.', [cp(code, { 1: 'cur' }), { type: 'array', label: 'T', values: T.slice() }, { type: 'array', label: 'Acc', values: [] }]));
        while (T.length) {
          var H0 = T[0], R = T.slice(1);
          frames.push(fr('Match: <b>H = <code>' + esc(H0) + '</code></b>, <b>R = <code>[' + esc(R.join(', ')) + ']</code></b>. Put H at the <b>front</b> of Acc and recurse on R (tail call: cheap and allowed ~1000 deep).', [cp(code, { 2: 'ok', 3: 'cur' }), { type: 'array', label: 'T', values: T.slice(), hl: { 0: 'cur' } }, { type: 'array', label: 'Acc (after)', values: [H0].concat(Acc), hl: { 0: 'ok' } }, vp({ H: H0, R: '[' + R.join(', ') + ']' }, { H: 'cur' })]));
          Acc = [H0].concat(Acc); T = R;
        }
        frames.push(fr('<code>[]</code> does not match <code>[infer H, ...infer R]</code> (no head) → false branch returns <b>Acc</b>.', [cp(code, { 2: 'bad', 4: 'sel' }), { type: 'array', label: 'T', values: ['(empty)'] }, { type: 'array', label: 'result', values: Acc.slice(), hl: (function () { var h = {}; Acc.forEach(function (_, i) { h[i] = 'sel'; }); return h; })() }]));
        frames.push(fr('Take-away: <b>head + rest + accumulator</b> is the type-level for-loop. Because the recursive call is the whole branch (tail position), TS can run it about 1000 levels deep.', [vp({ 'Reverse<input>': '[' + Acc.join(', ') + ']', steps: els.length }, { 'Reverse<input>': 'sel' })]));
        return frames;
      }
    }],
    examples: [
      { title: 'Type of a resolved async function', html: `<p>The most common real-world use: you have a function from a library (or your own data loader) and want the type of what it <b>resolves to</b>, without exporting a separate interface. <code>Awaited&lt;ReturnType&lt;typeof fn&gt;&gt;</code> is the idiom.</p>`, code: `
async function loadDashboard(userId: string) {
  return { userId, widgets: [{ id: 1, kind: 'chart' as const }], updatedAt: new Date() };
}
type Dashboard = Awaited<ReturnType<typeof loadDashboard>>;
type Widget = Dashboard['widgets'][number];   // { id: number; kind: "chart" }

function render(d: Dashboard): string {
  return d.widgets.map((w) => w.kind).join(',');
}
` },
      { title: 'First argument of a callback', html: `<p>You can infer from <b>any position</b>. Here we grab the event type a handler expects. If T is not a one-argument function the pattern fails and we get <code>never</code>.</p>`, code: `
type FirstArg<F> = F extends (first: infer A, ...rest: any[]) => any ? A : never;

type ClickHandler = (e: MouseEvent, extra?: string) => void;
type Evt = FirstArg<ClickHandler>;     // MouseEvent
type Nothing = FirstArg<string>;       // never
` },
      { title: 'Splitting a string type', html: `<p><code>infer</code> inside a template literal matches the <b>shortest</b> possible text for the left variable, then the rest. Repeating it recursively splits on every separator.</p>`, code: `
type Split<S extends string, D extends string> =
  S extends \`\${infer Head}\${D}\${infer Rest}\`
    ? [Head, ...Split<Rest, D>]
    : [S];

type Parts = Split<'a,b,c', ','>;          // ["a", "b", "c"]
type One = Split<'abc', ','>;              // ["abc"]
type Path = Split<'user.address.city', '.'>; // ["user", "address", "city"]
` }
    ],
    deepDive: `<p>🟣 <b>Where infer is legal.</b> Only in the <code>extends</code> clause of a conditional type. The same name can appear several times in one pattern; for <b>covariant</b> positions (return types, properties) the candidates are <b>unioned</b>, for <b>contravariant</b> positions (function parameters) they are <b>intersected</b>. That is the trick behind <code>UnionToIntersection&lt;U&gt; = (U extends any ? (x: U) =&gt; void : never) extends (x: infer I) =&gt; void ? I : never</code>.</p>
<p><b>Overloads.</b> Inferring from an overloaded function uses <b>only the last overload signature</b> (usually the most general one). So <code>ReturnType&lt;typeof overloaded&gt;</code> can surprise you — put the catch-all overload last, or extract types from a specific signature by hand.</p>
<p><b>Generic functions.</b> <code>ReturnType&lt;typeof identity&gt;</code> where <code>identity&lt;T&gt;(x: T): T</code> gives <code>unknown</code> — the type parameter is replaced by its constraint. TS 4.7 <b>instantiation expressions</b> fix this: <code>ReturnType&lt;typeof identity&lt;string&gt;&gt;</code> → <code>string</code>.</p>
<p><b>Template literal matching rules.</b> In <code>\`&#36;{infer A}&#36;{infer B}\`</code> (two infers side by side), A takes exactly <b>one character</b> and B takes the rest: <code>"abc"</code> → A = <code>"a"</code>, B = <code>"bc"</code>. With a literal separator, A takes the text up to the <b>first</b> occurrence. To match the last occurrence, recurse.</p>
<p><b>Depth and performance.</b> Tail-recursive conditional types (the recursive call is the entire branch) are optimised up to ~1000 levels; others error near 50–100. An accumulator parameter (like <code>Acc</code> in Reverse) is how you make a recursion tail-recursive — exactly like converting recursion to a loop in runtime code.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> the "type-challenges" style puzzles (Reverse, Join, Split, ParseRoute) are well represented in training data, so assistants solve the famous ones instantly. Interviews therefore lean on <b>explaining</b> the solution, handling edge cases, and adapting it to a new twist.</p>
<p><b>Use AI as a partner:</b> ask it to <code>"walk through how TypeScript evaluates Reverse&lt;[1,2,3]&gt; step by step, showing H, R and Acc at each step"</code> — then check the steps against the compiler by hovering intermediate aliases. Ask for <b>non-tail vs tail</b> versions and test both at length 200 to <i>see</i> the depth limit.</p>
<p><b>Where AI goes wrong:</b> uses <code>infer</code> outside a conditional, forgets that overloads infer from the last signature, writes non-tail-recursive types that fail at depth, mixes up which template infer is greedy, or "solves" a puzzle with <code>any</code> that makes every test pass vacuously. <b>What you must still own:</b> verifying with real <code>Expect&lt;Equal&gt;</code> tests (which catch <code>any</code>) and reasoning about the pattern match yourself.</p>`,
    problems: [{
      title: 'Implement ReturnType, Parameters and Awaited',
      level: 'Medium', tags: ['infer', 'conditional types', 'recursion'], companies: ['Microsoft', 'Google', 'Uber'],
      statement: `<p>Implement <code>MyReturnType&lt;F&gt;</code>, <code>MyParameters&lt;F&gt;</code> and <code>MyAwaited&lt;T&gt;</code> without the built-ins. <code>MyAwaited</code> must unwrap <b>nested</b> promises (<code>Promise&lt;Promise&lt;string&gt;&gt;</code> → <code>string</code>) and leave non-promises unchanged.</p>`,
      constraints: `<p>Passing a non-function to the first two must be a compile error (use a constraint). No <code>any</code> in results.</p>`,
      example: `<p><code>MyReturnType&lt;(a: number) =&gt; boolean&gt;</code> → ${H.c('g', 'boolean')}; <code>MyParameters&lt;(a: number, b?: string) =&gt; void&gt;</code> → ${H.c('g', '[a: number, b?: string]')}; <code>MyAwaited&lt;Promise&lt;Promise&lt;Date&gt;&gt;&gt;</code> → ${H.c('g', 'Date')} because each layer is peeled until the pattern stops matching.</p>`,
      brute: { why: `<p>Declaring a separate interface for every return type duplicates the function's real shape; the moment the function changes, the hand-written type lies. A single non-recursive unwrap also only peels <b>one</b> Promise layer.</p>`, code: `
function getScore(name: string): number { return name.length; }
type ScoreReturn = number;                                // hand-copied, will drift
type UnwrapOnce<T> = T extends Promise<infer U> ? U : T;
type StillWrapped = UnwrapOnce<Promise<Promise<string>>>; // Promise<string> — only one layer
` },
      mcq: { q: 'Inside <code>T extends (...args: infer P) =&gt; any ? P : never</code>, what is P for <code>(x: string, y?: number) =&gt; void</code>?', options: ['<code>string | number</code>', '<code>[x: string, y?: number]</code>', '<code>[string, number]</code>', '<code>string[]</code>'], answer: 1, explain: 'A rest-parameter infer captures the whole parameter list as a tuple, keeping labels and optionality.' },
      hints: [`<p>Hint 1: write a "stencil" of a function and put <code>infer</code> exactly where the piece you want sits: after <code>=&gt;</code> for the return, inside <code>(...args: ___)</code> for parameters.</p>`, `<p>Hint 2: add <code>F extends (...args: any) =&gt; any</code> as a <b>constraint</b> so non-functions are rejected at the use site.</p>`, `<p>Hint 3: for Awaited, match <code>Promise&lt;infer U&gt;</code> and, in the true branch, call <code>MyAwaited&lt;U&gt;</code> again (recursion). False branch returns T. Bonus: match any <code>{ then(onfulfilled: (v: infer V) =&gt; any): any }</code> to support thenables.</p>`],
      tests: {"types":["type _0 = Expect<Equal<MyReturnType<(a: number) => boolean>, boolean>>","type _1 = Expect<Equal<MyReturnType<() => void>, void>>","type _2 = Expect<Equal<MyReturnType<() => never>, never>>","type _3 = Expect<Equal<MyReturnType<(...a: string[]) => Promise<number>>, Promise<number>>>","type _4 = Expect<Equal<MyParameters<(a: number, b?: string) => void>, [a: number, b?: string]>>","type _5 = Expect<Equal<MyParameters<() => void>, []>>","type _6 = Expect<Equal<MyParameters<(...a: [number, ...string[]]) => void>, [number, ...string[]]>>","type _7 = Expect<Equal<MyAwaited<Promise<Promise<Date>>>, Date>>","type _8 = Expect<Equal<MyAwaited<string>, string>>","type _9 = Expect<Equal<MyAwaited<Promise<string | Promise<number>>>, string | number>>","type _10 = Expect<Equal<MyAwaited<Promise<Promise<Promise<boolean>>>>, boolean>>","type _11 = Expect<Equal<MyAwaited<PromiseLike<number>>, number>>","// @ts-expect-error\ntype E1 = MyReturnType<string>;","// @ts-expect-error\ntype E2 = MyParameters<number>;"]},
      solution: {
        approach: `<p>Each utility is a single conditional type with an <code>infer</code> placeholder in the right slot. Awaited recurses on the extracted value until the "thenable" pattern no longer matches.</p>`,
        code: `
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

type MyReturnType<F extends (...args: any) => any> =
  F extends (...args: any) => infer R ? R : never;

type MyParameters<F extends (...args: any) => any> =
  F extends (...args: infer P) => any ? P : never;

type MyAwaited<T> =
  T extends PromiseLike<infer U>   // any "thenable", not only Promise
    ? MyAwaited<U>                 // peel one layer, then try again
    : T;

declare function sample(a: number, b?: string): boolean;

type cases = [
  Expect<Equal<MyReturnType<typeof sample>, boolean>>,
  Expect<Equal<MyParameters<typeof sample>, [a: number, b?: string]>>,
  Expect<Equal<MyAwaited<Promise<Promise<Date>>>, Date>>,
  Expect<Equal<MyAwaited<string>, string>>,
  Expect<Equal<MyAwaited<Promise<string | Promise<number>>>, string | number>>
];
// @ts-expect-error  a string is not a function type
type Err = MyReturnType<string>;
`,
        dry: { head: ['step', 'T', 'matches PromiseLike<infer U>?', 'U / result'], rows: [
          ['1', 'Promise&lt;Promise&lt;Date&gt;&gt;', H.c('g', 'yes'), 'U = Promise&lt;Date&gt; → recurse'],
          ['2', 'Promise&lt;Date&gt;', H.c('g', 'yes'), 'U = Date → recurse'],
          ['3', 'Date', H.c('r', 'no'), 'return Date'],
          ['result', '—', '—', H.c('g', 'Date')]
        ] },
        complexity: `<p>One pattern match per layer; nesting depth d ⇒ d instantiations. Unions distribute, so <code>MyAwaited&lt;A | B&gt;</code> costs the sum of both.</p>`,
        followUps: ['Why does <code>MyAwaited&lt;Promise&lt;string | Promise&lt;number&gt;&gt;&gt;</code> work? (distribution in the recursive call)', 'What does <code>ReturnType</code> give for an overloaded function?', 'Implement <code>ConstructorParameters</code> and <code>InstanceType</code>.']
      }
    }]
  });

  /* ---------- parse "readonly id:number, name?:string" into property records ---------- */
  function parseProps(src, max) {
    var list = splitTop(String(src), ',').filter(Boolean);
    if (list.length < 1 || list.length > (max || 8)) throw new Error('Give 1-' + (max || 8) + ' properties like: readonly id:number, nick?:string');
    return list.map(function (p) {
      var ro = false;
      p = p.trim();
      if (/^readonly\s+/.test(p)) { ro = true; p = p.replace(/^readonly\s+/, ''); }
      var i = p.indexOf(':');
      if (i < 1) throw new Error('Each property must look like name:type (optional: name?:type, readonly name:type)');
      var k = p.slice(0, i).trim(), t = p.slice(i + 1).trim(), opt = false;
      if (/\?$/.test(k)) { opt = true; k = k.slice(0, -1); }
      if (!/^[A-Za-z_]\w*$/.test(k) || !t) throw new Error('Bad property "' + p + '"');
      return { k: k, t: t, ro: ro, opt: opt };
    });
  }
  function propStr(p) { return (p.ro ? 'readonly ' : '') + p.k + (p.opt ? '?' : '') + ': ' + p.t; }

  /* ================= TOPIC 5: Mapped types ================= */
  topics.push({
    title: 'Mapped Types: a for-loop over the Keys of a Type',
    analogy: `<p>Picture a <b>photocopier with settings</b>. You feed in a form (an object type). The machine goes through it <b>line by line</b> — every field — and applies the same setting to each one: "make every field optional", "stamp READ-ONLY on every field", "turn every value into a function that returns it", "rename each field to getX".</p>
<p>A <b>mapped type</b> is that photocopier: <code>{ [K in keyof T]: … }</code> loops over each key K of T and produces one new property per key.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Arrays have <code>.map()</code>; object <b>types</b> have mapped types. The syntax reads like a for-loop:</p>
<pre>type Flags&lt;T&gt; = { [K in keyof T]: boolean };
// "for each key K in T, make a property K whose type is boolean"
type F = Flags&lt;{ id: number; name: string }&gt;;   // { id: boolean; name: boolean }</pre>
<p>The loop variable K is a <b>single key</b> each time, so inside you can look up the original value type with <code>T[K]</code>. That is how you keep or transform types per property:</p>
${H.table(['Mapped type', 'Per key it produces', 'Name'], [
      ['<code>{ [K in keyof T]?: T[K] }</code>', 'same type, but optional', 'Partial'],
      ['<code>{ [K in keyof T]-?: T[K] }</code>', 'same type, optional <b>removed</b>', 'Required'],
      ['<code>{ readonly [K in keyof T]: T[K] }</code>', 'same type, read-only', 'Readonly'],
      ['<code>{ -readonly [K in keyof T]: T[K] }</code>', 'same type, read-only <b>removed</b>', 'Mutable (not built in)'],
      ['<code>{ [K in Keys]: V }</code>', 'every key in a union gets type V', 'Record'],
      ['<code>{ [P in K]: T[P] }</code> with <code>K extends keyof T</code>', 'only the chosen keys', 'Pick'],
      ['<code>{ [K in keyof T]: T[K] | null }</code>', 'value can also be null', 'Nullable (custom)']
    ])}
<p>🔵 <b>Modifiers.</b> <code>?</code> and <code>readonly</code> can be <b>added</b> (<code>+?</code>, <code>+readonly</code>, plus sign optional) or <b>removed</b> (<code>-?</code>, <code>-readonly</code>). When you map over <code>keyof T</code> directly, the original modifiers are <b>preserved</b> automatically — this is called a <b>homomorphic</b> mapped type.</p>
<p><b>Key remapping with <code>as</code></b> (TS 4.1): <code>{ [K in keyof T as NewKey]: … }</code> lets you <b>rename</b> or <b>filter</b> keys. Rename with a template literal (<code>\`get&#36;{Capitalize&lt;K &amp; string&gt;}\`</code>); filter by mapping a key to <code>never</code> — keys that become <code>never</code> are dropped from the result.</p>
<pre>type Getters&lt;T&gt; = { [K in keyof T as \`get&#36;{Capitalize&lt;K &amp; string&gt;}\`]: () =&gt; T[K] };
type OnlyStrings&lt;T&gt; = { [K in keyof T as T[K] extends string ? K : never]: T[K] };</pre>
<p>Mapped types over a <b>tuple or array</b> type produce a tuple/array again (<code>Partial&lt;[number, string]&gt;</code> → <code>[number?, string?]</code>), which is why the same utility works on both.</p>`,
    clues: ['"make all fields optional / required / readonly" → mapped type with <code>?</code>, <code>-?</code>, <code>readonly</code>', '"the same keys as X but every value is a Y" (flags, validators, error messages per field) → <code>{ [K in keyof X]: Y }</code>', '"rename every key" (getters, <code>onChange</code> handlers, event names) → key remapping with <code>as</code> + template literals', '"only the keys whose value is a function / string" → remap the key to <code>never</code> to filter', '"form state: values, errors and touched for each field" → three mapped types over one model', '"keep it in sync automatically when the interface changes" → derive with a mapped type instead of copying'],
    code: [`
interface User {
  readonly id: number;
  name: string;
  email?: string;
}

// --- the four modifier variants
type MyPartial<T>  = { [K in keyof T]?: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
type Mutable<T>    = { -readonly [K in keyof T]: T[K] };

type U1 = MyPartial<User>;    // { readonly id?: number; name?: string; email?: string }
type U2 = MyRequired<User>;   // { readonly id: number; name: string; email: string }
type U3 = Mutable<User>;      // { id: number; name: string; email?: string }

// --- same keys, different values: per-field form state
type FieldErrors<T> = { [K in keyof T]?: string };
type Touched<T> = { [K in keyof T]: boolean };

interface SignupForm { email: string; password: string; age: number }
const errors: FieldErrors<SignupForm> = { password: 'Too short' };
const touched: Touched<SignupForm> = { email: true, password: true, age: false };
`, `
// --- key remapping with "as": rename keys
type Getters<T> = {
  [K in keyof T as \`get\${Capitalize<K & string>}\`]: () => T[K];
};
type PersonGetters = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

// --- key remapping to never: filter keys by their value type
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};
interface Product { id: number; title: string; price: number; inStock: boolean }
type NumericFields = PickByValue<Product, number>;   // { id: number; price: number }

// --- event handler props derived from an event map
interface Events { click: { x: number; y: number }; close: void }
type Handlers<E> = {
  [K in keyof E as \`on\${Capitalize<K & string>}\`]?: (payload: E[K]) => void;
};
const h: Handlers<Events> = {
  onClick: (p) => console.log(p.x, p.y),
  onClose: () => console.log('closed'),
};

// --- mapping over a union of keys that is not keyof anything (like Record)
type Flags = { [F in 'darkMode' | 'beta' | 'newCheckout']: boolean };
const flags: Flags = { darkMode: true, beta: false, newCheckout: false };

// --- mapped types preserve tuples
type MaybeTuple = Partial<[number, string]>;   // [number?, string?]
`],
    codeTitle: ['Modifiers (?, -?, readonly, -readonly) and per-field types', 'Key remapping (as), filtering with never, tuples'],
    viz: [{
      title: 'Mapped type, key by key',
      input: 'readonly id:number, name:string, email?:string, tags:string[] | Partial',
      inputLabel: 'Properties (readonly / ? allowed) | Partial, Required, Readonly, Mutable, Nullable, Getters or Stringify',
      gen: function (input) {
        var halves = String(input).split(/\|(?=[^|]*$)/);
        var mode = halves.length === 2 ? halves[1].trim() : 'Partial';
        var src = halves.length === 2 ? halves[0] : String(input);
        var MODES = {
          Partial: { def: '{ [K in keyof T]?: T[K] }', f: function (p) { return { k: p.k, t: p.t, ro: p.ro, opt: true, note: 'add ?' }; } },
          Required: { def: '{ [K in keyof T]-?: T[K] }', f: function (p) { return { k: p.k, t: p.t, ro: p.ro, opt: false, note: p.opt ? 'remove ? (and the implicit | undefined)' : 'already required' }; } },
          Readonly: { def: '{ readonly [K in keyof T]: T[K] }', f: function (p) { return { k: p.k, t: p.t, ro: true, opt: p.opt, note: p.ro ? 'already readonly' : 'add readonly' }; } },
          Mutable: { def: '{ -readonly [K in keyof T]: T[K] }', f: function (p) { return { k: p.k, t: p.t, ro: false, opt: p.opt, note: p.ro ? 'remove readonly' : 'already mutable' }; } },
          Nullable: { def: '{ [K in keyof T]: T[K] | null }', f: function (p) { return { k: p.k, t: p.t + ' | null', ro: p.ro, opt: p.opt, note: 'value type widened' }; } },
          Stringify: { def: '{ [K in keyof T]: string }', f: function (p) { return { k: p.k, t: 'string', ro: p.ro, opt: p.opt, note: 'value type replaced' }; } },
          Getters: { def: '{ [K in keyof T as `get' + DOL + 'Capitalize<K & string>}`]: () => T[K] }', f: function (p) { return { k: 'get' + cap(p.k), t: '() => ' + p.t, ro: false, opt: p.opt, note: 'key renamed with as + template literal' }; } }
        };
        if (!MODES[mode]) throw new Error('Mode must be one of: ' + Object.keys(MODES).join(', '));
        var props = parseProps(src, 8);
        var M = MODES[mode];
        var code = 'type T = { ' + props.map(propStr).join('; ') + ' };\ntype My' + mode + '<T> = ' + M.def + ';\ntype Result = My' + mode + '<T>;';
        var frames = [], rows = [];
        frames.push(fr('Input type <code>T</code>. The mapped type <code>My' + mode + '</code> will loop over <code>keyof T</code> and build <b>one output property per key</b>.', [cp(code, { 1: 'cur' }), tb(['key', 'type', 'readonly?', 'optional?'], props.map(function (p) { return [p.k, p.t, p.ro ? 'yes' : '-', p.opt ? 'yes' : '-']; }), {}, 'T (input)')]));
        frames.push(fr('Step 1: compute <code>keyof T</code> — the list the loop walks: <code>' + esc(props.map(function (p) { return '"' + p.k + '"'; }).join(' | ')) + '</code>. Because we map over <code>keyof T</code> directly, the mapped type is <b>homomorphic</b>: original <code>readonly</code>/<code>?</code> are carried over unless we change them.', [cp(code, { 2: 'cur' }), { type: 'set', label: 'keyof T (loop values)', items: props.map(function (p) { return p.k; }) }]));
        props.forEach(function (p, i) {
          var o = M.f(p);
          rows.push([p.k, propStr(p), o.k, propStr(o), o.note]);
          var hl = {}; hl[i] = 'cur';
          var shl = {}; shl[p.k] = 'cur';
          frames.push(fr('Loop iteration ' + (i + 1) + ': <b>K = <code>"' + esc(p.k) + '"</code></b>, so <code>T[K]</code> = <code>' + esc(p.t) + '</code>. Output: <code>' + esc(propStr(o)) + '</code> (' + esc(o.note) + ').',
            [cp(code, { 2: 'cur' }), { type: 'set', label: 'keyof T', items: props.map(function (q) { return q.k; }), hl: shl }, vp({ K: '"' + p.k + '"', 'T[K]': p.t, 'output prop': propStr(o) }, { 'output prop': 'ok' }), tb(['K', 'input prop', 'output key', 'output prop', 'what changed'], rows, hl, 'built so far')]));
        });
        var res = props.map(function (p) { return propStr(M.f(p)); });
        frames.push(fr('Loop finished. All output properties are collected into one object type — the result is always in sync with <code>T</code>: add a field to T and it appears here automatically.', [cp(code, { 3: 'sel' }), tb(['K', 'input prop', 'output key', 'output prop', 'what changed'], rows, (function () { var h = {}; rows.forEach(function (_, i) { h[i] = 'ok'; }); return h; })(), 'complete mapping'), vp({ Result: '{ ' + res.join('; ') + ' }' }, { Result: 'sel' })]));
        return frames;
      }
    }, {
      title: 'Key remapping with as: rename and filter',
      input: 'id:number, title:string, price:number, save:() => void',
      inputLabel: 'Properties (name:type, comma separated)',
      gen: function (input) {
        var props = parseProps(input, 8);
        var isFn = function (t) { return /=>/.test(t); };
        var code = 'type DataOnly<T> = {\n  [K in keyof T as T[K] extends Function ? never : K]: T[K];\n};\ntype Setters<T> = {\n  [K in keyof DataOnly<T> as `set' + DOL + 'Capitalize<K & string>}`]: (v: T[K]) => void;\n};';
        var frames = [], rows = [];
        frames.push(fr('Two remapping tricks: <b>filter</b> (send unwanted keys to <code>never</code>) and <b>rename</b> (build a new key with a template literal). The <code>as</code> clause runs once per key.', [cp(code, { 2: 'cur' }), tb(['key', 'type'], props.map(function (p) { return [p.k, p.t]; }), {}, 'T')]));
        props.forEach(function (p, i) {
          var drop = isFn(p.t);
          rows.push([p.k, p.t, drop ? 'never (dropped)' : p.k, drop ? '—' : 'set' + cap(p.k)]);
          var hl = {}; hl[i] = drop ? 'bad' : 'ok';
          frames.push(fr('K = <code>"' + esc(p.k) + '"</code>: does <code>' + esc(p.t) + '</code> extend <code>Function</code>? ' + (drop ? '<span class="c-r">Yes</span> → the key is remapped to <code>never</code> and <b>disappears</b>.' : '<span class="c-g">No</span> → key kept, then renamed to <code>set' + esc(cap(p.k)) + '</code> by the second mapped type.'), [cp(code, { 2: drop ? 'bad' : 'ok', 5: drop ? '' : 'ok' }), tb(['K', 'T[K]', 'after filter', 'setter key'], rows, hl, 'per-key decisions')]));
        });
        var kept = props.filter(function (p) { return !isFn(p.t); });
        frames.push(fr('Result: only data fields survive, each with a typed setter. Keys mapped to <code>never</code> never appear — that is the official way to filter keys in a mapped type.', [vp({ 'DataOnly<T>': '{ ' + kept.map(function (p) { return p.k + ': ' + p.t; }).join('; ') + ' }', 'Setters<T>': '{ ' + kept.map(function (p) { return 'set' + cap(p.k) + ': (v: ' + p.t + ') => void'; }).join('; ') + ' }' }, { 'Setters<T>': 'sel' })]));
        frames.push(fr('Take-away: inside <code>as</code>, return <code>never</code> to <b>drop</b> a key, or a template literal to <b>rename</b> it. The value side (<code>T[K]</code>) still uses the original key.', [tx('<code>[K in keyof T as Cond&lt;K&gt; extends true ? NewName&lt;K&gt; : never]: T[K]</code>', 'pattern')]));
        return frames;
      }
    }],
    examples: [
      { title: 'Config with defaults: Partial in, Required out', html: `<p>A very common API shape: callers pass a <b>partial</b> config, the function merges defaults and works with a <b>complete</b> one internally. Both types derive from the one interface.</p>`, code: `
interface Options { retries: number; timeoutMs: number; verbose: boolean }

const DEFAULTS: Required<Options> = { retries: 3, timeoutMs: 5000, verbose: false };

function connect(opts: Partial<Options> = {}): Required<Options> {
  const full = { ...DEFAULTS, ...opts };
  return full;
}
console.log(connect({ verbose: true }).retries);   // 3
` },
      { title: 'Readonly only goes one level deep', html: `<p><code>Readonly&lt;T&gt;</code> marks the <b>top-level</b> properties only. Nested objects and arrays stay mutable — which is why <code>DeepReadonly</code> (next topic) exists. Also remember: it is a <b>compile-time</b> promise, not <code>Object.freeze</code>.</p>`, code: `
interface State { user: { name: string }; items: string[] }
const s: Readonly<State> = { user: { name: 'Asha' }, items: [] };

// @ts-expect-error  top-level property is readonly
s.user = { name: 'Ben' };
s.user.name = 'Ben';      // allowed! nested object is not readonly
s.items.push('x');        // allowed! the array itself is still mutable
` },
      { title: 'Turning a union into an object of handlers', html: `<p>Mapping over a <b>union of string literals</b> (not over <code>keyof</code>) builds an object with exactly those keys. Combined with <code>Extract</code> on a discriminated union, each handler gets the precise payload type.</p>`, code: `
type Action =
  | { type: 'add'; item: string }
  | { type: 'remove'; id: number }
  | { type: 'clear' };

type HandlerMap = {
  [T in Action['type']]: (action: Extract<Action, { type: T }>) => void;
};

const handlers: HandlerMap = {
  add: (a) => console.log('add', a.item),       // a: { type: 'add'; item: string }
  remove: (a) => console.log('remove', a.id),   // a: { type: 'remove'; id: number }
  clear: () => console.log('clear'),
};
handlers.add({ type: 'add', item: 'milk' });
` }
    ],
    deepDive: `<p>🟣 <b>Homomorphic mapped types.</b> When the mapped type has the form <code>{ [K in keyof T]: … }</code> (or <code>[K in keyof T as …]</code>, or <code>[P in K]</code> where <code>K extends keyof T</code>), TS treats it as homomorphic: it <b>copies modifiers</b> from T, maps <b>arrays/tuples to arrays/tuples</b>, and when T is a <b>union</b> it distributes (maps each member separately). When T is a primitive, a homomorphic mapped type returns the primitive unchanged (<code>Partial&lt;string&gt;</code> is <code>string</code>).</p>
<p><b>Optional vs undefined.</b> <code>-?</code> also strips the implicit <code>| undefined</code> that came from <code>?</code>. With <code>exactOptionalPropertyTypes</code> on, <code>{ a?: string }</code> no longer accepts <code>{ a: undefined }</code> — optional means "may be missing", not "may be undefined". Libraries that care about this distinction must test with the flag on.</p>
<p><b>Key types.</b> The key space in <code>[K in X]</code> must be assignable to <code>string | number | symbol</code>. With <code>as</code>, you often write <code>K &amp; string</code> (or <code>Extract&lt;K, string&gt;</code>) because <code>keyof T</code> can include number and symbol keys, which template literals cannot all accept. Remapping with <code>as</code> makes the type <b>non-homomorphic for arrays</b>: mapping a tuple with <code>as</code> produces an object with keys like <code>"0" | "length" | "push"</code>, a classic gotcha.</p>
<p><b>Performance and display.</b> Mapped types are lazy: the compiler resolves properties when someone asks. Hover output may show <code>MyPartial&lt;User&gt;</code> instead of the expanded object; the "<code>Prettify&lt;T&gt; = { [K in keyof T]: T[K] } &amp; {}</code>" trick forces expansion for nicer tooltips. Very large mapped types over thousands of keys (e.g. generated i18n keys) can dominate check time.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants happily generate a dozen near-duplicate interfaces (<code>UserForm</code>, <code>UserFormErrors</code>, <code>UserFormTouched</code>…). Prompt them to <b>derive</b> instead: <code>"Express FormErrors, Touched and Dirty as mapped types over SignupForm."</code> Less code, zero drift.</p>
<p><b>Use AI as a partner:</b> paste a mapped type you do not understand from a library and ask for a per-key expansion table for a concrete input — exactly what the visualizer above does. Verify by hovering a <code>Prettify&lt;…&gt;</code> alias in your editor.</p>
<p><b>Where AI goes wrong:</b> forgets <code>K &amp; string</code> inside template keys, assumes <code>Readonly</code> is deep, maps tuples with <code>as</code> and gets method names as keys, or drops modifiers by mapping over <code>string</code> instead of <code>keyof T</code>. <b>What you must still own:</b> knowing homomorphic behaviour, when modifiers are preserved, and when a mapped type is clearer than a hand-written interface (public API docs sometimes read better spelled out).</p>`,
    problems: [{
      title: 'Implement Partial, Required, Readonly and Mutable',
      level: 'Easy', tags: ['mapped types', 'modifiers'], companies: ['Microsoft', 'Atlassian', 'Shopify'],
      statement: `<p>Implement <code>MyPartial&lt;T&gt;</code>, <code>MyRequired&lt;T&gt;</code>, <code>MyReadonly&lt;T&gt;</code> and <code>Mutable&lt;T&gt;</code> (removes <code>readonly</code>) using mapped types only. Other modifiers must be preserved.</p>`,
      constraints: `<p>No built-in utility types. Must work for any object type and for tuples.</p>`,
      example: `<p>For <code>{ readonly id: number; name?: string }</code>: MyPartial → ${H.c('g', '{ readonly id?: number; name?: string }')}; MyRequired → ${H.c('g', '{ readonly id: number; name: string }')}; Mutable → ${H.c('g', '{ id: number; name?: string }')}. Each output keeps the modifiers it did not explicitly change, because the mapping is homomorphic.</p>`,
      brute: { why: `<p>Writing <code>UserUpdate</code>, <code>UserComplete</code>, <code>FrozenUser</code> by hand triples the maintenance: every new field must be added in four places, and forgetting one is a silent bug.</p>`, code: `
interface User { readonly id: number; name?: string }
interface UserUpdate { readonly id?: number; name?: string }   // copied by hand
interface UserComplete { readonly id: number; name: string }   // copied by hand
interface UserMutable { id: number; name?: string }            // copied by hand
` },
      mcq: { q: 'Which mapped type removes the optional modifier?', options: ['<code>{ [K in keyof T]?: T[K] }</code>', '<code>{ [K in keyof T]-?: T[K] }</code>', '<code>{ [K in keyof T]!: T[K] }</code>', '<code>{ required [K in keyof T]: T[K] }</code>'], answer: 1, explain: 'The minus prefix removes a modifier: -? removes optional, -readonly removes readonly. "!" and "required" are not valid here.' },
      hints: [`<p>Hint 1: loop with <code>[K in keyof T]</code> and keep the value as <code>T[K]</code>; only the <b>modifiers</b> change.</p>`, `<p>Hint 2: add with <code>?</code> / <code>readonly</code>, remove with <code>-?</code> / <code>-readonly</code>.</p>`, `<p>Hint 3: because the mapping is over <code>keyof T</code> (homomorphic), unchanged modifiers are copied automatically and tuples stay tuples. Test with <code>Expect&lt;Equal&lt;…&gt;&gt;</code>, which distinguishes readonly and optional.</p>`],
      tests: {"types":["type _0 = Expect<Equal<MyPartial<{ readonly id: number; name?: string }>, { readonly id?: number; name?: string }>>","type _1 = Expect<Equal<MyRequired<{ readonly id: number; name?: string }>, { readonly id: number; name: string }>>","type _2 = Expect<Equal<MyReadonly<{ readonly id: number; name?: string }>, { readonly id: number; readonly name?: string }>>","type _3 = Expect<Equal<Mutable<{ readonly id: number; name?: string }>, { id: number; name?: string }>>","type _4 = Expect<Equal<MyPartial<{}>, {}>>","type _5 = Expect<Equal<MyPartial<[number, string]>, [number?, string?]>>","type _6 = Expect<Equal<MyRequired<[1?, 2?]>, [1, 2]>>","type _7 = Expect<Equal<MyReadonly<[1, 2]>, readonly [1, 2]>>","type _8 = Expect<Equal<Mutable<readonly [1, 2]>, [1, 2]>>","// @ts-expect-error\nconst p: MyRequired<{ a?: 1 }> = {};","// @ts-expect-error\nconst r: MyReadonly<{ a: 1 }> = { a: 1 }; r.a = 1;","// @ts-expect-error\nconst q: MyPartial<{ a: 1 }> = { b: 2 };"]},
      solution: {
        approach: `<p>Four one-line mapped types; the only difference is the modifier prefix. Homomorphic mapping preserves everything else.</p>`,
        code: `
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

type MyPartial<T>  = { [K in keyof T]?: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
type Mutable<T>    = { -readonly [K in keyof T]: T[K] };

interface User { readonly id: number; name?: string }

type cases = [
  Expect<Equal<MyPartial<User>, { readonly id?: number; name?: string }>>,
  Expect<Equal<MyRequired<User>, { readonly id: number; name: string }>>,
  Expect<Equal<MyReadonly<User>, { readonly id: number; readonly name?: string }>>,
  Expect<Equal<Mutable<User>, { id: number; name?: string }>>,
  Expect<Equal<MyPartial<[number, string]>, [number?, string?]>>
];
`,
        dry: { head: ['K', 'T[K]', 'MyPartial', 'MyRequired', 'Mutable'], rows: [
          ['"id"', 'number (readonly)', 'readonly id?: number', 'readonly id: number', 'id: number'],
          ['"name"', 'string (optional)', 'name?: string', H.c('g', 'name: string'), 'name?: string']
        ] },
        complexity: `<p>One property per key: O(number of keys) for the checker, computed lazily.</p>`,
        followUps: ['Make <code>PartialBy&lt;T, K&gt;</code>: only the keys K become optional.', 'Why does <code>Partial&lt;string&gt;</code> return <code>string</code>?', 'What changes with <code>exactOptionalPropertyTypes</code>?']
      }
    }]
  });

  /* ================= TOPIC 6: Template literal types ================= */
  topics.push({
    title: 'Template Literal Types: String Patterns the Compiler Understands',
    analogy: `<p>Think of a <b>menu combo board</b>: "Pick a size (Small / Large) + a drink (Tea / Coffee)". The board does not list all four combos — but everybody knows "Large-Tea" is valid and "Huge-Tea" is not. Template literal types are that board: <code>\`&#36;{Size}-&#36;{Drink}\`</code> describes <b>every</b> valid combination, and the compiler rejects anything else.</p>
<p>Run it backwards and it becomes a <b>stencil for reading strings</b>: given <code>"/users/:id"</code>, pick out the <code>id</code> part.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> You already know JavaScript template strings: <code>\`Hello &#36;{name}\`</code>. TypeScript lets you write the same thing <b>at the type level</b>, where the holes contain <b>types</b>:</p>
<pre>type Greeting = \`Hello &#36;{string}\`;          // any string starting with "Hello "
type Px = \`&#36;{number}px\`;                    // "10px", "2.5px" ... but not "10em"
type Size = 'sm' | 'lg';
type Color = 'red' | 'blue';
type Cls = \`&#36;{Size}-&#36;{Color}\`;   // "sm-red" | "sm-blue" | "lg-red" | "lg-blue"</pre>
<p>🔵 <b>Unions multiply.</b> If the holes contain unions, the result is the <b>cross product</b> of all combinations (2 sizes × 2 colors = 4 strings). This is great for small sets (CSS classes, event names) but grows fast — 3 holes of 20 members each is 8,000 strings.</p>
${H.table(['Built-in string helper', 'Example', 'Result'], [
      ['<code>Uppercase&lt;S&gt;</code>', '<code>Uppercase&lt;"get"&gt;</code>', '<code>"GET"</code>'],
      ['<code>Lowercase&lt;S&gt;</code>', '<code>Lowercase&lt;"POST"&gt;</code>', '<code>"post"</code>'],
      ['<code>Capitalize&lt;S&gt;</code>', '<code>Capitalize&lt;"name"&gt;</code>', '<code>"Name"</code>'],
      ['<code>Uncapitalize&lt;S&gt;</code>', '<code>Uncapitalize&lt;"Name"&gt;</code>', '<code>"name"</code>']
    ])}
<p><b>Parsing with infer.</b> Inside a conditional type, a template literal pattern with <code>infer</code> pulls pieces out of a string type:</p>
<pre>type ParamOf&lt;S&gt; = S extends \`&#36;{string}:&#36;{infer P}\` ? P : never;
type P = ParamOf&lt;'/users/:id'&gt;;   // "id"</pre>
<p>Add recursion and you can parse whole route strings, dotted paths (<code>"user.address.city"</code>), CSS values, or SQL-ish mini languages — this is how libraries such as typed routers, i18n key checkers and <code>styled-components</code> helpers give you autocomplete on strings.</p>
<p><b>Key remapping + template literals</b> (previous topic) is the other everyday use: turning <code>{ name: string }</code> into <code>{ getName(): string; onNameChange(v: string): void }</code>.</p>`,
    clues: ['"only allow strings like <code>user:123</code> / <code>10px</code> / <code>v1.2.3</code>" → <code>\`user:&#36;{number}\`</code>-style pattern types', '"typed event names" (<code>onClick</code>, <code>user:created</code>) → template literal + <code>Capitalize</code>', '"extract the params from a route string" → template literal + <code>infer</code> + recursion', '"type-safe access by dotted path" (<code>get(obj, "a.b.c")</code>) → recursive <code>Paths&lt;T&gt;</code> and <code>PathValue&lt;T, P&gt;</code>', '"all combinations of size and color" → union cross product', '"convert snake_case keys to camelCase" → recursive string transform with <code>infer</code>'],
    code: [`
// --- patterns
type Px = \`\${number}px\`;
const w: Px = '12px';
// @ts-expect-error  "em" does not fit the pattern
const bad: Px = '12em';

type HttpMethod = 'get' | 'post';
type Endpoint = \`\${Uppercase<HttpMethod>} /api/\${'users' | 'orders'}\`;
// "GET /api/users" | "GET /api/orders" | "POST /api/users" | "POST /api/orders"

// --- typed event names from a model
type ChangeEvents<T> = {
  [K in keyof T & string as \`\${K}Changed\`]: (value: T[K]) => void;
};
type UserEvents = ChangeEvents<{ name: string; age: number }>;
// { nameChanged: (value: string) => void; ageChanged: (value: number) => void }

// --- parsing: every ":param" in a route
type RouteParams<S extends string> =
  S extends \`\${string}:\${infer Param}/\${infer Rest}\`
    ? Param | RouteParams<Rest>
    : S extends \`\${string}:\${infer Param}\`
      ? Param
      : never;

type P1 = RouteParams<'/users/:userId/posts/:postId'>;   // "userId" | "postId"

function buildUrl<S extends string>(route: S, params: Record<RouteParams<S>, string>): string {
  return route.replace(/:(\\w+)/g, (_, k: string) => (params as Record<string, string>)[k]);
}
buildUrl('/users/:userId/posts/:postId', { userId: '7', postId: '42' });
// @ts-expect-error  postId is missing
buildUrl('/users/:userId/posts/:postId', { userId: '7' });
`, `
// --- snake_case -> camelCase, recursively
type CamelCase<S extends string> =
  S extends \`\${infer Head}_\${infer Tail}\`
    ? \`\${Head}\${Capitalize<CamelCase<Tail>>}\`
    : S;
type C1 = CamelCase<'created_at_utc'>;     // "createdAtUtc"

type CamelKeys<T> = { [K in keyof T as CamelCase<K & string>]: T[K] };
type Row = CamelKeys<{ user_id: number; created_at: string }>;
// { userId: number; createdAt: string }

// --- all dotted paths of a nested object, and the value at a path
type Paths<T> = T extends object
  ? { [K in keyof T & string]: T[K] extends object ? K | \`\${K}.\${Paths<T[K]> & string}\` : K }[keyof T & string]
  : never;

type PathValue<T, P extends string> =
  P extends \`\${infer K}.\${infer Rest}\`
    ? K extends keyof T ? PathValue<T[K], Rest> : never
    : P extends keyof T ? T[P] : never;

interface Settings { theme: { color: string; size: number }; lang: string }
type SettingPath = Paths<Settings>;          // "theme" | "lang" | "theme.color" | "theme.size"
type ColorType = PathValue<Settings, 'theme.color'>;   // string

function getSetting<P extends Paths<Settings>>(s: Settings, path: P): PathValue<Settings, P> {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], s) as PathValue<Settings, P>;
}
`],
    codeTitle: ['Patterns, cross products, event names, route params', 'camelCase keys, dotted paths and PathValue'],
    viz: [{
      title: 'Union cross product inside a template literal',
      input: "'sm' | 'md' | 'lg' ; 'red' | 'blue'",
      inputLabel: 'Union A ; Union B (every A is paired with every B as A-B)',
      gen: function (input) {
        var halves = String(input).split(';');
        if (halves.length !== 2) throw new Error("Format: 'a' | 'b' ; 'x' | 'y'");
        var clean = function (s) { return s.trim().replace(/^['"]|['"]$/g, ''); };
        var A = splitTop(halves[0], '|').map(clean).filter(Boolean), B = splitTop(halves[1], '|').map(clean).filter(Boolean);
        if (!A.length || !B.length || A.length > 6 || B.length > 6) throw new Error('Each union needs 1-6 members');
        if (A.concat(B).some(function (x) { return !/^[\w ]+$/.test(x); })) throw new Error('Use simple words as union members');
        var tpl = '`' + DOL + 'A}-' + DOL + 'B}`';
        var code = "type A = " + A.map(function (a) { return "'" + a + "'"; }).join(' | ') + ";\ntype B = " + B.map(function (b) { return "'" + b + "'"; }).join(' | ') + ";\ntype Combo = " + tpl + ";";
        var frames = [], grid = A.map(function () { return B.map(function () { return ''; }); }), all = [];
        frames.push(fr('Each hole holds a union. TypeScript expands the template for <b>every pair</b> — like a nested for-loop over A and B.', [cp(code, { 3: 'cur' }), { type: 'grid', label: 'A × B (empty so far)', rowHead: A.slice(), colHead: B.slice(), rows: grid.map(function (r) { return r.slice(); }) }]));
        for (var i = 0; i < A.length; i++) {
          for (var j = 0; j < B.length; j++) {
            grid[i][j] = A[i] + '-' + B[j];
            all.push('"' + A[i] + '-' + B[j] + '"');
            var hl = {}; hl[i + ',' + j] = 'ok';
            if (all.length <= 10 || (i === A.length - 1 && j === B.length - 1)) frames.push(fr('A = <code>"' + esc(A[i]) + '"</code>, B = <code>"' + esc(B[j]) + '"</code> → <code>"' + esc(A[i] + '-' + B[j]) + '"</code>.', [{ type: 'grid', label: 'A × B', rowHead: A.slice(), colHead: B.slice(), rows: grid.map(function (r) { return r.slice(); }), hl: hl }, vp({ 'members so far': all.length }, {})]));
          }
        }
        frames.push(fr('Result: a union of <b>' + all.length + '</b> string literals (' + A.length + ' × ' + B.length + '). Size multiplies with every hole — keep the inputs small, the compiler caps unions at 100,000 members.', [cp(code, { 3: 'sel' }), vp({ Combo: all.join(' | ') }, { Combo: 'sel' })]));
        frames.push(fr('Rule of thumb: members = product of the hole sizes. Two holes of 20 → 400; three holes of 50 → 125,000, which is over the 100,000 limit and fails to compile.', [tb(['holes', 'sizes', 'members'], [['2', A.length + ' × ' + B.length, String(all.length)], ['2', '20 × 20', '400'], ['3', '50 × 50 × 50', '125,000 (error)']], { 0: 'sel', 2: 'bad' }, 'how fast it grows')]));
        return frames;
      }
    }, {
      title: 'Parsing route params with infer + recursion',
      input: '/users/:userId/posts/:postId/comments/:commentId',
      inputLabel: 'A route string with :params',
      gen: function (input) {
        var s = String(input).trim();
        if (!/^[\w/:.-]{1,80}$/.test(s)) throw new Error('Use a route like /users/:id/posts/:postId (max 80 chars)');
        var code = 'type RouteParams<S> =\n  S extends `' + DOL + 'string}:' + DOL + 'infer Param}/' + DOL + 'infer Rest}`\n    ? Param | RouteParams<Rest>\n    : S extends `' + DOL + 'string}:' + DOL + 'infer Param}`\n      ? Param\n      : never;';
        var frames = [], found = [], rest = s, stack = [], guard = 0;
        frames.push(fr('Goal: turn the route string into the union of its parameter names. Each call tries pattern 1 (a param followed by more path), then pattern 2 (a final param), else gives <code>never</code>.', [cp(code, { 1: 'cur' }), vp({ S: '"' + s + '"' }, { S: 'cur' })]));
        while (guard++ < 10) {
          stack.push('RouteParams<"' + rest + '">');
          var c = rest.indexOf(':');
          if (c < 0) {
            frames.push(fr('<code>"' + esc(rest) + '"</code> has no <code>:</code> → neither pattern matches → <code>never</code> (which disappears from the union).', [cp(code, { 6: 'bad' }), { type: 'stack', label: 'recursive calls', items: stack.slice(), hl: (function () { var h = {}; h[stack.length - 1] = 'bad'; return h; })() }]));
            break;
          }
          var after = rest.slice(c + 1), sl = after.indexOf('/');
          if (sl >= 0) {
            var param = after.slice(0, sl), r2 = after.slice(sl + 1);
            found.push(param);
            frames.push(fr('Pattern 1 matches. <code>&#36;{string}</code> soaks up <code>"' + esc(rest.slice(0, c)) + '"</code> up to the first <code>:</code>; <b>Param = <code>"' + esc(param) + '"</code></b> (up to the next <code>/</code>); <b>Rest = <code>"' + esc(r2) + '"</code></b>. Result: <code>"' + esc(param) + '" | RouteParams&lt;Rest&gt;</code>.', [cp(code, { 2: 'ok', 3: 'cur' }), { type: 'stack', label: 'recursive calls', items: stack.slice(), hl: (function () { var h = {}; h[stack.length - 1] = 'cur'; return h; })() }, vp({ Param: '"' + param + '"', Rest: '"' + r2 + '"', 'found so far': found.map(function (f) { return '"' + f + '"'; }).join(' | ') }, { Param: 'ok' })]));
            rest = r2;
          } else {
            found.push(after);
            frames.push(fr('Pattern 1 fails (no <code>/</code> after the param) but pattern 2 matches: <b>Param = <code>"' + esc(after) + '"</code></b>. No more recursion.', [cp(code, { 4: 'ok', 5: 'ok' }), { type: 'stack', label: 'recursive calls', items: stack.slice(), hl: (function () { var h = {}; h[stack.length - 1] = 'ok'; return h; })() }, vp({ Param: '"' + after + '"' }, { Param: 'ok' })]));
            break;
          }
        }
        frames.push(fr('The stack unwinds and the pieces are unioned. A function can now demand exactly these keys: <code>Record&lt;RouteParams&lt;S&gt;, string&gt;</code>.', [vp({ 'RouteParams<S>': found.length ? found.map(function (f) { return '"' + f + '"'; }).join(' | ') : 'never' }, { 'RouteParams<S>': 'sel' }), { type: 'set', label: 'required params object keys', items: found.slice() }]));
        frames.push(fr('Take-away: <b>one pattern match finds one param; recursion on the rest finds the others.</b> No params at all gives <code>never</code>, and <code>Record&lt;never, string&gt;</code> is just <code>{}</code>.', [tx('<code>link("' + esc(s) + '", { ' + found.map(function (f) { return esc(f) + ": '…'"; }).join(', ') + ' })</code>', 'what the caller must pass')]));
        return frames;
      }
    }],
    examples: [
      { title: 'CSS-like values with a number hole', html: `<p><code>&#36;{number}</code> accepts any string that parses as a number (<code>"1"</code>, <code>"-2.5"</code>, <code>"1e3"</code>). Combined with a unit union you get a cheap "only valid lengths" type — no runtime cost.</p>`, code: `
type Unit = 'px' | 'rem' | '%';
type Length = \`\${number}\${Unit}\` | 0;

function setWidth(el: { style: { width: string } }, w: Length): void {
  el.style.width = String(w);
}
const box = { style: { width: '' } };
setWidth(box, '12px');
setWidth(box, '1.5rem');
setWidth(box, 0);
// @ts-expect-error  "wide" is not a Length
setWidth(box, 'wide');
` },
      { title: 'Namespaced event bus', html: `<p>Build event names from a domain map so <code>emit</code> autocompletes and the payload type follows the name. <code>\`&#36;{D}:&#36;{E}\`</code> crosses each domain with its own events (not all events), because the mapped type runs per domain.</p>`, code: `
interface DomainEvents {
  user: { created: { id: string }; deleted: { id: string } };
  order: { paid: { orderId: string; amount: number } };
}
type EventName = {
  [D in keyof DomainEvents & string]: \`\${D}:\${keyof DomainEvents[D] & string}\`;
}[keyof DomainEvents & string];
// "user:created" | "user:deleted" | "order:paid"

type PayloadOf<N extends EventName> =
  N extends \`\${infer D extends keyof DomainEvents}:\${infer E}\`
    ? E extends keyof DomainEvents[D] ? DomainEvents[D][E] : never
    : never;

function emit<N extends EventName>(name: N, payload: PayloadOf<N>): void {
  console.log(name, payload);
}
emit('order:paid', { orderId: 'o1', amount: 30 });
` },
      { title: 'Trim a string type', html: `<p>Recursion peels one whitespace character per step from each side. Useful in parsers for mini-languages encoded in strings (e.g. typed SQL builders, GraphQL tag parsers).</p>`, code: `
type WS = ' ' | '\\n' | '\\t';
type TrimLeft<S extends string> = S extends \`\${WS}\${infer R}\` ? TrimLeft<R> : S;
type TrimRight<S extends string> = S extends \`\${infer R}\${WS}\` ? TrimRight<R> : S;
type Trim<S extends string> = TrimLeft<TrimRight<S>>;

type T1 = Trim<'   hello  '>;   // "hello"
` }
    ],
    deepDive: `<p>🟣 <b>Matching rules.</b> When inferring from a template, each <code>infer</code> placeholder followed by a literal takes the text up to the <b>first</b> occurrence of that literal; a placeholder followed directly by another placeholder takes exactly one character; the last placeholder takes the rest. <code>&#36;{string}</code> in a pattern matches any text (even empty). <code>&#36;{number}</code> matches any non-empty string whose <code>+s</code> is a finite number: <code>"1e3"</code>, <code>"0x10"</code> and even <code>" 1"</code> match, while <code>""</code> and <code>"abc"</code> do not.</p>
<p><b>Cross-product explosion.</b> Template literal types over unions produce every combination eagerly. 4 holes × 26 letters = 456,976 members → error <i>"Expression produces a union type that is too complex to represent"</i> (limit 100,000). For big spaces, prefer pattern holes (<code>&#36;{string}</code>) plus a validating function, or a branded type.</p>
<p><b>Intrinsic string types.</b> <code>Uppercase</code>, <code>Lowercase</code>, <code>Capitalize</code>, <code>Uncapitalize</code> are compiler intrinsics (not written in TS). Applied to <code>string</code> itself they produce <i>pattern</i> types: <code>Uppercase&lt;string&gt;</code> accepts only already-uppercase strings.</p>
<p><b>Real libraries.</b> Typed routers (TanStack Router, Hono, Next.js typed routes) parse path strings like <code>RouteParams</code>; i18n libraries compute <code>Paths&lt;Messages&gt;</code> for key autocomplete; Prisma/Drizzle and Kysely use template types for column references like <code>"users.id"</code>. These types can be the slowest in a code base: recursive <code>Paths&lt;T&gt;</code> over a big nested type is O(total nodes) and is recomputed per instantiation, so cache it in a named alias and cap depth (a <code>Depth</code> tuple counter) for recursive data.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> typed string APIs used to be "too clever"; now assistants generate <code>Paths&lt;T&gt;</code> or route parsers on request. That makes the <b>trade-off</b> the real skill: is autocomplete on strings worth slower builds and scary errors for the team?</p>
<p><b>Use AI as a partner:</b> <code>"Write RouteParams for Express-style paths including optional params (:id?) and wildcards (*). Give Expect&lt;Equal&gt; tests for 8 tricky paths."</code> Then run the tests. Ask it to measure: <code>"How many members does this union have for my inputs?"</code> and double-check by hovering.</p>
<p><b>Where AI goes wrong:</b> confuses runtime template strings with template literal <b>types</b>, forgets <code>K &amp; string</code> (symbol keys break templates), writes Paths without a depth limit (infinite for recursive types like trees), or assumes <code>&#36;{infer A}&#36;{infer B}</code> splits in the middle. <b>What you must still own:</b> knowing the matching rules, the 100k union limit, and when a simple <code>string</code> plus runtime validation is the better engineering choice.</p>`,
    problems: [{
      title: 'Typed route params',
      level: 'Medium', tags: ['template literal types', 'infer', 'recursion'], companies: ['Vercel', 'Netflix', 'Stripe'],
      statement: `<p>Write <code>RouteParams&lt;S&gt;</code> that extracts every <code>:param</code> name from a path string type, and a function <code>link(route, params)</code> that requires <b>exactly</b> those params as a <code>Record</code>. A route with no params should accept an empty object.</p>`,
      constraints: `<p>Params are separated by <code>/</code>. Up to ~20 segments. No <code>any</code>.</p>`,
      example: `<p><code>RouteParams&lt;'/org/:orgId/repo/:repoId'&gt;</code> → ${H.c('g', '"orgId" | "repoId"')}. <code>link('/org/:orgId/repo/:repoId', { orgId: 'a' })</code> → ${H.c('r', 'error: repoId missing')}. <code>RouteParams&lt;'/about'&gt;</code> → ${H.c('b', 'never')}, so the params object is <code>Record&lt;never, string&gt;</code> = <code>{}</code>.</p>`,
      brute: { why: `<p>Typing params as <code>Record&lt;string, string&gt;</code> accepts any keys: a missing or misspelled param compiles fine and produces <code>/org/undefined</code> at runtime.</p>`, code: `
function link(route: string, params: Record<string, string>): string {
  return route.replace(/:(\\w+)/g, (_, k: string) => params[k]);
}
link('/org/:orgId/repo/:repoId', { orgId: 'a' });   // compiles, returns "/org/a/repo/undefined"
` },
      mcq: { q: "For <code>S extends `&#36;{string}:&#36;{infer P}/&#36;{infer R}`</code> and <code>S = '/a/:x/b/:y'</code>, what is P?", options: ['<code>"x/b/:y"</code>', '<code>"x"</code>', '<code>"y"</code>', '<code>"a"</code>'], answer: 1, explain: 'An infer followed by a literal "/" takes text up to the FIRST "/" after it, so P = "x" and R = "b/:y".' },
      hints: [`<p>Hint 1: one pattern match finds <b>one</b> param; recursion on the rest of the string finds the others.</p>`, `<p>Hint 2: two patterns — <code>&#36;{string}:&#36;{infer P}/&#36;{infer R}</code> (param in the middle) and <code>&#36;{string}:&#36;{infer P}</code> (last param). Union the found param with the recursive result.</p>`, `<p>Hint 3: the function is generic in <code>S extends string</code> so the literal route is captured, and the params type is <code>Record&lt;RouteParams&lt;S&gt;, string&gt;</code>. No params → <code>never</code> → <code>Record&lt;never, string&gt;</code> is <code>{}</code>.</p>`],
      tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(route, paramsJson) {\n  if (route === 'LONG') { var segs = [], params = {}; for (var i = 0; i < 20; i++) { segs.push('s' + i + '/:p' + i); params['p' + i] = 'v' + i; } return link('/' + segs.join('/'), params); }\n  return link(route, JSON.parse(paramsJson));\n}"},"cases":[[["/org/:orgId/repo/:repoId","{\"orgId\":\"acme\",\"repoId\":\"web\"}"],"/org/acme/repo/web"],[["/about","{}"],"/about"],[["/u/:id","{\"id\":\"a b\"}"],"/u/a%20b"],[["/u/:id","{\"id\":\"x/y\"}"],"/u/x%2Fy"],[["/a/:id/b/:id","{\"id\":\"7\"}"],"/a/7/b/7"],[["/p/:user_id/:n2","{\"user_id\":\"u\",\"n2\":\"2\"}"],"/p/u/2"],[["/","{}"],"/"],[["LONG",""],"/s0/v0/s1/v1/s2/v2/s3/v3/s4/v4/s5/v5/s6/v6/s7/v7/s8/v8/s9/v9/s10/v10/s11/v11/s12/v12/s13/v13/s14/v14/s15/v15/s16/v16/s17/v17/s18/v18/s19/v19"]]},
      solution: {
        approach: `<p>Recursive conditional type over a template-literal pattern. Each step peels one <code>:param</code> and recurses on the remaining path; the final param is matched by a second pattern. A generic function captures the literal route type and derives the exact required keys.</p>`,
        code: `
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

type RouteParams<S extends string> =
  S extends \`\${string}:\${infer P}/\${infer Rest}\`
    ? P | RouteParams<Rest>
    : S extends \`\${string}:\${infer P}\`
      ? P
      : never;

function link<S extends string>(route: S, params: Record<RouteParams<S>, string>): string {
  const p = params as Record<string, string>;
  return route.replace(/:(\\w+)/g, (_, k: string) => encodeURIComponent(p[k]));
}

type cases = [
  Expect<Equal<RouteParams<'/org/:orgId/repo/:repoId'>, 'orgId' | 'repoId'>>,
  Expect<Equal<RouteParams<'/u/:id'>, 'id'>>,
  Expect<Equal<RouteParams<'/about'>, never>>
];

console.log(link('/org/:orgId/repo/:repoId', { orgId: 'acme', repoId: 'web' }));
console.log(link('/about', {}));
// @ts-expect-error  repoId is missing
link('/org/:orgId/repo/:repoId', { orgId: 'acme' });
`,
        dry: { head: ['call', 'pattern', 'P', 'Rest', 'contributes'], rows: [
          ["RouteParams<'/org/:orgId/repo/:repoId'>", '1 (middle)', '"orgId"', '"repo/:repoId"', '"orgId"'],
          ["RouteParams<'repo/:repoId'>", '2 (last)', '"repoId"', '—', '"repoId"'],
          ['union', '—', '—', '—', H.c('g', '"orgId" | "repoId"')]
        ] },
        complexity: `<p>One instantiation per param: O(p) for p params. Runtime replace is O(length of route).</p>`,
        followUps: ['Support optional params <code>:id?</code> (make those keys optional).', 'Make <code>link</code> accept numbers too for <code>:id</code> segments ending in <code>Id</code>.', 'Make the recursion tail-recursive with an accumulator.']
      }
    }]
  });

  /* ================= TOPIC 7: Utility types and implementing them ================= */
  topics.push({
    title: 'Utility Types: Partial, Pick, Omit, Record, ReturnType… and Building Them Yourself',
    analogy: `<p>Utility types are the <b>kitchen gadgets</b> of TypeScript: a peeler, a grater, a slicer. Each does one small job on a type — "make everything optional", "keep only these fields", "remove these fields", "the type this function gives back".</p>
<p>Interviewers love asking you to <b>build the gadget yourself</b>, because each one is just a few lines of the tools you already learned: <code>keyof</code>, indexed access, mapped types, conditional types and <code>infer</code>. If you can rebuild them, you understand the whole type system.</p>`,
    explain: `<p>🟢 <b>The cheat sheet.</b> Every built-in below lives in <code>lib.es5.d.ts</code> (open it with "Go to definition" in your editor — it is short and readable).</p>
${H.table(['Utility', 'What it does', 'Built from'], [
      ['<code>Partial&lt;T&gt;</code>', 'all props optional', 'mapped type + <code>?</code>'],
      ['<code>Required&lt;T&gt;</code>', 'all props required', 'mapped type + <code>-?</code>'],
      ['<code>Readonly&lt;T&gt;</code>', 'all props readonly (1 level)', 'mapped type + <code>readonly</code>'],
      ['<code>Pick&lt;T, K&gt;</code>', 'keep keys K', 'mapped over <code>K extends keyof T</code>'],
      ['<code>Omit&lt;T, K&gt;</code>', 'drop keys K', '<code>Pick&lt;T, Exclude&lt;keyof T, K&gt;&gt;</code>'],
      ['<code>Record&lt;K, V&gt;</code>', 'object with keys K, values V', '<code>{ [P in K]: V }</code>'],
      ['<code>Exclude / Extract</code>', 'filter a union', 'distributive conditional'],
      ['<code>NonNullable&lt;T&gt;</code>', 'remove null/undefined', '<code>T &amp; {}</code>'],
      ['<code>ReturnType / Parameters</code>', 'function output / inputs', 'conditional + <code>infer</code>'],
      ['<code>Awaited&lt;T&gt;</code>', 'value inside (nested) promises', 'recursive conditional + <code>infer</code>'],
      ['<code>InstanceType / ConstructorParameters</code>', 'what <code>new</code> gives / takes', '<code>infer</code> on <code>new (...) =&gt; …</code>'],
      ['<code>NoInfer&lt;T&gt;</code> (5.4)', 'block inference from a position', 'compiler intrinsic']
    ])}
<p>🔵 <b>Three you must be able to write on a whiteboard:</b></p>
<pre>type MyPick&lt;T, K extends keyof T&gt; = { [P in K]: T[P] };
type MyOmit&lt;T, K extends keyof any&gt; = { [P in keyof T as P extends K ? never : P]: T[P] };
type MyRecord&lt;K extends keyof any, V&gt; = { [P in K]: V };</pre>
<p>Note the constraints: <b>Pick</b> demands that K are real keys (<code>K extends keyof T</code>), but the built-in <b>Omit</b> only requires <code>K extends keyof any</code> — so <code>Omit&lt;User, 'typo'&gt;</code> silently does nothing. Many teams add a <b>strict</b> version: <code>type StrictOmit&lt;T, K extends keyof T&gt; = Omit&lt;T, K&gt;</code>.</p>
<p><b>DeepReadonly</b> (not built in, asked constantly): recurse into objects, leave functions and primitives alone.</p>
<pre>type DeepReadonly&lt;T&gt; =
  T extends (...args: any[]) =&gt; any ? T :          // functions: keep as is
  T extends object ? { readonly [K in keyof T]: DeepReadonly&lt;T[K]&gt; } :
  T;                                                // primitives: keep as is</pre>
<p>Because it maps over <code>keyof T</code>, arrays become <code>readonly</code> arrays automatically (homomorphic mapping over an array gives a readonly array when you add <code>readonly</code>).</p>`,
    clues: ['"implement Pick / Omit / Partial / Readonly / Record / ReturnType without the built-ins" → mapped + conditional + infer (this topic)', '"make it deeply immutable" (Redux state, config) → recursive <code>DeepReadonly</code>', '"the update payload is the entity without id and timestamps" → <code>Omit&lt;Entity, "id" | "createdAt"&gt;</code>', '"make only some fields optional" → <code>Omit&lt;T, K&gt; &amp; Partial&lt;Pick&lt;T, K&gt;&gt;</code>', '"a lookup table keyed by an enum / union" → <code>Record&lt;Key, Value&gt;</code>', '"why does Omit not complain about a wrong key?" → its constraint is <code>keyof any</code>; use a strict Omit'],
    code: [`
// ---------- object shapers ----------
type MyPartial<T>  = { [K in keyof T]?: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };

type MyPick<T, K extends keyof T> = { [P in K]: T[P] };

// Omit, version 1: exactly how lib.d.ts writes it
type MyOmit<T, K extends keyof any> = MyPick<T, Exclude<keyof T, K>>;
// Omit, version 2: key remapping (also keeps modifiers; same result)
type MyOmit2<T, K extends keyof any> = { [P in keyof T as P extends K ? never : P]: T[P] };
// Strict Omit: wrong keys are compile errors
type StrictOmit<T, K extends keyof T> = MyOmit<T, K>;

type MyRecord<K extends keyof any, V> = { [P in K]: V };

// ---------- union filters ----------
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;
type MyNonNullable<T> = T & {};

// ---------- function helpers ----------
type MyReturnType<F extends (...args: any) => any> = F extends (...args: any) => infer R ? R : any;
type MyParameters<F extends (...args: any) => any> = F extends (...args: infer P) => any ? P : never;
type MyAwaited<T> = T extends PromiseLike<infer U> ? MyAwaited<U> : T;

// ---------- usage ----------
interface Task { id: number; title: string; done: boolean; createdAt: Date }
type TaskPreview = MyPick<Task, 'title' | 'done'>;          // { title: string; done: boolean }
type NewTask = MyOmit<Task, 'id' | 'createdAt'>;            // { title: string; done: boolean }
type ByStatus = MyRecord<'open' | 'closed', Task[]>;        // { open: Task[]; closed: Task[] }
// @ts-expect-error  StrictOmit rejects keys that do not exist
type Oops = StrictOmit<Task, 'titel'>;
`, `
// ---------- DeepReadonly and DeepPartial ----------
type DeepReadonly<T> =
  T extends (...args: any[]) => any ? T :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;

type DeepPartial<T> =
  T extends (...args: any[]) => any ? T :
  T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } :
  T;

interface AppState {
  user: { name: string; roles: string[] };
  settings: { theme: { mode: 'light' | 'dark' } };
  log: (msg: string) => void;
}

declare const state: DeepReadonly<AppState>;
// @ts-expect-error  nested property is readonly now
state.user.name = 'x';
// @ts-expect-error  nested array is a readonly array: no push
state.user.roles.push('admin');
state.log('functions are left callable');

const patch: DeepPartial<AppState> = { settings: { theme: {} } };   // any subset is fine

// ---------- combos you will write in real code ----------
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
type Prettify<T> = { [K in keyof T]: T[K] } & {};   // flattens intersections in hovers

interface Post { id: string; title: string; body: string; draft: boolean }
type PostInput = Prettify<PartialBy<Post, 'id' | 'draft'>>;
// { title: string; body: string; id?: string; draft?: boolean }
const p: PostInput = { title: 'Hi', body: '...' };
`],
    codeTitle: ['Built-in utilities re-implemented', 'DeepReadonly, DeepPartial, PartialBy and Prettify'],
    viz: [{
      title: 'How Omit<T, K> is computed (keyof → Exclude → Pick)',
      input: 'id:number, name:string, password:string, email:string, createdAt:Date | password, createdAt',
      inputLabel: 'Properties of T (name:type, ...) | keys to omit (comma separated)',
      gen: function (input) {
        var halves = String(input).split('|');
        if (halves.length !== 2) throw new Error('Format: key:type, key:type | keyToOmit, keyToOmit');
        var props = parseProps(halves[0], 8);
        var om = halves[1].split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!om.length || om.length > 6) throw new Error('Give 1-6 keys to omit');
        var keys = props.map(function (p) { return p.k; });
        var Kstr = om.map(function (k) { return '"' + k + '"'; }).join(' | ');
        var code = 'type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;\ntype Pick<T, K extends keyof T> = { [P in K]: T[P] };\n\ntype Result = Omit<T, ' + Kstr + '>;';
        var frames = [], rows = [];
        frames.push(fr('Omit is not magic — it is <b>three tools chained</b>: <code>keyof</code> to list keys, <code>Exclude</code> to drop some, <code>Pick</code> to rebuild the object from the survivors.', [cp(code, { 1: 'cur', 4: 'cur' }), tb(['key', 'type'], props.map(function (p) { return [p.k, p.t]; }), {}, 'T')]));
        frames.push(fr('Step 1 — <code>keyof T</code> = <code>' + esc(keys.map(function (k) { return '"' + k + '"'; }).join(' | ')) + '</code>.', [cp(code, { 1: 'cur' }), { type: 'array', label: 'keyof T (a union, shown as a list)', values: keys.slice() }, vp({ K: Kstr }, {})]));
        var kept = [];
        keys.forEach(function (k, i) {
          var drop = om.indexOf(k) >= 0;
          if (!drop) kept.push(k);
          rows.push(['"' + k + '"', drop ? 'yes' : 'no', drop ? 'never' : '"' + k + '"']);
          var hl = {}; hl[i] = drop ? 'bad' : 'ok';
          frames.push(fr('Step 2 — <code>Exclude</code> distributes: is <code>"' + esc(k) + '"</code> in K? ' + (drop ? '<span class="c-r">Yes → never (dropped)</span>' : '<span class="c-g">No → kept</span>'), [cp(code, { 1: 'cur' }), { type: 'array', label: 'keyof T', values: keys.slice(), hl: hl }, tb(['member', 'extends K?', 'Exclude gives'], rows, (function () { var h = {}; h[rows.length - 1] = drop ? 'bad' : 'ok'; return h; })(), 'Exclude&lt;keyof T, K&gt;')]));
        });
        var unknown = om.filter(function (k) { return keys.indexOf(k) < 0; });
        if (unknown.length) frames.push(fr('Notice: <code>' + esc(unknown.join(', ')) + '</code> is not a key of T, yet there is <b>no error</b> — built-in Omit only requires <code>K extends keyof any</code>. A <code>StrictOmit&lt;T, K extends keyof T&gt;</code> would catch this typo.', [vp({ 'unused keys': unknown.join(', ') }, { 'unused keys': 'bad' })]));
        frames.push(fr('Step 3 — <code>Pick&lt;T, ' + esc(kept.map(function (k) { return '"' + k + '"'; }).join(' | ') || 'never') + '&gt;</code> loops over the surviving keys and copies <code>T[P]</code> for each.', [cp(code, { 2: 'ok' }), tb(['P', 'T[P]'], props.filter(function (p) { return kept.indexOf(p.k) >= 0; }).map(function (p) { return [p.k, p.t]; }), {}, 'Pick loop')]));
        frames.push(fr('Final <code>Result</code>. Same answer as the one-liner <code>{ [P in keyof T as P extends K ? never : P]: T[P] }</code>.', [cp(code, { 4: 'sel' }), vp({ Result: '{ ' + props.filter(function (p) { return kept.indexOf(p.k) >= 0; }).map(function (p) { return p.k + ': ' + p.t; }).join('; ') + ' }' }, { Result: 'sel' })]));
        return frames;
      }
    }, {
      title: 'DeepReadonly walks the object tree recursively',
      gen: function () {
        var code = 'type DeepReadonly<T> =\n  T extends (...args: any[]) => any ? T :\n  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :\n  T;';
        var nodes = [
          ['AppState', 'object', 'recurse into keys'],
          ['user', 'object', 'readonly user → recurse'],
          ['user.name', 'string', 'primitive → stop'],
          ['user.roles', 'string[]', 'array is an object → readonly string[]'],
          ['settings', 'object', 'readonly settings → recurse'],
          ['settings.theme', 'object', 'readonly theme → recurse'],
          ['settings.theme.mode', "'light' | 'dark'", 'primitive union → stop (distributes)'],
          ['log', '(msg: string) => void', 'function → kept as is (callable)']
        ];
        var GN = [{ id: 'AppState', label: 'AppState', x: 50, y: 6, shape: 'box' }, { id: 'user', label: 'user', x: 20, y: 26, shape: 'box' }, { id: 'settings', label: 'settings', x: 55, y: 26, shape: 'box' }, { id: 'log', label: 'log()', x: 88, y: 26, shape: 'box' },
          { id: 'user.name', label: 'name', x: 8, y: 46, shape: 'box' }, { id: 'user.roles', label: 'roles[]', x: 32, y: 46, shape: 'box' }, { id: 'settings.theme', label: 'theme', x: 60, y: 46, shape: 'box' }, { id: 'settings.theme.mode', label: 'mode', x: 60, y: 64, shape: 'box' }];
        var GE = [['AppState', 'user'], ['AppState', 'settings'], ['AppState', 'log'], ['user', 'user.name'], ['user', 'user.roles'], ['settings', 'settings.theme'], ['settings.theme', 'settings.theme.mode']];
        function gph(hl) { return { type: 'graph', label: 'AppState shape (depth-first walk)', directed: true, height: 72, nodes: GN, edges: GE, hl: hl }; }
        var line = function (t) { return /=>/.test(t) ? 2 : (t === 'object' || /\[\]$/.test(t)) ? 3 : 4; };
        var frames = [], stack = [], done = [];
        frames.push(fr('We apply <code>DeepReadonly</code> to a nested state. Think of it as a <b>depth-first walk</b>: each property type runs through the three-way check (function? object? primitive?).', [cp(code, { 1: 'cur' }), gph({ AppState: 'cur' })]));
        nodes.forEach(function (n, i) {
          var depth = n[0].split('.').length;
          stack = stack.slice(0, depth - 1); stack.push('DeepReadonly<' + n[0].split('.').pop() + '>');
          done.push([n[0], n[1], n[2]]);
          var l = line(n[1]), hl = {}; hl[l] = l === 2 ? 'ok' : l === 3 ? 'cur' : 'sel';
          var rh = {}; rh[i] = 'cur';
          var gh = {}; done.forEach(function (d) { gh[d[0]] = 'done'; }); gh[n[0] === 'AppState' ? 'AppState' : n[0]] = 'cur';
          frames.push(fr('<code>' + esc(n[0]) + '</code> : <code>' + esc(n[1]) + '</code> → ' + esc(n[2]) + '.', [cp(code, hl), gph(gh), { type: 'stack', label: 'recursion stack', items: stack.slice(), hl: (function () { var h = {}; h[stack.length - 1] = 'cur'; return h; })() }, tb(['path', 'type', 'decision'], done, rh, 'visited')]));
        });
        frames.push(fr('Done: every object level got <code>readonly</code>, arrays became <code>readonly string[]</code>, functions stayed callable. Assigning <code>state.user.name</code> or calling <code>roles.push</code> are now compile errors.', [tb(['path', 'type', 'decision'], done, {}, 'all levels'), tx('Remember: this is compile-time only. For runtime safety also use <code>Object.freeze</code> (shallow) or an immutable library.')]));
        return frames;
      }
    }],
    examples: [
      { title: 'API DTOs derived from one entity', html: `<p>Create, update and public shapes all come from one <code>User</code>. Add a field once and every DTO follows. <code>Omit</code> for create, <code>Partial</code> + <code>Omit</code> for update, <code>Pick</code> for the public view.</p>`, code: `
interface User { id: string; email: string; name: string; passwordHash: string; createdAt: Date }

type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string };
type UpdateUserDto = Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>>;
type PublicUser = Pick<User, 'id' | 'name'>;

function toPublic(u: User): PublicUser {
  return { id: u.id, name: u.name };   // extra fields would be an error in a fresh object literal
}
const dto: CreateUserDto = { email: 'a@b.co', name: 'Asha', password: 'secret123' };
` },
      { title: 'Record vs index signature', html: `<p><code>Record&lt;'a' | 'b', number&gt;</code> requires <b>exactly</b> those keys (great for exhaustiveness). <code>Record&lt;string, number&gt;</code> is just an index signature — any key, and with <code>noUncheckedIndexedAccess</code> lookups are <code>number | undefined</code>.</p>`, code: `
type Plan = 'free' | 'pro' | 'team';
const price: Record<Plan, number> = { free: 0, pro: 12, team: 30 };   // missing one = error

const cache: Record<string, number> = {};
cache['anything'] = 1;
const maybe = cache['other'];   // number (or number | undefined with noUncheckedIndexedAccess)
console.log(price.pro, maybe);
` },
      { title: 'Omit on a union loses the discriminant', html: `<p>Built-in <code>Omit</code> is <b>not distributive</b>: on a union it uses <code>keyof (A | B)</code> = only the <b>common</b> keys, so member-specific fields vanish. Write a distributive version when the input is a discriminated union.</p>`, code: `
type Shape =
  | { kind: 'circle'; r: number; id: string }
  | { kind: 'rect'; w: number; h: number; id: string };

type Broken = Omit<Shape, 'id'>;          // { kind: 'circle' | 'rect' }  — r, w, h are gone!
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
type Fixed = DistributiveOmit<Shape, 'id'>;
// { kind: 'circle'; r: number } | { kind: 'rect'; w: number; h: number }
const c: Fixed = { kind: 'circle', r: 2 };
` }
    ],
    deepDive: `<p>🟣 <b>Reading lib.d.ts.</b> <code>Pick</code> is <code>{ [P in K]: T[P] }</code> with <code>K extends keyof T</code> — homomorphic through the constraint, so it keeps <code>readonly</code>/<code>?</code>. <code>Omit</code> is <code>Pick&lt;T, Exclude&lt;keyof T, K&gt;&gt;</code>; the team chose <code>K extends keyof any</code> deliberately (so you can omit keys from a generic T you do not fully know), at the cost of typo safety. <code>ReturnType</code>'s false branch is <code>any</code>, not <code>never</code>; <code>NonNullable</code> became <code>T &amp; {}</code> in TS 4.8 together with better narrowing of <code>{}</code>.</p>
<p><b>Distributivity matters.</b> <code>Partial</code>, <code>Readonly</code>, <code>Pick</code> (homomorphic) distribute over unions; <code>Omit</code> does not (it goes through <code>keyof T</code> of the whole union). For discriminated unions use <code>T extends any ? Omit&lt;T, K&gt; : never</code>.</p>
<p><b>DeepReadonly pitfalls.</b> Built-ins like <code>Date</code>, <code>Map</code> and <code>Set</code> are objects: a naive DeepReadonly turns their methods into readonly properties (still callable) but does <b>not</b> make <code>Map.set</code> unusable — use <code>ReadonlyMap</code>/<code>ReadonlySet</code> branches for real immutability. Recursive types over cyclic data (a tree node pointing to its parent) are fine because mapped types are lazy, but helpers that <b>expand</b> eagerly (<code>Paths</code>) need a depth limit.</p>
<p><b>Intersections vs mapped results.</b> <code>Omit&lt;T, K&gt; &amp; Partial&lt;Pick&lt;T, K&gt;&gt;</code> is correct but shows as an intersection in hovers and error messages. <code>Prettify</code> (<code>{ [K in keyof T]: T[K] } &amp; {}</code>) flattens it. Intersections of conflicting property types become <code>never</code> silently (<code>{ a: string } &amp; { a: number }</code> → <code>a: never</code>), a common source of baffling errors.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "implement Omit" is now a 2-second autocomplete, so interviewers follow up: <i>why is Omit's constraint <code>keyof any</code>? why does it break on unions? how is DeepReadonly different for arrays and functions?</i> Your value is in the <b>why</b> and the edge cases.</p>
<p><b>Use AI as a partner:</b> <code>"Generate Expect&lt;Equal&gt; tests for my DeepReadonly covering arrays, tuples, functions, Date, Map, optional props and unions."</code> Run them; fix your type. Also ask it to list where a codebase uses hand-written DTO copies that could become <code>Pick</code>/<code>Omit</code>.</p>
<p><b>Where AI goes wrong:</b> writes <code>DeepReadonly</code> that also wraps functions into objects (breaking calls), uses <code>Omit</code> on discriminated unions, invents non-existent built-ins (<code>DeepPartial</code> is <b>not</b> built in), or tests with <code>extends</code> checks that pass for <code>any</code>. <b>What you must still own:</b> choosing between built-in, strict and distributive variants, and keeping public types readable.</p>`,
    problems: [{
      title: 'Implement Pick, Omit and DeepReadonly',
      level: 'Medium', tags: ['utility types', 'mapped types', 'recursion'], companies: ['Microsoft', 'Meta', 'Atlassian', 'Airbnb'],
      statement: `<p>Implement <code>MyPick&lt;T, K&gt;</code>, <code>MyOmit&lt;T, K&gt;</code> and <code>DeepReadonly&lt;T&gt;</code>. MyPick must reject keys that do not exist. DeepReadonly must make nested objects and arrays readonly while leaving functions callable and primitives unchanged.</p>`,
      constraints: `<p>No built-in utility types (you may use <code>keyof</code>, mapped/conditional types). Tests use the strict <code>Equal</code> helper, so <code>readonly</code> and <code>?</code> must match exactly.</p>`,
      example: `<p><code>MyOmit&lt;{ a: 1; b: 2; c: 3 }, 'b'&gt;</code> → ${H.c('g', '{ a: 1; c: 3 }')}. <code>DeepReadonly&lt;{ x: { y: number[] } }&gt;</code> → ${H.c('g', '{ readonly x: { readonly y: readonly number[] } }')}. <code>MyPick&lt;T, 'nope'&gt;</code> → ${H.c('r', 'error')}.</p>`,
      brute: { why: `<p><code>Readonly&lt;T&gt;</code> is the obvious first try for "immutable state", but it is <b>shallow</b>: nested objects and arrays stay mutable, so <code>state.user.name = 'x'</code> still compiles. Hand-writing nested readonly interfaces works but duplicates the whole model.</p>`, code: `
interface State { user: { name: string; tags: string[] } }
const s: Readonly<State> = { user: { name: 'a', tags: [] } };
s.user.name = 'mutated';   // compiles: Readonly is only one level deep
s.user.tags.push('x');     // compiles too
` },
      mcq: { q: 'Why does a correct DeepReadonly check for functions <b>before</b> checking <code>T extends object</code>?', options: ['Functions are primitives', 'Functions are objects too; mapping over their keys would turn them into non-callable object types', 'It makes compilation faster only', 'TypeScript forbids readonly on functions'], answer: 1, explain: 'A function type extends object. Mapping over keyof a function drops its call signature, so callers could no longer call it. Return T unchanged for functions.' },
      hints: [`<p>Hint 1: Pick = mapped type over <b>K</b> (the chosen keys), not over <code>keyof T</code>; constrain <code>K extends keyof T</code>.</p>`, `<p>Hint 2: Omit = map over <code>keyof T</code> and remap keys that are in K to <code>never</code> (or Pick with <code>Exclude</code>).</p>`, `<p>Hint 3: DeepReadonly = three-way conditional: function → T; object → <code>{ readonly [K in keyof T]: DeepReadonly&lt;T[K]&gt; }</code>; else → T. Arrays are handled by the homomorphic mapping (they become readonly arrays).</p>`],
      tests: {"types":["type _0 = Expect<Equal<MyPick<Task, \"title\" | \"done\">, { title: string; done?: boolean }>>","type _1 = Expect<Equal<MyPick<{ a: 1; b?: 2; readonly c: 3 }, \"b\" | \"c\">, { b?: 2; readonly c: 3 }>>","type _2 = Expect<Equal<MyPick<{ a: 1 }, never>, {}>>","type _3 = Expect<Equal<MyOmit<{ a: 1; b: 2; c: 3 }, \"b\">, { a: 1; c: 3 }>>","type _4 = Expect<Equal<MyOmit<{ a: 1; b?: 2 }, \"a\" | \"zzz\">, { b?: 2 }>>","type _5 = Expect<Equal<MyOmit<{ a: 1 }, never>, { a: 1 }>>","type _6 = Expect<Equal<DeepReadonly<number>, number>>","type _7 = Expect<Equal<DeepReadonly<string[]>, readonly string[]>>","type _8 = Expect<Equal<DeepReadonly<{ a: { b: { c: 1 } } }>, { readonly a: { readonly b: { readonly c: 1 } } }>>","type _9 = Expect<Equal<DeepReadonly<{ f: (x: number) => string }>, { readonly f: (x: number) => string }>>","// @ts-expect-error\ntype Bad = MyPick<Task, \"nope\">;","// @ts-expect-error\nconst d: DeepReadonly<{ a: { b: 1 } }> = { a: { b: 1 } }; d.a.b = 2;","// @ts-expect-error\nconst o: MyOmit<{ a: 1; b: 2 }, \"b\"> = { a: 1, b: 2 };"]},
      solution: {
        approach: `<p>Pick and Omit are single mapped types (Omit uses key remapping to <code>never</code>). DeepReadonly is a recursive conditional type with a function guard first, then a readonly homomorphic mapping that recurses on each property.</p>`,
        code: `
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MyOmit<T, K extends keyof any> = { [P in keyof T as P extends K ? never : P]: T[P] };

type DeepReadonly<T> =
  T extends (...args: any[]) => any ? T :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;

interface Task { title: string; done?: boolean; meta: { tags: string[]; at: { day: number } }; run: () => void }

type cases = [
  Expect<Equal<MyPick<Task, 'title' | 'done'>, { title: string; done?: boolean }>>,
  Expect<Equal<MyOmit<{ a: 1; b: 2; c: 3 }, 'b'>, { a: 1; c: 3 }>>,
  Expect<Equal<
    DeepReadonly<Task>,
    {
      readonly title: string;
      readonly done?: boolean;
      readonly meta: { readonly tags: readonly string[]; readonly at: { readonly day: number } };
      readonly run: () => void;
    }
  >>
];
// @ts-expect-error  'nope' is not a key of Task
type Bad = MyPick<Task, 'nope'>;
`,
        dry: { head: ['type visited', 'function?', 'object?', 'result'], rows: [
          ['Task', 'no', 'yes', 'readonly mapping, recurse'],
          ['string (title)', 'no', 'no', 'string'],
          ['{ tags; at }', 'no', 'yes', 'readonly mapping, recurse'],
          ['string[]', 'no', 'yes (array)', 'readonly string[]'],
          ['() =&gt; void', H.c('g', 'yes'), '—', 'kept callable']
        ] },
        complexity: `<p>Pick/Omit: O(keys). DeepReadonly: O(total properties in the tree), evaluated lazily as you access nested types.</p>`,
        followUps: ['Make a <code>DistributiveOmit</code> for unions.', 'Handle <code>Map</code> and <code>Set</code> with <code>ReadonlyMap</code>/<code>ReadonlySet</code>.', 'Write <code>DeepMutable</code> (the inverse).']
      }
    }]
  });

  /* ================= TOPIC 8: Declaration files ================= */
  topics.push({
    title: 'Declaration Files (.d.ts): Types for Code You Did Not Write in TypeScript',
    analogy: `<p>A <code>.d.ts</code> file is a <b>restaurant menu</b>. The menu lists every dish, what goes in it and what you get — but there is no kitchen on the menu. The real cooking (the JavaScript) happens somewhere else.</p>
<p>When you <code>import</code> a plain-JavaScript library, TypeScript cannot read the kitchen; it reads the <b>menu</b>. No menu → "I don't know this restaurant" (error TS7016). A wrong menu → you order a dish that does not exist and the app crashes at runtime, even though the compiler was happy.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A declaration file contains <b>only types</b>: function signatures, interfaces, classes without bodies, constants without values. It produces <b>no JavaScript</b>. TypeScript uses it to type-check calls into code that is JavaScript (or already compiled).</p>
<pre>// math.d.ts — the "menu" for math.js
export declare function add(a: number, b: number): number;
export declare const PI: number;
export interface Point { x: number; y: number }</pre>
${H.table(['Where types come from', 'Example', 'When'], [
      ['Bundled with the package', '<code>"types": "./dist/index.d.ts"</code> or an <code>exports</code> <code>"types"</code> condition in package.json', 'library written in TS (most modern packages)'],
      ['DefinitelyTyped', '<code>npm i -D @types/lodash</code>', 'community types for a JS package'],
      ['Your own ambient module', '<code>declare module "legacy-lib" { … }</code> in <code>types/legacy-lib.d.ts</code>', 'no types exist anywhere'],
      ['Shorthand ambient module', '<code>declare module "legacy-lib";</code>', 'quick unblock: everything becomes <code>any</code>'],
      ['Wildcard modules', '<code>declare module "*.svg" { const src: string; export default src; }</code>', 'bundler imports for assets/CSS modules'],
      ['Generated from your TS', '<code>"declaration": true</code> in tsconfig → <code>tsc</code> emits <code>.d.ts</code> next to <code>.js</code>', 'publishing your own library']
    ])}
<p>🔵 <b>Three superpowers you will use.</b></p>
<ul>
<li><b><code>declare</code></b> — "this exists at runtime, trust me": <code>declare const __APP_VERSION__: string;</code> for a value injected by your bundler.</li>
<li><b>Global augmentation</b> — add to globals from inside a module: <code>declare global { interface Window { analytics: Analytics } }</code> (the file must be a module, so add <code>export {}</code>).</li>
<li><b>Module augmentation</b> — add fields to someone else's types: <code>declare module "express-serve-static-core" { interface Request { user?: User } }</code>. Works because <b>interfaces merge</b> (declaration merging); type aliases do not.</li>
</ul>
<p><b>Script vs module .d.ts.</b> A <code>.d.ts</code> with no top-level <code>import</code>/<code>export</code> is a <b>global script</b>: everything in it is global. Add one top-level <code>import</code> or <code>export</code> and it becomes a <b>module</b>: its contents are private unless exported, and globals need <code>declare global</code>. This one rule explains most "my declaration is ignored" bugs.</p>`,
    clues: ['"Could not find a declaration file for module X" (TS7016) → install <code>@types/x</code> or write <code>declare module "x"</code>', '"add a property to Window / Request / process.env" → global or module augmentation (interface merging)', '"import a .svg / .css / .png in TS" → wildcard <code>declare module "*.svg"</code>', '"publish a library with types" → <code>declaration: true</code>, <code>"types"</code>/<code>exports</code> conditions, <code>isolatedDeclarations</code>', '"variable injected at build time" (<code>__DEV__</code>, <code>import.meta.env</code>) → <code>declare const</code> / augment <code>ImportMetaEnv</code>', '"types work in my editor but not for consumers" → check the emitted .d.ts and package.json <code>exports</code> types condition'],
    code: [`
// ===== types/legacy-charts.d.ts — describe an untyped JS library =====
declare module 'legacy-charts' {
  export interface ChartOptions {
    width: number;
    height: number;
    theme?: 'light' | 'dark';
  }
  export interface Chart {
    render(data: number[]): void;
    destroy(): void;
  }
  export function createChart(el: HTMLElement, opts: ChartOptions): Chart;
  const version: string;
  export default version;
}

// ===== types/assets.d.ts — let bundler imports type-check =====
declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.module.css' {
  const classes: { readonly [className: string]: string };
  export default classes;
}

// ===== a value injected by the bundler (define plugin) =====
declare const __APP_VERSION__: string;
`, `
// ===== types/globals.d.ts — a MODULE file that augments globals =====
export {};   // makes this file a module, so "declare global" is required and allowed

interface Analytics {
  track(event: string, props?: Record<string, unknown>): void;
}

declare global {
  interface Window {
    analytics?: Analytics;          // merges into the built-in Window interface
  }
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;         // process.env.DATABASE_URL is now string, not string | undefined
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

// ===== module augmentation: add req.user to Express =====
interface SessionUser { id: string; roles: string[] }
declare module 'express-serve-static-core' {
  interface Request {
    user?: SessionUser;
  }
}
`],
    codeTitle: ['Ambient module, wildcard modules, declare const', 'Global and module augmentation'],
    viz: [{
      title: 'How TypeScript finds the types for an import',
      input: 'legacy-charts',
      inputLabel: 'Package name you import (try: legacy-charts, lodash, zod, left-pad)',
      gen: function (input) {
        var name = String(input).trim();
        if (!/^(@[\w.-]+\/)?[\w.-]{1,40}$/.test(name)) throw new Error('Type a package name like lodash or @scope/pkg');
        var KNOWN = { zod: 'bundled', lodash: 'types', 'legacy-charts': 'ambient' };
        var found = KNOWN[name] || 'none';
        var nodes = [
          { id: 'imp', label: "import '" + name + "'", x: 12, y: 30, shape: 'box', w: 22 },
          { id: 'pkg', label: 'package.json types / exports', x: 42, y: 8, shape: 'box', w: 26 },
          { id: 'at', label: '@types/' + name.replace(/^@([\w.-]+)\//, '$1__'), x: 42, y: 30, shape: 'box', w: 26 },
          { id: 'amb', label: "declare module '" + name + "'", x: 42, y: 52, shape: 'box', w: 26 },
          { id: 'ok', label: 'typed ✓', x: 82, y: 18, shape: 'box' },
          { id: 'err', label: 'TS7016 / implicit any', x: 82, y: 48, shape: 'box', w: 22 }
        ];
        var edges = [['imp', 'pkg', '1'], ['imp', 'at', '2'], ['imp', 'amb', '3'], ['pkg', 'ok'], ['at', 'ok'], ['amb', 'ok'], ['imp', 'err', 'none']];
        function g(hl, ehl) { return { type: 'graph', label: 'type resolution (moduleResolution: bundler / node16)', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl, ehl: ehl }; }
        var frames = [];
        frames.push(fr('You write <code>import { … } from "' + esc(name) + '"</code>. The <b>JavaScript</b> is found at runtime; the compiler separately hunts for a <b>.d.ts</b> "menu".', [g({ imp: 'cur' }, {})]));
        frames.push(fr('Place 1: the package itself. It checks <code>package.json</code> → the <code>"types"</code> condition inside <code>"exports"</code>, then <code>"types"</code>/<code>"typings"</code>, then an <code>index.d.ts</code> next to the entry. ' + (found === 'bundled' ? '<span class="c-g">Found</span> — this package ships its own types.' : '<span class="c-r">Nothing there</span>.'), [g({ imp: 'cur', pkg: found === 'bundled' ? 'ok' : 'bad' }, { 'imp-pkg': 'cur' })]));
        if (found === 'bundled') {
          frames.push(fr('Done: bundled types win. They always match the installed version — the best case.', [g({ pkg: 'ok', ok: 'sel' }, { 'pkg-ok': 'ok' })]));
          frames.push(fr('Tip: if the package also has an outdated <code>@types/' + esc(name) + '</code> installed, remove it to avoid confusion.', [tx('Modern packages written in TS ship <code>.d.ts</code> files generated by <code>tsc --declaration</code>.')]));
          return frames;
        }
        frames.push(fr('Place 2: <code>node_modules/@types/' + esc(name) + '</code> (DefinitelyTyped, controlled by <code>typeRoots</code>/<code>types</code> in tsconfig). ' + (found === 'types' ? '<span class="c-g">Found</span>.' : '<span class="c-r">Not installed</span>.'), [g({ pkg: 'bad', at: found === 'types' ? 'ok' : 'bad' }, { 'imp-at': 'cur' })]));
        if (found === 'types') {
          frames.push(fr('Done: community types from <code>@types</code>. Keep the major version in step with the library — mismatches are a classic source of wrong types.', [g({ at: 'ok', ok: 'sel' }, { 'at-ok': 'ok' })]));
          frames.push(fr('Checklist: <code>npm i -D @types/' + esc(name) + '</code>, and check its version matches the library\'s major version.', [tx('DefinitelyTyped versions follow <code>MAJOR.MINOR</code> of the library they describe.')]));
          return frames;
        }
        frames.push(fr('Place 3: any <b>ambient module declaration</b> <code>declare module "' + esc(name) + '"</code> in a .d.ts included by your tsconfig. ' + (found === 'ambient' ? '<span class="c-g">Found in types/' + esc(name) + '.d.ts</span> — the one you wrote.' : '<span class="c-r">None</span>.'), [g({ pkg: 'bad', at: 'bad', amb: found === 'ambient' ? 'ok' : 'bad' }, { 'imp-amb': 'cur' })]));
        if (found === 'ambient') {
          frames.push(fr('Done: your hand-written declarations are used. You now <b>own</b> their accuracy — the compiler cannot check them against the real JS.', [g({ amb: 'ok', ok: 'sel' }, { 'amb-ok': 'ok' })]));
          frames.push(fr('Good practice: keep these files in a <code>types/</code> folder, add tests that call the API, and consider contributing them to DefinitelyTyped.', [cp("declare module 'legacy-charts' {\n  export function createChart(el: HTMLElement, opts: ChartOptions): Chart;\n}", { 2: 'ok' })]));
          return frames;
        }
        frames.push(fr('<span class="c-r">Nothing found.</span> Under <code>strict</code> (<code>noImplicitAny</code>) this is error <b>TS7016</b>: "Could not find a declaration file for module". Without strict the import is silently <code>any</code>.', [g({ pkg: 'bad', at: 'bad', amb: 'bad', err: 'bad' }, { 'imp-err': 'bad' })]));
        frames.push(fr('Fixes, best first: (1) upgrade to a version with bundled types, (2) <code>npm i -D @types/' + esc(name) + '</code>, (3) write <code>declare module</code> with real signatures, (4) last resort shorthand <code>declare module "' + esc(name) + '";</code> (everything <code>any</code>).', [cp("// types/" + name.replace(/[@/]/g, '_') + ".d.ts\ndeclare module '" + name + "';   // shorthand: unblocks, but all imports are any", { 2: 'bad' })]));
        return frames;
      }
    }, {
      title: 'Declaration merging: why augmentation works',
      gen: function () {
        var frames = [];
        var lib = 'interface Window {\n  document: Document;\n  localStorage: Storage;\n}';
        var mine = 'export {};\ndeclare global {\n  interface Window {\n    analytics?: Analytics;\n  }\n}';
        frames.push(fr('lib.dom.d.ts declares <code>interface Window</code> with hundreds of members (two shown).', [cp(lib, { 1: 'cur' }, 'lib.dom.d.ts'), tb(['member', 'from'], [['document', 'lib.dom'], ['localStorage', 'lib.dom']], {}, 'Window (merged view)')]));
        frames.push(fr('Your module file says <code>declare global { interface Window { … } }</code>. Same name, same scope (global) → TypeScript <b>merges</b> the two interfaces instead of complaining.', [cp(mine, { 2: 'cur', 3: 'ok' }, 'types/globals.d.ts'), tb(['member', 'from'], [['document', 'lib.dom'], ['localStorage', 'lib.dom'], ['analytics?', 'your file']], { 2: 'ok' }, 'Window (merged view)')]));
        frames.push(fr('Why <code>export {}</code>? It turns the file into a <b>module</b>. In a module, plain <code>interface Window</code> would be a <b>new local</b> interface (no merge!). <code>declare global</code> reaches back into the global scope.', [cp(mine, { 1: 'sel', 2: 'sel' }, 'types/globals.d.ts'), vp({ 'file kind': 'module', 'merges with': 'global Window' }, { 'file kind': 'sel' })]));
        frames.push(fr('Type aliases do <b>not</b> merge: <code>type Window = …</code> twice is error <i>Duplicate identifier</i>. That is the practical reason libraries expose <b>interfaces</b> for things users may extend (Express <code>Request</code>, Vue <code>ComponentCustomProperties</code>, Window).', [tb(['declaration kind', 'merges?'], [['interface', 'yes'], ['namespace', 'yes (with functions, classes, enums too)'], ['type alias', 'no'], ['class', 'only with interface/namespace']], { 0: 'ok', 2: 'bad' }, 'merging rules')]));
        frames.push(fr('Now <code>window.analytics?.track("signup")</code> type-checks everywhere in the project — as long as tsconfig <code>include</code> picks up <code>types/globals.d.ts</code>.', [cp('window.analytics?.track("signup", { plan: "pro" });', { 1: 'ok' }, 'app.ts'), vp({ 'window.analytics': 'Analytics | undefined' }, { 'window.analytics': 'ok' })]));
        return frames;
      }
    }],
    examples: [
      { title: 'Typing import.meta.env in Vite', html: `<p>Vite exposes env vars on <code>import.meta.env</code>. Augment the <code>ImportMetaEnv</code> interface so a missing or misspelled variable is a compile error and values are <code>string</code> instead of <code>any</code>.</p>`, code: `
// src/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SENTRY_DSN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
` },
      { title: 'Overloads in a declaration file', html: `<p>Declaration files often describe JS functions that behave differently depending on arguments. Overloads express that: the caller gets the precise return type for each form. Put the most specific overload first.</p>`, code: `
// jquery-lite.d.ts
declare function $(selector: string): HTMLElement[];
declare function $(ready: () => void): void;
declare function $(el: HTMLElement): { hide(): void; show(): void };

declare namespace $ {
  const version: string;
  function ajax(url: string, opts?: { method?: 'GET' | 'POST' }): Promise<unknown>;
}
` },
      { title: 'Shipping types from your own library', html: `<p>Turn on <code>declaration</code> (and <code>declarationMap</code> for "go to source"). Point package.json at the output with an <code>exports</code> types condition — listed <b>first</b> inside each condition block. <code>isolatedDeclarations</code> (TS 5.5) makes exported signatures explicit so fast tools can emit .d.ts without running the type checker.</p>`, code: { lang: 'json', code: `{
  "name": "@acme/money",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "devDependencies": { "typescript": "^5.6.0" }
}` } }
    ],
    deepDive: `<p>🟣 <b>Ambient context rules.</b> Inside <code>.d.ts</code> files everything is <b>ambient</b>: no initialisers, no function bodies, implicit <code>declare</code> for top-level items in a module file. <code>skipLibCheck: true</code> (very common) skips type-checking <b>all</b> .d.ts files — faster builds, but conflicts and errors inside declaration files go unnoticed; that is why two different <code>@types/react</code> versions can coexist silently and then produce bizarre errors.</p>
<p><b>Resolution details.</b> With <code>moduleResolution: "node16"/"nodenext"/"bundler"</code>, the compiler honours <code>package.json</code> <code>exports</code> and its <code>"types"</code> condition; ESM vs CJS packages may need separate <code>.d.mts</code>/<code>.d.cts</code> files ("masquerading as CJS" problems — check with <code>@arethetypeswrong/cli</code>). <code>typesVersions</code> can redirect old TS versions to older declarations. <code>/// &lt;reference types="vite/client" /&gt;</code> pulls in a package's global declarations without importing it.</p>
<p><b>Declaration emit gotchas.</b> When <code>declaration: true</code>, every exported value's type must be <b>nameable</b> from the outside; otherwise you get <i>TS2742: The inferred type of X cannot be named without a reference to …</i> — fix with an explicit annotation. <code>isolatedDeclarations</code> enforces explicit return types on exports so tools like oxc/swc can generate .d.ts in parallel. Node's built-in type stripping (and the <code>erasableSyntaxOnly</code> flag) rejects enums/namespaces with runtime code — another reason modern code prefers <code>as const</code> objects.</p>
<p><b>Trust boundary.</b> A .d.ts is an unchecked <b>claim</b>. If the declaration says <code>getUser(): User</code> but the JS returns <code>null</code> sometimes, the compiler happily lies. At system boundaries (HTTP, env, JSON) pair declarations with runtime validation (zod/valibot) and derive the static type from the schema (<code>z.infer&lt;typeof Schema&gt;</code>).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> writing a <code>.d.ts</code> for an untyped library used to be hours of reading source. An assistant can draft it from the library's README and source in minutes — and that is exactly the danger: a confident, plausible, <b>unchecked</b> menu.</p>
<p><b>Use AI as a partner:</b> <code>"Here is legacy-charts.js. Draft declarations, mark every signature you are unsure about with a // VERIFY comment, and write a usage test file that exercises each export."</code> Then run the test file against the real library. Ask it to explain TS7016/TS2742 errors and to check your package with <code>@arethetypeswrong/cli</code>.</p>
<p><b>Where AI goes wrong:</b> forgets <code>export {}</code> before <code>declare global</code>, augments with <code>type</code> instead of <code>interface</code>, guesses wrong optionality and nullability, declares a default export for a CommonJS <code>module.exports =</code> library (should be <code>export =</code>), or adds <code>@types</code> for packages that already bundle types. <b>What you must still own:</b> the trust boundary — declarations are promises the compiler cannot verify — plus the packaging setup that makes types reach your consumers.</p>`,
    problems: [{
      title: 'Type an untyped analytics SDK',
      level: 'Medium', tags: ['declaration files', 'ambient modules', 'augmentation'], companies: ['Segment', 'Shopify', 'Atlassian'],
      statement: `<p>Your app uses <code>tiny-analytics</code>, a JS-only package exporting <code>init(key: string, opts?)</code> and <code>track(event, props?)</code>, and it also sets a global <code>window.tinyAnalytics</code>. Write declarations so that: (1) the import type-checks, (2) only events from your <code>EventMap</code> are allowed with the right props, and (3) <code>window.tinyAnalytics</code> is typed.</p>`,
      constraints: `<p>Do not modify the package. Use a <code>.d.ts</code> file inside your project. No <code>any</code> in the public API.</p>`,
      example: `<p><code>track('signup', { plan: 'pro' })</code> → ${H.c('g', 'OK')}. <code>track('signup', { plan: 'gold' })</code> → ${H.c('r', 'error: "gold" not in "free" | "pro"')}. <code>track('typo', {})</code> → ${H.c('r', 'error')}. <code>window.tinyAnalytics?.flush()</code> → ${H.c('g', 'OK')}.</p>`,
      brute: { why: `<p>The shorthand <code>declare module 'tiny-analytics';</code> removes the TS7016 error but makes every export <code>any</code>: wrong event names and wrong props compile, and the global is still untyped. It is a fine 30-second unblock, not a solution.</p>`, code: `
// types/tiny-analytics.d.ts
declare module 'tiny-analytics';   // everything imported from it is now 'any'
` },
      mcq: { q: 'Your <code>globals.d.ts</code> has a top-level <code>import</code> and <code>interface Window { tinyAnalytics: X }</code>, but <code>window.tinyAnalytics</code> is still an error. Why?', options: ['Window cannot be extended', 'The import makes the file a module, so the interface is local; wrap it in <code>declare global { }</code>', 'You must use <code>type Window</code>', 'skipLibCheck hides it'], answer: 1, explain: 'Any top-level import/export makes a file a module. Global augmentation from a module requires declare global.' },
      hints: [`<p>Hint 1: an <b>ambient module</b> <code>declare module 'tiny-analytics' { … }</code> describes the package's exports.</p>`, `<p>Hint 2: make <code>track</code> generic over the event name: <code>track&lt;E extends keyof EventMap&gt;(event: E, props: EventMap[E])</code> — the props follow the name via indexed access.</p>`, `<p>Hint 3: for the global, use <code>declare global { interface Window { tinyAnalytics?: … } }</code> in a module file (<code>export {}</code>). Interfaces merge with lib.dom's Window.</p>`],
      tests: {"types":["type _1 = Expect<Equal<Parameters<typeof import('tiny-analytics').init>, [key: string, opts?: import('tiny-analytics').InitOptions]>>","type _2 = Expect<Equal<keyof import('tiny-analytics').EventMap, 'signup' | 'purchase' | 'logout'>>","type _3 = Expect<Equal<ReturnType<typeof import('tiny-analytics').flush>, Promise<void>>>","type _4 = Expect<Equal<import('tiny-analytics').EventMap['signup'], { plan: 'free' | 'pro' }>>","declare const t5: typeof import('tiny-analytics').track;\nt5('signup', { plan: 'pro' });\nt5('purchase', { orderId: 'o1', amount: 9.5 });","declare const i6: typeof import('tiny-analytics').init;\ni6('key');\ni6('key', { debug: true, flushIntervalMs: 500 });","declare const t7: typeof import('tiny-analytics').track;\n// @ts-expect-error\nt7('signup', { plan: 'gold' });","declare const t8: typeof import('tiny-analytics').track;\n// @ts-expect-error\nt8('typo', {});","declare const t9: typeof import('tiny-analytics').track;\n// @ts-expect-error\nt9('purchase', { orderId: 'o1', amount: '9' });","declare const i10: typeof import('tiny-analytics').init;\n// @ts-expect-error\ni10('key', { bogus: 1 });","declare const i11: typeof import('tiny-analytics').init;\n// @ts-expect-error\ni11();","declare const t12: typeof import('tiny-analytics').track;\n// @ts-expect-error\nt12('signup');"]},
      solution: {
        approach: `<p>Two small project .d.ts files: an ambient module (a script file, no top-level export) for the package's exports (generic, event-map driven <code>track</code>) and, in a separate module file, a global augmentation for <code>window</code>. The event map is an interface so other files can extend it via declaration merging.</p>`,
        code: `
// types/tiny-analytics.d.ts
declare module 'tiny-analytics' {
  // Extend this interface anywhere in the app to add events (interfaces merge)
  export interface EventMap {
    signup: { plan: 'free' | 'pro' };
    purchase: { orderId: string; amount: number };
    logout: Record<string, never>;
  }
  export interface InitOptions {
    debug?: boolean;
    flushIntervalMs?: number;
  }
  export function init(key: string, opts?: InitOptions): void;
  export function track<E extends keyof EventMap>(event: E, props: EventMap[E]): void;
  export function flush(): Promise<void>;
}
`,
        alt: [{ lang: 'ts', title: 'types/tiny-analytics-global.d.ts', code: `
// a separate MODULE file (export {}) that augments the global Window
export {};
declare global {
  interface Window {
    tinyAnalytics?: {
      track: typeof import('tiny-analytics').track;
      flush(): Promise<void>;
    };
  }
}
` }, { lang: 'ts', title: 'Usage (app.ts)', code: `
import { init, track } from 'tiny-analytics';

init('pk_live_123', { debug: true });
track('signup', { plan: 'pro' });
track('purchase', { orderId: 'o-9', amount: 49 });
// @ts-expect-error  "gold" is not a valid plan
track('signup', { plan: 'gold' });
// @ts-expect-error  unknown event name
track('typo', {});
window.tinyAnalytics?.flush();
` }],
        dry: { head: ['call', 'E inferred', 'props must be', 'result'], rows: [
          ["track('signup', { plan: 'pro' })", '"signup"', "{ plan: 'free' | 'pro' }", H.c('g', 'OK')],
          ["track('signup', { plan: 'gold' })", '"signup"', "{ plan: 'free' | 'pro' }", H.c('r', 'error')],
          ["track('typo', {})", H.c('r', 'not in keyof EventMap'), '—', H.c('r', 'error')],
          ['window.tinyAnalytics?.flush()', '—', '—', H.c('g', 'OK (merged Window)')]
        ] },
        complexity: `<p>No runtime cost — declarations emit nothing. Type-check cost is O(1) per call.</p>`,
        followUps: ['How would another package add its own events to <code>EventMap</code>?', 'The SDK is CommonJS with <code>module.exports = fn</code> — how do you declare that (<code>export =</code>)?', 'How would you validate the props at runtime too?']
      }
    }]
  });

  /* ================= PRACTICE (Easy → Medium → Hard) ================= */
  var EQ = `type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
`;

  practice.push({
    title: 'Tuple to Object',
    level: 'Easy', tags: ['mapped types', 'indexed access', 'as const'], companies: ['Microsoft', 'Vercel'],
    statement: `<p>Given a readonly tuple of string literals (from <code>as const</code>), build an object type whose keys and values are each element: <code>['tesla', 'model 3']</code> → <code>{ tesla: 'tesla'; 'model 3': 'model 3' }</code>.</p>`,
    constraints: `<p>Input is <code>readonly (string | number | symbol)[]</code>. Passing a non-tuple (e.g. an array of objects) must be an error.</p>`,
    example: `<p><code>TupleToObject&lt;readonly ['a', 'b']&gt;</code> → ${H.c('g', "{ a: 'a'; b: 'b' }")}. Why: we loop over the <b>values</b> of the tuple (<code>T[number]</code>), not over its indexes.</p>`,
    brute: { why: `<p>Mapping over <code>keyof T</code> loops over the tuple's <b>indexes and methods</b> (<code>"0" | "1" | "length" | "push" …</code>), producing nonsense keys. The values live in <code>T[number]</code>.</p>`, code: `
type WrongTupleToObject<T extends readonly string[]> = { [K in keyof T]: K };
type W = WrongTupleToObject<readonly ['a', 'b']>;   // a tuple of index strings, not an object keyed by 'a' | 'b'
` },
    mcq: { q: 'What is <code>(readonly ["x", "y"])[number]</code>?', options: ['<code>number</code>', '<code>"x" | "y"</code>', '<code>2</code>', '<code>string[]</code>'], answer: 1, explain: 'Indexing a tuple type with number gives the union of all its element types.' },
    hints: [`<p>Hint 1: the keys you want are the tuple's <b>element values</b>, which you get with <code>T[number]</code>.</p>`, `<p>Hint 2: map over that union: <code>{ [V in T[number]]: V }</code> — key and value are the same literal.</p>`, `<p>Hint 3: constrain <code>T extends readonly PropertyKey[]</code> so <code>as const</code> tuples are accepted and objects are rejected (<code>PropertyKey</code> = <code>string | number | symbol</code>).</p>`],
    tests: {"types":["type _0 = Expect<Equal<TupleToObject<readonly [\"tesla\", \"model 3\", \"model X\"]>, { tesla: \"tesla\"; \"model 3\": \"model 3\"; \"model X\": \"model X\" }>>","type _1 = Expect<Equal<TupleToObject<readonly [1, 2]>, { 1: 1; 2: 2 }>>","type _2 = Expect<Equal<TupleToObject<readonly []>, {}>>","type _3 = Expect<Equal<TupleToObject<readonly [\"a\", \"a\"]>, { a: \"a\" }>>","type _4 = Expect<Equal<TupleToObject<typeof cars>, { tesla: \"tesla\"; \"model 3\": \"model 3\"; \"model X\": \"model X\" }>>","type _5 = Expect<Equal<TupleToObject<readonly [\"x\", 5]>, { x: \"x\"; 5: 5 }>>","// @ts-expect-error\ntype B1 = TupleToObject<[[1, 2], {}]>;","// @ts-expect-error\ntype B2 = TupleToObject<[boolean]>;","// @ts-expect-error\nconst o: TupleToObject<readonly [\"a\"]> = { a: \"b\" };"]},
    solution: {
      approach: `<p>Map over the union of element values; each value becomes both the key and the value. Constraining to <code>readonly PropertyKey[]</code> allows readonly tuples and guarantees the elements can be keys.</p>`,
      code: EQ + `
type TupleToObject<T extends readonly PropertyKey[]> = { [V in T[number]]: V };

const cars = ['tesla', 'model 3', 'model X'] as const;
type Cars = TupleToObject<typeof cars>;

type cases = [
  Expect<Equal<Cars, { tesla: 'tesla'; 'model 3': 'model 3'; 'model X': 'model X' }>>,
  Expect<Equal<TupleToObject<readonly [1, 2]>, { 1: 1; 2: 2 }>>
];
// @ts-expect-error  objects cannot be keys
type Bad = TupleToObject<[[1, 2], {}]>;
`,
      dry: { head: ['step', 'value'], rows: [['T', "readonly ['tesla', 'model 3', 'model X']"], ['T[number]', "'tesla' | 'model 3' | 'model X'"], ['mapped', "{ tesla: 'tesla'; 'model 3': 'model 3'; 'model X': 'model X' }"]] },
      complexity: `<p>O(n) properties for an n-element tuple.</p>`,
      followUps: ['Build <code>{ [value]: index }</code> instead (hint: recurse with an accumulator tuple).', 'Turn the same tuple into a union type and a runtime type guard.']
    }
  });

  practice.push({
    title: 'First and Last of a Tuple',
    level: 'Easy', tags: ['infer', 'tuples', 'conditional types'], companies: ['Google', 'Microsoft'],
    statement: `<p>Implement <code>First&lt;T&gt;</code> and <code>Last&lt;T&gt;</code> for tuple types. For an empty tuple both must return <code>never</code>.</p>`,
    constraints: `<p>T extends <code>readonly unknown[]</code>. Do not use <code>T[0]</code> blindly (it gives <code>undefined</code> for <code>[]</code>).</p>`,
    example: `<p><code>First&lt;[3, 2, 1]&gt;</code> → ${H.c('g', '3')}; <code>Last&lt;[3, 2, 1]&gt;</code> → ${H.c('g', '1')}; <code>First&lt;[]&gt;</code> → ${H.c('b', 'never')} because the pattern <code>[infer H, ...unknown[]]</code> needs at least one element.</p>`,
    brute: { why: `<p><code>T[0]</code> works for non-empty tuples but returns <code>undefined</code> for <code>[]</code>, and for a plain array <code>number[]</code> it gives <code>number</code> (no length info). The specification wants <code>never</code> for empty tuples.</p>`, code: `
type FirstNaive<T extends readonly unknown[]> = T[0];
type E = FirstNaive<[]>;   // undefined, not never
` },
    mcq: { q: 'Which pattern matches the LAST element?', options: ['<code>[infer L, ...unknown[]]</code>', '<code>[...unknown[], infer L]</code>', '<code>[infer L]</code>', '<code>(infer L)[]</code>'], answer: 1, explain: 'A rest element may come first in a pattern; the single element after it binds to the last position.' },
    hints: [`<p>Hint 1: tuple patterns can contain one rest element (<code>...</code>) anywhere.</p>`, `<p>Hint 2: First → <code>T extends readonly [infer H, ...unknown[]] ? H : never</code>.</p>`, `<p>Hint 3: Last → put the rest first: <code>readonly [...unknown[], infer L]</code>. Use <code>readonly</code> in the pattern so <code>as const</code> tuples match too.</p>`],
    tests: {"types":["type _0 = Expect<Equal<First<[3, 2, 1]>, 3>>","type _1 = Expect<Equal<Last<[3, 2, 1]>, 1>>","type _2 = Expect<Equal<First<[]>, never>>","type _3 = Expect<Equal<Last<[]>, never>>","type _4 = Expect<Equal<First<[1]>, 1>>","type _5 = Expect<Equal<Last<readonly [\"a\"]>, \"a\">>","type _6 = Expect<Equal<First<[() => 0, { a: string }]>, () => 0>>","type _7 = Expect<Equal<Last<[1, 2, 3, 4, 5]>, 5>>","type _8 = Expect<Equal<First<readonly [string, number]>, string>>","// @ts-expect-error\ntype B = First<number>;","// @ts-expect-error\ntype B2 = Last<{ length: 2 }>;","// @ts-expect-error\nconst x: First<[1, 2]> = 2;"]},
    solution: {
      approach: `<p>Pattern-match with <code>infer</code>; rest elements absorb everything else. Empty tuples fail the pattern and fall to <code>never</code>.</p>`,
      code: EQ + `
type First<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never;
type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;

type cases = [
  Expect<Equal<First<[3, 2, 1]>, 3>>,
  Expect<Equal<Last<[3, 2, 1]>, 1>>,
  Expect<Equal<First<[]>, never>>,
  Expect<Equal<Last<readonly ['a']>, 'a'>>,
  Expect<Equal<First<[() => 0, { a: string }]>, () => 0>>
];
`,
      dry: { head: ['T', 'pattern', 'match?', 'result'], rows: [['[3,2,1]', '[infer H, ...]', 'yes', '3'], ['[3,2,1]', '[..., infer L]', 'yes', '1'], ['[]', '[infer H, ...]', H.c('r', 'no'), 'never']] },
      complexity: `<p>Constant: one pattern match.</p>`,
      followUps: ['Implement <code>Pop&lt;T&gt;</code> (all but last) and <code>Shift&lt;T&gt;</code>.', 'What does First give for <code>string[]</code>? Why?']
    }
  });

  practice.push({
    title: 'Exhaustive Record for a Union',
    level: 'Easy', tags: ['Record', 'keyof typeof', 'satisfies'], companies: ['Stripe', 'Shopify'],
    statement: `<p>Implement <code>MyRecord&lt;K, V&gt;</code>, then use it to map every order status (derived from a runtime array) to a badge color. Adding a new status to the array must cause a compile error until its color is added.</p>`,
    constraints: `<p>No built-in <code>Record</code>. Status list: <code>['pending', 'paid', 'shipped', 'cancelled'] as const</code>.</p>`,
    example: `<p>Removing <code>cancelled</code> from the color object → ${H.c('r', "error: Property 'cancelled' is missing")}. Adding an extra key <code>lost</code> → ${H.c('r', 'error: unknown property')}.</p>`,
    brute: { why: `<p>A plain object typed <code>{ [k: string]: string }</code> accepts missing and extra keys, so a new status silently renders with no color (<code>undefined</code>).</p>`, code: `
const STATUSES = ['pending', 'paid', 'shipped', 'cancelled'] as const;
const colors: { [k: string]: string } = { pending: 'gray', paid: 'green' };   // shipped/cancelled forgotten, no error
` },
    mcq: { q: 'What does <code>{ [P in K]: V }</code> require when K is <code>"a" | "b"</code>?', options: ['Any string keys', 'Exactly the keys "a" and "b" (both required)', 'At least one of "a" or "b"', 'Only numeric keys'], answer: 1, explain: 'A mapped type over a union of literals produces one required property per member.' },
    hints: [`<p>Hint 1: Record is just a mapped type over the key union: <code>{ [P in K]: V }</code>.</p>`, `<p>Hint 2: constrain <code>K extends keyof any</code> (i.e. <code>string | number | symbol</code>) so only valid key types are allowed.</p>`, `<p>Hint 3: derive <code>Status</code> with <code>(typeof STATUSES)[number]</code> and annotate the color object as <code>MyRecord&lt;Status, string&gt;</code> (or use <code>satisfies</code> to keep literal colors).</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  if (k === 'statuses') return STATUSES.slice();\n  if (k === 'badge') return STATUSES.map(function (s) { return badge[s]; });\n  if (k === 'keys') return Object.keys(badge).sort();\n  if (k === 'pending' || k === 'paid' || k === 'shipped' || k === 'cancelled') return badge[k];\n}"},"cases":[[["statuses"],["pending","paid","shipped","cancelled"]],[["badge"],["gray","green","blue","red"]],[["keys"],["cancelled","paid","pending","shipped"]],[["pending"],"gray"],[["paid"],"green"],[["shipped"],"blue"],[["cancelled"],"red"]]},
    solution: {
      approach: `<p>MyRecord maps over the key union. Deriving the union from the runtime array makes the color table exhaustive: missing keys and extra keys are both errors.</p>`,
      code: EQ + `
type MyRecord<K extends keyof any, V> = { [P in K]: V };

const STATUSES = ['pending', 'paid', 'shipped', 'cancelled'] as const;
type Status = (typeof STATUSES)[number];

const badge = {
  pending: 'gray',
  paid: 'green',
  shipped: 'blue',
  cancelled: 'red',
} as const satisfies MyRecord<Status, string>;

type cases = [
  Expect<Equal<MyRecord<'a' | 'b', number>, { a: number; b: number }>>,
  Expect<Equal<(typeof badge)['paid'], 'green'>>
];
for (const s of STATUSES) console.log(s, badge[s]);
`,
      dry: { head: ['K member', 'property produced'], rows: [['pending', 'pending: string'], ['paid', 'paid: string'], ['shipped', 'shipped: string'], ['cancelled', 'cancelled: string']] },
      complexity: `<p>O(|K|) properties: one per member of the key union.</p>`,
      followUps: ['Why does <code>as const satisfies …</code> keep <code>"green"</code> instead of widening to string?', 'What does <code>MyRecord&lt;string, number&gt;</code> become?']
    }
  });

  practice.push({
    title: 'Concat, Push and Unshift on Tuples',
    level: 'Easy', tags: ['tuples', 'variadic tuple types'], companies: ['Microsoft', 'Bloomberg'],
    statement: `<p>Implement <code>Concat&lt;A, B&gt;</code>, <code>Push&lt;T, U&gt;</code> and <code>Unshift&lt;T, U&gt;</code> for tuple types, then type a runtime <code>concat</code> function so that <code>concat([1, 'a'] as const, [true] as const)</code> has the exact tuple type.</p>`,
    constraints: `<p>Inputs may be readonly tuples. Use variadic tuple spreads (TS 4.0+).</p>`,
    example: `<p><code>Concat&lt;[1], [2, 3]&gt;</code> → ${H.c('g', '[1, 2, 3]')}; <code>Push&lt;[1, 2], '3'&gt;</code> → ${H.c('g', "[1, 2, '3']")}; <code>Unshift&lt;[1], 0&gt;</code> → ${H.c('g', '[0, 1]')}.</p>`,
    brute: { why: `<p>Typing concat as <code>(a: unknown[], b: unknown[]) =&gt; unknown[]</code> loses positions and element types; callers need casts to use the result.</p>`, code: `
function concatLoose(a: unknown[], b: unknown[]): unknown[] {
  return [...a, ...b];
}
const r = concatLoose([1, 'a'], [true]);   // unknown[]
` },
    mcq: { q: 'What is <code>[...[1, 2], ...[3]]</code> at the type level?', options: ['<code>number[]</code>', '<code>[1, 2, 3]</code>', '<code>[[1, 2], [3]]</code>', 'an error'], answer: 1, explain: 'Variadic tuple spreads flatten known tuples into a new tuple type, keeping each position.' },
    hints: [`<p>Hint 1: tuple types can spread other tuple types: <code>[...A, ...B]</code>.</p>`, `<p>Hint 2: Push is <code>[...T, U]</code>; Unshift is <code>[U, ...T]</code>.</p>`, `<p>Hint 3: for the function, make it generic with <code>const A extends readonly unknown[]</code> and <code>const B extends readonly unknown[]</code>, returning <code>[...A, ...B]</code>.</p>`],
    tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(aJson, bJson) {\n  if (aJson === 'BIG') { var a = [], b = []; for (var i = 0; i < 100000; i++) { a.push(i); b.push(-i); } var r = concat(a, b); return [r.length, r[0], r[99999], r[100000], r[199999], a.length, b.length]; }\n  if (aJson === 'PURE') { var x = [1, 'a'], y = [true]; concat(x, y); return [x, y]; }\n  return concat(JSON.parse(aJson), JSON.parse(bJson));\n}"},"cases":[[["[1,\"a\"]","[true]"],[1,"a",true]],[["[]","[]"],[]],[["[]","[1]"],[1]],[["[1]","[]"],[1]],[["[[1],[2]]","[[3]]"],[[1],[2],[3]]],[["[null,0]","[\"\",false]"],[null,0,"",false]],[["PURE",""],[[1,"a"],[true]]],[["BIG",""],[200000,0,99999,0,-99999,100000,100000]]]},
    solution: {
      approach: `<p>Variadic tuple types do all the work. A const type parameter on the runtime function keeps literal element types without needing <code>as const</code> at the call site.</p>`,
      code: EQ + `
type Concat<A extends readonly unknown[], B extends readonly unknown[]> = [...A, ...B];
type Push<T extends readonly unknown[], U> = [...T, U];
type Unshift<T extends readonly unknown[], U> = [U, ...T];

function concat<const A extends readonly unknown[], const B extends readonly unknown[]>(a: A, b: B): [...A, ...B] {
  return [...a, ...b];
}
const r = concat([1, 'a'], [true]);   // [1, "a", true]

type cases = [
  Expect<Equal<Concat<[1], [2, 3]>, [1, 2, 3]>>,
  Expect<Equal<Concat<readonly ['a'], []>, ['a']>>,
  Expect<Equal<Push<[1, 2], '3'>, [1, 2, '3']>>,
  Expect<Equal<Unshift<[1], 0>, [0, 1]>>,
  Expect<Equal<typeof r, [1, 'a', true]>>
];
console.log(r);
`,
      dry: { head: ['expression', 'result'], rows: [['Concat<[1],[2,3]>', '[1, 2, 3]'], ['Push<[1,2],"3">', '[1, 2, "3"]'], ['Unshift<[1],0>', '[0, 1]']] },
      complexity: `<p>O(|A| + |B|) tuple elements.</p>`,
      followUps: ['Implement <code>Flatten&lt;T&gt;</code> for nested tuples (recursive).', 'Why does spreading a readonly tuple produce a mutable one?']
    }
  });

  practice.push({
    title: 'PartialBy and RequiredBy',
    level: 'Medium', tags: ['utility types', 'Omit', 'Pick', 'intersection'], companies: ['Atlassian', 'Airbnb', 'Microsoft'],
    statement: `<p>Write <code>PartialBy&lt;T, K&gt;</code> (only keys K become optional) and <code>RequiredBy&lt;T, K&gt;</code> (only keys K become required). The result must <b>display as a single flat object</b> in hovers, not an intersection.</p>`,
    constraints: `<p>K must be real keys of T. Other modifiers unchanged.</p>`,
    example: `<p><code>PartialBy&lt;{ id: string; name: string; age: number }, 'id' | 'age'&gt;</code> → ${H.c('g', '{ name: string; id?: string; age?: number }')}.</p>`,
    brute: { why: `<p>Writing a second interface with the chosen fields optional duplicates the model. <code>Partial&lt;T&gt;</code> alone makes <b>everything</b> optional, so required fields lose their protection.</p>`, code: `
interface User { id: string; name: string; age: number }
type NewUserTooLoose = Partial<User>;   // name is optional too — wrong
const u: NewUserTooLoose = {};          // compiles, but name was required
` },
    mcq: { q: 'Why wrap the result in <code>{ [P in keyof X]: X[P] }</code> (Prettify)?', options: ['To make it faster at runtime', 'To flatten the intersection so hovers and Equal-based tests see one object type', 'To remove optional modifiers', 'It is required by Omit'], answer: 1, explain: 'An intersection A & B is a different type identity from the equivalent flat object; a homomorphic re-mapping produces the flat object.' },
    hints: [`<p>Hint 1: split T into two parts: the keys you change (<code>Pick&lt;T, K&gt;</code>) and the rest (<code>Omit&lt;T, K&gt;</code>).</p>`, `<p>Hint 2: apply <code>Partial</code> (or <code>Required</code>) only to the picked part and intersect the two parts.</p>`, `<p>Hint 3: flatten with a mapped type: <code>type Prettify&lt;X&gt; = { [P in keyof X]: X[P] }</code>, so the result is one object type.</p>`],
    tests: {"types":["type _0 = Expect<Equal<PartialBy<User, \"id\" | \"age\">, { name: string; nick?: string; id?: string; age?: number }>>","type _1 = Expect<Equal<RequiredBy<User, \"nick\">, { id: string; name: string; age: number; nick: string }>>","type _2 = Expect<Equal<PartialBy<User, never>, { id: string; name: string; age: number; nick?: string }>>","type _3 = Expect<Equal<RequiredBy<User, never>, { id: string; name: string; age: number; nick?: string }>>","type _4 = Expect<Equal<PartialBy<User, \"id\" | \"name\" | \"age\" | \"nick\">, { id?: string; name?: string; age?: number; nick?: string }>>","type _5 = Expect<Equal<PartialBy<User, \"nick\">, { id: string; name: string; age: number; nick?: string }>>","// @ts-expect-error\ntype B = PartialBy<User, \"zzz\">;","// @ts-expect-error\nconst r: RequiredBy<User, \"nick\"> = { id: \"\", name: \"\", age: 1 };","// @ts-expect-error\nconst p: PartialBy<User, \"id\"> = { age: 1 };","// @ts-expect-error\nconst e: PartialBy<User, \"id\"> = { name: \"a\", age: 1, id: 5 };"]},
    solution: {
      approach: `<p>Divide-and-recombine: <code>Omit&lt;T, K&gt; &amp; Partial&lt;Pick&lt;T, K&gt;&gt;</code>, flattened by a homomorphic mapped type.</p>`,
      code: EQ + `
type Prettify<X> = { [P in keyof X]: X[P] } & {};
type PartialBy<T, K extends keyof T> = Prettify<Omit<T, K> & Partial<Pick<T, K>>>;
type RequiredBy<T, K extends keyof T> = Prettify<Omit<T, K> & Required<Pick<T, K>>>;

interface User { id: string; name: string; age: number; nick?: string }

type cases = [
  Expect<Equal<PartialBy<User, 'id' | 'age'>, { name: string; nick?: string; id?: string; age?: number }>>,
  Expect<Equal<RequiredBy<User, 'nick'>, { id: string; name: string; age: number; nick: string }>>
];
const draft: PartialBy<User, 'id'> = { name: 'Asha', age: 31 };
`,
      dry: { head: ['part', 'type'], rows: [['Omit&lt;User, "id"|"age"&gt;', '{ name; nick? }'], ['Partial&lt;Pick&lt;User, "id"|"age"&gt;&gt;', '{ id?; age? }'], ['Prettify(both)', '{ name; nick?; id?; age? }']] },
      complexity: `<p>O(keys of T) for the split, intersect and flatten steps.</p>`,
      followUps: ['Make a version that works on discriminated unions (distributive).', 'Write <code>ReadonlyBy&lt;T, K&gt;</code>.']
    }
  });

  practice.push({
    title: 'PickByType and OmitByType',
    level: 'Medium', tags: ['mapped types', 'key remapping', 'conditional types'], companies: ['Meta', 'Uber'],
    statement: `<p>Implement <code>PickByType&lt;T, U&gt;</code> (keep properties whose value type is assignable to U) and <code>OmitByType&lt;T, U&gt;</code> (drop them). Use them to derive a "serialisable fields" type from a class-like interface that also has methods.</p>`,
    constraints: `<p>Preserve optional and readonly modifiers of the kept keys.</p>`,
    example: `<p><code>PickByType&lt;{ a: string; b: number; c: string }, string&gt;</code> → ${H.c('g', '{ a: string; c: string }')}. <code>OmitByType&lt;Model, Function&gt;</code> → only data fields.</p>`,
    brute: { why: `<p>Listing the keys by hand in <code>Pick&lt;Model, 'id' | 'name' | …&gt;</code> breaks when fields are added; methods sneak into JSON types and serialisation code tries to send functions.</p>`, code: `
interface Model { id: number; name: string; save(): void }
type Data = Pick<Model, 'id' | 'name'>;   // must be updated by hand for every new field
` },
    mcq: { q: 'In a mapped type, what happens to a key remapped to <code>never</code> via <code>as</code>?', options: ['It becomes a property of type never', 'It is removed from the result', 'It causes an error', 'It becomes optional'], answer: 1, explain: 'Key remapping to never filters the key out entirely.' },
    hints: [`<p>Hint 1: loop with <code>[K in keyof T as …]</code> — the <code>as</code> clause decides each key's fate.</p>`, `<p>Hint 2: <code>T[K] extends U ? K : never</code> keeps matching keys; swap the branches for Omit.</p>`, `<p>Hint 3: mapping over <code>keyof T</code> with <code>as</code> still preserves modifiers. Beware: <code>T[K]</code> for an optional key includes <code>undefined</code>, so <code>string | undefined extends string</code> is false (use <code>NonNullable&lt;T[K]&gt;</code> if you want optional strings counted).</p>`],
    tests: {"types":["type _0 = Expect<Equal<PickByType<{ a: string; b: number; c: string }, string>, { a: string; c: string }>>","type _1 = Expect<Equal<OmitByType<{ a: string; b: number; c: string }, string>, { b: number }>>","type _2 = Expect<Equal<Serializable, { readonly id: number; name: string; tags: string[] }>>","type _3 = Expect<Equal<PickByType<Model, number>, { readonly id: number }>>","type _4 = Expect<Equal<PickByType<Model, boolean>, {}>>","type _5 = Expect<Equal<OmitByType<{ a: 1 }, number>, {}>>","type _6 = Expect<Equal<PickByType<{ a?: string; b: number }, string | undefined>, { a?: string }>>","type _7 = Expect<Equal<PickByType<Model, Function>, { save(): Promise<void>; toJSON(): string }>>","// @ts-expect-error\nconst s: Serializable = { id: 1, name: \"n\", tags: [], save() {} };","// @ts-expect-error\nconst t: PickByType<{ a: string; b: number }, string> = { a: \"x\", b: 1 };","// @ts-expect-error\nconst r: Serializable = { id: 1, name: \"n\", tags: [] }; r.id = 2;"]},
    solution: {
      approach: `<p>Key remapping with a conditional: matching keys map to themselves, others to <code>never</code> (removed).</p>`,
      code: EQ + `
type PickByType<T, U> = { [K in keyof T as T[K] extends U ? K : never]: T[K] };
type OmitByType<T, U> = { [K in keyof T as T[K] extends U ? never : K]: T[K] };

interface Model {
  readonly id: number;
  name: string;
  tags: string[];
  save(): Promise<void>;
  toJSON(): string;
}
type Serializable = OmitByType<Model, Function>;

type cases = [
  Expect<Equal<PickByType<{ a: string; b: number; c: string }, string>, { a: string; c: string }>>,
  Expect<Equal<Serializable, { readonly id: number; name: string; tags: string[] }>>,
  Expect<Equal<PickByType<Model, number>, { readonly id: number }>>
];
`,
      dry: { head: ['K', 'T[K]', 'extends Function?', 'OmitByType keeps?'], rows: [['id', 'number', 'no', 'yes'], ['name', 'string', 'no', 'yes'], ['save', '() =&gt; Promise&lt;void&gt;', 'yes', H.c('r', 'no')], ['toJSON', '() =&gt; string', 'yes', H.c('r', 'no')]] },
      complexity: `<p>O(keys) assignability checks.</p>`,
      followUps: ['Return only the key union (<code>KeysByType&lt;T, U&gt;</code>).', 'How do optional properties interact with the check?']
    }
  });

  practice.push({
    title: 'Trim and KebabCase String Types',
    level: 'Medium', tags: ['template literal types', 'infer', 'recursion'], companies: ['Vercel', 'Netlify'],
    statement: `<p>Implement <code>Trim&lt;S&gt;</code> (remove spaces, tabs and newlines from both ends) and <code>KebabCase&lt;S&gt;</code> (<code>"FooBarBaz"</code> → <code>"foo-bar-baz"</code>) as type-level string transforms.</p>`,
    constraints: `<p>Recursive conditional types; no runtime code required. Inputs up to ~100 characters.</p>`,
    example: `<p><code>Trim&lt;'  hi \\n'&gt;</code> → ${H.c('g', '"hi"')}; <code>KebabCase&lt;'FooBarBaz'&gt;</code> → ${H.c('g', '"foo-bar-baz"')}; <code>KebabCase&lt;'already-kebab'&gt;</code> → ${H.c('g', 'unchanged')}.</p>`,
    brute: { why: `<p>Typing the transform result as plain <code>string</code> loses the literal, so keys produced by kebab-casing (e.g. CSS custom properties) can no longer be checked or autocompleted.</p>`, code: `
function kebab(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
const k = kebab('FooBar');   // string — the literal "foo-bar" is lost
` },
    mcq: { q: 'In <code>S extends `&#36;{infer F}&#36;{infer R}`</code> with S = "Hello", what is F?', options: ['<code>"Hello"</code>', '<code>"H"</code>', '<code>""</code>', '<code>"Hell"</code>'], answer: 1, explain: 'With two adjacent infer placeholders, the first takes exactly one character and the second takes the rest.' },
    hints: [`<p>Hint 1: Trim = TrimLeft of TrimRight; each side peels <b>one</b> whitespace char per recursion step.</p>`, `<p>Hint 2: KebabCase walks one character at a time with <code>&#36;{infer F}&#36;{infer R}</code>. If the <b>next</b> character R's first letter is uppercase (<code>Uncapitalize&lt;R&gt;</code> differs from R), insert a <code>-</code>.</p>`, `<p>Hint 3: lower-case the first char with <code>Uncapitalize&lt;F&gt;</code>; stop when the string is empty. Watch out for non-letters: <code>Uncapitalize&lt;"-"&gt;</code> equals "-", so dashes are left alone.</p>`],
    tests: {"types":["type _0 = Expect<Equal<Trim<\"  hi \\n\">, \"hi\">>","type _1 = Expect<Equal<Trim<\"x\">, \"x\">>","type _2 = Expect<Equal<Trim<\"\">, \"\">>","type _3 = Expect<Equal<Trim<\"   \">, \"\">>","type _4 = Expect<Equal<Trim<\"\\ta b\\n\">, \"a b\">>","type _5 = Expect<Equal<Trim<\"  x\">, \"x\">>","type _6 = Expect<Equal<Trim<\"x  \">, \"x\">>","type _7 = Expect<Equal<KebabCase<\"FooBarBaz\">, \"foo-bar-baz\">>","type _8 = Expect<Equal<KebabCase<\"fooBar\">, \"foo-bar\">>","type _9 = Expect<Equal<KebabCase<\"already-kebab\">, \"already-kebab\">>","type _10 = Expect<Equal<KebabCase<\"\">, \"\">>","type _11 = Expect<Equal<KebabCase<\"A\">, \"a\">>","type _12 = Expect<Equal<KebabCase<\"aB\">, \"a-b\">>","// @ts-expect-error\ntype B = Trim<5>;","// @ts-expect-error\ntype B2 = KebabCase<string[]>;","// @ts-expect-error\nconst t: Trim<\" a \"> = \" a \";"]},
    solution: {
      approach: `<p>Character-by-character recursion with template literal inference. KebabCase lowers each char and decides whether to insert a dash by checking whether the rest starts with a capital letter.</p>`,
      code: EQ + `
type Space = ' ' | '\\n' | '\\t';
type TrimLeft<S extends string> = S extends \`\${Space}\${infer R}\` ? TrimLeft<R> : S;
type TrimRight<S extends string> = S extends \`\${infer L}\${Space}\` ? TrimRight<L> : S;
type Trim<S extends string> = TrimLeft<TrimRight<S>>;

type KebabCase<S extends string> =
  S extends \`\${infer F}\${infer R}\`
    ? R extends Uncapitalize<R>
      ? \`\${Uncapitalize<F>}\${KebabCase<R>}\`
      : \`\${Uncapitalize<F>}-\${KebabCase<R>}\`
    : S;

type cases = [
  Expect<Equal<Trim<'  hi \\n'>, 'hi'>>,
  Expect<Equal<Trim<'x'>, 'x'>>,
  Expect<Equal<KebabCase<'FooBarBaz'>, 'foo-bar-baz'>>,
  Expect<Equal<KebabCase<'fooBar'>, 'foo-bar'>>,
  Expect<Equal<KebabCase<'already-kebab'>, 'already-kebab'>>,
  Expect<Equal<KebabCase<''>, ''>>
];
`,
      dry: { head: ['S', 'F', 'R starts uppercase?', 'emits'], rows: [['FooBar', 'F', 'no (ooBar)', 'f'], ['ooBar', 'o', 'no', 'o'], ['oBar', 'o', H.c('g', 'yes (Bar)'), 'o-'], ['Bar', 'B', 'no', 'b'], ['ar', 'a', 'no', 'a'], ['r', 'r', 'no ("" )', 'r']] },
      complexity: `<p>O(length) recursive instantiations; non-tail recursion, so very long strings (≈1000 chars) can hit depth limits.</p>`,
      followUps: ['Write <code>CamelCase</code> (kebab → camel).', 'Make KebabCase tail-recursive with an accumulator.']
    }
  });

  practice.push({
    title: 'Typed Event Emitter',
    level: 'Medium', tags: ['generics', 'keyof', 'indexed access', 'classes'], companies: ['Microsoft', 'Discord', 'Slack'],
    statement: `<p>Build a class <code>Emitter&lt;Events&gt;</code> where <code>Events</code> maps event names to payload types. <code>on(name, handler)</code> must type the handler's argument from the event name; <code>emit(name, payload)</code> must reject wrong payloads; <code>on</code> returns an unsubscribe function.</p>`,
    constraints: `<p>No <code>any</code> in the public API. Events with <code>void</code> payload may be emitted without a payload argument.</p>`,
    example: `<p>With <code>{ login: { userId: string }; logout: void }</code>: <code>emit('login', { userId: 'u1' })</code> → ${H.c('g', 'OK')}; <code>emit('login', { id: 1 })</code> → ${H.c('r', 'error')}; <code>emit('logout')</code> → ${H.c('g', 'OK')}.</p>`,
    brute: { why: `<p>A string-keyed emitter (<code>on(event: string, cb: (data: any) =&gt; void)</code>) compiles every typo and every wrong payload. Bugs surface only at runtime, often as silently ignored events.</p>`, code: `
class LooseEmitter {
  private handlers: Record<string, ((data: any) => void)[]> = {};
  on(event: string, cb: (data: any) => void) { (this.handlers[event] ??= []).push(cb); }
  emit(event: string, data?: any) { (this.handlers[event] ?? []).forEach((h) => h(data)); }
}
new LooseEmitter().emit('logni', 42);   // typo + wrong payload: compiles fine
` },
    mcq: { q: 'Which signature makes the payload depend on the event name?', options: ['<code>emit(name: string, payload: unknown)</code>', '<code>emit&lt;K extends keyof E&gt;(name: K, payload: E[K])</code>', '<code>emit(name: keyof E, payload: E[keyof E])</code>', '<code>emit&lt;K&gt;(name: K, payload: K)</code>'], answer: 1, explain: 'A generic K captures the specific name, and E[K] looks up exactly that payload. E[keyof E] would accept any payload for any name.' },
    hints: [`<p>Hint 1: the key generic pattern again: <code>&lt;K extends keyof Events&gt;</code> and payload type <code>Events[K]</code>.</p>`, `<p>Hint 2: store handlers as <code>{ [K in keyof Events]?: Array&lt;(p: Events[K]) =&gt; void&gt; }</code> — a mapped type keeps each list correctly typed.</p>`, `<p>Hint 3: for optional payloads use a rest tuple: <code>...args: Events[K] extends void ? [] : [payload: Events[K]]</code>. Return <code>() =&gt; void</code> from <code>on</code> that filters the handler out.</p>`],
    tests: {"sig":"string -> string","fn":"chk","harness":{"js":"\nfunction chk(k) {\n  var bus = new Emitter(), log = [];\n  if (k === 'login') { bus.on('login', function (p) { log.push(p.userId); }); bus.emit('login', { userId: 'u1' }); return log; }\n  if (k === 'void') { bus.on('logout', function (p) { log.push(p === undefined ? 'undef' : 'other'); }); bus.emit('logout'); return log; }\n  if (k === 'unsub') { var off = bus.on('cart', function (p) { log.push(p.items); }); bus.emit('cart', { items: 1 }); off(); bus.emit('cart', { items: 2 }); return log; }\n  if (k === 'multi') { bus.on('cart', function (p) { log.push('a' + p.items); }); bus.on('cart', function (p) { log.push('b' + p.items); }); bus.emit('cart', { items: 3 }); return log; }\n  if (k === 'none') { bus.emit('cart', { items: 1 }); bus.emit('logout'); return 'ok'; }\n  if (k === 'separate') { bus.on('login', function () { log.push('login'); }); bus.on('cart', function () { log.push('cart'); }); bus.emit('cart', { items: 0 }); return log; }\n  if (k === 'unsubOne') { var o1 = bus.on('cart', function () { log.push('first'); }); bus.on('cart', function () { log.push('second'); }); o1(); bus.emit('cart', { items: 0 }); return log; }\n  if (k === 'many') { var n = 0; for (var i = 0; i < 10000; i++) bus.on('cart', function () { n++; }); bus.emit('cart', { items: 1 }); bus.emit('cart', { items: 1 }); return n; }\n}"},"cases":[[["login"],["u1"]],[["void"],["undef"]],[["unsub"],[1]],[["multi"],["a3","b3"]],[["none"],"ok"],[["separate"],["cart"]],[["unsubOne"],["second"]],[["many"],20000]]},
    solution: {
      approach: `<p>Generic class over an event map; every method is generic in the event name K and uses <code>Events[K]</code>. A conditional rest-tuple makes the payload argument disappear for <code>void</code> events.</p>`,
      code: `
type Handler<P> = (payload: P) => void;
type Args<P> = [P] extends [void] ? [] : [payload: P];

class Emitter<Events extends Record<string, unknown>> {
  private handlers: { [K in keyof Events]?: Handler<Events[K]>[] } = {};

  on<K extends keyof Events>(name: K, handler: Handler<Events[K]>): () => void {
    const list = (this.handlers[name] ??= []);
    list.push(handler);
    return () => {
      this.handlers[name] = list.filter((h) => h !== handler);
    };
  }

  emit<K extends keyof Events>(name: K, ...args: Args<Events[K]>): void {
    const payload = (args as unknown[])[0] as Events[K];
    for (const h of this.handlers[name] ?? []) h(payload);
  }
}

type AppEvents = {
  login: { userId: string };
  cart: { items: number };
  logout: void;
};
const bus = new Emitter<AppEvents>();
const off = bus.on('login', (p) => console.log('hello', p.userId));
bus.emit('login', { userId: 'u1' });
bus.emit('logout');
// @ts-expect-error  wrong payload shape
bus.emit('cart', { count: 2 });
// @ts-expect-error  unknown event name
bus.emit('logni', { userId: 'u1' });
off();
`,
      dry: { head: ['call', 'K', 'Args<Events[K]>', 'ok?'], rows: [["emit('login', {userId})", '"login"', '[payload: { userId: string }]', H.c('g', 'yes')], ["emit('logout')", '"logout"', '[]', H.c('g', 'yes')], ["emit('cart', {count})", '"cart"', '[payload: { items: number }]', H.c('r', 'error')]] },
      complexity: `<p>on: O(1); emit: O(handlers for that event); unsubscribe: O(handlers).</p>`,
      followUps: ['Add <code>once</code>.', 'Why is <code>[P] extends [void]</code> wrapped in brackets?', 'Type a wildcard <code>onAny</code> handler receiving a discriminated union of all events.']
    }
  });

  practice.push({
    title: 'Includes with Exact Equality',
    level: 'Medium', tags: ['recursion', 'Equal', 'tuples'], companies: ['Google', 'Microsoft'],
    statement: `<p>Implement <code>Includes&lt;T, U&gt;</code> that returns <code>true</code> if tuple T contains a type <b>exactly equal</b> to U. <code>Includes&lt;[boolean], false&gt;</code> must be <code>false</code>, and <code>Includes&lt;[{ a: 'A' }], { readonly a: 'A' }&gt;</code> must be <code>false</code>.</p>`,
    constraints: `<p>Use an exact <code>Equal</code> helper, not <code>extends</code>.</p>`,
    example: `<p><code>Includes&lt;['Kars', 'Esidisi'], 'Kars'&gt;</code> → ${H.c('g', 'true')}; <code>Includes&lt;[1, 2], 1 | 2&gt;</code> → ${H.c('r', 'false')} (no element equals the union); <code>Includes&lt;[boolean], false&gt;</code> → ${H.c('r', 'false')}.</p>`,
    brute: { why: `<p><code>U extends T[number] ? true : false</code> uses <b>assignability</b>: <code>false</code> is assignable to <code>boolean</code>, so <code>Includes&lt;[boolean], false&gt;</code> wrongly returns true; readonly differences are ignored too.</p>`, code: `
type IncludesLoose<T extends readonly unknown[], U> = U extends T[number] ? true : false;
type Wrong = IncludesLoose<[boolean], false>;   // true — but false is not an element
` },
    mcq: { q: 'Why does the Equal helper use <code>&lt;G&gt;() =&gt; G extends X ? 1 : 2</code>?', options: ['It is faster', 'The compiler compares these deferred conditional types by an internal identity check, which distinguishes readonly, any and unions that mutual assignability treats as equal', 'It converts types to strings', 'It avoids distribution only'], answer: 1, explain: 'Two such generic functions are only assignable if X and Y are "identical" by the checker\'s strict relation.' },
    hints: [`<p>Hint 1: walk the tuple with <code>[infer H, ...infer R]</code>.</p>`, `<p>Hint 2: at each step, test <code>Equal&lt;H, U&gt;</code>; true → return true; else recurse on R.</p>`, `<p>Hint 3: empty tuple → <code>false</code>. Do not distribute over U (U is not checked as a naked parameter here, Equal wraps it).</p>`],
    tests: {"types":["type _0 = Expect<Equal<Includes<[\"Kars\", \"Esidisi\"], \"Kars\">, true>>","type _1 = Expect<Equal<Includes<[1, 2], 1 | 2>, false>>","type _2 = Expect<Equal<Includes<[boolean], false>, false>>","type _3 = Expect<Equal<Includes<[{ a: \"A\" }], { readonly a: \"A\" }>, false>>","type _4 = Expect<Equal<Includes<[null], undefined>, false>>","type _5 = Expect<Equal<Includes<[], 1>, false>>","type _6 = Expect<Equal<Includes<[1, 2, 3], 3>, true>>","type _7 = Expect<Equal<Includes<[any], unknown>, false>>","type _8 = Expect<Equal<Includes<[unknown], any>, false>>","type _9 = Expect<Equal<Includes<[never], never>, true>>","type _10 = Expect<Equal<Includes<[string], \"a\">, false>>","type _11 = Expect<Equal<Includes<readonly [1, \"a\"], \"a\">, true>>","type _12 = Expect<Equal<TupleToUnion<[1, \"a\", true]>, 1 | \"a\" | true>>","// @ts-expect-error\ntype B = Includes<number, 1>;","// @ts-expect-error\nconst t: Includes<[1], 1> = false;"]},
    solution: {
      approach: `<p>Recursive tuple walk with the strict identity-based Equal check at each element.</p>`,
      code: EQ + `
type Includes<T extends readonly unknown[], U> =
  T extends readonly [infer H, ...infer R]
    ? Equal<H, U> extends true ? true : Includes<R, U>
    : false;

type TupleToUnion<T extends readonly unknown[]> = T[number];

type cases = [
  Expect<Equal<Includes<['Kars', 'Esidisi'], 'Kars'>, true>>,
  Expect<Equal<Includes<[1, 2], 1 | 2>, false>>,
  Expect<Equal<Includes<[boolean], false>, false>>,
  Expect<Equal<Includes<[{ a: 'A' }], { readonly a: 'A' }>, false>>,
  Expect<Equal<Includes<[null], undefined>, false>>,
  Expect<Equal<TupleToUnion<[1, 'a', true]>, 1 | 'a' | true>>
];
`,
      dry: { head: ['H', 'U', 'Equal?', 'next'], rows: [['boolean', 'false', 'no', 'recurse on []'], ['(empty)', '—', '—', 'false']] },
      complexity: `<p>O(n) recursive steps for an n-tuple.</p>`,
      followUps: ['Implement <code>Unique&lt;T&gt;</code> removing duplicates (by Equal).', 'Implement <code>IndexOf&lt;T, U&gt;</code>.']
    }
  });

  practice.push({
    title: 'UnionToIntersection',
    level: 'Hard', tags: ['infer', 'variance', 'distribution'], companies: ['Microsoft', 'Bloomberg'],
    statement: `<p>Implement <code>UnionToIntersection&lt;U&gt;</code>: <code>{ a: 1 } | { b: 2 }</code> → <code>{ a: 1 } &amp; { b: 2 }</code>. Then use it to merge a union of plugin config types into one config object type.</p>`,
    constraints: `<p>No hard-coded members. Explain why it works.</p>`,
    example: `<p><code>UnionToIntersection&lt;{ a: 1 } | { b: 2 }&gt;</code> → ${H.c('g', '{ a: 1 } &amp; { b: 2 }')}; <code>UnionToIntersection&lt;'x' | 'y'&gt;</code> → ${H.c('b', 'never')} (no string is both).</p>`,
    brute: { why: `<p>Mapping over the union with a conditional just distributes and gives back a union; there is no "fold" operator in TS. Writing the intersection by hand defeats the purpose when plugins are added dynamically.</p>`, code: `
type Same<U> = U extends any ? U : never;   // distributes and returns the union unchanged
type Still = Same<{ a: 1 } | { b: 2 }>;     // { a: 1 } | { b: 2 }
` },
    mcq: { q: 'When the same <code>infer I</code> appears in several <b>parameter</b> (contravariant) positions, the candidates are combined as…', options: ['a union', 'an intersection', 'the first one', 'never'], answer: 1, explain: 'Contravariant inference candidates are intersected (a function accepting all of them must accept their intersection).' },
    hints: [`<p>Hint 1: first distribute U into a union of <b>functions</b>: <code>U extends any ? (x: U) =&gt; void : never</code>.</p>`, `<p>Hint 2: then infer the parameter of that union of functions: <code>… extends (x: infer I) =&gt; void ? I : never</code>.</p>`, `<p>Hint 3: parameter positions are contravariant, so TS intersects the candidates — exactly the fold you need.</p>`],
    tests: {"types":["type _0 = Expect<Equal<UnionToIntersection<{ a: 1 } | { b: 2 }>, { a: 1 } & { b: 2 }>>","type _1 = Expect<Equal<UnionToIntersection<\"x\" | \"y\">, never>>","type _2 = Expect<Equal<UnionToIntersection<{ a: 1 }>, { a: 1 }>>","type _3 = Expect<Equal<UnionToIntersection<never>, unknown>>","type _4 = Expect<Equal<UnionToIntersection<(() => 1) | (() => 2)>, (() => 1) & (() => 2)>>","type _5 = Expect<Equal<keyof FullConfig, \"auth\" | \"cache\" | \"logging\">>","type _6 = Expect<Equal<FullConfig[\"cache\"][\"ttlSeconds\"], number>>","// @ts-expect-error\nconst c: FullConfig = { auth: { provider: \"github\" } };","// @ts-expect-error\nconst c2: FullConfig = { auth: { provider: \"x\" }, cache: { ttlSeconds: 1 }, logging: { level: \"info\" } };","// @ts-expect-error\nconst u: UnionToIntersection<{ a: 1 } | { b: 2 }> = { a: 1 };"]},
    solution: {
      approach: `<p>Turn each member into a function parameter (distribution), then infer a single parameter type from the union of functions. Contravariant inference produces the intersection.</p>`,
      code: EQ + `
type UnionToIntersection<U> =
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

type PluginConfigs =
  | { auth: { provider: 'github' | 'google' } }
  | { cache: { ttlSeconds: number } }
  | { logging: { level: 'info' | 'debug' } };

type FullConfig = UnionToIntersection<PluginConfigs>;
const config: FullConfig = {
  auth: { provider: 'github' },
  cache: { ttlSeconds: 60 },
  logging: { level: 'info' },
};

type cases = [
  Expect<Equal<UnionToIntersection<{ a: 1 } | { b: 2 }>, { a: 1 } & { b: 2 }>>,
  Expect<Equal<UnionToIntersection<'x' | 'y'>, never>>
];
console.log(Object.keys(config));
`,
      dry: { head: ['step', 'type'], rows: [['U', '{a:1} | {b:2}'], ['distribute into functions', '((x:{a:1})=&gt;void) | ((x:{b:2})=&gt;void)'], ['infer I (contravariant)', '{a:1} &amp; {b:2}']] },
      complexity: `<p>O(|U|) to build the function union; one inference.</p>`,
      followUps: ['Use it to implement <code>LastOfUnion&lt;U&gt;</code> and then <code>UnionToTuple&lt;U&gt;</code>.', 'Why is the order of a union not guaranteed?']
    }
  });

  practice.push({
    title: 'Type-safe Deep get(obj, "a.b.c")',
    level: 'Hard', tags: ['template literal types', 'recursion', 'indexed access'], companies: ['Airbnb', 'Atlassian', 'Meta'],
    statement: `<p>Implement <code>Paths&lt;T&gt;</code> (all dotted paths through nested objects) and <code>PathValue&lt;T, P&gt;</code>, and type a runtime <code>get(obj, path)</code> so that the path autocompletes, typos are errors, and the return type is exact.</p>`,
    constraints: `<p>Arrays may be treated as leaves. Depth up to ~5 levels. No <code>any</code> in the signature.</p>`,
    example: `<p>For <code>{ user: { address: { city: string } } }</code>: <code>get(o, 'user.address.city')</code> → typed ${H.c('g', 'string')}; <code>get(o, 'user.adress')</code> → ${H.c('r', 'error')}.</p>`,
    brute: { why: `<p>lodash-style <code>get(obj: object, path: string): any</code> accepts every typo and returns <code>any</code>, which then spreads through the code base and disables checking downstream.</p>`, code: `
function getLoose(obj: object, path: string): any {
  return path.split('.').reduce((o: any, k) => o?.[k], obj);
}
const city = getLoose({ user: {} }, 'user.adress.city');   // any, typo unnoticed
` },
    mcq: { q: 'Why add <code>&amp; string</code> in <code>keyof T &amp; string</code> when building paths?', options: ['For speed', 'keyof can include number and symbol keys; template literal holes and dotted paths need string keys', 'To make keys optional', 'To avoid distribution'], answer: 1, explain: 'Symbol keys cannot appear in a template literal type; intersecting with string filters them out.' },
    hints: [`<p>Hint 1: Paths = for each string key K: if T[K] is a (non-array) object, <code>K | \`&#36;{K}.&#36;{Paths&lt;T[K]&gt;}\`</code>, else just K; collect with <code>[keyof T &amp; string]</code>.</p>`, `<p>Hint 2: PathValue splits P at the first dot with <code>\`&#36;{infer Head}.&#36;{infer Rest}\`</code> and recurses into <code>T[Head]</code>.</p>`, `<p>Hint 3: the function is generic: <code>get&lt;T, P extends Paths&lt;T&gt;&gt;(obj: T, path: P): PathValue&lt;T, P&gt;</code>. The runtime is a reduce; one internal cast is unavoidable.</p>`],
    tests: {"sig":"string string -> string","fn":"chk","harness":{"js":"\nfunction chk(json, path) { return get(JSON.parse(json), path); }"},"cases":[[["{\"user\":{\"name\":\"Asha\",\"address\":{\"city\":\"Pune\",\"zip\":411001}},\"tags\":[\"a\"]}","user.address.city"],"Pune"],[["{\"user\":{\"name\":\"Asha\",\"address\":{\"city\":\"Pune\",\"zip\":411001}},\"tags\":[\"a\"]}","user.address.zip"],411001],[["{\"user\":{\"name\":\"Asha\",\"address\":{\"city\":\"Pune\",\"zip\":411001}},\"tags\":[\"a\"]}","user.name"],"Asha"],[["{\"user\":{\"name\":\"Asha\",\"address\":{\"city\":\"Pune\",\"zip\":411001}},\"tags\":[\"a\"]}","tags"],["a"]],[["{\"user\":{\"name\":\"Asha\",\"address\":{\"city\":\"Pune\",\"zip\":411001}},\"tags\":[\"a\"]}","user.address"],{"city":"Pune","zip":411001}],[["{\"a\":{\"b\":{\"c\":{\"d\":{\"e\":0}}}}}","a.b.c.d.e"],0],[["{\"a\":{\"b\":{\"c\":{\"d\":{\"e\":0}}}}}","a.b.c"],{"d":{"e":0}}],[["{\"x\":false}","x"],false],[["{\"x\":null}","x"],null]]},
    solution: {
      approach: `<p>Two recursive types: one that <b>generates</b> all valid paths (a distributive mapped type indexed by its keys), one that <b>consumes</b> a path by splitting on the first dot. The function ties them together through a constrained generic.</p>`,
      code: EQ + `
type Paths<T> = T extends readonly unknown[]
  ? never
  : T extends object
    ? { [K in keyof T & string]: T[K] extends readonly unknown[] ? K : T[K] extends object ? K | \`\${K}.\${Paths<T[K]> & string}\` : K }[keyof T & string]
    : never;

type PathValue<T, P extends string> =
  P extends \`\${infer Head}.\${infer Rest}\`
    ? Head extends keyof T ? PathValue<T[Head], Rest> : never
    : P extends keyof T ? T[P] : never;

function get<T, P extends Paths<T>>(obj: T, path: P): PathValue<T, P> {
  let cur: unknown = obj;
  for (const key of String(path).split('.')) cur = (cur as Record<string, unknown> | undefined)?.[key];
  return cur as PathValue<T, P>;
}

const data = { user: { name: 'Asha', address: { city: 'Pune', zip: 411001 } }, tags: ['a'] };
const city = get(data, 'user.address.city');   // string
const zip = get(data, 'user.address.zip');     // number
// @ts-expect-error  typo in the path
get(data, 'user.adress.city');

type D = typeof data;
type cases = [
  Expect<Equal<Paths<D>, 'user' | 'tags' | 'user.name' | 'user.address' | 'user.address.city' | 'user.address.zip'>>,
  Expect<Equal<typeof city, string>>,
  Expect<Equal<typeof zip, number>>
];
console.log(city, zip);
`,
      dry: { head: ['P', 'Head', 'Rest', 'T now'], rows: [['user.address.city', 'user', 'address.city', '{ name; address }'], ['address.city', 'address', 'city', '{ city; zip }'], ['city', '—', '—', H.c('g', 'string')]] },
      complexity: `<p>Paths is O(total properties) and recomputed per distinct T — cache it in an alias for large models. get is O(depth) at runtime.</p>`,
      followUps: ['Add array index paths like <code>"tags.0"</code>.', 'Add a depth limit with a counter tuple to support recursive types.', 'Write the matching <code>set(obj, path, value: PathValue&lt;T, P&gt;)</code>.']
    }
  });

  practice.push({
    title: 'Parse a Query String Type',
    level: 'Hard', tags: ['template literal types', 'infer', 'recursion', 'mapped types'], companies: ['Stripe', 'Cloudflare'],
    statement: `<p>Implement <code>ParseQuery&lt;S&gt;</code>: <code>"a=1&amp;b=2&amp;flag"</code> → <code>{ a: "1"; b: "2"; flag: true }</code>. Repeated keys collect values into a tuple: <code>"t=x&amp;t=y"</code> → <code>{ t: ["x", "y"] }</code>.</p>`,
    constraints: `<p>Pure type level. Keys and values contain no <code>&amp;</code> or <code>=</code> beyond separators. Empty string → <code>{}</code>.</p>`,
    example: `<p><code>ParseQuery&lt;'page=2&amp;sort=asc'&gt;</code> → ${H.c('g', '{ page: "2"; sort: "asc" }')}; <code>ParseQuery&lt;'debug'&gt;</code> → ${H.c('g', '{ debug: true }')}.</p>`,
    brute: { why: `<p>Typing parsed queries as <code>Record&lt;string, string&gt;</code> hides which keys exist; reading a misspelled key yields <code>undefined</code> at runtime without a compile error.</p>`, code: `
function parseQueryLoose(q: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(q));
}
const q = parseQueryLoose('page=2');
const s = q.sortt;   // string at compile time, undefined at runtime
` },
    mcq: { q: 'What is the cleanest order of operations?', options: ['Parse everything in one giant conditional', 'Split on &amp; into a tuple of pairs, turn each pair into a [key, value], then fold the tuple into an object merging duplicates', 'Use Record&lt;string, string&gt;', 'Use a runtime parser and typeof'], answer: 1, explain: 'Small composable steps (split → parse pair → merge) keep each type readable and testable.' },
    hints: [`<p>Hint 1: <code>SplitAmp&lt;S&gt;</code>: <code>S extends \`&#36;{infer A}&amp;&#36;{infer B}\` ? [A, ...SplitAmp&lt;B&gt;] : S extends '' ? [] : [S]</code>.</p>`, `<p>Hint 2: <code>ParsePair&lt;P&gt;</code>: <code>P extends \`&#36;{infer K}=&#36;{infer V}\` ? [K, V] : [P, true]</code>.</p>`, `<p>Hint 3: fold with an accumulator object: if the key exists, turn the value into a tuple (or append to it); else add it. Flatten the result with a mapped type.</p>`],
    tests: {"types":["type _0 = Expect<Equal<ParseQuery<\"page=2&sort=asc\">, { page: \"2\"; sort: \"asc\" }>>","type _1 = Expect<Equal<ParseQuery<\"debug\">, { debug: true }>>","type _2 = Expect<Equal<ParseQuery<\"t=x&t=y\">, { t: [\"x\", \"y\"] }>>","type _3 = Expect<Equal<ParseQuery<\"t=x&t=y&t=z\">, { t: [\"x\", \"y\", \"z\"] }>>","type _4 = Expect<Equal<ParseQuery<\"\">, {}>>","type _5 = Expect<Equal<ParseQuery<\"a=1\">, { a: \"1\" }>>","type _6 = Expect<Equal<ParseQuery<\"a&b\">, { a: true; b: true }>>","type _7 = Expect<Equal<ParseQuery<\"a=1&b&a=2\">, { a: [\"1\", \"2\"]; b: true }>>","type _8 = Expect<Equal<ParseQuery<\"k=v&k=v\">, { k: \"v\" }>>","// @ts-expect-error\ntype B = ParseQuery<5>;","// @ts-expect-error\nconst q: ParseQuery<\"a=1\"> = { a: \"2\" };","// @ts-expect-error\nconst q2: ParseQuery<\"debug\"> = { debug: false };"]},
    solution: {
      approach: `<p>Three composable layers: split into segments, parse each segment into a key/value pair, then fold pairs into an object with a merge rule for duplicate keys.</p>`,
      code: EQ + `
type SplitAmp<S extends string> =
  S extends \`\${infer A}&\${infer B}\` ? [A, ...SplitAmp<B>] : S extends '' ? [] : [S];

type ParsePair<P extends string> = P extends \`\${infer K}=\${infer V}\` ? [K, V] : [P, true];

type MergeValue<Old, New> =
  Old extends unknown[] ? [...Old, New] : Equal<Old, New> extends true ? Old : [Old, New];

type AddPair<Acc, K extends string, V> = {
  [P in keyof Acc | K]: P extends K
    ? P extends keyof Acc ? MergeValue<Acc[P], V> : V
    : P extends keyof Acc ? Acc[P] : never;
};

type Fold<Segs extends string[], Acc = {}> =
  Segs extends [infer H extends string, ...infer R extends string[]]
    ? ParsePair<H> extends [infer K extends string, infer V]
      ? Fold<R, AddPair<Acc, K, V>>
      : Acc
    : Acc;

type ParseQuery<S extends string> = Fold<SplitAmp<S>>;

type cases = [
  Expect<Equal<ParseQuery<'page=2&sort=asc'>, { page: '2'; sort: 'asc' }>>,
  Expect<Equal<ParseQuery<'debug'>, { debug: true }>>,
  Expect<Equal<ParseQuery<'t=x&t=y'>, { t: ['x', 'y'] }>>,
  Expect<Equal<ParseQuery<'t=x&t=y&t=z'>, { t: ['x', 'y', 'z'] }>>,
  Expect<Equal<ParseQuery<''>, {}>>
];
`,
      dry: { head: ['segment', 'pair', 'Acc after'], rows: [['t=x', '["t", "x"]', '{ t: "x" }'], ['t=y', '["t", "y"]', '{ t: ["x", "y"] }'], ['flag', '["flag", true]', '{ t: [...]; flag: true }']] },
      complexity: `<p>O(segments × keys) type instantiations; tail-recursive fold keeps depth manageable.</p>`,
      followUps: ['Decode <code>%20</code> to a space at the type level.', 'Return numbers for numeric values using <code>infer N extends number</code>.']
    }
  });

  practice.push({
    title: 'Type-level Addition with Tuple Lengths',
    level: 'Hard', tags: ['tuples', 'recursion', 'infer'], companies: ['Microsoft', 'Jane Street'],
    statement: `<p>TypeScript has no type-level arithmetic, but tuple <code>length</code> is a numeric literal. Implement <code>Add&lt;A, B&gt;</code> and <code>Subtract&lt;A, B&gt;</code> for small non-negative integers (≤ 999), and <code>GreaterThan&lt;A, B&gt;</code>.</p>`,
    constraints: `<p>0 ≤ A, B ≤ 999. Subtract returns <code>never</code> if the result would be negative.</p>`,
    example: `<p><code>Add&lt;3, 4&gt;</code> → ${H.c('g', '7')}; <code>Subtract&lt;10, 3&gt;</code> → ${H.c('g', '7')}; <code>Subtract&lt;2, 5&gt;</code> → ${H.c('b', 'never')}; <code>GreaterThan&lt;5, 2&gt;</code> → ${H.c('g', 'true')}.</p>`,
    brute: { why: `<p>A lookup table of every sum (<code>{ 0: { 0: 0; 1: 1 … } … }</code>) is enormous and still capped. Numeric literal types support no operators, so <code>A + B</code> is a syntax error in type space.</p>`, code: `
type AddTable = { 1: { 1: 2; 2: 3 }; 2: { 1: 3; 2: 4 } };   // grows as n squared
type Three = AddTable[1][2];
` },
    mcq: { q: 'What is <code>[unknown, unknown, unknown]["length"]</code>?', options: ['<code>number</code>', '<code>3</code>', '<code>"3"</code>', '<code>unknown</code>'], answer: 1, explain: 'A fixed-length tuple has a numeric literal length type.' },
    hints: [`<p>Hint 1: build a tuple of length N: <code>BuildTuple&lt;N, Acc extends unknown[] = []&gt; = Acc['length'] extends N ? Acc : BuildTuple&lt;N, [...Acc, unknown]&gt;</code> (tail-recursive, so ~1000 deep is OK).</p>`, `<p>Hint 2: Add = length of <code>[...BuildTuple&lt;A&gt;, ...BuildTuple&lt;B&gt;]</code>.</p>`, `<p>Hint 3: Subtract = infer the rest: <code>BuildTuple&lt;A&gt; extends [...BuildTuple&lt;B&gt;, ...infer R] ? R['length'] : never</code>. GreaterThan = Subtract&lt;A, B&gt; is a number and not 0.</p>`],
    tests: {"types":["type _0 = Expect<Equal<Add<3, 4>, 7>>","type _1 = Expect<Equal<Add<0, 0>, 0>>","type _2 = Expect<Equal<Add<0, 5>, 5>>","type _3 = Expect<Equal<Add<100, 200>, 300>>","type _4 = Expect<Equal<Add<500, 499>, 999>>","type _5 = Expect<Equal<Subtract<10, 3>, 7>>","type _6 = Expect<Equal<Subtract<5, 5>, 0>>","type _7 = Expect<Equal<Subtract<999, 0>, 999>>","type _8 = Expect<Equal<Subtract<2, 5>, never>>","type _9 = Expect<Equal<GreaterThan<5, 2>, true>>","type _10 = Expect<Equal<GreaterThan<2, 2>, false>>","type _11 = Expect<Equal<GreaterThan<2, 5>, false>>","type _12 = Expect<Equal<GreaterThan<0, 0>, false>>","type _13 = Expect<Equal<GreaterThan<10, 0>, true>>","// @ts-expect-error\ntype B = Add<\"a\", 1>;","// @ts-expect-error\nconst s: Add<1, 1> = 3;"]},
    solution: {
      approach: `<p>Represent numbers as tuples (unary notation), concatenate for addition, pattern-match a prefix for subtraction, and read back with <code>['length']</code>.</p>`,
      code: EQ + `
type BuildTuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>;

type Add<A extends number, B extends number> = [...BuildTuple<A>, ...BuildTuple<B>]['length'];

type Subtract<A extends number, B extends number> =
  BuildTuple<A> extends [...BuildTuple<B>, ...infer R] ? R['length'] : never;

type GreaterThan<A extends number, B extends number> =
  Subtract<A, B> extends never ? false : Subtract<A, B> extends 0 ? false : true;

type cases = [
  Expect<Equal<Add<3, 4>, 7>>,
  Expect<Equal<Add<0, 0>, 0>>,
  Expect<Equal<Subtract<10, 3>, 7>>,
  Expect<Equal<Subtract<2, 5>, never>>,
  Expect<Equal<GreaterThan<5, 2>, true>>,
  Expect<Equal<GreaterThan<2, 2>, false>>
];
`,
      dry: { head: ['expression', 'tuple form', 'length'], rows: [['BuildTuple<3>', '[u, u, u]', '3'], ['Add<3,4>', '[u×3, u×4]', '7'], ['Subtract<10,3>', '[u×10] = [u×3, ...R], R = [u×7]', '7']] },
      complexity: `<p>O(A + B) tuple elements; the 999 limit comes from the tail-recursion depth cap (~1000).</p>`,
      followUps: ['Why would <code>Subtract&lt;A, B&gt; extends never</code> be problematic inside a distributive position?', 'Implement <code>Multiply</code> with nested recursion.']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push(
    { q: 'What does <code>&lt;T, K extends keyof T&gt;</code> guarantee?', options: ['K is any string', 'K is one (or a union) of the real property names of T', 'K and T are the same type', 'T must be an object literal'], answer: 1, explain: 'keyof T is the union of T\'s keys; the constraint means K must be assignable to it, so only existing keys are accepted.' },
    { q: 'Given <code>const user = { id: 1, name: "a" }</code>, which gives the union <code>"id" | "name"</code>?', options: ['<code>keyof user</code>', '<code>typeof keyof user</code>', '<code>keyof typeof user</code>', '<code>user[keyof]</code>'], answer: 2, explain: 'typeof turns the value into a type; keyof then lists that type\'s keys. keyof cannot be applied to a value directly.' },
    { q: 'What is <code>ToArray&lt;string | number&gt;</code> where <code>type ToArray&lt;T&gt; = T extends any ? T[] : never</code>?', options: ['<code>(string | number)[]</code>', '<code>string[] | number[]</code>', '<code>never</code>', '<code>any[]</code>'], answer: 1, explain: 'T is naked, so the conditional distributes over the union: string → string[], number → number[], then the answers are unioned.' },
    { q: 'How do you stop a conditional type from distributing over a union?', options: ['Use <code>T extends infer U</code>', 'Wrap both sides in a tuple: <code>[T] extends [U]</code>', 'Add <code>readonly</code>', 'It cannot be stopped'], answer: 1, explain: 'Distribution only applies to a naked type parameter. [T] is no longer naked, so the union is checked as a whole.' },
    { q: 'What is <code>IsNever&lt;never&gt;</code> if <code>type IsNever&lt;T&gt; = T extends never ? true : false</code>?', options: ['<code>true</code>', '<code>false</code>', '<code>never</code>', '<code>boolean</code>'], answer: 2, explain: 'never is the empty union; distributing over zero members produces zero results, i.e. never. Use [T] extends [never].' },
    { q: 'Where is <code>infer</code> allowed?', options: ['Anywhere in a type alias', 'Only in the extends clause of a conditional type', 'Only in function parameters', 'Only in mapped types'], answer: 1, explain: 'infer declares a type variable to be inferred from a pattern; that only makes sense in the extends clause of a conditional type.' },
    { q: 'What does <code>{ [K in keyof T]-?: T[K] }</code> do?', options: ['Makes every property optional', 'Removes the optional modifier from every property', 'Removes readonly', 'Deletes all properties'], answer: 1, explain: 'The minus prefix removes a modifier. -? removes optionality (and the implicit undefined), which is the built-in Required.' },
    { q: 'In a mapped type, what happens when the <code>as</code> clause maps a key to <code>never</code>?', options: ['The property type becomes never', 'The key is filtered out of the result', 'Compile error', 'The key becomes optional'], answer: 1, explain: 'Key remapping to never is the official way to filter keys in a mapped type.' },
    { q: 'How many members does <code>`&#36;{"a" | "b" | "c"}-&#36;{"x" | "y"}`</code> have?', options: ['5', '6', '2', '1'], answer: 1, explain: 'Template literal types take the cross product of the unions in their holes: 3 × 2 = 6.' },
    { q: 'Why does <code>Omit&lt;User, "typo"&gt;</code> not produce an error?', options: ['Omit ignores all keys', 'Omit\'s K is constrained to <code>keyof any</code>, not <code>keyof T</code>', 'Because of skipLibCheck', 'Because typo is a reserved word'], answer: 1, explain: 'The built-in Omit only requires K to be some property key type. A StrictOmit with K extends keyof T catches typos.' },
    { q: 'Your <code>globals.d.ts</code> contains <code>import type { X } from "./x"</code> and <code>interface Window { foo: X }</code>, but <code>window.foo</code> errors. Why?', options: ['Window is sealed', 'The import makes the file a module, so the interface is local; wrap it in <code>declare global</code>', 'You need <code>type Window</code>', 'd.ts files cannot import'], answer: 1, explain: 'A top-level import/export makes a file a module. Global augmentation from a module requires declare global { ... }.' },
    { q: 'What does <code>ReturnType&lt;typeof fn&gt;</code> give for an overloaded function?', options: ['A union of all overload return types', 'The return type of the last overload signature', 'The first overload\'s return type', 'An error'], answer: 1, explain: 'Inference from an overloaded function uses only the last signature (usually the most general one).' },
    { q: 'Which is the best way to get the element union of <code>const SIZES = ["s", "m", "l"] as const</code>?', options: ['<code>keyof typeof SIZES</code>', '<code>(typeof SIZES)[number]</code>', '<code>typeof SIZES[]</code>', '<code>SIZES[number]</code>'], answer: 1, explain: 'Indexing the readonly tuple type with number yields "s" | "m" | "l". keyof would give indexes and array methods; SIZES[number] mixes value and type.' }
  );

  /* ================= INTERVIEW ================= */
  interview.push(
    { q: 'What is the difference between <code>T extends U</code> in a generic constraint and in a conditional type?', level: 'I', a: `<p>Both mean <b>"T is assignable to U"</b>, but they are used differently. In a <b>constraint</b> (<code>&lt;T extends U&gt;</code>) it is a <b>requirement</b> checked at the call site: if the inferred T does not fit, the call is a compile error, and inside the body you may use U's members on T. In a <b>conditional type</b> (<code>T extends U ? X : Y</code>) it is a <b>question</b>: no error is raised, the checker just picks a branch. Conditionals also have special behaviour constraints do not: they <b>distribute</b> over unions when T is naked, they can bind variables with <code>infer</code>, and they stay <b>deferred</b> while T is still generic.</p>`, followUps: ['Why can\'t you assign a value of type U to a variable of type T inside the function?', 'What does "deferred conditional type" mean in practice?'] },
    { q: 'Implement <code>Omit</code> two different ways and explain the trade-offs.', level: 'I', a: `<p>Way 1 (lib.d.ts): <code>type MyOmit&lt;T, K extends keyof any&gt; = Pick&lt;T, Exclude&lt;keyof T, K&gt;&gt;</code> — list keys, drop K via distributive Exclude, rebuild with Pick (homomorphic through its constraint, so modifiers survive). Way 2: <code>{ [P in keyof T as P extends K ? never : P]: T[P] }</code> — one mapped type with key remapping. Both give the same result for objects. Trade-offs: the built-in accepts unknown keys (typo-unsafe, but works when T is generic); a <code>StrictOmit&lt;T, K extends keyof T&gt;</code> catches typos. Neither distributes over unions — for discriminated unions use <code>T extends any ? Omit&lt;T, K&gt; : never</code>, otherwise variant-specific fields are lost because <code>keyof (A | B)</code> is only the common keys.</p>`, followUps: ['Why is Omit\'s constraint keyof any?', 'Show what Omit does to a discriminated union.'] },
    { q: 'Explain distributive conditional types with an example where distribution is a bug.', level: 'A', a: `<p>When a conditional checks a <b>naked type parameter</b> and receives a union, TS evaluates it per member and unions the results. That is how <code>Exclude</code> works. It becomes a bug when you want to judge the union <b>as a whole</b>: e.g. <code>type IsString&lt;T&gt; = T extends string ? true : false</code> returns <code>boolean</code> for <code>string | number</code> (true | false) instead of <code>false</code>, and returns <code>never</code> for <code>never</code>. Another: <code>ToArray&lt;string | number&gt;</code> gives <code>string[] | number[]</code>, which rejects the mixed array <code>['a', 1]</code>. Fix: wrap both sides — <code>[T] extends [string]</code> — so T is no longer naked and distribution is switched off.</p>`, followUps: ['Why does boolean distribute?', 'Write IsUnion&lt;T&gt;.'] },
    { q: 'How does <code>infer</code> work, and how do you implement <code>ReturnType</code> and <code>Awaited</code>?', level: 'I', a: `<p><code>infer X</code> declares a placeholder inside the <code>extends</code> pattern of a conditional type; the checker structurally matches T against the pattern and infers X like it infers a generic function argument. If the match succeeds, the true branch can use X. <code>ReturnType&lt;F extends (...a: any) =&gt; any&gt; = F extends (...a: any) =&gt; infer R ? R : any</code>. <code>Awaited</code> peels thenables recursively: <code>T extends PromiseLike&lt;infer U&gt; ? Awaited&lt;U&gt; : T</code> (the real one also special-cases null/undefined and non-thenable objects). Gotchas: overloaded functions infer from the last signature; generic functions have their type parameters replaced by constraints (use instantiation expressions <code>typeof f&lt;string&gt;</code>).</p>`, followUps: ['What happens when the same infer name appears twice in contravariant positions?', 'How would you get the type of the first parameter only?'] },
    { q: 'What is a homomorphic mapped type and why does it matter?', level: 'A', a: `<p>A mapped type of the form <code>{ [K in keyof T]: … }</code> (or over <code>K extends keyof T</code>) is <b>homomorphic</b>: it preserves the structure of T. Practically: (1) it <b>copies</b> <code>readonly</code> and <code>?</code> from T unless you change them, (2) mapping an <b>array or tuple</b> produces an array/tuple (<code>Partial&lt;[a, b]&gt;</code> → <code>[a?, b?]</code>), (3) it <b>distributes over unions</b> of T, and (4) applied to a primitive it returns the primitive. Mapping over something else (e.g. <code>[K in string]</code> or a literal union) does not preserve modifiers. Adding an <code>as</code> clause keeps modifier copying but breaks array preservation — mapping a tuple with <code>as</code> exposes keys like <code>length</code> and <code>push</code>.</p>`, followUps: ['Why is Partial&lt;string&gt; equal to string?', 'How does Pick stay homomorphic?'] },
    { q: 'Write a type-safe <code>get(obj, key)</code> and then extend it to dotted paths. What are the costs?', level: 'A', a: `<p>Single level: <code>function get&lt;T, K extends keyof T&gt;(obj: T, key: K): T[K]</code>. For paths, generate all valid paths with a recursive mapped type (<code>K | \`&#36;{K}.&#36;{Paths&lt;T[K]&gt;}\`</code> for object-valued keys, indexed by <code>[keyof T &amp; string]</code>) and consume a path with a template literal split (<code>P extends \`&#36;{infer H}.&#36;{infer R}\` ? PathValue&lt;T[H], R&gt; : T[P]</code>). Costs: Paths is O(total properties) and can explode on wide or recursive models (needs a depth counter), errors become hard to read, and editor latency grows. In production I cap depth, cache the alias, and measure with <code>--extendedDiagnostics</code>; sometimes a typed selector function (<code>get(o, x =&gt; x.a.b)</code>) is simpler.</p>`, followUps: ['How would you add a depth limit?', 'How do you type the matching set()?'] },
    { q: 'How do template literal types work and what are their limits?', level: 'I', a: `<p>They are string types built like JS template strings but with <b>types</b> in the holes: <code>\`&#36;{number}px\`</code> is a pattern accepting "10px"; unions in holes produce the <b>cross product</b> (<code>\`&#36;{"sm" | "lg"}-&#36;{"red" | "blue"}\`</code> → 4 literals). With <code>infer</code> in a conditional they parse strings (route params, dotted paths). Intrinsics <code>Uppercase</code>, <code>Lowercase</code>, <code>Capitalize</code>, <code>Uncapitalize</code> transform them. Limits: unions over 100,000 members error, recursive parsing is bounded by instantiation depth (~1000 for tail recursion, ~50–100 otherwise), adjacent <code>infer</code>s take one character at a time, and symbol keys need <code>&amp; string</code> filtering.</p>`, followUps: ['How do you match the last occurrence of a separator?', 'Give a production use where you would NOT use them.'] },
    { q: 'What is the difference between <code>satisfies</code>, a type annotation and <code>as</code>?', level: 'I', a: `<p>An <b>annotation</b> (<code>const x: T = …</code>) checks the value against T and then the variable <b>is</b> T — literal information is lost (keys widen to <code>string</code> for a Record). <code>as T</code> is an <b>assertion</b>: it overrides the checker (only rejecting obviously unrelated types), so it can hide bugs. <code>satisfies T</code> (TS 4.9) <b>checks</b> the value against T but keeps the value's own, narrower inferred type — so <code>const ROUTES = {…} satisfies Record&lt;string, string&gt;</code> validates every value while <code>keyof typeof ROUTES</code> stays the literal key union. Combined with <code>as const</code> it gives both readonly literal types and validation.</p>`, followUps: ['When is as unavoidable?', 'What does as const satisfies X give you?'] },
    { q: 'When do you write a <code>.d.ts</code> file and what goes in it?', level: 'I', a: `<p>When TypeScript must type code it cannot read as TS: an untyped JS package without <code>@types</code> (<code>declare module "x" { … }</code>), bundler imports like <code>*.svg</code> or CSS modules (wildcard modules), values injected at build time (<code>declare const __APP_VERSION__: string</code>), and augmenting globals or third-party types (<code>declare global</code>, <code>declare module "express-serve-static-core"</code>). It contains only declarations — no implementations, no emitted JS. For your own libraries you generate .d.ts with <code>declaration: true</code> and point <code>package.json</code> <code>exports</code>' <code>types</code> condition at it. Important: declarations are unchecked promises; wrong ones produce runtime crashes the compiler cannot catch.</p>`, followUps: ['What is TS7016 and how do you fix it properly?', 'What does skipLibCheck skip?'] },
    { q: 'Explain declaration merging and give two real uses.', level: 'A', a: `<p>Multiple declarations with the same name in the same scope are merged into one entity. <b>Interfaces</b> merge their members; <b>namespaces</b> merge with each other and with functions, classes and enums (attaching static members). Type aliases never merge (duplicate identifier). Real uses: (1) <b>augmenting library types</b> — adding <code>user</code> to Express's <code>Request</code> via <code>declare module "express-serve-static-core" { interface Request { user?: User } }</code>; (2) <b>globals</b> — adding <code>analytics</code> to <code>Window</code> or typing <code>process.env</code> with <code>declare global { namespace NodeJS { interface ProcessEnv { … } } }</code>; (3) open <b>registries</b> — libraries expose an empty interface (e.g. an event map or theme) that users extend to customise types.</p>`, followUps: ['Why do libraries expose interfaces instead of type aliases for extension points?', 'What happens if two merged interfaces declare the same property with different types?'] },
    { q: 'How would you test complex types in a codebase?', level: 'A', a: `<p>Types are code and need tests. Options: (1) an <code>Equal</code>/<code>Expect</code> pair (<code>type Equal&lt;X, Y&gt; = (&lt;T&gt;() =&gt; T extends X ? 1 : 2) extends (&lt;T&gt;() =&gt; T extends Y ? 1 : 2) ? true : false</code>) in <code>*.test-d.ts</code> files compiled by <code>tsc --noEmit</code> in CI; (2) <code>// @ts-expect-error</code> lines proving invalid usage fails (and failing if it ever stops failing); (3) <code>expectTypeOf</code> in Vitest or <code>tsd</code>/<code>tstyche</code> for nicer messages. I always include edge inputs: <code>never</code>, <code>any</code>, <code>unknown</code>, unions, <code>boolean</code>, optional and readonly props. Plain <code>extends</code>-based checks are not enough — they pass for <code>any</code> and ignore readonly.</p>`, followUps: ['Why does Equal use generic functions?', 'How do you keep type tests from slowing down CI?'] },
    { q: 'Your build got 3× slower after adding some clever types. How do you investigate and fix it?', level: 'E', a: `<p>Measure first: <code>tsc --extendedDiagnostics</code> shows check time, instantiation counts and memory; <code>tsc --generateTrace out/</code> plus <code>@typescript/analyze-trace</code> pinpoints the slow files and types. Usual culprits: huge unions from template-literal cross products, recursive types without depth limits (<code>Paths</code> over big models), non-tail-recursive conditionals, deeply nested generic inference in builder APIs, and large intersections. Fixes: name and reuse intermediate aliases (caching), cap recursion with a counter tuple, prefer interfaces over intersections (interfaces are cached by identity), add explicit return annotations on exported functions (also enables <code>isolatedDeclarations</code>), and simplify — sometimes <code>string</code> plus runtime validation is the right answer. Project references and incremental builds help with scale.</p>`, followUps: ['Why are interfaces faster than intersections?', 'What is isolatedDeclarations?'] },
    { q: 'How has AI changed type-level programming work, and what still requires a human?', level: 'E', a: `<p>Assistants now solve classic type puzzles (Pick, Omit, DeepReadonly, Reverse, route params) instantly and can draft .d.ts files or OpenAPI-derived types from examples, which removes most of the typing labour. What they do poorly is <b>judgement and verification</b>: they get distribution and <code>never</code> edge cases wrong, return the constraint instead of T, use <code>any</code> to make tests pass, produce non-tail recursion that hits depth limits, and write unchecked declarations that lie about runtime behaviour. My workflow: ask for the type <b>and</b> a test file of <code>Expect&lt;Equal&gt;</code> plus <code>@ts-expect-error</code> cases, run <code>tsc --noEmit</code>, review readability and compile-time cost, and own the decision of whether the cleverness is worth it for the team.</p>`, followUps: ['How do you catch an AI-generated type that silently resolves to any?', 'What review checklist do you use for generated .d.ts files?'] }
  );

  registerModule({
    id: 'js11',
    title: 'Advanced TypeScript: Type-Level Programming',
    lang: 'ts',
    intro: `<p>In the fundamentals module you <b>used</b> types. Here you learn to <b>compute</b> them. TypeScript's type system is a small programming language of its own: it has variables (type parameters), functions (generic type aliases), if/else (conditional types), loops (mapped types and recursion), pattern matching (<code>infer</code>) and string handling (template literal types).</p>
<p>We go one tool at a time, always with an everyday analogy first and a step-by-step visualizer: generic constraints, <code>keyof</code>/<code>typeof</code>/indexed access, conditional types and distribution over unions, <code>infer</code>, mapped types with key remapping, template literal types, the built-in utility types — which you will <b>re-implement yourself</b> (Partial, Pick, Omit, Record, ReturnType, Awaited, DeepReadonly) — and finally declaration files (<code>.d.ts</code>) for typing JavaScript you did not write. These are exactly the "implement Omit" / "what does this conditional type return?" questions asked in senior frontend and full-stack interviews, and the skills behind the typed APIs of libraries like zod, tRPC, Prisma and typed routers.</p>`,
    goals: [
      'Write generic functions whose return type follows their arguments (<code>K extends keyof T</code> → <code>T[K]</code>) and derive types from values with <code>typeof</code>, <code>keyof</code>, <code>as const</code> and <code>satisfies</code>',
      'Predict the result of any conditional type, including distribution over unions, the <code>[T]</code> wrapping trick and the <code>never</code>/<code>boolean</code>/<code>any</code> edge cases',
      'Extract types with <code>infer</code> (ReturnType, Parameters, Awaited, tuple head/tail, string parsing) and write tail-recursive type-level loops',
      'Build mapped types with modifiers and key remapping, and re-implement Partial, Required, Readonly, Pick, Omit, Record, Exclude, Extract, NonNullable and DeepReadonly from scratch',
      'Use template literal types for typed event names, route params and dotted paths, knowing their cost and limits',
      'Write and debug <code>.d.ts</code> files: ambient modules, wildcard modules, global and module augmentation, and publishing types for your own package',
      'Test types with <code>Expect&lt;Equal&gt;</code> and <code>@ts-expect-error</code>, and judge when type cleverness is worth its readability and compile-time cost'
    ],
    prereqs: `<p>JS/TS module 10 (<b>TypeScript Fundamentals</b>: annotations, interfaces vs types, unions, narrowing, generics basics, strict mode). Comfort with JS objects, arrays, destructuring and Promises (JS modules 2 and 7) helps for the examples.</p>`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
