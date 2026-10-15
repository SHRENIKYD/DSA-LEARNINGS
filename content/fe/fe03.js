(function () {
var topics = [], practice = [], quiz = [], interview = [];
var R = String.raw; // raw template strings so regex backslashes in code samples survive

/* =====================================================================
   Shared helpers used by the visualizers (plain JS, no DOM needed)
   ===================================================================== */
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function cmpArr(x, y) {
  for (var i = 0; i < Math.max(x.length, y.length); i++) {
    var a = x[i] || 0, b = y[i] || 0;
    if (a !== b) return a - b;
  }
  return 0;
}
function splitTop(s) { // split on commas that are not inside parentheses
  var out = [], d = 0, cur = '';
  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    if (ch === '(') d++;
    if (ch === ')') d--;
    if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}
// Specificity with a breakdown: t = [ids, classes/attrs/pseudo-classes, types/pseudo-elements]
function specDetail(sel) {
  var s = String(sel).replace(/"[^"]*"|'[^']*'/g, '""');
  var r = { ids: [], bs: [], cs: [], t: [0, 0, 0], notes: [] };
  var m, fn = /:(is|not|has|where|matches)\(/i;
  while ((m = fn.exec(s))) {
    var open = m.index + m[0].length, i = open, depth = 1;
    while (i < s.length && depth > 0) { if (s[i] === '(') depth++; else if (s[i] === ')') depth--; i++; }
    var inner = s.slice(open, i - 1);
    s = s.slice(0, m.index) + ' ' + s.slice(i);
    var name = m[1].toLowerCase();
    if (name === 'where') { r.notes.push(':where() always counts 0'); continue; }
    var best = [0, 0, 0], bestSel = '';
    splitTop(inner).forEach(function (p) { var d = specDetail(p); if (!bestSel || cmpArr(d.t, best) > 0) { best = d.t; bestSel = p.trim(); } });
    r.t[0] += best[0]; r.t[1] += best[1]; r.t[2] += best[2];
    r.notes.push(':' + name + '() takes its strongest argument ' + esc(bestSel) + ' = ' + best.join(','));
  }
  s = s.replace(/\[[^\]]*\]/g, function (x) { r.bs.push(x); r.t[1]++; return ''; });
  s = s.replace(/::?(before|after|first-line|first-letter)\b|::[\w-]+(\([^)]*\))?/gi, function (x) { r.cs.push(x); r.t[2]++; return ''; });
  s = s.replace(/#[\w-]+/g, function (x) { r.ids.push(x); r.t[0]++; return ''; });
  s = s.replace(/\.[\w-]+/g, function (x) { r.bs.push(x); r.t[1]++; return ''; });
  s = s.replace(/:[\w-]+(\([^)]*\))?/g, function (x) { r.bs.push(x); r.t[1]++; return ''; });
  s.split(/[\s>+~|,]+/).forEach(function (tok) { if (/^[a-zA-Z][\w-]*$/.test(tok)) { r.cs.push(tok); r.t[2]++; } });
  return r;
}

/* ---- a tiny fixed DOM (binary-tree shaped so the "tree" part can draw it) ---- */
var DOM = [
  { tag: 'main', id: 'app', cls: [], p: -1 },          // 0
  { tag: 'header', cls: [], p: 0 },                    // 1
  { tag: 'section', cls: ['card'], p: 0 },             // 2
  { tag: 'h1', cls: ['title'], p: 1 },                 // 3
  { tag: 'p', cls: ['lead'], p: 1 },                   // 4
  { tag: 'h2', cls: [], p: 2 },                        // 5
  { tag: 'ul', cls: [], p: 2 },                        // 6
  { tag: 'span', cls: ['logo'], p: 3 },                // 7
  null,                                                // 8
  { tag: 'em', cls: [], p: 4 },                        // 9
  { tag: 'a', cls: [], p: 4 },                         // 10
  null, null,                                          // 11, 12
  { tag: 'li', cls: ['item'], p: 6 },                  // 13
  { tag: 'li', cls: ['item', 'sale'], p: 6 }           // 14
];
var DOM_HTML = '<main id="app">\n  <header>\n    <h1 class="title"><span class="logo">Hi</span></h1>\n    <p class="lead"><em>Welcome</em> <a href="/x">link</a></p>\n  </header>\n  <section class="card">\n    <h2>Menu</h2>\n    <ul>\n      <li class="item">Tea</li>\n      <li class="item sale">Chai</li>\n    </ul>\n  </section>\n</main>';
function domLabel(i) { var n = DOM[i]; return n ? n.tag + (n.id ? '#' + n.id : '') + n.cls.map(function (c) { return '.' + c; }).join('') : null; }
function domArr() { return DOM.map(function (n, i) { return n ? domLabel(i) : null; }); }
function parseSel(g) {
  var toks = g.trim().replace(/\s*([>+~])\s*/g, ' $1 ').split(/\s+/), comps = [], combs = [], pend = null;
  var bad = 'Use tags, .classes, #ids and the combinators (space)  >  +  ~   for example:  section li';
  toks.forEach(function (t) {
    if (/^[>+~]$/.test(t)) { if (!comps.length || pend) throw new Error(bad); pend = t; return; }
    var m = /^([a-zA-Z][\w-]*|\*)?((?:[.#][\w-]+)*)$/.exec(t);
    if (!m || (!m[1] && !m[2])) throw new Error(bad);
    var c = { tag: m[1] && m[1] !== '*' ? m[1].toLowerCase() : null, id: null, cls: [], raw: t };
    (m[2].match(/[.#][\w-]+/g) || []).forEach(function (x) { if (x[0] === '#') c.id = x.slice(1); else c.cls.push(x.slice(1)); });
    if (comps.length) combs.push(pend || ' ');
    pend = null; comps.push(c);
  });
  if (pend || !comps.length) throw new Error(bad);
  return { comps: comps, combs: combs };
}
function compMatch(n, c) { return (!c.tag || n.tag === c.tag) && (!c.id || n.id === c.id) && c.cls.every(function (x) { return n.cls.indexOf(x) >= 0; }); }
function prevSibs(i) { var r = []; for (var j = 0; j < i; j++) if (DOM[j] && DOM[j].p === DOM[i].p) r.push(j); return r; }
function matchAt(i, S, k) {
  if (!compMatch(DOM[i], S.comps[k])) return false;
  if (k === 0) return true;
  var cb = S.combs[k - 1], j;
  if (cb === '>') return DOM[i].p >= 0 && matchAt(DOM[i].p, S, k - 1);
  if (cb === ' ') { for (j = DOM[i].p; j >= 0; j = DOM[j].p) if (matchAt(j, S, k - 1)) return true; return false; }
  var ps = prevSibs(i);
  if (cb === '+') return ps.length > 0 && matchAt(ps[ps.length - 1], S, k - 1);
  return ps.some(function (q) { return matchAt(q, S, k - 1); });
}

/* ---- colour helpers ---- */
function parseHex(h) {
  var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h).trim());
  if (!m) throw new Error('Colours must look like #3366cc or #36c');
  var x = m[1].length === 3 ? m[1].replace(/./g, function (c) { return c + c; }) : m[1];
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
}
function lin(c) { c = c / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lumin(rgb) { return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]); }
function contrast(a, b) { var l1 = lumin(a), l2 = lumin(b); var hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); }
function rgb2hsl(rgb) {
  var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2;
  if (mx !== mn) {
    var d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}
function hex2(n) { var s = n.toString(16); return s.length < 2 ? '0' + s : s; }
function num(x, name) { var v = Number(x); if (!isFinite(v) || v < 0) throw new Error(name + ' must be a non-negative number'); return v; }
function r2(x) { return Math.round(x * 100) / 100; }

/* =====================================================================
   TOPIC 1 - SELECTORS
   ===================================================================== */
topics.push({
  title: 'Selectors: How CSS Points at Elements',
  analogy: `<p>Imagine a huge classroom and a teacher who wants to hand out instructions. She can say <b>"everyone"</b>, <b>"all the girls in the second row"</b>, <b>"the student named Asha"</b>, or <b>"anyone sitting right next to a window"</b>. A <b>CSS selector</b> is exactly that sentence: a short description that tells the browser <i>which elements</i> should receive a style. The style block (<code>{ color: red; }</code>) is the instruction; the selector is who gets it.</p>`,
  explain: `<p>A CSS rule has two halves: a <b>selector</b> (who?) and a <b>declaration block</b> (what to do?). <code>p { color: navy; }</code> means "every paragraph gets navy text".</p>
    <p><b>The basic selectors</b> you must know cold:</p>
    ${H.table(['Kind', 'Looks like', 'Matches', 'Think of it as'], [
      ['Type', '<code>p</code>, <code>li</code>', 'every element with that tag', 'a job title ("all nurses")'],
      ['Class', '<code>.card</code>', 'any element whose class attribute contains <code>card</code>', 'a team jersey - many people, same colour'],
      ['ID', '<code>#header</code>', 'the one element with that id', 'a passport number - unique'],
      ['Universal', '<code>*</code>', 'everything', 'a loudspeaker announcement'],
      ['Attribute', '<code>a[href^="https"]</code>', 'elements whose attribute fits a test', 'a badge check ("has a green sticker?")'],
      ['Pseudo-class', '<code>a:hover</code>, <code>li:first-child</code>', 'elements in a certain <i>state</i> or <i>position</i>', 'a mood ("while being hovered")'],
      ['Pseudo-element', '<code>p::first-line</code>, <code>::before</code>', 'a <i>part</i> of an element, or generated content', 'a slice of the cake, not the whole cake']
    ])}
    <p><b>Combinators</b> glue selectors together by relationship in the family tree:</p>
    ${H.table(['Combinator', 'Example', 'Reads as'], [
      ['space (descendant)', '<code>nav a</code>', 'any <code>a</code> anywhere inside <code>nav</code> (child, grandchild, ...)'],
      ['<code>&gt;</code> (child)', '<code>ul &gt; li</code>', 'an <code>li</code> that is a <b>direct</b> child of <code>ul</code>'],
      ['<code>+</code> (adjacent sibling)', '<code>h1 + p</code>', 'the <code>p</code> that comes <b>immediately after</b> an <code>h1</code>'],
      ['<code>~</code> (general sibling)', '<code>h1 ~ p</code>', 'every later <code>p</code> sharing the same parent as <code>h1</code>'],
      ['<code>,</code> (group)', '<code>h1, h2, h3</code>', 'a shortcut: the same rule for several selectors']
    ])}
    <p><b>Golden reading rule:</b> read a selector <b>from right to left</b>. In <code>nav ul li a</code> the thing being styled is the <b>last</b> part (<code>a</code>); everything to the left is a filter on where that <code>a</code> lives. Also, no spaces inside a compound: <code>p.note</code> means "a p that is also .note" while <code>p .note</code> means "a .note somewhere inside a p". One space changes the meaning!</p>`,
  clues: [
    '"style <b>only</b> the links inside the navigation" - a descendant selector like <code>nav a</code>',
    '"the paragraph right after a heading" - the adjacent sibling <code>+</code>',
    '"every other row", "the last item", "first letter" - pseudo-classes and pseudo-elements',
    '"style links that point to PDFs / external sites" - attribute selectors <code>[href$=".pdf"]</code>',
    '"the same style for h1, h2 and h3" - comma-grouped selectors',
    'An interview answer starting "it depends on which element the selector <i>ends</i> with" - right-to-left matching'
  ],
  code: [
    {
      lang: 'css', title: 'Selector cheat sheet', code: `/* type */            p { margin: 0; }
/* class */           .card { padding: 12px; }
/* id */              #logo { width: 80px; }
/* compound */        p.note { color: teal; }          /* p AND .note, no space */
/* descendant */      nav a { text-decoration: none; }  /* a anywhere inside nav */
/* child */           ul > li { list-style: square; }   /* direct children only */
/* adjacent sibling */h1 + p { font-size: 1.2rem; }     /* the p right after an h1 */
/* general sibling */ h1 ~ p { color: gray; }           /* every later p sibling */
/* attribute */       a[href^="https"] { color: green; }/* starts with https */
                      a[href$=".pdf"]::after { content: " (PDF)"; }
/* pseudo-class */    li:nth-child(odd) { background: #f4f4f4; }
                      button:hover, button:focus-visible { outline: 2px solid; }
/* pseudo-element */  p::first-line { font-weight: bold; }
/* group */           h1, h2, h3 { font-family: Georgia, serif; }`
    },
    {
      lang: 'js', run: true, title: 'A tiny selector-vs-element matcher (runnable)', code: R`
// Does a compound selector like "p.note#intro" match an element?
// element = { tag, id, classes: [...] }
function matchesCompound(selector, el) {
  // split "p.note#intro" into its pieces: the tag name first, then each .class / #id
  const tag = (selector.match(/^[a-zA-Z][\w-]*|^\*/) || [null])[0];
  const parts = selector.match(/[.#][\w-]+/g) || [];

  if (tag && tag !== '*' && tag.toLowerCase() !== el.tag) return false; // wrong tag
  for (const p of parts) {
    const name = p.slice(1);
    if (p[0] === '#' && el.id !== name) return false;           // wrong id
    if (p[0] === '.' && !el.classes.includes(name)) return false; // missing class
  }
  return true; // every piece passed
}

const para = { tag: 'p', id: 'intro', classes: ['note', 'big'] };
console.log('p            ->', matchesCompound('p', para));            // true
console.log('.note        ->', matchesCompound('.note', para));        // true
console.log('p.note#intro ->', matchesCompound('p.note#intro', para)); // true
console.log('div.note     ->', matchesCompound('div.note', para));     // false (tag differs)
console.log('.note.small  ->', matchesCompound('.note.small', para));  // false (no .small)
console.log('*            ->', matchesCompound('*', para));            // true
`
    }
  ],
  codeTitle: ['Selector cheat sheet (CSS)', 'Compound selector matcher'],
  viz: {
    title: 'Selector matcher: which elements get picked?',
    input: 'section li',
    inputLabel: 'Selector (tags, .class, #id, space > + ~ , allowed)',
    gen: function (input) {
      var groups = String(input || '').split(',').map(function (g) { return g.trim(); }).filter(Boolean);
      if (!groups.length) throw new Error('Type a selector, for example: section li');
      var parsed = groups.map(parseSel);
      var order = [];
      DOM.forEach(function (n, i) { if (n) order.push(i); });
      var frames = [], hl = {}, matched = [];
      frames.push({
        narr: 'Here is a small page. Your selector is <code>' + esc(groups.join(', ')) + '</code>. The browser tests <b>every element</b> in document order and asks: "does this one fit?"',
        parts: [
          { type: 'code', label: 'The HTML', lang: 'html', code: DOM_HTML },
          { type: 'tree', label: 'Same page as a family tree', arr: domArr(), hl: {} }
        ]
      });
      order.forEach(function (i) {
        var why = '', hit = false;
        parsed.forEach(function (S, gi) {
          if (hit) return;
          var last = S.comps.length - 1;
          if (matchAt(i, S, last)) { hit = true; why = 'It fits <code>' + esc(groups[gi]) + '</code>.'; return; }
          if (!compMatch(DOM[i], S.comps[last])) { if (!why) why = 'Its own tag/class/id does not fit the <b>right-most</b> part <code>' + esc(S.comps[last].raw) + '</code>.'; }
          else if (!why || why.indexOf('right-most') > 0) why = 'The right-most part <code>' + esc(S.comps[last].raw) + '</code> fits, but nothing in its family satisfies the part(s) on the left of it.';
        });
        var cur = {};
        Object.keys(hl).forEach(function (k) { cur[k] = hl[k]; });
        cur[i] = 'cur';
        frames.push({
          narr: 'Testing <b>&lt;' + esc(domLabel(i)) + '&gt;</b> - ' + (hit ? '<span class="c-g">MATCH.</span> ' : '<span class="c-r">no match.</span> ') + why,
          parts: [
            { type: 'tree', label: 'Amber = being tested, green = already matched', arr: domArr(), hl: cur },
            { type: 'vars', label: 'Progress', vals: { tested: frames.length, 'matches so far': matched.length + (hit ? 1 : 0) }, hl: hit ? { 'matches so far': 'ok' } : {} }
          ]
        });
        if (hit) { hl[i] = 'ok'; matched.push(domLabel(i)); } else hl[i] = 'done';
      });
      frames.push({
        narr: 'Done. <b>' + matched.length + '</b> element(s) match <code>' + esc(groups.join(', ')) + '</code>' + (matched.length ? ': ' + matched.map(function (m) { return '<code>' + esc(m) + '</code>'; }).join(', ') : ' (nothing at all - a selector that matches nothing is not an error, the rule is simply ignored)') + '.',
        parts: [{ type: 'tree', label: 'Final result', arr: domArr(), hl: hl }, { type: 'set', label: 'Matched elements', items: matched.length ? matched : ['(none)'] }]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'One space changes everything: p.note vs p .note',
      html: `<p>Two selectors that differ by a single space:</p>
        ${H.table(['Selector', 'Meaning', 'Matches in <code>&lt;p class="note"&gt;Hi&lt;/p&gt;</code>?'], [
          ['<code>p.note</code>', 'a <code>p</code> that <b>also has</b> class note', H.c('g', 'yes')],
          ['<code>p .note</code>', 'something with class note <b>inside</b> a p', H.c('r', 'no - the p itself is the note, nothing is inside it')]
        ])}
        <p>Rule of thumb: <b>no space = same element, space = family relationship</b>.</p>`,
      code: { lang: 'css', code: `p.note  { color: teal; }   /* the element itself */\np .note { color: red;  }   /* a descendant of a p */` }
    },
    {
      title: 'Child (&gt;) versus descendant (space)',
      html: `<p>Given the list <code>&lt;ul&gt;&lt;li&gt;A&lt;ul&gt;&lt;li&gt;B&lt;/li&gt;&lt;/ul&gt;&lt;/li&gt;&lt;/ul&gt;</code>:</p>
        <ul><li><code>ul li</code> hits <b>both</b> A and B (B is a grandchild of the outer ul, a child of the inner ul).</li>
        <li><code>ul &gt; li</code> also hits both here, because each li <i>is</i> a direct child of <i>some</i> ul.</li>
        <li><code>body &gt; ul &gt; li</code> hits <b>only A</b>, because only A's parent chain is body, ul, li.</li></ul>
        <p>Use <code>&gt;</code> when you want to avoid accidentally styling things in deeper levels (menus inside menus).</p>`,
      code: { lang: 'css', code: `/* top-level menu items only */\nnav > ul > li { display: inline-block; }\n/* submenu items inherit nothing from the rule above */` }
    },
    {
      title: 'Sibling combinators: + versus ~',
      html: `<p>Siblings are elements with the <b>same parent</b>. Given <code>h2, p, p, h2, p</code> in one section:</p>
        ${H.arr(['h2', 'p1', 'p2', 'h2', 'p3'], { label: 'children', hl: { 1: 'g', 4: 'g' } })}
        <p><code>h2 + p</code> picks <b>p1</b> and <b>p3</b> (each p directly after an h2). <code>h2 ~ p</code> picks <b>p1, p2, p3</b> (any p after any h2). Great for "drop-cap on the first paragraph after each heading".</p>`,
      code: { lang: 'css', code: `h2 + p::first-letter { font-size: 2em; float: left; }` }
    },
    {
      title: 'Attribute selectors in real life',
      html: `<p>Attribute selectors let you style by data you already have, with no extra classes:</p>
        ${H.table(['Selector', 'Picks'], [
          ['<code>[disabled]</code>', 'any element that has the attribute at all'],
          ['<code>input[type="email"]</code>', 'attribute equals exactly'],
          ['<code>a[href^="https"]</code>', 'value <b>starts</b> with'],
          ['<code>a[href$=".pdf"]</code>', 'value <b>ends</b> with'],
          ['<code>a[href*="shop"]</code>', 'value <b>contains</b>'],
          ['<code>[class~="card"]</code>', 'one word in a space-separated list']
        ])}`,
      code: { lang: 'css', code: `a[target="_blank"]::after { content: " ↗"; }\ninput:required { border-left: 3px solid orange; }` }
    }
  ],
  deepDive: `<p><b>Right-to-left matching.</b> Browsers evaluate a selector starting from its <i>right-most</i> part against each element, and only then walk up the tree for the left-hand parts. That is why <code>.card a</code> is cheap: the engine finds every <code>a</code> and checks "is an ancestor a .card?" - it does not scan the whole page for .card first. In 2026 selector matching is almost never your bottleneck; style recalculation cost is driven by how <i>many</i> elements a change invalidates, not by selector length. Do not obsess over micro-optimising selectors; do keep them short for readability.</p>
    <p><b>Modern selectors you should know.</b> <code>:is(h1, h2, h3)</code> shortens lists (specificity = its strongest argument). <code>:where()</code> does the same with <b>zero</b> specificity, perfect for resets. <code>:not()</code> excludes. <code>:has()</code> is the long-awaited "parent selector": <code>.card:has(img)</code> styles a card <i>because</i> it contains an image (supported in all evergreen browsers since late 2023). <code>:focus-visible</code> shows focus rings for keyboard users only. <code>:nth-child(2n+1 of .item)</code> counts only matching siblings.</p>
    <p><b>Pseudo-class vs pseudo-element.</b> One colon (<code>:hover</code>) = a state of an existing element. Two colons (<code>::before</code>, <code>::selection</code>, <code>::placeholder</code>) = a separate generated or partial box. Legacy one-colon <code>:before</code> still works for the four old ones but always write two.</p>
    <p><b>Shared grammar.</b> The same syntax powers <code>document.querySelector('ul &gt; li.active')</code>, <code>element.closest(...)</code> and <code>element.matches(...)</code>. Learning selectors once pays off in JS, testing libraries (Testing Library, Playwright locators) and scraping.</p>
    <p><b>Gotchas.</b> IDs cannot be reused (invalid HTML, and <code>getElementById</code> returns only the first). Class names are case-sensitive in standards mode. Invalid selector in a comma list used to invalidate the whole rule; <code>:is()</code> and <code>:where()</code> are <i>forgiving</i> and ignore only the bad part. And CSS Nesting (<code>.card { &amp; a { ... } }</code>) now ships everywhere, letting you write selectors in a tree shape like Sass.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants are very good at <i>writing</i> selectors from a plain request ("style the second link in each nav item"), and at converting between CSS, Tailwind utility classes and CSS Modules.</p>
    <p><b>Use AI as a partner:</b> paste your HTML and ask <code>Which elements does the selector ".menu li > a:not(.btn)" match? Explain step by step</code>, then check its answer against DevTools (type the selector into the Elements panel search box or run <code>document.querySelectorAll(...)</code> in the console). Ask for "five trick selectors that look similar but match different things" as self-quizzes.</p>
    <p><b>Where AI goes wrong:</b> it likes over-qualified, brittle selectors (<code>div.container &gt; div.row &gt; div.col &gt; p</code>) that break when markup changes; it sometimes invents pseudo-classes; and it often adds IDs for styling, which causes specificity wars later (next topics).</p>
    <p><b>What you must still own:</b> choosing the <i>smallest</i> selector that survives markup changes, reading right-to-left, and knowing instantly what a space, <code>&gt;</code> or <code>+</code> means in review.</p>`,
  problems: [{
    title: 'Does This Element Match? (compound selector)',
    level: 'Easy', tags: ['css', 'selectors', 'string parsing'], companies: ['Meta', 'Atlassian'],
    lang: 'js',
    statement: `<p>An element is described as <code>{ tag, id, classes }</code>. A <b>compound selector</b> is a string like <code>p.note#intro</code>: an optional tag name (or <code>*</code>) followed by any number of <code>.class</code> and <code>#id</code> pieces with <b>no spaces</b>. Write <code>matches(selector, el)</code> returning <code>true</code> only if <b>every</b> piece is satisfied.</p>`,
    constraints: `Selector length ≤ 100. No combinators, no commas, no attributes. Tag comparison is case-insensitive; class and id are case-sensitive.`,
    example: `<p>Element: <code>{tag:'li', id:'', classes:['item','sale']}</code></p>
      ${H.table(['Selector', 'Result', 'Why'], [
        ['<code>li.item</code>', H.c('g', 'true'), 'tag li and has class item'],
        ['<code>.item.sale</code>', H.c('g', 'true'), 'both classes present'],
        ['<code>li#x</code>', H.c('r', 'false'), 'id is empty, not x'],
        ['<code>*.sale</code>', H.c('g', 'true'), '* allows any tag, class sale present']
      ])}`,
    brute: {
      why: `<p>A beginner often tests with <code>selector.includes(el.tag)</code> or splits only on the dot. That says <code>"ul"</code> matches an element whose tag is <code>"u"</code>, and it ignores ids. The wasted idea is treating the selector as plain text instead of <b>parsing it into pieces</b> and checking each piece against the right field.</p>`,
      code: { lang: 'js', run: true, code: R`
// Naive: treats the selector as a substring search
function matchesNaive(selector, el) {
  return selector.includes(el.tag) || el.classes.some(c => selector.includes(c));
}
console.log(matchesNaive('ul', { tag: 'u', id: '', classes: [] })); // true - wrong!
` }
    },
    mcq: { q: 'Which pieces must ALL be true for <code>p.note#intro</code> to match?', options: ['Tag is p, or class note, or id intro (any one)', 'Tag is p AND has class note AND id is intro', 'Only the id, because ids are the strongest'], answer: 1, explain: 'A compound selector is an AND: every simple selector glued together must hold for the same element.' },
    hints: [
      `<p>Hint 1: a compound selector is just a <b>list of small tests</b> joined by AND. Find the tag part, then every <code>.x</code> or <code>#y</code>.</p>`,
      `<p>Hint 2: two regexes do the job: one for the leading tag (<code>^[a-zA-Z][\\w-]*</code> or <code>*</code>) and <code>/[.#][\\w-]+/g</code> for the rest. Check each piece against <code>el.tag</code>, <code>el.id</code>, <code>el.classes</code>.</p>`,
      `<p>Hint 3: edge cases - selector with no tag (<code>.a</code>), universal <code>*</code>, a missing class returns false immediately, an id piece compared with <code>===</code>. Recipe: parse tag, fail fast on mismatch, loop pieces, fail fast, else return true.</p>`
    ],
    solution: {
      approach: `<p>Parse once, then fail fast. The leading tag (if any, and not <code>*</code>) must equal the element tag. Then every <code>.class</code> must be in <code>el.classes</code> and every <code>#id</code> must equal <code>el.id</code>. If nothing failed, it is a match.</p>`,
      code: { lang: 'js', run: true, code: R`
function matches(selector, el) {
  // leading type selector (or *), if present
  const tagMatch = selector.match(/^([a-zA-Z][\w-]*|\*)/);
  if (tagMatch && tagMatch[1] !== '*' && tagMatch[1].toLowerCase() !== el.tag.toLowerCase()) return false;

  // every .class or #id piece must hold
  const pieces = selector.match(/[.#][\w-]+/g) || [];
  for (const piece of pieces) {
    const name = piece.slice(1);
    if (piece[0] === '#') { if (el.id !== name) return false; }
    else if (!el.classes.includes(name)) return false;
  }
  return true;
}

const li = { tag: 'li', id: '', classes: ['item', 'sale'] };
console.log(matches('li.item', li));   // true
console.log(matches('.item.sale', li)); // true
console.log(matches('li#x', li));       // false
console.log(matches('*.sale', li));     // true
console.log(matches('LI', li));         // true (tag names are case-insensitive)
` },
      complexity: `<p>Time O(L + k) where L is the selector length and k the number of classes on the element (use a Set to make class checks O(1)). Space O(L).</p>`,
      followUps: ['Add attribute selectors like <code>[data-x="1"]</code>.', 'Support a comma group <code>h1, h2</code> by splitting and OR-ing.', 'Add the descendant combinator by walking <code>el.parent</code> upwards (right-to-left matching).']
    }
  }]
});

/* =====================================================================
   TOPIC 2 - SPECIFICITY
   ===================================================================== */
topics.push({
  title: 'Specificity: Scoring Selectors (a, b, c)',
  analogy: `<p>Think of a sports tournament ranked by medals. <b>Gold medals</b> count first. Only if two teams have the same number of golds do you look at <b>silver</b>, and only then at <b>bronze</b>. You never "trade" 100 bronzes for one gold. CSS specificity works exactly like this: an <b>ID</b> is gold, a <b>class / attribute / pseudo-class</b> is silver, a <b>tag / pseudo-element</b> is bronze. When two rules fight over the same property of the same element, the selector with the better medal table wins.</p>`,
  explain: `<p>When two rules both match an element and set the same property (say <code>color</code>), the browser must pick one. If neither is <code>!important</code> and they come from the same place, it compares <b>specificity</b>: three counters written <b>(a, b, c)</b>.</p>
    ${H.table(['Counter', 'Counts', 'Examples', 'Medal'], [
      ['<b>a</b>', 'ID selectors', '<code>#nav</code>', 'gold'],
      ['<b>b</b>', 'classes, attribute selectors, pseudo-classes', '<code>.card</code>, <code>[type="text"]</code>, <code>:hover</code>, <code>:nth-child()</code>', 'silver'],
      ['<b>c</b>', 'type selectors and pseudo-elements', '<code>p</code>, <code>li</code>, <code>::before</code>', 'bronze']
    ])}
    <p>Compare <b>left to right</b>: higher <b>a</b> wins; if a ties, higher <b>b</b> wins; if both tie, higher <b>c</b>. They are <b>not</b> added into one number. So <code>(1,0,0)</code> beats <code>(0,20,0)</code>.</p>
    ${H.table(['Selector', '(a, b, c)', 'How it is counted'], [
      ['<code>p</code>', '(0, 0, 1)', 'one type'],
      ['<code>.note</code>', '(0, 1, 0)', 'one class'],
      ['<code>p.note</code>', '(0, 1, 1)', 'one class + one type'],
      ['<code>#intro p</code>', '(1, 0, 1)', 'one id + one type'],
      ['<code>nav ul li a:hover</code>', '(0, 1, 4)', 'four types + one pseudo-class'],
      ['<code>a[href]::after</code>', '(0, 1, 2)', 'attribute (b) + type a and pseudo-element (c)'],
      ['<code>*</code>, <code>&gt;</code>, <code>+</code>, <code>~</code>, space', '(0, 0, 0)', 'universal selector and combinators count nothing']
    ])}
    <p><b>Bigger weapons:</b> an inline <code>style="..."</code> attribute beats any selector. <code>!important</code> beats inline (unless the inline one is also important). <b>Tie?</b> The rule that appears <b>later</b> in the stylesheet wins.</p>
    <p><b>Special cases:</b> <code>:not(X)</code>, <code>:is(X)</code> and <code>:has(X)</code> add the specificity of their <i>most specific argument</i> (the pseudo-class itself adds nothing). <code>:where(X)</code> always adds <b>zero</b>.</p>`,
  clues: [
    '"my style is not applying even though the selector looks right" - a more specific rule is winning',
    '"why does this ID rule override my class?" - gold beats any number of silvers',
    '"two rules, same specificity, which wins?" - the later one in source order',
    '"how do I override a third-party library style without !important?" - match or beat its specificity, or use <code>:where()</code> / cascade layers',
    '"rank these selectors" or "what is the specificity of <code>#a .b:hover p</code>?" - count (a,b,c): (1,2,1)',
    'A senior-flavoured prompt: "avoid specificity wars in a large codebase" - flat single-class naming (BEM), layers, no IDs for styling'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Specificity calculator (runnable)', code: R`
// Count (a, b, c) for a selector. Handles ids, classes, attributes,
// pseudo-classes, pseudo-elements, types, and :not/:is/:has/:where.
function specificity(selector) {
  let s = selector.replace(/"[^"]*"|'[^']*'/g, '""'); // hide quoted strings
  let a = 0, b = 0, c = 0;

  // 1) functional pseudo-classes: the argument counts, the wrapper does not
  const fn = /:(is|not|has|where)\(([^()]*)\)/;
  let m;
  while ((m = fn.exec(s))) {
    if (m[1] !== 'where') {
      // most specific argument in the comma list wins
      let best = [0, 0, 0];
      for (const part of m[2].split(',')) {
        const t = specificity(part);
        if (t[0] > best[0] || (t[0] === best[0] && (t[1] > best[1] || (t[1] === best[1] && t[2] > best[2])))) best = t;
      }
      a += best[0]; b += best[1]; c += best[2];
    }
    s = s.replace(fn, ' ');
  }

  // 2) attribute selectors -> b
  s = s.replace(/\[[^\]]*\]/g, () => { b++; return ''; });
  // 3) pseudo-elements (::x and the legacy :before/:after/...) -> c
  s = s.replace(/::[\w-]+|:(before|after|first-line|first-letter)\b/g, () => { c++; return ''; });
  // 4) ids -> a
  s = s.replace(/#[\w-]+/g, () => { a++; return ''; });
  // 5) classes -> b
  s = s.replace(/\.[\w-]+/g, () => { b++; return ''; });
  // 6) remaining pseudo-classes -> b
  s = s.replace(/:[\w-]+(\([^)]*\))?/g, () => { b++; return ''; });
  // 7) what is left are type selectors, * and combinators
  for (const tok of s.split(/[\s>+~]+/)) if (/^[a-zA-Z]/.test(tok)) c++;

  return [a, b, c];
}

// Compare two (a,b,c) triples left to right
const cmp = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];

const tests = ['p', '.note', 'p.note', '#intro p', 'nav ul li a:hover', 'a[href]::after',
  'li:not(.done, #x)', ':where(#a, .b) p', '*', 'ul > li + li'];
for (const t of tests) console.log(t.padEnd(22), '(' + specificity(t).join(', ') + ')');

// Who wins between these three?
const rivals = ['#intro', '.a.b.c.d.e.f.g.h.i.j.k', 'div p'];
rivals.sort((x, y) => cmp(specificity(y), specificity(x)));
console.log('strongest first:', rivals.join('  >  '));
`
    },
    {
      lang: 'css', title: 'Specificity battle (which colour wins?)', code: `<!-- HTML:  <p id="intro" class="note">Hello</p> -->
p        { color: black; }   /* (0,0,1) */
.note    { color: blue;  }   /* (0,1,0) */
p.note   { color: green; }   /* (0,1,1) */
#intro   { color: red;   }   /* (1,0,0)  <- wins: the ID has the most gold */
p.note.note.note { color: purple; } /* (0,3,1) still loses to the single id */`
    }
  ],
  codeTitle: ['Specificity calculator', 'Which colour wins?'],
  viz: {
    title: 'Specificity scoreboard: (a, b, c) per selector',
    input: 'p | .note | p.note | #intro | #intro p | nav ul li a:hover',
    inputLabel: 'Selectors separated by |  (up to 8)',
    gen: function (input) {
      var sels = String(input || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
      if (sels.length < 2) throw new Error('Give at least two selectors separated by |   e.g.  p | .note');
      if (sels.length > 8) throw new Error('Use at most 8 selectors');
      var frames = [], rows = [], details = [];
      frames.push({
        narr: 'We will score each selector with three counters: <b>a</b> = IDs, <b>b</b> = classes + attributes + pseudo-classes, <b>c</b> = types + pseudo-elements. Compared left to right, like medals.',
        parts: [{ type: 'table', label: 'Scoreboard', columns: ['Selector', 'a (ids)', 'b (classes)', 'c (types)', 'Score'], rows: [] }]
      });
      sels.forEach(function (s, idx) {
        var d = specDetail(s);
        details.push(d);
        var found = [];
        if (d.ids.length) found.push('IDs: ' + d.ids.map(function (x) { return '<code>' + esc(x) + '</code>'; }).join(' '));
        if (d.bs.length) found.push('classes/attrs/pseudo-classes: ' + d.bs.map(function (x) { return '<code>' + esc(x) + '</code>'; }).join(' '));
        if (d.cs.length) found.push('types/pseudo-elements: ' + d.cs.map(function (x) { return '<code>' + esc(x) + '</code>'; }).join(' '));
        d.notes.forEach(function (n) { found.push(n); });
        rows.push(['<code>' + esc(s) + '</code>', d.t[0], d.t[1], d.t[2], '(' + d.t.join(', ') + ')']);
        var hl = {}; hl[idx] = 'cur';
        var vals = { a: d.t[0], b: d.t[1], c: d.t[2] };
        frames.push({
          narr: 'Scoring <code>' + esc(s) + '</code>. Found - ' + (found.length ? found.join('; ') : 'nothing that counts') + '. Score = <b>(' + d.t.join(', ') + ')</b>.',
          parts: [
            { type: 'table', label: 'Scoreboard', columns: ['Selector', 'a (ids)', 'b (classes)', 'c (types)', 'Score'], rows: rows.map(function (r) { return r.slice(); }), hl: hl },
            { type: 'vars', label: 'Counters for this selector', vals: vals, hl: { a: d.t[0] ? 'ok' : '', b: d.t[1] ? 'ok' : '', c: d.t[2] ? 'ok' : '' } }
          ]
        });
      });
      var win = 0;
      details.forEach(function (d, i) { if (cmpArr(d.t, details[win].t) >= 0) win = i; });
      var tie = details.filter(function (d) { return cmpArr(d.t, details[win].t) === 0; }).length > 1;
      var hl2 = {};
      details.forEach(function (d, i) { hl2[i] = i === win ? 'win' : 'done'; });
      frames.push({
        narr: 'Compare left to right: highest <b>a</b> first, then <b>b</b>, then <b>c</b>. The strongest selector is <code>' + esc(sels[win]) + '</code> with <b>(' + details[win].t.join(', ') + ')</b>.' + (tie ? ' Two or more tie for first place - then the one written <b>later</b> in the stylesheet wins, so we pick the last of them.' : ''),
        parts: [
          { type: 'table', label: 'Winner highlighted in blue', columns: ['Selector', 'a (ids)', 'b (classes)', 'c (types)', 'Score'], rows: rows, hl: hl2 }
        ]
      });
      var order = details.map(function (d, i) { return i; }).sort(function (x, y) { return cmpArr(details[y].t, details[x].t) || y - x; });
      frames.push({
        narr: 'Ranking from strongest to weakest. Remember: this only matters when the rules target the <b>same property of the same element</b>. Rules that set different properties never fight.',
        parts: [{ type: 'queue', label: 'Strongest to weakest', frontLabel: 'strongest', backLabel: 'weakest', items: order.map(function (i) { return sels[i] + '  (' + details[i].t.join(',') + ')'; }), hl: { 0: 'sel' } }]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'Walk through #nav .item:hover a::after step by step',
      html: `<p>Take <code>#nav .item:hover a::after</code> and sort every piece into its medal:</p>
        ${H.table(['Piece', 'Kind', 'Counter'], [
          ['<code>#nav</code>', 'ID', 'a = 1'],
          ['<code>.item</code>', 'class', 'b = 1'],
          ['<code>:hover</code>', 'pseudo-class', 'b = 2'],
          ['<code>a</code>', 'type', 'c = 1'],
          ['<code>::after</code>', 'pseudo-element', 'c = 2']
        ])}
        <p>Answer: <b>(1, 2, 2)</b>. The space combinators added nothing.</p>`
    },
    {
      title: 'Why 11 classes still lose to one ID',
      html: `<p>Compare <code>.a.b.c.d.e.f.g.h.i.j.k</code> with <code>#x</code>:</p>
        ${H.table(['Selector', '(a, b, c)'], [['<code>.a.b...k</code> (11 classes)', '(0, 11, 0)'], ['<code>#x</code>', '(1, 0, 0)']])}
        <p>The first number is compared first: 1 &gt; 0, done. Specificity is like comparing words alphabetically, not like adding numbers. (Very old browsers once let 256 classes "overflow" into the id column - a famous bug; modern browsers never do.)</p>`
    },
    {
      title: 'The tie-break: source order',
      html: `<p>Two rules with the same specificity:</p>
        <pre>.btn { background: gray; }   /* (0,1,0) - written first */
.btn { background: teal; }   /* (0,1,0) - written later  -> teal wins */</pre>
        <p>That is also why you load a library's CSS <b>before</b> your own: with equal specificity, your later rule wins automatically, and you never need <code>!important</code>.</p>`
    },
    {
      title: 'Taming specificity with :where() and :is()',
      html: `<p>Compare two ways to write the same list style:</p>
        ${H.table(['Selector', 'Specificity', 'Easy to override later?'], [
          ['<code>:is(.card, .panel) a</code>', '(0,1,1)', 'Needs a class or more'],
          ['<code>:where(.card, .panel) a</code>', '(0,0,1)', H.c('g', 'Yes - any class beats it')],
          ['<code>#sidebar a</code>', '(1,0,1)', H.c('r', 'Painful - needs another id')]
        ])}
        <p>Libraries and CSS resets use <code>:where()</code> on purpose, so your styles never lose to them.</p>`,
      code: { lang: 'css', code: `:where(.card, .panel) a { color: royalblue; }   /* (0,0,1) easy to beat */\n.link-danger { color: crimson; }                  /* (0,1,0) wins without a fight */` }
    }
  ],
  deepDive: `<p><b>Why the system exists.</b> CSS was designed so that a general rule (<code>p</code>) can be refined by a more specific one (<code>.note</code>) <i>regardless of the order in the file</i>. Specificity gives authors a predictable way to say "this exception beats the default" without caring about file order. The cost: if you rely on IDs and long chains, every later override must be even more specific - the <b>specificity arms race</b> that ends in <code>!important</code> everywhere.</p>
    <p><b>Exact rules (CSS Selectors Level 4).</b> The three-column comparison is a tuple comparison. Inline styles and <code>!important</code> are decided <i>before</i> specificity in the cascade, not by adding another column to (a,b,c). <code>:nth-child(An+B of S)</code> adds one pseudo-class plus the specificity of its <code>S</code> list. <code>:is()</code>, <code>:not()</code>, <code>:has()</code> use the argument with the highest specificity <i>even if that argument does not match the element</i>. Pseudo-element selectors count as c. The universal selector, combinators and <code>:where()</code> are zero. Nesting with <code>&amp;</code> behaves as if wrapped in <code>:is()</code>.</p>
    <p><b>Where specificity breaks down.</b> <code>@layer</code> (cascade layers) is compared <i>before</i> specificity, so an unlayered or later-layer rule with specificity (0,0,1) can beat a layered rule with (1,0,0). Shadow DOM scopes styles so outer selectors do not even reach inside. CSS Modules and CSS-in-JS generate unique class names to keep every rule at roughly (0,1,0) - a deliberate "flat specificity" strategy.</p>
    <p><b>Strategy for real codebases.</b> (1) Style with single classes, never IDs. (2) Name with a convention like BEM (<code>.card__title--big</code>) so everything is (0,1,0). (3) Keep selectors short; avoid chains deeper than 2-3. (4) Put third-party CSS in an early layer. (5) Use DevTools: the Styles pane shows beaten declarations with a strike-through and hover tooltips tell you why.</p>`,
  aiEra: `<p><b>What AI changes:</b> code generators happily add <code>!important</code> or an ID when "the style doesn't apply". That "fixes" the screenshot and plants a landmine for the next developer. Debugging <i>why</i> a rule loses is still a human skill, because AI cannot see your computed cascade without being shown it.</p>
    <p><b>Use AI as a partner:</b> paste the conflicting rules and ask <code>Compute the (a,b,c) of each selector and tell me which wins and why - do not suggest !important</code>. Then verify in DevTools. Also ask it to refactor a deep selector chain into flat BEM classes and to explain what the specificity was before and after.</p>
    <p><b>Where AI goes wrong:</b> it miscounts when <code>:is()</code>, <code>:where()</code> or <code>:not()</code> appear, forgets that pseudo-elements count as c, or reports specificity as a single number ("this is 101") which is only a rough mental shortcut.</p>
    <p><b>What you must still own:</b> being able to compute (a,b,c) by hand in an interview, picking an architecture (layers, BEM, modules) that avoids specificity fights, and refusing "just add !important" as a fix.</p>`,
  problems: [{
    title: 'Rank Selectors by Specificity',
    level: 'Easy', tags: ['css', 'specificity', 'parsing', 'sorting'], companies: ['Google', 'Atlassian', 'Shopify'],
    lang: 'js',
    statement: `<p>Write <code>strongest(selectors)</code> that takes an array of <b>simple</b> selectors (ids, classes, attributes like <code>[x]</code>, pseudo-classes like <code>:hover</code>, pseudo-elements like <code>::after</code>, types, combinators; <b>no</b> <code>:not/:is/:where</code>) and returns the selector that would <b>win</b> a conflict. If two selectors tie, the one that appears <b>later</b> in the array wins (later in the stylesheet).</p>`,
    constraints: `1 ≤ selectors.length ≤ 100, each selector ≤ 100 characters.`,
    example: `${H.table(['Input', 'Scores', 'Output'], [
      ['<code>["p", ".note", "p.note"]</code>', '(0,0,1) (0,1,0) (0,1,1)', '<code>"p.note"</code>'],
      ['<code>["#a", ".x.y.z", "div p"]</code>', '(1,0,0) (0,3,0) (0,0,2)', '<code>"#a"</code> - one ID beats three classes'],
      ['<code>[".a", ".b"]</code>', '(0,1,0) (0,1,0)', '<code>".b"</code> - tie, later wins']
    ])}`,
    brute: {
      why: `<p>The tempting shortcut: turn the triple into one number like <code>a*100 + b*10 + c</code>. It looks fine until a selector has 11 classes (<code>0*100+11*10 = 110</code> beats an ID's <code>100</code>) - the wrong answer. Specificity is a <b>lexicographic comparison</b> of three counters, not a sum.</p>`,
      code: { lang: 'js', run: true, code: R`
// WRONG idea: collapse (a,b,c) into one number
const score = ([a, b, c]) => a * 100 + b * 10 + c;
console.log(score([1, 0, 0]));   // 100 for "#x"
console.log(score([0, 11, 0]));  // 110 for eleven classes -> wrongly "stronger" than the id
` }
    },
    mcq: { q: 'Which is stronger: <code>#x</code> or a selector with 15 classes?', options: ['15 classes - there are more of them', '#x - the id column is compared first', 'They tie because both are "specific"'], answer: 1, explain: 'Specificity is compared column by column starting with ids, so (1,0,0) beats (0,15,0).' },
    hints: [
      `<p>Hint 1: each selector becomes three counters (ids, classes-like things, types-like things). Compare them <b>left to right</b>, never add them together.</p>`,
      `<p>Hint 2: use a few regex replacements in a good order: attributes first, then pseudo-elements, then ids, classes, remaining pseudo-classes; whatever words are left (split on spaces and <code>&gt; + ~</code>) are type selectors.</p>`,
      `<p>Hint 3: remember <code>::after</code> must be removed <b>before</b> counting <code>:hover</code>-style pseudo-classes, otherwise it counts twice. Walk the array once keeping the best so far and use <code>&gt;=</code> so a later tie replaces an earlier one.</p>`
    ],
    solution: {
      approach: `<p>Convert each selector to <code>[a, b, c]</code> by stripping tokens in a fixed order (so nothing is counted twice), then scan once keeping the best. Using <code>&gt;= 0</code> on the comparison means ties move to the later selector, matching "later in the stylesheet wins".</p>`,
      code: { lang: 'js', run: true, code: R`
function score(sel) {
  let s = sel, a = 0, b = 0, c = 0;
  s = s.replace(/\[[^\]]*\]/g, () => { b++; return ''; });                 // [attr]
  s = s.replace(/::[\w-]+|:(before|after|first-line|first-letter)\b/g, () => { c++; return ''; }); // pseudo-elements
  s = s.replace(/#[\w-]+/g, () => { a++; return ''; });                    // #id
  s = s.replace(/\.[\w-]+/g, () => { b++; return ''; });                   // .class
  s = s.replace(/:[\w-]+(\([^)]*\))?/g, () => { b++; return ''; });        // :pseudo-class
  for (const t of s.split(/[\s>+~]+/)) if (/^[a-zA-Z]/.test(t)) c++;      // types
  return [a, b, c];
}
const cmp = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];

function strongest(selectors) {
  let best = selectors[0], bestScore = score(best);
  for (let i = 1; i < selectors.length; i++) {
    const sc = score(selectors[i]);
    if (cmp(sc, bestScore) >= 0) { best = selectors[i]; bestScore = sc; } // >= : later tie wins
  }
  return best;
}

console.log(strongest(['p', '.note', 'p.note']));          // p.note
console.log(strongest(['#a', '.x.y.z', 'div p']));         // #a
console.log(strongest(['.a', '.b']));                      // .b  (tie -> later)
console.log(strongest(['ul li a:hover', 'a::after']));     // ul li a:hover
` },
      complexity: `<p>Time O(total characters) - each selector is scanned a constant number of times. Space O(1) extra.</p>`,
      followUps: ['Support <code>:is()</code>, <code>:not()</code> and <code>:where()</code>.', 'Return the whole ranking, not just the winner.', 'Add an inline-style marker that beats every selector.']
    }
  }]
});

/* =====================================================================
   TOPIC 3 - THE CASCADE
   ===================================================================== */
topics.push({
  title: 'The Cascade: Who Wins When Rules Collide',
  analogy: `<p>Picture a school with many people giving you instructions about your homework: the <b>government curriculum</b> (browser defaults), your <b>parents</b> (the user's own settings) and your <b>teacher</b> (the website author). Normally the teacher wins. But a note marked <b>"URGENT"</b> (<code>!important</code>) jumps the queue. If two notes come from the same person with the same urgency, the more <b>specific</b> one ("page 5, question 2") beats the vague one ("do your homework"). If they are equally specific, the <b>most recent</b> note wins. That sequence of tie-breakers is the <b>cascade</b> - the "C" in CSS.</p>`,
  explain: `<p>Many rules can match one element and set the <i>same</i> property. The browser runs one fixed algorithm per property to choose <b>exactly one</b> winning declaration. In order:</p>
    ${H.table(['Step', 'Question the browser asks', 'Winner'], [
      ['<b>1. Origin and importance</b>', 'Where does the declaration come from and is it <code>!important</code>?', 'Normal: browser &lt; user &lt; author. For <code>!important</code> the order <b>flips</b>: author-important &lt; user-important &lt; browser-important'],
      ['<b>2. Inline style</b>', 'Is it written in the element\'s <code>style="..."</code> attribute?', 'inline beats every selector-based declaration of the same importance'],
      ['<b>3. Layers</b> (<code>@layer</code>)', 'Is it in a cascade layer?', 'Normal rules: later layer wins, unlayered beats layers. <code>!important</code>: reversed'],
      ['<b>4. Specificity</b>', 'Whose selector scores higher (a,b,c)?', 'higher specificity'],
      ['<b>5. Source order</b>', 'Still tied?', 'the declaration that appears <b>last</b>']
    ])}
    <p>Most day-to-day bugs live in steps <b>1, 4 and 5</b>. Memory trick: <b>I</b>mportance, <b>S</b>pecificity, <b>O</b>rder - "I Sort Order" (inline style counts as the strongest specificity when no layers are involved, which is how the visualizer and calculator below treat it).</p>
    <p><b>Important detail:</b> the contest is <i>per property</i>. Rule A can win the <code>color</code> fight while rule B wins <code>font-size</code> on the same element. The final look is a <b>merge</b> of all the winners - that is why it is called a cascade (styles flow down from many sources).</p>
    ${H.table(['Rule', 'Selector', 'color', 'font-size'], [
      ['1', '<code>p</code>', 'black', '16px'],
      ['2', '<code>.note</code>', '<span class="c-g">blue (wins color)</span>', '-'],
      ['3', '<code>p.note</code>', '-', '<span class="c-g">18px (wins size)</span>']
    ])}
    <p>Declarations that do not conflict simply all apply. Only <b>conflicts</b> need the algorithm.</p>`,
  clues: [
    '"which style wins?" / "why is my rule ignored?" - walk through importance, specificity, order',
    '"what does the C in CSS stand for?" - Cascading: the algorithm that resolves conflicting declarations',
    '"override a user agent default" - author normal rules beat browser defaults regardless of specificity',
    '"!important on both sides" - fall back to specificity and then order among the important ones',
    '"third-party widget CSS keeps winning" - cascade layers or matching specificity, not <code>!important</code>',
    '"order of link pseudo-classes" - LVHA: <code>:link</code>, <code>:visited</code>, <code>:hover</code>, <code>:active</code> (same specificity, so order matters)'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Cascade resolver for ONE property (runnable)', code: R`
// A declaration: { sel, value, important, inline }. Its position in the array is "source order".
function specificity(sel) { // tiny version: ids, classes, types
  const a = (sel.match(/#[\w-]+/g) || []).length;
  const b = (sel.match(/\.[\w-]+|\[[^\]]*\]|:[\w-]+/g) || []).length;
  const c = (sel.replace(/#[\w-]+|\.[\w-]+|\[[^\]]*\]|:[\w-]+/g, ' ').split(/[\s>+~]+/).filter(t => /^[a-zA-Z]/.test(t))).length;
  return [a, b, c];
}

function resolve(decls) {
  // Step 1: importance - if any declaration is !important, only those stay in the race
  let race = decls.map((d, order) => ({ ...d, order }));
  if (race.some(d => d.important)) race = race.filter(d => d.important);

  // Step 2: specificity - inline style counts as [1, 0, 0, 0], everything else [0, a, b, c]
  const key = d => (d.inline ? [1, 0, 0, 0] : [0, ...specificity(d.sel)]);
  const better = (x, y) => { // is key x stronger than key y?
    for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] > y[i];
    return false;
  };
  let top = key(race[0]);
  for (const d of race) if (better(key(d), top)) top = key(d);
  race = race.filter(d => !better(top, key(d)));

  // Step 3: source order - the last survivor wins
  return race[race.length - 1];
}

const rules = [
  { sel: 'p',      value: 'black'  },
  { sel: '.note',  value: 'blue'   },
  { sel: '#intro', value: 'green'  },
  { sel: 'p.note', value: 'orange', important: true },
  { sel: '',       value: 'red',   inline: true }
];
const w = resolve(rules);
console.log('winner:', w.value, '- from', w.inline ? 'inline style' : w.sel);   // orange, !important beats inline

rules[3].important = false;
const w2 = resolve(rules);
console.log('without !important:', w2.value);   // red, inline style wins
`
    },
    {
      lang: 'css', title: 'Cascade in action', code: `/* HTML: <p id="intro" class="note">Hi</p> */
p       { color: black;  font-size: 16px; }
.note   { color: blue; }
#intro  { color: green; }
p.note  { color: orange !important; }   /* important: removes everyone non-important from the race */
/* style="color: red" inline would LOSE to the line above */

/* font-size: only one rule sets it, so no contest: 16px */`
    }
  ],
  codeTitle: ['Cascade resolver', 'Cascade in action (CSS)'],
  viz: {
    title: 'Cascade resolution: eliminate until one is left',
    input: 'p=black; .note=blue; #intro=green; p.note=orange!; style=red',
    inputLabel: 'Rules as selector=value (add ! for !important, "style" = inline), separated by ;',
    gen: function (input) {
      var items = String(input || '').split(';').map(function (x) { return x.trim(); }).filter(Boolean);
      if (items.length < 2 || items.length > 8) throw new Error('Give 2 to 8 rules separated by ;   e.g.  p=black; .note=blue');
      var cands = items.map(function (it, i) {
        var m = /^(.+?)=\s*([^!]+?)\s*(!?)$/.exec(it);
        if (!m) throw new Error('Write each rule as selector=value, add ! for !important, use the word style for an inline style. Example: p=black; .note=blue!; style=red');
        var inline = m[1].trim().toLowerCase() === 'style';
        var d = inline ? { t: [0, 0, 0] } : specDetail(m[1].trim());
        return { sel: inline ? 'style=""' : m[1].trim(), val: m[2], imp: m[3] === '!', inline: inline, t: d.t, key: [inline ? 1 : 0].concat(d.t) };
      });
      function lab(c, withScore) {
        return c.sel + ' : ' + c.val + (c.imp ? ' !important' : '') + (withScore ? '   [' + (c.inline ? 'inline' : '(' + c.t.join(',') + ')') + ']' : '');
      }
      var frames = [];
      frames.push({
        narr: 'All these rules match <code>&lt;p id="intro" class="note"&gt;</code> and all set <code>color</code>. They are listed in <b>source order</b> (first written at the front). Only one can win. We run the cascade steps.',
        parts: [
          { type: 'queue', label: 'Competing declarations', frontLabel: 'written first', backLabel: 'written last', items: cands.map(function (c) { return lab(c, false); }) },
          { type: 'vars', label: 'Step', vals: { step: 'collected', rules: cands.length } }
        ]
      });
      // step 1: importance
      var anyImp = cands.some(function (c) { return c.imp; });
      var s1 = anyImp ? cands.filter(function (c) { return c.imp; }) : cands.slice();
      var hl1 = {};
      cands.forEach(function (c, i) { hl1[i] = s1.indexOf(c) >= 0 ? 'ok' : 'bad'; });
      frames.push({
        narr: anyImp ? '<b>Step 1 - importance.</b> At least one rule is <code>!important</code>, so every normal rule is thrown out (red). Only the important ones stay (' + s1.length + ').' : '<b>Step 1 - importance.</b> Nobody used <code>!important</code>, so nothing is eliminated here.',
        parts: [
          { type: 'queue', label: 'Checked (red = eliminated)', items: cands.map(function (c) { return lab(c, false); }), hl: hl1 },
          { type: 'queue', label: 'Still in the race', items: s1.map(function (c) { return lab(c, false); }) }
        ]
      });
      // step 2: specificity
      var top = s1.reduce(function (acc, c) { return cmpArr(c.key, acc) > 0 ? c.key : acc; }, s1[0].key);
      var s2 = s1.filter(function (c) { return cmpArr(c.key, top) === 0; });
      var hl2 = {};
      s1.forEach(function (c, i) { hl2[i] = s2.indexOf(c) >= 0 ? 'ok' : 'bad'; });
      frames.push({
        narr: '<b>Step 2 - specificity.</b> Scores are shown in brackets (inline style beats every selector). Highest is <b>' + (top[0] ? 'inline' : '(' + top.slice(1).join(',') + ')') + '</b>. Weaker rules are eliminated; ' + s2.length + ' remain.',
        parts: [
          { type: 'queue', label: 'Specificity check (red = loses)', items: s1.map(function (c) { return lab(c, true); }), hl: hl2 },
          { type: 'queue', label: 'Still in the race', items: s2.map(function (c) { return lab(c, true); }) }
        ]
      });
      // step 3: order
      var win = s2[s2.length - 1];
      var hl3 = {};
      s2.forEach(function (c, i) { hl3[i] = c === win ? 'sel' : 'bad'; });
      frames.push({
        narr: '<b>Step 3 - source order.</b> ' + (s2.length > 1 ? 'Several rules tie exactly, so the one written <b>last</b> wins.' : 'Only one rule is left, so order does not even matter.'),
        parts: [{ type: 'queue', label: 'Tie-break by position (purple = winner)', frontLabel: 'earlier', backLabel: 'later', items: s2.map(function (c) { return lab(c, true); }), hl: hl3 }]
      });
      frames.push({
        narr: 'Winner: <code>' + esc(win.sel) + '</code> sets <code>color: ' + esc(win.val) + '</code>. The paragraph is drawn in <b>' + esc(win.val) + '</b>. Other properties (like font-size) run their own, separate contest.',
        parts: [{ type: 'vars', label: 'Computed result', vals: { 'color': win.val, 'won by': win.imp ? 'importance' : (s1.length > 1 && s2.length === 1 ? 'specificity' : (s2.length > 1 ? 'source order' : 'only candidate')) }, hl: { color: 'sel' } }]
      });
      return frames;
    }
  },
  examples: [
    {
      title: '!important only beats others that are not important',
      html: `<p>Three rules fight over <code>color</code> on <code>&lt;p id="a" class="b"&gt;</code>:</p>
        ${H.table(['Rule', 'Value', 'Specificity', 'Fate'], [
          ['<code>p { color: red !important }</code>', 'red', '(0,0,1) important', H.c('g', 'WINS - the only important one')],
          ['<code>#a { color: blue }</code>', 'blue', '(1,0,0)', H.c('r', 'out at step 1')],
          ['<code>p { color: black }</code> as inline <code>style</code>', 'black', 'inline', H.c('r', 'out at step 1')]
        ])}
        <p>Even a humble <code>p</code> selector wins because importance is checked <b>before</b> specificity. This is exactly why <code>!important</code> is dangerous: it skips the fair fight.</p>`
    },
    {
      title: 'Different properties merge instead of competing',
      html: `<p>The element ends up with <b>both</b> declarations because they do not conflict:</p>
        <pre>.card { padding: 16px; color: #222; }
.card.featured { color: #b00; border: 2px solid gold; }</pre>
        ${H.table(['Property', 'Winner', 'Why'], [
          ['padding', '16px', 'only .card sets it'],
          ['color', '#b00', '.card.featured (0,2,0) beats .card (0,1,0)'],
          ['border', '2px solid gold', 'only .card.featured sets it']
        ])}
        <p>Result: padding from rule 1, border from rule 2, color from rule 2.</p>`
    },
    {
      title: 'Source order: link states and the LVHA rule',
      html: `<p>The four link selectors all have the same specificity (0,1,1). So <b>order decides</b>. If <code>a:hover</code> comes <i>before</i> <code>a:link</code>, hovering an unvisited link shows the <code>:link</code> style - the hover rule is overridden!</p>
        <pre>a:link    { color: blue; }
a:visited { color: purple; }
a:hover   { color: red; }     /* after link and visited */
a:active  { color: orange; }  /* last, so pressing wins over hover */</pre>
        <p>Mnemonic: <b>L</b>o<b>V</b>e <b>HA</b>te - Link, Visited, Hover, Active.</p>`
    },
    {
      title: 'A later shorthand can erase an earlier longhand',
      html: `<p>Shorthands reset every sub-property they cover:</p>
        <pre>.box { margin-left: 40px; }
.box { margin: 10px; }     /* later, same specificity -> margin-left is now 10px */</pre>
        <p>Rule of thumb: write shorthands first, longhands after, so refinements are not wiped out. DevTools shows the struck-through <code>margin-left: 40px</code> with the later rule above it.</p>`
    },
    {
      title: 'Cascade layers: order beats specificity',
      html: `<p>Layers sit <b>above</b> specificity in the algorithm:</p>
        <pre>@layer reset, base, components;
@layer reset      { #logo { margin: 0; } }          /* (1,0,0) but early layer */
@layer components { .logo { margin: 8px; } }         /* (0,1,0) but later layer -> WINS */</pre>
        <p>Layers let you decide the winner by architecture ("components always beat base") instead of fighting with selectors. Unlayered styles beat all layered ones (for normal declarations).</p>`
    }
  ],
  deepDive: `<p><b>Origins in detail.</b> There are three origins: <b>user-agent</b> (browser default sheet - why <code>h1</code> is big and bold, why links are blue), <b>user</b> (accessibility settings, forced colors, a custom stylesheet) and <b>author</b> (your site). For normal declarations author &gt; user &gt; browser. For <code>!important</code> declarations the order is reversed, so a user's important rule can override the author's - this protects people who need huge fonts or high contrast. Animations and transitions slot in as their own origins: a running CSS animation overrides normal author rules, but an <code>!important</code> author declaration beats the animation, and a transition beats even important ones for the instant it runs.</p>
    <p><b>Layers in detail.</b> <code>@layer a, b, c;</code> declares order up front. Within normal declarations: unlayered &gt; c &gt; b &gt; a. For <code>!important</code> declarations it flips: a &gt; b &gt; c &gt; unlayered (the first layer gets the strongest "last word"). Specificity only breaks ties <i>inside</i> the same layer. Layers can nest and be imported: <code>@import url(lib.css) layer(vendor);</code>. Keywords <code>revert</code> (roll back to the previous origin) and <code>revert-layer</code> (roll back to the previous layer) give surgical resets.</p>
    <p><b>Scoping.</b> <code>@scope (.card) to (.slot) { ... }</code> adds a "proximity" tie-break between specificity and order: when two scoped rules tie, the one whose scope root is closer to the element wins. Shadow DOM has its own cascade context: outer selectors do not reach in, and the "inner context wins for normal, outer wins for important" rule applies.</p>
    <p><b>Performance and tooling.</b> The cascade runs during <i>style recalculation</i>. DevTools' <b>Styles</b> pane lists matching rules in winning order; <b>Computed</b> shows the final value and a "show all" trace of which rule supplied it. Use the <b>Cascade layers</b> view in Chrome/Edge/Firefox to see layer order. Treat strike-through as the browser telling you who lost.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants generate large Tailwind or CSS blobs fast, but they pile up conflicting declarations on the same element (<code>p-4 p-6</code>, or two rules setting <code>display</code>), and they reach for <code>!important</code> when the cascade fights back. Debugging a cascade is still a "look at the evidence" job.</p>
    <p><b>Use AI as a partner:</b> copy the <b>Styles</b> pane text for the element (or the computed styles) into a prompt: <code>Here are the matching rules. Explain which declaration wins for color and why, using origin, importance, layers, specificity, order. Suggest a fix without !important.</code> Ask it to propose an <code>@layer</code> structure for your project.</p>
    <p><b>Where AI goes wrong:</b> it forgets that !important flips the origin order, mixes up "later in the file" with "later in the DOM", or claims inline always wins (not over !important). It may also confidently describe a layer order that contradicts your actual <code>@layer</code> statement.</p>
    <p><b>What you must still own:</b> the mental model - importance, layers, specificity, order - and the ability to verify it in DevTools in under a minute. AI output that adds <code>!important</code> should fail code review.</p>`,
  problems: [{
    title: 'Resolve the Cascade for One Property',
    level: 'Medium', tags: ['css', 'cascade', 'simulation'], companies: ['Google', 'Microsoft', 'Stripe'],
    lang: 'js',
    statement: `<p>Several declarations of the <b>same property</b> match one element. Each is <code>{ value, important, inline, spec }</code> where <code>spec = [a, b, c]</code> (ignored if <code>inline</code> is true). The array order is the source order (index 0 written first). Return the <b>value</b> of the winning declaration using the real cascade: importance first, then inline vs selector specificity, then source order (last wins).</p>`,
    constraints: `1 ≤ n ≤ 1000, 0 ≤ a, b, c ≤ 1000. Ignore origins and layers (everything is author CSS).`,
    example: `${H.table(['Declarations (in order)', 'Winner', 'Why'], [
      ['<code>[{v:"red",spec:[0,0,1]}, {v:"blue",spec:[0,1,0]}]</code>', '<code>"blue"</code>', 'class beats type'],
      ['<code>[{v:"red",spec:[1,0,0]}, {v:"blue",spec:[1,0,0]}]</code>', '<code>"blue"</code>', 'tie, later wins'],
      ['<code>[{v:"red",inline:true}, {v:"blue",spec:[0,0,1],important:true}]</code>', '<code>"blue"</code>', '!important beats inline']
    ])}`,
    brute: {
      why: `<p>A first attempt sorts by "last in the list wins" and ignores everything else (pure source-order thinking), or adds up specificity and !important into one score. Both break: the last declaration is only the answer when everything else ties, and one big number cannot represent "importance, then inline, then a, b, c" safely.</p>`,
      code: { lang: 'js', run: true, code: R`
// WRONG: always returns the last declaration
function resolveWrong(decls) { return decls[decls.length - 1].value; }
console.log(resolveWrong([{ value: 'red', spec: [1, 0, 0] }, { value: 'blue', spec: [0, 0, 1] }])); // blue, but the id rule should win -> red
` }
    },
    mcq: { q: 'An inline style sets <code>color: red</code>. A stylesheet rule <code>p { color: blue !important }</code> also matches. What colour?', options: ['red - inline always wins', 'blue - important is decided before specificity or inline', 'Whichever is later in the file'], answer: 1, explain: 'Step 1 (importance) comes first. Only the important declaration remains, so blue wins even over inline.' },
    hints: [
      `<p>Hint 1: the cascade is a series of <b>filters</b>. Each step removes losers; at the end one declaration stays.</p>`,
      `<p>Hint 2: step 1 keep only important ones if any exist. Step 2 build a key <code>[inlineFlag, a, b, c]</code> and keep those with the maximum key. Step 3 pick the last remaining index.</p>`,
      `<p>Hint 3: edge cases - a single declaration, all tie (last wins), important inline vs important id (inline wins). Recipe: attach the original index, filter by importance, compute best key by lexicographic comparison, filter equal-to-best, return the last one's value.</p>`
    ],
    solution: {
      approach: `<p>Attach each declaration's original position. Filter to important ones if any exist. Build a 4-number key (<code>inline ? 1 : 0, a, b, c</code>) and keep only declarations whose key equals the maximum (compared lexicographically). Finally return the value of the last survivor, which implements "later wins".</p>`,
      code: { lang: 'js', run: true, code: R`
function resolve(decls) {
  // remember source order
  let race = decls.map((d, order) => ({ ...d, order }));

  // step 1: importance
  if (race.some(d => d.important)) race = race.filter(d => d.important);

  // step 2: specificity as a 4-part key [inline, a, b, c]
  const key = d => (d.inline ? [1, 0, 0, 0] : [0, ...(d.spec || [0, 0, 0])]);
  const cmp = (x, y) => { for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
  let top = key(race[0]);
  for (const d of race) if (cmp(key(d), top) > 0) top = key(d);
  race = race.filter(d => cmp(key(d), top) === 0);

  // step 3: source order - last survivor wins
  return race[race.length - 1].value;
}

console.log(resolve([{ value: 'red', spec: [0, 0, 1] }, { value: 'blue', spec: [0, 1, 0] }]));   // blue
console.log(resolve([{ value: 'red', spec: [1, 0, 0] }, { value: 'blue', spec: [1, 0, 0] }]));   // blue (tie)
console.log(resolve([{ value: 'red', inline: true }, { value: 'blue', spec: [0, 0, 1], important: true }])); // blue
console.log(resolve([{ value: 'red', inline: true }, { value: 'blue', spec: [1, 0, 0] }]));       // red (inline beats id)
` },
      complexity: `<p>Time O(n) (three linear passes). Space O(n) for the filtered list.</p>`,
      followUps: ['Add origins: user-agent &lt; user &lt; author, with the reversed order for important.', 'Add <code>@layer</code> ranks before specificity.', 'Resolve a whole element: group declarations by property and return a style object.']
    }
  }]
});

/* =====================================================================
   TOPIC 4 - INHERITANCE
   ===================================================================== */
topics.push({
  title: 'Inheritance: Styles That Flow Down the Family Tree',
  analogy: `<p>Children inherit their family's <b>surname, language and accent</b> without anyone writing it on a form. But they do <b>not</b> inherit the parents' <b>house, car or bank balance</b> - each child starts with their own. CSS is the same: some properties (text colour, font, line height) are passed from parent to child automatically; others (border, margin, padding, background, width) belong to one element only. If you set <code>font-family</code> once on <code>body</code>, every paragraph, link and list item picks it up for free.</p>`,
  explain: `<p><b>Inheritance</b> means: if no rule sets a property on an element, and that property is an <i>inherited property</i>, the element uses its <b>parent's computed value</b>. If the property is <i>not</i> inherited, the element falls back to the property's <b>initial value</b> (the default from the spec, like <code>none</code> for border or <code>0</code> for margin).</p>
    ${H.table(['Usually inherited (text-ish)', 'Usually NOT inherited (box-ish)'], [
      ['<code>color</code>', '<code>border</code>, <code>outline</code>'],
      ['<code>font-family</code>, <code>font-size</code>, <code>font-weight</code>, <code>font-style</code>', '<code>margin</code>, <code>padding</code>'],
      ['<code>line-height</code>, <code>letter-spacing</code>, <code>text-align</code>, <code>text-transform</code>', '<code>background</code>, <code>width</code>, <code>height</code>'],
      ['<code>visibility</code>, <code>cursor</code>, <code>list-style</code>', '<code>display</code>, <code>position</code>, <code>overflow</code>']
    ])}
    <p><b>Why this split?</b> Text styling should be consistent across a whole page, so it flows down. Box styling would be a disaster if inherited: giving a <code>div</code> a 2px red border would also box every paragraph, link and word inside it.</p>
    <p><b>Four keywords</b> let you control it by hand:</p>
    ${H.table(['Keyword', 'Meaning'], [
      ['<code>inherit</code>', 'force: take the parent\'s computed value (even for non-inherited properties)'],
      ['<code>initial</code>', 'force: use the spec\'s default value'],
      ['<code>unset</code>', '= <code>inherit</code> if the property is naturally inherited, otherwise = <code>initial</code>'],
      ['<code>revert</code>', 'roll back to what the previous origin (usually the browser stylesheet) would give']
    ])}
    <p><b>Practical habit:</b> put your base typography on <code>body</code> or <code>:root</code> once, and let everything inherit. Override only where something should look different.</p>`,
  clues: [
    '"I set the font on body, why do my buttons still look different?" - form controls have browser styles that block inheritance; use <code>font: inherit</code>',
    '"why did the border not appear on the children?" - border is not an inherited property',
    '"a link inside my coloured div is still blue" - the browser stylesheet sets a rule on <code>a</code> directly, which beats inheritance',
    '"what is the difference between <code>inherit</code>, <code>initial</code> and <code>unset</code>?" - classic definition question',
    '"line-height: 1.5 vs 150% vs 24px" - what children get differs: a number is re-multiplied for each child',
    '"reset everything on a component" - <code>all: initial</code> / <code>all: unset</code>'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Computed value with inheritance (runnable)', code: R`
// Which properties are inherited by default, and what is their initial value?
const INHERITED = new Set(['color', 'font-family', 'font-size', 'line-height', 'text-align', 'visibility', 'cursor']);
const INITIAL = { color: 'black', 'font-family': 'serif', 'font-size': '16px', 'line-height': 'normal', 'text-align': 'start',
  visibility: 'visible', cursor: 'auto', border: 'none', margin: '0', padding: '0', background: 'transparent', width: 'auto' };

// chain = [rootStyles, ..., elementStyles]; each item holds the DECLARED styles of one element.
// computed(chain, prop) answers: what is the final value on the LAST element?
function computed(chain, prop, i = chain.length - 1) {
  if (i < 0) return INITIAL[prop];                       // above the root: nothing left to inherit
  const declared = chain[i][prop];
  const fromParent = () => computed(chain, prop, i - 1); // the parent's computed value
  if (declared === undefined) return INHERITED.has(prop) ? fromParent() : INITIAL[prop];
  if (declared === 'inherit') return fromParent();       // explicit: copy the parent
  if (declared === 'initial') return INITIAL[prop];      // explicit: spec default
  if (declared === 'unset')   return INHERITED.has(prop) ? fromParent() : INITIAL[prop];
  return declared;                                       // an ordinary declared value
}

const chain = [
  { 'font-family': 'Georgia', color: '#222' },            // body
  { color: 'crimson', border: '2px solid red' },           // div.card
  {}                                                       // p (declares nothing)
];
console.log('p color       :', computed(chain, 'color'));        // crimson - inherited from div.card
console.log('p font-family :', computed(chain, 'font-family'));  // Georgia - inherited from body
console.log('p border      :', computed(chain, 'border'));       // none    - border is NOT inherited
console.log('p width       :', computed(chain, 'width'));        // auto
chain[2].border = 'inherit';
console.log('p border (inherit keyword):', computed(chain, 'border')); // 2px solid red
`
    },
    {
      lang: 'css', title: 'Typography set once, inherited everywhere', code: `/* Set it once at the root of your page */
html { font-size: 100%; }
body {
  font-family: system-ui, sans-serif;   /* inherited by every descendant */
  line-height: 1.5;                     /* unitless: children recompute from their own size */
  color: #1f2937;                       /* inherited, so no need to repeat on p, li, span */
}

/* Form controls ignore inheritance by default (browser styles) - opt back in */
button, input, select, textarea { font: inherit; color: inherit; }

/* Links have their own browser colour; make them follow the surrounding text if you want */
a { color: inherit; }

/* A component that must ignore everything outside it */
.widget { all: initial; }`
    }
  ],
  codeTitle: ['Computed value with inheritance', 'Typography set once (CSS)'],
  viz: {
    title: 'Inheritance: does the property flow to the children?',
    input: 'color',
    inputLabel: 'CSS property (color, font-size, line-height, cursor, border, margin, padding, background, width, display)',
    gen: function (input) {
      var PROPS = {
        'color': [true, 'crimson', 'black (default)'],
        'font-size': [true, '20px', '16px (default)'],
        'font-family': [true, 'Georgia', 'serif (default)'],
        'line-height': [true, '1.6', 'normal (default)'],
        'cursor': [true, 'pointer', 'auto (default)'],
        'text-align': [true, 'center', 'start (default)'],
        'border': [false, '2px solid red', 'none'],
        'margin': [false, '20px', '0'],
        'padding': [false, '12px', '0'],
        'background': [false, 'gold', 'transparent'],
        'width': [false, '300px', 'auto'],
        'display': [false, 'flex', 'inline (initial)']
      };
      var p = String(input || '').trim().toLowerCase();
      if (!PROPS[p]) throw new Error('Pick one of: ' + Object.keys(PROPS).join(', '));
      var inh = PROPS[p][0], val = PROPS[p][1], dflt = PROPS[p][2];
      var arr = ['body', 'div.card', 'footer', 'h2', 'p', 'a', 'small'];
      var frames = [];
      frames.push({
        narr: 'A small page: <b>body</b> contains a <b>div.card</b> and a <b>footer</b>. Inside the card are an h2 and a p; inside the footer are an a and a small. We will write one rule: <code>div.card { ' + p + ': ' + esc(val) + ' }</code>. Is <code>' + p + '</code> an <b>inherited</b> property? ' + (inh ? '<span class="c-g">Yes</span>' : '<span class="c-r">No</span>') + '.',
        parts: [{ type: 'tree', label: 'DOM tree (no styles yet)', arr: arr, hl: { 0: 'cur' } }]
      });
      var tags = {}; tags[1] = val;
      frames.push({
        narr: 'The rule sets <code>' + p + ': ' + esc(val) + '</code> directly on <b>div.card</b>. This is a <b>declared</b> value, so the card definitely has it.',
        parts: [{ type: 'tree', label: 'Declared on div.card', arr: arr, hl: { 1: 'ok' }, tags: { 1: val } }]
      });
      var t2 = { 1: val }, h2 = { 1: 'ok' };
      t2[3] = inh ? val : dflt; t2[4] = inh ? val : dflt;
      h2[3] = inh ? 'ok' : 'bad'; h2[4] = inh ? 'ok' : 'bad';
      frames.push({
        narr: inh ? 'Children <b>h2</b> and <b>p</b> declare nothing for <code>' + p + '</code>. Because it is an inherited property they copy their parent\'s computed value: <b>' + esc(val) + '</b>.' : 'Children <b>h2</b> and <b>p</b> declare nothing for <code>' + p + '</code>. It is <b>not</b> inherited, so each falls back to the initial value: <b>' + esc(dflt) + '</b>. The parent\'s value does not flow down.',
        parts: [{ type: 'tree', label: inh ? 'Children inherit (green)' : 'Children use the initial value (red)', arr: arr, hl: h2, tags: t2 }]
      });
      var t3 = {}, h3 = {};
      Object.keys(t2).forEach(function (k) { t3[k] = t2[k]; h3[k] = h2[k]; });
      t3[0] = dflt; t3[2] = dflt; t3[5] = dflt; t3[6] = dflt;
      h3[0] = 'done'; h3[2] = 'done'; h3[5] = 'done'; h3[6] = 'done';
      frames.push({
        narr: 'The <b>footer</b> and its children are <b>not</b> inside div.card - they are in a different branch. Inheritance only goes <b>down</b> to descendants, never sideways. They keep ' + (inh ? 'the inherited default from body: ' : 'the initial value: ') + '<b>' + esc(dflt) + '</b>.',
        parts: [{ type: 'tree', label: 'Other branch is unaffected', arr: arr, hl: h3, tags: t3 }]
      });
      frames.push({
        narr: 'Summary for <code>' + p + '</code>: it is ' + (inh ? '<b>inherited</b> - set it high in the tree and everything below follows (great for typography)' : '<b>not inherited</b> - it styles only the element you target; children are unchanged (great for boxes, otherwise every child would get a border too)') + '. Force the other behaviour with <code>' + (inh ? 'initial' : 'inherit') + '</code>.',
        parts: [
          { type: 'table', label: 'Property facts', columns: ['Property', 'Inherited?', 'Declared on card', 'Value on p', 'Value on footer a'], rows: [[p, inh ? 'yes' : 'no', val, inh ? val : dflt, dflt]], hl: { 0: 'sel' } }
        ]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'Set the font once on body',
      html: `<p>Instead of repeating <code>font-family</code> on 40 selectors, write it once:</p>
        <pre>body { font-family: Georgia, serif; color: #222; }</pre>
        <p>Every <code>p</code>, <code>li</code>, <code>span</code>, <code>td</code> inherits both. You only write a new <code>font-family</code> where something should differ (for example code samples). Fewer rules = fewer specificity fights.</p>`
    },
    {
      title: 'Unitless line-height vs percent: what do children inherit?',
      html: `<p>Parent has <code>font-size: 20px</code>; child has <code>font-size: 10px</code>.</p>
        ${H.table(['Parent line-height', 'Parent computes to', 'Child (10px text) gets', 'Result'], [
          ['<code>1.5</code> (number)', '30px', 'the <b>number 1.5</b> again, so 15px', H.c('g', 'scales nicely')],
          ['<code>150%</code>', '30px', 'the <b>computed 30px</b>', H.c('r', 'tiny text on huge lines')],
          ['<code>1.5em</code>', '30px', 'the <b>computed 30px</b>', H.c('r', 'same problem')]
        ])}
        <p>Recommendation: always use a <b>unitless</b> <code>line-height</code> on body.</p>`,
      code: { lang: 'css', code: `body { line-height: 1.5; }   /* children multiply 1.5 by their own font-size */` }
    },
    {
      title: 'Why my link ignores the parent colour (and the fix)',
      html: `<p>The browser's built-in stylesheet has <code>a:-webkit-any-link { color: -webkit-link; }</code> - a rule that targets <code>a</code> <b>directly</b>. A directly-matched rule always beats an inherited value, because inheritance is the weakest source of all. So <code>div { color: red }</code> does not recolour links.</p>
        <p>Fix: <code>a { color: inherit; }</code> - now the link explicitly asks for its parent's computed colour.</p>`,
      code: { lang: 'css', code: `.footer { color: #ddd; }\n.footer a { color: inherit; text-decoration: underline; }` }
    },
    {
      title: 'Buttons and inputs do not inherit fonts by default',
      html: `<p>Browsers give <code>button</code>, <code>input</code>, <code>select</code> and <code>textarea</code> their own font settings, so your page font stops at the form. This surprises everybody once. The standard reset is:</p>
        <pre>button, input, select, textarea { font: inherit; color: inherit; }</pre>
        <p>The shorthand <code>font</code> includes size, family, weight, style and line-height, so one declaration re-joins the family.</p>`
    }
  ],
  deepDive: `<p><b>Inheritance is the weakest source of a value.</b> To compute a property, the browser asks, in order: is there a <i>cascaded</i> value (a declaration that won the cascade)? If yes, use it. If not and the property inherits, use the parent's <b>computed</b> value. Otherwise use the <b>initial</b> value. That is why any rule that directly matches the element - even the browser's default stylesheet - beats inheritance, regardless of specificity. A selector like <code>*</code> with specificity zero still beats inheritance, which is why <code>* { color: black }</code> is a dangerous reset: it blocks all inheritance of colour.</p>
    <p><b>Value stages.</b> CSS values go through <i>specified</i> &rarr; <i>computed</i> &rarr; <i>used</i> &rarr; <i>actual</i>. Children inherit the <b>computed</b> value. For <code>font-size: 2em</code>, computed means an absolute length (e.g. 32px). For percentage <code>width</code>, computed stays a percentage and is resolved to px only at layout (used value). That is why percent line-height inherits as a fixed length but unitless line-height inherits as a ratio.</p>
    <p><b>Custom properties inherit.</b> CSS variables (<code>--brand</code>) inherit by default, which is how theming works: set <code>--bg</code> on a section and every descendant sees it. You can opt a custom property out with <code>@property --x { inherits: false; ... }</code>, which also unlocks typed animation of variables.</p>
    <p><b>Shadow DOM and web components.</b> Inherited properties cross the shadow boundary (so a component picks up the page font and colour), but selectors do not. This is why design systems expose styling through CSS variables and <code>::part()</code>.</p>
    <p><b>Debugging.</b> In DevTools Styles pane, the section <i>"Inherited from body"</i> lists the inherited sources; the Computed pane shows the final value. If an expected inherited value is missing, search for a rule that targets the element directly.</p>`,
  aiEra: `<p><b>What AI changes:</b> component generators often write <i>explicit</i> font and colour on every element (<code>text-gray-700</code> on each paragraph), which defeats inheritance and makes theming a find-and-replace marathon.</p>
    <p><b>Use AI as a partner:</b> ask <code>Refactor this stylesheet so typography lives on body/:root and components only override what differs. List the properties you rely on inheriting.</code> Or <code>For this HTML and CSS, tell me the computed color and font-size of the .price span and trace where each came from.</code> Then confirm with the DevTools Computed pane.</p>
    <p><b>Where AI goes wrong:</b> it treats <code>border</code> or <code>background</code> as if they inherit; it forgets form controls; it says <code>unset</code> always means <code>initial</code> (it depends on the property).</p>
    <p><b>What you must still own:</b> knowing the inherited-vs-not table by instinct, designing a theme with CSS variables on the root, and spotting why a value is "stuck" (a direct rule beating the inherited one).</p>`,
  problems: [{
    title: 'Compute an Element\'s Inherited Value',
    level: 'Medium', tags: ['css', 'inheritance', 'simulation'], companies: ['Meta', 'Airbnb'],
    lang: 'js',
    statement: `<p>You get an element's ancestry as an array <code>chain</code> of <b>declared</b> style objects, from the root (index 0) down to the element (last). Write <code>computed(chain, prop)</code> returning the element's final value for <code>prop</code>.</p>
      <p>Rules: if the element declares the property, use it. Otherwise, if the property is <b>inherited</b> (<code>color</code>, <code>font-family</code>, <code>font-size</code>, <code>line-height</code>), use the nearest ancestor that declares it (or the initial value if none). Otherwise return the <b>initial value</b>. The keyword <code>inherit</code> means "take the parent's computed value" (even for non-inherited properties), and <code>initial</code> means the initial value.</p>`,
    constraints: `1 ≤ chain.length ≤ 100. Initial values given: color <code>black</code>, font-family <code>serif</code>, font-size <code>16px</code>, line-height <code>normal</code>, border <code>none</code>, margin <code>0</code>.`,
    example: `<p>chain = <code>[{color:'navy'}, {border:'1px solid'}, {}]</code> (body, div, p)</p>
      ${H.table(['Property', 'Result', 'Why'], [
        ['<code>color</code>', '<code>navy</code>', 'p and div declare nothing; color is inherited from body'],
        ['<code>border</code>', '<code>none</code>', 'p declares nothing and border does not inherit (the div\'s border stops at the div)']
      ])}`,
    brute: {
      why: `<p>The simple approach treats every property as inherited, simply returning the nearest declaration upward. That wrongly gives the <code>p</code> a border because a <code>div</code> above it has one. Border, margin, padding and background must not leak downward.</p>`,
      code: { lang: 'js', run: true, code: R`
// WRONG: treats every property as inherited
function computedWrong(chain, prop) {
  for (let i = chain.length - 1; i >= 0; i--) if (chain[i][prop] !== undefined) return chain[i][prop];
  return 'initial';
}
console.log(computedWrong([{ color: 'navy' }, { border: '1px solid' }, {}], 'border')); // 1px solid - wrong, should be none
` }
    },
    mcq: { q: 'A <code>div</code> has <code>padding: 20px</code>. Its child <code>p</code> declares no padding. What padding does the p have?', options: ['20px - children copy their parents', '0 - padding is not inherited, so the initial value applies', 'Depends on the parent\'s width'], answer: 1, explain: 'Padding is a box property and is not inherited. Without a rule on the p, its padding is the initial value, 0.' },
    hints: [
      `<p>Hint 1: split properties into two groups - inherited (look upward) and not inherited (look only at the element itself).</p>`,
      `<p>Hint 2: use a Set of inherited names and an object of initial values. Write a loop that starts at the element and climbs to the root until it finds a declaration.</p>`,
      `<p>Hint 3: handle keywords while climbing: <code>inherit</code> means "continue to the parent" (and from the root, use the initial value); <code>initial</code> returns the initial value immediately. For non-inherited properties only the first (the element) level may decide, unless it says <code>inherit</code>.</p>`
    ],
    solution: {
      approach: `<p>Define a recursive helper <code>at(i)</code> = the computed value of <code>prop</code> on <code>chain[i]</code>. Declared real value: return it. <code>initial</code>: initial. <code>inherit</code>, or nothing declared on an inherited property: return <code>at(i-1)</code> (or initial at the root). Nothing declared on a non-inherited property: initial.</p>`,
      code: { lang: 'js', run: true, code: R`
const INHERITED = new Set(['color', 'font-family', 'font-size', 'line-height']);
const INITIAL = { color: 'black', 'font-family': 'serif', 'font-size': '16px', 'line-height': 'normal', border: 'none', margin: '0' };

function computed(chain, prop) {
  // value of "prop" for the element at depth i
  function at(i) {
    if (i < 0) return INITIAL[prop];                    // above the root: nothing to inherit
    const d = chain[i][prop];
    if (d === 'initial') return INITIAL[prop];
    if (d === 'inherit') return at(i - 1);              // explicit request for the parent's value
    if (d !== undefined) return d;                      // a real declared value
    return INHERITED.has(prop) ? at(i - 1) : INITIAL[prop]; // inherited -> parent, else initial
  }
  return at(chain.length - 1);
}

const chain = [{ color: 'navy', 'font-size': '20px' }, { border: '1px solid' }, {}];
console.log(computed(chain, 'color'));        // navy
console.log(computed(chain, 'font-size'));    // 20px
console.log(computed(chain, 'border'));       // none
chain[2].border = 'inherit';
console.log(computed(chain, 'border'));       // 1px solid (explicit inherit)
chain[2].color = 'initial';
console.log(computed(chain, 'color'));        // black
` },
      complexity: `<p>Time O(depth) per query; space O(depth) for the recursion (or O(1) with a loop).</p>`,
      followUps: ['Implement <code>unset</code>.', 'Resolve em-based <code>font-size</code> as it inherits (links to the Units topic).', 'Cache computed values per node so a whole tree is O(n).']
    }
  }]
});

/* =====================================================================
   TOPIC 5 - THE BOX MODEL
   ===================================================================== */
topics.push({
  title: 'The Box Model: Content, Padding, Border, Margin',
  analogy: `<p>Think of a <b>framed photo hanging on a wall</b>. The <b>photo</b> is the content. The white <b>mat</b> around the photo is the padding. The wooden <b>frame</b> is the border. The empty <b>wall space</b> you leave before the next frame is the margin. Every single thing on a web page - a paragraph, a button, an image, even a link - is one of these framed photos. And the big question is: when you say "this frame is 300 wide", do you mean <b>just the photo</b> or <b>photo + mat + frame</b>? That is the difference between <code>content-box</code> and <code>border-box</code>.</p>`,
  explain: `<p>Every element generates a rectangular <b>box</b> with four layers, from the inside out:</p>
    ${H.table(['Layer', 'Property', 'Has background?', 'Purpose'], [
      ['1. Content', '<code>width</code>, <code>height</code>', 'yes (the background paints under it)', 'the text or image itself'],
      ['2. Padding', '<code>padding</code>', 'yes', 'breathing room <i>inside</i> the border'],
      ['3. Border', '<code>border</code>', 'it is its own colour', 'the visible edge'],
      ['4. Margin', '<code>margin</code>', '<b>no</b>, always transparent', 'space <i>outside</i>, pushes neighbours away']
    ])}
    <p><b>The width trap.</b> By default (<code>box-sizing: content-box</code>) the <code>width</code> property sets only the <b>content</b>. Padding and border are <i>added on top</i>:</p>
    ${H.table(['', 'content-box (default)', 'border-box'], [
      ['<code>width: 300px; padding: 20px; border: 5px solid</code>', 'rendered width = 300 + 2×20 + 2×5 = <b>350px</b>', 'rendered width = <b>300px</b> (content shrinks to 250)'],
      ['Meaning of width', 'width of the content only', 'width of content + padding + border'],
      ['Predictable layouts?', 'Surprising - padding makes boxes grow', 'Yes - the box stays the size you wrote']
    ])}
    <p>That is why almost every modern project starts with:</p>
    <pre>*, *::before, *::after { box-sizing: border-box; }</pre>
    <p><b>Total space on the page</b> (what neighbours see) = margin-left + border-left + padding-left + content + padding-right + border-right + margin-right. Margins are never part of an element's "width" even in border-box mode.</p>
    <p><b>Shorthands:</b> <code>padding: 10px</code> (all four), <code>padding: 10px 20px</code> (top/bottom, left/right), <code>padding: 1px 2px 3px</code> (top, left/right, bottom), <code>padding: 1px 2px 3px 4px</code> (clockwise from the top: <b>T</b>op, <b>R</b>ight, <b>B</b>ottom, <b>L</b>eft - "TRouBLe"). Same order for <code>margin</code>.</p>
    <p><b>Margin collapsing:</b> when two <i>vertical</i> margins of block elements touch, they do <b>not</b> add up - they overlap and the bigger one wins. A 30px bottom margin over a 20px top margin gives a gap of <b>30px</b>, not 50px. (Horizontal margins never collapse.)</p>`,
  clues: [
    '"the element is wider than the width I set" - content-box adds padding and border; use <code>border-box</code>',
    '"three columns of 33.33% overflow the row" - padding/border pushing them past 100%',
    '"what is the total space an element occupies?" - margin box = content + padding + border + margin',
    '"the gap between my two paragraphs is smaller than I expected" - margin collapsing',
    '"center a block horizontally" - <code>margin: 0 auto</code> with a width',
    '"why does the child margin push the parent down?" - parent/first-child margin collapsing (fix with padding, border, overflow, or flow-root)'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Box size calculator (runnable)', code: R`
// Given an element's CSS numbers, compute every width the browser will use.
function boxSizes({ width, padding = 0, border = 0, margin = 0, boxSizing = 'content-box' }) {
  // padding, border, margin are the same on left and right here (use numbers in px)
  const paddingBorder = 2 * padding + 2 * border;
  let content;
  if (boxSizing === 'border-box') content = Math.max(0, width - paddingBorder); // width includes padding + border
  else content = width;                                                          // width is only the content
  const borderBoxWidth = content + paddingBorder;   // what the background and border paint
  const marginBoxWidth = borderBoxWidth + 2 * margin; // the space it takes in the layout
  return { content, borderBoxWidth, marginBoxWidth };
}

const el = { width: 300, padding: 20, border: 5, margin: 10 };
console.log('content-box:', boxSizes({ ...el, boxSizing: 'content-box' })); // content 300, border-box 350, margin-box 370
console.log('border-box :', boxSizes({ ...el, boxSizing: 'border-box' }));  // content 250, border-box 300, margin-box 320

// How many 300px (+20 padding, +5 border) boxes fit in a 1000px row?
for (const bs of ['content-box', 'border-box']) {
  const w = boxSizes({ ...el, boxSizing: bs }).marginBoxWidth;
  console.log(bs, '-> each takes', w + 'px, fits', Math.floor(1000 / w), 'per row');
}
`
    },
    {
      lang: 'css', title: 'The modern reset and a centered card', code: `/* 1) make width mean "everything up to the border" for ALL elements */
*, *::before, *::after { box-sizing: border-box; }

/* 2) a centered card that never exceeds its container */
.card {
  width: 100%;
  max-width: 480px;       /* never wider than 480 */
  margin: 0 auto;         /* auto left/right margins split the free space: centered */
  padding: 24px;          /* inside the width, thanks to border-box */
  border: 1px solid #ddd;
}

/* 3) three equal columns that really fit */
.col { width: 33.333%; padding: 16px; float: left; }   /* with border-box this stays inside 100% */`
    }
  ],
  codeTitle: ['Box size calculator', 'Reset + centered card (CSS)'],
  viz: [
    {
      title: 'Box layers: how wide is the element really?',
      input: '300 20 5 10 content-box',
      inputLabel: 'width padding border margin box-sizing (left/right, in px)',
      gen: function (input) {
        var t = String(input || '').trim().split(/\s+/);
        if (t.length < 5) throw new Error('Format: width padding border margin box-sizing   e.g.  300 20 5 10 content-box');
        var w = num(t[0], 'width'), p = num(t[1], 'padding'), b = num(t[2], 'border'), m = num(t[3], 'margin'), bs = t[4].toLowerCase();
        if (bs !== 'content-box' && bs !== 'border-box') throw new Error('box-sizing must be content-box or border-box');
        if (w > 2000 || p > 500 || b > 100 || m > 500) throw new Error('Keep numbers small: width ≤ 2000, padding ≤ 500, border ≤ 100, margin ≤ 500');
        var content = bs === 'content-box' ? w : Math.max(0, w - 2 * p - 2 * b);
        var bbw = content + 2 * p + 2 * b, total = bbw + 2 * m;
        var names = ['margin', 'border', 'padding', 'content', 'padding', 'border', 'margin'];
        function bars(vals, hl, label) {
          return { type: 'bars', label: label, values: vals.slice(), texts: vals.map(function (v) { return v + ''; }), idxLabels: names, hl: hl };
        }
        var frames = [];
        frames.push({
          narr: 'You wrote <code>width: ' + w + 'px; padding: ' + p + 'px; border: ' + b + 'px solid; margin: ' + m + 'px; box-sizing: ' + bs + '</code>. The question: how many pixels of page width will this element really use?',
          parts: [{ type: 'vars', label: 'The CSS you wrote (left/right sides)', vals: { width: w + 'px', padding: p + 'px', border: b + 'px', margin: m + 'px', 'box-sizing': bs }, hl: { 'box-sizing': 'cur' } }]
        });
        frames.push({
          narr: bs === 'content-box' ? '<b>content-box:</b> <code>width</code> describes the <b>content only</b>. So the content (blue) is exactly <b>' + w + 'px</b>.' : '<b>border-box:</b> <code>width</code> includes padding and border, so the browser carves them out of ' + w + ': content = ' + w + ' - 2×' + p + ' - 2×' + b + ' = <b>' + content + 'px</b>' + (w - 2 * p - 2 * b < 0 ? ' (it cannot go below 0, so the box is actually bigger than you asked!)' : '') + '.',
          parts: [bars([0, 0, 0, content, 0, 0, 0], { 3: 'win' }, 'Layers so far (content = blue)')]
        });
        frames.push({
          narr: 'Add the <b>padding</b> on both sides (green): ' + p + ' + ' + p + ' = ' + 2 * p + 'px. Running width: ' + content + ' + ' + 2 * p + ' = <b>' + (content + 2 * p) + 'px</b>.',
          parts: [bars([0, 0, p, content, p, 0, 0], { 3: 'win', 2: 'ok', 4: 'ok' }, 'Content + padding')]
        });
        frames.push({
          narr: 'Add the <b>border</b> (purple): 2×' + b + ' = ' + 2 * b + 'px. The element\'s painted width is now <b>' + bbw + 'px</b>' + (bs === 'border-box' && w >= 2 * p + 2 * b ? ' - exactly the ' + w + 'px you wrote. That is the point of border-box.' : ' - ' + (bs === 'content-box' ? 'bigger than the ' + w + 'px you wrote!' : 'padding and border alone are bigger than the width.')),
          parts: [bars([0, b, p, content, p, b, 0], { 3: 'win', 2: 'ok', 4: 'ok', 1: 'sel', 5: 'sel' }, 'Content + padding + border = border box')]
        });
        frames.push({
          narr: 'Finally the <b>margin</b> (amber): 2×' + m + ' = ' + 2 * m + 'px of empty space outside. Total space reserved in the row: <b>' + total + 'px</b>. Neighbours must keep at least this far away.',
          parts: [bars([m, b, p, content, p, b, m], { 3: 'win', 2: 'ok', 4: 'ok', 1: 'sel', 5: 'sel', 0: 'cur', 6: 'cur' }, 'Full margin box')]
        });
        var cbW = w + 2 * p + 2 * b, bbW = Math.max(w, 2 * p + 2 * b);
        frames.push({
          narr: 'Same CSS, both models side by side. With <code>content-box</code> the border box is ' + cbW + 'px; with <code>border-box</code> it is ' + bbW + 'px. A margin of ' + m + 'px per side adds ' + 2 * m + 'px to either.',
          parts: [{ type: 'table', label: 'Comparison for width: ' + w + 'px', columns: ['Model', 'Content', 'Border box (painted)', 'Margin box (space used)'], rows: [
            ['content-box', w, cbW, cbW + 2 * m],
            ['border-box', Math.max(0, w - 2 * p - 2 * b), bbW, bbW + 2 * m]
          ], hl: { 0: bs === 'content-box' ? 'sel' : '', 1: bs === 'border-box' ? 'sel' : '' } }]
        });
        return frames;
      }
    },
    {
      title: 'Margin collapsing between two stacked blocks',
      input: '30 20',
      inputLabel: 'margin-bottom of A, margin-top of B (px, negatives allowed)',
      gen: function (input) {
        var t = String(input || '').trim().split(/\s+/).map(Number);
        if (t.length < 2 || t.some(function (x) { return !isFinite(x); }) || Math.abs(t[0]) > 200 || Math.abs(t[1]) > 200) throw new Error('Give two numbers between -200 and 200, e.g.  30 20');
        var x = t[0], y = t[1], gap;
        var rule;
        if (x >= 0 && y >= 0) { gap = Math.max(x, y); rule = 'both positive: the <b>larger</b> one wins'; }
        else if (x <= 0 && y <= 0) { gap = Math.min(x, y); rule = 'both negative: the <b>most negative</b> one wins'; }
        else { gap = x + y; rule = 'one positive, one negative: they are <b>added</b> (the negative pulls the boxes together)'; }
        var frames = [];
        frames.push({
          narr: 'Two block boxes stacked in normal flow. Box A has <code>margin-bottom: ' + x + 'px</code>. Box B right below it has <code>margin-top: ' + y + 'px</code>. How far apart are their borders?',
          parts: [{ type: 'bars', label: 'The two touching margins', values: [Math.abs(x), Math.abs(y)], texts: [x + 'px', y + 'px'], idxLabels: ['A margin-bottom', 'B margin-top'], hl: { 0: 'cur', 1: 'cur' } }]
        });
        frames.push({
          narr: 'Naive guess: margins just add: ' + x + ' + ' + y + ' = <b>' + (x + y) + 'px</b>. That is what happens with padding or between flex items. For touching vertical block margins it is wrong.',
          parts: [{ type: 'bars', label: 'Naive sum', values: [Math.abs(x + y)], texts: [(x + y) + 'px'], idxLabels: ['x + y'], hl: { 0: 'bad' } }]
        });
        frames.push({
          narr: 'Real browser rule - ' + rule + '. Gap = <b>' + gap + 'px</b>.',
          parts: [{ type: 'bars', label: 'Collapsed margin', values: [Math.abs(gap)], texts: [gap + 'px'], idxLabels: ['actual gap'], hl: { 0: 'ok' } }, { type: 'vars', label: 'Result', vals: { naive: (x + y) + 'px', collapsed: gap + 'px' }, hl: { collapsed: 'ok' } }]
        });
        frames.push({
          narr: 'Margins do <b>not</b> collapse when: a border or padding sits between them, the boxes are flex or grid items, floated, absolutely positioned, <code>inline-block</code>, or the parent creates a new formatting context (<code>overflow: hidden</code>, <code>display: flow-root</code>). Horizontal margins never collapse.',
          parts: [{ type: 'table', label: 'Collapse cheat sheet', columns: ['Situation', 'Collapses?'], rows: [['two block siblings', 'yes'], ['parent and its first/last child (no padding or border between)', 'yes'], ['flex / grid items', 'no'], ['floats, absolute, inline-block', 'no'], ['left and right margins', 'never']], hl: { 0: 'ok', 2: 'bad', 3: 'bad', 4: 'bad' } }]
        });
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'Why three 33.33% columns overflow (and the fix)',
      html: `<p>A row is 900px wide. Each column: <code>width: 33.333%; padding: 15px; border: 1px solid</code>.</p>
        ${H.table(['Model', 'Each column paints', 'Three columns', 'Result'], [
          ['content-box', '300 + 30 + 2 = <b>332px</b>', '996px', H.c('r', 'overflows by 96px - the last column wraps to a new line')],
          ['border-box', '<b>300px</b> (content 268)', '900px', H.c('g', 'fits perfectly')]
        ])}
        <p>The fix is a single line: <code>box-sizing: border-box</code>. This is the #1 real-world reason for the global reset.</p>`,
      code: { lang: 'css', code: `.col { width: 33.333%; padding: 15px; border: 1px solid #ccc; box-sizing: border-box; float: left; }` }
    },
    {
      title: 'Compute the rendered width by hand',
      html: `<p>CSS: <code>width: 200px; padding: 10px 25px; border: 4px solid; margin: 0 15px;</code> (content-box).</p>
        ${H.table(['Step', 'Calculation', 'Running total'], [
          ['content', '200', '200'],
          ['padding left + right', '25 + 25', '250'],
          ['border left + right', '4 + 4', '258 (painted width)'],
          ['margin left + right', '15 + 15', '288 (space in the row)']
        ])}
        <p>Only the <b>left and right</b> values matter for width; the 10px top/bottom padding affects height. With <code>border-box</code> the painted width would be exactly 200px.</p>`
    },
    {
      title: 'Centering with margin auto, and why it needs a width',
      html: `<p><code>margin: 0 auto</code> tells the browser: "split all leftover horizontal space equally between left and right". But a normal block with <code>width: auto</code> already stretches to fill its container, so there is no leftover. Give it a width or <code>max-width</code>:</p>
        <pre>.page { max-width: 700px; margin: 0 auto; }  /* container 1000px: 150px on each side */</pre>
        ${H.table(['Container', 'max-width', 'Free space', 'Each auto margin'], [['1000px', '700px', '300px', '150px'], ['600px', '700px', '0 (box is capped at 600)', '0']])}`
    },
    {
      title: 'Margin collapsing: the parent that moves with its child',
      html: `<p>A child with <code>margin-top: 40px</code> inside a parent that has no padding or border: the child's margin "escapes" and collapses with the parent's margin, so the whole <b>parent</b> moves down 40px instead of the child moving inside it. Any of these stops the escape:</p>
        <ul><li><code>padding-top: 1px</code> or a border on the parent</li><li><code>overflow: hidden</code> (or <code>auto</code>) on the parent</li><li><code>display: flow-root</code> on the parent (the clean, side-effect-free fix)</li><li>Make the parent a flex or grid container</li></ul>`,
      code: { lang: 'css', code: `.parent { display: flow-root; }   /* child's margin now stays inside the parent */\n.child  { margin-top: 40px; }` }
    }
  ],
  deepDive: `<p><b>Formatting contexts.</b> Block boxes live in a <b>block formatting context</b> (BFC). A new BFC is created by the root element, floats, absolutely positioned boxes, <code>inline-block</code>, <code>overflow</code> other than visible, flex/grid containers and <code>display: flow-root</code>. Inside a BFC, vertical margins of siblings collapse; at a BFC boundary they do not. That single idea explains why <code>overflow: hidden</code> "fixes" collapsing margins and "clears" floats - it is creating a BFC as a side effect, and why <code>flow-root</code> was invented to do just that.</p>
    <p><b>Percentages.</b> Percent <code>width</code> refers to the containing block's width. Percent <code>padding</code> and <code>margin</code> (all four sides, including top and bottom!) also refer to the containing block's <b>width</b>, which is how the old "padding-top: 56.25%" 16:9 trick worked. Today use <code>aspect-ratio: 16 / 9</code>. Percent <code>height</code> only works when the parent has a definite height.</p>
    <p><b>Intrinsic sizing.</b> <code>width: auto</code> on a block means "fill the container minus my own margins, padding and border" - the box never overflows by itself. Setting <code>width: 100%</code> with padding in content-box mode is the classic cause of overflow (100% + padding). <code>min-content</code>, <code>max-content</code> and <code>fit-content</code> size from the content: shrink-wrap versus wide as possible.</p>
    <p><b>Not in the box model:</b> <code>outline</code> and <code>box-shadow</code> are drawn outside the border but take no layout space. <b>Inline elements</b> (<code>span</code>, <code>a</code>) ignore <code>width</code>/<code>height</code> and vertical margin; their vertical padding and border paint but do not push neighbours. <code>box-sizing</code> itself is not inherited, which is why the reset uses the universal selector (or the inherit trick on <code>html</code>).</p>
    <p><b>DevTools.</b> The <b>Computed</b> tab draws the box model diagram with the real numbers for the selected element; hovering a page element highlights margin (orange), border, padding (green) and content (blue). Use it before reasoning by hand.</p>`,
  aiEra: `<p><b>What AI changes:</b> generated layouts usually start with the border-box reset and Tailwind (which does so in its preflight), so the width trap bites less often - until you paste a snippet into a project that lacks the reset, or an embedded widget lands inside someone else's page.</p>
    <p><b>Use AI as a partner:</b> give it the CSS and ask <code>List the content, padding, border and margin box width for each of these elements. Show the arithmetic.</code> Compare with the DevTools box-model diagram. Ask for a reproduction of a "weird 8px gap" bug and have it explain whether it is margin collapsing, inline whitespace or a default margin.</p>
    <p><b>Where AI goes wrong:</b> it applies <code>margin</code> where <code>padding</code> or <code>gap</code> is the right tool, forgets that vertical margins collapse, and invents explanations for horizontal scrollbars (blaming the container) when the real cause is a single 100%-width element with padding.</p>
    <p><b>What you must still own:</b> hand arithmetic for any box, the BFC mental model, and choosing between margin, padding and <code>gap</code> deliberately.</p>`,
  problems: [{
    title: 'Rendered Width: content-box vs border-box',
    level: 'Easy', tags: ['css', 'box model', 'arithmetic'], companies: ['Amazon', 'Shopify', 'Flipkart'],
    lang: 'js',
    statement: `<p>An element is described by <code>{ width, padding: [left, right], border: [left, right], margin: [left, right], boxSizing }</code>. Return an object <code>{ content, borderBox, marginBox }</code> with the horizontal sizes in px. Under <code>content-box</code>, <code>width</code> is the content width; under <code>border-box</code>, <code>width</code> includes padding and border (content cannot go below 0).</p>`,
    constraints: `0 ≤ every number ≤ 10<sup>4</sup>. boxSizing is either "content-box" or "border-box".`,
    example: `<p>Input: <code>{ width: 300, padding: [20, 20], border: [5, 5], margin: [10, 10], boxSizing: "content-box" }</code></p>
      ${H.table(['Quantity', 'Value', 'Computation'], [
        ['content', '300', 'width is the content'],
        ['borderBox', H.c('b', '350'), '300 + 20 + 20 + 5 + 5'],
        ['marginBox', H.c('g', '370'), '350 + 10 + 10']
      ])}
      <p>The same element with <code>border-box</code> gives content 250, borderBox 300, marginBox 320.</p>`,
    brute: {
      why: `<p>The beginner version always adds padding and border to <code>width</code> and ignores <code>box-sizing</code>. It is right for content-box and wrong for border-box - which is exactly the mistake that makes real layouts overflow. The fix is one <code>if</code>, not a different algorithm.</p>`,
      code: { lang: 'js', run: true, code: R`
// Ignores boxSizing: always behaves like content-box
function sizesWrong(e) {
  const content = e.width;
  const borderBox = content + e.padding[0] + e.padding[1] + e.border[0] + e.border[1];
  return { content, borderBox, marginBox: borderBox + e.margin[0] + e.margin[1] };
}
console.log(sizesWrong({ width: 300, padding: [20, 20], border: [5, 5], margin: [10, 10], boxSizing: 'border-box' }));
// borderBox 350 - but with border-box it should be 300
` }
    },
    mcq: { q: 'With <code>box-sizing: border-box; width: 200px; padding: 20px; border: 5px solid</code>, how wide is the painted box?', options: ['250px', '200px', '240px', '210px'], answer: 1, explain: 'In border-box mode the width already includes padding and border, so the painted box is exactly 200px (content is 150px).' },
    hints: [
      `<p>Hint 1: first work out how wide the <b>content</b> is. That depends only on <code>boxSizing</code>.</p>`,
      `<p>Hint 2: <code>extras = padding[0] + padding[1] + border[0] + border[1]</code>. content-box: content = width. border-box: content = max(0, width - extras).</p>`,
      `<p>Hint 3: borderBox = content + extras (not simply width, when the extras exceed the width!). marginBox = borderBox + margin[0] + margin[1]. Add up carefully and return all three.</p>`
    ],
    solution: {
      approach: `<p>Compute the sum of horizontal padding and border once (<code>extras</code>). Decide the content width from <code>boxSizing</code>. The painted box is content + extras; the margin box adds the horizontal margins.</p>`,
      code: { lang: 'js', run: true, code: R`
function sizes(e) {
  const extras = e.padding[0] + e.padding[1] + e.border[0] + e.border[1];
  const content = e.boxSizing === 'border-box' ? Math.max(0, e.width - extras) : e.width;
  const borderBox = content + extras;
  const marginBox = borderBox + e.margin[0] + e.margin[1];
  return { content, borderBox, marginBox };
}
const base = { width: 300, padding: [20, 20], border: [5, 5], margin: [10, 10] };
console.log(sizes({ ...base, boxSizing: 'content-box' })); // { content: 300, borderBox: 350, marginBox: 370 }
console.log(sizes({ ...base, boxSizing: 'border-box' }));  // { content: 250, borderBox: 300, marginBox: 320 }
console.log(sizes({ width: 40, padding: [30, 30], border: [0, 0], margin: [0, 0], boxSizing: 'border-box' })); // content clamps to 0, borderBox 60
` },
      complexity: `<p>Time O(1), space O(1).</p>`,
      followUps: ['How many such boxes fit in a row of width W (floor of W / marginBox)?', 'Solve the inverse: what <code>width</code> should you write to get a painted width of 400px under content-box?', 'Extend to heights and compute the total area.']
    }
  }]
});

/* =====================================================================
   TOPIC 6 - UNITS
   ===================================================================== */
topics.push({
  title: 'Units: px, em, rem, %, vw/vh and Friends',
  analogy: `<p>Imagine asking three people for "a long distance". One says <b>"500 metres"</b> (fixed, same for everybody - that is <code>px</code>). One says <b>"twice as far as the last stop"</b> (relative to something nearby - that is <code>em</code> and <code>%</code>). One says <b>"twice the length of the school's main corridor"</b> (relative to one famous reference point - that is <code>rem</code>). And one says <b>"half the width of the screen"</b> (<code>vw</code>). Choosing a CSS unit is choosing <i>what the number is relative to</i>.</p>`,
  explain: `<p>A CSS length is a number plus a unit. The unit says what the number is measured against.</p>
    ${H.table(['Unit', 'Relative to', 'Typical use'], [
      ['<code>px</code>', 'a CSS pixel (fixed: 1/96 inch)', 'borders, shadows, hairlines, tiny fixed details'],
      ['<code>em</code>', 'the <b>current element\'s</b> font-size (for <code>font-size</code> itself: the <b>parent\'s</b>)', 'padding/margin that should scale with the text of a component'],
      ['<code>rem</code>', 'the <b>root</b> (<code>html</code>) font-size', 'font sizes, global spacing - predictable and respects the user\'s browser setting'],
      ['<code>%</code>', 'a property-specific reference: <code>width</code> uses the parent\'s width; <code>font-size</code> uses the parent\'s font-size', 'fluid widths'],
      ['<code>vw</code> / <code>vh</code>', '1% of the viewport width / height', 'full-screen sections, fluid type'],
      ['<code>vmin</code> / <code>vmax</code>', '1% of the smaller / larger viewport side', 'squares that always fit'],
      ['<code>dvh</code> / <code>svh</code> / <code>lvh</code>', 'dynamic / small / large viewport height (mobile toolbars)', 'true full-height on phones'],
      ['<code>ch</code>', 'width of the digit "0" in the current font', 'readable line length: <code>max-width: 65ch</code>'],
      ['unitless', 'a pure number', '<code>line-height: 1.5</code>, <code>flex: 1</code>, <code>z-index</code>, <code>opacity</code>']
    ])}
    <p><b>Default numbers to remember:</b> browsers start with <code>16px</code> as the root font-size. So <code>1rem = 16px</code>, <code>1.5rem = 24px</code>, <code>0.75rem = 12px</code>. Quick formula: <b>rem = px ÷ 16</b>, <b>px = rem × 16</b>.</p>
    <p><b>The em trap - compounding.</b> <code>em</code> is relative to the element's <i>own</i> inherited size. If every nested level says <code>font-size: 1.5em</code>, each level multiplies again: 16 → 24 → 36 → 54px. <code>rem</code> never compounds because it always looks at the root.</p>
    ${H.table(['Nesting level', 'font-size: 1.5em', 'font-size: 1.5rem'], [['1', '24px', '24px'], ['2', '36px', '24px'], ['3', '54px', '24px']])}
    <p><b>Helpful functions:</b> <code>calc(100% - 2rem)</code> mixes units; <code>min()</code>, <code>max()</code> pick the smaller or larger; <code>clamp(1rem, 2.5vw, 2rem)</code> = "grow with the screen but never below 1rem or above 2rem" (fluid typography in one line).</p>
    <p><b>Rule of thumb:</b> <code>rem</code> for font sizes and layout spacing, <code>em</code> for component-internal spacing, <code>%</code>/<code>fr</code>/<code>max-width</code> for widths, <code>px</code> for borders and shadows, unitless for line-height.</p>`,
  clues: [
    '"the text gets bigger and bigger in nested lists" - em compounding',
    '"respect the user\'s browser font size setting / accessibility" - use rem for font sizes, not px',
    '"convert 24px to rem" (assume 16px root) - 1.5rem',
    '"full-height hero section on mobile jumps when the address bar hides" - <code>100vh</code> vs <code>100dvh</code>',
    '"fluid typography without media queries" - <code>clamp()</code> with a vw term',
    '"limit a line of text to a comfortable length" - <code>max-width: 60-75ch</code>',
    '"difference between em and rem" - em: relative to the element\'s font-size; rem: relative to the root'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Unit converter + em compounding (runnable)', code: R`
// Convert any supported length to px, given the context
// ctx = { root: root font-size px, parent: parent font-size px, viewport: viewport width px }
function toPx(value, unit, ctx) {
  switch (unit) {
    case 'px':  return value;
    case 'rem': return value * ctx.root;
    case 'em':  return value * ctx.parent;          // as a font-size, em is relative to the parent
    case '%':   return value / 100 * ctx.parent;    // as a font-size, % is relative to the parent
    case 'vw':  return value / 100 * ctx.viewport;
    case 'pt':  return value * 96 / 72;
    default: throw new Error('unknown unit ' + unit);
  }
}

const ctx = { root: 16, parent: 20, viewport: 1280 };
for (const [v, u] of [[24, 'px'], [1.5, 'rem'], [1.5, 'em'], [150, '%'], [5, 'vw'], [12, 'pt']]) {
  console.log((v + u).padEnd(7), '=', toPx(v, u, ctx) + 'px');
}

// em compounding: each nested element multiplies the previous size
function nestedEm(rootPx, multipliers) {
  const sizes = [rootPx];
  for (const m of multipliers) sizes.push(sizes[sizes.length - 1] * m);
  return sizes;
}
console.log('em  chain :', nestedEm(16, [1.5, 1.5, 1.5]).join(' -> ') + ' px');   // 16 -> 24 -> 36 -> 54
console.log('rem chain :', [1.5, 1.5, 1.5].map(m => 16 * m).join(', ') + ' px');   // 24, 24, 24 (never compounds)

// clamp(min, preferred, max)
const clamp = (min, pref, max) => Math.min(max, Math.max(min, pref));
for (const vw of [320, 800, 1440]) console.log('viewport', vw, '-> clamp(16, 2.5vw, 32) =', clamp(16, vw * 0.025, 32) + 'px');
`
    },
    {
      lang: 'css', title: 'A sensible unit strategy', code: `html { font-size: 100%; }                 /* = the user's setting, usually 16px: never hard-code px here */

body { font-size: 1rem; line-height: 1.5; }
h1   { font-size: clamp(1.75rem, 1.2rem + 2.5vw, 3rem); }  /* fluid but bounded */

.card   { padding: 1.5rem; border: 1px solid #ddd; max-width: 65ch; }   /* rem spacing, px hairline, readable measure */
.button { font-size: 1rem; padding: 0.5em 1em; }          /* em: padding scales if you change the button's font-size */

.hero   { min-height: 100vh; min-height: 100dvh; }        /* dvh wins on phones that support it */
.sidebar{ width: calc(100% - 2rem); }                     /* mixed units with calc() */`
    }
  ],
  codeTitle: ['Unit converter + em compounding', 'A sensible unit strategy (CSS)'],
  viz: [
    {
      title: 'em compounds through nested elements; rem does not',
      input: '16 1.5 1.5 1.5',
      inputLabel: 'root px, then the em value on each nested level (1 to 3 levels)',
      gen: function (input) {
        var t = String(input || '').trim().split(/\s+/).map(Number);
        if (t.length < 2 || t.length > 4 || t.some(function (x) { return !isFinite(x) || x <= 0; })) throw new Error('Give a root size and 1 to 3 positive multipliers, e.g.  16 1.5 1.5 1.5');
        var root = t[0], mult = t.slice(1), n = mult.length;
        var arr = ['html', 'div.a', null, 'div.b', null, null, null, 'div.c'];
        var idx = [0, 1, 3, 7];
        var sizes = [root];
        mult.forEach(function (m, i) { sizes.push(r2(sizes[i] * m)); });
        var frames = [], tags = {}, hl = {};
        tags[0] = root + 'px'; hl[0] = 'cur';
        frames.push({
          narr: 'The root <code>html</code> has font-size <b>' + root + 'px</b> (the browser default is 16px). Each nested <code>div</code> will say <code>font-size: Xem</code>. An <code>em</code> means "times my <b>parent\'s</b> font-size".',
          parts: [{ type: 'tree', label: 'Computed font-size', arr: arr.slice(0, 2 + (n > 1 ? 2 : 0) + (n > 2 ? 4 : 0)), hl: { 0: 'cur' }, tags: { 0: root + 'px' } }]
        });
        for (var i = 1; i <= n; i++) {
          tags[idx[i]] = sizes[i] + 'px';
          var hh = {}; Object.keys(hl).forEach(function (k) { hh[k] = 'done'; }); hh[idx[i]] = 'ok';
          hl[idx[i]] = 'done';
          var tg = {}; Object.keys(tags).forEach(function (k) { tg[k] = tags[k]; });
          frames.push({
            narr: 'Level ' + i + ': <code>font-size: ' + mult[i - 1] + 'em</code> &rarr; ' + mult[i - 1] + ' × parent (' + sizes[i - 1] + 'px) = <b>' + sizes[i] + 'px</b>. The parent\'s size is already the result of the levels above, so the multiplications stack up.',
            parts: [
              { type: 'tree', label: 'Computed font-size (green = just computed)', arr: arr.slice(0, idx[n] + 1), hl: hh, tags: tg },
              { type: 'vars', label: 'Running calculation', vals: { calc: sizes.slice(0, i + 1).join(' → '), 'level size': sizes[i] + 'px' }, hl: { 'level size': 'ok' } }
            ]
          });
        }
        var rows = mult.map(function (m, i) { return ['level ' + (i + 1), m + 'em', sizes[i + 1] + 'px', m + 'rem', r2(root * m) + 'px']; });
        frames.push({
          narr: 'Same numbers written in <code>rem</code>: every level looks at the <b>root</b> (' + root + 'px) only, so nothing compounds. This is why <code>rem</code> is the safe default for font sizes.',
          parts: [{ type: 'table', label: 'em versus rem', columns: ['Level', 'em value', 'em result', 'rem value', 'rem result'], rows: rows, hl: { 0: 'cur' } }]
        });
        frames.push({
          narr: 'Takeaway: <b>em</b> = "relative to the current context, multiplies down the tree"; <b>rem</b> = "relative to the root, always the same". Use em when you <i>want</i> the scaling (a button\'s padding growing with its text) and rem when you do not.',
          parts: [{ type: 'bars', label: 'em result by depth (px)', values: sizes, texts: sizes.map(function (s) { return s + 'px'; }), idxLabels: sizes.map(function (s, i) { return i === 0 ? 'root' : 'level ' + i; }), hl: { 0: 'done', 1: 'ok', 2: 'ok', 3: 'ok' } }]
        });
        return frames;
      }
    },
    {
      title: 'Unit converter: one length in every unit',
      input: '24px 16 20 1280',
      inputLabel: 'length (px, rem, em, %, vw, pt), root font px, parent font px, viewport width px',
      gen: function (input) {
        var t = String(input || '').trim().split(/\s+/);
        var m = t[0] ? /^(-?\d*\.?\d+)(px|rem|em|%|vw|pt)$/.exec(t[0]) : null;
        if (!m || t.length < 4) throw new Error('Format: 24px 16 20 1280   (length, root px, parent font px, viewport width px; units px rem em % vw pt)');
        var v = Number(m[1]), u = m[2], root = num(t[1], 'root'), par = num(t[2], 'parent'), vp = num(t[3], 'viewport');
        if (!root || !par || !vp) throw new Error('root, parent and viewport must be above 0');
        var px;
        var how = { px: 'already px', rem: v + ' × root ' + root, em: v + ' × parent font-size ' + par, '%': v + '% × parent font-size ' + par, vw: v + '% × viewport ' + vp, pt: v + ' × 96/72' };
        if (u === 'px') px = v; else if (u === 'rem') px = v * root; else if (u === 'em') px = v * par; else if (u === '%') px = v / 100 * par; else if (u === 'vw') px = v / 100 * vp; else px = v * 96 / 72;
        px = r2(px);
        var ctx = { context: 'root ' + root + 'px, parent ' + par + 'px, viewport ' + vp + 'px' };
        var frames = [];
        frames.push({ narr: 'We have <b>' + v + u + '</b>. To translate between units, first turn it into plain pixels, then divide by the new unit\'s reference size. Context: root font ' + root + 'px, parent font ' + par + 'px, viewport ' + vp + 'px wide.', parts: [{ type: 'vars', label: 'Input and context', vals: { length: v + u, root: root + 'px', parent: par + 'px', viewport: vp + 'px' }, hl: { length: 'cur' } }] });
        frames.push({ narr: 'Step 1 - to px: ' + how[u] + ' = <b>' + px + 'px</b>.', parts: [{ type: 'vars', label: 'In pixels', vals: { px: px }, hl: { px: 'ok' } }] });
        var conv = [['px', px + 'px', 'pixels'], ['rem', r2(px / root) + 'rem', px + ' ÷ root ' + root], ['em', r2(px / par) + 'em', px + ' ÷ parent font ' + par], ['%', r2(px / par * 100) + '%', 'of parent font-size'], ['vw', r2(px / vp * 100) + 'vw', px + ' ÷ viewport ' + vp + ' × 100'], ['pt', r2(px * 0.75) + 'pt', px + ' × 0.75']];
        for (var k = 1; k <= conv.length; k += 2) {
          frames.push({
            narr: 'Step ' + (2 + Math.floor((k - 1) / 2)) + ' - divide by each unit\'s reference: ' + conv.slice(0, k + 1).map(function (c) { return '<b>' + c[1] + '</b>'; }).join(', ') + '.',
            parts: [{ type: 'table', label: 'Conversions so far', columns: ['Unit', 'Value', 'How'], rows: conv.slice(0, k + 1).map(function (c) { return [c[0], c[1], c[2]]; }), hl: { 0: 'sel' } }]
          });
        }
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'Why rem respects the user\'s browser setting and px does not',
      html: `<p>Maya has low vision and set her browser's default font size to <b>24px</b> (instead of 16px). Compare two sites:</p>
        ${H.table(['Site CSS', 'Maya sees', 'Result'], [
          ['<code>body { font-size: 16px }</code>', '16px', H.c('r', 'her setting is overridden')],
          ['<code>html { font-size: 100% } body { font-size: 1rem }</code>', '24px', H.c('g', 'her setting is respected')],
          ['<code>p { font-size: 0.875rem }</code>', '21px (0.875 × 24)', H.c('g', 'everything scales proportionally')]
        ])}
        <p>Rule: never hard-code <code>px</code> on <code>html</code> or <code>body</code> font-size. (The old <code>html { font-size: 62.5% }</code> trick, which makes 1rem = 10px, still respects the user's setting because it is a percentage, but it forces you to write every size in tenths.)</p>`
    },
    {
      title: 'em padding makes a button scale as a unit',
      html: `<p>A button with <code>padding: 0.5em 1em</code> has padding relative to <b>its own</b> font-size:</p>
        ${H.table(['font-size', 'padding (0.5em 1em)'], [['14px', '7px 14px'], ['16px', '8px 16px'], ['24px', '12px 24px']])}
        <p>Change only the font-size (a "large" variant) and the padding follows automatically - no second rule needed. With rem padding the proportions would drift.</p>`,
      code: { lang: 'css', code: `.btn { font-size: 1rem; padding: 0.5em 1em; border-radius: 0.375em; }\n.btn--lg { font-size: 1.25rem; }   /* padding and radius scale along */` }
    },
    {
      title: 'The 100vh problem on phones',
      html: `<p>On mobile browsers the address bar slides away while scrolling, so the viewport height changes. <code>100vh</code> equals the <b>large</b> viewport (bar hidden), so a hero with <code>height: 100vh</code> is taller than the visible area and its bottom button is hidden under the bar at first.</p>
        ${H.table(['Unit', 'Meaning'], [['<code>lvh</code>', 'large viewport (toolbars hidden)'], ['<code>svh</code>', 'small viewport (toolbars shown)'], ['<code>dvh</code>', 'dynamic - tracks the current state']])}
        <p>Use <code>min-height: 100dvh</code> with a <code>100vh</code> fallback line before it.</p>`,
      code: { lang: 'css', code: `.hero { min-height: 100vh; min-height: 100dvh; }` }
    },
    {
      title: 'Fluid type with clamp()',
      html: `<p><code>font-size: clamp(1rem, 0.8rem + 1vw, 1.5rem)</code> means: preferred = 0.8rem + 1% of viewport width, but never below 1rem or above 1.5rem.</p>
        ${H.table(['Viewport', 'Preferred', 'Result (root 16px)'], [['320px', '12.8 + 3.2 = 16px', '16px (at the minimum)'], ['800px', '12.8 + 8 = 20.8px', '20.8px'], ['1600px', '12.8 + 16 = 28.8px', '24px (capped at max)']])}
        <p>Mixing <code>rem</code> with <code>vw</code> keeps the user's zoom preference working, which a pure <code>vw</code> size would break.</p>`
    }
  ],
  deepDive: `<p><b>What a "pixel" really is.</b> A CSS pixel is an <i>angle-based reference unit</i>: 1/96 of an inch at a typical reading distance, not a hardware pixel. On a phone with <code>devicePixelRatio = 3</code>, one CSS pixel is 3×3 = 9 physical dots. That is why <code>1px</code> borders look crisp on all screens, and why browser zoom is implemented by changing the ratio, so px-sized things scale when zoomed. The accessibility difference between px and rem is therefore about the <i>font-size preference</i> in browser settings (which only rem/em/% respond to), not about zoom.</p>
    <p><b>Computed vs used.</b> <code>em</code>, <code>rem</code>, <code>vw</code> are resolved to absolute lengths at computed-value time, which is why children inherit px. The one famous inconsistency: percentages in <code>font-size</code> refer to the parent's font-size, but in <code>line-height</code> to the element's own. <code>ex</code> and <code>ch</code> depend on actual font metrics; <code>lh</code> and <code>rlh</code> (line-height units) let you size things in "lines" (<code>margin-block: 1lh</code>).</p>
    <p><b>Container query units.</b> <code>cqw</code>, <code>cqh</code>, <code>cqi</code>, <code>cqb</code> are relative to a query container's size, which allows components to scale with their container instead of the viewport. Combined with <code>clamp()</code> they give truly component-level fluid design.</p>
    <p><b>Precision and rounding.</b> Browsers lay out in 1/64 px increments internally ("LayoutUnit"), so <code>33.333%</code> × 3 may still leave a hairline gap; modern layout (grid <code>fr</code>, flex) avoids the percent maths. Sub-pixel text positioning differs between engines; do not rely on exact fractions.</p>
    <p><b>Zoom and text-only scaling.</b> WCAG 1.4.4 requires text to resize to 200% without loss of content, and 1.4.10 (reflow) requires no horizontal scrolling at 320 CSS px wide. rem-based layouts with max-widths in <code>ch</code> pass these naturally; fixed-px containers with <code>overflow: hidden</code> often fail.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI tools and design-to-code exporters usually emit raw <code>px</code> values straight from the design file (Figma says "24"), and Tailwind classes silently map to rem. Converting between them is trivial for a machine - deciding <i>which</i> unit expresses the design's intent is not.</p>
    <p><b>Use AI as a partner:</b> ask <code>Convert this stylesheet from px to rem assuming a 16px root. Keep borders and shadows in px. Show a table of old and new values.</code> Then ask for a fluid type scale: <code>Generate a clamp()-based type scale from 320px to 1440px with 1.25 ratio, and show computed sizes at 320, 768, 1440.</code> Verify a couple of values by hand with the formulas above.</p>
    <p><b>Where AI goes wrong:</b> it assumes a 16px root even when the project sets <code>html { font-size: 62.5% }</code>; it forgets em compounding in nested components; it uses <code>vh</code> for mobile hero sections; and it may convert everything to rem, including 1px borders.</p>
    <p><b>What you must still own:</b> the mental conversion (px ÷ 16), spotting compounding bugs, and the accessibility reasoning for why font sizes belong in rem.</p>`,
  problems: [{
    title: 'Nested em Font Size',
    level: 'Easy', tags: ['css', 'units', 'em', 'arithmetic'], companies: ['Adobe', 'Flipkart'],
    lang: 'js',
    statement: `<p>A page has a root font-size of <code>rootPx</code>. Elements are nested one inside another, and each one declares <code>font-size</code> in <code>em</code> with the multiplier list <code>ems</code> (outermost first). Write <code>finalSize(rootPx, ems)</code> returning the font-size in px of the innermost element. If the same multipliers were written in <code>rem</code>, what would the innermost size be? Return <code>{ em, rem }</code> (the rem answer uses only the last multiplier).</p>`,
    constraints: `1 ≤ ems.length ≤ 20, 0.1 ≤ each multiplier ≤ 10, 1 ≤ rootPx ≤ 100. Round results to 2 decimals.`,
    example: `<p>rootPx = 16, ems = [1.5, 1.5, 1.5]</p>
      ${H.table(['Level', 'em chain', 'rem chain'], [['1', '16 × 1.5 = 24', '24'], ['2', '24 × 1.5 = 36', '24'], ['3', '36 × 1.5 = ' + H.c('b', '54'), H.c('g', '24')]])}
      <p>Output: <code>{ em: 54, rem: 24 }</code></p>`,
    brute: {
      why: `<p>A common slip is to multiply every multiplier by the <b>root</b> size separately (<code>16 × 1.5 × 3</code>) or to add them. The wasted idea: forgetting that each em is relative to the <b>parent's already-computed</b> size, so you multiply the multipliers together (a running product), not add them.</p>`,
      code: { lang: 'js', run: true, code: R`
// WRONG: adds the multipliers instead of multiplying through the chain
function finalWrong(rootPx, ems) { return rootPx * ems.reduce((s, m) => s + m, 0); }
console.log(finalWrong(16, [1.5, 1.5, 1.5])); // 72 - but the real answer is 54
` }
    },
    mcq: { q: 'Parent font-size is 20px. A child declares <code>font-size: 0.5em</code>, and a grandchild declares <code>font-size: 2em</code>. What is the grandchild\'s size?', options: ['40px', '20px', '10px', '25px'], answer: 1, explain: 'Child = 0.5 × 20 = 10px. Grandchild = 2 × 10 = 20px. Each em is relative to the parent\'s computed size.' },
    hints: [
      `<p>Hint 1: each element's size depends only on <b>its parent's</b> size and its own multiplier.</p>`,
      `<p>Hint 2: keep a running <code>size</code>. Start at <code>rootPx</code>; for each multiplier set <code>size = size * m</code>.</p>`,
      `<p>Hint 3: for the rem comparison, rem always looks at the root, so the innermost rem size is <code>rootPx * lastMultiplier</code> - no loop needed. Round to 2 decimals at the end only (rounding at every step drifts).</p>`
    ],
    solution: {
      approach: `<p>Loop once with a running product for the em chain. For rem the answer is just the root size times the last multiplier because rem ignores ancestors. Round only at the end.</p>`,
      code: { lang: 'js', run: true, code: R`
function finalSize(rootPx, ems) {
  let size = rootPx;
  for (const m of ems) size *= m;                       // each em multiplies the parent's computed size
  const round2 = x => Math.round(x * 100) / 100;
  return { em: round2(size), rem: round2(rootPx * ems[ems.length - 1]) };
}
console.log(finalSize(16, [1.5, 1.5, 1.5])); // { em: 54, rem: 24 }
console.log(finalSize(20, [0.5, 2]));        // { em: 20, rem: 40 }
console.log(finalSize(16, [0.875]));         // { em: 14, rem: 14 }  (one level: both agree)
` },
      complexity: `<p>Time O(n), space O(1).</p>`,
      followUps: ['Support a mixed list of units (px, %, rem).', 'Given a target size and the chain, find the missing multiplier.', 'How would you design the CSS so nested lists do not compound?']
    }
  }]
});

/* =====================================================================
   TOPIC 7 - COLORS AND TYPOGRAPHY
   ===================================================================== */
topics.push({
  title: 'Colors and Typography: Making Text Readable and Beautiful',
  analogy: `<p>A colour on screen is like a <b>paint mixed from three tubes</b> - red, green and blue light - where each tube can be turned from 0 (off) to 255 (full). <b>Hex</b> (<code>#3366cc</code>) is just those three amounts written in base 16, like a recipe card: "33 red, 66 green, cc blue". <b>HSL</b> is the same paint described the way a human talks: <i>which colour</i> (hue), <i>how vivid</i> (saturation) and <i>how light</i> (lightness). And typography is the <b>handwriting</b> of your page: the shape of letters (font), their size, the space between lines and how long a line is - all chosen so the reader's eyes never get tired.</p>`,
  explain: `<p><b>Ways to write a colour in CSS</b> (all describe the same screen light):</p>
    ${H.table(['Format', 'Example', 'Notes'], [
      ['Keyword', '<code>tomato</code>, <code>rebeccapurple</code>, <code>transparent</code>, <code>currentColor</code>', '148 named colours; <code>currentColor</code> = "use the text colour"'],
      ['Hex', '<code>#3366cc</code>, <code>#36c</code>, <code>#3366cc80</code>', 'pairs of base-16 digits: RR GG BB (+ AA = alpha). <code>#36c</code> = <code>#3366cc</code>'],
      ['rgb()', '<code>rgb(51 102 204)</code>, <code>rgb(51 102 204 / 50%)</code>', 'each channel 0 to 255; slash adds opacity'],
      ['hsl()', '<code>hsl(220 60% 50%)</code>', 'hue 0-360° on the colour wheel, saturation %, lightness %'],
      ['Modern', '<code>oklch(0.6 0.15 250)</code>, <code>color-mix(in srgb, red 30%, white)</code>, <code>light-dark(#111, #eee)</code>', 'perceptually uniform colour, mixing, theme-aware values']
    ])}
    <p><b>Hex to decimal by hand:</b> <code>cc</code> = 12×16 + 12 = <b>204</b>; <code>66</code> = 6×16 + 6 = <b>102</b>; <code>33</code> = 3×16 + 3 = <b>51</b>. So <code>#3366cc</code> = <code>rgb(51, 102, 204)</code> = <code>hsl(220, 60%, 50%)</code>.</p>
    <p><b>Why HSL is great for design systems:</b> to make a hover colour, keep the hue and lower the lightness by 8%. To make a disabled colour, lower the saturation. With hex you would need a calculator.</p>
    <p><b>Contrast - the rule you can fail.</b> Readable text needs enough brightness difference from its background. WCAG measures it as a ratio from 1:1 (no difference) to 21:1 (black on white). Minimum for normal text is <b>4.5:1</b> (level AA); large text (24px, or 18.66px bold) and UI borders need <b>3:1</b>; the stricter AAA level asks for <b>7:1</b>. Famous trap: light-grey text <code>#999</code> on white is only <b>2.85:1</b> - it fails.</p>
    <p><b>Typography basics:</b></p>
    ${H.table(['Property', 'What it does', 'Good default'], [
      ['<code>font-family</code>', 'a <b>stack</b> of fonts, first available wins, last is a generic family', '<code>system-ui, -apple-system, "Segoe UI", Roboto, sans-serif</code>'],
      ['<code>font-size</code>', 'size of the letters', '<code>1rem</code> (16px) for body text'],
      ['<code>font-weight</code>', '100 thin to 900 black; 400 normal, 700 bold', '400 body, 600-700 headings'],
      ['<code>line-height</code>', 'height of a line, ideally unitless', '<code>1.5</code> for body, <code>1.1-1.3</code> for big headings'],
      ['<code>letter-spacing</code>', 'space between letters', 'tiny positive for ALL CAPS, slightly negative for huge headings'],
      ['<code>text-align</code>', 'left, right, center, justify', '<code>start</code>; avoid justify on narrow columns'],
      ['line length', 'characters per line (the "measure")', '<code>max-width: 45ch to 75ch</code>']
    ])}`,
  clues: [
    '"convert #ff8800 to rgb" - split into pairs, base 16 to decimal',
    '"does this text colour meet WCAG AA?" - contrast ratio at least 4.5:1 for normal text',
    '"make a darker version of the brand colour on hover" - HSL lightness, or <code>color-mix()</code>',
    '"text over a photo is hard to read" - overlay, text-shadow, or a solid scrim behind the text',
    '"font looks different on every device" - font stack with fallbacks and a generic family at the end',
    '"page flashes invisible text while the web font loads" - <code>font-display: swap</code>',
    '"lines of text are too long and hard to read" - limit measure with <code>ch</code>'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Colour converter and WCAG contrast checker (runnable)', code: R`
// hex -> [r, g, b]   ("#3366cc" or "#36c")
function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, c => c + c);       // expand the shorthand
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));  // parse each pair as base 16
}

// [r, g, b] -> [h (0-360), s (0-100), l (0-100)]
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0, s = 0; const l = (max + min) / 2;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

// WCAG relative luminance: linearise each channel, then weight by how bright the eye sees it
function luminance([r, g, b]) {
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(hexA, hexB) {
  const la = luminance(hexToRgb(hexA)), lb = luminance(hexToRgb(hexB));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

console.log('#3366cc rgb :', hexToRgb('#3366cc'));          // [51, 102, 204]
console.log('#3366cc hsl :', rgbToHsl(hexToRgb('#3366cc'))); // [220, 60, 50]
console.log('#f80 rgb    :', hexToRgb('#f80'));              // [255, 136, 0]

for (const fg of ['#000000', '#3366cc', '#777777', '#767676', '#999999']) {
  const r = contrast(fg, '#ffffff');
  console.log(fg, 'on white:', r.toFixed(2) + ':1', r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'large text only' : 'FAIL');
}
`
    },
    {
      lang: 'css', title: 'Readable type system', code: `:root {
  --brand: hsl(220 60% 50%);                       /* one hue, tweak lightness for variants */
  --brand-dark: hsl(220 60% 38%);
  --text: #1a1a1a;                                 /* 17.4:1 on white */
  --muted: #595959;                                /* 7:1 on white: muted but still readable */
}

body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;   /* generic family last */
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text);
}

h1, h2, h3 { line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; }
article    { max-width: 65ch; }                    /* comfortable line length */
a          { color: var(--brand-dark); text-underline-offset: 0.15em; }

@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-var.woff2") format("woff2");
  font-display: swap;                              /* show fallback text immediately */
}`
    }
  ],
  codeTitle: ['Colour converter and contrast checker', 'Readable type system (CSS)'],
  viz: {
    title: 'From hex to contrast ratio, step by step',
    input: '#3366cc #ffffff',
    inputLabel: 'text colour and background colour (hex)',
    gen: function (input) {
      var t = String(input || '').trim().split(/\s+/);
      if (!t[0]) throw new Error('Give a text colour and a background, e.g.  #3366cc #ffffff');
      var fgHex = t[0], bgHex = t[1] || '#ffffff';
      var fg = parseHex(fgHex), bg = parseHex(bgHex);
      var norm = function (h) { var r = parseHex(h); return '#' + hex2(r[0]) + hex2(r[1]) + hex2(r[2]); };
      var f = norm(fgHex), g = norm(bgHex);
      var pairs = [f.slice(1, 3), f.slice(3, 5), f.slice(5, 7)];
      var hsl = rgb2hsl(fg);
      var frames = [];
      frames.push({
        narr: 'The colour <code>' + f + '</code> is three pairs of base-16 digits: <b>' + pairs[0] + '</b> (red), <b>' + pairs[1] + '</b> (green), <b>' + pairs[2] + '</b> (blue). Each pair is one channel from 0 to 255.',
        parts: [{ type: 'array', label: 'hex pairs', values: pairs, hl: { 0: 'cur', 1: 'ok', 2: 'win' }, idxLabels: ['R', 'G', 'B'], showIdx: true }]
      });
      frames.push({
        narr: 'Convert each pair to decimal: first digit × 16 + second digit. ' + pairs.map(function (p, i) { return p + ' = ' + parseInt(p[0], 16) + '×16 + ' + parseInt(p[1], 16) + ' = <b>' + fg[i] + '</b>'; }).join('; ') + '.',
        parts: [{ type: 'bars', label: 'channel strength (0-255)', values: fg.slice(), texts: fg.map(String), idxLabels: ['red', 'green', 'blue'], hl: { 0: 'bad', 1: 'ok', 2: 'win' } }]
      });
      frames.push({
        narr: 'The same colour in other notations: <code>rgb(' + fg.join(', ') + ')</code> and <code>hsl(' + hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%)</code>. Hue ' + hsl[0] + '° is the position on the colour wheel (0 red, 120 green, 240 blue); lightness ' + hsl[2] + '% is how bright.',
        parts: [{ type: 'vars', label: 'Same colour, three spellings', vals: { hex: f, rgb: 'rgb(' + fg.join(', ') + ')', hsl: 'hsl(' + hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%)' }, hl: { hsl: 'ok' } }]
      });
      var lf = lumin(fg), lb = lumin(bg);
      frames.push({
        narr: 'Brightness the eye perceives is not linear. WCAG first "linearises" each channel, then weights them: green counts the most (0.7152), blue the least (0.0722). Text colour luminance = <b>' + lf.toFixed(3) + '</b>, background = <b>' + lb.toFixed(3) + '</b> (0 = black, 1 = white).',
        parts: [{ type: 'table', label: 'Relative luminance', columns: ['Colour', 'R lin × 0.2126', 'G lin × 0.7152', 'B lin × 0.0722', 'Luminance'], rows: [
          [f + ' (text)', (lin(fg[0]) * 0.2126).toFixed(3), (lin(fg[1]) * 0.7152).toFixed(3), (lin(fg[2]) * 0.0722).toFixed(3), lf.toFixed(3)],
          [g + ' (background)', (lin(bg[0]) * 0.2126).toFixed(3), (lin(bg[1]) * 0.7152).toFixed(3), (lin(bg[2]) * 0.0722).toFixed(3), lb.toFixed(3)]
        ], hl: { 0: 'cur' } }]
      });
      var hi = Math.max(lf, lb), lo = Math.min(lf, lb), ratio = (hi + 0.05) / (lo + 0.05);
      frames.push({
        narr: 'Contrast ratio = (lighter + 0.05) ÷ (darker + 0.05) = (' + hi.toFixed(3) + ' + 0.05) ÷ (' + lo.toFixed(3) + ' + 0.05) = <b>' + ratio.toFixed(2) + ' : 1</b>. The 0.05 stops the maths exploding for pure black.',
        parts: [{ type: 'vars', label: 'Contrast', vals: { lighter: hi.toFixed(3), darker: lo.toFixed(3), ratio: ratio.toFixed(2) + ' : 1' }, hl: { ratio: 'sel' } }]
      });
      var P = function (ok) { return ok ? 'PASS' : 'fail'; };
      var rows = [['Normal text, AA (4.5)', P(ratio >= 4.5)], ['Large text, AA (3)', P(ratio >= 3)], ['UI components / icons (3)', P(ratio >= 3)], ['Normal text, AAA (7)', P(ratio >= 7)], ['Large text, AAA (4.5)', P(ratio >= 4.5)]];
      var hl = {}; rows.forEach(function (r, i) { hl[i] = r[1] === 'PASS' ? 'ok' : 'bad'; });
      frames.push({
        narr: 'Verdict at ' + ratio.toFixed(2) + ':1. Green rows pass. ' + (ratio < 4.5 ? 'Normal body text at this contrast would fail accessibility audits - darken the text or lighten the background.' : 'This pair is fine for body text.'),
        parts: [{ type: 'table', label: 'WCAG 2 thresholds', columns: ['Requirement', 'Result'], rows: rows, hl: hl }]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'Hex shorthand, alpha, and currentColor',
      html: `<p>Three handy facts in one:</p>
        ${H.table(['Written', 'Means'], [
          ['<code>#fc0</code>', '<code>#ffcc00</code> - each digit doubled'],
          ['<code>#00000080</code>', 'black at 128/255 = 50% opacity (last pair = alpha)'],
          ['<code>rgb(0 0 0 / 50%)</code>', 'the same, easier to read'],
          ['<code>border: 1px solid currentColor</code>', 'border takes the element\'s text colour automatically']
        ])}
        <p><code>currentColor</code> is why SVG icons recolour with the text when you set <code>fill: currentColor</code>.</p>`
    },
    {
      title: 'Building button states with HSL',
      html: `<p>Brand blue <code>hsl(220 60% 50%)</code>. Keep the hue; move lightness:</p>
        ${H.table(['State', 'Colour', 'Idea'], [
          ['normal', '<code>hsl(220 60% 50%)</code>', 'brand'],
          ['hover', '<code>hsl(220 60% 42%)</code>', 'a bit darker'],
          ['active', '<code>hsl(220 60% 36%)</code>', 'darker still'],
          ['disabled', '<code>hsl(220 15% 70%)</code>', 'low saturation, lighter']
        ])}`,
      code: { lang: 'css', code: `.btn { background: hsl(220 60% 50%); color: white; }\n.btn:hover { background: hsl(220 60% 42%); }\n.btn:disabled { background: hsl(220 15% 70%); }` }
    },
    {
      title: 'Contrast table you should memorise',
      html: `<p>Real ratios on a white background:</p>
        ${H.table(['Text colour', 'Ratio', 'Verdict for 16px body text'], [
          ['<code>#000</code>', '21.00', H.c('g', 'AAA')],
          ['<code>#1a1a1a</code>', '17.40', H.c('g', 'AAA')],
          ['<code>#3366cc</code>', '5.37', H.c('g', 'AA')],
          ['<code>#767676</code>', '4.54', H.c('g', 'AA - the lightest grey that passes')],
          ['<code>#777777</code>', '4.48', H.c('r', 'fails by a hair')],
          ['<code>#999999</code>', '2.85', H.c('r', 'fails (large text needs 3.0, still fails)')],
          ['<code>#ff0000</code>', '4.00', H.c('y', 'large text only')]
        ])}
        <p>Never rely on colour alone to convey meaning (red = error): add an icon or text for colour-blind users (about 8% of men).</p>`
    },
    {
      title: 'Font stacks, readable measure and line-height',
      html: `<p>A font stack is a prioritised list: the browser uses the first font that is installed (or loaded). Always end with a generic family so the page never falls back to something random.</p>
        <pre>font-family: "Inter", system-ui, "Segoe UI", Arial, sans-serif;
/* custom font -> OS UI font -> Windows -> classic -> generic */</pre>
        ${H.table(['Choice', 'Too little', 'Good', 'Too much'], [
          ['line-height', '1.0 (lines touch)', '1.4 - 1.6', '2.2 (lines drift apart)'],
          ['characters per line', '20 (choppy)', '45 - 75', '120 (eye loses its place)']
        ])}`
    }
  ],
  deepDive: `<p><b>Colour spaces.</b> Hex, <code>rgb()</code> and <code>hsl()</code> live in <b>sRGB</b>, the gamut of ordinary monitors. Modern displays are wider (Display P3). <code>color(display-p3 1 0.2 0.1)</code> and <code>oklch()</code> reach more vivid colours, with graceful fallback for older screens. <b>OKLCH</b> is perceptually uniform: equal lightness numbers <i>look</i> equally light across hues (HSL's 50% yellow is far brighter than 50% blue), which makes accessible palettes and gradients dramatically easier. <code>color-mix(in oklch, ...)</code> produces smooth blends, and relative colour syntax (<code>oklch(from var(--brand) calc(l - 0.1) c h)</code>) derives hover colours from one token.</p>
    <p><b>Contrast maths and its limits.</b> The WCAG 2 ratio uses sRGB luminance and ignores font weight, size beyond two buckets, and how humans actually perceive dark mode (white on black looks "bolder"). The draft <b>APCA</b> model (WCAG 3 candidate) is polarity- and font-aware. Pass the official WCAG 2 AA check today, and also look at your design with a grey-scale filter and DevTools' vision-deficiency emulation.</p>
    <p><b>Fonts in the browser.</b> A web font costs a network request. <code>font-display: swap</code> shows fallback text first (risking a layout shift, tracked by CLS); <code>optional</code> avoids the shift by skipping a late font; <code>size-adjust</code>, <code>ascent-override</code> make the fallback match the web font's metrics. Prefer a single <b>variable font</b> file (weights 100-900 and optionally width/slant axes) over many static weights, serve <code>woff2</code>, subset the glyphs you need and <code>preload</code> the critical file. System font stacks (<code>system-ui</code>) cost zero bytes and render instantly.</p>
    <p><b>Text rendering details.</b> <code>text-wrap: balance</code> evens out heading lines; <code>text-wrap: pretty</code> avoids orphans in paragraphs. <code>font-variant-numeric: tabular-nums</code> aligns digits in tables. <code>hyphens: auto</code> needs a <code>lang</code> attribute. <code>rem</code>-based sizes honour the user's preferences; <code>letter-spacing</code> in <code>em</code> scales with size. And <code>prefers-color-scheme</code> plus <code>color-scheme: light dark</code> lets browsers pick matching defaults for form controls and scrollbars.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants can generate a whole palette and type scale from one brand colour in seconds, and design tools suggest accessible alternatives. What they cannot do reliably is judge how a colour <i>feels</i> on a real screen or in a real brand.</p>
    <p><b>Use AI as a partner:</b> ask <code>Given brand #3366cc, generate 9 shades (50-900) in OKLCH with accessible text colours, and show the contrast ratio of each text/background pair</code> - then re-check three pairs with the calculator above or DevTools' contrast picker. Ask for a font stack with fallbacks and <code>size-adjust</code> values to reduce layout shift.</p>
    <p><b>Where AI goes wrong:</b> it claims pairs pass AA without computing the ratio (e.g. light grey on white), suggests many font weights that bloat page weight, forgets dark mode contrast, and writes hex codes that do not match its own description ("a deep navy" as <code>#1e90ff</code>).</p>
    <p><b>What you must still own:</b> verifying contrast numerically, keeping colours in tokens (CSS variables) instead of scattering hex codes, and ensuring information never depends on colour alone.</p>`,
  problems: [{
    title: 'WCAG Contrast Checker',
    level: 'Medium', tags: ['css', 'colour', 'accessibility', 'math'], companies: ['Atlassian', 'Adobe', 'Microsoft'],
    lang: 'js',
    statement: `<p>Write <code>checkContrast(fgHex, bgHex)</code> that takes two hex colours (<code>#rgb</code> or <code>#rrggbb</code>) and returns <code>{ ratio, AA, AAA }</code>. <code>ratio</code> is the WCAG contrast ratio rounded to 2 decimals. <code>AA</code> is true if the ratio is at least 4.5 (normal text), <code>AAA</code> true if at least 7. Formula: linearise each channel (<code>c/255</code>; if ≤ 0.04045 divide by 12.92, else <code>((c+0.055)/1.055)^2.4</code>), luminance <code>L = 0.2126 R + 0.7152 G + 0.0722 B</code>, ratio <code>(Llighter + 0.05) / (Ldarker + 0.05)</code>.</p>`,
    constraints: `Colours are valid 3 or 6 digit hex strings with a leading #. Order of arguments must not change the result.`,
    example: `${H.table(['Input', 'Output', 'Why'], [
      ['<code>"#000", "#fff"</code>', '<code>{ ratio: 21, AA: true, AAA: true }</code>', 'maximum possible contrast'],
      ['<code>"#777", "#fff"</code>', '<code>{ ratio: 4.48, AA: false, AAA: false }</code>', 'just under 4.5'],
      ['<code>"#3366cc", "#fff"</code>', '<code>{ ratio: 5.37, AA: true, AAA: false }</code>', 'good for body text but not AAA']
    ])}`,
    brute: {
      why: `<p>A shortcut that skips linearisation and divides raw 0-255 averages (<code>(r+g+b)/3</code>) gives numbers that look plausible but disagree with WCAG: it treats blue as bright as green and ignores the curve of human vision. Pure red <code>#ff0000</code> would be averaged to 85, "much darker" than it looks. The wasted step is guessing instead of using the actual specification formula.</p>`,
      code: { lang: 'js', run: true, code: R`
// WRONG: plain average brightness, no gamma and no channel weights
function brightness(hex) {
  const h = hex.replace('#', '');
  const v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  return (v[0] + v[1] + v[2]) / 3;
}
console.log(brightness('#ff0000'), brightness('#00ff00')); // 85 and 85 - but green looks far brighter than red
` }
    },
    mcq: { q: 'Which channel contributes the MOST to perceived brightness in the WCAG formula?', options: ['Red (0.2126)', 'Green (0.7152)', 'Blue (0.0722)', 'All the same'], answer: 1, explain: 'The human eye is most sensitive to green light, so green carries a weight of about 72%; blue only about 7%.' },
    hints: [
      `<p>Hint 1: contrast compares two <b>luminances</b>, not two hex codes. First turn each colour into a number between 0 (black) and 1 (white).</p>`,
      `<p>Hint 2: parse the hex into three channels (expand <code>#abc</code> to <code>#aabbcc</code> first), linearise each channel, then take the weighted sum.</p>`,
      `<p>Hint 3: the ratio is always lighter over darker, so use <code>max</code> and <code>min</code> - order of arguments must not matter. Round only the final ratio: <code>Math.round(x*100)/100</code>. Black on white must be exactly 21.</p>`
    ],
    solution: {
      approach: `<p>Three small functions: parse hex to channels, compute WCAG luminance with the gamma-linearisation formula, and combine the two luminances into <code>(max + 0.05) / (min + 0.05)</code>. AA and AAA are simple threshold checks on the unrounded ratio.</p>`,
      code: { lang: 'js', run: true, code: R`
function toRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, c => c + c);
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}
function luminance(hex) {
  const [r, g, b] = toRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function checkContrast(fg, bg) {
  const a = luminance(fg), b = luminance(bg);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return { ratio: Math.round(ratio * 100) / 100, AA: ratio >= 4.5, AAA: ratio >= 7 };
}
console.log(checkContrast('#000', '#fff'));      // { ratio: 21, AA: true, AAA: true }
console.log(checkContrast('#777', '#fff'));      // { ratio: 4.48, AA: false, AAA: false }
console.log(checkContrast('#3366cc', '#fff'));   // { ratio: 5.37, AA: true, AAA: false }
console.log(checkContrast('#fff', '#3366cc'));   // same ratio: argument order does not matter
` },
      complexity: `<p>Time O(1), space O(1).</p>`,
      followUps: ['Given a text colour that fails, find the lightest/darkest adjustment of HSL lightness that reaches 4.5:1.', 'Handle <code>rgb()</code> and <code>hsl()</code> strings as inputs.', 'Add the large-text thresholds (3 and 4.5) as a parameter.']
    }
  }]
});

/* =====================================================================
   TOPIC 8 - DISPLAY: BLOCK, INLINE, INLINE-BLOCK
   ===================================================================== */
topics.push({
  title: 'Display: Block, Inline and Inline-Block Flow',
  analogy: `<p>Think of a page as a <b>printed newspaper column</b>. A <b>block</b> element is a whole paragraph or photo: it starts on a fresh line and takes the full width of the column - nothing sits beside it. An <b>inline</b> element is a single <i>word</i> in the middle of a sentence: it just flows along with the other words, as wide as the word itself, and when the line is full it wraps to the next one. An <b>inline-block</b> is a <i>sticker</i> you stick in the middle of a sentence: it sits in the line like a word, but it is a solid rectangle, so if it does not fit it jumps to the next line whole instead of being cut in two.</p>`,
  explain: `<p>The <code>display</code> property decides how an element takes part in layout. Three values matter first:</p>
    ${H.table(['', 'block', 'inline', 'inline-block'], [
      ['Starts on a new line?', H.c('g', 'yes'), H.c('r', 'no, flows with text'), H.c('r', 'no, flows with text')],
      ['Width when <code>auto</code>', 'fills the whole container', 'just its content', 'just its content (shrink-to-fit)'],
      ['<code>width</code> / <code>height</code> work?', H.c('g', 'yes'), H.c('r', 'ignored'), H.c('g', 'yes')],
      ['Vertical margin / padding pushes others?', H.c('g', 'yes'), H.c('r', 'no (paints but does not push)'), H.c('g', 'yes')],
      ['Can wrap across two lines?', 'n/a', H.c('g', 'yes, it splits'), H.c('r', 'no, it moves as one piece')],
      ['Defaults for', '<code>div</code>, <code>p</code>, <code>h1-h6</code>, <code>ul</code>, <code>section</code>', '<code>span</code>, <code>a</code>, <code>strong</code>, <code>em</code>, <code>img</code>*', 'buttons, inputs (behave this way)']
    ])}
    <p>*<code>img</code> is a <i>replaced</i> inline element: it has a width and height like inline-block even though it sits in a line.</p>
    <p><b>Two more values you use daily:</b></p>
    ${H.table(['Value', 'Effect on layout', 'Takes space?', 'Visible?'], [
      ['<code>display: none</code>', 'element is removed from the layout and the accessibility tree', 'no', 'no'],
      ['<code>visibility: hidden</code>', 'invisible but its box stays', 'yes', 'no'],
      ['<code>opacity: 0</code>', 'fully transparent, still clickable and focusable', 'yes', 'no (but interactive!)']
    ])}
    <p><b>Normal flow</b> is what happens without any special layout: blocks stack top to bottom; inline content fills <b>line boxes</b> left to right and wraps. Every layout tool you learn later (flexbox, grid, floats, positioning) is a way to <i>leave</i> normal flow. You can change an element's role: <code>a { display: block; }</code> makes the whole row clickable; <code>li { display: inline-block; }</code> lays a menu out horizontally.</p>
    <p><b>Gotcha:</b> if you write inline-blocks on separate lines in the HTML, the whitespace between them becomes a real space character of about 4px, so "touching" boxes show a gap. The modern fix is not to use inline-block for layout at all but flexbox with <code>gap</code> (covered in the Layout module).</p>`,
  clues: [
    '"my width/height has no effect on a span or link" - inline elements ignore width and height',
    '"why does a div take the whole row even though I set width: 100px?" - blocks always start a new line; the rest of the row stays empty',
    '"horizontal navigation menu from a list" - inline-block (old school) or flex (modern)',
    '"small gap between images / buttons that I did not ask for" - whitespace between inline-level boxes, or the baseline gap under images',
    '"hide an element but keep its space" - <code>visibility: hidden</code>; "remove it entirely" - <code>display: none</code>',
    '"make the whole card clickable" - make the link <code>display: block</code> (or stretch it with a pseudo-element)'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Block / inline / inline-block flow simulator (runnable)', code: R`
// Lay items out on lines that are "width" characters wide.
// item = { kind: 'block' | 'inline' | 'inline-block' | 'none' | 'hidden', size, name }
function layout(items, width) {
  const lines = [];          // each line is an array of width cells
  let col = width;           // start "full" so the first item opens a new line
  const newLine = () => { lines.push(Array(width).fill('.')); col = 0; };

  for (const it of items) {
    if (it.kind === 'none') continue;                     // removed from layout: no space at all
    if (it.kind === 'block') {                             // always its own line(s)
      newLine();
      for (let i = 0; i < Math.min(it.size, width); i++) lines[lines.length - 1][i] = it.name;
      col = width;                                         // line is closed: nobody sits beside a block
    } else if (it.kind === 'inline') {                     // text-like: can be split across lines
      let left = it.size;
      while (left > 0) {
        if (col >= width) newLine();
        const n = Math.min(width - col, left);
        for (let i = 0; i < n; i++) lines[lines.length - 1][col + i] = it.name;
        col += n; left -= n;
      }
    } else {                                               // inline-block (and visibility:hidden) move as one piece
      const size = Math.min(it.size, width);
      if (col + size > width) newLine();                   // does not fit: jump to the next line whole
      for (let i = 0; i < size; i++) lines[lines.length - 1][col + i] = it.kind === 'hidden' ? '~' : it.name;
      col += size;
    }
  }
  return lines.map(l => l.join(''));
}

const page = [
  { kind: 'block', size: 10, name: 'A' },          // header
  { kind: 'inline', size: 4, name: 'b' },
  { kind: 'inline', size: 8, name: 'c' },           // wraps onto a second line
  { kind: 'inline-block', size: 5, name: 'D' },     // 5 cells do not fit after c, jumps down whole
  { kind: 'none', size: 6, name: 'x' },
  { kind: 'hidden', size: 3, name: 'h' },           // invisible (~) but takes space
  { kind: 'block', size: 10, name: 'F' }
];
const lines = layout(page, 10);
lines.forEach((l, i) => console.log('line ' + (i + 1) + ': ' + l));
console.log('total lines:', lines.length);
`
    },
    {
      lang: 'html', title: 'Block vs inline in markup', code: `<style>
  .box   { background: gold; width: 120px; height: 40px; margin: 10px; }
  .a     { display: block; }          /* 120x40, own line */
  .b     { display: inline; }         /* width/height ignored: only as wide as its text */
  .c     { display: inline-block; }   /* 120x40 but sits in the text line */
  nav a  { display: inline-block; padding: 0.5rem 1rem; }  /* padding now really pushes */
</style>
<div class="box a">block</div>
<span class="box b">inline</span> <span class="box b">inline</span>
<span class="box c">inline-block</span> <span class="box c">inline-block</span>`
    }
  ],
  codeTitle: ['Flow simulator', 'Block vs inline in markup'],
  viz: {
    title: 'Normal flow on a 10-cell line',
    input: 'b:10 i:4 i:8 ib:5 none:6 hid:3 b:10',
    inputLabel: 'items: b (block) i (inline) ib (inline-block) none hid, with :size (cells), up to 10 items',
    gen: function (input) {
      var W = 10;
      var toks = String(input || '').trim().split(/\s+/).filter(Boolean);
      if (toks.length < 2 || toks.length > 10) throw new Error('Give 2 to 10 items such as  b:10 i:4 i:8 ib:5');
      var items = toks.map(function (t, k) {
        var m = /^(b|i|ib|none|hid)(?::(\d+))?$/i.exec(t);
        if (!m) throw new Error('Item "' + t + '" is not valid. Use b, i, ib, none or hid, optionally with :size, for example ib:5');
        var kind = m[1].toLowerCase();
        var size = m[2] ? Number(m[2]) : (kind === 'b' ? W : 3);
        size = Math.max(1, Math.min(size, kind === 'i' ? 20 : W));
        return { kind: kind, size: size, name: String.fromCharCode(65 + k) };
      });
      var rows = [], col = W;
      var cls = { b: 'ok', i: 'win', ib: 'sel', hid: 'done' };
      var cells = {};
      function newRow() { rows.push(Array(W).fill('')); col = 0; }
      function snap() {
        var r = rows.length ? rows.map(function (x) { return x.slice(); }) : [Array(W).fill('')];
        return { type: 'grid', label: 'Page line by line (' + W + ' cells per line)', rows: r, colHead: r[0].map(function (_, i) { return i + 1; }), rowHead: r.map(function (_, i) { return 'line ' + (i + 1); }), hl: JSON.parse(JSON.stringify(cells)) };
      }
      function put(row, c, text, k) { rows[row][c] = text; cells[row + ',' + c] = cls[k] || 'done'; }
      var frames = [];
      frames.push({
        narr: 'Each line holds ' + W + ' cells. Items are placed in order. <span class="c-g">Green</span> = block, <span class="c-b">blue</span> = inline, <span class="c-p">purple</span> = inline-block, faded ~ = hidden but present. Letters A, B, C... are the items in source order.',
        parts: [snap(), { type: 'queue', label: 'Items in the HTML', items: items.map(function (it) { return it.name + ': ' + (it.kind === 'b' ? 'block' : it.kind === 'i' ? 'inline' : it.kind === 'ib' ? 'inline-block' : it.kind === 'none' ? 'display:none' : 'visibility:hidden') + ' (' + it.size + ')'; }) }]
      });
      items.forEach(function (it) {
        var msg;
        if (it.kind === 'none') {
          msg = '<b>' + it.name + '</b> has <code>display: none</code>: it is removed from the layout. No cells, no gap - as if it was not in the HTML.';
        } else if (it.kind === 'b') {
          newRow();
          for (var i = 0; i < it.size; i++) put(rows.length - 1, i, it.name, 'b');
          col = W;
          msg = '<b>' + it.name + '</b> is a <b>block</b>: it starts a new line' + (it.size < W ? ' and, although its width is only ' + it.size + ', the rest of the line stays empty because blocks never share a line' : ' and, with width auto, stretches across the whole line') + '. The next item must start below.';
        } else if (it.kind === 'i') {
          var left = it.size, splits = 0;
          while (left > 0) {
            if (col >= W) { newRow(); splits++; }
            var n = Math.min(W - col, left);
            for (var j = 0; j < n; j++) put(rows.length - 1, col + j, it.name, 'i');
            col += n; left -= n;
          }
          msg = '<b>' + it.name + '</b> is <b>inline</b> (' + it.size + ' wide as content): it continues on the current line like a word in a sentence. ' + (splits > 1 ? 'It ran out of room and <b>wrapped</b>, splitting across ' + splits + ' lines - inline boxes can be cut at line ends.' : 'Its width and height properties would be ignored; only the content decides.');
        } else {
          if (!rows.length) newRow();
          var wrapped = col + it.size > W;
          if (wrapped) newRow();
          for (var q = 0; q < it.size; q++) put(rows.length - 1, col + q, it.kind === 'hid' ? '~' : it.name, it.kind);
          col += it.size;
          msg = it.kind === 'hid' ? '<b>' + it.name + '</b> has <code>visibility: hidden</code>: invisible, but it still takes ' + it.size + ' cells (shown as ~)' + (wrapped ? ' - it did not fit, so it also jumped to the next line' : '') + '.' : '<b>' + it.name + '</b> is <b>inline-block</b> (' + it.size + ' wide): ' + (wrapped ? 'it did <b>not fit</b> in the rest of the line, so the whole box jumps to the next line (it is never split).' : 'it fits in the current line, so it sits there like a word - but as a solid box.');
        }
        frames.push({ narr: msg, parts: [snap()] });
      });
      frames.push({
        narr: 'Result: <b>' + rows.length + ' line(s)</b>. Remember: block = new line + full width; inline = flows and wraps, ignores width/height; inline-block = flows as a solid box; <code>none</code> = gone; <code>hidden</code> = invisible but present.',
        parts: [snap(), { type: 'vars', label: 'Summary', vals: { lines: rows.length, items: items.length }, hl: { lines: 'sel' } }]
      });
      return frames;
    }
  },
  examples: [
    {
      title: 'Why width does nothing on a span (and the fix)',
      html: `<p><code>span { width: 200px; height: 50px; background: gold; }</code> - the gold box is only as big as the text. A span is inline, so width and height are ignored. Two fixes:</p>
        ${H.table(['Fix', 'Effect'], [
          ['<code>display: inline-block</code>', 'stays in the text line, now 200×50'],
          ['<code>display: block</code>', 'own line, 200×50, empty space to its right']
        ])}
        <p>Interview line: "<i>width and height apply to block-level and replaced boxes, not to non-replaced inline boxes.</i>"</p>`,
      code: { lang: 'css', code: `.tag { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 999px; background: gold; }` }
    },
    {
      title: 'The mystery gap under an image',
      html: `<p>An <code>img</code> is inline, so it sits on the text <b>baseline</b>, and below the baseline the line box reserves room for descenders (the tail of "g" and "y"). That produces a 3-6px gap under the image inside a tight container. Fixes:</p>
        <ul><li><code>img { display: block; }</code> (best: no line box at all)</li><li><code>img { vertical-align: middle; }</code></li><li>set <code>line-height: 0</code> on the container (hacky)</li></ul>`,
      code: { lang: 'css', code: `img { display: block; max-width: 100%; height: auto; }   /* common reset */` }
    },
    {
      title: 'display: none vs visibility: hidden vs opacity: 0',
      html: `${H.table(['Property', 'Space kept?', 'Screen readers', 'Clickable / focusable?', 'Animatable?'], [
        ['<code>display: none</code>', 'no', 'skipped', 'no', 'no (use <code>@starting-style</code> / <code>allow-discrete</code> now)'],
        ['<code>visibility: hidden</code>', 'yes', 'skipped', 'no', 'discrete flip'],
        ['<code>opacity: 0</code>', 'yes', 'still read!', H.c('r', 'yes'), 'yes, smooth'],
        ['<code>hidden</code> attribute', 'no', 'skipped', 'no', 'same as display none']
      ])}
      <p>Pitfall: an <code>opacity: 0</code> dropdown is still tabbable and clickable. Combine it with <code>visibility: hidden</code> or <code>inert</code>.</p>`
    },
    {
      title: 'A horizontal menu, old school and new school',
      html: `<p>Old school: <code>li { display: inline-block; }</code> (watch the whitespace gap). New school: make the <code>ul</code> a flex container and use <code>gap</code>:</p>`,
      code: { lang: 'css', code: `/* old */  nav li { display: inline-block; margin-right: 1rem; }\n/* new */  nav ul { display: flex; gap: 1rem; list-style: none; padding: 0; }` }
    }
  ],
  deepDive: `<p><b>Inner and outer display types.</b> <code>display</code> is really two values: an <i>outer</i> type (how the box behaves among its siblings: <code>block</code> or <code>inline</code>) and an <i>inner</i> type (how it lays out its own children: <code>flow</code>, <code>flex</code>, <code>grid</code>, <code>flow-root</code>). The two-value syntax is <code>display: block flex</code>; the familiar one-value forms are shorthands: <code>flex</code> = <code>block flex</code>, <code>inline-flex</code> = <code>inline flex</code>, <code>inline-block</code> = <code>inline flow-root</code>. This explains why a flex container is itself a block among its siblings.</p>
    <p><b>Block and inline formatting contexts.</b> A block container holds either block-level children (a block formatting context, boxes stack vertically) or inline-level children (an inline formatting context). If you mix them, the browser wraps the loose text in an <b>anonymous block box</b>. Inside an inline formatting context content is arranged into <b>line boxes</b>; each line box is as tall as its tallest inline-level child plus alignment via <code>vertical-align</code> and the <code>line-height</code> strut of the parent. That strut is the true reason for the image gap and for the odd vertical alignment of inline-blocks.</p>
    <p><b>Special values.</b> <code>display: contents</code> makes the element's own box disappear while its children stay (useful for wrappers in grid/flex, but it historically dropped accessibility semantics for buttons and tables). <code>list-item</code> is what gives <code>li</code> its marker; <code>table</code> and friends emulate table layout without table markup; <code>flow-root</code> makes a new block formatting context cleanly.</p>
    <p><b>Accessibility and performance.</b> <code>display: none</code> removes the subtree from the accessibility tree; <code>aria-hidden</code> hides it from assistive tech but not visually. Toggling <code>display</code> forces a style recalculation and layout; for large lists consider <code>content-visibility: auto</code>, which skips rendering work for off-screen sections. Browsers' default <code>display</code> values come from the user-agent stylesheet - run <code>getComputedStyle(el).display</code> to see the real thing.</p>`,
  aiEra: `<p><b>What AI changes:</b> generated markup mostly uses flex/grid and utility classes, so beginners may never see inline versus block behaviour - until a <code>span</code> refuses to take a margin or a mystery gap shows up under an image.</p>
    <p><b>Use AI as a partner:</b> describe the symptom ("my badge ignores height", "gap under thumbnails") and ask <code>Which display type is each element and why does this happen? Give the minimal CSS fix and one alternative.</code> Ask for an ASCII drawing of the line boxes. Then confirm with DevTools: select the element and read the Computed display value and the box overlay.</p>
    <p><b>Where AI goes wrong:</b> it "fixes" everything with <code>display: flex</code> on the parent, hiding the underlying cause; it recommends <code>opacity: 0</code> for hiding accessible content; and it forgets whitespace between inline-blocks.</p>
    <p><b>What you must still own:</b> the block / inline / inline-block table, the difference between removing, hiding and fading, and the ability to explain normal flow in one minute - it is a standard interview opener.</p>`,
  problems: [{
    title: 'Count the Lines in Normal Flow',
    level: 'Medium', tags: ['css', 'display', 'layout', 'simulation'], companies: ['Google', 'Atlassian', 'Uber'],
    lang: 'js',
    statement: `<p>A container is <code>width</code> cells wide. You get a list of items <code>{ kind, size }</code> in source order, where <code>kind</code> is one of <code>"block"</code>, <code>"inline"</code>, <code>"inline-block"</code>, <code>"none"</code>. Return the number of <b>lines</b> the content occupies in normal flow.</p>
      <p>Rules: a block always starts on a new line and closes the line (the next item starts below it). Inline items fill the current line and wrap onto new lines when they run out of room (they may be split). An inline-block moves to the next line as a whole piece if it does not fit in the remaining space (its size is at most <code>width</code>). <code>none</code> takes no space.</p>`,
    constraints: `1 ≤ items.length ≤ 10<sup>4</sup>, 1 ≤ width ≤ 100, 1 ≤ size (block and inline-block sizes ≤ width, inline sizes ≤ 10<sup>3</sup>).`,
    example: `<p>width = 10, items = block(10), inline(4), inline(8), inline-block(5), none(6), block(10)</p>
      ${H.table(['Item', 'Placement', 'Lines so far'], [
        ['block 10', 'line 1', '1'],
        ['inline 4', 'line 2, cells 1-4', '2'],
        ['inline 8', 'line 2 cells 5-10 (6 cells) + line 3 cells 1-2', '3'],
        ['inline-block 5', 'line 3 has 8 free cells: fits, cells 3-7', '3'],
        ['none 6', 'no space', '3'],
        ['block 10', 'new line 4', H.c('g', '4')]
      ])}`,
    brute: {
      why: `<p>A naive approach counts one line per item, or divides the total size by the width. That ignores blocks (they waste the rest of their line) and inline-blocks (they can leave a hole at the end of a line when they jump). Total-size division also undercounts any layout that contains a block narrower than the container.</p>`,
      code: { lang: 'js', run: true, code: R`
// WRONG: pretends everything is inline text
function linesWrong(items, width) {
  const total = items.filter(i => i.kind !== 'none').reduce((s, i) => s + i.size, 0);
  return Math.ceil(total / width);
}
const items = [{ kind: 'block', size: 4 }, { kind: 'block', size: 4 }];
console.log(linesWrong(items, 10)); // 1 - but two blocks need 2 lines
` }
    },
    mcq: { q: 'In a 10-cell line, 8 cells are already used. A new <code>inline-block</code> of size 5 arrives. What happens?', options: ['It is split: 2 cells here and 3 on the next line', 'It moves entirely to the next line', 'It overflows the container', 'It is hidden'], answer: 1, explain: 'Inline-blocks are atomic: they cannot be split across lines. If they do not fit they jump to the next line as a whole (inline text, in contrast, would split).' },
    hints: [
      `<p>Hint 1: keep two numbers while scanning the items: how many lines exist, and how many cells of the current line are already used (<code>col</code>).</p>`,
      `<p>Hint 2: block: always <code>lines++</code> and mark the line as full (<code>col = width</code>). Inline: while there is size left, open a new line if the current one is full, and fill as much as fits. Inline-block: if it does not fit, open a new line first.</p>`,
      `<p>Hint 3: start with <code>lines = 0</code> and <code>col = width</code> (meaning "no open line") so the first item opens line 1. For huge inline sizes avoid a per-cell loop: use arithmetic on the remaining space.</p>`
    ],
    solution: {
      approach: `<p>Simulate with two counters. <code>col</code> is the used cells in the current line; starting at <code>width</code> means "the line is full / none open". A block opens a line and closes it. Inline text fills the rest of the line, then needs <code>ceil(left / width)</code> more lines. An inline-block opens a new line only if it does not fit. Skip <code>none</code>.</p>`,
      code: { lang: 'js', run: true, code: R`
function countLines(items, width) {
  let lines = 0;
  let col = width;                       // width = "no open line yet"
  for (const it of items) {
    if (it.kind === 'none') continue;    // takes no space
    if (it.kind === 'block') {
      lines++;                           // always its own line
      col = width;                       // and the line is closed afterwards
    } else if (it.kind === 'inline') {
      let left = it.size;
      const room = width - col;          // free cells on the current line (0 if closed)
      if (left <= room) { col += left; continue; }
      left -= room;                      // fill this line, the rest wraps
      const extra = Math.ceil(left / width);
      lines += extra;
      col = left - (extra - 1) * width;  // cells used on the last new line
    } else {                             // inline-block
      if (col + it.size > width) { lines++; col = 0; }
      col += it.size;
    }
  }
  return lines;
}

const items = [
  { kind: 'block', size: 10 }, { kind: 'inline', size: 4 }, { kind: 'inline', size: 8 },
  { kind: 'inline-block', size: 5 }, { kind: 'none', size: 6 }, { kind: 'block', size: 10 }
];
console.log(countLines(items, 10));                                   // 4
console.log(countLines([{ kind: 'block', size: 4 }, { kind: 'block', size: 4 }], 10)); // 2
console.log(countLines([{ kind: 'inline-block', size: 6 }, { kind: 'inline-block', size: 6 }], 10)); // 2 (second jumps)
` },
      complexity: `<p>Time O(n) with arithmetic for long inline items, space O(1).</p>`,
      followUps: ['Return the actual lines as strings (like the visualizer).', 'Add a 1-cell whitespace gap between inline-level items and see how the result changes.', 'Add <code>visibility: hidden</code> items that take space but are invisible.']
    }
  }]
});

/* =====================================================================
   TOPIC 9 - BASIC POSITIONING
   ===================================================================== */
topics.push({
  title: 'Basic Positioning: static, relative, absolute, fixed, sticky',
  analogy: `<p>Imagine a <b>classroom seating chart</b>. Normally students sit in the rows the teacher assigned (<b>static</b>: normal flow). A student can lean a bit to the left but still own the same chair, so nobody else can take it (<b>relative</b>). A student can stand up and walk to a spot measured from the corner of the <i>nearest</i> table that is "reserved" - leaving an empty chair behind and everybody else shuffling up (<b>absolute</b>). A poster taped to the <i>window of the room</i> stays in the same place on the window no matter how you move around (<b>fixed</b>). And a sticky note on your notebook sits normally, but when you scroll past, it sticks to the top of the page until its section ends (<b>sticky</b>).</p>`,
  explain: `<p>The <code>position</code> property decides how an element is placed. The offsets <code>top</code>, <code>right</code>, <code>bottom</code>, <code>left</code> (and the shorthand <code>inset</code>) only do something when position is <i>not</i> <code>static</code>.</p>
    ${H.table(['Value', 'In normal flow?', 'Offsets are measured from', 'Scrolls with the page?', 'Typical use'], [
      ['<code>static</code> (default)', 'yes', 'offsets ignored', 'yes', 'everything, by default'],
      ['<code>relative</code>', 'yes - its old space stays reserved', 'its <b>own</b> normal position', 'yes', 'nudge a box; make it the anchor for absolute children'],
      ['<code>absolute</code>', '<b>no</b> - neighbours close the gap', 'the nearest <b>positioned ancestor</b> (any ancestor whose position is not static), else the page', 'yes', 'badges, tooltips, overlays, icons inside inputs'],
      ['<code>fixed</code>', '<b>no</b>', 'the <b>viewport</b> (the browser window)', '<b>no</b> - stays put', 'sticky chat button, cookie banner, top bar'],
      ['<code>sticky</code>', 'yes (until it sticks)', 'acts relative, then sticks at the offset while its parent is on screen', 'partly', 'table headers, section titles, sidebars']
    ])}
    <p><b>The golden pair:</b> to place a child exactly in a corner of its parent, give the parent <code>position: relative</code> (no offsets - it just becomes the anchor) and the child <code>position: absolute; top: 8px; right: 8px</code>. Forgetting <code>relative</code> on the parent is the #1 positioning bug: the child flies to the corner of the whole page.</p>
    <p><b>Out of flow means no space.</b> An absolute or fixed element no longer takes room, so its siblings move up as if it was not there, and its parent can collapse to zero height if it contained only that child. A <code>relative</code> element keeps its original slot even when shifted.</p>
    <p><b>Overlapping and z-index.</b> Positioned elements are painted on top of non-positioned ones. If two overlap, the later one in the HTML is on top, unless you set <code>z-index</code> (higher number = closer to you). <code>z-index</code> only works on positioned elements (or flex/grid items).</p>
    <p><b>Handy recipes:</b></p>
    <pre>.badge   { position: absolute; top: -6px; right: -6px; }        /* in a position: relative parent */
.overlay { position: fixed; inset: 0; background: rgb(0 0 0 / .5); } /* cover the whole screen */
.header  { position: sticky; top: 0; }                               /* sticks to the top while scrolling */</pre>`,
  clues: [
    '"badge/icon in the top-right corner of a card" - relative parent plus absolute child',
    '"my absolutely positioned element is in the wrong place" - which ancestor is its containing block? add <code>position: relative</code> to the intended parent',
    '"navigation should stay visible while scrolling" - fixed or (better) sticky',
    '"sticky is not working" - the parent has <code>overflow: hidden/auto</code>, or no <code>top</code> value, or the parent is as short as the element',
    '"the parent collapsed to zero height" - its only child is absolute/fixed (out of flow)',
    '"modal over the whole page" - <code>position: fixed; inset: 0</code> plus a z-index (or the native <code>&lt;dialog&gt;</code>)'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Find the containing block (runnable)', code: R`
// Build a tiny DOM: each element has a name, a position value and a parent.
function el(name, position, parent = null) { return { name, position, parent }; }

const page   = el('html', 'static');
const body   = el('body', 'static', page);
const card   = el('card', 'relative', body);       // positioned: it can anchor absolute children
const inner  = el('inner', 'static', card);        // not positioned: skipped by absolute children
const badge  = el('badge', 'absolute', inner);     // wants to sit in a corner
const menu   = el('menu', 'absolute', body);       // no positioned ancestor except html/body (static)
const bar    = el('bar', 'fixed', inner);          // always the viewport
const normal = el('normal', 'static', inner);

// Which box are top/right/bottom/left measured against?
function containingBlock(e) {
  if (e.position === 'fixed') return 'the viewport';
  if (e.position === 'absolute') {
    // walk up: the first ancestor whose position is NOT static wins
    for (let p = e.parent; p; p = p.parent) if (p.position !== 'static') return p.name;
    return 'the initial containing block (the page)';
  }
  // static / relative / sticky boxes are laid out inside their parent's content box
  return e.parent ? e.parent.name + ' (content box)' : 'the initial containing block';
}

for (const e of [badge, menu, bar, normal, card]) {
  console.log(e.name.padEnd(7), e.position.padEnd(9), '->', containingBlock(e));
}
// badge  absolute  -> card            (skips "inner" because it is static)
// menu   absolute  -> the initial containing block (the page)
// bar    fixed     -> the viewport
`
    },
    {
      lang: 'css', title: 'Common positioning patterns', code: `.card   { position: relative; }                       /* anchor, no offsets */
.badge  { position: absolute; top: -8px; right: -8px; }/* corner of the nearest positioned ancestor */

.center { position: absolute; inset: 0; margin: auto; width: 200px; height: 100px; } /* centred in its anchor */

.chat   { position: fixed; right: 16px; bottom: 16px; z-index: 50; }  /* floats above the page */

.table-head th { position: sticky; top: 0; background: white; }       /* header stays while the body scrolls */

.nudge  { position: relative; top: 2px; left: 4px; }  /* moves visually, still reserves its original box */`
    }
  ],
  codeTitle: ['Find the containing block', 'Common positioning patterns'],
  viz: [
    {
      title: 'Where does the box go? static / relative / absolute / fixed',
      input: 'absolute top:1 left:4',
      inputLabel: 'mode top:N left:N [anc:relative|static]  (N from 0 to 5)',
      gen: function (input) {
        var t = String(input || '').trim().toLowerCase().split(/\s+/);
        var mode = t[0];
        if (['static', 'relative', 'absolute', 'fixed'].indexOf(mode) < 0) throw new Error('Start with static, relative, absolute or fixed. Example: absolute top:1 left:4 anc:static');
        var top = 0, left = 0, anc = 'relative';
        t.slice(1).forEach(function (x) {
          var m = /^(top|left|anc):(.+)$/.exec(x);
          if (!m) throw new Error('Unknown option "' + x + '". Use top:N left:N anc:relative|static');
          if (m[1] === 'anc') { if (m[2] !== 'relative' && m[2] !== 'static') throw new Error('anc must be relative or static'); anc = m[2]; }
          else { var n = Number(m[2]); if (!(n >= 0 && n <= 5) || n % 1) throw new Error(m[1] + ' must be a whole number from 0 to 5'); if (m[1] === 'top') top = n; else left = n; }
        });
        var R_ = 8, C_ = 10;
        function draw(scroll, bPos, cRow, ghost) {
          var g = [];
          for (var r = 0; r < R_; r++) { g.push([]); for (var c = 0; c < C_; c++) g[r].push({ t: '', k: '' }); }
          function set(r, c, tx, k) { if (r >= 0 && r < R_ && c >= 0 && c < C_) g[r][c] = { t: tx, k: k }; }
          var cs = bPos && bPos.fixed ? 0 : scroll;
          for (var r2 = 1; r2 <= 6; r2++) for (var c2 = 1; c2 <= 8; c2++) set(r2 - scroll, c2, '', 'win');          // container area (blue)
          for (var i = 1; i <= 4; i++) set(1 - scroll, i, 'A', 'ok');                                              // A in flow
          if (ghost) for (var j = 1; j <= 4; j++) set(2 - scroll, j, 'b?', 'done');                                // B's reserved slot
          for (var k = 1; k <= 4; k++) set(cRow - scroll, k, 'C', 'ok');                                           // C
          if (bPos) for (var q = 0; q < 4; q++) set(bPos.r - (bPos.fixed ? 0 : scroll), bPos.c + q, 'B', 'cur');   // B on top
          var hl = {}, rows = g.map(function (row, ri) { return row.map(function (cell, ci) { if (cell.k) hl[ri + ',' + ci] = cell.k; return cell.t; }); });
          return { type: 'grid', label: 'Page (' + R_ + ' rows x ' + C_ + ' cols). Blue = container, green = A and C, amber = B', rows: rows, colHead: rows[0].map(function (_, i) { return i; }), rowHead: rows.map(function (_, i) { return 'row ' + i; }), hl: hl };
        }
        var origin = anc === 'relative' ? [1, 1] : [0, 0];
        var b, cRow = 3, ghost = false, info, why;
        if (mode === 'static') { b = { r: 2, c: 1 }; why = '<code>position: static</code> is the default: the offsets <code>top/left</code> are <b>ignored</b>. B stays exactly in normal flow.'; info = ['yes', 'ignored', 'no']; }
        else if (mode === 'relative') { b = { r: 2 + top, c: 1 + left }; ghost = true; why = '<code>relative</code>: B is moved by top:' + top + ' / left:' + left + ' <b>from its own normal position</b> (row 2, col 1). Its old slot (faded b?) stays reserved, so C does not move up.'; info = ['yes (space kept)', 'its own normal position', 'no']; }
        else if (mode === 'absolute') { b = { r: origin[0] + top, c: origin[1] + left }; cRow = 2; why = '<code>absolute</code>: B leaves normal flow, so C moves up into its place. B is measured from the <b>nearest positioned ancestor</b>: ' + (anc === 'relative' ? 'the container (position: relative) whose corner is at row 1, col 1' : 'the container is NOT positioned, so it uses the page corner (row 0, col 0)') + '. B lands at row ' + b.r + ', col ' + b.c + '.'; info = ['no', anc === 'relative' ? 'the container' : 'the page (initial containing block)', 'yes, C moved up']; }
        else { b = { r: top, c: left, fixed: true }; cRow = 2; why = '<code>fixed</code>: B leaves normal flow (C moves up) and is measured from the <b>viewport</b> (the window). Row ' + top + ', col ' + left + ' of the screen, regardless of the container.'; info = ['no', 'the viewport', 'yes, C moved up']; }
        var frames = [];
        frames.push({ narr: 'Three boxes <b>A, B, C</b> stack in normal flow inside a container (blue). We will give <b>B</b> a <code>position</code> and offsets and watch what happens. First, nothing is positioned.', parts: [draw(0, { r: 2, c: 1 }, 3, false)] });
        frames.push({ narr: 'Now B gets <code>position: ' + mode + '; top: ' + top + '; left: ' + left + '</code>. ' + why, parts: [draw(0, b, cRow, ghost)] });
        frames.push({
          narr: 'What this means for the neighbours: B ' + (info[0].indexOf('yes') === 0 ? 'still takes space in the flow' : 'no longer takes any space') + ', and its offsets are measured from <b>' + info[1] + '</b>.',
          parts: [{ type: 'table', label: 'Positioning facts', columns: ['Question', 'Answer'], rows: [['B still reserves its space?', info[0]], ['Offsets measured from', info[1]], ['Did C move?', info[2]]], hl: { 1: 'sel' } }]
        });
        frames.push({ narr: 'Scroll test: the page scrolls down by 2 rows. Everything moves up 2 rows' + (mode === 'fixed' ? ' <b>except B</b>, which is fixed to the viewport and stays at the same screen position' : ' - B scrolls along with the page') + '.', parts: [draw(2, b, cRow, ghost)] });
        frames.push({ narr: 'Remember: <b>relative</b> keeps its space and anchors children; <b>absolute</b> leaves the flow and uses the nearest positioned ancestor; <b>fixed</b> uses the viewport and ignores scrolling; <b>sticky</b> (next visualizer) is a hybrid. Offsets do nothing on <b>static</b>.', parts: [{ type: 'text', html: '<b>Try:</b> <code>relative top:1 left:2</code>, <code>absolute top:0 left:0 anc:static</code>, <code>fixed top:0 left:5</code>' }] });
        return frames;
      }
    },
    {
      title: 'position: sticky while scrolling',
      input: 'top:1',
      inputLabel: 'sticky offset (top:0 to top:3)',
      gen: function (input) {
        var m = /^top:\s*(\d)$/.exec(String(input || '').trim().toLowerCase());
        if (!m || Number(m[1]) > 3) throw new Error('Format: top:1  (a whole number 0 to 3)');
        var top = Number(m[1]), natural = 3, parentStart = 2, parentEnd = 9, V = 7;
        var frames = [];
        [0, 2, 4, 7, 8, 9, 10].forEach(function (s, idx) {
          var doc = Math.min(Math.max(natural, s + top), parentEnd);
          var screen = doc - s;
          var stuck = doc > natural && doc < parentEnd + 0 || (doc === parentEnd && s + top >= parentEnd);
          var rows = [], hl = {};
          for (var r = 0; r < V; r++) {
            var d = r + s;
            var inParent = d >= parentStart && d <= parentEnd;
            rows.push([r === screen ? 'STICKY' : (inParent ? 'section content' : 'other page')]);
            hl[r + ',0'] = r === screen ? 'cur' : (inParent ? 'win' : 'done');
          }
          var state = s + top <= natural ? 'natural position (not yet touching top:' + top + ')' : (s + top < parentEnd ? 'STUCK at top:' + top + ' of the screen' : 'pushed up: it can never leave its parent');
          frames.push({
            narr: 'Page scrolled <b>' + s + '</b> row(s). The element\'s natural place is document row ' + natural + ', which would be screen row ' + (natural - s) + '. With <code>top: ' + top + '</code> it acts like ' + (s + top <= natural ? '<b>relative</b> (normal place)' : '<b>fixed</b> at screen row ' + top) + ' - ' + state + '.' + (screen < 0 ? ' It is now scrolled off the screen.' : ''),
            parts: [
              { type: 'grid', label: 'Viewport (7 rows). Blue = the sticky element\'s parent section', rows: rows, colHead: ['screen'], rowHead: rows.map(function (_, i) { return 'row ' + i; }), hl: hl },
              { type: 'vars', label: 'Numbers', vals: { scrollY: s, 'natural screen row': natural - s, 'sticky screen row': screen }, hl: { 'sticky screen row': s + top > natural ? 'ok' : 'cur' } }
            ]
          });
        });
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'Notification badge on an icon (the golden pair)',
      html: `<p>Goal: a red "3" circle in the top-right corner of a bell icon.</p>
        ${H.table(['Step', 'CSS', 'Why'], [
          ['1', '<code>.bell { position: relative; }</code>', 'the icon becomes the anchor (no offsets, nothing moves)'],
          ['2', '<code>.badge { position: absolute; top: -6px; right: -6px; }</code>', 'measured from the bell\'s corner; negative values poke outside']
        ])}
        <p>Skip step 1 and the badge jumps to the corner of the nearest positioned ancestor - often the whole page.</p>`,
      code: { lang: 'css', code: `.bell  { position: relative; display: inline-block; }\n.badge { position: absolute; top: -6px; right: -6px; min-width: 18px; border-radius: 999px; background: crimson; color: #fff; font-size: 12px; text-align: center; }` }
    },
    {
      title: 'Centering an absolute element',
      html: `<p>Two reliable ways inside a <code>position: relative</code> parent:</p>
        ${H.table(['Technique', 'CSS', 'Needs known size?'], [
          ['inset + auto margins', '<code>inset: 0; margin: auto; width: 200px; height: 100px</code>', 'yes'],
          ['translate trick', '<code>top: 50%; left: 50%; transform: translate(-50%, -50%)</code>', 'no']
        ])}
        <p>Today, for most centring needs prefer <code>display: grid; place-items: center</code> on the parent (next module), and keep absolute for overlays.</p>`
    },
    {
      title: 'Why sticky does nothing: the three usual causes',
      html: `<ol><li><b>No offset.</b> <code>position: sticky</code> alone does nothing; you need <code>top: 0</code> (or another side).</li>
        <li><b>A parent clips.</b> If any ancestor between the element and the scrolling container has <code>overflow: hidden/auto/scroll</code>, that ancestor becomes the scroller, and the element sticks to <i>it</i> (which does not scroll).</li>
        <li><b>The parent is too short.</b> A sticky element can never leave its parent. If the parent is only as tall as the element there is no room to stick.</li></ol>`,
      code: { lang: 'css', code: `.toc { position: sticky; top: 1rem; align-self: start; }  /* align-self: start in a grid/flex row so the item is not stretched to the parent's full height */` }
    },
    {
      title: 'relative moves the picture, not the space',
      html: `<p>Two paragraphs, the first with <code>position: relative; top: 20px</code>:</p>
        ${H.table(['', 'First paragraph', 'Second paragraph'], [
          ['Without relative', 'y = 0', 'y = 40 (below the first)'],
          ['With top:20px', 'y = 20 (drawn lower, overlapping the second)', 'y = 40 - <b>does not move</b>']
        ])}
        <p>That is the proof that relative "reserves the original slot". Use <code>transform: translate()</code> for the same visual effect with better animation performance.</p>`
    }
  ],
  deepDive: `<p><b>The containing block.</b> Offsets and percentages of a positioned box resolve against its <i>containing block</i>. For <code>static</code>/<code>relative</code>/<code>sticky</code> that is the content box of the nearest block-level ancestor. For <code>absolute</code> it is the <b>padding box</b> of the nearest ancestor that is positioned <i>or</i> has <code>transform</code>, <code>filter</code>, <code>perspective</code>, <code>contain: paint</code> or <code>will-change: transform</code> - a famous surprise: adding <code>transform</code> to a parent suddenly "traps" a <code>fixed</code> child inside it. For <code>fixed</code> it is the viewport (unless such a transformed ancestor exists). With no positioned ancestor it is the <b>initial containing block</b>, a viewport-sized box anchored at the page origin.</p>
    <p><b>Stacking.</b> Painting order inside one stacking context: backgrounds and borders, negative z-index, in-flow blocks, floats, inline content, <code>z-index: auto/0</code> positioned elements in DOM order, then positive z-index. A <b>stacking context</b> is created by the root, positioned elements with a z-index other than auto, <code>opacity &lt; 1</code>, <code>transform</code>, <code>filter</code>, flex/grid items with z-index, and more. A child can never escape its parent's stacking context, which is why <code>z-index: 9999</code> sometimes "doesn't work". The next module (CSS Layout Mastery) explores this in depth; for now remember to keep z-index values in a small scale (like 10, 20, 30) held in variables.</p>
    <p><b>Sticky internals.</b> Sticky is computed per frame on the compositor in modern browsers: the element is offset so that it stays within the "sticky view rectangle" (the nearest scrollport minus the inset values), clamped to its containing block. That is why it is smoother than JavaScript scroll listeners. Only the nearest scrolling ancestor counts.</p>
    <p><b>Modern alternatives.</b> Much of what absolute positioning used to do now has better tools: flex/grid for alignment, <code>place-items</code> for centring, the Popover API and <code>&lt;dialog&gt;</code> for top-layer overlays (no z-index fights), and <b>CSS anchor positioning</b> (<code>anchor-name</code>, <code>position-anchor</code>, <code>anchor()</code>) for tooltips and menus that follow their trigger and flip when they hit the screen edge. Use absolute positioning when the element is truly decorative or needs to overlap.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants will happily generate a floating action button, a sticky header or a tooltip in one prompt. The code usually works in the demo and breaks in your app because of an unexpected containing block, an ancestor with <code>overflow: hidden</code>, or a competing z-index.</p>
    <p><b>Use AI as a partner:</b> when something lands in the wrong place, paste the HTML tree and ask <code>For the element .tooltip, list each ancestor and its position/transform/overflow values, then tell me its containing block and why it is positioned there.</code> Then confirm in DevTools (the Layout and Computed panels and the "offset parent" via <code>el.offsetParent</code> in the console).</p>
    <p><b>Where AI goes wrong:</b> it sprinkles <code>position: absolute</code> to "fix" alignment problems that flexbox solves, forgets to make the parent <code>relative</code>, uses <code>fixed</code> inside transformed parents, and escalates z-index to absurd numbers.</p>
    <p><b>What you must still own:</b> a quick mental map of which ancestor anchors each positioned element, the knowledge that absolute removes an element from the flow, and a bias toward flex/grid, top-layer and anchor positioning over hand-measured offsets.</p>`,
  problems: [{
    title: 'Find the Containing Block',
    level: 'Easy', tags: ['css', 'positioning', 'tree'], companies: ['Meta', 'Atlassian', 'Zomato'],
    lang: 'js',
    statement: `<p>Elements form a tree. Each is <code>{ name, position, parent }</code> where <code>parent</code> is the name of the parent element (or <code>null</code> for the root) and <code>position</code> is one of <code>static, relative, absolute, fixed, sticky</code>. Write <code>containingBlock(elements, name)</code> returning the name of the element whose box the target's offsets are measured against. Return <code>"viewport"</code> for a <code>fixed</code> element and <code>"page"</code> when an <code>absolute</code> element has no positioned ancestor. For static, relative and sticky elements return the name of the parent (or <code>"page"</code> for the root).</p>`,
    constraints: `1 ≤ elements.length ≤ 10<sup>4</sup>; names are unique; the tree is valid (no cycles). Ignore transform, filter and other properties that also create containing blocks.`,
    example: `<p>html (static) &gt; body (static) &gt; card (relative) &gt; inner (static) &gt; badge (absolute)</p>
      ${H.table(['Query', 'Answer', 'Why'], [
        ['badge', '<code>"card"</code>', 'inner is static so it is skipped; card is positioned'],
        ['card', '<code>"body"</code>', 'relative boxes are laid out in the parent'],
        ['bar (fixed)', '<code>"viewport"</code>', 'fixed ignores ancestors']
      ])}`,
    brute: {
      why: `<p>The tempting answer is "an absolute element is positioned against its parent". That is only true when the parent happens to be positioned. Walking only one level up gives the wrong anchor whenever an unpositioned wrapper sits in between - the exact bug that sends badges to the corner of the page.</p>`,
      code: { lang: 'js', run: true, code: R`
// WRONG: always answers "the parent"
function containingBlockWrong(elements, name) {
  const e = elements.find(x => x.name === name);
  return e.parent || 'page';
}
const els = [
  { name: 'body', position: 'static', parent: null },
  { name: 'card', position: 'relative', parent: 'body' },
  { name: 'inner', position: 'static', parent: 'card' },
  { name: 'badge', position: 'absolute', parent: 'inner' }
];
console.log(containingBlockWrong(els, 'badge')); // "inner" - but inner is not positioned, the answer should be "card"
` }
    },
    mcq: { q: 'A badge is <code>position: absolute; top: 0; right: 0</code>. Its parent has no position set; the grandparent <code>.card</code> has <code>position: relative</code>. Where does the badge sit?', options: ['In the top-right corner of its parent', 'In the top-right corner of .card', 'In the top-right corner of the browser window', 'It stays in normal flow'], answer: 1, explain: 'Absolute positioning looks for the nearest ancestor that is positioned (not static). The parent is static and is skipped; .card is relative, so it is the containing block.' },
    hints: [
      `<p>Hint 1: the answer depends only on the target's own <code>position</code>. Decide the easy cases first: fixed, then the non-absolute ones.</p>`,
      `<p>Hint 2: for <code>absolute</code>, climb the parent chain until you meet an element whose position is not <code>static</code>. Build a map name &rarr; element so each step is O(1).</p>`,
      `<p>Hint 3: the climb starts at the target's <b>parent</b> (not the target itself), and if you run out of ancestors return <code>"page"</code>. Sticky counts as positioned (it is not static).</p>`
    ],
    solution: {
      approach: `<p>Index the elements by name. Fixed returns <code>"viewport"</code>. Static, relative and sticky return their parent (or page). Absolute walks up the ancestors and returns the first one whose position is not static, falling back to <code>"page"</code>.</p>`,
      code: { lang: 'js', run: true, code: R`
function containingBlock(elements, name) {
  const byName = new Map(elements.map(e => [e.name, e]));
  const target = byName.get(name);

  if (target.position === 'fixed') return 'viewport';
  if (target.position !== 'absolute') return target.parent || 'page';

  // absolute: climb until a positioned ancestor is found
  let p = target.parent ? byName.get(target.parent) : null;
  while (p) {
    if (p.position !== 'static') return p.name;   // relative, absolute, fixed or sticky ancestors all anchor
    p = p.parent ? byName.get(p.parent) : null;
  }
  return 'page';
}

const els = [
  { name: 'html', position: 'static', parent: null },
  { name: 'body', position: 'static', parent: 'html' },
  { name: 'card', position: 'relative', parent: 'body' },
  { name: 'inner', position: 'static', parent: 'card' },
  { name: 'badge', position: 'absolute', parent: 'inner' },
  { name: 'menu', position: 'absolute', parent: 'body' },
  { name: 'bar', position: 'fixed', parent: 'inner' }
];
console.log(containingBlock(els, 'badge')); // card
console.log(containingBlock(els, 'menu'));  // page
console.log(containingBlock(els, 'bar'));   // viewport
console.log(containingBlock(els, 'card'));  // body
` },
      complexity: `<p>Time O(n) to build the map plus O(depth) per query; space O(n).</p>`,
      followUps: ['Treat <code>transform</code> and <code>filter</code> on an ancestor as creating a containing block, even for fixed elements.', 'Compute the final (x, y) page coordinates of an absolute element given its offsets.', 'Detect elements whose absolute child would escape to the page because no ancestor is positioned.']
    }
  }]
});

/* =====================================================================
   PRACTICE - EASY
   ===================================================================== */
practice.push({
  title: 'Order Rules From Weakest to Strongest',
  level: 'Easy', tags: ['css', 'specificity', 'sorting'], companies: ['Atlassian', 'Shopify'], lang: 'js',
  statement: `<p>You get an array of simple selectors (ids, classes, attributes, pseudo-classes, types, combinators; no <code>:is/:not/:where</code>) in the order they appear in a stylesheet. Return the selectors sorted from <b>weakest to strongest</b>, i.e. in the order they "beat" each other, so the last one in your result wins a conflict. When two selectors have the same specificity, the one that appears <b>later</b> in the input is the stronger one.</p>`,
  constraints: `1 ≤ n ≤ 1000, each selector ≤ 80 characters.`,
  example: `<p>Input: <code>["#a", "p", ".x.y", ".z", "div p"]</code></p>
    ${H.table(['Selector', 'Score'], [['<code>p</code>', '(0,0,1)'], ['<code>div p</code>', '(0,0,2)'], ['<code>.z</code>', '(0,1,0)'], ['<code>.x.y</code>', '(0,2,0)'], ['<code>#a</code>', '(1,0,0)']])}
    <p>Output: <code>["p", "div p", ".z", ".x.y", "#a"]</code>.</p>`,
  brute: {
    why: `<p>Sorting by selector <b>string length</b> or by the count of dots looks tempting ("longer = more specific") but <code>#a</code> is stronger than <code>.a.b.c.d</code>, and <code>div p</code> is longer than <code>.z</code> yet weaker. The wasted idea is a single-number guess instead of comparing the three counters in order.</p>`,
    code: { lang: 'js', run: true, code: R`
// WRONG: length as a proxy for specificity
const sortWrong = sels => [...sels].sort((a, b) => a.length - b.length);
console.log(sortWrong(['#a', 'div p', '.z'])); // [ '#a', '.z', 'div p' ] - the id is not weakest!
` }
  },
  mcq: { q: 'Two selectors have the same (a,b,c). Which one wins?', options: ['The one that appears earlier', 'The one that appears later in the stylesheet', 'The shorter selector', 'The browser picks randomly'], answer: 1, explain: 'After specificity ties, source order decides: the last declaration wins.' },
  hints: [
    `<p>Hint 1: compute a score for each selector and sort by it. The score is three numbers compared left to right.</p>`,
    `<p>Hint 2: count ids, then classes/attributes/pseudo-classes, then types. Use JavaScript's <code>sort</code> with a comparator that compares the counters in order and falls back to the original index.</p>`,
    `<p>Hint 3: remove pseudo-elements and attributes before counting colons and dots so nothing is counted twice. Remember <code>Array.prototype.sort</code> is stable in modern engines, but an explicit index tie-break is clearer.</p>`
  ],
  solution: {
    approach: `<p>Score each selector once (strip tokens in a fixed order), attach the original index, sort by <code>a</code>, then <code>b</code>, then <code>c</code>, then index. Return the selectors only.</p>`,
    code: { lang: 'js', run: true, code: R`
function score(sel) {
  let s = sel, a = 0, b = 0, c = 0;
  s = s.replace(/\[[^\]]*\]/g, () => { b++; return ''; });
  s = s.replace(/::[\w-]+/g, () => { c++; return ''; });
  s = s.replace(/#[\w-]+/g, () => { a++; return ''; });
  s = s.replace(/\.[\w-]+/g, () => { b++; return ''; });
  s = s.replace(/:[\w-]+(\([^)]*\))?/g, () => { b++; return ''; });
  for (const t of s.split(/[\s>+~]+/)) if (/^[a-zA-Z]/.test(t)) c++;
  return [a, b, c];
}

function weakestToStrongest(selectors) {
  return selectors
    .map((sel, index) => ({ sel, index, s: score(sel) }))
    .sort((x, y) => x.s[0] - y.s[0] || x.s[1] - y.s[1] || x.s[2] - y.s[2] || x.index - y.index)
    .map(o => o.sel);
}

console.log(weakestToStrongest(['#a', 'p', '.x.y', '.z', 'div p']));  // [ 'p', 'div p', '.z', '.x.y', '#a' ]
console.log(weakestToStrongest(['.a', '.b', 'p']));                    // [ 'p', '.a', '.b' ]  (tie: later is stronger)
` },
    complexity: `<p>Time O(n log n + total characters), space O(n).</p>`,
    followUps: ['Return, for every selector, which selectors it beats.', 'Handle <code>:is()</code> and <code>:where()</code>.', 'Show how <code>@layer</code> changes the ordering.']
  }
});

practice.push({
  title: 'What Width Do I Write for a Target Box?',
  level: 'Easy', tags: ['css', 'box model', 'arithmetic'], companies: ['Shopify', 'Flipkart'], lang: 'js',
  statement: `<p>The designer wants the element's <b>painted width</b> (content + padding + border) to be exactly <code>target</code> px. Write <code>widthToWrite(target, padding, border, boxSizing)</code> returning the value to put in the CSS <code>width</code> property. <code>padding</code> and <code>border</code> are the total left+right thickness in px. If it is impossible (padding and border alone exceed the target), return <code>null</code>.</p>`,
  constraints: `0 ≤ target, padding, border ≤ 10<sup>4</sup>. boxSizing is "content-box" or "border-box".`,
  example: `${H.table(['Input', 'Output', 'Why'], [
    ['<code>400, 40, 10, "content-box"</code>', '<code>350</code>', 'content 350 + 40 + 10 = 400'],
    ['<code>400, 40, 10, "border-box"</code>', '<code>400</code>', 'width already includes padding and border'],
    ['<code>30, 40, 10, "content-box"</code>', '<code>null</code>', 'extras (50) are bigger than the target']
  ])}`,
  brute: {
    why: `<p>Returning <code>target</code> unchanged is right only for <code>border-box</code>. For <code>content-box</code> it makes the element wider than the design by the padding and border - the classic "my box is 50px too wide" bug.</p>`,
    code: { lang: 'js', run: true, code: R`
// WRONG for content-box: forgets that padding and border are added on top
const widthWrong = (target) => target;
console.log(widthWrong(400)); // with 40px padding + 10px border and content-box the box paints 450px wide
` }
  },
  mcq: { q: 'Under <code>content-box</code>, what does <code>width</code> describe?', options: ['Content + padding + border', 'Content only', 'Content + padding', 'The margin box'], answer: 1, explain: 'content-box: width/height set the content area only; padding and border are added around it.' },
  hints: [
    `<p>Hint 1: the answer depends on which layers <code>width</code> includes.</p>`,
    `<p>Hint 2: <code>extras = padding + border</code>. content-box: subtract the extras from the target; border-box: the target itself.</p>`,
    `<p>Hint 3: check the impossible case first - if <code>extras &gt; target</code> the content would need a negative width, so return <code>null</code>.</p>`
  ],
  solution: {
    approach: `<p>Compute the extras once. If they exceed the target return null. Otherwise return <code>target - extras</code> for content-box or <code>target</code> for border-box.</p>`,
    code: { lang: 'js', run: true, code: R`
function widthToWrite(target, padding, border, boxSizing) {
  const extras = padding + border;
  if (extras > target) return null;                       // cannot fit padding + border at all
  return boxSizing === 'border-box' ? target : target - extras;
}
console.log(widthToWrite(400, 40, 10, 'content-box')); // 350
console.log(widthToWrite(400, 40, 10, 'border-box'));  // 400
console.log(widthToWrite(30, 40, 10, 'content-box'));  // null
` },
    complexity: `<p>Time O(1), space O(1).</p>`,
    followUps: ['Do the same for heights.', 'Return the percentage width for a column in a row of known width.', 'What changes if the border is 0 and padding uses percentages?']
  }
});

practice.push({
  title: 'px and rem Converter',
  level: 'Easy', tags: ['css', 'units', 'string parsing'], companies: ['Flipkart', 'Swiggy'], lang: 'js',
  statement: `<p>Write <code>convert(value, rootPx)</code>. If <code>value</code> is a string like <code>"24px"</code> return the equivalent in rem as a string (<code>"1.5rem"</code>). If it ends in <code>rem</code> (like <code>"0.75rem"</code>) return the px string (<code>"12px"</code>). Trim trailing zeros (<code>"1.5rem"</code>, not <code>"1.50rem"</code>) and round to at most 4 decimals. Throw an Error for any other unit.</p>`,
  constraints: `0 ≤ number ≤ 10<sup>5</sup>, rootPx &gt; 0 (usually 16).`,
  example: `${H.table(['Input', 'Output'], [
    ['<code>convert("24px", 16)</code>', '<code>"1.5rem"</code>'],
    ['<code>convert("0.75rem", 16)</code>', '<code>"12px"</code>'],
    ['<code>convert("10px", 16)</code>', '<code>"0.625rem"</code>'],
    ['<code>convert("1em", 16)</code>', 'throws - em depends on context']
  ])}`,
  brute: {
    why: `<p>A common slip is dividing when you should multiply (or the reverse), or hard-coding 16 so the function breaks on projects that set a different root size. A second slip is leaving floating-point noise like <code>0.30000000000000004</code>.</p>`,
    code: { lang: 'js', run: true, code: R`
// WRONG: always divides by 16 and shows float noise
function convertWrong(v) { return parseFloat(v) / 16 + 'rem'; }
console.log(convertWrong('0.75rem')); // "0.046875rem" - should have gone rem -> px
console.log(0.1 * 3);                 // 0.30000000000000004 - float noise to round away
` }
  },
  mcq: { q: 'With a 16px root, what is <code>10px</code> in rem?', options: ['1.6rem', '0.625rem', '0.16rem', '6.25rem'], answer: 1, explain: '10 / 16 = 0.625. Divide px by the root size to get rem.' },
  hints: [
    `<p>Hint 1: split the string into a number and a unit with a regex.</p>`,
    `<p>Hint 2: px &rarr; rem divides by the root size; rem &rarr; px multiplies by it.</p>`,
    `<p>Hint 3: round with <code>Math.round(x * 10000) / 10000</code> and let <code>String(number)</code> drop trailing zeros automatically. Throw for other units.</p>`
  ],
  solution: {
    approach: `<p>Parse with <code>/^(-?\\d*\\.?\\d+)(px|rem)$/</code>. Convert depending on the unit, round to 4 decimals and append the new unit.</p>`,
    code: { lang: 'js', run: true, code: R`
function convert(value, rootPx) {
  const m = /^(-?\d*\.?\d+)(px|rem)$/.exec(String(value).trim());
  if (!m) throw new Error('Unsupported value: ' + value);
  const n = parseFloat(m[1]);
  const round = x => Math.round(x * 10000) / 10000;       // at most 4 decimals, no trailing zeros
  return m[2] === 'px' ? round(n / rootPx) + 'rem' : round(n * rootPx) + 'px';
}
console.log(convert('24px', 16));     // 1.5rem
console.log(convert('0.75rem', 16));  // 12px
console.log(convert('10px', 16));     // 0.625rem
console.log(convert('20px', 10));     // 2rem  (root of 10px)
try { convert('1em', 16); } catch (e) { console.log('error:', e.message); }
` },
    complexity: `<p>Time O(1), space O(1).</p>`,
    followUps: ['Convert a whole stylesheet string, replacing every px value.', 'Why is it risky to convert border widths (1px) to rem?', 'Support <code>em</code> with a given parent size.']
  }
});

practice.push({
  title: 'Hex Colour to rgb() / rgba()',
  level: 'Easy', tags: ['css', 'colour', 'parsing'], companies: ['Adobe', 'Canva'], lang: 'js',
  statement: `<p>Write <code>hexToRgb(hex)</code> accepting <code>#rgb</code>, <code>#rrggbb</code> and <code>#rrggbbaa</code> (case-insensitive, # required). Return <code>"rgb(r, g, b)"</code> for the first two forms and <code>"rgba(r, g, b, a)"</code> for the eight-digit form, where <code>a</code> is the alpha byte divided by 255 rounded to 2 decimals. Throw an Error for invalid input.</p>`,
  constraints: `Input length ≤ 9.`,
  example: `${H.table(['Input', 'Output', 'Why'], [
    ['<code>"#3366cc"</code>', '<code>"rgb(51, 102, 204)"</code>', '33=51, 66=102, cc=204'],
    ['<code>"#f80"</code>', '<code>"rgb(255, 136, 0)"</code>', 'each digit doubled: ff 88 00'],
    ['<code>"#00000080"</code>', '<code>"rgba(0, 0, 0, 0.5)"</code>', '0x80 = 128 and 128/255 = 0.50']
  ])}`,
  brute: {
    why: `<p>Parsing each character separately (<code>parseInt('3', 16)</code>, <code>parseInt('3', 16)</code>) and forgetting to combine the two digits of a pair, or forgetting to expand the 3-digit shorthand, gives wrong channel values. The fix is to normalise first, then slice in pairs.</p>`,
    code: { lang: 'js', run: true, code: R`
// WRONG: treats every hex digit as its own channel value
function hexWrong(hex) {
  const d = hex.slice(1).split('').map(c => parseInt(c, 16));
  return 'rgb(' + d.slice(0, 3).join(', ') + ')';
}
console.log(hexWrong('#3366cc')); // rgb(3, 3, 6) - wrong
` }
  },
  mcq: { q: 'What does the shorthand <code>#fc0</code> expand to?', options: ['#fc0000', '#ffcc00', '#f0c000', '#ffc000'], answer: 1, explain: 'Each digit is doubled: f becomes ff, c becomes cc, 0 becomes 00.' },
  hints: [
    `<p>Hint 1: a channel is <b>two</b> hex digits. Convert each pair with <code>parseInt(pair, 16)</code>.</p>`,
    `<p>Hint 2: first validate with a regex and expand the 3-digit form by doubling each character.</p>`,
    `<p>Hint 3: for the 8-digit form the last pair is alpha: <code>a = byte / 255</code> rounded to 2 decimals; format it with <code>String()</code> so 0.5 prints as <code>0.5</code>.</p>`
  ],
  solution: {
    approach: `<p>Validate with <code>/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i</code>, expand the shorthand, slice into pairs, convert and format.</p>`,
    code: { lang: 'js', run: true, code: R`
function hexToRgb(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex);
  if (!m) throw new Error('Invalid colour: ' + hex);
  let h = m[1];
  if (h.length === 3) h = h.replace(/./g, c => c + c);            // #f80 -> ff8800
  const pairs = h.match(/../g).map(p => parseInt(p, 16));          // [r, g, b] or [r, g, b, a]
  if (pairs.length === 3) return 'rgb(' + pairs.join(', ') + ')';
  const alpha = Math.round(pairs[3] / 255 * 100) / 100;
  return 'rgba(' + pairs.slice(0, 3).join(', ') + ', ' + alpha + ')';
}
console.log(hexToRgb('#3366cc'));   // rgb(51, 102, 204)
console.log(hexToRgb('#F80'));      // rgb(255, 136, 0)
console.log(hexToRgb('#00000080')); // rgba(0, 0, 0, 0.5)
try { hexToRgb('#12'); } catch (e) { console.log('error:', e.message); }
` },
    complexity: `<p>Time O(1), space O(1).</p>`,
    followUps: ['Write the reverse: <code>rgbToHex</code> with zero padding.', 'Support <code>#rgba</code> (4 digits).', 'Add <code>rgb()</code> and <code>hsl()</code> string parsing.']
  }
});

/* =====================================================================
   PRACTICE - MEDIUM
   ===================================================================== */
practice.push({
  title: 'Total Height of Stacked Blocks (Margin Collapsing)',
  level: 'Medium', tags: ['css', 'box model', 'margin collapsing', 'simulation'], companies: ['Google', 'Meta'], lang: 'js',
  statement: `<p>Blocks are stacked vertically inside a parent that has padding (so the first and last margins do <b>not</b> escape through the parent). Each block is <code>{ height, mt, mb }</code> (margin-top, margin-bottom, in px, may be negative). Between two adjacent siblings the touching margins <b>collapse</b>: both positive &rarr; the larger; both negative &rarr; the more negative (smallest); mixed &rarr; their sum. Return the total vertical space from the top of the first block's margin to the bottom of the last block's margin: <code>mt[0] + height[0] + gap + height[1] + ... + mb[last]</code>.</p>`,
  constraints: `1 ≤ n ≤ 10<sup>4</sup>, |value| ≤ 10<sup>4</sup>.`,
  example: `<p>Blocks: <code>{h:100, mt:20, mb:30}</code> and <code>{h:50, mt:10, mb:10}</code></p>
    ${H.table(['Part', 'Value'], [['first top margin', '20'], ['block 1', '100'], ['gap = max(30, 10)', H.c('b', '30') + ' (not 40)'], ['block 2', '50'], ['last bottom margin', '10']])}
    <p>Total = 20 + 100 + 30 + 50 + 10 = <b>210</b>.</p>`,
  brute: {
    why: `<p>Adding every margin independently (the way padding behaves) counts the touching margins twice. For the example it would give 20 + 100 + 30 + 10 + 50 + 10 = 220 instead of 210. The wasted idea is treating margins like padding.</p>`,
    code: { lang: 'js', run: true, code: R`
// WRONG: margins just add up
function heightWrong(blocks) {
  return blocks.reduce((s, b) => s + b.mt + b.height + b.mb, 0);
}
console.log(heightWrong([{ height: 100, mt: 20, mb: 30 }, { height: 50, mt: 10, mb: 10 }])); // 220, should be 210
` }
  },
  mcq: { q: 'Two siblings: margin-bottom 30px and margin-top 20px. What is the gap between them?', options: ['50px', '30px', '20px', '10px'], answer: 1, explain: 'Adjacent vertical margins of block siblings collapse to the larger of the two: 30px.' },
  hints: [
    `<p>Hint 1: only the margins that <b>touch</b> collapse: the bottom of block i and the top of block i+1.</p>`,
    `<p>Hint 2: write a tiny <code>gap(a, b)</code> helper: both &ge; 0 &rarr; max, both &le; 0 &rarr; min, otherwise a + b.</p>`,
    `<p>Hint 3: total = first <code>mt</code> + all heights + gaps between neighbours + last <code>mb</code>. Handle n = 1 (no gaps).</p>`
  ],
  solution: {
    approach: `<p>Sum all heights, add the first top margin and the last bottom margin, and for every adjacent pair add the collapsed gap instead of both margins.</p>`,
    code: { lang: 'js', run: true, code: R`
function gap(a, b) {
  if (a >= 0 && b >= 0) return Math.max(a, b);      // both positive: larger wins
  if (a <= 0 && b <= 0) return Math.min(a, b);      // both negative: most negative wins
  return a + b;                                      // mixed: they add
}

function stackHeight(blocks) {
  let total = blocks[0].mt + blocks[blocks.length - 1].mb;
  for (let i = 0; i < blocks.length; i++) {
    total += blocks[i].height;
    if (i + 1 < blocks.length) total += gap(blocks[i].mb, blocks[i + 1].mt);
  }
  return total;
}

console.log(stackHeight([{ height: 100, mt: 20, mb: 30 }, { height: 50, mt: 10, mb: 10 }])); // 210
console.log(stackHeight([{ height: 10, mt: 0, mb: 20 }, { height: 10, mt: -5, mb: 0 }]));    // 35
console.log(stackHeight([{ height: 40, mt: 8, mb: 8 }]));                                     // 56
` },
    complexity: `<p>Time O(n), space O(1).</p>`,
    followUps: ['What if the parent has no padding or border: the first/last margins escape - how does the total change?', 'Make the blocks flex items (no collapsing) and compare.', 'Collapse through an empty block (its own top and bottom margins collapse together).']
  }
});

practice.push({
  title: 'Final Style of an Element (Cascade for Many Properties)',
  level: 'Medium', tags: ['css', 'cascade', 'specificity', 'simulation'], companies: ['Stripe', 'Microsoft'], lang: 'js',
  statement: `<p>Several rules all match one element. Each rule is <code>{ selector, decl }</code> where <code>decl</code> maps a property to a value; a value may end with <code>" !important"</code>. The element may also have an <code>inline</code> object of declarations (same format). Rules are given in source order. Return the element's winning declarations as <code>{ property: value }</code> (strip the <code>!important</code> text). Winner per property: importance first, then inline over selectors, then specificity (a,b,c), then later rule.</p>`,
  constraints: `1 ≤ rules ≤ 500, selectors are simple (ids, classes, attributes, pseudo-classes, types, combinators).`,
  example: `<p>Rules: <code>p {color: black; margin: 0}</code>, <code>.note {color: blue}</code>, <code>#x {margin: 4px !important; color: green}</code>; inline: <code>{color: red}</code></p>
    ${H.table(['Property', 'Winner', 'Why'], [['color', '<code>red</code>', 'inline beats #x (non-important)'], ['margin', '<code>4px</code>', '!important beats the normal margin: 0']])}`,
  brute: {
    why: `<p>Taking "the last rule that mentions the property" (pure source order) ignores both specificity and importance, and processing rule by rule with a plain overwrite means <code>p</code> written after <code>#x</code> would wrongly replace the id's colour. You need to compare candidates, not overwrite blindly.</p>`,
    code: { lang: 'js', run: true, code: R`
// WRONG: last mention wins
function styleWrong(rules) {
  const out = {};
  for (const r of rules) for (const [k, v] of Object.entries(r.decl)) out[k] = v;
  return out;
}
console.log(styleWrong([{ selector: '#x', decl: { color: 'green' } }, { selector: 'p', decl: { color: 'black' } }])); // black - but #x should win
` }
  },
  mcq: { q: 'An inline style says <code>color: red</code>; a stylesheet says <code>#x { color: green !important }</code>. Which colour is used?', options: ['red', 'green', 'whichever is later', 'the browser blends them'], answer: 1, explain: 'Importance is checked before the inline-versus-selector comparison, so the important declaration wins.' },
  hints: [
    `<p>Hint 1: the contest is per property, so keep a <b>best candidate per property</b> while scanning all declarations.</p>`,
    `<p>Hint 2: give each candidate a key array <code>[important, inline, a, b, c, order]</code> and keep the larger key (compare element by element).</p>`,
    `<p>Hint 3: treat the inline object as extra candidates with <code>inline = 1</code> and specificity 0; strip <code>!important</code> only when storing the final value. Source order is the index of the rule (inline gets a large order, it never matters because inline outranks).</p>`
  ],
  solution: {
    approach: `<p>Flatten all declarations into candidates with a comparable key. For each property keep the candidate whose key is greatest (lexicographic). Return the cleaned values.</p>`,
    code: { lang: 'js', run: true, code: R`
function score(sel) {
  let s = sel, a = 0, b = 0, c = 0;
  s = s.replace(/\[[^\]]*\]/g, () => { b++; return ''; });
  s = s.replace(/::[\w-]+/g, () => { c++; return ''; });
  s = s.replace(/#[\w-]+/g, () => { a++; return ''; });
  s = s.replace(/\.[\w-]+/g, () => { b++; return ''; });
  s = s.replace(/:[\w-]+(\([^)]*\))?/g, () => { b++; return ''; });
  for (const t of s.split(/[\s>+~]+/)) if (/^[a-zA-Z]/.test(t)) c++;
  return [a, b, c];
}
const greater = (x, y) => { for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };

function finalStyle(rules, inline = {}) {
  const best = {};  // property -> { key, value }
  const offer = (prop, raw, inl, spec, order) => {
    const important = /\s*!important\s*$/.test(raw);
    const value = raw.replace(/\s*!important\s*$/, '');
    const key = [important ? 1 : 0, inl ? 1 : 0, spec[0], spec[1], spec[2], order];
    if (!best[prop] || greater(key, best[prop].key)) best[prop] = { key, value };
  };
  rules.forEach((r, i) => {
    const spec = score(r.selector);
    for (const [prop, raw] of Object.entries(r.decl)) offer(prop, raw, false, spec, i);
  });
  for (const [prop, raw] of Object.entries(inline)) offer(prop, raw, true, [0, 0, 0], rules.length);
  const out = {};
  for (const prop of Object.keys(best)) out[prop] = best[prop].value;
  return out;
}

const rules = [
  { selector: 'p',     decl: { color: 'black', margin: '0' } },
  { selector: '.note', decl: { color: 'blue' } },
  { selector: '#x',    decl: { margin: '4px !important', color: 'green' } }
];
console.log(finalStyle(rules, { color: 'red' }));   // { color: 'red', margin: '4px' }
console.log(finalStyle(rules));                      // { color: 'green', margin: '4px' }
` },
    complexity: `<p>Time O(total declarations x selector length), space O(number of distinct properties).</p>`,
    followUps: ['Add an <code>@layer</code> rank to each rule.', 'Add inherited properties by merging with the parent\'s final style.', 'Expand shorthands (<code>margin</code>) into longhands before comparing.']
  }
});

practice.push({
  title: 'Fix the Layout Bug: Overflowing Columns and a Runaway Badge',
  level: 'Medium', tags: ['css', 'box model', 'positioning', 'debugging'], companies: ['Shopify', 'Airbnb', 'Atlassian'], lang: 'css',
  statement: `<p>A 900px-wide row contains three product cards. Two bugs are reported: <b>(1)</b> the third card drops to a second line, and <b>(2)</b> the red "Sale" badge, which should sit in the top-right corner of its card, appears in the top-right corner of the whole page. Edit the CSS (shown below) with the <b>smallest possible change</b> to fix both. No HTML changes, no magic numbers, no <code>!important</code>.</p>
    <pre>&lt;div class="row"&gt;
  &lt;div class="card"&gt;&lt;span class="badge"&gt;Sale&lt;/span&gt; ... &lt;/div&gt;
  &lt;div class="card"&gt; ... &lt;/div&gt;
  &lt;div class="card"&gt; ... &lt;/div&gt;
&lt;/div&gt;</pre>`,
  constraints: `Row width is 900px. Each card is declared <code>width: 33.333%</code> with <code>padding: 20px</code> and <code>border: 1px solid</code>. Cards are floated left.`,
  example: `${H.table(['', 'Painted width of one card', 'Three cards', 'Fits 900px?'], [
    ['Bug (content-box)', '300 + 40 + 2 = <b>342px</b>', '1026px', H.c('r', 'no - overflows by 126px')],
    ['Fixed (border-box)', '<b>300px</b>', '900px', H.c('g', 'yes')]
  ])}`,
  brute: {
    why: `<p>Typical "fixes" shrink the widths by hand (<code>width: 29%</code>), which only works for this exact padding and breaks the next time padding changes, and anchor the badge with pixel offsets from the page (<code>top: 380px; left: 240px</code>), which breaks on every screen size. They treat the symptoms, not the two root causes: the box-sizing model and the missing positioned ancestor.</p>`,
    code: { lang: 'css', code: `/* Fragile band-aids */
.card  { float: left; width: 29%; padding: 20px; border: 1px solid #ccc; }  /* magic number */
.badge { position: absolute; top: 380px; left: 240px; }                     /* page-based pixels */` }
  },
  mcq: { q: 'What is the right fix for the badge appearing at the page corner?', options: ['Give the badge a z-index', 'Give the .card position: relative', 'Change the badge to position: fixed', 'Add margin-top to the badge'], answer: 1, explain: 'An absolute element is positioned against the nearest positioned ancestor. Making .card position: relative turns it into that anchor.' },
  hints: [
    `<p>Hint 1: compute the real painted width of a card under the default box model. Is it more than a third of 900?</p>`,
    `<p>Hint 2: one declaration makes padding and border live <i>inside</i> the width. Apply it to all elements so future cards behave too.</p>`,
    `<p>Hint 3: for the badge, ask "against what are my top/right measured?" The answer is the nearest ancestor that is not <code>position: static</code>. Pick the card and give it <code>position: relative</code> (no offsets).</p>`
  ],
  solution: {
    approach: `<p>Root cause 1: <code>content-box</code> adds padding and border to the 33.333% width (342px each). Use <code>box-sizing: border-box</code> (ideally the universal reset). Root cause 2: the badge has no positioned ancestor, so it uses the page; give <code>.card</code> <code>position: relative</code>. The JavaScript alternative below proves the arithmetic.</p>`,
    code: { lang: 'css', code: `/* 1) width now includes padding + border: each card paints exactly 33.333% of the row */
*, *::before, *::after { box-sizing: border-box; }

.card  { float: left; width: 33.333%; padding: 20px; border: 1px solid #ccc;
         position: relative; }                       /* 2) anchor for the absolutely positioned badge */
.badge { position: absolute; top: 8px; right: 8px; }` },
    alt: [{ lang: 'js', run: true, code: R`
// Verify the first bug with arithmetic: does a third card fit in a 900px row?
const row = 900, pct = 33.333, padding = 20, border = 1;
const content = row * pct / 100;
const widths = {
  'content-box': content + 2 * padding + 2 * border,
  'border-box': content
};
for (const [model, w] of Object.entries(widths)) {
  console.log(model.padEnd(12), 'card paints', w.toFixed(1) + 'px; three cards =', (3 * w).toFixed(1) + 'px', 3 * w <= row + 0.5 ? 'fits' : 'OVERFLOWS');
}
` }],
    complexity: `<p>Constant: one declaration (box-sizing) and one positioning change (position: relative).</p>`,
    followUps: ['Rewrite the row with CSS Grid (<code>grid-template-columns: repeat(3, 1fr); gap: 1rem</code>) so no percentage maths is needed.', 'What happens to the badge if a parent of .card has <code>transform</code>?', 'Add a fourth card: what changes in each approach?']
  }
});

practice.push({
  title: 'HSL to RGB',
  level: 'Medium', tags: ['css', 'colour', 'math'], companies: ['Adobe', 'Figma'], lang: 'js',
  statement: `<p>Implement <code>hslToRgb(h, s, l)</code> with <code>h</code> in degrees (0 to 360), <code>s</code> and <code>l</code> in percent (0 to 100). Return <code>[r, g, b]</code> as integers 0 to 255 (rounded). Use the standard algorithm: chroma <code>C = (1 - |2L - 1|) * S</code>, <code>X = C * (1 - |(H/60) mod 2 - 1|)</code>, <code>m = L - C/2</code>; pick (r', g', b') from the 60-degree sector of H and add <code>m</code>.</p>`,
  constraints: `0 ≤ h ≤ 360, 0 ≤ s, l ≤ 100.`,
  example: `${H.table(['Input', 'Output', 'Note'], [
    ['<code>hsl(220, 60%, 50%)</code>', '<code>[51, 102, 204]</code>', '= #3366cc'],
    ['<code>hsl(0, 100%, 50%)</code>', '<code>[255, 0, 0]</code>', 'pure red'],
    ['<code>hsl(120, 50%, 100%)</code>', '<code>[255, 255, 255]</code>', 'lightness 100% is always white']
  ])}`,
  brute: {
    why: `<p>Trying to "interpolate" from the hue alone (for example <code>r = h * 255 / 360</code>) ignores saturation and lightness and maps hue linearly to red, which is not what the colour wheel does. The wheel is piecewise: each 60-degree sector changes only one channel.</p>`,
    code: { lang: 'js', run: true, code: R`
// WRONG: maps hue straight onto one channel
const hslWrong = (h, s, l) => [Math.round(h * 255 / 360), Math.round(s * 2.55), Math.round(l * 2.55)];
console.log(hslWrong(220, 60, 50)); // [156, 153, 127] - nowhere near [51, 102, 204]
` }
  },
  mcq: { q: 'In HSL, what does lightness 0% always give?', options: ['white', 'black', 'a fully saturated colour', 'transparent'], answer: 1, explain: 'Lightness 0% is black and 100% is white regardless of hue and saturation; pure colours live at 50%.' },
  hints: [
    `<p>Hint 1: first compute the colourfulness <code>C</code> (how far the colour is from grey) from lightness and saturation.</p>`,
    `<p>Hint 2: the hue wheel has six sectors of 60 degrees; in each, one channel is at C, one is at 0 and one ramps with <code>X</code>.</p>`,
    `<p>Hint 3: finally add <code>m = L - C/2</code> to all three channels, multiply by 255 and round. Normalise s and l to 0..1 first, and treat h = 360 like h = 0.</p>`
  ],
  solution: {
    approach: `<p>Convert s and l to fractions. Compute C, X, m. Choose the sector with <code>Math.floor(h / 60) % 6</code>, assign (r', g', b'), then shift by m and scale to bytes.</p>`,
    code: { lang: 'js', run: true, code: R`
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const C = (1 - Math.abs(2 * l - 1)) * s;
  const X = C * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - C / 2;
  let r = 0, g = 0, b = 0;
  switch (Math.floor(h / 60) % 6) {
    case 0: [r, g, b] = [C, X, 0]; break;   // red -> yellow
    case 1: [r, g, b] = [X, C, 0]; break;   // yellow -> green
    case 2: [r, g, b] = [0, C, X]; break;   // green -> cyan
    case 3: [r, g, b] = [0, X, C]; break;   // cyan -> blue
    case 4: [r, g, b] = [X, 0, C]; break;   // blue -> magenta
    default: [r, g, b] = [C, 0, X];         // magenta -> red
  }
  return [r, g, b].map(v => Math.round((v + m) * 255));
}
console.log(hslToRgb(220, 60, 50));   // [51, 102, 204]
console.log(hslToRgb(0, 100, 50));    // [255, 0, 0]
console.log(hslToRgb(120, 50, 100));  // [255, 255, 255]
console.log(hslToRgb(360, 100, 50));  // [255, 0, 0]
` },
    complexity: `<p>Time O(1), space O(1).</p>`,
    followUps: ['Write rgbToHsl and check the round trip.', 'Generate a 9-step lightness ramp for one hue and check which steps pass 4.5:1 contrast on white.', 'Why is OKLCH better for generating palettes?']
  }
});

practice.push({
  title: 'Resolve font-size Through a Mixed Unit Chain',
  level: 'Medium', tags: ['css', 'units', 'inheritance', 'em', 'rem'], companies: ['Atlassian', 'Swiggy'], lang: 'js',
  statement: `<p>You get an array <code>chain</code> of declared <code>font-size</code> values, one per nested element, with <code>chain[0]</code> being the <code>html</code> element. A value is a string with unit <code>px</code>, <code>em</code>, <code>rem</code> or <code>%</code>, or <code>null</code> (nothing declared, so it <b>inherits</b> the parent's computed size). The browser default font-size is 16px (used as the "parent" of <code>html</code>). <code>rem</code> refers to the computed size of <code>chain[0]</code>; <code>em</code> and <code>%</code> refer to the parent element's computed size. Return the computed px size of every element as an array (round to 2 decimals).</p>`,
  constraints: `1 ≤ chain.length ≤ 100. Numbers are non-negative.`,
  example: `<p>chain = <code>["62.5%", "1.6rem", "1.5em", null, "120%", "20px", "0.5em"]</code></p>
    ${H.table(['Element', 'Declared', 'Computed'], [
      ['html', '62.5% of 16', '10'],
      ['1', '1.6rem = 1.6 x 10', '16'],
      ['2', '1.5em = 1.5 x 16', '24'],
      ['3', 'null, inherits', '24'],
      ['4', '120% of 24', '28.8'],
      ['5', '20px', '20'],
      ['6', '0.5em of 20', '10']
    ])}`,
  brute: {
    why: `<p>Resolving every em against the <b>root</b> size (treating em like rem) or every rem against the parent mixes up the two reference points. The error shows up only in nested chains, which is why it survives quick tests.</p>`,
    code: { lang: 'js', run: true, code: R`
// WRONG: em resolved against the root (like rem), so nothing compounds
function sizesWrong(chain) {
  const root = 16;
  return chain.map(v => (v === null ? root : v.endsWith('%') ? parseFloat(v) / 100 * root : parseFloat(v) * root));
}
console.log(sizesWrong(['100%', '1.5em', '1.5em'])); // [16, 24, 24] - the third should be 36
` }
  },
  mcq: { q: 'The parent is 20px. A child has <code>font-size: 150%</code>, its child has <code>font-size: 1.5rem</code> and html is 16px. What is the grandchild?', options: ['45px', '36px', '24px', '30px'], answer: 2, explain: 'The grandchild uses rem, which ignores the parent: 1.5 x 16 = 24px.' },
  hints: [
    `<p>Hint 1: computing the sizes needs two reference values at each step: the <b>root</b> computed size and the <b>parent</b> computed size.</p>`,
    `<p>Hint 2: handle <code>html</code> first (its parent is the 16px browser default); then loop through the others keeping the previous element's computed size.</p>`,
    `<p>Hint 3: parse with a regex into number and unit; <code>null</code> means copy the parent; round only when producing the output to avoid drift.</p>`
  ],
  solution: {
    approach: `<p>Walk the chain once. For element i, <code>base = parent computed</code> for em and %, <code>root</code> for rem. Store unrounded values internally and round when returning.</p>`,
    code: { lang: 'js', run: true, code: R`
function resolveSizes(chain) {
  const out = [];
  let root = 16;                                    // browser default, parent of html
  chain.forEach((decl, i) => {
    const parent = i === 0 ? 16 : out[i - 1];
    let size;
    if (decl === null) {
      size = parent;                                // font-size inherits
    } else {
      const m = /^(\d*\.?\d+)(px|em|rem|%)$/.exec(decl);
      if (!m) throw new Error('bad value ' + decl);
      const n = parseFloat(m[1]);
      if (m[2] === 'px') size = n;
      else if (m[2] === 'em') size = n * parent;     // relative to the parent
      else if (m[2] === '%') size = n / 100 * parent; // relative to the parent
      else size = n * (i === 0 ? 16 : root);          // rem: relative to html (for html itself, the default)
    }
    if (i === 0) root = size;
    out.push(size);
  });
  return out.map(v => Math.round(v * 100) / 100);
}
console.log(resolveSizes(['62.5%', '1.6rem', '1.5em', null, '120%', '20px', '0.5em'])); // [10, 16, 24, 24, 28.8, 20, 10]
console.log(resolveSizes(['100%', '1.5em', '1.5em', '1.5em']));                          // [16, 24, 36, 54]
console.log(resolveSizes(['100%', '1.5rem', '1.5rem', '1.5rem']));                       // [16, 24, 24, 24]
` },
    complexity: `<p>Time O(n), space O(n).</p>`,
    followUps: ['Add <code>vw</code> using a given viewport width.', 'Support keywords like <code>larger</code> and <code>smaller</code> (scale 1.2).', 'Find the multiplier needed at the last level to hit a target size.']
  }
});

practice.push({
  title: 'Tokenize a Selector into Compounds and Combinators',
  level: 'Medium', tags: ['css', 'selectors', 'parsing', 'strings'], companies: ['Google', 'Meta'], lang: 'js',
  statement: `<p>Write <code>tokenize(selector)</code> returning an array of tokens in order. A token is <code>{ type: "compound", value }</code>, <code>{ type: "combinator", value }</code> (value is <code>" "</code>, <code>"&gt;"</code>, <code>"+"</code> or <code>"~"</code>) or <code>{ type: "comma" }</code>. Spaces, combinator characters and commas inside <b>parentheses</b>, <b>square brackets</b> or <b>quotes</b> belong to the compound and must not split it. Ignore extra whitespace around combinators.</p>`,
  constraints: `Selector length ≤ 500. Assume it is well formed (balanced brackets and quotes).`,
  example: `<p><code>nav &gt; a[title="x y"]:not(.a, .b) + p</code></p>
    ${H.table(['#', 'Token'], [['1', 'compound <code>nav</code>'], ['2', 'combinator <code>&gt;</code>'], ['3', 'compound <code>a[title="x y"]:not(.a, .b)</code> (inner space and comma ignored)'], ['4', 'combinator <code>+</code>'], ['5', 'compound <code>p</code>']])}`,
  brute: {
    why: `<p><code>selector.split(/\\s+/)</code> breaks <code>a[title="x y"]</code> into two pieces and splits <code>:not(.a, .b)</code> at its inner space and comma. It also cannot tell a descendant combinator (whitespace) from decorative spaces around <code>&gt;</code>.</p>`,
    code: { lang: 'js', run: true, code: R`
// WRONG: naive split on spaces
console.log('a[title="x y"] > p'.split(/\s+/)); // [ 'a[title="x', 'y"]', '>', 'p' ] - the attribute value was torn apart
` }
  },
  mcq: { q: 'In <code>ul&gt;li</code> (no spaces), how many tokens are there?', options: ['1 compound', '3: compound, combinator, compound', '2', 'It is invalid'], answer: 1, explain: 'Spaces around a combinator are optional. The parser must still emit ul, ">", li.' },
  hints: [
    `<p>Hint 1: scan the string one character at a time; do not use a global regex split.</p>`,
    `<p>Hint 2: keep a <b>depth</b> counter for ( ) and [ ] and a <b>quote</b> flag. A character is "structural" only when depth is 0 and you are not inside quotes.</p>`,
    `<p>Hint 3: structural whitespace becomes a descendant combinator only if it is between two compounds (not next to an explicit <code>&gt; + ~</code> or a comma). Track whether the last emitted token was a compound.</p>`
  ],
  solution: {
    approach: `<p>One left-to-right scan with a buffer for the current compound. At depth 0 outside quotes: whitespace flushes the compound and marks a pending descendant combinator; <code>&gt; + ~</code> flush and emit a combinator (cancelling the pending space); a comma flushes and emits a comma token. Everything else is appended to the buffer.</p>`,
    code: { lang: 'js', run: true, code: R`
function tokenize(sel) {
  const tokens = [];
  let buf = '', depth = 0, quote = null, pendingSpace = false;

  const flush = () => { if (buf) { tokens.push({ type: 'compound', value: buf }); buf = ''; } };
  const lastIsCompound = () => tokens.length && tokens[tokens.length - 1].type === 'compound';

  for (const ch of sel) {
    if (quote) { buf += ch; if (ch === quote) quote = null; continue; }   // inside quotes: keep everything
    if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (depth > 0) { buf += ch; continue; }                                // inside brackets: keep everything

    if (/\s/.test(ch)) { flush(); pendingSpace = lastIsCompound(); continue; }
    if ('>+~'.includes(ch)) { flush(); tokens.push({ type: 'combinator', value: ch }); pendingSpace = false; continue; }
    if (ch === ',') { flush(); tokens.push({ type: 'comma' }); pendingSpace = false; continue; }

    if (!buf && pendingSpace) { tokens.push({ type: 'combinator', value: ' ' }); pendingSpace = false; }
    buf += ch;
  }
  flush();
  return tokens;
}

const show = t => t.map(x => x.type === 'compound' ? x.value : x.type === 'comma' ? ',' : '[' + x.value + ']').join(' | ');
console.log(show(tokenize('nav > a[title="x y"]:not(.a, .b) + p')));
console.log(show(tokenize('ul>li')));
console.log(show(tokenize('h1,   h2 .x')));
console.log(show(tokenize('.card   .title')));
` },
    complexity: `<p>Time O(L), space O(L).</p>`,
    followUps: ['Split each compound into type, ids, classes, attributes and pseudo parts.', 'Support the <code>||</code> column combinator and escaped characters like <code>\\:</code>.', 'Use the tokens to implement right-to-left matching against a DOM tree.']
  }
});

/* =====================================================================
   PRACTICE - HARD
   ===================================================================== */
practice.push({
  title: 'Spec-Accurate Specificity Calculator',
  level: 'Hard', tags: ['css', 'specificity', 'parsing', 'scanner'], companies: ['Google', 'Microsoft', 'Salesforce'], lang: 'js',
  statement: `<p>Write <code>specificity(selector)</code> returning <code>[a, b, c]</code> for a complex selector, following CSS Selectors Level 4. Required behaviour: ids &rarr; a; classes, attribute selectors and pseudo-classes &rarr; b; type selectors and pseudo-elements (both <code>::after</code> and legacy <code>:before/:after/:first-line/:first-letter</code>) &rarr; c; the universal selector and combinators &rarr; 0. <code>:is()</code>, <code>:not()</code>, <code>:has()</code> add their <b>most specific argument</b> (and nothing for the pseudo-class itself); <code>:where()</code> adds 0; <code>:nth-child(An+B of S)</code> and <code>:nth-last-child(... of S)</code> add one pseudo-class (b) plus the most specific selector in <code>S</code>. Characters inside attribute brackets and quotes (like <code>[data-x="a.b#c"]</code>) must <b>not</b> be counted.</p>`,
  constraints: `Selector length ≤ 500, nesting depth ≤ 10, the input is well formed.`,
  example: `${H.table(['Selector', 'Result', 'Why'], [
    ['<code>li:not(.a, #b)</code>', '<code>[1, 0, 1]</code>', ':not takes #b (1,0,0); li adds a type'],
    ['<code>a[href="x.y#z"]</code>', '<code>[0, 1, 1]</code>', 'the dot and hash are inside quotes'],
    ['<code>:where(#a) p</code>', '<code>[0, 0, 1]</code>', ':where counts zero'],
    ['<code>li:nth-child(2n+1 of .item, #x)</code>', '<code>[1, 1, 1]</code>', 'pseudo-class (b) + #x from the of-list + li']
  ])}`,
  brute: {
    why: `<p>The regex approach (count <code>#</code>, <code>.</code>, <code>:</code> characters) over-counts: dots inside attribute values and quoted strings are not classes, <code>::</code> is counted twice, and the contents of <code>:where()</code> or the non-winning arguments of <code>:is()</code> are added in full. Regexes also cannot match nested parentheses reliably.</p>`,
    code: { lang: 'js', run: true, code: R`
// WRONG: counting characters
function specWrong(sel) {
  return [(sel.match(/#/g) || []).length, (sel.match(/[.:\[]/g) || []).length, 0];
}
console.log(specWrong('a[href="x.y#z"]')); // [1, 3, 0] - everything inside the quotes was miscounted
` }
  },
  mcq: { q: 'What is the specificity of <code>:is(#a, .b, p)</code>?', options: ['(1, 1, 1): sum of all arguments', '(1, 0, 0): the most specific argument', '(0, 1, 0): it is a pseudo-class', '(0, 0, 0)'], answer: 1, explain: ':is() takes the specificity of its single most specific argument, here #a = (1,0,0). The pseudo-class itself adds nothing.' },
  hints: [
    `<p>Hint 1: scan the selector <b>one character at a time</b> with an index, so you can skip over bracketed and quoted parts correctly.</p>`,
    `<p>Hint 2: when you reach <code>:</code> read the name; if a <code>(</code> follows, extract the balanced inner text (track depth and quotes), split it on top-level commas, and recurse.</p>`,
    `<p>Hint 3: legacy one-colon pseudo-elements (before, after, first-line, first-letter) count as c. For <code>nth-child</code> look for <code>" of "</code> in the argument. Add the maximum (lexicographic) argument result to the running triple.</p>`
  ],
  solution: {
    approach: `<p>A small recursive scanner. It walks the string once. <code>#</code> and <code>.</code> read an identifier; <code>[</code> skips to the matching <code>]</code> respecting quotes; <code>:</code> / <code>::</code> read a name and optionally a balanced parenthesised argument which is handled by name (where, is/not/has, nth-child with "of", others). Identifier characters outside these cases are type selectors.</p>`,
    code: { lang: 'js', run: true, code: R`
function specificity(sel) {
  const t = [0, 0, 0];
  const n = sel.length;
  let i = 0;

  const ident = () => { const s = i; while (i < n && /[\w-]/.test(sel[i])) i++; return sel.slice(s, i); };

  // at sel[i] === '(' -> return the inner text and move past the matching ')'
  const parens = () => {
    let depth = 0, quote = null, j = i;
    for (; j < n; j++) {
      const ch = sel[j];
      if (quote) { if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '(') depth++;
      else if (ch === ')' && --depth === 0) break;
    }
    const inner = sel.slice(i + 1, j);
    i = j + 1;
    return inner;
  };

  const splitCommas = s => {
    const out = []; let depth = 0, quote = null, cur = '';
    for (const ch of s) {
      if (quote) { cur += ch; if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'") quote = ch;
      if (ch === '(' || ch === '[') depth++;
      if (ch === ')' || ch === ']') depth--;
      if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
    return out;
  };

  const greater = (x, y) => x[0] !== y[0] ? x[0] > y[0] : x[1] !== y[1] ? x[1] > y[1] : x[2] > y[2];
  const addMax = list => {
    let best = [0, 0, 0];
    for (const part of list) { const s = specificity(part.trim()); if (greater(s, best)) best = s; }
    t[0] += best[0]; t[1] += best[1]; t[2] += best[2];
  };

  while (i < n) {
    const ch = sel[i];
    if (ch === '#') { i++; ident(); t[0]++; }
    else if (ch === '.') { i++; ident(); t[1]++; }
    else if (ch === '[') {                                   // attribute: skip to the matching ]
      let quote = null;
      while (i < n) {
        const c = sel[i++];
        if (quote) { if (c === quote) quote = null; }
        else if (c === '"' || c === "'") quote = c;
        else if (c === ']') break;
      }
      t[1]++;
    } else if (ch === ':') {
      if (sel[i + 1] === ':') {                              // ::pseudo-element(...)
        i += 2; ident(); if (sel[i] === '(') parens(); t[2]++;
      } else {
        i++;
        const name = ident().toLowerCase();
        if (['before', 'after', 'first-line', 'first-letter'].includes(name)) t[2]++;   // legacy pseudo-elements
        else if (sel[i] === '(') {
          const inner = parens();
          if (name === 'where') { /* contributes nothing */ }
          else if (['is', 'not', 'has', 'matches'].includes(name)) addMax(splitCommas(inner));
          else if (name === 'nth-child' || name === 'nth-last-child') {
            t[1]++;
            const m = /\sof\s([\s\S]+)$/i.exec(inner);
            if (m) addMax(splitCommas(m[1]));
          } else t[1]++;                                     // :nth-of-type(2), :lang(en), ...
        } else t[1]++;                                       // :hover, :first-child, ...
      }
    } else if (/[a-zA-Z_]/.test(ch)) { ident(); t[2]++; }     // type selector
    else i++;                                                // *, combinators, spaces, commas
  }
  return t;
}

const tests = ['li:not(.a, #b)', 'a[href="x.y#z"]', ':where(#a) p', 'li:nth-child(2n+1 of .item, #x)',
  'p::first-line', 'p:before', ':has(> img.hero)', 'ul:not(:first-child) li:nth-of-type(2)', '*', ':is(#a, .b, p) > a:hover'];
for (const s of tests) console.log(s.padEnd(40), JSON.stringify(specificity(s)));
` },
    complexity: `<p>Time O(L · depth) in the worst case (each nesting level rescans its inner text once), space O(depth).</p>`,
    followUps: ['Add support for escaped characters (<code>\\:</code>) and namespaces (<code>svg|a</code>).', 'Add CSS nesting: <code>&amp;</code> acts like <code>:is(parent)</code>.', 'Compare two selectors and explain which wins in words.']
  }
});

practice.push({
  title: 'Cascade With Layers, Importance and Inline Styles',
  level: 'Hard', tags: ['css', 'cascade', 'layers', 'simulation'], companies: ['Google', 'Stripe', 'Vercel'], lang: 'js',
  statement: `<p>Declarations for one property are given in source order as <code>{ value, important, inline, layer, spec }</code>. <code>layer</code> is <code>null</code> for unlayered styles or an integer rank where a <b>larger number means a layer declared later</b> in the <code>@layer</code> order statement. <code>spec</code> is <code>[a, b, c]</code> (ignored for inline). Return the winning <code>value</code> using this order: (1) <b>importance</b>, (2) <b>inline</b> (element-attached) styles, (3) <b>layers</b>, (4) specificity, (5) source order (later wins). For layers: with <b>normal</b> declarations unlayered beats layered and a later layer beats an earlier one; with <b>!important</b> the order is <b>reversed</b>: an earlier layer beats a later one and layered beats unlayered.</p>`,
  constraints: `1 ≤ n ≤ 10<sup>4</sup>, layer ∈ {null, 0..50}.`,
  example: `${H.table(['Declarations', 'Winner', 'Why'], [
    ['A: layer 0, #id (1,0,0) / B: layer 1, p (0,0,1)', '<code>B</code>', 'later layer beats an earlier one before specificity is compared'],
    ['A: layer 3 / B: unlayered', '<code>B</code>', 'normal: unlayered beats every layer'],
    ['A: layer 0 !important / B: layer 1 !important', '<code>A</code>', 'important flips the layer order'],
    ['A: inline !important / B: layer 0 !important', '<code>A</code>', 'inline is checked before layers']
  ])}`,
  brute: {
    why: `<p>Comparing only specificity (the module-3 algorithm) lets a lone id inside an early reset layer defeat a simple class in a later component layer - the opposite of what layers are for. Layers exist precisely so architecture beats selector strength. Applying the same layer direction to !important declarations is the second classic bug: it must be reversed.</p>`,
    code: { lang: 'js', run: true, code: R`
// WRONG: ignores layers and the importance flip
function winnerWrong(decls) {
  let best = decls[0];
  for (const d of decls) {
    const a = d.spec || [0, 0, 0], b = best.spec || [0, 0, 0];
    if (a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] >= b[2])))) best = d;
  }
  return best.value;
}
console.log(winnerWrong([{ value: 'reset-id', layer: 0, spec: [1, 0, 0] }, { value: 'component-p', layer: 1, spec: [0, 0, 1] }])); // reset-id - wrong
` }
  },
  mcq: { q: 'Layer order is <code>@layer reset, base, components;</code>. For NORMAL declarations which layer wins?', options: ['reset (declared first)', 'components (declared last)', 'whichever has the highest specificity', 'base, being in the middle'], answer: 1, explain: 'For normal declarations later layers beat earlier ones. For !important the order flips and reset would win.' },
  hints: [
    `<p>Hint 1: turn the five rules into a <b>comparison key</b>, an array of numbers compared left to right: <code>[important, inline, layerRank, a, b, c, order]</code>.</p>`,
    `<p>Hint 2: the layer rank depends on importance. Normal: unlayered = +Infinity, layered = layer number. Important: unlayered = -Infinity, layered = -layer number (earlier layer stronger).</p>`,
    `<p>Hint 3: handle Infinity comparisons carefully (<code>Infinity - Infinity</code> is NaN; compare with <code>!==</code> and <code>&gt;</code> instead of subtracting). Inline declarations have no selector, so use spec zeros. The highest key wins; the final element (index) breaks all remaining ties.</p>`
  ],
  solution: {
    approach: `<p>Build the key for each declaration and pick the lexicographically greatest one. The importance-dependent layer rank is the only subtle part: unlayered styles are strongest for normal declarations and weakest for important ones, and earlier layers get stronger for important ones.</p>`,
    code: { lang: 'js', run: true, code: R`
function winner(decls) {
  const key = (d, order) => {
    const imp = d.important ? 1 : 0;
    let layerRank;
    if (!d.important) layerRank = d.layer === null ? Infinity : d.layer;     // normal: unlayered > later > earlier
    else layerRank = d.layer === null ? -Infinity : -d.layer;                 // important: flipped
    const spec = d.inline ? [0, 0, 0] : (d.spec || [0, 0, 0]);
    return [imp, d.inline ? 1 : 0, layerRank, spec[0], spec[1], spec[2], order];
  };
  const greater = (x, y) => { for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };

  let best = null, bestKey = null;
  decls.forEach((d, i) => {
    const k = key(d, i);
    if (!best || greater(k, bestKey)) { best = d; bestKey = k; }
  });
  return best.value;
}

console.log(winner([{ value: 'A', layer: 0, spec: [1, 0, 0] }, { value: 'B', layer: 1, spec: [0, 0, 1] }]));                 // B
console.log(winner([{ value: 'A', layer: 3, spec: [0, 0, 1] }, { value: 'B', layer: null, spec: [0, 0, 1] }]));             // B
console.log(winner([{ value: 'A', layer: 0, important: true }, { value: 'B', layer: 1, important: true }]));                // A
console.log(winner([{ value: 'A', inline: true, important: true, layer: null }, { value: 'B', layer: 0, important: true }])); // A
console.log(winner([{ value: 'A', layer: null, important: true }, { value: 'B', layer: 5, important: true }]));              // B (layered important beats unlayered important)
` },
    complexity: `<p>Time O(n), space O(1).</p>`,
    followUps: ['Add origins: user-agent, user and author with the reversed important order.', 'Support nested layers (<code>a.b</code>) by comparing rank arrays.', 'Add <code>revert-layer</code>, which discards the current layer\'s declarations.']
  }
});

practice.push({
  title: 'Pack Inline-Blocks Into Lines (Whitespace Gaps)',
  level: 'Hard', tags: ['css', 'display', 'inline-block', 'layout', 'simulation'], companies: ['Amazon', 'Atlassian'], lang: 'js',
  statement: `<p>Inline-block boxes flow left to right inside a container of width <code>W</code>. Each box is <code>{ width, ml, mr }</code> (content width, margin-left, margin-right; borders and padding already included in <code>width</code>). Between two neighbouring boxes on the same line the browser inserts the whitespace character from your HTML, <code>gap</code> px wide. A box wraps to a new line if its <b>outer width</b> (<code>ml + width + mr</code>) plus the gap would not fit in the remaining space; the first box on a line is always placed, even if it overflows. Return an array of lines; each line is the array of x-positions of the <b>left border edges</b> (after the left margin) of its boxes.</p>`,
  constraints: `1 ≤ n ≤ 10<sup>4</sup>, 0 ≤ numbers ≤ 10<sup>4</sup>, W ≥ 1.`,
  example: `<p>W = 100, gap = 4, boxes of width 40 with no margins</p>
    ${H.table(['Box', 'Start', 'End', 'Fits?'], [['1', '0', '40', 'first on the line'], ['2', '44 (40 + gap)', '84', 'yes'], ['3', '88', '128', H.c('r', 'no (128 &gt; 100) - wraps to line 2')]])}
    <p>Output: <code>[[0, 44], [0]]</code>. Without whitespace (gap = 0) three boxes of 40 would still not fit (120 &gt; 100), but 33-wide ones would.</p>`,
  brute: {
    why: `<p>Ignoring the whitespace gap lets the sum of widths decide wrapping, so a row of boxes that looks like it exactly fits (three 33.33% boxes) wraps in the real browser because of the two invisible 4px gaps. The wasted idea is assuming inline-blocks touch each other.</p>`,
    code: { lang: 'js', run: true, code: R`
// WRONG: no gap between boxes
function packWrong(boxes, W) {
  const lines = [[]]; let x = 0;
  for (const b of boxes) {
    const outer = b.ml + b.width + b.mr;
    if (x + outer > W && lines[lines.length - 1].length) { lines.push([]); x = 0; }
    lines[lines.length - 1].push(x + b.ml); x += outer;
  }
  return lines;
}
console.log(JSON.stringify(packWrong([{ width: 33, ml: 0, mr: 0 }, { width: 33, ml: 0, mr: 0 }, { width: 33, ml: 0, mr: 0 }], 100))); // [[0,33,66]] - in a browser the 4px gaps push the third box to line 2
` }
  },
  mcq: { q: 'Why do three <code>display: inline-block; width: 33.333%</code> boxes often wrap to two lines?', options: ['Percent widths are rounded up', 'Whitespace between inline-blocks adds a gap, so the total exceeds 100%', 'Inline-blocks always wrap after two items', 'Margin collapsing'], answer: 1, explain: 'The spaces and newlines between the tags in the HTML render as real space characters (about 4px). Three boxes plus two gaps are wider than the row.' },
  hints: [
    `<p>Hint 1: keep a cursor <code>x</code> (the end of the last box on the current line) and a flag for "line has boxes".</p>`,
    `<p>Hint 2: the extra width needed for a new box is <code>(lineHasBoxes ? gap : 0) + outer</code>. If <code>x + needed &gt; W</code> and the line already has a box, start a new line with <code>x = 0</code>.</p>`,
    `<p>Hint 3: the box's left border edge is <code>start + ml</code> where <code>start = x + (lineHasBoxes ? gap : 0)</code>; update <code>x = start + outer</code>. A new line never carries a gap before its first box.</p>`
  ],
  solution: {
    approach: `<p>Greedy left-to-right packing. For each box compute the start offset (with a gap if it is not first on its line), test whether it fits, wrap if needed, record the border-edge x, and advance the cursor by the outer width.</p>`,
    code: { lang: 'js', run: true, code: R`
function pack(boxes, W, gap = 4) {
  const lines = [[]];
  let x = 0;                                   // right end of the last placed box on this line
  for (const b of boxes) {
    const outer = b.ml + b.width + b.mr;
    const line = lines[lines.length - 1];
    let start = x + (line.length ? gap : 0);   // whitespace only between boxes of the same line
    if (line.length && start + outer > W) {    // does not fit: wrap
      lines.push([]);
      start = 0;
    }
    lines[lines.length - 1].push(start + b.ml); // x of the left border edge
    x = start + outer;
  }
  return lines;
}

const box = (width, ml = 0, mr = 0) => ({ width, ml, mr });
console.log(JSON.stringify(pack([box(40), box(40), box(40)], 100)));                  // [[0,44],[0]]
console.log(JSON.stringify(pack([box(30), box(30), box(30)], 100)));                  // [[0,34,68]]
console.log(JSON.stringify(pack([box(33), box(33), box(33)], 100)));                  // [[0,37],[0]]  gaps make 33+4+33+4+33 = 107
console.log(JSON.stringify(pack([box(20, 5, 5), box(20, 5, 5)], 70, 0)));             // [[5,35]]
console.log(JSON.stringify(pack([box(200), box(10)], 100)));                          // [[0],[0]]  first box overflows but is still placed
` },
    complexity: `<p>Time O(n), space O(n) for the output.</p>`,
    followUps: ['Remove the gap by setting <code>font-size: 0</code> on the parent: how does the output change?', 'Add vertical alignment: lines take the height of the tallest box.', 'Replace with flexbox <code>flex-wrap: wrap; gap: 4px</code> and compare behaviour on the margins.']
  }
});

practice.push({
  title: 'Final Coordinates of Positioned Boxes',
  level: 'Hard', tags: ['css', 'positioning', 'tree', 'simulation'], companies: ['Meta', 'Uber', 'Figma'], lang: 'js',
  statement: `<p>A page is a tree of boxes <code>{ name, position, top, left, height, children }</code> (<code>top</code>/<code>left</code> default to 0; widths do not matter). The root is at (0, 0). Rules: <b>static/relative</b> children are in normal flow: each starts at its parent's drawn position, stacked below the previous <i>in-flow</i> siblings (sum of their declared heights, ignoring any relative shifts). A <b>relative</b> box is then drawn shifted by (left, top). An <b>absolute</b> box is out of flow and is drawn at <code>(left, top)</code> from the drawn position of its nearest <b>positioned</b> ancestor (position other than static), or the page origin if none. A <b>fixed</b> box is out of flow and is placed at (left, top) from the <b>viewport</b>. Given <code>scrollY</code> (page scrolled down), return a map <code>name &rarr; {x, y}</code> in <b>viewport coordinates</b> (page y minus scrollY, except fixed boxes, which stay at their offsets). Descendants of a shifted box move with it.</p>`,
  constraints: `n ≤ 10<sup>4</sup> boxes, depth ≤ 100, 0 ≤ scrollY ≤ 10<sup>5</sup>, offsets are integers.`,
  example: `<p>page &gt; [header(h50), main(relative top 10 left 5, h400) &gt; [card(h100), badge(absolute top 4 left 6), panel(h80)], footer, bar(fixed top 0 left 100)]</p>
    ${H.table(['Box', 'Position (scrollY = 0)', 'Why'], [
      ['header', '(0, 0)', 'first in flow'],
      ['main', '(5, 60)', 'flow y = 50, shifted by relative (5, 10)'],
      ['card', '(5, 60)', 'starts at its parent\'s drawn position'],
      ['badge', '(11, 64)', 'anchored to main\'s drawn corner (5, 60) + (6, 4)'],
      ['panel', '(5, 160)', 'below card (the badge takes no space)'],
      ['footer', '(0, 450)', 'after header 50 + main 400']
    ])}`,
  brute: {
    why: `<p>Computing every box from its parent's <b>layout</b> position (instead of its drawn position) forgets that a relative parent drags its children along, and measuring absolute offsets from the direct parent instead of the nearest positioned ancestor places badges in the wrong spot. Handling scroll by subtracting from every box also wrongly scrolls fixed boxes.</p>`,
    code: { lang: 'js', run: true, code: R`
// WRONG: absolute offsets always measured from the direct parent, scroll applied to everything
function drawWrong(node, parentPos = { x: 0, y: 0 }, out = {}, scrollY = 0) {
  const pos = { x: parentPos.x + (node.left || 0), y: parentPos.y + (node.top || 0) };
  out[node.name] = { x: pos.x, y: pos.y - scrollY };
  (node.children || []).forEach(c => drawWrong(c, pos, out, scrollY));
  return out;
}
console.log(drawWrong({ name: 'bar', position: 'fixed', top: 0, left: 100 }, { x: 0, y: 0 }, {}, 100)); // bar y = -100, but a fixed box should stay at y = 0
` }
  },
  mcq: { q: 'A relative box is shifted 10px down. Its static child (in the flow) is now drawn...', options: ['At the old position, since the child is static', 'Also shifted 10px down, because it moves with its parent', 'Always at the page origin', 'It is removed from the flow'], answer: 1, explain: 'Descendants are laid out relative to the parent\'s box, which has been visually shifted, so they move with it.' },
  hints: [
    `<p>Hint 1: write a recursive function that takes the node, its parent's <b>drawn</b> position and the current <b>anchor</b> (the drawn position of the nearest positioned ancestor).</p>`,
    `<p>Hint 2: for each node decide its drawn page position by type: in-flow (parent drawn + stacked offset, plus relative shift), absolute (anchor + offsets), fixed (offsets + scrollY so that it ends at the offsets after scrolling).</p>`,
    `<p>Hint 3: children get <code>anchor = this node's drawn position</code> if the node is positioned (anything but static), else they keep the old anchor. Track the running flow offset per parent counting only in-flow children. Subtract <code>scrollY</code> from y when recording results.</p>`
  ],
  solution: {
    approach: `<p>Depth-first traversal. The recursion carries the parent's drawn position and the anchor. Each node's page position is computed according to its <code>position</code>, then recorded in viewport coordinates. Fixed boxes are computed in page space as <code>top + scrollY</code> so that subtracting <code>scrollY</code> returns them to their offsets; their descendants then follow them.</p>`,
    code: { lang: 'js', run: true, code: R`
function layout(root, scrollY = 0) {
  const out = {};

  function place(node, parent, anchor, flowY) {
    const top = node.top || 0, left = node.left || 0;
    let x, y;
    switch (node.position) {
      case 'absolute': x = anchor.x + left; y = anchor.y + top; break;       // from nearest positioned ancestor
      case 'fixed':    x = left;            y = top + scrollY;  break;       // from the viewport (page space + scroll)
      case 'relative': x = parent.x + left; y = parent.y + flowY + top; break; // flow position, then shifted
      default:         x = parent.x;        y = parent.y + flowY;            // static: plain flow position
    }
    out[node.name] = { x, y: y - scrollY };

    const drawn = { x, y };
    const childAnchor = node.position && node.position !== 'static' ? drawn : anchor;
    let used = 0;                                            // height of in-flow children placed so far
    for (const child of node.children || []) {
      place(child, drawn, childAnchor, used);
      const inFlow = !child.position || child.position === 'static' || child.position === 'relative';
      if (inFlow) used += child.height || 0;                  // declared height, relative shifts ignored
    }
  }

  place(root, { x: 0, y: 0 }, { x: 0, y: 0 }, 0);
  return out;
}

const page = {
  name: 'page', height: 1000, children: [
    { name: 'header', height: 50 },
    { name: 'main', position: 'relative', top: 10, left: 5, height: 400, children: [
      { name: 'card', height: 100 },
      { name: 'badge', position: 'absolute', top: 4, left: 6 },
      { name: 'panel', height: 80 }
    ] },
    { name: 'footer', height: 30 },
    { name: 'bar', position: 'fixed', top: 0, left: 100 }
  ]
};
console.log(JSON.stringify(layout(page, 0)));
console.log(JSON.stringify(layout(page, 100)));  // everything moves up 100 except bar
` },
    complexity: `<p>Time O(n), space O(depth) for the recursion plus O(n) for the output.</p>`,
    followUps: ['Add padding and borders: absolute offsets are measured from the padding box.', 'Implement <code>sticky</code> with a scroll range.', 'Add <code>transform</code> on an ancestor, which makes fixed children anchor to it.']
  }
});

/* =====================================================================
   QUIZ
   ===================================================================== */
quiz.push({ q: 'What is the specificity of <code>#nav .item a:hover</code>?', options: ['(1, 1, 1)', '(1, 2, 1)', '(0, 3, 1)', '(1, 2, 0)'], answer: 1, explain: 'One id (#nav) = a 1. <code>.item</code> and <code>:hover</code> are two b points. <code>a</code> is one type = c 1. Result (1, 2, 1).' });
quiz.push({ q: 'Two rules target the same paragraph: <code>p.note { color: red }</code> and <code>.note.big { color: blue }</code>. The element has both classes. Which colour is used?', options: ['red, because p.note is written first', 'blue, because (0,2,0) beats (0,1,1)', 'red, because it has a type selector', 'They tie, so the browser guesses'], answer: 1, explain: 'p.note = (0,1,1) and .note.big = (0,2,0). The b column is compared before c, so blue wins.' });
quiz.push({ q: 'An element has <code>width: 200px; padding: 10px; border: 5px solid</code> and the default box model. How wide is the painted box (content + padding + border)?', options: ['200px', '210px', '230px', '215px'], answer: 2, explain: 'content-box: 200 + 2×10 + 2×5 = 230px. With border-box it would be exactly 200px.' });
quiz.push({ q: 'Block A has <code>margin-bottom: 40px</code>; the next sibling B has <code>margin-top: 25px</code>. What is the gap between them?', options: ['65px', '40px', '25px', '15px'], answer: 1, explain: 'Adjacent vertical margins of block siblings collapse to the larger one: 40px.' });
quiz.push({ q: 'The root font-size is 16px. A div declares <code>font-size: 1.5em</code> and its child div declares <code>font-size: 1.5em</code> as well. What is the child\'s computed size?', options: ['24px', '36px', '32px', '18px'], answer: 1, explain: 'The first div is 1.5 × 16 = 24px. The child is 1.5 × its parent\'s 24 = 36px. em compounds; rem would stay 24px.' });
quiz.push({ q: 'Which of these CSS properties is inherited by default?', options: ['<code>border</code>', '<code>margin</code>', '<code>color</code>', '<code>background</code>'], answer: 2, explain: 'Text-related properties such as color, font-family and line-height inherit; box properties like border, margin, padding and background do not.' });
quiz.push({ q: 'An absolutely positioned element has no positioned ancestor. Against what are its <code>top</code> and <code>left</code> measured?', options: ['Its parent element', 'The initial containing block (the page origin)', 'The nearest block-level sibling', 'The viewport, scrolling with it'], answer: 1, explain: 'With no positioned ancestor, the offsets use the initial containing block, anchored to the page origin (it scrolls with the page, unlike fixed).' });
quiz.push({ q: 'Why does <code>span { width: 200px; height: 60px; }</code> have no visible effect?', options: ['Spans cannot have a width in CSS at all', 'A span is inline by default, and width/height do not apply to non-replaced inline boxes', 'The numbers need to be in rem', 'Spans inherit their size from the parent'], answer: 1, explain: 'Inline elements ignore width and height. Use display: inline-block or block to make them apply.' });
quiz.push({ q: 'Which text colour on a white background passes WCAG AA (4.5:1) for normal-size text?', options: ['<code>#999999</code> (2.85:1)', '<code>#777777</code> (4.48:1)', '<code>#767676</code> (4.54:1)', '<code>#ff0000</code> (4.00:1)'], answer: 2, explain: '#767676 is the lightest grey that reaches 4.5:1 on white. #777 misses by a hair and #999 and red fail.' });
quiz.push({ q: 'A stylesheet has <code>p { color: blue !important }</code>, and the same paragraph has an inline <code>style="color: red"</code>. The paragraph is...', options: ['red, inline always wins', 'blue, !important is decided before inline vs selector', 'purple, mixed', 'whichever was parsed last'], answer: 1, explain: 'Importance is the first step of the cascade, so the important declaration beats a normal inline declaration.' });
quiz.push({ q: 'Which keeps the element\'s space in the layout but makes it invisible?', options: ['<code>display: none</code>', '<code>visibility: hidden</code>', '<code>position: absolute</code>', '<code>hidden</code> attribute'], answer: 1, explain: 'visibility: hidden hides the box but its space remains. display: none and the hidden attribute remove it from layout.' });
quiz.push({ q: 'You write <code>a:hover { color: red }</code> BEFORE <code>a:link { color: blue }</code> and hover never seems to work on unvisited links. Why?', options: ['hover needs !important', 'Both have specificity (0,1,1); the later :link rule wins', ':link is stronger than :hover by definition', 'Browsers disable hover on links'], answer: 1, explain: 'Same specificity, so source order decides: the later :link rule overrides :hover. Follow the LVHA order: link, visited, hover, active.' });
quiz.push({ q: 'What is the specificity of <code>:where(#app) .btn</code>?', options: ['(1, 1, 0)', '(0, 1, 0)', '(1, 0, 0)', '(0, 0, 0)'], answer: 1, explain: ':where() always contributes zero, so only .btn counts: (0, 1, 0).' });
quiz.push({ q: 'A user sets the browser default font size to 24px. Which declaration respects that preference?', options: ['<code>body { font-size: 16px }</code>', '<code>body { font-size: 1rem }</code>', '<code>body { font-size: 12pt }</code>', '<code>body { font-size: 100vw }</code>'], answer: 1, explain: 'rem is relative to the root font-size, which defaults to the user\'s setting. px and pt are absolute and ignore it.' });
quiz.push({ q: 'In <code>section &gt; p</code> versus <code>section p</code>, what is the difference?', options: ['None, they are identical', 'The first matches only direct children p; the second matches any descendant p', 'The first matches siblings', 'The second is faster'], answer: 1, explain: 'The child combinator (&gt;) requires the p to be a direct child of section; the descendant combinator (space) matches at any depth.' });

/* =====================================================================
   INTERVIEW
   ===================================================================== */
interview.push({ q: 'Explain the CSS box model. What is the difference between <code>content-box</code> and <code>border-box</code>?', level: 'B',
  a: `<p>Every element is a rectangle made of four layers from the inside out: <b>content</b>, <b>padding</b>, <b>border</b> and <b>margin</b>. Margin is outside the visible box and is transparent.</p>
    <p>With <code>box-sizing: content-box</code> (the default), <code>width</code> and <code>height</code> describe only the <b>content</b>, so padding and border are added on top: <code>width: 300px; padding: 20px; border: 5px solid</code> paints 350px wide. With <code>border-box</code>, <code>width</code> includes padding and border, so the box stays exactly 300px and the content shrinks to 250px. Most projects set <code>*, *::before, *::after { box-sizing: border-box }</code> because it makes layouts predictable, for example three 33.33% columns with padding fit on one line. Margins are never included in width.</p>`,
  followUps: ['How many pixels wide is a 200px box with 10px padding and 2px border in each model?', 'Why is box-sizing not inherited, and how does the reset handle that?', 'Is outline part of the box model?'] });
interview.push({ q: 'What is the difference between a class selector and an ID selector? When would you use each?', level: 'B',
  a: `<p>An <b>ID</b> (<code>#header</code>) must be unique in a page and identifies exactly one element; a <b>class</b> (<code>.card</code>) can be reused on many elements, and one element can carry several classes. The big practical difference is <b>specificity</b>: an id scores (1,0,0), a class (0,1,0), so an id rule beats any number of classes and is hard to override later.</p>
    <p>For styling I use <b>classes</b> almost exclusively, with a naming convention like BEM, because they keep specificity flat and components reusable. IDs are still useful as anchor targets (<code>#section</code> in URLs), for linking labels to inputs (<code>for</code>/<code>id</code>), for ARIA relationships, and as JavaScript hooks, but not as CSS hooks.</p>`,
  followUps: ['Why does an id selector make CSS harder to maintain?', 'Can an element have two classes? Two ids?', 'How would you override an id rule from a library without !important?'] });
interview.push({ q: 'How is CSS specificity calculated? Walk me through <code>#nav li.active a:hover</code>.', level: 'B',
  a: `<p>Specificity is three counters compared <b>left to right</b>: (a) IDs, (b) classes, attributes and pseudo-classes, (c) types and pseudo-elements. Inline styles beat all selectors, and <code>!important</code> is decided even earlier in the cascade. The universal selector and combinators count zero.</p>
    <p>For <code>#nav li.active a:hover</code>: <code>#nav</code> = one id (a=1); <code>.active</code> and <code>:hover</code> = two (b=2); <code>li</code> and <code>a</code> = two types (c=2). Result <b>(1, 2, 2)</b>. It is not a base-10 number: (1,0,0) beats (0,20,0). When two selectors tie, the one that appears later in the stylesheet wins. <code>:is()</code>, <code>:not()</code> and <code>:has()</code> take the specificity of their most specific argument; <code>:where()</code> contributes zero.</p>`,
  followUps: ['Which is stronger: eleven classes or one id?', 'What is the specificity of :where(#a) .b?', 'How does @layer change the picture?'] });
interview.push({ q: 'Explain the difference between <code>display: block</code>, <code>inline</code> and <code>inline-block</code>.', level: 'B',
  a: `<p><b>Block</b> elements (div, p, h1, ul) start on a new line and stretch to the container's full width by default; width, height, margin and padding all apply. <b>Inline</b> elements (span, a, strong) flow within a line of text, are only as wide as their content, can wrap across lines, and ignore width and height; vertical margin and padding do not push surrounding lines. <b>Inline-block</b> flows like inline (sits next to other inline content, shrink-to-fit width) but behaves like a block inside: width, height and all margins apply, and it moves to the next line as one unit rather than splitting.</p>
    <p>Gotchas: whitespace in the HTML between inline-blocks renders as a small gap (about 4px), and images are inline, producing a baseline gap beneath them. Today I use flexbox or grid for layout and keep inline-block for small things like tags and badges.</p>`,
  followUps: ['How do you remove the gap between inline-blocks?', 'Why do images leave a gap at the bottom of their container?', 'What is display: contents?'] });
interview.push({ q: 'What is the difference between <code>px</code>, <code>em</code> and <code>rem</code>? Which would you use for font sizes and why?', level: 'B',
  a: `<p><code>px</code> is a fixed CSS pixel. <code>em</code> is relative to the element's own font-size (for the <code>font-size</code> property itself, to the parent's font-size), so em values <b>compound</b> through nesting: 1.5em inside 1.5em inside 1.5em is 3.375 times the base. <code>rem</code> is relative to the <b>root</b> element's font-size, so it never compounds.</p>
    <p>For font sizes I use <b>rem</b>: it is predictable and respects the user's browser font-size setting, which matters for accessibility (WCAG 1.4.4). I use <b>em</b> inside a component when spacing should scale with the component's text (button padding <code>0.5em 1em</code>), and px for hairline borders and shadows. A handy conversion with a 16px root is px ÷ 16 = rem.</p>`,
  followUps: ['Why is html { font-size: 62.5% } controversial?', 'What do vw, vh and dvh mean, and why dvh on phones?', 'How does clamp() give fluid typography?'] });
interview.push({ q: 'Explain the cascade. In what order does the browser decide which declaration wins?', level: 'I',
  a: `<p>The cascade resolves conflicts when several declarations set the same property on the same element. In order: (1) <b>origin and importance</b> - user-agent, user and author stylesheets, with <code>!important</code> reversing the origin order; (2) <b>element-attached</b> (inline <code>style</code>) declarations; (3) <b>cascade layers</b> declared with <code>@layer</code> (later layer wins for normal declarations, earlier wins for important ones, unlayered styles beat layered ones when normal); (4) <b>specificity</b>; (5) <b>source order</b> - the last declaration wins.</p>
    <p>It works <b>per property</b>, so one rule can win color while another wins font-size. If no declaration wins for an inherited property, the value is inherited from the parent; otherwise the initial value is used. In practice, I debug by opening DevTools, finding the struck-through declaration, and walking this list top-down.</p>`,
  followUps: ['Where does inheritance fit relative to the cascade?', 'Why can an important rule in a user stylesheet beat the author?', 'How do you keep third-party CSS from winning?'] });
interview.push({ q: 'Which CSS properties are inherited, and what do <code>inherit</code>, <code>initial</code>, <code>unset</code> and <code>revert</code> do?', level: 'I',
  a: `<p>Mostly <b>text-related</b> properties inherit: <code>color</code>, <code>font-*</code>, <code>line-height</code>, <code>letter-spacing</code>, <code>text-align</code>, <code>visibility</code>, <code>cursor</code>, <code>list-style</code>. <b>Box-related</b> ones do not: <code>margin</code>, <code>padding</code>, <code>border</code>, <code>background</code>, <code>width</code>, <code>display</code>, <code>position</code>. CSS custom properties inherit by default.</p>
    <p><code>inherit</code> forces the parent's computed value; <code>initial</code> forces the spec default; <code>unset</code> acts as inherit for inherited properties and initial for the others; <code>revert</code> rolls back to the previous origin (usually the browser default). Note that inheritance is the weakest source: any rule matching the element directly, even the browser's own <code>a { color }</code>, beats an inherited value. Also, a unitless line-height inherits as a ratio while a percentage or em inherits as a fixed length.</p>`,
  followUps: ['Why do buttons and inputs not pick up the page font?', 'How would you reset a component with all: initial vs all: unset?', 'Do custom properties inherit? Can you opt out?'] });
interview.push({ q: 'Describe the <code>position</code> values. How does an absolutely positioned element decide where it goes?', level: 'I',
  a: `<p><b>static</b> is the default (offsets ignored). <b>relative</b> keeps the element in the flow and reserves its original space, offsets move it from its own normal position, and it becomes an anchor for absolute children. <b>absolute</b> removes it from the flow (siblings close the gap) and measures <code>top/right/bottom/left</code> from the padding box of the <b>nearest positioned ancestor</b> (any ancestor whose position is not static, or one with transform/filter), falling back to the initial containing block. <b>fixed</b> is out of the flow and measured from the viewport, so it does not scroll. <b>sticky</b> behaves like relative until a scroll threshold (<code>top</code>) is reached, then sticks while its parent is on screen.</p>
    <p>Typical use: parent <code>position: relative</code> plus child <code>position: absolute; top: 0; right: 0</code> for badges. A common bug is forgetting the relative parent so the child jumps to the page corner.</p>`,
  followUps: ['Why might position: sticky not work?', 'What does a transform on an ancestor do to a fixed child?', 'What replaces absolute positioning for tooltips today?'] });
interview.push({ q: 'My <code>position: sticky</code> header does not stick. How do you debug it?', level: 'I',
  a: `<p>I check the usual causes in order. (1) There must be an <b>offset</b> such as <code>top: 0</code>; without it sticky does nothing. (2) An ancestor between the element and the scroll container with <code>overflow: hidden</code>, <code>auto</code> or <code>scroll</code> becomes the scrolling container, so the element sticks relative to that box instead of the page - the fix is to remove the overflow or use <code>overflow: clip</code>. (3) The sticky element must have room to move: its <b>parent</b> bounds the sticking range, so if the parent is no taller than the element there is nothing to scroll through. (4) In flex/grid, the item may be stretched; add <code>align-self: start</code>. (5) Make sure the browser has laid out the element with a height and that no <code>transform</code> or <code>contain</code> on an ancestor changes the scrollport.</p>
    <p>I confirm in DevTools by walking up the ancestors' computed overflow values.</p>`,
  followUps: ['What is the difference between overflow: hidden and overflow: clip here?', 'How does sticky compare with a JavaScript scroll listener?', 'How would you make a sticky table header?'] });
interview.push({ q: 'What is margin collapsing and how do you prevent it?', level: 'I',
  a: `<p>When the vertical margins of two block-level boxes touch, they merge into one margin instead of adding: both positive gives the larger, both negative gives the most negative, mixed values add. It happens between adjacent siblings, between a parent and its first or last child (if there is no padding, border, clearance or separate formatting context between them), and for empty blocks. Horizontal margins never collapse.</p>
    <p>It does <b>not</b> happen for flex or grid items, floats, absolutely positioned or inline-block boxes, or across a new block formatting context. To prevent the "child margin pushes the parent down" case I give the parent <code>display: flow-root</code> (the cleanest), or padding or a border, or use flex/grid. Many teams avoid the problem by using only <code>margin-bottom</code> (or <code>gap</code> in flex/grid) consistently.</p>`,
  followUps: ['What is a block formatting context and what creates one?', 'Why did overflow: hidden fix my margin issue?', 'How do negative margins combine?'] });
interview.push({ q: 'Compare <code>display: none</code>, <code>visibility: hidden</code> and <code>opacity: 0</code>. What about accessibility?', level: 'I',
  a: `<p><code>display: none</code> removes the element from layout <b>and</b> the accessibility tree: no space, not focusable, not read aloud. <code>visibility: hidden</code> keeps its space but also hides it from users, assistive technology and the tab order. <code>opacity: 0</code> only makes it fully transparent: it still takes space, can still be clicked and focused, and screen readers still read it, which is usually a bug unless intentional.</p>
    <p>For animations: opacity animates smoothly and cheaply (compositor), visibility flips discretely at the end of a transition, and display needs <code>transition-behavior: allow-discrete</code> with <code>@starting-style</code> in modern browsers. For visually hidden but accessible text, use a "visually-hidden" utility (clip, 1px size, absolute), not display: none.</p>`,
  followUps: ['How do you build a screen-reader-only label?', 'What does the hidden attribute do?', 'What is inert and when would you use it?'] });
interview.push({ q: 'How would you keep specificity under control in a large codebase?', level: 'A',
  a: `<p>The goal is for all component styles to sit at roughly the same specificity so source order, not selector strength, decides conflicts. My rules: (1) style with <b>single classes</b> in a naming scheme like BEM, no ids and no element-qualified selectors; (2) keep nesting shallow (at most 2-3 levels, also in preprocessor or native CSS nesting); (3) use <b>cascade layers</b> (<code>@layer reset, base, components, utilities</code>) so architecture decides the winner and third-party CSS goes into an early layer; (4) write resets with <code>:where()</code> so they are trivially overridable; (5) scope with CSS Modules, Shadow DOM or <code>@scope</code>; (6) ban <code>!important</code> except for utility overrides and accessibility; (7) lint with stylelint rules for max specificity and no ids.</p>
    <p>Utilities-first approaches (Tailwind) sidestep the problem by making every rule (0,1,0). For debugging I rely on the DevTools Styles and Cascade layers panels.</p>`,
  followUps: ['How does @layer interact with !important?', 'What are the trade-offs of utility-first CSS?', 'How would you migrate a legacy codebase gradually?'] });
interview.push({ q: 'How do you make text accessible in terms of colour contrast and sizing?', level: 'I',
  a: `<p>Contrast: WCAG AA requires a ratio of at least <b>4.5:1</b> for normal text and <b>3:1</b> for large text (about 24px, or 18.66px bold) and UI components such as borders and icons; AAA asks 7:1 and 4.5:1. The ratio is (L1 + 0.05) / (L2 + 0.05) using relative luminance, so light grey on white such as <code>#999</code> (2.85:1) fails. I check with DevTools' contrast picker or a library, and verify both light and dark themes, hover and focus states, and text over images (use a scrim).</p>
    <p>Sizing: set font sizes in <code>rem</code> so the user's default font-size is respected, avoid <code>user-scalable=no</code>, ensure text can scale to 200% without loss of content, use unitless line-height (about 1.5 for body text), limit line length to roughly 45-75 characters with <code>ch</code>, and never rely on colour alone to convey meaning.</p>`,
  followUps: ['Why is APCA being discussed for WCAG 3?', 'How do you support dark mode and forced-colors mode?', 'What is prefers-reduced-motion?'] });
interview.push({ q: 'How does the browser match selectors, and does selector complexity matter for performance?', level: 'A',
  a: `<p>Engines evaluate a complex selector <b>right to left</b>: first test the right-most compound against each candidate element (usually via hash lookups by id, class or tag so only plausible elements are tried), then walk ancestors or siblings for the combinators. So <code>.nav a</code> is cheap: find anchors, check an ancestor. Long descendant chains and heavy <code>:has()</code> or <code>:not()</code> uses can cost more, but in real pages selector matching is rarely the bottleneck.</p>
    <p>What matters more is <b>invalidation</b>: when a class or attribute changes, the browser must work out which elements' styles could be affected and recalculate them; broad selectors such as <code>body.dark *</code> or toggling a class on <code>html</code> restyle the whole tree. Keep selectors short for readability, avoid universal selectors with expensive pseudo-classes, scope changes to small subtrees, and measure with the Performance panel (Recalculate Style) rather than guessing.</p>`,
  followUps: ['Why was :has() considered expensive before it shipped?', 'What does contain: style or content-visibility do for recalculation?', 'How does Shadow DOM scope style invalidation?'] });
interview.push({ q: 'You are asked to design the CSS foundation for a design system. What decisions do you make about units, colours, typography and layering?', level: 'E',
  a: `<p><b>Tokens first:</b> colours, spacing, radii, type scale and shadows live as CSS custom properties (on <code>:root</code>, theme overrides on <code>[data-theme]</code>), generated from a single source such as Style Dictionary or Figma variables. Colours use a perceptual space (OKLCH) with a documented scale and enforced contrast pairs; semantic tokens (<code>--color-text</code>, <code>--color-surface</code>) map to raw palette tokens so dark mode is a token swap.</p>
    <p><b>Units:</b> rem for type and spacing, em for component-internal proportions, px for borders, <code>clamp()</code> for fluid type, <code>ch</code> for measure, logical properties (<code>margin-inline</code>) for internationalisation. <b>Architecture:</b> a global reset with <code>:where()</code>, <code>box-sizing: border-box</code>, <code>@layer reset, tokens, base, components, utilities, overrides</code>, flat BEM or module-scoped class names so specificity stays (0,1,0), <code>@scope</code> or Shadow DOM for isolation, and container queries for component responsiveness. <b>Governance:</b> stylelint rules (no ids, no !important, token-only colours), visual regression tests, accessibility checks in CI, and documentation with usage guidelines and deprecation paths.</p>`,
  followUps: ['How do you version and roll out a breaking token change?', 'How do you theme third-party components?', 'When would you choose CSS-in-JS or Tailwind over this approach?'] });
interview.push({ q: 'A layout looks fine in Chrome but a column wraps to the next line in another browser. What box-model and display issues do you check first?', level: 'B',
  a: `<p>I first look at the <b>arithmetic of widths</b>. Are the columns percent-based with padding and border under <code>content-box</code>? Then each is wider than its percentage, and tiny rounding differences between engines decide whether the last column fits. The fix is <code>box-sizing: border-box</code> or, better, flex/grid with <code>gap</code> instead of percentages.</p>
    <p>Second, I check for <b>inline-block whitespace gaps</b>, different default margins (the browser's own stylesheet, so a reset or normalize helps), sub-pixel rounding (33.333% three times is 99.999%, fine, but 33.34% three times overflows), scrollbar width (a vertical scrollbar of 15px reduces the available width on some platforms), and font fallbacks that make text wider. DevTools' box-model overlay and the Computed width of each column usually reveal which of these it is.</p>`,
  followUps: ['How would you rebuild this layout with CSS Grid?', 'What does scrollbar-gutter do?', 'Why can 33.34% three times overflow while 33.33% does not?'] });

registerModule({
  id: 'fe03',
  title: 'CSS Basics',
  intro: `<p>HTML gives a page its <b>structure</b>; CSS gives it its <b>looks and layout</b>. In this module you learn the core ideas that every other CSS skill is built on: how a selector <i>points</i> at elements, why one rule beats another (<b>specificity</b>, the <b>cascade</b> and <b>inheritance</b>), how every element is a <b>box</b>, how <b>units</b>, <b>colours</b> and <b>typography</b> work, how elements flow as <b>block</b> or <b>inline</b>, and how to nudge or pin them with <b>positioning</b>.</p>
    <p>Every topic starts with an everyday analogy, then a small visual you can step through, then worked examples and runnable JavaScript calculators (a specificity scorer, a cascade resolver, a box-size calculator, a contrast checker). By the end you can predict which rule wins, compute an element's real width in your head, and fix the classic layout bugs that cause most CSS interview questions.</p>`,
  goals: [
    'Read any selector right-to-left and say exactly which elements it matches',
    'Compute specificity as (a, b, c) and predict which of two or more rules wins using importance, specificity and source order',
    'Explain inheritance: which properties flow down the tree, which do not, and how <code>inherit</code>, <code>initial</code> and <code>unset</code> behave',
    'Calculate the rendered width of an element under <code>content-box</code> and <code>border-box</code>, including margin collapsing',
    'Convert between px, rem, em, %, vw and know why em compounds and rem does not',
    'Write colours in hex/rgb/hsl, check WCAG contrast, and set readable typography',
    'Predict how block, inline and inline-block elements flow, and use relative/absolute/fixed/sticky positioning without surprises'
  ],
  prereqs: `Frontend modules 1-2 (How the Web Works, HTML Fundamentals). Basic JavaScript (functions, arrays, regular expressions) helps for the runnable calculators, but is not required to follow the CSS ideas.`,
  hours: 12,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
