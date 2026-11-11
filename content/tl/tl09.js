(function () { var topics = [], practice = [], quiz = [], interview = [];

// Code block for HTML answers: dedents, escapes, and turns @@{ into a dollar-brace and ~~ into a backtick.
function C(s) {
  var L = String(s).replace(/^\n+|\s+$/g, '').split('\n');
  var mn = Math.min.apply(null, L.filter(function (l) { return l.trim(); }).map(function (l) { return l.match(/^ */)[0].length; }));
  var out = H.esc(L.map(function (l) { return l.slice(mn); }).join('\n'));
  out = out.replace(/@@\{/g, function () { return '$&#123;'; }).replace(/~~/g, function () { return '&#96;'; });
  return '<pre><code>' + out + '</code></pre>';
}
// Scenario problem builder (weak answer vs strong answer).
function P(o) {
  return {
    title: o.t, level: o.l, tags: o.tags,
    statement: '<p>' + o.s + '</p>',
    constraints: o.c || 'Answer out loud in 2 to 3 minutes. Name the cause first, then how you would confirm it, then the fix.',
    example: o.ex,
    brute: { why: '<p><b>Weak answer:</b> <i>&ldquo;' + o.weak + '&rdquo;</i></p><p><b>Why it fails:</b> ' + o.why + '</p>' },
    mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
    hints: ['<p>Hint 1: ' + o.h[0] + '</p>', '<p>Hint 2: ' + o.h[1] + '</p>', '<p>Hint 3: ' + o.h[2] + '</p>'],
    solution: { approach: o.a, code: o.code, complexity: '<p><b>What the interviewer is scoring:</b> ' + o.cx + '</p>', followUps: o.f }
  };
}
// Visualizer helpers.
function stepViz(title, lang, code, steps, varLabel) {
  return { title: title, gen: function () {
    return steps.map(function (s) {
      var h = {}; h[s[0]] = s[4] || 'cur';
      var parts = [{ type: 'code', label: 'Code', lang: lang, code: code, hl: h }, { type: 'vars', label: varLabel || 'What is known right now', vals: s[2] }];
      return { narr: s[1], parts: parts.concat(s[3] || []) };
    });
  } };
}
function rowViz(title, label, columns, rows, narrs, finalNarr, selRows) {
  return { title: title, gen: function () {
    var frames = [{ narr: narrs[0], parts: [{ type: 'table', label: label, columns: columns, rows: [] }] }];
    for (var i = 0; i < rows.length; i++) {
      var h = {}; h[i] = 'cur';
      frames.push({ narr: narrs[i + 1], parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(0, i + 1), hl: h }] });
    }
    var fh = {}; (selRows || []).forEach(function (r) { fh[r] = 'sel'; });
    frames.push({ narr: finalNarr, parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(), hl: fh }] });
    return frames;
  } };
}
function flowViz(title, label, nodes, edges, steps, height) {
  return { title: title, gen: function () {
    return steps.map(function (s) {
      var parts = [{ type: 'graph', label: label, directed: true, height: height || 60, nodes: nodes, edges: edges, hl: s[1] || {}, ehl: s[2] || {}, tags: s[3] || {} }];
      return { narr: s[0], parts: parts.concat(s[4] || []) };
    });
  } };
}

// ---------- TOPIC 1 ----------
var TS_SHAPES = "// One type for every state a screen can be in. The 'kind' field is the label.\ntype LoadState<T> =\n  | { kind: 'loading' }\n  | { kind: 'success'; data: T }\n  | { kind: 'error'; message: string };\n\ninterface Order { id: number; total: number; }\n\n// Generic function: T is decided by the caller, K must be a real key of T.\nfunction pick<T, K extends keyof T>(obj: T, key: K): T[K] {\n  return obj[key];\n}\n\nfunction describe(state: LoadState<Order[]>): string {\n  switch (state.kind) {\n    case 'loading':\n      return 'Loading orders';\n    case 'success':\n      // Inside this case the compiler knows state.data exists.\n      return state.data.length + ' orders, first total ' + pick(state.data[0], 'total');\n    case 'error':\n      return 'Failed: ' + state.message;\n    default: {\n      // If someone adds a 4th state and forgets a case, this line stops compiling.\n      const missing: never = state;\n      return missing;\n    }\n  }\n}\n\nconsole.log(describe({ kind: 'success', data: [{ id: 1, total: 250 }] }));";

topics.push({
  title: 'TypeScript: Types, Generics and Narrowing',
  analogy: `<p>Think of a <b>parcel sorting centre</b>. Every parcel has a label that says what is inside. Workers do not open the box, they read the label and send it to the right belt. A parcel with no label must be inspected before anyone is allowed to use it. TypeScript is the labelling system for your JavaScript values: the label (the <b>type</b>) is checked while you write the code, long before the parcel ships.</p>`,
  explain: `<p><b>The plain idea:</b> TypeScript is JavaScript plus labels. A label says "this value is a number" or "this object has an <code>id</code> and a <code>name</code>". The compiler reads the labels and warns you when the code does not match them. Then it removes the labels and outputs plain JavaScript.</p>
    <p>The words an interviewer expects you to know:</p>
    ${H.table(['Word', 'Plain meaning', 'Tiny example'], [
      ['Union', 'This value is one of several types', '<code>string | null</code>'],
      ['Literal type', 'The type is one exact value', '<code>\'draft\' | \'active\'</code>'],
      ['Interface / type alias', 'A name for an object shape', '<code>interface User { id: number }</code>'],
      ['Generic', 'A type with a blank that the caller fills in', '<code>ApiResponse&lt;T&gt;</code>'],
      ['Narrowing', 'A check that makes a wide type smaller', '<code>if (typeof x === \'string\')</code>'],
      ['Discriminated union', 'A union where every member has the same label field', '<code>{ kind: \'ok\' } | { kind: \'error\' }</code>'],
      ['Utility type', 'A built-in tool that makes a new type from an old one', '<code>Partial&lt;User&gt;</code>']
    ])}
    <p><b>Two special types to say correctly:</b> <code>any</code> switches checking off, so mistakes pass silently. <code>unknown</code> means "I do not know yet", and the compiler forces you to check before you use it. Prefer <code>unknown</code>.</p>`,
  clues: ['"What is the difference between <code>interface</code> and <code>type</code>?"', '"<code>any</code> vs <code>unknown</code> vs <code>never</code>"', '"How do you model loading, success and error without boolean flags?" → discriminated union', '"Write a function that works for any type but stays type safe" → generics with a constraint', '"What does <code>Partial</code>, <code>Pick</code> or <code>Omit</code> do?" → utility types', '"How do you make the compiler tell you about a missing case?" → exhaustive check with <code>never</code>', '"What is a type guard?"'],
  code: [{ lang: 'ts', title: 'Discriminated union + generics + exhaustive check', code: TS_SHAPES }],
  codeTitle: ['Types that make wrong states impossible'],
  viz: stepViz('Narrowing a discriminated union, line by line', 'ts',
    "type Result =\n  | { kind: 'ok'; value: number }\n  | { kind: 'error'; message: string };\n\nfunction show(r: Result): string {\n  if (r.kind === 'ok') {\n    return 'Total ' + r.value;\n  }\n  return 'Failed: ' + r.message;\n}\n\nshow({ kind: 'error', message: 'timeout' });",
    [
      [1, 'We declare <b>Result</b>. It is a union: a value is either the "ok" shape or the "error" shape. Both shapes share one field, <code>kind</code>. That shared field is the label.', { 'Result': 'ok shape OR error shape' }],
      [5, 'Inside <code>show</code>, the compiler only knows <code>r</code> is a Result. It does <b>not</b> know which shape. Reading <code>r.value</code> here would be a compile error, because the error shape has no <code>value</code>.', { 'type of r': 'ok | error', 'r.value allowed?': 'no', 'r.message allowed?': 'no' }],
      [6, 'We check the label. This check is called <b>narrowing</b>. The compiler follows the same logic you do.', { 'type of r': 'ok | error', 'check': "r.kind === 'ok'" }],
      [7, 'Inside the <code>if</code>, the type of <code>r</code> has shrunk to the ok shape only, so <code>r.value</code> is allowed and is a number.', { 'type of r': "{ kind: 'ok'; value: number }", 'r.value allowed?': 'yes' }, null, 'ok'],
      [9, 'After the <code>if</code> returned, only one possibility is left. The compiler narrows <code>r</code> to the error shape, so <code>r.message</code> is allowed.', { 'type of r': "{ kind: 'error'; message: string }", 'r.message allowed?': 'yes' }, null, 'ok'],
      [12, 'At run time the call passes the error shape. Line 6 is false, line 9 runs and returns <b>Failed: timeout</b>. The types are gone at run time, only the plain <code>kind</code> string check remains.', { 'returned': 'Failed: timeout', 'types at run time': 'erased' }],
      [1, 'Why this matters: if a teammate adds a third shape, such as <code>{ kind: \'empty\' }</code>, line 9 stops compiling because <code>message</code> may not exist. The compiler finds the places you forgot.', { 'new member': "{ kind: 'empty' }", 'line 9': 'compile error' }, null, 'bad']
    ]),
  examples: [
    { title: 'interface or type? A quick rule', html: `<p>Both can describe an object. Use <code>interface</code> for object shapes that other code may extend. Use <code>type</code> when you need something an interface cannot say: a union, a tuple or a computed type.</p>${C(`
      interface User { id: number; name: string; email?: string }
      interface Admin extends User { permissions: string[] }

      type Id = string | number;                 // union: only a type alias can do this
      type Point = [x: number, y: number];       // tuple
      `)}<p>Pick one rule for the code base and keep to it. Consistency matters more than the choice.</p>` },
    { title: 'A generic with a constraint', html: `<p>A generic is a blank in a type. A <b>constraint</b> limits what can go in the blank. Here every item must have an <code>id</code>, so the function can safely read it.</p>${C(`
      function byId<T extends { id: number }>(items: T[]): Map<number, T> {
        const map = new Map<number, T>();
        for (const item of items) map.set(item.id, item);
        return map;
      }
      const orders = byId([{ id: 7, total: 90 }]);   // Map<number, { id: number; total: number }>
      `)}<p>The caller did not write any type. TypeScript worked it out from the argument. That is called <b>inference</b>.</p>` },
    { title: 'Utility types on one model', html: `<p>Start from one type that matches the API, then derive the others. If the model changes, the derived types follow.</p>${C(`
      type Product = { id: number; name: string; price: number; notes: string | null };

      type NewProduct = Omit<Product, 'id'>;          // the POST body: no id yet
      type ProductPatch = Partial<NewProduct>;        // the PATCH body: every field optional
      type ProductRow = Pick<Product, 'id' | 'name'>; // what the list screen needs
      type PriceById = Record<number, number>;        // a dictionary
      `)}` }
  ],
  deepDive: `<p><b>Structural typing.</b> TypeScript compares shapes, not names. If two types have the same fields they are compatible, even if they were declared separately. C# is the opposite (nominal): two classes with the same fields are still different types. This is why a plain object from <code>JSON.parse</code> can be passed where an interface is expected.</p>
    <p><b>Mapped and conditional types.</b> A mapped type loops over the keys of another type: <code>{ [K in keyof T]?: T[K] }</code> is how <code>Partial</code> is built. A conditional type is an if-statement for types: <code>T extends (infer U)[] ? U : T</code> pulls the item type out of an array type. You rarely write these in app code, but you must be able to read them, because libraries use them everywhere.</p>
    <p><b>Limits of narrowing.</b> Narrowing is lost when a value can change between the check and the use, for example a mutable property read again inside a callback. Copy the value into a <code>const</code> first. Type predicates (<code>v is string</code>) are trusted by the compiler, so a wrong predicate is a hidden bug.</p>
    <p><b>Compile speed.</b> Deep conditional types and huge unions slow the editor down. In large code bases prefer simple named interfaces at module boundaries.</p>`,
  aiEra: `<p><b>What AI changes:</b> coding assistants write TypeScript types quickly and are good at turning a JSON sample into an interface. <b>Where AI goes wrong:</b> it reaches for <code>any</code> or <code>as SomeType</code> to make an error go away, and it invents fields that the real API does not return. <b>Use it as a partner:</b> ask it to "model these 3 screen states as a discriminated union and add an exhaustive check", then read every assertion it added. <b>What you must still own:</b> the contract with the API, the decision of where data is validated, and a review rule that new <code>any</code> and new <code>as</code> casts need a reason. Types are also the best prompt you can give an assistant: a tight type tells it exactly what shape of code is allowed.</p>`,
  problems: [P({
    t: 'Model a screen state so impossible states cannot exist', l: 'Easy', tags: ['typescript', 'discriminated union'],
    s: 'A product page keeps three fields: <code>isLoading: boolean</code>, <code>data?: Product</code> and <code>error?: string</code>. A bug report shows a spinner and an error message on screen at the same time. The interviewer asks: how would you change the types so this bug cannot be written?',
    ex: '<p>With three independent fields there are 2 × 2 × 2 = 8 combinations, but only 3 make sense: loading, loaded with data, failed with a message. The other 5 are bugs waiting to happen.</p>',
    weak: 'I would add an if-statement so the spinner hides when there is an error.',
    why: 'It patches one of the 5 bad combinations in one component. The next component can still set both flags. The type still allows the bug.',
    q: ['Which type makes "loading and error at the same time" a compile error?', ['<code>{ isLoading: boolean; error?: string }</code>', 'A union of three shapes that share a <code>status</code> field', 'An <code>enum</code> next to the same three optional fields', '<code>Partial&lt;State&gt;</code>'], 1, 'A discriminated union allows exactly one shape at a time, so the two cannot be combined.'],
    h: ['Count how many combinations the three separate fields allow, and how many are real.', 'Give each real state its own object shape, and give all shapes one shared label field.', 'Switch on the label field in the component. Add a <code>never</code> check in the default branch so a new state cannot be forgotten.'],
    a: `<p>Replace the three loose fields with one discriminated union. Each real state gets its own shape and they share a <code>status</code> label:</p>${C(`
      type ProductState =
        | { status: 'loading' }
        | { status: 'success'; data: Product }
        | { status: 'error'; message: string };
      `)}<p>Now <code>data</code> only exists when the status is success and <code>message</code> only exists when it is error. The component switches on <code>status</code>, and the compiler narrows the type in each case. I add a <code>never</code> check in the default branch so adding a fourth state later (for example "empty") breaks the build in every place that forgot it. In a real project a data library such as TanStack Query already returns state in this form, so I would use that instead of hand-rolled flags.</p>`,
    cx: 'you see the bug as a modelling problem, not a rendering problem; you name the discriminated union and the exhaustive check; you mention that a library may already solve it.',
    f: ['How would you add a "refreshing while old data is shown" state?', 'What does the <code>never</code> type do in the default branch?']
  })]
});

// ---------- TOPIC 2 ----------
var TS_CLIENT = "// One place for every HTTP concern: base URL, token, error mapping, parsing.\nclass ApiError extends Error {\n  status: number;\n  body: unknown;\n  constructor(status: number, body: unknown) {\n    super('HTTP ' + status);\n    this.status = status;\n    this.body = body;\n  }\n}\n\n// The caller passes a parser, so the data is checked at run time and not only labelled.\nasync function api<T>(path: string, parse: (json: unknown) => T, init: RequestInit = {}, token?: string): Promise<T> {\n  const headers = new Headers(init.headers);\n  headers.set('Accept', 'application/json');\n  if (init.body) headers.set('Content-Type', 'application/json');\n  if (token) headers.set('Authorization', 'Bearer ' + token);\n\n  const res = await fetch('/api' + path, { ...init, headers });\n  if (!res.ok) {\n    // The error body may not be JSON, so never let this second failure hide the first.\n    const body: unknown = await res.json().catch(() => null);\n    throw new ApiError(res.status, body);\n  }\n  if (res.status === 204) return parse(undefined);\n  return parse(await res.json());\n}\n\n// A hand-written parser. In a real project a schema library such as Zod builds this for you.\ninterface Customer { id: string; name: string; }\nfunction parseCustomer(json: unknown): Customer {\n  if (typeof json !== 'object' || json === null) throw new Error('Customer: not an object');\n  const o = json as Record<string, unknown>;\n  if (typeof o.id !== 'string' || typeof o.name !== 'string') throw new Error('Customer: wrong shape');\n  return { id: o.id, name: o.name };\n}\n\nconst load = (id: string) => api('/customers/' + encodeURIComponent(id), parseCustomer);";

topics.push({
  title: 'TypeScript at the Edges: Erased Types, Strict Mode, API Clients and JavaScript Basics',
  analogy: `<p>A building plan says where every wall goes. The plan is checked by an inspector before building starts. But once the house stands, the plan is in a drawer, and it cannot stop a delivery truck from dropping the wrong sofa at the door. TypeScript types are the plan. They are checked before the code runs, then thrown away. Data that arrives later from an API is the delivery truck: someone has to check it at the door.</p>`,
  explain: `<p><b>The plain idea:</b> types are <b>erased</b>. After compiling, the browser runs plain JavaScript with no types in it. So a type can describe what you <i>hope</i> an API returns, but it cannot check it. If the server sends something different, the code keeps running with wrong data until something breaks far away from the cause.</p>
    <p>Four habits follow from this:</p>
    <ul>
      <li><b>Turn on <code>strict</code>.</b> It switches on a group of checks. The most valuable is <code>strictNullChecks</code>: <code>null</code> and <code>undefined</code> must be handled before use.</li>
      <li><b>Validate at the boundary.</b> Check data once, where it enters the app (API response, form input, local storage, URL). Inside the app, trust the types.</li>
      <li><b>One API client.</b> Put the base URL, the token header, error mapping and parsing in one function, not in every component.</li>
      <li><b>Know the JavaScript underneath.</b> TypeScript does not change how JavaScript runs. Closures, <code>this</code>, and the event loop behave exactly the same.</li>
    </ul>
    <p><b>The event loop in one line:</b> JavaScript runs one thing at a time. Code that is running now finishes first. Then all waiting promise callbacks (<b>microtasks</b>) run. Then one timer or event callback (<b>macrotask</b>) runs. Step through the visualizer below to see it.</p>`,
  clues: ['"The API returned a string where we expected a number and nothing failed. Why?" → types are erased', '"What does <code>strict</code> turn on?"', '"What is the output of this code?" with <code>setTimeout</code> and <code>Promise.then</code> → event loop order', '"How do you keep front-end types in sync with a .NET API?" → generate from OpenAPI', '"<code>as</code> vs <code>satisfies</code>"', '"Where do you put the auth header and error handling?" → one API client or interceptor', '"What is a closure?" / "Implement debounce"'],
  code: [{ lang: 'ts', title: 'A small typed API client with a parser at the boundary', code: TS_CLIENT }],
  codeTitle: ['Typed fetch wrapper: one place for token, errors and parsing'],
  viz: { title: 'Event loop: why the output is 1, 4, 3, 2', gen: function () {
    var code = "console.log('1');\nsetTimeout(() => console.log('2'), 0);\nPromise.resolve().then(() => console.log('3'));\nconsole.log('4');";
    function fr(narr, line, cls, stack, micro, macro, out) {
      var h = {}; if (line) h[line] = cls || 'cur';
      return { narr: narr, parts: [
        { type: 'code', label: 'Script', lang: 'js', code: code, hl: h },
        { type: 'stack', label: 'Call stack (what is running now)', items: stack },
        { type: 'queue', label: 'Microtask queue (promise callbacks)', items: micro, frontLabel: 'next', backLabel: 'last' },
        { type: 'queue', label: 'Macrotask queue (timers, events)', items: macro, frontLabel: 'next', backLabel: 'last' },
        { type: 'array', label: 'Console output', values: out }
      ] };
    }
    return [
      fr('The whole script is one task. It goes on the call stack and runs from top to bottom without a pause.', 0, '', ['script'], [], [], []),
      fr('Line 1 runs now. It is plain synchronous code, so <b>1</b> is printed at once.', 1, 'ok', ['script', "log('1')"], [], [], ['1']),
      fr('Line 2 asks the browser to start a timer. The callback is <b>not</b> run. Even with 0 ms it is placed in the macrotask queue to wait.', 2, 'cur', ['script'], [], ["log('2')"], ['1']),
      fr('Line 3: the promise is already resolved, but its <code>then</code> callback still does not run now. It waits in the microtask queue.', 3, 'cur', ['script'], ["log('3')"], ["log('2')"], ['1']),
      fr('Line 4 is synchronous, so <b>4</b> is printed. Two callbacks are still waiting.', 4, 'ok', ['script', "log('4')"], ["log('3')"], ["log('2')"], ['1', '4']),
      fr('The script ends and the call stack is empty. Rule: <b>empty the microtask queue first</b>. The promise callback runs and prints <b>3</b>.', 3, 'ok', ["log('3')"], [], ["log('2')"], ['1', '4', '3']),
      fr('Microtasks are done. Now the loop takes <b>one</b> macrotask: the timer callback prints <b>2</b>.', 2, 'ok', ["log('2')"], [], [], ['1', '4', '3', '2']),
      fr('Final output: <b>1, 4, 3, 2</b>. Say it as a rule: synchronous code, then all microtasks, then one macrotask, and repeat. <code>await</code> uses the same microtask queue.', 0, '', [], [], [], ['1', '4', '3', '2'])
    ];
  } },
  examples: [
    { title: 'Runtime validation with a schema (one source of truth)', html: `<p>A schema library such as Zod describes the shape once. You get a run-time check and the TypeScript type from the same definition, so they cannot drift apart.</p>${C(`
      import { z } from 'zod';

      const CustomerSchema = z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        tier: z.enum(['A', 'B', 'C']),
      });
      type Customer = z.infer<typeof CustomerSchema>;

      const customer = CustomerSchema.parse(await res.json());   // throws if the response is wrong
      const result = CustomerSchema.safeParse(json);             // returns success or error, no throw
      `)}` },
    { title: 'as, satisfies and as const', html: `<p><code>as</code> tells the compiler "trust me", so it can hide a real mistake. <code>satisfies</code> checks the value against a type but keeps the exact types of the value. <code>as const</code> freezes literals.</p>${C(`
      const routes = { home: '/', orders: '/orders' } satisfies Record<string, string>;
      routes.home;            // type is exactly '/', and a typo in a key is still caught

      const sizes = ['S', 'M', 'L'] as const;
      type Size = (typeof sizes)[number];        // 'S' | 'M' | 'L'

      const input = document.getElementById('q') as HTMLInputElement;   // you take the risk
      `)}` },
    { title: 'Debounce: a closure question in disguise', html: `<p>Debounce waits until the user stops typing. The returned function <b>remembers</b> the timer variable between calls. That memory is a closure.</p>${C(`
      function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        return (...args: A) => {
          clearTimeout(timer);                       // cancel the previous wait
          timer = setTimeout(() => fn(...args), ms); // start a new one
        };
      }
      const search = debounce((text: string) => console.log('search', text), 300);
      `)}` }
  ],
  deepDive: `<p><b>What <code>strict</code> contains.</b> It is a bundle: <code>strictNullChecks</code>, <code>noImplicitAny</code>, <code>strictFunctionTypes</code>, <code>strictBindCallApply</code>, <code>strictPropertyInitialization</code>, <code>noImplicitThis</code>, <code>alwaysStrict</code> and <code>useUnknownInCatchVariables</code>. Two useful flags are <b>not</b> in the bundle and must be added by hand: <code>noUncheckedIndexedAccess</code> (reading <code>arr[i]</code> gives <code>T | undefined</code>) and <code>exactOptionalPropertyTypes</code>.</p>
    <p><b>Keeping the contract in sync with .NET.</b> Let ASP.NET Core publish an OpenAPI document and generate the TypeScript types or client from it in the build (for example with <code>openapi-typescript</code> or NSwag). A renamed property on the server then breaks the front-end build instead of breaking a user. Generated types still describe a hope, so validate the responses you cannot afford to get wrong.</p>
    <p><b>Erasable syntax.</b> Most TypeScript can be removed by deleting the type parts. A few features generate real code: <code>enum</code>, <code>namespace</code> and constructor parameter properties. Newer Node.js versions can run <code>.ts</code> files by stripping types, and that only works for erasable syntax. The <code>erasableSyntaxOnly</code> compiler option enforces it. This is one more reason teams prefer literal unions over enums.</p>
    <p><b>Errors.</b> With <code>useUnknownInCatchVariables</code>, the variable in <code>catch (e)</code> is <code>unknown</code>. Narrow it with <code>instanceof</code> before reading <code>e.message</code>.</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant can write a fetch wrapper, a schema and a debounce in seconds, and it can turn an OpenAPI file into a client. <b>Where AI goes wrong:</b> it writes <code>(await res.json()) as Customer</code> and calls that "type safe", it forgets the 204 and the non-JSON error body, and it explains the event loop order wrongly for mixed <code>await</code> and timer code. <b>Use it as a partner:</b> ask "list every place in this file where untrusted data becomes a typed value" and review each one. <b>What you must still own:</b> where the trust boundary is, what happens when validation fails (log, show a message, fall back), and the rule that tokens and other secrets never go into a prompt or a log line.</p>`
});

