(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* ---------- shared helper: pipeline graph used by several visualizers ---------- */
function pipeGraph(hl, ehl, tags, label) {
  return {
    type: 'graph', label: label || 'Browser rendering pipeline', directed: true, height: 62,
    nodes: [
      { id: 'HTML', label: 'HTML bytes', x: 10, y: 10, shape: 'box' },
      { id: 'DOM', label: 'DOM tree', x: 34, y: 10, shape: 'box' },
      { id: 'CSS', label: 'CSS bytes', x: 10, y: 52, shape: 'box' },
      { id: 'CSSOM', label: 'CSSOM', x: 34, y: 52, shape: 'box' },
      { id: 'RT', label: 'Render tree', x: 58, y: 31, shape: 'box' },
      { id: 'LAY', label: 'Layout', x: 88, y: 8, shape: 'box' },
      { id: 'PNT', label: 'Paint', x: 88, y: 31, shape: 'box' },
      { id: 'CMP', label: 'Composite', x: 88, y: 54, shape: 'box' }
    ],
    edges: [['HTML', 'DOM'], ['CSS', 'CSSOM'], ['DOM', 'RT'], ['CSSOM', 'RT'], ['RT', 'LAY'], ['LAY', 'PNT'], ['PNT', 'CMP']],
    hl: hl || {}, ehl: ehl || {}, tags: tags || {}
  };
}

/* =====================================================================
   TOPIC 1 — Critical Rendering Path: DOM, CSSOM, Render Tree
   ===================================================================== */
topics.push({
  title: 'The Critical Rendering Path: HTML → DOM, CSS → CSSOM, Render Tree',
  analogy: `<p><b>Think of building a house.</b> The HTML is the <i>blueprint</i> — it says which rooms exist and which room sits inside which. The browser turns it into a real frame of walls (the <b>DOM</b>). The CSS is the <i>paint and furniture catalogue</i> (the <b>CSSOM</b>). The painter cannot start until <u>both</u> the frame and the whole catalogue are ready — if a page of the catalogue is still in the post, he waits. That waiting is why a slow CSS file makes a blank white page. Rooms marked "do not build" (<code>display: none</code>) never make it onto the final work order, called the <b>render tree</b>.</p>`,
  explain: `<p>The <b>critical rendering path (CRP)</b> is the chain of steps a browser must finish before the first pixel appears. Everything you do for web performance is about making this chain shorter or less blocked.</p>
  <ol>
    <li><b>HTML bytes → DOM.</b> The parser reads bytes, turns them into characters, then <i>tokens</i> (<code>&lt;div&gt;</code>, text, <code>&lt;/div&gt;</code>), then <i>nodes</i>, then links them into a tree: the <b>Document Object Model</b>. This is <u>incremental</u> — the browser builds the tree while the HTML is still downloading.</li>
    <li><b>CSS bytes → CSSOM.</b> Same idea for stylesheets, but the result is a tree of rules with the final (cascaded) values. CSS is <span class="c-r">render-blocking</span>: the browser will not paint until it knows all styles, because painting with half the rules would flash wrong colours.</li>
    <li><b>DOM + CSSOM → render tree.</b> Only nodes that will actually be drawn are kept, each with its computed style. <code>&lt;head&gt;</code>, <code>&lt;script&gt;</code> and anything with <code>display: none</code> are dropped. <code>visibility: hidden</code> is <i>kept</i> — it still takes up space.</li>
    <li><b>Layout → Paint → Composite</b> (next topic) turn that tree into pixels.</li>
  </ol>
  <p><b>JavaScript joins the party:</b> a plain <code>&lt;script src&gt;</code> is <span class="c-r">parser-blocking</span> — HTML parsing stops, the file downloads and runs, then parsing continues. Worse, a script must wait for any CSS above it (it might ask for a style, so styles must be ready). Use <code>defer</code> (download in parallel, run after parsing, in order) or <code>async</code> (download in parallel, run the moment it arrives, any order).</p>
  ${H.table(['Resource', 'Blocks parsing?', 'Blocks first paint?', 'Fix'], [
    ['CSS &lt;link&gt;', 'No (but blocks scripts after it)', '<span class="c-r">Yes</span>', 'Inline critical CSS, split by media'],
    ['Plain &lt;script src&gt;', '<span class="c-r">Yes</span>', 'Yes (parser stopped)', 'Add <code>defer</code> / <code>async</code>'],
    ['&lt;script defer&gt;', 'No', 'No (runs after parse)', 'Default choice for app code'],
    ['&lt;script async&gt;', 'No (only while running)', 'Maybe', 'Analytics, independent widgets'],
    ['&lt;img&gt;', 'No', 'No (but can be the LCP)', 'Size it, lazy-load below the fold']
  ])}`,
  clues: [
    '"What happens between receiving HTML and seeing pixels?" → critical rendering path',
    '"Why is my page blank for 3 seconds?" → render-blocking CSS or a parser-blocking script in &lt;head&gt;',
    '"First Contentful Paint is slow but the server is fast" → blocked on CSS/JS, not on network time to first byte',
    '"What is the difference between async and defer?" → both download in parallel; defer runs in order after parsing, async runs ASAP in any order',
    '"Is display:none in the render tree?" → no; visibility:hidden and opacity:0 are',
    '"Reduce time to first paint" → fewer/smaller blocking resources, inline critical CSS, preload hero assets'
  ],
  code: [
    { lang: 'js', title: 'Toy browser: HTML text → DOM tree → render tree (runnable)', run: true, code: `// A tiny HTML tokenizer + tree builder, to see what "parsing" really does.
// Supports only simple tags like <div> and text (no attributes, no void tags).
function parseHTML(html) {
  const root = { tag: '#document', children: [] };
  const stack = [root];                        // open elements (current parent is the last one)
  const tokenRe = /<\\/?[a-z][a-z0-9]*>|[^<]+/gi; // start tag | end tag | text
  let m;
  while ((m = tokenRe.exec(html))) {
    const tok = m[0];
    const parent = stack[stack.length - 1];
    if (tok.startsWith('</')) {
      stack.pop();                              // closing tag: go back up one level
    } else if (tok.startsWith('<')) {
      const node = { tag: tok.slice(1, -1).toLowerCase(), children: [] };
      parent.children.push(node);
      stack.push(node);                         // opening tag: new child, descend into it
    } else if (tok.trim()) {
      parent.children.push({ text: tok.trim() });
    }
  }
  return root;
}

// CSSOM: here just a lookup table "tag -> display value".
const cssom = { p: 'block', span: 'inline', aside: 'none', script: 'none' };

// Render tree = DOM minus anything that will not be drawn.
function buildRenderTree(node) {
  if (node.text !== undefined) return { text: node.text };
  const display = cssom[node.tag] || 'block';
  if (display === 'none') return null;          // dropped: no layout, no paint
  const kids = node.children.map(buildRenderTree).filter(Boolean);
  return { tag: node.tag, display, children: kids };
}

function print(node, depth) {
  const pad = '  '.repeat(depth);
  if (node.text !== undefined) return pad + '"' + node.text + '"';
  return [pad + '<' + node.tag + '>' + (node.display ? ' [' + node.display + ']' : '')]
    .concat(node.children.map((c) => print(c, depth + 1))).join('\\n');
}

const html = '<div><p>Hello <span>web</span></p><aside>ad</aside><p>Bye</p></div>';
const dom = parseHTML(html);
console.log('--- DOM (everything in the HTML) ---');
console.log(print(dom.children[0], 0));
console.log('--- Render tree (aside is display:none, so it is gone) ---');
console.log(print(buildRenderTree(dom.children[0]), 0));` },
    { lang: 'html', title: 'Loading scripts without blocking the parser', code: `<!doctype html>
<html>
<head>
  <!-- Critical CSS inlined: first paint needs no extra request -->
  <style>body{margin:0;font:16px system-ui}.hero{min-height:60vh}</style>
  <!-- Full stylesheet: render-blocking, but loaded early and in parallel -->
  <link rel="stylesheet" href="/app.css">
  <!-- Non-critical CSS: media that does not match = does not block rendering -->
  <link rel="stylesheet" href="/print.css" media="print">

  <!-- BAD: blocks HTML parsing until downloaded + executed -->
  <!-- <script src="/vendor.js"><\/script> -->

  <!-- GOOD: downloads in parallel, runs after the document is parsed, in order -->
  <script defer src="/app.js"><\/script>
  <!-- GOOD for independent scripts: runs as soon as it arrives -->
  <script async src="/analytics.js"><\/script>
  <!-- Modules are deferred by default -->
  <script type="module" src="/main.mjs"><\/script>
</head>
<body>
  <h1 class="hero">Hello</h1>
</body>
</html>` }
  ],
  codeTitle: ['Toy parser → DOM → render tree', 'Script and style loading attributes'],
  viz: [
    {
      title: 'The pipeline, stage by stage',
      gen: function () {
        var f = [];
        f.push({ narr: 'Bytes arrive from the network. <b>HTML</b> and <b>CSS</b> are separate files and are processed on <i>two parallel tracks</i>. Nothing is on screen yet.', parts: [pipeGraph({ HTML: 'cur', CSS: 'cur' }, {}, {}), { type: 'text', html: 'Goal of the whole page: get to <b>Composite</b> as fast as possible.' }] });
        f.push({ narr: 'The HTML parser turns bytes → characters → tokens → nodes → the <b>DOM tree</b>. It works <i>incrementally</i> while more HTML is still downloading.', parts: [pipeGraph({ HTML: 'done', DOM: 'ok', CSS: 'cur' }, { 'HTML-DOM': 'ok' }, { DOM: 'built bit by bit' }), { type: 'tree', label: 'DOM (simplified)', arr: ['html', 'head', 'body', null, null, 'h1', 'p'], hl: { 0: 'ok', 2: 'ok', 5: 'ok', 6: 'ok' } }] });
        f.push({ narr: 'In parallel, CSS bytes become the <b>CSSOM</b>. Unlike the DOM, the CSSOM is <span class="c-r">render-blocking</span>: the browser needs every rule before it knows the final style of any element.', parts: [pipeGraph({ HTML: 'done', DOM: 'done', CSS: 'done', CSSOM: 'ok' }, { 'CSS-CSSOM': 'ok' }, { CSSOM: 'blocks painting' })] });
        f.push({ narr: 'A plain <code>&lt;script&gt;</code> in the middle of the HTML <span class="c-r">pauses the parser</span>, and it also waits for the CSSOM (the script might read a style). This is why <code>defer</code> matters.', parts: [pipeGraph({ DOM: 'bad', CSSOM: 'cur' }, {}, { DOM: 'parser paused' }), { type: 'text', html: '<code>&lt;script src&gt;</code> → download → wait for CSSOM → execute → <i>then</i> resume parsing.' }] });
        f.push({ narr: 'DOM + CSSOM are combined into the <b>render tree</b>: only visible nodes, each with its computed style. <code>display:none</code> nodes and <code>&lt;head&gt;</code> are left out.', parts: [pipeGraph({ DOM: 'done', CSSOM: 'done', RT: 'ok' }, { 'DOM-RT': 'ok', 'CSSOM-RT': 'ok' }, { RT: 'visible nodes only' })] });
        f.push({ narr: '<b>Layout</b> measures: how wide and how tall is each box, and where does it sit? Output is geometry (x, y, width, height) in pixels.', parts: [pipeGraph({ RT: 'done', LAY: 'cur' }, { 'RT-LAY': 'ok' }, { LAY: 'x, y, w, h' })] });
        f.push({ narr: '<b>Paint</b> records what to draw: backgrounds, text, borders, shadows — as a list of draw commands per layer.', parts: [pipeGraph({ LAY: 'done', PNT: 'cur' }, { 'LAY-PNT': 'ok' }, { PNT: 'draw commands' })] });
        f.push({ narr: '<b>Composite</b>: the GPU stacks the painted layers in the right order and shows them. <span class="c-g">First pixels on screen!</span> (This moment is roughly First Contentful Paint.)', parts: [pipeGraph({ PNT: 'done', CMP: 'sel' }, { 'PNT-CMP': 'ok' }, { CMP: 'pixels!' })] });
        return f;
      }
    },
    {
      title: 'Script loading: blocking vs async vs defer',
      gen: function () {
        var cols = ['Phase', 'plain &lt;script&gt;', 'async', 'defer'];
        function tb(rows, hl, label) { return { type: 'table', label: label || 'What the browser does', columns: cols, rows: rows, hl: hl || {} }; }
        var base = [
          ['1. Parser meets the tag', '<span class="c-r">STOPS parsing</span>', 'keeps parsing', 'keeps parsing'],
          ['2. Download', 'parser waits', 'parallel', 'parallel'],
          ['3. Execute', 'right after download', 'right after download (pauses parser briefly)', 'after HTML is fully parsed'],
          ['4. Order of several scripts', 'document order', 'whoever arrives first', 'document order']
        ];
        return [
          { narr: 'Three ways to include a script. Row by row, watch what each does to the HTML parser — the thing that builds your DOM.', parts: [tb(base, {})] },
          { narr: 'Step 1: a <b>plain</b> script is the only one that <span class="c-r">stops the parser</span> the moment it is seen. Everything below the tag has no DOM yet.', parts: [tb(base, { 0: 'bad' })] },
          { narr: 'Step 2: <code>async</code> and <code>defer</code> download in the background while parsing continues — the network and the parser work as a team.', parts: [tb(base, { 1: 'ok' })] },
          { narr: 'Step 3: <b>when</b> they run differs. <code>defer</code> waits until the DOM is complete, so code can safely query elements. <code>async</code> may run in the middle of parsing.', parts: [tb(base, { 2: 'cur' })] },
          { narr: 'Step 4: order. Two <code>defer</code> scripts always run in the order written (library first, app second). Two <code>async</code> scripts race — never use async for scripts that depend on each other.', parts: [tb(base, { 3: 'sel' }), { type: 'text', html: '<b>Rule of thumb:</b> app code → <code>defer</code> (or <code>type="module"</code>). Independent third-party widgets → <code>async</code>. Plain script → almost never.' }] }
        ];
      }
    }
  ],
  examples: [
    {
      title: 'Why a slow stylesheet gives a blank page',
      html: `<p>You have <code>&lt;link rel="stylesheet" href="https://slow.example/big.css"&gt;</code> in <code>&lt;head&gt;</code> and the server needs 2 seconds to answer. The HTML is already parsed (the DOM is complete), but the render tree cannot be built without the CSSOM — so the user stares at white for 2 seconds.</p>
      ${H.table(['Time', 'What happens', 'On screen'], [['0 ms', 'HTML arrives, DOM built', 'blank'], ['50 ms', 'CSS requested', 'blank'], ['2050 ms', '<span class="c-r">CSS finally arrives</span> → CSSOM → render tree → layout → paint', '<span class="c-g">page appears</span>']])}
      <p><b>Fixes:</b> host CSS on your own fast origin/CDN, inline the small "above-the-fold" part, and mark rarely needed CSS with a <code>media</code> query so it does not block.</p>`
    },
    {
      title: 'display:none vs visibility:hidden vs opacity:0',
      html: `<p>All three make something invisible, but they are very different for the pipeline:</p>
      ${H.table(['Property', 'In render tree?', 'Takes up space?', 'Clickable?', 'Cost to toggle'], [
        ['<code>display: none</code>', '<span class="c-r">No</span>', 'No', 'No', 'Layout + paint (tree changes)'],
        ['<code>visibility: hidden</code>', 'Yes', 'Yes', 'No', 'Paint only'],
        ['<code>opacity: 0</code>', 'Yes', 'Yes', '<span class="c-y">Yes</span> (still receives clicks)', 'Composite only (cheap)']
      ])}
      <p>Interview tip: this is why hiding a big, rarely used section with <code>display:none</code> is also a performance win on first load — the browser skips laying it out entirely.</p>`
    },
    {
      title: 'Putting a script at the end of body vs defer',
      html: `<p>Old advice: "put scripts at the bottom of <code>&lt;body&gt;</code>". It works because the parser has already built the DOM above it. But the file only starts downloading when the parser <i>reaches</i> it. With <code>defer</code> in <code>&lt;head&gt;</code>, the browser's <b>preload scanner</b> sees the script early and downloads it in parallel — same "run after parsing" guarantee, but earlier download.</p>
      ${H.table(['Approach', 'Download starts', 'Runs'], [['Plain script, bottom of body', 'when parser reaches it (late)', 'immediately, but late'], ['<code>defer</code> in head', '<span class="c-g">immediately (preload scanner)</span>', 'after parse, in order']])}`,
      code: { lang: 'js', code: `// With defer you can safely touch the DOM at the top level of the script:
document.querySelector('#app').textContent = 'ready'; // DOM already built when a deferred script runs`, check: false }
    },
    {
      title: 'Walking the toy parser by hand',
      html: `<p>Input <code>&lt;div&gt;&lt;p&gt;Hi&lt;/p&gt;&lt;/div&gt;</code>. Tokens: <code>&lt;div&gt;</code>, <code>&lt;p&gt;</code>, text "Hi", <code>&lt;/p&gt;</code>, <code>&lt;/div&gt;</code>. A <b>stack</b> keeps the open elements:</p>
      ${H.table(['Token', 'Stack after', 'Action'], [['&lt;div&gt;', 'div', 'new node, child of document'], ['&lt;p&gt;', 'div, p', 'new node, child of div'], ['"Hi"', 'div, p', 'text node, child of p'], ['&lt;/p&gt;', 'div', 'pop'], ['&lt;/div&gt;', '(empty)', 'pop']])}
      <p>Real browsers add error recovery (the HTML spec defines exactly how to fix <code>&lt;p&gt;&lt;div&gt;</code> mistakes) — that is why broken HTML never "crashes" a page.</p>`
    }
  ],
  deepDive: `<p><b>Preload scanner.</b> While the main parser is blocked on a script, a second lightweight scanner races ahead through the raw HTML and starts downloads for images, scripts and stylesheets it spots. It cannot see resources that only appear after JavaScript runs — which is why an image inserted by client-side JS or a CSS <code>background-image</code> discovered late is slower than a plain <code>&lt;img src&gt;</code> in the HTML. This is a major reason server-rendered HTML often beats client-rendered pages for LCP.</p>
  <p><b>Render-blocking in detail.</b> A stylesheet blocks <i>rendering</i> (paint) and also blocks <i>script execution</i> that comes after it, but does <u>not</u> stop the HTML parser. Modern Chrome exposes <code>blocking="render"</code> on <code>&lt;script&gt;</code>/<code>&lt;link&gt;</code> for explicit control. Fonts are separate: <code>font-display: swap</code> shows fallback text first so text is never invisible.</p>
  <p><b>The first 14 KB.</b> A new TCP connection starts with a small congestion window (about 10 packets ≈ 14 KB). If your HTML plus inlined critical CSS fits in the first round trip, the browser can start rendering one round trip earlier. That is the real reason people say "keep critical CSS under ~14 KB". With HTTP/3 (QUIC) the numbers differ slightly but the idea holds.</p>
  <p><b>Streaming &amp; early flush.</b> Servers can send the <code>&lt;head&gt;</code> first (so CSS/preloads begin downloading) while still computing the body. Frameworks with streaming SSR do exactly this. <b>Early Hints (103)</b> goes further: the server tells the browser "start fetching these" before the real response even exists.</p>
  <p><b>Speculative and cached navigation.</b> The back/forward cache (bfcache) restores whole pages instantly — but only if you avoid things like <code>unload</code> handlers. The Speculation Rules API can prerender the next page so the "critical path" for that navigation is zero.</p>
  <p><b>Measure, do not guess.</b> In DevTools → Performance, the main-thread flame chart shows <i>Parse HTML</i>, <i>Recalculate Style</i>, <i>Layout</i>, <i>Paint</i> as coloured blocks. The <i>Network</i> panel's waterfall and "Initiator" column show which resource triggered which — the chain of dependent requests is your literal critical path.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI assistants happily scaffold a page with five libraries, a web-font and three analytics tags — all in <code>&lt;head&gt;</code>, all blocking. Generated code is optimised to <i>work</i>, not to render fast. Also, AI-driven "answer engines" and crawlers often fetch only the raw HTML, so content that exists only after client-side JS may be invisible to them — the same reason server-rendered HTML helps LCP.</p>
  <p><b>Use AI as a partner:</b> export a DevTools performance trace (or a Lighthouse JSON) and ask <code>Which requests are on the critical path and which are render-blocking? Explain, then suggest the smallest change.</code> AI is great at reading a long waterfall. Ask it to explain <i>why</i> something blocks, not just to patch it.</p>
  <p><b>Where AI goes wrong:</b> it mixes up <code>async</code> and <code>defer</code>, suggests <code>preload</code> for everything (which steals bandwidth from what matters), and cannot feel a slow phone on a 3G connection. It also tends to say "move the script to the bottom" as a universal fix.</p>
  <p><b>What you must still own:</b> a mental model of the pipeline so you can verify claims, plus real-device measurement. If you can draw HTML → DOM → render tree → layout → paint → composite from memory and say which step each fix shortens, you can review any AI suggestion.</p>`,
  problems: [
    {
      title: 'Build the Render Tree', level: 'Medium', tags: ['DOM', 'render tree', 'tree traversal'], companies: ['Google', 'Meta'],
      statement: `<p>You are given a DOM tree where each node is <code>{ tag, display, children }</code> (<code>display</code> may be <code>'none'</code>, <code>'block'</code> or <code>'inline'</code>). Return the list of tags that appear in the <b>render tree</b>, in depth-first order. A node is missing from the render tree if its own <code>display</code> is <code>'none'</code> — and then its <u>whole subtree</u> is missing too, even if descendants have <code>display: block</code>.</p>`,
      constraints: `1 ≤ nodes ≤ 10<sup>5</sup>; depth up to 10<sup>4</sup> (watch the recursion limit in real engines).`,
      example: `<p>DOM: <code>div &gt; [p, aside(none) &gt; [span(block)], footer]</code></p>${H.arr(['div', 'p', 'footer'], { label: 'render tree (DFS)', hl: { 0: 'g', 1: 'g', 2: 'g' } })}<p>${H.c('r', 'aside')} is <code>display:none</code>, so its child <code>span</code> is dropped too, even though it says <code>block</code>.</p>`,
      brute: { why: `<p>For every node, walk up through all its ancestors to check whether any of them is <code>display:none</code>. That is O(N · depth) — for a deep tree of 10<sup>4</sup> levels it becomes ~10<sup>8</sup> checks, and it re-checks the same ancestors again and again.</p>`, code: `function renderTags(root) {
  // Collect every node with its parent pointer, then check ancestors one by one.
  const all = [];
  (function walk(n, parent) { n.parent = parent; all.push(n); n.children.forEach((c) => walk(c, n)); })(root, null);
  const out = [];
  for (const n of all) {
    let hidden = false;
    for (let a = n; a; a = a.parent) if (a.display === 'none') { hidden = true; break; } // repeated work
    if (!hidden) out.push(n.tag);
  }
  return out;
}` },
      mcq: { q: 'A parent has display:none and its child has display:block. Is the child in the render tree?', options: ['No — the whole subtree is skipped', 'Yes — the child overrides the parent', 'Only if it has position:absolute'], answer: 0, explain: 'display:none removes the element from the render tree, and its descendants cannot be rendered without it. (This is different from visibility:hidden, which children can override.)' },
      hints: [`<p>If a node is <code>display:none</code>, you never need to look at anything below it. That is the "aha": prune the subtree instead of testing each descendant.</p>`, `<p>A single depth-first traversal. Walk the tree; when you meet a <code>none</code> node, just <i>return</i> without visiting its children. No parent pointers needed.</p>`, `<p>Recipe: <code>visit(n)</code>: if n.display is none → return; push n.tag; for each child → visit(child). Use an explicit stack if depth could exceed the call-stack limit; push children in reverse to keep left-to-right order.</p>`],
      solution: {
        approach: `<p>One depth-first pass with <b>pruning</b>. Because a hidden node hides its entire subtree, we simply refuse to descend into it. An explicit stack avoids recursion limits on very deep documents (browsers really do hit this).</p>`,
        code: `function renderTags(root) {
  const out = [];
  const stack = [root];                       // explicit stack = no recursion limit
  while (stack.length) {
    const n = stack.pop();
    if (n.display === 'none') continue;       // prune: skip node AND its whole subtree
    out.push(n.tag);
    // push children in reverse so the first child is popped first (DFS, left to right)
    for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
  }
  return out;
}

const dom = { tag: 'div', display: 'block', children: [
  { tag: 'p', display: 'block', children: [] },
  { tag: 'aside', display: 'none', children: [{ tag: 'span', display: 'block', children: [] }] },
  { tag: 'footer', display: 'block', children: [] }] };
console.log(renderTags(dom).join(' ')); // div p footer`,
        complexity: `<p>Time O(N) — each node visited at most once (pruned subtrees are not visited at all). Space O(depth) for the stack.</p>`,
        followUps: ['How would you also exclude <code>&lt;head&gt;</code> and <code>&lt;script&gt;</code> (UA stylesheet gives them display:none)?', 'Which extra nodes does the real render tree contain that the DOM does not? (Pseudo-elements like ::before/::after, anonymous boxes.)']
      }
    }
  ]
});
/* =====================================================================
   TOPIC 2 — Layout, Paint, Composite
   ===================================================================== */
topics.push({
  title: 'Style, Layout, Paint & Composite: Where Every Frame Goes',
  analogy: `<p><b>A newspaper front page.</b> <i>Layout</i> is the editor deciding how wide each article is and where it sits — if one headline gets longer, the other columns must shift, so the editor redoes a lot of measuring. <i>Paint</i> is the printing press putting ink on each sheet. <i>Composite</i> is stacking transparent sheets on top of each other. Sliding one transparent sheet is almost free — nobody re-measures or reprints anything. That is why <code>transform</code> animations feel smooth and <code>left</code> animations feel janky.</p>`,
  explain: `<p>After the render tree exists, every visual update (first load, a click, an animation frame) goes through the same steps:</p>
  <ol>
    <li><b>Style</b> — figure out which CSS rules apply to which element and compute the final values.</li>
    <li><b>Layout</b> (a.k.a. <i>reflow</i>) — compute size and position of every box. One change can move many others (a taller header pushes everything down).</li>
    <li><b>Paint</b> — record <i>draw commands</i> for text, colours, borders, shadows, images. No pixels yet, just a to-do list per layer.</li>
    <li><b>Raster + Composite</b> — turn the lists into pixels (on the GPU, off the main thread) and stack the <b>layers</b> in the right order to show the frame.</li>
  </ol>
  <p>The key insight: a change only re-runs the stages <u>from where it matters downward</u>. ${H.c('r', 'Layout')} changes re-run Layout + Paint + Composite. ${H.c('y', 'Paint')}-only changes (like <code>color</code>) skip Layout. ${H.c('g', 'Composite')}-only changes (<code>transform</code>, <code>opacity</code>) skip both, and can even run on the <b>compositor thread</b> while JavaScript is busy.</p>
  ${H.table(['You change…', 'Style', 'Layout', 'Paint', 'Composite'], [
    ['<code>width</code>, <code>margin</code>, <code>top</code>, <code>font-size</code>', '✔', '<span class="c-r">✔ (expensive)</span>', '✔', '✔'],
    ['<code>color</code>, <code>background</code>, <code>box-shadow</code>', '✔', '—', '<span class="c-y">✔</span>', '✔'],
    ['<code>transform</code>, <code>opacity</code>', '✔', '—', '—', '<span class="c-g">✔ (cheap)</span>']
  ])}
  <p><b>The frame budget.</b> A 60 Hz screen needs a new frame every <b>16.7 ms</b> (120 Hz: 8.3 ms). In that time the main thread must run your JS <i>and</i> style, layout, paint — the browser itself needs a few ms. So you really have ~10 ms for your own code. Miss the budget and the user sees a dropped frame: jank.</p>`,
  clues: [
    '"Animation is janky / drops frames" → it is triggering layout or paint every frame; move to transform/opacity',
    '"Which CSS properties are cheap to animate?" → transform and opacity (compositor only)',
    '"What is a compositing layer? When would you use will-change?" → promote an element to its own GPU layer, but sparingly',
    '"60 fps" → 16.7 ms per frame including the browser\'s own work',
    '"Main thread is busy but the spinner keeps spinning" → compositor-thread animation',
    '"Why does changing one element shift many?" → layout is a tree-wide dependency (block flow, flex, grid)'
  ],
  code: [
    { lang: 'js', title: 'Which pipeline stages does a CSS change trigger? (runnable)', run: true, code: `// Property -> the earliest stage it forces. Everything after that stage re-runs too.
const LAYOUT = new Set(['width', 'height', 'margin', 'padding', 'top', 'left', 'right', 'bottom',
  'font-size', 'display', 'position', 'border-width', 'flex', 'grid-template-columns', 'line-height']);
const PAINT = new Set(['color', 'background', 'background-color', 'box-shadow', 'border-color',
  'outline', 'visibility', 'border-radius', 'text-decoration']);
const COMPOSITE = new Set(['transform', 'opacity']);

function stagesFor(prop) {
  if (LAYOUT.has(prop)) return ['style', 'layout', 'paint', 'composite'];
  if (PAINT.has(prop)) return ['style', 'paint', 'composite'];
  if (COMPOSITE.has(prop)) return ['style', 'composite'];
  return ['style', 'layout', 'paint', 'composite']; // unknown? assume the worst case
}

for (const p of ['width', 'color', 'transform', 'opacity', 'top']) {
  console.log(p.padEnd(10), '->', stagesFor(p).join(' > '));
}

// Frame budget: does a frame fit in 16.7 ms at 60 Hz?
function frameFits(ms, hz = 60) {
  const budget = 1000 / hz;
  return { budget: budget.toFixed(1), used: ms, ok: ms <= budget * 0.6 }; // keep ~40% for browser work
}
console.log(frameFits(8), frameFits(14), frameFits(7, 120));` },
    { lang: 'css', title: 'Animate with the compositor, not with layout', code: `/* BAD: animating left forces Layout + Paint + Composite on every frame */
.box-bad { position: absolute; left: 0; transition: left 300ms; }
.box-bad.moved { left: 200px; }

/* GOOD: transform only needs Composite, can run on the GPU/compositor thread */
.box-good { transition: transform 300ms; }
.box-good.moved { transform: translateX(200px); }

/* Hint the browser BEFORE the animation, remove after. Do not put it on everything. */
.will-animate { will-change: transform; }

/* Skip rendering work for off-screen sections until they are near the viewport */
.card-list > section { content-visibility: auto; contain-intrinsic-size: auto 500px; }` }
  ],
  codeTitle: ['Stage classifier + frame budget', 'transform vs left, will-change, content-visibility'],
  viz: [
    {
      title: 'Which stages re-run when you change a CSS property?',
      input: 'width',
      inputLabel: 'CSS property (try width, color, transform, opacity, top, box-shadow)',
      gen: function (input) {
        var p = String(input || '').trim().toLowerCase();
        var L = 'width height margin padding top left right bottom font-size display position border-width flex line-height'.split(' ');
        var P = 'color background background-color box-shadow border-color outline visibility border-radius text-decoration'.split(' ');
        var C = ['transform', 'opacity'];
        var kind = L.indexOf(p) >= 0 ? 'layout' : P.indexOf(p) >= 0 ? 'paint' : C.indexOf(p) >= 0 ? 'composite' : '';
        if (!kind) throw new Error('Try: width, height, margin, top, left, font-size, color, background-color, box-shadow, transform, opacity');
        var ran = { STY: true, LAY: kind === 'layout', PNT: kind !== 'composite', CMP: true };
        var names = { STY: 'Style', LAY: 'Layout', PNT: 'Paint', CMP: 'Composite' };
        var cost = { STY: 10, LAY: 60, PNT: 30, CMP: 5 };
        function graph(hl, tags) {
          return { type: 'graph', directed: true, height: 36, label: 'Pipeline for a change to "' + p + '"', nodes: [
            { id: 'STY', label: 'Style', x: 12, y: 16, shape: 'box' }, { id: 'LAY', label: 'Layout', x: 37, y: 16, shape: 'box' },
            { id: 'PNT', label: 'Paint', x: 62, y: 16, shape: 'box' }, { id: 'CMP', label: 'Composite', x: 87, y: 16, shape: 'box' }],
            edges: [['STY', 'LAY'], ['LAY', 'PNT'], ['PNT', 'CMP']], hl: hl, tags: tags || {} };
        }
        var f = [], hl = {}, tags = {}, total = 0, order = ['STY', 'LAY', 'PNT', 'CMP'];
        f.push({ narr: 'You change <code>' + p + '</code>. It is a <b>' + kind + '</b>-level property. Let\'s see which of the four stages must run again.', parts: [graph({}, {})] });
        order.forEach(function (id) {
          var snapshot = {};
          Object.keys(hl).forEach(function (k) { snapshot[k] = hl[k]; });
          if (ran[id]) {
            total += cost[id];
            snapshot[id] = 'cur'; tags[id] = 'runs';
            f.push({ narr: '<b>' + names[id] + '</b> ' + (id === 'STY' ? 'always runs: the browser recomputes which rules apply.' : id === 'LAY' ? '<span class="c-r">runs</span> — sizes/positions may change for this box <i>and</i> neighbours.' : id === 'PNT' ? 'runs — new draw commands must be recorded.' : 'runs — the GPU re-stacks the layers into the frame.'), parts: [graph(snapshot, tags), { type: 'bars', label: 'Relative work so far (illustrative units)', values: [total], idxLabels: ['total'], hl: { 0: total > 70 ? 'bad' : total > 40 ? 'cur' : 'ok' } }] });
            hl[id] = 'ok';
          } else {
            snapshot[id] = 'done'; tags[id] = 'skipped!';
            f.push({ narr: '<b>' + names[id] + '</b> is <span class="c-g">skipped</span> — nothing it produces has changed. This is where the saving comes from.', parts: [graph(snapshot, tags), { type: 'bars', label: 'Relative work so far (illustrative units)', values: [total], idxLabels: ['total'], hl: { 0: 'ok' } }] });
            hl[id] = 'done';
          }
        });
        f.push({ narr: 'Result for <code>' + p + '</code>: ' + order.filter(function (i) { return ran[i]; }).map(function (i) { return names[i]; }).join(' → ') + '. ' + (kind === 'composite' ? '<span class="c-g">Cheapest possible — can even run on the compositor thread.</span>' : kind === 'paint' ? 'Skips layout, but still repaints.' : '<span class="c-r">Most expensive — avoid animating this.</span>'), parts: [graph(hl, tags), { type: 'bars', label: 'Total relative work', values: [total], idxLabels: [p], hl: { 0: total > 70 ? 'bad' : total > 40 ? 'cur' : 'ok' } }] });
        return f;
      }
    },
    {
      title: 'The 16.7 ms frame budget',
      input: '5 2 6 3 1',
      inputLabel: 'Milliseconds: JS, Style, Layout, Paint, Composite',
      gen: function (input) {
        var v = String(input).trim().split(/[\s,]+/).map(Number);
        if (v.length !== 5 || v.some(function (x) { return isNaN(x) || x < 0 || x > 200; })) throw new Error('Enter 5 numbers (ms): JS Style Layout Paint Composite');
        var names = ['JS', 'Style', 'Layout', 'Paint', 'Composite'], budget = 16.7, f = [], acc = [], sum = 0;
        f.push({ narr: 'A 60 Hz display needs a frame every <b>16.7 ms</b>. Every stage must fit in that window. Let\'s add up the stages one by one.', parts: [{ type: 'bars', label: 'Frame budget (ms)', values: [budget], idxLabels: ['budget'], texts: ['16.7'], hl: { 0: 'win' } }] });
        for (var i = 0; i < 5; i++) {
          acc.push(v[i]); sum += v[i];
          var over = sum > budget;
          f.push({ narr: 'Add <b>' + names[i] + '</b> = ' + v[i] + ' ms. Running total: <b>' + sum.toFixed(1) + ' ms</b> ' + (over ? '— <span class="c-r">over budget, this frame will be dropped</span>.' : '— still inside the budget.'), parts: [
            { type: 'bars', label: 'Stage costs (ms)', values: acc.slice(), idxLabels: names.slice(0, i + 1), hl: (function () { var h = {}; h[i] = 'cur'; return h; })() },
            { type: 'bars', label: 'Total vs budget (ms)', values: [sum, budget], idxLabels: ['used', 'budget'], texts: [sum.toFixed(1), '16.7'], hl: { 0: over ? 'bad' : 'ok', 1: 'win' } }] });
        }
        f.push({ narr: sum > budget ? '<span class="c-r">Frame missed by ' + (sum - budget).toFixed(1) + ' ms</span> → user sees jank. Cut the biggest block first (usually JS or Layout).' : '<span class="c-g">Frame made it with ' + (budget - sum).toFixed(1) + ' ms to spare.</span> Remember real devices are 3–6× slower than your laptop.', parts: [{ type: 'bars', label: 'Total vs budget (ms)', values: [sum, budget], idxLabels: ['used', 'budget'], texts: [sum.toFixed(1), '16.7'], hl: { 0: sum > budget ? 'bad' : 'ok', 1: 'win' } }] });
        return f;
      }
    }
  ],
  examples: [
    {
      title: 'Animating left vs transform',
      html: `<p>A box slides 200 px over 300 ms (about 18 frames at 60 Hz). With <code>left</code>, each of the 18 frames re-runs layout (and paint, and composite). With <code>transform: translateX</code> the box was painted once into its own layer and the GPU just moves that picture.</p>
      ${H.table(['Technique', 'Per-frame work', 'Main thread busy?', 'Result on a slow phone'], [['<code>left</code>', 'Style + Layout + Paint + Composite', 'Yes', '<span class="c-r">stutters</span>'], ['<code>transform</code>', 'Composite only', 'No (compositor thread)', '<span class="c-g">smooth</span>']])}`,
      code: { lang: 'css', code: `.slide { transition: transform 300ms ease-out; }
.slide.open { transform: translateX(200px); }` }
    },
    {
      title: 'will-change: helpful hint or memory hog?',
      html: `<p><code>will-change: transform</code> tells the browser to create a GPU layer <i>in advance</i>. Great right before a known animation. But each layer costs GPU memory (a full-screen layer on a 3x phone is ~ 1080×2400×4 bytes ≈ 10 MB), and too many layers slow compositing itself — "layer explosion".</p>
      <ul><li><b>Do:</b> add it on hover/just before animation, remove it after.</li><li><b>Don't:</b> <code>* { will-change: transform }</code>.</li></ul>`
    },
    {
      title: 'content-visibility: auto skips off-screen work',
      html: `<p>A long article page with 200 sections. Normally the browser styles and lays out all of them on load. With <code>content-visibility: auto</code> on each section, off-screen ones are skipped until they scroll near the viewport. Supply <code>contain-intrinsic-size</code> so the scrollbar does not jump. It is "free virtualization" for ordinary (non-list) content, and it can cut initial render work by a large factor on long pages.</p>`
    },
    {
      title: 'Counting the frame budget by hand',
      html: `<p>Your scroll handler takes 9 ms, style recalculation 2 ms, layout 5 ms, paint 3 ms, composite 1 ms: 20 ms &gt; 16.7 ms → you miss every frame (effective ~50 fps, but irregular, which looks worse than a steady 30). Fixes in order of payoff: (1) stop doing layout inside the handler (batch reads/writes), (2) make the handler passive and cheaper (throttle), (3) use <code>transform</code> instead of position properties.</p>`
    }
  ],
  deepDive: `<p><b>Threads.</b> The <i>main thread</i> runs JavaScript, style, layout and paint (recording). The <i>compositor thread</i> handles scrolling, and transform/opacity animations (when they are on their own layer). The <i>raster threads / GPU process</i> turn paint records into pixels. If JS blocks the main thread for 300 ms, a CSS transform animation on its own layer keeps running smoothly — but anything that needs layout stalls.</p>
  <p><b>Layers and stacking.</b> A layer is created for things like 3D transforms, <code>will-change: transform/opacity</code>, running transform/opacity animations, <code>&lt;video&gt;</code>, <code>&lt;canvas&gt;</code> and fixed-position elements. Elements that overlap a layer may be forced into layers too (<i>layer squashing</i> merges some of these). Check DevTools → Layers and Rendering → "Layer borders".</p>
  <p><b>Invalidation.</b> Browsers do not blindly redo everything: they mark a <i>dirty</i> subtree and recompute only that (incremental layout, damage rectangles for paint). But layout dependencies are wide — changing <code>width</code> of a flex child can re-flow siblings and parents. <b>Containment</b> (<code>contain: layout paint style</code>, <code>content-visibility</code>) tells the engine "nothing inside affects the outside", which lets it limit that blast radius.</p>
  <p><b>Scrolling.</b> With passive event listeners and compositor-driven scrolling, scrolling is handled off-main-thread. A non-passive <code>touchstart</code>/<code>wheel</code> listener forces the browser to wait for your JS first (you might call <code>preventDefault</code>). Always register scroll-related listeners with <code>{ passive: true }</code> unless you need to cancel.</p>
  <p><b>Beyond 60 Hz.</b> On 120 Hz phones the budget is 8.3 ms. <code>requestAnimationFrame</code> callbacks run right before style/layout each frame, so it is the correct place to apply visual writes. <b>Web Animations API</b> and CSS animations of transform/opacity are the safest; JS-driven animations on <code>left</code>/<code>top</code> are the classic anti-pattern. Also note that <code>filter</code>, <code>backdrop-filter</code> and large <code>box-shadow</code> can be expensive in the <i>raster</i> step even though they are paint-only.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI tools generate lots of animation code (carousels, parallax, hover effects) and very often animate <code>top</code>, <code>left</code>, <code>width</code> or <code>height</code> because that is the most common pattern in its training data. It works on a fast laptop, so nobody notices until a mid-range Android phone stutters.</p>
  <p><b>Use AI as a partner:</b> paste an animation and ask <code>For each CSS property animated here, which pipeline stages does it trigger? Rewrite using only compositor-friendly properties and keep the same look.</code> AI is good at mechanical rewrites like <code>left</code> → <code>translateX</code> and <code>height</code> → <code>transform: scaleY</code> or the <code>grid-template-rows: 0fr → 1fr</code> trick.</p>
  <p><b>Where AI goes wrong:</b> it sprinkles <code>will-change: transform</code> everywhere "for performance", and it claims <code>box-shadow</code> or <code>filter</code> are "GPU accelerated so free" (they can be very costly to raster). It also cannot measure — it has no idea if your page actually drops frames.</p>
  <p><b>What you must still own:</b> opening DevTools Performance, recording a real interaction, and reading the flame chart: purple = layout/style, green = paint, yellow = scripting. Judgement about which animation is worth the complexity is a human decision.</p>`,
  problems: [
    {
      title: 'Classify CSS Changes by Pipeline Cost', level: 'Easy', tags: ['rendering', 'css', 'classification'], companies: ['Google', 'Amazon'],
      statement: `<p>Write <code>costOf(prop)</code> that returns <code>'layout'</code>, <code>'paint'</code> or <code>'composite'</code> for a CSS property name, meaning the <b>earliest</b> pipeline stage the change forces (layout means layout + paint + composite will all run). Unknown properties should be treated as <code>'layout'</code> (safest assumption). Then write <code>cheapestAnimatable(list)</code> returning the properties from a list that are composite-only.</p>`,
      constraints: `Property names are lowercase kebab-case. Up to 10<sup>4</sup> lookups; must be O(1) per lookup.`,
      example: `${H.table(['Input', 'Output', 'Why'], [['<code>width</code>', '<span class="c-r">layout</span>', 'size change moves neighbours'], ['<code>color</code>', '<span class="c-y">paint</span>', 'pixels change, geometry does not'], ['<code>transform</code>', '<span class="c-g">composite</span>', 'layer is just moved/scaled']])}`,
      brute: { why: `<p>An <code>if / else if</code> chain with long <code>||</code> lists, or scanning arrays with <code>includes()</code>, costs O(k) per lookup (k = number of known properties) and is easy to get wrong. The real waste is the readability and maintenance cost: adding a property means editing branching logic.</p>`, code: `function costOf(prop) {
  if (prop === 'width' || prop === 'height' || prop === 'margin' || prop === 'top' || prop === 'left') return 'layout';
  else if (prop === 'color' || prop === 'background-color' || prop === 'box-shadow') return 'paint';
  else if (prop === 'transform' || prop === 'opacity') return 'composite';
  return 'layout';
}` },
      mcq: { q: 'Which animation is cheapest on the main thread?', options: ['margin-left: 0 → 200px', 'transform: translateX(0 → 200px)', 'background-color changing every frame', 'width: 100px → 300px'], answer: 1, explain: 'transform is composite-only: no layout, no paint, and it can run on the compositor thread.' },
      hints: [`<p>The category depends only on the property name — it is a pure lookup, so put the facts in data, not in branching code.</p>`, `<p>Use one object (or Map) from property name to category. A lookup is O(1) and adding a property is a one-line change.</p>`, `<p>Recipe: build <code>TABLE = { width: 'layout', color: 'paint', transform: 'composite', ... }</code>. <code>costOf = p =&gt; TABLE[p] || 'layout'</code>. <code>cheapestAnimatable = list =&gt; list.filter(p =&gt; costOf(p) === 'composite')</code>. Use <code>Object.hasOwn</code> to avoid inheriting keys like "constructor".</p>`],
      solution: {
        approach: `<p>Data-driven lookup. Group property names by category once, build a Map, and fall back to <code>'layout'</code> for anything unknown (never assume a property is cheap if you do not know).</p>`,
        code: { lang: 'js', run: true, code: `const GROUPS = {
  layout: ['width', 'height', 'margin', 'padding', 'top', 'left', 'right', 'bottom', 'font-size', 'display', 'position', 'line-height'],
  paint: ['color', 'background', 'background-color', 'box-shadow', 'border-color', 'outline', 'visibility', 'border-radius'],
  composite: ['transform', 'opacity']
};
// Flatten to a Map: property -> category (built once)
const COST = new Map();
for (const [category, props] of Object.entries(GROUPS)) props.forEach((p) => COST.set(p, category));

function costOf(prop) {
  return COST.get(prop) || 'layout'; // unknown property: assume the worst
}
function cheapestAnimatable(list) {
  return list.filter((p) => costOf(p) === 'composite');
}

console.log(costOf('width'), costOf('color'), costOf('transform'), costOf('mystery-prop'));
console.log(cheapestAnimatable(['left', 'transform', 'opacity', 'color'])); // [ 'transform', 'opacity' ]` },
        complexity: `<p>Build O(K) once (K = known properties); each lookup O(1); <code>cheapestAnimatable</code> O(n).</p>`,
        followUps: ['Why is <code>filter</code> not on the composite list even though it can be GPU-accelerated?', 'How would you verify the table with DevTools instead of trusting memory? (Use the csstriggers-style approach: toggle the property and watch the Performance panel.)']
      }
    }
  ]
});
/* =====================================================================
   TOPIC 3 — Reflow vs Repaint, forced layout, layout thrashing
   ===================================================================== */
topics.push({
  title: 'Reflow vs Repaint, Forced Layout & Layout Thrashing',
  analogy: `<p><b>A carpenter fitting shelves.</b> Smart carpenter: measure the wall once, write down all the numbers, then cut every plank. Silly carpenter: cut one plank, walk to the wall to measure again, cut the next, walk back... Each walk is a <i>forced reflow</i>. The browser is the lazy-but-smart carpenter: when you change styles it just notes "needs re-measuring" and waits. But the moment you <u>ask</u> "how wide is that box?", it must stop and measure right now. Alternate asking and changing in a loop and you get <b>layout thrashing</b>.</p>`,
  explain: `<p><b>Reflow (layout)</b> = the browser recalculates sizes and positions. <b>Repaint</b> = it redraws pixels without changing geometry. Reflow is more expensive and usually causes a repaint afterwards; repaint alone is cheaper.</p>
  ${H.table(['What you do', 'Reflow?', 'Repaint?', 'Examples'], [
    ['Change size / position / content', '<span class="c-r">Yes</span>', 'Yes', '<code>width</code>, <code>margin</code>, <code>font-size</code>, adding/removing nodes, changing text, window resize'],
    ['Change looks only', 'No', '<span class="c-y">Yes</span>', '<code>color</code>, <code>background</code>, <code>box-shadow</code>, <code>outline</code>'],
    ['Change a compositor property', 'No', 'No', '<code>transform</code>, <code>opacity</code>']
  ])}
  <p><b>Batching.</b> The browser does <u>not</u> reflow on every single style assignment. It marks the layout "dirty" and does one reflow just before the next frame. Ten writes in a row = one reflow.</p>
  <p><b>Forced synchronous layout.</b> If you <i>read</i> a layout-dependent value (<code>offsetHeight</code>, <code>getBoundingClientRect()</code>, <code>scrollTop</code>…) while layout is dirty, the browser must reflow <u>immediately</u> to give you a correct answer. That is the expensive part. Do it once: fine. Do it inside a loop that also writes: <span class="c-r">N reflows instead of 1</span> — layout thrashing.</p>
  ${H.table(['Pattern', 'Reflows for 100 elements'], [['read, write, read, write… (interleaved)', '<span class="c-r">~100</span>'], ['all reads first, then all writes (batched)', '<span class="c-g">1</span>']])}
  <p><b>The golden rule:</b> <i>Read everything, then write everything.</i> Better still, avoid reading layout at all: use CSS (flex/grid/<code>:has()</code>), <code>ResizeObserver</code> and <code>IntersectionObserver</code> — they hand you sizes without forcing layout.</p>`,
  clues: [
    '"The page freezes when I resize / update 500 items" → layout thrashing in a loop',
    '"Forced reflow" / "Forced synchronous layout" warning in DevTools (purple bar with a red triangle)',
    '"Why is reading offsetHeight slow?" → it flushes pending style/layout work',
    '"Reflow vs repaint — which is more expensive and why?" → reflow; geometry changes cascade, repaint just redraws',
    '"Batch DOM updates" → read-then-write, DocumentFragment, class toggle, requestAnimationFrame',
    '"Measure an element without blocking" → ResizeObserver / IntersectionObserver'
  ],
  code: [
    { lang: 'js', title: 'Counting forced reflows with a fake layout engine (runnable)', run: true, code: `// A tiny pretend browser: writes make layout "dirty", reads of geometry must clean it.
const engine = { dirty: false, layouts: 0 };

function makeBox(h) {
  return {
    _h: h,
    get offsetHeight() {                 // READ: needs fresh layout
      if (engine.dirty) { engine.layouts++; engine.dirty = false; } // forced reflow!
      return this._h;
    },
    setHeight(v) { this._h = v; engine.dirty = true; }               // WRITE: marks layout dirty
  };
}

function run(label, work, n) {
  engine.dirty = false; engine.layouts = 0;
  const boxes = Array.from({ length: n }, (_, i) => makeBox(10 + (i % 5)));
  work(boxes);
  if (engine.dirty) engine.layouts++;  // the browser lays out once before painting anyway
  console.log(label.padEnd(26), 'reflows:', engine.layouts);
}

// BAD: read, write, read, write ... every read after a write forces a reflow.
function thrash(boxes) {
  for (const b of boxes) b.setHeight(b.offsetHeight + 1);
}
// GOOD: read all, then write all.
function batched(boxes) {
  const heights = boxes.map((b) => b.offsetHeight);   // all reads (layout is clean => 0 forced)
  boxes.forEach((b, i) => b.setHeight(heights[i] + 1)); // all writes (layout dirtied once)
}

run('interleaved (thrashing)', thrash, 100);
run('batched (read, then write)', batched, 100);` },
    { lang: 'js', title: 'Real DOM: the same bug and the fix', check: true, code: `// BAD: offsetWidth forces layout on every iteration, because the previous iteration wrote a style.
function resizeBad(cards, container) {
  for (const card of cards) {
    const w = container.offsetWidth;          // READ  -> forced reflow (layout is dirty from last write)
    card.style.width = (w / 2) + 'px';        // WRITE -> marks layout dirty again
  }
}

// GOOD: one read, many writes.
function resizeGood(cards, container) {
  const w = container.offsetWidth;            // READ once
  for (const card of cards) {
    card.style.width = (w / 2) + 'px';        // WRITES only: browser lays out once, later
  }
}

// BEST for sizes: do not poll at all. ResizeObserver gives you the size without a forced reflow.
function watch(container, cards) {
  const ro = new ResizeObserver((entries) => {
    const w = entries[0].contentRect.width;   // already measured by the browser
    requestAnimationFrame(() => cards.forEach((c) => { c.style.width = (w / 2) + 'px'; }));
  });
  ro.observe(container);
  return () => ro.disconnect();               // cleanup
}` }
  ],
  codeTitle: ['Fake engine: thrashing vs batching', 'Real DOM: resizeBad / resizeGood / ResizeObserver'],
  viz: [
    {
      title: 'Reflow vs repaint triggers',
      gen: function () {
        var cols = ['Change', 'Reflow', 'Repaint', 'Composite only'];
        var rows = [
          ['width / height', 'YES', 'yes', 'no'], ['margin / padding', 'YES', 'yes', 'no'], ['font-size', 'YES', 'yes', 'no'], ['add / remove DOM node', 'YES', 'yes', 'no'],
          ['change text content', 'YES', 'yes', 'no'], ['color', 'no', 'YES', 'no'], ['background-color', 'no', 'YES', 'no'], ['box-shadow', 'no', 'YES', 'no'],
          ['visibility', 'no', 'YES', 'no'], ['transform', 'no', 'no', 'YES'], ['opacity', 'no', 'no', 'YES']
        ];
        function t(hl) { return { type: 'table', label: 'Who triggers what', columns: cols, rows: rows, hl: hl }; }
        return [
          { narr: 'Here are common changes and which pipeline work they cause. Three groups: geometry changes, look-only changes, and compositor-only changes.', parts: [t({})] },
          { narr: '<span class="c-r">Geometry changes</span> force a <b>reflow</b>, and after a reflow the browser also repaints. These are the heavy hitters — avoid them in animations and in loops.', parts: [t({ 0: 'bad', 1: 'bad', 2: 'bad', 3: 'bad', 4: 'bad' })] },
          { narr: '<span class="c-y">Look-only changes</span> skip layout. The box stays where it is; only its pixels are redrawn. Cheaper, but big shadows or gradients can still be costly to rasterize.', parts: [t({ 5: 'cur', 6: 'cur', 7: 'cur', 8: 'cur' })] },
          { narr: '<span class="c-g">Compositor-only changes</span> skip both. The GPU just re-stacks existing layers. Use these for animation.', parts: [t({ 9: 'ok', 10: 'ok' })] },
          { narr: 'Hidden trap: <b>reading</b> geometry (<code>offsetHeight</code>, <code>getBoundingClientRect</code>, <code>scrollTop</code>) after a write forces a reflow <i>right now</i>. Reads do not "cost" by themselves — they cost because they flush pending work.', parts: [t({}), { type: 'text', html: 'Reads that flush layout: <code>offsetTop/Left/Width/Height</code>, <code>clientWidth/Height</code>, <code>scrollTop/Height</code>, <code>getBoundingClientRect()</code>, <code>getComputedStyle(el).width</code>, <code>innerText</code>, <code>window.innerWidth</code>.' }] }
        ];
      }
    },
    {
      title: 'Layout thrashing: interleaved vs batched',
      input: '4',
      inputLabel: 'Number of boxes (2-6)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 2 || n > 6) throw new Error('Enter a whole number from 2 to 6');
        var f = [], dirty = false, layouts = 0, i;
        var BAD = 'for (const b of boxes) {\n  const h = b.offsetHeight;   // READ\n  b.style.height = h + 1 + "px"; // WRITE\n}';
        var GOOD = 'const hs = boxes.map(b => b.offsetHeight); // READ all\nboxes.forEach((b, i) => {\n  b.style.height = hs[i] + 1 + "px"; // WRITE all\n});';
        function vars(extra) { var v = { 'layout dirty?': dirty ? 'yes' : 'no', 'forced reflows': layouts }; for (var k in extra) v[k] = extra[k]; return v; }
        f.push({ narr: 'Version 1 (<span class="c-r">interleaved</span>): for each box we read its height, then change it. Layout starts clean.', parts: [{ type: 'code', label: 'Bad loop', lang: 'js', code: BAD, hl: {} }, { type: 'vars', vals: vars({ boxes: n }) }] });
        for (i = 0; i < n; i++) {
          var forced = dirty;
          if (dirty) { layouts++; dirty = false; }
          f.push({ narr: 'Box ' + (i + 1) + ': <b>READ</b> offsetHeight. ' + (forced ? '<span class="c-r">Layout was dirty from the previous write → forced reflow!</span>' : 'Layout is clean → answered instantly.'), parts: [{ type: 'code', label: 'Bad loop', lang: 'js', code: BAD, hl: { 2: forced ? 'bad' : 'ok' } }, { type: 'bars', label: 'Forced reflows so far', values: [layouts], idxLabels: ['bad'], hl: { 0: layouts > 1 ? 'bad' : 'ok' } }, { type: 'vars', vals: vars({ i: i }), hl: { 'forced reflows': forced ? 'bad' : 'ok' } }] });
          dirty = true;
          f.push({ narr: 'Box ' + (i + 1) + ': <b>WRITE</b> height. This marks layout dirty — the next read will pay for it.', parts: [{ type: 'code', label: 'Bad loop', lang: 'js', code: BAD, hl: { 3: 'cur' } }, { type: 'bars', label: 'Forced reflows so far', values: [layouts], idxLabels: ['bad'], hl: { 0: layouts > 1 ? 'bad' : 'ok' } }, { type: 'vars', vals: vars({ i: i }), hl: { 'layout dirty?': 'bad' } }] });
        }
        var badTotal = layouts + 1; // plus the normal reflow before paint
        f.push({ narr: 'Loop done. The browser also does its normal reflow before painting. Total for the interleaved version: <b>' + badTotal + ' reflows</b>.', parts: [{ type: 'bars', label: 'Reflows', values: [badTotal], idxLabels: ['interleaved'], hl: { 0: 'bad' } }] });
        dirty = false; layouts = 0;
        f.push({ narr: 'Version 2 (<span class="c-g">batched</span>): first read ALL heights. Nothing has been written yet, so layout is clean — no forced reflow.', parts: [{ type: 'code', label: 'Good loop', lang: 'js', code: GOOD, hl: { 1: 'ok' } }, { type: 'vars', vals: vars({ boxes: n }), hl: { 'forced reflows': 'ok' } }] });
        dirty = true;
        f.push({ narr: 'Then WRITE all ' + n + ' heights. Layout becomes dirty once and stays dirty — no reads in between to force it.', parts: [{ type: 'code', label: 'Good loop', lang: 'js', code: GOOD, hl: { 2: 'cur', 3: 'cur' } }, { type: 'vars', vals: vars({ boxes: n }), hl: { 'layout dirty?': 'cur' } }] });
        f.push({ narr: 'Browser does ONE reflow before the next paint. Compare: <span class="c-r">' + badTotal + '</span> vs <span class="c-g">1</span>. With 1000 elements that is 1000 vs 1 — often the difference between a frozen tab and a smooth one.', parts: [{ type: 'bars', label: 'Reflows: interleaved vs batched', values: [badTotal, 1], idxLabels: ['interleaved', 'batched'], hl: { 0: 'bad', 1: 'ok' } }] });
        return f;
      }
    }
  ],
  examples: [
    {
      title: 'Equal-height cards: the classic thrash',
      html: `<p>Task: make all cards as tall as the tallest one. Naive code loops, reads each card's height, compares with the tallest-so-far, and writes. A better way: read all heights, find the max, then write. Even better: CSS <code>display: grid; grid-auto-rows: 1fr</code> — no JavaScript, no reflow loop at all.</p>
      ${H.table(['Approach', 'Reflows (100 cards)', 'Complexity of your code'], [['read/write per card', '<span class="c-r">~100</span>', 'looks innocent'], ['read all, then write all', '<span class="c-g">1</span>', 'two simple loops'], ['CSS grid / flex stretch', '<span class="c-g">0 extra</span>', 'zero JS']])}`
    },
    {
      title: 'Prefer class toggles over many inline-style writes',
      html: `<p>Setting five inline styles on an element is five writes (cheap, they batch). But toggling <i>one class</i> that carries all five rules is one write, keeps the styles in CSS, and makes it easy to animate. Rule of thumb: JS decides <i>state</i> (add class), CSS decides <i>looks</i>.</p>`,
      code: { lang: 'js', code: `// Instead of: el.style.width='200px'; el.style.opacity='1'; el.style.background='#fff'; ...
el.classList.add('is-open'); // one write; CSS handles the rest`, check: false }
    },
    {
      title: 'Reads that surprise you',
      html: `<p>Everyone knows <code>offsetHeight</code>. These also flush layout when it is dirty: <code>getComputedStyle(el).height</code> (but <i>not</i> <code>getComputedStyle(el).color</code> in most engines — only layout-dependent values), <code>element.scrollIntoView()</code>, <code>element.focus()</code> in some cases, <code>innerText</code> (it needs layout to know what is visible), and <code>window.innerHeight</code>. DevTools shows them under the purple "Layout" bar with a "Forced reflow" warning and the exact source line.</p>`
    },
    {
      title: 'Batch writes into a single frame with requestAnimationFrame',
      html: `<p><code>requestAnimationFrame</code> (rAF) runs your callback right before the next paint. If scroll events fire 5 times between frames, you do the visual work only once — in rAF. Pair it with the "read first, write second" rule: reads at the start of the callback, writes at the end.</p>`,
      code: { lang: 'js', code: `let ticking = false;
let lastScrollY = 0;
window.addEventListener('scroll', () => {
  lastScrollY = window.scrollY;         // cheap: remember the latest value only
  if (ticking) return;                  // already scheduled for this frame
  ticking = true;
  requestAnimationFrame(() => {
    header.style.transform = 'translateY(' + Math.min(lastScrollY, 80) + 'px)'; // one write per frame
    ticking = false;
  });
}, { passive: true });`, check: false }
    }
  ],
  deepDive: `<p><b>What really happens on a forced layout.</b> Style and layout work is queued lazily. A geometry read calls into the engine: <i>"flush style recalculation, then run layout up to this element, then give me the number"</i>. The cost is proportional to the dirty subtree — so thrashing on a tiny, contained widget is far cheaper than thrashing in a root container with 10,000 descendants. This is also why <b>CSS containment</b> (<code>contain: layout</code>) helps: it caps how far layout must go.</p>
  <p><b>fastdom / scheduling libraries.</b> Libraries such as <i>fastdom</i> keep two queues — <code>measure()</code> and <code>mutate()</code> — and flush all measures first, then all mutates, inside rAF. Frameworks do similar things internally: React reads layout in <code>useLayoutEffect</code> (synchronously after DOM mutation, before paint) — so reading there <i>does</i> force a reflow; use it only when you must measure before the user sees the frame (tooltips, popovers).</p>
  <p><b>Measure without forcing.</b> <code>ResizeObserver</code> callbacks run after layout in the frame, with sizes already known. <code>IntersectionObserver</code> reports visibility without polling <code>getBoundingClientRect</code>. Newer APIs like <code>element.checkVisibility()</code> and CSS container queries move whole classes of "measure then style" code into the engine.</p>
  <p><b>Transitions and the "double rAF" trick.</b> To animate from a newly inserted element's start state you need the browser to commit the start style first. Reading <code>el.offsetWidth</code> forces that (a deliberate flush — one of the few good uses), or you use two nested rAFs, or the newer <code>@starting-style</code> CSS rule which removes the hack.</p>
  <p><b>Measuring it.</b> Performance panel → purple "Layout" blocks with a red corner = forced. The "Rendering → Paint flashing" overlay shows repaints (green flashes). In code, <code>PerformanceObserver</code> with <code>'long-animation-frame'</code> entries (LoAF) reports slow frames and what script caused them in the field.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI-generated DOM code very often interleaves reads and writes — "loop over elements, measure each, set style" is the most natural way to write it. In frameworks, AI tends to add <code>useLayoutEffect</code> + <code>getBoundingClientRect</code> inside loops or render paths without realising each call can force a reflow.</p>
  <p><b>Use AI as a partner:</b> paste a function and ask <code>Mark every line as READ or WRITE with respect to layout, then rewrite it so all reads happen before all writes. Explain how many forced reflows before and after.</code> That prompt makes it show its work, which you can verify. Also useful: <code>Can this be done in pure CSS (grid, flex, container queries) instead?</code></p>
  <p><b>Where AI goes wrong:</b> it may claim "modern browsers batch everything so thrashing doesn't matter" (false for read-after-write), or "wrap it in setTimeout to fix it" (moves the problem, does not batch). It also cannot tell you how many dirty nodes your real page has.</p>
  <p><b>What you must still own:</b> proving it with a trace. Record the interaction before and after, point at the purple blocks, and show the reflow count dropped. "AI said it's faster" is not evidence.</p>`,
  problems: [
    {
      title: 'Equalise Card Heights Without Thrashing', level: 'Medium', tags: ['layout thrashing', 'batching', 'DOM'], companies: ['Meta', 'Atlassian', 'Flipkart'],
      statement: `<p>You have a list of card elements. Make every card exactly as tall as the tallest one. The naive solution interleaves reads (<code>offsetHeight</code>) and writes (<code>style.height</code>). Rewrite it to perform <b>all reads first, then all writes</b>. To prove it, run it against a fake layout engine that counts forced reflows. A write sets height in px and marks layout dirty; reading geometry while dirty counts one reflow.</p>`,
      constraints: `1 ≤ cards ≤ 10<sup>4</sup>. Heights are positive integers. Must produce exactly the same final heights as the naive version.`,
      example: `${H.arr([30, 50, 40], { label: 'heights before', hl: { 1: 'g' } })}${H.arr([50, 50, 50], { label: 'heights after', hl: { 0: 'b', 1: 'g', 2: 'b' } })}<p>Naive: ~${H.c('r', 'N')} forced reflows. Batched: ${H.c('g', '0 forced')} (one normal reflow before paint).</p>`,
      brute: { why: `<p>The naive version reads the current tallest by re-measuring every card <i>inside</i> the loop that is also writing. Each iteration: read (forced reflow because the last iteration wrote) then write. With N cards that is N forced reflows, and if each reflow re-measures all N cards it is O(N²) work.</p>`, code: `function equaliseNaive(cards) {
  let tallest = 0;
  for (const c of cards) tallest = Math.max(tallest, c.offsetHeight);
  for (const c of cards) {
    // BUG: reading tallest again here would force a reflow each time. Typical naive code re-reads:
    const current = c.offsetHeight;     // READ after previous iteration's WRITE -> forced reflow
    if (current < tallest) c.setHeight(tallest); // WRITE
  }
}` },
      mcq: { q: 'Which change removes the forced reflows in the loop?', options: ['Wrap the loop body in setTimeout', 'Read all heights into an array first, then write', 'Use var instead of let', 'Call getBoundingClientRect instead of offsetHeight'], answer: 1, explain: 'The reflow is forced by a READ following a WRITE. Reading everything before the first write means layout is still clean for every read.' },
      hints: [`<p>The problem is the <b>order</b> of operations, not the amount. A read after a write in the same task forces layout.</p>`, `<p>Phase 1: a loop that only reads, collecting heights in an array (or computing the max as you go). Phase 2: a loop that only writes.</p>`, `<p>Recipe: <code>heights = cards.map(c =&gt; c.offsetHeight)</code>; <code>tallest = Math.max(...heights)</code> (use a loop for 10<sup>4</sup>+ items to avoid argument limits); then <code>cards.forEach(c =&gt; c.setHeight(tallest))</code>. Edge case: empty list.</p>`],
      solution: {
        approach: `<p>Split into a <b>measure phase</b> and a <b>mutate phase</b>. During measuring, layout is clean, so every read is free. Writes then dirty the layout once; the browser reflows once before painting. We prove it with a fake engine that counts forced reflows.</p>`,
        code: { lang: 'js', run: true, code: `const engine = { dirty: false, forced: 0 };
function makeCard(h) {
  return {
    _h: h,
    get offsetHeight() { if (engine.dirty) { engine.forced++; engine.dirty = false; } return this._h; }, // READ
    setHeight(v) { this._h = v; engine.dirty = true; }                                                  // WRITE
  };
}

// Naive: reads and writes interleaved.
function equaliseNaive(cards) {
  let tallest = 0;
  for (const c of cards) tallest = Math.max(tallest, c.offsetHeight);
  for (const c of cards) { if (c.offsetHeight < tallest) c.setHeight(tallest); }
}

// Batched: measure phase, then mutate phase.
function equalise(cards) {
  let tallest = 0;
  const heights = [];
  for (const c of cards) {                  // PHASE 1: reads only
    const h = c.offsetHeight;
    heights.push(h);
    if (h > tallest) tallest = h;
  }
  for (let i = 0; i < cards.length; i++) {  // PHASE 2: writes only
    if (heights[i] < tallest) cards[i].setHeight(tallest);
  }
}

function demo(fn) {
  engine.dirty = false; engine.forced = 0;
  const cards = [30, 50, 40, 20, 50].map(makeCard);
  fn(cards);
  return { forced: engine.forced, heights: cards.map((c) => c._h).join(',') };
}
console.log('naive  ', demo(equaliseNaive));
console.log('batched', demo(equalise));` },
        complexity: `<p>Time O(N), space O(N) for the heights array (could be O(1) if you re-read the stored value from your own data model). Forced reflows: 0 (plus the single normal one before paint).</p>`,
        followUps: ['Replace the whole thing with pure CSS. (<code>display: grid; grid-auto-rows: 1fr</code> or flex <code>align-items: stretch</code>.)', 'What if card content changes later? (Use a ResizeObserver on the cards and recompute in rAF.)']
      }
    }
  ]
});
/* =====================================================================
   TOPIC 4 — Core Web Vitals: LCP, INP, CLS
   ===================================================================== */
