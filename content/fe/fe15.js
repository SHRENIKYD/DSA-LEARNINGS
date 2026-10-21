(function () {
var topics = [], practice = [], quiz = [], interview = [];

// ---- small helpers shared by several visualizers (plain functions, no DOM) ----
function words(input, max, hint) {
  var t = String(input === undefined ? '' : input).trim().split(/[\s,]+/).filter(Boolean);
  if (!t.length) throw new Error(hint);
  if (t.length > max) throw new Error('Use at most ' + max + ' items. ' + hint);
  return t;
}
// FNV-1a 32-bit string hash: tiny, fast, same answer on every machine (deterministic).
function fnv1a(str) {
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
function bucketOf(flag, user) { return fnv1a(flag + ':' + user) % 100; }

/* ===================== TOPIC 1: Micro-frontends ===================== */
topics.push({
  title: 'Micro-Frontends: Splitting One Big App Into Team-Owned Pieces',
  analogy: `<p>Picture a <b>shopping mall</b>. The mall (the <b>shell</b>) owns the building, the parking lot, the signs and the escalators. Each shop inside (a <b>micro-frontend</b>) is run by its own company: its own staff, its own opening hours, its own cash register. A shoe shop can repaint its walls on Tuesday without asking the bookshop. If one shop has a power cut, the rest of the mall keeps trading. Customers still feel like they are in <i>one</i> place.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> A <b>micro-frontend</b> splits a big website into several <i>smaller websites</i> that are built, tested and deployed <b>independently</b>, then stitched together in the browser so the user sees one app. It is the same idea as microservices on the backend, but for the part the user touches.</p>
    <p>Take an e-commerce site. One giant React app means 60 developers share one repo, one build, one release train. A bug in the review widget can block a checkout fix. Micro-frontends cut it by <b>business area</b> (a "vertical slice": UI + logic + its API calls):</p>
    ${H.table(['Piece', 'Owns', 'Team', 'Deploys'], [
      ['<b>Shell</b> (host)', 'Header, footer, routing, login session, loading the other pieces', 'Platform', 'rarely, carefully'],
      ['<b>Catalog</b>', 'Home, search, product page', 'Discovery', 'many times a day'],
      ['<b>Cart</b>', 'Cart drawer, promo codes', 'Conversion', 'daily'],
      ['<b>Checkout</b>', 'Address, payment, order confirmation', 'Payments', 'weekly, extra tests'],
      ['<b>Account</b>', 'Orders list, profile, returns', 'Retention', 'daily']
    ])}
    <p><b>🔵 How do the pieces get glued together?</b> There are four common ways, from simplest to most powerful:</p>
    <ul>
      <li><b>Links between separate apps</b> (each route is a full page load). Simple, strong isolation, but every move reloads the page.</li>
      <li><b>iframes</b>. Perfect isolation, but awkward for sizing, focus, accessibility, shared login and deep links.</li>
      <li><b>Build-time packages</b> (each team publishes an npm package, the shell installs them). Easy, but to ship one team's change you must <i>rebuild and redeploy the shell</i> — that is not independent.</li>
      <li><b>Run-time composition</b> (the shell downloads each piece <i>when needed</i> from a URL, e.g. <b>Module Federation</b>, web components, import maps). This is the modern default for "independent deploys".</li>
    </ul>
    <p>The shell is a tiny <b>router + loader</b>: look at the URL, decide which remote owns it, download that remote's entry file once, mount it into a box on the page, and show a <b>fallback</b> if the download fails.</p>
    ${H.kv([['Shell', 'owns the frame + routing'], ['Remote', 'a separately deployed slice'], ['Contract', 'props, events, URLs between them'], ['Fallback', 'what to show when a remote is down']], { label: 'Four words to remember' })}
    <p><b>🟣 When NOT to do this.</b> Micro-frontends solve an <i>organisation</i> problem (many teams stepping on each other), not a technical one. With one team of 8 people a good modular monolith (or a monorepo with clear folders) is faster, lighter and easier to debug. Each extra remote costs you network requests, duplicated libraries, and harder end-to-end testing.</p>`,
  clues: [
    '"Many teams must <b>deploy independently</b> without a shared release train"',
    '"Each team owns a vertical slice (catalog, cart, checkout)" → micro-frontends, not a component library',
    '"Migrate a legacy app <b>gradually</b>" → strangler-fig: new routes in a new remote, old ones stay',
    '"One slow build blocks everyone" / "merge conflicts in the same repo" → split by domain',
    '"What happens if the checkout bundle fails to load?" → fallback UI + error boundary + retry',
    '"Mixed frameworks (React and Vue) on one page" → web components / iframes / runtime composition'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Shell router model: route → remote, lazy load once, fallback if the remote is down',
      code: `// A tiny model of what a micro-frontend shell does. No real network: we fake it.
const routes = [
  { prefix: '/checkout', remote: 'checkout' },
  { prefix: '/product',  remote: 'catalog'  },
  { prefix: '/cart',     remote: 'cart'     },
  { prefix: '/',         remote: 'catalog', exact: true }   // home page only
];

// Longest/first match wins; "/product/42" belongs to "/product".
function matchRoute(path) {
  return routes.find(r => r.exact
    ? path === r.prefix
    : path === r.prefix || path.startsWith(r.prefix + '/')) || null;
}

const down = new Set(['cart']);   // pretend the cart team's CDN is broken today
const loaded = new Map();         // remote name -> module (the "already downloaded" cache)

function loadRemote(name) {
  if (loaded.has(name)) return { from: 'cache', mod: loaded.get(name) };
  if (down.has(name)) throw new Error(name + ' remoteEntry.js failed to load');
  const mod = { name: name, mount: () => 'mounted ' + name };
  loaded.set(name, mod);                      // download once, reuse forever
  return { from: 'network', mod: mod };
}

function navigate(path) {
  const r = matchRoute(path);
  if (!r) return path + ' -> shell shows its own 404 page';
  try {
    const res = loadRemote(r.remote);
    return path + ' -> ' + res.mod.mount() + ' (from ' + res.from + ')';
  } catch (err) {
    // The rest of the site must keep working. Show a friendly box, not a white screen.
    return path + ' -> FALLBACK UI: "' + r.remote + ' is unavailable, try again"';
  }
}

['/', '/product/42', '/cart', '/product/7', '/nope'].forEach(p => console.log(navigate(p)));`
    },
    {
      lang: 'js', check: false, title: 'Mounting a remote with an error boundary (React, host side)',
      code: `import React, { Suspense, lazy } from 'react';

// "cart/CartDrawer" is NOT in this repo. It is downloaded from the cart team's URL at run time.
const CartDrawer = lazy(() => import('cart/CartDrawer'));

class RemoteBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    // If the remote crashes OR its file fails to download, only this box breaks.
    if (this.state.failed) return <button onClick={() => this.setState({ failed: false })}>Cart unavailable - retry</button>;
    return this.props.children;
  }
}

export function Header() {
  return (
    <header>
      <Logo />
      <RemoteBoundary>
        <Suspense fallback={<span>Loading cart...</span>}>
          <CartDrawer userId={window.__SESSION__.userId} />
        </Suspense>
      </RemoteBoundary>
    </header>
  );
}`
    }
  ],
  codeTitle: ['Runnable model of a shell', 'Host-side mounting with an error boundary'],
  viz: {
    title: 'E-commerce shell loading remotes on demand',
    input: '/ /product/42 /cart /cart! /checkout /oops',
    inputLabel: 'Routes (space separated). Add ! to a route to pretend that remote is DOWN',
    gen: function (input) {
      var toks = words(input, 8, 'Example: / /cart /checkout (add ! to simulate a failing remote)');
      var table = [['/checkout', 'CHK', 'checkout'], ['/product', 'CAT', 'catalog'], ['/cart', 'CART', 'cart'], ['/account', 'ACC', 'account'], ['/', 'CAT', 'catalog']];
      function match(p) {
        for (var i = 0; i < table.length; i++) {
          var r = table[i];
          if (r[0] === '/' ? p === '/' : (p === r[0] || p.indexOf(r[0] + '/') === 0)) return r;
        }
        return null;
      }
      var nodes = [
        { id: 'B', label: 'Browser', x: 9, y: 31, shape: 'box' },
        { id: 'SH', label: 'Shell (host)', x: 33, y: 31, shape: 'box', w: 16 },
        { id: 'CAT', label: 'Catalog', x: 72, y: 6, shape: 'box' },
        { id: 'CART', label: 'Cart', x: 72, y: 21, shape: 'box' },
        { id: 'CHK', label: 'Checkout', x: 72, y: 36, shape: 'box' },
        { id: 'ACC', label: 'Account', x: 72, y: 51, shape: 'box' }
      ];
      var edges = [['B', 'SH', 'URL'], ['SH', 'CAT', '/ /product'], ['SH', 'CART', '/cart'], ['SH', 'CHK', '/checkout'], ['SH', 'ACC', '/account']];
      var loaded = [];
      function g(hl, ehl, tags) { return { type: 'graph', label: 'Shell + remotes', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
      var frames = [{ narr: 'The <b>shell</b> is the only thing the browser downloads first. It knows the route table but has <b>not</b> downloaded any remote yet.', parts: [g({ SH: 'cur' }), { type: 'set', label: 'Remotes already downloaded', items: [] }] }];
      toks.forEach(function (tok) {
        var down = /!$/.test(tok), path = tok.replace(/!$/, '');
        var r = match(path);
        if (!r) {
          frames.push({ narr: '<code>' + H.esc(path) + '</code> matches no route. The shell shows <b>its own</b> 404 page. No remote is touched.', parts: [g({ SH: 'bad' }, {}, { SH: '404' }), { type: 'set', label: 'Remotes already downloaded', items: loaded.slice() }] });
          return;
        }
        var key = 'SH-' + r[1];
        frames.push({ narr: 'Route <code>' + H.esc(path) + '</code> → the shell\'s table says the <b>' + r[2] + '</b> remote owns it.', parts: [g({ SH: 'cur', B: 'win' }, (function () { var o = {}; o[key] = 'cur'; return o; })()), { type: 'set', label: 'Remotes already downloaded', items: loaded.slice() }] });
        var have = loaded.indexOf(r[2]) >= 0, hl = {}, eh = {}, tg = {};
        eh[key] = have || !down ? 'ok' : 'bad';
        if (have) {
          hl[r[1]] = 'ok'; tg[r[1]] = 'cached';
          frames.push({ narr: 'Already downloaded earlier → <b>reuse it</b>, no network. Navigation feels instant.', parts: [g(hl, eh, tg), { type: 'set', label: 'Remotes already downloaded', items: loaded.slice(), hl: (function () { var o = {}; o[r[2]] = 'ok'; return o; })() }] });
        } else if (down) {
          hl[r[1]] = 'bad'; tg[r[1]] = 'DOWN';
          frames.push({ narr: 'The shell tried to fetch <b>' + r[2] + '</b>\'s entry file and it <span class="c-r">failed</span>. The shell shows a fallback box ("try again") and the <b>rest of the site keeps working</b>. That is the isolation we paid for.', parts: [g(hl, eh, tg), { type: 'set', label: 'Remotes already downloaded', items: loaded.slice() }] });
        } else {
          loaded.push(r[2]); hl[r[1]] = 'ok'; tg[r[1]] = 'loaded';
          frames.push({ narr: 'First visit: download <b>' + r[2] + '</b>\'s entry file from its own URL, then mount it. Next time this is free.', parts: [g(hl, eh, tg), { type: 'set', label: 'Remotes already downloaded', items: loaded.slice(), hl: (function () { var o = {}; o[r[2]] = 'ok'; return o; })() }] });
        }
      });
      frames.push({ narr: 'Done. Each remote can be redeployed alone: the shell always asks for the <i>latest</i> entry file at run time.', parts: [g({}), { type: 'set', label: 'Remotes downloaded this session', items: loaded.slice() }] });
      return frames;
    }
  },
  examples: [
    {
      title: 'Splitting an e-commerce app: where do the lines go?',
      html: `<p>Start from <b>user journeys</b>, not from components. Ask "which team gets paged when this breaks?"</p>
        ${H.table(['Journey', 'Remote', 'Talks to'], [['Browse and search', 'catalog', 'Search API, product API'], ['Add to cart, promo', 'cart', 'Cart API'], ['Pay', 'checkout', 'Payment API (PCI scope!)'], ['See orders', 'account', 'Orders API']])}
        <p>Header and footer stay in the <b>shell</b>. The cart <i>drawer</i> is shown on every page but is owned by the cart team, so it is a small <b>widget remote</b> loaded by the header. Rule of thumb: one remote per <i>business capability</i>, never one per button.</p>`
    },
    {
      title: 'Talking between remotes without tight coupling',
      html: `<p>Catalog needs to say "an item was added" and the cart badge must update. Do <b>not</b> import one remote from another. Use a thin, versioned contract: a custom event on <code>window</code> (or a tiny shared event bus).</p>
        <p>Rules: events are named like APIs (<code>cart:item-added</code>), payloads are plain JSON, and the sender never waits for an answer. Shared <i>data</i> (user, session) comes from the shell as props.</p>`,
      code: { lang: 'js', run: true, title: 'A minimal event contract', code: `// No DOM needed: a tiny event bus with the same idea as window.dispatchEvent.
const handlers = {};
const bus = {
  on(name, fn) { (handlers[name] = handlers[name] || []).push(fn); },
  emit(name, detail) { (handlers[name] || []).forEach(fn => fn(detail)); }
};

// cart remote listens. It knows only the event NAME and payload shape, not who sends it.
let cartCount = 0;
bus.on('cart:item-added', e => { cartCount += e.qty; console.log('cart badge ->', cartCount); });

// catalog remote emits. It never imports cart code.
bus.emit('cart:item-added', { sku: 'SHOE-9', qty: 1 });
bus.emit('cart:item-added', { sku: 'SOCK-2', qty: 2 });` }
    },
    {
      title: 'Migrating a legacy app with the strangler-fig pattern',
      html: `<p>You have a 7-year-old Angular monolith. Rewriting it takes 2 years and the business will not wait. Instead: put a new <b>shell</b> in front. Route <code>/cart</code> to a new React remote; <i>every other route</i> still goes to the old app (inside the shell, or by proxy). Next quarter move <code>/account</code>. The old app slowly shrinks like a tree being wrapped by a strangler fig, until you can delete it.</p>
        <p>Win: value ships from week 2. Cost: for a while users run <b>two frameworks</b>, so keep the shared surface (login, header, theme) tiny.</p>`
    }
  ],
  deepDive: `<p><b>Composition strategies and their trade-offs.</b> <i>Server-side composition</i> (edge includes, SSI, Tailor-style templates) merges HTML fragments before the browser sees them: great for SEO and first paint, but needs infra. <i>Client-side run-time composition</i> (Module Federation, import maps, <code>single-spa</code>) keeps the server simple but adds waterfalls: shell loads, then remote entry, then remote chunks. Fix with <b>preloading</b> (<code>&lt;link rel="modulepreload"&gt;</code> for the likely-next remote) and by making the shell tiny.</p>
    <p><b>Global state is the trap.</b> Shared CSS, shared globals and shared singletons cause the "works alone, breaks together" bugs. Defences: CSS Modules / scoped names or Shadow DOM, a naming prefix per team, no mutation of <code>window</code>, a small shared contract package with <b>types only</b>.</p>
    <p><b>Versioning the contract.</b> Remote A deploys today, host B was built last week. Therefore every boundary is a public API: additive changes only, deprecate before removing, and run <b>contract tests</b> (host mounts the latest remote in CI) so a remote cannot break the shell. Many teams add a <b>manifest</b> (<code>{ cart: "https://cdn/cart/3.2.1/remoteEntry.js" }</code>) that the shell fetches at start, so rollback = change one line, no shell rebuild.</p>
    <p><b>Performance reality.</b> Each remote can duplicate React, router, date libraries. Without sharing, bundle size explodes (next topic). Also measure Core Web Vitals per remote: the remote that regresses LCP should be visible on a dashboard owned by its team. Finally, observability: tag every error/log with the remote name and version, otherwise "the page broke" has no owner.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants can scaffold a remote in minutes (build config, a shell route, an error boundary), which makes the <i>cost of splitting</i> look low. The real costs are still human: team boundaries, contracts, on-call. A very common AI failure is to recommend micro-frontends for a 5-person startup because "it scales".</p>
    <p><b>Use AI as a partner:</b> paste your route list and team structure and ask <code>Propose 3 ways to cut this into remotes and list the coupling each cut creates. Do not pick one.</code> Ask it to write contract tests: <code>Given this event schema, generate tests that fail if a remote renames a field.</code></p>
    <p><b>Where AI goes wrong:</b> it happily invents a cross-remote import (<code>import { useCart } from 'cart/hooks'</code>) that quietly re-couples your deploys, or it forgets the fallback UI. <b>What you must still own:</b> deciding the boundaries by team ownership, the failure behaviour, and explaining in an interview why you would <i>not</i> split yet.</p>`,
  problems: [{
    title: 'Route-to-Remote Resolver With Fallback',
    level: 'Easy', tags: ['micro-frontends', 'routing', 'fallback'], companies: ['Amazon', 'Zalando', 'IKEA'],
    statement: `<p>Write <code>resolve(path, routes, status)</code>. <code>routes</code> is an array of <code>{ prefix, remote, exact? }</code>. <code>status</code> maps each remote name to <code>'up'</code> or <code>'down'</code>. Return an object <code>{ remote, view }</code>:</p>
      <ul><li>The first route that matches wins. A prefix route matches the exact path or any path starting with <code>prefix + '/'</code>; an <code>exact</code> route matches only the identical path.</li>
      <li>If a route matches and its remote is <code>'up'</code> → <code>view: 'remote'</code>.</li>
      <li>If it matches but the remote is <code>'down'</code> → <code>view: 'fallback'</code>.</li>
      <li>If nothing matches → <code>{ remote: null, view: 'not-found' }</code>.</li></ul>`,
    constraints: `0 ≤ routes ≤ 50. Paths start with "/". Remote names are lowercase strings.`,
    example: `<p>routes: <code>/cart → cart</code>, <code>/ (exact) → catalog</code>; status: <code>cart: down</code></p>
      ${H.table(['path', 'result'], [['/', '<span class="c-g">catalog / remote</span>'], ['/cart/promo', '<span class="c-y">cart / fallback</span> (cart is down)'], ['/cartoon', '<span class="c-r">null / not-found</span> (not "/cart/..." — a prefix needs the slash)']])}`,
    brute: {
      why: `<p>A common first attempt uses <code>path.startsWith(prefix)</code>. That wrongly sends <code>/cartoon</code> to the cart remote, and the exact "/" route would swallow every path. The wasted work is not speed, it is <b>wrong ownership</b>: a user lands in the wrong team's code.</p>`,
      code: `function resolveBrute(path, routes, status) {
  for (const r of routes) {
    if (path.startsWith(r.prefix)) {            // BUG: "/cartoon" matches "/cart"; "/" matches everything
      return { remote: r.remote, view: status[r.remote] === 'up' ? 'remote' : 'fallback' };
    }
  }
  return { remote: null, view: 'not-found' };
}`
    },
    mcq: { q: 'Why must a prefix route check <code>prefix + "/"</code> and not just <code>startsWith(prefix)</code>?', options: ['So "/cartoon" is not claimed by the "/cart" remote', 'Because slashes make the check faster', 'Because browsers require a trailing slash'], answer: 0, explain: 'A prefix is a path-segment boundary. Without the slash, unrelated paths that merely begin with the same letters are routed to the wrong team.' },
    hints: [
      `<p>Hint 1: matching is about <b>whole path segments</b>, not characters. "/cart" owns "/cart" and "/cart/anything" only.</p>`,
      `<p>Hint 2: loop over routes in order and return at the first match. Then look at <code>status[remote]</code> to choose "remote" or "fallback".</p>`,
      `<p>Hint 3: edge cases: exact routes, unknown remote in <code>status</code> (treat anything not 'up' as down), empty route list. Recipe: find route → if none, not-found → else view by status.</p>`
    ],
    solution: {
      approach: `<p>One pass over the route list with a small <code>matches</code> helper that respects segment boundaries and the <code>exact</code> flag. The fallback decision is a single lookup. Treating "not 'up'" as down means an unknown remote fails safe.</p>`,
      code: { lang: 'js', run: true, code: `function matches(path, r) {
  if (r.exact) return path === r.prefix;
  return path === r.prefix || path.startsWith(r.prefix + '/');
}

function resolve(path, routes, status) {
  const r = routes.find(rt => matches(path, rt));
  if (!r) return { remote: null, view: 'not-found' };
  return { remote: r.remote, view: status[r.remote] === 'up' ? 'remote' : 'fallback' };
}

const routes = [{ prefix: '/cart', remote: 'cart' }, { prefix: '/', remote: 'catalog', exact: true }];
const status = { cart: 'down', catalog: 'up' };
['/', '/cart/promo', '/cartoon'].forEach(p => console.log(p, JSON.stringify(resolve(p, routes, status))));` },
      dry: { head: ['path', 'route tested', 'match?', 'result'], rows: [['/', '/cart', 'no', '-'], ['/', '/ (exact)', 'yes', 'catalog, remote'], ['/cart/promo', '/cart', 'yes (starts with /cart/)', 'cart, fallback'], ['/cartoon', 'both', 'no / no', 'not-found']] },
      complexity: `<p>Time O(R) per navigation for R routes (R is small; a trie or Map makes it O(path segments) if needed). Space O(1).</p>`,
      followUps: ['How would you add route params like /product/:id?', 'What if two remotes claim the same prefix? Detect it at build time.', 'How do you show a *retry* button without a full reload?']
    }
  }]
});

/* ===================== TOPIC 2: Module Federation ===================== */
topics.push({
  title: 'Module Federation & Sharing React as a Singleton',
  analogy: `<p>Imagine five food stalls in a market sharing <b>one gas supply line</b> instead of each hauling their own heavy gas bottle. It saves space and money. But if one stall needs a special high-pressure connector and the line only offers a low-pressure one, somebody has a problem. <b>Module Federation</b> is that shared line for JavaScript: apps lend each other code at run time, and <b>"singleton"</b> means "only <i>one</i> copy of this library may exist on the page" — like only one gas line in the whole market.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> <b>Module Federation</b> (a webpack 5 feature, also available for Vite/Rspack via plugins) lets one built app <i>import code from another separately built, separately deployed app</i> while the page is running. The host writes <code>import('cart/CartDrawer')</code>; the browser downloads that file from the cart team's server right then.</p>
    <p>Three words you must know:</p>
    <ul>
      <li><b>Host</b> (the shell): the app that consumes other apps' code.</li>
      <li><b>Remote</b>: an app that <b>exposes</b> some modules (e.g. <code>./CartDrawer</code>) through a small entry file, usually <code>remoteEntry.js</code>.</li>
      <li><b>Shared</b>: libraries both sides want to load only <i>once</i> (React, React DOM, router, design system).</li>
    </ul>
    <p><b>🔵 Why "shared" matters.</b> If shell, cart, catalog and checkout each bundle their own React (about 45 KB gzipped, roughly 140 KB minified, for React + ReactDOM), users download it four times. Worse, <b>React breaks with two copies</b>: hooks refuse to work ("Invalid hook call") because the component was created by copy A but rendered by copy B. So React must be a <b>singleton</b>.</p>
    <p>How the negotiation works at run time (simplified): each app, when it starts, <b>registers</b> the libraries it has (name + version) into a global <b>shared scope</b>. When anyone asks for <code>react</code> they get the <b>highest registered version that satisfies their <code>requiredVersion</code></b>. With <code>singleton: true</code> the system picks <i>one</i> version for everybody; if some app asked for a range that version does not satisfy, you get a console <b>warning</b> — or a hard <b>error</b> if <code>strictVersion: true</code>.</p>
    ${H.table(['Option', 'Plain meaning', 'Typical value for React'], [
      ['<code>singleton</code>', 'Only one copy on the page', '<span class="c-g">true</span>'],
      ['<code>requiredVersion</code>', 'The range I am happy with', '<code>"^18.2.0"</code>'],
      ['<code>strictVersion</code>', 'Throw if the chosen version does not fit my range', 'false (warn) in prod; true in CI'],
      ['<code>eager</code>', 'Bundle it into the first chunk instead of loading async', 'false (avoids the "shared module is not available for eager consumption" error)'],
      ['<code>import: false</code>', 'Never bundle my own fallback copy; only use the shared one', 'for strict platform-owned libs']
    ])}
    <p><b>🟣 Remember the bootstrap trick.</b> Because shared libraries are negotiated asynchronously, your app's real entry file must be a dynamic import: <code>index.js</code> contains only <code>import('./bootstrap')</code>. Otherwise React is needed before the shared scope is ready, and you get the famous <i>"Shared module is not available for eager consumption"</i> error.</p>`,
  clues: [
    '"Share <b>React as a singleton</b> across remotes" → <code>shared: { react: { singleton: true } }</code>',
    '"Invalid hook call" / "two copies of React" after adding a remote → versions not shared as singleton',
    '"Deploy a remote <b>without rebuilding the host</b>" → Module Federation / run-time composition, not npm packages',
    '"Remote and host use different React minor versions" → semver ranges + shared scope negotiation',
    '"Shared module is not available for eager consumption" → missing async bootstrap',
    '"Remote entry URL changes per environment/version" → dynamic remotes + manifest'
  ],
  code: [
    {
      lang: 'js', title: 'webpack config: the shell (host) and the cart (remote)',
      code: `// ---- shell/webpack.config.js (the HOST) ----
const { ModuleFederationPlugin } = require('webpack').container;
const deps = require('./package.json').dependencies;

module.exports = {
  // ...entry, output, loaders omitted (they are the same as any webpack app)
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        // "cart" is the alias used in import('cart/...'); left side = global name, right = URL
        cart: 'cart@https://cdn.shop.com/cart/latest/remoteEntry.js'
      },
      shared: {
        react:       { singleton: true, requiredVersion: deps.react },
        'react-dom': { singleton: true, requiredVersion: deps['react-dom'] }
      }
    })
  ]
};

// ---- cart/webpack.config.js (a REMOTE) ----
// plugins: [ new ModuleFederationPlugin({
//   name: 'cart',
//   filename: 'remoteEntry.js',
//   exposes: { './CartDrawer': './src/CartDrawer' },   // what other apps may import
//   shared: { react: { singleton: true, requiredVersion: '^18.2.0' },
//             'react-dom': { singleton: true, requiredVersion: '^18.2.0' } }
// }) ]`
    },
    {
      lang: 'js', run: true, title: 'Runnable model: shared-scope negotiation with a singleton',
      code: `// Parse "18.3.1" -> [18, 3, 1]
const parse = v => v.split('.').map(Number);

// Compare two versions: >0 if a is newer.
function cmp(a, b) {
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

// Does version satisfy a caret range like "^18.2.0"? (same major, and >= the floor)
function satisfies(version, range) {
  if (!range.startsWith('^')) return version === range;       // exact pin
  const floor = range.slice(1);
  return parse(version)[0] === parse(floor)[0] && cmp(version, floor) >= 0;
}

// providers: who registered a copy of the library. consumers: who asked for a range.
function negotiate(providers, consumers, strict) {
  // Singleton rule: pick the HIGHEST registered version for everybody.
  const chosen = providers.map(p => p.version).sort(cmp).pop();
  const report = consumers.map(c => {
    const ok = satisfies(chosen, c.range);
    return { app: c.app, range: c.range, gets: chosen, ok: ok,
             note: ok ? 'fine' : (strict ? 'ERROR: app refuses to start' : 'WARNING: running out of range') };
  });
  return { chosen: chosen, report: report };
}

const providers = [
  { app: 'shell', version: '18.3.1' }, { app: 'cart', version: '18.2.0' },
  { app: 'catalog', version: '17.0.2' }, { app: 'checkout', version: '18.3.1' }
];
const consumers = providers.map(p => ({ app: p.app, range: p.app === 'catalog' ? '^17.0.0' : '^18.2.0' }));

const out = negotiate(providers, consumers, false);
console.log('Everyone shares react@' + out.chosen);
out.report.forEach(r => console.log(r.app.padEnd(9), r.range.padEnd(9), r.ok ? 'OK   ' : 'FAIL ', r.note));`
    },
    {
      lang: 'js', check: false, title: 'Bootstrap pattern + dynamic remote (React)',
      code: `// index.js  (the REAL entry): must be async so the shared scope can be set up first
import('./bootstrap');

// bootstrap.js  (your normal entry)
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
createRoot(document.getElementById('root')).render(<App />);

// Dynamic remote: the URL comes from a manifest at run time, so rollbacks need no rebuild.
async function loadRemote(scope, url, module) {
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url; s.onload = resolve; s.onerror = reject;   // downloads remoteEntry.js
    document.head.appendChild(s);
  });
  await __webpack_init_sharing__('default');               // register OUR shared libs
  const container = window[scope];
  await container.init(__webpack_share_scopes__.default);  // hand the scope to the remote
  const factory = await container.get(module);             // e.g. './CartDrawer'
  return factory();
}`
    }
  ],
  codeTitle: ['Host and remote webpack config', 'Runnable negotiation model', 'Async bootstrap and dynamic remotes'],
  viz: {
    title: 'Shared dependency negotiation (react singleton)',
    input: '^18.2.0 shell=18.3.1 cart=18.2.0 catalog=17.0.2 checkout=18.3.1',
    inputLabel: 'First the required range (e.g. ^18.2.0), then app=version pairs. Add "strict" to throw on mismatch',
    gen: function (input) {
      var t = words(input, 9, 'Example: ^18.2.0 shell=18.3.1 cart=18.2.0 catalog=17.0.2');
      var range = t[0], strict = false, apps = [];
      if (!/^[\^]?\d+\.\d+\.\d+$/.test(range)) throw new Error('Start with a range like ^18.2.0');
      t.slice(1).forEach(function (x) {
        if (x === 'strict') { strict = true; return; }
        var m = /^([a-zA-Z0-9_-]+)=(\d+\.\d+\.\d+)$/.exec(x);
        if (!m) throw new Error('Use app=version, like cart=18.2.0');
        apps.push([m[1], m[2]]);
      });
      if (apps.length < 1) throw new Error('Add at least one app=version pair');
      function parse(v) { return v.split('.').map(Number); }
      function cmp(a, b) { var x = parse(a), y = parse(b); for (var i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; }
      function sat(v, r) { if (r.charAt(0) !== '^') return v === r; var f = r.slice(1); return parse(v)[0] === parse(f)[0] && cmp(v, f) >= 0; }
      var cols = ['app', 'provides react', 'requires', 'result'];
      var rows = apps.map(function (a) { return [a[0], '-', range, '...']; });
      var frames = [{ narr: 'Every app declares what it <b>provides</b> and what range it <b>requires</b>. Nothing is registered yet; the shared scope is empty.', parts: [{ type: 'table', label: 'Apps', columns: cols, rows: rows.map(function (r) { return r.slice(); }) }, { type: 'set', label: 'Shared scope: react versions', items: [] }] }];
      var scope = [];
      apps.forEach(function (a, i) {
        rows[i][1] = a[1];
        if (scope.indexOf(a[1]) < 0) scope.push(a[1]);
        var hl = {}; hl[i] = 'cur'; var sh = {}; sh[a[1]] = 'ok';
        frames.push({ narr: '<b>' + a[0] + '</b> starts and registers its copy <code>react@' + a[1] + '</code> into the shared scope.', parts: [{ type: 'table', label: 'Apps', columns: cols, rows: rows.map(function (r) { return r.slice(); }), hl: hl }, { type: 'set', label: 'Shared scope: react versions', items: scope.slice(), hl: sh }] });
      });
      var chosen = scope.slice().sort(cmp).pop();
      var sh2 = {}; sh2[chosen] = 'sel';
      frames.push({ narr: 'Singleton rule: everyone must use <b>one</b> copy, so the system picks the <b>highest</b> registered version: <code>react@' + chosen + '</code>.', parts: [{ type: 'table', label: 'Apps', columns: cols, rows: rows.map(function (r) { return r.slice(); }) }, { type: 'set', label: 'Shared scope: react versions', items: scope.slice(), hl: sh2 }, { type: 'vars', vals: { chosen: chosen, singleton: 'true', strictVersion: strict } }] });
      var bad = 0, hlr = {};
      apps.forEach(function (a, i) {
        var ok = sat(chosen, range);
        rows[i][3] = ok ? '<span class="c-g">gets ' + chosen + ' OK</span>' : (strict ? '<span class="c-r">ERROR: ' + chosen + ' outside ' + range + '</span>' : '<span class="c-y">WARN: ' + chosen + ' outside ' + range + '</span>');
        hlr[i] = ok ? 'ok' : 'bad'; if (!ok) bad++;
        frames.push({ narr: 'Check <b>' + a[0] + '</b>: it requires <code>' + range + '</code> and receives <code>' + chosen + '</code> → ' + (ok ? '<span class="c-g">fits</span>.' : (strict ? '<span class="c-r">does not fit and strictVersion is on, so this app refuses to start.</span>' : '<span class="c-y">does not fit; with strictVersion off we only log a warning and hope it works.</span>')), parts: [{ type: 'table', label: 'Apps', columns: cols, rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[i] = ok ? 'ok' : 'bad'; return o; })() }, { type: 'vars', vals: { chosen: chosen, mismatches: bad } }] });
      });
      frames.push({ narr: bad ? 'Result: <b>one</b> React on the page (no "Invalid hook call"), but ' + bad + ' app(s) are outside their declared range. Fix by upgrading those teams or widening ranges.' : 'Result: one React copy, every app satisfied. Bundle cost paid once.', parts: [{ type: 'table', label: 'Final negotiation', columns: cols, rows: rows, hl: hlr }] });
      return frames;
    }
  },
  examples: [
    {
      title: 'Why two copies of React crash hooks',
      html: `<p>React keeps a hidden "current dispatcher" variable <i>inside its own module</i>. Copy A (in the shell) sets it while rendering. A component from the cart remote calls <code>useState</code> from copy B, whose variable is still empty. React throws <code>Invalid hook call</code>. Sharing as a singleton makes both sides talk to the <b>same</b> variable.</p>
        <p>The same is true for React Context: a provider created with copy A is invisible to consumers using copy B, so "theme" or "router" context silently returns the default. Libraries with global state (router, React Query, i18n, design system) should be singletons too.</p>`
    },
    {
      title: 'Reading the shared-scope warning',
      html: `<p>Console message: <code>Unsatisfied version 17.0.2 of shared singleton module react (required ^18.2.0)</code>. Translation: "the page has one React, it is 17.0.2, and some app asked for 18.2+". Who is wrong? Usually the <i>team that lags</i>. Action: upgrade that remote, or temporarily widen its range and track a deadline. Never "fix" it by removing <code>singleton</code>: that trades a warning for a crash.</p>`
    },
    {
      title: 'Share what is heavy and global; keep the rest private',
      html: `<p>Do not share everything. Each shared package adds negotiation work and coupling. A practical split:</p>
        ${H.table(['Share (singleton)', 'Share (version-flexible)', 'Do NOT share'], [['react, react-dom, router, design-system, i18n runtime', 'date-fns, lodash-es (many small versions are OK)', 'feature code, tiny helpers, one-off libs']])}
        <p>Rule: if two copies would cause a <i>bug</i>, make it a singleton. If two copies only cost <i>kilobytes</i>, think twice before coupling teams over it.</p>`
    }
  ],
  deepDive: `<p><b>What actually happens at run time.</b> The host's bundle is built with a tiny runtime. When the page starts, <code>__webpack_init_sharing__('default')</code> creates the <b>share scope</b>: a map <code>{ react: { '18.3.1': { get, from: 'shell', loaded } } }</code>. Each remote's <code>container.init(scope)</code> adds its own versions. A later <code>import('react')</code> in any app walks the map, filters versions by the consumer's <code>requiredVersion</code>, and picks the highest (singletons: highest overall, and a mismatch is a warning or an error). "First to load wins the init race" explains why the <i>order</i> of remote loading can change which copy is selected when versions are equal but identities differ.</p>
    <p><b>Version drift is the real long-term cost.</b> Pin the platform: a shared <code>platform-deps</code> package with allowed ranges, a CI job that fails when a remote asks for a major the shell does not provide, and a deprecation calendar for upgrades (React 18 → 19 needs every team in a window, or the shell must temporarily provide both through a compatibility layer). Some companies run a second copy in a separate subtree (iframes or Shadow DOM islands) during migration — an escape hatch, not a goal.</p>
    <p><b>Edge cases.</b> (1) <code>eager: true</code> removes async loading but forces the library into the entry chunk and breaks negotiation. (2) CSS-in-JS libraries with their own singleton caches may inject styles twice if not shared. (3) Module Federation 2.0 adds a manifest (<code>mf-manifest.json</code>), type hints for remotes, runtime plugins (retry, fallback, version pre-check) and works across bundlers. (4) Security: a remote is <b>arbitrary code running with your page's privileges</b>, so serve remote entries only from origins you control, use Subresource Integrity or signed manifests where possible, and restrict <code>script-src</code> in CSP.</p>
    <p><b>Alternatives.</b> Import maps (<code>&lt;script type="importmap"&gt;</code>) give native ES-module sharing with no bundler plugin: map <code>"react"</code> to one URL and every module on the page uses it. Trade-off: less tooling, but you manage versions by hand.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants know the standard <code>ModuleFederationPlugin</code> snippet well, so boilerplate is cheap. They are weaker at <i>your</i> specific failure: version drift across ten teams, an eager import hidden in a utility file, a duplicated copy caused by a nested <code>node_modules</code>.</p>
    <p><b>Use AI as a partner:</b> paste the console warning and your lock file lines for react and ask <code>Which packages bring in a second copy of react and why?</code> Use it to write a CI script that scans every remote's package.json for ranges the shell cannot satisfy.</p>
    <p><b>Where AI goes wrong:</b> it may set <code>singleton: false</code> to silence a warning, mix up the host/remote config keys (<code>remotes</code> vs <code>exposes</code>), or suggest <code>eager: true</code> as a quick fix for the eager-consumption error, which hides the real problem (a missing async bootstrap). <b>What you must still own:</b> deciding which libraries are singletons, the upgrade policy, and the security review of every remote origin.</p>`,
  problems: [{
    title: 'Pick the Singleton Version',
    level: 'Medium', tags: ['module federation', 'semver', 'shared scope'], companies: ['ByteDance', 'Zalando', 'Spotify'],
    statement: `<p>Write <code>negotiate(providers, consumers)</code>. <code>providers</code> is an array of <code>{ app, version }</code> (each app registered one copy of React, versions look like "18.3.1"). <code>consumers</code> is an array of <code>{ app, range }</code> where range is either an exact version or a caret range like "^18.2.0" (same major, version at least the floor).</p>
      <p>Return <code>{ chosen, warnings }</code>: <code>chosen</code> is the highest provided version (singleton rule) and <code>warnings</code> lists the <code>app</code> names (in consumer order) whose range does <b>not</b> accept <code>chosen</code>.</p>`,
    constraints: `1 ≤ providers ≤ 20. Versions are "major.minor.patch" with non-negative integers (compare numerically, not as strings).`,
    example: `<p>providers: shell 18.3.1, cart 18.2.0, catalog 17.0.2. consumers: shell ^18.2.0, catalog ^17.0.0.</p>
      ${H.table(['step', 'value'], [['highest provided', '<b>18.3.1</b> (not 18.2.0: "18.3.1" is newer; not "17.0.2": 18 &gt; 17)'], ['shell ^18.2.0', '<span class="c-g">ok</span>'], ['catalog ^17.0.0', '<span class="c-r">warning: major 18 ≠ 17</span>']])}<p>Output: <code>{ chosen: '18.3.1', warnings: ['catalog'] }</code></p>`,
    brute: {
      why: `<p>Comparing versions as <b>strings</b> sorts "18.10.0" below "18.9.0" (because "1" &lt; "9" character by character). The naive code picks the wrong React and the wrong apps get warnings.</p>`,
      code: `function negotiateBrute(providers, consumers) {
  const chosen = providers.map(p => p.version).sort().pop();   // BUG: string sort, "18.9.0" > "18.10.0"
  return { chosen, warnings: consumers.filter(c => c.range.slice(1, 3) !== chosen.slice(0, 2)).map(c => c.app) };
}`
    },
    mcq: { q: 'Which of these is the highest version?', options: ['18.9.0', '18.10.0', '18.2.1'], answer: 1, explain: 'Compare each part as a number: minor 10 is larger than 9 and 2, so 18.10.0 is the newest. String comparison gets this wrong.' },
    hints: [
      `<p>Hint 1: versions are three numbers. Split on "." and compare major, then minor, then patch, <b>as numbers</b>.</p>`,
      `<p>Hint 2: write a <code>cmp(a, b)</code> and a <code>satisfies(version, range)</code> helper; then the main function is two lines.</p>`,
      `<p>Hint 3: a caret range "^X.Y.Z" accepts version V when V.major == X and V >= X.Y.Z. A range with no caret is an exact match. Keep warnings in consumer order.</p>`
    ],
    solution: {
      approach: `<p>Parse into numbers, pick the maximum with a numeric comparator, then filter consumers by <code>satisfies</code>. The caret rule is the only subtle bit: same major <i>and</i> not below the floor.</p>`,
      code: { lang: 'js', run: true, code: `const parse = v => v.split('.').map(Number);
function cmp(a, b) {
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}
function satisfies(v, range) {
  if (range[0] !== '^') return v === range;
  const floor = range.slice(1);
  return parse(v)[0] === parse(floor)[0] && cmp(v, floor) >= 0;
}
function negotiate(providers, consumers) {
  const chosen = providers.map(p => p.version).reduce((best, v) => (cmp(v, best) > 0 ? v : best));
  const warnings = consumers.filter(c => !satisfies(chosen, c.range)).map(c => c.app);
  return { chosen, warnings };
}
console.log(negotiate(
  [{ app: 'shell', version: '18.3.1' }, { app: 'cart', version: '18.2.0' }, { app: 'catalog', version: '17.0.2' }],
  [{ app: 'shell', range: '^18.2.0' }, { app: 'catalog', range: '^17.0.0' }]));
console.log(negotiate([{ app: 'a', version: '18.9.0' }, { app: 'b', version: '18.10.0' }], [{ app: 'a', range: '^18.9.0' }]));` },
      dry: { head: ['step', 'candidate', 'best so far', 'cmp result'], rows: [['1', '18.3.1', '18.3.1 (start)', '-'], ['2', '18.2.0', '18.3.1', '-1: keep'], ['3', '17.0.2', '18.3.1', '-1: keep']] },
      complexity: `<p>Time O(P + C) for P providers and C consumers, space O(C) for the warnings list.</p>`,
      followUps: ['What if a consumer asked for a pre-release or a ~tilde range?', 'How would strictVersion change the return value?', 'What if no provider satisfies *anyone*? Is a fallback copy allowed?']
    }
  }]
});

/* ===================== TOPIC 3: Design systems & tokens ===================== */
topics.push({
  title: 'Design Systems, Design Tokens & Component Libraries',
  analogy: `<p>Think of <b>LEGO</b>. A design system is the box of standard bricks plus the instruction book: same studs, same colours, same rules, so a spaceship built by one child fits onto a castle built by another. <b>Design tokens</b> are the paint codes on the factory wall ("this exact blue is called <i>action</i>"). Change one paint code and every brick that uses it changes colour at the next production run — nobody repaints bricks by hand.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> A <b>design system</b> is three things working together:</p>
    <ul>
      <li><b>Design tokens</b> — named values for colour, spacing, type, radius, shadow, motion. <code>color.action</code> instead of <code>#2563eb</code>.</li>
      <li><b>A component library</b> — real code (Button, Input, Modal, Table) that uses only tokens and is tested once, used everywhere.</li>
      <li><b>Guidelines + docs</b> — when to use what, accessibility rules, a live catalogue (Storybook).</li>
    </ul>
    <p>Why bother? At scale, 40 teams build 40 slightly different buttons. A design system gives <b>consistency</b> (users learn one look), <b>speed</b> (nobody rebuilds a date picker), <b>accessibility once</b> (fix focus handling in one place) and <b>cheap theming</b> (dark mode, white-label brands).</p>
    <p><b>🔵 Token layers — the trick that makes theming easy.</b> Do not let components point at raw hex values. Use three layers:</p>
    ${H.table(['Layer', 'Example', 'Who uses it', 'Changes when…'], [
      ['<b>1. Primitive</b> (the palette)', '<code>blue.600 = #2563eb</code>', 'Only the semantic layer', 'The brand palette is redesigned'],
      ['<b>2. Semantic</b> (the meaning)', '<code>color.action → {blue.600}</code>', 'Components', '<span class="c-y">Per theme</span>: light/dark/brand'],
      ['<b>3. Component</b> (the part)', '<code>button.bg → {color.action}</code>', 'One component', 'A component needs a special case']
    ])}
    <p>To make dark mode you only redefine layer 2 ("in dark, <code>color.action</code> points to <code>blue.300</code>"). All components follow automatically. In CSS this is done with <b>custom properties</b> (<code>--color-action</code>) set on <code>:root</code> and overridden under <code>[data-theme="dark"]</code>.</p>
    <p><b>🟣 Build pipeline.</b> Tokens live in a JSON file (single source of truth). A tool such as <b>Style Dictionary</b> or <b>Tokens Studio</b> turns the JSON into CSS variables, a TypeScript object, iOS/Android values and Figma variables. Designers and developers edit the same file, so drift is a build error, not a meeting.</p>
    ${H.kv([['Primitive', 'raw palette value'], ['Semantic', 'meaning, changes per theme'], ['Component', 'one part\'s choice'], ['Contrast', '≥ 4.5 : 1 for body text']], { label: 'Tokens in four lines' })}`,
  clues: [
    '"<b>Dark mode</b> / white-label brands / multiple themes" → semantic tokens + CSS custom properties',
    '"Hundreds of components used by 30 teams" → versioned component library + design system',
    '"Designers and developers disagree on colours/spacing" → single token source (JSON) + build step',
    '"Do not break consumers when you ship a new Button" → semver, deprecation, changesets, visual regression tests',
    '"Accessible by default" → headless primitives (Radix, React Aria) + contrast checks on tokens',
    '"Bundle size of the UI kit" → ES modules, <code>sideEffects: false</code>, per-component imports, tree shaking'
  ],
  code: [
    {
      lang: 'json', title: 'tokens.json: three layers in one file',
      code: `{
  "blue":   { "300": { "value": "#93c5fd" }, "600": { "value": "#2563eb" } },
  "gray":   { "50": { "value": "#f9fafb" }, "900": { "value": "#111827" } },
  "white":  { "value": "#ffffff" },
  "color": {
    "bg":       { "value": "{white}" },
    "text":     { "value": "{gray.900}" },
    "action":   { "value": "{blue.600}" },
    "onAction": { "value": "{white}" }
  },
  "button": {
    "bg": { "value": "{color.action}" },
    "fg": { "value": "{color.onAction}" },
    "radius": { "value": "8px" }
  }
}`
    },
    {
      lang: 'css', title: 'How the tokens become themes in the browser',
      code: `/* Generated from tokens.json by the build step */
:root {
  --color-bg: #ffffff;
  --color-text: #111827;
  --color-action: #2563eb;
  --color-on-action: #ffffff;
  --button-radius: 8px;
}
/* Dark theme: only the SEMANTIC layer is redefined. Components do not change. */
:root[data-theme="dark"] {
  --color-bg: #111827;
  --color-text: #f9fafb;
  --color-action: #93c5fd;
  --color-on-action: #111827;
}
/* Respect the OS setting when the user has not chosen */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --color-bg: #111827; --color-text: #f9fafb; --color-action: #93c5fd; --color-on-action: #111827; }
}
/* A component uses ONLY tokens. No hex values here, ever. */
.btn { background: var(--color-action); color: var(--color-on-action); border-radius: var(--button-radius); }`
    },
    {
      lang: 'js', run: true, title: 'Runnable model: resolve token aliases per theme + WCAG contrast check',
      code: `// Primitive palette (layer 1)
const primitives = { 'white': '#ffffff', 'gray.50': '#f9fafb', 'gray.900': '#111827', 'blue.300': '#93c5fd', 'blue.600': '#2563eb', 'orange.600': '#ea580c' };

// Semantic layer (layer 2): one map per theme. Values are aliases like "{blue.600}".
const themes = {
  light: { 'color.action': '{blue.600}',   'color.onAction': '{white}',    'color.bg': '{white}',    'color.text': '{gray.900}' },
  dark:  { 'color.action': '{blue.300}',   'color.onAction': '{gray.900}', 'color.bg': '{gray.900}', 'color.text': '{gray.50}' },
  brand: { 'color.action': '{orange.600}', 'color.onAction': '{white}',    'color.bg': '{white}',    'color.text': '{gray.900}' }
};
// Component layer (layer 3): same for every theme.
const components = { 'button.bg': '{color.action}', 'button.fg': '{color.onAction}' };

// Follow "{...}" aliases until we hit a real value. Detect loops.
function resolve(name, theme, seen) {
  seen = seen || [];
  if (seen.includes(name)) throw new Error('alias cycle: ' + seen.concat(name).join(' -> '));
  const raw = components[name] || themes[theme][name] || primitives[name];
  if (raw === undefined) throw new Error('unknown token ' + name);
  const m = /^\\{(.+)\\}$/.exec(raw);
  return m ? resolve(m[1], theme, seen.concat(name)) : raw;
}

// WCAG relative luminance and contrast ratio (4.5 is the AA minimum for body text).
function lum(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

Object.keys(themes).forEach(t => {
  const bg = resolve('button.bg', t), fg = resolve('button.fg', t), r = contrast(bg, fg);
  console.log(t.padEnd(6), 'button', bg, 'on', fg, 'contrast', r.toFixed(2), r >= 4.5 ? 'PASS' : 'FAIL');
});`
    },
    {
      lang: 'js', check: false, title: 'A library component: variants as props, styles from tokens (React)',
      code: `import React from 'react';
import clsx from 'clsx';
import styles from './Button.module.css';

// The public API is small and typed. Everything visual comes from tokens in the CSS file.
export const Button = React.forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      className={clsx(styles.btn, styles[variant], styles[size])}
      aria-busy={loading || undefined}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {children}
    </button>
  );
});`
    }
  ],
  codeTitle: ['Tokens as JSON', 'Tokens as CSS themes', 'Runnable token resolver + contrast', 'A token-driven library component'],
  viz: {
    title: 'One component, three themes: tokens resolve to values',
    input: 'light dark brand',
    inputLabel: 'Themes to cycle through (light, dark, brand)',
    gen: function (input) {
      var list = words(input, 3, 'Use any of: light dark brand');
      var prim = { white: '#ffffff', 'gray.50': '#f9fafb', 'gray.900': '#111827', 'blue.300': '#93c5fd', 'blue.600': '#2563eb', 'orange.600': '#ea580c' };
      var map = {
        light: { action: 'blue.600', onAction: 'white' },
        dark: { action: 'blue.300', onAction: 'gray.900' },
        brand: { action: 'orange.600', onAction: 'white' }
      };
      function lum(h) { var c = [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; }).map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
      function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
      list.forEach(function (t) { if (!map[t]) throw new Error('Unknown theme "' + t + '". Use light, dark or brand'); });
      var primRows = Object.keys(prim).map(function (k) { return [k, prim[k]]; });
      var frames = [{ narr: '<b>Layer 1 — primitives.</b> The raw palette. Components are <b>not allowed</b> to use these directly.', parts: [{ type: 'table', label: 'Primitive tokens', columns: ['name', 'value'], rows: primRows }] }];
      list.forEach(function (t) {
        var m = map[t], a = prim[m.action], f = prim[m.onAction];
        var rows = [
          ['button.bg', '{color.action}', m.action, a],
          ['button.fg', '{color.onAction}', m.onAction, f]
        ];
        frames.push({ narr: 'Theme <b>' + t + '</b>, step 1: the <b>semantic</b> layer for this theme says <code>color.action → ' + m.action + '</code> and <code>color.onAction → ' + m.onAction + '</code>. This is the <i>only</i> thing a theme changes.', parts: [{ type: 'table', label: 'Semantic tokens (' + t + ')', columns: ['semantic', 'points to'], rows: [['color.action', m.action], ['color.onAction', m.onAction]], hl: { 0: 'cur', 1: 'cur' } }] });
        frames.push({ narr: 'Step 2: the Button\'s component tokens follow the chain <b>component → semantic → primitive → value</b>. The Button code did not change at all.', parts: [{ type: 'table', label: 'Resolution chain (' + t + ')', columns: ['component token', 'semantic alias', 'primitive', 'final value'], rows: rows, hl: { 0: 'ok', 1: 'ok' } }] });
        var r = ratio(a, f), pass = r >= 4.5;
        frames.push({ narr: 'Step 3: accessibility gate. Contrast between text and background is <b>' + r.toFixed(2) + ' : 1</b> → ' + (pass ? '<span class="c-g">passes WCAG AA (≥ 4.5)</span>.' : '<span class="c-r">fails WCAG AA (needs ≥ 4.5). The brand team must pick a darker action colour or dark text before this theme ships.</span>'), parts: [{ type: 'table', label: 'Contrast check (' + t + ')', columns: ['pair', 'ratio', 'AA?'], rows: [[a + ' vs ' + f, r.toFixed(2), pass ? 'PASS' : 'FAIL']], hl: { 0: pass ? 'ok' : 'bad' } }, { type: 'vars', vals: { theme: t, 'button.bg': a, 'button.fg': f, contrast: r.toFixed(2) }, hl: { contrast: pass ? 'ok' : 'bad' } }] });
      });
      frames.push({ narr: 'Takeaway: adding a theme = adding one small semantic map. Components, tests and docs stay untouched. And contrast can be <b>checked by the build</b>, not by eye.', parts: [{ type: 'text', html: '<b>Rule:</b> components read semantic/component tokens only; themes redefine the semantic layer; CI checks contrast.' }] });
      return frames;
    }
  },
  examples: [
    {
      title: 'Spacing and type scales: tokens are more than colour',
      html: `<p>Give spacing a scale instead of free numbers: <code>space.1 = 4px</code>, <code>space.2 = 8px</code>, <code>space.3 = 12px</code>, <code>space.4 = 16px</code>... Designers then say "padding 4" and developers write <code>var(--space-4)</code>. Same for type (<code>text.sm, text.md, text.lg</code>), radius, shadow and motion duration. A scale prevents the "13px here, 14px there" drift that makes UIs feel messy.</p>
        ${H.table(['Token', 'Value', 'Use'], [['space.2', '8px', 'gap inside a chip'], ['space.4', '16px', 'card padding'], ['radius.md', '8px', 'buttons, inputs'], ['motion.fast', '120ms', 'hover feedback']])}`
    },
    {
      title: 'Shipping a component library without breaking 30 apps',
      html: `<p>Treat the library like a public API. <b>Semver</b>: new prop = minor; removing or renaming a prop = major. Use <b>changesets</b> (a small markdown file per PR that says "Button: minor, added loading prop") so releases and changelogs are automatic. Mark old props <code>@deprecated</code>, log a dev-only console warning for one major version, then remove. Protect looks with <b>visual regression tests</b> (Chromatic/Playwright screenshots of each Storybook story) and behaviour with unit tests plus axe accessibility checks.</p>`
    },
    {
      title: 'Styled vs headless: two ways to build the library',
      html: `<p><b>Styled</b> libraries (MUI, Ant Design, Chakra) give finished looks: fast start, harder to make unique. <b>Headless</b> primitives (Radix UI, React Aria, Headless UI) give behaviour (keyboard, focus, ARIA) with <i>no</i> styling; your design system adds the look from tokens. Most large companies choose headless + own tokens: accessibility for free, brand fully theirs. The shadcn/ui approach goes further — copy the component source into your repo so you own it.</p>`,
      code: { lang: 'js', check: false, title: 'Headless primitive + token styles', code: `import * as Dialog from '@radix-ui/react-dialog';

export function ConfirmDialog({ open, onOpenChange, title, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="dialog">   {/* focus trap, Esc to close, aria-modal: handled for you */}
          <Dialog.Title>{title}</Dialog.Title>
          {children}
          <Dialog.Close asChild><button className="btn">Close</button></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}` }
    }
  ],
  deepDive: `<p><b>Governance is the hard part.</b> A design system is a product with users (other developers). It needs an owner team, a contribution model (how a product team proposes a new component), an intake bar ("used in at least 3 places"), and a roadmap. Without that it becomes either a bottleneck (everything waits on the core team) or a graveyard (copies of components drift).</p>
    <p><b>Theming internals.</b> CSS custom properties are inherited and resolved at <i>computed-value time</i>, so changing <code>data-theme</code> on <code>&lt;html&gt;</code> re-resolves every <code>var()</code> without re-rendering React. This is why runtime theming via CSS variables beats "CSS-in-JS with a theme object in context", which re-renders subtrees. For flash-free dark mode, set the attribute in an inline <code>&lt;head&gt;</code> script <i>before</i> first paint; read the saved choice from localStorage, else <code>prefers-color-scheme</code>. For micro-frontends, the theme tokens must be <b>global</b> (shared CSS file or a singleton), while component styles stay scoped (CSS Modules or Shadow DOM).</p>
    <p><b>Contrast maths.</b> WCAG relative luminance converts each sRGB channel with a gamma curve, then contrast = (L1 + 0.05) / (L2 + 0.05). AA needs 4.5 for normal text and 3 for large text and UI borders; AAA needs 7. Newer APCA proposals model perceptual contrast better but are not the legal standard yet. Dark themes need <i>lighter</i> action colours (as in our example) because bright saturated blues vibrate on dark backgrounds.</p>
    <p><b>Bundle and API design.</b> Ship ES modules with <code>"sideEffects": false</code> so unused components are tree-shaken; offer per-component entry points; avoid importing the whole icon set. Prefer <b>composition over configuration</b>: <code>&lt;Card&gt;&lt;Card.Header/&gt;...</code> instead of a Card with 25 props. Support <code>ref</code>, <code>className</code> escape hatches, and polymorphism (<code>as</code> prop) carefully — every escape hatch is a future breaking change. Document accessibility behaviour per component (keyboard map, ARIA pattern) because it is part of the contract.</p>`,
  aiEra: `<p><b>What AI changes:</b> generating a plausible Button or a Tailwind page is now trivial, which makes <i>consistency</i> the scarce thing. AI tools produce hard-coded hex values and magic spacing unless you tell them your tokens exist. A good design system becomes the <b>guard-rails for AI code</b>: if the library is typed and documented, assistants can use it correctly; if not, they invent new buttons.</p>
    <p><b>Use AI as a partner:</b> feed it your <code>tokens.json</code> and component docs (many teams expose them via an MCP server or a <code>llms.txt</code>) and ask <code>Build this form using only our components and tokens; list any token you wish existed.</code> Use it to migrate: <code>Replace every hard-coded colour in this file with the nearest semantic token and show a table of changes.</code> Add a lint rule (stylelint / ESLint) that blocks raw hex values so AI output is checked automatically.</p>
    <p><b>Where AI goes wrong:</b> it picks a colour pair that looks fine to it but fails contrast, imports a package you do not allow, and silently skips focus styles. <b>What you must still own:</b> the token naming, the accessibility bar, deprecation policy and the judgement of when a one-off component should become a shared one.</p>`,
  problems: [{
    title: 'Resolve Design Token Aliases (With Cycle Detection)',
    level: 'Medium', tags: ['design tokens', 'graph', 'recursion'], companies: ['Atlassian', 'Shopify', 'Adobe'],
    statement: `<p>Tokens are stored in a flat object: <code>{ name: value }</code>. A value is either a final value (like <code>"#2563eb"</code>) or an alias written as <code>"{other.name}"</code>. Write <code>resolveToken(tokens, name)</code> that follows aliases until it reaches a final value and returns it.</p>
      <p>If the chain loops (A → B → A) throw an <code>Error</code> whose message contains <code>"cycle"</code>. If any name in the chain does not exist throw an Error whose message contains <code>"unknown"</code>.</p>`,
    constraints: `Up to 10<sup>4</sup> tokens. Alias chains can be up to 10<sup>3</sup> long (avoid blowing the stack if you can).`,
    example: `${H.table(['token', 'value'], [['button.bg', '{color.action}'], ['color.action', '{blue.600}'], ['blue.600', '#2563eb']])}<p><code>resolveToken(tokens, 'button.bg')</code> → <b class="c-g">#2563eb</b> (button.bg → color.action → blue.600).</p><p>If <code>a = "{b}"</code> and <code>b = "{a}"</code> → throws "cycle".</p>`,
    brute: {
      why: `<p>Plain recursion without remembering visited names loops forever on a cycle (until the call stack overflows) and gives an unhelpful "Maximum call stack size exceeded" error instead of naming the bad tokens.</p>`,
      code: `function resolveBrute(tokens, name) {
  const v = tokens[name];
  const m = /^\\{(.+)\\}$/.exec(v);
  return m ? resolveBrute(tokens, m[1]) : v;   // infinite recursion on A -> B -> A, crashes on missing names
}`
    },
    mcq: { q: 'What data structure detects an alias cycle while following the chain?', options: ['A set (or array) of names visited on the current chain', 'Sorting all token names alphabetically', 'A second copy of the tokens object'], answer: 0, explain: 'Each alias step goes to exactly one next name, so if we ever see a name we already visited on this chain, we are going in circles.' },
    hints: [
      `<p>Hint 1: each alias points to <b>exactly one</b> next token, so this is following a linked list, not a full graph search.</p>`,
      `<p>Hint 2: keep a <code>Set</code> of visited names. If the next name is already in it, throw "cycle".</p>`,
      `<p>Hint 3: use a loop instead of recursion (chains of 1000 are fine either way, but a loop is safer). Recipe: cur = name; while value is alias: if visited has it throw; add; if missing throw unknown; cur = alias target.</p>`
    ],
    solution: {
      approach: `<p>Walk the chain iteratively. Before reading a token, check it exists; before stepping, check it is not already on the visited set. When the value is not of the form <code>{...}</code> it is final, so return it.</p>`,
      code: { lang: 'js', run: true, code: `function resolveToken(tokens, name) {
  const visited = new Set();
  let cur = name;
  while (true) {
    if (visited.has(cur)) throw new Error('cycle at ' + cur + ' via ' + Array.from(visited).join(' -> '));
    if (!(cur in tokens)) throw new Error('unknown token ' + cur);
    visited.add(cur);
    const m = /^\\{(.+)\\}$/.exec(tokens[cur]);
    if (!m) return tokens[cur];     // final value reached
    cur = m[1];                    // follow the alias
  }
}

const t = { 'button.bg': '{color.action}', 'color.action': '{blue.600}', 'blue.600': '#2563eb', a: '{b}', b: '{a}' };
console.log(resolveToken(t, 'button.bg'));
try { resolveToken(t, 'a'); } catch (e) { console.log(e.message); }
try { resolveToken(t, 'nope'); } catch (e) { console.log(e.message); }` },
      dry: { head: ['cur', 'visited', 'raw value', 'action'], rows: [['button.bg', '{}', '{color.action}', 'follow'], ['color.action', '{button.bg}', '{blue.600}', 'follow'], ['blue.600', '{button.bg, color.action}', '#2563eb', 'final: return']] },
      complexity: `<p>Time O(L) for chain length L, space O(L) for the visited set.</p>`,
      followUps: ['Support aliases inside a larger value, like "1px solid {color.border}".', 'Resolve ALL tokens at once in O(N) using memoisation.', 'How would you validate a theme file in CI?']
    }
  }]
});

/* ===================== TOPIC 4: Monorepos ===================== */
topics.push({
  title: 'Monorepos: One Repo, Many Packages, Only Rebuild What Changed',
  analogy: `<p>Think of a <b>big apartment building with one shared plumbing system</b> instead of 40 separate houses. If you fix the main pipe, everyone benefits at once; if you must replace it, you can warn exactly the flats that are connected to it and skip the rest. A <b>monorepo</b> keeps many apps and libraries in one repository. The clever part is the <b>building map</b> (the dependency graph): when one pipe changes, you only check the flats downstream of it. That check is called <b>affected detection</b>.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> A <b>monorepo</b> is one Git repository that holds many projects: the web shop, the admin tool, a UI kit, an API client, shared utils. Each project is a <b>package</b> with its own <code>package.json</code>. This is <i>not</i> the same as a monolith: the packages are still separate, with clear boundaries.</p>
    <p>Why teams love it:</p>
    <ul>
      <li><b>Atomic changes</b> — rename a function in <code>utils</code> and fix all 6 callers in <i>one</i> pull request.</li>
      <li><b>One toolchain</b> — one ESLint, TypeScript and test setup to maintain.</li>
      <li><b>Easy sharing</b> — import a local package instead of publishing to npm and waiting.</li>
      <li><b>Visibility</b> — you can search the whole company's frontend code.</li>
    </ul>
    <p>The cost: the repo gets big, so <b>CI becomes slow</b> if it rebuilds and re-tests everything on every commit. That is where tools like <b>Nx</b>, <b>Turborepo</b> and <b>Bazel</b> earn their keep, with two superpowers:</p>
    <ol>
      <li><b>Affected detection.</b> Compare to the main branch, see which files changed, map files → packages, then walk the dependency graph <i>backwards</i> to find every package that depends (even indirectly) on a changed one. Only those run build/test/lint.</li>
      <li><b>Caching.</b> If a package's inputs (source files + its dependencies' outputs + config) hash to something seen before, <b>replay the saved result</b> instead of running the task. A remote cache shares results across all developers and CI machines.</li>
    </ol>
    <p><b>🔵 The key direction.</b> Edges mean "depends on". If <code>web-shop → ui-kit → utils</code> and you change <code>utils</code>, then <code>ui-kit</code> and <code>web-shop</code> are affected (they use it). If you change only <code>web-shop</code>, nothing else is affected because nobody depends on it. So affected = <b>the changed packages plus everything that can reach them by following edges backwards</b>.</p>
    ${H.table(['Change in…', 'Affected (rebuild + test)', 'Skipped'], [
      ['<code>utils</code> (bottom of the tree)', 'utils, ui-kit, api-client, web-shop, admin, marketing, e2e', '<span class="c-g">nothing</span> — everything uses it'],
      ['<code>ui-kit</code>', 'ui-kit, web-shop, admin, marketing, e2e', 'utils, api-client'],
      ['<code>marketing</code> (a leaf app)', 'marketing only', '<span class="c-g">6 of 7 packages</span>']
    ])}
    <p><b>🟣 Task order matters.</b> You cannot build <code>web-shop</code> before <code>ui-kit</code>. The tool runs a <b>topological order</b> (dependencies first) and runs independent branches in parallel. A circular dependency (A needs B needs A) makes this impossible, so tools reject cycles.</p>`,
  clues: [
    '"CI takes 45 minutes for a one-line change" → affected detection + remote cache',
    '"Share code between web, admin and mobile-web without publishing to npm" → workspaces (pnpm/yarn/npm)',
    '"Change a shared library and update all consumers together" → monorepo atomic commit',
    '"Which projects should rebuild when <code>libs/ui</code> changes?" → reverse dependency graph traversal',
    '"Build dependencies first, in parallel where possible" → topological sort of the task graph',
    '"Teams must not import each other\'s internals" → enforce module boundaries (lint rules, tags, CODEOWNERS)'
  ],
  code: [
    {
      lang: 'yaml', title: 'pnpm-workspace.yaml + root layout', check: false,
      code: `# pnpm-workspace.yaml   (which folders are packages)
packages:
  - "apps/*"       # web-shop, admin, marketing  (deployable)
  - "packages/*"   # ui-kit, api-client, utils   (shared libraries)

# Layout
# apps/web-shop      depends on  "@shop/ui-kit": "workspace:*", "@shop/api-client": "workspace:*"
# packages/ui-kit    depends on  "@shop/utils":  "workspace:*"
# packages/utils     (no internal deps)`
    },
    {
      lang: 'json', title: 'turbo.json: tasks, their dependencies, and what to cache',
      code: `{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "package.json", "tsconfig.json"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {},
    "dev": { "cache": false, "persistent": true }
  }
}`
    },
    {
      lang: 'js', run: true, title: 'Runnable model: file → package, affected set, safe build order',
      code: `// Each package lists the packages it DEPENDS ON ("deps") and where its files live ("dir").
const pkgs = {
  utils:     { dir: 'packages/utils',      deps: [] },
  'ui-kit':  { dir: 'packages/ui-kit',     deps: ['utils'] },
  'api':     { dir: 'packages/api-client', deps: ['utils'] },
  'shop':    { dir: 'apps/web-shop',       deps: ['ui-kit', 'api'] },
  'admin':   { dir: 'apps/admin',          deps: ['ui-kit', 'api'] },
  'mkt':     { dir: 'apps/marketing',      deps: ['ui-kit'] },
  'e2e':     { dir: 'apps/e2e',            deps: ['shop'] }
};
const GLOBAL_FILES = ['package.json', 'pnpm-lock.yaml', 'tsconfig.base.json'];   // root files affect EVERYTHING

// Which package owns a file? The one whose folder is a prefix of the path.
function ownerOf(file) {
  return Object.keys(pkgs).find(n => file.startsWith(pkgs[n].dir + '/')) || null;
}

// Invert the graph: for each package, who depends on it?
function dependents() {
  const rev = {};
  Object.keys(pkgs).forEach(n => { rev[n] = []; });
  Object.keys(pkgs).forEach(n => pkgs[n].deps.forEach(d => rev[d].push(n)));
  return rev;
}

function affected(changedFiles) {
  if (changedFiles.some(f => GLOBAL_FILES.includes(f))) return new Set(Object.keys(pkgs));
  const rev = dependents(), out = new Set(), queue = [];
  changedFiles.forEach(f => { const o = ownerOf(f); if (o && !out.has(o)) { out.add(o); queue.push(o); } });
  while (queue.length) {                       // walk edges BACKWARDS (towards dependents)
    const cur = queue.shift();
    rev[cur].forEach(d => { if (!out.has(d)) { out.add(d); queue.push(d); } });
  }
  return out;
}

// Dependencies first (Kahn's algorithm), limited to the affected set.
function buildOrder(set) {
  const indeg = {}, order = [];
  set.forEach(n => { indeg[n] = pkgs[n].deps.filter(d => set.has(d)).length; });
  const ready = Array.from(set).filter(n => indeg[n] === 0).sort();
  while (ready.length) {
    const n = ready.shift(); order.push(n);
    set.forEach(m => { if (pkgs[m].deps.includes(n) && --indeg[m] === 0) ready.push(m); });
  }
  if (order.length !== set.size) throw new Error('dependency cycle!');
  return order;
}

const a = affected(['packages/ui-kit/src/Button.tsx']);
console.log('affected:', Array.from(a).sort().join(', '));
console.log('build order:', buildOrder(a).join(' -> '));
console.log('leaf change:', Array.from(affected(['apps/marketing/index.ts'])).join(', '));
console.log('lockfile change affects', affected(['pnpm-lock.yaml']).size, 'of', Object.keys(pkgs).length);`
    },
    {
      lang: 'bash', title: 'What CI runs: only the affected projects', check: false,
      code: `# Nx: compare against main, run the tasks only for affected projects
npx nx affected -t lint test build --base=origin/main --head=HEAD --parallel=3

# Turborepo: run in every package changed since main, plus their dependents ("...")
npx turbo run build test --filter="...[origin/main]"

# With a remote cache configured, unchanged work is replayed from the cache: "FULL TURBO"`
    }
  ],
  codeTitle: ['Workspace layout', 'Task pipeline', 'Runnable affected-graph model', 'CI commands'],
  viz: {
    title: 'Affected-project detection on a monorepo graph',
    input: 'ui-kit',
    inputLabel: 'Changed package (utils, ui-kit, api, shop, admin, mkt, e2e)',
    gen: function (input) {
      var changed = words(input, 3, 'Use package ids: utils ui-kit api shop admin mkt e2e');
      var ids = ['utils', 'ui-kit', 'api', 'shop', 'admin', 'mkt', 'e2e'];
      changed.forEach(function (c) { if (ids.indexOf(c) < 0) throw new Error('Unknown package "' + c + '". Use: ' + ids.join(' ')); });
      var deps = { utils: [], 'ui-kit': ['utils'], api: ['utils'], shop: ['ui-kit', 'api'], admin: ['ui-kit', 'api'], mkt: ['ui-kit'], e2e: ['shop'] };
      var pos = { utils: [7, 28], 'ui-kit': [30, 10], api: [30, 46], shop: [58, 6], admin: [58, 28], mkt: [58, 50], e2e: [86, 6] };
      var nodes = ids.map(function (id) { return { id: id, label: id, x: pos[id][0], y: pos[id][1], shape: 'box', w: 12 }; });
      var edges = [];
      ids.forEach(function (n) { deps[n].forEach(function (d) { edges.push([n, d]); }); });
      var rev = {}; ids.forEach(function (n) { rev[n] = []; });
      ids.forEach(function (n) { deps[n].forEach(function (d) { rev[d].push(n); }); });
      function g(hl, ehl) { return { type: 'graph', label: 'Arrow means "depends on"', directed: true, height: 58, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; }
      var hl = {}, hit = {}, queue = [], aff = [];
      var frames = [{ narr: 'The monorepo has 7 packages. An arrow <b>A → B</b> means "A depends on B". Nothing is marked yet.', parts: [g({})] }];
      changed.forEach(function (c) { hl[c] = 'bad'; hit[c] = 1; queue.push(c); aff.push(c); });
      frames.push({ narr: 'Step 1: git says these files changed → map them to packages: <b>' + changed.join(', ') + '</b> (red). They are affected for sure.', parts: [g(JSON.parse(JSON.stringify(hl))), { type: 'queue', label: 'To visit (reverse walk)', items: queue.slice(), frontLabel: 'next', backLabel: 'last' }] });
      var guard = 0;
      while (queue.length && guard++ < 50) {
        var cur = queue.shift();
        var hl2 = JSON.parse(JSON.stringify(hl)); hl2[cur] = 'cur';
        var users = rev[cur], added = [], eh = {};
        users.forEach(function (u) { eh[u + '-' + cur] = 'cur'; if (!hit[u]) { hit[u] = 1; added.push(u); aff.push(u); queue.push(u); hl[u] = 'ok'; } });
        frames.push({ narr: 'Visit <b>' + cur + '</b>: who depends on it? ' + (users.length ? '<b>' + users.join(', ') + '</b>' + (added.length ? ' → newly affected: ' + added.join(', ') + ' (green).' : ' (all already marked).') : 'Nobody — it is a leaf, the walk stops here.'), parts: [g(hl2, eh), { type: 'queue', label: 'To visit', items: queue.slice(), frontLabel: 'next', backLabel: 'last' }, { type: 'set', label: 'Affected so far', items: aff.slice() }] });
      }
      var skipped = ids.filter(function (n) { return !hit[n]; });
      var hl3 = {}; ids.forEach(function (n) { hl3[n] = hit[n] ? (changed.indexOf(n) >= 0 ? 'bad' : 'ok') : 'done'; });
      frames.push({ narr: 'Result: run build/test for <b>' + aff.length + '</b> packages and <b>skip ' + skipped.length + '</b> (faded). ' + (skipped.length ? 'Those skipped jobs are the CI time you save on every pull request.' : 'This change touches the very bottom of the tree, so everything must run.'), parts: [g(hl3), { type: 'vars', vals: { affected: aff.length, skipped: skipped.length, savedPercent: Math.round(100 * skipped.length / ids.length) + '%' }, hl: { skipped: skipped.length ? 'ok' : '' } }] });
      return frames;
    }
  },
  examples: [
    {
      title: 'Trace by hand: change ui-kit',
      html: `<p>Edges (depends on): shop→ui-kit, shop→api, admin→ui-kit, admin→api, mkt→ui-kit, e2e→shop, ui-kit→utils, api→utils. Who depends on <b>ui-kit</b>? shop, admin, mkt. Who depends on <b>shop</b>? e2e. Who depends on admin, mkt? nobody. So affected = {ui-kit, shop, admin, mkt, e2e}; <code>utils</code> and <code>api</code> are skipped (they do not use ui-kit).</p>
        <p>Order: ui-kit first (nothing affected below it), then shop/admin/mkt in parallel, then e2e after shop.</p>`
    },
    {
      title: 'Root files change everything',
      html: `<p>Editing <code>pnpm-lock.yaml</code>, <code>tsconfig.base.json</code> or the CI config can change how <i>every</i> package builds. Good tools treat a few "global" files as inputs of every task. This is why a lockfile bump rebuilds the world — and why you want a <b>remote cache</b>: tasks whose real inputs did not change can still hit the cache. Be careful not to list too many global inputs; each one widens the blast radius of every PR.</p>`
    },
    {
      title: 'Module boundaries: keep the graph clean',
      html: `<p>Graphs rot. Without rules, <code>utils</code> will one day import from <code>web-shop</code>, creating a cycle. Add tags (<code>type:app</code>, <code>type:lib</code>, <code>scope:checkout</code>) and a lint rule such as <code>@nx/enforce-module-boundaries</code>: apps may import libs, libs may <b>never</b> import apps, and a feature lib may only import shared libs. Also use <code>CODEOWNERS</code> so each folder has reviewers, and <code>exports</code> in package.json so only the public entry point is importable.</p>`,
      code: { lang: 'json', title: 'Only the public API is importable', code: `{
  "name": "@shop/ui-kit",
  "version": "0.0.0",
  "sideEffects": false,
  "exports": {
    ".": "./dist/index.js",
    "./button": "./dist/button.js"
  }
}` }
    }
  ],
  deepDive: `<p><b>How tools compute "affected".</b> Nx builds a project graph by reading <code>package.json</code> dependencies <i>and</i> scanning import statements; Turborepo reads workspace dependencies. They run <code>git diff base...HEAD</code>, map changed files to projects, then do a reverse reachability search (exactly our BFS). Complexity is O(P + E) for P packages and E edges, trivial even for thousands of packages. The expensive part is not the graph but <b>correctly describing inputs</b>: environment variables, generated files, and tool versions must be part of the task hash or the cache serves stale results.</p>
    <p><b>Cache keys are Merkle hashes.</b> hash(task) = hash(source files of the package, config files, task command, env vars it declares, and the <i>hashes of its dependencies' tasks</i>). Because dependency hashes are included, a change deep in <code>utils</code> automatically changes the hash of every downstream package, with no extra logic. A remote cache (Vercel, Nx Cloud, S3 + self-hosted) lets CI and laptops share results; guard it with read-only tokens for PRs from forks to avoid cache poisoning.</p>
    <p><b>Scale limits.</b> Git itself slows down at huge size (use sparse checkout, partial clone, <code>fsmonitor</code>); IDEs slow down (limit TypeScript project references, use <code>paths</code> carefully); lockfile merge conflicts hurt (pnpm helps). At extreme scale (Google, Meta) companies move to Bazel/Buck with hermetic, remote-executed builds, but most companies never need that.</p>
    <p><b>Versioning and publishing.</b> Internal packages often use <code>workspace:*</code> and are never published. For public libraries use <b>changesets</b> or Lerna's conventional commits to bump versions, generate changelogs, and publish only the affected packages, in dependency order. <b>Polyrepo trade-off:</b> a repo per package gives hard isolation and independent history, at the price of cross-repo changes needing coordinated PRs and version bumps; a monorepo gives easy refactors but needs discipline (ownership, boundaries, fast CI).</p>`,
  aiEra: `<p><b>What AI changes:</b> a monorepo is a gift to AI assistants because all related code is in one place: an agent can change a library <i>and</i> all its callers in one session and run the affected tests. But large repos exhaust the context window, so agents need guidance: a root <code>AGENTS.md</code>/<code>CLAUDE.md</code> that explains the layout, the commands (<code>pnpm nx affected -t test</code>) and the boundaries.</p>
    <p><b>Use AI as a partner:</b> ask it <code>Read the project graph and list every package that could break if I change the signature of formatPrice in packages/utils</code>, then <b>verify</b> with the real tool (<code>nx graph --affected</code>). Use it to write boundary lint rules and to migrate packages in bulk (codemods).</p>
    <p><b>Where AI goes wrong:</b> it adds a convenient relative import that crosses package boundaries (<code>../../packages/utils/src/x</code>), creates a dependency cycle, or "fixes" CI by disabling the cache. <b>What you must still own:</b> the dependency direction rules, cache correctness (what counts as an input), and the decision to run <i>all</i> tests nightly even though PRs only run the affected ones.</p>`,
  problems: [{
    title: 'Affected Projects in a Monorepo',
    level: 'Medium', tags: ['graph', 'BFS', 'monorepo'], companies: ['Google', 'Microsoft', 'Vercel'],
    statement: `<p>You are given <code>deps</code>: an object mapping each package name to the array of package names it depends on, and <code>changed</code>: an array of package names that have changed. Return a <b>sorted</b> array of all affected packages: the changed ones plus every package that depends on them, directly or indirectly.</p>
      <p>Every name in <code>changed</code> exists in <code>deps</code>. The graph has no cycles.</p>`,
    constraints: `1 ≤ packages ≤ 10<sup>4</sup>; total edges ≤ 5·10<sup>4</sup>.`,
    example: `<p>deps: shop→[ui,api], admin→[ui], ui→[utils], api→[utils], utils→[]; changed: <code>["ui"]</code></p>
      ${H.table(['visit', 'dependents found', 'affected so far'], [['ui', 'shop, admin', 'ui, shop, admin'], ['shop', '(none)', 'same'], ['admin', '(none)', 'same']])}<p>Output: <b class="c-g">["admin","shop","ui"]</b>. <code>api</code> and <code>utils</code> are skipped.</p>`,
    brute: {
      why: `<p>For every package, run a full DFS down its dependencies to see if it reaches a changed package. That repeats the same walks over and over: O(P · (P + E)) in the worst case (10<sup>4</sup> × 6·10<sup>4</sup> = 6·10<sup>8</sup>) when one reverse walk would do.</p>`,
      code: `function affectedBrute(deps, changed) {
  const ch = new Set(changed);
  function reaches(n, seen) {                 // does n depend (transitively) on a changed package?
    if (ch.has(n)) return true;
    if (seen.has(n)) return false;
    seen.add(n);
    return deps[n].some(d => reaches(d, seen));
  }
  return Object.keys(deps).filter(n => reaches(n, new Set())).sort();
}`
    },
    mcq: { q: 'Which direction must you walk the "depends on" edges to find affected packages?', options: ['Backwards: from a changed package to the packages that depend on it', 'Forwards: from a changed package to what it depends on', 'In both directions equally'], answer: 0, explain: 'If A depends on B and B changes, A is affected. So starting at B we follow the arrow backwards to A. What B depends on is not affected.' },
    hints: [
      `<p>Hint 1: "who depends on X?" is the question you keep asking. The input only tells you "what X depends on", so first <b>invert</b> the graph.</p>`,
      `<p>Hint 2: build <code>rev[d] = [packages that list d]</code> once, then run BFS/DFS from all changed packages at the same time, with a visited set.</p>`,
      `<p>Hint 3: edge cases: a changed package that nobody depends on, duplicates in <code>changed</code>, and sorting at the end. Recipe: rev map → queue = changed → pop, push unseen dependents → return sorted visited.</p>`
    ],
    solution: {
      approach: `<p>Invert the edges in one pass, then do a multi-source BFS from all changed packages. Each package enters the queue at most once, so the whole thing is linear in graph size.</p>`,
      code: { lang: 'js', run: true, code: `function affected(deps, changed) {
  const rev = {};
  for (const n of Object.keys(deps)) rev[n] = [];
  for (const n of Object.keys(deps)) for (const d of deps[n]) rev[d].push(n);   // d is used by n

  const seen = new Set(changed);
  const queue = Array.from(seen);
  for (let i = 0; i < queue.length; i++) {            // index-based queue: O(1) per step
    for (const user of rev[queue[i]]) {
      if (!seen.has(user)) { seen.add(user); queue.push(user); }
    }
  }
  return Array.from(seen).sort();
}

const deps = { shop: ['ui', 'api'], admin: ['ui'], ui: ['utils'], api: ['utils'], utils: [] };
console.log(JSON.stringify(affected(deps, ['ui'])));
console.log(JSON.stringify(affected(deps, ['utils'])));
console.log(JSON.stringify(affected(deps, ['shop'])));` },
      dry: { head: ['queue index', 'package', 'dependents (rev)', 'new in queue'], rows: [['0', 'ui', 'shop, admin', 'shop, admin'], ['1', 'shop', '-', '-'], ['2', 'admin', '-', '-']] },
      complexity: `<p>Time O(P + E) — building the reverse map and one BFS. Space O(P + E).</p>`,
      followUps: ['Return the order in which to build them (topological sort).', 'Treat root files (lockfile) as affecting all packages.', 'How would you detect a cycle in the same pass?']
    }
  }]
});

/* ===================== TOPIC 5: PWAs & service workers ===================== */
topics.push({
  title: 'PWAs & Service Workers: Cache Strategies That Survive Bad Wi-Fi',
  analogy: `<p>A <b>service worker</b> is a <b>doorman</b> who stands between your app and the internet. Every time your page wants something ("give me app.js", "give me the cart"), the request goes through him first. He can say: "I have a copy on my shelf, here you go" (<b>cache-first</b>), or "let me phone the shop first, and if the line is dead I'll hand you the old copy" (<b>network-first</b>), or "take this old copy now, and I'll quietly fetch a fresh one for next time" (<b>stale-while-revalidate</b>). A <b>PWA</b> (Progressive Web App) is just a website that hired such a doorman, has an install card (the manifest), and so behaves like an app.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> A <b>Progressive Web App</b> is a normal website that adds three things so it can feel like a native app:</p>
    <ul>
      <li>a <b>Web App Manifest</b> (<code>manifest.json</code>): name, icons, start URL, colours, display mode. It makes the site <b>installable</b> (home-screen icon, own window).</li>
      <li>a <b>Service Worker</b>: a JavaScript file that runs in the background, separate from the page, with no DOM access. It can intercept network requests, cache responses, receive push messages and run background sync.</li>
      <li><b>HTTPS</b> (localhost is allowed for development). Service workers are powerful, so browsers only allow them on secure origins.</li>
    </ul>
    <p><b>🔵 The life of a service worker.</b> It has three important moments:</p>
    ${H.table(['Stage', 'What happens', 'What you usually do'], [
      ['<b>register</b>', 'Your page calls <code>navigator.serviceWorker.register("/sw.js")</code>', 'Do it after <code>load</code> so it does not slow first paint'],
      ['<b>install</b>', 'Browser downloads sw.js and runs the <code>install</code> event once per version', '<b>Precache</b> the app shell (HTML, JS, CSS, offline page)'],
      ['<b>waiting</b>', 'A new version waits until all tabs using the old one close', 'Optionally <code>skipWaiting()</code> or show an "Update available" button'],
      ['<b>activate</b>', 'The new version takes control', '<b>Delete old caches</b>; optionally <code>clients.claim()</code>'],
      ['<b>fetch</b>', 'Every request from controlled pages triggers a <code>fetch</code> event', 'Pick a <b>caching strategy</b> per kind of request']
    ])}
    <p><b>The five classic strategies</b> (this is the heart of the topic):</p>
    ${H.table(['Strategy', 'Order of events', 'Best for', 'Risk'], [
      ['<b>Cache-first</b>', 'cache hit → return. miss → network → store', 'Versioned/hashed static files (app.abc123.js), fonts, images', 'Stale if the URL never changes'],
      ['<b>Network-first</b>', 'network → store → return. fails → cache', 'HTML pages, the cart, anything that should be fresh but must work offline', 'Slow on bad networks unless you add a timeout'],
      ['<b>Stale-while-revalidate</b>', 'return cache now; fetch fresh in the background; update cache', 'Avatars, feeds, non-critical API data', 'User sees old data once'],
      ['<b>Network-only</b>', 'always network', 'Payments, login, anything that must never be cached', 'Fails offline'],
      ['<b>Cache-only</b>', 'only the cache', 'Precached app shell after install', 'Miss = failure']
    ])}
    <p><b>🟣 Rule of thumb.</b> <i>Immutable</i> things (file names with a content hash) → cache-first forever. <i>Changing</i> things (HTML, API data) → network-first or stale-while-revalidate. <i>Dangerous</i> things (POST, payments) → network-only. The service worker file itself must <b>never</b> be cached for long, or you cannot ship fixes.</p>`,
  clues: [
    '"Make the app <b>work offline</b> / on flaky connections" → service worker + cache strategy',
    '"Installable on the home screen / app-like" → Web App Manifest + service worker + HTTPS',
    '"Show cached data instantly then refresh" → <b>stale-while-revalidate</b>',
    '"Users keep seeing the old version after a deploy" → service worker update flow / cache versioning / caching sw.js too long',
    '"Which strategy for HTML? for hashed JS? for the API?" → network-first / cache-first / SWR',
    '"Re-engage users with notifications" → Push API + Notifications API (needs a service worker)'
  ],
  code: [
    {
      lang: 'js', title: 'Register (page) + sw.js with a version, precache and three strategies',
      code: `// ---- main.js (runs in the page) ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW scope:', reg.scope);
    });
  });
}

// ---- sw.js (runs in the background; "self" is the service worker) ----
const VERSION = 'v7';                           // bump on every deploy that changes precache
const STATIC = 'static-' + VERSION;             // app shell + hashed assets
const RUNTIME = 'runtime-' + VERSION;           // API responses etc.
const PRECACHE = ['/', '/offline.html', '/app.4f9c2a.js', '/app.1b7d3e.css'];

self.addEventListener('install', event => {
  // Wait until the shell is fully cached before declaring this version installed.
  event.waitUntil(caches.open(STATIC).then(c => c.addAll(PRECACHE)));
});

self.addEventListener('activate', event => {
  // Delete caches from older versions so storage does not grow forever.
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== STATIC && k !== RUNTIME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                     // never touch POST/PUT: payments, forms
  const url = new URL(req.url);

  if (req.mode === 'navigate') {                        // HTML pages: network-first, offline page fallback
    event.respondWith(networkFirst(req).catch(() => caches.match('/offline.html')));
  } else if (url.pathname.startsWith('/api/')) {        // API data: show cached instantly, refresh behind the scenes
    event.respondWith(staleWhileRevalidate(req));
  } else {                                              // hashed static files: cache-first
    event.respondWith(cacheFirst(req));
  }
});

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  (await caches.open(STATIC)).put(req, res.clone());    // a Response body can be read once: clone it
  return res;
}
async function networkFirst(req) {
  try {
    const res = await fetch(req);
    (await caches.open(RUNTIME)).put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await caches.match(req);
    if (hit) return hit;
    throw err;
  }
}
async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(req);
  const refresh = fetch(req).then(res => { cache.put(req, res.clone()); return res; });
  return hit || refresh;                                // hit = instant; the refresh still updates the cache
}`
    },
    {
      lang: 'json', title: 'manifest.json: what makes the site installable',
      code: `{
  "name": "Acme Shop",
  "short_name": "Acme",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}`
    },
    {
      lang: 'js', run: true, title: 'Runnable cache-strategy simulator (cache-first vs network-first vs SWR)',
      code: `// A tiny pretend browser: a cache (Map), an online flag, and a server whose API data keeps changing.
function makeWorld() {
  return {
    online: true, cache: new Map(), hits: 0, netCalls: 0,
    serverVersion: { '/api/cart': 1 },
    network(url) {
      this.netCalls++;
      if (!this.online) throw new Error('offline');
      if (url.startsWith('/api/')) this.serverVersion[url] = (this.serverVersion[url] || 0) + 1;  // live data changes
      return url + '@v' + (url.startsWith('/api/') ? this.serverVersion[url] : 1);
    }
  };
}

function handle(strategy, url, w) {
  const cached = w.cache.get(url);
  if (strategy === 'cache-first') {
    if (cached) { w.hits++; return { from: 'cache', body: cached }; }
    try { const b = w.network(url); w.cache.set(url, b); return { from: 'network', body: b }; }
    catch (e) { return { from: 'FAIL', body: null }; }
  }
  if (strategy === 'network-first') {
    try { const b = w.network(url); w.cache.set(url, b); return { from: 'network', body: b }; }
    catch (e) { return cached ? { from: 'cache(stale)', body: cached } : { from: 'FAIL', body: null }; }
  }
  if (strategy === 'swr') {
    let fresh = null;
    try { fresh = w.network(url); } catch (e) { /* offline: background refresh just fails */ }
    if (fresh) w.cache.set(url, fresh);                 // cache is updated for NEXT time
    if (cached) { w.hits++; return { from: 'cache + refresh', body: cached }; }
    return fresh ? { from: 'network', body: fresh } : { from: 'FAIL', body: null };
  }
  throw new Error('unknown strategy');
}

function run(strategy, script) {
  const w = makeWorld();
  console.log('--- ' + strategy);
  script.forEach(step => {
    if (step === 'offline') { w.online = false; console.log('(going offline)'); return; }
    if (step === 'online') { w.online = true; console.log('(back online)'); return; }
    const r = handle(strategy, step, w);
    console.log(step.padEnd(10), '->', r.from.padEnd(16), r.body);
  });
  console.log('network calls:', w.netCalls, '| served from cache:', w.hits);
}

const script = ['/api/cart', '/api/cart', 'offline', '/api/cart', 'online', '/api/cart'];
['cache-first', 'network-first', 'swr'].forEach(s => run(s, script));`
    }
  ],
  codeTitle: ['Service worker with 3 strategies', 'Web App Manifest', 'Runnable strategy simulator'],
  viz: [{
    title: 'Service worker fetch decision: cache hit, miss or network?',
    input: 'network-first /app.js /api/cart offline /api/cart /missing online /api/cart',
    inputLabel: 'Strategy (cache-first | network-first | swr), then requests. Use the words offline / online to toggle the network',
    gen: function (input) {
      var t = words(input, 12, 'Example: cache-first /app.js /api/cart offline /api/cart');
      var strat = t[0];
      if (['cache-first', 'network-first', 'swr'].indexOf(strat) < 0) throw new Error('First word must be cache-first, network-first or swr');
      var reqs = t.slice(1);
      if (!reqs.length) throw new Error('Add some requests like /app.js /api/cart');
      var online = true, cache = [], sv = {}, netCalls = 0, last = '-';
      function body(u) { if (u.indexOf('/api/') === 0) { sv[u] = (sv[u] || 0) + 1; return u + '@v' + sv[u]; } return u + '@v1'; }
      function put(u, b) { cache = cache.filter(function (x) { return x.split('@')[0] !== u; }); cache.push(b); }
      function find(u) { for (var i = 0; i < cache.length; i++) if (cache[i].split('@')[0] === u) return cache[i]; return null; }
      function snap(hl) { return [
        { type: 'queue', label: 'Cache Storage (what the doorman holds)', items: cache.slice(), frontLabel: 'oldest', backLabel: 'newest', hl: hl || {} },
        { type: 'vars', vals: { strategy: strat, network: online ? 'ONLINE' : 'OFFLINE', 'network calls': netCalls, 'last answer': last }, hl: { network: online ? 'ok' : 'bad' } }
      ]; }
      var frames = [{ narr: 'Strategy: <b>' + strat + '</b>. The cache is empty and the network is online. Each request will pass through the service worker\'s <code>fetch</code> event.', parts: snap() }];
      reqs.forEach(function (r) {
        if (r === 'offline' || r === 'online') {
          online = r === 'online';
          frames.push({ narr: 'The network goes <b>' + r + '</b>' + (online ? '.' : ' (a tunnel, a lift, airplane mode). The cache is now the only thing that can answer.'), parts: snap() });
          return;
        }
        var c = find(r);
        frames.push({ narr: 'Page asks for <code>' + H.esc(r) + '</code>. The service worker checks the cache: ' + (c ? '<span class="c-g">HIT</span> (' + H.esc(c) + ').' : '<span class="c-r">MISS</span>.'), parts: snap(c ? (function () { var o = {}; o[cache.indexOf(c)] = 'ok'; return o; })() : {}) });
        var from, res;
        if (strat === 'cache-first') {
          if (c) { from = 'cache'; res = c; }
          else if (online) { netCalls++; res = body(r); put(r, res); from = 'network'; }
          else { from = 'FAIL'; res = null; }
        } else if (strat === 'network-first') {
          if (online) { netCalls++; res = body(r); put(r, res); from = 'network'; }
          else if (c) { from = 'cache (stale)'; res = c; }
          else { from = 'FAIL'; res = null; }
        } else {
          var fresh = null;
          if (online) { netCalls++; fresh = body(r); }
          if (c) { from = 'cache + background refresh'; res = c; if (fresh) put(r, fresh); }
          else if (fresh) { from = 'network'; res = fresh; put(r, fresh); }
          else { from = 'FAIL'; res = null; }
        }
        last = res || 'error';
        var why = {
          'cache': 'Cache-first trusts the cache: <b>no network at all</b>, instant.',
          'network': (strat === 'cache-first' ? 'Cache-first misses, so it goes to the network and <b>stores</b> the answer.' : strat === 'network-first' ? 'Network-first always asks the network first, then <b>stores</b> a copy.' : 'Nothing cached yet, so SWR has to wait for the network once.'),
          'cache (stale)': 'The network failed, so network-first falls back to the cached copy. It may be <b>old</b>, but the page works.',
          'cache + background refresh': 'SWR answers <b>instantly</b> from cache and refreshes behind the scenes. The user sees the old copy now and the new one next time.',
          'FAIL': 'No cache and no network → the request <span class="c-r">fails</span> (the app should show an offline page).'
        }[from];
        var hl2 = {}; var ix = res ? cache.indexOf(cache.filter(function (x) { return x.split('@')[0] === r; })[0]) : -1; if (ix >= 0) hl2[ix] = 'sel';
        frames.push({ narr: 'Decision: <b>' + from + '</b> → returns <code>' + H.esc(res || 'error') + '</code>. ' + why, parts: snap(hl2) });
      });
      frames.push({ narr: 'Finished with ' + netCalls + ' network call(s). Cache-first saves the most data; network-first is the freshest; SWR is the best blend of speed and freshness for data that can be a little old.', parts: snap() });
      return frames;
    }
  }],
  examples: [
    {
      title: 'Choosing a strategy for an e-commerce app',
      html: `<p>Map each kind of request to the right behaviour:</p>
        ${H.table(['Request', 'Strategy', 'Why'], [
          ['<code>/app.4f9c2a.js</code> (hash in the name)', '<b>cache-first</b>', 'The name changes when the content changes, so a cached copy is never wrong'],
          ['<code>/</code> and <code>/product/42</code> (HTML)', '<b>network-first</b> + offline page', 'New deploys and prices should show up, but offline still works'],
          ['<code>/api/products?page=2</code>', '<b>stale-while-revalidate</b>', 'Instant lists; data may be a few seconds old'],
          ['product images', '<b>cache-first</b> with a size limit', 'Big, rarely change; trim old ones'],
          ['<code>POST /api/checkout</code>', '<b>network-only</b>', 'Must never be replayed from cache; handle offline with a queue (next topic)']
        ])}`
    },
    {
      title: 'The "my users are stuck on the old version" bug',
      html: `<p>You deploy a fix, but users still see the bug. Three usual causes: (1) <code>sw.js</code> was served with <code>Cache-Control: max-age=31536000</code>. Modern browsers skip the HTTP cache for the main worker file, but not for scripts it loads with <code>importScripts</code>, and older setups used the cached copy (serve both with <code>no-cache</code>); (2) the new worker is <b>waiting</b> because a tab with the old one is still open; (3) you cache <code>index.html</code> cache-first, so the old HTML points at old JS. Fixes: network-first for HTML, versioned cache names, and an in-app "New version available - reload" prompt that calls <code>registration.waiting.postMessage({type: 'SKIP_WAITING'})</code>.</p>`,
      code: { lang: 'js', title: 'Prompt-to-update flow', code: `// page side
navigator.serviceWorker.register('/sw.js').then(reg => {
  reg.addEventListener('updatefound', () => {
    const next = reg.installing;
    next.addEventListener('statechange', () => {
      if (next.state === 'installed' && navigator.serviceWorker.controller) {
        // A new version is ready and an old one is still running: ask the user.
        if (confirm('New version available. Reload?')) next.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  });
});
navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());

// sw.js side
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });` }
    },
    {
      title: 'Workbox: the same thing in 10 lines',
      html: `<p>Writing strategies by hand is educational; production teams often use <b>Workbox</b> (Google's library), which provides routing, strategies, expiration plugins and precaching tied to your build (the manifest of hashed files is injected automatically). Use hand-written code in interviews to show you understand it, and Workbox in real projects to avoid bugs.</p>`,
      code: { lang: 'js', check: false, title: 'Workbox version', code: `import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

precacheAndRoute(self.__WB_MANIFEST);                       // hashed build files, injected at build time

registerRoute(({ request }) => request.mode === 'navigate', new NetworkFirst({ networkTimeoutSeconds: 3 }));
registerRoute(({ url }) => url.pathname.startsWith('/api/'), new StaleWhileRevalidate({ cacheName: 'api' }));
registerRoute(({ request }) => request.destination === 'image',
  new CacheFirst({ cacheName: 'img', plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 3600 })] }));` }
    }
  ],
  deepDive: `<p><b>Scope and control.</b> A worker at <code>/sw.js</code> controls everything under <code>/</code>; a worker at <code>/app/sw.js</code> controls only <code>/app/</code> (unless the server sends <code>Service-Worker-Allowed</code>). A page is controlled only if it was loaded <i>after</i> activation (or the worker called <code>clients.claim()</code>). One origin, one worker per scope. Workers are <b>event-driven and short-lived</b>: the browser kills them when idle, so never keep state in global variables — use Cache Storage or IndexedDB. Use <code>event.waitUntil(promise)</code> to keep the worker alive until async work (caching, sync) finishes.</p>
    <p><b>Cache Storage gotchas.</b> (1) A <code>Response</code> body is a stream, readable once — clone before <code>put</code>. (2) Opaque responses from cross-origin no-cors requests have unknown status and are padded to ~7 MB each in quota accounting; avoid caching them blindly. (3) Cache matching ignores nothing by default: <code>/a?x=1</code> and <code>/a?x=2</code> are different entries (use <code>ignoreSearch</code> deliberately). (4) <code>Vary</code> headers affect matching. (5) Storage is quota-limited and evictable: call <code>navigator.storage.persist()</code> for important data, and trim caches (max entries/age) so images do not eat the quota. (6) Range requests (video) need special handling.</p>
    <p><b>Update safety.</b> Treat the precache as a <b>transaction</b>: if any file fails in <code>addAll</code>, the install fails and the old worker keeps running. That is why hashed filenames plus version-named caches are so reliable: the new worker builds a complete new shelf before replacing the old one. Combine with a "kill switch" worker (a tiny sw.js that unregisters itself and clears caches) for emergencies.</p>
    <p><b>Beyond caching.</b> The <b>Push API</b> + <b>Notifications API</b> re-engage users (iOS supports web push for installed PWAs since 16.4). <b>Background Sync</b> and <b>Periodic Background Sync</b> run work when connectivity returns (Chromium; Safari/Firefox limited), <b>Navigation Preload</b> lets the network request start while the worker boots, and the <b>App Shell</b> pattern serves a minimal UI instantly, then fills content. Performance: a worker adds boot cost (tens of ms) to the first request after idle, so avoid heavy work in <code>fetch</code> handlers. Measure with Lighthouse's PWA audits and the Application tab in DevTools (Offline checkbox, "Update on reload", Clear storage).</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants write a working service worker from a one-line request, which is exactly the danger: the code <i>works on the first visit</i> and fails at the <i>second deployment</i>. Update flow, cache invalidation and "stuck on old version" bugs are subtle and only show up in production over days.</p>
    <p><b>Use AI as a partner:</b> ask it <code>Review this sw.js for update-flow bugs: what happens on the second deploy? What happens if one file in addAll 404s?</code> Ask it to list each route's strategy in a table and justify it, then challenge the table yourself. Use it to generate Playwright tests that go offline (<code>context.setOffline(true)</code>) and assert the offline page.</p>
    <p><b>Where AI goes wrong:</b> it caches POST responses, caches <code>sw.js</code> or <code>index.html</code> cache-first, forgets to clone responses, uses one global cache name forever, or calls <code>skipWaiting()</code> unconditionally (which can mix old pages with new JS). <b>What you must still own:</b> the strategy per resource, the versioning and kill-switch plan, privacy (never cache authenticated or personal responses in a shared cache) and the decision of whether you need a PWA at all.</p>`,
  problems: [{
    title: 'Network-First With Timeout and Cache Fallback',
    level: 'Medium', tags: ['service worker', 'caching', 'strategy'], companies: ['Google', 'Starbucks', 'Pinterest'],
    statement: `<p>Implement <code>networkFirst(url, cache, net, timeoutMs)</code>. <code>cache</code> is a <code>Map</code> from url to body. <code>net(url)</code> simulates the network and returns <code>{ ok: boolean, ms: number, body?: string }</code> (<code>ms</code> is how long it took).</p>
      <ul><li>If the network answered <code>ok</code> within <code>timeoutMs</code> → store the body in <code>cache</code> and return <code>{ source: 'network', body }</code>.</li>
      <li>Otherwise (failed or too slow) → if the cache has the url return <code>{ source: 'cache', body }</code>.</li>
      <li>If there is no cached copy but the network did answer ok (just slowly) → store it and return <code>{ source: 'network-slow', body }</code>.</li>
      <li>Else return <code>{ source: 'error', body: null }</code>.</li></ul>`,
    constraints: `0 ≤ timeoutMs ≤ 60000. Call net(url) exactly once per request.`,
    example: `${H.table(['network result', 'cache has url?', 'answer'], [['ok, 120 ms (timeout 3000)', 'either', '<span class="c-g">network</span>, cache updated'], ['ok, 5000 ms', 'yes', '<span class="c-y">cache</span> (user is not made to wait)'], ['ok, 5000 ms', 'no', '<span class="c-b">network-slow</span>'], ['fail', 'no', '<span class="c-r">error</span>']])}`,
    brute: {
      why: `<p>Plain network-first has no timeout: on a "lie-fi" connection (connected but crawling) the user stares at a spinner for 60 seconds even though a perfectly good cached copy sits on the shelf.</p>`,
      code: `function networkFirstBrute(url, cache, net) {
  const r = net(url);                                   // waits however long it takes
  if (r.ok) { cache.set(url, r.body); return { source: 'network', body: r.body }; }
  return cache.has(url) ? { source: 'cache', body: cache.get(url) } : { source: 'error', body: null };
}`
    },
    mcq: { q: 'Why add a timeout to network-first?', options: ['A slow network is as bad as no network; fall back to cache after a short wait', 'Timeouts make responses cacheable', 'Service workers cannot make requests without one'], answer: 0, explain: 'On very slow connections the user would wait too long. A short timeout (2-4 s) lets the cached copy answer instead.' },
    hints: [
      `<p>Hint 1: "ok but too slow" and "failed" are the same case for the user: neither delivered in time. Compute <code>fast = r.ok &amp;&amp; r.ms &lt;= timeoutMs</code>.</p>`,
      `<p>Hint 2: order the checks: fast network → cache hit → slow-but-ok network → error.</p>`,
      `<p>Hint 3: remember to update the cache whenever you got a good body, even a slow one (it is fresher than what you have). Use <code>cache.has</code> instead of truthiness so an empty string body counts as cached.</p>`
    ],
    solution: {
      approach: `<p>One call to the network, then a decision ladder. A good body is always written to the cache because it is the newest copy; the ladder only decides what to <i>return</i>.</p>`,
      code: { lang: 'js', run: true, code: `// Read the OLD copy first: a good network answer overwrites the cache entry.
function networkFirst(url, cache, net, timeoutMs) {
  const old = cache.has(url) ? cache.get(url) : undefined;   // remember the previous copy first
  const r = net(url);
  if (r.ok) cache.set(url, r.body);
  if (r.ok && r.ms <= timeoutMs) return { source: 'network', body: r.body };
  if (old !== undefined) return { source: 'cache', body: old };
  if (r.ok) return { source: 'network-slow', body: r.body };
  return { source: 'error', body: null };
}

const cache = new Map([['/api/cart', 'cart-v1']]);
console.log(networkFirst('/api/cart', cache, () => ({ ok: true, ms: 120, body: 'cart-v2' }), 3000));
console.log(networkFirst('/api/cart', cache, () => ({ ok: true, ms: 5000, body: 'cart-v3' }), 3000));
console.log(networkFirst('/new', cache, () => ({ ok: true, ms: 5000, body: 'new-v1' }), 3000));
console.log(networkFirst('/gone', cache, () => ({ ok: false, ms: 10 }), 3000));` },
      dry: { head: ['case', 'old copy', 'net result', 'answer'], rows: [['fast ok', 'cart-v1', 'ok 120ms', 'network (cart-v2)'], ['slow ok, has old', 'cart-v2', 'ok 5000ms', 'cache (cart-v2), cache updated to v3'], ['slow ok, no old', 'none', 'ok 5000ms', 'network-slow'], ['fail, no old', 'none', 'fail', 'error']] },
      complexity: `<p>Time O(1) per request (Map lookups), space O(1) extra.</p>`,
      followUps: ['In a real service worker how do you implement the timeout? (Promise.race with a timer, but keep the fetch going to fill the cache.)', 'Which responses should you refuse to cache?', 'How would you add a max-entries limit?']
    }
  }]
});

/* ===================== TOPIC 6: Offline-first & background sync ===================== */
topics.push({
  title: 'Offline-First Apps: Local Database, Outbox Queue & Background Sync',
  analogy: `<p>Think of writing <b>postcards on a long train trip</b>. You write each card the moment you feel like it and drop it in your bag (the <b>outbox</b>). You never wait for a post box before you are allowed to write. When the train pulls into a station with a post box (connection back), you post the cards <b>in the order you wrote them</b>. If the post box jams halfway, you keep the rest and try again later. And each card carries a number, so if the post office says "did you send card 7 twice?", they can throw the duplicate away. That is <b>offline-first</b>: the local bag is the truth you work with; the network is only a delivery service.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> Most apps are <b>online-first</b>: click a button → wait for the server → show the result. If the network drops, the app shows an error. An <b>offline-first</b> app flips the order: the UI always reads and writes a <b>local database</b> on the device, and a background process <b>synchronises</b> with the server whenever it can. The user never needs to know if they are online.</p>
    <p>Building blocks:</p>
    <ul>
      <li><b>Local store</b>: <b>IndexedDB</b> (structured data, large, async) — not localStorage (tiny, synchronous, strings only). Libraries: <code>idb</code>, Dexie, RxDB, PouchDB.</li>
      <li><b>Optimistic UI</b>: show the change instantly (a new todo appears), mark it "pending".</li>
      <li><b>Outbox queue</b>: every change is also appended to a list of "things the server has not heard yet".</li>
      <li><b>Sync</b>: when online, send outbox items <b>in order</b>; remove each one only after the server confirms.</li>
      <li><b>Retry with backoff</b>: if sending fails, wait 1 s, 2 s, 4 s, 8 s... (plus a little random jitter) so a recovering server is not hammered by thousands of clients at once.</li>
      <li><b>Idempotency key</b>: a unique id on each message, so a retry can never create a duplicate order.</li>
    </ul>
    <p><b>🔵 Background Sync.</b> What if the user closes the tab while offline? The <b>Background Sync API</b> lets the service worker say "wake me up when the network returns", then run the flush even though no page is open. (Today it works in Chromium browsers; on Safari/Firefox you also flush when the app opens or the <code>online</code> event fires — always keep this fallback.)</p>
    ${H.table(['Moment', 'What the app does'], [
      ['User taps "Add to cart" (offline)', 'Write to IndexedDB, append <code>{id, type, payload}</code> to outbox, UI updates at once'],
      ['Connection returns', '<code>online</code> event / sync event → flush outbox oldest-first'],
      ['A send fails (timeout, 503)', 'Keep it, schedule retry with exponential backoff'],
      ['Server says 4xx "invalid"', '<b>Drop it</b> from the outbox (retrying will never work) and tell the user'],
      ['Same id arrives twice', 'Server returns the old result, creates nothing new']
    ])}
    <p><b>🟣 Conflicts.</b> Two devices edit the same note offline. When both sync, who wins? Simple answers: <b>last write wins</b> (compare timestamps/versions), <b>field-level merge</b> (title from device A, body from device B), or <b>CRDTs</b> (data types that merge automatically, used in collaborative editors). Pick the simplest rule that does not lose data users care about, and make it visible ("This note changed on another device").</p>`,
  clues: [
    '"App must work with <b>poor or no connectivity</b>" (field workers, trains, emerging markets)',
    '"Don\'t lose the user\'s submission if the network drops" → outbox + retry + idempotency',
    '"Two devices edit the same record" → conflict resolution: last-write-wins, merge, or CRDT',
    '"Show data instantly, sync later" → local-first store + optimistic UI',
    '"Retry storms after an outage" → exponential backoff <b>with jitter</b>',
    '"Duplicate orders after a retry" → idempotency key on the request'
  ],
  code: [
    {
      lang: 'js', check: false, title: 'Outbox in IndexedDB + Background Sync registration (page side)',
      code: `import { openDB } from 'idb';

const dbPromise = openDB('shop', 1, {
  upgrade(db) {
    db.createObjectStore('todos', { keyPath: 'id' });
    db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: false });
  }
});

export async function addTodo(text) {
  const db = await dbPromise;
  const entry = { id: crypto.randomUUID(), text, pending: true };      // id doubles as the idempotency key
  const tx = db.transaction(['todos', 'outbox'], 'readwrite');         // ONE transaction: both or neither
  tx.objectStore('todos').put(entry);
  tx.objectStore('outbox').put({ id: entry.id, url: '/api/todos', body: entry, createdAt: Date.now() });
  await tx.done;

  const reg = await navigator.serviceWorker.ready;
  if ('sync' in reg) await reg.sync.register('flush-outbox');          // wake the worker when online
  else flushOutbox();                                                   // fallback: Safari / Firefox
  return entry;                                                          // UI shows it instantly
}`
    },
    {
      lang: 'js', title: 'Service worker side: the sync event flushes the outbox',
      code: `// sw.js
self.addEventListener('sync', event => {
  if (event.tag === 'flush-outbox') event.waitUntil(flushOutbox());   // browser retries the whole event if this rejects
});

async function flushOutbox() {
  const db = await openOutboxDb();                    // helper: opens IndexedDB (omitted)
  const items = await db.getAll('outbox');            // oldest first
  for (const item of items) {
    const res = await fetch(item.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.id },
      body: JSON.stringify(item.body)
    });
    if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
      await db.delete('outbox', item.id);              // success, OR the server will never accept it: stop retrying
    } else {
      throw new Error('server busy: ' + res.status);   // keep this + the rest, the browser will retry later
    }
  }
}`
    },
    {
      lang: 'js', run: true, title: 'Runnable model: outbox + idempotent server + lost reply + backoff',
      code: `// Server: remembers ids it has already processed, so duplicates are harmless.
function makeServer() {
  const seen = new Set(), saved = [];
  let loseReplyOnce = false;
  return {
    saved: saved,
    loseNextReply() { loseReplyOnce = true; },
    receive(msg) {
      if (seen.has(msg.id)) console.log('   server: duplicate', msg.id, 'ignored (idempotent)');
      else { seen.add(msg.id); saved.push(msg.text); console.log('   server: saved', msg.id, msg.text); }
      if (loseReplyOnce) { loseReplyOnce = false; throw new Error('reply lost on the way back'); }
      return 'ok';
    }
  };
}

// Exponential backoff with a cap (add random jitter in real life: Math.random() * delay)
const backoff = attempt => Math.min(30000, 1000 * Math.pow(2, attempt));

function makeClient(server) {
  let online = true, n = 0, attempt = 0;
  const outbox = [], local = [];
  const api = {
    local: local, outbox: outbox,
    post(text) {
      const msg = { id: 'm' + (++n), text: text };
      local.push(text);                 // optimistic: the user sees it immediately
      outbox.push(msg);                 // and it waits for delivery
      console.log('user posts', text, '| online:', online);
      api.flush();
    },
    setOnline(v) { online = v; console.log('network ->', v ? 'ONLINE' : 'OFFLINE'); if (v) api.flush(); },
    flush() {
      while (online && outbox.length) {
        try { server.receive(outbox[0]); outbox.shift(); attempt = 0; }
        catch (e) {
          console.log('   send failed (' + e.message + '); retry in', backoff(attempt++) + 'ms; kept', outbox.length, 'item(s)');
          return false;                 // stop: preserve ORDER, never skip ahead
        }
      }
      return true;
    }
  };
  return api;
}

const server = makeServer(), client = makeClient(server);
client.post('milk');
client.setOnline(false);
client.post('eggs'); client.post('bread');
server.loseNextReply();                 // the server will save 'eggs' but the answer gets lost
client.setOnline(true);                 // flush: eggs saved but looks failed
client.flush();                         // retry: eggs sent AGAIN -> duplicate ignored; bread goes through
console.log('local   :', client.local.join(', '));
console.log('server  :', server.saved.join(', '), '| outbox left:', client.outbox.length);`
    }
  ],
  codeTitle: ['Page: write local + queue + register sync', 'Service worker: flush on sync', 'Runnable outbox model'],
  viz: {
    title: 'Offline queue and background sync',
    input: 'milk offline eggs bread flaky online',
    inputLabel: 'Items to add (any word), plus offline / online / flaky (next send reaches the server but the reply is lost)',
    gen: function (input) {
      var t = words(input, 12, 'Example: milk offline eggs bread flaky online');
      var online = true, outbox = [], local = [], server = [], seen = {}, flaky = false, n = 0, attempt = 0;
      function snap(hlO, hlS) { return [
        { type: 'set', label: 'Local database (what the user sees)', items: local.slice() },
        { type: 'queue', label: 'Outbox (waiting to reach the server)', items: outbox.map(function (m) { return m.id + ':' + m.text; }), frontLabel: 'oldest', backLabel: 'newest', hl: hlO || {} },
        { type: 'set', label: 'Server database', items: server.slice(), hl: hlS || {} },
        { type: 'vars', vals: { network: online ? 'ONLINE' : 'OFFLINE', pending: outbox.length, 'next retry (ms)': attempt ? Math.min(30000, 1000 * Math.pow(2, attempt - 1)) : '-' }, hl: { network: online ? 'ok' : 'bad' } }
      ]; }
      var frames = [{ narr: 'Everything starts empty and online. The UI always works against the <b>local database</b>; the outbox holds changes the server has not confirmed.', parts: snap() }];
      function flush(label) {
        var guard = 0;
        while (online && outbox.length && guard++ < 20) {
          var m = outbox[0];
          var dup = !!seen[m.id];
          if (!dup) { seen[m.id] = 1; server.push(m.text); }
          var hlS = {}; hlS[m.text] = dup ? 'bad' : 'ok';
          if (flaky) {
            flaky = false; attempt++;
            frames.push({ narr: 'Sending <b>' + m.id + ' (' + m.text + ')</b>: the server ' + (dup ? '<span class="c-r">already had it, ignores the duplicate</span>' : '<span class="c-g">saved it</span>') + ', but the reply is <b>lost</b>. The client thinks it failed, keeps it in the outbox and waits (exponential backoff) before retrying.', parts: snap({ 0: 'bad' }, hlS) });
            frames.push({ narr: 'Backoff timer fires and the client retries <b>' + m.id + '</b> with the <b>same idempotency key</b>. Without that key we would now have the item twice.', parts: snap({ 0: 'cur' }) });
            continue;
          }
          outbox.shift(); attempt = 0;
          frames.push({ narr: (label || 'Flush') + ': sent <b>' + m.id + ' (' + m.text + ')</b> → ' + (dup ? '<span class="c-y">server saw this id before, answers OK without creating a second copy</span> → removed from the outbox.' : '<span class="c-g">server saved it</span> and confirmed → removed from the outbox.'), parts: snap({}, hlS) });
        }
      }
      t.forEach(function (tok) {
        if (tok === 'offline') { online = false; frames.push({ narr: 'The network drops. The app does <b>not</b> show an error. New work will go to the outbox.', parts: snap() }); return; }
        if (tok === 'online') { online = true; frames.push({ narr: 'The network is back (<code>online</code> event / background sync fires). Time to flush the outbox, oldest first.', parts: snap() }); flush('Sync'); return; }
        if (tok === 'flaky') { flaky = true; frames.push({ narr: 'Pretend the <b>next</b> send will be saved by the server but its reply will be lost on the way back.', parts: snap() }); return; }
        n++; var msg = { id: 'm' + n, text: tok };
        local.push(tok); outbox.push(msg);
        frames.push({ narr: 'User adds <b>' + H.esc(tok) + '</b>. It appears in the UI <b>instantly</b> (optimistic) and a message with id <code>' + msg.id + '</code> joins the outbox.', parts: snap({ [outbox.length - 1]: 'win' }) });
        if (online) flush('Online, so send right away');
        else frames.push({ narr: 'Offline, so it simply stays queued. The user is not blocked.', parts: snap() });
      });
      frames.push({ narr: outbox.length ? 'Still offline: ' + outbox.length + ' item(s) wait safely in IndexedDB, even if the tab is closed.' : 'All changes are on the server exactly once, in the original order.', parts: snap() });
      return frames;
    }
  },
  examples: [
    {
      title: 'Which storage for which job?',
      html: `${H.table(['Store', 'Good for', 'Limits'], [
        ['<b>IndexedDB</b>', 'Structured app data, the outbox, drafts, search indexes', 'Async API; hundreds of MB to GBs (browser-dependent quota)'],
        ['<b>Cache Storage</b>', 'HTTP responses (files, API replies) for the service worker', 'Keyed by request; evictable'],
        ['<b>localStorage</b>', 'Tiny settings (theme)', '~5 MB, <span class="c-r">synchronous</span> (blocks the main thread), strings only, not available in workers'],
        ['<b>OPFS</b> (Origin Private File System)', 'Big files, SQLite-in-the-browser (WASM)', 'Newer API; great for performance']
      ])}<p>Rule: <b>data</b> goes in IndexedDB, <b>responses</b> go in Cache Storage, <b>preferences</b> in localStorage.</p>`
    },
    {
      title: 'Handling conflicts: three levels',
      html: `<p>Notes app. Phone edits title offline at 10:01, laptop edits the same note body at 10:02. When they sync:</p>
        ${H.table(['Rule', 'Result', 'Trade-off'], [
          ['<b>Last write wins</b> (whole record)', 'Laptop version replaces phone version; title edit is lost', 'Simple, can silently lose data'],
          ['<b>Field-level LWW</b>', 'Title from phone, body from laptop', 'Keeps both edits; still loses same-field conflicts'],
          ['<b>CRDT / operational merge</b>', 'Character-level merge', 'Great for text; complex to build (use Yjs / Automerge)']
        ])}
        <p>Never trust device clocks alone (a phone with the wrong date always "wins"): use server-assigned versions or logical clocks (Lamport / hybrid logical clocks).</p>`
    },
    {
      title: 'Optimistic UI with rollback',
      html: `<p>Optimistic means "pretend it worked". It is great for likes, todos and cart changes, but when the server later rejects (stock ran out), you must <b>roll back and explain</b>. Keep each pending item's status (<code>pending | synced | failed</code>) so the UI can show a small clock icon, a green tick, or a red "Couldn't save - retry".</p>`,
      code: { lang: 'js', run: true, title: 'Status transitions', code: `const todos = [{ id: 't1', text: 'Buy milk', status: 'pending' }];
function onServerReply(id, result) {
  const t = todos.find(x => x.id === id);
  if (result.ok) t.status = 'synced';
  else { t.status = 'failed'; t.error = result.reason; }    // keep it visible so the user can retry or edit
}
onServerReply('t1', { ok: false, reason: 'out of stock' });
console.log(todos);` }
    }
  ],
  deepDive: `<p><b>Why the outbox must be written in the same transaction as the data.</b> If you update the todos table and <i>then</i> the browser crashes before appending to the outbox, the server never hears about it: data is stuck local-only forever. IndexedDB transactions across multiple stores solve this (the "transactional outbox" pattern from backend systems, applied in the browser). On the server, the matching defence is an <b>idempotency key</b> table with a unique constraint: insert the key and the effect in one transaction, so a retry returns the stored result.</p>
    <p><b>Ordering and dependencies.</b> A strict FIFO queue is safest, but one poisoned message can block everything. Use per-entity ordering (messages touching the same todo stay ordered, different todos may go in parallel) and a dead-letter state for messages that fail permanently (4xx). Collapse redundant messages (create + 3 edits + delete of the same object can be sent as nothing at all) to save bandwidth.</p>
    <p><b>Retry maths.</b> Exponential backoff delay = min(cap, base · 2<sup>attempt</sup>). Add <b>jitter</b>: random(0, delay) ("full jitter") so 10,000 clients that lost connection at the same instant do not all retry at t = 1 s, 2 s, 4 s in lockstep. Honour <code>Retry-After</code> headers and treat 429/503 as "slow down", 4xx as "stop".</p>
    <p><b>Platform realities.</b> <code>navigator.onLine</code> only says whether a network <i>interface</i> exists, not whether your server is reachable (captive portals, lie-fi), so treat a failed request as the real signal. Background Sync one-off events are only in Chromium; Periodic Background Sync needs an installed PWA and engagement. iOS may evict storage for sites unused for ~7 days unless installed to the home screen, so the server stays the long-term source of truth. Encrypt or limit sensitive data stored locally; log out should clear IndexedDB and caches. For a full <b>local-first</b> design, sync engines (Replicache, ElectricSQL, PowerSync, Zero) replace the hand-written outbox with a protocol that handles diffs, conflicts and partial replication.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI features (chat, summaries) are online-only by nature, and users now expect them anywhere. On-device models (WebGPU / WebNN, small local LLMs) make some assistant features possible offline, which brings offline-first thinking back. Chat apps also use exactly this outbox pattern: your prompt is saved locally, sent when possible, and the streamed answer is stored for later.</p>
    <p><b>Use AI as a partner:</b> ask <code>List the failure cases for this sync function: crash between local write and outbox write, duplicate delivery, out-of-order delivery, clock skew. Write a test for each.</code> Use it to generate property-based tests (randomly drop/duplicate/reorder messages and check the final server state equals the expected one).</p>
    <p><b>Where AI goes wrong:</b> its sample code saves to <code>localStorage</code>, retries without a cap or jitter, deletes the outbox item <i>before</i> the server confirms, or ignores idempotency completely. <b>What you must still own:</b> choosing the conflict rule with the product team, the data-retention and privacy policy for local data, and the user-visible states (pending, failed, conflict).</p>`,
  problems: [{
    title: 'Offline Outbox Flush (Ordered, Stop on Failure)',
    level: 'Easy', tags: ['offline-first', 'queue', 'sync'], companies: ['Notion', 'Slack', 'WhatsApp'],
    statement: `<p>Write <code>flush(outbox, send)</code>. <code>outbox</code> is an array of messages (oldest first) and <code>send(msg)</code> returns <code>true</code> if the server confirmed the message and <code>false</code> if it failed.</p>
      <p>Send the messages <b>in order</b>. After a failure <b>stop immediately</b> (do not skip to later messages, so order is preserved). Return <code>{ sent: [...], remaining: [...] }</code> where <code>sent</code> holds the messages confirmed, and <code>remaining</code> holds the failed one and everything after it. Do not modify the input array.</p>`,
    constraints: `0 ≤ outbox.length ≤ 10<sup>4</sup>. send is called at most once per message per flush.`,
    example: `<p>outbox: <code>[m1, m2, m3, m4]</code>; send fails for <code>m3</code>.</p>
      ${H.table(['message', 'send result', 'action'], [['m1', 'true', 'sent'], ['m2', 'true', 'sent'], ['m3', '<span class="c-r">false</span>', 'STOP'], ['m4', '(never tried)', 'stays queued']])}<p>Output: <code>sent = [m1, m2]</code>, <code>remaining = [m3, m4]</code>.</p>`,
    brute: {
      why: `<p>A common mistake: try every message and just remove the successful ones. If <code>m3</code> fails but <code>m4</code> succeeds, the server now sees m4 before m3. For "create list, then add item to list" that order flip is a bug. Also deleting while looping skips elements.</p>`,
      code: `function flushBrute(outbox, send) {
  const sent = [], remaining = [];
  for (const m of outbox) {
    if (send(m)) sent.push(m); else remaining.push(m);   // BUG: keeps going after a failure -> reorders delivery
  }
  return { sent, remaining };
}`
    },
    mcq: { q: 'After one message fails, what should a strict ordered outbox do with later messages?', options: ['Keep them queued and retry the failed one first later', 'Send them anyway and retry the failed one at the end', 'Delete them to avoid duplicates'], answer: 0, explain: 'Later messages may depend on earlier ones. Stopping at the first failure preserves order; idempotency keys make the later retry safe.' },
    hints: [
      `<p>Hint 1: this is a queue with "peek, try, then pop only on success". Index <code>i</code> marks the first unsent message.</p>`,
      `<p>Hint 2: loop with an index; when <code>send</code> returns false, <code>break</code>. Use <code>slice</code> to build the two result arrays.</p>`,
      `<p>Hint 3: edge cases: empty outbox, everything succeeds (remaining = []), first one fails (sent = []). Do not mutate the input.</p>`
    ],
    solution: {
      approach: `<p>Walk forward with an index. The moment <code>send</code> fails, remember that index and stop. Everything before it was sent; everything from it onward remains. This keeps global order and is trivially safe to retry later.</p>`,
      code: { lang: 'js', run: true, code: `function flush(outbox, send) {
  let i = 0;
  while (i < outbox.length && send(outbox[i])) i++;      // advance only on confirmed success
  return { sent: outbox.slice(0, i), remaining: outbox.slice(i) };
}

const failOn = new Set(['m3']);
const send = m => !failOn.has(m);
console.log(JSON.stringify(flush(['m1', 'm2', 'm3', 'm4'], send)));
console.log(JSON.stringify(flush([], send)));
console.log(JSON.stringify(flush(['m1', 'm2'], send)));
console.log(JSON.stringify(flush(['m3', 'm1'], send)));` },
      dry: { head: ['i', 'message', 'send()', 'next'], rows: [['0', 'm1', 'true', 'i = 1'], ['1', 'm2', 'true', 'i = 2'], ['2', 'm3', 'false', 'stop, i = 2']] },
      complexity: `<p>Time O(k) where k is the number of attempted sends (≤ n); space O(n) for the result slices.</p>`,
      followUps: ['Add exponential backoff between attempts.', 'Allow parallel sends for messages that touch different entities.', 'Treat HTTP 4xx as permanent: move the message to a dead-letter list instead of blocking the queue.']
    }
  }]
});

/* ===================== TOPIC 7: Internationalization ===================== */
topics.push({
  title: 'Internationalization (i18n): Messages, Plurals, Dates & Right-to-Left',
  analogy: `<p>Imagine a <b>travelling theatre company</b>. The script (your app) is the same everywhere, but the actors must speak the local language, use local money, say dates the local way, and sometimes the audience reads right to left. A bad company writes the whole play in English with sentences glued together from word cards ("You have" + 3 + "new messages") and is then shocked that Polish needs <i>three different</i> endings for the word "message". A good company keeps the <b>script separate from the lines</b>: every line lives in a language book with room for the grammar of that language.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> <b>Internationalization (i18n)</b> means building your app <i>so that it can</i> support many languages and regions without changing code. <b>Localization (l10n)</b> means actually providing a specific language/region (French, Japanese, Arabic). (i18n = "i + 18 letters + n".) Do the first once; do the second many times.</p>
    <p>The rules that avoid 90% of pain:</p>
    <ol>
      <li><b>No user-visible text in code.</b> Use keys: <code>t('cart.title')</code>. Each language has a <b>message catalog</b> (JSON or .po/.xlf files).</li>
      <li><b>Never glue strings together.</b> Word order, gender and plurals differ per language. Give translators the <i>whole sentence</i> with placeholders: <code>"{count} items in {place}"</code>.</li>
      <li><b>Use the browser's <code>Intl</code> API</b> (or a library) for numbers, currency, dates, lists and relative time. Never hand-format "1,234.56" or "MM/DD/YYYY".</li>
      <li><b>Plurals are rules, not "add an s".</b> Use <b>ICU MessageFormat</b>.</li>
      <li><b>Design for expansion and direction.</b> German text is often 30% longer; Arabic and Hebrew are <b>right-to-left (RTL)</b>.</li>
    </ol>
    <p><b>🔵 Plurals: the classic interview trap.</b> English has two forms (1 item, 2 items). Other languages need more. The Unicode <b>CLDR</b> project defines six <b>plural categories</b>: <code>zero, one, two, few, many, other</code>. Each language uses only some of them:</p>
    ${H.table(['Language', 'Categories used', 'Example rule'], [
      ['English', 'one, other', '<code>1</code> → one; everything else → other'],
      ['French', 'one, other (many for millions)', '<code>0</code> and <code>1</code> → one'],
      ['Russian', 'one, few, many, other', '1, 21, 31 → one; 2-4, 22-24 → few; 0, 5-20, 25-30 → many'],
      ['Polish', 'one, few, many, other', 'like Russian, but only exactly <code>1</code> is "one"'],
      ['Arabic', 'zero, one, two, few, many, other', 'all six: 0, 1, 2, 3-10, 11-99, 100+'],
      ['Japanese / Chinese', 'other', 'no plural distinction at all']
    ])}
    <p>An <b>ICU message</b> puts all forms in one string: <code>{count, plural, one {# item} other {# items}}</code>. The <code>#</code> is replaced by the formatted number. The translator for Russian simply writes <code>one</code>, <code>few</code>, <code>many</code> blocks. Your code never needs an <code>if (n === 1)</code>. There is also <code>select</code> for gender or any switch: <code>{gender, select, female {She} male {He} other {They}}</code>.</p>
    <p><b>🟣 Locale = language + region.</b> <code>en-US</code> and <code>en-GB</code> share words but differ in dates and spelling; <code>pt-BR</code> and <code>pt-PT</code> differ a lot. Always have a <b>fallback chain</b>: <code>fr-CA → fr → en</code>.</p>`,
  clues: [
    '"Support <b>10 languages</b> / global rollout / enterprise customers in Japan and Saudi Arabia"',
    '"1 item vs 2 items" / "Russian has 3 forms" → ICU plural categories, not <code>n === 1 ? "" : "s"</code>',
    '"Dates and currency shown wrongly for some users" → <code>Intl.DateTimeFormat</code> / <code>Intl.NumberFormat</code> + time zones',
    '"Layout breaks in German / Arabic" → text expansion, flexible layouts, <b>RTL</b> + logical CSS properties',
    '"Load only the user\'s language to keep the bundle small" → lazy-loaded catalogs per locale',
    '"Translations are missing for a key" → fallback chain + CI check for missing/unused keys'
  ],
  code: [
    {
      lang: 'json', title: 'Message catalogs: same keys, grammar lives with the translator',
      code: `{
  "en": {
    "cart.items": "{count, plural, =0 {Your cart is empty} one {# item in your cart} other {# items in your cart}}",
    "inbox.summary": "{name} sent you {count, plural, one {a message} other {# messages}}"
  },
  "ru": {
    "cart.items": "{count, plural, =0 {Корзина пуста} one {# товар в корзине} few {# товара в корзине} many {# товаров в корзине} other {# товара в корзине}}",
    "inbox.summary": "{name} отправил вам {count, plural, one {# сообщение} few {# сообщения} many {# сообщений} other {# сообщения}}"
  }
}`
    },
    {
      lang: 'js', run: true, title: 'Runnable model: plural rules, ICU-style picking, locale fallback, Intl cross-check',
      code: `// ---- 1. CLDR-style plural rules for whole numbers (a small, correct subset) ----
const rules = {
  en: n => (n === 1 ? 'one' : 'other'),
  fr: n => (n === 0 || n === 1 ? 'one' : 'other'),
  ja: () => 'other',
  ru: n => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'one';
    if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return 'few';
    return 'many';
  },
  pl: n => {
    const m10 = n % 10, m100 = n % 100;
    if (n === 1) return 'one';
    if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return 'few';
    return 'many';
  }
};

// ---- 2. Locale fallback: "fr-CA" -> "fr" -> default ----
function pickLocale(requested, available, fallback) {
  const parts = requested.split('-');
  while (parts.length) {
    const tag = parts.join('-');
    if (available.includes(tag)) return tag;
    parts.pop();                                   // drop the region, then try again
  }
  return fallback;
}

// ---- 3. Choose a plural form from a message {one:..., few:..., other:...} ----
const catalog = {
  en: { one: '# item', other: '# items' },
  ru: { one: '# товар', few: '# товара', many: '# товаров', other: '# товара' }
};
function formatCount(locale, n) {
  const loc = pickLocale(locale, Object.keys(catalog), 'en');
  const cat = rules[loc](n);
  const form = catalog[loc][cat] || catalog[loc].other;      // always have "other" as the safety net
  return form.replace('#', String(n));
}

[0, 1, 2, 5, 11, 21, 22, 25].forEach(n => console.log('ru', String(n).padStart(2), rules.ru(n).padEnd(5), formatCount('ru-RU', n)));
console.log('en', formatCount('en-GB', 1), '|', formatCount('en-GB', 3));

// ---- 4. The platform already knows these rules: cross-check ours against Intl ----
let same = 0, total = 0;
['en', 'fr', 'ru', 'pl', 'ja'].forEach(loc => {
  const pr = new Intl.PluralRules(loc);
  for (let n = 0; n <= 120; n++) { total++; if (pr.select(n) === rules[loc](n)) same++; }
});
console.log('matches Intl.PluralRules on', same, 'of', total, 'checks');
console.log(new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(1234.5));
console.log(new Intl.NumberFormat('en-IN').format(1234567));`
    },
    {
      lang: 'css', title: 'RTL-ready CSS: logical properties instead of left/right',
      code: `/* Physical properties break in RTL: "left" is the wrong side for Arabic. */
.card-bad   { margin-left: 16px; padding-right: 8px; text-align: left; border-left: 4px solid; }

/* Logical properties follow the writing direction automatically. */
.card-good  { margin-inline-start: 16px; padding-inline-end: 8px; text-align: start; border-inline-start: 4px solid; }

/* The direction is set once on the root: <html lang="ar" dir="rtl"> */
.icon-arrow { transform: scaleX(1); }
[dir="rtl"] .icon-arrow { transform: scaleX(-1); }   /* mirror directional icons only (arrows), not logos or clocks */

/* Flexbox and grid already flip with dir, so row order mirrors for free. */
.toolbar { display: flex; gap: 8px; }`
    },
    {
      lang: 'js', check: false, title: 'react-intl: messages, plurals, dates in components',
      code: `import { IntlProvider, FormattedMessage, FormattedNumber, FormattedDate, useIntl } from 'react-intl';

// Catalog is loaded lazily per locale so users only download their own language.
async function loadMessages(locale) {
  const mod = await import('./locales/' + locale + '.json');
  return mod.default;
}

function Cart({ count, total, updatedAt }) {
  const intl = useIntl();
  return (
    <section dir={intl.locale.startsWith('ar') ? 'rtl' : 'ltr'}>
      <h2>
        <FormattedMessage id="cart.items" values={{ count }} />
      </h2>
      <p>
        <FormattedNumber value={total} style="currency" currency="EUR" />
        {' - '}
        <FormattedDate value={updatedAt} dateStyle="medium" timeZone="Europe/Berlin" />
      </p>
    </section>
  );
}

export function App({ locale, messages }) {
  return (
    <IntlProvider locale={locale} messages={messages} defaultLocale="en">
      <Cart count={21} total={1234.5} updatedAt={Date.now()} />
    </IntlProvider>
  );
}`
    }
  ],
  codeTitle: ['Message catalogs', 'Runnable plural and fallback model', 'Logical CSS for RTL', 'react-intl components'],
  viz: {
    title: 'ICU plural picker: which form does each number use?',
    input: 'ru 1 2 5 11 21 22 0',
    inputLabel: 'Locale (en, fr, ru, pl, ar, ja) then whole numbers',
    gen: function (input) {
      var t = words(input, 12, 'Example: ru 1 2 5 11 21');
      var loc = t[0];
      var rules = {
        en: function (n) { return n === 1 ? 'one' : 'other'; },
        fr: function (n) { return n === 0 || n === 1 ? 'one' : 'other'; },
        ja: function () { return 'other'; },
        ru: function (n) { var a = n % 10, b = n % 100; if (a === 1 && b !== 11) return 'one'; if (a >= 2 && a <= 4 && !(b >= 12 && b <= 14)) return 'few'; return 'many'; },
        pl: function (n) { var a = n % 10, b = n % 100; if (n === 1) return 'one'; if (a >= 2 && a <= 4 && !(b >= 12 && b <= 14)) return 'few'; return 'many'; },
        ar: function (n) { var b = n % 100; if (n === 0) return 'zero'; if (n === 1) return 'one'; if (n === 2) return 'two'; if (b >= 3 && b <= 10) return 'few'; if (b >= 11 && b <= 99) return 'many'; return 'other'; }
      };
      var msgs = {
        en: { one: '# item', other: '# items' },
        fr: { one: '# article', other: '# articles' },
        ja: { other: '# 個' },
        ru: { one: '# товар', few: '# товара', many: '# товаров', other: '# товара' },
        pl: { one: '# produkt', few: '# produkty', many: '# produktów', other: '# produktu' },
        ar: { zero: 'لا عناصر', one: 'عنصر واحد', two: 'عنصران', few: '# عناصر', many: '# عنصرًا', other: '# عنصر' }
      };
      if (!rules[loc]) throw new Error('Locale must be one of: en fr ru pl ar ja');
      var nums = t.slice(1).map(Number);
      if (!nums.length) throw new Error('Add some whole numbers after the locale');
      nums.forEach(function (n) { if (!(n >= 0) || n !== Math.floor(n) || n > 1000000) throw new Error('Use whole numbers from 0 to 1000000'); });
      var used = Object.keys(msgs[loc]);
      var rows = [], frames = [];
      frames.push({ narr: 'Locale <b>' + loc + '</b> uses these plural categories: <b>' + used.join(', ') + '</b>. The translator writes one message form for each; the code just asks the rules "which category is this number?".', parts: [{ type: 'table', label: 'Message forms for ' + loc, columns: ['category', 'text'], rows: used.map(function (k) { return [k, msgs[loc][k]]; }) }, { type: 'text', html: 'ICU message: <code>{count, plural, ' + used.map(function (k) { return k + ' {…}'; }).join(' ') + '}</code>' }] });
      nums.forEach(function (n) {
        var cat = rules[loc](n), form = msgs[loc][cat] || msgs[loc].other;
        rows.push([String(n), cat, form.replace('#', String(n))]);
        var why = loc === 'ru' ? ('n % 10 = ' + (n % 10) + ', n % 100 = ' + (n % 100) + '. ' + (cat === 'one' ? 'Ends in 1 but not 11 → <b>one</b>.' : cat === 'few' ? 'Ends in 2-4 but not 12-14 → <b>few</b>.' : 'Everything else (0, 5-20, 25-30...) → <b>many</b>.')) : loc === 'en' ? (n === 1 ? 'Exactly 1 → <b>one</b>.' : 'Anything but 1 → <b>other</b>.') : 'The CLDR rule for <b>' + loc + '</b> says <b>' + cat + '</b>.';
        frames.push({ narr: 'Number <b>' + n + '</b> → category <b>' + cat + '</b>. ' + why, parts: [{ type: 'table', label: 'Results so far', columns: ['n', 'category', 'rendered message'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[rows.length - 1] = 'sel'; return o; })() }, { type: 'vars', vals: { n: n, 'n % 10': n % 10, 'n % 100': n % 100, category: cat }, hl: { category: 'ok' } }] });
      });
      frames.push({ narr: 'Notice: in English "21" would be <i>other</i> (21 items) but in Russian it is <i>one</i> (21 товар). No simple "add an s" logic can do both, which is why plural rules belong in the <b>message</b>, not in your code.', parts: [{ type: 'table', label: 'Final table', columns: ['n', 'category', 'rendered message'], rows: rows }] });
      return frames;
    }
  },
  examples: [
    {
      title: 'Why string concatenation breaks translation',
      html: `<p>Code: <code>"You have " + n + " new message" + (n === 1 ? "" : "s") + " from " + name</code>. Problems: (1) Word order: Japanese puts the sender first. (2) Plurals: Polish needs three forms. (3) Translators see broken fragments with no context. (4) Grammar like gender and case changes neighbouring words.</p>
        <p>Fix: ONE message with placeholders, translated whole: <code>"{name} sent you {count, plural, one {a message} other {# messages}}"</code>. The translator moves <code>{name}</code> wherever the grammar needs it. Add a <b>description</b> for translators ("shown in the inbox header") because "Post" might be a noun or a verb.</p>`
    },
    {
      title: 'Numbers, money, dates, lists: let Intl do it',
      html: `${H.table(['Value', 'en-US', 'de-DE', 'ja-JP'], [['1234567.891', '1,234,567.891', '1.234.567,891', '1,234,567.891'], ['Currency 1234.5', '$1,234.50 (USD)', '1.234,50 € (EUR)', '¥1,235 (JPY, no decimals)'], ['Date 2026-03-09', '3/9/2026', '9.3.2026', '2026/3/9'], ['List a,b,c', 'a, b, and c', 'a, b und c', 'a、b、c']])}
        <p>Same data, four conventions. Store <b>UTC timestamps and numbers</b> in your data; format only at the last moment, with the user's locale <i>and</i> time zone. Use <code>Intl.RelativeTimeFormat</code> for "3 days ago" and <code>Intl.Collator</code> for sorting names correctly (ä sorts differently in German and Swedish).</p>`,
      code: { lang: 'js', run: true, title: 'Intl in 8 lines', code: `const n = 1234567.891;
console.log(new Intl.NumberFormat('en-US').format(n));
console.log(new Intl.NumberFormat('de-DE').format(n));
console.log(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(1234.5));
console.log(new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 2, 9))));
console.log(new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-1, 'day'));
console.log(new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(['red', 'green', 'blue']));
console.log(['z', 'a', 'ä'].sort(new Intl.Collator('de').compare).join(' '));` }
    },
    {
      title: 'RTL, text expansion and pseudo-localization',
      html: `<p><b>RTL:</b> set <code>&lt;html lang="ar" dir="rtl"&gt;</code>, use logical CSS properties, mirror directional icons only. Numbers and Latin words inside Arabic text still run left-to-right (the "bidi" algorithm) — test with mixed text like a product name and a phone number. <b>Expansion:</b> never give a button a fixed width; allow wrapping and test with 40% longer strings. <b>Pseudo-localization</b> is a free trick: replace every letter with an accented look-alike and pad it ("Account" → "[Åççöüñţ ~~~]") in a test build. Hard-coded text stays plain and stands out; overflowing layouts show up before any real translation exists.</p>`
    }
  ],
  deepDive: `<p><b>ICU MessageFormat grammar.</b> A message is literal text plus <code>{argument, type, style}</code> blocks. <code>plural</code> picks a block by CLDR category; exact matches like <code>=0</code> win over categories, so "Your cart is empty" can be its own sentence. <code>selectordinal</code> handles "1st, 2nd, 3rd". <code>select</code> chooses by arbitrary string keys. Blocks nest, which is powerful and dangerous: translators must keep braces balanced, so catalogs need a <b>linter in CI</b> (same placeholders in every language, no missing <code>other</code> branch). <b>Fractions</b> matter too: in English "1.0 items" is "other", and rules depend on visible decimals (CLDR operands <code>n, i, v, w, f, t</code>). Use <code>Intl.PluralRules</code> instead of hand-written rules in production; our tiny functions are for learning.</p>
    <p><b>Architecture.</b> (1) Resolve locale from URL (<code>/de/cart</code> is best for SEO and caching), then cookie/user setting, then <code>Accept-Language</code>. (2) Load catalogs <b>per route and per locale</b> (code-split JSON) so a Japanese user does not download German. (3) Format on the server and client with the <i>same</i> locale and time zone to avoid hydration mismatches (the server's default time zone is usually UTC, the browser's is not). (4) For SEO add <code>&lt;link rel="alternate" hreflang="de" href="…"&gt;</code> and <code>lang</code> on <code>&lt;html&gt;</code>. (5) Keep keys stable and meaningful; do not use the English sentence as key unless your tool extracts it automatically (FormatJS, Lingui do).</p>
    <p><b>Translation workflow.</b> Developers extract messages → a Translation Management System (Crowdin, Lokalise, Phrase) → translators with context screenshots → pull requests with new catalogs. Handle <i>missing</i> translations gracefully (fall back to English, log it), and block releases when the <i>source</i> message changed without re-translation. Machine translation + human review is now common, but ICU placeholders must survive: validate them automatically.</p>
    <p><b>Hard cases.</b> Names (no first/last assumption; <code>Intl.Locale</code> and "display name" fields), addresses and phone numbers (libraries like libphonenumber), calendars (Buddhist, Hijri, Japanese eras via <code>Intl.DateTimeFormat</code> options), sorting and search (accents, case folding, Turkish dotless i), emoji and grapheme clusters (<code>Intl.Segmenter</code>), text direction inside user-generated content (<code>dir="auto"</code>), and fonts (CJK fallback stacks, <code>font-display</code>, unicode-range subsetting).</p>`,
  aiEra: `<p><b>What AI changes:</b> machine translation is now good enough for a first pass in dozens of languages, so the bottleneck moves from <i>translating</i> to <i>context and quality control</i>. LLMs can also generate catalogs from code, find hard-coded strings, and write translator notes. On the product side, AI features themselves need i18n: prompts, answers and tone should follow the user's locale, and streamed text must handle RTL and mixed scripts.</p>
    <p><b>Use AI as a partner:</b> <code>Find every hard-coded user-visible string in this component and extract ICU messages with translator descriptions. Do not translate yet.</code> Then use it as a reviewer: <code>Check this Russian catalog against the English one: placeholders, plural branches, and tone.</code> Pair it with automated checks (message-format parser) so mistakes are caught by tools, not by luck.</p>
    <p><b>Where AI goes wrong:</b> it often writes <code>count === 1 ? ... : ...</code> instead of ICU plurals, forgets the <code>other</code> branch, translates placeholders (<code>{name}</code> becomes <code>{nom}</code>), invents plural forms a language does not have, or mixes formal and informal "you". <b>What you must still own:</b> the string architecture, the glossary (brand terms stay untranslated), legal wording per market, and native-speaker review for high-visibility copy.</p>`,
  problems: [{
    title: 'Plural Category Picker (English, Russian, Polish)',
    level: 'Easy', tags: ['i18n', 'plurals', 'ICU'], companies: ['Airbnb', 'Booking.com', 'Spotify'],
    statement: `<p>Write <code>pluralCategory(locale, n)</code> for whole numbers <code>n ≥ 0</code>. Support three locales:</p>
      <ul><li><b>en</b>: <code>one</code> if n = 1, else <code>other</code>.</li>
      <li><b>ru</b>: <code>one</code> if n mod 10 = 1 and n mod 100 ≠ 11; <code>few</code> if n mod 10 is 2-4 and n mod 100 is not 12-14; otherwise <code>many</code>.</li>
      <li><b>pl</b>: <code>one</code> only for n = 1; <code>few</code> if n mod 10 is 2-4 and n mod 100 is not 12-14; otherwise <code>many</code>.</li></ul>
      <p>Throw an Error for any other locale. Then write <code>format(message, locale, n)</code> where message is an object like <code>{ one: '# товар', few: '# товара', many: '# товаров', other: '# товара' }</code>: pick the category's text (fall back to <code>other</code> when the category is missing) and replace <code>#</code> with n.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>9</sup>, integers only.`,
    example: `${H.table(['n', 'ru', 'pl', 'en'], [['1', 'one', 'one', 'one'], ['2', 'few', 'few', 'other'], ['5', 'many', 'many', 'other'], ['11', '<span class="c-y">many</span> (11 is special)', 'many', 'other'], ['21', '<span class="c-g">one</span>', '<span class="c-r">many</span> (only exactly 1 is one)', 'other'], ['22', 'few', 'few', 'other']])}`,
    brute: {
      why: `<p>The "English thinking" version <code>n === 1 ? 'one' : 'other'</code> gives "21 товаров"-style mistakes: Russian users see ungrammatical text for 2, 3, 4, 21, 22... Every language needs its own rule, and teaching the UI code about each language does not scale.</p>`,
      code: `function pluralBrute(locale, n) {
  return n === 1 ? 'one' : 'other';       // correct only for English-like languages
}`
    },
    mcq: { q: 'In Russian, which category does 12 belong to?', options: ['many', 'few', 'one'], answer: 0, explain: '12 ends in 2, which looks like "few", but numbers 12-14 are explicitly excluded (n mod 100 in 12-14), so they are "many".' },
    hints: [
      `<p>Hint 1: Russian and Polish only care about the last one or two digits: <code>n % 10</code> and <code>n % 100</code>.</p>`,
      `<p>Hint 2: check "one" first, then "few", then default to "many". The teens (11-14) are the exceptions that break the pattern.</p>`,
      `<p>Hint 3: keep the rules in a map <code>{ en: fn, ru: fn, pl: fn }</code> so adding a locale does not touch the formatter. Missing category → use <code>other</code>.</p>`
    ],
    solution: {
      approach: `<p>A small rules table keyed by locale, each rule a pure function of the number. The formatter does only two jobs: pick the form and substitute <code>#</code>. This separation is exactly how ICU libraries work.</p>`,
      code: { lang: 'js', run: true, code: `const rules = {
  en: n => (n === 1 ? 'one' : 'other'),
  ru: n => {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return 'one';
    if (a >= 2 && a <= 4 && !(b >= 12 && b <= 14)) return 'few';
    return 'many';
  },
  pl: n => {
    const a = n % 10, b = n % 100;
    if (n === 1) return 'one';
    if (a >= 2 && a <= 4 && !(b >= 12 && b <= 14)) return 'few';
    return 'many';
  }
};

function pluralCategory(locale, n) {
  if (!rules[locale]) throw new Error('unsupported locale: ' + locale);
  return rules[locale](n);
}

function format(message, locale, n) {
  const cat = pluralCategory(locale, n);
  const text = message[cat] !== undefined ? message[cat] : message.other;
  return text.split('#').join(String(n));
}

const ru = { one: '# товар', few: '# товара', many: '# товаров', other: '# товара' };
[1, 2, 5, 11, 21, 22, 100, 111].forEach(n => console.log(n, pluralCategory('ru', n), format(ru, 'ru', n)));
console.log(pluralCategory('pl', 21), pluralCategory('en', 21));` },
      dry: { head: ['n', 'n % 10', 'n % 100', 'ru category'], rows: [['21', '1', '21', 'one (1 and not 11)'], ['11', '1', '11', 'many (the 11 exception)'], ['22', '2', '22', 'few (2-4, not 12-14)'], ['112', '2', '12', 'many (12 is excluded)']] },
      complexity: `<p>Time O(1) per call (a few modulo operations), space O(1).</p>`,
      followUps: ['Add Arabic with six categories.', 'Support decimals: why is "1.5 items" "other" in English?', 'Cross-check your rules against Intl.PluralRules in a test.']
    }
  }]
});

/* ===================== TOPIC 8: Feature flags ===================== */
topics.push({
  title: 'Feature Flags: Gradual Rollouts, Kill Switches & Stable Bucketing',
  analogy: `<p>Think of the <b>dimmer switch and the circuit breaker</b> in your house. You install a new light (new code) but keep it wired to a switch (a <b>flag</b>), so you can ship the wiring on Monday and turn the light on only for the kitchen on Wednesday, then the whole house on Friday. If the bulb buzzes, flip the switch off — no electrician needed. A <b>percentage rollout</b> is a dimmer: 5% of houses today, 25% tomorrow. And "stable bucketing" is giving every house a permanent number on the door, so house #17 is always in or always out, never flickering.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> A <b>feature flag</b> (feature toggle) is an <code>if</code> around new behaviour whose answer comes from <i>configuration</i>, not from a deploy:</p>
    ${H.table(['Without flags', 'With flags'], [['Deploy = release. Bad release → rollback deploy (10-30 min)', 'Deploy ≠ release. Bad release → flip a switch (seconds)'], ['Long-lived feature branches, merge pain', 'Merge small, hidden behind a flag (trunk-based development)'], ['Everyone gets it at once', 'Staff first, 1%, 10%, 50%, 100%']])}
    <p>Kinds of flags (they live different lives):</p>
    <ul>
      <li><b>Release flags</b>: hide unfinished or risky work; short-lived; <b>delete after full rollout</b>.</li>
      <li><b>Experiment flags</b>: A/B tests; measure a metric; removed when the test ends.</li>
      <li><b>Ops flags / kill switches</b>: turn off a heavy or flaky feature during an incident; can live for years.</li>
      <li><b>Permission flags</b>: premium plan, beta programme, enterprise-only; part of the product.</li>
    </ul>
    <p><b>🔵 Percentage rollout — and why "random" is wrong.</b> To give a feature to 20% of users, the naive approach is <code>Math.random() &lt; 0.2</code>. That makes the same user see the feature on one page load and not on the next (it <b>flickers</b>), and ruins any experiment. The correct approach is <b>stable hashing</b>:</p>
    <ol>
      <li>Combine the flag name and the user id into a string: <code>"newCheckout:alice"</code>.</li>
      <li>Run a fast <b>hash function</b> (FNV-1a, MurmurHash3). It turns any text into a big number, always the same for the same text.</li>
      <li>Take it modulo 100 → a <b>bucket</b> from 0 to 99.</li>
      <li>The feature is ON when <code>bucket &lt; rolloutPercent</code>.</li>
    </ol>
    ${H.table(['user', 'bucket for newCheckout', 'at 20%', 'at 50%', 'at 100%'], [['carol', '14', '<span class="c-g">ON</span>', '<span class="c-g">ON</span>', '<span class="c-g">ON</span>'], ['bob', '44', '<span class="c-r">off</span>', '<span class="c-g">ON</span>', '<span class="c-g">ON</span>'], ['alice', '59', '<span class="c-r">off</span>', '<span class="c-r">off</span>', '<span class="c-g">ON</span>'], ['dave', '99', '<span class="c-r">off</span>', '<span class="c-r">off</span>', '<span class="c-g">ON</span>']])}
    <p>Two valuable properties: <b>stable</b> (same user, same answer every time, on every device and server, as long as the id is the same) and <b>monotonic</b> (raising 20% → 50% only <i>adds</i> users; nobody who had the feature loses it). Including the <b>flag name</b> in the hash makes buckets independent per flag, so the same unlucky 5% of users are not the guinea pigs for every experiment.</p>
    <p><b>🟣 Evaluation order</b> in a real system (first match wins): kill switch → per-user override → targeting rules (country, plan, app version) → percentage rollout → default value.</p>`,
  clues: [
    '"Roll out to <b>5% then 25% then 100%</b>" → percentage rollout with stable hashing',
    '"The same user must always see the same variant" → hash(userId + flag), never <code>Math.random()</code>',
    '"Turn it off <b>without a deploy</b> if errors spike" → kill switch, flags from a remote config',
    '"Decouple deploy from release" / "trunk-based development" → flags hide unfinished work',
    '"Flags piling up in the codebase" → flag lifecycle, owners, expiry dates, cleanup',
    '"Page flickers from old to new UI on load" → evaluate flags on the server / bootstrap them before first render'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Runnable bucketer: FNV-1a hash → bucket → rollout (stable & monotonic)',
      code: `// FNV-1a: a tiny, fast, well-known 32-bit string hash. Same text -> same number, everywhere.
function fnv1a(str) {
  let h = 0x811c9dc5;                       // offset basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);                 // mix in one character
    h = Math.imul(h, 0x01000193) >>> 0;     // multiply by the FNV prime, keep it a 32-bit unsigned number
  }
  return h >>> 0;
}

// Salting with the flag name makes each flag's buckets independent.
function bucket(flag, userId) { return fnv1a(flag + ':' + userId) % 100; }   // 0..99

function isEnabled(flag, userId, percent) { return bucket(flag, userId) < percent; }

const users = ['alice', 'bob', 'carol', 'dave', 'erin'];
users.forEach(u => console.log(u.padEnd(6), 'bucket', String(bucket('newCheckout', u)).padStart(2),
  '| 20%:', isEnabled('newCheckout', u, 20), '| 50%:', isEnabled('newCheckout', u, 50)));

// Property 1: STABLE - asking twice gives the same answer.
console.log('stable:', isEnabled('newCheckout', 'bob', 50) === isEnabled('newCheckout', 'bob', 50));

// Property 2: MONOTONIC - everyone ON at 20% is still ON at 50%.
let lost = 0;
for (let i = 0; i < 1000; i++) if (isEnabled('f', 'u' + i, 20) && !isEnabled('f', 'u' + i, 50)) lost++;
console.log('users who lose the feature when going 20% -> 50%:', lost);

// Property 3: FAIR - 10,000 users land close to the target percentage.
let on = 0;
for (let i = 0; i < 10000; i++) if (isEnabled('newCheckout', 'user-' + i, 20)) on++;
console.log('enabled share at 20%:', (on / 100).toFixed(1) + '%');`
    },
    {
      lang: 'js', run: true, title: 'Full evaluation order: kill switch, override, targeting rules, percentage, default',
      code: `function fnv1a(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }

const flagConfig = {
  key: 'newCheckout',
  killSwitch: false,                                   // ops can set true during an incident -> OFF for all
  overrides: { 'qa-tester': true, 'banned-user': false },
  rules: [                                             // first matching rule decides
    { when: u => u.country === 'DE' && u.plan === 'enterprise', value: true },
    { when: u => u.appVersion < 120, value: false }    // old apps cannot render the new UI
  ],
  percent: 25,                                         // rollout for everyone else
  defaultValue: false
};

function evaluate(cfg, user) {
  if (cfg.killSwitch) return { on: false, why: 'kill switch' };
  if (user.id in cfg.overrides) return { on: cfg.overrides[user.id], why: 'override' };
  for (const r of cfg.rules) if (r.when(user)) return { on: r.value, why: 'rule' };
  const b = fnv1a(cfg.key + ':' + user.id) % 100;
  if (b < cfg.percent) return { on: true, why: 'rollout (bucket ' + b + ')' };
  return { on: cfg.defaultValue, why: 'default (bucket ' + b + ')' };
}

[
  { id: 'qa-tester', country: 'US', plan: 'free', appVersion: 130 },
  { id: 'hans', country: 'DE', plan: 'enterprise', appVersion: 130 },
  { id: 'old-phone', country: 'US', plan: 'free', appVersion: 100 },
  { id: 'carol', country: 'US', plan: 'free', appVersion: 130 },
  { id: 'dave', country: 'US', plan: 'free', appVersion: 130 }
].forEach(u => console.log(u.id.padEnd(10), JSON.stringify(evaluate(flagConfig, u))));
flagConfig.killSwitch = true;
console.log('after kill switch:', JSON.stringify(evaluate(flagConfig, { id: 'qa-tester', country: 'US', plan: 'free', appVersion: 130 })));`
    },
    {
      lang: 'json', title: 'A flag config as served by a flag service (remote config)',
      code: `{
  "newCheckout": {
    "enabled": true,
    "killSwitch": false,
    "rollout": { "percent": 25, "salt": "newCheckout" },
    "rules": [
      { "attribute": "country", "in": ["DE", "AT"], "serve": true },
      { "attribute": "appVersion", "lt": 120, "serve": false }
    ],
    "owner": "team-payments",
    "expires": "2026-12-01"
  }
}`
    },
    {
      lang: 'js', check: false, title: 'Using flags in React (provider + hook) without flicker',
      code: `import React, { createContext, useContext } from 'react';

const FlagContext = createContext({});

// flags are fetched on the SERVER (or inlined in the HTML) so the first render already knows the answer
export function FlagProvider({ flags, children }) {
  return <FlagContext.Provider value={flags}>{children}</FlagContext.Provider>;
}
export function useFlag(name, fallback = false) {
  const flags = useContext(FlagContext);
  return name in flags ? flags[name] : fallback;      // unknown flag or service down -> safe default
}

function Checkout() {
  const newFlow = useFlag('newCheckout');
  // Keep BOTH paths working until the flag is deleted; log which one the user saw (exposure event)
  return newFlow ? <CheckoutV2 /> : <CheckoutV1 />;
}`
    }
  ],
  codeTitle: ['Runnable bucketer', 'Full evaluation order', 'Flag config JSON', 'React provider + hook'],
  viz: {
    title: 'Percentage rollout: users fall into stable buckets',
    input: 'newCheckout 200 5 25 50 100',
    inputLabel: 'Flag name, number of users (≤ 500), then rollout stages in percent',
    gen: function (input) {
      var t = words(input, 10, 'Example: newCheckout 200 5 25 50 100');
      var flag = t[0], N = Number(t[1]);
      if (!(N >= 10 && N <= 500)) throw new Error('Users must be a number from 10 to 500');
      var stages = t.slice(2).map(Number);
      if (!stages.length) throw new Error('Add rollout stages like 5 25 50 100');
      stages.forEach(function (s) { if (!(s >= 0 && s <= 100)) throw new Error('Stages are percentages from 0 to 100'); });
      var users = [], bk = [], i;
      for (i = 1; i <= N; i++) { users.push('u' + i); bk.push(bucketOf(flag, 'u' + i)); }
      var dec = []; for (i = 0; i < 10; i++) dec.push(0);
      bk.forEach(function (b) { dec[Math.floor(b / 10)]++; });
      var labels = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-99'];
      var h1 = fnv1a(flag + ':u1');
      var frames = [{ narr: 'Step 1: for <b>u1</b> join the flag name and the user id: <code>"' + H.esc(flag) + ':u1"</code>. A hash function turns this text into a big number: <b>' + h1 + '</b>. Same text, same number, on every server and device.', parts: [{ type: 'vars', vals: { input: flag + ':u1', hash: h1, 'hash % 100': h1 % 100 }, hl: { 'hash % 100': 'sel' } }] }];
      frames.push({ narr: 'Step 2: <b>hash % 100</b> gives the bucket, here <b>' + (h1 % 100) + '</b>. Do this for all <b>' + N + '</b> users. Good hashes spread users evenly, so each group of ten buckets holds about ' + Math.round(N / 10) + ' users.', parts: [{ type: 'bars', label: 'Users per bucket range', values: dec.slice(), idxLabels: labels, texts: dec.map(String) }] });
      var prevOn = {}, prevCount = 0;
      stages.forEach(function (p, k) {
        var on = 0, hl = {}, nowOn = {}, lost = 0;
        users.forEach(function (u, j) { if (bk[j] < p) { on++; nowOn[u] = 1; } });
        Object.keys(prevOn).forEach(function (u) { if (!nowOn[u]) lost++; });
        for (var d = 0; d < 10; d++) { hl[d] = (d + 1) * 10 <= p ? 'ok' : (d * 10 < p ? 'cur' : 'done'); }
        frames.push({ narr: 'Stage ' + (k + 1) + ': rollout <b>' + p + '%</b> → ON when bucket &lt; ' + p + '. That is <b>' + on + '</b> of ' + N + ' users (' + (100 * on / N).toFixed(1) + '%). ' + (k === 0 ? 'Green buckets are ON, faded ones are OFF.' : (lost === 0 ? '<span class="c-g">Nobody who already had the feature lost it</span> (monotonic): ' + (on - prevCount) + ' new users joined.' : '<span class="c-r">' + lost + ' users LOST the feature because the percentage went down.</span>')), parts: [{ type: 'bars', label: 'Buckets ON (green) vs OFF (faded) at ' + p + '%', values: dec.slice(), idxLabels: labels, hl: hl, texts: dec.map(String) }, { type: 'vars', vals: { rollout: p + '%', enabled: on, 'newly added': k === 0 ? on : Math.max(0, on - prevCount), 'lost': lost }, hl: { lost: lost ? 'bad' : 'ok' } }] });
        prevOn = nowOn; prevCount = on;
      });
      var other = flag + '-B', ov = 0, firstStage = stages[0] || 10;
      users.forEach(function (u, j) { if (bk[j] < firstStage && bucketOf(other, u) < firstStage) ov++; });
      var cnt = 0, cnt2 = 0; users.forEach(function (u, j) { if (bk[j] < firstStage) cnt++; if (bucketOf(other, u) < firstStage) cnt2++; });
      frames.push({ narr: 'Why include the flag name in the hash? Take a different flag <code>' + H.esc(other) + '</code> at the same ' + firstStage + '%. Only <b>' + ov + '</b> of the ' + cnt + ' users in the first group are also in the second group (' + cnt2 + ' users). Without the flag name the two groups would be <i>identical</i>, and the same people would test everything.', parts: [{ type: 'vars', vals: (function () { var o = {}; o['group of ' + flag] = cnt; o['group of ' + other] = cnt2; o['in both'] = ov; return o; })() }] });
      frames.push({ narr: 'Compare with <code>Math.random() &lt; p</code>: it re-rolls on every page load, so a user flips between old and new UI, A/B results are meaningless, and support cannot reproduce bug reports. <b>Stable hashing wins.</b>', parts: [{ type: 'text', html: '<b>Rule:</b> bucket = hash(flag + ":" + userId) % 100; ON when bucket &lt; percent. For anonymous visitors use a long-lived anonymous id cookie as the "user id".' }] });
      return frames;
    }
  },
  examples: [
    {
      title: 'A safe rollout plan for the new checkout',
      html: `${H.table(['Stage', 'Audience', 'Watch', 'Go / no-go'], [
        ['0', 'Employees only (rule: email ends with @shop.com)', 'Does it work at all?', 'Zero blocking bugs'],
        ['1', '1% of users', 'Error rate, payment success rate, p95 latency', 'No metric worse than baseline by &gt; 1%'],
        ['2', '10%, then 25%', 'Conversion rate, support tickets', 'Conversion not lower'],
        ['3', '50%, then 100%', 'Everything, plus load on the payment API', 'Hold 24 h at 50%'],
        ['4', 'Clean up', 'Delete the flag and the old code path', 'Within 2 weeks of 100%']
      ])}<p>The kill switch stays one click away at every stage. Automate this with <b>progressive delivery</b>: the system raises the percentage while guard-rail metrics stay green and rolls back by itself otherwise.</p>`
    },
    {
      title: 'Client-side vs server-side evaluation',
      html: `<p><b>Server-side</b> (Node, edge function, backend): the flag rules never leave your servers, evaluation is fast and private, and you can put the answer into the HTML (no flicker). <b>Client-side</b> (browser SDK): the browser needs the answer, so either fetch a small <i>pre-evaluated</i> map for this user (<code>{ newCheckout: true }</code>), or download the rules (leaks your targeting logic and segments). Best practice: evaluate on the server, <b>bootstrap</b> the result into the page, then let the SDK refresh it by streaming or polling. Cache flags with a short TTL and always define a safe local <b>default</b> for when the flag service is down.</p>`
    },
    {
      title: 'Flag debt: the silent killer',
      html: `<p>Each flag doubles the number of possible app states (2 flags = 4 combos, 10 flags = 1024!). Nobody tests them all. Keep flags healthy: every flag has an <b>owner</b>, a <b>type</b>, an <b>expiry date</b> and a cleanup ticket created <i>when the flag is created</i>. CI warns when an expired flag is still in the code. Never nest flags inside flags, never use a flag value as a permission check on the server (the client can lie), and prefer wrapping at a single high-level place (route, component) over scattering <code>if (flag)</code> across 40 files.</p>`,
      code: { lang: 'js', run: true, title: 'A tiny CI-style check for expired flags', code: `const flags = [
  { key: 'newCheckout', owner: 'payments', expires: '2026-12-01' },
  { key: 'oldBanner',   owner: 'growth',   expires: '2026-03-01' },
  { key: 'darkMode',    owner: 'platform' }                       // missing expiry!
];
const today = '2026-10-15';
flags.forEach(f => {
  if (!f.expires) console.log('FAIL', f.key, 'has no expiry date');
  else if (f.expires < today) console.log('FAIL', f.key, 'expired on', f.expires, '- owner:', f.owner);
  else console.log('ok  ', f.key);
});` }
    }
  ],
  deepDive: `<p><b>Hash function choices.</b> You want: deterministic, fast, uniform. <b>FNV-1a</b> is simple and fine for bucketing; <b>MurmurHash3</b> (used by LaunchDarkly-style SDKs and Optimizely) has better avalanche behaviour; cryptographic hashes (SHA-256) are overkill, slower and not needed because we do not need secrecy. Cross-language consistency matters: if your backend (Java) and frontend (JS) both evaluate, they must use the <b>same algorithm, same byte encoding (UTF-8) and the same string format</b>, or the user sees different answers on different tiers. Test with shared vectors (a JSON file of input → bucket pairs checked in both languages).</p>
    <p><b>Granularity.</b> Modulo 100 gives 1% steps. For 0.1% canaries use modulo 10,000 (basis points) or take the top bits of the hash as a fraction in [0,1). Beware <b>modulo bias</b> when the range does not divide 2<sup>32</sup> evenly; for modulo 100 over 2<sup>32</sup> values the bias is about 1 in 40 million: irrelevant. Different <b>units</b> change who is bucketed: user id (stable across devices), device id, session id (A/B for logged-out pages) or account id (B2B: all employees of a company see the same thing). Pick the unit that matches how the feature is experienced.</p>
    <p><b>Experiments need more.</b> For A/B tests, bucket into variants using non-overlapping ranges of the same hash (0-49 control, 50-99 treatment), log an <b>exposure event</b> the first time the user actually sees the variant (not when the flag is evaluated), keep a <b>holdout</b>, and never change the split mid-experiment (it contaminates results). Re-bucketing for a new experiment requires a new salt so results do not carry over. Sample ratio mismatch (50/50 became 52/48) signals a bug in assignment or logging.</p>
    <p><b>Failure modes and design.</b> Flag service down → use cached rules, then compiled-in defaults (<i>fail safe</i>: the safest value is usually "off", but for a kill switch it is "keep running"). Evaluate once per request and pass the result down, so a flag cannot change in the middle of a render. Audit log every change (who, when, old, new) because flags are production changes. Treat the flag definitions as code: review, staging environment first, and permissions (only some people may touch the payments kill switch). In micro-frontend setups, publish the flag client as a <b>shared singleton</b> so all remotes see identical answers.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI makes shipping code faster, which makes <b>safe release mechanisms more important</b>, not less. Feature flags are the standard way to ship AI-generated changes in small, reversible steps. AI features themselves are flagged heavily: model version, prompt version, guard-rail strictness and cost caps are rolled out by percentage and compared with online metrics, because LLM behaviour cannot be fully tested before launch.</p>
    <p><b>Use AI as a partner:</b> ask it <code>Given this flag usage, list the combinations of flags that could interact badly, and write one test per risky pair.</code> Ask for a cleanup PR: <code>Remove flag newCheckout (now 100%): delete the false branch and dead code, and show the diff.</code> Use it to read incident timelines and spot which flag changed.</p>
    <p><b>Where AI goes wrong:</b> it uses <code>Math.random()</code> for rollouts, hashes without the flag name, evaluates the flag on every render, forgets the default for when the service fails, and leaves both code paths forever. <b>What you must still own:</b> the rollout plan and guard-rail metrics, who may flip a kill switch, privacy of the targeting attributes, and the discipline to delete flags.</p>`,
  problems: [{
    title: 'Stable Percentage Rollout With Monotonic Growth',
    level: 'Medium', tags: ['feature flags', 'hashing', 'rollout'], companies: ['LaunchDarkly', 'Meta', 'Netflix'],
    statement: `<p>Implement <code>isEnabled(flag, userId, percent)</code> using this rule: compute the 32-bit <b>FNV-1a</b> hash of the string <code>flag + ':' + userId</code>; the bucket is <code>hash % 100</code>; the feature is ON when <code>bucket &lt; percent</code>. <code>percent</code> is a number from 0 to 100.</p>
      <p>Then write <code>rolloutReport(flag, userIds, stages)</code> that, for each percentage in <code>stages</code>, returns the number of enabled users, and a boolean <code>monotonic</code> telling whether every user enabled in a stage is also enabled in the <i>next</i> stage when the stages are non-decreasing.</p>
      <p>FNV-1a: start with <code>h = 0x811c9dc5</code>; for each char code: <code>h ^= code; h = Math.imul(h, 0x01000193) &gt;&gt;&gt; 0</code>; return <code>h &gt;&gt;&gt; 0</code>.</p>`,
    constraints: `1 ≤ userIds ≤ 10<sup>5</sup>, 1 ≤ stages ≤ 20, flag/userId are non-empty strings.`,
    example: `${H.table(['user', 'bucket (newCheckout)', '20%', '50%'], [['carol', '14', 'ON', 'ON'], ['bob', '44', 'off', 'ON'], ['alice', '59', 'off', 'off']])}<p><code>percent = 0</code> → nobody ON; <code>percent = 100</code> → everybody ON (buckets are 0-99). Going 20% → 50% only adds bob: monotonic.</p>`,
    brute: {
      why: `<p>Using <code>Math.random() * 100 &lt; percent</code> is not repeatable: the same user flips between ON and OFF on each call, the second stage may <i>remove</i> users who had the feature, and tests are flaky. Fixing it by storing every user's random draw in a database works but needs storage and a lookup per user, which is exactly what a hash avoids.</p>`,
      code: `function isEnabledBrute(flag, userId, percent) {
  return Math.random() * 100 < percent;     // different answer every call: flickers, not monotonic, untestable
}`
    },
    mcq: { q: 'Why is the flag name included in the hashed string?', options: ['So different flags place users in independent buckets', 'Because the hash function needs at least 5 characters', 'To make the hash slower and harder to guess'], answer: 0, explain: 'If only the user id were hashed, every flag would pick the same low-bucket users, so the same people would be the test group for all rollouts.' },
    hints: [
      `<p>Hint 1: you need a function that returns the <b>same number for the same text</b>, spread evenly. That is a hash.</p>`,
      `<p>Hint 2: implement FNV-1a with <code>Math.imul</code> and <code>&gt;&gt;&gt; 0</code> (JS numbers are doubles; imul keeps true 32-bit multiplication, &gt;&gt;&gt; 0 makes it unsigned).</p>`,
      `<p>Hint 3: compute each user's bucket once, then for each stage just compare <code>bucket &lt; percent</code>. For monotonic: because the comparison threshold only grows, it must hold; verify by comparing consecutive enabled sets.</p>`
    ],
    solution: {
      approach: `<p>Hash once per user (O(len) per user), keep buckets in an array, then each stage is a linear scan comparing to the threshold. Monotonicity is guaranteed by construction (<code>bucket &lt; p1</code> implies <code>bucket &lt; p2</code> when p1 ≤ p2), but the report checks it explicitly so a future change to the algorithm cannot silently break it.</p>`,
      code: { lang: 'js', run: true, code: `function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function bucket(flag, userId) { return fnv1a(flag + ':' + userId) % 100; }
function isEnabled(flag, userId, percent) { return bucket(flag, userId) < percent; }

function rolloutReport(flag, userIds, stages) {
  const buckets = userIds.map(u => bucket(flag, u));      // hash each user only once
  const counts = [];
  let monotonic = true;
  let prev = null;                                         // enabled flags of the previous stage
  for (const p of stages) {
    const cur = buckets.map(b => b < p);
    counts.push(cur.reduce((n, on) => n + (on ? 1 : 0), 0));
    if (prev) {
      for (let i = 0; i < cur.length; i++) if (prev[i] && !cur[i]) monotonic = false;
    }
    prev = cur;
  }
  return { counts, monotonic };
}

console.log(isEnabled('newCheckout', 'carol', 20), isEnabled('newCheckout', 'bob', 20), isEnabled('newCheckout', 'bob', 50));
const ids = []; for (let i = 0; i < 1000; i++) ids.push('user-' + i);
console.log(JSON.stringify(rolloutReport('newCheckout', ids, [0, 10, 50, 100])));
console.log(JSON.stringify(rolloutReport('newCheckout', ids, [50, 10])));    // going DOWN loses users -> monotonic false` },
      dry: { head: ['user', 'hash', 'bucket', 'ON at 20%?', 'ON at 50%?'], rows: [['carol', '3610607114', '14', 'yes', 'yes'], ['bob', '1768453244', '44', 'no', 'yes'], ['alice', '3059068159', '59', 'no', 'no']] },
      complexity: `<p>Time O(U · L + U · S) for U users, id length L and S stages; space O(U).</p>`,
      followUps: ['Support 0.1% granularity (use hash % 10000).', 'Add variants for an A/B/C test using ranges of the bucket.', 'How do you keep the Java backend and JS frontend in agreement?']
    }
  }]
});

/* ===================== PRACTICE: Easy ===================== */
practice.push({
  title: 'Caret and Tilde Version Ranges', level: 'Easy', tags: ['semver', 'module federation', 'npm'], companies: ['npm', 'Zalando', 'Atlassian'],
  statement: `<p>Write <code>satisfies(version, range)</code> for versions like <code>"18.3.1"</code>. Support three kinds of range:</p>
    <ul><li><b>Exact</b>: <code>"18.2.0"</code> matches only that version.</li>
    <li><b>Tilde</b> <code>"~1.2.3"</code>: version ≥ 1.2.3 with the <b>same major and minor</b> (so 1.2.9 yes, 1.3.0 no).</li>
    <li><b>Caret</b> <code>"^1.2.3"</code>: version ≥ range with the <b>left-most non-zero part unchanged</b>. <code>^1.2.3</code> allows any 1.x.y ≥ 1.2.3; <code>^0.2.3</code> allows only 0.2.x ≥ 0.2.3; <code>^0.0.3</code> allows only 0.0.3.</li></ul>`,
  constraints: `All versions are "major.minor.patch" with non-negative integers. No pre-release tags.`,
  example: `${H.table(['version', 'range', 'result'], [['18.3.1', '^18.2.0', '<span class="c-g">true</span>'], ['19.0.0', '^18.2.0', '<span class="c-r">false</span> (major changed)'], ['0.2.5', '^0.2.3', '<span class="c-g">true</span>'], ['0.3.0', '^0.2.3', '<span class="c-r">false</span> (0.x: minor is the "major")'], ['1.3.0', '~1.2.3', '<span class="c-r">false</span>']])}`,
  brute: {
    why: `<p>Comparing version strings with <code>&gt;=</code> treats "18.10.0" as smaller than "18.9.0" and cannot express the "left-most non-zero" rule. Using regex on the string for each case quickly becomes unreadable and wrong for 0.x ranges.</p>`,
    code: `function satisfiesBrute(version, range) {
  if (range[0] === '^') return version >= range.slice(1) && version.split('.')[0] === range.slice(1).split('.')[0];  // string compare bug + ignores 0.x
  return version === range;
}`
  },
  mcq: { q: 'Does version 0.3.0 satisfy ^0.2.3?', options: ['No - for 0.x the minor number acts like the major', 'Yes - caret allows any minor', 'Yes - caret only checks the patch'], answer: 0, explain: 'In semver for 0.y.z releases, a minor bump may break things, so ^0.2.3 only allows >=0.2.3 <0.3.0.' },
  hints: [
    `<p>Hint 1: parse both versions into three numbers and write one numeric comparison function first. Everything else is built on it.</p>`,
    `<p>Hint 2: every range first requires <code>version ≥ floor</code>. Then add an extra "must stay in the same family" check that depends on ~ or ^.</p>`,
    `<p>Hint 3: caret family: if major &gt; 0, same major; else if minor &gt; 0, major 0 and same minor; else all three parts equal. Tilde family: same major and minor.</p>`
  ],
  solution: {
    approach: `<p>Numeric comparison plus a "family" check. The caret rule picks the first non-zero part of the floor and demands everything up to and including it stays equal.</p>`,
    code: { lang: 'js', run: true, code: `const parse = v => v.split('.').map(Number);
function cmp(a, b) {
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}
function satisfies(version, range) {
  const op = range[0];
  if (op !== '^' && op !== '~') return cmp(version, range) === 0;
  const floor = range.slice(1);
  if (cmp(version, floor) < 0) return false;            // must be at least the floor
  const v = parse(version), r = parse(floor);
  if (op === '~') return v[0] === r[0] && v[1] === r[1];
  if (r[0] > 0) return v[0] === r[0];
  if (r[1] > 0) return v[0] === 0 && v[1] === r[1];
  return v[0] === 0 && v[1] === 0 && v[2] === r[2];
}
const tests = [['18.3.1', '^18.2.0'], ['19.0.0', '^18.2.0'], ['0.2.5', '^0.2.3'], ['0.3.0', '^0.2.3'],
  ['1.2.9', '~1.2.3'], ['1.3.0', '~1.2.3'], ['0.0.3', '^0.0.3'], ['0.0.4', '^0.0.3'], ['18.10.0', '^18.9.0']];
tests.forEach(t => console.log(t[0].padEnd(8), t[1].padEnd(8), satisfies(t[0], t[1])));` },
    complexity: `<p>O(1) time and space (three numbers per version).</p>`,
    followUps: ['Add ">=1.2.0 <2.0.0" style ranges.', 'How do pre-release tags like 18.0.0-rc.1 sort?']
  }
});

practice.push({
  title: 'WCAG Contrast Checker for Design Tokens', level: 'Easy', tags: ['design tokens', 'accessibility', 'math'], companies: ['Adobe', 'Atlassian', 'GitHub'],
  statement: `<p>Write <code>checkContrast(fg, bg, large)</code>. <code>fg</code> and <code>bg</code> are 6-digit hex colours like <code>"#767676"</code>. Compute the WCAG contrast ratio and return <code>{ ratio, aa, aaa }</code>, where <code>ratio</code> is rounded to 2 decimals.</p>
    <p>Relative luminance: for each channel c in 0..1, <code>c ≤ 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4</code>; <code>L = 0.2126 R + 0.7152 G + 0.0722 B</code>. Ratio = <code>(Lbright + 0.05) / (Ldark + 0.05)</code>. Thresholds: normal text AA ≥ 4.5, AAA ≥ 7; <b>large</b> text AA ≥ 3, AAA ≥ 4.5.</p>`,
  constraints: `Input colours are always valid 6-digit hex with a leading #. Order of fg/bg must not matter.`,
  example: `${H.table(['fg', 'bg', 'ratio', 'AA (normal)'], [['#000000', '#ffffff', '21.00', '<span class="c-g">pass</span>'], ['#767676', '#ffffff', '4.54', '<span class="c-g">pass</span> (the lightest grey that passes)'], ['#999999', '#ffffff', '2.85', '<span class="c-r">fail</span>']])}`,
  brute: {
    why: `<p>Eyeballing "looks readable" or comparing raw RGB differences does not match human perception; mid-greys and saturated blues fool the eye. The wasted work is rework: designers ship a palette and accessibility audits send it back.</p>`,
    code: `function contrastBrute(fg, bg) {
  const d = (a, b) => Math.abs(parseInt(a, 16) - parseInt(b, 16));
  return d(fg.slice(1, 3), bg.slice(1, 3)) > 100;     // naive "red channel differs a lot" - wrong for most colours
}`
  },
  mcq: { q: 'What contrast ratio does WCAG AA require for normal-size body text?', options: ['At least 4.5 : 1', 'At least 2 : 1', 'At least 21 : 1'], answer: 0, explain: 'AA requires 4.5:1 for normal text and 3:1 for large text; AAA raises these to 7:1 and 4.5:1.' },
  hints: [
    `<p>Hint 1: first convert hex pairs to numbers 0-255, then divide by 255 to get a channel between 0 and 1.</p>`,
    `<p>Hint 2: apply the gamma formula per channel, combine with the three weights to get luminance L.</p>`,
    `<p>Hint 3: the ratio always uses the brighter luminance on top, so take max/min. Round with <code>Math.round(x * 100) / 100</code> but compare thresholds on the unrounded value.</p>`
  ],
  solution: {
    approach: `<p>Implement luminance once, take max/min of the two luminances, divide. Compare the unrounded ratio against the thresholds that depend on text size.</p>`,
    code: { lang: 'js', run: true, code: `function luminance(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function checkContrast(fg, bg, large) {
  const a = luminance(fg), b = luminance(bg);
  const raw = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return { ratio: Math.round(raw * 100) / 100, aa: raw >= (large ? 3 : 4.5), aaa: raw >= (large ? 4.5 : 7) };
}
console.log(checkContrast('#000000', '#ffffff', false));
console.log(checkContrast('#767676', '#ffffff', false));
console.log(checkContrast('#999999', '#ffffff', false), checkContrast('#999999', '#ffffff', true));
console.log(checkContrast('#ffffff', '#2563eb', false));` },
    complexity: `<p>O(1) time and space.</p>`,
    followUps: ['Given a palette, find the nearest colour to X that passes AA on a background.', 'Why do dark themes often use lighter brand colours?']
  }
});

practice.push({
  title: 'Which Caches Should the Service Worker Delete?', level: 'Easy', tags: ['service worker', 'cache versioning'], companies: ['Google', 'Twitter', 'Starbucks'],
  statement: `<p>In the <code>activate</code> event a service worker deletes old caches. Write <code>staleCaches(names, current, prefixes)</code>:</p>
    <ul><li><code>names</code>: every cache name on this origin, e.g. <code>["static-v6", "runtime-v6", "static-v7", "analytics-lib"]</code>.</li>
    <li><code>current</code>: the version suffix this worker owns, e.g. <code>"v7"</code>.</li>
    <li><code>prefixes</code>: the prefixes <i>this app</i> manages, e.g. <code>["static-", "runtime-"]</code>.</li></ul>
    <p>Return the names to delete: caches that start with one of our prefixes <b>and</b> whose version differs from <code>current</code>. Never delete a cache that does not start with our prefixes (another library may own it). Keep the original order.</p>`,
  constraints: `0 ≤ names ≤ 1000. A cache name equals prefix + version exactly.`,
  example: `<p>names: <code>static-v6, runtime-v6, static-v7, analytics-lib</code>; current <code>v7</code></p>${H.table(['name', 'ours?', 'current?', 'delete?'], [['static-v6', 'yes', 'no', '<span class="c-r">delete</span>'], ['runtime-v6', 'yes', 'no', '<span class="c-r">delete</span>'], ['static-v7', 'yes', 'yes', 'keep'], ['analytics-lib', '<span class="c-y">no</span>', '-', 'keep (not ours)']])}`,
  brute: {
    why: `<p>The tempting snippet <code>caches.keys().then(ks =&gt; ks.forEach(k =&gt; caches.delete(k)))</code> wipes <b>everything</b>, including caches owned by other libraries on the same origin and the new worker's own fresh precache. Users go offline-less until the next fetch.</p>`,
    code: `function staleCachesBrute(names, current) {
  return names.filter(n => !n.endsWith(current) );   // BUG: deletes foreign caches like "analytics-lib" too
}`
  },
  mcq: { q: 'Why must the new worker keep its own current-version caches during activate?', options: ['They hold the app shell it just precached in install', 'Because caches cannot be deleted in activate', 'To keep old versions for rollback'], answer: 0, explain: 'The install step filled the current caches; deleting them would leave the freshly activated worker with nothing to serve.' },
  hints: [
    `<p>Hint 1: a cache is "ours" if its name starts with any of the prefixes.</p>`,
    `<p>Hint 2: ours AND not equal to <code>prefix + current</code> → stale.</p>`,
    `<p>Hint 3: use <code>some</code> over the prefixes and compare exact names; keep <code>filter</code> so original order is preserved.</p>`
  ],
  solution: {
    approach: `<p>One filter with two conditions. Exact-name comparison avoids accidents like "static-v70" being treated as "v7" by a suffix check.</p>`,
    code: { lang: 'js', run: true, code: `function staleCaches(names, current, prefixes) {
  const keep = new Set(prefixes.map(p => p + current));            // exact names we must keep
  return names.filter(n => prefixes.some(p => n.startsWith(p)) && !keep.has(n));
}
console.log(staleCaches(['static-v6', 'runtime-v6', 'static-v7', 'analytics-lib', 'static-v70'], 'v7', ['static-', 'runtime-']));` },
    complexity: `<p>O(N · P) for N cache names and P prefixes; space O(P + N).</p>`,
    followUps: ['In the real worker, how do you await all deletions inside event.waitUntil?', 'What if a user has 3 tabs open on the old version while you delete its cache?']
  }
});

practice.push({
  title: 'Find Missing and Broken Translation Keys', level: 'Easy', tags: ['i18n', 'objects', 'CI check'], companies: ['Shopify', 'Airbnb', 'Booking.com'],
  statement: `<p>Two translation catalogs are nested objects, e.g. <code>{ cart: { title: "Cart", items: "{count} items" } }</code>. Write <code>diffCatalogs(base, target)</code> that returns an object with three sorted arrays of <b>dotted key paths</b>:</p>
    <ul><li><code>missing</code>: keys present in <code>base</code> but not in <code>target</code>.</li>
    <li><code>extra</code>: keys in <code>target</code> that are not in <code>base</code>.</li>
    <li><code>placeholders</code>: keys in both where the set of <code>{name}</code> placeholders differs (a translator renamed or lost a variable).</li></ul>`,
  constraints: `Values are strings or nested objects. Depth ≤ 6. Up to 10<sup>4</sup> keys.`,
  example: `<p>base: <code>cart.title="Cart"</code>, <code>cart.items="{count} items"</code>, <code>nav.home="Home"</code>; target (German): <code>cart.title="Warenkorb"</code>, <code>cart.items="{anzahl} Artikel"</code>, <code>nav.help="Hilfe"</code></p>${H.table(['bucket', 'keys'], [['missing', 'nav.home'], ['extra', 'nav.help'], ['placeholders', '<span class="c-r">cart.items</span> ({count} vs {anzahl})']])}`,
  brute: {
    why: `<p>Comparing the JSON text of two files line by line breaks as soon as keys are re-ordered or nested, and it cannot see placeholder mistakes at all. Reviewers then find missing keys in production, as <code>cart.title</code> showing on screen.</p>`,
    code: `function diffBrute(baseText, targetText) {
  const a = baseText.split('\\n'), b = targetText.split('\\n');
  return a.filter(line => !b.includes(line));          // line diff: noisy, order-sensitive, no placeholder logic
}`
  },
  mcq: { q: 'Why check placeholders as well as keys?', options: ['A renamed or deleted {variable} makes the UI show raw braces or crash', 'Placeholders make files smaller', 'Keys are case-insensitive'], answer: 0, explain: 'If the German string says {anzahl} but the code passes {count}, the formatter has no value for it and users see broken text.' },
  hints: [
    `<p>Hint 1: flatten each nested object into a <code>Map</code> from dotted path (<code>"cart.title"</code>) to string.</p>`,
    `<p>Hint 2: missing and extra are simple set differences; placeholders need the set of <code>{...}</code> names for each string (regex <code>/\\{(\\w+)/g</code> is enough for this exercise).</p>`,
    `<p>Hint 3: sort the three results alphabetically; compare placeholder sets after sorting them into a string so order inside the sentence does not matter.</p>`
  ],
  solution: {
    approach: `<p>Flatten both objects once, then three small passes. Normalising placeholders to a sorted, comma-joined string makes the equality check trivial.</p>`,
    code: { lang: 'js', run: true, code: `function flatten(obj, prefix, out) {
  out = out || new Map(); prefix = prefix || '';
  for (const k of Object.keys(obj)) {
    const path = prefix ? prefix + '.' + k : k;
    if (obj[k] !== null && typeof obj[k] === 'object') flatten(obj[k], path, out);
    else out.set(path, String(obj[k]));
  }
  return out;
}
function placeholders(s) {
  const names = [];
  s.replace(/\\{(\\w+)/g, (m, n) => { if (!names.includes(n)) names.push(n); return m; });
  return names.sort().join(',');
}
function diffCatalogs(base, target) {
  const a = flatten(base), b = flatten(target);
  const missing = [], extra = [], bad = [];
  for (const [k, v] of a) {
    if (!b.has(k)) missing.push(k);
    else if (placeholders(v) !== placeholders(b.get(k))) bad.push(k);
  }
  for (const k of b.keys()) if (!a.has(k)) extra.push(k);
  return { missing: missing.sort(), extra: extra.sort(), placeholders: bad.sort() };
}
const en = { cart: { title: 'Cart', items: '{count} items' }, nav: { home: 'Home' } };
const de = { cart: { title: 'Warenkorb', items: '{anzahl} Artikel' }, nav: { help: 'Hilfe' } };
console.log(JSON.stringify(diffCatalogs(en, de)));` },
    complexity: `<p>O(K · L) for K keys with average string length L; space O(K).</p>`,
    followUps: ['Also validate that every ICU plural has an "other" branch.', 'Fail the CI build only for source-language changes without translation updates.']
  }
});

/* ===================== PRACTICE: Medium ===================== */
practice.push({
  title: 'Parallel Build Batches for Affected Packages', level: 'Medium', tags: ['monorepo', 'topological sort', 'graph'], companies: ['Google', 'Meta', 'Vercel'],
  statement: `<p><code>deps</code> maps each package to the packages it depends on. <code>changed</code> lists changed packages. Return an array of <b>batches</b> (arrays of package names). Only affected packages (changed plus all transitive dependents) are included. Every package in a batch can build in parallel because all its affected dependencies appeared in <b>earlier</b> batches. Sort names inside a batch alphabetically. If the affected part of the graph contains a cycle, throw an Error whose message contains <code>"cycle"</code>.</p>`,
  constraints: `1 ≤ packages ≤ 10<sup>4</sup>, edges ≤ 5·10<sup>4</sup>.`,
  example: `<p>deps: utils→[], ui→[utils], api→[utils], shop→[ui, api]; changed: <code>["utils"]</code></p>${H.table(['batch', 'packages', 'why'], [['1', 'utils', 'no affected dependencies'], ['2', 'api, ui', 'both only need utils'], ['3', 'shop', 'needs ui and api']])}<p>Output: <code>[["utils"],["api","ui"],["shop"]]</code></p>`,
  brute: {
    why: `<p>Building affected packages one by one in a single sorted list wastes CI machines: independent packages (<code>api</code> and <code>ui</code>) wait for each other. A naive repeat-until-stable loop that scans all packages each round is O(P²).</p>`,
    code: `function batchesBrute(deps, changed) {
  const order = [];                              // flat list: correct order, but zero parallelism
  const seen = new Set();
  function visit(n) { if (seen.has(n)) return; seen.add(n); deps[n].forEach(visit); order.push(n); }
  Object.keys(deps).forEach(visit);
  return order.map(n => [n]);                   // every batch has exactly one package, and unaffected ones are included too
}`
  },
  mcq: { q: 'In a level-by-level topological sort (Kahn), when does a package join the next batch?', options: ['When all of its affected dependencies have been placed in earlier batches', 'When its name is alphabetically next', 'When it has the most dependents'], answer: 0, explain: 'A package can only build after everything it needs has built, so its in-degree (count of unbuilt affected dependencies) must reach zero.' },
  hints: [
    `<p>Hint 1: two phases. Phase 1: find the affected set (reverse BFS). Phase 2: order only that set.</p>`,
    `<p>Hint 2: for each affected package count how many of its dependencies are also affected (in-degree). Packages with in-degree 0 form batch 1.</p>`,
    `<p>Hint 3: process batch by batch: when a package finishes, decrement the in-degree of its affected dependents; those reaching 0 go into the next batch. If processed count ≠ affected size, a cycle exists.</p>`
  ],
  solution: {
    approach: `<p>Affected set via reverse BFS, then Kahn's algorithm run one <i>level</i> at a time. Each level becomes a batch; cycle detection falls out for free from the leftover count.</p>`,
    code: { lang: 'js', run: true, code: `function batches(deps, changed) {
  const names = Object.keys(deps), rev = {};
  names.forEach(n => { rev[n] = []; });
  names.forEach(n => deps[n].forEach(d => rev[d].push(n)));

  // Phase 1: affected = changed + all transitive dependents
  const aff = new Set(changed), q = Array.from(aff);
  for (let i = 0; i < q.length; i++) rev[q[i]].forEach(u => { if (!aff.has(u)) { aff.add(u); q.push(u); } });

  // Phase 2: Kahn by levels, counting only affected dependencies
  const indeg = {};
  aff.forEach(n => { indeg[n] = deps[n].filter(d => aff.has(d)).length; });
  let level = Array.from(aff).filter(n => indeg[n] === 0).sort();
  const out = []; let done = 0;
  while (level.length) {
    out.push(level); done += level.length;
    const next = [];
    level.forEach(n => rev[n].forEach(u => { if (aff.has(u) && --indeg[u] === 0) next.push(u); }));
    level = next.sort();
  }
  if (done !== aff.size) throw new Error('dependency cycle among affected packages');
  return out;
}
const deps = { utils: [], ui: ['utils'], api: ['utils'], shop: ['ui', 'api'], docs: [] };
console.log(JSON.stringify(batches(deps, ['utils'])));
console.log(JSON.stringify(batches(deps, ['ui'])));
try { batches({ a: ['b'], b: ['a'] }, ['a']); } catch (e) { console.log(e.message); }` },
    complexity: `<p>Time O(P + E + P log P) (sorting inside batches); space O(P + E).</p>`,
    followUps: ['Limit parallelism to k workers.', 'Weight packages by build time and minimise total wall-clock time (critical path).']
  }
});

practice.push({
  title: 'Offline Queue With Retries, Dedupe and Dead Letters', level: 'Medium', tags: ['offline-first', 'retry', 'idempotency'], companies: ['Slack', 'Uber', 'Notion'],
  statement: `<p>Write <code>processOutbox(outbox, send, maxAttempts)</code>. Each outbox message looks like <code>{ id, key }</code>. <code>send(msg, attempt)</code> (attempt starts at 1) returns <code>'ok'</code>, <code>'retry'</code> (temporary failure) or <code>'reject'</code> (the server will never accept it).</p>
    <p>Process messages in order:</p>
    <ul><li>Skip a message whose <code>key</code> was already seen earlier in this outbox (a duplicate click); put its id in <code>skipped</code>.</li>
    <li>Try up to <code>maxAttempts</code> times while the answer is <code>'retry'</code>. Each failed attempt adds a backoff delay <code>min(30000, 1000 · 2<sup>attempt-1</sup>)</code> ms to <code>delays</code>.</li>
    <li><code>'ok'</code> → push id to <code>delivered</code>. <code>'reject'</code> → push id to <code>dead</code> and continue with the next message.</li>
    <li>If a message still says <code>'retry'</code> after the last attempt, <b>stop</b>: it and all later messages go to <code>remaining</code> (keep order).</li></ul>
    <p>Return <code>{ delivered, dead, skipped, remaining, delays }</code> (arrays of ids; <code>remaining</code> holds ids as well).</p>`,
  constraints: `1 ≤ messages ≤ 10<sup>4</sup>, 1 ≤ maxAttempts ≤ 10.`,
  example: `<p>maxAttempts = 3. Messages: m1(key a), m2(key a), m3(key b), m4(key c). send: m1 ok; m3 retry, retry, ok; m4 reject.</p>${H.table(['message', 'what happens'], [['m1', 'ok → delivered'], ['m2', 'same key as m1 → <span class="c-y">skipped</span>'], ['m3', 'attempt 1 retry (wait 1000), attempt 2 retry (wait 2000), attempt 3 ok → delivered'], ['m4', 'reject → <span class="c-r">dead letter</span>']])}`,
  brute: {
    why: `<p>A loop that retries forever blocks the whole queue behind one bad message, a loop with no retries loses data on a single blip, and ignoring duplicate keys double-charges the customer.</p>`,
    code: `async function processBrute(outbox, send) {
  for (const m of outbox) {
    while (send(m, 1) !== 'ok') { /* spin forever on retry or reject */ }
  }
}`
  },
  mcq: { q: 'Which result should send the message to the dead-letter list instead of being retried?', options: ['A permanent rejection (e.g. HTTP 422 validation error)', 'A network timeout', 'A 503 Service Unavailable'], answer: 0, explain: 'Retrying a request the server will never accept wastes bandwidth and blocks the queue; park it for a human or show an error.' },
  hints: [
    `<p>Hint 1: keep a <code>Set</code> of keys seen so far (add the key even if the message later fails, since the duplicate is the same user intent).</p>`,
    `<p>Hint 2: an inner loop <code>for attempt = 1..max</code> handles the retry logic; record a delay after each failed attempt.</p>`,
    `<p>Hint 3: when attempts run out, push the current message and everything after it into <code>remaining</code>, then stop the outer loop. Use index access so you can slice.</p>`
  ],
  solution: {
    approach: `<p>Outer loop over messages with an index, inner loop over attempts. Three outcomes are handled explicitly. Exhausted retries preserve the order of everything left, so the next flush can resume safely.</p>`,
    code: { lang: 'js', run: true, code: `function processOutbox(outbox, send, maxAttempts) {
  const res = { delivered: [], dead: [], skipped: [], remaining: [], delays: [] };
  const seen = new Set();
  for (let i = 0; i < outbox.length; i++) {
    const m = outbox[i];
    if (seen.has(m.key)) { res.skipped.push(m.id); continue; }
    seen.add(m.key);
    let outcome = 'retry';
    for (let attempt = 1; attempt <= maxAttempts && outcome === 'retry'; attempt++) {
      outcome = send(m, attempt);
      if (outcome === 'retry') res.delays.push(Math.min(30000, 1000 * Math.pow(2, attempt - 1)));
    }
    if (outcome === 'ok') res.delivered.push(m.id);
    else if (outcome === 'reject') res.dead.push(m.id);
    else { res.remaining = outbox.slice(i).map(x => x.id); break; }   // out of attempts: stop, keep order
  }
  return res;
}
const outbox = [{ id: 'm1', key: 'a' }, { id: 'm2', key: 'a' }, { id: 'm3', key: 'b' }, { id: 'm4', key: 'c' }];
const send = (m, attempt) => (m.id === 'm1' ? 'ok' : m.id === 'm3' ? (attempt < 3 ? 'retry' : 'ok') : 'reject');
console.log(JSON.stringify(processOutbox(outbox, send, 3)));
console.log(JSON.stringify(processOutbox(outbox, () => 'retry', 2)));` },
    complexity: `<p>Time O(N · A) for N messages and A max attempts; space O(N).</p>`,
    followUps: ['Add full jitter to the delays (random between 0 and the delay).', 'Respect a Retry-After value returned with a retry.']
  }
});

practice.push({
  title: 'Feature Flag Evaluation Order With Targeting Rules', level: 'Medium', tags: ['feature flags', 'rules engine', 'hashing'], companies: ['LaunchDarkly', 'Split', 'Atlassian'],
  statement: `<p>Write <code>evaluate(flag, user)</code>. The flag is plain data:</p>
    <pre>{ key, killSwitch, overrides: { userId: bool }, rules: [{ attr, op, value, serve }], percent, defaultValue }</pre>
    <p><code>op</code> is one of <code>eq</code>, <code>in</code> (value is an array), <code>lt</code>, <code>gte</code>. Evaluate in this order and return <code>{ on, reason }</code> with reason one of <code>"kill"</code>, <code>"override"</code>, <code>"rule"</code>, <code>"rollout"</code>, <code>"default"</code>:</p>
    <ol><li>If <code>killSwitch</code> → off.</li><li>If <code>user.id</code> has an override → that value.</li><li>First rule whose condition matches the user attribute → its <code>serve</code> value. A rule on a missing attribute never matches.</li><li>Else, if FNV-1a(<code>key + ':' + user.id</code>) % 100 &lt; <code>percent</code> → on (reason "rollout").</li><li>Else <code>defaultValue</code> (reason "default").</li></ol>`,
  constraints: `Up to 100 rules per flag. Rules are data (JSON), never functions.`,
  example: `${H.table(['user', 'result', 'why'], [['qa (override true)', 'on / override', 'step 2 beats rules and rollout'], ['{country: DE} with rule country in [DE,AT] → true', 'on / rule', 'step 3'], ['{id: carol} bucket 14, percent 25', 'on / rollout', 'step 4'], ['any user while killSwitch', 'off / kill', 'step 1 beats everything']])}`,
  brute: {
    why: `<p>Hard-coding conditions in <code>if</code> statements inside components means every targeting change needs a code deploy, the order of checks differs per file, and the kill switch is forgotten in some places.</p>`,
    code: `function evaluateBrute(flag, user) {
  if (user.country === 'DE') return { on: true, reason: 'rule' };       // hard-coded rule
  if (Math.random() * 100 < flag.percent) return { on: true, reason: 'rollout' };   // flickers
  return { on: false, reason: 'default' };
}`
  },
  mcq: { q: 'Which should have the highest priority in the evaluation order?', options: ['The kill switch', 'The percentage rollout', 'The default value'], answer: 0, explain: 'During an incident, one switch must turn the feature off for everybody, including overrides and targeted groups.' },
  hints: [
    `<p>Hint 1: write the five steps as five early-return checks, in order. Order is the whole problem.</p>`,
    `<p>Hint 2: a small <code>matches(rule, user)</code> helper with a switch on <code>op</code> keeps the main function readable.</p>`,
    `<p>Hint 3: use <code>user.id in overrides</code> (or hasOwnProperty), so an override of <code>false</code> is not skipped as falsy. Missing attribute → <code>undefined</code> → no rule matches.</p>`
  ],
  solution: {
    approach: `<p>Early returns in priority order. Rules are data interpreted by a tiny matcher; the rollout reuses stable FNV-1a bucketing.</p>`,
    code: { lang: 'js', run: true, code: `function fnv1a(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }

function matches(rule, user) {
  const v = user[rule.attr];
  if (v === undefined) return false;                 // missing attribute never matches
  switch (rule.op) {
    case 'eq':  return v === rule.value;
    case 'in':  return rule.value.includes(v);
    case 'lt':  return v < rule.value;
    case 'gte': return v >= rule.value;
    default:    return false;
  }
}
function evaluate(flag, user) {
  if (flag.killSwitch) return { on: false, reason: 'kill' };
  if (Object.prototype.hasOwnProperty.call(flag.overrides, user.id)) return { on: flag.overrides[user.id], reason: 'override' };
  for (const r of flag.rules) if (matches(r, user)) return { on: r.serve, reason: 'rule' };
  if (fnv1a(flag.key + ':' + user.id) % 100 < flag.percent) return { on: true, reason: 'rollout' };
  return { on: flag.defaultValue, reason: 'default' };
}

const flag = { key: 'newCheckout', killSwitch: false, overrides: { qa: true, spammer: false },
  rules: [{ attr: 'country', op: 'in', value: ['DE', 'AT'], serve: true }, { attr: 'appVersion', op: 'lt', value: 120, serve: false }],
  percent: 25, defaultValue: false };
[{ id: 'qa' }, { id: 'hans', country: 'DE' }, { id: 'old', appVersion: 100 }, { id: 'carol' }, { id: 'dave' }]
  .forEach(u => console.log(u.id.padEnd(6), JSON.stringify(evaluate(flag, u))));
flag.killSwitch = true;
console.log('kill:', JSON.stringify(evaluate(flag, { id: 'qa' })));` },
    complexity: `<p>Time O(R + L) for R rules and id length L; space O(1).</p>`,
    followUps: ['Add AND/OR combinations of conditions.', 'Return a variant for A/B/C tests using ranges of the bucket.']
  }
});

practice.push({
  title: 'Mini ICU Formatter: Plural, Select and Nesting', level: 'Medium', tags: ['i18n', 'parsing', 'ICU'], companies: ['Airbnb', 'Spotify', 'Meta'],
  statement: `<p>Write <code>format(message, values, pluralRule)</code>. The message may contain:</p>
    <ul><li><code>{name}</code> → <code>String(values.name)</code> (throw an Error if missing).</li>
    <li><code>{n, plural, =0 {...} one {...} other {...}}</code> → exact <code>=N</code> match first; otherwise <code>pluralRule(n)</code> gives a category; fall back to <code>other</code>. Inside the chosen block <code>#</code> becomes <code>n</code>.</li>
    <li><code>{g, select, female {...} male {...} other {...}}</code> → choose by <code>values.g</code> or fall back to <code>other</code>.</li></ul>
    <p>Blocks can nest (a select inside a plural, and vice versa). Braces are always balanced. Outside any plural, <code>#</code> is plain text.</p>`,
  constraints: `Message length ≤ 2000, nesting depth ≤ 5.`,
  example: `<p><code>{n, plural, =0 {No messages} one {# message} other {# messages}} from {name}</code></p>${H.table(['values', 'output'], [['n=0, name=Ana', 'No messages from Ana'], ['n=1, name=Ana', '1 message from Ana'], ['n=5, name=Ana', '5 messages from Ana']])}`,
  brute: {
    why: `<p>Regex replacement (<code>/\\{(\\w+)\\}/g</code>) cannot handle nested braces, so any plural or select block is mangled. Splitting on commas also breaks because the inner text contains commas.</p>`,
    code: `function formatBrute(msg, values) {
  return msg.replace(/\\{(\\w+)\\}/g, (m, k) => values[k]);   // leaves "{n, plural, ...}" untouched and cannot nest
}`
  },
  mcq: { q: 'Why is a regular expression not enough to parse ICU messages?', options: ['Blocks nest, and matching braces needs counting depth', 'Regex cannot read letters', 'ICU messages are binary'], answer: 0, explain: 'Balanced nested braces are beyond what a simple regex can match; a small scanner that tracks brace depth is the right tool.' },
  hints: [
    `<p>Hint 1: write <code>matchBrace(s, i)</code> that returns the index of the closing brace matching the opening brace at <code>i</code> by counting depth.</p>`,
    `<p>Hint 2: <code>render(text, hash)</code> scans characters: on <code>{</code> find its end and hand the inside to <code>argument()</code>; on <code>#</code> (when inside a plural) output the number; otherwise copy.</p>`,
    `<p>Hint 3: in <code>argument</code>, split off name and type at the first two commas, then read option pairs <code>key {body}</code> using <code>matchBrace</code> again. Recurse by calling <code>render</code> on the chosen body.</p>`
  ],
  solution: {
    approach: `<p>A recursive-descent scanner: <code>render</code> handles text, <code>argument</code> handles one <code>{...}</code> block, and both call each other for nesting. The plural number is passed down so <code>#</code> works even through a select.</p>`,
    code: { lang: 'js', run: true, code: `function format(message, values, pluralRule) {
  function matchBrace(s, i) {
    let depth = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}' && --depth === 0) return j;
    }
    throw new Error('unbalanced braces');
  }
  function parseOptions(s) {
    const opts = {}; let i = 0;
    while (i < s.length) {
      while (i < s.length && /\\s/.test(s[i])) i++;
      if (i >= s.length) break;
      let key = '';
      while (i < s.length && s[i] !== '{' && !/\\s/.test(s[i])) key += s[i++];
      while (i < s.length && /\\s/.test(s[i])) i++;
      const end = matchBrace(s, i);
      opts[key] = s.slice(i + 1, end);
      i = end + 1;
    }
    return opts;
  }
  function argument(body, hash) {
    const c1 = body.indexOf(',');
    if (c1 < 0) {
      const name = body.trim();
      if (!(name in values)) throw new Error('missing value: ' + name);
      return String(values[name]);
    }
    const name = body.slice(0, c1).trim();
    const rest = body.slice(c1 + 1), c2 = rest.indexOf(',');
    const type = rest.slice(0, c2).trim(), opts = parseOptions(rest.slice(c2 + 1));
    if (type === 'plural') {
      const n = Number(values[name]);
      const chosen = opts['=' + n] !== undefined ? opts['=' + n]
        : (opts[pluralRule(n)] !== undefined ? opts[pluralRule(n)] : opts.other);
      return render(chosen, n);                       // '#' now means n
    }
    if (type === 'select') {
      const v = String(values[name]);
      return render(opts[v] !== undefined ? opts[v] : opts.other, hash);
    }
    throw new Error('unknown type: ' + type);
  }
  function render(s, hash) {
    let out = '';
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '{') { const end = matchBrace(s, i); out += argument(s.slice(i + 1, end), hash); i = end; }
      else if (s[i] === '#' && hash !== null) out += hash;
      else out += s[i];
    }
    return out;
  }
  return render(message, null);
}

const en = n => (n === 1 ? 'one' : 'other');
const msg = '{n, plural, =0 {No messages} one {# message} other {# messages}} from {name}';
[0, 1, 5].forEach(n => console.log(format(msg, { n: n, name: 'Ana' }, en)));
const nested = '{g, select, female {She has {n, plural, one {# cat} other {# cats}}} other {They have {n, plural, one {# cat} other {# cats}}}}';
console.log(format(nested, { g: 'female', n: 2 }, en));
console.log(format(nested, { g: 'x', n: 1 }, en));` },
    complexity: `<p>Time O(L · D) for message length L and nesting depth D (brace matching rescans); space O(L).</p>`,
    followUps: ['Support selectordinal and number formatting {n, number}.', 'Escape literal braces with an apostrophe, as real ICU does.']
  }
});

practice.push({
  title: 'Cache With TTL and Stale-While-Revalidate Window', level: 'Medium', tags: ['service worker', 'caching', 'time'], companies: ['Cloudflare', 'Fastly', 'Google'],
  statement: `<p>Build <code>makeCache(ttl, swr)</code> returning <code>get(url, now, fetchFn)</code>. Entries remember the time they were stored. For a request at time <code>now</code> (ms) with age = now − storedAt:</p>
    <ul><li>no entry → call <code>fetchFn(url)</code>, store it, return <code>{ body, source: 'network' }</code>.</li>
    <li>age ≤ <code>ttl</code> → <b>fresh</b>: return <code>{ body, source: 'cache' }</code>, no network call.</li>
    <li><code>ttl &lt; age ≤ ttl + swr</code> → <b>stale but usable</b>: return the OLD body immediately with <code>source: 'cache+refresh'</code>, and refresh in the background (call <code>fetchFn</code> now and store the new body with <code>storedAt = now</code>).</li>
    <li>age &gt; ttl + swr → too old: treat as no entry (<code>source: 'network'</code>).</li></ul>`,
  constraints: `Time values are non-decreasing integers in ms. fetchFn is synchronous in this model.`,
  example: `<p>ttl = 1000, swr = 4000; stored at t = 0.</p>${H.table(['now', 'age', 'result'], [['500', '500', '<span class="c-g">cache</span>'], ['3000', '3000', '<span class="c-y">cache+refresh</span> (old body returned; new copy stored at 3000)'], ['9000', '9000 (&gt; 5000)', '<span class="c-b">network</span>']])}`,
  brute: {
    why: `<p>A plain cache without ages either serves stale data forever (bugs after a deploy) or always revalidates (no speed benefit). Without a bounded stale window a user who returns after a month sees a month-old page for one more visit.</p>`,
    code: `function makeCacheBrute() {
  const m = new Map();
  return (url, fetchFn) => { if (!m.has(url)) m.set(url, fetchFn(url)); return { body: m.get(url), source: 'cache' }; };   // never expires
}`
  },
  mcq: { q: 'In stale-while-revalidate, what does the user receive when the entry is stale but inside the SWR window?', options: ['The old copy immediately; the refresh happens in the background', 'An error until the refresh finishes', 'The new copy after waiting for the network'], answer: 0, explain: 'SWR trades a little freshness for speed: answer now with what you have, update for next time.' },
  hints: [
    `<p>Hint 1: store <code>{ body, storedAt }</code> per URL in a Map.</p>`,
    `<p>Hint 2: compute <code>age = now - storedAt</code> once and test it against <code>ttl</code> and <code>ttl + swr</code> in that order.</p>`,
    `<p>Hint 3: in the refresh case return the old body first (save it in a variable) before overwriting the entry.</p>`
  ],
  solution: {
    approach: `<p>Three age bands map to three behaviours. The only trap is returning the old body in the middle band after the entry has been replaced by the refresh.</p>`,
    code: { lang: 'js', run: true, code: `function makeCache(ttl, swr) {
  const store = new Map();
  return {
    get(url, now, fetchFn) {
      const e = store.get(url);
      const age = e ? now - e.storedAt : Infinity;
      if (e && age <= ttl) return { body: e.body, source: 'cache' };
      if (e && age <= ttl + swr) {
        const old = e.body;                                         // answer with this
        store.set(url, { body: fetchFn(url), storedAt: now });      // refresh for next time
        return { body: old, source: 'cache+refresh' };
      }
      const body = fetchFn(url);
      store.set(url, { body: body, storedAt: now });
      return { body: body, source: 'network' };
    }
  };
}
let version = 0;
const fetchFn = () => 'v' + (++version);
const c = makeCache(1000, 4000);
[0, 500, 3000, 3200, 9000].forEach(t => console.log(String(t).padStart(5), JSON.stringify(c.get('/api', t, fetchFn))));` },
    complexity: `<p>O(1) per request, O(U) space for U distinct URLs.</p>`,
    followUps: ['Deduplicate concurrent refreshes for the same URL.', 'Add stale-if-error: serve very old data when the network fails.']
  }
});

practice.push({
  title: 'Remote Loader With Retries, Timeout and Circuit Breaker', level: 'Medium', tags: ['micro-frontends', 'resilience', 'state machine'], companies: ['Netflix', 'Zalando', 'Amazon'],
  statement: `<p>Write <code>createLoader({ load, timeoutMs, retries, threshold, cooldownMs, now })</code> returning <code>get(name)</code>. <code>load(name)</code> simulates a download and returns <code>{ ok, ms }</code>; <code>now()</code> returns the current time in ms.</p>
    <ul><li>An attempt <b>succeeds</b> only if <code>ok</code> and <code>ms ≤ timeoutMs</code>. A module that loaded is cached: later calls return <code>{ status: 'cached' }</code> with no <code>load</code> call.</li>
    <li>A normal call tries <code>1 + retries</code> times. First success → <code>{ status: 'loaded' }</code> and the failure count for that remote resets to 0.</li>
    <li>If all attempts fail: failures++ and return <code>{ status: 'fallback', reason: 'failed' }</code>. When failures reach <code>threshold</code>, <b>open the circuit</b> at <code>now()</code>.</li>
    <li>While the circuit is open and less than <code>cooldownMs</code> has passed, return <code>{ status: 'fallback', reason: 'circuit-open' }</code> <b>without calling load</b>. After the cooldown allow exactly <b>one</b> trial attempt (no retries): success closes the circuit; failure re-opens it with a fresh timestamp.</li></ul>`,
  constraints: `State is per remote name. threshold ≥ 1, retries ≥ 0.`,
  example: `<p>timeoutMs 2000, retries 1, threshold 2, cooldown 10000. Remote "cart" is down.</p>${H.table(['t', 'call', 'load calls', 'result'], [['0', 'get(cart)', '2', 'fallback / failed (failures=1)'], ['100', 'get(cart)', '2', 'fallback / failed (failures=2 → circuit opens)'], ['200', 'get(cart)', '<b>0</b>', 'fallback / circuit-open'], ['10200', 'get(cart)', '1 (trial)', 'if it works: loaded, circuit closed']])}`,
  brute: {
    why: `<p>Retrying forever on every navigation hammers a broken CDN and makes each page wait for several timeouts; the shell feels frozen even though the cart is "just one widget". A breaker fails fast and probes occasionally.</p>`,
    code: `function getBrute(name, load) {
  for (;;) { const r = load(name); if (r.ok) return { status: 'loaded' }; }   // blocks the UI thread of the app forever when the remote is down
}`
  },
  mcq: { q: 'What is the purpose of the cooldown / half-open trial in a circuit breaker?', options: ['Fail fast while the remote is broken, but still notice when it recovers', 'To make requests slower on purpose', 'To permanently disable the remote'], answer: 0, explain: 'While open we skip the network entirely. After a cooldown one trial request checks whether the remote is healthy again.' },
  hints: [
    `<p>Hint 1: keep per-name state: <code>{ module, failures, openedAt }</code>. <code>openedAt = null</code> means closed.</p>`,
    `<p>Hint 2: order of checks in <code>get</code>: cached? → circuit open and still cooling? → otherwise attempt (normal or single trial).</p>`,
    `<p>Hint 3: a trial happens when <code>openedAt</code> is set and cooldown has passed: use 1 attempt instead of 1+retries; on failure set <code>openedAt = now()</code> again.</p>`
  ],
  solution: {
    approach: `<p>A small state machine per remote: closed → (threshold failures) → open → (cooldown) → half-open trial → closed or open again. Keeping the state in a Map keyed by remote name makes remotes independent.</p>`,
    code: { lang: 'js', run: true, code: `function createLoader(opts) {
  const state = new Map();
  const st = name => { if (!state.has(name)) state.set(name, { module: null, failures: 0, openedAt: null }); return state.get(name); };
  const works = r => r.ok && r.ms <= opts.timeoutMs;
  return {
    get(name) {
      const s = st(name);
      if (s.module) return { status: 'cached' };
      const trial = s.openedAt !== null && opts.now() - s.openedAt >= opts.cooldownMs;
      if (s.openedAt !== null && !trial) return { status: 'fallback', reason: 'circuit-open' };
      const attempts = trial ? 1 : 1 + opts.retries;           // half-open: exactly one probe
      for (let i = 0; i < attempts; i++) {
        if (works(opts.load(name))) {
          s.module = { name: name }; s.failures = 0; s.openedAt = null;
          return { status: 'loaded' };
        }
      }
      s.failures++;
      if (trial || s.failures >= opts.threshold) s.openedAt = opts.now();    // (re)open the circuit
      return { status: 'fallback', reason: 'failed' };
    }
  };
}
let clock = 0, calls = 0, healthy = false;
const loader = createLoader({ load: () => { calls++; return { ok: healthy, ms: 100 }; }, timeoutMs: 2000, retries: 1, threshold: 2, cooldownMs: 10000, now: () => clock });
[[0], [100], [200], [10200]].forEach(([t]) => {
  clock = t; const before = calls;
  if (t === 10200) healthy = true;                       // the CDN recovers
  console.log('t=' + String(t).padStart(5), JSON.stringify(loader.get('cart')), 'load calls:', calls - before);
});
console.log(JSON.stringify(loader.get('cart')));` },
    complexity: `<p>O(1) bookkeeping per call; at most 1 + retries load calls.</p>`,
    followUps: ['Add exponential backoff between retries.', 'Share breaker state across tabs with BroadcastChannel.']
  }
});

/* ===================== PRACTICE: Hard ===================== */
practice.push({
  title: 'Shared Scope Resolver: Singletons, Strict Versions and Own Copies', level: 'Hard', tags: ['module federation', 'semver', 'resolution'], companies: ['ByteDance', 'Spotify', 'Zalando'],
  statement: `<p>Write <code>resolveShared(providers, consumers, config)</code>.</p>
    <ul><li><code>providers</code>: <code>{ lib: [{ app, version }] }</code> — copies each app registered (versions like "18.3.1").</li>
    <li><code>consumers</code>: array of <code>{ app, lib, range, strict }</code>; range is exact ("18.2.0") or caret ("^18.2.0", same major and ≥ floor; treat major 0 like any other major to keep it simple).</li>
    <li><code>config</code>: <code>{ lib: { singleton: boolean } }</code>.</li></ul>
    <p>Return one result per consumer, same order: <code>{ app, lib, version, status }</code>.</p>
    <ul><li><b>Singleton lib</b>: everybody receives the <b>highest</b> provided version. If it satisfies the range → <code>'ok'</code>. If not: <code>strict</code> → <code>version: null, status: 'error'</code>, otherwise keep the version with <code>status: 'warn'</code>.</li>
    <li><b>Non-singleton lib</b>: the consumer gets the <b>highest provided version that satisfies its range</b> → <code>'ok'</code>. If none does, it falls back to <b>its own</b> provided copy → <code>'own-copy'</code>. With no own copy → <code>version: null, status: 'error'</code>.</li></ul>
    <p>A lib with no providers gives <code>version: null, status: 'error'</code> for all its consumers.</p>`,
  constraints: `Up to 50 libs, 100 apps. Compare versions numerically.`,
  example: `<p>react (singleton): shell 18.3.1, cart 18.2.0, old 17.0.2. date-fns (not singleton): shell 3.6.0, old 2.30.0.</p>${H.table(['consumer', 'lib / range', 'result'], [['cart', 'react ^18.2.0', '<span class="c-g">18.3.1 ok</span>'], ['old', 'react ^17.0.0, strict', '<span class="c-r">error</span> (singleton 18.3.1 is outside range)'], ['old', 'date-fns ^2.0.0', '<span class="c-g">2.30.0 ok</span> (highest satisfying)'], ['shell', 'date-fns ^4.0.0', '<span class="c-y">nothing provided satisfies ^4 → falls back to its own copy 3.6.0 (own-copy)</span>']])}`,
  brute: {
    why: `<p>Picking "the first registered version" for every consumer depends on load order and silently gives a major-version mismatch; treating every lib as a singleton forces unrelated libraries (like a date helper) into one version and blocks teams from upgrading independently.</p>`,
    code: `function resolveBrute(providers, consumers) {
  return consumers.map(c => ({ app: c.app, lib: c.lib, version: providers[c.lib][0].version, status: 'ok' }));  // first wins, ignores ranges, singleton and strict
}`
  },
  mcq: { q: 'Why can a non-singleton library give different consumers different versions safely?', options: ['Two copies of a stateless helper library do not conflict', 'Because versions are ignored at runtime', 'Because bundlers merge them'], answer: 0, explain: 'Duplication only costs bytes for pure utilities. State-holding libraries (React, router, i18n runtime) must be singletons.' },
  hints: [
    `<p>Hint 1: build helpers <code>cmp</code>, <code>satisfies</code> and <code>highest(list)</code> first; the rest is branching.</p>`,
    `<p>Hint 2: for each consumer look at <code>config[lib].singleton</code>. Singleton path: one global choice. Non-singleton path: filter providers by the range, then take the highest.</p>`,
    `<p>Hint 3: own-copy fallback: look for a provider entry whose <code>app</code> equals the consumer's app. Handle missing lib / empty provider list first, returning an error row.</p>`
  ],
  solution: {
    approach: `<p>Pre-compute the singleton choice per lib once, then map over consumers with a small decision tree. All comparisons are numeric; strictness only changes the outcome for singleton mismatches.</p>`,
    code: { lang: 'js', run: true, code: `const parse = v => v.split('.').map(Number);
function cmp(a, b) { const x = parse(a), y = parse(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; }
function satisfies(v, range) {
  if (range[0] !== '^') return v === range;
  const f = range.slice(1);
  return parse(v)[0] === parse(f)[0] && cmp(v, f) >= 0;
}
const highest = list => list.reduce((b, v) => (cmp(v, b) > 0 ? v : b));

function resolveShared(providers, consumers, config) {
  const single = {};
  Object.keys(providers).forEach(lib => { if (providers[lib].length) single[lib] = highest(providers[lib].map(p => p.version)); });

  return consumers.map(c => {
    const list = providers[c.lib] || [];
    const base = { app: c.app, lib: c.lib };
    if (!list.length) return Object.assign(base, { version: null, status: 'error' });

    if (config[c.lib] && config[c.lib].singleton) {
      const v = single[c.lib];
      if (satisfies(v, c.range)) return Object.assign(base, { version: v, status: 'ok' });
      return c.strict ? Object.assign(base, { version: null, status: 'error' })
                      : Object.assign(base, { version: v, status: 'warn' });
    }
    const fits = list.map(p => p.version).filter(v => satisfies(v, c.range));
    if (fits.length) return Object.assign(base, { version: highest(fits), status: 'ok' });
    const own = list.find(p => p.app === c.app);
    return own ? Object.assign(base, { version: own.version, status: 'own-copy' })
               : Object.assign(base, { version: null, status: 'error' });
  });
}

const providers = {
  react: [{ app: 'shell', version: '18.3.1' }, { app: 'cart', version: '18.2.0' }, { app: 'old', version: '17.0.2' }],
  'date-fns': [{ app: 'shell', version: '3.6.0' }, { app: 'old', version: '2.30.0' }]
};
const consumers = [
  { app: 'cart', lib: 'react', range: '^18.2.0', strict: false },
  { app: 'old', lib: 'react', range: '^17.0.0', strict: true },
  { app: 'old', lib: 'date-fns', range: '^2.0.0', strict: false },
  { app: 'shell', lib: 'date-fns', range: '^4.0.0', strict: false },
  { app: 'ghost', lib: 'lodash', range: '^4.0.0', strict: false }
];
resolveShared(providers, consumers, { react: { singleton: true }, 'date-fns': { singleton: false } })
  .forEach(r => console.log(JSON.stringify(r)));` },
    complexity: `<p>Time O(P + C · P) for P total provider entries and C consumers; space O(C + libs).</p>`,
    followUps: ['Support requiredVersion = false (accept anything).', 'Use per-major singleton groups so React 17 and 18 islands can coexist.']
  }
});

practice.push({
  title: 'Monorepo Task Cache Keys (Merkle Hashing)', level: 'Hard', tags: ['monorepo', 'hashing', 'DAG', 'caching'], companies: ['Vercel', 'Google', 'Nx'],
  statement: `<p>Each package has <code>deps</code> (names it depends on) and <code>files</code> (one string standing for its source content). Define the task hash of a package as <code>fnv1a(name + '|' + files + '|' + depHashes)</code> where <code>depHashes</code> is the task hashes of its dependencies, <b>sorted by dependency name</b>, joined with ",". (A hash is a decimal number string.)</p>
    <p>Write <code>planBuild(pkgs, previous)</code>. <code>previous</code> maps package name → the hash recorded in the cache from the last successful build (may be missing). Return <code>{ hashes, hit, miss }</code>: <code>hashes</code> maps every package to its new hash; <code>hit</code> lists (sorted) packages whose new hash equals <code>previous[name]</code>; <code>miss</code> lists the rest (sorted). Throw an Error containing "cycle" if the graph has a cycle.</p>`,
  constraints: `Up to 10<sup>4</sup> packages. Compute each package's hash exactly once (memoise).`,
  example: `<p>utils ← ui ← shop; previous = all hashes from the last build. Now utils' files changed.</p>${H.table(['package', 'own files changed?', 'dependency hash changed?', 'result'], [['utils', 'yes', '-', '<span class="c-r">miss</span>'], ['ui', 'no', 'yes (utils)', '<span class="c-r">miss</span>'], ['shop', 'no', 'yes (ui)', '<span class="c-r">miss</span>'], ['docs (no deps)', 'no', '-', '<span class="c-g">hit</span>']])}`,
  brute: {
    why: `<p>Hashing only each package's own files misses changes in dependencies: <code>ui</code> would be served from the cache with an old copy of <code>utils</code> baked in, shipping a stale bundle. Rehashing the whole repository on every change makes every task a miss.</p>`,
    code: `function planBrute(pkgs, previous) {
  const hashes = {};
  for (const n of Object.keys(pkgs)) hashes[n] = String(pkgs[n].files.length);   // ignores dependencies (stale cache bugs!)
  return { hashes, hit: [], miss: Object.keys(pkgs) };
}`
  },
  mcq: { q: 'Why must a package hash include the hashes of its dependencies?', options: ['A change deep in a dependency must invalidate everything built on top of it', 'To make hashes longer', 'Because dependencies are always rebuilt first'], answer: 0, explain: 'Hashes of dependencies form a Merkle chain: one changed file at the bottom changes every hash above it, with no extra "affected" logic.' },
  hints: [
    `<p>Hint 1: a package's hash depends on its dependencies' hashes, so compute hashes in dependency-first order (DFS with memo).</p>`,
    `<p>Hint 2: use three states per node (unvisited, visiting, done). Meeting a "visiting" node again means a cycle.</p>`,
    `<p>Hint 3: sort dependency <i>names</i> before collecting their hashes so that the order in the input array never changes the result. After hashing, compare with <code>previous</code> to split hit/miss.</p>`
  ],
  solution: {
    approach: `<p>Memoised depth-first search computes each hash after its dependencies. The tri-state marker detects cycles. Hit/miss is a simple comparison afterwards, so the work is linear in graph size.</p>`,
    code: { lang: 'js', run: true, code: `function fnv1a(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }

function planBuild(pkgs, previous) {
  const hashes = {}, state = {};            // state: undefined = new, 1 = visiting, 2 = done
  function hashOf(name) {
    if (state[name] === 2) return hashes[name];
    if (state[name] === 1) throw new Error('dependency cycle at ' + name);
    state[name] = 1;
    const depHashes = pkgs[name].deps.slice().sort().map(hashOf).join(',');   // dependencies first
    hashes[name] = String(fnv1a(name + '|' + pkgs[name].files + '|' + depHashes));
    state[name] = 2;
    return hashes[name];
  }
  const names = Object.keys(pkgs).sort();
  names.forEach(hashOf);
  const hit = names.filter(n => previous[n] === hashes[n]);
  const miss = names.filter(n => previous[n] !== hashes[n]);
  return { hashes: hashes, hit: hit, miss: miss };
}

const pkgs = {
  utils: { deps: [], files: 'export const x = 1' },
  ui: { deps: ['utils'], files: 'Button' },
  shop: { deps: ['ui'], files: 'App' },
  docs: { deps: [], files: 'readme' }
};
const first = planBuild(pkgs, {});
console.log('first build misses:', first.miss.join(', '));
const again = planBuild(pkgs, first.hashes);
console.log('nothing changed -> hits:', again.hit.join(', '));
pkgs.utils.files = 'export const x = 2';                // edit the bottom of the tree
const after = planBuild(pkgs, first.hashes);
console.log('utils edited -> hit:', after.hit.join(', '), '| miss:', after.miss.join(', '));
try { planBuild({ a: { deps: ['b'], files: '' }, b: { deps: ['a'], files: '' } }, {}); } catch (e) { console.log(e.message); }` },
    complexity: `<p>Time O(P + E + total file length); space O(P) for memo and recursion (use an explicit stack for very deep graphs).</p>`,
    followUps: ['Add environment variables and the task command to the hash.', 'Why should the hash not include absolute file paths or timestamps?']
  }
});

practice.push({
  title: 'Runtime Cache With Entry and Byte Limits (LRU)', level: 'Hard', tags: ['service worker', 'LRU', 'data structures'], companies: ['Google', 'Pinterest', 'Dropbox'],
  statement: `<p>A service worker's image cache must not grow forever. Implement <code>class RuntimeCache</code> with <code>constructor(maxEntries, maxBytes)</code> and:</p>
    <ul><li><code>put(url, bytes)</code> — store or replace an entry. If <code>bytes &gt; maxBytes</code>, do not store it and return <code>false</code> (and leave any existing entry for the url untouched). Otherwise store, mark it most recently used, <b>evict least-recently-used entries</b> until both limits hold, and return <code>true</code>.</li>
    <li><code>get(url)</code> — return the bytes (marks the entry most recently used) or <code>undefined</code>.</li>
    <li><code>keys()</code> — array of urls from least to most recently used. <code>size()</code> — total bytes stored.</li></ul>`,
  constraints: `1 ≤ maxEntries ≤ 10<sup>5</sup>, maxBytes up to 10<sup>9</sup>. All operations should be O(1) amortised (eviction may loop).`,
  example: `<p>maxEntries 3, maxBytes 100.</p>${H.table(['operation', 'keys (LRU → MRU)', 'size'], [['put a 40', 'a', '40'], ['put b 40', 'a, b', '80'], ['get a', 'b, a', '80'], ['put c 40', 'b, a, c → <span class="c-r">evict b</span> (over 100 bytes)', '80'], ['put d 200', 'a, c  (too big: <span class="c-r">false</span>)', '80']])}`,
  brute: {
    why: `<p>Keeping an array of entries and sorting by last-used time on every <code>put</code> costs O(n log n) per request, and scanning to find the oldest is O(n); with thousands of images the worker thread stalls and drops frames.</p>`,
    code: `class RuntimeCacheBrute {
  constructor(maxEntries, maxBytes) { this.max = maxEntries; this.maxBytes = maxBytes; this.items = []; }
  put(url, bytes) {
    this.items = this.items.filter(i => i.url !== url);
    this.items.push({ url, bytes, t: Date.now() });
    this.items.sort((a, b) => a.t - b.t);              // O(n log n) every time
    while (this.items.length > this.max) this.items.shift();
    return true;                                      // ignores maxBytes entirely
  }
}`
  },
  mcq: { q: 'Which JavaScript structure gives O(1) "move to most recent" and "evict oldest" without writing a linked list?', options: ['Map (it remembers insertion order)', 'A plain array', 'A Set of numbers'], answer: 0, explain: 'A Map iterates in insertion order. Deleting and re-inserting a key moves it to the end, and map.keys().next() is always the oldest.' },
  hints: [
    `<p>Hint 1: you need "recency order" plus fast lookup. A <code>Map</code> from url to bytes keeps insertion order.</p>`,
    `<p>Hint 2: to mark an entry as recently used, <code>delete</code> it and <code>set</code> it again. Track <code>total</code> bytes in a number.</p>`,
    `<p>Hint 3: in <code>put</code>: reject oversize first (without touching an existing entry). Otherwise remove the old entry (subtract its bytes), insert the new one, then loop while <code>map.size &gt; maxEntries || total &gt; maxBytes</code> evicting the first key.</p>`
  ],
  solution: {
    approach: `<p>A <code>Map</code> doubles as an LRU list. The eviction loop runs until both limits are satisfied; the entry being inserted is the newest so it is only evicted if it alone breaks a limit, which the up-front size check prevents.</p>`,
    code: { lang: 'js', run: true, code: `class RuntimeCache {
  constructor(maxEntries, maxBytes) {
    this.maxEntries = maxEntries; this.maxBytes = maxBytes;
    this.map = new Map();           // url -> bytes, oldest first
    this.total = 0;
  }
  put(url, bytes) {
    if (bytes > this.maxBytes) return false;             // would never fit: leave everything as it is
    if (this.map.has(url)) { this.total -= this.map.get(url); this.map.delete(url); }
    this.map.set(url, bytes); this.total += bytes;       // newest goes to the end
    while (this.map.size > this.maxEntries || this.total > this.maxBytes) {
      const oldest = this.map.keys().next().value;       // first key = least recently used
      this.total -= this.map.get(oldest);
      this.map.delete(oldest);
    }
    return true;
  }
  get(url) {
    if (!this.map.has(url)) return undefined;
    const bytes = this.map.get(url);
    this.map.delete(url); this.map.set(url, bytes);      // refresh recency
    return bytes;
  }
  keys() { return Array.from(this.map.keys()); }
  size() { return this.total; }
}
const c = new RuntimeCache(3, 100);
c.put('a', 40); c.put('b', 40); c.get('a');
console.log(c.put('c', 40), c.keys().join(','), c.size());     // b evicted
console.log(c.put('d', 200), c.keys().join(','), c.size());    // too big
c.put('e', 10); c.put('f', 10);
console.log(c.keys().join(','), c.size());                      // max 3 entries` },
    complexity: `<p>put/get O(1) amortised (each entry is evicted at most once per insertion); space O(n).</p>`,
    followUps: ['Add per-entry expiry timestamps.', 'Persist to Cache Storage and rebuild the order after the worker restarts.']
  }
});

practice.push({
  title: 'Merge Offline Edits With Per-Field Last-Write-Wins', level: 'Hard', tags: ['offline-first', 'conflict resolution', 'Lamport clock', 'CRDT'], companies: ['Notion', 'Figma', 'Linear'],
  statement: `<p>Two devices edited the same record offline. Each edit is <code>{ field, value, clock, replica, deleted? }</code>. <code>clock</code> is a Lamport counter (integer), <code>replica</code> a string like "A" or "B". An edit with <code>deleted: true</code> removes the field.</p>
    <p>Write <code>mergeEdits(base, editsA, editsB)</code> returning <code>{ doc, conflicts }</code>:</p>
    <ul><li>For every field choose the edit with the <b>highest clock</b>; if clocks tie, the replica with the larger name (string comparison) wins. This must make the merge <b>commutative</b> and <b>idempotent</b>.</li>
    <li>Apply winners to a copy of <code>base</code> (<code>deleted</code> removes the key). Do not mutate <code>base</code>.</li>
    <li><code>conflicts</code>: sorted field names that were edited by <b>both</b> replicas with <i>different outcomes</i> (different value or one deleted and the other not).</li></ul>`,
  constraints: `Up to 10<sup>4</sup> edits per replica; several edits to the same field on one replica are allowed (the highest clock of that replica counts).`,
  example: `<p>base: <code>{title: "Plan", body: "v1"}</code>. A edits title→"Plan 2" (clock 3), body→"A body" (clock 4). B edits body→"B body" (clock 5), deletes nothing.</p>${H.table(['field', 'A', 'B', 'winner'], [['title', 'clock 3', '-', 'A (only editor)'], ['body', 'clock 4', 'clock 5', '<span class="c-b">B (5 &gt; 4)</span> and it is a <span class="c-r">conflict</span>']])}<p>doc = <code>{title: "Plan 2", body: "B body"}</code>, conflicts = <code>["body"]</code>.</p>`,
  brute: {
    why: `<p>"Whole-record last write wins" throws away every other field of the losing device: A's title change is lost just because B saved later. Using wall-clock timestamps adds a second problem: a device with a wrong clock always wins.</p>`,
    code: `function mergeBrute(base, editsA, editsB) {
  const winner = editsB.length ? editsB : editsA;          // whole device wins, other edits silently lost
  const doc = Object.assign({}, base);
  winner.forEach(e => { doc[e.field] = e.value; });
  return { doc, conflicts: [] };
}`
  },
  mcq: { q: 'Why is a deterministic tie-break (replica id) needed when two edits have the same clock?', options: ['So both devices pick the same winner and converge to the same document', 'Because equal clocks are impossible', 'To make the merge slower'], answer: 0, explain: 'If A and B each resolved ties differently they would end with different documents forever. A fixed rule makes merge(A,B) equal merge(B,A).' },
  hints: [
    `<p>Hint 1: per field you need "the best edit". Define <code>beats(x, y)</code>: higher clock wins; equal clock → larger replica id wins.</p>`,
    `<p>Hint 2: reduce each replica's edit list to one best edit per field first, then compare the two maps field by field.</p>`,
    `<p>Hint 3: the conflict check compares <i>outcomes</i> (deleted flag + value), so if both devices wrote the same value there is nothing to report. Test commutativity by swapping A and B.</p>`
  ],
  solution: {
    approach: `<p>Reduce each side to a Map of field → best edit, then take the union of fields and let <code>beats</code> pick between the two candidates. Because <code>beats</code> is a total order, the result is the same regardless of argument order and merging again changes nothing.</p>`,
    code: { lang: 'js', run: true, code: `function beats(x, y) {                                  // true if edit x wins over y
  if (x.clock !== y.clock) return x.clock > y.clock;
  return x.replica > y.replica;                         // deterministic tie-break
}
function bestPerField(edits) {
  const m = new Map();
  for (const e of edits) if (!m.has(e.field) || beats(e, m.get(e.field))) m.set(e.field, e);
  return m;
}
function outcome(e) { return e.deleted ? 'DELETED' : 'V:' + JSON.stringify(e.value); }

function mergeEdits(base, editsA, editsB) {
  const a = bestPerField(editsA), b = bestPerField(editsB);
  const doc = Object.assign({}, base), conflicts = [];
  const fields = new Set([...a.keys(), ...b.keys()]);
  for (const f of fields) {
    const x = a.get(f), y = b.get(f);
    const win = !x ? y : !y ? x : (beats(x, y) ? x : y);
    if (x && y && outcome(x) !== outcome(y)) conflicts.push(f);
    if (win.deleted) delete doc[f]; else doc[f] = win.value;
  }
  return { doc: doc, conflicts: conflicts.sort() };
}

const base = { title: 'Plan', body: 'v1', tag: 'draft' };
const A = [{ field: 'title', value: 'Plan 2', clock: 3, replica: 'A' }, { field: 'body', value: 'A body', clock: 4, replica: 'A' },
           { field: 'tag', deleted: true, clock: 6, replica: 'A' }];
const B = [{ field: 'body', value: 'B body', clock: 5, replica: 'B' }, { field: 'tag', value: 'final', clock: 6, replica: 'B' }];
const r1 = mergeEdits(base, A, B), r2 = mergeEdits(base, B, A);
console.log(JSON.stringify(r1));
console.log('commutative:', JSON.stringify(r1) === JSON.stringify(r2));
console.log('idempotent :', JSON.stringify(mergeEdits(r1.doc, A.concat(A), B.concat(B)).doc) === JSON.stringify(r1.doc));
console.log('base untouched:', JSON.stringify(base));` },
    complexity: `<p>Time O(a + b) for a and b edits (Map operations are O(1)); space O(fields).</p>`,
    followUps: ['How do Lamport clocks get updated when a replica receives a remote edit?', 'When is LWW the wrong rule? (text, lists: use a CRDT like Yjs/Automerge.)']
  }
});

/* ===================== QUIZ ===================== */
quiz.push({ q: 'What problem do micro-frontends mainly solve?', options: ['Many teams needing to build and deploy parts of one UI independently', 'Making a single small app render faster', 'Replacing the need for a backend', 'Avoiding the use of JavaScript'], answer: 0, explain: 'Micro-frontends are an organisational scaling tool: independent teams, independent deploys. For one small team they usually add cost without benefit.' });
quiz.push({ q: 'In Module Federation, what is a <b>remote</b>?', options: ['A separately built app that exposes modules for others to import at run time', 'A server in another country', 'A cached copy of node_modules', 'A browser extension'], answer: 0, explain: 'A remote exposes modules through a remote entry file; a host (the shell) imports them at run time.' });
quiz.push({ q: 'Why is React usually shared with <code>singleton: true</code> across federated apps?', options: ['Two copies break hooks and context ("Invalid hook call")', 'It makes React run in a web worker', 'It removes the need for a bundler', 'It forces all apps to use the same CSS'], answer: 0, explain: 'React keeps internal state in its own module instance. Components from copy A cannot use hooks or context created by copy B.' });
quiz.push({ q: 'In a three-layer token system, which layer should a theme (light/dark) redefine?', options: ['The semantic layer (e.g. color.action)', 'Only the primitive palette', 'The component source code', 'The HTML structure'], answer: 0, explain: 'Primitives are raw values, components use semantic tokens. Re-pointing semantic tokens re-themes every component without touching their code.' });
quiz.push({ q: 'You change a file in <code>packages/utils</code> that nine other packages import. What does affected detection run?', options: ['utils and everything that depends on it, directly or indirectly', 'Only utils', 'Only the packages utils depends on', 'Nothing, a lockfile change is required'], answer: 0, explain: 'Affected = the changed package plus all transitive dependents (walk the dependency edges backwards).' });
quiz.push({ q: 'Which caching strategy suits hashed filenames like <code>app.4f9c2a.js</code>?', options: ['Cache-first', 'Network-only', 'Network-first with a 1 s timeout', 'No caching'], answer: 0, explain: 'The file name changes whenever the content changes, so a cached copy is never stale: cache-first is both fastest and safe.' });
quiz.push({ q: 'A user opens your PWA offline and sees the cart from 10 minutes ago, while a fresh version loads in the background. Which strategy is this?', options: ['Stale-while-revalidate', 'Cache-only', 'Network-first', 'Network-only'], answer: 0, explain: 'SWR answers immediately from the cache and refreshes the cache behind the scenes for next time.' });
quiz.push({ q: 'Users are stuck on an old version after every deploy. Which cause is most likely?', options: ['sw.js is served with a long Cache-Control max-age', 'The manifest has no icons', 'HTTPS is enabled', 'The page uses flexbox'], answer: 0, explain: 'If the browser caches sw.js for a year it never discovers the new worker. Serve it with no-cache (and use versioned cache names).' });
quiz.push({ q: 'Why should an offline outbox message carry a unique id (idempotency key)?', options: ['A retry after a lost reply must not create a duplicate on the server', 'It makes IndexedDB faster', 'It encrypts the payload', 'It lets the browser skip the network'], answer: 0, explain: 'If the server saved the message but the reply was lost, the client retries. The id lets the server recognise and ignore the duplicate.' });
quiz.push({ q: 'Which is the correct plural category for 21 in Russian?', options: ['one', 'few', 'many', 'other'], answer: 0, explain: 'Russian: numbers ending in 1 (except 11) are "one", so 21 is "one" (21 товар).' });
quiz.push({ q: 'Why prefer <code>margin-inline-start</code> over <code>margin-left</code> in an internationalised app?', options: ['It follows the text direction, so it works for both LTR and RTL', 'It is supported only in Chrome', 'It is faster to render', 'It adds a margin on both sides'], answer: 0, explain: 'Logical properties map to left or right depending on dir, so one stylesheet serves English and Arabic.' });
quiz.push({ q: 'A 20% rollout uses <code>Math.random() &lt; 0.2</code> on every page load. What is the main problem?', options: ['The same user flips between old and new UI, and experiments are meaningless', 'It always enables 100%', 'JavaScript cannot generate random numbers', 'It is too slow'], answer: 0, explain: 'Random assignment is not stable. Hash(flag + userId) % 100 gives the same bucket every time, so assignments are consistent and monotonic.' });
quiz.push({ q: 'Why include the flag name in the string you hash for bucketing?', options: ['So different flags select independent groups of users', 'To make the hash reversible', 'Because hash functions need two inputs', 'To avoid using a user id'], answer: 0, explain: 'Without the flag name every flag would put the same low-bucket users first, so the same people would be test subjects for everything.' });
quiz.push({ q: 'When is a monorepo a poor fit?', options: ['When teams need hard isolation and independent history and have no tooling to scale CI', 'When you want to share code between apps', 'When you want atomic refactors', 'When you use TypeScript'], answer: 0, explain: 'Monorepos need tooling (affected detection, caching, ownership rules). Without it CI becomes slow and boundaries decay.' });

/* ===================== INTERVIEW ===================== */
interview.push({
  level: 'B', q: 'What is a micro-frontend, and when would you NOT use one?',
  a: `<p>A micro-frontend is a part of a website that is built, tested and deployed by its own team, then composed with other parts in the browser (or at the edge) so users see one app. It mirrors microservices. Typical split: shell (header, routing, auth) plus remotes for catalog, cart, checkout and account.</p>
    <p>I would <b>not</b> use it for a small team or a young product. It adds network requests, duplicated libraries, harder end-to-end testing and contracts between teams. A well-structured monorepo with clear module boundaries gives most of the benefits (code ownership, shared tooling) without independent runtime deployment. I reach for micro-frontends when many teams are blocked by one release train, or when I need to migrate a legacy app gradually.</p>`,
  followUps: ['How do remotes communicate without tight coupling?', 'How would you migrate a legacy Angular app route by route?']
});
interview.push({
  level: 'I', q: 'Explain Module Federation. How do host, remote and shared dependencies work?',
  a: `<p>Module Federation lets one build consume modules from another build at run time. A <b>remote</b> exposes modules (e.g. <code>./CartDrawer</code>) through a remote entry file. A <b>host</b> declares where remotes live and imports them lazily with <code>import('cart/CartDrawer')</code>. <b>Shared</b> libraries are negotiated through a global share scope: each app registers the versions it has; when code asks for a library, the runtime picks the highest registered version that satisfies the consumer's required range.</p>
    <p>With <code>singleton: true</code> only one copy is allowed on the page; a mismatch gives a warning or an error if <code>strictVersion</code> is on. The app entry must be async (<code>import('./bootstrap')</code>) so the share scope is ready before React loads.</p>`,
  followUps: ['What causes "Shared module is not available for eager consumption"?', 'How do you roll back a bad remote without rebuilding the host?']
});
interview.push({
  level: 'I', q: 'Two copies of React are loaded on the page after adding a remote. Symptoms and fix?',
  a: `<p>Symptoms: <code>Invalid hook call</code> errors, context providers that appear to be missing (consumers see default values), duplicated bundle size in the network panel. Cause: the remote bundles its own React and the host uses another, so hooks and context objects belong to different module instances.</p>
    <p>Fix: share <code>react</code> and <code>react-dom</code> as singletons in every app's federation config with a compatible <code>requiredVersion</code>, make sure the bootstrap is async, and check lockfiles for nested duplicates (<code>npm ls react</code>). Add a CI check that fails when a remote declares a React range the shell cannot satisfy. As a diagnostic, compare <code>window.React1 === window.React2</code> style identity checks in the console.</p>`,
  followUps: ['Which other libraries should be singletons?', 'What changes when the shell moves from React 18 to 19 before all remotes do?']
});
interview.push({
  level: 'B', q: 'What are design tokens and why use three layers (primitive, semantic, component)?',
  a: `<p>Design tokens are named design decisions (colour, spacing, type, radius, motion) stored as data and compiled into CSS variables, native values and Figma variables. Layers keep change cheap: <b>primitives</b> are the raw palette (<code>blue.600</code>), <b>semantic</b> tokens give meaning (<code>color.action</code>) and are the layer that changes per theme, <b>component</b> tokens let one component deviate (<code>button.bg</code>).</p>
    <p>Dark mode is then only a different mapping for semantic tokens; no component is edited. I also gate tokens in CI with contrast checks (WCAG 4.5:1 for body text), forbid raw hex values in components with a lint rule, and ship tokens as a versioned package so product teams upgrade deliberately.</p>`,
  followUps: ['How do you avoid flash of wrong theme on first paint?', 'How would you support white-label customers with their own brand colours?']
});
interview.push({
  level: 'I', q: 'How do you design and version a shared component library used by 30 teams?',
  a: `<p>Treat it as a product with an API. Technically: ES modules with <code>sideEffects: false</code> and per-component entry points for tree-shaking, TypeScript types, headless primitives (Radix/React Aria) for accessible behaviour, tokens for styling, composition over many props, and Storybook as living documentation. Quality gates: unit tests, axe a11y checks, and visual regression tests.</p>
    <p>Process: semver (new prop = minor, removing a prop = major), changesets for changelogs, deprecation with dev warnings for one major, codemods for breaking changes, a contribution guide and an intake bar for new components. Measure adoption (how many apps use which version) so you know when it is safe to remove something.</p>`,
  followUps: ['How do you handle a team that needs a one-off variant?', 'Would you publish to npm or consume the library as a workspace package?']
});
interview.push({
  level: 'I', q: 'Your monorepo CI takes 45 minutes. How do you cut it down?',
  a: `<p>First measure where the time goes. Then: (1) <b>affected detection</b>: run lint/test/build only for packages changed relative to the base branch plus their dependents, using Nx or Turborepo. (2) <b>Remote caching</b>: task hashes made from source, config and dependency hashes, so identical work is replayed. (3) <b>Parallelism</b>: run independent tasks concurrently according to the task graph; shard long test suites. (4) Make inputs precise (do not list the whole repo as input), avoid global config files that invalidate everything. (5) Faster tools (esbuild/SWC/Vitest) and incremental TypeScript builds.</p>
    <p>Keep a nightly full run so affected-only PR runs cannot hide integration problems, and protect the remote cache from untrusted forks.</p>`,
  followUps: ['What are the risks of affected-only testing?', 'How are cache keys computed and what breaks if an input is missed?']
});
interview.push({
  level: 'I', q: 'Describe the service worker lifecycle and how you ship an update safely.',
  a: `<p>Lifecycle: <b>register</b> (page asks for /sw.js) → <b>install</b> (once per new version; precache the app shell with <code>cache.addAll</code> inside <code>event.waitUntil</code>) → <b>waiting</b> (a new version waits until old tabs close) → <b>activate</b> (delete old caches, optionally <code>clients.claim()</code>) → <b>fetch</b> events for every request from controlled pages.</p>
    <p>Safe updates: version cache names, make precache atomic (if one file fails the install fails and the old worker stays), serve sw.js with <code>Cache-Control: no-cache</code>, use network-first for HTML so new JS is referenced, and show an "update available" prompt that posts <code>SKIP_WAITING</code> then reloads on <code>controllerchange</code>. Keep a kill-switch worker ready that unregisters itself and clears caches.</p>`,
  followUps: ['Why does skipWaiting() sometimes cause bugs?', 'How do you test service worker updates in CI?']
});
interview.push({
  level: 'B', q: 'Compare cache-first, network-first and stale-while-revalidate. Which one for HTML, API data, and hashed assets?',
  a: `<p><b>Cache-first</b>: return the cached copy, only go to the network on a miss. Best for immutable, content-hashed assets, fonts and images. <b>Network-first</b>: try the network, fall back to cache when offline or too slow. Best for HTML documents and data that must be fresh when possible. <b>Stale-while-revalidate</b>: return the cached copy immediately and refresh it in the background. Best for non-critical API data, avatars and feeds where "a bit old" is fine.</p>
    <p>My defaults: hashed JS/CSS cache-first; HTML network-first with a short timeout and an offline page; read-only API calls SWR; POST/PUT and anything with credentials or payments network-only, never cached.</p>`,
  followUps: ['How would you add a timeout to network-first?', 'What are the privacy risks of caching authenticated responses?']
});
interview.push({
  level: 'A', q: 'Design offline support for a todo/notes app with several devices per user.',
  a: `<p><b>Data:</b> IndexedDB is the app's source of truth; the UI reads it and writes optimistically. <b>Outbox:</b> in the same transaction as each local write append a message <code>{id, op, payload, clock}</code>. <b>Sync:</b> flush oldest-first when online (online event, app start, Background Sync where supported), delete a message only after server confirmation, retry transient failures with exponential backoff plus jitter, move permanent 4xx failures to a dead-letter list the user can see. <b>Idempotency:</b> client-generated ids as idempotency keys so retries are safe.</p>
    <p><b>Conflicts:</b> field-level last-write-wins using server-assigned versions or Lamport/hybrid clocks (never raw device time); for long text use a CRDT (Yjs/Automerge). <b>Pull:</b> deltas since a sync token. <b>UX:</b> pending/failed/synced indicators, an explicit conflict notice, storage persistence request, and clearing local data on logout. Test with offline mode, dropped/duplicated/reordered messages, and two devices.</p>`,
  followUps: ['What if the user edits an item that another device deleted?', 'How do you migrate the local database schema in a new release?']
});
interview.push({
  level: 'I', q: 'How do you internationalise an app so pluralisation, dates and layout work in many languages?',
  a: `<p>Keep text out of code: message keys in per-locale catalogs, loaded lazily per locale. Use <b>ICU MessageFormat</b> for plurals/select with CLDR categories (zero, one, two, few, many, other); never concatenate sentence fragments. Format numbers, currency, dates, lists and relative time with the <code>Intl</code> API using the user's locale and time zone; store UTC and plain numbers. Provide a fallback chain (fr-CA → fr → en).</p>
    <p>Layout: logical CSS properties and <code>dir="rtl"</code> for Arabic/Hebrew, flexible widths for 30-40% text expansion, language-appropriate fonts. Process: extraction tooling, translation management system with context, CI that checks missing keys, placeholder mismatches and missing <code>other</code> branches, pseudo-localisation in QA, hreflang and locale in the URL for SEO.</p>`,
  followUps: ['What is wrong with `count === 1 ? "item" : "items"`?', 'How do you avoid server/client hydration mismatches with dates?']
});
interview.push({
  level: 'I', q: 'How would you implement a percentage rollout feature flag that is stable per user?',
  a: `<p>Hash a string made from the flag key and a stable user identifier (user id, or an anonymous id cookie for logged-out visitors) with a fast, uniform hash such as FNV-1a or MurmurHash3, take the result modulo 100 (or 10,000 for finer steps) to get a bucket, and enable the flag when <code>bucket &lt; percent</code>. Properties: <b>stable</b> (same inputs, same answer on every tier), <b>monotonic</b> (raising the percentage only adds users), <b>independent per flag</b> because the flag key is part of the hash.</p>
    <p>Around that: evaluation order (kill switch → per-user override → targeting rules → rollout → default), server-side evaluation with bootstrapped values to avoid flicker, safe defaults if the flag service fails, exposure logging for experiments, shared test vectors so Java and JS agree, and an expiry/owner on every flag to avoid flag debt.</p>`,
  followUps: ['Why not Math.random()?', 'How do you run an A/B/C experiment on the same bucket scheme without overlapping assignments?']
});
interview.push({
  level: 'A', q: 'You are the architect: how do you decide between a monolith, a monorepo with modules, and micro-frontends for a 60-engineer frontend organisation?',
  a: `<p>I start from constraints, not fashion. Questions: how many teams, how independent are their domains and release cadences, what are the failure and compliance boundaries (payments, PCI), what is the current pain (slow CI, merge conflicts, blocked releases, legacy rewrite), and what does the platform team have capacity to run?</p>
    <p>A <b>monorepo with strong module boundaries</b> (owned packages, lint-enforced dependency rules, affected-only CI, remote cache) solves most coordination pain at low runtime cost and is my default. I add <b>run-time micro-frontends</b> only where teams truly need independent deploys (checkout vs catalog), where a legacy app must be strangled gradually, or where frameworks differ. Even then I keep the shell tiny, share only true singletons, define contracts and fallbacks, and invest in observability per remote. I write the decision as an ADR with the revisit date and the metrics that would change it.</p>`,
  followUps: ['What metrics tell you the split is working?', 'How do you keep Core Web Vitals healthy across independently deployed remotes?']
});
interview.push({
  level: 'E', q: 'How do AI coding assistants change frontend architecture work, and what guard-rails do you add?',
  a: `<p>Assistants make local code cheap, which raises the value of <b>global consistency and boundaries</b>. Guard-rails I add: a typed, documented design system (and exposed to the assistant through docs or an MCP server) so generated UI uses tokens and components instead of inventing buttons; lint rules and boundary rules that fail on raw hex values, cross-package imports and unsafe patterns; contract and visual regression tests that catch silent changes; feature flags and progressive delivery so AI-generated changes ship in small, reversible steps; and an AGENTS.md describing repo layout, commands and invariants.</p>
    <p>I treat output as untrusted: review for accessibility, security (XSS, dependency choices), cache correctness in service workers, and idempotency in sync code. Humans still own architecture decisions, trade-off reasoning and incident response; AI accelerates exploration, boilerplate, migrations (codemods) and test generation.</p>`,
  followUps: ['Which parts of this module would you never delegate to an assistant without review?', 'How would you measure whether AI assistance is improving quality?']
});

registerModule({
  id: 'fe15',
  title: 'Frontend Architecture at Scale',
  lang: 'js',
  intro: `<p>Small apps are built by one person in one repo. Real products are built by <b>dozens of teams</b> over many years, used on bad networks, in many languages, and changed every day without breaking anyone. This module is about the structures that make that possible: splitting a big UI into <b>micro-frontends</b> and sharing code safely with <b>Module Federation</b>, building a <b>design system</b> with tokens and a component library, organising code in a <b>monorepo</b> that only rebuilds what changed, making apps installable and offline-capable with <b>PWAs and service workers</b>, syncing data with an <b>offline-first</b> outbox, speaking every user's language with <b>internationalization</b>, and releasing safely with <b>feature flags</b>.</p>
    <p>Every topic starts with an everyday analogy, then a visual walk-through, runnable plain-JavaScript models (a feature-flag bucketer, an affected-graph calculator, a cache-strategy simulator, a plural picker) and interview-ready deep dives. This is the module where "I can build a React app" becomes "I can design the frontend platform for a company".</p>`,
  goals: [
    'Explain when micro-frontends are worth their cost and split an e-commerce app into a shell plus team-owned remotes with fallbacks',
    'Configure Module Federation, share React as a singleton and read version-negotiation warnings',
    'Design three-layer design tokens, theme with CSS variables and gate contrast in CI',
    'Compute affected projects and a safe build order in a monorepo, and explain task caching with Merkle hashes',
    'Choose cache-first, network-first or stale-while-revalidate per resource and ship service worker updates safely',
    'Build an offline-first outbox with idempotent retries, backoff and conflict rules',
    'Internationalise an app with ICU plurals, Intl formatting and RTL-safe CSS',
    'Implement stable percentage rollouts with hashing, plus kill switches and targeting rules'
  ],
  prereqs: `Modules fe11 (Rendering Pipeline &amp; Web Performance), fe14 (Tooling, Build &amp; Testing), plus solid React basics (fe08-fe10) and the browser APIs module (fe07). Comfort reading Promises and <code>async/await</code> helps for the service worker topics.`,
  hours: 14,
  topics: topics,
  quiz: quiz,
  interview: interview,
  practice: practice
});
})();