// ---------- TOPIC 3 ----------
var RX_HOOKS = "import { useEffect, useState } from 'react';\n\ntype User = { id: string; name: string };\n\n// Custom hook: reusable logic. The name starts with 'use' and it may call other hooks.\nfunction useDebouncedValue<T>(value: T, ms = 300): T {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const timer = setTimeout(() => setDebounced(value), ms);\n    return () => clearTimeout(timer);            // cleanup: cancel the old timer\n  }, [value, ms]);\n  return debounced;\n}\n\nexport function TeamUsers({ teamId }: { teamId: string }) {\n  const [users, setUsers] = useState<User[]>([]);\n  const [error, setError] = useState<string | null>(null);\n\n  useEffect(() => {\n    const ctrl = new AbortController();\n    fetch('/api/teams/' + encodeURIComponent(teamId) + '/users', { signal: ctrl.signal })\n      .then((res) => {\n        if (!res.ok) throw new Error('HTTP ' + res.status);\n        return res.json() as Promise<User[]>;\n      })\n      .then(setUsers)\n      .catch((e: unknown) => {\n        // An aborted request is not a real error, so do not show it.\n        if (e instanceof DOMException && e.name === 'AbortError') return;\n        setError(String(e));\n      });\n    return () => ctrl.abort();                   // cleanup: cancel the request for the old teamId\n  }, [teamId]);                                  // run again only when teamId changes\n\n  if (error) return <p role=\"alert\">{error}</p>;\n  return (\n    <ul>\n      {users.map((u) => (\n        <li key={u.id}>{u.name}</li>\n      ))}\n    </ul>\n  );\n}";

topics.push({
  title: 'React: Rendering, Hooks and Effects',
  analogy: `<p>Think of a <b>scoreboard operator</b> at a cricket match. The operator does not repaint the whole board after every ball. They look at the new score, compare it with what the board shows, and change only the digits that differ. React works the same way. Your component describes what the screen should look like for the current data. React compares that with the last description and touches only the parts of the page that changed.</p>`,
  explain: `<p><b>The plain idea:</b> in React the screen is a result of the data: <code>UI = f(state, props)</code>. You never write "find that label and change its text". You change the data, and React re-runs your component function to get a new description of the screen.</p>
    <p>One update has three steps:</p>
    <ol>
      <li><b>Trigger.</b> Something calls a state setter, for example <code>setCount</code>.</li>
      <li><b>Render.</b> React calls the component function again. The result is a tree of plain objects that describe the UI (people call it the virtual DOM). Nothing on the page has changed yet.</li>
      <li><b>Commit.</b> React compares the new tree with the previous one (this comparison is called <b>reconciliation</b>) and applies only the differences to the real page.</li>
    </ol>
    <p><b>Words to know:</b></p>
    <ul>
      <li><b>Props</b> are inputs passed from the parent. They are read-only.</li>
      <li><b>State</b> is data the component remembers between renders. Changing it causes a re-render.</li>
      <li><b>Hooks</b> are functions starting with <code>use</code> that let a function component use React features: <code>useState</code> for memory, <code>useEffect</code> to sync with something outside React, <code>useRef</code> for a value that should not cause a render.</li>
      <li><b>Effect</b> is code that runs <i>after</i> the screen is updated, such as starting a subscription. It can return a <b>cleanup</b> function.</li>
    </ul>
    <p><b>Rule that surprises beginners:</b> calling <code>setCount</code> does not change the <code>count</code> variable in the code that is running. Each render has its own fixed copy. The new value appears in the next render.</p>`,
  clues: ['"Explain the virtual DOM" / "What is reconciliation?"', '"Why do we need keys in a list?"', '"What does the dependency array of <code>useEffect</code> do?"', '"Why does my state show the old value right after I set it?" → each render has its own values', '"What are the rules of hooks?"', '"<code>useMemo</code> vs <code>useCallback</code>" / "<code>useEffect</code> vs <code>useLayoutEffect</code>"', '"Why does my effect run twice in development?" → StrictMode', '"What is a stale closure?"'],
  code: [{ lang: 'tsx', check: false, title: 'A custom hook and a fetch effect with cleanup', code: RX_HOOKS }],
  codeTitle: ['Effects with cleanup, and logic pulled into a custom hook'],
  viz: stepViz('One click through React: trigger, render, commit, effect', 'tsx',
    "function Counter() {\n  const [count, setCount] = useState(0);\n  useEffect(() => {\n    document.title = 'Clicked ' + count;\n    return () => console.log('cleanup', count);\n  }, [count]);\n  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;\n}",
    [
      [1, '<b>First render (mount).</b> React calls the <code>Counter</code> function. Nothing is on the page yet.', { phase: 'render 1', 'state kept by React': '(none)', 'button on page': '(none)', 'page title': '(old)' }],
      [2, '<code>useState(0)</code>: React creates a memory slot for this component and stores 0 in it. This render sees <code>count = 0</code>.', { phase: 'render 1', 'state kept by React': 0, 'count in this render': 0, 'button on page': '(none)' }],
      [3, '<code>useEffect</code> only <b>registers</b> the effect. It does not run during render. Render must stay pure: same input, same output, no side effects.', { phase: 'render 1', 'effect': 'registered, waiting', 'deps': '[0]' }],
      [7, 'The function returns a description: "a button with text 0". <b>Commit:</b> there was no previous tree, so React creates the real button.', { phase: 'commit 1', 'button on page': '0', 'page title': '(old)' }, null, 'ok'],
      [4, 'After the browser has painted, React runs the effect. The page title is now in sync with the state.', { phase: 'effect 1', 'button on page': '0', 'page title': 'Clicked 0' }, null, 'ok'],
      [7, '<b>Trigger.</b> The user clicks. <code>setCount(c =&gt; c + 1)</code> does not change <code>count</code> here. It asks React to render again with the new value.', { phase: 'trigger', 'count in render 1': '0 (never changes)', 'queued update': 'c => c + 1' }],
      [2, '<b>Render 2.</b> React calls <code>Counter</code> again. This time <code>useState</code> returns 1 from the memory slot.', { phase: 'render 2', 'state kept by React': 1, 'count in this render': 1 }],
      [7, 'New description: "a button with text 1". React compares it with the old one. Same button, different text. <b>Commit:</b> only the text node is changed.', { phase: 'commit 2', 'button on page': '1', 'DOM work': 'one text update' }, null, 'ok'],
      [5, 'Dependencies changed from [0] to [1]. Before running the new effect, React runs the <b>cleanup of the old one</b>. It logs "cleanup 0", because that function was created in render 1 and still sees render 1 values.', { phase: 'cleanup of effect 1', 'console': 'cleanup 0' }, null, 'bad'],
      [4, 'Then the new effect runs and the title becomes "Clicked 1". The cycle is always: trigger, render, commit, cleanup, effect.', { phase: 'effect 2', 'button on page': '1', 'page title': 'Clicked 1' }, null, 'ok']
    ], 'React at this step'),
  examples: [
    { title: 'Props down, events up', html: `<p>A parent owns the data and passes it down. The child tells the parent what happened by calling a function it received.</p>${C(`
      type QtyProps = { value: number; onChange: (next: number) => void };

      function Qty({ value, onChange }: QtyProps) {
        return <button onClick={() => onChange(value + 1)}>Qty {value}</button>;
      }

      function Cart() {
        const [qty, setQty] = useState(1);
        return <Qty value={qty} onChange={setQty} />;
      }
      `)}` },
    { title: 'Never mutate state', html: `<p>React decides whether state changed by comparing the old and new reference. If you push into the same array, the reference is the same and React may skip the render.</p>${C(`
      // Wrong: same array, React sees no change
      items.push(newItem); setItems(items);

      // Right: a new array
      setItems(prev => [...prev, newItem]);
      setUser(prev => ({ ...prev, name: 'Asha' }));
      `)}` },
    { title: 'The three dependency arrays', html: `${H.table(['Written as', 'The effect runs', 'Typical use'], [
      ['<code>useEffect(fn)</code>', 'after every render', 'almost never what you want'],
      ['<code>useEffect(fn, [])</code>', 'once after the first render (twice in development StrictMode)', 'subscribe to something for the whole life of the component'],
      ['<code>useEffect(fn, [a, b])</code>', 'after the first render and whenever <code>a</code> or <code>b</code> changed', 'sync with something that depends on those values']
    ])}<p>Every value from the component that the effect reads belongs in the array. Keep the <code>exhaustive-deps</code> lint rule on.</p>` }
  ],
  deepDive: `<p><b>Keys and identity.</b> During reconciliation React matches children by position and by <code>key</code>. A stable key (a database id) lets React keep the right DOM node and the right state with the right item when a list is sorted or filtered. An index key breaks this: delete row 0 and every remaining row inherits the state of the row before it.</p>
    <p><b>Batching and concurrency.</b> Since React 18, several state updates in the same tick are batched into one render, also inside promises and timers. Updates can be marked as not urgent with <code>startTransition</code> or <code>useDeferredValue</code>, so typing stays responsive while a heavy list catches up. Rendering can be paused and restarted, which is why render must be pure.</p>
    <p><b>StrictMode.</b> In development React mounts, unmounts and mounts each component again, and runs effects twice, to expose missing cleanups. Production runs once. If an effect breaks when run twice, it was already fragile.</p>
    <p><b>React 19.</b> <code>ref</code> is a normal prop for function components, so <code>forwardRef</code> is no longer needed. The <code>use</code> function reads a promise or a context during render and, unlike hooks, may be called inside a condition. Actions with <code>useActionState</code> and <code>useOptimistic</code> handle form submissions. The React Compiler, a separate build tool that reached version 1.0 in late 2025, adds memoization automatically.</p>
    <p><b>You may not need an effect.</b> Values you can calculate from props or state should be calculated during render, not copied into state by an effect. Effects are for syncing with things outside React.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants generate components, hooks and tests quickly, and are useful for explaining an unfamiliar hook. <b>Where AI goes wrong:</b> it often writes a <code>useEffect</code> that fetches without cleanup, leaves values out of the dependency array, copies props into state, and wraps everything in <code>useMemo</code> "for performance". Much of its training data is older class-component or React 16 code, so check that it uses current APIs. <b>Use it as a partner:</b> ask "which values does this effect read that are missing from its dependencies?" or "can this effect be removed?". <b>What you must still own:</b> the mental model of render, commit and effect. Without it you cannot tell a correct generated component from one that only works on the happy path.</p>`,
  problems: [P({
    t: 'The timer that never goes past 1', l: 'Medium', tags: ['react', 'hooks', 'closure'],
    s: 'A component starts a timer with <code>useEffect(() =&gt; { const id = setInterval(() =&gt; setSeconds(seconds + 1), 1000); return () =&gt; clearInterval(id); }, [])</code>. The screen shows 1 and then stops changing. Explain why and give two fixes.',
    ex: '<p>The effect ran once, in the first render, when <code>seconds</code> was 0. The interval callback was created in that render. Every tick computes <code>0 + 1</code>.</p>',
    weak: 'State updates are asynchronous, so I would add a small delay or call setSeconds twice.',
    why: 'It guesses at timing. The real cause is that the callback closed over the value from the first render and never sees a newer one.',
    q: ['Which change fixes the timer without restarting the interval every second?', ['Add <code>seconds</code> to the dependency array', 'Use the updater form <code>setSeconds(s =&gt; s + 1)</code>', 'Wrap the callback in <code>useCallback</code> with an empty array', 'Replace <code>useEffect</code> with <code>useLayoutEffect</code>'], 1, 'The updater form receives the latest state from React, so the callback does not need to read the outer variable at all.'],
    h: ['Ask which render created the function that the interval keeps calling.', 'That function captured <code>seconds</code> from that render. What value was it?', 'Either stop reading the captured variable (updater form) or make the effect re-run when the variable changes (dependency array), and say the cost of each.'],
    a: `<p>This is a <b>stale closure</b>. The empty dependency array means the effect runs once, after the first render. The interval callback was created in that render, where <code>seconds</code> was 0, and it keeps that value forever. So each tick sets the state to 0 + 1.</p>
      <p><b>Fix 1 (best here):</b> use the updater form, <code>setSeconds(s =&gt; s + 1)</code>. React passes in the latest value, so the callback reads nothing from the old render and the interval is created once.</p>
      <p><b>Fix 2:</b> add <code>seconds</code> to the dependency array. It is correct, but the interval is cleared and created again every second.</p>
      <p>I would also point out that the <code>exhaustive-deps</code> lint rule flags this exact line, so the team should have it switched on as an error.</p>`,
    cx: 'you name the stale closure, explain it with "each render has its own values", give the updater fix and its trade-off against the dependency fix, and mention the lint rule.',
    f: ['When would you store the latest value in a <code>useRef</code> instead?', 'What does <code>useEffectEvent</code> solve?']
  })]
});

// ---------- TOPIC 4 ----------
var RX_QUERY = "import { memo, useState } from 'react';\nimport { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';\n\ntype Customer = { id: string; name: string };\ntype Page<T> = { items: T[]; hasMore: boolean };\n\nasync function getJson<T>(url: string, init?: RequestInit): Promise<T> {\n  const res = await fetch(url, init);\n  if (!res.ok) throw new Error('HTTP ' + res.status);\n  return (await res.json()) as T;\n}\n\n// Rows are memoised: a row re-renders only when its own customer object changes.\nconst CustomerRow = memo(function CustomerRow({ customer }: { customer: Customer }) {\n  return <li>{customer.name}</li>;\n});\n\nexport function CustomerList({ search }: { search: string }) {\n  const [page, setPage] = useState(1);\n  const queryClient = useQueryClient();\n\n  const customers = useQuery({\n    queryKey: ['customers', { page, search }],          // the cache key: a new key means a new fetch\n    queryFn: ({ signal }) =>\n      getJson<Page<Customer>>('/api/customers?page=' + page + '&q=' + encodeURIComponent(search), { signal }),\n    staleTime: 60_000,                                  // treat the data as fresh for 60 seconds\n    placeholderData: keepPreviousData,                  // keep the old page on screen while the next loads\n  });\n\n  const addCustomer = useMutation({\n    mutationFn: (name: string) =>\n      getJson<Customer>('/api/customers', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ name }),\n      }),\n    // After a successful write, mark every customers list as out of date so it refetches.\n    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),\n  });\n\n  if (customers.isPending) return <p>Loading</p>;\n  if (customers.isError) return <p role=\"alert\">Could not load customers.</p>;\n\n  return (\n    <section>\n      <ul>\n        {customers.data.items.map((c) => (\n          <CustomerRow key={c.id} customer={c} />\n        ))}\n      </ul>\n      <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</button>\n      <button disabled={!customers.data.hasMore} onClick={() => setPage((p) => p + 1)}>Next</button>\n      <button disabled={addCustomer.isPending} onClick={() => addCustomer.mutate('New customer')}>Add</button>\n    </section>\n  );\n}";