topics.push({
  title: 'Core Web Vitals: LCP, INP and CLS',
  analogy: `<p><b>A restaurant review in three questions.</b> <i>How long until my main dish arrives?</i> (<b>LCP</b> — the biggest thing on the page shows up.) <i>When I wave at the waiter, how fast does he respond?</i> (<b>INP</b> — you click, how soon does the screen react.) <i>Does my plate keep sliding around while I eat?</i> (<b>CLS</b> — things jumping under your finger.) Google measures these on real visitors, and asks that 3 out of 4 customers (the 75th percentile) have a "good" time.</p>`,
  explain: `<p><b>Core Web Vitals</b> are three user-centred metrics measured on real users' devices (field data). Each has a "good", "needs improvement" and "poor" zone, and your page passes when the <b>75th percentile</b> of visits is in "good" (mobile and desktop judged separately).</p>
  ${H.table(['Metric', 'Asks…', '<span class="c-g">Good</span>', '<span class="c-y">Needs improvement</span>', '<span class="c-r">Poor</span>'], [
    ['<b>LCP</b> Largest Contentful Paint', 'When does the biggest visible element render?', '≤ 2.5 s', '2.5 – 4 s', '&gt; 4 s'],
    ['<b>INP</b> Interaction to Next Paint', 'How slow is the worst click/tap/key response?', '≤ 200 ms', '200 – 500 ms', '&gt; 500 ms'],
    ['<b>CLS</b> Cumulative Layout Shift', 'How much does visible content jump around?', '≤ 0.1', '0.1 – 0.25', '&gt; 0.25']
  ])}
  <p><b>LCP</b> is almost always one hero image, a big heading, or a video poster. Its time splits into four parts: <i>TTFB</i> (server) → <i>resource load delay</i> (browser discovers the image late) → <i>resource load duration</i> (download) → <i>element render delay</i> (waiting on JS/CSS to paint it). Fix the biggest slice first.</p>
  <p><b>INP</b> replaced FID in March 2024. For each interaction it measures <i>input delay</i> (main thread busy) + <i>processing</i> (your event handlers) + <i>presentation delay</i> (render the result). The page's INP is roughly the worst interaction (very high outliers are ignored on busy pages). Fix: break long tasks (&gt; 50 ms) into smaller pieces, do less work in handlers, avoid giant re-renders.</p>
  <p><b>CLS</b> sums up "layout shifts". Each shift score = <b>impact fraction × distance fraction</b> (how much of the screen was affected × how far it moved). Typical causes: images without dimensions, ads/embeds that load late, fonts that swap with different sizes, banners inserted above content.</p>
  <p>Supporting metrics: <b>TTFB</b> (server speed), <b>FCP</b> (first anything painted), <b>TBT</b> (lab proxy for responsiveness).</p>`,
  clues: [
    '"Which metrics are Core Web Vitals?" → LCP, INP, CLS (FID was retired; TTFB/FCP are supporting)',
    '"Page jumps while loading / I clicked the wrong button" → CLS: reserve space',
    '"Page feels laggy when I click / type" → INP: long tasks, heavy handlers, re-renders',
    '"Hero image shows late" → LCP: discovery (preload / fetchpriority), size (format), server (TTFB)',
    '"Lighthouse is green but real users complain" → lab vs field data; check CrUX / RUM at p75',
    '"What percentile?" → 75th, per device class'
  ],
  code: [
    { lang: 'js', title: 'Layout-shift score and CLS session windows (runnable)', run: true, code: `// One layout shift: score = impactFraction * distanceFraction (both 0..1).
// Simplified model: a full-width block of height elemH moves down by dist px in a viewport of height vh.
function shiftScore(vh, elemH, dist) {
  const impact = Math.min(1, (elemH + dist) / vh); // area touched = old position + new position
  const distance = Math.min(1, dist / vh);         // how far, relative to the viewport
  return impact * distance;
}

// CLS = the WORST "session window": a burst of shifts, each less than 1 s after the previous,
// and the whole window at most 5 s long. Sum the scores inside a window; keep the biggest sum.
function cls(shifts) { // shifts: [{ t: ms, v: score }]  sorted by t
  let best = 0, sum = 0, start = -Infinity, last = -Infinity;
  for (const s of shifts) {
    if (s.t - last > 1000 || s.t - start > 5000) { sum = 0; start = s.t; } // begin new window
    sum += s.v; last = s.t;
    best = Math.max(best, sum);
  }
  return best;
}

const rate = (v) => (v <= 0.1 ? 'good' : v <= 0.25 ? 'needs improvement' : 'poor');
console.log('single shift:', shiftScore(800, 300, 120).toFixed(3));   // 0.079
const shifts = [{ t: 500, v: 0.04 }, { t: 900, v: 0.05 }, { t: 1300, v: 0.04 },   // burst A = 0.13
                { t: 9000, v: 0.02 }];                                            // later, separate
const score = cls(shifts);
console.log('CLS =', score.toFixed(2), '->', rate(score));
console.log('old "sum of everything" would say', shifts.reduce((a, s) => a + s.v, 0).toFixed(2));` },
    { lang: 'js', title: 'Diagnose a poor LCP from its four parts (runnable)', run: true, code: `// LCP time = TTFB + resource load delay + resource load duration + element render delay.
function diagnoseLCP({ ttfb, loadDelay, loadDuration, renderDelay }) {
  const total = ttfb + loadDelay + loadDuration + renderDelay;
  const parts = { ttfb, loadDelay, loadDuration, renderDelay };
  const advice = {
    ttfb: 'Slow server/network: CDN, caching, fewer redirects, edge rendering, 103 Early Hints.',
    loadDelay: 'Browser found the image late: put it in the HTML, preload it, fetchpriority="high", never lazy-load it.',
    loadDuration: 'Image too big: modern format (AVIF/WebP), correct size via srcset, compression, CDN.',
    renderDelay: 'Image ready but not painted: render-blocking CSS/JS, client-side rendering, hidden until hydration.'
  };
  const worst = Object.keys(parts).sort((a, b) => parts[b] - parts[a])[0];
  const rating = total <= 2500 ? 'good' : total <= 4000 ? 'needs improvement' : 'poor';
  return { total, rating, worst, share: Math.round((parts[worst] / total) * 100) + '%', fix: advice[worst] };
}

console.log(diagnoseLCP({ ttfb: 600, loadDelay: 1400, loadDuration: 900, renderDelay: 300 }));
console.log(diagnoseLCP({ ttfb: 200, loadDelay: 100, loadDuration: 900, renderDelay: 150 }));` },
    { lang: 'js', title: 'Measure the vitals in the field with the web-vitals library', check: false, code: `import { onLCP, onINP, onCLS } from 'web-vitals';

function send(metric) {
  // sendBeacon survives page unload; fall back to fetch keepalive
  const body = JSON.stringify({ name: metric.name, value: metric.value, rating: metric.rating, id: metric.id });
  if (navigator.sendBeacon) navigator.sendBeacon('/analytics', body);
  else fetch('/analytics', { method: 'POST', body, keepalive: true });
}
onLCP(send);
onINP(send);
onCLS(send);` }
  ],
  codeTitle: ['Layout shift score + CLS session windows', 'Diagnose LCP breakdown', 'Field measurement with web-vitals'],
  viz: [
    {
      title: 'Web Vitals thresholds: where is your page?',
      input: '3100 240 0.12',
      inputLabel: 'LCP (ms), INP (ms), CLS',
      gen: function (input) {
        var v = String(input).trim().split(/[\s,]+/).map(Number);
        if (v.length !== 3 || v.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Enter three numbers: LCP_ms INP_ms CLS  (example: 3100 240 0.12)');
        var M = [
          { n: 'LCP', unit: ' ms', good: 2500, poor: 4000, v: v[0] },
          { n: 'INP', unit: ' ms', good: 200, poor: 500, v: v[1] },
          { n: 'CLS', unit: '', good: 0.1, poor: 0.25, v: v[2] }
        ];
        function rate(m) { return m.v <= m.good ? 'ok' : m.v <= m.poor ? 'cur' : 'bad'; }
        function word(m) { return m.v <= m.good ? '<span class="c-g">GOOD</span>' : m.v <= m.poor ? '<span class="c-y">NEEDS IMPROVEMENT</span>' : '<span class="c-r">POOR</span>'; }
        var f = [];
        f.push({ narr: 'Each vital has two lines: a <span class="c-g">good</span> limit and a <span class="c-r">poor</span> limit. Between them is <span class="c-y">needs improvement</span>. We will plot your three numbers against their lines.', parts: [{ type: 'table', label: 'Thresholds', columns: ['Metric', 'Good ≤', 'Poor &gt;'], rows: [['LCP', '2500 ms', '4000 ms'], ['INP', '200 ms', '500 ms'], ['CLS', '0.1', '0.25']] }] });
        M.forEach(function (m) {
          var h = { 0: 'ok', 1: 'bad', 2: rate(m) };
          f.push({ narr: '<b>' + m.n + '</b>: you measured <b>' + m.v + m.unit + '</b> → ' + word(m) + '. Green bar = the good limit (' + m.good + '), red bar = the poor limit (' + m.poor + ').', parts: [{ type: 'bars', label: m.n + ' (' + (m.unit ? 'milliseconds' : 'unitless score') + ')', values: [m.good, m.poor, m.v], idxLabels: ['good limit', 'poor limit', 'your value'], texts: [String(m.good), String(m.poor), String(m.v)], hl: h, ptr: { 2: 'you' } }] });
        });
        var pct = M.map(function (m) { return Math.round(m.v / m.poor * 100); });
        var hh = {}; M.forEach(function (m, i) { hh[i] = rate(m); });
        f.push({ narr: 'Side by side, as a % of the <i>poor</i> limit (100% = right on the poor line). Anything left of ' + Math.round(100 * 2500 / 4000) + '% (LCP), 40% (INP), 40% (CLS) is good. A page "passes Core Web Vitals" only when <b>all three</b> are good at p75.', parts: [{ type: 'bars', label: 'Your value as % of the poor limit', values: pct, idxLabels: ['LCP', 'INP', 'CLS'], texts: pct.map(function (x) { return x + '%'; }), hl: hh }] });
        var allGood = M.every(function (m) { return m.v <= m.good; });
        f.push({ narr: allGood ? '<span class="c-g">All three are good — the page passes.</span>' : 'Verdict: <span class="c-r">does not pass</span>. Work on the worst one first: ' + M.filter(function (m) { return m.v > m.good; }).map(function (m) { return m.n; }).join(', ') + '.', parts: [{ type: 'table', label: 'Summary', columns: ['Metric', 'Value', 'Rating'], rows: M.map(function (m) { return [m.n, m.v + m.unit, m.v <= m.good ? 'good' : m.v <= m.poor ? 'needs improvement' : 'poor']; }), hl: (function () { var o = {}; M.forEach(function (m, i) { o[i] = m.v <= m.good ? 'ok' : m.v <= m.poor ? 'cur' : 'bad'; }); return o; })() }] });
        return f;
      }
    },
    {
      title: 'Diagnose a poor LCP: the four slices',
      input: '600 1400 900 300',
      inputLabel: 'ms: TTFB, load delay, load duration, render delay',
      gen: function (input) {
        var v = String(input).trim().split(/[\s,]+/).map(Number);
        if (v.length !== 4 || v.some(function (x) { return isNaN(x) || x < 0; })) throw new Error('Enter 4 numbers in ms: TTFB loadDelay loadDuration renderDelay');
        var names = ['TTFB', 'Load delay', 'Load duration', 'Render delay'];
        var tips = ['Server/network is slow → CDN, cache HTML, fewer redirects.', 'Image discovered late → put it in HTML, preload, fetchpriority=high, do not lazy-load it.', 'Image is heavy → AVIF/WebP, responsive sizes, compress.', 'Painting is blocked → remove render-blocking CSS/JS, avoid client-only rendering.'];
        var total = v.reduce(function (a, b) { return a + b; }, 0), f = [], acc = [], run = 0;
        var worst = v.indexOf(Math.max.apply(null, v));
        f.push({ narr: 'LCP is not one number; it is a <b>timeline of four slices</b>. Start the clock at navigation. Our page takes <b>' + total + ' ms</b> in total.', parts: [{ type: 'bars', label: 'LCP total vs the 2500 ms good limit', values: [total, 2500], idxLabels: ['your LCP', 'good limit'], hl: { 0: total <= 2500 ? 'ok' : total <= 4000 ? 'cur' : 'bad', 1: 'ok' } }] });
        for (var i = 0; i < 4; i++) {
          acc.push(v[i]); run += v[i];
          var h = {}; h[i] = 'cur';
          f.push({ narr: 'Slice ' + (i + 1) + ': <b>' + names[i] + '</b> = ' + v[i] + ' ms (' + Math.round(v[i] / (total || 1) * 100) + '% of total). Running time: ' + run + ' ms.', parts: [{ type: 'bars', label: 'Slices so far (ms)', values: acc.slice(), idxLabels: names.slice(0, i + 1), hl: h }] });
        }
        var hl = {}; hl[worst] = 'bad';
        f.push({ narr: 'Biggest slice: <b>' + names[worst] + '</b> (' + v[worst] + ' ms). <span class="c-r">Fix this one first</span> — shaving the small slices will barely move the total.', parts: [{ type: 'bars', label: 'All slices (ms)', values: v.slice(), idxLabels: names, hl: hl }, { type: 'text', html: tips[worst] }] });
        f.push({ narr: 'Rule of thumb from Google\'s guidance: a healthy LCP has about 40% TTFB, 40% load duration, and under 10% each for load delay and render delay. Your <b>load delay</b> is usually the cheapest to fix (a one-line preload or removing <code>loading="lazy"</code>).', parts: [{ type: 'table', label: 'Healthy split vs yours', columns: ['Slice', 'Healthy', 'Yours'], rows: names.map(function (n, k) { return [n, ['~40%', '&lt;10%', '~40%', '&lt;10%'][k], Math.round(v[k] / (total || 1) * 100) + '%']; }), hl: hl }] });
        return f;
      }
    },
    {
      title: 'One layout shift, step by step',
      input: '800 300 120',
      inputLabel: 'viewport height, element height, shift distance (px)',
      gen: function (input) {
        var v = String(input).trim().split(/[\s,]+/).map(Number);
        if (v.length !== 3 || v.some(function (x) { return isNaN(x) || x <= 0; })) throw new Error('Enter 3 positive numbers: viewportHeight elementHeight shiftDistance');
        var vh = v[0], eh = v[1], d = v[2];
        var impact = Math.min(1, (eh + d) / vh), dist = Math.min(1, d / vh), score = impact * dist;
        var rating = score <= 0.1 ? 'ok' : score <= 0.25 ? 'cur' : 'bad';
        return [
          { narr: 'A late-loading banner pushes a <b>' + eh + 'px</b>-tall block down by <b>' + d + 'px</b> in an <b>' + vh + 'px</b>-tall viewport. How bad is that one shift?', parts: [{ type: 'vars', vals: { 'viewport height': vh + ' px', 'element height': eh + ' px', 'moved by': d + ' px' } }] },
          { narr: '<b>Impact fraction</b> = area touched by the move ÷ viewport area. The block covered ' + eh + 'px before and a new strip of ' + d + 'px after, so the union is ' + (eh + d) + 'px of ' + vh + 'px → <b>' + impact.toFixed(3) + '</b>.', parts: [{ type: 'bars', label: 'Fractions (0..1)', values: [impact], idxLabels: ['impact'], texts: [impact.toFixed(3)], hl: { 0: 'win' } }] },
          { narr: '<b>Distance fraction</b> = how far it moved ÷ the viewport\'s largest dimension = ' + d + ' / ' + vh + ' = <b>' + dist.toFixed(3) + '</b>.', parts: [{ type: 'bars', label: 'Fractions (0..1)', values: [impact, dist], idxLabels: ['impact', 'distance'], texts: [impact.toFixed(3), dist.toFixed(3)], hl: { 0: 'done', 1: 'win' } }] },
          { narr: 'Score = impact × distance = ' + impact.toFixed(3) + ' × ' + dist.toFixed(3) + ' = <b>' + score.toFixed(3) + '</b> → ' + (score <= 0.1 ? '<span class="c-g">fine on its own</span>' : score <= 0.25 ? '<span class="c-y">needs improvement</span>' : '<span class="c-r">poor from a single shift!</span>') + '. Remember the limit is 0.1 for the whole session window.', parts: [{ type: 'bars', label: 'This shift vs CLS limits', values: [score, 0.1, 0.25], texts: [score.toFixed(3), '0.1', '0.25'], idxLabels: ['this shift', 'good limit', 'poor limit'], hl: { 0: rating, 1: 'ok', 2: 'bad' } }] },
          { narr: 'Fix: reserve the space up front (<code>min-height</code>, <code>aspect-ratio</code>, width/height attributes) so the content below never moves. Same page, shift distance 0 → score <b>0</b>.', parts: [{ type: 'bars', label: 'Before vs after reserving space', values: [score, 0], idxLabels: ['no reserved space', 'space reserved'], texts: [score.toFixed(3), '0'], hl: { 0: rating, 1: 'ok' } }] }
        ];
      }
    }
  ],
  examples: [
    {
      title: 'Is this page passing? Reading real numbers',
      html: `<p>Field data (p75) for a shop: LCP 3.1 s, INP 180 ms, CLS 0.04. Verdict: LCP is in "needs improvement" (2.5–4 s), INP and CLS are good. The page <b>fails</b> Core Web Vitals because all three must be good. Priority: LCP only — do not waste time on CLS.</p>
      ${H.table(['Metric', 'p75', 'Rating'], [['LCP', '3.1 s', '<span class="c-y">needs improvement</span>'], ['INP', '180 ms', '<span class="c-g">good</span>'], ['CLS', '0.04', '<span class="c-g">good</span>']])}`
    },
    {
      title: 'Kill CLS from images',
      html: `<p>An <code>&lt;img&gt;</code> without dimensions takes 0 px of height until it loads, then pops open and pushes all text down. Give the browser the aspect ratio up front: the <code>width</code> and <code>height</code> attributes are enough — modern browsers turn them into <code>aspect-ratio</code> automatically, so <code>max-width: 100%; height: auto</code> still stays responsive.</p>`,
      code: { lang: 'html', code: `<!-- BAD: browser does not know the size -> content jumps when the image arrives -->
<img src="/hero.jpg" alt="Mountains">

<!-- GOOD: intrinsic size attributes reserve a 16:9 box before download -->
<img src="/hero.jpg" width="1600" height="900" alt="Mountains" style="max-width:100%;height:auto">

<!-- Same idea with CSS for a background/embed box -->
<div class="video-box" style="aspect-ratio: 16 / 9"></div>` }
    },
    {
      title: 'Kill CLS from ads, embeds and banners',
      html: `<p>Ad slots, cookie banners and chat widgets arrive late and shove content. Rules: (1) reserve the <i>largest likely</i> size with <code>min-height</code>; (2) if no ad fills it, keep the empty space (or collapse only <i>below</i> the viewport); (3) insert banners as <code>position: fixed/sticky</code> overlays, not into the flow above content; (4) never insert content above what the user is reading unless they asked for it.</p>`,
      code: { lang: 'css', code: `/* Reserve the space the ad MIGHT use. Taller reserved space is better than a jump. */
.ad-slot { min-height: 250px; width: 300px; background: #f2f2f2; }

/* Overlay banner: does not push the page, so zero layout shift */
.cookie-banner { position: fixed; inset: auto 0 0 0; }

/* Fonts: match the fallback's metrics so the swap does not reflow text */
@font-face { font-family: Brand; src: url(/brand.woff2) format("woff2"); font-display: swap; }
@font-face { font-family: "Brand Fallback"; src: local("Arial"); size-adjust: 104%; ascent-override: 92%; }
body { font-family: Brand, "Brand Fallback", sans-serif; }` }
    },
    {
      title: 'Improve INP by yielding to the main thread',
      html: `<p>A click handler filters 50,000 rows in one go: 400 ms of JavaScript. The user sees nothing until it ends — INP ≈ 400 ms+ (poor-ish). Split the work into chunks and <i>yield</i> between them so the browser can paint the first feedback.</p>`,
      code: { lang: 'js', code: `// Give the browser a turn between chunks of work.
const yieldToMain = () =>
  globalThis.scheduler && scheduler.yield ? scheduler.yield() : new Promise((r) => setTimeout(r, 0));

async function filterRows(rows, predicate, render) {
  const out = [];
  let lastYield = performance.now();
  for (const row of rows) {
    if (predicate(row)) out.push(row);
    if (performance.now() - lastYield > 40) {   // keep each task under ~50 ms
      await yieldToMain();                      // paint + handle input, then continue
      lastYield = performance.now();
    }
  }
  render(out);
}` }
    }
  ],
  deepDive: `<p><b>Field vs lab.</b> <i>Field data</i> (CrUX, your own RUM) is what real users experienced, aggregated over 28 days at p75 — this is what counts. <i>Lab data</i> (Lighthouse, WebPageTest) is a single synthetic run on a throttled profile: great for debugging, bad for judging. Lighthouse has no INP (no real interactions), so it reports <b>TBT</b> (Total Blocking Time: sum of the portion of long tasks beyond 50 ms) as a proxy.</p>
  <p><b>What counts as LCP.</b> Candidates: <code>&lt;img&gt;</code>, <code>&lt;image&gt;</code> in SVG, video poster, an element with a CSS <code>background-image</code> via <code>url()</code>, and block-level text. The browser reports a new candidate whenever a bigger one renders and stops at the first user input or scroll. Images that are invisible (opacity 0), tiny, or low-entropy placeholders may be ignored. Common LCP mistakes: <code>loading="lazy"</code> on the hero (delays discovery), image set by JavaScript, CSS background image hidden behind a stylesheet, hero served as a 3 MB PNG, no <code>fetchpriority="high"</code>.</p>
  <p><b>INP internals.</b> Every discrete interaction (click, tap, key press; hover and scroll excluded) gets a latency from the input event to the next frame painted. A page's INP is the highest, except that on pages with many interactions the highest ones are dropped (about 1 per 50 interactions), approximating p98. Iframes count too in the field (a third-party iframe can ruin your INP but not appear in your lab run). Fixes: shorten event handlers, avoid synchronous layout in them, defer non-visual work (<code>requestIdleCallback</code>, <code>scheduler.postTask</code>), use <code>startTransition</code> in React so urgent updates paint first, and reduce DOM size so rendering is cheaper.</p>
  <p><b>CLS details.</b> Shifts within 500 ms of a user input are excluded (expected shifts, like expanding an accordion). Shifts caused by <code>transform</code> animations do not count because they do not move layout. CLS is now the max <i>session window</i> (≤ 5 s, gaps &lt; 1 s), not the lifetime sum — that is why long-lived SPAs and infinite scrollers were fairly treated after the 2021 change. bfcache restores report fresh CLS.</p>
  <p><b>Budgets and process.</b> Put numbers in CI (Lighthouse CI, <code>web-vitals</code> in synthetic tests), watch RUM dashboards segmented by country and device class, and alert on p75 regressions per release. Think in <i>percentiles</i>: fixing the median does nothing if the slowest quarter of users is on a cheap phone.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI site builders and component generators produce visually rich pages — huge hero images, carousels, late-hydrated chat widgets, injected "AI assistant" bubbles — that often wreck LCP and CLS. Meanwhile AI crawlers and answer engines care about fast, stable, text-rich HTML, so the same fixes help both users and bots.</p>
  <p><b>Use AI as a partner:</b> feed it your RUM export or a Lighthouse JSON and ask <code>Rank the problems by expected p75 gain; for LCP, classify which of the four sub-parts dominates.</code> AI is excellent at summarising a big trace and proposing hypotheses; ask it for the <i>test that would prove each hypothesis</i>.</p>
  <p><b>Where AI goes wrong:</b> it recommends "lazy-load all images" (including your LCP image), invents thresholds from before 2024 (still saying FID), and optimises the Lighthouse score instead of the user's real experience. It also may add a "performance" library whose own JavaScript worsens INP.</p>
  <p><b>What you must still own:</b> choosing what to measure, interpreting field vs lab, and trade-offs (for example, ads revenue versus CLS). Be ready to say: "LCP element is the hero; 62% of its time is load delay, so preloading with <code>fetchpriority=high</code> is the fix".</p>`,
  problems: [
    {
      title: 'Compute CLS with Session Windows', level: 'Hard', tags: ['web vitals', 'CLS', 'sliding window'], companies: ['Google', 'Shopify'],
      statement: `<p>You receive a time-sorted list of layout shifts <code>[{ t, v }]</code> where <code>t</code> is milliseconds since navigation and <code>v</code> is that shift's score. Compute the page's <b>CLS</b> using Chrome's current definition: group shifts into <b>session windows</b> — a window starts at a shift, continues while each next shift is <b>less than or equal to 1000 ms</b> after the previous one, and ends when the window would exceed <b>5000 ms</b> from its first shift. CLS = the largest window sum. Shifts caused within 500 ms of user input are marked <code>input: true</code> and must be ignored.</p>`,
      constraints: `0 ≤ shifts ≤ 10<sup>5</sup>, sorted by t, 0 ≤ v ≤ 1. One pass, O(1) extra space.`,
      example: `<p>Shifts: (500, 0.04), (900, 0.05), (1300, 0.04), (9000, 0.02), (9100, 0.30 <i>with input</i>)</p>${H.arr([0.04, 0.05, 0.04], { label: 'window A (500..1300)', hl: { 0: 'g', 1: 'g', 2: 'g' } })}${H.arr([0.02], { label: 'window B (9000..)', hl: { 0: 'b' } })}<p>Window A = ${H.c('g', '0.13')}, window B = 0.02 (the 0.30 shift is ignored because the user caused it). <b>CLS = 0.13</b> → needs improvement.</p>`,
      brute: { why: `<p>The old definition: just add up <i>every</i> shift for the whole life of the page. It over-punishes long-lived pages (a single-page app open for an hour accumulates tiny shifts and "fails" even though no burst was ever annoying), and it forgets to ignore input-driven shifts.</p>`, code: `function clsOld(shifts) {
  let total = 0;
  for (const s of shifts) total += s.v;   // counts everything, forever
  return total;
}` },
      mcq: { q: 'Two bursts of shifts: burst A sums to 0.08 at 1 s, burst B sums to 0.07 at 30 s. What is CLS?', options: ['0.15', '0.08', '0.07', '0.075'], answer: 1, explain: 'CLS is the single worst session window, not the total. The windows are separated by far more than 1 s, so they never merge; the max is 0.08.' },
      hints: [`<p>You only ever need the sum of the <b>current</b> window and the best sum seen so far.</p>`, `<p>Walk the shifts in order. If the gap from the previous shift is &gt; 1000 ms, or the time since the window's first shift is &gt; 5000 ms, reset the running sum and window start.</p>`, `<p>Recipe: skip shifts with <code>input</code>. For each remaining shift decide "same window or new?", add <code>v</code> to the running sum, update <code>best = max(best, sum)</code>. Watch the boundary: gap exactly 1000 ms still belongs to the window ("less than or equal"). Empty input → 0.</p>`],
      solution: {
        approach: `<p>A single sweep with two timestamps (<code>windowStart</code>, <code>lastShift</code>) and a running sum. A new window begins when the gap exceeds 1000 ms or the window span exceeds 5000 ms. Track the maximum running sum. Input-driven shifts are filtered first and do not affect gaps (Chrome ignores them entirely).</p>`,
        code: { lang: 'js', run: true, code: `function cls(shifts) {
  let best = 0;          // biggest window sum seen so far
  let sum = 0;           // sum of the current window
  let windowStart = -Infinity;
  let last = -Infinity;  // time of the previous counted shift
  for (const s of shifts) {
    if (s.input) continue;                                  // user-caused: expected, ignore
    const newWindow = s.t - last > 1000 || s.t - windowStart > 5000;
    if (newWindow) { sum = 0; windowStart = s.t; }          // start a fresh session window
    sum += s.v;
    last = s.t;
    if (sum > best) best = sum;
  }
  return best;
}

const shifts = [
  { t: 500, v: 0.04 }, { t: 900, v: 0.05 }, { t: 1300, v: 0.04 },
  { t: 9000, v: 0.02 }, { t: 9100, v: 0.3, input: true }
];
console.log('CLS =', +cls(shifts).toFixed(3));              // 0.13
// A long burst: gaps of 900ms, but the window is capped at 5s, so it splits.
const long = Array.from({ length: 10 }, (_, i) => ({ t: i * 900, v: 0.02 }));
console.log('long burst CLS =', +cls(long).toFixed(3));      // 6 shifts (0..4500) = 0.12, then new window` },
        complexity: `<p>Time O(n), space O(1).</p>`,
        followUps: ['How do you decide which element caused the worst shift in production? (<code>LayoutShift.sources</code> in a PerformanceObserver.)', 'Why did Chrome move from "sum of all" to session windows? (Fairness to long-lived pages.)']
      }
    }
  ]
});
/* =====================================================================
   TOPIC 5 — Code splitting & lazy loading
   ===================================================================== */
topics.push({
  title: 'Code Splitting & Lazy Loading: Ship Only What the Page Needs',
  analogy: `<p><b>Packing for a trip.</b> You could carry your whole wardrobe on day one (one giant suitcase = one giant JavaScript bundle). Or carry just today's outfit and have the rest shipped when you need it (<i>code splitting</i>), maybe even asking the hotel to pre-warm the iron while you're at breakfast (<i>prefetching</i>). The lighter your first suitcase, the sooner you walk out of the airport.</p>`,
  explain: `<p>A <b>bundle</b> is the file(s) your build tool (Vite, webpack, esbuild) creates from all your source and libraries. If you ship <u>one</u> big file, every visitor downloads, <i>parses</i> and <i>runs</i> code for pages they never open. JavaScript is the most expensive kind of byte: unlike an image it must be downloaded <b>and</b> compiled <b>and</b> executed on the main thread, which blocks input.</p>
  <p><b>Code splitting</b> = cutting the bundle into pieces (<i>chunks</i>) loaded when needed. <b>Lazy loading</b> = delaying a load until it is needed (route visited, button clicked, element near the viewport).</p>
  ${H.table(['Split by…', 'Example', 'When it loads'], [
    ['<b>Route</b>', '<code>/dashboard</code>, <code>/settings</code>', 'when the user navigates there'],
    ['<b>Component</b>', 'chart library, rich-text editor, map, PDF viewer, modal', 'when it is about to be shown'],
    ['<b>Vendor</b>', 'react, lodash, date library', 'on first load, but cached long-term (rarely changes)'],
    ['<b>Feature / condition</b>', 'admin tools, polyfills, A/B variants', 'only for users who need it']
  ])}
  <p>The tool is the standard <b>dynamic <code>import()</code></b>: it returns a Promise for the module, and the bundler automatically makes the target a separate chunk. In React: <code>React.lazy(() =&gt; import('./Chart'))</code> inside <code>&lt;Suspense fallback=...&gt;</code>.</p>
  <p><b>Lazy loading other things:</b> images and iframes with <code>loading="lazy"</code> (below the fold only!), components when they scroll into view with <code>IntersectionObserver</code>, and data on demand.</p>
  <p><b>Watch out:</b> never lazy-load what is needed for the first screen (your LCP image, above-the-fold UI) — that just moves it later. And a click on a lazy button should not feel slow: <b>prefetch</b> the chunk on hover or when idle (<code>&lt;link rel="prefetch"&gt;</code> or <code>/* webpackPrefetch: true */</code>).</p>`,
  clues: [
    '"Initial bundle is 2 MB / Lighthouse says reduce unused JavaScript" → code splitting',
    '"Time to Interactive is slow on mobile" → too much JS to parse and run',
    '"Load the chart/editor only when needed" → dynamic import() / React.lazy',
    '"First load vs navigating to another page" → route-based splitting',
    '"Users on slow networks click and wait for a spinner" → prefetch on hover/idle',
    '"Images below the fold" → loading="lazy" / IntersectionObserver (but not the hero)'
  ],
  code: [
    { lang: 'js', title: 'A lazy loader with caching and retry (runnable simulation)', run: true, code: `// Wrap an async loader so that: (1) it loads only on first use, (2) simultaneous callers share
// ONE request, (3) a failure is not cached forever (so the user can retry).
function lazy(loader) {
  let promise = null;
  return function load() {
    if (!promise) {
      promise = loader().catch((err) => { promise = null; throw err; }); // allow retry after failure
    }
    return promise;
  };
}

// Simulated "network": counts how many chunk downloads actually happen.
let downloads = 0;
const fakeImport = (name, ms) => () =>
  new Promise((resolve) => setTimeout(() => { downloads++; resolve({ name, render: () => 'rendered ' + name }); }, ms));

const loadChart = lazy(fakeImport('chart', 30));
const loadEditor = lazy(fakeImport('editor', 20));

(async () => {
  console.log('page loaded; downloads so far =', downloads);       // 0: nothing lazy is fetched yet
  // user opens the dashboard 3 times quickly: still ONE download
  const [a, b, c] = await Promise.all([loadChart(), loadChart(), loadChart()]);
  console.log(a.render(), '| same module object?', a === b && b === c, '| downloads =', downloads);
  await loadChart();                                                  // later visits: served from cache
  console.log('after revisit downloads =', downloads);              // still 1
  console.log((await loadEditor()).render(), '| downloads =', downloads);
})();` },
    { lang: 'js', title: 'Dynamic import in the browser, plus prefetch on intent', check: true, code: `// Click -> import() -> the bundler already put ./chart.js into its own chunk.
const btn = document.querySelector('#show-chart');

let chartPromise;                                   // cache the Promise so we import once
function loadChart() {
  chartPromise = chartPromise || import('./chart.js');
  return chartPromise;
}

// Warm the chunk when the user shows INTENT (hover/focus), so the click feels instant.
btn.addEventListener('pointerenter', loadChart, { once: true });
btn.addEventListener('focus', loadChart, { once: true });

btn.addEventListener('click', async () => {
  btn.disabled = true;
  try {
    const { drawChart } = await loadChart();         // usually already downloaded
    drawChart(document.querySelector('#chart'));
  } catch (err) {
    // Chunk can fail (offline, or a new deploy removed the old hashed file): offer a retry
    chartPromise = undefined;
    alert('Could not load the chart. Please try again.');
  } finally {
    btn.disabled = false;
  }
});

// Idle-time prefetch for the next likely page
if ('requestIdleCallback' in window) requestIdleCallback(() => import('./settings-page.js'));` },
    { lang: 'jsx', title: 'React: route-based splitting with lazy + Suspense', check: false, code: `import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Each lazy() becomes its own chunk, downloaded when the route is first visited.
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));   // pulls in the heavy chart library
const Settings = lazy(() => import('./pages/Settings'));

export default function App() {
  return (
    <BrowserRouter>
      {/* Suspense shows a fallback while the chunk loads. Make it the SAME SIZE as the page to avoid CLS. */}
      <Suspense fallback={<div style={{ minHeight: '60vh' }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}` },
    { lang: 'js', title: 'Vite / Rollup: split vendor code for long-term caching', check: false, code: `// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Put big, rarely-changing libraries in their own chunk. App code changes every deploy,
        // vendor chunks keep the same hash => returning users re-download only app code.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('chart.js') || id.includes('d3')) return 'charts'; // only used by /dashboard
            return 'vendor';
          }
        }
      }
    }
  }
});` }
  ],
  codeTitle: ['Lazy loader: cache, dedupe, retry', 'Browser dynamic import + prefetch on intent', 'React.lazy + Suspense routes', 'Vite manualChunks'],
  viz: [
    {
      title: 'Bundle chunks: before and after splitting',
      gen: function () {
        var names = ['main', 'vendor', 'home', 'dashboard', 'charts', 'editor'];
        var kb = [180, 220, 60, 240, 260, 120];
        var total = kb.reduce(function (a, b) { return a + b; }, 0);
        var initial = kb[0] + kb[1] + kb[2];
        var f = [];
        f.push({ narr: '<b>Before:</b> one bundle with everything — app shell, libraries, every page, the chart library and the rich-text editor. Total <b>' + total + ' KB</b> must be downloaded, parsed and run before the app becomes usable.', parts: [{ type: 'bars', label: 'Single bundle (KB)', values: [total], idxLabels: ['bundle.js'], texts: [total + ' KB'], hl: { 0: 'bad' } }] });
        f.push({ narr: 'The user only wants the <b>home page</b> right now. Most of that bundle (' + (total - initial) + ' KB!) is code for pages and widgets they have not opened.', parts: [{ type: 'bars', label: 'What is actually needed on the home page (KB)', values: [initial, total - initial], idxLabels: ['needed now', 'not needed yet'], texts: [initial + ' KB', (total - initial) + ' KB'], hl: { 0: 'ok', 1: 'bad' } }] });
        f.push({ narr: '<b>After splitting</b> by route, component and vendor: six chunks. Green = loaded on first visit. Grey = waits until needed.', parts: [{ type: 'bars', label: 'Chunks (KB)', values: kb, idxLabels: names, texts: kb.map(function (k) { return k + ''; }), hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'done', 4: 'done', 5: 'done' } }] });
        f.push({ narr: 'First load now costs <b>' + initial + ' KB</b> instead of ' + total + ' KB — ' + Math.round((1 - initial / total) * 100) + '% less JavaScript to download and, more importantly, to parse and execute.', parts: [{ type: 'bars', label: 'Initial JS (KB)', values: [total, initial], idxLabels: ['before', 'after'], texts: [total + ' KB', initial + ' KB'], hl: { 0: 'bad', 1: 'ok' } }] });
        var dash = kb[3] + kb[4];
        f.push({ narr: 'The user clicks <b>Dashboard</b>. Only now do the <code>dashboard</code> and <code>charts</code> chunks (' + dash + ' KB) download. Meanwhile a small Suspense fallback is shown.', parts: [{ type: 'bars', label: 'Chunks (KB)', values: kb, idxLabels: names, texts: kb.map(function (k) { return k + ''; }), hl: { 0: 'done', 1: 'done', 2: 'done', 3: 'cur', 4: 'cur', 5: 'done' } }] });
        f.push({ narr: 'The <code>editor</code> chunk (' + kb[5] + ' KB) is <b>never</b> downloaded for users who never open the editor. Total transferred for this user: ' + (initial + dash) + ' KB, still less than ' + total + ' KB — and spread out over time.', parts: [{ type: 'bars', label: 'Bytes this user downloaded (KB)', values: [initial, dash, 0], idxLabels: ['first load', 'on /dashboard', 'editor (never)'], texts: [initial + '', dash + '', '0'], hl: { 0: 'ok', 1: 'cur', 2: 'done' } }] });
        return f;
      }
    },
    {
      title: 'What import() does, step by step',
      gen: function () {
        function g(hl, ehl, tags, label) {
          return { type: 'graph', directed: true, height: 50, label: label || 'Lazy chunk loading', nodes: [
            { id: 'U', label: 'User click', x: 10, y: 25, shape: 'box' }, { id: 'M', label: 'main.js', x: 34, y: 25, shape: 'box' },
            { id: 'C', label: 'Module cache', x: 62, y: 8, shape: 'box' }, { id: 'N', label: 'Network / CDN', x: 62, y: 42, shape: 'box' },
            { id: 'K', label: 'chart chunk', x: 90, y: 25, shape: 'box' }], edges: [['U', 'M'], ['M', 'C'], ['M', 'N'], ['N', 'K'], ['C', 'K']], hl: hl, ehl: ehl, tags: tags || {} };
        }
        return [
          { narr: 'The page has loaded <code>main.js</code> only. The chart code lives in a separate file that has <b>not</b> been downloaded.', parts: [g({ M: 'ok' }, {}, { K: 'not loaded' })] },
          { narr: 'The user clicks "Show chart". Our handler runs <code>import("./chart.js")</code>.', parts: [g({ U: 'cur', M: 'cur' }, { 'U-M': 'ok' }, {})] },
          { narr: 'The loader first looks in the <b>module cache</b>. First time: miss.', parts: [g({ M: 'cur', C: 'bad' }, { 'M-C': 'bad' }, { C: 'miss' })] },
          { narr: 'So it asks the network (the browser HTTP cache or CDN may answer instantly on repeat visits).', parts: [g({ M: 'done', N: 'cur' }, { 'M-N': 'ok' }, { N: 'GET /chart.9f2a.js' })] },
          { narr: 'The chunk arrives and is parsed and evaluated. The Promise from <code>import()</code> resolves with the module\'s exports.', parts: [g({ N: 'done', K: 'ok' }, { 'N-K': 'ok' }, { K: 'executed' })] },
          { narr: 'Next time someone calls <code>import("./chart.js")</code> it is a cache <span class="c-g">hit</span> — no network, instant, same module object. This is why you can safely call it more than once.', parts: [g({ M: 'cur', C: 'ok', K: 'ok' }, { 'M-C': 'ok', 'C-K': 'ok' }, { C: 'hit' })] }
        ];
      }
    }
  ],
  examples: [
    {
      title: 'Route-based splitting for a 5-page app',
      html: `<p>Home, Products, Product detail, Checkout, Admin. Without splitting every visitor downloads the Admin code. With <code>lazy(() =&gt; import(...))</code> per route, Admin (visited by 1% of users) costs the other 99% nothing. This is the highest-payoff, lowest-risk split — do it first.</p>
      ${H.table(['Route', 'Chunk (KB)', 'Visitors needing it'], [['Home (+ shell)', '120', '100%'], ['Products', '70', '80%'], ['Checkout', '90', '15%'], ['Admin', '260', '<span class="c-g">1%</span>']])}`
    },
    {
      title: 'Component-level split: the heavy chart library',
      html: `<p>A 200 KB chart library used in one modal. Import it with <code>await import('chart.js')</code> inside the click handler, or wrap the modal in <code>React.lazy</code>. Add a prefetch on button hover so the click feels immediate.</p>`,
      code: { lang: 'jsx', check: false, code: `const ChartModal = lazy(() => import('./ChartModal'));   // chart library ships inside this chunk

function Report() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} onPointerEnter={() => import('./ChartModal')}>Show chart</button>
      {open && <Suspense fallback={<Spinner />}><ChartModal onClose={() => setOpen(false)} /></Suspense>}
    </>
  );
}` }
    },
    {
      title: 'Lazy-load images below the fold',
      html: `<p>Add <code>loading="lazy"</code> to images that start off-screen: the browser downloads them when they approach the viewport. <b>Never</b> put it on the LCP/hero image — that delays discovery and hurts LCP. Always keep <code>width</code>/<code>height</code> so lazy images do not cause CLS.</p>`,
      code: { lang: 'html', code: `<!-- Hero: eager + high priority -->
<img src="/hero.avif" width="1200" height="600" fetchpriority="high" alt="Hero">

<!-- Below the fold: lazy and decoded off the main path -->
<img src="/gallery-1.avif" width="400" height="300" loading="lazy" decoding="async" alt="Gallery 1">
<iframe src="https://www.youtube.com/embed/xyz" width="560" height="315" loading="lazy" title="Video"></iframe>` }
    },
    {
      title: 'Lazy-render a component when it scrolls into view',
      html: `<p>Use <code>IntersectionObserver</code> to import a heavy widget (comments, map) only once its placeholder is within 200 px of the viewport. Reserve the placeholder's height so nothing jumps.</p>`,
      code: { lang: 'js', code: `const slot = document.querySelector('#comments');
const io = new IntersectionObserver(async (entries) => {
  if (!entries[0].isIntersecting) return;
  io.disconnect();                                   // load only once
  const { mountComments } = await import('./comments.js');
  mountComments(slot);
}, { rootMargin: '200px' });                         // start a bit BEFORE it is visible
io.observe(slot);` }
    }
  ],
  deepDive: `<p><b>Why JS is the expensive byte.</b> A 300 KB image costs download time then a cheap decode (off the main thread). 300 KB of gzipped JavaScript expands to ~1 MB of source that must be parsed, compiled and executed on the main thread. On a mid-range phone this can take over a second, and during it the page ignores taps — hurting INP. Rule of thumb: keep the initial JS to roughly a couple hundred KB gzipped for mobile-heavy audiences, and judge by real-device numbers.</p>
  <p><b>How bundlers split.</b> Every <code>import()</code> is a split point. The bundler builds a module graph and creates chunks; modules shared by several chunks are lifted into <i>common chunks</i> (webpack <code>splitChunks</code>, Rollup automatic chunking). Content-hashed filenames (<code>chart.9f2a.js</code>) allow <code>Cache-Control: immutable, max-age=1y</code> — returning visitors re-download only changed chunks. Splitting into many tiny chunks hurts compression and adds requests; HTTP/2/3 multiplexing makes moderate counts fine, but dozens of tiny chunks in a <i>waterfall</i> (A imports B imports C) are slow. Fix waterfalls with <code>modulepreload</code> or by loading dependencies in parallel.</p>
  <p><b>Tree shaking.</b> Different from splitting: removing unused exports. Needs ES modules, side-effect-free packages (<code>"sideEffects": false</code>), and imports like <code>import { debounce } from 'lodash-es'</code> (not the CJS <code>lodash</code>). "Barrel" files (<code>index.js</code> re-exporting everything) can defeat it. Always check with a bundle analyzer (<code>vite-bundle-visualizer</code>, <code>webpack-bundle-analyzer</code>, <code>source-map-explorer</code>) — the biggest wins are usually one forgotten dependency like a full moment.js with locales.</p>
  <p><b>Failure modes.</b> After a deploy, old hashed chunk files may disappear; a user with an open tab then hits <code>ChunkLoadError</code> when navigating. Handle by catching import errors and reloading, keeping old assets for a while, or using a service worker. Suspense fallbacks must match layout size (avoid CLS) and show quickly (skeletons). SSR/RSC: with React Server Components, server-only code never ships to the browser at all — the strongest form of "splitting". The <i>islands architecture</i> (Astro) hydrates only interactive parts.</p>
  <p><b>Prefetch vs preload vs modulepreload.</b> <code>preload</code> = needed for the current page, high priority. <code>prefetch</code> = might be needed for the next navigation, lowest priority, idle time. <code>modulepreload</code> = fetch + parse a module and its dependencies for ES modules. Misusing preload on many resources steals bandwidth from what matters.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI coding assistants pull in big dependencies casually (<code>import _ from 'lodash'</code>, <code>moment</code>, an entire icon set) to solve a 3-line problem, and happily add AI SDKs and chat widgets that weigh hundreds of KB. At the same time, "AI features" in the browser (on-device models via WebGPU/WASM, transformers.js, speech) are huge — they <i>must</i> be lazy-loaded behind user intent with a progress UI.</p>
  <p><b>Use AI as a partner:</b> paste a bundle-analyzer JSON or the treemap summary and ask <code>Which 5 modules cost the most for the first route, and what is the smallest change to remove or defer each?</code> AI is great for "replace moment with date-fns/Temporal", "convert this import to a per-method import", and for writing the <code>manualChunks</code> function you then verify.</p>
  <p><b>Where AI goes wrong:</b> it wraps <i>everything</i> in <code>React.lazy</code> (including above-the-fold UI, creating a loading waterfall), forgets the Suspense fallback size (CLS), and never mentions chunk-load failures after deploys. It may also claim a library is "tree-shakeable" without checking.</p>
  <p><b>What you must still own:</b> deciding the split points from real usage data (which routes people visit), setting a byte budget in CI, and verifying on a throttled device that first load got faster and navigation still feels instant.</p>`,
  problems: [
    {
      title: 'Lazy Loader with Dedupe and Retry', level: 'Medium', tags: ['dynamic import', 'promises', 'caching'], companies: ['Airbnb', 'Netflix', 'Uber'],
      statement: `<p>Implement <code>lazy(loader)</code> where <code>loader</code> is an async function that downloads a chunk. It returns a function <code>load()</code> that: (1) does <b>not</b> call the loader until <code>load()</code> is first called, (2) if called several times at once or later, calls the loader only <b>once</b> and returns the same result, (3) if the loader <b>fails</b>, does not remember the failure — the next <code>load()</code> tries again. This is how <code>import()</code> and <code>React.lazy</code> behave.</p>`,
      constraints: `The loader may take any time; calls to <code>load()</code> may overlap. Return a Promise every time.`,
      example: `<p>Loader fails once, then succeeds. Calls: <code>load()</code> → rejects; <code>load()</code> → loader is called again → resolves "chart"; <code>load()</code> → resolves "chart" without a third call.</p>${H.table(['Call', 'Loader invocations', 'Result'], [['1st', '1', '<span class="c-r">rejected</span>'], ['2nd', '2', '<span class="c-g">"chart"</span>'], ['3rd', '2', '<span class="c-g">"chart" (cached)</span>']])}`,
      brute: { why: `<p>Just call the loader on every <code>load()</code>. If a button is clicked three times quickly the same 200 KB chunk is requested three times; each result is a different object (state inside the module is duplicated). It wastes bandwidth and can even create three copies of a singleton library.</p>`, code: `function lazyNaive(loader) {
  return function load() {
    return loader();          // new download on EVERY call
  };
}` },
      mcq: { q: 'Why cache the Promise itself rather than the resolved value?', options: ['Promises use less memory', 'So concurrent callers made before it resolves also share the same request', 'Because await only works on cached values', 'It is required by the ES specification'], answer: 1, explain: 'If you cache only the value, two calls made while the download is still in flight both start downloads. Caching the Promise de-duplicates in-flight work too.' },
      hints: [`<p>The first caller creates the work; later callers should <i>reuse</i> that work. What object represents "work in progress"? A Promise.</p>`, `<p>Keep one variable <code>promise</code> in a closure. If it is empty, call the loader and store the returned Promise. Always return the stored Promise.</p>`, `<p>Failure handling: attach <code>.catch</code> that resets <code>promise = null</code> and re-throws, so the caller still sees the error but the next call retries. Careful: only reset if the failed promise is still the stored one (avoid a race).</p>`],
      solution: {
        approach: `<p>Store the in-flight Promise in a closure variable. On rejection, clear it (if it is still the same promise) and re-throw, so errors are visible but not permanent. We also pass the same Promise to concurrent callers, so there is exactly one network request per success.</p>`,
        code: { lang: 'js', run: true, code: `function lazy(loader) {
  let promise = null;
  return function load() {
    if (promise === null) {
      const p = Promise.resolve().then(loader);            // loader runs on first call only
      promise = p;
      p.catch(() => { if (promise === p) promise = null; }); // forget failures so a retry is possible
    }
    return promise;
  };
}

let calls = 0;
const load = lazy(async () => {
  calls++;
  if (calls === 1) throw new Error('network down');       // first attempt fails
  return 'chart';
});

(async () => {
  try { await load(); } catch (e) { console.log('1st:', e.message, '| loader calls =', calls); }
  console.log('2nd:', await load(), '| loader calls =', calls);
  const [x, y] = await Promise.all([load(), load()]);       // concurrent + cached
  console.log('3rd/4th:', x, y, '| loader calls =', calls);
})();` },
        complexity: `<p>Time O(1) per call (plus loader time once). Space O(1).</p>`,
        followUps: ['Add a timeout so a hanging download is treated as a failure.', 'Add a <code>preload()</code> method that starts loading without waiting (for hover prefetch).']
      }
    }
  ]
});
/* =====================================================================
   TOPIC 6 — Image optimization
   ===================================================================== */
