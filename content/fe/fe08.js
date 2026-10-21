(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;
  var JCHECK = false; // React/JSX needs a framework to run, so the validator skips compiling it.

  // A React/JSX snippet (shown with highlighting, not executed).
  function jsx(code, title) { return { lang: 'jsx', code: code, title: title, check: JCHECK }; }
  // A plain-JavaScript model of an idea. It really runs in the browser (console output only).
  function jsrun(code, title) { return { lang: 'js', code: code, title: title, run: true }; }
  // Split an input string into words.
  function words(input) { return String(input === undefined ? '' : input).trim().split(/[\s,]+/).filter(Boolean); }

  /* ======================= TOPIC 1: COMPONENTS & JSX ======================= */
  topics.push({
    title: 'Components & JSX: The Building Blocks',
    analogy: `<p>A component is a <b>cookie cutter</b>. You make the cutter once, then press it into the dough as many times as you like. Every cookie has the same shape, but you can change the sprinkles (that is what <i>props</i> are for). JSX is just the way you <b>write down the shape</b> using tags that look like HTML, so a human can read it at a glance.</p>
      <p>Another way to see it: a restaurant has <b>one recipe</b> for "masala dosa" but serves it to fifty tables. The recipe is the component. Each plate on a table is one <i>use</i> of it.</p>`,
    explain: `<p><b>React</b> is a JavaScript library for building screens. Its big idea is tiny: <b>the screen is a function of your data</b>. You do not say "find that div and change its text". You say "when the data looks like <i>this</i>, the screen should look like <i>that</i>", and React does the DOM work for you.</p>
      <h5>🟢 1. A component is a function that returns UI</h5>
      <p>A <b>function component</b> is a normal JavaScript function. Its name starts with a <b>Capital letter</b>. It receives one object (the <i>props</i>) and returns a description of what to show.</p>
      ${H.table(['Piece', 'What it is', 'Example'], [
        ['Component', 'A function. Reusable recipe for a piece of UI.', '<code>function Avatar(props) { ... }</code>'],
        ['Element', 'A small plain object that <i>describes</i> one thing on screen. Cheap to create.', '<code>{ type: "span", props: { className: "avatar" } }</code>'],
        ['Instance / DOM node', 'The real thing React keeps alive in memory and in the browser.', 'the actual <code>&lt;span&gt;</code> you see']
      ])}
      <h5>🟢 2. JSX is a nicer way to write elements</h5>
      <p><b>JSX</b> looks like HTML inside JavaScript. A build tool (Vite, Next.js, Babel) converts it into plain function calls <i>before</i> the browser sees it. So <code>&lt;h1 className="big"&gt;Hi&lt;/h1&gt;</code> becomes a call like <code>jsx("h1", { className: "big", children: "Hi" })</code>, which returns an element object. <b>JSX is not HTML and not a string.</b> It is JavaScript in disguise.</p>
      <h5>🟢 3. The JSX rules (these catch every beginner)</h5>
      ${H.table(['In HTML you write', 'In JSX you write', 'Why'], [
        ['<code>class="box"</code>', '<code>className="box"</code>', '<code>class</code> is a reserved word in JavaScript'],
        ['<code>for="email"</code>', '<code>htmlFor="email"</code>', '<code>for</code> is also reserved'],
        ['<code>onclick="go()"</code>', '<code>onClick={go}</code>', 'camelCase, and you pass a <i>function</i>, not a string'],
        ['<code>style="color:red"</code>', '<code>style={{ color: "red" }}</code>', 'style takes an <i>object</i> (outer {} = JS, inner {} = object)'],
        ['<code>&lt;br&gt;</code>, <code>&lt;img&gt;</code>', '<code>&lt;br /&gt;</code>, <code>&lt;img /&gt;</code>', 'every tag must be closed'],
        ['two siblings at the top', 'wrap in one parent or <code>&lt;&gt;...&lt;/&gt;</code>', 'a function can return only one value (one root)']
      ])}
      <p><b>Curly braces {}</b> are the "escape hatch" back into JavaScript. Inside JSX, <code>{name}</code>, <code>{price * 2}</code>, <code>{user.email.toLowerCase()}</code> all work. You can put any <i>expression</i> there (something that gives a value), but not a statement like <code>if</code> or <code>for</code>.</p>
      <h5>🔵 4. Use a component like a tag</h5>
      <p>Once <code>Avatar</code> exists you write <code>&lt;Avatar letter="A" /&gt;</code>. Lowercase tags (<code>&lt;div&gt;</code>) mean "a real HTML element". Capitalised tags (<code>&lt;Avatar&gt;</code>) mean "call my function". That is the entire reason for the capital letter rule.</p>
      <p>Components can use other components, so your app becomes a <b>tree</b>: <code>App → Page → Header → Logo</code>. Everything else in this module (props, state, re-renders, keys) is about how data and updates move through that tree.</p>
      <h5>🔵 5. Keep components pure</h5>
      <p>Treat a component like a maths function: <b>same props in → same JSX out</b>. Do not change outside variables, do not call <code>Math.random()</code> or <code>Date.now()</code> while rendering to decide what to show, and do not touch the DOM. Pure components are easy to test and React can safely call them more than once.</p>`,
    clues: [
      '"Build a <b>reusable</b> card / button / badge" → write one component and pass different props',
      '"Why must a component name start with a capital letter?" → JSX uses it to tell your function from an HTML tag',
      '"Adjacent JSX elements must be wrapped in an enclosing tag" → one root, or a Fragment <code>&lt;&gt;&lt;/&gt;</code>',
      '"What does JSX compile to?" → <code>jsx()</code> / <code>React.createElement()</code> calls that return plain objects',
      '"Component vs element vs instance" → recipe vs a description of one use vs the live thing',
      '"Why does <code>class</code> not work?" / "Why <code>className</code>?" → reserved word in JS'
    ],
    code: [
      jsx(`// Two small components. Names start with a capital letter.
function Avatar({ name }) {
  // Show the first letter of the name inside a round badge.
  return <span className="avatar">{name[0]}</span>;
}

function ProfileCard({ name, role }) {
  // A function can return ONE root element. Here it is the <div>.
  return (
    <div className="card">
      <Avatar name={name} />          {/* capital A: our own component */}
      <h2>{name}</h2>                  {/* {} runs JavaScript inside JSX */}
      <p style={{ color: 'gray' }}>{role}</p>
    </div>
  );
}

// Using it like a tag. Same recipe, different data.
function App() {
  return (
    <>
      <ProfileCard name="Asha" role="Designer" />
      <ProfileCard name="Ben" role="Engineer" />
    </>
  );
}`, 'React: components and JSX'),
      jsrun(`// A tiny "React" in plain JavaScript so you can SEE what JSX really is.
// h(type, props, ...children) is what JSX compiles to. It returns a plain object (an "element").
function h(type, props, ...children) {
  return { type, props: { ...(props || {}), children: children.flat() } };
}

const VOID = ['br', 'img', 'input', 'hr'];
const escapeText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// render(element) walks the tree and builds an HTML string.
function render(node) {
  if (node === null || node === undefined || node === false || node === true) return ''; // renders nothing
  if (typeof node === 'string' || typeof node === 'number') return escapeText(node);   // text is escaped
  if (Array.isArray(node)) return node.map(render).join('');
  // A capitalised tag is a function: CALL it with props, then render what it returns.
  if (typeof node.type === 'function') return render(node.type(node.props));
  // Otherwise it is a real HTML tag like 'div'.
  const { children, className, ...rest } = node.props;
  let attrs = className ? ' class="' + className + '"' : '';
  for (const k of Object.keys(rest)) attrs += ' ' + k + '="' + rest[k] + '"';
  if (VOID.includes(node.type)) return '<' + node.type + attrs + ' />';
  return '<' + node.type + attrs + '>' + render(children) + '</' + node.type + '>';
}

// Our two components, written WITHOUT JSX (this is exactly what the compiler produces).
function Avatar(props) { return h('span', { className: 'avatar' }, props.name[0]); }
function ProfileCard(props) {
  return h('div', { className: 'card' },
    h(Avatar, { name: props.name }),
    h('h2', null, props.name),
    h('p', null, props.role));
}

// 1) An element is just an object:
console.log(JSON.stringify(h('p', { className: 'x' }, 'hi')));
// 2) Rendering a component call runs the function and turns the result into HTML:
console.log(render(h(ProfileCard, { name: 'Asha', role: 'Designer' })));
// 3) Same component, other data. Text like <script> is escaped, so it is safe.
console.log(render(h(ProfileCard, { name: 'Ben', role: '<script>' })));`, 'Plain JS model: what JSX turns into (runnable)')
    ],
    viz: {
      title: 'JSX becomes elements becomes a component tree',
      input: 'Asha',
      inputLabel: 'Name to pass to the Card (1-10 letters)',
      gen: function (input) {
        var name = String(input === undefined ? '' : input).trim();
        if (!name || name.length > 10) throw new Error('Type a name between 1 and 10 characters');
        var src = 'function App() {\n  return <Card name="' + name + '" />;\n}\nfunction Card({ name }) {\n  return (\n    <div className="card">\n      <Avatar letter={name[0]} />\n      <h2>{name}</h2>\n    </div>\n  );\n}\nfunction Avatar({ letter }) {\n  return <span>{letter}</span>;\n}';
        var L = name[0];
        var f = [];
        f.push({ narr: 'React starts at the top. It <b>calls the function</b> <code>App()</code>. Nothing is on screen yet; React is just asking "what should App look like?".', parts: [
          { type: 'code', label: 'Your code', lang: 'jsx', code: src, hl: { 1: 'cur', 2: 'cur' } },
          { type: 'tree', label: 'Component tree so far', arr: ['App'], hl: { 0: 'cur' } }
        ] });
        f.push({ narr: '<code>App</code> returned <b>an element</b>, not a real DOM node: roughly <code>{ type: Card, props: { name: "' + H.esc(name) + '" } }</code>. The capital <code>C</code> tells React "this is a function, call it".', parts: [
          { type: 'code', label: 'Your code', lang: 'jsx', code: src, hl: { 2: 'ok' } },
          { type: 'tree', label: 'Component tree', arr: ['App', 'Card'], hl: { 0: 'done', 1: 'cur' }, tags: { 1: 'name="' + name + '"' } },
          { type: 'vars', label: 'props given to Card', vals: { name: '"' + name + '"' } }
        ] });
        f.push({ narr: 'React calls <code>Card({ name: "' + H.esc(name) + '" })</code>. It returns a <code>&lt;div&gt;</code> containing an <code>Avatar</code> and an <code>&lt;h2&gt;</code>. The <code>{name}</code> braces ran JavaScript and dropped the value in.', parts: [
          { type: 'code', label: 'Your code', lang: 'jsx', code: src, hl: { 4: 'cur', 6: 'ok', 7: 'ok', 8: 'ok' } },
          { type: 'tree', label: 'Component tree', arr: ['App', 'Card', null, 'Avatar', 'h2'], hl: { 0: 'done', 1: 'done', 3: 'cur', 4: 'cur' }, tags: { 1: 'name="' + name + '"', 3: 'letter="' + L + '"' } }
        ] });
        f.push({ narr: 'React calls <code>Avatar({ letter: "' + H.esc(L) + '" })</code>. It returns a <code>&lt;span&gt;</code>. A lowercase tag is a <b>host element</b>: React stops calling functions and prepares a real DOM node.', parts: [
          { type: 'code', label: 'Your code', lang: 'jsx', code: src, hl: { 12: 'cur', 13: 'ok' } },
          { type: 'tree', label: 'Component tree (finished)', arr: ['App', 'Card', null, 'Avatar', 'h2', null, null, 'span'], hl: { 7: 'cur', 4: 'ok' }, tags: { 3: 'letter="' + L + '"' } }
        ] });
        f.push({ narr: 'The whole tree is now only host elements, so React writes them to the browser <b>once</b>. This is the final HTML. Change the name above and replay to watch the props change.', parts: [
          { type: 'tree', label: 'Component tree (finished)', arr: ['App', 'Card', null, 'Avatar', 'h2', null, null, 'span'], hl: { 0: 'sel', 1: 'sel', 3: 'sel', 4: 'sel', 7: 'sel' } },
          { type: 'text', label: 'Resulting DOM', html: '<code>&lt;div class="card"&gt;&lt;span&gt;' + H.esc(L) + '&lt;/span&gt;&lt;h2&gt;' + H.esc(name) + '&lt;/h2&gt;&lt;/div&gt;</code>' }
        ] });
        return f;
      }
    },
    examples: [
      {
        title: 'One component, many uses',
        html: `<p>Imagine a shop page with 20 product cards. Without components you copy-paste the same HTML 20 times and fix a typo 20 times. With a component you write <code>ProductCard</code> once and write <code>&lt;ProductCard title="..." price={...} /&gt;</code> twenty times. Change the card once, all 20 change.</p>`
      },
      {
        title: 'Why "adjacent elements" is an error',
        html: `<p>A function can <code>return</code> only one thing. This is the same as <code>return a b</code>, which is nonsense. The fix is one wrapper: a <code>&lt;div&gt;</code> if you want an extra DOM node, or a <b>Fragment</b> <code>&lt;&gt; ... &lt;/&gt;</code> if you want no extra node at all (useful inside <code>&lt;table&gt;</code> or flex layouts).</p>`,
        code: jsx(`// Broken: two roots
// return <h1>Hi</h1><p>Welcome</p>;

// Fixed with a Fragment (adds nothing to the DOM)
function Welcome() {
  return (
    <>
      <h1>Hi</h1>
      <p>Welcome</p>
    </>
  );
}`, 'Fragment fixes "adjacent JSX elements"')
      },
      {
        title: 'Expressions in {} but not statements',
        html: `<p>Anything that produces a value is fine inside <code>{}</code>: <code>{count + 1}</code>, <code>{items.length}</code>, <code>{ok ? "Yes" : "No"}</code>, <code>{list.map(...)}</code>. A statement such as <code>if</code> or <code>for</code> is not a value, so write it <i>above</i> the <code>return</code> or use a ternary / <code>&amp;&amp;</code> / <code>.map</code> instead. Also: objects are not valid as a child. <code>{{ a: 1 }}</code> as a child throws "Objects are not valid as a React child".</p>`
      },
      {
        title: 'Defining a component inside another one (classic mistake)',
        html: `<p>If you write <code>function Inner() {...}</code> <i>inside</i> <code>Outer</code>, a brand-new <code>Inner</code> function exists on every render. React sees a different type each time, <b>throws away the old DOM and state</b> and builds it again. Inputs lose focus while you type. Always define components at the top level of the file.</p>`,
        code: jsx(`// BAD: Row is re-created on every Table render, so its state and DOM reset
function Table({ rows }) {
  function Row({ r }) { return <tr><td>{r}</td></tr>; }
  return <table><tbody>{rows.map((r) => <Row key={r} r={r} />)}</tbody></table>;
}

// GOOD: define it outside
function Row({ r }) { return <tr><td>{r}</td></tr>; }
function Table2({ rows }) {
  return <table><tbody>{rows.map((r) => <Row key={r} r={r} />)}</tbody></table>;
}`, 'Never nest component definitions')
      }
    ],
    deepDive: `<h5>🟣 What JSX compiles to</h5>
      <p>Modern toolchains use the "automatic runtime" (React 17+): <code>&lt;Card name="A" /&gt;</code> becomes <code>jsx(Card, { name: "A" })</code> imported from <code>react/jsx-runtime</code>. Older code shows <code>React.createElement(Card, { name: "A" })</code>. Both return an object roughly shaped <code>{ $$typeof: Symbol(react.element), type, key, ref, props }</code> (the symbol is named <code>react.transitional.element</code> in React 19). The <code>$$typeof</code> symbol is a security feature: JSON from a server cannot contain a Symbol, so an attacker cannot smuggle a fake element into your tree.</p>
      <h5>🟣 Elements are immutable and cheap</h5>
      <p>An element is a snapshot of what the UI should look like <i>at this moment</i>, like one frame of a film. You never mutate it, you return a new one next time. Creating thousands of small objects is very fast in modern JS engines; the expensive part would be touching the real DOM, which React minimises.</p>
      <h5>🟣 Component identity</h5>
      <p>React decides "same component or a new one?" by comparing <code>type</code> (the function reference) and position. Same function, same place: keep the instance (and its state). Different function (or a function re-created each render): destroy and rebuild. That single rule explains the nested-component bug above, why <code>key</code> exists, and how conditional rendering can reset state.</p>
      <h5>🟣 Purity and Strict Mode</h5>
      <p>In development <code>&lt;StrictMode&gt;</code> calls your component body <b>twice</b> to reveal impure code (a mutated outer variable shows double numbers). It is a feature, not a bug. In production it runs once. Side effects (network calls, subscriptions, timers) belong in event handlers or <code>useEffect</code>, never in the render body.</p>
      <h5>🟣 Other details worth knowing</h5>
      <p><code>{false}</code>, <code>{null}</code>, <code>{undefined}</code> and <code>{true}</code> render <b>nothing</b>, but the number <code>0</code> is printed as the text "0" (see the conditional rendering topic). JSX text is trimmed of line breaks and indentation. Props like <code>aria-label</code> and <code>data-id</code> keep their dashes. Spread props with <code>&lt;Card {...user} /&gt;</code>. And a component name is just a variable, so <code>const Tag = big ? "h1" : "h2"; &lt;Tag&gt;Hi&lt;/Tag&gt;</code> works.</p>`,
    aiEra: `<p><b>What AI changes:</b> Assistants such as Claude, Copilot and v0 can generate a whole page of JSX in seconds, so typing JSX is no longer the skill. <b>Reading</b> it quickly is. In an interview you may be handed AI-looking code and asked "what is wrong here?".</p>
      <p><b>Use AI as a partner:</b> <code>Explain what this JSX compiles to and list every place it creates a new function or object per render</code>, or <code>Convert this HTML page into small components and tell me where you drew each boundary and why</code>. Ask it to justify the boundaries, then judge them yourself.</p>
      <p><b>Where AI goes wrong:</b> It often defines a component inside another component, invents props that do not exist, writes <code>class</code> instead of <code>className</code> in a hurry, wraps everything in extra <code>&lt;div&gt;</code>s, or splits into dozens of tiny files that are never reused.</p>
      <p><b>What you must still own:</b> choosing where one component ends and the next begins, keeping them pure, and being able to hand-write a small component and explain JSX without a tool in a live-coding round.</p>`,
    problems: [{
      title: 'Turn Repeated HTML into a ProfileCard Component',
      level: 'Easy', tags: ['components', 'jsx', 'props'], companies: ['Flipkart', 'Swiggy'],
      statement: `<p>You inherited a page where the same profile box is copy-pasted twice. Each box shows a round avatar with the first letter of the person's name, the name in a heading, and the role under it. Rewrite it as a reusable <code>Avatar</code> and <code>ProfileCard</code> and render two cards for <b>Asha (Designer)</b> and <b>Ben (Engineer)</b>.</p>`,
      constraints: `Function components only. Component names start with a capital letter. Use <code>className</code>, not <code>class</code>. One root element per component. No direct DOM calls (<code>document.getElementById</code>).`,
      example: `${H.table(['Input (props)', 'Output (HTML)'], [['name="Asha" role="Designer"', '<code>&lt;div class="card"&gt;&lt;span class="avatar"&gt;A&lt;/span&gt;&lt;h2&gt;Asha&lt;/h2&gt;&lt;p&gt;Designer&lt;/p&gt;&lt;/div&gt;</code>'], ['name="Ben" role="Engineer"', 'same shape, letter <b>B</b>']])}
        <p>${H.c('g', 'Why')}: the markup is identical, only the data changes, so the data becomes <i>props</i>.</p>`,
      brute: { why: `<p>Copy the markup once per person. It works, but a design change (say, add a border) must be made in every copy, and with 200 people the file is unreadable. The repeated work is the <b>markup</b>, not the data.</p>`, code: jsx(`function App() {
  return (
    <>
      <div className="card">
        <span className="avatar">A</span>
        <h2>Asha</h2>
        <p>Designer</p>
      </div>
      <div className="card">
        <span className="avatar">B</span>
        <h2>Ben</h2>
        <p>Engineer</p>
      </div>
    </>
  );
}`, 'Copy-paste version') },
      mcq: { q: 'Which line is valid JSX that renders your own <code>Avatar</code> component?', options: ['<code>&lt;avatar name="A" /&gt;</code>', '<code>&lt;Avatar name="A" /&gt;</code>', '<code>&lt;Avatar name="A"&gt;</code> (no closing)', '<code>Avatar(name="A")</code>'], answer: 1, explain: 'Capital letter = your component. Lowercase would be treated as an HTML tag called "avatar". An unclosed tag is an error in JSX, and Avatar(...) is not JSX syntax.' },
      hints: [
        `<p>Hint 1: Look at what changes between the two boxes: only the name and the role. Everything else is the same <i>shape</i>. Shape = component, changing values = props.</p>`,
        `<p>Hint 2: Make <code>Avatar({ name })</code> that returns a <code>&lt;span&gt;</code> with <code>name[0]</code>, and <code>ProfileCard({ name, role })</code> that uses <code>Avatar</code> inside its own root <code>&lt;div&gt;</code>.</p>`,
        `<p>Hint 3: Recipe: (1) write Avatar, (2) write ProfileCard returning one root div, (3) in App return a Fragment containing two ProfileCards. Remember <code>className</code>, and use <code>{ }</code> to insert the variables.</p>`
      ],
      solution: {
        approach: `<p>Extract the repeated markup into <code>ProfileCard</code>, and the repeated avatar bit into <code>Avatar</code>. Each takes the changing values as props. <code>App</code> now only says <i>what</i> to show, not <i>how</i>. The plain JS version on the right-hand tab shows the same idea with <code>h()</code> so you can run it.</p>`,
        code: jsx(`function Avatar({ name }) {
  // First letter of the name, e.g. "Asha" -> "A".
  return <span className="avatar">{name[0]}</span>;
}

function ProfileCard({ name, role }) {
  return (
    <div className="card">
      <Avatar name={name} />
      <h2>{name}</h2>
      <p>{role}</p>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ProfileCard name="Asha" role="Designer" />
      <ProfileCard name="Ben" role="Engineer" />
    </>
  );
}`, 'Solution'),
        alt: [jsrun(`// Runnable model of the same solution: h() builds elements, render() prints HTML.
function h(type, props, ...children) { return { type, props: { ...(props || {}), children: children.flat() } }; }
function render(n) {
  if (n == null || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(render).join('');
  if (typeof n.type === 'function') return render(n.type(n.props));
  const { children, className } = n.props;
  return '<' + n.type + (className ? ' class="' + className + '"' : '') + '>' + render(children) + '</' + n.type + '>';
}
const Avatar = ({ name }) => h('span', { className: 'avatar' }, name[0]);
const ProfileCard = ({ name, role }) => h('div', { className: 'card' }, h(Avatar, { name }), h('h2', null, name), h('p', null, role));
const App = () => [h(ProfileCard, { name: 'Asha', role: 'Designer' }), h(ProfileCard, { name: 'Ben', role: 'Engineer' })];
console.log(render(App()));`, 'Plain JS model (runnable)')],
        complexity: `<p>Rendering is O(n) in the number of elements. The real win is maintainability: a design change is made in <b>one</b> place instead of in every copy.</p>`,
        followUps: ['What would you change so the card can show an optional photo instead of the letter?', 'Where would you put the data for 200 people, and how would you render them? (Hint: lists and keys, topic 5.)']
      }
    }]
  });

  /* ======================= TOPIC 2: PROPS ======================= */
  topics.push({
    title: 'Props: Passing Data Down the Tree',
    analogy: `<p>Props are the <b>order slip</b> a waiter hands to the kitchen. The chef (child component) reads the slip ("one dosa, no onion") and cooks. The chef never crosses out the slip or rewrites it; if something is wrong, the chef asks the waiter. The slip only travels <b>one direction</b>: from the table to the kitchen.</p>
      <p>Or think of a <b>function call</b>: <code>greet("Asha")</code>. Props are simply the argument you give to a component function.</p>`,
    explain: `<p><b>Props</b> (short for "properties") are the inputs of a component. You write them like HTML attributes, and React bundles them into <b>one object</b> and passes it as the first argument of your function.</p>
      ${H.table(['You write', 'Component receives'], [
        ['<code>&lt;Greeting name="Asha" age={30} /&gt;</code>', '<code>{ name: "Asha", age: 30 }</code>'],
        ['<code>&lt;Card&gt;Hello&lt;/Card&gt;</code>', '<code>{ children: "Hello" }</code>'],
        ['<code>&lt;Btn onClick={save} /&gt;</code>', '<code>{ onClick: save }</code> (a function is a value too)']
      ])}
      <h5>🟢 Rule 1: props flow one way, parent to child</h5>
      <p>Data goes <b>down</b> the tree. A child cannot reach up and grab a parent's variable. If a child needs to tell the parent something ("the user clicked Save"), the parent hands it a <b>function as a prop</b> and the child calls it. We will use this "callback prop" idea again in lifting state up.</p>
      <h5>🟢 Rule 2: props are read-only</h5>
      <p>A component must <b>never change its own props</b>. Treat the props object as frozen. If you want something that changes over time, that is <i>state</i> (next topic). Props are the facts you were told; state is the thing you remember yourself.</p>
      <h5>🔵 Handy patterns</h5>
      <ul>
        <li><b>Destructure</b> in the parameter list: <code>function Btn({ label, onClick })</code>. Shorter and shows exactly what the component needs.</li>
        <li><b>Default values</b>: <code>function Btn({ variant = "primary" })</code>. Used when the prop is missing or <code>undefined</code> (not when it is <code>null</code>).</li>
        <li><b>children</b>: whatever you put between the opening and closing tag. Great for wrappers like <code>Card</code>, <code>Modal</code>, <code>Layout</code>.</li>
        <li><b>Spread</b>: <code>&lt;input {...rest} /&gt;</code> forwards all the extra props. Use it carefully, it hides what is being passed.</li>
        <li><b>Any value</b> can be a prop: numbers, objects, arrays, functions, even other elements (<code>icon={&lt;Star /&gt;}</code>).</li>
      </ul>
      <p>A common pain is <b>prop drilling</b>: passing a value through 4 components that do not use it, just to reach the one that does. For small trees this is fine and very clear. For big ones, restructure with composition (last topic) or use Context.</p>
      <h5>🔵 Props vs state in one line</h5>
      ${H.table(['', 'Props', 'State'], [['Who owns it?', 'The parent', 'The component itself'], ['Can the component change it?', '<span class="c-r">No (read-only)</span>', '<span class="c-g">Yes, via the setter</span>'], ['Changing it causes?', 'Parent re-renders and passes new props', 'This component re-renders'], ['Think of it as', 'Function arguments', 'Variables remembered between calls']])}`,
    clues: [
      '"Make a <b>reusable</b> Button/Badge/Alert with variants" → props with defaults',
      '"Child needs to <b>notify</b> the parent" → pass a callback function as a prop',
      '"Cannot assign to read only property of object props" → you tried to mutate props',
      '"Wrap content in a Card / Modal / Layout" → use the <code>children</code> prop',
      '"Passing the same value through many levels" → prop drilling; consider composition or Context',
      '"Props vs state" → who owns the data and who may change it'
    ],
    code: [
      jsx(`// A reusable Button: label comes from children, look from "variant", action from onClick.
function Button({ children, variant = 'primary', disabled = false, onClick }) {
  return (
    <button
      className={'btn btn-' + variant}   // build a class name from a prop
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function App() {
  return (
    <div>
      <Button onClick={() => alert('Saved')}>Save</Button>              {/* variant defaults to primary */}
      <Button variant="danger" onClick={() => alert('Deleted')}>Delete</Button>
      <Button disabled>Can't click me</Button>
    </div>
  );
}`, 'React: props, defaults and children'),
      jsrun(`// Props are just ONE object passed to a function. Defaults and read-only rules in plain JS.
function Button({ children, variant = 'primary', disabled = false }) {
  return '<button class="btn btn-' + variant + '"' + (disabled ? ' disabled' : '') + '>' + children + '</button>';
}
console.log(Button({ children: 'Save' }));                         // default variant
console.log(Button({ children: 'Delete', variant: 'danger' }));    // override one prop
console.log(Button({ children: 'Wait', disabled: true }));

// React freezes props in development so accidental writes are caught.
const props = Object.freeze({ name: 'Asha', age: 30 });
function Bio(p) {
  'use strict';
  try {
    p.age = p.age + 1; // BAD: a child must not change what the parent gave it
  } catch (e) {
    console.log('Blocked:', e.constructor.name);
  }
  return 'Age is still ' + p.age;
}
console.log(Bio(props));

// The right way: the parent passes a CALLBACK and the child asks it to change things.
let ageInParent = 30;
const onBirthday = () => { ageInParent = ageInParent + 1; };
function Bio2(p) { return { text: 'Age ' + p.age, haveBirthday: p.onBirthday }; }
const view = Bio2({ age: ageInParent, onBirthday });
view.haveBirthday();
console.log('Parent now owns the new value:', ageInParent);`, 'Plain JS: props, defaults, read-only (runnable)')
    ],
    viz: {
      title: 'Props flowing down the tree (and a callback going back up)',
      input: 'Asha 30',
      inputLabel: 'Name and age (e.g. Asha 30)',
      gen: function (input) {
        var w = words(input);
        var name = w[0], age = Number(w[1]);
        if (w.length !== 2 || !name || isNaN(age) || age < 0 || age > 120 || name.length > 10) throw new Error('Type a name then an age, like: Asha 30');
        var tree = ['App', 'Profile', 'Footer', 'Avatar', 'Bio'];
        var f = [];
        f.push({ narr: '<code>App</code> owns the data: a user called <b>' + H.esc(name) + '</b>, age <b>' + age + '</b>. Right now only <code>App</code> knows it. Nobody else in the tree can see it.', parts: [
          { type: 'tree', label: 'Component tree', arr: tree, hl: { 0: 'cur' } },
          { type: 'vars', label: 'inside App', vals: { user: '{ name: "' + name + '", age: ' + age + ' }' } }
        ] });
        f.push({ narr: 'App writes <code>&lt;Profile name={user.name} age={user.age} /&gt;</code>. Those two attributes become <b>props</b>: they travel down the arrow to <code>Profile</code>.', parts: [
          { type: 'tree', label: 'Component tree (props are the tags)', arr: tree, hl: { 0: 'done', 1: 'cur' }, ehl: { 1: 'ok' }, tags: { 1: 'name, age' } },
          { type: 'vars', label: 'props received by Profile', vals: { name: '"' + name + '"', age: age }, hl: { name: 'ok', age: 'ok' } }
        ] });
        f.push({ narr: '<code>Profile</code> does not need to keep everything. It hands <b>only what each child needs</b>: the name to <code>Avatar</code>, the age to <code>Bio</code>. Each child gets its own small props object.', parts: [
          { type: 'tree', label: 'Component tree', arr: tree, hl: { 1: 'done', 3: 'cur', 4: 'cur' }, ehl: { 3: 'ok', 4: 'ok' }, tags: { 1: 'name, age', 3: 'name', 4: 'age' } },
          { type: 'table', label: 'Who got what', columns: ['Component', 'props it received'], rows: [['Profile', 'name, age'], ['Avatar', 'name = "' + name + '"'], ['Bio', 'age = ' + age]], hl: { 1: 'ok', 2: 'ok' } }
        ] });
        f.push({ narr: 'Now <code>Bio</code> tries <code>props.age = props.age + 1</code>. <b>Not allowed.</b> Props belong to the parent. React freezes them in development, so you get an error. Changing it here would also leave <code>Profile</code> and <code>App</code> out of sync.', parts: [
          { type: 'tree', label: 'Component tree', arr: tree, hl: { 4: 'bad' }, tags: { 4: 'age (read-only)' } },
          { type: 'vars', label: 'inside Bio', vals: { 'props.age': age, 'attempt': 'props.age = ' + (age + 1) }, hl: { attempt: 'bad' } }
        ] });
        f.push({ narr: 'The correct way: <code>App</code> also passes a <b>function prop</b>, <code>onBirthday</code>. <code>Bio</code> calls it, and the owner (<code>App</code>) decides what the new age is.', parts: [
          { type: 'tree', label: 'Callback goes back up', arr: tree, hl: { 4: 'cur', 0: 'sel' }, tags: { 4: 'onBirthday()', 0: 'owns age' } },
          { type: 'vars', label: 'inside App after the call', vals: { age: age + 1 }, hl: { age: 'ok' } }
        ] });
        f.push({ narr: 'App now holds age <b>' + (age + 1) + '</b>. It passes the new value down as props again, and every child sees it. <b>Data down, events up</b> is the one pattern behind all React apps.', parts: [
          { type: 'tree', label: 'Fresh props flow down', arr: tree, hl: { 0: 'done', 1: 'ok', 4: 'ok', 3: 'ok' }, ehl: { 1: 'ok', 3: 'ok', 4: 'ok' }, tags: { 1: 'name, age=' + (age + 1), 4: 'age=' + (age + 1) } }
        ] });
        return f;
      }
    },
    examples: [
      {
        title: 'children: build a wrapper once',
        html: `<p>Whatever you write between the tags arrives as <code>props.children</code>. This lets a <code>Card</code> add the border and padding while the caller decides the content. The Card does not need to know what is inside.</p>`,
        code: jsx(`function Card({ title, children }) {
  return (
    <section className="card">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

<Card title="Profile">
  <p>Asha, Designer</p>
  <button>Follow</button>
</Card>`, 'children prop')
      },
      {
        title: 'Defaults only apply to undefined',
        html: `<p><code>function Tag({ color = "gray" })</code>. If the parent passes nothing, or passes <code>undefined</code>, you get <code>"gray"</code>. If the parent passes <code>null</code>, <code>0</code>, <code>false</code> or <code>""</code>, those are real values and the default is <b>not</b> used. Many beginner bugs come from expecting <code>null</code> to trigger the default.</p>`
      },
      {
        title: 'Spreading props onto a DOM element',
        html: `<p>A <code>TextInput</code> wrapper often wants to forward everything it does not use (<code>placeholder</code>, <code>type</code>, <code>aria-label</code>, <code>onBlur</code>...). Collect the rest and spread it. Put your own fixed props <b>after</b> the spread if they must win.</p>`,
        code: jsx(`function TextInput({ label, ...rest }) {
  // rest = every prop except "label"
  return (
    <label>
      {label}
      <input {...rest} className="input" />
    </label>
  );
}

<TextInput label="Email" type="email" placeholder="you@site.com" required />`, 'Rest + spread')
      },
      {
        title: 'Callback props: the child reports, the parent decides',
        html: `<p><code>&lt;SearchBox onSearch={runSearch} /&gt;</code>. Inside, <code>SearchBox</code> calls <code>onSearch(text)</code> when the user presses Enter. The box never knows what a "search" does (call an API? filter a list?). That keeps it reusable. Name callback props <code>onSomething</code> and the handlers you write <code>handleSomething</code>.</p>`
      }
    ],
    deepDive: `<h5>🟣 Why props are read-only (and frozen)</h5>
      <p>React's whole model is "the screen is a function of props and state". If a child silently edited props, the parent would still hold the old value, two copies of the truth would exist, and the next re-render would erase the change. In development React runs <code>Object.freeze</code> on the props object (and on the elements), so writes throw. That is cheaper than debugging mysterious flicker later.</p>
      <h5>🟣 Referential equality: why a new {} each render matters</h5>
      <p>Props are compared with <code>Object.is</code> (strict equality). <code>&lt;Chart options={{ a: 1 }} /&gt;</code> creates a <b>new object every render</b>, so a memoised child sees a "changed" prop and re-renders anyway. The same happens for inline arrow functions and arrays created in the render body. The fixes are to hoist constants out of the component, or to use <code>useMemo</code>/<code>useCallback</code> (hooks module). Do not do this everywhere; do it where a profiler shows a real cost.</p>
      <h5>🟣 Special names</h5>
      <p><code>key</code> is read by React and is <b>not</b> passed in props. <code>ref</code> was also special, but React 19 lets function components receive <code>ref</code> as a normal prop (older code uses <code>forwardRef</code>). <code>children</code> is just a prop with a friendly syntax. <code>defaultProps</code> on function components was removed in React 19; use default parameter values.</p>
      <h5>🟣 Typing props</h5>
      <p>In real projects props are typed with TypeScript: <code>type ButtonProps = { variant?: "primary" | "danger"; onClick?: () =&gt; void; children: React.ReactNode }</code>. Old code used <code>PropTypes</code> checked at runtime in dev. Types turn "I forgot a prop" into a red squiggle in your editor.</p>
      <h5>🟣 Design advice that interviewers like</h5>
      <p>Prefer a <b>small number of well-named props</b>. When you see five boolean props (<code>isPrimary</code>, <code>isDanger</code>, <code>isBig</code>...), switch to one <code>variant</code> string. When a component takes <code>renderHeader</code>, <code>renderFooter</code>..., consider using <code>children</code> and composition instead. Pass data objects only when the child really uses most of the fields; otherwise pass the few fields it needs so it re-renders less often.</p>`,
    aiEra: `<p><b>What AI changes:</b> Writing a prop-heavy component such as a Button with 12 variants is now one prompt. The valuable skill is deciding the <b>shape of the API</b> (which props exist and what they are called), because that is what your teammates live with for years.</p>
      <p><b>Use AI as a partner:</b> <code>Review the props of this component. Which are redundant, which could be derived from others, and which should become children?</code> Or: <code>List every prop that is a new object/function on each render in this tree.</code></p>
      <p><b>Where AI goes wrong:</b> it likes to add <code>isX</code> boolean flags forever, copy props into state ("derived state" bug), mutate a prop array with <code>.sort()</code> in place, or pass the whole <code>user</code> object when one field is needed.</p>
      <p><b>What you must still own:</b> a clear one-direction data flow, naming, and being able to explain in an interview why a child should not write to props and how it talks to its parent instead.</p>`,
    problems: [{
      title: 'A Reusable Button with Variants, Defaults and Children',
      level: 'Easy', tags: ['props', 'children', 'default values'], companies: ['Atlassian', 'Paytm'],
      statement: `<p>Build a <code>Button</code> component. It shows whatever you put inside the tag (<code>children</code>), takes an optional <code>variant</code> (<code>"primary"</code> by default, or <code>"danger"</code> / <code>"ghost"</code>), an optional <code>disabled</code> flag (default <code>false</code>), and an <code>onClick</code> callback. It should add the class <code>btn btn-&lt;variant&gt;</code>. Then show Save, Delete and a disabled Wait button.</p>`,
      constraints: `Function component with destructured props and default values. Do not mutate props. Do not read <code>document</code>. The button must still work when <code>onClick</code> is not given.`,
      example: `${H.table(['Usage', 'Resulting class'], [['<code>&lt;Button&gt;Save&lt;/Button&gt;</code>', 'btn btn-primary'], ['<code>&lt;Button variant="danger"&gt;Delete&lt;/Button&gt;</code>', 'btn btn-danger'], ['<code>&lt;Button disabled&gt;Wait&lt;/Button&gt;</code>', 'btn btn-primary + disabled attribute']])}
        <p>${H.c('g', 'Why')}: missing props are <code>undefined</code>, so the default parameter values kick in.</p>`,
      brute: { why: `<p>Make three separate components (<code>SaveButton</code>, <code>DeleteButton</code>, <code>WaitButton</code>) that repeat the same markup. Any style change must be done three times and a new button type means a new copy-pasted component.</p>`, code: jsx(`function SaveButton() { return <button className="btn btn-primary">Save</button>; }
function DeleteButton() { return <button className="btn btn-danger">Delete</button>; }
function WaitButton() { return <button className="btn btn-primary" disabled>Wait</button>; }`, 'Three near-identical components') },
      mcq: { q: 'The parent writes <code>&lt;Button variant={null}&gt;Go&lt;/Button&gt;</code> and <code>Button</code> has <code>variant = "primary"</code> as a default. What is the variant inside Button?', options: ['"primary"', 'null', 'undefined', 'an error is thrown'], answer: 1, explain: 'Default parameter values apply only when the value is undefined. null is a real value, so variant stays null. That is a classic gotcha.' },
      hints: [
        `<p>Hint 1: What stays the same in all three buttons, and what changes? Make the changing parts into props.</p>`,
        `<p>Hint 2: Use destructuring with defaults in the parameter list: <code>{ children, variant = "primary", disabled = false, onClick }</code>.</p>`,
        `<p>Hint 3: Recipe: return one <code>&lt;button&gt;</code>; build <code>className</code> as <code>"btn btn-" + variant</code>; pass <code>disabled</code> and <code>onClick</code> straight through; put <code>{children}</code> inside. If onClick is undefined React simply attaches nothing.</p>`
      ],
      solution: {
        approach: `<p>One component, all variation as props. The default parameter values give a sensible look when the caller says nothing. <code>children</code> gives the label so the caller can even put an icon next to text.</p>`,
        code: jsx(`function Button({ children, variant = 'primary', disabled = false, onClick }) {
  return (
    <button
      type="button"                         // avoid accidentally submitting a surrounding form
      className={'btn btn-' + variant}
      disabled={disabled}
      onClick={onClick}                     // undefined is fine: nothing is attached
    >
      {children}
    </button>
  );
}

export default function App() {
  return (
    <div>
      <Button onClick={() => console.log('saved')}>Save</Button>
      <Button variant="danger" onClick={() => console.log('deleted')}>Delete</Button>
      <Button disabled>Wait</Button>
    </div>
  );
}`, 'Solution'),
        alt: [jsrun(`// Runnable model: same defaults, same output classes.
function Button({ children, variant = 'primary', disabled = false, onClick }) {
  return { html: '<button class="btn btn-' + variant + '"' + (disabled ? ' disabled' : '') + '>' + children + '</button>', onClick };
}
const a = Button({ children: 'Save' });
const b = Button({ children: 'Delete', variant: 'danger' });
const c = Button({ children: 'Wait', disabled: true });
[a, b, c].forEach((x) => console.log(x.html));
console.log('null does NOT trigger a default:', Button({ children: 'Go', variant: null }).html);`, 'Plain JS model (runnable)')],
        complexity: `<p>O(1) per button. Adding a new look is one new CSS class and one new allowed value, not a new component.</p>`,
        followUps: ['How would you type the allowed variants in TypeScript?', 'How would you make the button forward extra props like aria-label? (rest + spread)']
      }
    }]
  });

  /* ======================= TOPIC 3: STATE ======================= */
  topics.push({
    title: 'State & Events: Making Components Remember',
    analogy: `<p>State is the <b>scoreboard</b> at a cricket match. The players (your function) walk off the field and come back again and again, but the scoreboard stays where it is and shows the current score. A normal variable is a <b>sticky note</b> that gets thrown away every time the function runs. React keeps your scoreboard in a drawer <i>outside</i> the function and hands it back each time.</p>
      <p>And when the score changes, someone must <b>tell the operator to repaint the board</b>. That is what the setter function does: it changes the number <i>and</i> asks React to re-render.</p>`,
    explain: `<p><b>State</b> is data a component remembers between renders and that, when changed, makes the screen update. You create it with the <code>useState</code> hook.</p>
      ${H.table(['Line', 'Meaning'], [
        ['<code>const [count, setCount] = useState(0);</code>', 'Remember a number. Start at 0. <code>count</code> is the current value, <code>setCount</code> changes it.'],
        ['<code>setCount(count + 1)</code>', 'Ask React: "next render, make count one bigger, and re-run me."'],
        ['<code>onClick={handleClick}</code>', 'Give React your function. React calls it when the click happens. <span class="c-r">Not</span> <code>onClick={handleClick()}</code>, which would call it right now.']
      ])}
      <h5>🟢 Why a plain variable does not work</h5>
      <p>Two reasons. (1) Each render calls your function from the top, so <code>let count = 0</code> is reset to 0 every time. (2) Changing a normal variable does not tell React anything, so the screen never updates. <code>useState</code> fixes both.</p>
      <h5>🔵 State is a snapshot</h5>
      <p>This is the idea that confuses people most. During one render, <code>count</code> is a <b>fixed value</b>, like a photo. If your click handler calls <code>setCount(count + 1)</code> three times, each call sees the same photo (<code>count = 0</code>) and asks for 1 three times, so you end up at <b>1</b>, not 3. React does not change <code>count</code> in the middle of your handler; the new value shows up in the <i>next</i> render.</p>
      <p>When the next value depends on the previous one, pass a <b>function</b>: <code>setCount(c =&gt; c + 1)</code>. React queues the functions and runs them in order on the latest value: 0 → 1 → 2 → 3. The visualiser below lets you try both.</p>
      <h5>🔵 Never mutate state, always replace it</h5>
      <p>React decides "did it change?" by comparing the old and new value with <code>Object.is</code>. If you do <code>items.push(x); setItems(items)</code> the array is the <b>same object</b>, so React thinks nothing changed and may skip the update. Make a <b>new</b> array or object:</p>
      ${H.table(['To do this', 'Write this (new value)', 'Not this (mutation)'], [
        ['add to array', '<code>[...items, x]</code>', '<code>items.push(x)</code>'],
        ['remove from array', '<code>items.filter(i =&gt; i.id !== id)</code>', '<code>items.splice(i, 1)</code>'],
        ['change one item', '<code>items.map(i =&gt; i.id === id ? { ...i, done: true } : i)</code>', '<code>item.done = true</code>'],
        ['update an object', '<code>{ ...user, name: "Ben" }</code>', '<code>user.name = "Ben"</code>']
      ])}
      <h5>🔵 More facts</h5>
      <ul>
        <li>State belongs to <b>one component instance</b>. Two <code>&lt;Counter /&gt;</code> tags each have their own count.</li>
        <li>The initial value is used only on the first render. <code>useState(expensive())</code> still <i>calls</i> expensive() every time; pass a function <code>useState(() =&gt; expensive())</code> to run it once.</li>
        <li>Calls to setters inside one event are <b>batched</b>: React re-renders once at the end, not three times.</li>
        <li>Set to the same value and React usually does nothing.</li>
      </ul>`,
    clues: [
      '"Build a counter / toggle / like button" → <code>useState</code> with an event handler',
      '"Clicked three times but count only went up by one" → stale snapshot; use <code>setCount(c =&gt; c + 1)</code>',
      '"I changed the array but the screen did not update" → you mutated state; create a new array/object',
      '"<code>onClick={fn()}</code> runs on load" → you called the function instead of passing it',
      '"State vs a regular variable / ref" → state triggers a re-render, a ref does not',
      '"The console.log right after setState shows the old value" → state is a snapshot'
    ],
    code: [
      jsx(`import { useState } from 'react';

function Counter({ step = 1 }) {
  // count remembered by React between renders. Starts at 0.
  const [count, setCount] = useState(0);

  // Event handlers: functions React calls for us on click.
  const inc = () => setCount((c) => c + step);              // updater form: safe when based on previous value
  const dec = () => setCount((c) => Math.max(0, c - step)); // never below 0
  const reset = () => setCount(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={dec}>-</button>
      <button onClick={inc}>+</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}`, 'React: a counter with useState'),
      jsrun(`// A toy version of useState. The "slots" live OUTSIDE the component function,
// which is exactly why state survives between renders.
let slots = [], cursor = 0, pending = [], renders = 0, scheduled = false;

function useState(initial) {
  const i = cursor++;                          // each useState call takes the next slot
  if (!(i in slots)) slots[i] = initial;      // first render only
  const setState = (next) => {
    // Do not change anything now. Put the request in a queue (this is why state is a snapshot).
    pending.push(() => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; });
    if (!scheduled) { scheduled = true; Promise.resolve().then(flush); } // batch: one render later
  };
  return [slots[i], setState];
}
function flush() { scheduled = false; pending.forEach((fn) => fn()); pending = []; renderApp(); }

let ui;
function Counter() {
  const [count, setCount] = useState(0);
  ui = {
    // WRONG: all three calls use the same snapshot value of count
    plus3Wrong: () => { setCount(count + 1); setCount(count + 1); setCount(count + 1); },
    // RIGHT: each updater gets the latest value
    plus3Right: () => { setCount((c) => c + 1); setCount((c) => c + 1); setCount((c) => c + 1); }
  };
  console.log('render #' + (++renders) + ': count =', count);
}
function renderApp() { cursor = 0; Counter(); }

async function main() {
  renderApp();                 // first render
  ui.plus3Wrong();             // simulate a click
  await Promise.resolve(); await Promise.resolve();
  ui.plus3Right();             // another click, now using updater functions
  await Promise.resolve(); await Promise.resolve();
}
main();`, 'Plain JS: a tiny useState and render loop (runnable)')
    ],
    viz: {
      title: 'State is a snapshot: setCount(count + 1) x N vs setCount(c => c + 1) x N',
      input: 'plain 3',
      inputLabel: 'Style (plain or updater) and how many setCount calls in one click (1-6)',
      gen: function (input) {
        var w = words(input);
        var mode = (w[0] || '').toLowerCase(), n = Number(w[1] || 3);
        if (['plain', 'updater'].indexOf(mode) < 0 || !(n >= 1 && n <= 6) || n % 1 !== 0) throw new Error('Type "plain 3" or "updater 3" (1 to 6 calls)');
        var plain = mode === 'plain';
        var f = [];
        f.push({ narr: 'First render. React runs <code>Counter()</code> and <code>useState(0)</code> returns <b>count = 0</b>. This value is the <b>snapshot</b> for this whole render.', parts: [
          { type: 'vars', label: 'Render #1', vals: { 'count (snapshot)': 0, 'saved by React': 0 }, hl: { 'count (snapshot)': 'ok' } },
          { type: 'queue', label: 'Pending updates', items: [], frontLabel: 'next to run', backLabel: 'newest' }
        ] });
        f.push({ narr: 'You click the button. The handler runs <b>' + n + ' setCount call' + (n > 1 ? 's' : '') + '</b> in a row using the <b>' + mode + '</b> style: <code>' + (plain ? 'setCount(count + 1)' : 'setCount(c =&gt; c + 1)') + '</code>.', parts: [
          { type: 'code', label: 'Handler', lang: 'jsx', code: plain ? 'function handleClick() {\n  setCount(count + 1);\n  // ... repeated ' + n + ' times\n}' : 'function handleClick() {\n  setCount(c => c + 1);\n  // ... repeated ' + n + ' times\n}', hl: { 2: 'cur' } },
          { type: 'vars', label: 'Still render #1', vals: { 'count (snapshot)': 0 } }
        ] });
        var q = [];
        for (var i = 1; i <= n; i++) {
          q.push(plain ? 'set to 1' : 'c => c + 1');
          f.push({ narr: 'Call #' + i + ': React does <b>not</b> change <code>count</code> yet. It only <b>adds a request to the queue</b>. ' + (plain ? 'The handler still sees <code>count = 0</code>, so it asks for <code>0 + 1 = 1</code> again.' : 'The queue stores the instruction itself, not a number, so it will use the latest value later.'), parts: [
            { type: 'vars', label: 'Still render #1', vals: { 'count (snapshot)': 0, 'calls so far': i } },
            { type: 'queue', label: 'Pending updates', items: q.slice(), hl: (function () { var o = {}; o[q.length - 1] = 'cur'; return o; })(), frontLabel: 'runs first', backLabel: 'newest' }
          ] });
        }
        var cur = 0, qq = q.slice();
        for (var j = 0; j < n; j++) {
          cur = plain ? 1 : cur + 1;
          qq.shift();
          f.push({ narr: 'The handler is finished. React now processes the queue in order. Step ' + (j + 1) + ': ' + (plain ? 'replace the state with <b>1</b>' : 'run <code>c =&gt; c + 1</code> on the latest value') + ' → the pending state is <b>' + cur + '</b>.', parts: [
            { type: 'vars', label: 'Processing queue', vals: { 'pending state': cur }, hl: { 'pending state': plain ? 'bad' : 'ok' } },
            { type: 'queue', label: 'Left in queue', items: qq.slice(), frontLabel: 'runs next', backLabel: 'newest' }
          ] });
        }
        f.push({ narr: 'Render #2 with <b>count = ' + cur + '</b>. ' + (plain ? 'Every request said "1", so ' + n + ' clicks of work gave only <span class="c-r">+1</span>. Use the updater form when the new value depends on the old one.' : 'Each updater built on the last result, so you got <span class="c-g">+' + n + '</span> as expected.'), parts: [
          { type: 'vars', label: 'Render #2', vals: { 'count (snapshot)': cur, 'expected': n }, hl: { 'count (snapshot)': cur === n ? 'ok' : 'bad' } },
          { type: 'queue', label: 'Pending updates', items: [], frontLabel: 'runs next', backLabel: 'newest' }
        ] });
        return f;
      }
    },
    examples: [
      {
        title: 'The log right after setState is still old',
        html: `<p>New learners write <code>setName("Ben"); console.log(name);</code> and are surprised it prints the old name. That is not a bug. <code>name</code> belongs to this render's snapshot. To react to the new value, use it in the next render (in the JSX), or compute the new value in a variable first: <code>const next = "Ben"; setName(next); console.log(next);</code>.</p>`
      },
      {
        title: 'Updating an object or array correctly',
        html: `<p>A todo item is toggled by <b>replacing</b> that one item with a fresh copy and keeping the rest. Never write <code>todo.done = !todo.done</code>.</p>`,
        code: jsx(`const [todos, setTodos] = useState([{ id: 1, text: 'Buy milk', done: false }]);

function toggle(id) {
  setTodos((list) =>
    list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) // new object only for the changed one
  );
}
function add(text) {
  setTodos((list) => [...list, { id: Date.now(), text, done: false }]); // new array
}`, 'Immutable updates')
      },
      {
        title: 'Two counters, two separate memories',
        html: `<p><code>&lt;Counter /&gt;&lt;Counter /&gt;</code> renders the same function twice. Each tag is its own <b>instance</b> with its own slot of state. Clicking the first does nothing to the second. If you want them to share, the state must move to their common parent (lifting state up, topic 8).</p>`
      },
      {
        title: 'Lazy initial state',
        html: `<p><code>useState(JSON.parse(localStorage.getItem("cart")))</code> parses the string on <b>every render</b>, only to throw it away. Write <code>useState(() =&gt; JSON.parse(localStorage.getItem("cart")))</code>. React calls the function only on the very first render.</p>`
      }
    ],
    deepDive: `<h5>🟣 How useState really works</h5>
      <p>React keeps, for every component instance, a linked list of "hook" objects (on the Fiber node). Each <code>useState</code> call reads the <b>next</b> object in that list, so the <i>order</i> of hook calls must be identical every render. That is why hooks cannot be inside <code>if</code>, loops or after an early <code>return</code> (the "rules of hooks"). Our toy <code>slots[]</code> + <code>cursor</code> model above is almost literally that mechanism.</p>
      <h5>🟣 What happens when you call the setter</h5>
      <p>The setter does not run your component. It creates an update object, appends it to the hook's queue, marks that component (and its path up to the root) as having work, and asks the scheduler for a render. When React renders, it walks the queue: if the update is a value it replaces the state; if it is a function it calls it with the state so far. Updater functions must be <b>pure</b>: in Strict Mode React calls them twice to catch mistakes.</p>
      <h5>🟣 Batching</h5>
      <p>Since React 18 batching is <b>automatic</b> everywhere (event handlers, promises, timeouts). Several setters in one tick cause one render. If you truly need the DOM updated right now you can wrap a setter in <code>flushSync</code>, but it is rarely the right answer.</p>
      <h5>🟣 Bailing out</h5>
      <p>If the new state is <code>Object.is</code>-equal to the current one, React skips re-rendering the children and the effects (it may still call your component once more before deciding). This is why mutation + same reference "does nothing", and why you can set the same value repeatedly without cost.</p>
      <h5>🟣 Where state should live</h5>
      <p>Rule of thumb: keep state <b>as local as possible</b>, store the <b>minimum</b> needed, and compute everything else during render (derived data). Do not copy props into state (<code>useState(props.user)</code>) unless you want "initial value only" semantics, because later prop changes would be ignored. Prefer <code>useReducer</code> when several fields change together with rules, and a ref when you need to remember something that must <b>not</b> trigger a render (timer ids, previous values).</p>`,
    aiEra: `<p><b>What AI changes:</b> A chatbot can produce a perfect counter. The things it quietly gets wrong are exactly the interview traps: stale snapshots, mutation, and effects that should have been derived values.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my component. List every piece of state and say whether it could be derived from other state or props instead.</code> And: <code>Write 5 scenarios that would break this handler if the user clicks fast.</code></p>
      <p><b>Where AI goes wrong:</b> It sometimes stores computed values in state (then adds a <code>useEffect</code> to keep them in sync), writes <code>setItems(items.push(x))</code> (push returns a number), or sprinkles <code>useState</code> where a plain variable or a ref was correct.</p>
      <p><b>What you must still own:</b> the mental model "snapshot + queue + new object", and the habit of asking "does this need to be state at all?".</p>`,
    problems: [{
      title: 'Counter with Step, Reset and a Floor of Zero',
      level: 'Easy', tags: ['useState', 'events', 'updater function'], companies: ['Microsoft', 'Zomato'],
      statement: `<p>Build a <code>Counter</code>. It shows the count (starting at 0) and has buttons <b>+</b>, <b>-</b>, <b>Reset</b> and <b>+3</b>. The count must never go below 0. The <b>+3</b> button must add exactly three even though it is a single click, and it should do so by calling the setter three times (to practise the updater form).</p>`,
      constraints: `Use <code>useState</code>. No <code>let</code> counter variable. Handlers are passed to <code>onClick</code>, not called. Count is a non-negative integer.`,
      example: `${H.table(['Clicks', 'Displayed count'], [['+, +', '2'], ['-', '1'], ['-, -', '0 (floor, not -1)'], ['+3', '3'], ['Reset', '0']])}
        <p>${H.c('g', 'Why')}: <code>-</code> clamps with <code>Math.max(0, ...)</code>, and <code>+3</code> uses three updaters that chain 0 → 1 → 2 → 3.</p>`,
      brute: { why: `<p>Use a plain variable. The number changes in memory, but React is never told, so the screen shows 0 forever. (Also, even if it re-rendered, <code>let count = 0</code> would be reset on every call.)</p>`, code: jsx(`function BrokenCounter() {
  let count = 0;                       // thrown away on every render
  function inc() { count = count + 1; console.log(count); } // changes memory, not the screen
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={inc}>+</button>
    </div>
  );
}`, 'Plain variable never updates the UI') },
      mcq: { q: 'A click handler runs <code>setCount(count + 1)</code> three times with count = 0. What will the next render show?', options: ['3', '1', '0', '2'], answer: 1, explain: 'All three calls read the same snapshot (count = 0) and each asks for 1. The last one wins, so the next count is 1. Use setCount(c => c + 1) to get 3.' },
      hints: [
        `<p>Hint 1: The count must be remembered between renders and changing it must redraw the screen. Which hook does both?</p>`,
        `<p>Hint 2: Use <code>setCount(c =&gt; ...)</code> (updater form) for every change, because each new value depends on the old one. Clamp the minus with <code>Math.max(0, c - 1)</code>.</p>`,
        `<p>Hint 3: Recipe: <code>const [count, setCount] = useState(0)</code>; write <code>inc</code>, <code>dec</code>, <code>reset</code>, <code>plus3</code> (three updater calls) as small functions; render <code>count</code> and four buttons with <code>onClick={fn}</code> (no parentheses).</p>`
      ],
      solution: {
        approach: `<p>Store the number in state, change it only through the setter, and use the updater form so repeated calls build on each other. The floor of zero is enforced in one place (the decrement). The plain JS tab simulates the same queue so you can see 3 clicks of work give +3.</p>`,
        code: jsx(`import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  const inc = () => setCount((c) => c + 1);
  const dec = () => setCount((c) => Math.max(0, c - 1)); // floor at zero
  const reset = () => setCount(0);
  const plus3 = () => {
    // three updaters in ONE click: React queues them and applies them in order
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={dec}>-</button>
      <button onClick={inc}>+</button>
      <button onClick={plus3}>+3</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}`, 'Solution'),
        alt: [jsrun(`// Runnable model of the update queue used by the solution.
function applyQueue(start, queue) { return queue.reduce((state, u) => (typeof u === 'function' ? u(state) : u), start); }
const inc = (c) => c + 1;
const dec = (c) => Math.max(0, c - 1);
let count = 0;
count = applyQueue(count, [inc, inc]);       console.log('+ +   ->', count);
count = applyQueue(count, [dec]);            console.log('-     ->', count);
count = applyQueue(count, [dec, dec]);       console.log('- -   ->', count, '(floored at 0)');
count = applyQueue(count, [inc, inc, inc]);  console.log('+3    ->', count);
count = applyQueue(count, [0]);              console.log('reset ->', count);`, 'Plain JS model (runnable)')],
        complexity: `<p>O(1) per click, one re-render per click because the three setters are batched.</p>`,
        followUps: ['How would you let the user choose a step size (1, 5, 10)?', 'Rewrite it with useReducer. When is that nicer?']
      }
    }]
  });

  /* ======================= TOPIC 4: RENDERING & RE-RENDERING ======================= */
  topics.push({
    title: 'Rendering & Re-rendering: Who Runs When?',
    analogy: `<p>Think of an <b>architect with a blueprint</b>. When something changes, the architect <b>redraws the blueprint</b> (this is cheap, it is only paper). Then someone compares the new blueprint with the old one and sends builders to change <b>only the walls that differ</b> (this is the costly part: the real DOM).</p>
      <p>"Rendering" in React means <i>redrawing the blueprint</i>: calling your component functions. It does <b>not</b> mean touching the screen. A component can render a hundred times and cause zero DOM changes.</p>`,
    explain: `<p>Every update in React goes through three steps:</p>
      ${H.table(['Step', 'What happens', 'Cost'], [
        ['1. <b>Trigger</b>', 'First load, or a state setter was called.', 'tiny'],
        ['2. <b>Render</b>', 'React <b>calls your component functions</b> to get new JSX (elements). It compares the result with the previous result.', 'your JS runs; can be heavy if the tree is big'],
        ['3. <b>Commit</b>', 'React changes the <b>real DOM</b> only where the two results differ.', 'browser work: layout and paint']
      ])}
      <h5>🟢 When does a component re-render?</h5>
      <ol>
        <li>Its <b>own state</b> changed (a setter was called with a new value).</li>
        <li>Its <b>parent re-rendered</b>. This is the surprising one. Even if the props are exactly the same, React still calls the child again.</li>
        <li>A <b>Context</b> it reads changed (hooks module).</li>
      </ol>
      <p>Re-renders flow <b>down</b> the tree, never up and never sideways. If a button deep inside <code>Counter</code> changes <code>Counter</code>'s state, <code>Counter</code> and everything below it re-render. Its parent <code>Page</code>, its sibling <code>Footer</code> and <code>App</code> do <b>not</b>.</p>
      <h5>🟢 Is a re-render bad?</h5>
      <p>Usually <b>no</b>. Re-rendering is how React works, and React is fast at it. A re-render only becomes a problem when a component is <i>slow</i> (a big chart, 5000 rows) or the tree is huge. Do not optimise until the screen feels slow.</p>
      <h5>🔵 Tools to limit re-renders (use only when needed)</h5>
      ${H.table(['Technique', 'Idea', 'When'], [
        ['<b>Move state down</b>', 'Put the state in the smallest component that needs it, so fewer components sit below it.', 'First thing to try. Free.'],
        ['<b>Children as props</b>', 'Parent builds the slow part and passes it as <code>children</code>. When the wrapper re-renders, it receives the <i>same</i> element objects, so React skips them.', 'Layout wrappers with their own state'],
        ['<b><code>React.memo</code></b>', 'Skip re-rendering a component if its props are shallow-equal to last time.', 'A slow pure component and stable props'],
        ['<b>React Compiler</b>', 'A build step (stable since 2025) that adds memoisation automatically.', 'New projects; reduces the need for manual memo']
      ])}
      <h5>🔵 Render must be pure</h5>
      <p>Because React may call your component more than once (Strict Mode does this on purpose in development) the function must have <b>no side effects</b>: no network calls, no timers, no editing outside variables. It should only calculate JSX from props and state.</p>
      <p>The visualiser lets you choose <i>which component owns the state</i> and watch exactly which components run, and what <code>React.memo</code> changes.</p>`,
    clues: [
      '"Typing in the search box makes the whole page slow" → state is too high up; move it down or isolate the slow part',
      '"Why did my child re-render when its props did not change?" → its parent re-rendered',
      '"Does re-render mean the DOM is updated?" → no: render (JS) and commit (DOM) are separate',
      '"When should I use <code>React.memo</code> / <code>useMemo</code>?" → measure first; needs stable props to work',
      '"How would you find unnecessary renders?" → React DevTools Profiler, "Highlight updates", why-did-you-render',
      '"Why is my component logged twice?" → Strict Mode double render in development'
    ],
    code: [
      jsx(`import { useState, memo } from 'react';

// BEFORE: the input's state lives in App, so every keystroke re-renders SlowChart too.
function AppBefore() {
  const [text, setText] = useState('');
  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <SlowChart />                        {/* re-runs on every keystroke */}
    </div>
  );
}

// FIX 1: move the state down into the smallest component that needs it.
function SearchBox() {
  const [text, setText] = useState('');
  return <input value={text} onChange={(e) => setText(e.target.value)} />;
}
function AppAfter() {
  return (
    <div>
      <SearchBox />                        {/* only this re-renders while typing */}
      <SlowChart />
    </div>
  );
}

// FIX 2 (when state must stay high): memo skips the child when props are equal.
const SlowChart = memo(function SlowChart() {
  // imagine 5000 SVG points here
  return <svg />;
});`, 'React: move state down, or memo'),
      jsrun(`// A model of "who re-renders". A render = the component function being called.
function makeTree() {
  const n = (name, children = [], memo = false) => ({ name, children, memo, renders: 0 });
  return n('App', [
    n('Header', [n('Logo'), n('Nav')]),
    n('Page', [n('Counter'), n('Footer')])
  ]);
}
function find(node, name) {
  if (node.name === name) return node;
  for (const c of node.children) { const r = find(c, name); if (r) return r; }
  return null;
}
// Run component "node": it renders, then its children render too,
// unless a child is memoised (props did not change, so React skips it).
function renderComponent(node, log) {
  node.renders++;
  log.push(node.name);
  for (const child of node.children) {
    if (child.memo) log.push('(' + child.name + ' skipped)');
    else renderComponent(child, log);
  }
}
function scenario(title, owner, memoNames) {
  const root = makeTree();
  memoNames.forEach((m) => { find(root, m).memo = true; });
  const log = [];
  renderComponent(find(root, owner), log); // setState was called inside "owner"
  console.log(title + '\\n   ' + log.join(' -> '));
}
scenario('State in Counter', 'Counter', []);
scenario('State in Page', 'Page', []);
scenario('State in App', 'App', []);
scenario('State in App, Header and Footer wrapped in memo', 'App', ['Header', 'Footer']);`, 'Plain JS: which components re-run? (runnable)')
    ],
    viz: {
      title: 'Re-render propagation: which components run?',
      input: 'Counter',
      inputLabel: 'Component that owns the state (App, Header, Page, Logo, Nav, Counter, Footer). Add the word memo to wrap Header and Footer in React.memo',
      gen: function (input) {
        var names = ['App', 'Header', 'Page', 'Logo', 'Nav', 'Counter', 'Footer'];
        var kids = { 0: [1, 2], 1: [3, 4], 2: [5, 6], 3: [], 4: [], 5: [], 6: [] };
        var w = words(input);
        if (!w.length) throw new Error('Type a component name, e.g. Counter, Page or App memo');
        var owner = -1;
        names.forEach(function (n, i) { if (n.toLowerCase() === w[0].toLowerCase()) owner = i; });
        if (owner < 0) throw new Error('Pick one of: ' + names.join(', '));
        var memo = w.slice(1).join(' ').toLowerCase().indexOf('memo') >= 0;
        var memoSet = memo ? { 1: true, 6: true } : {};
        var counts = [1, 1, 1, 1, 1, 1, 1];
        function tags(extra) {
          var t = {};
          if (memo) { t[1] = 'memo'; t[6] = 'memo'; }
          t[owner] = (t[owner] ? t[owner] + ', ' : '') + 'state';
          Object.keys(extra || {}).forEach(function (k) { t[k] = extra[k]; });
          return t;
        }
        function rows() { return names.map(function (n, i) { return [n, counts[i]]; }); }
        var f = [];
        var all = {}; for (var a = 0; a < 7; a++) all[a] = 'ok';
        f.push({ narr: 'First load: every component renders <b>once</b>, top to bottom. Green = ran this step. ' + (memo ? '<code>Header</code> and <code>Footer</code> are wrapped in <code>React.memo</code>.' : ''), parts: [
          { type: 'tree', label: 'Component tree', arr: names, hl: all, tags: tags() },
          { type: 'table', label: 'Render count', columns: ['Component', 'Times its function ran'], rows: rows() }
        ] });
        f.push({ narr: 'The user clicks something inside <b>' + names[owner] + '</b>. It calls <code>setState</code>. React marks <b>' + names[owner] + '</b> as needing work. Nothing above it or beside it is touched.', parts: [
          { type: 'tree', label: 'Component tree', arr: names, hl: (function () { var o = {}; for (var i = 0; i < 7; i++) o[i] = 'done'; o[owner] = 'cur'; return o; })(), tags: tags({}) }
        ] });
        // BFS by level from owner
        var rendered = [owner], level = [owner], skipped = [], step = 0;
        counts[owner]++;
        function hlNow(currentLevel) {
          var o = {}; for (var i = 0; i < 7; i++) o[i] = 'done';
          rendered.forEach(function (i) { o[i] = 'ok'; });
          skipped.forEach(function (i) { o[i] = 'sel'; });
          currentLevel.forEach(function (i) { o[i] = 'cur'; });
          return o;
        }
        f.push({ narr: '<b>' + names[owner] + '</b> renders first (its own state changed). Render count +1.', parts: [
          { type: 'tree', label: 'Component tree', arr: names, hl: hlNow([owner]), tags: tags() },
          { type: 'table', label: 'Render count', columns: ['Component', 'Times its function ran'], rows: rows(), hl: (function () { var o = {}; o[owner] = 'sel'; return o; })() }
        ] });
        while (level.length) {
          var next = [], skippedNow = [];
          level.forEach(function (p) {
            kids[p].forEach(function (c) {
              if (memoSet[c]) { skipped.push(c); skippedNow.push(c); } else { rendered.push(c); next.push(c); counts[c]++; }
            });
          });
          if (!next.length && !skippedNow.length) break;
          step++;
          var narr = 'Because a parent rendered, its children are called next: ' + (next.length ? '<b>' + next.map(function (i) { return names[i]; }).join(', ') + '</b> run again even though their props did not change.' : '');
          if (skippedNow.length) narr += ' <b>' + skippedNow.map(function (i) { return names[i]; }).join(', ') + '</b> is wrapped in <code>memo</code> and its props are equal, so React <span class="c-p">skips it and everything below it</span>.';
          f.push({ narr: narr, parts: [
            { type: 'tree', label: 'Component tree (green = ran, purple = skipped by memo)', arr: names, hl: hlNow(next), tags: tags() },
            { type: 'table', label: 'Render count', columns: ['Component', 'Times its function ran'], rows: rows(), hl: (function () { var o = {}; next.forEach(function (i) { o[i] = 'ok'; }); return o; })() }
          ] });
          level = next;
        }
        var untouched = [];
        for (var u = 0; u < 7; u++) if (rendered.indexOf(u) < 0 && skipped.indexOf(u) < 0) untouched.push(names[u]);
        var ranCount = rendered.length;
        f.push({ narr: 'Done. <b>' + ranCount + ' of 7</b> components ran. ' + (untouched.length ? 'Not touched at all (ancestors and siblings): <b>' + untouched.join(', ') + '</b>. ' : 'Every component ran. ') + 'Rule: <b>an update re-renders the owner and everything under it</b>. Try <code>Counter</code>, then <code>App</code>, then <code>App memo</code> and compare.', parts: [
          { type: 'tree', label: 'Final picture', arr: names, hl: hlNow([]), tags: tags() },
          { type: 'table', label: 'Render count', columns: ['Component', 'Times its function ran'], rows: rows() }
        ] });
        return f;
      }
    },
    examples: [
      {
        title: 'Parent renders, child renders, even with identical props',
        html: `<p>In this example <code>Child</code> receives the same string every time. Yet every click on the button in <code>Parent</code> logs "Child rendered". This is normal and cheap for small components. If <code>Child</code> were slow you would wrap it in <code>memo</code>.</p>`,
        code: jsx(`function Child({ label }) {
  console.log('Child rendered');      // runs on EVERY parent render
  return <p>{label}</p>;
}
function Parent() {
  const [n, setN] = useState(0);
  return (
    <>
      <button onClick={() => setN(n + 1)}>Clicked {n}</button>
      <Child label="Hello" />          {/* same props, still re-renders */}
    </>
  );
}`, 'Same props, still re-rendered')
      },
      {
        title: 'The children-as-props trick',
        html: `<p>The mouse-position tracker below has fast-changing state. <code>SlowTree</code> is created by <code>App</code>, not by <code>MouseArea</code>, so each time <code>MouseArea</code> re-renders it hands back the <b>same element object</b>. React sees "identical element, nothing to do" and skips it. No <code>memo</code> needed.</p>`,
        code: jsx(`function MouseArea({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}>
      <p>{pos.x}, {pos.y}</p>
      {children}                        {/* same element each time: skipped */}
    </div>
  );
}
function App() {
  return <MouseArea><SlowTree /></MouseArea>;   // SlowTree element created here, once
}`, 'Children as props')
      },
      {
        title: 'Render is not commit',
        html: `<p>Say a list of 1000 rows re-renders because a header counter changed. Your 1000 functions run (JS), React compares old and new JSX, finds that no row changed, and makes <b>zero</b> DOM writes. The browser does no layout and no paint. That is why "my component rendered" and "my page is slow" are two different questions. Check the Performance tab and the Profiler before assuming.</p>`
      },
      {
        title: 'A new object prop silently defeats memo',
        html: `<p><code>const Chart = memo(...)</code> and then <code>&lt;Chart options={{ color: "red" }} /&gt;</code>. The <code>{ color: "red" }</code> is a new object on every parent render, so the "props are equal" check fails and memo does nothing. Hoist it out as a constant, or wrap it in <code>useMemo</code>. The same trap exists for inline functions and arrays.</p>`
      }
    ],
    deepDive: `<h5>🟣 Render phase vs commit phase</h5>
      <p>The <b>render phase</b> is pure and may be paused, restarted, or thrown away (concurrent rendering, topic in "React Internals"). The <b>commit phase</b> is synchronous: React applies DOM mutations, then runs layout effects, then lets the browser paint, then runs passive effects (<code>useEffect</code>). Never put side effects in the render phase because React can run it twice or abandon it.</p>
      <h5>🟣 How React skips work: the bail-out rules</h5>
      <p>For each child fiber React asks: has the <b>element</b> changed? If the element object is the same reference (the children trick) it stops. If it is a new element, it checks <code>memo</code>: shallow-compare props with <code>Object.is</code> for each key. Next it checks if the fiber has pending state/context updates. If none, it <b>bails out</b> and reuses the previous result without descending. Shallow equal means <code>{a: [1]}</code> vs <code>{a: [1]}</code> is "different" (two array objects).</p>
      <h5>🟣 Reconciliation, briefly</h5>
      <p>After rendering, React diffs the new element tree against the previous one in O(n) using two heuristics: elements of <b>different types</b> produce different trees (destroy and rebuild), and <b>keys</b> identify children across renders. Same type at the same position means "update in place": keep the DOM node and the state, change only the changed attributes. We look at lists in the next topic.</p>
      <h5>🟣 Strict Mode</h5>
      <p>In development, <code>&lt;StrictMode&gt;</code> renders each component twice (the second result is discarded) and also mounts, unmounts and re-mounts effects once. If a double render breaks your code, the code was impure. It does nothing in production.</p>
      <h5>🟣 Measuring</h5>
      <p>React DevTools Profiler records commits and shows "why did this render?" (props changed, state changed, parent rendered). Combine with the browser Performance panel for real cost. The <b>React Compiler</b> memoises components and values at build time, so manual <code>memo</code>/<code>useMemo</code>/<code>useCallback</code> become the exception rather than the rule in codebases that adopt it. You still need to understand what it is doing for you, and the "move state down" and "children" techniques remain good design.</p>`,
    aiEra: `<p><b>What AI changes:</b> Modern tools can read a Profiler trace or a flame graph you paste in and suggest hot spots. The React Compiler is itself "AI-like" automation for memoisation. The job shifts from adding <code>useMemo</code> by hand to <b>understanding why something re-renders</b> and fixing the structure.</p>
      <p><b>Use AI as a partner:</b> <code>Here is a component tree and where the state lives. Which components re-render when X changes? Draw it as a tree.</code> Compare its answer with the DevTools "highlight updates" result: a great way to test your own mental model.</p>
      <p><b>Where AI goes wrong:</b> It wraps everything in <code>memo</code>, <code>useMemo</code> and <code>useCallback</code> "just in case" (more code, more bugs, sometimes slower), passes unstable inline objects to memoised children (so memo never works), or "fixes" a lag with <code>setTimeout</code>.</p>
      <p><b>What you must still own:</b> measure first, then pick the simplest fix (move state down, children, then memo). Be able to explain that render is not commit and that a parent render re-runs its children.</p>`,
    problems: [{
      title: 'Typing Lags: Find Who Re-renders and Fix It',
      level: 'Medium', tags: ['re-render', 'performance', 'memo', 'state placement'], companies: ['Razorpay', 'Uber'],
      statement: `<p>An <code>App</code> has a text <code>&lt;input&gt;</code> whose value is kept in <code>App</code>'s state, and a <code>&lt;HeavyChart /&gt;</code> that takes ~80 ms to render. Typing feels laggy. (1) Explain exactly which components re-render on every keystroke. (2) Fix it in two different ways: move the state down, and wrap <code>HeavyChart</code> in <code>memo</code>. (3) Say when the memo fix would <i>fail</i>.</p>`,
      constraints: `Do not change what the user sees. <code>HeavyChart</code> takes a stable <code>data</code> prop that comes from a module-level constant. Explain in terms of render vs commit.`,
      example: `${H.table(['Layout', 'Keystroke triggers', 'HeavyChart runs?'], [['state in App', 'App renders → input + HeavyChart', '<span class="c-r">yes, 80 ms each time</span>'], ['state in SearchBox', 'only SearchBox renders', '<span class="c-g">no</span>'], ['state in App + memo(HeavyChart)', 'App renders, HeavyChart skipped', '<span class="c-g">no (props equal)</span>']])}
        <p>${H.c('g', 'Why')}: a state change re-renders the owner and everything below it. Moving the owner down shrinks "below it".</p>`,
      brute: { why: `<p>Debounce the input or lower the chart quality to hide the lag. This treats the symptom: the chart is still re-rendered needlessly, and you added delay for users. The wasted work is the 80 ms render of a component whose inputs did not change.</p>`, code: jsx(`function App() {
  const [text, setText] = useState('');
  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <HeavyChart data={DATA} />   {/* 80 ms, re-runs on every keystroke */}
    </div>
  );
}`, 'State too high: HeavyChart re-runs') },
      mcq: { q: 'You wrap <code>HeavyChart</code> in <code>memo</code> but pass <code>data={DATA.filter(Boolean)}</code> from <code>App</code>. What happens on a keystroke?', options: ['HeavyChart is skipped because memo is applied', 'HeavyChart still re-renders: the filter returns a new array each time, so props are not equal', 'React throws a warning and stops', 'Only the input re-renders'], answer: 1, explain: 'memo uses a shallow comparison. filter() returns a brand new array every render, so the "same props" check fails. Hoist or useMemo the array, or move the state down.' },
      hints: [
        `<p>Hint 1: An update re-renders the component that owns the state <b>and all its descendants</b>. Who owns the text state here?</p>`,
        `<p>Hint 2: Fix A: make the state smaller in scope. Create a <code>SearchBox</code> that owns <code>text</code> and render it next to the chart instead of above it. Fix B: <code>memo(HeavyChart)</code> so it is skipped when props are equal.</p>`,
        `<p>Hint 3: Recipe: (A) move <code>useState</code> + the input into <code>SearchBox</code>; <code>App</code> has no state now so it never re-renders. (B) if <code>App</code> truly needs the text (to filter chart data), keep the state, memo the chart, and make sure <code>data</code> is referentially stable. Mention the failure case: unstable props.</p>`
      ],
      solution: {
        approach: `<p>On each keystroke <code>App</code> re-renders, which re-renders its children, including the heavy chart. The DOM for the chart does not change, but the JS that computes it still runs: 80 ms per key. <b>Fix A</b> (best) moves the state into a tiny <code>SearchBox</code> so only it re-renders. <b>Fix B</b> memoises the chart so React skips it when props are equal. B fails when a prop is a new object/array/function every render. The runnable model counts renders in all three layouts.</p>`,
        code: jsx(`import { useState, memo } from 'react';

const DATA = [3, 7, 2, 9, 4];            // stable: created once at module level

// Fix A: the state lives only where it is needed.
function SearchBox() {
  const [text, setText] = useState('');
  return <input value={text} onChange={(e) => setText(e.target.value)} />;
}

// Fix B: skip re-rendering when props are shallow-equal.
const HeavyChart = memo(function HeavyChart({ data }) {
  // ... expensive SVG work (~80 ms) ...
  return <svg data-points={data.length} />;
});

export default function App() {
  return (
    <div>
      <SearchBox />
      <HeavyChart data={DATA} />        {/* not re-rendered while typing */}
    </div>
  );
}`, 'Solution'),
        alt: [jsrun(`// Count how many times each component's function runs over 5 keystrokes.
function run(title, stateIn, chartMemo) {
  const renders = { App: 1, SearchBox: 1, HeavyChart: 1 }; // first render
  for (let key = 0; key < 5; key++) {
    if (stateIn === 'App') {
      renders.App++; renders.SearchBox++;                  // owner and everything below
      if (!chartMemo) renders.HeavyChart++;                // memo would skip it
    } else {
      renders.SearchBox++;                                  // only the small owner
    }
  }
  const ms = renders.HeavyChart * 80;
  console.log(title.padEnd(34), JSON.stringify(renders), '-> chart time', ms + ' ms');
}
run('state in App', 'App', false);
run('state in SearchBox (Fix A)', 'SearchBox', false);
run('state in App + memo (Fix B)', 'App', true);`, 'Plain JS model (runnable)')],
        complexity: `<p>Before: 5 keystrokes × 80 ms = 400 ms of chart work. After either fix: 80 ms once (initial render). Work is proportional to the number of components that re-run.</p>`,
        followUps: ['What if the chart needs the typed text to filter its data?', 'How does the React Compiler change which fix you write by hand?']
      }
    }]
  });

  /* ======================= TOPIC 5: LISTS & KEYS ======================= */
  topics.push({
    title: 'Lists & Keys: Helping React Tell Items Apart',
    analogy: `<p>At a hotel, the staff must know which suitcase belongs to which guest. If they track guests by <b>room number</b> (the index) and a new guest is squeezed into room 1, every guest shifts one room and the staff hand each person the <b>wrong suitcase</b>. If each guest wears a <b>name tag</b> (a key), it does not matter where they sleep: the right suitcase always follows the right person.</p>
      <p>In React the "suitcase" is the item's hidden <b>state and DOM node</b> (a typed-in text box, a checked checkbox, an open dropdown).</p>`,
    explain: `<p>To show a list you <b>map</b> an array to elements. Each element needs a <b><code>key</code></b>: a short, unique, stable text or number that identifies that item among its siblings.</p>
      ${H.table(['Piece', 'Example'], [
        ['Map array → elements', '<code>{todos.map(t =&gt; &lt;li key={t.id}&gt;{t.text}&lt;/li&gt;)}</code>'],
        ['Empty state', '<code>{todos.length === 0 ? &lt;p&gt;Nothing to do!&lt;/p&gt; : list}</code>'],
        ['Filter then map', '<code>todos.filter(t =&gt; !t.done).map(...)</code>']
      ])}
      <h5>🟢 What is a key for?</h5>
      <p>When the list changes (add, remove, reorder), React must decide: "which new element is the <i>same item</i> as which old element?" Same item → reuse it (keep its DOM and state, update only what changed). New item → create. Missing item → remove. The <b>key</b> is the only thing React trusts to answer that question.</p>
      <h5>🟢 Rules of good keys</h5>
      <ul>
        <li><b>Unique among siblings</b> (not globally). Two lists can use the same ids.</li>
        <li><b>Stable</b>: the same item always has the same key across renders. Use the database id.</li>
        <li><b>Not random</b>: <code>key={Math.random()}</code> gives every item a new key on every render, so React destroys and rebuilds <i>everything</i> each time.</li>
        <li><b>Put it on the outermost element</b> returned by <code>map</code>, not on something inside.</li>
        <li><b>Index as key</b> (<code>key={i}</code>) is OK only for a list that is <b>static</b>: never reordered, filtered, inserted or deleted, and with no state in the rows. Otherwise it causes bugs.</li>
        <li>No stable id yet? Generate one <b>when the item is created</b> (<code>crypto.randomUUID()</code>), not when rendering.</li>
      </ul>
      <p><code>key</code> is read by React and is <b>not</b> given to your component as a prop.</p>
      <h5>🔵 The classic bug</h5>
      <p>Each row has an input. You type "hello" in row 1 (the first item, A). Then a new item X is added at the <b>top</b>. With <code>key={index}</code>, React sees: position 0 was there before, position 0 is there now, so "same item, just new props", and keeps the old text box. Your "hello" stays in position 0, which now shows X. With <code>key={item.id}</code> React knows A moved to position 1 and the text box moves with it.</p>
      <p>Use the visualiser: it shows, for the same change, what happens to each row's hidden state with index keys and with real keys.</p>
      <h5>🔵 A neat trick: key resets state on purpose</h5>
      <p>Changing the key of a component <b>destroys</b> the old instance and creates a fresh one. <code>&lt;Profile key={userId} user={user} /&gt;</code> guarantees that switching users clears any half-typed form inside Profile. This is often better than writing an effect to reset state.</p>`,
    clues: [
      '"Warning: Each child in a list should have a unique key prop" → add a stable <code>key</code> on the outermost mapped element',
      '"Input values jump to the wrong row after adding / removing / sorting" → index keys with stateful rows',
      '"Component keeps stale state when I switch between items" → give it a <code>key</code> so it remounts',
      '"List loses focus on each keystroke / re-mounts every render" → random keys, or a key that changes',
      '"Why not use index as key?" → breaks when items reorder, insert or delete',
      '"Render 10,000 rows" → keys alone are not enough; use virtualization (windowing)'
    ],
    code: [
      jsx(`import { useState } from 'react';

function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Call mum', done: true }
  ]);

  if (todos.length === 0) return <p>Nothing to do. Enjoy your day!</p>;   // empty state

  return (
    <ul>
      {todos.map((t) => (
        // key: stable id, on the OUTERMOST element returned by map
        <li key={t.id} style={{ textDecoration: t.done ? 'line-through' : 'none' }}>
          {t.text}
        </li>
      ))}
    </ul>
  );
}`, 'React: rendering a list with keys'),
      jsrun(`// A keyed list diff in plain JavaScript: what React does when a list changes.
// oldItems/newItems are arrays of {key, label}. Returns what happens to each item.
function reconcile(oldItems, newItems, keyOf) {
  const oldByKey = new Map(oldItems.map((it, i) => [keyOf(it, i), i]));
  const used = new Set();
  const result = newItems.map((it, i) => {
    const k = keyOf(it, i);
    if (oldByKey.has(k)) {
      used.add(k);
      const from = oldByKey.get(k);
      return { key: k, label: it.label, action: from === i ? 'reuse' : 'reuse (moved from ' + from + ')' };
    }
    return { key: k, label: it.label, action: 'CREATE' };
  });
  const removed = oldItems.filter((it, i) => !used.has(keyOf(it, i))).map((it) => it.label);
  return { result, removed };
}

const before = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }].map((x) => ({ ...x }));
const after = [{ id: 'x', label: 'X' }, { id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }];

console.log('--- key = index ---');
const byIndex = reconcile(before, after, (it, i) => i);
byIndex.result.forEach((r) => console.log(r.key, r.label, r.action));
console.log('removed:', byIndex.removed);

console.log('--- key = id ---');
const byId = reconcile(before, after, (it) => it.id);
byId.result.forEach((r) => console.log(r.key, r.label, r.action));
console.log('removed:', byId.removed);`, 'Plain JS: keyed list diff (runnable)')
    ],
    viz: {
      title: 'Reconciliation with and without keys',
      input: 'A B C | X A B C',
      inputLabel: 'Items before | items after (unique names, up to 7 each). Each row remembers what you typed in it',
      gen: function (input) {
        var parts = String(input).split('|');
        if (parts.length !== 2) throw new Error('Use the format: A B C | X A B C');
        var oldL = words(parts[0]), newL = words(parts[1]);
        if (!oldL.length || !newL.length || oldL.length > 7 || newL.length > 7) throw new Error('Each side needs 1 to 7 items');
        [oldL, newL].forEach(function (l) { if (l.some(function (x, i) { return l.indexOf(x) !== i; })) throw new Error('Names must be unique inside each list'); });
        var f = [];
        f.push({ narr: 'The list changes from <b>' + oldL.join(' ') + '</b> to <b>' + newL.join(' ') + '</b>. Pretend each row has a text box where you typed the row\'s own name, so every row has hidden <b>state</b> = its original name. Watch whether the state stays with the right row.', parts: [
          { type: 'array', label: 'Before (state inside each row = its name)', values: oldL, showIdx: true },
          { type: 'array', label: 'After (what we render now)', values: newL, showIdx: true }
        ] });
        // WITHOUT KEYS (index)
        var n = Math.max(oldL.length, newL.length), rowsA = [], hlA = {}, reusedA = 0, createdA = 0, removedA = 0, wrongA = 0;
        for (var i = 0; i < n; i++) {
          if (i < oldL.length && i < newL.length) {
            reusedA++;
            var same = oldL[i] === newL[i];
            if (!same) wrongA++;
            rowsA.push([i, newL[i], 'reuse instance #' + i, 'shows ' + newL[i] + ' / box says "' + oldL[i] + '"', same ? 'OK' : 'WRONG STATE']);
            hlA[i] = same ? 'ok' : 'bad';
          } else if (i >= oldL.length) {
            createdA++; rowsA.push([i, newL[i], 'create new', 'shows ' + newL[i] + ' / box says "' + newL[i] + '"', 'OK']); hlA[i] = 'ok';
          } else {
            removedA++; rowsA.push([i, '(none)', 'remove instance #' + i, 'gone', 'lost "' + oldL[i] + '"']); hlA[i] = 'done';
          }
        }
        f.push({ narr: '<b>Without keys</b> (or <code>key={index}</code>), React matches by <b>position</b>: new row 0 = old row 0, and so on. It cannot tell that items moved, so it just changes the text and keeps the old hidden state.', parts: [
          { type: 'table', label: 'Index keys: position by position', columns: ['pos (key)', 'new label', 'React does', 'Result', 'Verdict'], rows: rowsA, hl: hlA }
        ] });
        f.push({ narr: 'Index-key summary: <b>' + reusedA + '</b> reused, <b>' + createdA + '</b> created, <b>' + removedA + '</b> removed, and <span class="c-r"><b>' + wrongA + '</b> rows now show one name but hold another row\'s state</span>.' + (wrongA === 0 ? ' (This particular change was harmless because nothing shifted. Try inserting at the front.)' : ' This is the "typed text jumps to the wrong row" bug.'), parts: [
          { type: 'array', label: 'Rows after the update: label shown', values: newL, hl: (function () { var o = {}; newL.forEach(function (x, j) { o[j] = j < oldL.length && oldL[j] !== x ? 'bad' : 'ok'; }); return o; })() },
          { type: 'array', label: 'Hidden state in those rows', values: newL.map(function (x, j) { return j < oldL.length ? oldL[j] : x; }), hl: (function () { var o = {}; newL.forEach(function (x, j) { o[j] = j < oldL.length && oldL[j] !== x ? 'bad' : 'ok'; }); return o; })() }
        ] });
        // WITH KEYS
        var rowsB = [], hlB = {}, reusedB = 0, createdB = 0, movedB = 0;
        newL.forEach(function (x, j) {
          var from = oldL.indexOf(x);
          if (from >= 0) {
            reusedB++; if (from !== j) movedB++;
            rowsB.push([x, 'reuse' + (from !== j ? ' (moved ' + from + ' → ' + j + ')' : ''), 'shows ' + x + ' / box says "' + x + '"', 'OK']); hlB[j] = 'ok';
          } else { createdB++; rowsB.push([x, 'create new', 'shows ' + x + ' / box says "' + x + '"', 'OK']); hlB[j] = 'sel'; }
        });
        var removedB = oldL.filter(function (x) { return newL.indexOf(x) < 0; });
        removedB.forEach(function (x) { rowsB.push([x, 'remove (key gone)', 'unmounted', 'state dropped']); });
        f.push({ narr: '<b>With real keys</b>, React matches by <b>identity</b>: "is there an old child with key X?". Found → reuse it (and move its DOM node if needed). Not found → create. Old key missing → remove.', parts: [
          { type: 'table', label: 'key = item name', columns: ['key', 'React does', 'Result', 'Verdict'], rows: rowsB, hl: hlB }
        ] });
        f.push({ narr: 'Keyed summary: <b>' + reusedB + '</b> reused (<b>' + movedB + '</b> just moved), <b>' + createdB + '</b> created, <b>' + removedB.length + '</b> removed, and <span class="c-g"><b>0</b> wrong states</span>. Only genuinely new items cost anything.', parts: [
          { type: 'array', label: 'Rows after the update: label shown', values: newL, hl: (function () { var o = {}; newL.forEach(function (x, j) { o[j] = oldL.indexOf(x) >= 0 ? 'ok' : 'sel'; }); return o; })() },
          { type: 'array', label: 'Hidden state in those rows', values: newL.slice(), hl: (function () { var o = {}; newL.forEach(function (x, j) { o[j] = oldL.indexOf(x) >= 0 ? 'ok' : 'sel'; }); return o; })() },
          { type: 'text', html: 'Green = reused with its own state. Purple = brand-new row. Compare with the red mismatches in the index-key version.' }
        ] });
        return f;
      }
    },
    examples: [
      {
        title: 'Adding an item at the top: index keys vs id keys',
        html: `<p>List <code>[A, B, C]</code>, you typed "hi" in A's box, then you insert X at the front. With <code>key={index}</code>: instance 0 (box "hi") now shows X, instance 1 shows A, instance 2 shows B, and a brand-new instance 3 shows C. Every row got new props and the "hi" stuck to X. With <code>key={id}</code>: a new instance for X, and A/B/C keep their own boxes. Same data, very different behaviour.</p>`
      },
      {
        title: 'Key on the right element, and keys on fragments',
        html: `<p>The key goes on the element <b>returned directly from map</b>. If you return a Fragment, use the long form <code>&lt;Fragment key={id}&gt;</code> because the short <code>&lt;&gt;</code> cannot take a key.</p>`,
        code: jsx(`import { Fragment } from 'react';

function Glossary({ items }) {
  return (
    <dl>
      {items.map((it) => (
        <Fragment key={it.id}>          {/* key here, on the outermost element */}
          <dt>{it.term}</dt>
          <dd>{it.meaning}</dd>
        </Fragment>
      ))}
    </dl>
  );
}`, 'Key on a Fragment')
      },
      {
        title: 'Key to reset a component on purpose',
        html: `<p>A <code>ContactForm</code> keeps typed text in state. When you pick a different contact, you want the form to start empty. Give it <code>key={contact.id}</code>. React treats a different key as a different component: the old one is unmounted (state gone) and a new one mounts.</p>`,
        code: jsx(`function Contacts({ selected }) {
  // When selected.id changes, ContactForm is destroyed and rebuilt: fresh state.
  return <ContactForm key={selected.id} contact={selected} />;
}`, 'key={id} resets state')
      },
      {
        title: 'Math.random() as a key is the worst of both worlds',
        html: `<p>A new random key every render means React can never match old and new rows. Every row is destroyed and re-created on every render: slow, the input you were typing in loses focus after each keystroke, CSS animations restart. If you need an id, create it when the item is <b>born</b> (when the user clicks Add), store it in state with the item, and reuse it forever.</p>`
      }
    ],
    deepDive: `<h5>🟣 The diffing algorithm in a paragraph</h5>
      <p>React compares children of the same parent only (it never searches the whole tree, which would be O(n³)). For an array of children it first walks both lists from the start while keys match. If a key differs it builds a map from key → old fiber for the remaining old children and looks each new child up. A hit reuses the fiber (and its DOM); a miss creates one; leftovers are deleted. A <b>moved</b> item is not recreated: React just reorders the DOM node (<code>insertBefore</code>). That is why keyed reorders are cheap and index-keyed reorders re-render every changed row.</p>
      <h5>🟣 Key + type = identity</h5>
      <p>Two children are "the same" only if both <b>key</b> and <b>type</b> match. So <code>&lt;Row key=1 /&gt;</code> replaced by <code>&lt;Other key=1 /&gt;</code> still unmounts the Row. And at a position with no key at all, position plays the key's role (an implicit index). That's why conditionally rendering things shifts identity.</p>
      <h5>🟣 When index keys are acceptable</h5>
      <p>A static list, never reordered/filtered, no stateful or uncontrolled children, and items that have no ids. Rendering a fixed month list or a 5-star rating is fine. Anything user-editable is not. When unsure, generate ids at creation.</p>
      <h5>🟣 Performance reality</h5>
      <p>Keys fix <b>correctness</b> and reduce DOM churn. They do not make rendering 10,000 rows fast: each row still renders. For long lists use <b>virtualization</b> (<code>react-window</code>, <code>@tanstack/react-virtual</code>), pagination or infinite scroll so only the visible rows exist. Memoise row components only when profiling says so.</p>
      <h5>🟣 Server data and ids</h5>
      <p>Use the database primary key. Do not use a field that can change (an editable title or email), because editing it would change the key and remount the row mid-typing. For items with no id, combine stable fields carefully or add an id on the client when the data arrives. Also remember duplicates: two items with the same key cause warnings and unpredictable duplicates or omissions.</p>`,
    aiEra: `<p><b>What AI changes:</b> Code assistants add <code>key={index}</code> by reflex to silence the warning. Tests rarely catch the bug because it only appears when a list is reordered while rows hold state.</p>
      <p><b>Use AI as a partner:</b> <code>Review every .map() in this file. For each, say what the key is, whether it is stable and unique, and whether the rows contain state or inputs.</code> Also useful: <code>Write a test that inserts an item at the top of this list and asserts typed text stays with the right row.</code></p>
      <p><b>Where AI goes wrong:</b> index keys on sortable tables, <code>key={Math.random()}</code>, keys derived from an editable field, forgetting the key when it returns a Fragment, and mapping inside JSX with the key on a child instead of the root element.</p>
      <p><b>What you must still own:</b> being able to explain, with the hotel analogy or a concrete example, why index keys break and what "identity" means for React.</p>`,
    problems: [{
      title: 'Todo List: Add, Toggle, Delete (with Correct Keys)',
      level: 'Medium', tags: ['lists', 'keys', 'immutable updates', 'controlled input'], companies: ['Amazon', 'Adobe', 'Meesho'],
      statement: `<p>Build a <code>TodoApp</code>. A text box and an <b>Add</b> button add a todo (ignore empty or spaces-only text). Each todo shows a checkbox to mark it done (done items are crossed out), and a <b>Delete</b> button. When there are no todos, show "Nothing to do". Rows must use a correct, stable key so that toggling or deleting never mixes up rows.</p>`,
      constraints: `Use <code>useState</code> for the list and for the input text. Never mutate state (no <code>push</code>, <code>splice</code>, or <code>todo.done = ...</code>). Ids must be created when the todo is added. Up to ~500 todos.`,
      example: `${H.table(['Action', 'List after'], [['Add "Buy milk"', '[Buy milk]'], ['Add "Call mum"', '[Buy milk, Call mum]'], ['Toggle "Buy milk"', '[<s>Buy milk</s>, Call mum]'], ['Delete "Buy milk"', '[Call mum]'], ['Delete "Call mum"', '"Nothing to do"']])}
        <p>${H.c('g', 'Why')}: every change creates a <b>new array</b> (<code>[...list, t]</code>, <code>filter</code>, <code>map</code>), and the row identity is its id, not its position.</p>`,
      brute: { why: `<p>Use the array index as key and mutate the array in place (<code>list.push</code>, <code>list.splice</code>). Mutating the same array reference means React may not even re-render, and index keys mix up checkbox states after a delete. Both mistakes come from not giving each item an identity.</p>`, code: jsx(`function BadTodos() {
  const [list, setList] = useState([]);
  const add = (text) => { list.push({ text, done: false }); setList(list); }; // same array: no re-render!
  return (
    <ul>
      {list.map((t, i) => (
        <li key={i}>                                                    {/* index key: wrong after delete */}
          <input type="checkbox" /> {t.text}
          <button onClick={() => { list.splice(i, 1); setList(list); }}>Delete</button>
        </li>
      ))}
    </ul>
  );
}`, 'Mutation + index keys') },
      mcq: { q: 'A todo list uses <code>key={index}</code> and each row has an uncontrolled checkbox. You tick row 2 of [A, B, C] and then delete row 1 (A). What does the user see?', options: ['B is ticked, as expected', 'C appears ticked: the tick stayed at position 1, which is now C', 'Nothing is ticked', 'React throws an error'], answer: 1, explain: 'After the delete, B moves to position 0 and C to position 1. The checkbox DOM that was at position 1 is reused for C, so the tick (hidden state) now sits on C. Real keys (ids) keep the tick with B.' },
      hints: [
        `<p>Hint 1: What identifies one todo no matter where it sits in the array? Create that when the todo is added.</p>`,
        `<p>Hint 2: Every update returns a <b>new</b> array: add with spread, delete with <code>filter</code>, toggle with <code>map</code> (copying only the changed item).</p>`,
        `<p>Hint 3: Recipe: state <code>todos</code> and <code>text</code>; <code>add()</code> trims the text, returns early if empty, appends <code>{ id: nextId, text, done: false }</code>; render an empty message or a <code>&lt;ul&gt;</code> mapping with <code>key={t.id}</code>; the input is controlled with <code>value</code> and <code>onChange</code>.</p>`
      ],
      solution: {
        approach: `<p>Keep <code>todos</code> as an array of objects with an <b>id</b> generated when the item is created. All three actions are pure functions from the old list to a new list, passed to the setter as updaters. Rendering maps to <code>&lt;li key={t.id}&gt;</code>. The input is controlled so we can clear it after adding. The runnable tab proves the three list functions never mutate their input.</p>`,
        code: jsx(`import { useState } from 'react';

let nextId = 1;                           // simple id source (use crypto.randomUUID() in real apps)

export default function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');

  function add(e) {
    e.preventDefault();                   // do not reload the page
    const clean = text.trim();
    if (!clean) return;                   // ignore empty / spaces-only
    setTodos((list) => [...list, { id: nextId++, text: clean, done: false }]); // new array
    setText('');                          // clear the controlled input
  }
  const toggle = (id) =>
    setTodos((list) => list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id) =>
    setTodos((list) => list.filter((t) => t.id !== id));

  return (
    <div>
      <form onSubmit={add}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="What needs doing?" />
        <button type="submit">Add</button>
      </form>
      {todos.length === 0 ? (
        <p>Nothing to do</p>
      ) : (
        <ul>
          {todos.map((t) => (
            <li key={t.id}>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
              <span style={{ textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
              <button onClick={() => remove(t.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}`, 'Solution'),
        alt: [jsrun(`// The three list updates as pure functions: they never change their input.
let nextId = 1;
const add = (list, text) => (text.trim() ? [...list, { id: nextId++, text: text.trim(), done: false }] : list);
const toggle = (list, id) => list.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
const remove = (list, id) => list.filter((t) => t.id !== id);
const show = (list) => (list.length ? list.map((t) => (t.done ? '[x] ' : '[ ] ') + t.text).join(' | ') : 'Nothing to do');

let a = [];
let b = add(a, 'Buy milk');        console.log(show(b));
let c = add(b, 'Call mum');        console.log(show(c));
c = add(c, '   ');                 console.log('empty ignored:', show(c));
let d = toggle(c, 1);              console.log(show(d));
let e = remove(d, 1);              console.log(show(e));
let g = remove(e, 2);              console.log(show(g));
console.log('originals untouched:', a.length === 0, b.length === 1, c.length === 2, c[0].done === false);`, 'Plain JS model (runnable)')],
        complexity: `<p>Add O(n) (copy), toggle O(n), delete O(n); rendering O(n) with keys letting React update only changed rows. Fine for hundreds of items; virtualise beyond a few thousand.</p>`,
        followUps: ['Add an "Active / Completed / All" filter without storing the filtered list in state.', 'How would the keys change if ids came from a database?']
      }
    }]
  });

  /* ======================= TOPIC 6: CONDITIONAL RENDERING ======================= */
  topics.push({
    title: 'Conditional Rendering: Showing the Right Thing',
    analogy: `<p>A shop door has a sign: <b>"Open"</b>, <b>"Closed"</b> or <b>"Back in 10 minutes"</b>. The shopkeeper does not repaint the door; they just <b>hang the right sign</b> depending on the situation. Conditional rendering is choosing which sign (which JSX) to hang.</p>
      <p>The tricky part is the sign that says <b>"0"</b> when you wanted it to say nothing. We will meet that trap in a moment.</p>`,
    explain: `<p>JSX is just JavaScript, so you use normal JavaScript to choose what to return. There is no special <code>v-if</code> or <code>*ngIf</code>. Four tools cover almost everything:</p>
      ${H.table(['Tool', 'Use it when', 'Example'], [
        ['<code>if</code> / early <code>return</code>', 'whole component changes (loading, error, empty)', '<code>if (loading) return &lt;Spinner /&gt;;</code>'],
        ['Ternary <code>a ? b : c</code>', 'one of two things, inline', '<code>{user ? &lt;Menu /&gt; : &lt;LoginBtn /&gt;}</code>'],
        ['<code>a &amp;&amp; b</code>', 'show something or nothing', '<code>{unread &gt; 0 &amp;&amp; &lt;Badge n={unread} /&gt;}</code>'],
        ['Lookup object / <code>switch</code>', 'many states', '<code>const views = { idle: ..., error: ... }; return views[status];</code>']
      ])}
      <h5>🟢 What renders as "nothing"?</h5>
      <p><code>null</code>, <code>undefined</code>, <code>true</code> and <code>false</code> render <b>nothing</b>. That is why <code>{false &amp;&amp; &lt;X /&gt;}</code> is safe. A component can <code>return null</code> to show nothing at all.</p>
      <h5>🟢 The "0 &amp;&amp;" trap</h5>
      <p><code>&amp;&amp;</code> returns its <i>left</i> side if it is falsy. For <code>count &amp;&amp; &lt;Badge /&gt;</code> and <code>count = 0</code>, the result is the number <code>0</code>, and React <b>prints "0"</b> on the screen (numbers are valid output). Fix: make the left side a real boolean: <code>count &gt; 0 &amp;&amp; &lt;Badge /&gt;</code>, or use a ternary with <code>null</code>.</p>
      <h5>🔵 The four screens of any data panel</h5>
      <p>Anything that loads data has at least four views: <b>loading</b>, <b>error</b>, <b>empty</b>, <b>data</b>. Good UIs design all four. A neat way to avoid impossible combinations (like loading AND error at once) is a single <code>status</code> string (<code>"loading" | "error" | "success"</code>) instead of three booleans. Then handle the cases top to bottom with early returns, as in the visualiser.</p>
      <h5>🔵 Not rendering vs hiding</h5>
      <ul>
        <li><b>Not rendering</b> (<code>cond &amp;&amp; &lt;Panel /&gt;</code>): the component is <b>unmounted</b>. Its state, DOM and effects are destroyed. Showing it again starts from scratch.</li>
        <li><b>Hiding with CSS</b> (<code>style={{ display: "none" }}</code> or <code>hidden</code>): it stays mounted. State is kept, but it still costs memory and still runs effects.</li>
      </ul>
      <p>Choose by asking "should the user's half-typed form survive being hidden?".</p>
      <h5>🔵 Avoid deep nesting</h5>
      <p>Nested ternaries (<code>a ? b : c ? d : e</code>) are hard to read. Prefer early returns, or move each branch into a small named component or a variable above the <code>return</code>.</p>`,
    clues: [
      '"Show a spinner while loading, an error if it fails, a message if empty" → status handling with early returns',
      '"A stray <b>0</b> appears on the page" → <code>count &amp;&amp; &lt;X /&gt;</code> with count = 0',
      '"Toggle a panel but keep what the user typed" → hide with CSS / keep mounted, or lift state',
      '"Show different UI for admin vs user" → ternary or small components per role',
      '"State resets when I switch between two views" → different component type or position, so it remounts',
      '"Hydration mismatch" → a condition that differs between server and client (e.g. <code>window.innerWidth</code>)'
    ],
    code: [
      jsx(`function UserList({ status, users, error, onRetry }) {
  // Early returns: read it top to bottom like a checklist.
  if (status === 'loading') return <p>Loading...</p>;
  if (status === 'error') {
    return (
      <div role="alert">
        <p>Something went wrong: {error}</p>
        <button onClick={onRetry}>Try again</button>
      </div>
    );
  }
  if (users.length === 0) return <p>No users yet. Invite someone!</p>;   // empty state

  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>
          {u.name} {u.isAdmin && <b>(admin)</b>}   {/* && is safe: isAdmin is a boolean */}
        </li>
      ))}
    </ul>
  );
}

function Inbox({ unread }) {
  // BAD:  {unread && <Badge />}  prints "0" when unread is 0
  // GOOD: compare to make a real boolean
  return <h2>Inbox {unread > 0 && <span className="badge">{unread}</span>}</h2>;
}`, 'React: status panel and safe &&'),
      jsrun(`// Conditional rendering as a plain function: state in, text out.
function userList({ status, users = [], error = '' }) {
  if (status === 'loading') return 'Loading...';
  if (status === 'error') return 'Error: ' + error + ' [Try again]';
  if (users.length === 0) return 'No users yet. Invite someone!';
  return users.map((u) => '- ' + u.name + (u.isAdmin ? ' (admin)' : '')).join('\\n');
}
console.log(userList({ status: 'loading' }));
console.log(userList({ status: 'error', error: 'Network down' }));
console.log(userList({ status: 'success', users: [] }));
console.log(userList({ status: 'success', users: [{ name: 'Asha', isAdmin: true }, { name: 'Ben' }] }));

// The "0 &&" trap: && returns its LEFT side when that is falsy.
// React prints numbers, so a 0 would appear on the page. Everything else falsy prints nothing.
const prints = (v) => (v === null || v === undefined || typeof v === 'boolean' ? '(nothing)' : '"' + v + '"');
const count = 0;
console.log('count && <Badge/>     ->', prints(count && 'BADGE'));
console.log('count > 0 && <Badge/> ->', prints(count > 0 && 'BADGE'));
console.log('"" && <Badge/>        ->', prints('' && 'BADGE'), '(empty string prints as empty text)');
console.log('NaN && <Badge/>       ->', prints(NaN && 'BADGE'), '(NaN also prints!)');`, 'Plain JS: the early-return chain and the 0 trap (runnable)')
    ],
    viz: [
      {
        title: 'Early returns: which branch wins?',
        input: 'data',
        inputLabel: 'Status: loading, error, empty or data',
        gen: function (input) {
          var s = String(input).trim().toLowerCase();
          if (['loading', 'error', 'empty', 'data'].indexOf(s) < 0) throw new Error('Type one of: loading, error, empty, data');
          var src = 'function Users({ status, users, error }) {\n  if (status === "loading") return <Spinner />;\n  if (status === "error") return <p>{error}</p>;\n  if (users.length === 0) return <p>No users yet</p>;\n  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;\n}';
          var ui = { loading: 'a spinner', error: 'the error message', empty: '"No users yet"', data: 'the list of users' }[s];
          var checks = [['status === "loading"', s === 'loading'], ['status === "error"', s === 'error'], ['users.length === 0', s === 'empty']];
          var f = [];
          var vals = { status: '"' + (s === 'empty' || s === 'data' ? 'success' : s) + '"', 'users.length': s === 'data' ? 3 : 0 };
          f.push({ narr: 'The component receives <b>' + (s === 'empty' || s === 'data' ? 'status "success"' : 'status "' + s + '"') + '</b>' + (s === 'data' ? ' and 3 users' : s === 'empty' ? ' and an empty users array' : '') + '. React runs the function from the top. The first <code>return</code> that executes wins; the rest is never reached.', parts: [
            { type: 'code', label: 'Component', lang: 'jsx', code: src, hl: { 1: 'cur' } },
            { type: 'vars', label: 'What it received', vals: vals }
          ] });
          var shown = [], won = false;
          for (var i = 0; i < 3 && !won; i++) {
            var yes = checks[i][1];
            shown.push([checks[i][0], yes ? 'true → return' : 'false → keep going']);
            var hl = {}; hl[i + 2] = yes ? 'ok' : 'bad';
            f.push({ narr: 'Line ' + (i + 2) + ': is <code>' + checks[i][0] + '</code>? <b>' + (yes ? 'Yes' : 'No') + '</b>. ' + (yes ? 'So we <b>return right here</b> and nothing below runs.' : 'Skip to the next check.'), parts: [
              { type: 'code', label: 'Component', lang: 'jsx', code: src, hl: hl },
              { type: 'table', label: 'Checks so far', columns: ['Condition', 'Result'], rows: shown.slice(), hl: (function () { var o = {}; o[shown.length - 1] = yes ? 'ok' : 'bad'; return o; })() }
            ] });
            if (yes) won = true;
          }
          if (won) {
            var winLine = shown.length + 1, dead = {};
            for (var dl = winLine + 1; dl <= 5; dl++) dead[dl] = 'done';
            dead[winLine] = 'ok';
            if (winLine < 5) f.push({ narr: 'Everything <b>below line ' + winLine + '</b> is skipped: those checks never run, and the happy-path list is never built. Early returns keep each case short and flat.', parts: [
              { type: 'code', label: 'Component (faded = never reached)', lang: 'jsx', code: src, hl: dead }
            ] });
          }
          if (!won) {
            f.push({ narr: 'Every guard failed, so we reach the last line: the <b>happy path</b>. Putting the "bad" cases first keeps the main UI un-nested and easy to read.', parts: [
              { type: 'code', label: 'Component', lang: 'jsx', code: src, hl: { 5: 'ok' } },
              { type: 'table', label: 'Checks so far', columns: ['Condition', 'Result'], rows: shown.slice() }
            ] });
          }
          f.push({ narr: 'The user sees <b>' + ui + '</b>. Four states, one clear chain. Switch the input to see the other three.', parts: [
            { type: 'table', label: 'Screen for each status', columns: ['status', 'what the user sees'], rows: [['loading', 'a spinner'], ['error', 'the error message + retry'], ['empty (success, 0 users)', 'No users yet'], ['data (success, ≥1 users)', 'the list']], hl: (function () { var o = {}; o[{ loading: 0, error: 1, empty: 2, data: 3 }[s]] = 'sel'; return o; })() }
          ] });
          return f;
        }
      },
      {
        title: 'The "0 &&" trap',
        input: '0',
        inputLabel: 'Unread count (a number, e.g. 0, 3, 12)',
        gen: function (input) {
          var c = Number(String(input).trim());
          if (String(input).trim() === '' || isNaN(c) || Math.abs(c) > 999) throw new Error('Type a number such as 0, 3 or 12');
          function disp(v) { return v === null || v === undefined || typeof v === 'boolean' ? '(nothing)' : '"' + v + '"'; }
          var a = c && 'BADGE', b = c > 0 && 'BADGE', t = c > 0 ? 'BADGE' : null;
          var f = [];
          f.push({ narr: 'Unread count is <b>' + c + '</b>. We want a badge only when there is something unread. Three ways to write it:', parts: [
            { type: 'vars', label: 'Props', vals: { count: c } },
            { type: 'table', label: 'Three versions', columns: ['JSX', 'JavaScript value of the expression'], rows: [['{count && &lt;Badge /&gt;}', '?'], ['{count &gt; 0 && &lt;Badge /&gt;}', '?'], ['{count &gt; 0 ? &lt;Badge /&gt; : null}', '?']] }
          ] });
          f.push({ narr: 'Version 1: <code>count &amp;&amp; ...</code>. When the left side is falsy, <code>&amp;&amp;</code> returns the <b>left side itself</b>. ' + (c === 0 || isNaN(c) ? 'Here that is <b>0</b>.' : 'Here <code>' + c + '</code> is truthy, so we get the Badge.'), parts: [
            { type: 'vars', label: 'Evaluate', vals: { 'count && Badge': a === 'BADGE' ? 'Badge' : String(a) }, hl: { 'count && Badge': a === 'BADGE' ? 'ok' : 'bad' } }
          ] });
          f.push({ narr: 'React renders numbers as text. So a result of <code>0</code> is <span class="c-r">printed on the page as "0"</span>, while <code>false</code>, <code>null</code> and <code>undefined</code> print nothing. Version 1 on screen: <b>' + (a === 'BADGE' ? 'Badge' : disp(a)) + '</b>.', parts: [
            { type: 'table', label: 'What lands on screen', columns: ['Value', 'React shows'], rows: [['0', '"0" (visible!)'], ['false', '(nothing)'], ['null / undefined', '(nothing)'], ['""', '(empty text)'], ['NaN', '"NaN" (visible!)']], hl: (c === 0 ? { 0: 'bad' } : {}) }
          ] });
          f.push({ narr: 'Version 2: <code>count &gt; 0 &amp;&amp; ...</code>. The comparison is always <code>true</code> or <code>false</code>, never a number. Result: <b>' + (b === 'BADGE' ? 'Badge' : disp(b)) + '</b>. Safe.', parts: [
            { type: 'vars', label: 'Evaluate', vals: { 'count > 0': c > 0, 'count > 0 && Badge': b === 'BADGE' ? 'Badge' : String(b) }, hl: { 'count > 0': 'ok' } }
          ] });
          f.push({ narr: 'Version 3: ternary with <code>null</code>. Also safe, and it reads clearly when you may add an "else" later. Result: <b>' + (t === 'BADGE' ? 'Badge' : disp(t)) + '</b>.', parts: [
            { type: 'table', label: 'Summary for count = ' + c, columns: ['Version', 'JS value', 'On screen'], rows: [['count && Badge', a === 'BADGE' ? 'Badge' : String(a), a === 'BADGE' ? 'Badge' : disp(a)], ['count > 0 && Badge', b === 'BADGE' ? 'Badge' : String(b), b === 'BADGE' ? 'Badge' : disp(b)], ['count > 0 ? Badge : null', t === 'BADGE' ? 'Badge' : 'null', t === 'BADGE' ? 'Badge' : '(nothing)']], hl: (function () { var o = {}; if (c === 0) o[0] = 'bad'; return o; })() }
          ] });
          return f;
        }
      }
    ],
    examples: [
      {
        title: 'Lookup object instead of a chain of ternaries',
        html: `<p>With many states, an object maps each to the right JSX. It is easy to read, easy to extend, and a missing state is obvious (<code>undefined</code>).</p>`,
        code: jsx(`function StatusBadge({ status }) {
  const views = {
    pending: <span className="badge gray">Pending</span>,
    paid: <span className="badge green">Paid</span>,
    failed: <span className="badge red">Failed</span>
  };
  return views[status] ?? <span className="badge">Unknown</span>;   // fallback for unexpected values
}`, 'Lookup instead of nested ternaries')
      },
      {
        title: 'Unmounting loses state; hiding keeps it',
        html: `<p>A tab panel with a half-typed form: <code>{tab === "a" &amp;&amp; &lt;FormA /&gt;}</code> unmounts it when you switch tabs, so the text disappears. If users hate that, render all panels and hide the inactive with <code>hidden</code>, or lift the form's state to the parent so it survives.</p>`
      },
      {
        title: 'Same position, same type = state kept (surprise!)',
        html: `<p><code>{isMe ? &lt;Chat to="Me" /&gt; : &lt;Chat to="Ben" /&gt;}</code> has the <b>same component type at the same position</b>, so React keeps the instance and its typed message while only props change. If you want a fresh chat per person, add <code>key</code>: <code>&lt;Chat key={to} to={to} /&gt;</code>. And the reverse: <code>{x ? &lt;A /&gt; : &lt;B /&gt;}</code> with different types always remounts.</p>`
      },
      {
        title: 'Return null to render nothing',
        html: `<p>A component such as <code>Toast</code> can start with <code>if (!message) return null;</code>. It stays in the tree (so it can have hooks) but draws nothing. That is neater than every caller writing <code>{message &amp;&amp; &lt;Toast message={message} /&gt;}</code>.</p>`
      }
    ],
    deepDive: `<h5>🟣 What exactly renders as nothing</h5>
      <p>React skips <code>null</code>, <code>undefined</code>, <code>true</code>, <code>false</code>. It renders strings and numbers as text nodes (empty string creates an empty text node; <code>0</code> and <code>NaN</code> print). Arrays are flattened. Objects (other than elements) throw "Objects are not valid as a React child". Because booleans render nothing, <code>{items.length &amp;&amp; ...}</code> is the notorious bug, while <code>{!!items.length &amp;&amp; ...}</code> and <code>{items.length &gt; 0 &amp;&amp; ...}</code> are fine. Remember <code>&amp;&amp;</code> is not "if", it is "left value if falsy, else right value".</p>
      <h5>🟣 Conditional rendering and identity</h5>
      <p>React's reconciliation uses <b>type + position (+ key)</b>. A branch that changes the type at a position remounts (state lost, effects cleaned up, DOM rebuilt). A branch that keeps the same type keeps state. Note how <code>{cond &amp;&amp; &lt;A /&gt;}</code> leaves a <code>false</code> placeholder in that slot, so sibling positions do not shift, which is why toggling a conditional child does not reset its siblings' state.</p>
      <h5>🟣 Model status as a discriminated union</h5>
      <p>In TypeScript: <code>type State = { status: "loading" } | { status: "error"; error: string } | { status: "success"; users: User[] }</code>. Narrowing on <code>status</code> makes it impossible to read <code>users</code> while loading, and eliminates the "isLoading and error are both true" bug class. Libraries like TanStack Query return exactly this shape.</p>
      <h5>🟣 Built-in conditional boundaries</h5>
      <p><code>&lt;Suspense fallback=...&gt;</code> shows a fallback while children load, and an <b>error boundary</b> shows a fallback when a child throws. They move loading/error handling out of every component into declarative boundaries, a pattern you meet in the React internals module and in Next.js (<code>loading.js</code>, <code>error.js</code>).</p>
      <h5>🟣 UX and accessibility</h5>
      <p>Avoid layout shift: reserve space for content that appears later (skeletons). Announce changes to screen readers (<code>role="alert"</code> for errors, <code>aria-live="polite"</code> for status). Never rely on <code>window</code> or <code>localStorage</code> during render to decide what to show in server-rendered apps: the server and client output will differ and cause a hydration mismatch. Decide in an effect or with <code>useSyncExternalStore</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> Generated UIs often show only the happy path. Asking for the loading, error and empty states is a cheap prompt that makes the difference between a demo and a product.</p>
      <p><b>Use AI as a partner:</b> <code>List every state this component can be in (loading, error, empty, partial, offline, permission denied) and write the JSX for each. Do not skip any.</code> Then check that you can reach each one with a test or Storybook story.</p>
      <p><b>Where AI goes wrong:</b> <code>{list.length &amp;&amp; &lt;List /&gt;}</code> (the stray 0), three separate booleans (<code>isLoading</code>, <code>isError</code>, <code>isEmpty</code>) that can contradict each other, nested ternaries four deep, and hiding sensitive UI with CSS only (the content is still in the DOM; real authorization is on the server).</p>
      <p><b>What you must still own:</b> a complete state model for every async view, the identity rules (when state resets), and reading generated JSX for falsy-value traps.</p>`,
    problems: [{
      title: 'Data Panel with Loading, Error, Empty and Data States',
      level: 'Medium', tags: ['conditional rendering', 'status', 'early return'], companies: ['Google', 'Flipkart'],
      statement: `<p>Write <code>OrdersPanel({ status, orders, error, onRetry })</code>. <code>status</code> is <code>"loading"</code>, <code>"error"</code> or <code>"success"</code>. Loading shows "Loading orders...". Error shows the message and a <b>Retry</b> button that calls <code>onRetry</code>. Success with no orders shows "No orders yet". Success with orders shows a list with each order's id and total, and a "Free shipping" label only when the total is at least 500. Make sure a total of 0 never prints a stray "0".</p>`,
      constraints: `One component, no extra state. Use a single <code>status</code> value, not three booleans. Orders have <code>id</code> (unique) and <code>total</code> (number ≥ 0).`,
      example: `${H.table(['status', 'orders', 'Screen'], [['loading', '-', 'Loading orders...'], ['error', '-', 'Failed: timeout [Retry]'], ['success', '[]', 'No orders yet'], ['success', '[{id:1,total:700},{id:2,total:0}]', '#1 - 700 Free shipping<br>#2 - 0']])}
        <p>${H.c('g', 'Why')}: guards run top to bottom, and the label uses <code>total &gt;= 500 &amp;&amp; ...</code>, a real boolean, so no stray "0".</p>`,
      brute: { why: `<p>Three booleans (<code>isLoading</code>, <code>isError</code>, <code>isEmpty</code>) and nested ternaries. They can contradict each other (loading and error both true), the JSX is a pyramid, and <code>{orders.length &amp;&amp; ...}</code> prints "0" for an empty list.</p>`, code: jsx(`function BadPanel({ isLoading, isError, orders, error }) {
  return (
    <div>
      {isLoading ? <p>Loading orders...</p> : isError ? <p>{error}</p> : (
        <div>
          {orders.length && orders.map((o) => <p key={o.id}>#{o.id} - {o.total}</p>)}  {/* prints 0! */}
        </div>
      )}
    </div>
  );
}`, 'Booleans + nested ternary') },
      mcq: { q: 'For <code>{orders.length &amp;&amp; &lt;OrderList /&gt;}</code> with an empty array, what does the page show?', options: ['Nothing', 'The text "0"', 'The text "false"', 'An error'], answer: 1, explain: '0 && X evaluates to 0 (the left side is returned when falsy). React renders numbers, so you see 0. Use orders.length > 0 && ... instead.' },
      hints: [
        `<p>Hint 1: These are mutually exclusive situations. How many separate values do you really need to describe them?</p>`,
        `<p>Hint 2: Handle "bad" cases first with early <code>return</code>s: loading, then error, then empty. The last return is the happy path.</p>`,
        `<p>Hint 3: Recipe: three <code>if</code> guards, then <code>return &lt;ul&gt;</code> mapping with <code>key={o.id}</code>. Inside, show the label with <code>o.total &gt;= 500 &amp;&amp; &lt;b&gt;Free shipping&lt;/b&gt;</code> (a boolean on the left).</p>`
      ],
      solution: {
        approach: `<p>One <code>status</code> string makes impossible combinations unrepresentable. Early returns flatten the code. The empty case is checked <i>before</i> mapping so we never rely on <code>length &amp;&amp;</code>. The free-shipping label compares first, so its left side is always a boolean.</p>`,
        code: jsx(`export default function OrdersPanel({ status, orders = [], error, onRetry }) {
  if (status === 'loading') return <p>Loading orders...</p>;

  if (status === 'error') {
    return (
      <div role="alert">
        <p>Failed: {error}</p>
        <button onClick={onRetry}>Retry</button>
      </div>
    );
  }

  if (orders.length === 0) return <p>No orders yet</p>;

  return (
    <ul>
      {orders.map((o) => (
        <li key={o.id}>
          #{o.id} - {o.total} {o.total >= 500 && <b>Free shipping</b>}
        </li>
      ))}
    </ul>
  );
}`, 'Solution'),
        alt: [jsrun(`// Plain JS model of the same decision chain, with tests for each state.
function ordersPanel({ status, orders = [], error = '' }) {
  if (status === 'loading') return 'Loading orders...';
  if (status === 'error') return 'Failed: ' + error + ' [Retry]';
  if (orders.length === 0) return 'No orders yet';
  return orders.map((o) => '#' + o.id + ' - ' + o.total + (o.total >= 500 ? ' Free shipping' : '')).join('\\n');
}
console.log(ordersPanel({ status: 'loading' }));
console.log(ordersPanel({ status: 'error', error: 'timeout' }));
console.log(ordersPanel({ status: 'success', orders: [] }));
console.log(ordersPanel({ status: 'success', orders: [{ id: 1, total: 700 }, { id: 2, total: 0 }] }));`, 'Plain JS model (runnable)')],
        complexity: `<p>O(n) to render n orders; the guards are O(1). The status approach removes an entire class of impossible-state bugs.</p>`,
        followUps: ['Add a skeleton loader that reserves the list height to avoid layout shift.', 'How would you model "refreshing while showing old data"?']
      }
    }]
  });

  /* ======================= TOPIC 7: CONTROLLED FORMS ======================= */
  topics.push({
    title: 'Controlled Forms & Inputs',
    analogy: `<p>A <b>controlled</b> input is a puppet: it never decides what to say. Every time you press a key, it reports to the puppeteer (React state), and the puppeteer tells the puppet exactly what to show. The puppeteer is always in charge, so React always <i>knows</i> what is in the box.</p>
      <p>An <b>uncontrolled</b> input is a free actor. It remembers its own lines, and you only ask "what did you say?" at the end (using a ref or <code>FormData</code>).</p>`,
    explain: `<p>In plain HTML an <code>&lt;input&gt;</code> keeps its own value inside the browser. In React you usually make <b>state the single source of truth</b> and the input just displays it:</p>
      ${H.table(['Part', 'Code'], [
        ['Display the state', '<code>value={email}</code>'],
        ['Update on every keystroke', '<code>onChange={e =&gt; setEmail(e.target.value)}</code>'],
        ['Checkbox', '<code>checked={agree}</code> and <code>setAgree(e.target.checked)</code>'],
        ['Select / textarea', '<code>value={role}</code> works on both (in React, textarea uses value, not children)'],
        ['Submit', '<code>&lt;form onSubmit={handleSubmit}&gt;</code> and call <code>e.preventDefault()</code>']
      ])}
      <h5>🟢 The loop</h5>
      <p>Type "a" → browser fires a change event → <code>onChange</code> runs → <code>setEmail("a")</code> → React re-renders → the input is given <code>value="a"</code>. If you did <b>not</b> call the setter, React would put the old value back and the input would feel <b>frozen</b>. (<code>value</code> without <code>onChange</code> makes a read-only field and React warns you.)</p>
      <h5>🟢 One handler for many fields</h5>
      <p>Keep a single <code>values</code> object and use the input's <code>name</code>: <code>setValues(v =&gt; ({ ...v, [e.target.name]: e.target.value }))</code>. The square brackets make a dynamic key.</p>
      <h5>🔵 Validation: derive, do not store</h5>
      <p>Errors are a <b>function of the current values</b>, so compute them during render: <code>const errors = validate(values)</code>. No extra state, no effect, nothing to keep in sync. You only need a tiny bit of state for <i>when</i> to show them (<code>touched</code> per field, or <code>submitted</code>), so users do not see "Required" before they have typed a thing.</p>
      ${H.table(['When to show errors', 'Feels like'], [['on every keystroke', 'aggressive, shouts "invalid email" after the first letter'], ['on blur (leaving the field)', '<span class="c-g">usually best</span>'], ['on submit', 'safe default; then update live after the first failed submit']])}
      <h5>🔵 Submit handler checklist</h5>
      <ol>
        <li><code>e.preventDefault()</code> so the browser does not reload the page.</li>
        <li>Mark everything touched, compute errors, <b>stop</b> if any exist.</li>
        <li>Disable the button while sending to prevent double submit.</li>
        <li>Send values to the server (the server validates again; never trust the browser).</li>
      </ol>
      <h5>🔵 Controlled vs uncontrolled</h5>
      ${H.table(['', 'Controlled', 'Uncontrolled'], [['Value lives in', 'React state', 'the DOM'], ['Read it with', 'the state variable', 'ref or <code>new FormData(form)</code>'], ['Live validation / formatting', '<span class="c-g">easy</span>', 'harder'], ['Re-renders per keystroke', 'yes', 'no'], ['Good for', 'most forms, dependent fields', 'huge forms, file inputs, simple one-shot forms']])}`,
    clues: [
      '"Build a login / signup form with validation" → controlled inputs + derived errors + <code>onSubmit</code>',
      '"Warning: A component is changing an uncontrolled input to be controlled" → value went from <code>undefined</code> to a string',
      '"I can\'t type in my input" → <code>value</code> set but <code>onChange</code> missing (or setter not called)',
      '"Page reloads when I click submit" → missing <code>e.preventDefault()</code>',
      '"Controlled vs uncontrolled; when to use each" → state as truth vs DOM as truth',
      '"Disable the button until valid / while submitting" → derive <code>canSubmit</code> from values and status'
    ],
    code: [
      jsx(`import { useState } from 'react';

// Pure function: values in, errors out. Easy to test, no state needed for errors.
function validate({ email, password }) {
  const errors = {};
  if (!email) errors.email = 'Email is required';
  else if (!/^\\S+@\\S+\\.\\S+$/.test(email)) errors.email = 'Enter a valid email';
  if (password.length < 8) errors.password = 'Use at least 8 characters';
  return errors;
}

export default function LoginForm({ onLogin }) {
  const [values, setValues] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({});          // which fields the user has left
  const [submitting, setSubmitting] = useState(false);

  const errors = validate(values);                      // derived on every render
  const canSubmit = Object.keys(errors).length === 0 && !submitting;

  const handleChange = (e) =>
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));   // one handler, any field
  const handleBlur = (e) =>
    setTouched((t) => ({ ...t, [e.target.name]: true }));

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ email: true, password: true });        // reveal all errors
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    try { await onLogin(values); } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email"
        value={values.email} onChange={handleChange} onBlur={handleBlur}
        aria-invalid={touched.email && !!errors.email} />
      {touched.email && errors.email && <p role="alert">{errors.email}</p>}

      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password"
        value={values.password} onChange={handleChange} onBlur={handleBlur} />
      {touched.password && errors.password && <p role="alert">{errors.password}</p>}

      <button type="submit" disabled={!canSubmit}>{submitting ? 'Signing in...' : 'Log in'}</button>
    </form>
  );
}`, 'React: controlled login form with validation'),
      jsrun(`// The controlled-input loop and form validation as plain functions.
function validate({ email, password }) {
  const errors = {};
  if (!email) errors.email = 'Email is required';
  else if (!/^\\S+@\\S+\\.\\S+$/.test(email)) errors.email = 'Enter a valid email';
  if (password.length < 8) errors.password = 'Use at least 8 characters';
  return errors;
}

// A tiny "controlled input": the typed key becomes a change event, the handler sets state,
// and the DOM value is always overwritten with the state.
let state = { email: '', password: '' };
let dom = { email: '', password: '' };
function render() { dom = { ...state }; }                              // value={state} pushes state into the input
function typeKey(field, key) {
  const proposed = dom[field] + key;                                    // what the browser would show
  state = { ...state, [field]: proposed };                              // onChange: setValues(...)
  render();                                                             // re-render after the state update
}
function typeText(field, text) { for (const ch of text) typeKey(field, ch); }

typeText('email', 'asha@');
console.log('typed so far:', JSON.stringify(dom), '-> errors', JSON.stringify(validate(state)));
typeText('email', 'mail.com');
typeText('password', 'abc');
console.log('after email + short password ->', JSON.stringify(validate(state)));
typeText('password', 'defghij');
console.log('after longer password ->', JSON.stringify(validate(state)), 'canSubmit =', Object.keys(validate(state)).length === 0);

// Forgetting to set state: the input would be reset to the old value ("frozen input").
const frozen = { value: '' };
function brokenOnChange() { /* forgot setValue */ }
brokenOnChange();
console.log('frozen input still shows:', JSON.stringify(frozen.value));`, 'Plain JS: controlled loop + validation (runnable)')
    ],
    viz: {
      title: 'Controlled input: every keystroke goes through state',
      input: 'asha@x.com',
      inputLabel: 'Text the user types into the email field (1-12 characters, no spaces)',
      gen: function (input) {
        var text = String(input).trim();
        if (!text || text.length > 12 || /\s/.test(text)) throw new Error('Type 1 to 12 characters with no spaces, e.g. asha@x.com');
        function err(v) { if (!v) return 'Required'; if (v.indexOf('@') < 0) return 'Missing @'; if (!/@[^@]+\.[^@.]+$/.test(v)) return 'Add a domain like .com'; return ''; }
        var f = [];
        f.push({ narr: 'The form first renders with <code>email = ""</code>. The input shows whatever <code>value={email}</code> says: nothing yet. The error is <i>derived</i> from the state during render, it is not stored.', parts: [
          { type: 'vars', label: 'State and screen', vals: { 'state: email': '""', 'input shows': '""', 'error (derived)': 'Required', 'can submit?': false }, hl: { 'error (derived)': 'bad' } },
          { type: 'queue', label: 'Event queue', items: [], frontLabel: 'next', backLabel: 'newest' }
        ] });
        for (var i = 1; i <= text.length; i++) {
          var cur = text.slice(0, i), ch = text[i - 1], prev = text.slice(0, i - 1);
          var e = err(cur);
          f.push({ narr: 'You press <b>"' + H.esc(ch) + '"</b>. The browser fires a <b>change</b> event with <code>e.target.value = "' + H.esc(cur) + '"</code>. React puts it in the queue and calls <code>onChange</code>. The state is still <code>"' + H.esc(prev) + '"</code> for now.', parts: [
            { type: 'queue', label: 'Event queue', items: ['change: "' + cur + '"'], hl: { 0: 'cur' }, frontLabel: 'handling', backLabel: 'newest' },
            { type: 'vars', label: 'State and screen', vals: { 'state: email': '"' + prev + '"', 'input shows': '"' + prev + '"' } }
          ] });
          f.push({ narr: '<code>setEmail("' + H.esc(cur) + '")</code> ran, React re-rendered, and the input is given <code>value="' + H.esc(cur) + '"</code>. The error is recomputed: <b>' + (e ? '<span class="c-r">' + e + '</span>' : '<span class="c-g">looks valid</span>') + '</b>.', parts: [
            { type: 'vars', label: 'State and screen', vals: { 'state: email': '"' + cur + '"', 'input shows': '"' + cur + '"', 'error (derived)': e || '(none)', 'can submit?': !e }, hl: { 'state: email': 'ok', 'input shows': 'ok', 'error (derived)': e ? 'bad' : 'ok' } },
            { type: 'queue', label: 'Event queue', items: [], frontLabel: 'next', backLabel: 'newest' }
          ] });
        }
        var finalErr = err(text);
        f.push({ narr: finalErr ? 'Final value <b>"' + H.esc(text) + '"</b>: the submit button stays <b>disabled</b> because the derived error is "' + finalErr + '". Try <code>asha@x.com</code> to see it become valid.' : 'Final value <b>"' + H.esc(text) + '"</b> passes validation, so <code>canSubmit</code> becomes true and the button enables. At no point did we ask the DOM for the value: state was always the truth.', parts: [
          { type: 'vars', label: 'Result', vals: { 'state: email': '"' + text + '"', 'error (derived)': finalErr || '(none)', 'can submit?': !finalErr }, hl: { 'can submit?': finalErr ? 'bad' : 'ok' } }
        ] });
        return f;
      }
    },
    examples: [
      {
        title: 'One state object, one handler',
        html: `<p>For a form with ten fields, ten <code>useState</code> calls and ten handlers is noise. Store an object and let the input's <code>name</code> pick the key. Checkboxes use <code>checked</code> instead of <code>value</code>.</p>`,
        code: jsx(`const [form, setForm] = useState({ name: '', role: 'dev', newsletter: false });

function handle(e) {
  const { name, type, value, checked } = e.target;
  setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
}

const fields = (
  <>
    <input name="name" value={form.name} onChange={handle} />
    <select name="role" value={form.role} onChange={handle}>
      <option value="dev">Developer</option>
      <option value="design">Designer</option>
    </select>
    <input name="newsletter" type="checkbox" checked={form.newsletter} onChange={handle} />
  </>
);`, 'Many fields, one handler')
      },
      {
        title: 'The "frozen input" bug and the uncontrolled warning',
        html: `<p><code>&lt;input value={name} /&gt;</code> with no <code>onChange</code> cannot be edited: every keystroke is undone because state did not change. If you start with <code>useState()</code> (value <code>undefined</code>) and later set a string, React warns about switching from uncontrolled to controlled. Always start with <code>""</code>, never <code>undefined</code> or <code>null</code>.</p>`
      },
      {
        title: 'Uncontrolled form with FormData',
        html: `<p>When you only need the values on submit, skip state entirely. The browser keeps the values; you read them once. Fewer re-renders, less code. You lose live validation and easy resets, which is a fair trade for a simple "newsletter signup".</p>`,
        code: jsx(`function Newsletter({ onSubscribe }) {
  function handleSubmit(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);      // read all fields once
    onSubscribe(String(data.get('email')));
    e.currentTarget.reset();                          // clear the DOM inputs
  }
  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required defaultValue="" />   {/* defaultValue: initial only */}
      <button>Subscribe</button>
    </form>
  );
}`, 'Uncontrolled with FormData')
      },
      {
        title: 'Formatting while typing (phone / card numbers)',
        html: `<p>Because you control the value you can transform it: <code>setPhone(e.target.value.replace(/\\D/g, "").slice(0, 10))</code> keeps only digits. Be careful: rewriting the value in the middle of the text can make the cursor jump to the end. For heavy masks, use a library (e.g. react-number-format) or manage the caret position yourself.</p>`
      }
    ],
    deepDive: `<h5>🟣 What React does on every keystroke</h5>
      <p>React attaches one listener per event type at the root and delegates (synthetic events). On a change event it calls your handler inside a batch, applies the state update, re-renders the component, then in commit sets <code>input.value</code> back to what your state says. Because React is allowed to <i>overwrite</i> the DOM value, a handler that rejects a character (does not set state) makes the keystroke vanish. That is exactly how input masking works.</p>
      <h5>🟣 Performance of large forms</h5>
      <p>A controlled form re-renders the whole component per keystroke. For 5 fields that is nothing. For 200 fields (spreadsheets, admin screens) it can lag. Options: split into field components that own their own state, memoise fields, debounce expensive validation, or use an uncontrolled library like <b>React Hook Form</b>, which registers refs and subscribes to only the fields that need updates.</p>
      <h5>🟣 Modern React 19 form features</h5>
      <p><code>&lt;form action={fn}&gt;</code> accepts a function (client or server action). <code>useActionState</code> tracks the result and pending state, <code>useFormStatus</code> lets a button know if its form is submitting, and <code>useOptimistic</code> shows an instant optimistic result. Frameworks like Next.js use this for progressive enhancement: the form works even before JavaScript loads. You still need to know controlled inputs because they are everywhere.</p>
      <h5>🟣 IME and accessibility details</h5>
      <p>For Chinese/Japanese/Korean input, the browser fires composition events; transforming the value mid-composition breaks typing. Associate every field with a <code>&lt;label htmlFor&gt;</code>, mark invalid fields with <code>aria-invalid</code>, connect messages with <code>aria-describedby</code>, use <code>autoComplete</code> tokens (<code>email</code>, <code>current-password</code>, <code>one-time-code</code>) and the right <code>type</code> / <code>inputMode</code> for mobile keyboards. Focus the first invalid field after a failed submit.</p>
      <h5>🟣 Security and correctness</h5>
      <p>Client-side validation is only for convenience; <b>the server must validate every request</b> again because anyone can bypass your UI. Never log passwords. Use <code>type="password"</code> and <code>autoComplete</code> so password managers work. Disable the submit button while a request is in flight, and make the server idempotent for retries. Use schema libraries (Zod, Yup) to share validation rules between client and server.</p>`,
    aiEra: `<p><b>What AI changes:</b> Generating a 12-field signup form with validation is one prompt, and schema libraries plus AI can write the Zod schema, the UI and the tests together. The risk is accepting a form that <i>looks</i> right but handles only the happy path.</p>
      <p><b>Use AI as a partner:</b> <code>Review this form for accessibility (labels, aria, focus), double-submit, and stale validation. List concrete bugs with line numbers.</code> Or ask for a test plan: empty, whitespace, very long input, paste, autofill, slow network, server error.</p>
      <p><b>Where AI goes wrong:</b> it stores error messages in state and syncs them in <code>useEffect</code>, forgets <code>preventDefault</code>, uses <code>value</code> with <code>undefined</code> initial state, validates only on the client, or logs the whole form including the password.</p>
      <p><b>What you must still own:</b> choosing when to show errors, the server-side validation contract, accessibility, and being able to write the controlled-input loop from memory in a machine-coding round.</p>`,
    problems: [{
      title: 'Controlled Login Form with Validation',
      level: 'Medium', tags: ['forms', 'controlled inputs', 'validation', 'derived state'], companies: ['Swiggy', 'Atlassian', 'PhonePe'],
      statement: `<p>Build <code>LoginForm</code> with an email and a password field. Rules: email is required and must look like an email; password needs at least 8 characters. Show a field's error only after the user has left that field (blur) or after a submit attempt. The <b>Log in</b> button is disabled while the form is invalid or while submitting. On a valid submit call <code>onLogin(values)</code> (it returns a promise) and show "Signing in...".</p>`,
      constraints: `Use controlled inputs. Do not store error messages in state: derive them. Prevent the default form submit. Each input has a label. Assume <code>onLogin</code> may reject; the button must be re-enabled afterwards.`,
      example: `${H.table(['User does', 'Screen'], [['focuses email, types "asha", leaves it', 'error: Enter a valid email'], ['types "asha@x.com"', 'email error disappears'], ['types 5 chars in password, leaves it', 'error: Use at least 8 characters'], ['fills a valid password', 'button becomes enabled'], ['clicks Log in', 'button shows "Signing in..." and is disabled']])}
        <p>${H.c('g', 'Why')}: errors are a pure function of the current values; <code>touched</code> only decides visibility.</p>`,
      brute: { why: `<p>Read the DOM directly (<code>document.getElementById("email").value</code>) on submit and show an <code>alert</code> on failure. There is no live feedback, state and screen drift apart, and it is untestable. A second common brute force keeps an <code>errors</code> state and a <code>useEffect</code> that recomputes it after every change, which causes an extra render and can show stale messages.</p>`, code: jsx(`function BadLogin() {
  const [errors, setErrors] = useState({});
  const [email, setEmail] = useState('');
  useEffect(() => {                                   // extra render, easy to desync
    setErrors({ email: email.includes('@') ? '' : 'Enter a valid email' });
  }, [email]);
  return (
    <form onSubmit={() => alert(JSON.stringify(errors))}>   {/* no preventDefault: page reloads */}
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      {errors.email}
    </form>
  );
}`, 'Stored errors + effect, no preventDefault') },
      mcq: { q: 'Where should the email error message live?', options: ['In its own useState, updated inside onChange', 'In a useEffect that sets it when email changes', 'Computed from the current values during render', 'In a global variable'], answer: 2, explain: 'The message is a pure function of the values, so derive it during render. Storing it duplicates the truth and creates sync bugs; only "was this field touched" needs state.' },
      hints: [
        `<p>Hint 1: What are the minimum pieces of data that cannot be computed from anything else? (The typed values, which fields were touched, and whether we are submitting.)</p>`,
        `<p>Hint 2: Write <code>validate(values)</code> returning an errors object. Call it in the component body. Show <code>errors.email</code> only if <code>touched.email</code>.</p>`,
        `<p>Hint 3: Recipe: <code>values</code> object + one <code>handleChange</code> using <code>[e.target.name]</code>; <code>handleBlur</code> sets touched; <code>handleSubmit</code> does <code>preventDefault</code>, marks all touched, returns if errors, then <code>await onLogin</code> in try/finally; button <code>disabled={hasErrors || submitting}</code>.</p>`
      ],
      solution: {
        approach: `<p>State holds only independent facts: values, touched, submitting. Errors and <code>canSubmit</code> are computed on each render from <code>validate(values)</code>. One change handler uses the input <code>name</code>. The submit handler marks everything touched so all errors are revealed, and the <code>try/finally</code> guarantees the button recovers if the request fails. The runnable model drives the same <code>validate</code> through typing steps.</p>`,
        code: jsx(`import { useState } from 'react';

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Email is required';
  else if (!/^\\S+@\\S+\\.\\S+$/.test(email)) errors.email = 'Enter a valid email';
  if (password.length < 8) errors.password = 'Use at least 8 characters';
  return errors;
}

export default function LoginForm({ onLogin }) {
  const [values, setValues] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);

  const errors = validate(values);                       // derived, never stored
  const invalid = Object.keys(errors).length > 0;

  const handleChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
  const handleBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ email: true, password: true });         // show every error now
    if (invalid || submitting) return;
    setSubmitting(true);
    try {
      await onLogin(values);
    } finally {
      setSubmitting(false);                              // re-enable even if onLogin rejects
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" value={values.email}
        onChange={handleChange} onBlur={handleBlur} aria-invalid={touched.email && !!errors.email} />
      {touched.email && errors.email && <p role="alert">{errors.email}</p>}

      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" value={values.password}
        onChange={handleChange} onBlur={handleBlur} aria-invalid={touched.password && !!errors.password} />
      {touched.password && errors.password && <p role="alert">{errors.password}</p>}

      <button type="submit" disabled={invalid || submitting}>
        {submitting ? 'Signing in...' : 'Log in'}
      </button>
    </form>
  );
}`, 'Solution'),
        alt: [jsrun(`// Plain JS model: same validate(), a touched map, and what the screen would show.
function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Email is required';
  else if (!/^\\S+@\\S+\\.\\S+$/.test(email)) errors.email = 'Enter a valid email';
  if (password.length < 8) errors.password = 'Use at least 8 characters';
  return errors;
}
function screen(values, touched, submitting) {
  const errors = validate(values);
  const invalid = Object.keys(errors).length > 0;
  const shown = Object.keys(errors).filter((k) => touched[k]).map((k) => k + ': ' + errors[k]);
  return { visibleErrors: shown, buttonDisabled: invalid || submitting, label: submitting ? 'Signing in...' : 'Log in' };
}
console.log(screen({ email: '', password: '' }, { email: false, password: false }, false));
console.log(screen({ email: 'asha', password: '' }, { email: true, password: false }, false));
console.log(screen({ email: 'asha@x.com', password: 'abc' }, { email: true, password: true }, false));
console.log(screen({ email: 'asha@x.com', password: 'longenough' }, { email: true, password: true }, false));
console.log(screen({ email: 'asha@x.com', password: 'longenough' }, { email: true, password: true }, true));`, 'Plain JS model (runnable)')],
        complexity: `<p>Validation is O(number of fields) per render, which is negligible. Re-render per keystroke is O(1) components for this small form.</p>`,
        followUps: ['Add a "show password" checkbox. Which state does it need?', 'How would you share the same rules with the server using a schema (Zod)?']
      }
    }]
  });

  /* ======================= TOPIC 8: LIFTING STATE UP ======================= */
  topics.push({
    title: 'Lifting State Up: One Source of Truth',
    analogy: `<p>Two roommates each keep their own grocery list on their own phone. One adds milk, the other does not know, and you end up with <b>two cartons of milk</b>. The fix: put <b>one list on the fridge</b>. Both roommates read it and both write to it. In React, the fridge is the <b>nearest common parent</b> of the two components that need the data.</p>
      <p>The child components become "dumb displays plus buttons": they show what the parent tells them and shout "something changed!" back to the parent.</p>`,
    explain: `<p>Sometimes two components must always show the <b>same changing data</b>: two inputs that mirror each other, a list and a "3 items" counter, filters and a table. Each component keeping its own copy would drift apart. The solution is to <b>lift the state up</b>:</p>
      <ol>
        <li>Find the <b>closest common parent</b> of the components that need the data.</li>
        <li>Move the <code>useState</code> there. The parent now <b>owns</b> the value.</li>
        <li>Pass the value <b>down</b> as props.</li>
        <li>Pass a <b>callback</b> down (like <code>onChange</code>). When the user interacts, the child calls it, and the parent updates its state.</li>
      </ol>
      <p>This is the "<b>data down, events up</b>" loop. The children become <b>controlled components</b>: their value comes from props and they report changes upward.</p>
      ${H.table(['Before (broken)', 'After (lifted)'], [['<code>CelsiusInput</code> has <code>useState</code>, <code>FahrenheitInput</code> has <code>useState</code>', '<code>Converter</code> has one <code>useState(celsius)</code>'], ['Typing in one cannot update the other', 'Typing in either calls <code>onChange</code>; parent updates; both re-render with new props'], ['Two truths can disagree', '<span class="c-g">One truth, so they cannot disagree</span>']])}
      <h5>🟢 Store the minimum, derive the rest</h5>
      <p>Store only <b>one</b> number (Celsius). Fahrenheit is <i>calculated</i> during render: <code>celsius * 9 / 5 + 32</code>. If you stored both, you would need extra code to keep them in sync, and bugs would hide there. The same idea applies to a filtered list: store the <code>filterText</code> and the full list, and compute the visible rows on each render.</p>
      <h5>🔵 Where should state live?</h5>
      ${H.table(['Question', 'Answer'], [['Does only one component use it?', 'Keep it in that component (<b>colocate</b>).'], ['Do two siblings need it?', 'Lift to their <b>closest</b> common parent.'], ['Does a distant branch need it?', 'Lift higher, or use Context / a store (later modules).'], ['Can it be calculated from other state?', 'Do not store it. <b>Derive</b> it.']])}
      <p>Lifting too high has a cost: every update re-renders more of the tree (previous topic). So lift only as far as the nearest parent that needs to coordinate.</p>
      <h5>🔵 Example: a filterable product table</h5>
      <p>A search box and a checkbox "only in stock" both change what the table shows. The <code>FilterableProductTable</code> parent owns <code>filterText</code> and <code>inStockOnly</code>. <code>SearchBar</code> receives them and callbacks. <code>ProductTable</code> receives the same two values and filters the product list while rendering. No component duplicates any data.</p>
      <p>Play with the visualiser to watch a typed value travel <i>up</i> to the parent and then <i>down</i> to both inputs.</p>`,
    clues: [
      '"Two components must stay in sync" / "typing in one updates the other" → lift state to the common parent',
      '"Sibling components need to share data" → closest common ancestor owns the state',
      '"Single source of truth" → store once, derive the rest',
      '"Child needs to change parent\'s data" → pass a callback prop (inverse data flow)',
      '"Thinking in React" steps → component hierarchy, static version, minimal state, where it lives, inverse data flow',
      '"Props drilling through five layers" → lift less / compose / Context'
    ],
    code: [
      jsx(`import { useState } from 'react';

// A "dumb" controlled input: it shows what it is told and reports changes upward.
function TemperatureInput({ label, value, onChange }) {
  return (
    <label>
      {label}{' '}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}   // tell the parent, do not keep a copy
      />
    </label>
  );
}

const toF = (c) => (c * 9) / 5 + 32;
const toC = (f) => ((f - 32) * 5) / 9;
const round = (n) => Math.round(n * 10) / 10;

export default function Converter() {
  // The ONE source of truth lives in the closest common parent.
  const [celsius, setCelsius] = useState('0');           // keep the typed text as a string

  const num = Number(celsius);
  const valid = celsius.trim() !== '' && !Number.isNaN(num);
  const fahrenheit = valid ? String(round(toF(num))) : '';   // DERIVED, not stored

  return (
    <div>
      <TemperatureInput label="Celsius" value={celsius} onChange={setCelsius} />
      <TemperatureInput
        label="Fahrenheit"
        value={fahrenheit}
        onChange={(f) => setCelsius(f.trim() === '' || Number.isNaN(Number(f)) ? '' : String(round(toC(Number(f)))))}
      />
      {valid && num >= 100 ? <p>The water would boil.</p> : <p>The water would not boil.</p>}
    </div>
  );
}`, 'React: lifting state to sync two inputs'),
      jsrun(`// Lifted state in plain JS: the parent owns the value, children are pure functions of props.
const toF = (c) => (c * 9) / 5 + 32;
const toC = (f) => ((f - 32) * 5) / 9;
const round = (n) => Math.round(n * 10) / 10;

function makeConverter() {
  let celsius = 0;                          // the single source of truth, held by the parent
  const view = () => {
    // children receive props only: value + a callback going back up
    const childC = { label: 'Celsius', value: celsius, onChange: (v) => { celsius = v; } };
    const childF = { label: 'Fahrenheit', value: round(toF(celsius)), onChange: (v) => { celsius = round(toC(v)); } };
    return [childC, childF];
  };
  return view;
}
const show = (children) => children.map((c) => c.label + '=' + c.value).join('  ');

const view = makeConverter();
console.log('start      ', show(view()));
view()[0].onChange(100);                    // user types 100 in the Celsius input
console.log('type C=100 ', show(view()));
view()[1].onChange(32);                     // user types 32 in the Fahrenheit input
console.log('type F=32  ', show(view()));
view()[1].onChange(98.6);
console.log('type F=98.6', show(view()));
// There is no way for the two to disagree: only one number is stored.`, 'Plain JS: one owner, two views (runnable)')
    ],
    viz: {
      title: 'Lifted state: events go up, data comes down',
      input: 'c 100',
      inputLabel: 'Which input you type in (c or f) and the number, e.g. "c 100" or "f 212"',
      gen: function (input) {
        var w = words(input);
        var which = (w[0] || '').toLowerCase(), v = Number(w[1]);
        if (['c', 'f'].indexOf(which) < 0 || w.length !== 2 || isNaN(v) || Math.abs(v) > 10000) throw new Error('Type c or f, then a number: c 100  or  f 212');
        function rnd(n) { return Math.round(n * 10) / 10; }
        var cel = which === 'c' ? v : rnd((v - 32) * 5 / 9);
        var fah = which === 'f' ? v : rnd(v * 9 / 5 + 32);
        var tree = ['Converter', 'CelsiusInput', 'FahrenheitInput'];
        var idx = which === 'c' ? 1 : 2;
        var other = which === 'c' ? 2 : 1;
        var f = [];
        f.push({ narr: '<code>Converter</code> owns the only state: <code>celsius = 0</code>. It passes values <b>down</b>: Celsius gets 0, Fahrenheit gets <b>32</b> (calculated, not stored). Both inputs look at the same truth.', parts: [
          { type: 'tree', label: 'Component tree (tags = props / state)', arr: tree, hl: { 0: 'sel', 1: 'done', 2: 'done' }, ehl: { 1: 'ok', 2: 'ok' }, tags: { 0: 'state: celsius=0', 1: 'value=0', 2: 'value=32' } },
          { type: 'vars', label: 'State owned by Converter', vals: { celsius: 0 } }
        ] });
        f.push({ narr: 'You type <b>' + v + '</b> into the <b>' + (which === 'c' ? 'Celsius' : 'Fahrenheit') + '</b> input. That input has <b>no state of its own</b>. It only knows the event.', parts: [
          { type: 'tree', label: 'Component tree', arr: tree, hl: { 0: 'done', 1: which === 'c' ? 'cur' : 'done', 2: which === 'f' ? 'cur' : 'done' }, tags: (function () { var t = { 0: 'state: celsius=0' }; t[idx] = 'typed ' + v; return t; })() }
        ] });
        f.push({ narr: 'The input calls its <code>onChange</code> prop with <b>' + v + '</b>: <b>the event travels UP</b> to the owner. The prop is just a function that the parent created and handed down.', parts: [
          { type: 'tree', label: 'Event goes up', arr: tree, hl: (function () { var o = { 0: 'cur' }; o[idx] = 'done'; return o; })(), tags: (function () { var t = { 0: 'onChange(' + v + ')' }; t[idx] = 'calls onChange'; return t; })() }
        ] });
        f.push({ narr: 'The handler in <code>Converter</code> ' + (which === 'c' ? 'saves it directly' : 'first converts Fahrenheit to Celsius: (' + v + ' − 32) × 5 / 9 = <b>' + cel + '</b>, then saves it') + ': <code>setCelsius(' + cel + ')</code>. Converter re-renders.', parts: [
          { type: 'vars', label: 'State owned by Converter', vals: { 'celsius (before)': 0, 'celsius (after)': cel }, hl: { 'celsius (after)': 'ok' } },
          { type: 'tree', label: 'Converter re-renders', arr: tree, hl: { 0: 'cur' }, tags: { 0: 'state: celsius=' + cel } }
        ] });
        f.push({ narr: 'During that render <code>Converter</code> <b>derives</b> the Fahrenheit value (' + cel + ' × 9 / 5 + 32 = <b>' + fah + '</b>) and passes both numbers <b>DOWN</b> as props. Both inputs re-render with the new props, including the one you did <i>not</i> type in.', parts: [
          { type: 'tree', label: 'Data flows down', arr: tree, hl: { 0: 'done', 1: 'ok', 2: 'ok' }, ehl: { 1: 'ok', 2: 'ok' }, tags: { 0: 'state: celsius=' + cel, 1: 'value=' + cel, 2: 'value=' + fah } }
        ] });
        f.push({ narr: 'Result: Celsius <b>' + cel + '</b> and Fahrenheit <b>' + fah + '</b>, always consistent. The other input (' + (other === 1 ? 'Celsius' : 'Fahrenheit') + ') updated without any code that "syncs" them. That is the power of one source of truth. Try <code>f 212</code> or <code>c -40</code>.', parts: [
          { type: 'table', label: 'Final screen', columns: ['Input', 'Shows', 'Where the value comes from'], rows: [['Celsius', cel, which === 'c' ? 'typed (saved in parent)' : 'derived from the saved value'], ['Fahrenheit', fah, which === 'f' ? 'typed (converted, then saved in parent)' : 'derived from the saved value']], hl: (function () { var o = {}; o[which === 'c' ? 0 : 1] = 'sel'; return o; })() }
        ] });
        return f;
      }
    },
    examples: [
      {
        title: 'The filterable product table',
        html: `<p>Classic "Thinking in React" example. The parent owns two small pieces of state, and <code>ProductTable</code> <b>derives</b> the visible rows during render. Nothing stores a "filtered products" array.</p>`,
        code: jsx(`function FilterableProductTable({ products }) {
  const [filterText, setFilterText] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  return (
    <div>
      <SearchBar
        filterText={filterText} inStockOnly={inStockOnly}
        onFilterTextChange={setFilterText} onInStockOnlyChange={setInStockOnly}
      />
      <ProductTable products={products} filterText={filterText} inStockOnly={inStockOnly} />
    </div>
  );
}

function ProductTable({ products, filterText, inStockOnly }) {
  const rows = products
    .filter((p) => p.name.toLowerCase().includes(filterText.toLowerCase()))   // derived each render
    .filter((p) => !inStockOnly || p.stocked);
  return <ul>{rows.map((p) => <li key={p.id}>{p.name} - {p.price}</li>)}</ul>;
}`, 'Filter state lifted to the parent')
      },
      {
        title: 'The bug when you copy instead of lift',
        html: `<p>If <code>FahrenheitInput</code> did <code>useState(props.value)</code> it would copy the value only on the first render. Later changes to the prop are <b>ignored</b> (the state initial value is used once). Typing in the other box would then not update this one. The fix is not an effect that "syncs" them, it is to delete the copy and use the prop directly.</p>`
      },
      {
        title: 'Lift only as far as needed',
        html: `<p>Imagine a page where only <code>Cart</code> and <code>CartBadge</code> (in the header) need the cart. Lift to the page level where both meet, not to <code>App</code>. If ten distant components need it, passing props through five layers gets tedious; that is when Context or a store helps (State Management module). Lifting is the default tool; reach for the others when the drilling hurts.</p>`
      },
      {
        title: 'Accordion that lets only one panel be open',
        html: `<p>Each panel could keep its own <code>isOpen</code>, but then "only one open at a time" is impossible, because a panel cannot know about its siblings. Lift the state: the parent stores <code>openIndex</code> and tells each panel <code>isOpen={openIndex === i}</code>. See the next topic for the composition version.</p>`
      }
    ],
    deepDive: `<h5>🟣 Controlled vs uncontrolled components</h5>
      <p>A component that gets its value from props and reports changes through callbacks is <b>controlled</b>. One that keeps its own state is <b>uncontrolled</b>. Well-designed reusable components often support both: if the parent passes <code>value</code>/<code>onChange</code> they are controlled, otherwise they use an internal state with <code>defaultValue</code>. Lifting state is just "make it controlled by the parent".</p>
      <h5>🟣 Anti-pattern: syncing state with effects</h5>
      <p>Code like <code>useEffect(() =&gt; setB(a * 2), [a])</code> to keep two states in step causes an extra render with an inconsistent frame in between (a flicker), and invites loops. Almost always the right fix is: store one, <b>compute the other during render</b>. React's docs call this "You might not need an effect".</p>
      <h5>🟣 Thinking in React (the 5 steps)</h5>
      <ol>
        <li>Break the UI into a component hierarchy (one component, one job).</li>
        <li>Build a static version with props only (no state).</li>
        <li>Find the minimal state (could it be derived? passed in from a parent? does it change?).</li>
        <li>Identify <b>which component owns each piece of state</b> (closest common parent).</li>
        <li>Add inverse data flow (callbacks) so children can change the owner's state.</li>
      </ol>
      <h5>🟣 Scaling the pattern</h5>
      <p>When the lifted state has many fields and rules, use <code>useReducer</code> in the parent and pass <code>dispatch</code> (stable identity) instead of many setters. When the owner is far from the consumers, put it in Context. When it should survive refresh or be shareable, put it in the <b>URL</b> (search params): filters and tabs are usually URL state, which gives back/forward and links for free. Server data belongs in a cache library (TanStack Query), not in your lifted state.</p>
      <h5>🟣 Performance considerations</h5>
      <p>An owner high in the tree re-renders all its descendants on every change. Mitigations from the rendering topic apply: split the owner, pass children as props, memoise pure children with stable props (callbacks via <code>useCallback</code>), or let the React Compiler do it. Also remember a typed value in a lifted text field re-renders everything below on every keystroke, so keep text input state near the input when siblings do not need it.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI is good at producing a component that works alone. Where it struggles is <b>deciding who owns the data</b> across a whole screen, because that needs the bigger picture of the product.</p>
      <p><b>Use AI as a partner:</b> Paste your component tree and ask: <code>For each piece of state, which component should own it and why? Which values are derived and should not be stored? Show the data flow as a tree.</code> Then compare with your own answer; disagreements are where the learning is.</p>
      <p><b>Where AI goes wrong:</b> it duplicates state in two children and adds a <code>useEffect</code> to sync them, stores derived values (the filtered list, the total), lifts everything to <code>App</code>, or invents a global store for a two-component problem.</p>
      <p><b>What you must still own:</b> "single source of truth", the "data down, events up" explanation, and the judgement of how high to lift.</p>`,
    problems: [{
      title: 'Two Inputs That Stay in Sync (Celsius and Fahrenheit)',
      level: 'Medium', tags: ['lifting state', 'controlled components', 'derived state'], companies: ['Meta', 'Atlassian'],
      statement: `<p>Build a <code>Converter</code> with two inputs, Celsius and Fahrenheit. Typing a number in either one must instantly update the other (rounded to 1 decimal place). Clearing a box or typing something that is not a number clears the other box. Only <b>one</b> piece of state is allowed. Also show "The water would boil" when Celsius is at least 100.</p>`,
      constraints: `One <code>useState</code> in the parent. The two inputs are one reusable <code>TemperatureInput</code> component with <code>value</code> and <code>onChange</code> props and <b>no state of its own</b>. No <code>useEffect</code>.`,
      example: `${H.table(['User types', 'Celsius shows', 'Fahrenheit shows'], [['(start)', '0', '32'], ['Celsius: 100', '100', '212 and "water would boil"'], ['Fahrenheit: 98.6', '37', '98.6'], ['Fahrenheit: abc', '(empty)', 'abc is not a number, so Celsius clears']])}
        <p>${H.c('g', 'Why')}: the parent stores one value; the other input's text is computed from it.</p>`,
      brute: { why: `<p>Give each input its own state and add an effect in the parent to copy values both ways. Each side effect triggers the other, causing an extra render (flicker) and possible infinite loops. Rounding errors make the two values drift.</p>`, code: jsx(`function BadConverter() {
  const [c, setC] = useState('0');
  const [f, setF] = useState('32');
  useEffect(() => { setF(String((Number(c) * 9) / 5 + 32)); }, [c]);   // c -> f
  useEffect(() => { setC(String(((Number(f) - 32) * 5) / 9)); }, [f]); // f -> c : loops and drifts
  return (
    <div>
      <input value={c} onChange={(e) => setC(e.target.value)} />
      <input value={f} onChange={(e) => setF(e.target.value)} />
    </div>
  );
}`, 'Two states + two effects') },
      mcq: { q: 'Why is it better to store only Celsius and compute Fahrenheit during render?', options: ['It saves one tiny variable of memory', 'There is only one truth, so the inputs can never disagree and no sync code is needed', 'Because React does not allow two useState calls', 'Because Fahrenheit is not a real unit'], answer: 1, explain: 'Duplicated state must be kept in sync, which needs extra code and is a bug magnet. Derived values are recalculated every render, so they are always consistent.' },
      hints: [
        `<p>Hint 1: Which one component is the closest parent of both inputs? That is where the state goes.</p>`,
        `<p>Hint 2: Keep the <b>Celsius text</b> in state. The Fahrenheit text is <code>celsius * 9/5 + 32</code>, computed while rendering. When the user types in the Fahrenheit box convert it back to Celsius before calling the setter.</p>`,
        `<p>Hint 3: Recipe: <code>TemperatureInput({ label, value, onChange })</code> calls <code>onChange(e.target.value)</code>. In <code>Converter</code>: validate with <code>Number()</code> and <code>isNaN</code>; write <code>fromF</code> that sets Celsius; pass derived values; show the boil message from <code>num &gt;= 100</code>.</p>`
      ],
      solution: {
        approach: `<p>Lift the state to <code>Converter</code>. Store the Celsius <i>text</i> (a string, so a user can type "-" or "3." mid-way without being rewritten). Derive Fahrenheit. The child input is fully controlled. The Fahrenheit handler converts to Celsius first, then calls the single setter. The model on the right-hand tab shows the same flow without React.</p>`,
        code: jsx(`import { useState } from 'react';

const round = (n) => Math.round(n * 10) / 10;
const toF = (c) => (c * 9) / 5 + 32;
const toC = (f) => ((f - 32) * 5) / 9;
const isNum = (s) => s.trim() !== '' && !Number.isNaN(Number(s));

function TemperatureInput({ label, value, onChange }) {
  return (
    <label>
      {label}: <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export default function Converter() {
  const [celsius, setCelsius] = useState('0');             // the single source of truth

  const fahrenheit = isNum(celsius) ? String(round(toF(Number(celsius)))) : '';   // derived

  function handleFahrenheit(text) {
    // convert to Celsius first, so only Celsius is ever stored
    setCelsius(isNum(text) ? String(round(toC(Number(text)))) : '');
  }

  const boils = isNum(celsius) && Number(celsius) >= 100;

  return (
    <div>
      <TemperatureInput label="Celsius" value={celsius} onChange={setCelsius} />
      <TemperatureInput label="Fahrenheit" value={fahrenheit} onChange={handleFahrenheit} />
      <p>{boils ? 'The water would boil.' : 'The water would not boil.'}</p>
    </div>
  );
}`, 'Solution'),
        alt: [jsrun(`const round = (n) => Math.round(n * 10) / 10;
const toF = (c) => (c * 9) / 5 + 32;
const toC = (f) => ((f - 32) * 5) / 9;
const isNum = (s) => String(s).trim() !== '' && !Number.isNaN(Number(s));

// state = the single Celsius string. Everything shown on screen is computed from it.
function screen(celsius) {
  return { Celsius: celsius, Fahrenheit: isNum(celsius) ? String(round(toF(Number(celsius)))) : '', boils: isNum(celsius) && Number(celsius) >= 100 };
}
const typeCelsius = (text) => text;                                    // handler for the Celsius box
const typeFahrenheit = (text) => (isNum(text) ? String(round(toC(Number(text)))) : ''); // handler for the F box

let state = '0';
console.log('start         ', JSON.stringify(screen(state)));
state = typeCelsius('100');    console.log('C = 100       ', JSON.stringify(screen(state)));
state = typeFahrenheit('98.6'); console.log('F = 98.6      ', JSON.stringify(screen(state)));
state = typeFahrenheit('abc');  console.log('F = abc       ', JSON.stringify(screen(state)));
state = typeCelsius('-40');    console.log('C = -40       ', JSON.stringify(screen(state)));`, 'Plain JS model (runnable)')],
        complexity: `<p>O(1) per keystroke. Re-render touches the parent and its two small children.</p>`,
        followUps: ['Add a Kelvin input. How much code changes?', 'What if the two inputs lived in distant parts of the page?']
      }
    }]
  });

  /* ======================= TOPIC 9: COMPOSITION ======================= */
  topics.push({
    title: 'Composition: Building Big UI from Small Pieces',
    analogy: `<p>Think of a <b>picture frame</b>. The frame decides the border, size and shadow. It does not care what picture you put in: a family photo, a poster, a child's drawing. In React, a component with a <code>children</code> slot is a frame, and whatever you put inside is the picture.</p>
      <p>Or <b>LEGO</b>: instead of ordering a custom brick for every shape, you snap small general bricks together. React prefers composition (snap together) over inheritance (a family tree of special bricks).</p>`,
    explain: `<p><b>Composition</b> means building components by <b>combining</b> other components and passing JSX around as props. It is the main way React shares and reuses UI. There is almost never a reason to use class inheritance in React.</p>
      <h5>🟢 1. Containment with <code>children</code></h5>
      <p>A component that does not know its content ahead of time (a <code>Card</code>, <code>Modal</code>, <code>Sidebar</code>, <code>Page</code>) renders <code>{children}</code>. The caller puts anything between the tags.</p>
      <h5>🟢 2. Slots: JSX in named props</h5>
      <p>Need more than one hole? Pass elements as props: <code>&lt;Layout header={&lt;Nav /&gt;} sidebar={&lt;Menu /&gt;}&gt;...&lt;/Layout&gt;</code>. Any prop can hold JSX, because JSX is just a value.</p>
      <h5>🟢 3. Specialisation</h5>
      <p>A "specific" component is a "generic" one with some props filled in: <code>function DangerButton(props) { return &lt;Button variant="danger" {...props} /&gt;; }</code>. No inheritance needed.</p>
      <h5>🔵 4. Render props: a function as a prop</h5>
      <p>When the parent must <i>give data back</i> to the slot, pass a function: <code>&lt;MouseTracker render={(pos) =&gt; &lt;Dot at={pos} /&gt;} /&gt;</code>. The component calls it with its own data. Today custom hooks cover most of this, but you will still see it (Formik, Downshift, virtual lists).</p>
      <h5>🔵 5. Compound components</h5>
      <p>A set of components that work together and share hidden state, like <code>&lt;Tabs&gt;&lt;Tabs.List&gt;&lt;Tabs.Tab/&gt;...</code> or <code>&lt;select&gt;&lt;option&gt;</code>. The parent keeps the state (and often shares it with children through Context) and the caller composes the pieces in any order. Libraries like Radix UI and Headless UI work this way.</p>
      <h5>🔵 6. Composition fixes prop drilling</h5>
      <p>Instead of passing <code>user</code> through <code>Page → Layout → Header → Avatar</code>, create the <code>&lt;Avatar user={user} /&gt;</code> element high up and pass it down as a slot. Middle layers just forward an element and never need to know about <code>user</code>.</p>
      <p>The accordion below is built this way: <code>Accordion</code> owns "which one is open" (lifted state), <code>AccordionItem</code> draws one section, and the <b>content of each section is whatever JSX the caller passes in</b>.</p>`,
    clues: [
      '"Make a reusable Card / Modal / Layout / Panel that can contain anything" → <code>children</code>',
      '"Component with a header slot and a footer slot" → pass JSX as named props',
      '"Avoid prop drilling without Context" → pass elements down instead of data',
      '"Composition vs inheritance in React" → React favours composition',
      '"Build an Accordion / Tabs / Dropdown API" → parent owns state, children are presentational (or compound components)',
      '"Render props vs hooks" → function-as-child gives data back to the slot'
    ],
    code: [
      jsx(`import { useState } from 'react';

// One section. It is "dumb": it only draws what it is told and reports clicks.
function AccordionItem({ title, isOpen, onToggle, children, panelId }) {
  return (
    <section className="item">
      <h3>
        <button
          aria-expanded={isOpen}                 // screen readers announce open/closed
          aria-controls={panelId}
          onClick={onToggle}
        >
          {title} {isOpen ? '▲' : '▼'}
        </button>
      </h3>
      {isOpen && <div id={panelId} role="region">{children}</div>}   {/* the "slot" */}
    </section>
  );
}

// The container owns WHICH item is open (lifted state) and composes the items.
export function Accordion({ items }) {
  const [openId, setOpenId] = useState(null);       // null = all closed

  return (
    <div className="accordion">
      {items.map((it) => (
        <AccordionItem
          key={it.id}
          panelId={'panel-' + it.id}
          title={it.title}
          isOpen={openId === it.id}
          onToggle={() => setOpenId(openId === it.id ? null : it.id)}   // click open one = close
        >
          {it.content}                                {/* any JSX passed by the caller */}
        </AccordionItem>
      ))}
    </div>
  );
}

// Usage: the caller decides the content of each section.
<Accordion items={[
  { id: 'a', title: 'Shipping', content: <p>Free over 500.</p> },
  { id: 'b', title: 'Returns', content: <ul><li>30 days</li><li>No questions</li></ul> }
]} />`, 'React: accordion via composition'),
      jsrun(`// Composition in plain JS: a "component" is a function; children/slots are just values.
function Card({ title, children }) {                       // frame with a children slot
  return '[' + title + ': ' + children + ']';
}
function Layout({ header, sidebar, children }) {           // several named slots
  return header + ' | ' + sidebar + ' | ' + children;
}
const DangerButton = (props) => '<btn danger ' + props.label + '>';   // specialisation, no inheritance

console.log(Card({ title: 'Profile', children: 'Asha, Designer' }));
console.log(Layout({ header: 'NAV', sidebar: 'MENU', children: Card({ title: 'Main', children: 'content' }) }));
console.log(DangerButton({ label: 'Delete' }));

// Accordion: parent owns openId, items are plain presentational functions.
function AccordionItem({ title, isOpen, children }) { return (isOpen ? '[-] ' : '[+] ') + title + (isOpen ? ' -> ' + children : ''); }
function accordion(items, openId) {
  return items.map((it) => AccordionItem({ title: it.title, isOpen: it.id === openId, children: it.content })).join('\\n');
}
const items = [{ id: 'a', title: 'Shipping', content: 'Free over 500' }, { id: 'b', title: 'Returns', content: '30 days' }];
let openId = null;
const click = (id) => { openId = openId === id ? null : id; };      // the callback prop the parent gives each item
console.log(accordion(items, openId));
click('a'); console.log('click a\\n' + accordion(items, openId));
click('b'); console.log('click b\\n' + accordion(items, openId));
click('b'); console.log('click b again\\n' + accordion(items, openId));`, 'Plain JS: slots, children and an accordion (runnable)')
    ],
    viz: {
      title: 'Accordion by composition: state in the container, content as children',
      input: '1 2 2 1',
      inputLabel: 'Click order of the two sections (1 or 2), up to 6 clicks, e.g. 1 2 2 1',
      gen: function (input) {
        var clicks = words(input).map(Number);
        if (!clicks.length || clicks.length > 6 || clicks.some(function (c) { return c !== 1 && c !== 2; })) throw new Error('Type up to 6 clicks using only 1 and 2, e.g. 1 2 2 1');
        var names = ['Accordion', 'Item 1', 'Item 2', 'Header', 'Panel', 'Header', 'Panel'];
        var open = null;
        function tagsFor(o) {
          var t = {};
          t[0] = 'state: openIndex=' + (o === null ? 'none' : o);
          t[1] = o === 1 ? 'isOpen=true' : 'isOpen=false';
          t[2] = o === 2 ? 'isOpen=true' : 'isOpen=false';
          t[4] = o === 1 ? 'children shown' : 'children hidden';
          t[6] = o === 2 ? 'children shown' : 'children hidden';
          return t;
        }
        function hlFor(o, clicked, accCur) {
          var h = { 0: accCur ? 'cur' : 'sel', 1: o === 1 ? 'ok' : 'done', 2: o === 2 ? 'ok' : 'done', 3: o === 1 ? 'ok' : 'done', 4: o === 1 ? 'ok' : 'done', 5: o === 2 ? 'ok' : 'done', 6: o === 2 ? 'ok' : 'done' };
          if (clicked) h[clicked] = 'cur';
          return h;
        }
        var f = [];
        f.push({ narr: 'The caller wrote <code>&lt;Accordion items=[...] /&gt;</code> with JSX content for each section. <code>Accordion</code> owns <code>openIndex</code> (nothing open yet) and renders two <code>Item</code>s. The <b>content</b> was created by the caller and is passed in as <code>children</code>.', parts: [
          { type: 'tree', label: 'Component tree (tags = props / state)', arr: names, hl: hlFor(null, 0, false), tags: tagsFor(null) },
          { type: 'vars', label: 'State owned by Accordion', vals: { openIndex: 'none' } }
        ] });
        clicks.forEach(function (c, k) {
          var before = open;
          var after = open === c ? null : c;
          f.push({ narr: 'Click #' + (k + 1) + ': you press the header of <b>Item ' + c + '</b>. The item has no state. It calls the <code>onToggle</code> prop that <code>Accordion</code> gave it.', parts: [
            { type: 'tree', label: 'Event goes up', arr: names, hl: hlFor(before, c, false), tags: (function () { var t = tagsFor(before); t[c] = 'calls onToggle()'; return t; })() },
            { type: 'vars', label: 'State owned by Accordion', vals: { openIndex: before === null ? 'none' : before } }
          ] });
          open = after;
          f.push({ narr: 'Accordion decides: ' + (before === c ? 'that item was already open, so close it' : (before === null ? 'nothing was open, so open item ' + c : 'close item ' + before + ' and open item ' + c + ' (only one at a time)')) + '. <code>setOpenIndex(' + (after === null ? 'null' : after) + ')</code> → re-render → each item receives a new <code>isOpen</code> prop.', parts: [
            { type: 'tree', label: 'Data flows down', arr: names, hl: hlFor(open, 0, true), ehl: { 1: 'ok', 2: 'ok' }, tags: tagsFor(open) },
            { type: 'vars', label: 'State owned by Accordion', vals: { openIndex: open === null ? 'none' : open }, hl: { openIndex: 'ok' } }
          ] });
        });
        f.push({ narr: 'Finished. Look at what never happened: <code>Item</code> never stored anything and never knew about its sibling. The container coordinated everything, and the section contents (children) were just passed through. Reuse it with any content.', parts: [
          { type: 'tree', label: 'Final state', arr: names, hl: hlFor(open, 0, false), tags: tagsFor(open) },
          { type: 'table', label: 'Who owns what', columns: ['Component', 'Owns', 'Receives'], rows: [['Accordion', 'openIndex (state)', 'items from the caller'], ['Item', 'nothing', 'title, isOpen, onToggle, children'], ['Panel content', 'nothing', 'it is the caller\'s JSX']] }
        ] });
        return f;
      }
    },
    examples: [
      {
        title: 'Layout with slots',
        html: `<p>The layout decides the grid. Pages decide what goes in each region. Notice <code>header</code> and <code>sidebar</code> are plain props holding elements.</p>`,
        code: jsx(`function Layout({ header, sidebar, children }) {
  return (
    <div className="grid">
      <header>{header}</header>
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  );
}

function SettingsPage({ user }) {
  return (
    <Layout header={<Nav user={user} />} sidebar={<SettingsMenu />}>
      <h1>Settings</h1>
      <SettingsForm />
    </Layout>
  );
}`, 'Named slots')
      },
      {
        title: 'Render prop: the slot receives data',
        html: `<p>The child asks the parent "what should I draw for this data?" by calling a function. Here a list component handles loading and layout, and the caller decides how one item looks.</p>`,
        code: jsx(`function List({ items, renderItem }) {
  return <ul>{items.map((it) => <li key={it.id}>{renderItem(it)}</li>)}</ul>;
}

const page = (
  <>
    <List items={users} renderItem={(u) => <strong>{u.name}</strong>} />
    <List items={products} renderItem={(p) => <span>{p.name}: {p.price}</span>} />
  </>
);`, 'Render prop')
      },
      {
        title: 'Beating prop drilling with composition',
        html: `<p>Instead of passing <code>user</code> through three layers, build the avatar where the user is known and hand it down as a slot: <code>&lt;Header avatar={&lt;Avatar user={user} /&gt;} /&gt;</code>. <code>Header</code> and <code>Layout</code> don't know what a user is. Before reaching for Context, ask "can I pass the finished element instead of the raw data?".</p>`
      },
      {
        title: 'Specialisation by wrapping, not inheriting',
        html: `<p><code>function DangerButton(props) { return &lt;Button variant="danger" {...props} /&gt;; }</code> and <code>function SubmitButton(props) { return &lt;Button type="submit" {...props} /&gt;; }</code>. The generic <code>Button</code> stays small, and the specific ones are one-liners. Teams build whole design systems from this pattern.</p>`
      }
    ],
    deepDive: `<h5>🟣 Why not inheritance?</h5>
      <p>Inheritance couples a child to the internals of its parent and gets messy when you want two behaviours (a button that is both "loading" and "danger"). Composition keeps each piece independent, is easy to type, and matches how elements already nest. React's team has stated they found no use case that needed component inheritance hierarchies.</p>
      <h5>🟣 Compound components with Context</h5>
      <p>For a real Tabs/Accordion API the parent creates a Context holding <code>{ openId, toggle }</code>, and sub-components (<code>Accordion.Item</code>, <code>Accordion.Trigger</code>, <code>Accordion.Panel</code>) read it. The caller gets total layout freedom with no prop plumbing, e.g. putting an icon between trigger and panel. The cost: more indirection, and consumers must be inside the provider. Use <code>Children.map</code> + <code>cloneElement</code> only in legacy code: it breaks when someone wraps a child in another component.</p>
      <h5>🟣 Why composition helps performance</h5>
      <p>A component that receives <code>children</code> created by its parent is not responsible for re-creating them. When the wrapper's own state changes, React sees the <b>same child element objects</b> and skips them (the "children as props" trick from the rendering topic). So a state-holding wrapper like <code>Accordion</code> or a mouse tracker re-renders cheaply even when its content is large.</p>
      <h5>🟣 API design guidance</h5>
      <p>Prefer <code>children</code> for the main content, named slots for secondary regions, and a function prop only when you must pass data back. Let consumers control state when they need to (<code>openId</code> + <code>onOpenChange</code>) while providing an internal default (uncontrolled) for the easy case. Keep components accessible by default: roles, <code>aria-expanded</code>, <code>aria-controls</code>, keyboard support. Document which elements the slot may contain.</p>
      <h5>🟣 Server Components note</h5>
      <p>In React Server Components, a server component can pass server-rendered children to a <b>client</b> component (like our stateful <code>Accordion</code>). The client component ships only its own JS, while the content stays server-rendered. Composition is precisely what makes this "interleaving" possible, which is one more reason it is the idiomatic pattern.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI loves to generate components with a dozen props like <code>showHeader</code>, <code>headerText</code>, <code>headerIcon</code>, <code>footerText</code>. This is a "config explosion" and is the opposite of composition. Good API design (children and slots) is what keeps AI-generated code maintainable.</p>
      <p><b>Use AI as a partner:</b> <code>Refactor this component to use children and named slots instead of boolean flags. Explain how callers use the new API and show two usage examples.</code> Also ask it to list accessibility requirements for the pattern (accordion, tabs, dialog) before you accept the code.</p>
      <p><b>Where AI goes wrong:</b> it uses <code>cloneElement</code> hacks, forgets ARIA attributes and keyboard handling, puts state in each item (so "one open at a time" fails), or builds a deeply nested generic component with too many props.</p>
      <p><b>What you must still own:</b> an API that reads well at the call site, correct ownership of state, and accessibility. Be ready to build a tabs or accordion from scratch in 20 minutes.</p>`,
    problems: [{
      title: 'Accordion via Composition (One Open at a Time)',
      level: 'Medium', tags: ['composition', 'children', 'lifting state', 'accessibility'], companies: ['Google', 'Adobe', 'Zoho'],
      statement: `<p>Build an <code>Accordion</code> component that takes <code>items</code> (<code>{ id, title, content }</code>, where <code>content</code> is any JSX). Clicking a title opens that section and closes any other. Clicking the open title closes it. A sub-component <code>AccordionItem</code> must be presentational (no state). Use semantic <code>button</code>s with <code>aria-expanded</code>.</p>`,
      constraints: `State only in <code>Accordion</code>. <code>content</code> must be rendered via <code>children</code> of <code>AccordionItem</code>, not hard-coded. 1 to 50 items; ids unique strings.`,
      example: `${H.table(['Clicks', 'Open section'], [['(none)', 'none'], ['Shipping', 'Shipping'], ['Returns', 'Returns (Shipping closed)'], ['Returns again', 'none']])}
        <p>${H.c('g', 'Why')}: the container stores a single <code>openId</code>; each item only receives <code>isOpen</code> and <code>onToggle</code>.</p>`,
      brute: { why: `<p>Each item keeps its own <code>isOpen</code> state. A section cannot know about its siblings, so several can be open at once, and "only one" would need hacks like a global variable or DOM queries to close the others.</p>`, code: jsx(`function BadItem({ title, children }) {
  const [open, setOpen] = useState(false);                // each item has its own memory
  return (
    <section>
      <button onClick={() => setOpen(!open)}>{title}</button>
      {open && <div>{children}</div>}
    </section>
  );
}
// "Only one open" is impossible here without hacks.`, 'State inside every item') },
      mcq: { q: 'To make "only one section open at a time" work, where should the "which is open" state live?', options: ['Inside every AccordionItem', 'In the Accordion container (the parent of all items)', 'In a global variable outside React', 'In the section content'], answer: 1, explain: 'The behaviour involves all siblings, so the state must be in their common parent. Items get isOpen and onToggle as props (lifting state up + composition).' },
      hints: [
        `<p>Hint 1: Does one section need to know about the others? Then who must hold the knowledge?</p>`,
        `<p>Hint 2: The container stores <code>openId</code> (or <code>null</code>). Each item receives <code>isOpen={openId === item.id}</code> and <code>onToggle</code>.</p>`,
        `<p>Hint 3: Recipe: <code>AccordionItem({ title, isOpen, onToggle, children, panelId })</code> renders a heading with a button (<code>aria-expanded</code>) and, when open, a div with <code>{children}</code>. <code>Accordion</code> maps items to <code>&lt;AccordionItem key=...&gt;{item.content}&lt;/AccordionItem&gt;</code> and toggles with <code>openId === id ? null : id</code>.</p>`
      ],
      solution: {
        approach: `<p>The container is the single owner of <code>openId</code>. <code>AccordionItem</code> is a pure view of props plus a callback. The content flows in as <code>children</code>, so the same accordion can show text, a form or another accordion. Semantic buttons give keyboard and screen-reader support for free.</p>`,
        code: jsx(`import { useState } from 'react';

function AccordionItem({ panelId, title, isOpen, onToggle, children }) {
  return (
    <section>
      <h3>
        <button aria-expanded={isOpen} aria-controls={panelId} onClick={onToggle}>
          {title}
        </button>
      </h3>
      {isOpen && <div id={panelId} role="region">{children}</div>}
    </section>
  );
}

export default function Accordion({ items }) {
  const [openId, setOpenId] = useState(null);

  return (
    <div>
      {items.map((it) => (
        <AccordionItem
          key={it.id}
          panelId={'panel-' + it.id}
          title={it.title}
          isOpen={openId === it.id}
          onToggle={() => setOpenId((cur) => (cur === it.id ? null : it.id))}
        >
          {it.content}
        </AccordionItem>
      ))}
    </div>
  );
}`, 'Solution'),
        alt: [jsrun(`// Model of the accordion logic: the container owns openId; items are views.
function render(items, openId) {
  return items.map((it) => (it.id === openId ? '[-] ' + it.title + ' => ' + it.content : '[+] ' + it.title)).join('\\n');
}
function makeAccordion(items) {
  let openId = null;
  return {
    click(id) { openId = openId === id ? null : id; },
    show() { return render(items, openId); }
  };
}
const acc = makeAccordion([
  { id: 'ship', title: 'Shipping', content: 'Free over 500' },
  { id: 'ret', title: 'Returns', content: '30 days, no questions' }
]);
console.log('initial\\n' + acc.show());
acc.click('ship'); console.log('click Shipping\\n' + acc.show());
acc.click('ret');  console.log('click Returns\\n' + acc.show());
acc.click('ret');  console.log('click Returns again\\n' + acc.show());`, 'Plain JS model (runnable)')],
        complexity: `<p>O(n) render for n items; a click is O(1) state change. Only the open panel's children are mounted.</p>`,
        followUps: ['Allow multiple open sections with a prop <code>allowMultiple</code>. What changes in the state shape?', 'Make it a compound component with Context so callers can order the pieces freely.']
      }
    }]
  });

  /* ======================= PRACTICE: EASY ======================= */
  practice.push({
    title: 'Greeting with Props and a Default Name', level: 'Easy', tags: ['props', 'default values', 'conditional rendering'], companies: ['TCS', 'Infosys'],
    statement: `<p>Write a <code>Greeting</code> component. It takes an optional <code>name</code> (default <code>"friend"</code>) and an optional boolean <code>excited</code>. It renders <code>Hello, &lt;name&gt;.</code> or, when <code>excited</code> is true, <code>Hello, &lt;name&gt;!</code>. Use it three ways: with a name, with nothing, and with <code>excited</code> only.</p>`,
    constraints: `Function component, destructured props with defaults, no state. One root element.`,
    example: `${H.table(['Usage', 'Output'], [['<code>&lt;Greeting name="Asha" /&gt;</code>', 'Hello, Asha.'], ['<code>&lt;Greeting /&gt;</code>', 'Hello, friend.'], ['<code>&lt;Greeting excited /&gt;</code>', 'Hello, friend!']])}
      <p>${H.c('g', 'Why')}: a JSX attribute with no value (<code>excited</code>) means <code>excited={true}</code>.</p>`,
    brute: { why: `<p>Build the text with string concatenation and write it into the page with <code>innerHTML</code>. That bypasses React, is easy to break with special characters, and opens an XSS hole if the name comes from a user.</p>`, code: jsx(`function badGreeting(name, excited) {
  const text = 'Hello, ' + (name || 'friend') + (excited ? '!' : '.');
  document.getElementById('out').innerHTML = text;   // direct DOM, unescaped
}`, 'Direct DOM write') },
    mcq: { q: 'In <code>&lt;Greeting excited /&gt;</code>, what value does the <code>excited</code> prop have?', options: ['undefined', 'true', 'the string "excited"', 'false'], answer: 1, explain: 'A JSX attribute written without a value is shorthand for {true}, just like a boolean HTML attribute.' },
    hints: [
      `<p>Hint 1: Which values change between the usages? Those are the props.</p>`,
      `<p>Hint 2: Default parameter values: <code>{ name = "friend", excited = false }</code>.</p>`,
      `<p>Hint 3: Return one <code>&lt;p&gt;</code> with <code>Hello, {name}{excited ? "!" : "."}</code>.</p>`
    ],
    solution: {
      approach: `<p>Props with defaults cover missing values. The ternary chooses the punctuation. React escapes <code>{name}</code> automatically, so a user-supplied name is safe.</p>`,
      code: jsx(`export default function Greeting({ name = 'friend', excited = false }) {
  return <p>Hello, {name}{excited ? '!' : '.'}</p>;
}

export function Demo() {
  return (
    <>
      <Greeting name="Asha" />
      <Greeting />
      <Greeting excited />
    </>
  );
}`, 'Solution'),
      alt: [jsrun(`function Greeting({ name = 'friend', excited = false }) { return 'Hello, ' + name + (excited ? '!' : '.'); }
console.log(Greeting({ name: 'Asha' }));
console.log(Greeting({}));
console.log(Greeting({ excited: true }));`, 'Plain JS model (runnable)')],
      complexity: `<p>O(1) time and space: one conditional and one string.</p>`,
      followUps: ['What if name is an empty string? Should it fall back to "friend"?']
    }
  });

  practice.push({
    title: 'Like Button That Toggles', level: 'Easy', tags: ['useState', 'events', 'derived state'], companies: ['Meta', 'ShareChat'],
    statement: `<p>Build <code>LikeButton({ initialLikes })</code>. It shows a heart button and the number of likes. Clicking toggles between liked and not liked. When liked the count is <code>initialLikes + 1</code> and the heart is filled; clicking again goes back to <code>initialLikes</code>.</p>`,
    constraints: `Store only <b>one</b> piece of state. The count must be derived. Use the updater form for the toggle.`,
    example: `${H.table(['Click', 'Heart', 'Count (initialLikes = 41)'], [['(start)', 'empty', '41'], ['1st click', 'filled', '42'], ['2nd click', 'empty', '41']])}
      <p>${H.c('g', 'Why')}: <code>liked</code> is the only fact that changes. The count is <code>initialLikes + (liked ? 1 : 0)</code>.</p>`,
    brute: { why: `<p>Keep both <code>liked</code> and <code>count</code> in state and update both in the handler. Two copies of the truth must be changed together; forget one and the heart and number disagree (and a fast double-click can read a stale count).</p>`, code: jsx(`function BadLike({ initialLikes }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialLikes);
  function click() {
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);   // two states that must always move together
  }
  return <button onClick={click}>{liked ? '♥' : '♡'} {count}</button>;
}`, 'Two states for one fact') },
    mcq: { q: 'Which is the minimal state for the like button?', options: ['liked (boolean) only', 'count (number) only', 'both liked and count', 'neither, use a variable'], answer: 0, explain: 'The count follows from initialLikes and liked, so store liked and derive the count.' },
    hints: [
      `<p>Hint 1: What exactly does the user change by clicking?</p>`,
      `<p>Hint 2: One boolean. Compute the number to display from it.</p>`,
      `<p>Hint 3: <code>setLiked(l =&gt; !l)</code>; <code>const count = initialLikes + (liked ? 1 : 0)</code>; render a button with <code>aria-pressed={liked}</code>.</p>`
    ],
    solution: {
      approach: `<p>One boolean state, one derived number. <code>aria-pressed</code> tells assistive tech the button is a toggle. The updater form <code>l =&gt; !l</code> is safe even if the handler runs twice before a render.</p>`,
      code: jsx(`import { useState } from 'react';

export default function LikeButton({ initialLikes }) {
  const [liked, setLiked] = useState(false);
  const count = initialLikes + (liked ? 1 : 0);        // derived, never stored

  return (
    <button aria-pressed={liked} onClick={() => setLiked((l) => !l)}>
      {liked ? '♥' : '♡'} {count}
    </button>
  );
}`, 'Solution'),
      alt: [jsrun(`let liked = false;
const view = (initialLikes) => (liked ? '♥ ' : '♡ ') + (initialLikes + (liked ? 1 : 0));
const click = () => { liked = !liked; };
console.log(view(41)); click(); console.log(view(41)); click(); console.log(view(41));`, 'Plain JS model (runnable)')],
      complexity: `<p>O(1) work per click and one re-render of this button.</p>`,
      followUps: ['Make it a controlled component: <code>liked</code> and <code>onToggle</code> as props. Who owns the state now?']
    }
  });

  practice.push({
    title: 'Render a List of Names with an Empty Message', level: 'Easy', tags: ['lists', 'keys', 'conditional rendering'], companies: ['Wipro', 'Cognizant'],
    statement: `<p>Write <code>NameList({ people })</code> where <code>people</code> is an array of <code>{ id, name }</code>. It renders a bulleted list with each name. If the array is empty it renders the text "No one here yet". Two different people may have the same name.</p>`,
    constraints: `Every <code>li</code> needs a correct key. Do not use the array index or the name as the key. 0 to 1000 people.`,
    example: `${H.table(['Input', 'Output'], [['[{id:1,name:"Asha"},{id:2,name:"Asha"}]', '• Asha<br>• Asha'], ['[]', 'No one here yet']])}
      <p>${H.c('g', 'Why')}: names can repeat, so the name is not unique. The <code>id</code> is stable and unique.</p>`,
    brute: { why: `<p>Use the name as the key (duplicates give duplicate-key warnings and React can drop or duplicate rows) or the index (breaks on reorder/delete) and show an empty <code>&lt;ul&gt;</code> with no message.</p>`, code: jsx(`function BadNameList({ people }) {
  return <ul>{people.map((p) => <li key={p.name}>{p.name}</li>)}</ul>;   // duplicate keys for two Ashas
}`, 'Name as key') },
    mcq: { q: 'Two people are both named "Asha". Which key is correct?', options: ['key={person.name}', 'key={index}', 'key={person.id}', 'No key is needed'], answer: 2, explain: 'The id is unique and stable. Names can collide and indexes shift when the list changes.' },
    hints: [
      `<p>Hint 1: What identifies one person no matter where they are in the array?</p>`,
      `<p>Hint 2: Handle the empty array first with an early return.</p>`,
      `<p>Hint 3: <code>if (people.length === 0) return &lt;p&gt;No one here yet&lt;/p&gt;;</code> then <code>&lt;ul&gt;{people.map(p =&gt; &lt;li key={p.id}&gt;{p.name}&lt;/li&gt;)}&lt;/ul&gt;</code>.</p>`
    ],
    solution: {
      approach: `<p>Early return for the empty state, then map with a stable id key. We check <code>=== 0</code> rather than relying on <code>length &amp;&amp;</code> so no stray "0" can appear.</p>`,
      code: jsx(`export default function NameList({ people }) {
  if (people.length === 0) return <p>No one here yet</p>;
  return (
    <ul>
      {people.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}`, 'Solution'),
      alt: [jsrun(`function nameList(people) {
  if (people.length === 0) return 'No one here yet';
  return people.map((p) => '* ' + p.name + ' (key=' + p.id + ')').join('\\n');
}
console.log(nameList([{ id: 1, name: 'Asha' }, { id: 2, name: 'Asha' }]));
console.log(nameList([]));`, 'Plain JS model (runnable)')],
      complexity: `<p>O(n) to render n names.</p>`,
      followUps: ['What if the data has no id yet (a draft row)? Where would you create one?']
    }
  });

  practice.push({
    title: 'Live Character Counter for a Textarea', level: 'Easy', tags: ['controlled inputs', 'derived state', 'forms'], companies: ['Twitter/X', 'LinkedIn'],
    statement: `<p>Build <code>Composer({ limit = 100, onSend })</code>: a textarea with a counter showing the remaining characters. When the remaining count goes below 0, show the counter in red with the text "Over by N" and disable the Send button. Also disable Send when the text is empty or only spaces. On send, call <code>onSend(text)</code> and clear the box.</p>`,
    constraints: `Controlled textarea (<code>value</code> + <code>onChange</code>). Remaining is derived. Do not use <code>maxLength</code>, users may paste longer text and see how much to cut.`,
    example: `${H.table(['Text length', 'Counter', 'Send'], [['0', '100', 'disabled (empty)'], ['40', '60', 'enabled'], ['100', '0', 'enabled'], ['108', '<span class="c-r">Over by 8</span>', 'disabled']])}`,
    brute: { why: `<p>Listen to the DOM <code>input</code> event, read <code>textarea.value.length</code> and update a <code>span</code> by hand. State and screen are separate, the button state is easy to forget, and clearing the box after send needs more DOM code.</p>`, code: jsx(`function badSetup() {
  const area = document.querySelector('textarea');
  area.addEventListener('input', () => {
    document.querySelector('#count').textContent = 100 - area.value.length;   // manual DOM sync
  });
}`, 'Manual DOM updates') },
    mcq: { q: 'What should the remaining-characters value be?', options: ['A separate useState updated in onChange', 'A value computed from the text state during render', 'Read from the DOM in useEffect', 'A ref'], answer: 1, explain: 'remaining = limit - text.length is derived from state. Storing it separately duplicates the truth.' },
    hints: [
      `<p>Hint 1: Only the text is real data. What else can be computed from it?</p>`,
      `<p>Hint 2: <code>remaining = limit - text.length</code> and <code>canSend = text.trim() !== "" &amp;&amp; remaining &gt;= 0</code>.</p>`,
      `<p>Hint 3: Use a <code>&lt;form onSubmit&gt;</code> with <code>preventDefault</code>, call <code>onSend(text.trim())</code>, then <code>setText("")</code>. Show the red message with a ternary on <code>remaining &lt; 0</code>.</p>`
    ],
    solution: {
      approach: `<p>One state (the text); two derived values. A form handles Enter/click uniformly. The counter text and its class come from the same derived number.</p>`,
      code: jsx(`import { useState } from 'react';

export default function Composer({ limit = 100, onSend }) {
  const [text, setText] = useState('');
  const remaining = limit - text.length;                 // derived
  const canSend = text.trim() !== '' && remaining >= 0;  // derived

  function submit(e) {
    e.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  }

  return (
    <form onSubmit={submit}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" />
      <span className={remaining < 0 ? 'count over' : 'count'}>
        {remaining < 0 ? 'Over by ' + -remaining : remaining}
      </span>
      <button type="submit" disabled={!canSend}>Send</button>
    </form>
  );
}`, 'Solution'),
      alt: [jsrun(`function composer(text, limit = 100) {
  const remaining = limit - text.length;
  return { counter: remaining < 0 ? 'Over by ' + -remaining : String(remaining), sendDisabled: !(text.trim() !== '' && remaining >= 0) };
}
console.log(composer(''));
console.log(composer('x'.repeat(40)));
console.log(composer('x'.repeat(100)));
console.log(composer('x'.repeat(108)));
console.log(composer('     '));`, 'Plain JS model (runnable)')],
      complexity: `<p>O(1) per keystroke (string length is O(1)).</p>`,
      followUps: ['Count Unicode characters (emoji) correctly. Why is <code>text.length</code> not always right?']
    }
  });

  /* ======================= PRACTICE: MEDIUM ======================= */
  practice.push({
    title: 'Filterable Product Table', level: 'Medium', tags: ['lifting state', 'derived state', 'lists', 'composition'], companies: ['Amazon', 'Meta', 'Flipkart'],
    statement: `<p>Build the classic <b>FilterableProductTable</b>. Given products <code>{ id, category, name, price, stocked }</code>, show a search box, an "Only show products in stock" checkbox, and a table grouped by category (a heading row for each category, then its products). Typing filters by name (case-insensitive). Products out of stock are shown in red. Categories with no matching products must not appear.</p>`,
    constraints: `Break into components: <code>FilterableProductTable</code>, <code>SearchBar</code>, <code>ProductTable</code>, <code>ProductCategoryRow</code>, <code>ProductRow</code>. Only two pieces of state. Do not store the filtered list. Up to 2000 products.`,
    example: `${H.table(['Search', 'In stock only', 'Rows shown'], [['""', 'no', 'all categories and products'], ['"ap"', 'no', 'Fruits: Apple; (Vegetables only if a name has "ap")'], ['""', 'yes', 'products with stocked = true only'], ['"zzz"', 'no', 'no rows (show "No products match")']])}
      <p>${H.c('g', 'Why')}: <code>filterText</code> and <code>inStockOnly</code> live in the parent, and the table computes the rows during render.</p>`,
    brute: { why: `<p>Keep a <code>visibleProducts</code> state and update it from inside both input handlers. Two handlers must each remember the other filter's current value, so it is easy to apply only one filter. The list in state can also go stale when the products prop changes.</p>`, code: jsx(`function BadTable({ products }) {
  const [visible, setVisible] = useState(products);
  const onSearch = (text) => setVisible(products.filter((p) => p.name.includes(text)));   // forgot the checkbox!
  const onStock = (only) => setVisible(only ? products.filter((p) => p.stocked) : products); // forgot the text!
  return <ul>{visible.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}`, 'Filtered list in state') },
    mcq: { q: 'Where should <code>filterText</code> live?', options: ['In SearchBar only', 'In ProductTable only', 'In FilterableProductTable, the closest common parent of SearchBar and ProductTable', 'In a global variable'], answer: 2, explain: 'Both SearchBar (to edit) and ProductTable (to filter) need it, so it is lifted to their closest common parent.' },
    hints: [
      `<p>Hint 1: Who needs the search text? Who needs the checkbox value? Find their closest common parent.</p>`,
      `<p>Hint 2: Parent holds <code>filterText</code> and <code>inStockOnly</code>; SearchBar gets values + setters; ProductTable gets values and does the filtering itself.</p>`,
      `<p>Hint 3: Filter first, then walk the filtered list adding a category row whenever the category changes (sort/group by category). Use a key per row; category rows can use <code>"cat-" + category</code>.</p>`
    ],
    solution: {
      approach: `<p>Lift the two filter values to the parent. In <code>ProductTable</code>, <b>derive</b> the visible products with <code>filter</code>, then group them by category while rendering. Empty categories vanish naturally because they have no products. The runnable model contains the pure filter+group logic, which is also what you would unit test.</p>`,
      code: jsx(`import { useState } from 'react';

function SearchBar({ filterText, inStockOnly, onFilterTextChange, onInStockOnlyChange }) {
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <input value={filterText} placeholder="Search..." onChange={(e) => onFilterTextChange(e.target.value)} />
      <label>
        <input type="checkbox" checked={inStockOnly} onChange={(e) => onInStockOnlyChange(e.target.checked)} />
        {' '}Only show products in stock
      </label>
    </form>
  );
}

function ProductTable({ products, filterText, inStockOnly }) {
  const q = filterText.trim().toLowerCase();
  const visible = products.filter((p) => p.name.toLowerCase().includes(q) && (!inStockOnly || p.stocked));
  if (visible.length === 0) return <p>No products match</p>;

  const rows = [];
  let lastCategory = null;
  visible.forEach((p) => {
    if (p.category !== lastCategory) {                       // new group: add a heading row
      rows.push(<tr key={'cat-' + p.category}><th colSpan={2}>{p.category}</th></tr>);
      lastCategory = p.category;
    }
    rows.push(
      <tr key={p.id}>
        <td style={{ color: p.stocked ? 'inherit' : 'red' }}>{p.name}</td>
        <td>{p.price}</td>
      </tr>
    );
  });
  return <table><tbody>{rows}</tbody></table>;
}

export default function FilterableProductTable({ products }) {
  const [filterText, setFilterText] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  return (
    <div>
      <SearchBar filterText={filterText} inStockOnly={inStockOnly}
        onFilterTextChange={setFilterText} onInStockOnlyChange={setInStockOnly} />
      <ProductTable products={products} filterText={filterText} inStockOnly={inStockOnly} />
    </div>
  );
}`, 'Solution'),
      alt: [jsrun(`const products = [
  { id: 1, category: 'Fruits', name: 'Apple', price: '$1', stocked: true },
  { id: 2, category: 'Fruits', name: 'Dragonfruit', price: '$1', stocked: true },
  { id: 3, category: 'Fruits', name: 'Passionfruit', price: '$2', stocked: false },
  { id: 4, category: 'Vegetables', name: 'Spinach', price: '$2', stocked: true },
  { id: 5, category: 'Vegetables', name: 'Pumpkin', price: '$4', stocked: false },
  { id: 6, category: 'Vegetables', name: 'Peas', price: '$1', stocked: true }
];
// Pure logic: filter, then group. This is what ProductTable computes on every render.
function visibleRows(products, filterText, inStockOnly) {
  const q = filterText.trim().toLowerCase();
  const visible = products.filter((p) => p.name.toLowerCase().includes(q) && (!inStockOnly || p.stocked));
  const rows = []; let last = null;
  for (const p of visible) {
    if (p.category !== last) { rows.push('== ' + p.category + ' =='); last = p.category; }
    rows.push(p.name + ' ' + p.price + (p.stocked ? '' : ' (out of stock)'));
  }
  return rows.length ? rows : ['No products match'];
}
console.log(visibleRows(products, '', false).join('\\n'));
console.log('--- "p", in stock only');
console.log(visibleRows(products, 'p', true).join('\\n'));
console.log('--- "zzz"');
console.log(visibleRows(products, 'zzz', false).join('\\n'));`, 'Plain JS model (runnable)')],
      complexity: `<p>Each render is O(n) for n products (filter + one pass). For thousands of rows, memoise the filtered list with <code>useMemo</code> or virtualise.</p>`,
      followUps: ['Debounce the search input. Which state would you debounce, the typed text or the filter?', 'Sort by price when a header is clicked: where does the sort key live?']
    }
  });

  practice.push({
    title: 'Explain and Fix a Key-Related Bug', level: 'Medium', tags: ['keys', 'reconciliation', 'debugging', 'explain'], companies: ['Google', 'Atlassian', 'Razorpay'],
    statement: `<p>A teammate reports: <i>"I typed 'hello' into the first row's box and pressed 'Add to top'. The 'hello' did not move down with item A, it stayed at the top next to the NEW item."</i> The code is below. (1) Explain precisely what React does and why the text stays in position 0. (2) Fix it. (3) Name one situation where <code>key={index}</code> would actually have been fine.</p>
      <pre>function Row({ label }) {
  const [note, setNote] = useState('');     // each row remembers a note
  return &lt;li&gt;{label}: &lt;input value={note} onChange={e =&gt; setNote(e.target.value)} /&gt;&lt;/li&gt;;
}
function List() {
  const [items, setItems] = useState(['A', 'B', 'C']);
  return (
    &lt;&gt;
      &lt;button onClick={() =&gt; setItems(['X', ...items])}&gt;Add to top&lt;/button&gt;
      &lt;ul&gt;{items.map((label, i) =&gt; &lt;Row key={i} label={label} /&gt;)}&lt;/ul&gt;
    &lt;/&gt;
  );
}</pre>`,
    constraints: `Explain in terms of <b>key, type and position</b>. The fix must keep notes with the item they were typed for. Items are unique strings.`,
    example: `${H.table(['Step', 'Rows (key → label, note)'], [['Start', '0→A "hello", 1→B "", 2→C ""'], ['Add X on top (index keys)', '0→<b>X</b> "hello" (wrong!), 1→A "", 2→B "", 3→C "" (new)'], ['Add X on top (item keys)', 'X "" (new), A "hello", B "", C ""']])}
      <p>${H.c('g', 'Why')}: with index keys React thinks "key 0 is still there, just give it the new label X". The component instance (and its <code>note</code> state) is reused for a different item.</p>`,
    brute: { why: `<p>"Fix" it by forcing a remount every render with <code>key={Math.random()}</code>, or by resetting notes in an effect. Random keys destroy all state and the focused input on every keystroke; an effect fights React instead of using identity.</p>`, code: jsx(`function BadFix({ items }) {
  return <ul>{items.map((label) => <Row key={Math.random()} label={label} />)}</ul>;   // remounts all rows each render
}`, 'Random keys') },
    mcq: { q: 'After inserting X at the top with <code>key={index}</code>, which row instance is created new (mounted fresh)?', options: ['The one for X (index 0)', 'The one at the last index (index 3)', 'All of them', 'None'], answer: 1, explain: 'Keys 0, 1, 2 already existed so those instances are reused with new props. Only the new key 3 has no previous instance, so it is created, and it shows C.' },
    hints: [
      `<p>Hint 1: How does React decide whether an element is "the same one as before"? Think key and type.</p>`,
      `<p>Hint 2: List the keys before and after the insertion. Which keys appear in both lists?</p>`,
      `<p>Hint 3: Use the item itself (or an id) as the key. The explanation: keys 0,1,2 existed, so those instances are reused with different <code>label</code> props, keeping their <code>note</code> state; a new instance is created for key 3.</p>`
    ],
    solution: {
      approach: `<p><b>What happens:</b> before the click the keys are 0,1,2. After the click they are 0,1,2,3. React matches by key: instances for 0,1,2 are <b>reused</b> (same type, same key) and just receive new <code>label</code> props (X, A, B); key 3 is new, so a new Row is mounted for C. State (<code>note</code>) lives in the instance, so "hello" stays in the instance at key 0, now labelled X. <b>Fix:</b> use the item's identity as the key, so React sees A, B, C as the same instances (they just move down) and only X is new. <b>When index is fine:</b> a static list that is never reordered/inserted/deleted and whose rows hold no state.</p>`,
      code: jsx(`function Row({ label }) {
  const [note, setNote] = useState('');
  return (
    <li>
      {label}: <input value={note} onChange={(e) => setNote(e.target.value)} />
    </li>
  );
}

function List() {
  const [items, setItems] = useState(['A', 'B', 'C']);   // unique strings can be their own key
  return (
    <>
      <button onClick={() => setItems((list) => ['X' + list.length, ...list])}>Add to top</button>
      <ul>
        {/* the label is the identity, not the position */}
        {items.map((label) => (
          <Row key={label} label={label} />
        ))}
      </ul>
    </>
  );
}`, 'Fixed with stable keys'),
      alt: [jsrun(`// Simulate instance reuse. Each instance remembers 'note'. The user typed "hello" in A's row.
function update(oldRows, newLabels, keyOf) {
  const byKey = new Map(oldRows.map((r, i) => [keyOf(r.label, i), r]));
  return newLabels.map((label, i) => {
    const old = byKey.get(keyOf(label, i));
    return old ? { label, note: old.note, how: 'reused' } : { label, note: '', how: 'created' };
  });
}
const show = (rows) => rows.map((r) => r.label + '[' + r.note + '](' + r.how + ')').join('  ');
const start = [{ label: 'A', note: 'hello' }, { label: 'B', note: '' }, { label: 'C', note: '' }];
const next = ['X', 'A', 'B', 'C'];
console.log('index keys :', show(update(start, next, (l, i) => i)));
console.log('item keys  :', show(update(start, next, (l) => l)));`, 'Plain JS model of the bug (runnable)')],
      complexity: `<p>Matching by key is O(n) using a map of old children, so the fix costs nothing extra.</p>`,
      followUps: ['How would a sortable table with checkboxes show the same bug?', 'What if two items could have the same label?']
    }
  });

  practice.push({
    title: 'Tabs: Unmount or Keep Mounted?', level: 'Medium', tags: ['conditional rendering', 'state', 'composition'], companies: ['Notion', 'Zoho'],
    statement: `<p>Build <code>Tabs({ tabs, keepMounted = false })</code> where <code>tabs</code> is <code>[{ id, label, content }]</code> and <code>content</code> is JSX. Clicking a tab label shows its content. With <code>keepMounted</code> false only the active panel is rendered (state inside inactive panels is lost). With <code>keepMounted</code> true all panels stay rendered and inactive ones are hidden (state is kept, e.g. text typed in a form). Use <code>role="tablist"</code>, <code>role="tab"</code>, <code>aria-selected</code> and <code>role="tabpanel"</code>.</p>`,
    constraints: `Active tab id in state, defaulting to the first tab. Hide with the <code>hidden</code> attribute, not by removing from the DOM, in keepMounted mode. 1 to 20 tabs.`,
    example: `${H.table(['keepMounted', 'Type in tab A, go to B, back to A', 'Why'], [['false', 'Text is gone', 'Panel A was unmounted, its state destroyed'], ['true', 'Text is still there', 'Panel A stayed mounted (hidden)']])}`,
    brute: { why: `<p>Hard-code three buttons and three panels with <code>display</code> toggled by manual DOM calls. It cannot be reused, ARIA attributes are forgotten, and the mount/unmount choice is baked in.</p>`, code: jsx(`function BadTabs() {
  return (
    <div>
      <button onClick={() => { document.getElementById('a').style.display = 'block'; document.getElementById('b').style.display = 'none'; }}>A</button>
      <button onClick={() => { document.getElementById('b').style.display = 'block'; document.getElementById('a').style.display = 'none'; }}>B</button>
      <div id="a">Panel A</div>
      <div id="b" style={{ display: 'none' }}>Panel B</div>
    </div>
  );
}`, 'Manual DOM toggling') },
    mcq: { q: 'With <code>{active === "a" &amp;&amp; &lt;PanelA /&gt;}</code>, what happens to PanelA\'s internal state when you switch to tab B?', options: ['It is kept, hidden', 'It is destroyed because PanelA unmounts', 'It is copied to PanelB', 'It is saved in localStorage automatically'], answer: 1, explain: 'When the condition becomes false the component is removed from the tree; React destroys its state. Coming back mounts a fresh instance.' },
    hints: [
      `<p>Hint 1: What is the only thing that decides which panel is visible?</p>`,
      `<p>Hint 2: <code>activeId</code> in state. Render all tab buttons; for panels decide between rendering only the active one or all with <code>hidden</code>.</p>`,
      `<p>Hint 3: In keepMounted mode map all tabs to <code>&lt;div role="tabpanel" hidden={t.id !== activeId}&gt;</code>. Otherwise find the active tab and render its panel only.</p>`
    ],
    solution: {
      approach: `<p>One piece of state (<code>activeId</code>). The tab strip is a map over <code>tabs</code>. The panel logic is a single branch on <code>keepMounted</code>. This shows the difference between "not rendering" (unmount) and "hiding" (stays mounted).</p>`,
      code: jsx(`import { useState } from 'react';

export default function Tabs({ tabs, keepMounted = false }) {
  const [activeId, setActiveId] = useState(tabs[0].id);

  return (
    <div>
      <div role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={'tab-' + t.id}
            aria-selected={t.id === activeId}
            aria-controls={'panel-' + t.id}
            onClick={() => setActiveId(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {keepMounted
        ? tabs.map((t) => (
            <div key={t.id} role="tabpanel" id={'panel-' + t.id} hidden={t.id !== activeId}>
              {t.content}
            </div>
          ))
        : tabs.filter((t) => t.id === activeId).map((t) => (
            <div key={t.id} role="tabpanel" id={'panel-' + t.id}>{t.content}</div>
          ))}
    </div>
  );
}`, 'Solution'),
      alt: [jsrun(`// Model: a panel's "typed text" survives only if the panel stays mounted.
function simulate(keepMounted) {
  const mounted = new Map();            // id -> typed text (the panel's state)
  let active = 'a';
  const show = (id) => {
    if (keepMounted) { if (!mounted.has(id)) mounted.set(id, ''); }   // all stay mounted
    else { for (const k of [...mounted.keys()]) if (k !== id) mounted.delete(k); if (!mounted.has(id)) mounted.set(id, ''); }
    active = id;
  };
  show('a');
  mounted.set('a', 'draft text');       // user types in tab A
  show('b');                            // switch away
  show('a');                            // and back
  return 'keepMounted=' + keepMounted + ' -> text in A: "' + mounted.get('a') + '"';
}
console.log(simulate(false));
console.log(simulate(true));`, 'Plain JS model (runnable)')],
      complexity: `<p>keepMounted=false renders 1 panel (cheaper); true renders all n (state kept, more memory and effects).</p>`,
      followUps: ['Add arrow-key navigation between tabs. What extra tools do you need (refs, roving tabindex)?', 'Make the active tab controlled by the parent via <code>activeId</code> and <code>onChange</code>.']
    }
  });

  practice.push({
    title: 'Shopping Cart with Quantities and a Live Total', level: 'Medium', tags: ['lifting state', 'derived state', 'immutable updates'], companies: ['Amazon', 'BigBasket', 'Walmart'],
    statement: `<p>A page has a <code>ProductList</code> (each product has an "Add" button) and a <code>CartSummary</code> in the header that shows the total number of items and the total price. In the cart each line has <b>+</b> and <b>-</b> buttons; decreasing a quantity from 1 removes the line. Build it so both parts always agree.</p>`,
    constraints: `Product list is static data <code>{ id, name, price }</code>. Cart state: a map or array of <code>{ id, qty }</code>. Total and item count must be derived. Immutable updates only.`,
    example: `${H.table(['Action', 'Cart', 'Items / Total'], [['Add Tea (50)', 'Tea ×1', '1 / 50'], ['Add Tea', 'Tea ×2', '2 / 100'], ['Add Jam (120)', 'Tea ×2, Jam ×1', '3 / 220'], ['- on Tea twice', 'Jam ×1', '1 / 120']])}`,
    brute: { why: `<p>Give <code>ProductList</code> and <code>CartSummary</code> their own state and "send" the totals between them with custom events or a global variable. Totals stored separately from the lines drift apart whenever one update path forgets to adjust them.</p>`, code: jsx(`let totalGlobal = 0;                                   // shared mutable variable
function BadAdd({ price }) {
  return <button onClick={() => { totalGlobal += price; }}>Add</button>;   // React is never told
}`, 'Global mutable total') },
    mcq: { q: 'Which values should be stored in state?', options: ['items, total and lines', 'only the lines (id and qty); compute items and total', 'only the total', 'only the product prices'], answer: 1, explain: 'Items and total are functions of the lines and the product prices. Store the minimal data and derive the rest.' },
    hints: [
      `<p>Hint 1: ProductList and CartSummary both depend on the cart. Where must the cart live?</p>`,
      `<p>Hint 2: Parent <code>Shop</code> holds <code>cart = {}</code> (id → qty). Pass <code>cart</code>, <code>add</code>, <code>change</code> down.</p>`,
      `<p>Hint 3: <code>add</code>: <code>{ ...cart, [id]: (cart[id] || 0) + 1 }</code>. <code>change(id, delta)</code>: new qty; if &lt;= 0 build a copy without that key. Totals: loop over products with <code>qty</code>.</p>`
    ],
    solution: {
      approach: `<p>Lift the cart to <code>Shop</code>. Items and total are computed from <code>cart</code> and <code>PRODUCTS</code> on each render. Both state updates are pure functions (shown in the runnable tab) that never mutate the previous cart.</p>`,
      code: jsx(`import { useState } from 'react';

const PRODUCTS = [
  { id: 'tea', name: 'Tea', price: 50 },
  { id: 'jam', name: 'Jam', price: 120 }
];

export default function Shop() {
  const [cart, setCart] = useState({});                       // { tea: 2, jam: 1 }

  const change = (id, delta) =>
    setCart((c) => {
      const qty = (c[id] || 0) + delta;
      if (qty <= 0) { const { [id]: _removed, ...rest } = c; return rest; }   // drop the line
      return { ...c, [id]: qty };                                              // new object
    });

  const lines = PRODUCTS.filter((p) => cart[p.id]);
  const items = lines.reduce((n, p) => n + cart[p.id], 0);               // derived
  const total = lines.reduce((sum, p) => sum + cart[p.id] * p.price, 0);  // derived

  return (
    <div>
      <header>Cart: {items} items, total {total}</header>
      <ul>
        {PRODUCTS.map((p) => (
          <li key={p.id}>{p.name} ({p.price}) <button onClick={() => change(p.id, 1)}>Add</button></li>
        ))}
      </ul>
      <h3>Your cart</h3>
      {lines.length === 0 ? <p>Empty</p> : (
        <ul>
          {lines.map((p) => (
            <li key={p.id}>
              {p.name} x{cart[p.id]}
              <button onClick={() => change(p.id, -1)}>-</button>
              <button onClick={() => change(p.id, 1)}>+</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}`, 'Solution'),
      alt: [jsrun(`const PRODUCTS = [{ id: 'tea', name: 'Tea', price: 50 }, { id: 'jam', name: 'Jam', price: 120 }];
function change(cart, id, delta) {
  const qty = (cart[id] || 0) + delta;
  if (qty <= 0) { const next = { ...cart }; delete next[id]; return next; }   // copy, then remove
  return { ...cart, [id]: qty };
}
function summary(cart) {
  const lines = PRODUCTS.filter((p) => cart[p.id]);
  return lines.reduce((n, p) => n + cart[p.id], 0) + ' items / ' + lines.reduce((s, p) => s + cart[p.id] * p.price, 0);
}
let cart = {};
cart = change(cart, 'tea', 1);  console.log('add tea  ', summary(cart));
cart = change(cart, 'tea', 1);  console.log('add tea  ', summary(cart));
cart = change(cart, 'jam', 1);  console.log('add jam  ', summary(cart));
cart = change(cart, 'tea', -1); cart = change(cart, 'tea', -1);
console.log('tea x2 -> 0', summary(cart), JSON.stringify(cart));`, 'Plain JS model (runnable)')],
      complexity: `<p>Each update O(k) in the number of distinct products in the cart; totals O(k). Re-render cost grows with lines, not with history.</p>`,
      followUps: ['Persist the cart to localStorage. Which part is state and which is an effect?', 'How would a discount code change what is stored vs derived?']
    }
  });

  practice.push({
    title: 'Signup Form: One State Object and Password Match', level: 'Medium', tags: ['forms', 'controlled inputs', 'validation'], companies: ['Stripe', 'Paytm'],
    statement: `<p>Build <code>SignupForm</code> with fields name, email, password and confirm password. Use <b>one</b> state object and <b>one</b> change handler. Rules: name required; email valid; password at least 8 characters with at least one digit; confirm must match. Show each error only after the field was blurred or after a submit attempt. When valid and submitted, show "Welcome, &lt;name&gt;!" instead of the form.</p>`,
    constraints: `All inputs controlled with labels. Errors derived by a pure function <code>validate(values)</code>. Do not store errors in state. Submit uses <code>preventDefault</code>.`,
    example: `${H.table(['Values', 'Errors'], [['name "", others empty', 'name: required; email: invalid; password: too short (no confirm error: two empty strings match)'], ['password "abcdefg1", confirm "abcdefg2"', 'confirm: Passwords do not match'], ['all valid', '(none) → submit allowed']])}`,
    brute: { why: `<p>Write one <code>useState</code> and one handler per field (eight pieces of code), plus an <code>errors</code> state set inside each handler. Copy-paste mistakes appear (the confirm handler forgets to re-check when the password changes), so the "match" error becomes stale.</p>`, code: jsx(`function BadSignup() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const onConfirm = (e) => { setConfirm(e.target.value); setConfirmError(e.target.value === password ? '' : 'No match'); };
  // user edits password afterwards -> confirmError is stale
  return <input value={password} onChange={(e) => setPassword(e.target.value)} />;
}`, 'Stored errors go stale') },
    mcq: { q: 'The user fixes the password after seeing "Passwords do not match". With derived errors, what happens to that message?', options: ['It stays until the user touches confirm again', 'It updates immediately because errors are recomputed from the current values', 'It must be cleared manually', 'It turns into a warning'], answer: 1, explain: 'Derived errors are recomputed every render from the current values, so they cannot go stale. Stored errors can.' },
    hints: [
      `<p>Hint 1: One object like <code>{ name, email, password, confirm }</code> and the input's <code>name</code> attribute pick the key.</p>`,
      `<p>Hint 2: <code>validate(values)</code> returns an object of messages. <code>touched</code> decides which are visible.</p>`,
      `<p>Hint 3: On submit: <code>preventDefault</code>, set all touched, stop if any errors, otherwise set <code>done = true</code>. Make a tiny <code>Field</code> component to avoid repeating label + input + error.</p>`
    ],
    solution: {
      approach: `<p>One values object, one handler using <code>[e.target.name]</code>, errors from a pure function, visibility from <code>touched</code>. A small <code>Field</code> component removes the repetition (composition).</p>`,
      code: jsx(`import { useState } from 'react';

function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = 'Name is required';
  if (!/^\\S+@\\S+\\.\\S+$/.test(v.email)) e.email = 'Enter a valid email';
  if (v.password.length < 8 || !/\\d/.test(v.password)) e.password = 'Min 8 characters and a digit';
  if (v.confirm !== v.password) e.confirm = 'Passwords do not match';
  return e;
}

function Field({ label, name, type = 'text', values, errors, touched, onChange, onBlur }) {
  const show = touched[name] && errors[name];
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} value={values[name]} onChange={onChange} onBlur={onBlur}
        aria-invalid={!!show} />
      {show && <p role="alert">{errors[name]}</p>}
    </div>
  );
}

export default function SignupForm() {
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [done, setDone] = useState(false);
  const errors = validate(values);

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
  const onBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));
  function onSubmit(e) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (Object.keys(errors).length === 0) setDone(true);
  }

  if (done) return <p>Welcome, {values.name}!</p>;
  const shared = { values, errors, touched, onChange, onBlur };
  return (
    <form onSubmit={onSubmit} noValidate>
      <Field label="Name" name="name" {...shared} />
      <Field label="Email" name="email" type="email" {...shared} />
      <Field label="Password" name="password" type="password" {...shared} />
      <Field label="Confirm password" name="confirm" type="password" {...shared} />
      <button type="submit">Create account</button>
    </form>
  );
}`, 'Solution'),
      alt: [jsrun(`function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = 'Name is required';
  if (!/^\\S+@\\S+\\.\\S+$/.test(v.email)) e.email = 'Enter a valid email';
  if (v.password.length < 8 || !/\\d/.test(v.password)) e.password = 'Min 8 characters and a digit';
  if (v.confirm !== v.password) e.confirm = 'Passwords do not match';
  return e;
}
console.log(validate({ name: '', email: '', password: '', confirm: '' }));
console.log(validate({ name: 'Asha', email: 'a@b.co', password: 'abcdefg1', confirm: 'abcdefg2' }));
console.log(validate({ name: 'Asha', email: 'a@b.co', password: 'abcdefg1', confirm: 'abcdefg1' }));`, 'Plain JS model (runnable)')],
      complexity: `<p>Validation O(fields) per render; negligible.</p>`,
      followUps: ['Add a password-strength meter without extra state.', 'How would you check "email already taken" without validating on every keystroke?']
    }
  });

  practice.push({
    title: 'Why Does the Screen Not Update? (State Mutation Bug)', level: 'Medium', tags: ['state', 'immutability', 'debugging'], companies: ['Microsoft', 'Freshworks'],
    statement: `<p>A teammate's todo list does nothing when "Add" is clicked, and the "Done" checkbox only updates when something else triggers a render. Code below. Explain <b>why</b> each handler fails, then rewrite both correctly. Also say what would change if the list were rendered by a <code>React.memo</code> child.</p>
      <pre>function Todos() {
  const [items, setItems] = useState([{ id: 1, text: 'a', done: false }]);
  function add() { items.push({ id: Date.now(), text: 'new', done: false }); setItems(items); }
  function toggle(i) { items[i].done = !items[i].done; setItems([...items]); }
  ...
}</pre>`,
    constraints: `Use only immutable updates. Keep ids stable. The fix must work with <code>React.memo</code> child rows.`,
    example: `${H.table(['Handler', 'What happens', 'Why'], [['add', 'no re-render', '<code>setItems(items)</code> passes the <b>same array</b>; <code>Object.is</code> says unchanged, React bails out'], ['toggle', 'works for the list, but memo rows may show stale checkbox', 'new outer array, but the <b>same item object</b> was mutated, so a memoised row sees equal props']])}`,
    brute: { why: `<p>Force a re-render with a dummy counter state or <code>key={Math.random()}</code>. It hides the symptom, leaves mutated data shared between old and new renders (which breaks undo, memo and time-travel debugging), and wastes work.</p>`, code: jsx(`function Hack() {
  const [, force] = useState(0);
  const items = useRef([]);                                    // mutated outside React's knowledge
  const add = () => { items.current.push('x'); force((n) => n + 1); };
  return <button onClick={add}>{items.current.length}</button>;
}`, 'Force-render hack') },
    mcq: { q: 'Why does <code>items.push(x); setItems(items)</code> not re-render?', options: ['push is asynchronous', 'The array reference is the same, so React sees no change', 'setItems only works with numbers', 'State arrays are read-only in the browser'], answer: 1, explain: 'React compares the new and old state with Object.is. Mutating then passing the same array gives the same reference, so it skips the update.' },
    hints: [
      `<p>Hint 1: How does React decide whether state changed?</p>`,
      `<p>Hint 2: For add use spread to create a new array. For toggle you must also create a new <b>item</b> object, not just a new array.</p>`,
      `<p>Hint 3: <code>setItems(list =&gt; [...list, newItem])</code> and <code>setItems(list =&gt; list.map(t =&gt; t.id === id ? { ...t, done: !t.done } : t))</code>. Toggle by id, not index.</p>`
    ],
    solution: {
      approach: `<p><b>add</b> mutates the existing array and passes it back, so the reference is identical and React bails out. <b>toggle</b> creates a new outer array (so it re-renders) but mutates the shared item object; any memoised row receiving that same object sees equal props and skips rendering, so the checkbox looks stale. Fix both by creating new arrays <i>and</i> new changed objects, and identify items by id rather than index.</p>`,
      code: jsx(`import { useState, memo } from 'react';

const Row = memo(function Row({ item, onToggle }) {
  return (
    <li>
      <input type="checkbox" checked={item.done} onChange={() => onToggle(item.id)} /> {item.text}
    </li>
  );
});

export default function Todos() {
  const [items, setItems] = useState([{ id: 1, text: 'a', done: false }]);

  const add = () =>
    setItems((list) => [...list, { id: Date.now(), text: 'new', done: false }]);   // new array

  const toggle = (id) =>
    setItems((list) => list.map((t) => (t.id === id ? { ...t, done: !t.done } : t))); // new item object

  return (
    <div>
      <button onClick={add}>Add</button>
      <ul>{items.map((t) => <Row key={t.id} item={t} onToggle={toggle} />)}</ul>
    </div>
  );
}`, 'Solution'),
      alt: [jsrun(`// Show the reference equality that React relies on.
const a = [{ id: 1, done: false }];
const same = a; same.push({ id: 2 });
console.log('after push, same reference?      ', Object.is(a, same), '(React sees no change)');

const list1 = [{ id: 1, done: false }];
const list2 = [...list1];                       // new outer array...
list2[0].done = true;                           // ...but the same inner object was mutated
console.log('item object shared (memo is fooled)?', Object.is(list1[0], list2[0]));

const list3 = list1.map((t) => (t.id === 1 ? { ...t, done: false } : t));  // new array AND new item
console.log('immutable update changed item ref?   ', !Object.is(list1[0], list3[0]));`, 'Plain JS: reference equality (runnable)')],
      complexity: `<p>Both updates O(n) copying; React then re-renders only rows whose item object changed (with memo).</p>`,
      followUps: ['Use Immer so you can write "mutating" code safely. How does it work?', 'Why is <code>Date.now()</code> a risky id generator?']
    }
  });

  /* ======================= PRACTICE: HARD ======================= */
  practice.push({
    title: 'Build createElement and renderToString from Scratch', level: 'Hard', tags: ['jsx', 'elements', 'machine coding', 'html escaping'], companies: ['Meta', 'Google', 'Atlassian'],
    statement: `<p>Implement a tiny React-like core in plain JavaScript. (1) <code>h(type, props, ...children)</code> returns an element <code>{ type, props: { ...props, children } }</code> with children flattened. (2) <code>renderToString(node)</code> turns an element tree into an HTML string and must handle: text and numbers (HTML-escaped), <code>null</code>/<code>undefined</code>/booleans (render nothing, but <code>0</code> renders "0"), arrays, function components (called with props), a <code>Fragment</code>, <code>className</code>→<code>class</code>, <code>htmlFor</code>→<code>for</code>, <code>style</code> objects (camelCase → kebab-case), boolean attributes (<code>true</code> → bare name, <code>false</code>/null skipped), event handler props (<code>onClick</code>) and <code>key</code> skipped, and void tags (<code>br</code>, <code>img</code>, <code>input</code>) self-closed.</p>`,
    constraints: `No libraries, no <code>eval</code>. Attribute values and text must be escaped (<code>&amp; &lt; &gt; &quot;</code>) to prevent XSS. Recursion depth up to 1000.`,
    example: `<pre>renderToString(h('p', { className: 'note', style: { fontSize: '12px' } }, 'a < b'))
// &lt;p class="note" style="font-size:12px"&gt;a &amp;lt; b&lt;/p&gt;</pre>
      <p>${H.c('g', 'Why')}: the text <code>a &lt; b</code> must become <code>a &amp;lt; b</code> so a user's text can never create a tag.</p>`,
    brute: { why: `<p>Build the HTML by string concatenation inside each component and never escape. Anything a user types (<code>&lt;script&gt;</code>) is injected as markup (XSS), components cannot be nested cleanly, and every attribute rule is re-implemented by hand each time.</p>`, code: R`function badCard(name) {
  return '<div class=card><h2>' + name + '</h2></div>';   // name = "<img src=x onerror=alert(1)>" runs code
}
console.log(badCard('<img src=x onerror=alert(1)>'));` },
    mcq: { q: 'Why must <code>renderToString</code> escape text children?', options: ['To make the HTML shorter', 'So user text can never be interpreted as markup (XSS protection)', 'Because browsers cannot display < characters', 'It is only needed for attributes'], answer: 1, explain: 'If text containing < or > were inserted raw, an attacker could inject tags and scripts. Escaping turns them into harmless text. React does this for every {value} in JSX.' },
    hints: [
      `<p>Hint 1: An element is just an object with a <code>type</code> (string tag or function) and <code>props</code>. <code>h</code> only builds it.</p>`,
      `<p>Hint 2: <code>renderToString</code> is a recursive function with a case per kind of node: empty, text, array, function component, fragment, host tag.</p>`,
      `<p>Hint 3: For a function component call <code>type(props)</code> and render the result. For host tags: build the attribute string with a helper (skip children/key/onX, map aliases, handle style and booleans), then either self-close for void tags or wrap the rendered children.</p>`
    ],
    solution: {
      approach: `<p>Two small functions. <code>h</code> creates data. <code>renderToString</code> is a recursive interpreter over that data: components are just functions that return more elements, so rendering a component means calling it and rendering the result. Escaping is applied at the two places where untrusted values enter the string: text and attribute values. This is what <code>react-dom/server</code> does at its core.</p>`,
      code: jsrun(`const Fragment = Symbol('Fragment');

function h(type, props, ...children) {
  return { type, props: { ...(props || {}), children: children.flat(Infinity) } };
}

const VOID = new Set(['area', 'br', 'col', 'hr', 'img', 'input', 'link', 'meta', 'source', 'wbr']);
const ALIAS = { className: 'class', htmlFor: 'for' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

function styleToString(style) {
  return Object.keys(style)
    .filter((k) => style[k] !== null && style[k] !== undefined && style[k] !== false)
    .map((k) => kebab(k) + ':' + style[k])
    .join(';');
}

function attrsToString(props) {
  let out = '';
  for (const key of Object.keys(props)) {
    if (key === 'children' || key === 'key' || /^on[A-Z]/.test(key)) continue; // not HTML attributes
    const value = props[key];
    if (value === false || value === null || value === undefined) continue;
    const name = ALIAS[key] || key;
    if (key === 'style' && typeof value === 'object') out += ' style="' + esc(styleToString(value)) + '"';
    else if (value === true) out += ' ' + name;                                  // boolean attribute
    else out += ' ' + name + '="' + esc(value) + '"';
  }
  return out;
}

function renderToString(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return ''; // renders nothing
  if (typeof node === 'string' || typeof node === 'number') return esc(node);      // 0 renders "0"
  if (Array.isArray(node)) return node.map(renderToString).join('');
  if (typeof node.type === 'function') return renderToString(node.type(node.props)); // call the component
  if (node.type === Fragment) return renderToString(node.props.children);
  const open = '<' + node.type + attrsToString(node.props);
  if (VOID.has(node.type)) return open + ' />';
  return open + '>' + renderToString(node.props.children) + '</' + node.type + '>';
}

// ---- tests ----
const Badge = ({ n }) => h('span', { className: 'badge' }, n);
const Card = ({ title, children }) => h('section', null, h('h2', null, title), children);

console.log(renderToString(h('p', { className: 'note', style: { fontSize: '12px', color: 'red' } }, 'a < b')));
console.log(renderToString(h(Card, { title: 'Hi & bye' }, h(Badge, { n: 0 }), false, null, h('br'), h('img', { src: 'a.png', alt: 'say "hi"' }))));
console.log(renderToString(h(Fragment, null, h('label', { htmlFor: 'e' }, 'Email'), h('input', { id: 'e', disabled: true, hidden: false, onClick: () => 1, key: 'k' }))));
console.log(renderToString(h('ul', null, ['a', 'b'].map((x) => h('li', { key: x }, x)))));
console.log(renderToString(h('div', null, '<script>alert(1)<\/script>')));`, 'Solution'),
      alt: [jsx(`// With a JSX pragma the compiler turns JSX into calls to our h(), so the same core renders JSX.
/** @jsx h */
const page = (
  <Card title="Profile">
    <Badge n={3} />
    <label htmlFor="e">Email</label>
    <input id="e" disabled />
  </Card>
);
console.log(renderToString(page));`, 'JSX using the same core')],
      complexity: `<p>Time O(size of the tree), plus O(length) for escaping each string. Space O(depth) for recursion plus the output string.</p>`,
      followUps: ['Add support for <code>dangerouslySetInnerHTML</code> and explain why it bypasses escaping.', 'Make it stream (generator/async iterator) instead of returning one big string.']
    }
  });

  practice.push({
    title: 'Keyed List Diff: What Does React Do?', level: 'Hard', tags: ['reconciliation', 'keys', 'algorithms', 'diff'], companies: ['Meta', 'Vercel', 'Uber'],
    statement: `<p>Write <code>diffKeyed(oldKeys, newKeys)</code> that returns the list of operations React performs when a list of keyed children changes: <code>keep</code>, <code>move</code> (existing child that must be repositioned), <code>create</code>, and <code>remove</code>. Use React's single-pass rule: walk the new list; for each key found in the old list with old index <code>o</code>, if <code>o &lt; lastPlacedIndex</code> it must <b>move</b>, otherwise <code>lastPlacedIndex = o</code> and it stays; keys not in the old list are <b>created</b>; old keys that never appear are <b>removed</b>. Also write <code>diffByIndex(oldLabels, newLabels)</code> that shows the no-key behaviour (position-based: <code>update</code>, <code>create</code>, <code>remove</code>) and counts how many updates changed a row's label (the bug cases).</p>`,
    constraints: `Keys are unique strings within each list (throw an error on duplicates). Up to 10<sup>5</sup> keys. Target O(n) using a Map.`,
    example: `${H.table(['Old', 'New', 'Keyed ops'], [['A B C', 'X A B C', 'create X, keep A, keep B, keep C'], ['A B C D', 'D A B C', 'keep D, move A, move B, move C'], ['A B C', 'C B', 'keep C, move B, remove A']])}
      <p>${H.c('g', 'Why')}: moving D to the front looks like 1 move, but React's single pass keeps D and moves the other three. That is a known trade-off for simplicity and speed.</p>`,
    brute: { why: `<p>Rebuild the whole list: destroy every old child and create every new one. Correct output, but every row loses its state and DOM, and typing focus is lost. A nested loop (<code>indexOf</code> inside the loop) to find matches also makes it O(n<sup>2</sup>).</p>`, code: R`function bruteDiff(oldKeys, newKeys) {
  const ops = [];
  oldKeys.forEach((k) => ops.push({ op: 'remove', key: k }));   // throw everything away
  newKeys.forEach((k) => ops.push({ op: 'create', key: k }));   // and rebuild it
  return ops;
}` },
    mcq: { q: 'Old order A B C D, new order D A B C. Using React\'s single-pass algorithm, how many children are moved?', options: ['0', '1 (only D)', '3 (A, B and C)', '4'], answer: 2, explain: 'D has the largest old index (3), so lastPlacedIndex becomes 3 and D stays. A, B and C have smaller old indexes than 3 so each is moved after it. The minimal solution would move only D, but React optimises for a simple single pass.' },
    hints: [
      `<p>Hint 1: Build a map from old key → old index so lookups are O(1).</p>`,
      `<p>Hint 2: Walk the new keys in order, keeping a variable <code>lastPlacedIndex</code>. Compare the old index of each found key against it.</p>`,
      `<p>Hint 3: Track which old keys you saw in a Set; every old key not seen is removed after the loop. For the no-key version, compare by position only and count rows where the label at that position changed.</p>`
    ],
    solution: {
      approach: `<p>One pass over the new list with a Map of old indexes gives O(n). The <code>lastPlacedIndex</code> rule guarantees every child already "placed" to the left has a smaller-or-equal old index, so children whose old index is lower than that point must jump forward. Removal is found with a Set difference. The index-based version shows why no-key lists are cheap to diff but dangerous: they never say <code>move</code>, they say <code>update</code>, so state stays at the position.</p>`,
      code: jsrun(`function assertUnique(list, name) {
  if (new Set(list).size !== list.length) throw new Error('Duplicate keys in ' + name);
}

// What React does for keyed children (single pass, lastPlacedIndex rule).
function diffKeyed(oldKeys, newKeys) {
  assertUnique(oldKeys, 'old'); assertUnique(newKeys, 'new');
  const oldIndex = new Map(oldKeys.map((k, i) => [k, i]));
  const seen = new Set();
  const ops = [];
  let lastPlaced = 0;
  newKeys.forEach((key, pos) => {
    if (oldIndex.has(key)) {
      seen.add(key);
      const o = oldIndex.get(key);
      if (o < lastPlaced) ops.push({ op: 'move', key, from: o, to: pos });
      else { lastPlaced = o; ops.push({ op: 'keep', key }); }
    } else {
      ops.push({ op: 'create', key, at: pos });
    }
  });
  oldKeys.forEach((key, i) => { if (!seen.has(key)) ops.push({ op: 'remove', key, from: i }); });
  return ops;
}

// What happens without keys: position decides identity.
function diffByIndex(oldLabels, newLabels) {
  const ops = []; let wrongState = 0;
  const n = Math.max(oldLabels.length, newLabels.length);
  for (let i = 0; i < n; i++) {
    if (i < oldLabels.length && i < newLabels.length) {
      const changed = oldLabels[i] !== newLabels[i];
      if (changed) wrongState++;                       // instance reused for a different item
      ops.push({ op: 'update', pos: i, label: newLabels[i], reusedForDifferentItem: changed });
    } else if (i >= oldLabels.length) ops.push({ op: 'create', pos: i, label: newLabels[i] });
    else ops.push({ op: 'remove', pos: i });
  }
  return { ops, wrongState };
}

const fmt = (ops) => ops.map((o) => o.op + ' ' + (o.key || o.label || o.pos)).join(', ');
const cases = [['ABC', 'XABC'], ['ABCD', 'DABC'], ['ABC', 'CB'], ['AB', 'AB']];
for (const [a, b] of cases) {
  const oldK = a.split(''), newK = b.split('');
  console.log(a + ' -> ' + b);
  console.log('  keyed  :', fmt(diffKeyed(oldK, newK)));
  const idx = diffByIndex(oldK, newK);
  console.log('  by idx :', fmt(idx.ops), '| rows reused for a different item:', idx.wrongState);
}
try { diffKeyed(['A', 'A'], ['A']); } catch (e) { console.log('error:', e.message); }`, 'Solution'),
      alt: [jsx(`// The React side: the same list rendered with stable keys vs index keys.
function Rows({ items }) {
  return (
    <ul>
      {items.map((item) => (
        <Row key={item.id} label={item.label} />   // identity travels with the item
      ))}
    </ul>
  );
}`, 'Keyed rendering')],
      complexity: `<p>Time O(n + m) for n old and m new keys; space O(n) for the map and set. The index diff is O(max(n, m)) but gives wrong identity on insertion or reorder.</p>`,
      followUps: ['Compute the minimum number of moves using the longest increasing subsequence of old indexes (what Vue 3 does).', 'Why does React need to check keys only among siblings?']
    }
  });

  practice.push({
    title: 'Multi-Step Wizard with Lifted State and Per-Step Validation', level: 'Hard', tags: ['lifting state', 'forms', 'composition', 'state machines'], companies: ['Stripe', 'Atlassian', 'Razorpay'],
    statement: `<p>Build <code>Wizard</code> with three steps: <b>Account</b> (email, password), <b>Profile</b> (name, city), <b>Review</b> (read-only summary and a Submit button). Rules: "Next" is blocked until the current step is valid, and errors show only after a failed Next. "Back" never loses what was typed. The progress indicator shows "Step 2 of 3". On Submit call <code>onSubmit(data)</code> once, disable the button while sending, and show "Thanks, &lt;name&gt;!" afterwards.</p>`,
    constraints: `All form data lives in <code>Wizard</code> (lifted). Step components are presentational, getting <code>data</code>, <code>errors</code>, <code>showErrors</code>, <code>onChange</code>. No effects. Errors derived per step.`,
    example: `${H.table(['Action', 'Result'], [['Next with empty email', 'stays on step 1, shows "Email is required"'], ['Valid step 1, Next, Back', 'step 1 still shows what you typed'], ['Step 3 Submit', 'button disabled, then "Thanks, Asha!"']])}`,
    brute: { why: `<p>Each step is a separate component with its own state. Going Back unmounts the current step, so all its values are lost; the Review step cannot see them because they are in sibling components. The workaround of copying values upward with effects creates double renders and stale data.</p>`, code: jsx(`function Step1({ onDone }) {
  const [email, setEmail] = useState('');                  // lost when this step unmounts
  return <input value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => onDone(email)} />;
}`, 'State inside each step') },
    mcq: { q: 'Why must the form data live in <code>Wizard</code> rather than in each step?', options: ['Steps cannot have state in React', 'Steps unmount when you navigate, so their own state would be lost, and Review needs all the values', 'Because Wizard is faster', 'To avoid using props'], answer: 1, explain: 'Only one step is mounted at a time. State owned by a step dies when it unmounts. The common parent outlives all steps, so it is the right owner (lifting state up).' },
    hints: [
      `<p>Hint 1: Which component lives for the whole flow? That owns the data and the current step number.</p>`,
      `<p>Hint 2: Write <code>validateStep(step, data)</code> returning errors for that step only. Next is allowed when it returns none.</p>`,
      `<p>Hint 3: Render the current step with a <code>switch</code> or an array of step components. Keep <code>showErrors</code> as a boolean that resets on Back and on a successful Next.</p>`
    ],
    solution: {
      approach: `<p>The wizard is a tiny state machine: <code>step</code> (0..2), the data object, a <code>showErrors</code> flag and a <code>status</code> (<code>"editing" | "sending" | "done"</code>). Validation is a pure function of the current step's fields, so Next is simply "if there are no errors, advance". Steps never own data, which is why Back is free. The runnable tab models the transitions and can be unit tested without React.</p>`,
      code: jsx(`import { useState } from 'react';

const STEPS = ['Account', 'Profile', 'Review'];

function validateStep(step, d) {
  const e = {};
  if (step === 0) {
    if (!/^\\S+@\\S+\\.\\S+$/.test(d.email)) e.email = 'Enter a valid email';
    if (d.password.length < 8) e.password = 'Min 8 characters';
  }
  if (step === 1) {
    if (!d.name.trim()) e.name = 'Name is required';
    if (!d.city.trim()) e.city = 'City is required';
  }
  return e;                                          // Review has nothing to validate
}

function TextField({ label, name, type = 'text', data, errors, showErrors, onChange }) {
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} value={data[name]} onChange={onChange} />
      {showErrors && errors[name] && <p role="alert">{errors[name]}</p>}
    </div>
  );
}

export default function Wizard({ onSubmit }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ email: '', password: '', name: '', city: '' });
  const [showErrors, setShowErrors] = useState(false);
  const [status, setStatus] = useState('editing');

  const errors = validateStep(step, data);           // derived for the current step
  const onChange = (e) => setData((d) => ({ ...d, [e.target.name]: e.target.value }));
  const shared = { data, errors, showErrors, onChange };

  function next() {
    if (Object.keys(errors).length > 0) { setShowErrors(true); return; }
    setShowErrors(false);
    setStep((s) => s + 1);
  }
  const back = () => { setShowErrors(false); setStep((s) => s - 1); };

  async function submit() {
    setStatus('sending');
    await onSubmit(data);
    setStatus('done');
  }

  if (status === 'done') return <p>Thanks, {data.name}!</p>;

  return (
    <div>
      <p>Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      {step === 0 && (<>
        <TextField label="Email" name="email" {...shared} />
        <TextField label="Password" name="password" type="password" {...shared} />
      </>)}
      {step === 1 && (<>
        <TextField label="Name" name="name" {...shared} />
        <TextField label="City" name="city" {...shared} />
      </>)}
      {step === 2 && (
        <dl>
          <dt>Email</dt><dd>{data.email}</dd>
          <dt>Name</dt><dd>{data.name}</dd>
          <dt>City</dt><dd>{data.city}</dd>
        </dl>
      )}
      {step > 0 && <button onClick={back} disabled={status === 'sending'}>Back</button>}
      {step < STEPS.length - 1
        ? <button onClick={next}>Next</button>
        : <button onClick={submit} disabled={status === 'sending'}>Submit</button>}
    </div>
  );
}`, 'Solution'),
      alt: [jsrun(`// The wizard as a pure state machine: easy to test without React.
const STEPS = ['Account', 'Profile', 'Review'];
function validateStep(step, d) {
  const e = {};
  if (step === 0) {
    if (!/^\\S+@\\S+\\.\\S+$/.test(d.email)) e.email = 'Enter a valid email';
    if (d.password.length < 8) e.password = 'Min 8 characters';
  }
  if (step === 1) {
    if (!d.name.trim()) e.name = 'Name is required';
    if (!d.city.trim()) e.city = 'City is required';
  }
  return e;
}
const initial = { step: 0, data: { email: '', password: '', name: '', city: '' }, showErrors: false };
const type = (s, field, value) => ({ ...s, data: { ...s.data, [field]: value } });
const next = (s) => (Object.keys(validateStep(s.step, s.data)).length ? { ...s, showErrors: true } : { ...s, step: s.step + 1, showErrors: false });
const back = (s) => ({ ...s, step: s.step - 1, showErrors: false });
const show = (s) => 'Step ' + (s.step + 1) + '/3 ' + STEPS[s.step] + (s.showErrors ? ' errors=' + JSON.stringify(validateStep(s.step, s.data)) : '');

let s = initial;
s = next(s);                         console.log('Next on empty form  ->', show(s));
s = type(type(s, 'email', 'a@b.co'), 'password', 'longenough');
s = next(s);                         console.log('valid step 1, Next  ->', show(s));
s = back(s);                         console.log('Back                ->', show(s), '| email kept:', s.data.email);
s = next(s); s = type(type(s, 'name', 'Asha'), 'city', 'Pune'); s = next(s);
console.log('profile filled, Next->', show(s), '| summary:', s.data.name + ', ' + s.data.city);`, 'Plain JS: wizard state machine (runnable)')],
      complexity: `<p>Constant work per keystroke and click. Validation is limited to the visible step's fields.</p>`,
      followUps: ['Persist progress in sessionStorage so a refresh keeps the user on the same step.', 'Replace the booleans/step number with <code>useReducer</code>. What do you gain?']
    }
  });

  practice.push({
    title: 'Build a Mini useState with Batching, Bail-out and memo', level: 'Hard', tags: ['re-render', 'useState', 'internals', 'machine coding'], companies: ['Meta', 'Google', 'Microsoft'],
    statement: `<p>Write a tiny runtime that demonstrates the rendering rules from this module. It must support: components as functions that return an element, an array of elements or <code>null</code>; <code>h(Component, props, ...children)</code>; <code>mount(element)</code>; <code>useState(initial)</code> with value and updater-function setters; <b>batching</b> (many setter calls in one tick cause one render pass); <b>bail-out</b> (setting an <code>Object.is</code>-equal value renders nothing); a parent render re-renders its children; and <code>memo(Component)</code> which skips re-rendering when props are shallow-equal and the child itself has no pending update. Record each component run in a log so we can see exactly who re-rendered.</p>`,
    constraints: `Match children by position and component type (no keys needed). Hook slots per component instance, indexed by call order. Updates applied in order. Process dirty components from the shallowest to the deepest. About 80 lines.`,
    example: `<pre>App > [ Header(memo) > Logo,  Page > [ Counter, Footer(memo) ] ]
mount:                  App, Header, Logo, Page, Counter, Footer
setN x3 in Counter:     Counter                (one batched render)
state change in Page:   Page, Counter          (Footer skipped by memo)
setN to the same value: (nothing)</pre>`,
    brute: { why: `<p>Re-run the entire app from the root after every setter call, with no batching. Three clicks of work cause three full passes, every component renders every time, and setting the same value still re-renders. It works, but it demonstrates none of the optimisations React actually does.</p>`, code: R`let globalState = 0;
function setGlobal(v) { globalState = v; renderEverything(); }   // full render per call, no batching
function renderEverything() { console.log('render ALL components'); }
setGlobal(1); setGlobal(2); setGlobal(3);   // three complete passes` },
    mcq: { q: 'In the mini runtime, a memo child receives a <b>new</b> object prop on every parent render (e.g. <code>{ style: {} }</code>). What happens?', options: ['memo still skips it', 'memo cannot skip: shallowEqual compares by reference, so the prop is "different"', 'The runtime throws', 'The parent stops rendering'], answer: 1, explain: 'Shallow equality uses Object.is per prop. A fresh object is never Object.is-equal to the previous one, so the memoised child re-renders. Hoist or memoise the object.' },
    hints: [
      `<p>Hint 1: Each live component needs an <b>instance</b> object holding its hook slots, its last element and its child instances.</p>`,
      `<p>Hint 2: <code>useState</code> reads <code>currentInstance.hooks[cursor++]</code>. The setter pushes <code>{ inst, index, value }</code> to a queue and schedules <b>one</b> flush with a microtask.</p>`,
      `<p>Hint 3: In flush, apply the queue, ignore updates that are <code>Object.is</code>-equal, mark instances dirty, sort by depth and render the ones still dirty. When a parent renders it clears its children's dirty flags by rendering them (memo children are skipped only if props are equal and they are not dirty).</p>`
    ],
    solution: {
      approach: `<p>Three ideas make it work: (1) <b>instances</b> hold hook slots, which is why state survives re-renders; (2) the setter only <b>queues</b> a request, and a single microtask flush applies all queued updates in order (batching) and drops no-op updates (bail-out); (3) rendering an instance renders its children by default, except a memo child whose props are shallow-equal and which is not dirty. Sorting dirty instances by depth means a parent render can clear its dirty descendants, preventing double work.</p>`,
      code: jsrun(`const renderLog = [];
let currentInst = null, queue = [], flushScheduled = false;

function h(component, props, ...children) { return { component, props: props || {}, children }; }
function memo(fn) { fn.isMemo = true; return fn; }

const shallowEqual = (a, b) => {
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.is(a[k], b[k]));
};
const sameChildren = (a, b) => a.length === b.length && a.every((c, i) => Object.is(c, b[i]));

function createInstance(el, parent) {
  return { el, parent, hooks: [], cursor: 0, children: [], dirty: false, name: el.component.name };
}

function renderInstance(inst) {
  inst.cursor = 0;
  const prev = currentInst; currentInst = inst;
  renderLog.push(inst.name);                                   // record: this component function ran
  const out = inst.el.component({ ...inst.el.props, children: inst.el.children });
  currentInst = prev;
  inst.dirty = false;
  const kids = (Array.isArray(out) ? out : [out]).filter(Boolean);
  inst.children = kids.map((kidEl, i) => {
    const old = inst.children[i];
    if (old && old.el.component === kidEl.component) {          // same type, same position: reuse instance
      const unchanged = shallowEqual(old.el.props, kidEl.props) && sameChildren(old.el.children, kidEl.children);
      const skip = kidEl.component.isMemo && unchanged && !old.dirty;
      old.el = kidEl;
      if (!skip) renderInstance(old);
      return old;
    }
    const fresh = createInstance(kidEl, inst);                 // new type or position: mount
    renderInstance(fresh);
    return fresh;
  });
}

function useState(initial) {
  const inst = currentInst, i = inst.cursor++;
  if (!(i in inst.hooks)) inst.hooks[i] = initial;
  const set = (v) => { queue.push({ inst, i, v }); scheduleFlush(); };
  return [inst.hooks[i], set];
}
function scheduleFlush() { if (!flushScheduled) { flushScheduled = true; Promise.resolve().then(flush); } }

function flush() {
  flushScheduled = false;
  const updates = queue; queue = [];
  const dirty = new Set();
  for (const { inst, i, v } of updates) {
    const before = inst.hooks[i];
    const next = typeof v === 'function' ? v(before) : v;     // updater functions see the latest value
    if (!Object.is(next, before)) { inst.hooks[i] = next; dirty.add(inst); }   // bail-out when equal
  }
  dirty.forEach((inst) => { inst.dirty = true; });
  const depth = (n) => (n.parent ? 1 + depth(n.parent) : 0);
  [...dirty].sort((a, b) => depth(a) - depth(b)).forEach((inst) => { if (inst.dirty) renderInstance(inst); });
}

function mount(el) { const root = createInstance(el, null); renderInstance(root); return root; }

// ---- the demo app from the example ----
let bumpCounter, bumpPage, setCounter;
function Logo() { return null; }
const Header = memo(function Header() { return h(Logo); });
function Counter() { const [n, setN] = useState(0); bumpCounter = () => setN((c) => c + 1); setCounter = setN; return null; }
const Footer = memo(function Footer() { return null; });
function Page() { const [p, setP] = useState(0); bumpPage = () => setP((x) => x + 1); return [h(Counter), h(Footer)]; }
function App() { return [h(Header), h(Page)]; }

const tick = () => new Promise((r) => setTimeout(r, 0));
const step = async (title, action) => {
  renderLog.length = 0; action(); await tick();
  console.log(title.padEnd(26), renderLog.length ? renderLog.join(', ') : '(nothing)');
};

(async function main() {
  await step('mount', () => mount(h(App)));
  await step('3 updates in one tick', () => { bumpCounter(); bumpCounter(); bumpCounter(); });
  await step('state change in Page', () => bumpPage());
  await step('set to same value', () => setCounter(3));
})();`, 'Solution'),
      alt: [jsx(`// Real React behaves the same way for this app.
import { useState, memo } from 'react';

const Logo = () => null;
const Header = memo(function Header() { return <Logo />; });
const Footer = memo(function Footer() { return null; });

function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => { setN((c) => c + 1); setN((c) => c + 1); setN((c) => c + 1); }}>{n}</button>;  // batched
}
function Page() {
  const [p, setP] = useState(0);
  return <><button onClick={() => setP(p + 1)}>page {p}</button><Counter /><Footer /></>;
}
export default function App() { return <><Header /><Page /></>; }`, 'The same tree in real React')],
      complexity: `<p>A flush costs O(number of components rendered). Applying updates is O(number of queued updates). Depth sorting is O(d log d) for d dirty components.</p>`,
      followUps: ['Add keyed children to the matching step. What changes in how you pair old and new instances?', 'Add useEffect with a dependency array and run effects after the flush.']
    }
  });

  practice.push({
    title: 'Compound Tabs with Context (Flexible Composition API)', level: 'Hard', tags: ['composition', 'compound components', 'context', 'accessibility'], companies: ['Vercel', 'Shopify', 'Atlassian'],
    statement: `<p>Design a compound component API: <code>&lt;Tabs defaultValue="a"&gt;&lt;Tabs.List&gt;&lt;Tabs.Tab value="a"&gt;A&lt;/Tabs.Tab&gt;...&lt;/Tabs.List&gt;&lt;Tabs.Panel value="a"&gt;...&lt;/Tabs.Panel&gt;&lt;/Tabs&gt;</code>. The parts can be placed in any order and wrapped in other elements (for example a toolbar). It must work uncontrolled (<code>defaultValue</code>) and controlled (<code>value</code> + <code>onValueChange</code>), set correct ARIA roles/ids, and throw a clear error if a part is used outside <code>Tabs</code>.</p>`,
    constraints: `Use <code>createContext</code>/<code>useContext</code>. No <code>cloneElement</code>/<code>Children.map</code>. Panel ids derived with <code>useId</code>. Only the active panel is rendered.`,
    example: `${H.table(['Usage', 'Behaviour'], [['&lt;Tabs defaultValue="a"&gt;', 'uncontrolled, starts on a'], ['&lt;Tabs value={v} onValueChange={setV}&gt;', 'controlled by the parent'], ['&lt;Tabs.Tab&gt; outside &lt;Tabs&gt;', 'throws "Tabs.Tab must be used inside &lt;Tabs&gt;"']])}`,
    brute: { why: `<p>A single <code>Tabs</code> that takes a <code>tabs</code> array prop and renders everything itself. Callers cannot place a badge inside a tab, put the list below the panels, or add a toolbar between the parts without the component growing a new prop for each case.</p>`, code: jsx(`function RigidTabs({ tabs, active, onChange }) {
  return (
    <div>
      <div>{tabs.map((t) => <button key={t.id} onClick={() => onChange(t.id)}>{t.label}</button>)}</div>
      <div>{tabs.find((t) => t.id === active).content}</div>
    </div>
  );
}  // no way to add an icon in one tab, or reorder the parts`, 'Config-array API') },
    mcq: { q: 'What problem does Context solve for compound components?', options: ['It makes components render faster', 'It lets parts share the parent\'s state without the caller threading props through every layer', 'It replaces useState', 'It stores data on the server'], answer: 1, explain: 'Tab and Panel can be nested at any depth under Tabs, so passing active/setActive as props through arbitrary wrapper elements is impossible. Context hands the shared state to whichever part asks for it.' },
    hints: [
      `<p>Hint 1: Who owns the active value? <code>Tabs</code>. How do deeply nested parts reach it without props?</p>`,
      `<p>Hint 2: <code>Tabs</code> provides <code>{ active, setActive, baseId }</code>. A small <code>useTabsContext()</code> hook reads it and throws if missing.</p>`,
      `<p>Hint 3: For controlled/uncontrolled: <code>const controlled = value !== undefined</code>; display <code>controlled ? value : inner</code>; on change call <code>onValueChange</code> and update <code>inner</code> only when uncontrolled. Attach parts as static properties: <code>Tabs.List = ...</code>.</p>`
    ],
    solution: {
      approach: `<p><code>Tabs</code> keeps the active value (internal or controlled) and exposes it through Context. <code>Tab</code> and <code>Panel</code> are tiny consumers, so callers can arrange and wrap them freely. A helper hook centralises the "used outside Tabs" error. IDs from <code>useId</code> link <code>aria-controls</code> and <code>aria-labelledby</code>. The model tab shows the same idea with an explicit provider stack.</p>`,
      code: jsx(`import { createContext, useContext, useId, useState } from 'react';

const TabsContext = createContext(null);

function useTabsContext(part) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs.' + part + ' must be used inside <Tabs>');
  return ctx;
}

export function Tabs({ defaultValue, value, onValueChange, children }) {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const active = controlled ? value : inner;
  const baseId = useId();

  function setActive(next) {
    if (!controlled) setInner(next);       // uncontrolled: we own the state
    if (onValueChange) onValueChange(next); // controlled or not, tell the parent
  }

  return (
    <TabsContext.Provider value={{ active, setActive, baseId }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
}

Tabs.List = function TabsList({ children }) {
  useTabsContext('List');
  return <div role="tablist">{children}</div>;
};

Tabs.Tab = function TabsTab({ value, children }) {
  const { active, setActive, baseId } = useTabsContext('Tab');
  const selected = active === value;
  return (
    <button
      role="tab"
      id={baseId + '-tab-' + value}
      aria-selected={selected}
      aria-controls={baseId + '-panel-' + value}
      tabIndex={selected ? 0 : -1}
      onClick={() => setActive(value)}
    >
      {children}
    </button>
  );
};

Tabs.Panel = function TabsPanel({ value, children }) {
  const { active, baseId } = useTabsContext('Panel');
  if (active !== value) return null;      // only the active panel is rendered
  return (
    <div role="tabpanel" id={baseId + '-panel-' + value} aria-labelledby={baseId + '-tab-' + value}>
      {children}
    </div>
  );
};

// Usage: any layout the caller likes, even with wrappers between the parts.
export function Demo() {
  return (
    <Tabs defaultValue="a">
      <header><Tabs.List>
        <Tabs.Tab value="a">Overview</Tabs.Tab>
        <Tabs.Tab value="b">Billing <span className="dot" /></Tabs.Tab>
      </Tabs.List></header>
      <main>
        <Tabs.Panel value="a"><p>Overview content</p></Tabs.Panel>
        <Tabs.Panel value="b"><p>Billing content</p></Tabs.Panel>
      </main>
    </Tabs>
  );
}`, 'Solution'),
      alt: [jsrun(`// Context without React: a provider stack that "descendants" read implicitly.
const stack = [];
function provide(value, render) { stack.push(value); try { return render(); } finally { stack.pop(); } }
function useTabs(part) {
  const ctx = stack[stack.length - 1];
  if (!ctx) throw new Error('Tabs.' + part + ' must be used inside <Tabs>');
  return ctx;
}
const Tab = (value, label) => { const { active } = useTabs('Tab'); return (active === value ? '[' + label + ']' : ' ' + label + ' '); };
const Panel = (value, text) => { const { active } = useTabs('Panel'); return active === value ? text : ''; };

function Tabs(initial, children) {
  const ctx = { active: initial, setActive(v) { ctx.active = v; } };
  return { ctx, render: () => provide(ctx, children) };
}
const app = Tabs('a', () => [Tab('a', 'Overview'), Tab('b', 'Billing'), '|', Panel('a', 'overview text'), Panel('b', 'billing text')].join(' '));
console.log(app.render());
app.ctx.setActive('b');               // clicking a tab calls setActive from context
console.log(app.render());
try { Tab('a', 'orphan'); } catch (e) { console.log('error:', e.message); }`, 'Plain JS: how context reaches descendants (runnable)')],
      complexity: `<p>Each context change re-renders all consumers (Tab and Panel). Fine for a handful of tabs. For huge trees, split context into a stable "actions" context and a changing "state" context, or memoise the context value.</p>`,
      followUps: ['The context value object is re-created every render. Why does that matter and how do you fix it?', 'Add keyboard support: ArrowLeft/ArrowRight/Home/End with roving tabindex.']
    }
  });

  /* ======================= QUIZ ======================= */
  quiz.push({ q: 'What does a JSX tag like <code>&lt;Card name="Asha" /&gt;</code> compile to?', options: ['A string of HTML', 'A call such as <code>jsx(Card, { name: "Asha" })</code> that returns a plain object (an element)', 'A real DOM node created immediately', 'A new class instance'], answer: 1, explain: 'JSX is syntax sugar. The build tool turns it into function calls that return lightweight element objects describing the UI. React later turns those into DOM.' });
  quiz.push({ q: 'Why must a component name start with a capital letter in JSX?', options: ['It is only a style convention with no effect', 'Lowercase tags are treated as built-in HTML elements, capitalised tags as your own components', 'Capital letters make components run faster', 'Because JavaScript requires functions to be capitalised'], answer: 1, explain: 'JSX uses the first letter to decide: &lt;div&gt; becomes the string "div" (a host element) while &lt;Div&gt; refers to the variable Div (your function).' });
  quiz.push({ q: 'A child component runs <code>props.count = props.count + 1</code>. What is the correct way to let the child change that value?', options: ['Keep doing it; React allows writing to props', 'Use a global variable', 'The parent passes a callback prop (like onIncrement) and owns the state', 'Convert the child to a class'], answer: 2, explain: 'Props are read-only. Data flows down, events go up: the parent owns the state and gives the child a function it can call.' });
  quiz.push({ q: 'A handler runs <code>setCount(count + 1)</code> three times (count is 0). What does the next render show?', options: ['3', '1', '0', '2'], answer: 1, explain: 'All three calls use the same snapshot value of count (0), so each asks for 1. Use setCount(c => c + 1) to accumulate.' });
  quiz.push({ q: 'Which event causes a component to re-render?', options: ['Its parent re-renders (even with identical props)', 'A child\'s sibling changes a local variable', 'Any change to a global JavaScript variable', 'The browser window is resized'], answer: 0, explain: 'A component re-renders when its own state changes, when its parent re-renders, or when a context it reads changes. Plain variables and resizes do nothing by themselves.' });
  quiz.push({ q: 'A component re-renders 100 times but its output never changes. How many DOM updates does React perform?', options: ['100', 'About 50', 'Zero for the unchanged parts: React compares and only commits differences', 'It replaces the whole page each time'], answer: 2, explain: 'Rendering (calling functions) and committing (changing the DOM) are separate. React diffs the new output against the old and touches the DOM only where something differs.' });
  quiz.push({ q: 'Which key is best for rows of a list that users can reorder, add to and delete from?', options: ['The array index', 'Math.random()', 'A stable unique id that belongs to the item', 'The row\'s current text'], answer: 2, explain: 'The key must identify the same item across renders. Index shifts on reorder/insert/delete, random changes every render, and editable text changes while typing.' });
  quiz.push({ q: 'With <code>items = []</code>, what does <code>{items.length &amp;&amp; &lt;List items={items} /&gt;}</code> put on the screen?', options: ['Nothing', 'The text "0"', 'The text "false"', 'It throws an error'], answer: 1, explain: '0 && x evaluates to 0, and React renders numbers. Use items.length > 0 && ... or a ternary.' });
  quiz.push({ q: 'You write <code>&lt;input value={name} /&gt;</code> with no onChange. What happens?', options: ['It works like a normal input', 'The field is read-only in practice and React warns you', 'React adds its own onChange', 'The input is hidden'], answer: 1, explain: 'A controlled input always shows the state value. Without onChange nothing updates the state, so typing appears frozen (and React logs a warning).' });
  quiz.push({ q: 'Two sibling components must always show the same changing value. Where should the state live?', options: ['A separate useState in each sibling, synced with useEffect', 'In their closest common parent', 'In a module-level variable', 'In the first sibling only'], answer: 1, explain: 'Lift the state to the closest common parent, pass the value down as props, and pass a callback down for changes. One source of truth cannot disagree with itself.' });
  quiz.push({ q: 'What is the <code>children</code> prop mainly used for?', options: ['Listing the child components of a class', 'Letting a component render whatever JSX the caller places between its tags', 'Counting the number of DOM nodes', 'Storing the previous state'], answer: 1, explain: 'children is whatever is nested inside the tag. It is the basis of wrapper components such as Card, Layout and Modal.' });
  quiz.push({ q: '<code>&lt;ContactForm key={contact.id} /&gt;</code> — why add the key here, even though it is not in a list?', options: ['To silence a warning', 'Changing the key unmounts the old instance and mounts a fresh one, resetting its state', 'Keys make components faster', 'It is required for every component'], answer: 1, explain: 'React uses key as part of identity. A different key means a different component instance, so state starts again. It is a clean way to reset a form when the selected item changes.' });
  quiz.push({ q: 'A child is wrapped in <code>React.memo</code>, but the parent passes <code>options={{ color: "red" }}</code>. Does memo help?', options: ['Yes, the values are the same', 'No: a new object is created each render, so the shallow prop comparison fails', 'Yes, memo does a deep comparison', 'Only in production'], answer: 1, explain: 'memo compares props with Object.is. A fresh object literal is never equal to the previous one. Hoist it, memoise it, or avoid passing an object.' });
  quiz.push({ q: 'Why is defining a component function inside another component a bug?', options: ['It is a syntax error', 'The inner function is a brand-new type on each render, so React remounts it and loses its state and DOM', 'It makes the file longer', 'It is only a problem with TypeScript'], answer: 1, explain: 'React identifies components by type. A function re-created every render is a different type each time, causing unmount/mount and input focus loss.' });
  quiz.push({ q: 'What is wrong with <code>&lt;button onClick={handleSave()}&gt;</code>?', options: ['Nothing', 'handleSave runs during render instead of on click; you should pass the function: onClick={handleSave}', 'It will run twice per click', 'The button cannot be clicked'], answer: 1, explain: 'Adding parentheses calls the function immediately and passes its result. Pass the function itself, or wrap it: onClick={() => handleSave(id)}.' });

  /* ======================= INTERVIEW ======================= */
  interview.push({ q: 'What is JSX? Does the browser understand it?', level: 'B', a: `<p>JSX is a syntax extension that lets you write HTML-like markup inside JavaScript. Browsers do <b>not</b> understand it. A build step (Babel, SWC, esbuild in Vite or Next.js) compiles each tag into a function call such as <code>jsx("div", { className: "x", children: "Hi" })</code>, which returns a plain object called an <i>element</i>. React then reads those objects to update the DOM. Differences from HTML: <code>className</code>, <code>htmlFor</code>, camelCase events, <code>style</code> as an object, self-closing tags, one root (or Fragment), and <code>{}</code> to embed JavaScript expressions. Text inserted with <code>{}</code> is escaped by default, which prevents most XSS.</p>`, followUps: ['What is a Fragment and when do you need one?', 'What does the $$typeof field on an element protect against?', 'Can you use React without JSX?'] });
  interview.push({ q: 'What is the difference between props and state?', level: 'B', a: `<p><b>Props</b> are inputs passed from a parent to a child; they are read-only for the child. <b>State</b> is data a component owns and remembers between renders; it changes through its setter, and a change triggers a re-render. A good one-liner: props are like function arguments, state is like variables the function remembers between calls. When a child needs to change something owned by a parent, the parent passes a callback prop. If a value can be calculated from props or other state, do not store it in state at all; derive it during render.</p>`, followUps: ['Can a prop become state? What goes wrong if you copy a prop into state?', 'How does a child communicate with its parent?', 'Is "derived state" ever stored? When?'] });
  interview.push({ q: 'Why does React need a key when rendering a list, and what makes a good key?', level: 'B', a: `<p>When the list changes, React must decide which new element corresponds to which old element so it can reuse the DOM node and state, and only create or remove what really changed. The key is the identity it uses. A good key is <b>unique among siblings</b> and <b>stable</b> across renders, usually a database id. Index keys are acceptable only for static lists with no state. Random keys are the worst: every render looks like a brand-new list, so everything remounts. A bad key causes real bugs, e.g. typed text appearing in the wrong row after an insert or delete, and checkboxes keeping their ticks on the wrong item.</p>`, followUps: ['Show me a concrete bug caused by key={index}.', 'Is the key passed to the component as a prop?', 'How can a key be used to reset a component\'s state?'] });
  interview.push({ q: 'Explain the difference between controlled and uncontrolled inputs. Which do you prefer?', level: 'B', a: `<p>In a <b>controlled</b> input React state is the single source of truth: <code>value={state}</code> plus <code>onChange</code> that updates the state, so the value always goes through React. In an <b>uncontrolled</b> input the DOM keeps the value; you read it later with a ref or <code>new FormData(form)</code>, and can set an initial value with <code>defaultValue</code>. Controlled inputs make live validation, formatting, disabling buttons and resetting easy, at the cost of a re-render per keystroke. Uncontrolled inputs are simpler for one-shot forms, file inputs and very large forms (React Hook Form is built on this idea). For most forms I start controlled and optimise only if profiling shows it is needed.</p>`, followUps: ['What causes the "uncontrolled to controlled" warning?', 'How do you handle a file input?', 'How would you reduce re-renders in a 100-field form?'] });
  interview.push({ q: 'You call setCount(count + 1) three times in one click handler. What is the count after the click and why?', level: 'I', a: `<p>It increases by <b>1</b>, not 3. State is a <i>snapshot</i> for one render: inside the handler, <code>count</code> is a fixed value (say 0), so all three calls queue "set to 1". React batches the queue and renders once with 1. To accumulate use the updater form <code>setCount(c =&gt; c + 1)</code> three times: React stores the functions in a queue and runs them in order on the latest value (0 → 1 → 2 → 3). The same snapshot behaviour explains why <code>console.log(count)</code> right after a setter still prints the old value, and why async callbacks may see stale values.</p>`, followUps: ['What happens if you set the state to the same value?', 'Is batching also applied inside setTimeout and promises?', 'What does flushSync do?'] });
  interview.push({ q: 'When does a React component re-render, and how do you avoid unnecessary re-renders?', level: 'I', a: `<p>A component re-renders when its state changes, when its parent re-renders (regardless of whether props changed), or when a Context it consumes changes. It never re-renders because a <i>child</i> changed state. A re-render means the function is called again; the DOM is updated only where the output differs. Before optimising I measure with the React DevTools Profiler. Fixes, in order: move state down to the smallest component that needs it; pass slow subtrees as <code>children</code> so the wrapper receives the same element; split Context; wrap pure components in <code>React.memo</code> with stable props (hoisted constants, <code>useMemo</code>/<code>useCallback</code>); virtualise long lists. The React Compiler can add much of this automatically.</p>`, followUps: ['Why can memo fail even when props look the same?', 'What does the "children as props" trick do?', 'What is the React Compiler?'] });
  interview.push({ q: 'What does "lifting state up" mean and when would you NOT do it?', level: 'I', a: `<p>Lifting state up means moving state from a child to the closest common parent of the components that need it, then passing the value down as props and a callback down for changes. It creates one source of truth so siblings cannot disagree: the classic examples are two synced inputs and a filter bar plus a table. I would <b>not</b> lift when only one component uses the data (colocate it), because high state re-renders more of the tree and clutters props. If the data is needed far away, prop drilling becomes painful and I would use composition (pass elements down), Context, or an external store. Data that can be computed from other state should not be stored at all.</p>`, followUps: ['How do you decide the owner of a piece of state?', 'What are the downsides of lifting too high?', 'How does Context relate to lifting state?'] });
  interview.push({ q: 'Why do we say React prefers composition over inheritance? Give examples.', level: 'I', a: `<p>Composition builds components by combining others and passing JSX around, so each piece stays small and independent. Inheritance would couple a child to a parent's internals and handles combinations badly (a button that is both loading and danger). Examples: the <code>children</code> prop for containers (Card, Modal, Layout); named slot props (<code>header={&lt;Nav /&gt;}</code>); specialisation by wrapping (<code>DangerButton</code> renders <code>Button variant="danger"</code>); render props (a function prop that receives data); compound components (<code>&lt;Tabs&gt;&lt;Tabs.Tab/&gt;</code>) sharing state through Context. Composition also avoids prop drilling and keeps an expensive subtree stable because its elements are created by the parent.</p>`, followUps: ['When would you pick a render prop over a custom hook?', 'What is a compound component?', 'How does composition help with performance?'] });
  interview.push({ q: 'Why is mutating state (for example items.push(x); setItems(items)) a bug in React?', level: 'I', a: `<p>React decides whether state changed by comparing the old and new value with <code>Object.is</code>. A mutated array keeps the same reference, so React sees "no change" and may skip the re-render. Even when something re-renders, mutation breaks <code>React.memo</code> and <code>useMemo</code> (equal references), previous snapshots held by closures change under your feet, and tools like undo or the DevTools time-travel stop working. So always create new values: <code>[...items, x]</code>, <code>items.filter(...)</code>, <code>items.map(...)</code> with a copied changed item, <code>{ ...obj, field }</code>. For deeply nested data use Immer so you can write mutating-looking code that produces new immutable objects.</p>`, followUps: ['Why does toggling an item with a new outer array but a mutated inner object still cause bugs with memo?', 'How does Immer work?', 'Is it ever fine to mutate local variables in render?'] });
  interview.push({ q: 'Describe what React does from the moment setState is called until the screen changes.', level: 'A', a: `<p>1) <b>Trigger</b>: the setter queues an update on the component's hook and marks that fiber and its ancestors as having work; the scheduler batches updates and schedules a render. 2) <b>Render phase</b> (pure, can be paused in concurrent mode): React processes the update queue to compute new state, calls the component function to get new elements, and reconciles them against the previous tree. Children are re-rendered unless bailed out (same element reference, <code>memo</code> with equal props, no pending update). Keys and types decide reuse versus remount. 3) <b>Commit phase</b> (synchronous): React applies the minimal DOM mutations, attaches refs, runs layout effects, lets the browser paint, then runs passive effects (<code>useEffect</code>). Strict Mode may render twice in development to expose impure code.</p>`, followUps: ['What is the difference between the render and commit phases?', 'What is a fiber?', 'How does concurrent rendering change this?'] });
  interview.push({ q: 'Why is <code>{count && &lt;Badge /&gt;}</code> a bug, and how do you fix it?', level: 'I', a: `<p>The <code>&amp;&amp;</code> operator returns its left operand if it is falsy. When <code>count</code> is 0 the expression evaluates to the number 0, and React renders numbers, so a stray "0" appears on the page (NaN also renders). <code>false</code>, <code>null</code>, <code>undefined</code> and <code>true</code> render nothing, which is why people miss it. Fixes: make the left side a boolean (<code>count &gt; 0 &amp;&amp; ...</code>, <code>Boolean(count) &amp;&amp; ...</code>) or use a ternary with <code>null</code>. For whole-component states prefer early returns (loading, error, empty, data) driven by a single status value so impossible combinations cannot occur.</p>`, followUps: ['What else renders as empty text or nothing?', 'How do you model loading/error/success to avoid contradictory booleans?', 'How does conditional rendering affect component state?'] });
  interview.push({ q: 'Design a reusable Accordion (or Tabs) component API. What would you expose and where does state live?', level: 'A', a: `<p>I would separate presentation from coordination. <code>AccordionItem</code> is presentational: it receives <code>title</code>, <code>isOpen</code>, <code>onToggle</code> and <code>children</code>, renders a heading with a real <code>&lt;button&gt;</code> using <code>aria-expanded</code>/<code>aria-controls</code>, and a <code>role="region"</code> panel. The container owns the coordination state (<code>openId</code>, or a set for multiple open) because behaviours like "only one open" involve siblings. Content comes in as JSX children so callers can put anything inside. For maximum flexibility I would offer a compound API (<code>Accordion.Item/Trigger/Panel</code>) sharing state via Context, support controlled (<code>value</code> + <code>onValueChange</code>) and uncontrolled (<code>defaultValue</code>) modes, keyboard navigation (arrow keys, Home/End), and optional <code>keepMounted</code>.</p>`, followUps: ['How do you make it fully keyboard accessible?', 'Controlled vs uncontrolled: how do you support both?', 'How would this work with Server Components?'] });
  interview.push({ q: 'When does React keep a component\'s state, and when does it reset it?', level: 'A', a: `<p>React keeps state while the same component <b>type</b> stays at the same <b>position</b> in the tree with the same <b>key</b>. It resets when any of these change: the element type at that position (<code>&lt;A /&gt;</code> becomes <code>&lt;B /&gt;</code>), the key, or when it is removed from the tree (conditional rendering that stops rendering it) or its parent unmounts. Consequences: <code>{isMe ? &lt;Chat to="Me" /&gt; : &lt;Chat to="Ben" /&gt;}</code> keeps state because type and position match; adding <code>key</code> forces a reset; defining a component inside another produces a new type each render and resets constantly; hiding with CSS keeps state while not rendering destroys it. Index keys in dynamic lists make state follow the position instead of the item.</p>`, followUps: ['How would you reset a form when the selected user changes?', 'Why does a nested component definition lose focus on every keystroke?', 'How does conditional rendering interact with identity?'] });
  interview.push({ q: 'A form with 200 controlled fields lags when typing. How do you diagnose and fix it?', level: 'E', a: `<p>First <b>measure</b>: React DevTools Profiler shows what re-rendered per keystroke and why, and the browser Performance panel shows scripting cost. Almost certainly the form state sits in one parent, so each keystroke re-renders all 200 fields. Options, from least to most invasive: colocate state so each field component owns its own value and the parent only gets values on blur or submit; memoise field components and keep callbacks stable (or rely on the React Compiler); debounce expensive validation or run it per field instead of for the whole form; use an uncontrolled library such as React Hook Form that subscribes only to the fields that need updates; virtualise long field lists; avoid creating new objects in props. Also check unrelated expensive children and context values that change on every render.</p>`, followUps: ['What is the trade-off of uncontrolled forms?', 'How would you validate on the server and share rules with the client?', 'What would you look for in the Profiler flame graph?'] });
  interview.push({ q: 'What is the difference between a component, an element and an instance?', level: 'B', a: `<p>A <b>component</b> is the reusable recipe: a function (or class) that takes props and returns elements. An <b>element</b> is a small plain object describing what should be on the screen right now, such as <code>{ type: Card, props: { name: "Asha" } }</code>; elements are cheap, immutable and recreated on every render. An <b>instance</b> is the live, long-lived thing React keeps for a component mounted in the tree: it holds the state, hooks and DOM node. You write components, return elements, and React manages instances. This distinction explains why re-rendering is cheap (it only creates elements) and why state belongs to instances and survives re-renders.</p>`, followUps: ['Where is a component\'s state stored?', 'What does React compare when it diffs two renders?', 'Why are elements immutable?'] });

  registerModule({
    id: 'fe08',
    title: 'React Fundamentals',
    intro: `<p>React is the most common way to build screens today, and almost every frontend interview has a React round. This module teaches the <b>ten ideas</b> that everything else sits on: components, JSX, props, state, rendering and re-rendering, lists and keys, conditional rendering, controlled forms, lifting state up and composition.</p>
      <p>Each topic starts with an everyday analogy, shows real React code, then lets you <b>watch it happen</b> in a visualiser (component trees with props, re-render propagation, keyed vs unkeyed lists, controlled inputs, state flowing up and down). Every solution also comes with a small runnable plain-JavaScript model, so you can see the idea without any framework. You will build the classics asked in machine-coding rounds: counter, todo list, login form with validation, filterable product table, two synced inputs and an accordion.</p>`,
    goals: [
      'Write function components in JSX and explain what JSX compiles to and why component names are capitalised',
      'Pass data with props, use <code>children</code> and callbacks, and keep data flowing down and events flowing up',
      'Use <code>useState</code> correctly: snapshots, updater functions, and immutable updates for objects and arrays',
      'Predict exactly which components re-render when state changes, and fix needless re-renders by moving state down',
      'Render lists with stable keys, and explain bugs caused by index or random keys',
      'Handle loading/error/empty/data states and avoid the <code>0 &amp;&amp;</code> trap',
      'Build controlled forms with derived validation, lift state to synchronise components, and design flexible UI with composition'
    ],
    prereqs: `the Frontend module on DOM &amp; Events for events and forms, and JS modules on functions, closures, arrays (<code>map</code>/<code>filter</code>) and destructuring/spread. No React experience needed.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