topics.push({
  title: 'React: State Choices, Performance, Forms, Routing and Testing',
  analogy: `<p>Think of where you keep things at home. Your keys go in your pocket (only you need them). The TV remote stays in the living room (the family shares it). The house address is painted on the gate (everyone, including visitors, can read it). Milk is in the shop and you keep a carton in the fridge, knowing it goes stale. State in a React app works the same way. The skill is to keep each piece of data in the <b>smallest place that still reaches everyone who needs it</b>.</p>`,
  explain: `<p><b>The plain idea:</b> most React problems at scale are "state in the wrong place". Put it too high and the whole app re-renders on every keystroke. Put it too low and you copy it around and it goes out of sync.</p>
    ${H.table(['Kind of state', 'Home analogy', 'Where it belongs'], [
      ['Used by one component', 'keys in your pocket', '<code>useState</code> in that component'],
      ['Shared by a few siblings', 'remote in the living room', 'lift it up to the closest common parent'],
      ['Rarely changing app-wide values (user, theme, language)', 'address on the gate', 'Context'],
      ['Data owned by the server (customers, orders)', 'milk from the shop', 'a server-state library such as TanStack Query'],
      ['Something a user should be able to share or bookmark (filters, page, tab)', 'a note on the front door', 'the URL'],
      ['Complex client state with many updates', 'a shared family calendar', 'a store such as Redux Toolkit or Zustand'],
      ['Large forms', 'a paper form you fill before handing it in', 'a form library such as React Hook Form']
    ])}
    <p><b>Server state is special.</b> It is a copy of data that lives somewhere else, so it can be out of date. A server-state library gives you caching, sharing of one request between components, refetching, retries and loading and error flags, so you do not write them by hand in every component.</p>
    <p><b>Performance in one sentence:</b> a component re-renders when its own state changes, when its parent re-renders, or when a context it reads changes. First measure with the React DevTools Profiler, then reduce how many components re-render and how much each one does.</p>`,
  clues: ['"Context vs Redux, when do you use which?"', '"What is the difference between server state and client state?"', '"Typing in this input is slow, how do you fix it?" → profile, move state down, memo, virtualise', '"How do you render 10,000 rows?" → virtualisation', '"Controlled vs uncontrolled inputs"', '"How do you protect a route?" → guard component, and the API must still check', '"What do you test in a component?" → behaviour the user sees', '"What does an error boundary not catch?"'],
  code: [{ lang: 'tsx', check: false, title: 'Server state with TanStack Query, memoised rows, paging', code: RX_QUERY }],
  codeTitle: ['A list screen: query, mutation, invalidation, paging'],
  viz: [flowViz('Why the page lags: who re-renders when state changes', 'Component tree of a search page',
    [{ id: 'App', label: 'App', x: 50, y: 6, shape: 'box' }, { id: 'Header', label: 'Header', x: 20, y: 24, shape: 'box' }, { id: 'Page', label: 'SearchPage', x: 65, y: 24, shape: 'box' }, { id: 'Box', label: 'SearchBox', x: 42, y: 42, shape: 'box' }, { id: 'List', label: 'ResultList', x: 82, y: 42, shape: 'box' }, { id: 'R1', label: 'Row 1', x: 70, y: 60, shape: 'box' }, { id: 'R2', label: 'Row 1000', x: 92, y: 60, shape: 'box' }],
    [['App', 'Header'], ['App', 'Page'], ['Page', 'Box'], ['Page', 'List'], ['List', 'R1'], ['List', 'R2']],
    [
      ['A search page with 1,000 result rows. The text of the search box is kept in <b>App</b>, at the very top.', { App: 'sel' }, {}, { App: 'state: query' }],
      ['The user types one letter. <code>setQuery</code> runs in App, so <b>App re-renders</b>.', { App: 'cur' }, {}, { App: 'state: query' }],
      ['A parent re-render re-renders every child by default. Header, the page, the list and all 1,000 rows run again <b>on every keystroke</b>. The DOM may not change, but calling 1,000 functions and comparing the output takes time.', { App: 'bad', Header: 'bad', Page: 'bad', Box: 'bad', List: 'bad', R1: 'bad', R2: 'bad' }, {}, { App: 'state: query' }],
      ['<b>Fix 1: move state down.</b> Only the search page needs the text. Now Header is never touched.', { Header: 'done', Page: 'bad', Box: 'bad', List: 'bad', R1: 'bad', R2: 'bad' }, {}, { Page: 'state: query' }],
      ['<b>Fix 2: keep fast state local, pass a debounced value up.</b> SearchBox owns the text. The page only learns the value 300 ms after typing stops. A keystroke now re-renders one small component.', { Header: 'done', Page: 'done', Box: 'ok', List: 'done', R1: 'done', R2: 'done' }, {}, { Box: 'state: text', Page: 'debounced query' }],
      ['<b>Fix 3: memoise rows.</b> When new results arrive the list re-renders, but rows wrapped in <code>memo</code> with a stable <code>key</code> and unchanged props are skipped. With the React Compiler this is often done for you.', { Header: 'done', Page: 'cur', Box: 'done', List: 'cur', R1: 'done', R2: 'ok' }, {}, { R1: 'same props: skipped', R2: 'new data: renders' }],
      ['<b>Fix 4: virtualise.</b> Render only the 20 or so rows that are visible, with a library such as TanStack Virtual. The order matters: measure, move state, memoise, virtualise.', { List: 'ok', R1: 'ok', R2: 'done' }, {}, { List: 'renders visible rows only', R2: 'not mounted' }]
    ], 66),
  rowViz('Where should this state live?', 'State placement decisions for an order screen', ['Piece of state', 'Who needs it', 'Put it in', 'Why'],
    [
      ['Is the dropdown open?', 'one component', 'useState', 'nobody else cares'],
      ['Selected order id', 'list and details panel', 'closest common parent', 'two siblings must agree'],
      ['Signed-in user, theme', 'whole app, changes rarely', 'Context', 'avoids passing props through 6 levels'],
      ['Orders from the API', 'many screens', 'TanStack Query cache', 'it is a copy of server data and goes stale'],
      ['Filter, sort, page number', 'the user and anyone they send the link to', 'URL search params', 'refresh and share must keep it'],
      ['Multi-step order draft with undo', 'many components, many updates', 'a store (Redux Toolkit, Zustand)', 'selectors limit re-renders, logic is testable'],
      ['20 form fields with validation', 'the form', 'React Hook Form + schema', 'no re-render of the page per keystroke']
    ],
    ['We place 7 pieces of state for an order screen, one at a time. The question each time: who needs it, and how often does it change?', 'Start as local as possible.', 'Shared by two siblings: lift it one level, no further.', 'Context suits values that are read widely and changed rarely. Every reader re-renders when it changes.', 'Server data is not really "your" state. Let a cache library own it.', 'If refresh or a shared link should keep it, the URL is the right store.', 'Reach for a store only when the client-side logic is truly complex.', 'Forms are their own world: a form library keeps typing fast.'],
    'Rule to say out loud: keep state as close as possible to where it is used, keep server data in a cache, keep shareable state in the URL.', [3, 4])],
  examples: [
    { title: 'A form with a schema (React Hook Form + Zod)', html: `<p>The schema is the single source of rules. The form library keeps inputs <b>uncontrolled</b> (the DOM holds the value), so typing does not re-render the whole form.</p>${C(`
      const schema = z.object({ name: z.string().min(2), email: z.string().email() });
      type FormValues = z.infer<typeof schema>;

      const { register, handleSubmit, formState: { errors, isSubmitting } } =
        useForm<FormValues>({ resolver: zodResolver(schema) });

      <form onSubmit={handleSubmit(async (values) => { await save(values); })}>
        <label htmlFor="name">Name</label>
        <input id="name" {...register('name')} aria-invalid={!!errors.name} />
        {errors.name && <span role="alert">{errors.name.message}</span>}
        <button disabled={isSubmitting}>Save</button>
      </form>
      `)}` },
    { title: 'Code splitting with lazy and Suspense', html: `<p>A heavy chart should not be downloaded by users who never open that tab. <code>lazy</code> loads it on first use and <code>Suspense</code> shows a fallback meanwhile.</p>${C(`
      const SalesChart = lazy(() => import('./SalesChart'));

      <Suspense fallback={<Spinner />}>
        <SalesChart data={data} />
      </Suspense>
      `)}<p>Route-level lazy loading gives the biggest win for the least work.</p>` },
    { title: 'A test that checks what the user sees', html: `<p>Use Vitest with React Testing Library. Find elements the way a user would (by role and label), and fake the network with Mock Service Worker instead of mocking your own hooks.</p>${C(`
      it('shows a validation error when name is empty', async () => {
        render(<CustomerForm onSubmit={vi.fn()} />);
        await userEvent.click(screen.getByRole('button', { name: /save/i }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/name/i);
      });
      `)}` }
  ],
  deepDive: `<p><b>Context is not a state manager.</b> It is a way to pass a value down without props. When the value changes, every component that reads it re-renders, and there is no built-in selector. Split contexts by how often they change, keep the provider value stable, and move fast-changing shared data to a store with selectors.</p>
    <p><b>Optimistic updates.</b> For a snappy UI, update the cache before the server answers: in <code>onMutate</code> cancel running queries, save a snapshot and write the new value; in <code>onError</code> restore the snapshot; in <code>onSettled</code> invalidate so the truth is refetched. React 19 also has <code>useOptimistic</code> for the same idea inside a form action.</p>
    <p><b>Error boundaries.</b> A boundary catches errors thrown while rendering its children and shows a fallback. It does not catch errors in event handlers, in async code such as a rejected fetch, or in the boundary itself. It still has to be a class component, so most teams use the <code>react-error-boundary</code> package. Place one around each route so one broken widget does not blank the whole app.</p>
    <p><b>Routing and security.</b> A guard component that redirects signed-out users is a convenience for the user. It is not security, because all front-end code can be changed in the browser. The API must check the token and the permissions on every request.</p>
    <p><b>Starting a project in 2026.</b> Create React App is deprecated. Use Vite for a client-rendered app, or a framework (Next.js, React Router in framework mode) when you need server rendering.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants scaffold a list screen with query, paging and a form in one prompt, and write a first set of Testing Library tests. <b>Where AI goes wrong:</b> it puts server data in <code>useState</code> plus <code>useEffect</code>, creates one giant context for everything, uses array index keys, and writes tests that check implementation details (state values, class names) instead of what the user sees. It also mixes TanStack Query version 4 and 5 names. <b>Use it as a partner:</b> paste a Profiler result and ask what causes the commits, or ask for edge-case tests (empty list, 500 error, slow network). <b>What you must still own:</b> the decision of where each piece of state lives, the performance budget, and accessibility, which generated UI regularly gets wrong.</p>`
});

// ---------- TOPIC 5 ----------
var NG_LIST = "import { ChangeDetectionStrategy, Component, Injectable, inject, input, output, signal } from '@angular/core';\nimport { takeUntilDestroyed } from '@angular/core/rxjs-interop';\nimport { HttpClient } from '@angular/common/http';\nimport { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';\n\ntype User = { id: string; name: string };\ntype Page<T> = { items: T[] };\n\n// A service: logic with no screen. providedIn 'root' means one shared instance for the app.\n@Injectable({ providedIn: 'root' })\nexport class UserService {\n  private readonly http = inject(HttpClient);\n  search(q: string) {\n    return this.http.get<Page<User>>('/api/users', { params: { q } });\n  }\n}\n\n// A child component with a signal input and an output.\n@Component({\n  selector: 'app-user-row',\n  changeDetection: ChangeDetectionStrategy.OnPush,\n  template: `<button type=\"button\" (click)=\"selected.emit(user())\">{{ user().name }}</button>`,\n})\nexport class UserRow {\n  readonly user = input.required<User>();\n  readonly selected = output<User>();\n}\n\n// Standalone is the default in current Angular: the component lists what its template uses.\n@Component({\n  selector: 'app-user-list',\n  imports: [UserRow],\n  changeDetection: ChangeDetectionStrategy.OnPush,\n  template: `\n    <input #box aria-label=\"Search users\" (input)=\"search$.next(box.value)\" />\n    @if (loading()) {\n      <p>Loading</p>\n    }\n    @for (u of users(); track u.id) {\n      <app-user-row [user]=\"u\" (selected)=\"open($event)\" />\n    } @empty {\n      <p>No users</p>\n    }\n  `,\n})\nexport class UserList {\n  private readonly api = inject(UserService);\n  protected readonly search$ = new Subject<string>();\n  protected readonly users = signal<User[]>([]);\n  protected readonly loading = signal(false);\n\n  constructor() {\n    this.search$\n      .pipe(\n        debounceTime(300),                 // wait until typing pauses\n        distinctUntilChanged(),            // skip if the text is the same as last time\n        tap(() => this.loading.set(true)),\n        // switchMap cancels the previous request when a new search text arrives\n        switchMap((q) => this.api.search(q).pipe(catchError(() => of<Page<User>>({ items: [] })))),\n        takeUntilDestroyed(),              // unsubscribe when the component is destroyed\n      )\n      .subscribe((page) => {\n        this.users.set(page.items);\n        this.loading.set(false);\n      });\n  }\n\n  protected open(user: User) {\n    console.log('open', user.id);\n  }\n}";

topics.push({
  title: 'Angular: Components, DI, RxJS, Signals and Change Detection',
  analogy: `<p>React is like buying a good engine and choosing the rest of the car yourself. Angular is like buying a <b>fully fitted office building</b>. The reception desk (router), the mail room (HTTP client), the forms department and the staff directory (dependency injection) are already there, and every team uses them the same way. You give up some freedom, and in return a new joiner can walk into any Angular project and know where things are.</p>`,
  explain: `<p><b>The plain idea:</b> Angular is a complete framework written in TypeScript. The pieces you need for a business application ship with it and work together.</p>
    ${H.table(['Building block', 'Plain meaning'], [
      ['Component', 'A piece of screen: a class (data and behaviour) plus an HTML template'],
      ['Template syntax', '<code>{{ x }}</code> shows a value, <code>[prop]</code> passes data down, <code>(event)</code> listens, <code>@if</code> and <code>@for</code> control what is shown'],
      ['Service', 'A class with logic and no screen, for example API calls. Shared through dependency injection'],
      ['Dependency injection (DI)', 'You ask for what you need (<code>inject(UserService)</code>) and Angular hands you the instance. You do not create it yourself'],
      ['Standalone component', 'A component that lists its own imports. This is the default now; NgModules are the older grouping style and still work'],
      ['RxJS', 'A library for streams of values over time (key presses, HTTP responses). You shape the stream with operators'],
      ['Signal', 'A box that holds a value and tells Angular when it changes. Read it by calling it: <code>count()</code>'],
      ['Change detection', 'How Angular notices that data changed and updates the page'],
      ['Router, forms, HttpClient', 'Built-in navigation with guards and lazy loading, form handling with validation, HTTP with interceptors']
    ])}
    <p><b>Modern Angular in one breath:</b> standalone components, the <code>inject()</code> function, built-in control flow (<code>@if</code>, <code>@for</code> with <code>track</code>, <code>@switch</code>, <code>@defer</code>), signals for state, RxJS for events and streams, functional guards and interceptors, and zoneless change detection. If you learned Angular with NgModules, <code>*ngIf</code> and zone.js, say that you know both styles and how to migrate.</p>`,
  clues: ['"Explain Angular architecture" / "What is a standalone component?"', '"<code>switchMap</code> vs <code>mergeMap</code> vs <code>concatMap</code> vs <code>exhaustMap</code>"', '"What is OnPush? When is a component checked?"', '"Signals vs RxJS, when do you use which?"', '"How do you prevent memory leaks from subscriptions?"', '"How do you attach a token to every request?" → HTTP interceptor', '"Template-driven vs reactive forms"', '"What is zone.js and what does zoneless mean?"', '"How do you lazy load a route and protect it?"'],
  code: [{ lang: 'ts', check: false, title: 'A standalone, OnPush, signal-based search list', code: NG_LIST }],
  codeTitle: ['Modern Angular: standalone component, inject(), signals, RxJS typeahead'],
  viz: [flowViz('A search box in Angular: from key press to screen', 'Typeahead pipeline (RxJS for the stream, a signal for the state)',
    [{ id: 'In', label: 'input box', x: 10, y: 10, shape: 'box' }, { id: 'Sub', label: 'search$ Subject', x: 36, y: 10, shape: 'box' }, { id: 'Deb', label: 'debounceTime(300)', x: 64, y: 10, shape: 'box' }, { id: 'Dis', label: 'distinctUntilChanged', x: 88, y: 28, shape: 'box' }, { id: 'Sw', label: 'switchMap', x: 64, y: 46, shape: 'box' }, { id: 'Api', label: 'interceptor + API', x: 36, y: 46, shape: 'box' }, { id: 'Sig', label: 'users signal', x: 10, y: 46, shape: 'box' }, { id: 'View', label: 'template', x: 10, y: 28, shape: 'box' }],
    [['In', 'Sub'], ['Sub', 'Deb'], ['Deb', 'Dis'], ['Dis', 'Sw'], ['Sw', 'Api'], ['Api', 'Sig'], ['Sig', 'View']],
    [
      ['The user types "a", "an", "ang" quickly. Each key press is pushed into a <b>Subject</b>, which is a stream you can push values into by hand.', { In: 'cur', Sub: 'cur' }, { 'In-Sub': 'ok' }, { Sub: 'a, an, ang' }],
      ['<code>debounceTime(300)</code> waits for 300 ms of silence. "a" and "an" are dropped. Only <b>"ang"</b> passes. Two API calls saved.', { Deb: 'cur' }, { 'Sub-Deb': 'ok' }, { Deb: 'passes: ang' }],
      ['<code>distinctUntilChanged</code> compares with the last value it let through. It is different, so it passes. If the user typed a letter and deleted it again, nothing would be sent.', { Dis: 'cur' }, { 'Deb-Dis': 'ok' }, { Dis: 'new value: pass' }],
      ['<code>switchMap</code> turns the text into an HTTP request and subscribes to it. Request 1 for "ang" is now in flight.', { Sw: 'cur', Api: 'cur' }, { 'Dis-Sw': 'ok', 'Sw-Api': 'ok' }, { Api: 'request 1: ang' }],
      ['Before the answer arrives the user types "angu". <code>switchMap</code> <b>unsubscribes from request 1</b>, which cancels it, and starts request 2. An old slow answer can never overwrite a newer one.', { Sw: 'cur', Api: 'bad' }, { 'Sw-Api': 'bad' }, { Api: 'request 1 cancelled, request 2: angu' }],
      ['On the way out an <b>HTTP interceptor</b> adds the Authorization header. The API answers request 2.', { Api: 'ok' }, { 'Sw-Api': 'ok' }, { Api: 'request 2: 200 OK' }],
      ['The subscriber stores the result with <code>users.set(page.items)</code>. The signal now holds the new list and notifies everything that reads it.', { Sig: 'ok' }, { 'Api-Sig': 'ok' }, { Sig: '3 users' }],
      ['The template reads <code>users()</code>, so Angular knows exactly this view must be updated. <code>@for ... track u.id</code> reuses the DOM rows that are still in the list. When the component is destroyed, <code>takeUntilDestroyed</code> ends the whole stream.', { View: 'ok', Sig: 'done' }, { 'Sig-View': 'ok' }, { View: 'updated' }]
    ], 58),
  rowViz('Change detection and performance tools, from oldest to newest', 'How Angular decides what to re-check', ['Tool', 'What triggers a check', 'What gets checked', 'Say this'],
    [
      ['Default strategy with zone.js', 'any async event anywhere: click, timer, HTTP response', 'the whole component tree, top to bottom', 'simple, but wasteful in big apps'],
      ['OnPush', 'a new input reference, an event in the component, an async pipe value, a signal it reads, markForCheck', 'only the marked component and its ancestors', 'requires immutable updates'],
      ['Signals', 'a signal that a template reads gets a new value', 'the views that read that signal', 'Angular knows who depends on what'],
      ['Zoneless', 'signals, template events, async pipe, markForCheck', 'only what was notified', 'no zone.js: smaller bundle, clearer stack traces'],
      ['track in @for', '(not a trigger)', 'keeps DOM rows for items that did not change', 'same job as keys in React'],
      ['@defer and lazy routes', '(not a trigger)', 'code is downloaded only when needed', 'smaller first load']
    ],
    ['Angular must find out which parts of the page are out of date. Here are the tools, in the order they appeared.', 'zone.js wraps browser async APIs. After any of them finishes, Angular checks every component. Easy for developers, more work for the browser.', 'OnPush tells Angular to skip a component unless one of a few specific things happened. Mutating an array in place does not count, which is the classic OnPush bug.', 'A signal records which templates read it. When it changes, Angular knows exactly what to update.', 'Without zone.js, Angular only runs change detection when something tells it to. Code that changes plain fields in a timer will no longer update the screen.', 'Not change detection itself, but it stops the DOM for a list being rebuilt.', 'Loading less code is the cheapest performance win.'],
    'Interview summary: OnPush plus signals is the modern baseline, and it is also what makes an app ready for zoneless.', [1, 2])],
  examples: [
    { title: 'Template syntax on one screen', html: `${C(`
      <h2>{{ title() }}</h2>                              <!-- interpolation: show a value -->
      <app-total [amount]="total()" />                    <!-- property binding: data goes down -->
      <button (click)="save()">Save</button>              <!-- event binding: events come up -->
      <input [(ngModel)]="name" />                        <!-- two-way binding (needs FormsModule) -->
      <li [class.active]="isActive()" [style.width.px]="width()"></li>

      @if (orders().length > 0) {
        @for (o of orders(); track o.id) { <app-order-row [order]="o" /> }
      } @else {
        <p>No orders yet</p>
      }
      `)}<p>The older <code>*ngIf</code> and <code>*ngFor</code> directives do the same job. You will still see them in existing code, so be able to read both.</p>` },
    { title: 'Signals: state, derived state, side effect', html: `${C(`
      readonly count = signal(0);                             // writable state
      readonly double = computed(() => this.count() * 2);     // derived, cached, recalculated only when count changes

      constructor() {
        effect(() => console.log('count is', this.count()));  // runs again whenever count changes
      }
      increment() { this.count.update(c => c + 1); }
      `)}<p>Use <code>computed</code> for anything you can calculate from other signals. Keep <code>effect</code> for talking to the outside world (logging, local storage), not for copying one signal into another.</p>` },
    { title: 'Lazy routes with a functional guard', html: `${C(`
      export const authGuard: CanActivateFn = () => {
        const auth = inject(AuthService);
        const router = inject(Router);
        return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
      };

      export const routes: Routes = [
        { path: '', pathMatch: 'full', redirectTo: 'orders' },
        { path: 'orders', canActivate: [authGuard],
          loadComponent: () => import('./orders/orders').then(m => m.Orders) },
        { path: 'admin', canMatch: [roleGuard('Admin')],
          loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES) },
        { path: '**', component: NotFound },
      ];
      `)}<p><code>loadComponent</code> and <code>loadChildren</code> put that code in a separate file that is downloaded on first visit. A guard hides screens. The API must still check permissions.</p>` },
    { title: 'A typed reactive form', html: `${C(`
      private readonly fb = inject(FormBuilder);
      readonly form = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
      });

      onSubmit() {
        if (this.form.invalid) { this.form.markAllAsTouched(); return; }
        this.api.create(this.form.getRawValue()).subscribe();   // value is typed: { name: string; email: string }
      }
      `)}` }
  ],
  deepDive: `<p><b>Injector hierarchy.</b> Angular looks for a dependency starting at the component and walking up: component and its parents (element injectors), then the route (if the route has <code>providers</code>), then the root. <code>providedIn: 'root'</code> gives one instance for the app and lets the build remove the service if nothing uses it. Listing a service in a component's <code>providers</code> gives each component instance its own copy. Use an <code>InjectionToken</code> for things that are not classes, such as a config object. <code>inject()</code> only works in an injection context: a constructor, a field initializer, a provider factory or a functional guard or interceptor body. Calling it later inside a callback throws.</p>
    <p><b>The four flattening operators.</b> All map a value to an inner stream. They differ in what happens when a new value arrives while the previous inner stream is still running: <code>switchMap</code> cancels the old one (search), <code>mergeMap</code> runs both (independent calls), <code>concatMap</code> waits and keeps order (saves in sequence), <code>exhaustMap</code> ignores the new one (double click on Save, login).</p>
    <p><b>Signals and RxJS together.</b> Signals hold state that always has a current value and is read synchronously. RxJS models events over time with operators for timing and cancellation. Bridge them with <code>toSignal(observable)</code> and <code>toObservable(signal)</code>.</p>
    <p><b>Zoneless.</b> With <code>provideZonelessChangeDetection()</code> Angular no longer depends on zone.js. It checks views when it is told to: a signal changed, a template event fired, the async pipe got a value, or <code>markForCheck</code> was called. Components that already work with OnPush are generally ready. Recent Angular versions create new projects without zone.js.</p>
    <p><b>Leaks.</b> A subscription to a long-lived stream keeps the component in memory after it is destroyed. Prefer the <code>async</code> pipe, <code>toSignal</code> or <code>takeUntilDestroyed()</code>.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants generate components, services, guards and tests, and can run through a migration (NgModules to standalone, <code>*ngIf</code> to <code>@if</code>) file by file. <b>Where AI goes wrong:</b> Angular changed a lot in a few years, and a large part of the training data is the old style. Expect generated code with NgModules, constructor injection everywhere, <code>*ngFor</code> without tracking, manual <code>subscribe</code> without cleanup, class-based guards and nested subscribes instead of a flattening operator. <b>Use it as a partner:</b> state the Angular version and the style in the prompt ("standalone, signals, OnPush, functional interceptors") and prefer the official migration schematics for bulk changes, with AI for the leftovers. <b>What you must still own:</b> choosing the right flattening operator, knowing what triggers change detection, and reviewing every subscription for cleanup.</p>`,
  problems: [P({
    t: 'Save is clicked twice and two orders are created', l: 'Medium', tags: ['angular', 'rxjs'],
    s: 'In an Angular order form, impatient users double-click Save and the API receives two POST requests, creating two orders. The click handler calls <code>this.api.create(value).subscribe()</code>. How do you stop the duplicate on the front end, and is that enough?',
    ex: '<p>Click 1 at 0 ms starts POST 1. Click 2 at 150 ms starts POST 2 while POST 1 is still running. Both succeed. The wanted behaviour: while a save is running, further clicks are ignored.</p>',
    weak: 'I would use switchMap so the second click cancels the first request.',
    why: 'Cancelling in the browser does not undo work on the server. The first POST may already have created the order, so you can still get two orders, and now the UI only knows about one.',
    q: ['Which operator ignores new clicks while the current save is still running?', ['<code>switchMap</code>', '<code>mergeMap</code>', '<code>concatMap</code>', '<code>exhaustMap</code>'], 3, 'exhaustMap drops new source values until the inner stream completes. concatMap would queue the second save and run it afterwards.'],
    h: ['Think of the clicks as a stream and the save as an inner stream. What should happen to a click that arrives while a save is running?', 'Compare the four flattening operators: cancel, run in parallel, queue, ignore.', 'Also disable the button while saving, and ask what protects the server if a retry or a second tab sends the same request.'],
    a: `<p>I treat the clicks as a stream and use <code>exhaustMap</code>, which ignores new clicks until the running save completes:</p>${C(`
      private readonly save$ = new Subject<OrderDraft>();
      readonly saving = signal(false);

      constructor() {
        this.save$.pipe(
          tap(() => this.saving.set(true)),
          exhaustMap(draft => this.api.create(draft).pipe(
            catchError(() => EMPTY),                 // keep the outer stream alive after an error
            finalize(() => this.saving.set(false)),
          )),
          takeUntilDestroyed(),
        ).subscribe();
      }
      `)}<p>I also bind <code>[disabled]="saving()"</code> on the button so the user sees that the save is in progress. That fixes the user experience, but it is not enough for correctness: a network retry, a second tab or a script can still send the request twice. So the API should accept an <b>idempotency key</b> (a unique id the client generates per save) and return the first result for a repeated key.</p>`,
    cx: 'you pick exhaustMap and can say why not switchMap or concatMap, you keep the stream alive on error, and you raise server-side idempotency without being asked.',
    f: ['Where exactly would you put <code>catchError</code> and why?', 'How would you implement the idempotency key in an ASP.NET Core API?']
  })]
});

// ================= INTERVIEW: TYPESCRIPT =================
interview.push({ q: 'What is TypeScript and why use it?', level: 'B',
  a: `<p>TypeScript is JavaScript with types added, and it is turned back into plain JavaScript before it runs.</p>
  <ul>
    <li><b>Superset:</b> every valid JavaScript file is also valid TypeScript. You add type notes such as <code>price: number</code>.</li>
    <li><b>Checked early:</b> the compiler and the editor read the types and report mistakes while you type, for example a misspelt property or a missing argument.</li>
    <li><b>Erased:</b> the types are removed in the build. The browser never sees them, so there is no type checking at run time.</li>
  </ul>
  <p><b>Why teams use it:</b> bugs are caught before the code runs, renaming and refactoring are safe, the editor can autocomplete, and the types work as a written contract between the front end and the API.</p>
  <p><b>The limit to mention:</b> because types are erased, data coming from outside (an API, a form, local storage) is not checked by TypeScript. It needs a real check at run time.</p>
  <blockquote><b>Say it in the interview:</b> TypeScript is a typed superset of JavaScript that compiles to JavaScript. It catches mistakes at build time, but the types are erased, so I still validate data that comes from outside.</blockquote>`,
  followUps: ['If types are erased, how do you check an API response?', 'What does the <code>strict</code> flag do?', 'Can Node.js run a TypeScript file directly?'] });

interview.push({ q: 'Which core types do you use every day, and what are <code>any</code>, <code>unknown</code>, <code>never</code> and <code>void</code>?', level: 'B',
  a: `<p>The everyday types are <code>string</code>, <code>number</code>, <code>boolean</code>, arrays, tuples, object shapes and unions, plus a few special ones.</p>
  ${C(`
  let id: number = 1;
  let tags: string[] = ['a', 'b'];               // same as Array<string>
  let pair: [string, number] = ['age', 30];      // tuple: fixed length and order
  let maybe: string | null = null;               // union
  type Status = 'draft' | 'active' | 'closed';   // union of exact values (literal types)
  `)}
  ${H.table(['Type', 'Meaning'], [
    ['<code>any</code>', 'Switches checking off for that value. Avoid it'],
    ['<code>unknown</code>', 'Could be anything, and you must check it before use. The safe version of any'],
    ['<code>never</code>', 'A value that can never exist: a function that always throws, or a case that should be impossible'],
    ['<code>void</code>', 'A function that returns nothing useful'],
    ['<code>null</code> / <code>undefined</code>', 'With strict null checks they are their own types and must be handled'],
    ['<code>Record&lt;K, V&gt;</code>', 'A dictionary with keys K and values V']
  ])}
  <blockquote><b>Say it in the interview:</b> I use unions and literal types a lot, I prefer unknown over any because it forces a check, and I use never to make the compiler prove I handled every case.</blockquote>`,
  followUps: ['What is the difference between <code>object</code>, <code>{}</code> and <code>Record&lt;string, unknown&gt;</code>?', 'When is a tuple better than an object?'] });