topics.push({
  title: 'Image Optimization: Formats, srcset, sizes & Priority',
  analogy: `<p><b>Moving a sofa.</b> You would not rent a lorry for a cushion, and you would not squeeze a sofa into a car. Match the vehicle to the load. Images are the same: a phone showing a 390 px-wide photo should get a small file, a big 4K monitor gets a larger one, and the file should be packed as tightly as possible (modern format). Sending a 4000 px, 3 MB photo to a phone is shipping the sofa in a lorry to carry one cushion.</p>`,
  explain: `<p>Images are usually the <b>heaviest</b> part of a page and very often the <b>LCP element</b>, so optimising them is the single most common performance win. There are four levers:</p>
  <ol>
    <li><b>Right format</b> — pick the one that makes the file smallest for the picture type.</li>
    <li><b>Right size</b> — send pixels the screen can actually show (responsive images with <code>srcset</code> + <code>sizes</code>).</li>
    <li><b>Right time</b> — hero image eagerly with high priority; images below the fold lazily.</li>
    <li><b>Right reservation</b> — <code>width</code> and <code>height</code> (or <code>aspect-ratio</code>) so nothing jumps (CLS).</li>
  </ol>
  ${H.table(['Format', 'Best for', 'Typical size vs JPEG', 'Notes'], [
    ['<b>AVIF</b>', 'Photos, hero images', '<span class="c-g">~40-50% smaller</span>', 'Best compression; slower to encode; supported by all current major browsers'],
    ['<b>WebP</b>', 'Photos and graphics', '~25-35% smaller', 'Great fallback; supports transparency and animation'],
    ['<b>JPEG</b>', 'Photos (universal fallback)', 'baseline', 'Use progressive, quality ~75-80'],
    ['<b>PNG</b>', 'Screenshots, sharp graphics needing lossless', 'often much bigger for photos', 'Do not use for photos'],
    ['<b>SVG</b>', 'Logos, icons, simple illustrations', 'tiny', 'Vector: perfect at any size; minify with SVGO'],
    ['<b>GIF</b>', '(avoid)', 'huge', 'Replace animated GIFs with muted looping &lt;video&gt; or animated WebP/AVIF']
  ])}
  <p><b>Responsive images.</b> <code>srcset="a.jpg 400w, b.jpg 800w, c.jpg 1600w"</code> lists the files and their real pixel widths. <code>sizes="(min-width: 800px) 50vw, 100vw"</code> tells the browser how wide the picture will be <i>on screen</i> (CSS layout width). The browser multiplies by the device pixel ratio (DPR) and picks the smallest file that is at least that wide.</p>
  <p>Example: phone, 390 px wide, image fills the width, DPR 3 → needs 390 × 3 = <b>1170</b> px → choose the 1600w file (not 400w: blurry; not 2400w: wasteful).</p>
  <p><b>Priority.</b> The LCP hero: no <code>loading="lazy"</code>, add <code>fetchpriority="high"</code>, optionally preload. Everything below the fold: <code>loading="lazy"</code> and <code>decoding="async"</code>.</p>`,
  clues: [
    '"Reduce image payload / Lighthouse: Serve images in next-gen formats" → AVIF / WebP',
    '"Properly size images" → srcset + sizes, do not ship desktop images to mobile',
    '"Retina / high-DPI screens" → DPR and w descriptors',
    '"Hero image is the LCP and loads late" → fetchpriority=high, preload, not lazy, in the HTML',
    '"Page jumps when images appear" → width/height or aspect-ratio',
    '"Animated GIF is 8 MB" → convert to MP4/WebM video'
  ],
  code: [
    { lang: 'js', title: 'How the browser picks from srcset (runnable)', run: true, code: `// Needed pixel width = (slot width in CSS px) * (device pixel ratio).
// Pick the SMALLEST candidate that is >= needed; if none, take the largest.
function pickCandidate(candidates, slotCssPx, dpr) {
  const needed = slotCssPx * dpr;
  const sorted = [...candidates].sort((a, b) => a.w - b.w);
  for (const c of sorted) if (c.w >= needed) return { ...c, needed };
  return { ...sorted[sorted.length - 1], needed };
}

const srcset = [
  { url: 'hero-400.avif', w: 400, kb: 18 },
  { url: 'hero-800.avif', w: 800, kb: 52 },
  { url: 'hero-1200.avif', w: 1200, kb: 96 },
  { url: 'hero-1600.avif', w: 1600, kb: 150 },
  { url: 'hero-2400.avif', w: 2400, kb: 320 }
];

const devices = [
  { name: 'Small phone  (360px, DPR 2, full width)', slot: 360, dpr: 2 },
  { name: 'Modern phone (390px, DPR 3, full width)', slot: 390, dpr: 3 },
  { name: 'Laptop       (1440px, image is 50vw=720px, DPR 1)', slot: 720, dpr: 1 },
  { name: 'Retina laptop(1440px, 720px slot, DPR 2)', slot: 720, dpr: 2 }
];
for (const d of devices) {
  const p = pickCandidate(srcset, d.slot, d.dpr);
  console.log(d.name.padEnd(52), 'need', String(p.needed).padStart(4), 'px ->', p.url, '(' + p.kb + ' KB)');
}
console.log('Without srcset everyone downloads the 2400px file: 320 KB.');` },
    { lang: 'html', title: 'Production-grade responsive image markup', code: `<!-- Hero (LCP): modern formats with fallback, correct sizes, high priority, never lazy -->
<picture>
  <source type="image/avif"
          srcset="/img/hero-400.avif 400w, /img/hero-800.avif 800w, /img/hero-1200.avif 1200w, /img/hero-1600.avif 1600w"
          sizes="(min-width: 1000px) 1000px, 100vw">
  <source type="image/webp"
          srcset="/img/hero-400.webp 400w, /img/hero-800.webp 800w, /img/hero-1200.webp 1200w, /img/hero-1600.webp 1600w"
          sizes="(min-width: 1000px) 1000px, 100vw">
  <img src="/img/hero-1200.jpg" width="1600" height="900" alt="Sunrise over the Alps"
       fetchpriority="high" decoding="async">
</picture>

<!-- Art direction: a tighter crop on small screens -->
<picture>
  <source media="(max-width: 600px)" srcset="/img/hero-portrait-800.avif" type="image/avif">
  <img src="/img/hero-wide-1600.avif" width="1600" height="700" alt="Team at work">
</picture>

<!-- Below the fold -->
<img src="/img/card-400.webp" srcset="/img/card-400.webp 400w, /img/card-800.webp 800w"
     sizes="(min-width: 800px) 33vw, 100vw" width="400" height="300" loading="lazy" decoding="async" alt="Product">

<!-- Preload the hero early (helps when it is discovered late, e.g. CSS background) -->
<link rel="preload" as="image" href="/img/hero-1200.avif" imagesrcset="/img/hero-800.avif 800w, /img/hero-1600.avif 1600w" imagesizes="100vw" fetchpriority="high">` },
    { lang: 'js', title: 'Build step: generate sizes and formats with sharp', check: false, code: `// Node script (npm i sharp): create 4 widths x 3 formats from one master image
const sharp = require('sharp');
const widths = [400, 800, 1200, 1600];

async function build(input, outBase) {
  for (const w of widths) {
    const img = sharp(input).resize({ width: w, withoutEnlargement: true }); // never upscale
    await img.clone().avif({ quality: 50 }).toFile(outBase + '-' + w + '.avif');
    await img.clone().webp({ quality: 75 }).toFile(outBase + '-' + w + '.webp');
    await img.clone().jpeg({ quality: 78, progressive: true, mozjpeg: true }).toFile(outBase + '-' + w + '.jpg');
  }
}
build('master/hero.jpg', 'public/img/hero').then(() => console.log('done'));` }
  ],
  codeTitle: ['srcset candidate chooser', 'picture / srcset / sizes / priority markup', 'Generating variants with sharp'],
  viz: [
    {
      title: 'Which srcset file does the browser choose?',
      input: '390 3 100',
      inputLabel: 'viewport width (CSS px), DPR, image width as % of viewport',
      gen: function (input) {
        var v = String(input).trim().split(/[\s,]+/).map(Number);
        if (v.length !== 3 || v.some(function (x) { return isNaN(x) || x <= 0; }) || v[2] > 100 || v[1] > 5 || v[0] > 4000) throw new Error('Enter: viewportWidth DPR percent   (example: 390 3 100)');
        var vw = v[0], dpr = v[1], pct = v[2];
        var cw = [400, 800, 1200, 1600, 2400], kb = [18, 52, 96, 150, 320];
        var slot = vw * pct / 100, need = Math.round(slot * dpr);
        var pick = cw.length - 1, i;
        for (i = 0; i < cw.length; i++) { if (cw[i] >= need) { pick = i; break; } }
        var f = [];
        f.push({ narr: 'The page offers 5 files of the same image: ' + cw.join(', ') + ' px wide. The browser must choose one <i>before</i> downloading. Let us do its maths.', parts: [{ type: 'bars', label: 'File width in pixels (srcset w descriptors)', values: cw, idxLabels: cw.map(function (w) { return w + 'w'; }), hl: {} }] });
        f.push({ narr: 'Step 1 — the slot: the image is shown at <b>' + pct + '%</b> of a <b>' + vw + ' px</b> viewport = <b>' + Math.round(slot) + ' CSS px</b> wide. That is what the <code>sizes</code> attribute tells the browser.', parts: [{ type: 'vars', vals: { 'viewport (CSS px)': vw, 'sizes → slot': Math.round(slot) + ' CSS px' }, hl: { 'sizes → slot': 'cur' } }] });
        f.push({ narr: 'Step 2 — multiply by the device pixel ratio (' + dpr + '): the screen has ' + dpr + '×' + dpr + ' physical pixels per CSS pixel, so it needs <b>' + need + ' real pixels</b> of width to look sharp.', parts: [{ type: 'vars', vals: { 'slot (CSS px)': Math.round(slot), 'DPR': dpr, 'needed pixels': need }, hl: { 'needed pixels': 'cur' } }] });
        var hl = {}; cw.forEach(function (w, k) { hl[k] = w < need ? 'bad' : 'done'; });
        f.push({ narr: 'Step 3 — compare. Red files are narrower than ' + need + ' px: they would look <span class="c-r">blurry</span>.', parts: [{ type: 'bars', label: 'Candidates vs needed (' + need + ' px)', values: cw, idxLabels: cw.map(function (w) { return w + 'w'; }), hl: hl }] });
        hl = {}; cw.forEach(function (w, k) { hl[k] = k < pick ? 'bad' : k === pick ? 'ok' : 'done'; });
        f.push({ narr: 'Step 4 — pick the <b>smallest file that is wide enough</b>: <b>' + cw[pick] + 'w</b>' + (cw[pick] < need ? ' (nothing is wide enough, so take the biggest)' : '') + '. Bigger files would be wasted bytes.', parts: [{ type: 'bars', label: 'Chosen candidate', values: cw, idxLabels: cw.map(function (w) { return w + 'w'; }), hl: hl, ptr: (function () { var p = {}; p[pick] = 'pick'; return p; })() }] });
        f.push({ narr: 'Download size: <b>' + kb[pick] + ' KB</b> instead of ' + kb[4] + ' KB if every device got the biggest file — <span class="c-g">' + Math.round((1 - kb[pick] / kb[4]) * 100) + '% saved</span>. Multiply by every image on the page and every visitor.', parts: [{ type: 'bars', label: 'KB transferred', values: [kb[4], kb[pick]], idxLabels: ['one size for all (2400w)', 'srcset choice'], texts: [kb[4] + ' KB', kb[pick] + ' KB'], hl: { 0: 'bad', 1: 'ok' } }] });
        return f;
      }
    },
    {
      title: 'Format shoot-out for one photo',
      gen: function () {
        var names = ['PNG', 'JPEG q80', 'WebP', 'AVIF'];
        var kb = [1800, 260, 180, 120];
        return [
          { narr: 'Same 1600×900 landscape photo saved four ways (typical figures, your photo will vary). <b>PNG</b> is lossless, which is a disaster for photos: ' + kb[0] + ' KB.', parts: [{ type: 'bars', label: 'File size (KB)', values: [kb[0]], idxLabels: [names[0]], texts: [kb[0] + ''], hl: { 0: 'bad' } }] },
          { narr: '<b>JPEG</b> at quality 80 uses lossy compression tuned for photos: <b>' + kb[1] + ' KB</b> — already 7× smaller, visually almost identical.', parts: [{ type: 'bars', label: 'File size (KB)', values: kb.slice(0, 2), idxLabels: names.slice(0, 2), texts: ['1800', '260'], hl: { 0: 'done', 1: 'cur' } }] },
          { narr: '<b>WebP</b> is a newer codec: about 30% smaller than JPEG at similar quality → <b>' + kb[2] + ' KB</b>.', parts: [{ type: 'bars', label: 'File size (KB)', values: kb.slice(0, 3), idxLabels: names.slice(0, 3), texts: ['1800', '260', '180'], hl: { 0: 'done', 1: 'done', 2: 'ok' } }] },
          { narr: '<b>AVIF</b> is better still: about 50% smaller than JPEG → <b>' + kb[3] + ' KB</b>. Cost: slower to encode (do it at build time or in a CDN, not per request).', parts: [{ type: 'bars', label: 'File size (KB)', values: kb, idxLabels: names, texts: ['1800', '260', '180', '120'], hl: { 0: 'bad', 1: 'cur', 2: 'ok', 3: 'sel' } }] },
          { narr: 'Deliver with <code>&lt;picture&gt;</code>: the browser takes the first <code>&lt;source&gt;</code> it supports (AVIF → WebP → JPEG fallback). Old browsers still work, new ones save bandwidth. Logos/icons? Use <b>SVG</b> — often under 5 KB and sharp at any size.', parts: [{ type: 'table', label: 'Which format when?', columns: ['Picture type', 'Use'], rows: [['Photo / hero', 'AVIF → WebP → JPEG'], ['Logo, icon, simple art', 'SVG'], ['Screenshot with text, needs lossless', 'WebP lossless or PNG'], ['Short animation', 'MP4/WebM video, not GIF']], hl: { 0: 'sel' } }] }
        ];
      }
    }
  ],
  examples: [
    {
      title: 'The missing sizes attribute',
      html: `<p>With <code>srcset</code> but <b>no</b> <code>sizes</code>, the browser assumes the image is <b>100vw</b> wide. Your layout shows a 300 px thumbnail in a 3-column grid, but the browser thinks it is full-screen: on a 1440 px, DPR 2 laptop it needs 2880 px → downloads the biggest file for a thumbnail!</p>
      ${H.table(['Markup', 'Thinks slot is', 'Downloads'], [['no <code>sizes</code>', '100vw = 1440 px', '<span class="c-r">2400w (320 KB)</span>'], ['<code>sizes="(min-width:900px) 33vw, 100vw"</code>', '≈ 475 px', '<span class="c-g">1200w (96 KB) at DPR 2</span>']])}`
    },
    {
      title: 'Replace an animated GIF with video',
      html: `<p>A 6-second GIF can easily weigh 8 MB. The same clip as MP4/WebM weighs ~300 KB because video codecs reuse information between frames. Make it behave like a GIF with these attributes:</p>`,
      code: { lang: 'html', code: `<video autoplay loop muted playsinline width="480" height="270" poster="/img/demo-poster.avif" preload="metadata">
  <source src="/video/demo.webm" type="video/webm">
  <source src="/video/demo.mp4" type="video/mp4">
</video>` }
    },
    {
      title: 'Art direction with media queries',
      html: `<p>A wide banner with the product on the right looks tiny on a phone if you simply scale it down. With <code>&lt;picture&gt;&lt;source media="(max-width: 600px)"&gt;</code> you give small screens a different <i>crop</i> (a tall image focused on the product). That is <b>art direction</b>; <code>srcset</code>/<code>sizes</code> alone only changes <i>resolution</i>.</p>`
    },
    {
      title: 'Diagnosing a slow hero image',
      html: `<p>Lighthouse says LCP = 4.2 s and the LCP element is a 2.8 MB PNG hero set as a CSS <code>background-image</code> that is only discovered after the stylesheet loads. Plan: (1) convert to AVIF at 1600w (~140 KB), (2) turn it into a real <code>&lt;img&gt;</code> in the HTML so the preload scanner sees it, (3) add <code>fetchpriority="high"</code>, (4) give it <code>width</code>/<code>height</code>. Expected: load delay and load duration both collapse; LCP drops to roughly 1.5-2 s on the same connection.</p>`
    }
  ],
  deepDive: `<p><b>How selection really works.</b> The browser parses <code>sizes</code> (media conditions only — it runs <i>before</i> layout, so you cannot use percentages of parent, only <code>vw</code>, <code>px</code>, <code>calc()</code>), computes the slot, multiplies by DPR, and picks a candidate. It is allowed to deviate: it may choose a larger file already in the HTTP cache, or a smaller one on a data-saver connection. With <code>x</code> descriptors (<code>img@2x.jpg 2x</code>) you describe fixed-size images; with <code>w</code> descriptors you describe fluid layouts. Do not mix them in one <code>srcset</code>. For lazy-loaded images, <code>sizes="auto"</code> lets the browser use the real laid-out width.</p>
  <p><b>Quality knobs.</b> Lossy encoders remove detail the eye hardly notices. Typical starting qualities: JPEG ~75-80, WebP ~75, AVIF ~45-55 (AVIF quality numbers are not comparable to JPEG). Chroma subsampling (4:2:0) saves bytes on photos but blurs red text edges. Tools like <code>squoosh</code>, <code>sharp</code>, <code>libvips</code>, <code>mozjpeg</code>, and perceptual metrics (SSIM, Butteraugli, SSIMULACRA2) help choose. Strip metadata (EXIF, big colour profiles) unless needed. DPR 2-3 images can use <i>higher compression</i> than 1x because pixels are smaller and artifacts invisible.</p>
  <p><b>Delivery.</b> Image CDNs (Cloudflare Images, Cloudinary, imgix, Next.js <code>&lt;Image&gt;</code>) resize and re-encode on the fly and negotiate format using the <code>Accept</code> header (so the response needs <code>Vary: Accept</code>). Cache the transformed variants at the edge. Use immutable cache headers with hashed URLs. Limit the number of variants (round widths to a few steps) to keep cache hit rate high.</p>
  <p><b>Rendering costs.</b> Decoding a huge JPEG can take tens of ms on the main thread; <code>decoding="async"</code> and <code>img.decode()</code> help. A 4000×3000 image costs 48 MB of decoded RAM (4 bytes/pixel) even if drawn at 300 px — memory-heavy on phones; this is another reason to ship the right size. <code>content-visibility: auto</code> on image-heavy sections and <code>loading="lazy"</code> reduce work further.</p>
  <p><b>Placeholders.</b> To make loading feel faster without CLS: reserve the box, show a dominant colour or a tiny blurred preview (LQIP / BlurHash / ThumbHash, 20-30 bytes to a few hundred bytes inline). Never use a spinner for an LCP image; it adds work and does not count as the LCP.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI image generators output big (1024+ px) PNGs, and AI-generated landing pages often hotlink full-size stock photos. AI also adds new helpers: <i>smart cropping</i> (focus on the face), <i>upscaling</i>, <i>background removal</i> and <i>automatic alt text</i> in image CDNs and CMSs.</p>
  <p><b>Use AI as a partner:</b> ask it to write the <code>sharp</code> or build-plugin script that creates AVIF/WebP/JPEG variants, to generate the <code>&lt;picture&gt;</code> markup from a design, or to review a page: <code>For each img: does it have width/height, correct sizes, lazy only below the fold, and a modern format?</code> Use vision models to draft alt text, then edit it.</p>
  <p><b>Where AI goes wrong:</b> it forgets <code>sizes</code> (so every srcset becomes 100vw), adds <code>loading="lazy"</code> to the hero, writes alt text that says "image of..." or invents details, and often invents CDN URL parameters that do not exist for your provider.</p>
  <p><b>What you must still own:</b> the quality/size trade-off judged by eyes on real devices, accessibility (accurate, useful <code>alt</code>), licensing and privacy of images (AI-generated or not), and the decision of which image is the LCP element and how to prioritise it.</p>`,
  problems: [
    {
      title: 'Choose the srcset Candidate', level: 'Medium', tags: ['responsive images', 'binary search', 'srcset'], companies: ['Cloudflare', 'Shopify', 'Pinterest'],
      statement: `<p>Write <code>pickSrc(candidates, slotCssPx, dpr)</code>. <code>candidates</code> is a list of <code>{ url, w }</code> (pixel widths, unsorted, may contain duplicates of the same width). Return the <code>url</code> of the <b>smallest</b> candidate whose width is at least <code>slotCssPx × dpr</code>; if none is wide enough, return the widest. Make a single lookup fast even when a CDN gives you 10<sup>5</sup> pre-generated widths and you call it thousands of times (sort once, then binary search).</p>`,
      constraints: `1 ≤ candidates ≤ 10<sup>5</sup>; widths 1..16000; slot 1..4000; DPR 1..4 (may be fractional, like 1.5).`,
      example: `${H.arr([400, 800, 1200, 1600], { label: 'widths', hl: { 2: 'g' } })}<p>slot 390 px, DPR 3 → need <b>1170</b> → smallest ≥ 1170 is ${H.c('g', '1200')} → <code>hero-1200.avif</code>. For slot 390, DPR 5 (need 1950) → none large enough → 1600 (widest).</p>`,
      brute: { why: `<p>Scan every candidate on every call and keep the best: O(n) per lookup. With 10<sup>5</sup> candidates and thousands of lookups per page render (grids of images) that is ~10<sup>8</sup> comparisons. Sorting the list on every call is even worse: O(n log n) each time.</p>`, code: `function pickSrcNaive(candidates, slot, dpr) {
  const need = slot * dpr;
  let best = null, widest = candidates[0];
  for (const c of candidates) {                      // O(n) EVERY call
    if (c.w > widest.w) widest = c;
    if (c.w >= need && (best === null || c.w < best.w)) best = c;
  }
  return (best || widest).url;
}` },
      mcq: { q: 'Slot is 300 CSS px, DPR 2, candidates 400w, 800w, 1600w. Which is chosen?', options: ['400w', '800w', '1600w', 'None, because 600 is not a candidate'], answer: 1, explain: 'Needed = 300 x 2 = 600 px. 400 is too small (blurry), 800 is the smallest that is at least 600, 1600 would waste bytes.' },
      hints: [`<p>"Smallest value that is at least X" is a classic <b>lower bound</b> search on a sorted array.</p>`, `<p>Sort the candidates by width once (at setup). Each lookup then does binary search for the first width ≥ needed.</p>`, `<p>Recipe: <code>makePicker(candidates)</code> sorts a copy and returns <code>(slot, dpr) =&gt; ...</code>. <code>lo=0, hi=n</code>; while lo&lt;hi: mid; if w[mid] &lt; need → lo=mid+1 else hi=mid. If lo==n return last item. Beware floating point: round <code>need</code> up with <code>Math.ceil</code> since 1.5 × 333 = 499.5 needs 500 px.</p>`],
      solution: {
        approach: `<p>Precompute a sorted copy once, then answer each lookup with a lower-bound binary search. If every candidate is too narrow the search ends at the end of the array, so we fall back to the widest. <code>Math.ceil</code> on the needed width avoids picking a file that is half a pixel too small.</p>`,
        code: { lang: 'js', run: true, code: `function makePicker(candidates) {
  const sorted = [...candidates].sort((a, b) => a.w - b.w);     // once: O(n log n)
  return function pickSrc(slotCssPx, dpr) {
    const need = Math.ceil(slotCssPx * dpr);
    let lo = 0, hi = sorted.length;                              // first index with w >= need
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid].w < need) lo = mid + 1; else hi = mid;
    }
    return sorted[lo === sorted.length ? sorted.length - 1 : lo].url; // none wide enough -> widest
  };
}

const pick = makePicker([
  { url: 'hero-1600.avif', w: 1600 }, { url: 'hero-400.avif', w: 400 },
  { url: 'hero-1200.avif', w: 1200 }, { url: 'hero-800.avif', w: 800 }
]);
console.log(pick(390, 3));   // need 1170 -> hero-1200.avif
console.log(pick(300, 2));   // need 600  -> hero-800.avif
console.log(pick(390, 5));   // need 1950 -> hero-1600.avif (widest)
console.log(pick(100, 1));   // need 100  -> hero-400.avif` },
        complexity: `<p>Setup O(n log n); each lookup O(log n); space O(n).</p>`,
        followUps: ['Prefer the format by support: how would you combine this with a format list (avif, webp, jpg)?', 'How would you prefer an already-cached larger file, as browsers do?']
      }
    }
  ]
});
/* =====================================================================
   TOPIC 7 — Virtualization (windowing)
   ===================================================================== */
