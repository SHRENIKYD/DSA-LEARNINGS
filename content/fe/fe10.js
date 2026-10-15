(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* ---------- shared helper: a tiny rule-based state classifier (used by the T1 visualizer) ---------- */
var STATE_RULES = [
  { kind: 'derived', re: /total|count|subtotal|filtered/i, home: 'compute during render' },
  { kind: 'server', re: /product|order|catalog|price|inventory|profile|comments/i, home: 'server cache (React Query)' },
  { kind: 'url', re: /filter|page|sort|tab|search/i, home: 'URL search params' },
  { kind: 'form', re: /form|draft|input/i, home: 'form library' },
  { kind: 'local', re: /open|modal|hover|focus|toggle|menu|tooltip/i, home: 'useState in the component' },
  { kind: 'global', re: /theme|dark|cart|auth|token|locale|toast/i, home: 'global client store' }
];
function classifyStateName(name) {
  for (var i = 0; i < STATE_RULES.length; i++) {
    if (STATE_RULES[i].re.test(name)) return { kind: STATE_RULES[i].kind, home: STATE_RULES[i].home };
  }
  return { kind: 'local', home: 'useState (start small)' };
}

/* =====================================================================
   TOPIC 1: Local vs global vs server state
   ===================================================================== */
topics.push({
  title: 'Local vs Global vs Server State: Where Does This Data Live?',
  analogy: `<p>Think of a family home. A <b>sticky note on your own desk</b> ("buy milk") is <b>local state</b>: only you need it. The <b>whiteboard in the hallway</b> ("Dad's birthday Sunday") is <b>global state</b>: everyone walks past it. The <b>bank statement</b> is <b>server state</b>: the bank owns the truth, you only hold a photocopy, and the copy goes out of date the moment you stop looking. Most frontend pain comes from treating a bank statement like a sticky note.</p>`,
  explain: `<p>🟢 <b>The big idea:</b> not all "state" is the same kind of thing. Before you reach for Redux, ask <i>who owns this data and who needs it?</i></p>
    ${H.table(['Kind', 'Example (shopping app)', 'Who owns it?', 'Best home'], [
      ['<b>Local UI state</b>', 'Is the size dropdown open?', 'One component', '<code>useState</code> next to the component'],
      ['<b>Shared client state</b>', 'Cart contents, dark mode, logged-in user', 'The browser (no server copy yet)', 'Context, Zustand or Redux Toolkit'],
      ['<b>Server state</b>', 'Product list, order history', 'The server / database', 'React Query, SWR, RTK Query'],
      ['<b>URL state</b>', 'Search text, sort order, page number', 'The address bar', '<code>useSearchParams</code> / router'],
      ['<b>Form state</b>', 'Half-typed checkout form', 'The form', 'React Hook Form (or <code>useState</code> for tiny forms)'],
      ['<b>Derived state</b>', 'Cart total, "3 items" badge', 'Nobody, it is a calculation', 'Compute during render. Never store it.']
    ])}
    <p>🔵 <b>The ladder (climb only when you must):</b></p>
    <ol>
      <li><b>Derive it</b> from other state. No new state at all.</li>
      <li><b>Keep it local</b> in the component that uses it.</li>
      <li><b>Lift it up</b> to the nearest common parent if two siblings need it.</li>
      <li><b>Share it</b> with Context or a small store if it is needed far apart in the tree.</li>
      <li><b>Cache it</b> with a server-state library if it comes from an API.</li>
    </ol>
    <p>The most common beginner mistake is step 5 done by hand: <code>fetch</code> in <code>useEffect</code>, copy the result into Redux, and then write loading, error, refetch and "is it stale?" logic yourself. Server state has its own problems (staleness, caching, deduping, retries, background refresh) and libraries solve all of them for you.</p>
    <p>🔵 <b>Two golden rules:</b> (1) <span class="c-g">one source of truth</span> per fact, never copy it into a second place; (2) <span class="c-g">keep state as close as possible</span> to where it is used (this is called <i>colocation</i>).</p>`,
  clues: [
    '"Where would you store the cart / the logged-in user / the product list?" → they want you to <b>separate client state from server state</b>',
    '"We put everything in Redux and it is a mess" → classify state, move API data to React Query',
    '"The list is stale after I edit an item" → that is a <b>server state</b> problem, not a Redux problem',
    '"Filters should survive a page refresh / be shareable by link" → <b>URL state</b>',
    '"Total price is out of sync with items" → you stored <b>derived state</b>; compute it instead',
    '"Two far-apart components need the same value" → shared client state (Context or a store)'
  ],
  code: [{
    lang: 'js', run: true, title: 'A tiny rule-based state classifier (runnable)',
    code: `// Where should each piece of state live? Rules are checked top to bottom.
const RULES = [
  { kind: 'derived', test: /total|count|subtotal|filtered/i, home: 'compute during render' },
  { kind: 'server',  test: /product|order|catalog|price|inventory|profile|comments/i, home: 'server cache (React Query)' },
  { kind: 'url',     test: /filter|page|sort|tab|search/i, home: 'URL search params' },
  { kind: 'form',    test: /form|draft|input/i, home: 'form library' },
  { kind: 'local',   test: /open|modal|hover|focus|toggle|menu|tooltip/i, home: 'useState in the component' },
  { kind: 'global',  test: /theme|dark|cart|auth|token|locale|toast/i, home: 'global client store' }
];

function classify(name) {
  const rule = RULES.find((r) => r.test.test(name));
  // Default is LOCAL: start small, promote later only if you have to.
  return rule ? { name, kind: rule.kind, home: rule.home } : { name, kind: 'local', home: 'useState (start small)' };
}

const wanted = ['cart items', 'isMenuOpen', 'product list', 'search filter', 'dark mode', 'checkout form', 'cart total'];
wanted.map(classify).forEach((c) => console.log(c.name.padEnd(14), '->', c.kind.padEnd(8), '|', c.home));`
  }],
  viz: {
    title: 'Sort each piece of state into its home',
    input: 'cart items, isMenuOpen, product list, search filter, dark mode, checkout form, cart total',
    inputLabel: 'State names of a shopping app (comma separated, 3 to 10)',
    gen: function (input) {
      var items = String(input).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (items.length < 3) throw new Error('Enter at least 3 names separated by commas, e.g. cart items, isMenuOpen, product list');
      if (items.length > 10) throw new Error('Use at most 10 names');
      var frames = [], rows = [], counts = { local: 0, global: 0, server: 0, url: 0, form: 0, derived: 0 };
      frames.push({
        narr: 'We have <b>' + items.length + '</b> pieces of state. For each one we ask: <i>who owns it, and who needs it?</i> Then we give it the <b>smallest</b> home that works.',
        parts: [
          { type: 'table', label: 'The six kinds of state', columns: ['kind', 'owner', 'home'], rows: [
            ['local', 'one component', 'useState'], ['global', 'the browser', 'Zustand / Redux / Context'], ['server', 'the backend', 'React Query / SWR'],
            ['url', 'the address bar', 'search params'], ['form', 'the form', 'React Hook Form'], ['derived', 'nobody', 'compute in render']
          ] },
          { type: 'vars', label: 'Items to place', vals: { items: items.length } }
        ]
      });
      items.forEach(function (name) {
        var c = classifyStateName(name);
        counts[c.kind]++;
        rows.push([name, c.kind, c.home]);
        var why = {
          local: 'Only this component cares, so a plain <code>useState</code> is enough.',
          global: 'Many far-apart components need it and the server does not own it: a shared client store.',
          server: 'The backend owns it. We only hold a cached copy that can go stale, so use a server-state cache.',
          url: 'It should survive refresh and be shareable as a link, so it belongs in the URL.',
          form: 'It is half-typed input with validation and touched/dirty flags: a form library.',
          derived: 'It can be calculated from other state, so <b>do not store it</b>. Compute it while rendering.'
        }[c.kind];
        frames.push({
          narr: '<b>' + H.esc(name) + '</b> is <b>' + c.kind + '</b> state. ' + why,
          parts: [
            { type: 'table', label: 'Placement so far', columns: ['state', 'kind', 'home'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[rows.length - 1] = c.kind === 'derived' ? 'bad' : 'cur'; return h; })() },
            { type: 'vars', label: 'Counts', vals: { local: counts.local, global: counts.global, server: counts.server, url: counts.url, form: counts.form, derived: counts.derived } }
          ]
        });
      });
      frames.push({
        narr: 'Result: only <b>' + counts.global + '</b> of ' + items.length + ' items needed a global client store. Beginners often put <b>all</b> of them in Redux. Server data goes to a cache, derived data is not stored at all.',
        parts: [
          { type: 'table', label: 'Final map', columns: ['state', 'kind', 'home'], rows: rows, hl: {} },
          { type: 'text', html: '<b>Rule of thumb:</b> if you can derive it, derive it. If the server owns it, cache it. If one component uses it, keep it local. Only the rest earns a global store.' }
        ]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'Classifying a product page',
      html: `<p>A product page has: the product details, the selected size, whether the "size guide" modal is open, the quantity input, the cart count in the header, and the "similar items" list.</p>
        ${H.table(['State', 'Kind', 'Why'], [
          ['Product details', '<span class="c-b">server</span>', 'From the API; can change on the server.'],
          ['Selected size', '<span class="c-g">local</span>', 'Only this page needs it until "Add to cart".'],
          ['Size guide modal open', '<span class="c-g">local</span>', 'Pure UI, nobody else cares.'],
          ['Quantity input', '<span class="c-y">form</span>', 'A tiny input; useState is fine.'],
          ['Cart count (header)', '<span class="c-r">derived</span>', 'cart.items.length, never stored separately.'],
          ['Similar items', '<span class="c-b">server</span>', 'Another API call with its own cache key.']
        ])}
        <p>Notice that only the <b>cart</b> itself is shared client state. Everything else is local, server or derived.</p>`
    },
    {
      title: 'The derived-state bug (total drifts out of sync)',
      html: `<p>A common bug: storing <code>total</code> next to <code>items</code>. Every place that changes <code>items</code> must remember to update <code>total</code>. One forgotten place and the screen lies.</p>
        <p><span class="c-r">Bad:</span> <code>{ items: [...], total: 120 }</code> and you must keep both in sync.<br><span class="c-g">Good:</span> store only <code>items</code> and compute <code>total = items.reduce(...)</code> whenever you need it. Always right, nothing to forget.</p>`,
      code: {
        lang: 'js', run: true, title: 'Derive, do not store',
        code: `const items = [{ name: 'Shoe', price: 50, qty: 2 }, { name: 'Hat', price: 20, qty: 1 }];

// DERIVED values: computed from items every time. No second source of truth.
const total = (list) => list.reduce((sum, it) => sum + it.price * it.qty, 0);
const count = (list) => list.reduce((sum, it) => sum + it.qty, 0);

console.log('total =', total(items), '| count =', count(items));
items[0].qty = 3; // the only thing we changed
console.log('total =', total(items), '| count =', count(items), '(still correct, nothing to sync)');`
      }
    },
    {
      title: 'URL as state: a filter you can share',
      html: `<p>A shopper filters shoes by <i>size 42</i> and <i>sort by price</i>. If this lives in <code>useState</code>, refresh loses it and sending the link to a friend shows the default page. If it lives in the URL (<code>/shoes?size=42&amp;sort=price</code>) the browser's back button, refresh and share all work for free.</p>
        <p>Rule: <b>if a user would reasonably want to bookmark or share the screen, that state belongs in the URL.</b></p>`,
      code: {
        lang: 'jsx', check: false, title: 'URL state with React Router',
        code: `import { useSearchParams } from 'react-router-dom';

function ShoeFilters() {
  // The URL IS the state. No useState, no sync code.
  const [params, setParams] = useSearchParams();
  const size = params.get('size') ?? 'all';

  return (
    <select value={size} onChange={(e) => setParams({ size: e.target.value })}>
      <option value="all">All sizes</option>
      <option value="42">42</option>
    </select>
  );
}`
      }
    }
  ],
  deepDive: `<p>🟣 <b>Why separate server state?</b> Server state is <i>remote</i> (you do not own it), <i>asynchronous</i> (it needs loading and error states), and <i>shared and changeable</i> (someone else can change it any time). That means it can be <b>stale</b> without you knowing. Client state is synchronous and owned by you. Mixing them leads to hand-written loading flags, duplicated copies and "why is this list old?" bugs. Tools like React Query model server state as a <b>cache with an expiry policy</b>, which is a much better mental model than "a variable".</p>
    <p>🟣 <b>State machines beat boolean soup.</b> If you have <code>isLoading</code>, <code>isError</code>, <code>isSuccess</code> as three booleans you can reach impossible combinations (loading and error at the same time). Prefer one <code>status</code> value: <code>'idle' | 'loading' | 'success' | 'error'</code>. Libraries expose exactly that.</p>
    <p>🟣 <b>Colocation and lifting.</b> Put state as low as possible. When two siblings need it, lift it to their parent. Reach for Context or a store only when passing props through many layers ("prop drilling") hurts. Premature global state makes every component depend on every other.</p>
    <p>🟣 <b>2026 reality.</b> With React Server Components and frameworks like Next.js, a lot of "server state" never reaches the client at all: the server renders it. What is left on the client is mostly interaction state (local), the cart-like shared state, and cached client fetches. React 19 also adds <code>useOptimistic</code> and <code>useActionState</code> for common form and mutation flows, so you need less hand-rolled state than you did in 2020.</p>
    <p>🟣 <b>Immutability.</b> React compares state with <code>Object.is</code>. If you mutate an array in place and set the same reference, React sees "no change" and skips the update. Always create a new array/object (<code>[...items, x]</code>) or use a library like Immer that does it for you.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> assistants happily generate a Redux store with a slice per API endpoint, because that is what millions of old tutorials do. In 2026 that is usually the wrong default: the better answer is "React Query for server data, <code>useState</code> for local UI, a tiny store for the cart".</p>
    <p><b>Use AI as a partner:</b> paste your component tree and ask <code>Classify each piece of state as local, shared client, server, URL, form or derived, and tell me which ones I am duplicating</code>. It is good at spotting copies and derived values. Ask it to <i>argue against</i> your global store.</p>
    <p><b>Where AI goes wrong:</b> it stores derived values (<code>total</code>, <code>filteredItems</code>) in state, copies props into state ("initial value" bug), and puts API responses straight into Redux without a cache policy.</p>
    <p><b>What you must still own:</b> deciding the <i>owner</i> of every fact and explaining the trade-offs in an interview. A model cannot know which data your product team wants shareable by URL.</p>`,
  problems: [{
    title: 'Classify the State of a Shopping App',
    level: 'Easy', tags: ['state', 'architecture', 'react'], companies: ['Amazon', 'Flipkart', 'Shopify'],
    statement: `<p>You are reviewing a shopping app. Write <code>placeState(name)</code> that returns where each piece of state should live: <code>'local'</code>, <code>'global'</code>, <code>'server'</code>, <code>'url'</code>, <code>'form'</code> or <code>'derived'</code>. Then print the placement for these names: <i>cart items, product list, isDropdownOpen, selected sort, auth user, checkout form, cart total, order history</i>.</p>`,
    constraints: `Use simple keyword rules (no AI/ML). Rules are checked in order. Unknown names default to <code>'local'</code>.`,
    example: `<p>Input <code>cart total</code> → ${H.c('g', 'derived')} (it is a calculation).<br>Input <code>product list</code> → ${H.c('b', 'server')}.<br>Input <code>isDropdownOpen</code> → ${H.c('g', 'local')}.</p>
      <p><b>Why:</b> the total can be computed from the items, so storing it would create a second source of truth. The product list is owned by the backend.</p>`,
    brute: {
      why: `<p>The naive approach: put <b>every</b> piece of state into one global Redux store, including API data, the open/closed dropdown and the total. Problems: unrelated components re-render, you hand-write loading and refetch logic, and <code>total</code> can drift out of sync with <code>items</code>.</p>`,
      code: `// Everything in one global object (what NOT to do)
const globalStore = {
  cartItems: [], cartTotal: 0,           // total is derived: drifts
  productList: [], productListLoading: false, productListError: null, // server state by hand
  isDropdownOpen: false,                 // local UI state in a global store
  selectedSort: 'price',                 // lost on refresh, not shareable
  checkoutForm: { email: '', address: '' }
};
console.log(Object.keys(globalStore).length + ' keys, all global');`
    },
    mcq: { q: 'The "cart total" is needed in the header and on the checkout page. Where should it live?', options: ['In Redux next to the items so both can read it', 'Nowhere: compute it from the items wherever it is needed', 'In a React Query cache entry'], answer: 1, explain: 'It is derived state. Both places call the same small function (or a memoized selector) on the items. Storing it creates a second copy that can disagree with the items.' },
    hints: [
      `<p>Hint 1: ask "<i>can this be computed from something else?</i>" first. If yes, it is derived and gets no home at all.</p>`,
      `<p>Hint 2: an ordered list of regular-expression rules is enough. Put the most specific rule (derived) before the broad ones, because "cart total" also contains "cart".</p>`,
      `<p>Hint 3: recipe: loop through <code>RULES</code>, return the first <code>kind</code> whose regex matches, else <code>'local'</code>. Then <code>map</code> over the names and print.</p>`
    ],
    solution: {
      approach: `<p>Use an ordered rule list. Derived is checked first so "cart total" does not fall into "global". Server is checked before URL so "product list" is not mistaken for a UI filter. The default is local, because starting small and promoting later is cheaper than starting global.</p>`,
      code: {
        lang: 'js', run: true,
        code: `const RULES = [
  ['derived', /total|count|subtotal|filtered/i],
  ['server',  /product|order|catalog|price|inventory|profile|comments/i],
  ['url',     /filter|page|sort|tab|search/i],
  ['form',    /form|draft|input/i],
  ['local',   /open|modal|hover|focus|toggle|menu|tooltip|dropdown/i],
  ['global',  /theme|dark|cart|auth|token|locale|toast/i]
];

function placeState(name) {
  for (const [kind, re] of RULES) if (re.test(name)) return kind;
  return 'local'; // default: start small
}

const names = ['cart items', 'product list', 'isDropdownOpen', 'selected sort', 'auth user', 'checkout form', 'cart total', 'order history'];
for (const n of names) console.log(n.padEnd(16), '->', placeState(n));`
      },
      dry: { head: ['name', 'rule that matches first', 'result'], rows: [['cart total', 'derived (/total/)', '<span class="c-r">derived</span>'], ['product list', 'server (/product/)', '<span class="c-b">server</span>'], ['selected sort', 'url (/sort/)', '<span class="c-y">url</span>'], ['auth user', 'global (/auth/)', '<span class="c-g">global</span>']] },
      complexity: `<p>O(R) per name for R rules (tiny). The point is the <b>decision order</b>, not the speed.</p>`,
      followUps: ['Where would a "recently viewed products" list live if it must survive refresh?', 'How would you handle the "selected sort" if it is also sent to the API as a query parameter?']
    }
  }]
});
/* =====================================================================
   TOPIC 2: Context pitfalls
   ===================================================================== */
topics.push({
  title: 'React Context and Its Pitfalls (the Re-render Storm)',
  analogy: `<p>Context is like a <b>loudspeaker in an office</b>. Anyone can tune in without a message being passed desk to desk (no prop drilling). But the speaker has <b>one channel</b>: if the manager announces "lunch is here" and also "printer is broken" on the same channel, <i>everybody</i> who tuned in looks up for <i>both</i> announcements, even if they only care about lunch. Fix: give the office <b>two channels</b>.</p>`,
  explain: `<p>🟢 <b>What Context does.</b> <code>createContext</code> + a <code>Provider</code> lets any component below read a value with <code>useContext</code>, no matter how deep. It is a <b>delivery tube</b>, not a state manager. The state still lives in <code>useState</code> or <code>useReducer</code> inside the provider.</p>
    <p>🔵 <b>The one rule that explains every pitfall:</b> when the Provider's <code>value</code> changes (checked with <code>Object.is</code>), <b>every component that calls <code>useContext</code> for that context re-renders</b>, even if it only uses a tiny part of the value. There is no way to say "only tell me if <code>user.name</code> changed".</p>
    ${H.table(['Pitfall', 'What happens', 'Fix'], [
      ['New object each render: <code>value={{ a, b }}</code>', 'Provider re-renders for any reason (even an unrelated parent update) → new object → all consumers re-render', 'Wrap in <code>useMemo</code>'],
      ['One giant context (cart + search + theme + user)', 'Typing in the search box re-renders the cart badge', 'Split into several small contexts'],
      ['State and the setter in one value', 'Components that only <i>call</i> <code>setX</code> still re-render when state changes', 'Separate <code>StateContext</code> and <code>DispatchContext</code> (setters never change)'],
      ['Frequently changing data (mouse position, timers)', 'Whole subtree storm at 60 times per second', 'Do not put it in Context. Use a store with selectors (Zustand) or a ref'],
      ['Provider too high in the tree', 'Every page reads from a context only one page needs', 'Put the Provider as low as possible']
    ])}
    <p>🔵 <b>What does NOT re-render?</b> Components that do not call <code>useContext</code> and that receive the same <code>children</code> prop element. When the Provider re-renders because of its own state, the <code>children</code> it was handed are the <i>same objects</i>, so React skips them. Only the consumers wake up. That is why the fan-out below shows only consumers lighting up.</p>
    <p>🔵 <b>When is Context the right tool?</b> For values that change <i>rarely</i> and are needed <i>widely</i>: theme, locale, current user, a router, feature flags. For values that change often or need fine-grained subscriptions, use a store.</p>`,
  clues: [
    '"Typing in a search box makes the whole app laggy" → one big Context value changing on every keystroke',
    '"Why does my header re-render when I change the theme?" → it consumes the context (that part is expected); ask whether it should',
    '"Is Context a replacement for Redux?" → no: Context only <b>distributes</b> a value; it has no selectors, no middleware, no devtools',
    '"Prop drilling through 5 layers" → Context (or composition with <code>children</code>) is the standard fix',
    '"value={{ user, setUser }}" in an interview snippet → look for the <b>new object every render</b> problem',
    '"useMemo / split context / selector" → they want to hear how you limit consumer re-renders'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Why a fresh object breaks Context (runnable)',
      code: `// React decides "did the Provider value change?" with Object.is.
// An object literal is a brand new object each time the code runs.
const render1 = { cart: 2, search: 'sh' };
const render2 = { cart: 2, search: 'sh' }; // same content, new object
console.log('Same content, Object.is =', Object.is(render1, render2)); // false -> consumers re-render

// useMemo gives back the SAME object until dependencies change.
function makeMemo() {
  let last = null, lastDeps = [];
  return function memo(factory, deps) {
    const same = last && deps.length === lastDeps.length && deps.every((d, i) => Object.is(d, lastDeps[i]));
    if (!same) { last = factory(); lastDeps = deps; }
    return last;
  };
}
const useMemo = makeMemo();
const a = useMemo(() => ({ cart: 2, search: 'sh' }), [2, 'sh']);
const b = useMemo(() => ({ cart: 2, search: 'sh' }), [2, 'sh']); // parent re-rendered, deps same
console.log('Memoized, Object.is =', Object.is(a, b)); // true -> consumers skip`
    },
    {
      lang: 'jsx', check: false, title: 'The storm (bad) vs the fix (good)',
      code: `import { createContext, useContext, useMemo, useState } from 'react';

/* ---------- BAD: one context, new object each render ---------- */
const AppContext = createContext(null);
function BadProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  // new object on EVERY render of BadProvider -> every consumer re-renders
  return (
    <AppContext.Provider value={{ cart, setCart, search, setSearch }}>
      {children}
    </AppContext.Provider>
  );
}

/* ---------- GOOD: split by change-frequency + memoize ---------- */
const CartContext = createContext(null);
const SearchContext = createContext(null);

function GoodProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');

  const cartValue = useMemo(() => ({ cart, setCart }), [cart]);
  const searchValue = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <CartContext.Provider value={cartValue}>
      <SearchContext.Provider value={searchValue}>
        {children /* same element reference -> not re-rendered by the provider */}
      </SearchContext.Provider>
    </CartContext.Provider>
  );
}

function CartBadge() {
  const { cart } = useContext(CartContext); // typing in search no longer touches this
  return <span>{cart.length}</span>;
}`
    }
  ],
  viz: {
    title: 'Context re-render fan-out',
    input: 'one',
    inputLabel: 'Mode: one (single context, new object each render) | memo (single context + useMemo) | split (two contexts + useMemo)',
    gen: function (input) {
      var mode = String(input).trim().toLowerCase();
      if (['one', 'memo', 'split'].indexOf(mode) < 0) throw new Error('Type one, memo or split');
      var labels = ['App (Provider)', 'Header', 'Main', 'Logo', 'CartBadge', 'SearchBox', 'Footer'];
      // consumers: index 4 CartBadge (needs cart), index 5 SearchBox (needs search)
      var events = [
        { name: 'You type "s" in the search box', changes: 'search', needs: 5 },
        { name: 'You add a shoe to the cart', changes: 'cart', needs: 4 },
        { name: 'A parent re-renders for an unrelated reason', changes: 'none', needs: -1 }
      ];
      var renders = { CartBadge: 0, SearchBox: 0 }, wasted = 0, frames = [];
      var modeText = mode === 'one' ? 'ONE context, value={{cart, search}} created fresh every render' : mode === 'memo' ? 'ONE context, value wrapped in useMemo' : 'TWO contexts (cart, search), each wrapped in useMemo';
      frames.push({
        narr: 'Mode: <b>' + modeText + '</b>. Only <b>CartBadge</b> and <b>SearchBox</b> call <code>useContext</code>. Logo, Header, Main and Footer do not.',
        parts: [
          { type: 'tree', label: 'Component tree', arr: labels, hl: { 4: 'win', 5: 'win' }, tags: { 4: 'reads cart', 5: 'reads search' } },
          { type: 'vars', label: 'Render counts of consumers', vals: { CartBadge: 0, SearchBox: 0, wastedRenders: 0 } }
        ]
      });
      events.forEach(function (ev) {
        // does the context value identity change for each consumer?
        var cartChanged, searchChanged;
        if (mode === 'one') { cartChanged = searchChanged = true; }                    // new object every provider render
        else if (mode === 'memo') { cartChanged = searchChanged = ev.changes !== 'none'; } // same object unless real change
        else { cartChanged = ev.changes === 'cart'; searchChanged = ev.changes === 'search'; }
        var hl = {}, tags = { 4: 'reads cart', 5: 'reads search' }, notes = [];
        if (cartChanged) { renders.CartBadge++; hl[4] = ev.needs === 4 ? 'ok' : 'bad'; if (ev.needs !== 4) { wasted++; notes.push('CartBadge re-rendered for nothing'); } else notes.push('CartBadge needed this update'); tags[4] = 'x' + renders.CartBadge + (ev.needs === 4 ? '' : ' wasted'); }
        if (searchChanged) { renders.SearchBox++; hl[5] = ev.needs === 5 ? 'ok' : 'bad'; if (ev.needs !== 5) { wasted++; notes.push('SearchBox re-rendered for nothing'); } else notes.push('SearchBox needed this update'); tags[5] = 'x' + renders.SearchBox + (ev.needs === 5 ? '' : ' wasted'); }
        if (!cartChanged && !searchChanged) notes.push('no consumer re-rendered. The Provider re-ran but the value is the same object');
        frames.push({
          narr: '<b>' + ev.name + '.</b> ' + notes.join('; ') + '.',
          parts: [
            { type: 'tree', label: 'Green = needed re-render, red = wasted re-render', arr: labels, hl: hl, tags: tags },
            { type: 'vars', label: 'Render counts of consumers', vals: { CartBadge: renders.CartBadge, SearchBox: renders.SearchBox, wastedRenders: wasted }, hl: { wastedRenders: wasted ? 'bad' : 'ok' } }
          ]
        });
      });
      frames.push({
        narr: 'Total: <b>' + (renders.CartBadge + renders.SearchBox) + '</b> consumer renders, <b>' + wasted + '</b> of them wasted. Try the other modes: <code>one</code> is the worst, <code>split</code> is the best.',
        parts: [
          { type: 'table', label: 'Summary for mode "' + mode + '"', columns: ['component', 'renders', 'wasted'], rows: [['CartBadge', renders.CartBadge, '-'], ['SearchBox', renders.SearchBox, '-'], ['TOTAL wasted', '', wasted]], hl: { 2: wasted ? 'bad' : 'ok' } }
        ]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'The three events, three modes',
      html: `<p>Same three events (type, add to cart, unrelated parent update) in each mode:</p>
        ${H.table(['Mode', 'Type "s"', 'Add to cart', 'Parent re-renders', 'Wasted renders'], [
          ['<code>one</code> (no memo)', '2 renders (1 wasted)', '2 renders (1 wasted)', '2 renders (both wasted)', '<span class="c-r">4</span>'],
          ['<code>memo</code> (one context)', '2 renders (1 wasted)', '2 renders (1 wasted)', '0', '<span class="c-y">2</span>'],
          ['<code>split</code> + memo', '1 render (needed)', '1 render (needed)', '0', '<span class="c-g">0</span>']
        ])}
        <p>Run the visualizer above with each mode to watch it light up.</p>`
    },
    {
      title: 'Separate state and dispatch contexts',
      html: `<p>A button that only <i>calls</i> <code>addToCart</code> does not need to re-render every time the cart changes. <code>dispatch</code> from <code>useReducer</code> never changes identity, so put it in its own context. Buttons subscribe to the stable dispatch, lists subscribe to the changing state.</p>`,
      code: {
        lang: 'jsx', check: false, title: 'State + dispatch split',
        code: `const CartStateContext = createContext([]);
const CartDispatchContext = createContext(() => {});

function cartReducer(state, action) {
  switch (action.type) {
    case 'add': return [...state, action.item];
    case 'clear': return [];
    default: return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, []);
  return (
    <CartDispatchContext.Provider value={dispatch}>   {/* stable forever */}
      <CartStateContext.Provider value={state}>
        {children}
      </CartStateContext.Provider>
    </CartDispatchContext.Provider>
  );
}

// AddButton never re-renders when the cart changes
function AddButton({ item }) {
  const dispatch = useContext(CartDispatchContext);
  return <button onClick={() => dispatch({ type: 'add', item })}>Add</button>;
}`
      }
    },
    {
      title: 'Composition instead of Context (no Context at all)',
      html: `<p>Sometimes you do not need Context. If a <code>Layout</code> only passes <code>user</code> down to <code>Avatar</code>, pass the finished <code>&lt;Avatar user={user} /&gt;</code> element <b>as a prop or child</b> to the layout. The layout never sees <code>user</code>. This is called "lifting content up" and it removes prop drilling without any subscription cost.</p>`,
      code: {
        lang: 'jsx', check: false, title: 'Pass the element, not the data',
        code: `function Page({ user }) {
  // Page builds the deep element itself...
  return <Layout avatar={<Avatar user={user} />} />;
}
function Layout({ avatar }) {
  // ...Layout and Sidebar just place it, no user prop drilled through them.
  return <aside><Sidebar slot={avatar} /></aside>;
}
function Sidebar({ slot }) { return <nav>{slot}</nav>; }`
      }
    }
  ],
  deepDive: `<p>🟣 <b>How propagation really works.</b> Context is not stored in props. React keeps a <i>context stack</i> while walking the tree; when a Provider's value changes, React marks every Fiber that read that context (it tracks them in a per-fiber "dependencies" list) as needing work, even if an ancestor used <code>React.memo</code> and bailed out. That is why <code>React.memo</code> on a consumer does <b>not</b> stop a context-driven re-render.</p>
    <p>🟣 <b>No selectors.</b> <code>useContext(Ctx)</code> subscribes to the whole value. People simulate selectors by splitting contexts or by wrapping the consumer: a thin component reads the context, then renders a memoized inner component with only the fields it needs as props. There is an old RFC for "context selectors", but in practice you pick a store (Zustand, Redux, Jotai) when you need them.</p>
    <p>🟣 <b>React Compiler (stable in 2025-26).</b> The compiler auto-memoizes component bodies and values, so the "forgot useMemo on the value" bug fades. It still cannot split your giant context into two, because that is a design choice about what changes together.</p>
    <p>🟣 <b>Context vs <code>useSyncExternalStore</code>.</b> Stores built on <code>useSyncExternalStore</code> let each component subscribe to just a slice and re-render only if that slice changed. This is what Redux, Zustand and Jotai are built on. Context re-renders via the React tree; external stores notify via subscription.</p>
    <p>🟣 <b>Performance numbers.</b> A context re-render storm costs "consumers × render cost". For 20 consumers it is invisible; for a table with 5,000 cells each reading the context, typing becomes visibly laggy. Measure with the React DevTools Profiler ("why did this render?") before optimizing.</p>
    <p>🟣 <b>Testing and defaults.</b> Give <code>createContext</code> a meaningful default (or <code>null</code> plus a custom hook that throws a clear error when used outside the provider). Expose a hook like <code>useCart()</code> instead of exporting the raw context.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> an assistant will wrap your whole app in a single <code>AppContext</code> with <code>{ user, theme, cart, setCart, ... }</code> because it is the shortest answer. That is exactly the re-render storm. AI can also now <i>find</i> storms: paste a Profiler flame graph or the component tree and ask "which consumers re-render when search changes, and which of those do not read search?".</p>
    <p><b>Use AI as a partner:</b> <code>Split this context by change frequency and give me the provider tree. Keep dispatch separate from state.</code> Then verify in the Profiler.</p>
    <p><b>Where AI goes wrong:</b> it adds <code>React.memo</code> to consumers (does not help against context), forgets <code>useMemo</code> on the value, or puts fast-changing data (mouse position, scroll) into Context.</p>
    <p><b>What you must still own:</b> measuring (Profiler), choosing the split boundaries, and knowing when to leave Context for a store. In 2026 many teams also say "enable React Compiler first, then re-measure".</p>`,
  problems: [{
    title: 'Fix the Context Re-render Storm',
    level: 'Medium', tags: ['context', 'performance', 'react'], companies: ['Meta', 'Atlassian', 'Uber'],
    statement: `<p>A shopping app has one <code>AppContext</code> with <code>cart</code>, <code>search</code> and their setters. Typing in the search box re-renders <code>CartBadge</code> on every keystroke, and when <code>Layout</code> (the parent of the provider) re-renders for any reason, <b>all</b> consumers re-render. Rewrite the provider so that (1) unrelated parent renders do not wake consumers, (2) typing does not wake <code>CartBadge</code>, and (3) components that only <i>add</i> to the cart never re-render when the cart changes.</p>`,
    constraints: `React 18/19, no external libraries. At most 3 contexts. Setters/dispatch must be stable.`,
    example: `<p>Before: type "s" → ${H.c('r', 'CartBadge, SearchBox, AddButton all re-render')}.<br>After: type "s" → ${H.c('g', 'only SearchBox re-renders')}. Add to cart → ${H.c('g', 'only CartBadge and CartList re-render, AddButton does not')}.</p>
      <p><b>Why:</b> each context now changes only when its own data changes, and <code>dispatch</code> never changes identity.</p>`,
    brute: {
      why: `<p>The naive provider creates a new object each render and bundles unrelated data. Cost: every consumer re-renders on every provider render, so typing in search re-renders the cart badge and every "Add" button.</p>`,
      code: {
        lang: 'jsx', check: false,
        code: `const AppContext = createContext(null);
export function AppProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  return (
    <AppContext.Provider value={{ cart, setCart, search, setSearch }}>
      {children}
    </AppContext.Provider>
  );
}`
      }
    },
    mcq: { q: 'Which change alone would stop AddButton (which only calls dispatch) from re-rendering when the cart changes?', options: ['Wrap AddButton in React.memo', 'Put dispatch in its own context, separate from the cart state', 'Use useCallback on the onClick handler'], answer: 1, explain: 'React.memo does not block context-driven re-renders. A separate dispatch context has a value that never changes, so AddButton is never notified.' },
    hints: [
      `<p>Hint 1: a consumer re-renders when the <b>value it subscribes to changes identity</b>. So make sure each value changes only when its own data changes.</p>`,
      `<p>Hint 2: split into three contexts by change-frequency: cart <b>state</b>, cart <b>dispatch</b> (never changes) and <b>search</b>. Use <code>useReducer</code> so dispatch is stable.</p>`,
      `<p>Hint 3: recipe: <code>useReducer</code> for the cart; <code>useMemo</code> the search value <code>{ search, setSearch }</code> (or give <code>search</code> its own state-only context and the stable <code>setSearch</code> another); nest three providers; export small hooks <code>useCart()</code>, <code>useCartDispatch()</code>, <code>useSearch()</code>.</p>`
    ],
    solution: {
      approach: `<p>Split by what changes together and separate the stable parts. <code>useReducer</code>'s <code>dispatch</code> is guaranteed stable, so <code>CartDispatchContext</code> never notifies anyone. <code>CartStateContext</code> holds the array (its identity changes only on a real update). <code>SearchContext</code> is memoized so an unrelated parent render keeps the same object. Custom hooks hide the contexts and throw helpful errors when used outside the provider.</p>`,
      code: {
        lang: 'jsx', check: false,
        code: `import { createContext, useContext, useMemo, useReducer, useState } from 'react';

const CartStateContext = createContext(null);
const CartDispatchContext = createContext(null);
const SearchContext = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case 'add':
      return [...state, action.item];            // new array -> state context notifies
    case 'remove':
      return state.filter((i) => i.id !== action.id);
    default:
      return state;                               // same reference -> no update
  }
}

export function AppProviders({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [search, setSearch] = useState('');

  // memoized so a parent re-render does not create a new object
  const searchValue = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <CartDispatchContext.Provider value={dispatch}>
      <CartStateContext.Provider value={cart}>
        <SearchContext.Provider value={searchValue}>
          {children}
        </SearchContext.Provider>
      </CartStateContext.Provider>
    </CartDispatchContext.Provider>
  );
}

function useStrict(ctx, name) {
  const v = useContext(ctx);
  if (v === null) throw new Error(name + ' must be used inside <AppProviders>');
  return v;
}
export const useCart = () => useStrict(CartStateContext, 'useCart');
export const useCartDispatch = () => useStrict(CartDispatchContext, 'useCartDispatch');
export const useSearch = () => useStrict(SearchContext, 'useSearch');

// Consumers
export function AddButton({ item }) {
  const dispatch = useCartDispatch();           // stable: never re-renders from cart changes
  return <button onClick={() => dispatch({ type: 'add', item })}>Add</button>;
}
export function CartBadge() {
  const cart = useCart();                       // not subscribed to search
  return <span>{cart.length}</span>;
}
export function SearchBox() {
  const { search, setSearch } = useSearch();
  return <input value={search} onChange={(e) => setSearch(e.target.value)} />;
}`
      },
      dry: { head: ['Event', 'CartDispatch', 'CartState', 'Search', 'Components re-rendered'], rows: [['type "s"', 'same', 'same', '<span class="c-y">new</span>', 'SearchBox only'], ['add shoe', 'same', '<span class="c-y">new array</span>', 'same', 'CartBadge, CartList'], ['parent re-render', 'same', 'same', 'same (memo)', '<span class="c-g">none</span>']] },
      complexity: `<p>Cost per update drops from "all consumers" to "consumers of that one context". No extra libraries. Memory overhead: three small context objects.</p>`,
      followUps: ['How would you let CartBadge subscribe to just <code>cart.length</code> without re-rendering for item changes? (hint: a store with selectors)', 'Would React Compiler remove the need for useMemo here? What would it still not do?']
    }
  }]
});
/* =====================================================================
   TOPIC 3: Redux Toolkit
   ===================================================================== */
topics.push({
  title: 'Redux Toolkit: Store, Actions, Reducers and Subscribers',
  analogy: `<p>Redux is a <b>bank with one ledger</b>. You never walk into the vault and change a number yourself. You fill in a <b>deposit slip</b> (an <i>action</i>: "add 1 shoe"), hand it to the <b>teller</b> (<i>dispatch</i>), the teller runs the bank's fixed <b>rulebook</b> (the <i>reducer</i>) to produce a new ledger page, and then the <b>notice board</b> tells everyone who asked to be told (<i>subscribers</i>). Because every change is a slip, you can replay all slips and rebuild the exact same ledger. That is why Redux has time-travel debugging.</p>`,
  explain: `<p>🟢 <b>The loop, in five steps:</b></p>
    <ol>
      <li>The UI <b>dispatches</b> an action: a plain object like <code>{ type: 'cart/added', payload: 'shoe' }</code>.</li>
      <li>The <b>store</b> hands the action and the current state to the <b>reducer</b>.</li>
      <li>The reducer is a <b>pure function</b>: <code>(state, action) =&gt; newState</code>. No API calls, no randomness, no mutation of the old state.</li>
      <li>The store saves the new state.</li>
      <li>The store <b>notifies subscribers</b>; each component's <code>useSelector</code> checks if <i>its slice</i> changed and re-renders only if so.</li>
    </ol>
    <p>🔵 <b>Redux Toolkit (RTK)</b> is the official, modern way to write Redux. It removes the old boilerplate:</p>
    ${H.table(['RTK function', 'What it does', 'Why you care'], [
      ['<code>configureStore</code>', 'Creates the store with good defaults (thunk, devtools, dev-only checks for mutation)', 'One call instead of ten'],
      ['<code>createSlice</code>', 'Defines name + initial state + reducers, and auto-generates action creators', 'No more action-type string constants'],
      ['Immer inside reducers', 'Lets you <i>write</i> "mutating" code (<code>state.items.push(x)</code>) that is turned into an immutable update', 'Short, readable reducers'],
      ['<code>createAsyncThunk</code>', 'Handles <code>pending / fulfilled / rejected</code> for async work', 'Standard loading and error flow'],
      ['<code>createSelector</code>', 'Memoized derived values', 'Compute cart total only when items change'],
      ['RTK Query', 'Data fetching + caching built into RTK', 'A React Query alternative inside Redux']
    ])}
    <p>🔵 <b>When Redux is a good idea (in 2026):</b> large apps with lots of shared client state and complex update rules, teams that want strict conventions, great devtools, time-travel, or middleware (logging, analytics, undo). <b>When it is overkill:</b> a small app, or an app whose "state" is mostly server data (use React Query instead and keep Redux for the cart and UI).</p>
    <p>🔵 <b>Rules of reducers:</b> pure (same input, same output), no side effects, never mutate the incoming state yourself (Immer is the only exception because it copies for you), and keep state <b>serializable</b> (no functions, no class instances, no Promises).</p>`,
  clues: [
    '"Single source of truth", "predictable state", "actions and reducers" → Redux vocabulary',
    '"Why must reducers be pure?" → replay, time-travel, memoized selectors, testability',
    '"How do you handle async in Redux?" → <code>createAsyncThunk</code> or RTK Query (or a listener middleware)',
    '"Redux vs Context" → Redux has selectors, middleware, devtools; Context only passes a value',
    '"Redux vs Zustand vs React Query" → say what each owns: client state with ceremony / client state light / server state',
    '"Why is my component not updating?" → you mutated state outside Immer, or returned the same reference'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'A Redux-style store with subscribe, in 20 lines (runnable)',
      code: `// What Redux really is: state + reducer + a list of listeners.
function createStore(reducer, preloaded) {
  let state = preloaded;
  const listeners = new Set();
  return {
    getState: () => state,
    dispatch(action) {
      state = reducer(state, action);      // 1) compute the NEW state (pure)
      listeners.forEach((fn) => fn());     // 2) tell everyone something happened
      return action;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);   // unsubscribe function
    }
  };
}

// A reducer: pure, never mutates the old state
function cartReducer(state = { items: {} }, action) {
  switch (action.type) {
    case 'cart/added': {
      const qty = state.items[action.payload] || 0;
      return { ...state, items: { ...state.items, [action.payload]: qty + 1 } };
    }
    case 'cart/removed': {
      const { [action.payload]: _gone, ...rest } = state.items;
      return { ...state, items: rest };
    }
    default:
      return state; // unknown action -> SAME reference, selectors can skip
  }
}

const store = createStore(cartReducer, { items: {} });
const stop = store.subscribe(() => console.log('state ->', JSON.stringify(store.getState())));

store.dispatch({ type: 'cart/added', payload: 'shoe' });
store.dispatch({ type: 'cart/added', payload: 'shoe' });
store.dispatch({ type: 'cart/added', payload: 'hat' });
store.dispatch({ type: 'cart/removed', payload: 'hat' });
stop();
store.dispatch({ type: 'cart/added', payload: 'bag' }); // no log: we unsubscribed
console.log('final', JSON.stringify(store.getState()));`
    },
    {
      lang: 'js', check: false, title: 'The same cart with Redux Toolkit',
      code: `import { configureStore, createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: {} },
  reducers: {
    // Immer lets us "mutate" safely: it records changes and produces a new object
    added(state, action) {
      const id = action.payload;
      state.items[id] = (state.items[id] || 0) + 1;
    },
    removed(state, action) {
      delete state.items[action.payload];
    }
  }
});

export const { added, removed } = cartSlice.actions; // action creators, generated
export const store = configureStore({ reducer: { cart: cartSlice.reducer } });

store.dispatch(added('shoe')); // { type: 'cart/added', payload: 'shoe' }`
    }
  ],
  viz: {
    title: 'Store -> dispatch -> reducer -> subscribers',
    input: 'add shoe, add hat, add shoe, remove hat',
    inputLabel: 'Actions (comma separated): add NAME or remove NAME, up to 6',
    gen: function (input) {
      var cmds = String(input).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!cmds.length) throw new Error('Enter actions like: add shoe, remove hat');
      if (cmds.length > 6) throw new Error('Use at most 6 actions');
      var parsed = cmds.map(function (c) {
        var m = /^(add|remove)\s+([a-z0-9_-]+)$/i.exec(c);
        if (!m) throw new Error('Each action must look like "add shoe" or "remove hat"');
        return { verb: m[1].toLowerCase(), name: m[2].toLowerCase() };
      });
      var nodes = [
        { id: 'UI', label: 'UI (Cart page)', x: 12, y: 30, shape: 'box', w: 20 },
        { id: 'ACT', label: 'Action', x: 38, y: 8, shape: 'box', w: 18 },
        { id: 'RED', label: 'Reducer (pure)', x: 66, y: 8, shape: 'box', w: 22 },
        { id: 'STORE', label: 'Store (state)', x: 66, y: 52, shape: 'box', w: 22 },
        { id: 'SUB', label: 'Subscribers', x: 38, y: 52, shape: 'box', w: 20 }
      ];
      var edges = [['UI', 'ACT', 'dispatch'], ['ACT', 'RED', 'action'], ['RED', 'STORE', 'new state'], ['STORE', 'SUB', 'notify'], ['SUB', 'UI', 're-render']];
      var items = {}, frames = [], seq = 0;
      function rowsOf() { return Object.keys(items).map(function (k) { return [k, items[k]]; }); }
      function total() { return Object.keys(items).reduce(function (s, k) { return s + items[k]; }, 0); }
      function graph(activeNode, activeEdge, tags) { var ehl = {}; if (activeEdge) ehl[activeEdge] = 'ok'; var hl = {}; if (activeNode) hl[activeNode] = 'cur'; return { type: 'graph', label: 'Data flows one way', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags || {} }; }
      function stateTable(hlRow) { var rows = rowsOf(); if (!rows.length) rows = [['(empty cart)', 0]]; var hl = {}; if (hlRow !== undefined && hlRow >= 0) hl[hlRow] = 'ok'; return { type: 'table', label: 'state.cart.items', columns: ['item', 'qty'], rows: rows, hl: hl }; }
      frames.push({ narr: 'The store starts with an <b>empty cart</b>. The arrows show the only legal path a change can take: UI &rarr; action &rarr; reducer &rarr; store &rarr; subscribers &rarr; UI.', parts: [graph(null, null), stateTable(-1), { type: 'vars', label: 'Store info', vals: { actionsHandled: 0, totalQty: 0 } }] });
      parsed.forEach(function (p) {
        seq++;
        var type = 'cart/' + (p.verb === 'add' ? 'added' : 'removed');
        var actionText = '{ type: "' + type + '", payload: "' + p.name + '" }';
        frames.push({ narr: '<b>Step ' + seq + ': dispatch.</b> The user clicks. The UI does not touch state. It builds an action <code>' + H.esc(actionText) + '</code> and hands it to <code>store.dispatch</code>.', parts: [graph('UI', 'UI-ACT', { ACT: type }), stateTable(-1), { type: 'vars', label: 'Store info', vals: { actionsHandled: seq - 1, totalQty: total() } }] });
        frames.push({ narr: '<b>Reducer runs.</b> It receives the <i>old</i> state and the action and returns a <i>new</i> state without changing the old one. It is a pure function, so the same input always gives the same output.', parts: [graph('RED', 'ACT-RED', { RED: 'pure' }), stateTable(-1), { type: 'vars', label: 'Reducer inputs', vals: { 'action.type': type, 'action.payload': p.name } }] });
        var changed = false, bad = false, hlRow = -1;
        if (p.verb === 'add') { items[p.name] = (items[p.name] || 0) + 1; changed = true; }
        else if (items[p.name]) { delete items[p.name]; changed = true; }
        else { bad = true; }
        var names = Object.keys(items);
        if (changed && p.verb === 'add') hlRow = names.indexOf(p.name);
        frames.push({ narr: bad ? '<b>Store updated?</b> <span class="c-r">No change.</span> "' + H.esc(p.name) + '" is not in the cart, so the reducer returns the <b>same state object</b>. Selectors compare by reference and will skip re-rendering.' : '<b>Store saves the new state.</b> ' + (p.verb === 'add' ? '"' + H.esc(p.name) + '" now has quantity ' + items[p.name] + '.' : '"' + H.esc(p.name) + '" was removed from the cart.'), parts: [graph('STORE', 'RED-STORE', { STORE: bad ? 'same ref' : 'new ref' }), stateTable(hlRow), { type: 'vars', label: 'Store info', vals: { actionsHandled: seq, totalQty: total() }, hl: bad ? { actionsHandled: 'bad' } : { totalQty: 'ok' } }] });
        frames.push({ narr: '<b>Notify + re-render.</b> The store calls every subscriber. Each <code>useSelector</code> compares the old and new value of <i>its</i> slice. ' + (bad ? 'Nothing changed, so <span class="c-m">no component re-renders</span>.' : 'The cart badge reads <b>' + total() + '</b> now, so it re-renders; unrelated components skip.'), parts: [graph('SUB', 'STORE-SUB', { SUB: bad ? 'skipped' : 'cart badge: ' + total() }), stateTable(-1), { type: 'vars', label: 'Store info', vals: { actionsHandled: seq, totalQty: total() } }] });
      });
      frames.push({ narr: 'Done. Every change took the same route, so you can log, replay or undo them. That predictability is the entire point of Redux.', parts: [graph('UI', 'SUB-UI'), stateTable(-1)] });
      return frames;
    }
  },
  examples: [
    {
      title: 'Immer: "mutating" code that stays immutable',
      html: `<p>Inside a <code>createSlice</code> reducer you may write <code>state.items.push(x)</code>. Immer gives you a <b>draft</b> (a Proxy), records what you changed, and returns a new immutable object with structural sharing (unchanged branches keep the same reference). Outside <code>createSlice</code> (plain reducers) you must still copy yourself.</p>
        ${H.table(['Style', 'Code', 'Works in plain reducer?'], [
          ['Immutable copy', '<code>return { ...state, items: [...state.items, x] }</code>', '<span class="c-g">yes</span>'],
          ['Immer mutation', '<code>state.items.push(x)</code>', '<span class="c-r">no (bug!)</span>, only inside createSlice']
        ])}`
    },
    {
      title: 'Async with createAsyncThunk',
      html: `<p>A thunk is a function you dispatch instead of an object. RTK auto-dispatches <code>pending</code>, <code>fulfilled</code> and <code>rejected</code> actions, and you handle them in <code>extraReducers</code>. (For plain server data you will usually prefer React Query or RTK Query, but you must know this.)</p>`,
      code: {
        lang: 'js', check: false, title: 'createAsyncThunk',
        code: `import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchOrders = createAsyncThunk('orders/fetch', async (userId, { rejectWithValue }) => {
  const res = await fetch('/api/users/' + userId + '/orders');
  if (!res.ok) return rejectWithValue('HTTP ' + res.status);
  return res.json();                     // becomes action.payload on fulfilled
});

const ordersSlice = createSlice({
  name: 'orders',
  initialState: { list: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (s) => { s.status = 'loading'; })
      .addCase(fetchOrders.fulfilled, (s, a) => { s.status = 'success'; s.list = a.payload; })
      .addCase(fetchOrders.rejected, (s, a) => { s.status = 'error'; s.error = a.payload; });
  }
});
export default ordersSlice.reducer;`
      }
    },
    {
      title: 'useSelector and re-render control',
      html: `<p><code>useSelector(fn)</code> subscribes to the store. After every dispatch it runs <code>fn(state)</code> and compares the result with the previous result using <code>===</code>. Same result → no re-render. So <b>select the smallest value you need</b>, and never create a new array/object inside a selector (it fails the <code>===</code> check every time). Use <code>createSelector</code> for derived arrays.</p>`,
      code: {
        lang: 'jsx', check: false, title: 'Good vs bad selectors',
        code: `import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

// GOOD: returns a primitive. Re-renders only when the number changes.
const useCartCount = () => useSelector((s) => Object.keys(s.cart.items).length);

// BAD: .map creates a NEW array each run -> "changed" every dispatch -> re-render storm
const useNamesBad = () => useSelector((s) => Object.keys(s.cart.items).map((n) => n.toUpperCase()));

// GOOD: memoized. Re-computes only when s.cart.items changes
const selectNames = createSelector([(s) => s.cart.items], (items) => Object.keys(items).map((n) => n.toUpperCase()));
const useNames = () => useSelector(selectNames);`
      }
    }
  ],
  deepDive: `<p>🟣 <b>Middleware is just function composition.</b> <code>store.dispatch</code> is wrapped by a chain: <code>(store) =&gt; (next) =&gt; (action) =&gt; ...</code>. A thunk middleware says "if the action is a function, call it with <code>dispatch, getState</code>; otherwise pass it on". Logging, analytics, undo and API-call middleware work the same way. In the practice section you will write one.</p>
    <p>🟣 <b>Why serializable state?</b> DevTools, time-travel, persistence and SSR hydration all assume you can turn state into JSON. RTK's dev-only <i>serializability middleware</i> warns when you put a <code>Date</code>, <code>Map</code>, class instance or Promise in state or actions. Store ISO strings and ids instead.</p>
    <p>🟣 <b>Normalizing state.</b> Store entities by id (<code>{ ids: [...], entities: { 1: {...} } }</code>) with <code>createEntityAdapter</code>. Updating one product is O(1) and does not re-render lists of other products. Nested arrays of arrays force you to copy deep paths.</p>
    <p>🟣 <b>Performance model.</b> A dispatch costs: run reducers (cheap) + run <i>every</i> <code>useSelector</code> (could be hundreds) + re-render those whose result changed. So many cheap selectors beat a few expensive ones; selectors must be fast and return stable references.</p>
    <p>🟣 <b>Redux vs the others in 2026.</b> Redux Toolkit remains the standard in big enterprise apps and where devtools/time-travel/middleware are valued. For new small-to-medium apps, teams often choose Zustand (client) + React Query (server). RTK Query lets you stay in one ecosystem. Know the trade-offs; do not argue religion.</p>
    <p>🟣 <b>Gotchas:</b> do not <code>dispatch</code> inside a reducer; do not store derived data; avoid one giant slice; do not put form keystrokes in Redux (use a form library); remember Immer cannot mutate <i>and</i> return a value in the same reducer.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> AI is excellent at the boilerplate part of RTK: slices, thunks, typed hooks (<code>useAppSelector</code>), and migrating a legacy switch-statement reducer to <code>createSlice</code>. It can read a Redux DevTools action log and explain why a component re-rendered.</p>
    <p><b>Use AI as a partner:</b> <code>Convert this old Redux reducer to createSlice with Immer, keep action names the same, and add tests for each case.</code> Also: <code>Review my selectors for ones that return a new array/object every time.</code></p>
    <p><b>Where AI goes wrong:</b> it mutates state in a hand-written reducer (works in a slice, breaks elsewhere), it stores API responses in slices without cache invalidation, and it dispatches inside reducers or selectors.</p>
    <p><b>What you must still own:</b> deciding <i>what belongs in Redux at all</i>, normalizing the shape, and the mental model (unidirectional flow, purity). Interviewers love asking you to build a mini <code>createStore</code> on a whiteboard, and no assistant helps you there.</p>`,
  problems: [{
    title: 'Cart Reducer, Selector and Subscribe (Redux-style)',
    level: 'Easy', tags: ['redux', 'reducer', 'selectors'], companies: ['Flipkart', 'Walmart', 'Swiggy'],
    statement: `<p>Implement a pure <code>cartReducer(state, action)</code> that supports <code>cart/added</code> (payload: <code>{ id, price }</code>, increases quantity), <code>cart/removed</code> (payload: id, removes the line) and <code>cart/cleared</code>. State shape: <code>{ lines: { [id]: { price, qty } } }</code>. Write selectors <code>selectCount(state)</code> and <code>selectTotal(state)</code>. Wire the reducer into a tiny <code>createStore</code> with <code>subscribe</code> and show that a subscriber is called after every dispatch.</p>`,
    constraints: `Never mutate the old state. Unknown actions return the <b>same</b> state reference. Derived values are selectors, not stored.`,
    example: `<p>Dispatch <code>added(shoe,50)</code> twice and <code>added(hat,20)</code> once:</p>
      ${H.table(['id', 'price', 'qty'], [['shoe', 50, 2], ['hat', 20, 1]])}
      <p>${H.c('g', 'selectCount = 3, selectTotal = 120')}. The total is computed (2×50 + 1×20), never stored.</p>`,
    brute: {
      why: `<p>The naive reducer mutates the old state and stores <code>total</code> beside <code>lines</code>. Mutation means the reference never changes, so subscribers cannot tell anything happened, and the stored total drifts if one case forgets to update it.</p>`,
      code: `function badReducer(state, action) {
  if (action.type === 'cart/added') {
    const line = state.lines[action.payload.id] || (state.lines[action.payload.id] = { price: action.payload.price, qty: 0 });
    line.qty += 1;            // MUTATES the old state
    state.total += line.price; // stored derived value
  }
  return state;               // same reference -> nobody notices
}
const s = { lines: {}, total: 0 };
badReducer(s, { type: 'cart/added', payload: { id: 'shoe', price: 50 } });
console.log(s.total);`
    },
    mcq: { q: 'After dispatching an action the reducer returns the exact same object it received. What should subscribers' + ' (useSelector) do?', options: ['Re-render everything to be safe', 'Skip: nothing changed, because the reference is identical', 'Throw an error'], answer: 1, explain: 'Selectors compare by reference. Returning the same state for unknown or no-op actions is a feature: it lets React skip all work.' },
    hints: [
      `<p>Hint 1: a pure reducer builds a new object with the spread operator, only along the path that changes.</p>`,
      `<p>Hint 2: <code>selectTotal</code> is a plain function that reduces over <code>Object.values(state.lines)</code>.</p>`,
      `<p>Hint 3: recipe: switch on <code>action.type</code>; for add, copy <code>lines</code> and the one line; for remove, destructure the id away; default returns <code>state</code>. For the store keep <code>state</code> and a <code>Set</code> of listeners; dispatch replaces state then calls listeners.</p>`
    ],
    solution: {
      approach: `<p>Pure reducer + two selectors + a ~12-line store. Only the changed branch is copied (structural sharing), so unrelated references stay equal. The subscriber is called after every dispatch (even no-ops, as in real Redux); smart consumers compare selected values.</p>`,
      code: {
        lang: 'js', run: true,
        code: `function cartReducer(state = { lines: {} }, action) {
  switch (action.type) {
    case 'cart/added': {
      const { id, price } = action.payload;
      const old = state.lines[id] || { price, qty: 0 };
      return { ...state, lines: { ...state.lines, [id]: { price: old.price, qty: old.qty + 1 } } };
    }
    case 'cart/removed': {
      const { [action.payload]: _removed, ...rest } = state.lines;
      return { ...state, lines: rest };
    }
    case 'cart/cleared':
      return { ...state, lines: {} };
    default:
      return state; // same reference
  }
}

const selectCount = (s) => Object.values(s.lines).reduce((n, l) => n + l.qty, 0);
const selectTotal = (s) => Object.values(s.lines).reduce((n, l) => n + l.qty * l.price, 0);

function createStore(reducer) {
  let state = reducer(undefined, { type: '@@init' });
  const subs = new Set();
  return {
    getState: () => state,
    dispatch(a) { state = reducer(state, a); subs.forEach((f) => f()); return a; },
    subscribe(f) { subs.add(f); return () => subs.delete(f); }
  };
}

const store = createStore(cartReducer);
let calls = 0;
store.subscribe(() => { calls++; });
const before = store.getState();
store.dispatch({ type: 'cart/added', payload: { id: 'shoe', price: 50 } });
store.dispatch({ type: 'cart/added', payload: { id: 'shoe', price: 50 } });
store.dispatch({ type: 'cart/added', payload: { id: 'hat', price: 20 } });
store.dispatch({ type: 'unknown' });
console.log('count', selectCount(store.getState()), 'total', selectTotal(store.getState()), 'subscriber calls', calls);
console.log('old state untouched:', JSON.stringify(before), '| new:', JSON.stringify(store.getState()));
store.dispatch({ type: 'cart/removed', payload: 'shoe' });
console.log('after remove shoe -> total', selectTotal(store.getState()));`
      },
      alt: [{
        lang: 'js', check: false, title: 'Same thing as an RTK slice',
        code: `import { createSlice, createSelector } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: { lines: {} },
  reducers: {
    added(state, { payload: { id, price } }) {
      const line = state.lines[id] || (state.lines[id] = { price, qty: 0 });
      line.qty += 1;                       // safe: Immer draft
    },
    removed(state, { payload: id }) { delete state.lines[id]; },
    cleared(state) { state.lines = {}; }
  }
});
export const { added, removed, cleared } = cartSlice.actions;
const selectLines = (s) => s.cart.lines;
export const selectTotal = createSelector([selectLines], (lines) =>
  Object.values(lines).reduce((n, l) => n + l.qty * l.price, 0));
export default cartSlice.reducer;`
      }],
      dry: { head: ['Action', 'lines after', 'count', 'total', 'subscriber calls'], rows: [['added shoe', '{shoe:1}', '1', '50', '1'], ['added shoe', '{shoe:2}', '2', '100', '2'], ['added hat', '{shoe:2, hat:1}', '3', '120', '3'], ['unknown', 'same reference', '3', '120', '4']] },
      complexity: `<p>Each action is O(L) in the number of lines (spread copies the map). Selectors O(L). For huge carts use <code>createEntityAdapter</code>.</p>`,
      followUps: ['How would you make selectTotal memoized so it recomputes only when lines changes?', 'Add undo: how would you keep a history of past states?']
    }
  }]
});
/* =====================================================================
   TOPIC 4: Zustand
   ===================================================================== */
topics.push({
  title: 'Zustand: A Tiny Store with Selectors',
  analogy: `<p>Redux is a bank with forms and tellers. <b>Zustand is a shared fridge with sticky labels.</b> Anyone can open it and grab what they need (<code>useStore(s =&gt; s.milk)</code>), anyone can put something in (<code>set({ milk: 3 })</code>), and the fridge only buzzes <i>you</i> if the item <i>you</i> asked about changed. No tellers, no paperwork, no Provider around the house. The word "Zustand" is German for "state".</p>`,
  explain: `<p>🟢 <b>The whole API in one example.</b> You call <code>create</code> with a function that returns your state and your actions together. You get back a React hook.</p>
    <p>🔵 <b>Why teams like it:</b></p>
    ${H.table(['Feature', 'What it means', 'Compared to Redux / Context'], [
      ['No Provider', 'The store is a module-level singleton. Import the hook and use it anywhere.', 'Context needs a Provider tree'],
      ['Selectors built in', '<code>useStore(s =&gt; s.count)</code> re-renders only if <code>s.count</code> changed (<code>Object.is</code>)', 'Context has no selectors'],
      ['Actions live in the store', '<code>inc: () =&gt; set(s =&gt; ({ count: s.count + 1 }))</code>', 'Redux needs slice + action + dispatch'],
      ['Tiny (about 1 KB)', 'Almost no API to learn', 'Redux Toolkit is larger, with more concepts'],
      ['Middleware', '<code>persist</code> (localStorage), <code>devtools</code>, <code>immer</code>, <code>subscribeWithSelector</code>', 'Redux has middleware too, but heavier'],
      ['Works outside React', '<code>useStore.getState()</code> and <code>.setState()</code> in plain JS (an axios interceptor, a websocket)', 'Context cannot be read outside components']
    ])}
    <p>🔵 <b>The golden rule: always select a slice.</b> <code>const state = useStore()</code> (no selector) subscribes you to <i>everything</i>: you re-render on every change. Write <code>useStore(s =&gt; s.count)</code>. To pick several fields, either call the hook several times or use <code>useShallow</code> so a new object with the same values counts as equal.</p>
    <p>🔵 <b>Zustand vs Context vs Redux.</b> Zustand is "Redux without the ceremony": a single store (or a few small stores), selectors, devtools, and a very small learning curve. Redux Toolkit gives stricter conventions and richer tooling for large teams. Context is for rarely-changing values like theme.</p>`,
  clues: [
    '"Lightweight global state without a Provider" → Zustand (or Jotai)',
    '"Component re-renders too often with a store" → missing selector, or the selector returns a new object each time (use <code>useShallow</code>)',
    '"Persist the cart across refresh" → <code>persist</code> middleware with localStorage',
    '"Read state from a non-React file" → <code>store.getState()</code>',
    '"Why not Context for the cart?" → Context re-renders all consumers; Zustand subscribes per slice',
    '"Zustand vs Redux Toolkit" → mention scale, conventions, devtools, team size'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'A mini Zustand: create + subscribe + selectors (runnable)',
      code: `// Zustand's heart: a state object, a Set of listeners, and Object.is.
function create(initializer) {
  let state;
  const listeners = new Set();
  const getState = () => state;
  const setState = (partial) => {
    const next = typeof partial === 'function' ? partial(state) : partial;
    if (Object.is(next, state)) return;              // nothing to merge
    const prev = state;
    state = Object.assign({}, state, next);         // shallow merge, like Zustand's set()
    listeners.forEach((l) => l(state, prev));
  };
  const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
  state = initializer(setState, getState);
  // useStore(selector) in React = subscribe + re-render when selector(state) changes.
  // Here we model it as a function that calls back only when the selected slice changes:
  function watch(selector, callback, equal = Object.is) {
    let current = selector(state);
    return subscribe((s) => {
      const nextSlice = selector(s);
      if (!equal(current, nextSlice)) { const old = current; current = nextSlice; callback(nextSlice, old); }
    });
  }
  return { getState, setState, subscribe, watch };
}

const store = create((set) => ({
  count: 0,
  name: 'Ana',
  theme: 'light',
  inc: () => set((s) => ({ count: s.count + 1 })),
  rename: (name) => set({ name }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' }))
}));

store.watch((s) => s.count, (n, o) => console.log('Counter component re-renders:', o, '->', n));
store.watch((s) => s.name, (n) => console.log('Greeting component re-renders:', n));
store.watch((s) => s, () => console.log('DevTools (no selector) re-renders on EVERYTHING'));

store.getState().inc();
store.getState().inc();
store.getState().rename('Ben');
store.getState().toggleTheme();`
    },
    {
      lang: 'jsx', check: false, title: 'A real Zustand cart store (with persist)',
      code: `import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

export const useCartStore = create(
  devtools(
    persist(
      (set, get) => ({
        lines: {},                                   // { [id]: { price, qty } }
        add: (id, price) =>
          set((s) => ({
            lines: { ...s.lines, [id]: { price, qty: (s.lines[id]?.qty ?? 0) + 1 } }
          })),
        remove: (id) =>
          set((s) => {
            const { [id]: _gone, ...rest } = s.lines;
            return { lines: rest };
          }),
        clear: () => set({ lines: {} }),
        // derived value as a function, not stored state
        total: () => Object.values(get().lines).reduce((n, l) => n + l.qty * l.price, 0)
      }),
      { name: 'cart-v1' }                            // localStorage key
    )
  )
);

// In components: ALWAYS select a slice
function CartBadge() {
  const count = useCartStore((s) => Object.keys(s.lines).length); // primitive: stable
  return <span>{count}</span>;
}
function AddButton({ id, price }) {
  const add = useCartStore((s) => s.add);   // function identity never changes
  return <button onClick={() => add(id, price)}>Add</button>;
}
// Picking several fields: useShallow keeps the same result if the values are equal
function Summary() {
  const { add, remove } = useCartStore(useShallow((s) => ({ add: s.add, remove: s.remove })));
  return null;
}`
    }
  ],
  viz: {
    title: 'Which components wake up when the store changes?',
    input: 'inc, inc, rename, theme, inc',
    inputLabel: 'Actions (comma separated): inc | rename | theme, up to 8',
    gen: function (input) {
      var cmds = String(input).split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
      if (!cmds.length) throw new Error('Enter actions: inc, rename, theme');
      if (cmds.length > 8) throw new Error('Use at most 8 actions');
      cmds.forEach(function (c) { if (['inc', 'rename', 'theme'].indexOf(c) < 0) throw new Error('Only inc, rename and theme are allowed'); });
      var state = { count: 0, name: 'Ana', theme: 'light' };
      var comps = [
        { id: 'C', label: 'Counter', sel: 'count', pick: function (s) { return s.count; }, x: 14, y: 10 },
        { id: 'G', label: 'Greeting', sel: 'name', pick: function (s) { return s.name; }, x: 14, y: 50 },
        { id: 'T', label: 'Header', sel: 'theme', pick: function (s) { return s.theme; }, x: 86, y: 10 },
        { id: 'D', label: 'DevTools', sel: '(whole state)', pick: function (s) { return JSON.stringify(s); }, x: 86, y: 50 }
      ];
      var last = {}; comps.forEach(function (c) { last[c.id] = c.pick(state); });
      var renders = { Counter: 0, Greeting: 0, Header: 0, DevTools: 0 };
      var frames = [];
      function nodes() { var n = [{ id: 'S', label: 'Zustand store', x: 50, y: 30, shape: 'box', w: 24 }]; comps.forEach(function (c) { n.push({ id: c.id, label: c.label, x: c.x, y: c.y, shape: 'box', w: 18 }); }); return n; }
      function edges() { return comps.map(function (c) { return ['S', c.id, 'useStore(' + c.sel + ')']; }); }
      frames.push({ narr: 'Four components subscribe to one store, each with its own <b>selector</b>. DevTools passes no selector, so it watches everything.', parts: [
        { type: 'graph', label: 'Store and subscribers', directed: true, height: 62, nodes: nodes(), edges: edges(), hl: { S: 'cur' } },
        { type: 'table', label: 'Subscribers', columns: ['component', 'selector', 'last value seen'], rows: comps.map(function (c) { return [c.label, c.sel, last[c.id]]; }) }
      ] });
      cmds.forEach(function (cmd, k) {
        var prev = Object.assign({}, state);
        if (cmd === 'inc') state = Object.assign({}, state, { count: state.count + 1 });
        else if (cmd === 'rename') state = Object.assign({}, state, { name: state.name === 'Ana' ? 'Ben' : 'Ana' });
        else state = Object.assign({}, state, { theme: state.theme === 'light' ? 'dark' : 'light' });
        var hl = { S: 'cur' }, ehl = {}, rows = [], hlr = {};
        comps.forEach(function (c, idx) {
          var now = c.pick(state), woke = !Object.is(now, last[c.id]);
          if (woke) { renders[c.label]++; hl[c.id] = 'ok'; ehl['S-' + c.id] = 'ok'; hlr[idx] = 'ok'; } else { hl[c.id] = 'done'; }
          rows.push([c.label, c.sel, last[c.id], now, woke ? 'RE-RENDER' : 'skipped']);
          last[c.id] = now;
        });
        var wokenNames = comps.filter(function (c) { return hl[c.id] === 'ok'; }).map(function (c) { return c.label; });
        frames.push({
          narr: '<b>Action ' + (k + 1) + ': ' + cmd + '()</b> calls <code>set(...)</code>. The store merges the change, then runs every selector and compares old and new with <code>Object.is</code>. Re-rendered: <b>' + wokenNames.join(', ') + '</b>. The others saw an equal value and <span class="c-m">stayed asleep</span>.',
          parts: [
            { type: 'graph', label: 'Green = selector result changed', directed: true, height: 62, nodes: nodes(), edges: edges(), hl: hl, ehl: ehl },
            { type: 'table', label: 'Selector results', columns: ['component', 'selector', 'before', 'after', 'result'], rows: rows, hl: hlr },
            { type: 'vars', label: 'Total re-renders so far', vals: { Counter: renders.Counter, Greeting: renders.Greeting, Header: renders.Header, DevTools: renders.DevTools } }
          ]
        });
      });
      frames.push({ narr: 'Summary: DevTools re-rendered <b>' + renders.DevTools + '</b> times (every action), while the others only woke for their own slice. The fix for a component that behaves like DevTools: <b>add a selector</b>.', parts: [
        { type: 'table', label: 'Re-render totals', columns: ['component', 'renders'], rows: [['Counter', renders.Counter], ['Greeting', renders.Greeting], ['Header', renders.Header], ['DevTools (no selector)', renders.DevTools]], hl: { 3: 'bad' } }
      ] });
      return frames;
    }
  },
  examples: [
    {
      title: 'The object-selector trap and useShallow',
      html: `<p><code>useStore(s =&gt; ({ a: s.a, b: s.b }))</code> returns a <b>new object on every run</b>, so <code>Object.is</code> says "changed" after every update and the component re-renders (in Zustand v5 it can even loop). Fixes: select primitives separately, or wrap the selector with <code>useShallow</code> so objects compare field by field.</p>`,
      code: {
        lang: 'jsx', check: false, title: 'Selector styles',
        code: `// 1) Two primitives: always safe
const a = useStore((s) => s.a);
const b = useStore((s) => s.b);

// 2) One object, compared shallowly: safe
const { a: a2, b: b2 } = useStore(useShallow((s) => ({ a: s.a, b: s.b })));

// 3) New object every run: re-render storm (avoid)
const bad = useStore((s) => ({ a: s.a, b: s.b }));`
      }
    },
    {
      title: 'Using the store outside React',
      html: `<p>Because the store is a plain object, you can read and write it from anywhere: an API client that needs the auth token, a websocket handler that pushes a notification. Components still re-render correctly because they subscribe through the hook.</p>`,
      code: {
        lang: 'js', check: false, title: 'Outside React',
        code: `import { useAuthStore } from './authStore';

// axios / fetch wrapper (not a component)
export async function api(path) {
  const token = useAuthStore.getState().token;          // read without subscribing
  const res = await fetch(path, { headers: { Authorization: 'Bearer ' + token } });
  if (res.status === 401) useAuthStore.getState().logout(); // write from anywhere
  return res.json();
}`
      }
    },
    {
      title: 'Slices and splitting a big store',
      html: `<p>For big stores, build several <b>slice creator functions</b> and combine them: <code>create((...a) =&gt; ({ ...cartSlice(...a), ...uiSlice(...a) }))</code>. Or just make <b>multiple small stores</b> (one for cart, one for UI). Both keep files small and let each store carry only the middleware it needs (e.g. only the cart is persisted).</p>
        ${H.table(['Approach', 'Good for', 'Watch out'], [
          ['One store with slices', 'Actions that touch several slices at once', 'Persist and devtools apply to the whole store'],
          ['Many small stores', 'Independent features, easy code splitting', 'Cross-store actions need <code>getState()</code> calls']
        ])}`
    }
  ],
  deepDive: `<p>🟣 <b>How it works inside.</b> The vanilla store (about 30 lines, like the runnable example) keeps <code>state</code> and listeners. The React hook is built on <b><code>useSyncExternalStore</code></b>, React's official API for subscribing to outside data: <code>useSyncExternalStore(subscribe, () =&gt; selector(getState()))</code>. React re-renders when the selector's return value changes (<code>Object.is</code>), and the API is safe in concurrent rendering because it avoids "tearing" (different components seeing different values in one render).</p>
    <p>🟣 <b>Immutable updates still apply.</b> <code>set</code> merges <i>one level deep</i>. Nested changes need a spread (<code>lines: { ...s.lines, [id]: ... }</code>) or the <code>immer</code> middleware. Mutating <code>get().lines.x = 1</code> changes data but not the reference, so selectors do not notice.</p>
    <p>🟣 <b>SSR and Next.js pitfall.</b> A module-level singleton store is shared by <b>every request</b> on the server. User A's data could leak to user B. In Next.js, create the store per request (via a factory + Context, <code>createStore</code> from <code>zustand/vanilla</code>) and hydrate it with initial data.</p>
    <p>🟣 <b>Persist details.</b> <code>persist</code> serializes to <code>localStorage</code> on every set, restores on load ("rehydration" is async-ish; the first render can show defaults), and has <code>version</code> + <code>migrate</code> for changing the shape. Use <code>partialize</code> to persist only what is needed, and never persist secrets in localStorage.</p>
    <p>🟣 <b>Atoms vs stores.</b> Jotai/Recoil use many tiny atoms (bottom-up), Zustand/Redux use a central store (top-down). Atoms give automatic fine-grained derivation; stores give a single place to look and easy snapshots.</p>
    <p>🟣 <b>Testing.</b> Reset the store between tests with <code>useStore.setState(initialState, true)</code> (the <code>true</code> replaces instead of merging). Call actions directly; no rendering needed for logic tests.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> Zustand's tiny API is easy for AI to generate, so you will get many "working" stores quickly. The risks move from syntax to <b>design</b>: stores that hold server data, selectors missing, and everything in one 800-line store.</p>
    <p><b>Use AI as a partner:</b> <code>Convert this Context provider into a Zustand store, keep the same component API, and show me which components will re-render differently.</code> Or: <code>Audit these useStore() calls and rewrite each with the narrowest selector.</code></p>
    <p><b>Where AI goes wrong:</b> calls <code>useStore()</code> with no selector, returns object literals from selectors, forgets that <code>persist</code> rehydrates after the first render, and creates a global singleton in a Next.js app (a cross-user data leak).</p>
    <p><b>What you must still own:</b> deciding what is client state vs server state, naming and slicing the store, and verifying re-renders in the React DevTools Profiler. Read the diff; a missing selector looks fine and costs you performance silently.</p>`,
  problems: [{
    title: 'Build a Zustand-Style Store with Selector Subscriptions',
    level: 'Medium', tags: ['zustand', 'store', 'subscribe', 'selectors'], companies: ['Atlassian', 'Razorpay', 'Notion'],
    statement: `<p>Implement <code>create(initializer)</code> that returns <code>{ getState, setState, subscribe, subscribeWithSelector }</code>. <code>setState(partial | fn)</code> shallow-merges and notifies listeners only if something really changed. <code>subscribeWithSelector(selector, listener, equalityFn = Object.is)</code> calls <code>listener(newSlice, oldSlice)</code> only when the selected slice changes. Include a <code>shallow</code> equality helper. Demonstrate a store with <code>count</code>, <code>name</code> and an action <code>inc</code>.</p>`,
    constraints: `No libraries. <code>subscribe</code> returns an unsubscribe function. <code>setState</code> with an equal merge result must not notify.`,
    example: `<p>Subscribe to <code>s =&gt; s.count</code> and <code>s =&gt; s.name</code>. Call <code>inc()</code> twice, then <code>setState({ name: 'Ben' })</code>.</p>
      <p>${H.c('g', 'count listener: 2 calls')}, ${H.c('g', 'name listener: 1 call')}. The name listener was <b>not</b> called by <code>inc</code>, because its slice did not change.</p>`,
    brute: {
      why: `<p>The naive store notifies <b>every</b> listener after <b>every</b> <code>setState</code>, even when the data is identical. In a React app that means every component using the store re-renders for every keystroke or tick.</p>`,
      code: `function createNaive(init) {
  let state = init;
  const listeners = [];
  return {
    getState: () => state,
    setState(p) { state = { ...state, ...p }; listeners.forEach((l) => l(state)); }, // always notifies
    subscribe(l) { listeners.push(l); }
  };
}
const s = createNaive({ count: 0, name: 'Ana' });
let calls = 0;
s.subscribe(() => calls++);
s.setState({ name: 'Ana' }); // same value, still notifies
console.log(calls); // 1 (wasted)`
    },
    mcq: { q: 'Why does subscribeWithSelector compare old and new slices instead of just state objects?', options: ['Because state objects are always the same reference', 'Because the whole state object changes on every update, but a given component only cares about one field', 'Because comparing slices is faster than comparing numbers'], answer: 1, explain: 'A merge creates a new top-level state object each time, so comparing it says "changed" always. Comparing only the selected slice (e.g. count) lets unrelated components stay asleep.' },
    hints: [
      `<p>Hint 1: two levels of "did it change?": (1) in <code>setState</code>, did the merge change any field? (2) in the selector subscription, did the <i>selected slice</i> change?</p>`,
      `<p>Hint 2: keep listeners in a <code>Set</code>. For <code>subscribeWithSelector</code>, remember the last selected value in a closure and register an ordinary listener that compares.</p>`,
      `<p>Hint 3: recipe: <code>setState</code> computes <code>next</code>; if every key of <code>next</code> is <code>Object.is</code>-equal to the same key in <code>state</code>, return early; else merge and notify with <code>(state, prev)</code>. <code>shallow(a,b)</code>: same keys and equal values.</p>`
    ],
    solution: {
      approach: `<p>Two guards avoid wasted notifications: the merge guard in <code>setState</code> (no field changed, no notification) and the slice guard in <code>subscribeWithSelector</code> (selected value unchanged, no callback). Passing <code>shallow</code> as the equality function allows selectors that return a small object.</p>`,
      code: {
        lang: 'js', run: true,
        code: `function shallow(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && Object.is(a[k], b[k]));
}

function create(initializer) {
  let state;
  const listeners = new Set();

  const getState = () => state;

  const setState = (partial) => {
    const patch = typeof partial === 'function' ? partial(state) : partial;
    // Guard 1: if nothing really changes, do nothing at all
    const changed = Object.keys(patch).some((k) => !Object.is(patch[k], state[k]));
    if (!changed) return;
    const prev = state;
    state = { ...state, ...patch };
    listeners.forEach((l) => l(state, prev));
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const subscribeWithSelector = (selector, listener, equalityFn = Object.is) => {
    let current = selector(state);
    return subscribe((s) => {
      const next = selector(s);
      // Guard 2: only call back when the selected slice changed
      if (!equalityFn(current, next)) {
        const old = current;
        current = next;
        listener(next, old);
      }
    });
  };

  state = initializer(setState, getState);
  return { getState, setState, subscribe, subscribeWithSelector };
}

const store = create((set) => ({ count: 0, name: 'Ana', inc: () => set((s) => ({ count: s.count + 1 })) }));
let countCalls = 0, nameCalls = 0, pairCalls = 0;
store.subscribeWithSelector((s) => s.count, () => { countCalls++; });
store.subscribeWithSelector((s) => s.name, () => { nameCalls++; });
store.subscribeWithSelector((s) => ({ c: s.count, n: s.name }), () => { pairCalls++; }, shallow);

store.getState().inc();
store.getState().inc();
store.setState({ name: 'Ben' });
store.setState({ name: 'Ben' }); // identical -> guard 1 stops it
console.log('count listener', countCalls, '| name listener', nameCalls, '| pair (shallow) listener', pairCalls);
console.log(JSON.stringify({ count: store.getState().count, name: store.getState().name }));`
      },
      dry: { head: ['Call', 'merge changed?', 'count listener', 'name listener', 'pair listener'], rows: [['inc()', 'yes (count)', 'called', 'skipped', 'called'], ['inc()', 'yes (count)', 'called', 'skipped', 'called'], ['setState name Ben', 'yes (name)', 'skipped', 'called', 'called'], ['setState name Ben', '<span class="c-r">no (equal)</span>', 'skipped', 'skipped', 'skipped']] },
      complexity: `<p>Each <code>setState</code> costs O(k) for k keys in the patch plus O(L) selector runs for L listeners. Memory O(L).</p>`,
      followUps: ['How does the React hook use useSyncExternalStore on top of this?', 'How would you add a persist middleware that saves to localStorage on every change?']
    }
  }]
});
/* =====================================================================
   TOPIC 5: React Query / SWR - caching, invalidation, stale-while-revalidate
   ===================================================================== */
