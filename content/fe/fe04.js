(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function esc(s) { return H.esc(String(s)); }
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function note(label, htmlText) { return { type: 'text', label: label, html: htmlText }; }
  function words(input, def) {
    return String(input === undefined || input === null ? def : input).trim().split(/[\s,]+/).filter(function (w) { return w.length; });
  }

  /* A tiny pretend page. Index = position in a level-order binary tree (children of i are 2i+1 and 2i+2).
         body
        /    \
      nav    main#app
     /  \     /     \
    a    a  ul#tasks  form#signup
           /   \      /     \
         li    li   input  button                                           */
  var DOM = [
    { t: 'body' },
    { t: 'nav', c: ['top'] }, { t: 'main', id: 'app' },
    { t: 'a', c: ['link'] }, { t: 'a', c: ['link', 'active'] }, { t: 'ul', id: 'tasks', c: ['list'] }, { t: 'form', id: 'signup' },
    null, null, null, null,
    { t: 'li', c: ['item'] }, { t: 'li', c: ['item', 'done'] }, { t: 'input', c: ['field'] }, { t: 'button', c: ['btn'] }
  ];
  function parentOf(i) { return i <= 0 ? -1 : (i - 1) >> 1; }
  function dName(i) {
    var n = DOM[i];
    return n.t + (n.id ? '#' + n.id : '') + (n.c ? '.' + n.c.join('.') : '');
  }
  function dTag(i) {
    var n = DOM[i];
    return (n.id ? '#' + n.id : '') + (n.c ? '.' + n.c[n.c.length - 1] : '');
  }
  function domTags() {
    var t = {};
    DOM.forEach(function (n, i) { if (n) t[i] = dTag(i); });
    return t;
  }
  function domArr(gone) {
    gone = gone || {};
    return DOM.map(function (n, i) {
      if (!n) return null;
      for (var k = i; k >= 0; k = parentOf(k)) if (gone[k]) return null;
      return n.t;
    });
  }
  function preorder(i, out) {
    if (i >= DOM.length || !DOM[i]) return out;
    out.push(i);
    preorder(2 * i + 1, out);
    preorder(2 * i + 2, out);
    return out;
  }
  function ancestors(i) {          // root first, ending at i
    var p = [];
    for (var k = i; k >= 0; k = parentOf(k)) p.unshift(k);
    return p;
  }

  /* --- selector parser/matcher for the pretend page (tag, .class, #id, descendant, child) --- */
  function parseSel(sel) {
    var toks = String(sel).replace(/>/g, ' > ').trim().split(/\s+/).filter(Boolean);
    var parts = [], comb = ' ';
    toks.forEach(function (t) {
      if (t === '>') { comb = '>'; return; }
      var m = /^([a-zA-Z][a-zA-Z0-9]*)?((?:[.#][A-Za-z0-9_-]+)*)$/.exec(t);
      if (!m) throw new Error('Supported: tag, .class, #id, "a b" (descendant), "a > b" (child). Could not read: ' + t);
      var cls = [], id = null;
      (m[2].match(/[.#][A-Za-z0-9_-]+/g) || []).forEach(function (x) { if (x.charAt(0) === '.') cls.push(x.slice(1)); else id = x.slice(1); });
      parts.push({ comb: comb, tag: m[1] ? m[1].toLowerCase() : null, cls: cls, id: id });
      comb = ' ';
    });
    if (!parts.length) throw new Error('Type a selector such as  li  or  .item  or  ul > li  or  #app a');
    if (parts.length > 4) throw new Error('Use at most 4 parts in the selector');
    return parts;
  }
  function cmpMatch(n, p) {
    if (!n) return false;
    if (p.tag && n.t !== p.tag) return false;
    if (p.id && n.id !== p.id) return false;
    for (var k = 0; k < p.cls.length; k++) if ((n.c || []).indexOf(p.cls[k]) < 0) return false;
    return true;
  }
  function selMatch(i, parts, pi) {
    if (!cmpMatch(DOM[i], parts[pi])) return false;
    if (pi === 0) return true;
    var p = parentOf(i);
    if (parts[pi].comb === '>') return p >= 0 && selMatch(p, parts, pi - 1);
    while (p >= 0) { if (selMatch(p, parts, pi - 1)) return true; p = parentOf(p); }
    return false;
  }
  function boxes(label, nodes, edges, hl, ehl, tags, height) {
    return {
      type: 'graph', label: label, directed: true, height: height || 60,
      nodes: nodes.map(function (n) { return { id: n.id, label: n.label || n.id, x: n.x, y: n.y, shape: 'box', w: n.w }; }),
      edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {}
    };
  }

  /* ======================================================================
     TOPIC 1 — The DOM tree and finding elements
     ====================================================================== */
  topics.push({
    title: 'The DOM Tree & Finding Elements (querySelector and Friends)',
    analogy: `<p>Think of a <b>family tree</b> printed on a wall. Grandma (<code>body</code>) has children, those children have children, and everybody has exactly one parent. If you want to talk to "the cousin who loves chess", you do not shout at the whole street - you give an <b>address</b>: "Grandma's second son, his first daughter". A <b>CSS selector</b> is that address. <code>querySelector</code> is you walking the family tree, checking each person, and stopping at the first one who matches.</p>`,
    explain: `<p>🟢 <b>What is the DOM?</b> Your HTML file is just text. The browser reads that text and builds a <b>live tree of objects in memory</b> called the <b>DOM</b> (Document Object Model). JavaScript never touches your HTML file - it touches <i>this tree</i>. When you change the tree, the screen changes.</p>
      <p>Every box in the tree is a <b>node</b>. The ones you use daily:</p>
      ${H.table(['Node type', 'Example', 'Remember it as'], [
        ['Element node', '<code>&lt;li class="item"&gt;</code>', 'a tag - has children, attributes, a class list'],
        ['Text node', 'the words "Buy milk" inside the li', 'raw text - has no children, no classes'],
        ['Comment node', '<code>&lt;!-- note --&gt;</code>', 'ignored by the screen'],
        ['Document node', '<code>document</code>', 'the root door into everything']
      ])}
      <p>Relationships use family words: <b>parent</b>, <b>child</b>, <b>sibling</b>, <b>ancestor</b> (any level up), <b>descendant</b> (any level down). In our pretend page below, <code>main</code> is the parent of <code>ul</code> and <code>form</code>; <code>body</code> is an ancestor of every <code>li</code>.</p>
      <p>🔵 <b>Finding elements.</b> You almost always use two methods:</p>
      ${H.table(['Method', 'Returns', 'Good for'], [
        ['<code>document.querySelector(css)</code>', 'the <b>first</b> match, or <code>null</code>', 'one element'],
        ['<code>document.querySelectorAll(css)</code>', 'a <b>static NodeList</b> (maybe empty)', 'many elements, loop with <code>forEach</code>'],
        ['<code>document.getElementById("app")</code>', 'one element or <code>null</code>', 'fast, no <code>#</code> needed'],
        ['<code>getElementsByClassName / TagName</code>', 'a <b>live</b> HTMLCollection', 'old style; it updates itself when the page changes'],
        ['<code>el.closest(css)</code>', 'nearest ancestor (or itself) that matches', 'walking <i>up</i> - the star of event delegation'],
        ['<code>el.matches(css)</code>', '<code>true</code>/<code>false</code>', '"is this element a .btn?"']
      ])}
      <p>Walking the tree without selectors: <code>el.parentElement</code>, <code>el.children</code>, <code>el.firstElementChild</code>, <code>el.nextElementSibling</code>. Prefer the <b>Element</b> versions. The plain <code>childNodes</code>/<code>nextSibling</code> also return <b>text nodes</b> (the line breaks between your tags!), which surprises everybody once.</p>
      <p><b>Scope tip:</b> you can search inside one element: <code>form.querySelector('input')</code> only looks at that form's descendants. Smaller search, clearer code.</p>`,
    clues: [
      '"Select all elements with class ..." / "get the first button inside the form" → <code>querySelector(All)</code> with a CSS selector',
      '"Find the nearest parent that is a ..." → <code>closest()</code> (walks UP, includes the element itself)',
      '"Why does my loop skip items / my NodeList changes while I loop?" → live <code>HTMLCollection</code> vs static NodeList',
      '"Why is firstChild a blank text?" → <code>childNodes</code> includes whitespace text nodes; use <code>firstElementChild</code>',
      '"Implement getElementsByClassName / querySelector yourself" → tree traversal (DFS in document order) - a classic frontend + DSA overlap'
    ],
    code: [
      { lang: 'js', title: 'Everyday querying (DOM code - browser only)', code: `// One element (first match) - returns null when nothing matches, so always check
const list = document.querySelector('#tasks');
if (!list) throw new Error('#tasks is missing from the page');

// Many elements: NodeList is static (a snapshot) and has forEach
const items = document.querySelectorAll('#tasks > li.item');
items.forEach((li, i) => console.log(i, li.textContent));

// Search INSIDE an element (smaller, faster, clearer)
const form = document.querySelector('form#signup');
const email = form.querySelector('input[name="email"]');

// Walking UP from something small to the thing you care about
document.addEventListener('click', (event) => {
  const li = event.target.closest('li');   // null if the click was not inside any li
  if (li) console.log('clicked item:', li.textContent);
});

// Is this element what I think it is?
console.log(email.matches('input.field'));  // true / false

// Walking sideways and down (element-only helpers skip whitespace text nodes)
const first = list.firstElementChild;       // first li
const second = first.nextElementSibling;    // second li
console.log(list.children.length, list.childNodes.length); // childNodes is bigger (text nodes!)` },
      { lang: 'js', run: true, title: 'Run it: getElementsByClassName by hand (DFS on a plain object tree)', code: `// A pretend DOM made of plain objects, so this runs anywhere (no browser needed).
const page = {
  tag: 'body', cls: [], children: [
    { tag: 'nav', cls: ['top'], children: [
      { tag: 'a', cls: ['link'], children: [] },
      { tag: 'a', cls: ['link', 'active'], children: [] }
    ] },
    { tag: 'main', cls: [], children: [
      { tag: 'ul', cls: ['list'], children: [
        { tag: 'li', cls: ['item'], children: [] },
        { tag: 'li', cls: ['item', 'done'], children: [] }
      ] }
    ] }
  ]
};

// Depth-first, parent BEFORE children = "document order" (the order querySelectorAll uses).
function byClass(node, name, found = []) {
  if (node.cls.includes(name)) found.push(node.tag + '.' + node.cls.join('.'));
  for (const child of node.children) byClass(child, name, found);
  return found;
}

console.log('link  ->', byClass(page, 'link'));
console.log('item  ->', byClass(page, 'item'));
console.log('done  ->', byClass(page, 'done'));
console.log('nope  ->', byClass(page, 'nope'));` }
    ],
    viz: {
      title: 'querySelector(All) walking the DOM tree',
      input: 'ul > li.done',
      inputLabel: 'CSS selector (try: li, .link, #app a, nav > a.active, form input, .item.done)',
      gen: function (input) {
        var sel = String(input === undefined ? 'li' : input).trim();
        var parts = parseSel(sel);
        var order = preorder(0, []);
        var tags = domTags(), arr = domArr();
        var frames = [], seen = {}, matches = [];
        frames.push({
          narr: 'This is our pretend page as a tree. The browser walks it from the top, <b>parent before children</b> (document order), and asks every element: "do you match <code>' + esc(sel) + '</code>?"',
          parts: [
            { type: 'tree', label: 'DOM tree (tags under each node show #id / .class)', arr: arr, tags: tags },
            { type: 'vars', vals: { selector: sel, 'elements to check': order.length } }
          ]
        });
        order.forEach(function (i, step) {
          var ok = selMatch(i, parts, parts.length - 1);
          var hl = {};
          Object.keys(seen).forEach(function (k) { hl[k] = seen[k]; });
          hl[i] = 'cur';
          if (ok) matches.push(dName(i));
          seen[i] = ok ? 'ok' : 'done';
          frames.push({
            narr: 'Visit #' + (step + 1) + ': <b>' + esc(dName(i)) + '</b>. ' + (ok
              ? '<span class="c-g">Match!</span> ' + (matches.length === 1 ? '<code>querySelector</code> would stop right here and return it.' : '<code>querySelectorAll</code> keeps going and adds it to the list.')
              : '<span class="c-m">No match</span>' + (parts.length > 1 ? ' (the browser actually checks the LAST part first, then looks at ancestors).' : '.')),
            parts: [
              { type: 'tree', label: 'DOM tree', arr: arr, hl: hl, tags: tags },
              { type: 'array', label: 'querySelectorAll result so far', values: matches.length ? matches.slice() : ['(empty)'] },
              { type: 'vars', vals: { 'querySelector': matches.length ? matches[0] : 'null (so far)', 'querySelectorAll().length': matches.length }, hl: ok ? { 'querySelectorAll().length': 'ok' } : {} }
            ]
          });
        });
        var fin = {};
        order.forEach(function (i) { fin[i] = seen[i] === 'ok' ? 'sel' : 'done'; });
        frames.push({
          narr: 'Walk finished. <code>querySelector</code> returns the first match (<b>' + esc(matches.length ? matches[0] : 'null') + '</b>); <code>querySelectorAll</code> returns all <b>' + matches.length + '</b> as a static NodeList.' + (matches.length ? '' : ' Nothing matched, so you get <code>null</code> / an empty list - always check before using it!'),
          parts: [
            { type: 'tree', label: 'Matches in purple', arr: arr, hl: fin, tags: tags },
            { type: 'array', label: 'NodeList', values: matches.length ? matches.slice() : ['(empty)'], hl: matches.length ? { 0: 'sel' } : {} }
          ]
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'Always handle "not found"',
        html: `<p><code>querySelector</code> returns <code>null</code> when nothing matches, and <code>null.textContent</code> throws <b>TypeError: Cannot read properties of null</b>. This is the #1 beginner crash. It usually happens because the script ran <i>before</i> the element existed (put <code>&lt;script type="module"&gt;</code> or <code>defer</code> at the end, or wait for <code>DOMContentLoaded</code>), or because of a typo in the selector.</p>`,
        code: `const title = document.querySelector('.titel'); // typo!
console.log(title);                // null
// title.textContent = 'Hi';       // would throw TypeError
if (title) title.textContent = 'Hi';
title?.classList.add('big');       // optional chaining: does nothing when null`
      },
      {
        title: 'Static NodeList vs live HTMLCollection',
        html: `<p><code>querySelectorAll</code> takes a <b>photo</b> of the matches at that moment. <code>getElementsByClassName</code> hands you a <b>live camera feed</b>: if a new matching element is added later, your variable quietly grows. A live list can cause infinite loops or skipped items when you remove while looping forward.</p>${H.table(['Step', 'static NodeList (qSA)', 'live HTMLCollection (byClassName)'], [['at start: 3 items', 'length 3', 'length 3'], ['you add a 4th <code>.item</code>', 'still 3', '<span class="c-y">now 4</span>'], ['you remove while looping with <code>for (i...)</code>', 'safe', '<span class="c-r">skips items</span> (list shrinks under you)']])}`,
        code: `const snapshot = document.querySelectorAll('.item');          // static
const live = document.getElementsByClassName('item');         // live
document.querySelector('#tasks').append(Object.assign(document.createElement('li'), { className: 'item' }));
console.log(snapshot.length, live.length); // 3 4

// Safe way to remove many from a live collection: copy first
Array.from(live).forEach((el) => el.remove());`
      },
      {
        title: 'closest() and matches() - the two selector helpers on elements',
        html: `<p><code>closest</code> goes <b>up</b> (itself, then parent, grandparent ...) until one matches. <code>matches</code> only checks the element <b>itself</b>. Together they answer "was this click on (or inside) something I care about?". Inside a <code>&lt;li&gt;</code> that contains a <code>&lt;span&gt;</code>, a click on the span has <code>event.target</code> = span, but <code>event.target.closest('li')</code> = the li.</p>${H.table(['Call', 'Starting at <code>span.text</code> inside <code>li.item</code>'], [['<code>span.matches("li")</code>', '<span class="c-r">false</span>'], ['<code>span.closest("li")</code>', '<span class="c-g">the li</span>'], ['<code>span.closest(".nothing")</code>', '<code>null</code>']])}`,
        code: `// Typical pattern
function itemOf(node) {
  return node.closest('li.item');   // null when the click was outside every item
}`
      },
      {
        title: 'childNodes vs children (the whitespace trap)',
        html: `<p>For <code>&lt;ul&gt;\\n  &lt;li&gt;A&lt;/li&gt;\\n  &lt;li&gt;B&lt;/li&gt;\\n&lt;/ul&gt;</code> the browser keeps the line breaks as text nodes. So <code>ul.childNodes.length</code> is <b>5</b> (text, li, text, li, text) but <code>ul.children.length</code> is <b>2</b>. And <code>ul.firstChild</code> is a blank text node, not the first li. Use <code>firstElementChild</code>.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How selector matching really works.</b> Browsers match selectors <b>right to left</b>. For <code>nav &gt; a.active</code> they first test "is this an <code>a</code> with class <code>active</code>?" - cheap and rejects most nodes - and only then check the parent. That is why a long selector like <code>div div div span</code> is not terrible, but the rightmost part ("key selector") should be specific. For <code>querySelectorAll</code> you also pay for the <b>walk over every node under the root</b>, so scoping to a small subtree (<code>form.querySelectorAll</code>) beats searching all of <code>document</code>. <code>getElementById</code> is a hash-table lookup (the browser keeps an id map), so it is the fastest; ids must be unique per document.</p>
      <p><b>Document order.</b> Results come back in <b>pre-order depth-first</b> order (parent, then its children left to right) - exactly the traversal in the runnable example above. This is the same tree walk as a DSA "preorder", and "implement getElementsByClassName / getElementsByTagName / querySelector" is a favourite frontend interview question for that reason.</p>
      <p><b>Not the same as your source.</b> The DOM is what the browser <i>repaired and built</i>, not your file: a <code>&lt;table&gt;</code> without <code>&lt;tbody&gt;</code> gets a tbody inserted, unclosed tags get closed, and anything JS adds is in the DOM but not in "View Source". Always trust the <b>Elements</b> panel in DevTools.</p>
      <p><b>Edges.</b> Queries do not pierce <b>Shadow DOM</b> (web components keep private trees; use <code>el.shadowRoot.querySelector</code> or composed paths). Selectors with odd characters in ids need <code>CSS.escape(id)</code>. <code>:scope</code> lets a scoped query refer to the root element (<code>el.querySelectorAll(':scope &gt; li')</code> = direct children only). <code>NodeList</code> is not an array: use <code>Array.from</code> or spread to <code>map/filter</code>. In real apps, with React/Vue you rarely query the DOM at all - you hold <b>refs</b> - but you still need this for vanilla JS, browser extensions, tests (<code>screen.getByRole</code> is a smarter cousin) and scraping.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI assistants write selectors instantly and are good at turning "the delete button in the second row" into <code>tr:nth-child(2) .del</code>. <b>Use it as a partner:</b> paste a chunk of HTML and ask <code>Give me 3 selectors for the active nav link, rank them by how likely they are to survive a redesign</code> - it will usually point out that <code>.nav &gt; a:nth-child(2)</code> is fragile and <code>[aria-current="page"]</code> or a <code>data-testid</code> is stable.</p>
      <p><b>Where AI goes wrong:</b> it invents ids and classes that are not in your HTML; forgets to handle <code>null</code>; uses <code>getElementsByClassName</code> in a loop that removes nodes; and loves <code>innerHTML</code> where <code>textContent</code> is right. <b>What you must still own:</b> reading the real DOM in DevTools (<code>$0</code>, <b>Copy selector</b>), choosing stable hooks (roles, <code>data-*</code>), and knowing static vs live so you can spot the bug when generated code skips elements.</p>`,
    problems: [
      {
        title: 'Collect Elements by Class Name (write getElementsByClassName)',
        level: 'Easy', tags: ['DOM', 'tree traversal', 'DFS'], companies: ['Google', 'Meta', 'Amazon'],
        statement: `<p>You are given the root of a DOM-like tree. Each node is <code>{ tag, cls: [...classNames], children: [...] }</code>. Write <code>getByClass(root, name)</code> that returns an array of the <b>tags</b> of all nodes (including the root) that have class <code>name</code>, in <b>document order</b> (parent before its children, children left to right) - just like <code>getElementsByClassName</code>.</p>`,
        constraints: `Up to 10<sup>4</sup> nodes. Depth can be large (use recursion carefully or an explicit stack). A node may have several classes.`,
        example: `<p>Tree: <code>body &gt; [nav.top &gt; [a.link, a.link.active], main &gt; [ul.list &gt; [li.item, li.item.done]]]</code></p>${H.table(['name', 'output', 'why'], [['"link"', '["a", "a"]', 'both anchors have <code>link</code>, nav comes before main'], ['"done"', '["li"]', 'only the second li'], ['"x"', '[]', 'nobody has it']])}`,
        brute: {
          why: `<p>The naive way is to first flatten the whole tree into an array of every node, then filter it. It is correct but uses extra memory for the full flat copy and does two passes, when one pass that collects matches while walking is enough. It also tends to flatten with the wrong order (children before parent) if you push after recursing.</p>`,
          code: `function getByClassBrute(root, name) {
  const all = [];
  (function flatten(n) {            // pass 1: copy EVERY node
    all.push(n);
    n.children.forEach(flatten);
  })(root);
  return all.filter((n) => n.cls.includes(name)).map((n) => n.tag); // pass 2
}`
        },
        mcq: { q: 'Which traversal order does querySelectorAll / getElementsByClassName use?', options: ['Pre-order depth-first (parent, then children left to right)', 'Post-order (children first)', 'Breadth-first level by level'], answer: 0, explain: 'The browser returns elements in document order, which is a pre-order DFS: the parent is seen before any of its descendants.' },
        hints: [
          `<p>Hint 1: the aha - every node is either a match or not, and then you do the <b>same job on each child</b>. That is recursion on a tree.</p>`,
          `<p>Hint 2: do the check on the current node <b>first</b>, then loop over children in order. Doing it first gives document order.</p>`,
          `<p>Hint 3: recipe - <code>visit(node)</code>: if <code>node.cls</code> contains name, push <code>node.tag</code>; for each child in order call <code>visit(child)</code>. Edge cases: root itself can match, empty children, a name nobody has returns <code>[]</code>. For very deep trees use an explicit stack and push children in <b>reverse</b> so the leftmost pops first.</p>`
        ],
        solution: {
          approach: `<p>One pass, collecting as we go. Check the node, then recurse into children left to right. An explicit-stack version (children pushed in reverse) avoids a call-stack overflow on very deep trees.</p>`,
          code: { lang: 'js', run: true, code: `function getByClass(root, name) {
  const out = [];
  (function visit(node) {
    if (node.cls.includes(name)) out.push(node.tag);   // check parent FIRST -> document order
    for (const child of node.children) visit(child);   // then children, left to right
  })(root);
  return out;
}

// Iterative twin: explicit stack, children pushed in reverse so leftmost pops first
function getByClassIter(root, name) {
  const out = [], stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (node.cls.includes(name)) out.push(node.tag);
    for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
  }
  return out;
}

const leaf = (tag, ...cls) => ({ tag, cls, children: [] });
const page = { tag: 'body', cls: [], children: [
  { tag: 'nav', cls: ['top'], children: [leaf('a', 'link'), leaf('a', 'link', 'active')] },
  { tag: 'main', cls: [], children: [{ tag: 'ul', cls: ['list'], children: [leaf('li', 'item'), leaf('li', 'item', 'done')] }] }
] };
console.log(getByClass(page, 'link'));      // [ 'a', 'a' ]
console.log(getByClass(page, 'done'));      // [ 'li' ]
console.log(getByClassIter(page, 'item'));  // [ 'li', 'li' ]
console.log(getByClass(page, 'x'));         // []` },
          complexity: `<p>Time O(N) - each node visited once. Space O(H) for the recursion/stack (H = tree height) plus the output.</p>`,
          followUps: ['Support multiple classes: elements that have ALL of "a b".', 'Implement querySelector (first match) with early exit.', 'Make it work for a tree 100,000 levels deep.']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 2 — Creating and manipulating elements
     ====================================================================== */
  topics.push({
    title: 'Manipulating Elements: Create, Insert, Edit, Remove',
    analogy: `<p>Editing the DOM is like building with <b>LEGO</b>. <code>createElement</code> picks a brick out of the box - it is on your desk, but nobody can see it. Setting <code>textContent</code> and <code>classList</code> is painting the brick. <code>parent.append(brick)</code> finally <b>snaps it onto the model</b> - only now does it appear on the screen. And <code>brick.remove()</code> pulls it off. <code>innerHTML</code> is like pouring a bag of mixed bricks from a stranger onto your model without looking inside - quick, but dangerous if the bag contains something nasty.</p>`,
    explain: `<p>🟢 <b>Four jobs:</b> <b>create</b> new elements, <b>insert</b> them, <b>change</b> them, <b>remove</b> them. Every one is a tiny method call on the tree.</p>
      ${H.table(['Job', 'Modern way', 'Notes'], [
        ['Create', '<code>document.createElement("li")</code>', 'brand-new, <b>detached</b> (not on the page yet)'],
        ['Insert', '<code>parent.append(a, b)</code> · <code>prepend</code> · <code>el.before(x)</code> · <code>el.after(x)</code> · <code>el.replaceWith(x)</code>', 'accept elements <i>and</i> plain strings (strings become safe text)'],
        ['Remove', '<code>el.remove()</code>', 'old way: <code>parent.removeChild(el)</code>'],
        ['Text', '<code>el.textContent = "Hi"</code>', 'always safe - the string is just text'],
        ['HTML', '<code>el.innerHTML = "&lt;b&gt;Hi&lt;/b&gt;"</code>', 'parses the string into elements - <span class="c-r">XSS risk with user input</span>'],
        ['Classes', '<code>el.classList.add / remove / toggle / contains</code>', 'better than editing the <code>className</code> string'],
        ['Attributes', '<code>el.setAttribute("aria-label", "x")</code>, <code>el.dataset.id = 5</code>', '<code>data-user-id</code> becomes <code>dataset.userId</code>'],
        ['Style', '<code>el.style.color = "red"</code>', 'inline; for many rules toggle a class instead']
      ])}
      <p>🔵 <b>Attribute vs property.</b> HTML <i>attributes</i> are the starting text in the markup (<code>&lt;input value="Ann"&gt;</code>). The DOM <i>property</i> (<code>input.value</code>) is the <b>current live state</b>. Once the user types, <code>input.value</code> changes but <code>getAttribute("value")</code> still says "Ann". For form controls, read and write the <b>property</b> (<code>value</code>, <code>checked</code>, <code>disabled</code>).</p>
      <p><b>textContent vs innerHTML vs innerText.</b> <code>textContent</code> = all the raw text, fastest, safe. <code>innerHTML</code> = markup string, re-parsed every time. <code>innerText</code> = the text <i>as rendered</i> (respects CSS like <code>display:none</code>, forces layout - slower). Default to <code>textContent</code>.</p>
      <p><b>Adding many items.</b> Each insertion into the live page can make the browser re-measure the layout. Build the list <i>off-screen</i> first - in a <code>DocumentFragment</code> (a light "box" node that vanishes when you insert it, leaving only its children) - then insert once. Watch the visualizer: nothing appears until the <code>append</code> step.</p>`,
    clues: [
      '"Add an item to the list" / "render these rows" → <code>createElement</code> + <code>textContent</code> + <code>append</code>',
      '"The text comes from the user / the API" → <b>never</b> <code>innerHTML</code>; use <code>textContent</code> (XSS)',
      '"Add 1,000 rows without jank" → <code>DocumentFragment</code> or build one string and set once; batch DOM writes',
      '"Toggle dark mode / mark as done" → <code>classList.toggle</code>, not editing inline styles',
      '"input.value vs getAttribute(value)" → property = live state, attribute = initial markup',
      '"clone this row" → <code>cloneNode(true)</code> (deep) or a <code>&lt;template&gt;</code> element'
    ],
    code: [
      { lang: 'js', title: 'The create → decorate → insert → remove cycle', code: `const list = document.querySelector('#tasks');

// 1. CREATE (detached - not visible yet)
const li = document.createElement('li');

// 2. DECORATE
li.textContent = 'Buy milk';              // safe text
li.classList.add('item');                 // class list is nicer than className strings
li.dataset.id = '42';                     // becomes data-id="42"
li.setAttribute('role', 'listitem');      // any attribute

// 3. INSERT (now it shows up on screen)
list.append(li);                          // at the end; list.prepend(li) puts it first

// 4. EDIT later
li.classList.toggle('done');              // add if missing, remove if present
li.classList.toggle('done', true);        // force ON (second arg = force)

// 5. REMOVE
li.remove();

// Properties vs attributes on a form control
const name = document.querySelector('input.field');
name.value = 'Ann';                       // property: what the user sees right now
console.log(name.getAttribute('value'));  // still the ORIGINAL markup value (or null)` },
      { lang: 'js', run: true, title: 'Run it: why innerHTML needs escaping (escapeHtml in plain JS)', code: `// What textContent does for you automatically, written by hand.
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const evil = '<img src=x onerror="steal()">';
console.log('raw   :', '<li>' + evil + '</li>');            // browser would build a real <img> and run onerror!
console.log('safe  :', '<li>' + escapeHtml(evil) + '</li>'); // browser shows it as harmless text
console.log('plain :', escapeHtml('Tom & "Jerry"'));` }
    ],
    viz: {
      title: 'Create → decorate → append → remove, and what the tree shows',
      input: 'eggs',
      inputLabel: 'Text for the new item (try: eggs   or   <b>hi</b>   to see the innerHTML danger)',
      gen: function (input) {
        var text = String(input === undefined ? 'eggs' : input).slice(0, 40);
        if (!text.trim()) throw new Error('Type some text for the new item, e.g. eggs');
        var tags = domTags();
        function tree(hl, gone) { return { type: 'tree', label: 'ul#tasks and its page (what the user can see)', arr: domArr(gone), hl: hl || {}, tags: tags }; }
        var gone12 = { 12: true };
        var risky = /[<>&]/.test(text);
        var frames = [];
        frames.push({
          narr: 'Start: the list <code>ul#tasks</code> has <b>one</b> item (<code>li.item</code>). Our job: add a new item with the text <b>' + esc(text) + '</b>, then remove the first one.',
          parts: [tree({ 5: 'win', 11: 'ok' }, gone12), { type: 'array', label: 'ul.children', values: ['li.item'] }]
        });
        frames.push({
          narr: '<code>const li = document.createElement("li")</code>. The new element exists in memory but is <b>detached</b> - it has no parent, so it is NOT in the tree and NOT on screen.',
          parts: [tree({ 5: 'win' }, gone12), { type: 'vars', label: 'li (new)', vals: { tagName: 'LI', parentNode: 'null', isConnected: 'false', textContent: '""' }, hl: { isConnected: 'bad' } }]
        });
        frames.push({
          narr: '<code>li.textContent = ' + esc(JSON.stringify(text)) + '</code>. The text is stored as a <b>text node</b>' + (risky ? ' - exactly as typed, the symbols are just characters (safe!).' : '.') + ' Still detached, still invisible.',
          parts: [tree({ 5: 'win' }, gone12), { type: 'vars', label: 'li (new)', vals: { isConnected: 'false', textContent: text }, hl: { textContent: 'ok' } }]
        });
        frames.push({
          narr: '<code>li.classList.add("item")</code> and <code>li.dataset.id = "2"</code> decorate it. Doing these <i>before</i> inserting is cheap: nobody can see the half-built element.',
          parts: [tree({ 5: 'win' }, gone12), { type: 'vars', label: 'li (new)', vals: { className: 'item', 'data-id': '2', isConnected: 'false' } }]
        });
        frames.push({
          narr: '<code>ul.append(li)</code> - <span class="c-g">snap!</span> The li becomes the ul\'s 2nd child (green node). <code>isConnected</code> flips to true and the browser can now lay it out and paint it.',
          parts: [tree({ 5: 'win', 12: 'ok' }), { type: 'array', label: 'ul.children', values: ['li.item', 'li.item (' + text.slice(0, 12) + ')'], hl: { 1: 'ok' } }, { type: 'vars', vals: { isConnected: 'true', 'ul.children.length': 2 }, hl: { isConnected: 'ok' } }]
        });
        frames.push({
          narr: 'Compare with <code>ul.innerHTML += ...</code>: it would <b>re-parse the whole list</b> (destroying every existing li and its listeners) and ' + (risky ? '<span class="c-r">your text contains &lt; &gt; or &amp; - the browser would treat it as real markup (an XSS hole if it came from a user)</span>.' : 'it works for plain text but is slower and loses event listeners on the old items.') + ' <code>textContent</code> + <code>append</code> avoids both problems.',
          parts: [{
            type: 'table', label: 'textContent vs innerHTML for this text', columns: ['API', 'Result for ' + text.slice(0, 18), 'Verdict'],
            rows: [['li.textContent = text', 'shows exactly: ' + text.slice(0, 22), 'safe'], ['li.innerHTML = text', risky ? 'parsed as HTML (may create elements)' : 'same on screen', risky ? 'DANGER' : 'ok but slower']],
            hl: { 1: risky ? 'bad' : 'cur', 0: 'ok' }
          }]
        });
        frames.push({
          narr: '<code>first.remove()</code> on the original item. It leaves the tree (its slot becomes empty) and is garbage collected if nothing else points to it. Its remaining sibling shifts to be the first child in <code>ul.children</code>.',
          parts: [tree({ 5: 'win', 11: 'bad', 12: 'ok' }), { type: 'array', label: 'ul.children (before)', values: ['li.item', 'li.item (' + text.slice(0, 12) + ')'], hl: { 0: 'bad' } }]
        });
        frames.push({
          narr: 'After the removal only the new item is left. Tip: when adding <b>many</b> items, <code>append</code> them into a <code>DocumentFragment</code> first and insert the fragment once - one change to the live page instead of many.',
          parts: [tree({ 5: 'win', 12: 'ok' }, { 11: true }), { type: 'array', label: 'ul.children (after)', values: ['li.item (' + text.slice(0, 12) + ')'], hl: { 0: 'sel' } }]
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'Render an array of strings safely (the everyday task)',
        html: `<p>Given <code>['milk', 'eggs']</code>, build one <code>&lt;li&gt;</code> per string. Use <code>createElement</code> + <code>textContent</code> so even a string like <code>&lt;script&gt;</code> shows as harmless text. Insert once at the end.</p>`,
        code: `function renderList(listEl, texts) {
  const frag = document.createDocumentFragment();   // off-screen box
  for (const t of texts) {
    const li = document.createElement('li');
    li.textContent = t;                              // safe
    frag.append(li);
  }
  listEl.replaceChildren(frag);                      // clears old items + inserts new ones in ONE step
}
renderList(document.querySelector('#tasks'), ['milk', 'eggs', '<img src=x onerror=alert(1)>']);`
      },
      {
        title: 'classList beats string juggling',
        html: `<p><code>el.className = el.className + " done"</code> breaks when a class is already there and when you want to remove one. <code>classList</code> is a tiny set of tokens: no duplicates, no spaces to manage.</p>${H.table(['Goal', 'Code'], [['add', '<code>el.classList.add("done")</code>'], ['remove', '<code>el.classList.remove("done")</code>'], ['flip', '<code>el.classList.toggle("done")</code>'], ['force on/off from a boolean', '<code>el.classList.toggle("done", isDone)</code>'], ['check', '<code>el.classList.contains("done")</code>'], ['swap', '<code>el.classList.replace("old", "new")</code>']])}`,
        code: `const btn = document.querySelector('.btn');
btn.classList.toggle('is-loading', true);   // on
btn.classList.toggle('is-loading', false);  // off
console.log(btn.classList.contains('is-loading')); // false`
      },
      {
        title: 'data-* attributes carry small facts on the element',
        html: `<p>Put an id on the element itself so a click handler can find out <i>which</i> item it was: <code>&lt;li data-id="42" data-user-name="Ann"&gt;</code>. In JS: <code>li.dataset.id</code> is the string <code>"42"</code> and <code>li.dataset.userName</code> is <code>"Ann"</code> (kebab-case becomes camelCase). Values are always <b>strings</b> - convert with <code>Number()</code>.</p>`,
        code: `const li = document.querySelector('#tasks li');
li.dataset.id = 42;                       // stored as the string "42"
console.log(typeof li.dataset.id);        // "string"
console.log(Number(li.dataset.id) + 1);   // 43
delete li.dataset.id;                     // removes the attribute`
      },
      {
        title: 'Insert at an exact position',
        html: `<p><code>append</code>/<code>prepend</code> work on the parent. <code>before</code>/<code>after</code> work on a sibling. <code>insertAdjacentElement</code> takes a position word: <code>"beforebegin"</code> (outside, before), <code>"afterbegin"</code> (inside, first), <code>"beforeend"</code> (inside, last), <code>"afterend"</code> (outside, after). Moving an element that is <b>already in the page</b> simply <i>moves</i> it - a node can only have one parent.</p>`,
        code: `const taskList = document.querySelector('#tasks');
const urgent = document.createElement('li');
urgent.textContent = 'Call mum';
taskList.firstElementChild.before(urgent);       // becomes the first item
taskList.append(urgent);                          // MOVES it to the end (not a copy)
const copy = urgent.cloneNode(true);          // deep copy (children included, listeners NOT copied)
taskList.append(copy);`
      }
    ],
    deepDive: `<p>🟣 <b>Why batching matters.</b> JavaScript changes to the DOM are cheap; what costs time is the browser <b>recalculating layout and repainting</b>. The browser is lazy: it usually waits until your script finishes, then does one layout. The trouble starts when you <i>mix reads and writes</i> (write a style, then read <code>offsetHeight</code>, write again...) - each read forces a synchronous layout ("layout thrashing"). Rule: do all reads first, then all writes. A <code>DocumentFragment</code>, <code>replaceChildren</code>, or building one HTML string for a <i>trusted</i> template all aim to turn N changes into one.</p>
      <p><b>innerHTML pitfalls beyond XSS.</b> (1) It destroys and rebuilds children, so event listeners attached to old children are lost and focus/scroll/selection inside them resets. (2) <code>el.innerHTML += x</code> re-parses everything already there. (3) Scripts inserted via innerHTML do not run, but <code>&lt;img onerror&gt;</code> and <code>javascript:</code> links do - sanitizing by "removing script tags" never works. If you truly need rich HTML from untrusted input, use a vetted sanitizer (e.g. DOMPurify) and/or the <b>Trusted Types</b> API plus a CSP. <code>insertAdjacentHTML</code> avoids the "rebuild old children" problem but is exactly as dangerous for untrusted strings.</p>
      <p><b>Properties vs attributes in more detail.</b> Some properties <i>reflect</i> an attribute (<code>id</code>, <code>className</code> ↔ <code>class</code>), some are state only (<code>input.value</code> after typing, <code>checked</code>, <code>scrollTop</code>), and a few have different names (<code>htmlFor</code> ↔ <code>for</code>). <code>el.getAttribute</code> always returns a string or <code>null</code>; the <code>disabled</code> <i>property</i> is a boolean. <b>Boolean attributes</b> are "on" just by being present: <code>setAttribute("disabled", "false")</code> still disables the button! Use <code>el.disabled = false</code> or <code>toggleAttribute("disabled", flag)</code>.</p>
      <p><b>Live vs copy.</b> <code>cloneNode(true)</code> copies attributes and children but <b>not</b> listeners added with <code>addEventListener</code>; a <code>&lt;template&gt;</code> element's <code>content.cloneNode(true)</code> is the clean way to stamp out rows. <b>Node identity:</b> a node can have one parent, so inserting an attached node moves it. Frameworks like React avoid all this by describing the UI and letting a diffing algorithm do the minimal DOM edits - which is why knowing the raw API helps you understand what they do for you.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants will happily generate a whole <code>render()</code> function in seconds, and most of the time they reach for <code>innerHTML</code> with template strings because it is short. For demo code that is fine; for anything with user data it is a security bug.</p>
      <p><b>Use AI as a partner:</b> ask <code>Review this DOM code for XSS, layout thrashing and lost event listeners; list each issue with a one-line fix</code> - that is a great review checklist. <b>Where AI goes wrong:</b> uses <code>setAttribute("disabled", false)</code>; keeps listeners on elements it later replaces via <code>innerHTML</code>; forgets that <code>dataset</code> values are strings; calls <code>getElementsByClassName</code> and removes while iterating. <b>What you must still own:</b> the rule "user text goes in with <code>textContent</code>", understanding what a re-render destroys, and checking the result in the Elements panel and Performance tab instead of trusting that it "looks right".</p>`,
    problems: [
      {
        title: 'Render a List Safely and Fast',
        level: 'Easy', tags: ['DOM', 'createElement', 'XSS'], companies: ['Amazon', 'Flipkart', 'Atlassian'],
        statement: `<p>Write <code>renderItems(ul, items)</code>. <code>items</code> is an array of <code>{ id, text, done }</code>. Replace whatever is currently inside <code>ul</code> with one <code>&lt;li&gt;</code> per item. The li must show <code>text</code> exactly as written (even if it contains <code>&lt;b&gt;</code> or <code>&lt;script&gt;</code>), carry <code>data-id</code>, and have the class <code>done</code> when <code>done</code> is true. Touch the live page as few times as possible.</p>`,
        constraints: `Up to 5,000 items. Text is untrusted (it comes from users).`,
        example: `<p>Input: <code>[{id:1,text:"Milk",done:false},{id:2,text:"&lt;b&gt;Eggs&lt;/b&gt;",done:true}]</code></p><p>Result (HTML): <code>&lt;li data-id="1"&gt;Milk&lt;/li&gt;&lt;li data-id="2" class="done"&gt;&amp;lt;b&amp;gt;Eggs&amp;lt;/b&amp;gt;&lt;/li&gt;</code> - the second li <span class="c-g">shows the characters &lt;b&gt;Eggs&lt;/b&gt; literally</span>, not bold text, because we used textContent.</p>`,
        brute: {
          why: `<p>The string-gluing way: build an HTML string and assign <code>innerHTML</code>. Two problems: <span class="c-r">XSS</span> (an item with <code>&lt;img onerror=...&gt;</code> runs code) and it re-parses everything. Appending each li straight into the live list in a loop is also wasteful for thousands of items.</p>`,
          code: `function renderItemsBrute(ul, items) {
  let html = '';
  for (const it of items) {
    html += '<li data-id="' + it.id + '" class="' + (it.done ? 'done' : '') + '">' + it.text + '</li>'; // text NOT escaped!
  }
  ul.innerHTML = html;
}`
        },
        mcq: { q: 'The text of an item comes from a user. Which line is the safe way to put it into an li?', options: ['li.textContent = text', 'li.innerHTML = text', 'li.outerHTML = text', 'li.insertAdjacentHTML("beforeend", text)'], answer: 0, explain: 'textContent stores the string as plain text, so markup characters are shown, never parsed. The other three parse the string as HTML.' },
        hints: [
          `<p>Hint 1: the aha - you never need to build HTML text. Make real element objects and give them text with <code>textContent</code>.</p>`,
          `<p>Hint 2: create a <code>DocumentFragment</code>, append all new li elements into it, then swap it into the ul in one operation with <code>replaceChildren(fragment)</code>.</p>`,
          `<p>Hint 3: recipe - for each item: <code>li = createElement("li")</code>, <code>li.textContent = item.text</code>, <code>li.dataset.id = item.id</code>, <code>li.classList.toggle("done", item.done)</code>, <code>frag.append(li)</code>. After the loop <code>ul.replaceChildren(frag)</code>. Edge cases: empty array (clears the list), id of 0, text that is an empty string.</p>`
        ],
        solution: {
          approach: `<p>Build everything off-screen in a fragment with safe APIs, then do one live-DOM write. <code>replaceChildren</code> removes the old children and inserts the new ones in one call. <code>classList.toggle(name, force)</code> handles the done flag without an if.</p>`,
          code: `function renderItems(ul, items) {
  const frag = document.createDocumentFragment();     // off-screen holder
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item.text;                       // SAFE: never parsed as HTML
    li.dataset.id = String(item.id);                  // data-id="..."
    li.classList.toggle('done', Boolean(item.done));  // add/remove by boolean
    frag.append(li);
  }
  ul.replaceChildren(frag);                           // ONE write to the live page
}`,
          complexity: `<p>Time O(N) element creations, plus one layout for the page. Space O(N) for the fragment (the same nodes end up in the page).</p>`,
          followUps: ['Update only the items that changed instead of re-creating everything (keyed diff).', 'Use a <code>&lt;template&gt;</code> for a more complex row.', 'Render 100,000 rows without freezing (virtualisation).']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 3 — Events: listeners and the event object
     ====================================================================== */
  topics.push({
    title: 'Events: Listening, the Event Object & Handler Basics',
    analogy: `<p>An <b>event listener</b> is like leaving your phone number with a shop: "call me when the blue shoes arrive". You do not stand at the door all day (that would be <i>polling</i>). The browser keeps a small notebook - "for this button, on 'click', call these functions" - and when the user clicks, it rings each number in the order you left them. The <b>event object</b> is the note the shop reads to you on the phone: <i>what</i> happened, <i>where</i>, <i>which key</i>, <i>at what time</i>.</p>`,
    explain: `<p>🟢 <b>The idea.</b> Users do things (click, type, scroll, tap, resize the window). The browser turns each into an <b>event</b> and runs any function you registered for it. You register with:</p>
      <pre>element.addEventListener('click', handler);</pre>
      <p>The <code>handler</code> is just a normal function. The browser calls it for you and passes one argument: the <b>event object</b>.</p>
      ${H.table(['Event family', 'Common types', 'Handy event fields'], [
        ['Mouse / pointer', '<code>click</code>, <code>dblclick</code>, <code>pointerdown</code>, <code>pointerup</code>, <code>pointermove</code>, <code>contextmenu</code>', '<code>clientX/Y</code>, <code>button</code>, <code>pointerType</code>'],
        ['Keyboard', '<code>keydown</code>, <code>keyup</code>', '<code>key</code> ("Enter"), <code>code</code> ("KeyA"), <code>shiftKey</code>, <code>repeat</code>'],
        ['Forms', '<code>input</code>, <code>change</code>, <code>submit</code>, <code>reset</code>, <code>focus</code>, <code>blur</code>', '<code>target.value</code>, <code>submitter</code>, <code>inputType</code>'],
        ['Page / window', '<code>DOMContentLoaded</code>, <code>load</code>, <code>scroll</code>, <code>resize</code>, <code>visibilitychange</code>', '<code>scrollY</code>, <code>innerWidth</code>'],
        ['Drag / clipboard / touch', '<code>dragstart</code>, <code>drop</code>, <code>paste</code>, <code>touchstart</code>', '<code>dataTransfer</code>, <code>clipboardData</code>']
      ])}
      <p>🔵 <b>Three fields on every event you must know:</b></p>
      <ul>
        <li><code>event.type</code> - the name, like <code>"click"</code>.</li>
        <li><code>event.target</code> - the <b>deepest element that was actually hit</b> (you clicked the little &lt;span&gt; inside the button).</li>
        <li><code>event.currentTarget</code> - the element whose listener is running <b>right now</b> (the thing you called <code>addEventListener</code> on). Inside a normal <code>function</code> handler, <code>this</code> is the same thing.</li>
      </ul>
      <p><b>Options (third argument).</b> <code>{ once: true }</code> runs it one time then removes it. <code>{ capture: true }</code> listens during the capturing phase (next topic). <code>{ passive: true }</code> promises you will not call <code>preventDefault</code>, letting scrolling stay smooth. <code>{ signal }</code> removes the listener when an <code>AbortController</code> aborts - the easiest cleanup for many listeners at once.</p>
      <p><b>Removing.</b> <code>removeEventListener</code> only works if you pass the <b>same function reference</b> (and same capture flag). An anonymous arrow function cannot be removed, because you have no name for it. Also: adding the <i>same</i> function twice to the same element and type does nothing the second time.</p>
      <p><b>Old style to avoid:</b> <code>&lt;button onclick="doIt()"&gt;</code> or <code>btn.onclick = fn</code>. The property holds <b>one</b> function (a second assignment overwrites the first); <code>addEventListener</code> allows many.</p>`,
    clues: [
      '"Run code when the user clicks / types / presses Enter" → <code>addEventListener</code> with the right event type',
      '"Handler fires twice" → registered twice with different function objects (e.g. arrow function inside a re-render), or the event bubbled from a child',
      '"Cannot remove the listener" → different function reference (anonymous arrow) or mismatched <code>capture</code> flag',
      '"What is the difference between target and currentTarget?" → the element hit vs the element that owns the running listener',
      '"input vs change" → <code>input</code> fires on every keystroke; <code>change</code> fires when the value is committed (blur / Enter / select)',
      '"Clean up listeners to avoid memory leaks" → <code>removeEventListener</code>, <code>{ once }</code> or an <code>AbortController</code> signal'
    ],
    code: [
      { lang: 'js', title: 'Adding, using and removing listeners', code: `const btn = document.querySelector('.btn');
let count = 0;

function onClick(event) {
  count++;
  console.log(event.type);                         // "click"
  console.log(event.target === event.currentTarget); // true if you hit the button itself
  console.log(this === event.currentTarget);       // true (normal function, not arrow)
}

btn.addEventListener('click', onClick);                   // normal
btn.addEventListener('click', () => console.log('hi'), { once: true }); // runs once, then auto-removed
btn.addEventListener('click', onClick);                   // duplicate: IGNORED (same function)

btn.removeEventListener('click', onClick);                // works: same reference

// Clean up MANY listeners at once with an AbortController
const ac = new AbortController();
window.addEventListener('resize', () => console.log('resized'), { signal: ac.signal });
window.addEventListener('scroll', () => console.log('scrolled'), { signal: ac.signal, passive: true });
// later (e.g. when a component is torn down):
ac.abort();                                               // BOTH listeners removed` },
      { lang: 'js', title: 'Typing events: input vs change, keyboard', code: `const field = document.querySelector('input.field');

field.addEventListener('input', (e) => {
  // fires on EVERY edit: typing, paste, delete, voice input
  console.log('now:', e.target.value);
});
field.addEventListener('change', (e) => {
  // fires when the user is DONE (blur or Enter)
  console.log('committed:', e.target.value);
});
field.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) console.log('submit?');
  if (e.key === 'Escape') field.blur();
});` },
      { lang: 'js', run: true, title: 'Run it: how a browser keeps listeners (a tiny model)', code: `// A mini "notebook": for each (type, capture) keep an ordered list of functions.
class Target {
  constructor(name) { this.name = name; this.listeners = []; }
  addEventListener(type, fn, opts = {}) {
    const capture = !!opts.capture;
    // Rule from the spec: same type + same function + same capture => ignore the duplicate.
    if (this.listeners.some((l) => l.type === type && l.fn === fn && l.capture === capture)) return;
    this.listeners.push({ type, fn, capture, once: !!opts.once });
  }
  removeEventListener(type, fn, opts = {}) {
    const capture = !!opts.capture;
    this.listeners = this.listeners.filter((l) => !(l.type === type && l.fn === fn && l.capture === capture));
  }
  dispatch(type) {
    // Copy first: listeners added/removed DURING dispatch do not change this round.
    for (const l of this.listeners.slice()) {
      if (l.type !== type) continue;
      if (l.once) this.removeEventListener(l.type, l.fn, { capture: l.capture });
      l.fn({ type, target: this, currentTarget: this });
    }
  }
}

const btn = new Target('button');
let count = 0;
function onClick() { count++; }
btn.addEventListener('click', onClick);
btn.addEventListener('click', onClick);                         // ignored duplicate
btn.addEventListener('click', () => console.log('hello once'), { once: true });
btn.addEventListener('click', () => console.log('anonymous'));  // can never be removed by reference

btn.dispatch('click');   // hello once, anonymous
btn.dispatch('click');   // anonymous only
btn.removeEventListener('click', onClick);
btn.dispatch('click');
console.log('count =', count, '| listeners left =', btn.listeners.length);` }
    ],
    viz: {
      title: 'Registering, firing and removing listeners (the notebook)',
      input: '3',
      inputLabel: 'How many times does the user click the button? (1 to 5)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 1 || n > 5) throw new Error('Enter a number of clicks from 1 to 5');
        var code = 'let count = 0;\nconst btn = document.querySelector(".btn");\nfunction onClick(event) { count++; }\nfunction hello() { console.log("first click!"); }\nbtn.addEventListener("click", onClick);\nbtn.addEventListener("click", hello, { once: true });\n// ...the user clicks the button N times...\nbtn.removeEventListener("click", onClick);';
        var frames = [];
        var reg = [], count = 0, logLines = [];
        function regRows() { return reg.length ? reg.map(function (r, i) { return [i + 1, 'click', r.name, r.once ? '{ once: true }' : '-']; }) : [['-', '-', '(empty)', '-']]; }
        function mk(narr, line, extra, hlRow, cls) {
          var parts = [
            { type: 'code', label: 'Code (amber = running now)', lang: 'js', code: code, hl: line ? one(line, cls || 'cur') : {} },
            { type: 'table', label: 'The browser\'s notebook for btn', columns: ['#', 'type', 'handler', 'options'], rows: regRows(), hl: hlRow || {} },
            { type: 'vars', vals: { count: count } }
          ];
          (extra || []).forEach(function (p) { parts.push(p); });
          frames.push({ narr: narr, parts: parts });
        }
        mk('Setup: <code>count</code> starts at 0. The notebook for <code>btn</code> is empty - the button does not know anyone cares about clicks.', 1, [], {});
        mk('Define two functions. Defining them does <b>nothing</b> yet - nobody is listening. The browser only runs a function when it is in the notebook <i>and</i> the event happens.', 4, [], {});
        reg.push({ name: 'onClick', once: false });
        mk('<code>addEventListener("click", onClick)</code> writes a line in the notebook: "on click, call onClick".', 5, [], { 0: 'ok' });
        reg.push({ name: 'hello', once: true });
        mk('Second line: <code>hello</code> with <code>{ once: true }</code> - the browser will <b>delete this line itself</b> after the first call. Handlers are called in the order they were added.', 6, [], { 1: 'ok' });
        for (var c = 1; c <= n; c++) {
          var ran = reg.map(function (r) { return r.name; });
          count += reg.some(function (r) { return r.name === 'onClick'; }) ? 1 : 0;
          var hadOnce = reg.some(function (r) { return r.once; });
          var evh = {};
          reg.forEach(function (r, i) { evh[i] = 'cur'; });
          mk('<b>Click #' + c + '.</b> The browser creates an event object and calls ' + (ran.length ? 'each line top to bottom: <b>' + ran.join(' → ') + '</b>.' : 'nobody (the notebook is empty).') + (hadOnce ? ' <code>hello</code> had <code>once</code>, so its line is crossed out now.' : ''), 7,
            [{ type: 'queue', label: 'Handlers called for this click (in order)', items: ran.length ? ran : ['(none)'], frontLabel: 'first', backLabel: 'last' },
              { type: 'vars', label: 'event object', vals: { type: 'click', target: 'button.btn', currentTarget: 'button.btn' } }], evh);
          reg = reg.filter(function (r) { return !r.once; });
          if (c === 1) mk('After click #1 the notebook has only <b>onClick</b>. <code>once: true</code> cleaned up after itself - no manual remove needed.', 6, [], { 0: 'ok' });
        }
        reg = reg.filter(function (r) { return r.name !== 'onClick'; });
        mk('<code>removeEventListener("click", onClick)</code> works because we pass the <b>same function reference</b> we added. (An anonymous arrow function could never be removed this way.)', 8, [], {}, 'bad');
        mk('One more click now calls nobody: <code>count</code> stays at <b>' + count + '</b>. Rule of thumb: whoever adds a listener is responsible for removing it when the thing is gone, or use <code>{ once }</code> / an AbortController <code>signal</code>.', 7, [{ type: 'queue', label: 'Handlers called', items: ['(none)'] }], {});
        return frames;
      }
    },
    examples: [
      {
        title: 'The "anonymous function" removal bug',
        html: `<p>This looks right but does nothing: the two arrow functions are <b>different objects</b> even though the text is identical, so the browser cannot find the one to remove. The listener stays forever (and keeps everything it uses in memory - a leak).</p>${H.table(['Code', 'Result'], [['<code>el.addEventListener("click", () =&gt; run());</code>', 'added'], ['<code>el.removeEventListener("click", () =&gt; run());</code>', '<span class="c-r">no effect - different function object</span>'], ['keep a name: <code>const h = () =&gt; run();</code> then add <code>h</code> and remove <code>h</code>', '<span class="c-g">works</span>']])}`,
        code: `const el = document.querySelector('.btn');
function run() { console.log('ran'); }

el.addEventListener('click', () => run());
el.removeEventListener('click', () => run());   // BUG: different function

const handler = () => run();
el.addEventListener('click', handler);
el.removeEventListener('click', handler);       // OK`
      },
      {
        title: 'target vs currentTarget in one picture',
        html: `<p>Imagine <code>&lt;button class="btn"&gt;Save &lt;span&gt;now&lt;/span&gt;&lt;/button&gt;</code> with one listener on the button. If the user clicks the word <b>now</b>, the deepest element hit is the <code>span</code>:</p>${H.table(['Field', 'Value when clicking "now"', 'Value when clicking "Save"'], [['<code>event.target</code>', 'span', 'button'], ['<code>event.currentTarget</code>', 'button', 'button'], ['<code>this</code> (normal function)', 'button', 'button']])}<p>This difference is the key that makes <b>event delegation</b> (two topics from now) work.</p>`
      },
      {
        title: 'Run once, and tidy up with AbortController',
        html: `<p>Common real needs: "show the tutorial tip only the first time" → <code>{ once: true }</code>. "Remove every listener this widget added when it closes" → pass the same <code>signal</code> to all of them and call <code>abort()</code> once. This is cleaner than keeping a list of (element, type, function) triples.</p>`,
        code: `function openDialog(dialog) {
  const ac = new AbortController();
  const opts = { signal: ac.signal };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); }, opts);
  window.addEventListener('resize', () => console.log('re-position dialog'), opts);
  dialog.querySelector('.close').addEventListener('click', close, opts);
  function close() {
    dialog.hidden = true;
    ac.abort();               // removes all three listeners
  }
}`
      },
      {
        title: 'input vs change on a text box',
        html: `<p>Typing "hi" then clicking elsewhere: <code>input</code> fires 2 times (after "h", after "hi"), <code>change</code> fires 1 time (when the box loses focus). Use <code>input</code> for live features (search-as-you-type, character counters); use <code>change</code> for "commit" features and for <code>&lt;select&gt;</code> / checkboxes, where it fires immediately on selection.</p>${H.table(['User action', 'input', 'change'], [['type "h"', 'fires', '-'], ['type "i"', 'fires', '-'], ['click away (blur)', '-', 'fires'], ['pick option in &lt;select&gt;', 'fires', 'fires']])}`
      }
    ],
    deepDive: `<p>🟣 <b>Handlers run on the main thread, one at a time.</b> When you click, the browser queues a <b>task</b>; the event loop runs it on the call stack; every matching listener is called <i>synchronously, in registration order</i> (within one target and phase). If a handler takes 200 ms, the page cannot paint or respond to anything else for 200 ms - that is exactly what the <b>INP</b> (Interaction to Next Paint) Core Web Vital measures. Heavy work belongs in a Web Worker, in chunks, or after <code>await</code>-ing a yield (<code>scheduler.yield()</code>, <code>setTimeout 0</code>).</p>
      <p><b>Microtasks between listeners.</b> After each listener returns, if the JS stack is empty the engine drains the <b>microtask queue</b> (promises) before calling the next listener. So with two click listeners, a <code>Promise.resolve().then(...)</code> queued in the first runs <i>before</i> the second listener when the user really clicked. But if you trigger it from code (<code>btn.click()</code> or <code>dispatchEvent</code>), the stack is not empty, so both listeners run first and microtasks wait. A classic "predict the output" trap.</p>
      <p><b>Mutating during dispatch.</b> The list of listeners is snapshotted when dispatch starts for a given target: a listener removed by an earlier handler in the same dispatch is skipped, but one <i>added</i> during dispatch to the <i>same</i> target and phase is not called until the next event. <b>Passive listeners:</b> for <code>touchstart</code>, <code>touchmove</code>, <code>wheel</code> on window/document/body, browsers default to passive so scrolling is not blocked waiting to see if you will cancel it; <code>preventDefault()</code> inside then logs a warning and is ignored.</p>
      <p><b>Other things worth knowing.</b> <code>event.isTrusted</code> is <code>true</code> for real user actions and <code>false</code> for events made by script (<code>el.click()</code> can't open popups/files the way a real click can). A listener can also be an <b>object with a <code>handleEvent</code> method</b> (used by some libraries to keep <code>this</code> as the object). Arrow functions have no own <code>this</code>, so <code>this</code> inside is the outer one - use <code>event.currentTarget</code> instead. Listeners hold their closure alive: forgetting to remove one on a long-lived target (<code>window</code>, <code>document</code>) from a short-lived component is the most common frontend memory leak. In React you attach via JSX props (<code>onClick</code>) and React uses delegation at the root for you, but <code>window</code>/<code>document</code> listeners are still yours to clean up in <code>useEffect</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI is great at boilerplate like "keyboard shortcuts: Ctrl+K opens search, Esc closes". It writes the listener, the key checks and often the cleanup. <b>Use it as a partner:</b> ask <code>List every event listener in this file and say who removes it and when</code> - an instant leak audit. Or <code>Which of these listeners should be passive, once, or use an AbortController signal?</code></p>
      <p><b>Where AI goes wrong:</b> adds listeners inside a function that runs on every render (so you get 50 handlers after 50 renders); removes with a fresh arrow function; uses <code>keyCode</code> (deprecated) instead of <code>key</code>; listens to <code>click</code> for everything (keyboard users and touch need <code>keydown</code>/<code>pointer</code> consideration - though a real <code>&lt;button&gt;</code> already handles Enter/Space for you); forgets <code>event.isComposing</code> for IME input (Japanese/Chinese typing). <b>What you must still own:</b> the lifetime of every listener, the difference between target and currentTarget, and verifying in DevTools (<b>Elements → Event Listeners</b> panel) what is really attached.</p>`,
    problems: [
      {
        title: 'Limited-Use Button',
        level: 'Easy', tags: ['events', 'removeEventListener', 'once'], companies: ['Infosys', 'Swiggy', 'Zomato'],
        statement: `<p>Make <code>limitClicks(button, max, onLimit)</code>. Every click should add 1 to a counter and show it as the button's text (<code>"Clicked 1"</code>, <code>"Clicked 2"</code>, ...). After <code>max</code> clicks the button must stop reacting (remove the listener) and call <code>onLimit()</code> exactly once.</p>`,
        constraints: `<code>max</code> between 1 and 100. Do not use a global variable for the count. Do not just ignore clicks with an if - really remove the listener.`,
        example: `<p><code>limitClicks(btn, 3, () =&gt; console.log("done"))</code></p>${H.table(['click #', 'button text', 'what happens'], [['1', 'Clicked 1', 'listener runs'], ['2', 'Clicked 2', 'listener runs'], ['3', 'Clicked 3', 'listener runs, <span class="c-g">then removed</span>, onLimit() prints "done"'], ['4', 'Clicked 3', 'nothing - nobody listens any more']])}`,
        brute: {
          why: `<p>Keep a global counter and an <code>if (count &gt; max) return;</code> inside the handler. It "works" visually, but the listener is still attached forever, the counter is shared by every button, and you can't reuse the function for two buttons.</p>`,
          code: `let count = 0;                                  // global: shared by every button
function limitClicksBrute(button, max, onLimit) {
  button.addEventListener('click', () => {
    if (count >= max) return;                   // listener stays attached forever
    count++;
    button.textContent = 'Clicked ' + count;
    if (count === max) onLimit();
  });
}`
        },
        mcq: { q: 'To remove the click listener from inside its own handler, what must you have?', options: ['A named function (a reference) to pass to removeEventListener', 'Nothing - removeEventListener("click") with no function removes all', 'An arrow function written again inside removeEventListener'], answer: 0, explain: 'removeEventListener matches by the exact function reference (and capture flag). A named function or a stored variable gives you that reference.' },
        hints: [
          `<p>Hint 1: the aha - the counter can live in a <b>closure</b> (a local variable inside <code>limitClicks</code>), so every button gets its own.</p>`,
          `<p>Hint 2: define the handler as a named inner function so it can pass itself to <code>removeEventListener</code>.</p>`,
          `<p>Hint 3: recipe - <code>let n = 0; function handle() { n++; update text; if (n === max) { button.removeEventListener("click", handle); onLimit(); } } button.addEventListener("click", handle);</code>. Edge cases: <code>max = 1</code>, calling for two buttons, text should not change after removal.</p>`
        ],
        solution: {
          approach: `<p>A closure holds the private count. The handler is a named function so that it can remove itself the moment the limit is hit - then <code>onLimit</code> runs exactly once because the handler can never run again.</p>`,
          code: `function limitClicks(button, max, onLimit) {
  let n = 0;                                    // private to THIS button (closure)
  function handle() {
    n++;
    button.textContent = 'Clicked ' + n;
    if (n === max) {
      button.removeEventListener('click', handle); // same reference -> really removed
      onLimit();                                   // exactly once
    }
  }
  button.addEventListener('click', handle);
  // Equivalent using the signal option:
  //   const ac = new AbortController();  addEventListener('click', handle, { signal: ac.signal });  ac.abort();
}`,
          complexity: `<p>Time O(1) per click. Space O(1) per button (one counter and one listener).</p>`,
          followUps: ['Re-arm the button after 2 seconds.', 'Do the same with a single delegated listener for a whole toolbar.', 'Return an "unsubscribe" function so callers can cancel early.']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 4 — Capturing and bubbling
     ====================================================================== */
  var NAMES = { body: 0, nav: 1, main: 2, a1: 3, a2: 4, ul: 5, form: 6, li1: 11, li2: 12, input: 13, button: 14, a: 3, li: 11 };
  var NAME_OF = { 0: 'body', 1: 'nav', 2: 'main', 3: 'a1', 4: 'a2', 5: 'ul', 6: 'form', 11: 'li1', 12: 'li2', 13: 'input', 14: 'button' };
  topics.push({
    title: 'Event Propagation: Capturing, Target & Bubbling',
    analogy: `<p>You press a doorbell in a tall <b>apartment building</b>. Before the bell can ring in your flat, the signal is announced <b>down</b> from the main gate, past the lobby guard, past your floor's caretaker, to your door - that is <b>capturing</b> (top → down). The bell rings at <b>your door</b> - that is the <b>target</b>. Then, like a <b>bubble rising in water</b>, the news floats back <b>up</b> past the caretaker, the lobby guard and the gate - that is <b>bubbling</b> (bottom → up). Anyone along the way can listen on the way down, on the way up, or both. By default you listen on the way <i>up</i>.</p>`,
    explain: `<p>🟢 <b>The surprise.</b> HTML elements are nested: a <code>&lt;button&gt;</code> sits inside a <code>&lt;div&gt;</code> inside the <code>&lt;body&gt;</code>. When you click the button you also clicked the div and the body (they are "behind" it). So the browser lets <b>all of them hear the click</b>, in a fixed order. This trip is called <b>event propagation</b>.</p>
      <p>🔵 <b>Three phases, always in this order:</b></p>
      ${H.table(['#', 'Phase', 'Direction', 'Which listeners run?', '<code>event.eventPhase</code>'], [
        ['1', '<b>Capturing</b>', 'window → document → html → body → ... → parent of target', 'only listeners added with <code>{ capture: true }</code> (or <code>true</code>)', '1'],
        ['2', '<b>Target</b>', 'the element that was actually hit', 'both kinds (capture ones first, then normal ones)', '2'],
        ['3', '<b>Bubbling</b>', 'parent of target → ... → body → document → window', 'normal listeners (default <code>capture: false</code>)', '3']
      ])}
      <p>So with a normal listener (the 99% case) the <b>innermost</b> element's handler runs first, then its parent's, then the grandparent's... A click on a list item runs the <code>li</code> handler, then the <code>ul</code> handler, then <code>main</code>, then <code>body</code>. Use the visualizer below: type different targets and watch the path.</p>
      <p><b>Handy facts:</b></p>
      <ul>
        <li><code>event.target</code> never changes during the trip (still the clicked element); <code>event.currentTarget</code> changes at every stop.</li>
        <li><code>event.composedPath()</code> returns the exact list of nodes the event will travel through.</li>
        <li><code>event.bubbles</code> tells you if this kind of event goes up. <b>Most do</b> (<code>click</code>, <code>input</code>, <code>keydown</code>, <code>submit</code>, <code>change</code>), but a few <b>do not</b>: <code>focus</code>/<code>blur</code> (use <code>focusin</code>/<code>focusout</code>), <code>mouseenter</code>/<code>mouseleave</code> (use <code>mouseover</code>/<code>mouseout</code>), element <code>load</code>, <code>scroll</code> on elements.</li>
        <li>The propagation can be stopped with <code>event.stopPropagation()</code> (topic 6).</li>
      </ul>
      <p><b>Predicting the console order</b> (interview favourite): write the path from the root down to the target. Capture listeners print going <i>down</i> (root first). At the target, capture listeners print first, then normal ones. Normal listeners print going <i>up</i> (parent last). Registration order only matters among listeners on the <i>same element and phase</i>.</p>`,
    clues: [
      '"What is printed when I click the inner element?" (nested handlers) → write the path root→target; capture goes down, bubble goes up',
      '"Why does clicking the child also trigger the parent\'s handler?" → bubbling',
      '"Parent handler fires BEFORE the child\'s" → the parent used <code>{ capture: true }</code>',
      '"Explain event capturing vs bubbling" → 3 phases; <code>addEventListener</code>\'s 3rd argument; default is bubble',
      '"focus / mouseenter / scroll handler on the parent never fires" → that event does not bubble; use <code>focusin</code> / <code>mouseover</code> or capture',
      '"Detect a click anywhere outside a dropdown" → one listener on <code>document</code> (bubble or capture) + <code>contains()</code> check'
    ],
    code: [
      { lang: 'js', title: 'Nested handlers: what prints when you click the button?', code: `// <div id="outer"><div id="middle"><button id="inner">Go</button></div></div>
const outer = document.getElementById('outer');
const middle = document.getElementById('middle');
const inner = document.getElementById('inner');

outer.addEventListener('click',  () => console.log('outer  (bubble)'));
outer.addEventListener('click',  () => console.log('outer  (capture)'), true);   // true = capture
middle.addEventListener('click', () => console.log('middle (bubble)'));
inner.addEventListener('click',  () => console.log('inner  (bubble)'));
inner.addEventListener('click',  () => console.log('inner  (capture)'), { capture: true });
document.addEventListener('click', () => console.log('document (bubble)'));

// Click the button  =>
// outer  (capture)    <- going DOWN
// inner  (capture)    <- at the target: capture listeners first
// inner  (bubble)     <- then normal listeners
// middle (bubble)     <- going UP
// outer  (bubble)
// document (bubble)` },
      { lang: 'js', run: true, title: 'Run it: a tiny propagation engine (capture ↓, target, bubble ↑)', code: `// Pure JS - no browser. Each node knows its parent, so we can build the event path.
class Node {
  constructor(name, parent = null) { this.name = name; this.parent = parent; this.listeners = []; }
  on(type, fn, capture = false) { this.listeners.push({ type, fn, capture }); return this; }
}

function dispatch(target, type) {
  const path = [];                                  // root ... target
  for (let n = target; n; n = n.parent) path.unshift(n);
  const event = { type, target, currentTarget: null, eventPhase: 0, stopped: false };
  const run = (node, phase, wantCapture) => {
    if (event.stopped) return;
    event.currentTarget = node;
    event.eventPhase = phase;
    for (const l of node.listeners.slice()) {
      if (l.type === type && l.capture === wantCapture) l.fn(event);
    }
  };
  for (let i = 0; i < path.length - 1; i++) run(path[i], 1, true);   // 1) capturing: top -> down
  run(target, 2, true);                                               // 2) target: capture ones first...
  run(target, 2, false);                                              //    ...then normal ones
  for (let i = path.length - 2; i >= 0; i--) run(path[i], 3, false); // 3) bubbling: bottom -> up
}

const doc = new Node('document');
const outer = new Node('outer', doc);
const middle = new Node('middle', outer);
const inner = new Node('inner', middle);
const log = (label) => (e) => console.log(label.padEnd(18), 'phase', e.eventPhase, '| currentTarget =', e.currentTarget.name, '| target =', e.target.name);

outer.on('click', log('outer (bubble)'));
outer.on('click', log('outer (capture)'), true);
middle.on('click', log('middle (bubble)'));
inner.on('click', log('inner (bubble)'));
inner.on('click', log('inner (capture)'), true);
doc.on('click', log('document (bubble)'));

dispatch(inner, 'click');` }
    ],
    viz: {
      title: 'Click travelling: capture ↓ → target → bubble ↑',
      input: 'li1',
      inputLabel: 'Clicked element, then optional stop=NAME (bubble handler calls stopPropagation) or stopcap=NAME. Names: body nav main a1 a2 ul form li1 li2 input button. Try: "li1 stop=ul"',
      gen: function (input) {
        var toks = words(input, 'li1');
        var targetName = toks[0].toLowerCase();
        if (NAMES[targetName] === undefined) throw new Error('Unknown element "' + toks[0] + '". Use one of: body nav main a1 a2 ul form li1 li2 input button');
        var target = NAMES[targetName];
        var stop = null, stopcap = null;
        toks.slice(1).forEach(function (t) {
          var m = /^(stop|stopcap)=(\w+)$/i.exec(t);
          if (!m || NAMES[m[2].toLowerCase()] === undefined) throw new Error('Options look like  stop=ul  or  stopcap=main  (element names as above)');
          if (m[1].toLowerCase() === 'stop') stop = NAMES[m[2].toLowerCase()]; else stopcap = NAMES[m[2].toLowerCase()];
        });
        var path = ancestors(target);
        var arr = domArr(), baseTags = domTags();
        var pathHl = {};
        path.forEach(function (i) { pathHl[i] = 'win'; });
        pathHl[target] = 'sel';
        var log = [], frames = [], stopped = false;
        function tagsWith(i, label) { var t = {}; Object.keys(baseTags).forEach(function (k) { t[k] = baseTags[k]; }); t[i] = label; return t; }
        function state(narr, cur, phaseName, phaseNum, tagLabel) {
          var hl = {};
          Object.keys(pathHl).forEach(function (k) { hl[k] = pathHl[k]; });
          log.forEach(function (e) { if (hl[e.i] === 'win') hl[e.i] = 'ok'; });
          if (cur !== null) hl[cur] = 'cur';
          frames.push({
            narr: narr,
            parts: [
              { type: 'tree', label: 'Blue = event path, purple = target, amber = listener running now, green = already ran', arr: arr, hl: hl, tags: cur !== null ? tagsWith(cur, tagLabel) : baseTags },
              { type: 'queue', label: 'Handlers fired so far = console order', items: log.length ? log.map(function (e) { return e.text; }) : ['(none yet)'], frontLabel: 'first', backLabel: 'latest', hl: log.length ? one(log.length - 1, 'cur') : {} },
              { type: 'vars', vals: { phase: phaseName, eventPhase: phaseNum, 'event.target': NAME_OF[target], 'event.currentTarget': cur === null ? '-' : NAME_OF[cur], propagationStopped: stopped ? 'yes' : 'no' }, hl: stopped ? { propagationStopped: 'bad' } : {} }
            ]
          });
        }
        state('You click <b>' + NAME_OF[target] + '</b>. The browser first builds the <b>path</b> from the top to the target: <code>' + path.map(function (i) { return NAME_OF[i]; }).join(' → ') + '</code> (this is <code>event.composedPath()</code>, plus document and window above). Every element on it has one capture listener (C) and one normal listener (B).' + (stop !== null ? ' <b>' + NAME_OF[stop] + '</b>\'s bubble handler will call <code>stopPropagation()</code>.' : '') + (stopcap !== null ? ' <b>' + NAME_OF[stopcap] + '</b>\'s capture handler will call <code>stopPropagation()</code>.' : ''), null, 'about to dispatch', 0);
        function fire(i, kind, phaseName, phaseNum, arrow) {
          if (stopped) return;
          log.push({ i: i, text: (kind === 'C' ? 'capture: ' : 'bubble: ') + NAME_OF[i] });
          var willStop = (kind === 'C' && stopcap === i) || (kind === 'B' && stop === i);
          if (willStop) stopped = true;
          state((kind === 'C' ? 'Capture listener' : 'Bubble listener') + ' on <b>' + NAME_OF[i] + '</b> runs ' + arrow + (willStop ? ' It calls <code>stopPropagation()</code>: <span class="c-r">the trip ends here</span> - nobody further along hears this click.' : ''), i, phaseName, phaseNum, kind === 'C' ? 'C ↓' : 'B ↑');
        }
        for (var k = 0; k < path.length - 1; k++) fire(path[k], 'C', 'capturing', 1, '(going down, before the target).');
        fire(target, 'C', 'at target', 2, '(at the target, capture listeners go first).');
        fire(target, 'B', 'at target', 2, '(then normal listeners at the target).');
        for (k = path.length - 2; k >= 0; k--) fire(path[k], 'B', 'bubbling', 3, '(going up).');
        state('Rule recap: <b>capture</b> listeners run on the way <b>down</b>, the target runs its capture listeners then its normal ones, and normal (bubble) listeners run on the way <b>up</b>.' + (stopped ? ' Here the trip was cut short, so the remaining stops were skipped.' : ''), null, 'recap', 0);
        state('Done. Console order: <b>' + log.map(function (e) { return e.text; }).join(' → ') + '</b>.' + (stopped ? ' The trip was cut short by <code>stopPropagation</code>.' : ' The click reached the top; after body it would also reach document and window.'), null, 'finished', 0);
        return frames;
      }
    },
    examples: [
      {
        title: 'Why does clicking the Like button also open the card?',
        html: `<p>A card has a click handler that opens the article. Inside it there is a "Like" button with its own handler. You click Like; the button's handler runs (target phase), the click <b>bubbles up</b>, and the card's handler runs too - the article opens. Two clean fixes: (1) in the card handler, ignore clicks that started inside the button: <code>if (e.target.closest(".like")) return;</code> (best - no one else is affected), or (2) call <code>e.stopPropagation()</code> in the like handler (works, but also hides the click from analytics or "click outside" code higher up).</p>`,
        code: `card.addEventListener('click', (e) => {
  if (e.target.closest('.like')) return;     // click came from the Like button: not for us
  openArticle(card.dataset.id);
});
likeBtn.addEventListener('click', () => toggleLike(card.dataset.id));`
      },
      {
        title: 'Capture phase for "run first, see everything"',
        html: `<p>A capture listener on <code>document</code> runs <b>before</b> any element-level handler, even if those later call <code>stopPropagation()</code>. That makes capture the right tool for analytics, global shortcuts, and "click outside to close" logic that must not be blocked by other code.</p>`,
        code: `// Log EVERY click, even ones other handlers will stop later
document.addEventListener('click', (e) => {
  console.log('analytics: click on', e.target.tagName);
}, true);

// Close a dropdown when clicking anywhere outside it
const menu = document.querySelector('.menu');
document.addEventListener('click', (e) => {
  if (!menu.contains(e.target)) menu.classList.remove('open');
}, true);`
      },
      {
        title: 'Events that do NOT bubble',
        html: `<p>Some events only fire on the element itself. If you try to catch them on a parent with a normal listener, nothing happens. Use the bubbling cousin, or capture.</p>${H.table(['Does not bubble', 'Bubbling alternative', 'Why it matters'], [['<code>focus</code>, <code>blur</code>', '<code>focusin</code>, <code>focusout</code>', 'one listener on a form to watch all inputs'], ['<code>mouseenter</code>, <code>mouseleave</code>', '<code>mouseover</code>, <code>mouseout</code>', 'enter/leave ignore child elements; over/out fire when moving between children'], ['<code>scroll</code> (on elements)', 'capture on a parent', 'scroll boxes inside a page'], ['<code>load</code>, <code>error</code> (on img)', 'capture on document', 'watch all images']])}`,
        code: `form.addEventListener('focusin', (e) => e.target.classList.add('focused'));
form.addEventListener('focusout', (e) => e.target.classList.remove('focused'));
// or: form.addEventListener('focus', handler, true);  // capture works for non-bubbling events too`
      },
      {
        title: 'Registration order vs phase order at the target',
        html: `<p>Old tutorials say "at the target, listeners run in the order you added them". Modern browsers (Chrome 89+, Firefox, Safari) run the target's <b>capture</b> listeners first and then its <b>normal</b> listeners, regardless of the order you wrote them. Among listeners of the <i>same</i> kind on the <i>same</i> element, registration order is still the rule.</p>${H.table(['Listener written (order)', 'Runs'], [['1. inner, bubble', '3rd'], ['2. inner, capture', '2nd (after outer capture)'], ['3. outer, capture', '1st'], ['4. outer, bubble', '4th (after inner bubble)']])}`
      }
    ],
    deepDive: `<p>🟣 <b>Why two directions?</b> History. Netscape built <i>capturing</i> (outer first), Microsoft built <i>bubbling</i> (inner first); the W3C standard did both. That is why <code>addEventListener</code> has the extra boolean: <code>true</code> picks the old Netscape model. In practice you almost always want bubbling, because it matches how you think ("the button handles it first; if it does not care, the container may").</p>
      <p><b>The path is fixed at dispatch time.</b> The browser computes the list of ancestors <i>once</i>, when the event starts. If a handler removes the target from the DOM or moves it, the event still completes along the original path. Listeners removed before they are reached are skipped; ones added to a not-yet-reached node still run. <code>stopPropagation()</code> stops the event from moving to the <i>next</i> node on the path, but the other listeners on the <i>current</i> node still run - for those you need <code>stopImmediatePropagation()</code>.</p>
      <p><b>Above the body.</b> The real path starts at <code>window</code>, then <code>document</code>, <code>html</code>, <code>body</code>. Listeners on <code>window</code> see everything (except events like <code>load</code> that target elements). <b>Shadow DOM</b> adds nuance: events marked <code>composed</code> cross the shadow boundary, and <code>event.target</code> is <b>retargeted</b> to the host element for listeners outside, so outer code can't peek inside; <code>composedPath()</code> shows the full (open) path.</p>
      <p><b>Frameworks.</b> React (17+) attaches its own listeners at the <b>root container</b> and does the dispatch itself ("synthetic events"), still following capture then bubble (<code>onClickCapture</code>). Mixing React handlers with native <code>document</code> listeners can surprise you: by the time a native listener on <code>document</code> sees the click, React's root listener has already handled it, and <code>e.stopPropagation()</code> in React stops native propagation <i>above the root</i> but cannot stop native listeners on the same root. <b>Performance note:</b> deep DOM trees mean long paths, but the cost is tiny; the real cost is handlers that do heavy work on every click. For <code>pointermove</code>/<code>scroll</code> high-frequency events, attach few listeners and mark them <code>passive</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "Predict the output" questions are easy to paste into an AI - and it is <b>often wrong</b> on subtle ones (target-phase ordering, microtasks between listeners, <code>stopPropagation</code> vs <code>stopImmediatePropagation</code>). That makes them a good <i>practice</i> pattern: predict first on paper, then ask the AI, then check in the browser and see who was right.</p>
      <p><b>Use AI as a partner:</b> <code>Generate 5 nested-listener puzzles with capture and bubble mixes, with answers hidden until I ask</code>; or paste a bug ("my parent handler fires when I click a child") and ask for the <i>explanation</i>, not just a patch. <b>Where AI goes wrong:</b> blanket-adds <code>stopPropagation()</code> to "fix" a bubbling issue, which silently breaks analytics, dropdown-closing and framework behaviour; confuses <code>target</code> with <code>currentTarget</code>; claims <code>focus</code> bubbles. <b>What you must still own:</b> being able to draw the path on a whiteboard, saying out loud in what order handlers run and why, and choosing the least invasive fix (check <code>e.target</code>) over cutting the trip short.</p>`,
    problems: [
      {
        title: 'Predict the Console Order (Nested Click Handlers)',
        level: 'Medium', tags: ['bubbling', 'capturing', 'output prediction'], companies: ['Flipkart', 'Atlassian', 'Uber'],
        statement: `<p>The page has <code>document &gt; #outer &gt; #middle &gt; #inner</code>. These listeners are registered <b>in this order</b>, each logging its own name:</p>
          <ol><li><code>outer</code> - bubble ("outer-bubble")</li><li><code>outer</code> - capture ("outer-capture")</li><li><code>middle</code> - bubble ("middle-bubble")</li><li><code>inner</code> - bubble ("inner-bubble")</li><li><code>inner</code> - capture ("inner-capture")</li><li><code>document</code> - bubble ("doc-bubble")</li></ol>
          <p>The user clicks <code>#inner</code>. Write the exact console order, and then write <code>predictOrder(path, listeners)</code> that computes it for any tree.</p>`,
        constraints: `Path length ≤ 100, up to 1,000 listeners. Standard (modern browser) semantics; no stopPropagation.`,
        example: `${H.table(['Step', 'Phase', 'Logs'], [['1', 'capture, document', '(nothing registered)'], ['2', 'capture, outer', '<span class="c-b">outer-capture</span>'], ['3', 'capture, middle', '(nothing)'], ['4', 'target: capture first', '<span class="c-b">inner-capture</span>'], ['5', 'target: then normal', '<span class="c-g">inner-bubble</span>'], ['6', 'bubble, middle', '<span class="c-g">middle-bubble</span>'], ['7', 'bubble, outer', '<span class="c-g">outer-bubble</span>'], ['8', 'bubble, document', '<span class="c-g">doc-bubble</span>']])}<p>Answer: <b>outer-capture, inner-capture, inner-bubble, middle-bubble, outer-bubble, doc-bubble</b>. Not the order they were written!</p>`,
        brute: {
          why: `<p>The tempting guess: "run them in the order I registered them". That gives outer-bubble first, which is wrong - the phases decide the order, registration order only breaks ties inside the same element and phase.</p>`,
          code: `function predictOrderWrong(listeners) {
  return listeners.map((l) => l.name);   // just registration order - WRONG
}`
        },
        mcq: { q: 'In which order do these run when #inner is clicked: outer-bubble, outer-capture, inner-bubble?', options: ['outer-capture, inner-bubble, outer-bubble', 'outer-bubble, outer-capture, inner-bubble', 'inner-bubble, outer-bubble, outer-capture', 'outer-capture, outer-bubble, inner-bubble'], answer: 0, explain: 'Capturing goes down first (outer-capture), then the target (inner-bubble), then bubbling goes up (outer-bubble).' },
        hints: [
          `<p>Hint 1: the aha - there are exactly three sweeps over the path: down (capture listeners), the target, up (normal listeners).</p>`,
          `<p>Hint 2: <code>path</code> is an array from the root to the target. Sweep 1: indexes 0 ... last-1 picking <code>capture</code> listeners. Sweep 3: indexes last-1 ... 0 picking non-capture listeners.</p>`,
          `<p>Hint 3: recipe - <code>order=[]</code>; for each node above the target (top→down) push its capture listeners (in registration order); at the target push capture ones, then non-capture ones; for each node above the target (bottom→up) push its non-capture listeners. Edge cases: target has no listeners, a node with several listeners of the same kind keeps registration order.</p>`
        ],
        solution: {
          approach: `<p>Three explicit sweeps over the path mirror the DOM spec exactly. Filtering the listener list by element and phase keeps registration order inside each group for free.</p>`,
          code: { lang: 'js', run: true, code: `function predictOrder(path, listeners) {
  const last = path.length - 1;                       // path[last] is the target
  const pick = (on, capture) => listeners.filter((l) => l.on === on && l.capture === capture).map((l) => l.name);
  const order = [];
  for (let i = 0; i < last; i++) order.push(...pick(path[i], true));          // 1) capture, top -> down
  order.push(...pick(path[last], true), ...pick(path[last], false));          // 2) target: capture then normal
  for (let i = last - 1; i >= 0; i--) order.push(...pick(path[i], false));    // 3) bubble, bottom -> up
  return order;
}

const listeners = [
  { name: 'outer-bubble',  on: 'outer',    capture: false },
  { name: 'outer-capture', on: 'outer',    capture: true  },
  { name: 'middle-bubble', on: 'middle',   capture: false },
  { name: 'inner-bubble',  on: 'inner',    capture: false },
  { name: 'inner-capture', on: 'inner',    capture: true  },
  { name: 'doc-bubble',    on: 'document', capture: false }
];
console.log(predictOrder(['document', 'outer', 'middle', 'inner'], listeners).join(' -> '));
console.log(predictOrder(['document', 'outer', 'middle'], listeners).join(' -> '));   // click on #middle` },
          complexity: `<p>Time O(P × L) as written (P = path length, L = listeners); O(P + L) if you first group listeners by element in a map. Space O(L) for the output.</p>`,
          followUps: ['Add <code>stopPropagation</code> support: stop after the node where it is called.', 'Add <code>stopImmediatePropagation</code>.', 'What changes if the listeners are on the same element: does registration order still matter?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 5 — Event delegation
     ====================================================================== */
  topics.push({
    title: 'Event Delegation: One Listener for Many Children',
    analogy: `<p>A big office has 200 desks. You could give <b>every desk its own phone</b> (200 phones to buy, wire, and move whenever someone joins). Or you can put <b>one receptionist at the front</b>: every visitor passes the front desk, and the receptionist asks "who are you here for?" and sends them on. <b>Event delegation is the receptionist.</b> Because events <i>bubble</i> up (previous topic), the parent hears every click from its children and can ask <code>event.target</code> "who was it?". New employees (new list items) are served automatically - nobody has to install a phone for them.</p>`,
    explain: `<p>🟢 <b>The problem.</b> You have a list with 1,000 rows, each with a "Delete" button. If you add one listener per button you create 1,000 functions and 1,000 registrations, and every time you add a row you must remember to attach one more. Rows created later (loaded from the server, or typed in by the user) simply do not work until you do.</p>
      <p>🔵 <b>The trick.</b> Add <b>one</b> listener on the common parent. When any child is clicked, the event bubbles up to the parent, and the parent's handler looks at <code>event.target</code> to find which child it was.</p>
      <pre>list.addEventListener('click', (event) =&gt; {
  const button = event.target.closest('button.del');  // did the click start on (or inside) a delete button?
  if (!button) return;                                // no: not our business
  button.closest('li').remove();
});</pre>
      <p>Three rules make delegation robust:</p>
      <ol>
        <li><b>Use <code>closest()</code>, not <code>target ===</code></b>. If your button contains an icon <code>&lt;svg&gt;</code> or <code>&lt;span&gt;</code>, the target will be that inner piece. <code>closest("button.del")</code> climbs up to the button for you.</li>
        <li><b>Check the boundary</b>: <code>list.contains(button)</code>. <code>closest</code> can climb <i>past</i> your container into the rest of the page (e.g. nested lists), so make sure the match is inside your list.</li>
        <li><b>Only for bubbling events.</b> <code>click</code>, <code>input</code>, <code>keydown</code>, <code>submit</code>, <code>change</code> work. <code>focus</code>, <code>blur</code>, <code>mouseenter</code> do not bubble - use <code>focusin</code>/<code>focusout</code>/<code>mouseover</code> or capture.</li>
      </ol>
      ${H.table(['', 'Listener on each item', 'One delegated listener'], [
        ['Listeners for 1,000 rows', '1,000', '<span class="c-g">1</span>'],
        ['Row added later', 'must attach a new listener', '<span class="c-g">works automatically</span>'],
        ['Row removed', 'must detach (or leak)', '<span class="c-g">nothing to clean</span>'],
        ['Finding "which row?"', 'closure over the row', '<code>event.target.closest("li")</code>'],
        ['Different action per button', 'separate functions', 'one handler + <code>data-action</code> routing']
      ])}
      <p><b>Routing many buttons.</b> Put a label on each button: <code>&lt;button data-action="delete"&gt;</code>, <code>&lt;button data-action="edit"&gt;</code>. One handler reads <code>button.dataset.action</code> and calls the right function from a small lookup object. Many apps (and old jQuery <code>.on("click", ".sel", fn)</code>) work exactly this way. Watch the visualizer: <b>one</b> listener on the <code>ul</code>, many different clicks.</p>`,
    clues: [
      '"Attach a click handler to every item in a list" + "items are added dynamically" → delegation on the parent',
      '"1,000 / 10,000 rows, memory or performance" → one listener instead of N',
      '"Handler stops working for newly added elements" → listeners were attached to the old elements only',
      '"event.target is the icon inside my button" → use <code>closest()</code>',
      '"Implement a todo list / tabs / accordion / dropdown menu" → delegate on the container',
      '"What is event delegation and how does it work?" (classic question) → bubbling + target + one parent listener'
    ],
    code: [
      { lang: 'js', title: 'Delegated task list: add, toggle done, delete (one click listener)', code: `// HTML: <form class="add"><input><button>Add</button></form>
//       <ul class="tasks"></ul>
const form = document.querySelector('form.add');
const input = form.querySelector('input');
const list = document.querySelector('ul.tasks');
let nextId = 1;

function addTask(text) {
  const li = document.createElement('li');
  li.dataset.id = String(nextId++);
  const label = document.createElement('span');
  label.className = 'text';
  label.textContent = text;                     // safe: user text as text
  const del = document.createElement('button');
  del.type = 'button';                          // not a submit button
  del.className = 'del';
  del.textContent = 'Delete';
  li.append(label, del);
  list.append(li);                              // NO listener attached here - delegation handles it
}

form.addEventListener('submit', (event) => {
  event.preventDefault();                       // stay on the page
  const text = input.value.trim();
  if (!text) return;
  addTask(text);
  input.value = '';
  input.focus();
});

// ONE listener for every present and future task
list.addEventListener('click', (event) => {
  const del = event.target.closest('button.del');
  if (del && list.contains(del)) {              // boundary check
    del.closest('li').remove();
    return;
  }
  const li = event.target.closest('li');
  if (li && list.contains(li)) li.classList.toggle('done');
});` },
      { lang: 'js', title: 'Routing with data-action', code: `const toolbar = document.querySelector('.toolbar');
// <button data-action="bold">B</button> <button data-action="italic">I</button> <button data-action="clear">Clear</button>
const actions = {
  bold()   { console.log('toggle bold'); },
  italic() { console.log('toggle italic'); },
  clear()  { console.log('clear formatting'); }
};
toolbar.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-action]');
  if (!btn || !toolbar.contains(btn)) return;
  const run = actions[btn.dataset.action];
  if (run) run();                               // unknown action? silently ignore
});` },
      { lang: 'js', run: true, title: 'Run it: delegation with a pretend DOM (closest + a dynamically added row)', code: `// Pure JS nodes with parent pointers so we can implement closest() ourselves.
class El {
  constructor(tag, cls = '', parent = null) {
    this.tag = tag; this.cls = cls.split(' ').filter(Boolean); this.parent = parent; this.children = [];
    if (parent) parent.children.push(this);
  }
  matches(sel) {                                  // supports "tag", ".class", "tag.class"
    const [tag, ...cls] = sel.split('.');
    return (!tag || this.tag === tag) && cls.every((c) => this.cls.includes(c));
  }
  closest(sel) {
    for (let n = this; n; n = n.parent) if (n.matches(sel)) return n;   // itself, then up
    return null;
  }
}

const list = new El('ul', 'tasks');
let listenersAttached = 0;
function addRow(name) {                           // NOTE: no listener attached per row
  const li = new El('li', '', list);
  const text = new El('span', 'text', li);
  const del = new El('button', 'del', li);
  text.label = name;
  return { li, text, del };
}

// "Attach" ONE listener to the list: it receives any click that bubbled up from a descendant.
listenersAttached++;
function onListClick(target) {
  const del = target.closest('button.del');
  if (del) return 'delete row containing: ' + del.parent.children[0].label;
  const li = target.closest('li');
  return li ? 'toggle done on: ' + li.children[0].label : 'ignored (click was on the list padding)';
}

const a = addRow('milk'), b = addRow('eggs');
console.log(onListClick(a.text));      // click on text  -> toggle
console.log(onListClick(b.del));       // click on delete -> delete
console.log(onListClick(list));        // click on list gap -> ignored
const c = addRow('bread');             // added LATER...
console.log(onListClick(c.text));      // ...works with no extra listener
console.log('listeners attached =', listenersAttached, '| rows =', list.children.length);` }
    ],
    viz: {
      title: 'One listener on the ul catching clicks from every child',
      input: 'text1 del2 li1',
      inputLabel: 'Clicks in order (max 6): li1 text1 del1 li2 text2 del2 ul. Try: "text1 del2 li1"',
      gen: function (input) {
        var toks = words(input, 'text1 del2 li1').map(function (t) { return t.toLowerCase(); });
        var IDX = { ul: 0, li1: 1, li2: 2, text1: 3, del1: 4, text2: 5, del2: 6 };
        var LABEL = ['ul', 'li', 'li', 'span', 'button', 'span', 'button'];
        var NAME = ['ul.tasks', 'li#1', 'li#2', 'span.text (#1)', 'button.del (#1)', 'span.text (#2)', 'button.del (#2)'];
        if (!toks.length || toks.length > 6) throw new Error('Give 1 to 6 clicks, e.g. text1 del2 li1');
        toks.forEach(function (t) { if (IDX[t] === undefined) throw new Error('Unknown click "' + t + '". Use: li1 text1 del1 li2 text2 del2 ul'); });
        var done = { 1: false, 2: false }, gone = { 1: false, 2: false };
        function arr() { return LABEL.map(function (l, i) { var li = i === 1 || i === 3 || i === 4 ? 1 : (i === 2 || i === 5 || i === 6 ? 2 : 0); return li && gone[li] ? null : l; }); }
        function tags() {
          var t = { 0: 'listener' };
          [1, 2].forEach(function (k) { if (!gone[k]) t[k] = done[k] ? 'done' : 'open'; });
          return t;
        }
        function aliveItems() { return (gone[1] ? 0 : 1) + (gone[2] ? 0 : 1); }
        var rows = [];
        var frames = [];
        frames.push({
          narr: 'A task list with 2 rows. Each row has a text <code>span</code> and a <code>button.del</code>. There are <b>7 elements</b> you can click but only <b>1 listener</b>, on the <code>ul</code> (shown as "listener"). Without delegation we would need 4 (one on each li and one on each delete button).',
          parts: [
            { type: 'tree', label: 'ul.tasks (one click listener lives on the root)', arr: arr(), hl: { 0: 'win' }, tags: tags() },
            { type: 'vars', vals: { 'listeners attached': 1, 'rows alive': 2 }, hl: { 'listeners attached': 'ok' } }
          ]
        });
        toks.forEach(function (t, step) {
          var i = IDX[t];
          var liOf = (i === 1 || i === 3 || i === 4) ? 1 : ((i === 2 || i === 5 || i === 6) ? 2 : 0);
          if (liOf && gone[liOf]) {
            frames.push({ narr: 'Click ' + (step + 1) + ' on <b>' + NAME[i] + '</b>: that row was already deleted, so there is nothing left to click. (Skipped.)', parts: [{ type: 'tree', label: 'Row is gone', arr: arr(), hl: { 0: 'win' }, tags: tags() }] });
            return;
          }
          var isDel = (i === 4 || i === 6);
          var closestDel = isDel ? NAME[i] : 'null';
          var closestLi = liOf ? 'li#' + liOf : 'null';
          var action = isDel ? 'remove li#' + liOf : (liOf ? 'toggle done on li#' + liOf : 'ignore');
          var hl1 = {};
          hl1[0] = 'win'; hl1[i] = 'cur';
          frames.push({
            narr: '<b>Click ' + (step + 1) + ':</b> the user clicks <b>' + NAME[i] + '</b>. The click happens there (<code>event.target</code>) and <span class="c-b">bubbles up</span> to the <code>ul</code>, where our single listener is waiting.',
            parts: [
              { type: 'tree', label: 'amber = event.target, blue = element holding the listener', arr: arr(), hl: hl1, tags: tags() },
              { type: 'vars', vals: { 'event.target': NAME[i], 'event.currentTarget': 'ul.tasks' } }
            ]
          });
          rows.push([step + 1, NAME[i], closestDel, closestLi, action]);
          var hl2 = {};
          hl2[0] = 'win';
          if (action === 'ignore') hl2[0] = 'bad';
          else if (isDel) hl2[liOf] = 'bad'; else hl2[liOf] = 'ok';
          var narr;
          if (isDel) narr = 'Handler runs <code>event.target.closest("button.del")</code> → found <b>' + closestDel + '</b>. So the action is <b>delete</b>: <code>li#' + liOf + '.remove()</code>. The row (and its children) leave the tree.';
          else if (liOf) narr = '<code>closest("button.del")</code> → <b>null</b>, so it is not a delete click. Next <code>closest("li")</code> → <b>li#' + liOf + '</b> (even when you clicked the inner span, <code>closest</code> climbs up to the row). Action: <b>toggle done</b>.';
          else narr = 'Both <code>closest("button.del")</code> and <code>closest("li")</code> are <b>null</b>: the click landed on the list itself (padding). The handler <span class="c-r">ignores</span> it.';
          if (isDel) gone[liOf] = true; else if (liOf) done[liOf] = !done[liOf];
          frames.push({
            narr: narr,
            parts: [
              { type: 'tree', label: 'After the handler ran', arr: arr(), hl: hl2, tags: tags() },
              { type: 'table', label: 'What the one handler decided each time', columns: ['click', 'event.target', 'closest(button.del)', 'closest(li)', 'action'], rows: rows.map(function (r) { return r.slice(); }), hl: one(rows.length - 1, 'cur') },
              { type: 'vars', vals: { 'listeners attached': 1, 'rows alive': aliveItems() }, hl: { 'listeners attached': 'ok' } }
            ]
          });
        });
        frames.push({
          narr: 'Summary: <b>' + toks.length + '</b> clicks, <b>1</b> listener, and the handler worked out the right behaviour each time. If we added a third row now it would already work, with zero extra setup - that is the superpower of delegation.',
          parts: [
            { type: 'tree', label: 'Final state', arr: arr(), hl: { 0: 'win' }, tags: tags() },
            { type: 'vars', vals: { 'listeners attached': 1, 'clicks handled': toks.length, 'rows alive': aliveItems() }, hl: { 'listeners attached': 'ok' } }
          ]
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'Memory and setup cost: 1,000 listeners vs 1',
        html: `<p>Modern browsers handle thousands of listeners, so this is <i>not</i> usually the bottleneck - but the real win is <b>simplicity</b>: rows can be created, replaced or re-rendered by any code and they just work. Compare two ways to wire 1,000 delete buttons:</p>${H.table(['', 'Per-button', 'Delegated'], [['Function objects created', '1,000 (if arrow functions in a loop)', '1'], ['Register calls', '1,000', '1'], ['Re-render the list with innerHTML', '<span class="c-r">all listeners lost, must re-attach</span>', '<span class="c-g">nothing to redo</span>'], ['Cleanup on teardown', 'remove 1,000', 'remove 1']])}`,
        code: `// per-button (works, but heavier and fragile)
document.querySelectorAll('button.del').forEach((b) => b.addEventListener('click', () => b.closest('li').remove()));

// delegated (one listener, survives re-rendering)
document.querySelector('ul.tasks').addEventListener('click', (e) => {
  const b = e.target.closest('button.del');
  if (b) b.closest('li').remove();
});`
      },
      {
        title: 'Why target === button is a bug (icons inside buttons)',
        html: `<p>Your button is <code>&lt;button class="del"&gt;&lt;svg&gt;...&lt;/svg&gt; Delete&lt;/button&gt;</code>. The user clicks the little SVG. <code>event.target</code> is the <code>svg</code> (or its <code>path</code>), so <code>event.target.className === "del"</code> is <span class="c-r">false</span> and nothing happens - on the icon only! Always <code>closest()</code>.</p>`,
        code: `list.addEventListener('click', (e) => {
  // BAD: if (e.target.className === 'del') ...    // fails when the click lands on the svg inside
  const btn = e.target.closest('.del');             // GOOD: climbs up from svg/path/span to the button
  if (btn) btn.closest('li').remove();
});`
      },
      {
        title: 'Nested lists and the boundary check',
        html: `<p>A menu inside another menu: <code>ul.menu &gt; li &gt; ul.menu &gt; li</code>. A delegated listener on the <b>outer</b> menu receives clicks from the inner one too. <code>event.target.closest("li")</code> finds the <i>nearest</i> li (correct), but if you only want items of <b>this</b> list you must check <code>outer.contains(li)</code> and, for nested cases, that <code>li.parentElement === outer</code>. And if the click is in a <i>different</i> component that sits in the page above your container, <code>closest</code> could even return an ancestor outside it - the <code>contains</code> check protects you.</p>`,
        code: `outer.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li || !outer.contains(li)) return;       // outside our component
  if (li.parentElement !== outer) return;       // belongs to a nested list: that list handles itself
  console.log('top-level item:', li.dataset.id);
});`
      },
      {
        title: 'Delegating non-bubbling events',
        html: `<p>You want to show a hint for whichever input gets focus, using one listener on the form. <code>focus</code> does not bubble, so a normal listener never fires. Two fixes: listen for <code>focusin</code> (the bubbling version), or pass <code>true</code> to use the capture phase.</p>`,
        code: `form.addEventListener('focusin', (e) => {
  const field = e.target.closest('input, select, textarea');
  if (field) showHint(field.name);
});
function showHint(name) { document.querySelector('#hint').textContent = 'Fill in: ' + name; }`
      }
    ],
    deepDive: `<p>🟣 <b>What delegation really costs.</b> Each listener call does a little work: the browser walks the event path, and your handler runs <code>closest</code> (a loop up the ancestors, a few steps). For <code>click</code> this is nothing. For very high-frequency events such as <code>pointermove</code> or <code>scroll</code> on a big container, running selector matching on every event is wasteful - use a cheap early check (<code>if (!e.target.matches(...)) return</code>), or <code>requestAnimationFrame</code> throttling, or attach per-element listeners only while a drag is active (add on <code>pointerdown</code>, remove on <code>pointerup</code>).</p>
      <p><b>Where delegation breaks.</b> (1) A child calling <code>stopPropagation()</code> hides the event from your parent - one reason to avoid that call in shared code. (2) Events that don't bubble (see above). (3) <b>Shadow DOM</b>: <code>event.target</code> is retargeted to the shadow host when observed from outside, so a parent can't see which inner button was hit - use <code>event.composedPath()[0]</code> for open roots. (4) <code>mouseenter</code>-style hover logic: use <code>mouseover</code> and check <code>relatedTarget</code> to avoid flicker when moving between children.</p>
      <p><b>Accessibility.</b> Delegation does not give anything keyboard behaviour. A real <code>&lt;button&gt;</code> fires <code>click</code> on Enter/Space, so delegating <code>click</code> on buttons is keyboard-friendly; delegating click on <code>&lt;div&gt;</code> or <code>&lt;li&gt;</code> that you made "clickable" is not (no focus, no Enter/Space) unless you add <code>tabindex</code>, a role and key handlers. For composite widgets (tabs, menus, listboxes, grids) the pattern is <b>one delegated keydown</b> plus a "roving tabindex" - exactly how many accessibility patterns are built.</p>
      <p><b>Frameworks do it for you.</b> React, Solid and Svelte 5 attach listeners high up (React: the root container) and route to your handlers internally, so a list of 1,000 <code>onClick</code> props is already delegated under the hood. Knowing the manual version helps you answer interview questions ("how does React handle events?"), debug <code>stopPropagation</code> issues, and write fast vanilla code for widgets, browser extensions and embeds where no framework exists. <b>Related pattern:</b> in virtualised lists (only ~20 rows exist in the DOM at a time) delegation is not optional - rows are constantly created and destroyed while scrolling.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> if you ask an assistant for "a todo list in vanilla JS" you will usually get per-item <code>addEventListener</code> calls inside the add function (works for the demo) or, increasingly, a delegated version. Both run. The important skill is <i>reviewing</i> which one you got and whether it will survive "load 5,000 tasks from the server and re-render".</p>
      <p><b>Use AI as a partner:</b> <code>Refactor this code to use event delegation; keep behaviour identical and list what each closest() call protects against</code>. Then test the three tricky clicks yourself: the icon inside a button, a nested list, and a row added after page load. <b>Where AI goes wrong:</b> compares <code>event.target.tagName === "BUTTON"</code> (breaks with icons), forgets the <code>contains</code> boundary, delegates <code>mouseenter</code>/<code>focus</code> (they don't bubble), and makes non-button elements clickable without keyboard support. <b>What you must still own:</b> explaining <i>why</i> it works (bubbling + target), picking <code>closest</code> over <code>target ===</code>, and the accessibility story - it is a very common follow-up question.</p>`,
    problems: [
      {
        title: 'Task List with Delegation (add, complete, delete)',
        level: 'Medium', tags: ['delegation', 'DOM', 'forms', 'machine coding'], companies: ['Flipkart', 'Atlassian', 'Swiggy', 'PhonePe'],
        statement: `<p>Build a task list in plain JavaScript. The page has <code>&lt;form class="add"&gt;&lt;input&gt;&lt;button&gt;Add&lt;/button&gt;&lt;/form&gt;</code> and an empty <code>&lt;ul class="tasks"&gt;&lt;/ul&gt;</code>. Requirements: (1) submitting the form with non-empty text appends a task (no page reload) and clears the input, (2) clicking a task's text toggles a <code>done</code> class, (3) clicking its <b>Delete</b> button removes it, (4) <b>exactly one click listener</b> for all tasks, present and future, (5) task text is user input - it must never be parsed as HTML.</p>`,
        constraints: `Up to 10,000 tasks. Whitespace-only input must be ignored. Do not use innerHTML with user text.`,
        example: `${H.table(['Action', 'Result'], [['type "Milk", Add', 'one li "Milk"; input cleared'], ['type "&lt;b&gt;hi&lt;/b&gt;", Add', 'second li shows the literal characters &lt;b&gt;hi&lt;/b&gt;'], ['click on "Milk"', 'li gets class <code>done</code> (click again: removed)'], ['click Delete on the second', 'second li removed'], ['type "   ", Add', 'nothing happens']])}`,
        brute: {
          why: `<p>Attach a click listener to the span and to the button of every task <i>inside</i> <code>addTask</code>. It works for the first demo, but each task adds two more functions and two registrations, you must remember to repeat it everywhere tasks are created (loading from storage, undo, re-render), and re-rendering with <code>innerHTML</code> silently loses them.</p>`,
          code: `function addTaskBrute(list, text) {
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.textContent = text;
  const del = document.createElement('button');
  del.textContent = 'Delete';
  span.addEventListener('click', () => li.classList.toggle('done'));   // 2 listeners per task
  del.addEventListener('click', () => li.remove());
  li.append(span, del);
  list.append(li);
}`
        },
        mcq: { q: 'Why does a click on the text inside a task reach the single listener on the ul?', options: ['Because click events bubble from the target up through its ancestors', 'Because the browser copies listeners to new children', 'Because ul listeners capture events from the whole page', 'Because the form submit event forwards it'], answer: 0, explain: 'Click bubbles: span → li → ul. The ul listener runs during the bubbling phase and can inspect event.target.' },
        hints: [
          `<p>Hint 1: the aha - tasks come and go, but the <code>ul</code> stays forever. Attach the listener to the thing that stays.</p>`,
          `<p>Hint 2: in the handler use <code>event.target.closest(...)</code>: first test for the delete button (more specific), then for the li (toggle).</p>`,
          `<p>Hint 3: recipe - form <code>submit</code>: <code>preventDefault()</code>, trim the value, return if empty, build li with <code>createElement</code> + <code>textContent</code>, append, clear and re-focus the input. List <code>click</code>: <code>del = target.closest("button.del")</code>; if found remove its li; else <code>li = target.closest("li")</code>; if found toggle <code>done</code>. Add a <code>list.contains(...)</code> check.</p>`
        ],
        solution: {
          approach: `<p>Two listeners total: the form's <code>submit</code> (needed to stop the page reload) and ONE <code>click</code> on the list. The click handler tests the most specific target first (delete button), then the generic one (the task row). All text goes in with <code>textContent</code>.</p>`,
          code: `function initTaskApp(form, list) {
  const input = form.querySelector('input');

  form.addEventListener('submit', (event) => {
    event.preventDefault();                        // no page reload
    const text = input.value.trim();
    if (!text) return;                             // ignore empty / whitespace
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'text';
    label.textContent = text;                      // never parsed as HTML
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.textContent = 'Delete';
    li.append(label, del);
    list.append(li);                               // no listener attached here
    input.value = '';
    input.focus();
  });

  list.addEventListener('click', (event) => {      // THE one listener
    const del = event.target.closest('button.del');
    if (del && list.contains(del)) {
      del.closest('li').remove();
      return;
    }
    const li = event.target.closest('li');
    if (li && list.contains(li)) li.classList.toggle('done');
  });
}

initTaskApp(document.querySelector('form.add'), document.querySelector('ul.tasks'));`,
          complexity: `<p>Each click is O(depth of the clicked element) for the <code>closest</code> climbs, effectively O(1). Rendering a task is O(1). Listeners: 2 in total, independent of the number of tasks.</p>`,
          followUps: ['Persist tasks in localStorage and re-render on load (still no per-item listeners).', 'Add double-click to edit text inline.', 'Make the list keyboard-accessible: make the text a real checkbox/label.']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 6 — preventDefault, stopPropagation, stopImmediatePropagation
     ====================================================================== */
  topics.push({
    title: 'preventDefault vs stopPropagation vs stopImmediatePropagation',
    analogy: `<p>Pulling a <b>fire alarm</b> in a mall does two separate things automatically: (1) the <b>bells ring</b> (the built-in "default action"), and (2) a <b>message travels floor by floor</b> to every manager (propagation). You have two different switches:</p>
      <ul><li><b>preventDefault</b> = cut the wire to the bells. The message still reaches every manager; only the built-in action is cancelled.</li><li><b>stopPropagation</b> = tell the messenger "do not go up any further". The bells still ring; managers on higher floors never hear. Managers on <i>your own</i> floor still hear it.</li><li><b>stopImmediatePropagation</b> = same, and also silence the other managers on your own floor who have not been told yet.</li></ul>
      <p>Mixing these up is one of the most common DOM bugs.</p>`,
    explain: `<p>🟢 <b>Default actions.</b> Many events do something <i>on their own</i> after your handlers run. That built-in behaviour is the <b>default action</b>:</p>
      ${H.table(['Event on...', 'Default action the browser does'], [
        ['click on <code>&lt;a href&gt;</code>', 'navigates to the link'],
        ['submit of a <code>&lt;form&gt;</code> (click Submit or press Enter)', 'sends the form and reloads/navigates the page'],
        ['click on a checkbox', 'toggles it'],
        ['keydown in a text box', 'types the character'],
        ['keydown Space on the page', 'scrolls down'],
        ['contextmenu (right click)', 'opens the browser menu'],
        ['wheel / touchmove', 'scrolls the page'],
        ['dragstart on an image or link', 'starts dragging it']
      ])}
      <p><code>event.preventDefault()</code> says "do not do your built-in thing". It works only if the event is <b>cancelable</b> (<code>event.cancelable</code>) and the listener is not <b>passive</b>. Afterwards <code>event.defaultPrevented</code> is <code>true</code>. It does <b>not</b> stop the event from travelling to other listeners. Typical uses: handle a link in JavaScript (single-page-app routing), stop a form from reloading the page so you can validate and send it with <code>fetch</code>, block a character in an input.</p>
      <p>🔵 <b>Stopping the trip.</b></p>
      ${H.table(['Call', 'Stops the event from reaching...', 'Other listeners on the same element?', 'Default action?'], [
        ['<code>preventDefault()</code>', '- (nothing)', 'still run', '<span class="c-r">cancelled</span>'],
        ['<code>stopPropagation()</code>', 'the <b>next</b> elements on the path (parents when bubbling)', '<span class="c-g">still run</span>', 'still happens'],
        ['<code>stopImmediatePropagation()</code>', 'the next elements <b>and</b> the remaining listeners on this element', '<span class="c-r">skipped</span>', 'still happens']
      ])}
      <p>The visualizer shows an <code>&lt;a&gt;</code> inside a <code>&lt;div&gt;</code> inside the <code>&lt;body&gt;</code>, with two listeners on the link. Toggle the options and watch which handlers fire and whether the browser still follows the link.</p>
      <p><b>Rule of thumb:</b> use <code>preventDefault</code> freely when you are replacing built-in behaviour. Treat <code>stopPropagation</code> as a <b>last resort</b>: it makes your handler invisible to everyone above (delegated listeners, analytics, "click outside" code, framework internals). A narrower fix is almost always to check <code>event.target</code> where you listen.</p>
      <p>Two old habits to drop: <code>return false</code> in an <code>addEventListener</code> handler does <b>nothing</b> (only in the old <code>onclick="return false"</code> attribute does it cancel); and calling <code>preventDefault</code> on a <code>touchmove</code>/<code>wheel</code> listener on <code>window</code> may be ignored because those are <b>passive</b> by default.</p>`,
    clues: [
      '"Page reloads when I click Submit" → <code>event.preventDefault()</code> in the <code>submit</code> handler',
      '"Link should not navigate, handle it in JS (SPA routing)" → <code>preventDefault</code> on click (and check Ctrl/Cmd/middle-click)',
      '"Difference between preventDefault and stopPropagation?" (very common question) → default action vs travelling to other elements',
      '"stopPropagation vs stopImmediatePropagation" → other listeners on the same element',
      '"Parent / document listener never fires after I added stopPropagation" → you stopped it',
      'Console warning "Unable to preventDefault inside passive event listener" → use <code>{ passive: false }</code> or CSS <code>touch-action</code>'
    ],
    code: [
      { lang: 'js', title: 'Typical uses', code: `// 1. Handle a link yourself (single-page-app routing)
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="/"]');       // internal links only
  if (!link) return;
  // Let the browser handle "open in new tab" gestures
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  event.preventDefault();                                  // cancel the page load
  history.pushState({}, '', link.getAttribute('href'));    // change the URL ourselves
  renderRoute(link.getAttribute('href'));
});

// 2. Block characters in an input (digits only)
const qty = document.querySelector('input.qty');
qty.addEventListener('keydown', (e) => {
  const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'];
  if (!allowed.includes(e.key) && !/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
});

// 3. Make a scroll-blocking listener explicit
box.addEventListener('touchmove', (e) => { if (isDragging) e.preventDefault(); }, { passive: false });

function renderRoute(path) { console.log('render', path); }` },
      { lang: 'js', run: true, title: 'Run it: the three switches in a tiny simulator', code: `// Bubble-only simulator: handlers = list of { on, name, run(event) } from target upwards.
function click(handlers, defaultAction) {
  const event = {
    defaultPrevented: false, stopped: false, stoppedNow: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.stopped = true; },
    stopImmediatePropagation() { this.stopped = true; this.stoppedNow = true; }
  };
  const fired = [];
  const order = [...new Set(handlers.map((h) => h.on))];          // elements, target first
  for (const el of order) {
    for (const h of handlers.filter((x) => x.on === el)) {
      if (event.stoppedNow) break;                                 // skips rest on THIS element
      fired.push(h.name);
      h.run(event);
    }
    if (event.stopped) break;                                      // do not go to the parent
  }
  const navigated = !event.defaultPrevented;                       // default action runs AFTER dispatch
  if (navigated) defaultAction();
  return { fired, defaultPrevented: event.defaultPrevented, navigated };
}

function scenario(label, first) {
  const handlers = [
    { on: 'a', name: 'A1', run: first },
    { on: 'a', name: 'A2', run: () => {} },
    { on: 'div', name: 'DIV', run: () => {} },
    { on: 'body', name: 'BODY', run: () => {} }
  ];
  const r = click(handlers, () => {});
  console.log(label.padEnd(26), '| fired:', r.fired.join(','), '| link followed:', r.navigated);
}
scenario('nothing special', () => {});
scenario('preventDefault', (e) => e.preventDefault());
scenario('stopPropagation', (e) => e.stopPropagation());
scenario('stopImmediatePropagation', (e) => e.stopImmediatePropagation());
scenario('prevent + stopPropagation', (e) => { e.preventDefault(); e.stopPropagation(); });` }
    ],
    viz: {
      title: 'What does each switch actually change?',
      input: 'prevent',
      inputLabel: 'First link handler calls: any of  prevent  stop  stopnow  (or "none"). Try: "prevent",  "stop",  "stopnow",  "prevent stop"',
      gen: function (input) {
        var toks = words(input, 'prevent').map(function (t) { return t.toLowerCase(); });
        toks.forEach(function (t) { if (['prevent', 'stop', 'stopnow', 'none'].indexOf(t) < 0) throw new Error('Use: prevent, stop, stopnow or none (you can combine, e.g. "prevent stop")'); });
        var prevent = toks.indexOf('prevent') >= 0, stop = toks.indexOf('stop') >= 0, stopNow = toks.indexOf('stopnow') >= 0;
        var arr = ['body', 'div', null, 'a'];
        var handlers = [
          { id: 'A1', el: 3, text: 'link handler #1' },
          { id: 'A2', el: 3, text: 'link handler #2' },
          { id: 'DIV', el: 1, text: 'div handler' },
          { id: 'BODY', el: 0, text: 'body handler' }
        ];
        var fired = [], skipped = [], frames = [];
        var st = { prevented: false, stopped: false, now: false };
        function fr(narr, cur, extra) {
          var hl = { 3: 'win', 1: 'win', 0: 'win' };
          fired.forEach(function (f) { hl[f.el] = 'ok'; });
          if (cur !== null) hl[cur] = 'cur';
          var parts = [
            { type: 'tree', label: 'a inside div inside body - click bubbles upward', arr: arr, hl: hl, tags: { 3: 'a href', 1: 'div', 0: 'body' } },
            { type: 'queue', label: 'Handlers fired (in order)', items: fired.length ? fired.map(function (f) { return f.id; }) : ['(none yet)'], frontLabel: 'first', backLabel: 'latest' },
            { type: 'vars', vals: { defaultPrevented: st.prevented, 'propagation stopped': st.stopped, 'immediate stopped': st.now }, hl: { defaultPrevented: st.prevented ? 'bad' : 'ok', 'propagation stopped': st.stopped ? 'bad' : 'ok', 'immediate stopped': st.now ? 'bad' : 'ok' } }
          ];
          (extra || []).forEach(function (p) { parts.push(p); });
          frames.push({ narr: narr, parts: parts });
        }
        fr('You click a link. Before anything runs the browser plans the trip: <b>a → div → body</b> (bubbling). The link has <b>two</b> listeners (A1, A2). Option(s) chosen: <b>' + (toks.join(' + ')) + '</b> - these are called inside <b>A1</b>. After all listeners finish, the browser will perform the default action (follow the href) unless prevented.', null);
        handlers.forEach(function (h) {
          if (st.now) { skipped.push(h.id); return; }
          if (st.stopped && h.el !== 3) { skipped.push(h.id); return; }
          fired.push(h);
          var msg = 'Handler <b>' + h.id + '</b> (' + h.text + ') runs.';
          if (h.id === 'A1') {
            if (prevent) { st.prevented = true; msg += ' It calls <code>preventDefault()</code> → defaultPrevented = true. The event keeps travelling.'; }
            if (stopNow) { st.stopped = true; st.now = true; msg += ' It calls <code>stopImmediatePropagation()</code> → <span class="c-r">no other listener at all will run</span>, not even A2 on the same link.'; }
            else if (stop) { st.stopped = true; msg += ' It calls <code>stopPropagation()</code> → the event will not move up to div/body, but A2 (same element) still runs.'; }
            if (!prevent && !stop && !stopNow) msg += ' It does nothing special.';
          } else if (h.id === 'A2') msg += ' (Allowed because stopPropagation only blocks OTHER elements.)';
          fr(msg, h.el);
        });
        if (skipped.length) fr('Skipped (never heard the click): <b>' + skipped.join(', ') + '</b>.', null);
        fr('All listeners are done. Now the browser looks at <code>defaultPrevented</code> = <b>' + st.prevented + '</b>. ' + (st.prevented ? '<span class="c-r">The default action is cancelled: the link is NOT followed.</span>' : '<span class="c-g">Not prevented: the browser follows the link.</span>') + ' Notice that <code>stopPropagation</code> never changes this - they are independent switches.', null, [
          { type: 'table', label: 'Summary', columns: ['question', 'answer'], rows: [['listeners that ran', fired.map(function (f) { return f.id; }).join(', ')], ['listeners skipped', skipped.length ? skipped.join(', ') : 'none'], ['link followed?', st.prevented ? 'no' : 'yes']], hl: { 2: st.prevented ? 'bad' : 'ok' } }
        ]);
        return frames;
      }
    },
    examples: [
      {
        title: 'The classic SPA link handler (and the modifier keys trap)',
        html: `<p>If you <code>preventDefault()</code> on <b>every</b> link click, users can no longer Ctrl/Cmd-click to open a new tab or middle-click. Good routers only take over plain left-clicks on same-origin links with no <code>target</code> and no <code>download</code> attribute, and let the browser do everything else.</p>`,
        code: `function shouldHandle(event, link) {
  return event.button === 0                      // left click
    && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    && !link.target                              // not target="_blank"
    && !link.hasAttribute('download')
    && link.origin === location.origin;          // same site
}`
      },
      {
        title: 'stopPropagation breaking "click outside to close"',
        html: `<p>You open a dropdown on button click and close it with a <code>document</code> click listener. A helpful teammate adds <code>e.stopPropagation()</code> to the button handler "so the document handler does not immediately close it". It works... until a second dropdown on the page also relies on the document listener: opening dropdown B no longer closes dropdown A, because the click never reaches document. The better fix: in the document handler, ignore clicks inside the dropdown with <code>contains()</code>.</p>`,
        code: `// Fragile: hides the click from everyone
toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('open'); });

// Robust: nobody is silenced; the document handler decides
toggleBtn.addEventListener('click', () => menu.classList.toggle('open'));
document.addEventListener('click', (e) => {
  if (!menu.contains(e.target) && e.target !== toggleBtn) menu.classList.remove('open');
});`
      },
      {
        title: 'Cancelable? Passive? When preventDefault silently fails',
        html: `<p>Some events are <b>not cancelable</b> (<code>scroll</code>, <code>load</code>, <code>mouseenter</code>): <code>preventDefault()</code> does nothing - check <code>event.cancelable</code>. For <code>touchstart</code>/<code>touchmove</code>/<code>wheel</code> on window/document/body, browsers default to <b>passive: true</b>, so <code>preventDefault()</code> is ignored and the console warns. To really block touch scrolling use <code>{ passive: false }</code> or, better, the CSS property <code>touch-action: none</code>.</p>${H.table(['Situation', 'preventDefault works?'], [['click on a link', 'yes'], ['submit on a form', 'yes'], ['scroll event', '<span class="c-r">no - not cancelable</span>'], ['touchmove on body (default)', '<span class="c-r">no - passive</span>'], ['touchmove with <code>{ passive: false }</code>', 'yes (but can hurt scroll smoothness)']])}`
      },
      {
        title: 'return false: only in old inline attributes',
        html: `<p>In <code>&lt;a href="/x" onclick="return false"&gt;</code> returning <code>false</code> means preventDefault. But in <code>link.addEventListener("click", () =&gt; false)</code> the return value is ignored (jQuery's <code>return false</code> did both preventDefault and stopPropagation, which taught many people the wrong idea). Always call <code>event.preventDefault()</code> explicitly.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>When does the default action run?</b> After the whole dispatch (all phases, all listeners) is finished, the browser checks the "canceled flag". That is why <code>preventDefault()</code> can be called anywhere along the path - even from a capture listener on <code>window</code> or a bubbling listener on <code>document</code> - and still cancels the link. It also means you must call it <b>synchronously</b>: if you <code>await</code> something first, the dispatch has already ended and the browser has already followed the link. A confirm-before-leave flow therefore either prevents first and navigates manually later, or uses <code>beforeunload</code>.</p>
      <p><b>The cancelable flag and trusted events.</b> Browsers decide which events are cancelable by spec. <code>new Event("x")</code> is not cancelable unless you pass <code>{ cancelable: true }</code>; for custom events this lets <i>your</i> components offer an "are you sure?" hook (<code>if (!el.dispatchEvent(new CustomEvent("beforeclose", { cancelable: true }))) return;</code>). <code>dispatchEvent</code> returns <code>false</code> if any listener called <code>preventDefault</code>.</p>
      <p><b>Passive listeners in detail.</b> The compositor thread wants to scroll immediately. If there might be a <code>touchmove</code> listener that could cancel it, the browser must wait for the main thread to run it - causing jank. Declaring <code>{ passive: true }</code> promises "I won't cancel", so scrolling never waits. Chrome made <code>touchstart/touchmove/wheel</code> on window, document and body passive by default in 2017-2019. Use passive for everything that does not need to cancel.</p>
      <p><b>stopPropagation traps.</b> (1) It also stops <i>capturing</i> if called during capture (the target never sees the event). (2) It does not stop other listeners on the same node (use <code>stopImmediatePropagation</code>). (3) In React, <code>e.stopPropagation()</code> on a synthetic event stops React's own tree and calls the native one, so listeners above the root (<code>document</code>, <code>window</code>) do not run, but native listeners on elements below the root have already run. (4) Browser extensions and ad scripts sometimes add capture listeners on <code>window</code> that call <code>stopImmediatePropagation</code> and break your page - if your handler "randomly" never fires, check the Event Listeners panel. Bottom line: <b>preventDefault is surgical; stopPropagation is a hammer.</b></p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants often "fix" a double-fire or a parent-handler problem by sprinkling <code>e.stopPropagation()</code> and <code>e.preventDefault()</code> together - the code works in the demo and breaks something far away three weeks later. They also like <code>return false</code> from habit.</p>
      <p><b>Use AI as a partner:</b> ask <code>Why does this handler run twice? Explain with the event path, don't just patch it</code>, or <code>Review every stopPropagation call in this repo and suggest a safer alternative for each</code>. <b>Where AI goes wrong:</b> calls <code>preventDefault</code> after an <code>await</code> (too late), forgets modifier keys on link handling, adds it to passive scroll listeners, and treats the two methods as interchangeable. <b>What you must still own:</b> a one-sentence definition of each of the three methods (this is asked in nearly every frontend interview), the habit of asking "who else needed to hear this event?", and testing with real keyboard, middle-click and touch input.</p>`,
    problems: [
      {
        title: 'Click Outside Closes the Modal (Without stopPropagation)',
        level: 'Medium', tags: ['events', 'stopPropagation', 'modal'], companies: ['Atlassian', 'Adobe', 'Microsoft'],
        statement: `<p>A modal has a dark <code>.backdrop</code> element covering the page and a white <code>.dialog</code> inside it (the dialog is a child of the backdrop). Clicking the <b>dark area</b> must close the modal; clicking <b>anywhere inside the dialog</b> (text, buttons, inputs) must not. Pressing <kbd>Escape</kbd> must close it too. Other code on the page uses a <code>document</code> click listener for analytics and must still see every click. Implement <code>setupModal(backdrop)</code> that returns a <code>destroy()</code> function.</p>`,
        constraints: `Do not call stopPropagation anywhere. Remove all listeners in <code>destroy()</code>. Works for any content inside the dialog, including text selection that ends outside the dialog.`,
        example: `${H.table(['User action', 'event.target', 'Modal'], [['click dark area', '<code>.backdrop</code>', '<span class="c-g">closes</span>'], ['click a paragraph in the dialog', '<code>p</code> (inside .dialog)', 'stays open'], ['click the dialog\'s Save button', '<code>button</code>', 'stays open'], ['press Escape', '-', '<span class="c-g">closes</span>'], ['click anywhere', '-', 'document analytics listener still fires']])}`,
        brute: {
          why: `<p>Call <code>e.stopPropagation()</code> inside the dialog's click handler so the click never reaches the backdrop. It closes correctly but the click now never reaches <code>document</code> either, so analytics, other popups' "click outside" logic and framework handlers all go blind for every click inside the dialog.</p>`,
          code: `function setupModalBrute(backdrop) {
  const dialog = backdrop.querySelector('.dialog');
  dialog.addEventListener('click', (e) => e.stopPropagation());   // silences EVERYONE above
  backdrop.addEventListener('click', () => backdrop.hidden = true);
}`
        },
        mcq: { q: 'Which check closes only on a click on the dark area?', options: ['event.target === event.currentTarget on the backdrop', 'event.target.tagName === "DIV"', 'event.stopPropagation() in the backdrop handler', 'event.defaultPrevented'], answer: 0, explain: 'The backdrop listener also hears clicks that bubbled from the dialog. In those, target is a descendant, so target === currentTarget is false. Only a direct click on the backdrop passes.' },
        hints: [
          `<p>Hint 1: the aha - clicks inside the dialog bubble up to the backdrop. Do not block them; just <b>recognise</b> them.</p>`,
          `<p>Hint 2: inside the backdrop's click listener compare <code>event.target</code> with <code>event.currentTarget</code> (or with the backdrop element).</p>`,
          `<p>Hint 3: recipe - <code>onClick = (e) =&gt; { if (e.target === backdrop) close(); }</code>, <code>onKey = (e) =&gt; { if (e.key === "Escape") close(); }</code> on <code>document</code>. Use an <code>AbortController</code> so <code>destroy()</code> removes both. Edge case: mouse-down inside the dialog and mouse-up on the backdrop produces a click whose target is the common ancestor (the backdrop) - to be strict, remember where <code>pointerdown</code> started.</p>`
        ],
        solution: {
          approach: `<p>Nobody's event is stopped. The backdrop's listener checks who was actually hit; only a click directly on the backdrop closes. To handle a drag that starts inside the dialog and ends on the backdrop, record the <code>pointerdown</code> target and require both down and click to be on the backdrop. One <code>AbortController</code> cleans up everything.</p>`,
          code: `function setupModal(backdrop) {
  const ac = new AbortController();
  const opts = { signal: ac.signal };
  let downOnBackdrop = false;

  function close() {
    backdrop.hidden = true;
    ac.abort();                                     // removes every listener below
  }

  backdrop.addEventListener('pointerdown', (e) => {
    downOnBackdrop = e.target === backdrop;         // remember where the press began
  }, opts);

  backdrop.addEventListener('click', (e) => {
    // clicks from inside the dialog bubble here too, but target is a descendant
    if (e.target === backdrop && downOnBackdrop) close();
  }, opts);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  }, opts);

  return function destroy() { ac.abort(); };
}`,
          complexity: `<p>O(1) per event. Three listeners, all removed with one <code>abort()</code>.</p>`,
          followUps: ['Trap focus inside the dialog (Tab cycling) and restore focus on close.', 'Use the native <code>&lt;dialog&gt;</code> element with <code>showModal()</code> and compare.', 'Make it work when the modal is rendered inside a shadow root.']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 7 — Forms handling
     ====================================================================== */
  topics.push({
    title: 'Forms: Submit, Read Values & Validate',
    analogy: `<p>Handing in a <b>paper form at a government counter</b>. A polite clerk (the browser's built-in validation) glances at it: "you left the name blank, this email has no @". If it looks fine, the form goes through the window to the office (the server). Your JavaScript is a <b>second, smarter clerk</b> who can take the form <i>back</i> before it leaves the counter (<code>preventDefault</code>), read every box (<code>FormData</code>), apply the company's own rules, point at the wrong boxes with a red pen, and only then send it. And remember: the office (server) must <b>always check again</b>, because anyone can skip the counter and send a form by mail.</p>`,
    explain: `<p>🟢 <b>Listen to the form's <code>submit</code> event, not the button's click.</b> A form is submitted by clicking a submit button, pressing <kbd>Enter</kbd> inside a text field, or calling <code>form.requestSubmit()</code>. All of them fire one <code>submit</code> event on the <code>&lt;form&gt;</code>. A <code>click</code> listener on the button is not enough: it is skipped by <code>form.requestSubmit()</code> and by forms that have no submit button, and it runs before the browser has checked the built-in validation rules.</p>
      <pre>form.addEventListener('submit', (event) =&gt; {
  event.preventDefault();                       // stop the page from reloading
  const data = Object.fromEntries(new FormData(form));   // { name: "Ann", email: "..." }
  ...
});</pre>
      <p>🔵 <b>Reading values.</b></p>
      ${H.table(['Control', 'How to read it', 'Gotcha'], [
        ['text, email, password, textarea', '<code>input.value</code>', 'always a string, even for <code>type="number"</code>'],
        ['checkbox', '<code>input.checked</code> (boolean)', 'unchecked boxes are <b>missing</b> from FormData'],
        ['radio group', '<code>form.elements.size.value</code>', 'empty string when nothing is chosen'],
        ['select', '<code>select.value</code> / <code>select.selectedOptions</code>', 'multi-select needs <code>getAll</code>'],
        ['everything at once', '<code>new FormData(form)</code>', 'only controls with a <b>name</b> and not disabled']
      ])}
      <p><b>Validation in two layers.</b> (1) <b>Built-in</b> - add attributes in HTML and the browser blocks submit and shows a bubble: <code>required</code>, <code>minlength</code>/<code>maxlength</code>, <code>min</code>/<code>max</code>, <code>pattern="[A-Z]{3}"</code>, <code>type="email"</code>/<code>url</code>/<code>number</code>. Check them from JS with <code>form.checkValidity()</code> (true/false), <code>form.reportValidity()</code> (also shows bubbles) and <code>input.validity</code> (flags such as <code>valueMissing</code>, <code>typeMismatch</code>, <code>tooShort</code>, <code>rangeUnderflow</code>). Custom rule: <code>input.setCustomValidity("Passwords differ")</code> (empty string means "valid again"). (2) <b>Your own rules</b> with <code>novalidate</code> on the form - you decide the messages and layout.</p>
      <p><b>When to validate:</b> on <b>submit</b> always; on <code>blur</code> (leaving a field) to tell people early; on <code>input</code> only to <i>clear</i> an error once it is fixed (nobody likes a red error while they are still typing). <b>Good error UX:</b> message next to the field, linked with <code>aria-describedby</code>, <code>aria-invalid="true"</code> on the field, and move <b>focus to the first invalid field</b>.</p>
      <p><b>While sending:</b> disable the submit button (or set <code>aria-busy</code>) so a double-click does not create two orders. Watch the visualizer: it pretends to be your submit handler, reading three fields and checking them one by one.</p>`,
    clues: [
      '"Stop the form from reloading the page" → <code>submit</code> listener + <code>event.preventDefault()</code>',
      '"My code is skipped for some ways of submitting" → listen to the form <code>submit</code> event, not the button <code>click</code>',
      '"Get all form values as an object" → <code>Object.fromEntries(new FormData(form))</code>',
      '"Validate email / password rules and show errors beside fields" → pure <code>validate()</code> function + render errors',
      '"Confirm password must match" → <code>setCustomValidity</code> or custom rule on submit',
      '"User double-clicks Submit and the order is placed twice" → disable the button / ignore while pending',
      '"Is client-side validation enough?" → no; it is UX, the server must validate (security)'
    ],
    code: [
      { lang: 'js', title: 'A complete, accessible submit handler', code: `const form = document.querySelector('#signup');   // <form id="signup" novalidate> ... </form>

function validate(data) {
  const errors = {};
  if (data.name.trim().length < 2) errors.name = 'Please enter at least 2 letters.';
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email)) errors.email = 'Enter a valid email like ann@example.com.';
  const age = Number(data.age);
  if (!Number.isInteger(age) || age < 18 || age > 120) errors.age = 'Age must be a whole number from 18 to 120.';
  return errors;
}

function showErrors(errors) {
  for (const field of form.elements) {
    if (!field.name) continue;
    const msgEl = form.querySelector('#err-' + field.name);   // <p id="err-email" class="error"></p>
    const message = errors[field.name] || '';
    msgEl.textContent = message;                               // empty string clears the old error
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    field.setAttribute('aria-describedby', msgEl.id);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();                                      // 1. no page reload
  const data = Object.fromEntries(new FormData(form));         // 2. read everything
  const errors = validate(data);                               // 3. check
  showErrors(errors);
  const firstBad = form.querySelector('[aria-invalid="true"]');
  if (firstBad) { firstBad.focus(); return; }                  // 4. help the user fix it
  const button = event.submitter;                              // the button that was clicked
  button.disabled = true;                                      // 5. no double submit
  try {
    const res = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Server said ' + res.status);
    form.reset();
  } catch (err) {
    document.querySelector('#form-error').textContent = 'Could not sign up. Try again.';
  } finally {
    button.disabled = false;
  }
});` },
      { lang: 'js', title: 'Built-in Constraint Validation API', code: `// HTML: <input id="pw" type="password" minlength="8" required>
//       <input id="pw2" type="password" required>
const pw = document.querySelector('#pw');
const pw2 = document.querySelector('#pw2');

function checkMatch() {
  // empty string = "valid"; any text = invalid with that message
  pw2.setCustomValidity(pw.value === pw2.value ? '' : 'Passwords do not match');
}
pw.addEventListener('input', checkMatch);
pw2.addEventListener('input', checkMatch);

pw.addEventListener('blur', () => {
  const v = pw.validity;                                  // ValidityState object
  if (v.valueMissing) console.log('required');
  else if (v.tooShort) console.log('minimum is ' + pw.minLength);
});

document.querySelector('form').addEventListener('submit', (e) => {
  if (!e.target.checkValidity()) {                        // browser rules + custom validity
    e.preventDefault();
    e.target.reportValidity();                            // shows the bubble on the first bad field
  }
});` },
      { lang: 'js', run: true, title: 'Run it: validation as a pure function (reusable on the server too)', code: `// No DOM needed: input object in, errors object out. Easy to test!
function validate(data) {
  const errors = {};
  const name = String(data.name || '').trim();
  if (!name) errors.name = 'Name is required';
  else if (name.length < 2) errors.name = 'Name needs at least 2 letters';

  const email = String(data.email || '').trim();
  if (!email) errors.email = 'Email is required';
  else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) errors.email = 'Email looks wrong';

  const age = data.age === '' || data.age === undefined ? NaN : Number(data.age);
  if (data.age === '' || data.age === undefined) errors.age = 'Age is required';
  else if (!Number.isInteger(age)) errors.age = 'Age must be a whole number';
  else if (age < 18) errors.age = 'You must be 18 or older';
  else if (age > 120) errors.age = 'Age looks too high';

  return errors;
}

const cases = [
  { name: 'Ann', email: 'ann@example.com', age: '20' },
  { name: 'A', email: 'ann@example', age: '17' },
  { name: '', email: '', age: '' },
  { name: 'Bob', email: 'bob@x.io', age: '12.5' }
];
for (const c of cases) {
  const errors = validate(c);
  const keys = Object.keys(errors);
  console.log(JSON.stringify(c), '->', keys.length ? errors : 'VALID');
}` }
    ],
    viz: {
      title: 'A submit handler checking a signup form, field by field',
      input: 'Ann, ann@example.com, 20',
      inputLabel: 'name, email, age (comma separated). Try: "A, ann@example, 17"  or  ", ,"',
      gen: function (input) {
        var raw = String(input === undefined ? 'Ann, ann@example.com, 20' : input).split(',');
        var vals = [0, 1, 2].map(function (i) { return (raw[i] || '').trim(); });
        var names = ['name', 'email', 'age'];
        var rulesTxt = ['required, min 2 letters', 'required, looks like a@b.c', 'whole number 18 to 120'];
        function check(i, v) {
          if (i === 0) return !v ? 'required' : (v.length < 2 ? 'too short (min 2)' : '');
          if (i === 1) return !v ? 'required' : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'not a valid email');
          if (!v) return 'required';
          var n = Number(v);
          if (!isFinite(n) || Math.floor(n) !== n) return 'not a whole number';
          return n < 18 ? 'must be 18 or more' : (n > 120 ? 'must be 120 or less' : '');
        }
        var code = 'form.addEventListener("submit", (event) => {\n  event.preventDefault();\n  const data = Object.fromEntries(new FormData(form));\n  const errors = validate(data);\n  if (Object.keys(errors).length) {\n    showErrors(errors);\n    firstInvalidField.focus();\n    return;\n  }\n  sendToServer(data);\n});';
        var results = [null, null, null];
        function rows() {
          return names.map(function (n, i) {
            var r = results[i];
            return [n, vals[i] === '' ? '(empty)' : vals[i], rulesTxt[i], r === null ? '...' : (r === '' ? 'valid' : 'ERROR: ' + r)];
          });
        }
        function mk(narr, line, cls, extra, hlRows) {
          var parts = [
            { type: 'code', label: 'Your submit handler (amber = running)', lang: 'js', code: code, hl: line ? one(line, cls || 'cur') : {} },
            { type: 'table', label: 'Form state', columns: ['field', 'value', 'rule', 'result'], rows: rows(), hl: hlRows || {} }
          ];
          (extra || []).forEach(function (p) { parts.push(p); });
          frames.push({ narr: narr, parts: parts });
        }
        var frames = [];
        mk('The user fills in three fields and presses <kbd>Enter</kbd> (or clicks Submit). The values are in the table; no checks have run yet.', 0, '', [{ type: 'vars', vals: { 'values typed': vals.map(function (v) { return v === '' ? '""' : v; }).join(' | ') } }]);
        mk('The browser fires a <code>submit</code> event on the <b>form</b> (not just the button - Enter in a text box counts too). Your listener starts running.', 1, 'cur', [{ type: 'vars', vals: { 'event.type': 'submit', 'event.defaultPrevented': false } }]);
        mk('<code>event.preventDefault()</code> cancels the default action - the browser will <b>not</b> reload the page or navigate. Now <i>we</i> are in control.', 2, 'cur', [{ type: 'vars', vals: { 'event.type': 'submit', 'event.defaultPrevented': true }, hl: { 'event.defaultPrevented': 'ok' } }]);
        mk('<code>new FormData(form)</code> collects every named, enabled control; <code>Object.fromEntries</code> turns it into a plain object. Remember: <b>every value is a string</b> (even the age).', 3, 'cur', [{ type: 'map', label: 'data', entries: names.map(function (n, i) { return [n, vals[i] === '' ? '""' : '"' + vals[i] + '"']; }) }]);
        var bad = 0;
        names.forEach(function (n, i) {
          results[i] = check(i, vals[i]);
          if (results[i]) bad++;
          var hl = {};
          hl[i] = results[i] ? 'bad' : 'ok';
          mk('<code>validate(data)</code> checks <b>' + n + '</b> against its rule (' + rulesTxt[i] + '): ' + (results[i] ? '<span class="c-r">' + results[i] + '</span>.' : '<span class="c-g">valid</span>.'), 4, 'cur', [{ type: 'vars', vals: { 'errors so far': bad } , hl: bad ? { 'errors so far': 'bad' } : {} }], hl);
        });
        var allHl = {};
        results.forEach(function (r, i) { allHl[i] = r ? 'bad' : 'ok'; });
        if (bad) {
          var firstBad = names[results.findIndex(function (r) { return r; })];
          mk('<b>' + bad + ' error' + (bad > 1 ? 's' : '') + '</b> found, so the handler shows each message beside its field, sets <code>aria-invalid="true"</code>, and moves keyboard focus to the first bad field (<b>' + firstBad + '</b>). It then <code>return</code>s - nothing is sent.', 6, 'bad', [{ type: 'vars', vals: { 'form valid?': false, 'focus goes to': firstBad, 'request sent': false }, hl: { 'form valid?': 'bad', 'request sent': 'bad' } }], allHl);
          mk('The user fixes the field and submits again; the same function runs again. (A server must <i>still</i> re-check everything: this client check is only for helping honest users.)', 8, 'cur', [], allHl);
        } else {
          mk('No errors - the check passes for all three fields. The handler skips the early <code>return</code> and calls <code>sendToServer(data)</code> (usually a <code>fetch</code> POST) - ideally with the button disabled while it waits.', 10, 'ok', [{ type: 'vars', vals: { 'form valid?': true, 'request sent': true }, hl: { 'form valid?': 'ok', 'request sent': 'ok' } }], allHl);
          mk('Done. The server will validate the same data again - never trust the browser alone, because anyone can send a request without using your form.', 11, 'cur', [], allHl);
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Why "submit" and not the button\'s "click"',
        html: `<p>Three ways to submit: click Submit, press Enter in a field, or <code>form.requestSubmit()</code>. Only the first one is a real click on the button; Enter only clicks the default submit button for you if the form has one. Listening to <code>submit</code> catches all three (and runs <i>after</i> the browser's built-in validation passed, if the form is not <code>novalidate</code>).</p>${H.table(['User does', 'button <code>click</code> fires?', 'form <code>submit</code> fires?'], [['clicks Submit', 'yes', 'yes'], ['presses Enter in a text field', '<span class="c-y">usually</span> (the browser clicks the default submit button for you, but only if the form has one)', 'yes'], ['code calls <code>form.requestSubmit()</code>', 'no', 'yes (with validation)'], ['code calls <code>form.submit()</code>', 'no', '<span class="c-r">no - skips validation AND the event</span>']])}`,
        code: `form.addEventListener('submit', (e) => {
  e.preventDefault();
  console.log('submitted by:', e.submitter ? e.submitter.name : 'Enter key / script');
});`
      },
      {
        title: 'FormData: checkboxes, radios and multi-selects',
        html: `<p><code>FormData</code> mirrors what the browser would put on the wire. Unchecked checkboxes are <b>absent</b>; a group of checkboxes with the same name gives several entries (use <code>getAll</code>); <code>Object.fromEntries</code> keeps only the <b>last</b> value of a repeated name.</p>${H.table(['HTML', 'FormData result'], [['<code>&lt;input name="news" type="checkbox"&gt;</code> unchecked', '(no "news" key)'], ['same, checked (no value attr)', '<code>news = "on"</code>'], ['two checked <code>name="tag"</code> boxes', '<code>getAll("tag")</code> = ["a", "b"]'], ['radio group, none chosen', '(no key)']])}`,
        code: `const fd = new FormData(document.querySelector('form'));
const tags = fd.getAll('tag');                    // all checked boxes named "tag"
const wantsNews = fd.has('news');                 // true if checked
const plain = Object.fromEntries(fd);             // loses repeated names!
console.log(tags, wantsNews, plain);`
      },
      {
        title: 'Built-in validation attributes at a glance',
        html: `<p>You get a lot for free just by writing HTML. The browser shows a bubble and blocks the submit event, and CSS can react with <code>:invalid</code> / <code>:user-invalid</code> (the latter only after the user has interacted - much nicer than flashing red on page load).</p>${H.table(['Goal', 'Attribute', 'ValidityState flag'], [['must not be empty', '<code>required</code>', '<code>valueMissing</code>'], ['at least 8 characters', '<code>minlength="8"</code>', '<code>tooShort</code>'], ['email shape', '<code>type="email"</code>', '<code>typeMismatch</code>'], ['3 capital letters', '<code>pattern="[A-Z]{3}"</code>', '<code>patternMismatch</code>'], ['number between 1 and 10', '<code>type="number" min="1" max="10"</code>', '<code>rangeUnderflow</code> / <code>rangeOverflow</code>']])}`
      },
      {
        title: 'Debounce the "is this username taken?" check',
        html: `<p>Checking with the server on every keystroke would send a request per letter. Wait until the user pauses (debounce, covered in the last topic), and ignore answers that arrive late (a race). Show a neutral "checking..." state, not an error.</p>`,
        code: `let timer;
username.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const res = await fetch('/api/username-taken?u=' + encodeURIComponent(username.value));
    const { taken } = await res.json();
    username.setCustomValidity(taken ? 'That name is taken' : '');
    username.reportValidity();
  }, 400);
});`
      }
    ],
    deepDive: `<p>🟣 <b>How the browser validates.</b> Each form control has a <b>validity state</b> (an object of booleans) recomputed whenever its value or constraint attributes change. <code>checkValidity()</code> fires an <code>invalid</code> event on each failing control (it does not bubble - use capture to listen on the form). On submit through a button or <code>requestSubmit()</code>, the browser runs "interactive validation": it finds the first invalid control, focuses it and shows a bubble, and <b>does not fire <code>submit</code></b>. With <code>novalidate</code> on the form (or <code>formnovalidate</code> on a button, handy for "Save draft"), that step is skipped and you validate in your own submit handler. The bubble's text and look are browser-controlled; if you want custom design, use <code>novalidate</code> and your own error elements, but keep the semantics (<code>aria-invalid</code>, <code>aria-describedby</code>, a live region such as <code>role="alert"</code> for a summary).</p>
      <p><b>Gotchas worth knowing.</b> <code>type="number"</code> returns <code>""</code> for text it can't parse, shows spinners, and is wrong for things like phone numbers, card numbers and ZIP codes (use <code>type="text" inputmode="numeric"</code>). <code>pattern</code> must match the <i>whole</i> value, needs no slashes, and is ignored for empty values (add <code>required</code>). <code>FormData</code> omits disabled controls, unchecked boxes and unnamed fields, and includes the <b>submit button's own name/value</b> only if you pass it (<code>new FormData(form, submitter)</code>). Use <code>autocomplete</code> tokens (<code>"email"</code>, <code>"new-password"</code>, <code>"one-time-code"</code>) so browsers and password managers fill correctly. <code>form.submit()</code> bypasses validation and the <code>submit</code> event - use <code>requestSubmit()</code>.</p>
      <p><b>Security reality.</b> Client-side validation can be switched off with DevTools or bypassed with <code>curl</code>; the server must re-validate everything, encode output (XSS) and protect state-changing requests (CSRF tokens / SameSite cookies). Never put secrets in hidden fields. <b>UX reality.</b> Validate late, fix early: show errors after <code>blur</code> or submit; after an error exists, re-validate on <code>input</code> so it disappears as soon as it is fixed; keep the user's typed data on error; never clear the whole form. Prefer helpful messages ("Use at least 8 characters") over "Invalid input". Frameworks: in React you keep field values in state (<b>controlled</b> inputs) or use libraries such as React Hook Form + schema validators (Zod) that share the same <code>validate</code> shape on client and server - the same pure function idea from the runnable example above.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> forms are the most common thing AI generates, and it is usually fine on the happy path. Where it shines: realistic test data, regex drafts (you still verify them!), error-message copy, and generating the schema once for client and server. <b>Use AI as a partner:</b> <code>Write 15 tricky test inputs for this signup validator (unicode names, plus-addressed emails, 17.9 as age, trailing spaces) and the expected result for each</code> - then run them through your function.</p>
      <p><b>Where AI goes wrong:</b> over-clever email regexes that reject valid addresses (<code>name+tag@example.co.uk</code>); validation only on the client; listening to the button <code>click</code>; <code>type="number"</code> for phone numbers; trusting <code>parseInt("12abc")</code>; clearing the form on error; no <code>aria-*</code> or focus management; forgetting to disable the button while a request is in flight. <b>What you must still own:</b> the rules themselves (what is actually valid for <i>your</i> product), the server-side check, accessibility of errors, privacy (do not paste real customer data into AI tools), and the habit of testing with keyboard only: Tab, type, Enter.</p>`,
    problems: [
      {
        title: 'Stop the Submit and Validate a Signup Form',
        level: 'Easy', tags: ['forms', 'preventDefault', 'validation', 'FormData'], companies: ['Amazon', 'Paytm', 'Zoho'],
        statement: `<p>A signup form has fields <code>name</code>, <code>email</code> and <code>password</code>, plus an empty <code>&lt;p class="error" data-for="NAME"&gt;</code> under each field. Write <code>setupSignup(form)</code> so that on submit: the page never reloads; each invalid field gets its message in its error paragraph and <code>aria-invalid="true"</code> (valid fields get the message cleared and <code>aria-invalid="false"</code>); keyboard focus goes to the <b>first</b> invalid field; and if everything is valid it calls <code>onValid(data)</code> with a plain object of values. Rules: name ≥ 2 characters after trimming, email looks like <code>a@b.c</code>, password ≥ 8 characters.</p>`,
        constraints: `Do not use alert(). Do not rely on built-in bubbles (the form has <code>novalidate</code>). Values must be read via FormData.`,
        example: `${H.table(['name', 'email', 'password', 'result'], [['Ann', 'ann@example.com', 'secret123', '<span class="c-g">valid → onValid({name:"Ann",...})</span>'], ['A', 'ann@example', 'abc', '<span class="c-r">3 errors; focus on name</span>'], ['Ann', 'ann@example.com', 'abc', '<span class="c-r">1 error (password); focus on password</span>']])}`,
        brute: {
          why: `<p>Listening to the submit button's <code>click</code> and reading each field with <code>getElementById</code>. It is skipped by <code>requestSubmit()</code> and by forms without a submit button (the page reloads), stops at the first error (so users fix one thing at a time), and has no accessibility info.</p>`,
          code: `function setupSignupBrute() {
  document.querySelector('button[type=submit]').addEventListener('click', () => {   // skipped by requestSubmit() and by forms with no submit button
    const name = document.getElementById('name').value;
    if (name.length < 2) { alert('bad name'); return; }                           // alert + first error only
    const email = document.getElementById('email').value;
    if (email.indexOf('@') < 0) { alert('bad email'); return; }
  });
}`
        },
        mcq: { q: 'Which event should you handle so that clicking Submit AND pressing Enter in a field both run your validation?', options: ['submit on the form', 'click on the button', 'keydown on the input', 'change on the form'], answer: 0, explain: 'Both ways of submitting fire a submit event on the form. click only covers the button; keydown would force you to re-implement Enter handling.' },
        hints: [
          `<p>Hint 1: the aha - there is exactly one event for "the user wants to send the form": <code>submit</code> on the <code>form</code> element.</p>`,
          `<p>Hint 2: put the rules in a pure function <code>validate(data)</code> that returns an object like <code>{ email: "..." }</code>. Show all errors at once, then focus the first bad field.</p>`,
          `<p>Hint 3: recipe - <code>preventDefault()</code>; <code>data = Object.fromEntries(new FormData(form))</code>; <code>errors = validate(data)</code>; loop over <code>["name","email","password"]</code>: set the error paragraph text and <code>aria-invalid</code>; <code>form.elements[firstBadName].focus()</code>; if no errors call <code>onValid(data)</code>. Edge cases: whitespace-only name, missing fields (undefined), focusing only the first.</p>`
        ],
        solution: {
          approach: `<p>A pure <code>validate</code> returns a map of field → message. The handler renders the messages for every field (clearing old ones), focuses the first failing field in form order, and only calls <code>onValid</code> when the map is empty.</p>`,
          code: `function validate(data) {
  const errors = {};
  if (String(data.name || '').trim().length < 2) errors.name = 'Name needs at least 2 letters.';
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(data.email || '').trim())) errors.email = 'Enter a valid email.';
  if (String(data.password || '').length < 8) errors.password = 'Password needs at least 8 characters.';
  return errors;
}

function setupSignup(form, onValid) {
  const fields = ['name', 'email', 'password'];
  form.addEventListener('submit', (event) => {
    event.preventDefault();                                    // never reload
    const data = Object.fromEntries(new FormData(form));
    const errors = validate(data);

    for (const f of fields) {
      const message = errors[f] || '';
      form.querySelector('[data-for="' + f + '"]').textContent = message;   // '' clears
      form.elements[f].setAttribute('aria-invalid', message ? 'true' : 'false');
    }
    const firstBad = fields.find((f) => errors[f]);
    if (firstBad) {
      form.elements[firstBad].focus();                         // only the first
      return;
    }
    onValid(data);
  });
}`,
          complexity: `<p>O(F) per submit for F fields (a handful), plus O(length) for the regex. No listeners except one <code>submit</code>.</p>`,
          followUps: ['Add live re-validation on <code>input</code> only for fields that already show an error.', 'Add "confirm password" using setCustomValidity.', 'Share the same validate() with a Node server.']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 8 — Custom events, event emitter, debounce & throttle
     ====================================================================== */
  topics.push({
    title: 'Custom Events, Event Emitter, Debounce & Throttle',
    analogy: `<p><b>Event emitter = a newsletter.</b> Readers <i>subscribe</i> (<code>on</code>), the publisher sends an issue (<code>emit</code>) and every subscriber gets it; readers can unsubscribe (<code>off</code>), and some only want the first issue (<code>once</code>). The publisher never needs to know who the readers are - that is why it keeps big programs tidy.</p>
      <p><b>Debounce = an elevator door.</b> Every time someone walks up, the door waits a few more seconds before closing. It only closes after a <i>quiet moment</i> with nobody arriving. <b>Throttle = a turnstile</b> that lets in at most one person per second, however big the crowd. Typing in a search box is a crowd of keystrokes; you want to search once the person <i>pauses</i> (debounce), and a scroll handler should run at a steady, limited pace (throttle).</p>`,
    explain: `<p>🟢 <b>Why custom events?</b> The browser's built-in events (click, input) come from users. Your own code often needs the same idea: "the cart changed", "the dialog closed", "a user logged in" - and several unrelated parts of the page want to react. If the cart code calls the header code directly, they are glued together forever. With events, the cart just <b>announces</b> and anyone may <b>listen</b>.</p>
      <p>🔵 <b>Two ways to do it.</b></p>
      ${H.table(['Way', 'Looks like', 'Good for'], [
        ['DOM <code>CustomEvent</code>', '<code>el.dispatchEvent(new CustomEvent("cart:add", { detail: { id: 7 }, bubbles: true }))</code> and <code>el.addEventListener("cart:add", ...)</code>', 'UI components in the DOM tree - the event bubbles like a click, so delegation works'],
        ['Your own <b>EventEmitter</b> (pub/sub)', '<code>bus.on("login", fn)</code> · <code>bus.emit("login", user)</code>', 'logic that has no DOM element: stores, services, tests, Node.js']
      ])}
      <p>A tiny emitter is just a <b>map from event name to an ordered list of functions</b>: <code>on</code> pushes, <code>off</code> removes, <code>once</code> pushes and removes itself after the first call, <code>emit</code> loops and calls. You will build one in the guided problem. The first visualizer shows exactly that map changing.</p>
      <p>🔵 <b>Rate-limiting noisy events.</b> Some events fire like a machine gun: <code>input</code> (every key), <code>scroll</code>, <code>resize</code>, <code>pointermove</code>. Running heavy work on each one freezes the page or hammers the server. Two classic tools:</p>
      ${H.table(['Tool', 'Rule', 'Use for', 'Example with wait = 300 ms'], [
        ['<b>Debounce</b>', 'run <b>after</b> things go quiet for <code>wait</code> ms; every new call restarts the timer', 'search-as-you-type, autosave, "window finished resizing", validating a username', 'keys at 0, 100, 200 → runs once at <b>500</b>'],
        ['<b>Throttle</b>', 'run <b>at most once</b> per <code>wait</code> ms, at a steady pace', 'scroll position, mousemove, drag, resize animations, button spam', 'keys at 0, 100, 200, 350 → runs at <b>0</b> and <b>350</b>']
      ])}
      <p>Watch the second visualizer: the same keystroke times are fed to a debounce and to a throttle, and you can see how many real calls survive. Variations: <b>leading</b> (run immediately on the first call, then ignore), <b>trailing</b> (run at the end), and <code>cancel()</code>/<code>flush()</code> helpers.</p>`,
    clues: [
      '"Implement an EventEmitter / pub-sub with on, off, once, emit" → map of event → array of listeners',
      '"Decouple components that need to react to the same thing" → custom events / event bus',
      '"Search as the user types but do not call the API on every keystroke" → debounce (+ cancel stale requests)',
      '"Run a handler on scroll/resize/mousemove without jank" → throttle (or requestAnimationFrame)',
      '"Implement debounce / throttle from scratch" (top frontend question) → closures + <code>setTimeout</code>/<code>clearTimeout</code> or timestamps',
      '"Prevent double submit on button click" → leading-edge debounce/throttle or disable the button',
      '"Results appear in the wrong order" → race condition: ignore responses for old queries'
    ],
    code: [
      { lang: 'js', title: 'DOM CustomEvent: announce, bubble, listen high up', code: `// Cart component announces; it knows nothing about the header.
function addToCart(buttonEl, product) {
  buttonEl.dispatchEvent(new CustomEvent('cart:add', {
    detail: { id: product.id, qty: 1 },   // your payload lives in event.detail
    bubbles: true,                         // so a listener on document can catch it
    cancelable: true                       // so listeners may call preventDefault() ("no, stop")
  }));
}

// Header badge listens anywhere above.
let count = 0;
document.addEventListener('cart:add', (event) => {
  count += event.detail.qty;
  document.querySelector('.badge').textContent = String(count);
});` },
      { lang: 'js', run: true, title: 'Run it: a simple EventEmitter (on / off / once / emit)', code: `class Emitter {
  constructor() { this.map = new Map(); }            // event name -> array of listeners
  on(event, fn) {
    if (!this.map.has(event)) this.map.set(event, []);
    this.map.get(event).push({ fn, once: false });
    return () => this.off(event, fn);                // handy "unsubscribe" function
  }
  once(event, fn) {
    if (!this.map.has(event)) this.map.set(event, []);
    this.map.get(event).push({ fn, once: true });
    return () => this.off(event, fn);
  }
  off(event, fn) {
    const list = this.map.get(event) || [];
    const i = list.map((l) => l.fn).lastIndexOf(fn); // remove the most recently added copy
    if (i >= 0) list.splice(i, 1);
    return this;
  }
  emit(event, ...args) {
    const list = this.map.get(event);
    if (!list || !list.length) return false;
    for (const l of list.slice()) {                  // copy: safe if a listener adds/removes listeners
      if (l.once) this.off(event, l.fn);             // remove BEFORE calling, so it cannot run twice
      l.fn(...args);
    }
    return true;
  }
}

const bus = new Emitter();
const hello = (name) => console.log('hello,', name);
bus.on('greet', hello);
bus.once('greet', (name) => console.log('first-time bonus for', name));
console.log('emit 1 ->', bus.emit('greet', 'Ann'));  // hello + bonus -> true
console.log('emit 2 ->', bus.emit('greet', 'Ben'));  // only hello    -> true
bus.off('greet', hello);
console.log('emit 3 ->', bus.emit('greet', 'Cy'));   // nobody        -> false` },
      { lang: 'js', run: true, title: 'Run it: debounce and throttle (real timers, tiny waits)', code: `function debounce(fn, wait) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);                              // every new call cancels the pending one...
    timer = setTimeout(() => fn.apply(this, args), wait); // ...and starts a fresh countdown
  };
}

function throttle(fn, wait) {
  let last = -Infinity;
  return function (...args) {
    const now = Date.now();
    if (now - last >= wait) { last = now; fn.apply(this, args); } // leading edge: run now, then ignore until wait passes
  };
}

const t0 = Date.now();
const stamp = () => String(Date.now() - t0).padStart(3, ' ') + 'ms';
const search = debounce((q) => console.log('debounced search("' + q + '") at ~' + Math.round((Date.now() - t0) / 10) * 10 + 'ms'), 60);
const onScroll = throttle((y) => console.log('throttled scroll', y), 50);

// keystrokes at 0, 20, 40 (all within 60ms of each other) then a long pause, then one more at 200
['r', 're', 'rea'].forEach((q, i) => setTimeout(() => search(q), i * 20));
setTimeout(() => search('react'), 200);
// scroll events every 10ms for 120ms
for (let i = 0; i <= 12; i++) setTimeout(() => onScroll(i * 10), i * 10);` }
    ],
    viz: [
      {
        title: 'An event emitter\'s notebook: on, once, off, emit',
        input: 'on:save once:save emit:save emit:save off:save emit:save',
        inputLabel: 'Operations (max 10): on:name  once:name  off:name  emit:name. Example: on:save once:save emit:save emit:save off:save emit:save',
        gen: function (input) {
          var ops = words(input, 'on:save');
          if (ops.length < 2 || ops.length > 10) throw new Error('Give 2 to 10 operations like on:save emit:save');
          var reg = {}, n = 0, frames = [], log = [];
          ops.forEach(function (o) { if (!/^(on|once|off|emit):[A-Za-z0-9_-]{1,10}$/.test(o)) throw new Error('Bad operation "' + o + '". Use on:name, once:name, off:name or emit:name'); });
          function entries() {
            var e = Object.keys(reg).filter(function (k) { return reg[k].length; }).map(function (k) { return [k, reg[k].map(function (h) { return h.name + (h.once ? ' (once)' : ''); }).join(', ')]; });
            return e.length ? e : [['(empty)', '-']];
          }
          function snap(narr, ev, called, cls) {
            var parts = [{ type: 'map', label: 'emitter.map (event → listeners in order)', entries: entries(), hl: ev ? one(ev, cls || 'cur') : {} }];
            if (called) parts.push({ type: 'queue', label: 'Listeners called by this emit (in order)', items: called.length ? called : ['(nobody was listening)'], frontLabel: 'first', backLabel: 'last' });
            parts.push({ type: 'table', label: 'Operations so far', columns: ['#', 'operation', 'result'], rows: log.map(function (r) { return r.slice(); }), hl: log.length ? one(log.length - 1, 'cur') : {} });
            frames.push({ narr: narr, parts: parts });
          }
          frames.push({ narr: 'A brand-new emitter: its map is empty. Think of it as a notebook with one page per event name; each page lists the functions to call, in order.', parts: [{ type: 'map', label: 'emitter.map', entries: [['(empty)', '-']] }, { type: 'text', html: 'Operations we will run: <code>' + esc(ops.join('  ')) + '</code>' }] });
          ops.forEach(function (o, i) {
            var kind = o.split(':')[0], ev = o.split(':')[1];
            if (kind === 'on' || kind === 'once') {
              n++;
              (reg[ev] = reg[ev] || []).push({ name: 'h' + n, once: kind === 'once' });
              log.push([i + 1, o, 'added h' + n + (kind === 'once' ? ' (auto-removes after first call)' : '')]);
              snap('<code>' + kind + '("' + ev + '", h' + n + ')</code> appends <b>h' + n + '</b> to the list for <b>' + ev + '</b>.' + (kind === 'once' ? ' It is marked <i>once</i>: it will delete itself the first time it runs.' : ' It will run on every emit until removed.'), ev, null, 'ok');
            } else if (kind === 'off') {
              var list = reg[ev] || [];
              if (list.length) { var gone = list.pop(); log.push([i + 1, o, 'removed ' + gone.name]); snap('<code>off("' + ev + '", ' + gone.name + ')</code> removes the most recently added copy: <b>' + gone.name + '</b> will not be called any more.', ev, null, 'bad'); }
              else { log.push([i + 1, o, 'nothing to remove']); snap('<code>off("' + ev + '")</code> but nobody is registered for that event, so nothing happens (and it must not crash).', ev, null, 'bad'); }
            } else {
              var cur = (reg[ev] || []).slice();
              var names = cur.map(function (h) { return h.name; });
              reg[ev] = (reg[ev] || []).filter(function (h) { return !h.once; });
              log.push([i + 1, o, cur.length ? 'called ' + names.join(' → ') : 'returned false (no listeners)']);
              snap('<code>emit("' + ev + '")</code> loops over a <b>copy</b> of the list and calls each function in order: ' + (cur.length ? '<b>' + names.join(' → ') + '</b>.' : 'nobody is listening, returns <code>false</code>.') + (cur.some(function (h) { return h.once; }) ? ' Listeners registered with <code>once</code> were removed just before running, so the next emit skips them.' : ''), ev, names, 'cur');
            }
          });
          snap('Recap: <b>on</b> pushes, <b>once</b> pushes a self-removing entry, <b>off</b> removes one copy, <b>emit</b> calls a snapshot of the list in order. Why a copy? A listener may call <code>on</code>/<code>off</code> while we are looping - changing the array mid-loop would skip or repeat listeners.', null, null);
          return frames;
        }
      },
      {
        title: 'Debounce vs throttle on the same keystrokes',
        input: '300: 0 100 200 700 750 1500',
        inputLabel: 'wait in ms, a colon, then keystroke times in ms (max 10). Example: "300: 0 100 200 700 750 1500"',
        gen: function (input) {
          var s = String(input === undefined ? '300: 0 100 200 700 750 1500' : input);
          var ix = s.indexOf(':');
          if (ix < 0) throw new Error('Format:  wait: time time time   e.g.  300: 0 100 200 700');
          var wait = parseInt(s.slice(0, ix), 10);
          var times = words(s.slice(ix + 1), '').map(Number);
          if (isNaN(wait) || wait < 20 || wait > 2000) throw new Error('wait must be a number from 20 to 2000');
          if (times.length < 2 || times.length > 10 || times.some(function (t) { return isNaN(t) || t < 0 || t > 100000; })) throw new Error('Give 2 to 10 keystroke times (ms, 0 to 100000)');
          times.sort(function (a, b) { return a - b; });
          var K = times.length;
          // events: keystroke i at times[i]; debounce fire after keystroke i if next >= due
          var deb = [], thr = [], last = null;
          for (var i = 0; i < K; i++) {
            var due = times[i] + wait;
            deb.push({ due: due, fires: i === K - 1 || times[i + 1] >= due });
            var fire = last === null || times[i] - last >= wait;
            if (fire) last = times[i];
            thr.push(fire);
          }
          var rows = times.map(function (t, i) { return [i + 1, t, '-', '-']; });
          var frames = [], dCalls = 0, tCalls = 0, rawCalls = 0;
          function table(hlRow) { return { type: 'table', label: 'Each keystroke: what do debounce and throttle do with it?', columns: ['#', 'time (ms)', 'debounce(' + wait + ')', 'throttle(' + wait + ')'], rows: rows.map(function (r) { return r.slice(); }), hl: hlRow === null || hlRow === undefined ? {} : one(hlRow, 'cur') }; }
          function vars(now) { return { type: 'vars', vals: { now: now + ' ms', 'raw calls': rawCalls, 'debounced runs': dCalls, 'throttled runs': tCalls }, hl: {} }; }
          frames.push({ narr: 'The user types ' + K + ' keystrokes at these times (ms). Each one calls our handler. <b>Debounce(' + wait + ')</b> will wait for ' + wait + ' ms of silence; <b>throttle(' + wait + ')</b> allows one run per ' + wait + ' ms window.', parts: [{ type: 'array', label: 'keystroke times (ms)', values: times }, table(null), vars(0)] });
          // chronological: keystroke i, then fire (if debounce fires) before keystroke i+1
          var pending = -1;
          for (i = 0; i < K; i++) {
            rawCalls++;
            var msg = '<b>Keystroke ' + (i + 1) + ' at ' + times[i] + ' ms.</b> ';
            if (pending >= 0) { rows[pending][2] = 'cancelled (restarted)'; msg += 'Debounce: the old timer is <span class="c-r">cancelled</span> and a new one starts. '; }
            else msg += 'Debounce: starts a timer. ';
            rows[i][2] = 'timer → ' + deb[i].due;
            pending = i;
            if (thr[i]) { tCalls++; rows[i][3] = 'RUNS'; msg += 'Throttle: more than ' + wait + ' ms since the last run, so it <span class="c-g">runs now</span>.'; }
            else { rows[i][3] = 'ignored'; msg += 'Throttle: still inside the window, <span class="c-r">ignored</span>.'; }
            frames.push({ narr: msg, parts: [table(i), vars(times[i])] });
            if (deb[i].fires) {
              dCalls++;
              rows[i][2] = 'RUNS at ' + deb[i].due;
              pending = -1;
              frames.push({ narr: '<b>' + deb[i].due + ' ms:</b> ' + wait + ' ms passed with no new keystroke - the debounce timer fires and the real function <span class="c-g">runs once</span> (with the latest value).', parts: [table(i), vars(deb[i].due)] });
            }
          }
          frames.push({
            narr: 'Result: <b>' + K + '</b> raw calls became <b>' + dCalls + '</b> debounced run' + (dCalls === 1 ? '' : 's') + ' (after pauses) and <b>' + tCalls + '</b> throttled run' + (tCalls === 1 ? '' : 's') + ' (steady pace). Debounce = "when they stop"; throttle = "no faster than".',
            parts: [{ type: 'table', label: 'Summary', columns: ['strategy', 'real runs', 'best for'], rows: [['no limiting', K, '-'], ['debounce(' + wait + ')', dCalls, 'search box, autosave, resize end'], ['throttle(' + wait + ')', tCalls, 'scroll, mousemove, drag']], hl: { 1: 'ok', 2: 'sel' } }]
          });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Search-as-you-type: debounce plus "ignore stale answers"',
        html: `<p>Debounce reduces requests, but two problems remain: the user may type more while a request is in flight, and an <i>older</i> response may arrive <i>after</i> a newer one and overwrite it. Cancel the previous request with <code>AbortController</code> (best, also saves the server) or compare a counter before rendering.</p>`,
        code: `let controller;
const run = debounce(async (query) => {
  controller?.abort();                                  // cancel the previous request if still running
  controller = new AbortController();
  try {
    const res = await fetch('/api/search?q=' + encodeURIComponent(query), { signal: controller.signal });
    renderResults(await res.json());
  } catch (err) {
    if (err.name !== 'AbortError') showError(err);      // aborting is normal, not an error
  }
}, 300);
document.querySelector('#q').addEventListener('input', (e) => {
  const q = e.target.value.trim();
  if (q) run(q); else { controller?.abort(); clearResults(); }
});
function debounce(fn, wait) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; }
function renderResults(items) { console.log(items); }
function showError(err) { console.error(err); }
function clearResults() { console.log('cleared'); }`
      },
      {
        title: 'Throttle a scroll handler (and when to prefer requestAnimationFrame)',
        html: `<p>For visual updates (parallax, "reading progress" bar), the best throttle is <b>one run per frame</b> via <code>requestAnimationFrame</code>: the browser calls you right before it paints, at most once per frame, and pauses it in hidden tabs. For non-visual work (analytics pings) use a time-based throttle.</p>`,
        code: `let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;                  // a frame is already scheduled
  ticking = true;
  requestAnimationFrame(() => {
    const pct = window.scrollY / (document.documentElement.scrollHeight - innerHeight);
    document.querySelector('.progress').style.width = (pct * 100).toFixed(1) + '%';
    ticking = false;
  });
}, { passive: true });`
      },
      {
        title: 'Event bus decoupling a cart and a header',
        html: `<p>Without events: <code>cart.js</code> imports the header and calls <code>header.updateBadge(3)</code>, and the header imports the cart for the reverse... a tangle. With an emitter: cart emits <code>"cart:changed"</code>; header, analytics and a toast each subscribe on their own. Adding a fourth listener touches no existing file. The cost: it is harder to <i>find</i> who reacts to what (use naming conventions and one file listing event names), and every subscription needs a matching unsubscribe.</p>`,
        code: `const bus = new Emitter();           // the class from the runnable example above
// header.js
const off = bus.on('cart:changed', (items) => { badge.textContent = String(items.length); });
// cart.js
function addItem(item) { items.push(item); bus.emit('cart:changed', items); }
// when the header is destroyed:
off();                               // never forget to unsubscribe (leak!)
class Emitter { constructor() { this.m = new Map(); } on(e, f) { (this.m.get(e) || this.m.set(e, []).get(e)).push(f); return () => this.m.set(e, this.m.get(e).filter((x) => x !== f)); } emit(e, ...a) { (this.m.get(e) || []).slice().forEach((f) => f(...a)); } }
const badge = { textContent: '' }; const items = [];`
      },
      {
        title: 'Leading edge: stop double-clicks on "Pay now"',
        html: `<p>A normal (trailing) debounce would make the user wait before anything happens - bad for a payment button. A <b>leading</b> debounce runs the function <i>immediately</i> on the first click, then ignores further clicks until things have been quiet for <code>wait</code>. (Even better: also disable the button while the request is pending.)</p>`,
        code: `function debounceLeading(fn, wait) {
  let timer = null;
  return function (...args) {
    const callNow = timer === null;              // first call in a burst?
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; }, wait);   // quiet period restarts every click
    if (callNow) fn.apply(this, args);
  };
}
const pay = debounceLeading(() => console.log('charging card...'), 1000);
pay(); pay(); pay();    // only the first prints`
      }
    ],
    deepDive: `<p>🟣 <b>Implementing debounce correctly.</b> The 6-line version above is enough for most interviews, but production versions (Lodash) handle: preserving <code>this</code> and the <b>latest</b> arguments; <code>leading</code>/<code>trailing</code> options; <code>cancel()</code> (drop the pending call - call it in cleanup!), <code>flush()</code> (run now - e.g. on page <code>blur</code> to save), and <code>maxWait</code> (guarantee a run at least every N ms even during endless typing, which makes it behave like throttle+debounce). A classic bug: creating the debounced function <b>inside</b> a React render or an event handler, so every call gets a fresh timer and nothing is ever debounced. Create it once (<code>useMemo</code>/<code>useRef</code>, or module scope).</p>
      <p><b>Throttle designs.</b> Timestamp style (above): leading edge, no timers, may drop the last event. Timer style: schedule a trailing run so the <i>final</i> position is never lost (important for scroll end / resize end). Lodash <code>throttle</code> does both. For animation, <code>requestAnimationFrame</code> wins; for background work, <code>requestIdleCallback</code>; for scheduling priorities, <code>scheduler.postTask</code>. Timers are <b>not precise</b>: browsers clamp nested <code>setTimeout</code> to ≥4 ms and throttle timers in background tabs to ~1 s or worse, so never use them as clocks - compare <code>performance.now()</code> or <code>Date.now()</code> values.</p>
      <p><b>EventTarget and Emitter details.</b> In modern browsers and Node you can <code>extends EventTarget</code> and use the same <code>addEventListener</code>/<code>dispatchEvent</code> API (with <code>CustomEvent</code>) for your own classes - cheap and familiar. Node's <code>EventEmitter</code> differs: emitting <code>"error"</code> with no listener throws; adding more than 10 listeners per event prints a "possible memory leak" warning (<code>setMaxListeners</code>); listeners run <b>synchronously</b> in registration order (so a slow listener blocks the emitter). The DOM spec skips a listener that was removed earlier in the <i>same</i> dispatch; Node copies the array first so a removed listener still runs this round - decide your semantics and document them. Other things to decide: async vs sync emit, whether one throwing listener should stop the rest (catch and report each separately), wildcard events (<code>"cart:*"</code>), and typed payloads in TypeScript (<code>Emitter&lt;{ login: [User]; logout: [] }&gt;</code>).</p>
      <p><b>Memory leaks.</b> A subscriber that is never removed keeps its closure (and everything it references, such as a destroyed component) alive. Return an unsubscribe function from <code>on</code>, tie it to a lifecycle (<code>useEffect</code> cleanup, <code>AbortSignal</code>), and watch listener counts in DevTools. <b>Pub/sub vs observer:</b> observer = subject holds the list and listeners know the subject; pub/sub = a broker (the bus) sits between, and publisher/subscriber never meet. Redux, RxJS, <code>BroadcastChannel</code> and DOM events are all variations on this theme.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "write debounce" and "write an event emitter" are things AI produces perfectly in seconds - which is exactly why interviewers now push on the <b>edge cases</b> and on <b>why</b>. Treat generated code as a first draft to be interrogated.</p>
      <p><b>Use AI as a partner:</b> ask for a test table (<code>Give me 10 timeline cases for debounce with leading and trailing options and the expected call times</code>) and run it; ask it to find memory leaks in a component that subscribes to a bus; ask for a lighter alternative (<code>Can I replace this event bus with EventTarget or a signal?</code>). <b>Where AI goes wrong:</b> debounces inside render; forgets <code>cancel</code> on unmount; loses <code>this</code> with arrow functions in the wrong place; mutates the listener array while emitting; mixes up debounce and throttle in explanations; calls <code>fetch</code> on every keystroke "for freshness"; omits stale-response handling. <b>What you must still own:</b> choosing the right tool (wait for quiet vs steady pace), the timeline reasoning (draw it like the visualizer!), lifecycle cleanup, and measuring - open the Network tab and count the requests.</p>`,
    problems: [
      {
        title: 'Build an EventEmitter (on, off, once, emit)',
        level: 'Medium', tags: ['event emitter', 'pub/sub', 'closures', 'machine coding'], companies: ['Amazon', 'Uber', 'Atlassian', 'Meta'],
        statement: `<p>Implement a class <code>EventEmitter</code> with:</p>
          <ul><li><code>on(event, fn)</code> - subscribe; returns an <b>unsubscribe function</b>.</li><li><code>once(event, fn)</code> - subscribe for a single call only.</li><li><code>off(event, fn)</code> - remove one registration of <code>fn</code> (the most recently added); no error if it is not there.</li><li><code>emit(event, ...args)</code> - call listeners in registration order with the args; returns <code>true</code> if there was at least one listener, else <code>false</code>.</li></ul>
          <p>It must be safe when a listener adds or removes listeners <b>during</b> an emit, and a <code>once</code> listener must never run twice, even if it emits the same event again.</p>`,
        constraints: `Up to 10<sup>4</sup> listeners per event. Events are strings. Listener order = registration order.`,
        example: `${H.table(['Calls', 'Output / result'], [['on("a", f1); once("a", f2); emit("a", 1)', 'f1(1), f2(1) → <code>true</code>'], ['emit("a", 2)', 'f1(2) only → <code>true</code> (f2 removed itself)'], ['off("a", f1); emit("a", 3)', 'nothing → <code>false</code>'], ['f1 calls <code>off("a", f1)</code> while running', 'f1 finishes; later listeners still run this round']])}`,
        brute: {
          why: `<p>Storing a single callback per event (<code>emitter.handlers[event] = fn</code>) is the beginner version: a second <code>on</code> silently replaces the first, so you cannot have two subscribers; and there is no <code>off</code>. Looping over the live array while listeners mutate it also skips entries.</p>`,
          code: `class EmitterBrute {
  constructor() { this.handlers = {}; }
  on(event, fn) { this.handlers[event] = fn; }                  // overwrites the previous listener!
  emit(event, ...args) { if (this.handlers[event]) this.handlers[event](...args); }
}`
        },
        mcq: { q: 'Why does emit loop over a COPY (slice) of the listener array?', options: ['A listener may call on/off during emit; changing the array mid-loop would skip or repeat listeners', 'Because arrays cannot be looped twice', 'To make emit asynchronous', 'To sort listeners by name'], answer: 0, explain: 'If a listener removes itself (like once does) while we iterate the same array, indexes shift and the next listener is skipped. A snapshot makes the round predictable.' },
        hints: [
          `<p>Hint 1: the aha - an emitter is just a <code>Map</code> from event name to an <b>ordered array</b> of listener records.</p>`,
          `<p>Hint 2: store records <code>{ fn, once }</code>. For <code>once</code>, remove the record <b>before</b> calling it so a re-entrant emit can't run it twice. Loop over <code>list.slice()</code>.</p>`,
          `<p>Hint 3: recipe - <code>on</code>: get-or-create the array, push, return <code>() =&gt; off(...)</code>. <code>off</code>: find the last record with that <code>fn</code>, splice it. <code>emit</code>: if no array or empty return false; snapshot; for each record: if flagged removed skip; if once remove it; call. Mark removed records with a flag so a listener removed by an earlier listener in the same round is skipped.</p>`
        ],
        solution: {
          approach: `<p>A Map of arrays of <code>{ fn, once, removed }</code> records. Removing by <b>record identity</b> (not by function) means a function registered both with <code>on</code> and <code>once</code> behaves correctly. A <code>removed</code> flag makes DOM-like semantics: a listener removed earlier in the same round is skipped.</p>`,
          code: { lang: 'js', run: true, code: `class EventEmitter {
  constructor() { this.map = new Map(); }

  _add(event, fn, once) {
    if (typeof fn !== 'function') throw new TypeError('listener must be a function');
    if (!this.map.has(event)) this.map.set(event, []);
    const record = { fn, once, removed: false };
    this.map.get(event).push(record);
    return record;
  }
  _remove(event, record) {
    const list = this.map.get(event);
    if (!list) return;
    const i = list.indexOf(record);
    if (i >= 0) list.splice(i, 1);
    record.removed = true;
    if (!list.length) this.map.delete(event);      // do not keep empty lists forever
  }

  on(event, fn)   { const r = this._add(event, fn, false); return () => this._remove(event, r); }
  once(event, fn) { const r = this._add(event, fn, true);  return () => this._remove(event, r); }

  off(event, fn) {
    const list = this.map.get(event);
    if (!list) return this;
    for (let i = list.length - 1; i >= 0; i--) {   // most recently added copy first
      if (list[i].fn === fn) { this._remove(event, list[i]); break; }
    }
    return this;
  }

  emit(event, ...args) {
    const list = this.map.get(event);
    if (!list || !list.length) return false;
    for (const record of list.slice()) {           // snapshot
      if (record.removed) continue;                // removed by an earlier listener this round
      if (record.once) this._remove(event, record);// remove BEFORE calling: no double run
      record.fn(...args);
    }
    return true;
  }
}

const e = new EventEmitter();
const f1 = (x) => console.log('f1', x);
e.on('a', f1);
e.once('a', (x) => console.log('f2 (once)', x));
console.log(e.emit('a', 1));   // f1 1, f2 (once) 1, true
console.log(e.emit('a', 2));   // f1 2, true
const stop = e.on('a', () => console.log('temp'));
stop();                        // unsubscribe via returned function
e.off('a', f1);
console.log(e.emit('a', 3));   // false
console.log(e.emit('nobody')); // false` },
          complexity: `<p><code>on</code>/<code>once</code> O(1). <code>off</code> and <code>emit</code> O(L) for L listeners on that event (a snapshot copy plus the calls). Space O(total listeners).</p>`,
          followUps: ['Add a wildcard event <code>"*"</code> that receives every emit.', 'Add <code>emitAsync</code> that awaits listeners one by one.', 'What should happen when a listener throws? Make one bad listener not break the rest.']
        }
      },
      {
        title: 'Debounced Search Input Handler (with stale-response guard)',
        level: 'Medium', tags: ['debounce', 'async', 'race condition', 'closures'], companies: ['Google', 'Flipkart', 'Meesho', 'Microsoft'],
        statement: `<p>Write <code>createSearchHandler({ search, render, wait })</code> that returns <code>{ onInput(text), cancel() }</code>. <code>onInput</code> is called on every keystroke. Rules: (1) call <code>search(query)</code> (returns a Promise of results) only after <code>wait</code> ms with no new keystroke, using the <b>latest</b> text; (2) if the trimmed text is empty, do not search - call <code>render([])</code> immediately and invalidate anything pending; (3) if an older request finishes <b>after</b> a newer one was started, its result must be thrown away (never render stale data); (4) <code>cancel()</code> drops the pending timer and any in-flight result.</p>`,
        constraints: `Typing bursts of up to 100 keystrokes per second; search latency varies per request (older requests can be slower).`,
        example: `${H.table(['time', 'event', 'what happens'], [['0 ms', 'type "rea"', 'timer set for 30 ms'], ['20 ms', 'type "reac"', '<span class="c-r">timer reset</span>; now due at 50 ms'], ['50 ms', 'quiet', 'search("reac") starts (fast, 10 ms)'], ['60 ms', 'search("reac") returns', 'render ✔']])}<p>If "rea" had been searched earlier and returns <i>after</i> "reac", it is discarded because its request id is no longer the latest.</p>`,
        brute: {
          why: `<p>Call <code>search</code> on every keystroke: with a 5-letter word that is 5 requests, most of them wasted. Worse, there is no ordering protection: a slow response for "re" can arrive after the response for "react" and overwrite the correct results with outdated ones.</p>`,
          code: `function createSearchHandlerBrute({ search, render }) {
  return {
    async onInput(text) {
      const results = await search(text);   // one request per keystroke, no ordering guard
      render(results);                       // a late, stale response overwrites newer results
    },
    cancel() {}
  };
}`
        },
        mcq: { q: 'Which pairing solves "too many requests" AND "out-of-order responses"?', options: ['Debounce the call, and give each request an id so only the latest may render', 'Throttle the input and keep the first response', 'Use setInterval to poll the server', 'Call preventDefault on the input event'], answer: 0, explain: 'Debounce cuts the number of requests. A request counter (or AbortController) makes sure an old response can never replace a newer one.' },
        hints: [
          `<p>Hint 1: the aha - two separate problems: <b>when</b> to search (wait for quiet: debounce) and <b>which answer to show</b> (only the newest request).</p>`,
          `<p>Hint 2: keep one <code>timer</code> and one counter <code>latest</code>. Every keystroke clears the timer. When the timer fires, do <code>const mine = ++latest</code>; after <code>await search</code> only render if <code>mine === latest</code>.</p>`,
          `<p>Hint 3: recipe - <code>onInput(text)</code>: <code>clearTimeout(timer)</code>; if text.trim() is empty: <code>latest++</code> (invalidate), <code>render([])</code>, return. Else <code>timer = setTimeout(run, wait)</code>. <code>cancel()</code>: <code>clearTimeout</code> and <code>latest++</code>. Wrap the await in try/catch so a failing search does not leave an unhandled rejection.</p>`
        ],
        solution: {
          approach: `<p>A closure holds <code>timer</code> and a monotonically increasing <code>latest</code> id. The timer implements debounce; the id implements "latest wins". Incrementing <code>latest</code> on empty input and on <code>cancel()</code> invalidates everything in flight without needing to cancel the network call (use an <code>AbortController</code> as well in real code to save bandwidth).</p>`,
          code: { lang: 'js', run: true, code: `function createSearchHandler({ search, render, wait }) {
  let timer = null;
  let latest = 0;                                   // id of the newest request

  async function run(query) {
    const mine = ++latest;                          // this request's ticket
    try {
      const results = await search(query);
      if (mine !== latest) return;                  // someone newer started: drop this answer
      render(results, query);
    } catch (err) {
      if (mine === latest) console.log('search failed for', query);
    }
  }

  return {
    onInput(text) {
      clearTimeout(timer);                          // debounce: restart the countdown
      const query = String(text).trim();
      if (!query) { latest++; render([], ''); return; }   // empty: clear + invalidate pending
      timer = setTimeout(() => run(query), wait);
    },
    cancel() { clearTimeout(timer); latest++; }
  };
}

// Simulation: "rea" is slow (80 ms), "reac" is fast (10 ms) -> the slow one arrives LATER and must be dropped.
const search = (q) => new Promise((resolve) => setTimeout(() => { console.log('  server answered for "' + q + '"'); resolve([q + '-result']); }, q.length === 3 ? 80 : 10));
const handler = createSearchHandler({ search, wait: 30, render: (r, q) => console.log('RENDER', r) });

handler.onInput('r');                                   // t=0
setTimeout(() => handler.onInput('re'), 10);            // t=10  (resets timer)
setTimeout(() => handler.onInput('rea'), 20);           // t=20  (resets timer) -> searches "rea" at t=50
setTimeout(() => handler.onInput('reac'), 60);          // t=60  -> searches "reac" at t=90, answers t=100
setTimeout(() => handler.onInput('   '), 400);          // t=400 -> empty: render [] immediately` },
          complexity: `<p>O(1) work per keystroke (clear + set a timer). At most one search per quiet period. Space O(1).</p>`,
          followUps: ['Cancel the in-flight network request with <code>AbortController</code>.', 'Cache results per query so retyping a word is instant.', 'Add a minimum length of 2 and a "loading" state.']
        }
      }
    ]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Dark Mode Toggle That Remembers',
    level: 'Easy', tags: ['classList', 'click', 'localStorage'], companies: ['Zoho', 'Freshworks', 'Infosys'],
    statement: `<p>A page has a button <code>#theme</code>. Write <code>setupDarkMode(button)</code>: clicking toggles the class <code>dark</code> on <code>&lt;html&gt;</code>, updates the button text ("Dark mode" / "Light mode") and <code>aria-pressed</code>, and remembers the choice so it is applied again after a reload. If nothing is saved yet, follow the operating system preference (<code>prefers-color-scheme</code>).</p>`,
    constraints: `localStorage may throw (private mode, blocked cookies) - the page must still work. No inline styles; use only the class.`,
    example: `${H.table(['Step', 'html class', 'button text', 'saved'], [['first visit, OS is dark', '<code>dark</code>', 'Light mode', '(nothing)'], ['click', '(none)', 'Dark mode', '"light"'], ['reload', '(none)', 'Dark mode', '"light" is respected over OS']])}`,
    brute: { why: `<p>Setting <code>document.body.style.background</code> and <code>color</code> inline for every element: it can't be undone easily, doesn't scale to a real theme, and forgets the choice on reload. Also, a bare <code>localStorage.getItem</code> crashes the whole script when storage is blocked.</p>`, code: `document.querySelector('#theme').addEventListener('click', () => {
  document.body.style.background = '#111';   // inline, one-way, not remembered
  document.body.style.color = '#eee';
});` },
    mcq: { q: 'Why wrap localStorage access in try/catch?', options: ['It can throw (blocked storage, private mode, quota), and one exception would stop the rest of the script', 'localStorage is asynchronous', 'try/catch makes it faster', 'It is required by the HTML spec'], answer: 0, explain: 'Storage access can throw a SecurityError or QuotaExceededError. A tiny try/catch keeps the feature working (just not remembered).' },
    hints: [
      `<p>Hint 1: one class on <code>&lt;html&gt;</code> drives everything via CSS (<code>html.dark { ... }</code>). JS only flips the class.</p>`,
      `<p>Hint 2: write one <code>apply(dark)</code> function that sets the class, button text and aria-pressed. Call it once at startup and again on click.</p>`,
      `<p>Hint 3: recipe - startup: read saved (try/catch), else <code>matchMedia("(prefers-color-scheme: dark)").matches</code>; <code>apply</code>. Click: compute new state from the class, <code>apply</code>, save inside try/catch. Edge: <code>matchMedia</code> missing in old environments.</p>`
    ],
    solution: {
      approach: `<p>Single source of truth is the class on the root element. <code>apply</code> keeps the three visible things (class, text, aria-pressed) in sync. Storage is best-effort.</p>`,
      code: `function setupDarkMode(button, root = document.documentElement) {
  const KEY = 'theme';
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (err) { saved = null; }   // storage may be blocked
  const osDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;

  function apply(dark) {
    root.classList.toggle('dark', dark);                 // CSS does the real work
    button.setAttribute('aria-pressed', String(dark));   // tells screen readers the state
    button.textContent = dark ? 'Light mode' : 'Dark mode';
  }

  apply(saved ? saved === 'dark' : osDark);              // saved choice beats the OS default

  button.addEventListener('click', () => {
    const dark = !root.classList.contains('dark');
    apply(dark);
    try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (err) { /* best effort */ }
  });
}`,
      complexity: `<p>O(1) per click. One listener.</p>`,
      followUps: ['Prevent the flash of the wrong theme by applying it in an inline script in <code>&lt;head&gt;</code>.', 'Listen for OS theme changes with <code>matchMedia(...).addEventListener("change")</code> when nothing is saved.']
    }
  });

  practice.push({
    title: 'Make External Links Safe',
    level: 'Easy', tags: ['querySelectorAll', 'attributes', 'security'], companies: ['Adobe', 'Capgemini', 'TCS'],
    statement: `<p>Write <code>secureExternalLinks(root)</code> that finds every link (<code>a[href]</code>) inside <code>root</code> pointing to a <b>different origin</b> over http or https, and makes it open in a new tab with <code>rel="noopener noreferrer"</code>. Internal links, <code>mailto:</code>, <code>tel:</code> and <code>#anchor</code> links must be left alone.</p>`,
    constraints: `Up to 5,000 links. Must not break links that already have a <code>rel</code> (for example <code>nofollow</code>) - keep the existing tokens.`,
    example: `${H.table(['href (page on example.com)', 'result'], [['https://other.org/a', '<span class="c-g">target=_blank, rel=noopener noreferrer</span>'], ['/pricing', 'unchanged (same origin)'], ['mailto:hi@x.com', 'unchanged'], ['#top', 'unchanged'], ['https://other.org rel="nofollow"', 'rel becomes "nofollow noopener noreferrer"']])}`,
    brute: { why: `<p>Checking <code>href.startsWith("http")</code> treats your own absolute links (<code>https://example.com/about</code>) as external, and overwriting <code>rel</code> throws away existing values.</p>`, code: `document.querySelectorAll('a').forEach((a) => {
  if (a.getAttribute('href').startsWith('http')) {   // own absolute links are "external" too; null href crashes
    a.target = '_blank';
    a.rel = 'noopener';                              // wipes existing rel tokens
  }
});` },
    mcq: { q: 'Which property gives the already-resolved origin of a link, even for relative hrefs?', options: ['a.origin', 'a.getAttribute("href")', 'a.innerText', 'a.baseURI'], answer: 0, explain: 'HTMLAnchorElement.origin is computed from the resolved URL, so "/pricing" on example.com gives "https://example.com".' },
    hints: [
      `<p>Hint 1: the anchor element already parses its own URL. <code>a.origin</code>, <code>a.protocol</code> are ready to use.</p>`,
      `<p>Hint 2: select with <code>root.querySelectorAll("a[href]")</code> so links without href are skipped automatically.</p>`,
      `<p>Hint 3: recipe - for each a: skip unless protocol is http: or https:; skip if <code>a.origin === location.origin</code>; set <code>target</code>; merge rel tokens using <code>a.relList.add("noopener", "noreferrer")</code> (a DOMTokenList - no duplicates).</p>`
    ],
    solution: {
      approach: `<p>Use the browser's URL parsing via anchor properties and <code>relList</code> to merge tokens safely.</p>`,
      code: `function secureExternalLinks(root = document) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const web = a.protocol === 'http:' || a.protocol === 'https:';   // ignore mailto:, tel:, javascript:
    if (!web || a.origin === location.origin) return;                // same site stays as is
    a.target = '_blank';
    a.relList.add('noopener', 'noreferrer');                         // keeps existing tokens like nofollow
  });
}`,
      complexity: `<p>O(L) for L links. Run once, or again on new content (or delegate a click handler instead).</p>`,
      followUps: ['Handle links added later (MutationObserver or a delegated click handler).', 'Why does target=_blank without noopener matter (window.opener)?']
    }
  });

  practice.push({
    title: 'Counters on a Toolbar With One Listener',
    level: 'Easy', tags: ['delegation', 'dataset', 'closest'], companies: ['Swiggy', 'Cred', 'Walmart'],
    statement: `<p>A toolbar contains buttons like <code>&lt;button data-key="like"&gt;&lt;span class="icon"&gt;👍&lt;/span&gt; Like&lt;/button&gt;</code> and for each key a counter <code>&lt;output data-count="like"&gt;0&lt;/output&gt;</code>. Using <b>one</b> click listener on the toolbar, increase the matching counter every time any button is clicked - even when the click lands on the inner <code>span</code>.</p>`,
    constraints: `Any number of buttons added later must work without extra setup. Ignore clicks on empty toolbar space.`,
    example: `${H.table(['Click', 'Counter'], [['on the thumb icon (span) of Like', 'like: 1'], ['on the text of Like', 'like: 2'], ['on a Love button', 'love: 1'], ['on empty gap', '(nothing)']])}`,
    brute: { why: `<p>One <code>addEventListener</code> per button: N listeners, new buttons need new wiring, and a naive <code>e.target.dataset.key</code> is <code>undefined</code> when the click lands on the inner span.</p>`, code: `document.querySelectorAll('.toolbar button').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const key = e.target.dataset.key;            // undefined when the span was clicked
    const out = document.querySelector('[data-count="' + key + '"]');
    out.textContent = Number(out.textContent) + 1;
  });
});` },
    mcq: { q: 'The user clicks the span inside the button. What is event.target.closest("button[data-key]")?', options: ['The button element', 'The span itself', 'null', 'The toolbar'], answer: 0, explain: 'closest walks up from the span and returns the nearest ancestor (or itself) that matches the selector: the button.' },
    hints: [
      `<p>Hint 1: events bubble, so the toolbar hears every click inside it.</p>`,
      `<p>Hint 2: <code>closest("button[data-key]")</code> turns "whatever was clicked" into "the button".</p>`,
      `<p>Hint 3: recipe - listener on toolbar; <code>btn = e.target.closest("button[data-key]")</code>; return if null or not <code>toolbar.contains(btn)</code>; find <code>output</code> by <code>[data-count=...]</code> using <code>CSS.escape</code>; increment with <code>Number(out.textContent) + 1</code>.</p>`
    ],
    solution: {
      approach: `<p>Delegate on the toolbar and resolve the button with <code>closest</code>. Counters are located with an attribute selector built from the key.</p>`,
      code: `function setupCounters(toolbar) {
  toolbar.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-key]');
    if (!btn || !toolbar.contains(btn)) return;             // clicked empty space or something outside
    const key = btn.dataset.key;
    const out = toolbar.querySelector('[data-count="' + CSS.escape(key) + '"]');
    if (out) out.textContent = String(Number(out.textContent) + 1);
  });
}`,
      complexity: `<p>O(depth) per click for <code>closest</code>, plus one attribute-selector lookup. One listener total.</p>`,
      followUps: ['Keep the counts in a Map and render from it (state first, DOM second).', 'Add a long-press that resets the counter.']
    }
  });

  practice.push({
    title: 'List the Event Path (composedPath by Hand)',
    level: 'Easy', tags: ['DOM tree', 'bubbling', 'parent pointers'], companies: ['Google', 'Microsoft', 'Oracle'],
    statement: `<p>Each node of a tiny tree is <code>{ name, parent }</code> (<code>parent</code> is <code>null</code> for the root). Write <code>eventPath(target)</code> returning the names the event travels through, in the order the <b>capturing</b> phase visits them (root first, ending at the target), and <code>bubblePath(target)</code> returning the order of the bubbling phase (target first, then each ancestor up to the root).</p>`,
    constraints: `Up to 10<sup>5</sup> levels deep, so avoid recursion in the solution.`,
    example: `${H.table(['Tree', 'target', 'eventPath', 'bubblePath'], [['document › body › ul › li', 'li', '[document, body, ul, li]', '[li, ul, body, document]'], ['document', 'document', '[document]', '[document]']])}`,
    brute: { why: `<p>Recursion works for small trees but a very deep tree overflows the call stack; also inserting at the front of an array repeatedly with <code>unshift</code> is O(N<sup>2</sup>) overall.</p>`, code: `function eventPathBrute(node) {
  if (!node) return [];
  return eventPathBrute(node.parent).concat(node.name);   // recursion depth = tree depth; concat copies each time
}` },
    mcq: { q: 'Which array order is the capturing order for target li inside ul inside body?', options: ['body, ul, li', 'li, ul, body', 'ul, li, body'], answer: 0, explain: 'Capturing starts at the top (body/document) and walks down to the target.' },
    hints: [
      `<p>Hint 1: you only ever need to walk <b>up</b> via <code>parent</code>; that gives the bubbling order directly.</p>`,
      `<p>Hint 2: the capturing order is simply that list reversed.</p>`,
      `<p>Hint 3: recipe - <code>path=[]; for (n=target; n; n=n.parent) path.push(n.name)</code> → bubblePath. <code>eventPath = path.slice().reverse()</code>. A loop (not recursion) is safe for deep trees.</p>`
    ],
    solution: {
      approach: `<p>One upward loop gives bubbling order in O(depth). Reversing a copy gives capturing order.</p>`,
      code: { lang: 'js', run: true, code: `function bubblePath(target) {
  const names = [];
  for (let n = target; n; n = n.parent) names.push(n.name);   // target first, root last
  return names;
}
function eventPath(target) {
  return bubblePath(target).reverse();                        // root first, target last
}

const document_ = { name: 'document', parent: null };
const body = { name: 'body', parent: document_ };
const ul = { name: 'ul', parent: body };
const li = { name: 'li', parent: ul };
console.log('capture :', eventPath(li).join(' > '));
console.log('bubble  :', bubblePath(li).join(' > '));
console.log('root    :', eventPath(document_));` },
      complexity: `<p>Time O(D) for depth D; space O(D) for the output.</p>`,
      followUps: ['Stop at a shadow root boundary.', 'Return the nodes that have a listener for a given type.']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Accessible Tabs With Delegation and Arrow Keys',
    level: 'Medium', tags: ['delegation', 'a11y', 'keyboard', 'machine coding'], companies: ['Atlassian', 'Adobe', 'Flipkart'],
    statement: `<p>Build <code>setupTabs(root)</code>. Markup: a <code>[role="tablist"]</code> with several <code>[role="tab"]</code> buttons, each having <code>aria-controls="panelId"</code>, followed by panels with those ids. Clicking a tab selects it: <code>aria-selected="true"</code> on it (and "false" on others), only its panel visible (the others get <code>hidden</code>). Keyboard: <kbd>ArrowRight</kbd>/<kbd>ArrowLeft</kbd> move to the next/previous tab (wrapping), <kbd>Home</kbd>/<kbd>End</kbd> jump to the first/last. Only the selected tab is in the Tab order (<code>tabindex="0"</code>, others <code>-1</code>).</p>`,
    constraints: `Two listeners at most (click and keydown) on the tablist. Works for any number of tabs.`,
    example: `${H.table(['Action', 'Result'], [['click "Billing" tab', 'Billing selected, its panel shown, others hidden'], ['press ArrowRight on last tab', 'wraps to the first tab and focuses it'], ['press End', 'last tab selected and focused'], ['press Tab', 'focus leaves the tablist into the visible panel']])}`,
    brute: { why: `<p>One listener per tab and toggling a <code>.active</code> class only. Mouse users are fine, but there is no keyboard support, no ARIA state for screen readers, every tab stays in the Tab order, and tabs added later don't work.</p>`, code: `document.querySelectorAll('[role=tab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[role=tab]').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    // panels: not handled, no aria-selected, no arrow keys
  });
});` },
    mcq: { q: 'Why give non-selected tabs tabindex="-1" (a "roving tabindex")?', options: ['So Tab moves out of the tablist in one press and arrow keys move between tabs', 'To hide them from screen readers', 'To make them unclickable', 'Because tabindex -1 is faster'], answer: 0, explain: 'In the ARIA tabs pattern the tablist is one stop in the Tab order; arrows move within it. Only the selected tab is focusable by Tab.' },
    hints: [
      `<p>Hint 1: write one function <code>select(tab)</code> that loops over all tabs and sets everything (aria-selected, tabindex, panel hidden). Click and keyboard both call it.</p>`,
      `<p>Hint 2: delegate: click listener on the tablist uses <code>e.target.closest('[role="tab"]')</code>; keydown listener computes the next index from <code>tabs.indexOf(document.activeElement)</code>.</p>`,
      `<p>Hint 3: recipe - Arrow keys: <code>(i + 1) % n</code> and <code>(i - 1 + n) % n</code>; Home = 0; End = n-1. Call <code>preventDefault()</code> for handled keys (stops page scrolling), then <code>select(tabs[j])</code> and <code>tabs[j].focus()</code>. Initially select the tab that already has aria-selected="true" (or the first).</p>`
    ],
    solution: {
      approach: `<p>A single <code>select</code> function is the only code that mutates state. Two delegated listeners translate mouse clicks and keys into a tab index.</p>`,
      code: `function setupTabs(root) {
  const list = root.querySelector('[role="tablist"]');
  const getTabs = () => Array.from(list.querySelectorAll('[role="tab"]'));

  function select(tab) {
    for (const t of getTabs()) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;                                   // roving tabindex
      const panel = root.querySelector('#' + CSS.escape(t.getAttribute('aria-controls')));
      if (panel) panel.hidden = !on;
    }
  }

  list.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab && list.contains(tab)) select(tab);
  });

  list.addEventListener('keydown', (event) => {
    const tabs = getTabs();
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let j = null;
    if (event.key === 'ArrowRight') j = (i + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') j = 0;
    else if (event.key === 'End') j = tabs.length - 1;
    if (j === null) return;
    event.preventDefault();                                       // do not scroll the page
    select(tabs[j]);
    tabs[j].focus();
  });

  select(getTabs().find((t) => t.getAttribute('aria-selected') === 'true') || getTabs()[0]);
}`,
      complexity: `<p>O(T) per selection for T tabs (small). Two listeners regardless of T.</p>`,
      followUps: ['Support vertical tablists (ArrowUp/ArrowDown).', 'Automatic vs manual activation (select on focus or on Enter).', 'Sync the selected tab with the URL hash.']
    }
  });

  practice.push({
    title: 'Single-Open Accordion',
    level: 'Medium', tags: ['delegation', 'aria-expanded', 'DOM'], companies: ['Swiggy', 'Razorpay', 'Atlassian'],
    statement: `<p>An accordion is a list of sections; each has a header button <code>button.acc-head[aria-controls="id"]</code> and a panel with that id. Implement <code>setupAccordion(root, { single })</code>: clicking a header opens its panel (<code>aria-expanded="true"</code>, panel not hidden) and, when <code>single</code> is true, closes all other panels. Clicking an open header closes it. One listener total.</p>`,
    constraints: `Panels start hidden. Header buttons may contain icons/spans. Sections can be added later.`,
    example: `${H.table(['State', 'Click', 'New state'], [['all closed', 'header 2', 'only 2 open'], ['2 open', 'header 3 (single)', 'only 3 open'], ['3 open', 'header 3', 'all closed'], ['2 open', 'header 3 (single=false)', '2 and 3 open']])}`,
    brute: { why: `<p>Querying the whole document and closing everything on each click, then re-opening the clicked one, makes the clicked panel flicker closed → open, and you can't close an open panel by clicking it again.</p>`, code: `document.querySelectorAll('.acc-head').forEach((h) => h.addEventListener('click', () => {
  document.querySelectorAll('.acc-panel').forEach((p) => p.hidden = true);   // closes the one just clicked too
  document.getElementById(h.getAttribute('aria-controls')).hidden = false;  // can never toggle closed
}));` },
    mcq: { q: 'What should reflect the open/closed state for assistive technology?', options: ['aria-expanded on the header button', 'a CSS class only', 'the panel text color', 'the button id'], answer: 0, explain: 'aria-expanded="true|false" on the controlling button tells screen readers whether the section is open. The hidden attribute on the panel handles visibility.' },
    hints: [
      `<p>Hint 1: derive the new state from the clicked header: <code>open = header.getAttribute("aria-expanded") !== "true"</code>.</p>`,
      `<p>Hint 2: write <code>setOpen(header, open)</code> that updates both the button attribute and the panel's hidden property.</p>`,
      `<p>Hint 3: recipe - click on root: <code>header = e.target.closest(".acc-head")</code>; compute <code>open</code> before changing anything; if <code>single</code> and opening, call <code>setOpen(other, false)</code> for every other header; then <code>setOpen(header, open)</code>.</p>`
    ],
    solution: {
      approach: `<p>Compute the clicked header's next state first, then close the others (only if opening in single mode), then apply. A tiny <code>setOpen</code> keeps ARIA and visibility in sync.</p>`,
      code: `function setupAccordion(root, { single = true } = {}) {
  function setOpen(header, open) {
    header.setAttribute('aria-expanded', String(open));
    const panel = root.querySelector('#' + CSS.escape(header.getAttribute('aria-controls')));
    if (panel) panel.hidden = !open;
  }

  root.addEventListener('click', (event) => {
    const header = event.target.closest('.acc-head');
    if (!header || !root.contains(header)) return;
    const open = header.getAttribute('aria-expanded') !== 'true';   // decide before changing anything
    if (single && open) {
      for (const other of root.querySelectorAll('.acc-head')) {
        if (other !== header) setOpen(other, false);
      }
    }
    setOpen(header, open);
  });

  root.querySelectorAll('.acc-head').forEach((h) => setOpen(h, false));  // initial state
}`,
      complexity: `<p>O(S) per click for S sections (closing the others). One listener.</p>`,
      followUps: ['Animate height with CSS grid rows (0fr to 1fr).', 'Use native <code>&lt;details name="group"&gt;</code> and compare.', 'Add Up/Down arrow navigation between headers.']
    }
  });

  practice.push({
    title: 'Throttle With a Testable Clock',
    level: 'Medium', tags: ['throttle', 'closures', 'testing'], companies: ['Google', 'Meta', 'Atlassian'],
    statement: `<p>Write <code>throttle(fn, wait, now = Date.now)</code> that returns a function which calls <code>fn</code> immediately the first time, then ignores calls until <code>wait</code> ms have passed since the last <i>run</i>. It must pass <code>this</code> and the arguments through and return the result of the latest real run. The injectable <code>now</code> lets tests control time.</p>`,
    constraints: `wait ≥ 0. Calls with identical timestamps count as inside the window. No timers allowed in this version.`,
    example: `${H.table(['call time (ms)', 'wait = 100', 'runs?'], [['0', '-', '<span class="c-g">yes (first)</span>'], ['40', '40 &lt; 100', 'no'], ['99', '99 &lt; 100', 'no'], ['100', '100 ≥ 100', '<span class="c-g">yes</span>'], ['150', '50 &lt; 100', 'no'], ['250', '150 ≥ 100', '<span class="c-g">yes</span>']])}`,
    brute: { why: `<p>Using <code>setInterval</code> to reset a "can run" flag keeps a timer alive forever (a leak), and checking the flag with the wrong clock source gives drift; it is also impossible to test deterministically.</p>`, code: `function throttleBrute(fn, wait) {
  let ready = true;
  setInterval(() => { ready = true; }, wait);      // timer lives forever, even when idle
  return (...args) => { if (ready) { ready = false; fn(...args); } };
}` },
    mcq: { q: 'In a leading-edge throttle with wait = 100, calls at 0, 60 and 130 ms. Which ones run?', options: ['0 and 130', '0 and 60', '60 and 130', 'only 0'], answer: 0, explain: '0 runs (first). 60 is inside the 100 ms window. 130 is 130 ms after the last run, so it runs.' },
    hints: [
      `<p>Hint 1: you do not need timers. Remember the timestamp of the last run and compare with now.</p>`,
      `<p>Hint 2: initialise <code>last = -Infinity</code> so the first call always runs.</p>`,
      `<p>Hint 3: recipe - <code>const t = now(); if (t - last &gt;= wait) { last = t; result = fn.apply(this, args); } return result;</code>. Use a normal <code>function</code> (not arrow) to forward <code>this</code>.</p>`
    ],
    solution: {
      approach: `<p>A closure stores the last run time and last result. Comparing timestamps is O(1) and needs no timers, which also makes it easy to test with a fake clock.</p>`,
      code: { lang: 'js', run: true, code: `function throttle(fn, wait, now = Date.now) {
  let last = -Infinity;
  let result;
  return function (...args) {
    const t = now();
    if (t - last >= wait) {          // window has passed (or first call)
      last = t;
      result = fn.apply(this, args); // keep this + args
    }
    return result;                   // otherwise return the previous result
  };
}

// Fake clock for a deterministic test
let clock = 0;
const run = throttle((label) => { console.log('RUN at', clock, label); return label; }, 100, () => clock);
for (const t of [0, 40, 99, 100, 150, 250]) {
  clock = t;
  run('call@' + t);
}` },
      complexity: `<p>O(1) time and space per call.</p>`,
      followUps: ['Add a trailing call so the final event is never lost.', 'Add cancel().', 'Implement it with requestAnimationFrame for visual updates.']
    }
  });

  practice.push({
    title: 'Turn a Form Into an Object (Repeated Names Become Arrays)',
    level: 'Medium', tags: ['FormData', 'forms', 'Map'], companies: ['Amazon', 'Shopify', 'Razorpay'],
    statement: `<p>Write <code>formToObject(formData, alwaysArray = [])</code>. Walk the entries of a <code>FormData</code>. A name that appears once becomes a single value; a name that appears more than once (checkbox group, multi-select) becomes an <b>array in the original order</b>. Names listed in <code>alwaysArray</code> are arrays even when they have only one value (or none checked → <code>[]</code>). File values must be kept as they are. The result must be safe for keys such as <code>__proto__</code>.</p>`,
    constraints: `Up to 10<sup>4</sup> entries. Use only standard APIs; FormData is iterable as [name, value] pairs.`,
    example: `${H.table(['Entries (in order)', 'Result'], [['name=Ann, tag=a, tag=b, tag=c', '<code>{ name: "Ann", tag: ["a","b","c"] }</code>'], ['name=Ann, tag=a', '<code>{ name: "Ann", tag: "a" }</code> (one checkbox is a string)'], ['same, alwaysArray=["tag"]', '<code>{ name: "Ann", tag: ["a"] }</code>'], ['alwaysArray=["tag"], none checked', '<code>{ tag: [] }</code>']])}`,
    brute: { why: `<p><code>Object.fromEntries(formData)</code> looks perfect but silently keeps only the <b>last</b> value of a repeated name, so a group of 3 checked boxes loses 2 values. Starting from a plain <code>{}</code> and testing <code>key in out</code> also misbehaves for keys like <code>toString</code>.</p>`, code: `function formToObjectBrute(formData) {
  return Object.fromEntries(formData);   // tag=a, tag=b, tag=c  ->  { tag: "c" }   (data loss)
}` },
    mcq: { q: 'Why does Object.fromEntries(new FormData(form)) lose data for a checkbox group?', options: ['Each repeated name overwrites the previous one', 'FormData is not iterable', 'Checkboxes are never included', 'It sorts the values'], answer: 0, explain: 'fromEntries assigns obj[name] = value for each pair, so the last pair for a repeated name wins. Use getAll or collect into arrays.' },
    hints: [
      `<p>Hint 1: you must remember what you saw before for a key, so use a <code>Map</code> (key → value-or-array).</p>`,
      `<p>Hint 2: first sighting stores the value; second sighting turns it into <code>[prev, value]</code>; later sightings push onto the array.</p>`,
      `<p>Hint 3: recipe - loop <code>for (const [k, v] of formData)</code>; after the loop, for each name in <code>alwaysArray</code> wrap a lone value in an array or create <code>[]</code>; finish with <code>Object.fromEntries(map)</code> (safe even for "__proto__").</p>`
    ],
    solution: {
      approach: `<p>Group entries in a Map in one pass, then normalise the keys that must always be arrays, and convert to an object with <code>Object.fromEntries</code>.</p>`,
      code: { lang: 'js', run: true, code: `function formToObject(formData, alwaysArray = []) {
  const grouped = new Map();
  for (const [key, value] of formData) {
    if (!grouped.has(key)) grouped.set(key, value);                 // first sighting: plain value
    else {
      const prev = grouped.get(key);
      grouped.set(key, Array.isArray(prev) ? [...prev, value] : [prev, value]);  // second+ sighting: array
    }
  }
  for (const key of alwaysArray) {
    if (!grouped.has(key)) grouped.set(key, []);                    // nothing checked
    else if (!Array.isArray(grouped.get(key))) grouped.set(key, [grouped.get(key)]);
  }
  return Object.fromEntries(grouped);
}

const fd = new FormData();
fd.append('name', 'Ann');
fd.append('tag', 'a'); fd.append('tag', 'b'); fd.append('tag', 'c');
console.log(formToObject(fd));
const one = new FormData(); one.append('name', 'Ann'); one.append('tag', 'a');
console.log(formToObject(one));
console.log(formToObject(one, ['tag', 'size']));` },
      complexity: `<p>Time O(E) for E entries, space O(E).</p>`,
      followUps: ['Support nested names like <code>user[address][city]</code>.', 'Convert numeric-looking values using the input\'s <code>type</code>.']
    }
  });

  practice.push({
    title: 'Dropdown Menu: Outside Click, Escape and Arrow Keys',
    level: 'Medium', tags: ['events', 'AbortController', 'a11y', 'CustomEvent'], companies: ['Atlassian', 'Microsoft', 'Uber'],
    statement: `<p>Build <code>setupDropdown(root)</code>. <code>root</code> contains a toggle button (<code>[aria-haspopup]</code>) and a menu (<code>[role="menu"]</code>, initially <code>hidden</code>) of <code>[role="menuitem"]</code> buttons with <code>data-value</code>. Behaviour: clicking the toggle opens/closes (updating <code>aria-expanded</code>); while open, a click <b>anywhere outside</b> root closes it and <kbd>Escape</kbd> closes it and returns focus to the toggle; arrow keys move focus between items; choosing an item closes the menu and dispatches a bubbling <code>menu:select</code> custom event with <code>detail.value</code>. The document-level listeners must exist <b>only while the menu is open</b>.</p>`,
    constraints: `No stopPropagation calls. No listener leaks after repeated open/close.`,
    example: `${H.table(['Action', 'Result'], [['click toggle', 'menu opens, first item focused, aria-expanded=true'], ['click outside', 'menu closes; document listeners removed'], ['Escape while open', 'closes and focus returns to the toggle'], ['click item "rename"', 'closes and root emits <code>menu:select {value:"rename"}</code>']])}`,
    brute: { why: `<p>Adding a document click listener once at startup that always runs, or adding a new one on every open without removing the old: the first wastes work on every click anywhere forever; the second leaks - after 50 opens, every click runs 50 handlers. Using <code>stopPropagation</code> on the toggle to avoid instant closing also blinds other components.</p>`, code: `toggle.addEventListener('click', (e) => {
  e.stopPropagation();                                   // hides the click from everyone else
  menu.hidden = !menu.hidden;
  document.addEventListener('click', () => { menu.hidden = true; });   // new listener on EVERY open: leak
});` },
    mcq: { q: 'The toggle click opens the menu and adds a document click listener. Does that same click also reach the new document listener?', options: ['Yes - it keeps bubbling, so the listener must ignore clicks inside root (contains check)', 'No - listeners added during dispatch never run for that event', 'Only if you use capture', 'Only in Firefox'], answer: 0, explain: 'The event path is fixed, but listeners on a node are read when the event reaches that node. A listener added to document during the toggle\'s handler does run for the same click. The root.contains(e.target) check prevents an instant close.' },
    hints: [
      `<p>Hint 1: add the document listeners in <code>open()</code> and remove them in <code>close()</code>. One <code>AbortController</code> makes that a one-liner.</p>`,
      `<p>Hint 2: the outside-click handler must say "if the click target is inside root, ignore it" using <code>root.contains(event.target)</code> - that also handles the click that opened the menu.</p>`,
      `<p>Hint 3: recipe - <code>open()</code>: unhide, set aria-expanded, create <code>ac</code>, add document click + keydown with <code>{ signal: ac.signal }</code>, focus first item. <code>close()</code>: hide, aria-expanded false, <code>ac.abort()</code>. Menu keydown: ArrowDown/ArrowUp move focus with wrapping. Item click (delegated on menu): dispatch <code>CustomEvent("menu:select", { detail, bubbles: true })</code>, then close and focus the toggle.</p>`
    ],
    solution: {
      approach: `<p>State lives in the DOM (<code>menu.hidden</code>). Global listeners are scoped to the open period via an AbortController, so there is never more than one set. A <code>contains</code> check, not <code>stopPropagation</code>, handles clicks inside the component.</p>`,
      code: `function setupDropdown(root) {
  const toggle = root.querySelector('[aria-haspopup]');
  const menu = root.querySelector('[role="menu"]');
  const items = () => Array.from(menu.querySelectorAll('[role="menuitem"]'));
  let ac = null;

  function open() {
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    ac = new AbortController();
    const opts = { signal: ac.signal };
    document.addEventListener('click', (event) => {
      if (!root.contains(event.target)) close();            // outside click (inside clicks, including the opener, are ignored)
    }, opts);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { close(); toggle.focus(); }
    }, opts);
    const first = items()[0];
    if (first) first.focus();
  }

  function close() {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (ac) { ac.abort(); ac = null; }                      // removes BOTH document listeners
  }

  toggle.addEventListener('click', () => (menu.hidden ? open() : close()));

  menu.addEventListener('keydown', (event) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') { event.preventDefault(); list[(i + 1) % list.length].focus(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
  });

  menu.addEventListener('click', (event) => {
    const item = event.target.closest('[role="menuitem"]');
    if (!item || !menu.contains(item)) return;
    root.dispatchEvent(new CustomEvent('menu:select', { detail: { value: item.dataset.value }, bubbles: true }));
    close();
    toggle.focus();
  });
}`,
      complexity: `<p>O(1) per event; O(I) for I items when moving focus. At most 2 document listeners, only while open.</p>`,
      followUps: ['Type-ahead: pressing a letter focuses the next item starting with it.', 'Close when focus leaves the component (focusout with relatedTarget).', 'Position the menu with the Popover API / anchor positioning.']
    }
  });

  practice.push({
    title: 'Live Character Counter With Submit Guard',
    level: 'Medium', tags: ['input event', 'forms', 'constraint validation'], companies: ['Twitter/X', 'Zomato', 'ShareChat'],
    statement: `<p>A post form has a <code>textarea[maxlength]</code>, a <code>.counter</code> element and a submit button. Write <code>setupPost(form)</code>: show "N left" updating on <b>every edit</b> (typing, paste, cut), add class <code>warn</code> when 20 or fewer characters remain, keep the submit button disabled while the text is empty/whitespace or the form is otherwise invalid (<code>checkValidity()</code>), and on submit prevent the reload, log the text, clear it and update the counter again.</p>`,
    constraints: `Use the <code>input</code> event (not keyup). The disabled button must also not submit through the Enter key shortcut path - check inside the handler too.`,
    example: `${H.table(['Text', 'maxlength 140', 'counter', 'button'], [['(empty)', '140', '140 left', 'disabled'], ['"Hello"', '5', '135 left', 'enabled'], ['130 chars', '130', '10 left, <code>warn</code>', 'enabled'], ['"   "', '3 spaces', '137 left', 'disabled (blank)']])}`,
    brute: { why: `<p>Listening to <code>keyup</code> misses paste with the mouse, cut, drag-and-drop and voice input; the counter then shows wrong numbers. Only disabling the button without re-checking in <code>submit</code> lets Enter or scripts submit invalid data.</p>`, code: `area.addEventListener('keyup', () => {                    // misses mouse paste/cut/drop
  counter.textContent = (140 - area.value.length) + ' left';
});` },
    mcq: { q: 'Which event fires for typing, paste, cut, drop and voice dictation alike?', options: ['input', 'keyup', 'change', 'keypress'], answer: 0, explain: 'input fires whenever the value changes, however it happened. keyup/keypress only see keyboard keys; change fires only on commit (blur).' },
    hints: [
      `<p>Hint 1: one <code>update()</code> function computes everything from the current text. Call it on <code>input</code> and once at startup.</p>`,
      `<p>Hint 2: <code>area.maxLength</code> gives the limit; <code>classList.toggle("warn", left &lt;= 20)</code> handles the colour.</p>`,
      `<p>Hint 3: recipe - <code>submit.disabled = !area.value.trim() || !form.checkValidity()</code>. In the submit handler call <code>preventDefault()</code>, return early if the same condition is true, then log, clear, and call <code>update()</code> again.</p>`
    ],
    solution: {
      approach: `<p>Derive all UI state from the textarea's value in one function and call it for every change. Guard the submit handler with the same condition so the UI state and behaviour can't disagree.</p>`,
      code: `function setupPost(form) {
  const area = form.querySelector('textarea');
  const counter = form.querySelector('.counter');
  const submit = form.querySelector('button[type="submit"]');
  const max = area.maxLength;                         // UTF-16 units, the same unit the browser enforces

  function isBlockedNow() {
    return !area.value.trim() || !form.checkValidity();
  }

  function update() {
    const left = max - area.value.length;
    counter.textContent = left + ' left';
    counter.classList.toggle('warn', left <= 20);
    submit.disabled = isBlockedNow();
  }

  area.addEventListener('input', update);             // typing, paste, cut, drop, dictation
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (isBlockedNow()) return;                       // never trust the disabled state alone
    console.log('posting:', area.value);
    area.value = '';
    update();
  });
  update();
}`,
      complexity: `<p>O(1) per input event (reading <code>value.length</code> is O(1); <code>checkValidity</code> is O(controls)).</p>`,
      followUps: ['Count graphemes (emoji, accents) with <code>Intl.Segmenter</code> instead of UTF-16 units.', 'Debounce the draft autosave separately from the counter.']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Build Your Own addEventListener / dispatchEvent',
    level: 'Hard', tags: ['event system', 'capture', 'bubble', 'machine coding', 'design'], companies: ['Google', 'Meta', 'Atlassian', 'Uber'],
    statement: `<p>Implement a mini DOM-style event system on a tree of <code>Target</code> objects (each has a <code>parent</code>). Support: <code>addEventListener(type, fn, options)</code> where options is a boolean (capture) or <code>{ capture, once }</code> - duplicates (same type, fn, capture) are ignored; <code>removeEventListener</code>; and <code>dispatchEvent(event)</code> running capture (root → parent of target), target (capture listeners, then normal ones), then bubble (parent → root, only if <code>event.bubbles</code>). The event object has <code>target</code>, <code>currentTarget</code>, <code>eventPhase</code> (1, 2, 3), <code>preventDefault()</code> (only if cancelable), <code>stopPropagation()</code>, <code>stopImmediatePropagation()</code>, <code>defaultPrevented</code>. <code>dispatchEvent</code> returns <code>false</code> if default was prevented. A listener removed earlier in the same dispatch must be skipped.</p>`,
    constraints: `Path length ≤ 1,000; listeners per node ≤ 1,000. Pure JavaScript, no DOM.`,
    example: `${H.table(['Setup', 'Dispatch', 'Calls (in order)'], [['body: capture B1, bubble B2; ul: bubble U; li: capture L1, bubble L2', 'click on li', 'B1, L1, L2, U, B2'], ['same, but U calls stopPropagation', 'click on li', 'B1, L1, L2, U (B2 skipped)'], ['L1 calls stopImmediatePropagation', 'click on li', 'B1, L1 (L2 skipped, nothing above runs)'], ['bubbles: false', 'click on li', 'B1, L1, L2']])}`,
    brute: { why: `<p>Calling only the target's listeners and then walking up with a plain loop ignores the capture phase and phases at the target, ignores <code>stopImmediatePropagation</code> (needs a flag checked between listeners), and iterating the live array while <code>once</code> listeners remove themselves skips entries.</p>`, code: `function dispatchBrute(target, event) {
  for (let n = target; n; n = n.parent) {
    for (const l of n.listeners) if (l.type === event.type) l.fn(event);   // no capture, no stop flags, live array
  }
}` },
    mcq: { q: 'At the target itself, which listeners run first in modern browsers?', options: ['Capture listeners, then non-capture listeners', 'Non-capture first, then capture', 'Strictly in registration order', 'Only non-capture listeners run'], answer: 0, explain: 'The target is visited twice by the spec: first the capture pass, then the bubble pass.' },
    hints: [
      `<p>Hint 1: build the path once (<code>root … target</code>) before running anything - the path is fixed for the whole dispatch.</p>`,
      `<p>Hint 2: write ONE helper <code>invoke(node, phase, useCapture)</code> that runs the matching listeners of that node from a <b>snapshot</b>, checks <code>removed</code>, honours <code>once</code>, and breaks if <code>stopImmediate</code> is set. The phases just call it with different arguments.</p>`,
      `<p>Hint 3: recipe - capture loop over path[0..n-2] with phase 1 and capture=true; target: <code>invoke(target, 2, true)</code> then <code>invoke(target, 2, false)</code>; bubble loop path[n-2..0] with phase 3 and capture=false if <code>bubbles</code>. Before each node check <code>event._stopped</code>. Return <code>!event.defaultPrevented</code>.</p>`
    ],
    solution: {
      approach: `<p>One path array and one <code>invoke</code> helper. Two boolean flags on the event (<code>_stopped</code>, <code>_stoppedNow</code>) implement the two stop methods; a per-listener <code>removed</code> flag implements "skip listeners removed during dispatch".</p>`,
      code: { lang: 'js', run: true, code: `class Target {
  constructor(name, parent = null) { this.name = name; this.parent = parent; this.listeners = []; }

  addEventListener(type, fn, options = false) {
    const capture = typeof options === 'boolean' ? options : !!options.capture;
    const once = typeof options === 'object' && !!options.once;
    if (this.listeners.some((l) => l.type === type && l.fn === fn && l.capture === capture)) return;
    this.listeners.push({ type, fn, capture, once, removed: false });
  }
  removeEventListener(type, fn, options = false) {
    const capture = typeof options === 'boolean' ? options : !!options.capture;
    this.listeners = this.listeners.filter((l) => {
      const hit = l.type === type && l.fn === fn && l.capture === capture;
      if (hit) l.removed = true;               // so an in-flight dispatch skips it
      return !hit;
    });
  }

  dispatchEvent(event) {
    const path = [];
    for (let n = this; n; n = n.parent) path.unshift(n);      // root ... target (fixed for this dispatch)
    event.target = this;
    event._stopped = false; event._stoppedNow = false; event.defaultPrevented = false;
    event.preventDefault = () => { if (event.cancelable) event.defaultPrevented = true; };
    event.stopPropagation = () => { event._stopped = true; };
    event.stopImmediatePropagation = () => { event._stopped = true; event._stoppedNow = true; };

    const invoke = (node, phase, useCapture) => {
      event.currentTarget = node;
      event.eventPhase = phase;
      for (const l of node.listeners.slice()) {                // snapshot
        if (event._stoppedNow) break;
        if (l.removed || l.type !== event.type || l.capture !== useCapture) continue;
        if (l.once) node.removeEventListener(l.type, l.fn, { capture: l.capture });
        l.fn.call(node, event);
      }
    };

    for (let i = 0; i < path.length - 1 && !event._stopped; i++) invoke(path[i], 1, true);   // capture
    if (!event._stopped) invoke(this, 2, true);                                               // target: capture ones
    if (!event._stopped) invoke(this, 2, false);                                              // target: normal ones
    if (event.bubbles) for (let i = path.length - 2; i >= 0 && !event._stopped; i--) invoke(path[i], 3, false); // bubble
    event.currentTarget = null; event.eventPhase = 0;
    return !event.defaultPrevented;
  }
}

const body = new Target('body'), ul = new Target('ul', body), li = new Target('li', ul);
const log = [];
const say = (name) => () => log.push(name);
body.addEventListener('click', say('B1'), true);
body.addEventListener('click', say('B2'));
ul.addEventListener('click', say('U'));
li.addEventListener('click', say('L1'), true);
li.addEventListener('click', say('L2'));
li.addEventListener('click', () => log.push('L3(once)'), { once: true });

li.dispatchEvent({ type: 'click', bubbles: true, cancelable: true });
console.log(log.join(', '));       // B1, L1, L2, L3(once), U, B2
log.length = 0;
li.dispatchEvent({ type: 'click', bubbles: true, cancelable: true });
console.log(log.join(', '));       // B1, L1, L2, U, B2   (once is gone)
ul.addEventListener('click', (e) => e.stopPropagation());
log.length = 0;
const result = li.dispatchEvent({ type: 'click', bubbles: true, cancelable: true });
console.log(log.join(', '), '| returned', result);   // B1, L1, L2, U  (B2 never hears)` },
      complexity: `<p>O(P + L) per dispatch for path length P and total listeners L on the path (each snapshot is copied once per visit). Space O(P).</p>`,
      followUps: ['Add <code>passive</code> (preventDefault becomes a no-op).', 'Add retargeting for a shadow-root boundary.', 'Add <code>composedPath()</code>.']
    }
  });

  practice.push({
    title: 'Debounce With Leading, Trailing, cancel and flush',
    level: 'Hard', tags: ['debounce', 'closures', 'timers', 'testing'], companies: ['Google', 'Amazon', 'Flipkart', 'Atlassian'],
    statement: `<p>Implement <code>debounce(fn, wait, { leading = false, trailing = true } = {}, timers = { setTimeout, clearTimeout })</code>. A "burst" is a series of calls where each call arrives within <code>wait</code> ms of the previous one. <b>trailing</b>: call <code>fn</code> once, with the <b>latest</b> arguments and <code>this</code>, when the burst ends. <b>leading</b>: also call <code>fn</code> immediately on the first call of a burst. If both are on and the burst had only one call, <code>fn</code> must run <b>once</b> (not twice). The returned function has <code>cancel()</code> (drop pending work), <code>flush()</code> (run pending trailing work now) and <code>pending()</code>; calls return the last result of <code>fn</code>. The injectable <code>timers</code> make it testable.</p>`,
    constraints: `wait ≥ 0. flush() with nothing pending does nothing. cancel() resets the burst so the next call is a "first call" again.`,
    example: `${H.table(['Mode', 'calls at (ms)', 'fn runs at'], [['trailing, wait 300', '0, 100, 200', '500 (with args of the call at 200)'], ['leading only', '0, 100, 200', '0'], ['leading + trailing', '0, 100, 200', '0 and 500'], ['leading + trailing', '0 only', '0 only (not twice)'], ['trailing, then flush() at 250', '0, 100, 200', '250 immediately']])}`,
    brute: { why: `<p>The 5-line textbook debounce supports only trailing mode, has no way to cancel on unmount, can't flush on blur, and is hard to test because it uses real timers. Interview follow-ups always ask for leading, cancel and a test.</p>`, code: `function debounceBrute(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };   // trailing only, no cancel/flush
}` },
    mcq: { q: 'With leading and trailing both true, a burst consisting of ONE call should run fn how many times?', options: ['Once', 'Twice', 'Zero times', 'Depends on wait'], answer: 0, explain: 'The leading call already consumed the arguments; the trailing edge only runs if there were additional calls during the burst.' },
    hints: [
      `<p>Hint 1: the aha - you need two pieces of state: the timer id and the "pending" arguments that have not been delivered to fn yet.</p>`,
      `<p>Hint 2: a leading call delivers the args immediately, so it must <b>clear the pending args</b>. Any later call in the burst stores new pending args, which makes the trailing edge fire.</p>`,
      `<p>Hint 3: recipe - <code>debounced(...args)</code>: <code>isFirst = timer === null</code>; store args/this; clear and restart the timer; if <code>isFirst &amp;&amp; leading</code> invoke now. Timer callback: <code>timer = null</code>; if <code>trailing &amp;&amp; pendingArgs</code> invoke. <code>flush</code>: if a timer exists, clear it, <code>timer = null</code>, invoke if pending. <code>cancel</code>: clear timer, drop args.</p>`
    ],
    solution: {
      approach: `<p>The timer id marks "a burst is in progress". The saved arguments mean "work not yet delivered". Leading delivery clears them; every later call in the burst refills them, which is exactly the condition for a trailing run.</p>`,
      code: { lang: 'js', run: true, code: `function debounce(fn, wait, { leading = false, trailing = true } = {}, timers = { setTimeout, clearTimeout }) {
  let timer = null, pendingArgs = null, pendingThis = null, result;

  function invoke() {
    const args = pendingArgs, self = pendingThis;
    pendingArgs = pendingThis = null;               // delivered
    result = fn.apply(self, args);
    return result;
  }
  function onQuiet() {                              // the burst has ended
    timer = null;
    if (trailing && pendingArgs) invoke();
    else pendingArgs = pendingThis = null;
  }

  function debounced(...args) {
    const firstOfBurst = timer === null;
    pendingArgs = args; pendingThis = this;
    if (timer !== null) timers.clearTimeout(timer);
    timer = timers.setTimeout(onQuiet, wait);       // every call restarts the countdown
    if (firstOfBurst && leading) invoke();          // leading edge: deliver right away
    return result;
  }
  debounced.cancel = () => {
    if (timer !== null) timers.clearTimeout(timer);
    timer = null; pendingArgs = pendingThis = null;
  };
  debounced.flush = () => {
    if (timer === null) return result;
    timers.clearTimeout(timer);
    timer = null;
    if (pendingArgs) invoke();
    return result;
  };
  debounced.pending = () => timer !== null;
  return debounced;
}

// A tiny fake clock so the test is exact
function makeClock() {
  let now = 0, id = 0;
  const tasks = new Map();
  return {
    setTimeout(fn, ms) { const k = ++id; tasks.set(k, { at: now + ms, fn }); return k; },
    clearTimeout(k) { tasks.delete(k); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        let pick = null;
        for (const [k, t] of tasks) if (t.at <= end && (pick === null || t.at < tasks.get(pick).at)) pick = k;
        if (pick === null) break;
        const t = tasks.get(pick); tasks.delete(pick); now = t.at; t.fn();
      }
      now = end;
    },
    get now() { return now; }
  };
}

function scenario(label, opts, script) {
  const clock = makeClock(), runs = [];
  const d = debounce((x) => { runs.push(x + '@' + clock.now); return x; }, 300, opts, clock);
  script(d, clock);
  console.log(label.padEnd(22), '->', runs.join(', ') || '(never)');
}
const burst = (d, c) => { d('a'); c.advance(100); d('b'); c.advance(100); d('c'); c.advance(1000); };
scenario('trailing', {}, burst);
scenario('leading only', { leading: true, trailing: false }, burst);
scenario('leading + trailing', { leading: true }, burst);
scenario('lead+trail, 1 call', { leading: true }, (d, c) => { d('a'); c.advance(1000); });
scenario('flush at 250', {}, (d, c) => { d('a'); c.advance(100); d('b'); c.advance(150); d.flush(); c.advance(1000); });
scenario('cancel', {}, (d, c) => { d('a'); c.advance(100); d.cancel(); c.advance(1000); });` },
      complexity: `<p>O(1) time and space per call (one timer, one saved argument list).</p>`,
      followUps: ['Add <code>maxWait</code>: guarantee a run at least every N ms even if calls never pause.', 'Implement throttle as debounce with maxWait = wait and leading = true.', 'Use it correctly in React (create once with useMemo, cancel in the effect cleanup).']
    }
  });

  practice.push({
    title: 'Keyboard Shortcut Manager',
    level: 'Hard', tags: ['keyboard events', 'design', 'delegation', 'cross-platform'], companies: ['Notion', 'Atlassian', 'Figma', 'Microsoft'],
    statement: `<p>Build <code>createShortcuts({ ignoreInInputs = true })</code> returning <code>{ register(combo, fn, opts), handle(event) }</code>. Combos look like <code>"ctrl+k"</code>, <code>"shift+alt+n"</code>, <code>"mod+s"</code> (<code>mod</code> = Ctrl on Windows/Linux <i>or</i> Cmd on Mac), <code>"escape"</code>; modifier order and letter case in the string don't matter. <code>handle</code> is meant to be attached once to <code>document</code> <code>keydown</code>. It finds the matching shortcut, calls <code>event.preventDefault()</code> and <code>fn(event)</code>, and returns <code>true</code>; otherwise <code>false</code>. Rules: ignore shortcuts when the focus is in an <code>input</code>, <code>textarea</code>, <code>select</code> or a contenteditable element unless registered with <code>{ allowInInputs: true }</code>; ignore auto-repeat (<code>event.repeat</code>) unless <code>{ repeat: true }</code>; <code>register</code> returns an unregister function.</p>`,
    constraints: `Up to 500 shortcuts; handle() runs on every keydown so it must be O(1) lookups. An extra unrequested modifier (for example Ctrl+Shift+K when only ctrl+k is registered) must NOT match.`,
    example: `${H.table(['Registered', 'Key event', 'Result'], [['mod+k', 'ctrl+k on a div', '<span class="c-g">runs, preventDefault</span>'], ['mod+k', 'meta+k on a div', '<span class="c-g">runs</span>'], ['mod+k', 'ctrl+shift+k', 'no match'], ['mod+k', 'ctrl+k while typing in input', 'ignored'], ['mod+k {allowInInputs}', 'ctrl+k in input', 'runs'], ['escape', 'Escape held down (repeat)', 'runs once only']])}`,
    brute: { why: `<p>One <code>if (e.key === "k" && e.ctrlKey)</code> per shortcut inside a big keydown listener: O(number of shortcuts) per key press, mixes up Ctrl/Cmd, fires while the user is typing a "k" in a text field (with Ctrl held it also fires on Ctrl+Shift+K), and can't be unregistered.</p>`, code: `document.addEventListener('keydown', (e) => {
  if (e.key === 'k' && e.ctrlKey) openSearch();            // matches ctrl+shift+k too; ignores Mac Cmd; fires in text boxes
  if (e.key === 's' && e.ctrlKey) { e.preventDefault(); save(); }
});
function openSearch() { console.log('search'); }
function save() { console.log('save'); }` },
    mcq: { q: 'Why store shortcuts in a Map keyed by a normalised combo string?', options: ['O(1) lookup per keydown and order/case-insensitive matching', 'Maps are the only structure that supports functions', 'To avoid preventDefault', 'To make listeners passive'], answer: 0, explain: 'Normalising "Shift+Ctrl+K" and "ctrl+shift+k" to one canonical key lets handle() do a single Map lookup instead of scanning every shortcut.' },
    hints: [
      `<p>Hint 1: write one <code>canon(mods, key)</code> that produces the same string for the same chord: modifiers in a fixed order (ctrl, meta, alt, shift) then the lower-cased key.</p>`,
      `<p>Hint 2: <code>register</code> parses the combo string into that canonical form (expanding <code>mod</code> into both ctrl and meta). <code>handle</code> builds the canonical string from the event's flags and does a Map lookup.</p>`,
      `<p>Hint 3: recipe - in handle: build key; entry = map.get(key); return false if none; if typing in a field and not allowed return false; if <code>event.repeat</code> and not allowed return false; call <code>preventDefault</code> then <code>fn</code>; return true. Unregister deletes the keys it added. Don't forget <code>isContentEditable</code>.</p>`
    ],
    solution: {
      approach: `<p>Canonicalise chords to strings, store them in a Map, and keep <code>handle</code> a small pure function of the event. The event is only read (key, modifier booleans, target, repeat), so it can be tested with plain objects.</p>`,
      code: { lang: 'js', run: true, code: `function createShortcuts({ ignoreInInputs = true } = {}) {
  const map = new Map();
  const ORDER = ['ctrl', 'meta', 'alt', 'shift'];

  const canon = (mods, key) => [...ORDER.filter((m) => mods.has(m)), key.toLowerCase()].join('+');

  function parse(combo) {                                   // may return two keys when "mod" is used
    const parts = combo.toLowerCase().split('+').map((s) => s.trim()).filter(Boolean);
    const key = parts.pop();
    const mods = new Set(parts.map((m) => (m === 'cmd' ? 'meta' : m === 'control' ? 'ctrl' : m)));
    if (!mods.has('mod')) return [canon(mods, key)];
    mods.delete('mod');
    return [canon(new Set([...mods, 'ctrl']), key), canon(new Set([...mods, 'meta']), key)];
  }

  function isTyping(target) {
    if (!target) return false;
    const tag = String(target.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!target.isContentEditable;
  }

  function handle(event) {
    const mods = new Set();
    if (event.ctrlKey) mods.add('ctrl');
    if (event.metaKey) mods.add('meta');
    if (event.altKey) mods.add('alt');
    if (event.shiftKey) mods.add('shift');
    const entry = map.get(canon(mods, String(event.key)));          // one O(1) lookup
    if (!entry) return false;
    if (ignoreInInputs && isTyping(event.target) && !entry.allowInInputs) return false;
    if (event.repeat && !entry.repeat) return false;                // holding the key down
    event.preventDefault();
    entry.fn(event);
    return true;
  }

  function register(combo, fn, opts = {}) {
    const keys = parse(combo);
    for (const k of keys) map.set(k, { fn, allowInInputs: !!opts.allowInInputs, repeat: !!opts.repeat });
    return () => keys.forEach((k) => map.delete(k));                // unregister
  }
  return { register, handle };
}

// Test with plain fake events (in the page: document.addEventListener('keydown', sc.handle))
const sc = createShortcuts();
sc.register('mod+k', () => console.log('  -> open search'));
const off = sc.register('Escape', () => console.log('  -> close'));
const ev = (key, extra = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, target: { tagName: 'DIV' }, preventDefault() {}, ...extra });
console.log('ctrl+k        ', sc.handle(ev('k', { ctrlKey: true })));
console.log('cmd+k         ', sc.handle(ev('K', { metaKey: true })));
console.log('ctrl+shift+k  ', sc.handle(ev('k', { ctrlKey: true, shiftKey: true })));
console.log('ctrl+k in input', sc.handle(ev('k', { ctrlKey: true, target: { tagName: 'INPUT' } })));
console.log('Escape repeat ', sc.handle(ev('Escape', { repeat: true })));
off();
console.log('Escape after off', sc.handle(ev('Escape')));` },
      complexity: `<p><code>handle</code> is O(1) (a few modifier checks and one Map lookup). <code>register</code> is O(1).</p>`,
      followUps: ['Support sequences like "g then i" with a timeout.', 'Handle non-US keyboard layouts by matching <code>event.code</code> instead of <code>event.key</code> for some shortcuts.', 'Show a "?" help dialog listing registered shortcuts.']
    }
  });

  practice.push({
    title: 'Namespaced Event Bus With Wildcards',
    level: 'Hard', tags: ['event emitter', 'pattern matching', 'design'], companies: ['Uber', 'Atlassian', 'Meta', 'Stripe'],
    statement: `<p>Extend the idea of an emitter: event names are colon-separated paths like <code>"cart:item:add"</code>. A listener pattern may use <code>*</code> to match <b>exactly one</b> segment and a final <code>**</code> to match <b>one or more</b> remaining segments. Implement <code>createBus()</code> with <code>on(pattern, fn)</code> (returns unsubscribe), <code>once(pattern, fn)</code>, and <code>emit(name, payload)</code> which calls every matching listener <b>in registration order</b> (across all patterns) with <code>(payload, name)</code> and returns how many were called. Listeners that unsubscribe during an emit must be skipped; a throwing listener must not stop the others (collect errors and rethrow an <code>AggregateError</code> at the end).</p>`,
    constraints: `Up to 10<sup>3</sup> listeners, names up to 6 segments. Emitting must not be slower than O(L × S).`,
    example: `${H.table(['Pattern', 'Matches', 'Does not match'], [['<code>cart:item:add</code>', 'cart:item:add', 'cart:item:remove'], ['<code>cart:*:add</code>', 'cart:item:add, cart:coupon:add', 'cart:add, cart:a:b:add'], ['<code>cart:**</code>', 'cart:item, cart:item:add', 'cart (needs 1+ more), user:login'], ['<code>**</code>', 'every event', '-']])}`,
    brute: { why: `<p>Converting each pattern to a regular expression by string replacement is tempting but fragile (special characters in names, <code>*</code> matching across colons by accident) and slower to reason about. A separate Map per pattern also loses the required global registration order.</p>`, code: `function matchBrute(pattern, name) {
  const re = new RegExp('^' + pattern.replace('*', '.*') + '$');   // '*' now crosses ':' boundaries, only first * replaced
  return re.test(name);
}` },
    mcq: { q: 'Does the pattern "cart:*" match "cart:item:add"?', options: ['No - * matches exactly one segment', 'Yes - * matches anything', 'Yes, but only with once', 'Only if cart is registered first'], answer: 0, explain: '"*" stands for exactly one segment, so cart:* matches cart:item but not cart:item:add. Use cart:** for that.' },
    hints: [
      `<p>Hint 1: split both the pattern and the event name on <code>":"</code> and compare them segment by segment - no regular expressions needed.</p>`,
      `<p>Hint 2: keep ONE flat array of listener records in registration order, each with pre-split segments, a <code>once</code> flag and a <code>removed</code> flag. Registration order across patterns comes for free.</p>`,
      `<p>Hint 3: recipe - <code>match(p, n)</code>: walk i over p; if <code>p[i]==="**"</code> (must be last) return <code>n.length &gt; i</code>; if i ≥ n.length return false; if <code>p[i]!=="*"</code> and ≠ n[i] return false; at the end return <code>p.length === n.length</code>. In emit, snapshot, skip removed, remove once-listeners before calling, collect errors with try/catch.</p>`
    ],
    solution: {
      approach: `<p>Segment-wise matcher + one ordered array of records. Pre-splitting patterns at registration makes emit cheap. Error isolation uses try/catch around each call and an <code>AggregateError</code> at the end.</p>`,
      code: { lang: 'js', run: true, code: `function matches(pattern, name) {                 // both are arrays of segments
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '**') return i === pattern.length - 1 && name.length > i;   // one or more, last only
    if (i >= name.length) return false;
    if (pattern[i] !== '*' && pattern[i] !== name[i]) return false;
  }
  return pattern.length === name.length;
}

function createBus() {
  const listeners = [];                           // registration order = call order
  function add(pattern, fn, once) {
    const record = { segs: pattern.split(':'), fn, once, removed: false };
    listeners.push(record);
    return () => {
      record.removed = true;
      const i = listeners.indexOf(record);
      if (i >= 0) listeners.splice(i, 1);
    };
  }
  return {
    on: (pattern, fn) => add(pattern, fn, false),
    once: (pattern, fn) => add(pattern, fn, true),
    emit(name, payload) {
      const segs = name.split(':');
      const errors = [];
      let called = 0;
      for (const rec of listeners.slice()) {      // snapshot
        if (rec.removed || !matches(rec.segs, segs)) continue;
        if (rec.once) { rec.removed = true; const i = listeners.indexOf(rec); if (i >= 0) listeners.splice(i, 1); }
        try { rec.fn(payload, name); called++; } catch (err) { errors.push(err); }
      }
      if (errors.length) throw new AggregateError(errors, errors.length + ' listener(s) failed');
      return called;
    }
  };
}

const bus = createBus();
bus.on('cart:item:add', (p, n) => console.log('exact   ', n, p));
bus.on('cart:*:add', (p, n) => console.log('one-wild ', n));
bus.on('cart:**', (p, n) => console.log('deep     ', n));
bus.once('**', (p, n) => console.log('everything (once)', n));
console.log('called', bus.emit('cart:item:add', { id: 7 }));
console.log('called', bus.emit('cart:coupon:add'));
console.log('called', bus.emit('cart'));              // too short for cart:** -> 0
bus.on('user:login', () => { throw new Error('boom'); });
bus.on('user:login', () => console.log('second listener still runs'));
try { bus.emit('user:login'); } catch (e) { console.log(e.name, '-', e.message); }` },
      complexity: `<p>Emit is O(L × S) for L listeners and S segments (matching is linear in segments). Memory O(L × S).</p>`,
      followUps: ['Index exact (no-wildcard) patterns in a Map for O(1) lookup, with wildcards in a separate list.', 'Add <code>emitAsync</code> that awaits listeners sequentially.', 'Replay the last payload to late subscribers (sticky events).']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push({
    q: `A <code>&lt;button&gt;</code> sits inside a <code>&lt;div&gt;</code>. Both have a normal <code>click</code> listener (no capture). The user clicks the button. Which runs first?`,
    options: ['The button\'s listener, then the div\'s', 'The div\'s listener, then the button\'s', 'They run at the same time', 'Only the button\'s listener runs'],
    answer: 0,
    explain: 'Normal listeners run in the bubbling phase: from the target upward. The button (target) first, then its parent div.'
  });
  quiz.push({
    q: `One click listener is on a <code>ul</code>. The user clicks a <code>span</code> inside an <code>li</code>. What are <code>event.target</code> and <code>event.currentTarget</code> inside the listener?`,
    options: ['target = span, currentTarget = ul', 'target = ul, currentTarget = span', 'target = li, currentTarget = li', 'both are the span'],
    answer: 0,
    explain: 'target is the deepest element that was hit (the span); currentTarget is the element the running listener is attached to (the ul).'
  });
  quiz.push({
    q: `What does <code>document.querySelectorAll(".item")</code> return?`,
    options: ['A static NodeList (a snapshot) that is empty if nothing matches', 'A live HTMLCollection that updates automatically', 'The first matching element or null', 'An array of strings'],
    answer: 0,
    explain: 'querySelectorAll returns a static NodeList (possibly empty, never null). getElementsByClassName is the one that returns a live HTMLCollection.'
  });
  quiz.push({
    q: `A user's comment must be shown inside a new <code>&lt;li&gt;</code>. Which is the safe way?`,
    options: ['li.textContent = comment', 'li.innerHTML = comment', 'li.insertAdjacentHTML("beforeend", comment)', 'li.outerHTML = comment'],
    answer: 0,
    explain: 'textContent stores the string as text and never parses it as HTML. The other three would parse markup and can run attacker-controlled code (XSS).'
  });
  quiz.push({
    q: `A form has two text boxes and a submit button. You must validate when the user clicks Submit <b>or</b> presses Enter inside a box. Which listener is right?`,
    options: ['submit on the form', 'click on the button', 'keyup on each input', 'change on the form'],
    answer: 0,
    explain: 'Both ways of submitting fire a submit event on the form, so one submit listener covers every path. A click listener on the button covers only the button (it is skipped by requestSubmit(), for example).'
  });
  quiz.push({
    q: `Which call stops the browser from following a link after your click handler runs?`,
    options: ['event.preventDefault()', 'event.stopPropagation()', 'event.stopImmediatePropagation()', 'return from the handler'],
    answer: 0,
    explain: 'preventDefault cancels the default action (navigation). The stop* methods only control which other listeners hear the event, and returning a value from an addEventListener handler does nothing.'
  });
  quiz.push({
    q: `Why does this fail to remove the listener? <code>el.addEventListener("click", () =&gt; go()); el.removeEventListener("click", () =&gt; go());</code>`,
    options: ['The two arrow functions are different objects, so the browser finds no match', 'removeEventListener needs a third argument', 'Arrow functions cannot be added as listeners', 'click listeners can never be removed'],
    answer: 0,
    explain: 'removeEventListener matches by function identity (and capture flag). Each arrow function expression creates a new function object. Keep a reference to the same function.'
  });
  quiz.push({
    q: `A parent has a capture listener "P-cap" and a normal listener "P-bub". Its child has a normal listener "C-bub". The child is clicked. Console order?`,
    options: ['P-cap, C-bub, P-bub', 'C-bub, P-cap, P-bub', 'P-bub, C-bub, P-cap', 'P-cap, P-bub, C-bub'],
    answer: 0,
    explain: 'Capturing goes down first (P-cap), then the target (C-bub), then bubbling goes up (P-bub).'
  });
  quiz.push({
    q: `A search box is debounced with wait = 300 ms. Keystrokes happen at 0, 100 and 200 ms and then the user stops. When does the real search function run (trailing mode)?`,
    options: ['At 500 ms, once', 'At 0, 100 and 200 ms', 'At 300 ms, once', 'At 200 ms, once'],
    answer: 0,
    explain: 'Each keystroke restarts the 300 ms timer. The last keystroke is at 200, so the timer fires at 200 + 300 = 500 ms, and the function runs once with the latest value.'
  });
  quiz.push({
    q: `You want one listener on a form to know when any input gains focus. Why does <code>form.addEventListener("focus", fn)</code> never fire for the inputs?`,
    options: ['focus does not bubble; use focusin or the capture phase', 'focus only works on buttons', 'form elements cannot have listeners', 'focus is only fired on window'],
    answer: 0,
    explain: 'focus and blur do not bubble. Their bubbling twins are focusin and focusout, or you can listen with { capture: true } on the form.'
  });
  quiz.push({
    q: `The user clicks a <code>span</code> that sits inside a <code>li.item</code>. What does <code>span.closest("li.item")</code> return?`,
    options: ['The li.item element', 'null, because span is not an li', 'The span itself', 'An empty NodeList'],
    answer: 0,
    explain: 'closest checks the element itself and then its ancestors upward and returns the first match - here the li. It returns null only when nothing matches.'
  });
  quiz.push({
    q: `In an EventEmitter, <code>emit</code> loops over <code>list.slice()</code> instead of <code>list</code>. Why?`,
    options: ['Listeners may add or remove listeners during the loop, which would skip or repeat entries in the live array', 'slice() makes the listeners run faster', 'It prevents listeners from receiving arguments', 'It sorts listeners alphabetically'],
    answer: 0,
    explain: 'A once-listener removes itself while emit is looping. Removing from the array being iterated shifts indexes and the next listener would be skipped. A snapshot gives a stable round.'
  });
  quiz.push({
    q: `Which is the best fit for updating a "reading progress" bar while the user scrolls?`,
    options: ['Throttle (ideally requestAnimationFrame), because you want steady updates while scrolling', 'Debounce, because you only care after scrolling stops', 'No limiting - run on every scroll event with heavy layout reads', 'setInterval polling every 5 ms'],
    answer: 0,
    explain: 'You want regular updates during the scroll, at a bounded rate: throttle. Debounce would update only after the user stops, so the bar would freeze while scrolling.'
  });
  quiz.push({
    q: `Which statement about <code>form.submit()</code> is true?`,
    options: ['It submits the form without running validation and without firing the submit event', 'It runs validation and fires the submit event', 'It is identical to requestSubmit()', 'It only works on GET forms'],
    answer: 0,
    explain: 'form.submit() skips both the submit event and constraint validation. Use form.requestSubmit() to behave like a real submit button click.'
  });

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push({
    level: 'B',
    q: `What is the DOM, and how is it different from the HTML file?`,
    a: `<p>The HTML file is just text sent by the server. The browser parses it and builds the <b>DOM</b> (Document Object Model): a live tree of objects in memory where every tag becomes an element node and every piece of text becomes a text node. JavaScript reads and changes this tree through APIs like <code>querySelector</code>, <code>createElement</code> and <code>append</code>, and the browser repaints when the tree changes.</p><p>It differs from the source in several ways: the parser <b>repairs</b> mistakes (inserts a <code>tbody</code>, closes unclosed tags), JavaScript can add or remove nodes so the DOM changes over time while the file does not, and the DOM includes things the source does not show (text nodes for whitespace, computed state like <code>input.value</code>). That is why DevTools' Elements panel and "View Source" can disagree.</p>`,
    followUps: ['What is the difference between a Node and an Element?', 'What is the CSSOM and how does it relate to the DOM?', 'Why is childNodes longer than children?']
  });
  interview.push({
    level: 'B',
    q: `Compare <code>getElementById</code>, <code>querySelector</code>, <code>querySelectorAll</code> and <code>getElementsByClassName</code>.`,
    a: `<p><code>getElementById</code> takes a plain id string and returns one element or <code>null</code>; it is the fastest because browsers keep an id map. <code>querySelector</code> takes any CSS selector and returns the <b>first</b> match in document order (or <code>null</code>). <code>querySelectorAll</code> returns a <b>static</b> NodeList of all matches (empty if none) - a snapshot that does not change if the page changes. <code>getElementsByClassName</code> (and <code>getElementsByTagName</code>) return a <b>live</b> HTMLCollection that updates itself when matching elements are added or removed.</p><p>In practice I use <code>querySelector(All)</code> for almost everything because one syntax covers all cases, scope it to a container (<code>form.querySelector</code>) to keep the search small, always handle <code>null</code>, and copy a live collection with <code>Array.from</code> before removing items in a loop.</p>`,
    followUps: ['How would you implement getElementsByClassName yourself?', 'What does closest() do and when do you use it?', 'Why can querySelectorAll not see inside a shadow root?']
  });
  interview.push({
    level: 'B',
    q: `Explain event bubbling and capturing. Which one is the default?`,
    a: `<p>When an event happens on an element, the browser sends it along a path through its ancestors in three phases. <b>Capturing</b>: from <code>window</code> down to the parent of the target. <b>Target</b>: the element itself. <b>Bubbling</b>: back up from the parent to <code>window</code>. A listener added with <code>addEventListener(type, fn)</code> runs in the <b>bubbling</b> phase by default; passing <code>true</code> or <code>{ capture: true }</code> makes it run during capturing.</p><p>Example: a button inside a div, with normal listeners on both - clicking the button runs the button's handler first, then the div's, because the event bubbles up. If the div uses capture, it runs before the button's. <code>event.target</code> stays the element that was hit while <code>event.currentTarget</code> changes at every stop. A few events (focus, blur, mouseenter, mouseleave) do not bubble.</p>`,
    followUps: ['At the target, do capture or normal listeners run first?', 'Which events do not bubble and what are the alternatives?', 'How do you list the exact path of an event?']
  });
  interview.push({
    level: 'B',
    q: `What is the difference between <code>preventDefault()</code>, <code>stopPropagation()</code> and <code>stopImmediatePropagation()</code>?`,
    a: `<p><code>preventDefault()</code> cancels the browser's built-in action for the event (following a link, submitting a form, typing a character, scrolling) but does <b>not</b> stop other listeners from hearing the event. <code>stopPropagation()</code> stops the event from moving on to the <b>next elements</b> on its path (for example parents during bubbling), but other listeners on the <i>current</i> element still run. <code>stopImmediatePropagation()</code> does that and also prevents the remaining listeners on the current element.</p><p>They are independent: you can use any combination. I use <code>preventDefault</code> freely when replacing default behaviour (SPA links, AJAX forms), and avoid <code>stopPropagation</code> because it hides the event from delegated handlers, analytics and "click outside" code. A narrower fix is usually checking <code>event.target</code>.</p>`,
    followUps: ['When can preventDefault silently fail (cancelable, passive)?', 'Why is return false different in jQuery and in addEventListener?', 'How do you detect that someone already prevented the default?']
  });
  interview.push({
    level: 'I',
    q: `What is event delegation? What are its advantages and pitfalls?`,
    a: `<p>Event delegation means attaching <b>one</b> listener to a common ancestor instead of one per child, and using <code>event.target</code> (usually with <code>closest()</code>) to find which child triggered it. It relies on bubbling. Advantages: fewer listeners and less memory; elements added later work automatically; nothing to clean up when children are removed; simple re-rendering because listeners are not lost with <code>innerHTML</code>.</p><p>Pitfalls: (1) <code>event.target</code> may be an inner element such as an icon, so use <code>target.closest('button.del')</code>, not <code>target === button</code>; (2) check <code>container.contains(match)</code> so you do not react to elements outside your component or in nested lists; (3) events that do not bubble (<code>focus</code>, <code>mouseenter</code>) need <code>focusin</code>/<code>mouseover</code> or capture; (4) a child that calls <code>stopPropagation</code> breaks it; (5) clickable non-button elements still need keyboard support. Frameworks such as React use this idea internally by attaching listeners at the root.</p>`,
    followUps: ['How would you delegate a hover effect?', 'How does React handle events under the hood?', 'When would you NOT use delegation?']
  });
  interview.push({
    level: 'I',
    q: `How do you handle a form submission in JavaScript, and why listen to <code>submit</code> instead of the button's <code>click</code>?`,
    a: `<p>I listen to the <b>submit event on the form</b>, call <code>event.preventDefault()</code> to stop the page reload, read values with <code>new FormData(form)</code> (or <code>Object.fromEntries(formData)</code>), validate, show errors beside the fields, focus the first invalid one, and only then send the data (for example with <code>fetch</code>), disabling the submit button while the request is pending to avoid double submits.</p><p>The <code>submit</code> event fires for every way of submitting - clicking the button, pressing Enter inside a field, or <code>form.requestSubmit()</code> - while a click listener on the button does not run for <code>requestSubmit()</code> or for forms without a submit button. Built-in validation (<code>required</code>, <code>pattern</code>, <code>type="email"</code>, <code>checkValidity()</code>, <code>setCustomValidity</code>) can be combined with custom rules. Client validation is only a convenience: the server must validate again for security.</p>`,
    followUps: ['What is the difference between form.submit() and form.requestSubmit()?', 'How does FormData treat unchecked checkboxes and repeated names?', 'How do you make validation errors accessible?']
  });
  interview.push({
    level: 'I',
    q: `Why is <code>innerHTML</code> dangerous, and what should you use instead?`,
    a: `<p><code>innerHTML</code> parses a string as HTML. If any part of that string comes from a user or an API (a comment, a name, a search term), an attacker can include markup such as <code>&lt;img src=x onerror="stealCookies()"&gt;</code> and the browser will run it - this is <b>cross-site scripting (XSS)</b>. Removing "script tags" does not help because event-handler attributes and <code>javascript:</code> URLs also execute. It is also slower for updates (re-parses and rebuilds all children) and destroys existing listeners and state inside the replaced nodes.</p><p>Use <code>textContent</code> (or <code>createElement</code> + <code>append</code>) for text, <code>setAttribute</code>/<code>dataset</code> for attributes, and <code>replaceChildren</code> with a fragment for lists. If you must render rich HTML from untrusted input, sanitise it with a vetted library such as DOMPurify and add defence in depth with a Content Security Policy and Trusted Types.</p>`,
    followUps: ['Is insertAdjacentHTML safer?', 'Is it safe to use innerHTML with a hardcoded template string?', 'How does React avoid XSS by default and where does it not (dangerouslySetInnerHTML)?']
  });
  interview.push({
    level: 'I',
    q: `Implement <code>debounce</code> and explain how it differs from <code>throttle</code>.`,
    a: `<p>Debounce delays running a function until calls have <b>stopped for N ms</b>; each new call cancels the pending timer and starts a fresh one. Throttle runs the function <b>at most once per N ms</b>, at a steady pace, ignoring the calls in between.</p><pre>function debounce(fn, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() =&gt; fn.apply(this, args), wait);
  };
}</pre><p>Use debounce for search-as-you-type, autosave and "resize finished"; use throttle for scroll, mousemove and drag where you want regular updates during the activity. Production versions add <code>leading</code>/<code>trailing</code> options, <code>cancel()</code> and <code>flush()</code>, and keep the latest <code>this</code>/arguments. Mistakes to avoid: creating the debounced function inside render or an event handler (a new timer every time, so nothing is debounced), not cancelling on unmount, and forgetting that out-of-order responses still need handling (AbortController or a request id).</p>`,
    followUps: ['What happens if you create the debounced function inside a React component body?', 'How would you add a maxWait option?', 'Why is requestAnimationFrame often a better throttle for visual work?']
  });
  interview.push({
    level: 'I',
    q: `How would you implement a simple EventEmitter? What edge cases matter?`,
    a: `<p>Keep a <code>Map</code> from event name to an ordered array of listener records. <code>on</code> pushes (and ideally returns an unsubscribe function), <code>once</code> pushes a record flagged to remove itself, <code>off</code> removes one matching listener, and <code>emit(name, ...args)</code> calls each listener in registration order and returns whether any existed.</p><p>Edge cases that separate good answers: iterate over a <b>copy</b> of the array in <code>emit</code> because listeners may add or remove listeners while it runs; remove a <code>once</code> listener <i>before</i> calling it so a re-entrant emit cannot run it twice; make <code>off</code> a no-op when nothing matches; delete empty arrays to avoid leaks; decide whether one throwing listener should stop the others (usually catch each one and report at the end); and decide sync vs async emit. In Node, <code>emit('error')</code> with no listener throws, and more than 10 listeners per event prints a leak warning.</p>`,
    followUps: ['How would you support wildcard events like "cart:*"?', 'What is the difference between pub/sub and the observer pattern?', 'How do you avoid memory leaks with subscriptions?']
  });
  interview.push({
    level: 'A',
    q: `Predict the output: two click listeners on a button, where the first calls <code>Promise.resolve().then(() =&gt; log("micro"))</code> and the second logs "second". What differs between a real user click and <code>button.click()</code>?`,
    a: `<p>With a <b>real user click</b>, after each listener returns the JavaScript stack is empty, so the engine runs a <b>microtask checkpoint</b> before invoking the next listener. The output is: first listener, <code>micro</code>, then <code>second</code>. With <code>button.click()</code> (or <code>dispatchEvent</code>) called from script, the calling code is still on the stack, so the microtask cannot run between the listeners; both listeners run first and the output is: first, second, then <code>micro</code> after the surrounding script finishes.</p><p>This shows that listeners are just function calls inside a task, and that microtask timing depends on whether the stack is empty. It matters for libraries that rely on promise timing in handlers and for tests that simulate clicks with <code>click()</code> and see a different order than users do.</p>`,
    followUps: ['Where do setTimeout callbacks run relative to these?', 'What changes if the listeners are on different elements in the path?', 'How does await inside a listener affect later listeners?']
  });
  interview.push({
    level: 'A',
    q: `How does React handle events, and how does it interact with native listeners and <code>stopPropagation</code>?`,
    a: `<p>React uses <b>event delegation with synthetic events</b>. Since React 17 it attaches its own native listeners to the <b>root container</b> (not <code>document</code>), one per event type, for both the capture and bubble phases. When a native event reaches the root, React builds the list of handlers along the component tree path (<code>onClickCapture</code> first, then <code>onClick</code> up the tree) and calls them with a <code>SyntheticEvent</code> wrapper that normalises browser differences.</p><p>Consequences: React's <code>e.stopPropagation()</code> stops React's own propagation and also calls the native one, so native bubbling listeners above the root (on <code>document</code> or <code>window</code>) do not run. Native listeners on the target or on elements inside the root have already run by the time React sees the event, and other native listeners on the root container itself still run. Without a <code>stopPropagation</code> call, a native <code>document.addEventListener('click')</code> runs after React's handlers. Listeners you attach yourself to <code>window</code>/<code>document</code> must be added and removed in <code>useEffect</code> with cleanup. Events like <code>onFocus</code>/<code>onBlur</code> in React do bubble (they map to <code>focusin</code>/<code>focusout</code>), which is different from the native <code>focus</code>.</p>`,
    followUps: ['Why did React 17 move the listeners from document to the root?', 'What are portals and how do events bubble through them?', 'How would you do a "click outside" hook correctly in React?']
  });
  interview.push({
    level: 'A',
    q: `What are passive event listeners and what is layout thrashing? How do they relate to scroll performance?`,
    a: `<p>Scrolling can run on the compositor thread without waiting for JavaScript - unless a <code>touchstart</code>/<code>touchmove</code>/<code>wheel</code> listener might call <code>preventDefault()</code> to cancel it. The browser then has to wait for the listener on every scroll step, causing jank. A <b>passive</b> listener (<code>{ passive: true }</code>) promises it will not call <code>preventDefault</code>, so scrolling proceeds immediately; Chrome and others make these listeners passive by default on window, document and body. If you really need to cancel, use <code>{ passive: false }</code> or CSS <code>touch-action</code>.</p><p><b>Layout thrashing</b> is a different problem: interleaving DOM reads that force layout (<code>offsetHeight</code>, <code>getBoundingClientRect</code>, <code>scrollTop</code>) with writes (style changes) makes the browser recalculate layout synchronously many times per frame. Fix it by batching: read everything first, then write; use <code>requestAnimationFrame</code>; throttle high-frequency handlers; avoid doing heavy work inside scroll handlers (INP and long tasks).</p>`,
    followUps: ['Which properties force a synchronous layout?', 'How would you measure jank (Performance panel, long tasks, INP)?', 'Why is IntersectionObserver better than a scroll listener for lazy loading?']
  });
  interview.push({
    level: 'A',
    q: `A click handler "does not fire". Walk me through how you would debug it.`,
    a: `<p>I narrow it down step by step. (1) <b>Is the listener attached?</b> Inspect the element in DevTools → Event Listeners panel (check it is the right element and event type; maybe the element was replaced by <code>innerHTML</code> after I attached it). Add a <code>console.log</code> or <code>debugger</code> at the top of the handler. (2) <b>Is the event reaching it?</b> Add a capture listener on <code>window</code> to see if the click happens at all and what <code>event.target</code> is; another element (an invisible overlay, a pseudo-element, <code>pointer-events: none</code>, a higher z-index) may be receiving the click. (3) <b>Did something stop it?</b> Search for <code>stopPropagation</code>/<code>stopImmediatePropagation</code> in capture handlers on ancestors, including third-party scripts. (4) <b>Is it the wrong phase or event?</b> Non-bubbling events (focus) with delegation; <code>mouseenter</code> vs <code>mouseover</code>. (5) <b>Is the element disabled</b> or inside a disabled fieldset (no click events)? (6) <b>Errors earlier in the script</b> stopped the listener from ever being registered - check the console, and make sure the script runs after the DOM exists (<code>defer</code>/module). (7) For delegation: is <code>closest</code> returning null because the selector is wrong or the match is outside the container?</p>`,
    followUps: ['How do you find which listener called stopPropagation?', 'What does getEventListeners(el) do in the DevTools console?', 'How would you test this with Playwright or Testing Library?']
  });
  interview.push({
    level: 'E',
    q: `You are building a component library (dropdowns, modals, tooltips) used across many teams, some inside Shadow DOM. How do you design its event handling?`,
    a: `<p>Principles: <b>don't fight the platform</b> and <b>never take away events from others</b>. Prefer real elements (<code>button</code>, <code>dialog</code>, popover API) so keyboard and accessibility come for free. Use delegation inside a component (one listener per component root) and listen to bubbling events instead of attaching to many children. Expose behaviour through <b>custom events</b> (<code>new CustomEvent('menu:select', { detail, bubbles: true, composed: true })</code>) - <code>composed</code> lets them cross shadow boundaries, and <code>cancelable</code> lets consumers veto an action with <code>preventDefault</code>.</p><p>Avoid <code>stopPropagation</code> (it breaks consumers' analytics and outside-click logic); use <code>contains</code> checks and <code>event.composedPath()</code> instead, because inside shadow DOM <code>event.target</code> is retargeted to the host. Add document/window listeners only while a popup is open and tie them to an <code>AbortController</code> so close/unmount removes them; use <code>{ passive: true }</code> where possible; use <code>focusin</code>/<code>focusout</code> with <code>relatedTarget</code> for focus tracking; handle Escape, focus return and focus trapping; test with keyboard, touch, pointer and screen readers; document the event names and payloads as part of the public API and keep them stable. For portals, remember events bubble through the React tree but not the DOM tree, so test both.</p>`,
    followUps: ['What does composed do and what is retargeting?', 'How do you make a click-outside work across shadow roots?', 'Would you use a global event bus in a library? Why or why not?']
  });
  interview.push({
    level: 'A',
    q: `What is <code>event.isTrusted</code>, and why can't a script just call <code>click()</code> to do anything a real click can?`,
    a: `<p><code>event.isTrusted</code> is <code>true</code> only for events generated by the user agent in response to real user actions, and <code>false</code> for events created by script (<code>new Event</code>, <code>dispatchEvent</code>, and in most cases <code>el.click()</code>). Browsers use this to protect sensitive actions: popups, file pickers, fullscreen, clipboard access, audio autoplay and payment sheets require <b>transient user activation</b> - a recent trusted gesture - so a script cannot open dozens of windows or read the clipboard on its own.</p><p>For developers this means synthetic events are perfect for tests and for talking between your own components, but they will not satisfy browser security rules. Libraries and tests that fire <code>dispatchEvent(new MouseEvent('click'))</code> may see different behaviour from a real click (default actions such as following a link do run for <code>el.click()</code>, but typing or text selection defaults do not for synthetic key events). Real-browser end-to-end tools (Playwright, Cypress) drive input through the browser to get trusted events.</p>`,
    followUps: ['What is transient user activation and how long does it last?', 'Can a page forge a trusted event? Why not?', 'How would you test a file-upload button that opens the file picker?']
  });

  /* ----------------------------------------------------------------------
     Housekeeping: order interview questions B -> I -> A -> E, and rotate the
     options of every multiple-choice question so the right answer is not
     always in the same slot (the explanation always matches the content).
     ---------------------------------------------------------------------- */
  var LV = { B: 0, I: 1, A: 2, E: 3 };
  interview = interview.map(function (q, i) { return { q: q, i: i }; })
    .sort(function (a, b) { return (LV[a.q.level] - LV[b.q.level]) || (a.i - b.i); })
    .map(function (x) { return x.q; });
  function rotate(mc, k) {
    var n = mc.options.length, r = (k * 3 + (k >> 2)) % n;
    if (!r) return;
    mc.options = mc.options.slice(r).concat(mc.options.slice(0, r));
    mc.answer = (mc.answer - r + n) % n;
  }
  var mcCount = 0;
  quiz.forEach(function (q) { rotate(q, mcCount++); });
  practice.forEach(function (p) { rotate(p.mcq, mcCount++); });
  topics.forEach(function (t) { (t.problems || []).forEach(function (p) { rotate(p.mcq, mcCount++); }); });

  registerModule({
    id: 'fe04',
    title: 'DOM & Events',
    intro: `<p>The DOM is the bridge between your JavaScript and what the user sees and touches. In this module you learn how the browser turns HTML into a <b>tree of objects</b>, how to <b>find, create, change and remove</b> elements, and how <b>events</b> travel through that tree - first down (capturing), then up (bubbling). From those two ideas you get the tools every frontend developer uses daily: <b>event delegation</b>, <code>preventDefault</code> and <code>stopPropagation</code>, solid <b>form handling</b> and validation, and small utilities such as an <b>event emitter</b>, <b>debounce</b> and <b>throttle</b>.</p>
      <p>It is a favourite interview area because the questions are short but reveal real understanding: "predict the console order", "build a todo list with one listener", "stop this form submit", "implement debounce". Every topic starts with an everyday analogy, then a step-by-step visualizer, runnable code, worked examples, deep dives and a look at how AI changes the work. Frameworks like React are built on exactly these ideas, so this module makes them easier too.</p>`,
    goals: [
      'Explain the DOM as a tree and find any element with <code>querySelector(All)</code>, <code>closest</code> and tree traversal - including static vs live collections',
      'Create, edit, move and remove elements safely (<code>textContent</code> over <code>innerHTML</code>) and batch changes with fragments',
      'Predict the exact console order of nested handlers using the capture → target → bubble model, and draw the event path by hand',
      'Build lists, tabs, accordions and menus with <b>one delegated listener</b> using <code>event.target.closest()</code>',
      'Use <code>preventDefault</code>, <code>stopPropagation</code> and <code>stopImmediatePropagation</code> correctly, and know why <code>stopPropagation</code> is a last resort',
      'Handle forms end to end: <code>submit</code> event, <code>FormData</code>, built-in and custom validation, accessible errors, double-submit protection',
      'Implement an <b>EventEmitter</b>, <b>debounce</b> and <b>throttle</b> from scratch and apply them (search-as-you-type, scroll, stale responses)'
    ],
    prereqs: `Frontend modules 1-3 (How the Web Works, HTML Fundamentals, CSS Basics) and basic JavaScript: functions, arrays/objects, arrow functions and closures (see the JavaScript track, modules on functions and closures).`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