topics.push({
  title: 'Virtualization: Rendering 100,000 Rows with 20 DOM Nodes',
  analogy: `<p><b>A film set.</b> When a movie shows a long street, the crew does not build the whole city — only the few buildings the camera can see, and they move them as the camera moves. A <b>virtualized list</b> does the same: the page <i>looks</i> like it holds 100,000 rows (the scrollbar is the right size), but only the 15-20 rows in view (plus a few spare ones) really exist in the DOM. As you scroll, the same few "buildings" are re-dressed with new data.</p>`,
  explain: `<p>Every DOM node costs memory and slows style, layout and paint. 100,000 rows × 8 elements each = <b>800,000 nodes</b>: the tab freezes, scrolling stutters, memory explodes. <b>Virtualization</b> (also called <i>windowing</i>) renders only the rows in the <b>visible window</b>.</p>
  <p>The trick, for rows of <b>fixed height</b> <code>rowH</code>, in a viewport of height <code>viewportH</code>, scrolled by <code>scrollTop</code>:</p>
  ${H.table(['Quantity', 'Formula', 'Example (rowH 40, viewport 600, scrollTop 20000)'], [
    ['First visible row', '<code>first = floor(scrollTop / rowH)</code>', '500'],
    ['Last visible row', '<code>last = ceil((scrollTop + viewportH) / rowH) - 1</code>', '514'],
    ['Render range (with overscan 5)', '<code>start = max(0, first - 5)</code>, <code>end = min(total-1, last + 5)</code>', '495 .. 519 (25 rows)'],
    ['Shift the rendered rows down', '<code>offsetY = start * rowH</code>', '19,800 px'],
    ['Fake the full height (scrollbar)', '<code>totalHeight = total * rowH</code>', '4,000,000 px']
  ])}
  <p>The structure: a scroll container (fixed height, <code>overflow: auto</code>) → one inner "spacer" div of height <code>totalHeight</code> (so the scrollbar looks right) → the few rendered rows positioned with <code>transform: translateY(offsetY)</code>. A scroll listener (use <code>requestAnimationFrame</code>) recomputes the range.</p>
  <p><b>Overscan</b> = a few extra rows above and below the window so fast scrolling does not show blank gaps before React/JS catches up.</p>
  <p><b>Variable-height rows:</b> keep an array of <i>prefix sums</i> of row heights (<code>offset[i]</code> = top of row i) and find the first visible row with <b>binary search</b> instead of dividing. Unknown heights start as an estimate and are corrected after rendering (measure with <code>ResizeObserver</code>).</p>
  <p>Use a library in real life: <b>TanStack Virtual</b>, <b>react-window</b>, <b>react-virtuoso</b>. Know the math for the interview.</p>`,
  clues: [
    '"Render a list of 100,000 / 1 million items smoothly" → virtualization / windowing',
    '"Tab freezes with a big table" → too many DOM nodes',
    '"Infinite scroll gets slower the longer you scroll" → DOM keeps growing; window it',
    '"Compute which items are visible given scrollTop" → floor(scrollTop / rowH), ceil((scrollTop+viewportH)/rowH)',
    '"Rows have different heights" → prefix sums + binary search + measured heights',
    '"Blank flashes during fast scroll" → increase overscan, avoid heavy row render'
  ],
  code: [
    { lang: 'js', title: 'Virtual-list window calculator for fixed-height rows (runnable)', run: true, code: `// Given scroll position, which rows must exist in the DOM?
function virtualWindow({ total, rowH, viewportH, scrollTop, overscan = 3 }) {
  const totalHeight = total * rowH;
  const maxScroll = Math.max(0, totalHeight - viewportH);
  const top = Math.min(Math.max(0, scrollTop), maxScroll);             // clamp (elastic scroll can overshoot)
  const first = Math.min(total - 1, Math.floor(top / rowH));            // first row touching the viewport
  const last = Math.min(total - 1, Math.ceil((top + viewportH) / rowH) - 1); // last row touching it
  const start = Math.max(0, first - overscan);
  const end = Math.min(total - 1, last + overscan);
  return { first, last, start, end, rendered: end - start + 1, offsetY: start * rowH, totalHeight };
}

const cfg = { total: 100000, rowH: 40, viewportH: 600, overscan: 5 };
for (const scrollTop of [0, 1234, 20000, 3999400]) {
  const w = virtualWindow({ ...cfg, scrollTop });
  console.log('scrollTop', String(scrollTop).padStart(7), '-> visible', w.first + '..' + w.last,
    '| render', w.start + '..' + w.end, '(' + w.rendered + ' nodes) | translateY', w.offsetY + 'px');
}
console.log('Naive: 100000 rows rendered. Virtualized: ~25. Spacer height =', 100000 * 40, 'px');` },
    { lang: 'js', title: 'Variable-height rows: prefix sums + binary search (runnable)', run: true, code: `// offsets[i] = distance from the top to the start of row i; offsets[n] = total height.
function buildOffsets(heights) {
  const offsets = [0];
  for (const h of heights) offsets.push(offsets[offsets.length - 1] + h);
  return offsets;
}
// Largest i with offsets[i] <= y  (the row that contains pixel y)
function rowAt(offsets, y) {
  let lo = 0, hi = offsets.length - 2;                 // valid rows are 0..n-1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= y) lo = mid; else hi = mid - 1;
  }
  return lo;
}
// Chat-like messages: short ones are 30 px, long ones are 120 px.
const heights = Array.from({ length: 1000 }, (_, i) => (i % 7 === 0 ? 120 : 30));
const offsets = buildOffsets(heights);
const scrollTop = 5000, viewportH = 400;
const first = rowAt(offsets, scrollTop);
const last = rowAt(offsets, scrollTop + viewportH - 1);
console.log('total height', offsets[offsets.length - 1], 'px');
console.log('visible rows', first + '..' + last, '| translateY', offsets[first] + 'px');` },
    { lang: 'jsx', title: 'React: a minimal virtual list', check: false, code: `import { useState, useRef, useCallback } from 'react';

export function VirtualList({ items, rowH = 40, height = 600, overscan = 5, renderRow }) {
  const [scrollTop, setScrollTop] = useState(0);
  const raf = useRef(0);

  // One state update per frame, however many scroll events fire.
  const onScroll = useCallback((e) => {
    const y = e.currentTarget.scrollTop;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setScrollTop(y));
  }, []);

  const first = Math.floor(scrollTop / rowH);
  const last = Math.ceil((scrollTop + height) / rowH) - 1;
  const start = Math.max(0, first - overscan);
  const end = Math.min(items.length - 1, last + overscan);

  const rows = [];
  for (let i = start; i <= end; i++) {
    rows.push(
      <div key={i} role="row" aria-rowindex={i + 1}
           style={{ position: 'absolute', top: 0, left: 0, right: 0, height: rowH, transform: 'translateY(' + i * rowH + 'px)' }}>
        {renderRow(items[i], i)}
      </div>
    );
  }
  return (
    <div onScroll={onScroll} style={{ height, overflow: 'auto', position: 'relative' }} role="grid" aria-rowcount={items.length}>
      <div style={{ height: items.length * rowH, position: 'relative' }}>{rows}</div>
    </div>
  );
}` }
  ],
  codeTitle: ['Fixed-height window calculator', 'Variable heights with binary search', 'React virtual list'],
  viz: [
    {
      title: 'The visible window sliding over the rows',
      input: '24 40 160 1',
      inputLabel: 'total rows, row height (px), viewport height (px), overscan rows',
      gen: function (input) {
        var v = String(input).trim().split(/[\s,]+/).map(Number);
        if (v.length !== 4 || v.some(function (x) { return isNaN(x) || x < 0; }) || v[0] < 4 || v[0] > 30 || v[1] < 1 || v[2] < 1 || v[3] > 5) throw new Error('Enter: total(4-30) rowHeight viewportHeight overscan(0-5)   e.g. 24 40 160 1');
        var total = v[0], rowH = v[1], vh = v[2], os = v[3];
        var maxScroll = Math.max(0, total * rowH - vh), f = [];
        var labels = []; for (var i = 0; i < total; i++) labels.push('r' + i);
        function frame(scrollTop, note) {
          var top = Math.min(maxScroll, Math.max(0, scrollTop));
          var first = Math.min(total - 1, Math.floor(top / rowH));
          var last = Math.min(total - 1, Math.ceil((top + vh) / rowH) - 1);
          var s = Math.max(0, first - os), e = Math.min(total - 1, last + os), hl = {}, k;
          for (k = 0; k < total; k++) hl[k] = 'done';
          for (k = s; k <= e; k++) hl[k] = 'win';
          for (k = first; k <= last; k++) hl[k] = 'cur';
          return { narr: note + ' scrollTop = <b>' + top + ' px</b> → first visible row <b>' + first + '</b>, last <b>' + last + '</b>. Rendered with overscan: rows <b>' + s + '..' + e + '</b> = <b>' + (e - s + 1) + '</b> DOM nodes out of ' + total + '.', parts: [
            { type: 'array', label: 'All rows (amber = visible, blue = overscan, faded = NOT in DOM)', values: labels, hl: hl, showIdx: false },
            { type: 'vars', vals: { scrollTop: top, 'floor(scrollTop/rowH)': first, 'ceil((scrollTop+viewportH)/rowH)-1': last, 'render range': s + '..' + e, 'translateY': s * rowH + 'px', 'spacer height': total * rowH + 'px' }, hl: { 'render range': 'cur' } },
            { type: 'bars', label: 'DOM nodes: naive vs virtualized', values: [total, e - s + 1], idxLabels: ['render all', 'virtualized'], hl: { 0: 'bad', 1: 'ok' } }] };
        }
        f.push(frame(0, 'Start at the top.'));
        f.push(frame(Math.round(rowH * 1.5), 'Scroll a little: the window slides by one row.'));
        f.push(frame(Math.round(maxScroll * 0.3), 'Scroll further.'));
        f.push(frame(Math.round(maxScroll * 0.6), 'Keep scrolling.'));
        f.push(frame(maxScroll, 'Scroll to the very bottom: the window stops at the last row (clamped).'));
        f.push({ narr: 'Notice the count of rendered rows stays about the same (<b>≈ viewport rows + 2 × overscan</b>) no matter how big the list is. With 100,000 rows it is still ~25 nodes. That is why scrolling stays smooth.', parts: [{ type: 'bars', label: 'DOM nodes for a list of 100,000 rows', values: [100000, Math.ceil(vh / rowH) + 2 * os + 1], idxLabels: ['render all', 'virtualized'], hl: { 0: 'bad', 1: 'ok' } }] });
        return f;
      }
    },
    {
      title: 'Structure and event flow of a virtual list',
      gen: function () {
        function g(hl, ehl, tags) {
          return { type: 'graph', directed: true, height: 56, label: 'Virtual list internals', nodes: [
            { id: 'SC', label: 'Scroll container (600px)', x: 16, y: 10, shape: 'box', w: 22 }, { id: 'SP', label: 'Spacer: 4,000,000px', x: 16, y: 44, shape: 'box', w: 22 },
            { id: 'EV', label: 'scroll event', x: 50, y: 10, shape: 'box' }, { id: 'CA', label: 'compute range', x: 78, y: 10, shape: 'box' },
            { id: 'RE', label: 'render ~25 rows', x: 78, y: 44, shape: 'box' }, { id: 'TR', label: 'translateY(offset)', x: 50, y: 44, shape: 'box' }],
            edges: [['SC', 'EV'], ['EV', 'CA'], ['CA', 'RE'], ['RE', 'TR'], ['SP', 'SC']], hl: hl, ehl: ehl, tags: tags || {} };
        }
        return [
          { narr: 'The scroll container has a small fixed height. Inside it, a <b>spacer</b> div is made as tall as ALL rows would be. It is empty — its only job is to give the scrollbar the right size.', parts: [g({ SC: 'ok', SP: 'ok' }, { 'SP-SC': 'ok' }, { SP: 'no children' })] },
          { narr: 'The user scrolls. The browser fires <code>scroll</code> events (many per second). The handler only stores the latest <code>scrollTop</code> and asks for one animation frame.', parts: [g({ SC: 'cur', EV: 'cur' }, { 'SC-EV': 'ok' }, { EV: 'passive + rAF' })] },
          { narr: 'In the frame callback we do the cheap maths: <code>first</code>, <code>last</code>, <code>start</code>, <code>end</code>. O(1) for fixed heights, O(log n) for variable heights.', parts: [g({ EV: 'done', CA: 'cur' }, { 'EV-CA': 'ok' }, { CA: 'O(1)' })] },
          { narr: 'Render only rows <code>start..end</code> (about 25 elements). Use stable <code>key = row index</code> so existing DOM nodes are reused where possible.', parts: [g({ CA: 'done', RE: 'cur' }, { 'CA-RE': 'ok' }, { RE: 'keys = index' })] },
          { narr: 'Position them with <code>transform: translateY(...)</code> (composite-only, no layout). To the user it looks like a normal long list.', parts: [g({ RE: 'done', TR: 'sel' }, { 'RE-TR': 'ok' }, { TR: 'smooth' })] }
        ];
      }
    }
  ],
  examples: [
    {
      title: 'Worked numbers: scrollTop = 20,000 px',
      html: `<p>100,000 rows, <code>rowH = 40</code>, viewport 600 px, overscan 5, <code>scrollTop = 20000</code>.</p>
      ${H.table(['Step', 'Calculation', 'Result'], [['first', '20000 / 40 = 500', '500'], ['last', 'ceil(20600 / 40) - 1 = 515 - 1', '514'], ['start / end', '500 - 5, 514 + 5', '495 .. 519'], ['nodes rendered', '519 - 495 + 1', '<span class="c-g">25</span> (instead of 100,000)'], ['translateY', '495 × 40', '19,800 px'], ['spacer height', '100,000 × 40', '4,000,000 px']])}
      <p>Browsers cap an element's height (around 33 million px in Chrome, less in Firefox/Safari). A list of 1,000,000 × 40 px rows = 40M px would break the scroll range, so huge lists scale the scroll position or load data in pages.</p>`
    },
    {
      title: 'Variable-height rows (chat messages)',
      html: `<p>Rows are 30 px or 120 px, so <code>scrollTop / rowH</code> no longer works. Build <b>offsets</b> (prefix sums): [0, 120, 150, 180, ...]. To find the row at pixel <i>y</i> do a binary search for the largest index with <code>offsets[i] ≤ y</code> — O(log n). When a row is rendered and measured (<code>ResizeObserver</code>) its real height replaces the estimate, and the offsets after it shift. Libraries keep a "measurement cache" for this and may adjust <code>scrollTop</code> to avoid visible jumps.</p>`
    },
    {
      title: 'Alternatives and when NOT to virtualize',
      html: `<p>Virtualization adds complexity and breaks some native behaviours. Consider first:</p>
      ${H.table(['Option', 'Good when', 'Trade-off'], [
        ['Pagination / "Load more"', 'Users do not need everything', 'More clicks, simple, accessible'],
        ['<code>content-visibility: auto</code>', 'Hundreds to a few thousand blocks', 'DOM still exists (memory) but layout/paint skipped; find-in-page works'],
        ['<b>Virtualization</b>', '10,000+ rows, grids, logs, chat history', 'No Ctrl+F on unrendered rows, harder a11y, more code'],
        ['Server-side filtering/search', 'Huge datasets', 'Do not ship 100k rows to the browser at all']
      ])}`
    },
    {
      title: 'Accessibility and testing of virtual lists',
      html: `<p>Screen readers only see rendered rows, so tell them the truth: <code>aria-rowcount="100000"</code> on the grid and <code>aria-rowindex</code> on each row. Keep keyboard focus stable (do not unmount the focused row while the user uses arrow keys; use roving <code>tabindex</code>). Browser find (Ctrl+F) cannot find unrendered text — provide an in-app search. In tests (jsdom has no layout) pass fixed sizes explicitly and mock <code>getBoundingClientRect</code> / <code>ResizeObserver</code>.</p>`
    }
  ],
  deepDive: `<p><b>Why it works.</b> Browser cost is roughly linear in the number of nodes for style recalculation, layout and memory. Replacing O(N) nodes with O(viewport) nodes turns an unusable page into a smooth one. The remaining cost per scroll is the diff/render of ~25 rows — which is why row components must be cheap (memoize, avoid heavy children, do not read layout inside rows).</p>
  <p><b>Recycling vs keying.</b> Two strategies: (1) key rows by <i>data index</i>: when you scroll, React unmounts rows leaving the window and mounts new ones (simple; more mount work); (2) <i>recycle</i> a fixed pool of DOM nodes and just update their content and position (fewest allocations; harder with component state). react-window keys by index and positions absolutely; Virtuoso and native-feel libraries use more elaborate strategies for variable sizes and sticky headers.</p>
  <p><b>Scroll feel.</b> Because scrolling is handled by the compositor, JavaScript sees scroll events <i>after</i> the content already moved: if your rendering is slow you see blank areas ("checkerboarding"). Remedies: larger overscan, cheaper rows, <code>content-visibility</code>, rendering a placeholder skeleton for rows still loading, and measuring work in the Performance panel. <code>position: sticky</code> headers inside a virtual list need to be kept in the rendered set even when their index is out of range.</p>
  <p><b>Scroll anchoring &amp; dynamic content.</b> If rows above the viewport change height after measuring, content jumps. Libraries compensate by adjusting <code>scrollTop</code> by the height difference (<i>scroll anchoring</i>) — the same trick is needed when prepending older chat messages.</p>
  <p><b>2D virtualization.</b> Spreadsheets virtualize both rows and columns: compute a row range and a column range independently and render their cross-product, plus frozen headers/columns (spreadsheet-like grids are a classic machine-coding question). Canvas-based grids (Google Sheets style) go further and draw cells on a canvas, with a DOM scrollbar overlay.</p>
  <p><b>Combining with data loading.</b> Infinite scroll + virtualization: fetch pages when the window nears the end of the loaded data (IntersectionObserver on a sentinel or "end - 5 &lt; loaded count"). Keep a sparse cache keyed by page; show skeleton rows for not-yet-loaded indices so the scrollbar stays honest.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI products live on long lists: chat histories with thousands of messages, streaming responses that grow row by row, tables of embeddings or search results, log viewers for agents. Variable-height, growing, auto-scrolling content is the <i>hard</i> case for virtualization — streaming text changes a row's height while you read it.</p>
  <p><b>Use AI as a partner:</b> ask it to generate the windowing math and a property-based test (<code>for random total, rowH, scrollTop, overscan: start ≤ first ≤ last ≤ end, and rendered count ≤ ceil(viewport/rowH) + 2×overscan + 1</code>). That is a great use: precise, checkable. Also ask it to compare libraries for your needs (grid? sticky? dynamic height?).</p>
  <p><b>Where AI goes wrong:</b> it often "virtualizes" by slicing the array on every scroll event with no spacer (broken scrollbar), forgets overscan, or hand-rolls everything instead of using a maintained library. It rarely mentions accessibility or Ctrl+F. In tests it may assume jsdom has layout.</p>
  <p><b>What you must still own:</b> knowing when <i>not</i> to virtualize (pagination or server-side search is often the better product), the off-by-one boundaries, and the user-visible behaviour on a slow phone.</p>`,
  problems: [
    {
      title: 'Virtualize a 100,000-Row List', level: 'Medium', tags: ['virtualization', 'windowing', 'math'], companies: ['Meta', 'Google', 'Atlassian', 'Swiggy'],
      statement: `<p>Implement <code>getWindow({ total, rowH, viewportH, scrollTop, overscan })</code> for a fixed-row-height virtual list. Return <code>{ start, end, offsetY, totalHeight }</code>: the first and last row index to render (inclusive, including overscan), the pixel offset to translate the rendered block by, and the height of the spacer. Clamp <code>scrollTop</code> to the valid range (touch devices overscroll) and never return indices outside <code>0..total-1</code>. If <code>total</code> is 0 return <code>start = 0, end = -1</code>.</p>`,
      constraints: `0 ≤ total ≤ 10<sup>7</sup>, 1 ≤ rowH ≤ 1000, 1 ≤ viewportH ≤ 10<sup>4</sup>, 0 ≤ overscan ≤ 50, scrollTop may be negative or beyond the end. O(1) time.`,
      example: `<p><code>total=100000, rowH=40, viewportH=600, overscan=5, scrollTop=20000</code></p>${H.table(['Field', 'Value'], [['start', '495'], ['end', '519'], ['offsetY', '19800'], ['totalHeight', '4000000']])}<p>Only ${H.c('g', '25')} rows rendered instead of 100,000.</p>`,
      brute: { why: `<p>Render every row and let the browser deal with it: 100,000 <code>&lt;div&gt;</code>s means hundreds of thousands of nodes, a multi-second freeze on load, hundreds of MB of memory, and janky scrolling because style and layout work scales with node count.</p>`, code: `function renderAll(items, rowH) {
  const container = document.createElement('div');
  for (let i = 0; i < items.length; i++) {          // creates 100,000 elements up front
    const row = document.createElement('div');
    row.style.height = rowH + 'px';
    row.textContent = items[i];
    container.appendChild(row);
  }
  return container;
}` },
      mcq: { q: 'What is the job of the tall empty "spacer" element?', options: ['To hold the rendered rows', 'To make the scrollbar represent the full list height', 'To cache data', 'To trigger lazy loading'], answer: 1, explain: 'Without the spacer, the scroll container would only be as tall as the ~25 rendered rows and you could not scroll through 100,000 rows. The spacer gives the scrollbar its correct length.' },
      hints: [`<p>Only rows that touch the viewport matter. Convert the viewport (a pixel range) into a row range with division.</p>`, `<p><code>first = floor(top / rowH)</code>, <code>last = ceil((top + viewportH) / rowH) - 1</code>. Then widen by <code>overscan</code> and clamp to <code>0..total-1</code>.</p>`, `<p>Edge cases: clamp <code>top</code> to <code>[0, max(0, total*rowH - viewportH)]</code> first. <code>total = 0</code> → start 0, end -1. A list shorter than the viewport: maxScroll is 0, <code>last</code> is clamped to <code>total-1</code>. <code>offsetY = start * rowH</code>.</p>`],
      solution: {
        approach: `<p>Pure O(1) arithmetic. Clamp the scroll position, convert pixels to row indices with floor/ceil, add overscan and clamp. The rendered block is positioned at <code>start * rowH</code>, and a spacer of <code>total * rowH</code> keeps the scrollbar honest.</p>`,
        code: { lang: 'js', run: true, code: `function getWindow({ total, rowH, viewportH, scrollTop, overscan }) {
  if (total <= 0) return { start: 0, end: -1, offsetY: 0, totalHeight: 0 };
  const totalHeight = total * rowH;
  const maxScroll = Math.max(0, totalHeight - viewportH);
  const top = Math.min(Math.max(scrollTop, 0), maxScroll);       // clamp overscroll
  const first = Math.floor(top / rowH);
  const last = Math.min(total - 1, Math.ceil((top + viewportH) / rowH) - 1);
  const start = Math.max(0, first - overscan);
  const end = Math.min(total - 1, last + overscan);
  return { start, end, offsetY: start * rowH, totalHeight };
}

const base = { total: 100000, rowH: 40, viewportH: 600, overscan: 5 };
console.log(getWindow({ ...base, scrollTop: 20000 }));   // start 495, end 519, offsetY 19800
console.log(getWindow({ ...base, scrollTop: -80 }));     // clamped to the top
console.log(getWindow({ ...base, scrollTop: 9e9 }));     // clamped to the bottom
console.log(getWindow({ total: 3, rowH: 40, viewportH: 600, scrollTop: 0, overscan: 5 })); // short list` },
        complexity: `<p>Time O(1) per scroll frame; DOM nodes ≈ viewportH/rowH + 2·overscan + 1; memory independent of <code>total</code> (except the data array).</p>`,
        followUps: ['Support variable row heights with prefix sums and binary search.', 'Handle a list so tall that <code>total*rowH</code> exceeds the browser element height limit.', 'Add a <code>scrollToIndex(i)</code> that aligns row i to the top.']
      }
    }
  ]
});
/* =====================================================================
   TOPIC 8 — Throttle, debounce, rAF, passive listeners
   ===================================================================== */