interview.push({ q: 'What is the difference between <code>interface</code> and <code>type</code>?', level: 'B',
  a: `<p>Both can give a name to an object shape, but a type alias can name any type at all, and an interface can be reopened and extended.</p>
  ${H.table(['', '<code>interface</code>', '<code>type</code>'], [
    ['Object shapes', 'yes', 'yes'],
    ['Unions, tuples, primitives', 'no', 'yes: <code>type Id = string | number</code>'],
    ['Mapped and conditional types', 'no', 'yes'],
    ['Extending', '<code>extends</code>', 'intersection with <code>&amp;</code>'],
    ['Declaration merging (two declarations with one name are combined)', 'yes', 'no, it is an error'],
    ['Classes can <code>implements</code> it', 'yes', 'yes, if it is an object shape']
  ])}
  ${C(`
  interface User { id: number; name: string; email?: string; readonly createdAt: Date }
  interface Admin extends User { permissions: string[] }

  type Result<T> = { ok: true; value: T } | { ok: false; error: string };
  `)}
  <p>A common team rule: <code>interface</code> for object contracts, <code>type</code> for everything else. The rule matters less than applying it the same way everywhere.</p>
  <blockquote><b>Say it in the interview:</b> For plain object shapes they are almost the same. I use interface for object contracts because it can be extended and merged, and type for unions, tuples and computed types.</blockquote>`,
  followUps: ['Where is declaration merging actually useful?', 'What do <code>?</code> and <code>readonly</code> mean on a property?'] });

interview.push({ q: 'Rapid fire: JavaScript basics that are asked together with TypeScript', level: 'B',
  a: `<p>TypeScript does not change how JavaScript runs, so interviewers check the JavaScript underneath.</p>
  ${H.table(['Question', 'Short answer'], [
    ['<code>var</code> vs <code>let</code> vs <code>const</code>?', '<code>var</code> is scoped to the function and can be used before its line (as undefined). <code>let</code> and <code>const</code> are scoped to the block and throw if used before their line (the temporal dead zone). <code>const</code> cannot be reassigned'],
    ['What is a closure?', 'A function that remembers the variables of the place where it was created, even after that place has finished running'],
    ['How is <code>this</code> decided?', 'By how the function is called, not where it is written. Arrow functions have no own <code>this</code> and use the one around them'],
    ['What are prototypes?', 'Every object links to another object it inherits from. <code>class</code> is a nicer syntax over that chain'],
    ['<code>==</code> vs <code>===</code>?', '<code>==</code> converts types before comparing, <code>===</code> does not. Use <code>===</code>'],
    ['When are two objects equal?', 'Only when they are the same reference. Two objects with the same fields are not equal']
  ])}
  <blockquote><b>Say it in the interview:</b> I use const by default, let when I must reassign, never var, and triple equals. A closure is a function plus the variables it remembers, and this depends on the call site unless it is an arrow function.</blockquote>`,
  followUps: ['Give an example of a bug caused by <code>this</code> in a callback.', 'What is hoisting?', 'How would you compare two objects by value?'] });

interview.push({ q: 'What are generics, and how do you constrain them?', level: 'I',
  a: `<p>A generic is a type with a blank in it, and the caller decides what goes in the blank, so one piece of code works for many types and stays type safe.</p>
  ${C(`
  function first<T>(items: T[]): T | undefined { return items[0]; }
  first([1, 2, 3]);                       // T is inferred as number

  interface ApiResponse<T> { data: T; error?: string }

  // Constraint: K must be a real key of T, and the return type is the type of that property
  function pick<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }

  class Repo<T extends { id: number }> {
    private items = new Map<number, T>();
    add(item: T) { this.items.set(item.id, item); }
    get(id: number): T | undefined { return this.items.get(id); }
  }
  `)}
  <ul>
    <li><b>Inference:</b> you rarely write the type argument. TypeScript works it out from the arguments.</li>
    <li><b>Constraint:</b> <code>T extends Something</code> limits what is allowed, so the code may use those members.</li>
    <li><b>Default:</b> <code>&lt;T = string&gt;</code> is used when nothing can be inferred.</li>
  </ul>
  <p>Coming from C#: the idea is the same as <code>List&lt;T&gt;</code> with <code>where T : IEntity</code>, but TypeScript generics exist only at compile time.</p>
  <blockquote><b>Say it in the interview:</b> Generics let me write one function or type that works for many types without losing type information. I add a constraint with extends when the code needs to use specific members.</blockquote>`,
  followUps: ['What does <code>keyof T</code> give you?', 'When does a generic add no value?', 'How do TypeScript generics differ from C# generics at run time?'] });

interview.push({ q: 'Explain narrowing, type guards and discriminated unions.', level: 'I',
  a: `<p>Narrowing means a check in your code makes a wide type smaller, so the compiler knows more inside that branch.</p>
  <ul>
    <li><b>Built-in checks:</b> <code>typeof x === 'string'</code>, <code>x instanceof Date</code>, <code>'radius' in shape</code>, comparing with <code>null</code>.</li>
    <li><b>Type guard:</b> your own function whose return type is <code>v is string</code>. The compiler trusts it.</li>
    <li><b>Discriminated union:</b> a union where every member has the same field with a different exact value. Checking that field tells the compiler which member you have.</li>
  </ul>
  ${C(`
  type Shape =
    | { kind: 'circle'; radius: number }
    | { kind: 'rect'; w: number; h: number };

  function area(s: Shape): number {
    switch (s.kind) {
      case 'circle': return Math.PI * s.radius ** 2;
      case 'rect':   return s.w * s.h;
      default: { const missed: never = s; return missed; }  // compile error if a case is missing
    }
  }

  function isString(v: unknown): v is string { return typeof v === 'string'; }
  `)}
  <p>This pattern is ideal for screen states (loading, success, error) and for action objects in a reducer.</p>
  <blockquote><b>Say it in the interview:</b> I model alternatives as a discriminated union with a kind field, switch on it, and add a never check so the compiler tells me when a new case is not handled.</blockquote>`,
  followUps: ['What happens if a type guard function lies?', 'Why can narrowing be lost inside a callback?'] });

interview.push({ q: 'Which utility types should you know, and what does each do?', level: 'I',
  a: `<p>Utility types are built-in tools that create a new type from an existing one, so you describe a model once and derive the variations.</p>
  ${H.table(['Utility', 'Result'], [
    ['<code>Partial&lt;T&gt;</code>', 'every property optional (a PATCH body)'],
    ['<code>Required&lt;T&gt;</code>', 'every property required'],
    ['<code>Readonly&lt;T&gt;</code>', 'every property read-only'],
    ['<code>Pick&lt;T, \'id\' | \'name\'&gt;</code>', 'only the listed properties'],
    ['<code>Omit&lt;T, \'email\'&gt;</code>', 'everything except the listed properties'],
    ['<code>Record&lt;string, number&gt;</code>', 'a dictionary'],
    ['<code>Exclude&lt;\'a\' | \'b\', \'a\'&gt;</code>', '<code>\'b\'</code>: removes members from a union'],
    ['<code>NonNullable&lt;string | null&gt;</code>', '<code>string</code>'],
    ['<code>ReturnType&lt;typeof fn&gt;</code>', 'the type a function returns'],
    ['<code>Parameters&lt;typeof fn&gt;</code>', 'a tuple of the parameter types'],
    ['<code>Awaited&lt;Promise&lt;string&gt;&gt;</code>', '<code>string</code>: what <code>await</code> gives you']
  ])}
  <p>Typical use: one <code>Product</code> type from the API, then <code>Omit&lt;Product, 'id'&gt;</code> for the create form and <code>Partial</code> of that for an update.</p>
  <blockquote><b>Say it in the interview:</b> I keep one source type and derive the rest with Pick, Omit and Partial, so a change to the model flows through the whole code base.</blockquote>`,
  followUps: ['How is <code>Partial</code> implemented?', 'Difference between <code>Omit</code> and <code>Exclude</code>?', 'Is <code>Readonly</code> deep or shallow?'] });

interview.push({ q: 'What do <code>as</code>, <code>satisfies</code>, the non-null <code>!</code> and <code>as const</code> do?', level: 'I',
  a: `<p>They are four ways to tell the compiler something about a value, and two of them switch a safety check off.</p>
  ${H.table(['Syntax', 'What it does', 'Risk'], [
    ['<code>value as T</code>', 'Type assertion: "treat this as T". No check at run time', 'High. It can hide a real mismatch'],
    ['<code>value!</code>', 'Non-null assertion: "this is not null or undefined"', 'High. A crash if you are wrong'],
    ['<code>as const</code>', 'Makes the value read-only and keeps exact literal types', 'None'],
    ['<code>satisfies T</code>', 'Checks the value against T but keeps the precise type of the value', 'None']
  ])}
  ${C(`
  const el = document.getElementById('qty') as HTMLInputElement;   // you take responsibility
  const cfg = { mode: 'dark', size: 3 } as const;                  // mode is 'dark', not string
  const routes = { home: '/', users: '/users' } satisfies Record<string, string>;
  routes.home;   // still known to be '/', and a wrong value type is an error
  `)}
  <p>Prefer a real check over <code>!</code> and over <code>as</code>: <code>if (!el) return;</code> costs one line and cannot lie.</p>
  <blockquote><b>Say it in the interview:</b> as and the exclamation mark are promises I make to the compiler, so I treat them as code smells. satisfies and as const add safety without hiding anything.</blockquote>`,
  followUps: ['When is <code>as</code> acceptable?', 'How do you get a union type from an <code>as const</code> array?'] });

interview.push({ q: 'What does <code>strict</code> mode turn on, and which extra flags do you recommend?', level: 'I',
  a: `<p><code>strict</code> is one switch in tsconfig that turns on a group of stricter checks, and every new project should have it on.</p>
  ${H.table(['Flag inside strict', 'What it catches'], [
    ['<code>strictNullChecks</code>', 'using a value that may be null or undefined'],
    ['<code>noImplicitAny</code>', 'a parameter or variable that silently became <code>any</code>'],
    ['<code>strictFunctionTypes</code>', 'passing a function whose parameters do not really fit'],
    ['<code>strictPropertyInitialization</code>', 'a class field that is never given a value'],
    ['<code>useUnknownInCatchVariables</code>', 'makes the caught error <code>unknown</code>, so you must check it'],
    ['<code>strictBindCallApply</code>, <code>noImplicitThis</code>, <code>alwaysStrict</code>', 'wrong arguments to bind, call and apply; an untyped <code>this</code>; emits strict-mode JavaScript']
  ])}
  <p><b>Not part of strict, worth adding:</b></p>
  <ul>
    <li><code>noUncheckedIndexedAccess</code>: <code>items[0]</code> has type <code>T | undefined</code>, which is the truth.</li>
    <li><code>exactOptionalPropertyTypes</code>: an optional property may be missing, but may not be set to <code>undefined</code> on purpose.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> Strict is on from day one. The check that pays off most is strictNullChecks, and I add noUncheckedIndexedAccess because array access is where undefined sneaks in.</blockquote>`,
  followUps: ['How do you turn strict on in an old code base without stopping the team?', 'Why is the catch variable <code>unknown</code>?'] });

interview.push({ q: 'How do classes work in TypeScript: access modifiers, abstract classes, <code>implements</code>, decorators?', level: 'I',
  a: `<p>TypeScript classes are JavaScript classes with types and visibility keywords added on top.</p>
  ${C(`
  abstract class Animal {
    // Parameter properties: declares and assigns the fields in one go
    constructor(public readonly name: string, protected age = 0) {}
    abstract speak(): string;                       // subclasses must implement it
    describe() { return this.name + ' says ' + this.speak(); }
  }
  class Dog extends Animal { speak() { return 'woof'; } }

  interface Logger { log(msg: string): void }
  class ConsoleLogger implements Logger { log(m: string) { console.log(m); } }

  class Counter { #count = 0; inc() { return ++this.#count; } }
  `)}
  <ul>
    <li><code>public</code>, <code>protected</code>, <code>private</code> are checked only at compile time. At run time the field is still reachable.</li>
    <li><code>#count</code> is JavaScript's own private field. It is private at run time too.</li>
    <li><code>abstract</code> classes cannot be created directly. <code>implements</code> checks that a class matches an interface.</li>
    <li><b>Decorators</b> such as <code>@Component</code> attach metadata or behaviour to a class. Angular is built on them.</li>
  </ul>
  <p>In React code you write few classes. In Angular, components and services are classes.</p>
  <blockquote><b>Say it in the interview:</b> The private keyword is a compile-time rule, hash-private is real run-time privacy. I use abstract classes for shared behaviour and interfaces for contracts.</blockquote>`,
  followUps: ['Interface or abstract class: how do you choose?', 'What is a parameter property and why do some teams ban it?', 'How do decorators relate to Angular dependency injection?'] });

interview.push({ q: 'Explain modules, <code>import type</code>, declaration files and the tsconfig options that matter.', level: 'I',
  a: `<p>Each file is a module that exports and imports names, and tsconfig tells the compiler how to check and what to output.</p>
  <ul>
    <li><code>import type { User } from './types'</code> imports only a type. It is removed completely from the output, which avoids loading a file just for its types.</li>
    <li><code>export * from './api'</code> re-exports, often from an <code>index.ts</code> file.</li>
    <li><b>Declaration files</b> (<code>.d.ts</code>) contain types and no code. They describe JavaScript libraries. Many libraries ship their own. For others you install <code>@types/name</code>.</li>
  </ul>
  ${H.table(['tsconfig option', 'Purpose'], [
    ['<code>target</code>', 'which JavaScript version to output, for example ES2022'],
    ['<code>module</code> / <code>moduleResolution</code>', 'module format and how imports are found. <code>bundler</code> fits Vite and similar tools'],
    ['<code>strict</code>', 'the strict checks'],
    ['<code>jsx</code>', '<code>react-jsx</code> for React'],
    ['<code>noEmit</code>', 'only type check. The bundler produces the JavaScript'],
    ['<code>skipLibCheck</code>', 'do not re-check library declaration files. Faster builds'],
    ['<code>verbatimModuleSyntax</code>', 'forces <code>import type</code> for type-only imports']
  ])}
  <p>In most front-end projects the bundler strips the types quickly and <code>tsc --noEmit</code> runs separately in CI as the type check.</p>
  <blockquote><b>Say it in the interview:</b> I use import type for type-only imports, rely on d.ts files for library types, and run tsc with noEmit in CI because the bundler does not type check.</blockquote>`,
  followUps: ['Why does the dev server start even when there are type errors?', 'What are path aliases and where do you configure them?'] });

interview.push({ q: 'Rapid fire: event loop, promises and modern JavaScript syntax', level: 'I',
  a: `<p>These are the JavaScript run-time questions that usually come as "what does this print?".</p>
  ${H.table(['Question', 'Short answer'], [
    ['Order of <code>log(1); setTimeout(log 2, 0); Promise.resolve().then(log 3); log(4)</code>?', '1, 4, 3, 2. Synchronous code first, then promise callbacks (microtasks), then timers (macrotasks)'],
    ['<code>Promise.all</code> vs <code>allSettled</code> vs <code>race</code> vs <code>any</code>?', '<code>all</code>: waits for all, fails on the first failure. <code>allSettled</code>: waits for all, never fails. <code>race</code>: first to finish either way. <code>any</code>: first success'],
    ['How do you handle errors with <code>await</code>?', '<code>try / catch</code> around it. An unhandled rejection is a bug'],
    ['How do you update an object immutably?', 'Spread into a new object or array. <code>structuredClone</code> makes a deep copy. <code>Object.freeze</code> is shallow'],
    ['<code>map</code>, <code>filter</code>, <code>reduce</code>, <code>find</code>, <code>some</code>, <code>every</code>, <code>flatMap</code>?', 'transform each, keep some, fold to one value, first match, any match, all match, map then flatten one level'],
    ['<code>?.</code> and <code>??</code> vs <code>||</code>?', '<code>a?.b</code> stops at null or undefined. <code>??</code> falls back only for null or undefined. <code>||</code> also falls back for 0 and the empty string'],
    ['What is debounce?', 'Run a function only after calls have stopped for N ms. Built from a closure and a timer']
  ])}
  <blockquote><b>Say it in the interview:</b> Synchronous code runs first, then all microtasks such as promise callbacks, then one macrotask such as a timer. For parallel calls I pick Promise.all when all must succeed and allSettled when I want every result.</blockquote>`,
  followUps: ['Where does code after an <code>await</code> run in that order?', 'Debounce vs throttle?', 'Why is <code>count || 10</code> a bug when count can be 0?'] });

interview.push({ q: 'Enum, union of string literals, or an <code>as const</code> object: which do you use?', level: 'I',
  a: `<p>For a fixed set of values I use a union of string literals by default, because it has no run-time code and reads well in JSON.</p>
  ${H.table(['Option', 'At run time', 'Notes'], [
    ['<code>type Status = \'draft\' | \'active\'</code>', 'nothing', 'simplest. Matches JSON strings directly'],
    ['<code>const Status = { Draft: \'draft\', Active: \'active\' } as const</code>', 'a plain object', 'gives named values you can loop over, plus a type derived from it'],
    ['<code>enum Status { Draft, Active }</code>', 'a generated object', 'numeric by default, which is unreadable in logs and payloads. Not removable by simple type stripping'],
    ['<code>const enum</code>', 'inlined numbers or strings', 'causes trouble with per-file compilers and libraries']
  ])}
  ${C(`
  const Status = { Draft: 'draft', Active: 'active' } as const;
  type Status = (typeof Status)[keyof typeof Status];    // 'draft' | 'active'
  `)}
  <p><b>With a .NET API:</b> configure the server to send enums as strings (<code>JsonStringEnumConverter</code>). Then the generated front-end type is a readable union, and inserting a new enum member in C# does not silently shift the numbers.</p>
  <blockquote><b>Say it in the interview:</b> I default to string literal unions, use an as const object when I need the values at run time, and ask the API to serialise enums as strings so both sides agree.</blockquote>`,
  followUps: ['What is the reverse mapping of a numeric enum?', 'How do you loop over all values of a union type?'] });

interview.push({ q: 'Types are erased at run time. How do you validate data that comes from an API?', level: 'A',
  a: `<p>I check the data once at the point where it enters the app, with a schema, and I get the TypeScript type from that same schema.</p>
  ${C(`
  import { z } from 'zod';

  const ClientSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    tier: z.enum(['A', 'B', 'C']),
  });
  type Client = z.infer<typeof ClientSchema>;            // the type comes from the schema

  const client = ClientSchema.parse(await res.json());   // throws when the response is wrong
  const result = ClientSchema.safeParse(json);           // returns success plus data, or the error
  `)}
  <ul>
    <li><b>Why:</b> <code>res.json() as Client</code> is only a promise to the compiler. A renamed or null field passes silently and fails later, somewhere unrelated.</li>
    <li><b>Where:</b> at every trust boundary. API responses, form input, URL parameters, local storage, messages from other windows.</li>
    <li><b>On failure:</b> log it with enough detail, show a clear error, do not continue with half-valid data.</li>
    <li><b>Prevention:</b> generate types or a client from the API's OpenAPI document in the build, so most drift becomes a compile error.</li>
  </ul>
  <p>Validation costs CPU time. For very large lists validate what you depend on, not every field.</p>
  <blockquote><b>Say it in the interview:</b> A type is a claim, a schema is a check. I validate at the boundary with a schema, infer the type from it, and generate API types from OpenAPI so the front end and back end cannot drift quietly.</blockquote>`,
  followUps: ['The front end also validates forms. Does the API still need to validate?', 'How do you handle a new enum value the old front end does not know?', 'Generated types or hand-written schemas: which do you trust?'] });

interview.push({ q: 'Design a typed API client for a React or Angular app calling a .NET API.', level: 'A',
  a: `<p>I put every HTTP concern in one small function, so components only say what they want and never build headers or parse errors themselves.</p>
  ${C(`
  export class ApiError extends Error {
    constructor(public status: number, public body: unknown) { super('HTTP ' + status); }
  }

  export async function api<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
    const res = await fetch('/api' + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...init.headers,
      },
    });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }
  `)}
  <p>What the single place handles:</p>
  <ul>
    <li>base URL, JSON headers and the bearer token (fetched from the auth library just before the call);</li>
    <li>a typed error with the status and the problem-details body the API returns;</li>
    <li>204 No Content, cancellation through <code>AbortSignal</code>, a correlation id header for tracing;</li>
    <li>one reaction to 401, such as starting sign-in again.</li>
  </ul>
  <p>The final <code>as T</code> is a claim, so for important data I pass a schema and parse instead. In Angular the same concerns live in <code>HttpClient</code> interceptors.</p>
  <blockquote><b>Say it in the interview:</b> I type the API contracts, validate at the boundary, and centralise the token, error mapping and correlation id in one client, so no component talks to fetch directly.</blockquote>`,
  followUps: ['How would you add retry, and for which requests is retry safe?', 'How do you avoid ten parallel requests each refreshing the token?', 'Would you generate this client instead?'] });

interview.push({ q: 'What are mapped types, conditional types and template literal types?', level: 'A',
  a: `<p>They are ways to compute a new type from another type: a loop, an if, and string building, all at the type level.</p>
  ${C(`
  // Mapped type: loop over the keys of T. This is how Partial is built.
  type Optional<T> = { [K in keyof T]?: T[K] };

  // Conditional type with infer: "if T is an array, give me the item type"
  type ElementType<T> = T extends (infer U)[] ? U : T;
  type A = ElementType<string[]>;         // string

  // Template literal type: build string types from other string types
  type Evt = ~~on@@{'Click' | 'Hover'}~~;     // 'onClick' | 'onHover'

  // All three together: rename every key to a getter
  type Getters<T> = { [K in keyof T as ~~get@@{Capitalize<string & K>}~~]: () => T[K] };
  type G = Getters<{ name: string }>;     // { getName: () => string }
  `)}
  <ul>
    <li><b>Where you meet them:</b> inside libraries. Form libraries type field paths, routers type URL parameters, the built-in utility types are written this way.</li>
    <li><b>In application code:</b> use them sparingly. A clever type that nobody can read or debug is a cost, and deep ones slow down the editor.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> Mapped types loop over keys, conditional types branch with extends and infer, and template literal types build string unions. I can read and write them, but in app code I keep types simple and leave the heavy ones to libraries.</blockquote>`,
  followUps: ['What does <code>infer</code> do?', 'What is a distributive conditional type?', 'How would you write <code>DeepPartial&lt;T&gt;</code>?'] });

interview.push({ q: 'TypeScript uses structural typing. What does that mean, and where does it surprise people?', level: 'A',
  a: `<p>Structural typing means two types are compatible when their shapes match, no matter what they are called.</p>
  ${C(`
  type CustomerId = string;
  type OrderId = string;
  function loadOrder(id: OrderId) { return id; }

  const customerId: CustomerId = 'c-1';
  loadOrder(customerId);          // compiles: both are just string

  interface Point { x: number; y: number }
  const p = { x: 1, y: 2, z: 3 };
  const a: Point = p;             // OK: p has at least x and y
  const b: Point = { x: 1, y: 2, z: 3 };   // error: extra property in a fresh object literal
  `)}
  <ul>
    <li><b>Compared with C#:</b> C# is nominal. Two classes with the same fields are different types. In TypeScript they are interchangeable.</li>
    <li><b>Surprise 1:</b> extra properties are rejected only for an object literal written directly at the assignment. Through a variable they pass.</li>
    <li><b>Surprise 2:</b> type aliases for ids give no protection, as above. A <b>branded type</b> fixes it: <code>type OrderId = string &amp; { readonly __brand: 'OrderId' }</code>, created only by one checked function.</li>
    <li><b>Benefit:</b> plain JSON objects fit interfaces without any mapping code, and test doubles are easy to write.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> TypeScript checks shape, not name. That makes JSON easy to type, but it means two id types that are both strings can be mixed up, so for important ids I use branded types.</blockquote>`,
  followUps: ['Why does the excess property check exist at all?', 'How do you create a value of a branded type safely?'] });