topics.push({
  title: 'React Query & SWR: Caching, Staleness and Invalidation',
  analogy: `<p>A server-state library is a <b>smart newsstand</b>. You ask for "today's paper" (a <i>query key</i>). If the stand has a copy that is still <b>fresh</b>, it hands it over instantly. If the copy is a bit old (<b>stale</b>) it still hands it over <i>right now</i> so you are never waiting, and quietly sends a runner to fetch the newest edition. When something big happens (you bought an item: a <b>mutation</b>) you shout "the sports page is out of date!" (<b>invalidation</b>) and the stand re-fetches it. Copies nobody has looked at for a while get thrown out (<b>garbage collection</b>). This idea has a name: <b>stale-while-revalidate (SWR)</b>.</p>`,
  explain: `<p>🟢 <b>The problem it solves.</b> Without a library, every screen does <code>useEffect(() =&gt; fetch(...))</code>, and you write the same loading flag, error flag, retry, "don't fetch twice", "refetch when the user comes back" logic over and over. A server-state library turns all of that into a cache with rules.</p>
    <p>🔵 <b>Key vocabulary:</b></p>
    ${H.table(['Word', 'Plain meaning', 'React Query default'], [
      ['<b>Query key</b>', 'The cache address, an array like <code>[\'products\', { page: 2 }]</code>. Same key = same cache entry.', 'You choose it'],
      ['<b>Fresh</b>', 'Data we trust. Reads are served from cache with <b>no network call</b>.', 'Only for <code>staleTime</code> after fetching'],
      ['<b>staleTime</b>', 'How long fetched data counts as fresh.', '<b>0</b> (stale immediately!)'],
      ['<b>Stale</b>', 'Maybe out of date. Still shown instantly, but a background refetch is triggered on mount, window focus, reconnect.', '-'],
      ['<b>gcTime</b> (cacheTime in v4)', 'How long an entry nobody is using stays in memory before deletion.', '5 minutes'],
      ['<b>Invalidate</b>', 'Mark entries stale on purpose (after a mutation) and refetch the ones on screen.', '<code>queryClient.invalidateQueries</code>'],
      ['<b>isPending / isFetching</b>', '<i>Pending</i> = no data yet (show spinner). <i>Fetching</i> = a request is running (maybe with old data on screen).', '-'],
      ['<b>Dedupe</b>', 'Ten components ask for the same key at once → one request.', 'Built in']
    ])}
    <p>🔵 <b>Fresh vs stale vs gone, as a timeline</b> (<code>staleTime = 30s</code>):</p>
    ${H.table(['Time since fetch', 'Status', 'A new read does…'], [
      ['0 to 29 s', '<span class="c-g">fresh</span>', 'returns cache, <b>no request</b>'],
      ['30 s and later', '<span class="c-y">stale</span>', 'returns cache <b>and</b> refetches in the background (SWR)'],
      ['after invalidate', '<span class="c-r">invalidated</span>', 'same as stale, immediately; active queries refetch now'],
      ['unused for gcTime', '<span class="c-m">garbage collected</span>', 'cache miss: spinner, then fetch']
    ])}
    <p>🔵 <b>Invalidation after a mutation.</b> A mutation (POST/PUT/DELETE) changes the server. Your cached lists are now wrong. In <code>onSuccess</code> call <code>invalidateQueries({ queryKey: ['products'] })</code>. Query keys match by <b>prefix</b>, so this invalidates <code>['products']</code>, <code>['products', { page: 2 }]</code> and <code>['products', 17]</code> at once.</p>
    <p>🔵 <b>SWR (the library by Vercel)</b> is the same idea with a smaller API: <code>useSWR(key, fetcher)</code>, <code>mutate(key)</code> to revalidate, <code>revalidateOnFocus</code>. React Query has more features (mutations, devtools, infinite queries, offline); SWR is lighter. RTK Query and Apollo/urql follow the same cache model.</p>`,
  clues: [
    '"Data is stale after I add/edit an item" → <b>invalidate</b> related query keys in <code>onSuccess</code>',
    '"Show cached data immediately, then update" → <b>stale-while-revalidate</b>',
    '"Same request fires 5 times from 5 components" → <b>dedupe</b> / shared cache entry via the same key',
    '"Refetch when the tab regains focus / network reconnects" → <code>refetchOnWindowFocus</code>, <code>refetchOnReconnect</code>',
    '"How long should we cache product data?" → talk about <b>staleTime</b> per data type (static catalog: minutes; stock level: seconds)',
    '"Paginated list flickers between pages" → <code>placeholderData: keepPreviousData</code>',
    '"Should we put API data in Redux?" → no: use a server-state cache, it already handles staleness'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'A mini query cache: staleTime, dedupe, invalidate, SWR (runnable)',
      code: `// A tiny React-Query-like cache with a fake clock so the output is deterministic.
let clock = 0;
const now = () => clock;
let serverVersion = 0, networkCalls = 0;
const fakeFetch = async () => { networkCalls++; serverVersion++; return 'products v' + serverVersion; };

function createQueryClient({ staleTime = 30, now }) {
  const cache = new Map(); // key -> { data, updatedAt, invalidated, inFlight }
  const isStale = (e) => e.invalidated || now() - e.updatedAt >= staleTime;

  function refetch(key, fetcher) {
    const old = cache.get(key) || {};
    if (old.inFlight) return old.inFlight;                 // DEDUPE: share the running request
    const p = fetcher().then((data) => {
      cache.set(key, { data, updatedAt: now(), invalidated: false, inFlight: null });
      return data;
    });
    cache.set(key, { ...old, inFlight: p });
    return p;
  }

  return {
    async get(key, fetcher) {
      const e = cache.get(key);
      if (!e || !('data' in e)) return { data: await refetch(key, fetcher), source: 'network (cache miss)' };
      if (!isStale(e)) return { data: e.data, source: 'cache (fresh, no request)' };
      refetch(key, fetcher);                               // stale: refresh in the background
      return { data: e.data, source: 'cache (stale) + background refetch' };
    },
    invalidate(key) { const e = cache.get(key); if (e) cache.set(key, { ...e, invalidated: true }); },
    peek: (key) => (cache.get(key) || {}).data
  };
}

const settle = () => new Promise((r) => setTimeout(r, 5));
(async () => {
  const qc = createQueryClient({ staleTime: 30, now });
  const show = async (label) => {
    const r = await qc.get('products', fakeFetch);
    console.log(('t=' + clock + 's ' + label).padEnd(28), '->', r.data.padEnd(12), '|', r.source, '| network calls:', networkCalls);
  };
  await show('first read');          // miss
  clock = 10;  await show('read again');         // fresh
  clock = 40;  await show('read after 40s');     // stale -> instant old data
  await settle();
  console.log('   background refetch finished, cache now holds:', qc.peek('products'));
  qc.invalidate('products');         // a mutation happened
  clock = 41;  await show('after invalidate');   // forced stale
  await settle();
  console.log('   cache now holds:', qc.peek('products'));
})();`
    },
    {
      lang: 'jsx', check: false, title: 'React Query (TanStack Query v5): query + mutation + invalidation',
      code: `import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, gcTime: 5 * 60_000, retry: 2 } }
});

// App root:  <QueryClientProvider client={queryClient}><App /></QueryClientProvider>

// Key factory: one place that builds keys, so invalidation never typos
export const productKeys = {
  all: ['products'],
  list: (filters) => ['products', 'list', filters],
  detail: (id) => ['products', 'detail', id]
};

function ProductList({ category, page }) {
  const { data, isPending, isFetching, error } = useQuery({
    queryKey: productKeys.list({ category, page }),   // different filters = different cache entries
    queryFn: ({ signal }) =>                          // signal: auto-cancel when key changes/unmounts
      fetch('/api/products?category=' + category + '&page=' + page, { signal }).then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status); // throw, or React Query thinks it succeeded
        return r.json();
      }),
    placeholderData: keepPreviousData                 // no flicker between pages
  });

  if (isPending) return <p>Loading...</p>;            // no data at all yet
  if (error) return <p>Failed: {error.message}</p>;
  return (
    <ul style={{ opacity: isFetching ? 0.6 : 1 }}>    {/* dim while refreshing in the background */}
      {data.items.map((p) => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}

function AddProductForm() {
  const qc = useQueryClient();
  const addProduct = useMutation({
    mutationFn: (body) => fetch('/api/products', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }).then((r) => r.json()),
    onSuccess: () => {
      // prefix match: refreshes every list and detail starting with ['products']
      qc.invalidateQueries({ queryKey: productKeys.all });
    }
  });
  return <button disabled={addProduct.isPending} onClick={() => addProduct.mutate({ name: 'New shoe' })}>Add</button>;
}`
    },
    {
      lang: 'jsx', check: false, title: 'The same idea with SWR',
      code: `import useSWR, { useSWRConfig } from 'swr';

const fetcher = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });

function Products() {
  // key = URL. Returns cached data instantly, then revalidates in the background.
  const { data, error, isLoading, isValidating } = useSWR('/api/products', fetcher, {
    revalidateOnFocus: true,     // refetch when the tab is focused again
    dedupingInterval: 2000       // identical calls within 2s share one request
  });
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Failed</p>;
  return <ul>{data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}

function AddButton() {
  const { mutate } = useSWRConfig();
  return (
    <button onClick={async () => {
      await fetch('/api/products', { method: 'POST' });
      mutate('/api/products');   // revalidate that key = SWR's version of invalidation
    }}>Add</button>
  );
}`
    }
  ],
  viz: {
    title: 'Query cache: fresh, stale, invalidated, gone',
    input: 'read products, wait 10, read products, wait 25, read products, invalidate products, read products, wait 400, read cart',
    inputLabel: 'Commands (comma separated): read KEY | wait SECONDS | invalidate KEY (staleTime 30s, gcTime 300s)',
    gen: function (input) {
      var cmds = String(input).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (cmds.length < 3) throw new Error('Enter at least 3 commands, e.g. read products, wait 40, read products');
      if (cmds.length > 14) throw new Error('Use at most 14 commands');
      var parsed = cmds.map(function (c) {
        var m = /^(read|wait|invalidate)\s+([a-z0-9_-]+)$/i.exec(c);
        if (!m) throw new Error('Use: read KEY, wait SECONDS, invalidate KEY');
        var verb = m[1].toLowerCase();
        if (verb === 'wait' && (isNaN(Number(m[2])) || Number(m[2]) > 1000)) throw new Error('wait needs a number of seconds (max 1000)');
        return { verb: verb, arg: m[2].toLowerCase() };
      });
      var STALE = 30, GC = 300, now = 0, calls = 0, cache = {}, server = {}, frames = [];
      function status(e) { if (e.invalid) return 'invalidated'; return now - e.fetchedAt < STALE ? 'fresh' : 'stale'; }
      function fetchData(k) { server[k] = (server[k] || 0) + 1; calls++; return k + ' v' + server[k]; }
      function parts(hlKey, extra) {
        var keys = Object.keys(cache), rows = [], hl = {}, ui = [];
        keys.forEach(function (k, i) {
          var e = cache[k], st = status(e);
          rows.push([k, e.data, e.fetchedAt + 's', (now - e.fetchedAt) + 's', st]);
          if (k === hlKey) hl[i] = extra || 'cur';
          ui.push([k, e.data]);
        });
        if (!rows.length) rows = [['(empty)', '', '', '', '']];
        var out = [{ type: 'table', label: 'Query cache (staleTime ' + STALE + 's, gcTime ' + GC + 's)', columns: ['key', 'data', 'fetched at', 'age', 'status'], rows: rows, hl: hl }];
        if (ui.length) out.push({ type: 'map', label: 'Cache contents', entries: ui, hl: hlKey && cache[hlKey] ? (function () { var h = {}; h[hlKey] = extra || 'cur'; return h; })() : {} });
        out.push({ type: 'vars', label: 'Clock and network', vals: { clock: now + 's', networkCalls: calls } });
        return out;
      }
      frames.push({ narr: 'The cache starts empty. Data is <b>fresh</b> for ' + STALE + ' seconds, then <b>stale</b>. Entries unused for ' + GC + ' seconds are deleted.', parts: parts(null) });
      parsed.forEach(function (c) {
        if (c.verb === 'wait') {
          now += Number(c.arg);
          var gone = [];
          Object.keys(cache).forEach(function (k) { if (now - cache[k].lastUsed > GC) { gone.push(k); delete cache[k]; } });
          frames.push({ narr: '<b>' + c.arg + ' seconds pass.</b> The clock is now ' + now + 's. Ages grow, so fresh entries may turn stale.' + (gone.length ? ' <span class="c-r">"' + gone.join(', ') + '" was unused for more than ' + GC + 's and was garbage collected.</span>' : ''), parts: parts(null) });
        } else if (c.verb === 'invalidate') {
          if (cache[c.arg]) {
            cache[c.arg].invalid = true;
            frames.push({ narr: '<b>invalidateQueries("' + c.arg + '")</b> (imagine a mutation just succeeded). The entry is marked <span class="c-r">invalidated</span>: it is treated as stale right now, whatever its age. A component showing it would refetch immediately.', parts: parts(c.arg, 'bad') });
          } else {
            frames.push({ narr: '<b>invalidateQueries("' + c.arg + '")</b> but there is nothing cached under that key, so there is nothing to do.', parts: parts(null) });
          }
        } else {
          var e = cache[c.arg];
          if (!e) {
            frames.push({ narr: '<b>read "' + c.arg + '"</b> is a <span class="c-r">cache miss</span>. No data to show, so the component renders a spinner (<code>isPending</code>) and the fetch starts.', parts: parts(null) });
            var d = fetchData(c.arg);
            cache[c.arg] = { data: d, fetchedAt: now, lastUsed: now, invalid: false };
            frames.push({ narr: 'The response arrives: <b>' + d + '</b> is cached at ' + now + 's and is <span class="c-g">fresh</span> for ' + STALE + ' seconds. The spinner is replaced by data.', parts: parts(c.arg, 'ok') });
          } else {
            var st = status(e);
            e.lastUsed = now;
            if (st === 'fresh') {
              frames.push({ narr: '<b>read "' + c.arg + '"</b>: the entry is <span class="c-g">fresh</span> (age ' + (now - e.fetchedAt) + 's &lt; ' + STALE + 's). Served from cache, <b>zero network calls</b>.', parts: parts(c.arg, 'ok') });
            } else {
              frames.push({ narr: '<b>read "' + c.arg + '"</b>: the entry is <span class="c-y">' + st + '</span>. The screen shows the old <b>' + e.data + '</b> <i>instantly</i> (no spinner) while a background refetch runs. This is stale-while-revalidate.', parts: parts(c.arg, 'cur') });
              var nd = fetchData(c.arg);
              e.data = nd; e.fetchedAt = now; e.invalid = false;
              frames.push({ narr: 'The background request finishes. The cache swaps in <b>' + nd + '</b>, the status goes back to <span class="c-g">fresh</span>, and the component re-renders with the new data. One extra network call, zero waiting for the user.', parts: parts(c.arg, 'ok') });
            }
          }
        }
      });
      frames.push({ narr: 'Done: <b>' + calls + '</b> network call(s) for ' + parsed.filter(function (p) { return p.verb === 'read'; }).length + ' reads. A cache turns many reads into few requests without ever showing a blank screen for data we already had.', parts: parts(null) });
      return frames;
    }
  },
  examples: [
    {
      title: 'Choosing staleTime per kind of data',
      html: `<p>There is no single right <code>staleTime</code>. Ask: <i>how bad is it if the user sees data N seconds old?</i></p>
        ${H.table(['Data', 'Changes how often?', 'Sensible staleTime'], [
          ['Country list, product categories', 'almost never', '1 hour to <code>Infinity</code>'],
          ['Product details, blog posts', 'a few times per day', '1 to 5 minutes'],
          ['Cart contents (server-side cart)', 'on user actions', '0 to 30 s + invalidate on mutations'],
          ['Stock level, live price', 'constantly', '0 to 5 s, or use websockets/polling (<code>refetchInterval</code>)'],
          ['Logged-in user profile', 'rarely', '5 minutes + invalidate after "edit profile"']
        ])}
        <p>Remember the default is <b>0</b>: every mount or focus triggers a background refetch. That is safe but chatty. Raise it deliberately.</p>`
    },
    {
      title: 'Query keys and prefix invalidation',
      html: `<p>The key is a dependency array: when anything in it changes, you get a different cache entry. After "delete product 17" you want to refresh the lists but the other details can stay:</p>
        ${H.table(['Call', 'Invalidates'], [
          ['<code>invalidateQueries({ queryKey: [\'products\'] })</code>', '<span class="c-g">every</span> key starting with products (lists, details, search)'],
          ['<code>invalidateQueries({ queryKey: [\'products\', \'list\'] })</code>', 'only lists'],
          ['<code>invalidateQueries({ queryKey: [\'products\', \'detail\', 17] })</code>', 'only product 17'],
          ['<code>invalidateQueries({ queryKey: [\'products\'], exact: true })</code>', 'only the entry whose key is exactly [\'products\']']
        ])}
        <p>Put keys in a <b>factory object</b> (as in the code above) so a typo cannot silently skip invalidation.</p>`
    },
    {
      title: 'Writing back instead of refetching: setQueryData',
      html: `<p>If the mutation response already contains the updated item, you can skip the extra network call and write it straight into the cache. The UI updates instantly and exactly one request was made. For lists it is often simpler and safer to <b>invalidate</b> (the server decides ordering and filters).</p>`,
      code: {
        lang: 'jsx', check: false, title: 'setQueryData after update',
        code: `const qc = useQueryClient();
const rename = useMutation({
  mutationFn: ({ id, name }) => api.patch('/products/' + id, { name }),   // returns the updated product
  onSuccess: (updated) => {
    qc.setQueryData(['products', 'detail', updated.id], updated);          // write result into the detail cache
    qc.invalidateQueries({ queryKey: ['products', 'list'] });             // lists depend on server ordering: refetch
  }
});`
      }
    }
  ],
  deepDive: `<p>🟣 <b>Mental model: the cache is the source of truth for the UI.</b> Components do not "fetch"; they <b>observe</b> a cache entry. <code>useQuery</code> creates an <i>observer</i> attached to a <i>query</i> (the entry). The query holds data, status, <code>dataUpdatedAt</code> and a retryer. Many observers can share one query. When the last observer unmounts, a GC timer (<code>gcTime</code>) starts; when it fires, the query is deleted.</p>
    <p>🟣 <b>What triggers a background refetch?</b> (1) a new observer mounts with stale data, (2) window refocus, (3) network reconnect, (4) <code>refetchInterval</code> polling, (5) <code>invalidateQueries</code> / <code>refetch()</code>. Each is a per-query option, so you can turn off focus refetching for expensive endpoints.</p>
    <p>🟣 <b>Request lifecycle details.</b> Deduping: if a fetch is in flight, new observers join its promise. Cancellation: pass <code>signal</code> from <code>queryFn</code> context into <code>fetch</code>, so superseded requests are aborted. Retries: failed queries retry 3 times with exponential backoff by default (not for mutations). Errors: <code>fetch</code> does <b>not</b> reject on 404/500, so you must throw yourself.</p>
    <p>🟣 <b>Race conditions are handled for you.</b> A hand-written <code>useEffect</code> fetch can show page 2's data after the user already moved to page 3 (responses arrive out of order). Because each key has its own entry, the UI always renders the entry for the <i>current</i> key.</p>
    <p>🟣 <b>Structural sharing.</b> When a refetch returns data deeply equal to the cache, React Query keeps the old object references, so memoized children do not re-render. Only changed branches get new references. Use <code>select</code> to subscribe to a slice (like a Redux selector).</p>
    <p>🟣 <b>SSR / Server Components.</b> Prefetch on the server, <code>dehydrate</code> the cache into the HTML, and <code>HydrationBoundary</code> on the client restores it so there is no loading flash. With RSC many reads become server-only; React Query remains the tool for interactive client-side fetching, mutations and polling.</p>
    <p>🟣 <b>Persisting the cache</b> (offline apps): <code>persistQueryClient</code> to IndexedDB/localStorage; set <code>gcTime</code> at least as long as the persistence time, otherwise restored entries are deleted immediately.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> assistants now default to React Query for data fetching, which is good. They are also great at migrating hand-rolled <code>useEffect</code> fetching into <code>useQuery</code> and at writing key factories. Streaming LLM responses and agent tool calls introduce a new kind of "server state" that is not a simple request/response cache; for chat UIs you typically combine a streaming hook (e.g. the AI SDK) with a normal query for history.</p>
    <p><b>Use AI as a partner:</b> <code>List every useEffect+fetch in this folder and convert each to useQuery with a key factory. Tell me which mutations must invalidate which keys.</code> Then review the invalidation table yourself.</p>
    <p><b>Where AI goes wrong:</b> leaves <code>staleTime</code> at 0 everywhere (chatty), forgets to throw on non-2xx responses, puts unstable objects (like <code>new Date()</code>) in query keys (a new entry on every render), copies <code>data</code> into <code>useState</code> (a second source of truth), and invalidates too broadly (<code>queryClient.invalidateQueries()</code> with no key refetches everything).</p>
    <p><b>What you must still own:</b> the freshness policy for each kind of data, the invalidation map ("this mutation changes these keys"), and error/offline UX. Those are product decisions disguised as technical ones.</p>`,
  problems: [{
    title: 'Mini Query Cache with staleTime, Dedupe and Invalidation',
    level: 'Medium', tags: ['react-query', 'cache', 'swr', 'async'], companies: ['Atlassian', 'Vercel', 'Stripe'],
    statement: `<p>Build <code>createQueryClient({ staleTime, now })</code> with: <code>get(key, fetcher)</code> returning <code>{ data, source }</code>; <code>invalidate(key)</code>; and <code>peek(key)</code>. Rules: (1) a missing entry waits for the network; (2) a <b>fresh</b> entry (age &lt; staleTime) returns from cache with <b>no</b> network call; (3) a <b>stale or invalidated</b> entry returns the cached value immediately and refreshes in the background; (4) two simultaneous requests for one key must share <b>one</b> network call. Use an injected clock <code>now()</code> so it is testable.</p>`,
    constraints: `Keys are strings. The fetcher returns a Promise. No timers inside the cache (time only comes from <code>now()</code>).`,
    example: `<p>staleTime = 30. Reads at t=0, t=10, t=40, then invalidate, then t=41:</p>
      ${H.table(['t', 'status', 'returns', 'network calls'], [['0', 'miss', 'v1 (waits)', '1'], ['10', 'fresh', 'v1', '1'], ['40', 'stale', 'v1 now, v2 later', '2'], ['41 (invalidated)', 'stale', 'v2 now, v3 later', '3']])}
      <p><b>Why:</b> the user never stares at a spinner for data we already have.</p>`,
    brute: {
      why: `<p>The naive hook fetches on every call: no cache, no dedupe. Ten components showing the same list trigger ten requests, and navigating back shows a spinner again.</p>`,
      code: `let networkCalls = 0;
const fetcher = async () => { networkCalls++; return 'data'; };
async function naiveGet(key) {
  return fetcher(); // every read hits the network
}
(async () => {
  await Promise.all([naiveGet('p'), naiveGet('p'), naiveGet('p')]);
  await naiveGet('p');
  console.log('network calls:', networkCalls); // 4 for the same data
})();`
    },
    mcq: { q: 'staleTime is 30s. At t=45s a component mounts and reads a key that was fetched at t=0. What should happen?', options: ['Show a spinner and wait for a new fetch', 'Show the cached data immediately and refetch in the background', 'Show cached data and never refetch'], answer: 1, explain: 'Past staleTime the data is stale, not deleted. Stale-while-revalidate shows it right away and refreshes quietly. Deleting is gcTime\'s job, and only for unused entries.' },
    hints: [
      `<p>Hint 1: an entry needs three facts: the <code>data</code>, <code>updatedAt</code> and an <code>invalidated</code> flag. "Stale" = invalidated OR <code>now() - updatedAt &gt;= staleTime</code>.</p>`,
      `<p>Hint 2: store the in-flight <b>Promise</b> in the entry. A second caller that finds <code>inFlight</code> returns that same Promise instead of calling the fetcher.</p>`,
      `<p>Hint 3: recipe for <code>get</code>: no data yet → <code>await refetch()</code>; fresh → return cache; stale → call <code>refetch()</code> without awaiting and return old data. When the promise resolves, store data, update <code>updatedAt</code>, clear <code>invalidated</code> and <code>inFlight</code>.</p>`
    ],
    solution: {
      approach: `<p>One Map from key to entry. The entry holds data, timestamp, invalidated flag and the running promise. <code>refetch</code> is the only function that touches the network and it is idempotent while a request is in flight (dedupe). <code>get</code> picks one of three branches: miss, fresh, stale. A fake clock makes the timeline deterministic.</p>`,
      code: {
        lang: 'js', run: true,
        code: `function createQueryClient({ staleTime = 30, now }) {
  const cache = new Map();
  const isStale = (e) => e.invalidated || now() - e.updatedAt >= staleTime;

  function refetch(key, fetcher) {
    const old = cache.get(key) || {};
    if (old.inFlight) return old.inFlight;                 // 4) dedupe
    const p = fetcher().then((data) => {
      cache.set(key, { data, updatedAt: now(), invalidated: false, inFlight: null });
      return data;
    }, (err) => {
      cache.set(key, { ...old, inFlight: null });         // keep old data, allow retry
      throw err;
    });
    cache.set(key, { ...old, inFlight: p });
    return p;
  }

  return {
    async get(key, fetcher) {
      const e = cache.get(key);
      if (!e || !('data' in e)) return { data: await refetch(key, fetcher), source: 'miss' };   // 1)
      if (!isStale(e)) return { data: e.data, source: 'fresh' };                                 // 2)
      refetch(key, fetcher).catch(() => {});                                                      // 3) background
      return { data: e.data, source: 'stale+refetch' };
    },
    invalidate(key) { const e = cache.get(key); if (e) cache.set(key, { ...e, invalidated: true }); },
    peek: (key) => (cache.get(key) || {}).data
  };
}

let clock = 0, version = 0, calls = 0;
const fetcher = async () => { calls++; version++; return 'v' + version; };
const wait = () => new Promise((r) => setTimeout(r, 5));

(async () => {
  const qc = createQueryClient({ staleTime: 30, now: () => clock });
  // dedupe test: three simultaneous first reads -> ONE network call
  const first = await Promise.all([qc.get('p', fetcher), qc.get('p', fetcher), qc.get('p', fetcher)]);
  console.log('t=0  ', first.map((r) => r.data + ':' + r.source).join(' '), '| calls', calls);
  clock = 10; let r = await qc.get('p', fetcher);
  console.log('t=10 ', r.data, r.source, '| calls', calls);
  clock = 40; r = await qc.get('p', fetcher); await wait();
  console.log('t=40 ', r.data, r.source, '| calls', calls, '| cache now', qc.peek('p'));
  qc.invalidate('p'); clock = 41; r = await qc.get('p', fetcher); await wait();
  console.log('t=41 ', r.data, r.source, '| calls', calls, '| cache now', qc.peek('p'));
})();`
      },
      dry: { head: ['t', 'entry state', 'branch', 'returned', 'network calls'], rows: [['0 (x3)', 'none', 'miss + dedupe', 'v1 x3', '1'], ['10', 'age 10 &lt; 30', '<span class="c-g">fresh</span>', 'v1', '1'], ['40', 'age 40 &ge; 30', '<span class="c-y">stale</span>', 'v1, then cache = v2', '2'], ['41 after invalidate', 'invalidated', '<span class="c-y">stale</span>', 'v2, then cache = v3', '3']] },
      complexity: `<p>O(1) per call (Map lookups). Memory O(number of keys). Add a <code>lastUsed</code> field and a sweep to implement <code>gcTime</code>.</p>`,
      followUps: ['How would you add gcTime so unused entries are removed after 5 minutes?', 'What changes if two components use the same key with different staleTime values?']
    }
  }]
});
/* =====================================================================
   TOPIC 6: Optimistic updates
   ===================================================================== */