topics.push({
  title: 'Taming Scroll & Input Events: Throttle, Debounce, rAF, Passive Listeners',
  analogy: `<p><b>Doorbell rules.</b> A child leans on the bell: ding-ding-ding-ding... <i>Debounce</i> = "I'll open the door only after the ringing has <u>stopped</u> for a moment" (search-as-you-type: wait until the user pauses). <i>Throttle</i> = "I'll answer at most <u>once every 10 seconds</u>, however much they ring" (scroll tracking: regular updates, never too many). <i>requestAnimationFrame</i> = "I'll answer once per <u>TV frame</u>, because that's the only time anyone can see the result."</p>`,
  explain: `<p>Some events fire <b>far faster than you can (or need to) react</b>: <code>scroll</code>, <code>resize</code>, <code>mousemove</code>, <code>pointermove</code> and <code>input</code> can fire 60-1000 times per second. If each event runs heavy code (layout reads, state updates, network calls), the main thread drowns → jank and poor INP.</p>
  ${H.table(['Tool', 'What it does', 'Use for'], [
    ['<b>Debounce</b>(fn, wait)', 'Runs <b>after</b> events stop for <code>wait</code> ms (trailing edge)', 'Search box, autosave, "resize ended", validation while typing'],
    ['<b>Throttle</b>(fn, wait)', 'Runs <b>at most once</b> per <code>wait</code> ms, steadily during the burst', 'Scroll position, drag, infinite-scroll checks, analytics sampling'],
    ['<b>requestAnimationFrame</b>', 'Runs <b>once per frame</b> (~16 ms), just before paint', 'Any visual update from scroll/pointer events'],
    ['<b>Passive listener</b> <code>{ passive: true }</code>', 'Promises never to call <code>preventDefault()</code> so scrolling is not blocked', 'All touch/wheel/scroll listeners'],
    ['<b>IntersectionObserver</b>', 'Browser tells you when something enters/leaves view', 'Replaces scroll listeners for lazy loading, "is it visible?", sentinels']
  ])}
  <p><b>Leading vs trailing edge.</b> A <i>leading</i> call fires at the start of a burst (instant feedback, e.g. a button that should react immediately and ignore double clicks). A <i>trailing</i> call fires at the end (you get the final value). Throttle usually has both: first scroll event runs immediately, then every <code>wait</code> ms, and a final call so the last position is not lost.</p>
  <p><b>Example:</b> events at 0, 100, 200, 300, 400 ms with <code>wait = 500</code>. Debounce → one call at 900 ms (400 + 500). Throttle (leading + trailing) → a call at 0 and another at 500 (with the last args). Without throttling you would have run the handler 5 times.</p>
  <p><b>Choosing wait:</b> 100-250 ms for scroll/resize feels responsive; 250-400 ms for typing/search. For visual effects prefer rAF, not a timer — a timer can fire several times between frames or not align with paints.</p>`,
  clues: [
    '"Search as you type but do not spam the API" → debounce (usually 200-400 ms) plus cancel stale requests (AbortController)',
    '"Handle scroll/resize/mousemove efficiently" → throttle or rAF, passive listener, or an observer',
    '"Fire at the start AND the end" → leading + trailing throttle',
    '"Prevent double submit" → leading-edge debounce or disable the button',
    '"Scroll handler makes the page janky" → move work to rAF, avoid layout reads, use IntersectionObserver',
    '"Implement debounce/throttle from scratch" → closures, timers, `this` and arguments, cancel/flush'
  ],
  code: [
    { lang: 'js', title: 'Throttle vs debounce with simulated timestamps (runnable)', run: true, code: `// Pure simulation: give event times (ms), get back WHEN the handler would run.
function simulateThrottle(times, wait) {            // leading + trailing
  const fired = [];
  let last = -Infinity, pending = null;             // pending = time when the trailing call is due
  for (const t of times) {
    if (pending !== null && pending <= t) { fired.push(pending); last = pending; pending = null; } // trailing fired before this event
    if (t - last >= wait) { fired.push(t); last = t; pending = null; }                          // leading call
    else if (pending === null) pending = last + wait;                                            // schedule trailing
  }
  if (pending !== null) fired.push(pending);
  return fired;
}

function simulateDebounce(times, wait) {            // trailing only
  const fired = [];
  for (let i = 0; i < times.length; i++) {
    const next = i + 1 < times.length ? times[i + 1] : Infinity;
    if (next - times[i] >= wait) fired.push(times[i] + wait); // quiet for 'wait' ms after this event
  }
  return fired;
}

const scrollEvents = [0, 100, 200, 300, 400, 1200, 1250, 2600];
console.log('events          :', scrollEvents.join(' '));
console.log('throttle(500)   :', simulateThrottle(scrollEvents, 500).join(' '));
console.log('debounce(500)   :', simulateDebounce(scrollEvents, 500).join(' '));
console.log('handler runs    : raw', scrollEvents.length, '| throttle', simulateThrottle(scrollEvents, 500).length, '| debounce', simulateDebounce(scrollEvents, 500).length);` },
    { lang: 'js', title: 'Real debounce and throttle with cancel (production style)', check: true, code: `function debounce(fn, wait, { leading = false } = {}) {
  let timer = null;
  function debounced(...args) {
    const callNow = leading && timer === null;       // leading edge: run at the start of a burst
    clearTimeout(timer);                              // every new event restarts the countdown
    timer = setTimeout(() => {
      timer = null;
      if (!leading) fn.apply(this, args);             // trailing edge: run after quiet period
    }, wait);
    if (callNow) fn.apply(this, args);
  }
  debounced.cancel = () => { clearTimeout(timer); timer = null; };
  return debounced;
}

function throttle(fn, wait) {                         // leading + trailing
  let last = 0, timer = null, lastArgs, lastThis;
  function run() { last = Date.now(); timer = null; fn.apply(lastThis, lastArgs); }
  function throttled(...args) {
    lastArgs = args; lastThis = this;                 // always remember the latest arguments
    const remaining = wait - (Date.now() - last);
    if (remaining <= 0) { clearTimeout(timer); run(); } // enough time passed: run now
    else if (timer === null) timer = setTimeout(run, remaining); // else schedule one trailing call
  }
  throttled.cancel = () => { clearTimeout(timer); timer = null; };
  return throttled;
}

// Usage
const onSearch = debounce((q) => fetchResults(q), 300);
searchInput.addEventListener('input', (e) => onSearch(e.target.value));

const onScroll = throttle(() => updateProgressBar(), 100);
window.addEventListener('scroll', onScroll, { passive: true });` },
    { lang: 'js', title: 'Search-as-you-type: debounce + abort stale requests', check: true, code: `let controller = null;
async function search(query) {
  if (controller) controller.abort();               // cancel the previous in-flight request
  controller = new AbortController();
  try {
    const res = await fetch('/api/search?q=' + encodeURIComponent(query), { signal: controller.signal });
    renderResults(await res.json());
  } catch (err) {
    if (err.name !== 'AbortError') showError(err);  // aborting is expected, not an error
  }
}
const debouncedSearch = debounce(search, 300);       // wait for a pause in typing
input.addEventListener('input', (e) => {
  const q = e.target.value.trim();
  if (q.length < 2) return;                          // avoid pointless requests
  debouncedSearch(q);
});` }
  ],
  codeTitle: ['Simulated timeline: throttle vs debounce', 'debounce / throttle implementations', 'Debounce + AbortController'],
  viz: [
    {
      title: 'Throttle vs debounce on a burst of events',
      input: '500: 0 100 200 300 400 1200 1250 2600',
      inputLabel: 'wait_ms: event times in ms (increasing)',
      gen: function (input) {
        var s = String(input).split(':');
        if (s.length !== 2) throw new Error('Format: 500: 0 100 200 300 (wait, a colon, then event times)');
        var wait = Number(s[0].trim()), times = s[1].trim().split(/[\s,]+/).map(Number);
        if (!(wait > 0) || times.length < 2 || times.length > 14 || times.some(function (x, i) { return isNaN(x) || (i > 0 && x <= times[i - 1]); })) throw new Error('Use wait > 0 and 2-14 strictly increasing times, e.g. 500: 0 100 200 300 400 1200');
        var th = [], db = [], last = -Infinity, pending = null, i;
        for (i = 0; i < times.length; i++) {
          var t = times[i];
          if (pending !== null && pending <= t) { th.push(pending); last = pending; pending = null; }
          if (t - last >= wait) { th.push(t); last = t; pending = null; } else if (pending === null) pending = last + wait;
          var nx = i + 1 < times.length ? times[i + 1] : Infinity;
          if (nx - t >= wait) db.push(t + wait);
        }
        if (pending !== null) th.push(pending);
        var f = [];
        f.push({ narr: 'A burst of <b>' + times.length + '</b> raw events (e.g. scroll events) at these times (ms). Without any control the handler would run ' + times.length + ' times.', parts: [{ type: 'array', label: 'Raw event times (ms)', values: times, showIdx: true }, { type: 'vars', vals: { wait: wait + ' ms', 'raw calls': times.length } }] });
        for (i = 0; i < times.length; i++) {
          var tt = times[i];
          var thSoFar = th.filter(function (x) { return x <= tt; }), dbSoFar = db.filter(function (x) { return x <= tt; });
          var hl = {}; hl[i] = 'cur';
          f.push({ narr: 'Event at <b>' + tt + ' ms</b>. Handler runs so far — <b>throttle</b>: ' + thSoFar.length + ' (steady ticks, at most one per ' + wait + ' ms). <b>debounce</b>: ' + dbSoFar.length + ' (only after a ' + wait + ' ms silence).', parts: [
            { type: 'array', label: 'Raw event times (ms)', values: times, hl: hl },
            { type: 'array', label: 'Throttle ran at (ms)', values: thSoFar.length ? thSoFar : ['none yet'], hl: thSoFar.length ? { [thSoFar.length - 1]: 'ok' } : {} },
            { type: 'array', label: 'Debounce ran at (ms)', values: dbSoFar.length ? dbSoFar : ['none yet'], hl: dbSoFar.length ? { [dbSoFar.length - 1]: 'sel' } : {} }] });
        }
        f.push({ narr: 'Final timeline. Throttle ran <b>' + th.length + '</b> times: first immediately, then regularly, plus a trailing call so the last value is not lost. Debounce ran only <b>' + db.length + '</b> times: once per quiet period.', parts: [
          { type: 'array', label: 'Raw event times (ms)', values: times },
          { type: 'array', label: 'Throttle ran at (ms)', values: th, hl: (function () { var h = {}; th.forEach(function (_, k) { h[k] = 'ok'; }); return h; })() },
          { type: 'array', label: 'Debounce ran at (ms)', values: db.length ? db : ['never'], hl: (function () { var h = {}; db.forEach(function (_, k) { h[k] = 'sel'; }); return h; })() },
          { type: 'bars', label: 'Handler runs', values: [times.length, th.length, db.length], idxLabels: ['raw', 'throttle', 'debounce'], hl: { 0: 'bad', 1: 'ok', 2: 'sel' } }] });
        return f;
      }
    },
    {
      title: 'Which tool for which event?',
      gen: function () {
        var cols = ['Situation', 'Debounce', 'Throttle', 'rAF', 'Observer'];
        var rows = [
          ['Search box typing', 'BEST (300 ms)', 'ok', 'no', 'no'],
          ['Window resize "finished"', 'BEST', 'ok', 'no', 'no'],
          ['Scroll progress bar', 'no', 'ok', 'BEST', 'no'],
          ['Drag / mousemove', 'no', 'ok', 'BEST', 'no'],
          ['Infinite-scroll "near the end?"', 'no', 'ok', 'ok', 'BEST (sentinel)'],
          ['Lazy-load when visible', 'no', 'no', 'no', 'BEST'],
          ['Prevent double-click submit', 'BEST (leading)', 'ok', 'no', 'no']
        ];
        function t(hl) { return { type: 'table', label: 'Choosing a rate-limiting tool', columns: cols, rows: rows, hl: hl }; }
        return [
          { narr: 'Seven everyday situations and the tool that fits each. The rule: <b>who needs the result, and when?</b>', parts: [t({})] },
          { narr: '<b>Debounce</b> when only the final value matters: the user has stopped typing or resizing.', parts: [t({ 0: 'ok', 1: 'ok', 6: 'ok' })] },
          { narr: '<b>rAF</b> when the result is a visual update: nobody can see more than one update per frame, so more is waste.', parts: [t({ 2: 'cur', 3: 'cur' })] },
          { narr: '<b>Observers</b> when you are really asking "is it visible?" or "did it resize?" — let the browser do the measuring, with no scroll listener at all.', parts: [t({ 4: 'sel', 5: 'sel' })] },
          { narr: 'In all cases add <code>{ passive: true }</code> to scroll/touch/wheel listeners, and keep the handler itself cheap: read values, schedule writes, never block.', parts: [t({}), { type: 'text', html: '<code>window.addEventListener("scroll", handler, { passive: true })</code> tells the browser it can keep scrolling on the compositor thread without waiting for your JavaScript.' }] }
        ];
      }
    }
  ],
  examples: [
    {
      title: 'Typing "react" in a search box',
      html: `<p>User types r-e-a-c-t, one key every 120 ms. Without debounce: 5 requests (<code>r</code>, <code>re</code>, <code>rea</code>, <code>reac</code>, <code>react</code>), and the slower ones can arrive <i>after</i> the faster ones (out-of-order results!). With a 300 ms debounce: 1 request for <code>react</code>, sent 300 ms after the last key. Add <code>AbortController</code> to cancel older in-flight requests.</p>
      ${H.table(['Key', 'Time (ms)', 'No debounce', 'Debounce 300 ms'], [['r', '0', 'request', '-'], ['e', '120', 'request', '-'], ['a', '240', 'request', '-'], ['c', '360', 'request', '-'], ['t', '480', 'request', '<span class="c-g">request at 780</span>']])}`
    },
    {
      title: 'Scroll progress bar with rAF',
      html: `<p>A reading-progress bar at the top should update smoothly. A throttle of 100 ms makes it step 10 times a second — visibly choppy. The right tool is <code>requestAnimationFrame</code>: one update per frame, always in sync with painting. Use <code>transform: scaleX()</code> so it needs no layout.</p>`,
      code: { lang: 'js', code: `const bar = document.querySelector('#progress');
let scheduled = false;
function update() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? scrollY / max : 0;
  bar.style.transform = 'scaleX(' + p + ')';          // composite-only
  scheduled = false;
}
addEventListener('scroll', () => {
  if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
}, { passive: true });`, check: true }
    },
    {
      title: 'Infinite scroll: IntersectionObserver beats a scroll listener',
      html: `<p>Old way: on every scroll event (throttled) read <code>scrollTop + clientHeight</code> and compare with <code>scrollHeight</code> — that reads layout on every tick. New way: put an empty <i>sentinel</i> element after the last item and let <code>IntersectionObserver</code> call you once when it gets near the viewport. No scroll listener, no layout reads, no throttle needed.</p>`,
      code: { lang: 'js', code: `const sentinel = document.querySelector('#sentinel');
const io = new IntersectionObserver(async ([entry]) => {
  if (!entry.isIntersecting) return;
  io.unobserve(sentinel);                 // pause while loading
  await loadNextPage();                   // append items
  io.observe(sentinel);                   // resume
}, { rootMargin: '400px' });              // start loading 400px before the end
io.observe(sentinel);`, check: true }
    },
    {
      title: 'Passive listeners and why Chrome warns you',
      html: `<p>A <code>touchstart</code>/<code>wheel</code> listener might call <code>preventDefault()</code> to stop scrolling, so the browser has to <i>wait for your handler</i> before it can scroll. That wait is felt as lag. <code>{ passive: true }</code> is your promise not to cancel it, so scrolling proceeds immediately. Browsers already treat top-level <code>touchstart/touchmove/wheel</code> listeners on window/document/body as passive by default, but be explicit.</p>`
    }
  ],
  deepDive: `<p><b>Closures, <code>this</code> and arguments.</b> A correct debounce/throttle keeps state in a closure (<code>timer</code>, <code>lastArgs</code>, <code>lastThis</code>), forwards <code>this</code> and arguments using <code>apply</code>, returns a function with <code>cancel()</code> (and often <code>flush()</code>) so you can clean up on unmount. In React, create it once (<code>useMemo</code>/<code>useRef</code>) — recreating it every render resets the timer and breaks the debounce — and cancel it in the effect cleanup. Prefer <code>useDeferredValue</code> / transitions for local filtering of in-memory data; use debounce for network requests.</p>
  <p><b>Timer accuracy.</b> <code>setTimeout</code> is a minimum delay: it can run late if the main thread is busy, and background tabs clamp timers to ≥ 1 s. Throttling with <code>Date.now()</code> checks (not timer counts) stays correct. For tests, use fake timers (<code>jest.useFakeTimers()</code>, <code>vi.useFakeTimers()</code>) or inject a clock — exactly what the exercise does.</p>
  <p><b>Rate limiting inputs vs. outputs.</b> Debounce/throttle limit <i>how often you react</i>, not how often events happen — the browser still dispatches every event to your listener (cheap) and your function returns immediately. For truly hot paths (<code>pointermove</code> at 1000 Hz on gaming mice), use <code>event.getCoalescedEvents()</code> or read the latest pointer position inside rAF instead of processing every event.</p>
  <p><b>Newer platform tools.</b> <code>scheduler.postTask()</code> with priorities (<code>user-blocking</code>, <code>user-visible</code>, <code>background</code>), <code>scheduler.yield()</code> to split long work, <code>requestIdleCallback</code> for low-priority tasks, CSS <b>scroll-driven animations</b> (<code>animation-timeline: scroll()</code>) that remove JS from scroll effects completely, and <code>content-visibility</code> / containment to reduce per-event layout cost.</p>
  <p><b>INP connection.</b> INP measures how long the next paint is delayed after an interaction. A handler that does 80 ms of work on every <code>input</code> event gives poor INP; debounce the expensive part but update the visible input value immediately (urgent vs. non-urgent work). The pattern "urgent update now, deferred expensive update later" is exactly what React transitions formalise.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI features multiply high-frequency events: streaming tokens arrive 20-100 times a second and each one wants a re-render and an auto-scroll; "AI autocomplete" fires on every keystroke and costs real money per call. Rate control is now also a <b>cost</b> tool, not just a performance tool.</p>
  <p><b>Use AI as a partner:</b> ask it to write a debounce/throttle <i>and</i> its tests with fake timers (<code>events at 0,100,200 ... expect calls at ...</code>) — a timeline is easy to check by eye. Ask it to review a handler: <code>List every layout read and state update that happens per scroll event.</code></p>
  <p><b>Where AI goes wrong:</b> classic bugs — creating the debounced function inside the component body so it is recreated each render, losing the latest arguments in throttle, forgetting <code>cancel</code> on unmount (state update after unmount), and using a timer instead of rAF for visual updates. It also often forgets stale-response handling (<code>AbortController</code>).</p>
  <p><b>What you must still own:</b> picking the right primitive (debounce vs throttle vs rAF vs observer), choosing the delay with UX in mind, and testing edge cases such as a single event, a long gap, leading/trailing combinations. Streaming UIs: batch token updates per frame instead of one state update per token.</p>`,
  problems: [
    {
      title: 'Throttle a Scroll Handler (Leading + Trailing)', level: 'Medium', tags: ['throttle', 'closures', 'timers'], companies: ['Google', 'Amazon', 'Microsoft', 'Razorpay'],
      statement: `<p>Implement <code>throttle(fn, wait, clock)</code>. It returns a function that calls <code>fn</code> <b>immediately</b> on the first call (leading edge), then at most once every <code>wait</code> ms; if calls arrive during the cooldown, exactly one <b>trailing</b> call runs at the end of the cooldown with the <b>latest arguments</b>. To make it testable, timers come from the injected <code>clock</code> (<code>clock.now()</code>, <code>clock.setTimeout(fn, ms)</code>, <code>clock.clearTimeout(id)</code>) instead of the real ones.</p>`,
      constraints: `1 ≤ wait ≤ 10<sup>4</sup> ms; up to 10<sup>5</sup> calls; <code>fn</code> receives the latest arguments; no calls are lost silently (the last call always runs).`,
      example: `<p>wait = 500; the wrapped function is called with scroll positions at t = 0 (y=0), 100 (y=40), 300 (y=120), 700 (y=260).</p>${H.table(['Time', 'Fired?', 'Argument'], [['0', '<span class="c-g">yes (leading)</span>', 'y=0'], ['100', 'no (cooldown)', '-'], ['300', 'no (cooldown)', '-'], ['500', '<span class="c-g">yes (trailing)</span>', 'y=120 (latest)'], ['700', 'no, cooldown until 1000', '-'], ['1000', '<span class="c-g">yes (trailing)</span>', 'y=260']])}`,
      brute: { why: `<p>Ignore the trailing call: drop every call during the cooldown. Simple, but the <i>final</i> scroll position is often lost, so a progress bar or "lazy-load more" check can be stuck on a stale value after the user stops scrolling.</p>`, code: `function throttleLeadingOnly(fn, wait, clock) {
  let last = -Infinity;
  return (...args) => {
    if (clock.now() - last >= wait) { last = clock.now(); fn(...args); } // later calls are simply dropped
  };
}` },
      mcq: { q: 'Why does a throttle usually keep a trailing call?', options: ['To make the code shorter', 'So the final event (final scroll position) is not lost', 'To avoid using timers', 'Because the first call must be delayed'], answer: 1, explain: 'During the cooldown extra events are dropped. Without a trailing call the handler might never see the last value the user ended on.' },
      hints: [`<p>Store the time of the last real call. A new call is "free" if at least <code>wait</code> ms passed since then.</p>`, `<p>If it is not free, compute <code>remaining = wait - (now - last)</code> and schedule ONE timer for that long (if none is scheduled yet). Always overwrite the stored latest arguments.</p>`, `<p>Edge cases: when the timer fires, run <code>fn</code> with the stored args and set <code>last = now</code>; if a call arrives exactly when the cooldown ends, cancel the pending timer and run immediately (avoid a double call); the first ever call has <code>last = -Infinity</code>.</p>`],
      solution: {
        approach: `<p>Keep <code>last</code> (time of the last execution), <code>timer</code> (pending trailing call) and <code>lastArgs</code>. Each call stores its args; if the cooldown is over run now (and cancel any pending timer), otherwise ensure exactly one timer exists for the remaining time. A tiny fake clock lets us verify the timeline without sleeping.</p>`,
        code: { lang: 'js', run: true, code: `class FakeClock {                                   // test helper: time moves only when we say so
  constructor() { this.t = 0; this.timers = []; this.nextId = 1; }
  now() { return this.t; }
  setTimeout(fn, ms) { const id = this.nextId++; this.timers.push({ id, at: this.t + ms, fn }); return id; }
  clearTimeout(id) { this.timers = this.timers.filter((x) => x.id !== id); }
  advanceTo(target) {                               // run due timers in order, then land on target
    for (;;) {
      const due = this.timers.filter((x) => x.at <= target).sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      this.timers = this.timers.filter((x) => x !== due);
      this.t = due.at;
      due.fn();
    }
    this.t = target;
  }
}

function throttle(fn, wait, clock) {
  let last = -Infinity, timer = null, lastArgs = null;
  function run() {                                  // actually call fn with the freshest args
    last = clock.now(); timer = null;
    const args = lastArgs; lastArgs = null;
    fn(...args);
  }
  return function throttled(...args) {
    lastArgs = args;                                // remember the latest call
    const remaining = wait - (clock.now() - last);
    if (remaining <= 0) {                           // cooldown over: leading call
      if (timer !== null) { clock.clearTimeout(timer); timer = null; }
      run();
    } else if (timer === null) {
      timer = clock.setTimeout(run, remaining);     // exactly one trailing call
    }
  };
}

const clock = new FakeClock();
const log = [];
const onScroll = throttle((y) => log.push('t=' + clock.now() + ' y=' + y), 500, clock);
[[0, 0], [100, 40], [300, 120], [700, 260]].forEach(([t, y]) => { clock.advanceTo(t); onScroll(y); });
clock.advanceTo(2000);                              // let pending timers run
console.log(log.join('\\n'));` },
        complexity: `<p>O(1) time and space per call; at most one timer exists at any moment.</p>`,
        followUps: ['Add <code>cancel()</code> and <code>flush()</code>.', 'Make leading/trailing configurable like lodash.', 'How does this differ from debounce with <code>maxWait</code>?']
      }
    }
  ]
});
/* =====================================================================
   PRACTICE — Easy (4) then Medium
   ===================================================================== */