interview.push({ q: 'As tech lead, how would you move a large JavaScript front end to strict TypeScript without stopping feature work?', level: 'E',
  a: `<p>I would do it in small steps that never break the build, starting where types give the most safety, and make the direction one-way with CI.</p>
  <ol>
    <li><b>Set up side by side.</b> Add TypeScript with <code>allowJs</code>, so <code>.js</code> and <code>.ts</code> files live together. Nothing changes for users.</li>
    <li><b>Type the boundaries first.</b> Generate API types from the OpenAPI document and type the shared API client. Every file that calls the API benefits at once.</li>
    <li><b>Rule for new code.</b> New files are TypeScript and strict. A file you touch for a feature is converted if it is small.</li>
    <li><b>Convert from the leaves inward.</b> Utilities and shared components first, big pages last, because types flow outwards from what is imported.</li>
    <li><b>Ratchet.</b> CI counts type errors, uses of <code>any</code> and suppressions. The number may go down, never up. Suppress with <code>@ts-expect-error</code> plus a ticket, not with <code>any</code>.</li>
    <li><b>Turn on strict flags one at a time</b>, <code>strictNullChecks</code> first, because it finds real bugs.</li>
  </ol>
  <p><b>What I tell stakeholders:</b> a time-boxed share of each sprint, a visible burn-down chart, and no big-bang rewrite branch. I use an AI assistant for the mechanical conversion and keep humans on reviewing the types at module boundaries.</p>
  <blockquote><b>Say it in the interview:</b> I migrate incrementally: types at the API boundary first, strict for all new code, leaves before pages, and a CI ratchet so the error count can only go down. No freeze and no big-bang branch.</blockquote>`,
  followUps: ['How do you stop the migration stalling at 80 percent?', 'What do you do with a third-party library that has no types?', 'How would you measure that the migration was worth it?'] });

// ================= INTERVIEW: REACT =================
interview.push({ q: 'How does React work? Explain the rendering model.', level: 'B',
  a: `<p>React builds the screen from your data: you describe what the UI should look like for the current state, and React updates the page to match.</p>
  <p>People write it as <code>UI = f(state, props)</code>. One update goes like this:</p>
  <ol>
    <li><b>Trigger:</b> a state setter is called.</li>
    <li><b>Render:</b> React calls the component function again and gets a new tree of plain objects describing the UI (the virtual DOM).</li>
    <li><b>Reconcile:</b> React compares the new tree with the previous one.</li>
    <li><b>Commit:</b> only the real differences are applied to the page.</li>
  </ol>
  <ul>
    <li><b>Keys</b> tell React which list item is which between renders.</li>
    <li><b>Batching:</b> since React 18, several state updates in one tick cause one render, also inside promises and timers.</li>
    <li><b>Concurrent rendering:</b> React can pause or drop a render that is no longer urgent. <code>startTransition</code>, <code>useDeferredValue</code> and <code>Suspense</code> build on this.</li>
  </ul>
  <p>Because a render can run more than once, the component function must be pure: no side effects while rendering.</p>
  <blockquote><b>Say it in the interview:</b> The UI is a function of state. On a state change React re-runs the component, diffs the new element tree against the old one, and commits only the changes to the DOM.</blockquote>`,
  followUps: ['Does a re-render always change the DOM?', 'Why must rendering be pure?', 'What is a key used for?'] });

interview.push({ q: 'What are components, props and state?', level: 'B',
  a: `<p>A component is a function that returns a piece of UI, props are the inputs it receives from its parent, and state is data it remembers itself.</p>
  ${C(`
  type ButtonProps = { label: string; onClick: () => void; disabled?: boolean };

  export function Button({ label, onClick, disabled = false }: ButtonProps) {
    return <button onClick={onClick} disabled={disabled}>{label}</button>;
  }

  function Counter() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(c => c + 1)}>Clicked {count}</button>;
  }
  `)}
  ${H.table(['', 'Props', 'State'], [
    ['Owned by', 'the parent', 'the component itself'],
    ['Can the component change it?', 'no, read-only', 'yes, through the setter'],
    ['A change causes', 'a re-render (because the parent rendered)', 'a re-render']
  ])}
  <ul>
    <li><b>Data flows down</b> through props. <b>Events flow up</b> through callback props such as <code>onClick</code>.</li>
    <li><b>Never mutate state.</b> Create a new object or array, or React may not notice the change.</li>
    <li>When the new value depends on the old one, pass a function: <code>setCount(c =&gt; c + 1)</code>.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> Props come from the parent and are read-only, state is owned by the component and triggers a re-render when set. Data flows down, events flow up, and I never mutate state.</blockquote>`,
  followUps: ['What is the <code>children</code> prop?', 'Why use the function form of the setter?', 'What happens if you change a prop inside the child?'] });

interview.push({ q: 'Rapid fire: React basics', level: 'B',
  a: `<p>Short answers to the React questions that open most interviews.</p>
  ${H.table(['Question', 'Short answer'], [
    ['What is the virtual DOM?', 'A tree of plain JavaScript objects describing the UI. React compares two versions of it to find the smallest set of real DOM changes'],
    ['Why do lists need keys?', 'So React can match each item with its previous version when the list is sorted, filtered or changed. Use a stable id, not the array index'],
    ['Controlled vs uncontrolled input?', 'Controlled: React state holds the value. Uncontrolled: the DOM holds it and you read it through a ref or on submit'],
    ['Why does state look "asynchronous"?', 'The setter schedules a new render. The variable in the current render never changes. Read the new value in the next render, or use the function form'],
    ['What is lifting state up?', 'Moving state to the closest parent of the components that need it, so they stay in sync'],
    ['How do you fix prop drilling?', 'Composition (pass elements as children), Context, or a state library']
  ])}
  <blockquote><b>Say it in the interview:</b> Keys give list items a stable identity, a controlled input keeps its value in state, and setting state schedules a render, it does not change the variable I am holding.</blockquote>`,
  followUps: ['What goes wrong with index keys?', 'When is an uncontrolled input the better choice?', 'What is prop drilling?'] });

interview.push({ q: 'What is JSX?', level: 'B',
  a: `<p>JSX is a syntax that lets you write HTML-like tags inside JavaScript, and the build turns each tag into a normal function call.</p>
  ${C(`
  const view = <h1 className="title">Hello, {user.name}</h1>;
  // after the build this is roughly:  jsx('h1', { className: 'title', children: ['Hello, ', user.name] })
  `)}
  <ul>
    <li><b>It is JavaScript, not a template.</b> Anything in <code>{ }</code> is an expression. You use <code>map</code> for lists and <code>condition ? a : b</code> or <code>&amp;&amp;</code> for conditions.</li>
    <li><b>Names follow the DOM API:</b> <code>className</code>, <code>htmlFor</code>, <code>onClick</code>, and <code>style</code> takes an object.</li>
    <li><b>One root:</b> a component returns one element. Use a fragment, <code>&lt;&gt; &lt;/&gt;</code>, to group without an extra div.</li>
    <li><b>Lowercase tags are HTML elements, capitalised tags are your components.</b></li>
    <li><b>Safe by default:</b> text you put in <code>{ }</code> is escaped, which blocks most script injection.</li>
    <li>With the modern JSX transform you do not need to import React in every file.</li>
  </ul>
  <p><b>A classic trap:</b> <code>{items.length &amp;&amp; &lt;List /&gt;}</code> shows a literal 0 when the list is empty. Write <code>items.length &gt; 0 &amp;&amp; ...</code>.</p>
  <blockquote><b>Say it in the interview:</b> JSX is syntax sugar for function calls that create element objects. Because it is plain JavaScript, I use map and normal conditions instead of a template language.</blockquote>`,
  followUps: ['Why <code>className</code> and not <code>class</code>?', 'Can a browser run JSX directly?', 'How does TypeScript check the props of a JSX tag?'] });

interview.push({ q: 'Which hooks must you know, and what are the rules of hooks?', level: 'I',
  a: `<p>Hooks are functions starting with <code>use</code> that give a function component memory, side effects and access to React features.</p>
  ${H.table(['Hook', 'Purpose'], [
    ['<code>useState</code>', 'local state'],
    ['<code>useEffect</code>', 'run code after render to sync with something outside React (subscriptions, timers). Return a cleanup function'],
    ['<code>useRef</code>', 'a value that survives renders without causing one, or a handle to a DOM node'],
    ['<code>useMemo</code> / <code>useCallback</code>', 'cache a computed value / keep the same function object between renders'],
    ['<code>useContext</code>', 'read a value provided higher in the tree'],
    ['<code>useReducer</code>', 'state changes described as actions, like a small state machine'],
    ['<code>useLayoutEffect</code>', 'like useEffect but before the browser paints, for measuring layout'],
    ['<code>useId</code>, <code>useTransition</code>, <code>useDeferredValue</code>, <code>useSyncExternalStore</code>', 'stable ids for labels, non-urgent updates, subscribing to a store outside React'],
    ['<code>use</code> (React 19)', 'read a promise or a context during render']
  ])}
  <p><b>Rules:</b> call hooks only at the top level of a component or a custom hook, never inside a loop, a condition or a nested function. React matches hooks by call order. (<code>use</code> is the one exception and may be called conditionally.)</p>
  <p><b>Dependency array:</b> missing = every render, <code>[]</code> = once, <code>[a, b]</code> = when they change. Keep the <code>exhaustive-deps</code> lint rule on.</p>
  <blockquote><b>Say it in the interview:</b> useState for memory, useEffect to sync with the outside world with a cleanup, useRef for values that should not re-render. Hooks are called at the top level, in the same order every render.</blockquote>`,
  followUps: ['Why can hooks not be called inside an <code>if</code>?', 'When do you choose <code>useReducer</code> over <code>useState</code>?', 'What should the cleanup of a fetch effect do?'] });

interview.push({ q: 'What is a custom hook? Write one.', level: 'I',
  a: `<p>A custom hook is your own function whose name starts with <code>use</code> and which calls other hooks, so stateful logic can be reused across components.</p>
  ${C(`
  function useDebouncedValue<T>(value: T, ms = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const t = setTimeout(() => setDebounced(value), ms);
      return () => clearTimeout(t);
    }, [value, ms]);
    return debounced;
  }

  function useLocalStorage<T>(key: string, initial: T) {
    const [value, setValue] = useState<T>(() => {
      try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : initial; }
      catch { return initial; }
    });
    useEffect(() => {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
    }, [key, value]);
    return [value, setValue] as const;
  }
  `)}
  <ul>
    <li><b>It shares logic, not state.</b> Two components using the same hook each get their own state.</li>
    <li>The <code>use</code> prefix lets the lint rules check it like a built-in hook.</li>
    <li><code>useState(() =&gt; ...)</code> runs the expensive first read only once.</li>
    <li><code>as const</code> makes the return a tuple, so callers can destructure like <code>useState</code>.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> A custom hook is a function that composes other hooks to reuse logic. Each caller gets its own state. I extract one when the same effect and state appear in two components.</blockquote>`,
  followUps: ['How do you test a custom hook?', 'How would two components share the same state instead?', 'Custom hook vs higher-order component?'] });

interview.push({ q: 'Context vs Redux or Zustand: how do you choose where state lives?', level: 'I',
  a: `<p>I keep state as close as possible to where it is used and only move it to something global when several distant parts of the app really need it.</p>
  ${H.table(['Option', 'Use when'], [
    ['<code>useState</code>', 'one component uses it'],
    ['Lifting state up', 'a few nearby components share it'],
    ['Context', 'app-wide values that change rarely: user, theme, language'],
    ['Redux Toolkit, Zustand, Jotai', 'complex client state with frequent updates. Selectors keep re-renders small'],
    ['TanStack Query', 'server state: anything fetched from the API'],
    ['URL (route and search params)', 'state a user should be able to bookmark or share: filters, tab, page'],
    ['React Hook Form', 'large forms']
  ])}
  ${C(`
  const AuthContext = createContext<AuthState | null>(null);

  export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('AuthProvider is missing');
    return ctx;
  }
  `)}
  <p><b>The catch with Context:</b> when the value changes, every component that reads it re-renders. It has no selectors. So it is a delivery mechanism for stable values, not a store for fast-changing data.</p>
  <blockquote><b>Say it in the interview:</b> Local first, lift when shared, Context for rarely changing global values, a query cache for server data, the URL for shareable state, and a store only when client-side logic is complex.</blockquote>`,
  followUps: ['How do you stop a context update re-rendering the whole app?', 'What does Redux Toolkit give you over plain Redux?', 'Why is server state different from client state?'] });

interview.push({ q: 'How do you build forms in React? Controlled vs uncontrolled?', level: 'I',
  a: `<p>For anything beyond a couple of fields I use a form library with a validation schema, so the rules live in one place and typing stays fast.</p>
  ${C(`
  const schema = z.object({ name: z.string().min(2), email: z.string().email() });
  type FormValues = z.infer<typeof schema>;

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  <form onSubmit={handleSubmit(async v => { await create.mutateAsync(v); })}>
    <input {...register('name')} aria-invalid={!!errors.name} />
    {errors.name && <span role="alert">{errors.name.message}</span>}
  </form>
  `)}
  ${H.table(['', 'Controlled', 'Uncontrolled'], [
    ['Value lives in', 'React state', 'the DOM input'],
    ['Each key press', 're-renders the component', 'no re-render'],
    ['Good for', 'live validation, fields that depend on each other', 'large forms, simple submit']
  ])}
  <ul>
    <li>React Hook Form is mostly uncontrolled, which is why it is fast.</li>
    <li>React 19 adds form <b>actions</b>: <code>&lt;form action={fn}&gt;</code> with <code>useActionState</code> for the result and pending flag, and <code>useFormStatus</code> inside the form.</li>
    <li>Validate again on the server. Client validation is for the user's comfort only.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> Controlled inputs keep the value in state, uncontrolled inputs leave it in the DOM. For real forms I use React Hook Form with a Zod schema, show accessible error messages, and the API validates again.</blockquote>`,
  followUps: ['How do you show server-side validation errors next to the right field?', 'How do you prevent a double submit?', 'What does <code>useActionState</code> return?'] });

interview.push({ q: 'Explain error boundaries, Suspense, routing and how you organise a React code base.', level: 'I',
  a: `<p>These four keep a growing app stable: boundaries contain crashes, Suspense handles waiting, the router maps URLs to screens, and a folder structure keeps features apart.</p>
  <ul>
    <li><b>Error boundary:</b> catches an error thrown while rendering its children and shows a fallback instead of a blank page. It does <b>not</b> catch errors in event handlers or in async code. It must still be a class, so most teams use the <code>react-error-boundary</code> package.</li>
    <li><b>Suspense:</b> shows a fallback while a child is not ready: a lazy-loaded component or data read with <code>use</code>.</li>
    <li><b>Routing:</b> React Router with nested routes, lazy routes, loaders and protected routes.</li>
    <li><b>Structure:</b> folders by feature (<code>features/orders/{api,components,hooks,types}</code>), a shared UI folder, one API layer, path aliases.</li>
  </ul>
  ${C(`
  function RequireAuth({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, login } = useAuth();
    useEffect(() => { if (!isAuthenticated) login(); }, [isAuthenticated, login]);
    return isAuthenticated ? <>{children}</> : null;
  }
  `)}
  <p>A route guard like this improves the experience. It is not security. The API checks the token on every call.</p>
  <blockquote><b>Say it in the interview:</b> I wrap each route in an error boundary and a Suspense fallback, lazy load routes, and organise by feature. Boundaries catch render errors only, so async errors are handled where the call is made.</blockquote>`,
  followUps: ['How do you report an error caught by a boundary?', 'Where do you place Suspense boundaries?', 'Why is a client-side route guard not security?'] });

interview.push({ q: 'How do you test React components?', level: 'I',
  a: `<p>I test what the user sees and does, not how the component is built inside.</p>
  ${C(`
  // Vitest + React Testing Library
  it('shows a validation error', async () => {
    render(<ClientForm onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/name/i);
  });

  // Fake the network with Mock Service Worker, so component and API client are tested together
  server.use(http.get('/api/clients', () => HttpResponse.json([{ id: '1', name: 'Acme' }])));
  `)}
  ${H.table(['Level', 'Tool', 'How many'], [
    ['Unit: pure functions, hooks', 'Vitest', 'many'],
    ['Component: render, click, read the screen', 'React Testing Library + user-event', 'a good number'],
    ['End to end: real browser, real flows', 'Playwright', 'a few critical paths']
  ])}
  <ul>
    <li>Find elements by role and label. That also proves the UI is accessible.</li>
    <li>Mock at the network boundary, not your own hooks. Then a refactor does not break the tests.</li>
    <li>Cover the unhappy states: loading, empty, error.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> I use Vitest and React Testing Library to test behaviour through roles and labels, mock the network with MSW rather than my own code, and keep a few Playwright tests for the critical journeys.</blockquote>`,
  followUps: ['What is wrong with testing internal state?', 'How do you deal with a flaky async test?', 'Are snapshot tests useful?'] });

interview.push({ q: 'How do you handle accessibility and security in React, and how do you choose a UI library such as MUI or PrimeReact?', level: 'I',
  a: `<p>Accessibility and security are both mostly about good defaults: real HTML elements, and never trusting text as HTML.</p>
  <p><b>Accessibility</b></p>
  <ul>
    <li>Semantic HTML first: a <code>button</code> is a button, not a clickable div.</li>
    <li>Every input has a label. Everything works with the keyboard. Focus moves sensibly when a dialog opens and closes.</li>
    <li>ARIA attributes only when HTML has no element for the job. Check colour contrast.</li>
  </ul>
  <p><b>Security</b></p>
  <ul>
    <li>React escapes text by default. Avoid <code>dangerouslySetInnerHTML</code>. If you must, sanitise first with a library such as DOMPurify.</li>
    <li>Any storage that JavaScript can read is exposed if a script is injected. Let a vetted auth library manage tokens, or keep them on the server behind an HttpOnly cookie.</li>
    <li>Check URLs before using them in links or redirects. Add a Content Security Policy.</li>
  </ul>
  <p><b>UI libraries:</b> MUI follows Material Design and has a strong theming system (<code>ThemeProvider</code>, the <code>sx</code> prop). PrimeReact is strong in data-heavy components such as DataTable and TreeTable. Both give accessible building blocks, but you still supply the labels. Wrap whichever you choose in your own design-system components, so app code does not depend on the library directly.</p>
  <blockquote><b>Say it in the interview:</b> I start from semantic HTML and keyboard support, rely on React's escaping and avoid raw HTML, keep tokens out of reach of scripts, and wrap the UI library behind our own components.</blockquote>`,
  followUps: ['How do you test accessibility automatically?', 'What does a Content Security Policy protect against?', 'Two UI libraries in one product: how do you manage it?'] });

interview.push({ q: 'Rapid fire: hooks and modern React', level: 'I',
  a: `<p>Short answers to the follow-up questions on hooks and newer React features.</p>
  ${H.table(['Question', 'Short answer'], [
    ['<code>useEffect</code> vs <code>useLayoutEffect</code>?', 'useEffect runs after the browser has painted. useLayoutEffect runs before paint and blocks it, so use it only to measure or fix layout'],
    ['<code>useMemo</code> vs <code>useCallback</code>?', 'useMemo caches a computed value. useCallback caches the function itself'],
    ['What are Server Components?', 'Components that run on the server, in a framework such as Next.js. Their code is not sent to the browser, and they cannot use state or effects'],
    ['Why does StrictMode run things twice?', 'Only in development. It mounts and runs effects twice to expose impure renders and missing cleanups'],
    ['Refs in React 19?', '<code>ref</code> is a normal prop on function components, so <code>forwardRef</code> is no longer needed'],
    ['Higher-order component vs hook?', 'A HOC wraps a component and returns a new one. A hook is a function with reusable logic. Hooks are preferred because they do not add wrapper layers']
  ])}
  <blockquote><b>Say it in the interview:</b> useEffect after paint, useLayoutEffect before paint, useMemo for values, useCallback for functions. StrictMode double-invokes only in development, and in React 19 ref is just a prop.</blockquote>`,
  followUps: ['When is <code>useMemo</code> not worth it?', 'Can a Server Component have an <code>onClick</code>?', 'What does the React Compiler change about memoization?'] });

interview.push({ q: 'When do you NOT need <code>useEffect</code>?', level: 'I',
  a: `<p>You do not need an effect when nothing outside React is involved: an effect is for syncing with an external system, not for reacting to state.</p>
  ${H.table(['Tempting use of an effect', 'Better'], [
    ['Copy props or state into another state (<code>fullName</code> from first and last name)', 'calculate it during render. Wrap in <code>useMemo</code> only if it is slow'],
    ['Run code when the user clicks, by watching a flag', 'put the code in the event handler'],
    ['Reset state when a prop such as <code>userId</code> changes', 'give the component a <code>key={userId}</code> so React starts it fresh'],
    ['Fetch data on mount', 'a data library (TanStack Query) or the framework loader. It handles caching, races and retries'],
    ['Tell the parent about a change', 'call the parent callback in the same event handler']
  ])}
  ${C(`
  // Unneeded: an extra render and a moment where the two values disagree
  const [total, setTotal] = useState(0);
  useEffect(() => { setTotal(items.reduce((s, i) => s + i.price, 0)); }, [items]);

  // Better: derived during render
  const total = items.reduce((s, i) => s + i.price, 0);
  `)}
  <p><b>Good uses of an effect:</b> subscribing to a browser event or WebSocket, starting a timer, calling a non-React widget, setting the document title.</p>
  <blockquote><b>Say it in the interview:</b> If I can calculate it during render or do it in an event handler, I do not use an effect. Effects are for synchronising with something outside React, and each one needs a cleanup.</blockquote>`,
  followUps: ['Why is fetching in an effect risky?', 'How does <code>key</code> reset a component?', 'What is derived state?'] });

interview.push({ q: 'What is server state, and how do you manage it with TanStack Query?', level: 'A',
  a: `<p>Server state is data owned by the API that the browser only holds a copy of, and TanStack Query is a cache that keeps that copy fresh for you.</p>
  ${C(`
  const { data, isPending, isError } = useQuery({
    queryKey: ['clients', { page, search }],          // cache key: change it and a new fetch runs
    queryFn: ({ signal }) => api<Page<Client>>('/clients?page=' + page + '&q=' + search, { signal }),
    staleTime: 60_000,                                // fresh for 60 seconds, no refetch
    placeholderData: keepPreviousData,                // smooth paging
  });

  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (c: NewClient) => api<Client>('/clients', { method: 'POST', body: JSON.stringify(c) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),   // lists refetch
  });
  `)}
  <ul>
    <li><b>What you get:</b> caching, one request shared by many components, background refetch, retries, loading and error flags, paging and infinite lists, cancellation, devtools.</li>
    <li><b>The split:</b> server state in the query cache. Client state (open dialog, draft text) in component state or a small store. Do not copy query data into <code>useState</code>.</li>
    <li><b>Optimistic update:</b> <code>onMutate</code> saves a snapshot and writes the new value, <code>onError</code> rolls back, <code>onSettled</code> invalidates.</li>
    <li><b>Keys:</b> build them in one place per feature so invalidation is reliable.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> Server state is a cached copy that can go stale, so I let TanStack Query own fetching, caching and invalidation, and keep only true UI state in components.</blockquote>`,
  followUps: ['<code>staleTime</code> vs <code>gcTime</code>?', 'How do you invalidate just one item after an edit?', 'When would you not use a query library?'] });

