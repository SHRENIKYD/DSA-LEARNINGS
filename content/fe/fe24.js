(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared helpers for this module's visualizers ---------- */
  function pad4(frames, tip) {
    while (frames.length < 4) {
      var last = frames[frames.length - 1];
      frames.push({ narr: tip || 'Tip: try a different input above to see more steps.', parts: last.parts });
    }
    return frames;
  }
  function cp(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
  function lines(input, max, hint) {
    var a = String(input === undefined ? '' : input).split(/\n|;/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!a.length) throw new Error(hint);
    if (a.length > max) throw new Error('Use at most ' + max + ' lines. ' + hint);
    return a;
  }
  // rank of one App Router segment: lower = more specific
  function segRank(s) {
    if (/^\[\[\.\.\..+\]\]$/.test(s)) return 3;
    if (/^\[\.\.\..+\]$/.test(s)) return 2;
    if (/^\[.+\]$/.test(s)) return 1;
    return 0;
  }
  function urlSegs(p) {
    return String(p).split('/').filter(function (s) { return s && !/^\(.*\)$/.test(s); });
  }
  // try to match url segments against route segments; returns params list or null
  function tryMatch(rs, us) {
    var params = [];
    for (var i = 0; i < rs.length; i++) {
      var r = segRank(rs[i]);
      if (r === 0) { if (us[i] !== rs[i]) return null; }
      else if (r === 1) { if (us[i] === undefined) return null; params.push(rs[i].slice(1, -1) + '=' + us[i]); }
      else {
        var rest = us.slice(i);
        if (r === 2 && !rest.length) return null;
        var name = rs[i].replace(/[\[\].]/g, '');
        params.push(name + '=[' + rest.join(',') + ']');
        return i === rs.length - 1 ? params : null;
      }
    }
    return us.length === rs.length ? params : null;
  }

  /* =====================================================================
     TOPIC 1 — App Router file-system routing
     ===================================================================== */
  topics.push({
    title: 'App Router File-System Routing: Segments, Dynamic Routes & Route Groups',
    analogy: `<p>Think of a <b>big office building with a directory board</b> in the lobby. Each floor is a folder, each room on a floor is a sub-folder, and a room only appears on the board if it has a door sign (<code>page.js</code>). Some rooms are labelled "any visitor's name" (a dynamic room like <code>[name]</code>), some are "the whole east wing, however deep" (a catch-all), and some walls are just <b>internal partitions</b> the visitor never sees (route groups in parentheses). The receptionist always sends you to the <b>most specific</b> matching room first: an exact name beats "any name", which beats "the whole wing".</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> In the Next.js App Router, <b>folders are URL segments</b> and a special file inside a folder makes it reachable. <code>app/blog/page.js</code> serves <code>/blog</code>. A folder with no <code>page.js</code> (or <code>route.js</code>) is just structure: it can hold layouts, components and tests and is never a URL by itself. This module builds on what you saw in the React Internals module (Server Components, CSR/SSR/SSG/ISR); here we go deep on how Next.js itself is wired.</p>
      ${H.table(['Folder name', 'Kind', 'Example URL', 'params value'], [
        ['<code>blog</code>', 'static segment', '<code>/blog</code>', '—'],
        ['<code>[slug]</code>', 'dynamic segment (exactly one)', '<code>/blog/hello</code>', '<code>{ slug: "hello" }</code>'],
        ['<code>[...slug]</code>', 'catch-all (one or more)', '<code>/docs/a/b</code>', '<code>{ slug: ["a","b"] }</code>'],
        ['<code>[[...slug]]</code>', 'optional catch-all (zero or more)', '<code>/shop</code> and <code>/shop/red</code>', '<code>{}</code> / <code>{ slug: ["red"] }</code>'],
        ['<code>(marketing)</code>', 'route group: <b>not</b> in the URL', '<code>app/(marketing)/about</code> → <code>/about</code>', '—'],
        ['<code>_components</code>', 'private folder: never routable', '—', '—'],
        ['<code>@modal</code>', 'parallel route slot (a named prop on the layout)', 'not in the URL', '—'],
        ['<code>(.)photo</code>', 'intercepting route (show <code>/photo</code> inside the current layout, e.g. as a modal)', 'soft navigation only', '—']
      ])}
      <p>🔵 <b>Special files in a segment.</b> <code>page</code> (the UI for the URL), <code>layout</code> (wraps the page and its children, persists across navigation), <code>template</code> (like a layout but re-mounts on every navigation), <code>loading</code> (a Suspense fallback), <code>error</code> (an error boundary, must be a Client Component), <code>not-found</code>, <code>route</code> (an HTTP handler: <code>GET</code>, <code>POST</code>, … — cannot sit next to a <code>page</code> in the same segment), <code>default</code> (fallback for a parallel slot). Extensions can be <code>.js .jsx .ts .tsx</code>.</p>
      <p>🔵 <b>Which route wins?</b> When several patterns could match, Next.js sorts them by specificity, segment by segment from the left: <b>static</b> beats <b>dynamic</b> beats <b>catch-all</b> beats <b>optional catch-all</b>. So <code>/blog/new</code> hits <code>app/blog/new/page.js</code> even though <code>app/blog/[slug]/page.js</code> also matches.</p>
      ${H.arr(['static', '[dynamic]', '[...catchAll]', '[[...optional]]'], { label: 'priority, most specific first', hl: { 0: 'g', 3: 'r' } })}
      <p>🔵 <b>params are async now.</b> Since Next.js 15, <code>params</code> and <code>searchParams</code> passed to pages and layouts are <b>Promises</b>: you write <code>const { slug } = await params</code> (or <code>use(params)</code> in a Client Component). Next 15 still allowed synchronous access with a warning to ease migration; <b>Next 16 removed synchronous access</b>. Two route groups that resolve to the same URL (for example <code>(a)/about</code> and <code>(b)/about</code>) are a build error.</p>`,
    clues: [
      '"How do you build /blog/:slug in the App Router?" → a <code>[slug]</code> folder with <code>page.js</code>, read <code>await params</code>',
      '"One page for /docs, /docs/a and /docs/a/b" → optional catch-all <code>[[...slug]]</code> (plain catch-all would 404 on /docs)',
      '"Different layouts for marketing and app pages, same URL space" → route groups <code>(marketing)</code> / <code>(app)</code>',
      '"Open a photo in a modal but keep a shareable URL" → parallel slot <code>@modal</code> + intercepting route <code>(.)photo/[id]</code>',
      '"Co-locate components and tests next to the route without making URLs" → files without <code>page.js</code>, or private <code>_folder</code>',
      '"Why does /blog/new not hit [slug]?" → static segments outrank dynamic ones'
    ],
    code: [
      { lang: 'text', title: 'A typical app/ folder', code: `app/
├── layout.tsx                 → root layout (must render <html> and <body>)
├── page.tsx                   → /
├── (marketing)/               → route group: not in the URL
│   ├── layout.tsx             → marketing chrome
│   └── about/page.tsx         → /about
├── blog/
│   ├── page.tsx               → /blog
│   ├── new/page.tsx           → /blog/new   (static beats [slug])
│   └── [slug]/page.tsx        → /blog/:slug
├── docs/[...slug]/page.tsx    → /docs/a, /docs/a/b (NOT /docs)
├── shop/[[...filters]]/page.tsx → /shop, /shop/red, /shop/red/xl
├── api/users/route.ts         → GET/POST /api/users
└── _components/Button.tsx     → private, never a route` },
      { lang: 'tsx', check: false, title: 'Reading params in Next.js 15/16 (they are Promises)', code: `// app/blog/[slug]/page.tsx  (a Server Component by default)
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ [k: string]: string | string[] | undefined }> };

export default async function Post({ params, searchParams }: Props) {
  const { slug } = await params;            // Next 15+: params is a Promise
  const { ref } = await searchParams;       // reading searchParams makes the page dynamic
  const post = await getPost(slug);
  if (!post) notFound();                    // renders the nearest not-found.tsx
  return <article><h1>{post.title}</h1>{ref ? <p>Came from {ref}</p> : null}</article>;
}

// Pre-render known slugs at build time; others render on demand (dynamicParams = true by default)
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}` }
    ],
    viz: [
      {
        title: 'Match a URL against the app/ folder (most specific wins)',
        input: '/docs/settings',
        inputLabel: 'URL path to resolve',
        gen: function (input) {
          var url = String(input || '').trim();
          if (url.charAt(0) !== '/' || url.length > 60) throw new Error('Type a path that starts with /, e.g. /blog/hello');
          var routes = ['/', '/(marketing)/about', '/blog', '/blog/new', '/blog/[slug]', '/docs/[...slug]', '/shop/[[...filters]]', '/[team]/settings'];
          var us = urlSegs(url), frames = [], rows = routes.map(function (r) { return [r, '?', '']; });
          frames.push({ narr: 'The router splits <code>' + H.esc(url) + '</code> into segments ' + H.esc(JSON.stringify(us)) + '. Route groups like <code>(marketing)</code> are removed from every pattern first because they never appear in URLs.', parts: [
            { type: 'array', label: 'URL segments', values: us.length ? us : ['(root)'] },
            { type: 'table', label: 'Candidate routes', columns: ['pattern', 'matches?', 'rank per segment'], rows: rows.map(function (r) { return r.slice(); }) }] });
          var best = null, bestIdx = -1;
          routes.forEach(function (r, i) {
            var rs = urlSegs(r), p = tryMatch(rs, us);
            var rank = rs.map(segRank);
            rows[i] = [r, p ? 'yes' : 'no', rank.join(',') || '-'];
            var hl = {}; hl[i] = p ? 'ok' : 'bad';
            var better = false;
            if (p) {
              if (!best) better = true;
              else {
                for (var k = 0; k < Math.max(rank.length, best.rank.length); k++) {
                  var a = rank[k] === undefined ? -1 : rank[k], b = best.rank[k] === undefined ? -1 : best.rank[k];
                  if (a !== b) { better = a < b; break; }
                }
              }
              if (better) { best = { r: r, rank: rank, p: p }; bestIdx = i; }
            }
            frames.push({ narr: p ? ('<b>' + H.esc(r) + '</b> matches with params ' + (p.length ? H.esc(p.join(' ')) : 'none') + '. Ranks: 0 static, 1 dynamic, 2 catch-all, 3 optional catch-all. ' + (better ? 'It is the most specific match so far.' : 'A more specific match already exists.')) : ('<b>' + H.esc(r) + '</b> does not match: segment count or a static name differs (a plain catch-all also needs at least one segment).'), parts: [
              { type: 'array', label: 'URL segments', values: us.length ? us : ['(root)'] },
              { type: 'table', label: 'Candidate routes', columns: ['pattern', 'matches?', 'rank per segment'], rows: rows.map(function (x) { return x.slice(); }), hl: hl }] });
          });
          var hl2 = {}; if (bestIdx >= 0) hl2[bestIdx] = 'sel';
          frames.push({ narr: best ? ('Winner: <b>' + H.esc(best.r) + '</b>. Comparing ranks left to right, the smallest number at the first difference wins, so a static segment beats a dynamic one in the same position.') : 'No pattern matched: Next.js renders the nearest <code>not-found</code> (a 404).', parts: [
            { type: 'table', label: 'Candidate routes', columns: ['pattern', 'matches?', 'rank per segment'], rows: rows, hl: hl2 }] });
          return pad4(frames);
        }
      }
    ],
    examples: [
      { title: 'Static beats dynamic', html: `<p>With both <code>app/blog/new/page.js</code> and <code>app/blog/[slug]/page.js</code>, the URL <code>/blog/new</code> renders the "new post" form and <code>/blog/hello</code> renders a post with <code>slug = "hello"</code>. Order of folders on disk does not matter; specificity does.</p>` },
      { title: 'Catch-all vs optional catch-all', html: `<p>A docs site with <code>app/docs/[...slug]</code> returns <b>404</b> for <code>/docs</code>, because a catch-all needs at least one segment. Renaming the folder to <code>[[...slug]]</code> makes <code>/docs</code> render the same page with <code>params = {}</code> (slug undefined), which is handy for "index plus deep pages" UIs.</p>` },
      { title: 'Route groups for two different root layouts', html: `<p><code>app/(marketing)/layout.js</code> and <code>app/(app)/layout.js</code> can each be a <b>root layout</b> (each renders <code>&lt;html&gt;</code>). URLs stay clean (<code>/pricing</code>, <code>/dashboard</code>). Navigating <i>between</i> two different root layouts triggers a full page load, which is a known trade-off.</p>` },
      { title: 'Photo modal with parallel + intercepting routes', html: `<p><code>app/@modal/(.)photo/[id]/page.js</code> shows the photo in a modal when you click it from the feed (a soft, client-side navigation is intercepted). Refreshing the page or opening the link directly renders the full <code>app/photo/[id]/page.js</code>. The <code>@modal</code> slot needs a <code>default.js</code> returning <code>null</code> (required for parallel slots since Next 16) so unmatched URLs render nothing in it.</p>`, code: { lang: 'text', code: `app/
├── layout.tsx                  // receives { children, modal }
├── @modal/default.tsx          // return null
├── @modal/(.)photo/[id]/page.tsx   // modal version (soft nav)
└── photo/[id]/page.tsx         // full page (hard nav / refresh)` } }
    ],
    deepDive: `<p>🟣 <b>How matching really works.</b> At build time Next.js collects every <code>page</code> and <code>route</code> file into a route manifest, strips group and slot folders, and sorts the patterns by specificity (the same rule as the Pages Router: static, dynamic, catch-all, optional catch-all, compared segment by segment). The server and the client router use that sorted list, so client-side <code>&lt;Link&gt;</code> navigations resolve exactly like full page loads. Conflicts are build errors: two groups producing the same URL, a <code>page</code> and <code>route</code> in one segment, or a catch-all that is not the last segment.</p>
      <p><b>Edge cases worth knowing.</b> Dynamic values arrive URL-decoded per segment. Folder names starting with <code>_</code> are private; to get a literal underscore in a URL use <code>%5F</code>. With <code>generateStaticParams</code> you can list params to prerender; <code>export const dynamicParams = false</code> turns unknown params into 404 instead of rendering on demand. Intercepting markers are relative to <b>route segments</b>, not folders: <code>(.)</code> same level, <code>(..)</code> one level up, <code>(..)(..)</code> two, <code>(...)</code> from the root, and slots/groups do not count as levels.</p>
      <p><b>Production reality.</b> Large apps lean heavily on groups to give teams separate layouts, error boundaries and loading UIs without changing URLs, and on <code>_components</code>/<code>_lib</code> folders for co-location.</p>`,
    aiEra: `<p>🤖 Assistants are good at scaffolding a folder tree from a sitemap ("make routes for /blog, /blog/:slug, /docs/*"). They regularly mix in Pages Router habits: <code>pages/[id].js</code>, <code>useRouter().query</code>, or synchronous <code>params.slug</code>, which is a type error in Next 15 and removed in Next 16. They also pick <code>[...slug]</code> when the index page must work too.</p>
      <p>Your job is to own the URL design: which segments are static, which pages should be prerendered with <code>generateStaticParams</code>, where groups separate layouts, and whether unknown params should 404. Ask the AI to print the resulting URL table (as in the practice problems) and check it against the specificity rule before merging.</p>`,
    problems: [
      {
        title: 'App Router Route Matcher (dynamic, catch-all, optional, groups)',
        level: 'Medium', tags: ['next.js', 'routing', 'app router'], companies: ['Vercel', 'Shopify', 'Atlassian'],
        statement: `<p>Write <code>matchRoute(routes, url)</code>. Each route is an <code>app/</code> folder path that contains a <code>page.js</code>, written like <code>"/(marketing)/about"</code>, <code>"/blog/[slug]"</code>, <code>"/docs/[...slug]"</code> or <code>"/shop/[[...filters]]"</code>. Return the winning route followed by its params, or <code>"404"</code>.</p>
          <ul><li>Route groups <code>(name)</code> are not URL segments.</li><li><code>[x]</code> matches exactly one segment, <code>[...x]</code> one or more (must be last), <code>[[...x]]</code> zero or more (must be last).</li>
          <li>When several routes match, compare segment ranks left to right (static 0 &lt; dynamic 1 &lt; catch-all 2 &lt; optional 3); the first smaller rank wins.</li>
          <li>Output: the route, then for each param in order a space and <code>name=value</code>; catch-all values print as <code>name=[a,b]</code> (empty: <code>name=[]</code>).</li></ul>`,
        constraints: `1 ≤ routes ≤ 50; URL starts with <code>/</code>; empty segments (double or trailing slashes) are ignored. Tests never contain two routes with identical ranks for the same URL.`,
        example: `<p>Routes include <code>/blog/new</code> and <code>/blog/[slug]</code>. <code>"/blog/new"</code> gives ${H.c('g', '"/blog/new"')} (static wins). <code>"/docs/a/b"</code> gives ${H.c('g', '"/docs/[...slug] slug=[a,b]"')}. <code>"/docs"</code> gives ${H.c('r', '"404"')} because a catch-all needs at least one segment.</p>`,
        brute: { why: `<p>Taking the <b>first</b> route in file order that matches is what many hand-written routers do. It makes the answer depend on the order folders were listed, so <code>/blog/new</code> may hit <code>[slug]</code>. Next.js instead sorts by specificity.</p>`,
          code: `function matchRouteFirst(routes, url) {
  const us = url.split('/').filter(Boolean);
  for (const r of routes) {
    const rs = r.split('/').filter((s) => s && !s.startsWith('('));
    if (rs.length === us.length && rs.every((s, i) => s.startsWith('[') || s === us[i])) return r;
  }
  return '404'; // also ignores catch-alls entirely
}` },
        mcq: { q: 'Both <code>app/[team]/settings</code> and <code>app/docs/[...slug]</code> exist. Which one renders <code>/docs/settings</code>?', options: ['<code>[team]/settings</code>, because it has a static segment', '<code>docs/[...slug]</code>, because the first segment is static there and dynamic in the other', 'It is a build error'], answer: 1, explain: 'Compare left to right: at segment 1, "docs" (static, rank 0) beats "[team]" (dynamic, rank 1). The decision is made at the first difference.' },
        hints: [
          `<p>Hint 1: first turn every route into a list of segments without the group folders, then solve "does this one route match?" on its own.</p>`,
          `<p>Hint 2: give each segment a rank (0 static, 1 dynamic, 2 catch-all, 3 optional). Among the routes that match, keep the one whose rank list is smallest when compared position by position.</p>`,
          `<p>Hint 3: a catch-all eats the rest of the URL, so it must be the last segment; a plain catch-all needs at least one leftover segment, an optional one accepts zero. Normalise the URL with <code>split('/').filter(Boolean)</code> so <code>/blog/</code> equals <code>/blog</code>.</p>`
        ],
        solution: {
          approach: `<p>Parse each route into segments, skipping <code>(group)</code> folders. Walk the URL segments alongside: static must be equal, <code>[x]</code> captures one, a catch-all captures the remainder (non-empty unless optional) and must be last. For every match build the rank list and keep the lexicographically smallest one. Print params in route order.</p>`,
          code: { lang: 'js', run: true, code: `function rankOf(seg) {
  if (/^\\[\\[\\.\\.\\..+\\]\\]$/.test(seg)) return 3;   // [[...x]] optional catch-all
  if (/^\\[\\.\\.\\..+\\]$/.test(seg)) return 2;        // [...x]   catch-all
  if (/^\\[.+\\]$/.test(seg)) return 1;                // [x]      dynamic
  return 0;                                         // static
}

function matchOne(routeSegs, urlSegs) {
  const params = [];
  for (let i = 0; i < routeSegs.length; i++) {
    const seg = routeSegs[i], rank = rankOf(seg);
    if (rank === 0) { if (urlSegs[i] !== seg) return null; continue; }
    if (rank === 1) {
      if (urlSegs[i] === undefined) return null;
      params.push(seg.slice(1, -1) + '=' + urlSegs[i]);
      continue;
    }
    // catch-all: takes everything that is left, and must be the last segment
    const rest = urlSegs.slice(i);
    if (i !== routeSegs.length - 1) return null;
    if (rank === 2 && rest.length === 0) return null;
    params.push(seg.replace(/[\\[\\].]/g, '') + '=[' + rest.join(',') + ']');
    return params;
  }
  return urlSegs.length === routeSegs.length ? params : null;
}

function matchRoute(routes, url) {
  const urlSegs = url.split('/').filter(Boolean);
  let best = null;
  for (const route of routes) {
    const segs = route.split('/').filter((s) => s && !/^\\(.*\\)$/.test(s)); // drop (groups)
    const params = matchOne(segs, urlSegs);
    if (!params) continue;
    const ranks = segs.map(rankOf);
    if (!best || isMoreSpecific(ranks, best.ranks)) best = { route, ranks, params };
  }
  if (!best) return '404';
  return [best.route].concat(best.params).join(' ');
}

function isMoreSpecific(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] === undefined ? -1 : a[i], y = b[i] === undefined ? -1 : b[i];
    if (x !== y) return x < y;
  }
  return false;
}

const routes = ['/', '/(marketing)/about', '/blog', '/blog/new', '/blog/[slug]', '/docs/[...slug]', '/shop/[[...filters]]', '/[team]/settings'];
console.log(matchRoute(routes, '/blog/new'));     // /blog/new
console.log(matchRoute(routes, '/blog/hello'));   // /blog/[slug] slug=hello
console.log(matchRoute(routes, '/shop'));         // /shop/[[...filters]] filters=[]
console.log(matchRoute(routes, '/docs'));         // 404` },
          complexity: `<p>O(R · S) for R routes and S segments per URL. Next.js pre-sorts routes once at build time, so at request time it can stop at the first match.</p>`,
          followUps: ['How would you add intercepting-route markers like (..) to this matcher?', 'What should happen when two route groups produce the same URL?']
        },
        tests: { sig: 'string[] string -> string', fn: 'matchRoute', cases: [
          [[['/', '/(marketing)/about', '/blog', '/blog/new', '/blog/[slug]', '/docs/[...slug]', '/shop/[[...filters]]', '/[team]/settings'], '/'], '/'],
          [[['/', '/(marketing)/about', '/blog', '/blog/new', '/blog/[slug]', '/docs/[...slug]', '/shop/[[...filters]]', '/[team]/settings'], '/about'], '/(marketing)/about'],
          [[['/', '/(marketing)/about', '/blog', '/blog/new', '/blog/[slug]', '/docs/[...slug]', '/shop/[[...filters]]', '/[team]/settings'], '/blog/new'], '/blog/new'],
          [[['/', '/(marketing)/about', '/blog', '/blog/[slug]', '/blog/new', '/docs/[...slug]', '/shop/[[...filters]]', '/[team]/settings'], '/blog/hello'], '/blog/[slug] slug=hello'],
          [[['/', '/(marketing)/about', '/blog', '/blog/new', '/blog/[slug]', '/docs/[...slug]', '/shop/[[...filters]]', '/[team]/settings'], '/docs/a/b/c'], '/docs/[...slug] slug=[a,b,c]'],
          [[['/', '/(marketing)/about', '/blog', '/blog/new', '/blog/[slug]', '/docs/[...slug]', '/shop/[[...filters]]', '/[team]/settings'], '/docs'], '404'],
          [[['/', '/(marketing)/about', '/blog', '/blog/new', '/blog/[slug]', '/docs/[...slug]', '/shop/[[...filters]]', '/[team]/settings'], '/shop'], '/shop/[[...filters]] filters=[]'],
          [[['/', '/(marketing)/about', '/blog', '/blog/new', '/blog/[slug]', '/docs/[...slug]', '/shop/[[...filters]]', '/[team]/settings'], '/shop/red/xl'], '/shop/[[...filters]] filters=[red,xl]'],
          [[['/', '/(marketing)/about', '/blog', '/blog/new', '/blog/[slug]', '/docs/[...slug]', '/shop/[[...filters]]', '/[team]/settings'], '/acme/settings'], '/[team]/settings team=acme'],
          [[['/', '/(marketing)/about', '/blog', '/blog/new', '/blog/[slug]', '/docs/[...slug]', '/shop/[[...filters]]', '/[team]/settings'], '/docs/settings'], '/docs/[...slug] slug=[settings]'],
          [[['/', '/(marketing)/about', '/blog', '/blog/new', '/blog/[slug]', '/docs/[...slug]', '/shop/[[...filters]]', '/[team]/settings'], '/blog/a/b'], '404'],
          [[['/(shop)/[cat]/[id]', '/(shop)/sale/[id]'], '/sale/42/'], '/(shop)/sale/[id] id=42'],
          [[['/(shop)/[cat]/[id]', '/(shop)/sale/[id]'], '/shoes/42'], '/(shop)/[cat]/[id] cat=shoes id=42']
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 2 — Layouts, templates, loading, error, not-found
     ===================================================================== */
  function composeModel(files, route) {
    var set = {}; files.forEach(function (f) { set[f] = true; });
    if (!set.layout) return null;
    var segs = route ? route.split('/') : [], dirs = [''];
    for (var i = 0; i < segs.length; i++) dirs.push(segs.slice(0, i + 1).join('/'));
    var out = [];
    dirs.forEach(function (d) {
      ['layout', 'template', 'error', 'loading', 'not-found'].forEach(function (k) {
        if (set[(d ? d + '/' : '') + k]) out.push(k + '(/' + d + ')');
      });
    });
    if (!set[(route ? route + '/' : '') + 'page']) return [];
    out.push('page(/' + route + ')');
    return out;
  }

  topics.push({
    title: 'Nested Layouts, Templates, Loading, Error & Not-Found Boundaries',
    analogy: `<p>Picture <b>Russian nesting dolls</b> for every URL. The outer doll is the root layout (header, fonts, <code>&lt;html&gt;</code>), then the section doll (the shop sidebar), then the page in the middle. When you move between two pages in the same section, Next.js only swaps the <b>innermost doll</b>; the outer ones stay on the table with their paint (state) intact. A <b>template</b> is a doll that gets repainted every time. <b>Loading</b> and <b>error</b> files are little cushions placed between dolls: if the inner doll is not ready or breaks, the cushion shows instead and the outer dolls keep standing.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Every folder on the path to a page can add a <b>layout</b>. Next.js nests them: the root <code>app/layout.js</code> wraps <code>app/shop/layout.js</code>, which wraps the page. The root layout is required and must render <code>&lt;html&gt;</code> and <code>&lt;body&gt;</code>. Layouts receive <code>children</code> (and parallel slots as extra props) and <code>params</code>, but <b>not</b> <code>searchParams</code>.</p>
      <p>🔵 <b>Inside one segment</b> the special files are composed in a fixed order, from outside to inside:</p>
      ${H.table(['Order', 'File', 'Becomes', 'Re-renders on navigation?'], [
        ['1', '<code>layout.js</code>', 'shared UI wrapper', '<span class="c-g">No</span>: state, scroll and effects survive navigation between its children'],
        ['2', '<code>template.js</code>', 'wrapper with a fresh key per navigation', '<span class="c-r">Yes</span>: remounts, effects re-run (enter animations, per-page logging)'],
        ['3', '<code>error.js</code>', 'React error boundary (<code>\'use client\'</code>)', 'catches errors thrown below it'],
        ['4', '<code>loading.js</code>', '<code>&lt;Suspense fallback&gt;</code>', 'shown instantly while the segment loads'],
        ['5', '<code>not-found.js</code>', 'boundary for <code>notFound()</code>', 'catches <code>notFound()</code> below it'],
        ['6', '<code>page.js</code> or child segment', 'the content', '—']
      ])}
      <p>🔵 <b>The consequence everybody misses:</b> <code>error.js</code> sits <i>inside</i> the <code>layout.js</code> of the same folder, so it <b>cannot catch errors thrown by that layout</b>. Those bubble to the parent segment's <code>error.js</code>. Errors in the root layout need <code>app/global-error.js</code>, which must render its own <code>&lt;html&gt;</code> and <code>&lt;body&gt;</code>.</p>
      ${H.chips(['layout(/)', 'error(/)', 'layout(/shop)', 'error(/shop)', 'loading(/shop)', 'page(/shop)'], { label: 'outside → inside for /shop', hl: { 'error(/shop)': 'g', 'layout(/shop)': 'y' } })}
      <p>🔵 <b>Partial rendering.</b> On a client-side navigation from <code>/shop/shoes</code> to <code>/shop/hats</code>, the server only renders the segments that changed (the page), and the router keeps the <code>/shop</code> layout as it is. That is why a layout is the wrong place for an auth check that must run on every navigation: it does not re-run. Check auth in the page, in data-access functions, or in middleware/proxy.</p>`,
    clues: [
      '"Sidebar loses its scroll position / input text when I navigate" → it lives in a page or template; move it to a layout',
      '"My error.js does not catch errors from the layout next to it" → the boundary sits inside that layout; use the parent error.js or global-error.js',
      '"Show a skeleton instantly while the page fetches data" → <code>loading.js</code> (a Suspense boundary around the page)',
      '"Run an animation or analytics effect on every navigation" → <code>template.js</code> instead of <code>layout.js</code>',
      '"Auth check in the layout is skipped on navigation" → layouts do not re-render; check in pages, data layer or proxy',
      '"Return a 404 for a missing product" → call <code>notFound()</code> and add <code>not-found.js</code>'
    ],
    code: [
      { lang: 'tsx', check: false, title: 'Root layout, segment error boundary and loading UI', code: `// app/layout.tsx  (root layout: required, renders <html> and <body>)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Header />{children}</body>
    </html>
  );
}

// app/shop/loading.tsx  → wrapped as <Suspense fallback={<Loading />}> around the shop page
export default function Loading() { return <ProductGridSkeleton />; }

// app/shop/error.tsx  → must be a Client Component (error boundaries use state)
'use client';
export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // In production the message of server errors is hidden; error.digest links to server logs.
  return (
    <div role="alert">
      <p>Could not load the shop.</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}

// app/shop/[id]/page.tsx
import { notFound } from 'next/navigation';
export default async function Product({ params }: { params: Promise<{ id: string }> }) {
  const product = await getProduct((await params).id);
  if (!product) notFound();            // renders the nearest not-found.tsx with a 404 status
  return <ProductView product={product} />;
}` }
    ],
    viz: [
      {
        title: 'Compose the React tree for one URL',
        input: 'layout;error;not-found;(shop)/layout;(shop)/cart/template;(shop)/cart/error;(shop)/cart/loading;(shop)/cart/page',
        inputLabel: 'files under app/ (separated by ;) — route shown is (shop)/cart',
        gen: function (input) {
          var files = lines(input, 30, 'Write files like layout;(shop)/cart/page separated by ;');
          var route = '(shop)/cart', res = composeModel(files, route), frames = [];
          if (res === null) return pad4([{ narr: 'There is no root <code>layout</code> in the list. Next.js requires <code>app/layout.js</code>, which must render <code>&lt;html&gt;</code> and <code>&lt;body&gt;</code>.', parts: [{ type: 'set', label: 'files', items: files }] }]);
          frames.push({ narr: 'Next.js walks from the root folder down to <code>' + route + '</code>. At every folder it looks for layout, template, error, loading and not-found, always in that order.', parts: [{ type: 'set', label: 'files', items: files }, { type: 'stack', label: 'tree (outside at bottom)', items: [] }] });
          var built = [];
          res.forEach(function (n, i) {
            built.push(n);
            var hl = {}; hl[built.length - 1] = 'cur';
            var why = /^layout/.test(n) ? 'A layout wraps everything below it and keeps its state across navigations.' : /^template/.test(n) ? 'A template wraps like a layout but gets a new key on each navigation, so it remounts.' : /^error/.test(n) ? 'An error boundary: it catches errors from everything inside it, but NOT from the layout above it in the same folder.' : /^loading/.test(n) ? 'A Suspense boundary: its fallback streams immediately while the inner content is still loading.' : /^not-found/.test(n) ? 'A boundary for notFound() calls from inside.' : 'Finally the page itself, the innermost piece.';
            frames.push({ narr: 'Add <b>' + n + '</b>. ' + why, parts: [{ type: 'set', label: 'files', items: files, hl: (function () { var h = {}, kind = n.slice(0, n.indexOf('(/')), folder = n.slice(n.indexOf('(/') + 2, -1); h[folder ? folder + '/' + kind : kind] = 'cur'; return h; })() }, { type: 'stack', label: 'tree (outside at bottom)', items: built.slice(), hl: hl }] });
          });
          if (!res.length) frames.push({ narr: 'No <code>page</code> for this route, so the URL is a 404 even though layouts exist.', parts: [{ type: 'set', label: 'files', items: files }] });
          else frames.push({ narr: 'Done. If the cart <code>layout</code> threw, the cart <code>error</code> boundary could not catch it because it sits inside; the error would bubble to the next boundary outside.', parts: [{ type: 'stack', label: 'final tree', items: res, hl: { 0: 'sel' } }] });
          return pad4(frames);
        }
      }
    ],
    examples: [
      { title: 'Layout vs template for a page-view counter', html: `<p>An analytics hook with <code>useEffect(() =&gt; track(pathname))</code> in a <b>layout</b> needs <code>pathname</code> in its dependency list, because the layout never remounts. Put the same effect in a <b>template</b> and it runs on every navigation automatically, because the template is remounted with a new key. Use templates sparingly: remounting throws away state.</p>` },
      { title: 'Where does the error land?', html: `<p>Files: <code>app/error.js</code>, <code>app/shop/layout.js</code>, <code>app/shop/error.js</code>, <code>app/shop/page.js</code>. If <b>page.js</b> throws, <code>shop/error.js</code> shows inside the shop layout (sidebar still visible). If <b>shop/layout.js</b> throws, <code>shop/error.js</code> cannot help; <code>app/error.js</code> replaces the whole shop section. If the <b>root layout</b> throws, only <code>global-error.js</code> can render.</p>` },
      { title: 'loading.js is just Suspense', html: `<p><code>app/dashboard/loading.js</code> is equivalent to wrapping the page in <code>&lt;Suspense fallback={&lt;Loading /&gt;}&gt;</code> inside the dashboard layout. The layout and fallback stream immediately; the page streams in when its <code>await</code>s finish. For finer control, put your own <code>&lt;Suspense&gt;</code> around slow parts inside the page instead.</p>` },
      { title: 'Parallel slots in a layout', html: `<p><code>app/dashboard/layout.js</code> with folders <code>@analytics</code> and <code>@team</code> receives props <code>{ children, analytics, team }</code>. Each slot can have its own <code>loading.js</code> and <code>error.js</code>, so a slow analytics panel never blocks the team list. Each slot also needs a <code>default.js</code> for URLs it does not match (required since Next 16).</p>` }
    ],
    deepDive: `<p>🟣 <b>How the tree is built.</b> For each segment Next.js creates a <i>layout router</i> node that renders: <code>Layout</code> → <code>Template</code> (keyed by the segment path) → <code>ErrorBoundary</code> → <code>Suspense(loading)</code> → <code>NotFoundBoundary</code> → the child segment. The client router stores a tree of these segments (the "router state tree"); a navigation sends the current tree to the server, which returns an RSC payload only for the segments that differ. That is partial rendering, and it is why layouts keep state.</p>
      <p><b>Error details.</b> In production, errors thrown in Server Components reach the client boundary with a generic message and a <code>digest</code> so you do not leak secrets; log the full error on the server. <code>reset()</code> re-renders the boundary's children; for errors caused by stale server data, combine it with <code>router.refresh()</code> inside a transition. <code>notFound()</code>, <code>redirect()</code> and (experimental) <code>forbidden()</code>/<code>unauthorized()</code> work by throwing special errors, so never wrap them in a try/catch that swallows everything.</p>
      <p><b>Streaming status codes.</b> Once streaming starts, the HTTP status is already sent (200), so a <code>notFound()</code> inside a Suspense boundary yields a <code>noindex</code> meta tag rather than a real 404. Do existence checks before the first Suspense boundary when the status code matters for SEO.</p>`,
    aiEra: `<p>🤖 AI tools generate layouts and boundaries quickly but often put <code>'use client'</code> on <code>layout.js</code> because one child needs state (making the whole subtree client-side), forget that <code>error.js</code> must be a Client Component, or try to read <code>searchParams</code> in a layout. They also put auth checks only in layouts.</p>
      <p>Ask the assistant to draw the composed tree for a route (as the visual above does) and to explain which boundary catches an error thrown at each level. That review takes a minute and catches the "error boundary next to the layout" bug before it reaches production.</p>`,
    problems: [
      {
        title: 'Nested Layout Composer',
        level: 'Medium', tags: ['next.js', 'layouts', 'error boundaries'], companies: ['Vercel', 'Stripe'],
        statement: `<p>Write <code>composeLayouts(files, route)</code>. <code>files</code> lists special files under <code>app/</code> as <code>"folder/kind"</code> (root files have no folder: <code>"layout"</code>), where kind is <code>layout, template, error, loading, not-found, page</code>. <code>route</code> is the page's folder path (<code>""</code> for the root, e.g. <code>"(shop)/cart"</code>).</p>
          <p>Return the tree from outside to inside joined by <code>" &gt; "</code>, each item written <code>kind(/folder)</code>. Visit folders from the root down; inside a folder use the order layout, template, error, loading, not-found; finish with <code>page(/route)</code>. Return <code>"missing root layout"</code> if there is no root <code>layout</code>, else <code>"404"</code> if the route has no page.</p>`,
        constraints: `Up to 100 files, in any order. Folder names contain no spaces.`,
        example: `<p>Files <code>layout, error, (shop)/layout, (shop)/cart/error, (shop)/cart/page</code>, route <code>(shop)/cart</code> → ${H.c('g', '"layout(/) &gt; error(/) &gt; layout(/(shop)) &gt; error(/(shop)/cart) &gt; page(/(shop)/cart)"')}. The cart error boundary sits inside the cart layout (if there were one), so it cannot catch that layout's errors.</p>`,
        brute: { why: `<p>Sorting the matching files alphabetically or by input order mixes up levels and kinds (error before layout, a child layout before the parent's loading). You lose the rule that each folder contributes its wrappers in a fixed order.</p>`,
          code: `function composeLayoutsNaive(files, route) {
  // wrong: keeps whatever order the files were listed in
  return files.filter((f) => route.startsWith(f.split('/').slice(0, -1).join('/')))
    .map((f) => f.split('/').pop()).join(' > ');
}` },
        mcq: { q: '<code>app/shop/layout.js</code> throws during render. Which file renders the error UI?', options: ['<code>app/shop/error.js</code>', 'The nearest error boundary outside it, e.g. <code>app/error.js</code>', 'Nothing; layouts cannot throw'], answer: 1, explain: 'error.js wraps the children of the layout in the same folder, not the layout itself, so the error bubbles to the parent boundary.' },
        hints: [
          `<p>Hint 1: list the folders on the path: <code>""</code>, then each prefix of the route (<code>"(shop)"</code>, <code>"(shop)/cart"</code>).</p>`,
          `<p>Hint 2: put the files in a Set; for each folder, check the five kinds in the fixed order and push the ones that exist.</p>`,
          `<p>Hint 3: check the root layout first, then the page; build the file key as <code>folder ? folder + "/" + kind : kind</code>.</p>`
        ],
        solution: {
          approach: `<p>Build the list of folders from the root to the route. For each folder, add any of layout, template, error, loading, not-found that exists, in that order. Then add the page. This mirrors how Next.js nests a segment: Layout → Template → ErrorBoundary → Suspense → NotFoundBoundary → children.</p>`,
          code: { lang: 'js', run: true, code: `const ORDER = ['layout', 'template', 'error', 'loading', 'not-found'];

function composeLayouts(files, route) {
  const has = new Set(files);
  if (!has.has('layout')) return 'missing root layout';
  const key = (folder, kind) => (folder ? folder + '/' + kind : kind);
  if (!has.has(key(route, 'page'))) return '404';

  const folders = [''];
  const segs = route ? route.split('/') : [];
  for (let i = 0; i < segs.length; i++) folders.push(segs.slice(0, i + 1).join('/'));

  const out = [];
  for (const folder of folders) {
    for (const kind of ORDER) if (has.has(key(folder, kind))) out.push(kind + '(/' + folder + ')');
  }
  out.push('page(/' + route + ')');
  return out.join(' > ');
}

console.log(composeLayouts(['layout', 'error', '(shop)/layout', '(shop)/cart/error', '(shop)/cart/page'], '(shop)/cart'));
console.log(composeLayouts(['layout', 'page'], 'about')); // 404` },
          complexity: `<p>O(F + D·5) for F files and D folders on the path.</p>`,
          followUps: ['Where would parallel slots (@team) appear in this tree?', 'Which boundary handles an error thrown inside template.js?']
        },
        tests: { sig: 'string[] string -> string', fn: 'composeLayouts', cases: [
          [[['layout', 'error', '(shop)/layout', '(shop)/cart/page', '(shop)/cart/loading', '(shop)/cart/error', 'template', 'page', 'not-found', 'dashboard/layout', 'dashboard/settings/page', 'dashboard/loading'], ''], 'layout(/) > template(/) > error(/) > not-found(/) > page(/)'],
          [[['layout', 'error', '(shop)/layout', '(shop)/cart/page', '(shop)/cart/loading', '(shop)/cart/error', 'template', 'page', 'not-found', 'dashboard/layout', 'dashboard/settings/page', 'dashboard/loading'], '(shop)/cart'], 'layout(/) > template(/) > error(/) > not-found(/) > layout(/(shop)) > error(/(shop)/cart) > loading(/(shop)/cart) > page(/(shop)/cart)'],
          [[['layout', 'error', '(shop)/layout', '(shop)/cart/page', '(shop)/cart/loading', '(shop)/cart/error', 'template', 'page', 'not-found', 'dashboard/layout', 'dashboard/settings/page', 'dashboard/loading'], 'dashboard/settings'], 'layout(/) > template(/) > error(/) > not-found(/) > layout(/dashboard) > loading(/dashboard) > page(/dashboard/settings)'],
          [[['layout', 'error', '(shop)/layout', '(shop)/cart/page', 'dashboard/layout', 'dashboard/settings/page'], 'dashboard'], '404'],
          [[['page'], ''], 'missing root layout'],
          [[['layout', 'a/b/c/page', 'a/b/layout'], 'a/b/c'], 'layout(/) > layout(/a/b) > page(/a/b/c)'],
          [[['(shop)/cart/page', '(shop)/cart/error', 'layout', '(shop)/cart/template', '(shop)/cart/layout'], '(shop)/cart'], 'layout(/) > layout(/(shop)/cart) > template(/(shop)/cart) > error(/(shop)/cart) > page(/(shop)/cart)']
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 3 — Server / Client component boundary
     ===================================================================== */
  topics.push({
    title: 'The Server/Client Boundary: Directives, Imports & Serializable Props',
    analogy: `<p>Think of a <b>restaurant kitchen and the dining room</b>. The kitchen (server) has the knives, the walk-in fridge and the supplier's phone number (database, secrets). The dining room (browser) has the guests, who press buttons and ask for things (state, events). Only what fits on a <b>plate through the serving hatch</b> can cross: food, not the chef, not the stove. Plates are your <b>serializable props</b>. A waiter who walks into the dining room cannot go back and use the fridge, and anyone who follows that waiter through the door is in the dining room too: that is how <code>'use client'</code> spreads through imports.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> In the App Router every component is a <b>Server Component</b> unless its module (or a module that imports it from the client side) starts with <code>'use client'</code>. Server Components can be <code>async</code>, read the database and secrets, and ship no JavaScript. Client Components can use state, effects, event handlers and browser APIs. The React Internals module covered <i>why</i>; here we focus on the exact rules that interviewers probe.</p>
      <p>🔵 <b>Rule 1: the directive marks an entry point, and it spreads through imports.</b> <code>'use client'</code> says "this module and everything it imports belong to the client bundle". A component without a directive becomes a Client Component when it is <b>imported</b> by a client module. So a server-only helper imported by a client file will break (or leak). Protect such modules with <code>import 'server-only'</code>, which makes the build fail if they reach the client graph.</p>
      <p>🔵 <b>Rule 2: what may cross from server to client as props.</b> Props are serialized into the RSC payload, so they must be serializable by React:</p>
      ${H.table(['Allowed (React 19)', 'Not allowed'], [
        ['string, number, bigint, boolean, null, undefined', 'functions (except Server Actions)'],
        ['arrays, plain objects, Map, Set, Date, typed arrays, ArrayBuffer, FormData', 'class instances (custom prototypes), Symbols not from <code>Symbol.for</code>'],
        ['Promises (read with <code>use()</code> on the client)', 'DOM nodes, closures over server state'],
        ['JSX, including Server Component output passed as <code>children</code>', 'anything with getters/setters or circular non-plain objects'],
        ['Server Actions (functions marked <code>\'use server\'</code>)', '']
      ])}
      <p>🔵 <b>Rule 3: the "donut".</b> A Client Component cannot <i>import</i> a Server Component (it would become client code), but it can <b>render one passed in as <code>children</code> or another prop</b>, because the server renders it first and only the result travels. That is how a client <code>&lt;Modal&gt;</code> or context provider wraps server content.</p>
      ${H.kv([['Page (server)', 'awaits db, imports Cart'], ['Cart (\'use client\')', 'useState, onClick'], ['props Page → Cart', 'items: array ✔, onBuy: function ✖'], ['children of Cart', 'server-rendered JSX ✔']], { label: 'one boundary' })}`,
    clues: [
      '"useState only works in Client Components" / "event handlers cannot be passed to Client Component props" → the error messages of a missing or misplaced <code>\'use client\'</code>',
      '"My server util ended up in the browser bundle" → it was imported from a client module; add <code>import \'server-only\'</code>',
      '"Pass a callback from a server page to a client button" → you cannot, pass a Server Action instead (or move the handler into the client)',
      '"Wrap the whole app in a ThemeProvider without making it client-side" → client provider that takes <code>children</code>',
      '"Can a Client Component render a Server Component?" → yes, via props/children, not via import',
      '"Pass a Date or a Map to a client component" → fine in React 19; a class instance is not'
    ],
    code: [
      { lang: 'tsx', check: false, title: 'Donut pattern, server-only guard and a Promise prop', code: `// lib/db.ts
import 'server-only';                 // build error if a client module imports this
export async function getUser(id: string) { /* ... reads secrets, DB ... */ }

// app/providers.tsx
'use client';
import { ThemeProvider } from 'next-themes';
export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="class">{children}</ThemeProvider>;   // children stay server-rendered
}

// app/profile/page.tsx  (Server Component)
import { Suspense } from 'react';
import { getUser, getActivity } from '@/lib/db';
import { ActivityList } from './ActivityList';
export default async function Profile() {
  const user = await getUser('42');
  const activityPromise = getActivity('42');          // not awaited: start it now, stream later
  return (
    <>
      <h1>{user.name}</h1>
      <Suspense fallback={<p>Loading activity…</p>}>
        <ActivityList activity={activityPromise} />    {/* a Promise is serializable */}
      </Suspense>
    </>
  );
}

// app/profile/ActivityList.tsx
'use client';
import { use } from 'react';
export function ActivityList({ activity }: { activity: Promise<string[]> }) {
  const items = use(activity);                          // suspends until the server resolves it
  return <ul>{items.map((a) => <li key={a}>{a}</li>)}</ul>;
}` }
    ],
    viz: [
      {
        title: "How 'use client' spreads through the import graph",
        gen: function () {
          var nodes = [
            { id: 'P', label: 'page.js (server)', x: 50, y: 8, shape: 'box' },
            { id: 'H', label: 'Header', x: 18, y: 30, shape: 'box' },
            { id: 'C', label: "Cart 'use client'", x: 72, y: 30, shape: 'box' },
            { id: 'F', label: 'formatPrice', x: 58, y: 54, shape: 'box' },
            { id: 'D', label: 'db.js (server-only)', x: 90, y: 54, shape: 'box' },
            { id: 'N', label: 'NavLinks', x: 18, y: 54, shape: 'box' }
          ];
          var edges = [['P', 'H'], ['P', 'C', 'items, onBuy?'], ['H', 'N'], ['C', 'F'], ['C', 'D']];
          function g(narr, hl, ehl, tags) { return { narr: narr, parts: [{ type: 'graph', directed: true, height: 64, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }] }; }
          return [
            g('Start at the page. With no directive it is a <b>Server Component</b>. Everything it imports stays on the server unless a module says otherwise.', { P: 'ok' }),
            g('<code>Header</code> and <code>NavLinks</code> have no directive and are imported from server code, so they are Server Components too. They cost zero client JavaScript.', { P: 'ok', H: 'ok', N: 'ok' }, { 'P-H': 'ok', 'H-N': 'ok' }),
            g('<code>Cart</code> starts with <code>\'use client\'</code>: this is a <b>boundary</b>. Cart and everything it imports go into the client bundle.', { C: 'cur' }, { 'P-C': 'cur' }, { C: 'client entry' }),
            g('<code>formatPrice</code> has no directive, but it is imported by a client module, so it becomes client code automatically. That is fine for a pure helper.', { C: 'cur', F: 'cur' }, { 'C-F': 'cur' }, { F: 'client (inherited)' }),
            g('<code>db.js</code> is also imported by Cart. It would ship database code to the browser. Because it has <code>import \'server-only\'</code>, the build fails instead of leaking.', { D: 'bad' }, { 'C-D': 'bad' }, { D: 'build error' }),
            g('Props on the edge Page → Cart are serialized: <code>items</code> (array) is fine, <code>onBuy</code> (a plain function) is rejected. Pass a Server Action or define the handler inside Cart.', { P: 'ok', C: 'cur' }, { 'P-C': 'bad' }, { C: 'onBuy ✖' })
          ];
        }
      }
    ],
    examples: [
      { title: 'The giant client layout', html: `<p>A team put <code>'use client'</code> on <code>app/layout.js</code> because the header needs a menu toggle. Every page below inherited client mode through imports, the bundle grew by hundreds of kB and pages could no longer <code>await</code> data. Fix: move the toggle into <code>MenuButton.js</code> with the directive, keep the layout a Server Component.</p>` },
      { title: 'Passing a callback fails', html: `<p><code>&lt;LikeButton onLike={() =&gt; db.like(id)} /&gt;</code> from a Server Component throws "Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with 'use server'". Write <code>async function like() { 'use server'; await db.like(id) }</code> or import an action from an <code>actions.js</code> file with <code>'use server'</code> at the top.</p>` },
      { title: 'Class instance props', html: `<p>Passing <code>new Money(10, 'EUR')</code> to a Client Component fails because the prototype (methods) cannot be serialized. Pass <code>{ amount: 10, currency: 'EUR' }</code> and rebuild the class on the client, or format it on the server and pass a string. Dates, Maps and Sets are fine in React 19.</p>` },
      { title: 'Context only exists on the client', html: `<p>Server Components cannot read React context (<code>useContext</code> is a client hook). For per-request server data, use <code>cache()</code>-wrapped functions or <code>headers()</code>/<code>cookies()</code>; for client-wide state, render a client provider high in the tree and pass server content as <code>children</code>.</p>` }
    ],
    deepDive: `<p>🟣 <b>What the bundler does.</b> Next.js builds two module graphs: the <code>react-server</code> graph (server components, using a special build of React without hooks like <code>useState</code>) and the client graph. A <code>'use client'</code> module is replaced in the server graph by a <b>client reference</b> (module id + export name). When the server renders, the reference is written into the RSC payload with its serialized props; the browser loads that chunk and hydrates. <code>'use server'</code> does the reverse: in the client graph an action is replaced by a <b>server reference</b> (an encrypted action id) that React calls with a POST.</p>
      <p><b>Data exposure.</b> Everything you pass across the boundary is visible in the page source. Passing a whole <code>user</code> row (with password hash or internal flags) to a client component leaks it. Map to a DTO first. React 19's experimental taint APIs (<code>taintObjectReference</code>, <code>taintUniqueValue</code>) can block specific objects or tokens from being passed.</p>
      <p><b>Third-party components</b> that use hooks but lack the directive can be re-exported from a tiny file that starts with <code>'use client'</code>. Server Components may import and render Client Components freely; the restriction is only one way.</p>`,
    aiEra: `<p>🤖 Code assistants often "fix" the error <i>useState only works in Client Components</i> by adding <code>'use client'</code> at the top of whatever file is open, even if that file is the page or layout. The error disappears and the architecture quietly degrades: bigger bundles and client-side data fetching.</p>
      <p>A better prompt is "move only the interactive part into a new client component and keep the page a Server Component". Add lint rules or a small script (like the boundary checker below) to CI that flags hooks in server files and non-serializable props, and review what data is serialized into the payload, which AI tools never check.</p>`,
    problems: [
      {
        title: 'Server/Client Boundary Checker',
        level: 'Hard', tags: ['next.js', 'server components', 'static analysis'], companies: ['Vercel', 'Netflix', 'Atlassian'],
        statement: `<p>Write <code>checkBoundary(files)</code>. Each file is <code>"Name|directive|uses|imports"</code>: <code>directive</code> is <code>client</code> or empty; <code>uses</code> is a comma list of things the component uses; <code>imports</code> is a <code>;</code>-separated list of children, each <code>Child</code> or <code>Child:prop=type,prop=type</code>.</p>
          <ul><li>A file is a <b>client</b> file if it has the directive or is imported (directly or transitively) by a client file. Otherwise it is a server file.</li>
          <li>Server file using a client-only thing (<code>useState useEffect useLayoutEffect useReducer useRef useContext useTransition useOptimistic useActionState useFormStatus useRouter usePathname useSearchParams</code>, any <code>onXxx</code> handler, or <code>window document localStorage sessionStorage navigator</code>) → <code>"Name: X needs 'use client'"</code>.</li>
          <li>Client file using a server-only thing (<code>db fs secret cookies headers server-only</code>) → <code>"Name: X is server-only"</code>.</li>
          <li>A server file passing a prop to a client child whose type is not one of <code>string number bigint boolean null undefined array object date map set promise jsx action formdata</code> → <code>"Parent -&gt; Child: prop (type) is not serializable"</code>.</li></ul>
          <p>Report issues file by file in input order; inside a file, uses first (in order), then imports and props (in order).</p>`,
        constraints: `Up to 200 files; names are unique; imports may name files that do not appear (ignore those children).`,
        example: `<p><code>["Page||db|Like:count=number,onLike=function", "Like|client|useState,onClick|"]</code> → ${H.c('r', '["Page -&gt; Like: onLike (function) is not serializable"]')}. Page may use <code>db</code> (server), Like may use <code>useState</code> (client); only the function prop is wrong.</p>`,
        brute: { why: `<p>Looking only at each file's own directive misses <b>inherited</b> client status: a helper without a directive imported by a client file is client code, so a <code>db</code> call there is a leak. You need to propagate client status through the import graph first.</p>`,
          code: `function checkBoundaryNaive(files) {
  const issues = [];
  for (const line of files) {
    const [name, dir, uses] = line.split('|');
    for (const u of uses ? uses.split(',') : []) {
      if (dir !== 'client' && u.startsWith('use')) issues.push(name + ': ' + u + " needs 'use client'");
    }
  }
  return issues; // misses inherited client files, server-only leaks and props
}` },
        mcq: { q: '<code>Footer</code> has no directive and is imported by <code>Shell</code>, which has <code>\'use client\'</code>. Footer calls the database. What happens?', options: ['Fine: Footer has no directive so it is a Server Component', 'Footer becomes client code through the import, so the database code would ship to the browser (or fail the build with server-only)', 'Next.js automatically moves the query to the server'], answer: 1, explain: "'use client' marks a boundary for the whole import subtree. Pass Footer as children from a server parent instead of importing it in Shell." },
        hints: [
          `<p>Hint 1: parse every line into name, client flag, uses list and imports list (with props). Then compute the effective client set with a BFS/DFS from every file that has the directive.</p>`,
          `<p>Hint 2: use Sets for the client-only words, browser globals, server-only words and serializable types. An event handler is any word matching <code>/^on[A-Z]/</code>.</p>`,
          `<p>Hint 3: props are only checked on a server → client edge; client → client and server → server props are not serialized. Keep output order: walk files in input order, uses before imports.</p>`
        ],
        solution: {
          approach: `<p>Two passes. (1) Parse and propagate: start from files with the directive and mark every file reachable through imports as client. (2) Walk the files in order: for server files flag client-only uses; for client files flag server-only uses; for server files, check each import whose child is client and flag props whose type is not serializable.</p>`,
          code: { lang: 'js', run: true, code: `const CLIENT_HOOKS = new Set(['useState', 'useEffect', 'useLayoutEffect', 'useReducer', 'useRef', 'useContext',
  'useTransition', 'useOptimistic', 'useActionState', 'useFormStatus', 'useRouter', 'usePathname', 'useSearchParams']);
const BROWSER = new Set(['window', 'document', 'localStorage', 'sessionStorage', 'navigator']);
const SERVER_ONLY = new Set(['db', 'fs', 'secret', 'cookies', 'headers', 'server-only']);
const SERIALIZABLE = new Set(['string', 'number', 'bigint', 'boolean', 'null', 'undefined', 'array', 'object',
  'date', 'map', 'set', 'promise', 'jsx', 'action', 'formdata']);

function checkBoundary(files) {
  const mods = new Map();
  for (const line of files) {
    const [name, dir, uses, imports] = line.split('|');
    const kids = (imports || '').split(';').filter(Boolean).map((imp) => {
      const [child, props] = imp.split(':');
      return { child, props: (props || '').split(',').filter(Boolean).map((p) => p.split('=')) };
    });
    mods.set(name, { name, directive: dir === 'client', uses: (uses || '').split(',').filter(Boolean), kids });
  }
  // pass 1: 'use client' spreads to everything a client module imports
  const client = new Set();
  const stack = [...mods.values()].filter((m) => m.directive).map((m) => m.name);
  while (stack.length) {
    const n = stack.pop();
    if (client.has(n) || !mods.has(n)) continue;
    client.add(n);
    for (const k of mods.get(n).kids) stack.push(k.child);
  }
  // pass 2: report in input order
  const issues = [];
  for (const m of mods.values()) {
    const isClient = client.has(m.name);
    for (const u of m.uses) {
      const clientOnly = CLIENT_HOOKS.has(u) || BROWSER.has(u) || /^on[A-Z]/.test(u);
      if (!isClient && clientOnly) issues.push(m.name + ': ' + u + " needs 'use client'");
      if (isClient && SERVER_ONLY.has(u)) issues.push(m.name + ': ' + u + ' is server-only');
    }
    if (isClient) continue;                       // client -> client props are not serialized
    for (const k of m.kids) {
      if (!client.has(k.child)) continue;         // server -> server: any props are fine
      for (const [prop, type] of k.props) {
        if (!SERIALIZABLE.has(type)) issues.push(m.name + ' -> ' + k.child + ': ' + prop + ' (' + type + ') is not serializable');
      }
    }
  }
  return issues;
}

console.log(checkBoundary(['Page||db|Like:count=number,onLike=function', 'Like|client|useState,onClick|']));
console.log(checkBoundary(['Page||db|Shell', 'Shell|client|useState|Footer', 'Footer||db|']));` },
          complexity: `<p>O(F + E + P): one traversal of files, import edges and props.</p>`,
          followUps: ['How would you report the import chain that made Footer a client file?', 'Which ESLint rule or build feature does this in real projects?']
        },
        tests: { sig: 'string[] -> string[]', fn: 'checkBoundary', cases: [
          [[['Page||db|Like:count=number,onLike=function', 'Like|client|useState,onClick|']], ['Page -> Like: onLike (function) is not serializable']],
          [[['Page||useState|']], ["Page: useState needs 'use client'"]],
          [[['Page||db|Like:count=number,save=action', 'Like|client|useState|']], []],
          [[['Page||db|Shell', 'Shell|client|useState|Footer', 'Footer||db|']], ['Footer: db is server-only']],
          [[['Layout||window,onClick|Nav:items=array,when=date', 'Nav|client|usePathname|']], ["Layout: window needs 'use client'", "Layout: onClick needs 'use client'"]],
          [[['Page||db|Card:format=function', 'Card|||']], []],
          [[['Page||cookies|Chart:data=array,theme=class,id=symbol;Price:fmt=function', 'Chart|client|useEffect|', 'Price|||']], ['Page -> Chart: theme (class) is not serializable', 'Page -> Chart: id (symbol) is not serializable']],
          [[['Form|client|useActionState,secret|Field:onChange=function', 'Field|client||']], ['Form: secret is server-only']],
          [[['Page||use|Missing:x=function']], []]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 4 — Data fetching & caching
     ===================================================================== */
  function fetchCacheModel(ops) {
    var cache = {}, out = [], log = [];
    ops.forEach(function (line) {
      var p = line.split(/\s+/), t = Number(p[1]);
      if (p[0] === 'fetch') {
        var url = p[2], rev = p[3], tags = p[4] && p[4] !== '-' ? p[4].split(',') : [];
        if (rev === 'no-store' || rev === '0') { out.push('SKIP ' + url); log.push([line, 'SKIP', 'no-store: always hits the origin, never stored']); return; }
        var e = cache[url];
        if (!e) { cache[url] = { at: t, tags: tags, stale: false }; out.push('MISS ' + url); log.push([line, 'MISS', 'nothing cached yet: wait for origin, then store']); return; }
        var expired = rev !== 'false' && t - e.at >= Number(rev);
        if (e.stale || expired) { cache[url] = { at: t, tags: tags, stale: false }; out.push('STALE ' + url); log.push([line, 'STALE', 'serve old data now, refresh in the background']); return; }
        out.push('HIT ' + url); log.push([line, 'HIT', 'fresh copy from the Data Cache']);
      } else if (p[0] === 'expire' || p[0] === 'stale') {
        Object.keys(cache).forEach(function (u) {
          if (cache[u].tags.indexOf(p[2]) >= 0) { if (p[0] === 'expire') delete cache[u]; else cache[u].stale = true; }
        });
        log.push([line, p[0] === 'expire' ? 'EXPIRE' : 'MARK STALE', p[0] === 'expire' ? 'entries with this tag are deleted: next read waits for fresh data' : 'entries with this tag are marked stale: next read is served stale and refreshed']);
      }
    });
    return { out: out, log: log, cache: cache };
  }

  topics.push({
    title: 'Data Fetching & Caching: fetch Cache, revalidate, Tags and What Changed in 15 and 16',
    analogy: `<p>Think of a <b>newsroom with a pinboard</b>. A reporter (your component) needs a fact. If the same reporter asks twice during one story, the intern just repeats the first answer (<b>request memoization</b>). Facts pinned on the board stay there between stories with a "good until" sticky note (<b>Data Cache with revalidate</b>) and a coloured label like "elections" (<b>tags</b>). When the editor shouts "elections changed!", every card with that label is pulled or marked old (<b>revalidateTag / updateTag</b>). Finished printed pages are stacked by the door for the next reader (<b>Full Route Cache</b>), and each reader keeps the pages they already read in their bag (<b>Router Cache</b>).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Server Components fetch data with plain <code>await fetch()</code> or a database call. Next.js adds caching layers around that so the same work is not repeated. The State Management module showed client caches like React Query; here the cache lives on the <b>server</b> and is shared by all users.</p>
      ${H.table(['Layer', 'Where', 'What it stores', 'Lifetime'], [
        ['Request Memoization', 'server, one render', 'result of identical GET <code>fetch</code> calls (and functions wrapped in React <code>cache()</code>)', 'one request'],
        ['Data Cache', 'server, persistent', '<code>fetch</code> responses or <code>use cache</code> results', 'until revalidate time or tag invalidation'],
        ['Full Route Cache', 'server, persistent', 'HTML + RSC payload of static routes', 'until redeploy or revalidation'],
        ['Router Cache', 'browser memory', 'RSC payloads of visited/prefetched segments', 'session; stale times per route type']
      ])}
      <p>🔵 <b>Controlling the Data Cache with fetch.</b> <code>fetch(url, { cache: 'force-cache' })</code> stores the response; <code>{ cache: 'no-store' }</code> never stores it; <code>{ next: { revalidate: 60 } }</code> keeps it fresh for 60 seconds, then the next request is served the <b>stale</b> copy while Next.js refetches in the background (stale-while-revalidate); <code>{ next: { tags: ['posts'] } }</code> labels it so <code>revalidateTag('posts')</code> can invalidate it on demand.</p>
      <p>🔵 <b>Defaults changed — say this in interviews:</b></p>
      ${H.table(['Version', 'fetch default', 'GET route handlers', 'Router Cache (dynamic pages)', 'New APIs'], [
        ['Next 13/14', '<span class="c-y">cached</span> (<code>force-cache</code>)', 'cached', '30 s', '<code>unstable_cache</code>'],
        ['Next 15', '<span class="c-g">not cached</span> (opt in with <code>force-cache</code> / <code>revalidate</code>)', 'not cached', '<b>0 s</b> (static: 5 min)', 'async <code>cookies()</code>/<code>headers()</code>/<code>params</code>'],
        ['Next 16 + <code>cacheComponents</code>', 'nothing cached unless you say so', '—', 'same as 15', '<code>\'use cache\'</code>, <code>cacheLife()</code>, <code>cacheTag()</code>, <code>updateTag()</code>, <code>refresh()</code>, <code>revalidateTag(tag, profile)</code>']
      ])}
      <p>In Next 15 a fetch without options in an otherwise static route still runs at <b>build time</b>, so its result is baked into the prerendered page; it just is not stored in the Data Cache. In Next 16 with Cache Components, uncached data must either be inside <code>&lt;Suspense&gt;</code> (streamed at request time) or wrapped in <code>'use cache'</code>.</p>`,
    clues: [
      '"The page shows old data after I changed the database" → Data Cache / Full Route Cache; call <code>revalidatePath</code>/<code>revalidateTag</code> (or <code>updateTag</code> in Next 16) after the write',
      '"We upgraded to Next 15 and our API costs went up" → fetch is no longer cached by default; opt in with <code>force-cache</code>, <code>revalidate</code> or <code>use cache</code>',
      '"Same query called in layout, page and generateMetadata" → request memoization (fetch) or React <code>cache()</code> (ORM calls) dedupes it',
      '"Show fresh prices within a minute but keep pages fast" → <code>revalidate: 60</code> (stale-while-revalidate)',
      '"Invalidate every page that shows product 42" → tag the fetches <code>product-42</code> and revalidate that tag',
      '"User must see their own edit immediately after saving" → <code>updateTag</code> (Next 16, Server Actions) / <code>revalidatePath</code> + redirect'
    ],
    code: [
      { lang: 'tsx', check: false, title: 'Next 15 style: fetch options, tags and revalidation', code: `// app/blog/page.tsx
export default async function Blog() {
  // cached in the Data Cache, fresh for an hour, labelled 'posts'
  const posts = await fetch('https://cms.example.com/posts', {
    next: { revalidate: 3600, tags: ['posts'] },
  }).then((r) => r.json());

  // never cached: must be fresh on every request (makes the route dynamic)
  const stock = await fetch('https://api.example.com/stock', { cache: 'no-store' }).then((r) => r.json());
  return <PostList posts={posts} stock={stock} />;
}

// app/blog/actions.ts
'use server';
import { revalidateTag, revalidatePath } from 'next/cache';
export async function publish(formData: FormData) {
  await db.post.create({ data: { title: String(formData.get('title')) } });
  revalidateTag('posts');          // Next 15: purge entries tagged 'posts'
  revalidatePath('/blog');         // also drop the cached /blog route
}

// ORM calls are not fetch: dedupe per request with React cache()
import { cache } from 'react';
export const getUser = cache(async (id: string) => db.user.findUnique({ where: { id } }));` },
      { lang: 'tsx', check: false, title: "Next 16 Cache Components: 'use cache', cacheLife, cacheTag, updateTag", code: `// next.config.ts
const nextConfig = { cacheComponents: true };   // opt in (was experimental.dynamicIO / ppr)
export default nextConfig;

// lib/posts.ts
import { cacheLife, cacheTag } from 'next/cache';
export async function getPosts() {
  'use cache';                       // cache this function's result (args are part of the key)
  cacheLife('hours');                // built-in profile: stale/revalidate/expire times
  cacheTag('posts');
  return db.post.findMany();
}

// app/blog/actions.ts
'use server';
import { updateTag, revalidateTag } from 'next/cache';
export async function publish(formData: FormData) {
  await db.post.create({ data: { title: String(formData.get('title')) } });
  updateTag('posts');                // expire now: this user reads their own write (Server Actions only)
}
export async function nightlyImport() {
  revalidateTag('posts', 'max');     // Next 16: second arg = cacheLife profile, stale-while-revalidate
}` }
    ],
    viz: [
      {
        title: 'Data Cache: MISS, HIT, STALE, tag invalidation',
        input: 'fetch 0 /posts 60 posts; fetch 10 /posts 60 posts; fetch 70 /posts 60 posts; fetch 71 /posts 60 posts; stale 80 posts; fetch 81 /posts 60 posts; expire 90 posts; fetch 91 /posts 60 posts; fetch 92 /me no-store -',
        inputLabel: 'ops: fetch t url revalidate tags | stale t tag | expire t tag (separated by ;)',
        gen: function (input) {
          var ops = lines(input, 25, 'Use e.g. fetch 0 /posts 60 posts; expire 5 posts');
          ops.forEach(function (o) { if (!/^(fetch \d+ \S+ (\d+|false|no-store) \S+|stale \d+ \S+|expire \d+ \S+)$/.test(o)) throw new Error('Bad op "' + o + '". Use: fetch t url revalidate tags | stale t tag | expire t tag'); });
          var frames = [], rows = [];
          for (var i = 0; i < ops.length; i++) {
            var m = fetchCacheModel(ops.slice(0, i + 1)), last = m.log[m.log.length - 1];
            rows.push([last[0], last[1]]);
            var entries = Object.keys(m.cache).map(function (u) { var e = m.cache[u]; return [u, 'stored t=' + e.at + (e.stale ? ' (stale)' : '') + ' tags=' + (e.tags.join(',') || '-')]; });
            var hl = {}; hl[rows.length - 1] = /HIT/.test(last[1]) ? 'ok' : /MISS|EXPIRE/.test(last[1]) ? 'bad' : 'cur';
            frames.push({ narr: '<b>' + H.esc(last[0]) + '</b> → <b>' + last[1] + '</b>: ' + last[2] + '.', parts: [
              { type: 'table', label: 'requests', columns: ['op', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: hl },
              { type: 'map', label: 'Data Cache', entries: entries.length ? entries : [['(empty)', '']] }] });
          }
          return pad4(frames);
        }
      }
    ],
    examples: [
      { title: 'The Next 15 upgrade surprise', html: `<p>A product listing called <code>fetch(cmsUrl)</code> with no options. In Next 14 it was cached forever and the CMS saw a handful of requests a day. After upgrading to 15 the route had become dynamic because another fetch used <code>no-store</code>, and the CMS fetch now ran on every request. The fix was to state intent explicitly: <code>{ next: { revalidate: 300, tags: ['products'] } }</code>.</p>` },
      { title: 'Memoization in action', html: `<p><code>generateMetadata</code>, the layout and the page all call <code>getProduct(id)</code>. With <code>fetch</code> the identical GET is made once per request; with Prisma you wrap it in React <code>cache()</code>. Neither persists across requests; that is the Data Cache's job.</p>` },
      { title: 'Tag design', html: `<p>Tag broadly and narrowly: a product fetch gets <code>['products', 'product-42']</code>. Editing product 42 revalidates <code>product-42</code> (only its pages refresh); a bulk price import revalidates <code>products</code>. In Next 16 use <code>updateTag</code> inside the Server Action that the user is waiting on, and <code>revalidateTag(tag, 'max')</code> from webhooks or jobs where stale-while-revalidate is fine.</p>` },
      { title: 'Stale-while-revalidate timing', html: `<p>With <code>revalidate: 60</code>, data stored at t=0 is a HIT until t=59. The request at t=70 is served the old data immediately (fast) and triggers a background refetch; the request at t=71 gets the new data. Nobody waits, but one visitor saw data up to 70 s old.</p>`, code: { lang: 'text', code: `t=0   MISS   (fetch origin, store)
t=10  HIT
t=70  STALE  (serve old, refetch in background)
t=71  HIT    (new data)` } }
    ],
    deepDive: `<p>🟣 <b>Cache keys.</b> The Data Cache key for <code>fetch</code> includes the URL, method, body and headers that affect the response; <code>'use cache'</code> keys include the build id, the function id and its serialized arguments (and closed-over values). Passing a fresh object or a non-serializable value as an argument changes or breaks the key. Request-time APIs (<code>cookies()</code>, <code>headers()</code>, <code>searchParams</code>) cannot be read inside <code>'use cache'</code>; read them outside and pass the needed values as arguments (or use <code>'use cache: private'</code> for per-user caching where supported).</p>
      <p><b>Where the cache lives.</b> Self-hosted Next.js stores the Data Cache and ISR output on the local filesystem by default; with several instances you need a shared cache handler (e.g. Redis) or each pod revalidates separately and users see different versions. Vercel provides a shared, regional cache and propagates tag invalidations globally.</p>
      <p><b>Invalidation semantics.</b> In Next 15, <code>revalidateTag</code>/<code>revalidatePath</code> purge entries so the next request regenerates them. In Next 16, <code>revalidateTag(tag, profile)</code> marks entries stale (stale-while-revalidate) and the new <code>updateTag(tag)</code> expires them immediately so a Server Action can read its own write; <code>refresh()</code> refreshes the client router from a Server Action without touching cached data. Calling either from a Server Action also clears the client Router Cache so the next navigation is fresh.</p>`,
    aiEra: `<p>🤖 This is the area where AI answers are most often <b>out of date</b>: many tutorials in training data say "fetch is cached by default" (true in Next 13/14, false since 15) or use <code>unstable_cache</code> where Next 16 code would use <code>'use cache'</code>. Always tell the assistant your Next.js version and ask it to state the caching behaviour of each fetch explicitly.</p>
      <p>AI is great at generating tag schemes and revalidation calls once you describe the data model ("every write to products must refresh product pages and the listing"). Your part is deciding freshness requirements per piece of data and verifying with logs (<code>logging.fetches</code> in next.config) that the cache behaves as intended.</p>`,
    problems: [
      {
        title: 'Fetch Cache with revalidate Time and Tag Invalidation',
        level: 'Medium', tags: ['next.js', 'caching', 'revalidate', 'tags'], companies: ['Vercel', 'Shopify', 'Airbnb'],
        statement: `<p>Simulate the Next.js Data Cache. Write <code>fetchCache(ops)</code> returning one line per <code>fetch</code> op. Ops (times never decrease):</p>
          <ul><li><code>"fetch T URL REV TAGS"</code>: REV is seconds, <code>false</code> (never expires) or <code>no-store</code> (<code>0</code> means the same); TAGS is a comma list or <code>-</code>.</li>
          <li><code>"expire T TAG"</code>: delete all entries carrying TAG (like <code>updateTag</code>, or Next 15 <code>revalidateTag</code>).</li>
          <li><code>"stale T TAG"</code>: mark entries with TAG stale (like Next 16 <code>revalidateTag(tag, 'max')</code>).</li></ul>
          <p>For a fetch: no-store → <code>"SKIP URL"</code> (cache untouched). No entry → <code>"MISS URL"</code> and store it at T with its tags. Entry marked stale, or <code>T - storedAt ≥ REV</code> → <code>"STALE URL"</code> and re-store at T (background refresh). Otherwise <code>"HIT URL"</code>.</p>`,
        constraints: `Up to 10<sup>4</sup> ops. A URL always uses the same REV.`,
        example: `<p><code>fetch 0 /posts 60 posts</code> → MISS; <code>fetch 10 …</code> → HIT; <code>fetch 70 …</code> → ${H.c('y', 'STALE')} (70 − 0 ≥ 60, served old and refreshed); <code>fetch 71 …</code> → HIT.</p>`,
        brute: { why: `<p>Re-fetching on every call (no cache) is always correct but defeats the point: every request waits for the origin. Caching forever without timestamps or tags is fast but never shows new data.</p>`,
          code: `function fetchCacheNoCache(ops) {
  // every fetch goes to the origin: correct data, maximum latency and cost
  return ops.filter((o) => o.startsWith('fetch')).map((o) => 'MISS ' + o.split(' ')[2]);
}` },
        mcq: { q: 'In Next 15, a fetch has <code>{ next: { revalidate: 60 } }</code> and was stored 90 s ago. What does the next request get?', options: ['It waits for fresh data from the origin', 'The cached (stale) data immediately, while Next.js refetches in the background', 'An error'], answer: 1, explain: 'Time-based revalidation is stale-while-revalidate: the first request after expiry still gets the old value and triggers a refresh.' },
        hints: [
          `<p>Hint 1: a Map from URL to <code>{ storedAt, tags, stale }</code> is all the state you need.</p>`,
          `<p>Hint 2: for <code>expire</code>/<code>stale</code>, loop over entries and check whether their tag list contains the tag.</p>`,
          `<p>Hint 3: check in this order: no-store, missing, stale-or-expired, hit. Remember <code>false</code> means "never expires by time" but tags still work.</p>`
        ],
        solution: {
          approach: `<p>Keep a Map of entries. Each fetch op is classified in priority order; MISS and STALE both (re)store the entry with the current time (STALE models the background refresh finishing right away). Tag ops scan the Map and delete or flag matching entries.</p>`,
          code: { lang: 'js', run: true, code: `function fetchCache(ops) {
  const cache = new Map();   // url -> { at, tags, stale }
  const out = [];
  for (const line of ops) {
    const p = line.split(' ');
    const t = Number(p[1]);
    if (p[0] === 'fetch') {
      const url = p[2], rev = p[3];
      const tags = p[4] && p[4] !== '-' ? p[4].split(',') : [];
      if (rev === 'no-store' || rev === '0') { out.push('SKIP ' + url); continue; }
      const e = cache.get(url);
      if (!e) {
        cache.set(url, { at: t, tags, stale: false });
        out.push('MISS ' + url);
      } else if (e.stale || (rev !== 'false' && t - e.at >= Number(rev))) {
        cache.set(url, { at: t, tags, stale: false });   // served stale, refreshed in background
        out.push('STALE ' + url);
      } else {
        out.push('HIT ' + url);
      }
    } else {
      const tag = p[2];
      for (const [url, e] of cache) {
        if (!e.tags.includes(tag)) continue;
        if (p[0] === 'expire') cache.delete(url);   // next read is a blocking MISS
        else e.stale = true;                         // next read is served stale
      }
    }
  }
  return out;
}

console.log(fetchCache(['fetch 0 /posts 60 posts', 'fetch 10 /posts 60 posts', 'fetch 70 /posts 60 posts', 'fetch 71 /posts 60 posts']));` },
          complexity: `<p>O(1) per fetch, O(E) per tag op for E entries. Real implementations keep a tag → keys index (or store tag timestamps and compare on read) so invalidation is O(1).</p>`,
          followUps: ['How would you implement tag invalidation in O(1) using per-tag timestamps?', 'How does a multi-instance deployment share this cache?']
        },
        tests: { sig: 'string[] -> string[]', fn: 'fetchCache', cases: [
          [[['fetch 0 /posts 60 posts', 'fetch 10 /posts 60 posts', 'fetch 70 /posts 60 posts', 'fetch 71 /posts 60 posts']], ['MISS /posts', 'HIT /posts', 'STALE /posts', 'HIT /posts']],
          [[['fetch 0 /a false posts', 'fetch 9999 /a false posts', 'expire 10000 posts', 'fetch 10001 /a false posts']], ['MISS /a', 'HIT /a', 'MISS /a']],
          [[['fetch 0 /a 3600 posts', 'fetch 0 /b 3600 users', 'stale 5 posts', 'fetch 6 /a 3600 posts', 'fetch 7 /a 3600 posts', 'fetch 8 /b 3600 users']], ['MISS /a', 'MISS /b', 'STALE /a', 'HIT /a', 'HIT /b']],
          [[['fetch 0 /me no-store -', 'fetch 1 /me no-store -']], ['SKIP /me', 'SKIP /me']],
          [[['fetch 0 /p/1 false p,p1', 'fetch 0 /p/2 false p,p2', 'expire 3 p1', 'fetch 4 /p/1 false p,p1', 'fetch 4 /p/2 false p,p2', 'expire 5 p', 'fetch 6 /p/1 false p,p1', 'fetch 6 /p/2 false p,p2']], ['MISS /p/1', 'MISS /p/2', 'MISS /p/1', 'HIT /p/2', 'MISS /p/1', 'MISS /p/2']],
          [[['fetch 0 /x 10 -', 'fetch 10 /x 10 -']], ['MISS /x', 'STALE /x']],
          [[['fetch 0 /x 0 -']], ['SKIP /x']],
          [[[]], []]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 5 — Rendering modes
     ===================================================================== */
  function classifyModel(features) {
    var f = {}; features.forEach(function (x) { f[x] = true; });
    if (f['dynamic=force-dynamic']) return { mode: 'dynamic', why: 'force-dynamic always renders per request' };
    var dyn = features.filter(function (x) { return ['cookies()', 'headers()', 'searchParams', 'connection()', 'fetch no-store', 'revalidate=0', 'fetch revalidate=0'].indexOf(x) >= 0; });
    if (dyn.length && f['dynamic=error']) return { mode: 'build error', why: dyn[0] + ' used in a route marked dynamic = "error"' };
    if (dyn.length && !f['dynamic=force-static']) return { mode: 'dynamic', why: dyn[0] + ' needs request-time information' };
    var revs = features.map(function (x) { var m = /^(?:fetch )?revalidate=(\d+)$/.exec(x); return m ? Number(m[1]) : null; }).filter(function (n) { return n !== null && n > 0; });
    if (revs.length) return { mode: 'isr ' + Math.min.apply(null, revs), why: 'the shortest revalidate wins' };
    return { mode: 'static', why: 'nothing depends on the request, so it is prerendered at build time' };
  }

  topics.push({
    title: 'Rendering Modes in Next.js: Static, Dynamic, ISR, Streaming & Partial Prerendering',
    analogy: `<p>A <b>bakery</b>. Bread baked at dawn and sold all day is <b>static</b>. A cake written with your name is made while you wait: <b>dynamic</b>. Croissants re-baked every hour while the old tray is still sold is <b>ISR</b>. A sandwich shop that hands you the bread straight away and adds the hot filling when it is ready is <b>streaming</b>. And a pizza where the base is pre-baked and only the toppings are added per order is <b>Partial Prerendering</b>: a static shell with dynamic holes.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> In the App Router you rarely pick a rendering mode by name. Next.js <b>infers</b> it per route from what your code uses. The React Internals module compared CSR/SSR/SSG/ISR in general; here is how Next.js decides, and how to control it.</p>
      ${H.table(['If the route…', 'Mode', 'Build output (○ / ƒ)'], [
        ['uses nothing request-specific', '<b>static</b>: prerendered at build, served from the Full Route Cache/CDN', '○ Static'],
        ['has <code>revalidate = N</code> (segment) or <code>fetch</code> with <code>revalidate: N</code>', '<b>ISR</b>: static, regenerated in the background after N s (shortest N wins)', '○ with Revalidate column'],
        ['calls <code>cookies()</code>, <code>headers()</code>, <code>connection()</code>, reads <code>searchParams</code>, or uses <code>no-store</code> / <code>revalidate: 0</code>', '<b>dynamic</b>: rendered on every request', 'ƒ Dynamic'],
        ['dynamic params with <code>generateStaticParams</code>', 'listed params prerendered (●), others rendered on first request and cached', '● SSG']
      ])}
      <p>🔵 <b>Route segment config</b> overrides inference: <code>export const dynamic = 'force-dynamic' | 'force-static' | 'error' | 'auto'</code>, <code>export const revalidate = 60</code>, <code>dynamicParams</code>, <code>runtime</code>, <code>maxDuration</code>. <code>force-static</code> makes <code>cookies()</code>/<code>headers()</code> return empty values; <code>'error'</code> fails the build if anything dynamic is used. (With Next 16 Cache Components these segment options are replaced by <code>'use cache'</code> + <code>cacheLife</code>.)</p>
      <p>🔵 <b>Streaming.</b> A dynamic route does not have to wait for its slowest query. Wrap slow parts in <code>&lt;Suspense&gt;</code> (or add <code>loading.js</code>): Next.js sends the layout and fallbacks first, then streams each part as its data resolves, over the same HTTP response.</p>
      <p>🔵 <b>Partial Prerendering (PPR).</b> Instead of "the whole route is static or dynamic", PPR prerenders a <b>static shell</b> at build time and leaves <b>holes</b> at Suspense boundaries that contain request-time data. The shell is served instantly from the edge; the holes stream in. It was experimental in Next 14/15 (<code>experimental.ppr</code>); in Next 16 it is the model behind <code>cacheComponents: true</code>, where reading uncached or request data outside a Suspense boundary is a build error.</p>
      ${H.chips(['static shell (CDN)', 'hole: Cart (cookies)', 'hole: Recs (per user)', 'cached: Nav (use cache)'], { label: 'one PPR page', hl: { 'static shell (CDN)': 'g' } })}`,
    clues: [
      '"Why did my page become dynamic?" → look for <code>cookies()</code>, <code>headers()</code>, <code>searchParams</code>, <code>no-store</code>, <code>revalidate: 0</code>, or <code>force-dynamic</code> (the build output marks it ƒ)',
      '"Fast first byte but personalised widgets" → streaming with Suspense or Partial Prerendering',
      '"Prerender the top 1,000 products, render the rest on demand" → <code>generateStaticParams</code> + <code>dynamicParams = true</code>',
      '"Unknown slugs must 404, not render" → <code>dynamicParams = false</code>',
      '"Make sure nobody accidentally makes this marketing page dynamic" → <code>export const dynamic = \'error\'</code>',
      '"Two fetches with revalidate 60 and 3600 on one page" → the route revalidates every 60 s (shortest wins)'
    ],
    code: [
      { lang: 'tsx', check: false, title: 'Streaming a dynamic page with Suspense', code: `// app/product/[id]/page.tsx
import { Suspense } from 'react';
import { cookies } from 'next/headers';

export default async function Product({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);           // fast, cached (revalidate 300, tag product-id)
  return (
    <>
      <ProductInfo product={product} />            {/* in the first chunk */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews id={id} />                        {/* streams in when ready */}
      </Suspense>
      <Suspense fallback={<CartSkeleton />}>
        <CartPreview />                            {/* per-user, needs cookies */}
      </Suspense>
    </>
  );
}

async function CartPreview() {
  const session = (await cookies()).get('session')?.value;   // request-time API
  const cart = await getCart(session);
  return <MiniCart cart={cart} />;
}` },
      { lang: 'tsx', check: false, title: 'Segment config and generateStaticParams', code: `// app/blog/[slug]/page.tsx
export const revalidate = 3600;      // ISR: regenerate at most once an hour
export const dynamicParams = true;   // unknown slugs render on demand, then get cached

export async function generateStaticParams() {
  const top = await getTopPosts(1000);
  return top.map((p) => ({ slug: p.slug }));   // prerendered at build
}` }
    ],
    viz: [
      {
        title: 'Static, ISR or dynamic? Follow the inference',
        input: 'fetch revalidate=3600, revalidate=300, cookies()',
        inputLabel: 'features used by the route (comma separated)',
        gen: function (input) {
          var feats = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          if (feats.length > 12) throw new Error('Use at most 12 features, e.g. fetch revalidate=60, cookies()');
          var frames = [], seen = [];
          frames.push({ narr: 'Next.js starts by assuming the route is <b>static</b> and looks at everything it uses while rendering at build time.', parts: [{ type: 'set', label: 'features used', items: feats.length ? feats : ['(none)'] }, { type: 'vars', vals: { mode: 'static' } }] });
          feats.forEach(function (f, i) {
            seen.push(f);
            var r = classifyModel(seen), hl = {}; hl[f] = /dynamic|error/.test(r.mode) ? 'bad' : /isr/.test(r.mode) ? 'cur' : 'ok';
            frames.push({ narr: 'Feature <code>' + H.esc(f) + '</code>: the route is now <b>' + r.mode + '</b> because ' + H.esc(r.why) + '.', parts: [{ type: 'set', label: 'features used', items: feats, hl: hl }, { type: 'vars', vals: { mode: r.mode }, hl: { mode: 'cur' } }] });
          });
          var fin = classifyModel(feats);
          frames.push({ narr: 'Final answer: <b>' + fin.mode + '</b>. To keep most of the page static anyway, move the dynamic part into a Suspense boundary (streaming / PPR) or out of the route.', parts: [{ type: 'vars', vals: { mode: fin.mode }, hl: { mode: 'sel' } }] });
          return pad4(frames);
        }
      },
      {
        title: 'Streaming: the shell first, Suspense holes later',
        gen: function () {
          function f(narr, items, hl) { return { narr: narr, parts: [{ type: 'queue', label: 'HTTP response chunks (in order)', items: items, hl: hl || {}, frontLabel: 'first', backLabel: 'latest' }] }; }
          return [
            f('t = 0 ms. The request arrives. Layout and product info come from cache, so rendering of the shell finishes almost at once.', ['html + layout'], { 0: 'cur' }),
            f('t = 40 ms. The first chunk is flushed: layout, product info and the <b>fallbacks</b> for Reviews and Cart. The user already sees the page (good LCP).', ['html + layout', 'ProductInfo', 'ReviewsSkeleton', 'CartSkeleton'], { 1: 'ok', 2: 'cur', 3: 'cur' }),
            f('t = 180 ms. The cart query finishes first. Its HTML is streamed with a tiny inline script that swaps it into the CartSkeleton slot.', ['html + layout', 'ProductInfo', 'ReviewsSkeleton', 'CartSkeleton', 'Cart (swap)'], { 4: 'ok' }),
            f('t = 600 ms. Reviews finish and stream in. Order of arrival follows data speed, not position in the page.', ['html + layout', 'ProductInfo', 'ReviewsSkeleton', 'CartSkeleton', 'Cart (swap)', 'Reviews (swap)'], { 5: 'ok' }),
            f('The response closes. Without Suspense the user would have seen nothing until 600 ms. With PPR the first chunk would even come from the CDN as a prebuilt shell.', ['html + layout', 'ProductInfo', 'Cart', 'Reviews'], { 0: 'sel', 1: 'sel', 2: 'sel', 3: 'sel' })
          ];
        }
      }
    ],
    examples: [
      { title: 'One cookies() call makes the whole route dynamic', html: `<p>A marketing page reads <code>cookies()</code> to show "Welcome back" in the header. The build output turns from ○ to ƒ and the page loses CDN caching. Fix options: read the cookie in a small client component, move the greeting into a Suspense boundary (PPR keeps the rest static), or handle it in proxy/middleware.</p>` },
      { title: 'Shortest revalidate wins', html: `<p>The layout fetches navigation with <code>revalidate: 86400</code> and the page fetches prices with <code>revalidate: 60</code>. The route's Full Route Cache is regenerated every 60 seconds, while the navigation fetch itself stays a Data Cache hit for a day. Revalidation intervals combine at the route level but each fetch keeps its own freshness.</p>` },
      { title: 'Prerender the head, render the long tail', html: `<p>A store with 2 million products prerenders the 5,000 best sellers with <code>generateStaticParams</code> (keeps build times reasonable) and lets the rest render on first visit. After the first visit those pages are cached like the others and revalidated by tag when the product changes.</p>` },
      { title: 'Build error with Cache Components', html: `<p>With <code>cacheComponents: true</code> in Next 16, a page that awaits <code>cookies()</code> at the top level without a Suspense boundary fails the build with an "uncached data was accessed outside of &lt;Suspense&gt;" style error. The fix is to push the dynamic read into a child wrapped in <code>&lt;Suspense&gt;</code>, or to cache the data with <code>'use cache'</code>.</p>` }
    ],
    deepDive: `<p>🟣 <b>How inference actually works.</b> During <code>next build</code>, Next.js tries to prerender every route. Request-time APIs are instrumented: calling <code>cookies()</code> or reading <code>searchParams</code> during prerender throws a special "dynamic usage" signal (or, with PPR, <b>postpones</b> rendering at the nearest Suspense boundary). If the signal escapes, the route is marked dynamic; if it is caught by a boundary under PPR, everything outside becomes the static shell and the boundary's subtree is rendered at request time and streamed into the hole. That is why <code>try/catch</code> around <code>cookies()</code> can break prerendering detection.</p>
      <p><b>Streaming mechanics.</b> Suspense fallbacks are sent with placeholders; later chunks carry the HTML plus a small inline script (<code>$RC</code>) that moves it into place, and the RSC payload for those segments. Streaming needs a runtime that supports chunked responses; some proxies and older CDNs buffer the whole response and silently remove the benefit. Status codes and headers are fixed once the first byte is sent.</p>
      <p><b>generateStaticParams</b> runs at build time before layouts/pages, can be nested (parent params feed children), and its fetches are memoized across the build. Returning an empty array with <code>dynamicParams = true</code> means "render everything on demand, then cache", a common way to avoid long builds.</p>`,
    aiEra: `<p>🤖 Assistants frequently add <code>export const dynamic = 'force-dynamic'</code> to "fix" stale data, which works but throws away all caching. Others add <code>revalidate = 0</code> everywhere. Treat both as code smells in review: ask what the freshness requirement is and use tags or a short revalidate instead.</p>
      <p>AI is useful for reading the <code>next build</code> route table with you ("explain why each ƒ route is dynamic") and for drafting Suspense boundaries. Always verify the outcome in the build output and with real TTFB/LCP numbers; static vs dynamic is a decision with cost and SEO impact, not a style choice.</p>`,
    problems: [
      {
        title: 'Static, ISR or Dynamic? Classify a Route',
        level: 'Easy', tags: ['next.js', 'rendering', 'isr'], companies: ['Vercel', 'Zalando'],
        statement: `<p>Write <code>classifyRoute(features)</code> using these rules (Next 15 style inference, without Cache Components):</p>
          <ol><li><code>dynamic=force-dynamic</code> present → <code>"dynamic"</code>.</li>
          <li>Dynamic triggers are <code>cookies()</code>, <code>headers()</code>, <code>searchParams</code>, <code>connection()</code>, <code>fetch no-store</code>, <code>revalidate=0</code>, <code>fetch revalidate=0</code>. If any trigger is present and <code>dynamic=error</code> is present → <code>"build error"</code>.</li>
          <li>If any trigger is present and <code>dynamic=force-static</code> is not → <code>"dynamic"</code>.</li>
          <li>Otherwise, among <code>revalidate=N</code> and <code>fetch revalidate=N</code> with N &gt; 0, the smallest N gives <code>"isr N"</code>.</li>
          <li>Otherwise <code>"static"</code>. (Plain <code>fetch</code>, <code>fetch force-cache</code> and <code>generateStaticParams</code> keep a route static.)</li></ol>`,
        constraints: `Up to 20 features; unknown features are ignored.`,
        example: `<p><code>["fetch revalidate=60", "revalidate=300"]</code> → ${H.c('g', '"isr 60"')}. <code>["cookies()", "fetch revalidate=60"]</code> → ${H.c('r', '"dynamic"')}. <code>["dynamic=force-static", "cookies()", "revalidate=120"]</code> → ${H.c('y', '"isr 120"')} (cookies are empty under force-static).</p>`,
        brute: { why: `<p>Checking only "is there a fetch?" mislabels routes: a plain fetch in Next 15 still prerenders at build time, and a single <code>cookies()</code> call makes a route dynamic even with no fetch at all. You must check the triggers and the overrides in priority order.</p>`,
          code: `function classifyRouteNaive(features) {
  // wrong: treats any fetch as dynamic and ignores segment config
  return features.some((f) => f.startsWith('fetch')) ? 'dynamic' : 'static';
}` },
        mcq: { q: 'A Next 15 route only calls <code>fetch(url)</code> with no options. What does <code>next build</code> make of it?', options: ['Dynamic, because fetch is no longer cached', 'Static: it is prerendered at build time with that fetch result', 'ISR with a 60 s default'], answer: 1, explain: 'Uncached fetch is not a dynamic trigger. The route is prerendered at build time; the fetch result is baked into the HTML but not stored in the Data Cache.' },
        hints: [
          `<p>Hint 1: put the features in a Set; the overrides (<code>force-dynamic</code>, <code>error</code>, <code>force-static</code>) decide before anything else.</p>`,
          `<p>Hint 2: collect the triggers in an array so you can ask "is there any?".</p>`,
          `<p>Hint 3: parse revalidate numbers with a regex like <code>/^(fetch )?revalidate=(\\d+)$/</code>, ignore 0 (it is a trigger), and take the minimum.</p>`
        ],
        solution: {
          approach: `<p>Apply the rules in priority order: force-dynamic, then triggers combined with the error/force-static overrides, then the minimum positive revalidate, else static. This mirrors what the build output's ○ / ƒ markers tell you.</p>`,
          code: { lang: 'js', run: true, code: `const TRIGGERS = new Set(['cookies()', 'headers()', 'searchParams', 'connection()', 'fetch no-store', 'revalidate=0', 'fetch revalidate=0']);

function classifyRoute(features) {
  const has = new Set(features);
  if (has.has('dynamic=force-dynamic')) return 'dynamic';
  const dynamicUse = features.some((f) => TRIGGERS.has(f));
  if (dynamicUse && has.has('dynamic=error')) return 'build error';
  if (dynamicUse && !has.has('dynamic=force-static')) return 'dynamic';
  let min = Infinity;
  for (const f of features) {
    const m = /^(?:fetch )?revalidate=(\\d+)$/.exec(f);
    if (m && Number(m[1]) > 0) min = Math.min(min, Number(m[1]));
  }
  return min === Infinity ? 'static' : 'isr ' + min;
}

console.log(classifyRoute(['fetch revalidate=60', 'revalidate=300']));   // isr 60
console.log(classifyRoute(['cookies()', 'fetch revalidate=60']));         // dynamic
console.log(classifyRoute(['fetch']));                                    // static` },
          complexity: `<p>O(F) for F features.</p>`,
          followUps: ['How does Partial Prerendering change the answer for a route with one cookies() call inside Suspense?', 'What does force-static do to cookies() and headers()?']
        },
        tests: { sig: 'string[] -> string', fn: 'classifyRoute', cases: [
          [[[]], 'static'],
          [[['fetch']], 'static'],
          [[['fetch no-store']], 'dynamic'],
          [[['fetch revalidate=60', 'revalidate=300']], 'isr 60'],
          [[['cookies()', 'fetch revalidate=60']], 'dynamic'],
          [[['dynamic=force-static', 'cookies()', 'revalidate=120']], 'isr 120'],
          [[['dynamic=error', 'headers()']], 'build error'],
          [[['generateStaticParams', 'fetch force-cache']], 'static'],
          [[['dynamic=force-dynamic', 'revalidate=60']], 'dynamic'],
          [[['revalidate=0', 'fetch']], 'dynamic'],
          [[['searchParams']], 'dynamic'],
          [[['dynamic=force-static', 'fetch no-store']], 'static']
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 6 — Server Actions & forms
     ===================================================================== */
  function optimisticModel(base, events) {
    var confirmed = base.slice(), pending = [], snaps = [];
    events.forEach(function (ev) {
      var p = ev.split(' ');
      if (p[0] === 'submit') pending.push({ id: p[1], text: p[2] });
      else {
        var i = -1;
        for (var k = 0; k < pending.length; k++) if (pending[k].id === p[1]) i = k;
        if (i >= 0) {
          if (p[0] === 'ok') confirmed.push(pending[i].text);
          pending.splice(i, 1);
        }
      }
      snaps.push(confirmed.concat(pending.map(function (x) { return x.text + '*'; })).join(','));
    });
    return snaps;
  }

  topics.push({
    title: 'Server Actions & Forms: useActionState, useFormStatus, useOptimistic',
    analogy: `<p>A <b>drive-through order speaker</b>. You speak your order (submit the form) straight to the kitchen; there is no separate menu website to call. The screen shows your order immediately with a little "preparing" label (<b>optimistic UI</b>). If the kitchen is out of an item, the screen corrects itself (<b>rollback</b>). The speaker is open to anyone driving past, though, so the kitchen must still check who is paying (<b>authorization inside every action</b>).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A <b>Server Action</b> is an <code>async</code> function marked with <code>'use server'</code> that runs on the server but can be called from the client, most often by passing it to a form: <code>&lt;form action={createPost}&gt;</code>. React sends a POST request with the form data, runs the function next to your database, and returns the updated UI in the same round trip. No API route, no <code>fetch</code>, no JSON parsing.</p>
      <p>🔵 <b>Where you write them.</b> Inline inside a Server Component (a function body starting with <code>'use server'</code>) or in a file whose first line is <code>'use server'</code> (every export becomes an action, which Client Components can import). Arguments and return values must be serializable.</p>
      ${H.table(['Hook (React 19)', 'Where', 'Gives you'], [
        ['<code>useActionState(action, initial)</code>', 'Client', '<code>[state, formAction, isPending]</code>: the action receives <code>(prevState, formData)</code> and its return value becomes the new state (validation errors, messages)'],
        ['<code>useFormStatus()</code>', 'Client, inside a <code>&lt;form&gt;</code>', '<code>{ pending, data, method, action }</code> of the parent form: disable the submit button'],
        ['<code>useOptimistic(state, update)</code>', 'Client', 'a temporary state shown while an action is pending; it falls back to the real state when the action settles']
      ])}
      <p>🔵 <b>After the write:</b> call <code>revalidatePath</code>/<code>revalidateTag</code> (Next 16: <code>updateTag</code> for read-your-own-writes, <code>refresh()</code> to just re-render) so the cached pages and the client router get fresh data, and <code>redirect('/posts/' + id)</code> to navigate. Forms with Server Actions work <b>before JavaScript loads</b> (progressive enhancement) when the form is rendered by a Server Component or uses <code>useActionState</code> with a permalink.</p>
      <p>🔵 <b>Security:</b> every action is a <b>public HTTP endpoint</b>. Next.js helps (action IDs are unguessable and unused actions are removed from the build, closed-over variables are encrypted, only POST is allowed and the <code>Origin</code> header must match the host), but you must still <b>validate input</b> (e.g. with Zod) and <b>check authentication and authorization inside each action</b>.</p>`,
    clues: [
      '"Submit a form without writing an API route" → Server Action passed to <code>&lt;form action&gt;</code>',
      '"Show validation errors returned from the server" → <code>useActionState</code>',
      '"Disable the submit button while saving" → <code>useFormStatus</code> in a child of the form (or <code>isPending</code> from useActionState)',
      '"Show the comment instantly, roll back on failure" → <code>useOptimistic</code>',
      '"The list does not update after the action" → missing <code>revalidatePath</code>/<code>revalidateTag</code>/<code>updateTag</code>',
      '"Is a Server Action secure because it is not exposed in the UI?" → no: it is a public POST endpoint; authenticate and authorize inside'
    ],
    code: [
      { lang: 'tsx', check: false, title: 'Action with validation, auth and revalidation + a client form', code: `// app/posts/actions.ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

const PostSchema = z.object({ title: z.string().min(3).max(120), body: z.string().min(1) });

export type FormState = { errors?: Record<string, string[]>; message?: string };

export async function createPost(prev: FormState, formData: FormData): Promise<FormState> {
  const session = await auth();                         // 1. authenticate
  if (!session?.user) return { message: 'Please sign in.' };
  const parsed = PostSchema.safeParse(Object.fromEntries(formData));   // 2. validate
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const post = await db.post.create({ data: { ...parsed.data, authorId: session.user.id } });
  revalidatePath('/posts');                              // 3. refresh cached list
  redirect('/posts/' + post.id);                         // 4. navigate (throws, so it is last)
}

// app/posts/new/NewPostForm.tsx
'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createPost } from '../actions';

function Submit() {
  const { pending } = useFormStatus();                   // status of the parent <form>
  return <button disabled={pending}>{pending ? 'Saving…' : 'Publish'}</button>;
}

export function NewPostForm() {
  const [state, formAction] = useActionState(createPost, {});
  return (
    <form action={formAction}>
      <input name="title" aria-describedby="title-err" />
      {state.errors?.title && <p id="title-err">{state.errors.title[0]}</p>}
      <textarea name="body" />
      <Submit />
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}` },
      { lang: 'tsx', check: false, title: 'useOptimistic for an instant comment', code: `'use client';
import { useOptimistic, startTransition } from 'react';
import { addComment } from './actions';

export function Comments({ comments }: { comments: { id: string; text: string }[] }) {
  const [optimistic, addOptimistic] = useOptimistic(
    comments,
    (current, text: string) => [...current, { id: 'temp-' + current.length, text: text + ' (sending…)' }]
  );
  async function submit(formData: FormData) {
    const text = String(formData.get('text'));
    addOptimistic(text);              // shown immediately while the action is pending
    await addComment(text);           // server writes + revalidates; real list arrives as props
  }                                   // if it throws, the optimistic item simply disappears
  return (
    <>
      <ul>{optimistic.map((c) => <li key={c.id}>{c.text}</li>)}</ul>
      <form action={submit}><input name="text" /><button>Send</button></form>
    </>
  );
}` }
    ],
    viz: [
      {
        title: 'One form submit through a Server Action',
        gen: function () {
          var nodes = [
            { id: 'F', label: 'form (browser)', x: 10, y: 20, shape: 'box' },
            { id: 'R', label: 'Next.js server', x: 50, y: 20, shape: 'box' },
            { id: 'A', label: 'createPost()', x: 50, y: 50, shape: 'box' },
            { id: 'D', label: 'Database', x: 88, y: 50, shape: 'box' },
            { id: 'C', label: 'Data / Route cache', x: 88, y: 20, shape: 'box' }
          ];
          var edges = [['F', 'R', 'POST action id + FormData'], ['R', 'A'], ['A', 'D', 'insert'], ['A', 'C', 'revalidate'], ['R', 'F', 'RSC payload / redirect']];
          function g(narr, hl, ehl, tags) { return { narr: narr, parts: [{ type: 'graph', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }] }; }
          return [
            g('The user presses Publish. <code>useOptimistic</code> already shows the new post greyed out, and <code>useFormStatus</code> disables the button.', { F: 'cur' }, {}, { F: 'pending' }),
            g('React serializes the form into <b>FormData</b> and sends a POST to the current URL with the encrypted <b>action id</b> in a header. Without JavaScript loaded, the browser submits the same form natively.', { F: 'cur', R: 'cur' }, { 'F-R': 'cur' }),
            g('Next.js checks the <code>Origin</code> header against the host (CSRF protection) and looks up the action by id. Then <code>createPost</code> runs: auth check, Zod validation.', { R: 'ok', A: 'cur' }, { 'R-A': 'cur' }, { A: 'auth + validate' }),
            g('The action writes to the database.', { A: 'ok', D: 'cur' }, { 'A-D': 'cur' }),
            g('<code>revalidatePath(\'/posts\')</code> invalidates the cached list (Data Cache + Full Route Cache) and tells the client to drop its Router Cache.', { C: 'bad' }, { 'A-C': 'bad' }, { C: 'invalidated' }),
            g('The response carries the updated RSC payload (or a redirect) in the <b>same round trip</b>. React replaces the optimistic item with the real one. If the action threw, the optimistic item disappears and the error boundary or returned state shows a message.', { F: 'ok', R: 'ok' }, { 'R-F': 'ok' }, { F: 'updated' })
          ];
        }
      }
    ],
    examples: [
      { title: 'The missing auth check', html: `<p><code>deletePost(id)</code> was only rendered for admins, so the developer skipped the role check. Anyone can still call it: the action id is in the page's JavaScript and the request is a normal POST. Always <code>const user = await auth(); if (!canDelete(user, id)) throw new Error('Forbidden')</code> inside the action, and keep authorization in a data-access layer that every action uses.</p>` },
      { title: 'Validation errors without a client library', html: `<p>The action returns <code>{ errors: { title: ['Too short'] } }</code> instead of throwing. <code>useActionState</code> stores it as state and the form renders it next to the field. Expected errors are return values; unexpected ones are thrown and caught by <code>error.js</code>.</p>` },
      { title: 'redirect inside try/catch', html: `<p><code>redirect()</code> and <code>notFound()</code> work by throwing a special error. Wrapping the whole action in <code>try { ... redirect('/x') } catch (e) { return { message: 'failed' } }</code> swallows the redirect. Call <code>redirect</code> after the try/catch, or rethrow with <code>unstable_rethrow(e)</code>.</p>` },
      { title: 'Actions are for mutations', html: `<p>Server Actions are queued and run one at a time per client, and they use POST, so they are a poor fit for <b>reading</b> data (no caching, no parallelism). Read in Server Components (or route handlers for external clients); use actions for writes. Default body size limit is 1 MB (<code>serverActions.bodySizeLimit</code>).</p>` }
    ],
    deepDive: `<p>🟣 <b>Under the hood.</b> At build time each <code>'use server'</code> function gets an id. In the client bundle the import is replaced by a stub created with <code>createServerReference(id)</code>; calling it POSTs the serialized arguments (multipart for FormData) with a <code>Next-Action</code> header. The server finds the function in the action manifest, runs it, and responds with an RSC stream that can contain the action's return value <b>and</b> a refreshed tree for the current route if anything was revalidated. Inline actions that close over variables (<code>const id = ...; async function del() { 'use server'; db.del(id) }</code>) get those values serialized into a hidden field, encrypted with a per-build key (set <code>NEXT_SERVER_ACTIONS_ENCRYPTION_KEY</code> when you run multiple instances or builds).</p>
      <p><b>Progressive enhancement.</b> A form rendered by a Server Component with <code>action={serverAction}</code> includes hidden inputs so it can post natively before hydration; after hydration React intercepts it and does a soft update instead of a full page load. <code>useActionState(action, initial, permalink)</code> keeps this working for forms in Client Components.</p>
      <p><b>Ordering.</b> The client dispatches actions sequentially; several clicks queue up. For high-frequency interactions (a like button) combine <code>useOptimistic</code> with idempotent server logic or debounce the calls.</p>`,
    aiEra: `<p>🤖 AI tools generate whole CRUD flows with Server Actions in seconds. The usual omissions are the dangerous ones: no authorization check, trusting hidden form fields like <code>userId</code>, no input validation, returning full database rows to the client, and catching <code>redirect()</code>. Review every generated action with a checklist: authenticate, authorize this resource, validate, mutate, revalidate, return minimal data.</p>
      <p>Assistants also still produce Next 13-era patterns such as <code>useFormState</code> from <code>react-dom</code> (renamed <code>useActionState</code> in React 19) and <code>experimental.serverActions</code> flags, which are no longer needed.</p>`,
    problems: [
      {
        title: 'useOptimistic Queue: Pending, Confirmed, Rolled Back',
        level: 'Easy', tags: ['next.js', 'server actions', 'useOptimistic'], companies: ['Meta', 'Vercel'],
        statement: `<p>Model a list that uses <code>useOptimistic</code> with Server Actions. Start with <code>base</code> (confirmed items). Process <code>events</code>:</p>
          <ul><li><code>"submit ID TEXT"</code>: an action starts; TEXT is shown optimistically as <code>TEXT*</code>.</li>
          <li><code>"ok ID"</code>: the action succeeded; the server data (revalidated) now contains TEXT at the end of the confirmed list, and the optimistic copy disappears.</li>
          <li><code>"fail ID"</code>: the action failed; the optimistic copy disappears (rollback).</li></ul>
          <p>Unknown ids change nothing. After every event, output the visible list: confirmed items, then still-pending items in submit order with <code>*</code>, joined by commas (empty list → <code>""</code>).</p>`,
        constraints: `Up to 10<sup>4</sup> events; TEXT has no spaces.`,
        example: `<p>base <code>["a","b"]</code>, events <code>submit 1 c, submit 2 d, ok 2, ok 1</code> → <code>"a,b,c*"</code>, <code>"a,b,c*,d*"</code>, ${H.c('g', '"a,b,d,c*"')}, <code>"a,b,d,c"</code>. The server confirms in completion order, so d lands before c.</p>`,
        brute: { why: `<p>Adding the item to the confirmed list on submit (no separate pending state) is simple but cannot roll back correctly when an action fails, and shows wrong order when actions finish out of order.</p>`,
          code: `function optimisticListNaive(base, events) {
  const list = base.slice(), out = [];
  for (const ev of events) {
    const [kind, , text] = ev.split(' ');
    if (kind === 'submit') list.push(text);        // never rolled back on 'fail'
    out.push(list.join(','));
  }
  return out;
}` },
        mcq: { q: 'When does the optimistic value from <code>useOptimistic</code> disappear?', options: ['Never; you must remove it manually', 'When the action (transition) that set it finishes; React then shows the real state passed in', 'After a fixed timeout'], answer: 1, explain: 'Optimistic state lives only while its action is pending. On success the real (revalidated) data replaces it; on failure it simply goes away.' },
        hints: [
          `<p>Hint 1: keep two lists: confirmed (server truth) and pending (optimistic overlays with their ids).</p>`,
          `<p>Hint 2: on ok, push the text to confirmed and remove it from pending; on fail just remove it.</p>`,
          `<p>Hint 3: the snapshot is <code>confirmed.concat(pending.map(t =&gt; t + '*')).join(',')</code>; ignore ok/fail for ids that are not pending.</p>`
        ],
        solution: {
          approach: `<p>Separate server state from optimistic overlays, exactly like <code>useOptimistic(serverState, reducer)</code>: the visible list is always derived as "real data + pending overlays". Settling an action removes its overlay; success also changes the real data.</p>`,
          code: { lang: 'js', run: true, code: `function optimisticList(base, events) {
  const confirmed = base.slice();
  let pending = [];                       // [{ id, text }] in submit order
  const out = [];
  for (const ev of events) {
    const [kind, id, text] = ev.split(' ');
    if (kind === 'submit') {
      pending.push({ id, text });
    } else {
      const item = pending.find((p) => p.id === id);
      if (item) {
        if (kind === 'ok') confirmed.push(item.text);   // revalidated server data now has it
        pending = pending.filter((p) => p !== item);    // overlay removed either way
      }
    }
    out.push(confirmed.concat(pending.map((p) => p.text + '*')).join(','));
  }
  return out;
}

console.log(optimisticList(['a', 'b'], ['submit 1 c', 'submit 2 d', 'ok 2', 'ok 1']));` },
          complexity: `<p>O(E · P) with P pending actions (small in practice); a Map from id gives O(1) lookups.</p>`,
          followUps: ['How would you show an error toast for the failed item?', 'Why do Server Actions from one client run one after another?']
        },
        tests: { sig: 'string[] string[] -> string[]', fn: 'optimisticList', cases: [
          [[['a'], ['submit 1 b', 'ok 1']], ['a,b*', 'a,b']],
          [[['a'], ['submit 1 b', 'submit 2 c', 'fail 1', 'ok 2']], ['a,b*', 'a,b*,c*', 'a,c*', 'a,c']],
          [[[], ['submit 1 x', 'fail 1']], ['x*', '']],
          [[['a', 'b'], ['submit 1 c', 'submit 2 d', 'ok 2', 'ok 1']], ['a,b,c*', 'a,b,c*,d*', 'a,b,d,c*', 'a,b,d,c']],
          [[['a'], ['ok 9']], ['a']],
          [[['a'], []], []]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 7 — Middleware / proxy and the edge runtime
     ===================================================================== */
  function matcherToRegex(m) {
    var out = '^', i = 0;
    while (i < m.length) {
      if (m.charAt(i) === '/' && m.charAt(i + 1) === ':') {
        var j = i + 2; while (j < m.length && /\w/.test(m.charAt(j))) j++;
        var mod = '*+?'.indexOf(m.charAt(j)) >= 0 ? m.charAt(j) : '';
        out += mod === '' ? '/[^/]+' : mod === '?' ? '(?:/[^/]+)?' : mod === '+' ? '(?:/[^/]+)+' : '(?:/[^/]+)*';
        i = j + (mod ? 1 : 0);
      } else if (m.charAt(i) === '(') {
        var depth = 0, k = i;
        for (; k < m.length; k++) { if (m.charAt(k) === '(') depth++; else if (m.charAt(k) === ')') { depth--; if (!depth) break; } }
        out += m.slice(i, k + 1); i = k + 1;
      } else { out += m.charAt(i).replace(/[.*+?^${}|[\]\\]/g, '\\$&'); i++; }
    }
    return out + '$';
  }

  topics.push({
    title: 'Middleware (Proxy in Next 16), Matchers & the Edge Runtime',
    analogy: `<p>A <b>security guard at the building entrance</b>. Before you reach any office, the guard can check your badge (auth), point you to the right floor for your language (locale redirect), quietly walk you to a different room than the sign says (rewrite), or stamp your hand (set a header or cookie). The guard works fast and carries only a small toolbelt (the edge runtime), and has a list of doors they do not watch at all (the <b>matcher</b>), like the delivery entrance for static files.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <b>Middleware</b> is one function in <code>middleware.ts</code> at the project root (or <code>src/</code>) that runs <b>before</b> a request reaches a route, including before cached pages are served. It receives a <code>NextRequest</code> and returns <code>NextResponse.next()</code>, <code>NextResponse.redirect(url)</code>, <code>NextResponse.rewrite(url)</code> or a direct response. <b>Next 16 renamed it to <code>proxy.ts</code></b> (export a function named <code>proxy</code>), which runs on the Node.js runtime; <code>middleware.ts</code> still works but is deprecated.</p>
      ${H.table(['Use it for', 'Avoid it for'], [
        ['optimistic auth checks (is there a session cookie?) and redirects', 'full authorization or database queries on every request'],
        ['locale detection, A/B test bucketing, geo redirects', 'heavy computation (it is on the hot path of every request)'],
        ['rewrites (multi-tenant subdomains → <code>/[tenant]</code>), headers, CSP nonces', 'being your only security layer (re-check in pages/actions)']
      ])}
      <p>🔵 <b>The matcher.</b> <code>export const config = { matcher: [...] }</code> decides which paths run the function, using path-to-regexp syntax: <code>/about</code> exact, <code>/blog/:slug</code> one segment, <code>/dashboard/:path*</code> zero or more segments, <code>/api/:path+</code> one or more, <code>/shop/:id?</code> optional, plus raw regex groups. The classic "everything except static files" matcher is:</p>
      <pre>/((?!api|_next/static|_next/image|favicon.ico).*)</pre>
      <p>Watch the gotcha: <code>(?!api)</code> also skips <code>/apiary</code>, because the lookahead only checks the prefix. Use <code>api/</code> or <code>api(?:/|$)</code> when that matters.</p>
      <p>🔵 <b>Edge vs Node runtime.</b> The <b>edge runtime</b> is a small V8-isolate environment with Web APIs (<code>fetch</code>, <code>Request</code>, <code>Response</code>, Web Crypto, streams) but no <code>fs</code>, no native modules and limited npm compatibility, with fast cold starts close to users. Middleware ran only on the edge runtime until Next 15.2 (experimental Node.js) / 15.5 (stable Node.js). Pages and route handlers can opt in with <code>export const runtime = 'edge'</code>, but the default and generally recommended runtime is Node.js.</p>`,
    clues: [
      '"Redirect logged-out users before the page renders" → middleware/proxy with an optimistic cookie check (and a real check in the page/data layer)',
      '"Serve tenant.example.com from app/[tenant]" → rewrite in middleware/proxy',
      '"Middleware runs for images and JS chunks and slows everything down" → tighten the matcher',
      '"Cannot use the database driver / fs in middleware" → edge runtime limits (or Node runtime in 15.5+ / proxy in 16)',
      '"Detect language and send /fr" → parse <code>Accept-Language</code>, redirect to a locale prefix',
      '"middleware.ts is deprecated" → Next 16 renamed it to <code>proxy.ts</code>'
    ],
    code: [
      { lang: 'ts', check: false, title: 'proxy.ts (Next 16) — same API as middleware.ts', code: `// proxy.ts at the project root (Next 15: middleware.ts + export function middleware)
import { NextResponse, type NextRequest } from 'next/server';

const LOCALES = ['en', 'fr', 'de'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const locale = pathname.split('/')[1];
  if (!LOCALES.includes(locale)) {
    const preferred = req.headers.get('accept-language')?.split(',')
      .map((p) => p.split(';')[0].split('-')[0].toLowerCase())
      .find((l) => LOCALES.includes(l)) ?? 'en';
    return NextResponse.redirect(new URL('/' + preferred + pathname, req.url));
  }
  // optimistic auth: only checks that a session cookie exists; pages re-verify it
  if (pathname.startsWith('/' + locale + '/dashboard') && !req.cookies.has('session')) {
    const login = new URL('/' + locale + '/login', req.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }
  const res = NextResponse.next();
  res.headers.set('x-locale', locale);
  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\\\..*).*)'],
};` }
    ],
    viz: [
      {
        title: 'Does the matcher run middleware for this path?',
        input: '/apiary',
        inputLabel: 'request path',
        gen: function (input) {
          var path = String(input || '').trim();
          if (path.charAt(0) !== '/' || path.length > 80) throw new Error('Type a path starting with /, e.g. /dashboard/settings');
          var matchers = ['/dashboard/:path*', '/api/:path+', '/blog/:slug', '/((?!api|_next/static|_next/image|favicon.ico).*)'];
          var frames = [], rows = [];
          frames.push({ narr: 'Next.js compiles each matcher into a regular expression once at build time, then tests every incoming path. Path: <code>' + H.esc(path) + '</code>.', parts: [{ type: 'table', label: 'matchers', columns: ['matcher', 'regex', 'match?'], rows: matchers.map(function (m) { return [m, '', '']; }) }] });
          var any = false;
          matchers.forEach(function (m, i) {
            var re = matcherToRegex(m), ok = new RegExp(re).test(path);
            any = any || ok;
            rows.push([m, re, ok ? 'yes' : 'no']);
            var hl = {}; hl[i] = ok ? 'ok' : 'bad';
            var note = /:path\*/.test(m) ? ':path* means zero or more segments, so the bare prefix also matches.' : /:path\+/.test(m) ? ':path+ needs at least one more segment.' : /:slug/.test(m) ? ':slug is exactly one segment.' : 'A raw regex group: the negative lookahead (?!api|...) rejects any path whose text right after the slash STARTS with api, so /apiary is skipped too.';
            frames.push({ narr: '<code>' + H.esc(m) + '</code> → ' + (ok ? '<b>matches</b>' : 'no match') + '. ' + note, parts: [{ type: 'table', label: 'matchers', columns: ['matcher', 'regex', 'match?'], rows: rows.map(function (r) { return r.slice(); }).concat(matchers.slice(i + 1).map(function (x) { return [x, '', '']; })), hl: hl }] });
          });
          frames.push({ narr: any ? 'At least one matcher matched, so middleware/proxy runs for this request.' : 'No matcher matched: the request goes straight to the route (or static file) without running middleware.', parts: [{ type: 'vars', vals: { path: path, runsMiddleware: any }, hl: { runsMiddleware: any ? 'ok' : 'bad' } }] });
          return pad4(frames);
        }
      }
    ],
    examples: [
      { title: 'Multi-tenant rewrite', html: `<p><code>acme.example.com/settings</code> is rewritten to <code>/acme/settings</code>, served by <code>app/[tenant]/settings/page.js</code>. The URL in the browser does not change. A redirect would change it (and cost a round trip); a rewrite is invisible to the user.</p>` },
      { title: 'CVE-2025-29927 lesson', html: `<p>In early 2025 a vulnerability let attackers skip middleware entirely by sending an internal header (<code>x-middleware-subrequest</code>) on self-hosted Next.js. Apps that did authorization <b>only</b> in middleware exposed protected pages. Patched versions fixed it, but the lesson stands: middleware/proxy is a fast first filter, not your security boundary. Check access again where the data is read.</p>` },
      { title: 'Matcher for static assets', html: `<p>Without a matcher, middleware runs for every request including <code>/_next/static</code> chunks and images, adding latency to each one. Add a matcher that excludes static paths and files with an extension (<code>.*\\..*</code>), and use the <code>missing</code>/<code>has</code> options to skip prefetch requests when you set cookies.</p>` }
    ],
    deepDive: `<p>🟣 <b>Execution order</b> for a request: <code>headers</code> and <code>redirects</code> from next.config → middleware/proxy → <code>beforeFiles</code> rewrites → filesystem routes (static files, pages) → <code>afterFiles</code> rewrites → dynamic routes → <code>fallback</code> rewrites. Middleware therefore sees requests for cached static pages too, which is what makes it useful for geo and A/B logic on otherwise static sites.</p>
      <p><b>Communicating with the route.</b> Middleware cannot pass JavaScript objects to the page. It can set request headers (<code>NextResponse.next({ request: { headers } })</code>) that the page reads with <code>headers()</code>, or set cookies. Reading those in the page makes it dynamic, so for A/B tests on static pages prefer rewriting to separate prerendered variants (<code>/home-a</code>, <code>/home-b</code>).</p>
      <p><b>Runtime trade-offs.</b> Edge isolates start in milliseconds and run near the user, but have CPU-time limits and only Web APIs; a database in one region accessed from 30 edge locations can make things slower. Node.js runtime has full npm compatibility. Next 16's <code>proxy.ts</code> is Node-only, reflecting that most teams wanted full Node APIs in this layer.</p>`,
    aiEra: `<p>🤖 Assistants often write middleware that queries the database or verifies JWTs with Node-only libraries, which fails on the edge runtime, or they omit the matcher so it runs on every asset. They also confidently place all authorization in middleware.</p>
      <p>Use AI to generate matcher regexes and then <b>test them</b> against a table of paths (like the practice problem) because lookahead patterns are easy to get subtly wrong. Keep middleware small, fast and boring; put real authorization next to the data.</p>`,
    problems: [
      {
        title: 'Middleware Matcher (path-to-regexp subset)',
        level: 'Medium', tags: ['next.js', 'middleware', 'regex'], companies: ['Vercel', 'Cloudflare'],
        statement: `<p>Write <code>matchesMiddleware(matchers, path)</code> returning <code>true</code> if any matcher matches the whole path. Supported matcher syntax:</p>
          <ul><li>literal text (characters like <code>.</code> are literal);</li>
          <li><code>/:name</code> exactly one segment, <code>/:name?</code> zero or one, <code>/:name+</code> one or more, <code>/:name*</code> zero or more;</li>
          <li>a parenthesised group <code>( … )</code> is copied as a raw regular expression (it may contain nested parentheses).</li></ul>`,
        constraints: `Up to 20 matchers of length ≤ 200; segments are <code>[^/]+</code>.`,
        example: `<p><code>["/dashboard/:path*"]</code>: <code>/dashboard</code> ${H.c('g', 'true')}, <code>/dashboard/a/b</code> ${H.c('g', 'true')}, <code>/dashboards</code> ${H.c('r', 'false')}. With the "skip static files" regex, <code>/apiary</code> is ${H.c('r', 'false')} because <code>(?!api)</code> only looks at the prefix.</p>`,
        brute: { why: `<p>Using <code>path.startsWith(prefix)</code> for every matcher is the usual shortcut: it wrongly matches <code>/dashboards</code> for <code>/dashboard/:path*</code>, cannot express "one or more", and ignores regex groups.</p>`,
          code: `function matchesNaive(matchers, path) {
  return matchers.some((m) => path.startsWith(m.split('/:')[0]));
}` },
        mcq: { q: 'Which matcher runs middleware for <code>/api/users</code> but not for <code>/api</code>?', options: ['<code>/api/:path*</code>', '<code>/api/:path+</code>', '<code>/api/:path?</code>'], answer: 1, explain: '+ means one or more segments after /api. * and ? both also accept zero segments, so they match /api itself.' },
        hints: [
          `<p>Hint 1: convert each matcher to a regex string once, anchored with <code>^</code> and <code>$</code>, then test the path.</p>`,
          `<p>Hint 2: scan left to right. On <code>/:</code> read the name (word chars) and an optional modifier, and emit <code>/[^/]+</code>, <code>(?:/[^/]+)?</code>, <code>(?:/[^/]+)+</code> or <code>(?:/[^/]+)*</code>.</p>`,
          `<p>Hint 3: on <code>(</code> copy until the matching <code>)</code> using a depth counter; escape every other regex-special character.</p>`
        ],
        solution: {
          approach: `<p>Compile each matcher to a regular expression with a small tokenizer: parameters become segment patterns according to their modifier, raw groups pass through, everything else is escaped. A path runs middleware if any compiled regex matches it entirely.</p>`,
          code: { lang: 'js', run: true, code: `function compileMatcher(m) {
  let re = '^', i = 0;
  while (i < m.length) {
    if (m[i] === '/' && m[i + 1] === ':') {
      let j = i + 2;
      while (j < m.length && /\\w/.test(m[j])) j++;            // parameter name
      const mod = '*+?'.includes(m[j]) ? m[j] : '';
      re += { '': '/[^/]+', '?': '(?:/[^/]+)?', '+': '(?:/[^/]+)+', '*': '(?:/[^/]+)*' }[mod];
      i = j + (mod ? 1 : 0);
    } else if (m[i] === '(') {
      let depth = 0, k = i;
      for (; k < m.length; k++) {                               // copy a balanced raw group
        if (m[k] === '(') depth++;
        else if (m[k] === ')' && --depth === 0) break;
      }
      re += m.slice(i, k + 1);
      i = k + 1;
    } else {
      re += m[i].replace(/[.*+?^$|[\\]{}\\\\]/g, '\\\\$&');      // literal character
      i++;
    }
  }
  return new RegExp(re + '$');
}

function matchesMiddleware(matchers, path) {
  return matchers.some((m) => compileMatcher(m).test(path));
}

const skipStatic = '/((?!api|_next/static|_next/image|favicon.ico).*)';
console.log(matchesMiddleware(['/dashboard/:path*'], '/dashboard'));   // true
console.log(matchesMiddleware([skipStatic], '/apiary'));               // false (prefix lookahead)` },
          complexity: `<p>Compilation O(L) per matcher; matching is a regex test. Next.js compiles matchers at build time, so the per-request cost is just the test.</p>`,
          followUps: ['How would you support the has/missing conditions of the Next.js matcher?', 'How would you fix the /apiary problem in the regex?']
        },
        tests: { sig: 'string[] string -> bool', fn: 'matchesMiddleware', cases: [
          [[['/dashboard/:path*'], '/dashboard'], true],
          [[['/dashboard/:path*'], '/dashboard/a/b'], true],
          [[['/dashboard/:path*'], '/dashboards'], false],
          [[['/api/:path+'], '/api'], false],
          [[['/api/:path+'], '/api/users/1'], true],
          [[['/blog/:slug'], '/blog/a/b'], false],
          [[['/shop/:id?'], '/shop'], true],
          [[['/about', '/blog/:slug'], '/about'], true],
          [[['/((?!api|_next/static|_next/image|favicon.ico).*)'], '/'], true],
          [[['/((?!api|_next/static|_next/image|favicon.ico).*)'], '/api/users'], false],
          [[['/((?!api|_next/static|_next/image|favicon.ico).*)'], '/apiary'], false],
          [[['/((?!api|_next/static|_next/image|favicon.ico).*)'], '/products/1'], true],
          [[['/((?!api|_next/static|_next/image|favicon.ico).*)'], '/_next/static/chunk.js'], false],
          [[['/docs/:path*'], '/doc'], false],
          [[['/robots.txt'], '/robotsXtxt'], false]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 8 — Metadata, images, fonts, performance, deployment, Pages vs App
     ===================================================================== */
  function metaModel(layers) {
    var template = null, title, desc, og = {}, steps = [];
    layers.forEach(function (layer, i) {
      var kv = {};
      layer.split(';').forEach(function (pair) { var k = pair.indexOf('='); if (k > 0) kv[pair.slice(0, k)] = pair.slice(k + 1); });
      var definesTitle = 'title' in kv || 'title.absolute' in kv || 'title.default' in kv || 'title.template' in kv;
      if ('title.absolute' in kv) title = kv['title.absolute'];
      else if ('title' in kv) title = template ? template.replace('%s', kv.title) : kv.title;
      else if ('title.default' in kv) title = kv['title.default'];
      if (definesTitle) template = kv['title.template'] || null;
      if ('description' in kv) desc = kv.description;
      var ogKeys = Object.keys(kv).filter(function (k) { return k.indexOf('og.') === 0; });
      if (ogKeys.length) { og = {}; ogKeys.forEach(function (k) { og[k] = kv[k]; }); }
      steps.push({ title: title, desc: desc, og: cp(og), template: template });
    });
    return steps;
  }

  topics.push({
    title: 'Metadata, Images, Fonts, Performance & Deployment (and Pages vs App Router)',
    analogy: `<p>Getting a shop ready for opening day. The <b>sign above the door and the flyer</b> (metadata, Open Graph image) decide whether people walk in from the street (search and social links). The <b>shop window photos</b> must be the right size for each window (responsive images) and the main display must be lit first (LCP image preloaded). The <b>lettering</b> on the sign is printed in-house so it does not change shape after you hang it (self-hosted fonts, no layout shift). Then you decide whether you rent a <b>mall unit</b> with everything managed (a platform like Vercel) or your <b>own building</b> (self-hosting with Node or Docker).</p>`,
    explain: `<p>🟢 <b>Metadata.</b> Export a static <code>metadata</code> object or an async <code>generateMetadata({ params })</code> from any layout or page (Server Components only). Next.js merges them from the root down: <b>shallow merge</b>, so a child that sets <code>openGraph</code> replaces the parent's whole <code>openGraph</code> object. <code>title.template</code> (for example <code>'%s | Acme'</code>) applies to titles defined in <b>child</b> segments, <code>title.default</code> is the fallback, and <code>title.absolute</code> ignores templates. File conventions add more: <code>opengraph-image.tsx</code> (generated OG images), <code>icon</code>, <code>sitemap.ts</code>, <code>robots.ts</code>, <code>manifest.ts</code>. Viewport and theme colour use a separate <code>viewport</code> export.</p>
      <p>🔵 <b>next/image.</b> Generates a <code>srcset</code> of resized, modern-format (WebP/AVIF) variants from your <code>sizes</code> hint, lazy-loads by default, and reserves space with <code>width</code>/<code>height</code> or <code>fill</code> to prevent CLS. For the LCP image use <code>priority</code> (renamed <code>preload</code> in Next 16) so it is preloaded and not lazy. Next 16 also changed defaults: longer <code>minimumCacheTTL</code> (4 hours), <code>qualities</code> limited to <code>[75]</code> by default, and local images with query strings need <code>images.localPatterns</code>.</p>
      <p>🔵 <b>next/font.</b> Downloads Google or local fonts <b>at build time</b> and self-hosts them, so the browser never calls Google; it adds a size-adjusted fallback font so swapping fonts causes almost no layout shift, and exposes a <code>className</code>/CSS variable.</p>
      ${H.table(['Core Web Vital', 'Next.js levers'], [
        ['LCP (loading)', 'static/ISR or PPR shell, streaming, <code>priority</code>/<code>preload</code> on the hero image, correct <code>sizes</code>, fonts via next/font'],
        ['INP (responsiveness)', 'fewer/lower <code>\'use client\'</code> boundaries, less hydration, <code>next/dynamic</code> for heavy widgets, transitions'],
        ['CLS (stability)', 'image dimensions, next/font fallbacks, reserved space for streamed Suspense content']
      ])}
      <p>🔵 <b>Pages Router vs App Router.</b> Both are supported. Pages Router: <code>pages/</code>, <code>getStaticProps</code>/<code>getServerSideProps</code>/<code>getStaticPaths</code>, <code>_app</code>/<code>_document</code>, API routes in <code>pages/api</code>, everything is a client component that is SSR'd and hydrated. App Router: Server Components by default, nested layouts, streaming, Server Actions, the fetch/<code>use cache</code> caching model, route handlers. They can coexist in one app during migration (route by route).</p>`,
    clues: [
      '"Different title per page with the brand suffix" → <code>title.template</code> in the root layout',
      '"Shared link shows the wrong preview image" → Open Graph metadata is shallow-merged; a child openGraph without images drops the parent image',
      '"LCP is the hero image and it loads late" → <code>priority</code> / <code>preload</code>, correct <code>sizes</code>, no lazy loading above the fold',
      '"Layout jumps when the web font loads" → next/font (self-hosted, size-adjusted fallback)',
      '"Should we migrate from getServerSideProps?" → App Router: Server Component fetch + caching; migrate incrementally',
      '"Self-host Next.js in Docker" → <code>output: \'standalone\'</code>, shared cache handler for ISR, sharp for images'
    ],
    code: [
      { lang: 'tsx', check: false, title: 'Metadata templates, generateMetadata, next/image and next/font', code: `// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], display: 'swap' });     // self-hosted at build time

export const metadata: Metadata = {
  metadataBase: new URL('https://acme.com'),
  title: { default: 'Acme', template: '%s | Acme' },              // applies to CHILD segments
  description: 'Running gear',
  openGraph: { images: ['/og.png'] },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={inter.className}><body>{children}</body></html>;
}

// app/shoes/[id]/page.tsx
import Image from 'next/image';
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const shoe = await getShoe((await params).id);                  // memoized with the page's call
  return {
    title: shoe.name,                                              // → "Trail X | Acme"
    openGraph: { title: shoe.name, images: [shoe.image] },         // replaces the parent openGraph
  };
}
export default async function Shoe({ params }: { params: Promise<{ id: string }> }) {
  const shoe = await getShoe((await params).id);
  return (
    <Image src={shoe.image} alt={shoe.name} width={1200} height={800}
      sizes="(max-width: 768px) 100vw, 50vw" priority />          // Next 16: preload
  );
}` },
      { lang: 'js', check: false, title: 'next.config for self-hosting', code: `// next.config.js
module.exports = {
  output: 'standalone',            // minimal server bundle for Docker
  images: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.acme.com' }] },
  cacheHandler: require.resolve('./cache-handler.js'),   // shared ISR/Data Cache (e.g. Redis)
  cacheMaxMemorySize: 0,           // disable per-instance memory cache when sharing
};` }
    ],
    viz: [
      {
        title: 'How metadata merges from the root layout to the page',
        input: 'title.default=Acme;title.template=%s | Acme;description=Shop;og.image=/og.png\ndescription=Running shoes\ntitle=Trail X;og.title=Trail X',
        inputLabel: 'one segment per line (root first): key=value;key=value',
        gen: function (input) {
          var layers = String(input || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
          if (!layers.length || layers.length > 8) throw new Error('Give 1 to 8 lines like title=Home;description=Hi');
          var steps = metaModel(layers), frames = [];
          steps.forEach(function (s, i) {
            var entries = [['title', s.title === undefined ? '(none)' : s.title], ['template for children', s.template || '(none)'], ['description', s.desc === undefined ? '(none)' : s.desc]];
            Object.keys(s.og).forEach(function (k) { entries.push([k, s.og[k]]); });
            frames.push({ narr: 'Segment ' + (i + 1) + ' (' + (i === 0 ? 'root layout' : i === layers.length - 1 ? 'page' : 'nested layout') + ') exports <code>' + H.esc(layers[i]) + '</code>. Plain keys override the parent; a title is wrapped by the <b>parent\'s</b> template; any <code>og.*</code> key replaces the whole openGraph object.', parts: [{ type: 'map', label: 'resolved metadata so far', entries: entries }] });
          });
          var last = steps[steps.length - 1];
          frames.push({ narr: 'Final &lt;head&gt;: title <b>' + H.esc(String(last.title)) + '</b>. Notice whether the root og.image survived: it only does if no lower segment defined its own openGraph keys.', parts: [{ type: 'map', label: 'final', entries: [['title', String(last.title)], ['description', String(last.desc)]].concat(Object.keys(last.og).map(function (k) { return [k, last.og[k]]; })) }] });
          return pad4(frames);
        }
      }
    ],
    examples: [
      { title: 'The disappearing share image', html: `<p>The root layout sets <code>openGraph: { images: ['/og.png'] }</code>. A blog page sets <code>openGraph: { title: post.title }</code>. Shared links now have <b>no image</b>, because the page's openGraph replaced the whole object. Fix: include <code>images</code> in the page's openGraph, add an <code>opengraph-image.tsx</code> in the segment, or spread a shared object.</p>` },
      { title: 'sizes decides the download', html: `<p>A product grid image with <code>sizes="(max-width: 768px) 100vw, 33vw"</code> on a 1440 px desktop at DPR 2 needs about 950 px, so the browser picks the 1080 w variant instead of a 3840 w original. Forgetting <code>sizes</code> with <code>fill</code> makes the browser assume <code>100vw</code> and download far too much.</p>` },
      { title: 'Self-hosting checklist', html: `<p>Use <code>output: 'standalone'</code> in a Docker image, run behind a CDN, configure a shared <code>cacheHandler</code> when running several instances (otherwise each pod has its own ISR cache), set <code>NEXT_SERVER_ACTIONS_ENCRYPTION_KEY</code> and a stable build id across instances, make sure the proxy in front does not buffer streamed responses, and install <code>sharp</code> for image optimisation (bundled automatically in recent versions).</p>` },
      { title: 'Migrating one page from Pages to App Router', html: `<p><code>pages/products/[id].js</code> with <code>getServerSideProps</code> becomes <code>app/products/[id]/page.js</code>: an <code>async</code> Server Component that awaits the data, <code>generateMetadata</code> instead of <code>next/head</code>, and a <code>'use client'</code> leaf for interactive parts. Delete the old file once the new route works; the two routers cannot serve the same path.</p>` }
    ],
    deepDive: `<p>🟣 <b>Metadata internals.</b> Next.js resolves metadata for all segments in parallel (generateMetadata calls are memoized with the page's fetches), then merges them in order. A string <code>title</code> resets the template for deeper segments; only an object with <code>template</code> sets a new one. Since Next 15.2 metadata can <b>stream</b>: for normal browsers the page shell is not blocked by a slow <code>generateMetadata</code>, while bots that need tags in the initial HTML (detected by user agent, configurable with <code>htmlLimitedBots</code>) still get blocking metadata.</p>
      <p><b>Performance beyond the components.</b> Check the build output for First Load JS per route; use <code>@next/bundle-analyzer</code>; prefer Server Components for heavy libraries (markdown, date, syntax highlighting); load third-party scripts with <code>next/script</code> strategies (<code>afterInteractive</code>, <code>lazyOnload</code>, <code>worker</code>); use <code>&lt;Link&gt;</code> prefetching wisely (in production it prefetches static routes fully and dynamic routes down to the nearest loading boundary). Turbopack is the default bundler in Next 16 for dev and build, with faster builds but the same output semantics.</p>
      <p><b>Deployment models.</b> Vercel maps routes to functions, ISR to a global cache and middleware/proxy to its routing layer automatically. Elsewhere you run <code>next start</code> (a Node server) or a static export (<code>output: 'export'</code>, which disables everything that needs a server: dynamic rendering, ISR, actions, proxy). Platform adapters (OpenNext for AWS/Cloudflare, and the official deployment adapters API) fill the gap.</p>`,
    aiEra: `<p>🤖 AI tools happily write <code>&lt;Head&gt;</code> from <code>next/head</code> (Pages Router only), plain <code>&lt;img&gt;</code> tags, Google Fonts <code>&lt;link&gt;</code> tags, and <code>getServerSideProps</code> in App Router files. Lint rules (<code>@next/next/no-img-element</code>, <code>no-page-custom-font</code>) catch some; your review catches the rest.</p>
      <p>Where AI shines: generating <code>generateMetadata</code> functions and JSON-LD from your data model, writing OG image templates, and drafting a migration plan from Pages to App Router file by file. Always validate the result with a link-preview checker, Lighthouse and real-user Core Web Vitals.</p>`,
    problems: [
      {
        title: 'Resolve Merged Metadata (title templates, shallow openGraph)',
        level: 'Medium', tags: ['next.js', 'metadata', 'seo'], companies: ['Vercel', 'Shopify'],
        statement: `<p>Write <code>resolveMetadata(layers)</code>. Each layer is one segment's metadata, root first, written <code>"key=value;key=value"</code> with keys <code>title</code>, <code>title.template</code>, <code>title.default</code>, <code>title.absolute</code>, <code>description</code>, <code>og.title</code>, <code>og.image</code>.</p>
          <ul><li>Title: <code>title.absolute</code> wins as-is; else <code>title</code> is put into the template inherited from <b>earlier</b> layers (replace <code>%s</code>), or used as-is if there is none; else <code>title.default</code> is used as-is; else the title is inherited.</li>
          <li>Any layer that defines one of the title keys sets the template for later layers to its own <code>title.template</code> (or none).</li>
          <li><code>description</code> overrides. If a layer has any <code>og.*</code> key, its og keys <b>replace</b> the whole og object.</li></ul>
          <p>Return the defined values in this order: <code>title=…</code>, <code>description=…</code>, <code>og.title=…</code>, <code>og.image=…</code>.</p>`,
        constraints: `1 ≤ layers ≤ 20; values contain no <code>;</code>. An empty layer string defines nothing.`,
        example: `<p>Root <code>title.default=Acme;title.template=%s | Acme;description=Shop;og.image=/og.png</code>, page <code>title=Shoes</code> → ${H.c('g', '["title=Shoes | Acme", "description=Shop", "og.image=/og.png"]')}.</p>`,
        brute: { why: `<p>A deep merge of all keys (and applying the template of the same layer) is the intuitive approach but wrong: Next.js merges shallowly, so a child openGraph drops the parent image, and a template only affects <b>child</b> segments.</p>`,
          code: `function resolveMetadataDeep(layers) {
  const all = {};
  for (const l of layers) for (const p of l.split(';')) { const [k, v] = p.split('='); if (k) all[k] = v; }
  return Object.entries(all).map(([k, v]) => k + '=' + v); // deep merge: wrong for og and titles
}` },
        mcq: { q: 'The root layout sets <code>openGraph: { images: [\'/og.png\'] }</code>; a page sets <code>openGraph: { title: \'Post\' }</code>. What is in the page\'s Open Graph tags?', options: ['Both the title and /og.png', 'Only the title: openGraph was replaced, not deep-merged', 'Only /og.png'], answer: 1, explain: 'Metadata objects are shallow-merged by top-level key; the nested openGraph object from the page wins entirely.' },
        hints: [
          `<p>Hint 1: parse each layer into a small object by splitting on <code>;</code> and on the first <code>=</code>.</p>`,
          `<p>Hint 2: keep running state: <code>title</code>, <code>template</code> (from earlier layers), <code>description</code>, <code>og</code>. Compute this layer's title with the old template before updating the template.</p>`,
          `<p>Hint 3: when a layer has any og key, start a fresh og object. Emit only keys that are defined, in the fixed order.</p>`
        ],
        solution: {
          approach: `<p>Fold over the layers keeping resolved state. Titles use the template inherited from ancestors; afterwards the layer's own template (or null if it defined a title without one) is stashed for its children. Description overrides, openGraph replaces. Finally print in a fixed order.</p>`,
          code: { lang: 'js', run: true, code: `function resolveMetadata(layers) {
  let template = null, title, description, og = {};
  for (const layer of layers) {
    const kv = {};
    for (const pair of layer.split(';')) {
      const i = pair.indexOf('=');
      if (i > 0) kv[pair.slice(0, i)] = pair.slice(i + 1);
    }
    const definesTitle = ['title', 'title.absolute', 'title.default', 'title.template'].some((k) => k in kv);
    if ('title.absolute' in kv) title = kv['title.absolute'];
    else if ('title' in kv) title = template ? template.replace('%s', kv.title) : kv.title;
    else if ('title.default' in kv) title = kv['title.default'];
    if (definesTitle) template = kv['title.template'] || null;   // for CHILD segments only
    if ('description' in kv) description = kv.description;
    const ogKeys = Object.keys(kv).filter((k) => k.startsWith('og.'));
    if (ogKeys.length) og = Object.fromEntries(ogKeys.map((k) => [k, kv[k]]));   // shallow: replace
  }
  const out = [];
  if (title !== undefined) out.push('title=' + title);
  if (description !== undefined) out.push('description=' + description);
  for (const k of ['og.title', 'og.image']) if (k in og) out.push(k + '=' + og[k]);
  return out;
}

console.log(resolveMetadata(['title.default=Acme;title.template=%s | Acme;description=Shop;og.image=/og.png', 'title=Shoes']));` },
          complexity: `<p>O(total characters).</p>`,
          followUps: ['How does generateMetadata avoid fetching the same product twice?', 'Why might bots and browsers receive metadata at different times since Next 15.2?']
        },
        tests: { sig: 'string[] -> string[]', fn: 'resolveMetadata', cases: [
          [[['title.default=Acme;title.template=%s | Acme;description=Shop;og.image=/og.png', 'title=Shoes']], ['title=Shoes | Acme', 'description=Shop', 'og.image=/og.png']],
          [[['title.default=Acme;title.template=%s | Acme;description=Shop;og.image=/og.png', 'description=Running shoes;og.title=Shoes']], ['title=Acme', 'description=Running shoes', 'og.title=Shoes']],
          [[['title.default=Acme;title.template=%s | Acme;description=Shop;og.image=/og.png', 'title.absolute=Checkout']], ['title=Checkout', 'description=Shop', 'og.image=/og.png']],
          [[['title.default=Acme;title.template=%s | Acme;description=Shop;og.image=/og.png', 'title=Blog', 'title=Post 1']], ['title=Post 1', 'description=Shop', 'og.image=/og.png']],
          [[['title.default=Acme;title.template=%s | Acme;description=Shop;og.image=/og.png', 'title.default=Docs;title.template=%s - Docs', 'title=Intro']], ['title=Intro - Docs', 'description=Shop', 'og.image=/og.png']],
          [[['description=x']], ['description=x']],
          [[['title.default=Acme;title.template=%s | Acme;description=Shop;og.image=/og.png', 'description=Blog', '']], ['title=Acme', 'description=Blog', 'og.image=/og.png']]
        ] }
      }
    ]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Name the Segment Kind',
    level: 'Easy', tags: ['next.js', 'routing', 'file conventions'], companies: ['Vercel', 'Atlassian'],
    statement: `<p>Write <code>segmentKind(name)</code> for one App Router folder name. Return one of <code>static</code>, <code>dynamic</code> (<code>[id]</code>), <code>catch-all</code> (<code>[...slug]</code>), <code>optional-catch-all</code> (<code>[[...slug]]</code>), <code>group</code> (<code>(marketing)</code>), <code>private</code> (<code>_lib</code>), <code>parallel</code> (<code>@modal</code>) or <code>intercept</code> (starts with <code>(.)</code>, <code>(..)</code> or <code>(...)</code>, e.g. <code>(..)(..)feed</code>).</p>`,
    constraints: `1 ≤ name length ≤ 60. <code>%5F</code> is a URL-encoded underscore and is a normal static segment.`,
    example: `<p><code>"(.)photo"</code> → ${H.c('g', '"intercept"')} (checked before groups, because it also starts with a parenthesis). <code>"%5Fhidden"</code> → ${H.c('g', '"static"')}: the escape is how you get a literal <code>_</code> in a URL.</p>`,
    brute: { why: `<p>Checking <code>startsWith('(')</code> for groups first misclassifies intercepting routes, and checking <code>startsWith('[')</code> for dynamic first swallows both catch-all kinds. Order the checks from most specific pattern to least.</p>`,
      code: `function segmentKindNaive(name) {
  if (name.startsWith('(')) return 'group';      // wrong for (.)photo
  if (name.startsWith('[')) return 'dynamic';    // wrong for [...slug] and [[...slug]]
  return 'static';
}` },
    mcq: { q: 'Which folder name makes a route that is NOT part of the URL path but still groups files?', options: ['<code>_shop</code>', '<code>(shop)</code>', '<code>@shop</code>'], answer: 1, explain: '(shop) is a route group: it organizes routes and layouts without a URL segment. _shop is private (not routable at all) and @shop is a parallel slot.' },
    hints: [
      `<p>Hint 1: test the most specific shapes first: intercept markers, then <code>[[...x]]</code>, then <code>[...x]</code>.</p>`,
      `<p>Hint 2: regexes help: <code>/^\\((\\.{1,3})\\)/</code> for intercept, <code>/^\\(.+\\)$/</code> for groups.</p>`,
      `<p>Hint 3: <code>@</code> means parallel, a leading <code>_</code> means private; anything else is static (including <code>%5F…</code>).</p>`
    ],
    solution: {
      approach: `<p>A chain of pattern checks from most to least specific. This is exactly the classification Next.js applies when it scans <code>app/</code> to build the route manifest.</p>`,
      code: { lang: 'js', run: true, code: `function segmentKind(name) {
  if (/^\\(\\.{1,3}\\)/.test(name)) return 'intercept';          // (.)x (..)x (...)x (..)(..)x
  if (/^\\[\\[\\.\\.\\..+\\]\\]$/.test(name)) return 'optional-catch-all';
  if (/^\\[\\.\\.\\..+\\]$/.test(name)) return 'catch-all';
  if (/^\\[.+\\]$/.test(name)) return 'dynamic';
  if (/^\\(.+\\)$/.test(name)) return 'group';
  if (name.startsWith('@')) return 'parallel';
  if (name.startsWith('_')) return 'private';
  return 'static';
}

['blog', '[id]', '[...slug]', '[[...slug]]', '(marketing)', '_lib', '@modal', '(.)photo']
  .forEach((n) => console.log(n, '->', segmentKind(n)));` },
      complexity: `<p>O(L) per folder name, a handful of regex tests.</p>`
    },
    tests: { sig: 'string -> string', fn: 'segmentKind', cases: [
      [['blog'], 'static'], [['[id]'], 'dynamic'], [['[...slug]'], 'catch-all'], [['[[...slug]]'], 'optional-catch-all'],
      [['(marketing)'], 'group'], [['_lib'], 'private'], [['@modal'], 'parallel'], [['(.)photo'], 'intercept'],
      [['(..)(..)feed'], 'intercept'], [['(...)login'], 'intercept'], [['%5Fhidden'], 'static']
    ] }
  });

  practice.push({
    title: 'File Path to URL',
    level: 'Easy', tags: ['next.js', 'routing'], companies: ['Vercel'],
    statement: `<p>Write <code>urlFromFile(file)</code>. Given a path like <code>"app/(shop)/blog/[slug]/page.tsx"</code>, return the URL pattern it serves (<code>"/blog/[slug]"</code>). Only files named <code>page</code> or <code>route</code> (any extension) are routable; return <code>""</code> for anything else or if any folder is private (<code>_x</code>). Route groups <code>(x)</code> and parallel slots <code>@x</code> are removed from the URL. The root page is <code>"/"</code>.</p>`,
    constraints: `Path starts with <code>app/</code>; no intercepting folders in the input.`,
    example: `<p><code>"app/dashboard/@team/page.js"</code> → ${H.c('g', '"/dashboard"')} (the slot is a prop of the dashboard layout, not a URL segment). <code>"app/blog/layout.tsx"</code> → ${H.c('r', '""')}.</p>`,
    brute: { why: `<p>Just removing <code>app/</code> and the file name keeps <code>(shop)</code> and <code>@team</code> in the URL and treats layouts and private folders as routes.</p>`,
      code: `function urlFromFileNaive(file) {
  return '/' + file.split('/').slice(1, -1).join('/');   // keeps groups, slots, private folders
}` },
    mcq: { q: 'Can <code>app/api/users/route.ts</code> and <code>app/api/users/page.tsx</code> both exist?', options: ['Yes, GET goes to page and POST to route', 'No, a segment cannot have both page and route', 'Yes, route wins'], answer: 1, explain: 'A route handler and a page would serve the same URL, so Next.js reports a conflict at build time.' },
    hints: [
      `<p>Hint 1: split on <code>/</code>; the last part is the file; strip its extension to get the base name.</p>`,
      `<p>Hint 2: reject unless the base name is <code>page</code> or <code>route</code>, and reject if any folder starts with <code>_</code>.</p>`,
      `<p>Hint 3: filter out <code>(group)</code> and <code>@slot</code> folders, then join with <code>/</code> and prefix one slash.</p>`
    ],
    solution: {
      approach: `<p>Validate the file type, reject private folders, drop the folders that never appear in URLs, and join what is left.</p>`,
      code: { lang: 'js', run: true, code: `function urlFromFile(file) {
  const parts = file.split('/').slice(1);                 // drop "app"
  const base = parts.pop().replace(/\\.[^.]+$/, '');      // "page.tsx" -> "page"
  if (base !== 'page' && base !== 'route') return '';
  if (parts.some((p) => p.startsWith('_'))) return '';    // private folder
  const segs = parts.filter((p) => !/^\\(.*\\)$/.test(p) && !p.startsWith('@'));
  return '/' + segs.join('/');
}

console.log(urlFromFile('app/(shop)/blog/[slug]/page.tsx')); // /blog/[slug]
console.log(urlFromFile('app/page.tsx'));                    // /` },
      complexity: `<p>O(L) for a path of length L: one split and one filter.</p>`
    },
    tests: { sig: 'string -> string', fn: 'urlFromFile', cases: [
      [['app/page.tsx'], '/'], [['app/(shop)/blog/[slug]/page.tsx'], '/blog/[slug]'], [['app/api/users/route.ts'], '/api/users'],
      [['app/blog/layout.tsx'], ''], [['app/blog/_lib/page.js'], ''], [['app/dashboard/@team/page.js'], '/dashboard'],
      [['app/(a)/(b)/x/page.jsx'], '/x'], [['app/docs/[[...slug]]/page.mdx'], '/docs/[[...slug]]']
    ] }
  });

  practice.push({
    title: 'Which Props Cannot Cross the Boundary?',
    level: 'Easy', tags: ['server components', 'serialization'], companies: ['Vercel', 'Meta'],
    statement: `<p>A Server Component renders a Client Component with props given as <code>"name:type"</code>. Return the names (in input order) whose type cannot be serialized into the RSC payload. Serializable types: <code>string number bigint boolean null undefined array object date map set promise jsx action formdata typedarray arraybuffer</code>. Everything else (for example <code>function</code>, <code>class</code>, <code>symbol</code>, <code>regexp</code>) is not.</p>`,
    constraints: `Up to 100 props.`,
    example: `<p><code>["save:action", "fmt:function"]</code> → ${H.c('r', '["fmt"]')}. A Server Action is a reference the client can call; a plain function cannot be sent.</p>`,
    brute: { why: `<p>Testing with <code>JSON.stringify</code> is a tempting proxy, but it is wrong in both directions: JSON drops functions silently (no error), turns Dates into strings and Maps into <code>{}</code>, while React's format supports Date, Map, Set, BigInt and Promises.</p>`,
      code: `function nonSerializableJson(props) {
  // wrong model: JSON rules are not the RSC rules (Map, Set, Date, bigint, promise are fine in RSC)
  return props.filter((p) => !['string', 'number', 'boolean', 'null', 'array', 'object'].includes(p.split(':')[1]))
    .map((p) => p.split(':')[0]);
}` },
    mcq: { q: 'Which of these can a Server Component pass to a Client Component in React 19?', options: ['A class instance with methods', 'A Promise that the client reads with use()', 'An arrow function'], answer: 1, explain: 'Promises are serializable: React streams the resolved value later. Functions (other than Server Actions) and class instances are not.' },
    hints: [
      `<p>Hint 1: put the allowed (serializable) types in a Set for fast lookups.</p>`,
      `<p>Hint 2: split each entry on the first <code>:</code>.</p>`,
      `<p>Hint 3: keep the name when the type is NOT in the Set; preserve input order.</p>`
    ],
    solution: {
      approach: `<p>A whitelist of the types React's Flight serializer understands; anything else is reported.</p>`,
      code: { lang: 'js', run: true, code: `const OK = new Set(['string', 'number', 'bigint', 'boolean', 'null', 'undefined', 'array', 'object', 'date',
  'map', 'set', 'promise', 'jsx', 'action', 'formdata', 'typedarray', 'arraybuffer']);

function nonSerializable(props) {
  return props.filter((p) => !OK.has(p.slice(p.indexOf(':') + 1))).map((p) => p.slice(0, p.indexOf(':')));
}

console.log(nonSerializable(['id:string', 'onClick:function', 'when:date'])); // [ 'onClick' ]` },
      complexity: `<p>O(P) for P props, with O(1) Set lookups.</p>`
    },
    tests: { sig: 'string[] -> string[]', fn: 'nonSerializable', cases: [
      [[['id:string', 'onClick:function']], ['onClick']], [[['when:date', 'tags:set', 'data:promise']], []],
      [[['user:class', 'key:symbol', 're:regexp', 'n:bigint']], ['user', 'key', 're']], [[[]], []],
      [[['save:action', 'fmt:function']], ['fmt']], [[['children:jsx', 'buf:arraybuffer']], []]
    ] }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Sort Routes by Specificity',
    level: 'Medium', tags: ['next.js', 'routing', 'sorting'], companies: ['Vercel', 'Shopify'],
    statement: `<p>Write <code>sortRoutes(routes)</code> that orders route patterns the way a router should try them. Ignore <code>(group)</code> segments when comparing (but return the original strings). Compare segment by segment: lower rank first (static 0, <code>[x]</code> 1, <code>[...x]</code> 2, <code>[[...x]]</code> 3); equal ranks compare the segment text (string order); if one route runs out of segments first, it comes first.</p>`,
    constraints: `Up to 10<sup>4</sup> routes; no duplicates.`,
    example: `<p><code>["/blog/[slug]", "/blog/new", "/blog", "/[...all]", "/"]</code> → ${H.c('g', '["/", "/blog", "/blog/new", "/blog/[slug]", "/[...all]"]')}.</p>`,
    brute: { why: `<p>Plain alphabetical sorting puts <code>/[...all]</code> before <code>/blog</code> (since <code>[</code> &lt; <code>b</code>), so a catch-all would steal every request.</p>`,
      code: `function sortRoutesAlpha(routes) {
  return routes.slice().sort();   // "[" sorts before letters: the catch-all wins everything
}` },
    mcq: { q: 'Why does Next.js sort routes instead of trying them in file order?', options: ['To make builds faster', 'So the most specific route always wins regardless of how folders are named or listed', 'Because file order is random'], answer: 1, explain: 'Specificity ordering makes routing deterministic: static beats dynamic beats catch-all, independent of folder names.' },
    hints: [
      `<p>Hint 1: precompute each route's segments (without groups) and ranks once.</p>`,
      `<p>Hint 2: write a comparator that walks both segment lists together and returns at the first difference (rank, then text).</p>`,
      `<p>Hint 3: if all shared positions are equal, the shorter route goes first; sort a copy, not the input.</p>`
    ],
    solution: {
      approach: `<p>Decorate each route with its segment list, sort with a lexicographic comparator on (rank, text) pairs, then length.</p>`,
      code: { lang: 'js', run: true, code: `function rankSeg(s) {
  if (/^\\[\\[\\.\\.\\..+\\]\\]$/.test(s)) return 3;
  if (/^\\[\\.\\.\\..+\\]$/.test(s)) return 2;
  if (/^\\[.+\\]$/.test(s)) return 1;
  return 0;
}

function sortRoutes(routes) {
  const segs = (r) => r.split('/').filter((s) => s && !/^\\(.*\\)$/.test(s));
  const items = routes.map((r) => ({ r, s: segs(r) }));
  items.sort((a, b) => {
    for (let i = 0; i < Math.min(a.s.length, b.s.length); i++) {
      const d = rankSeg(a.s[i]) - rankSeg(b.s[i]);
      if (d) return d;
      if (a.s[i] !== b.s[i]) return a.s[i] < b.s[i] ? -1 : 1;
    }
    return a.s.length - b.s.length;
  });
  return items.map((x) => x.r);
}

console.log(sortRoutes(['/blog/[slug]', '/blog/new', '/blog', '/[...all]', '/']));` },
      complexity: `<p>O(N log N · S) for N routes of up to S segments each.</p>`
    },
    tests: { sig: 'string[] -> string[]', fn: 'sortRoutes', cases: [
      [[['/blog/[slug]', '/blog/new', '/blog', '/[...all]', '/']], ['/', '/blog', '/blog/new', '/blog/[slug]', '/[...all]']],
      [[['/shop/[[...f]]', '/shop/[...f]', '/shop/[id]', '/shop/sale']], ['/shop/sale', '/shop/[id]', '/shop/[...f]', '/shop/[[...f]]']],
      [[['/(app)/dashboard', '/(marketing)/about']], ['/(marketing)/about', '/(app)/dashboard']],
      [[['/b', '/a']], ['/a', '/b']],
      [[['/[team]/settings', '/docs/[...slug]']], ['/docs/[...slug]', '/[team]/settings']],
      [[[]], []],
      [[['/[a]/[b]', '/[a]/x']], ['/[a]/x', '/[a]/[b]']]
    ] }
  });

  practice.push({
    title: 'Count Real Network Calls with Request Memoization',
    level: 'Medium', tags: ['next.js', 'caching', 'memoization'], companies: ['Vercel', 'Airbnb'],
    statement: `<p>During server rendering, identical GET <code>fetch</code> calls in the same React render pass are made only once (request memoization). Calls are <code>"RENDER METHOD URL [OPTIONS]"</code>. Return how many requests actually hit the network, given: GET calls are deduped by (render, URL, options text); POST calls are never deduped; calls whose render id starts with <code>route</code> (Route Handlers, outside the React tree) are never deduped.</p>`,
    constraints: `Up to 10<sup>5</sup> calls. OPTIONS is the rest of the line (may be empty).`,
    example: `<p><code>["r1 GET /user", "r1 GET /user", "r1 GET /cart"]</code> → ${H.c('g', '2')}. Layout, page and generateMetadata asking for <code>/user</code> in one request share one call.</p>`,
    brute: { why: `<p>Counting every call (or deduping globally across requests) gives wrong numbers: memoization is per request render, and it applies only to GET in the React tree.</p>`,
      code: `function countFetchesNaive(calls) {
  return new Set(calls.map((c) => c.split(' ').slice(1).join(' '))).size;   // dedupes across requests too
}` },
    mcq: { q: 'You call <code>prisma.user.findUnique</code> in the layout and the page. How do you dedupe it within one request?', options: ['It is deduped automatically like fetch', 'Wrap the function with React cache()', 'Use revalidate: 60'], answer: 1, explain: 'Automatic memoization only applies to fetch. For ORM or SDK calls, wrap the data function in React cache() to memoize it per request.' },
    hints: [
      `<p>Hint 1: a Set of keys of GET calls already made is enough.</p>`,
      `<p>Hint 2: the key must include the render id and the options, not just the URL.</p>`,
      `<p>Hint 3: POST and <code>route…</code> renders always count; split off the first three tokens and treat the rest as options.</p>`
    ],
    solution: {
      approach: `<p>Walk the calls; for memoizable ones (GET inside a render) count only the first time a (render, url, options) key is seen; count everything else every time.</p>`,
      code: { lang: 'js', run: true, code: `function countFetches(calls) {
  const seen = new Set();
  let network = 0;
  for (const call of calls) {
    const [render, method, url, ...rest] = call.split(' ');
    const memoizable = method === 'GET' && !render.startsWith('route');
    if (!memoizable) { network++; continue; }
    const key = render + ' ' + url + ' ' + rest.join(' ');
    if (!seen.has(key)) { seen.add(key); network++; }
  }
  return network;
}

console.log(countFetches(['r1 GET /user', 'r1 GET /user', 'r1 GET /cart'])); // 2` },
      complexity: `<p>O(N) time and space.</p>`
    },
    tests: { sig: 'string[] -> int', fn: 'countFetches', cases: [
      [[['r1 GET /user', 'r1 GET /user', 'r1 GET /cart']], 2], [[['r1 GET /user', 'r2 GET /user']], 2],
      [[['r1 POST /like', 'r1 POST /like']], 2], [[['r1 GET /a cache=no-store', 'r1 GET /a cache=no-store', 'r1 GET /a']], 2],
      [[['route1 GET /a', 'route1 GET /a']], 2], [[[]], 0],
      [[['r1 GET /a', 'r1 GET /a', 'r1 GET /a', 'r1 POST /a', 'r2 GET /a']], 3]
    ] }
  });

  practice.push({
    title: 'Client Router Cache and staleTimes',
    level: 'Medium', tags: ['next.js', 'router cache', 'navigation'], companies: ['Vercel', 'Linear'],
    statement: `<p>Simulate the browser-side Router Cache. <code>routerCache(ops, dynamicStale, staticStale)</code> processes:</p>
      <ul><li><code>"nav T PATH static|dynamic"</code>: a Link navigation. If PATH is cached and <code>T - fetchedAt &lt; staleTime</code> for that kind → <code>"cache PATH"</code>; otherwise <code>"fetch PATH"</code> and store it with <code>fetchedAt = T</code>.</li>
      <li><code>"back T PATH"</code>: browser back/forward. Cached → <code>"restore PATH"</code> (no stale check); else <code>"fetch PATH"</code> and store.</li>
      <li><code>"refresh T"</code>: <code>router.refresh()</code> or a Server Action that revalidated: clear the cache (no output).</li></ul>
      <p>Next 15 defaults are <code>dynamicStale = 0</code>, <code>staticStale = 300</code> (Next 14 used 30 for dynamic).</p>`,
    constraints: `Up to 10<sup>5</sup> ops; times never decrease.`,
    example: `<p>Defaults (0, 300): <code>nav 0 /p static</code> → fetch, <code>nav 100 /p static</code> → ${H.c('g', 'cache')}, <code>nav 301 /p static</code> → fetch. A dynamic page is fetched every time, but <code>back</code> restores it instantly.</p>`,
    brute: { why: `<p>Never caching (always fetch) is correct but slow; caching forever (Next 13 felt like this to many users) shows stale data after mutations. The staleness rule plus explicit invalidation is the balance.</p>`,
      code: `function routerCacheNever(ops) {
  return ops.filter((o) => !o.startsWith('refresh')).map((o) => 'fetch ' + o.split(' ')[2]);
}` },
    mcq: { q: 'In Next 15, a user navigates away from a dynamic page and clicks a Link back to it 10 s later. What happens by default?', options: ['It is served from the Router Cache (30 s)', 'It is fetched again, because the default dynamic staleTime is 0', 'The browser reloads the whole document'], answer: 1, explain: 'Next 15 changed staleTimes.dynamic to 0 so Link navigations to dynamic pages always get fresh data. Back/forward still restores from cache.' },
    hints: [
      `<p>Hint 1: a Map from path to <code>fetchedAt</code> is the whole cache.</p>`,
      `<p>Hint 2: pick the stale time by the nav's kind; with 0 the condition <code>T - at &lt; 0</code> is never true.</p>`,
      `<p>Hint 3: back skips the staleness check; refresh clears the Map and outputs nothing.</p>`
    ],
    solution: {
      approach: `<p>Keep the fetch time per path. Link navigations check staleness for the route's kind; back/forward restores any cached entry; refresh empties the cache.</p>`,
      code: { lang: 'js', run: true, code: `function routerCache(ops, dynamicStale, staticStale) {
  const cache = new Map();          // path -> fetchedAt
  const out = [];
  for (const op of ops) {
    const [kind, t0, path, type] = op.split(' ');
    const t = Number(t0);
    if (kind === 'refresh') { cache.clear(); continue; }
    if (kind === 'back') {
      if (cache.has(path)) out.push('restore ' + path);
      else { cache.set(path, t); out.push('fetch ' + path); }
      continue;
    }
    const stale = type === 'static' ? staticStale : dynamicStale;
    if (cache.has(path) && t - cache.get(path) < stale) out.push('cache ' + path);
    else { cache.set(path, t); out.push('fetch ' + path); }
  }
  return out;
}

console.log(routerCache(['nav 0 /p static', 'nav 100 /p static', 'nav 301 /p static'], 0, 300));` },
      complexity: `<p>O(1) per op; refresh is O(size).</p>`
    },
    tests: { sig: 'string[] int int -> string[]', fn: 'routerCache', cases: [
      [[['nav 0 /a dynamic', 'nav 10 /a dynamic'], 0, 300], ['fetch /a', 'fetch /a']],
      [[['nav 0 /p static', 'nav 100 /p static', 'nav 301 /p static'], 0, 300], ['fetch /p', 'cache /p', 'fetch /p']],
      [[['nav 0 /a dynamic', 'nav 5 /b dynamic', 'back 6 /a'], 0, 300], ['fetch /a', 'fetch /b', 'restore /a']],
      [[['nav 0 /p static', 'refresh 5', 'nav 6 /p static'], 0, 300], ['fetch /p', 'fetch /p']],
      [[['nav 0 /a dynamic', 'nav 20 /a dynamic', 'nav 40 /a dynamic'], 30, 300], ['fetch /a', 'cache /a', 'fetch /a']],
      [[['back 0 /x'], 0, 300], ['fetch /x']]
    ] }
  });

  practice.push({
    title: 'Server Waterfall vs Parallel Fetching',
    level: 'Medium', tags: ['next.js', 'data fetching', 'performance'], companies: ['Vercel', 'Netflix', 'Uber'],
    statement: `<p>A Server Component awaits several data tasks <code>"name:ms:dep1,dep2"</code> (deps may be empty). Return <code>[sequential, parallel]</code>: <code>sequential</code> is the total time if every task is awaited one after another (sum); <code>parallel</code> is the best possible time if each task starts as soon as its dependencies finish (the longest dependency chain, as with <code>Promise.all</code> and preloading).</p>`,
    constraints: `Up to 10<sup>4</sup> tasks, any order, no cycles, all deps exist.`,
    example: `<p><code>["user:100:", "posts:200:user", "ads:150:"]</code> → ${H.c('g', '[450, 300]')}: ads runs alongside user → posts (100 + 200).</p>`,
    brute: { why: `<p>Writing <code>const a = await A(); const b = await B();</code> for independent data creates a server-side waterfall: TTFB grows with the sum instead of the longest chain.</p>`,
      code: `function waterfallOnly(tasks) {
  const sum = tasks.reduce((s, t) => s + Number(t.split(':')[1]), 0);
  return [sum, sum];   // pretends nothing can run in parallel
}` },
    mcq: { q: 'Page needs <code>getUser()</code> and <code>getProducts()</code>, which do not depend on each other. Best pattern?', options: ['await one, then the other', 'Start both, then await Promise.all([...]) (or split into Suspense boundaries)', 'Fetch both in useEffect on the client'], answer: 1, explain: 'Starting independent requests together makes the wait equal to the slowest one, not the sum. Suspense boundaries let each part stream as soon as it is ready.' },
    hints: [
      `<p>Hint 1: the sequential answer is just the sum of durations.</p>`,
      `<p>Hint 2: finish(t) = duration(t) + max(finish(dep)) over its deps (0 if none); memoize it.</p>`,
      `<p>Hint 3: the parallel answer is the max finish time over all tasks; parse <code>"name:ms:"</code> carefully (empty deps).</p>`
    ],
    solution: {
      approach: `<p>Compute earliest finish times with memoized DFS over the dependency DAG (critical path). Sum the durations for the sequential case.</p>`,
      code: { lang: 'js', run: true, code: `function waterfall(tasks) {
  const info = new Map();
  for (const t of tasks) {
    const [name, ms, deps] = t.split(':');
    info.set(name, { ms: Number(ms), deps: deps ? deps.split(',') : [] });
  }
  const memo = new Map();
  function finish(name) {
    if (memo.has(name)) return memo.get(name);
    const { ms, deps } = info.get(name);
    const start = deps.reduce((m, d) => Math.max(m, finish(d)), 0);
    memo.set(name, start + ms);
    return start + ms;
  }
  let sequential = 0, parallel = 0;
  for (const name of info.keys()) {
    sequential += info.get(name).ms;
    parallel = Math.max(parallel, finish(name));
  }
  return [sequential, parallel];
}

console.log(waterfall(['user:100:', 'posts:200:user', 'ads:150:'])); // [ 450, 300 ]` },
      complexity: `<p>O(V + E): each task and dependency edge is visited once thanks to memoization.</p>`
    },
    tests: { sig: 'string[] -> int[]', fn: 'waterfall', cases: [
      [[['user:100:', 'posts:200:user', 'ads:150:']], [450, 300]], [[['a:50:', 'b:50:', 'c:50:']], [150, 50]],
      [[['a:10:', 'b:20:a', 'c:30:b']], [60, 60]], [[['c:30:a,b', 'a:100:', 'b:20:']], [150, 130]],
      [[['x:0:']], [0, 0]], [[['a:40:', 'b:60:', 'c:10:a,b', 'd:5:c']], [115, 75]]
    ] }
  });

  practice.push({
    title: 'Which Image Width Does the Browser Download?',
    level: 'Medium', tags: ['next/image', 'performance', 'lcp'], companies: ['Vercel', 'Pinterest', 'Airbnb'],
    statement: `<p><code>next/image</code> emits a <code>srcset</code> with the configured widths and passes your <code>sizes</code>. Write <code>pickImageWidth(sizes, viewport, dpr, widths)</code>: take the first <code>sizes</code> entry whose media condition matches (<code>(max-width: Npx)</code> means viewport ≤ N, <code>(min-width: Npx)</code> means viewport ≥ N, no condition always matches). Its slot is <code>Kvw</code> (viewport × K / 100) or <code>Kpx</code>. An empty <code>sizes</code> means <code>100vw</code>. Needed = slot × dpr. Return the smallest width ≥ needed, or the largest width if none is big enough.</p>`,
    constraints: `widths are sorted ascending; entries separated by commas.`,
    example: `<p><code>"(max-width: 768px) 100vw, 50vw"</code>, viewport 1440, dpr 2 → slot 720 → need 1440 → ${H.c('g', '1920')}. On a 375 px phone at dpr 2 → need 750 → ${H.c('g', '750')}.</p>`,
    brute: { why: `<p>Always serving the largest width (or omitting <code>sizes</code> on a half-width image) wastes megabytes on mobile and slows LCP.</p>`,
      code: `function pickLargest(sizes, viewport, dpr, widths) {
  return widths[widths.length - 1];   // correct pixels, terrible bytes
}` },
    mcq: { q: 'An image with <code>fill</code> occupies one third of the desktop layout but has no <code>sizes</code>. What happens?', options: ['The browser picks a third-width image automatically', 'The browser assumes 100vw and downloads a much larger file than needed', 'next/image throws'], answer: 1, explain: 'Without sizes the browser must assume the image is as wide as the viewport. Always set sizes for fill and responsive images.' },
    hints: [
      `<p>Hint 1: split <code>sizes</code> on commas and trim; parse each with a regex for an optional condition and a slot.</p>`,
      `<p>Hint 2: evaluate entries in order and stop at the first matching one; compute the slot in CSS pixels.</p>`,
      `<p>Hint 3: multiply by dpr, then scan widths for the first ≥ needed; fall back to the last.</p>`
    ],
    solution: {
      approach: `<p>Mimic the browser's srcset selection: resolve <code>sizes</code> to a slot width, scale by the device pixel ratio, then choose the smallest candidate that covers it.</p>`,
      code: { lang: 'js', run: true, code: `function pickImageWidth(sizes, viewport, dpr, widths) {
  const entries = (sizes.trim() ? sizes : '100vw').split(',').map((s) => s.trim());
  let slot = viewport;
  for (const e of entries) {
    const m = /^(?:\\((max|min)-width:\\s*(\\d+)px\\)\\s*)?(\\d+)(vw|px)$/.exec(e);
    if (!m) continue;
    const [, kind, limit, value, unit] = m;
    const ok = !kind || (kind === 'max' ? viewport <= Number(limit) : viewport >= Number(limit));
    if (!ok) continue;
    slot = unit === 'vw' ? (viewport * Number(value)) / 100 : Number(value);
    break;
  }
  const need = slot * dpr;
  for (const w of widths) if (w >= need) return w;
  return widths[widths.length - 1];
}

const W = [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];
console.log(pickImageWidth('(max-width: 768px) 100vw, 50vw', 375, 2, W));   // 750` },
      complexity: `<p>O(S + W): parse the sizes entries once, then scan the candidate widths.</p>`
    },
    tests: { sig: 'string int int int[] -> int', fn: 'pickImageWidth', cases: [
      [['(max-width: 768px) 100vw, 50vw', 375, 2, [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]], 750],
      [['(max-width: 768px) 100vw, 50vw', 1440, 1, [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]], 750],
      [['(max-width: 768px) 100vw, 50vw', 1440, 2, [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]], 1920],
      [['', 400, 3, [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]], 1200],
      [['200px', 1000, 2, [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]], 640],
      [['(min-width: 1200px) 33vw, (min-width: 768px) 50vw, 100vw', 1000, 1, [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]], 640],
      [['(min-width: 1200px) 33vw, (min-width: 768px) 50vw, 100vw', 1500, 2, [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]], 1080],
      [['100vw', 5000, 1, [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]], 3840]
    ] }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'ISR Stale-While-Revalidate Simulator (dedupe, failures, purge)',
    level: 'Hard', tags: ['next.js', 'isr', 'caching', 'simulation'], companies: ['Vercel', 'Shopify', 'Netflix'],
    statement: `<p>Simulate ISR for pages with <code>revalidate</code> seconds and a regeneration that takes <code>regenMs</code>. <code>isrSim(revalidate, regenMs, events)</code>, events <code>"T OP [PATH]"</code> with non-decreasing T:</p>
      <ul><li>Before handling an event at time T, finish every regeneration with <code>doneAt ≤ T</code>: if it was started while the backend was broken it fails (page unchanged, still stale); otherwise the page gets the next version number and <code>builtAt = doneAt</code>.</li>
      <li><code>GET PATH</code>: no cached page → render on demand: <code>"MISS vN"</code> (next version, <code>builtAt = T</code>), or <code>"500"</code> if the backend is broken (nothing cached). Cached and <code>T - builtAt &lt; revalidate</code> → <code>"HIT vN"</code>. Otherwise <code>"STALE vN"</code>, and start a regeneration (<code>doneAt = T + regenMs</code>) only if none is in flight for that path.</li>
      <li><code>PURGE PATH</code>: delete the cached page and cancel its in-flight regeneration (no output). <code>BREAK</code> / <code>FIX</code>: backend starts / stops failing.</li></ul>
      <p>Version numbers count per path and never reset (v1, v2, …).</p>`,
    constraints: `Up to 10<sup>5</sup> events; revalidate ≥ 1; regenMs ≥ 1.`,
    example: `<p>revalidate 60, regen 5: <code>0 GET</code> MISS v1, <code>30 GET</code> HIT v1, <code>61 GET</code> STALE v1 (regen until 66), <code>62 GET</code> STALE v1 (no second regen), <code>66 GET</code> ${H.c('g', 'HIT v2')}.</p>`,
    brute: { why: `<p>Starting a regeneration on every stale request causes a <b>stampede</b>: 1,000 visitors in the stale window trigger 1,000 rebuilds against the origin. Making visitors wait for regeneration (blocking) removes the speed advantage. Both are what ISR exists to avoid.</p>`,
      code: `function isrBlocking(revalidate, regenMs, events) {
  // regenerates synchronously on every stale request: slow and hammers the backend
  const built = new Map(), out = [];
  for (const e of events) {
    const [t, op, path] = e.split(' ');
    if (op !== 'GET') continue;
    if (!built.has(path) || Number(t) - built.get(path) >= revalidate) { built.set(path, Number(t)); out.push('MISS'); }
    else out.push('HIT');
  }
  return out;
}` },
    mcq: { q: 'An ISR page is stale and 500 users request it in the same second. How many regenerations should start?', options: ['500, one per user', 'One; the others are served the stale page while it regenerates', 'Zero until the next deploy'], answer: 1, explain: 'Background regeneration is deduplicated per path. Everyone gets the stale page instantly; one rebuild runs; later requests see the new version.' },
    hints: [
      `<p>Hint 1: per path keep <code>{ ver, builtAt }</code> for the cached page, an in-flight regeneration <code>{ doneAt, fail }</code>, and a separate version counter that survives purges.</p>`,
      `<p>Hint 2: at the start of every event, settle finished regenerations (<code>doneAt ≤ T</code>) first, so a GET exactly at <code>doneAt</code> sees the new version.</p>`,
      `<p>Hint 3: a failed regeneration does not touch <code>builtAt</code>, so the next request is still stale and may start another one. Purge deletes both the page and the in-flight regeneration.</p>`
    ],
    solution: {
      approach: `<p>Event-driven simulation. Settle due regenerations, then apply the event. Freshness is <code>T - builtAt &lt; revalidate</code>. Stale requests are served immediately and start at most one regeneration per path; its success or failure is decided by the backend state when it started.</p>`,
      code: { lang: 'js', run: true, code: `function isrSim(revalidate, regenMs, events) {
  const page = new Map();     // path -> { ver, builtAt }
  const regen = new Map();    // path -> { doneAt, fail }
  const counter = new Map();  // path -> last version number used
  const nextVer = (p) => { const v = (counter.get(p) || 0) + 1; counter.set(p, v); return v; };
  let broken = false;
  const out = [];
  for (const ev of events) {
    const [t0, op, path] = ev.split(' ');
    const t = Number(t0);
    for (const [p, r] of [...regen]) {            // 1. finish due regenerations
      if (r.doneAt > t) continue;
      regen.delete(p);
      if (!r.fail) page.set(p, { ver: nextVer(p), builtAt: r.doneAt });
    }
    if (op === 'BREAK') { broken = true; continue; }
    if (op === 'FIX') { broken = false; continue; }
    if (op === 'PURGE') { page.delete(path); regen.delete(path); continue; }
    const cur = page.get(path);                    // 2. GET
    if (!cur) {
      if (broken) { out.push('500'); continue; }
      const v = nextVer(path);
      page.set(path, { ver: v, builtAt: t });
      out.push('MISS v' + v);
    } else if (t - cur.builtAt < revalidate) {
      out.push('HIT v' + cur.ver);
    } else {
      out.push('STALE v' + cur.ver);
      if (!regen.has(path)) regen.set(path, { doneAt: t + regenMs, fail: broken });
    }
  }
  return out;
}

console.log(isrSim(60, 5, ['0 GET /p', '30 GET /p', '61 GET /p', '62 GET /p', '66 GET /p', '70 GET /p']));` },
      complexity: `<p>O(E · R) with R in-flight regenerations; a min-heap by <code>doneAt</code> makes settling O(log R).</p>`,
      followUps: ['How would you add tag-based revalidation that marks many paths stale at once?', 'What changes when several server instances each have their own cache?']
    },
    tests: { sig: 'int int string[] -> string[]', fn: 'isrSim', cases: [
      [[60, 5, ['0 GET /p', '30 GET /p', '61 GET /p', '62 GET /p', '66 GET /p', '70 GET /p']], ['MISS v1', 'HIT v1', 'STALE v1', 'STALE v1', 'HIT v2', 'HIT v2']],
      [[60, 5, ['0 GET /p', '50 BREAK', '70 GET /p', '80 GET /p', '81 FIX', '90 GET /p', '96 GET /p']], ['MISS v1', 'STALE v1', 'STALE v1', 'STALE v1', 'HIT v2']],
      [[60, 5, ['0 GET /p', '10 PURGE /p', '11 GET /p', '12 GET /p']], ['MISS v1', 'MISS v2', 'HIT v2']],
      [[60, 5, ['0 GET /a', '1 GET /b', '60 GET /b', '61 GET /a']], ['MISS v1', 'MISS v1', 'HIT v1', 'STALE v1']],
      [[60, 5, ['0 BREAK', '1 GET /x', '2 FIX', '3 GET /x']], ['500', 'MISS v1']],
      [[60, 5, ['0 GET /p', '60 GET /p', '62 PURGE /p', '63 GET /p', '70 GET /p']], ['MISS v1', 'STALE v1', 'MISS v2', 'HIT v2']]
    ] }
  });

  practice.push({
    title: 'Partial Prerendering: Find the Static Shell and the Holes',
    level: 'Hard', tags: ['next.js', 'ppr', 'suspense', 'cache components'], companies: ['Vercel', 'Shopify'],
    statement: `<p>With Partial Prerendering (Next 16 <code>cacheComponents</code>), request-time components must sit inside a <code>&lt;Suspense&gt;</code> boundary; each such boundary becomes a <b>hole</b> streamed at request time and everything else is the static shell. Nodes are <code>"ID PARENT KIND"</code> (parent <code>-</code> for the root; parents are listed before children) with KIND <code>static</code>, <code>cached</code> (<code>'use cache'</code>, counts as static), <code>dynamic</code> (reads cookies/headers/uncached data) or <code>suspense</code>.</p>
      <p>Write <code>pprShell(nodes)</code>. If some dynamic node has no suspense ancestor, return <code>["error: ID outside Suspense", …]</code> for every such node in input order. Otherwise return, for each suspense node in input order that is the <b>nearest</b> boundary of at least one dynamic node, <code>"hole SID: d1,d2"</code> (dynamic ids in input order). If there are no holes return <code>["fully static"]</code>.</p>`,
    constraints: `Up to 10<sup>5</sup> nodes; ids unique; a suspense node can itself be the root.`,
    example: `<p><code>["page - static", "header page static", "s1 page suspense", "cart s1 dynamic", "footer page static"]</code> → ${H.c('g', '["hole s1: cart"]')}. Header and footer are in the prebuilt shell; the cart streams in.</p>`,
    brute: { why: `<p>Marking the whole route dynamic as soon as one component is dynamic (the pre-PPR behaviour) loses the instant static shell. Walking up from every dynamic node to the root without memoization is O(N·depth), which is fine for small trees but quadratic for deep ones.</p>`,
      code: `function pprAllOrNothing(nodes) {
  return nodes.some((n) => n.endsWith(' dynamic')) ? ['whole route dynamic'] : ['fully static'];
}` },
    mcq: { q: 'With Cache Components on, a page awaits <code>cookies()</code> at its top level with no Suspense boundary. What happens?', options: ['The page silently becomes fully dynamic', 'Next.js reports an error: request data was accessed outside a Suspense boundary', 'cookies() returns an empty object'], answer: 1, explain: 'Under the Cache Components model, every request-time read must either be cached or wrapped in Suspense so the rest of the page can be prerendered. Otherwise the build (and dev overlay) report an error.' },
    hints: [
      `<p>Hint 1: build a parent map and a kind map; for each node compute its nearest suspense ancestor (or none). Because parents come first, you can compute it in one forward pass.</p>`,
      `<p>Hint 2: nearest(child) = parent if the parent is suspense, otherwise nearest(parent).</p>`,
      `<p>Hint 3: collect errors first; if none, group dynamic ids by their nearest boundary and print boundaries in input order.</p>`
    ],
    solution: {
      approach: `<p>One pass computes each node's nearest Suspense ancestor from its parent's. Dynamic nodes without one are errors. Otherwise group dynamic nodes by boundary; each non-empty group is a hole, everything else belongs to the static shell.</p>`,
      code: { lang: 'js', run: true, code: `function pprShell(nodes) {
  const kind = new Map(), nearest = new Map(), order = [];
  for (const line of nodes) {
    const [id, parent, k] = line.split(' ');
    kind.set(id, k);
    order.push(id);
    // nearest Suspense ABOVE this node (a boundary does not contain itself)
    if (parent === '-') nearest.set(id, null);
    else nearest.set(id, kind.get(parent) === 'suspense' ? parent : nearest.get(parent));
  }
  const errors = [], holes = new Map();
  for (const id of order) {
    if (kind.get(id) !== 'dynamic') continue;
    const b = nearest.get(id);
    if (!b) { errors.push('error: ' + id + ' outside Suspense'); continue; }
    if (!holes.has(b)) holes.set(b, []);
    holes.get(b).push(id);
  }
  if (errors.length) return errors;
  const out = order.filter((id) => holes.has(id)).map((id) => 'hole ' + id + ': ' + holes.get(id).join(','));
  return out.length ? out : ['fully static'];
}

console.log(pprShell(['page - static', 'header page static', 's1 page suspense', 'cart s1 dynamic', 'footer page static']));` },
      complexity: `<p>O(N) time and space.</p>`,
      followUps: ['Where should the Suspense boundary go to keep the largest possible shell?', 'How do cached components inside a hole behave?']
    },
    tests: { sig: 'string[] -> string[]', fn: 'pprShell', cases: [
      [[['page - static', 'header page static', 's1 page suspense', 'cart s1 dynamic', 'footer page static']], ['hole s1: cart']],
      [[['page - static', 'user page dynamic']], ['error: user outside Suspense']],
      [[['page - static', 'nav page cached', 's1 page suspense', 'feed s1 static']], ['fully static']],
      [[['page - static', 's1 page suspense', 'a s1 dynamic', 's2 a suspense', 'b s2 dynamic', 'c s1 static', 'd c dynamic']], ['hole s1: a,d', 'hole s2: b']],
      [[['root - suspense', 'x root dynamic']], ['hole root: x']],
      [[['page - static', 's page suspense', 'a page dynamic', 'b s dynamic']], ['error: a outside Suspense']]
    ] }
  });

  practice.push({
    title: 'revalidatePath Scope: Which Cached URLs Are Invalidated?',
    level: 'Hard', tags: ['next.js', 'caching', 'revalidatePath'], companies: ['Vercel', 'Stripe'],
    statement: `<p>The cache holds rendered URLs, each written <code>"url|pattern"</code> (pattern is the app route, possibly with groups and dynamic segments). Write <code>revalidateScope(cached, path, type)</code> returning invalidated URLs in input order:</p>
      <ul><li><code>type = ""</code>: <code>path</code> is a concrete URL; invalidate the entry whose url equals it (ignore a trailing slash).</li>
      <li><code>type = "page"</code>: <code>path</code> is a route pattern; invalidate entries whose pattern equals it.</li>
      <li><code>type = "layout"</code>: invalidate entries whose pattern equals <code>path</code> or is below it (<code>pattern</code> starts with <code>path + "/"</code>); <code>"/"</code> with layout means everything.</li></ul>`,
    constraints: `Up to 10<sup>5</sup> cached entries.`,
    example: `<p><code>revalidateScope(C, "/blog", "layout")</code> → ${H.c('g', '/blog, /blog/a, /blog/b')} but not <code>/blogroll</code>: a prefix must end at a segment boundary.</p>`,
    brute: { why: `<p>Using <code>url.startsWith(path)</code> on URLs is the classic bug: <code>/blog</code> also hits <code>/blogroll</code>, dynamic patterns (<code>/blog/[slug]</code>) never match a URL, and route groups (<code>/(shop)</code>) do not appear in URLs at all.</p>`,
      code: `function revalidateNaive(cached, path) {
  return cached.map((c) => c.split('|')[0]).filter((u) => u.startsWith(path));
}` },
    mcq: { q: 'After editing one post you call <code>revalidatePath(\'/blog/[slug]\', \'page\')</code>. What is invalidated?', options: ['Only that one post', 'Every cached page rendered by the /blog/[slug] route', 'The whole site'], answer: 1, explain: 'With a dynamic pattern and type page, every URL produced by that route is invalidated. Use the concrete URL (or a tag) to invalidate only one post.' },
    hints: [
      `<p>Hint 1: split each entry into url and pattern once.</p>`,
      `<p>Hint 2: normalise trailing slashes (except for <code>/</code>) before comparing concrete URLs.</p>`,
      `<p>Hint 3: for layout, compare patterns with <code>p === path || p.startsWith(path + '/')</code>, and special-case <code>/</code>.</p>`
    ],
    solution: {
      approach: `<p>Choose the comparison by type: exact URL, exact pattern, or pattern subtree with a segment boundary. Filter the cached entries in order.</p>`,
      code: { lang: 'js', run: true, code: `function revalidateScope(cached, path, type) {
  const norm = (u) => (u.length > 1 && u.endsWith('/') ? u.slice(0, -1) : u);
  const target = norm(path);
  const hit = ({ url, pattern }) => {
    if (type === 'page') return pattern === target;
    if (type === 'layout') return target === '/' || pattern === target || pattern.startsWith(target + '/');
    return norm(url) === target;
  };
  return cached
    .map((c) => { const [url, pattern] = c.split('|'); return { url, pattern }; })
    .filter(hit)
    .map((e) => e.url);
}

const C = ['/|/', '/blog|/blog', '/blog/a|/blog/[slug]', '/blog/b|/blog/[slug]', '/blogroll|/blogroll', '/cart|/(shop)/cart', '/cart/x|/(shop)/cart/[id]'];
console.log(revalidateScope(C, '/blog', 'layout'));   // [ '/blog', '/blog/a', '/blog/b' ]` },
      complexity: `<p>O(N · L) for N cached entries with strings of length L.</p>`,
      followUps: ['Why do tags often scale better than paths for invalidation?', 'Which caches does revalidatePath clear besides the server Full Route Cache?']
    },
    tests: { sig: 'string[] string string -> string[]', fn: 'revalidateScope', cases: [
      [[['/|/', '/blog|/blog', '/blog/a|/blog/[slug]', '/blog/b|/blog/[slug]', '/blogroll|/blogroll', '/cart|/(shop)/cart', '/cart/x|/(shop)/cart/[id]'], '/blog/a', ''], ['/blog/a']],
      [[['/|/', '/blog|/blog', '/blog/a|/blog/[slug]', '/blog/b|/blog/[slug]', '/blogroll|/blogroll', '/cart|/(shop)/cart', '/cart/x|/(shop)/cart/[id]'], '/blog/[slug]', 'page'], ['/blog/a', '/blog/b']],
      [[['/|/', '/blog|/blog', '/blog/a|/blog/[slug]', '/blog/b|/blog/[slug]', '/blogroll|/blogroll', '/cart|/(shop)/cart', '/cart/x|/(shop)/cart/[id]'], '/blog', 'layout'], ['/blog', '/blog/a', '/blog/b']],
      [[['/|/', '/blog|/blog', '/blog/a|/blog/[slug]', '/blog/b|/blog/[slug]', '/blogroll|/blogroll', '/cart|/(shop)/cart', '/cart/x|/(shop)/cart/[id]'], '/', 'layout'], ['/', '/blog', '/blog/a', '/blog/b', '/blogroll', '/cart', '/cart/x']],
      [[['/|/', '/blog|/blog', '/blog/a|/blog/[slug]', '/blog/b|/blog/[slug]', '/blogroll|/blogroll', '/cart|/(shop)/cart', '/cart/x|/(shop)/cart/[id]'], '/(shop)', 'layout'], ['/cart', '/cart/x']],
      [[['/|/', '/blog|/blog', '/blog/a|/blog/[slug]', '/blog/b|/blog/[slug]', '/blogroll|/blogroll', '/cart|/(shop)/cart', '/cart/x|/(shop)/cart/[id]'], '/blog', 'page'], ['/blog']],
      [[['/|/', '/blog|/blog'], '/nope', ''], []],
      [[['/|/', '/blog|/blog', '/blog/a|/blog/[slug]'], '/blog/a/', ''], ['/blog/a']]
    ] }
  });

  practice.push({
    title: 'Proxy Decisions: Skip, Locale Redirect, Auth Gate, Rewrite',
    level: 'Hard', tags: ['next.js', 'middleware', 'proxy', 'i18n', 'auth'], companies: ['Vercel', 'Booking.com', 'Atlassian'],
    statement: `<p>Write <code>proxyDecide(reqs)</code>. Each request is <code>"path|cookie|acceptLanguage"</code> (cookie is <code>session</code> or <code>-</code>; acceptLanguage like <code>fr-FR,en;q=0.8</code> or <code>-</code>). Supported locales: <code>en fr de</code>. Apply in order:</p>
      <ol><li>Path starts with <code>/_next/</code> or <code>/api/</code>, or its last segment contains a <code>.</code> → <code>"skip"</code>.</li>
      <li>First segment is not a locale → <code>"redirect /L" + path</code> (for <code>/</code> just <code>/L</code>), where L is the first language in acceptLanguage (part before <code>;</code> and <code>-</code>, lower-cased) that is supported, else <code>en</code>.</li>
      <li>With locale L and the rest R of the path: if R is <code>/dashboard</code> or starts with <code>/dashboard/</code> and there is no session → <code>"redirect /L/login?next=" + encodeURIComponent(path)</code>.</li>
      <li>If R is <code>/old-blog</code> or starts with <code>/old-blog/</code> → <code>"rewrite /L/blog" + R.slice(9)</code>.</li>
      <li>Otherwise <code>"next"</code>.</li></ol>`,
    constraints: `Up to 10<sup>4</sup> requests.`,
    example: `<p><code>"/pricing|-|es-ES,de;q=0.9"</code> → ${H.c('y', '"redirect /de/pricing"')} (Spanish unsupported, German next). <code>"/en/dashboard/billing|-|-"</code> → ${H.c('r', '"redirect /en/login?next=%2Fen%2Fdashboard%2Fbilling"')}. <code>"/de/dashboards|-|-"</code> → ${H.c('g', '"next"')}.</p>`,
    brute: { why: `<p>Running every rule on every request (no skip step) slows asset delivery, and using <code>startsWith('/dashboard')</code> without a segment boundary locks users out of <code>/dashboards</code>. Order matters too: the locale must be fixed before auth so the login redirect keeps the language.</p>`,
      code: `function proxyNaive(reqs) {
  return reqs.map((r) => {
    const [path, cookie] = r.split('|');
    if (path.includes('/dashboard') && cookie !== 'session') return 'redirect /login';
    return 'next';
  });
}` },
    mcq: { q: 'Why should middleware/proxy only do an optimistic session check (cookie present) rather than full authorization?', options: ['Cookies cannot be read there', 'It runs on every matched request and may be bypassed or mis-matched; real authorization belongs next to the data (pages, actions, DAL)', 'Next.js forbids redirects there'], answer: 1, explain: 'Middleware is a fast first filter on the hot path. Keep it cheap, and re-check permissions where data is read or mutated (as the 2025 middleware-bypass CVE showed).' },
    hints: [
      `<p>Hint 1: write small helpers: <code>isAsset(path)</code>, <code>pickLocale(acceptLanguage)</code>, <code>underSegment(rest, base)</code>.</p>`,
      `<p>Hint 2: split the path on <code>/</code>; the first non-empty part decides whether there is a locale; R is the path after <code>"/" + L</code> (may be <code>""</code>).</p>`,
      `<p>Hint 3: <code>underSegment</code> is <code>rest === base || rest.startsWith(base + '/')</code>; use <code>encodeURIComponent</code> for the next parameter.</p>`
    ],
    solution: {
      approach: `<p>Implement the proxy as an ordered pipeline of small pure checks, exactly like a real <code>proxy.ts</code>: cheap exclusions first, then locale normalisation, then the optimistic auth gate, then rewrites, else pass through.</p>`,
      code: { lang: 'js', run: true, code: `const LOCALES = ['en', 'fr', 'de'];

function pickLocale(accept) {
  if (accept === '-') return 'en';
  for (const part of accept.split(',')) {
    const lang = part.split(';')[0].split('-')[0].trim().toLowerCase();
    if (LOCALES.includes(lang)) return lang;
  }
  return 'en';
}

const under = (rest, base) => rest === base || rest.startsWith(base + '/');

function decide(req) {
  const [path, cookie, accept] = req.split('|');
  const last = path.split('/').pop();
  if (path.startsWith('/_next/') || path.startsWith('/api/') || last.includes('.')) return 'skip';
  const first = path.split('/')[1];
  if (!LOCALES.includes(first)) {
    const L = pickLocale(accept);
    return 'redirect /' + L + (path === '/' ? '' : path);
  }
  const rest = path.slice(first.length + 1);           // "" or "/..."
  if (under(rest, '/dashboard') && cookie !== 'session') {
    return 'redirect /' + first + '/login?next=' + encodeURIComponent(path);
  }
  if (under(rest, '/old-blog')) return 'rewrite /' + first + '/blog' + rest.slice(9);
  return 'next';
}

function proxyDecide(reqs) {
  return reqs.map(decide);
}

console.log(proxyDecide(['/pricing|-|es-ES,de;q=0.9', '/en/dashboard/billing|-|-', '/fr/old-blog/hello|-|-']));` },
      complexity: `<p>O(total length of all requests); each rule is a constant number of string checks.</p>`,
      followUps: ['How would you avoid redirecting search-engine bots based on Accept-Language?', 'How would you pass the detected locale to Server Components without making pages dynamic?']
    },
    tests: { sig: 'string[] -> string[]', fn: 'proxyDecide', cases: [
      [[['/_next/static/a.js|-|-', '/api/users|-|-', '/favicon.ico|-|-']], ['skip', 'skip', 'skip']],
      [[['/|-|fr-FR,en;q=0.8']], ['redirect /fr']],
      [[['/pricing|-|es-ES,de;q=0.9', '/pricing|-|-']], ['redirect /de/pricing', 'redirect /en/pricing']],
      [[['/en/dashboard/billing|-|-']], ['redirect /en/login?next=%2Fen%2Fdashboard%2Fbilling']],
      [[['/en/dashboard|session|-', '/de/dashboards|-|-', '/en|-|-']], ['next', 'next', 'next']],
      [[['/fr/old-blog/hello|-|-', '/de/old-blog|-|-']], ['rewrite /fr/blog/hello', 'rewrite /de/blog']],
      [[[]], []]
    ] }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'Both <code>app/blog/new/page.js</code> and <code>app/blog/[slug]/page.js</code> exist. Which renders <code>/blog/new</code>?', options: ['<code>blog/new</code>, because static segments are more specific than dynamic ones', '<code>blog/[slug]</code> with slug = "new"', 'It is a build error'], answer: 0, explain: 'Routes are sorted by specificity per segment: static, then dynamic, then catch-all, then optional catch-all.' });
  quiz.push({ q: 'You need one page for <code>/docs</code>, <code>/docs/a</code> and <code>/docs/a/b</code>. Which folder?', options: ['<code>docs/[slug]</code>', '<code>docs/[...slug]</code>', '<code>docs/[[...slug]]</code>'], answer: 2, explain: 'Only the optional catch-all also matches zero extra segments; a plain catch-all 404s on /docs.' });
  quiz.push({ q: 'What does a folder named <code>(marketing)</code> do?', options: ['Adds /marketing to the URL', 'Groups routes (for example to share a layout) without adding a URL segment', 'Makes the routes private'], answer: 1, explain: 'Route groups organise files and layouts; they are removed from the URL. A leading underscore makes a folder private.' });
  quiz.push({ q: '<code>app/shop/layout.js</code> throws an error. Which file can render the fallback?', options: ['<code>app/shop/error.js</code>', 'The error boundary of a parent segment, such as <code>app/error.js</code> (or global-error.js for the root layout)', '<code>app/shop/loading.js</code>'], answer: 1, explain: 'error.js is nested inside the layout of the same segment, so it only catches errors from that segment\'s children.' });
  quiz.push({ q: 'What is the difference between <code>layout.js</code> and <code>template.js</code>?', options: ['Templates are server-only, layouts are client-only', 'A layout keeps its state across navigations; a template is remounted on every navigation', 'There is no difference'], answer: 1, explain: 'Templates get a new key per navigation, so their state resets and effects run again. Layouts persist.' });
  quiz.push({ q: 'A component file has no directive but is imported by a module that starts with <code>\'use client\'</code>. What is it?', options: ['A Server Component', 'A Client Component (the directive spreads through imports)', 'An error'], answer: 1, explain: "'use client' marks the entry point of the client graph; everything it imports is bundled for the client." });
  quiz.push({ q: 'Which prop can a Server Component pass to a Client Component?', options: ['An inline arrow function', 'A Date, a Map or a Promise', 'An instance of a custom class'], answer: 1, explain: 'React 19 serializes Dates, Maps, Sets, BigInts, typed arrays and Promises. Functions (except Server Actions) and class instances are not serializable.' });
  quiz.push({ q: 'In Next.js 15, what is the default caching behaviour of <code>fetch(url)</code> with no options in a Server Component?', options: ['Cached forever in the Data Cache (force-cache)', 'Not stored in the Data Cache; opt in with cache: \'force-cache\' or next.revalidate', 'Cached for 60 seconds'], answer: 1, explain: 'Next 15 flipped the default from cached (Next 13/14) to not cached. The route can still be prerendered statically if nothing else is dynamic.' });
  quiz.push({ q: 'A fetch uses <code>{ next: { revalidate: 60 } }</code>. The cached copy is 90 seconds old. The next request…', options: ['blocks until fresh data arrives', 'gets the stale copy immediately and triggers a background refresh', 'throws an error'], answer: 1, explain: 'Time-based revalidation is stale-while-revalidate. Use tag or path revalidation (or updateTag in Next 16) when users must see fresh data right away.' });
  quiz.push({ q: 'Which Next 16 API lets a Server Action expire a tag so the same user immediately reads their own write?', options: ['<code>revalidateTag(tag, \'max\')</code>', '<code>updateTag(tag)</code>', '<code>refresh()</code>'], answer: 1, explain: 'updateTag expires the cache entries immediately (read-your-writes) and is only callable from Server Actions. revalidateTag with a profile marks entries stale (SWR); refresh only re-renders the client router.' });
  quiz.push({ q: 'Which of these makes a route dynamic in Next 15?', options: ['Calling <code>cookies()</code> in the page', 'Using <code>generateStaticParams</code>', 'A fetch with <code>cache: \'force-cache\'</code>'], answer: 0, explain: 'cookies(), headers(), connection(), searchParams and no-store fetches need request information, so the route renders per request.' });
  quiz.push({ q: 'What does Partial Prerendering serve first?', options: ['Nothing until all data is ready', 'A static shell prerendered at build time, with Suspense holes that stream in at request time', 'Only the client JavaScript'], answer: 1, explain: 'PPR combines a cached static shell with dynamic holes at Suspense boundaries, streamed in the same response.' });
  quiz.push({ q: 'Which hook gives you the pending state of the surrounding <code>&lt;form&gt;</code> so you can disable its submit button?', options: ['<code>useOptimistic</code>', '<code>useFormStatus</code>', '<code>useTransition</code> in the page'], answer: 1, explain: 'useFormStatus (react-dom) reads the status of the parent form; it must be used in a component rendered inside that form.' });
  quiz.push({ q: 'Why must every Server Action check authorization itself?', options: ['Because actions run on the client', 'Because each action is reachable as a public POST endpoint, even if the UI hides the button', 'Because Next.js disables cookies in actions'], answer: 1, explain: 'Hiding UI is not security. Anyone can invoke the action with crafted requests; authenticate, authorize and validate inside it.' });
  quiz.push({ q: 'Does the middleware matcher <code>/((?!api|_next/static).*)</code> run for <code>/apiary</code>?', options: ['Yes', 'No, the negative lookahead rejects any path whose text right after the first slash starts with "api"', 'Only in development'], answer: 1, explain: 'Lookaheads test a prefix, not a segment. Use api/ or api(?:/|$) to exclude only the /api segment.' });
  quiz.push({ q: 'In Next.js 16, what replaced <code>middleware.ts</code>?', options: ['<code>edge.ts</code>', '<code>proxy.ts</code> exporting a <code>proxy</code> function (Node.js runtime)', 'Route handlers only'], answer: 1, explain: 'Next 16 renamed middleware to proxy to clarify its role; middleware.ts still works but is deprecated.' });
  quiz.push({ q: 'A root layout sets <code>openGraph.images</code>; a page sets only <code>openGraph.title</code>. What image do shared links show?', options: ['The root image', 'No image: openGraph is shallow-merged, so the page object replaces the parent one', 'Both images'], answer: 1, explain: 'Metadata merging is shallow by top-level key. Repeat images in the child, use an opengraph-image file, or spread a shared object.' });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({ q: 'Explain how the App Router maps folders to URLs. What are dynamic, catch-all, optional catch-all segments and route groups?', level: 'I',
    a: `<p>Each folder under <code>app/</code> is a URL segment, and a folder becomes reachable when it contains <code>page.js</code> (UI) or <code>route.js</code> (HTTP handler). <code>[id]</code> captures exactly one segment, <code>[...slug]</code> one or more (as an array), <code>[[...slug]]</code> zero or more, so it also serves the parent path. <code>(group)</code> folders organise routes and let groups have their own layouts without changing URLs; <code>_private</code> folders are never routable; <code>@slot</code> folders are parallel routes passed as props to the layout; <code>(.)x</code>-style folders intercept routes for modals. When several patterns match, the most specific wins, segment by segment: static, dynamic, catch-all, optional catch-all. Since Next 15, <code>params</code> and <code>searchParams</code> are Promises you <code>await</code>; Next 16 removed synchronous access.</p>`,
    followUps: ['How would you build an Instagram-style photo modal with a shareable URL?', 'What does dynamicParams = false change?', 'When would two route groups conflict?'] });
  interview.push({ q: 'How do nested layouts, templates, loading.js and error.js compose? Where does an error in a layout end up?', level: 'I',
    a: `<p>For each segment Next.js builds <b>Layout → Template → ErrorBoundary (error.js) → Suspense (loading.js) → NotFoundBoundary → child segment or page</b>, nesting segments from the root down. Layouts persist across navigations between their children (state and scroll are kept, and they are not re-rendered: partial rendering), templates remount on every navigation. Because error.js sits inside the layout of the same folder, it cannot catch that layout's errors; they go to the parent segment's boundary, and root-layout errors need <code>global-error.js</code>. loading.js is a Suspense fallback streamed immediately. A practical consequence: auth checks in a layout do not re-run on client navigation, so put them in pages, the data layer or proxy.</p>`,
    followUps: ['What does reset() do in error.js and when is it not enough?', 'Why is notFound() inside a Suspense boundary not a real 404?', 'When would you use template.js?'] });
  interview.push({ q: 'Where do you draw the server/client boundary in a Next.js app, and what can cross it?', level: 'A',
    a: `<p>Keep components as Server Components by default and put <code>'use client'</code> on the smallest leaves that need state, effects, event handlers or browser APIs. The directive marks an entry point: that module and everything it imports go to the client bundle, so a misplaced directive on a layout turns the whole subtree into client code. Props crossing server → client must be serializable by React: primitives, plain objects and arrays, Date, Map, Set, BigInt, typed arrays, FormData, Promises (read with <code>use</code>), JSX, and Server Actions; not functions, class instances or local symbols. Client components can render server content passed as <code>children</code> (the donut pattern) but cannot import server components. Protect server modules with <code>import 'server-only'</code>, and pass minimal DTOs because everything you pass is visible in the payload.</p>`,
    followUps: ['How do you use a context provider without making the app client-side?', 'What is the taint API for?', 'How do you wrap a third-party component that uses hooks but has no directive?'] });
  interview.push({ q: 'Describe the caching layers in the Next.js App Router.', level: 'A',
    a: `<p>There are four. <b>Request Memoization</b>: identical GET fetches (and functions wrapped in React <code>cache()</code>) are deduped during one server render, so layout, page and generateMetadata can all ask for the same data. <b>Data Cache</b>: persistent server cache for fetch results (or <code>'use cache'</code> functions in Next 16), controlled by <code>cache</code>, <code>next.revalidate</code> and <code>next.tags</code>, invalidated by time or by <code>revalidateTag</code>/<code>revalidatePath</code>/<code>updateTag</code>. <b>Full Route Cache</b>: the HTML and RSC payload of static routes, produced at build or by ISR. <b>Router Cache</b>: the client-side in-memory cache of RSC payloads for visited and prefetched segments, governed by <code>staleTimes</code> and cleared by <code>router.refresh()</code> or Server Actions that revalidate. Debug with <code>logging.fetches</code>, the build route table and response headers like <code>x-nextjs-cache</code>.</p>`,
    followUps: ['Which layer causes "I changed the DB but the page is old" in each scenario?', 'How do you share these caches across multiple self-hosted instances?', 'How does a Server Action invalidate the Router Cache?'] });
  interview.push({ q: 'What changed about caching defaults in Next.js 15 and 16, and how would you migrate a Next 14 app?', level: 'A',
    a: `<p>Next 15 made caching opt-in: <code>fetch</code> is no longer cached by default (it was <code>force-cache</code> in 13/14), GET route handlers are no longer cached, and the client Router Cache uses a stale time of 0 for page segments of dynamic routes (it was 30 s). It also made <code>params</code>, <code>searchParams</code>, <code>cookies()</code>, <code>headers()</code> and <code>draftMode()</code> async. Next 16 introduced <b>Cache Components</b> (<code>cacheComponents: true</code>): the <code>'use cache'</code> directive with <code>cacheLife</code> profiles and <code>cacheTag</code>, PPR as the rendering model, <code>updateTag</code> for read-your-writes in actions, <code>refresh()</code>, and <code>revalidateTag(tag, profile)</code> requiring a profile. Migration: run the codemods, add explicit <code>force-cache</code>/<code>revalidate</code>/tags where you relied on implicit caching, check the build table for routes that became dynamic, measure origin traffic, and adopt <code>'use cache'</code> incrementally.</p>`,
    followUps: ['How would you detect accidental extra requests to your CMS after the upgrade?', 'Why did Vercel change the defaults?', 'What is a cacheLife profile?'] });
  interview.push({ q: 'How does Next.js decide whether a route is static or dynamic? How do you keep a mostly-static page fast when one widget is personalised?', level: 'A',
    a: `<p>At build time Next.js tries to prerender every route. If rendering touches request-time information (<code>cookies()</code>, <code>headers()</code>, <code>connection()</code>, <code>searchParams</code>, a <code>no-store</code> or <code>revalidate: 0</code> fetch), the route is marked dynamic (ƒ in the build output); otherwise it is static (○), optionally with a revalidate interval (ISR, shortest wins). Segment config (<code>dynamic = 'force-static' | 'force-dynamic' | 'error'</code>, <code>revalidate</code>) overrides inference. For one personalised widget, do not make the whole page dynamic: wrap the widget in <code>&lt;Suspense&gt;</code> so the rest streams first, or use Partial Prerendering / Cache Components so the static shell comes from the CDN and only the hole renders per request. Alternatives: fetch the widget on the client, or vary by rewriting in proxy to prerendered variants.</p>`,
    followUps: ['What are the SEO trade-offs of client-fetching the widget?', 'Why can try/catch around cookies() break detection?', 'How does generateStaticParams interact with ISR?'] });
  interview.push({ q: 'Explain ISR in the App Router, including on-demand revalidation and what happens under load and failure.', level: 'A',
    a: `<p>ISR serves a prerendered page from cache and regenerates it in the background. With <code>revalidate = 60</code>, requests within 60 s of the last build are hits; the first request after that gets the stale page immediately and triggers one regeneration (deduplicated per path, so traffic spikes do not cause a stampede); later requests get the new version. On-demand revalidation (<code>revalidatePath</code>, <code>revalidateTag</code>, and in Next 16 <code>updateTag</code>/<code>revalidateTag(tag, profile)</code>) invalidates entries when data changes, usually from a webhook or Server Action. If regeneration throws, Next.js keeps serving the last good version and retries on a later request, which makes ISR resilient to a flaky CMS. In multi-instance self-hosting you need a shared cache handler so all instances see the same version.</p>`,
    followUps: ['How do you prerender only the top pages and build the rest lazily?', 'How do you avoid personal data leaking into an ISR page?', 'What does dynamicParams = false do?'] });
  interview.push({ q: 'How does streaming with Suspense work in Next.js, and how does it affect TTFB, LCP and status codes?', level: 'A',
    a: `<p>React renders the tree on the server and, when it hits a Suspense boundary whose children are still waiting for data, emits the fallback and continues. The first chunk (layout, fast content, fallbacks) is flushed quickly, improving TTFB and often LCP. Each boundary's HTML streams later in the same response with a small inline script that swaps it in, plus its RSC payload; selective hydration lets React hydrate whichever part is ready or interacted with first. <code>loading.js</code> is a segment-level Suspense boundary. Because headers and the status code go out with the first byte, <code>notFound()</code> or <code>redirect()</code> inside a streamed boundary cannot change the status (a meta tag is used instead), so do existence checks before streaming starts. Proxies that buffer responses cancel the benefit.</p>`,
    followUps: ['Where would you place boundaries on a dashboard?', 'How does PPR change what the first chunk is?', 'What is a server-side waterfall and how do Suspense boundaries help?'] });
  interview.push({ q: 'Walk me through building a form with Server Actions: validation, pending state, optimistic UI and revalidation. What are the security pitfalls?', level: 'A',
    a: `<p>Define an action in a <code>'use server'</code> file: authenticate, authorize for the specific resource, validate <code>FormData</code> with a schema, mutate, then <code>revalidatePath</code>/<code>revalidateTag</code> (or <code>updateTag</code> in Next 16) and optionally <code>redirect</code>. In the client form use <code>useActionState(action, initialState)</code> so expected errors are returned as state and rendered next to fields, <code>useFormStatus</code> in the submit button for pending UI, and <code>useOptimistic</code> to show the new item immediately. The form works before hydration (progressive enhancement). Pitfalls: treating actions as private (they are public POST endpoints), trusting hidden fields like userId, no input validation, catching the special error thrown by <code>redirect()</code>, returning whole database rows, using actions for reads, and multi-instance deployments without a shared <code>NEXT_SERVER_ACTIONS_ENCRYPTION_KEY</code>.</p>`,
    followUps: ['How does Next.js protect actions against CSRF?', 'Why are actions executed sequentially per client?', 'When would you still use a route handler?'] });
  interview.push({ q: 'What is middleware (proxy in Next 16) good for, what are its limits, and how do you write its matcher?', level: 'I',
    a: `<p>It runs before routing for every matched request, even for cached static pages, and can redirect, rewrite, set headers/cookies or respond directly. Good uses: locale detection, optimistic auth redirects (cookie present?), A/B bucketing, multi-tenant rewrites, security headers and CSP nonces. Limits: it is on the hot path of every request, it historically ran only on the edge runtime (Web APIs, no fs or native modules; Node.js runtime became stable in 15.5 and Next 16's <code>proxy.ts</code> is Node-only), it cannot pass objects to pages (only headers/cookies), and it must not be the only security layer (the 2025 header-bypass CVE proved it). Matchers use path-to-regexp: <code>/dashboard/:path*</code>, <code>/api/:path+</code>, or a regex like <code>/((?!api|_next/static|_next/image|favicon.ico).*)</code>, plus <code>has</code>/<code>missing</code> conditions.</p>`,
    followUps: ['How would you A/B test a static page without making it dynamic?', 'What is the execution order of next.config redirects, rewrites and middleware?', 'Why not query the database in middleware?'] });
  interview.push({ q: 'How do next/image and next/font improve Core Web Vitals, and what mistakes still hurt LCP and CLS?', level: 'I',
    a: `<p><code>next/image</code> serves resized, modern-format variants through a srcset, lazy-loads by default, and needs dimensions (or <code>fill</code> with a sized parent) so space is reserved, preventing CLS. For the LCP image you must disable lazy loading and preload it with <code>priority</code> (renamed <code>preload</code> in Next 16), and give a correct <code>sizes</code> so mobile does not download desktop-size files. <code>next/font</code> downloads fonts at build time and self-hosts them (no third-party request, better privacy), and generates a metric-adjusted fallback font so the swap does not shift layout. Common mistakes: lazy-loading the hero, missing <code>sizes</code> with <code>fill</code>, huge unoptimised background images in CSS, loading many font weights, and client-side rendering the LCP element after hydration.</p>`,
    followUps: ['How do you find the LCP element in production?', 'What changed in next/image defaults in Next 16?', 'When would you bypass the image optimiser?'] });
  interview.push({ q: 'Compare the Pages Router and the App Router. How would you migrate a large app?', level: 'A',
    a: `<p>Pages Router: every page is a client component that is SSR'd and hydrated; data comes from <code>getStaticProps</code>/<code>getServerSideProps</code>/<code>getStaticPaths</code>; one <code>_app</code> layout; API routes in <code>pages/api</code>; <code>next/head</code> for metadata. App Router: Server Components by default (smaller bundles, data fetching in components), nested and persistent layouts, streaming and Suspense, Server Actions, route handlers, the metadata API, and the fetch/<code>use cache</code> caching model. Both routers can run in one app, so migrate incrementally: create <code>app/layout.js</code>, move low-risk static pages first, convert data functions into async Server Components, replace <code>useRouter</code> from <code>next/router</code> with <code>next/navigation</code> hooks, push <code>'use client'</code> down, then move dynamic and authenticated areas. Navigating between the two routers is a full page load, so migrate related routes together, and track bundle size and Web Vitals per step.</p>`,
    followUps: ['What breaks when you move a page that relies on _app context providers?', 'How do API routes map to route handlers?', 'What is the hardest part of the migration in your experience?'] });
  interview.push({ q: 'How would you deploy and self-host a Next.js App Router application at scale?', level: 'E',
    a: `<p>On Vercel the build output maps to functions, a global cache and edge routing automatically. Self-hosting: build with <code>output: 'standalone'</code> into a Docker image and run <code>next start</code> behind a CDN. With several instances you must share state: a custom <code>cacheHandler</code> (e.g. Redis) for the Data Cache and ISR output with tag propagation, a stable build id and the same <code>NEXT_SERVER_ACTIONS_ENCRYPTION_KEY</code> on every instance, and a CDN/proxy that does not buffer streamed responses and respects cache headers. Image optimisation needs CPU (sharp) or an external loader. For serverless platforms use an adapter (OpenNext for AWS/Cloudflare). A static export (<code>output: 'export'</code>) removes the server entirely but also removes dynamic rendering, ISR, actions and proxy. Monitor with OpenTelemetry (<code>instrumentation.ts</code>), real-user Web Vitals and cache hit rates.</p>`,
    followUps: ['What breaks with ISR if each pod keeps its own cache?', 'How do you do zero-downtime deploys when clients still hold old action ids?', 'When is static export the right choice?'] });

  /* spread the correct answers around: rotate the options of each quiz question */
  quiz.forEach(function (q, i) {
    var n = q.options.length, k = i % n;
    if (!k) return;
    q.options = q.options.slice(k).concat(q.options.slice(0, k));
    q.answer = (q.answer - k + n) % n;
  });

  registerModule({
    id: 'fe24',
    title: 'Next.js: App Router, Server Components & Rendering',
    intro: `<p>React Internals showed you <i>what</i> Server Components, SSR, SSG and ISR are. This module is about <b>Next.js itself</b>: how the App Router turns folders into URLs and nested layouts, where exactly the server/client boundary sits and what may cross it, how the fetch cache, <code>revalidate</code> and cache tags work (and how their defaults changed from Next 14 to 15 to 16), how a route becomes static, dynamic, ISR or streamed, how Server Actions handle forms, what middleware (now <code>proxy</code>) can do at the edge, and how images, fonts and metadata affect Core Web Vitals and deployment.</p>
      <p>Next.js code cannot run in this page, so every concept also comes with a small <b>plain JavaScript model</b> you can run and test: a route matcher, a layout composer, a boundary checker, a fetch cache with tags, an ISR simulator, a middleware matcher and more. Interviews increasingly ask candidates to reason about exactly these mechanics.</p>`,
    goals: [
      'Design an app/ folder with static, dynamic, catch-all and optional catch-all segments, route groups, parallel and intercepting routes, and predict which route wins',
      'Explain how layouts, templates, loading, error and not-found files nest, and which boundary catches which error',
      'Place the server/client boundary correctly and list what can and cannot be passed as props across it',
      'Reason about Request Memoization, the Data Cache, the Full Route Cache and the Router Cache, revalidate times and tags, and the default changes in Next 15 and 16 (use cache, cacheLife, cacheTag, updateTag)',
      'Predict whether a route is static, dynamic, ISR or partially prerendered, and use Suspense streaming to cut time to first byte',
      'Build forms with Server Actions, useActionState and useOptimistic, and secure them',
      'Write middleware / proxy matchers, know the edge runtime limits, and optimise images, fonts and metadata for Core Web Vitals'
    ],
    prereqs: `Required: React Internals &amp; Rendering Strategies (fe12) and State Management &amp; Data Fetching (fe10). Helpful: Rendering Pipeline &amp; Web Performance (fe11) for Core Web Vitals, and JavaScript promises and async/await.`,
    hours: 16,
    langExplain: `<p>Next.js and JSX examples are shown for reading only (they need a Next.js project). Every exercise is a plain JavaScript model of a Next.js mechanism, so the tested solutions are in JavaScript.</p>`,
    topics: topics,
    quiz: quiz,
    interview: interview,
    practice: practice
  });
})();