practice.push({
  title: 'Count the Forced Reflows', level: 'Easy', tags: ['reflow', 'layout thrashing', 'simulation'], companies: ['Google', 'Meta'],
  statement: `<p>A script performs a sequence of DOM operations, each either <code>'W'</code> (a <b>write</b>: change a style or the DOM, which makes layout dirty) or <code>'R'</code> (a <b>read</b> of a layout value such as <code>offsetHeight</code>). A read while layout is dirty forces a synchronous reflow (which makes layout clean again). Layout is clean at the start. Return the number of <b>forced reflows</b>.</p>`,
  constraints: `1 ≤ ops.length ≤ 10<sup>5</sup>; each op is 'R' or 'W'.`,
  example: `<p><code>['W','R','R','W','W','R']</code></p>${H.table(['Op', 'Dirty before?', 'Forced?'], [['W', 'no', '-'], ['R', 'yes', '<span class="c-r">forced (1)</span>'], ['R', 'no', 'no'], ['W', 'no', '-'], ['W', 'yes', '-'], ['R', 'yes', '<span class="c-r">forced (2)</span>']])}<p>Answer: <b>2</b>.</p>`,
  brute: { why: `<p>For every read, scan backwards until the previous read to see if any write happened in between. A long run of reads/writes makes this O(n²) in the worst case, and it re-scans the same stretch repeatedly.</p>`, code: `function forcedReflowsBrute(ops) {
  let count = 0, lastRead = -1;
  for (let i = 0; i < ops.length; i++) {
    if (ops[i] !== 'R') continue;
    for (let j = i - 1; j > lastRead; j--) {      // look for a write since the last read
      if (ops[j] === 'W') { count++; break; }
    }
    lastRead = i;
  }
  return count;
}` },
  mcq: { q: 'Which sequence causes the MOST forced reflows for 3 writes and 3 reads?', options: ['W W W R R R', 'R R R W W W', 'W R W R W R', 'R W R W R W'], answer: 2, explain: 'Alternating W R W R W R makes layout dirty before every read: 3 forced reflows. W W W R R R forces just 1 (the first read cleans it).' },
  hints: [`<p>You do not need to remember <i>where</i> the last write was — only <i>whether</i> layout is dirty right now.</p>`, `<p>Keep a boolean <code>dirty</code>. A write sets it to true. A read with <code>dirty</code> true counts one reflow and sets it to false.</p>`, `<p>Single pass, O(1) memory. Start with <code>dirty = false</code>. Consecutive writes do not stack up (still one reflow later), and consecutive reads after the first are free.</p>`],
  solution: {
    approach: `<p>A single boolean models the browser's dirty flag. This is exactly what a real engine does: writes only mark work as pending; the first geometry read pays for all of it.</p>`,
    code: { lang: 'js', run: true, code: `function forcedReflows(ops) {
  let dirty = false, forced = 0;
  for (const op of ops) {
    if (op === 'W') dirty = true;                 // write: layout needs recomputing
    else if (dirty) { forced++; dirty = false; }  // read while dirty: forced synchronous layout
  }
  return forced;
}
console.log(forcedReflows(['W', 'R', 'R', 'W', 'W', 'R']));   // 2
console.log(forcedReflows(['W', 'W', 'W', 'R', 'R', 'R']));   // 1
console.log(forcedReflows(['W', 'R', 'W', 'R', 'W', 'R']));   // 3` },
    complexity: `<p>Time O(n), space O(1).</p>`,
    followUps: ['How would you reorder the operations to minimise forced reflows, assuming reads do not depend on earlier writes?']
  }
});

practice.push({
  title: 'Debounce Timeline (Trailing and Leading)', level: 'Easy', tags: ['debounce', 'simulation', 'arrays'], companies: ['Amazon', 'Flipkart'],
  statement: `<p>Events happen at the given times (ms, increasing). A debounce with delay <code>wait</code> restarts its countdown on every event. Write <code>debounceTimes(times, wait, leading)</code> that returns the times the wrapped function actually runs. With <code>leading = false</code> it runs once at the <b>end</b> of every burst (<code>last event + wait</code>). With <code>leading = true</code> it runs once at the <b>start</b> of every burst and not at the end. A new burst starts when the gap since the previous event is at least <code>wait</code>.</p>`,
  constraints: `0 ≤ n ≤ 10<sup>5</sup> events; times strictly increasing; 1 ≤ wait ≤ 10<sup>6</sup>.`,
  example: `<p><code>times = [0, 100, 200, 900, 1000], wait = 300</code></p>${H.arr([0, 100, 200, 900, 1000], { label: 'events', hl: { 0: 'b', 3: 'b' } })}${H.table(['Mode', 'Runs at'], [['trailing', '<span class="c-g">500</span> (200+300), <span class="c-g">1300</span> (1000+300)'], ['leading', '<span class="c-g">0</span>, <span class="c-g">900</span>']])}`,
  brute: { why: `<p>For each event, look at every later event to see if one arrives within <code>wait</code>. That is O(n²) comparisons, but only the <i>immediate neighbour</i> matters, because times are sorted.</p>`, code: `function debounceTimesBrute(times, wait) {
  const out = [];
  for (let i = 0; i < times.length; i++) {
    let restarted = false;
    for (let j = i + 1; j < times.length; j++) if (times[j] - times[i] < wait) { restarted = true; break; }
    if (!restarted) out.push(times[i] + wait);
  }
  return out;
}` },
  mcq: { q: 'Debounce 300 ms, events at 0, 100, 200. When does the trailing call run?', options: ['0', '300', '500', '200'], answer: 2, explain: 'Every event restarts the countdown. The last event is at 200, so the call happens at 200 + 300 = 500.' },
  hints: [`<p>Because times are sorted, an event "ends" a burst exactly when the <i>next</i> event is far enough away.</p>`, `<p>Trailing: event i ends a burst if <code>times[i+1] - times[i] &gt;= wait</code> (or it is the last event) → fire at <code>times[i] + wait</code>.</p>`, `<p>Leading: event i starts a burst if it is the first event or <code>times[i] - times[i-1] &gt;= wait</code> → fire at <code>times[i]</code>. Gap exactly equal to wait counts as a new burst (the timer expired).</p>`],
  solution: {
    approach: `<p>Only neighbours matter. For trailing mode look at the gap to the next event; for leading mode look at the gap to the previous event.</p>`,
    code: { lang: 'js', run: true, code: `function debounceTimes(times, wait, leading = false) {
  const out = [];
  for (let i = 0; i < times.length; i++) {
    if (leading) {
      const startsBurst = i === 0 || times[i] - times[i - 1] >= wait;
      if (startsBurst) out.push(times[i]);
    } else {
      const endsBurst = i === times.length - 1 || times[i + 1] - times[i] >= wait;
      if (endsBurst) out.push(times[i] + wait);
    }
  }
  return out;
}
const t = [0, 100, 200, 900, 1000];
console.log('trailing', debounceTimes(t, 300));        // [ 500, 1300 ]
console.log('leading ', debounceTimes(t, 300, true));  // [ 0, 900 ]` },
    complexity: `<p>Time O(n), space O(k) for k runs.</p>`,
    followUps: ['Add a <code>maxWait</code> option so a never-ending burst still fires at least every maxWait ms.', 'Support both leading and trailing at once like lodash.']
  }
});

practice.push({
  title: 'Rate a Web Vital', level: 'Easy', tags: ['web vitals', 'thresholds', 'lookup tables'], companies: ['Google', 'Shopify'],
  statement: `<p>Write <code>rate(metric, value)</code> returning <code>'good'</code>, <code>'needs-improvement'</code> or <code>'poor'</code> using the Core Web Vitals thresholds: <b>LCP</b> good ≤ 2500 ms, poor &gt; 4000 ms; <b>INP</b> good ≤ 200 ms, poor &gt; 500 ms; <b>CLS</b> good ≤ 0.1, poor &gt; 0.25. Then write <code>passes(p75)</code> that takes an object like <code>{ LCP, INP, CLS }</code> of 75th-percentile values and returns true only if <b>all three</b> are good. Throw an error for an unknown metric.</p>`,
  constraints: `Values are non-negative numbers. Boundaries: exactly 2500 is good, exactly 4000 is needs-improvement.`,
  example: `${H.table(['Call', 'Result'], [['rate("LCP", 2500)', '<span class="c-g">good</span>'], ['rate("LCP", 4000)', '<span class="c-y">needs-improvement</span>'], ['rate("INP", 501)', '<span class="c-r">poor</span>'], ['passes({LCP:2100, INP:180, CLS:0.12})', 'false (CLS)']])}`,
  brute: { why: `<p>One big <code>if / else if</code> ladder per metric with magic numbers repeated in several places. It works, but thresholds get duplicated (dashboards, alerts, tests) and drift apart when someone updates one copy.</p>`, code: `function rateBrute(metric, value) {
  if (metric === 'LCP') { if (value <= 2500) return 'good'; else if (value <= 4000) return 'needs-improvement'; else return 'poor'; }
  else if (metric === 'INP') { if (value <= 200) return 'good'; else if (value <= 500) return 'needs-improvement'; else return 'poor'; }
  else if (metric === 'CLS') { if (value <= 0.1) return 'good'; else if (value <= 0.25) return 'needs-improvement'; else return 'poor'; }
  throw new Error('unknown metric');
}` },
  mcq: { q: 'A page has LCP 2.0 s, INP 150 ms, CLS 0.3 at p75. Does it pass Core Web Vitals?', options: ['Yes, two of three are good', 'No, CLS is poor', 'Yes, average is fine', 'Only on desktop'], answer: 1, explain: 'All three metrics must be good at the 75th percentile. CLS 0.3 is above 0.25, so it is poor and the page fails.' },
  hints: [`<p>The only thing that changes between metrics is two numbers. Put the numbers in data and keep the logic in one place.</p>`, `<p>A table: <code>{ LCP: [2500, 4000], INP: [200, 500], CLS: [0.1, 0.25] }</code>. Compare against the pair with <code>&lt;=</code>.</p>`, `<p>Use <code>Object.hasOwn(TABLE, metric)</code> to reject unknown names (including "toString"). <code>passes</code>: every metric key in the table must be present and rated good.</p>`],
  solution: {
    approach: `<p>Single source of truth: a thresholds table. The rating function is three lines; adding a metric (say TTFB) is one more row.</p>`,
    code: { lang: 'js', run: true, code: `const THRESHOLDS = { LCP: [2500, 4000], INP: [200, 500], CLS: [0.1, 0.25] }; // [good max, needs-improvement max]

function rate(metric, value) {
  if (!Object.hasOwn(THRESHOLDS, metric)) throw new Error('Unknown metric: ' + metric);
  const [good, ni] = THRESHOLDS[metric];
  return value <= good ? 'good' : value <= ni ? 'needs-improvement' : 'poor';
}
function passes(p75) {
  return Object.keys(THRESHOLDS).every((m) => p75[m] !== undefined && rate(m, p75[m]) === 'good');
}

console.log(rate('LCP', 2500), rate('LCP', 4000), rate('INP', 501), rate('CLS', 0.26));
console.log(passes({ LCP: 2100, INP: 180, CLS: 0.12 }), passes({ LCP: 2100, INP: 180, CLS: 0.05 }));` },
    complexity: `<p>O(1) per rating; <code>passes</code> is O(number of metrics).</p>`,
    followUps: ['Which percentile is used and why not the average?', 'Add TTFB (good ≤ 800 ms, poor &gt; 1800 ms) and FCP.']
  }
});