topics.push({
  title: 'Optimistic Updates and Rollback',
  analogy: `<p>You hand a waiter your order and he says "<b>Great, coming up!</b>" before the kitchen has even confirmed it. Almost always the kitchen says yes, so you are never left staring at him waiting. Once in a while the kitchen says "we are out of fish". The waiter returns and says "sorry, I take that back" and you order something else. That is an <b>optimistic update</b>: <i>assume success, show it now, and undo (rollback) if the server says no</i>. The UI feels instant because you never wait for the network.</p>`,
  explain: `<p>🟢 <b>Why bother?</b> A "Like" button that waits 400 ms for the server feels broken. Users expect taps to react immediately. For actions that nearly always succeed (like, bookmark, check a to-do, reorder a list) you can update the screen first and fix it later if needed.</p>
    <p>🔵 <b>The four-step recipe</b> (this is exactly React Query's <code>onMutate / onError / onSettled</code>):</p>
    ${H.table(['Step', 'What you do', 'Why'], [
      ['<b>1. Snapshot</b>', 'Cancel in-flight refetches of that data, then save the current value', 'A late refetch must not overwrite your optimistic value; the snapshot is your undo button'],
      ['<b>2. Optimistic write</b>', 'Write the expected result into the cache/state immediately', 'The UI updates in ~0 ms'],
      ['<b>3. Send the request</b>', 'Mutation runs in the background', 'The server is still the real boss'],
      ['<b>4a. Success</b>', 'Do nothing special (or merge the real response)', 'Our guess was right'],
      ['<b>4b. Error: rollback</b>', 'Restore the snapshot and show a message', 'Never leave the user believing something false'],
      ['<b>5. Settle</b>', 'Always invalidate/refetch afterwards (success or failure)', 'Make the client agree with the server, which has the final word']
    ])}
    <p>🔵 <b>When to use it:</b> high success rate, cheap to undo, low stakes: likes, follows, toggles, reordering, adding a comment. <b>When NOT to:</b> payments, bookings that can sell out, deleting irreversible data, anything with server-side validation the client cannot predict. For those, show a pending state and wait for the server.</p>
    <p>🔵 <b>Two flavours.</b> (a) <b>Cache-based</b>: edit the shared cache (<code>setQueryData</code>) so every component showing that data updates. (b) <b>UI-only</b>: keep the pending value near the button (<code>mutation.variables</code> in React Query, or React 19's <code>useOptimistic</code>) and show it while the mutation is pending; there is nothing to roll back because the temporary value simply disappears.</p>`,
  clues: [
    '"Make the like / checkbox / reorder feel instant" → optimistic update',
    '"What if the request fails?" → <b>rollback</b> to a snapshot, show an error',
    '"Two quick clicks and the count is wrong" → race between overlapping mutations; cancel queries, use sequence/versions',
    '"After the mutation the list flashes old data" → a refetch landed mid-flight; <code>cancelQueries</code> in <code>onMutate</code>',
    '"Temporary id for a new todo" → optimistic <b>create</b> with a client-generated id, replaced by the server id on success',
    '"Should we do this for checkout?" → no: explain why (can fail for reasons the client cannot predict, money involved)'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Optimistic update with rollback, plain JS (runnable)',
      code: `// A tiny "like" model: snapshot -> optimistic write -> request -> rollback on failure.
function createStore(initial) {
  let state = initial;
  return { get: () => state, set: (next) => { state = next; console.log('   UI shows:', JSON.stringify(state)); } };
}

async function toggleLike(store, request) {
  // 1) snapshot: our undo button
  const snapshot = store.get();
  // 2) optimistic write: update the screen right now
  store.set({ liked: !snapshot.liked, count: snapshot.count + (snapshot.liked ? -1 : 1) });
  try {
    await request();                 // 3) the real request
    console.log('   server said OK, keep the optimistic value');
  } catch (err) {
    store.set(snapshot);             // 4b) rollback
    console.log('   server said no (' + err.message + '), rolled back');
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const okRequest = async () => { await sleep(20); };
const failRequest = async () => { await sleep(20); throw new Error('HTTP 500'); };

(async () => {
  console.log('Case 1: server succeeds');
  const a = createStore({ liked: false, count: 10 });
  await toggleLike(a, okRequest);
  console.log('Case 2: server fails');
  const b = createStore({ liked: false, count: 10 });
  await toggleLike(b, failRequest);
})();`
    },
    {
      lang: 'jsx', check: false, title: 'React Query: optimistic like with rollback (cache-based)',
      code: `import { useMutation, useQueryClient } from '@tanstack/react-query';

function useLike(postId) {
  const qc = useQueryClient();
  const key = ['posts', 'detail', postId];

  return useMutation({
    mutationFn: () => fetch('/api/posts/' + postId + '/like', { method: 'POST' }).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }),

    // 1 + 2: runs BEFORE the request is sent
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });          // a late refetch must not overwrite us
      const previous = qc.getQueryData(key);              // snapshot
      qc.setQueryData(key, (old) => ({                    // optimistic write (new object, never mutate)
        ...old,
        liked: true,
        likes: old.likes + 1
      }));
      return { previous };                                // goes to onError as "context"
    },

    // 4b: request failed -> rollback
    onError: (err, vars, context) => {
      qc.setQueryData(key, context.previous);
      // also show a toast: "Could not like this post"
    },

    // 5: success OR failure -> sync with the server's truth
    onSettled: () => qc.invalidateQueries({ queryKey: key })
  });
}

function LikeButton({ post }) {
  const like = useLike(post.id);
  return <button onClick={() => like.mutate()} disabled={like.isPending}>Like ({post.likes})</button>;
}`
    },
    {
      lang: 'jsx', check: false, title: 'React 19 useOptimistic (UI-only flavour)',
      code: `import { useOptimistic, useTransition } from 'react';

function LikeButton({ liked, count, likeAction }) {
  const [isPending, startTransition] = useTransition();
  // optimistic value = real props, plus the pending change on top
  const [optimistic, setOptimistic] = useOptimistic({ liked, count }, (cur) => ({
    liked: !cur.liked,
    count: cur.count + (cur.liked ? -1 : 1)
  }));

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          setOptimistic();                 // shows immediately
          await likeAction();              // when this finishes, props update and replace the guess
        })                                 // if it throws, React drops the optimistic state automatically
      }
    >
      {optimistic.liked ? '♥' : '♡'} {optimistic.count}
    </button>
  );
}`
    }
  ],
  viz: {
    title: 'Optimistic like: instant UI, then success or rollback',
    input: 'fail',
    inputLabel: 'Server result: success | fail',
    gen: function (input) {
      var mode = String(input).trim().toLowerCase();
      if (mode !== 'success' && mode !== 'fail') throw new Error('Type success or fail');
      var frames = [];
      function vars(v, hl) { return { type: 'vars', label: 'State', vals: v, hl: hl || {} }; }
      function q(items, hl) { return { type: 'queue', label: 'Pending requests', items: items, hl: hl || {}, frontLabel: 'sent first', backLabel: 'newest' }; }
      frames.push({ narr: 'A post has <b>10 likes</b> and you have not liked it. The screen and the server agree.', parts: [vars({ serverCount: 10, uiCount: 10, uiLiked: false, snapshot: '(none)' }), q([])] });
      frames.push({ narr: '<b>You tap the heart.</b> <code>onMutate</code> runs first: cancel any running refetch (it could overwrite us) and <b>save a snapshot</b> of the current value. That snapshot is the undo button.', parts: [vars({ serverCount: 10, uiCount: 10, uiLiked: false, snapshot: '{liked:false, count:10}' }, { snapshot: 'cur' }), q([])] });
      frames.push({ narr: '<b>Optimistic write.</b> We write the <i>expected</i> result into the cache: liked becomes true and the count 11. The user sees the change in about 0 ms. The server has not been told anything yet!', parts: [vars({ serverCount: 10, uiCount: 11, uiLiked: true, snapshot: '{liked:false, count:10}' }, { uiCount: 'ok', uiLiked: 'ok' }), q([])] });
      frames.push({ narr: '<b>The request goes out</b> in the background: <code>POST /like</code>. The UI and the server disagree for a moment (UI 11, server 10). That gap is the risk we accepted for speed.', parts: [vars({ serverCount: 10, uiCount: 11, uiLiked: true, snapshot: '{liked:false, count:10}' }, { serverCount: 'cur', uiCount: 'cur' }), q(['POST /like'], { 0: 'cur' })] });
      if (mode === 'success') {
        frames.push({ narr: '<span class="c-g">200 OK.</span> The server saved the like: its count becomes 11. Our guess was right, so nothing visibly changes. The request leaves the queue.', parts: [vars({ serverCount: 11, uiCount: 11, uiLiked: true, snapshot: '(discarded)' }, { serverCount: 'ok', uiCount: 'ok' }), q([])] });
        frames.push({ narr: '<code>onSettled</code> invalidates the post query and refetches. The response says 11 likes, matching the screen. The client is in sync again. Total felt latency for the user: <b>zero</b>.', parts: [vars({ serverCount: 11, uiCount: 11, uiLiked: true, snapshot: '(discarded)' }, { serverCount: 'ok', uiCount: 'ok', uiLiked: 'ok' }), q([])] });
      } else {
        frames.push({ narr: '<span class="c-r">500 error!</span> The server did not save the like (server count is still 10). But the screen shows 11, which is now a <b>lie</b>. We must undo it.', parts: [vars({ serverCount: 10, uiCount: 11, uiLiked: true, snapshot: '{liked:false, count:10}' }, { uiCount: 'bad', uiLiked: 'bad', serverCount: 'bad' }), q(['POST /like (failed)'], { 0: 'bad' })] });
        frames.push({ narr: '<b>Rollback.</b> <code>onError</code> restores the snapshot: liked false, count 10. The heart un-fills and a toast says "Could not like this post". The user is told the truth.', parts: [vars({ serverCount: 10, uiCount: 10, uiLiked: false, snapshot: '(used)' }, { uiCount: 'ok', uiLiked: 'ok' }), q([])] });
        frames.push({ narr: '<code>onSettled</code> still runs after a failure: it refetches the post so the client matches the server no matter what happened. Never skip this step.', parts: [vars({ serverCount: 10, uiCount: 10, uiLiked: false, snapshot: '(discarded)' }, { serverCount: 'ok', uiCount: 'ok' }), q([])] });
      }
      return frames;
    }
  },
  examples: [
    {
      title: 'Optimistic create with a temporary id',
      html: `<p>Adding a todo: show it at once with a made-up id (<code>tmp-1</code>), mark it as "saving", and replace it with the server's real object on success. On failure remove it (or keep it with a "retry" button, which users like better than a vanishing item).</p>
        ${H.table(['Moment', 'List in the UI'], [
          ['Before', '[ Buy milk ]'],
          ['Tap "Add"', '[ Buy milk, <span class="c-y">Walk dog (saving...)</span> ] id: tmp-1'],
          ['201 Created, id 57', '[ Buy milk, <span class="c-g">Walk dog</span> ] id: 57'],
          ['500 Error', '[ Buy milk, <span class="c-r">Walk dog (failed, retry?)</span> ]']
        ])}`
    },
    {
      title: 'Two quick clicks (the race that bites)',
      html: `<p>You tap Like, then Unlike quickly. Request A (like) and request B (unlike) are in flight. If A's snapshot is restored after B has already succeeded, the UI shows the wrong state. Safe rules: (1) <b>cancel in-flight refetches</b> in <code>onMutate</code>; (2) <b>disable the button</b> while pending, or serialize the mutations; (3) in <code>onSettled</code> refetch from the server only when <b>no other mutation for that key is still running</b> (<code>queryClient.isMutating({ mutationKey })</code>). Practice problem 12 builds a correct version.</p>`
    },
    {
      title: 'When optimistic is the wrong choice',
      html: `<p>Do <b>not</b> use optimistic updates for: paying for an order (it can fail for card reasons you cannot predict), booking the last seat (someone else may have taken it), changing a password, deleting an account. For those show a clear <i>pending</i> state ("Processing...") and update only after success. A good rule: <b>if rolling back would surprise or hurt the user, wait for the server.</b></p>`
    }
  ],
  deepDive: `<p>🟣 <b>Why cancel queries first?</b> Suppose a background refetch started before your click and returns <i>after</i> your optimistic write. It carries the old server value and would silently overwrite your update, making the heart flicker back. <code>cancelQueries</code> aborts or ignores those responses.</p>
    <p>🟣 <b>Snapshot rollback vs invalidate-only.</b> You can skip snapshots entirely and rely on <code>onSettled</code> refetch to repair state: on failure the refetch brings the true value back. The cost: the wrong value stays visible until the refetch finishes (maybe 300 ms), and offline it never repairs. Snapshots give an instant, deterministic undo; refetch gives eventual truth. Production code usually has both.</p>
    <p>🟣 <b>Overlapping mutations.</b> A snapshot taken for mutation B includes A's optimistic change. If A fails and restores <i>its</i> snapshot, B's change is erased; if B fails and restores <i>its</i> snapshot, A's failed change reappears. Robust designs store <b>operations</b> rather than states: keep a base state plus a list of pending operations, and render <code>base + pending ops</code>. A failed op is simply removed from the list. (This is the idea behind Apollo's optimistic layers and many CRDT-ish systems.)</p>
    <p>🟣 <b>Idempotency and retries.</b> If the network drops after the server saved the like, the client sees an error and may retry, producing a double like. Mutations that may be retried need an <b>idempotency key</b> or must be naturally idempotent (<code>PUT liked=true</code> instead of <code>POST /toggle</code>). Prefer "set state to X" endpoints over "toggle" endpoints.</p>
    <p>🟣 <b>Offline.</b> React Query can pause mutations while offline and replay them when back online (<code>networkMode</code>, persisted mutation cache). Optimistic UI plus a persisted queue is the foundation of offline-first apps.</p>
    <p>🟣 <b>Server validation errors.</b> If the server returns 422 with a reason, rollback alone is not enough: show the reason next to the field. Keep the user's input so they can fix it instead of losing what they typed.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> AI apps are full of <b>optimistic UI</b>: your chat message appears instantly while the model streams a reply, and a placeholder bubble is replaced by the real response. Libraries and hooks for chat (e.g. <code>useChat</code>) implement the same "show now, reconcile later" pattern, including the failure path ("message failed, retry").</p>
    <p><b>Use AI as a partner:</b> <code>Write the onMutate/onError/onSettled for toggling a bookmark in a paginated infinite query. List every cache key that must be updated.</code> Then ask it: <code>What goes wrong if the user double-taps?</code> It is good at generating race-condition test cases.</p>
    <p><b>Where AI goes wrong:</b> it mutates the cached object in place (no re-render), forgets <code>cancelQueries</code>, skips <code>onSettled</code>, restores a snapshot that includes other mutations' changes, and applies optimistic updates to risky actions like payments.</p>
    <p><b>What you must still own:</b> deciding which actions are safe to be optimistic, the failure UX (toast? inline? retry?), idempotency on the API, and testing the failure path. Tests with a mocked 500 response are the only way to prove the rollback works.</p>`,
  problems: [{
    title: 'Optimistic Toggle with Rollback (Plain JS Model)',
    level: 'Medium', tags: ['optimistic', 'rollback', 'async', 'state'], companies: ['Instagram', 'Twitter/X', 'Slack'],
    statement: `<p>Write <code>optimisticUpdate(store, applyChange, request)</code>. It must (1) remember a snapshot, (2) apply <code>applyChange(state)</code> immediately, (3) await <code>request()</code>, (4) on failure restore the snapshot and return <code>{ ok: false }</code>, on success return <code>{ ok: true }</code>. Use it to build a like button: from <code>{ liked: false, count: 10 }</code> a successful request ends at <code>{ liked: true, count: 11 }</code>, a failed one ends back at <code>{ liked: false, count: 10 }</code>. Log every UI state change.</p>`,
    constraints: `<code>applyChange</code> must be pure (returns a new object). The UI state must change <b>before</b> the request resolves.`,
    example: `${H.table(['Moment', 'UI shows', 'Server says'], [['click', '<span class="c-g">liked, 11</span> (instant)', '-'], ['request fails', '<span class="c-r">liked, 11 (wrong!)</span>', '500'], ['rollback', '<span class="c-g">not liked, 10</span>', '-']])}
      <p><b>Why:</b> the UI must never keep a value the server rejected.</p>`,
    brute: {
      why: `<p>The pessimistic version waits for the server before touching the UI. Safe, but every tap has a visible delay of one full round trip (often 200 to 800 ms on mobile).</p>`,
      code: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function pessimisticLike(state, request) {
  const t0 = Date.now();
  await request();                        // user stares at an unchanged heart
  const next = { liked: !state.liked, count: state.count + 1 };
  console.log('UI updated after ' + (Date.now() - t0) + ' ms');
  return next;
}
pessimisticLike({ liked: false, count: 10 }, () => sleep(30));`
    },
    mcq: { q: 'The request fails after the UI already shows "liked, 11". What must happen next?', options: ['Leave it; the next refresh will fix it', 'Restore the snapshot (not liked, 10) and tell the user', 'Retry forever until it works'], answer: 1, explain: 'A rejected optimistic update must be rolled back so the screen tells the truth. A refetch afterwards confirms server state. Blind infinite retries can double-apply a non-idempotent action.' },
    hints: [
      `<p>Hint 1: three moments matter: before the request (snapshot + optimistic write), during (UI already updated), after (keep or undo).</p>`,
      `<p>Hint 2: the snapshot is just the old state object. Because state updates create new objects (no mutation), keeping a reference to the old one is a perfect, free snapshot.</p>`,
      `<p>Hint 3: recipe: <code>const snap = store.get(); store.set(applyChange(snap)); try { await request(); return {ok:true}; } catch { store.set(snap); return {ok:false}; }</code>. Never mutate; the state flips back by reference.</p>`
    ],
    solution: {
      approach: `<p>Because updates are immutable, the snapshot is simply the previous state object. We apply the change first, then await the request. Rollback is <code>store.set(snapshot)</code>. The function resolves with a flag so the caller can show a toast. A log inside <code>set</code> proves the UI changed before the request finished.</p>`,
      code: {
        lang: 'js', run: true,
        code: `function createStore(initial) {
  let state = initial;
  return {
    get: () => state,
    set(next) { state = next; console.log('  UI ->', JSON.stringify(state)); }
  };
}

async function optimisticUpdate(store, applyChange, request) {
  const snapshot = store.get();            // 1) snapshot (immutable, so a reference is enough)
  store.set(applyChange(snapshot));        // 2) show the expected result NOW
  try {
    await request();                       // 3) real work
    return { ok: true };
  } catch (err) {
    store.set(snapshot);                   // 4) rollback
    return { ok: false, error: err.message };
  }
}

const toggleLike = (s) => ({ liked: !s.liked, count: s.count + (s.liked ? -1 : 1) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const good = createStore({ liked: false, count: 10 });
  console.log('success case:');
  console.log(' result', await optimisticUpdate(good, toggleLike, () => sleep(20)));

  const bad = createStore({ liked: false, count: 10 });
  console.log('failure case:');
  console.log(' result', await optimisticUpdate(bad, toggleLike, async () => { await sleep(20); throw new Error('HTTP 500'); }));
})();`
      },
      dry: { head: ['Step', 'store', 'request', 'note'], rows: [['snapshot', '{false, 10}', '-', 'saved reference'], ['apply', '{true, 11}', '-', '<span class="c-g">instant UI</span>'], ['await fails', '{true, 11}', '<span class="c-r">500</span>', 'UI is lying'], ['rollback', '{false, 10}', '-', '<span class="c-g">truth restored</span>']] },
      complexity: `<p>O(1) extra memory for the snapshot (a reference). Perceived latency drops from one round trip to about zero.</p>`,
      followUps: ['What breaks if the user clicks twice quickly? How would you fix it?', 'How would you also show an error toast without coupling the function to the UI?']
    }
  }]
});
/* =====================================================================
   TOPIC 7: Form libraries
   ===================================================================== */
topics.push({
  title: 'Form Libraries: React Hook Form, Validation and Form State',
  analogy: `<p>A form is a <b>paper application at a government counter</b>. The clerk (the form library) keeps track of: what you wrote in each box (<i>values</i>), which boxes you have already touched (<i>touched</i>), whether you changed anything from the blank form (<i>dirty</i>), and what mistakes to circle in red (<i>errors</i>). A bad clerk re-types the <b>whole form</b> every time you write one letter (a controlled form that re-renders on every key). A good clerk just lets you write on the paper and only looks when you step away from a box or hand it in (an <b>uncontrolled</b> form such as React Hook Form).</p>`,
  explain: `<p>🟢 <b>Why a form needs "state" at all.</b> A real form is more than values. For each field you track:</p>
    ${H.table(['Piece of form state', 'Meaning', 'Used for'], [
      ['<b>value</b>', 'What the user typed', 'Submitting, live preview'],
      ['<b>touched</b>', 'The user has left the field at least once (blur)', 'Do not shout "Required!" before they even tried'],
      ['<b>dirty</b>', 'Value differs from the initial value', 'Enable "Save" only if something changed; warn on leaving the page'],
      ['<b>error</b>', 'Validation message (or none)', 'Show red text, set <code>aria-invalid</code>'],
      ['<b>isSubmitting / isSubmitted</b>', 'Request running / form was submitted once', 'Disable the button, show a spinner, show all errors at once'],
      ['<b>isValid</b>', 'All rules pass', 'Enable/disable the submit button']
    ])}
    <p>🔵 <b>Controlled vs uncontrolled.</b> A <b>controlled</b> input stores its value in React state (<code>value={v} onChange=...</code>), so the component re-renders on <i>every keystroke</i>. An <b>uncontrolled</b> input lets the browser keep the value, and React reads it when needed (through a <code>ref</code>). <b>React Hook Form (RHF)</b> is built on uncontrolled inputs: <code>register('email')</code> gives each input a ref and handlers, so typing does <b>not</b> re-render the form. Great for big forms.</p>
    <p>🔵 <b>Validation: when and where.</b></p>
    ${H.table(['Mode', 'Validates when…', 'Feels like'], [
      ['<code>onSubmit</code> (default)', 'the user presses submit; after that, on every change', 'calm, but late feedback'],
      ['<code>onBlur</code>', 'the user leaves a field', 'balanced'],
      ['<code>onTouched</code>', 'first on blur, then on every change', '<b>often the best UX</b>'],
      ['<code>onChange</code> / <code>all</code>', 'every keystroke', 'noisy, more re-renders']
    ])}
    <p>🔵 <b>Schema validation.</b> Instead of writing <code>if</code> rules inside every field, describe the whole shape once with <b>Zod</b> (or Yup / Valibot): <code>z.object({ email: z.string().email(), age: z.coerce.number().min(18) })</code>. The same schema can validate on the client (RHF's <code>zodResolver</code>) <b>and on the server</b>. Remember: client validation is for friendliness; <b>the server must always validate again</b>.</p>
    <p>🔵 <b>Libraries at a glance.</b> <b>React Hook Form</b> (most popular, fast), <b>Formik</b> (older, controlled, more re-renders), <b>TanStack Form</b> (type-safe, framework-agnostic), and React 19's built-in <b>form actions</b> (<code>&lt;form action={fn}&gt;</code>, <code>useActionState</code>, <code>useFormStatus</code>) for simple server-driven forms. For a tiny 2-field login, plain <code>useState</code> is fine.</p>`,
  clues: [
    '"Large form is slow / re-renders on every key" → uncontrolled inputs, React Hook Form',
    '"Show errors only after the user has interacted" → <b>touched</b> state, <code>onTouched</code> mode',
    '"Disable Save until something changes" → <b>dirty</b> state (<code>formState.isDirty</code>)',
    '"Share validation rules between client and server" → a Zod schema',
    '"Username must be unique" → <b>async validation</b>, debounce, ignore stale responses',
    '"Server rejected the form (422)" → <code>setError</code> for field-level server errors, keep the typed values',
    '"Dynamic list of inputs (add another phone number)" → <code>useFieldArray</code>'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'A mini form engine: values, touched, dirty, errors (runnable)',
      code: `// The brain of every form library, in plain JS (no React needed).
const schema = {
  email: [
    (v) => (v ? '' : 'Email is required'),
    (v) => (/^\\S+@\\S+\\.\\S+$/.test(v) ? '' : 'Enter a valid email')
  ],
  age: [
    (v) => (v !== '' ? '' : 'Age is required'),
    (v) => (Number(v) >= 18 ? '' : 'You must be 18 or older')
  ]
};

function validateField(name, value) {
  for (const rule of schema[name]) {            // first failing rule wins
    const message = rule(value);
    if (message) return message;
  }
  return '';
}

function createForm(initial) {
  const state = { values: { ...initial }, touched: {}, submitted: false };
  const errorOf = (name) => validateField(name, state.values[name]);
  return {
    change(name, value) { state.values[name] = value; },
    blur(name) { state.touched[name] = true; },
    // show an error only if the user touched the field or tried to submit
    visibleError(name) { return state.touched[name] || state.submitted ? errorOf(name) : ''; },
    isDirty: (name) => state.values[name] !== initial[name],
    isValid: () => Object.keys(schema).every((n) => !errorOf(n)),
    submit(onValid) {
      state.submitted = true;                    // now every error becomes visible
      return this.isValid() ? onValid({ ...state.values }) : 'blocked: ' + Object.keys(schema).filter(errorOf).join(', ');
    }
  };
}

const form = createForm({ email: '', age: '' });
form.change('email', 'a');
console.log('typing "a", before blur  ->', JSON.stringify(form.visibleError('email')), '(no nagging yet)');
form.blur('email');
console.log('after blur               ->', form.visibleError('email'));
form.change('email', 'a@b.co');
console.log('fixed email              ->', JSON.stringify(form.visibleError('email')), '| dirty:', form.isDirty('email'));
form.change('age', '15');
console.log('submit with age 15       ->', form.submit(() => 'sent'));
form.change('age', '21');
console.log('submit with age 21       ->', form.submit((v) => 'sent ' + JSON.stringify(v)));`
    },
    {
      lang: 'jsx', check: false, title: 'React Hook Form + Zod',
      code: `import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// One schema = types + rules, reusable on the server
const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  age: z.coerce.number({ invalid_type_error: 'Age is required' }).min(18, 'You must be 18 or older')
});

export function SignupForm({ onCreate }) {
  const {
    register, handleSubmit, setError,
    formState: { errors, isDirty, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',                       // validate on first blur, then on change
    defaultValues: { email: '', age: '' }
  });

  const submit = async (values) => {
    const res = await onCreate(values);       // call the API
    if (res.status === 409) setError('email', { message: 'Email already registered' }); // server error on a field
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" {...register('email')}
             aria-invalid={!!errors.email} aria-describedby="email-err" />
      {errors.email && <p id="email-err" role="alert">{errors.email.message}</p>}

      <label htmlFor="age">Age</label>
      <input id="age" type="number" {...register('age')} aria-invalid={!!errors.age} />
      {errors.age && <p role="alert">{errors.age.message}</p>}

      <button disabled={!isDirty || isSubmitting}>Create account</button>
    </form>
  );
}`
    }
  ],
  viz: {
    title: 'Form state: values, touched, dirty, errors, renders',
    input: 'type email=a, blur email, type email=a@b.co, type age=15, blur age, submit',
    inputLabel: 'Events (comma separated): type email=TEXT | type age=NUMBER | blur email | blur age | submit',
    gen: function (input) {
      var evs = String(input).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (evs.length < 2) throw new Error('Enter at least 2 events, e.g. type email=a, blur email');
      if (evs.length > 12) throw new Error('Use at most 12 events');
      var parsed = evs.map(function (e) {
        var m;
        if ((m = /^type\s+(email|age)\s*=\s*(.*)$/i.exec(e))) return { kind: 'type', field: m[1].toLowerCase(), val: m[2] };
        if ((m = /^blur\s+(email|age)$/i.exec(e))) return { kind: 'blur', field: m[1].toLowerCase() };
        if (/^submit$/i.test(e)) return { kind: 'submit' };
        throw new Error('Events look like: type email=a@b.co | type age=21 | blur email | submit');
      });
      function err(f, v) {
        if (f === 'email') { if (!v) return 'Email is required'; if (!/^\S+@\S+\.\S+$/.test(v)) return 'Enter a valid email'; return ''; }
        if (v === '') return 'Age is required'; if (!(Number(v) >= 18)) return 'You must be 18 or older'; return '';
      }
      var st = { values: { email: '', age: '' }, touched: { email: false, age: false }, submitted: false };
      var init = { email: '', age: '' };
      var controlled = 0, rhf = 0, frames = [];
      function visible(f) { return (st.touched[f] || st.submitted) ? err(f, st.values[f]) : ''; }
      function snapshotVis() { return { email: visible('email'), age: visible('age') }; }
      function rowsNow() {
        return ['email', 'age'].map(function (f) {
          var v = visible(f);
          return [f, st.values[f] === '' ? '(empty)' : st.values[f], st.touched[f] ? 'yes' : 'no', st.values[f] !== init[f] ? 'yes' : 'no', v || (st.touched[f] || st.submitted ? 'ok' : '-')];
        });
      }
      function mk(narr, hlRows) {
        var valid = !err('email', st.values.email) && !err('age', st.values.age);
        return { narr: narr, parts: [
          { type: 'table', label: 'Form state (error is shown only after touched or submit)', columns: ['field', 'value', 'touched', 'dirty', 'error shown'], rows: rowsNow(), hl: hlRows || {} },
          { type: 'vars', label: 'Re-render counter: who works harder?', vals: { 'controlled form renders': controlled, 'React Hook Form renders': rhf, isValid: valid, isSubmitted: st.submitted }, hl: { 'controlled form renders': controlled > rhf ? 'bad' : 'ok', 'React Hook Form renders': 'ok' } }
        ] };
      }
      frames.push(mk('An empty signup form with two fields. We count how many times the form <b>re-renders</b> in a controlled form (state per keystroke) versus React Hook Form (uncontrolled inputs).'));
      parsed.forEach(function (p) {
        var before = snapshotVis(), idx = p.field === 'email' ? 0 : 1, hlr = {};
        if (p.kind === 'type') {
          st.values[p.field] = p.val; controlled++;
          var after = snapshotVis();
          var changed = after[p.field] !== before[p.field];
          if (changed) rhf++;
          hlr[idx] = 'cur';
          frames.push(mk('<b>Typing "' + H.esc(p.val) + '" in ' + p.field + '.</b> A controlled form re-renders (+1). React Hook Form lets the browser hold the text' + (changed ? ', but the visible error text changed (' + (after[p.field] ? '"' + after[p.field] + '"' : 'cleared') + '), so it re-renders just that part (+1).' : (st.touched[p.field] || st.submitted ? ' and the error text is the same, so it does <b>not</b> re-render.' : ' and nothing is shown yet because the field is untouched, so it does <b>not</b> re-render.')), hlr));
        } else if (p.kind === 'blur') {
          st.touched[p.field] = true; controlled++;
          var after2 = snapshotVis();
          var ch2 = after2[p.field] !== before[p.field];
          if (ch2) rhf++;
          hlr[idx] = after2[p.field] ? 'bad' : 'ok';
          frames.push(mk('<b>Leaving ' + p.field + ' (blur).</b> It is now <i>touched</i>, so validation may show a message. ' + (after2[p.field] ? '<span class="c-r">"' + after2[p.field] + '"</span> appears.' : 'The value is valid, so no message.') + ' Controlled form: +1 render for the touched flag. RHF: ' + (ch2 ? '+1 (a new error appeared).' : 'no re-render.'), hlr));
        } else {
          st.submitted = true; controlled++; rhf++;
          var bad = ['email', 'age'].filter(function (f) { return err(f, st.values[f]); });
          hlr = {}; bad.forEach(function (f) { hlr[f === 'email' ? 0 : 1] = 'bad'; });
          if (!bad.length) hlr = { 0: 'ok', 1: 'ok' };
          frames.push(mk(bad.length ? '<b>Submit pressed.</b> All fields count as touched now. <span class="c-r">Blocked</span>: ' + bad.join(' and ') + ' invalid, so <code>onSubmit</code> is not called. RHF focuses the first invalid field.' : '<b>Submit pressed.</b> <span class="c-g">Everything is valid</span>, so <code>onSubmit</code> runs with { email: "' + H.esc(st.values.email) + '", age: ' + Number(st.values.age) + ' }.', hlr));
        }
      });
      frames.push(mk('After ' + parsed.length + ' events: the controlled form rendered <b>' + controlled + '</b> times, React Hook Form only <b>' + rhf + '</b>. With 40 fields and fast typists the gap is the difference between smooth and janky.'));
      return frames;
    }
  },
  examples: [
    {
      title: 'Controlled vs uncontrolled input',
      html: `<p>Same text box, two styles. The controlled one asks React to remember every letter; the uncontrolled one asks the browser, and React peeks when it needs the value (submit, validation).</p>`,
      code: {
        lang: 'jsx', check: false, title: 'Controlled vs uncontrolled',
        code: `// Controlled: re-renders on every keystroke
function Controlled() {
  const [email, setEmail] = useState('');
  return <input value={email} onChange={(e) => setEmail(e.target.value)} />;
}

// Uncontrolled: the DOM holds the value, React reads it on demand
function Uncontrolled() {
  const ref = useRef(null);
  return (
    <form onSubmit={(e) => { e.preventDefault(); console.log(ref.current.value); }}>
      <input ref={ref} defaultValue="" />
    </form>
  );
}`
      }
    },
    {
      title: 'Error UX: when to show a message',
      html: `${H.table(['Moment', 'Bad UX', 'Good UX'], [
        ['User focuses an empty required field', 'Red "Required!" instantly', 'Say nothing'],
        ['User types the first letter of an email', '"Invalid email" while still typing', 'Wait until blur (first time)'],
        ['User fixed a mistake they were told about', 'Keep the error until they blur again', '<b>Clear it on the next keystroke</b> (<code>onTouched</code>)'],
        ['User presses Submit with 3 errors', 'Only the first error shows', 'Show all, move focus to the first invalid field'],
        ['Server says "email already used"', 'Generic toast, form resets', 'Error under the email field, keep what they typed']
      ])}
      <p>Accessibility: connect each error to its input with <code>aria-describedby</code>, mark the input <code>aria-invalid="true"</code>, and render the message with <code>role="alert"</code> so screen readers announce it.</p>`
    },
    {
      title: 'Dynamic fields with useFieldArray',
      html: `<p>"Add another phone number" is a list of inputs whose length changes. <code>useFieldArray</code> manages <code>append</code>, <code>remove</code>, <code>move</code> and gives each row a stable <code>id</code> to use as the React key (never use the array index as a key for editable rows).</p>`,
      code: {
        lang: 'jsx', check: false, title: 'useFieldArray',
        code: `import { useForm, useFieldArray } from 'react-hook-form';

function Phones() {
  const { register, control, handleSubmit } = useForm({ defaultValues: { phones: [{ number: '' }] } });
  const { fields, append, remove } = useFieldArray({ control, name: 'phones' });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      {fields.map((f, i) => (
        <div key={f.id}>                         {/* f.id, not i */}
          <input {...register('phones.' + i + '.number')} />
          <button type="button" onClick={() => remove(i)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ number: '' })}>Add phone</button>
    </form>
  );
}`
      }
    }
  ],
  deepDive: `<p>🟣 <b>How RHF avoids re-renders.</b> <code>register('email')</code> returns <code>{ name, ref, onChange, onBlur }</code>. The values live in an internal store keyed by field name (and in the DOM). Form-state flags (<code>errors</code>, <code>isDirty</code>) are exposed through a <b>Proxy</b>: RHF only subscribes to the pieces you actually <i>read</i> during render. If you never read <code>isDirty</code>, changing it does not re-render. Use <code>watch</code> sparingly (it re-renders on each change) and prefer <code>useWatch</code> in a small child component to isolate the cost.</p>
    <p>🟣 <b>Async validation and races.</b> Checking "is this username taken?" on each keystroke fires many requests, and responses can arrive out of order: the answer for "ann" can arrive after the answer for "anna" and overwrite it. Solve with (1) debounce, (2) AbortController or a request counter that ignores stale responses, and (3) validating on blur instead. Practice problem 15 builds this.</p>
    <p>🟣 <b>Server is the authority.</b> Client validation can be bypassed. Validate again on the server with the same schema. Return structured errors (<code>{ field: 'email', message: '...' }</code>) so the client can map them with <code>setError</code>. Never trust <code>type="number"</code> or <code>maxLength</code>.</p>
    <p>🟣 <b>React 19 form actions.</b> <code>&lt;form action={serverFn}&gt;</code> works without JavaScript (progressive enhancement), <code>useActionState</code> gives you the returned errors and a pending flag, and <code>useFormStatus</code> lets a child button know its form is submitting. In Next.js, Server Actions plus Zod give a very small form stack for simple forms. Use RHF when you need fast client-side behaviour, field arrays, wizards or complex dependent fields.</p>
    <p>🟣 <b>Multi-step wizards.</b> Keep one form state for the whole wizard (or persist drafts), validate per-step with a sub-schema, and keep values when users go back. Losing typed data on "Back" is the number one wizard bug.</p>
    <p>🟣 <b>Unsaved changes.</b> Use <code>isDirty</code> to enable Save and to prompt on navigation (<code>beforeunload</code> + router blockers). After a successful save call <code>reset(newValues)</code> so dirty returns to false against the new baseline.</p>`,
  aiEra: `<p>🤖 <b>What AI changes:</b> forms are boilerplate-heavy, which makes them one of AI's best use cases: generate a Zod schema from an API type or an OpenAPI spec, scaffold an RHF form with accessible error markup, write validation test cases, and build input-mask or i18n variants. Chat-style "AI forms" also appear: an LLM extracts structured fields from free text into a form you review and edit, which means the form must handle <b>prefilled, untrusted values</b>.</p>
    <p><b>Use AI as a partner:</b> <code>Generate a Zod schema and RHF form for this JSON API request. Add aria attributes. Add tests for empty, invalid, and server-error cases.</code> Also: <code>List edge cases for a phone-number field across countries.</code></p>
    <p><b>Where AI goes wrong:</b> uses <code>watch()</code> at the top of a big form (re-render on every key), uses array indexes as keys in a field array, forgets that <code>type="number"</code> gives strings (needs <code>z.coerce.number()</code> or <code>valueAsNumber</code>), validates only on the client, and drops accessibility attributes.</p>
    <p><b>What you must still own:</b> the validation <i>rules</i> (product and legal decisions: age limits, password policy, data privacy), the error copy, and server-side re-validation. Never let a model-extracted value go to the API without the same validation a human-typed value gets.</p>`,
  problems: [{
    title: 'Form Validation Engine (touched, dirty, errors, submit)',
    level: 'Medium', tags: ['forms', 'validation', 'state'], companies: ['Shopify', 'Stripe', 'Zoho'],
    statement: `<p>Build <code>createForm(initial, rules)</code> in plain JS. <code>rules</code> maps a field to a list of functions <code>value =&gt; errorMessage | ''</code> (first failing rule wins). The form must support <code>change(name, value)</code>, <code>blur(name)</code>, <code>visibleError(name)</code> (shown only if the field is <b>touched</b> or the form was <b>submitted</b>), <code>isDirty(name)</code>, <code>isValid()</code>, and <code>submit(onValid)</code> which marks the form submitted and calls <code>onValid(values)</code> only if valid, otherwise returns the list of invalid fields. Demonstrate with <code>email</code> and <code>age</code> fields.</p>`,
    constraints: `No libraries. Validation functions must be pure. Typing in an untouched field must not show an error.`,
    example: `${H.table(['Action', 'email error shown?'], [['type "a"', '-  (untouched)'], ['blur', '<span class="c-r">Enter a valid email</span>'], ['type "a@b.co"', '<span class="c-g">(cleared)</span>'], ['submit with age 15', 'age: <span class="c-r">You must be 18 or older</span>']])}
      <p><b>Why:</b> showing errors only after the user has interacted avoids yelling at someone who has not finished typing.</p>`,
    brute: {
      why: `<p>The naive approach validates and shows every error on every keystroke, from the very first render. Users see "Required!" on a blank form, and there is no concept of dirty or touched, so you cannot disable Save or warn about unsaved changes.</p>`,
      code: `const rules = { email: (v) => (v.includes('@') ? '' : 'Invalid email') };
const values = { email: '' };
function showErrors() {
  return Object.keys(rules).map((f) => f + ': ' + rules[f](values[f])).join(', ');
}
console.log(showErrors()); // "email: Invalid email" before the user typed anything`
    },
    mcq: { q: 'A user types one letter into the email field and has not left it. When should a "Invalid email" message appear (with the onTouched mode)?', options: ['Immediately, on the first keystroke', 'Not yet: wait until the field is touched (blur) or the form is submitted', 'Only after the server replies'], answer: 1, explain: 'Touched gating avoids nagging mid-typing. After the first blur, onTouched re-validates on every change so errors disappear as soon as the input becomes valid.' },
    hints: [
      `<p>Hint 1: store three things: current <code>values</code>, a <code>touched</code> map, and a <code>submitted</code> flag. Errors are <b>derived</b> from values; do not store them.</p>`,
      `<p>Hint 2: <code>errorOf(name)</code> runs the field's rules in order and returns the first message. <code>visibleError</code> is <code>touched || submitted ? errorOf : ''</code>. Dirty means <code>values[name] !== initial[name]</code>.</p>`,
      `<p>Hint 3: recipe for <code>submit</code>: set <code>submitted = true</code>, collect invalid field names; if the list is empty call <code>onValid(copy of values)</code>, else return the list so the caller can focus the first one.</p>`
    ],
    solution: {
      approach: `<p>Keep only raw facts (values, touched, submitted) and derive everything else. That single source of truth means errors cannot go out of sync. Submission flips <code>submitted</code> so all errors become visible at once, then gates the callback on <code>isValid</code>.</p>`,
      code: {
        lang: 'js', run: true,
        code: `function createForm(initial, rules) {
  const values = { ...initial };
  const touched = {};
  let submitted = false;

  const errorOf = (name) => {
    for (const rule of rules[name] || []) {
      const msg = rule(values[name], values);   // second arg allows cross-field rules
      if (msg) return msg;                      // first failing rule wins
    }
    return '';
  };
  const invalidFields = () => Object.keys(rules).filter((n) => errorOf(n));

  return {
    change(name, v) { values[name] = v; },
    blur(name) { touched[name] = true; },
    visibleError: (name) => (touched[name] || submitted ? errorOf(name) : ''),
    isDirty: (name) => values[name] !== initial[name],
    isValid: () => invalidFields().length === 0,
    submit(onValid) {
      submitted = true;                         // every error is visible from now on
      const bad = invalidFields();
      return bad.length ? { ok: false, invalid: bad } : { ok: true, result: onValid({ ...values }) };
    }
  };
}

const rules = {
  email: [(v) => (v ? '' : 'Email is required'), (v) => (/^\\S+@\\S+\\.\\S+$/.test(v) ? '' : 'Enter a valid email')],
  age: [(v) => (v === '' ? 'Age is required' : ''), (v) => (Number(v) >= 18 ? '' : 'You must be 18 or older')]
};
const f = createForm({ email: '', age: '' }, rules);

f.change('email', 'a');
console.log('typed "a"      :', JSON.stringify(f.visibleError('email')));
f.blur('email');
console.log('after blur     :', f.visibleError('email'));
f.change('email', 'a@b.co');
console.log('fixed          :', JSON.stringify(f.visibleError('email')), '| dirty =', f.isDirty('email'));
f.change('age', '15');
console.log('submit age 15  :', JSON.stringify(f.submit(() => 'sent')), '| age error:', f.visibleError('age'));
f.change('age', '21');
console.log('submit age 21  :', JSON.stringify(f.submit((v) => 'sent ' + v.email)));`
      },
      dry: { head: ['Action', 'values', 'touched', 'email error shown'], rows: [['change email "a"', 'a', '-', '(hidden)'], ['blur email', 'a', 'email', '<span class="c-r">Enter a valid email</span>'], ['change email "a@b.co"', 'a@b.co', 'email', '<span class="c-g">""</span>'], ['submit (age 15)', 'a@b.co / 15', 'all', 'age error visible, onValid NOT called']] },
      complexity: `<p>O(F × R) per validation pass for F fields and R rules each. Cheap; the real cost in UIs is re-rendering, which is why libraries subscribe to specific fields.</p>`,
      followUps: ['How would you add a cross-field rule (confirm password equals password)?', 'How would you add async validation that ignores stale responses?']
    }
  }]
});
/* =====================================================================
   PRACTICE: Easy (4)
   ===================================================================== */
practice.push({
  title: 'Derived State Audit: Delete the Stored Totals',
  level: 'Easy', tags: ['derived state', 'selectors', 'single source of truth'], companies: ['Amazon', 'Zalando', 'Flipkart'],
  statement: `<p>A cart component stores <code>items</code>, <code>total</code>, <code>count</code> and <code>visible</code> (the items matching the search box) in the same state object. After you change the quantity of one item, <code>total</code> and <code>count</code> are wrong. Refactor: keep only <b>raw facts</b> (<code>items</code>, <code>query</code>) and write selectors <code>selectCount</code>, <code>selectTotal</code> and <code>selectVisible</code>. Show that after changing a quantity the selector results are correct while the old stored values drift.</p>`,
  constraints: `Selectors are pure functions of state. Do not mutate the original arrays.`,
  example: `<p>Items: Shoe 50 × 2, Hat 20 × 1. Change Shoe quantity to 3.</p>
    ${H.table(['', 'stored total', 'selector total'], [['before', '120', '120'], ['after qty change', '<span class="c-r">120 (stale!)</span>', '<span class="c-g">170</span>']])}
    <p><b>Why:</b> the selector recomputes from the items each time, so it can never disagree with them.</p>`,
  brute: {
    why: `<p>Keeping derived fields means every code path that edits <code>items</code> must also update <code>total</code>, <code>count</code> and <code>visible</code>. Forget one path (an undo, a websocket update) and the UI lies.</p>`,
    code: `const state = { items: [{ id: 1, price: 50, qty: 2 }], total: 100, count: 2 };
function setQty(s, id, qty) {
  const items = s.items.map((i) => (i.id === id ? { ...i, qty } : i));
  return { ...s, items }; // forgot total and count!
}
const next = setQty(state, 1, 3);
console.log('stored total', next.total, 'real total', next.items[0].price * next.items[0].qty);`
  },
  mcq: { q: 'Which of these should be stored in state?', options: ['The cart total', 'The list of items in the cart', 'The number of items in the cart'], answer: 1, explain: 'Items are a raw fact. Total and count can be calculated from the items, so storing them creates a second source of truth that can fall out of sync.' },
  hints: [
    `<p>Hint 1: for every field ask "can I calculate this from the other fields?" If yes, it is derived.</p>`,
    `<p>Hint 2: <code>total</code>, <code>count</code> and <code>visible</code> are all derived from <code>items</code> and <code>query</code>.</p>`,
    `<p>Hint 3: recipe: state = <code>{ items, query }</code>; selectors with <code>reduce</code> and <code>filter</code>; the update function only changes <code>items</code>. For expensive derived values, memoize with <code>useMemo</code> or <code>createSelector</code>, but still do not store them.</p>`
  ],
  solution: {
    approach: `<p>Store only <code>items</code> and <code>query</code>. Every number on screen comes from a selector. The updater touches one place, so there is nothing to forget. The "bug" from the stored version simply cannot exist.</p>`,
    code: {
      lang: 'js', run: true,
      code: `const initial = {
  items: [{ id: 1, name: 'Shoe', price: 50, qty: 2 }, { id: 2, name: 'Hat', price: 20, qty: 1 }],
  query: ''
};

// ---- selectors (derived data, never stored) ----
const selectCount = (s) => s.items.reduce((n, i) => n + i.qty, 0);
const selectTotal = (s) => s.items.reduce((n, i) => n + i.price * i.qty, 0);
const selectVisible = (s) => s.items.filter((i) => i.name.toLowerCase().includes(s.query.toLowerCase()));

// ---- the only updater touches only raw facts ----
const setQty = (s, id, qty) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, qty } : i)) });
const setQuery = (s, query) => ({ ...s, query });

// The OLD style, for comparison: stored totals
const stored = { ...initial, total: 120, count: 3 };

let s = initial;
console.log('before   -> count', selectCount(s), 'total', selectTotal(s));
s = setQty(s, 1, 3);
const storedAfter = { ...stored, items: s.items }; // updater forgot total/count
console.log('after    -> selector total', selectTotal(s), '| stored total', storedAfter.total, '(stale)');
s = setQuery(s, 'ha');
console.log('visible  ->', selectVisible(s).map((i) => i.name).join(', '));`
    },
    complexity: `<p>Selectors are O(n) per call, fine for carts. For huge lists memoize them so they recompute only when <code>items</code> changes.</p>`,
    followUps: ['How would you memoize selectTotal so it does not recompute when only query changes?', 'Is "isCheckoutDisabled" derived state? From what?']
  }
});

practice.push({
  title: 'Predict the Re-renders: Context Simulator',
  level: 'Easy', tags: ['context', 'rendering', 'reasoning'], companies: ['Meta', 'Atlassian'],
  statement: `<p>Write <code>rendersFor({ consumers, memoized, changed, parentRendered })</code> that returns the names of consumers that re-render. Each consumer is <code>{ name, uses: [contextNames] }</code>. A context value changes identity if (a) its real data is in <code>changed</code>, or (b) the provider re-rendered and the value is <b>not</b> memoized. The provider re-renders when something in <code>changed</code> is non-empty or the parent re-rendered. Run four scenarios and print which consumers re-render.</p>`,
  constraints: `Pure function. Consumers that use no changed context must not re-render.`,
  example: `${H.table(['Scenario', 'Re-rendered consumers'], [
    ['One context, not memoized, search changes', '<span class="c-r">CartBadge, SearchBox</span>'],
    ['Two contexts, memoized, search changes', '<span class="c-g">SearchBox</span>'],
    ['Two contexts, memoized, parent re-renders', '<span class="c-g">none</span>'],
    ['Two contexts, NOT memoized, parent re-renders', '<span class="c-r">CartBadge, SearchBox</span>']
  ])}`,
  brute: {
    why: `<p>The beginner assumption: "if the provider renders, every child renders". Reality is more precise: only <b>consumers</b> of a context whose value changed identity re-render. Assuming everything re-renders sends people on wild memoization hunts.</p>`,
    code: `function naive(consumers) {
  return consumers.map((c) => c.name); // always everyone
}
console.log(naive([{ name: 'Logo', uses: [] }, { name: 'CartBadge', uses: ['cart'] }]));`
  },
  mcq: { q: 'A Provider re-renders because its parent re-rendered. Its value is wrapped in useMemo with unchanged deps. Which consumers re-render?', options: ['All of them', 'None, because the value keeps the same identity', 'Only the first one'], answer: 1, explain: 'Context consumers compare the value with Object.is. A memoized value is the same object, so React skips every consumer.' },
  hints: [
    `<p>Hint 1: a consumer re-renders only if one of the contexts it <b>uses</b> changed identity.</p>`,
    `<p>Hint 2: identity changes when the real data changed, or when the provider re-rendered without memoizing the value.</p>`,
    `<p>Hint 3: recipe: <code>providerRenders = changed.length &gt; 0 || parentRendered</code>; <code>identityChanged(ctx) = changed.includes(ctx) || (providerRenders &amp;&amp; !memoized)</code>; filter consumers with <code>uses.some(identityChanged)</code>.</p>`
  ],
  solution: {
    approach: `<p>Two small rules capture the whole behaviour. The function is a faithful mini-model: components that do not call <code>useContext</code> are never in <code>consumers</code>, so they never appear in the output.</p>`,
    code: {
      lang: 'js', run: true,
      code: `function rendersFor({ consumers, memoized, changed, parentRendered }) {
  const providerRenders = changed.length > 0 || !!parentRendered;
  // Does this context's value have a NEW identity this round?
  const identityChanged = (ctx) => changed.includes(ctx) || (providerRenders && !memoized);
  return consumers.filter((c) => c.uses.some(identityChanged)).map((c) => c.name);
}

const oneCtx = [{ name: 'CartBadge', uses: ['app'] }, { name: 'SearchBox', uses: ['app'] }];
const split = [{ name: 'CartBadge', uses: ['cart'] }, { name: 'SearchBox', uses: ['search'] }];

console.log('1 one ctx, no memo, search typed :', rendersFor({ consumers: oneCtx, memoized: false, changed: ['app'] }));
console.log('2 split, memo, search typed      :', rendersFor({ consumers: split, memoized: true, changed: ['search'] }));
console.log('3 split, memo, parent re-rendered:', rendersFor({ consumers: split, memoized: true, changed: [], parentRendered: true }));
console.log('4 split, NO memo, parent rendered:', rendersFor({ consumers: split, memoized: false, changed: [], parentRendered: true }));`
    },
    complexity: `<p>O(C × K) for C consumers and K contexts each. It is a teaching model, not a React replacement.</p>`,
    followUps: ['Where would React.memo on a consumer change this model? (Hint: it does not help.)', 'How would a selector-based store change the rule?']
  }
});

practice.push({
  title: 'Cart Slice with Redux Toolkit',
  level: 'Easy', tags: ['redux toolkit', 'createSlice', 'selectors', 'immer'], companies: ['Walmart', 'Target', 'Myntra'],
  statement: `<p>Write a Redux Toolkit <code>cartSlice</code> for a shopping cart. State: <code>{ items: [{ id, name, price, qty }] }</code>. Reducers: <code>itemAdded(product)</code> (new line with qty 1, or +1 if it already exists), <code>quantitySet({ id, qty })</code> (remove the line when qty is 0 or less), <code>itemRemoved(id)</code>, <code>cartCleared()</code>. Add memoized selectors <code>selectCartCount</code> and <code>selectCartTotal</code> with <code>createSelector</code>, and wire the reducer with <code>configureStore</code>.</p>`,
  constraints: `Use createSlice (Immer). Keep state serializable. Derived values are selectors only.`,
  example: `<p>Dispatch <code>itemAdded(shoe 50)</code> twice, <code>itemAdded(hat 20)</code>, then <code>quantitySet({id: 'hat', qty: 0})</code>:</p>
    ${H.table(['Step', 'items'], [['add shoe ×2', 'shoe × 2'], ['add hat', 'shoe × 2, hat × 1'], ['hat qty 0', '<span class="c-g">shoe × 2</span> (line removed)']])}
    <p>${H.c('g', 'count = 2, total = 100')}</p>`,
  brute: {
    why: `<p>A hand-written switch reducer with spreads works but is long, easy to get wrong in nested updates, and teams often forget the "already exists" and "qty 0" branches. Or worse: mutate the array with <code>push</code> outside Immer and no component updates.</p>`,
    code: {
      lang: 'js', check: false,
      code: `function cartReducer(state = { items: [] }, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      state.items.push({ ...action.payload, qty: 1 }); // MUTATION in a plain reducer: UI will not update
      return state;
    }
    default:
      return state;
  }
}`
    }
  },
  mcq: { q: 'Why can you write state.items.push(x) inside createSlice reducers but not in a hand-written switch reducer?', options: ['createSlice runs reducers on the server', 'createSlice passes an Immer draft that records changes and returns a new immutable state', 'push is allowed when the array is small'], answer: 1, explain: 'Immer wraps state in a draft Proxy. Your mutations are recorded and replayed onto a copy. A plain reducer receives the real state, so mutating it breaks reference equality checks.' },
  hints: [
    `<p>Hint 1: inside <code>createSlice</code> you may mutate the draft: <code>state.items.push(...)</code>, <code>line.qty += 1</code>, <code>delete</code>, reassign.</p>`,
    `<p>Hint 2: find the existing line with <code>state.items.find(i =&gt; i.id === product.id)</code>. To remove, assign <code>state.items = state.items.filter(...)</code>.</p>`,
    `<p>Hint 3: selectors take the root state: <code>const selectItems = (s) =&gt; s.cart.items</code>; <code>createSelector([selectItems], items =&gt; ...)</code> recomputes only when the items array changes.</p>`
  ],
  solution: {
    approach: `<p>One slice owns the cart. Reducer names are past-tense events (<code>itemAdded</code>) which reads well in the devtools log. Selectors live next to the slice and are memoized; nothing derived is stored. Exporting the actions from <code>slice.actions</code> removes hand-written type strings.</p>`,
    code: {
      lang: 'js', check: false,
      code: `import { configureStore, createSelector, createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    itemAdded(state, action) {
      const product = action.payload;                       // { id, name, price }
      const line = state.items.find((i) => i.id === product.id);
      if (line) line.qty += 1;                              // Immer: safe "mutation"
      else state.items.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    },
    quantitySet(state, action) {
      const { id, qty } = action.payload;
      if (qty <= 0) {
        state.items = state.items.filter((i) => i.id !== id);
      } else {
        const line = state.items.find((i) => i.id === id);
        if (line) line.qty = qty;
      }
    },
    itemRemoved(state, action) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    cartCleared(state) {
      state.items = [];
    }
  }
});

export const { itemAdded, quantitySet, itemRemoved, cartCleared } = cartSlice.actions;

// ---- selectors (memoized, derived) ----
const selectItems = (state) => state.cart.items;
export const selectCartCount = createSelector([selectItems], (items) => items.reduce((n, i) => n + i.qty, 0));
export const selectCartTotal = createSelector([selectItems], (items) => items.reduce((n, i) => n + i.qty * i.price, 0));

export const store = configureStore({ reducer: { cart: cartSlice.reducer } });

// usage
store.dispatch(itemAdded({ id: 'shoe', name: 'Shoe', price: 50 }));
store.dispatch(itemAdded({ id: 'shoe', name: 'Shoe', price: 50 }));
store.dispatch(itemAdded({ id: 'hat', name: 'Hat', price: 20 }));
store.dispatch(quantitySet({ id: 'hat', qty: 0 }));
console.log(selectCartCount(store.getState()), selectCartTotal(store.getState())); // 2 100`
    },
    complexity: `<p>Each reducer is O(n) in the number of lines (find/filter). Use <code>createEntityAdapter</code> for O(1) updates on large collections.</p>`,
    followUps: ['How would you persist the cart across reloads?', 'How would you sync the cart with the server after login?']
  }
});

practice.push({
  title: 'Query Key Factory and Invalidation Map',
  level: 'Easy', tags: ['react-query', 'query keys', 'invalidation'], companies: ['Shopify', 'Airbnb'],
  statement: `<p>Build a <code>keys</code> factory for products: <code>all</code>, <code>lists()</code>, <code>list(filters)</code>, <code>details()</code>, <code>detail(id)</code>. Then implement <code>matches(queryKey, filterKey)</code> (prefix match, like <code>invalidateQueries</code>) and <code>invalidate(cacheKeys, filterKey)</code> returning the cache keys it would mark stale. Print what is invalidated after (a) "add product" and (b) "edit product 17".</p>`,
  constraints: `Keys are arrays that may contain objects. Compare parts with JSON.stringify. Prefix match: the filter must equal the beginning of the key.`,
  example: `<p>Cache holds: <code>list{page:1}</code>, <code>list{page:2}</code>, <code>detail 17</code>, <code>detail 18</code>.</p>
    ${H.table(['Mutation', 'Invalidate', 'Marked stale'], [['add product', 'keys.lists()', 'both lists'], ['edit product 17', 'keys.detail(17) and keys.lists()', 'detail 17 + both lists (detail 18 untouched)']])}`,
  brute: {
    why: `<p>The naive approach invalidates <b>everything</b> (<code>invalidateQueries()</code> with no key) after any mutation. It works, but triggers a storm of refetches for data that did not change, wasting bandwidth and making the UI flicker.</p>`,
    code: `const cacheKeys = [['products', 'list', { page: 1 }], ['products', 'detail', 17], ['user', 'me']];
function invalidateEverything(keys) {
  return keys.slice(); // user profile refetched for no reason
}
console.log(invalidateEverything(cacheKeys).length, 'queries refetched');`
  },
  mcq: { q: 'You edit product 17. Which invalidation is the most precise and still correct?', options: ['Everything', 'Details of product 17 and all product lists', 'Only the details of product 18'], answer: 1, explain: 'The edited product changes its own detail and may change ordering or content in lists. Other details are unaffected, so they should not be refetched.' },
  hints: [
    `<p>Hint 1: keys form a tree: <code>['products']</code> → <code>['products','list',...]</code> and <code>['products','detail',id]</code>.</p>`,
    `<p>Hint 2: a factory builds each level from the one above it, so a change to the root name is made in one place.</p>`,
    `<p>Hint 3: recipe for <code>matches</code>: <code>filterKey.every((part, i) =&gt; JSON.stringify(part) === JSON.stringify(queryKey[i]))</code>. Invalidate = cache keys where some filter matches.</p>`
  ],
  solution: {
    approach: `<p>Because keys are hierarchical arrays, invalidation by prefix is just "does the filter equal the first N parts?". The factory guarantees spelling consistency, so a mutation can never miss a key because of a typo.</p>`,
    code: {
      lang: 'js', run: true,
      code: `const keys = {
  all: ['products'],
  lists: () => [...keys.all, 'list'],
  list: (filters) => [...keys.lists(), filters],
  details: () => [...keys.all, 'detail'],
  detail: (id) => [...keys.details(), id]
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// prefix match, the same rule invalidateQueries uses
const matches = (queryKey, filterKey) => filterKey.length <= queryKey.length && filterKey.every((part, i) => same(part, queryKey[i]));
const invalidate = (cacheKeys, ...filterKeys) => cacheKeys.filter((k) => filterKeys.some((f) => matches(k, f)));

const cache = [keys.list({ page: 1 }), keys.list({ page: 2 }), keys.detail(17), keys.detail(18), ['user', 'me']];
const show = (label, ks) => console.log(label.padEnd(18), '->', ks.map((k) => JSON.stringify(k)).join('  '));

show('add product', invalidate(cache, keys.lists()));
show('edit product 17', invalidate(cache, keys.detail(17), keys.lists()));
show('anything in products', invalidate(cache, keys.all));
console.log('user/me is never touched by product mutations:', !invalidate(cache, keys.all).some((k) => k[0] === 'user'));`
    },
    complexity: `<p>O(K × F × L) for K cached keys, F filters and key length L; all tiny.</p>`,
    followUps: ['What does exact: true change?', 'How would you invalidate lists that contain product 17 but keep other lists?']
  }
});
/* =====================================================================
   PRACTICE: Medium (6)
   ===================================================================== */
practice.push({
  title: 'Zustand Cart Store with Persist and Narrow Selectors',
  level: 'Medium', tags: ['zustand', 'persist', 'selectors', 'performance'], companies: ['Myntra', 'Swiggy', 'Shopify'],
  statement: `<p>Build a Zustand cart store. State: <code>lines</code> as <code>{ [id]: { name, price, qty } }</code>. Actions: <code>add(product)</code>, <code>setQty(id, qty)</code> (removes at 0), <code>remove(id)</code>, <code>clear()</code>. Requirements: (1) persist <b>only</b> <code>lines</code> to localStorage under a versioned key, (2) the header badge must re-render only when the <b>item count</b> changes, (3) the "Add" button must never re-render because of cart changes, (4) a <code>CartSummary</code> needs both <code>count</code> and <code>total</code> in one hook call without an infinite loop or a re-render on every update.</p>`,
  constraints: `Zustand v4/v5 API. Derived values (count, total) are computed in selectors, not stored.`,
  example: `<p>Click "Add" on Shoe (50) twice and on Hat (20) once.</p>
    ${H.table(['Component', 'Selector', 'Renders'], [['AddButton', '<code>s =&gt; s.add</code>', '<span class="c-g">1 (mount only)</span>'], ['CartBadge', '<code>s =&gt; count</code>', '3 (count changes 0→1→2→3)'], ['CartSummary', 'useShallow({count,total})', '3']])}`,
  brute: {
    why: `<p>The naive version calls <code>const cart = useCartStore()</code> everywhere (no selector). Every component re-renders on every change, including buttons that only call <code>add</code>. The cart also vanishes on refresh.</p>`,
    code: {
      lang: 'jsx', check: false,
      code: `const useCartStore = create((set) => ({ lines: {}, add: (p) => set((s) => ({ lines: { ...s.lines, [p.id]: { ...p, qty: 1 } } })) }));

function AddButton({ product }) {
  const store = useCartStore();          // subscribes to EVERYTHING
  return <button onClick={() => store.add(product)}>Add</button>;
}
function CartBadge() {
  const store = useCartStore();          // re-renders on every cart change, even qty changes it ignores
  return <span>{Object.keys(store.lines).length}</span>;
}`
    }
  },
  mcq: { q: 'Which selector will cause a re-render after EVERY store update, even if values are the same?', options: ['useStore(s => s.count)', 'useStore(s => ({ count: s.count, total: s.total }))', 'useStore(useShallow(s => ({ count: s.count })))'], answer: 1, explain: 'An object literal is a new object each time, so Object.is says it changed. Select primitives, or wrap the object selector in useShallow.' },
  hints: [
    `<p>Hint 1: a component re-renders when its selector's result changes (<code>Object.is</code>). Primitives and stable function references are safe results.</p>`,
    `<p>Hint 2: actions are stable function references inside the store. <code>useCartStore(s =&gt; s.add)</code> never changes, so AddButton never re-renders for cart changes.</p>`,
    `<p>Hint 3: recipe: <code>create(persist((set) =&gt; (...), { name: 'cart-v1', version: 1, partialize: (s) =&gt; ({ lines: s.lines }) }))</code>; export selector hooks <code>useCartCount</code>, <code>useCartTotal</code>; for two values use <code>useShallow</code>.</p>`
  ],
  solution: {
    approach: `<p>The store holds raw lines plus actions. Selector hooks compute derived numbers from <code>lines</code>. <code>partialize</code> keeps actions (functions) out of storage. <code>useShallow</code> lets one hook return an object while still comparing field by field.</p>`,
    code: {
      lang: 'jsx', check: false,
      code: `import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

export const useCartStore = create(
  persist(
    (set) => ({
      lines: {},
      add: (p) =>
        set((s) => {
          const cur = s.lines[p.id];
          return { lines: { ...s.lines, [p.id]: { name: p.name, price: p.price, qty: cur ? cur.qty + 1 : 1 } } };
        }),
      setQty: (id, qty) =>
        set((s) => {
          if (qty <= 0) {
            const { [id]: _gone, ...rest } = s.lines;
            return { lines: rest };
          }
          return { lines: { ...s.lines, [id]: { ...s.lines[id], qty } } };
        }),
      remove: (id) =>
        set((s) => {
          const { [id]: _gone, ...rest } = s.lines;
          return { lines: rest };
        }),
      clear: () => set({ lines: {} })
    }),
    {
      name: 'cart-v1',                                  // versioned localStorage key
      version: 1,
      partialize: (s) => ({ lines: s.lines })           // never persist functions
    }
  )
);

// ---- selector hooks: derived, narrow ----
export const useCartCount = () =>
  useCartStore((s) => Object.keys(s.lines).length);       // number: re-render only when it changes

export const useCartSummary = () =>
  useCartStore(
    useShallow((s) => {
      const lines = Object.values(s.lines);
      return {
        count: lines.reduce((n, l) => n + l.qty, 0),
        total: lines.reduce((n, l) => n + l.qty * l.price, 0)
      };
    })
  );                                                      // new object each run, but shallow-equal => stable

export const useCartAdd = () => useCartStore((s) => s.add); // stable function: AddButton never re-renders

function AddButton({ product }) {
  const add = useCartAdd();
  return <button onClick={() => add(product)}>Add</button>;
}
function CartBadge() {
  return <span>{useCartCount()}</span>;
}
function CartSummary() {
  const { count, total } = useCartSummary();
  return <p>{count} items, total {total}</p>;
}`
    },
    complexity: `<p>Each update runs every selector (O(lines) for summary). Selecting narrowly keeps re-renders to the components whose slice truly changed.</p>`,
    followUps: ['How do you reset the store between unit tests?', 'What happens on the first render before persist rehydrates, and how would you avoid a flash of an empty cart?']
  }
});

practice.push({
  title: 'Cache Invalidation After a Mutation (React Query)',
  level: 'Medium', tags: ['react-query', 'invalidation', 'mutations', 'setQueryData'], companies: ['Stripe', 'Shopify', 'Notion'],
  statement: `<p>An admin screen uses these queries: <code>['products','list',{page,search}]</code>, <code>['products','detail',id]</code> and <code>['stats','dashboard']</code> (counts of products by category). Write three mutation hooks with the <b>right</b> cache handling: <code>useCreateProduct</code>, <code>useUpdateProduct</code> and <code>useDeleteProduct</code>. Requirements: create refreshes lists and stats; update writes the server's response straight into the detail cache (no extra request), and refreshes lists and stats; delete <b>removes</b> the detail entry from the cache (do not refetch a 404) and refreshes lists and stats. Use a key factory.</p>`,
  constraints: `TanStack Query v5. The mutation APIs return the saved product (create/update) or nothing (delete). Do not invalidate unrelated keys like <code>['user','me']</code>.`,
  example: `${H.table(['Mutation', 'Detail cache', 'Lists', 'Stats'], [['create', '-', '<span class="c-y">invalidate</span>', '<span class="c-y">invalidate</span>'], ['update 17', '<span class="c-g">setQueryData</span> (no request)', '<span class="c-y">invalidate</span>', '<span class="c-y">invalidate</span>'], ['delete 17', '<span class="c-r">removeQueries</span>', '<span class="c-y">invalidate</span>', '<span class="c-y">invalidate</span>']])}
    <p><b>Why:</b> lists depend on server ordering/filters, so we refetch them; the detail already has the full fresh object from the response.</p>`,
  brute: {
    why: `<p>Two bad extremes: (a) invalidate nothing, so lists show deleted items until a manual refresh; (b) <code>queryClient.invalidateQueries()</code> with no key, which refetches every query in the app, including the user profile and all cached details.</p>`,
    code: {
      lang: 'jsx', check: false,
      code: `const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete('/products/' + id),
    onSuccess: () => qc.invalidateQueries()   // refetches EVERYTHING, even the deleted product's detail (404!)
  });
};`
    }
  },
  mcq: { q: 'After deleting product 17, what should happen to the cache entry [products, detail, 17]?', options: ['Invalidate it so it refetches', 'Remove it: it no longer exists on the server', 'Leave it, it will expire by itself'], answer: 1, explain: 'Invalidating would refetch and hit a 404. removeQueries deletes the entry so nothing shows or fetches a dead resource.' },
  hints: [
    `<p>Hint 1: for each mutation ask: which cached facts are now wrong? Lists, stats and one detail.</p>`,
    `<p>Hint 2: when the response contains the complete updated object, <code>setQueryData</code> avoids a request. For lists, let the server decide order/filters by invalidating.</p>`,
    `<p>Hint 3: recipe: <code>onSuccess</code> runs <code>setQueryData</code>/<code>removeQueries</code> first for the detail, then <code>invalidateQueries</code> for <code>keys.lists()</code> and <code>['stats']</code>. Return the promise from <code>invalidateQueries</code> in <code>onSuccess</code> to keep <code>isPending</code> true until the refetch completes.</p>`
  ],
  solution: {
    approach: `<p>Treat invalidation as a table of "mutation to affected keys". Write each affected key precisely using the factory. Use the cheapest correct tool for each key: <code>setQueryData</code> for an exact known value, <code>removeQueries</code> for a dead entry, <code>invalidateQueries</code> for server-ordered data.</p>`,
    code: {
      lang: 'jsx', check: false,
      code: `import { useMutation, useQueryClient } from '@tanstack/react-query';

export const keys = {
  products: ['products'],
  lists: () => [...keys.products, 'list'],
  detail: (id) => [...keys.products, 'detail', id],
  stats: ['stats']
};

function useRefreshListsAndStats() {
  const qc = useQueryClient();
  // returns a promise so the mutation stays "pending" until lists are fresh
  return () => Promise.all([
    qc.invalidateQueries({ queryKey: keys.lists() }),   // every page/search combination
    qc.invalidateQueries({ queryKey: keys.stats })
  ]);
}

export function useCreateProduct() {
  const refresh = useRefreshListsAndStats();
  return useMutation({
    mutationFn: (body) => api.post('/products', body),
    onSuccess: () => refresh()
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  const refresh = useRefreshListsAndStats();
  return useMutation({
    mutationFn: ({ id, ...body }) => api.patch('/products/' + id, body),   // returns the saved product
    onSuccess: (saved) => {
      qc.setQueryData(keys.detail(saved.id), saved);   // exact value known: no extra request
      return refresh();                                // lists/stats depend on server logic
    }
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  const refresh = useRefreshListsAndStats();
  return useMutation({
    mutationFn: (id) => api.delete('/products/' + id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: keys.detail(id) });  // it is gone: do not refetch a 404
      return refresh();
    }
  });
}`
    },
    complexity: `<p>Only the affected queries refetch: usually the visible list page plus stats. Inactive (not on screen) lists are just marked stale and refetch lazily when next opened.</p>`,
    followUps: ['What happens to list pages that are in the cache but not currently mounted?', 'How would you avoid a flash of a deleted row while the list refetches?']
  }
});

practice.push({
  title: 'Optimistic Like Across List and Detail Caches (with Rollback)',
  level: 'Medium', tags: ['react-query', 'optimistic', 'rollback', 'infinite query'], companies: ['Instagram', 'LinkedIn', 'Reddit'],
  statement: `<p>A post appears in an infinite feed (<code>['posts','list',...]</code> with <code>pages[].items[]</code>) and on its own detail page (<code>['posts','detail',id]</code>). Write <code>useLikePost</code> so that tapping Like updates <b>both</b> places instantly, rolls both back if the request fails, and re-syncs with the server in every case. Handle the race with a running refetch.</p>`,
  constraints: `TanStack Query v5. Never mutate cached objects; always return new ones. The feed can have many cached variants (different filters), so update all of them.`,
  example: `${H.table(['Moment', 'Feed card', 'Detail page'], [['tap Like', '<span class="c-g">♥ 11</span> instantly', '<span class="c-g">♥ 11</span> instantly'], ['server 500', '<span class="c-r">♥ 11 (wrong)</span>', '<span class="c-r">♥ 11 (wrong)</span>'], ['rollback', '♡ 10', '♡ 10']])}`,
  brute: {
    why: `<p>The naive version only calls the API and invalidates on success. The user sees nothing for the whole round trip, and the detail and feed disagree until both refetch.</p>`,
    code: {
      lang: 'jsx', check: false,
      code: `const like = useMutation({
  mutationFn: (id) => api.post('/posts/' + id + '/like'),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }) // user waits for POST then GET
});`
    }
  },
  mcq: { q: 'Why call cancelQueries at the start of onMutate?', options: ['To save bandwidth', 'So an in-flight refetch with old data cannot overwrite the optimistic value', 'To delete the cache'], answer: 1, explain: 'A refetch that started before the tap may resolve after your optimistic write and bring back the old count, causing a flicker. Cancelling prevents that.' },
  hints: [
    `<p>Hint 1: snapshot every cache entry you will change: all feed variants and the detail entry.</p>`,
    `<p>Hint 2: <code>qc.getQueriesData({queryKey})</code> returns <code>[key, data]</code> pairs for all matching entries; <code>qc.setQueriesData</code> updates them all.</p>`,
    `<p>Hint 3: recipe: onMutate (cancel, snapshot, apply a pure <code>bump</code> function to pages and detail, return context); onError (restore each snapshot pair); onSettled (invalidate lists and detail).</p>`
  ],
  solution: {
    approach: `<p>One pure function <code>bump(post)</code> changes a single post. It is applied to every item inside every cached feed page and to the detail entry. The context returned by <code>onMutate</code> holds the exact previous values, so rollback is a loop of <code>setQueryData</code>. <code>onSettled</code> always re-syncs.</p>`,
    code: {
      lang: 'jsx', check: false,
      code: `import { useMutation, useQueryClient } from '@tanstack/react-query';

const postKeys = {
  all: ['posts'],
  lists: () => ['posts', 'list'],
  detail: (id) => ['posts', 'detail', id]
};

export function useLikePost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (postId) =>
      fetch('/api/posts/' + postId + '/like', { method: 'PUT' }).then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }),                                                       // PUT liked=true is idempotent (safe to retry)

    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: postKeys.all });       // 1) stop late refetches overwriting us

      const previousLists = qc.getQueriesData({ queryKey: postKeys.lists() });  // 2) snapshots
      const previousDetail = qc.getQueryData(postKeys.detail(postId));

      const bump = (p) => (p.id === postId ? { ...p, liked: true, likes: p.likes + 1 } : p);

      qc.setQueriesData({ queryKey: postKeys.lists() }, (old) =>   // 3) apply to every cached feed
        old && { ...old, pages: old.pages.map((pg) => ({ ...pg, items: pg.items.map(bump) })) });
      qc.setQueryData(postKeys.detail(postId), (old) => old && bump(old));

      return { previousLists, previousDetail };
    },

    onError: (_err, postId, ctx) => {                           // 4) rollback both places
      ctx.previousLists.forEach(([key, data]) => qc.setQueryData(key, data));
      qc.setQueryData(postKeys.detail(postId), ctx.previousDetail);
      // toast.error('Could not like this post');
    },

    onSettled: (_data, _err, postId) => {                       // 5) always re-sync with the server
      qc.invalidateQueries({ queryKey: postKeys.lists() });
      qc.invalidateQueries({ queryKey: postKeys.detail(postId) });
    }
  });
}`
    },
    complexity: `<p>O(total cached feed items) for the optimistic pass, trivial for typical feeds. Normalized caches (see the Hard problem on normalization) make this O(1).</p>`,
    followUps: ['What if the user taps Like then Unlike quickly? Sketch a safe approach.', 'Why is PUT liked=true better than POST /toggle for retries?']
  }
});

practice.push({
  title: 'Stale-While-Revalidate Fetcher with Subscribers and Focus Refetch',
  level: 'Medium', tags: ['swr', 'cache', 'subscribe', 'async'], companies: ['Vercel', 'Netflix', 'Atlassian'],
  statement: `<p>Implement <code>createSWR({ fetcher, ttl, now })</code> with <code>subscribe(key, callback)</code> and <code>focus()</code>. Subscribers receive <code>{ data, isStale, isValidating }</code>. Rules: a first subscriber on a missing key triggers a fetch (callback gets <code>isValidating: true</code>, then the data); a subscriber on a cached key gets the cached data <b>immediately</b>, and a background refetch starts if it is stale; <code>focus()</code> revalidates every subscribed key that is stale; simultaneous revalidations of one key share one request; <code>subscribe</code> returns an unsubscribe function.</p>`,
  constraints: `Time comes only from <code>now()</code>. Notify all subscribers of a key when its state changes.`,
  example: `<p>ttl = 30. Subscribe at t=0; focus at t=10; focus at t=50.</p>
    ${H.table(['Moment', 'Callback receives'], [['subscribe t=0', '{validating} then {data v1, fresh}'], ['focus t=10', '<span class="c-g">nothing</span> (fresh)'], ['focus t=50', '{data v1, stale, validating} then {data v2, fresh}']])}`,
  brute: {
    why: `<p>Without a shared cache each subscriber fetches on its own and shows a blank spinner first. Two components using one key make two requests, and returning to a screen always starts from empty.</p>`,
    code: `let calls = 0;
const fetcher = async (k) => { calls++; return k + ' data'; };
async function naiveSubscribe(key, cb) {
  cb({ loading: true });
  cb({ data: await fetcher(key) });
}
(async () => { await naiveSubscribe('a', () => {}); await naiveSubscribe('a', () => {}); console.log('calls', calls); })();`
  },
  mcq: { q: 'A second component subscribes to a key that was fetched 5 seconds ago (ttl 30s). What should it receive?', options: ['A loading state, then the data', 'The cached data immediately, with no new request', 'An error because the key is already subscribed'], answer: 1, explain: 'Within ttl the data is fresh: serve it instantly and do not fetch. Only stale entries trigger a background revalidation.' },
  hints: [
    `<p>Hint 1: an entry needs <code>data</code>, <code>updatedAt</code> and the running <code>promise</code>. A <code>view(key)</code> function turns it into <code>{data, isStale, isValidating}</code>.</p>`,
    `<p>Hint 2: <code>revalidate</code> returns the existing promise if one is running (dedupe), otherwise starts one, stores it, emits "validating", and emits again when it resolves.</p>`,
    `<p>Hint 3: recipe: <code>subscribe</code>: add callback; if no entry → revalidate; else call the callback with the view and revalidate when stale. <code>focus</code>: loop subscribed keys with at least one subscriber, revalidate if stale.</p>`
  ],
  solution: {
    approach: `<p>A Map for entries and a Map of Sets for subscribers. All state changes go through <code>emit(key)</code> so the callbacks always see consistent data. The stored promise is both the dedupe mechanism and the <code>isValidating</code> flag.</p>`,
    code: {
      lang: 'js', run: true,
      code: `function createSWR({ fetcher, ttl = 30, now }) {
  const cache = new Map();   // key -> { data, updatedAt, promise }
  const subs = new Map();    // key -> Set<callback>

  const view = (key) => {
    const e = cache.get(key);
    return { data: e.data, isStale: now() - e.updatedAt >= ttl, isValidating: !!e.promise };
  };
  const emit = (key) => (subs.get(key) || []).forEach((cb) => cb(view(key)));

  function revalidate(key) {
    const e = cache.get(key) || { data: undefined, updatedAt: -Infinity, promise: null };
    if (e.promise) return e.promise;                          // dedupe
    const promise = fetcher(key).then(
      (data) => { cache.set(key, { data, updatedAt: now(), promise: null }); emit(key); },
      () => { cache.set(key, { ...cache.get(key), promise: null }); emit(key); }  // keep old data on error
    );
    cache.set(key, { ...e, promise });
    emit(key);                                                // tell the UI we are validating
    return promise;
  }

  return {
    subscribe(key, cb) {
      if (!subs.has(key)) subs.set(key, new Set());
      subs.get(key).add(cb);
      if (!cache.has(key)) revalidate(key);                  // miss: fetch
      else { cb(view(key)); if (view(key).isStale) revalidate(key); }  // hit: instant, then maybe refresh
      return () => subs.get(key).delete(cb);
    },
    focus() {
      for (const [key, set] of subs) if (set.size && (!cache.has(key) || view(key).isStale)) revalidate(key);
    }
  };
}

let clock = 0, version = 0, calls = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fetcher = async (key) => { calls++; await sleep(5); version++; return key + ' v' + version; };
const log = (name) => (s) => console.log('  ' + name + ' t=' + clock + ':', JSON.stringify(s));

(async () => {
  const swr = createSWR({ fetcher, ttl: 30, now: () => clock });
  console.log('subscribe A'); swr.subscribe('/api/p', log('A')); await sleep(20);
  clock = 10; console.log('focus (fresh)'); swr.focus(); await sleep(20);
  clock = 50; console.log('focus (stale)'); swr.focus(); await sleep(20);
  console.log('subscribe B (cached)'); swr.subscribe('/api/p', log('B')); await sleep(20);
  console.log('network calls:', calls);
})();`
    },
    complexity: `<p>O(1) per subscribe, O(K) per focus for K subscribed keys. One network call per stale key per round.</p>`,
    followUps: ['Add an invalidate(key) method (SWR\'s mutate).', 'How would you add retry with exponential backoff on error?']
  }
});

practice.push({
  title: 'Redux Middleware: Logger and Thunk from Scratch',
  level: 'Medium', tags: ['redux', 'middleware', 'thunk', 'composition'], companies: ['Uber', 'Flipkart', 'Atlassian'],
  statement: `<p>Implement <code>applyMiddleware(...middlewares)</code> for a minimal <code>createStore</code>, using the standard shape <code>(api) =&gt; (next) =&gt; (action) =&gt; result</code> where <code>api = { getState, dispatch }</code>. Write two middlewares: <code>logger</code> (logs the action and the state after) and <code>thunk</code> (if the action is a function, call it with <code>(dispatch, getState)</code> instead of passing it to the reducer). Demonstrate a counter with a plain action and an async thunk that increments after a delay. Explain why the order <code>applyMiddleware(thunk, logger)</code> matters.</p>`,
  constraints: `Middleware chain runs left to right on the way in. A thunk dispatching inside itself must go through the full chain again (use api.dispatch).`,
  example: `<p>Dispatch <code>{type:'inc'}</code> then <code>asyncInc()</code>:</p>
    ${H.table(['Dispatch', 'Logged'], [['{type:inc}', 'dispatching inc → state {n:1}'], ['asyncInc (function)', '<span class="c-m">(thunk swallows it, logger never sees the function)</span>'], ['after 10ms: dispatch {type:inc}', 'dispatching inc → state {n:2}']])}`,
  brute: {
    why: `<p>Without middleware, async work and logging are scattered inside components: each button handler does its own <code>fetch</code>, then dispatches, and logging is copy-pasted. Cross-cutting concerns cannot be changed in one place.</p>`,
    code: `const store = { state: { n: 0 }, dispatch(a) { if (a.type === 'inc') this.state = { n: this.state.n + 1 }; } };
function onClick() {
  console.log('about to dispatch inc');      // logging copied into every handler
  setTimeout(() => store.dispatch({ type: 'inc' }), 10); // async inline
}
onClick();`
  },
  mcq: { q: 'In applyMiddleware(thunk, logger), what does logger receive when a thunk function is dispatched?', options: ['The function itself', 'Nothing for that call: thunk handles it and does not call next', 'A copy of the function'], answer: 1, explain: 'thunk is first in the chain; for functions it calls the function and returns without calling next, so logger (and the reducer) never see it. Only the plain actions the thunk later dispatches flow through the logger.' },
  hints: [
    `<p>Hint 1: a middleware is a function that wraps <code>dispatch</code>: it can run code before, after, or instead of calling <code>next(action)</code>.</p>`,
    `<p>Hint 2: chain them with <code>reduceRight</code> so the first middleware ends up outermost: <code>mw1(mw2(store.dispatch))</code>.</p>`,
    `<p>Hint 3: recipe: build <code>api</code> whose <code>dispatch</code> calls the <b>final</b> composed dispatch (a variable you assign later), so thunks that dispatch go through the whole chain again.</p>`
  ],
  solution: {
    approach: `<p>Each middleware is "dispatch in, dispatch out". The enhancer wires them with <code>reduceRight</code>. The late-bound <code>dispatch</code> in <code>api</code> is the one subtle detail: a thunk must call the composed dispatch (so logging applies to its inner actions), not the raw store dispatch.</p>`,
    code: {
      lang: 'js', run: true,
      code: `function createStore(reducer, enhancer) {
  if (enhancer) return enhancer(createStore)(reducer);
  let state = reducer(undefined, { type: '@@init' });
  const listeners = new Set();
  return {
    getState: () => state,
    dispatch(action) { state = reducer(state, action); listeners.forEach((l) => l()); return action; },
    subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
  };
}

function applyMiddleware(...middlewares) {
  return (createStoreFn) => (reducer) => {
    const store = createStoreFn(reducer);
    let dispatch = () => { throw new Error('Do not dispatch while constructing middleware'); };
    // late-bound: refers to the FINAL composed dispatch
    const api = { getState: store.getState, dispatch: (action) => dispatch(action) };
    const chain = middlewares.map((mw) => mw(api));              // (next) => (action) => ...
    dispatch = chain.reduceRight((next, mw) => mw(next), store.dispatch);
    return { ...store, dispatch };
  };
}

const logger = (api) => (next) => (action) => {
  console.log('  dispatching', action.type);
  const result = next(action);
  console.log('  state after ->', JSON.stringify(api.getState()));
  return result;
};

const thunk = (api) => (next) => (action) =>
  typeof action === 'function' ? action(api.dispatch, api.getState) : next(action);

const reducer = (state = { n: 0 }, action) => (action.type === 'inc' ? { n: state.n + 1 } : state);
const store = createStore(reducer, applyMiddleware(thunk, logger)); // thunk first: functions never reach logger

const asyncInc = () => (dispatch) => {
  console.log('  thunk started (logger did not see this function)');
  return new Promise((resolve) => setTimeout(() => { dispatch({ type: 'inc' }); resolve(); }, 10));
};

(async () => {
  console.log('plain action:');
  store.dispatch({ type: 'inc' });
  console.log('thunk:');
  await store.dispatch(asyncInc());
  console.log('final', JSON.stringify(store.getState()));
})();`
    },
    complexity: `<p>Each dispatch passes through M middlewares: O(M) overhead plus the reducer. Keep middleware cheap.</p>`,
    followUps: ['Where would you put an analytics middleware relative to thunk?', 'How does RTK\'s listener middleware differ from thunks?']
  }
});

practice.push({
  title: 'Memoized Selector (createSelector from Scratch)',
  level: 'Medium', tags: ['selectors', 'memoization', 'reselect', 'performance'], companies: ['Meta', 'Amazon', 'Booking.com'],
  statement: `<p>Implement <code>createSelector(inputSelectors, combiner)</code>. It must recompute only when the <b>results of the input selectors</b> change (compare each with <code>Object.is</code>), otherwise return the cached result (the exact same reference). Expose <code>selector.recomputations</code> to count recomputes. Use it to build <code>selectVisibleItems</code> from <code>items</code> and <code>query</code> and prove that changing an unrelated field (<code>theme</code>) does not recompute and returns the same array reference.</p>`,
  constraints: `Cache size 1 is enough (like Reselect's default). The combiner must be pure.`,
  example: `${H.table(['State change', 'recomputations', 'same array reference?'], [['first call', '1', '-'], ['theme: dark', '<span class="c-g">1</span>', '<span class="c-g">yes</span>'], ['query: "ha"', '<span class="c-y">2</span>', 'no (new result)'], ['theme: light', '<span class="c-g">2</span>', '<span class="c-g">yes</span>']])}`,
  brute: {
    why: `<p>An un-memoized selector that calls <code>filter</code> returns a <b>new array every time</b>. In <code>useSelector</code> that means "changed" after every dispatch, so the component re-renders on every unrelated update and any <code>useEffect</code> depending on it fires again.</p>`,
    code: `const selectVisible = (s) => s.items.filter((i) => i.name.includes(s.query));
const state = { items: [{ name: 'Hat' }], query: '', theme: 'light' };
console.log(selectVisible(state) === selectVisible(state)); // false: new array each call`
  },
  mcq: { q: 'Why does a memoized selector compare INPUT results rather than the whole state?', options: ['The whole state is always a new object after any update, so comparing it would never hit the cache', 'Because inputs are faster to compare', 'To avoid circular references'], answer: 0, explain: 'Any dispatch creates a new root state. The memoizer asks "did the specific slices I depend on change?" which stays true when unrelated fields change.' },
  hints: [
    `<p>Hint 1: run the input selectors on the new state and compare their outputs to the previous outputs, one by one.</p>`,
    `<p>Hint 2: if all equal (<code>Object.is</code>), return the stored result; otherwise run the combiner and store both the new args and the new result.</p>`,
    `<p>Hint 3: remember the first call: there are no previous args yet, so always compute.</p>`
  ],
  solution: {
    approach: `<p>Cache the last input values and the last result in a closure. The check is a loop over a handful of references, far cheaper than re-filtering a big list. Returning the identical reference is what lets <code>useSelector</code> and <code>React.memo</code> skip work.</p>`,
    code: {
      lang: 'js', run: true,
      code: `function createSelector(inputSelectors, combiner) {
  let lastArgs = null;
  let lastResult;
  const selector = (state) => {
    const args = inputSelectors.map((fn) => fn(state));
    if (lastArgs && args.every((a, i) => Object.is(a, lastArgs[i]))) return lastResult; // cache hit
    lastArgs = args;
    selector.recomputations++;
    lastResult = combiner(...args);
    return lastResult;
  };
  selector.recomputations = 0;
  return selector;
}

const selectItems = (s) => s.items;
const selectQuery = (s) => s.query;
const selectVisibleItems = createSelector([selectItems, selectQuery], (items, query) =>
  items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase())));

let state = { items: [{ name: 'Shoe' }, { name: 'Hat' }], query: '', theme: 'light' };
const first = selectVisibleItems(state);
console.log('first call       -> recomputations', selectVisibleItems.recomputations);

state = { ...state, theme: 'dark' }; // unrelated change: new root object, same items and query
const second = selectVisibleItems(state);
console.log('theme changed    -> recomputations', selectVisibleItems.recomputations, '| same reference:', first === second);

state = { ...state, query: 'ha' };
const third = selectVisibleItems(state);
console.log('query changed    -> recomputations', selectVisibleItems.recomputations, '| same reference:', second === third, '| result', third.map((i) => i.name));

state = { ...state, theme: 'light' };
console.log('theme changed    -> recomputations', selectVisibleItems.recomputations, '| same reference:', third === selectVisibleItems(state));`
    },
    complexity: `<p>Cache hit: O(k) for k inputs. Miss: O(k + combiner). Memory: one cached result. For per-component parameters, create one selector instance per component (cache size 1 is per selector).</p>`,
    followUps: ['Why does a selector shared by many components with different arguments thrash the cache?', 'What does Reselect v5 do differently with weakMapMemoize?']
  }
});
/* =====================================================================
   PRACTICE: Hard (5)
   ===================================================================== */
practice.push({
  title: 'Latest-Wins Fetching: Out-of-Order Responses and Cancellation',
  level: 'Hard', tags: ['race conditions', 'AbortController', 'async', 'search'], companies: ['Google', 'Amazon', 'Uber'],
  statement: `<p>A search box fires a request on every keystroke. Responses can arrive <b>out of order</b> (the answer for "a" arrives after the answer for "ann"), so the UI may end up showing results for the wrong text. Write <code>createLatestWins(fetcher)</code> returning <code>load(query)</code>. Rules: (1) only the <b>latest</b> call's result is delivered as <code>{ stale: false, data }</code>; older calls resolve to <code>{ stale: true }</code>; (2) starting a new call <b>aborts</b> the previous request with an <code>AbortController</code> (the fetcher receives <code>signal</code>); (3) it must still be correct if the fetcher <b>ignores</b> the signal. Demonstrate both cases.</p>`,
  constraints: `Fetcher signature <code>(query, signal) =&gt; Promise</code>. An aborted fetcher rejects with an error named <code>AbortError</code>, which must not be treated as a failure.`,
  example: `<p>User types a → an → ann quickly. Delays: "a" 30 ms, "an" 5 ms, "ann" 15 ms.</p>
    ${H.table(['Call', 'Arrives', 'Delivered?'], [['a', 't=30', '<span class="c-r">stale (aborted or ignored)</span>'], ['an', 't=5', '<span class="c-r">stale (not the latest)</span>'], ['ann', 't=15', '<span class="c-g">fresh: shown</span>']])}`,
  brute: {
    why: `<p>The naive handler sets state whenever any response arrives: <code>fetch(q).then(setResults)</code>. A slow early response overwrites a later one, so the box says "ann" and the list shows results for "a". This is a classic, hard-to-reproduce production bug.</p>`,
    code: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shown = '';
const fetchResults = async (q, ms) => { await sleep(ms); return q + ' results'; };
(async () => {
  fetchResults('a', 30).then((r) => { shown = r; });    // slow, arrives last
  fetchResults('ann', 5).then((r) => { shown = r; });   // latest, arrives first
  await sleep(50);
  console.log('screen shows:', shown); // "a results" even though the user typed "ann"
})();`
  },
  mcq: { q: 'Why is a request counter (id) still needed even when you use AbortController?', options: ['AbortController is not supported in browsers', 'The fetcher might ignore the signal, or the response may already be parsed before the abort lands', 'Counters are faster'], answer: 1, explain: 'Abort is a request to stop, not a guarantee. A stale response can still arrive. The counter is the correctness guarantee; abort just saves bandwidth.' },
  hints: [
    `<p>Hint 1: give every call an increasing id. When a response arrives, compare its id to the newest id.</p>`,
    `<p>Hint 2: keep one <code>AbortController</code> for the previous call; abort it when a new call starts and create a fresh one.</p>`,
    `<p>Hint 3: catch errors: if <code>err.name === 'AbortError'</code> return <code>{ stale: true }</code>, otherwise rethrow. Also guard after <code>await</code> with the id check.</p>`
  ],
  solution: {
    approach: `<p>Two layers of protection. <b>Abort</b> is an optimization (the browser stops downloading). The <b>id guard</b> is correctness (the UI only accepts the newest request even if abort fails or the fetcher ignores it). The same idea is what React Query does by keying the cache by query and what a <code>useEffect</code> cleanup flag does by hand.</p>`,
    code: {
      lang: 'js', run: true,
      code: `function createLatestWins(fetcher) {
  let latestId = 0;
  let controller = null;
  return async function load(query) {
    const id = ++latestId;
    if (controller) controller.abort();              // cancel the previous request
    controller = new AbortController();
    try {
      const data = await fetcher(query, controller.signal);
      if (id !== latestId) return { query, stale: true };   // correctness guard
      return { query, stale: false, data };
    } catch (err) {
      if (err && err.name === 'AbortError') return { query, stale: true, aborted: true };
      throw err;
    }
  };
}

// A fetcher that respects the abort signal
const delays = { a: 30, an: 5, ann: 15 };
const politeFetcher = (q, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(() => resolve(q + ' results'), delays[q]);
  signal.addEventListener('abort', () => { clearTimeout(t); const e = new Error('aborted'); e.name = 'AbortError'; reject(e); });
});
// A fetcher that IGNORES the signal (the id guard must still save us)
const rudeFetcher = (q) => new Promise((resolve) => setTimeout(() => resolve(q + ' results'), delays[q]));

async function demo(label, fetcher) {
  console.log(label);
  const load = createLatestWins(fetcher);
  const results = await Promise.all([load('a'), load('an'), load('ann')]);  // typed quickly
  results.forEach((r) => console.log('  ', r.query.padEnd(4), r.stale ? 'stale' + (r.aborted ? ' (aborted)' : ' (ignored)') : 'SHOWN: ' + r.data));
}
(async () => {
  await demo('fetcher honours abort:', politeFetcher);
  await demo('fetcher ignores abort:', rudeFetcher);
})();`
    },
    complexity: `<p>O(1) per call. Memory: one controller and one counter. Network: aborted requests free the connection early.</p>`,
    followUps: ['How would you add a 300 ms debounce in front of load()?', 'How does the useEffect cleanup function ({ let ignore = false; ... return () => { ignore = true } }) implement the same guard?']
  }
});

practice.push({
  title: 'Overlapping Optimistic Mutations Without Losing Updates',
  level: 'Hard', tags: ['optimistic', 'rollback', 'concurrency', 'state'], companies: ['Figma', 'Notion', 'Slack'],
  statement: `<p>Snapshot-based rollback has a bug: mutation A (like) is in flight and fails slowly; mutation B (bookmark) starts and succeeds quickly. When A fails and restores <i>its</i> snapshot, B's bookmark disappears. Build <code>createOptimisticStore(base)</code> that keeps a <b>committed</b> base state plus an ordered list of <b>pending operations</b>. The visible state is <code>pending.reduce(apply, committed)</code>. <code>mutate(applyFn, request)</code> adds an operation; on failure it is simply <b>removed</b> (other operations survive); on success it is committed in order. Show the snapshot approach losing the bookmark and your approach keeping it.</p>`,
  constraints: `Operations are pure functions state → state. Commit finished operations to the base only from the front of the queue (preserves order).`,
  example: `<p>Start <code>{ likes: 10, bookmarked: false }</code>. A: like (+1), slow, fails. B: bookmark, fast, succeeds.</p>
    ${H.table(['Moment', 'Snapshot rollback', 'Operation queue'], [['A and B started', '{11, true}', '{11, true}'], ['B succeeds', '{11, true}', '{11, true}'], ['A fails', '<span class="c-r">{10, false}</span> bookmark lost!', '<span class="c-g">{10, true}</span>']])}`,
  brute: {
    why: `<p>Each mutation saves "the state before me" and restores it on failure. But that state includes other mutations' changes that were applied or rolled back in the meantime, so restoring it can erase or resurrect unrelated updates.</p>`,
    code: `let state = { likes: 10, bookmarked: false };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function snapshotMutate(apply, request) {
  const snapshot = state;
  state = apply(state);
  try { await request(); } catch (e) { state = snapshot; }   // restores EVERYTHING back then
}
(async () => {
  const a = snapshotMutate((s) => ({ ...s, likes: s.likes + 1 }), async () => { await sleep(20); throw new Error('500'); });
  const b = snapshotMutate((s) => ({ ...s, bookmarked: true }), async () => { await sleep(5); });
  await Promise.all([a, b]);
  console.log(JSON.stringify(state)); // bookmark lost
})();`
  },
  mcq: { q: 'In the operation-queue design, what happens to a FAILED mutation?', options: ['The whole state is restored to the old snapshot', 'Only that operation is removed; the visible state is recomputed from base plus the remaining operations', 'All pending operations are cancelled'], answer: 1, explain: 'Because the visible state is a fold of the remaining operations over the base, removing one operation naturally leaves all the others applied. This is the idea behind optimistic layers in Apollo and similar systems.' },
  hints: [
    `<p>Hint 1: store <b>what changed</b> (operations), not <b>what the state was</b> (snapshots).</p>`,
    `<p>Hint 2: visible state = fold of pending operations over the committed base. Recompute it on every change.</p>`,
    `<p>Hint 3: on success mark the op <code>done</code>; then, while the first pending op is done, apply it to the base and shift it. On failure remove it with <code>splice</code>. Notify subscribers either way.</p>`
  ],
  solution: {
    approach: `<p>Operations are the unit of undo. A failed operation disappears, and the rest still apply on top of the base. Finished operations are committed to the base only when everything before them has settled, which keeps operation order stable for non-commutative changes.</p>`,
    code: {
      lang: 'js', run: true,
      code: `function createOptimisticStore(base) {
  let committed = base;
  const pending = [];                  // ordered operations { apply, done }
  const view = () => pending.reduce((s, op) => op.apply(s), committed);

  function settle(op, ok) {
    if (ok) op.done = true;            // keep applied on screen until older ops settle
    else pending.splice(pending.indexOf(op), 1);   // failure: just remove this one operation
    while (pending.length && pending[0].done) committed = pending.shift().apply(committed); // commit from the front
  }

  return {
    view,
    async mutate(apply, request) {
      const op = { apply, done: false };
      pending.push(op);                // optimistic: visible immediately
      try { await request(); settle(op, true); return true; }
      catch (e) { settle(op, false); return false; }
    },
    committed: () => committed,
    pendingCount: () => pending.length
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const like = (s) => ({ ...s, likes: s.likes + 1 });
const bookmark = (s) => ({ ...s, bookmarked: true });

(async () => {
  const store = createOptimisticStore({ likes: 10, bookmarked: false });
  const A = store.mutate(like, async () => { await sleep(20); throw new Error('500'); });  // slow + fails
  console.log('A started        ->', JSON.stringify(store.view()));
  const B = store.mutate(bookmark, async () => { await sleep(5); });                       // fast + ok
  console.log('B started        ->', JSON.stringify(store.view()));
  await B;
  console.log('B succeeded      ->', JSON.stringify(store.view()), '| pending ops:', store.pendingCount(), '(B waits behind A)');
  await A;
  console.log('A failed         ->', JSON.stringify(store.view()), '| pending ops:', store.pendingCount());
  console.log('committed base   ->', JSON.stringify(store.committed()));
})();`
    },
    complexity: `<p>Recomputing the view is O(P) for P pending operations (usually 0 to 3). Memory O(P).</p>`,
    followUps: ['What if two operations edit the same field (A sets title "x", B sets title "y") and A fails?', 'How do you show a per-item "saving..." indicator using this structure?']
  }
});

practice.push({
  title: 'useSyncExternalStore Hook with Stable Selectors',
  level: 'Hard', tags: ['useSyncExternalStore', 'selectors', 'store', 'react internals'], companies: ['Meta', 'Vercel', 'Microsoft'],
  statement: `<p>Given a vanilla store with <code>getState</code> and <code>subscribe</code>, write the React hook <code>useStoreSelector(store, selector, isEqual = Object.is)</code> on top of <code>useSyncExternalStore</code>. It must (1) re-render a component only when its selected slice changes, (2) not loop forever or warn "getSnapshot should be cached" when the selector returns a new object with equal contents, (3) work if the selector is an inline arrow function, and (4) support server rendering via <code>getServerSnapshot</code>. Explain what "tearing" is and why this API prevents it.</p>`,
  constraints: `React 18/19. No external libraries. getSnapshot must return the same reference when nothing relevant changed.`,
  example: `<p><code>useStoreSelector(store, s =&gt; ({ a: s.a, b: s.b }), shallow)</code> while only <code>s.c</code> changes:</p>
    ${H.table(['Call', 'Selector result', 'Returned to React', 'Re-render?'], [['1st', 'new {a,b}', 'cached', 'mount'], ['after s.c changes', 'new {a,b} (equal)', '<span class="c-g">previous object</span>', '<span class="c-g">no</span>']])}`,
  brute: {
    why: `<p>The naive hook uses <code>useState</code> + <code>useEffect(subscribe)</code>. It renders once with stale data before the effect subscribes, can miss updates between render and subscribe, and during concurrent rendering different components may read different versions of the store in one render (tearing).</p>`,
    code: {
      lang: 'jsx', check: false,
      code: `function useStoreNaive(store, selector) {
  const [value, setValue] = useState(() => selector(store.getState()));
  useEffect(() => {
    // update that happened between render and this effect is missed!
    return store.subscribe(() => setValue(selector(store.getState())));
  }, [store, selector]);
  return value;
}`
    }
  },
  mcq: { q: 'What goes wrong if getSnapshot returns a brand-new object on every call?', options: ['Nothing, React clones it', 'React thinks the store changed on every check and can loop or re-render endlessly', 'The store becomes immutable'], answer: 1, explain: 'useSyncExternalStore compares snapshots with Object.is. A new object each call always looks like a change, which in development triggers the "getSnapshot should be cached" warning and can cause an infinite loop.' },
  hints: [
    `<p>Hint 1: <code>useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)</code> calls <code>getSnapshot</code> often. It must be cheap and return a stable reference when nothing changed.</p>`,
    `<p>Hint 2: cache the last <code>state</code>, last <code>selector</code> and last <code>selected</code> in a ref. If the root state is unchanged, return the cached selection. If the new selection is <code>isEqual</code> to the old one, return the <b>old</b> reference.</p>`,
    `<p>Hint 3: include the selector in the cache check, because an inline arrow can change meaning. Mutating a ref inside getSnapshot is acceptable because it only memoizes a pure computation.</p>`
  ],
  solution: {
    approach: `<p>Memoize at two levels: same root state means same answer; a new root state with an equal selection keeps the previous reference. React then sees an unchanged snapshot and skips the re-render. Pass the same function as the server snapshot so hydration matches the initial client state.</p>`,
    code: {
      lang: 'jsx', check: false,
      code: `import { useCallback, useRef, useSyncExternalStore } from 'react';

// ---- the vanilla store (framework independent) ----
export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    getState: () => state,
    setState(patch) {
      const next = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
      if (Object.keys(next).every((k) => Object.is(next[k], state[k]))) return;   // nothing changed
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

export const shallow = (a, b) => {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => Object.is(a[k], b[k]));
};

// ---- the hook ----
export function useStoreSelector(store, selector, isEqual = Object.is) {
  const cache = useRef(null);   // { state, selector, selected }

  const getSnapshot = useCallback(() => {
    const state = store.getState();
    const last = cache.current;
    // 1) same root state + same selector => same answer, no work
    if (last && last.state === state && last.selector === selector) return last.selected;
    const next = selector(state);
    // 2) new root state but equal selection => keep the OLD reference so React skips the render
    if (last && isEqual(last.selected, next)) {
      cache.current = { state, selector, selected: last.selected };
      return last.selected;
    }
    cache.current = { state, selector, selected: next };
    return next;
  }, [store, selector, isEqual]);

  // third argument: used during server render and hydration
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

// usage
// const store = createStore({ a: 1, b: 2, c: 3 });
// const { a, b } = useStoreSelector(store, (s) => ({ a: s.a, b: s.b }), shallow); // re-renders only for a or b`
    },
    complexity: `<p>Each store update runs every mounted selector once: O(S) selectors. The equality function keeps re-renders to components whose slice really changed.</p>`,
    followUps: ['What is tearing, and why can useEffect-based subscriptions tear under concurrent rendering?', 'Why must the store be per-request on the server in a Next.js app?']
  }
});

practice.push({
  title: 'Normalized Entity Cache with Reference Stability',
  level: 'Hard', tags: ['normalization', 'entity adapter', 'structural sharing', 'performance'], companies: ['Facebook', 'Twitter/X', 'Airbnb'],
  statement: `<p>The same product appears in two lists (a "Sale" list and a "New" list). In a nested cache, updating its price requires editing both lists, and every row re-renders. Build <code>createEntityStore()</code> with <code>upsertMany(items)</code>, <code>getById(id)</code>, <code>setList(name, ids)</code>, and <code>getList(name)</code> (returns entities in order). Requirements: store entities by id once; <code>upsertMany</code> must keep the <b>same object reference</b> for any entity whose fields did not change (structural sharing), so memoized rows skip rendering. Show that after the server re-sends all products with only product 2 changed, only product 2 has a new reference and both lists see the new price.</p>`,
  constraints: `Entities are flat objects with primitive fields. Compare fields shallowly. Lists store ids, not entity copies.`,
  example: `${H.table(['After re-sending 3 products (only #2 changed)', 'Reference changed?'], [['product 1', '<span class="c-g">no</span> (row skips render)'], ['product 2', '<span class="c-y">yes</span> (price updated)'], ['product 3', '<span class="c-g">no</span>'], ['Sale list [1,2] and New list [2,3]', 'both show the new price for #2']])}`,
  brute: {
    why: `<p>A nested cache stores full copies: <code>sale: [{id:1,...},{id:2,...}]</code> and <code>new: [{id:2,...},{id:3,...}]</code>. Product 2 exists twice, so an update must find and patch every copy (and forgets one eventually). A refetch replaces the whole array with new objects, so every row re-renders.</p>`,
    code: `const cache = { sale: [{ id: 1, price: 10 }, { id: 2, price: 20 }], newest: [{ id: 2, price: 20 }, { id: 3, price: 30 }] };
function updatePrice(id, price) {
  cache.sale = cache.sale.map((p) => (p.id === id ? { ...p, price } : p));
  // forgot cache.newest -> the two lists now disagree about product 2
}
updatePrice(2, 25);
console.log(cache.sale[1].price, cache.newest[0].price); // 25 vs 20`
  },
  mcq: { q: 'Why store ids in lists and entities in one table?', options: ['It uses less code', 'A fact lives in exactly one place, so one update is seen by every list, and unchanged entities keep their references', 'Because arrays cannot hold objects'], answer: 1, explain: 'Normalization gives a single source of truth per entity and makes updates O(1). Combined with structural sharing it also tells React exactly which rows changed.' },
  hints: [
    `<p>Hint 1: two maps: <code>entities: { [id]: object }</code> and <code>lists: { [name]: id[] }</code>.</p>`,
    `<p>Hint 2: in <code>upsertMany</code>, for each incoming item compare it to the stored one field by field; if equal, reuse the stored object, else store the new one (merged).</p>`,
    `<p>Hint 3: <code>getList</code> maps ids to entities. Memoize it per list so it returns the same array while the involved entity references are unchanged.</p>`
  ],
  solution: {
    approach: `<p>Entities live once in a map. Lists hold ids and are resolved on read. The upsert keeps the old reference when nothing changed, which is exactly what React Query's structural sharing and Redux Toolkit's <code>createEntityAdapter</code> do for you. Memoizing the list read means components get the same array until a member changes.</p>`,
    code: {
      lang: 'js', run: true,
      code: `const shallowEqual = (a, b) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => Object.is(a[k], b[k]));
};

function createEntityStore() {
  let entities = {};          // id -> entity   (single source of truth)
  const lists = {};           // name -> [ids]
  const memo = {};            // name -> { entitiesRef, items }

  return {
    upsertMany(items) {
      const next = { ...entities };
      let changed = false;
      for (const item of items) {
        const old = next[item.id];
        if (old && shallowEqual(old, { ...old, ...item })) continue;   // unchanged: KEEP the old reference
        next[item.id] = { ...old, ...item };                            // changed or new: new reference
        changed = true;
      }
      if (changed) entities = next;                                     // keep the map reference too if nothing changed
    },
    getById: (id) => entities[id],
    setList(name, ids) { lists[name] = ids; delete memo[name]; },
    getList(name) {
      const m = memo[name];
      const ids = lists[name] || [];
      const items = ids.map((id) => entities[id]);
      // same array while every member keeps its reference
      if (m && m.items.length === items.length && m.items.every((it, i) => it === items[i])) return m.items;
      memo[name] = { items };
      return items;
    }
  };
}

const store = createEntityStore();
store.upsertMany([{ id: 1, name: 'Shoe', price: 10 }, { id: 2, name: 'Hat', price: 20 }, { id: 3, name: 'Bag', price: 30 }]);
store.setList('sale', [1, 2]);
store.setList('newest', [2, 3]);

const before = { 1: store.getById(1), 2: store.getById(2), 3: store.getById(3) };
const saleBefore = store.getList('sale');

// the server re-sends ALL products (fresh JSON objects), only #2 changed
store.upsertMany([{ id: 1, name: 'Shoe', price: 10 }, { id: 2, name: 'Hat', price: 25 }, { id: 3, name: 'Bag', price: 30 }]);

[1, 2, 3].forEach((id) => console.log('product', id, store.getById(id) === before[id] ? 'same reference (row skips render)' : 'NEW reference (row re-renders)'));
console.log('sale list sees price', store.getList('sale')[1].price, '| newest list sees price', store.getList('newest')[0].price);
console.log('sale array reference changed:', store.getList('sale') !== saleBefore, '| sale[0] same:', store.getList('sale')[0] === saleBefore[0]);`
    },
    complexity: `<p>Upsert O(N × F) for N items and F fields. Lookups O(1). Memory: each entity stored once however many lists reference it.</p>`,
    followUps: ['How would you handle an entity deleted on the server (remove from entities and from all lists)?', 'How does this relate to Redux Toolkit createEntityAdapter and to Apollo\'s normalized cache?']
  }
});

practice.push({
  title: 'Async Field Validation: Debounce, Stale Responses and Pending State',
  level: 'Hard', tags: ['forms', 'async validation', 'debounce', 'race conditions'], companies: ['Stripe', 'Google', 'Zomato'],
  statement: `<p>Build <code>createAsyncValidator({ rules, check, delay })</code> for a username field. <code>validate(value, onState)</code> must: (1) run synchronous <code>rules</code> first (e.g. min length 3) and report <code>invalid</code> immediately with <b>no network call</b>; (2) otherwise report <code>pending</code> and <b>debounce</b> the async <code>check(value)</code> (username availability) by <code>delay</code> ms; (3) ignore any response that does not belong to the <b>latest</b> value, even if it arrives later; (4) finally report <code>available</code> or <code>taken</code>. Demo: type "ann" and 15 ms later "anna", where the check for "ann" is slow (arrives after "anna"'s) and "ann" is taken.</p>`,
  constraints: `Each validate call supersedes the previous one (cancel its timer and ignore its response). The final reported state must be for the last value only.`,
  example: `${H.table(['Time', 'Event', 'Reported'], [['0', 'type "ann"', 'pending'], ['15', 'type "anna"', 'pending (timer of "ann" already fired)'], ['~30', 'check("anna") returns', '<span class="c-g">available</span>'], ['~50', 'check("ann") returns (taken)', '<span class="c-m">ignored: stale</span>']])}`,
  brute: {
    why: `<p>The naive validator calls the API on every keystroke and trusts every answer. That floods the server, and a slow answer for an older value overwrites the newer one so the form says "taken" for a name the user has already changed.</p>`,
    code: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = async (name) => { await sleep(name === 'ann' ? 40 : 5); return name === 'ann'; };
let message = '';
(async () => {
  check('ann').then((taken) => { message = taken ? 'ann: taken' : 'ann: free'; });
  check('anna').then((taken) => { message = taken ? 'anna: taken' : 'anna: free'; });
  await sleep(60);
  console.log('field shows:', message); // "ann: taken" although the input now says anna
})();`
  },
  mcq: { q: 'Which combination correctly prevents both request floods and wrong final messages?', options: ['Debounce only', 'Debounce plus an id/token check on the response (latest wins)', 'Validate only on submit with no debounce'], answer: 1, explain: 'Debounce reduces how many requests are sent. The id check guarantees correctness when responses return out of order. Both are needed.' },
  hints: [
    `<p>Hint 1: three layers: sync rules (instant), debounce timer (fewer calls), response guard (correctness).</p>`,
    `<p>Hint 2: keep a <code>seq</code> counter and one <code>timer</code>. On every <code>validate</code>: <code>clearTimeout(timer)</code>, <code>const id = ++seq</code>.</p>`,
    `<p>Hint 3: inside the timer callback <code>await check(value)</code>, then <code>if (id !== seq) return;</code> before reporting. Report <code>pending</code> immediately so the UI can show a spinner.</p>`
  ],
  solution: {
    approach: `<p>The validator is a tiny state machine: <code>invalid</code> (sync, no network) or <code>pending → available | taken</code>. The sequence number makes any older work harmless. Timers are cleared so superseded values never even start a request when typing is fast.</p>`,
    code: {
      lang: 'js', run: true,
      code: `function createAsyncValidator({ rules, check, delay = 10 }) {
  let seq = 0;
  let timer = null;
  return {
    validate(value, onState) {
      clearTimeout(timer);                       // supersede the previous value's debounce
      const id = ++seq;
      for (const rule of rules) {                // 1) cheap synchronous rules first
        const message = rule(value);
        if (message) { onState({ value, status: 'invalid', message }); return; }
      }
      onState({ value, status: 'pending' });     // 2) show a spinner immediately
      timer = setTimeout(async () => {           // 3) debounce the network call
        const taken = await check(value);
        if (id !== seq) { console.log('  (ignored a stale response for "' + value + '")'); return; }  // 4) latest wins
        onState({ value, status: taken ? 'taken' : 'available' });
      }, delay);
    }
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// "ann" is taken and its check is SLOW; "anna" is free and fast
const check = async (name) => { await sleep(name === 'ann' ? 60 : 5); return name === 'ann'; };
const rules = [(v) => (v.length < 3 ? 'At least 3 characters' : '')];
const validator = createAsyncValidator({ rules, check, delay: 10 });
const show = (s) => console.log('  UI state:', JSON.stringify(s));

(async () => {
  console.log('type "an" (too short -> no network):');
  validator.validate('an', show);
  await sleep(20);
  console.log('type "ann", then "anna" 25 ms later:');
  validator.validate('ann', show);
  await sleep(25);                      // the debounce fired for "ann"; its slow check is running
  validator.validate('anna', show);
  await sleep(120);                     // let both checks finish
})();`
    },
    complexity: `<p>At most one pending timer and one meaningful request per pause in typing. O(1) memory.</p>`,
    followUps: ['How should the submit button behave while status is pending?', 'How would you wire this into React Hook Form as an async validate function?']
  }
});
/* =====================================================================
   QUIZ (12)
   ===================================================================== */
quiz.push({ q: 'A product list fetched from your API is best classified as which kind of state?', options: ['Local UI state', 'Server state', 'Derived state', 'URL state'], answer: 1, explain: 'The backend owns the product list; the client only holds a cached copy that can go stale. That is server state and belongs in a cache like React Query, not hand-rolled in Redux.' });
quiz.push({ q: 'Which value should NOT be stored in state because it can be calculated from other state?', options: ['The items in the cart', 'The cart total', 'The logged-in user id', 'Whether a modal is open'], answer: 1, explain: 'The total is derived from the items. Storing it creates a second source of truth that can drift out of sync; compute it during render or with a selector.' });
quiz.push({ q: 'A Context Provider re-renders because its parent re-rendered. Its value is <code>{ user, theme }</code> written inline each render. What happens to consumers?', options: ['Nothing, React compares the contents', 'All consumers re-render, because the object is new every time', 'Only consumers that use theme re-render', 'The Provider throws a warning and stops'], answer: 1, explain: 'React compares the context value with Object.is. An inline object literal is a new object on each render, so every consumer re-renders. Fix with useMemo or split contexts.' });
quiz.push({ q: 'Which change would stop a button that only calls <code>dispatch</code> from re-rendering when the state changes?', options: ['Wrap the button in React.memo', 'Put dispatch in its own context separate from the state', 'Use useCallback on the click handler', 'Use a class component'], answer: 1, explain: 'React.memo does not block context-driven updates. dispatch from useReducer never changes identity, so a dedicated dispatch context never notifies its consumers.' });
quiz.push({ q: 'In Redux, why must a reducer be a pure function?', options: ['Because JavaScript requires it', 'So the same state and action always give the same result, enabling replay, time travel, memoization and tests', 'Because reducers run on the server', 'To make dispatch asynchronous'], answer: 1, explain: 'Purity makes state changes predictable and replayable. Side effects in reducers would break devtools, memoized selectors and tests.' });
quiz.push({ q: 'In Redux Toolkit, why can you write <code>state.items.push(x)</code> inside createSlice?', options: ['RTK disables immutability', 'Immer gives a draft that records your changes and produces a new immutable state', 'push is special-cased', 'Reducers run in a worker'], answer: 1, explain: 'createSlice wraps reducers with Immer. The "mutation" is applied to a draft Proxy and Immer returns a new object with structural sharing. In plain hand-written reducers this would be a bug.' });
quiz.push({ q: 'With Zustand, which call makes a component re-render on EVERY store update?', options: ['useStore(s => s.count)', 'useStore(s => s.add)', 'useStore()  (no selector)', 'useStore(useShallow(s => ({ a: s.a })))'], answer: 2, explain: 'Without a selector the component subscribes to the entire state, so any change re-renders it. Always select the smallest slice you need.' });
quiz.push({ q: 'React Query default <code>staleTime</code> is 0. What does that mean when a component mounts and the data is already cached?', options: ['The cached data is deleted', 'The cached data is shown immediately and a background refetch starts', 'No data is shown until a new fetch completes', 'The query never refetches'], answer: 1, explain: 'staleTime 0 means data is stale immediately, so a new observer shows the cached data (stale-while-revalidate) and refetches in the background. Raise staleTime to avoid needless refetches.' });
quiz.push({ q: 'After a successful "create product" mutation, which is the most appropriate cache action for the product lists?', options: ['Do nothing', '<code>invalidateQueries({ queryKey: [\'products\', \'list\'] })</code>', 'Clear the whole cache', 'Increase gcTime'], answer: 1, explain: 'The server decides list order and filters, so mark list queries stale and let them refetch. Clearing everything is wasteful; doing nothing leaves lists out of date.' });
quiz.push({ q: 'What is the purpose of <code>cancelQueries</code> in an optimistic update\'s onMutate?', options: ['To delete the cache', 'To prevent an in-flight refetch from overwriting the optimistic value with old data', 'To cancel the mutation itself', 'To clear the error state'], answer: 1, explain: 'A refetch that started before the click may resolve after your optimistic write and restore the old value. Cancelling those queries avoids the flicker.' });
quiz.push({ q: 'Which action is a BAD candidate for an optimistic update?', options: ['Liking a post', 'Toggling a checklist item', 'Charging a credit card for an order', 'Reordering items in a playlist'], answer: 2, explain: 'Payments can fail for reasons the client cannot predict and a rollback would surprise or hurt the user. Show a pending state and wait for the server instead.' });
quiz.push({ q: 'You want React Hook Form to show a field error only after the user leaves the field once, then update live as they fix it. Which mode?', options: ['onSubmit', 'onChange', 'onTouched', 'never'], answer: 2, explain: 'onTouched validates on the first blur, then on every change. That avoids nagging while typing for the first time yet clears errors as soon as the input is fixed.' });

/* =====================================================================
   INTERVIEW (14)
   ===================================================================== */
interview.push({
  q: 'How do you decide where a piece of state should live in a React app?',
  level: 'B',
  a: `<p>I classify it first. <b>Derived</b> values are computed, not stored. <b>Local UI</b> state (is a dropdown open) stays in <code>useState</code> in the component. If siblings need it I lift it to the nearest common parent. <b>Shared client state</b> that is needed far apart (cart, theme, auth user) goes to Context for rarely-changing values or a small store like Zustand/Redux Toolkit for frequently changing ones. <b>Server state</b> (anything the backend owns) goes in a cache such as React Query/SWR. <b>URL state</b> (filters, page, tab) lives in the address bar so it survives refresh and can be shared. <b>Form state</b> goes to a form library for anything non-trivial. The principle is: smallest scope that works, one source of truth.</p>`,
  followUps: ['Where would you keep a "recently viewed products" list that must survive a refresh?', 'Give an example of state you moved from global to local and why.']
});
interview.push({
  q: 'Why is Context not a good replacement for Redux or Zustand for frequently changing state?',
  level: 'I',
  a: `<p>Context has no selectors. When the Provider value changes identity, <b>every</b> component that calls <code>useContext</code> for it re-renders, even if it uses a tiny part. For rarely changing values (theme, locale, user) that is fine. For fast-changing data, a big context value causes a re-render storm. You can mitigate by splitting contexts by change frequency, separating state and dispatch, and memoizing values, but you cannot subscribe to a slice. Stores built on <code>useSyncExternalStore</code> (Redux, Zustand, Jotai) let each component subscribe to a selected slice and re-render only when that slice changes. Context is a delivery mechanism, not a state manager, and has no middleware or devtools.</p>`,
  followUps: ['How would you fix a context that holds both cart and search text?', 'Does React.memo on a consumer stop a context-triggered re-render?']
});
interview.push({
  q: 'Walk me through what happens when you dispatch an action in Redux.',
  level: 'B',
  a: `<p>The UI calls <code>store.dispatch(action)</code> with a plain object like <code>{ type: 'cart/added', payload }</code>. The action travels through middleware (thunk, logging, analytics) in order. Then the store calls the root reducer with the current state and the action. Reducers are pure functions that return a new state without mutating the old one; unknown actions return the same state reference. The store saves the result and notifies subscribers. React-Redux's <code>useSelector</code> runs each selector against the new state and compares the result with the previous one using <code>===</code>; components whose selected value changed re-render, and the rest skip. This one-way flow makes changes predictable, loggable and replayable.</p>`,
  followUps: ['What happens if a reducer mutates the old state?', 'Where do async calls fit into this flow?']
});
interview.push({
  q: 'What problems does Redux Toolkit solve compared to classic Redux?',
  level: 'I',
  a: `<p>Classic Redux needed action type constants, action creators, big switch reducers with careful spreads, manual store setup, and extra packages for thunks and devtools. RTK bundles best practices: <code>configureStore</code> sets up thunk, devtools and dev-time checks for mutation and non-serializable values; <code>createSlice</code> generates action creators and types from reducer names and uses Immer so you can write simple "mutating" code that is turned into immutable updates; <code>createAsyncThunk</code> standardizes pending/fulfilled/rejected; <code>createSelector</code> gives memoized selectors; <code>createEntityAdapter</code> normalizes collections; and RTK Query adds data fetching and caching. It cuts boilerplate by a large factor and prevents the most common mistakes.</p>`,
  followUps: ['When would you still avoid Redux?', 'What is the difference between RTK Query and React Query?']
});
interview.push({
  q: 'Compare Zustand, Redux Toolkit and React Query. When do you pick each?',
  level: 'I',
  a: `<p>They solve different problems. <b>React Query</b> owns <i>server state</i>: caching, staleness, dedupe, retries, invalidation, background refresh. I pick it for anything fetched from an API. <b>Zustand</b> is a minimal store for <i>client state</i> with selectors, no Provider and very little ceremony; I pick it for cart, UI preferences and small to medium apps. <b>Redux Toolkit</b> is also client state but with strict conventions, middleware, time-travel devtools and a large ecosystem; I pick it in big teams or apps with complex, auditable state transitions. A common modern stack is React Query plus Zustand (or Context for theme), leaving Redux for large legacy or highly structured apps. RTK Query lets you stay inside Redux for fetching.</p>`,
  followUps: ['Can you use Redux and React Query together?', 'What would make you migrate a Redux app\'s API calls to React Query?']
});
interview.push({
  q: 'Explain stale-while-revalidate and how React Query implements it.',
  level: 'I',
  a: `<p>Stale-while-revalidate means: serve cached data immediately, even if it may be old, and refresh it in the background so the next render has the newest data. The user never waits on a spinner for data you already have. React Query stores each result under a query key with an update timestamp. For <code>staleTime</code> after fetching the data is <i>fresh</i> and reads cost nothing. After that it is <i>stale</i>: a new observer mounting, a window refocus, a reconnect or an invalidation shows the cached value instantly and triggers a background refetch, then swaps in the new data. <code>gcTime</code> separately controls how long unused entries stay in memory (default 5 minutes). SWR (the library) is named after the same HTTP caching idea.</p>`,
  followUps: ['What is the default staleTime and why might you raise it?', 'How does this differ from the HTTP Cache-Control stale-while-revalidate directive?']
});
interview.push({
  q: 'After a user edits a product, how do you make sure every screen shows the updated data?',
  level: 'I',
  a: `<p>I think in terms of which cached facts the mutation made wrong. In React Query, in the mutation's <code>onSuccess</code> I write the server's returned object directly into the detail cache with <code>setQueryData</code> (no extra request), then call <code>invalidateQueries</code> for the product <i>lists</i> and any aggregates such as dashboard stats, because the server decides ordering, filters and counts. Query keys match by prefix, so a key factory such as <code>['products','list',...]</code> lets me invalidate all list variants at once without touching unrelated keys like the user profile. Returning the invalidation promise keeps the mutation pending until the refetch completes. I avoid a blanket invalidate-everything because it causes needless network traffic and flicker.</p>`,
  followUps: ['What happens to cached list pages that are not currently on screen?', 'When would you use removeQueries instead of invalidateQueries?']
});
interview.push({
  q: 'How would you implement an optimistic "like" button, and what can go wrong?',
  level: 'A',
  a: `<p>In <code>onMutate</code> I cancel in-flight queries for the post (so a late refetch cannot overwrite the optimistic value), snapshot the current cache entries, and write the expected result (liked true, count + 1) into every cache that shows the post: the detail and all feed variants. I return the snapshot as context. <code>onError</code> restores the snapshot and shows a message. <code>onSettled</code> always invalidates so the client converges on server truth. Pitfalls: mutating cached objects instead of copying; forgetting <code>cancelQueries</code>; overlapping mutations where one rollback erases another's change (fix by serializing, disabling the button, or modelling pending operations); non-idempotent endpoints that double-apply on retry (prefer <code>PUT liked=true</code> over a toggle); and using optimism for risky actions like payments.</p>`,
  followUps: ['How do you handle two quick taps (like then unlike)?', 'How does React 19 useOptimistic differ from this cache-based approach?']
});
interview.push({
  q: 'What is the difference between controlled and uncontrolled inputs, and why does React Hook Form use uncontrolled ones?',
  level: 'I',
  a: `<p>A controlled input stores its value in React state (<code>value</code> and <code>onChange</code>), so every keystroke updates state and re-renders the component, and React is the source of truth. An uncontrolled input lets the DOM hold the value; React reads it through a ref when needed (on submit or validation). React Hook Form registers inputs by ref and keeps values in an internal store, so typing does not re-render the form. It only re-renders for form-state pieces you subscribe to (like <code>errors</code>), using a Proxy to track what you read. For large forms this avoids hundreds of re-renders per second. The trade-off: computing live derived UI from values needs <code>watch</code>/<code>useWatch</code>, and controlled third-party components need the <code>Controller</code> wrapper.</p>`,
  followUps: ['What does the onTouched validation mode do?', 'How would you integrate a custom date-picker component?']
});
interview.push({
  q: 'How do you validate forms so client and server agree, and why is client-side validation not enough?',
  level: 'I',
  a: `<p>Client validation is for user experience: fast feedback and fewer wasted requests. It is not security because anyone can bypass the browser and send requests directly. The server must validate every request. To keep both sides consistent I describe the data once as a schema (Zod, Valibot, Yup), share it between frontend and backend (monorepo package or generated from OpenAPI), and plug it into the form library with a resolver. The server returns structured errors (field + message, usually HTTP 422) which the client maps onto fields with <code>setError</code>, preserving what the user typed. Remember that some rules, such as "username must be unique", can only be decided by the server and need async validation.</p>`,
  followUps: ['How do you handle a unique-username check without hammering the API?', 'What do you show for a server error that does not belong to any field?']
});
interview.push({
  q: 'A search box shows results for the wrong text sometimes. What is happening and how do you fix it?',
  level: 'A',
  a: `<p>It is a race condition. Each keystroke starts a request; responses can arrive out of order, so a slow request for "a" can finish after the request for "ann" and overwrite the newer results. Fixes, in layers: debounce input to reduce the number of requests; cancel the previous request with an <code>AbortController</code> (pass <code>signal</code> to <code>fetch</code>); and guard correctness with a request id or an "ignore" flag in the effect cleanup so only the latest response may update state. Better still, use React Query keyed by the search text: each text has its own cache entry and the component always renders the entry for the current key, so stale responses cannot override it. Also show the loading state tied to the current query.</p>`,
  followUps: ['Why is abort alone not a complete fix?', 'How does keepPreviousData change the UX while typing?']
});
interview.push({
  q: 'What does useSyncExternalStore do and why do Redux and Zustand use it?',
  level: 'E',
  a: `<p><code>useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)</code> is React's API for reading data that lives outside React. React calls <code>getSnapshot</code> during render and after commit to make sure it saw a consistent value, and re-renders when the snapshot changes (compared with <code>Object.is</code>). It prevents <b>tearing</b>: in concurrent rendering a render can be paused and resumed, and components rendered at different moments could otherwise read different versions of a mutable store. The snapshot must be cheap and return a stable reference when nothing changed, or React will loop. Libraries wrap it with a selector and an equality function so a component re-renders only when its slice changes. The third argument supplies the server snapshot for SSR and hydration.</p>`,
  followUps: ['Why does returning a new object from getSnapshot cause problems?', 'Why must a Zustand store be created per request in SSR?']
});
interview.push({
  q: 'How would you design the state architecture for a large e-commerce frontend?',
  level: 'E',
  a: `<p>I separate concerns. Product catalog, search results, orders and recommendations are <b>server state</b>: React Query (or RTK Query) with a key factory, per-resource <code>staleTime</code> (static catalog minutes, stock seconds), prefix invalidation after mutations, prefetching on hover for product pages, and SSR hydration. The <b>cart</b> is shared client state in a small Zustand or RTK slice, persisted and synced with the server after login, with derived totals as selectors. Filters, sort and page live in the <b>URL</b>. Checkout uses a form library with a schema shared with the backend and no optimistic payment. Theme and locale use Context. Local UI stays in components. I add devtools, tests for reducers/selectors, error boundaries, and monitor re-renders in the Profiler.</p>`,
  followUps: ['How do you reconcile a guest cart with a server cart at login?', 'Where do feature flags and A/B test assignments live?']
});
interview.push({
  q: 'Your React app is slow while typing in one input. How do you find and fix the cause?',
  level: 'A',
  a: `<p>First measure: React DevTools Profiler with "record why each component rendered", and the browser Performance panel. Common causes in state management: the input value lives in a high-level state or a big Context so the whole tree re-renders per keystroke; a store subscription without a selector; selectors that return new arrays or objects; or expensive derived data recomputed on each render. Fixes: move the state down to the input (colocation), split contexts or switch to a store with selectors, memoize derived data (<code>useMemo</code>, <code>createSelector</code>), debounce side effects (search requests) rather than the input itself, use <code>useDeferredValue</code> for expensive lists, and virtualize long lists. Consider React Compiler for automatic memoization, then re-measure to confirm the improvement.</p>`,
  followUps: ['When is useDeferredValue better than debouncing?', 'How can you prove a component re-rendered unnecessarily?']
});

registerModule({
  id: 'fe10',
  title: 'State Management & Data Fetching',
  intro: `<p>Almost every real React bug is a <b>state bug</b>: a list that does not update after an edit, a header that re-renders on every keystroke, a like button that lies when the server says no. This module gives you a clear mental model for <b>where data should live</b> (local, shared client, server, URL, form, derived), then goes deep on the main tools: Context and its re-render traps, <b>Redux Toolkit</b>, <b>Zustand</b>, <b>React Query / SWR</b> caching and invalidation, <b>optimistic updates</b> with rollback, and <b>form libraries</b>. Every topic has a step-by-step visualizer, runnable plain-JavaScript models of the real libraries (a Redux-style store, a mini query cache, an optimistic update with rollback), and interview-style practice.</p>`,
  goals: [
    'Classify any piece of state as local, shared client, server, URL, form or derived, and put it in the smallest correct home',
    'Explain why Context causes re-render storms and fix them by splitting contexts, memoizing values and separating state from dispatch',
    'Write Redux Toolkit slices and Zustand stores with narrow selectors, and build a minimal store with subscribe from scratch',
    'Use React Query/SWR correctly: query keys, staleTime vs gcTime, stale-while-revalidate, invalidation after mutations',
    'Implement optimistic updates with snapshot, rollback and re-sync, and explain the race conditions around them',
    'Build robust forms with a form library, schema validation, touched/dirty state and async validation'
  ],
  prereqs: `Module "React Hooks Deep Dive" (useState, useReducer, useContext, useEffect) and "React Fundamentals". Comfort with async/await and fetch (see "Browser APIs, Storage &amp; Networking").`,
  hours: 12,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