interview.push({ q: 'Why do React components re-render, and how do you fix a slow screen?', level: 'A',
  a: `<p>A component re-renders for three reasons: its own state changed, its parent re-rendered, or a context it reads changed.</p>
  <p>I measure first with the React DevTools Profiler, then apply fixes in this order, cheapest first:</p>
  <ol>
    <li><b>Move state down</b> or split the component, so fewer components are below the change.</li>
    <li><b><code>React.memo</code></b> on pure children, with stable props: <code>useCallback</code> and <code>useMemo</code> keep function and object props the same between renders. Do not create new object or array literals in the props of a memoised child.</li>
    <li><b>Stable keys.</b> Never the array index when the list can reorder.</li>
    <li><b>Virtualise</b> long lists (TanStack Virtual, react-window) so only visible rows exist.</li>
    <li><b>Code split</b> with <code>lazy</code> and <code>Suspense</code>, at route level first.</li>
    <li><b>Debounce</b> input, and mark heavy updates as non-urgent with <code>useDeferredValue</code> or <code>startTransition</code>.</li>
  </ol>
  ${C(`
  const Chart = lazy(() => import('./Chart'));
  <Suspense fallback={<Spinner />}><Chart data={data} /></Suspense>
  `)}
  <p><b>React Compiler:</b> a build-time tool, stable since late 2025, that adds memoization automatically. With it, most hand-written <code>useMemo</code> and <code>useCallback</code> are unnecessary, but where state lives and list size remain your job.</p>
  <blockquote><b>Say it in the interview:</b> I profile first. Then I shrink the re-render area by moving state down, memoise with stable props, virtualise long lists and split code by route. I do not sprinkle useMemo without a measurement.</blockquote>`,
  followUps: ['A memoised child still re-renders. What do you check?', 'What does the Profiler flame graph tell you?', 'Is a re-render the same as a DOM update?'] });

interview.push({ q: 'Build a searchable, paged user list. Talk through your solution.', level: 'A',
  a: `<p>I would build it from four parts: a debounced search value, a query keyed by search and page, loading and error states, and memoised rows.</p>
  ${C(`
  export function UserList() {
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const dq = useDebouncedValue(q, 300);
    const { data, isPending, isError } = useQuery({
      queryKey: ['users', dq, page],
      queryFn: ({ signal }) => api<Page<User>>('/users?q=' + encodeURIComponent(dq) + '&page=' + page, { signal }),
      placeholderData: keepPreviousData,
    });

    if (isError) return <p role="alert">Could not load users.</p>;
    return (
      <section>
        <input aria-label="Search users" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
        {isPending ? <p>Loading</p> : data.items.map(u => <UserRow key={u.id} user={u} />)}
        <button disabled={!data?.hasMore} onClick={() => setPage(p => p + 1)}>Next</button>
      </section>
    );
  }
  const UserRow = memo(({ user }: { user: User }) => <div>{user.name}</div>);
  `)}
  <p>Points I would say while writing it:</p>
  <ul>
    <li>Debounce so the API is not called on every key press. Reset to page 1 on a new search.</li>
    <li>The query key holds what the request depends on. The <code>signal</code> cancels outdated requests.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> I debounce the input, key the query by search text and page, cancel stale requests, show loading and error states, memoise rows, and then test each state.</blockquote>`,
  followUps: ['How would you keep the search and page in the URL?', 'How would you handle 50,000 results?', 'What changes for infinite scroll?'] });

interview.push({ q: 'What is new in React 19 that a tech lead should know?', level: 'A',
  a: `<p>React 19 mainly makes async work, forms and refs simpler, and brings Server Components into the stable release.</p>
  ${H.table(['Feature', 'What it gives you'], [
    ['Actions', 'pass an async function to a transition or to <code>&lt;form action&gt;</code>. React tracks pending state and errors for you'],
    ['<code>useActionState</code>', 'the result and pending flag of a form action'],
    ['<code>useFormStatus</code>', 'lets a button inside a form know the form is submitting'],
    ['<code>useOptimistic</code>', 'show the expected result at once, and fall back if the action fails'],
    ['<code>use</code>', 'read a promise (with Suspense) or a context during render. May be called conditionally'],
    ['<code>ref</code> as a prop', 'no <code>forwardRef</code> needed. Ref callbacks can return a cleanup'],
    ['<code>&lt;Context&gt;</code> as provider', 'write <code>&lt;ThemeContext value=...&gt;</code> instead of <code>.Provider</code>'],
    ['Document metadata', '<code>title</code> and <code>meta</code> tags rendered in a component are moved to the head'],
    ['Server Components and Server Functions', 'stable, used through a framework']
  ])}
  <p><b>Around it:</b> the React Compiler reached 1.0 and memoizes automatically. Create React App is deprecated, so new apps start with Vite or a framework. Later 19.x releases added <code>&lt;Activity&gt;</code> for hiding UI while keeping its state, and <code>useEffectEvent</code>.</p>
  <p><b>Upgrade advice:</b> move to the last 18 release first and clear its warnings, run the official codemods, check that key libraries support 19.</p>
  <blockquote><b>Say it in the interview:</b> React 19 adds Actions with useActionState and useOptimistic for forms, the use function, ref as a normal prop, and stable Server Components. Together with the compiler, there is less manual pending-state and memoization code.</blockquote>`,
  followUps: ['Would you adopt Server Components for an internal app with a .NET API?', 'What breaks when upgrading from 18 to 19?', 'What does the compiler require from your code?'] });

interview.push({ q: 'What is a stale closure in React? Show one and fix it.', level: 'A',
  a: `<p>A stale closure is a function that still sees old props or state, because it was created in an earlier render and each render has its own fixed values.</p>
  ${C(`
  function Chat({ roomId }: { roomId: string }) {
    const [draft, setDraft] = useState('');

    useEffect(() => {
      const id = setInterval(() => {
        saveDraft(roomId, draft);        // BUG: always the draft from the first render
      }, 5000);
      return () => clearInterval(id);
    }, [roomId]);                        // draft is missing from the dependencies
  }
  `)}
  <p><b>Why:</b> the effect ran when <code>draft</code> was empty. The interval callback captured that value. Later renders create new <code>draft</code> variables, but nobody gives them to the old callback.</p>
  <p><b>Fixes, depending on the case:</b></p>
  <ul>
    <li>Add the value to the dependency array. Correct, but the interval restarts on every key press.</li>
    <li>If you only need the previous state to compute the next one, use the updater form: <code>setCount(c =&gt; c + 1)</code>.</li>
    <li>Keep the latest value in a ref (<code>draftRef.current = draft</code>) and read the ref inside the callback.</li>
    <li>Newer React has <code>useEffectEvent</code> for exactly this: a function that always sees the latest values without being a dependency.</li>
  </ul>
  <p>The <code>exhaustive-deps</code> lint rule reports the missing dependency, so the bug is visible before it ships.</p>
  <blockquote><b>Say it in the interview:</b> Each render has its own props and state. A callback created in an old render keeps the old values. I fix it with correct dependencies, the updater form, or a ref for the latest value, and I keep the lint rule on.</blockquote>`,
  followUps: ['Why not just disable the lint rule?', 'Where else do stale closures appear besides timers?', 'Does the React Compiler remove this problem?'] });

interview.push({ q: 'How does an Office add-in built with React work (for example a Word task pane)?', level: 'E',
  a: `<p>An Office add-in is a normal web app that Office shows in a side panel, and it changes the document through the Office.js library.</p>
  <ul>
    <li><b>Hosting:</b> the task pane is a web page in an embedded browser view (an iframe in Office on the web). A <b>manifest</b> tells Office where the page is. React renders after <code>Office.onReady()</code>.</li>
    <li><b>Document access is batched.</b> Commands are queued and sent only when you call <code>context.sync()</code>. To read a property you first <code>load</code> it, then sync.</li>
  </ul>
  ${C(`
  await Word.run(async (context) => {
    context.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;   // edits become tracked changes
    const results = context.document.body.search('limitation of liability', { matchCase: false });
    results.load('items');
    await context.sync();                                  // one round trip
    results.items[0]?.insertText('limitation of liability (capped at fees paid)', Word.InsertLocation.replace);
    await context.sync();
  });
  `)}
  <p><b>Points an interviewer looks for:</b></p>
  <ul>
    <li>Keep <code>context.sync()</code> calls few. A sync inside a loop is slow.</li>
    <li>Sign-in uses Office single sign-on or MSAL, then the add-in calls your API with a bearer token like any single-page app.</li>
    <li>Check that the host supports the API set you need, and apply edits as tracked changes so the user stays in control.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> The add-in is a React web app in a task pane. It talks to the document through Office.js, where commands are queued and sent with context.sync, so I batch reads and writes and apply edits as tracked changes.</blockquote>`,
  followUps: ['Why is calling <code>context.sync()</code> in a loop slow?', 'How does an add-in get a token for your API?', 'How do you test and deploy an add-in?'] });

interview.push({ q: 'Client rendering, server rendering or Server Components: how do you choose the architecture for a React app?', level: 'E',
  a: `<p>I choose by where the app runs and who uses it: a signed-in business tool is usually fine as a client-rendered app, and a public page that must load fast and be found by search engines needs the server.</p>
  ${H.table(['Approach', 'How it works', 'Fits'], [
    ['Client-side rendering (Vite single-page app)', 'the server sends an almost empty page and JavaScript builds the UI', 'internal tools and dashboards behind sign-in. Static hosting plus a separate API'],
    ['Server-side rendering + hydration', 'the server sends real HTML, then JavaScript attaches event handlers to it', 'public pages where first paint and SEO matter'],
    ['Static generation', 'HTML is built ahead of time', 'content that rarely changes'],
    ['Server Components', 'some components run only on the server and send no JavaScript. Interactive parts are marked as client components', 'content-heavy apps on a framework such as Next.js']
  ])}
  <p><b>Trade-offs I would raise:</b></p>
  <ul>
    <li>Server rendering needs a JavaScript server to run and operate. With an existing .NET API and static hosting, a single-page app keeps deployment simple.</li>
    <li><b>Hydration mismatch:</b> server and client must render the same first output. Dates, random values and <code>window</code> checks break it.</li>
    <li>Server Components change the data-fetching model and tie you to a framework. That is a team decision, not a per-component one.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> For a signed-in line-of-business app with a .NET API I default to a Vite single-page app. I move to a server-rendering framework when first-load speed or SEO is a real requirement, and I name the operational cost.</blockquote>`,
  followUps: ['What is hydration and what is a hydration mismatch?', 'Where does authentication live in a server-rendered app?', 'How would you migrate an existing single-page app step by step?'] });

// ================= INTERVIEW: ANGULAR =================
interview.push({ q: 'Give an overview of Angular architecture.', level: 'B',
  a: `<p>Angular is a complete front-end framework in TypeScript: routing, forms, HTTP, dependency injection and testing tools are all included and designed to work together.</p>
  ${H.table(['Building block', 'What it is'], [
    ['Component', 'a class plus a template plus styles: one piece of screen'],
    ['Service', 'a class with logic and no UI, shared through dependency injection'],
    ['Directive', 'adds behaviour to an element (attribute directive) or changes the layout (structural directive)'],
    ['Pipe', 'formats a value in a template, such as a date'],
    ['Standalone component', 'declares its own imports. The default today. NgModules are the older way to group things and are still supported'],
    ['Router', 'maps URLs to components, with guards and lazy loading'],
    ['Signals and RxJS', 'signals for state, RxJS for streams of events']
  ])}
  ${C(`
  @Component({
    selector: 'app-user-list',
    imports: [UserRow],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: ~~
      @if (loading()) { <p>Loading</p> }
      @for (u of users(); track u.id) {
        <app-user-row [user]="u" (selected)="open($event)" />
      } @empty { <p>No users</p> }
    ~~,
  })
  export class UserList {
    private api = inject(UserService);
    users = signal<User[]>([]);
    loading = signal(false);
    open(u: User) { console.log(u.id); }
  }
  `)}
  <blockquote><b>Say it in the interview:</b> Angular is an opinionated, batteries-included framework. Components show the UI, services hold logic and are injected, and modern Angular uses standalone components with signals for state and RxJS for streams.</blockquote>`,
  followUps: ['What is the difference between a component and a directive?', 'What does <code>imports</code> on a component do?', 'Are NgModules gone?'] });

interview.push({ q: 'Explain data binding, directives and the built-in control flow in Angular templates.', level: 'B',
  a: `<p>Binding connects the component class to its template: square brackets send data into an element, round brackets listen to events coming out.</p>
  ${H.table(['Syntax', 'Meaning'], [
    ['<code>{{ value }}</code>', 'interpolation: show a value as text'],
    ['<code>[prop]="expr"</code>', 'property binding: data goes down into an element or child'],
    ['<code>(event)="handler($event)"</code>', 'event binding: the child or element reports up'],
    ['<code>[(ngModel)]="x"</code>', 'two-way binding: both at once'],
    ['<code>[class.active]</code>, <code>[style.width.px]</code>', 'toggle a class, set one style'],
    ['<code>@if</code>, <code>@for ... track</code>, <code>@switch</code>, <code>@defer</code>', 'built-in control flow: condition, loop, switch, lazy part of a template'],
    ['<code>*ngIf</code>, <code>*ngFor</code>, <code>*ngSwitch</code>', 'the older structural directives. Same job, still found in existing code'],
    ['<code>input()</code>, <code>output()</code>, <code>model()</code>', 'signal-based inputs and outputs of a component. The decorator forms <code>@Input()</code> and <code>@Output()</code> still work']
  ])}
  <ul>
    <li><code>@for</code> requires <code>track</code>, which tells Angular how to recognise an item, like a key in React.</li>
    <li><code>@defer</code> downloads part of a template only when needed, for example when it scrolls into view.</li>
    <li>The new control flow is built into the compiler, so nothing has to be imported for it.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> Square brackets bind data in, round brackets bind events out, and the banana-in-a-box does both. For conditions and loops I use the built-in @if and @for with track, and I can read the older star directives.</blockquote>`,
  followUps: ['Why is <code>track</code> mandatory in <code>@for</code>?', 'How does two-way binding work underneath?', 'What triggers a <code>@defer</code> block to load?'] });

interview.push({ q: 'Rapid fire: Angular basics', level: 'B',
  a: `<p>Short answers to the Angular warm-up questions.</p>
  ${H.table(['Question', 'Short answer'], [
    ['Component lifecycle hooks?', '<code>ngOnChanges</code> (an input changed), <code>ngOnInit</code> (once, after the first inputs are set), <code>ngDoCheck</code>, <code>ngAfterContentInit</code>, <code>ngAfterViewInit</code> (the view and its children exist), <code>ngOnDestroy</code> (clean up)'],
    ['<code>ngOnInit</code> vs constructor?', 'The constructor is for getting dependencies and simple setup. Decorator inputs are not set yet. <code>ngOnInit</code> runs after the first inputs are set'],
    ['What is a standalone component?', 'A component that is not declared in an NgModule and lists what its template needs in its own <code>imports</code>'],
    ['<code>trackBy</code> / <code>track</code>?', 'Gives each list item an identity, so Angular reuses its DOM instead of rebuilding the list'],
    ['How do components share data?', 'Parent to child with inputs, child to parent with outputs, anywhere with a shared service holding a signal or BehaviorSubject, and through route parameters'],
    ['How do you lazy load?', '<code>loadComponent</code> for one component, <code>loadChildren</code> for a group of routes, <code>@defer</code> inside a template']
  ])}
  <blockquote><b>Say it in the interview:</b> Constructor for injection, ngOnInit for work that needs inputs, ngOnDestroy for clean-up. Data goes down with inputs and up with outputs, and unrelated components share a service.</blockquote>`,
  followUps: ['Which hook fires when an input changes?', 'Where do you safely touch the DOM?', 'What is content projection?'] });

interview.push({ q: 'Angular vs React: what is the difference, and when would you pick each?', level: 'B',
  a: `<p>Angular is a full framework that decides most things for you, and React is a UI library where you choose the surrounding tools yourself.</p>
  ${H.table(['', 'Angular', 'React'], [
    ['Type', 'complete, opinionated framework', 'UI library plus your chosen stack'],
    ['Language', 'TypeScript', 'JavaScript or TypeScript'],
    ['Templates', 'HTML templates with binding syntax', 'JSX: UI written in JavaScript'],
    ['State', 'services, signals, RxJS', 'hooks, context, libraries'],
    ['Dependency injection', 'built in', 'none built in. Context and composition'],
    ['Router, forms, HTTP', 'included', 'separate libraries'],
    ['Fits', 'large teams and long-lived enterprise apps that benefit from one standard way', 'product UIs that need flexibility and a wide ecosystem']
  ])}
  <p><b>What transfers between them:</b> components, one-way data flow, typed API contracts, a central place for HTTP concerns (interceptor or API client), route guards, lazy loading, and testing the UI through what the user sees.</p>
  <p><b>How to answer as a lead:</b> do not attack either. Say which constraints decide: the team's skills, hiring, how long the app will live, how much structure the organisation needs, and what already exists.</p>
  <blockquote><b>Say it in the interview:</b> Angular gives structure and one standard way, which helps big long-lived projects. React gives flexibility and a large ecosystem. The concepts transfer, so I choose by team and product constraints, not by taste.</blockquote>`,
  followUps: ['Which is faster?', 'What would make you choose Angular for a new project today?', 'How would you run both in one organisation?'] });

interview.push({ q: 'How does dependency injection work in Angular? What is a service?', level: 'I',
  a: `<p>A service is a class that holds logic or data with no UI, and dependency injection means Angular creates it and hands it to whoever asks.</p>
  ${C(`
  @Injectable({ providedIn: 'root' })           // one instance for the whole app
  export class UserService {
    private http = inject(HttpClient);
    getUsers(q: string) { return this.http.get<Page<User>>('/api/users', { params: { q } }); }
  }
  `)}
  <ul>
    <li><b>Asking:</b> with the <code>inject()</code> function in a field or constructor, or as a constructor parameter.</li>
    <li><b>Where instances live (the injector hierarchy):</b> Angular looks at the component first, then its parents, then the route, then the root.
      <ul>
        <li><code>providedIn: 'root'</code>: one shared instance. Removed from the bundle if nothing uses it.</li>
        <li><code>providers</code> on a route: one instance for that area of the app.</li>
        <li><code>providers</code> on a component: a new instance for each component instance.</li>
      </ul>
    </li>
    <li><b><code>InjectionToken</code>:</b> the key to use when the thing injected is not a class, such as a config object or an interface.</li>
    <li><b>Why it matters:</b> tests can swap the real service for a fake, and components do not know how their dependencies are built.</li>
  </ul>
  <p><code>inject()</code> only works while Angular is creating something (an injection context). Calling it later inside a callback throws an error.</p>
  <blockquote><b>Say it in the interview:</b> Services are injectable classes. providedIn root gives an app-wide singleton, providers on a component gives one per component, and I use InjectionToken for config. DI makes code testable because dependencies can be replaced.</blockquote>`,
  followUps: ['How do you provide a different implementation in a test?', 'What is the difference between <code>providers</code> and <code>viewProviders</code>?', 'When does <code>inject()</code> throw?'] });

interview.push({ q: 'Template-driven vs reactive forms in Angular?', level: 'I',
  a: `<p>Template-driven forms describe the form in the HTML, and reactive forms build it in the component class as objects you can inspect and test.</p>
  ${H.table(['', 'Template-driven', 'Reactive'], [
    ['Form model is defined in', 'the template, with <code>ngModel</code>', 'the class: <code>FormGroup</code>, <code>FormControl</code>, <code>FormArray</code>'],
    ['Validation', 'attributes and directives', 'validator functions in code'],
    ['Typing', 'weak', 'strongly typed values'],
    ['Testing', 'needs the rendered template', 'plain unit tests on the form object'],
    ['Best for', 'small, simple forms', 'large, dynamic or complex forms']
  ])}
  ${C(`
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  });
  onSubmit() {
    if (this.form.invalid) return;
    this.api.create(this.form.getRawValue()).subscribe();
  }
  `)}
  <ul>
    <li>A <b>custom validator</b> is a function that takes a control and returns an error object or <code>null</code>.</li>
    <li>An <b>async validator</b> returns an observable or promise, for example "is this email already taken?".</li>
    <li><code>nonNullable</code> makes a reset go back to the initial value instead of <code>null</code>.</li>
    <li>Newer Angular versions are also introducing a signal-based forms API. Check its status in your version before using it.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> I use reactive forms for anything non-trivial because the model is explicit, typed and testable, and template-driven forms only for small simple cases.</blockquote>`,
  followUps: ['How do you validate two fields against each other?', 'How do you add and remove rows in a dynamic form?', '<code>value</code> vs <code>getRawValue()</code>?'] });

interview.push({ q: 'How do routing, guards, lazy loading and resolvers work in Angular?', level: 'I',
  a: `<p>The router maps a URL to a component, guards decide whether navigation is allowed, lazy loading downloads a route's code only when visited, and a resolver fetches data before the screen opens.</p>
  ${C(`
  export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'clients' },
    { path: 'clients', canActivate: [authGuard],
      loadComponent: () => import('./clients/clients').then(m => m.Clients) },
    { path: 'admin', canMatch: [roleGuard('Admin')],
      loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES) },
    { path: '**', component: NotFound },
  ];

  export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
  };
  `)}
  ${H.table(['Guard', 'Question it answers'], [
    ['<code>canActivate</code> / <code>canActivateChild</code>', 'may the user open this route or its children?'],
    ['<code>canMatch</code>', 'should this route be considered at all? If not, the router tries the next one and the lazy code is not downloaded'],
    ['<code>canDeactivate</code>', 'may the user leave, for example with unsaved changes?'],
    ['<code>resolve</code>', 'load data before the component is shown']
  ])}
  <p>Guards are plain functions that return <code>true</code>, <code>false</code> or a redirect URL. They protect the experience, not the data: the API still checks every request.</p>
  <blockquote><b>Say it in the interview:</b> I lazy load feature routes with loadComponent and loadChildren, protect them with functional guards that return a redirect, and remember that guards are for user experience while the API enforces security.</blockquote>`,
  followUps: ['<code>canActivate</code> vs <code>canMatch</code>?', 'What is the downside of a resolver?', 'How do you read route parameters in a component?'] });

interview.push({ q: 'What are signals in Angular?', level: 'I',
  a: `<p>A signal is a container for a value that knows who is reading it, so when the value changes Angular updates exactly those places.</p>
  ${C(`
  count = signal(0);                                  // writable signal
  double = computed(() => this.count() * 2);          // derived value, cached
  constructor() { effect(() => console.log('count is', this.count())); }
  inc() { this.count.update(c => c + 1); }            // or this.count.set(5)
  `)}
  <ul>
    <li><b>Read</b> by calling it: <code>count()</code>. <b>Write</b> with <code>set</code> or <code>update</code>.</li>
    <li><b><code>computed</code></b> recalculates only when a signal it read has changed, and only when someone asks for it.</li>
    <li><b><code>effect</code></b> runs a side effect when the signals it read change. Use it for logging or syncing to storage, not to copy one signal into another.</li>
    <li><b>In templates</b> a signal read tells Angular precisely which view depends on it. This works well with OnPush and is what makes zoneless change detection possible.</li>
    <li>Component inputs can be signals too: <code>name = input.required&lt;string&gt;()</code>.</li>
  </ul>
  ${H.table(['Use', 'For'], [
    ['Signals', 'state that always has a current value and is read synchronously'],
    ['RxJS', 'events over time: HTTP, WebSockets, debounced input, cancellation']
  ])}
  <p>Bridges: <code>toSignal(observable)</code> and <code>toObservable(signal)</code>.</p>
  <blockquote><b>Say it in the interview:</b> Signals give fine-grained reactivity with a simple model: signal for state, computed for derived values, effect for side effects. I keep RxJS for streams and convert between the two with toSignal and toObservable.</blockquote>`,
  followUps: ['Why is <code>computed</code> better than an <code>effect</code> that sets another signal?', 'How is a signal different from a BehaviorSubject?', 'What is <code>linkedSignal</code> for?'] });