practice.push({
  title: 'How Many Rows Are on Screen?', level: 'Easy', tags: ['virtualization', 'math'], companies: ['Atlassian', 'Swiggy'],
  statement: `<p>A scrolling list has <code>total</code> rows, each <code>rowH</code> pixels tall, in a viewport <code>viewportH</code> pixels tall, scrolled to <code>scrollTop</code>. Return how many rows have <b>at least one pixel</b> inside the viewport (partly visible rows count). Clamp <code>scrollTop</code> to the valid range.</p>`,
  constraints: `0 ≤ total ≤ 10<sup>9</sup>, 1 ≤ rowH, viewportH ≤ 10<sup>5</sup>, any integer scrollTop. Must be O(1).`,
  example: `<p><code>total=1000, rowH=40, viewportH=100, scrollTop=30</code></p>${H.arr(['r0', 'r1', 'r2', 'r3', 'r4'], { label: 'rows (0..3 touch pixels 30..130)', hl: { 0: 'y', 1: 'g', 2: 'g', 3: 'y' } })}<p>Rows 0 (partly), 1, 2 and 3 (partly) → <b>4</b>.</p>`,
  brute: { why: `<p>Loop over every row and test overlap with the viewport range: O(total). For a million rows and a scroll handler running every frame, that is a million checks per frame for an answer you can compute with two divisions.</p>`, code: `function visibleRowsBrute(total, rowH, viewportH, scrollTop) {
  let count = 0;
  for (let i = 0; i < total; i++) {
    const top = i * rowH, bottom = top + rowH;
    if (bottom > scrollTop && top < scrollTop + viewportH) count++;
  }
  return count;
}` },
  mcq: { q: 'rowH=50, viewportH=200, scrollTop=25. How many rows touch the viewport?', options: ['4', '5', '3', '6'], answer: 1, explain: 'Pixels 25..225. first = floor(25/50) = 0, last = ceil(225/50) - 1 = 4. Rows 0..4 = 5 rows.' },
  hints: [`<p>The viewport covers pixels <code>[scrollTop, scrollTop + viewportH)</code>. Which row contains the first pixel and which contains the last?</p>`, `<p><code>first = floor(top / rowH)</code>; <code>last = ceil((top + viewportH) / rowH) - 1</code>; answer <code>last - first + 1</code>.</p>`, `<p>Clamp <code>top</code> between 0 and <code>max(0, total*rowH - viewportH)</code> and clamp <code>last</code> to <code>total - 1</code>. If <code>total = 0</code> return 0.</p>`],
  solution: {
    approach: `<p>Convert the pixel range into a row range with floor/ceil. The ceil-minus-one makes the end exclusive, so a viewport that ends exactly on a row boundary does not count an extra row.</p>`,
    code: { lang: 'js', run: true, code: `function visibleRows(total, rowH, viewportH, scrollTop) {
  if (total <= 0) return 0;
  const maxScroll = Math.max(0, total * rowH - viewportH);
  const top = Math.min(Math.max(scrollTop, 0), maxScroll);
  const first = Math.floor(top / rowH);
  const last = Math.min(total - 1, Math.ceil((top + viewportH) / rowH) - 1);
  return last - first + 1;
}
console.log(visibleRows(1000, 40, 100, 30));   // 4
console.log(visibleRows(1000, 50, 200, 25));   // 5
console.log(visibleRows(3, 40, 600, 0));       // 3 (short list)` },
    complexity: `<p>Time O(1), space O(1).</p>`,
    followUps: ['Rows have variable heights: what data structure gives you O(log n)?']
  }
});

practice.push({
  title: 'Batch Reads and Writes (fastdom-style Scheduler)', level: 'Medium', tags: ['layout thrashing', 'requestAnimationFrame', 'scheduler'], companies: ['Meta', 'Google', 'Atlassian'],
  statement: `<p>Build <code>createScheduler(raf)</code> returning <code>{ measure(fn), mutate(fn) }</code>. Components call these at any time, in any order. In the next animation frame (requested through the injected <code>raf</code>) the scheduler must run <b>all</b> queued measure callbacks first (in order), then <b>all</b> mutate callbacks (in order). Only one frame may be requested however many tasks are queued. A task queued <i>during</i> the flush runs in the <b>next</b> frame.</p>`,
  constraints: `Up to 10<sup>4</sup> queued tasks per frame. Callbacks must run exactly once and in FIFO order inside their group.`,
  example: `<p>Calls (interleaved by three components): <code>measure(A)</code>, <code>mutate(A)</code>, <code>measure(B)</code>, <code>mutate(B)</code>.</p>${H.table(['Without scheduler', 'With scheduler'], [['A.read, A.write, B.read (forced reflow), B.write', '<span class="c-g">A.read, B.read, A.write, B.write</span>']])}<p>Forced reflows drop from 1+ to 0.</p>`,
  brute: { why: `<p>Run each callback immediately where it is called. Each component reads and writes in its own turn, so the writes of component A dirty layout just before component B reads: one forced reflow per component (layout thrashing across modules that cannot see each other).</p>`, code: `const naive = {
  measure(fn) { fn(); },     // read now
  mutate(fn) { fn(); }       // write now -> next measure() will force a reflow
};` },
  mcq: { q: 'Why must the scheduler request only ONE animation frame per batch?', options: ['rAF can only be called once per page', 'So all queued reads and writes land in the same frame and are grouped', 'To make callbacks async', 'To avoid memory leaks'], answer: 1, explain: 'Grouping works only if the reads and writes queued by different components are flushed together. One rAF per task would interleave them again.' },
  hints: [`<p>Two queues: reads and writes. A flag says whether a frame is already requested.</p>`, `<p><code>measure</code>/<code>mutate</code> push to their queue and call <code>schedule()</code>, which requests a frame only if none is pending.</p>`, `<p>In <code>flush</code>: set the flag to false first, swap the queues for fresh empty arrays, then run swapped reads, then swapped writes. New tasks queued during the flush land in the fresh arrays and trigger the next frame.</p>`],
  solution: {
    approach: `<p>Classic read/write batching. Swapping the queues before running makes re-entrancy safe: anything queued while flushing waits for the next frame and cannot be skipped or run twice.</p>`,
    code: { lang: 'js', run: true, code: `function createScheduler(raf) {
  let reads = [], writes = [], pending = false;
  function flush() {
    pending = false;                                    // allow new frames to be requested
    const r = reads, w = writes;
    reads = []; writes = [];                            // swap: tasks queued now go to the next frame
    r.forEach((fn) => fn());                            // all measurements first
    w.forEach((fn) => fn());                            // then all mutations
  }
  function schedule() { if (!pending) { pending = true; raf(flush); } }
  return {
    measure(fn) { reads.push(fn); schedule(); },
    mutate(fn) { writes.push(fn); schedule(); }
  };
}

// Fake rAF + fake layout engine to prove it.
const frames = []; const raf = (cb) => frames.push(cb);
const engine = { dirty: false, forced: 0 };
const read = () => { if (engine.dirty) { engine.forced++; engine.dirty = false; } };
const write = () => { engine.dirty = true; };
const log = [];
const s = createScheduler(raf);
['A', 'B', 'C'].forEach((name) => {
  s.measure(() => { read(); log.push(name + '.read'); });
  s.mutate(() => { write(); log.push(name + '.write'); });
});
frames.shift()();                                        // run the single requested frame
console.log(log.join(' '), '| frames requested: 1 | forced reflows:', engine.forced);` },
    complexity: `<p>O(1) per queued task; O(k) per flush for k tasks.</p>`,
    followUps: ['Allow tasks queued during the flush to run in the same frame (loop until empty, with a cap).', 'Add cancel support for a queued task.']
  }
});

practice.push({
  title: 'Diagnose LCP from a Resource Timeline', level: 'Medium', tags: ['LCP', 'performance timeline', 'debugging'], companies: ['Google', 'Cloudflare', 'Amazon'],
  statement: `<p>You get timestamps (ms since navigation start) for a page: <code>responseStart</code> (first byte of HTML), <code>lcp</code> (time the LCP element painted), and for an image LCP element also <code>resourceStart</code> (request begins) and <code>resourceEnd</code> (download finished). If the LCP element is text, the resource timestamps are <code>null</code>. Return <code>{ ttfb, loadDelay, loadDuration, renderDelay, total, rating, bottleneck }</code>. For text LCP, <code>loadDelay</code> and <code>loadDuration</code> are 0 and <code>renderDelay = lcp - responseStart</code>. <code>rating</code> uses 2500 / 4000 ms. <code>bottleneck</code> is the name of the largest slice.</p>`,
  constraints: `Timestamps are non-negative and ordered: responseStart ≤ resourceStart ≤ resourceEnd ≤ lcp.`,
  example: `<p><code>responseStart=600, resourceStart=2000, resourceEnd=2900, lcp=3200</code></p>${H.table(['Slice', 'ms'], [['ttfb', '600'], ['loadDelay (2000 - 600)', '<span class="c-r">1400</span>'], ['loadDuration (2900 - 2000)', '900'], ['renderDelay (3200 - 2900)', '300']])}<p>total 3200 → needs-improvement; bottleneck <b>loadDelay</b> (image discovered late → preload / put in HTML).</p>`,
  brute: { why: `<p>Look only at the total LCP and shrug "the image is slow". The total does not tell you <i>which</i> fix to apply: a CDN won't help a late-discovered image, and preloading won't help a 3 MB file or a slow server.</p>`, code: `function diagnoseBrute(t) {
  return t.lcp <= 2500 ? 'good' : 'slow - optimise the image';   // always the same advice
}` },
  mcq: { q: 'LCP is 3.4 s; load delay is 1.8 s, TTFB 0.4 s, download 0.9 s, render delay 0.3 s. What should you try first?', options: ['A faster server (TTFB)', 'Smaller image (AVIF)', 'Make the browser discover the image earlier (preload, fetchpriority, not lazy, in HTML)', 'Remove render-blocking CSS'], answer: 2, explain: 'The largest slice is load delay: the time between the first byte and the browser starting the image request. Fix discovery, not the file size or the server.' },
  hints: [`<p>LCP time is the sum of four consecutive slices on one timeline. Each slice is the difference of two timestamps.</p>`, `<p><code>ttfb = responseStart</code>; <code>loadDelay = resourceStart - responseStart</code>; <code>loadDuration = resourceEnd - resourceStart</code>; <code>renderDelay = lcp - resourceEnd</code>.</p>`, `<p>Text LCP: no resource, so loadDelay = loadDuration = 0 and renderDelay = lcp - responseStart. Find the maximum slice with a simple loop over the four entries; ties go to the earlier slice.</p>`],
  solution: {
    approach: `<p>Slice the timeline by differences, rate the total, and report the largest slice as the bottleneck. The mapping slice → fix is what you tell the team.</p>`,
    code: { lang: 'js', run: true, code: `function diagnoseLCP({ responseStart, resourceStart, resourceEnd, lcp }) {
  const isText = resourceStart === null || resourceEnd === null;
  const slices = isText
    ? { ttfb: responseStart, loadDelay: 0, loadDuration: 0, renderDelay: lcp - responseStart }
    : {
        ttfb: responseStart,
        loadDelay: resourceStart - responseStart,
        loadDuration: resourceEnd - resourceStart,
        renderDelay: lcp - resourceEnd
      };
  let bottleneck = 'ttfb';
  for (const k of Object.keys(slices)) if (slices[k] > slices[bottleneck]) bottleneck = k; // ties -> earlier slice
  const rating = lcp <= 2500 ? 'good' : lcp <= 4000 ? 'needs-improvement' : 'poor';
  return { ...slices, total: lcp, rating, bottleneck };
}
console.log(diagnoseLCP({ responseStart: 600, resourceStart: 2000, resourceEnd: 2900, lcp: 3200 }));
console.log(diagnoseLCP({ responseStart: 900, resourceStart: null, resourceEnd: null, lcp: 2100 }));` },
    complexity: `<p>O(1) time and space.</p>`,
    followUps: ['Where do you read these timestamps in the browser? (<code>PerformanceNavigationTiming</code>, <code>PerformanceResourceTiming</code>, LCP <code>PerformanceObserver</code> entry with <code>url</code> and <code>renderTime</code>.)']
  }
});

practice.push({
  title: 'Bundle Budget Checker with Static vs Dynamic Imports', level: 'Medium', tags: ['code splitting', 'graph traversal', 'bundle size'], companies: ['Airbnb', 'Netflix', 'Uber'],
  statement: `<p>You are given a chunk graph: <code>{ name: { kb, imports: [...], lazy: [...] } }</code>. <code>imports</code> are <b>static</b> dependencies (downloaded with the chunk); <code>lazy</code> are dynamic <code>import()</code> targets (downloaded later, on demand). Starting from <code>entry</code>, compute the <b>initial JS size</b> (every chunk reachable through static imports, each counted once, even if shared or in a cycle), whether it exceeds <code>budgetKb</code>, and the three biggest initial chunks.</p>`,
  constraints: `Up to 10<sup>4</sup> chunks; the graph may share dependencies and contain cycles. Unknown names should throw an error.`,
  example: `<p><code>main(100) → [vendor(200), ui(50)]; ui → [vendor]; main.lazy → [charts(250)]</code></p>${H.table(['Chunk', 'In initial load?', 'kb'], [['main', 'yes', '100'], ['vendor', 'yes (counted once)', '200'], ['ui', 'yes', '50'], ['charts', '<span class="c-g">no (lazy)</span>', '250']])}<p>Initial = <b>350</b> kb. Over a 300 kb budget → <span class="c-r">yes</span>; top: vendor, main, ui.</p>`,
  brute: { why: `<p>Recursively add every dependency without remembering what was visited. Shared chunks (vendor) are counted once per path - the total is wrong - and a cycle (a imports b imports a) recurses forever. On a diamond-heavy graph the path count can even grow exponentially.</p>`, code: `function initialKbBrute(graph, name) {
  const node = graph[name];
  let sum = node.kb;
  for (const dep of node.imports) sum += initialKbBrute(graph, dep);  // no visited set!
  return sum;
}` },
  mcq: { q: 'Why are lazy (dynamic) imports excluded from the initial size?', options: ['They are always tiny', 'They are only downloaded later, when needed', 'They are cached forever', 'They are minified more'], answer: 1, explain: 'A dynamic import() creates a separate chunk that is requested on demand. It does not delay the first load, so it does not count towards initial JS.' },
  hints: [`<p>This is graph reachability over <b>static</b> edges only. Ignore the <code>lazy</code> edges.</p>`, `<p>Use a visited set so each chunk is added exactly once, then DFS or BFS from <code>entry</code>.</p>`, `<p>Collect visited chunk names, sum their kb, sort by kb descending (tie: name ascending) for the top 3. Use an explicit stack to avoid recursion limits. Throw if a name is missing from the graph.</p>`],
  solution: {
    approach: `<p>Iterative DFS over static imports with a visited set (handles sharing and cycles). Lazy edges are never followed. The visited list is exactly "what the browser must download before the app starts".</p>`,
    code: { lang: 'js', run: true, code: `function checkBudget(graph, entry, budgetKb) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const name = stack.pop();
    if (seen.has(name)) continue;                    // shared chunk or cycle: count once
    const node = graph[name];
    if (!node) throw new Error('Unknown chunk: ' + name);
    seen.add(name);
    for (const dep of node.imports) stack.push(dep); // static edges only; node.lazy is ignored
  }
  const initial = [...seen].map((n) => ({ name: n, kb: graph[n].kb }));
  const initialKb = initial.reduce((s, c) => s + c.kb, 0);
  const top = initial.sort((a, b) => b.kb - a.kb || a.name.localeCompare(b.name)).slice(0, 3).map((c) => c.name);
  return { initialKb, overBudget: initialKb > budgetKb, top };
}

const graph = {
  main: { kb: 100, imports: ['vendor', 'ui'], lazy: ['charts'] },
  ui: { kb: 50, imports: ['vendor'], lazy: [] },
  vendor: { kb: 200, imports: [], lazy: [] },
  charts: { kb: 250, imports: ['vendor'], lazy: [] }
};
console.log(checkBudget(graph, 'main', 300));      // { initialKb: 350, overBudget: true, top: [ 'vendor', 'main', 'ui' ] }` },
    complexity: `<p>Time O(V + E), space O(V).</p>`,
    followUps: ['Report the cost of each lazy route (its own chunks plus the dependencies not already loaded).', 'Fail CI when any PR increases initial size by more than 5%.']
  }
});
/* =====================================================================
   PRACTICE — Medium (continued) then Hard
   ===================================================================== */
practice.push({
  title: 'Variable-Height Virtual List Window', level: 'Medium', tags: ['virtualization', 'binary search', 'prefix sums'], companies: ['Meta', 'Slack', 'Google'],
  statement: `<p>A chat window has rows with <b>different heights</b>. Write <code>makeWindow(heights)</code> that preprocesses the heights once and returns <code>getWindow(scrollTop, viewportH, overscan)</code> → <code>{ start, end, offsetY, totalHeight }</code>: the first and last row to render (inclusive, with overscan, clamped), the top pixel of row <code>start</code>, and the full list height. Clamp <code>scrollTop</code> into the valid range. An empty list returns <code>start 0, end -1</code>.</p>`,
  constraints: `1 ≤ n ≤ 10<sup>6</sup> rows, 1 ≤ height ≤ 10<sup>4</sup>. Each <code>getWindow</code> call must be O(log n).`,
  example: `<p>heights = [30, 30, 120, 30, 30, 120]; offsets = [0, 30, 60, 180, 210, 240, 360]</p>${H.arr([30, 30, 120, 30, 30, 120], { label: 'heights', hl: { 2: 'g', 3: 'g' } })}<p><code>scrollTop=100, viewportH=100, overscan=0</code> → pixels 100..199 → rows <b>2</b> (60-179) and <b>3</b> (180-209): start 2, end 3, offsetY 60.</p>`,
  brute: { why: `<p>Walk the heights from the top, adding them up until you pass <code>scrollTop</code>, on every scroll frame. With a million rows deep in the list that is up to a million additions per frame — far too slow for 60 fps.</p>`, code: `function getWindowBrute(heights, scrollTop, viewportH) {
  let y = 0, start = -1, end = -1;
  for (let i = 0; i < heights.length; i++) {        // O(n) per scroll event
    if (start < 0 && y + heights[i] > scrollTop) start = i;
    if (y < scrollTop + viewportH) end = i;
    y += heights[i];
  }
  return { start, end };
}` },
  mcq: { q: 'Why precompute prefix sums (offsets)?', options: ['To make rows the same height', 'So the row at any pixel can be found by binary search in O(log n)', 'To reduce memory usage', 'Because browsers require it'], answer: 1, explain: 'Offsets are sorted (heights are positive), so "which row contains pixel y" is a binary search instead of a linear walk.' },
  hints: [`<p>Row i starts at <code>offsets[i]</code> = sum of heights before it. Offsets are strictly increasing, so they are sorted.</p>`, `<p>"Which row contains pixel y" = the largest i with <code>offsets[i] &lt;= y</code>. Binary search, O(log n). Do it for <code>top</code> and for <code>top + viewportH - 1</code>.</p>`, `<p>Clamp <code>top</code> to <code>[0, max(0, total - viewportH)]</code> first. Apply overscan after finding first/last, then clamp indices. <code>offsetY = offsets[start]</code>.</p>`],
  solution: {
    approach: `<p>Build the offsets array once (O(n)). Each lookup uses an upper-bound style binary search to find the row containing a pixel, then widens by overscan. This is the core of every dynamic-height virtualizer; real ones additionally update heights after measuring.</p>`,
    code: { lang: 'js', run: true, code: `function makeWindow(heights) {
  const n = heights.length;
  const offsets = new Array(n + 1);
  offsets[0] = 0;
  for (let i = 0; i < n; i++) offsets[i + 1] = offsets[i] + heights[i];
  const totalHeight = offsets[n];

  function rowAt(y) {                                   // largest i with offsets[i] <= y
    let lo = 0, hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= y) lo = mid; else hi = mid - 1;
    }
    return lo;
  }
  return function getWindow(scrollTop, viewportH, overscan) {
    if (n === 0) return { start: 0, end: -1, offsetY: 0, totalHeight: 0 };
    const top = Math.min(Math.max(scrollTop, 0), Math.max(0, totalHeight - viewportH));
    const first = rowAt(top);
    const last = rowAt(Math.min(totalHeight - 1, top + viewportH - 1));
    const start = Math.max(0, first - overscan);
    const end = Math.min(n - 1, last + overscan);
    return { start, end, offsetY: offsets[start], totalHeight };
  };
}

const getWindow = makeWindow([30, 30, 120, 30, 30, 120]);
console.log(getWindow(100, 100, 0));   // { start: 2, end: 3, offsetY: 60, totalHeight: 360 }
console.log(getWindow(100, 100, 1));   // start 1, end 4
console.log(getWindow(9999, 100, 0));  // clamped to the bottom` },
    complexity: `<p>Preprocess O(n); each window O(log n); space O(n).</p>`,
    followUps: ['A row is re-measured and gets taller: how do you update offsets? (Fenwick tree for O(log n) updates and queries.)', 'How do you keep the content from jumping when a row ABOVE the viewport changes height?']
  }
});

practice.push({
  title: 'Generate Responsive Picture Markup', level: 'Medium', tags: ['image optimization', 'srcset', 'string building'], companies: ['Shopify', 'Cloudflare', 'Zalando'],
  statement: `<p>Write <code>buildPicture(spec)</code> returning an HTML string for a responsive image. <code>spec = { name, widths, formats, fallback, sizes, width, height, alt, priority }</code>. For each format in <code>formats</code> (most modern first, e.g. <code>['avif','webp']</code>) output a <code>&lt;source type="image/FORMAT" srcset="..." sizes="..."&gt;</code> where srcset lists <code>/img/NAME-W.FORMAT Ww</code> for each width. End with an <code>&lt;img&gt;</code> using the <code>fallback</code> format, the <b>middle</b> width as <code>src</code>, <code>width</code>/<code>height</code> attributes and <code>alt</code>. If <code>priority === 'high'</code> add <code>fetchpriority="high"</code> (no lazy loading); otherwise add <code>loading="lazy" decoding="async"</code>.</p>`,
  constraints: `1 ≤ widths ≤ 10; formats may be empty; alt must be HTML-escaped (<code>&amp; &lt; &gt; "</code>).`,
  example: `<p><code>{ name:'hero', widths:[400,800,1200], formats:['avif'], fallback:'jpg', sizes:'100vw', width:1600, height:900, alt:'Sunrise', priority:'high' }</code></p>${H.table(['Output (abridged)'], [['&lt;picture&gt;&lt;source type="image/avif" srcset="/img/hero-400.avif 400w, /img/hero-800.avif 800w, /img/hero-1200.avif 1200w" sizes="100vw"&gt;&lt;img src="/img/hero-800.jpg" width="1600" height="900" alt="Sunrise" fetchpriority="high"&gt;&lt;/picture&gt;']])}`,
  brute: { why: `<p>A single <code>&lt;img src="hero-full.jpg"&gt;</code>: every device downloads the biggest JPEG, there is no modern format, no reserved size (CLS) and no priority hint for the LCP image.</p>`, code: `function buildPictureBrute(spec) {
  return '<img src="/img/' + spec.name + '-full.jpg" alt="' + spec.alt + '">';  // heavy, unsized, unescaped
}` },
  mcq: { q: 'In a &lt;picture&gt;, in which order should the &lt;source&gt; elements appear?', options: ['Largest file first', 'Most modern / best-compressing format first', 'Alphabetical', 'JPEG first'], answer: 1, explain: 'The browser picks the first source it supports. Put AVIF first, then WebP; the img fallback (JPEG) is used by browsers that support neither.' },
  hints: [`<p>Think in three small helpers: escape text, build a srcset string, build one source element.</p>`, `<p><code>srcset = widths.map(w =&gt; '/img/' + name + '-' + w + '.' + fmt + ' ' + w + 'w').join(', ')</code>. The middle width is <code>widths[Math.floor(widths.length / 2)]</code> (sort widths first).</p>`, `<p>Escape <code>&amp;</code> first, then <code>&lt;</code>, <code>&gt;</code>, <code>"</code>. With no formats you may output just the <code>&lt;img&gt;</code> inside <code>&lt;picture&gt;</code>. Keep attribute order stable so output is deterministic.</p>`],
  solution: {
    approach: `<p>Small pure string builder. Sort widths, produce the same srcset for each format, reserve space with width/height, and branch once on priority to decide loading attributes. Escaping the alt text prevents broken markup and injection.</p>`,
    code: { lang: 'js', run: true, code: `const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function buildPicture(spec) {
  const widths = [...spec.widths].sort((a, b) => a - b);
  const srcset = (fmt) => widths.map((w) => '/img/' + spec.name + '-' + w + '.' + fmt + ' ' + w + 'w').join(', ');
  const sources = spec.formats.map((fmt) =>
    '<source type="image/' + fmt + '" srcset="' + srcset(fmt) + '" sizes="' + esc(spec.sizes) + '">');
  const mid = widths[Math.floor(widths.length / 2)];
  const loading = spec.priority === 'high' ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  const img = '<img src="/img/' + spec.name + '-' + mid + '.' + spec.fallback + '" width="' + spec.width +
    '" height="' + spec.height + '" alt="' + esc(spec.alt) + '" ' + loading + '>';
  return '<picture>' + sources.join('') + img + '</picture>';
}

console.log(buildPicture({ name: 'hero', widths: [800, 400, 1200], formats: ['avif', 'webp'], fallback: 'jpg',
  sizes: '(min-width: 1000px) 1000px, 100vw', width: 1600, height: 900, alt: 'Sunrise & "mist"', priority: 'high' }));
console.log(buildPicture({ name: 'card', widths: [400], formats: [], fallback: 'jpg', sizes: '50vw', width: 400, height: 300, alt: 'Product', priority: 'low' }));` },
    complexity: `<p>O(F × W) string building for F formats and W widths.</p>`,
    followUps: ['Add art direction with a <code>media</code> condition for a portrait crop.', 'Why must <code>sizes</code> be repeated per source (or inherited from the img)?']
  }
});

practice.push({
  title: 'Prefetch Queue with Priority and Concurrency Limit', level: 'Medium', tags: ['prefetch', 'queues', 'promises', 'code splitting'], companies: ['Netflix', 'Uber', 'LinkedIn'],
  statement: `<p>Build <code>createPrefetcher(load, limit)</code> to warm lazy chunks. <code>prefetch(key, priority)</code> (priority <code>'high'</code> for hover/focus, <code>'low'</code> for idle) must: (1) ignore a key that was already requested; (2) run at most <code>limit</code> loads at the same time; (3) when a slot frees up, start <b>high</b> priority keys before <b>low</b>, FIFO inside each priority; (4) allow a failed key to be retried later. <code>whenIdle()</code> returns a Promise that resolves when nothing is queued or running.</p>`,
  constraints: `<code>load(key)</code> returns a Promise. Up to 10<sup>4</sup> keys; limit between 1 and 6.`,
  example: `<p>limit = 2; calls: prefetch('a'), prefetch('b'), prefetch('c'), prefetch('d','high'). Loads take equal time.</p>${H.table(['Start order', 'Why'], [['a, b', 'two free slots'], ['<span class="c-g">d</span>', 'high priority jumps ahead of c'], ['c', 'last']])}`,
  brute: { why: `<p>Call <code>load()</code> immediately for every request. Hovering across a menu of 30 links starts 30 simultaneous downloads that compete with the page's own critical requests, duplicates the same chunk if the pointer re-enters, and has no priority at all.</p>`, code: `const prefetchNaive = (load) => (key) => load(key);   // no dedupe, no limit, no priority` },
  mcq: { q: 'Why limit concurrent prefetches?', options: ['Browsers forbid more than 2 requests', 'Speculative downloads compete for bandwidth with resources the current page needs', 'To keep the code simple', 'To avoid using the cache'], answer: 1, explain: 'Prefetch is speculative. A burst of them slows down the page the user is actually looking at (and may be wasted). A small limit plus low priority keeps it harmless.' },
  hints: [`<p>You need: a Set of keys already requested, two FIFO queues, and a counter of active loads.</p>`, `<p>A <code>pump()</code> function: while <code>active &lt; limit</code> take the next key (high queue first, then low) and start it. Call <code>pump()</code> after adding a key and whenever a load finishes.</p>`, `<p>On failure remove the key from the "seen" Set so it can be retried. Idle = active is 0 and both queues are empty; keep a list of waiting resolvers and resolve them at the end of <code>pump()</code> when idle.</p>`],
  solution: {
    approach: `<p>Classic bounded worker pool with two priority lanes. <code>pump()</code> is the only place that starts work, which keeps the invariants (never above the limit, high before low) in one spot.</p>`,
    code: { lang: 'js', run: true, code: `function createPrefetcher(load, limit = 2) {
  const seen = new Set();
  const high = [], low = [];
  let active = 0, waiters = [];

  function pump() {
    while (active < limit && (high.length || low.length)) {
      const key = high.length ? high.shift() : low.shift();   // high priority first, FIFO inside a lane
      active++;
      Promise.resolve()
        .then(() => load(key))
        .catch(() => seen.delete(key))                         // failed: allow a retry later
        .finally(() => { active--; pump(); });
    }
    if (active === 0 && !high.length && !low.length) { waiters.forEach((r) => r()); waiters = []; }
  }
  return {
    prefetch(key, priority = 'low') {
      if (seen.has(key)) return false;                         // dedupe
      seen.add(key);
      (priority === 'high' ? high : low).push(key);
      pump();
      return true;
    },
    whenIdle() {
      return new Promise((resolve) => {
        if (active === 0 && !high.length && !low.length) resolve(); else waiters.push(resolve);
      });
    }
  };
}

const started = [];
const pf = createPrefetcher((key) => new Promise((res) => { started.push(key); setTimeout(res, 20); }), 2);
['a', 'b', 'c'].forEach((k) => pf.prefetch(k));
pf.prefetch('d', 'high');
console.log('duplicate ignored?', pf.prefetch('a') === false);
pf.whenIdle().then(() => console.log('start order:', started.join(' ')));   // a b d c` },
    complexity: `<p>O(1) amortised per key; memory O(keys). Arrays used as queues with <code>shift</code> are fine for small queues; use an index pointer or deque for very large ones.</p>`,
    followUps: ['Skip prefetching when <code>navigator.connection.saveData</code> is true or the connection is slow.', 'Cancel low-priority loads when the user navigates.']
  }
});

practice.push({
  title: 'Compute INP from Interaction Events', level: 'Hard', tags: ['INP', 'percentiles', 'grouping', 'web vitals'], companies: ['Google', 'Vercel', 'Shopify'],
  statement: `<p>You collected event timings: <code>{ interactionId, inputDelay, processing, presentation }</code> (ms). One user interaction (a click) produces several events (pointerdown, pointerup, click) that share an <code>interactionId</code>; the <b>latency of an interaction</b> is the <b>largest</b> <code>inputDelay + processing + presentation</code> among its events. The page's <b>INP</b> is the slowest interaction, except that on busy pages one worst outlier is ignored for every 50 interactions: sort latencies descending and take index <code>min(n - 1, floor(n / 50))</code>. Return <code>{ inp, rating, interactions }</code> (rating: good ≤ 200, needs-improvement ≤ 500, else poor), or <code>inp = null</code> if there were no interactions.</p>`,
  constraints: `0 ≤ events ≤ 10<sup>5</sup>. Events with <code>interactionId = 0</code> are not interactions (hover, scroll) and must be ignored.`,
  example: `<p>Events: id 1: (10,50,20), (5,120,30) → latency max(80, 155) = <b>155</b>. id 2: (0,300,100) → <b>400</b>. id 0: (0,900,0) → ignored. n = 2 → index min(1, 0) = 0 → INP = <b>400</b> → needs-improvement.</p>`,
  brute: { why: `<p>Average all event durations. The mean hides the single awful 400 ms click inside many fast ones - which is exactly the experience INP is meant to expose (users remember the worst interaction), and it counts non-interaction events and every event of an interaction separately.</p>`, code: `function inpBrute(events) {
  if (!events.length) return null;
  const total = events.reduce((s, e) => s + e.inputDelay + e.processing + e.presentation, 0);
  return total / events.length;          // average: hides outliers, counts hover/scroll
}` },
  mcq: { q: 'A page had 120 interactions. Which latency in the descending list is the INP?', options: ['The 1st (the worst)', 'The 3rd', 'The 120th', 'The average'], answer: 1, explain: 'Index = floor(120 / 50) = 2 (zero-based), i.e. the 3rd worst. Roughly one outlier is forgiven per 50 interactions (approximating the 98th percentile).' },
  hints: [`<p>Two stages: first reduce events to <i>interactions</i> (group by id, take the max), then pick a rank from the sorted interaction latencies.</p>`, `<p>Use a Map from interactionId to best latency. Skip id 0. Then sort the map's values in descending order.</p>`, `<p>Index is <code>Math.min(n - 1, Math.floor(n / 50))</code>. For n &lt; 50 that is 0, i.e. the maximum. Empty input → <code>null</code>. Sorting is O(n log n); for huge n a selection algorithm would do, but sort is fine here.</p>`],
  solution: {
    approach: `<p>Group, then rank. Grouping by interaction id with a max-reduction models how the browser combines pointerdown/up/click. Taking the (floor(n/50))-th largest is the documented outlier-forgiveness rule.</p>`,
    code: { lang: 'js', run: true, code: `function computeINP(events) {
  const byId = new Map();
  for (const e of events) {
    if (!e.interactionId) continue;                         // 0 / undefined: hover, scroll - not an interaction
    const latency = e.inputDelay + e.processing + e.presentation;
    byId.set(e.interactionId, Math.max(byId.get(e.interactionId) || 0, latency)); // slowest event wins
  }
  const latencies = [...byId.values()].sort((a, b) => b - a); // descending
  const n = latencies.length;
  if (n === 0) return { inp: null, rating: null, interactions: 0 };
  const inp = latencies[Math.min(n - 1, Math.floor(n / 50))];
  const rating = inp <= 200 ? 'good' : inp <= 500 ? 'needs-improvement' : 'poor';
  return { inp, rating, interactions: n };
}

console.log(computeINP([
  { interactionId: 1, inputDelay: 10, processing: 50, presentation: 20 },
  { interactionId: 1, inputDelay: 5, processing: 120, presentation: 30 },
  { interactionId: 2, inputDelay: 0, processing: 300, presentation: 100 },
  { interactionId: 0, inputDelay: 0, processing: 900, presentation: 0 }
]));                                                         // inp 400, needs-improvement
const many = Array.from({ length: 120 }, (_, i) => ({ interactionId: i + 1, inputDelay: 0, processing: i === 0 ? 800 : i === 1 ? 700 : 50 + i, presentation: 0 }));
console.log(computeINP(many));                               // forgives 2 outliers -> third worst` },
    complexity: `<p>Time O(n log n) for sorting n interactions; space O(n).</p>`,
    followUps: ['How would you compute it in a streaming way with bounded memory? (Keep only the top k = floor(n/50)+1 latencies in a min-heap.)', 'How does INP differ from the old FID?']
  }
});

practice.push({
  title: 'Break a Long Task into Chunks and Yield', level: 'Hard', tags: ['INP', 'long tasks', 'async', 'scheduling'], companies: ['Google', 'Microsoft', 'Atlassian'],
  statement: `<p>Implement <code>processInChunks(items, work, { budgetMs, now, yieldFn })</code> (returns a Promise). It must call <code>work(item)</code> for every item, but never keep the main thread busy for more than about <code>budgetMs</code> in one go: run items until <code>now() - chunkStart &gt;= budgetMs</code>, then <code>await yieldFn()</code> to let the browser handle input and paint, then continue. Always make progress (at least one item per chunk). Resolve with <code>{ chunks, longestTaskMs }</code>. <code>now</code> and <code>yieldFn</code> are injected so you can test with a fake clock.</p>`,
  constraints: `1 ≤ items ≤ 10<sup>6</sup>, 1 ≤ budgetMs ≤ 1000. Each <code>work</code> call is short (≪ budget).`,
  example: `<p>1000 items, each costs 1 ms, <code>budgetMs = 50</code>.</p>${H.table(['Version', 'Longest task', 'User can click during…'], [['one loop', '<span class="c-r">1000 ms</span>', 'nothing - frozen for a second'], ['chunked', '<span class="c-g">50 ms</span> × 20 chunks', 'a gap after every chunk']])}`,
  brute: { why: `<p>One synchronous loop. The browser cannot run input handlers or paint until it finishes, so a click during the loop waits up to the whole duration: INP = the entire loop time plus rendering.</p>`, code: `function processAllAtOnce(items, work) {
  for (const item of items) work(item);     // a single long task
}` },
  mcq: { q: 'Why does yielding between chunks improve INP?', options: ['It makes the loop finish sooner', 'It lets pending input events and rendering run between chunks', 'It lowers CPU usage to zero', 'It moves the work to the GPU'], answer: 1, explain: 'The total work is the same (or slightly more), but each task is short, so a user click waits at most one chunk instead of the whole job.' },
  hints: [`<p>Think of the main thread as a single-lane road. A 1-second truck blocks everyone; ten 100 ms trucks with gaps let others through.</p>`, `<p>Outer loop over chunks, inner loop over items while the time spent is below the budget. Record the chunk's duration for <code>longestTaskMs</code>.</p>`, `<p>Only yield when items remain (do not yield after the last chunk). The inner loop condition checks <code>now() - start &lt; budgetMs</code> <i>before</i> processing, which guarantees at least one item per chunk when budget &gt; 0. In browsers <code>yieldFn</code> is <code>scheduler.yield()</code> or <code>setTimeout(0)</code> wrapped in a Promise.</p>`],
  solution: {
    approach: `<p>Time-sliced loop. The budget is checked between items, so a chunk lasts roughly the budget (plus at most one item). Yielding hands control back to the event loop. In production prefer <code>scheduler.yield()</code>, which also keeps your continuation ahead of other queued tasks.</p>`,
    code: { lang: 'js', run: true, code: `async function processInChunks(items, work, { budgetMs = 50, now, yieldFn }) {
  let i = 0, chunks = 0, longest = 0;
  while (i < items.length) {
    const start = now();
    chunks++;
    while (i < items.length && now() - start < budgetMs) work(items[i++]); // time-sliced inner loop
    longest = Math.max(longest, now() - start);
    if (i < items.length) await yieldFn();                                  // give the browser a turn
  }
  return { chunks, longestTaskMs: longest };
}

// Test with a fake clock: each item costs 1 ms, each yield lets the browser spend 4 ms rendering.
let clock = 0;
const now = () => clock;
const work = () => { clock += 1; };
const yieldFn = async () => { clock += 4; };
const items = Array.from({ length: 1000 }, (_, i) => i);

processInChunks(items, work, { budgetMs: 50, now, yieldFn }).then((r) => {
  console.log('chunked:', r, '| total virtual time', clock, 'ms');
  console.log('single loop would be one task of', items.length, 'ms');
});` },
    complexity: `<p>O(n) work; extra overhead of one yield per budget. Responsiveness improves from O(n) worst-case input delay to O(budget).</p>`,
    followUps: ['Use <code>isInputPending()</code> / <code>scheduler.yield()</code> to yield only when needed.', 'Move the work to a Web Worker - when is that better than chunking? (Pure CPU work with no DOM access.)']
  }
});

practice.push({
  title: '2D Grid Virtualization (Rows and Columns)', level: 'Hard', tags: ['virtualization', 'grid', 'binary search', 'machine coding'], companies: ['Google', 'Atlassian', 'Microsoft'],
  statement: `<p>A spreadsheet-like grid has <code>rows</code> rows of fixed height <code>rowH</code> and columns of <b>different widths</b> given by <code>colWidths</code>. Implement <code>gridWindow({ rows, rowH, colWidths, viewportW, viewportH, scrollTop, scrollLeft, overscan })</code> returning <code>{ rowStart, rowEnd, colStart, colEnd, cells, totalW, totalH }</code>: the inclusive row range and column range to render (including overscan in both axes, clamped), the number of rendered cells, and the full content size. Clamp both scroll offsets. Use binary search on column prefix sums.</p>`,
  constraints: `1 ≤ rows ≤ 10<sup>7</sup>, 1 ≤ cols ≤ 10<sup>5</sup>, widths 20..2000 px. Each call O(log cols).`,
  example: `<p>rows=1000, rowH=30, colWidths=[100,200,100,200,100,…], viewport 300×90, scrollTop=0, scrollLeft=150, overscan=0.</p>${H.table(['Axis', 'Visible', 'Why'], [['rows', '0..2', 'pixels 0..89 / 30'], ['columns', '1..3', 'col 1 spans 100..299 (contains x=150), col 2 spans 300..399, the viewport ends at x=449 so col 3 (400..599) also touches']])}<p>So columns <b>1..3</b>, cells = 3 × 3 = <b>9</b> (not 1000 × 5000).</p>`,
  brute: { why: `<p>Render every cell: 1000 × 5000 = 5 million DOM nodes. Or scan all columns on each scroll event to find the visible ones: O(cols) work per frame even though only a handful of columns are visible.</p>`, code: `function gridWindowBrute(colWidths, scrollLeft, viewportW) {
  let x = 0, first = -1, last = -1;
  for (let c = 0; c < colWidths.length; c++) {      // O(cols) every scroll event
    if (first < 0 && x + colWidths[c] > scrollLeft) first = c;
    if (x < scrollLeft + viewportW) last = c;
    x += colWidths[c];
  }
  return { first, last };
}` },
  mcq: { q: 'How many DOM cells does a 2D virtualized grid render, roughly?', options: ['rows × cols', 'visible rows × visible columns (plus overscan)', 'rows + cols', 'Always 100'], answer: 1, explain: 'The rendered set is the cross-product of the visible row range and the visible column range. It stays small however large the sheet is.' },
  hints: [`<p>Rows and columns are independent axes. Solve one axis, then repeat for the other, and multiply the counts.</p>`, `<p>Rows are fixed height: floor/ceil math. Columns are variable: prefix sums of widths + binary search for the column containing a pixel.</p>`, `<p>Write a helper <code>range(offsetsOrFixed, scroll, viewport, count, overscan)</code> or two small functions. Clamp scroll to <code>[0, max(0, total - viewport)]</code> on each axis; clamp the last pixel to <code>total - 1</code>.</p>`],
  solution: {
    approach: `<p>Axis-by-axis windowing: O(1) math for rows, O(log cols) binary search for columns, then multiply to get the rendered cell count. This is exactly the structure of grid virtualizers (react-window FixedSizeGrid / VariableSizeGrid, TanStack Virtual with two virtualizers).</p>`,
    code: { lang: 'js', run: true, code: `function gridWindow({ rows, rowH, colWidths, viewportW, viewportH, scrollTop, scrollLeft, overscan }) {
  const cols = colWidths.length;
  const offsets = [0];
  for (const w of colWidths) offsets.push(offsets[offsets.length - 1] + w);   // (precompute once in real life)
  const totalW = offsets[cols], totalH = rows * rowH;

  const top = Math.min(Math.max(scrollTop, 0), Math.max(0, totalH - viewportH));
  const left = Math.min(Math.max(scrollLeft, 0), Math.max(0, totalW - viewportW));

  // rows: fixed height
  const firstRow = Math.floor(top / rowH);
  const lastRow = Math.min(rows - 1, Math.ceil((top + viewportH) / rowH) - 1);

  // columns: variable width -> binary search for the column containing a pixel
  const colAt = (x) => {
    let lo = 0, hi = cols - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (offsets[mid] <= x) lo = mid; else hi = mid - 1; }
    return lo;
  };
  const firstCol = colAt(left);
  const lastCol = colAt(Math.min(totalW - 1, left + viewportW - 1));

  const rowStart = Math.max(0, firstRow - overscan), rowEnd = Math.min(rows - 1, lastRow + overscan);
  const colStart = Math.max(0, firstCol - overscan), colEnd = Math.min(cols - 1, lastCol + overscan);
  return { rowStart, rowEnd, colStart, colEnd, cells: (rowEnd - rowStart + 1) * (colEnd - colStart + 1), totalW, totalH };
}

const colWidths = Array.from({ length: 5000 }, (_, i) => (i % 2 ? 200 : 100));
console.log(gridWindow({ rows: 1000, rowH: 30, colWidths, viewportW: 300, viewportH: 90, scrollTop: 0, scrollLeft: 150, overscan: 0 }));
console.log(gridWindow({ rows: 1000000, rowH: 30, colWidths, viewportW: 1200, viewportH: 600, scrollTop: 1e12, scrollLeft: 1e12, overscan: 2 }));` },
    complexity: `<p>O(log cols) per call after O(cols) preprocessing; DOM cells ≈ (viewport rows + 2·overscan) × (viewport cols + 2·overscan).</p>`,
    followUps: ['Add frozen header row and first column that never scroll away.', 'Support column resizing - which prefix sums change?']
  }
});

practice.push({
  title: 'Critical Request Chain: Earliest Finish of a Resource', level: 'Hard', tags: ['critical rendering path', 'DAG', 'longest path', 'dynamic programming'], companies: ['Google', 'Cloudflare', 'Akamai'],
  statement: `<p>A page's resources form a dependency graph: <code>resources = { id: { ms, deps: [ids] } }</code>. A resource can start only after <b>all</b> its dependencies have finished (for example the font file is discovered only after the CSS is parsed; the API call after the JS runs), and then takes <code>ms</code> milliseconds. Implement <code>criticalPath(resources, target)</code> returning <code>{ finish, path }</code>: the earliest time the <code>target</code> resource can finish (assuming unlimited parallelism) and the chain of resource ids that determines it. Throw an error on a dependency cycle or unknown id.</p>`,
  constraints: `Up to 10<sup>4</sup> resources, deps form a DAG in valid input (detect cycles anyway). Depth may be large (use iteration or be careful with recursion).`,
  example: `<p>html 200; css 100 (dep html); font 300 (dep css); hero 400 (dep html); js 250 (dep html); api 150 (dep js).</p>${H.table(['Resource', 'Finish', 'Critical chain'], [['font', '600', 'html → css → font'], ['hero', '600', 'html → hero'], ['api', '600', 'html → js → api']])}<p>Everything ends at 600 here. Preloading the font (so it no longer waits for CSS) would cut the font chain to 200 + 300 = 500.</p>`,
  brute: { why: `<p>Recursively compute the finish time of each dependency without remembering results. In a graph with many diamonds (A depends on B and C, which both depend on D, ...) the same resource is recomputed along every path: exponential time. Cycles recurse until the stack overflows.</p>`, code: `function finishBrute(resources, id) {
  const r = resources[id];
  let start = 0;
  for (const d of r.deps) start = Math.max(start, finishBrute(resources, d));   // recomputed on every path
  return start + r.ms;
}` },
  mcq: { q: 'Which change shortens a chain html → css → font (200 + 100 + 300 ms) the most?', options: ['Compress the HTML more', '&lt;link rel="preload" as="font"&gt; so the font does not wait for the CSS', 'Add more servers', 'Use a bigger image'], answer: 1, explain: 'Preload removes the css → font dependency: the font can start right after the HTML, so the chain becomes html → font = 500 ms instead of 600 ms.' },
  hints: [`<p>The finish time of a resource = its own duration + the <i>latest</i> finish among its dependencies (the slowest prerequisite).</p>`, `<p>That is the longest path in a DAG. Memoize each node's result so it is computed once, and remember which dependency gave the maximum.</p>`, `<p>Detect cycles with a three-state marker: unvisited / in-progress / done. Meeting an in-progress node means a cycle. Rebuild the path by following the stored "best predecessor" pointers from the target back to a node without deps, then reverse. Use an explicit stack if the depth can be large.</p>`],
  solution: {
    approach: `<p>Longest path in a DAG via memoized DFS with cycle detection. Each resource stores its earliest finish and the predecessor that caused it; walking the predecessors from the target gives the critical chain - the thing you must shorten (preload, inline, remove, reorder) to speed up the page.</p>`,
    code: { lang: 'js', run: true, code: `function criticalPath(resources, target) {
  const state = new Map();    // id -> 1 (in progress) | 2 (done)
  const finish = new Map();   // id -> earliest finish time
  const pred = new Map();     // id -> dependency that determined the start time

  function visit(id) {
    if (!resources[id]) throw new Error('Unknown resource: ' + id);
    if (state.get(id) === 2) return finish.get(id);
    if (state.get(id) === 1) throw new Error('Dependency cycle at ' + id);
    state.set(id, 1);
    let start = 0, best = null;
    for (const d of resources[id].deps) {
      const f = visit(d);
      if (f > start || best === null) { start = f; best = d; }   // slowest prerequisite decides the start
    }
    finish.set(id, start + resources[id].ms);
    pred.set(id, best);
    state.set(id, 2);
    return finish.get(id);
  }
  const total = visit(target);
  const path = [];
  for (let cur = target; cur !== null; cur = pred.get(cur)) path.push(cur);
  return { finish: total, path: path.reverse() };
}

const res = {
  html: { ms: 200, deps: [] }, css: { ms: 100, deps: ['html'] }, font: { ms: 300, deps: ['css'] },
  hero: { ms: 400, deps: ['html'] }, js: { ms: 250, deps: ['html'] }, api: { ms: 150, deps: ['js'] }
};
console.log(criticalPath(res, 'font'));                        // finish 600, path html > css > font
res.font.deps = ['html'];                                      // after preloading the font
console.log(criticalPath(res, 'font'));                        // finish 500, path html > font
try { criticalPath({ a: { ms: 1, deps: ['b'] }, b: { ms: 1, deps: ['a'] } }, 'a'); } catch (e) { console.log('error:', e.message); }` },
    complexity: `<p>Time O(V + E), space O(V). (For very deep chains convert the recursion to an explicit stack.)</p>`,
    followUps: ['Limit parallelism to 6 connections per origin: how does the problem change? (It becomes a scheduling problem.)', 'Which edges would you attack first: the ones on the critical path of LCP, not just any chain.']
  }
});
/* =====================================================================
   QUIZ (14)
   ===================================================================== */
quiz.push({ q: 'Which Core Web Vital replaced First Input Delay (FID) in March 2024?', options: ['Interaction to Next Paint (INP)', 'Total Blocking Time (TBT)', 'First Contentful Paint (FCP)', 'Time to Interactive (TTI)'], answer: 0, explain: 'INP measures the latency of all interactions across the page visit (the slowest, roughly), while FID only measured the input delay of the first interaction.' });
quiz.push({ q: 'You animate a box moving 200 px to the right. Which CSS is the cheapest for the browser?', options: ['left: 200px', 'margin-left: 200px', 'transform: translateX(200px)', 'width: 200px'], answer: 2, explain: 'transform is composite-only: no layout and no paint per frame. left, margin and width all trigger layout.' });
quiz.push({ q: 'What is the difference between async and defer on a script tag?', options: ['async runs after parsing in order; defer runs as soon as it downloads', 'defer runs after parsing in document order; async runs as soon as it downloads, in any order', 'They are identical', 'async blocks parsing; defer does not'], answer: 1, explain: 'Both download in parallel without blocking the parser. defer waits for the document to finish parsing and keeps order; async executes immediately when ready and order is not guaranteed.' });
quiz.push({ q: 'A loop sets element.style.width and then reads element.offsetWidth of the next element on every iteration. What is the problem?', options: ['Nothing, browsers batch everything', 'Layout thrashing: every read after a write forces a synchronous reflow', 'A memory leak', 'The reads return undefined'], answer: 1, explain: 'Writes make layout dirty; a geometry read then forces the browser to recompute layout immediately. Repeating that in a loop costs N reflows instead of 1.' });
quiz.push({ q: 'Your LCP element is a hero image with loading="lazy". What should you do?', options: ['Keep lazy and add a placeholder', 'Remove loading="lazy" and add fetchpriority="high"', 'Convert it to a CSS background image', 'Add async to the img'], answer: 1, explain: 'Lazy loading delays discovery and download until layout says the image is near the viewport. The LCP image should load eagerly with high priority.' });
quiz.push({ q: 'Which technique most directly prevents CLS from an image that loads late?', options: ['Compress it harder', 'Set width and height attributes (or aspect-ratio) so space is reserved', 'Use a CDN', 'Load it with JavaScript'], answer: 1, explain: 'The browser can then compute the box size before the file arrives, so nothing below it moves when the image appears.' });
quiz.push({ q: 'srcset="a.jpg 400w, b.jpg 800w, c.jpg 1600w" sizes="100vw" on a 390 px wide phone with DPR 3. Which file does the browser need at least?', options: ['a.jpg (400w)', 'b.jpg (800w)', 'c.jpg (1600w)', 'Any file works'], answer: 2, explain: 'Needed width = 390 x 3 = 1170 px. The smallest candidate that is at least 1170 px wide is the 1600w file.' });
quiz.push({ q: 'rowH = 50, viewportH = 300, scrollTop = 500. What is the first visible row index?', options: ['6', '10', '16', '500'], answer: 1, explain: 'first = floor(scrollTop / rowH) = floor(500 / 50) = 10.' });
quiz.push({ q: 'Which tool fits a search box that calls an API as the user types?', options: ['Throttle at 16 ms', 'Debounce around 300 ms (plus abort stale requests)', 'requestAnimationFrame', 'No limiting is needed'], answer: 1, explain: 'Only the final text matters, so wait for a pause in typing (debounce). AbortController cancels older in-flight requests so results cannot arrive out of order.' });
quiz.push({ q: 'Which of these is NOT part of the render tree?', options: ['An element with visibility: hidden', 'An element with opacity: 0', 'An element with display: none', 'An element with a ::before pseudo-element'], answer: 2, explain: 'display: none removes the element (and its subtree) from the render tree. visibility:hidden and opacity:0 still occupy space and stay in the tree. Pseudo-elements are included.' });
quiz.push({ q: 'What does { passive: true } on a touchstart/wheel listener promise?', options: ['The handler runs only once', 'The handler will never call preventDefault(), so scrolling need not wait for it', 'The handler runs in a worker', 'The listener is removed after the first event'], answer: 1, explain: 'If a listener could cancel the scroll, the browser must wait for it before scrolling. A passive listener removes that wait and keeps scrolling smooth.' });
quiz.push({ q: 'A Core Web Vitals report says LCP 3.2 s, INP 150 ms, CLS 0.05 at the 75th percentile. What is the verdict?', options: ['Pass', 'Fail because LCP is in needs-improvement', 'Fail because INP is too low', 'Cannot tell without Lighthouse'], answer: 1, explain: 'LCP must be ≤ 2.5 s to be good. All three vitals must be good at p75 to pass; here INP and CLS are fine but LCP is not.' });
quiz.push({ q: 'Which statement about code splitting is true?', options: ['dynamic import() creates a separate chunk loaded on demand', 'Splitting always makes the total bytes smaller', 'It only works with React', 'Chunks cannot be cached'], answer: 0, explain: 'import() is the standard split point. The total bytes may even grow a little, but the first load is much smaller. Hashed chunks cache very well.' });
quiz.push({ q: 'Which is the best way to load an off-screen comments widget only when needed?', options: ['Import it in main.js', 'IntersectionObserver on a placeholder, then dynamic import() when near the viewport', 'setInterval polling scrollTop every 10 ms', 'Put it inside an iframe without dimensions'], answer: 1, explain: 'IntersectionObserver tells you cheaply when the placeholder approaches the viewport, with no scroll listener and no layout reads; import() then fetches the code. Keep the placeholder sized to avoid CLS.' });

/* =====================================================================
   INTERVIEW (13)
   ===================================================================== */
interview.push({ q: 'Walk me through what happens in the browser from receiving HTML to pixels on screen (the critical rendering path).', level: 'B', a: `<p>The browser parses HTML incrementally into the <b>DOM</b> and, in parallel, parses CSS into the <b>CSSOM</b>. CSS is render-blocking because painting with half the rules would show wrong styles; a plain script is parser-blocking and also waits for pending CSS. DOM + CSSOM are combined into the <b>render tree</b>, which has only visible nodes with computed styles (display:none and head are excluded). <b>Layout</b> computes geometry, <b>paint</b> records draw commands per layer, and <b>composite</b> stacks the layers on the GPU to produce the frame. To speed it up: inline critical CSS, defer scripts, preload key resources, and keep the HTML discoverable by the preload scanner.</p>`, followUps: ['Which steps does a change to transform skip?', 'What is the preload scanner and what can it not see?', 'How is CSS different from JS in how it blocks?'] });
interview.push({ q: 'What is the difference between reflow and repaint? Give examples of each.', level: 'B', a: `<p>A <b>reflow</b> (layout) recalculates sizes and positions of elements: changing <code>width</code>, <code>margin</code>, <code>font-size</code>, adding or removing nodes, changing text, resizing the window. A <b>repaint</b> redraws pixels without changing geometry: <code>color</code>, <code>background-color</code>, <code>box-shadow</code>, <code>visibility</code>. A reflow almost always causes a repaint afterwards, so it is the more expensive one. There is a third, cheapest category: compositor-only changes (<code>transform</code>, <code>opacity</code>) that neither relayout nor repaint, because the element is already in its own layer and the GPU just re-stacks it. For animation, prefer the third kind.</p>`, followUps: ['Why does a reflow in one element often affect others?', 'How can you see repaints in DevTools?', 'Is opacity: 0 the same as display: none for the pipeline?'] });
interview.push({ q: 'What is layout thrashing and how do you fix it?', level: 'I', a: `<p>Layout thrashing happens when code alternates between <b>writing</b> to the DOM/styles (which marks layout dirty) and <b>reading</b> layout values like <code>offsetHeight</code> or <code>getBoundingClientRect()</code>. Each read forces the browser to run a synchronous reflow immediately, so a loop over N elements causes N reflows instead of one. The fix is to batch: do all reads first (layout is still clean, so reads are free), then all writes. Use <code>requestAnimationFrame</code> to put writes in the right phase, a small scheduler like fastdom, class toggles instead of many style writes, and ResizeObserver or IntersectionObserver instead of measuring manually. Often the best fix is pure CSS (grid or flex) which removes the JS measurement entirely.</p>`, followUps: ['Which properties and methods force layout?', 'How do you spot forced reflow in the Performance panel?', 'Is reading layout in useLayoutEffect a problem?'] });
interview.push({ q: 'Explain the three Core Web Vitals, their thresholds and what typically causes each to be poor.', level: 'I', a: `<p><b>LCP</b> (loading) good ≤ 2.5 s: the time the largest visible element (usually a hero image or heading) renders; poor causes are slow TTFB, a late-discovered or lazy-loaded hero, an oversized image, and render-blocking CSS/JS. <b>INP</b> (responsiveness) good ≤ 200 ms: the slowest interaction from input to the next paint; poor causes are long tasks, heavy event handlers, large re-renders and big DOMs. <b>CLS</b> (visual stability) good ≤ 0.1: cumulative unexpected movement; causes are images without dimensions, late ads and banners, web-font swaps and content injected above existing content. They are judged at the 75th percentile of real users, per device class, and all three must be good to pass.</p>`, followUps: ['Why p75 and not the average?', 'What replaced FID and why?', 'What is the difference between field data and lab data?'] });
interview.push({ q: 'How would you diagnose and fix a poor LCP?', level: 'I', a: `<p>First find the LCP element (DevTools Performance panel, Lighthouse, or the <code>web-vitals</code> attribution build) and split the time into four parts: TTFB, resource load delay, resource load duration and element render delay. Then attack the largest part. High TTFB: CDN, caching, fewer redirects, edge rendering. High load delay: make the image discoverable in the HTML, preload it, add <code>fetchpriority="high"</code>, remove <code>loading="lazy"</code>. High load duration: serve AVIF/WebP at the right size with srcset. High render delay: remove render-blocking CSS/JS, avoid client-only rendering that hides content until hydration. Validate with a throttled-device trace, then confirm with field (RUM) data after deploy.</p>`, followUps: ['How does fetchpriority differ from preload?', 'Why is a CSS background-image bad for LCP?', 'What is the effect of server-side rendering on LCP?'] });
interview.push({ q: 'How do you eliminate Cumulative Layout Shift from images, ads and fonts?', level: 'I', a: `<p>Reserve space before content arrives. Images and videos: set <code>width</code> and <code>height</code> attributes (or CSS <code>aspect-ratio</code>) so the browser computes the box early. Ads and embeds: give the slot a <code>min-height</code> for the largest likely size and keep it even if empty, or place late UI as an overlay with <code>position: fixed</code>. Fonts: use <code>font-display: swap</code> plus a metric-matched fallback (<code>size-adjust</code>, <code>ascent-override</code>) or preload the font. Never insert content above what the user is reading unless triggered by their input (shifts within 500 ms of input are excluded). Animate with <code>transform</code>, not with layout properties, because transforms do not count as shifts.</p>`, followUps: ['How is a layout shift score computed?', 'What are session windows in CLS?', 'How do you find which element shifted in production?'] });
interview.push({ q: 'Design a virtualized list of 100,000 rows. What are the formulas and edge cases?', level: 'A', a: `<p>Use a scroll container, a spacer of <code>total * rowH</code> height to make the scrollbar honest, and render only the rows in the window translated by <code>start * rowH</code>. For fixed height: <code>first = floor(scrollTop / rowH)</code>, <code>last = ceil((scrollTop + viewportH) / rowH) - 1</code>, extend by overscan and clamp to <code>0..total-1</code>. Update at most once per frame (rAF) and use a passive listener. Edge cases: elastic over-scroll (clamp scrollTop), fewer rows than the viewport, huge totals above the browser's element height limit (~33M px in Chrome), variable heights (prefix sums + binary search + measured sizes), scroll anchoring when rows above change, a11y (<code>aria-rowcount</code>, <code>aria-rowindex</code>, focus), and Ctrl+F not finding unrendered rows. In production, use TanStack Virtual, react-window or Virtuoso.</p>`, followUps: ['How do you handle variable row heights?', 'How would you virtualize a grid in two dimensions?', 'When would you NOT virtualize?'] });
interview.push({ q: 'Throttle vs debounce: explain with use cases and implement debounce.', level: 'I', a: `<p><b>Debounce</b> delays the call until events have stopped for <code>wait</code> ms; use it for search-as-you-type, autosave and window-resize-end. <b>Throttle</b> guarantees at most one call per interval during a continuous burst; use it for scroll position tracking, drag handlers and analytics sampling. A debounce implementation keeps a timer in a closure: on each call clear the timer and set a new one that runs <code>fn.apply(this, args)</code> after <code>wait</code>; return a function with <code>cancel()</code>. A leading option fires at the start of the burst. For visual updates prefer <code>requestAnimationFrame</code> to a timer. In React, create the debounced function once (useMemo/useRef) and cancel it on unmount.</p>`, followUps: ['How would you implement throttle with leading and trailing calls?', 'How do you test these with fake timers?', 'What goes wrong if you create the debounced function inside render?'] });
interview.push({ q: 'How do you reduce the JavaScript bundle size and the cost of loading it?', level: 'I', a: `<p>First measure with a bundle analyzer. Then: route-based and component-based <b>code splitting</b> with <code>import()</code> and <code>React.lazy</code>; <b>tree shaking</b> (ES module libraries, <code>sideEffects</code> flags, avoid barrel files); replacing heavy dependencies (moment, full lodash) with lighter ones; dropping polyfills for modern browsers; compression (Brotli); long-term caching with content-hashed filenames and a separate vendor chunk; <code>modulepreload</code> or hover/idle prefetch for likely next routes; and moving work to the server (SSR, React Server Components) so less JS ships at all. Set a performance budget in CI so regressions fail the build. Remember JS is costly to parse and execute, not just download.</p>`, followUps: ['What is the difference between preload and prefetch?', 'What is a chunk load error and how do you handle it?', 'Does code splitting always reduce total bytes?'] });
interview.push({ q: 'How would you optimize images on a content-heavy site?', level: 'I', a: `<p>Choose the right format: AVIF first, WebP next and JPEG as a fallback via <code>&lt;picture&gt;</code>; SVG for logos and icons; video instead of animated GIF. Serve the right size with <code>srcset</code> (w descriptors) and an accurate <code>sizes</code>; the browser multiplies slot width by DPR and picks the smallest sufficient file. Reserve space with width/height or aspect-ratio. Prioritise: the LCP image eager with <code>fetchpriority="high"</code> (and possibly preloaded); everything below the fold with <code>loading="lazy"</code> and <code>decoding="async"</code>. Generate variants at build time or with an image CDN that negotiates format using the Accept header, cache them with immutable headers, and strip metadata. Verify quality visually and track bytes per page.</p>`, followUps: ['What happens if sizes is missing?', 'When is art direction needed?', 'How do image CDNs avoid cache fragmentation?'] });
interview.push({ q: 'Why are transform and opacity animations smoother than animating top/left/width, and what does will-change do?', level: 'A', a: `<p>Animating <code>left</code> or <code>width</code> changes geometry, so every frame the main thread runs style, layout, paint and then composite; any JavaScript jank delays all of it. <code>transform</code> and <code>opacity</code> on an element that has its own compositor layer need only the composite step, which runs on the compositor thread/GPU, so they stay smooth even when the main thread is busy. <code>will-change: transform</code> is a hint that creates the layer ahead of time to avoid a first-frame hitch, but each layer costs GPU memory and too many layers slow compositing, so apply it just before animating and remove it afterwards. Other tools: <code>contain</code>, <code>content-visibility</code>, Web Animations API, and checking Layers/Paint flashing in DevTools.</p>`, followUps: ['What creates a new compositing layer?', 'Why can box-shadow animation still be slow?', 'How does a 120 Hz display change the budget?'] });
interview.push({ q: 'A page has good lab scores in Lighthouse but bad Core Web Vitals in the field. Why, and what do you do?', level: 'A', a: `<p>Lighthouse is one synthetic run on a fixed profile, with no real interactions, no logged-in states, a warm lab network, and no third-party variability. Field data (CrUX or your own RUM) covers real devices, networks, geographies, consent banners, A/B variants, ads, and real interactions across the whole visit, measured at p75. INP cannot even be measured in Lighthouse; TBT is only a proxy. The approach: instrument RUM with the <code>web-vitals</code> library (with attribution), segment by device, country, route and connection, find the worst segments and the actual LCP element or interaction target, reproduce locally with matching throttling (e.g. a low-end Android profile), fix, then watch the p75 trend after release. Add budgets and synthetic checks in CI so regressions are caught early.</p>`, followUps: ['What is the CrUX dataset and its limits?', 'How would you attribute a slow INP to a specific handler?', 'Why do third-party scripts hurt field data more?'] });
interview.push({ q: 'Frontend system design angle: how would you keep a feed with infinite scroll fast after thousands of items?', level: 'E', a: `<p>Combine loading and rendering strategies. Data: cursor-based pagination, prefetch the next page when a sentinel (IntersectionObserver with a rootMargin) nears the viewport, cache pages by cursor and cancel stale requests. Rendering: virtualize the list so only the visible window plus overscan exists in the DOM, with variable-height support (measured sizes, offsets, scroll anchoring), stable keys, and cheap memoized row components. Media: lazy-load images with reserved aspect ratios, correct srcset, and pause off-screen videos. Main thread: handlers are passive and rAF-batched, heavy work is chunked or moved to workers, expensive updates use transitions. Resilience and UX: skeletons with the same height, restore scroll position on back navigation (bfcache), accessibility roles (<code>role="feed"</code>, aria-setsize/posinset), and monitoring INP and memory in RUM.</p>`, followUps: ['How do you restore scroll position after navigating back?', 'How do you handle new items inserted at the top?', 'What would you measure to know it is working?'] });
registerModule({
  id: 'fe11',
  title: 'Rendering Pipeline & Web Performance',
  intro: `<p>Why do some pages appear instantly and others stutter? This module opens the browser's engine room. You will follow a page from HTML bytes to pixels (<b>DOM, CSSOM, render tree, layout, paint, composite</b>), learn what makes work expensive (<b>reflow vs repaint, layout thrashing</b>), and learn how Google measures the experience (<b>Core Web Vitals: LCP, INP, CLS</b>). Then you get the practical toolbox: <b>code splitting and lazy loading</b>, <b>image optimization</b>, <b>virtualization</b> of huge lists, and taming scroll events with <b>throttle, debounce and rAF</b>.</p><p>Everything starts with an analogy, then a visual, then runnable code, then real interview-style problems. This is one of the most asked topics in senior frontend and frontend system design interviews.</p>`,
  goals: [
    'Draw and explain the critical rendering path and say which fix shortens which step',
    'Predict whether a CSS or DOM change causes layout, paint or composite only, and choose the cheap option',
    'Find and fix layout thrashing by batching reads and writes',
    'Explain LCP, INP and CLS with thresholds, diagnose a poor LCP from its four parts, and remove layout shifts',
    'Split a bundle with dynamic import(), lazy-load images and components, and prefetch on intent',
    'Choose image formats and write correct srcset/sizes/picture markup with the right priority',
    'Virtualize a 100,000-row list by computing the visible window, and throttle or debounce noisy events correctly'
  ],
  prereqs: `Frontend modules 1-4 (How the Web Works, HTML, CSS Basics, DOM &amp; Events) and the intermediate React/Browser APIs modules are helpful. You should be comfortable with JavaScript closures, Promises and the event loop.`,
  hours: 12,
  topics: topics,
  quiz: quiz,
  interview: interview,
  practice: practice
});
})();