interview.push({ q: 'Rapid fire: Angular, one level deeper', level: 'I',
  a: `<p>Short answers to the second round of Angular quick questions.</p>
  ${H.table(['Question', 'Short answer'], [
    ['Pure vs impure pipe?', 'A pure pipe runs only when its input value or reference changes. An impure pipe runs on every change detection, so it can be slow'],
    ['<code>ViewChild</code> vs <code>ContentChild</code>?', 'ViewChild finds an element in the component\'s own template. ContentChild finds content the parent projected in through <code>ng-content</code>. Signal versions: <code>viewChild()</code>, <code>contentChild()</code>'],
    ['What is AOT?', 'Ahead-of-time compilation: templates are compiled during the build. Faster start, smaller bundle, template errors found at build time'],
    ['How do you test?', '<code>TestBed</code> to create components and services, <code>HttpTestingController</code> to fake HTTP, component harnesses for UI libraries. Runners: Vitest or Jest in current projects, Jasmine with Karma in older ones'],
    ['Server-side rendering?', 'Angular SSR renders HTML on the server, then hydration attaches the app to that HTML in the browser instead of rebuilding it'],
    ['NgRx?', 'A Redux-style store for Angular: actions, reducers, selectors, effects. Use it only when state complexity justifies the ceremony. A service with signals is enough for most features']
  ])}
  <blockquote><b>Say it in the interview:</b> Pure pipes are cached by input, AOT compiles templates at build time, tests use TestBed with a fake HTTP backend, and I bring in NgRx only when shared state is complex enough to need it.</blockquote>`,
  followUps: ['Why is a filter pipe on a large list a bad idea?', 'What does hydration save?', 'When is NgRx worth it?'] });

interview.push({ q: 'What is the difference between NgModules and standalone components, and how do you migrate?', level: 'I',
  a: `<p>An NgModule is a container class that declares components and says what they can use, and a standalone component skips the container and lists its own dependencies.</p>
  ${H.table(['', 'NgModule style', 'Standalone style'], [
    ['Where a component is registered', 'in a module\'s <code>declarations</code>', 'nowhere. It imports what it needs itself'],
    ['What a template can use', 'whatever the module imports', 'whatever the component lists in <code>imports</code>'],
    ['App start', '<code>bootstrapModule(AppModule)</code>', '<code>bootstrapApplication(App, { providers })</code>'],
    ['Setup of router, HTTP', '<code>RouterModule.forRoot</code>, <code>HttpClientModule</code>', '<code>provideRouter(routes)</code>, <code>provideHttpClient()</code>'],
    ['Lazy loading', 'a whole module', 'a single component or a routes file']
  ])}
  <p><b>Why standalone won:</b> less boilerplate, dependencies are visible in the file you are reading, better tree-shaking, simpler lazy loading. It is the default for new components, and both styles can live in one app.</p>
  <p><b>Migrating:</b></p>
  <ol>
    <li>Run the official schematic, <code>ng generate @angular/core:standalone</code>, in its three passes: convert components, remove modules that are no longer needed, switch to the standalone bootstrap.</li>
    <li>Do it feature by feature, with tests green between passes.</li>
    <li>Replace module-based setup with the <code>provide...</code> functions, then convert lazy modules to lazy routes.</li>
  </ol>
  <blockquote><b>Say it in the interview:</b> Standalone components declare their own imports, so NgModules become optional. I migrate with the official schematic, one feature at a time, because both styles interoperate.</blockquote>`,
  followUps: ['Is there still a reason to write an NgModule?', 'How do you share a set of common imports between components?', 'What replaces <code>forRoot</code>?'] });

interview.push({ q: 'Explain RxJS essentials: observables, the flattening operators, subjects.', level: 'A',
  a: `<p>RxJS models values that arrive over time as a stream called an observable, and operators are functions that transform that stream.</p>
  ${C(`
  this.search$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.api.getUsers(q).pipe(catchError(() => of({ items: [] })))),  // cancels the previous request
    takeUntilDestroyed(),                                                            // unsubscribes automatically
  ).subscribe(page => this.users.set(page.items));
  `)}
  ${H.table(['Operator', 'Behaviour', 'Use for'], [
    ['<code>switchMap</code>', 'cancels the previous inner stream', 'search, typeahead'],
    ['<code>mergeMap</code>', 'runs all at once', 'independent parallel calls'],
    ['<code>concatMap</code>', 'queues, keeps order', 'saves that must happen in sequence'],
    ['<code>exhaustMap</code>', 'ignores new values while one is running', 'double-click on submit, login'],
    ['<code>combineLatest</code>', 'emits the latest value of each source', 'derived state'],
    ['<code>forkJoin</code>', 'waits for all to complete, emits once', 'load several things before showing a page'],
    ['<code>shareReplay(1)</code>', 'one execution shared by many subscribers, replays the last value', 'a cached HTTP result']
  ])}
  <ul>
    <li><b>Cold vs hot:</b> a cold observable starts work for each subscriber (an <code>HttpClient</code> call). A hot one emits whether or not anyone listens (mouse events, a Subject).</li>
    <li><b>Subject</b> has no initial value. <b>BehaviorSubject</b> holds a current value. <b>ReplaySubject</b> replays the last N to new subscribers.</li>
    <li>Put <code>catchError</code> on the inner stream, or one error ends the whole outer stream.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> switchMap cancels, mergeMap runs in parallel, concatMap queues, exhaustMap ignores. I pick by what should happen to a new value while the previous request is still running.</blockquote>`,
  followUps: ['What happens if <code>catchError</code> is on the outer stream instead?', 'Why does an HTTP call run twice with two subscribers?', '<code>forkJoin</code> vs <code>combineLatest</code>?'] });

interview.push({ q: 'How does change detection work in Angular, and how do you make it fast?', level: 'A',
  a: `<p>Change detection is how Angular finds out that data changed and updates the page, and the performance work is making it check fewer components.</p>
  ${H.table(['Mode', 'When a component is checked'], [
    ['Default, with zone.js', 'after any async event anywhere in the app (click, timer, HTTP response), Angular checks the whole tree from the top'],
    ['<code>OnPush</code>', 'only when an input gets a new reference, an event fires in the component or its children, an <code>async</code> pipe receives a value, a signal read in its template changes, or <code>markForCheck()</code> is called'],
    ['Zoneless', 'no zone.js. Angular runs only when notified by signals, template events, the async pipe or <code>markForCheck()</code>']
  ])}
  <p><b>What zone.js does:</b> it wraps browser async functions so Angular knows "something may have changed" and starts a check.</p>
  <p><b>The classic OnPush bug:</b> pushing into an array keeps the same reference, so the child is not checked. Create a new array, or hold the list in a signal.</p>
  <p><b>Other tools:</b></p>
  <ul>
    <li><code>track</code> in <code>@for</code> so list DOM is reused;</li>
    <li>lazy routes and <code>@defer</code> blocks to load less code;</li>
    <li>pure pipes instead of method calls in templates, because a method runs on every check;</li>
    <li>virtual scrolling for long lists (<code>cdk-virtual-scroll-viewport</code>);</li>
    <li>Angular DevTools profiler to measure before changing anything.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> By default zone.js triggers a check of the whole tree after every async event. I use OnPush with immutable data and signals so only affected components are checked, and that also prepares the app for zoneless.</blockquote>`,
  followUps: ['What is ExpressionChangedAfterItHasBeenChecked?', 'Why is calling a method in a template a performance risk?', '<code>markForCheck</code> vs <code>detectChanges</code>?'] });

interview.push({ q: 'How do HTTP interceptors work, and how do you handle authentication in Angular?', level: 'A',
  a: `<p>An interceptor is a function that every HTTP request and response passes through, so it is the one place to attach the token and handle errors.</p>
  ${C(`
  export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);              // inject here, at the top, not inside a callback
    const token = auth.accessToken();
    const authReq = token ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } }) : req;
    return next(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) auth.login();      // or refresh the token and retry once
        return throwError(() => err);
      }),
    );
  };

  bootstrapApplication(App, {
    providers: [provideHttpClient(withInterceptors([authInterceptor])), provideRouter(routes)],
  });
  `)}
  <ul>
    <li>Requests are immutable, so you <code>clone</code> and change the copy.</li>
    <li>Interceptors run in the order listed.</li>
    <li>Attach the token only to your own API URLs. Never send it to third-party hosts.</li>
    <li>On 401, refresh once and share that one refresh between parallel requests. Do not loop.</li>
  </ul>
  <p><b>With Microsoft Entra ID:</b> MSAL Angular provides <code>MsalInterceptor</code>, which gets and attaches tokens for the URLs listed in <code>protectedResourceMap</code>, and <code>MsalGuard</code> to protect routes. The API still validates the token on every request.</p>
  <blockquote><b>Say it in the interview:</b> A functional interceptor clones the request, adds the bearer token for my API only, and handles 401 in one place. With Entra ID I use the MSAL interceptor and guard, and the API still validates every token.</blockquote>`,
  followUps: ['Ten requests get 401 at the same time. How do you refresh only once?', 'Why must the token not go to every URL?', 'Functional interceptor vs the older class-based one?'] });

interview.push({ q: 'How do subscriptions cause memory leaks in Angular, and how do you prevent them?', level: 'A',
  a: `<p>A subscription to a stream that never ends keeps your component alive after it has left the screen, so memory grows and old callbacks keep running.</p>
  <p><b>Symptoms:</b> the app gets slower the longer it is open, the same API call fires several times after navigating back and forth, handlers run for screens that are gone.</p>
  ${H.table(['Source', 'Ends by itself?'], [
    ['<code>HttpClient</code> request', 'yes, after the response. Still worth cancelling when leaving the page'],
    ['Subject or BehaviorSubject in a root service', 'no'],
    ['<code>interval</code>, <code>fromEvent</code>, WebSocket', 'no'],
    ['Router events, form <code>valueChanges</code>', 'no, they live as long as the router or the form']
  ])}
  <p><b>Prevention, best first:</b></p>
  <ul>
    <li><b>Do not subscribe by hand.</b> Use the <code>async</code> pipe or <code>toSignal()</code>. Both clean up automatically.</li>
    <li><code>takeUntilDestroyed()</code> at the end of the pipe. Called in a constructor or field it needs no argument. Elsewhere pass a <code>DestroyRef</code>.</li>
    <li>Older code: a <code>destroy$</code> Subject with <code>takeUntil</code>, completed in <code>ngOnDestroy</code>.</li>
    <li>Avoid nested <code>subscribe</code> calls. Use a flattening operator so there is one subscription to manage.</li>
  </ul>
  <p><b>Finding one:</b> take heap snapshots in browser dev tools before and after repeating a navigation, and look for component instances that should be gone. A lint rule that flags a bare <code>subscribe</code> in components keeps it from returning.</p>
  <blockquote><b>Say it in the interview:</b> Long-lived streams hold on to destroyed components. I avoid manual subscribe with the async pipe or toSignal, and where I must subscribe I end the pipe with takeUntilDestroyed.</blockquote>`,
  followUps: ['Where must <code>takeUntil</code> sit in the operator chain?', 'Does <code>shareReplay</code> leak?', 'How would you prove a leak is fixed?'] });

interview.push({ q: 'What is zoneless change detection, and how would you move an existing app to it?', level: 'E',
  a: `<p>Zoneless means Angular no longer uses zone.js to guess when something changed. It updates the screen only when the code tells it that state changed.</p>
  <p><b>What notifies Angular without zones:</b> a signal read in a template gets a new value, an event bound in a template fires, the <code>async</code> pipe receives a value, <code>markForCheck()</code> is called, or an input is set on a component.</p>
  <p><b>Why bother:</b> a smaller bundle and faster start, no hidden wrapping of every browser async call, readable stack traces, fewer wasted checks, and easier use next to non-Angular code.</p>
  <p><b>What breaks:</b> code that sets a plain class field inside <code>setTimeout</code>, a promise or a manual subscription and relied on zone.js to refresh the view. Also code that uses <code>NgZone.onStable</code> and similar APIs, and libraries that assume zones.</p>
  <p><b>Migration plan:</b></p>
  <ol>
    <li>Make every component <code>OnPush</code>. A component that works correctly with OnPush is generally ready for zoneless.</li>
    <li>Move view state into signals. Replace manual subscribes with <code>toSignal</code> or the async pipe.</li>
    <li>Remove <code>NgZone</code> usages and check third-party libraries.</li>
    <li>Enable <code>provideZonelessChangeDetection()</code>, run the tests and an end-to-end pass, then remove the zone.js polyfill.</li>
  </ol>
  <p>New projects in recent Angular versions start without zone.js.</p>
  <blockquote><b>Say it in the interview:</b> Zoneless replaces "check everything after any async event" with explicit notifications, mainly signals. I get there in steps: OnPush everywhere, state in signals, remove NgZone code, then switch the provider and drop zone.js.</blockquote>`,
  followUps: ['How do you find the components that still depend on zone.js?', 'What changes in unit tests?', 'How does server-side rendering know the app is stable without zones?'] });

interview.push({ q: 'As tech lead you are starting a new enterprise front end for several teams. How do you choose the framework and structure it?', level: 'E',
  a: `<p>I decide from constraints, write the decision down, and then put most of the effort into the structure around the framework, because that is what keeps several teams fast.</p>
  <p><b>Choosing:</b></p>
  ${H.table(['Question', 'Points towards'], [
    ['What do the teams already know, and who can we hire?', 'the framework they are productive in'],
    ['Many teams, long life, need for one standard way?', 'Angular: conventions are built in'],
    ['Existing React components or libraries?', 'React, with our own written conventions'],
    ['Public pages with SEO and first-load targets?', 'a server-rendering setup in either'],
  ])}
  <p><b>Structure, whichever is chosen:</b></p>
  <ul>
    <li><b>One repository</b> with feature folders and enforced boundaries: a feature may import shared code, not another feature's internals.</li>
    <li><b>A shared design system</b> wrapping the UI library, with accessibility built in.</li>
    <li><b>Generated API types</b> from the OpenAPI document, and one HTTP layer for auth, errors and tracing.</li>
    <li><b>State rules</b> on one page: local first, server data in a cache, shareable state in the URL.</li>
    <li><b>Quality gates in CI:</b> strict TypeScript, lint, tests, a bundle-size budget, accessibility checks.</li>
    <li><b>Decision records</b> so later joiners know why.</li>
  </ul>
  <p><b>Micro-frontends:</b> only when teams truly need to deploy independently. They add cost, so a well-structured single app is the better default.</p>
  <blockquote><b>Say it in the interview:</b> I choose by team skills, lifetime and need for structure, record the decision, and invest in boundaries, a design system, generated API types and CI gates. I avoid micro-frontends unless independent deployment is a real requirement.</blockquote>`,
  followUps: ['Two teams disagree on the framework. How do you settle it?', 'How do you enforce module boundaries?', 'When would micro-frontends be the right call?'] });

// ================= PRACTICE =================
practice.push(P({
  t: 'The build is green but the screen shows "undefined"', l: 'Easy', tags: ['typescript', 'api contract'],
  s: 'After a back-end release, the order list shows "undefined" in the customer column. The front end compiled with no errors and its <code>Order</code> interface has <code>customerName: string</code>. The API now returns <code>customer_name</code>. Explain why TypeScript did not catch this and how you would prevent it.',
  ex: '<p>Code: <code>const orders = (await res.json()) as Order[]</code>. The compiler believes the cast. At run time each object has <code>customer_name</code>, so <code>order.customerName</code> is <code>undefined</code>.</p>',
  weak: 'TypeScript must have a bug, or someone forgot to rebuild. I would rename the field in the interface and redeploy.',
  why: 'It fixes today\'s symptom and shows no understanding of why a typed code base let wrong data in. The same thing will happen at the next rename.',
  q: ['Why did the compiler not report the renamed field?', ['The interface was declared with <code>type</code> instead of <code>interface</code>', 'Types are erased and <code>as Order[]</code> is an unchecked claim about run-time data', '<code>strict</code> was turned off', 'JSON cannot be typed'], 1, 'The compiler never sees the real response. The assertion tells it to assume the shape.'],
  h: ['Ask what the compiler actually knows about the bytes that arrive from the network.', 'Find the exact line where untyped JSON turns into a typed value. What checked it?', 'Two layers: a run-time check at the boundary, and a build-time link between the API contract and the front-end types.'],
  a: `<p>TypeScript types are removed at build time, so nothing checks the real response. The line <code>(await res.json()) as Order[]</code> is a promise from the developer, not a check. When the server changed the field name, the promise became false and the compiler had no way to know.</p>
    <p><b>Fix now:</b> align the name (agree with the back end whether the contract or the client changes) and add a test.</p>
    <p><b>Prevent:</b> (1) generate the front-end types from the API's OpenAPI document in CI, so a contract change breaks the front-end build; (2) parse important responses with a schema at the boundary, so wrong data fails loudly at the API client with a clear message instead of showing "undefined" three screens later; (3) treat a field rename as a breaking API change that needs versioning or a transition period where both names are sent.</p>`,
  cx: 'you say "types are erased", point at the cast as the weak spot, and give both a run-time and a build-time prevention, plus the API versioning angle.',
  f: ['Who should own the contract, front end or back end?', 'How do you roll out a field rename without downtime?']
}));

practice.push(P({
  t: 'Deleting a row moves the typed text to the wrong row', l: 'Easy', tags: ['react', 'keys'],
  s: 'A React screen shows a list of invoice lines, each with a notes input. The user types notes into line 2, then deletes line 1. Now the notes appear on the wrong line. The list is rendered with <code>lines.map((line, i) =&gt; &lt;LineRow key={i} line={line} /&gt;)</code>. What is wrong?',
  ex: '<p>Before: keys 0, 1, 2 for lines A, B, C. After deleting A: keys 0, 1 for lines B, C. React sees "key 0 is still here", keeps the old component for key 0 with its internal state, and only passes it new props.</p>',
  weak: 'React has a rendering glitch, so I would force a refresh of the list after each delete.',
  why: 'Forcing a refresh hides the cause and throws away all row state. The real issue is that the key does not identify the item.',
  q: ['What should the key be?', ['The array index', 'A random number generated on each render', 'A stable unique id of the line', 'The line description text'], 2, 'A stable id follows the item when the list changes. A random key would recreate every row on every render.'],
  h: ['What does React use the key for when the list changes?', 'Write down the keys before and after the delete and see which row React thinks was removed.', 'Use an id that belongs to the item. For rows not saved yet, generate an id once when the row is created.'],
  a: `<p>The key is the array index, and an index identifies a <i>position</i>, not an <i>item</i>. After deleting the first line, every remaining line moves up one position, so React matches each row component with a different line. Local state inside the row (the uncontrolled input text, focus) stays with the position and now belongs to the wrong line. React thinks the <b>last</b> row was removed.</p>
    <p><b>Fix:</b> use a stable id from the data, <code>key={line.id}</code>. For new lines that have no database id yet, create a client id once when the line is added (for example with <code>crypto.randomUUID()</code>) and store it on the line. Never generate the key during render.</p>
    <p>Index keys are only safe for a static list that never reorders, filters or deletes.</p>`,
  cx: 'you explain identity versus position, say what React does during reconciliation, and handle the "no id yet" case.',
  f: ['Why is <code>key={Math.random()}</code> also wrong?', 'How can a key be used on purpose to reset a component?']
}));

practice.push(P({
  t: 'The Angular list does not update after adding an item', l: 'Easy', tags: ['angular', 'change detection'],
  s: 'A parent component does <code>this.items.push(newItem)</code> and passes <code>items</code> to a child that uses <code>ChangeDetectionStrategy.OnPush</code>. The new item does not appear until the user clicks somewhere in the child. Why, and what are the fixes?',
  ex: '<p>Before and after the push, <code>items</code> is the same array object. The child input received the same reference, so OnPush sees "nothing changed".</p>',
  weak: 'OnPush is buggy. I would remove it, or call detectChanges() after every push.',
  why: 'Removing OnPush gives up the performance benefit for the whole subtree, and manual detectChanges calls spread through the code and are easy to forget.',
  q: ['Which change makes the OnPush child update?', ['<code>this.items.push(newItem)</code> followed by a <code>setTimeout</code>', '<code>this.items = [...this.items, newItem]</code>', 'Sorting the array in place', 'Marking the array <code>readonly</code>'], 1, 'A new array is a new reference, which is what OnPush compares.'],
  h: ['List the things that cause an OnPush component to be checked.', 'Is the array before the push the same object as after it?', 'Either give the child a new reference, or keep the list in a signal and update it immutably.'],
  a: `<p>With OnPush, a component is checked when an input gets a <b>new reference</b>, when an event fires inside it, when an async pipe emits, or when a signal it reads changes. <code>push</code> changes the contents of the array but not the reference, so Angular skips the child. Clicking inside the child is an event in that component, which is why the item then appears.</p>
    <p><b>Fixes:</b> (1) update immutably, <code>this.items = [...this.items, newItem]</code>; (2) better, keep the list in a signal and use <code>this.items.update(list =&gt; [...list, newItem])</code>, so the template dependency is tracked precisely; (3) if the data arrives as a stream, bind it with the async pipe. I would keep OnPush, because it is also the baseline for zoneless change detection.</p>`,
  cx: 'you list the OnPush triggers correctly, explain reference versus content, and prefer immutable updates or signals over manual change detection calls.',
  f: ['When is <code>markForCheck()</code> the right tool?', 'What does <code>track</code> add in the child template?']
}));

practice.push(P({
  t: 'The component calls the API in an endless loop', l: 'Medium', tags: ['react', 'useEffect'],
  s: 'The network tab shows the same GET request firing continuously. The code: <code>const filters = { status, region }; useEffect(() =&gt; { load(filters).then(setRows); }, [filters]);</code>. Explain the loop and fix it properly.',
  ex: '<p>Render 1 creates filters object #1, effect runs, <code>setRows</code> causes render 2. Render 2 creates filters object #2. <code>#1 !== #2</code>, so the effect runs again. Repeat forever.</p>',
  weak: 'I would remove filters from the dependency array or pass an empty array to stop the loop.',
  why: 'That stops the loop and introduces a stale closure: the effect no longer runs when status or region changes, so the table shows old data.',
  q: ['Why does React think <code>filters</code> changed on every render?', ['Objects are compared by reference and a new object is created each render', 'useEffect always ignores object dependencies', 'setRows mutates filters', 'StrictMode runs effects twice'], 0, 'Dependencies are compared with Object.is. Two objects with the same content are still different references.'],
  h: ['How does React compare the old and new dependency values?', 'Where is the <code>filters</code> object created, and how often?', 'Depend on the primitive values, or move the fetch to a data library keyed by those values. Also think about cancelling the old request.'],
  a: `<p>React compares each dependency with <code>Object.is</code>. <code>filters</code> is a new object on every render, so it is always "changed". The effect runs, sets state, that causes a render, a new object is created, and the effect runs again.</p>
    <p><b>Fix 1:</b> depend on the primitive values and build the object inside the effect: <code>useEffect(() =&gt; { load({ status, region })... }, [status, region])</code>. Add an <code>AbortController</code> and a cleanup so an older response cannot overwrite a newer one.</p>
    <p><b>Fix 2 (what I would ship):</b> use TanStack Query with <code>queryKey: ['rows', { status, region }]</code>. Query keys are compared by value, and caching, cancellation and error state come for free.</p>
    <p>I would not silence the <code>exhaustive-deps</code> rule. It is pointing at the real problem.</p>`,
  cx: 'you explain reference equality of dependencies, reject the empty-array shortcut with a reason, and mention cancellation or a query library.',
  f: ['Would <code>useMemo</code> on the filters object also work?', 'How does StrictMode affect this effect?']
}));

practice.push(P({
  t: 'Search results belong to an older query', l: 'Medium', tags: ['react', 'angular', 'race condition'],
  s: 'Users type "lap", then quickly "laptop". Sometimes the list ends up showing results for "lap". There is no error in the console. Explain the cause and give the fix in React and in Angular.',
  ex: '<p>Request A ("lap") is sent at 0 ms and answers after 900 ms. Request B ("laptop") is sent at 300 ms and answers after 200 ms. B arrives at 500 ms, A arrives at 900 ms and overwrites it.</p>',
  weak: 'The API is too slow. I would add a longer debounce so only one request is sent.',
  why: 'Debounce reduces how often it happens but does not remove it. Any two requests can still answer out of order.',
  q: ['Which operator solves this in an Angular typeahead?', ['<code>mergeMap</code>', '<code>concatMap</code>', '<code>switchMap</code>', '<code>exhaustMap</code>'], 2, 'switchMap unsubscribes from the previous request when a new value arrives, so only the latest answer is used.'],
  h: ['Do responses always come back in the order the requests were sent?', 'The fix is to make sure only the latest request is allowed to update the screen.', 'React: cancel in the effect cleanup or use a query library. Angular: pick the flattening operator that cancels the previous inner stream.'],
  a: `<p>This is a race condition. Responses can arrive in a different order from the requests, and the code applies whichever arrives last.</p>
    <p><b>React:</b> if fetching in an effect, create an <code>AbortController</code>, pass its signal to <code>fetch</code>, and abort in the cleanup function. When the query text changes, React runs the cleanup first, so the old request is cancelled or ignored. In practice I use TanStack Query with the search text in the query key: it only shows data for the current key and passes a signal for cancellation.</p>
    <p><b>Angular:</b> pipe the search stream through <code>debounceTime</code>, <code>distinctUntilChanged</code> and <code>switchMap</code>. <code>switchMap</code> unsubscribes from the previous <code>HttpClient</code> call, which also aborts the request.</p>
    <p>Debounce is still worth adding, but for load on the API, not for correctness.</p>`,
  cx: 'you name it a race condition, separate "fewer requests" (debounce) from "correct result" (cancel or ignore stale responses), and give the idiomatic fix in both frameworks.',
  f: ['Does aborting the request stop the work on the server?', 'How would you write a test that reproduces this?']
}));

practice.push(P({
  t: 'Typing in one field makes the whole page stutter', l: 'Medium', tags: ['react', 'performance'],
  s: 'A React order-entry page has a header, a 30-field form and a table of 2,000 product rows. Typing in the "customer reference" field lags by half a second per character. How do you investigate and fix it?',
  ex: '<p>Profiler recording of one key press: one commit, 2,100 components rendered, 480 ms. The form state is one object in the page component and every field is controlled.</p>',
  weak: 'I would wrap every component in React.memo and every function in useCallback.',
  why: 'It is a guess without measurement, it adds code everywhere, and memo does nothing if the props are new objects each render.',
  q: ['What is the first step?', ['Add <code>useMemo</code> to every calculation', 'Record the interaction in the React DevTools Profiler', 'Rewrite the page with a different framework', 'Increase the debounce on the input'], 1, 'Measure first. The Profiler shows which components rendered and why.'],
  h: ['Which components really need to know about that one field?', 'Where does the state live compared with where it is used?', 'Order of fixes: move state down or use a form library, memoise rows with stable props, virtualise the table.'],
  a: `<p><b>Measure:</b> I record one key press in the React DevTools Profiler and look at which components rendered and why. Here the form state lives in the page component, so every key press re-renders the page and all 2,000 rows.</p>
    <p><b>Fix in order:</b></p>
    <ol>
      <li><b>Move the state down.</b> Put the form in its own component so the table is not a child of the changing state. Using React Hook Form makes the inputs uncontrolled, so typing re-renders almost nothing.</li>
      <li><b>Memoise the rows</b> with stable keys and props, so the table skips unchanged rows when something above it does change. With the React Compiler enabled much of this is automatic.</li>
      <li><b>Virtualise the table</b> so only the visible 30 or so rows exist in the DOM.</li>
    </ol>
    <p><b>Verify:</b> record again and compare the commit time, then add a simple performance check so it does not regress.</p>`,
  cx: 'you measure before changing code, you see it as a state placement problem, and you apply fixes from cheapest to most invasive and re-measure.',
  f: ['The row is memoised but still re-renders. What do you look for?', 'When would <code>useDeferredValue</code> help here?']
}));

practice.push(P({
  t: 'The Angular app gets slower the longer it is open', l: 'Medium', tags: ['angular', 'rxjs', 'memory'],
  s: 'Support reports that an Angular dashboard becomes sluggish after an hour of use, and that opening the Orders page for the fifth time triggers five identical API calls. A page refresh fixes it. What is happening and how do you fix it for good?',
  ex: '<p>In <code>ngOnInit</code>: <code>this.refreshService.tick$.subscribe(() =&gt; this.load())</code>. <code>tick$</code> is a Subject in a root service. There is no <code>ngOnDestroy</code>.</p>',
  weak: 'The browser is running out of memory, so I would tell users to refresh, or add a timer that reloads the page.',
  why: 'It treats the symptom. The duplicate calls show that old component instances are still alive and still reacting.',
  q: ['Why are there five API calls on the fifth visit?', ['The router caches five copies of the page', 'Five subscriptions from five component instances are still active on the same long-lived Subject', 'HttpClient retries four times by default', 'OnPush is missing'], 1, 'Each visit created a component that subscribed and never unsubscribed, so every old instance still calls load().'],
  h: ['The number of calls equals the number of visits. What is created on every visit and never removed?', 'How long does a Subject in a root service live compared with a page component?', 'Prefer not subscribing by hand at all. Where you must, end the stream when the component is destroyed.'],
  a: `<p>It is a subscription leak. Each time the Orders page opens, a new component subscribes to a Subject that lives in a root service for the whole session. When the component is destroyed nobody unsubscribes, so the Subject still holds its callback, which keeps the dead component in memory and still calls <code>load()</code>. Five visits, five live subscriptions, five API calls.</p>
    <p><b>Fix:</b> add <code>takeUntilDestroyed()</code> to the pipe (in the constructor or a field initializer, or pass a <code>DestroyRef</code>). Better still, remove the manual subscribe: expose the data as an observable or signal and bind it with the async pipe or <code>toSignal</code>.</p>
    <p><b>For good:</b> search the code base for bare <code>subscribe(</code> calls in components, add a lint rule that flags them, and confirm with a heap snapshot before and after repeated navigation that old component instances are gone.</p>`,
  cx: 'you connect "N visits, N calls" to live subscriptions, explain why the service outlives the component, give the modern fix, and add a team-level prevention.',
  f: ['Do you need to unsubscribe from an HttpClient call?', 'How do you find leaked components in a heap snapshot?']
}));

practice.push(P({
  t: 'Every call fails with 401 after about an hour', l: 'Medium', tags: ['auth', 'interceptor'],
  s: 'A single-page app works after sign-in, but users who leave a tab open for about an hour get errors on every action until they reload. Sometimes a burst of ten parallel calls produces ten sign-in prompts. What do you check and how should the client behave?',
  ex: '<p>Access token lifetime: about 60 minutes. The app reads the token once after sign-in, stores it in a variable, and attaches that same string to every request.</p>',
  weak: 'I would increase the token lifetime to 24 hours so users are not interrupted.',
  why: 'A long-lived access token is a security risk if it leaks, and the app is still wrong: it simply fails later.',
  q: ['What should the API client do just before each request?', ['Attach the token saved at sign-in', 'Ask the auth library for a token, which returns a cached one or silently gets a new one', 'Decode the token and extend its expiry', 'Reload the page every 55 minutes'], 1, 'The auth library owns caching and silent renewal. The app should ask it for a token per call instead of holding a copy.'],
  h: ['How long does an access token live, and what does the app do when it expires?', 'Who should own the token: your own variable, or the auth library?', 'Handle 401 in one place: renew once, share that renewal between parallel requests, retry once, and only then send the user to sign in.'],
  a: `<p>The timing points at access-token expiry. The app took the token once and keeps sending it after it has expired, so the API correctly answers 401.</p>
    <p><b>Correct behaviour:</b></p>
    <ol>
      <li>Before each call, the HTTP layer (a React API client or an Angular interceptor) asks the auth library for a token. With MSAL that is the silent acquire call, which returns the cached token or quietly gets a fresh one.</li>
      <li>If a call still returns 401, try one silent renewal and retry the request once.</li>
      <li><b>Share one renewal.</b> Keep the in-flight renewal as a single promise or observable so ten parallel 401s wait for the same result instead of opening ten prompts.</li>
      <li>If silent renewal fails (the session really ended), send the user to interactive sign-in once and keep their place.</li>
    </ol>
    <p>I would also check clock differences and that 403 (signed in but not allowed) is not handled like 401.</p>`,
  cx: 'you read "about an hour" as token expiry, keep the token with the auth library, describe single-flight renewal with one retry, and separate 401 from 403.',
  f: ['Why not just make the access token long-lived?', 'How do you write the single-flight renewal in RxJS?']
}));

practice.push(P({
  t: 'Plan the move of a 300-file JavaScript app to strict TypeScript', l: 'Hard', tags: ['typescript', 'leadership'],
  s: 'You inherit a 300-file JavaScript React app with frequent "cannot read properties of undefined" errors in production. Management wants fewer bugs but will not accept a feature freeze. Present your plan, how you measure progress, and the risks.',
  ex: '<p>Constraints: 5 developers, releases every 2 weeks, test coverage around 30%, an ASP.NET Core API that already publishes an OpenAPI document.</p>',
  weak: 'We create a branch, convert everything to TypeScript over two months, then merge it.',
  why: 'A long-lived branch conflicts with two months of feature work, cannot be released in parts, and delivers no value until the very end.',
  q: ['Where do types give the most value first?', ['In CSS modules', 'At the API boundary and shared utilities used by many files', 'In the largest page component', 'In test files'], 1, 'Typing what many files import spreads safety widely with little work.'],
  h: ['How can JavaScript and TypeScript files live together during the move?', 'Which strict flag targets exactly the production error they are seeing?', 'Think about a ratchet in CI, a rule for new and touched files, and how you would show progress to management.'],
  a: `<p><b>Principle:</b> incremental, always releasable, most valuable parts first.</p>
    <ol>
      <li><b>Week 1:</b> add TypeScript with <code>allowJs</code>, type checking in CI, no behaviour change.</li>
      <li><b>Boundary first:</b> generate types from the OpenAPI document and type the API client. Every caller now gets checked data shapes.</li>
      <li><b>Rules:</b> new files are strict TypeScript. A touched file is converted when it is small enough to do within the task.</li>
      <li><b>Leaves inward:</b> utilities, hooks and shared components, then pages.</li>
      <li><b>Strict flags one by one,</b> <code>strictNullChecks</code> first, because it targets the "undefined" errors directly.</li>
      <li><b>Ratchet:</b> CI fails if the count of type errors, <code>any</code> or suppressions goes up.</li>
    </ol>
    <p><b>Measure:</b> percentage of files converted, suppression count, and the production error rate for null and undefined errors. Report it every sprint.</p>
    <p><b>Risks:</b> stalling at the hard files (schedule them explicitly), "any everywhere" conversions (review rule), and false confidence, since types do not check run-time data (add schema validation on critical responses).</p>`,
  cx: 'incremental plan with no freeze, value-first ordering, a CI ratchet, business-facing metrics, and honest risks including that types do not validate run-time data.',
  f: ['A senior developer says TypeScript slows them down. How do you respond?', 'How would you use an AI assistant in this migration safely?']
}));

practice.push(P({
  t: 'One big context re-renders the whole dashboard', l: 'Hard', tags: ['react', 'state management', 'architecture'],
  s: 'A React dashboard keeps everything in a single <code>AppContext</code>: the user, theme, notifications, a live price feed updating 5 times per second, and the selected filters. Every widget reads the context. The app is slow and bugs appear when two widgets update the same object. Redesign the state.',
  ex: '<p>Each price tick creates a new context value. All 40 widgets re-render 5 times per second, including those that only read the theme.</p>',
  weak: 'Context is slow, so I would move the whole object into Redux.',
  why: 'Moving one big object from one place to another keeps the real problem: unrelated kinds of state with very different change rates are stored and subscribed to together.',
  q: ['Where should the selected filters live if users want to share a link to the same view?', ['In a ref', 'In the URL search parameters', 'In the price feed store', 'In local storage only'], 1, 'The URL is the store that survives refresh and can be shared.'],
  h: ['Sort the pieces of state by how often they change and who needs them.', 'Which of them is really server data, and which should survive a page refresh?', 'Fast-changing shared data needs subscriptions with selectors. Context has none.'],
  a: `<p>I would split the state by kind and by how often it changes:</p>
    <ul>
      <li><b>User and theme:</b> stay in Context, in separate small providers. They change rarely, which is what Context is good at.</li>
      <li><b>Notifications and other API data:</b> server state. Move to TanStack Query so caching and refetching are handled, and widgets subscribe only to their own query.</li>
      <li><b>Filters:</b> into the URL search parameters, so a view can be bookmarked and shared, and Back works.</li>
      <li><b>Live price feed:</b> an external store with selectors (Zustand, or Redux Toolkit), so a widget subscribes to one symbol and re-renders only when that price changes. I would also batch ticks to a sensible display rate.</li>
    </ul>
    <p>The "two widgets update the same object" bugs come from mutation. Updates go through store actions or query mutations and are immutable.</p>
    <p><b>Rollout:</b> one slice at a time behind the existing hook names, starting with the price feed because it causes the most renders, measuring with the Profiler before and after.</p>`,
  cx: 'you classify state (client, server, URL, high-frequency), match each to a tool with a reason, address mutation, and propose an incremental rollout with measurement.',
  f: ['How does a selector prevent a re-render?', 'What does <code>useSyncExternalStore</code> do for external stores?']
}));

practice.push(P({
  t: 'Modernise an older Angular app', l: 'Hard', tags: ['angular', 'migration', 'leadership'],
  s: 'You take over an Angular app built years ago: NgModules everywhere, <code>*ngIf</code> and <code>*ngFor</code>, default change detection, many manual subscriptions, class-based guards and interceptors. The team wants signals and zoneless. Give an ordered plan and say what you would not do.',
  ex: '<p>About 250 components, 40 services, moderate unit test coverage, releases every 3 weeks, several major versions behind the current Angular release.</p>',
  weak: 'We rewrite it from scratch with the latest Angular, using signals everywhere.',
  why: 'A rewrite stops delivery for months, loses years of small fixes, and is rarely needed, because Angular provides automated migrations between versions.',
  q: ['Which step should come first?', ['Switch on zoneless change detection', 'Upgrade Angular version by version with <code>ng update</code>', 'Rewrite all services with signals', 'Replace RxJS completely'], 1, 'Newer APIs and migration schematics only exist in newer versions, and ng update runs the automatic code changes for each step.'],
  h: ['Which changes can tools do for you, and which need human judgement?', 'What must be true about components before zoneless is safe?', 'Order by dependency: version, then structure, then change detection, then state, then zones.'],
  a: `<p><b>Order matters, because each step enables the next:</b></p>
    <ol>
      <li><b>Upgrade the version</b> one major at a time with <code>ng update</code>, keeping tests green. Its schematics apply many code changes automatically.</li>
      <li><b>Run the official migrations:</b> standalone components, built-in control flow (<code>@if</code>, <code>@for</code>), functional guards and interceptors, <code>inject()</code>.</li>
      <li><b>OnPush everywhere,</b> feature by feature. This exposes hidden mutation bugs, which we fix with immutable updates.</li>
      <li><b>Subscriptions:</b> replace manual subscribes with the async pipe, <code>toSignal</code> or <code>takeUntilDestroyed</code>.</li>
      <li><b>Signals</b> for component and service state, new code first, then hot spots. RxJS stays for streams.</li>
      <li><b>Zoneless last,</b> once OnPush and signals are in place and <code>NgZone</code> usages are gone.</li>
    </ol>
    <p><b>What I would not do:</b> a rewrite, a single giant pull request, replacing RxJS wholesale, or switching on zoneless before the groundwork. Each step ships on its own, with the end-to-end suite as the safety net.</p>`,
  cx: 'a dependency-ordered plan, use of official schematics, every step shippable, clear "not doing" list, and risk control through tests.',
  f: ['How do you keep feature work going during this?', 'How do you decide which services should become signal-based?']
}));

practice.push(P({
  t: 'React or Angular for a new product with three teams', l: 'Hard', tags: ['architecture', 'leadership'],
  s: 'Your company starts a new internal product: 3 teams, about 15 front-end developers, an expected life of 8 or more years, .NET APIs, sign-in with Microsoft Entra ID. Half the developers know Angular, half know React. The director asks you for a recommendation in the next meeting. How do you answer?',
  ex: '<p>You are expected to give one recommendation, the reasons, the costs of the option not chosen, and what you would put in place in the first month.</p>',
  weak: 'React, because it is more popular and I like it more.',
  why: 'Popularity and taste are not reasons a director can defend. It ignores half the team, the product lifetime and the need for shared conventions.',
  q: ['Which factor should weigh most in this decision?', ['Stars on the repository', 'Which framework renders a list fastest in a benchmark', 'Team skills, hiring, product lifetime and need for shared conventions', 'Which one the tech lead used last'], 2, 'Both frameworks can build the product. The deciding factors are about people and maintenance.'],
  h: ['Both can build it. So what actually differs for this organisation?', 'What will hurt in year 5: the framework, or 3 teams doing things 3 different ways?', 'Give a recommendation, the trade-off, and the structure you would add either way.'],
  a: `<p>I would say first that both frameworks can deliver this product, so the choice is about people and upkeep, and I would make the criteria explicit: current skills, hiring market, lifetime, how much shared convention three teams need, and existing assets such as component libraries.</p>
    <p><b>A defensible recommendation here:</b> Angular, because with three teams and an 8-year life the built-in router, forms, HTTP, dependency injection and one standard project shape reduce drift between teams, and MSAL has a ready Angular guard and interceptor for Entra ID. The cost is training the React half, which I would plan with pairing and a shared starter. If the company already had a React design system, I would flip the recommendation and write the conventions down ourselves.</p>
    <p><b>Either way, in month one:</b> one repository with enforced feature boundaries, a shared design system, API types generated from OpenAPI, strict TypeScript, a single HTTP and auth layer, CI gates for tests, bundle size and accessibility, and a written decision record.</p>
    <p>I would close by stating what would make me revisit the decision.</p>`,
  cx: 'explicit criteria, one clear recommendation with its cost, fairness to the other option, and concrete first-month structure that matters more than the framework.',
  f: ['The React developers object strongly. What do you do?', 'Would micro-frontends let each team pick its own framework, and why is that usually a bad idea?']
}));

// ================= QUIZ =================
quiz.push({ q: 'A response is typed with <code>(await res.json()) as Order</code>. The server sends a different shape. What happens?', options: ['A compile error', 'A run-time exception on that line', 'Nothing on that line. The wrong data flows on and fails later', 'TypeScript converts the data to match'], answer: 2, explain: 'Types are erased and an assertion checks nothing at run time, so the bad data continues until some later code trips over it.' });
quiz.push({ q: 'Which statement about <code>unknown</code> is correct?', options: ['It is another name for <code>any</code>', 'You must narrow it before you can use it', 'It can only hold <code>null</code>', 'It is removed by <code>strict</code> mode'], answer: 1, explain: 'unknown accepts any value but allows no operation until a check narrows it. any allows everything unchecked.' });
quiz.push({ q: 'What is <code>Omit&lt;User, \'email\'&gt;</code>?', options: ['User with only the email property', 'User with email made optional', 'User without the email property', 'A union of all User keys except email'], answer: 2, explain: 'Omit builds a type with all properties of the first argument except the listed keys.' });
quiz.push({ q: 'In a <code>switch</code> over a discriminated union, what is the purpose of assigning the value to a <code>never</code> variable in <code>default</code>?', options: ['It makes the switch faster', 'It throws at run time', 'It gives a compile error when a union member has no case', 'It converts the value to a string'], answer: 2, explain: 'If every member is handled the value has type never in default. A forgotten member is not assignable to never, so the build fails.' });
quiz.push({ q: 'What does this print? <code>log(\'A\'); setTimeout(() =&gt; log(\'B\'), 0); Promise.resolve().then(() =&gt; log(\'C\')); log(\'D\');</code>', options: ['A B C D', 'A D B C', 'A D C B', 'A C D B'], answer: 2, explain: 'Synchronous code first (A, D), then microtasks such as promise callbacks (C), then macrotasks such as timers (B).' });
quiz.push({ q: 'In React, right after calling <code>setCount(count + 1)</code> inside a click handler, what is the value of <code>count</code> on the next line?', options: ['The new value', 'The old value, because each render has its own fixed <code>count</code>', '<code>undefined</code>', 'It depends on the browser'], answer: 1, explain: 'The setter schedules a new render. The variable in the current render is a constant for that render.' });
quiz.push({ q: 'Which of these does a React error boundary catch?', options: ['An error thrown inside a click handler', 'A rejected fetch promise', 'An error thrown while rendering a child component', 'A syntax error in another bundle'], answer: 2, explain: 'Boundaries catch errors during rendering of the tree below them. Event handler and async errors must be handled where they occur.' });
quiz.push({ q: 'Which kind of state fits React Context best?', options: ['A value that updates many times per second', 'Server data such as a list of orders', 'A rarely changing app-wide value such as the theme', 'The text of one input'], answer: 2, explain: 'Every reader re-renders when a context value changes and there are no selectors, so Context suits stable values that many components read.' });
quiz.push({ q: 'A memoised child (<code>React.memo</code>) still re-renders on every parent render. The most likely cause is:', options: ['The parent passes a new object or function prop each render', 'memo only works on class components', 'The child has no key', 'StrictMode is on'], answer: 0, explain: 'memo compares props by reference. An inline object, array or function is new each render, so the comparison fails.' });
quiz.push({ q: 'In Angular, which RxJS operator ignores new source values while the current inner request is still running?', options: ['switchMap', 'mergeMap', 'concatMap', 'exhaustMap'], answer: 3, explain: 'exhaustMap drops values that arrive while busy. switchMap cancels the old one, mergeMap runs both, concatMap queues.' });
quiz.push({ q: 'Which of these does <b>not</b> cause an <code>OnPush</code> component to be checked?', options: ['An input receives a new object reference', 'A property of an input object is changed in place by the parent', 'A click handler in its template runs', 'A signal read in its template changes'], answer: 1, explain: 'Mutating in place keeps the same reference, so OnPush sees no change. The other three all mark the component for checking.' });
quiz.push({ q: 'Where may the Angular <code>inject()</code> function be called?', options: ['Anywhere, including inside a <code>setTimeout</code> callback', 'Only inside templates', 'In an injection context such as a constructor, a field initializer or a functional guard body', 'Only in NgModules'], answer: 2, explain: 'inject() needs an active injection context. Inside a later callback there is none, so it throws.' });

registerModule({
  id: 'tl09',
  title: 'Front-End Questions: TypeScript, React & Angular',
  lang: 'ts',
  langExplain: `<p>The code in this module is TypeScript, because that is the language of both React and Angular front ends. It is the same whichever back-end language you study on the rest of the track.</p>`,
  intro: `<p>A full-stack tech lead is expected to hold a real conversation about the front end, not only the .NET side. This module is an interview handbook for that part: <b>TypeScript</b> (types, generics, narrowing, utility types, what happens at run time), <b>React</b> (rendering, hooks, effects, state choices, performance, forms, routing, testing) and <b>Angular</b> (components, standalone and NgModules, dependency injection, RxJS, signals, change detection, forms, routing).</p>
    <p><b>How to use it:</b> read a question, say your answer out loud, then open the model answer. Every answer starts with one plain sentence, goes deeper, and ends with a line you can say in the interview. The content is current for 2026: React 19 and modern Angular with standalone components, signals and zoneless change detection, with notes on the older styles you will still meet in existing code.</p>`,
  goals: [
    'Explain what TypeScript checks and what it cannot check, and validate API data at the boundary',
    'Use unions, generics, narrowing and utility types to make wrong states impossible to write',
    'Describe how React renders, and reason about hooks, effects, dependencies and stale closures',
    'Decide where each piece of state belongs and fix a slow React screen in a sensible order',
    'Explain Angular components, dependency injection, RxJS operators, signals and change detection, in both the modern and the older style',
    'Compare React and Angular fairly and make a framework recommendation a director can defend'
  ],
  prereqs: `<p>Basic HTML, CSS and JavaScript. If closures, promises or the event loop are new to you, do the JavaScript part of the front-end track first. No React or Angular experience is assumed, but writing a small component in each will make the answers stick.</p>`,
  hours: 12,
  topics: topics, practice: practice, quiz: quiz, interview: interview
}); })();
